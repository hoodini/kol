"""
Kol (קול) - Transcription Manager
Orchestrates the full pipeline: upload → convert → chunk → transcribe → merge → store.
"""

import asyncio
import logging
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
    """
    try:
        engine = get_engine(engine_id)

        # Check engine availability
        if not await engine.is_available():
            raise RuntimeError(f"Engine '{engine_id}' is not available. Check API keys or dependencies.")

        # 1. Update status → processing
        project.status = "processing"
        project.engine_used = engine_id
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

        # 5. Transcribe each chunk
        chunk_results: list[ChunkResult] = []
        for idx, chunk_path in enumerate(chunks):
            progress = 15.0 + (idx / max(total_chunks, 1)) * 70.0  # 15% to 85%
            if on_progress:
                on_progress(project.id, progress, f"Transcribing chunk {idx + 1}/{total_chunks}...")

            result = await engine.transcribe_chunk(str(chunk_path), language)
            chunk_results.append(result)

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

        logger.info(f"Transcription complete: {project.name} ({len(merged.segments)} segments)")

    except Exception as e:
        logger.error(f"Transcription failed for {project.name}: {e}")
        project.status = "error"
        project.error_message = str(e)
        await db.commit()
        if on_progress:
            on_progress(project.id, -1, f"Error: {e}")
        raise
