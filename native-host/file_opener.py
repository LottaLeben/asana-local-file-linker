#!/usr/bin/env python3
"""
Native Messaging Host for Asana Local File Linker.

Receives a file path + user-configured blocked/allowed lists from
the Chrome extension and opens the file with the system default app.

Security:
  - Blocklist prevents opening executables and scripts.
  - Whitelist overrides the blocklist for explicitly trusted types.
  - os.path.realpath() resolves symlinks to prevent traversal.
"""

import json
import os
import platform
import struct
import subprocess
import sys

# Hardcoded fallback if no lists are provided
FALLBACK_BLOCKED = frozenset([
    ".app", ".command", ".terminal", ".workflow", ".action",
    ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
    ".sh", ".bash", ".zsh", ".csh", ".ksh", ".fish",
    ".py", ".pyw", ".rb", ".pl", ".php",
    ".jar", ".ps1", ".vbs", ".vbe", ".jse", ".wsf",
])


def read_message():
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length or len(raw_length) < 4:
        return None
    length = struct.unpack("=I", raw_length)[0]
    if length > 1024 * 1024:
        return None
    message = sys.stdin.buffer.read(length).decode("utf-8")
    return json.loads(message)


def send_message(message):
    encoded = json.dumps(message).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def is_safe_path(path, blocked_exts, allowed_exts):
    """Check if a path is safe to open."""
    real = os.path.realpath(path)
    _, ext = os.path.splitext(real.lower())

    # Whitelist takes priority
    if ext in allowed_exts:
        return True, None

    # Check blocklist
    if ext in blocked_exts:
        return False, f"Blocked: {ext} (add to whitelist in extension settings to override)"

    # Block .app bundles
    if real.endswith(".app") or "/.app/" in real:
        return False, "App bundles are blocked"

    return True, None


def open_path(path):
    system = platform.system()
    if system == "Darwin":
        result = subprocess.run(["open", path], capture_output=True, text=True)
        if result.returncode != 0:
            raise OSError(f"open failed: {result.stderr.strip()}")
    elif system == "Linux":
        subprocess.Popen(["xdg-open", path])
    elif system == "Windows":
        os.startfile(path)
    else:
        raise OSError(f"Unsupported platform: {system}")


def main():
    msg = read_message()
    if not msg:
        send_message({"success": False, "error": "No message received"})
        return

    path = msg.get("path", "").strip()
    if not path:
        send_message({"success": False, "error": "No path provided"})
        return

    # User-configured lists (from Chrome extension settings)
    blocked_exts = frozenset(msg.get("blocked", FALLBACK_BLOCKED))
    allowed_exts = frozenset(msg.get("allowed", []))

    real_path = os.path.realpath(path)

    if not os.path.exists(real_path):
        send_message({"success": False, "error": f"Not found: {path}"})
        return

    safe, reason = is_safe_path(real_path, blocked_exts, allowed_exts)
    if not safe:
        send_message({"success": False, "error": reason})
        return

    try:
        open_path(real_path)
        send_message({"success": True, "path": path})
    except Exception as e:
        send_message({"success": False, "error": str(e)})


if __name__ == "__main__":
    main()
