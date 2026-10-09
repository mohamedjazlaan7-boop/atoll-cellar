/* ============ Atoll Cellar — online database, device storage and sync helpers ============ */
'use strict';

/* ---------- device storage (IndexedDB, with localStorage as a fallback) ---------- */
const KV = (() => {
  let dbp = null;
  const open = () => dbp ||= new Promise((res, rej) => {
    try {
      const r = indexedDB.open('atoll-cellar', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
  const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('kv', mode); const st = t.objectStore('kv'); const q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  return {
    async get(k) { try { return await tx('readonly', st => st.get(k)); } catch (e) { try { const v = localStorage.getItem('kv:' + k); return v ? JSON.parse(v) : undefined; } catch (e2) { return undefined; } } },
    async set(k, v) { try { await tx('readwrite', st => st.put(v, k)); } catch (e) { try { localStorage.setItem('kv:' + k, JSON.stringify(v)); } catch (e2) { } } },
    async del(k) { try { await tx('readwrite', st => st.delete(k)); } catch (e) { } try { localStorage.removeItem('kv:' + k); } catch (e) { } },
  };
})();

/* ---------- comparing and merging data ---------- */
// JSON with sorted keys, so two copies of the same data always compare equal
function stable(x) {
  if (x === undefined) return 'undefined';
  if (x === null || typeof x !== 'object') return JSON.stringify(x);
  if (Array.isArray(x)) return '[' + x.map(stable).join(',') + ']';
  return '{' + Object.keys(x).filter(k => x[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stable(x[k])).join(',') + '}';
}
const same = (a, b) => a === b || stable(a) === stable(b);
const clone = x => x === undefined ? undefined : JSON.parse(JSON.stringify(x));
const isRec = x => !!x && typeof x === 'object' && !Array.isArray(x);

// Three-way merge: b = what we last had from the server, l = this device, r = the server now.
// Both sides' changes are kept. Records with an id are merged one by one, lines added on either
// side are all kept, and stock quantities add both sides' movements together.
function merge3(b, l, r, numDelta) {
  if (numDelta && typeof l === 'number' && typeof r === 'number' && (typeof b === 'number' || b === undefined)) return Math.round((r + (l - (b || 0))) * 1000) / 1000;
  if (same(l, b)) return clone(r);
  if (same(r, b)) return l;
  if (isRec(l) && isRec(r)) {
    const bb = isRec(b) ? b : {}; const out = {};
    for (const k of new Set([...Object.keys(r), ...Object.keys(l)])) { const v = merge3(bb[k], l[k], r[k], numDelta); if (v !== undefined) out[k] = v; }
    return out;
  }
  if (Array.isArray(l) && Array.isArray(r)) {
    const bb = Array.isArray(b) ? b : [];
    const all = [...l, ...r, ...bb];
    if (all.length && all.every(x => isRec(x) && x.id != null)) {
      const mb = new Map(bb.map(x => [x.id, x])), ml = new Map(l.map(x => [x.id, x])), mr = new Map(r.map(x => [x.id, x]));
      const ids = [...r.map(x => x.id), ...l.map(x => x.id).filter(id => !mr.has(id))];
      const out = []; for (const id of ids) { const v = merge3(mb.get(id), ml.get(id), mr.get(id), numDelta); if (v !== undefined) out.push(v); }
      return out;
    }
    // anything else (sales lines, which carry their own id, posted dates, wine ids on a list):
    // keep everything either side added and drop what this device removed. Adding a line that is
    // already there changes nothing, so a save that is retried can never double a sale.
    const sb = new Set(bb.map(stable)), sl = new Set(l.map(stable)), sr = new Set(r.map(stable));
    const out = r.filter(x => !(sb.has(stable(x)) && !sl.has(stable(x))));
    for (const x of l) { const k = stable(x); if (!sb.has(k) && !sr.has(k)) { out.push(x); sr.add(k); } }
    return out;
  }
  return l;
}

/* ---------- splitting the data into sections that are saved separately ---------- */
// Staff may save every section except "core" (setup, wines, prices) and "pos" (purchase orders).
// Sales are saved one month per section so a save never has to send the whole history.
const SEC_KEYS = { core: ['v', 'seq', 'settings', 'suppliers', 'props', 'wines'], stock: ['stock', 'open'], postings: ['postings'], losses: ['losses'], transfers: ['transfers'], counts: ['counts'], pos: ['pos'], quiz: ['quiz'] };
const MGR_SECTIONS = new Set(['core', 'pos']);
function splitState(st) {
  const out = {};
  for (const [sec, keys] of Object.entries(SEC_KEYS)) { out[sec] = {}; for (const k of keys) if (st[k] !== undefined) out[sec][k] = st[k]; }
  for (const r of st.sales || []) (out['sales:' + String(r[0]).slice(0, 7)] ||= []).push(r);
  return out;
}
function joinState(secs) {
  const st = {};
  for (const [sec, keys] of Object.entries(SEC_KEYS)) { const d = secs[sec] || {}; for (const k of keys) if (d[k] !== undefined) st[k] = d[k]; }
  st.sales = Object.keys(secs).filter(k => k.startsWith('sales:')).sort().flatMap(k => Array.isArray(secs[k]) ? secs[k] : []);
  return st;
}
function setSection(st, sec, data) {
  if (sec.startsWith('sales:')) { const m = sec.slice(6); st.sales = (st.sales || []).filter(r => String(r[0]).slice(0, 7) !== m).concat(Array.isArray(data) ? data : []); return; }
  const keys = SEC_KEYS[sec]; if (!keys) return;
  for (const k of keys) { if (data && data[k] !== undefined) st[k] = data[k]; }
}

/* ---------- Supabase: sign-in and database calls over plain HTTPS ---------- */
const Cloud = (() => {
  const cfg = window.ATOLL_CONFIG || {};
  const url = String(cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = String(cfg.supabaseAnonKey || '').trim();
  const enabled = /^(https:\/\/.+|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/.test(url) && key.length > 20;
  const SKEY = 'atoll-cellar-session';
  let session = null; let refreshing = null;
  try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
  const keep = s => { session = s; try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) { } };
  const appURL = () => location.href.split('#')[0].split('?')[0];

  function errMsg(data, status) {
    if (data && typeof data === 'object') {
      const m = data.error_description || data.msg || data.message || data.error || '';
      if (/invalid login credentials/i.test(m)) return 'That email and password do not match. Check them, or reset your password.';
      if (/email not confirmed/i.test(m)) return 'Confirm your email first. Open the link we sent you, then sign in.';
      if (/user already registered/i.test(m)) return 'There is already an account with that email. Sign in instead.';
      if (/password should be at least/i.test(m)) return 'Use a password of at least 8 characters.';
      if (/rate limit|too many/i.test(m)) return 'Too many attempts. Wait a minute, then try again.';
      if (m) return m;
    }
    return `The server answered with an error (${status}).`;
  }
  function fromToken(t) { return { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at || Math.floor(Date.now() / 1000) + (t.expires_in || 3600), user: t.user ? { id: t.user.id, email: t.user.email } : (session && session.user) }; }

  async function raw(path, { method = 'GET', body, token } = {}) {
    let res;
    try {
      // the project key goes in "apikey"; "Authorization" only ever carries a signed-in person's token
      const headers = { apikey: key, 'Content-Type': 'application/json' }; if (token) headers.Authorization = 'Bearer ' + token;
      res = await fetch(url + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch (e) { const err = new Error('You seem to be offline. Your changes are kept on this device.'); err.offline = true; throw err; }
    const txt = await res.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
    if (!res.ok) { const err = new Error(errMsg(data, res.status)); err.status = res.status; err.data = data; err.code = data && data.code; throw err; }
    return data;
  }
  async function refresh() {
    if (!session || !session.refresh_token) throw Object.assign(new Error('Signed out'), { auth: true });
    if (!refreshing) refreshing = (async () => {
      try { const t = await raw('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refresh_token } }); keep(fromToken(t)); }
      catch (e) { if (!e.offline) { keep(null); e.auth = true; } throw e; }
      finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function authed(path, opts = {}) {
    if (!session) throw Object.assign(new Error('Signed out'), { auth: true });
    if (session.expires_at - 60 < Date.now() / 1000) await refresh();
    try { return await raw(path, { ...opts, token: session.access_token }); }
    catch (e) {
      if (e.status === 401 || (e.status === 403 && /jwt/i.test(e.message))) { await refresh(); return raw(path, { ...opts, token: session.access_token }); }
      throw e;
    }
  }
  return {
    enabled, url,
    get session() { return session; },
    get user() { return session && session.user; },
    // tokens that arrive in the address after clicking an email link (confirm, password reset)
    async fromRedirect() {
      const h = location.hash.replace(/^#/, ''); if (!/access_token=|error_description=/.test(h)) return null;
      const q = new URLSearchParams(h); history.replaceState(null, '', location.pathname + location.search);
      if (q.get('error_description')) return { error: q.get('error_description').replace(/\+/g, ' ') };
      const t = { access_token: q.get('access_token'), refresh_token: q.get('refresh_token'), expires_in: +q.get('expires_in') || 3600, expires_at: +q.get('expires_at') || 0 };
      try { const u = await raw('/auth/v1/user', { token: t.access_token }); t.user = u; } catch (e) { return { error: e.message }; }
      keep(fromToken(t)); return { type: q.get('type') || 'signup' };
    },
    async signIn(email, password) { const t = await raw('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } }); keep(fromToken(t)); return session; },
    async signUp(email, password) {
      const t = await raw('/auth/v1/signup?redirect_to=' + encodeURIComponent(appURL()), { method: 'POST', body: { email, password } });
      if (t && t.access_token) { keep(fromToken(t)); return { session }; }
      const u = t && (t.user || t);
      if (u && Array.isArray(u.identities) && u.identities.length === 0) throw new Error('There is already an account with that email. Sign in instead.');
      return { confirm: true };
    },
    async recover(email) { await raw('/auth/v1/recover?redirect_to=' + encodeURIComponent(appURL()), { method: 'POST', body: { email } }); },
    async setPassword(password) { await authed('/auth/v1/user', { method: 'PUT', body: { password } }); },
    async signOut() { try { if (session) await raw('/auth/v1/logout', { method: 'POST', token: session.access_token }); } catch (e) { } keep(null); },
    rpc: (fn, args = {}) => authed('/rest/v1/rpc/' + fn, { method: 'POST', body: args }),
  };
})();
