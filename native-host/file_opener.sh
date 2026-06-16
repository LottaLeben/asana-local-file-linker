#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────
# Native Messaging Host for Asana Local File Linker (macOS / Linux)
#
# Receives a JSON message via Chrome's Native Messaging protocol (stdin),
# opens the requested file with the system default app, and responds.
#
# Zero external dependencies — pure bash + coreutils.
# ─────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Hardcoded blocklist (defense-in-depth, extension also checks) ────────

BLOCKED_EXTS=(
  .app .command .terminal .workflow .action
  .exe .bat .cmd .com .msi .scr .pif
  .sh .bash .zsh .csh .ksh .fish
  .py .pyw .rb .pl .php
  .jar .ps1 .vbs .vbe .jse .wsf
  .docm .xlsm .pptm .dotm
)

# ── Native Messaging Protocol ────────────────────────────────────────────

read_message() {
  # Read 4-byte little-endian length prefix
  local raw
  raw=$(dd bs=1 count=4 2>/dev/null | xxd -p)
  [ -z "$raw" ] && return 1

  # Convert little-endian hex to decimal
  local b0="${raw:0:2}" b1="${raw:2:2}" b2="${raw:4:2}" b3="${raw:6:2}"
  local length=$(( 16#$b3 * 16777216 + 16#$b2 * 65536 + 16#$b1 * 256 + 16#$b0 ))
  [ "$length" -eq 0 ] && return 1
  [ "$length" -gt 1048576 ] && return 1  # 1MB safety limit

  # Read the JSON body
  dd bs=1 count="$length" 2>/dev/null
}

send_message() {
  local msg="$1"
  local len=${#msg}

  # Write 4-byte little-endian length prefix
  printf "\\x$(printf '%02x' $((len & 0xFF)))"
  printf "\\x$(printf '%02x' $(((len >> 8) & 0xFF)))"
  printf "\\x$(printf '%02x' $(((len >> 16) & 0xFF)))"
  printf "\\x$(printf '%02x' $(((len >> 24) & 0xFF)))"
  printf '%s' "$msg"
}

send_error() {
  send_message "{\"success\":false,\"error\":\"$1\"}"
}

send_success() {
  send_message "{\"success\":true,\"path\":\"$1\"}"
}

# ── Extract JSON string value (no jq needed) ─────────────────────────────

json_get() {
  local key="$1" json="$2"
  echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | sed "s/\"$key\"[[:space:]]*:[[:space:]]*\"//;s/\"$//" | head -1
}

# ── Security checks ─────────────────────────────────────────────────────

is_blocked() {
  local path="$1"
  local ext
  ext=".$(echo "${path##*.}" | tr '[:upper:]' '[:lower:]')"

  for blocked in "${BLOCKED_EXTS[@]}"; do
    [ "$ext" = "$blocked" ] && return 0
  done

  # Block .app bundles (macOS)
  case "$path" in
    *.app|*.app/*) return 0 ;;
  esac

  return 1
}

# ── Main ─────────────────────────────────────────────────────────────────

main() {
  local json
  json=$(read_message) || { send_error "No message received"; exit 0; }

  local path
  path=$(json_get "path" "$json")
  [ -z "$path" ] && { send_error "No path provided"; exit 0; }

  # Resolve symlinks
  local real_path
  if command -v realpath &>/dev/null; then
    real_path=$(realpath "$path" 2>/dev/null || echo "$path")
  elif command -v readlink &>/dev/null; then
    real_path=$(readlink -f "$path" 2>/dev/null || echo "$path")
  else
    real_path="$path"
  fi

  # Check existence
  [ ! -e "$real_path" ] && { send_error "Not found: $path"; exit 0; }

  # Check blocklist
  is_blocked "$real_path" && { send_error "Blocked: .${real_path##*.} (add to whitelist in extension settings to override)"; exit 0; }

  # Open with default app
  case "$(uname -s)" in
    Darwin)
      open -- "$real_path" 2>/dev/null || { send_error "Failed to open file"; exit 0; }
      ;;
    Linux)
      xdg-open -- "$real_path" 2>/dev/null &
      ;;
    *)
      send_error "Unsupported platform: $(uname -s)"
      exit 0
      ;;
  esac

  send_success "$path"
}

main
