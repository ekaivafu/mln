import http.server
import socketserver
import os
import urllib.parse
import json
import random
import time
import hmac
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(DIRECTORY, ".env")

# Simple .env loader
def load_env():
    if os.path.exists(ENV_FILE):
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip().strip("'\"")

load_env()

OTP_SECRET = os.environ.get("OTP_SECRET", "mln-alliance-mediacrew-secure-key-2026")

def create_hash_token(email, otp, expires_at):
    data = f"{email.lower()}:{otp}:{expires_at}".encode('utf-8')
    sig = hmac.new(OTP_SECRET.encode('utf-8'), data, hashlib.sha256).hexdigest()
    return f"{expires_at}:{sig}"

def verify_hash_token(email, otp, hash_token):
    try:
        expires_at_str, sig = hash_token.split(":")
        expires_at = int(expires_at_str)
        if time.time() * 1000 > expires_at:
            return False, "Verification code has expired."
        data = f"{email.lower()}:{otp}:{expires_at_str}".encode('utf-8')
        expected_sig = hmac.new(OTP_SECRET.encode('utf-8'), data, hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected_sig):
            return True, "Verified"
        return False, "Incorrect verification code."
    except Exception:
        return False, "Invalid token."

def is_dummy_test_email(email):
    clean = (email or "").strip().lower()
    return clean in ["test@gmail.com", "example@gmail.com", "demo@gmail.com", "fake@gmail.com"] or clean.endswith("@example.com") or clean.endswith("@test.com")

def send_real_email_smtp(email, otp):
    if is_dummy_test_email(email):
        return True, "Simulated dispatch for test email (real SMTP skipped to prevent mailer-daemon bounce)."

    user = (os.environ.get("GMAIL_USER") or os.environ.get("SMTP_USER") or "").strip()
    pwd = (os.environ.get("GMAIL_APP_PASSWORD") or os.environ.get("SMTP_PASS") or os.environ.get("SMTP_PASSWORD") or "").replace(" ", "").strip()
    host = (os.environ.get("SMTP_HOST") or "smtp.gmail.com").strip()
    port = int(os.environ.get("SMTP_PORT") or 465)

    if not user or not pwd:
        return False, "SMTP credentials not configured."
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"{otp} is your MLN Alliance MediaCrew Security Code"
        msg["From"] = f"MLN Alliance MediaCrew <{user}>"
        msg["To"] = email

        html = f"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background-color:#0b0807; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#fdf7f2;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b0807; padding:40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width:500px; background:#18120f; border:1px solid rgba(255,211,174,0.25); border-radius:18px; padding:32px 28px; text-align:center;">
                  <tr>
                    <td>
                      <div style="font-size:20px; font-weight:800; color:#ef7657; letter-spacing:-0.02em;">MLN ALLIANCE MEDIACREW</div>
                      <div style="font-size:12px; color:#a89c92; text-transform:uppercase; letter-spacing:0.1em; margin-top:4px;">Identity Verification</div>
                      <p style="color:#e0d6ce; font-size:15px; margin:20px 0 10px;">Your 6-digit security code is:</p>
                      <div style="display:inline-block; background:rgba(0, 242, 161, 0.08); border:1.5px dashed #00f2a1; border-radius:14px; padding:16px 36px; margin:15px 0;">
                        <span style="font-family:monospace; font-size:36px; font-weight:900; letter-spacing:8px; color:#00f2a1;">{otp}</span>
                      </div>
                      <p style="color:#8a7e75; font-size:13px; margin-top:20px;">⏱ Code expires in <strong>5 minutes</strong>. If you did not request this, you can safely ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """
        msg.attach(MIMEText(html, "html"))
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=10) as server:
                server.login(user, pwd)
                server.sendmail(user, [email], msg.as_string())
        else:
            with smtplib.SMTP(host, port, timeout=10) as server:
                server.starttls()
                server.login(user, pwd)
                server.sendmail(user, [email], msg.as_string())
        return True, "Sent via SMTP"
    except Exception as e:
        return False, str(e)


REWRITES = {
    "/": "/index.html",
    "/index": "/index.html",
    "/index.html": "/index.html",
    "/id": "/id.html",
    "/id.html": "/id.html",
    "/register": "/register.html",
    "/register.html": "/register.html",
    "/functions": "/functions.html",
    "/functions.html": "/functions.html",
    "/thankyou": "/thankyou.html",
    "/thankyou.html": "/thankyou.html",
    "/records": "/records.html",
    "/records.html": "/records.html",
    "/records-dashboard": "/records.html",
    "/records-dashboard/": "/records.html",
    "/records-dashboard/records.html": "/records.html",
    "/MLN-Alliance-MediaCrew": "/index.html",
    "/MLN-Alliance-MediaCrew/": "/index.html",
    "/MLN-Alliance-MediaCrew/index": "/index.html",
    "/MLN-Alliance-MediaCrew/index.html": "/index.html",
    "/MLN-Alliance-MediaCrew/register": "/register.html",
    "/MLN-Alliance-MediaCrew/register.html": "/register.html",
    "/MLN-Alliance-MediaCrew/id": "/id.html",
    "/MLN-Alliance-MediaCrew/id.html": "/id.html",
    "/MLN-Alliance-MediaCrew/functions": "/functions.html",
    "/MLN-Alliance-MediaCrew/functions.html": "/functions.html",
    "/MLN-Alliance-MediaCrew/records": "/records.html",
    "/MLN-Alliance-MediaCrew/records.html": "/records.html",
    "/MLN-Alliance-MediaCrew/thankyou": "/thankyou.html",
    "/MLN-Alliance-MediaCrew/thankyou.html": "/thankyou.html"
}

class VercelLikeHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in REWRITES:
            target = REWRITES[path]
            query = f"?{parsed.query}" if parsed.query else ""
            self.path = target + query
        elif path.startswith("/MLN-Alliance-MediaCrew/"):
            stripped = path.replace("/MLN-Alliance-MediaCrew", "")
            query = f"?{parsed.query}" if parsed.query else ""
            self.path = stripped + query

        return super().do_GET()

    def do_POST(self):
        load_env()
        parsed = urllib.parse.urlparse(self.path)

        if parsed.path == "/api/send-otp":
            length = int(self.headers.get('content-length', 0))
            body = self.rfile.read(length) if length > 0 else b"{}"
            try:
                data = json.loads(body.decode('utf-8'))
            except Exception:
                data = {}
            email = data.get("email", "").strip().lower()
            if not email or "@" not in email:
                self._send_json(400, {"success": False, "error": "Valid email required."})
                return

            otp = str(random.randint(100000, 999999))
            expires_at = int(time.time() * 1000) + (5 * 60 * 1000)
            hash_token = create_hash_token(email, otp, expires_at)

            # Try real dispatch via SMTP if configured
            sent = False
            provider_msg = ""
            if (os.environ.get("GMAIL_USER") and os.environ.get("GMAIL_APP_PASSWORD")) or (os.environ.get("SMTP_USER") and (os.environ.get("SMTP_PASS") or os.environ.get("SMTP_PASSWORD"))):
                sent, provider_msg = send_real_email_smtp(email, otp)

            if sent:
                # Real email dispatched! Do NOT expose otp in response
                response_data = {
                    "success": True,
                    "mode": "email_sent",
                    "hashToken": hash_token,
                    "message": f"Verification code sent to {email}. Check your inbox."
                }
            else:
                # Demo / Fallback mode
                response_data = {
                    "success": True,
                    "mode": "demo_fallback" if provider_msg else "demo",
                    "otp": otp,
                    "hashToken": hash_token,
                    "message": provider_msg if provider_msg else f"Demo verification OTP for {email}: {otp}"
                }

            self._send_json(200, response_data)
            return

        elif parsed.path == "/api/verify-otp":
            length = int(self.headers.get('content-length', 0))
            body = self.rfile.read(length) if length > 0 else b"{}"
            try:
                data = json.loads(body.decode('utf-8'))
            except Exception:
                data = {}
            email = data.get("email", "").strip().lower()
            otp = str(data.get("otp", "")).strip()
            hash_token = data.get("hashToken", "")

            valid, reason = verify_hash_token(email, otp, hash_token)
            if valid:
                self._send_json(200, {
                    "success": True,
                    "verified": True,
                    "email": email,
                    "message": "Email identity successfully verified."
                })
            else:
                self._send_json(400, {
                    "success": False,
                    "error": reason
                })
            return

        return super().do_POST()

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

if __name__ == "__main__":
    import socket
    Handler = VercelLikeHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    with http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Dev server live at http://localhost:{PORT}")
        print(f"Network access: http://{local_ip}:{PORT}")
        httpd.serve_forever()
