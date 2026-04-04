"""
Blitz AI - Transcription Router
Handles file uploads, URL downloads, and folder scanning.
"""

import asyncio
import logging
import shutil
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session, get_db
from app.models import Project
from app.schemas import TranscribeFolderRequest, TranscribeURLRequest
from app.services.transcription_manager import get_available_engines, transcribe_file
from app.services.url_downloader import download_audio, download_playlist, get_url_info

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transcribe", tags=["transcribe"])

# In-memory progress tracking (sent via WebSocket)
progress_callbacks: dict[str, list] = {}


def _notify_progress(project_id: str, progress: float, message: str):
    """Store progress for WebSocket delivery."""
    if project_id in progress_callbacks:
        for cb in progress_callbacks[project_id]:
            try:
                cb(project_id, progress, message)
            except Exception:
                pass


@router.get("/engines")
async def list_engines():
    """List available transcription engines."""
    return await get_available_engines()


@router.post("/upload")
async def upload_and_transcribe(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    engine: str = Form("local"),
    language: str = Form("he"),
    db: AsyncSession = Depends(get_db),
):
    """Upload a single file and start transcription."""
    # Use only the filename (strip any folder path)
    safe_name = Path(file.filename).name
    upload_path = settings.upload_dir / safe_name
    with open(upload_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Detect if uploaded file is video
    video_extensions = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv"}
    is_video = Path(safe_name).suffix.lower() in video_extensions

    # Create project
    project = Project(
        name=Path(safe_name).stem,
        source_filename=safe_name,
        source_path=str(upload_path),
        video_path=str(upload_path) if is_video else None,
        has_video="true" if is_video else "false",
        source_type="file",
        language=language,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Start transcription in background
    background_tasks.add_task(_run_transcription, project.id, upload_path, engine, language)

    logger.info(f"[job:{project.id[:8]}] Upload accepted: {file.filename} engine={engine} lang={language}")
    return {"project_id": project.id, "status": "started"}


@router.post("/upload-multiple")
async def upload_multiple(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    engine: str = Form("local"),
    language: str = Form("he"),
    db: AsyncSession = Depends(get_db),
):
    """Upload multiple files for batch transcription."""
    video_extensions = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".wmv", ".flv"}
    project_ids = []

    for file in files:
        # Use only the filename (strip folder path from browser folder picker)
        safe_name = Path(file.filename).name
        upload_path = settings.upload_dir / safe_name

        # Handle duplicate filenames
        counter = 1
        while upload_path.exists():
            stem = Path(safe_name).stem
            suffix = Path(safe_name).suffix
            upload_path = settings.upload_dir / f"{stem}_{counter}{suffix}"
            counter += 1

        with open(upload_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        is_video = Path(safe_name).suffix.lower() in video_extensions

        project = Project(
            name=Path(safe_name).stem,
            source_filename=safe_name,
            source_path=str(upload_path),
            video_path=str(upload_path) if is_video else None,
            has_video="true" if is_video else "false",
            source_type="file",
            language=language,
        )
        db.add(project)
        await db.flush()
        project_ids.append(project.id)

        background_tasks.add_task(_run_transcription, project.id, upload_path, engine, language)

    await db.commit()
    logger.info(f"[batch] Accepted {len(project_ids)} files, engine={engine} lang={language}")
    return {"project_ids": project_ids, "count": len(project_ids), "status": "started"}


@router.post("/url")
async def transcribe_url(
    request: TranscribeURLRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Transcribe from a YouTube/Vimeo URL (single video or playlist)."""
    # Get URL info first
    try:
        info = await get_url_info(request.url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not access URL: {e}")

    if info.is_playlist and request.playlist:
        # Handle playlist — create a project for each video
        project_ids = []
        for entry in info.entries:
            project = Project(
                name=entry.title,
                source_filename=f"{entry.title}.wav",
                source_url=entry.url,
                source_type=info.platform,
                thumbnail_url=entry.thumbnail_url,
                duration_seconds=entry.duration_seconds,
                language=request.language,
                status="downloading",
            )
            db.add(project)
            await db.flush()
            project_ids.append(project.id)

            background_tasks.add_task(
                _download_and_transcribe,
                project.id, entry.url, request.engine, request.language,
            )

        await db.commit()
        return {
            "playlist": True,
            "project_ids": project_ids,
            "count": len(project_ids),
            "status": "started",
        }
    else:
        # Single video
        project = Project(
            name=info.title,
            source_filename=f"{info.title}.wav",
            source_url=request.url,
            source_type=info.platform,
            thumbnail_url=info.thumbnail_url,
            duration_seconds=info.duration_seconds,
            language=request.language,
            status="downloading",
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)

        background_tasks.add_task(
            _download_and_transcribe,
            project.id, request.url, request.engine, request.language,
        )

        return {"project_id": project.id, "status": "started"}


@router.post("/url/info")
async def get_url_metadata(request: dict):
    """Get metadata from a URL without downloading."""
    url = request.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    try:
        info = await get_url_info(url)
        return {
            "title": info.title,
            "duration_seconds": info.duration_seconds,
            "thumbnail_url": info.thumbnail_url,
            "platform": info.platform,
            "is_playlist": info.is_playlist,
            "playlist_count": info.playlist_count,
            "entries": [
                {
                    "title": e.title,
                    "duration_seconds": e.duration_seconds,
                    "thumbnail_url": e.thumbnail_url,
                    "url": e.url,
                }
                for e in (info.entries or [])
            ] if info.is_playlist else None,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/folder")
async def transcribe_folder(
    request: TranscribeFolderRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Scan a local folder and transcribe all matching files."""
    folder = Path(request.folder_path)
    if not folder.exists() or not folder.is_dir():
        raise HTTPException(status_code=400, detail=f"Folder not found: {request.folder_path}")

    # Find all matching files
    files = []
    pattern = folder.rglob("*") if request.recursive else folder.glob("*")
    for f in pattern:
        if f.is_file() and f.suffix.lower() in request.extensions:
            files.append(f)

    if not files:
        raise HTTPException(status_code=400, detail="No matching audio/video files found in folder")

    project_ids = []
    for file_path in sorted(files):
        project = Project(
            name=file_path.stem,
            source_filename=file_path.name,
            source_path=str(file_path),
            source_type="file",
            language=request.language,
        )
        db.add(project)
        await db.flush()
        project_ids.append(project.id)

        background_tasks.add_task(
            _run_transcription,
            project.id, file_path, request.engine, request.language,
        )

    await db.commit()
    return {
        "project_ids": project_ids,
        "count": len(project_ids),
        "folder": request.folder_path,
        "status": "started",
    }


# ─── Background Tasks ────────────────────────────

async def _run_transcription(project_id: str, file_path: Path, engine_id: str, language: str):
    """Background task: transcribe a local file."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[job:{project_id[:8]}] Starting transcription: {file_path.name} engine={engine_id}")
    async with async_session() as db:
        result = await db.get(Project, project_id)
        if result:
            try:
                await transcribe_file(result, file_path, engine_id, language, db, _notify_progress)
                logger.info(f"[job:{project_id[:8]}] Completed successfully")
            except Exception as e:
                logger.error(f"[job:{project_id[:8]}] Failed: {e}")


async def _download_and_transcribe(project_id: str, url: str, engine_id: str, language: str):
    """Background task: download from URL then transcribe."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[job:{project_id[:8]}] Starting download+transcribe: {url} engine={engine_id}")
    async with async_session() as db:
        project = await db.get(Project, project_id)
        if not project:
            return

        try:
            project.status = "downloading"
            project.progress = 2.0
            await db.commit()

            # Download video + audio
            result = await download_audio(url, keep_video=True)
            project.source_path = str(result.file_path)
            project.video_path = str(result.video_path) if result.video_path else None
            project.has_video = "true" if result.video_path else "false"
            project.duration_seconds = result.duration_seconds
            project.progress = 10.0
            await db.commit()

            # Transcribe
            await transcribe_file(project, result.file_path, engine_id, language, db, _notify_progress)

        except Exception as e:
            project.status = "error"
            project.error_message = str(e)
            await db.commit()
