@echo off
:: install.bat — Registers the Native Messaging Host for Chrome on Windows.
:: Run once after loading the extension.
::
:: Usage: Double-click or run from Command Prompt.
:: Requires: Python 3 installed and on PATH.

setlocal

:: Fixed extension ID (derived from the key in manifest.json)
set EXTENSION_ID=oiepccloocceeiadchmihbdplbjaccgh
set HOST_NAME=com.alfl.file_opener

:: Get absolute path to this directory
set SCRIPT_DIR=%~dp0
:: Remove trailing backslash for clean paths
if "%SCRIPT_DIR:~-1%"=="\" set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

set HOST_BAT=%SCRIPT_DIR%\file_opener.bat
set MANIFEST_PATH=%SCRIPT_DIR%\%HOST_NAME%.json

echo.
echo  Asana Local File Linker — Native Host Installer (Windows)
echo.
echo    Host script:  %HOST_BAT%
echo    Manifest:     %MANIFEST_PATH%
echo.

:: Check Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python 3 is not installed or not on PATH.
    echo  Please install Python from https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: Write manifest JSON (Windows paths need double backslashes in JSON)
:: We use PowerShell to create valid JSON with proper escaping
powershell -NoProfile -Command ^
  "$hostPath = '%HOST_BAT%' -replace '\\', '\\'; " ^
  "$json = @{ name='%HOST_NAME%'; description='Opens local files for Asana Local File Linker'; path=$hostPath; type='stdio'; allowed_origins=@('chrome-extension://%EXTENSION_ID%/') } | ConvertTo-Json; " ^
  "$json | Set-Content -Path '%MANIFEST_PATH%' -Encoding UTF8"

if errorlevel 1 (
    echo  ERROR: Failed to write manifest file.
    pause
    exit /b 1
)

:: Register in Windows Registry
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\%HOST_NAME%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1

if errorlevel 1 (
    echo  ERROR: Failed to write registry key.
    pause
    exit /b 1
)

echo  Installed!
echo.
echo    Next steps:
echo    1. Reload the extension on chrome://extensions/
echo    2. Reload the Asana tab
echo    3. Alt+Click on a file path — it should open
echo.
pause
