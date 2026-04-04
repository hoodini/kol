"""
Blitz AI - Configuration
Central configuration using pydantic-settings for type-safe env var loading.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Keys
    groq_api_key: str = ""
    gemini_api_key: str = ""
    huggingface_api_key: str = ""

    # Defaults
    default_engine: str = "local"  # local | groq | gemini | huggingface
    default_language: str = "he"

    # Server
    host: str = "127.0.0.1"
    port: int = 8000

    # Paths
    base_dir: Path = Path(__file__).parent.parent
    upload_dir: Path = base_dir / "uploads"
    processed_dir: Path = base_dir / "processed"
    export_dir: Path = base_dir / "exports"
    db_path: Path = base_dir / "kol.db"

    # Whisper settings
    whisper_model: str = "large-v3"
    whisper_device: str = "auto"  # auto | cpu | cuda | mps
    whisper_compute_type: str = "float16"

    # Chunking
    chunk_duration: int = 30  # seconds
    chunk_overlap: int = 2  # seconds

    # yt-dlp
    max_concurrent_downloads: int = 3

    def ensure_dirs(self):
        """Create all required directories."""
        for d in [self.upload_dir, self.processed_dir, self.export_dir]:
            d.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
