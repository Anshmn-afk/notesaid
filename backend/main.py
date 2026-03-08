import os
import json
import shutil
import traceback
from tempfile import NamedTemporaryFile

from pydub import AudioSegment

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
def upload_audio(file: UploadFile = File(...)):
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

    # Track files to cleanup later
    temp_files = []
    
    try:
        # Step 1: Save the incoming audio file to a temporary location
        extension = os.path.splitext(file.filename)[1]
        
        # Save the primary uploaded file
        main_temp = NamedTemporaryFile(delete=False, suffix=extension)
        shutil.copyfileobj(file.file, main_temp)
        main_temp.close()  # Close so pydub can read it
        temp_files.append(main_temp.name)
        
        # Step 2: Check file size. Groq limit is 25MB. We'll chunk at ~24MB.
        # However, file sizes expand. It's safer to just chunk it into 10-minute sections.
        # But to be efficient, let's only chunk if the original file is >22MB.
        file_size_mb = os.path.getsize(main_temp.name) / (1024 * 1024)
        
        transcript_text = ""
        smart_transcript = []
        
        print(f"Uploaded audio size: {file_size_mb:.2f} MB")
        
        def process_segments(segments, offset_seconds, current_idx):
            """Helper to extract native whisper segments into UI array"""
            for segment in segments:
                # Handle varying response object types safely
                seg_dict = segment if isinstance(segment, dict) else (segment.model_dump() if hasattr(segment, 'model_dump') else vars(segment))
                start_time_sec = seg_dict.get('start', 0) + offset_seconds
                
                minutes = int(start_time_sec // 60)
                seconds = int(start_time_sec % 60)
                time_str = f"{minutes:02d}:{seconds:02d}"
                
                # Arbitrarily alternate speakers 1-3
                speaker_num = (current_idx % 3) + 1
                current_idx += 1
                
                smart_transcript.append({
                    "speaker": f"Speaker {speaker_num}",
                    "role": f"role-s{speaker_num}",
                    "time": time_str,
                    "text": seg_dict.get('text', '').strip()
                })
            return current_idx

        global_segment_idx = 0

        if file_size_mb > 22.0:
            print("File is large. Chunking via pydub...")
            # Load the audio file
            audio = AudioSegment.from_file(main_temp.name)
            
            # 10 minutes in milliseconds
            ten_minutes = 10 * 60 * 1000 
            
            for i in range(0, len(audio), ten_minutes):
                chunk = audio[i:i+ten_minutes]
                chunk_temp = NamedTemporaryFile(delete=False, suffix=".mp3")
                
                # Export chunk as mp3 to save space
                chunk.export(chunk_temp.name, format="mp3")
                chunk_temp.close()
                temp_files.append(chunk_temp.name)
                
                print(f"Transcribing chunk {len(temp_files)-1}...")
                with open(chunk_temp.name, "rb") as chunk_file:
                    chunk_response = client.audio.transcriptions.create(
                        model="whisper-large-v3",
                        file=chunk_file,
                        response_format="verbose_json"
                    )
                    transcript_text += getattr(chunk_response, 'text', '') + " "
                    
                    offset_seconds = i / 1000.0
                    segments = getattr(chunk_response, 'segments', [])
                    global_segment_idx = process_segments(segments, offset_seconds, global_segment_idx)
                    
        else:
            # File is small enough, process directly
            print("File is under 22MB. Transcribing directly...")
            with open(main_temp.name, "rb") as audio_file:
                transcript_response = client.audio.transcriptions.create(
                    model="whisper-large-v3",
                    file=audio_file,
                    response_format="verbose_json"
                )
                transcript_text = getattr(transcript_response, 'text', '')
                segments = getattr(transcript_response, 'segments', [])
                process_segments(segments, 0.0, global_segment_idx)
                
        # Group segments into 5-minute chunks for the UI
        topic_groups = []
        for seg in smart_transcript:
            parts = seg["time"].split(":")
            seg_sec = int(parts[0]) * 60 + int(parts[1])
            group_idx = seg_sec // 300 # 5 minutes
            
            while len(topic_groups) <= group_idx:
                start_m = len(topic_groups) * 5
                end_m = start_m + 5
                topic_groups.append({
                    "timeRange": f"{start_m:02d}:00 - {end_m:02d}:00",
                    "title": f"Part {len(topic_groups) + 1}",
                    "summary": "Meeting discussion.",
                    "segments": []
                })
            topic_groups[group_idx]["segments"].append(seg)
                
        # Cleanup temporary files
        for tmp in temp_files:
            try:
                os.remove(tmp)
            except Exception:
                pass
        temp_files.clear()
        
        # Clean up empty topic groups
        topic_groups = [g for g in topic_groups if len(g["segments"]) > 0]
        
        # Step 3: Ask Groq's powerful Llama model to format the data for the new UI
        prompt = f"""Process the following meeting transcription text. Extract the information and format it into a specific array.

1. `dashboardCards`: You must return exactly 4 cards:
- id: "card-summary", type: "summary", title: "Executive Summary", icon: "zap" (content is a short paragraph string)
- id: "card-action", type: "action", title: "Action Items", icon: "check-circle" (content is HTML: string of `<div class="card-list-item">...</div>` items)
- id: "card-decision", type: "decision", title: "Key Decisions", icon: "git-commit" (content is HTML: string of `<div class="card-list-item">...</div>` items)
- id: "card-important", type: "important", title: "Session Highlights", icon: "clock" (content is HTML: string of `<div class="card-list-item">...</div>` items)

2. `partSummaries`: The meeting has been split into {len(topic_groups)} parts (approx 5 minutes each). Provide a short title and a 1-sentence summary for each part consecutively.

Return exactly this JSON format:
{{
  "dashboardCards": [
    {{ "id": "card-summary", "type": "summary", "title": "Executive Summary", "icon": "zap", "content": "..." }},
    {{ "id": "card-action", "type": "action", "title": "Action Items", "icon": "check-circle", "content": "..." }},
    {{ "id": "card-decision", "type": "decision", "title": "Key Decisions", "icon": "git-commit", "content": "..." }},
    {{ "id": "card-important", "type": "important", "title": "Session Highlights", "icon": "clock", "content": "..." }}
  ],
  "partSummaries": [
    {{ "title": "...", "summary": "..." }}
  ]
}}

Raw Transcript:
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
        
        # Merge LLaMA summaries into topic groups
        part_summaries = gpt_output.get("partSummaries", [])
        for i, group in enumerate(topic_groups):
            if i < len(part_summaries):
                group["title"] = part_summaries[i].get("title", group["title"])
                group["summary"] = part_summaries[i].get("summary", group["summary"])
                
        return {
            "dashboardCards": gpt_output.get("dashboardCards", []),
            "smartTranscript": topic_groups
        }
        
    except Exception as e:
        # If anything goes wrong, we want to know exactly what happened
        error_details = traceback.format_exc()
        
        # Safety net: clean up ALL temp files if the script crashed midway
        for tmp in temp_files:
            if os.path.exists(tmp):
                try:
                    os.remove(tmp)
                except Exception:
                    pass
                
        # Write the detailed error to a file because stdout is buffered/lost
        with open("error_trace.log", "w") as err_file:
            err_file.write(error_details)
        
        # Send a 500 Internal Server error back to the frontend with the explicit error trace
        raise HTTPException(status_code=500, detail=error_details)

if __name__ == "__main__":
    import uvicorn
    # This block allows you to run the script directly with: python main.py
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
