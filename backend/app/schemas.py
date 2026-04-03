"""
Kol (קול) - Pydantic Schemas
Request/response models for the API.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ─── Engine ───────────────────────────────────────
class EngineInfo(BaseModel):
    id: str
    name: str
    description: str
    available: bool
    requires_api_key: bool
    cost_per_hour: Optional[str] = None


# ─── Transcription Request ────────────────────────
class TranscribeRequest(BaseModel):
    engine: str = "local"  # local | groq | gemini | huggingface
    language: str = "he"
    model: Optional[str] = None  # Override default model


class TranscribeURLRequest(TranscribeRequest):
    url: str
    playlist: bool = False  # If True, download entire playlist


class TranscribeFolderRequest(TranscribeRequest):
    folder_path: str
    recursive: bool = True
    extensions: list[str] = Field(
        default=[
            ".mp3", ".wav", ".m4a", ".flac", ".ogg", ".wma", ".aac",
            ".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv",
        ]
    )


# ─── Project ──────────────────────────────────────
class ProjectBase(BaseModel):
    name: str
    language: str = "he"


class ProjectResponse(BaseModel):
    id: str
    name: str
    source_filename: str
    source_url: Optional[str] = None
    source_type: str
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[float] = None
    language: str
    engine_used: Optional[str] = None
    status: str
    progress: float
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    has_video: bool = False
    tags: list[str] = []
    version_count: int = 0

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    projects: list[ProjectResponse]
    total: int


# ─── Segments ─────────────────────────────────────
class WordResponse(BaseModel):
    id: str
    word: str
    start_time: float
    end_time: float
    confidence: Optional[float] = None

    class Config:
        from_attributes = True


class SegmentResponse(BaseModel):
    id: str
    index_num: int
    start_time: float
    end_time: float
    text: str
    speaker: Optional[str] = None
    confidence: Optional[float] = None
    words: list[WordResponse] = []

    class Config:
        from_attributes = True


class SegmentUpdate(BaseModel):
    id: str
    text: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    speaker: Optional[str] = None


class StudioResponse(BaseModel):
    project: ProjectResponse
    segments: list[SegmentResponse]
    version_number: int
    total_versions: int


class SaveStudioRequest(BaseModel):
    segments: list[SegmentUpdate]


# ─── Export ───────────────────────────────────────
class ExportRequest(BaseModel):
    format: str  # srt | vtt | ass | txt | json
    version: Optional[int] = None  # None = latest


class ExportResponse(BaseModel):
    filename: str
    format: str
    download_url: str


# ─── URL Download ─────────────────────────────────
class URLInfoResponse(BaseModel):
    title: str
    duration_seconds: Optional[float] = None
    thumbnail_url: Optional[str] = None
    url: str
    platform: str  # youtube | vimeo | other
    is_playlist: bool
    playlist_count: Optional[int] = None
    entries: Optional[list["URLInfoResponse"]] = None


# ─── WebSocket Messages ──────────────────────────
class WSProgressMessage(BaseModel):
    type: str = "progress"  # progress | completed | error | downloading
    project_id: str
    progress: float  # 0-100
    message: str
    current_chunk: Optional[int] = None
    total_chunks: Optional[int] = None


# ─── Settings ─────────────────────────────────────
class SettingsResponse(BaseModel):
    default_engine: str
    default_language: str
    whisper_model: str
    groq_api_key_set: bool
    gemini_api_key_set: bool
    huggingface_api_key_set: bool


class SettingsUpdate(BaseModel):
    default_engine: Optional[str] = None
    default_language: Optional[str] = None
    whisper_model: Optional[str] = None
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None
