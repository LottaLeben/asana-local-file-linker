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

  // ── Drag & Drop state ─────────────────────────────────────────────────

  let dragData = null; // { ext, sourceList: 'blocked'|'allowed' }

  function getListByName(name) {
    return name === 'blocked' ? blocked : allowed;
  }

  function renderTags(container, items, listName, removeCallback) {
    container.innerHTML = '';
    items.sort().forEach((item, i) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.draggable = true;
      tag.innerHTML = `${escapeHtml(item)}<span class="tag-remove" data-index="${i}">×</span>`;

      tag.addEventListener('dragstart', (e) => {
        dragData = { ext: item, sourceList: listName };
        tag.classList.add('tag--dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      tag.addEventListener('dragend', () => {
        tag.classList.remove('tag--dragging');
        dragData = null;
      });

      tag.querySelector('.tag-remove').addEventListener('click', () => {
        removeCallback(i);
      });

      container.appendChild(tag);
    });
  }

  function setupDropZone(container, targetListName) {
    container.addEventListener('dragover', (e) => {
      if (!dragData || dragData.sourceList === targetListName) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      container.classList.add('tag-container--dragover');
    });

    container.addEventListener('dragleave', () => {
      container.classList.remove('tag-container--dragover');
    });

    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('tag-container--dragover');
      if (!dragData || dragData.sourceList === targetListName) return;

      const { ext, sourceList } = dragData;
      const source = getListByName(sourceList);
      const target = getListByName(targetListName);

      // Remove from source
      const idx = source.indexOf(ext);
      if (idx !== -1) source.splice(idx, 1);

      // Add to target (avoid duplicates)
      if (!target.includes(ext)) target.push(ext);

      dragData = null;
      save();
      renderAll();
      showStatus(`Moved ${ext} to ${targetListName === 'allowed' ? 'whitelist' : 'blocklist'}`, 'ok');
    });
  }

  function renderPatterns() {
    patternsList.innerHTML = '';
    if (patterns.length === 0) {
      patternsList.innerHTML = '<p style="color:#555;font-size:12px;">No custom patterns defined.</p>';
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
    renderTags(blockedTags, blocked, 'blocked', (i) => {
      blocked.splice(i, 1);
      save();
      renderAll();
    });
    renderTags(allowedTags, allowed, 'allowed', (i) => {
      allowed.splice(i, 1);
      save();
      renderAll();
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
        showStatus('✅ Saved', 'ok');
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
      showStatus(`${ext} is already blocked`, 'err');
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
      showStatus(`${ext} is already allowed`, 'err');
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
      showStatus(`Invalid regex: ${e.message}`, 'err');
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
    showStatus('Blocklist reset to defaults', 'ok');
  });

  // ── Init ─────────────────────────────────────────────────────────────

  setupDropZone(blockedTags, 'blocked');
  setupDropZone(allowedTags, 'allowed');
  load();
})();
