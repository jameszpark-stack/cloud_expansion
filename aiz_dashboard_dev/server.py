import os
import subprocess
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer

class DashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve files from the 'static' directory relative to server.py
        current_dir = os.path.dirname(os.path.abspath(__file__))
        static_dir = os.path.join(current_dir, 'static')
        super().__init__(*args, directory=static_dir, **kwargs)

    def do_GET(self):
        if self.path == '/api/data':
            try:
                # Run gsheets CLI to get data
                cmd = [
                    "/google/bin/releases/gemini-agents-gsheets/gsheets",
                    "read",
                    "1qjEp-uTPhsaP0ybtaBLuj24y5QO9yrqB381BLSMFCn8",
                    "'AIZ Execution Roadmap'!A1:Z",
                    "--json"
                ]
                
                # Run with check=True to raise exception on error
                result = subprocess.run(cmd, capture_output=True, text=True, check=True)
                raw_data = json.loads(result.stdout)
                
                # Transform raw data (list of rows) into structured list of dicts
                if not raw_data:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(b"[]")
                    return
                
                headers = raw_data[0]
                rows = raw_data[1:]
                
                structured_data = []
                for row in rows:
                    # Pad row if it has fewer elements than headers
                    if len(row) < len(headers):
                        row = row + [""] * (len(headers) - len(row))
                    # Or truncate if it has more
                    row = row[:len(headers)]
                    structured_data.append(dict(zip(headers, row)))
                
                response_bytes = json.dumps(structured_data).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Length', str(len(response_bytes)))
                self.end_headers()
                self.wfile.write(response_bytes)
                
            except subprocess.CalledProcessError as cpe:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                err_payload = {
                    "error": "gsheets CLI error",
                    "code": cpe.returncode,
                    "stdout": cpe.stdout,
                    "stderr": cpe.stderr
                }
                self.wfile.write(json.dumps(err_payload).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                err_msg = json.dumps({"error": str(e)}).encode('utf-8')
                self.wfile.write(err_msg)
        else:
            # Fallback to SimpleHTTPRequestHandler's default GET for static files
            super().do_GET()

def run(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, DashboardHandler)
    print(f"Starting server on port {port}...")
    
    # Write status file to the dashboard folder
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        status_file = os.path.join(current_dir, 'status.json')
        with open(status_file, 'w') as f:
            json.dump({"status": "running", "port": port, "pid": os.getpid()}, f)
    except Exception as ex:
        print(f"Failed to write status file: {ex}")
        
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("Stopping server...")

if __name__ == '__main__':
    import os
    import sys
    port = int(os.environ.get("ANTIGRAVITY_SIDECAR_WEB_PORT", 8888))
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run(port)
