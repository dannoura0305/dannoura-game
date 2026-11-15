// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：隠しボス「風邪菌（仮）」（段 7）
// ・病原体をモチーフにした架空の存在（実際の病気の仕組みは再現しない）。コミカルだが、戦いは本格的に
// ・体力（hp）とは別に、自機の「感染ゲージ」を上げてくる（ゲームの演出。値は runner_hard.js が持つ）
// ・攻撃：くしゃみ弾（扇に飛ぶ粒）・分裂（小さな菌が跳ねて寄ってくる・同時に 4 匹まで）・体当たり（部屋を横切る）。体力が半分を切ると速く、分裂が増える
// ・正式な名前・見た目・攻撃は未決定。名前は「風邪菌（仮）」
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
    infect: { touch: 14, shot: 8, mini: 6 },                          // 感染ゲージの上がり方（満タン 100）
    mini: { hp: 1, w: 9, h: 14, hop: 7.5, gravity: 0.6, speedX: 2.2 },
  };
  function make(room) {                                              // room：{ x0, x1, floor }（床の高さ）
    const shots = [], minis = [];
    function spawn(x) { return { x, y: room.floor + COLD.float, baseY: room.floor + COLD.float, hp: COLD.hp, hpMax: COLD.hp, state: 'float', f: 0, seq: 0, vx: 0, hitT: 0, dead: false, deadF: 0, face: -1 }; }
    const fast = e => e.hp <= e.hpMax / 2, k = e => (fast(e) ? 1.35 : 1);
    const go = (e, st) => { e.state = st; e.f = 0; };
    function step(e, p) {
      e.f++; if (e.hitT > 0) e.hitT--;
      if (e.dead) { e.deadF++; e.y -= 0.6; return; }
      const dx = p ? p.x - e.x : 0; e.face = dx < 0 ? -1 : 1;
      switch (e.state) {
        case 'float':
          e.y = e.baseY + Math.sin(e.f * 0.06) * 14; e.x += Math.max(-1, Math.min(1, dx / 120)) * 0.9 * k(e);
          if (e.f > COLD.rest / k(e)) { e.seq++; go(e, ['sneeze_tele', 'split_tele', 'sneeze_tele', 'rush_tele'][e.seq % 4]); }
          break;
        case 'sneeze_tele': if (e.f >= COLD.sneeze.tele / k(e)) {
          const base = Math.atan2((p ? p.y + 24 : room.floor) - e.y, dx || -1);
          for (let i = 0; i < COLD.sneeze.n; i++) { const a = base + (i - (COLD.sneeze.n - 1) / 2) * COLD.sneeze.spread / (COLD.sneeze.n - 1); shots.push({ x: e.x + e.face * 20, y: e.y - 6, vx: Math.cos(a) * COLD.sneeze.speed * k(e), vy: Math.sin(a) * COLD.sneeze.speed * k(e), r: 7, life: 160 }); }
          go(e, 'recover'); } break;
        case 'split_tele': if (e.f >= COLD.split.tele / k(e)) {
          const n = fast(e) ? COLD.split.nFast : COLD.split.n;
          for (let i = 0; i < n && minis.length < COLD.split.max; i++) minis.push({ x: e.x + (i - (n - 1) / 2) * 30, y: e.y - 20, vx: (i - (n - 1) / 2) * 1.5, vy: 3, hp: COLD.mini.hp, f: 0, dead: false, deadF: 0 });
          go(e, 'recover'); } break;
        case 'rush_tele': e.vx = 0; if (e.f >= COLD.rush.tele / k(e)) { e.vx = (dx < 0 ? -1 : 1) * COLD.rush.speed * k(e); e.y = room.floor + COLD.r + 6; go(e, 'rush'); } break;
        case 'rush': e.x += e.vx; if (e.x <= room.x0 + COLD.r || e.x >= room.x1 - COLD.r) { e.x = Math.max(room.x0 + COLD.r, Math.min(room.x1 - COLD.r, e.x)); e.vx = 0; go(e, 'rise'); } break;
        case 'rise': e.y += (e.baseY - e.y) * 0.08; if (Math.abs(e.y - e.baseY) < 2) go(e, 'float'); break;
        case 'recover': e.y = e.baseY + Math.sin(e.f * 0.06) * 14; if (e.f >= 26 / k(e)) go(e, 'float'); break;
      }
      e.x = Math.max(room.x0 + COLD.r, Math.min(room.x1 - COLD.r, e.x));
    }
    function stepOthers(p) {
      for (const s of shots) { s.x += s.vx; s.y += s.vy; s.life--; if (s.y < room.floor || s.x < room.x0 || s.x > room.x1) s.life = 0; }
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].life <= 0) shots.splice(i, 1);
      for (const m of minis) {
        m.f++; if (m.dead) { m.deadF++; continue; }
        m.vy -= COLD.mini.gravity; m.x += m.vx; m.y += m.vy;
        if (m.y <= room.floor) { m.y = room.floor; m.vy = 0; m.vx = 0; if (m.f % 40 === 0) { m.vy = COLD.mini.hop; m.vx = (p && p.x < m.x ? -1 : 1) * COLD.mini.speedX; } }
        m.x = Math.max(room.x0 + COLD.mini.w, Math.min(room.x1 - COLD.mini.w, m.x));
      }
      for (let i = minis.length - 1; i >= 0; i--) if (minis[i].dead && minis[i].deadF > 20) minis.splice(i, 1);
    }
    const box = e => ({ x0: e.x - COLD.r * 0.8, x1: e.x + COLD.r * 0.8, y0: e.y - COLD.r * 0.8, y1: e.y + COLD.r * 0.8 });
    const shotBox = s => ({ x0: s.x - s.r, x1: s.x + s.r, y0: s.y - s.r, y1: s.y + s.r });
    const miniBox = m => ({ x0: m.x - COLD.mini.w, x1: m.x + COLD.mini.w, y0: m.y, y1: m.y + COLD.mini.h });
    function hurt(e, dmg) { if (e.dead) return false; e.hp -= dmg; e.hitT = COLD.flinch; if (e.hp <= 0) { e.hp = 0; e.dead = true; e.deadF = 0; shots.length = 0; for (const m of minis) m.dead = true; } return true; }
    function hurtMini(m) { if (m.dead) return false; m.hp--; if (m.hp <= 0) { m.dead = true; m.deadF = 0; } return true; }
    return { spawn, step, stepOthers, shots, minis, box, shotBox, miniBox, hurt, hurtMini, telegraph: e => /_tele$/.test(e.state) };
  }
  const API = { COLD, make };
  root.RunnerCold = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
