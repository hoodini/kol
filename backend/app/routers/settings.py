"""
Blitz AI - Settings Router
User preferences and API key management.
"""

from fastapi import APIRouter

from app.config import settings
from app.schemas import SettingsResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings():
    """Get current settings (API keys are masked)."""
    return SettingsResponse(
        default_engine=settings.default_engine,
        default_language=settings.default_language,
        whisper_model=settings.whisper_model,
        groq_api_key_set=bool(settings.groq_api_key),
        gemini_api_key_set=bool(settings.gemini_api_key),
        huggingface_api_key_set=bool(settings.huggingface_api_key),
    )
