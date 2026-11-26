// =====================================================================
//  ÉTAT GLOBAL
// =====================================================================
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('fr-FR');
const OW = 9000, OH = 5200;              // taille de l'océan
const POS = '#e76624', NEG = '#338ced';  // couleurs divergentes (activation +/-)

const App = {
  species: [],
  timeScale: 1,
  ov: { trails: false, forces: false, muscles: false, vision: false, xray: false, labels: true },
  selSp: null, selCr: null, follow: false,
};

// =====================================================================
//  WORKER DU LABO (l'évolution tourne en parallèle, sans ralentir l'océan)
// =====================================================================
let worker = null, fallback = null, reqId = 1;
const pending = new Map();
function send(msg) { if (worker) worker.postMessage(msg); else fallback.handle(structuredClone(msg)); }
function request(msg) {
  return new Promise(res => {
    const req = reqId++; pending.set(req, res);
    send({ ...msg, req });
    setTimeout(() => { if (pending.has(req)) { pending.delete(req); res(null); } }, 4000);
  });
}
function onEngine(m) {
  if (m.t === 'reply') { const r = pending.get(m.req); if (r) { pending.delete(m.req); r(m.data); } return; }
  if (m.t === 'progress') { for (const it of m.items) { const sp = spById(it.id); if (sp) sp.progress = it.idx / it.size; } return; }
  if (m.t === 'gen') onGeneration(m);
}
(function startWorker() {
  try {
    const src = $('core').textContent + `
      const E = new LabEngine(m => postMessage(m));
      onmessage = e => E.handle(e.data);
      (function loop() { const busy = E.tick(30); setTimeout(loop, busy ? 0 : 50); })();`;
    worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = e => onEngine(e.data);
    worker.onerror = () => { worker = null; fallback = new LabEngine(onEngine); App.species.forEach(resendSpecies); };
  } catch (e) { worker = null; fallback = new LabEngine(onEngine); }
})();

// =====================================================================
//  ESPÈCES
// =====================================================================
const spById = id => App.species.find(s => s.id === id);
const GENERA = ['Anguilla', 'Piscis', 'Draco', 'Abyssus', 'Nereis', 'Vermis', 'Lampra', 'Myxo', 'Squalus', 'Gyrinus', 'Cephalo', 'Thalasso'];
const EPITHETS = ['velox', 'primordia', 'luminosa', 'profunda', 'audax', 'serpentina', 'minima', 'gigantea', 'curiosa', 'rapax', 'tenebris', 'aurora'];
const randomName = () => GENERA[Math.floor(Math.random() * GENERA.length)] + ' ' + EPITHETS[Math.floor(Math.random() * EPITHETS.length)];

function createSpecies(cfg, opts = {}) {
  const sp = {
    id: opts.id || newId(), cfg, gen: opts.gen || 0, evals: opts.evals || 0, running: opts.running !== false,
    history: opts.history || [], champs: (opts.champs || []).map(e => ({ ...e, g: clampGenome(e.g, cfg) })), log: opts.log || [], progress: 0,
    champ: null, record: opts.record || 0,
    lastVert: opts.lastVert || 0, lastNeur: opts.lastNeur || 0, seeds: opts.seeds || [],
  };
  if (sp.champs.length) sp.champ = sp.champs[sp.champs.length - 1].g;
  App.species.push(sp);
  resendSpecies(sp);
  if (!sp.log.length) addLog(sp, `🌱 Apparition de l'espèce (${GOALS[cfg.goal.type]})`);
  renderSpeciesList();
  return sp;
}
function resendSpecies(sp) { send({ t: 'add', id: sp.id, cfg: sp.cfg, seeds: sp.seeds, gen: sp.gen, evals: sp.evals, running: sp.running }); }
function addLog(sp, msg) { sp.log.unshift(`<b>Gén ${sp.gen}</b> · ${msg}`); if (sp.log.length > 80) sp.log.length = 80; if (sp === App.selSp) dirty.sp = true; }

function stageName(n) {
  if (n <= 3) return '🪱 Proto-ver';
  if (n <= 5) return '🐛 Larve nageuse';
  if (n <= 8) return '🐟 Poisson primitif';
  if (n <= 11) return '🐠 Poisson vertébré';
  if (n <= 15) return '🐍 Anguille';
  if (n <= 19) return '🐉 Serpent de mer';
  return '🌊 Léviathan';
}

function onGeneration(m) {
  const sp = spById(m.id); if (!sp) return;
  sp.gen = m.gen + 1; sp.evals = m.evals; sp.champ = m.champ;
  const st = m.stats;
  sp.history.push({ gen: m.gen, best: Math.max(0, m.best), avg: Math.max(0, m.avg), vert: st.vert, str: st.str, neur: st.neur, div: st.div, len: st.len });
  if (sp.history.length > 600) sp.history = sp.history.filter((_, i) => i % 2 === 0 || i > 400);
  sp.champs.push({ gen: m.gen, g: m.champ, score: m.best });
  if (sp.champs.length > 240) sp.champs = sp.champs.filter((_, i) => i === 0 || i % 2 === 1 || i > 180);
  const c = m.champ, neur = c.brain.active.reduce((a, v) => a + v, 0);
  if (sp.lastVert && c.nSeg !== sp.lastVert) {
    addLog(sp, c.nSeg > sp.lastVert ? `🦴 Mutation gagnante : le champion a ${c.nSeg} vertèbres` : `🦴 Le champion perd une vertèbre (${c.nSeg}), c'était plus efficace`);
    if (stageName(c.nSeg) !== stageName(sp.lastVert)) addLog(sp, `✨ Nouveau stade : ${stageName(c.nSeg)}`);
  }
  if (sp.cfg.brain.neurogenesis && sp.lastNeur && neur !== sp.lastNeur) addLog(sp, neur > sp.lastNeur ? `🧠 Neurogenèse : le champion a ${neur} neurones` : `🧠 Cerveau simplifié : ${neur} neurones`);
  sp.lastVert = c.nSeg; sp.lastNeur = neur;
  if (m.best > sp.record * 1.15 && m.best > 10) { addLog(sp, `🏆 Record : ${fmt(m.best)} points`); sp.record = m.best; }
  dirty.list = true; if (sp === App.selSp) { dirty.sp = true; if (Tank.followLatest) Tank.pendingReset = true; }
}

// =====================================================================
//  LES MONDES : l'océan géant et l'arène des duels
// =====================================================================
function floorY(x) { return 5200 - 230 + 70 * Math.sin(x / 900) + 38 * Math.sin(x / 310 + 2) + 14 * Math.sin(x / 97); }
const CELL = 256;
class World {
  constructor(kind, W, H) {
    this.kind = kind; this.W = W; this.H = H;
    this.creatures = []; this.food = []; this.grid = []; this.cgrid = [];
    this.GW = Math.ceil(W / CELL); this.GH = Math.ceil(H / CELL);
    this.settings = { foodTarget: kind === 'ocean' ? 900 : 60, repro: kind === 'ocean', cap: 400, visc: 1, predation: true };
    this.cam = { x: W / 2, y: kind === 'ocean' ? 1400 : H / 2, z: kind === 'ocean' ? 0.45 : 0.5 };
    this.births = 0; this.deaths = 0; this.kills = 0;
    this.patches = kind === 'ocean' ? arr(14, () => ({ x: rnd(400, W - 400), y: rnd(300, H - 600), vx: rnd(-0.15, 0.15), vy: rnd(-0.08, 0.08), r: rnd(180, 420) })) : [];
  }
  floor(x) { return this.kind === 'ocean' ? floorY(x) : this.H - 10; }
}
App.ocean = new World('ocean', 9000, 5200);
App.arena = null; App.view = 'ocean';
Object.defineProperty(App, 'world', { get() { return App.view === 'arena' && App.arena ? App.arena : App.ocean; } });
for (const k of ['creatures', 'food', 'settings', 'cam', 'births', 'deaths'])
  Object.defineProperty(App, k, { get() { return App.world[k]; }, set(v) { App.world[k] = v; } });

function spawnFood(w = App.world) {
  let x, y;
  if (w.patches.length && Math.random() < 0.7) { const p = w.patches[Math.floor(Math.random() * w.patches.length)]; x = p.x + gauss() * p.r; y = p.y + gauss() * p.r * 0.6; }
  else { x = rnd(50, w.W - 50); y = rnd(60, w.H - (w.kind === 'ocean' ? 300 : 60)); }
  x = clamp(x, 30, w.W - 30); y = clamp(y, 40, w.floor(x) - 30);
  const f = { x, y, alive: true, ph: Math.random() * 6 };
  w.food.push(f); gridAdd(w, f);
}
function gridAdd(w, f) { const i = clamp(Math.floor(f.x / CELL), 0, w.GW - 1) + clamp(Math.floor(f.y / CELL), 0, w.GH - 1) * w.GW; (w.grid[i] || (w.grid[i] = [])).push(f); }
function rebuildGrid(w = App.world) {
  w.food = w.food.filter(f => f.alive); w.grid = new Array(w.GW * w.GH); for (const f of w.food) gridAdd(w, f);
  w.cgrid = new Array(w.GW * w.GH);
  for (const c of w.creatures) { const i = clamp(Math.floor(c.sim.x / CELL), 0, w.GW - 1) + clamp(Math.floor(c.sim.y / CELL), 0, w.GH - 1) * w.GW; (w.cgrid[i] || (w.cgrid[i] = [])).push(c); }
}
function scanGrid(w, g, x, y, maxR, test) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), R = Math.ceil(maxR / CELL);
  let best = null, bd = maxR * maxR;
  for (let j = cy - R; j <= cy + R; j++) { if (j < 0 || j >= w.GH) continue;
    for (let i = cx - R; i <= cx + R; i++) { if (i < 0 || i >= w.GW) continue;
      const cell = g[i + j * w.GW]; if (!cell) continue;
      for (const o of cell) { if (!test(o)) continue; const ox = o.sim ? o.sim.x : o.x, oy = o.sim ? o.sim.y : o.y, d = (ox - x) ** 2 + (oy - y) ** 2; if (d < bd) { bd = d; best = o; } } } }
  return best ? { o: best, d: Math.sqrt(bd) } : null;
}
const nearestFood = (w, x, y, r) => { const h = scanGrid(w, w.grid, x, y, r, f => f.alive); return h && h.o; };
const isMeatEater = c => c.sp.cfg.diet === 'carnivore' || c.sp.cfg.diet === 'omnivore';
const canEat = (pred, prey) => prey !== pred && prey.alive && (pred.side !== undefined ? pred.side !== prey.side : prey.sp !== pred.sp) && !prey.immortal && !(prey.grace > 0) && prey.sim.M <= pred.sim.M * 1.6;

let cidN = 1;
function spawnCreature(g, sp, x, y, extra = {}, w = App.world) {
  const sim = new Sim(g, sp.cfg, x, y, extra.th ?? rnd(0, 2 * Math.PI), w.settings.visc);
  const c = { sim, sp, id: cidN++, energy: extra.energy ?? 100, age: 0, eaten: extra.eaten || 0, kills: extra.kills || 0, kids: 0, ogen: extra.ogen || 0,
    labGen: extra.labGen ?? sp.gen, trail: [], target: null, retarget: 0, wander: null, danger: null, powerHist: [], alive: true, born: performance.now(),
    sterile: !!extra.sterile, immortal: !!extra.immortal, grace: extra.grace || 0, specId: extra.specId, side: extra.side, name: extra.name };
  w.creatures.push(c);
  return c;
}
const particles = [];
function burst(x, y, color, n, spd = 2) { for (let i = 0; i < n; i++) particles.push({ x, y, vx: rnd(-spd, spd), vy: rnd(-spd, spd), life: 1, color }); }
function metabolism(c) { return (0.03 + c.sim.M / 25000) * (c.sp.cfg.diet === 'carnivore' ? 0.45 : 1); } // les prédateurs savent jeûner

function worldStep(w, dt) {
  const S = w.settings;
  for (const p of w.patches) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < 400 || p.x > w.W - 400) p.vx *= -1; if (p.y < 300 || p.y > w.H - 700) p.vy *= -1; }
  if (w.food.length < S.foodTarget) for (let k = 0; k < Math.ceil(3 * dt); k++) spawnFood(w);
  const pred = S.predation, list = w.creatures, n0 = list.length;
  for (let idx = 0; idx < n0; idx++) {
    const c = list[idx]; if (!c.alive) continue;
    const s = c.sim, diet = c.sp.cfg.diet;
    c.retarget -= dt;
    if (c.retarget <= 0 || !c.target || !c.target.alive) {
      c.retarget = 12;
      if (w.targetFn) c.target = w.targetFn(c);
      else {
        const food = diet !== 'carnivore' ? scanGrid(w, w.grid, s.x, s.y, 650, f => f.alive) : null;
        const prey = pred && isMeatEater(c) && !(c.digest > 0) && (diet === 'carnivore' || c.energy < 120) ? scanGrid(w, w.cgrid, s.x, s.y, diet === 'carnivore' ? 1100 : 700, o => canEat(c, o)) : null;
        const best = food && prey ? (prey.d < food.d * 1.2 ? prey : food) : (food || prey);
        c.target = best ? best.o : null;
        if (!c.target) {
          if (!c.wander || c.age % 300 < dt) { const a = s.th + rnd(-1, 1); c.wander = { x: clamp(s.x + Math.cos(a) * 600, 50, w.W - 50), y: clamp(s.y + Math.sin(a) * 600, 50, w.H - 300), alive: true, fake: true }; }
          c.target = c.wander;
        }
      }
      // la peur : le prédateur le plus proche
      const d = pred ? scanGrid(w, w.cgrid, s.x, s.y, 500, o => isMeatEater(o) && canEat(o, c)) : null;
      c.danger = d ? d.o : null;
    }
    const tgt = c.target, tx = tgt.sim ? tgt.sim.x : tgt.x, ty = tgt.sim ? tgt.sim.y : tgt.y;
    const dg = c.danger && c.danger.alive ? c.danger.sim : null;
    s.step(tx, ty, dt, clamp(c.energy / 150, 0, 1), dg ? dg.x : undefined, dg ? dg.y : undefined);
    if (!w.noHunger) c.energy -= (metabolism(c) + s.power * 0.006) * dt;
    if (c.immortal) c.energy = Math.max(c.energy, 60);
    c.age += dt; if (c.digest > 0) c.digest -= dt; if (c.grace > 0) c.grace -= dt;
    if (s.x < 20) { s.x = 20; s.vx = Math.abs(s.vx); } if (s.x > w.W - 20) { s.x = w.W - 20; s.vx = -Math.abs(s.vx); }
    if (s.y < 15) { s.y = 15; s.vy = Math.abs(s.vy); } const fy = w.floor(s.x) - 15; if (s.y > fy) { s.y = fy; s.vy = -Math.abs(s.vy); }
    // manger une crevette
    if (!tgt.fake && !tgt.sim && tgt.alive && Math.hypot(tx - s.x, ty - s.y) < 18 + s.g.headW * 0.5) {
      tgt.alive = false; c.energy = Math.min(220, c.energy + 38); c.eaten++; c.target = null;
      burst(tx, ty, '255,170,120', 6, 1.2);
    }
    // mordre une proie
    if (tgt.sim && tgt.alive && pred && canEat(c, tgt)) {
      const [hx, hy] = s.headPos(), reach = 10 + s.g.headW * 0.6 + tgt.sim.n * tgt.sim.L * 0.3;
      if (Math.hypot(hx - tx, hy - ty) < reach && Math.random() < 0.6 * Math.min(1, dt * 2)) {
        tgt.alive = false; tgt.killedBy = c; c.kills++; w.kills++; w.deaths++;
        c.energy = Math.min(240, c.energy + 45 + tgt.sim.M / 30); c.target = null; c.digest = 250; // digestion : il ne chasse plus pendant un moment
        burst(tx, ty, '255,70,70', 22, 2.5);
        if (tgt === App.selCr) { App.selCr = { dead: true, ref: tgt }; App.follow = false; }
      }
    }
    if ((App.ov.trails || c === App.selCr) && (c.age | 0) % 5 === 0 && c.lastTrail !== (c.age | 0)) { c.lastTrail = c.age | 0; c.trail.push(s.x, s.y); if (c.trail.length > 400) c.trail.splice(0, 2); }
    const meat = diet === 'carnivore', thr = meat ? 210 : 175;
    if (S.repro && !c.sterile && c.energy > thr && w.creatures.length < S.cap) {
      c.energy -= meat ? 110 : 85; c.kids++;
      const child = spawnCreature(mutateG(cloneG(s.g), c.sp.cfg), c.sp, s.x + rnd(-20, 20), s.y + rnd(-20, 20), { energy: 70, ogen: c.ogen + 1, labGen: c.labGen }, w);
      w.births++; burst(child.sim.x, child.sim.y, '160,255,200', 10, 1.5);
    }
    if (!c.immortal && (c.energy <= 0 || c.age > 24000)) {
      c.alive = false; w.deaths++; burst(s.x, s.y, '200,220,255', 14, 1.6);
      if (c === App.selCr) { App.selCr = { dead: true, ref: c }; App.follow = false; }
    }
  }
  if (w.creatures.some(c => !c.alive)) { if (w.onDeath) for (const c of w.creatures) if (!c.alive) w.onDeath(c); w.creatures = w.creatures.filter(c => c.alive); }
  const sc = App.selCr;
  if (sc && !sc.dead && sc.sim && sc.sp && !sc.tank) { sc.powerHist.push(sc.sim.power); if (sc.powerHist.length > 300) sc.powerHist.shift(); }
  if (w.onStep) w.onStep(dt);
}


// =====================================================================
//  CAMÉRA & SOURIS
// =====================================================================
const cv = $('ocean'), ctx = cv.getContext('2d');
let CW = 800, CH = 600, DPR = 1;
function resize() {
  const r = $('center').getBoundingClientRect(); DPR = window.devicePixelRatio || 1;
  CW = r.width; CH = r.height; cv.width = CW * DPR; cv.height = CH * DPR;
}
new ResizeObserver(resize).observe($('center'));
const toWorld = (sx, sy) => [(sx - CW / 2) / App.cam.z + App.cam.x, (sy - CH / 2) / App.cam.z + App.cam.y];
function zoomAt(sx, sy, f) {
  const [wx, wy] = toWorld(sx, sy);
  App.cam.z = clamp(App.cam.z * f, 0.06, 4);
  App.cam.x = wx - (sx - CW / 2) / App.cam.z; App.cam.y = wy - (sy - CH / 2) / App.cam.z;
}
cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
let drag = null;
cv.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, cx: App.cam.x, cy: App.cam.y, moved: false }; cv.classList.add('drag'); });
window.addEventListener('mousemove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; App.follow = false; }
  App.cam.x = drag.cx - dx / App.cam.z; App.cam.y = drag.cy - dy / App.cam.z;
});
window.addEventListener('mouseup', e => {
  if (!drag) return; cv.classList.remove('drag');
  if (!drag.moved && e.target === cv) {
    const r = cv.getBoundingClientRect(); const [wx, wy] = toWorld(e.clientX - r.left, e.clientY - r.top);
    let best = null, bd = (45 / App.cam.z) ** 2;
    for (const c of App.creatures) { const d = (c.sim.x - wx) ** 2 + (c.sim.y - wy) ** 2; if (d < bd) { bd = d; best = c; } }
    if (best) selectCreature(best); else if (App.selCr) { App.selCr = null; App.follow = false; dirty.ind = true; }
  }
  drag = null;
});
cv.addEventListener('dblclick', () => { if (App.selCr && App.selCr.sim) { App.follow = true; App.cam.z = Math.max(App.cam.z, 1.6); } });
$('zin').onclick = () => zoomAt(CW / 2, CH / 2, 1.4);
$('zout').onclick = () => zoomAt(CW / 2, CH / 2, 1 / 1.4);
$('zfit').onclick = () => { App.follow = false; App.cam.z = Math.min(CW / App.world.W, CH / App.world.H) * 0.95; App.cam.x = App.world.W / 2; App.cam.y = App.world.H / 2; };
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || $('modal').classList.contains('show')) return;
  if (e.key === ' ') { e.preventDefault(); setTime(App.timeScale ? 0 : 1); }
  if (e.key === '+' || e.key === '=') zoomAt(CW / 2, CH / 2, 1.3);
  if (e.key === '-') zoomAt(CW / 2, CH / 2, 1 / 1.3);
  if (e.key === 'f' && App.selCr && App.selCr.sim) App.follow = !App.follow;
  if (e.key === 'Escape') { App.selCr = null; App.follow = false; dirty.ind = true; }
});

function selectCreature(c) {
  App.selCr = c; c.powerHist = c.powerHist || [];
  if (c.sp && App.selSp !== c.sp && App.species.includes(c.sp)) { App.selSp = c.sp; dirty.list = true; dirty.sp = true; }
  showTab('ind'); dirty.ind = true;
}

// minimap
const mm = $('minimap'), mctx = mm.getContext('2d');
function mmMove(e) { const r = mm.getBoundingClientRect(); App.follow = false; App.cam.x = (e.clientX - r.left) / r.width * App.world.W; App.cam.y = (e.clientY - r.top) / r.height * App.world.H; }
let mmDrag = false;
mm.addEventListener('mousedown', e => { mmDrag = true; mmMove(e); e.stopPropagation(); });
window.addEventListener('mousemove', e => { if (mmDrag) mmMove(e); });
window.addEventListener('mouseup', () => { mmDrag = false; });

// =====================================================================
//  DESSIN
// =====================================================================
const seaweed = arr(520, () => { const x = rnd(0, OW); return { x, h: rnd(50, 190), ph: rnd(0, 6), hue: rnd(95, 165), w: rnd(3, 7) }; });
const corals = arr(160, () => ({ x: rnd(0, OW), hue: [345, 20, 300, 45, 190][Math.floor(Math.random() * 5)], s: rnd(14, 40), br: 3 + Math.floor(Math.random() * 4), seed: Math.random() * 100 }));
const rocks = arr(120, () => ({ x: rnd(0, OW), rx: rnd(25, 110), ry: rnd(15, 60), l: rnd(14, 26) }));
const jelly = arr(14, () => ({ x: rnd(200, OW - 200), y: rnd(400, OH - 900), ph: rnd(0, 6), s: rnd(14, 30), hue: rnd(260, 330) }));
function hash(i, j) { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

function bodyGeom(sim) {
  const n = sim.n, L = sim.L, c = Math.cos(sim.th), s = Math.sin(sim.th);
  const P = [], D = [];
  let x = -sim.cx, y = -sim.cy, phi = 0;
  P.push([sim.x + c * x - s * y, sim.y + s * x + c * y]);
  for (let i = 0; i < n; i++) { if (i > 0) phi += sim.a[i]; x -= L * Math.cos(phi); y -= L * Math.sin(phi); P.push([sim.x + c * x - s * y, sim.y + s * x + c * y]); D.push(sim.th + phi); }
  const HW = [], A = [];
  for (let k = 0; k <= n; k++) {
    HW.push((k === 0 ? sim.w[0] * 0.8 : k === n ? sim.w[n - 1] * 0.45 : (sim.w[k - 1] + sim.w[k]) / 2) * 0.58);
    A.push(k === 0 ? D[0] : k === n ? D[n - 1] : (D[k - 1] + D[k]) / 2);
  }
  return { P, D, HW, A, n };
}

function drawCreature(c2, sim, o = {}) {
  const g = sim.g, hue = g.hue, z = o.z || 1, alpha = o.alpha ?? 1, pattern = o.pattern || 'none';
  const { P, D, HW, A, n } = bodyGeom(sim);
  c2.save(); c2.globalAlpha = alpha;
  if (o.lod) {
    c2.strokeStyle = `hsl(${hue},65%,55%)`; c2.lineWidth = Math.max(g.headW * 0.9, 2.2 / z); c2.lineCap = 'round';
    c2.beginPath(); c2.moveTo(P[0][0], P[0][1]); for (let k = 1; k <= n; k += 2) c2.lineTo(P[k][0], P[k][1]); c2.lineTo(P[n][0], P[n][1]); c2.stroke();
    c2.restore(); return;
  }
  const xr = o.xray;
  const L = [], R = [];
  for (let k = 0; k <= n; k++) { const nx = -Math.sin(A[k]), ny = Math.cos(A[k]); L.push([P[k][0] + nx * HW[k], P[k][1] + ny * HW[k]]); R.push([P[k][0] - nx * HW[k], P[k][1] - ny * HW[k]]); }
  if (o.glow) { c2.shadowColor = `hsla(${hue},90%,65%,.9)`; c2.shadowBlur = 18; }
  // nageoire caudale
  const tl = P[n], ta = D[n - 1], bx = -Math.cos(ta), by = -Math.sin(ta), tnx = -Math.sin(ta), tny = Math.cos(ta);
  const fl = 4 + g.fin * 7, fs = 3 + g.fin * 7;
  c2.fillStyle = `hsla(${hue + 25},75%,${xr ? 70 : 62}%,${xr ? 0.25 : 0.85})`;
  c2.beginPath(); c2.moveTo(tl[0], tl[1]);
  c2.lineTo(tl[0] + bx * fl + tnx * fs, tl[1] + by * fl + tny * fs); c2.lineTo(tl[0] + bx * fl * 0.55, tl[1] + by * fl * 0.55);
  c2.lineTo(tl[0] + bx * fl - tnx * fs, tl[1] + by * fl - tny * fs); c2.closePath(); c2.fill();
  // nageoires pectorales
  if (n > 1 && g.pect > 0.15) {
    const k = 1, nx = -Math.sin(A[k]), ny = Math.cos(A[k]), sz = 3 + g.pect * 5;
    for (const sg of [1, -1]) { c2.beginPath(); c2.ellipse(P[k][0] + nx * HW[k] * sg - Math.cos(A[k]) * 2, P[k][1] + ny * HW[k] * sg - Math.sin(A[k]) * 2, sz, sz * 0.42, A[k] + sg * 0.7 + Math.PI, 0, 7); c2.fill(); }
  }
  // corps
  if (pattern === 'gradient' && !xr) { const gr = c2.createLinearGradient(P[0][0], P[0][1], P[n][0], P[n][1]); gr.addColorStop(0, `hsl(${hue},65%,52%)`); gr.addColorStop(1, `hsl(${hue + 50},70%,45%)`); c2.fillStyle = gr; }
  else c2.fillStyle = xr ? `hsla(${hue},50%,60%,.18)` : `hsl(${hue},62%,48%)`;
  c2.beginPath(); c2.moveTo(L[0][0], L[0][1]);
  for (let k = 1; k <= n; k++) c2.lineTo(L[k][0], L[k][1]);
  for (let k = n; k >= 0; k--) c2.lineTo(R[k][0], R[k][1]);
  c2.closePath(); c2.fill();
  c2.beginPath(); c2.arc(P[0][0], P[0][1], HW[0], 0, 7); c2.fill();
  c2.shadowBlur = 0;
  if (!xr && pattern === 'stripes') {
    c2.strokeStyle = `hsla(${hue},60%,25%,.55)`; c2.lineWidth = Math.max(1, sim.L * 0.3);
    for (let k = 1; k < n; k += 1) { if (k % 2) continue; c2.beginPath(); c2.moveTo(L[k][0], L[k][1]); c2.lineTo(R[k][0], R[k][1]); c2.stroke(); }
  } else if (!xr && pattern === 'spots') {
    c2.fillStyle = `hsla(${hue + 40},80%,80%,.6)`;
    for (let k = 1; k < n; k += 2) { const nx = -Math.sin(A[k]), ny = Math.cos(A[k]); c2.beginPath(); c2.arc(P[k][0] + nx * HW[k] * 0.4, P[k][1] + ny * HW[k] * 0.4, HW[k] * 0.28, 0, 7); c2.fill(); }
  }
  // muscles (chaleur)
  if (o.muscles) {
    for (let i = 1; i < n; i++) {
      const e = clamp(sim.effort[i] * 1.2, 0, 1); if (e < 0.03) continue;
      c2.fillStyle = `rgba(255,${Math.round(150 - 100 * e)},40,${0.15 + 0.7 * e})`;
      c2.beginPath(); c2.moveTo(L[i][0], L[i][1]); c2.lineTo(L[i + 1][0], L[i + 1][1]); c2.lineTo(R[i + 1][0], R[i + 1][1]); c2.lineTo(R[i][0], R[i][1]); c2.closePath(); c2.fill();
      c2.beginPath(); c2.moveTo(L[i - 1][0], L[i - 1][1]); c2.lineTo(L[i][0], L[i][1]); c2.lineTo(R[i][0], R[i][1]); c2.lineTo(R[i - 1][0], R[i - 1][1]); c2.closePath(); c2.fill();
    }
  }
  // colonne vertébrale
  c2.strokeStyle = xr ? `hsla(${hue},80%,85%,.95)` : `hsla(${hue},40%,88%,.45)`; c2.lineWidth = xr ? 2 : 1.2;
  c2.beginPath(); c2.moveTo(P[0][0], P[0][1]); for (let k = 1; k <= n; k++) c2.lineTo(P[k][0], P[k][1]); c2.stroke();
  c2.fillStyle = xr ? '#fff' : `hsla(${hue},30%,95%,.9)`;
  for (let k = 1; k < n; k++) { c2.beginPath(); c2.arc(P[k][0], P[k][1], xr ? 2.8 : 1.9, 0, 7); c2.fill(); }
  if (xr) { // crâne + nerfs
    c2.strokeStyle = 'rgba(255,255,255,.8)'; c2.lineWidth = 1.5; c2.beginPath(); c2.arc(P[0][0], P[0][1], HW[0] * 0.7, 0, 7); c2.stroke();
    c2.strokeStyle = 'rgba(120,220,255,.5)'; c2.lineWidth = 0.8;
    for (let k = 1; k < n; k++) { const nx = -Math.sin(A[k]), ny = Math.cos(A[k]); c2.beginPath(); c2.moveTo(P[k][0] + nx * HW[k] * 0.9, P[k][1] + ny * HW[k] * 0.9); c2.lineTo(P[k][0] - nx * HW[k] * 0.9, P[k][1] - ny * HW[k] * 0.9); c2.stroke(); }
  }
  // yeux
  const ha = D[0], hw = HW[0], fx = Math.cos(ha), fy = Math.sin(ha), nx = -fy, ny = fx, er = Math.max(1.6, hw * 0.4);
  for (const sg of [1, -1]) {
    const ex = P[0][0] + fx * hw * 0.35 + nx * hw * 0.5 * sg, ey = P[0][1] + fy * hw * 0.35 + ny * hw * 0.5 * sg;
    c2.fillStyle = '#fff'; c2.beginPath(); c2.arc(ex, ey, er, 0, 7); c2.fill();
    c2.fillStyle = '#111'; c2.beginPath(); c2.arc(ex + fx * er * 0.35, ey + fy * er * 0.35, er * 0.5, 0, 7); c2.fill();
  }
  if (o.diet === 'carnivore' || o.diet === 'omnivore') { // mâchoires
    const jl = hw * 0.9 + 3, open = 0.35 + 0.15 * Math.sin(sim.t * 0.3);
    c2.fillStyle = o.diet === 'carnivore' ? '#f2f2f2' : '#e8d9b0'; c2.strokeStyle = '#7a1f1f'; c2.lineWidth = 0.8;
    for (const sg of [1, -1]) {
      const bx2 = P[0][0] + fx * hw * 0.6 + nx * hw * 0.3 * sg, by2 = P[0][1] + fy * hw * 0.6 + ny * hw * 0.3 * sg, a2 = ha + open * sg;
      c2.beginPath(); c2.moveTo(bx2, by2); c2.lineTo(bx2 + Math.cos(a2) * jl, by2 + Math.sin(a2) * jl); c2.lineTo(bx2 + Math.cos(a2 - 0.5 * sg) * jl * 0.45 - nx * sg * 1.5, by2 + Math.sin(a2 - 0.5 * sg) * jl * 0.45 - ny * sg * 1.5); c2.closePath(); c2.fill(); c2.stroke();
    }
  }
  if (o.star) { c2.fillStyle = '#ffd34d'; c2.font = `${Math.max(8, hw * 1.4)}px serif`; c2.textAlign = 'center'; c2.fillText('⭐', P[0][0], P[0][1] - hw * 1.8 - 4); }
  // forces de l'eau
  if (o.forces) {
    c2.lineWidth = 1.4 / z; c2.strokeStyle = '#7ff7ff'; c2.fillStyle = '#7ff7ff';
    for (let i = 0; i < n; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2, my = (P[i][1] + P[i + 1][1]) / 2, fm = Math.hypot(sim.fx[i], sim.fy[i]);
      const len = Math.min(35, fm / sim.arN[i] * 30); if (len < 1.5) continue;
      const ex = mx + sim.fx[i] / fm * len, ey = my + sim.fy[i] / fm * len;
      c2.beginPath(); c2.moveTo(mx, my); c2.lineTo(ex, ey); c2.stroke();
      const an = Math.atan2(ey - my, ex - mx), hs = Math.min(5, len * 0.4);
      c2.beginPath(); c2.moveTo(ex, ey); c2.lineTo(ex - Math.cos(an - 0.5) * hs, ey - Math.sin(an - 0.5) * hs); c2.lineTo(ex - Math.cos(an + 0.5) * hs, ey - Math.sin(an + 0.5) * hs); c2.fill();
    }
  }
  c2.restore();
}

function drawShrimp(c2, f, z, t) {
  const bob = Math.sin(t / 400 + f.ph) * 2;
  if (z < 0.35) { c2.fillStyle = 'rgba(255,150,100,.85)'; c2.beginPath(); c2.arc(f.x, f.y, Math.max(3, 1.6 / z), 0, 7); c2.fill(); return; }
  c2.save(); c2.translate(f.x, f.y + bob); c2.rotate(Math.sin(t / 700 + f.ph) * 0.3);
  c2.fillStyle = 'rgba(255,120,80,.18)'; c2.beginPath(); c2.arc(0, 0, 11, 0, 7); c2.fill();
  c2.strokeStyle = '#ff8a5c'; c2.lineWidth = 3.2; c2.lineCap = 'round';
  c2.beginPath(); c2.arc(0, 0, 5, Math.PI * 0.1, Math.PI * 1.25); c2.stroke();
  c2.lineWidth = 0.7; c2.strokeStyle = '#ffc2a8';
  c2.beginPath(); c2.moveTo(4.5, 1.5); c2.quadraticCurveTo(10, -3, 13, 2); c2.stroke();
  c2.fillStyle = '#ff8a5c'; c2.beginPath(); c2.moveTo(-3.6, -3.6); c2.lineTo(-7.5, -5); c2.lineTo(-6, -1.5); c2.fill();
  c2.restore();
}

function renderArenaBg(w, t, z) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#050a14'; ctx.fillRect(0, 0, CW, CH);
  ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (CW / 2 - w.cam.x * z), DPR * (CH / 2 - w.cam.y * z));
  const g = ctx.createRadialGradient(w.W / 2, w.H / 2, 100, w.W / 2, w.H / 2, w.W * 0.7);
  g.addColorStop(0, '#12476e'); g.addColorStop(1, '#071d36'); ctx.fillStyle = g; ctx.fillRect(0, 0, w.W, w.H);
  ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1 / z;
  for (let x = 0; x <= w.W; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, w.H); ctx.stroke(); }
  for (let y = 0; y <= w.H; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w.W, y); ctx.stroke(); }
  const A = w.duel;
  if (A) {
    ctx.fillStyle = `hsla(${A.sides[0].hue},70%,50%,.08)`; ctx.fillRect(0, 0, 260, w.H);
    ctx.fillStyle = `hsla(${A.sides[1].hue},70%,50%,.08)`; ctx.fillRect(w.W - 260, 0, 260, w.H);
    if (A.mode === 'sprint') { for (let y = 0; y < w.H; y += 40) { ctx.fillStyle = (y / 40) % 2 ? '#fff' : '#111'; ctx.fillRect(w.W - 156, y, 12, 40); } }
  }
  ctx.strokeStyle = 'rgba(140,210,255,.6)'; ctx.lineWidth = 6; ctx.strokeRect(0, 0, w.W, w.H);
}
function renderOcean(t) {
  const z = App.cam.z, cam = App.cam, W0 = App.world;
  const sy = y => (y - cam.y) * z + CH / 2, sx = x => (x - cam.x) * z + CW / 2;
  let x0, y0, x1, y1, vis;
  [x0, y0] = toWorld(0, 0); [x1, y1] = toWorld(CW, CH); vis = (x, y, m = 200) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
  if (W0.kind === 'arena') renderArenaBg(W0, t, z);
  else {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // fond selon la profondeur
  const g = ctx.createLinearGradient(0, sy(0), 0, sy(App.world.H));
  g.addColorStop(0, '#2b8fc2'); g.addColorStop(0.25, '#145583'); g.addColorStop(0.55, '#0a2e55'); g.addColorStop(1, '#030b1b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
  if (sy(0) > 0) { const s = ctx.createLinearGradient(0, 0, 0, sy(0)); s.addColorStop(0, '#9fd2f0'); s.addColorStop(1, '#cfeaf7'); ctx.fillStyle = s; ctx.fillRect(0, 0, CW, sy(0)); }
  // rayons de lumière (plus visibles près de la surface)
  const [, topW] = toWorld(0, 0); const light = clamp(1 - topW / 2600, 0, 1);
  if (light > 0.02) for (let i = 0; i < 6; i++) {
    const x = ((i * 260 - cam.x * z * 0.3) % (CW + 300) + CW + 300) % (CW + 300) - 150 + Math.sin(t / 2500 + i) * 30;
    ctx.fillStyle = `rgba(190,235,255,${(0.03 + 0.02 * Math.sin(t / 900 + i * 2)) * light})`;
    ctx.beginPath(); ctx.moveTo(x - 30, Math.max(0, sy(0))); ctx.lineTo(x + 30, Math.max(0, sy(0))); ctx.lineTo(x + 160, CH); ctx.lineTo(x + 40, CH); ctx.fill();
  }
  // monde
  ctx.setTransform(DPR * z, 0, 0, DPR * z, DPR * (CW / 2 - cam.x * z), DPR * (CH / 2 - cam.y * z));
  // surface
  if (y0 < 30) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2 / z; ctx.beginPath(); for (let x = Math.max(0, x0 - 20); x <= Math.min(App.world.W, x1 + 20); x += 20 / Math.max(z, 0.2)) { const y = Math.sin(x / 60 + t / 600) * 4; x === Math.max(0, x0 - 20) ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
  // plancton (décor)
  if (z > 0.18) {
    const C = 220, i0 = Math.floor(x0 / C), i1 = Math.floor(x1 / C), j0 = Math.floor(y0 / C), j1 = Math.floor(y1 / C);
    ctx.fillStyle = 'rgba(200,235,255,.28)';
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (let k = 0; k < 4; k++) {
      const px = (i + hash(i * 7 + k, j)) * C + Math.sin(t / 1600 + k + i) * 8, py = (j + hash(i, j * 5 + k)) * C + Math.cos(t / 1900 + k + j) * 6;
      ctx.fillRect(px, py, 1.6 / z, 1.6 / z);
    }
  }
  // méduses (décor)
  for (const j of jelly) {
    const jx = j.x + Math.sin(t / 5000 + j.ph) * 80, jy = j.y + Math.sin(t / 1500 + j.ph) * 40; if (!vis(jx, jy)) continue;
    const pulse = 1 + Math.sin(t / 400 + j.ph) * 0.12;
    ctx.fillStyle = `hsla(${j.hue},80%,75%,.25)`; ctx.beginPath(); ctx.ellipse(jx, jy, j.s * pulse, j.s * 0.7 / pulse, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = `hsla(${j.hue},80%,80%,.25)`; ctx.lineWidth = 1.2;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(jx + k * j.s * 0.3, jy); ctx.quadraticCurveTo(jx + k * j.s * 0.3 + Math.sin(t / 500 + k) * 6, jy + j.s, jx + k * j.s * 0.3, jy + j.s * 2); ctx.stroke(); }
  }
  // fond marin
  const fx0 = Math.max(0, x0 - 50), fx1 = Math.min(App.world.W, x1 + 50), stp = Math.max(15, 8 / z);
  if (y1 > App.world.H - 420) {
    for (const r of rocks) { if (!vis(r.x, App.world.floor(r.x), 150)) continue; ctx.fillStyle = `hsl(215,12%,${r.l}%)`; ctx.beginPath(); ctx.ellipse(r.x, App.world.floor(r.x) + r.ry * 0.3, r.rx, r.ry, 0, Math.PI, 0); ctx.fill(); }
    for (const w of seaweed) { const by = App.world.floor(w.x); if (!vis(w.x, by, 200)) continue;
      ctx.strokeStyle = `hsla(${w.hue},55%,32%,.95)`; ctx.lineWidth = w.w; ctx.lineCap = 'round';
      const sway = Math.sin(t / 1300 + w.ph) * 20; ctx.beginPath(); ctx.moveTo(w.x, by); ctx.quadraticCurveTo(w.x - sway, by - w.h / 2, w.x + sway, by - w.h); ctx.stroke(); }
    for (const c of corals) { const by = App.world.floor(c.x); if (!vis(c.x, by, 100)) continue;
      ctx.strokeStyle = `hsl(${c.hue},70%,55%)`; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
      for (let b = 0; b < c.br; b++) { const a = -Math.PI / 2 + (b - (c.br - 1) / 2) * 0.45; const ex = c.x + Math.cos(a) * c.s, ey = by + Math.sin(a) * c.s;
        ctx.beginPath(); ctx.moveTo(c.x, by); ctx.lineTo(ex, ey); ctx.stroke(); ctx.fillStyle = `hsl(${c.hue},80%,70%)`; ctx.beginPath(); ctx.arc(ex, ey, 3, 0, 7); ctx.fill(); } }
    ctx.fillStyle = '#3b3526'; ctx.beginPath(); ctx.moveTo(fx0, App.world.H + 400);
    for (let x = fx0; x <= fx1; x += stp) ctx.lineTo(x, App.world.floor(x)); ctx.lineTo(fx1, App.world.H + 400); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(fx0, App.world.H - 60, fx1 - fx0, 500);
  }
  }
  // nourriture
  for (const f of App.food) if (f.alive && vis(f.x, f.y, 30)) drawShrimp(ctx, f, z, t);
  // traînées
  for (const c of App.creatures) {
    if (!(App.ov.trails || c === App.selCr) || c.trail.length < 4) continue;
    ctx.strokeStyle = `hsla(${c.sim.g.hue},80%,70%,.35)`; ctx.lineWidth = 1.5 / z; ctx.beginPath(); ctx.moveTo(c.trail[0], c.trail[1]);
    for (let i = 2; i < c.trail.length; i += 2) ctx.lineTo(c.trail[i], c.trail[i + 1]); ctx.lineTo(c.sim.x, c.sim.y); ctx.stroke();
  }
  // créatures
  for (const c of App.creatures) {
    const s = c.sim; if (!vis(s.x, s.y, s.n * s.L + 40)) continue;
    const lod = s.n * s.L * z < 14;
    if (App.ov.vision && c.target && !lod) {
      const T = c.target.sim || c.target; ctx.strokeStyle = c.target.fake ? 'rgba(255,255,255,.18)' : c.target.sim ? 'rgba(255,80,80,.7)' : 'rgba(255,200,120,.45)';
      ctx.lineWidth = 1 / z; ctx.setLineDash([5 / z, 5 / z]); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(T.x, T.y); ctx.stroke(); ctx.setLineDash([]);
      if (c.danger && c.danger.alive) { ctx.strokeStyle = 'rgba(190,120,255,.6)'; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(c.danger.sim.x, c.danger.sim.y); ctx.stroke(); }
    }
    drawCreature(ctx, s, { z, lod, glow: c === App.selCr, muscles: App.ov.muscles, xray: App.ov.xray, forces: App.ov.forces, pattern: c.sp.cfg.pattern, diet: c.sp.cfg.diet, star: c.immortal || c.specId, alpha: Math.min(1, (performance.now() - c.born) / 600) });
  }
  // sélection
  const sc = App.selCr;
  if (sc && sc.sim) {
    const s = sc.sim, r = s.n * s.L * 0.6 + 20;
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5 / z; ctx.setLineDash([6 / z, 4 / z]);
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  // particules
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.95; p.vy *= 0.95; p.life -= 0.025;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(${p.color},${p.life})`; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill();
  }
  // étiquettes
  if (App.ov.labels && z > 0.32) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    for (const c of App.creatures) { const s = c.sim, X = sx(s.x), Y = sy(s.y) - (s.n * s.L * 0.5 + 16) * z; if (X < -50 || X > CW + 50 || Y < -20 || Y > CH + 20) continue;
      ctx.fillStyle = 'rgba(0,0,0,.35)'; const txt = (c.name ? '⭐ ' + c.name : c.sp.cfg.name) + (c.ogen ? ' · g' + c.ogen : '') + (c.kills ? ' · ☠' + c.kills : ''); const w = ctx.measureText(txt).width + 10;
      ctx.fillRect(X - w / 2, Y - 11, w, 15); ctx.fillStyle = '#dfe9f5'; ctx.fillText(txt, X, Y); }
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function renderMinimap() {
  mm.style.display = App.view === 'arena' ? 'none' : '';
  if (App.view === 'arena') return;
  const W = mm.width, H = mm.height, kx = W / App.world.W, ky = H / App.world.H;
  const g = mctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d6a96'); g.addColorStop(1, '#04112a');
  mctx.fillStyle = g; mctx.fillRect(0, 0, W, H);
  mctx.fillStyle = '#3b3526'; mctx.beginPath(); mctx.moveTo(0, H); for (let x = 0; x <= App.world.W; x += 150) mctx.lineTo(x * kx, App.world.floor(x) * ky); mctx.lineTo(W, H); mctx.fill();
  mctx.fillStyle = 'rgba(255,150,100,.5)'; for (let i = 0; i < App.food.length; i += 2) { const f = App.food[i]; mctx.fillRect(f.x * kx, f.y * ky, 1, 1); }
  for (const c of App.creatures) { mctx.fillStyle = `hsl(${c.sim.g.hue},80%,62%)`; mctx.fillRect(c.sim.x * kx - 1, c.sim.y * ky - 1, 2.5, 2.5); }
  const [x0, y0] = toWorld(0, 0), [x1, y1] = toWorld(CW, CH);
  mctx.strokeStyle = '#fff'; mctx.lineWidth = 1; mctx.strokeRect(x0 * kx, y0 * ky, (x1 - x0) * kx, (y1 - y0) * ky);
}
