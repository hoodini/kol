"""
Blitz AI - Executable Resolver
Resolves paths for external CLI tools (yt-dlp, ffmpeg, ffprobe).

On Windows, when these tools are installed inside a virtual environment,
their executables live in the venv's Scripts/ directory which may not be
on the system PATH. This module checks the venv first, then falls back
to shutil.which() and finally the bare command name.
"""

import shutil
import sys
from pathlib import Path


def _find_executable(name: str) -> str:
    """Return the full path to *name*, preferring the active venv."""
    venv_scripts = Path(sys.executable).parent
    for candidate in [venv_scripts / name, venv_scripts / f"{name}.exe"]:
        if candidate.exists():
            return str(candidate)
    found = shutil.which(name)
    return found if found else name


YT_DLP: str = _find_executable("yt-dlp")
FFMPEG: str = _find_executable("ffmpeg")
FFPROBE: str = _find_executable("ffprobe")
