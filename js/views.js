/* ============ view helpers ============ */
const V = {}, AFTER = {}, ACT = {}, CHG = {}, INP = {}, FORM = {};
const ph = (title, sub, actions = '') => `<div class="ph"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
const kpi = (lbl, val, sub = '') => `<div class="kpi"><div class="lbl">${lbl}</div><div class="val">${val}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
const pill = (t, cls = '') => `<span class="pill ${cls}">${esc(t)}</span>`;
function panel(title, body, o = {}) {
  return `<section class="panel"${o.id ? ` id="${o.id}"` : ''}><div class="panel-h"><div><h2>${title}</h2>${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div>${o.actions ? `<div class="row">${o.actions}</div>` : ''}</div><div class="panel-b${o.flush ? ' flush' : ''}">${body}</div>${o.foot ? `<div class="panel-f">${o.foot}</div>` : ''}</section>`;
}
const wPlace = w => [w.region, w.country].filter(Boolean).join(', ');
const wSub = (...xs) => xs.filter(Boolean).map(esc).join(' · ');
const wineCell = (w, extra = '') => `<div class="wn"><span class="tdot ${w.type}" title="${TYPE[w.type].short}"></span>${esc(wName(w))}</div><div class="wsub">${wSub(w.vintage, wPlace(w))}${extra}</div>`;
const chips = (items, cur, act) => `<div class="chips">${items.map(([v, l]) => `<button type="button" class="chip" data-act="${act}" data-arg="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('')}</div>`;
const seg = (items, cur, act, label = '') => `<div class="seg" role="group" aria-label="${esc(label)}">${items.map(([v, l]) => `<button type="button" data-act="${act}" data-arg="${esc(v)}" aria-pressed="${v === cur}">${esc(l)}</button>`).join('')}</div>`;
function wineOptions(sel, filter = () => true) {
  return TYPES.map(t => { const ws = S.wines.filter(w => w.type === t.id && filter(w)).sort((a, b) => wName(a).localeCompare(wName(b))); return ws.length ? `<optgroup label="${t.label}">${ws.map(w => `<option value="${w.id}"${w.id === sel ? ' selected' : ''}>${esc(wName(w))} ${esc(w.vintage)}</option>`).join('')}</optgroup>` : ''; }).join('');
}
const locOptions = (pid, sel, filter = () => true) => P(pid).locs.filter(filter).map(l => `<option value="${l.id}"${l.id === sel ? ' selected' : ''}>${esc(l.name)}</option>`).join('');
const typeItems = [['all', 'All'], ...TYPES.map(t => [t.id, t.short])];
const fmtK = v => v >= 1000 ? '$' + (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'k' : '$' + Math.round(v);
function niceStep(x) { if (x <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(x))); const n = x / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function gridLines(max, fmt) { const step = niceStep(max / 4); const top = Math.max(step, Math.ceil(max / step - 1e-9) * step); let h = ''; for (let v = 0; v <= top + 1e-9; v += step) h += `<div class="gline" style="bottom:${v / top * 100}%"><span>${fmt(v)}</span></div>`; return { h, top }; }
function barChart(pts, fmt = fmtK) {
  const max = Math.max(100, ...pts.map(p => p.v)); const { h, top } = gridLines(max, fmt);
  return `<div class="chart"><div class="plot">${h}${pts.map(p => `<div class="bar${p.last ? ' last' : ''}" style="height:${p.v > 0 ? Math.max(0.8, p.v / top * 100) : 0}%" data-tip="${esc(p.tip)}">${p.label ? `<span class="xl">${esc(p.label)}</span>` : ''}</div>`).join('')}</div></div>`;
}
const dlt = d => `<span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${pct(Math.abs(d))}</span>`;
function stockValue(ls) { let c = 0, m = 0, b = 0; for (const loc of ls) for (const w of S.wines) { const q = eqAt(loc, w.id); if (q <= 0) continue; c += q * w.cost; m += q * w.price; b += q; } return { c, m, b }; }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 4200); }
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="modal-wrap" data-act="modal-bg"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; m.hidden = false; }
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
async function copyText(text, label) {
  try { await navigator.clipboard.writeText(text); toast(`${label} copied to the clipboard.`); }
  catch (e) {
    modal(`<div class="modal-h"><h2>Copy ${esc(label)}</h2><button type="button" class="btn ghost" data-act="modal-close">Close</button></div><div class="modal-b"><p class="note">Automatic copying is blocked here. The text is selected below, so copy it with your keyboard.</p><textarea class="inp" rows="14" id="copyArea" readonly>${esc(text)}</textarea></div>`);
    const a = $('#copyArea'); if (a) { a.focus(); a.select(); }
  }
}
const toCSV = rows => rows.map(r => r.map(c => { const s = String(c ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(',')).join('\n');

/* ============ shell ============ */
const NAV = [
  { g: 'Overview', items: [['dashboard', 'Dashboard'], ['group', 'Group view']] },
  { g: 'Daily operations', items: [['sales', 'Daily sales'], ['glass', 'By the glass'], ['losses', 'Losses & comps'], ['count', 'Stock count']] },
  { g: 'Cellar', items: [['wines', 'Wines & stock'], ['outlets', 'Outlet lists'], ['reorder', 'Reorder'], ['pricing', 'Pricing']] },
  { g: 'Insight', items: [['reports', 'Reports']] },
  { g: 'Front of house', items: [['list', 'Guest wine list'], ['training', 'Staff training']] },
  { g: 'Setup', items: [['setup', 'Resorts & outlets'], ['team', 'Team & access'], ['settings', 'Settings']] },
];
// pages only managers can open
const MGR_ROUTES = new Set(['reorder', 'pricing', 'setup', 'team', 'settings']);
const routeOK = r => !!V[r] && (isMgr() || !MGR_ROUTES.has(r)) && (r !== 'group' || S.props.length > 1);
function badges() {
  const pid = UI.prop; const b = {}; const y = addDays(TODAY, -1);
  const un = salesLocs(pid).filter(l => since(l) <= y && !isPosted(l.id, y)).length; if (un) b.sales = [un, 'bad'];
  const st = openList(pid).filter(x => x.f.cls === 'bad').length; if (st) b.glass = [st, 'warn'];
  const rr = reorderRows(pid); const u = rr.filter(r => r.status === 'urgent' || r.status === 'out').length, o = rr.filter(r => r.status === 'order').length;
  if (u) b.reorder = [u + o, 'bad']; else if (o) b.reorder = [o, 'warn'];
  const od = P(pid).locs.filter(l => { const c = lastCount(l.id); return diffDays(c ? c.date : since(l), TODAY) > 35; }).length; if (od) b.count = [od, 'warn'];
  const pc = S.losses.filter(x => x.credit === 'pending' && LM[x.loc] && LM[x.loc].prop === pid).length; if (pc) b.losses = [pc, ''];
  return b;
}
function renderSide() {
  const b = badges();
  $('#side').innerHTML = `<div class="brand"><svg viewBox="0 0 36 36" width="34" height="34" aria-hidden="true"><circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3.2 2.4" opacity=".75"/><path d="M12.6 9h10.8c.4 5.3-2.3 8.4-4.6 8.9V24h3v1.5h-7.6V24h3v-6.1c-2.3-.5-5-3.6-4.6-8.9z" fill="currentColor"/></svg><div><div class="brand-name">Atoll Cellar</div><div class="brand-sub">Wine control</div></div></div>
  ${NAV.map(g => ({ ...g, items: g.items.filter(([r]) => routeOK(r)) })).filter(g => g.items.length).map(g => `<nav class="nav-group" aria-label="${g.g}"><div class="nav-label">${g.g}</div>${g.items.map(([r, l]) => `<button type="button" class="nav-btn" data-act="go" data-arg="${r}"${UI.route === r ? ' aria-current="page"' : ''}><span>${l}</span>${b[r] ? `<span class="badge ${b[r][1]}">${b[r][0]}</span>` : ''}</button>`).join('')}</nav>`).join('')}
  <div class="side-foot">${accountBox()}</div>`;
}
function renderTop() {
  $('#topbar').innerHTML = `${modeBanner()}<div class="row">${S.props.length > 1 ? seg(S.props.map(p => [p.id, p.name]), UI.route === 'group' ? '' : UI.prop, 'prop', 'Resort') : `<span class="top-resort">${esc(curP().name)}</span>`}</div>
  <div class="row" style="gap:10px 14px"><span id="syncPill">${syncPill()}</span><div class="date">Business date <b>${fmtDL(TODAY)}</b> · prices in USD</div></div>`;
}
function render() {
  if (!S) return;
  if (!routeOK(UI.route)) UI.route = 'dashboard';
  if (UI.outlet !== 'all' && (!LM[UI.outlet] || LM[UI.outlet].prop !== UI.prop)) UI.outlet = 'all';
  renderSide(); renderTop();
  $('#view').innerHTML = (V[UI.route] || V.dashboard)();
  (AFTER[UI.route] || (() => { }))();
  saveUI();
}
function go(route) { UI.route = routeOK(route) ? route : 'dashboard'; try { history.replaceState(null, '', '#' + route); } catch (e) { } render(); window.scrollTo(0, 0); }
function rerenderKeep(id) { const el = document.getElementById(id); const pos = el ? el.selectionStart : null; render(); const n = document.getElementById(id); if (n) { n.focus(); try { if (pos != null) n.setSelectionRange(pos, pos); } catch (e) { } } }

/* ============ dashboard ============ */
V.dashboard = () => {
  const p = curP(); const ls = locSet(p.id, UI.outlet);
  const A = agg(D30(), TODAY, ls), B = agg(addDays(TODAY, -59), addDays(TODAY, -30), ls);
  const loss = lossesIn(D30(), TODAY, ls); const lossV = loss.reduce((a, x) => a + x.cost, 0);
  const sv = stockValue(ls);
  const cos = A.rev ? A.cost / A.rev * 100 : 0; const dl = B.rev ? (A.rev - B.rev) / B.rev * 100 : 0;
  const end = A.byDay[TODAY] ? 0 : 1; const pts = [];
  for (let i = 29 + end; i >= end; i--) { const d = addDays(TODAY, -i); const x = A.byDay[d] || { rev: 0, cost: 0 }; pts.push({ v: x.rev, label: (i - end) % 5 === 0 ? fmtD(d) : '', tip: `${fmtD(d)} · ${money(x.rev)} · COS ${x.rev ? pct(x.cost / x.rev * 100) : '–'}`, last: i === end }); }
  const top = Object.entries(A.byWine).filter(([wid]) => WM[wid]).sort((a, b) => b[1].rev - a[1].rev).slice(0, 8);
  const topT = `<div class="tw"><table class="t"><thead><tr><th>Wine</th><th class="num">Bottles</th><th class="num">Glasses</th><th class="num">Revenue</th><th class="num">COS</th></tr></thead><tbody>${top.map(([wid, x]) => `<tr><td>${wineCell(WM[wid])}</td><td class="num">${nf(x.b)}</td><td class="num">${nf(x.g)}</td><td class="num">${money(x.rev)}</td><td class="num">${pct(x.cost / x.rev * 100)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">No sales in the last 30 days yet.</td></tr>'}</tbody></table></div>`;
  const outs = salesLocs(p.id).filter(l => ls.has(l.id)); const mx = Math.max(1, ...outs.map(l => (A.byLoc[l.id] || {}).rev || 0));
  const ob = outs.map(l => { const x = A.byLoc[l.id] || { rev: 0, cost: 0 }; return `<div class="hb"><div class="small">${esc(l.name)}</div><div class="hb-track"><div class="hb-fill" style="width:${x.rev / mx * 100}%"></div></div><div class="small num">${money(x.rev)} <span class="muted">· ${x.rev ? pct(x.cost / x.rev * 100) : '–'}</span></div></div>`; }).join('');
  const att = attention(p.id);
  const attH = att.length ? `<div class="att">${att.map(a => `<div class="att-item"><span class="att-dot ${a.sev}"></span><div><div class="att-t">${esc(a.t)}</div><div class="att-s">${esc(a.s)}</div></div>${a.btn ? `<button type="button" class="btn sm" data-act="${a.act}" data-arg="${esc(a.arg)}">${a.btn}</button>` : ''}</div>`).join('')}</div>` : `<div class="empty">Nothing needs attention.</div>`;
  return ph('Dashboard', `${esc(p.name)}${p.atoll ? ` · ${esc(p.atoll)}` : ''} · the last 30 days`) + `<div class="stack">${getStarted()}
  ${chips([['all', 'All outlets'], ...salesLocs(p.id).map(l => [l.id, l.name])], UI.outlet, 'outlet')}
  <div class="kpis">${kpi('Wine revenue', money(A.rev), `${dlt(dl)} vs previous 30 days`)}${kpi('Cost of sales', pct(cos), `Target ${S.settings.cosBottle}% · ${money(A.cost)} at cost`)}${kpi('Gross profit', money(A.rev - A.cost), `${nf(A.b)} bottles · ${nf(A.g)} glasses`)}${kpi('Losses & comps', money(lossV), `${A.rev ? pct(lossV / A.rev * 100) : '–'} of revenue · ${loss.length} entries`)}${kpi('Stock on hand', money(sv.c), `${nf(sv.b)} bottles · ${fmtK(sv.m)} at menu price`)}</div>
  <div class="g2"><div class="stack">${panel('Daily wine revenue', barChart(pts), { hint: 'Hover a bar for revenue and cost of sales. The latest day is highlighted.' })}${panel('Top wines by revenue', topT, { flush: true })}</div>
  <div class="stack">${panel('Needs attention', attH, { flush: true, hint: `${att.length} item${att.length === 1 ? '' : 's'} at ${esc(p.name)}` })}${panel('Revenue by outlet', ob || '<div class="empty">No outlet selected.</div>', { hint: 'Revenue · cost of sales' })}</div></div></div>`;
};

/* ============ group ============ */
V.group = () => {
  const rows = S.props.map(p => {
    const ls = locSet(p.id); const A = agg(D30(), TODAY, ls), B = agg(addDays(TODAY, -59), addDays(TODAY, -30), ls);
    const lossV = lossesIn(D30(), TODAY, ls).reduce((a, x) => a + x.cost, 0);
    const val = stockValue(ls).c; const att = attention(p.id);
    const varV = p.locs.reduce((a, l) => { const c = lastCount(l.id); return a + (c ? c.varCost : 0); }, 0);
    return { p, A, B, lossV, val, att, varV, yl: yieldByLoc(p.id) };
  });
  const T = rows.reduce((a, r) => ({ rev: a.rev + r.A.rev, cost: a.cost + r.A.cost, loss: a.loss + r.lossV, val: a.val + r.val, iss: a.iss + r.att.filter(x => x.sev !== 'info').length, prev: a.prev + r.B.rev }), { rev: 0, cost: 0, loss: 0, val: 0, iss: 0, prev: 0 });
  const stat = (k, v, s = '') => `<div><div class="fc-k">${k}</div><div class="num" style="font-size:19px;font-weight:600;line-height:1.3">${v}</div>${s ? `<div class="wsub">${s}</div>` : ''}</div>`;
  const cards = rows.map(r => {
    const cos = r.A.rev ? r.A.cost / r.A.rev * 100 : 0; const dl = r.B.rev ? (r.A.rev - r.B.rev) / r.B.rev * 100 : 0;
    const bad = r.att.filter(a => a.sev === 'bad').length, warn = r.att.filter(a => a.sev === 'warn').length;
    return panel(esc(r.p.name), `<div class="form-grid" style="grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:16px">${stat('Revenue · 30 days', money(r.A.rev), dlt(dl))}${stat('Cost of sales', pct(cos), `target ${S.settings.cosBottle}%`)}${stat('Losses & comps', money(r.lossV), `${pct(r.A.rev ? r.lossV / r.A.rev * 100 : 0)} of revenue`)}${stat('Stock at cost', money(r.val))}${stat('Last count variance', money(r.varV), 'all locations')}</div>
    <div class="row" style="margin-top:14px">${bad ? pill(`${bad} urgent`, 'bad') : ''}${warn ? pill(`${warn} to review`, 'warn') : ''}${!bad && !warn ? pill('All clear', 'good') : ''}</div>`, { hint: esc(r.p.atoll), actions: `<button type="button" class="btn sm" data-act="open-prop" data-arg="${r.p.id}">Open dashboard</button>` });
  }).join('');
  const weeks = []; for (let i = 7; i >= 0; i--) { const to = addDays(TODAY, -1 - i * 7); weeks.push({ from: addDays(to, -6), to }); }
  const wv = weeks.map(wk => rows.map(r => agg(wk.from, wk.to, locSet(r.p.id)).rev));
  const { h, top } = gridLines(Math.max(1, ...wv.flat()), fmtK);
  const chart = `<div class="chart"><div class="plot grouped">${h}${weeks.map((wk, i) => `<div class="gbars">${wv[i].map((v, j) => `<div class="bar${j ? ' b2' : ''}" style="height:${v / top * 100}%" data-tip="${esc(rows[j].p.name)} · week to ${fmtD(wk.to)} · ${money(v)}"></div>`).join('')}<span class="xl">${fmtD(wk.to)}</span></div>`).join('')}</div></div>
  <div class="legend" style="margin-top:6px">${rows.map((r, j) => `<span><i style="background:${j ? 'var(--t-rose)' : 'var(--bar)'}"></i>${esc(r.p.name)}</span>`).join('')}</div>`;
  const outl = rows.flatMap(r => salesLocs(r.p.id).map(l => ({ r, l, x: r.A.byLoc[l.id] || { rev: 0, cost: 0, b: 0, g: 0 }, lv: lossesIn(D30(), TODAY, new Set([l.id])).reduce((a, y) => a + y.cost, 0), y: r.yl[l.id] }))).sort((a, b) => b.x.rev - a.x.rev);
  const table = `<div class="tw"><table class="t"><thead><tr><th>Outlet</th><th>Resort</th><th class="num">Revenue</th><th class="num">Bottles</th><th class="num">Glasses</th><th class="num">COS</th><th class="num">Losses</th><th class="num">Pour yield</th></tr></thead><tbody>${outl.map(o => `<tr><td class="wn">${esc(o.l.name)}</td><td class="small muted">${esc(o.r.p.name)}</td><td class="num">${money(o.x.rev)}</td><td class="num">${nf(o.x.b)}</td><td class="num">${nf(o.x.g)}</td><td class="num">${o.x.rev ? pct(o.x.cost / o.x.rev * 100) : '–'}</td><td class="num">${money(o.lv)}</td><td class="num">${o.y ? pill(pct(o.y.y, 0), o.y.y < 93 ? 'warn' : 'good') : '<span class="muted">–</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  const dl = T.prev ? (T.rev - T.prev) / T.prev * 100 : 0;
  return ph('Group view', 'Every resort in the group side by side, for an owner, a cluster F&B director or a regional finance team.') + `<div class="stack">
  <div class="kpis">${kpi('Group wine revenue', money(T.rev), `${dlt(dl)} vs previous 30 days`)}${kpi('Group cost of sales', pct(T.rev ? T.cost / T.rev * 100 : 0), `${money(T.cost)} at cost`)}${kpi('Losses & comps', money(T.loss), `${pct(T.rev ? T.loss / T.rev * 100 : 0)} of revenue`)}${kpi('Stock at cost', money(T.val), `${S.props.length} resorts, ${S.props.reduce((a, p) => a + p.locs.length, 0)} locations`)}${kpi('Open issues', nf(T.iss), 'urgent or to review')}</div>
  <div class="g2e">${cards}</div>
  ${panel('Weekly wine revenue by resort', chart, { hint: 'Last 8 weeks' })}
  ${panel('Outlets across the group', table, { flush: true, hint: 'Last 30 days, ranked by revenue' })}</div>`;
};

/* ============ daily sales ============ */
function ensureDS() {
  if (UI.ds && UI.ds.prop === UI.prop) return UI.ds;
  const y = addDays(TODAY, -1); const outs = salesLocs(UI.prop); if (!outs.length) return null;
  const miss = outs.find(l => since(l) <= y && !isPosted(l.id, y)); const loc = (miss || outs[0]).id;
  UI.ds = { prop: UI.prop, loc, date: isPosted(loc, y) || since(LM[loc]) > y ? TODAY : y, mode: 'hand', q: {}, type: 'all', search: '', allWines: false, autoPull: true, posText: '', posRows: null, last: null };
  return UI.ds;
}
const lineRev = (w, v, loc) => { const pr = priceAt(loc, w); return (v.b || 0) * pr.b + (v.g || 0) * pr.g; };
function dsTotals() { let b = 0, g = 0, rev = 0, cost = 0; for (const [wid, v] of Object.entries(UI.ds.q)) { const w = WM[wid]; if (!w) continue; b += v.b || 0; g += v.g || 0; rev += lineRev(w, v, UI.ds.loc); cost += (v.b || 0) * w.cost + (v.g || 0) * cpg(w); } return { b, g, rev, cost }; }
function setText(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function updDs() {
  const ds = UI.ds; let t; if (!ds) return;
  if (ds.mode === 'hand') { t = dsTotals(); setText('ds-tb', nf(t.b)); setText('ds-tg', nf(t.g)); setText('ds-tr', money(t.rev)); }
  else { t = { b: 0, g: 0, rev: 0, cost: 0 }; for (const r of (ds.posRows && ds.posRows.rows) || []) { if (!r.wid) continue; const w = WM[r.wid]; const pr = priceAt(ds.loc, w); if (r.unit === 'bottle') { t.b += r.qty; t.rev += r.qty * pr.b; t.cost += r.qty * w.cost; } else { t.g += r.qty; t.rev += r.qty * pr.g; t.cost += r.qty * cpg(w); } } }
  setText('ds-sum', t.b || t.g ? `${nf(t.b)} bottles · ${nf(t.g)} glasses · ${money(t.rev)} · COS ${pct(t.rev ? t.cost / t.rev * 100 : 0)}` : 'Nothing to post yet');
  const btn = document.getElementById('ds-post'); if (btn) btn.disabled = !(t.b || t.g);
}
AFTER.sales = updDs;
function salesHand(ds, glassOK) {
  const q = ds.search.trim().toLowerCase();
  const listed = S.wines.filter(w => onList(ds.loc, w.id)).length; const hidden = S.wines.length - listed;
  const ws = S.wines.filter(w => (ds.allWines || onList(ds.loc, w.id) || ds.q[w.id]) && (ds.type === 'all' || w.type === ds.type) && (!q || `${wName(w)} ${w.vintage} ${codeB(w)} ${codeG(w)}`.toLowerCase().includes(q)));
  const rows = TYPES.map(t => {
    const list = ws.filter(w => w.type === t.id).sort((a, b) => priceAt(ds.loc, a).b - priceAt(ds.loc, b).b); if (!list.length) return '';
    return `<tr class="sec"><td colspan="5">${t.label}</td></tr>` + list.map(w => {
      const v = ds.q[w.id] || {}; const o = openB(ds.loc, w.id); const st = sealed(ds.loc, w.id); const canG = glassOK && w.gprice; const codes = [codeB(w), codeG(w)].filter(Boolean).join(' / ');
      return `<tr><td>${wineCell(w, `${codes ? ` · <span class="mono">${esc(codes)}</span>` : ''}${onList(ds.loc, w.id) ? '' : ' · <span class="muted">not on this list</span>'}`)}</td>
      <td class="num small${st <= 0 ? ' down' : ''}">${qf(st)} btl${o ? ` · ${o.pours} gl open` : ''}</td>
      <td class="num"><input class="inp qty${v.b ? ' has' : ''}" type="number" min="0" step="1" inputmode="numeric" id="dsb-${w.id}" data-inp="ds-q" data-w="${w.id}" data-f="b" value="${v.b || ''}" placeholder="0" aria-label="Bottles of ${esc(wName(w))}"></td>
      <td class="num">${canG ? `<input class="inp qty${v.g ? ' has' : ''}" type="number" min="0" step="1" inputmode="numeric" id="dsg-${w.id}" data-inp="ds-q" data-w="${w.id}" data-f="g" value="${v.g || ''}" placeholder="0" aria-label="Glasses of ${esc(wName(w))}">` : '<span class="muted small">–</span>'}</td>
      <td class="num" id="dsr-${w.id}">${lineRev(w, v, ds.loc) ? money(lineRev(w, v, ds.loc)) : ''}</td></tr>`;
    }).join('');
  }).join('');
  const none = !S.wines.length ? `No wines yet. ${isMgr() ? 'Add or import them on the Wines & stock page.' : 'Ask a manager to add the wine list.'}` : !listed && !ds.allWines ? `Nothing on the ${esc(LM[ds.loc].name)} list yet. ${isMgr() ? 'Copy wines to it on the Outlet lists page, or' : ''} tick "Show all wines" above.` : 'No wines match.';
  return `<div class="row between" style="padding:12px 16px;border-bottom:1px solid var(--line-2)"><input class="inp" type="search" id="ds-search" placeholder="Search wine or POS code" value="${esc(ds.search)}" data-inp="ds-search" style="flex:1;min-width:170px;max-width:300px" aria-label="Search wines">${chips(typeItems, ds.type, 'ds-type')}${hidden > 0 ? `<label class="check small"><input type="checkbox" data-chg="ds-all"${ds.allWines ? ' checked' : ''}> Show all wines (${hidden} not on this list)</label>` : ''}</div>
  <div class="tw"><table class="t"><thead><tr><th>Wine · POS codes</th><th class="num">At outlet</th><th class="num">Bottles</th><th class="num">Glasses</th><th class="num">Revenue</th></tr></thead><tbody>${rows || `<tr><td colspan="5" class="empty">${none}</td></tr>`}</tbody><tfoot><tr><td>Total</td><td></td><td class="num" id="ds-tb"></td><td class="num" id="ds-tg"></td><td class="num" id="ds-tr"></td></tr></tfoot></table></div>`;
}
function salesPOS(ds) {
  const pr = ds.posRows; let prev = '';
  if (pr && pr.err) prev = `<div style="padding:0 16px 16px"><div class="callout bad">${esc(pr.err)}</div></div>`;
  else if (pr) {
    const ok = pr.rows.filter(r => r.wid).length;
    prev = `<div class="tw"><table class="t"><thead><tr><th>POS item</th><th>Matched wine</th><th class="num">Qty</th><th>Unit</th><th>Status</th></tr></thead><tbody>${pr.rows.map(r => `<tr><td><span class="mono">${esc(r.code)}</span> <span class="small muted">${esc(r.name)}</span></td><td>${r.wid ? esc(wName(WM[r.wid])) : '<span class="muted">–</span>'}</td><td class="num">${nf(r.qty)}</td><td>${r.unit ? (r.unit === 'bottle' ? 'Bottle' : 'Glass') : '–'}</td><td>${r.wid ? pill('Matched', 'good') : pill(r.why, r.why === 'Unknown wine code' ? 'warn' : 'plain')}</td></tr>`).join('')}</tbody></table></div><p class="note" style="padding:10px 16px 0">${ok} wine lines matched. Food, water and unknown codes are left out.</p>`;
  }
  return `<div class="panel-b stack"><p class="note">Export the day's item sales from Simphony, Infrasys or any POS as CSV and paste it here. Wines are matched on POS item number, which you set on each wine. Unless you set your own, a wine's bottle code is 1000 + its number and its glass code 2000 + its number.</p>
  <textarea class="inp" id="ds-pos" rows="9" data-inp="ds-pos" placeholder="Business Date,Revenue Center,Item Number,Item Name,Qty,Net Sales" aria-label="POS export">${esc(ds.posText)}</textarea>
  <div class="row"><button type="button" class="btn" data-act="ds-sample">Load a sample export</button><button type="button" class="btn" data-act="ds-read">Read export</button></div></div>${prev}`;
}
function splitCSV(line, sep) { const out = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); }
function parsePOS(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim()); if (lines.length < 2) return { err: 'Paste an export with a header row and at least one item line.' };
  const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',');
  const head = splitCSV(lines[0], sep).map(h => h.toLowerCase());
  const iCode = head.findIndex(h => /item ?(number|no|code|#)|^code$|plu|^item id/.test(h)); const iQty = head.findIndex(h => /^qty|quantity|sold|count/.test(h)); const iName = head.findIndex(h => /item name|description|^name$/.test(h));
  if (iCode < 0 || iQty < 0) return { err: 'Could not find the item number and quantity columns. The first row needs headers such as "Item Number" and "Qty".' };
  const map = {}; for (const w of S.wines) { if (codeB(w)) map[codeB(w)] = [w.id, 'bottle']; if (codeG(w)) map[codeG(w)] = [w.id, 'glass']; }
  const rows = lines.slice(1).map(l => {
    const c = splitCSV(l, sep); const code = String(c[iCode] ?? '').trim().replace(/\.0+$/, ''); const qty = parseFloat(c[iQty]) || 0; const name = iName >= 0 ? c[iName] : '';
    let wid = null, unit = null, why = '';
    const hit = map[code];
    if (hit) { wid = hit[0]; unit = hit[1]; }
    else { const n = parseInt(code, 10); why = n >= 1000 && n < 3000 && String(n) === code ? 'Unknown wine code' : 'Not a wine item'; }
    if (!wid) unit = null;
    return { code: c[iCode], name, qty, wid, unit, why };
  });
  return { rows };
}
function sampleExport(loc, date) {
  const l = LM[loc]; const k = KIND[l.kind]; const rc = l.name.toUpperCase(); const rnd = Math.random;
  const out = ['Business Date,Revenue Center,Item Number,Item Name,Qty,Net Sales'];
  const gl = glassOK(l); const kk = k || KIND.other;
  const pick = S.wines.filter(w => codeB(w) && onList(loc, w.id) && kk.type[w.type] >= 0.8).sort(() => rnd() - 0.5).slice(0, 9);
  for (const w of pick) {
    const short = `${w.producer.split(' ')[0]} ${w.name}`.toUpperCase().replace(/,/g, '').slice(0, 24); const pr = priceAt(loc, w);
    if (w.gprice && gl && codeG(w) && rnd() < 0.85) { const g = 2 + Math.floor(rnd() * 8); out.push(`${date},${rc},${codeG(w)},${short} GLS,${g},${(g * pr.g).toFixed(2)}`); }
    if (!w.gprice || !gl || rnd() < 0.6) { const b = 1 + Math.floor(rnd() * (pr.b > 400 ? 1 : 3)); out.push(`${date},${rc},${codeB(w)},${short} BTL,${b},${(b * pr.b).toFixed(2)}`); }
  }
  out.push(`${date},${rc},3105,CLUB SANDWICH,4,112.00`, `${date},${rc},4012,STILL WATER 750ML,14,168.00`, `${date},${rc},1099,HOUSE SANGRIA CARAFE,2,90.00`);
  return out.join('\n');
}
function postingGrid(pid) {
  const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(TODAY, -i));
  let h = `<div class="sgrid" style="grid-template-columns:minmax(92px,1.6fr) repeat(7,minmax(26px,1fr))"><div></div>${days.map(d => `<div class="hd">${WDAY[parseD(d).getDay()].slice(0, 2)}<br>${parseD(d).getDate()}</div>`).join('')}`;
  for (const l of salesLocs(pid)) {
    h += `<div class="rl small">${esc(l.name)}</div>` + days.map(d => {
      if (isPosted(l.id, d)) return `<div class="cell ok" title="${esc(l.name)}, ${fmtD(d)}: posted">✓</div>`;
      if (d < since(l)) return `<div class="cell today" title="${esc(l.name)} was not set up yet">–</div>`;
      if (d === TODAY) return `<button type="button" class="cell today" style="border:0;cursor:pointer;font:inherit" data-act="ds-pick" data-arg="${l.id}|${d}" title="Today: post after service">·</button>`;
      return `<button type="button" class="cell miss" style="border:0;cursor:pointer;font:inherit" data-act="ds-pick" data-arg="${l.id}|${d}" title="${esc(l.name)}, ${fmtD(d)}: not posted. Click to post it.">!</button>`;
    }).join('');
  }
  return h + '</div>';
}
function recentPostings(pid) {
  const m = {}; const from = addDays(TODAY, -6); const ls = locSet(pid);
  for (const r of S.sales) { if (r[0] < from || !ls.has(r[1])) continue; const k = r[0] + '|' + r[1]; const x = m[k] ||= { d: r[0], loc: r[1], b: 0, g: 0, rev: 0 }; x.b += r[3]; x.g += r[4]; x.rev += r[6]; }
  const list = Object.values(m).sort((a, b) => b.d.localeCompare(a.d) || locName(a.loc).localeCompare(locName(b.loc))).slice(0, 9);
  return `<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Outlet</th><th class="num">Btl</th><th class="num">Gls</th><th class="num">Revenue</th></tr></thead><tbody>${list.map(x => `<tr><td class="num" style="text-align:left">${fmtD(x.d)}</td><td>${esc(locName(x.loc))}</td><td class="num">${x.b}</td><td class="num">${x.g}</td><td class="num">${money(x.rev)}</td></tr>`).join('')}</tbody></table></div>`;
}
V.sales = () => {
  const ds = ensureDS(); const p = curP();
  if (!ds) return ph('Daily sales', '') + noOutlets();
  const loc = LM[ds.loc]; const gOK = glassOK(loc);
  const posted = isPosted(ds.loc, ds.date);
  const head = `<div class="row" style="padding:14px 16px;border-bottom:1px solid var(--line-2);align-items:flex-end">
    <div class="field"><label for="ds-date">Business date</label><input class="inp" type="date" id="ds-date" value="${ds.date}" max="${TODAY}" data-chg="ds-date"></div>
    <div class="field"><label for="ds-loc">Outlet</label><select class="inp" id="ds-loc" data-chg="ds-loc">${locOptions(p.id, ds.loc, l => l.kind !== 'cellar')}</select></div>
    <div class="field"><span class="lbl">Method</span>${seg([['hand', 'Enter by hand'], ['pos', 'Import POS export']], ds.mode, 'ds-mode', 'Entry method')}</div></div>`;
  const notes = (ds.last ? `<div class="callout good">${esc(ds.last)}</div>` : '') + (posted ? `<div class="callout warn">${esc(loc.name)} is already posted for ${fmtD(ds.date)}. Posting again adds to it.</div>` : '') + (!gOK ? `<div class="callout">${esc(loc.name)} sells bottles only, so glass entry is switched off.</div>` : '');
  const body = ds.mode === 'hand' ? salesHand(ds, gOK) : salesPOS(ds);
  const entry = `<section class="panel"><div class="panel-h"><h2>Post sales</h2><span class="hint">Stock, margins and the guest list update as soon as you post</span></div>${head}${notes ? `<div class="stack" style="padding:14px 16px 0;gap:8px">${notes}</div>` : ''}${body}
    <div class="panel-f"><label class="check"><input type="checkbox" id="ds-pull" data-chg="ds-pull"${ds.autoPull ? ' checked' : ''}> Take any shortfall from the ${esc(cellarOf(p.id).name)} and log it as a transfer</label><div class="row"><span class="small muted" id="ds-sum"></span><button type="button" class="btn primary" id="ds-post" data-act="${ds.mode === 'hand' ? 'ds-post' : 'ds-post-pos'}">Post sales</button></div></div></section>`;
  return ph('Daily sales', 'After each service, post what every outlet sold. Enter it by hand or paste the POS export. Glass sales use up the open bottle first and open a new one when it runs out.') +
    `<div class="g2">${entry}<div class="stack">${panel('Posting status', postingGrid(p.id), { hint: 'Last 7 days. Click a red cell to post that day.' })}${panel('Recent postings', recentPostings(p.id), { flush: true })}</div></div>`;
};
CHG['ds-date'] = el => { UI.ds.date = el.value && el.value <= TODAY ? el.value : TODAY; UI.ds.last = null; render(); };
CHG['ds-loc'] = el => { Object.assign(UI.ds, { loc: el.value, q: {}, posRows: null, last: null }); render(); };
CHG['ds-pull'] = el => { UI.ds.autoPull = el.checked; };
CHG['ds-all'] = el => { UI.ds.allWines = el.checked; render(); };
ACT['ds-mode'] = el => { UI.ds.mode = el.dataset.arg; UI.ds.last = null; render(); };
ACT['ds-type'] = el => { UI.ds.type = el.dataset.arg; render(); };
INP['ds-search'] = el => { UI.ds.search = el.value; rerenderKeep('ds-search'); };
INP['ds-pos'] = el => { UI.ds.posText = el.value; };
INP['ds-q'] = el => {
  const wid = el.dataset.w, f = el.dataset.f; const v = Math.max(0, Math.floor(+el.value || 0));
  (UI.ds.q[wid] ||= {})[f] = v; el.classList.toggle('has', v > 0);
  const w = WM[wid]; const r = lineRev(w, UI.ds.q[wid], UI.ds.loc); setText('dsr-' + wid, r ? money(r) : ''); updDs();
};
function postedMsg(res, loc, date) {
  let m = `Posted ${nf(res.b)} bottles and ${nf(res.g)} glasses for ${locName(loc)}, ${fmtD(date)}: ${money(res.rev)} revenue at ${pct(res.rev ? res.cost / res.rev * 100 : 0)} cost of sales.`;
  if (res.pulled) m += ` ${res.pulled} bottle${res.pulled > 1 ? 's' : ''} moved from the ${cellarOf(LM[loc].prop).name}.`;
  if (res.negative.length) m += ` Stock went below zero for ${res.negative.map(id => wName(WM[id])).join(', ')}. Check for a missing transfer.`;
  return m;
}
ACT['ds-post'] = () => {
  const ds = UI.ds; const lines = Object.entries(ds.q).filter(([, v]) => v.b || v.g).map(([wid, v]) => ({ wid, b: v.b || 0, g: v.g || 0 }));
  if (!lines.length) return toast('Enter at least one bottle or glass first.');
  const res = postSales(ds.date, ds.loc, lines, ds.autoPull); save();
  ds.q = {}; ds.last = postedMsg(res, ds.loc, ds.date); render(); toast('Sales posted. Stock updated.');
};
ACT['ds-sample'] = () => { UI.ds.posText = sampleExport(UI.ds.loc, UI.ds.date); UI.ds.posRows = parsePOS(UI.ds.posText); UI.ds.last = null; render(); };
ACT['ds-read'] = () => { const t = $('#ds-pos'); UI.ds.posText = t ? t.value : UI.ds.posText; UI.ds.posRows = parsePOS(UI.ds.posText); render(); };
ACT['ds-post-pos'] = () => {
  const ds = UI.ds; if (!ds.posRows || !ds.posRows.rows) return toast('Read an export first.');
  const m = {}; for (const r of ds.posRows.rows) { if (!r.wid) continue; const x = m[r.wid] ||= { wid: r.wid, b: 0, g: 0 }; if (r.unit === 'bottle') x.b += r.qty; else x.g += r.qty; }
  const lines = Object.values(m); if (!lines.length) return toast('No wine lines were matched.');
  const res = postSales(ds.date, ds.loc, lines, ds.autoPull); save();
  Object.assign(ds, { posText: '', posRows: null, last: postedMsg(res, ds.loc, ds.date) }); render(); toast('POS export posted. Stock updated.');
};
ACT['ds-pick'] = el => { const [loc, d] = el.dataset.arg.split('|'); Object.assign(ensureDS(), { loc, date: d, q: {}, posRows: null, last: null }); render(); window.scrollTo(0, 0); };
ACT['go-sales'] = el => { UI.ds = null; const ds = ensureDS(); if (ds) Object.assign(ds, { loc: el.dataset.arg, date: addDays(TODAY, -1) }); go('sales'); };

/* ============ by the glass ============ */
V.glass = () => {
  const p = curP(); const outs = glassLocs(p.id); const out = outs.some(l => l.id === UI.outlet) ? UI.outlet : 'all';
  const ol = openList(p.id, out).sort((a, b) => ({ bad: 0, warn: 1, good: 2 }[a.f.cls] - { bad: 0, warn: 1, good: 2 }[b.f.cls]) || b.f.age - a.f.age);
  const stale = ol.filter(x => x.f.cls === 'bad'); const left = ol.reduce((a, x) => a + x.o.pours * cpg(x.w), 0);
  const yr = yieldRows(p.id).filter(r => out === 'all' || r.loc === out).sort((a, b) => a.y - b.y);
  const T = yr.reduce((a, r) => ({ g: a.g + r.g, op: a.op + r.opened, eq: a.eq + r.g / r.std, lost: a.lost + r.lost }), { g: 0, op: 0, eq: 0, lost: 0 });
  const y = T.op ? T.eq / T.op * 100 : 100;
  const openT = ol.length ? `<div class="tw"><table class="t"><thead><tr><th>Wine</th><th>Outlet</th><th class="num">Opened</th><th class="num">Days open</th><th>Glasses left</th><th class="num">Value left</th><th>Status</th><th></th></tr></thead><tbody>${ol.map(x => `<tr><td>${wineCell(x.w)}</td><td class="small">${esc(locName(x.loc))}</td><td class="num">${fmtD(x.o.opened)}</td><td class="num">${x.f.age} of ${x.f.life}</td><td><div class="row" style="gap:8px;flex-wrap:nowrap"><div class="meter ${x.f.cls === 'bad' ? 'bad' : ''}" style="width:64px"><i style="width:${x.o.pours / gpb(x.w) * 100}%"></i></div><span class="small num">${x.o.pours} of ${gpb(x.w)}</span></div></td><td class="num">${money(x.o.pours * cpg(x.w), 2)}</td><td>${pill(x.f.lbl, x.f.cls)}</td><td class="num"><button type="button" class="btn sm" data-act="discard" data-arg="${x.loc}|${x.w.id}">Discard rest</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No bottles open.</div>';
  const yT = `<div class="tw"><table class="t"><thead><tr><th>Outlet</th><th>Wine</th><th class="num">Glasses sold</th><th class="num">Bottles opened</th><th class="num">Glasses per bottle</th><th class="num">Yield</th><th class="num">Lost at cost</th></tr></thead><tbody>${yr.map(r => `<tr><td class="small">${esc(locName(r.loc))}</td><td>${wineCell(r.w)}</td><td class="num">${nf(r.g)}</td><td class="num">${nf(r.opened)}</td><td class="num">${r.actual.toFixed(1)} <span class="muted">of ${r.std}</span></td><td class="num">${pill(pct(r.y, 0), r.y < 90 ? 'bad' : r.y < 95 ? 'warn' : 'good')}</td><td class="num">${money(r.lost)}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No glass sales in the last 30 days.</td></tr>'}</tbody></table></div>`;
  const btg = S.wines.filter(w => w.gprice).sort((a, b) => TYPES.findIndex(t => t.id === a.type) - TYPES.findIndex(t => t.id === b.type) || a.gprice - b.gprice);
  const pT = `<div class="tw"><table class="t"><thead><tr><th>Wine</th><th class="num">Bottle</th><th class="num">Pour</th><th class="num">Glasses</th><th class="num">Glass price</th><th class="num">Cost per glass</th><th class="num">Glass COS</th></tr></thead><tbody>${btg.map(w => { const c = cosG(w); const f = priceFlag(c, S.settings.cosGlass); return `<tr><td>${wineCell(w)}</td><td class="num">${w.ml} ml</td><td class="num">${isMgr() ? `<select class="inp" style="padding:4px 6px" data-chg="pour" data-w="${w.id}" aria-label="Pour size for ${esc(wName(w))}">${[...new Set([60, 75, 100, 125, 150, 175, 187, w.pour])].sort((a, b) => a - b).map(v => `<option value="${v}"${v === w.pour ? ' selected' : ''}>${v} ml</option>`).join('')}</select>` : `${w.pour} ml`}</td><td class="num">${gpb(w)}</td><td class="num">${money(w.gprice)}</td><td class="num">${money(cpg(w), 2)}</td><td class="num">${pill(pct(c), f[1])}</td></tr>`; }).join('')}</tbody></table></div>`;
  if (!outs.length) return ph('By the glass', '') + `<div class="panel"><div class="empty">None of the outlets at ${esc(p.name)} pours wine by the glass. ${isMgr() ? 'Switch it on for an outlet under Resorts &amp; outlets.' : ''}</div></div>`;
  return ph('By the glass', 'Track every open bottle, spot over-pouring and set pour sizes. Changing a pour size recalculates glasses per bottle and glass cost straight away.') + `<div class="stack">
  ${chips([['all', 'All outlets'], ...outs.map(l => [l.id, l.name])], out, 'outlet')}
  <div class="kpis">${kpi('Open bottles', nf(ol.length), `${money(left)} of wine left, at cost`)}${kpi('Past shelf life', nf(stale.length), stale.length ? 'Taste, then discard and log' : 'All within shelf life')}${kpi('Pour yield', pct(y, 0), `${nf(T.g)} glasses from ${nf(T.op)} bottles, last 30 days`)}${kpi('Over-pour cost', money(T.lost), 'Wine poured but not charged, at cost')}</div>
  ${panel('Open bottles', openT, { flush: true, hint: `Shelf life: sparkling ${S.settings.shelf.sparkling} day, still wines ${S.settings.shelf.white} days, fortified ${S.settings.shelf.sweet} days. Change it in Settings.` })}
  <div class="g2e">${panel('Pour yield', yT, { flush: true, hint: 'Glasses sold against bottles opened. Below 95% usually means heavy pours or unrecorded wastage.' })}${panel('Pour sizes', pT, { flush: true, hint: 'Standard pour per wine' })}</div></div>`;
};
CHG['pour'] = el => {
  const w = WM[el.dataset.w]; w.pour = +el.value; const g = gpb(w);
  for (const loc of Object.keys(S.open)) { const o = S.open[loc][w.id]; if (o && o.pours > g) o.pours = g; }
  save(); render(); toast(`${wName(w)} now pours ${w.pour} ml: ${g} glasses per bottle, ${money(cpg(w), 2)} cost per glass.`);
};
ACT['discard'] = el => {
  const [loc, wid] = el.dataset.arg.split('|'); const o = openB(loc, wid); const w = WM[wid]; if (!o || !w) return;
  const age = diffDays(o.opened, TODAY); const cost = r2(o.pours * cpg(w));
  S.losses.push({ id: uid('L'), ts: Date.now(), date: TODAY, loc, wid, qty: o.pours, unit: 'glass', type: 'wastage', note: `Discarded after ${age} day${age === 1 ? '' : 's'} open`, by: me(), cost });
  delete S.open[loc][wid]; save(); render(); toast(`Logged ${o.pours} glass${o.pours === 1 ? '' : 'es'} of ${wName(w)} as wastage (${money(cost, 2)}).`);
};

/* ============ losses & comps ============ */
V.losses = () => {
  const p = curP(); const ls = locSet(p.id); const A = agg(D30(), TODAY, ls); const lf = UI.lf ||= { type: 'all' };
  const L30 = lossesIn(D30(), TODAY, ls); const byT = Object.fromEntries(LOSS_TYPES.map(t => [t.id, { n: 0, v: 0 }]));
  L30.forEach(x => { byT[x.type].n++; byT[x.type].v += x.cost; }); const tot = L30.reduce((a, x) => a + x.cost, 0);
  const nid = x => x.ts || parseInt(x.id.slice(1), 10) || 0;
  const list = S.losses.filter(x => ls.has(x.loc) && (lf.type === 'all' || x.type === lf.type)).sort((a, b) => b.date.localeCompare(a.date) || nid(b) - nid(a));
  const tbl = `<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Wine</th><th>Where</th><th class="num">Qty</th><th>Reason</th><th>Note</th><th class="num">Cost</th><th>Supplier credit</th></tr></thead><tbody>${list.map(x => { const w = WM[x.wid]; return `<tr><td class="num" style="text-align:left">${fmtD(x.date)}</td><td>${w ? wineCell(w) : esc(x.wid)}</td><td class="small">${esc(locName(x.loc))}</td><td class="num">${x.qty} ${x.unit === 'glass' ? 'gl' : 'btl'}</td><td>${pill(LOSS[x.type].label, x.type === 'comp' ? 'info' : x.type === 'staff' ? 'plain' : x.type === 'spoiled' ? 'bad' : 'warn')}</td><td class="small">${esc(x.note)}${x.by ? `<div class="wsub">${esc(x.by)}</div>` : ''}</td><td class="num">${money(x.cost, 2)}</td><td>${x.type === 'spoiled' ? (x.credit === 'claimed' ? pill('Claimed', 'good') : `<button type="button" class="btn sm" data-act="claim" data-arg="${x.id}">Mark claimed</button>`) : ''}</td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">Nothing logged.</td></tr>'}</tbody></table></div>`;
  const form = `<div class="stack" style="gap:12px">
    <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="field"><label for="lf-date">Date</label><input class="inp" type="date" id="lf-date" value="${TODAY}" max="${TODAY}"></div><div class="field"><label for="lf-loc">Where</label><select class="inp" id="lf-loc">${locOptions(p.id, lf.loc && LM[lf.loc] && LM[lf.loc].prop === p.id ? lf.loc : (salesLocs(p.id)[0] || cellarOf(p.id)).id)}</select></div></div>
    <div class="field"><label for="lf-wine">Wine</label><select class="inp" id="lf-wine">${wineOptions(lf.wine)}</select></div>
    <div class="form-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="field"><label for="lf-qty">Quantity</label><input class="inp" type="number" id="lf-qty" min="1" step="1" value="1"></div><div class="field"><label for="lf-unit">Unit</label><select class="inp" id="lf-unit"><option value="bottle">Bottles</option><option value="glass">Glasses</option></select></div></div>
    <div class="field"><label for="lf-type">Reason</label><select class="inp" id="lf-type">${LOSS_TYPES.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}</select></div>
    <div class="field"><label for="lf-note">Note</label><input class="inp" id="lf-note" placeholder="For example: corked, returned by guest"></div>
    <div class="field"><label for="lf-by">Approved by</label><input class="inp" id="lf-by" placeholder="Name or role" value="${esc(me(true))}"></div>
    <p class="note">Spoiled or corked bottles stay flagged until you claim credit from the supplier.</p></div>`;
  return ph('Losses & comps', 'Every bottle that leaves stock without a sale: breakage, guest comps, staff tastings, corked wine and open-bottle wastage. Logging them here keeps the month-end variance honest.') + `<div class="stack">
  <div class="kpis">${LOSS_TYPES.map(t => kpi(t.label, money(byT[t.id].v), `${byT[t.id].n} entr${byT[t.id].n === 1 ? 'y' : 'ies'}, 30 days`)).join('')}${kpi('Total', money(tot), `${A.rev ? pct(tot / A.rev * 100) : '–'} of wine revenue`)}</div>
  <div class="g2">${panel('Log', `<div style="padding:12px 16px;border-bottom:1px solid var(--line-2)">${chips([['all', 'All'], ...LOSS_TYPES.map(t => [t.id, t.label])], lf.type, 'lf-type')}</div>${tbl}`, { flush: true })}${panel('Log a loss', form, { foot: `<span class="small muted">Takes it out of stock straight away</span><button type="button" class="btn primary" data-act="log-loss">Log it</button>` })}</div></div>`;
};
ACT['lf-type'] = el => { UI.lf.type = el.dataset.arg; render(); };
ACT['claim'] = el => { const x = S.losses.find(l => l.id === el.dataset.arg); if (x) { x.credit = 'claimed'; save(); render(); toast(`Supplier credit marked as claimed (${money(x.cost, 2)}).`); } };
ACT['log-loss'] = () => {
  const g = id => document.getElementById(id).value; const loc = g('lf-loc'), wid = g('lf-wine'), qty = Math.floor(+g('lf-qty') || 0), unit = g('lf-unit'), type = g('lf-type'), date = g('lf-date') || TODAY;
  const w = WM[wid]; if (!w) return toast('Choose a wine.'); if (qty < 1) return toast('Enter a quantity of at least 1.');
  if (unit === 'glass' && !w.gprice) return toast(`${wName(w)} is not poured by the glass. Log it in bottles.`);
  S.stock[loc] ||= {};
  if (unit === 'glass') { const op = consumeGlasses(loc, wid, qty, date); S.stock[loc][wid] = sealed(loc, wid) - op; } else S.stock[loc][wid] = sealed(loc, wid) - qty;
  const cost = r2(unit === 'glass' ? qty * cpg(w) : qty * w.cost);
  S.losses.push({ id: uid('L'), ts: Date.now(), date, loc, wid, qty, unit, type, note: g('lf-note').trim() || LOSS[type].label, by: g('lf-by').trim(), cost, credit: type === 'spoiled' ? 'pending' : null });
  UI.lf.loc = loc; UI.lf.wine = wid; save(); render();
  toast(`Logged ${qty} ${unit === 'glass' ? 'glass' : 'bottle'}${qty > 1 ? (unit === 'glass' ? 'es' : 's') : ''} of ${wName(w)} as ${LOSS[type].label.toLowerCase()} (${money(cost, 2)}).`);
};

/* ============ stock count ============ */
function ensureCnt() { if (UI.cnt && LM[UI.cnt.loc] && LM[UI.cnt.loc].prop === UI.prop) return UI.cnt; UI.cnt = { loc: cellarOf(UI.prop).id, vals: {}, showAll: false }; return UI.cnt; }
function cosBefore(loc, date) { const l = LM[loc]; const ls = l.kind === 'cellar' ? locSet(l.prop) : new Set([loc]); return agg(addDays(date, -29), date, ls).cost; }
function updCnt() {
  const c = UI.cnt; let n = 0, vb = 0, vc = 0, lines = 0;
  for (const [wid, raw] of Object.entries(c.vals)) {
    const w = WM[wid]; if (!w || raw === '' || raw == null || isNaN(+raw)) continue; n++;
    const d = +raw - eqAt(c.loc, wid); if (Math.abs(d) > 0.049) { lines++; vb += d; vc += d * w.cost; }
  }
  setText('cnt-sum', n ? `${n} counted · ${lines} with variance · ${vb > 0 ? '+' : vb < 0 ? '−' : ''}${qf(Math.abs(vb))} bottles · ${money(vc, 2)} at cost` : 'Nothing counted yet');
  const b = document.getElementById('cnt-post'); if (b) b.disabled = !n;
}
AFTER.count = updCnt;
V.count = () => {
  const p = curP(); const c = ensureCnt(); const last = lastCount(c.loc);
  const ws = S.wines.filter(w => c.showAll || eqAt(c.loc, w.id) > 0.001 || (c.vals[w.id] ?? '') !== '');
  const rows = TYPES.map(t => {
    const list = ws.filter(w => w.type === t.id); if (!list.length) return '';
    return `<tr class="sec"><td colspan="5">${t.label}</td></tr>` + list.map(w => {
      const sys = eqAt(c.loc, w.id); const raw = c.vals[w.id] ?? ''; const cv = raw === '' ? null : +raw; const d = cv == null ? null : cv - sys;
      return `<tr><td>${wineCell(w)}</td><td class="num">${qf(sys)}</td><td class="num"><input class="inp qty${raw !== '' ? ' has' : ''}" type="number" min="0" step="0.1" inputmode="decimal" id="cnt-${w.id}" data-inp="cnt" data-w="${w.id}" value="${esc(raw)}" placeholder="${qf(sys)}" aria-label="Counted bottles of ${esc(wName(w))}"></td>
      <td class="num" id="cv-${w.id}">${varCell(d)}</td><td class="num" id="cc-${w.id}">${d == null || Math.abs(d) < 0.05 ? '' : money(d * w.cost, 2)}</td></tr>`;
    }).join('');
  }).join('');
  const hist = S.counts.filter(x => LM[x.loc] && LM[x.loc].prop === p.id).sort((a, b) => b.date.localeCompare(a.date) || locName(a.loc).localeCompare(locName(b.loc)));
  const hT = `<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Location</th><th class="num">Lines</th><th class="num">Variance</th><th class="num">At cost</th><th class="num">Of cost of sales</th><th>Detail</th></tr></thead><tbody>${hist.map(x => { const cs = cosBefore(x.loc, x.date); const r = cs ? Math.abs(x.varCost) / cs * 100 : 0; return `<tr><td class="num" style="text-align:left">${fmtD(x.date)}</td><td>${esc(locName(x.loc))}</td><td class="num">${x.n}</td><td class="num">${x.varB > 0 ? '+' : ''}${qf(x.varB)} btl</td><td class="num ${x.varCost < 0 ? 'down' : ''}">${money(x.varCost, 2)}</td><td class="num">${pill(pct(r), r > 2 ? 'bad' : r > 1 ? 'warn' : 'good')}</td><td class="small">${x.lines.length ? `<details><summary>${x.lines.length} line${x.lines.length > 1 ? 's' : ''}</summary>${x.lines.map(([wid, s, cc]) => `<div>${esc(WM[wid] ? wName(WM[wid]) : wid)}: ${qf(s)} → ${qf(cc)}</div>`).join('')}</details>` : '<span class="muted">No variance</span>'}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">No counts yet.</td></tr>'}</tbody></table></div>`;
  const age = last ? diffDays(last.date, TODAY) : null;
  return ph('Stock count', 'Count what is physically there and enter it next to the system figure. Part bottles count as decimals: 0.4 is a bottle about 40% full. The difference is your variance, valued at cost.') + `<div class="stack">
  <div class="row" style="align-items:flex-end"><div class="field"><label for="cnt-loc">Location</label><select class="inp" id="cnt-loc" data-chg="cnt-loc">${locOptions(p.id, c.loc)}</select></div>
  <div class="small muted" style="padding-bottom:8px">${last ? `Last counted ${fmtD(last.date)} (${age} days ago)` : 'Never counted'} ${age != null && age > 35 ? pill('Overdue', 'warn') : ''}</div>
  <label class="check" style="padding-bottom:8px"><input type="checkbox" data-chg="cnt-all"${c.showAll ? ' checked' : ''}> Show wines with no system stock</label></div>
  ${panel('Count sheet', `<div class="tw"><table class="t"><thead><tr><th>Wine</th><th class="num">System</th><th class="num">Counted</th><th class="num">Variance</th><th class="num">At cost</th></tr></thead><tbody>${rows || '<tr><td colspan="5" class="empty">No stock here. Tick the box above to count every wine.</td></tr>'}</tbody></table></div>`, { flush: true, hint: esc(locName(c.loc)), actions: `<button type="button" class="btn sm" data-act="cnt-copy">Fill with system figures</button>${isDemo() ? '<button type="button" class="btn sm" data-act="cnt-sim">Simulate a count</button>' : ''}`, foot: `<span class="small" id="cnt-sum"></span><button type="button" class="btn primary" id="cnt-post" data-act="cnt-post">Post count</button>` })}
  ${panel('Count history', hT, { flush: true, hint: 'Under 1% of cost of sales is good practice. Over 2% needs investigating.' })}</div>`;
};
function varCell(d) { if (d == null) return ''; if (Math.abs(d) < 0.05) return '<span class="muted">0</span>'; return `<span class="${d < 0 ? 'down' : 'up'}">${d > 0 ? '+' : ''}${qf(d)}</span>`; }
CHG['cnt-loc'] = el => { UI.cnt = { loc: el.value, vals: {}, showAll: UI.cnt.showAll }; render(); };
CHG['cnt-all'] = el => { UI.cnt.showAll = el.checked; render(); };
INP['cnt'] = el => {
  const wid = el.dataset.w; const c = UI.cnt; c.vals[wid] = el.value; el.classList.toggle('has', el.value !== '');
  const w = WM[wid]; const d = el.value === '' ? null : +el.value - eqAt(c.loc, wid);
  const cv = document.getElementById('cv-' + wid); if (cv) cv.innerHTML = varCell(d);
  setText('cc-' + wid, d == null || Math.abs(d) < 0.05 ? '' : money(d * w.cost, 2)); updCnt();
};
ACT['cnt-copy'] = () => { const c = UI.cnt; S.wines.forEach(w => { const s = eqAt(c.loc, w.id); if (c.showAll || s > 0.001) c.vals[w.id] = qf(s); }); render(); };
ACT['cnt-sim'] = () => {
  const c = UI.cnt; const ws = S.wines.filter(w => eqAt(c.loc, w.id) > 0.001);
  ws.forEach(w => { let v = eqAt(c.loc, w.id); const x = Math.random(); if (x < 0.08) v -= 1; else if (x < 0.12) v -= 0.5; else if (x < 0.14) v += 1; c.vals[w.id] = qf(Math.max(0, v)); });
  render(); toast('Filled with a sample count. Check the variance column, then post it.');
};
ACT['cnt-post'] = () => {
  const c = UI.cnt; const lines = []; let n = 0, vb = 0, vc = 0;
  for (const [wid, raw] of Object.entries(c.vals)) {
    const w = WM[wid]; if (!w || raw === '' || isNaN(+raw)) continue; n++;
    const cv = Math.max(0, +raw); const sys = eqAt(c.loc, wid); const d = cv - sys;
    if (Math.abs(d) > 0.049) { lines.push([wid, r2(sys), cv]); vb += d; vc += d * w.cost; }
    S.stock[c.loc] ||= {}; const g = gpb(w);
    if (g) { const whole = Math.floor(cv + 1e-9); const pours = Math.round((cv - whole) * g); S.stock[c.loc][wid] = whole; S.open[c.loc] ||= {}; if (pours > 0) { const o = openB(c.loc, wid); S.open[c.loc][wid] = { pours, opened: o ? o.opened : TODAY }; } else delete S.open[c.loc][wid]; }
    else S.stock[c.loc][wid] = cv;
  }
  if (!n) return toast('Enter at least one counted figure.');
  S.counts.push({ id: uid('C'), date: TODAY, loc: c.loc, n, lines, varCost: r2(vc), varB: r2(vb), by: me() });
  c.vals = {}; save(); render(); toast(`Count posted for ${locName(c.loc)}. Variance ${money(vc, 2)} at cost. System stock now matches your count.`);
};
ACT['go-count'] = el => { UI.cnt = { loc: el.dataset.arg, vals: {}, showAll: false }; go('count'); };


/* ============ wines & stock ============ */
V.wines = () => {
  const p = curP(); const f = UI.wf ||= { q: '', type: 'all', sup: 'all' }; const q = f.q.trim().toLowerCase(); const mgr = isMgr();
  const sel = UI.wsel ||= {}; for (const k of Object.keys(sel)) if (!WM[k]) delete sel[k]; const nSel = Object.values(sel).filter(Boolean).length;
  const ws = S.wines.filter(w => (f.type === 'all' || w.type === f.type) && (f.sup === 'all' || w.supplier === f.sup) && (!q || `${wName(w)} ${w.vintage} ${w.region} ${w.country} ${w.grapes.join(' ')}`.toLowerCase().includes(q)))
    .sort((a, b) => TYPES.findIndex(t => t.id === a.type) - TYPES.findIndex(t => t.id === b.type) || a.price - b.price);
  let tb = 0, tv = 0;
  const rows = ws.map(w => {
    const per = p.locs.map(l => eqAt(l.id, w.id)); const tot = per.reduce((a, b) => a + b, 0); tb += tot; tv += tot * w.cost;
    const st = tot < 0.05 ? pill('Out', 'bad') : tot < w.par ? pill('Below par', 'warn') : pill('In stock', 'good');
    const c = cosB(w);
    const cell = (l, v) => { const on = onList(l.id, w.id); if (!on && !v) return `<td class="num"><span class="muted" title="Not on the ${esc(l.name)} list">–</span></td>`; return `<td class="num${v < 0 ? ' down' : ''}"${on ? '' : ` title="Not on the ${esc(l.name)} list"`}>${v ? qf(v) : '<span class="muted">0</span>'}${on ? '' : '<span class="muted">*</span>'}</td>`; };
    return `<tr class="${mgr ? 'click' : ''}${sel[w.id] ? ' hl' : ''}"${mgr ? ` data-act="edit-wine" data-arg="${w.id}"` : ''}>${mgr ? `<td class="cb"><input type="checkbox" data-chg="wsel" data-w="${w.id}"${sel[w.id] ? ' checked' : ''} aria-label="Select ${esc(wName(w))}"></td>` : ''}<td>${wineCell(w)}</td><td class="num">${money(w.cost)}</td><td class="num">${money(w.price)}</td><td class="num">${w.gprice ? money(w.gprice) : '<span class="muted">–</span>'}</td><td class="num">${pct(c)}</td>${p.locs.map((l, i) => cell(l, per[i])).join('')}<td class="num"><b>${qf(tot)}</b></td><td class="num">${money(tot * w.cost)}</td><td>${st}</td></tr>`;
  }).join('');
  const trs = S.transfers.filter(t => LM[t.from] && LM[t.from].prop === p.id).slice(-10).reverse();
  const tT = `<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Wine</th><th>From</th><th>To</th><th class="num">Bottles</th><th></th></tr></thead><tbody>${trs.map(t => `<tr><td class="num" style="text-align:left">${fmtD(t.date)}</td><td>${WM[t.wid] ? esc(wName(WM[t.wid])) : esc(t.wid)}</td><td class="small">${esc(locName(t.from))}</td><td class="small">${esc(locName(t.to))}</td><td class="num">${t.qty}</td><td>${t.auto ? pill('From sales posting', 'plain') : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No transfers yet.</td></tr>'}</tbody></table></div>`;
  const allSel = ws.length > 0 && ws.every(w => sel[w.id]);
  const bulk = mgr && nSel ? `<div class="bulkbar"><span><b>${nSel}</b> wine${nSel > 1 ? 's' : ''} selected</span><div class="row"><button type="button" class="btn sm primary" data-act="cp-open" data-arg="sel">Copy to outlets…</button><button type="button" class="btn sm" data-act="wsel-clear">Clear</button></div></div>` : '';
  if (!S.wines.length) return ph('Wines & stock', `No wines yet at ${esc(p.name)}.`) + `<div class="panel"><div class="empty stack" style="align-items:center">${mgr ? `<p style="margin:0">Start your cellar list. Import it from Excel or add wines one by one. Everything you add lives in the ${esc(cellarOf(p.id).name)}, and you can then copy wines to each outlet's list.</p><div class="row" style="justify-content:center"><button type="button" class="btn primary" data-act="imp-open">Import from Excel</button><button type="button" class="btn" data-act="add-wine">Add a wine</button></div>` : '<p style="margin:0">A manager has not added the wine list yet.</p>'}</div></div>`;
  return ph('Wines & stock', `${S.wines.length} wines in the cellar list, with stock at every location of ${esc(p.name)}.${mgr ? ' Click a wine to edit it, or tick wines to copy them to outlet lists.' : ''}`, `${mgr ? '<button type="button" class="btn" data-act="imp-open">Import from Excel</button>' : ''}<button type="button" class="btn" data-act="tf-open">Transfer stock</button>${mgr ? '<button type="button" class="btn primary" data-act="add-wine">Add a wine</button>' : ''}`) + `<div class="stack">${bulk}
  <div class="row between"><input class="inp" type="search" id="wf-q" placeholder="Search name, region or grape" value="${esc(f.q)}" data-inp="wf-q" style="flex:1;min-width:180px;max-width:320px" aria-label="Search wines">${chips(typeItems, f.type, 'wf-type')}<select class="inp" data-chg="wf-sup" aria-label="Supplier"><option value="all">All suppliers</option>${S.suppliers.map(s => `<option value="${s.id}"${f.sup === s.id ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
  ${panel('Cellar list and stock', `<div class="tw"><table class="t"><thead><tr>${mgr ? `<th class="cb"><input type="checkbox" data-chg="wsel-all"${allSel ? ' checked' : ''} aria-label="Select all wines shown"></th>` : ''}<th>Wine</th><th class="num">Cost</th><th class="num">Bottle</th><th class="num">Glass</th><th class="num">COS</th>${p.locs.map(l => `<th class="num">${esc(l.name)}</th>`).join('')}<th class="num">Total</th><th class="num">At cost</th><th>Status</th></tr></thead><tbody>${rows || `<tr><td colspan="${(mgr ? 10 : 9) + p.locs.length}" class="empty">No wines match.</td></tr>`}</tbody><tfoot><tr>${mgr ? '<td></td>' : ''}<td>${ws.length} wines</td><td colspan="${4 + p.locs.length}"></td><td class="num">${qf(tb)}</td><td class="num">${money(tv)}</td><td></td></tr></tfoot></table></div>`, { flush: true, hint: 'Bottles, including part-used by-the-glass bottles. A dash means the wine is not on that outlet\'s list.' })}
  ${panel('Recent transfers', tT, { flush: true })}</div>`;
};
INP['wf-q'] = el => { UI.wf.q = el.value; rerenderKeep('wf-q'); };
ACT['wf-type'] = el => { UI.wf.type = el.dataset.arg; render(); };
CHG['wf-sup'] = el => { UI.wf.sup = el.value; render(); };
CHG['wsel'] = el => { UI.wsel[el.dataset.w] = el.checked; render(); };
CHG['wsel-all'] = el => { const f = UI.wf; const q = f.q.trim().toLowerCase(); S.wines.filter(w => (f.type === 'all' || w.type === f.type) && (f.sup === 'all' || w.supplier === f.sup) && (!q || `${wName(w)} ${w.vintage} ${w.region} ${w.country} ${w.grapes.join(' ')}`.toLowerCase().includes(q))).forEach(w => { UI.wsel[w.id] = el.checked; }); render(); };
ACT['wsel-clear'] = () => { UI.wsel = {}; render(); };
const fld = (label, id, val, type = 'text', extra = '') => `<div class="field"><label for="${id}">${label}</label><input class="inp" id="${id}" type="${type}" value="${esc(val)}" ${extra}></div>`;
const sel5 = (label, id, v) => `<div class="field"><label for="${id}">${label}</label><select class="inp" id="${id}">${[1, 2, 3, 4, 5].map(n => `<option${n === v ? ' selected' : ''}>${n}</option>`).join('')}</select></div>`;
function wineForm(w, isNew) {
  return `<div class="modal-h"><h2>${isNew ? 'Add a wine' : esc(wName(w))}</h2><button type="button" class="btn ghost" data-act="modal-close">Close</button></div>
  <div class="modal-b">
    <div class="form-grid">${fld('Wine name', 'wf-name', w.name)}${fld('Producer', 'wf-producer', w.producer)}${fld('Vintage', 'wf-vintage', w.vintage)}
      <div class="field"><label for="wf-type">Type</label><select class="inp" id="wf-type">${TYPES.map(t => `<option value="${t.id}"${t.id === w.type ? ' selected' : ''}>${t.label}</option>`).join('')}</select></div>
      ${fld('Country', 'wf-country', w.country)}${fld('Region', 'wf-region', w.region)}${fld('Grapes (comma separated)', 'wf-grapes', w.grapes.join(', '))}</div>
    <div class="form-grid">${fld('Cost price (USD)', 'wf-cost', w.cost, 'number', 'min="0" step="0.01"')}${fld('Bottle price', 'wf-price', w.price, 'number', 'min="0" step="1"')}${fld('Glass price (0 = bottle only)', 'wf-gprice', w.gprice, 'number', 'min="0" step="1"')}${fld('Bottle size (ml)', 'wf-ml', w.ml, 'number', 'min="100" step="1"')}${fld('Pour (ml)', 'wf-pour', w.pour, 'number', 'min="30" step="5"')}</div>
    <div class="form-grid"><div class="field"><label for="wf-supplier">Supplier</label><select class="inp" id="wf-supplier">${S.suppliers.map(s => `<option value="${s.id}"${s.id === w.supplier ? ' selected' : ''}>${esc(s.name)} (${s.lead} days)</option>`).join('')}</select></div>
      ${fld('Par level (bottles)', 'wf-par', w.par, 'number', 'min="0" step="1"')}${fld('Case size', 'wf-case', w.caseSize, 'number', 'min="1" step="1"')}${isNew ? fld(`Opening stock at ${esc(cellarOf(UI.prop).name)}`, 'wf-stock', 0, 'number', 'min="0" step="1"') : ''}</div>
    <div class="form-grid">${fld('POS item no. (bottle)', 'wf-posb', w.posB || '', 'text', `placeholder="${isNew ? 'Automatic' : esc(codeB({ ...w, posB: '' }) || 'Not set')}" inputmode="numeric"`)}${fld('POS item no. (glass)', 'wf-posg', w.posG || '', 'text', `placeholder="${isNew ? 'Automatic' : esc(codeG({ ...w, posG: '', gprice: 1 }) || 'Not set')}" inputmode="numeric"`)}</div>
    ${isNew && salesLocs(UI.prop).length ? `<div class="field"><span class="lbl">Put it on these outlet lists</span><div class="pchips">${salesLocs(UI.prop).map(l => `<label><input type="checkbox" name="wf-outlet" value="${l.id}" checked> ${esc(l.name)}</label>`).join('')}</div></div>` : ''}
    <div class="form-grid">${sel5('Body', 'wf-body', w.body)}${sel5('Acidity', 'wf-acid', w.acid)}${sel5('Sweetness', 'wf-sweet', w.sweet)}</div>
    <div class="field"><span class="lbl">Pairs with</span><div class="pchips">${PAIRINGS.map(pp => `<label><input type="checkbox" name="wf-pair" value="${esc(pp)}"${w.pair.includes(pp) ? ' checked' : ''}> ${esc(pp)}</label>`).join('')}</div></div>
    <div class="field"><label for="wf-note">Tasting note, shown to guests</label><textarea class="inp" id="wf-note" rows="2" style="font-family:var(--sans);font-size:13px">${esc(w.note)}</textarea></div>
    <div class="field"><label for="wf-sell">How to sell it, for staff training</label><textarea class="inp" id="wf-sell" rows="2" style="font-family:var(--sans);font-size:13px">${esc(w.sell)}</textarea></div>
    <label class="check"><input type="checkbox" id="wf-pick"${w.pick ? ' checked' : ''}> Sommelier's pick (highlighted on the guest list)</label>
  </div>
  <div class="modal-f"><div>${isNew ? '' : `<button type="button" class="btn danger" data-act="del-wine" data-arg="${w.id}">Delete wine</button>`}</div><div class="row"><button type="button" class="btn" data-act="modal-close">Cancel</button><button type="button" class="btn primary" data-act="save-wine" data-arg="${isNew ? '' : w.id}">${isNew ? 'Add wine' : 'Save changes'}</button></div></div>`;
}
const blankWine = () => ({ name: '', producer: '', vintage: '', type: 'white', country: '', region: '', grapes: [], ml: 750, cost: 0, price: 0, gprice: 0, pour: 150, supplier: S.suppliers[0].id, caseSize: 6, par: 6, body: 3, acid: 3, sweet: 1, pair: [], note: '', sell: '', pick: false });
ACT['edit-wine'] = el => modal(wineForm(WM[el.dataset.arg], false));
ACT['add-wine'] = () => modal(wineForm(blankWine(), true));
ACT['save-wine'] = el => {
  const g = id => document.getElementById(id).value.trim(); const n = id => +document.getElementById(id).value || 0;
  const d = { name: g('wf-name'), producer: g('wf-producer'), vintage: g('wf-vintage') || 'NV', type: g('wf-type'), country: g('wf-country'), region: g('wf-region'), grapes: g('wf-grapes').split(',').map(s => s.trim()).filter(Boolean), cost: n('wf-cost'), price: n('wf-price'), gprice: n('wf-gprice'), ml: n('wf-ml') || 750, pour: n('wf-pour') || 150, supplier: g('wf-supplier'), par: Math.round(n('wf-par')), caseSize: Math.max(1, Math.round(n('wf-case'))), body: n('wf-body'), acid: n('wf-acid'), sweet: n('wf-sweet'), pair: $$('input[name="wf-pair"]:checked').map(i => i.value), note: g('wf-note'), sell: g('wf-sell'), pick: document.getElementById('wf-pick').checked, posB: g('wf-posb'), posG: g('wf-posg') };
  if (!d.name) return toast('Give the wine a name.'); if (d.cost <= 0 || d.price <= 0) return toast('Enter a cost price and a bottle price above zero.');
  const clash = [d.posB, d.posG].filter(Boolean).find(c => S.wines.some(x => x.id !== el.dataset.arg && (codeB(x) === c || codeG(x) === c)));
  if (clash) return toast(`POS item no. ${clash} is already used by another wine.`);
  let w; let listed = 0;
  if (el.dataset.arg) { w = WM[el.dataset.arg]; Object.assign(w, d); }
  else {
    w = { id: uid('w'), pos: nextPos(), pop: 0, gpop: 0, added: TODAY, ...d }; S.wines.push(w); reindex();
    const st = Math.max(0, Math.round(n('wf-stock'))); const cel = cellarOf(UI.prop).id; S.stock[cel][w.id] = st;
    for (const i of $$('input[name="wf-outlet"]:checked')) listed += addToList(i.value, [w.id]);
  }
  reindex(); save(); closeModal(); render(); toast(`${wName(w)} saved. Bottle cost of sales ${pct(cosB(w))}.${listed ? ` Added to ${listed} outlet list${listed > 1 ? 's' : ''}.` : ''}`);
};
ACT['del-wine'] = el => {
  if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Click again to delete'; return; }
  const id = el.dataset.arg; const w = WM[id]; S.wines = S.wines.filter(x => x.id !== id);
  for (const loc of Object.keys(S.stock)) delete S.stock[loc][id]; for (const loc of Object.keys(S.open)) delete S.open[loc][id];
  for (const p of S.props) for (const l of p.locs) { if (l.list) l.list = l.list.filter(x => x !== id); if (l.prices) delete l.prices[id]; }
  reindex(); save(); closeModal(); render(); toast(`${wName(w)} removed from the list. Its sales history is kept.`);
};
/* transfers */
function transferForm() {
  const p = curP(); const t = UI.tf && LM[UI.tf.from] && LM[UI.tf.from].prop === p.id ? UI.tf : (UI.tf = { from: cellarOf(p.id).id, to: (salesLocs(p.id)[0] || cellarOf(p.id)).id, wid: '', qty: 6 });
  if (!WM[t.wid]) t.wid = (S.wines.find(w => sealed(t.from, w.id) > 0) || S.wines[0] || {}).id || '';
  const av = sealed(t.from, t.wid);
  return `<div class="modal-h"><h2>Transfer stock</h2><button type="button" class="btn ghost" data-act="modal-close">Close</button></div><div class="modal-b">
  <p class="note">Move sealed bottles between the cellar and outlets, for example a morning requisition for the bar.</p>
  <div class="form-grid"><div class="field"><label for="tf-from">From</label><select class="inp" id="tf-from" data-chg="tf" data-f="from">${locOptions(p.id, t.from)}</select></div><div class="field"><label for="tf-to">To</label><select class="inp" id="tf-to" data-chg="tf" data-f="to">${locOptions(p.id, t.to)}</select></div></div>
  <div class="field"><label for="tf-wid">Wine</label><select class="inp" id="tf-wid" data-chg="tf" data-f="wid">${wineOptions(t.wid)}</select></div>
  <div class="form-grid"><div class="field"><label for="tf-qty">Bottles</label><input class="inp" type="number" id="tf-qty" min="1" step="1" value="${t.qty}"></div><div class="field"><span class="lbl">Available at ${esc(locName(t.from))}</span><div style="padding:8px 0;font-weight:600">${qf(av)} bottles</div></div></div>
  <div id="tf-err"></div></div>
  <div class="modal-f"><span></span><div class="row"><button type="button" class="btn" data-act="modal-close">Cancel</button><button type="button" class="btn primary" data-act="tf-post">Transfer</button></div></div>`;
}
ACT['tf-open'] = () => { if (!S.wines.length) return toast('Add wines first.'); if (curP().locs.length < 2) return toast('Add an outlet first.'); modal(transferForm()); };
CHG['tf'] = el => { const q = document.getElementById('tf-qty'); UI.tf.qty = q ? +q.value : UI.tf.qty; UI.tf[el.dataset.f] = el.value; modal(transferForm()); };
ACT['tf-post'] = () => {
  const t = UI.tf; t.qty = Math.floor(+document.getElementById('tf-qty').value || 0); const err = document.getElementById('tf-err');
  const fail = m => { err.innerHTML = `<div class="callout bad">${esc(m)}</div>`; };
  if (t.from === t.to) return fail('Choose two different locations.'); if (t.qty < 1) return fail('Enter at least 1 bottle.');
  if (t.qty > sealed(t.from, t.wid)) return fail(`Only ${qf(sealed(t.from, t.wid))} sealed bottles at ${locName(t.from)}.`);
  S.stock[t.from][t.wid] = sealed(t.from, t.wid) - t.qty; S.stock[t.to] ||= {}; S.stock[t.to][t.wid] = sealed(t.to, t.wid) + t.qty;
  S.transfers.push({ id: uid('T'), date: TODAY, from: t.from, to: t.to, wid: t.wid, qty: t.qty, by: me() }); save(); closeModal(); render();
  toast(`Moved ${t.qty} bottles of ${wName(WM[t.wid])} to ${locName(t.to)}.`);
};
/* import */
const IMPORT_SAMPLE = ['Wine\tProducer\tVintage\tType\tCountry\tRegion\tGrapes\tCost price\tBottle price\tGlass price\tStock',
  'Grüner Veltliner Federspiel\tDomäne Wachau\t2023\tWhite\tAustria\tWachau\tGrüner Veltliner\t17\t85\t17\t24',
  'Chianti Classico Riserva\tFèlsina\t2020\tRed\tItaly\tTuscany\tSangiovese\t29\t130\t\t12',
  'Brut Réserve\tCharles Heidsieck\tNV\tChampagne\tFrance\tChampagne\tChardonnay, Pinot Noir, Pinot Meunier\t62\t260\t\t12'].join('\n');
const COLMAP = [['gprice', /glass|btg|gls|by the glass/], ['cost', /cost|purchase|buy/], ['price', /(bottle|btl|selling|menu|sale|list).*price|^price$|^selling|^menu/], ['name', /^(wine|wine name|name|label|item|description)$/], ['producer', /producer|winery|brand|house|domaine/], ['vintage', /vintage|year/], ['type', /^(type|category|colou?r|style)$/], ['country', /country/], ['region', /region|appellation/], ['grapes', /grape|variet/], ['stock', /stock|qty|quantity|on hand|bottles/]];
function mapImport(arr) {
  const rows = arr.filter(r => r && r.some(c => String(c ?? '').trim() !== '')); if (rows.length < 2) return { err: 'Need a header row and at least one wine.' };
  const head = rows[0].map(h => String(h ?? '').trim().toLowerCase()); const idx = {};
  head.forEach((h, i) => { for (const [k, re] of COLMAP) if (idx[k] == null && re.test(h)) { idx[k] = i; break; } });
  if (idx.name == null) return { err: 'Could not find a column for the wine name. Call it "Wine" or "Name".' };
  const num = v => { const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
  const typeOf = v => { const s = String(v || '').toLowerCase(); if (/spark|champ|prosecco|cava|cr[eé]mant|fizz/.test(s)) return 'sparkling'; if (/ros/.test(s)) return 'rose'; if (/sweet|dessert|port|fortif|sauternes|sherry/.test(s)) return 'sweet'; if (/red|rouge|tinto|rosso/.test(s)) return 'red'; return 'white'; };
  const wines = [], skipped = [];
  for (const r of rows.slice(1)) {
    const get = k => idx[k] == null ? '' : String(r[idx[k]] ?? '').trim();
    const w = { ...blankWine(), name: get('name'), producer: get('producer'), vintage: get('vintage') || 'NV', type: typeOf(get('type')), country: get('country'), region: get('region'), grapes: get('grapes').split(/[,/;]/).map(s => s.trim()).filter(Boolean), cost: num(get('cost')), price: num(get('price')), gprice: num(get('gprice')), stock: Math.max(0, Math.round(num(get('stock')))) };
    w.pair = { sparkling: ['Aperitif', 'Seafood'], white: ['Seafood', 'Grilled fish'], rose: ['Aperitif', 'Grilled fish'], red: ['Red meat', 'Cheese'], sweet: ['Dessert', 'Cheese'] }[w.type];
    if (!w.name) continue; if (!w.cost || !w.price) { skipped.push(w.name); continue; } wines.push(w);
  }
  return { cols: Object.keys(idx), wines, skipped };
}
function importForm() {
  const im = UI.imp ||= { text: '', res: null, fname: '' }; const r = im.res; let prev = '';
  if (r && r.err) prev = `<div class="callout bad">${esc(r.err)}</div>`;
  else if (r) prev = `<div class="callout good">Found columns: ${r.cols.map(c => ({ gprice: 'glass price', cost: 'cost', price: 'bottle price' }[c] || c)).join(', ')}.${r.skipped.length ? ` Skipped ${r.skipped.length} without a cost or price: ${esc(r.skipped.join(', '))}.` : ''}</div>
    <div class="tw"><table class="t"><thead><tr><th>Wine</th><th>Type</th><th class="num">Cost</th><th class="num">Bottle</th><th class="num">Glass</th><th class="num">COS</th><th class="num">Stock</th></tr></thead><tbody>${r.wines.map(w => `<tr><td><div class="wn">${esc(w.producer ? w.producer + ' ' + w.name : w.name)}</div><div class="wsub">${esc(w.vintage)} · ${esc(w.region)}${w.country ? ', ' + esc(w.country) : ''}</div></td><td>${TYPE[w.type].short}</td><td class="num">${money(w.cost)}</td><td class="num">${money(w.price)}</td><td class="num">${w.gprice ? money(w.gprice) : '–'}</td><td class="num">${pct(w.cost / w.price * 100)}</td><td class="num">${w.stock}</td></tr>`).join('')}</tbody></table></div>`;
  const n = r && r.wines ? r.wines.length : 0;
  return `<div class="modal-h"><h2>Import wines</h2><button type="button" class="btn ghost" data-act="modal-close">Close</button></div><div class="modal-b">
  <p class="note">Upload your wine list as Excel (.xlsx) or CSV, or paste rows copied straight from Excel. The first row must be headers. Columns it understands: Wine, Producer, Vintage, Type, Country, Region, Grapes, Cost price, Bottle price, Glass price, Stock.</p>
  <div class="row"><input type="file" id="imp-file" accept=".xlsx,.xls,.csv,.tsv,.txt" data-chg="imp-file" class="inp" aria-label="Choose a file"><button type="button" class="btn" data-act="imp-sample">Paste a sample</button>${im.fname ? `<span class="small muted">${esc(im.fname)}</span>` : ''}</div>
  <textarea class="inp" id="imp-text" rows="6" data-inp="imp-text" placeholder="Paste rows from Excel here" aria-label="Pasted rows">${esc(im.text)}</textarea>
  <div class="row"><button type="button" class="btn" data-act="imp-read">Read rows</button></div>${prev}</div>
  ${salesLocs(UI.prop).length ? `<div class="field" style="padding:0 20px 16px"><span class="lbl">Also put the imported wines on these outlet lists</span><div class="pchips">${salesLocs(UI.prop).map(l => `<label><input type="checkbox" name="imp-outlet" value="${l.id}"${im.outlets && !im.outlets.includes(l.id) ? '' : ' checked'} data-chg="imp-outlet"> ${esc(l.name)}</label>`).join('')}</div></div>` : ''}
  <div class="modal-f"><span class="small muted">Stock goes into the ${esc(cellarOf(UI.prop).name)} at ${esc(curP().name)}.</span><div class="row"><button type="button" class="btn" data-act="modal-close">Cancel</button><button type="button" class="btn primary" data-act="imp-add"${n ? '' : ' disabled'}>Add ${n || ''} wine${n === 1 ? '' : 's'}</button></div></div>`;
}
function textRows(t) { const lines = t.split(/\r?\n/); const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') && !lines[0].includes(',') ? ';' : ','); return lines.map(l => sep === '\t' ? l.split('\t') : splitCSV(l, sep)); }
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load failed')); document.head.appendChild(s); }); }
ACT['imp-open'] = () => { UI.imp = { text: '', res: null, fname: '', outlets: null }; modal(importForm()); };
CHG['imp-outlet'] = () => { UI.imp.outlets = $$('input[name="imp-outlet"]:checked').map(i => i.value); };
INP['imp-text'] = el => { UI.imp.text = el.value; };
ACT['imp-sample'] = () => { UI.imp.text = IMPORT_SAMPLE; UI.imp.res = mapImport(textRows(IMPORT_SAMPLE)); UI.imp.fname = ''; modal(importForm()); };
ACT['imp-read'] = () => { const t = (document.getElementById('imp-text') || {}).value || ''; UI.imp.text = t; UI.imp.res = t.trim() ? mapImport(textRows(t.trim())) : { err: 'Paste some rows or choose a file first.' }; modal(importForm()); };
CHG['imp-file'] = async el => {
  const f = el.files && el.files[0]; if (!f) return; UI.imp.fname = f.name;
  try {
    let arr;
    if (/\.xlsx?$/i.test(f.name)) {
      if (!window.XLSX) { toast('Loading the Excel reader…'); await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'); }
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); arr = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
      UI.imp.text = '';
    } else { const t = await f.text(); UI.imp.text = t; arr = textRows(t.trim()); }
    UI.imp.res = mapImport(arr);
  } catch (e) { UI.imp.res = { err: 'Could not read that file. Try saving it as CSV, or paste the rows instead.' }; }
  modal(importForm());
};
ACT['imp-add'] = () => {
  const r = UI.imp.res; if (!r || !r.wines || !r.wines.length) return; const cel = cellarOf(UI.prop).id;
  const outs = $$('input[name="imp-outlet"]:checked').map(i => i.value); const ids = [];
  for (const x of r.wines) { const { stock, ...w } = x; w.id = uid('w'); w.pos = nextPos(); w.pop = 0; w.gpop = 0; w.added = TODAY; S.wines.push(w); S.stock[cel][w.id] = stock; ids.push(w.id); }
  reindex(); for (const o of outs) addToList(o, ids);
  reindex(); save(); closeModal(); render(); toast(`Added ${r.wines.length} wine${r.wines.length > 1 ? 's' : ''} to the cellar list${outs.length ? ` and ${outs.length} outlet list${outs.length > 1 ? 's' : ''}` : ''}.`);
};

/* ============ reorder ============ */
function ensureRO(rows) {
  if (UI.ro && UI.ro.prop === UI.prop) return UI.ro;
  UI.ro = { prop: UI.prop, sel: {}, qty: {}, filter: 'need' };
  rows.forEach(r => { UI.ro.qty[r.w.id] = r.qty; UI.ro.sel[r.w.id] = ['out', 'urgent', 'order'].includes(r.status) && r.qty > 0; });
  return UI.ro;
}
function updRO() {
  const ro = UI.ro; let n = 0, b = 0, v = 0; const sups = new Set();
  for (const [wid, on] of Object.entries(ro.sel)) { const q = ro.qty[wid] || 0; const w = WM[wid]; if (!on || !q || !w) continue; n++; b += q; v += q * w.cost; sups.add(w.supplier); }
  setText('ro-sum', n ? `${n} line${n > 1 ? 's' : ''} · ${nf(b)} bottles · ${money(v)} · ${sups.size} supplier${sups.size > 1 ? 's' : ''}` : 'Nothing selected');
  const btn = document.getElementById('ro-go'); if (btn) btn.disabled = !n;
}
AFTER.reorder = updRO;
V.reorder = () => {
  const p = curP(); const rows = reorderRows(p.id).sort((a, b) => RSTAT[a.status][2] - RSTAT[b.status][2] || a.cover - b.cover); const ro = ensureRO(rows);
  const vis = rows.filter(r => ro.filter === 'all' || (ro.filter === 'need' ? ['out', 'urgent', 'order', 'soon'].includes(r.status) : r.status === 'over'));
  const cnt = s => rows.filter(r => s.includes(r.status)).length;
  const onOrderV = S.pos.filter(po => po.prop === p.id && po.status === 'sent').reduce((a, po) => a + po.lines.reduce((x, [wid, q]) => x + q * (WM[wid] ? WM[wid].cost : 0), 0), 0);
  const overV = rows.filter(r => r.status === 'over').reduce((a, r) => a + r.stock * r.w.cost, 0);
  const tbl = `<div class="tw"><table class="t"><thead><tr><th></th><th>Wine</th><th>Supplier</th><th class="num">Stock</th><th class="num">On order</th><th class="num">Use a day</th><th class="num">Days left</th><th class="num">Reorder at</th><th>Status</th><th class="num">Order</th><th class="num">Cost</th></tr></thead><tbody>${vis.map(r => { const q = ro.qty[r.w.id] ?? r.qty; const late = isFinite(r.cover) && r.cover < r.sup.lead; return `<tr class="${ro.sel[r.w.id] ? 'hl' : ''}"><td><input type="checkbox" data-chg="ro-sel" data-w="${r.w.id}"${ro.sel[r.w.id] ? ' checked' : ''} aria-label="Order ${esc(wName(r.w))}"></td><td>${wineCell(r.w)}</td><td><div class="small">${esc(r.sup.name)}</div><div class="wsub">${r.sup.lead}-day lead time</div></td><td class="num">${qf(r.stock)}</td><td class="num">${r.oo || '<span class="muted">–</span>'}</td><td class="num">${r.avg ? r.avg.toFixed(1) : '<span class="muted">0</span>'}</td><td class="num${late ? ' down' : ''}">${isFinite(r.cover) ? Math.round(r.cover) : '<span class="muted">No sales</span>'}</td><td class="num">${r.rp}</td><td>${pill(RSTAT[r.status][0], RSTAT[r.status][1])}</td><td class="num"><input class="inp qty" type="number" min="0" step="${r.w.caseSize}" id="roq-${r.w.id}" data-inp="ro-qty" data-w="${r.w.id}" value="${q}" aria-label="Bottles to order of ${esc(wName(r.w))}"></td><td class="num" id="rol-${r.w.id}">${q ? money(q * r.w.cost) : ''}</td></tr>`; }).join('') || '<tr><td colspan="11" class="empty">Nothing in this view.</td></tr>'}</tbody></table></div>`;
  const pos = S.pos.filter(po => po.prop === p.id).sort((a, b) => (a.status === 'sent' ? 0 : 1) - (b.status === 'sent' ? 0 : 1) || b.date.localeCompare(a.date));
  const poT = `<div class="tw"><table class="t"><thead><tr><th>PO</th><th>Supplier</th><th class="num">Raised</th><th class="num">Due</th><th>Wines</th><th class="num">Value</th><th>Status</th><th></th></tr></thead><tbody>${pos.map(po => { const v = po.lines.reduce((a, [wid, q]) => a + q * (WM[wid] ? WM[wid].cost : 0), 0); const late = po.status === 'sent' && po.eta < TODAY; return `<tr><td class="mono">${po.no}</td><td class="small">${esc(supplier(po.supplier).name)}</td><td class="num">${fmtD(po.date)}</td><td class="num${late ? ' down' : ''}">${fmtD(po.eta)}</td><td class="small">${po.lines.map(([wid, q]) => `${q} × ${esc(WM[wid] ? wName(WM[wid]) : wid)}`).join('<br>')}</td><td class="num">${money(v)}</td><td>${po.status === 'sent' ? pill(late ? 'Late' : 'On order', late ? 'bad' : 'info') : pill(`Received ${fmtD(po.received)}`, 'good')}</td><td class="num"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><button type="button" class="btn sm" data-act="po-copy" data-arg="${po.id}">Copy</button>${po.status === 'sent' ? `<button type="button" class="btn sm" data-act="po-recv" data-arg="${po.id}">Receive</button>` : ''}</div></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">No purchase orders yet.</td></tr>'}</tbody></table></div>`;
  return ph('Reorder', 'Suggestions use the last 30 days of sales, each supplier\'s lead time and a safety buffer, so island shipping times are built in. Stock counts every bottle at every location.') + `<div class="stack">
  <div class="kpis">${kpi('Run out before delivery', nf(cnt(['urgent', 'out'])), 'Order today, or find a local substitute')}${kpi('Below reorder point', nf(cnt(['order'])), `${cnt(['soon'])} more getting close`)}${kpi('On order', money(onOrderV), `${S.pos.filter(po => po.prop === p.id && po.status === 'sent').length} open purchase orders`)}${kpi('Overstocked', money(overV), `${cnt(['over'])} wines, at cost`)}</div>
  <div class="row between">${chips([['need', 'Needs ordering'], ['over', 'Overstocked'], ['all', 'All wines']], ro.filter, 'ro-filter')}
    <div class="row small"><label for="ro-safe">Safety stock</label><input class="inp qty" style="width:60px" type="number" min="0" id="ro-safe" value="${S.settings.safetyDays}" data-chg="set" data-k="safetyDays"> days <span class="muted">·</span> <label for="ro-cyc">Order cycle</label><input class="inp qty" style="width:60px" type="number" min="1" id="ro-cyc" value="${S.settings.cycleDays}" data-chg="set" data-k="cycleDays"> days</div></div>
  ${panel('Suggested order', tbl, { flush: true, hint: `Lead times: ${S.suppliers.map(s => `${esc(s.name)} ${s.lead} days`).join(' · ')}`, foot: `<span class="small" id="ro-sum"></span><button type="button" class="btn primary" id="ro-go" data-act="ro-create">Create purchase orders</button>` })}
  ${panel('Purchase orders', poT, { flush: true, hint: `Receiving an order adds the bottles to the ${esc(cellarOf(p.id).name)}` })}</div>`;
};
ACT['ro-filter'] = el => { UI.ro.filter = el.dataset.arg; render(); };
CHG['ro-sel'] = el => { UI.ro.sel[el.dataset.w] = el.checked; el.closest('tr').classList.toggle('hl', el.checked); updRO(); };
INP['ro-qty'] = el => { const q = Math.max(0, Math.floor(+el.value || 0)); UI.ro.qty[el.dataset.w] = q; const w = WM[el.dataset.w]; setText('rol-' + w.id, q ? money(q * w.cost) : ''); updRO(); };
ACT['ro-create'] = () => {
  const ro = UI.ro; const by = {};
  for (const [wid, on] of Object.entries(ro.sel)) { const q = ro.qty[wid] || 0; const w = WM[wid]; if (!on || !q || !w) continue; (by[w.supplier] ||= []).push([wid, q]); }
  const sups = Object.keys(by); if (!sups.length) return toast('Select at least one wine with a quantity.');
  let no = Math.max(2400, ...S.pos.map(po => parseInt(po.no.split('-')[1], 10) || 0));
  const made = sups.map(s => { const po = { id: uid('P'), no: `PO-${++no}`, date: TODAY, supplier: s, prop: UI.prop, lines: by[s], status: 'sent', eta: addDays(TODAY, supplier(s).lead), by: me() }; S.pos.push(po); return po.no; });
  UI.ro = null; save(); render(); toast(`Created ${made.join(', ')}. Use Copy to send them to the supplier.`);
};
ACT['po-copy'] = el => {
  const po = S.pos.find(x => x.id === el.dataset.arg); if (!po) return; const p = P(po.prop);
  const L = po.lines.map(([wid, q]) => { const w = WM[wid]; return w ? `${String(q).padStart(4)}  ${(wName(w) + ' ' + w.vintage).padEnd(44).slice(0, 44)} ${money(w.cost, 2).padStart(10)} ${money(q * w.cost, 2).padStart(12)}` : ''; });
  const tot = po.lines.reduce((a, [wid, q]) => a + q * (WM[wid] ? WM[wid].cost : 0), 0);
  copyText([`PURCHASE ORDER ${po.no}`, `${p.name}${p.atoll ? ', ' + p.atoll : ''}. Deliver to: ${cellarOf(p.id).name}`, `Supplier: ${supplier(po.supplier).name}`, `Raised: ${fmtDL(po.date)}   Requested delivery: ${fmtDL(po.eta)}`, '', ' Qty  Wine                                          Unit cost        Total', ...L, '', `Total: ${money(tot, 2)}`].join('\n'), po.no);
};
ACT['po-recv'] = el => {
  const po = S.pos.find(x => x.id === el.dataset.arg); if (!po) return; const cel = cellarOf(po.prop).id;
  po.lines.forEach(([wid, q]) => { S.stock[cel][wid] = sealed(cel, wid) + q; }); po.status = 'received'; po.received = TODAY;
  UI.ro = null; save(); render(); toast(`${po.no} received. ${po.lines.reduce((a, [, q]) => a + q, 0)} bottles added to the ${cellarOf(po.prop).name}.`);
};

/* ============ pricing ============ */
function calcOut() {
  const c = UI.pc; const cost = Math.max(0, +c.cost || 0), ml = Math.max(1, +c.ml || 750), pour = Math.max(1, +c.pour || 150);
  if (!cost) return '<div class="empty">Enter a cost price.</div>';
  const w = { cost, ml, pour, gprice: 1 }; const price = roundUp(cost / (targetCos(w, 'bottle') / 100), S.settings.rounding);
  const g = Math.floor(ml / pour); const gp = g ? roundUp(cost / g / (S.settings.cosGlass / 100), 1) : 0;
  return `<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${kpi('Bottle price', money(price), `COS ${pct(cost / price * 100)} · ${(price / cost).toFixed(1)}× cost`)}${kpi('Glass price', g ? money(gp) : '–', g ? `${g} glasses · COS ${pct(cost / g / gp * 100)}` : '')}${kpi('Guest pays', money(guestPrice(price), 2), `with ${S.settings.sc}% SC and ${S.settings.gst}% T-GST`)}${kpi('Profit per bottle', money(price - cost), `${money((gp * g) - cost)} if sold by the glass`)}</div>`;
}
V.pricing = () => {
  const st = S.settings; UI.pc ||= { cost: 30, ml: 750, pour: 150 }; const pf = UI.pf ||= 'attention';
  const rows = S.wines.map(w => { const cb = cosB(w), tb = targetCos(w, 'bottle'), fb = priceFlag(cb, tb); const cg = cosG(w), fg = w.gprice ? priceFlag(cg, st.cosGlass) : null; const need = fb[1] !== 'good' || (fg && fg[1] !== 'good'); const sev = (fb[1] === 'bad' || (fg && fg[1] === 'bad')) ? 0 : need ? 1 : 2; return { w, cb, tb, fb, cg, fg, need, sev, sb: sugBottle(w), sg: sugGlass(w) }; })
    .filter(r => pf === 'all' || r.need).sort((a, b) => a.sev - b.sev || b.cb - a.cb);
  const leaks = S.wines.filter(w => priceFlag(cosB(w), targetCos(w, 'bottle'))[1] === 'bad' || (w.gprice && priceFlag(cosG(w), st.cosGlass)[1] === 'bad')).length;
  const pin = (w, f) => `<input class="inp qty" type="number" min="0" step="1" value="${w[f]}" data-chg="wprice" data-w="${w.id}" data-f="${f}" aria-label="${f === 'price' ? 'Bottle' : 'Glass'} price of ${esc(wName(w))}">`;
  const tbl = `<div class="tw"><table class="t"><thead><tr><th>Wine</th><th class="num">Cost</th><th class="num">Bottle</th><th class="num">COS</th><th class="num">Target</th><th class="num">Suggested</th><th>Bottle</th><th class="num">Glass</th><th class="num">Glass COS</th><th class="num">Suggested</th><th>Glass</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td>${wineCell(r.w)}</td><td class="num">${money(r.w.cost)}</td><td class="num">${pin(r.w, 'price')}</td><td class="num">${pct(r.cb)}</td><td class="num muted">${r.tb}%</td><td class="num">${r.sb !== r.w.price ? `<b>${money(r.sb)}</b>` : money(r.sb)}</td><td>${pill(r.fb[0], r.fb[1])}</td><td class="num">${r.w.gprice ? pin(r.w, 'gprice') : '<span class="muted">–</span>'}</td><td class="num">${r.w.gprice ? pct(r.cg) : ''}</td><td class="num">${r.w.gprice ? (r.sg !== r.w.gprice ? `<b>${money(r.sg)}</b>` : money(r.sg)) : ''}</td><td>${r.fg ? pill(r.fg[0], r.fg[1]) : ''}</td><td class="num">${r.need ? `<button type="button" class="btn sm" data-act="price-apply" data-arg="${r.w.id}">Use suggested</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="12" class="empty">Every price is on target.</td></tr>'}</tbody></table></div>`;
  const targets = `<div class="stack" style="gap:14px">${seg([['flat', 'One target'], ['sliding', 'Sliding scale']], st.priceMode, 'price-mode', 'Pricing method')}
    ${st.priceMode === 'flat' ? `<div class="form-grid"><div class="field"><label for="pt-b">Bottle target cost %</label><input class="inp" type="number" min="5" max="80" step="0.5" id="pt-b" value="${st.cosBottle}" data-chg="set" data-k="cosBottle"></div>` : `<div class="stack" style="gap:8px"><p class="note">Cheaper wines carry a lower cost %, icon wines a higher one, so a $500 bottle is not marked up to $2,000.</p>${st.bands.map((b, i) => `<div class="row small"><span style="width:110px">${i === 0 ? 'Cost up to' : b.upto == null ? `Cost over $${st.bands[i - 1].upto}` : `Up to`}</span>${b.upto != null ? `<span>$</span><input class="inp qty" style="width:64px" type="number" min="1" value="${b.upto}" data-chg="band" data-i="${i}" data-f="upto" aria-label="Band ${i + 1} upper cost">` : ''}<span>at</span><input class="inp qty" style="width:58px" type="number" min="5" max="80" step="0.5" value="${b.cos}" data-chg="band" data-i="${i}" data-f="cos" aria-label="Band ${i + 1} cost %"><span>%</span></div>`).join('')}</div><div class="form-grid">`}
    <div class="field"><label for="pt-g">Glass target cost %</label><input class="inp" type="number" min="5" max="80" step="0.5" id="pt-g" value="${st.cosGlass}" data-chg="set" data-k="cosGlass"></div>
    <div class="field"><label for="pt-band">Tolerance ± points</label><input class="inp" type="number" min="0" max="15" step="0.5" id="pt-band" value="${st.band}" data-chg="set" data-k="band"></div>
    <div class="field"><label for="pt-r">Round bottle prices up to</label><select class="inp" id="pt-r" data-chg="set" data-k="rounding">${[1, 5, 10].map(v => `<option value="${v}"${v === st.rounding ? ' selected' : ''}>$${v}</option>`).join('')}</select></div></div></div>`;
  const calc = `<div class="stack" style="gap:14px"><div class="form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="field"><label for="pc-cost">Cost price</label><input class="inp" type="number" min="0" step="0.5" id="pc-cost" value="${UI.pc.cost}" data-inp="pc" data-f="cost"></div><div class="field"><label for="pc-ml">Bottle ml</label><select class="inp" id="pc-ml" data-chg="pc" data-f="ml">${[375, 500, 750, 1500].map(v => `<option${v === +UI.pc.ml ? ' selected' : ''}>${v}</option>`).join('')}</select></div><div class="field"><label for="pc-pour">Pour ml</label><select class="inp" id="pc-pour" data-chg="pc" data-f="pour">${[75, 100, 125, 150, 175].map(v => `<option${v === +UI.pc.pour ? ' selected' : ''}>${v}</option>`).join('')}</select></div></div><div id="pc-out">${calcOut()}</div></div>`;
  const ov = []; for (const p of S.props) for (const l of p.locs) for (const [wid, o] of Object.entries(l.prices || {})) { const w = WM[wid]; if (!w || !onList(l.id, wid)) continue; const pr = priceAt(l.id, w); if (!pr.own) continue; ov.push({ p, l, w, pr }); }
  const ovT = ov.length ? `<div class="tw"><table class="t"><thead><tr><th>Outlet</th><th>Wine</th><th class="num">Standard</th><th class="num">Outlet bottle</th><th class="num">COS</th><th class="num">Outlet glass</th><th class="num">Glass COS</th><th></th></tr></thead><tbody>${ov.map(x => { const cb = x.w.cost / x.pr.b * 100, cg = x.pr.g ? cpg(x.w) / x.pr.g * 100 : null; return `<tr><td class="small">${esc(x.l.name)}${S.props.length > 1 ? `<div class="wsub">${esc(x.p.name)}</div>` : ''}</td><td>${wineCell(x.w)}</td><td class="num">${money(x.w.price)}${x.w.gprice ? `<div class="wsub">${money(x.w.gprice)} glass</div>` : ''}</td><td class="num">${money(x.pr.b)}</td><td class="num">${pill(pct(cb), priceFlag(cb, targetCos(x.w, 'bottle'))[1])}</td><td class="num">${x.pr.g ? money(x.pr.g) : '<span class="muted">–</span>'}</td><td class="num">${cg != null ? pill(pct(cg), priceFlag(cg, st.cosGlass)[1]) : ''}</td><td class="num"><button type="button" class="btn sm" data-act="go-outlet" data-arg="${x.l.id}">Edit</button></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">Every outlet uses the standard prices. Set an outlet's own price on the Outlet lists page.</div>`;
  return ph('Pricing', `Set a target cost of sales and see what every wine should sell for. Type a new price straight into the table to change it. Prices here are before the ${st.sc}% service charge and ${st.gst}% T-GST.`) + `<div class="stack">
  <div class="g2e">${panel('Targets', targets, { hint: 'Changes apply to the suggestions below' })}${panel('Price a new wine', calc, { hint: 'Type a cost price to see the menu price' })}</div>
  ${S.wines.length ? panel('Price check', `<div style="padding:12px 16px;border-bottom:1px solid var(--line-2)" class="row between">${chips([['attention', 'Needs attention'], ['all', 'All wines']], pf, 'pf')}<span class="small muted">Margin leak: cost % above target. Priced high: well below target, check guest value.</span></div>${tbl}`, { flush: true, hint: 'Standard prices, used by every outlet unless it has its own price', actions: leaks ? `<button type="button" class="btn sm primary" data-act="price-leaks">Fix all ${leaks} margin leaks</button>` : '' }) : ''}
  ${panel('Outlet prices', ovT, { flush: true, hint: 'Outlets that charge a different price from the standard one' })}</div>`;
};
INP['pc'] = el => { UI.pc[el.dataset.f] = el.value; const o = document.getElementById('pc-out'); if (o) o.innerHTML = calcOut(); };
CHG['pc'] = el => { UI.pc[el.dataset.f] = el.value; const o = document.getElementById('pc-out'); if (o) o.innerHTML = calcOut(); };
ACT['pf'] = el => { UI.pf = el.dataset.arg; render(); };
ACT['price-mode'] = el => { S.settings.priceMode = el.dataset.arg; save(); render(); };
CHG['band'] = el => { const b = S.settings.bands[+el.dataset.i]; b[el.dataset.f] = Math.max(1, +el.value || 1); save(); render(); };
function applyPrice(w, onlyLeaks) {
  const fb = priceFlag(cosB(w), targetCos(w, 'bottle'))[1]; const ch = [];
  if (fb !== 'good' && (!onlyLeaks || fb === 'bad')) { w.price = sugBottle(w); ch.push(`bottle ${money(w.price)}`); }
  if (w.gprice) { const fg = priceFlag(cosG(w), S.settings.cosGlass)[1]; if (fg !== 'good' && (!onlyLeaks || fg === 'bad')) { w.gprice = sugGlass(w); ch.push(`glass ${money(w.gprice)}`); } }
  return ch;
}
CHG['wprice'] = el => {
  const w = WM[el.dataset.w]; if (!w) return; const f = el.dataset.f; const v = Math.max(0, r2(+el.value || 0));
  if (f === 'price' && v <= 0) { el.value = w.price; return toast('A bottle price must be above zero.'); }
  w[f] = v; save(); render();
  toast(f === 'price' ? `${wName(w)}: bottle ${money(v)}, cost of sales ${pct(cosB(w))}.` : v ? `${wName(w)}: glass ${money(v)}, cost of sales ${pct(cosG(w))}.` : `${wName(w)} is no longer sold by the glass.`);
};
ACT['go-outlet'] = el => { const l = LM[el.dataset.arg]; if (!l) return; UI.prop = l.prop; UI.ol = { ...(UI.ol || {}), loc: l.id }; go('outlets'); };
ACT['price-apply'] = el => { const w = WM[el.dataset.arg]; const ch = applyPrice(w, false); save(); render(); toast(`${wName(w)}: ${ch.join(', ')}. The guest list shows the new price now.`); };
ACT['price-leaks'] = () => { let n = 0; S.wines.forEach(w => { if (applyPrice(w, true).length) n++; }); save(); render(); toast(`Updated ${n} wine${n === 1 ? '' : 's'}. Past sales keep the price they were sold at.`); };

/* ============ reports ============ */
function repValuation(p) {
  const locs = p.locs.map(l => { const v = stockValue(new Set([l.id])); return { l, ...v }; }); const T = locs.reduce((a, x) => ({ c: a.c + x.c, m: a.m + x.m, b: a.b + x.b }), { c: 0, m: 0, b: 0 });
  const byType = TYPES.map(t => { let c = 0, m = 0, b = 0; for (const w of S.wines.filter(w => w.type === t.id)) { const q = propEq(p.id, w.id); if (q > 0) { c += q * w.cost; m += q * w.price; b += q; } } return { t, c, m, b }; });
  const topW = S.wines.map(w => ({ w, q: propEq(p.id, w.id) })).filter(x => x.q > 0).map(x => ({ ...x, v: x.q * x.w.cost })).sort((a, b) => b.v - a.v).slice(0, 10);
  const html = `<div class="g2e">${panel('By location', `<div class="tw"><table class="t"><thead><tr><th>Location</th><th class="num">Bottles</th><th class="num">At cost</th><th class="num">At menu price</th><th class="num">Share</th></tr></thead><tbody>${locs.map(x => `<tr><td>${esc(x.l.name)}</td><td class="num">${qf(x.b)}</td><td class="num">${money(x.c)}</td><td class="num">${money(x.m)}</td><td class="num">${pct(T.c ? x.c / T.c * 100 : 0, 0)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="num">${qf(T.b)}</td><td class="num">${money(T.c)}</td><td class="num">${money(T.m)}</td><td></td></tr></tfoot></table></div>`, { flush: true })}
  ${panel('By style', `<div class="tw"><table class="t"><thead><tr><th>Style</th><th class="num">Bottles</th><th class="num">At cost</th><th class="num">At menu price</th></tr></thead><tbody>${byType.map(x => `<tr><td><span class="tdot ${x.t.id}"></span>${x.t.label}</td><td class="num">${qf(x.b)}</td><td class="num">${money(x.c)}</td><td class="num">${money(x.m)}</td></tr>`).join('')}</tbody></table></div>`, { flush: true })}</div>
  ${panel('Highest-value wines in stock', `<div class="tw"><table class="t"><thead><tr><th>Wine</th><th class="num">Bottles</th><th class="num">Unit cost</th><th class="num">At cost</th></tr></thead><tbody>${topW.map(x => `<tr><td>${wineCell(x.w)}</td><td class="num">${qf(x.q)}</td><td class="num">${money(x.w.cost)}</td><td class="num">${money(x.v)}</td></tr>`).join('')}</tbody></table></div>`, { flush: true })}`;
  const csv = [['Location', 'Bottles', 'Value at cost', 'Value at menu price'], ...locs.map(x => [x.l.name, qf(x.b), x.c.toFixed(2), x.m.toFixed(2)]), ['Total', qf(T.b), T.c.toFixed(2), T.m.toFixed(2)], [], ['Wine', 'Vintage', 'Bottles', 'Unit cost', 'Value at cost'], ...S.wines.map(w => [wName(w), w.vintage, qf(propEq(p.id, w.id)), w.cost, (propEq(p.id, w.id) * w.cost).toFixed(2)])];
  return { html, csv };
}
function slowAction(w) { if (w.price >= 500) return 'Offer at a private dinner or winemaker dinner'; if (w.type === 'sweet') return 'Pair it on the dessert menu or cheese trolley'; if (w.pick) return 'Already a sommelier\'s pick: brief the team again'; if (!w.gprice) return 'Pour it by the glass for two weeks'; return 'Feature it as a sommelier\'s pick'; }
function repSlow(p) {
  const rr = reorderRows(p.id);
  const dead = rr.filter(r => r.stock > 0.5 && listedLong(r.w) && !lastSoldWithin(p.id, r.w.id, 60));
  const slow = rr.filter(r => r.stock > 0.5 && r.avg > 0 && r.cover > 120 && !dead.includes(r)).sort((a, b) => b.cover - a.cover);
  const t = (list, showCover) => `<div class="tw"><table class="t"><thead><tr><th>Wine</th><th class="num">Stock</th><th class="num">At cost</th><th class="num">Last sold</th>${showCover ? '<th class="num">Days of stock</th>' : ''}<th>Suggested action</th></tr></thead><tbody>${list.map(r => { const ls = lastSold(p.id, r.w.id); return `<tr><td>${wineCell(r.w)}</td><td class="num">${qf(r.stock)}</td><td class="num">${money(r.stock * r.w.cost)}</td><td class="num">${ls ? fmtD(ls) : '<span class="muted">Over 60 days</span>'}</td>${showCover ? `<td class="num">${Math.round(r.cover)}</td>` : ''}<td class="small">${slowAction(r.w)}</td></tr>`; }).join('') || `<tr><td colspan="${showCover ? 6 : 5}" class="empty">None.</td></tr>`}</tbody></table></div>`;
  const dv = dead.reduce((a, r) => a + r.stock * r.w.cost, 0), sv = slow.reduce((a, r) => a + r.stock * r.w.cost, 0);
  const html = `<div class="kpis">${kpi('Dead stock', money(dv), `${dead.length} wines with no sale in 60 days`)}${kpi('Slow movers', money(sv), `${slow.length} wines with over 120 days of stock`)}${kpi('Cash tied up', money(dv + sv), 'at cost')}</div>
  ${panel('Dead stock', t(dead, false), { flush: true, hint: 'No bottle or glass sold in the last 60 days' })}${panel('Slow movers', t(slow, true), { flush: true, hint: 'More than 120 days of stock at the current rate of sale' })}`;
  const csv = [['Status', 'Wine', 'Vintage', 'Stock', 'Value at cost', 'Last sold', 'Days of stock', 'Suggested action'], ...dead.map(r => ['Dead', wName(r.w), r.w.vintage, qf(r.stock), (r.stock * r.w.cost).toFixed(2), lastSold(p.id, r.w.id) || 'over 60 days', '', slowAction(r.w)]), ...slow.map(r => ['Slow', wName(r.w), r.w.vintage, qf(r.stock), (r.stock * r.w.cost).toFixed(2), lastSold(p.id, r.w.id), Math.round(r.cover), slowAction(r.w)])];
  return { html, csv };
}
function repSales(p) {
  const ls = locSet(p.id, UI.outlet); const A = agg(D30(), TODAY, ls);
  const list = Object.entries(A.byWine).filter(([wid]) => WM[wid]).map(([wid, x]) => ({ w: WM[wid], ...x })).sort((a, b) => b.rev - a.rev);
  const html = `${chips([['all', 'All outlets'], ...salesLocs(p.id).map(l => [l.id, l.name])], UI.outlet, 'outlet')}
  ${panel('Sales by wine', `<div class="tw"><table class="t"><thead><tr><th>Wine</th><th class="num">Bottles</th><th class="num">Glasses</th><th class="num">Revenue</th><th class="num">Cost</th><th class="num">COS</th><th class="num">Share</th></tr></thead><tbody>${list.map(x => `<tr><td>${wineCell(x.w)}</td><td class="num">${nf(x.b)}</td><td class="num">${nf(x.g)}</td><td class="num">${money(x.rev)}</td><td class="num">${money(x.cost)}</td><td class="num">${pct(x.cost / x.rev * 100)}</td><td class="num">${pct(x.rev / A.rev * 100)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td class="num">${nf(A.b)}</td><td class="num">${nf(A.g)}</td><td class="num">${money(A.rev)}</td><td class="num">${money(A.cost)}</td><td class="num">${pct(A.rev ? A.cost / A.rev * 100 : 0)}</td><td></td></tr></tfoot></table></div>`, { flush: true, hint: 'Last 30 days' })}`;
  const csv = [['Wine', 'Vintage', 'Bottles', 'Glasses', 'Revenue', 'Cost', 'COS %'], ...list.map(x => [wName(x.w), x.w.vintage, x.b, x.g, x.rev.toFixed(2), x.cost.toFixed(2), (x.cost / x.rev * 100).toFixed(1)])];
  return { html, csv };
}
function repLosses(p) {
  const L = lossesIn(D30(), TODAY, locSet(p.id)); const locs = p.locs; const m = {};
  L.forEach(x => { m[x.type + '|' + x.loc] = (m[x.type + '|' + x.loc] || 0) + x.cost; });
  const rowT = t => locs.reduce((a, l) => a + (m[t + '|' + l.id] || 0), 0), colT = l => LOSS_TYPES.reduce((a, t) => a + (m[t.id + '|' + l.id] || 0), 0);
  const html = panel('Losses by reason and location', `<div class="tw"><table class="t"><thead><tr><th>Reason</th>${locs.map(l => `<th class="num">${esc(l.name)}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>${LOSS_TYPES.map(t => `<tr><td>${t.label}</td>${locs.map(l => `<td class="num">${m[t.id + '|' + l.id] ? money(m[t.id + '|' + l.id], 2) : '<span class="muted">–</span>'}</td>`).join('')}<td class="num"><b>${money(rowT(t.id), 2)}</b></td></tr>`).join('')}</tbody><tfoot><tr><td>Total</td>${locs.map(l => `<td class="num">${money(colT(l), 2)}</td>`).join('')}<td class="num">${money(L.reduce((a, x) => a + x.cost, 0), 2)}</td></tr></tfoot></table></div>`, { flush: true, hint: 'Last 30 days, at cost' });
  const csv = [['Date', 'Location', 'Wine', 'Qty', 'Unit', 'Reason', 'Note', 'Approved by', 'Cost'], ...L.map(x => [x.date, locName(x.loc), WM[x.wid] ? wName(WM[x.wid]) : x.wid, x.qty, x.unit, LOSS[x.type].label, x.note, x.by, x.cost.toFixed(2)])];
  return { html, csv };
}
function repVariance(p) {
  const hist = S.counts.filter(x => LM[x.loc] && LM[x.loc].prop === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const html = panel('Stock count variance', `<div class="tw"><table class="t"><thead><tr><th>Date</th><th>Location</th><th class="num">Lines counted</th><th class="num">Lines with variance</th><th class="num">Bottles</th><th class="num">At cost</th><th class="num">Of cost of sales</th></tr></thead><tbody>${hist.map(x => { const cs = cosBefore(x.loc, x.date); const r = cs ? Math.abs(x.varCost) / cs * 100 : 0; return `<tr><td class="num" style="text-align:left">${fmtD(x.date)}</td><td>${esc(locName(x.loc))}</td><td class="num">${x.n}</td><td class="num">${x.lines.length}</td><td class="num">${x.varB > 0 ? '+' : ''}${qf(x.varB)}</td><td class="num ${x.varCost < 0 ? 'down' : ''}">${money(x.varCost, 2)}</td><td class="num">${pill(pct(r), r > 2 ? 'bad' : r > 1 ? 'warn' : 'good')}</td></tr>`; }).join('')}</tbody></table></div>`, { flush: true });
  const csv = [['Date', 'Location', 'Lines counted', 'Wine', 'System', 'Counted', 'Variance', 'Variance at cost'], ...hist.flatMap(x => x.lines.length ? x.lines.map(([wid, s, c]) => [x.date, locName(x.loc), x.n, WM[wid] ? wName(WM[wid]) : wid, s, c, r2(c - s), WM[wid] ? ((c - s) * WM[wid].cost).toFixed(2) : '']) : [[x.date, locName(x.loc), x.n, 'No variance', '', '', 0, 0]])];
  return { html, csv };
}
const REPORTS = [['valuation', 'Stock valuation', repValuation], ['slow', 'Dead stock & slow movers', repSlow], ['sales', 'Sales by wine', repSales], ['losses', 'Losses', repLosses], ['variance', 'Count variance', repVariance]];
V.reports = () => {
  const p = curP(); UI.rep ||= 'valuation'; const R = REPORTS.find(r => r[0] === UI.rep) || REPORTS[0]; const out = R[2](p); UI.repCSV = { name: R[1], csv: out.csv };
  return ph('Reports', `${esc(p.name)}. Copy any report as CSV to paste into Excel or send to finance.`, `<button type="button" class="btn" data-act="rep-copy">Copy as CSV</button>`) + `<div class="stack">${seg(REPORTS.map(r => [r[0], r[1]]), R[0], 'rep', 'Report')}${out.html}</div>`;
};
ACT['rep'] = el => { UI.rep = el.dataset.arg; render(); };
ACT['go-report'] = el => { UI.rep = el.dataset.arg; go('reports'); };
ACT['rep-copy'] = () => { if (UI.repCSV) copyText(toCSV(UI.repCSV.csv), UI.repCSV.name); };


/* ============ guest wine list ============ */
const LANGS = [['en', 'EN'], ['ru', 'RU'], ['zh', '中文'], ['de', 'DE'], ['it', 'IT']];
const I18N = {
  en: { title: 'Wine List', byGlass: 'By the glass', glass: 'Glass', bottle: 'Bottle', all: 'All', pairs: 'Pairs with', anyDish: 'Pairs with any dish', grapes: 'Grapes', region: 'Region', vintage: 'Vintage', style: 'Style', body: 'Body', acidity: 'Acidity', sweetness: 'Sweetness', pick: "Sommelier's pick", stepUp: 'If you enjoy this, you may like', soldOut: 'Sold out', back: 'Back to the list', share: 'Sharing? A bottle pours about {n} glasses.', notesEn: '', priceNote: 'Prices in US dollars, subject to {sc}% service charge and {gst}% T-GST.', scan: 'Scan to view our wine list',
    types: { sparkling: 'Champagne & Sparkling', white: 'White', rose: 'Rosé', red: 'Red', sweet: 'Sweet & Fortified' },
    pair: {} },
  ru: { title: 'Винная карта', byGlass: 'Вина по бокалам', glass: 'Бокал', bottle: 'Бутылка', all: 'Все', pairs: 'Сочетается с', anyDish: 'Любое блюдо', grapes: 'Сорта винограда', region: 'Регион', vintage: 'Урожай', style: 'Стиль', body: 'Тело', acidity: 'Кислотность', sweetness: 'Сладость', pick: 'Выбор сомелье', stepUp: 'Если вам понравилось это вино, попробуйте', soldOut: 'Нет в наличии', back: 'Назад к списку', share: 'Для компании? В бутылке около {n} бокалов.', notesEn: 'Дегустационные заметки на английском.', priceNote: 'Цены в долларах США, дополнительно {sc}% сервисный сбор и {gst}% T-GST.', scan: 'Отсканируйте, чтобы открыть винную карту',
    types: { sparkling: 'Шампанское и игристые', white: 'Белые', rose: 'Розовые', red: 'Красные', sweet: 'Десертные и крепленые' },
    pair: { 'Aperitif': 'Аперитив', 'Seafood': 'Морепродукты', 'Lobster': 'Лобстер', 'Grilled fish': 'Рыба на гриле', 'Sushi & sashimi': 'Суши и сашими', 'Curry': 'Карри', 'Spicy food': 'Острые блюда', 'Poultry': 'Птица', 'Red meat': 'Красное мясо', 'Pasta': 'Паста', 'Cheese': 'Сыры', 'Dessert': 'Десерты', 'Vegetarian': 'Вегетарианские блюда' } },
  zh: { title: '酒单', byGlass: '单杯酒', glass: '单杯', bottle: '整瓶', all: '全部', pairs: '搭配', anyDish: '所有菜品', grapes: '葡萄品种', region: '产区', vintage: '年份', style: '风格', body: '酒体', acidity: '酸度', sweetness: '甜度', pick: '侍酒师推荐', stepUp: '如果您喜欢这款酒，不妨试试', soldOut: '已售罄', back: '返回酒单', share: '多人分享？一瓶约可倒 {n} 杯。', notesEn: '品鉴笔记为英文。', priceNote: '价格以美元计，另收 {sc}% 服务费及 {gst}% 旅游商品及服务税（T-GST）。', scan: '扫码查看酒单',
    types: { sparkling: '香槟与起泡酒', white: '白葡萄酒', rose: '桃红葡萄酒', red: '红葡萄酒', sweet: '甜酒与加强酒' },
    pair: { 'Aperitif': '开胃酒', 'Seafood': '海鲜', 'Lobster': '龙虾', 'Grilled fish': '烤鱼', 'Sushi & sashimi': '寿司与刺身', 'Curry': '咖喱', 'Spicy food': '辛辣菜肴', 'Poultry': '禽肉', 'Red meat': '红肉', 'Pasta': '意面', 'Cheese': '奶酪', 'Dessert': '甜点', 'Vegetarian': '素食' } },
  de: { title: 'Weinkarte', byGlass: 'Offene Weine', glass: 'Glas', bottle: 'Flasche', all: 'Alle', pairs: 'Passt zu', anyDish: 'Jedes Gericht', grapes: 'Rebsorten', region: 'Region', vintage: 'Jahrgang', style: 'Stil', body: 'Körper', acidity: 'Säure', sweetness: 'Süße', pick: 'Empfehlung des Sommeliers', stepUp: 'Wenn Ihnen dieser Wein gefällt, probieren Sie', soldOut: 'Ausverkauft', back: 'Zurück zur Karte', share: 'Zum Teilen? Eine Flasche ergibt etwa {n} Gläser.', notesEn: 'Verkostungsnotizen auf Englisch.', priceNote: 'Preise in US-Dollar, zuzüglich {sc} % Servicegebühr und {gst} % T-GST.', scan: 'Scannen Sie für unsere Weinkarte',
    types: { sparkling: 'Champagner & Schaumwein', white: 'Weißwein', rose: 'Roséwein', red: 'Rotwein', sweet: 'Süß- & Likörweine' },
    pair: { 'Aperitif': 'Aperitif', 'Seafood': 'Meeresfrüchte', 'Lobster': 'Hummer', 'Grilled fish': 'Gegrillter Fisch', 'Sushi & sashimi': 'Sushi & Sashimi', 'Curry': 'Curry', 'Spicy food': 'Scharfe Gerichte', 'Poultry': 'Geflügel', 'Red meat': 'Rotes Fleisch', 'Pasta': 'Pasta', 'Cheese': 'Käse', 'Dessert': 'Dessert', 'Vegetarian': 'Vegetarisch' } },
  it: { title: 'Carta dei vini', byGlass: 'Vini al calice', glass: 'Calice', bottle: 'Bottiglia', all: 'Tutti', pairs: 'Abbinamenti', anyDish: 'Qualsiasi piatto', grapes: 'Vitigni', region: 'Regione', vintage: 'Annata', style: 'Stile', body: 'Corpo', acidity: 'Acidità', sweetness: 'Dolcezza', pick: 'Scelta del sommelier', stepUp: 'Se le piace questo vino, provi', soldOut: 'Esaurito', back: 'Torna alla carta', share: 'Da condividere? Una bottiglia equivale a circa {n} calici.', notesEn: 'Note di degustazione in inglese.', priceNote: 'Prezzi in dollari USA, soggetti al {sc}% di servizio e al {gst}% di T-GST.', scan: 'Scansiona per la nostra carta dei vini',
    types: { sparkling: 'Champagne e spumanti', white: 'Bianchi', rose: 'Rosati', red: 'Rossi', sweet: 'Dolci e liquorosi' },
    pair: { 'Aperitif': 'Aperitivo', 'Seafood': 'Frutti di mare', 'Lobster': 'Aragosta', 'Grilled fish': 'Pesce alla griglia', 'Sushi & sashimi': 'Sushi e sashimi', 'Curry': 'Curry', 'Spicy food': 'Piatti piccanti', 'Poultry': 'Pollame', 'Red meat': 'Carne rossa', 'Pasta': 'Pasta', 'Cheese': 'Formaggi', 'Dessert': 'Dessert', 'Vegetarian': 'Vegetariano' } },
};
function ensureGL() {
  if (UI.gl && LM[UI.gl.loc] && LM[UI.gl.loc].prop === UI.prop && !LM[UI.gl.loc].removed) return UI.gl;
  const first = glassLocs(UI.prop)[0] || salesLocs(UI.prop)[0]; if (!first) return null;
  UI.gl = { loc: first.id, lang: 'en', view: 'ipad', cat: 'all', pair: '', wine: null };
  return UI.gl;
}
const tr = (t, k, vars = {}) => (t[k] || I18N.en[k] || '').replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? '');
function guestInner() {
  const g = ensureGL(); const t = I18N[g.lang]; const l = LM[g.loc]; const pid = l.prop; const p = P(pid); const hasG = glassOK(l); const PR = w => priceAt(g.loc, w);
  const priceNote = tr(t, 'priceNote', { sc: S.settings.sc, gst: S.settings.gst });
  const pairName = x => t.pair[x] || x;
  const vis = w => onList(g.loc, w.id) && (available(w, pid) || !S.settings.autoHide);
  const head = `<div class="gl-head"><div class="gl-resort">${esc(p.name)}</div><h2 class="gl-title">${esc(t.title)}</h2><div class="gl-outlet">${esc(l.name)}</div><div class="gl-langs">${LANGS.map(([c, lb]) => `<button type="button" data-act="gl-lang" data-arg="${c}" aria-pressed="${c === g.lang}">${lb}</button>`).join('')}</div></div>`;
  if (g.wine && WM[g.wine]) {
    const w = WM[g.wine]; const avail = available(w, pid); const up = stepUp(w, pid, g.loc);
    const scale = (k, v) => `<div class="gl-scale"><span class="k">${esc(t[k])}</span>${[1, 2, 3, 4, 5].map(i => `<i class="${i <= v ? 'on' : ''}"></i>`).join('')}</div>`;
    return `${head}<div class="gl-body gl-d"><button type="button" class="gl-back" data-act="gl-back">← ${esc(t.back)}</button>
      ${w.pick ? `<span class="gl-pick">${esc(t.pick)}</span>` : ''}<h2>${esc(w.name)}</h2><div class="gl-meta">${wSub(w.producer, w.vintage, wPlace(w))}${w.ml !== 750 ? ` · ${w.ml} ml` : ''}</div>
      <div class="gl-pricebox">${hasG && w.gprice ? `<div><div class="k">${esc(t.glass)}</div><div class="v">${money(PR(w).g)}</div></div>` : ''}<div><div class="k">${esc(t.bottle)}</div><div class="v">${money(PR(w).b)}</div></div>${!avail ? `<div><div class="k">&nbsp;</div><div class="gl-sold" style="margin:10px 0 0">${esc(t.soldOut)}</div></div>` : ''}</div>
      <p class="gl-note">“${esc(w.note)}”</p>${t.notesEn ? `<div class="gl-meta" style="margin:-10px 0 16px">${esc(t.notesEn)}</div>` : ''}
      <div class="gl-facts"><div><div class="k">${esc(t.grapes)}</div><div class="v">${esc(w.grapes.join(', '))}</div></div><div><div class="k">${esc(t.region)}</div><div class="v">${esc(wPlace(w)) || '–'}</div></div><div><div class="k">${esc(t.style)}</div>${scale('body', w.body)}${scale('acidity', w.acid)}${scale('sweetness', w.sweet)}</div></div>
      <div style="margin-top:16px"><div class="gl-facts" style="border:0;padding:0"><div><div class="k">${esc(t.pairs)}</div></div></div><div class="gl-tags">${w.pair.map(x => `<span>${esc(pairName(x))}</span>`).join('')}</div></div>
      ${hasG && w.gprice ? `<div class="gl-share">${esc(tr(t, 'share', { n: gpb(w) }))}</div>` : ''}
      ${up ? `<button type="button" class="gl-up" data-act="gl-open" data-arg="${up.id}"><div><div class="k">${esc(t.stepUp)}</div><div class="gl-name" style="margin-top:4px">${esc(wName(up))}</div><div class="gl-meta">${wSub(up.vintage, up.region)}</div></div><div class="gl-p">${money(PR(up).b)}</div></button>` : ''}
      <div class="gl-foot">${esc(priceNote)}</div></div>`;
  }
  const cats = [['all', t.all], ...(hasG ? [['glass', t.byGlass]] : []), ...TYPES.map(x => [x.id, t.types[x.id]])];
  const pf = w => !g.pair || w.pair.includes(g.pair);
  const item = (w, glassOnly) => {
    const av = available(w, pid);
    const pr = PR(w); const prices = glassOnly ? `<span>${money(pr.g)}</span><span>${money(pr.b)}</span>` : (hasG ? `<span>${hasG && pr.g ? money(pr.g) : ''}</span><span>${money(pr.b)}</span>` : `<span>${money(pr.b)}</span>`);
    return `<button type="button" class="gl-item${av ? '' : ' sold'}" data-act="gl-open" data-arg="${w.id}"><div>${w.pick ? `<span class="gl-pick">${esc(t.pick)}</span>` : ''}<div class="gl-name">${esc(w.name)}${av ? '' : `<span class="gl-sold">${esc(t.soldOut)}</span>`}</div><div class="gl-meta">${wSub(w.producer, w.vintage, wPlace(w))}</div></div><div class="gl-p">${prices}</div></button>`;
  };
  const colHead = hasG ? `<div class="gl-cols"><span>${esc(t.glass)}</span><span>${esc(t.bottle)}</span></div>` : `<div class="gl-cols"><span>${esc(t.bottle)}</span></div>`;
  let secs = '';
  if (hasG && (g.cat === 'all' || g.cat === 'glass')) {
    const ws = S.wines.filter(w => w.gprice && vis(w) && pf(w)).sort((a, b) => TYPES.findIndex(x => x.id === a.type) - TYPES.findIndex(x => x.id === b.type) || PR(a).g - PR(b).g);
    if (ws.length) secs += `<div class="gl-sec"><h3>${esc(t.byGlass)}</h3>${colHead}${ws.map(w => item(w, true)).join('')}</div>`;
  }
  if (g.cat !== 'glass') for (const ty of TYPES) {
    if (g.cat !== 'all' && g.cat !== ty.id) continue;
    const ws = S.wines.filter(w => w.type === ty.id && vis(w) && pf(w)).sort((a, b) => PR(a).b - PR(b).b);
    if (ws.length) secs += `<div class="gl-sec"><h3>${esc(t.types[ty.id])}</h3>${colHead}${ws.map(w => item(w, false)).join('')}</div>`;
  }
  return `${head}<div class="gl-tabs">${cats.map(([v, lb]) => `<button type="button" data-act="gl-cat" data-arg="${v}" aria-pressed="${v === g.cat}">${esc(lb)}</button>`).join('')}</div>
  <div class="gl-body"><div class="gl-tools"><select data-chg="gl-pair" aria-label="${esc(t.pairs)}"><option value="">${esc(t.anyDish)}</option>${PAIRINGS.map(x => `<option value="${esc(x)}"${x === g.pair ? ' selected' : ''}>${esc(t.pairs)}: ${esc(pairName(x))}</option>`).join('')}</select></div>
  ${secs || `<p class="gl-meta" style="padding:30px 0;text-align:center">–</p>`}<div class="gl-foot">${esc(priceNote)}</div></div>`;
}
function renderGuest() {
  const full = document.getElementById('glFull'); if (full) { full.innerHTML = guestInner(); return full; }
  const st = document.getElementById('glStage'); if (st) { st.innerHTML = guestInner(); return st; }
}
function qrURL() { const g = ensureGL(); const l = LM[g.loc]; const slug = s => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); return `https://winelist.example/${slug(P(l.prop).name)}/${slug(l.name)}`; }
V.list = () => {
  const g = ensureGL(); const p = curP(); if (!g) return ph('Guest wine list', '') + noOutlets(); const t = I18N[g.lang];
  const controls = `<div class="row" style="align-items:flex-end"><div class="field"><label for="gl-loc">Outlet</label><select class="inp" id="gl-loc" data-chg="gl-loc">${locOptions(p.id, g.loc, l => l.kind !== 'cellar')}</select></div>
  <div class="field"><span class="lbl">Show on</span>${seg([['ipad', 'iPad'], ['phone', 'Phone'], ['qr', 'Table QR card']], g.view, 'gl-view', 'Device')}</div>
  ${isMgr() ? `<label class="check" style="padding-bottom:8px"><input type="checkbox" data-chg="set" data-k="autoHide"${S.settings.autoHide ? ' checked' : ''}> Hide wines that are out of stock</label>` : ''}</div>`;
  let stage;
  if (g.view === 'qr') stage = `<div class="qr-card"><div class="gl-resort">${esc(p.name)}</div><div class="gl-title" style="font-size:38px;font-family:var(--serif);margin-top:6px">${esc(t.title)}</div><div class="gl-outlet" style="font-family:var(--serif);font-style:italic;color:#AFBEBA">${esc(locName(g.loc))}</div><div class="qr-box" id="qrBox"></div><div style="font-size:13.5px">${esc(t.scan)}</div><div style="font-size:11px;letter-spacing:.2em;margin-top:14px;color:#CBA96B">EN · RU · 中文 · DE · IT</div></div><p class="note" style="text-align:center;margin-top:14px">A preview of the table card. The QR code points to a placeholder address for now (<span class="mono">${esc(qrURL())}</span>). A public guest link for each outlet is a planned next step.</p>`;
  else stage = `<div class="device ${g.view}"><div class="gl" id="glStage">${guestInner()}</div></div>`;
  return ph('Guest wine list', 'Built from each outlet\'s own list and prices, so vintages, prices and availability are always current. Tap a wine to see what guests see. Sold-out wines disappear by themselves.', `<button type="button" class="btn primary" data-act="gl-full">Open full-screen guest mode</button>`) + `<div class="stack">${controls}${stage}</div>`;
};
AFTER.list = () => {
  const box = document.getElementById('qrBox'); if (!box) return;
  try { if (window.QRCode) new QRCode(box, { text: qrURL(), width: 180, height: 180, colorDark: '#0C2A31', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M }); else throw 0; }
  catch (e) { box.innerHTML = '<div style="width:180px;height:180px;display:grid;place-items:center;color:#0C2A31;font-size:12px">QR code</div>'; }
};
CHG['gl-loc'] = el => { UI.gl.loc = el.value; UI.gl.wine = null; UI.gl.cat = 'all'; render(); };
ACT['gl-view'] = el => { UI.gl.view = el.dataset.arg; render(); };
ACT['gl-lang'] = el => { UI.gl.lang = el.dataset.arg; renderGuest(); };
ACT['gl-cat'] = el => { UI.gl.cat = el.dataset.arg; renderGuest(); };
CHG['gl-pair'] = el => { UI.gl.pair = el.value; renderGuest(); };
ACT['gl-open'] = el => { UI.gl.wine = el.dataset.arg; const c = renderGuest(); if (c) c.scrollTop = 0; };
ACT['gl-back'] = () => { UI.gl.wine = null; renderGuest(); };
ACT['gl-full'] = () => { const f = $('#guestFull'); f.innerHTML = `<div class="guest-full"><button type="button" class="guest-exit" data-act="gl-exit">Exit guest mode</button><div class="gl" id="glFull">${guestInner()}</div></div>`; f.hidden = false; document.body.style.overflow = 'hidden'; };
ACT['gl-exit'] = () => { const f = $('#guestFull'); f.hidden = true; f.innerHTML = ''; document.body.style.overflow = ''; render(); };

/* ============ staff training ============ */
const DISH = { 'Lobster': 'butter-poached lobster', 'Curry': 'a spicy Maldivian fish curry', 'Sushi & sashimi': 'the sashimi platter', 'Red meat': 'the wagyu striploin', 'Dessert': 'the chocolate fondant', 'Grilled fish': 'grilled reef fish', 'Aperitif': 'a sunset drink with canapés' };
const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const rpick = a => a[Math.floor(Math.random() * a.length)];
function makeQuiz(n = 10) {
  const ws = S.wines; const qs = []; const pid = UI.prop; let guard = 0;
  const gens = [
    () => { const w = rpick(ws); const opts = shuffle([...new Set(ws.map(x => x.country))].filter(c => c !== w.country)).slice(0, 3); return { q: `Which country is ${wName(w)} from?`, opts: [w.country, ...opts], ok: w.country, ex: `${wName(w)} comes from ${w.region}, ${w.country}.` }; },
    () => { const w = rpick(ws); const pool = shuffle([...new Set(ws.flatMap(x => x.grapes))].filter(g => !w.grapes.includes(g))).slice(0, 3); return { q: `Which grape goes into ${wName(w)}?`, opts: [w.grapes[0], ...pool], ok: w.grapes[0], ex: `${wName(w)} is made from ${w.grapes.join(', ')}.` }; },
    () => { const dish = rpick(Object.keys(DISH)); const yes = ws.filter(w => w.pair.includes(dish) && available(w, pid)); const no = shuffle(ws.filter(w => !w.pair.includes(dish))).slice(0, 3); if (!yes.length || no.length < 3) return null; const w = rpick(yes); return { q: `A guest orders ${DISH[dish]}. Which wine would you suggest?`, opts: [wName(w), ...no.map(wName)], ok: wName(w), ex: `${wName(w)}: ${w.sell}` }; },
    () => { const w = rpick(ws.filter(x => x.price < 1000)); const alt = [...new Set([0.7, 1.3, 1.6, 0.55].map(f => roundUp(w.price * f, 5)))].filter(v => v !== w.price).slice(0, 3); return { q: `What is the bottle price of ${wName(w)} on our list?`, opts: [money(w.price), ...alt.map(v => money(v))], ok: money(w.price), ex: `${money(w.price)} before service charge and T-GST, so the guest pays ${money(guestPrice(w.price), 2)}.` }; },
    () => { const w = rpick(ws); const up = stepUp(w, pid); if (!up) return null; const other = shuffle(ws.filter(x => x.type !== w.type && x.id !== up.id)).slice(0, 3); return { q: `A guest loved ${wName(w)} and wants something special. What is the best step up?`, opts: [wName(up), ...other.map(wName)], ok: wName(up), ex: `${wName(up)} is the same style at ${money(up.price)}. ${up.sell}` }; },
    () => { const w = rpick(ws.filter(x => x.gprice)); if (!w) return null; const n = gpb(w); return { q: `How many ${w.pour} ml glasses should one bottle of ${wName(w)} give?`, opts: [String(n), String(n - 1), String(n + 1), String(Math.max(2, n - 2))].filter((v, i, a) => a.indexOf(v) === i), ok: String(n), ex: `${w.ml} ml ÷ ${w.pour} ml = ${n} glasses. Fewer than that means over-pouring.` }; },
  ];
  if (ws.length < 4) return qs;
  while (qs.length < n && guard++ < 200) { const q = rpick(gens)(); if (!q || q.opts.length < 3 || qs.some(x => x.q === q.q)) continue; q.opts = shuffle(q.opts); qs.push(q); }
  return qs;
}
V.training = () => {
  const tr0 = UI.tr ||= { tab: 'cards', type: 'all', flip: {}, quiz: null, name: me(true) };
  if (S.wines.length < 4) return ph('Staff training', '') + `<div class="panel"><div class="empty">Training cards and quizzes are built from the wine list. Add at least four wines to start.</div></div>`;
  let body = '';
  if (tr0.tab === 'cards') {
    const ws = S.wines.filter(w => tr0.type === 'all' || w.type === tr0.type).sort((a, b) => TYPES.findIndex(t => t.id === a.type) - TYPES.findIndex(t => t.id === b.type) || a.price - b.price);
    body = `${chips(typeItems, tr0.type, 'tr-type')}<div class="cards">${ws.map(w => `<button type="button" class="fc${tr0.flip[w.id] ? ' flipped' : ''}" data-act="tr-flip" data-arg="${w.id}" aria-pressed="${!!tr0.flip[w.id]}"><div class="fc-in"><div class="fc-f"><div class="fc-k"><span class="tdot ${w.type}"></span>${TYPE[w.type].short}${w.gprice ? ' · by the glass' : ''}</div><div class="fc-name">${esc(w.name)}</div><div class="small">${esc(w.producer)} · ${esc(w.vintage)}</div><div class="wsub" style="margin-top:auto">Tap to study</div></div>
      <div class="fc-b"><div><span class="fc-k">From</span> ${esc(wPlace(w)) || '–'}</div><div><span class="fc-k">Grapes</span> ${esc(w.grapes.join(', '))}</div><div><span class="fc-k">Tastes of</span> ${esc(w.note)}</div><div><span class="fc-k">Pair with</span> ${esc(w.pair.join(', '))}</div><div><span class="fc-k">Price</span> ${money(w.price)}${w.gprice ? ` · ${money(w.gprice)} a glass` : ''}</div><div class="fc-sell">${esc(w.sell)}</div></div></div></button>`).join('')}</div>`;
  } else if (tr0.tab === 'quiz') {
    const qz = tr0.quiz;
    if (!qz) body = `<div class="panel quiz"><div class="panel-b stack"><p class="q-prompt" style="margin:0">Ten questions, built from your own wine list</p><p class="muted" style="margin:0">Origins, grapes, food pairing, prices, pour yields and upselling. The questions change every time and update when the list changes.</p><div class="field" style="max-width:320px"><label for="tr-name">Your name and outlet</label><input class="inp" id="tr-name" value="${esc(tr0.name)}" placeholder="For example: Aishath, Sunset Bar" data-inp="tr-name"></div><div><button type="button" class="btn primary" data-act="tr-start">Start the quiz</button></div></div></div>`;
    else if (qz.i >= qz.qs.length) { const r = qz.score / qz.qs.length * 100; body = `<div class="panel quiz"><div class="panel-b stack"><div class="fc-k">Result</div><p class="q-prompt" style="margin:0">${qz.score} out of ${qz.qs.length}</p><p class="muted" style="margin:0">${r >= 90 ? 'Excellent. Ready to lead a wine briefing.' : r >= 70 ? 'Good work. Study the cards you missed and try again.' : 'Keep going. Flip through the study cards, then take it again.'}</p><div class="row"><button type="button" class="btn primary" data-act="tr-start">Take another quiz</button><button type="button" class="btn" data-act="tr-tab" data-arg="scores">See team scores</button></div></div></div>`; }
    else {
      const q = qz.qs[qz.i]; const ans = qz.picked;
      body = `<div class="panel quiz"><div class="panel-b stack"><div class="row between"><span class="fc-k">Question ${qz.i + 1} of ${qz.qs.length}</span><span class="small muted">Score ${qz.score}</span></div><div class="progress"><i style="width:${qz.i / qz.qs.length * 100}%"></i></div><p class="q-prompt">${esc(q.q)}</p>
      <div class="opts">${q.opts.map((o, i) => `<button type="button" class="opt${ans != null ? (o === q.ok ? ' ok' : i === ans ? ' no' : '') : ''}" data-act="tr-ans" data-arg="${i}"${ans != null ? ' disabled' : ''}>${esc(o)}</button>`).join('')}</div>
      ${ans != null ? `<div class="callout ${q.opts[ans] === q.ok ? 'good' : 'bad'}"><b>${q.opts[ans] === q.ok ? 'Correct.' : `The answer is ${esc(q.ok)}.`}</b> ${esc(q.ex)}</div><div><button type="button" class="btn primary" data-act="tr-next">${qz.i + 1 < qz.qs.length ? 'Next question' : 'See my score'}</button></div>` : ''}</div></div>`;
    }
  } else {
    const list = [...S.quiz].sort((a, b) => b.score / b.total - a.score / a.total || b.date.localeCompare(a.date));
    body = panel('Team scores', `<div class="tw"><table class="t"><thead><tr><th>Name</th><th class="num">Score</th><th class="num">Result</th><th class="num">Date</th></tr></thead><tbody>${list.map(x => { const r = x.score / x.total * 100; return `<tr><td>${esc(x.name)}</td><td class="num">${x.score} / ${x.total}</td><td class="num">${pill(pct(r, 0), r >= 90 ? 'good' : r >= 70 ? 'info' : 'warn')}</td><td class="num">${fmtD(x.date)}</td></tr>`; }).join('') || '<tr><td colspan="4" class="empty">No quizzes taken yet.</td></tr>'}</tbody></table></div>`, { flush: true, hint: isDemo() ? 'The first four rows are sample scores' : 'Every quiz taken by the team' });
  }
  return ph('Staff training', 'Study cards and quizzes generated from the wine list, so new starters learn the wines they will actually sell, including how to sell each one.') + `<div class="stack">${seg([['cards', 'Study cards'], ['quiz', 'Quiz'], ['scores', 'Team scores']], tr0.tab, 'tr-tab', 'Training')}${body}</div>`;
};
ACT['tr-tab'] = el => { UI.tr.tab = el.dataset.arg; render(); };
ACT['tr-type'] = el => { UI.tr.type = el.dataset.arg; render(); };
ACT['tr-flip'] = el => { const id = el.dataset.arg; UI.tr.flip[id] = !UI.tr.flip[id]; el.classList.toggle('flipped', UI.tr.flip[id]); el.setAttribute('aria-pressed', !!UI.tr.flip[id]); };
INP['tr-name'] = el => { UI.tr.name = el.value; };
ACT['tr-start'] = () => { UI.tr.quiz = { qs: makeQuiz(10), i: 0, score: 0, picked: null }; UI.tr.tab = 'quiz'; render(); };
ACT['tr-ans'] = el => { const qz = UI.tr.quiz; if (qz.picked != null) return; qz.picked = +el.dataset.arg; if (qz.qs[qz.i].opts[qz.picked] === qz.qs[qz.i].ok) qz.score++; render(); };
ACT['tr-next'] = () => { const qz = UI.tr.quiz; qz.i++; qz.picked = null; if (qz.i >= qz.qs.length) { S.quiz.push({ name: UI.tr.name.trim() || 'You', score: qz.score, total: qz.qs.length, date: TODAY }); save(); } render(); };

/* ============ settings ============ */
V.settings = () => {
  const st = S.settings; const num = (label, k, v, extra = '') => `<div class="field"><label for="st-${k}">${label}</label><input class="inp" type="number" id="st-${k}" value="${v}" data-chg="set" data-k="${k}" ${extra}></div>`;
  const taxes = `<div class="form-grid">${num('Service charge %', 'sc', st.sc, 'min="0" max="30" step="0.5"')}${num('T-GST %', 'gst', st.gst, 'min="0" max="40" step="0.5"')}</div><p class="note">Used for the guest price shown on the calculator, quizzes and the note at the foot of the guest list. The Maldives tourism GST has been 17% since 1 July 2025. T-GST is charged on top of the service charge.</p>`;
  const shelf = `<div class="form-grid">${TYPES.map(t => num(`${t.short} (days)`, 'shelf.' + t.id, st.shelf[t.id], 'min="0" max="60" step="1"')).join('')}</div><p class="note">How long an open bottle stays good for service. Bottles past this are flagged on the By the glass page.</p>`;
  const sups = `<div class="tw"><table class="t"><thead><tr><th>Supplier</th><th class="num">Lead time (days)</th><th class="num">Wines</th><th></th></tr></thead><tbody>${S.suppliers.map(s => { const n = S.wines.filter(w => w.supplier === s.id).length; return `<tr><td><input class="inp" value="${esc(s.name)}" data-chg="sup" data-id="${s.id}" data-f="name" aria-label="Supplier name"></td><td class="num"><input class="inp qty" type="number" min="1" value="${s.lead}" data-chg="sup" data-id="${s.id}" data-f="lead" aria-label="Lead time for ${esc(s.name)}"></td><td class="num">${n}</td><td class="num">${!n && S.suppliers.length > 1 ? `<button type="button" class="btn sm ghost" data-act="sup-del" data-arg="${s.id}" aria-label="Remove ${esc(s.name)}">Remove</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  const data = isDemo()
    ? `<p class="note" style="margin-top:0">You are in the demo. Everything you change is kept in this browser only. Resetting rebuilds the two sample resorts with fresh history ending yesterday.</p><div class="row"><button type="button" class="btn danger" data-act="reset">Reset sample data</button><button type="button" class="btn" data-act="backup">Download a backup</button></div>`
    : `<p class="note" style="margin-top:0">${isCloud() ? 'Your data is saved online and shared with your team. ' : 'Your data is saved on this device only. '}Download a backup now and then, for example at month-end. It is a single file with every wine, price, outlet and posting.</p><div class="row"><button type="button" class="btn" data-act="backup">Download a backup</button></div>`;
  return ph('Settings', 'Taxes, shelf life, suppliers and your data.') + `<div class="g2e">${panel('Taxes', taxes)}${panel('Open-bottle shelf life', shelf)}${panel('Suppliers and lead times', sups, { flush: true, hint: 'Lead time drives the reorder suggestions', foot: '<span></span><button type="button" class="btn sm" data-act="sup-add">Add supplier</button>' })}${panel('Your data', data)}${accountPanel()}</div>`;
};
ACT['sup-add'] = () => { S.suppliers.push({ id: uid('s'), name: 'New supplier', lead: 14 }); save(); render(); toast('Supplier added. Give it a name and lead time.'); };
ACT['sup-del'] = el => { if (S.wines.some(w => w.supplier === el.dataset.arg)) return toast('Move its wines to another supplier first.'); S.suppliers = S.suppliers.filter(x => x.id !== el.dataset.arg); save(); render(); };
ACT['backup'] = () => {
  const name = (isCloud() ? App.name : curP().name || 'atoll-cellar').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const blob = new Blob([JSON.stringify({ app: 'atoll-cellar', saved: new Date().toISOString(), data: S })], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}-backup-${TODAY}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
CHG['set'] = el => {
  const path = el.dataset.k.split('.'); let o = S.settings; for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
  const k = path[path.length - 1]; o[k] = el.type === 'checkbox' ? el.checked : (+el.value || 0);
  if (['safetyDays', 'cycleDays'].includes(k)) UI.ro = null;
  save(); render(); toast('Saved.');
};
CHG['sup'] = el => { const s = S.suppliers.find(x => x.id === el.dataset.id); if (!s) return; if (el.dataset.f === 'lead') s.lead = Math.max(1, Math.round(+el.value || 1)); else s.name = el.value.trim() || s.name; UI.ro = null; save(); render(); toast('Supplier updated.'); };
ACT['reset'] = el => {
  if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Click again to reset everything'; return; }
  S = normalizeState(buildDemo()); UI = { route: 'dashboard', prop: 'sbb', outlet: 'all' }; reindex(); save(); go('dashboard'); toast('Sample data rebuilt.');
};

/* ============ global actions & events ============ */
ACT['go'] = el => go(el.dataset.arg);
ACT['prop'] = el => { UI.prop = el.dataset.arg; UI.outlet = 'all'; UI.ds = null; if (UI.route === 'group') UI.route = 'dashboard'; render(); };
ACT['open-prop'] = el => { UI.prop = el.dataset.arg; UI.outlet = 'all'; go('dashboard'); };
ACT['outlet'] = el => { UI.outlet = el.dataset.arg; render(); };
ACT['modal-close'] = () => closeModal();
ACT['modal-bg'] = (el, e) => { if (e.target === el) closeModal(); };
// actions that change the wine list, prices or setup are for managers only (the server checks this too)
const MGR_ACT = new Set(['add-wine', 'edit-wine', 'save-wine', 'del-wine', 'imp-open', 'imp-sample', 'imp-read', 'imp-add', 'price-apply', 'price-leaks', 'price-mode', 'ro-create', 'po-recv', 'reset', 'sup-add', 'sup-del', 'cp-open', 'cp-go', 'cl-open', 'cl-go', 'ol-remove', 'ol-reset', 'wsel-clear']);
const MGR_CHG = new Set(['pour', 'set', 'band', 'sup', 'wprice', 'ol-price', 'wsel', 'wsel-all', 'imp-file', 'ro-sel']);
const denied = () => { toast('Only a manager can change that.'); return true; };
const guardAct = (set, name) => !isMgr() && (set.has(name) || name.startsWith('su-') || name.startsWith('tm-')) && denied();
document.addEventListener('click', e => { const a = e.target.closest('[data-act]'); if (!a) return; if (a.tagName === 'TR' && e.target.closest('input,select,textarea,label,button,a')) return; const f = ACT[a.dataset.act]; if (!f || guardAct(MGR_ACT, a.dataset.act)) return; f(a, e); });
document.addEventListener('change', e => { const a = e.target.closest('[data-chg]'); if (!a) return; const f = CHG[a.dataset.chg]; if (!f || guardAct(MGR_CHG, a.dataset.chg)) return; f(a, e); });
document.addEventListener('input', e => { const a = e.target.closest('[data-inp]'); if (!a) return; const f = INP[a.dataset.inp]; if (f) f(a, e); });
document.addEventListener('keydown', e => { if (e.key !== 'Escape') return; if (!$('#modal').hidden) closeModal(); else if (!$('#guestFull').hidden) ACT['gl-exit'](); });
