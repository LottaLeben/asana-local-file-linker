# ─────────────────────────────────────────────────────────────────────────
# Native Messaging Host for Asana Local File Linker (Windows)
#
# Receives a JSON message via Chrome's Native Messaging protocol (stdin),
# opens the requested file with the system default app, and responds.
#
# Zero external dependencies — pure PowerShell (built into Windows 10+).
# ─────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

# ── Hardcoded blocklist (defense-in-depth, extension also checks) ────────

$BLOCKED_EXTS = @(
    ".app", ".command", ".terminal", ".workflow", ".action",
    ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
    ".sh", ".bash", ".zsh", ".csh", ".ksh", ".fish",
    ".py", ".pyw", ".rb", ".pl", ".php",
    ".jar", ".ps1", ".vbs", ".vbe", ".jse", ".wsf",
    ".docm", ".xlsm", ".pptm", ".dotm"
)

# ── Native Messaging Protocol ────────────────────────────────────────────

function Read-NativeMessage {
    $stdin = [System.Console]::OpenStandardInput()

    # Read 4-byte little-endian length prefix
    $lengthBytes = New-Object byte[] 4
    $bytesRead = $stdin.Read($lengthBytes, 0, 4)
    if ($bytesRead -lt 4) { return $null }

    $length = [System.BitConverter]::ToUInt32($lengthBytes, 0)
    if ($length -eq 0 -or $length -gt 1048576) { return $null }

    # Read JSON body
    $messageBytes = New-Object byte[] $length
    $totalRead = 0
    while ($totalRead -lt $length) {
        $read = $stdin.Read($messageBytes, $totalRead, $length - $totalRead)
        if ($read -eq 0) { break }
        $totalRead += $read
    }

    return [System.Text.Encoding]::UTF8.GetString($messageBytes)
}

function Send-NativeMessage {
    param([string]$Message)

    $stdout = [System.Console]::OpenStandardOutput()
    $messageBytes = [System.Text.Encoding]::UTF8.GetBytes($Message)
    $lengthBytes = [System.BitConverter]::GetBytes([uint32]$messageBytes.Length)

    $stdout.Write($lengthBytes, 0, 4)
    $stdout.Write($messageBytes, 0, $messageBytes.Length)
    $stdout.Flush()
}

function Send-Error {
    param([string]$ErrorText)
    $escaped = $ErrorText -replace '"', '\"'
    Send-NativeMessage "{`"success`":false,`"error`":`"$escaped`"}"
}

function Send-Success {
    param([string]$Path)
    $escaped = $Path -replace '\\', '\\' -replace '"', '\"'
    Send-NativeMessage "{`"success`":true,`"path`":`"$escaped`"}"
}

# ── Main ─────────────────────────────────────────────────────────────────

try {
    $json = Read-NativeMessage
    if (-not $json) {
        Send-Error "No message received"
        exit
    }

    $msg = $json | ConvertFrom-Json
    $path = $msg.path

    if (-not $path) {
        Send-Error "No path provided"
        exit
    }

    # Resolve symlinks / junctions
    $realPath = [System.IO.Path]::GetFullPath($path)

    # Check existence
    if (-not (Test-Path -LiteralPath $realPath)) {
        Send-Error "Not found: $path"
        exit
    }

    # Check blocklist
    $ext = [System.IO.Path]::GetExtension($realPath).ToLower()
    if ($BLOCKED_EXTS -contains $ext) {
        Send-Error "Blocked: $ext (add to whitelist in extension settings to override)"
        exit
    }

    # Open with default app
    Start-Process -FilePath $realPath

    Send-Success $path
}
catch {
    Send-Error $_.Exception.Message
}
