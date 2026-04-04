# LLM Setup Prompt — Copy & Paste This to Any AI Assistant

> Copy everything below and paste it to ChatGPT, Claude, Gemini, or any AI assistant.
> The AI will walk you through the setup step by step.

---

## COPY FROM HERE:

```
I want to install and run the "Blitz AI" transcription tool on my computer.

Here's what Blitz AI is: An open-source transcription studio that can transcribe any audio/video file or YouTube link into text with accurate timestamps. It supports Hebrew and other languages, has a beautiful pink/white UI, and can export subtitles as SRT/VTT/ASS/TXT/JSON.

GitHub repo: https://github.com/hoodini/blitzai

My setup:
- Operating system: [Mac / Windows / Linux]
- I [have / don't have] experience with terminal/command line
- I want to use [Groq (recommended, free & fast) / Google Gemini / HuggingFace ivrit-ai / Local Whisper] for transcription

Please walk me through the COMPLETE installation step by step:

1. Install prerequisites (Python, Node.js, ffmpeg, yt-dlp)
2. Clone the repository
3. Set up the Python backend (venv, pip install)
4. Set up the Next.js frontend (npm install)
5. Create an API key for my chosen transcription service — explain EXACTLY where to click, with URLs
6. Configure the .env file with my API key
7. Start both servers
8. Open the app and do my first transcription

Important notes:
- Explain everything simply, as if I've never used a terminal before
- Tell me exactly what to copy-paste at each step
- Explain what each command does in simple words
- If something could go wrong, tell me what error to expect and how to fix it
- When creating API keys, give me the exact URLs and tell me exactly which buttons to click
- All in [Hebrew / English]
```

---

## Alternative: Quick Setup Prompt (for experienced users)

```
Help me set up https://github.com/hoodini/blitzai — it's a FastAPI + Next.js transcription tool.
I'm on Mac with Python 3.13 and Node 24.
I want to use Groq Whisper for transcription.
Give me all commands to run in order — clone, setup backend venv, install deps, create .env with Groq key, setup frontend, and run both servers.
```

---

## Alternative: Troubleshooting Prompt

```
I'm trying to run https://github.com/hoodini/blitzai and getting this error:

[PASTE YOUR ERROR HERE]

My setup:
- OS: [Mac / Windows / Linux]
- Python version: [run: python3 --version]
- Node version: [run: node --version]
- The command I ran: [paste the command]
- What I expected: [what should have happened]
- What happened: [what actually happened]

Help me fix this step by step.
```

---

## Alternative: YouTube Transcription Prompt

```
I have Blitz AI (https://github.com/hoodini/blitzai) running on localhost:3000.
How do I transcribe this YouTube video: [PASTE YOUTUBE URL]?
Which engine should I use for Hebrew content?
Walk me through using the URL page, checking the video info, starting transcription, and exporting the result as SRT subtitles.
```
