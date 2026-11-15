// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：弱い敵（段 4）
// ・種類はデータの表（TYPES）。名前・見た目はすべて仮（正式な敵は未決定。ボスと同じく後で決める）
// ・DOM を使わない（node で試験する：tests/runner-hard-combat.test.mjs）。ふつうのスクリプトとして読むと RunnerEnemies が生える
// ・座標は act.js と同じ（x 右が＋・y 上が＋・足もと）。1 こま＝1/60 秒
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const TYPES = {
    // 雨坊主（仮）：地面を行ったり来たりする。壁・崖で向きを変える。触れると やられ
    walker: { name: '雨坊主（仮）', hp: 2, w: 13, h: 34, speed: 1.1, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1 },
    // からかさ（仮）：宙をふわふわ漂い、近づくと斜めに急降下して、もとの高さへ戻る
    flyer: { name: 'からかさ（仮）', hp: 1, w: 12, h: 26, speed: 0.9, dive: 4.2, range: 170, touch: 1, fly: true },
  };
  const DEATH_F = 24;                                               // 倒れて消えるまで

  function make(map) {
    const T = map.tile;
    const solid = (x, y) => map.solid(Math.floor(x / T), Math.floor(y / T));
    function spawn(type, x, y, face = -1) {
      const D = TYPES[type];
      return { type, x, y, home: { x, y }, vx: 0, vy: 0, face, hp: D.hp, state: D.fly ? 'hover' : 'walk', f: 0, hitT: 0, kb: 0, dead: false, gone: false, deadF: 0 };
    }
    function box(e) { const D = TYPES[e.type]; return { x0: e.x - D.w, x1: e.x + D.w, y0: e.y, y1: e.y + D.h }; }
    // 1 こま（p：自機の位置）
    function step(e, p) {
      const D = TYPES[e.type]; e.f++;
      if (e.dead) { e.deadF++; if (e.deadF >= DEATH_F) e.gone = true; return; }
      if (e.hitT > 0) {                                               // のけぞり：押し戻されるだけ
        e.hitT--; const nx = e.x + e.kb; if (!solid(nx + Math.sign(e.kb) * D.w, e.y + 4)) e.x = nx; e.kb *= 0.8;
        if (!D.fly) fall(e, D); return;
      }
      if (D.fly) return flyStep(e, D, p);
      // 歩く：前が壁か崖なら向きを変える
      const ahead = e.x + e.face * (D.w + 2);
      if (solid(ahead, e.y + 4) || !solid(ahead, e.y - 2)) e.face = -e.face;
      e.x += e.face * D.speed;
      fall(e, D);
    }
    function fall(e, D) {
      if (solid(e.x, e.y - 0.5)) { e.vy = 0; return; }
      if (e.vy < -D.fallCap) e.vy = -D.fallCap; e.vy -= D.gravity;
      let ny = e.y + e.vy; const cy = Math.floor(ny / T);
      if (solid(e.x, ny)) ny = (cy + 1) * T; e.y = ny; if (e.y < -200) e.gone = true;
    }
    function flyStep(e, D, p) {
      if (e.state === 'hover') {
        e.x = e.home.x + Math.sin(e.f * 0.035) * 40; e.y = e.home.y + Math.sin(e.f * 0.07) * 10;
        e.face = p && p.x < e.x ? -1 : 1;
        if (p && Math.abs(p.x - e.x) < D.range && p.y < e.y && e.f > 40) { e.state = 'dive'; e.f = 0; const dx = p.x - e.x, dy = (p.y + 20) - e.y, L = Math.hypot(dx, dy) || 1; e.vx = dx / L * D.dive; e.vy = dy / L * D.dive; }
      } else if (e.state === 'dive') {
        e.x += e.vx; e.y += e.vy;
        if (e.f > 34 || solid(e.x, e.y)) { e.state = 'back'; e.f = 0; }
      } else {                                                        // もとの高さへ戻る
        const dx = e.home.x - e.x, dy = e.home.y - e.y, L = Math.hypot(dx, dy);
        if (L < 3) { e.state = 'hover'; e.f = 0; } else { e.x += dx / L * D.speed * 1.6; e.y += dy / L * D.speed * 1.6; }
      }
    }
    // 攻撃が当たった
    function hurt(e, dmg, kb) {
      if (e.dead) return false;
      e.hp -= dmg; e.hitT = 10; e.kb = kb || 0; e.state = TYPES[e.type].fly ? 'back' : 'walk';
      if (e.hp <= 0) { e.dead = true; e.deadF = 0; }
      return true;
    }
    return { spawn, step, box, hurt };
  }
  const API = { TYPES, DEATH_F, make };
  root.RunnerEnemies = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
