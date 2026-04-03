"""
Kol (קול) - Transcription Engine Protocol
All engines implement this contract: receive a chunk, return segments + words.
"""

from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


@dataclass
class TranscribedWord:
    """A single word with its timestamp and confidence."""
    word: str
    start: float  # seconds
    end: float  # seconds
    confidence: float = 1.0


@dataclass
class TranscribedSegment:
    """A segment (sentence/phrase) with words."""
    start: float
    end: float
    text: str
    words: list[TranscribedWord] = field(default_factory=list)
    confidence: float = 1.0
    speaker: str | None = None


@dataclass
class ChunkResult:
    """Result from transcribing a single chunk."""
    segments: list[TranscribedSegment]
    language: str = "he"
    duration: float = 0.0


@runtime_checkable
class TranscriptionEngine(Protocol):
    """Protocol that all transcription engines must implement."""

    @property
    def name(self) -> str:
        """Human-readable engine name."""
        ...

    @property
    def engine_id(self) -> str:
        """Machine identifier: local | groq | gemini | huggingface."""
        ...

    async def is_available(self) -> bool:
        """Check if the engine is ready to use."""
        ...

    async def transcribe_chunk(
        self,
        audio_path: str,
        language: str = "he",
    ) -> ChunkResult:
        """Transcribe a single audio chunk. Must be async-safe."""
        ...
