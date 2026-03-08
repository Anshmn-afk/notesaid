import os
import json
import shutil
from tempfile import NamedTemporaryFile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

app = FastAPI(title="AI Meeting Notes Generator")

# Enable CORS so a frontend can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize OpenAI Client using the OPENAI_API_KEY environment variable
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    # Validate file extension
    if not file.filename.lower().endswith(('.mp3', '.wav', '.m4a')):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Supported formats: .mp3, .wav, .m4a"
        )

    # 1. Save the file temporarily
    try:
        extension = os.path.splitext(file.filename)[1]
        with NamedTemporaryFile(delete=False, suffix=extension) as temp_audio:
            shutil.copyfileobj(file.file, temp_audio)
            temp_filepath = temp_audio.name
            
        # 2. Send the file to OpenAI Whisper API for transcription
        with open(temp_filepath, "rb") as audio_file:
            transcript_response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="text"
            )
            
        # The response is directly the text string when response_format="text"
        transcript_text = transcript_response
        
        # Clean up temp file
        os.remove(temp_filepath)
        
        # 3. Send transcript to GPT for Summarization and Action Items
        prompt = f"""Summarize the following meeting transcript and extract clear action items.
        
Return output in JSON format:
{{
  "summary": "...",
  "action_items": ["...", "..."]
}}

Transcript:
{transcript_text}
"""
        
        completion = client.chat.completions.create(
            model="gpt-4o-mini", # using an efficient model suitable for standard meeting lengths
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": "You are a helpful assistant designed to output well-structured JSON."},
                {"role": "user", "content": prompt}
            ]
        )
        
        # 4. Parse GPT response
        gpt_output = json.loads(completion.choices[0].message.content)
        
        return {
            "transcript": transcript_text,
            "summary": gpt_output.get("summary", ""),
            "action_items": gpt_output.get("action_items", [])
        }
        
    except Exception as e:
        # Avoid leaving orphaned temp files in case of an error
        if 'temp_filepath' in locals() and os.path.exists(temp_filepath):
            os.remove(temp_filepath)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Optional: block to run the app directly
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
