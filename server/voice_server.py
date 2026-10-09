#!/usr/bin/env python3
"""
Lightweight Local Voice Transcription Microservice
Provides reliable Arabic speech transcription for Electron and desktop usage.
Listens on http://127.0.0.1:5175/transcribe
"""
import io
import json
import subprocess
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
import speech_recognition as sr

PORT = 5175
recognizer = sr.Recognizer()

class VoiceRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/status':
            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'status': 'ready', 'service': 'voice_transcribe'}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/transcribe':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                audio_bytes = self.rfile.read(content_length)

                if not audio_bytes:
                    self.send_response(400)
                    self._send_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': 'No audio data received'}).encode('utf-8'))
                    return

                # Convert incoming audio (WebM/OGG/WAV) to standard 16kHz mono PCM WAV via ffmpeg
                ffmpeg_proc = subprocess.Popen(
                    ['ffmpeg', '-i', 'pipe:0', '-f', 'wav', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', 'pipe:1'],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL
                )
                wav_data, _ = ffmpeg_proc.communicate(input=audio_bytes)

                if not wav_data:
                    raise Exception('Failed to convert audio via ffmpeg')

                # Transcribe with SpeechRecognition (Google Arabic engine)
                transcribed_text = ''
                engine_used = 'google_ar'

                try:
                    with sr.AudioFile(io.BytesIO(wav_data)) as source:
                        audio = recognizer.record(source)
                    transcribed_text = recognizer.recognize_google(audio, language='ar-EG')
                except sr.UnknownValueError:
                    transcribed_text = ''
                except Exception as g_err:
                    # Fallback to local Whisper if available
                    try:
                        import whisper
                        model = whisper.load_model('tiny')
                        # Save wav to temp and transcribe
                        import tempfile, os
                        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tf:
                            tf.write(wav_data)
                            tf_path = tf.name
                        res = model.transcribe(tf_path, language='ar')
                        transcribed_text = res.get('text', '').strip()
                        engine_used = 'whisper_tiny'
                        if os.path.exists(tf_path):
                            os.remove(tf_path)
                    except Exception as w_err:
                        raise Exception(f'Google failed ({g_err}) and Whisper failed ({w_err})')

                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                response = {
                    'success': True,
                    'text': transcribed_text,
                    'engine': engine_used
                }
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run_server():
    server_address = ('127.0.0.1', PORT)
    httpd = HTTPServer(server_address, VoiceRequestHandler)
    print(f'🎤 [Voice Server] Running on http://127.0.0.1:{PORT}')
    sys.stdout.flush()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    run_server()
