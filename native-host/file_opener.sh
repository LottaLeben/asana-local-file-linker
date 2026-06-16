#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────
# Native Messaging Host for Asana Local File Linker (macOS / Linux)
#
# Receives a JSON message via Chrome's Native Messaging protocol (stdin),
# opens the requested file with the system default app, and responds.
#
# Zero external dependencies — pure bash + coreutils.
# ─────────────────────────────────────────────────────────────────────────

# Do NOT use set -euo pipefail — the script must always respond,
# even if individual commands fail.

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
  # Read 4-byte little-endian length prefix using od (POSIX standard)
  local raw
  raw=$(/bin/dd bs=4 count=1 2>/dev/null | /usr/bin/od -A n -t u1 | /usr/bin/tr -s ' ')
  [ -z "$raw" ] && return 1

  # Parse the 4 unsigned bytes (little-endian)
  local b0 b1 b2 b3
  read -r b0 b1 b2 b3 <<< "$raw"
  [ -z "$b0" ] && return 1

  local length=$(( b0 + b1 * 256 + b2 * 65536 + b3 * 16777216 ))
  [ "$length" -eq 0 ] 2>/dev/null && return 1
  [ "$length" -gt 1048576 ] 2>/dev/null && return 1

  # Read the JSON body
  /bin/dd bs="$length" count=1 2>/dev/null
}

send_message() {
  local msg="$1"
  local len=${#msg}

  # Write 4-byte little-endian length prefix
  local b0=$(( len & 0xFF ))
  local b1=$(( (len >> 8) & 0xFF ))
  local b2=$(( (len >> 16) & 0xFF ))
  local b3=$(( (len >> 24) & 0xFF ))

  printf "$(printf '\\%03o\\%03o\\%03o\\%03o' "$b0" "$b1" "$b2" "$b3")"
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
  # Match "key" : "value" — handles spaces around colon
  echo "$json" | /usr/bin/grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | /usr/bin/sed "s/\"$key\"[[:space:]]*:[[:space:]]*\"//;s/\"$//" | head -1
}

# ── Security checks ─────────────────────────────────────────────────────

is_blocked() {
  local path="$1"
  local ext
  ext=".$(echo "${path##*.}" | /usr/bin/tr '[:upper:]' '[:lower:]')"

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
  json=$(read_message)
  if [ -z "$json" ]; then
    send_error "No message received"
    exit 0
  fi

  local path
  path=$(json_get "path" "$json")
  if [ -z "$path" ]; then
    send_error "No path provided"
    exit 0
  fi

  # Resolve symlinks
  local real_path
  if command -v realpath &>/dev/null; then
    real_path=$(realpath "$path" 2>/dev/null || echo "$path")
  elif [ -x /usr/bin/readlink ]; then
    real_path=$(/usr/bin/readlink -f "$path" 2>/dev/null || echo "$path")
  else
    real_path="$path"
  fi

  # Check existence
  if [ ! -e "$real_path" ]; then
    send_error "Not found: $path"
    exit 0
  fi

  # Check blocklist
  if is_blocked "$real_path"; then
    send_error "Blocked: .${real_path##*.} (add to whitelist in extension settings to override)"
    exit 0
  fi

  # Open with default app
  case "$(/usr/bin/uname -s)" in
    Darwin)
      /usr/bin/open -- "$real_path" 2>/dev/null
      ;;
    Linux)
      xdg-open -- "$real_path" 2>/dev/null &
      ;;
    *)
      send_error "Unsupported platform"
      exit 0
      ;;
  esac

  send_success "$path"
}

main
