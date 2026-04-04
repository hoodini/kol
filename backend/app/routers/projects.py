"""
Blitz AI - Projects Router
CRUD operations for transcription projects.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.models import Project, Segment, Tag, TranscriptVersion
from app.schemas import ProjectListResponse, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _project_to_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        source_filename=project.source_filename,
        source_url=project.source_url,
        source_type=project.source_type,
        thumbnail_url=project.thumbnail_url,
        duration_seconds=project.duration_seconds,
        language=project.language,
        engine_used=project.engine_used,
        status=project.status,
        progress=project.progress,
        error_message=project.error_message,
        created_at=project.created_at,
        updated_at=project.updated_at,
        has_video=project.has_video == "true",
        tags=[t.name for t in project.tags],
        version_count=len(project.versions),
    )


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    search: str | None = None,
    status: str | None = None,
    tag: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """List all projects with optional filters."""
    query = select(Project).options(
        selectinload(Project.tags),
        selectinload(Project.versions),
    )

    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    if status:
        query = query.where(Project.status == status)
    if tag:
        query = query.join(Project.tags).where(Tag.name == tag)

    # Get total count
    count_query = select(func.count(Project.id))
    if search:
        count_query = count_query.where(Project.name.ilike(f"%{search}%"))
    if status:
        count_query = count_query.where(Project.status == status)
    total = (await db.execute(count_query)).scalar() or 0

    # Get paginated results
    query = query.order_by(Project.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    projects = result.scalars().unique().all()

    return ProjectListResponse(
        projects=[_project_to_response(p) for p in projects],
        total=total,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single project by ID."""
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tags), selectinload(Project.versions))
        .where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_to_response(project)


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update project name or tags."""
    result = await db.execute(
        select(Project).options(selectinload(Project.tags)).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.name is not None:
        project.name = body.name

    if body.tags is not None:
        # Resolve or create tags
        project.tags.clear()
        for tag_name in body.tags:
            tag_result = await db.execute(select(Tag).where(Tag.name == tag_name))
            tag = tag_result.scalar_one_or_none()
            if not tag:
                tag = Tag(name=tag_name)
                db.add(tag)
            project.tags.append(tag)

    await db.commit()
    return {"status": "updated"}


@router.delete("/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a project and all its data."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
    return {"status": "deleted"}
