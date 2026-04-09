#!/bin/bash
# Blitz AI - Start Script
# Launches both backend and frontend servers

# Detect Windows (Git Bash / MSYS / Cygwin) and redirect to start.bat
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -f "$SCRIPT_DIR/start.bat" ]; then
        echo "⚠️  Detected Windows — use start.bat instead:"
        echo "   cmd /c start.bat"
        echo ""
        echo "   Or run manually:"
        echo "   Terminal 1: cd backend && .venv\\Scripts\\activate && python run.py"
        echo "   Terminal 2: cd frontend && npm run dev"
        exit 0
    fi
fi

echo "⚡  Starting Blitz AI - Transcription Studio"
echo "   Built by Yuval Avidani — https://yuv.ai"
echo ""

# Colors
PINK='\033[38;5;205m'
NC='\033[0m'

# Get script directory
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check for .env (must be inside backend/)
if [ ! -f "$DIR/backend/.env" ]; then
    echo "⚠️  No .env file found. Copying from .env.example..."
    cp "$DIR/backend/.env.example" "$DIR/backend/.env"
    echo "   Edit backend/.env to add your API keys (optional for local transcription)"
fi

# Start backend
echo -e "${PINK}Starting backend (FastAPI)...${NC}"
cd "$DIR"
PYTHONPATH="$DIR/backend" "$DIR/backend/.venv/bin/uvicorn" app.main:app --host 127.0.0.1 --port 8000 --reload --app-dir "$DIR/backend" &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Install frontend dependencies if needed
if [ ! -d "$DIR/frontend/node_modules" ]; then
    echo -e "${PINK}Installing frontend dependencies...${NC}"
    cd "$DIR/frontend"
    npm install
fi

# Start frontend
echo -e "${PINK}Starting frontend (Next.js)...${NC}"
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo -e "${PINK}═══════════════════════════════════════${NC}"
echo -e "${PINK}  Blitz AI is running!${NC}"
echo -e "${PINK}  Frontend: http://localhost:3000${NC}"
echo -e "${PINK}  Backend:  http://localhost:8000${NC}"
echo -e "${PINK}  API Docs: http://localhost:8000/docs${NC}"
echo -e "${PINK}═══════════════════════════════════════${NC}"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for either to exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
