# 📂 Asana Local File Linker

**Chrome-Extension die lokale Dateipfade in Asana-Aufgaben erkennt und per Klick direkt öffnet.**

> ⚠️ **Alpha Release** — Funktioniert, aber noch nicht im Chrome Web Store. Manuelle Installation.

---

## Das Problem

Asana blockiert `file://`-URLs aus Sicherheitsgründen. Wenn du einen lokalen Dateipfad wie `/Users/team/Dokumente/Vertrag.pdf` in eine Aufgabe schreibst, wird er nicht als Link erkannt — er bleibt toter Text.

## Die Lösung

Diese Extension:

1. **Erkennt** automatisch lokale Dateipfade in Asana-Beschreibungen und Kommentaren
2. **Hebt sie blau hervor** (ohne Asana's DOM zu verändern)
3. **Öffnet die Datei** mit der Standard-App per `Alt+Klick` (⌥+Klick auf Mac)

### Unterstützte Pfadformate

| Format | Beispiel |
|---|---|
| macOS | `/Users/team/Dokumente/Vertrag.pdf` |
| macOS Volumes | `/Volumes/SharedDrive/Projekte/Brief.docx` |
| Linux | `/home/user/data/report.csv` |
| Windows | `C:\Users\roland\Documents\datei.pdf` |
| UNC (Netzlaufwerk) | `\\server\share\datei.xlsx` |
| Custom URL Schemes | `x-devonthink-item://ABC123` |

Zusätzliche Muster können in den **Einstellungen** der Extension definiert werden.

---

## Installation

### Schritt 1 — Chrome-Extension laden

1. Dieses Repository klonen oder als ZIP herunterladen:
   ```bash
   git clone https://github.com/lottaleben/asana-local-file-linker.git
   ```
2. Chrome öffnen → `chrome://extensions/`
3. **Entwicklermodus** aktivieren (Toggle oben rechts)
4. **"Entpackte Erweiterung laden"** klicken
5. Den Ordner `asana-local-file-linker` auswählen

Die Extension erscheint in der Liste. Notiere dir die **Extension-ID** (z.B. `efodijhnhlfpnncapinlpifldiojmknf`).

### Schritt 2 — Native Host installieren (für Datei-Öffnen)

Die Extension braucht einen kleinen lokalen Helper, damit Chrome die Datei tatsächlich öffnen kann (Chrome blockiert `file://`-Navigation aus Sicherheitsgründen).

#### macOS / Linux

```bash
cd asana-local-file-linker/native-host
chmod +x install.sh file_opener.py
./install.sh DEINE_EXTENSION_ID
```

Ersetze `DEINE_EXTENSION_ID` mit der ID aus Schritt 1.

#### Windows

> ⏳ Windows-Installer kommt in einer späteren Version. Aktuell wird nur macOS unterstützt.

### Schritt 3 — Testen

1. Öffne [Asana](https://app.asana.com)
2. Navigiere zu einer Aufgabe mit einem Dateipfad in der Beschreibung
3. Der Pfad sollte **blau unterstrichen** erscheinen
4. **Alt+Klick** (⌥+Klick) auf den Pfad → Datei öffnet sich

---

## Einstellungen

Rechtsklick auf das Extension-Icon → **"Optionen"**

| Einstellung | Beschreibung |
|---|---|
| **Blockierte Dateitypen** | Dateien mit diesen Endungen werden nicht geöffnet (z.B. `.exe`, `.app`). Editierbar. |
| **Erlaubte Dateitypen** | Whitelist — überschreibt die Blocklist für vertrauenswürdige Typen. |
| **Eigene Pfadmuster** | Zusätzliche Regex-Muster für Pfade, die nicht standardmäßig erkannt werden. |

---

## Funktionsweise

```
Asana-Text → CSS Highlight API (blauer Highlight) → Alt+Klick →
→ Chrome Native Messaging → Python-Script → macOS `open` → Datei öffnet sich
```

### Warum so?

- **CSS Highlight API** — Markiert Pfade visuell ohne Asana's React-DOM zu verändern. Keine Konflikte mit Asana-Updates.
- **Alt+Klick** — Normales Klicken in Asana bleibt ungestört (Editing, Navigation). Nur bewusstes Alt+Klick öffnet Dateien.
- **Native Messaging** — Einziger Weg, lokale Dateien aus einer Chrome-Extension zu öffnen. Chrome blockiert `file://`-URLs komplett.

### Sicherheit

- ❌ Keine Datenübertragung an Server — alles lokal
- ❌ Kein Zugriff auf Asana-Credentials oder API
- ✅ Blocklist für gefährliche Dateitypen (`.exe`, `.app`, `.command`, `.sh`, etc.)
- ✅ Whitelist übersteuerbar in den Einstellungen
- ✅ `os.path.realpath()` verhindert Symlink-Attacken
- ✅ Minimale Berechtigungen: nur `nativeMessaging` + `storage` + `app.asana.com`

---

## Dateistruktur

```
asana-local-file-linker/
├── manifest.json          # Chrome Extension Manifest (v3)
├── content.js             # Pfad-Erkennung + Highlight + Klick-Handler
├── content.css            # CSS Highlight API Styles + Toast
├── background.js          # Service Worker (Native Messaging Bridge)
├── options.html/css/js    # Einstellungsseite
├── native-host/
│   ├── file_opener.py     # Native Host — öffnet Dateien via `open`
│   └── install.sh         # Registriert den Native Host bei Chrome
├── LICENSE                # MIT
└── README.md              # Diese Datei
```

---

## Vergleich mit Alternativen

| | **Asana Local File Linker** | **LinkYourFile** |
|---|---|---|
| Preis | **Kostenlos** (MIT) | €49 / Gerät |
| Erkennung | Automatisch in Asana | Manuell: Pfad erstellen + einfügen |
| Öffnen | Alt+Klick → Standard-App | Klick → Custom Protocol |
| Setup | Extension + 1 Terminal-Befehl | Desktop-App installieren |
| Team | Jedes Mitglied installiert | Jedes Mitglied installiert (€49) |
| Open Source | ✅ | ❌ |

---

## Roadmap

- [ ] Chrome Web Store Veröffentlichung
- [ ] Extension-Icon
- [ ] Windows `install.bat`
- [ ] Optionaler Single-Click-Modus
- [ ] Firefox-Support

---

## Lizenz

MIT — siehe [LICENSE](LICENSE)

---

Erstellt von [Lottaleben Media](https://lottaleben.de) 🧡
