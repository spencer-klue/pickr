// Pickr Wall — service worker.
// Owns the pane windows: creates them, tiles them, swaps the lead slot, moves audio.
// The video is always the broadcaster's own page in the viewer's own login; nothing here touches it.

const KEY = 'wall';
const empty = () => ({ panes: {}, order: [], leadId: null, layout: 'focus', region: null, boardTabId: null, boardWindowId: null, focusLead: true, theater: true, paneStyle: 'popup', audioId: null, audioLock: false, boardMode: 'hidden', games: [], hoverAudio: false, boardPrev: null });

// Persistent (storage.local) so an extension reload keeps the panes it opened; windows outlive the worker.
async function getState() {
  const o = await chrome.storage.local.get(KEY);
  const s = Object.assign(empty(), o[KEY] || {});
  // drop panes whose window is gone
  for (const id of Object.keys(s.panes)) {
    try { await chrome.windows.get(s.panes[id].windowId); } catch (e) { delete s.panes[id]; }
  }
  s.order = s.order.filter(id => s.panes[id]);
  if (s.leadId && !s.panes[s.leadId]) s.leadId = s.order[0] || null;
  return s;
}
async function setState(s) { await chrome.storage.local.set({ [KEY]: s }); }

// After an install or reload, pages already open in pane windows have lost their content script. Put it back.
async function reattachPanes() {
  const s = await getState();
  for (const id of s.order) {
    const p = s.panes[id]; if (!p || p.tabId == null) continue;
    try { await chrome.scripting.executeScript({ target: { tabId: p.tabId, allFrames: true }, files: ['theater.js'] }); } catch (e) {}
  }
  await setState(s);
  await broadcastPanes(s);
}
chrome.runtime.onInstalled.addListener(() => { reattachPanes(); });
chrome.runtime.onStartup.addListener(() => { reattachPanes(); });

// ---- geometry ----
function slots(layout, n, region) {
  const { left, top, width, height } = region;
  const out = [];
  if (n <= 0) return out;
  if (n === 1) return [{ left, top, width, height }];
  if (layout === 'grid') {
    // pick the column count that keeps each pane closest to 16:9 on this screen
    let best = { cols: 1, score: -1 };
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      const score = Math.min((width / cols) * 9 / 16, height / rows);   // visible video height per pane
      if (score > best.score) best = { cols, score };
    }
    const cols = best.cols, rows = Math.ceil(n / cols);
    const w = Math.floor(width / cols), h = Math.floor(height / rows);
    for (let i = 0; i < n; i++) out.push({ left: left + (i % cols) * w, top: top + Math.floor(i / cols) * h, width: w, height: h });
    return out;
  }
  // focus: one main screen on the left; side screens on the right, one column for 1-2, two columns for 3+
  const side = n - 1;
  const cols = side <= 2 ? 1 : 2;
  const rows = Math.ceil(side / cols);
  const railW = Math.floor(width * (cols === 2 ? 0.45 : 0.38));
  const bigW = width - railW;
  out.push({ left, top, width: bigW, height });
  const sw = Math.floor(railW / cols), sh = Math.floor(height / rows);
  for (let i = 0; i < side; i++) out.push({ left: left + bigW + (i % cols) * sw, top: top + Math.floor(i / cols) * sh, width: sw, height: sh });
  return out;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function place(p, g) {
  return chrome.windows.update(p.windowId, { left: g.left, top: g.top, width: g.width, height: g.height, state: 'normal' });
}
function audioTarget(s) { return (s.audioLock && s.audioId && s.panes[s.audioId]) ? s.audioId : s.leadId; }
function paneRegion(s) {
  // when the board lives on the wall it takes a strip on the right; panes get the rest
  const R = s.region || { left: 0, top: 0, width: 1920, height: 1080 };
  if (s.boardMode !== 'strip' || !s.boardWindowId) return { region: R, board: null };
  const bw = Math.max(560, Math.round(R.width * 0.22));
  return { region: { left: R.left, top: R.top, width: R.width - bw, height: R.height }, board: { left: R.left + R.width - bw, top: R.top, width: bw, height: R.height } };
}
async function restoreBoard(s) {
  const p = s.boardPrev; s.boardPrev = null;
  if (!p || !s.boardWindowId) return;
  try { await chrome.windows.update(s.boardWindowId, p.state === 'maximized' ? { state: 'maximized' } : { left: p.left, top: p.top, width: p.width, height: p.height, state: 'normal' }); } catch (e) {}
}
async function applyLayout(s) {
  const ids = s.order.filter(id => s.panes[id]);
  const { region, board } = paneRegion(s);
  if (board) {
    try {
      if (!s.boardPrev) { const w = await chrome.windows.get(s.boardWindowId); s.boardPrev = { left: w.left, top: w.top, width: w.width, height: w.height, state: w.state }; }
      await chrome.windows.update(s.boardWindowId, { left: board.left, top: board.top, width: board.width, height: board.height, state: 'normal' });
    } catch (e) { s.boardWindowId = null; }
  } else if (s.boardPrev && s.boardWindowId) {
    await restoreBoard(s);
  }
  const geo = slots(s.layout, ids.length, region);
  for (let i = 0; i < ids.length; i++) {
    try { await place(s.panes[ids[i]], geo[i]); } catch (e) { delete s.panes[ids[i]]; }
  }
  // a window still being created can ignore its first move; verify once and nudge the stragglers
  await sleep(350);
  for (let i = 0; i < ids.length; i++) {
    const p = s.panes[ids[i]]; if (!p) continue;
    try {
      const w = await chrome.windows.get(p.windowId);
      const g = geo[i];
      if (Math.abs(w.left - g.left) > 2 || Math.abs(w.top - g.top) > 2 || Math.abs(w.width - g.width) > 2 || Math.abs(w.height - g.height) > 2) await place(p, g);
    } catch (e) {}
  }
  // exactly one pane plays: the lead, unless the viewer locked sound to another pane
  const aud = audioTarget(s);
  for (const id of ids) {
    const p = s.panes[id]; if (!p) continue;
    try { await chrome.tabs.update(p.tabId, { muted: id !== aud }); } catch (e) {}
  }
  s.order = s.order.filter(id => s.panes[id]);
  await broadcastPanes(s);
}
function paneMsg(s, id) {
  const aud = audioTarget(s);
  return { type: 'pane', id, name: s.panes[id] && s.panes[id].name, lead: id === s.leadId, audio: id === aud, theater: !!s.theater, hoverAudio: !!s.hoverAudio, layout: s.layout, games: s.games || [], open: s.order.slice() };
}
async function broadcastPanes(s) {
  for (const id of s.order) {
    const p = s.panes[id]; if (!p || p.tabId == null) continue;
    try { await chrome.tabs.sendMessage(p.tabId, paneMsg(s, id)); } catch (e) {}
  }
}
function paneIdOf(s, sender) {
  const tabId = sender.tab && sender.tab.id, winId = sender.tab && sender.tab.windowId;
  return Object.keys(s.panes).find(k => s.panes[k].tabId === tabId) || Object.keys(s.panes).find(k => s.panes[k].windowId === winId) || null;
}
async function tellBoard(s) {
  if (!s.boardTabId) return;
  try { await chrome.tabs.sendMessage(s.boardTabId, { type: 'event', event: 'wall', data: summary(s) }); } catch (e) {}
}
// point an existing pane at a different game (same window, new page); the pane takes the new game's id
async function switchPane(s, fromId, game) {
  const p = s.panes[fromId]; if (!p || !game || !game.url) return;
  if (game.id !== fromId && s.panes[game.id]) return;   // that game already has a pane
  try { await chrome.tabs.update(p.tabId, { url: game.url }); } catch (e) { return; }
  const rec = Object.assign({}, p, { name: game.name, url: game.url, net: game.net });
  delete s.panes[fromId]; s.panes[game.id] = rec;
  s.order = s.order.map(id => id === fromId ? game.id : id);
  if (s.leadId === fromId) s.leadId = game.id;
  if (s.audioId === fromId) s.audioId = game.id;
}

async function openPane(s, game) {
  const g = slots(s.layout, Math.max(1, s.order.length + 1), paneRegion(s).region);
  const slot = g[g.length - 1];
  const win = await chrome.windows.create({ url: game.url, type: s.paneStyle === 'normal' ? 'normal' : 'popup', focused: false, left: slot.left, top: slot.top, width: slot.width, height: slot.height });
  let tab = win.tabs && win.tabs[0];
  if (!tab) { try { tab = (await chrome.tabs.query({ windowId: win.id }))[0]; } catch (e) {} }
  s.panes[game.id] = { windowId: win.id, tabId: tab ? tab.id : null, name: game.name, url: game.url, net: game.net };
  s.order.push(game.id);
}

async function setLead(s, id) {
  if (!s.panes[id]) return;
  const i = s.order.indexOf(id);
  if (i > 0) { s.order.splice(i, 1); s.order.unshift(id); }
  s.leadId = id;
  await applyLayout(s);
  if (s.focusLead) { try { await chrome.windows.update(s.panes[id].windowId, { focused: true }); } catch (e) {} }
}

function summary(s) {
  return { open: s.order.map(id => ({ id, name: s.panes[id].name, net: s.panes[id].net, url: s.panes[id].url })), leadId: s.leadId, audioId: audioTarget(s), audioLock: !!s.audioLock, boardMode: s.boardMode, layout: s.layout };
}

async function notifyBoard(s, event, data) {
  if (!s.boardTabId) return;
  try { await chrome.tabs.sendMessage(s.boardTabId, { type: 'event', event, data }); } catch (e) {}
}

// ---- commands from the board ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
   try {
    const s = await getState();
    const fromPane = /^(pane-hello|audio-here|lead-here|close-here|switch-here)$/.test(msg.cmd);
    if (sender.tab && !fromPane) { s.boardTabId = sender.tab.id; s.boardWindowId = sender.tab.windowId; }
    const p = msg.payload || {};
    if (Array.isArray(p.catalog)) s.games = p.catalog.slice(0, 80);
    if (typeof p.hoverAudio === 'boolean') s.hoverAudio = p.hoverAudio;
    if (p.region) s.region = p.region;
    if (p.layout) s.layout = p.layout;
    if (typeof p.focusLead === 'boolean') s.focusLead = p.focusLead;
    if (p.paneStyle) s.paneStyle = p.paneStyle;
    if (p.boardMode) s.boardMode = p.boardMode;
    let theaterChanged = false;
    if (typeof p.theater === 'boolean' && p.theater !== s.theater) { s.theater = p.theater; theaterChanged = true; }

    switch (msg.cmd) {
      case 'pane-hello': {
        // a broadcaster page asking whether it is one of our panes
        const tabId = sender.tab && sender.tab.id, winId = sender.tab && sender.tab.windowId;
        let id = Object.keys(s.panes).find(k => s.panes[k].tabId === tabId);
        if (!id && winId != null) { id = Object.keys(s.panes).find(k => s.panes[k].windowId === winId); if (id) { s.panes[id].tabId = tabId; await setState(s); } }
        sendResponse(id ? Object.assign({ isPane: true }, paneMsg(s, id)) : { isPane: false });
        return;
      }
      case 'status': { await broadcastPanes(s); break; }
      case 'open': {
        // p.games: [{id,url,name,net}] in priority order; p.lead: id
        for (const g of p.games || []) {
          if (!s.panes[g.id]) await openPane(s, g);
          else if (g.url && s.panes[g.id].url !== g.url) { try { await chrome.tabs.update(s.panes[g.id].tabId, { url: g.url }); s.panes[g.id].url = g.url; s.panes[g.id].net = g.net; } catch (e) {} }
        }
        // drop panes no longer wanted
        const keep = new Set((p.games || []).map(g => g.id));
        for (const id of [...s.order]) if (!keep.has(id)) { try { await chrome.windows.remove(s.panes[id].windowId); } catch (e) {} delete s.panes[id]; }
        s.order = s.order.filter(id => s.panes[id]);
        s.leadId = p.lead && s.panes[p.lead] ? p.lead : s.order[0] || null;
        if (s.leadId) await setLead(s, s.leadId); else await applyLayout(s);
        break;
      }
      case 'lead': {
        if (p.game && !s.panes[p.game.id]) {
          await openPane(s, p.game);
          if (p.max && s.order.length > p.max) {
            // evict the coldest non-lead pane (last in the given order)
            const victim = (p.evict || []).find(id => s.panes[id] && id !== p.game.id);
            if (victim) { try { await chrome.windows.remove(s.panes[victim].windowId); } catch (e) {} delete s.panes[victim]; s.order = s.order.filter(x => x !== victim); }
          }
        }
        if (p.game) await setLead(s, p.game.id);
        break;
      }
      case 'audio': {           // board: play sound from this pane, and keep it there
        if (p.id && s.panes[p.id]) { s.audioId = p.id; s.audioLock = true; }
        await applyLayout(s); break;
      }
      case 'audio-follow': {    // board: sound goes back to following the lead
        s.audioLock = false; s.audioId = s.leadId;
        await applyLayout(s); break;
      }
      case 'audio-here': {      // a pane's own speaker button (or hover, when hover-audio is on)
        const id = paneIdOf(s, sender);
        if (id && audioTarget(s) !== id) { s.audioId = id; s.audioLock = true; await applyLayout(s); }
        await setState(s); await tellBoard(s);
        sendResponse({ ok: !!id }); return;
      }
      case 'lead-here': {       // a pane's star: make this the main screen
        const id = paneIdOf(s, sender);
        if (id) await setLead(s, id);
        await setState(s); await tellBoard(s);
        sendResponse({ ok: !!id }); return;
      }
      case 'close-here': {      // a pane's close
        const id = paneIdOf(s, sender);
        if (id) { try { await chrome.windows.remove(s.panes[id].windowId); } catch (e) {} delete s.panes[id]; s.order = s.order.filter(x => x !== id); if (s.leadId === id) s.leadId = s.order[0] || null; await applyLayout(s); }
        await setState(s); await tellBoard(s);
        sendResponse({ ok: !!id }); return;
      }
      case 'switch-here': {     // a pane's dropdown: show a different game here
        const id = paneIdOf(s, sender);
        const game = (s.games || []).find(g => g.id === p.gameId);
        if (id && game) { await switchPane(s, id, game); await applyLayout(s); }
        await setState(s); await tellBoard(s);
        sendResponse({ ok: !!(id && game) }); return;
      }
      case 'switch': {          // board: change pane p.from to game p.game
        if (p.from && p.game) { await switchPane(s, p.from, p.game); await applyLayout(s); }
        break;
      }
      case 'add': {             // board: one more pane
        if (p.game && !s.panes[p.game.id]) { await openPane(s, p.game); if (!s.leadId) s.leadId = p.game.id; await applyLayout(s); }
        break;
      }
      case 'remove': {          // board: close one pane
        if (p.id && s.panes[p.id]) { try { await chrome.windows.remove(s.panes[p.id].windowId); } catch (e) {} delete s.panes[p.id]; s.order = s.order.filter(x => x !== p.id); if (s.leadId === p.id) s.leadId = s.order[0] || null; await applyLayout(s); }
        break;
      }
      case 'relayout': { if (s.leadId) await setLead(s, s.leadId); else await applyLayout(s); break; }
      case 'close': {
        for (const id of s.order) { try { await chrome.windows.remove(s.panes[id].windowId); } catch (e) {} }
        s.panes = {}; s.order = []; s.leadId = null;
        await restoreBoard(s);
        break;
      }
    }
    await setState(s);
    sendResponse(summary(s));
   } catch (e) {
    console.error('pickr wall:', msg && msg.cmd, e);
    try { sendResponse({ error: String(e && e.message || e) }); } catch (e2) {}
   }
  })();
  return true; // async sendResponse
});

// a viewer closing a pane by hand
chrome.windows.onRemoved.addListener(async (windowId) => {
  // read the raw record: the validating getState() would already have dropped this window
  const raw = (await chrome.storage.local.get(KEY))[KEY];
  if (!raw || !Object.keys(raw.panes || {}).some(k => raw.panes[k].windowId === windowId)) return;
  const s = await getState();
  const id = Object.keys(raw.panes).find(k => raw.panes[k].windowId === windowId);
  delete s.panes[id];
  s.order = s.order.filter(x => x !== id);
  if (s.leadId === id) s.leadId = s.order[0] || null;
  await applyLayout(s);
  await setState(s);
  await notifyBoard(s, 'wall', summary(s));
});
