// =====================================================================
//  BARRE DU HAUT : temps, calques, réglages de l'océan
// =====================================================================
const dirty = { list: true, sp: true, ind: true };
const SPEEDS = [[0, '⏸'], [0.25, '¼×'], [0.5, '½×'], [1, '1×'], [2, '2×'], [4, '4×'], [8, '8×'], [16, '16×']];
SPEEDS.forEach(([v, l]) => { const b = document.createElement('button'); b.textContent = l; b.dataset.v = v; b.title = v ? `Vitesse ${l}` : 'Pause (espace)'; b.onclick = () => setTime(v); $('timeGrp').appendChild(b); });
function setTime(v) { App.timeScale = v; [...$('timeGrp').querySelectorAll('button')].forEach(b => b.classList.toggle('on', +b.dataset.v === v)); }
setTime(1);
const OVS = [['labels', '🏷 Noms'], ['trails', '〰 Traînées'], ['vision', '🎯 Cibles'], ['muscles', '💪 Muscles'], ['forces', '➶ Forces de l\'eau'], ['xray', '🦴 Rayons X']];
OVS.forEach(([k, l]) => { const b = document.createElement('button'); b.textContent = l; b.onclick = () => { App.ov[k] = !App.ov[k]; b.classList.toggle('on', App.ov[k]); }; b.classList.toggle('on', App.ov[k]); $('ovGrp').appendChild(b); });

function buildOceanMenu() {
  const S = App.settings;
  $('oceanMenu').innerHTML = `
    <div class="h" style="margin-bottom:10px">🌊 Réglages de l'océan</div>
    <div class="kv"><span>Crevettes dans l'océan</span><b id="omFoodV">${S.foodTarget}</b></div><input type="range" id="omFood" min="100" max="3000" step="50" value="${S.foodTarget}">
    <div class="kv" style="margin-top:8px"><span>Population maximale</span><b id="omCapV">${S.cap}</b></div><input type="range" id="omCap" min="20" max="900" step="10" value="${S.cap}">
    <div class="kv" style="margin-top:8px"><span>Viscosité de l'eau</span><b id="omViscV">${S.visc}</b></div><input type="range" id="omVisc" min="0.3" max="2" step="0.1" value="${S.visc}">
    <label class="kv" style="margin-top:10px;cursor:pointer"><span>Reproduction libre (sélection naturelle sauvage)</span><input type="checkbox" id="omRepro" ${S.repro ? 'checked' : ''}></label>
    <label class="kv" style="cursor:pointer"><span>🦷 Prédation (les carnivores mangent les autres espèces)</span><input type="checkbox" id="omPred" ${S.predation ? 'checked' : ''}></label>
    <div style="color:var(--muted);font-size:11px;line-height:1.5;margin:8px 0">Dans l'océan, une créature qui mange assez fait des petits (avec mutations). Celle qui ne mange pas meurt. Personne ne note : c'est la nature qui trie. Astuce : lâche les proies d'abord, laisse-les se multiplier, puis les prédateurs.</div>
    <div id="omPops" style="margin:8px 0"></div>
    <button class="danger" id="omClear" style="width:100%">Vider l'océan</button>`;
  $('omFood').oninput = e => { S.foodTarget = +e.target.value; $('omFoodV').textContent = S.foodTarget; };
  $('omCap').oninput = e => { S.cap = +e.target.value; $('omCapV').textContent = S.cap; };
  $('omVisc').oninput = e => { S.visc = +e.target.value; $('omViscV').textContent = S.visc; App.ocean.creatures.forEach(c => c.sim.visc = S.visc); };
  $('omRepro').onchange = e => S.repro = e.target.checked;
  $('omPred').onchange = e => S.predation = e.target.checked;
  $('omClear').onclick = () => { if (confirm('Retirer toutes les créatures de l\'océan ?')) { App.ocean.creatures = []; App.selCr = null; dirty.ind = true; } };
}
$('oceanBtn').onclick = () => { const m = $('oceanMenu'); if (!m.classList.contains('show')) buildOceanMenu(); m.classList.toggle('show'); };
document.addEventListener('mousedown', e => { if (!$('oceanMenu').contains(e.target) && e.target !== $('oceanBtn')) $('oceanMenu').classList.remove('show'); });

let toastT = 0;
function toast(msg) { const t = $('toast'); t.innerHTML = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3500); }

// =====================================================================
//  PANNEAU GAUCHE : les espèces du labo
// =====================================================================
function poseThumb(canvas, g, cfg, label) {
  const c2 = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, W, H);
  if (!g) return;
  const sim = new Sim(g, cfg, 0, 0, 0);
  for (let j = 1; j < sim.n; j++) sim.a[j] = g.flex * 0.45 * Math.sin(j * 0.9);
  sim.local(sim.qx, sim.qy, sim.dir);
  const { P } = bodyGeom(sim);
  let mx = 1e9, Mx = -1e9, my = 1e9, My = -1e9; for (const p of P) { mx = Math.min(mx, p[0]); Mx = Math.max(Mx, p[0]); my = Math.min(my, p[1]); My = Math.max(My, p[1]); }
  const pad = g.headW + g.fin * 7 + 6, k = Math.min((W - 8) / (Mx - mx + pad * 2), (H - 8) / (My - my + pad * 2), 2.2);
  c2.setTransform(k, 0, 0, k, W / 2 - (mx + Mx) / 2 * k, H / 2 - (my + My) / 2 * k);
  drawCreature(c2, sim, { pattern: cfg.pattern });
  c2.setTransform(1, 0, 0, 1, 0, 0);
}

let listKey = '';
function cardSub(sp) {
  const n = App.ocean.creatures.filter(c => c.sp === sp).length, h = sp.history[sp.history.length - 1];
  return `<span class="chipst ${sp.running ? 'run' : 'ice'}">${sp.running ? '🧬 évolue' : '❄ stockée'}</span> ${GOALS[sp.cfg.goal.type].split(' ')[0]} ${sp.cfg.diet === 'carnivore' ? '🦷' : sp.cfg.diet === 'omnivore' ? '🍽' : ''}<br>
        Gén ${fmt(sp.gen)} · score ${h ? fmt(h.best) : '–'}<br>🌊 ${n} dans l'océan`;
}
function renderSpeciesList() {
  const box = $('speciesList');
  const key = App.species.map(s => s.id + ':' + s.running + ':' + s.cfg.name + ':' + s.cfg.pattern).join('|') + '#' + (App.selSp && App.selSp.id);
  if (key === listKey && box.children.length) { // mise à jour sur place (ne vole pas les clics)
    App.species.forEach((sp, i) => {
      const el = box.children[i]; el.querySelector('.sub').innerHTML = cardSub(sp);
      if (sp.thumbG !== sp.champ) { sp.thumbG = sp.champ; poseThumb(el.querySelector('canvas'), sp.champ, sp.cfg); }
    });
    return;
  }
  listKey = key;
  if (!App.species.length) { box.innerHTML = '<div class="placeholder">Aucune espèce.<br>Crée la première !</div>'; return; }
  box.innerHTML = '';
  for (const sp of App.species) {
    const el = document.createElement('div'); el.className = 'card' + (sp === App.selSp ? ' sel' : '');
    el.innerHTML = `<div class="top"><canvas width="144" height="88"></canvas><div style="min-width:0">
        <div class="name">${esc(sp.cfg.name)}</div>
        <div class="sub">${cardSub(sp)}</div></div></div>
      <div class="bar"><div style="width:${sp.running ? sp.progress * 100 : 0}%"></div></div>
      <div class="btns"><button data-a="run" title="${sp.running ? 'Stocker (mettre en pause l\'évolution)' : 'Reprendre l\'évolution'}">${sp.running ? '❄' : '🧬'}</button><button data-a="rel" title="Lâcher 12 champions dans l'océan">🌊</button><button data-a="edit" title="Modifier les contraintes">✏</button><button data-a="dup" title="Dupliquer (nouvelle lignée indépendante)">⧉</button><button data-a="exp" title="Exporter en fichier">⬇</button><button data-a="del" title="Supprimer" class="danger">🗑</button></div>`;
    el.onclick = e => {
      const a = e.target.dataset.a;
      if (!a) { App.selSp = sp; showTab('sp'); dirty.sp = true; Tank.pendingReset = true; renderSpeciesList(); return; }
      e.stopPropagation(); speciesAction(sp, a);
    };
    box.appendChild(el);
    sp.thumbG = sp.champ; poseThumb(el.querySelector('canvas'), sp.champ, sp.cfg);
  }
}
function updateCardBars() {
  const cards = $('speciesList').querySelectorAll('.card');
  App.species.forEach((sp, i) => { const b = cards[i] && cards[i].querySelector('.bar div'); if (b) b.style.width = (sp.running ? sp.progress * 100 : 0) + '%'; });
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function speciesAction(sp, a) {
  if (a === 'run') { sp.running = !sp.running; send({ t: 'run', id: sp.id, on: sp.running }); addLog(sp, sp.running ? '🧬 Sortie du congélateur, l\'évolution reprend' : '❄ Espèce stockée'); spTabFor = null; dirty.sp = true; renderSpeciesList(); }
  if (a === 'rel') {
    const top = await request({ t: 'top', id: sp.id, n: 12 });
    if (!top || !top.length) return toast('Pas encore de génération terminée pour cette espèce.');
    if (App.view === 'arena') showOcean();
    const cx = clamp(App.cam.x, 100, App.ocean.W - 100), cy = clamp(App.cam.y, 100, floorY(App.cam.x) - 100);
    top.forEach(g => spawnCreature(g, sp, clamp(cx + rnd(-380, 380), 40, App.ocean.W - 40), clamp(cy + rnd(-220, 220), 40, floorY(cx) - 40), { labGen: sp.gen, grace: 700 }, App.ocean)); // le temps de se disperser
    burst(cx, cy, '160,230,255', 30, 3);
    toast(`🌊 12 champions de <b>${esc(sp.cfg.name)}</b> (gén ${sp.gen}) lâchés dans l'océan`);
    renderSpeciesList();
  }
  if (a === 'edit') openEditor(sp);
  if (a === 'dup') {
    const seeds = await request({ t: 'top', id: sp.id, n: 60 });
    const cfg = structuredClone(sp.cfg); cfg.name = sp.cfg.name + ' II'; cfg.hue = (cfg.hue + 40) % 360;
    (seeds || []).forEach(g => g.hue = (g.hue + 40) % 360);
    const ns = createSpecies(cfg, { seeds: seeds || [], gen: sp.gen, history: sp.history.slice(), champs: sp.champs.slice(), log: [] });
    addLog(ns, `⧉ Nouvelle lignée séparée de ${esc(sp.cfg.name)}`);
    toast('Lignée dupliquée : les deux vont maintenant évoluer séparément.');
  }
  if (a === 'exp') {
    const seeds = await request({ t: 'top', id: sp.id, n: 100 });
    const data = { abysse: 1, cfg: sp.cfg, gen: sp.gen, evals: sp.evals, history: sp.history, champs: sp.champs.slice(-60), log: sp.log, seeds: seeds || [] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const aEl = document.createElement('a'); aEl.href = url; aEl.download = sp.cfg.name.replace(/\s+/g, '_') + '.abysse.json'; aEl.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  if (a === 'del') {
    if (!confirm(`Supprimer définitivement l'espèce « ${sp.cfg.name} » et toutes ses créatures ?`)) return;
    send({ t: 'remove', id: sp.id });
    App.species = App.species.filter(s => s !== sp);
    App.ocean.creatures = App.ocean.creatures.filter(c => c.sp !== sp); if (App.arena) App.arena.creatures = App.arena.creatures.filter(c => c.sp !== sp);
    if (App.selSp === sp) App.selSp = App.species[0] || null;
    if (App.selCr && App.selCr.sp === sp) App.selCr = null;
    dirty.sp = dirty.ind = true; renderSpeciesList();
  }
}
$('newSpecies').onclick = () => openEditor(null);
$('importBtn').onclick = () => $('importFile').click();
$('importFile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text()); if (!d.abysse) throw 0;
    const cfg = Object.assign(defaultCfg(), d.cfg);
    const sp = createSpecies(cfg, { seeds: d.seeds, gen: d.gen, evals: d.evals, history: d.history, champs: d.champs, log: d.log, running: false });
    addLog(sp, '⬆ Importée depuis un fichier'); App.selSp = sp; dirty.sp = true; renderSpeciesList(); toast(`Espèce « ${esc(cfg.name)} » importée (stockée, clique 🧬 pour la faire évoluer)`);
  } catch (err) { toast('Fichier invalide'); }
  e.target.value = '';
};

// =====================================================================
//  PANNEAU DROIT
// =====================================================================
function showTab(t) { document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); $('tab-sp').classList.toggle('show', t === 'sp'); $('tab-ind').classList.toggle('show', t === 'ind'); $('tab-spec').classList.toggle('show', t === 'spec'); App.tab = t; if (t === 'spec') renderSpecimens(); dirty[t] = true; }
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
App.tab = 'sp';

// ---------- graphiques ----------
const charts = [];
function makeChart(canvas, W, H, series, getRows, fmtV) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ch = { canvas, W, H, series, getRows, fmtV: fmtV || (v => fmt(v)), hover: -1, dpr };
  canvas.addEventListener('mousemove', e => {
    const rows = ch.getRows(); if (!rows.length) return;
    const r = canvas.getBoundingClientRect(), pl = 32, pr = 6;
    ch.hover = clamp(Math.round((e.clientX - r.left - pl) / (W - pl - pr) * (rows.length - 1)), 0, rows.length - 1);
    const row = rows[ch.hover];
    const tip = $('tip'); tip.style.display = 'block';
    tip.innerHTML = `<b>Génération ${row.gen}</b><br>` + series.map(s => `<i style="display:inline-block;width:10px;height:3px;background:${s.color};vertical-align:middle;margin-right:4px"></i>${s.label} : ${ch.fmtV(row[s.key])}`).join('<br>');
    tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 10) + 'px';
    drawChart(ch);
  });
  canvas.addEventListener('mouseleave', () => { ch.hover = -1; $('tip').style.display = 'none'; drawChart(ch); });
  charts.push(ch);
  return ch;
}
function drawChart(ch) {
  const c2 = ch.canvas.getContext('2d'), { W, H } = ch, rows = ch.getRows(), P = { l: 32, r: 6, t: 6, b: 15 };
  c2.setTransform(ch.dpr, 0, 0, ch.dpr, 0, 0); c2.clearRect(0, 0, W, H);
  let maxY = 0; for (const r of rows) for (const s of ch.series) maxY = Math.max(maxY, r[s.key]); maxY = maxY * 1.1 || 1;
  const X = i => P.l + (rows.length < 2 ? 0 : i / (rows.length - 1)) * (W - P.l - P.r), Y = v => H - P.b - v / maxY * (H - P.t - P.b);
  c2.font = '9.5px system-ui'; c2.fillStyle = '#8a90a6'; c2.textAlign = 'right'; c2.textBaseline = 'middle';
  for (let k = 0; k <= 2; k++) { const v = maxY * k / 2, y = Y(v); c2.strokeStyle = 'rgba(255,255,255,.07)'; c2.lineWidth = 1; c2.beginPath(); c2.moveTo(P.l, y); c2.lineTo(W - P.r, y); c2.stroke(); c2.fillText(ch.fmtV(v), P.l - 4, y); }
  if (!rows.length) { c2.textAlign = 'center'; c2.fillText('En attente…', W / 2, H / 2); return; }
  c2.textBaseline = 'alphabetic'; c2.textAlign = 'left'; c2.fillText('gén ' + rows[0].gen, P.l, H - 3); c2.textAlign = 'right'; c2.fillText('gén ' + rows[rows.length - 1].gen, W - P.r, H - 3);
  for (const s of ch.series) { c2.strokeStyle = s.color; c2.lineWidth = 2; c2.lineJoin = 'round'; c2.beginPath(); rows.forEach((r, i) => i ? c2.lineTo(X(i), Y(r[s.key])) : c2.moveTo(X(i), Y(r[s.key]))); c2.stroke(); }
  if (ch.hover >= 0 && ch.hover < rows.length) {
    const x = X(ch.hover); c2.strokeStyle = 'rgba(255,255,255,.35)'; c2.lineWidth = 1; c2.beginPath(); c2.moveTo(x, P.t); c2.lineTo(x, H - P.b); c2.stroke();
    for (const s of ch.series) { c2.fillStyle = s.color; c2.strokeStyle = '#0b0e15'; c2.lineWidth = 2; c2.beginPath(); c2.arc(x, Y(rows[ch.hover][s.key]), 4, 0, 7); c2.fill(); c2.stroke(); }
  }
}

// ---------- bassin d'essai (course ancêtre vs champion) ----------
const Tank = { canvas: null, runners: [], cam: { x: 0, y: 0 }, idx: -1, race: true, followLatest: true, pendingReset: true, sp: null, endT: 0 };
function tankReset() {
  Tank.pendingReset = false; const sp = App.selSp; Tank.sp = sp; Tank.runners = []; Tank.endT = 0;
  if (!sp || !sp.champs || !sp.champs.length) return;
  if (Tank.followLatest || Tank.idx >= sp.champs.length) Tank.idx = sp.champs.length - 1;
  const entry = sp.champs[Tank.idx], anc = sp.champs[0], sc = makeScenarios({ evo: { trials: 1 } })[0];
  const mk = (e, main) => { const tr = new Trial(e.g, sp.cfg, sc); tr.gen = e.gen; tr.main = main; tr.trail = []; tr.g = e.g; return tr; };
  Tank.runners.push(mk(entry, true));
  if (Tank.race && anc !== entry) Tank.runners.push(mk(anc, false));
  Tank.cam.x = 0; Tank.cam.y = 0;
  const sl = $('tankSlider'); if (sl) { sl.max = sp.champs.length - 1; sl.value = Tank.idx; $('tankGenLbl').textContent = `Champion de la génération ${entry.gen}` + (Tank.followLatest ? ' (dernière)' : ''); }
}
function tankStep(dt) {
  if (!Tank.sp || !Tank.runners.length) return;
  for (const r of Tank.runners) { r.step(dt); if (!r.done && (r.sim.t | 0) % 4 === 0) { r.trail.push(r.sim.x, r.sim.y); if (r.trail.length > 300) r.trail.splice(0, 2); } }
  if (Tank.runners.every(r => r.done)) { Tank.endT += dt; if (Tank.endT > 90) tankReset(); }
}
function drawDummy(c2, x, y, kind, t, alpha) {
  c2.save(); c2.globalAlpha = alpha; c2.translate(x, y);
  if (kind === 'prey') { c2.fillStyle = '#c9d6e8'; c2.beginPath(); c2.ellipse(0, 0, 9, 5, Math.sin(t / 150) * 0.3, 0, 7); c2.fill(); c2.beginPath(); c2.moveTo(-8, 0); c2.lineTo(-14, -5); c2.lineTo(-14, 5); c2.fill(); }
  else { c2.fillStyle = 'rgba(220,50,50,.85)'; c2.beginPath(); c2.arc(0, 0, 13, 0, 7); c2.fill(); c2.font = '15px serif'; c2.textAlign = 'center'; c2.textBaseline = 'middle'; c2.fillText('🦈', 0, 1); }
  c2.restore();
}
function renderTank(t) {
  const c = Tank.canvas; if (!c) return;
  const c2 = c.getContext('2d'), dpr = window.devicePixelRatio || 1, W = c.width / dpr, H = c.height / dpr;
  c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = c2.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f4470'); g.addColorStop(1, '#06203d'); c2.fillStyle = g; c2.fillRect(0, 0, W, H);
  const sp = Tank.sp;
  if (!sp || !Tank.runners.length) { c2.fillStyle = '#8a90a6'; c2.font = '12px system-ui'; c2.textAlign = 'center'; c2.fillText('En attente de la première génération…', W / 2, H / 2); return; }
  const main = Tank.runners[0], z = 0.85;
  Tank.cam.x += (main.sim.x - Tank.cam.x) * 0.08; Tank.cam.y += (main.sim.y - Tank.cam.y) * 0.08;
  c2.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - Tank.cam.x * z), dpr * (H / 2 - Tank.cam.y * z));
  const x0 = Tank.cam.x - W / 2 / z, x1 = Tank.cam.x + W / 2 / z, y0 = Tank.cam.y - H / 2 / z, y1 = Tank.cam.y + H / 2 / z;
  c2.strokeStyle = 'rgba(255,255,255,.06)'; c2.lineWidth = 1;
  for (let x = Math.floor(x0 / 50) * 50; x < x1; x += 50) { c2.beginPath(); c2.moveTo(x, y0); c2.lineTo(x, y1); c2.stroke(); }
  for (let y = Math.floor(y0 / 50) * 50; y < y1; y += 50) { c2.beginPath(); c2.moveTo(x0, y); c2.lineTo(x1, y); c2.stroke(); }
  c2.strokeStyle = 'rgba(255,255,255,.3)'; c2.beginPath(); c2.arc(0, 0, 8, 0, 7); c2.stroke();
  for (let i = Tank.runners.length - 1; i >= 0; i--) {
    const r = Tank.runners[i], a = r.main ? 1 : 0.4, goal = r.goal;
    if (r.trail.length > 3) { c2.strokeStyle = r.main ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.12)'; c2.lineWidth = 1.5; c2.beginPath(); c2.moveTo(r.trail[0], r.trail[1]); for (let k = 2; k < r.trail.length; k += 2) c2.lineTo(r.trail[k], r.trail[k + 1]); c2.stroke(); }
    if (goal === 'hunt' || goal === 'survive') { c2.globalAlpha = a; drawShrimp(c2, { x: r.tx, y: r.ty, ph: i }, 1, t); c2.globalAlpha = 1; }
    if (goal === 'predator') drawDummy(c2, r.tx, r.ty, 'prey', t, a);
    if (goal === 'survive') drawDummy(c2, r.ex, r.ey, 'pred', t, a);
    drawCreature(c2, r.sim, { alpha: r.caught ? a * 0.35 : a, glow: r.main, muscles: App.ov.muscles, forces: App.ov.forces, xray: App.ov.xray, pattern: sp.cfg.pattern, diet: sp.cfg.diet });
  }
  c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  c2.font = '11px system-ui'; c2.textAlign = 'left';
  Tank.runners.forEach((r, i) => { c2.fillStyle = 'rgba(0,0,0,.45)'; c2.fillRect(6, 6 + i * 20, 240, 17); c2.fillStyle = r.main ? '#fff' : '#9aa3b8';
    c2.fillText(`${r.main ? '●' : '○'} Gén ${r.gen}${r.main ? '' : ' (ancêtre)'} : ${r.label()}`, 11, 18 + i * 20); });
  c2.fillStyle = 'rgba(255,255,255,.5)'; c2.textAlign = 'right'; c2.fillText(`t = ${main.t | 0} / ${sp.cfg.goal.dur}`, W - 8, H - 8);
}

// ---------- onglet Espèce ----------
let spCharts = null;
function buildSpeciesTab() {
  const sp = App.selSp, box = $('tab-sp');
  spCharts = null; Tank.canvas = null;
  if (!sp) { box.innerHTML = '<div class="placeholder">Sélectionne une espèce à gauche<br>pour voir son évolution.</div>'; return; }
  box.innerHTML = `
    <div><div style="font-size:16px;font-weight:700">${esc(sp.cfg.name)}</div>
      <div style="color:var(--muted);margin-top:3px">${DIETS[sp.cfg.diet]}<br>${GOALS[sp.cfg.goal.type]} · ${sp.running ? '🧬 en évolution' : '❄ stockée'} · ${stageName(sp.champ ? sp.champ.nSeg : sp.cfg.body.segStart)}</div></div>
    <div>
      <div class="h" style="margin-bottom:6px">Bassin d'essai</div>
      <div class="canvasbox"><canvas id="tankCv"></canvas></div>
      <div style="margin-top:8px"><div class="kv"><span id="tankGenLbl">–</span></div><input type="range" id="tankSlider" min="0" max="0" value="0"></div>
      <div class="row" style="margin-top:6px;flex-wrap:wrap">
        <label class="row" style="cursor:pointer;font-size:12px"><input type="checkbox" id="tankRace" ${Tank.race ? 'checked' : ''}> Course contre l'ancêtre</label>
        <div class="spacer"></div>
        <button id="tankLatest" title="Dernière génération">⏭</button><button id="tankReplay" title="Rejouer">↻</button><button id="tankInspect">🔬 Inspecter</button><button id="tankKeep" title="Garder ce champion dans la collection de spécimens">⭐ Garder</button>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><div class="v" id="spGen"></div><div class="k">Génération</div></div>
      <div class="stat"><div class="v" id="spEvals"></div><div class="k">Copies testées</div></div>
      <div class="stat"><div class="v" id="spBest"></div><div class="k">Score champion</div></div>
    </div>
    <div>
      <div class="h" style="margin-bottom:6px">Score par génération</div>
      <div class="legend" style="margin-bottom:4px"><span><i style="background:${NEG}"></i>Champion</span><span><i style="background:${POS}"></i>Moyenne de la population</span></div>
      <canvas id="chScore"></canvas>
    </div>
    <div class="smalls">
      <div><div class="t">🦴 Vertèbres (moyenne)</div><canvas id="chVert"></canvas></div>
      <div><div class="t">💪 Puissance musculaire</div><canvas id="chStr"></canvas></div>
      <div><div class="t">🧠 Neurones actifs</div><canvas id="chNeur"></canvas></div>
      <div><div class="t">🧬 Diversité génétique</div><canvas id="chDiv"></canvas></div>
    </div>
    <div><div class="h" style="margin-bottom:6px">Musée des fossiles <span style="text-transform:none;letter-spacing:0">(clique pour le voir nager)</span></div><div class="fossils" id="fossils"></div></div>
    <div><div class="h" style="margin-bottom:6px">Journal de l'évolution</div><div class="log" id="spLog"></div></div>
    <div class="row">
      <select id="spGoal" style="flex:1">${Object.entries(GOALS).map(([k, v]) => `<option value="${k}" ${k === sp.cfg.goal.type ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <button id="spEdit">✏ Contraintes</button>
    </div>`;
  const tc = $('tankCv'), dpr = window.devicePixelRatio || 1; tc.width = 340 * dpr; tc.height = 220 * dpr; tc.style.width = '340px'; tc.style.height = '220px'; Tank.canvas = tc;
  $('tankSlider').oninput = e => { Tank.idx = +e.target.value; Tank.followLatest = Tank.idx >= sp.champs.length - 1; tankReset(); };
  $('tankRace').onchange = e => { Tank.race = e.target.checked; tankReset(); };
  $('tankLatest').onclick = () => { Tank.followLatest = true; tankReset(); };
  $('tankReplay').onclick = () => tankReset();
  $('tankInspect').onclick = () => { const r = Tank.runners[0]; if (r) { App.selCr = { sim: r.sim, sp, tank: true, gen: r.gen, powerHist: [] }; showTab('ind'); } };
  $('tankKeep').onclick = () => { const r = Tank.runners[0]; if (r) addSpecimen(r.g, sp, `${sp.cfg.name} · gén ${r.gen}`, r.gen); };
  $('spGoal').onchange = e => { sp.cfg.goal.type = e.target.value; send({ t: 'cfg', id: sp.id, cfg: sp.cfg }); addLog(sp, `📢 Nouvel objectif : ${GOALS[sp.cfg.goal.type]}`); sp.record = 0; spTabFor = null; dirty.sp = true; dirty.list = true; tankReset(); };
  $('spEdit').onclick = () => openEditor(sp);
  const rows = () => sp.history;
  spCharts = [
    makeChart($('chScore'), 340, 120, [{ key: 'best', color: NEG, label: 'Champion' }, { key: 'avg', color: POS, label: 'Moyenne' }], rows),
    makeChart($('chVert'), 164, 70, [{ key: 'vert', color: NEG, label: 'Vertèbres' }], rows, v => v.toFixed(1)),
    makeChart($('chStr'), 164, 70, [{ key: 'str', color: NEG, label: 'Puissance' }], rows, v => v.toFixed(2)),
    makeChart($('chNeur'), 164, 70, [{ key: 'neur', color: NEG, label: 'Neurones' }], rows, v => v.toFixed(1)),
    makeChart($('chDiv'), 164, 70, [{ key: 'div', color: NEG, label: 'Diversité' }], rows, v => v.toFixed(1)),
  ];
  if (Tank.sp !== sp) Tank.pendingReset = true;
  updateSpeciesTab(true);
}
let lastFossil = 0;
function updateSpeciesTab(full) {
  const sp = App.selSp; if (!sp || !spCharts) return;
  const h = sp.history[sp.history.length - 1];
  $('spGen').textContent = fmt(sp.gen); $('spEvals').textContent = fmt(sp.evals); $('spBest').textContent = h ? fmt(h.best) : '–';
  spCharts.forEach(drawChart);
  $('spLog').innerHTML = sp.log.map(l => `<div>${l}</div>`).join('');
  const sl = $('tankSlider'); if (sl && sp.champs.length) { sl.max = sp.champs.length - 1; if (Tank.followLatest) sl.value = sl.max; }
  if (full || performance.now() - lastFossil > 3000) { lastFossil = performance.now(); renderFossils(sp); }
}
function renderFossils(sp) {
  const box = $('fossils'); if (!box) return; box.innerHTML = '';
  const marks = [0, 5, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 1500, 2000, 3000, 5000];
  const picks = []; const seen = new Set();
  for (const m of marks) { let bi = -1, bd = 1e9; sp.champs.forEach((c, i) => { const d = Math.abs(c.gen - m); if (d < bd) { bd = d; bi = i; } }); if (bi >= 0 && !seen.has(bi) && bd <= Math.max(3, m * 0.3)) { seen.add(bi); picks.push(bi); } }
  if (sp.champs.length && !seen.has(sp.champs.length - 1)) picks.push(sp.champs.length - 1);
  for (const i of picks) {
    const e = sp.champs[i], el = document.createElement('div'); el.className = 'fossil';
    el.innerHTML = `<canvas width="168" height="104"></canvas>Gén ${e.gen} · ${e.g.nSeg}🦴`;
    el.onclick = () => { Tank.idx = i; Tank.followLatest = i === sp.champs.length - 1; tankReset(); };
    box.appendChild(el); poseThumb(el.querySelector('canvas'), e.g, sp.cfg);
  }
}

// ---------- onglet Individu : cerveau, muscles, gènes ----------
let indBuiltFor = null;
function buildIndTab() {
  const box = $('tab-ind'), c = App.selCr; indBuiltFor = c;
  if (!c) { box.innerHTML = '<div class="placeholder">Clique sur une créature dans l\'océan<br>(ou « 🔬 Inspecter » dans le bassin d\'essai)<br>pour voir son cerveau, ses muscles et ses gènes en direct.<br><br>Double-clic : la caméra la suit.</div>'; return; }
  if (c.dead) { const r = c.ref; box.innerHTML = `<div class="placeholder">💀 Cette créature est morte.<br><br>Âge : ${fmt(r.age)} · ${r.eaten} crevettes mangées · ${r.kids} enfants.<br>Génération océanique ${r.ogen}.</div>`; return; }
  const s = c.sim, g = s.g, cfg = s.cfg, sp = c.sp;
  const origin = c.tank ? `Champion du labo, génération ${c.gen}` : (c.ogen ? `Né dans l'océan · génération sauvage ${c.ogen} (lignée du labo gén ${c.labGen})` : `Champion du labo, lâché à la génération ${c.labGen}`);
  box.innerHTML = `
    <div><div style="font-size:16px;font-weight:700">${esc(cfg.name)} <span style="color:var(--muted);font-weight:400;font-size:12px">#${c.id || g.id % 10000}</span></div>
      <div style="color:var(--muted);margin-top:3px">${origin}</div></div>
    ${c.tank ? '' : `<div><div class="kv"><span>Énergie</span><b id="inEnergyV"></b></div><div class="energy"><div id="inEnergy"></div></div></div>
    <div class="stats"><div class="stat"><div class="v" id="inAge"></div><div class="k">Âge</div></div><div class="stat"><div class="v" id="inEat"></div><div class="k">Crevettes</div></div><div class="stat"><div class="v" id="inKids"></div><div class="k">Enfants</div></div></div>
    <div class="row" style="gap:14px;flex-wrap:wrap"><label class="row" style="cursor:pointer"><input type="checkbox" id="inSterile" ${c.sterile ? 'checked' : ''}> 🔒 Stérile</label><label class="row" style="cursor:pointer"><input type="checkbox" id="inImmortal" ${c.immortal ? 'checked' : ''}> ♾ Immortel et intouchable</label></div>`}
    <div><div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="h">🧠 Cerveau en direct</div><span style="font-size:11px;color:var(--muted)">${synapseCount(cfg)} synapses</span></div>
      <div class="canvasbox"><canvas id="brainCv"></canvas></div>
      <div class="legend" style="margin-top:6px"><span><i style="background:${POS}"></i>activation positive</span><span><i style="background:${NEG}"></i>activation négative</span><span><i style="background:#5b6070"></i>neurone dormant</span></div></div>
    <div><div class="h" style="margin-bottom:6px">💪 Muscles : courbure de chaque articulation</div>
      <div class="canvasbox"><canvas id="muscleCv"></canvas></div>
      <div style="font-size:11px;color:var(--muted);margin-top:5px;line-height:1.5">Tête à gauche, queue à droite. Quand elle nage bien, tu vois une <b>onde</b> parcourir le corps : c'est elle qui pousse l'eau.</div></div>
    ${c.tank ? '' : `<div><div class="h" style="margin-bottom:6px">⚡ Puissance musculaire dépensée</div><div class="canvasbox"><canvas id="powerCv"></canvas></div></div>`}
    <div><div class="h" style="margin-bottom:8px">🧬 Génome</div><div class="genes" id="genes"></div></div>
    <div class="row" style="flex-wrap:wrap">
      ${c.tank ? '' : '<button id="inFollow">🎥 Suivre</button>'}
      <button id="inKeep">⭐ Garder comme spécimen</button>
      <button id="inFound">🧪 Fonder une espèce</button>
      ${c.tank ? '' : '<button id="inKill" class="danger">✖ Retirer</button>'}
    </div>`;
  const dpr = window.devicePixelRatio || 1;
  const setup = (id, w, h) => { const el = $(id); if (!el) return; el.width = w * dpr; el.height = h * dpr; el.style.width = w + 'px'; el.style.height = h + 'px'; };
  setup('brainCv', 340, 300); setup('muscleCv', 340, 90); setup('powerCv', 340, 60);
  const b = cfg.body, gene = (label, v, max, txt) => `<div class="gene"><span>${label}</span><div class="gb"><div style="width:${clamp(v / max * 100, 2, 100)}%"></div></div><span class="gv">${txt}</span></div>`;
  const act = g.brain.active.reduce((a, v) => a + v, 0), maxN = cfg.brain.layers.reduce((a, v) => a + v, 0);
  $('genes').innerHTML = [
    gene('Vertèbres', g.nSeg, b.segMax, `${g.nSeg} / ${b.segMax}`),
    gene('Longueur des vertèbres', g.segLen, b.lenMax, g.segLen.toFixed(1)),
    gene('Épaisseur de la tête', g.headW, b.widthMax, g.headW.toFixed(1)),
    gene('Effilement', g.taper, 1, g.taper.toFixed(2)),
    gene('Nageoire caudale', g.fin, Math.max(0.01, b.finMax), g.fin.toFixed(2)),
    gene('Nageoires pectorales', g.pect, Math.max(0.01, b.pectMax), g.pect.toFixed(2)),
    gene('Flexibilité', g.flex, b.flexMax, (g.flex * 57.3).toFixed(0) + '°'),
    gene('Puissance musculaire', g.str, b.strMax, g.str.toFixed(2)),
    gene('Rythme de l\'oscillateur', g.freq, b.freqMax, g.freq.toFixed(3)),
    gene('Neurones actifs', act, maxN, `${act} / ${maxN}`),
  ].join('');
  if ($('inSterile')) { $('inSterile').onchange = e => { c.sterile = e.target.checked; }; $('inImmortal').onchange = e => { c.immortal = e.target.checked; }; }
  $('inKeep').onclick = () => addSpecimen(g, sp, c.name || `${cfg.name} #${c.id || ''}`, c.tank ? c.gen : c.labGen);
  if ($('inFollow')) $('inFollow').onclick = () => { App.follow = true; App.cam.z = Math.max(App.cam.z, 1.5); };
  if ($('inKill')) $('inKill').onclick = () => { c.alive = false; App.world.creatures = App.world.creatures.filter(x => x !== c); App.selCr = null; dirty.ind = true; };
  $('inFound').onclick = () => {
    const ncfg = structuredClone(cfg); ncfg.name = randomName(); ncfg.hue = Math.round(g.hue + 60) % 360;
    const seed = cloneG(g); seed.hue = ncfg.hue;
    const ns = createSpecies(ncfg, { seeds: [seed] });
    addLog(ns, `🧪 Fondée à partir d'un individu de ${esc(cfg.name)}`);
    App.selSp = ns; showTab('sp'); renderSpeciesList(); toast(`Nouvelle espèce <b>${esc(ncfg.name)}</b> fondée à partir de cet individu !`);
  };
  updateIndTab();
}
function nodeColor(v, dormant) {
  if (dormant) return '#2a2f3d';
  const a = clamp(Math.abs(v), 0, 1), base = [91, 96, 112], tgt = v >= 0 ? [231, 102, 36] : [51, 140, 237];
  return `rgb(${base.map((b, i) => Math.round(b + (tgt[i] - b) * a)).join(',')})`;
}
function drawBrain() {
  const c = App.selCr, el = $('brainCv'); if (!el || !c || !c.sim) return;
  const s = c.sim, b = s.g.brain, cfg = s.cfg, c2 = el.getContext('2d'), dpr = window.devicePixelRatio || 1, W = 340, H = 300;
  c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, W, H);
  const cols = [], nl = cfg.brain.layers.length, left = 92, right = 30, n = s.n;
  const layerX = i => left + i * (W - left - right) / (nl + 1);
  const ys = (count, i) => 12 + (i + 0.5) * (H - 24) / count;
  const sensOn = new Array(NIN).fill(false); sensOn[10] = true;
  SENSOR_DEFS.forEach(d => d.idx.forEach(i => sensOn[i] = !!cfg.brain.sensors[d.k]));
  cols.push(arr(NIN, (_, i) => ({ x: layerX(0), y: ys(NIN, i), v: s.inp[i], dormant: !sensOn[i] })));
  for (let l = 0; l < nl; l++) { const sz = b.sizes[l + 1]; cols.push(arr(sz, (_, i) => ({ x: layerX(l + 1), y: ys(sz, i), v: s.acts[l][i], dormant: i >= b.active[l] }))); }
  const outN = b.sizes[nl + 1]; cols.push(arr(outN, (_, i) => ({ x: layerX(nl + 1), y: ys(outN, i), v: s.out[i + 1] || 0, dormant: i >= n - 1 })));
  // synapses : couleur = signal qui passe (poids × activation)
  for (let l = 0; l <= nl; l++) {
    const src = cols[l], dst = cols[l + 1], W2 = b.W[l], stride = b.sizes[l] + 1;
    for (let o = 0; o < dst.length; o++) { if (dst[o].dormant) continue;
      for (let i = 0; i < src.length; i++) { if (src[i].dormant) continue;
        const w = W2[o * stride + i], sig = w * src[i].v, m = Math.abs(sig); if (m < 0.04) continue;
        c2.strokeStyle = sig > 0 ? `rgba(231,102,36,${Math.min(0.85, m * 0.5)})` : `rgba(51,140,237,${Math.min(0.85, m * 0.5)})`;
        c2.lineWidth = Math.min(3, 0.4 + Math.abs(w) * 0.5);
        c2.beginPath(); c2.moveTo(src[i].x, src[i].y); c2.lineTo(dst[o].x, dst[o].y); c2.stroke(); } }
  }
  if (b.R) { c2.strokeStyle = 'rgba(200,180,255,.5)'; c2.lineWidth = 1; for (const nd of cols[1]) if (!nd.dormant) { c2.beginPath(); c2.arc(nd.x + 7, nd.y - 5, 5, 0.3, 5.8); c2.stroke(); } }
  for (const col of cols) { const r = Math.max(2.2, Math.min(6.5, (H - 24) / col.length * 0.36));
    for (const nd of col) { c2.fillStyle = nodeColor(nd.v, nd.dormant); c2.beginPath(); c2.arc(nd.x, nd.y, r, 0, 7); c2.fill(); if (!nd.dormant) { c2.strokeStyle = 'rgba(255,255,255,.35)'; c2.lineWidth = 0.8; c2.stroke(); } } }
  c2.font = '9.5px system-ui'; c2.textAlign = 'right'; c2.textBaseline = 'middle';
  cols[0].forEach((nd, i) => { c2.fillStyle = nd.dormant ? '#4a5064' : '#c9cede'; c2.fillText(INPUT_LABELS[i], nd.x - 9, nd.y); });
  c2.textAlign = 'left'; cols[cols.length - 1].forEach((nd, i) => { if (!nd.dormant && (outN < 14 || i % 2 === 0)) { c2.fillStyle = '#c9cede'; c2.fillText('M' + (i + 1), nd.x + 8, nd.y); } });
  c2.fillStyle = '#6c7288'; c2.textAlign = 'center'; c2.font = '9px system-ui';
  c2.fillText('sens', layerX(0), H - 3); for (let l = 0; l < nl; l++) c2.fillText(cfg.brain.recurrent && l === 0 ? 'couche 1 ↺' : 'couche ' + (l + 1), layerX(l + 1), H - 3); c2.fillText('muscles', layerX(nl + 1), H - 3);
}
function drawMuscles() {
  const c = App.selCr, el = $('muscleCv'); if (!el || !c || !c.sim) return;
  const s = c.sim, c2 = el.getContext('2d'), dpr = window.devicePixelRatio || 1, W = 340, H = 90, n = s.n - 1;
  c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, W, H);
  const mid = H / 2 - 6; c2.strokeStyle = 'rgba(255,255,255,.15)'; c2.beginPath(); c2.moveTo(8, mid); c2.lineTo(W - 8, mid); c2.stroke();
  if (n < 1) return;
  const bw = (W - 16) / n;
  for (let j = 1; j <= n; j++) {
    const v = s.a[j] / s.g.flex, h = v * (mid - 6), x = 8 + (j - 1) * bw + 2;
    c2.fillStyle = v >= 0 ? POS : NEG; c2.beginPath(); c2.roundRect(x, h >= 0 ? mid - h : mid, bw - 4, Math.max(1, Math.abs(h)), 3); c2.fill();
    const e = clamp(s.effort[j], 0, 1); c2.fillStyle = `rgba(255,220,120,${0.15 + e * 0.85})`; c2.beginPath(); c2.arc(x + (bw - 4) / 2, H - 6, 2 + e * 3, 0, 7); c2.fill();
  }
}
function drawPower() {
  const c = App.selCr, el = $('powerCv'); if (!el || !c || !c.powerHist) return;
  const c2 = el.getContext('2d'), dpr = window.devicePixelRatio || 1, W = 340, H = 60, h = c.powerHist;
  c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.clearRect(0, 0, W, H); if (h.length < 2) return;
  const mx = Math.max(...h) * 1.1 || 1;
  c2.strokeStyle = NEG; c2.lineWidth = 2; c2.lineJoin = 'round'; c2.beginPath();
  h.forEach((v, i) => { const x = 6 + i / 299 * (W - 12), y = H - 6 - v / mx * (H - 12); i ? c2.lineTo(x, y) : c2.moveTo(x, y); }); c2.stroke();
  c2.fillStyle = '#8a90a6'; c2.font = '9.5px system-ui'; c2.textAlign = 'right'; c2.fillText(`${h[h.length - 1].toFixed(1)} (max ${mx.toFixed(1)})`, W - 6, 11);
}
function updateIndTab() {
  const c = App.selCr; if (!c || c.dead || c.tank || !$('inEnergy')) return;
  $('inEnergy').style.width = clamp(c.energy / 220 * 100, 0, 100) + '%'; $('inEnergy').style.background = c.energy < 40 ? '#eb6263' : c.energy > 165 ? '#d28e05' : '#0aac23';
  $('inEnergyV').textContent = `${fmt(c.energy)}${c.energy > 165 ? ' · prête à se reproduire' : c.energy < 40 ? ' · affamée' : ''}`;
  $('inAge').textContent = fmt(c.age); $('inEat').textContent = c.eaten + (c.kills ? ` · ☠${c.kills}` : ''); $('inKids').textContent = c.kids;
}
