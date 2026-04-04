"""
Blitz AI - SQLAlchemy Models
All database models with UUID primary keys and append-only versioning.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, relationship


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# Many-to-many: projects <-> tags
project_tags = Table(
    "project_tags",
    Base.metadata,
    Column("project_id", String, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", String, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    source_filename = Column(String, nullable=False)
    source_path = Column(String, nullable=True)  # Audio/original file
    video_path = Column(String, nullable=True)  # Video file for Studio playback
    source_url = Column(String, nullable=True)  # YouTube/Vimeo URL
    source_type = Column(String, default="file")  # file | youtube | vimeo | url
    has_video = Column(String, default="false")  # "true" if video available
    thumbnail_url = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    language = Column(String, default="he")
    engine_used = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending|downloading|processing|completed|error
    progress = Column(Float, default=0.0)  # 0-100
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    versions = relationship("TranscriptVersion", back_populates="project", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=project_tags, back_populates="projects")


class TranscriptVersion(Base):
    __tablename__ = "transcript_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    project = relationship("Project", back_populates="versions")
    segments = relationship("Segment", back_populates="version", cascade="all, delete-orphan")


class Segment(Base):
    __tablename__ = "segments"

    id = Column(String, primary_key=True, default=generate_uuid)
    version_id = Column(String, ForeignKey("transcript_versions.id", ondelete="CASCADE"), nullable=False)
    index_num = Column(Integer, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=False)
    speaker = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)

    version = relationship("TranscriptVersion", back_populates="segments")
    words = relationship("Word", back_populates="segment", cascade="all, delete-orphan")


class Word(Base):
    __tablename__ = "words"

    id = Column(String, primary_key=True, default=generate_uuid)
    segment_id = Column(String, ForeignKey("segments.id", ondelete="CASCADE"), nullable=False)
    word = Column(String, nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    confidence = Column(Float, nullable=True)

    segment = relationship("Segment", back_populates="words")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#E91E8C")

    projects = relationship("Project", secondary=project_tags, back_populates="tags")


class UserSetting(Base):
    __tablename__ = "user_settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)
