"""
Blitz AI - Export Router
Export transcripts in various formats.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Project, Segment, TranscriptVersion
from app.schemas import ExportRequest
from app.services.export_service import export_transcript, get_available_formats

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/formats")
async def list_formats():
    """List all available export formats."""
    return get_available_formats()


@router.post("/{project_id}")
async def export_project(
    project_id: str,
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
):
    """Export transcript in the specified format."""
    # Get project
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get target version
    result = await db.execute(
        select(TranscriptVersion)
        .where(TranscriptVersion.project_id == project_id)
        .order_by(TranscriptVersion.version_number.desc())
    )
    versions = result.scalars().all()
    if not versions:
        raise HTTPException(status_code=404, detail="No transcript found")

    if request.version is not None:
        version = next((v for v in versions if v.version_number == request.version), None)
    else:
        version = versions[0]  # Latest

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Get segments
    seg_result = await db.execute(
        select(Segment)
        .options(selectinload(Segment.words))
        .where(Segment.version_id == version.id)
        .order_by(Segment.index_num)
    )
    segments = seg_result.scalars().all()

    if not segments:
        raise HTTPException(status_code=404, detail="No segments found")

    # Export
    try:
        content, ext = export_transcript(segments, request.format)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    filename = f"{project.name}.{ext}"

    # Return as downloadable file
    media_types = {
        "srt": "application/x-subrip",
        "vtt": "text/vtt",
        "ass": "text/x-ssa",
        "txt": "text/plain",
        "json": "application/json",
    }

    # RFC 5987: encode non-ASCII filenames for Content-Disposition
    from urllib.parse import quote
    ascii_filename = f"kol_export.{ext}"
    encoded_filename = quote(filename)

    return PlainTextResponse(
        content=content,
        media_type=media_types.get(request.format, "text/plain"),
        headers={
            "Content-Disposition": (
                f'attachment; filename="{ascii_filename}"; '
                f"filename*=UTF-8''{encoded_filename}"
            ),
        },
    )
