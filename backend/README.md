# AI Meeting Notes Generator Backend

This is a clean, minimal FastAPI backend that accepts an audio recording of a meeting, transcribes it using OpenAI's Whisper API, and generates a summary and action items using a GPT model.

## Prerequisites
- Python installed
- An OpenAI API Key

## How to Run

1. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Set your OpenAI API Key:**
   Make sure you export your API key so the backend can pick it up.
   - **Windows (Command Prompt):**
     ```cmd
     set OPENAI_API_KEY=your-api-key-here
     ```
   - **Windows (PowerShell):**
     ```powershell
     $env:OPENAI_API_KEY="your-api-key-here"
     ```

3. **Start the API Server:**
   ```bash
   uvicorn main:app --reload
   ```
   The API will be running at `http://localhost:8000`.

## Testing the Endpoint (cURL)

You can test the endpoint directly using `curl`. Make sure you have an audio file named `meeting.mp3` in the current directory and your server is running.

**Windows Command Prompt:**
```cmd
curl -X POST "http://localhost:8000/upload-audio" ^
     -H "accept: application/json" ^
     -H "Content-Type: multipart/form-data" ^
     -F "file=@meeting.mp3"
```

**Git Bash / Mac / Linux:**
```bash
curl -X POST "http://localhost:8000/upload-audio" \
     -H "accept: application/json" \
     -H "Content-Type: multipart/form-data" \
     -F "file=@meeting.mp3"
```

## Integrating with the Frontend
Because we enabled CORS, your friend can call `http://localhost:8000/upload-audio` directly from their frontend application using `fetch` or `axios` by sending an audio `File` as `multipart/form-data`.
