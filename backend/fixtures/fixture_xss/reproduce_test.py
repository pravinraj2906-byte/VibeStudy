import sys
from render import HtmlRenderer

def run_reproduction():
    renderer = HtmlRenderer()
    print("--- [ProofForge Reproduction Test: Unsafe Rendering / XSS] ---")
    payload = "<script>alert('pwned')</script><img src=x onerror=alert(1)>"
    print(f"Injecting Malicious Payload: {payload}")
    
    html_output = renderer.render_comment("Attacker", payload)
    print("Rendered HTML Output:")
    print(html_output.strip())

    # Check if raw unescaped payload exists in the DOM output
    if payload in html_output and "<script>" in html_output:
        print("\n[VULNERABILITY REPRODUCED SUCCESSFULLY]")
        print("Defect Evidence:")
        print("1. Raw <script> and <img> tags rendered verbatim without HTML entity encoding.")
        print("2. Browser executing this markup will trigger arbitrary JavaScript in context of victim.")
        print("3. Root cause: Direct string interpolation instead of contextual escaping or DOMPurify disinfection.")
        sys.exit(0)
    else:
        print("\n[REPRODUCTION FAILED: Input was safely escaped]")
        sys.exit(1)

if __name__ == "__main__":
    run_reproduction()
