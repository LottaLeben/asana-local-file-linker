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

The extension appears in the list. Note down the **Extension ID** (e.g. `efodijhnhlfpnncapinlpifldiojmknf`).

### Step 2 — Install the Native Host (required for opening files)

The extension needs a small local helper to actually open files. Chrome blocks all `file://` navigation for security reasons — the native host bridges this gap.

#### macOS / Linux

```bash
cd asana-local-file-linker/native-host
chmod +x install.sh file_opener.py
./install.sh YOUR_EXTENSION_ID
```

Replace `YOUR_EXTENSION_ID` with the ID from Step 1.

#### Windows

> ⏳ Windows installer coming in a future release. Currently macOS only.

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
Asana text → CSS Highlight API (blue highlight) → Alt+Click →
→ Chrome Native Messaging → Python script → macOS `open` → file opens
```

### Why this architecture?

- **CSS Highlight API** — Highlights paths visually without modifying Asana's React DOM. No conflicts with Asana updates.
- **Alt+Click** — Normal clicking in Asana stays unaffected (editing, navigation). Only deliberate Alt+Click opens files.
- **Native Messaging** — The only way to open local files from a Chrome extension. Chrome blocks `file://` URLs completely.

### Security

- ❌ No data sent to any server — everything stays local
- ❌ No access to Asana credentials or API tokens
- ✅ Blocklist for dangerous file types (`.exe`, `.app`, `.command`, `.sh`, etc.)
- ✅ Whitelist override configurable in settings
- ✅ `os.path.realpath()` prevents symlink attacks
- ✅ Minimal permissions: `nativeMessaging` + `storage` + `app.asana.com` only

---

## File Structure

```
asana-local-file-linker/
├── manifest.json          # Chrome Extension Manifest (v3)
├── content.js             # Path detection + highlight + click handler
├── content.css            # CSS Highlight API styles + toast
├── background.js          # Service worker (Native Messaging bridge)
├── options.html/css/js    # Settings page
├── native-host/
│   ├── file_opener.py     # Native host — opens files via `open`
│   └── install.sh         # Registers the native host with Chrome
├── LICENSE                # MIT
└── README.md              # This file
```


---


## License

MIT — see [LICENSE](LICENSE)

---

Built by [Lottaleben Media](https://www.lottaleben.de) 🧡
