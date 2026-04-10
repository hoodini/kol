"""
Blitz AI - Professional Transcription Studio
Built by Yuval Avidani — https://yuv.ai

FastAPI application entry point.
"""

import os
import sys

# Force UTF-8 on Windows — required for Hebrew text in logging/progress callbacks
if sys.platform == "win32":
    os.environ.setdefault("PYTHONUTF8", "1")
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if sys.stderr.encoding != "utf-8":
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine
from app.models import Base
from app.routers import export, projects, settings, studio, transcribe

logging.basicConfig(level=logging.INFO, encoding="utf-8")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("⚡  Blitz AI is ready!")
    yield


app = FastAPI(
    title="Blitz AI - Transcription Studio",
    description="Professional audio/video transcription with Hebrew-first support",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(projects.router)
app.include_router(transcribe.router)
app.include_router(studio.router)
app.include_router(export.router)
app.include_router(settings.router)


# ─── WebSocket for real-time progress ────────────

class ConnectionManager:
    """Manages WebSocket connections per project."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, project_id: str, websocket: WebSocket):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, project_id: str, websocket: WebSocket):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]

    async def send_progress(self, project_id: str, progress: float, message: str):
        if project_id in self.active_connections:
            data = json.dumps({
                "type": "progress",
                "project_id": project_id,
                "progress": progress,
                "message": message,
            })
            for ws in self.active_connections[project_id]:
                try:
                    await ws.send_text(data)
                except Exception:
                    pass


ws_manager = ConnectionManager()


# Register the progress callback for transcription
def _ws_progress_callback(project_id: str, progress: float, message: str):
    """Bridge sync callback to async WebSocket."""
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.ensure_future(ws_manager.send_progress(project_id, progress, message))


# Patch the transcribe router's progress system
transcribe.progress_callbacks["__ws__"] = [_ws_progress_callback]


@app.websocket("/api/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    """WebSocket endpoint for real-time transcription progress."""
    await ws_manager.connect(project_id, websocket)
    try:
        while True:
            # Keep connection alive, listen for any client messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(project_id, websocket)


@app.get("/")
async def root():
    return {
        "name": "Blitz AI",
        "version": "1.0.0",
        "description": "Professional Transcription Studio",
        "author": "Yuval Avidani",
        "website": "https://yuv.ai",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
