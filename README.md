# 📂 Asana Local File Linker

**Chrome extension that detects local file paths in Asana tasks and opens them with a single click.**

> ⚠️ **Alpha Release** — Functional. Manual installation required (see below).

---

## The Problem

Asana blocks `file://` URLs for security reasons. When you paste a local file path like `/Users/team/Documents/Contract.pdf` into a task description, it remains plain text — no link, no click.

## The Solution

This extension:

1. **Detects** local file paths in Asana task descriptions and comments automatically
2. **Highlights them in blue** (without modifying Asana's DOM)
3. **Opens the file** with your default app via `Alt+Click` (⌥+Click on Mac)

### Supported Path Formats

| Format | Example |
|---|---|
| macOS | `/Users/team/Documents/Contract.pdf` |
| macOS Volumes | `/Volumes/SharedDrive/Projects/Brief.docx` |
| Linux | `/home/user/data/report.csv` |
| Windows | `C:\Users\roland\Documents\file.pdf` |
| UNC (Network drives) | `\\server\share\file.xlsx` |
| Custom URL schemes | `x-devonthink-item://ABC123` |

Additional patterns can be defined in the extension **settings**.

---

## Installation

### Step 1 — Load the Chrome Extension

1. Clone or download this repository:
   ```bash
   git clone https://github.com/LottaLeben/asana-local-file-linker.git
   ```
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer Mode** (toggle in the top right)
4. Click **"Load unpacked"**
5. Select the `asana-local-file-linker` folder

### Step 2 — Install the Native Host

The extension needs a small local helper to open files (Chrome blocks `file://` for security). Run once:

#### macOS / Linux

```bash
cd asana-local-file-linker/native-host
./install.sh
```

That's it. No configuration needed.

#### Windows

```cmd
cd asana-local-file-linker\native-host
install.bat
```

### Step 3 — Test

1. Open [Asana](https://app.asana.com)
2. Navigate to a task containing a file path in its description
3. The path should appear **blue and underlined**
4. **Alt+Click** (⌥+Click on Mac) on the path → file opens in your default app

---

## Settings

Right-click the extension icon → **"Options"**

| Setting | Description |
|---|---|
| **Blocked file types** | Files with these extensions will not be opened (e.g. `.exe`, `.app`). Editable. |
| **Allowed file types** | Whitelist — overrides the blocklist for trusted types. |
| **Custom path patterns** | Additional regex patterns for paths not covered by the defaults. |

---

## How It Works

```
Asana text → CSS Highlight API (blue highlight) → Alt+Click (Option+Click) →
→ Chrome Native Messaging → native host script → file opens
```

### Why this architecture?

- **CSS Highlight API** — Highlights paths visually without modifying Asana's React DOM. No conflicts with Asana updates.
- **Alt+Click / Option+Click** — Normal clicking in Asana stays unaffected (editing, navigation). Only deliberate Alt+Click (Option+Click on Mac) opens files.
- **Native Messaging** — The only way to open local files from a Chrome extension. Chrome blocks `file://` URLs completely.

### Security

- ❌ No data sent to any server — everything stays local
- ❌ No access to Asana credentials or API tokens
- ✅ Blocklist for dangerous file types (`.exe`, `.app`, `.command`, `.sh`, etc.)
- ✅ Whitelist override configurable in settings
- ✅ Symlink resolution prevents traversal attacks
- ✅ Minimal permissions: `nativeMessaging` + `storage` + `app.asana.com` only
- ✅ Zero external dependencies — pure bash (macOS/Linux) + PowerShell (Windows)

---

## File Structure

```
asana-local-file-linker/
├── manifest.json          # Chrome Extension Manifest (v3)
├── content.js             # Path detection + highlight + click handler
├── content.css            # CSS Highlight API styles + toast
├── background.js          # Service worker (Native Messaging bridge)
├── options.html/css/js    # Settings page
├── icons/                 # Extension icons (16/48/128px)
├── native-host/
│   ├── file_opener.sh     # Native host for macOS / Linux (bash)
│   ├── file_opener.ps1    # Native host for Windows (PowerShell)
│   ├── file_opener.bat    # Windows wrapper for Chrome
│   ├── install.sh         # Installer for macOS / Linux
│   └── install.bat        # Installer for Windows
├── LICENSE                # MIT
└── README.md              # This file
```


---

## Disclaimer

This project is an **independent community project** and is **not affiliated with, endorsed by, or supported by [Asana, Inc.](https://asana.com)** "Asana" is a trademark of Asana, Inc. This extension is provided for personal and team use at your own risk.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM THE USE OF THIS SOFTWARE. See the [MIT License](LICENSE) for the full terms.

---

## License

MIT — see [LICENSE](LICENSE)

---

Built by [Lottaleben Media](https://www.lottaleben.de) 🧡
