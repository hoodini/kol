# Windows Setup Guide

> **Minimum requirement:** Windows 10 (version 1809 or later)
>
> **Windows 7/8/8.1 are NOT supported** — Node.js 18+ (required by Next.js) does not run on these operating systems.

---

## Quick Start on Windows

### 1. Install Prerequisites

| Tool | Install Command (winget) | Alternative |
|------|--------------------------|-------------|
| **Python 3.11+** | `winget install Python.Python.3.11` | [python.org](https://python.org) |
| **Node.js 18+** | `winget install OpenJS.NodeJS.LTS` | [nodejs.org](https://nodejs.org) |
| **ffmpeg** | `winget install Gyan.FFmpeg` | [ffmpeg.org](https://ffmpeg.org/download.html) |
| **Git** | `winget install Git.Git` | [git-scm.com](https://git-scm.com) |

> **Tip:** [winget](https://learn.microsoft.com/windows/package-manager/winget/) comes pre-installed on Windows 10 (1809+) and Windows 11.

Verify installations:

```powershell
python --version   # Should show 3.11+
node --version     # Should show 18+
ffmpeg -version    # Should show ffmpeg version info
```

### 2. Clone & Setup Backend

```powershell
git clone https://github.com/hoodini/blitzai.git
cd blitzai\backend

python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

copy .env.example .env
# Edit .env with your API keys (optional for local Whisper)
```

### 3. Setup Frontend

```powershell
cd ..\frontend
npm install
```

### 4. Run

**Option A — Use the start script:**

```powershell
cd ..
.\start.bat
```

**Option B — Run manually in two terminals:**

```powershell
# Terminal 1 — Backend
cd backend
.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **http://localhost:3000** and start transcribing!

---

## Troubleshooting

### "npm install" fails on Windows 7/8

**This is expected.** Node.js 18+ does not support Windows 7 or 8. Blitz AI requires Node.js 18+ because Next.js 16 depends on it.

**Alternatives for Windows 7/8 users:**

1. **Upgrade to Windows 10** (recommended) — Windows 10 is a free upgrade from Windows 7/8.
2. **Use WSL2** (Windows Subsystem for Linux) — Available on Windows 10 version 2004+. Follow the [Linux setup instructions](README.md#quick-start) inside WSL.
3. **Use Docker** — Run Blitz AI in a container (Docker Desktop requires Windows 10+, but Docker Toolbox works on older Windows with VirtualBox).

### Python "not recognized" error

Make sure Python is added to your PATH during installation. Re-run the Python installer and check "Add Python to PATH".

### "ffmpeg not found" error

Install ffmpeg and ensure it's on your PATH:

```powershell
winget install Gyan.FFmpeg
```

Or download from [ffmpeg.org](https://ffmpeg.org/download.html), extract, and add the `bin` folder to your system PATH.

### "yt-dlp not found" error

yt-dlp is installed as part of the Python dependencies (`pip install -r requirements.txt`). Make sure your virtual environment is activated:

```powershell
.venv\Scripts\activate
```

### Unicode / Hebrew characters display incorrectly

The backend already handles UTF-8 encoding on Windows. If you see garbled text in your terminal:

1. Use **Windows Terminal** (recommended) instead of the legacy `cmd.exe`
2. Or set the code page: `chcp 65001`

### Port already in use

If port 8000 or 3000 is busy:

```powershell
# Find what's using the port
netstat -ano | findstr :8000

# Kill the process (replace PID with the actual number)
taskkill /PID <PID> /F
```

---

## Recommended Tools for Windows Development

- [**Windows Terminal**](https://aka.ms/terminal) — Modern terminal with tabs, Unicode support, and GPU-accelerated rendering
- [**VS Code**](https://code.visualstudio.com) — Editor with excellent Python and TypeScript support
- [**winget**](https://learn.microsoft.com/windows/package-manager/winget/) — Windows package manager (built-in on Windows 10+)
