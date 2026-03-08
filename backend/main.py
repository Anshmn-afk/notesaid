import os
import json
import shutil
import traceback
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Initialize our FastAPI application
app = FastAPI(
    title="AI Meeting Notes Generator",
    description="A simple API to transcribe audio and generate meeting notes using Groq.",
    version="1.0.0"
)

# Enable CORS so that our React frontend can communicate with this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, change this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

# Initialize the Groq client securely from our environment variables
groq_api_key = os.environ.get("GROQ_API_KEY")
if not groq_api_key:
    # Just a helpful warning if the key isn't set up yet
    print("Warning: GROQ_API_KEY is missing from environment variables or .env file.")

client = Groq(api_key=groq_api_key)

@app.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    """
    Accepts an audio file upload, transcribes it using Groq's Whisper model,
    and generates a summary with actionable items using Llama 3.
    """
    
    # Check if the uploaded file is a supported audio format
    SUPPORTED_FORMATS = ('.mp3', '.wav', '.m4a')
    if not file.filename.lower().endswith(SUPPORTED_FORMATS):
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Please upload one of: {', '.join(SUPPORTED_FORMATS)}"
        )

    temp_filepath = None
    
    try:
        # Step 1: Save the incoming audio file to a temporary location
        # We preserve the original extension so the transcription service recognizes it
        extension = os.path.splitext(file.filename)[1]
        with NamedTemporaryFile(delete=False, suffix=extension) as temp_audio:
            shutil.copyfileobj(file.file, temp_audio)
            temp_filepath = temp_audio.name
            
        # Step 2: Hit the Groq Whisper API for lightning-fast transcription
        with open(temp_filepath, "rb") as audio_file:
            transcript_response = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=audio_file,
                response_format="text"
            )
            
        transcript_text = transcript_response
        
        # We don't need the temporary file anymore, clean it up!
        os.remove(temp_filepath)
        temp_filepath = None
        
        # Step 3: Ask Groq's powerful Llama model to summarize and extract action items
        prompt = f"""Summarize the following meeting transcript and extract clear action items.
        
Return the output strictly in the following JSON format:
{{
  "summary": "...",
  "action_items": ["...", "..."]
}}

Here is the transcript:
{transcript_text}
"""
        
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system", 
                    "content": "You are a helpful assistant designed to output well-structured JSON."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ]
        )
        
        # Step 4: Parse the AI's response and return it to the frontend!
        gpt_output = json.loads(completion.choices[0].message.content)
        
        return {
            "transcript": transcript_text,
            "summary": gpt_output.get("summary", "No summary could be generated."),
            "action_items": gpt_output.get("action_items", [])
        }
        
    except Exception as e:
        # If anything goes wrong, we want to know exactly what happened
        error_details = traceback.format_exc()
        
        # Safety net: clean up the temp file if the script crashed midway
        if temp_filepath and os.path.exists(temp_filepath):
            try:
                os.remove(temp_filepath)
            except Exception:
                pass
                
        # Send a 500 Internal Server error back to the frontend with the explicit error trace
        raise HTTPException(status_code=500, detail=error_details)

if __name__ == "__main__":
    import uvicorn
    # This block allows you to run the script directly with: python main.py
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
