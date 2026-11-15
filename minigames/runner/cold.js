// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：隠しボス「風邪菌（かぜきん）」（利用者の設定画・ドット絵 2026-11-15：assets/runner/kazekin.webp）
// ・病原体をモチーフにした架空の存在（実際の病気の仕組みは再現しない）。コミカルだが、戦いは本格的に
// ・体力（hp）とは別に、自機の「感染ゲージ」を上げてくる（ゲームの演出。値は runner_hard.js が持つ）
// ・攻撃：菌弾ショット（扇に飛ぶウイルス弾）・分裂／雑魚召喚（小さな菌が跳ねて寄ってくる・同時に 4 匹まで）・霧（エアロ：ゆっくり漂う感染の霧）・体当たり（部屋を横切る）
// ・ダメージを受けると分裂する（6 減るごとに小さな菌が 1 匹）
// ・第 2 形態（激昂・本気）：体力が半分を切ると大きくなり、速く・分裂が増え・広範囲の感染攻撃（全方向の菌弾 2 回）を使う
// ・DOM を使わない（node で試験する：tests/runner-hard-cold.test.mjs）。ふつうのスクリプトとして読むと RunnerCold が生える
// ・座標は act.js と同じ（x 右が＋・y 上が＋）。1 こま＝1/60 秒
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const COLD = {
    hp: 30, r: 34, float: 150,                                       // 体の半径・浮いている高さ（床から）
    sneeze: { tele: 32, n: 5, speed: 4.2, spread: 0.9 },
    split: { tele: 30, n: 2, nFast: 3, max: 4 },
    rush: { tele: 26, speed: 8.5 },
    rest: 54, flinch: 8,
    infect: { touch: 14, shot: 8, mini: 6, mist: 5 },                 // 感染ゲージの上がり方（満タン 100）
    mist: { tele: 30, r: 46, rForm2: 62, speed: 1.4, life: 170 },
    form2: { f: 60, scale: 1.25, burstTele: 36, burstN: 10, burstGap: 26, splitEvery: 6 },
    mini: { hp: 1, w: 9, h: 14, hop: 7.5, gravity: 0.6, speedX: 2.2 },
  };
  function make(room) {                                              // room：{ x0, x1, floor }（床の高さ）
    const shots = [], minis = [], mists = [];
    function spawn(x) { return { x, y: room.floor + COLD.float, baseY: room.floor + COLD.float, hp: COLD.hp, hpMax: COLD.hp, state: 'float', f: 0, seq: 0, vx: 0, hitT: 0, dead: false, deadF: 0, face: -1, form: 1, last: null, taken: 0, ev: [] }; }
    const R = e => COLD.r * (e.form === 2 ? COLD.form2.scale : 1);
    const addMini = (x, y, vx) => { if (minis.length < COLD.split.max) minis.push({ x, y, vx, vy: 3, hp: COLD.mini.hp, f: 0, dead: false, deadF: 0 }); };
    const fast = e => e.hp <= e.hpMax / 2, k = e => (fast(e) ? 1.35 : 1);
    const go = (e, st) => { e.state = st; e.f = 0; };
    function step(e, p) {
      e.f++; e.ev = []; if (e.hitT > 0) e.hitT--;
      if (e.dead) { e.deadF++; e.y -= 0.6; return; }
      const dx = p ? p.x - e.x : 0; e.face = dx < 0 ? -1 : 1;
      if (e.form === 1 && fast(e) && e.state !== 'rush') { e.form = 2; e.ev.push('form2'); go(e, 'form2'); }
      switch (e.state) {
        case 'form2': e.y += (e.baseY - e.y) * 0.1; if (e.f >= COLD.form2.f) go(e, 'float'); break;   // 第 2 形態へ（膨らむ）
        case 'float':
          e.y = e.baseY + Math.sin(e.f * 0.06) * 14; e.x += Math.max(-1, Math.min(1, dx / 120)) * 0.9 * k(e);
          if (e.f > COLD.rest / k(e)) { e.seq++; const o = e.form === 2 ? ['sneeze_tele', 'split_tele', 'burst_tele', 'mist_tele', 'rush_tele'] : ['sneeze_tele', 'split_tele', 'mist_tele', 'rush_tele']; go(e, o[e.seq % o.length]); }
          break;
        case 'mist_tele': if (e.f >= COLD.mist.tele / k(e)) { mists.push({ x: e.x + e.face * 30, y: e.y - 20, vx: e.face * COLD.mist.speed, r: e.form === 2 ? COLD.mist.rForm2 : COLD.mist.r, life: COLD.mist.life, f: 0 }); e.last = 'mist'; go(e, 'recover'); } break;
        case 'burst_tele': if (e.f >= COLD.form2.burstTele) {   // 広範囲の感染攻撃：全方向の菌弾 2 回
          for (const ph of [0, 0.5]) for (let i = 0; i < COLD.form2.burstN; i++) { const a = (i + ph) / COLD.form2.burstN * Math.PI * 2; shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 3.4, vy: Math.sin(a) * 3.4, r: 7, life: 170 + ph * COLD.form2.burstGap * 2, wait: ph ? COLD.form2.burstGap : 0 }); }
          e.last = 'burst'; go(e, 'recover'); } break;
        case 'sneeze_tele': if (e.f >= COLD.sneeze.tele / k(e)) {
          const base = Math.atan2((p ? p.y + 24 : room.floor) - e.y, dx || -1);
          for (let i = 0; i < COLD.sneeze.n; i++) { const a = base + (i - (COLD.sneeze.n - 1) / 2) * COLD.sneeze.spread / (COLD.sneeze.n - 1); shots.push({ x: e.x + e.face * 20, y: e.y - 6, vx: Math.cos(a) * COLD.sneeze.speed * k(e), vy: Math.sin(a) * COLD.sneeze.speed * k(e), r: 7, life: 160 }); }
          e.last = 'sneeze'; go(e, 'recover'); } break;
        case 'split_tele': if (e.f >= COLD.split.tele / k(e)) {
          const n = fast(e) ? COLD.split.nFast : COLD.split.n;
          for (let i = 0; i < n; i++) addMini(e.x + (i - (n - 1) / 2) * 30, e.y - 20, (i - (n - 1) / 2) * 1.5);
          e.last = 'split'; go(e, 'recover'); } break;
        case 'rush_tele': e.vx = 0; if (e.f >= COLD.rush.tele / k(e)) { e.vx = (dx < 0 ? -1 : 1) * COLD.rush.speed * k(e); e.y = room.floor + R(e) + 6; go(e, 'rush'); } break;
        case 'rush': e.x += e.vx; if (e.x <= room.x0 + R(e) || e.x >= room.x1 - R(e)) { e.x = Math.max(room.x0 + R(e), Math.min(room.x1 - R(e), e.x)); e.vx = 0; e.last = null; go(e, 'rise'); } break;
        case 'rise': e.y += (e.baseY - e.y) * 0.08; if (Math.abs(e.y - e.baseY) < 2) go(e, 'float'); break;
        case 'recover': e.y = e.baseY + Math.sin(e.f * 0.06) * 14; if (e.f >= 26 / k(e)) go(e, 'float'); break;
      }
      e.x = Math.max(room.x0 + R(e), Math.min(room.x1 - R(e), e.x));
    }
    function stepOthers(p) {
      for (const s of shots) { if (s.wait > 0) { s.wait--; continue; } s.x += s.vx; s.y += s.vy; s.life--; if (s.y < room.floor || s.x < room.x0 || s.x > room.x1) s.life = 0; }
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].life <= 0) shots.splice(i, 1);
      for (const m of mists) { m.f++; m.life--; m.x += m.vx; m.vx *= 0.995; }
      for (let i = mists.length - 1; i >= 0; i--) if (mists[i].life <= 0) mists.splice(i, 1);
      for (const m of minis) {
        m.f++; if (m.dead) { m.deadF++; continue; }
        m.vy -= COLD.mini.gravity; m.x += m.vx; m.y += m.vy;
        if (m.y <= room.floor) { m.y = room.floor; m.vy = 0; m.vx = 0; if (m.f % 40 === 0) { m.vy = COLD.mini.hop; m.vx = (p && p.x < m.x ? -1 : 1) * COLD.mini.speedX; } }
        m.x = Math.max(room.x0 + COLD.mini.w, Math.min(room.x1 - COLD.mini.w, m.x));
      }
      for (let i = minis.length - 1; i >= 0; i--) if (minis[i].dead && minis[i].deadF > 20) minis.splice(i, 1);
    }
    const box = e => ({ x0: e.x - R(e) * 0.8, x1: e.x + R(e) * 0.8, y0: e.y - R(e) * 0.8, y1: e.y + R(e) * 0.8 });
    const mistBox = m => { const r = m.r * 0.7 * Math.min(1, m.f / 20, m.life / 30); return { x0: m.x - r, x1: m.x + r, y0: m.y - r, y1: m.y + r }; };
    const shotBox = s => ({ x0: s.x - s.r, x1: s.x + s.r, y0: s.y - s.r, y1: s.y + s.r });
    const miniBox = m => ({ x0: m.x - COLD.mini.w, x1: m.x + COLD.mini.w, y0: m.y, y1: m.y + COLD.mini.h });
    function hurt(e, dmg) {
      if (e.dead) return false; e.hp -= dmg; e.hitT = COLD.flinch; e.taken = (e.taken || 0) + dmg;
      if (e.taken >= COLD.form2.splitEvery && e.hp > 0) { e.taken = 0; addMini(e.x - e.face * 20, e.y - 10, -e.face * 2); }   // 受けると分裂
      if (e.hp <= 0) { e.hp = 0; e.dead = true; e.deadF = 0; shots.length = 0; mists.length = 0; for (const m of minis) m.dead = true; }
      return true;
    }
    // ドット絵のコマ（assets/runner/kazekin.json の 行_列。絵は左向き）。0 待機・1 移動・2 菌弾・3 霧・4 分裂／召喚・5〜6 雑魚・7 菌弾
    function frame(e) {
      const f = e.f, cyc = (row, ks, sp) => row + '_' + ks[Math.floor(f / sp) % ks.length], prog = (row, ks, n) => row + '_' + ks[Math.min(ks.length - 1, Math.floor(f / Math.max(1, n) * ks.length))];
      switch (e.state) {
        case 'sneeze_tele': return prog(2, [0, 1, 2], COLD.sneeze.tele);
        case 'split_tele': case 'burst_tele': return prog(4, [0, 1, 2], e.state === 'split_tele' ? COLD.split.tele : COLD.form2.burstTele);
        case 'mist_tele': return prog(3, [0, 1, 2], COLD.mist.tele);
        case 'form2': return cyc(4, [2, 1], 6);
        case 'rush_tele': return cyc(1, [0, 1], 6);
        case 'rush': return cyc(1, [3, 4], 4);
        case 'rise': return '1_5';
        case 'recover': return e.last === 'sneeze' ? prog(2, [3, 4, 5, 6], 26) : e.last === 'mist' ? prog(3, [3, 4, 5, 6], 26) : e.last === 'split' || e.last === 'burst' ? prog(4, [3, 4, 5], 26) : cyc(0, [0, 1, 2, 3, 4, 5, 6], 8);
      }
      return cyc(0, [0, 1, 2, 3, 4, 5, 6], 8);
    }
    const miniFrame = m => (m.dead ? '6_' + Math.min(7, 4 + Math.floor(m.deadF / 6)) : m.y > room.floor + 0.5 ? '6_2' : '5_' + (Math.floor(m.f / 6) % 8));
    const shotFrame = s => '7_' + (Math.floor((s.life || 0) / 4) % 5);
    function hurtMini(m) { if (m.dead) return false; m.hp--; if (m.hp <= 0) { m.dead = true; m.deadF = 0; } return true; }
    return { spawn, step, stepOthers, shots, minis, mists, box, shotBox, miniBox, mistBox, hurt, hurtMini, frame, miniFrame, shotFrame, radius: R, telegraph: e => /_tele$/.test(e.state) || e.state === 'form2' };
  }
  const API = { COLD, make };
  root.RunnerCold = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
