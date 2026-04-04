"""
Blitz AI - Studio Router
Correction studio API: read segments, save edits, stream audio, speaker diarization.
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Project, Segment, TranscriptVersion, Word
from app.schemas import SaveStudioRequest, SegmentResponse, StudioResponse, WordResponse

logger = logging.getLogger(__name__)

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


# ─── Speaker Diarization ────────────────────────────


class DiarizeRequest(BaseModel):
    num_speakers: Optional[int] = None


class RenameSpeakerRequest(BaseModel):
    old_name: str
    new_name: str


@router.post("/{project_id}/diarize")
async def diarize_project(
    project_id: str,
    request: DiarizeRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Run speaker diarization on the project's audio.
    Assigns speaker labels to segments and saves as a new version.
    """
    from app.config import settings as app_settings
    from app.services.diarization_service import run_diarization

    # Get project
    result = await db.execute(
        select(Project).options(selectinload(Project.versions)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.versions:
        raise HTTPException(status_code=404, detail="No transcript versions found")

    # Find the audio WAV file
    audio_path = None
    if project.source_path:
        src = Path(project.source_path)
        wav_candidate = app_settings.processed_dir / f"{src.stem}.wav"
        if wav_candidate.exists():
            audio_path = str(wav_candidate)
        elif src.exists() and src.suffix.lower() == ".wav":
            audio_path = str(src)

    if not audio_path:
        raise HTTPException(status_code=404, detail="WAV audio file not found for diarization")

    # Get latest version segments
    latest_version = max(project.versions, key=lambda v: v.version_number)
    seg_result = await db.execute(
        select(Segment)
        .options(selectinload(Segment.words))
        .where(Segment.version_id == latest_version.id)
        .order_by(Segment.index_num)
    )
    db_segments = seg_result.scalars().all()

    # Prepare segment dicts for diarization
    segment_dicts = [
        {
            "id": seg.id,
            "index_num": seg.index_num,
            "start_time": seg.start_time,
            "end_time": seg.end_time,
            "text": seg.text,
            "confidence": seg.confidence,
        }
        for seg in db_segments
    ]

    # Get HuggingFace token from settings
    hf_token = app_settings.huggingface_api_key

    # Run diarization in a thread to avoid blocking the event loop
    updated_segments, speakers = await asyncio.to_thread(
        run_diarization,
        audio_path,
        segment_dicts,
        hf_token,
        request.num_speakers,
    )

    # Save as a new version with speaker labels
    max_version = max((v.version_number for v in project.versions), default=0)
    new_version = TranscriptVersion(
        project_id=project_id,
        version_number=max_version + 1,
    )
    db.add(new_version)
    await db.flush()

    # Create segments with speaker labels, preserving words
    for updated_seg in updated_segments:
        # Find original db segment to copy words from
        orig_db_seg = next((s for s in db_segments if s.id == updated_seg["id"]), None)

        new_seg = Segment(
            version_id=new_version.id,
            index_num=updated_seg["index_num"],
            start_time=updated_seg["start_time"],
            end_time=updated_seg["end_time"],
            text=updated_seg["text"],
            speaker=updated_seg.get("speaker"),
            confidence=updated_seg.get("confidence"),
        )
        db.add(new_seg)
        await db.flush()

        # Copy words from original segment
        if orig_db_seg and orig_db_seg.words:
            for w in orig_db_seg.words:
                new_word = Word(
                    segment_id=new_seg.id,
                    word=w.word,
                    start_time=w.start_time,
                    end_time=w.end_time,
                    confidence=w.confidence,
                )
                db.add(new_word)

    await db.commit()

    logger.info(f"Diarization complete for project {project_id}: {len(speakers)} speakers, version {new_version.version_number}")

    return {
        "status": "completed",
        "version_number": new_version.version_number,
        "speakers": speakers,
        "segment_count": len(updated_segments),
    }


@router.post("/{project_id}/rename-speaker")
async def rename_speaker(
    project_id: str,
    request: RenameSpeakerRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Rename a speaker across all segments in the latest version.
    Creates a new version with the updated speaker names.
    """
    # Get project
    result = await db.execute(
        select(Project).options(selectinload(Project.versions)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not project.versions:
        raise HTTPException(status_code=404, detail="No transcript versions found")

    # Get latest version segments
    latest_version = max(project.versions, key=lambda v: v.version_number)
    seg_result = await db.execute(
        select(Segment)
        .options(selectinload(Segment.words))
        .where(Segment.version_id == latest_version.id)
        .order_by(Segment.index_num)
    )
    db_segments = seg_result.scalars().all()

    # Check if old_name exists in any segment
    has_speaker = any(seg.speaker == request.old_name for seg in db_segments)
    if not has_speaker:
        raise HTTPException(status_code=404, detail=f"Speaker '{request.old_name}' not found")

    # Create new version with renamed speaker
    max_version = max((v.version_number for v in project.versions), default=0)
    new_version = TranscriptVersion(
        project_id=project_id,
        version_number=max_version + 1,
    )
    db.add(new_version)
    await db.flush()

    for seg in db_segments:
        new_speaker = request.new_name if seg.speaker == request.old_name else seg.speaker
        new_seg = Segment(
            version_id=new_version.id,
            index_num=seg.index_num,
            start_time=seg.start_time,
            end_time=seg.end_time,
            text=seg.text,
            speaker=new_speaker,
            confidence=seg.confidence,
        )
        db.add(new_seg)
        await db.flush()

        # Copy words
        if seg.words:
            for w in seg.words:
                new_word = Word(
                    segment_id=new_seg.id,
                    word=w.word,
                    start_time=w.start_time,
                    end_time=w.end_time,
                    confidence=w.confidence,
                )
                db.add(new_word)

    await db.commit()

    # Collect updated speaker list
    all_speakers = sorted(set(
        request.new_name if seg.speaker == request.old_name else seg.speaker
        for seg in db_segments
        if seg.speaker
    ))

    return {
        "status": "renamed",
        "version_number": new_version.version_number,
        "speakers": all_speakers,
    }


@router.get("/{project_id}/speakers")
async def get_speakers(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the list of unique speakers in the latest version."""
    result = await db.execute(
        select(Project).options(selectinload(Project.versions)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project or not project.versions:
        return {"speakers": [], "has_diarization": False}

    latest_version = max(project.versions, key=lambda v: v.version_number)
    seg_result = await db.execute(
        select(Segment.speaker)
        .where(Segment.version_id == latest_version.id)
        .where(Segment.speaker.isnot(None))
        .where(Segment.speaker != "")
        .distinct()
    )
    speakers = sorted([row[0] for row in seg_result.all()])

    return {
        "speakers": speakers,
        "has_diarization": len(speakers) > 0,
    }


class MergeSpeakersRequest(BaseModel):
    source_speaker: str
    target_speaker: str


@router.post("/{project_id}/merge-speakers")
async def merge_speakers(
    project_id: str,
    request: MergeSpeakersRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Merge one speaker into another — all segments of source_speaker
    become target_speaker. Creates a new version.
    """
    result = await db.execute(
        select(Project).options(selectinload(Project.versions)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project or not project.versions:
        raise HTTPException(status_code=404, detail="Project not found")

    latest_version = max(project.versions, key=lambda v: v.version_number)
    seg_result = await db.execute(
        select(Segment)
        .options(selectinload(Segment.words))
        .where(Segment.version_id == latest_version.id)
        .order_by(Segment.index_num)
    )
    db_segments = seg_result.scalars().all()

    if not any(seg.speaker == request.source_speaker for seg in db_segments):
        raise HTTPException(status_code=404, detail=f"Speaker '{request.source_speaker}' not found")

    max_version = max((v.version_number for v in project.versions), default=0)
    new_version = TranscriptVersion(project_id=project_id, version_number=max_version + 1)
    db.add(new_version)
    await db.flush()

    for seg in db_segments:
        new_speaker = request.target_speaker if seg.speaker == request.source_speaker else seg.speaker
        new_seg = Segment(
            version_id=new_version.id, index_num=seg.index_num,
            start_time=seg.start_time, end_time=seg.end_time,
            text=seg.text, speaker=new_speaker, confidence=seg.confidence,
        )
        db.add(new_seg)
        await db.flush()
        if seg.words:
            for w in seg.words:
                db.add(Word(segment_id=new_seg.id, word=w.word,
                            start_time=w.start_time, end_time=w.end_time, confidence=w.confidence))

    await db.commit()

    all_speakers = sorted(set(
        request.target_speaker if s.speaker == request.source_speaker else s.speaker
        for s in db_segments if s.speaker
    ))
    return {"status": "merged", "version_number": new_version.version_number, "speakers": all_speakers}


@router.post("/{project_id}/clear-speakers")
async def clear_speakers(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Remove all speaker labels from segments. Creates a new version."""
    result = await db.execute(
        select(Project).options(selectinload(Project.versions)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project or not project.versions:
        raise HTTPException(status_code=404, detail="Project not found")

    latest_version = max(project.versions, key=lambda v: v.version_number)
    seg_result = await db.execute(
        select(Segment)
        .options(selectinload(Segment.words))
        .where(Segment.version_id == latest_version.id)
        .order_by(Segment.index_num)
    )
    db_segments = seg_result.scalars().all()

    max_version = max((v.version_number for v in project.versions), default=0)
    new_version = TranscriptVersion(project_id=project_id, version_number=max_version + 1)
    db.add(new_version)
    await db.flush()

    for seg in db_segments:
        new_seg = Segment(
            version_id=new_version.id, index_num=seg.index_num,
            start_time=seg.start_time, end_time=seg.end_time,
            text=seg.text, speaker=None, confidence=seg.confidence,
        )
        db.add(new_seg)
        await db.flush()
        if seg.words:
            for w in seg.words:
                db.add(Word(segment_id=new_seg.id, word=w.word,
                            start_time=w.start_time, end_time=w.end_time, confidence=w.confidence))

    await db.commit()
    return {"status": "cleared", "version_number": new_version.version_number}


class DeleteSpeakerSegmentsRequest(BaseModel):
    speaker: str


@router.post("/{project_id}/delete-speaker-segments")
async def delete_speaker_segments(
    project_id: str,
    request: DeleteSpeakerSegmentsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete all segments belonging to a specific speaker. Creates a new version."""
    result = await db.execute(
        select(Project).options(selectinload(Project.versions)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project or not project.versions:
        raise HTTPException(status_code=404, detail="Project not found")

    latest_version = max(project.versions, key=lambda v: v.version_number)
    seg_result = await db.execute(
        select(Segment)
        .options(selectinload(Segment.words))
        .where(Segment.version_id == latest_version.id)
        .order_by(Segment.index_num)
    )
    db_segments = seg_result.scalars().all()

    kept_segments = [s for s in db_segments if s.speaker != request.speaker]
    if len(kept_segments) == len(db_segments):
        raise HTTPException(status_code=404, detail=f"Speaker '{request.speaker}' not found")

    max_version = max((v.version_number for v in project.versions), default=0)
    new_version = TranscriptVersion(project_id=project_id, version_number=max_version + 1)
    db.add(new_version)
    await db.flush()

    for idx, seg in enumerate(kept_segments):
        new_seg = Segment(
            version_id=new_version.id, index_num=idx,
            start_time=seg.start_time, end_time=seg.end_time,
            text=seg.text, speaker=seg.speaker, confidence=seg.confidence,
        )
        db.add(new_seg)
        await db.flush()
        if seg.words:
            for w in seg.words:
                db.add(Word(segment_id=new_seg.id, word=w.word,
                            start_time=w.start_time, end_time=w.end_time, confidence=w.confidence))

    await db.commit()

    remaining_speakers = sorted(set(s.speaker for s in kept_segments if s.speaker))
    deleted_count = len(db_segments) - len(kept_segments)
    return {
        "status": "deleted",
        "version_number": new_version.version_number,
        "speakers": remaining_speakers,
        "deleted_count": deleted_count,
    }
