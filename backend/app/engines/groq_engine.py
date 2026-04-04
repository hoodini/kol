"""
Blitz AI - Groq Whisper Engine
Ultra-fast cloud transcription at $0.04-0.111/hour.
299x real-time speed with Whisper Large V3.
"""

import asyncio
import json
import logging
from pathlib import Path


import httpx

from app.config import settings
from app.engines.base import ChunkResult, TranscribedSegment, TranscribedWord

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions"

# Groq models and their costs per audio hour
GROQ_MODELS = {
    "whisper-large-v3": {"cost": "$0.111/hr", "description": "Best accuracy"},
    "whisper-large-v3-turbo": {"cost": "$0.04/hr", "description": "Fastest, good accuracy"},
    "distil-whisper-large-v3-en": {"cost": "$0.02/hr", "description": "English only, cheapest"},
}


class GroqEngine:
    """Cloud transcription via Groq's Whisper API."""

    # Groq free tier: 20 RPM. Space requests ~3.5s apart to stay under limit.
    _REQUEST_INTERVAL = 3.5

    def __init__(self, model: str = "whisper-large-v3"):
        self.model = model
        self._last_request_time: float = 0

    @property
    def name(self) -> str:
        return f"Groq {self.model}"

    @property
    def engine_id(self) -> str:
        return "groq"

    async def is_available(self) -> bool:
        return bool(settings.groq_api_key)

    async def transcribe_chunk(
        self,
        audio_path: str,
        language: str = "he",
        max_retries: int = 5,
    ) -> ChunkResult:
        """Send chunk to Groq API and parse verbose JSON response."""
        if not settings.groq_api_key:
            raise RuntimeError("Groq API key not set. Add GROQ_API_KEY to .env")

        audio_file = Path(audio_path)
        if not audio_file.exists():
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        import time

        for attempt in range(max_retries):
            # Proactive rate limiting: wait between requests to stay under RPM limit
            now = time.monotonic()
            elapsed = now - self._last_request_time
            if elapsed < self._REQUEST_INTERVAL:
                await asyncio.sleep(self._REQUEST_INTERVAL - elapsed)
            self._last_request_time = time.monotonic()

            async with httpx.AsyncClient(timeout=120.0) as client:
                with open(audio_file, "rb") as f:
                    response = await client.post(
                        GROQ_API_URL,
                        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                        files={"file": (audio_file.name, f, "audio/wav")},
                        data={
                            "model": self.model,
                            "language": language,
                            "response_format": "verbose_json",
                            "timestamp_granularities[]": "segment",
                        },
                    )

            if response.status_code == 429:
                wait = min(2 ** attempt * 3, 30)
                logger.warning(f"Groq rate limit hit, retrying in {wait}s (attempt {attempt + 1}/{max_retries})")
                await asyncio.sleep(wait)
                continue

            if response.status_code != 200:
                raise RuntimeError(f"Groq API error {response.status_code}: {response.text}")

            break
        else:
            raise RuntimeError("Groq API rate limit exceeded after max retries")

        data = response.json()
        segments = []

        # Words may be at segment level or top level depending on Groq response
        top_level_words = data.get("words") or []

        # Parse segments
        for seg in (data.get("segments") or []):
            words = []
            # Groq sometimes puts words at segment level, sometimes at top level
            raw_words = seg.get("words") or top_level_words or []
            for w in raw_words:
                if not isinstance(w, dict):
                    continue
                words.append(TranscribedWord(
                    word=w.get("word", "").strip(),
                    start=float(w.get("start", 0)),
                    end=float(w.get("end", 0)),
                    confidence=float(w.get("probability", 0.9)),
                ))

            avg_logprob = seg.get("avg_logprob")
            confidence = (avg_logprob + 1.0) if avg_logprob is not None else 0.85

            segments.append(TranscribedSegment(
                start=float(seg.get("start", 0)),
                end=float(seg.get("end", 0)),
                text=(seg.get("text") or "").strip(),
                words=words,
                confidence=max(0.0, min(1.0, confidence)),
            ))

        # If no segments but we have text (simple response)
        if not segments and data.get("text"):
            segments.append(TranscribedSegment(
                start=0,
                end=float(data.get("duration", 0)),
                text=data["text"].strip(),
                confidence=0.85,
            ))

        return ChunkResult(
            segments=segments,
            language=data.get("language", language),
            duration=data.get("duration", 0),
        )
