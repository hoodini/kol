"""
Kol (קול) - HuggingFace Engine (ivrit-ai)
Uses ivrit-ai models for best-in-class Hebrew ASR.
Based on 22,000+ hours of Hebrew audio data.
"""

import asyncio
import json
import logging
from pathlib import Path

import httpx

from app.config import settings
from app.engines.base import ChunkResult, TranscribedSegment, TranscribedWord

logger = logging.getLogger(__name__)

# ivrit-ai models for Hebrew transcription
MODELS = {
    "ivrit-ai/whisper-v2-d4-he": {
        "name": "ivrit-ai Whisper V2 D4",
        "description": "Best Hebrew accuracy, fine-tuned on 22K+ hours",
    },
    "openai/whisper-large-v3": {
        "name": "Whisper Large V3 (HF)",
        "description": "General multilingual via HuggingFace",
    },
}

HF_INFERENCE_URL = "https://api-inference.huggingface.co/models"


class HuggingFaceEngine:
    """Hebrew-optimized transcription via HuggingFace Inference API."""

    def __init__(self, model: str = "ivrit-ai/whisper-v2-d4-he"):
        self.model = model

    @property
    def name(self) -> str:
        info = MODELS.get(self.model, {})
        return info.get("name", f"HuggingFace {self.model}")

    @property
    def engine_id(self) -> str:
        return "huggingface"

    async def is_available(self) -> bool:
        return bool(settings.huggingface_api_key)

    async def transcribe_chunk(
        self,
        audio_path: str,
        language: str = "he",
    ) -> ChunkResult:
        """
        Send audio to HuggingFace Inference API.
        The ivrit-ai models are specifically trained for Hebrew.
        """
        if not settings.huggingface_api_key:
            raise RuntimeError("HuggingFace API key not set. Add HUGGINGFACE_API_KEY to .env")

        audio_file = Path(audio_path)
        audio_bytes = audio_file.read_bytes()

        url = f"{HF_INFERENCE_URL}/{self.model}"

        headers = {
            "Authorization": f"Bearer {settings.huggingface_api_key}",
        }

        # HuggingFace Inference API for ASR
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                url,
                headers=headers,
                content=audio_bytes,
                params={"wait_for_model": "true"},
            )

        if response.status_code == 503:
            # Model is loading — wait and retry
            logger.info(f"Model {self.model} is loading, waiting...")
            await asyncio.sleep(20)
            async with httpx.AsyncClient(timeout=180.0) as client:
                response = await client.post(
                    url,
                    headers=headers,
                    content=audio_bytes,
                    params={"wait_for_model": "true"},
                )

        if response.status_code != 200:
            raise RuntimeError(f"HuggingFace API error {response.status_code}: {response.text}")

        data = response.json()

        # Parse response — HF ASR returns {"text": "..."} or {"chunks": [...]}
        if isinstance(data, dict):
            text = data.get("text", "")
            chunks = data.get("chunks", [])

            if chunks:
                segments = []
                for chunk in chunks:
                    ts = chunk.get("timestamp", [0, 0])
                    segments.append(TranscribedSegment(
                        start=ts[0] if ts[0] is not None else 0,
                        end=ts[1] if ts[1] is not None else 0,
                        text=chunk.get("text", "").strip(),
                        confidence=0.9,
                    ))
                return ChunkResult(segments=segments, language=language)

            # Simple text response
            return ChunkResult(
                segments=[TranscribedSegment(start=0, end=30, text=text.strip())],
                language=language,
            )

        raise RuntimeError(f"Unexpected HuggingFace response format: {type(data)}")
