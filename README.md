<div align="center">

# ⚡ Blitz AI

<img src="frontend/public/hero.png" width="500" alt="Blitz AI" />

### Professional Transcription Studio

**The most powerful open-source transcription tool with Hebrew-first support.**

Transcribe any audio or video — local files, YouTube, Vimeo, entire playlists — with your choice of engine.

[![License: MIT](https://img.shields.io/badge/License-MIT-pink.svg)](LICENSE)
[![Made with FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Made with Next.js](https://img.shields.io/badge/Frontend-Next.js_15-black?logo=next.js)](https://nextjs.org)
[![Hebrew First](https://img.shields.io/badge/%D7%A2%D7%91%D7%A8%D7%99%D7%AA-First-blue)](#)

[Quick Start](#-quick-start) · [Features](#-features) · [Architecture](#-architecture) · [Troubleshooting](#troubleshooting) · [**מדריך בעברית**](SETUP_GUIDE.md) · [**LLM Setup Prompt**](LLM_SETUP_PROMPT.md)

</div>

---

## Why Blitz AI?

Most transcription tools treat Hebrew as an afterthought. **Blitz AI was built Hebrew-first** — RTL layout, Hebrew-optimized models, and a correction studio designed for right-to-left editing. But it works beautifully with any language.

### What makes Blitz AI different:

| Feature | Blitz AI | Otter.ai | Descript | MacWhisper |
|---------|-----|----------|---------|------------|
| Hebrew-first RTL UI | **Yes** | No | Partial | No |
| Local (free) transcription | **Yes** | No | No | Yes |
| YouTube/Vimeo download | **Yes** | No | Limited | No |
| Playlist batch processing | **Yes** | No | No | No |
| Video player in studio | **Yes** | No | Yes | No |
| Correction studio | **Yes** | No | Yes | No |
| 5 export formats | **Yes** | 3 | 4 | 3 |
| ivrit-ai Hebrew model | **Yes** | No | No | No |
| Open source | **Yes** | No | No | No |
| No subscription | **Yes** | $8-30/mo | $24+/mo | $75 once |

---

## Features

### Transcription Engines — Choose Your Power

| Engine | Speed | Cost | Best For |
|--------|-------|------|----------|
| **Whisper V3 Large** (Local) | ~1x real-time | Free | Privacy, no internet needed |
| **Groq Whisper** (Cloud) | 299x real-time | $0.04/hr | Speed, large batches |
| **Google Gemini** (Cloud) | Fast | ~$0.01/min | Multilingual, context |
| **ivrit-ai** (HuggingFace) | Varies | Free/Low | Best Hebrew accuracy |

### Input Sources

- **File upload** — Drag & drop any audio/video format (mp3, wav, mp4, mkv, mov, flac, ogg, webm...)
- **Multi-file upload** — Select dozens of files at once
- **Folder scan** — Point to a folder path, Blitz AI finds all media files recursively
- **YouTube** — Paste a video URL, Blitz AI downloads video + audio automatically
- **Vimeo** — Same magic, different platform
- **Playlists** — Paste a YouTube playlist URL, transcribe an entire course
- **1000+ sites** — Powered by yt-dlp, supports Dailymotion, Facebook, TikTok, Twitch...

### Correction Studio

- Video/audio player synced with transcript
- Click any segment to jump to that timestamp
- Edit text directly — every save creates a new version (infinite undo)
- Confidence highlighting for uncertain words
- Keyboard shortcuts (Ctrl+S save, F2 play/pause)
- Version history — go back to any previous edit

### Export Formats

| Format | Extension | Used By |
|--------|-----------|---------|
| **SubRip** | `.srt` | Premiere Pro, DaVinci Resolve, YouTube |
| **WebVTT** | `.vtt` | HTML5 video, web players |
| **Advanced SSA** | `.ass` | Aegisub, anime subtitles, complex styling |
| **Plain Text** | `.txt` | Docs, articles, summaries |
| **JSON** | `.json` | Developers, custom processing |

### Beautiful UI

- White + pink theme inspired by modern SaaS design
- Collapsible right sidebar (RTL-native)
- Full dark mode
- Responsive, desktop-first design
- Hebrew font (Heebo) optimized for readability

---

## Architecture

```mermaid
graph TB
    subgraph "Frontend — Next.js 15"
        UI[Beautiful RTL UI]
        UP[Upload Zone]
        URL[YouTube/URL Input]
        STUDIO[Correction Studio]
        EXP[Export Manager]
    end

    subgraph "Backend — FastAPI"
        API[REST API + WebSocket]
        TM[Transcription Manager]
        DL[URL Downloader<br/>yt-dlp]
        AP[Audio Processor<br/>ffmpeg]
        CM[Chunk Merger]
        ES[Export Service]
    end

    subgraph "Transcription Engines"
        WH[Whisper V3 Large<br/>Local · Free]
        GR[Groq API<br/>Cloud · $0.04/hr]
        GM[Google Gemini<br/>Cloud · Fast]
        HF[ivrit-ai<br/>Best Hebrew]
    end

    subgraph "Storage"
        DB[(SQLite<br/>Projects & Transcripts)]
        FS[File System<br/>Audio/Video Files]
    end

    UI --> API
    UP -->|Upload files| API
    URL -->|YouTube/Vimeo URL| API

    API --> TM
    API --> DL
    DL -->|Download video + audio| FS
    TM --> AP
    AP -->|Convert to WAV 16kHz| FS
    AP -->|Split 30s chunks| TM

    TM -->|Choose engine| WH
    TM -->|Choose engine| GR
    TM -->|Choose engine| GM
    TM -->|Choose engine| HF

    WH -->|Segments + words| CM
    GR -->|Segments + words| CM
    GM -->|Segments + words| CM
    HF -->|Segments + words| CM

    CM -->|Merged transcript| DB
    STUDIO -->|Edit & save| DB
    EXP --> ES
    ES -->|SRT/VTT/ASS/TXT/JSON| UI

    style WH fill:#10b981,color:#fff
    style GR fill:#f59e0b,color:#fff
    style GM fill:#3b82f6,color:#fff
    style HF fill:#8b5cf6,color:#fff
    style UI fill:#ec4899,color:#fff
    style STUDIO fill:#ec4899,color:#fff
```

### Transcription Pipeline

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant E as Engine
    participant DB as Database

    U->>F: Upload file / Paste URL
    F->>B: POST /api/transcribe

    alt YouTube/Vimeo URL
        B->>B: yt-dlp download video (MP4)
        B->>B: yt-dlp extract audio (WAV)
    end

    B->>B: ffmpeg convert → WAV 16kHz mono
    B->>B: Split into 30s chunks (2s overlap)

    loop Each chunk
        B->>E: transcribe_chunk(audio)
        E-->>B: segments + word timestamps
        B-->>F: WebSocket: progress update
    end

    B->>B: Merge chunks (align timestamps, deduplicate)
    B->>DB: Store segments + words
    B-->>F: WebSocket: completed!

    U->>F: Open Correction Studio
    F->>B: GET /api/studio/{id}
    B-->>F: Video + segments + words

    U->>F: Edit transcript
    F->>B: PUT /api/studio/{id}
    B->>DB: New version (append-only)

    U->>F: Export as SRT
    F->>B: POST /api/export/{id}
    B-->>F: Downloaded file
```

### Database Schema

```mermaid
erDiagram
    PROJECT ||--o{ TRANSCRIPT_VERSION : has
    TRANSCRIPT_VERSION ||--o{ SEGMENT : contains
    SEGMENT ||--o{ WORD : contains
    PROJECT }o--o{ TAG : tagged

    PROJECT {
        string id PK
        string name
        string source_path
        string video_path
        string source_url
        string source_type
        float duration_seconds
        string status
        float progress
    }

    TRANSCRIPT_VERSION {
        string id PK
        string project_id FK
        int version_number
        datetime created_at
    }

    SEGMENT {
        string id PK
        string version_id FK
        int index_num
        float start_time
        float end_time
        string text
        float confidence
    }

    WORD {
        string id PK
        string segment_id FK
        string word
        float start_time
        float end_time
        float confidence
    }
```

---

## Quick Start

> **🇮🇱 לא טכני?** יש [מדריך מפורט בעברית](SETUP_GUIDE.md) שמסביר כל שלב בשפת בני אדם.
>
> **🤖 מעדיף שה-AI יעזור?** העתיקו את ה-[LLM Setup Prompt](LLM_SETUP_PROMPT.md) ל-ChatGPT/Claude והוא ידריך אתכם.

### Prerequisites

- **OS:** Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+)
  - ⚠️ Windows 7/8/8.1 are **not supported** (Node.js 18+ requires Windows 10+)
  - 🪟 See [**Windows Setup Guide**](WINDOWS.md) for Windows-specific instructions
- **Python 3.11+**
- **Node.js 18+**
- **ffmpeg** (`brew install ffmpeg` on macOS)
- **yt-dlp** (`pip install yt-dlp` or `brew install yt-dlp`)

### 1. Clone

```bash
git clone https://github.com/hoodini/blitzai.git
cd blitzai
```

### 2. Install & Run (Quick Way)

```bash
npm run setup   # Installs frontend + creates Python venv + installs backend deps
npm run dev     # Starts both backend and frontend
```

Open **http://localhost:3000** and start transcribing!

### Manual Setup (Alternative)

<details>
<summary>Click to expand manual setup steps</summary>

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure API keys (optional — local Whisper works without any keys)
# IMPORTANT: .env must stay inside backend/ — the app reads it from here
cp .env.example .env       # Windows: copy .env.example .env
# Edit .env to add your API keys (at least one: GROQ_API_KEY or HUGGINGFACE_API_KEY)
# Note: Groq free tier is limited to 20 requests/min — the app auto-paces and retries
```

#### Frontend

```bash
cd ../frontend
npm install
```

#### Run

```bash
# Terminal 1 — Backend
cd backend
source .venv/bin/activate        # Windows: .venv\Scripts\activate
python run.py                    # Recommended — handles Windows event-loop automatically
# Or: uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload  (macOS/Linux only)

# Terminal 2 — Frontend
cd frontend
npm run dev
```

</details>

Open **http://localhost:3000** and start transcribing!

> 🪟 **Windows users:** You can also use `start.bat` to launch both servers at once. See the [Windows Setup Guide](WINDOWS.md) for full instructions.

### API Keys (Optional)

| Engine | Where to Get | Env Variable |
|--------|-------------|-------------|
| Groq | [console.groq.com](https://console.groq.com) | `GROQ_API_KEY` |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com/apikey) | `GEMINI_API_KEY` |
| HuggingFace | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | `HUGGINGFACE_API_KEY` |

> **Note:** Local Whisper requires no API key — it runs entirely on your machine.
>
> **Groq free tier:** Limited to 20 requests/minute. Blitz AI automatically spaces requests to stay under this limit, so longer files may take a bit more time. Rate limit retries are handled transparently.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | SQLite (WAL mode) |
| Audio | ffmpeg, yt-dlp |
| Local ASR | faster-whisper (CTranslate2) |
| Cloud ASR | Groq, Google Gemini, HuggingFace |

---

## Project Structure

```
blitzai/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + WebSocket
│   │   ├── config.py            # Settings & env vars
│   │   ├── database.py          # SQLite setup
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── schemas.py           # Pydantic schemas
│   │   ├── engines/             # Transcription engines
│   │   │   ├── base.py          # Engine protocol
│   │   │   ├── faster_whisper.py
│   │   │   ├── groq_engine.py
│   │   │   ├── gemini_engine.py
│   │   │   └── huggingface_engine.py
│   │   ├── services/
│   │   │   ├── audio_processor.py    # ffmpeg operations
│   │   │   ├── url_downloader.py     # yt-dlp integration
│   │   │   ├── transcription_manager.py
│   │   │   ├── chunk_merger.py
│   │   │   └── export_service.py
│   │   └── routers/
│   │       ├── transcribe.py    # Upload/URL/folder endpoints
│   │       ├── projects.py      # CRUD
│   │       ├── studio.py        # Correction studio API
│   │       ├── export.py        # Export endpoints
│   │       └── settings.py
│   ├── requirements.txt
│   └── .env.example              # API key template (copy to .env)
├── frontend/
│   ├── src/
│   │   ├── app/                 # Next.js pages (RTL)
│   │   ├── components/          # React components
│   │   ├── stores/              # Zustand state
│   │   └── lib/                 # API client & utils
│   └── package.json
├── README.md
├── SETUP_GUIDE.md
├── WINDOWS.md
├── start.sh
└── start.bat
```

---

## Troubleshooting

Below are common issues that have been identified and resolved. See also the [Windows Setup Guide](WINDOWS.md) for Windows-specific details.

<details>
<summary><strong>Windows: <code>NotImplementedError</code> — all transcription fails</strong></summary>

**Symptom:** Uploading files or submitting URLs returns `NotImplementedError`.

**Cause:** On Windows, `asyncio.create_subprocess_exec` requires a `ProactorEventLoop`. Running uvicorn directly (especially with `--reload`) may use a `SelectorEventLoop` instead.

**Fix:** Always start the backend with:

```powershell
cd backend
.venv\Scripts\activate
python run.py
```

`run.py` sets the correct event-loop policy before starting uvicorn. **Do not use** `uvicorn app.main:app --reload` on Windows.

</details>

<details>
<summary><strong>Windows: <code>yt-dlp</code> / <code>ffmpeg</code> not found when running inside a venv</strong></summary>

**Symptom:** Submitting a YouTube URL returns `{"detail":""}` (HTTP 400).

**Cause:** On Windows, subprocess calls don't inherit the venv's `Scripts/` directory, so `yt-dlp`, `ffmpeg`, and `ffprobe` can't be found even though they're installed.

**Fix:** This is handled automatically — the backend uses an executable resolver (`exec_resolver.py`) that checks the venv directory first, then falls back to the system PATH. Just make sure you:

1. Install dependencies inside the venv: `pip install -r requirements.txt`
2. Have `ffmpeg` installed system-wide (`winget install Gyan.FFmpeg`) or inside the venv

</details>

<details>
<summary><strong>YouTube playlists fail with "Incomplete data received"</strong></summary>

**Symptom:** YouTube playlists return `WARNING: Incomplete data received. Giving up after 3 retries`.

**Cause:** Older pinned versions of `yt-dlp` break when YouTube changes their internal API.

**Fix:** The dependency is now set to `yt-dlp>=2025.3.31` so pip will pull the latest compatible version. If you're on an older install, upgrade:

```bash
pip install --upgrade yt-dlp
```

</details>

<details>
<summary><strong>Folder scan: directory traversal protection</strong></summary>

The `/api/transcribe/folder` endpoint only allows scanning within the configured `allowed_scan_dir` (defaults to the `uploads/` directory). Attempts to scan outside this directory are rejected with an error. If you need to scan a different folder, configure the `ALLOWED_SCAN_DIR` environment variable in your `.env` file.

</details>

<details>
<summary><strong>Windows 7/8: <code>npm install</code> fails</strong></summary>

Node.js 18+ (required by Next.js) does **not** support Windows 7 or 8. You must use **Windows 10** (version 1809+) or later. See the [Windows Setup Guide](WINDOWS.md) for alternatives.

</details>

---

## Contributing

Contributions welcome! Areas to help:

- [ ] WaveSurfer.js waveform visualization
- [ ] Speaker diarization (who said what)
- [ ] Real-time WebSocket progress bar
- [ ] More export formats (EDL, FCPXML)
- [ ] Batch operations UI
- [ ] Docker support
- [ ] i18n (Arabic, Russian, English UI)

---

## License

MIT License — free for personal and commercial use.

---

<div align="center">

Built with passion by **[Yuval Avidani](https://yuv.ai)**

[![Website](https://img.shields.io/badge/Web-yuv.ai-pink?style=flat-square)](https://yuv.ai)
[![X](https://img.shields.io/badge/X-@yuvalav-black?style=flat-square&logo=x)](https://x.com/yuvalav)
[![Instagram](https://img.shields.io/badge/IG-@yuval__770-purple?style=flat-square&logo=instagram)](https://instagram.com/yuval_770)
[![TikTok](https://img.shields.io/badge/TikTok-@yuval.ai-black?style=flat-square&logo=tiktok)](https://tiktok.com/@yuval.ai)
[![GitHub](https://img.shields.io/badge/GitHub-@hoodini-gray?style=flat-square&logo=github)](https://github.com/hoodini)
[![LinkTree](https://img.shields.io/badge/LinkTree-yuvai-green?style=flat-square)](https://linktr.ee/yuvai)
[![Facebook](https://img.shields.io/badge/FB-yuval.avidani-blue?style=flat-square&logo=facebook)](https://facebook.com/yuval.avidani)

</div>
