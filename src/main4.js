// =====================================================================
//  ⭐ SPÉCIMENS : des individus figés, stables, à observer ou faire combattre
// =====================================================================
App.specimens = [];
function addSpecimen(g, sp, name, gen) {
  const spec = { id: newId(), name: name || sp.cfg.name, spId: sp.id, spName: sp.cfg.name, cfg: structuredClone(sp.cfg), g: cloneG(g), gen: gen ?? sp.gen, date: Date.now() };
  App.specimens.unshift(spec);
  toast(`⭐ <b>${esc(spec.name)}</b> rejoint ta collection de spécimens (onglet ⭐)`);
  if (App.tab === 'spec') renderSpecimens();
}
function specSpecies(spec) { return spec.ghost || (spec.ghost = { id: -spec.id, cfg: spec.cfg, gen: spec.gen, ghost: true }); }
function releaseSpecimen(spec, opts) {
  if (App.view === 'arena') showOcean();
  const cx = clamp(App.cam.x, 100, App.ocean.W - 100), cy = clamp(App.cam.y, 100, floorY(App.cam.x) - 100);
  const c = spawnCreature(clampGenome(cloneG(spec.g), spec.cfg), specSpecies(spec), cx, cy, { sterile: true, immortal: !!opts.immortal, specId: spec.id, name: spec.name, labGen: spec.gen }, App.ocean);
  burst(cx, cy, '255,220,120', 24, 2.5);
  if (opts.observe) { selectCreature(c); App.follow = true; App.cam.z = Math.max(App.cam.z, 1.6); }
  return c;
}
function renderSpecimens() {
  const box = $('tab-spec'); if (!box) return;
  box.innerHTML = `<div><div style="font-size:16px;font-weight:700">⭐ Collection de spécimens</div>
    <div style="color:var(--muted);margin-top:4px;line-height:1.5">Des individus <b>figés</b> : leur génome ne change plus. Ils sont <b>stériles</b> (aucun descendant ne vient brouiller l'observation) et peuvent être rendus <b>immortels</b>. Ajoute-en avec « ⭐ Garder » dans le bassin d'essai ou l'inspecteur.</div></div>`;
  if (!App.specimens.length) { box.insertAdjacentHTML('beforeend', '<div class="placeholder">Aucun spécimen pour l\'instant.</div>'); return; }
  for (const spec of App.specimens) {
    const el = document.createElement('div'); el.className = 'spec';
    const inOcean = App.ocean.creatures.filter(c => c.specId === spec.id).length;
    el.innerHTML = `<div class="top"><canvas width="168" height="104"></canvas><div style="min-width:0;flex:1">
        <input type="text" value="${esc(spec.name)}">
        <div style="font-size:11px;color:var(--muted);margin-top:5px;line-height:1.5">${esc(spec.spName)} · gén ${spec.gen} · ${spec.g.nSeg} 🦴 · ${DIETS[spec.cfg.diet || 'herbivore'].split(' ')[0]}<br>${inOcean ? `🌊 ${inOcean} dans l'océan` : 'au repos dans la collection'}</div></div></div>
      <div class="btns">
        <button data-a="obs" title="Lâcher une copie immortelle et stérile, et la suivre">🔬 Observer</button>
        <button data-a="rel" title="Lâcher une copie stérile mais mortelle (elle peut mourir de faim ou être mangée)">🌊 Lâcher</button>
        <button data-a="duel" title="L'envoyer dans l'arène">⚔ Duel</button>
        <button data-a="found" title="Fonder une nouvelle espèce qui évolue à partir de lui">🧪</button>
        <button data-a="del" class="danger" title="Supprimer de la collection">🗑</button>
      </div>`;
    el.querySelector('input').onchange = e => { spec.name = e.target.value || spec.name; App.ocean.creatures.forEach(c => { if (c.specId === spec.id) c.name = spec.name; }); };
    el.querySelector('.btns').onclick = e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'obs') { releaseSpecimen(spec, { immortal: true, observe: true }); toast(`🔬 ${esc(spec.name)} est dans l'océan (stérile et immortel). La caméra le suit.`); }
      if (a === 'rel') { releaseSpecimen(spec, { immortal: false }); toast(`🌊 ${esc(spec.name)} est lâché (stérile, mais il peut mourir).`); }
      if (a === 'duel') openArena('spec:' + spec.id);
      if (a === 'found') { const cfg = structuredClone(spec.cfg); cfg.name = randomName(); const ns = createSpecies(cfg, { seeds: [cloneG(spec.g)] }); addLog(ns, `🧪 Fondée à partir du spécimen ${esc(spec.name)}`); App.selSp = ns; showTab('sp'); }
      if (a === 'del') { if (!confirm(`Supprimer le spécimen « ${spec.name} » ?`)) return; App.specimens = App.specimens.filter(s => s !== spec); }
      renderSpecimens();
    };
    box.appendChild(el);
    poseThumb(el.querySelector('canvas'), spec.g, spec.cfg);
  }
}

// =====================================================================
//  ⚔ L'ARÈNE : duels entre espèces ou spécimens
// =====================================================================
const DUEL_MODES = {
  fight: '⚔ Combat (prédation activée, faim activée : le dernier camp en vie gagne)',
  food: '🦐 Course aux crevettes (le camp qui en mange le plus gagne)',
  sprint: '🏁 Sprint (le premier à franchir la ligne d\'arrivée gagne)',
};
let lastDuel = null;
function contenders() {
  const list = App.species.filter(s => s.champ).map(s => ({ key: 'sp:' + s.id, label: `🧬 ${s.cfg.name} (gén ${s.gen}) ${s.cfg.diet === 'carnivore' ? '🦷' : ''}`, g: s.champ, cfg: s.cfg }));
  for (const spec of App.specimens) list.push({ key: 'spec:' + spec.id, label: `⭐ ${spec.name} ${spec.cfg.diet === 'carnivore' ? '🦷' : ''}`, g: spec.g, cfg: spec.cfg });
  return list;
}
function openArena(preA, preB) {
  const list = contenders();
  if (list.length < 1) return toast('Il faut au moins une espèce avec une génération terminée (ou un spécimen).');
  const d = lastDuel || {};
  const a = preA || d.a || list[0].key, b = preB || d.b || (list.find(x => x.key !== a) || list[0]).key;
  const opts = sel => list.map(x => `<option value="${x.key}" ${x.key === sel ? 'selected' : ''}>${esc(x.label)}</option>`).join('');
  $('modal').innerHTML = `<div class="mbox" style="grid-template-columns:1fr;height:auto;max-height:94vh;width:min(860px,96vw)"><div class="mform">
    <h2>⚔ Arène</h2><div class="intro">Choisis deux camps : une espèce envoie ses meilleurs champions, un spécimen envoie des copies de lui-même. Avec 1 contre 1, c'est un vrai duel.</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${['a', 'b'].map((s, i) => `<div class="duelcol"><div class="h">Camp ${i ? 'B (à droite)' : 'A (à gauche)'}</div>
        <select id="du_${s}">${opts(i ? b : a)}</select><canvas id="du_${s}_cv" width="320" height="140" style="width:100%;height:140px;background:#0c2540;border-radius:9px"></canvas>
        <div class="kv"><span>Combattants</span><b id="du_${s}_nv">${d['n' + s] || 1}</b></div><input type="range" id="du_${s}_n" min="1" max="15" value="${d['n' + s] || 1}"></div>`).join('')}
    </div>
    <div class="sec"><div class="field"><label>Épreuve</label><select id="du_mode" style="grid-column:2/4">${Object.entries(DUEL_MODES).map(([k, v]) => `<option value="${k}" ${k === (d.mode || 'fight') ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="field"><label>Durée maximale</label><input type="range" id="du_T" min="20" max="240" step="10" value="${d.T || 90}"><span class="val" id="du_Tv">${d.T || 90} s</span></div></div>
    <div style="color:var(--muted);font-size:12px;line-height:1.5;margin-top:6px" id="du_hint"></div>
    <div class="mfoot" style="margin-top:16px"><button id="du_cancel">Annuler</button><button class="primary" id="du_go">⚔ Lancer le duel</button></div></div></div>`;
  $('modal').classList.add('show');
  const upd = () => {
    for (const s of ['a', 'b']) { const x = list.find(o => o.key === $('du_' + s).value); poseThumb($('du_' + s + '_cv'), x && x.g, x ? x.cfg : defaultCfg()); $('du_' + s + '_nv').textContent = $('du_' + s + '_n').value; }
    $('du_Tv').textContent = $('du_T').value + ' s';
    const A = list.find(o => o.key === $('du_a').value), B = list.find(o => o.key === $('du_b').value), meat = [A, B].filter(x => x && x.cfg.diet !== 'herbivore').length;
    $('du_hint').innerHTML = $('du_mode').value === 'fight' ? (meat ? '🦷 Au moins un camp est carnivore : ça va mordre !' : '🌿 Aucun carnivore : le combat se jouera à l\'endurance (qui survit le plus longtemps à la faim).') : '';
  };
  ['du_a', 'du_b', 'du_a_n', 'du_b_n', 'du_mode', 'du_T'].forEach(id => $(id).addEventListener('input', upd));
  upd();
  $('du_cancel').onclick = closeEditor;
  $('du_go').onclick = () => { const c = { a: $('du_a').value, b: $('du_b').value, na: +$('du_a_n').value, nb: +$('du_b_n').value, mode: $('du_mode').value, T: +$('du_T').value }; closeEditor(); startDuel(c); };
}
$('arenaBtn').onclick = () => openArena();

async function sideGenomes(key, n) {
  const [kind, idS] = key.split(':'), id = +idS;
  if (kind === 'sp') {
    const sp = spById(id); if (!sp) return null;
    const top = (await request({ t: 'top', id, n })) || []; const gs = top.length ? top : [sp.champ];
    return { sp, label: sp.cfg.name, hue: sp.cfg.hue, genomes: arr(n, (_, i) => gs[i % gs.length]) };
  }
  const spec = App.specimens.find(s => s.id === id); if (!spec) return null;
  return { sp: specSpecies(spec), label: '⭐ ' + spec.name, hue: spec.g.hue, genomes: arr(n, () => clampGenome(cloneG(spec.g), spec.cfg)), spec };
}
async function startDuel(cfg) {
  lastDuel = cfg;
  const A = await sideGenomes(cfg.a, cfg.na), B = await sideGenomes(cfg.b, cfg.nb);
  if (!A || !B) return toast('Combattant introuvable.');
  const w = new World('arena', 1800, 1100);
  w.settings.foodTarget = cfg.mode === 'food' ? 70 : cfg.mode === 'fight' ? 35 : 0;
  w.settings.repro = false; w.settings.predation = cfg.mode === 'fight'; w.noHunger = cfg.mode !== 'fight';
  w.cam = { x: w.W / 2, y: w.H / 2, z: Math.min(CW / w.W, CH / w.H) * 0.92 };
  const sides = [A, B];
  sides.forEach((S, si) => S.genomes.forEach((g, i) => {
    let x, y, th;
    if (cfg.mode === 'sprint') { x = rnd(90, 200); y = si === 0 ? rnd(80, w.H / 2 - 60) : rnd(w.H / 2 + 60, w.H - 80); th = 0; }
    else { x = si === 0 ? rnd(90, 220) : rnd(w.W - 220, w.W - 90); y = (i + 1) / (S.genomes.length + 1) * w.H; th = si === 0 ? 0 : Math.PI; }
    spawnCreature(g, S.sp, x, y, { side: si, sterile: true, th, energy: 120, name: S.spec ? S.spec.name : undefined, specId: S.spec && S.spec.id, labGen: S.sp.gen }, w);
  }));
  if (cfg.mode === 'sprint') w.targetFn = c => ({ x: w.W - 60, y: c.sim.y, alive: true, fake: true });
  for (let i = 0; i < w.settings.foodTarget; i++) spawnFood(w);
  w.duel = { cfg, mode: cfg.mode, T: cfg.T * 60, t: 0, over: false, winner: null, sides: sides.map((S, i) => ({ label: S.label, hue: S.hue, start: S.genomes.length, finish: null })) };
  w.onStep = dt => duelStep(w, dt);
  w.eatenBy = [0, 0]; w.killsDead = [0, 0];
  w.onDeath = c => { w.eatenBy[c.side] += c.eaten; w.killsDead[c.side] += c.kills; }; // les morts gardent leur score
  App.arena = w; App.view = 'arena'; App.selCr = null; App.follow = false; dirty.ind = true;
  $('winner').classList.remove('show'); $('duelHud').classList.add('show');
  if (!App.timeScale) setTime(1);
  toast(`⚔ ${esc(A.label)} contre ${esc(B.label)} : ${DUEL_MODES[cfg.mode].split('(')[0]}`);
}
function duelStats(w) {
  return [0, 1].map(si => { const cs = w.creatures.filter(c => c.side === si && c.alive);
    return { alive: cs.length, eaten: w.eatenBy[si] + cs.reduce((a, c) => a + c.eaten, 0), kills: w.killsDead[si] + cs.reduce((a, c) => a + c.kills, 0), best: cs.reduce((a, c) => Math.max(a, c.sim.x), 0) }; });
}
function duelStep(w, dt) {
  const D = w.duel; if (D.over) return;
  D.t += dt;
  const st = duelStats(w);
  if (D.mode === 'sprint') {
    for (const c of w.creatures) if (c.sim.x >= w.W - 150 && !D.over) return endDuel(w, c.side, `${c.name || c.sp.cfg.name} franchit la ligne en premier en ${(D.t / 60).toFixed(1)} s !`);
  }
  if (D.mode === 'fight' && (st[0].alive === 0 || st[1].alive === 0)) {
    if (st[0].alive === st[1].alive) return endDuel(w, null, 'Les deux camps ont été anéantis.');
    const win = st[0].alive ? 0 : 1; return endDuel(w, win, `Il reste ${st[win].alive} survivant(s) · ${st[win].kills} victime(s) dévorée(s).`);
  }
  if (D.t >= D.T) {
    if (D.mode === 'food') { const [a, b] = [st[0].eaten, st[1].eaten]; return endDuel(w, a === b ? null : a > b ? 0 : 1, `Score final : ${a} 🦐 contre ${b} 🦐.`); }
    if (D.mode === 'sprint') { const [a, b] = [st[0].best, st[1].best]; return endDuel(w, Math.abs(a - b) < 5 ? null : a > b ? 0 : 1, 'Temps écoulé : victoire au plus avancé.'); }
    const ka = st[0].alive * 1000 + st[0].kills, kb = st[1].alive * 1000 + st[1].kills;
    return endDuel(w, ka === kb ? null : ka > kb ? 0 : 1, `Temps écoulé : ${st[0].alive} contre ${st[1].alive} survivants.`);
  }
}
function endDuel(w, win, msg) {
  const D = w.duel; D.over = true; D.winner = win;
  const S = D.sides;
  $('winner').innerHTML = `<h2>${win === null ? '🤝 Égalité' : `🏆 Victoire : <span style="color:hsl(${S[win].hue},75%,65%)">${esc(S[win].label)}</span>`}</h2><p>${msg}</p>
    <div class="row" style="justify-content:center"><button class="primary" id="wRe">🔁 Revanche</button><button id="wNew">⚙ Nouveau duel</button><button id="wBack">↩ Océan</button></div>`;
  $('winner').classList.add('show');
  $('wRe').onclick = () => startDuel(D.cfg); $('wNew').onclick = () => openArena(); $('wBack').onclick = showOcean;
  burst(w.W / 2, w.H / 2, '255,215,120', 60, 6);
}
function showOcean() {
  App.view = 'ocean'; App.selCr = null; App.follow = false; dirty.ind = true;
  $('duelHud').classList.remove('show'); $('winner').classList.remove('show');
}
function renderDuelHud() {
  const w = App.arena; if (App.view !== 'arena' || !w) return;
  const D = w.duel, st = duelStats(w), S = D.sides;
  const side = i => `<div class="dside" style="border-color:hsl(${S[i].hue},70%,55%)"><div class="n" style="color:hsl(${S[i].hue},75%,70%)">${esc(S[i].label)}</div>
    <div class="s">${D.mode === 'food' ? `🦐 <b>${st[i].eaten}</b> crevettes<br>` : ''}${D.mode === 'fight' ? `❤ <b>${st[i].alive}</b> / ${S[i].start} en vie · ☠ ${st[i].kills}<br>` : ''}${D.mode === 'sprint' ? `🏁 ${Math.round(clamp(st[i].best / (w.W - 150) * 100, 0, 100))} % du parcours<br>` : ''}</div></div>`;
  $('duelHud').innerHTML = side(0) + `<div class="dmid"><div class="clock">${Math.max(0, (D.T - D.t) / 60).toFixed(0)} s</div><button id="dQuit">↩ Océan</button></div>` + side(1);
  $('dQuit').onclick = showOcean;
}
