/* ============ Atoll Cellar — outlet lists, resorts & outlets, team ============ */
'use strict';

/* ---------------- getting started (dashboard) ---------------- */
function getStarted() {
  if (!isMgr() || isDemo() || (S.wines.length && S.sales.length)) return '';
  const p = curP(); const outs = salesLocs(p.id);
  const steps = [
    [outs.length > 0, 'Add your outlets', 'Every restaurant, bar or service that sells wine.', 'setup', 'Resorts & outlets'],
    [S.wines.length > 0, 'Add your wines', 'Import your list from Excel or add wines one by one. They go into the cellar list.', 'wines', 'Wines & stock'],
    [outs.length > 0 && outs.every(l => S.wines.some(w => onList(l.id, w.id))), 'Copy wines to each outlet', 'Each outlet sells from its own list, with its own prices if you want.', 'outlets', 'Outlet lists'],
    ...(isCloud() ? [[!!(App.team && App.team.members && App.team.members.length > 1), 'Invite your team', 'Managers and staff sign in with their own email.', 'team', 'Team & access']] : []),
    [S.sales.length > 0, 'Post your first day of sales', 'After service, enter what each outlet sold or paste the POS export.', 'sales', 'Daily sales'],
  ];
  const next = steps.findIndex(s => !s[0]);
  return panel('Get started', `<ol class="steps">${steps.map(([done, t, d, r, b], i) => `<li class="${done ? 'done' : i === next ? 'next' : ''}"><span class="steps-n">${done ? '✓' : i + 1}</span><div><div class="wn">${t}</div><div class="wsub">${d}</div></div>${done ? '' : `<button type="button" class="btn sm${i === next ? ' primary' : ''}" data-act="go" data-arg="${r}">${b}</button>`}</li>`).join('')}</ol>`, { hint: `${steps.filter(s => s[0]).length} of ${steps.length} done` });
}

/* ---------------- outlet lists ---------------- */
V.outlets = () => {
  const p = curP(); const outs = salesLocs(p.id); const mgr = isMgr();
  if (!outs.length) return ph('Outlet lists', '') + noOutlets();
  const ol = UI.ol ||= { loc: outs[0].id, q: '', type: 'all' }; if (!outs.some(l => l.id === ol.loc)) ol.loc = outs[0].id;
  const l = LM[ol.loc]; const gl = glassOK(l); const q = ol.q.trim().toLowerCase();
  const listed = S.wines.filter(w => onList(l.id, w.id));
  const ws = listed.filter(w => (ol.type === 'all' || w.type === ol.type) && (!q || `${wName(w)} ${w.vintage} ${w.region} ${w.country} ${w.grapes.join(' ')}`.toLowerCase().includes(q)))
    .sort((a, b) => TYPES.findIndex(t => t.id === a.type) - TYPES.findIndex(t => t.id === b.type) || priceAt(l.id, a).b - priceAt(l.id, b).b);
  const own = listed.filter(w => priceAt(l.id, w).own).length;
  const sumC = listed.reduce((a, w) => a + w.cost, 0), sumP = listed.reduce((a, w) => a + priceAt(l.id, w).b, 0);
  const btg = listed.filter(w => w.gprice).length; const sv = stockValue(new Set([l.id]));
  const pIn = (w, f) => { const o = (l.prices || {})[w.id] || {}; const std = f === 'b' ? w.price : w.gprice; const v = o[f] != null && o[f] !== std ? o[f] : ''; return `<input class="inp qty${v !== '' ? ' has' : ''}" type="number" min="0" step="1" inputmode="decimal" value="${v}" placeholder="${std}" data-chg="ol-price" data-w="${w.id}" data-f="${f}" aria-label="${f === 'b' ? 'Bottle' : 'Glass'} price of ${esc(wName(w))} at ${esc(l.name)}">`; };
  const rows = ws.map(w => {
    const pr = priceAt(l.id, w); const cb = w.cost / pr.b * 100; const cg = pr.g ? cpg(w) / pr.g * 100 : null; const st = eqAt(l.id, w.id);
    return `<tr><td>${wineCell(w)}</td><td class="num">${money(w.cost)}</td>
      <td class="num">${mgr ? pIn(w, 'b') : money(pr.b)}${pr.b !== w.price ? `<div class="wsub">standard ${money(w.price)}</div>` : ''}</td><td class="num">${pill(pct(cb), priceFlag(cb, targetCos(w, 'bottle'))[1])}</td>
      ${gl ? `<td class="num">${w.gprice ? (mgr ? pIn(w, 'g') : money(pr.g)) : '<span class="muted">–</span>'}${w.gprice && pr.g !== w.gprice ? `<div class="wsub">standard ${money(w.gprice)}</div>` : ''}</td><td class="num">${cg != null ? pill(pct(cg), priceFlag(cg, S.settings.cosGlass)[1]) : ''}</td>` : ''}
      <td class="num${st < 0 ? ' down' : ''}">${st ? qf(st) : '<span class="muted">0</span>'}</td>
      ${mgr ? `<td class="num"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">${pr.own ? `<button type="button" class="btn sm ghost" data-act="ol-reset" data-arg="${w.id}" title="Go back to the standard price">Standard price</button>` : ''}<button type="button" class="btn sm ghost" data-act="ol-remove" data-arg="${w.id}" aria-label="Remove ${esc(wName(w))} from this list">Remove</button></div></td>` : ''}</tr>`;
  }).join('');
  const cols = 5 + (gl ? 2 : 0) + (mgr ? 1 : 0);
  const empty = !listed.length ? `Nothing on the ${esc(l.name)} list yet.${mgr ? ' Use <b>Copy wines from the cellar</b> to add them.' : ''}` : 'No wines match.';
  const table = `<div class="row between" style="padding:12px 16px;border-bottom:1px solid var(--line-2)"><input class="inp" type="search" id="ol-q" placeholder="Search this list" value="${esc(ol.q)}" data-inp="ol-q" style="flex:1;min-width:170px;max-width:300px" aria-label="Search this list">${chips(typeItems, ol.type, 'ol-type')}</div>
  <div class="tw"><table class="t"><thead><tr><th>Wine</th><th class="num">Cost</th><th class="num">Bottle price</th><th class="num">COS</th>${gl ? '<th class="num">Glass price</th><th class="num">Glass COS</th>' : ''}<th class="num">Bottles here</th>${mgr ? '<th></th>' : ''}</tr></thead><tbody>${rows || `<tr><td colspan="${cols}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
  const actions = mgr ? `<button type="button" class="btn" data-act="cl-open"${listed.length ? '' : ' disabled'}>Copy this list to…</button><button type="button" class="btn primary" data-act="cp-open" data-arg="${l.id}">Copy wines from the cellar</button>` : '';
  return ph('Outlet lists', `Each outlet sells from its own list. ${mgr ? 'Copy wines from the cellar list, then type a different price for any wine at this outlet. Leave a price empty to use the standard price.' : 'Prices shown are what this outlet charges.'}`, actions) + `<div class="stack">
  ${chips(outs.map(x => [x.id, x.name]), l.id, 'ol-loc')}
  <div class="kpis">${kpi('Wines on the list', nf(listed.length), `of ${S.wines.length} in the cellar list`)}${gl ? kpi('By the glass', nf(btg), 'wines poured by the glass') : kpi('By the glass', '–', 'This outlet sells bottles only')}${kpi('Own prices', nf(own), own ? 'wines priced differently here' : 'all at the standard price')}${kpi('List cost of sales', sumP ? pct(sumC / sumP * 100) : '–', 'bottle prices, simple average')}${kpi('Stock here', money(sv.c), `${qf(sv.b)} bottles at cost`)}</div>
  ${panel(`${esc(l.name)} wine list`, table, { flush: true, hint: `${KIND_LABEL[l.kind] || 'Outlet'}${gl ? ', pours by the glass' : ', bottles only'}` })}</div>`;
};
ACT['ol-loc'] = el => { UI.ol.loc = el.dataset.arg; render(); };
ACT['ol-type'] = el => { UI.ol.type = el.dataset.arg; render(); };
INP['ol-q'] = el => { UI.ol.q = el.value; rerenderKeep('ol-q'); };
CHG['ol-price'] = el => {
  const l = LO(UI.ol.loc); const w = WM[el.dataset.w]; if (!l || !w) return; const f = el.dataset.f;
  const raw = el.value.trim(); const v = raw === '' ? null : Math.max(0, r2(+raw || 0)); const std = f === 'b' ? w.price : w.gprice;
  l.prices ||= {}; const o = l.prices[w.id] ||= {};
  if (v == null || v === 0 || v === std) delete o[f]; else o[f] = v;
  if (!Object.keys(o).length) delete l.prices[w.id];
  reindex(); save(); render();
  const pr = priceAt(l.id, w);
  toast(f === 'b' ? `${wName(w)} at ${l.name}: bottle ${money(pr.b)}${pr.b === w.price ? ' (standard)' : ''}, cost of sales ${pct(w.cost / pr.b * 100)}.` : `${wName(w)} at ${l.name}: glass ${money(pr.g)}${pr.g === w.gprice ? ' (standard)' : ''}, cost of sales ${pct(cpg(w) / pr.g * 100)}.`);
};
ACT['ol-reset'] = el => { const l = LO(UI.ol.loc); const w = WM[el.dataset.arg]; if (!l || !w) return; if (l.prices) delete l.prices[w.id]; reindex(); save(); render(); toast(`${wName(w)} is back to the standard price at ${l.name}.`); };
ACT['ol-remove'] = el => {
  const l = LO(UI.ol.loc); const w = WM[el.dataset.arg]; if (!l || !w) return;
  if (!l.list) l.list = S.wines.map(x => x.id);
  l.list = l.list.filter(x => x !== w.id); if (l.prices) delete l.prices[w.id];
  reindex(); save(); render(); const st = eqAt(l.id, w.id);
  toast(`${wName(w)} is off the ${l.name} list.${st > 0.05 ? ` ${qf(st)} bottle${st === 1 ? ' is' : 's are'} still there. Transfer ${st === 1 ? 'it' : 'them'} back to the cellar.` : ''}`);
};

/* copy wines from the cellar list to one or more outlets */
ACT['cp-open'] = el => {
  if (!S.wines.length) return toast('Add wines to the cellar list first.');
  if (!salesLocs(UI.prop).length) return toast('Add an outlet first.');
  const arg = el.dataset.arg || ''; const sel = arg === 'sel' ? Object.keys(UI.wsel || {}).filter(k => UI.wsel[k] && WM[k]) : [];
  UI.cp = { sel: Object.fromEntries(sel.map(id => [id, true])), targets: arg && arg !== 'sel' ? { [arg]: true } : {}, q: '', type: 'all', fromSel: arg === 'sel' };
  modal(cpModal());
};
const cpTargets = () => Object.keys(UI.cp.targets).filter(k => UI.cp.targets[k] && LM[k]);
const cpWines = () => S.wines.filter(w => UI.cp.sel[w.id]);
function cpShown() { const c = UI.cp; const q = c.q.trim().toLowerCase(); return S.wines.filter(w => (c.type === 'all' || w.type === c.type) && (!q || `${wName(w)} ${w.vintage} ${w.region} ${w.country}`.toLowerCase().includes(q))).sort((a, b) => TYPES.findIndex(t => t.id === a.type) - TYPES.findIndex(t => t.id === b.type) || wName(a).localeCompare(wName(b))); }
function cpList() {
  const c = UI.cp; const ws = cpShown(); const tg = cpTargets(); const cel = cellarOf(UI.prop).id;
  const all = ws.length > 0 && ws.every(w => c.sel[w.id]);
  return `<div class="tw cp-tw"><table class="t"><thead><tr><th class="cb"><input type="checkbox" data-chg="cp-all"${all ? ' checked' : ''} aria-label="Select every wine shown"></th><th>Wine</th><th class="num">Bottle</th><th class="num">Glass</th><th class="num">In cellar</th><th>Already on</th></tr></thead><tbody>${ws.map(w => { const on = tg.filter(t => onList(t, w.id)); return `<tr class="${c.sel[w.id] ? 'hl' : ''}"><td class="cb"><input type="checkbox" data-chg="cp-w" data-w="${w.id}"${c.sel[w.id] ? ' checked' : ''} aria-label="Copy ${esc(wName(w))}"></td><td>${wineCell(w)}</td><td class="num">${money(w.price)}</td><td class="num">${w.gprice ? money(w.gprice) : '<span class="muted">–</span>'}</td><td class="num">${qf(sealed(cel, w.id))}</td><td class="small">${on.length ? (on.length === tg.length ? pill(tg.length > 1 ? 'All of them' : 'Already there', 'good') : esc(on.map(t => LM[t].name).join(', '))) : '<span class="muted">–</span>'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">No wines match.</td></tr>'}</tbody></table></div>`;
}
function cpSumText() {
  const tg = cpTargets(), ws = cpWines(); let add = 0; for (const t of tg) for (const w of ws) if (!onList(t, w.id)) add++;
  if (!tg.length) return ['Choose at least one outlet to copy to.', false];
  if (!ws.length) return ['Tick the wines to copy.', false];
  return [`${ws.length} wine${ws.length > 1 ? 's' : ''} to ${tg.length} outlet${tg.length > 1 ? 's' : ''} · ${add} new on the list${add === 1 ? '' : 's'}${add < ws.length * tg.length ? `, ${ws.length * tg.length - add} already there` : ''}`, add > 0];
}
function cpUpd() { const [t, ok] = cpSumText(); setText('cp-sum', t); const b = document.getElementById('cp-go'); if (b) b.disabled = !ok; }
function cpModal() {
  const c = UI.cp; const outs = salesLocs(UI.prop); const [t, ok] = cpSumText();
  return `<div class="modal-h"><h2>Copy wines to outlets</h2><button type="button" class="btn ghost" data-act="modal-close">Close</button></div>
  <div class="modal-b"><div class="field"><span class="lbl">Copy to</span><div class="pchips">${outs.map(l => `<label><input type="checkbox" data-chg="cp-t" value="${l.id}"${c.targets[l.id] ? ' checked' : ''}> ${esc(l.name)}</label>`).join('')}</div></div>
  <div class="row between"><input class="inp" type="search" id="cp-q" placeholder="Search the cellar list" value="${esc(c.q)}" data-inp="cp-q" style="flex:1;min-width:160px;max-width:300px" aria-label="Search the cellar list">${chips(typeItems, c.type, 'cp-type')}</div>
  <div id="cp-list">${cpList()}</div><p class="note" style="margin:0">Copying puts the wine on the outlet's list at the standard price. Stock stays in the cellar until you transfer it.</p></div>
  <div class="modal-f"><span class="small" id="cp-sum">${esc(t)}</span><div class="row"><button type="button" class="btn" data-act="modal-close">Cancel</button><button type="button" class="btn primary" data-act="cp-go" id="cp-go"${ok ? '' : ' disabled'}>Copy</button></div></div>`;
}
CHG['cp-t'] = el => { UI.cp.targets[el.value] = el.checked; $('#cp-list').innerHTML = cpList(); cpUpd(); };
CHG['cp-w'] = el => { UI.cp.sel[el.dataset.w] = el.checked; el.closest('tr').classList.toggle('hl', el.checked); cpUpd(); };
CHG['cp-all'] = el => { cpShown().forEach(w => { UI.cp.sel[w.id] = el.checked; }); $('#cp-list').innerHTML = cpList(); cpUpd(); };
INP['cp-q'] = el => { UI.cp.q = el.value; $('#cp-list').innerHTML = cpList(); };
ACT['cp-type'] = el => { UI.cp.type = el.dataset.arg; modal(cpModal()); };
ACT['cp-go'] = () => {
  const tg = cpTargets(), ws = cpWines(); if (!tg.length || !ws.length) return;
  let n = 0; for (const t of tg) n += addToList(t, ws.map(w => w.id));
  reindex(); save(); closeModal(); if (UI.cp.fromSel) UI.wsel = {}; render();
  toast(`Copied ${ws.length} wine${ws.length > 1 ? 's' : ''} to ${tg.map(t => LM[t].name).join(', ')}. ${n} new line${n === 1 ? '' : 's'} on the list${tg.length > 1 ? 's' : ''}.`);
};

/* copy one outlet's whole list (and its prices) to other outlets */
ACT['cl-open'] = () => { UI.cl = { from: UI.ol.loc, targets: {}, mode: 'add', prices: true }; modal(clModal()); };
function clModal() {
  const c = UI.cl; const src = LM[c.from]; const n = S.wines.filter(w => onList(src.id, w.id)).length; const np = Object.keys(src.prices || {}).length;
  const groups = S.props.map(p => { const outs = salesLocs(p.id).filter(l => l.id !== src.id); return outs.length ? `<div class="field"><span class="lbl">${esc(p.name)}</span><div class="pchips">${outs.map(l => `<label><input type="checkbox" data-chg="cl-t" value="${l.id}"${c.targets[l.id] ? ' checked' : ''}> ${esc(l.name)} <span class="muted">(${S.wines.filter(w => onList(l.id, w.id)).length})</span></label>`).join('')}</div></div>` : ''; }).join('');
  const k = Object.values(c.targets).filter(Boolean).length;
  return `<div class="modal-h"><h2>Copy the ${esc(src.name)} list</h2><button type="button" class="btn ghost" data-act="modal-close">Close</button></div>
  <div class="modal-b"><p class="note" style="margin:0">${n} wine${n === 1 ? '' : 's'} on the list${np ? `, ${np} with their own price here` : ''}. Numbers in brackets show how many wines each outlet has now.</p>
  ${groups || '<p class="note">There are no other outlets to copy to.</p>'}
  <div class="field"><span class="lbl">How</span>${seg([['add', 'Add to their lists'], ['replace', 'Replace their lists']], c.mode, 'cl-mode', 'Copy mode')}</div>
  ${np ? `<label class="check"><input type="checkbox" data-chg="cl-prices"${c.prices ? ' checked' : ''}> Copy this outlet's own prices too</label>` : ''}
  ${c.mode === 'replace' ? '<div class="callout warn">Replacing takes every other wine off the chosen outlets\' lists. Their stock stays where it is.</div>' : ''}</div>
  <div class="modal-f"><span class="small muted">${k ? `${k} outlet${k > 1 ? 's' : ''} chosen` : 'Choose at least one outlet'}</span><div class="row"><button type="button" class="btn" data-act="modal-close">Cancel</button><button type="button" class="btn primary" data-act="cl-go"${k ? '' : ' disabled'}>Copy the list</button></div></div>`;
}
CHG['cl-t'] = el => { UI.cl.targets[el.value] = el.checked; modal(clModal()); };
ACT['cl-mode'] = el => { UI.cl.mode = el.dataset.arg; modal(clModal()); };
CHG['cl-prices'] = el => { UI.cl.prices = el.checked; };
ACT['cl-go'] = () => {
  const c = UI.cl; const src = LO(c.from); if (!src) return; const ids = S.wines.filter(w => onList(src.id, w.id)).map(w => w.id);
  const tg = Object.keys(c.targets).filter(k => c.targets[k] && LO(k));
  for (const t of tg) {
    const l = LO(t); l.prices ||= {};
    if (c.mode === 'replace') { l.list = [...ids]; for (const k of Object.keys(l.prices)) if (!ids.includes(k)) delete l.prices[k]; }
    else addToList(t, ids);
    if (c.prices) for (const [wid, o] of Object.entries(src.prices || {})) if (ids.includes(wid)) l.prices[wid] = clone(o);
  }
  reindex(); save(); closeModal(); render();
  toast(`${c.mode === 'replace' ? 'Replaced' : 'Copied to'} ${tg.map(t => LM[t].name).join(', ')}: ${ids.length} wine${ids.length === 1 ? '' : 's'}${c.prices && Object.keys(src.prices || {}).length ? ', with prices' : ''}.`);
};

/* ---------------- resorts, cellars and outlets ---------------- */
const locStock = id => Object.values(S.stock[id] || {}).reduce((a, q) => a + Math.abs(q || 0), 0) + Object.keys(S.open[id] || {}).length;
function uniqueName(p, base) { let n = base, i = 2; while (p.locs.some(l => l.name === n)) n = `${base} ${i++}`; return n; }
V.setup = () => {
  const cards = S.props.map(p => {
    const rows = p.locs.map(l => {
      const cel = l.kind === 'cellar'; const nW = cel ? S.wines.length : S.wines.filter(w => onList(l.id, w.id)).length; const b = stockValue(new Set([l.id])).b;
      return `<tr><td><input class="inp" style="min-width:150px;width:100%" id="su-n-${l.id}" value="${esc(l.name)}" data-chg="su-loc" data-id="${l.id}" data-f="name" aria-label="Name of ${esc(l.name)}"></td>
      <td>${cel ? '<span class="small">Cellar</span>' : `<select class="inp" data-chg="su-loc" data-id="${l.id}" data-f="kind" aria-label="Type of ${esc(l.name)}">${Object.entries(KIND_LABEL).map(([k, lb]) => `<option value="${k}"${k === l.kind ? ' selected' : ''}>${lb}</option>`).join('')}</select>`}</td>
      <td>${cel ? `<label class="check small"><input type="radio" name="main-${p.id}" data-chg="su-main" data-id="${l.id}"${l.main ? ' checked' : ''}> Main cellar</label>` : `<label class="check small"><input type="checkbox" data-chg="su-loc" data-id="${l.id}" data-f="glass"${glassOK(l) ? ' checked' : ''}> Pours by the glass</label>`}</td>
      <td class="num">${nW}</td><td class="num">${qf(b)}</td>
      <td class="num"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">${cel ? '' : `<button type="button" class="btn sm" data-act="go-outlet" data-arg="${l.id}">Wine list</button>`}<button type="button" class="btn sm ghost" data-act="su-del-loc" data-arg="${l.id}" aria-label="Remove ${esc(l.name)}">Remove</button></div></td></tr>`;
    }).join('');
    const body = `<div class="form-grid" style="padding:14px 16px;border-bottom:1px solid var(--line-2)"><div class="field"><label for="su-pn-${p.id}">Resort name</label><input class="inp" id="su-pn-${p.id}" value="${esc(p.name)}" data-chg="su-prop" data-id="${p.id}" data-f="name"></div><div class="field"><label for="su-pa-${p.id}">Location</label><input class="inp" id="su-pa-${p.id}" value="${esc(p.atoll || '')}" placeholder="For example: Baa Atoll" data-chg="su-prop" data-id="${p.id}" data-f="atoll"></div></div>
    <div class="tw"><table class="t"><thead><tr><th>Name</th><th>Type</th><th></th><th class="num">Wines</th><th class="num">Bottles</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return panel(esc(p.name), body, { flush: true, hint: `${p.locs.filter(l => l.kind === 'cellar').length} cellar${p.locs.filter(l => l.kind === 'cellar').length === 1 ? '' : 's'}, ${salesLocs(p.id).length} outlet${salesLocs(p.id).length === 1 ? '' : 's'}`, actions: S.props.length > 1 ? `<button type="button" class="btn sm ghost" data-act="su-del-prop" data-arg="${p.id}">Remove resort</button>` : '', foot: `<span class="small muted">The main cellar receives deliveries and tops up the outlets.</span><div class="row"><button type="button" class="btn sm" data-act="su-add-loc" data-arg="${p.id}|cellar">Add a cellar</button><button type="button" class="btn sm primary" data-act="su-add-loc" data-arg="${p.id}|outlet">Add an outlet</button></div>` });
  }).join('');
  return ph('Resorts & outlets', `Rename your resort and set up its cellars and outlets. Changes apply straight away${isCloud() ? ' for the whole team' : ''}.`, '<button type="button" class="btn" data-act="su-new-prop">Add another resort</button>') + `<div class="stack">${cards}</div>`;
};
AFTER.setup = () => { if (UI.suFocus) { const i = document.getElementById('su-n-' + UI.suFocus); if (i) { i.focus(); i.select(); i.scrollIntoView({ block: 'center' }); } UI.suFocus = null; } };
CHG['su-prop'] = el => { const p = P(el.dataset.id); if (!p) return; const v = el.value.trim(); if (el.dataset.f === 'name' && !v) { el.value = p.name; return toast('A resort needs a name.'); } p[el.dataset.f] = v; reindex(); save(); render(); toast('Saved.'); };
CHG['su-loc'] = el => {
  const l = LO(el.dataset.id); if (!l) return; const f = el.dataset.f;
  if (f === 'name') { const v = el.value.trim(); if (!v) { el.value = l.name; return toast('Give it a name.'); } l.name = v; }
  else if (f === 'kind') { l.kind = el.value; if (el.value === 'villa' && l.glass == null) l.glass = false; }
  else if (f === 'glass') l.glass = el.checked;
  reindex(); save(); render(); toast(`${l.name} updated.`);
};
CHG['su-main'] = el => { const l = LM[el.dataset.id]; if (!l) return; P(l.prop).locs.forEach(x => { if (x.kind === 'cellar') x.main = x.id === l.id; }); reindex(); save(); render(); toast(`${l.name} is now the main cellar. Deliveries arrive there.`); };
ACT['su-add-loc'] = el => {
  const [pid, kind] = el.dataset.arg.split('|'); const p = P(pid); if (!p) return;
  const l = kind === 'cellar' ? { id: rid('c'), name: uniqueName(p, 'New cellar'), kind: 'cellar', main: false, created: TODAY } : { id: rid('o'), name: uniqueName(p, 'New outlet'), kind: 'restaurant', glass: true, list: [], prices: {}, created: TODAY };
  p.locs.push(l); S.stock[l.id] = {}; S.open[l.id] = {}; reindex(); save(); UI.suFocus = l.id; render();
  toast(kind === 'cellar' ? 'Cellar added. Type its name.' : 'Outlet added. Type its name, then copy wines to its list.');
};
ACT['su-del-loc'] = el => {
  const l = LO(el.dataset.arg); if (!l) return; const p = P(LM[l.id].prop);
  if (l.kind === 'cellar' && p.locs.filter(x => x.kind === 'cellar').length < 2) return toast('Every resort needs at least one cellar.');
  if (l.kind === 'cellar' && l.main) return toast('Make another cellar the main cellar first.');
  if (locStock(l.id) > 0.01) return toast(`${l.name} still holds stock. Transfer it out or count it to zero first.`);
  if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Click again to remove'; el.classList.add('danger'); return; }
  p.locs = p.locs.filter(x => x.id !== l.id); (p.oldLocs ||= []).push({ id: l.id, name: l.name, kind: l.kind });
  delete S.stock[l.id]; delete S.open[l.id]; reindex(); save(); render(); toast(`${l.name} removed. Its past sales and counts stay in the reports.`);
};
ACT['su-new-prop'] = () => modal(`<div class="modal-h"><h2>Add a resort</h2><button type="button" class="btn ghost" data-act="modal-close">Close</button></div>
  <form data-form="su-new-prop"><div class="modal-b"><p class="note" style="margin:0">Resorts in one portfolio share the wine list and the team. Each has its own cellars, outlets and stock.</p><div class="form-grid"><div class="field"><label for="np-name">Resort name</label><input class="inp" id="np-name" required autofocus></div><div class="field"><label for="np-where">Location</label><input class="inp" id="np-where" placeholder="For example: South Malé Atoll"></div></div></div>
  <div class="modal-f"><span class="small muted">It starts with a Main Cellar. Add its outlets next.</span><div class="row"><button type="button" class="btn" data-act="modal-close">Cancel</button><button type="submit" class="btn primary">Add resort</button></div></div></form>`);
FORM['su-new-prop'] = () => {
  if (!isMgr()) return denied(); const name = $('#np-name').value.trim(); if (!name) return toast('Give the resort a name.');
  const p = { id: rid('r'), name, atoll: $('#np-where').value.trim(), scale: 1, locs: [{ id: rid('c'), name: 'Main Cellar', kind: 'cellar', main: true, created: TODAY }] };
  S.props.push(p); normalizeState(S); UI.prop = p.id; reindex(); save(); closeModal(); go('setup'); toast(`${name} added. Now add its outlets.`);
};
ACT['su-del-prop'] = el => {
  const p = P(el.dataset.arg); if (!p || S.props.length < 2) return;
  const ids = new Set([...p.locs, ...(p.oldLocs || [])].map(l => l.id));
  if (p.locs.some(l => locStock(l.id) > 0.01) || S.sales.some(r => ids.has(r[1]))) return toast(`${p.name} has stock or sales history, so it cannot be removed. Rename it instead.`);
  if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Click again to remove the resort'; el.classList.add('danger'); return; }
  S.props = S.props.filter(x => x.id !== p.id); for (const id of ids) { delete S.stock[id]; delete S.open[id]; }
  UI.prop = S.props[0].id; reindex(); save(); render(); toast(`${p.name} removed.`);
};

/* ---------------- team & access ---------------- */
const appLink = () => location.href.split('#')[0].split('?')[0];
function inviteText(email, role, code) {
  return `Hi,\n\nYou have been invited to ${App.name} on Atoll Cellar as ${role === 'manager' ? 'a manager' : 'a member of staff'}.\n\n1. Open ${appLink()}\n2. Choose "Create account" and sign up with this email address: ${email}\n3. Type your join code: ${code}\n\nYou can add the app to your phone's home screen from the browser menu.\n\n${me()}`;
}
async function loadTeam() {
  if (!isCloud() || App.teamLoading) return; App.teamLoading = true;
  try { const d = await Cloud.rpc('team', { p_id: App.pid }) || {}; App.team = { pid: App.pid, members: d.members || [], invites: d.invites || [], last: App.team && App.team.last }; }
  catch (e) { App.team = { pid: App.pid, err: e.message, members: [], invites: [] }; }
  App.teamLoading = false; if (UI.route === 'team' || UI.route === 'dashboard') softRender();
}
V.team = () => {
  const roles = `<dl class="roles"><dt>Manager</dt><dd>Everything: wines and prices, outlet lists, reorders, resorts and outlets, and the team.</dd><dt>Staff</dt><dd>Daily work: post sales, count stock, log losses, transfer stock, open bottles and training. They see prices and stock but cannot change the wine list, prices or setup.</dd></dl>`;
  if (!isCloud()) return ph('Team & access', 'Give your managers and staff their own logins.') + `<div class="g2e">${panel('Staff logins', `<p class="note" style="margin-top:0">${isDemo() ? 'The demo has no logins.' : 'Right now Atoll Cellar runs on this device only, so there is nothing to share yet.'} With the online database connected, everyone signs in with their own email and password and sees the same live data, on a phone, tablet or computer.</p>${App.mode === 'local' && Cloud.enabled ? '<button type="button" class="btn primary" data-act="ac-to-cloud">Sign in to share with your team</button>' : ''}`)}${panel('Roles', roles)}</div>`;
  const t = App.team;
  if (!t || t.pid !== App.pid) { loadTeam(); return ph('Team & access', '') + '<div class="panel"><div class="empty">Loading your team…</div></div>'; }
  if (t.err) return ph('Team & access', '') + `<div class="panel"><div class="empty stack" style="align-items:center"><div class="callout bad">${esc(t.err)}</div><button type="button" class="btn" data-act="tm-refresh">Try again</button></div></div>`;
  const myId = (Cloud.user || {}).id;
  const mT = `<div class="tw"><table class="t"><thead><tr><th>Email</th><th>Role</th><th class="num">Since</th><th></th></tr></thead><tbody>${t.members.map(m => { const self = m.user_id === myId; return `<tr><td>${esc(m.email)}${self ? ' <span class="muted">(you)</span>' : ''}</td><td>${m.role === 'owner' || self ? pill(ROLE_LABEL[m.role], m.role === 'staff' ? 'plain' : 'info') : `<select class="inp" data-chg="tm-role" data-id="${m.user_id}" aria-label="Role of ${esc(m.email)}"><option value="manager"${m.role === 'manager' ? ' selected' : ''}>Manager</option><option value="staff"${m.role === 'staff' ? ' selected' : ''}>Staff</option></select>`}</td><td class="num">${fmtD(String(m.since).slice(0, 10))}</td><td class="num">${m.role === 'owner' || self ? '' : `<button type="button" class="btn sm ghost" data-act="tm-remove" data-arg="${m.user_id}">Remove</button>`}</td></tr>`; }).join('')}</tbody></table></div>`;
  const iT = t.invites.length ? `<div class="tw"><table class="t"><thead><tr><th>Email</th><th>Role</th><th>Join code</th><th class="num">Invited</th><th></th></tr></thead><tbody>${t.invites.map(i => `<tr><td>${esc(i.email)}</td><td>${ROLE_LABEL[i.role]}</td><td class="mono"><b>${esc(i.code)}</b></td><td class="num">${fmtD(String(i.since).slice(0, 10))}</td><td class="num"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><button type="button" class="btn sm" data-act="tm-copy" data-arg="${esc(i.email)}|${i.role}|${esc(i.code)}">Copy invitation</button><button type="button" class="btn sm ghost" data-act="tm-cancel" data-arg="${esc(i.email)}">Cancel</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">No invitations waiting.</div>';
  const last = t.last ? `<div class="callout good stack" style="gap:8px"><div><b>${esc(t.last.email)}</b> ${t.last.r.status === 'member' ? 'already has access. Their role is updated.' : `can join as ${t.last.role === 'manager' ? 'a manager' : 'staff'} with the code <b class="mono">${esc(t.last.r.code)}</b>. Send them the invitation: it has the link and the code.`}</div>${t.last.r.status === 'member' ? '' : `<div class="row"><button type="button" class="btn sm primary" data-act="tm-copy" data-arg="${esc(t.last.email)}|${t.last.role}|${esc(t.last.r.code)}">Copy invitation</button><a class="btn sm" href="mailto:${encodeURIComponent(t.last.email)}?subject=${encodeURIComponent(`Join ${App.name} on Atoll Cellar`)}&body=${encodeURIComponent(inviteText(t.last.email, t.last.role, t.last.r.code))}">Open in email</a></div>`}</div>` : '';
  const form = `<form class="stack" style="gap:12px" data-form="tm-invite"><div class="form-grid" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr)"><div class="field"><label for="tm-email">Email</label><input class="inp" id="tm-email" type="email" required placeholder="name@resort.com"></div><div class="field"><label for="tm-role-new">Role</label><select class="inp" id="tm-role-new"><option value="staff">Staff</option><option value="manager">Manager</option></select></div></div><div class="row between"><span class="note">They sign up with this email and type the join code you send them.</span><button type="submit" class="btn primary">Invite</button></div></form>`;
  return ph('Team & access', `Everyone signs in with their own email and password and sees the same live data. Invite someone, then send them the invitation: it has the app link and their join code.`, '<button type="button" class="btn" data-act="tm-refresh">Refresh</button>') + `<div class="g2"><div class="stack">${panel(`People with access`, mT, { flush: true, hint: `${t.members.length} ${t.members.length === 1 ? 'person' : 'people'}` })}${panel('Invitations waiting', iT, { flush: true, hint: 'They join as soon as they sign up with that email' })}</div><div class="stack">${panel('Invite someone', last + form)}${panel('Roles', roles)}</div></div>`;
};
ACT['tm-refresh'] = () => { App.team = null; render(); };
FORM['tm-invite'] = async f => {
  if (!isMgr()) return denied(); const email = $('#tm-email').value.trim().toLowerCase(), role = $('#tm-role-new').value; busy(f, true, 'Inviting…');
  try { const r = await Cloud.rpc('invite_member', { p_id: App.pid, p_email: email, p_role: role }) || {}; App.team.last = { email, role, r }; App.team.pid = null; await loadTeam(); toast(r.status === 'member' ? `${email} already has access. Role updated.` : `${email} is invited. Join code ${r.code}.`); }
  catch (e) { toast(e.message); busy(f, false); }
};
CHG['tm-role'] = async el => { try { await Cloud.rpc('set_member_role', { p_id: App.pid, p_user: el.dataset.id, p_role: el.value }); toast('Role updated.'); } catch (e) { toast(e.message); } App.team.pid = null; loadTeam(); };
ACT['tm-remove'] = async el => {
  if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = 'Click again to remove'; el.classList.add('danger'); return; }
  try { await Cloud.rpc('remove_member', { p_id: App.pid, p_user: el.dataset.arg }); toast('Access removed.'); } catch (e) { toast(e.message); } App.team.pid = null; loadTeam();
};
ACT['tm-cancel'] = async el => { try { await Cloud.rpc('cancel_invite', { p_id: App.pid, p_email: el.dataset.arg }); toast('Invitation cancelled.'); } catch (e) { toast(e.message); } App.team.pid = null; loadTeam(); };
ACT['tm-copy'] = el => { const [email, role, code] = el.dataset.arg.split('|'); copyText(inviteText(email, role, code), 'Invitation'); };
