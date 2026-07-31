#!/usr/bin/env python3
"""
LoopLearning API Response Decryptor
Decrypts encrypted API responses from api.staging.looplearning.com
Using extracted RSA private key + AES-CBC (CryptoJS compatible)
"""
import base64
import json
import sys
import requests
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_OAEP, AES
from Crypto.Hash import SHA256
from Crypto.Protocol.KDF import PBKDF1

# ===== EXTRACTED CONFIGURATION =====
RSA_PRIVATE_KEY_PATH = "/tmp/rsa_private_key.pem"
API_ENDPOINT = "https://api.staging.looplearning.com"
API_KEY = "gyCU+zA1eIroSi4liEo8uw=="

def load_private_key():
    """Load the RSA private key for decrypting encryptedSymmetricKey"""
    with open(RSA_PRIVATE_KEY_PATH, 'r') as f:
        key_pem = f.read()
    return RSA.import_key(key_pem)

def decrypt_symmetric_key(encrypted_symmetric_key_b64, rsa_key):
    """Decrypt symmetric key using RSA-OAEP SHA-256"""
    encrypted_bytes = base64.b64decode(encrypted_symmetric_key_b64)
    cipher = PKCS1_OAEP.new(rsa_key, hashAlgo=SHA256)
    symmetric_key = cipher.decrypt(encrypted_bytes)
    return symmetric_key

def evp_kdf(password, salt, key_size=32, iv_size=16, iterations=1, hash_algorithm='md5'):
    """CryptoJS-compatible EvpKDF (OpenSSL-compatible) - for sending encrypted data"""
    from Crypto.Hash import MD5
    target_key_size = key_size + iv_size
    derived_bytes = b""
    while len(derived_bytes) < target_key_size:
        hash_input = derived_bytes[-16:] + password + salt if derived_bytes else password + salt
        hasher = MD5.new(hash_input)
        derived_bytes += hasher.digest()
    return derived_bytes[:key_size], derived_bytes[key_size:key_size+iv_size]

def decrypt_aes_cryptojs(encrypted_data_str, symmetric_key):
    """
    Decrypt CryptoJS-format encrypted data (OpenSSL salted format)
    Format: 'Salted__' + 8-byte salt + ciphertext
    Uses AES-256-CBC with EvpKDF (MD5)
    """
    raw = base64.b64decode(encrypted_data_str)
    
    if raw[:8] == b'Salted__':
        salt = raw[8:16]
        ciphertext = raw[16:]
    else:
        salt = b""
        ciphertext = raw
    
    # Derive key and IV using OpenSSL's EVP_BytesToKey (MD5)
    key_iv = b""
    hash_input = b""
    while len(key_iv) < 48:
        md5_input = hash_input + symmetric_key + salt
        h = SHA256.new(md5_input).digest()  # Try SHA256 first
        key_iv += h
        hash_input = h
    
    key = key_iv[:32]
    iv = key_iv[32:48]
    
    cipher = AES.new(key, AES.MODE_CBC, iv)
    try:
        padded = cipher.decrypt(ciphertext)
        # Remove PKCS7 padding
        pad_len = padded[-1]
        plaintext = padded[:-pad_len]
        return plaintext.decode('utf-8')
    except Exception as e:
        return f"[DECRYPT_ERROR: {e}]"

def decrypt_aes_cbc_pkcs7(encrypted_data_str, symmetric_key):
    """
    Direct AES-256-CBC decryption.
    encrypted_data_str is base64 of IV + ciphertext
    """
    raw = base64.b64decode(encrypted_data_str)
    
    # Try different formats
    if raw[:8] == b'Salted__':
        # OpenSSL/CryptoJS format
        salt = raw[8:16]
        ct = raw[16:]
        # Use CryptoJS-compatible EvpKDF
        from Crypto.Hash import MD5
        key_material = symmetric_key + salt
        md5_hash = MD5.new(key_material).digest()
        # Need to properly implement EVP_BytesToKey
        key = md5_hash[:32] if len(md5_hash) >= 32 else md5_hash + MD5.new(md5_hash + symmetric_key + salt).digest()
        # Actually, let's do the proper derivation
        derived = b""
        prev = b""
        while len(derived) < 48:
            prev = MD5.new(prev + symmetric_key + salt).digest()
            derived += prev
        key = derived[:32]
        iv = derived[32:48]
        
        cipher = AES.new(key, AES.MODE_CBC, iv)
        try:
            padded = cipher.decrypt(ct)
            pad_len = padded[-1]
            plaintext = padded[:-pad_len]
            return json.loads(plaintext.decode('utf-8'))
        except Exception as e:
            return {"error": f"AES decryption failed: {e}", "raw_plaintext": plaintext if 'plaintext' in dir() else None}
    else:
        return {"error": "Unknown format - first bytes: " + raw[:16].hex()}

def decrypt_api_response(response_data, rsa_key):
    """Decrypt a full API response containing encryptedData and encryptedSymmetricKey"""
    if not isinstance(response_data, dict):
        return {"error": "Response is not a dict"}
    
    if 'encryptedSymmetricKey' not in response_data or 'encryptedData' not in response_data:
        return {"error": "Response missing encryption fields", "raw": response_data}
    
    try:
        # Step 1: Decrypt the AES symmetric key using RSA-OAEP
        print("[*] Decrypting symmetric key with RSA-OAEP SHA-256...")
        symmetric_key = decrypt_symmetric_key(
            response_data['encryptedSymmetricKey'], rsa_key
        )
        print(f"[+] Symmetric key ({len(symmetric_key)} bytes): {symmetric_key.hex()}")
        print(f"[+] Symmetric key (text): {symmetric_key.decode('utf-8', errors='replace')}")
        
        # Step 2: Decrypt the data with AES
        print("[*] Decrypting data with AES-CBC...")
        result = decrypt_aes_cbc_pkcs7(response_data['encryptedData'], symmetric_key)
        
        return result
    except Exception as e:
        return {"error": str(e)}

def test_live_api():
    """Test against the live API endpoint"""
    rsa_key = load_private_key()
    
    headers = {
        "Content-Type": "application/json",
        "authenticationkey": API_KEY,
        "token": "",
        "id": ""
    }
    
    # Try hitting the login endpoint without auth to get an encrypted error response
    print(f"[*] Hitting {API_ENDPOINT}/Prod/v2/login...")
    resp = requests.post(
        f"{API_ENDPOINT}/Prod/v2/login",
        json={},
        headers=headers,
        timeout=15
    )
    
    print(f"[*] Status: {resp.status_code}")
    print(f"[*] Headers: {dict(resp.headers)}")
    
    try:
        data = resp.json()
        print(f"[*] Response keys: {list(data.keys()) if isinstance(data, dict) else type(data)}")
        print(f"[*] Response preview: {json.dumps(data, indent=2)[:500]}")
        
        if isinstance(data, dict) and 'encryptedSymmetricKey' in data:
            print("\n[*] Encrypted response detected! Decrypting...")
            result = decrypt_api_response(data, rsa_key)
            print(f"\n[+] Decrypted result:\n{json.dumps(result, indent=2)}")
        else:
            print("[*] Response not encrypted or unexpected format")
    except json.JSONDecodeError as e:
        print(f"[!] Response is not JSON: {resp.text[:200]}")

def test_manual_decrypt():
    """Test decryption with a known encrypted response"""
    rsa_key = load_private_key()
    
    # Example from earlier curl output - paste encrypted response here
    test_data = {
        "encryptedSymmetricKey": "PLACEHOLDER",
        "encryptedData": "U2FsdGVkX1_PLACEHOLDER"
    }
    
    if test_data["encryptedSymmetricKey"] == "PLACEHOLDER":
        print("[*] No manual test data. Run --live to test against live API.")
        return
    
    result = decrypt_api_response(test_data, rsa_key)
    print(f"Decrypted: {json.dumps(result, indent=2)}")


if __name__ == "__main__":
    if "--live" in sys.argv:
        test_live_api()
    else:
        test_manual_decrypt()

