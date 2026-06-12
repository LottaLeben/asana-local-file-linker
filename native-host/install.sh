#!/bin/bash
#
# install.sh — Registers the Native Messaging Host for Chrome.
# Run once after loading the extension.
#
# Usage: ./install.sh <extension-id>
#
# The extension ID is shown on chrome://extensions/ when the extension
# is loaded in developer mode.

set -euo pipefail

EXTENSION_ID="${1:-}"

if [ -z "$EXTENSION_ID" ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════════╗"
  echo "║  Asana Local File Linker — Native Host Installer               ║"
  echo "╠══════════════════════════════════════════════════════════════════╣"
  echo "║                                                                ║"
  echo "║  Usage: ./install.sh <extension-id>                            ║"
  echo "║                                                                ║"
  echo "║  Find your extension ID:                                       ║"
  echo "║  1. Open chrome://extensions/                                  ║"
  echo "║  2. Find 'Asana Local File Linker'                             ║"
  echo "║  3. Copy the ID (e.g. efodijhnhlfpnncapinlpifldiojmknf)       ║"
  echo "║                                                                ║"
  echo "╚══════════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi

# Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOST_PATH="$SCRIPT_DIR/file_opener.py"
HOST_NAME="com.alfl.file_opener"
TARGET_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
MANIFEST_PATH="$TARGET_DIR/$HOST_NAME.json"

echo ""
echo "📦 Installing Native Messaging Host..."
echo "   Extension ID: $EXTENSION_ID"
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

echo "✅ Native Messaging Host installed!"
echo ""
echo "   Next steps:"
echo "   1. Reload the extension on chrome://extensions/"
echo "   2. Reload the Asana tab"
echo "   3. Click on a file path — it should now open with your default app"
echo ""
