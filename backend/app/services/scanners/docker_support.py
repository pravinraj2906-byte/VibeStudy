import shutil
import subprocess
import logging
from typing import Optional

logger = logging.getLogger("proofforge.scanners.docker")

_DOCKER_AVAILABLE: Optional[bool] = None

def is_docker_available() -> bool:
    """Check if Docker CLI is installed and the daemon is reachable."""
    global _DOCKER_AVAILABLE
    docker_exe = shutil.which("docker")
    if not docker_exe:
        _DOCKER_AVAILABLE = False
        return False
    try:
        res = subprocess.run([docker_exe, "info"], capture_output=True, text=True, timeout=5)
        _DOCKER_AVAILABLE = (res.returncode == 0)
        return _DOCKER_AVAILABLE
    except Exception as e:
        logger.debug(f"Docker availability check failed: {e}")
        _DOCKER_AVAILABLE = False
        return False

def is_docker_image_available(image_name: str) -> bool:
    """Check if a specific Docker image is available locally or can be inspected."""
    if not is_docker_available():
        return False
    try:
        res = subprocess.run(["docker", "image", "inspect", image_name], capture_output=True, text=True, timeout=5)
        return res.returncode == 0
    except Exception:
        return False
