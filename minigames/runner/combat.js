// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：技と攻撃（段 4）
// ・技はデータの表（MOVES）。こま数（1/60 秒）で 出るまで・当たる間・戻り を持ち、次の技・ジャンプ・ダッシュへ移れる「窓」を表で書く
// ・基本技（base: true）は最初から。習得技（base: false・learnedFrom）はボスを倒すと使える（段 5 から。中身は未決定）
// ・攻撃の形（仮）：傘を閉じて刀のように振る。振る間は傘を閉じ、終わると開き直す（runner_hard.js の絵）
// ・DOM を使わない（node で試験する：tests/runner-hard-combat.test.mjs）。ふつうのスクリプトとして読むと RunnerCombat が生える
// ・当たりの箱は自機の向きで左右を反転。x は前（向いている方）が＋、y は足もとからの高さ
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const MOVES = {
    // 地上の 3 段（基本）
    slash1: { base: true, on: 'ground', startup: 4, active: 3, recover: 12, step: 2,
      hit: { x: 4, y: 12, w: 46, h: 34, dmg: 1, hitstop: 4, kb: 3 }, cancel: { slash2: [5, 19], jump: [8, 19], dash: [8, 19] } },
    slash2: { base: true, on: 'ground', startup: 4, active: 3, recover: 13, step: 3,
      hit: { x: 4, y: 8, w: 50, h: 38, dmg: 1, hitstop: 4, kb: 3.5 }, cancel: { slash3: [5, 20], jump: [8, 20], dash: [8, 20] } },
    slash3: { base: true, on: 'ground', startup: 6, active: 4, recover: 20, step: 5,
      hit: { x: 2, y: 4, w: 58, h: 46, dmg: 2, hitstop: 7, kb: 7 }, cancel: { jump: [14, 30], dash: [14, 30] } },
    // 空中斬り（基本）：上がる・落ちる途中。横の動きはそのまま。着地で終わる
    air: { base: true, on: 'air', startup: 3, active: 5, recover: 10, step: 0,
      hit: { x: -6, y: 2, w: 58, h: 50, dmg: 1, hitstop: 4, kb: 3 }, cancel: {} },
    // 溜め斬り（基本）：攻撃（X）を押し続けて離す。溜め 1 段＝大きく払う・2 段＝大きく払って、前へ飛ぶ斬撃（傘の衝撃波）も出す
    charge: { base: true, name: '溜め斬り', howto: '攻撃（X）を押し続けて 離す', on: 'ground', input: 'charge', startup: 3, active: 6, recover: 14, step: 6,
      hit: { x: -6, y: 0, w: 78, h: 64, dmg: 3, hitstop: 8, kb: 8 }, cancel: { jump: [12, 23], dash: [12, 23] } },
    charge_air: { base: true, name: '溜め斬り（空中）', on: 'air', input: 'charge', startup: 2, active: 6, recover: 8, step: 0,
      hit: { x: -10, y: -4, w: 76, h: 64, dmg: 3, hitstop: 7, kb: 6 }, cancel: {} },
    // 習得技（仮）：切り上げ。↑を押しながら攻撃。上と前を広く払う（宙の敵に）
    // 教えていた仮のボス（大きな雨坊主・仮）は雷殻の怪異に差し替えたので、今は覚える先が無い（覚えた記録がある人はそのまま使える）。どのボスで覚えるかは未決定
    // 正式な技の名前・中身・どのボスで覚えるかは未決定。表に足すだけで増やせる
    rising: { base: false, learnedFrom: null, name: '切り上げ（仮）', howto: '↑を押しながら 攻撃（X）', desc: '上と前を広く払う', on: 'ground', input: 'up', startup: 5, active: 6, recover: 16, step: 3,
      hit: { x: -4, y: 20, w: 48, h: 86, dmg: 2, hitstop: 6, kb: 2 }, cancel: { jump: [10, 27], dash: [12, 27] } },
    // 習得技（仮）：雷突き。ダッシュ中に攻撃 → 雷をまとって前へ踏み込み、突く。雷殻の怪異を倒すと覚える（名前・中身は仮）
    raitotsu: { base: false, learnedFrom: 'raikaku', name: '雷突き（仮）', howto: 'ダッシュ中に 攻撃（X）', desc: '雷をまとって前へ踏み込み、突く', on: 'ground', input: 'dash', startup: 4, active: 7, recover: 15, step: 56,
      hit: { x: -2, y: 8, w: 66, h: 36, dmg: 3, hitstop: 7, kb: 6 }, cancel: { jump: [12, 26] } },
    // 習得技（仮）：水切り。スライディング中に攻撃 → 足もとを水しぶきで払いながら滑る。濁流の怪異を倒すと覚える（名前・中身は仮）
    mizukiri: { base: false, learnedFrom: 'dakuryu', name: '水切り（仮）', howto: 'スライディング中に 攻撃（X）', desc: '水しぶきをまとって、足もとを払いながら滑る', on: 'slide', input: 'slide', startup: 2, active: 14, recover: 4, step: 0,
      hit: { x: -6, y: 0, w: 58, h: 26, dmg: 2, hitstop: 5, kb: 4 }, cancel: {} },
    // 習得技（仮）：風走り。空中でダッシュ → 一度だけ、落ちずに横へ走る（攻撃ではない。act.js の air_dash）。風斬の怪異を倒すと覚える
    kazebashiri: { base: false, learnedFrom: 'kazegiri', name: '風走り（仮）', howto: '空中で ダッシュ（C）。走る間に 攻撃（X）で 風刃', desc: '空中で一度だけ、風に乗って横へ走る。走りながら風の刃で斬れる', ability: 'airDash' },
    // 風刃（仮）：風走りの間に攻撃 → 前を広く払う風の刃（風走りといっしょに覚える。濁流の怪異の弱点）
    kazeha: { base: false, learnedFrom: 'kazegiri', with: 'kazebashiri', name: '風刃（仮）', howto: '風走りの間に 攻撃（X）', desc: '風の刃で前を広く払う', on: 'airdash', input: 'airdash', startup: 1, active: 14, recover: 4, step: 0,
      hit: { x: -4, y: 4, w: 70, h: 52, dmg: 2, hitstop: 5, kb: 4 }, cancel: {} },
  };
  // 溜め：押している こま数で段が上がる（1 段 f1・2 段 f2。ユーザーの解析メモの 25・90 こま）。離した時に段があれば溜め斬り。2 段は飛ぶ斬撃（wave）も出す
  const CHARGE = { f1: 25, f2: 90, wave: { speed: 8.5, life: 48, w: 22, h: 34, y: 12, dmg: 3, hitstop: 6, kb: 5 } };
  const chargeLv = f => (f >= CHARGE.f2 ? 2 : f >= CHARGE.f1 ? 1 : 0);
  const BUFFER_F = 8;                                               // 硬直中に押した攻撃を覚えておくこま数
  const GROUND = ['stand', 'walk_start', 'walk', 'land', 'dash', 'dash_end'];
  const AIR = ['jump', 'fall'];

  function total(m) { return m.startup + m.active + m.recover; }
  function phaseOf(m, f) { return f <= m.startup ? 'startup' : f <= m.startup + m.active ? 'active' : f <= total(m) ? 'recover' : 'done'; }
  function inWin(w, f) { return !!w && f >= w[0] && f <= w[1]; }

  function make(act, opts = {}) {
    const learned = new Set(opts.learned || []);
    const usable = id => { const m = MOVES[id]; return !!m && (m.base || learned.has(id) || (!!m.with && learned.has(m.with))); };
    // 攻撃を始める（入れる技を選ぶ）
    function pick(b, inp) {
      if (AIR.includes(b.state)) return usable('air') ? 'air' : null;
      if (GROUND.includes(b.state)) { if (inp.up && usable('rising')) return 'rising'; if (b.state === 'dash' && usable('raitotsu')) return 'raitotsu'; return usable('slash1') ? 'slash1' : null; }
      return null;
    }
    function start(b, id) { b.atk = { id, f: 0, hits: new Set(), chain: 0 }; if (MOVES[id].on === 'ground' && b.state !== 'stand') act.go(b, 'stand'); }
    // 1 こま：入力（atk・j・d …）を見て、攻撃の進み・連なり・取り消しを決め、act に渡す入力を返す
    function pre(b, inp) {
      if (inp.atkP) b.atkBuf = BUFFER_F; else if (b.atkBuf > 0) b.atkBuf--;
      // 溜め：押している間 数える。離した時に段があれば、溜め斬り（地上・空中。今の技が当たっている間は待たない＝捨てる）
      let rel = 0; if (inp.atk) b.chg = (b.chg || 0) + 1; else { rel = chargeLv(b.chg || 0); b.chg = 0; }
      if (rel) {
        const id = AIR.includes(b.state) ? 'charge_air' : GROUND.includes(b.state) ? 'charge' : null;
        if (id && !(b.atk && phaseOf(MOVES[b.atk.id], b.atk.f) === 'active')) { b.atkBuf = 0; start(b, id); b.atk.f = 1; b.atk.lv = rel; return hold(b, inp, MOVES[id]); }
      }
      if (b.state === 'slide' && usable('mizukiri')) {                // 水切り：滑りはそのまま（act.js が動かす）
        if (b.atk && b.atk.id === 'mizukiri') { if (++b.atk.f > total(MOVES.mizukiri)) b.atk = null; return inp; }
        if (b.atkBuf > 0) { b.atkBuf = 0; b.atk = { id: 'mizukiri', f: 1, hits: new Set(), chain: 0 }; }
        return inp;
      }
      // 風刃：風走りの間に攻撃。風走りが終わって落ち始めても、振り終わるまで当たる
      if (b.atk && b.atk.id === 'kazeha') { if (b.state === 'hurt' || b.state === 'wall_slide' || ++b.atk.f > total(MOVES.kazeha)) b.atk = null; return inp; }
      if (b.state === 'air_dash' && usable('kazeha') && b.atkBuf > 0) { b.atkBuf = 0; b.atk = { id: 'kazeha', f: 1, hits: new Set(), chain: 0 }; return inp; }
      if (b.state === 'hurt' || b.state === 'wall_slide' || b.state === 'wall_kick' || b.state === 'slide' || b.state === 'air_dash') { b.atk = null; return inp; }
      const a = b.atk;
      if (a) {
        const m = MOVES[a.id];
        if (m.on === 'slide') { b.atk = null; return inp; }            // 滑りが終わると水切りも終わる
        a.f++;
        if (a.lv === 2 && a.f === m.startup + 1) { const W = CHARGE.wave, f = b.face || 1; shots.push({ x: b.x + f * 24, y: b.y + W.y, vx: f * W.speed, life: W.life, hits: new Set() }); }   // 2 段：飛ぶ斬撃
        // 次の技へ（窓の中で、覚えていた攻撃）
        if (m.on === 'ground' && a.id !== 'rising' && inp.up && b.atkBuf > 0 && usable('rising') && inWin(m.cancel.slash2 || m.cancel.slash3 || m.cancel.jump, a.f)) { b.atkBuf = 0; b.atk = { id: 'rising', f: 1, hits: new Set(), chain: a.chain + 1 }; return hold(b, inp, MOVES.rising); }
        for (const [to, w] of Object.entries(m.cancel)) {
          if (to === 'jump' || to === 'dash' || !inWin(w, a.f) || !(b.atkBuf > 0) || !usable(to)) continue;
          b.atkBuf = 0; b.atk = { id: to, f: 1, hits: new Set(), chain: a.chain + 1 }; return hold(b, inp, MOVES[to]);
        }
        // ジャンプ・ダッシュで取り消す（窓の中だけ）
        if ((inp.jP && inWin(m.cancel.jump, a.f)) || (inp.dP && inWin(m.cancel.dash, a.f))) { b.atk = null; return inp; }
        if (m.on === 'air' && !AIR.includes(b.state)) { b.atk = null; return inp; }   // 空中斬りは着地で終わる
        if (a.f > total(m)) { b.atk = null; return inp; }
        return hold(b, inp, m);
      }
      if (b.atkBuf > 0) { const id = pick(b, inp); if (id) { b.atkBuf = 0; start(b, id); b.atk.f = 1; return hold(b, inp, MOVES[id]); } }
      return inp;
    }
    // 攻撃中に act へ渡す入力：地上の技はその場（少し前へ踏み込む）・空中斬りは横の動きを残す
    function hold(b, inp, m) {
      if (m.on === 'air') return Object.assign({}, inp, { j: inp.j, jP: false, d: inp.d, dP: false, dn: false, dnP: false });
      if (m.step && b.atk && b.atk.f <= m.startup) b.stepX = m.step * (b.face || 1) / m.startup; else b.stepX = 0;
      return { l: false, r: false, j: false, d: false, dn: false };
    }
    // 飛ぶ斬撃（溜め 2 段）：まっすぐ進み、壁で消える。敵は貫く（同じ相手に 1 回）
    const shots = [];
    function stepShots() { const n = act.map, T = n.tile; for (const s of shots) { s.x += s.vx; s.life--; if (n.solid(Math.floor((s.x + Math.sign(s.vx) * CHARGE.wave.w) / T), Math.floor((s.y + CHARGE.wave.h / 2) / T))) s.life = 0; } for (let i = shots.length - 1; i >= 0; i--) if (shots[i].life <= 0) shots.splice(i, 1); }
    function shotBox(s) { const W = CHARGE.wave; return { x0: s.x - W.w, x1: s.x + W.w, y0: s.y, y1: s.y + W.h, dmg: W.dmg, hitstop: W.hitstop, kb: W.kb * Math.sign(s.vx), id: 'wave' }; }
    function shotHit(s, target) { if (s.hits.has(target)) return false; s.hits.add(target); return true; }
    // act.step の後：地上の踏み込み（壁は越えない）
    function post(b) {
      stepShots();
      if (b.atk && MOVES[b.atk.id].on === 'air' && !AIR.includes(b.state)) b.atk = null;   // 空中斬りは着地したこまで終わる
      if (b.atk && b.stepX) { const n = act.map; const T = n.tile, nx = b.x + b.stepX, edge = nx + (b.stepX > 0 ? 7 : -7); if (!n.solid(Math.floor(edge / T), Math.floor((b.y + 10) / T))) b.x = nx; }
      b.stepX = 0;
    }
    // 当たっている間の箱（世界の座標）。当たっていない時は null
    function hitbox(b) {
      const a = b.atk; if (!a) return null; const m = MOVES[a.id]; if (phaseOf(m, a.f) !== 'active') return null;
      const h = m.hit, f = b.face || 1, x0 = f > 0 ? b.x + h.x : b.x - h.x - h.w;
      return { x0, x1: x0 + h.w, y0: b.y + h.y, y1: b.y + h.y + h.h, dmg: h.dmg, hitstop: h.hitstop, kb: h.kb * f, id: a.id };
    }
    // 1 回の振りで同じ相手に 1 回だけ
    function tryHit(b, target) { const a = b.atk; if (!a || a.hits.has(target)) return false; a.hits.add(target); return true; }
    return { pre, post, hitbox, tryHit, usable, learn: id => learned.add(id), learned, phase: b => (b.atk ? phaseOf(MOVES[b.atk.id], b.atk.f) : null), shots, shotBox, shotHit, chargeLv: b => chargeLv(b.chg || 0) };
  }
  const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const API = { MOVES, BUFFER_F, CHARGE, chargeLv, make, total, phaseOf, overlap };
  root.RunnerCombat = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
