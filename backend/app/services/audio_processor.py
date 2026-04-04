"""
Blitz AI - Audio Processor
Handles all ffmpeg operations: probe, convert, chunk.
"""

import asyncio
import json
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


async def probe_audio(file_path: str | Path) -> dict:
    """Get audio/video file metadata using ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        str(file_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {stderr.decode()}")

    info = json.loads(stdout.decode())
    duration = float(info.get("format", {}).get("duration", 0))

    return {
        "duration": duration,
        "format": info.get("format", {}).get("format_name", "unknown"),
        "streams": len(info.get("streams", [])),
    }


async def convert_to_wav(
    input_path: str | Path,
    output_path: str | Path | None = None,
    sample_rate: int = 16000,
) -> Path:
    """
    Convert any audio/video to WAV 16kHz mono — the format Whisper expects.
    If output_path is None, generates one in the processed directory.
    """
    input_path = Path(input_path)
    if output_path is None:
        output_path = settings.processed_dir / f"{input_path.stem}.wav"
    output_path = Path(output_path)

    cmd = [
        "ffmpeg", "-y", "-i", str(input_path),
        "-vn",  # No video
        "-acodec", "pcm_s16le",
        "-ar", str(sample_rate),
        "-ac", "1",  # Mono
        str(output_path),
    ]

    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()

    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed: {stderr.decode()}")

    logger.info(f"Converted {input_path.name} → {output_path.name}")
    return output_path


async def split_into_chunks(
    wav_path: str | Path,
    chunk_duration: int | None = None,
    overlap: int | None = None,
) -> list[Path]:
    """
    Split a WAV file into chunks with overlap for context continuity.
    Returns list of chunk file paths.

    The overlap ensures words at chunk boundaries aren't cut off.
    The chunk_merger service later deduplicates the overlap zones.
    """
    wav_path = Path(wav_path)
    chunk_duration = chunk_duration or settings.chunk_duration
    overlap = overlap or settings.chunk_overlap

    # Get duration
    info = await probe_audio(wav_path)
    total_duration = info["duration"]

    if total_duration <= chunk_duration:
        # File is short enough — no chunking needed
        return [wav_path]

    chunks_dir = settings.processed_dir / f"{wav_path.stem}_chunks"
    chunks_dir.mkdir(exist_ok=True)

    chunks = []
    start = 0.0
    chunk_idx = 0

    while start < total_duration:
        end = min(start + chunk_duration, total_duration)
        chunk_path = chunks_dir / f"chunk_{chunk_idx:04d}.wav"

        cmd = [
            "ffmpeg", "-y",
            "-i", str(wav_path),
            "-ss", str(start),
            "-t", str(end - start),
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            str(chunk_path),
        ]

        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()

        if proc.returncode == 0:
            chunks.append(chunk_path)

        chunk_idx += 1
        start += chunk_duration - overlap  # Step forward with overlap

    logger.info(f"Split {wav_path.name} into {len(chunks)} chunks ({chunk_duration}s, {overlap}s overlap)")
    return chunks


async def get_audio_duration(file_path: str | Path) -> float:
    """Quick helper to get just the duration."""
    info = await probe_audio(file_path)
    return info["duration"]
