#!/bin/bash
TARGET="podar.org"
WORDLIST="/usr/share/wordlists/seclists/Discovery/DNS/subdomains-top1million-5000.txt"
if [ ! -f "$WORDLIST" ]; then
    WORDLIST="/usr/share/wordlists/dnsmap.txt"
fi
if [ ! -f "$WORDLIST" ]; then
    echo "Downloading subdomain wordlist..."
    curl -s -o /tmp/subdomains.txt https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1million-5000.txt
    WORDLIST="/tmp/subdomains.txt"
fi
echo "=== Subdomain Enum on $TARGET ==="
for sub in $(cat $WORDLIST); do
    host="$sub.$TARGET"
    result=$(getent hosts $host 2>/dev/null)
    if [ ! -z "$result" ]; then
        echo "[+] FOUND: $host -> $result"
    fi
done
