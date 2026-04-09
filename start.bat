@echo off
REM Blitz AI - Start Script (Windows)
REM Launches both backend and frontend servers
REM Requires: Python 3.11+, Node.js 18+, Windows 10 or later

echo.
echo   Starting Blitz AI - Transcription Studio
echo   Built by Yuval Avidani — https://yuv.ai
echo.

REM Get script directory
set "DIR=%~dp0"
set "DIR=%DIR:~0,-1%"

REM Check Windows version (Node.js 18+ requires Windows 10+)
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
for /f "tokens=1 delims=." %%i in ("%VERSION%") do set MAJOR=%%i
if %MAJOR% LSS 10 (
    echo [ERROR] Windows 10 or later is required.
    echo         Node.js 18+ does not support Windows 7/8/8.1.
    echo         See WINDOWS.md for alternatives ^(WSL2, Docker^).
    echo.
    pause
    exit /b 1
)

REM Check for Python
where python >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

REM Check for Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

REM Check for .env (must be inside backend/)
if not exist "%DIR%\backend\.env" (
    if exist "%DIR%\backend\.env.example" (
        echo   No .env file found. Copying from .env.example...
        copy "%DIR%\backend\.env.example" "%DIR%\backend\.env" >nul
        echo   Edit backend\.env to add your API keys ^(optional for local transcription^)
    )
)

REM Check for backend venv
if not exist "%DIR%\backend\.venv\Scripts\python.exe" (
    echo [WARNING] Backend virtual environment not found.
    echo          Run: cd backend ^&^& python -m venv .venv ^&^& .venv\Scripts\activate ^&^& pip install -r requirements.txt
    echo.
)

REM Start backend
echo   Starting backend ^(FastAPI^)...
start "Blitz AI - Backend" /D "%DIR%\backend" cmd /c ""%DIR%\backend\.venv\Scripts\python.exe" run.py"

REM Start frontend
echo   Starting frontend ^(Next.js^)...
start "Blitz AI - Frontend" /D "%DIR%\frontend" cmd /c "npm run dev"

echo.
echo   =======================================
echo     Blitz AI is running!
echo     Frontend: http://localhost:3000
echo     Backend:  http://localhost:8000
echo     API Docs: http://localhost:8000/docs
echo   =======================================
echo.
echo   Close this window or press Ctrl+C to stop.
echo   (You may also need to close the Backend and Frontend windows)
echo.
pause
