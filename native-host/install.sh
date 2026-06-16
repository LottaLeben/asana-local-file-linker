#!/bin/bash
#
# install.sh — Registers the Native Messaging Host for Chrome.
# Run once after loading the extension.
#
# Usage: ./install.sh
#

set -euo pipefail

# Fixed extension ID (derived from the key in manifest.json)
EXTENSION_ID="oiepccloocceeiadchmihbdplbjaccgh"

# Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_PATH="$SCRIPT_DIR/file_opener.py"
HOST_NAME="com.alfl.file_opener"

# Detect OS and set target directory
case "$(uname -s)" in
  Darwin)
    TARGET_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    ;;
  Linux)
    TARGET_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    ;;
  *)
    echo "❌ Unsupported OS: $(uname -s)"
    echo "   Windows users: see README for manual setup."
    exit 1
    ;;
esac

MANIFEST_PATH="$TARGET_DIR/$HOST_NAME.json"

echo ""
echo "📦 Asana Local File Linker — Native Host Installer"
echo ""
echo "   Host script:  $HOST_PATH"
echo "   Manifest:     $MANIFEST_PATH"
echo ""

# Create target directory
mkdir -p "$TARGET_DIR"

# Write manifest
cat > "$MANIFEST_PATH" <<EOF
{
  "name": "$HOST_NAME",
  "description": "Opens local files for Asana Local File Linker",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF

# Ensure host script is executable
chmod +x "$HOST_PATH"

echo "✅ Installed!"
echo ""
echo "   Next steps:"
echo "   1. Reload the extension on chrome://extensions/"
echo "   2. Reload the Asana tab"
echo "   3. Alt+Click (Option+Click) on a file path — it should open"
echo ""
