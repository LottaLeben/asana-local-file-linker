/**
 * Asana Local File Linker — Options Page Logic
 *
 * Manages:
 *   - Blocked file extensions (security blocklist)
 *   - Allowed file extensions (whitelist overrides blocklist)
 *   - Custom path patterns (regex)
 *
 * Stored in chrome.storage.sync (synced across devices).
 */

(() => {
  'use strict';

  // ── Defaults ────────────────────────────────────────────────────────────

  const DEFAULT_BLOCKED = [
    '.app', '.command', '.terminal', '.workflow', '.action',
    '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
    '.sh', '.bash', '.zsh', '.csh', '.ksh', '.fish',
    '.py', '.pyw', '.rb', '.pl', '.php',
    '.jar', '.ps1', '.vbs', '.vbe', '.jse', '.wsf',
  ];

  const STORAGE_KEYS = {
    blocked: 'blockedExtensions',
    allowed: 'allowedExtensions',
    patterns: 'customPatterns',
  };

  // ── State ────────────────────────────────────────────────────────────────

  let blocked = [...DEFAULT_BLOCKED];
  let allowed = [];
  let patterns = []; // { regex: string, label: string }

  // ── DOM refs ────────────────────────────────────────────────────────────

  const blockedTags = document.getElementById('blocked-tags');
  const blockedInput = document.getElementById('blocked-input');
  const blockedAddBtn = document.getElementById('blocked-add');
  const blockedResetBtn = document.getElementById('blocked-reset');

  const allowedTags = document.getElementById('allowed-tags');
  const allowedInput = document.getElementById('allowed-input');
  const allowedAddBtn = document.getElementById('allowed-add');

  const patternsList = document.getElementById('patterns-list');
  const patternInput = document.getElementById('pattern-input');
  const patternLabel = document.getElementById('pattern-label');
  const patternAddBtn = document.getElementById('pattern-add');

  const statusEl = document.getElementById('status');

  // ── Render functions ──────────────────────────────────────────────────

  function renderTags(container, items, removeCallback) {
    container.innerHTML = '';
    items.sort().forEach((item, i) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.innerHTML = `${escapeHtml(item)}<span class="tag-remove" data-index="${i}">×</span>`;
      tag.querySelector('.tag-remove').addEventListener('click', () => {
        removeCallback(i);
      });
      container.appendChild(tag);
    });
  }

  function renderPatterns() {
    patternsList.innerHTML = '';
    if (patterns.length === 0) {
      patternsList.innerHTML = '<p style="color:#555;font-size:12px;">Keine eigenen Muster definiert.</p>';
      return;
    }
    patterns.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'pattern-item';
      item.innerHTML = `
        <span class="pattern-regex">${escapeHtml(p.regex)}</span>
        ${p.label ? `<span class="pattern-label">${escapeHtml(p.label)}</span>` : ''}
        <button class="pattern-remove" data-index="${i}">×</button>
      `;
      item.querySelector('.pattern-remove').addEventListener('click', () => {
        patterns.splice(i, 1);
        save();
        renderPatterns();
      });
      patternsList.appendChild(item);
    });
  }

  function renderAll() {
    renderTags(blockedTags, blocked, (i) => {
      blocked.splice(i, 1);
      save();
      renderTags(blockedTags, blocked, arguments.callee);
    });
    renderTags(allowedTags, allowed, (i) => {
      allowed.splice(i, 1);
      save();
      renderTags(allowedTags, allowed, arguments.callee);
    });
    renderPatterns();
  }

  // ── Storage ──────────────────────────────────────────────────────────

  function load() {
    chrome.storage.sync.get(
      {
        [STORAGE_KEYS.blocked]: DEFAULT_BLOCKED,
        [STORAGE_KEYS.allowed]: [],
        [STORAGE_KEYS.patterns]: [],
      },
      (data) => {
        blocked = data[STORAGE_KEYS.blocked];
        allowed = data[STORAGE_KEYS.allowed];
        patterns = data[STORAGE_KEYS.patterns];
        renderAll();
      }
    );
  }

  function save() {
    chrome.storage.sync.set(
      {
        [STORAGE_KEYS.blocked]: blocked,
        [STORAGE_KEYS.allowed]: allowed,
        [STORAGE_KEYS.patterns]: patterns,
      },
      () => {
        showStatus('✅ Gespeichert', 'ok');
      }
    );
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function normalizeExt(ext) {
    ext = ext.trim().toLowerCase();
    if (ext && !ext.startsWith('.')) ext = '.' + ext;
    return ext;
  }

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = `status visible ${type}`;
    clearTimeout(statusEl._timer);
    statusEl._timer = setTimeout(() => {
      statusEl.classList.remove('visible');
    }, 2000);
  }

  // ── Event handlers ────────────────────────────────────────────────────

  function addBlocked() {
    const ext = normalizeExt(blockedInput.value);
    if (!ext) return;
    if (blocked.includes(ext)) {
      showStatus(`${ext} ist bereits blockiert`, 'err');
      return;
    }
    blocked.push(ext);
    blockedInput.value = '';
    save();
    renderAll();
  }

  function addAllowed() {
    const ext = normalizeExt(allowedInput.value);
    if (!ext) return;
    if (allowed.includes(ext)) {
      showStatus(`${ext} ist bereits erlaubt`, 'err');
      return;
    }
    allowed.push(ext);
    allowedInput.value = '';
    save();
    renderAll();
  }

  function addPattern() {
    const regex = patternInput.value.trim();
    if (!regex) return;

    // Validate regex
    try {
      new RegExp(regex, 'g');
    } catch (e) {
      showStatus(`Ungültiges Regex: ${e.message}`, 'err');
      return;
    }

    const label = patternLabel.value.trim();
    patterns.push({ regex, label });
    patternInput.value = '';
    patternLabel.value = '';
    save();
    renderPatterns();
  }

  // ── Bind events ──────────────────────────────────────────────────────

  blockedAddBtn.addEventListener('click', addBlocked);
  blockedInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addBlocked(); });

  allowedAddBtn.addEventListener('click', addAllowed);
  allowedInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addAllowed(); });

  patternAddBtn.addEventListener('click', addPattern);
  patternInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPattern(); });

  blockedResetBtn.addEventListener('click', () => {
    blocked = [...DEFAULT_BLOCKED];
    save();
    renderAll();
    showStatus('Blocklist auf Standard zurückgesetzt', 'ok');
  });

  // ── Init ─────────────────────────────────────────────────────────────

  load();
})();
