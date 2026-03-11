# NotesAid: AI Meeting Notes Generator

NotesAid is a lightning-fast, full-stack application that transforms raw meeting audio into structured, categorized insights and interactive transcripts. It uses **Groq's** hyper-fast inference engine (Whisper & LLaMA 3) to process audio almost instantly.

## Features

- **Blazing Fast Transcription**: Uses Groq's `whisper-large-v3` to transcribe speech in seconds.
- **Intelligent Summarization**: Uses Groq's `llama-3.3-70b-versatile` to extract Executive Summaries, Action Items, Key Decisions, and Highlights into an interactive dashboard.
- **Large Audio Chunking Pipeline**: Bypasses traditional API file size limits. The backend automatically detects files >22MB, chunks them into 10-minute segments using `pydub` + `ffmpeg`, transcribes them sequentially, and stitches them back together.
- **Categorized Transcript Accordion**: Replaces the "wall of text" problem. The backend chunks transcripts into 5-minute logical blocks, prompting LLaMA to generate short Topic Cards. The frontend renders these as interactive, lazy-loading accordions (rendering massive hour-long transcripts gracefully without dropping browser frames).
- **Glassmorphic UI**: Beautiful frontend built with vanilla HTML/CSS and GSAP animations, featuring dynamic glowing dropzones and responsive micro-interactions.

---

## Architecture & Technology Stack

- **Frontend**: Vanilla HTML / CSS / JS, GSAP (Animations), Lucide (Icons)
- **Backend**: Python, FastAPI, Uvicorn, Pydub
- **AI Models**: Groq Cloud API (`whisper-large-v3`, `llama-3.3-70b-versatile`)
- **System Dependencies**: FFmpeg (Required for Python audio manipulation)

---

## Local Setup & Installation

### 1. Prerequisites
- Python 3.9+ installed
- Node.js (Optional, just for running the frontend dev server)
- **FFmpeg must be installed and added to your system PATH.** (If on Windows without admin rights, you can place the portable `ffmpeg.exe` and `ffprobe.exe` directly inside the `backend/` folder).
- A [Groq API Key](https://console.groq.com/keys)

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the `backend/` folder and add your key:
   ```env
   GROQ_API_KEY=gsk_your_api_key_here
   ```
4. Start the FastAPI server:
   ```bash
   python main.py
   # Or using uvicorn directly: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *The backend will run on `http://localhost:8000`*

### 3. Frontend Setup
The frontend is completely static and can be served using any basic HTTP server.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Run a local python server:
   ```bash
   python -m http.server 3000
   ```
   *The frontend will run on `http://localhost:3000`*

---

## How It Works Under The Hood

### Handling 40+ Minute Meetings (The Chunking Pipeline)
When a user uploads a massive audio file (e.g. 100MB+ / 1 hour long):
1. **Pydub Splitter**: FastAPI receives the file and checks its size. Because Groq Whisper has a hard 25MB limit, `pydub` intercepts large files and exports them into 10-minute `mp3` chunks via `ffmpeg`.
2. **Native Whisper Timestamps**: The chunks are sent to Groq with `response_format="verbose_json"`, forcing Whisper to return precise, sub-second sentence segments rather than just a wall of text. The backend stitches these segments back together using global time-offsets.
3. **LLaMA Bypass & Categorization**: If we asked LLaMA to spit back the transcript, it would crash due to hard output-token limits (8k tokens). Instead, the backend groups the raw Whisper segments into 5-minute logical blocks and *only* requests summaries from LLaMA.
4. **Lazy Rendering**: The frontend receives the array of Topics. It renders the LLaMA title/summary immediately, but hides the raw Whisper text inside an accordion. When clicked, it renders 5 lines at a time via a "View More" pagination system, keeping the DOM lightning fast.
