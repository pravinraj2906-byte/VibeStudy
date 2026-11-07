import pytest
import os
import subprocess
from unittest.mock import MagicMock
from app.services.reproduction.runner import SandboxedRunner, ExecutionResult
from app.services.reproduction.coordinator import ReproductionCoordinator
from app.models.finding import Finding

@pytest.fixture
def runner():
    return SandboxedRunner()

@pytest.fixture
def coordinator():
    return ReproductionCoordinator()

def test_fixture_idor_reproduction(runner):
    """Verify Fixture A reproduces Broken Object-Level Authorization (IDOR)."""
    fixture_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures", "fixture_idor")
    res = runner.execute_fixture(fixture_dir, "reproduce_test.py", timeout_seconds=15)
    
    assert res.exit_code == 0
    assert "VULNERABILITY REPRODUCED SUCCESSFULLY" in res.output
    assert "user_bob obtained invoice owned by user_alice" in res.output
    assert res.runner_type in ("isolated_subprocess_fixture", "docker")

def test_fixture_xss_reproduction(runner):
    """Verify Fixture B reproduces Unsafe Rendering / XSS injection."""
    fixture_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures", "fixture_xss")
    res = runner.execute_fixture(fixture_dir, "reproduce_test.py", timeout_seconds=15)
    
    assert res.exit_code == 0
    assert "VULNERABILITY REPRODUCED SUCCESSFULLY" in res.output
    assert "<script>alert('pwned')</script>" in res.output
    assert res.runner_type in ("isolated_subprocess_fixture", "docker")

def test_fixture_secret_reproduction(runner):
    """Verify Fixture C reproduces Exposed Test Secret detection."""
    fixture_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures", "fixture_secret")
    res = runner.execute_fixture(fixture_dir, "reproduce_test.py", timeout_seconds=15)
    
    assert res.exit_code == 0
    assert "VULNERABILITY REPRODUCED SUCCESSFULLY" in res.output
    assert "AKIA" in res.output
    assert res.runner_type in ("isolated_subprocess_fixture", "docker")

def test_fixture_dependency_reproduction(runner):
    """Verify Fixture D reproduces Dependency Advisory resolution."""
    fixture_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures", "fixture_dependency")
    res = runner.execute_fixture(fixture_dir, "reproduce_test.py", timeout_seconds=15)
    
    assert res.exit_code == 0
    assert "VULNERABILITY REPRODUCED SUCCESSFULLY" in res.output
    assert "CVE-2021-23337" in res.output
    assert res.runner_type in ("isolated_subprocess_fixture", "docker")

def test_untrusted_code_host_execution_blocked(runner, tmp_path):
    """
    SECURITY BOUNDARY TEST:
    Verify that untrusted repository code can NEVER execute directly on the host
    through subprocess fallback when Docker is unavailable.
    """
    # Create arbitrary untrusted script
    untrusted_dir = tmp_path / "untrusted_repo"
    untrusted_dir.mkdir()
    script = untrusted_dir / "reproduce_test.py"
    script.write_text("import sys; sys.exit(0)")

    # Execute with is_untrusted_code=True
    res = runner.execute_reproduction(
        target_dir=str(untrusted_dir),
        entrypoint_script="reproduce_test.py",
        is_untrusted_code=True
    )

    # When Docker daemon is not running, host subprocess fallback MUST be disabled
    if not runner._check_docker():
        assert res.runner_type == "none"
        assert res.exit_code == -1
        assert "SECURITY POLICY BLOCKED" in res.stderr
        assert "Host execution disabled for untrusted code" in (res.security_boundary or "")

def test_fixture_outside_root_forced_to_untrusted(runner, tmp_path):
    """
    SECURITY BOUNDARY TEST:
    Verify that any attempt to pass code outside backend/fixtures as trusted fixture
    is detected, forced to untrusted policy, and blocked from host execution.
    """
    outside_dir = tmp_path / "outside_fixture"
    outside_dir.mkdir()
    script = outside_dir / "reproduce_test.py"
    script.write_text("import sys; sys.exit(0)")

    # Call execute_fixture (which attempts is_untrusted_code=False)
    res = runner.execute_fixture(str(outside_dir))

    if not runner._check_docker():
        assert res.runner_type == "none"
        assert res.exit_code == -1
        assert "SECURITY POLICY BLOCKED" in res.stderr

def test_docker_command_security_parameters(runner, monkeypatch, tmp_path):
    """
    SECURITY BOUNDARY TEST:
    Verify Docker execution parameters include all required security boundaries:
    --network none, --memory 512m, --cpus 1.0, --user 1000:1000, --read-only,
    --tmpfs, --rm, --cap-drop ALL, and read-only volume mounts.
    """
    dummy_dir = tmp_path / "dummy_repo"
    dummy_dir.mkdir()
    (dummy_dir / "reproduce_test.py").write_text("print('test')")

    captured_cmds = []

    def mock_subprocess_run(cmd, *args, **kwargs):
        captured_cmds.append(cmd)
        mock_res = MagicMock()
        mock_res.returncode = 0
        mock_res.stdout = "VULNERABILITY REPRODUCED SUCCESSFULLY"
        mock_res.stderr = ""
        return mock_res

    monkeypatch.setattr("shutil.which", lambda exe: "docker" if exe == "docker" else None)
    monkeypatch.setattr(runner, "_check_docker", lambda: True)
    monkeypatch.setattr("subprocess.run", mock_subprocess_run)

    res = runner.execute_reproduction(str(dummy_dir), is_untrusted_code=True)

    run_cmds = [c for c in captured_cmds if len(c) > 1 and c[1] == "run"]
    assert len(run_cmds) == 1
    cmd = run_cmds[0]

    # Verify Docker containment flags
    assert "--rm" in cmd
    assert "--network" in cmd and cmd[cmd.index("--network") + 1] == "none"
    assert "--memory" in cmd and cmd[cmd.index("--memory") + 1] == "512m"
    assert "--cpus" in cmd and cmd[cmd.index("--cpus") + 1] == "1.0"
    assert "--user" in cmd and cmd[cmd.index("--user") + 1] == "1000:1000"
    assert "--read-only" in cmd
    assert "--tmpfs" in cmd
    assert "--security-opt" in cmd and cmd[cmd.index("--security-opt") + 1] == "no-new-privileges"
    assert "--cap-drop" in cmd and cmd[cmd.index("--cap-drop") + 1] == "ALL"
    assert "-v" in cmd
    vol_idx = cmd.index("-v") + 1
    assert cmd[vol_idx].endswith(":/app:ro")
    assert "-w" in cmd and cmd[cmd.index("-w") + 1] == "/app"

    assert res.runner_type == "docker"
    assert res.exit_code == 0

def test_coordinator_distinguishes_synthetic_vs_repo_code(coordinator, tmp_path):
    """
    Verify coordinator properly tags target_type as synthetic_fixture vs imported_repository_code.
    """
    mock_db = MagicMock()

    # 1. Benchmark Fixture
    finding = Finding(
        id=99,
        project_id=1,
        title="IDOR in Order Controller",
        description="Missing tenant ownership check",
        severity="critical",
        category="security",
        file_path="src/controllers/OrderController.ts",
        cwe_id="CWE-639",
        scanner_rule_id="idor-insecure-direct-object-reference"
    )

    res_fixture = coordinator.reproduce_defect(mock_db, finding)
    assert res_fixture["target_type"] == "synthetic_fixture"
    assert "Controlled Educational Benchmark" in res_fixture["target_label"]
    assert res_fixture["runner_type"] in ("isolated_subprocess_fixture", "docker")

    # 2. Direct Repository Code
    untrusted_repo = tmp_path / "mock_project_src"
    untrusted_repo.mkdir()
    (untrusted_repo / "reproduce_test.py").write_text("print('untrusted')")

    res_repo = coordinator.reproduce_repository_defect(mock_db, finding, str(untrusted_repo))
    assert res_repo["target_type"] == "imported_repository_code"
    assert "Imported Repository Source" in res_repo["target_label"]
    if not coordinator.runner._check_docker():
        assert res_repo["runner_type"] == "none"
        assert res_repo["verification_status"] == "unsupported"
        assert "Host execution disabled for untrusted code" in res_repo["security_boundary"]
