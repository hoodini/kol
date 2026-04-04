"""
Blitz AI - Transcription Manager
Orchestrates the full pipeline: upload → convert → chunk → transcribe → merge → store.
Engine fallback: if the selected engine fails, automatically tries the next available engine.
"""

import asyncio
import logging
import traceback
from pathlib import Path
from typing import Callable, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.engines.base import ChunkResult, TranscriptionEngine
from app.engines.faster_whisper import FasterWhisperEngine
from app.engines.gemini_engine import GeminiEngine
from app.engines.groq_engine import GroqEngine
from app.engines.huggingface_engine import HuggingFaceEngine
from app.models import Project, Segment, TranscriptVersion, Word
from app.services.audio_processor import convert_to_wav, get_audio_duration, split_into_chunks
from app.services.chunk_merger import merge_chunk_results

logger = logging.getLogger(__name__)

# Engine registry
ENGINES: dict[str, TranscriptionEngine] = {
    "local": FasterWhisperEngine(),
    "groq": GroqEngine(),
    "gemini": GeminiEngine(),
    "huggingface": HuggingFaceEngine(),
}

# Fallback order — tried in sequence when the selected engine fails
FALLBACK_ORDER = ["groq", "huggingface", "local", "gemini"]


def get_engine(engine_id: str) -> TranscriptionEngine:
    """Get engine by ID."""
    if engine_id not in ENGINES:
        raise ValueError(f"Unknown engine: {engine_id}. Available: {list(ENGINES.keys())}")
    return ENGINES[engine_id]


async def get_available_engines() -> list[dict]:
    """List all engines with their availability status."""
    result = []
    for eid, engine in ENGINES.items():
        available = await engine.is_available()
        result.append({
            "id": eid,
            "name": engine.name,
            "available": available,
            "requires_api_key": eid != "local",
        })
    return result


async def _resolve_engine(engine_id: str) -> tuple[str, TranscriptionEngine]:
    """
    Resolve which engine to use. If the requested engine isn't available,
    find the first available fallback.
    Returns (engine_id, engine_instance) or raises if nothing is available.
    """
    engine = get_engine(engine_id)
    if await engine.is_available():
        return engine_id, engine

    logger.warning(f"Engine '{engine_id}' is not available, searching for fallback...")

    for fallback_id in FALLBACK_ORDER:
        if fallback_id == engine_id:
            continue
        fallback = ENGINES[fallback_id]
        if await fallback.is_available():
            logger.info(f"Falling back from '{engine_id}' to '{fallback_id}'")
            return fallback_id, fallback

    raise RuntimeError(
        f"No transcription engines available. "
        f"Tried: {engine_id}, then fallbacks {FALLBACK_ORDER}. "
        f"Check API keys in .env or install local Whisper."
    )


async def _transcribe_chunk_with_fallback(
    chunk_path: Path,
    language: str,
    primary_engine_id: str,
    primary_engine: TranscriptionEngine,
    failed_engines: set[str],
) -> tuple[ChunkResult, str]:
    """
    Transcribe a single chunk. If the primary engine fails, try fallbacks.
    Returns (result, engine_id_used).
    """
    # Try the primary engine first (unless already marked as failed)
    if primary_engine_id not in failed_engines:
        try:
            result = await primary_engine.transcribe_chunk(str(chunk_path), language)
            return result, primary_engine_id
        except Exception as e:
            logger.warning(f"Engine '{primary_engine_id}' failed on {chunk_path.name}: {e}")
            failed_engines.add(primary_engine_id)

    # Try fallbacks
    for fallback_id in FALLBACK_ORDER:
        if fallback_id in failed_engines:
            continue
        fallback = ENGINES[fallback_id]
        if not await fallback.is_available():
            continue
        try:
            logger.info(f"Trying fallback engine '{fallback_id}' for {chunk_path.name}")
            result = await fallback.transcribe_chunk(str(chunk_path), language)
            return result, fallback_id
        except Exception as e:
            logger.warning(f"Fallback engine '{fallback_id}' also failed: {e}")
            failed_engines.add(fallback_id)

    raise RuntimeError(
        f"All engines failed for {chunk_path.name}. "
        f"Tried: {primary_engine_id} + fallbacks. "
        f"Failed engines: {failed_engines}"
    )


ProgressCallback = Callable[[str, float, str], None]  # (project_id, progress, message)


async def transcribe_file(
    project: Project,
    file_path: Path,
    engine_id: str,
    language: str,
    db: AsyncSession,
    on_progress: Optional[ProgressCallback] = None,
) -> None:
    """
    Full transcription pipeline for a single file.
    Updates the project status in the database as it progresses.
    Automatically falls back to other engines if the selected one fails.
    """
    job = f"[job:{project.id[:8]}]"
    try:
        # Resolve engine (with fallback if primary unavailable)
        active_engine_id, engine = await _resolve_engine(engine_id)
        if active_engine_id != engine_id:
            logger.info(f"{job} Using '{active_engine_id}' instead of requested '{engine_id}'")

        # 1. Update status → processing
        project.status = "processing"
        project.engine_used = active_engine_id
        project.progress = 5.0
        await db.commit()
        if on_progress:
            on_progress(project.id, 5.0, "Converting audio...")

        # 2. Convert to WAV
        wav_path = await convert_to_wav(file_path)
        duration = await get_audio_duration(wav_path)
        project.duration_seconds = duration
        project.progress = 10.0
        await db.commit()
        if on_progress:
            on_progress(project.id, 10.0, "Splitting into chunks...")

        # 3. Split into chunks
        chunks = await split_into_chunks(wav_path)
        total_chunks = len(chunks)
        if on_progress:
            on_progress(project.id, 15.0, f"Transcribing {total_chunks} chunks...")

        # 4. Calculate chunk offsets for timestamp alignment
        chunk_duration = settings.chunk_duration
        chunk_overlap = settings.chunk_overlap
        chunk_offsets = [
            i * (chunk_duration - chunk_overlap)
            for i in range(total_chunks)
        ]

        # 5. Transcribe each chunk (with per-chunk fallback)
        chunk_results: list[ChunkResult] = []
        failed_engines: set[str] = set()

        for idx, chunk_path in enumerate(chunks):
            progress = 15.0 + (idx / max(total_chunks, 1)) * 70.0  # 15% to 85%
            if on_progress:
                on_progress(project.id, progress, f"Transcribing chunk {idx + 1}/{total_chunks}...")

            result, used_engine = await _transcribe_chunk_with_fallback(
                chunk_path, language, active_engine_id, engine, failed_engines,
            )
            chunk_results.append(result)

            # Update engine_used if we switched mid-transcription
            if used_engine != active_engine_id:
                active_engine_id = used_engine
                engine = ENGINES[used_engine]
                project.engine_used = used_engine
                if on_progress:
                    on_progress(project.id, progress, f"Switched to {engine.name}, chunk {idx + 1}/{total_chunks}...")

            project.progress = progress
            await db.commit()

        # 6. Merge chunks
        if on_progress:
            on_progress(project.id, 88.0, "Merging results...")

        merged = merge_chunk_results(chunk_results, chunk_offsets, float(chunk_overlap))

        # 7. Store results in database
        if on_progress:
            on_progress(project.id, 92.0, "Saving transcript...")

        version = TranscriptVersion(
            project_id=project.id,
            version_number=1,
        )
        db.add(version)
        await db.flush()  # Get version.id

        for idx, seg in enumerate(merged.segments):
            segment = Segment(
                version_id=version.id,
                index_num=idx,
                start_time=seg.start,
                end_time=seg.end,
                text=seg.text,
                speaker=seg.speaker,
                confidence=seg.confidence,
            )
            db.add(segment)
            await db.flush()

            # Store word-level timestamps
            for w in seg.words:
                word = Word(
                    segment_id=segment.id,
                    word=w.word,
                    start_time=w.start,
                    end_time=w.end,
                    confidence=w.confidence,
                )
                db.add(word)

        # 8. Mark as completed
        project.status = "completed"
        project.progress = 100.0
        await db.commit()

        if on_progress:
            on_progress(project.id, 100.0, "Transcription complete!")

        logger.info(f"{job} Transcription complete: {project.name} ({len(merged.segments)} segments)")

    except Exception as e:
        error_detail = str(e) or f"{type(e).__name__}: {repr(e)}"
        logger.error(f"{job} Transcription failed for {project.name}: {error_detail}")
        logger.error(traceback.format_exc())
        project.status = "error"
        project.error_message = error_detail
        await db.commit()
        if on_progress:
            on_progress(project.id, -1, f"Error: {error_detail}")
        raise
