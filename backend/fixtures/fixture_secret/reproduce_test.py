import sys
import re
from config import AWS_CONFIG

def run_reproduction():
    print("--- [ProofForge Reproduction Test: Hardcoded Credential Extraction] ---")
    key_id = AWS_CONFIG.get("access_key_id", "")
    secret = AWS_CONFIG.get("secret_access_key", "")
    
    print(f"Inspecting Configuration Module...")
    print(f"Extracted Key ID: {key_id[:4]}...{key_id[-4:]} (Length: {len(key_id)})")
    
    # Check if standard AWS Access Key regex matches
    aws_pattern = re.compile(r"^AKIA[0-9A-Z]{16}$")
    if aws_pattern.match(key_id) and len(secret) >= 30:
        print("\n[VULNERABILITY REPRODUCED SUCCESSFULLY]")
        print("Defect Evidence:")
        print("1. Production credential pattern AKIA[0-9A-Z]{16} embedded directly in client-accessible module.")
        print("2. Credential allows unauthorized programmatic access to cloud infrastructure.")
        print("3. Root cause: Configuration constants embedded in code instead of loading from environment variables.")
        sys.exit(0)
    else:
        print("\n[REPRODUCTION FAILED: No credential pattern matched]")
        sys.exit(1)

if __name__ == "__main__":
    run_reproduction()
