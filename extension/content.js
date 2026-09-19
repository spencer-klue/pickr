// Relay between the Pickr page and the extension's service worker.
// Only activates on pages that declare themselves with <meta name="pickr">.
(() => {
  if (!document.querySelector('meta[name="pickr"]')) return;
  const TAG = 'pickr';

  window.addEventListener('message', (ev) => {
    if (ev.source !== window || !ev.data || ev.data.source !== TAG) return;
    const { cmd, payload, reqId } = ev.data;
    let live = false; try { live = !!(chrome.runtime && chrome.runtime.id); } catch (e) {}
    if (!live) { window.postMessage({ source: TAG + '-ext', type: 'result', reqId, ok: false, err: 'stale: extension reloaded' }, '*'); return; }
    try {
      chrome.runtime.sendMessage({ cmd, payload }, (res) => {
        const err = chrome.runtime.lastError;
        window.postMessage({ source: TAG + '-ext', type: 'result', reqId, ok: !err, res, err: err && err.message }, '*');
      });
    } catch (e) {
      // the extension was reloaded or removed; this copy of the content script is orphaned
      window.postMessage({ source: TAG + '-ext', type: 'result', reqId, ok: false, err: 'stale:' + e.message }, '*');
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'event') window.postMessage({ source: TAG + '-ext', type: 'event', event: msg.event, data: msg.data }, '*');
  });

  window.postMessage({ source: TAG + '-ext', type: 'hello', version: chrome.runtime.getManifest().version }, '*');
})();
