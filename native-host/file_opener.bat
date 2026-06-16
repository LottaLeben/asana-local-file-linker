@echo off
:: file_opener.bat — Windows wrapper for the PowerShell native messaging host.
:: Chrome on Windows requires a .bat or .exe as the native host executable.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0file_opener.ps1"
