"""
Kol (קול) - Google Gemini Engine
Uses Gemini 2.0 Flash for audio transcription.
Good for multilingual content and speaker diarization.
"""

import asyncio
import base64
import json
import logging
import re
from pathlib import Path

import httpx

from app.config import settings
from app.engines.base import ChunkResult, TranscribedSegment, TranscribedWord

logger = logging.getLogger(__name__)

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


class GeminiEngine:
    """Cloud transcription via Google Gemini API."""

    @property
    def name(self) -> str:
        return "Google Gemini 2.0 Flash"

    @property
    def engine_id(self) -> str:
        return "gemini"

    async def is_available(self) -> bool:
        return bool(settings.gemini_api_key)

    async def transcribe_chunk(
        self,
        audio_path: str,
        language: str = "he",
    ) -> ChunkResult:
        """
        Send audio to Gemini with a transcription prompt.
        Gemini returns structured text which we parse into segments.
        """
        if not settings.gemini_api_key:
            raise RuntimeError("Gemini API key not set. Add GEMINI_API_KEY to .env")

        audio_file = Path(audio_path)
        audio_bytes = audio_file.read_bytes()
        audio_b64 = base64.b64encode(audio_bytes).decode()

        # Detect MIME type
        suffix = audio_file.suffix.lower()
        mime_map = {".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg"}
        mime_type = mime_map.get(suffix, "audio/wav")

        lang_name = {"he": "Hebrew", "en": "English", "ar": "Arabic", "ru": "Russian"}.get(language, language)

        prompt = f"""Transcribe this audio precisely in {lang_name}.
Return ONLY a JSON array of segments with this exact format:
[{{"start": 0.0, "end": 2.5, "text": "transcribed text here"}}]

Rules:
- Transcribe exactly what is said, no summaries
- Use proper {lang_name} punctuation
- Each segment should be 1-2 sentences
- Timestamps must be in seconds (float)
- Return ONLY the JSON array, nothing else"""

        request_body = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": audio_b64}},
                ]
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 8192,
            },
        }

        url = f"{GEMINI_API_URL}?key={settings.gemini_api_key}"

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, json=request_body)

        if response.status_code != 200:
            raise RuntimeError(f"Gemini API error {response.status_code}: {response.text}")

        data = response.json()
        text_content = data["candidates"][0]["content"]["parts"][0]["text"]

        # Parse JSON from response (may be wrapped in markdown code block)
        json_match = re.search(r"\[[\s\S]*\]", text_content)
        if not json_match:
            # Fallback: treat entire response as plain text
            return ChunkResult(
                segments=[TranscribedSegment(start=0, end=30, text=text_content.strip())],
                language=language,
            )

        segments_data = json.loads(json_match.group())
        segments = []

        for seg_data in segments_data:
            segments.append(TranscribedSegment(
                start=float(seg_data.get("start", 0)),
                end=float(seg_data.get("end", 0)),
                text=seg_data.get("text", "").strip(),
                confidence=0.85,  # Gemini doesn't provide confidence scores
            ))

        return ChunkResult(
            segments=segments,
            language=language,
            duration=segments[-1].end if segments else 0,
        )
