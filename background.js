/**
 * Asana Local File Linker — Background Service Worker v4.1
 *
 * Reads blocked/allowed extension lists from chrome.storage.sync
 * and passes them to the native messaging host along with the path.
 */

const NATIVE_HOST = 'com.alfl.file_opener';

const DEFAULT_BLOCKED = [
  '.app', '.command', '.terminal', '.workflow', '.action',
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.zsh', '.csh', '.ksh', '.fish',
  '.py', '.pyw', '.rb', '.pl', '.php',
  '.jar', '.ps1', '.vbs', '.vbe', '.jse', '.wsf',
];

async function getSettings() {
  return chrome.storage.sync.get({
    blockedExtensions: DEFAULT_BLOCKED,
    allowedExtensions: [],
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'OPEN_PATH') {
    sendResponse({ success: false, error: 'Unknown message type' });
    return true;
  }

  const path = message.path;

  (async () => {
    const settings = await getSettings();

    try {
      const port = chrome.runtime.connectNative(NATIVE_HOST);
      let responded = false;

      port.onMessage.addListener((response) => {
        if (!responded) {
          responded = true;
          sendResponse({
            success: response.success,
            method: 'native',
            error: response.error || null,
          });
        }
      });

      port.onDisconnect.addListener(() => {
        const err = chrome.runtime.lastError?.message || 'disconnected';
        if (!responded) {
          responded = true;
          sendResponse({ success: false, method: 'native-unavailable', error: err });
        }
      });

      // Send path + user-configured lists to native host
      port.postMessage({
        path,
        blocked: settings.blockedExtensions,
        allowed: settings.allowedExtensions,
      });

    } catch (err) {
      sendResponse({ success: false, method: 'native-unavailable', error: err.message });
    }
  })();

  return true;
});

console.log('[ALFL-BG] Service worker v4.1 started');
