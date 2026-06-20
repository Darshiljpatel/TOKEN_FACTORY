import os
import sys
import json

# Reconfigure stdout/stderr to support unicode characters on Windows console
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure python can locate the services package by adding the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.profile_extractor import extract_profile

def main():
    print("==================================================")
    print("TESTING PROFILE EXTRACTION AGENT")
    print("==================================================")
    
    sample_input = (
        "I am a 19 year old engineering student from Karnataka.\n"
        "My family income is around 3 lakh.\n"
        "I belong to OBC category."
    )
    
    print(f"Input User Text:\n{sample_input}\n")
    print("Extracting profile information (calling Qwen3-32B)...")
    
    profile = extract_profile(sample_input)
    
    print("\nExtracted Profile JSON:")
    print(json.dumps(profile, indent=2))
    print("==================================================")

if __name__ == "__main__":
    main()
