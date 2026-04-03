"""
Kol (קול) - URL Downloader Service
Downloads audio from YouTube, Vimeo, and 1000+ other sites via yt-dlp.
Supports single videos and full playlists.
"""

import asyncio
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class VideoInfo:
    """Metadata extracted from a URL before downloading."""
    title: str
    duration_seconds: float | None
    thumbnail_url: str | None
    url: str
    platform: str  # youtube | vimeo | other
    is_playlist: bool
    playlist_count: int | None = None
    entries: list["VideoInfo"] = field(default_factory=list)


@dataclass
class DownloadResult:
    """Result of a single video download."""
    file_path: Path  # Audio file for transcription
    video_path: Path | None  # Original video file (if applicable)
    title: str
    duration_seconds: float | None
    thumbnail_url: str | None
    url: str
    platform: str


def detect_platform(url: str) -> str:
    """Detect the platform from URL pattern."""
    if re.search(r"(youtube\.com|youtu\.be)", url):
        return "youtube"
    elif re.search(r"vimeo\.com", url):
        return "vimeo"
    elif re.search(r"dailymotion\.com", url):
        return "dailymotion"
    elif re.search(r"twitch\.tv", url):
        return "twitch"
    elif re.search(r"facebook\.com|fb\.watch", url):
        return "facebook"
    elif re.search(r"tiktok\.com", url):
        return "tiktok"
    return "other"


def is_playlist_url(url: str) -> bool:
    """Check if URL points to a playlist."""
    return bool(re.search(r"(list=|/playlist/|/album/|/series/)", url))


async def get_url_info(url: str) -> VideoInfo:
    """
    Extract metadata from a URL without downloading.
    Uses yt-dlp --dump-json for fast metadata extraction.
    """
    import json as json_module

    platform = detect_platform(url)
    is_playlist = is_playlist_url(url)

    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-download",
    ]
    if is_playlist:
        cmd.append("--flat-playlist")
    else:
        cmd.append("--no-playlist")
    cmd.append(url)

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        error_msg = stderr.decode().strip()
        raise RuntimeError(f"Failed to get URL info: {error_msg}")

    lines = stdout.decode().strip().split("\n")
    entries = []

    for line in lines:
        if not line.strip():
            continue
        data = json_module.loads(line)
        entries.append(VideoInfo(
            title=data.get("title", "Unknown"),
            duration_seconds=data.get("duration"),
            thumbnail_url=data.get("thumbnail"),
            url=data.get("webpage_url", data.get("url", url)),
            platform=platform,
            is_playlist=False,
        ))

    if is_playlist and len(entries) > 1:
        return VideoInfo(
            title=entries[0].title if entries else "Playlist",
            duration_seconds=None,
            thumbnail_url=entries[0].thumbnail_url if entries else None,
            url=url,
            platform=platform,
            is_playlist=True,
            playlist_count=len(entries),
            entries=entries,
        )

    if entries:
        return entries[0]

    raise RuntimeError("No video info found for URL")


async def download_audio(
    url: str,
    output_dir: Path | None = None,
    progress_callback: Optional[Callable[[float, str], None]] = None,
    keep_video: bool = True,
) -> DownloadResult:
    """
    Download video + extract audio from a URL.
    - Keeps the original video file for playback in the Studio
    - Extracts audio as WAV for transcription processing
    Uses asyncio.create_subprocess_exec for safe execution (no shell).
    """
    output_dir = output_dir or settings.upload_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get info first for metadata
    info = await get_url_info(url)

    output_template = str(output_dir / "%(title)s.%(ext)s")

    # Step 1: Download video (mp4) for playback in Studio
    video_path = None
    if keep_video:
        vid_cmd = [
            "yt-dlp",
            "--format", "bv*+ba/b",  # Best video + best audio, any format
            "--merge-output-format", "mp4",
            "--no-playlist",
            "--output", output_template,
            "--newline",
            url,
        ]

        proc = await asyncio.create_subprocess_exec(
            *vid_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            line_str = line.decode().strip()

            if "[download]" in line_str and "%" in line_str:
                try:
                    pct_match = re.search(r"([\d.]+)%", line_str)
                    if pct_match and progress_callback:
                        pct = float(pct_match.group(1))
                        progress_callback(pct * 0.7, f"מוריד וידאו: {pct:.0f}%")
                except (ValueError, AttributeError):
                    pass

        await proc.communicate()

        # Find the video file — match by title to avoid picking up unrelated files
        video_path = None
        # First try exact title match
        for ext in (".mp4", ".mkv", ".webm"):
            candidate = output_dir / f"{info.title}{ext}"
            if candidate.exists():
                video_path = candidate
                break
        # Fallback: newest mp4 created in the last 60 seconds
        if not video_path:
            import time
            now = time.time()
            recent_mp4s = [
                f for f in output_dir.glob("*.mp4")
                if f.stat().st_mtime > now - 60
            ]
            if recent_mp4s:
                video_path = max(recent_mp4s, key=lambda p: p.stat().st_mtime)
        if video_path:
            logger.info(f"Downloaded video: {video_path.name}")

    # Step 2: Extract audio as WAV for transcription
    audio_template = str(output_dir / "%(title)s_audio.%(ext)s")
    audio_cmd = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "wav",
        "--audio-quality", "0",
        "--no-playlist",
        "--output", audio_template,
        "--newline",
        "--no-overwrites",
        url,
    ]

    proc = await asyncio.create_subprocess_exec(
        *audio_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    downloaded_path = None
    while True:
        line = await proc.stdout.readline()
        if not line:
            break
        line_str = line.decode().strip()

        if "[download]" in line_str and "%" in line_str:
            try:
                pct_match = re.search(r"([\d.]+)%", line_str)
                if pct_match and progress_callback:
                    pct = float(pct_match.group(1))
                    progress_callback(70 + pct * 0.3, f"מחלץ אודיו: {pct:.0f}%")
            except (ValueError, AttributeError):
                pass

        if "Destination:" in line_str:
            path_match = re.search(r"Destination:\s*(.+)", line_str)
            if path_match:
                downloaded_path = Path(path_match.group(1).strip())

    await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"Download failed for {url}")

    # Find the audio file
    if downloaded_path is None or not downloaded_path.exists():
        wav_files = sorted(
            output_dir.glob("*_audio.wav"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if wav_files:
            downloaded_path = wav_files[0]
        else:
            # Fallback: any recent wav
            wav_files = sorted(
                output_dir.glob("*.wav"),
                key=lambda p: p.stat().st_mtime,
                reverse=True,
            )
            if wav_files:
                downloaded_path = wav_files[0]

    if downloaded_path is None or not downloaded_path.exists():
        raise RuntimeError(f"Could not find downloaded audio for {url}")

    logger.info(f"Downloaded {info.title} → audio: {downloaded_path}, video: {video_path}")

    return DownloadResult(
        file_path=downloaded_path,
        video_path=video_path,
        title=info.title,
        duration_seconds=info.duration_seconds,
        thumbnail_url=info.thumbnail_url,
        url=url,
        platform=info.platform,
    )


async def download_playlist(
    url: str,
    output_dir: Path | None = None,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
) -> list[DownloadResult]:
    """
    Download all videos from a playlist.
    progress_callback receives (current_index, total, title).
    """
    info = await get_url_info(url)

    if not info.is_playlist or not info.entries:
        result = await download_audio(url, output_dir)
        return [result]

    results = []
    total = len(info.entries)

    for idx, entry in enumerate(info.entries):
        if progress_callback:
            progress_callback(idx + 1, total, entry.title)

        try:
            result = await download_audio(entry.url, output_dir)
            results.append(result)
        except Exception as e:
            logger.error(f"Failed to download playlist item {idx + 1}/{total}: {entry.title} — {e}")
            continue

    logger.info(f"Downloaded {len(results)}/{total} items from playlist")
    return results
