// =====================================================================
//  NOYAU PARTAGÉ (thread principal + worker du labo)
// =====================================================================
const NIN = 13;
const SENSOR_DEFS = [
  { k: 'rhythm', name: 'Rythme interne (oscillateur, comme la moelle épinière)', idx: [0, 1] },
  { k: 'target', name: 'Direction de la cible (vision)', idx: [2, 3] },
  { k: 'dist', name: 'Distance de la cible', idx: [4] },
  { k: 'speed', name: 'Vitesse propre (ligne latérale)', idx: [5] },
  { k: 'spin', name: 'Équilibre (rotation)', idx: [6] },
  { k: 'energy', name: 'Faim (niveau d\'énergie)', idx: [7] },
  { k: 'proprio', name: 'Proprioception (sens de la forme du corps)', idx: [8, 9] },
  { k: 'danger', name: 'Détection des prédateurs (peur)', idx: [10, 11] },
];
const INPUT_LABELS = ['Rythme sin', 'Rythme cos', 'Cible devant', 'Cible côté', 'Distance', 'Vitesse', 'Rotation', 'Énergie', 'Courbure tête', 'Courbure queue', 'Danger devant', 'Danger côté', 'Biais'];
const GOALS = {
  hunt: '🦐 Chasser les crevettes',
  speed: '⚡ Nager le plus vite possible',
  left: '⬅ Nager vers la gauche',
  right: '➡ Nager vers la droite',
  up: '⬆ Monter vers la surface',
  down: '⬇ Plonger vers le fond',
  spin: '🌀 Tourner sur soi-même',
  predator: '🦈 Attraper une proie qui fuit',
  survive: '🐡 Manger sans se faire manger',
};
const DIETS = { herbivore: '🦐 Mange des crevettes', carnivore: '🦈 Prédateur (mange les autres espèces)', omnivore: '🍽 Omnivore (crevettes + autres espèces)' };
const GOAL_DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const ACT_NAMES = { tanh: 'Tangente hyperbolique (douce)', relu: 'ReLU (seuil, comme un neurone qui « tire »)', sin: 'Sinus (neurones oscillants)', sigmoid: 'Sigmoïde (centrée)' };
const CN = 0.35, CT = 0.025;

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
const arr = (n, f) => Array.from({ length: n }, f);
const newId = () => Math.floor(Math.random() * 2147483647);

function defaultCfg() {
  return {
    name: 'Nageur primitif', hue: 185, pattern: 'stripes', diet: 'herbivore',
    body: { segMin: 2, segMax: 16, segStart: 3, lenMin: 6, lenMax: 14, widthMin: 6, widthMax: 16, taperMin: 0.7, taperMax: 1, finMax: 3, pectMax: 2, strMax: 0.25, flexMax: 0.9, freqMax: 0.2 },
    brain: { layers: [12], act: 'tanh', recurrent: false, neurogenesis: true,
      sensors: { rhythm: true, target: true, dist: true, speed: false, spin: false, energy: false, proprio: false, danger: false } },
    evo: { pop: 200, mutRate: 0.08, mutPower: 0.4, elite: 0.05, crossover: true, trials: 2, vertMut: 0.05 },
    goal: { type: 'hunt', energyCost: 1, dur: 500 },
    env: { viscosity: 1 },
  };
}

// ---------------- Cerveau ----------------
function brainSizes(cfg) { return [NIN, ...cfg.brain.layers, cfg.body.segMax - 1]; }
function makeBrain(cfg) {
  const s = brainSizes(cfg), W = [];
  for (let l = 0; l < s.length - 1; l++) W.push(arr((s[l] + 1) * s[l + 1], () => gauss() * 2.2 / Math.sqrt(s[l] + 1)));
  const R = cfg.brain.recurrent ? arr(s[1] * s[1], () => gauss() * 0.25) : null;
  const active = cfg.brain.layers.map(h => cfg.brain.neurogenesis ? Math.max(2, Math.ceil(h / 2)) : h);
  return { W, R, active, sizes: s };
}
function copyW(src, sIn, sOut, dst, dIn, dOut) {
  for (let o = 0; o < Math.min(sOut, dOut); o++) {
    for (let i = 0; i < Math.min(sIn, dIn); i++) dst[o * (dIn + 1) + i] = src[o * (sIn + 1) + i];
    dst[o * (dIn + 1) + dIn] = src[o * (sIn + 1) + sIn];
  }
}
function fitBrain(b, cfg) {
  const s = brainSizes(cfg), L = cfg.brain.layers;
  const same = b && b.sizes.length === s.length && b.sizes.every((v, i) => v === s[i]) && (!!b.R === !!cfg.brain.recurrent);
  if (!same) {
    const nb = makeBrain(cfg);
    if (b) {
      const oh = b.W.length - 1, nh = nb.W.length - 1;
      if (b.sizes[0] !== s[0] && oh > 0) { // anciennes versions : nouvelles entrées insérées avant le biais
        const sIn = b.sizes[0], dIn = s[0], src = b.W[0], dst = nb.W[0];
        for (let o = 0; o < Math.min(b.sizes[1], s[1]); o++) {
          for (let i = 0; i < Math.min(sIn - 1, dIn - 1); i++) dst[o * (dIn + 1) + i] = src[o * (sIn + 1) + i];
          for (let i = sIn - 1; i < dIn - 1; i++) dst[o * (dIn + 1) + i] = 0;
          dst[o * (dIn + 1) + dIn - 1] = src[o * (sIn + 1) + sIn - 1]; dst[o * (dIn + 1) + dIn] = src[o * (sIn + 1) + sIn];
        }
      } else if (oh > 0) copyW(b.W[0], b.sizes[0], b.sizes[1], nb.W[0], s[0], s[1]);
      for (let l = 1; l < Math.min(oh, nh); l++) copyW(b.W[l], b.sizes[l], b.sizes[l + 1], nb.W[l], s[l], s[l + 1]);
      copyW(b.W[oh], b.sizes[oh], b.sizes[oh + 1], nb.W[nh], s[nh], s[nh + 1]);
      if (b.R && nb.R) { const oH = b.sizes[1], nH = s[1]; for (let o = 0; o < Math.min(oH, nH); o++) for (let r = 0; r < Math.min(oH, nH); r++) nb.R[o * nH + r] = b.R[o * oH + r]; }
      for (let l = 0; l < Math.min(b.active.length, nb.active.length); l++) nb.active[l] = b.active[l];
    }
    b = nb;
  }
  b.active = L.map((h, l) => cfg.brain.neurogenesis ? clamp(b.active[l] || 2, 1, h) : h);
  return b;
}
function synapseCount(cfg) {
  const s = brainSizes(cfg); let n = 0;
  for (let l = 0; l < s.length - 1; l++) n += (s[l] + 1) * s[l + 1];
  if (cfg.brain.recurrent) n += s[1] * s[1];
  return n;
}

// ---------------- Génome ----------------
const MORPH = [['segLen', 'lenMin', 'lenMax'], ['headW', 'widthMin', 'widthMax'], ['taper', 'taperMin', 'taperMax'], ['fin', null, 'finMax'], ['pect', null, 'pectMax'], ['flex', null, 'flexMax'], ['str', null, 'strMax'], ['freq', null, 'freqMax']];
function randGenome(cfg) {
  const b = cfg.body;
  return clampGenome({
    id: newId(), nSeg: b.segStart, segLen: rnd(b.lenMin, b.lenMax), headW: rnd(b.widthMin, b.widthMax), taper: rnd(b.taperMin, b.taperMax),
    fin: rnd(0, b.finMax * 0.5), pect: rnd(0, b.pectMax * 0.3), flex: rnd(0.3, 1) * b.flexMax, str: rnd(0.4, 1) * b.strMax,
    freq: rnd(0.3, 1) * b.freqMax, hue: cfg.hue + rnd(-12, 12), brain: makeBrain(cfg),
  }, cfg);
}
function clampGenome(g, cfg) {
  const b = cfg.body;
  g.nSeg = clamp(Math.round(g.nSeg), b.segMin, b.segMax);
  g.segLen = clamp(g.segLen, b.lenMin, b.lenMax);
  g.headW = clamp(g.headW, b.widthMin, b.widthMax);
  g.taper = clamp(g.taper, b.taperMin, b.taperMax);
  g.fin = clamp(g.fin, 0, b.finMax); g.pect = clamp(g.pect, 0, b.pectMax);
  g.flex = clamp(g.flex, 0.05, b.flexMax); g.str = clamp(g.str, 0.02, b.strMax); g.freq = clamp(g.freq, 0.01, b.freqMax);
  g.brain = fitBrain(g.brain, cfg);
  return g;
}
function cloneG(g) {
  return { ...g, id: newId(), brain: { W: g.brain.W.map(w => w.slice()), R: g.brain.R ? g.brain.R.slice() : null, active: g.brain.active.slice(), sizes: g.brain.sizes.slice() } };
}
function crossoverG(a, b) {
  const c = cloneG(a);
  for (const [k] of MORPH) if (Math.random() < 0.5) c[k] = b[k];
  if (Math.random() < 0.5) c.nSeg = b.nSeg;
  if (a.brain.sizes.join() === b.brain.sizes.join()) {
    // on échange des neurones entiers (avec toutes leurs connexions) : plus réaliste et plus efficace
    c.brain.W.forEach((w, l) => {
      const inN = c.brain.sizes[l] + 1, outN = c.brain.sizes[l + 1];
      for (let o = 0; o < outN; o++) if (Math.random() < 0.5) for (let i = 0; i < inN; i++) w[o * inN + i] = b.brain.W[l][o * inN + i];
    });
    if (c.brain.R && b.brain.R) for (let i = 0; i < c.brain.R.length; i++) if (Math.random() < 0.5) c.brain.R[i] = b.brain.R[i];
  }
  c.hue = (a.hue + b.hue) / 2;
  return c;
}
function mutateG(g, cfg) {
  const e = cfg.evo, b = cfg.body, mr = e.mutRate, mp = e.mutPower;
  const mw = (w) => { for (let i = 0; i < w.length; i++) { const r = Math.random(); if (r < mr) w[i] += gauss() * mp; else if (r < mr * 1.05) w[i] = gauss(); } };
  g.brain.W.forEach(mw); if (g.brain.R) mw(g.brain.R);
  for (const [k, lo, hi] of MORPH) if (Math.random() < 0.15) g[k] += gauss() * (b[hi] - (lo ? b[lo] : 0)) * 0.07;
  if (Math.random() < e.vertMut) g.nSeg++; else if (Math.random() < e.vertMut * 0.7) g.nSeg--;
  if (cfg.brain.neurogenesis) g.brain.active = g.brain.active.map(a => Math.random() < 0.04 ? a + (Math.random() < 0.55 ? 1 : -1) : a);
  g.hue += gauss() * 2;
  return clampGenome(g, cfg);
}

// ---------------- Corps & physique ----------------
const ACTF = {
  tanh: Math.tanh,
  relu: x => (x > 0 ? x : 0.05 * x),
  sin: Math.sin,
  sigmoid: x => 2 / (1 + Math.exp(-x)) - 1,
};

class Sim {
  constructor(g, cfg, x, y, th, visc) {
    this.g = g; this.cfg = cfg; this.visc = visc ?? cfg.env.viscosity;
    const n = this.n = g.nSeg; this.L = g.segLen;
    this.a = new Float64Array(n); this.effort = new Float64Array(n);
    this.w = new Float64Array(n); this.m = new Float64Array(n); this.ar = new Float64Array(n); this.arN = new Float64Array(n);
    let M = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.max(2.5, g.headW * Math.pow(g.taper, i));
      this.w[i] = w; this.ar[i] = this.L * w; this.arN[i] = this.ar[i];
      if (i === n - 1) this.arN[i] += g.fin * w * this.L * 0.8;
      if (i === 0 && n > 1) this.arN[i] += g.pect * w * this.L * 0.6;
      this.m[i] = this.arN[i]; M += this.m[i];
    }
    this.M = M;
    this.qx = new Float64Array(n); this.qy = new Float64Array(n); this.dir = new Float64Array(n);
    this.nqx = new Float64Array(n); this.nqy = new Float64Array(n); this.ndir = new Float64Array(n);
    this.fx = new Float64Array(n); this.fy = new Float64Array(n);
    const s = g.brain.sizes;
    this.inp = new Float64Array(NIN); this.out = new Float64Array(n);
    this.acts = cfg.brain.layers.map((h, l) => new Float64Array(s[l + 1]));
    this.prev = g.brain.R ? new Float64Array(s[1]) : null;
    this.actf = ACTF[cfg.brain.act] || Math.tanh;
    this.sens = cfg.brain.sensors;
    this.x = x; this.y = y; this.th = th; this.th0 = th;
    this.vx = 0; this.vy = 0; this.om = 0; this.t = 0; this.energy = 0; this.rot = 0; this.power = 0;
    this.manual = null;
    this.local(this.qx, this.qy, this.dir);
  }

  local(qx, qy, dir) {
    const n = this.n, L = this.L, m = this.m, a = this.a;
    let x = 0, y = 0, phi = 0, cx = 0, cy = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) phi += a[i];
      const nx = x - L * Math.cos(phi), ny = y - L * Math.sin(phi);
      qx[i] = (x + nx) / 2; qy[i] = (y + ny) / 2; dir[i] = phi;
      cx += qx[i] * m[i]; cy += qy[i] * m[i];
      x = nx; y = ny;
    }
    cx /= this.M; cy /= this.M;
    for (let i = 0; i < n; i++) { qx[i] -= cx; qy[i] -= cy; }
    this.cx = cx; this.cy = cy;
  }

  think(tx, ty, energyLevel, ux, uy) {
    const g = this.g, inp = this.inp, sens = this.sens, b = g.brain, s = b.sizes, f = this.actf;
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy) + 1e-6;
    const c = Math.cos(this.th), sn = Math.sin(this.th), ph = this.t * g.freq;
    inp[0] = sens.rhythm ? Math.sin(ph) : 0; inp[1] = sens.rhythm ? Math.cos(ph) : 0;
    inp[2] = sens.target ? (dx * c + dy * sn) / d : 0; inp[3] = sens.target ? (-dx * sn + dy * c) / d : 0;
    inp[4] = sens.dist ? Math.min(1, d / 400) : 0;
    inp[5] = sens.speed ? (this.vx * c + this.vy * sn) / 3 : 0;
    inp[6] = sens.spin ? clamp(this.om * 10, -1, 1) : 0;
    inp[7] = sens.energy ? energyLevel : 0;
    if (sens.proprio && this.n > 1) {
      inp[8] = this.a[1] / g.flex;
      let t = 0; for (let j = Math.max(1, this.n - 3); j < this.n; j++) t += this.a[j];
      inp[9] = t / (Math.min(3, this.n - 1) * g.flex);
    } else { inp[8] = 0; inp[9] = 0; }
    if (sens.danger && ux !== undefined && ux === ux) {
      const ex = ux - this.x, ey = uy - this.y, de = Math.hypot(ex, ey) + 1e-6, k = clamp(1 - de / 500, 0, 1) / de;
      inp[10] = (ex * c + ey * sn) * k; inp[11] = (-ex * sn + ey * c) * k;
    } else { inp[10] = 0; inp[11] = 0; }
    inp[12] = 1;
    let src = inp, srcN = NIN;
    const nl = this.acts.length;
    for (let l = 0; l < nl; l++) {
      const W = b.W[l], inMax = s[l], dst = this.acts[l], act = b.active[l], stride = inMax + 1;
      for (let o = 0; o < act; o++) {
        const base = o * stride; let sum = W[base + inMax];
        for (let i = 0; i < srcN; i++) sum += W[base + i] * src[i];
        if (l === 0 && this.prev) { const R = b.R, H = s[1]; for (let r = 0; r < act; r++) sum += R[o * H + r] * this.prev[r]; }
        dst[o] = f(sum);
      }
      for (let o = act; o < dst.length; o++) dst[o] = 0;
      src = dst; srcN = act;
    }
    if (this.prev) this.prev.set(this.acts[0]);
    const W = b.W[nl], inMax = s[nl], stride = inMax + 1;
    for (let j = 1; j < this.n; j++) {
      const base = (j - 1) * stride; let sum = W[base + inMax];
      for (let i = 0; i < srcN; i++) sum += W[base + i] * src[i];
      this.out[j] = Math.tanh(sum);
    }
  }

  headPos() { const c = Math.cos(this.th), s = Math.sin(this.th); return [this.x - c * this.cx + s * this.cy, this.y - s * this.cx - c * this.cy]; }
  step(tx, ty, dt, energyLevel, ux, uy) {
    const g = this.g, n = this.n, a = this.a;
    if (this.manual) { for (let j = 1; j < n; j++) this.out[j] = this.manual(j, this.t); }
    else this.think(tx, ty, energyLevel ?? 1, ux, uy);
    const k = Math.min(1, g.str * 2 * dt);
    let pw = 0;
    for (let j = 1; j < n; j++) {
      const delta = (g.flex * this.out[j] - a[j]) * k;
      a[j] += delta;
      const e = Math.abs(delta) * this.w[j];
      this.effort[j] = Math.abs(delta) / dt / (g.flex * g.str * 2 + 1e-6);
      pw += e;
    }
    this.energy += pw; this.power = pw / dt;
    const oqx = this.qx, oqy = this.qy, nqx = this.nqx, nqy = this.nqy, ndir = this.ndir, m = this.m;
    this.local(nqx, nqy, ndir);
    let S = 0, C = 0;
    for (let i = 0; i < n; i++) { S += m[i] * (oqx[i] * nqy[i] - oqy[i] * nqx[i]); C += m[i] * (oqx[i] * nqx[i] + oqy[i] * nqy[i]); }
    const thOld = this.th;
    this.th -= Math.atan2(S, C);
    const c0 = Math.cos(thOld), s0 = Math.sin(thOld), c1 = Math.cos(this.th), s1 = Math.sin(this.th);
    const cn = CN * this.visc, ct = CT * this.visc, idt = 1 / dt;
    let Fx = 0, Fy = 0, Tq = 0, I = 0;
    for (let i = 0; i < n; i++) {
      const wox = c0 * oqx[i] - s0 * oqy[i], woy = s0 * oqx[i] + c0 * oqy[i];
      const wnx = c1 * nqx[i] - s1 * nqy[i], wny = s1 * nqx[i] + c1 * nqy[i];
      const vx = this.vx - this.om * wny + (wnx - wox) * idt, vy = this.vy + this.om * wnx + (wny - woy) * idt;
      const psi = this.th + ndir[i], tc = Math.cos(psi), ts = Math.sin(psi);
      const vt = vx * tc + vy * ts, vn = -vx * ts + vy * tc;
      const ft = -ct * vt * this.ar[i], fn = -cn * vn * this.arN[i];
      const fx = ft * tc - fn * ts, fy = ft * ts + fn * tc;
      this.fx[i] = fx; this.fy[i] = fy;
      Fx += fx; Fy += fy; Tq += wnx * fy - wny * fx; I += m[i] * (wnx * wnx + wny * wny);
    }
    this.vx = clamp(this.vx + Fx / this.M * dt, -5, 5);
    this.vy = clamp(this.vy + Fy / this.M * dt, -5, 5);
    this.om = clamp(this.om + Tq / (I + this.M * 4) * dt, -0.3, 0.3);
    this.x += this.vx * dt; this.y += this.vy * dt; this.th += this.om * dt;
    this.rot += Math.abs(this.th - thOld);
    const od = this.dir;
    this.qx = nqx; this.qy = nqy; this.dir = ndir; this.nqx = oqx; this.nqy = oqy; this.ndir = od;
    this.t += dt;
  }
}

// ---------------- Tests du labo ----------------
function makeScenarios(cfg) {
  return arr(cfg.evo.trials, () => ({ th: rnd(0, 2 * Math.PI), offs: arr(10, () => { const a = rnd(0, 2 * Math.PI), d = rnd(150, 250); return [Math.cos(a) * d, Math.sin(a) * d]; }) }));
}
function goalTarget(goal, sim, tx, ty) {
  if (goal === 'hunt') return [tx, ty];
  const d = GOAL_DIRS[goal];
  if (d) return [sim.x + d[0] * 1e4, sim.y + d[1] * 1e4];
  return [sim.x + Math.cos(sim.th0) * 1e4, sim.y + Math.sin(sim.th0) * 1e4];
}
// Un essai : la copie nage seule face à son objectif (cible fixe, proie qui fuit ou prédateur qui la traque)
class Trial {
  constructor(g, cfg, sc) {
    this.sim = new Sim(g, cfg, 0, 0, sc.th); this.cfg = cfg; this.goal = cfg.goal.type; this.sc = sc;
    this.k = 0; this.eaten = 0; this.t = 0; this.done = false; this.caught = false;
    const o = sc.offs[0]; this.tx = o[0]; this.ty = o[1]; this.d0 = Math.hypot(o[0], o[1]); this.dmin = this.d0;
    if (this.goal === 'survive') { this.ex = -o[0] * 1.5; this.ey = -o[1] * 1.5; }
  }
  next() { this.k++; const o = this.sc.offs[this.k % this.sc.offs.length]; this.tx = this.sim.x + o[0]; this.ty = this.sim.y + o[1]; this.d0 = Math.hypot(o[0], o[1]); this.dmin = this.d0; }
  step(dt) {
    if (this.done) return;
    const s = this.sim, goal = this.goal;
    if (goal === 'hunt' || goal === 'survive' || goal === 'predator') {
      if (goal === 'predator') { // la proie fuit en zigzag
        const a = Math.atan2(this.ty - s.y, this.tx - s.x) + Math.sin(this.t * 0.05 + this.k) * 0.9;
        const d = Math.hypot(this.tx - s.x, this.ty - s.y), v = d < 140 ? 1.1 : 0;
        this.tx += Math.cos(a) * v * dt; this.ty += Math.sin(a) * v * dt;
      }
      if (goal === 'survive') {
        if (this.t > 40) { const a = Math.atan2(s.y - this.ey, s.x - this.ex); this.ex += Math.cos(a) * 1.35 * dt; this.ey += Math.sin(a) * 1.35 * dt; }
        s.step(this.tx, this.ty, dt, 1, this.ex, this.ey);
        if (Math.hypot(this.ex - s.x, this.ey - s.y) < 20) { this.caught = true; this.done = true; }
      } else s.step(this.tx, this.ty, dt, 1);
      const d = Math.hypot(this.tx - s.x, this.ty - s.y);
      if (d < this.dmin) this.dmin = d;
      if (d < 18) { this.eaten++; this.next(); }
    } else {
      const [tx, ty] = goalTarget(goal, s);
      s.step(tx, ty, dt, 1);
    }
    this.t += dt;
    if (this.t >= this.cfg.goal.dur) this.done = true;
  }
  score() {
    const s = this.sim, g = this.goal, close = 100 * Math.max(0, 1 - this.dmin / this.d0);
    let sc;
    if (g === 'hunt') sc = this.eaten * 100 + close;
    else if (g === 'predator') sc = this.eaten * 150 + close;
    else if (g === 'survive') sc = this.eaten * 80 + this.t * 0.25 + (this.caught ? 0 : 100);
    else if (g === 'speed') sc = Math.hypot(s.x, s.y) / 4;
    else if (g === 'spin') sc = s.rot * 8;
    else sc = Math.max(0, s.x * GOAL_DIRS[g][0] + s.y * GOAL_DIRS[g][1]) / 4;
    return sc - s.energy * 0.0015 * this.cfg.goal.energyCost;
  }
  label() {
    const g = this.goal, s = this.sim;
    if (g === 'hunt') return `${this.eaten} 🦐`;
    if (g === 'predator') return `${this.eaten} proies`;
    if (g === 'survive') return `${this.eaten} 🦐 · ${this.caught ? '💀 attrapé' : 'en vie'}`;
    if (g === 'spin') return `${(s.rot / (2 * Math.PI)).toFixed(1)} tours`;
    if (g === 'speed') return `${Math.round(Math.hypot(s.x, s.y))} px`;
    const d = GOAL_DIRS[g]; return `${Math.round(Math.max(0, s.x * d[0] + s.y * d[1]))} px`;
  }
}
function evaluate(g, cfg, sc) {
  const tr = new Trial(g, cfg, sc);
  while (!tr.done) tr.step(1);
  return tr.score();
}

// ---------------- Moteur d'évolution (tourne dans le worker) ----------------
class LabEngine {
  constructor(emit) { this.emit = emit; this.sp = new Map(); this.rr = 0; this.lastProg = 0; }
  handle(msg) {
    const s = this.sp.get(msg.id);
    switch (msg.t) {
      case 'add': {
        const cfg = msg.cfg, seeds = (msg.seeds || []).map(g => clampGenome(g, cfg));
        const ns = { id: msg.id, cfg, gen: msg.gen || 0, evals: msg.evals || 0, running: msg.running !== false, pop: [], lastSorted: null };
        for (let i = 0; i < cfg.evo.pop; i++) ns.pop.push(seeds.length ? (i < seeds.length ? seeds[i] : mutateG(cloneG(seeds[i % seeds.length]), cfg)) : randGenome(cfg));
        this.startGen(ns); this.sp.set(msg.id, ns); break;
      }
      case 'cfg': if (s) { s.cfg = msg.cfg; s.pop.forEach(g => clampGenome(g, s.cfg)); if (s.lastSorted) s.lastSorted.forEach(g => clampGenome(g, s.cfg)); this.startGen(s); } break;
      case 'run': if (s) s.running = msg.on; break;
      case 'remove': this.sp.delete(msg.id); break;
      case 'top': this.emit({ t: 'reply', req: msg.req, data: s ? (s.lastSorted || s.pop).slice(0, msg.n) : [] }); break;
      case 'snapshot': this.emit({ t: 'reply', req: msg.req, data: [...this.sp.values()].map(x => ({ id: x.id, gen: x.gen, evals: x.evals, seeds: (x.lastSorted || x.pop).slice(0, 60) })) }); break;
    }
  }
  startGen(s) { s.scen = makeScenarios(s.cfg); s.idx = 0; s.scores = new Float64Array(s.pop.length); }
  tick(budget) {
    const list = [...this.sp.values()].filter(s => s.running);
    if (!list.length) return false;
    const t0 = performance.now();
    while (performance.now() - t0 < budget) {
      const s = list[this.rr++ % list.length];
      for (let k = 0; k < 3; k++) this.evalOne(s);
    }
    if (t0 - this.lastProg > 200) { this.lastProg = t0; this.emit({ t: 'progress', items: list.map(s => ({ id: s.id, idx: s.idx, size: s.pop.length })) }); }
    return true;
  }
  evalOne(s) {
    const g = s.pop[s.idx]; let sum = 0;
    for (const sc of s.scen) sum += evaluate(g, s.cfg, sc);
    s.scores[s.idx] = sum / s.scen.length; s.idx++; s.evals++;
    if (s.idx >= s.pop.length) this.finishGen(s);
  }
  finishGen(s) {
    const order = [...s.pop.keys()].sort((i, j) => s.scores[j] - s.scores[i]);
    const sorted = order.map(i => s.pop[i]), N = sorted.length, cfg = s.cfg, b = cfg.body;
    const mean = f => sorted.reduce((a, g) => a + f(g), 0) / N;
    const std = (f, range) => { const m = mean(f); return Math.sqrt(mean(g => (f(g) - m) ** 2)) / (range || 1); };
    const stats = {
      vert: mean(g => g.nSeg), str: mean(g => g.str), neur: mean(g => g.brain.active.reduce((a, v) => a + v, 0)),
      len: mean(g => g.nSeg * g.segLen),
      div: 100 * (std(g => g.nSeg, b.segMax - b.segMin + 1) + std(g => g.segLen, b.lenMax - b.lenMin + 1) + std(g => g.str, b.strMax) + std(g => g.flex, b.flexMax) + std(g => g.freq, b.freqMax) + std(g => g.brain.W[0][0] + g.brain.W[0][5], 3)) / 6,
    };
    let avg = 0; for (let i = 0; i < N; i++) avg += s.scores[i]; avg /= N;
    this.emit({ t: 'gen', id: s.id, gen: s.gen, best: s.scores[order[0]], avg, champ: sorted[0], stats, evals: s.evals });
    s.lastSorted = sorted.slice(0, 60);
    const size = cfg.evo.pop, next = [], elite = Math.max(1, Math.round(size * cfg.evo.elite));
    for (let i = 0; i < Math.min(elite, N); i++) next.push(sorted[i]);
    const pick = () => { let best = Math.floor(Math.random() * N); for (let k = 0; k < 3; k++) { const c = Math.floor(Math.random() * N); if (c < best) best = c; } return sorted[best]; };
    while (next.length < size) {
      const p = pick();
      next.push(mutateG(cfg.evo.crossover && Math.random() < 0.4 ? crossoverG(p, pick()) : cloneG(p), cfg));
    }
    s.pop = next; s.gen++;
    this.startGen(s);
  }
}
