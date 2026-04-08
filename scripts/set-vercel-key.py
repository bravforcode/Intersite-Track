import subprocess
import re

# Read private key from .env
with open('.env') as f:
    content = f.read()

match = re.search(r'FIREBASE_PRIVATE_KEY="(-----BEGIN PRIVATE KEY-----.*?-----END PRIVATE KEY-----\\n)"', content, re.DOTALL)
if not match:
    print("ERROR: Could not find FIREBASE_PRIVATE_KEY in .env")
    exit(1)

raw = match.group(1)
# Convert \n to actual newlines
key = raw.replace('\\n', '\n')
print(f"Key starts: {key[:40]}")
print(f"Key ends: {key[-30:]}")
print(f"Has actual newlines: {chr(10) in key}")

# Write key to temp file for vercel
with open('_tmp_key.txt', 'w', newline='\n') as f:
    f.write(key)

print("Key written to _tmp_key.txt")
print("Now run: cat _tmp_key.txt | vercel env add FIREBASE_PRIVATE_KEY production")
