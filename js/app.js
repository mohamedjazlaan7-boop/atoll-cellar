/* ============ Atoll Cellar — sign-in, setup, saving and start-up ============ */
'use strict';

const App = {
  mode: null,            // 'cloud' (online, shared with the team), 'local' (this device only) or 'demo'
  pid: null, role: 'owner', name: '', email: '', list: [],
  base: {}, ver: {},     // what the server last had, per data section, and its version number
  status: 'saved', pushing: false, again: false, timer: null, retry: null, poller: null, cacheT: null,
  pendingRender: false, team: null,
};
const DEMO_KEY = 'atoll-cellar-demo-v2';
const ROLE_LABEL = { owner: 'Owner', manager: 'Manager', staff: 'Staff' };

function isMgr() { return App.mode !== 'cloud' || App.role === 'owner' || App.role === 'manager'; }
const isDemo = () => App.mode === 'demo';
const isCloud = () => App.mode === 'cloud';
// the name stored on records someone creates (losses, counts, transfers)
function me(forField) { if (isCloud()) { const n = (App.email || '').split('@')[0]; return n ? n.charAt(0).toUpperCase() + n.slice(1) : 'Team member'; } return forField ? '' : 'You'; }

/* ---------------- saving ---------------- */
function save() {
  if (!S) return;
  if (App.mode === 'demo') { try { localStorage.setItem(DEMO_KEY, JSON.stringify(S)); } catch (e) { } return; }
  if (App.mode === 'local') { KV.set('doc:local', S); setStatus('local'); return; }
  if (App.mode === 'cloud') { cacheDoc(); clearTimeout(App.timer); App.timer = setTimeout(push, 600); setStatus(App.status === 'offline' ? 'offline' : 'saving'); }
}
function saveUI() { try { localStorage.setItem('atoll-cellar-ui:' + (App.pid || App.mode), JSON.stringify({ prop: UI.prop, route: UI.route })); } catch (e) { } }
function cacheDoc(now) {
  if (!isCloud()) return Promise.resolve(); clearTimeout(App.cacheT);
  const run = () => KV.set('doc:' + App.pid, { base: App.base, ver: App.ver, local: S, name: App.name, role: App.role, email: App.email, at: Date.now() });
  if (now) return run(); App.cacheT = setTimeout(run, 300); return Promise.resolve();
}
function changedSections() {
  const cur = splitState(S); const out = [];
  for (const [sec, data] of Object.entries(cur)) if (!same(data, App.base[sec])) out.push({ section: sec, data, base: App.ver[sec] || 0 });
  return out;
}
async function push() {
  if (!isCloud()) return;
  if (App.pushing) { App.again = true; return; }
  App.pushing = true; clearTimeout(App.retry);
  try {
    for (let round = 0; round < 6; round++) {
      let changes = changedSections();
      if (!isMgr()) {
        // staff cannot change setup or prices: put back anything that slipped through
        const blocked = changes.filter(c => MGR_SECTIONS.has(c.section));
        if (blocked.length) { blocked.forEach(c => setSection(S, c.section, clone(App.base[c.section]))); reindex(); softRender(); }
        changes = changes.filter(c => !MGR_SECTIONS.has(c.section));
      }
      if (!changes.length) { setStatus('saved'); break; }
      setStatus('saving'); await cacheDoc(true);
      const res = await Cloud.rpc('save_sections', { p_id: App.pid, p_changes: changes });
      if (res && res.ok) {
        // record straight away what the server now has, so a reload never sends it twice
        for (const c of changes) { App.base[c.section] = clone(c.data); App.ver[c.section] = res.versions[c.section]; }
        await cacheDoc(true); continue;
      }
      // someone else saved first: merge their version with ours, then try again
      for (const c of (res && res.conflicts) || []) mergeIn(c.section, c.data, c.version);
      reindex(); softRender();
    }
  } catch (e) { onSyncError(e); }
  finally {
    App.pushing = false; await cacheDoc(true);
    if (App.again) { App.again = false; push(); }
  }
}
function mergeIn(sec, remote, version) {
  const local = splitState(S)[sec];
  const merged = merge3(App.base[sec], local, remote, sec === 'stock');
  App.base[sec] = clone(remote); App.ver[sec] = version;
  setSection(S, sec, merged === undefined ? (sec.startsWith('sales:') ? [] : {}) : merged);
}
function onSyncError(e) {
  if (e && e.offline) { setStatus('offline'); App.retry = setTimeout(push, 15000); return; }
  if (e && e.auth) { setStatus('error'); toast('You have been signed out. Sign in again to keep saving.'); return; }
  if (e && (e.code === '42501' || e.status === 403)) {
    // not allowed: drop the change and reload what the server has
    toast(e.message || 'You do not have permission for that change.'); setStatus('error');
    pull(true); return;
  }
  setStatus('error'); App.retry = setTimeout(push, 20000);
  console.warn('Save failed', e);
}
// fetch whatever the team changed since we last looked
async function pull(force) {
  if (!isCloud() || App.pushing || (!force && document.hidden)) return;
  try {
    const v = await Cloud.rpc('section_versions', { p_id: App.pid }) || {};
    const changed = Object.keys(v).filter(k => v[k] !== App.ver[k]);
    if (!changed.length) { if (App.status === 'offline') setStatus(changedSections().length ? 'saving' : 'saved'); if (App.status !== 'saved') push(); return; }
    const got = await Cloud.rpc('get_sections', { p_id: App.pid, p_names: changed }) || {};
    for (const [sec, x] of Object.entries(got)) mergeIn(sec, x.data, x.version);
    normalizeState(S); reindex(); await cacheDoc(true); softRender();
    if (changedSections().length) push(); else setStatus('saved');
  } catch (e) { if (e.offline) setStatus('offline'); else if (e.code === '42501') { toast('You no longer have access to this portfolio.'); signOutNow(); } }
}
function setStatus(s) { App.status = s; const el = document.getElementById('syncPill'); if (el) el.innerHTML = syncPill(); }
function syncPill() {
  const m = { saved: ['Saved', 'good', 'Everything is saved online'], saving: ['Saving…', 'info', 'Saving your changes'], offline: ['Offline', 'warn', 'No connection. Changes are kept on this device and saved when you are back online.'], error: ['Not saved yet', 'bad', 'Saving failed. It will try again.'], local: ['On this device', 'plain', 'Saved in this browser only'], demo: ['Demo', 'plain', 'Sample data, kept in this browser'] };
  const [t, c, tip] = m[isDemo() ? 'demo' : App.mode === 'local' ? 'local' : App.status] || m.saved;
  return `<span class="pill ${c}" title="${esc(tip)}">${t}</span>`;
}
// re-draw after a change from the team, but never under someone's fingers
function softRender() {
  if (!S || !document.getElementById('view')) return;
  const ae = document.activeElement; const typing = ae && ae.closest && ae.closest('#view') && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName);
  if (!$('#modal').hidden || !$('#guestFull').hidden || typing) { App.pendingRender = true; return; }
  App.pendingRender = false; render();
}
document.addEventListener('focusout', () => setTimeout(() => { if (App.pendingRender) softRender(); }, 80));
window.addEventListener('online', () => { if (isCloud()) { push(); pull(true); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && isCloud()) pull(); });
window.addEventListener('beforeunload', e => { if (isCloud() && (App.pushing || App.status === 'saving')) { cacheDoc(true); e.preventDefault(); e.returnValue = ''; } });
{ const _close = closeModal; closeModal = function () { _close(); if (App.pendingRender) setTimeout(softRender, 0); }; }

/* ---------------- shell pieces used by the views ---------------- */
function accountBox() {
  if (isDemo()) return `<div class="acct"><div class="acct-name">Demo</div><div class="acct-sub">Two fictional resorts with sample history. Changes stay in this browser.</div><div class="acct-btns"><button type="button" class="btn sm" data-act="ac-exit-demo">Exit demo</button></div></div>`;
  if (App.mode === 'local') return `<div class="acct"><div class="acct-name">This device</div><div class="acct-sub">Saved in this browser only.${Cloud.enabled ? ' Sign in to share it with your team.' : ''}</div>${Cloud.enabled ? '<div class="acct-btns"><button type="button" class="btn sm" data-act="ac-to-cloud">Sign in</button></div>' : ''}</div>`;
  return `<div class="acct"><div class="acct-name" title="${esc(App.email)}">${esc(App.email)}</div><div class="acct-sub">${ROLE_LABEL[App.role] || ''} · ${esc(App.name)}</div><div class="acct-btns">${App.list.length > 1 ? '<button type="button" class="btn sm" data-act="ac-switch">Switch</button>' : ''}<button type="button" class="btn sm" data-act="ac-signout">Sign out</button></div></div>`;
}
function modeBanner() {
  if (!isDemo()) return '';
  return `<div class="banner"><span><b>Demo.</b> Two fictional resorts with 60 days of sample history. Nothing you do here touches your own data.</span><button type="button" class="btn sm" data-act="ac-exit-demo">Exit demo</button></div>`;
}
function accountPanel() {
  if (isDemo()) return '';
  if (App.mode === 'local') return panel('This device', `<p class="note" style="margin-top:0">You are using Atoll Cellar without a login, so everything is saved in this browser only and your team cannot see it.${Cloud.enabled ? ' Sign in or create an account to move it online. You can upload this setup when you create your account.' : ' To give your team their own logins, connect the online database. The setup guide in the project explains how.'}</p><div class="row">${Cloud.enabled ? '<button type="button" class="btn primary" data-act="ac-to-cloud">Sign in or create an account</button>' : ''}<button type="button" class="btn danger" data-act="ac-wipe">Delete everything on this device</button></div>`);
  return panel('Account', `<form class="stack" style="gap:12px" data-form="ac-rename"><div class="field"><label for="ac-name">Portfolio name, shown when you sign in</label><div class="row"><input class="inp" id="ac-name" value="${esc(App.name)}" style="flex:1" ${isMgr() ? '' : 'disabled'}>${isMgr() ? '<button class="btn" type="submit">Rename</button>' : ''}</div></div></form>
  <form class="stack" style="gap:12px;margin-top:14px" data-form="ac-pass"><div class="field"><label for="ac-pass">New password for ${esc(App.email)}</label><div class="row"><input class="inp" id="ac-pass" type="password" minlength="8" autocomplete="new-password" placeholder="At least 8 characters" style="flex:1"><button class="btn" type="submit">Change password</button></div></div></form>
  <div class="row" style="margin-top:14px"><button type="button" class="btn" data-act="ac-signout">Sign out</button></div>`, { hint: `${ROLE_LABEL[App.role]} · signed in as ${esc(App.email)}` });
}
function noOutlets() {
  return `<div class="panel"><div class="empty stack" style="align-items:center"><p style="margin:0">${esc(curP().name)} has no outlets yet.</p>${isMgr() ? '<button type="button" class="btn primary" data-act="go" data-arg="setup">Add an outlet</button>' : ''}</div></div>`;
}

/* ---------------- screens before the app opens ---------------- */
function showGate(html) { $('#app').hidden = true; const g = $('#gate'); g.innerHTML = html; g.hidden = false; window.scrollTo(0, 0); const f = g.querySelector('[autofocus]'); if (f) f.focus(); }
function hideGate() { $('#gate').hidden = true; $('#gate').innerHTML = ''; $('#app').hidden = false; }
const LOGO = `<svg viewBox="0 0 36 36" width="40" height="40" aria-hidden="true"><circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3.2 2.4" opacity=".75"/><path d="M12.6 9h10.8c.4 5.3-2.3 8.4-4.6 8.9V24h3v1.5h-7.6V24h3v-6.1c-2.3-.5-5-3.6-4.6-8.9z" fill="currentColor"/></svg>`;
function gateFrame(inner) {
  return `<div class="gate"><div class="gate-brand"><div class="gate-logo">${LOGO}<span>Atoll Cellar</span></div>
  <h1>Wine control for island resorts</h1><ul><li>Cellar and outlet stock, live</li><li>Each outlet's own list and prices</li><li>Daily sales, counts, losses and reorders</li><li>Your team signs in from any phone</li></ul></div>
  <div class="gate-main"><div class="gate-card">${inner}</div></div></div>`;
}
function loadingScreen(msg) { showGate(`<div class="gate gate-solo"><div class="gate-logo">${LOGO}<span>Atoll Cellar</span></div><p class="muted">${esc(msg)}</p><div class="spinner" aria-hidden="true"></div></div>`); }
function loginScreen(o = {}) {
  const tab = o.tab || 'signin'; const msg = o.msg ? `<div class="callout ${o.bad ? 'bad' : 'good'}">${esc(o.msg)}</div>` : '';
  if (!Cloud.enabled) {
    return showGate(gateFrame(`<h2>Welcome</h2><p class="muted">Set up your resort, cellars and outlets, then start tracking. ${o.msg ? '' : 'Staff logins become available once the online database is connected (see the setup guide).'}</p>${msg}
    <div class="stack" style="gap:10px"><button type="button" class="btn primary big" data-act="au-local">Set up my resort</button><button type="button" class="btn big" data-act="au-demo">Explore the demo first</button></div>
    <p class="note">Without the online database, your data is saved in this browser only.</p>`));
  }
  if (tab === 'forgot') {
    return showGate(gateFrame(`<h2>Reset your password</h2><p class="muted">Enter your email. We will send you a link to choose a new password. If no email arrives within a few minutes, ask the owner of your portfolio to reset your access.</p>${msg}
    <form class="stack" data-form="au-forgot"><div class="field"><label for="au-email">Email</label><input class="inp big" id="au-email" type="email" autocomplete="email" required value="${esc(o.email || '')}" autofocus></div><button class="btn primary big" type="submit">Send the link</button></form>
    <button type="button" class="btn ghost" data-act="au-tab" data-arg="signin">Back to sign in</button>`));
  }
  const up = tab === 'signup';
  showGate(gateFrame(`<div class="seg gate-tabs" role="group" aria-label="Sign in or create an account"><button type="button" data-act="au-tab" data-arg="signin" aria-pressed="${!up}">Sign in</button><button type="button" data-act="au-tab" data-arg="signup" aria-pressed="${up}">Create account</button></div>
    <h2>${up ? 'Create your account' : 'Sign in'}</h2><p class="muted">${up ? 'If you were invited, use the email address on the invitation. You will type your join code next.' : 'Welcome back.'}</p>${msg}
    <form class="stack" data-form="${up ? 'au-signup' : 'au-signin'}">
      <div class="field"><label for="au-email">Email</label><input class="inp big" id="au-email" type="email" autocomplete="email" required value="${esc(o.email || '')}" autofocus></div>
      <div class="field"><label for="au-pass">Password</label><input class="inp big" id="au-pass" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" required minlength="${up ? 8 : 1}" placeholder="${up ? 'At least 8 characters' : ''}"></div>
      <button class="btn primary big" type="submit" id="au-go">${up ? 'Create account' : 'Sign in'}</button></form>
    ${up ? '' : '<button type="button" class="btn ghost" data-act="au-tab" data-arg="forgot">Forgot your password?</button>'}
    <div class="gate-or"><span>or</span></div><button type="button" class="btn big" data-act="au-demo">Explore the demo</button>`));
}
function newPasswordScreen(msg) {
  showGate(gateFrame(`<h2>Choose a new password</h2><p class="muted">For ${esc((Cloud.user || {}).email || 'your account')}.</p>${msg ? `<div class="callout bad">${esc(msg)}</div>` : ''}
  <form class="stack" data-form="au-newpass"><div class="field"><label for="au-pass">New password</label><input class="inp big" id="au-pass" type="password" autocomplete="new-password" required minlength="8" placeholder="At least 8 characters" autofocus></div><button class="btn primary big" type="submit">Save password</button></form>`));
}
function busy(form, on, label) { const b = form.querySelector('button[type="submit"]'); if (!b) return; if (on) { b.dataset.t = b.textContent; b.textContent = label || 'One moment…'; b.disabled = true; } else { b.textContent = b.dataset.t || b.textContent; b.disabled = false; } }

ACT['au-tab'] = el => loginScreen({ tab: el.dataset.arg, email: ($('#au-email') || {}).value || '' });
ACT['au-demo'] = () => startDemo();
ACT['au-local'] = async () => { const doc = await KV.get('doc:local'); if (doc) return startLocal(doc); wizardScreen('local'); };
FORM['au-signin'] = async f => {
  const email = $('#au-email').value.trim(), pass = $('#au-pass').value; busy(f, true, 'Signing in…');
  try { await Cloud.signIn(email, pass); await openCloud(); }
  catch (e) { loginScreen({ tab: 'signin', email, msg: e.message, bad: true }); }
};
FORM['au-signup'] = async f => {
  const email = $('#au-email').value.trim(), pass = $('#au-pass').value; busy(f, true, 'Creating your account…');
  try { const r = await Cloud.signUp(email, pass); if (r.session) return openCloud(); loginScreen({ tab: 'signin', email, msg: `Almost there. We sent a confirmation link to ${email}. Open it on this device, then sign in.` }); }
  catch (e) { loginScreen({ tab: 'signup', email, msg: e.message, bad: true }); }
};
FORM['au-forgot'] = async f => {
  const email = $('#au-email').value.trim(); busy(f, true, 'Sending…');
  try { await Cloud.recover(email); loginScreen({ tab: 'signin', email, msg: `If there is an account for ${email}, a reset link is on its way. Open it on this device.` }); }
  catch (e) { loginScreen({ tab: 'forgot', email, msg: e.message, bad: true }); }
};
FORM['au-newpass'] = async f => {
  busy(f, true, 'Saving…');
  try { await Cloud.setPassword($('#au-pass').value); toast('Password changed.'); await openCloud(); }
  catch (e) { newPasswordScreen(e.message); }
};

/* ---------------- first-time setup wizard ---------------- */
const QUICK_OUTLETS = [['Main Restaurant', 'restaurant', true], ['Beach Bar', 'bar', true], ['Pool Bar', 'bar', true], ['In-Villa Dining', 'villa', false], ['Speciality Restaurant', 'teppan', true], ['Lounge', 'bar', true]];
function wzState(target) { return UI.wz && UI.wz.target === target ? UI.wz : (UI.wz = { target, step: 0, name: '', where: '', sc: 10, gst: 17, cellars: [{ name: 'Main Cellar' }], outlets: [], err: '' }); }
async function wizardScreen(target, opts = {}) {
  const wz = wzState(target);
  if (opts.reset) Object.assign(wz, { step: 0, err: '' });
  const local = target === 'cloud' && wz.step === 0 ? await KV.get('doc:local') : null;
  const steps = ['Resort', 'Cellars', 'Outlets', 'Check'];
  const head = `<div class="wz-steps">${steps.map((s, i) => `<span class="${i === wz.step ? 'on' : i < wz.step ? 'done' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`;
  const err = wz.err ? `<div class="callout bad">${esc(wz.err)}</div>` : '';
  let body = '';
  if (wz.step === 0) {
    body = `<h2>Set up your resort</h2><p class="muted">You can change all of this later, and add more resorts.</p>${err}
    ${local && local.props && local.props.length ? `<div class="callout">This device already has <b>${esc(local.props[0].name)}</b> with ${local.wines.length} wines, set up without a login. <button type="button" class="btn sm" data-act="wz-upload">Upload it to my account</button></div>` : ''}
    <div class="field"><label for="wz-name">Resort name</label><input class="inp big" id="wz-name" data-inp="wz" data-k="name" value="${esc(wz.name)}" placeholder="For example: Sandbank Bay Resort" autofocus></div>
    <div class="field"><label for="wz-where">Location</label><input class="inp big" id="wz-where" data-inp="wz" data-k="where" value="${esc(wz.where)}" placeholder="For example: Baa Atoll, Maldives"></div>
    <div class="form-grid"><div class="field"><label for="wz-sc">Service charge %</label><input class="inp" id="wz-sc" type="number" min="0" max="30" step="0.5" data-inp="wz" data-k="sc" value="${wz.sc}"></div><div class="field"><label for="wz-gst">Tax (T-GST) %</label><input class="inp" id="wz-gst" type="number" min="0" max="40" step="0.5" data-inp="wz" data-k="gst" value="${wz.gst}"></div></div>`;
  } else if (wz.step === 1) {
    body = `<h2>Cellars</h2><p class="muted">Where the wine is stored before it goes to the outlets. The first one is the main cellar: deliveries arrive there and outlets are topped up from it.</p>${err}
    <div class="stack" style="gap:8px">${wz.cellars.map((c, i) => `<div class="row wz-row"><input class="inp" style="flex:1" data-inp="wz-list" data-l="cellars" data-i="${i}" data-k="name" value="${esc(c.name)}" aria-label="Cellar name" placeholder="Cellar name">${i === 0 ? '<span class="pill info plain">Main</span>' : `<button type="button" class="btn sm ghost" data-act="wz-del" data-arg="cellars|${i}" aria-label="Remove ${esc(c.name)}">Remove</button>`}</div>`).join('')}</div>
    <div><button type="button" class="btn" data-act="wz-add" data-arg="cellars">Add another cellar</button></div>`;
  } else if (wz.step === 2) {
    body = `<h2>Outlets</h2><p class="muted">Every restaurant, bar or service that sells wine. Each one gets its own wine list and can have its own prices.</p>${err}
    <div class="chips">${QUICK_OUTLETS.map(([n], i) => `<button type="button" class="chip" data-act="wz-quick" data-arg="${i}">+ ${esc(n)}</button>`).join('')}</div>
    <div class="stack" style="gap:8px">${wz.outlets.map((o, i) => `<div class="row wz-row"><input class="inp" style="flex:1;min-width:150px" data-inp="wz-list" data-l="outlets" data-i="${i}" data-k="name" value="${esc(o.name)}" aria-label="Outlet name" placeholder="Outlet name">
      <select class="inp" data-chg="wz-kind" data-i="${i}" aria-label="Type of outlet">${Object.entries(KIND_LABEL).map(([k, l]) => `<option value="${k}"${k === o.kind ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <label class="check small"><input type="checkbox" data-chg="wz-glass" data-i="${i}"${o.glass ? ' checked' : ''}> By the glass</label>
      <button type="button" class="btn sm ghost" data-act="wz-del" data-arg="outlets|${i}" aria-label="Remove ${esc(o.name)}">Remove</button></div>`).join('') || '<p class="note">No outlets yet. Tap a suggestion above or add your own.</p>'}</div>
    <div><button type="button" class="btn" data-act="wz-add" data-arg="outlets">Add an outlet</button></div>`;
  } else {
    body = `<h2>Check and create</h2>${err}<div class="wz-sum"><div><span class="k">Resort</span><b>${esc(wz.name)}</b>${wz.where ? ` · ${esc(wz.where)}` : ''}</div><div><span class="k">Cellars</span>${wz.cellars.map((c, i) => esc(c.name) + (i === 0 ? ' (main)' : '')).join(', ')}</div><div><span class="k">Outlets</span>${wz.outlets.map(o => `${esc(o.name)} <span class="muted">· ${KIND_LABEL[o.kind]}${o.glass ? ', by the glass' : ''}</span>`).join('<br>')}</div><div><span class="k">Prices</span>${wz.sc}% service charge, ${wz.gst}% T-GST on top</div></div>
    <p class="note">Next you add your wines: import them from Excel or enter them one by one. Then copy them to each outlet's list.${target === 'cloud' ? ' After that, invite your team from Team &amp; access.' : ''}</p>`;
  }
  const foot = `<div class="row between wz-foot">${wz.step ? '<button type="button" class="btn" data-act="wz-back">Back</button>' : (target === 'cloud' && App.list.length ? '<button type="button" class="btn" data-act="wz-cancel">Cancel</button>' : '<button type="button" class="btn ghost" data-act="wz-cancel">Back</button>')}<button type="button" class="btn primary" data-act="wz-next" id="wz-next">${wz.step === 3 ? 'Create my resort' : 'Next'}</button></div>`;
  showGate(`<div class="gate gate-wide"><div class="gate-logo">${LOGO}<span>Atoll Cellar</span></div><div class="gate-card wz">${head}${body}${foot}</div></div>`);
}
INP['wz'] = el => { const wz = UI.wz; const k = el.dataset.k; wz[k] = el.type === 'number' ? (+el.value || 0) : el.value; };
INP['wz-list'] = el => { UI.wz[el.dataset.l][+el.dataset.i][el.dataset.k] = el.value; };
CHG['wz-kind'] = el => { const o = UI.wz.outlets[+el.dataset.i]; o.kind = el.value; o.glass = el.value !== 'villa'; wizardScreen(UI.wz.target); };
CHG['wz-glass'] = el => { UI.wz.outlets[+el.dataset.i].glass = el.checked; };
ACT['wz-add'] = el => { const l = el.dataset.arg; UI.wz[l].push(l === 'cellars' ? { name: '' } : { name: '', kind: 'restaurant', glass: true }); wizardScreen(UI.wz.target).then(() => { const ins = $$(`[data-l="${l}"]`); if (ins.length) ins[ins.length - 1].focus(); }); };
ACT['wz-quick'] = el => { const [name, kind, glass] = QUICK_OUTLETS[+el.dataset.arg]; const wz = UI.wz; let n = name; let i = 2; while (wz.outlets.some(o => o.name === n)) n = `${name} ${i++}`; wz.outlets.push({ name: n, kind, glass }); wizardScreen(wz.target); };
ACT['wz-del'] = el => { const [l, i] = el.dataset.arg.split('|'); UI.wz[l].splice(+i, 1); wizardScreen(UI.wz.target); };
ACT['wz-back'] = () => { UI.wz.step = Math.max(0, UI.wz.step - 1); UI.wz.err = ''; wizardScreen(UI.wz.target); };
ACT['wz-cancel'] = () => { const t = UI.wz.target; UI.wz = null; if (t === 'cloud') { if (App.list.length) chooserScreen(); else joinScreen(); } else loginScreen(); };
ACT['wz-next'] = async el => {
  const wz = UI.wz; wz.err = ''; const clean = s => String(s || '').trim();
  if (wz.step === 0 && !clean(wz.name)) wz.err = 'Give your resort a name.';
  if (wz.step === 1) { wz.cellars = wz.cellars.filter(c => clean(c.name)); if (!wz.cellars.length) { wz.cellars = [{ name: 'Main Cellar' }]; wz.err = 'You need at least one cellar.'; } }
  if (wz.step === 2) { wz.outlets = wz.outlets.filter(o => clean(o.name)); if (!wz.outlets.length) wz.err = 'Add at least one outlet. You can add more later.'; }
  if (wz.err) return wizardScreen(wz.target);
  if (wz.step < 3) { wz.step++; return wizardScreen(wz.target); }
  el.disabled = true; el.textContent = 'Creating…';
  const st = buildNewState(wz);
  UI.wz = null;
  if (wz.target === 'cloud') {
    try { const pid = await Cloud.rpc('create_portfolio', { p_name: clean(wz.name), p_sections: splitState(st) }); App.list = await Cloud.rpc('my_portfolios') || []; await openPortfolio(App.list.find(p => p.id === pid) || { id: pid, name: clean(wz.name), role: 'owner' }, { fresh: true }); }
    catch (e) { UI.wz = wz; wz.err = e.message; wizardScreen('cloud'); }
  } else { await KV.set('doc:local', st); startLocal(st, { fresh: true }); }
};
ACT['wz-upload'] = async el => {
  const local = await KV.get('doc:local'); if (!local) return; el.disabled = true; el.textContent = 'Uploading…';
  try { const st = normalizeState(local); const pid = await Cloud.rpc('create_portfolio', { p_name: st.props[0].name, p_sections: splitState(st) }); App.list = await Cloud.rpc('my_portfolios') || []; UI.wz = null; await openPortfolio(App.list.find(p => p.id === pid)); toast('Uploaded. Your team can now sign in and see it.'); }
  catch (e) { toast(e.message); el.disabled = false; el.textContent = 'Upload it to my account'; }
};
function buildNewState(wz) {
  const pid = rid('r');
  const locs = [...wz.cellars.map((c, i) => ({ id: rid('c'), name: c.name.trim(), kind: 'cellar', main: i === 0, created: TODAY })),
    ...wz.outlets.map(o => ({ id: rid('o'), name: o.name.trim(), kind: o.kind, glass: !!o.glass, list: [], prices: {}, created: TODAY }))];
  const st = { v: 2, seq: 1, settings: { ...clone(DEFAULT_SETTINGS), sc: +wz.sc || 0, gst: +wz.gst || 0 },
    suppliers: [{ id: 'local', name: 'Local distributor', lead: 7 }, { id: 'import', name: 'Overseas import', lead: 45 }],
    props: [{ id: pid, name: wz.name.trim(), atoll: wz.where.trim(), scale: 1, locs }],
    wines: [], stock: {}, open: {}, sales: [], postings: {}, losses: [], transfers: [], counts: [], pos: [], quiz: [] };
  return normalizeState(st);
}

/* ---------------- joining a team, choosing a portfolio ---------------- */
function joinScreen(msg) {
  showGate(gateFrame(`<h2>Join your team</h2><p class="muted">Signed in as ${esc(App.email)}. If your manager invited you, type the join code from the invitation.</p>${msg ? `<div class="callout bad">${esc(msg)}</div>` : ''}
  <form class="stack" data-form="jn-code"><div class="field"><label for="jn-code">Join code</label><input class="inp big mono" id="jn-code" required autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="For example: K7Q2MX" autofocus></div><button class="btn primary big" type="submit">Join</button></form>
  <div class="gate-or"><span>or</span></div>
  <button type="button" class="btn big" data-act="ch-new">Set up a new resort</button>
  <div class="row between">${App.list.length ? '<button type="button" class="btn ghost" data-act="ac-switch">Back</button>' : '<span></span>'}<button type="button" class="btn ghost" data-act="ac-signout">Sign out</button></div>`));
}
FORM['jn-code'] = async f => {
  busy(f, true, 'Joining…');
  try { const r = await Cloud.rpc('join_with_code', { p_code: $('#jn-code').value }); App.list = await Cloud.rpc('my_portfolios') || []; await openPortfolio(App.list.find(p => p.id === r.portfolio_id)); toast(`Welcome to ${r.name}.`); }
  catch (e) { joinScreen(e.message); }
};
function chooserScreen() {
  showGate(gateFrame(`<h2>Choose a portfolio</h2><p class="muted">Signed in as ${esc(App.email)}.</p>
  <div class="stack" style="gap:8px">${App.list.map(p => `<button type="button" class="pick" data-act="ch-open" data-arg="${p.id}"><b>${esc(p.name)}</b><span>${ROLE_LABEL[p.role]}</span></button>`).join('')}</div>
  <div class="row between"><div class="row"><button type="button" class="btn" data-act="ch-join">Join with a code</button><button type="button" class="btn" data-act="ch-new">Start a new portfolio</button></div><button type="button" class="btn ghost" data-act="ac-signout">Sign out</button></div>`));
}
ACT['ch-join'] = () => joinScreen();
ACT['ch-open'] = el => openPortfolio(App.list.find(p => p.id === el.dataset.arg));
ACT['ch-new'] = () => { UI.wz = null; wizardScreen('cloud'); };

/* ---------------- opening the app ---------------- */
async function openCloud() {
  const u = Cloud.user; App.email = (u && u.email) || ''; App.mode = 'cloud';
  loadingScreen('Opening your cellar…');
  let offline = false;
  try { App.list = await Cloud.rpc('my_portfolios') || []; try { localStorage.setItem('atoll-cellar-list', JSON.stringify(App.list)); } catch (e) { } }
  catch (e) {
    if (e.auth) return loginScreen({ msg: 'Please sign in again.', bad: true });
    if (!e.offline) return errorScreen(e);
    offline = true; try { App.list = JSON.parse(localStorage.getItem('atoll-cellar-list') || '[]'); } catch (e2) { App.list = []; }
  }
  if (!App.list.length) { if (offline) return errorScreen({ message: 'You are offline and this device has no saved copy yet. Connect to the internet and try again.' }); return joinScreen(); }
  let last = ''; try { last = localStorage.getItem('atoll-cellar-last') || ''; } catch (e) { }
  const p = App.list.find(x => x.id === last) || (App.list.length === 1 ? App.list[0] : null);
  if (!p) return chooserScreen();
  return openPortfolio(p);
}
async function openPortfolio(p, opts = {}) {
  if (!p) return chooserScreen();
  loadingScreen(`Opening ${p.name}…`);
  Object.assign(App, { mode: 'cloud', pid: p.id, role: p.role, name: p.name, base: {}, ver: {}, team: null, status: 'saved' });
  try { localStorage.setItem('atoll-cellar-last', p.id); } catch (e) { }
  const cached = await KV.get('doc:' + p.id);
  try {
    const got = await Cloud.rpc('get_sections', { p_id: p.id }) || {};
    for (const [sec, x] of Object.entries(got)) { App.base[sec] = x.data; App.ver[sec] = x.version; }
    let st = joinState(clone(App.base));
    if (cached && cached.local && cached.base) {
      // this device has changes that never reached the server (made offline): merge them in
      const mine = splitState(cached.local); const secs = splitState(st);
      for (const sec of new Set([...Object.keys(mine), ...Object.keys(secs)])) {
        if (same(mine[sec], cached.base[sec])) continue;
        const m = merge3(cached.base[sec], mine[sec], App.base[sec], sec === 'stock'); if (m !== undefined) setSection(st, sec, m);
      }
    }
    S = normalizeState(st);
  } catch (e) {
    if (e.auth) return loginScreen({ msg: 'Please sign in again.', bad: true });
    if (e.code === '42501') { toast('You no longer have access to that portfolio.'); try { localStorage.removeItem('atoll-cellar-last'); } catch (e2) { } return openCloud(); }
    if (!e.offline || !cached) return errorScreen(e);
    App.base = cached.base || {}; App.ver = cached.ver || {}; S = normalizeState(cached.local); App.status = 'offline';
  }
  startApp(opts);
  if (changedSections().length) push();
}
function startLocal(st, opts) { App.mode = 'local'; App.pid = null; App.role = 'owner'; S = normalizeState(st); startApp(opts); }
function startDemo() {
  App.mode = 'demo'; App.pid = null; App.role = 'owner'; let st = null;
  try { const raw = localStorage.getItem(DEMO_KEY); if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.wines) && s.built === TODAY) st = s; } } catch (e) { }
  S = normalizeState(st || buildDemo()); try { sessionStorage.setItem('atoll-cellar-demo', '1'); } catch (e) { }
  startApp(); save();
}
function startApp(opts = {}) {
  UI = { route: 'dashboard', prop: S.props[0] ? S.props[0].id : '', outlet: 'all' };
  try { const u = JSON.parse(localStorage.getItem('atoll-cellar-ui:' + (App.pid || App.mode)) || 'null'); if (u && S.props.some(p => p.id === u.prop)) { UI.prop = u.prop; UI.route = u.route || UI.route; } } catch (e) { }
  { const h = (location.hash || '').slice(1); if (V[h]) UI.route = h; }
  if (opts.fresh) UI.route = 'dashboard';
  reindex(); hideGate(); render();
  clearInterval(App.poller); if (isCloud()) App.poller = setInterval(() => pull(), 20000);
  setStatus(isCloud() ? App.status : App.mode);
}
function errorScreen(e) {
  showGate(gateFrame(`<h2>Something went wrong</h2><div class="callout bad">${esc((e && e.message) || 'Unknown error')}</div><p class="muted">Check your internet connection and try again. If it keeps happening, check that the database script from the setup guide has been run.</p><div class="row"><button type="button" class="btn primary" data-act="er-retry">Try again</button><button type="button" class="btn" data-act="ac-signout">Sign out</button></div>`));
}
ACT['er-retry'] = () => boot();

/* ---------------- account actions ---------------- */
async function signOutNow() {
  clearInterval(App.poller); clearTimeout(App.timer); clearTimeout(App.retry);
  if (App.pid) await KV.del('doc:' + App.pid);
  try { localStorage.removeItem('atoll-cellar-last'); localStorage.removeItem('atoll-cellar-list'); } catch (e) { }
  await Cloud.signOut(); S = null; Object.assign(App, { mode: null, pid: null, list: [], base: {}, ver: {}, team: null }); closeModal(); loginScreen();
}
ACT['ac-signout'] = async () => {
  if (isCloud() && changedSections().length) {
    await push();
    if (changedSections().length) return modal(`<div class="modal-h"><h2>Sign out?</h2><button type="button" class="btn ghost" data-act="modal-close">Close</button></div><div class="modal-b"><p>Some changes have not reached the server yet${App.status === 'offline' ? ' because this device is offline' : ''}. If you sign out now they will be lost.</p></div><div class="modal-f"><span></span><div class="row"><button type="button" class="btn" data-act="modal-close">Stay signed in</button><button type="button" class="btn danger" data-act="ac-signout-force">Sign out anyway</button></div></div>`);
  }
  signOutNow();
};
ACT['ac-signout-force'] = () => signOutNow();
ACT['ac-switch'] = () => { clearInterval(App.poller); chooserScreen(); };
ACT['ac-exit-demo'] = () => { try { sessionStorage.removeItem('atoll-cellar-demo'); } catch (e) { } S = null; App.mode = null; boot(); };
ACT['ac-to-cloud'] = () => { S = null; App.mode = null; loginScreen(); };
ACT['ac-wipe'] = async el => {
  if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Click again to delete everything'; return; }
  await KV.del('doc:local'); S = null; App.mode = null; loginScreen({ msg: 'Everything on this device was deleted.' });
};
FORM['ac-rename'] = async f => {
  const n = $('#ac-name').value.trim(); if (!n) return; busy(f, true, 'Saving…');
  try { await Cloud.rpc('rename_portfolio', { p_id: App.pid, p_name: n }); App.name = n; const x = App.list.find(p => p.id === App.pid); if (x) x.name = n; toast('Portfolio renamed.'); render(); }
  catch (e) { toast(e.message); busy(f, false); }
};
FORM['ac-pass'] = async f => {
  const pw = $('#ac-pass').value; if (pw.length < 8) return toast('Use at least 8 characters.'); busy(f, true, 'Saving…');
  try { await Cloud.setPassword(pw); toast('Password changed.'); $('#ac-pass').value = ''; } catch (e) { toast(e.message); } busy(f, false);
};
document.addEventListener('submit', e => { const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault(); const fn = FORM[f.dataset.form]; if (fn) fn(f, e); });

/* ---------------- start ---------------- */
async function boot() {
  if (!Cloud.enabled) {
    try { if (sessionStorage.getItem('atoll-cellar-demo') === '1') return startDemo(); } catch (e) { }
    const doc = await KV.get('doc:local'); if (doc) return startLocal(doc);
    return loginScreen();
  }
  const r = await Cloud.fromRedirect();
  if (r && r.error) return loginScreen({ msg: r.error, bad: true });
  if (r && r.type === 'recovery') return newPasswordScreen();
  try { if (sessionStorage.getItem('atoll-cellar-demo') === '1') return startDemo(); } catch (e) { }
  if (!Cloud.session) {
    return loginScreen();
  }
  return openCloud();
}
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
boot();
