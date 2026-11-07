import os
import sys
import shutil
import tempfile
import subprocess
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("proofforge.reproduction.runner")

FIXTURES_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "fixtures")
)

class ExecutionResult:
    def __init__(
        self,
        exit_code: int,
        stdout: str,
        stderr: str,
        runner_type: str,
        timed_out: bool = False,
        security_boundary: Optional[str] = None
    ):
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.runner_type = runner_type
        self.timed_out = timed_out
        self.security_boundary = security_boundary

    @property
    def output(self) -> str:
        out = self.stdout or ""
        if self.stderr:
            out += "\n--- STDERR ---\n" + self.stderr
        return out.strip()

class SandboxedRunner:
    def __init__(self):
        self.docker_available = self._check_docker()

    def _check_docker(self) -> bool:
        """Verify if Docker CLI and daemon are operational without automatically launching daemons."""
        docker_exe = shutil.which("docker")
        if not docker_exe:
            return False
        try:
            res = subprocess.run([docker_exe, "info"], capture_output=True, text=True, timeout=5)
            return (res.returncode == 0)
        except Exception:
            return False

    def execute_reproduction(
        self,
        target_dir: str,
        entrypoint_script: str = "reproduce_test.py",
        timeout_seconds: int = 30,
        is_untrusted_code: bool = True
    ) -> ExecutionResult:
        """
        Executes reproduction with strict security boundaries:
        1. If is_untrusted_code=True:
           Host subprocess fallback is STRICTLY DISABLED.
           Requires an operational Docker container with network=none, read-only root, and resource limits.
           If Docker is unavailable, execution is immediately blocked.
        2. If is_untrusted_code=False:
           Target MUST reside inside trusted backend/fixtures directory.
           Prefers Docker; falls back to ephemeral isolated subprocess with clean temp directory.
        """
        timeout_seconds = min(timeout_seconds, 30)
        target_abs = os.path.abspath(target_dir)

        # Enforce fixture path validation
        if not is_untrusted_code:
            if not target_abs.startswith(FIXTURES_ROOT):
                logger.warning(f"Target path {target_dir} is outside trusted fixtures root. Forcing untrusted execution policy.")
                is_untrusted_code = True

        # Check Docker availability
        has_docker = self._check_docker()

        if is_untrusted_code:
            if not has_docker:
                logger.warning("Untrusted repository execution blocked: Docker daemon is unavailable.")
                return ExecutionResult(
                    exit_code=-1,
                    stdout="",
                    stderr=(
                        "SECURITY POLICY BLOCKED: Direct execution of untrusted repository code on the host system is disabled.\n"
                        "Docker container isolation is required for untrusted repository reproduction "
                        "(--network=none, --memory=512m, --read-only, non-root user)."
                    ),
                    runner_type="none",
                    security_boundary="Host execution disabled for untrusted code. Docker container required."
                )
            return self._run_in_docker(target_abs, entrypoint_script, timeout_seconds, is_untrusted_code=True)
        else:
            # Synthetic benchmark fixture
            if has_docker:
                return self._run_in_docker(target_abs, entrypoint_script, timeout_seconds, is_untrusted_code=False)
            else:
                return self._run_in_isolated_subprocess(target_abs, entrypoint_script, timeout_seconds)

    def execute_fixture(
        self,
        fixture_dir: str,
        entrypoint_script: str = "reproduce_test.py",
        timeout_seconds: int = 30
    ) -> ExecutionResult:
        """Backward-compatible wrapper for executing vetted synthetic benchmark fixtures."""
        return self.execute_reproduction(
            target_dir=fixture_dir,
            entrypoint_script=entrypoint_script,
            timeout_seconds=timeout_seconds,
            is_untrusted_code=False
        )

    def _run_in_docker(
        self,
        target_dir: str,
        entrypoint: str,
        timeout_seconds: int,
        is_untrusted_code: bool = False
    ) -> ExecutionResult:
        """
        Run inside an ephemeral Docker container with strict security constraints:
        - --rm: container cleanup on exit
        - --network none: strictly blocked network access
        - --memory 512m: memory limit
        - --cpus 1.0: CPU throttle
        - --user 1000:1000: non-root execution
        - --security-opt no-new-privileges: prevent privilege escalation
        - --cap-drop ALL: drop all Linux capabilities
        - --read-only: read-only container rootfs
        - --tmpfs /tmp:rw,noexec,nosuid,size=64m: ephemeral temp mount
        - -v <target>: /app:ro: read-only workspace mount
        - -w /app: working directory
        - timeout bounded to <= 30 seconds
        """
        docker_exe = shutil.which("docker")
        if not docker_exe:
            if is_untrusted_code:
                return ExecutionResult(
                    exit_code=-1,
                    stdout="",
                    stderr="Docker CLI unavailable. Host execution of untrusted repository code is prohibited.",
                    runner_type="none",
                    security_boundary="Host execution disabled for untrusted code."
                )
            return self._run_in_isolated_subprocess(target_dir, entrypoint, timeout_seconds)

        # Prefer hardened proofforge-sandbox image containing pre-cached test frameworks
        image_name = "proofforge-sandbox:latest"
        try:
            inspect_res = subprocess.run([docker_exe, "image", "inspect", image_name], capture_output=True, timeout=3)
            if inspect_res.returncode != 0:
                image_name = "python:3.12-slim"
        except Exception:
            image_name = "python:3.12-slim"

        cmd = [
            docker_exe, "run",
            "--rm",
            "--network", "none",
            "--memory", "512m",
            "--cpus", "1.0",
            "--user", "1000:1000",
            "--security-opt", "no-new-privileges",
            "--cap-drop", "ALL",
            "--read-only",
            "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
            "-v", f"{os.path.abspath(target_dir)}:/app:ro",
            "-w", "/app",
            image_name,
            "python", entrypoint
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_seconds)
            return ExecutionResult(
                exit_code=res.returncode,
                stdout=res.stdout,
                stderr=res.stderr,
                runner_type="docker",
                security_boundary="Docker container isolation enforced (--network=none, --memory=512m, --read-only, --user=1000:1000)"
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(
                exit_code=-1,
                stdout="",
                stderr=f"Reproduction timed out after {timeout_seconds} seconds in Docker container.",
                runner_type="docker",
                timed_out=True,
                security_boundary="Docker execution terminated by timeout boundary."
            )
        except Exception as e:
            if is_untrusted_code:
                logger.error(f"Docker execution failed for untrusted code: {e}")
                return ExecutionResult(
                    exit_code=-1,
                    stdout="",
                    stderr=f"Docker container execution error: {e}. Host subprocess fallback is disabled for untrusted code.",
                    runner_type="docker",
                    security_boundary="Host fallback strictly prohibited for untrusted code."
                )
            logger.warning(f"Docker execution failed for synthetic fixture: {e}. Falling back to isolated subprocess.")
            return self._run_in_isolated_subprocess(target_dir, entrypoint, timeout_seconds)

    def _run_in_isolated_subprocess(
        self,
        fixture_dir: str,
        entrypoint: str,
        timeout_seconds: int
    ) -> ExecutionResult:
        """
        Isolated fallback runner ONLY for verified internal synthetic benchmark fixtures:
        Creates a clean ephemeral directory, copies only target fixture files,
        strips all sensitive credentials from environment, and runs under restricted subprocess.
        """
        python_exe = sys.executable or "python"

        with tempfile.TemporaryDirectory(prefix="proofforge_reproduce_") as temp_dir:
            for item in os.listdir(fixture_dir):
                s = os.path.join(fixture_dir, item)
                d = os.path.join(temp_dir, item)
                if os.path.isdir(s):
                    shutil.copytree(s, d)
                else:
                    shutil.copy2(s, d)

            script_path = os.path.join(temp_dir, entrypoint)
            
            clean_env = os.environ.copy()
            clean_env["PYTHONPATH"] = temp_dir + os.pathsep + clean_env.get("PYTHONPATH", "")
            
            # Strip sensitive cloud and database credentials from subprocess environment
            for key in ["GEMINI_API_KEY", "DATABASE_URL", "SECRET_KEY", "GITHUB_TOKEN", "AWS_SECRET_ACCESS_KEY"]:
                clean_env.pop(key, None)

            try:
                res = subprocess.run(
                    [python_exe, script_path],
                    cwd=temp_dir,
                    env=clean_env,
                    capture_output=True,
                    text=True,
                    timeout=timeout_seconds
                )
                return ExecutionResult(
                    exit_code=res.returncode,
                    stdout=res.stdout,
                    stderr=res.stderr,
                    runner_type="isolated_subprocess_fixture",
                    security_boundary="Controlled synthetic fixture executed in ephemeral subprocess; host credentials stripped."
                )
            except subprocess.TimeoutExpired:
                return ExecutionResult(
                    exit_code=-1,
                    stdout="",
                    stderr=f"Execution timed out after {timeout_seconds}s in isolated subprocess.",
                    runner_type="isolated_subprocess_fixture",
                    timed_out=True,
                    security_boundary="Subprocess execution terminated by timeout boundary."
                )
            except Exception as e:
                return ExecutionResult(
                    exit_code=-1,
                    stdout="",
                    stderr=f"Subprocess runner error: {e}",
                    runner_type="isolated_subprocess_fixture",
                    security_boundary="Subprocess execution error."
                )
