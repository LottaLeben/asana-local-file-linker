/**
 * Asana Local File Linker — Content Script v4.0 (Production)
 *
 * Zero-DOM-modification approach:
 *   - CSS Custom Highlight API for visual highlighting
 *   - Alt+Click / Option+Click to open (avoids blocking Asana editing)
 *   - document.caretRangeFromPoint for hit detection
 *
 * Works with React/virtual DOM SPAs because we never touch the managed DOM.
 */

(() => {
  'use strict';

  // ── Patterns ──────────────────────────────────────────────────────────

  const BUILTIN_PATTERNS = [
    // Mac/Linux: /Users/foo/bar.pdf, /Volumes/Share/file.txt
    /(?<=^|[\s,:;([\]{}])\/(?:Users|Volumes|home|tmp|opt|var|etc|mnt|media)\/\S+/g,
    // Windows drive: C:\Users\foo\bar.docx
    /(?<=^|[\s,:;([\]{}])[A-Z]:[\\\/]\S+/g,
    // UNC: \\server\share\file
    /\\\\[a-zA-Z0-9._-]+\\\S+/g,
    // Custom URL schemes (not http/https/mailto/tel)
    /(?<=^|[\s,:;([\]{}])(?!https?:|mailto:|tel:)[a-zA-Z][a-zA-Z0-9+.-]{1,30}:\/\/\S+/g,
  ];

  // Combined: builtin + user-defined patterns from settings
  let PATH_PATTERNS = [...BUILTIN_PATTERNS];

  function loadCustomPatterns() {
    chrome.storage.sync.get({ customPatterns: [] }, (data) => {
      PATH_PATTERNS = [...BUILTIN_PATTERNS];
      for (const p of data.customPatterns) {
        try {
          PATH_PATTERNS.push(new RegExp(p.regex, 'g'));
        } catch { /* skip invalid regex */ }
      }
      requestScan();
    });
  }

  // ── Track highlighted ranges (for CSS Highlight API only) ─────────────

  let activeRanges = [];
  let highlightObj = null;

  // ── Toast ─────────────────────────────────────────────────────────────

  function showToast(message, type) {
    let toast = document.getElementById('alfl-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'alfl-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'alfl-toast';
    if (type) toast.classList.add(`alfl-toast--${type}`);
    toast.offsetHeight; // reflow
    toast.classList.add('alfl-toast--visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('alfl-toast--visible');
    }, type === 'warn' ? 5000 : 3000);
  }

  // ── Clipboard ─────────────────────────────────────────────────────────

  async function copyToClipboard(path) {
    try {
      await navigator.clipboard.writeText(path);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = path;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  // ── Open / Copy Handler ───────────────────────────────────────────────

  async function openPath(path) {
    // 1. Try native host (opens file directly on the local machine)
    try {
      const response = await chrome.runtime.sendMessage({ type: 'OPEN_PATH', path });

      if (response?.method === 'native') {
        if (response.success) {
          showToast(`✅ Opened: ${path.split('/').pop() || path}`, 'ok');
          return;
        }

        const err = response.error || 'Unknown error';

        // Blocked by security settings
        if (err.includes('Blocked')) {
          showToast(`🚫 Blocked file type — check extension settings to allow`, 'warn');
          return;
        }

        // File not found
        if (err.includes('Not found')) {
          showToast(`❌ File not found: ${path.split('/').pop() || path}`, 'err');
          return;
        }

        // Other native host error
        showToast(`⚠️ ${err}`, 'err');
        return;
      }
    } catch {
      // Service worker or native host unavailable
    }

    // 2. Fallback: copy to clipboard
    await copyToClipboard(path);
    showToast(`📋 Path copied — Finder: ⌘+Shift+G → Paste`);
  }

  // ── Scanner ───────────────────────────────────────────────────────────

  function findPaths() {
    activeRanges = [];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          const tag = el.tagName;
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }
          if (el.closest('#alfl-toast')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent;
      if (!text || text.length < 5) continue;

      for (const pattern of PATH_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const value = match[0].replace(/[.,;:!?)}\]]+$/, '');
          if (value.length < 5) continue;
          try {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + value.length);
            activeRanges.push({ range, path: value });
          } catch {
            // Node changed — skip
          }
        }
      }
    }
    return activeRanges.length;
  }

  // ── Apply CSS Highlights ──────────────────────────────────────────────

  function applyHighlights() {
    if (!CSS.highlights) return;
    if (highlightObj) CSS.highlights.delete('alfl-paths');
    if (activeRanges.length === 0) return;
    highlightObj = new Highlight(...activeRanges.map(r => r.range));
    highlightObj.priority = 1;
    CSS.highlights.set('alfl-paths', highlightObj);
  }

  // ── Live path detection at click point ────────────────────────────────

  function pathAtPoint(clientX, clientY) {
    const caretRange = document.caretRangeFromPoint(clientX, clientY);
    if (!caretRange) return null;

    const node = caretRange.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;

    const text = node.textContent;
    const offset = caretRange.startOffset;

    for (const pattern of PATH_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[0].replace(/[.,;:!?)}\]]+$/, '');
        if (offset >= match.index && offset <= match.index + value.length) {
          return value;
        }
      }
    }
    return null;
  }

  // ── Click Detection ───────────────────────────────────────────────────
  //
  // Alt+Click (Option+Click on Mac) = open/copy the path.
  // Regular click passes through to Asana so editing still works.

  function handleDocumentClick(event) {
    // Only intercept Alt+Click (Option+Click on Mac)
    if (!event.altKey) return;

    if (event.target.closest('#alfl-toast')) return;

    const path = pathAtPoint(event.clientX, event.clientY);
    if (path) {
      event.preventDefault();
      event.stopPropagation();
      openPath(path);
    }
  }

  // ── Cursor hint on hover ──────────────────────────────────────────────

  function handleMouseMove(event) {
    if (!event.altKey) {
      document.body.classList.remove('alfl-cursor-pointer');
      return;
    }
    const path = pathAtPoint(event.clientX, event.clientY);
    document.body.classList.toggle('alfl-cursor-pointer', !!path);
  }

  let moveTimer = null;
  function throttledMouseMove(event) {
    if (moveTimer) return;
    moveTimer = setTimeout(() => { moveTimer = null; }, 100);
    handleMouseMove(event);
  }

  // ── Scan scheduler ────────────────────────────────────────────────────

  let scanTimer = null;

  function requestScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanTimer = null;
      const count = findPaths();
      applyHighlights();
    }, 600);
  }

  // ── Lightweight MutationObserver ──────────────────────────────────────

  let mutationBatch = 0;

  const observer = new MutationObserver(() => {
    mutationBatch++;
    if (mutationBatch % 100 === 0) {
      requestScan();
    }
  });

  // ── URL change detection (SPA) ────────────────────────────────────────

  let lastUrl = location.href;

  // ── Init ──────────────────────────────────────────────────────────────

  function init() {
    // Load user-defined patterns from settings
    loadCustomPatterns();

    // Re-load patterns when settings change
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.customPatterns) loadCustomPatterns();
    });

    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('mousemove', throttledMouseMove, { passive: true });

    // Staggered scans for SPA lazy-loading
    setTimeout(requestScan, 1500);
    setTimeout(requestScan, 4000);
    setTimeout(requestScan, 8000);

    observer.observe(document.body, { childList: true, subtree: true });

    // SPA navigation detection
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        mutationBatch = 0;
        setTimeout(requestScan, 1500);
      }
    }, 2000);

    // Periodic safety-net re-scan
    setInterval(requestScan, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
