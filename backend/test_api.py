import requests
import json
import wave
import struct

# Create a small dummy WAV file
def create_dummy_wav(filename):
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(44100)
        # Write a split second of silence
        for _ in range(44100):
            value = 0
            data = struct.pack('<h', value)
            wav_file.writeframesraw(data)

if __name__ == '__main__':
    filename = 'test_audio.wav'
    print(f"Creating {filename}...")
    create_dummy_wav(filename)
    
    url = 'http://localhost:8000/upload-audio'
    print(f"Sending POST request to {url}...")
    
    with open(filename, 'rb') as f:
        files = {'file': (filename, f, 'audio/wav')}
        try:
            response = requests.post(url, files=files)
            print(f"Status Code: {response.status_code}")
            try:
                print(json.dumps(response.json(), indent=2))
            except json.JSONDecodeError:
                print("Response text:", response.text)
        except Exception as e:
            print(f"Error connecting to server: {e}")
