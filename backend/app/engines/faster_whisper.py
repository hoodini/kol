"""
Blitz AI - Faster Whisper Engine (Local)
Uses CTranslate2 for optimized inference on CPU/GPU.
Best option for privacy and no API costs.
"""

import asyncio
import logging
from functools import lru_cache

from app.config import settings
from app.engines.base import ChunkResult, TranscribedSegment, TranscribedWord

logger = logging.getLogger(__name__)

# Lazy-loaded model instance
_model = None


def _get_model():
    """Lazy-load the Whisper model (takes ~10s first time, then cached)."""
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        device = settings.whisper_device
        if device == "auto":
            try:
                import ctranslate2
                if ctranslate2.get_cuda_device_count() > 0:
                    device = "cuda"
                    compute_type = "float16"
                else:
                    device = "cpu"
                    compute_type = "int8"
            except Exception:
                device = "cpu"
                compute_type = "int8"
        else:
            compute_type = settings.whisper_compute_type

        logger.info(f"Loading Whisper model: {settings.whisper_model} on {device} ({compute_type})")
        _model = WhisperModel(
            settings.whisper_model,
            device=device,
            compute_type=compute_type,
        )
        logger.info("Whisper model loaded successfully")
    return _model


class FasterWhisperEngine:
    """Local transcription using faster-whisper (CTranslate2)."""

    @property
    def name(self) -> str:
        return f"Whisper {settings.whisper_model} (Local)"

    @property
    def engine_id(self) -> str:
        return "local"

    async def is_available(self) -> bool:
        try:
            import faster_whisper
            return True
        except ImportError:
            return False

    async def transcribe_chunk(
        self,
        audio_path: str,
        language: str = "he",
    ) -> ChunkResult:
        """
        Transcribe using faster-whisper. Runs in thread pool to avoid
        blocking the async event loop (model inference is CPU-bound).
        """
        return await asyncio.to_thread(self._transcribe_sync, audio_path, language)

    def _transcribe_sync(self, audio_path: str, language: str) -> ChunkResult:
        """Synchronous transcription — runs in thread pool."""
        model = _get_model()

        segments_iter, info = model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,  # Voice Activity Detection — skip silence
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=200,
            ),
        )

        result_segments = []
        for seg in segments_iter:
            words = []
            if seg.words:
                for w in seg.words:
                    words.append(TranscribedWord(
                        word=w.word.strip(),
                        start=w.start,
                        end=w.end,
                        confidence=w.probability,
                    ))

            result_segments.append(TranscribedSegment(
                start=seg.start,
                end=seg.end,
                text=seg.text.strip(),
                words=words,
                confidence=sum(w.confidence for w in words) / max(len(words), 1) if words else 0.9,
            ))

        return ChunkResult(
            segments=result_segments,
            language=info.language,
            duration=info.duration,
        )
