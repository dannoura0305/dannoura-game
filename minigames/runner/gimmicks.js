// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：面の仕掛け（雷殻の怪異の面「高架下・都市送電区」から）
// ・帯電する床（strips）：一定の周期で電気が流れる。流れる少し前に ちらつく（予兆）。流れている間に乗る・触れると やられ
// ・壊れる足場（crumbles）：乗ると揺れて 落ちる → しばらくして元に戻る。stable の物（ボスの部屋の看板）は乗っても落ちず、ボスの踏みつけで一時的に壊れる
// ・ボスの必殺技（雷雲招来）の間は、ボスの部屋の看板が帯電する（charge）
// ・突風（winds）：一定の周期で風が吹き、範囲の中の自機を横へ押す（壁は越えない）。吹く少し前に 雨の筋が流れる（予兆）
// ・増水（floods）：一定の周期で水位が上がる（上がる前に ちらつく）。水に浸かると やられ → 高い足場へ逃げる
// ・足場は map.extra（act.js の後から足す壁）に入れる・抜く。DOM を使わない（tests/runner-hard-stage.test.mjs で試す）
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const G = { shakeF: 26, goneF: 150, arenaGoneF: 180, warnF: 30 };
  function make(map, def = {}) {
    const T = map.tile;
    const strips = (def.strips || []).map(s => Object.assign({ period: 180, on: 80, off: 0 }, s));
    const winds = (def.winds || []).map(s => Object.assign({ period: 200, on: 90, off: 0, dir: -1, force: 2.2, y0: 0, y1: 99999 }, s));
    const floods = (def.floods || []).map(s => Object.assign({ period: 320, on: 170, off: 0, rise: 40, fall: 40, base: 80, max: 60 }, s));
    const crumbles = (def.crumbles || []).map(c => Object.assign({ st: 'solid', f: 0, stable: false, arena: false }, c));
    let F = 0, charged = false;
    const cells = c => { const o = []; for (let x = c.c0; x <= c.c1; x++) o.push(x + ',' + c.cy); return o; };
    const put = (c, on) => { for (const k of cells(c)) { if (on) map.extra.add(k); else map.extra.delete(k); } };
    for (const c of crumbles) put(c, true);
    const phase = s => (F + s.off) % s.period;
    // 増水の水面（y）。on の間：上がる → 留まる → 下がる
    const level = s => { const p = phase(s); if (p >= s.on) return 0; return s.max * Math.min(1, p / s.rise, (s.on - p) / s.fall); };
    const surface = s => s.base + level(s);
    const live = s => phase(s) < s.on;
    const warn = s => !live(s) && phase(s) >= s.period - G.warnF;
    const left = s => (live(s) ? 0 : s.period - phase(s));             // 次に流れるまでのこま数
    const top = c => (c.cy + 1) * T;
    const zone = c => ({ x0: c.c0 * T, x1: (c.c1 + 1) * T, y0: top(c), y1: top(c) + 10 });
    const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const standing = (b, c) => Math.abs(b.y - top(c)) < 0.5 && b.x + 7 > c.c0 * T && b.x - 7 < (c.c1 + 1) * T;
    // 1 こま。b：自機（act.js の体）
    function step(b, box) {
      F++;
      if (b) for (const w of winds) if (live(w) && b.x > w.c0 * T && b.x < (w.c1 + 1) * T && b.y >= w.y0 && b.y <= w.y1 && b.state !== 'hurt') {
        const nx = b.x + w.dir * w.force, edge = nx + w.dir * 8;   // 突風：壁の中へは押さない
        let blocked = false; for (let y = b.y + 2; y < b.y + 46; y += 10) if (map.solid(Math.floor(edge / T), Math.floor(y / T))) blocked = true;
        if (!blocked) b.x = nx;
      }
      for (const c of crumbles) {
        c.f++;
        if (c.st === 'solid' && !c.stable && b && standing(b, c)) { c.st = 'shake'; c.f = 0; }
        else if (c.st === 'shake' && c.f >= G.shakeF) { c.st = 'gone'; c.f = 0; put(c, false); }
        else if (c.st === 'gone' && c.f >= (c.arena ? G.arenaGoneF : G.goneF)) {
          const z = { x0: c.c0 * T, x1: (c.c1 + 1) * T, y0: c.cy * T, y1: top(c) };
          if (!box || !ov(box, z)) { c.st = 'solid'; c.f = 0; put(c, true); }   // 自機が重なっている間は戻さない
        }
      }
    }
    // 自機の箱が、流れている床・帯電した看板に触れているか
    function shock(box) {
      for (const s of strips) if (live(s) && ov(box, zone(s))) return true;
      for (const s of floods) { const lv = level(s); if (lv > 6 && ov(box, { x0: s.c0 * T, x1: (s.c1 + 1) * T, y0: -999, y1: s.base + lv - 4 })) return true; }
      if (charged) for (const c of crumbles) if (c.arena && c.st !== 'gone') { const z = { x0: c.c0 * T - 2, x1: (c.c1 + 1) * T + 2, y0: c.cy * T - 2, y1: top(c) + 10 }; if (ov(box, z)) return true; }
      return false;
    }
    // ボスの踏みつけ：部屋の看板が一時的に壊れる
    function breakArena() { for (const c of crumbles) if (c.arena && c.st !== 'gone') { c.st = 'gone'; c.f = 0; put(c, false); } }
    function reset() { F = 0; charged = false; for (const c of crumbles) { c.st = 'solid'; c.f = 0; put(c, true); } }
    return { step, shock, breakArena, reset, strips, winds, floods, level, surface, crumbles, live, warn, left, charge: on => { charged = !!on; }, get charged() { return charged; }, get F() { return F; } };
  }
  const API = { G, make };
  root.RunnerGimmicks = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
