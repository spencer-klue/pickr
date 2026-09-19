// Pickr Wall — "video only" mode for pane windows.
// Runs on broadcaster sites but stays inert unless this tab is one of the wall's panes.
// It hides everything except the player and stretches it to the window. Pure CSS on the viewer's
// own machine; the stream, the player, and the login are all still the broadcaster's.
(() => {
  // an earlier copy from before an extension reload is orphaned (no runtime id); let a fresh copy take over
  const alive = () => { try { return !!chrome.runtime.id; } catch (e) { return false; } };
  if (window.__pkTheater && window.__pkTheater()) return;
  window.__pkTheater = alive;
  let isPane = false, theater = false, lead = false, audio = false, applied = null, forcedMute = false, obs = null, tick = null;
  let me = { id: null, name: '' }, gamesList = [], openIds = [], hoverAudio = false, layout = 'focus', barTimer = null;

  const send = (msg) => new Promise(r => { try { chrome.runtime.sendMessage(msg, res => { void chrome.runtime.lastError; r(res || null); }); } catch (e) { r(null); } });

  function area(el){ const r = el.getBoundingClientRect(); return r.width * r.height; }
  // a live broadcast player reports an endless duration; clip carousels and teasers do not
  const isLive = v => v.duration === Infinity || v.duration > 900 || (v.readyState === 0 && area(v) > innerWidth * innerHeight * 0.3);
  function pickPlayer(){
    const vids = [...document.querySelectorAll('video')].filter(v => { const r = v.getBoundingClientRect(); return r.width > 160 && r.height > 90; });
    let target = null;
    if (vids.length){
      vids.sort((a, b) => (isLive(b) - isLive(a)) || (area(b) - area(a)));
      target = vids[0];
      const r = target.getBoundingClientRect();
      if (!isLive(target) && r.width < innerWidth * 0.6) return null;   // just a teaser on a listing page: leave the page alone
    } else {
      // no video in this document: maybe the player lives in a big iframe
      const frames = [...document.querySelectorAll('iframe')].filter(f => area(f) > innerWidth * innerHeight * 0.25);
      if (!frames.length) return null;
      frames.sort((a, b) => area(b) - area(a));
      target = frames[0];
    }
    const base = area(target) || 1;
    const videoShaped = el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.width / r.height > 1.45 && r.width / r.height < 2.1; };
    let box = target, el = target;
    while (el.parentElement && el.parentElement !== document.body){
      const p = el.parentElement;
      // stop climbing when the wrapper stops being a player: much bigger, or no longer video-shaped (a wrapper that also holds a title/description)
      if (area(p) > base * 1.5 || !videoShaped(p)) break;
      box = p; el = p;
    }
    return { media: target, box };
  }

  function apply(){
    const pick = pickPlayer();
    if (!pick){ if (applied) restore(); bar(); noPlayer(true); return; }
    noPlayer(false);
    if (applied && applied.media === pick.media && document.contains(applied.box)) { hideStrays(applied); nudge(applied); return; }
    if (applied) restore();
    const { media, box } = pick;
    const path = []; let e = box; while (e && e !== document.body){ path.unshift(e); e = e.parentElement; }
    const state = { media, box, path, hidden: [], styled: [] };
    document.documentElement.classList.add('pk-theater');
    for (const node of path){
      state.styled.push([node, node.getAttribute('style')]);
    }
    state.styled.push([media, media.getAttribute('style')]);
    for (const node of path.slice(0, -1)){
      node.style.setProperty('position', 'static', 'important');
      node.style.setProperty('transform', 'none', 'important');
      node.style.setProperty('overflow', 'visible', 'important');
      node.style.setProperty('max-width', 'none', 'important');
      node.style.setProperty('width', 'auto', 'important');
      node.style.setProperty('margin', '0', 'important');
      node.style.setProperty('padding', '0', 'important');
    }
    Object.entries({ position: 'fixed', inset: '0', top: '0', left: '0', width: '100vw', height: '100vh', 'max-width': 'none', 'max-height': 'none', margin: '0', padding: '0', 'z-index': '2147483646', background: '#000', transform: 'none', display: 'flex', 'align-items': 'center', 'justify-content': 'center' })
      .forEach(([k, v]) => box.style.setProperty(k, v, 'important'));
    // the layers between the box and the video (aspect-ratio wrappers, padding hacks) must fill the box too
    if (media !== box){
      let e = media.parentElement;
      while (e && e !== box){ state.styled.push([e, e.getAttribute('style')]); Object.entries({ width: '100%', height: '100%', 'max-width': 'none', 'max-height': 'none', padding: '0', margin: '0', position: 'relative', top: '0', left: '0', transform: 'none' }).forEach(([k, v]) => e.style.setProperty(k, v, 'important')); e = e.parentElement; }
      Object.entries({ width: '100%', height: '100%', 'object-fit': 'contain', 'max-width': 'none', 'max-height': 'none', top: '0', left: '0', margin: '0' })
        .forEach(([k, v]) => media.style.setProperty(k, v, 'important'));
    }
    applied = state;
    hideStrays(state);
    nudge(state);
  }
  function hideStrays(state){
    const chain = new Set(state.path);
    let parent = document.body;
    for (const node of state.path){
      for (const sib of parent.children){
        if (chain.has(sib) || /^(SCRIPT|STYLE|LINK|NOSCRIPT)$/.test(sib.tagName) || sib.hasAttribute('data-pk-hidden')) continue;
        sib.setAttribute('data-pk-hidden', sib.style.getPropertyValue('display') || '');
        sib.style.setProperty('display', 'none', 'important');
        state.hidden.push(sib);
      }
      parent = node;
    }
  }
  // Chrome lets a script unmute a player only after the viewer has clicked somewhere in the page (sticky activation).
  // Before that, an unmute attempt pauses the video. So: unmute freely once the page has been clicked; otherwise
  // offer one "Click for sound" button whose click unmutes every player on the page.
  const activated = () => !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
  const allVideos = () => [...document.querySelectorAll('video')];
  function unmuteAll(){
    for (const v of allVideos()){ try { v.muted = false; if (v.volume === 0) v.volume = 1; if (v.paused && !v.ended) v.play().catch(() => {}); } catch (e) {} }
    forcedMute = false;
  }
  function nudge(state){
    const v = state.media;
    if (v.tagName !== 'VIDEO') return;
    if (v.paused && !v.ended && !v.__pkUserPaused){
      v.play().catch(() => { if (!v.muted){ forcedMute = true; v.muted = true; v.play().catch(() => {}); } });
    }
    const anyMuted = allVideos().some(x => x.muted && x.getBoundingClientRect().width > 160);
    if (audio && anyMuted && activated()) unmuteAll();          // sound is ours and the page has been clicked before: just unmute
    if (!audio && forcedMute && !v.muted) v.muted = true;        // a pane we force-muted stays quiet while silent (the tab is muted too)
    soundButton(audio && anyMuted && !activated(), v);           // sound is ours but Chrome still needs one click here
    bar();
  }
  function soundButton(show, v){
    let b = document.getElementById('pk-sound');
    if (!show){ if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement('button'); b.id = 'pk-sound'; b.type = 'button'; b.textContent = '🔊  Click once for sound';
    Object.assign(b.style, { position: 'fixed', left: '50%', bottom: '12%', transform: 'translateX(-50%)', zIndex: '2147483647', font: '600 20px/1 system-ui, sans-serif', color: '#fff', background: 'rgba(224,38,46,.95)', border: '0', borderRadius: '10px', padding: '14px 22px', cursor: 'pointer', boxShadow: '0 6px 24px rgba(0,0,0,.5)' });
    b.addEventListener('click', () => { unmuteAll(); b.remove(); });
    (document.body || document.documentElement).appendChild(b);
  }
  // ---- pane control bar: appears when the mouse comes to the top of the pane, hides itself after a moment ----
  function speaker(){ bar(); }
  function el(tag, style, text){ const e = document.createElement(tag); Object.assign(e.style, style); if (text != null) e.textContent = text; return e; }
  const BTN = { font: '600 14px/1 system-ui, sans-serif', color: '#fff', background: 'rgba(255,255,255,.12)', border: '0', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer', whiteSpace: 'nowrap' };
  function bar(){
    if (!isPane){ const old = document.getElementById('pk-bar'); if (old) old.remove(); return; }
    let b = document.getElementById('pk-bar');
    if (!b){
      b = el('div', { position: 'fixed', top: '0', left: '0', right: '0', zIndex: '2147483647', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: 'linear-gradient(rgba(0,0,0,.85), rgba(0,0,0,0))', font: '600 14px/1 system-ui, sans-serif', color: '#fff', opacity: '0', transition: 'opacity .2s', pointerEvents: 'none' });
      b.id = 'pk-bar';
      const sel = el('select', Object.assign({}, BTN, { maxWidth: '46%', appearance: 'auto', background: 'rgba(30,30,30,.95)' })); sel.id = 'pk-sel'; sel.title = 'Show a different game in this pane';
      sel.addEventListener('change', () => { const gid = sel.value; if (gid && gid !== me.id) send({ cmd: 'switch-here', gameId: gid }); show(); });
      const snd = el('button', BTN, '🔇'); snd.id = 'pk-snd'; snd.title = 'Play sound from this pane';
      snd.addEventListener('click', () => { unmuteAll(); audio = true; paint(); send({ cmd: 'audio-here' }); });
      const star = el('button', BTN, '★ main'); star.id = 'pk-star'; star.title = 'Make this the main screen';
      star.addEventListener('click', () => { lead = true; paint(); send({ cmd: 'lead-here' }); });
      const x = el('button', BTN, '✕'); x.title = 'Close this pane';
      x.addEventListener('click', () => send({ cmd: 'close-here' }));
      const spacer = el('span', { flex: '1' });
      const name = el('span', { opacity: '.8', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }); name.id = 'pk-name';
      [sel, snd, star, name, spacer, x].forEach(c => { c.style.pointerEvents = 'auto'; b.appendChild(c); });
      (document.body || document.documentElement).appendChild(b);
      // reveal on mouse near the top, or any movement; hide after 2.5 s of stillness
      document.addEventListener('mousemove', ev => { if (ev.clientY < 90) show(); }, { passive: true });
      b.addEventListener('mouseenter', show);
    }
    paint();
  }
  function show(){ const b = document.getElementById('pk-bar'); if (!b) return; b.style.opacity = '1'; clearTimeout(barTimer); barTimer = setTimeout(() => { if (document.activeElement && document.activeElement.id === 'pk-sel') { show(); return; } b.style.opacity = '0'; }, 2500); }
  function paint(){
    const b = document.getElementById('pk-bar'); if (!b) return;
    const snd = document.getElementById('pk-snd'), star = document.getElementById('pk-star'), sel = document.getElementById('pk-sel'), name = document.getElementById('pk-name');
    snd.textContent = audio ? '🔊 sound here' : '🔇'; snd.style.background = audio ? 'rgba(224,38,46,.95)' : BTN.background;
    star.textContent = lead ? '★ main' : '☆ make main'; star.style.background = lead ? 'rgba(240,169,46,.9)' : BTN.background; star.style.display = layout === 'grid' ? 'none' : '';
    name.textContent = me.name || '';
    const sig = gamesList.map(g => g.id + g.detail).join() + '|' + me.id + '|' + openIds.join();
    if (sel.dataset.sig !== sig){
      sel.dataset.sig = sig; sel.innerHTML = '';
      const live = gamesList.filter(g => g.state === 'in'), pre = gamesList.filter(g => g.state !== 'in');
      const grp = (label, arr) => { if (!arr.length) return; const og = document.createElement('optgroup'); og.label = label; for (const g of arr){ const o = document.createElement('option'); o.value = g.id; const onWall = g.id !== me.id && openIds.includes(g.id); o.textContent = `${g.rz ? '🔴 ' : ''}${g.name} · ${g.detail}${g.net ? ' · ' + g.net : ''}${onWall ? ' · on wall' : g.ok === false ? ' · can’t watch here' : ''}`; if (g.id === me.id) o.selected = true; if (onWall || g.ok === false) o.disabled = true; og.appendChild(o); } sel.appendChild(og); };
      grp('Live', live); grp('Up next', pre);
    }
  }
  // hover-to-hear: sound follows the mouse when that mode is on (no click, so a site-muted player still needs its first click)
  let hoverT = null;
  document.addEventListener('mouseenter', () => { if (!isPane || !hoverAudio || audio) return; clearTimeout(hoverT); hoverT = setTimeout(() => { audio = true; if (activated()) unmuteAll(); paint(); send({ cmd: 'audio-here' }); }, 350); }, true);
  document.addEventListener('mouseleave', () => clearTimeout(hoverT), true);

  function noPlayer(show){
    let n = document.getElementById('pk-noplayer');
    if (!show){ if (n) n.remove(); return; }
    if (n || !isPane) return;
    n = el('div', { position: 'fixed', left: '50%', bottom: '10%', transform: 'translateX(-50%)', zIndex: '2147483647', font: '600 16px/1.3 system-ui, sans-serif', color: '#fff', background: 'rgba(0,0,0,.8)', border: '1px solid rgba(255,255,255,.25)', borderRadius: '10px', padding: '12px 16px', maxWidth: '80%', textAlign: 'center' }, 'No live player on this page. Move the mouse to the top of the pane and pick another game.');
    n.id = 'pk-noplayer'; (document.body || document.documentElement).appendChild(n);
  }
  function restore(){
    const np = document.getElementById('pk-noplayer'); if (np) np.remove();
    for (const id of ['pk-bar', 'pk-sound']) { const e = document.getElementById(id); if (e) e.remove(); }
    if (!applied) return;
    for (const el of applied.hidden){ const prev = el.getAttribute('data-pk-hidden'); el.removeAttribute('data-pk-hidden'); if (prev) el.style.setProperty('display', prev); else el.style.removeProperty('display'); }
    for (const [el, css] of applied.styled){ if (css === null) el.removeAttribute('style'); else el.setAttribute('style', css); }
    document.documentElement.classList.remove('pk-theater');
    applied = null;
  }
  function ensureStyle(){
    if (document.getElementById('pk-theater-style')) return;
    const s = document.createElement('style'); s.id = 'pk-theater-style';
    s.textContent = 'html.pk-theater, html.pk-theater body { overflow: hidden !important; background: #000 !important; scrollbar-width: none !important; } html.pk-theater ::-webkit-scrollbar { display: none !important; }';
    (document.head || document.documentElement).appendChild(s);
  }
  function setMode(on){
    theater = on;
    if (on){
      ensureStyle(); apply();
      if (!obs){ obs = new MutationObserver(() => { clearTimeout(tick); tick = setTimeout(() => { if (theater) apply(); }, 400); }); obs.observe(document.body || document.documentElement, { childList: true, subtree: true }); }
    } else {
      if (obs){ obs.disconnect(); obs = null; }
      restore();
    }
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== 'pane') return;
    isPane = true;
    if (typeof msg.lead === 'boolean') lead = msg.lead;
    if (typeof msg.audio === 'boolean'){ audio = msg.audio; if (audio && activated()) unmuteAll(); }
    if (msg.id) me = { id: msg.id, name: msg.name || '' };
    if (Array.isArray(msg.games)) gamesList = msg.games;
    if (Array.isArray(msg.open)) openIds = msg.open;
    if (typeof msg.hoverAudio === 'boolean') hoverAudio = msg.hoverAudio;
    if (msg.layout) layout = msg.layout;
    if (typeof msg.theater === 'boolean' && msg.theater !== theater) setMode(msg.theater);
    bar();
    if (applied) nudge(applied);
  });

  // Ask whether this tab is a pane; keep asking for a while, because the wall may register us a moment after we load
  let hellos = 0;
  const hello = () => send({ cmd: 'pane-hello' }).then(res => {
    if (!res || !res.isPane) return;
    isPane = true; lead = !!res.lead; audio = !!res.audio;
    if (res.id) me = { id: res.id, name: res.name || '' };
    if (Array.isArray(res.games)) gamesList = res.games;
    if (Array.isArray(res.open)) openIds = res.open;
    if (typeof res.hoverAudio === 'boolean') hoverAudio = res.hoverAudio;
    if (res.layout) layout = res.layout;
    if (typeof res.theater === 'boolean' && res.theater !== theater) setMode(res.theater);
    bar();
  });
  hello();
  const helloTimer = setInterval(() => { hellos++; if (!isPane) hello(); if (hellos > 30) clearInterval(helloTimer); }, 4000);
  // players load late; keep re-applying for a while even without DOM mutations
  let n = 0; const t = setInterval(() => { if (theater) apply(); if (++n > 60) clearInterval(t); }, 1500);
})();
