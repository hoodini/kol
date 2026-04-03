"""
Kol (קול) - Studio Router
Correction studio API: read segments, save edits, stream audio.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Project, Segment, TranscriptVersion, Word
from app.schemas import SaveStudioRequest, SegmentResponse, StudioResponse, WordResponse

router = APIRouter(prefix="/api/studio", tags=["studio"])


@router.get("/{project_id}")
async def get_studio_data(
    project_id: str,
    version: int | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get project data for the Correction Studio.
    Returns segments with word-level timestamps for the specified version (or latest).
    """
    # Get project
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tags), selectinload(Project.versions))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.versions:
        raise HTTPException(status_code=404, detail="No transcript versions found")

    # Get target version
    total_versions = len(project.versions)
    if version is not None:
        target_version = next(
            (v for v in project.versions if v.version_number == version), None
        )
    else:
        target_version = max(project.versions, key=lambda v: v.version_number)

    if not target_version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Get segments with words
    seg_result = await db.execute(
        select(Segment)
        .options(selectinload(Segment.words))
        .where(Segment.version_id == target_version.id)
        .order_by(Segment.index_num)
    )
    segments = seg_result.scalars().all()

    # Build response
    from app.routers.projects import _project_to_response

    return {
        "project": _project_to_response(project),
        "segments": [
            {
                "id": seg.id,
                "index_num": seg.index_num,
                "start_time": seg.start_time,
                "end_time": seg.end_time,
                "text": seg.text,
                "speaker": seg.speaker,
                "confidence": seg.confidence,
                "words": [
                    {
                        "id": w.id,
                        "word": w.word,
                        "start_time": w.start_time,
                        "end_time": w.end_time,
                        "confidence": w.confidence,
                    }
                    for w in sorted(seg.words, key=lambda w: w.start_time)
                ],
            }
            for seg in segments
        ],
        "version_number": target_version.version_number,
        "total_versions": total_versions,
    }


@router.put("/{project_id}")
async def save_studio_edits(
    project_id: str,
    request: SaveStudioRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Save edited segments as a new version.
    This is append-only: the old version is preserved for undo.
    """
    # Get project and current max version
    result = await db.execute(
        select(Project).options(selectinload(Project.versions)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    max_version = max((v.version_number for v in project.versions), default=0)

    # Create new version
    new_version = TranscriptVersion(
        project_id=project_id,
        version_number=max_version + 1,
    )
    db.add(new_version)
    await db.flush()

    # Create segments from edits
    for idx, seg_update in enumerate(request.segments):
        # Get original segment for word data
        orig = await db.get(Segment, seg_update.id)

        segment = Segment(
            version_id=new_version.id,
            index_num=idx,
            start_time=seg_update.start_time or (orig.start_time if orig else 0),
            end_time=seg_update.end_time or (orig.end_time if orig else 0),
            text=seg_update.text,
            speaker=seg_update.speaker,
            confidence=orig.confidence if orig else 1.0,
        )
        db.add(segment)

    await db.commit()
    return {"status": "saved", "version_number": new_version.version_number}


@router.get("/{project_id}/audio")
async def stream_audio(project_id: str, db: AsyncSession = Depends(get_db)):
    """
    Stream the project's audio file with range request support.
    This enables seeking in the waveform player.
    """
    project = await db.get(Project, project_id)
    if not project or not project.source_path:
        raise HTTPException(status_code=404, detail="Audio file not found")

    audio_path = Path(project.source_path)

    # Check for processed WAV version
    wav_path = Path(str(audio_path).replace(str(audio_path.suffix), ".wav"))
    if not wav_path.exists():
        from app.config import settings
        wav_path = settings.processed_dir / f"{audio_path.stem}.wav"

    if wav_path.exists():
        return FileResponse(wav_path, media_type="audio/wav")
    elif audio_path.exists():
        return FileResponse(audio_path)
    else:
        raise HTTPException(status_code=404, detail="Audio file not found on disk")


@router.get("/{project_id}/video")
async def stream_video(project_id: str, db: AsyncSession = Depends(get_db)):
    """
    Stream the project's video file for the Studio player.
    Falls back to the original upload if it's a video file.
    """
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check dedicated video_path first
    if project.video_path:
        vp = Path(project.video_path)
        if vp.exists():
            return FileResponse(vp, media_type="video/mp4")

    # Fallback: original source if it's a video
    if project.source_path:
        sp = Path(project.source_path)
        if sp.exists() and sp.suffix.lower() in (".mp4", ".mkv", ".avi", ".mov", ".webm"):
            media_types = {".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska"}
            return FileResponse(sp, media_type=media_types.get(sp.suffix.lower(), "video/mp4"))

    raise HTTPException(status_code=404, detail="No video file available")


@router.get("/{project_id}/versions")
async def list_versions(project_id: str, db: AsyncSession = Depends(get_db)):
    """List all transcript versions for a project."""
    result = await db.execute(
        select(TranscriptVersion)
        .where(TranscriptVersion.project_id == project_id)
        .order_by(TranscriptVersion.version_number.desc())
    )
    versions = result.scalars().all()
    return [
        {
            "version_number": v.version_number,
            "created_at": v.created_at,
        }
        for v in versions
    ]
