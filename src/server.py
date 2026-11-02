import os
import sys
import json
import sqlite3
import re
import shutil
import subprocess
import threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

DB_PATH = os.path.expanduser("~/.gemini/antigravity-cli/conversation_summaries.db")
BRAIN_DIR = os.path.expanduser("~/.gemini/antigravity-cli/brain")
AGY_PATH = shutil.which("agy") or os.path.expanduser("~/.local/bin/agy")
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui")
UUID_PATTERN = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

def get_conversations(limit=40):
    if not os.path.exists(DB_PATH):
        return []
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
        cursor = conn.cursor()
        query = """
        SELECT conversation_id, preview, last_modified_time, step_count
        FROM conversation_summaries
        WHERE preview IS NOT NULL AND preview != ''
        ORDER BY last_modified_time DESC
        LIMIT ?
        """
        rows = cursor.execute(query, (limit,)).fetchall()
        conn.close()
        return [{"id": r[0], "title": r[1], "time": r[2], "steps": r[3]} for r in rows]
    except Exception:
        return []

def get_transcript(conversation_id):
    if not UUID_PATTERN.match(conversation_id):
        return None
    transcript_path = os.path.join(BRAIN_DIR, conversation_id, ".system_generated", "logs", "transcript.jsonl")
    if not os.path.exists(transcript_path):
        return []
    messages = []
    try:
        with open(transcript_path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except Exception:
                    continue
                step_type = obj.get("type")
                if step_type == "USER_INPUT":
                    content = obj.get("content", "")
                    content = re.sub(r"^<USER_REQUEST>\s*", "", content)
                    content = re.sub(r"\s*</USER_REQUEST>$", "", content)
                    messages.append({"role": "user", "content": content})
                elif step_type == "PLANNER_RESPONSE":
                    content = obj.get("content", "")
                    tool_calls = obj.get("tool_calls", [])
                    if content or tool_calls:
                        messages.append({
                            "role": "assistant",
                            "content": content,
                            "tools": [{"name": t.get("name"), "summary": t.get("args", {}).get("toolSummary", "")} for t in tool_calls]
                        })
        return messages
    except Exception:
        return []

class AppHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors()
            self.end_headers()
            data = {
                "user": "axk",
                "plan": "Free",
                "model": "Gemini 3.8 Flash (Medium)",
                "models": [
                    "Gemini 3.8 Flash (Medium)",
                    "Gemini 3.5 Pro",
                    "Gemini 3.8 Flash-Lite",
                    "Claude 3.7 Sonnet (Simulated Style)"
                ],
                "backend": AGY_PATH,
                "cwd": os.getcwd()
            }
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        if path == "/api/conversations":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors()
            self.end_headers()
            conversations = get_conversations()
            self.wfile.write(json.dumps(conversations).encode("utf-8"))
            return

        if path.startswith("/api/conversation/"):
            conv_id = path[len("/api/conversation/"):]
            if not UUID_PATTERN.match(conv_id):
                self.send_response(400)
                self.end_headers()
                return
            messages = get_transcript(conv_id)
            if messages is None:
                self.send_response(404)
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors()
            self.end_headers()
            self.wfile.write(json.dumps(messages).encode("utf-8"))
            return

        clean_path = path.lstrip("/")
        if not clean_path or clean_path == "index.html":
            file_name = "index.html"
            content_type = "text/html; charset=utf-8"
        elif clean_path == "style.css":
            file_name = "style.css"
            content_type = "text/css; charset=utf-8"
        elif clean_path == "app.js":
            file_name = "app.js"
            content_type = "application/javascript; charset=utf-8"
        elif clean_path == "privacy":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Privacy Policy: Local operations only. Data is stored on your device.")
            return
        elif clean_path == "terms":
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Terms of Service: Distributed under the MIT license.")
            return
        else:
            self.send_response(404)
            self.end_headers()
            return

        full_path = os.path.join(STATIC_DIR, file_name)
        if not os.path.exists(full_path):
            self.send_response(404)
            self.end_headers()
            return

        with open(full_path, "rb") as f:
            content = f.read()

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_cors()
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/chat":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 65536:
            self.send_response(413)
            self.end_headers()
            return

        body = self.rfile.read(content_length).decode("utf-8", errors="ignore")
        try:
            payload = json.loads(body)
        except Exception:
            self.send_response(400)
            self.end_headers()
            return

        prompt = payload.get("prompt", "").strip()
        conv_id = payload.get("conversation_id", "").strip()
        if not prompt:
            self.send_response(400)
            self.end_headers()
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_cors()
        self.end_headers()

        cmd = [AGY_PATH, "-p", prompt, "--dangerously-skip-permissions"]
        if conv_id and UUID_PATTERN.match(conv_id):
            cmd.extend(["--conversation", conv_id])

        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            for line in proc.stdout:
                if line:
                    event = f"data: {json.dumps({'text': line})}\n\n"
                    self.wfile.write(event.encode("utf-8"))
                    self.wfile.flush()
            proc.wait()
            self.wfile.write(b"data: [DONE]\n\n")
            self.wfile.flush()
        except Exception as e:
            err_event = f"data: {json.dumps({'error': str(e)})}\n\n"
            self.wfile.write(err_event.encode("utf-8"))
            self.wfile.flush()

def start_server(port=0):
    server = ThreadingHTTPServer(("127.0.0.1", port), AppHandler)
    actual_port = server.server_address[1]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, actual_port
