// =====================================================================
//  ÉDITEUR D'ESPÈCE (contraintes personnalisables)
// =====================================================================
const PRESETS = {
  '🐟 Poisson': { pattern: 'stripes', hue: 200, body: { segMin: 4, segMax: 10, segStart: 5, lenMin: 8, lenMax: 13, widthMin: 10, widthMax: 18, taperMin: 0.75, taperMax: 0.92, finMax: 3, pectMax: 2, strMax: 0.25, flexMax: 0.8, freqMax: 0.2 } },
  '🐍 Anguille': { pattern: 'gradient', hue: 140, body: { segMin: 8, segMax: 22, segStart: 10, lenMin: 6, lenMax: 10, widthMin: 5, widthMax: 9, taperMin: 0.9, taperMax: 1, finMax: 1, pectMax: 0.3, strMax: 0.2, flexMax: 0.7, freqMax: 0.15 } },
  '🐸 Têtard': { pattern: 'spots', hue: 35, body: { segMin: 2, segMax: 5, segStart: 3, lenMin: 8, lenMax: 14, widthMin: 16, widthMax: 26, taperMin: 0.5, taperMax: 0.75, finMax: 4, pectMax: 0, strMax: 0.35, flexMax: 1.1, freqMax: 0.3 } },
  '🐉 Serpent de mer': { pattern: 'stripes', hue: 285, body: { segMin: 14, segMax: 24, segStart: 16, lenMin: 8, lenMax: 14, widthMin: 8, widthMax: 14, taperMin: 0.92, taperMax: 1, finMax: 2, pectMax: 1, strMax: 0.18, flexMax: 0.6, freqMax: 0.12 } },
  '🪱 Ver primitif': { pattern: 'none', hue: 10, body: { segMin: 2, segMax: 24, segStart: 2, lenMin: 5, lenMax: 16, widthMin: 4, widthMax: 22, taperMin: 0.6, taperMax: 1, finMax: 4, pectMax: 3, strMax: 0.4, flexMax: 1.3, freqMax: 0.35 } },
  '🦈 Squale-faucheur': { name: 'Squalus falcator', pattern: 'gradient', hue: 0, diet: 'carnivore', goal: 'predator',
    brain: { layers: [14, 8], sensors: { rhythm: true, target: true, dist: true, speed: true, spin: false, energy: true, proprio: false, danger: false } },
    body: { segMin: 5, segMax: 12, segStart: 6, lenMin: 9, lenMax: 15, widthMin: 12, widthMax: 22, taperMin: 0.7, taperMax: 0.9, finMax: 3.5, pectMax: 2, strMax: 0.3, flexMax: 0.7, freqMax: 0.2 } },
  '🐡 Fuyard nacré': { name: 'Margarita fugax', pattern: 'spots', hue: 50, diet: 'herbivore', goal: 'survive',
    brain: { layers: [12], sensors: { rhythm: true, target: true, dist: true, speed: true, spin: false, energy: false, proprio: false, danger: true } },
    body: { segMin: 3, segMax: 8, segStart: 4, lenMin: 6, lenMax: 9, widthMin: 7, widthMax: 12, taperMin: 0.75, taperMax: 0.9, finMax: 3, pectMax: 1.5, strMax: 0.35, flexMax: 1, freqMax: 0.3 } },
  '🦑 Fouet-lumière': { name: 'Flagellum lucis', pattern: 'gradient', hue: 300, diet: 'herbivore', goal: 'hunt',
    brain: { layers: [12], act: 'sin', recurrent: true, sensors: { rhythm: false, target: true, dist: true, speed: false, spin: false, energy: false, proprio: true, danger: false } },
    body: { segMin: 10, segMax: 20, segStart: 12, lenMin: 5, lenMax: 8, widthMin: 14, widthMax: 20, taperMin: 0.6, taperMax: 0.8, finMax: 0.5, pectMax: 2.5, strMax: 0.3, flexMax: 1.2, freqMax: 0.35 } },
  '🐋 Léviathan lent': { name: 'Leviathan tardus', pattern: 'stripes', hue: 220, diet: 'carnivore', goal: 'predator',
    brain: { layers: [20, 12], sensors: { rhythm: true, target: true, dist: true, speed: true, spin: true, energy: false, proprio: true, danger: false } },
    body: { segMin: 16, segMax: 24, segStart: 18, lenMin: 12, lenMax: 18, widthMin: 16, widthMax: 26, taperMin: 0.9, taperMax: 1, finMax: 4, pectMax: 3, strMax: 0.15, flexMax: 0.5, freqMax: 0.1 } },
  '⚡ Dard-éclair': { name: 'Spiculum fulgur', pattern: 'none', hue: 55, diet: 'herbivore', goal: 'speed',
    brain: { layers: [8], sensors: { rhythm: true, target: true, dist: false, speed: true, spin: false, energy: false, proprio: false, danger: false } },
    body: { segMin: 3, segMax: 6, segStart: 3, lenMin: 10, lenMax: 16, widthMin: 6, widthMax: 10, taperMin: 0.6, taperMax: 0.8, finMax: 4, pectMax: 0, strMax: 0.5, flexMax: 1.3, freqMax: 0.4 } },
  '🌀 Derviche des fosses': { name: 'Turbo saltator', pattern: 'stripes', hue: 170, diet: 'herbivore', goal: 'spin',
    brain: { layers: [10], act: 'sin', sensors: { rhythm: true, target: false, dist: false, speed: false, spin: true, energy: false, proprio: true, danger: false } },
    body: { segMin: 4, segMax: 10, segStart: 5, lenMin: 7, lenMax: 12, widthMin: 8, widthMax: 14, taperMin: 0.8, taperMax: 1, finMax: 2.5, pectMax: 1, strMax: 0.3, flexMax: 1.2, freqMax: 0.3 } },
  '🧠 Philosophe des abysses': { name: 'Sapiens profundus', pattern: 'gradient', hue: 265, diet: 'omnivore', goal: 'hunt',
    brain: { layers: [24, 24, 16], recurrent: true, neurogenesis: true, sensors: { rhythm: true, target: true, dist: true, speed: true, spin: true, energy: true, proprio: true, danger: true } },
    body: { segMin: 4, segMax: 14, segStart: 6, lenMin: 7, lenMax: 12, widthMin: 9, widthMax: 16, taperMin: 0.75, taperMax: 0.95, finMax: 3, pectMax: 2, strMax: 0.28, flexMax: 0.9, freqMax: 0.22 } },
  '🪸 Brouteur-récif': { name: 'Corallivora lata', pattern: 'spots', hue: 25, diet: 'omnivore', goal: 'hunt',
    brain: { layers: [12], sensors: { rhythm: true, target: true, dist: true, speed: false, spin: false, energy: true, proprio: false, danger: true } },
    body: { segMin: 4, segMax: 9, segStart: 5, lenMin: 7, lenMax: 10, widthMin: 16, widthMax: 24, taperMin: 0.65, taperMax: 0.85, finMax: 3, pectMax: 3, strMax: 0.25, flexMax: 0.8, freqMax: 0.2 } },
};
function applyPreset(c, p) {
  c.body = structuredClone(p.body); c.pattern = p.pattern; c.hue = p.hue;
  if (p.name) c.name = p.name;
  if (p.diet) c.diet = p.diet;
  if (p.goal) c.goal.type = p.goal;
  if (p.brain) { const b = structuredClone(p.brain); c.brain = { ...c.brain, act: 'tanh', recurrent: false, ...b, sensors: { ...c.brain.sensors, ...(b.sensors || {}) } }; }
  return c;
}
const getP = (o, p) => p.split('.').reduce((a, k) => a[k], o);
const setP = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const FIELDS = [
  ['Identité', [
    { t: 'text', p: 'name', l: 'Nom de l\'espèce' },
    { t: 'range', p: 'hue', l: 'Couleur', min: 0, max: 359, step: 1, f: v => `<span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:hsl(${v},62%,48%);vertical-align:middle"></span>` },
    { t: 'select', p: 'pattern', l: 'Motif', o: { none: 'Uni', stripes: 'Rayures', spots: 'Taches', gradient: 'Dégradé' } },
  ]],
  ['🦴 Squelette', [
    { t: 'range2', p: ['body.segMin', 'body.segMax'], l: 'Vertèbres possibles (min / max)', min: 2, max: 24, step: 1 },
    { t: 'range', p: 'body.segStart', l: 'Vertèbres à la naissance de l\'espèce', min: 2, max: 24, step: 1 },
    { t: 'range2', p: ['body.lenMin', 'body.lenMax'], l: 'Longueur d\'une vertèbre', min: 4, max: 20, step: 0.5 },
    { t: 'range2', p: ['body.widthMin', 'body.widthMax'], l: 'Épaisseur de la tête', min: 3, max: 26, step: 0.5 },
    { t: 'range2', p: ['body.taperMin', 'body.taperMax'], l: 'Effilement vers la queue (1 = cylindre)', min: 0.5, max: 1, step: 0.01 },
  ]],
  ['💪 Muscles & nageoires', [
    { t: 'range', p: 'body.strMax', l: 'Puissance musculaire maximale', min: 0.03, max: 0.5, step: 0.01 },
    { t: 'range', p: 'body.flexMax', l: 'Flexibilité max des articulations', min: 0.15, max: 1.4, step: 0.05, f: v => (v * 57.3).toFixed(0) + '°' },
    { t: 'range', p: 'body.freqMax', l: 'Rythme max de l\'oscillateur', min: 0.03, max: 0.4, step: 0.01 },
    { t: 'range', p: 'body.finMax', l: 'Nageoire caudale (taille max)', min: 0, max: 4, step: 0.1 },
    { t: 'range', p: 'body.pectMax', l: 'Nageoires pectorales (taille max)', min: 0, max: 3, step: 0.1 },
  ]],
  ['🧠 Cerveau', [
    { t: 'layers' },
    { t: 'select', p: 'brain.act', l: 'Type de neurones', o: ACT_NAMES },
    { t: 'check', p: 'brain.recurrent', l: 'Mémoire à court terme : les neurones de la couche 1 se renvoient leur signal (récurrence)' },
    { t: 'check', p: 'brain.neurogenesis', l: 'Neurogenèse : des neurones peuvent naître ou disparaître par mutation' },
    { t: 'sensors' },
  ]],
  ['🧬 Évolution', [
    { t: 'range', p: 'evo.pop', l: 'Copies par génération', min: 50, max: 1000, step: 50 },
    { t: 'range', p: 'evo.mutRate', l: 'Taux de mutation (part des synapses modifiées)', min: 0.01, max: 0.3, step: 0.01, f: v => Math.round(v * 100) + ' %' },
    { t: 'range', p: 'evo.mutPower', l: 'Force des mutations', min: 0.05, max: 1.2, step: 0.05 },
    { t: 'range', p: 'evo.elite', l: 'Élitisme (meilleurs gardés intacts)', min: 0, max: 0.3, step: 0.01, f: v => Math.round(v * 100) + ' %' },
    { t: 'range', p: 'evo.vertMut', l: 'Probabilité de mutation des vertèbres', min: 0, max: 0.2, step: 0.01, f: v => Math.round(v * 100) + ' %' },
    { t: 'range', p: 'evo.trials', l: 'Essais par copie (plus fiable mais plus lent)', min: 1, max: 4, step: 1 },
    { t: 'check', p: 'evo.crossover', l: 'Reproduction sexuée (mélange des gènes de 2 parents)' },
  ]],
  ['🎯 Régime, objectif & environnement', [
    { t: 'select', p: 'diet', l: 'Régime alimentaire', o: DIETS },
    { t: 'select', p: 'goal.type', l: 'Ce que l\'espèce doit apprendre', o: GOALS },
    { t: 'range', p: 'goal.energyCost', l: 'Pénalité de dépense d\'énergie', min: 0, max: 3, step: 0.1 },
    { t: 'range', p: 'goal.dur', l: 'Durée d\'un test', min: 200, max: 1500, step: 50 },
    { t: 'range', p: 'env.viscosity', l: 'Viscosité de l\'eau du labo (1 = océan)', min: 0.3, max: 2, step: 0.1 },
  ]],
];
let ed = null;
function openEditor(sp) {
  const cfg = sp ? structuredClone(sp.cfg) : Object.assign(defaultCfg(), { name: randomName(), hue: Math.floor(rnd(0, 360)) });
  ed = { sp, cfg, prevT: 0 };
  $('modal').innerHTML = `<div class="mbox"><div class="mform" id="edForm"></div>
    <div class="mside">
      <div class="h">Aperçu (corps moyen, nage simulée)</div>
      <canvas id="edPrev"></canvas>
      <div id="edInfo" style="font-size:12px;line-height:1.7;color:#c9cede"></div>
      <div style="font-size:11px;color:var(--muted);line-height:1.6">Les contraintes sont des <b>limites</b> : l'évolution choisit librement à l'intérieur. Plus tu laisses de liberté, plus les solutions peuvent être surprenantes.</div>
      <div class="mfoot"><button id="edCancel">Annuler</button><button class="primary" id="edOk">${sp ? 'Appliquer' : '🧬 Créer l\'espèce'}</button></div>
    </div></div>`;
  const dpr = window.devicePixelRatio || 1, pc = $('edPrev'); pc.width = 344 * dpr; pc.height = 230 * dpr; pc.style.width = '344px'; pc.style.height = '230px';
  buildForm();
  $('modal').classList.add('show');
  $('edCancel').onclick = closeEditor;
  $('edOk').onclick = () => {
    const c = ed.cfg; if (!c.name.trim()) c.name = randomName();
    if (ed.sp) { ed.sp.cfg = c; send({ t: 'cfg', id: ed.sp.id, cfg: c }); addLog(ed.sp, '✏ Contraintes modifiées : la population s\'adapte'); spTabFor = null; App.selSp = ed.sp; Tank.pendingReset = true; }
    else { App.selSp = createSpecies(c); toast(`🧬 <b>${esc(c.name)}</b> est née dans le labo. Elle évolue déjà !`); }
    closeEditor(); showTab('sp'); dirty.sp = true; renderSpeciesList();
  };
}
function closeEditor() { $('modal').classList.remove('show'); ed = null; }
function buildForm() {
  const c = ed.cfg, f = $('edForm');
  let h = `<h2>${ed.sp ? '✏ Modifier ' + esc(ed.sp.cfg.name) : '🧪 Créer une nouvelle espèce'}</h2>
    <div class="intro">Fixe les règles du jeu. L'évolution fera le reste : des centaines de copies sont testées à chaque génération, les meilleures se reproduisent avec des mutations.</div>
    <div class="h" style="margin-bottom:6px">Modèles de départ</div><div class="presets">${Object.keys(PRESETS).map(k => `<button data-pre="${k}">${k}</button>`).join('')}</div>`;
  for (const [title, fields] of FIELDS) {
    h += `<div class="sec"><div class="h">${title}</div>`;
    for (const fd of fields) {
      if (fd.t === 'text') h += `<div class="field"><label>${fd.l}</label><input type="text" data-p="${fd.p}" value="${esc(getP(c, fd.p))}" style="grid-column:2/4"></div>`;
      if (fd.t === 'range') h += `<div class="field"><label>${fd.l}</label><input type="range" data-p="${fd.p}" min="${fd.min}" max="${fd.max}" step="${fd.step}" value="${getP(c, fd.p)}"><span class="val" data-v="${fd.p}"></span></div>`;
      if (fd.t === 'range2') h += `<div class="field"><label>${fd.l}</label><div class="two"><input type="range" data-p="${fd.p[0]}" data-pair="${fd.p[1]}" data-lo="1" min="${fd.min}" max="${fd.max}" step="${fd.step}" value="${getP(c, fd.p[0])}"><input type="range" data-p="${fd.p[1]}" data-pair="${fd.p[0]}" min="${fd.min}" max="${fd.max}" step="${fd.step}" value="${getP(c, fd.p[1])}"></div><span class="val" data-v2="${fd.p.join(',')}"></span></div>`;
      if (fd.t === 'select') h += `<div class="field"><label>${fd.l}</label><select data-p="${fd.p}" style="grid-column:2/4">${Object.entries(fd.o).map(([k, v]) => `<option value="${k}" ${getP(c, fd.p) === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`;
      if (fd.t === 'check') h += `<div class="checks" style="grid-template-columns:1fr;margin-bottom:8px"><label><input type="checkbox" data-p="${fd.p}" ${getP(c, fd.p) ? 'checked' : ''}> ${fd.l}</label></div>`;
      if (fd.t === 'layers') {
        h += `<div class="field"><label>Nombre de couches cachées</label><select id="edNL" style="grid-column:2/4">${[1, 2, 3].map(n => `<option ${c.brain.layers.length === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
        c.brain.layers.forEach((v, i) => { h += `<div class="field"><label>Neurones max · couche ${i + 1}</label><input type="range" data-layer="${i}" min="2" max="32" step="1" value="${v}"><span class="val">${v}</span></div>`; });
      }
      if (fd.t === 'sensors') h += `<div style="margin:6px 0 4px;font-size:12px;color:#c9cede">Sens disponibles (entrées du cerveau)</div><div class="checks">${SENSOR_DEFS.map(d => `<label><input type="checkbox" data-sensor="${d.k}" ${c.brain.sensors[d.k] ? 'checked' : ''}> ${d.name}</label>`).join('')}</div>`;
    }
    h += '</div>';
  }
  f.innerHTML = h;
  f.querySelectorAll('[data-pre]').forEach(b => b.onclick = () => { applyPreset(c, PRESETS[b.dataset.pre]); buildForm(); });
  f.querySelectorAll('input[data-p], select[data-p]').forEach(el => {
    const ev = el.type === 'range' ? 'input' : 'change';
    el.addEventListener(ev, () => {
      let v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
      setP(c, el.dataset.p, v);
      if (el.dataset.pair) { // garder min ≤ max
        const other = getP(c, el.dataset.pair);
        if (el.dataset.lo && v > other) { setP(c, el.dataset.pair, v); f.querySelector(`[data-p="${el.dataset.pair}"]`).value = v; }
        if (!el.dataset.lo && v < other) { setP(c, el.dataset.pair, v); f.querySelector(`[data-p="${el.dataset.pair}"]`).value = v; }
      }
      c.body.segStart = clamp(c.body.segStart, c.body.segMin, c.body.segMax);
      const ss = f.querySelector('[data-p="body.segStart"]'); if (ss) ss.value = c.body.segStart;
      refreshVals(); ed.prevSim = null;
    });
  });
  f.querySelectorAll('[data-layer]').forEach(el => el.oninput = () => { c.brain.layers[+el.dataset.layer] = +el.value; el.nextElementSibling.textContent = el.value; ed.prevSim = null; refreshVals(); });
  $('edNL').onchange = e => { const n = +e.target.value; while (c.brain.layers.length < n) c.brain.layers.push(8); c.brain.layers.length = n; buildForm(); };
  f.querySelectorAll('[data-sensor]').forEach(el => el.onchange = () => { c.brain.sensors[el.dataset.sensor] = el.checked; refreshVals(); });
  refreshVals(); ed.prevSim = null;
}
function refreshVals() {
  const c = ed.cfg, f = $('edForm');
  for (const [, fields] of FIELDS) for (const fd of fields) {
    if (fd.t === 'range') { const el = f.querySelector(`[data-v="${fd.p}"]`); const v = getP(c, fd.p); if (el) el.innerHTML = fd.f ? fd.f(v) : (+v).toString(); }
    if (fd.t === 'range2') { const el = f.querySelector(`[data-v2="${fd.p.join(',')}"]`); if (el) el.textContent = `${getP(c, fd.p[0])} – ${getP(c, fd.p[1])}`; }
  }
  const nS = Object.values(c.brain.sensors).filter(Boolean).length;
  $('edInfo').innerHTML = `🧠 <b>${synapseCount(c)}</b> synapses · ${c.brain.layers.join(' → ')} neurones · ${nS} sens<br>
    🦴 ${c.body.segMin}–${c.body.segMax} vertèbres (départ ${c.body.segStart})<br>
    📏 Taille : ${Math.round(c.body.segMin * c.body.lenMin)} à ${Math.round(c.body.segMax * c.body.lenMax)} px<br>
    🧬 ${c.evo.pop} copies × ${c.evo.trials} essai(s) par génération<br>
    🎯 ${GOALS[c.goal.type]}` + (!c.brain.sensors.target && ['hunt'].includes(c.goal.type) ? '<br><span style="color:#eb6263">⚠ Sans « direction de la cible », elle ne pourra pas trouver les crevettes !</span>' : '') +
    (!c.brain.sensors.rhythm && !c.brain.recurrent ? '<br><span style="color:#d28e05">⚠ Sans rythme ni mémoire, onduler sera très difficile à inventer.</span>' : '');
}
function renderEditorPreview(t) {
  if (!ed) return;
  const c = ed.cfg;
  if (!ed.prevSim) {
    const b = c.body, g = randGenome(c);
    g.nSeg = b.segStart; g.segLen = (b.lenMin + b.lenMax) / 2; g.headW = (b.widthMin + b.widthMax) / 2; g.taper = (b.taperMin + b.taperMax) / 2;
    g.fin = b.finMax * 0.6; g.pect = b.pectMax * 0.6; g.flex = b.flexMax * 0.8; g.str = b.strMax; g.freq = b.freqMax; g.hue = c.hue;
    const s = new Sim(clampGenome(g, c), c, 0, 0, 0); s.manual = (j, tt) => Math.sin(tt * 0.12 - j * 0.75);
    ed.prevSim = s;
  }
  const s = ed.prevSim; s.g.hue = c.hue;
  s.step(0, 0, 1, 1); s.step(0, 0, 1, 1);
  const el = $('edPrev'), c2 = el.getContext('2d'), dpr = window.devicePixelRatio || 1, W = 344, H = 230;
  c2.setTransform(dpr, 0, 0, dpr, 0, 0);
  const gr = c2.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#13527e'); gr.addColorStop(1, '#061a33'); c2.fillStyle = gr; c2.fillRect(0, 0, W, H);
  const size = s.n * s.L + 40, z = clamp((W - 40) / size, 0.4, 2.2);
  c2.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - s.x * z), dpr * (H / 2 - s.y * z));
  c2.strokeStyle = 'rgba(255,255,255,.06)'; c2.lineWidth = 1 / z;
  const x0 = s.x - W / 2 / z, y0 = s.y - H / 2 / z;
  for (let x = Math.floor(x0 / 40) * 40; x < x0 + W / z; x += 40) { c2.beginPath(); c2.moveTo(x, y0); c2.lineTo(x, y0 + H / z); c2.stroke(); }
  for (let y = Math.floor(y0 / 40) * 40; y < y0 + H / z; y += 40) { c2.beginPath(); c2.moveTo(x0, y); c2.lineTo(x0 + W / z, y); c2.stroke(); }
  drawCreature(c2, s, { pattern: c.pattern, muscles: App.ov.muscles, xray: App.ov.xray, z });
}

// =====================================================================
//  SAUVEGARDE (IndexedDB : tout reste dans ton navigateur)
// =====================================================================
const DB = 'abysse-labo', STORE = 'kv';
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbSet(k, v) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); }
async function idbGet(k) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
let saving = false;
async function saveAll() {
  if (saving) return; saving = true;
  try {
    const snap = await request({ t: 'snapshot' });
    if (snap) for (const s of snap) { const sp = spById(s.id); if (sp) { sp.seeds = s.seeds; sp.gen = Math.max(sp.gen, s.gen); sp.evals = s.evals; } }
    const data = {
      v: 2, cam: App.ocean.cam, settings: App.ocean.settings, ov: App.ov,
      species: App.species.map(sp => ({ id: sp.id, cfg: sp.cfg, gen: sp.gen, evals: sp.evals, running: sp.running, history: sp.history, champs: sp.champs, log: sp.log, record: sp.record, lastVert: sp.lastVert, lastNeur: sp.lastNeur, seeds: sp.seeds })),
      creatures: App.ocean.creatures.slice(0, 500).map(c => ({ sp: c.sp.id, spec: c.specId, g: c.sim.g, x: c.sim.x, y: c.sim.y, energy: c.energy, ogen: c.ogen, eaten: c.eaten, kills: c.kills, labGen: c.labGen, sterile: c.sterile, immortal: c.immortal, name: c.name })),
      specimens: App.specimens.map(s => ({ ...s, ghost: undefined })),
    };
    await idbSet('state', data);
    $('saveState').textContent = '💾 Sauvegardé à ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { $('saveState').textContent = '⚠ Sauvegarde impossible : ' + e.message; }
  saving = false;
}
$('saveBtn').onclick = saveAll;
setInterval(saveAll, 30000);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveAll(); });

async function boot() {
  let data = null;
  try { data = await idbGet('state'); } catch (e) {}
  if (data && data.species && data.species.length) {
    Object.assign(App.settings, data.settings || {}); Object.assign(App.ov, data.ov || {}); if (data.cam) Object.assign(App.cam, data.cam);
    for (const s of data.species) createSpecies(Object.assign(defaultCfg(), s.cfg), s);
    App.specimens = (data.specimens || []).map(s => { s.cfg = Object.assign(defaultCfg(), s.cfg); s.g = clampGenome(s.g, s.cfg); return s; });
    for (const c of data.creatures || []) {
      const spec = c.spec && App.specimens.find(s => s.id === c.spec), sp = spec ? specSpecies(spec) : spById(c.sp);
      if (sp) spawnCreature(clampGenome(c.g, sp.cfg), sp, c.x, c.y, { ...c, specId: c.spec }, App.ocean);
    }
    App.selSp = App.species[0];
    const total = App.species.reduce((a, s) => a + s.evals, 0);
    toast(`👋 Bon retour au labo ! ${App.species.length} espèces, ${fmt(total)} copies déjà testées, ${App.creatures.length} créatures dans l'océan.`);
    $('saveState').textContent = '💾 Espèces restaurées';
  } else {
    const a = applyPreset(defaultCfg(), PRESETS['🐟 Poisson']); a.name = 'Piscis primordia'; a.hue = 195; a.goal.type = 'survive'; a.brain.sensors.danger = true;
    const b = Object.assign(defaultCfg(), { name: 'Anguilla abyssi', hue: 130 }); b.body = structuredClone(PRESETS['🐍 Anguille'].body); b.pattern = 'gradient';
    b.brain.layers = [10, 8]; b.brain.sensors.proprio = true;
    const d = applyPreset(defaultCfg(), PRESETS['🦈 Squale-faucheur']);
    createSpecies(a); createSpecies(b); createSpecies(d);
    App.selSp = App.species[0];
    toast('🧪 Trois espèces primitives évoluent dans le labo (à gauche), dont un prédateur 🦈.<br>Quand leur score monte, clique 🌊 pour les lâcher dans l\'océan, ou ⚔ Arène pour un duel !');
  }
  OVS.forEach(([k], i) => $('ovGrp').querySelectorAll('button')[i].classList.toggle('on', App.ov[k]));
  for (let i = 0; i < App.settings.foodTarget * 0.8; i++) spawnFood();
  dirty.list = dirty.sp = dirty.ind = true; Tank.pendingReset = true;
}

// =====================================================================
//  BOUCLE PRINCIPALE
// =====================================================================
let spTabFor = null;
let frameN = 0, lastUI = 0, fps = 60, lastT = performance.now();
function frame(t) {
  frameN++; fps = fps * 0.95 + 50 / Math.max(1, t - lastT); lastT = t;
  rebuildGrid(App.world);
  const ts = App.timeScale;
  if (ts > 0) {
    const dt = Math.min(1, ts), steps = Math.max(1, Math.round(ts));
    for (let k = 0; k < steps; k++) { worldStep(App.world, dt); tankStep(dt); }
  }
  if (fallback) fallback.tick(7);
  if (App.follow && App.selCr && App.selCr.sim && !App.selCr.tank) { App.cam.x += (App.selCr.sim.x - App.cam.x) * 0.1; App.cam.y += (App.selCr.sim.y - App.cam.y) * 0.1; }
  renderOcean(t);
  if (frameN % 3 === 0) renderMinimap();
  if (Tank.pendingReset) tankReset();
  if (App.tab === 'sp') renderTank(t);
  if (dirty.list) { dirty.list = false; renderSpeciesList(); }
  if (dirty.sp) { dirty.sp = false; if (!spCharts || spTabFor !== App.selSp) { buildSpeciesTab(); spTabFor = App.selSp; } else updateSpeciesTab(); }
  if (dirty.ind || indBuiltFor !== App.selCr) { dirty.ind = false; buildIndTab(); }
  if (App.tab === 'ind' && frameN % 2 === 0) { drawBrain(); drawMuscles(); drawPower(); }
  if (ed) renderEditorPreview(t);
  if (t - lastUI > 250) {
    lastUI = t; updateCardBars(); updateIndTab(); renderDuelHud();
    $('hud').style.display = App.view === 'arena' ? 'none' : '';
    for (const sp of App.species) { // extinctions dans l'océan
      const n = App.ocean.creatures.filter(c => c.sp === sp).length;
      if (sp.oceanN > 0 && n === 0) { toast(`💀 Extinction : <b>${esc(sp.cfg.name)}</b> a disparu de l'océan.`); addLog(sp, '💀 Extinction de la population sauvage dans l\'océan'); }
      if (sp.oceanN > 0 && n >= sp.oceanPeak * 2 && n >= 50) { addLog(sp, `📈 Explosion démographique dans l'océan : ${n} individus`); sp.oceanPeak = n; }
      if (!sp.oceanPeak || n > sp.oceanPeak * 2) sp.oceanPeak = Math.max(sp.oceanPeak || 0, n);
      sp.oceanN = n;
    }
    const counts = App.species.map(sp => `<span style="color:hsl(${sp.cfg.hue},70%,70%)">●</span> ${App.creatures.filter(c => c.sp === sp).length}`).join(' ');
    $('hud').innerHTML = `🌊 <b>${App.creatures.length}</b> créatures · 🦐 ${App.food.length} · zoom ${App.cam.z.toFixed(2)}× · ${App.timeScale ? App.timeScale + '×' : 'pause'}<br>${counts}<br><span style="color:#8a90a6">naissances ${App.births} · morts ${App.deaths} · ${Math.round(fps)} img/s</span>`;
    $('labSpeed').textContent = App.species.filter(s => s.running).length + ' en évolution';
    if ($('omPops')) $('omPops').innerHTML = App.species.map(sp => `<div class="kv"><span><span style="color:hsl(${sp.cfg.hue},70%,62%)">●</span> ${esc(sp.cfg.name)}</span><b>${App.ocean.creatures.filter(c => c.sp === sp).length}</b></div>`).join('');
  }
  requestAnimationFrame(frame);
}
resize();
boot().then(() => requestAnimationFrame(frame));
window.__app = App;
