"""Tests for directory traversal protection on /api/transcribe/folder.

These tests validate the path sandboxing logic used in transcribe_folder()
without importing the full app (which requires Python 3.10+).
"""

from pathlib import Path

import pytest


def validate_folder_path(folder_path: str, allowed_scan_dir: Path) -> bool:
    """Reproduce the validation logic from transcribe.py transcribe_folder().

    Returns True if the path is allowed, False if it should be rejected (403).
    """
    folder = Path(folder_path).resolve()
    allowed_dir = allowed_scan_dir.resolve()
    return folder.is_relative_to(allowed_dir)


class TestDirectoryTraversalProtection:
    """Ensure the path validation logic blocks directory traversal."""

    def test_valid_path_within_allowed_dir(self, tmp_path):
        """A subfolder inside allowed_scan_dir should be accepted."""
        allowed = tmp_path / "uploads"
        allowed.mkdir()
        sub = allowed / "media"
        sub.mkdir()

        assert validate_folder_path(str(sub), allowed) is True

    def test_allowed_dir_itself_is_valid(self, tmp_path):
        """The allowed dir itself should be accepted."""
        allowed = tmp_path / "uploads"
        allowed.mkdir()

        assert validate_folder_path(str(allowed), allowed) is True

    def test_parent_traversal_blocked(self, tmp_path):
        """Paths with ../ that escape the allowed dir must be rejected."""
        allowed = tmp_path / "uploads"
        allowed.mkdir()

        traversal_path = str(allowed / ".." / "..")
        assert validate_folder_path(traversal_path, allowed) is False

    def test_absolute_path_outside_allowed_dir(self, tmp_path):
        """An absolute path outside the allowed dir must be rejected."""
        allowed = tmp_path / "uploads"
        allowed.mkdir()

        assert validate_folder_path("/etc", allowed) is False

    def test_root_path_blocked(self, tmp_path):
        """The filesystem root must be rejected."""
        allowed = tmp_path / "uploads"
        allowed.mkdir()

        assert validate_folder_path("/", allowed) is False

    def test_relative_path_with_dotdot(self, tmp_path):
        """A relative path with ../ components that escapes must be rejected."""
        allowed = tmp_path / "uploads"
        allowed.mkdir()

        # ../../../etc resolves relative to cwd — won't be inside allowed
        assert validate_folder_path("../../../etc", allowed) is False
