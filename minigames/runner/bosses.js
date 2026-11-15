// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：ボス
// ・ボスはデータの表（BOSSES）。選択画面は表から並べる（ボスを選ぶ＝そのボスの面へ行く。1 面・2 面という順番は無い）
// ・通常ボス C「雷殻の怪異」（利用者の設定画・ドット絵 2026-11-15）。仮のボス「大きな雨坊主（仮）」から差し替えた
// ・隠しボス（風邪菌・仮）は cold.js。表には枠だけ置く（hidden）
// ・DOM を使わない（node で試験する：tests/runner-hard-boss.test.mjs）。ふつうのスクリプトとして読むと RunnerBosses が生える
// ・座標は act.js と同じ（x 右が＋・y 上が＋・足もと）。1 こま＝1/60 秒
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const BOSSES = [
    { id: 'raikaku', name: '雷殻の怪異', kana: 'らいかくのかいい', stage: 'koka', teaches: 'raitotsu', hidden: false, order: null,
      reason: '都市の雷を纏う、インフラ守護の異形。重装甲と雷で戦うパワー型' },
    // 隠しボス：通常ボスを全員倒した後にコンビニへ着くと、看病の場面から始まる（解放の条件は仮：設計案 §6-4 の案 A）。一度戦うと選択画面からも戦える
    { id: 'cold', name: '風邪菌（仮）', stage: 'home', teaches: null, hidden: true, unlock: 'after_all', reason: '子どもは元気になってきたのに、今度は看病していた自分が…' },
  ];
  // 雷殻の怪異：設定画の 8 つの動き（待機・ストンプ・放電・ガード・突進・雷雲招来・被弾・撃破）。数値は仮（表で変えられる）
  const RAIKAKU = {
    hp: 32, w: 30, h: 112, rushH: 80, walk: 0.7, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1,
    stomp: { tele: 34, hitF: 14, wave: 5, waveLife: 90 },                 // 地面を踏み → 地を這う衝撃波 2 つ・部屋の足場（看板）が一時的に壊れる
    discharge: { tele: 40, n: 8, nFast: 12, speed: 4.2, life: 120, f: 26 }, // 全身から放電：放射状の電撃
    guard: { dur: 110, blocks: 2, counterTele: 10 },                       // 雷殻：正面からの攻撃を防ぐ。2 回防ぐと反撃（周りに電撃の輪）
    counter: { r: 100, f: 16 },
    rush: { tele: 30, speed: 9.5 },                                        // 低い姿勢で部屋の端まで突進
    storm: { tele: 50, dur: 270, every: 44, strikeTele: 38, strikeF: 14, w: 24, cd: 3 },   // 必殺技 雷雲招来：体力が半分を切ると。狙った所へ落雷を続ける・部屋の足場が帯電
    rest: 46, recover: 32, flinch: 10, deadF: 80,
  };
  const ORDER = ['stomp_tele', 'discharge_tele', 'rush_tele', 'guard'];

  function make(map) {
    const T = map.tile, solid = (x, y) => map.solid(Math.floor(x / T), Math.floor(y / T));
    const shots = [];
    const R = RAIKAKU;
    function spawn(id, x, y, arena) {
      return { id, kind: 'boss', x, y, vx: 0, vy: 0, face: -1, hp: R.hp, hpMax: R.hp, state: 'wait', f: 0, hitT: 0, dead: false, deadF: 0, arena, seq: 0, blocks: 0, stormCd: 0, charged: false, ev: [] };
    }
    const tall = e => (e.state === 'rush' ? R.rushH : R.h);
    const box = e => ({ x0: e.x - R.w, x1: e.x + R.w, y0: e.y, y1: e.y + tall(e) });
    const onGround = e => solid(e.x, e.y - 0.5);
    function phys(e) {
      if (!onGround(e) || e.vy > 0) {
        if (e.vy < -R.fallCap) e.vy = -R.fallCap; e.vy -= R.gravity;
        let ny = e.y + e.vy; if (e.vy < 0 && solid(e.x, ny)) { ny = (Math.floor(ny / T) + 1) * T; e.vy = 0; } e.y = ny;
      }
      const lo = e.arena.x0 + R.w, hi = e.arena.x1 - R.w; e.x = Math.max(lo, Math.min(hi, e.x + e.vx));
      return e.x <= lo || e.x >= hi;
    }
    const fast = e => e.hp <= e.hpMax / 2, K = e => (fast(e) ? 1.3 : 1);
    function go(e, st) { e.state = st; e.f = 0; }
    function next(e) {
      if (fast(e) && e.stormCd <= 0) { e.stormCd = R.storm.cd; go(e, 'storm_tele'); return; }
      e.stormCd--; go(e, ORDER[e.seq++ % ORDER.length]); if (e.state === 'guard') e.blocks = 0;
    }
    function step(e, p) {
      e.f++; e.ev = [];
      if (e.dead) { e.deadF++; e.vx = 0; return; }
      if (e.hitT > 0) e.hitT--;
      const k = K(e), dx = p ? p.x - e.x : 0, toward = dx < 0 ? -1 : 1;
      switch (e.state) {
        case 'wait': e.vx = 0; break;
        case 'walk': e.face = toward; e.vx = e.face * R.walk * k; if (e.f > R.rest / k) { e.vx = 0; next(e); } break;
        case 'stomp_tele': e.vx = 0; e.face = toward; if (e.f >= R.stomp.tele / k) {
          for (const d of [-1, 1]) shots.push({ kind: 'wave', x: e.x + d * R.w, y: e.y, vx: d * R.stomp.wave * k, vy: 0, w: 14, h: 26, life: R.stomp.waveLife });
          e.ev.push('stomp'); go(e, 'stomp'); } break;
        case 'stomp': if (e.f >= R.stomp.hitF) go(e, 'recover'); break;
        case 'discharge_tele': e.vx = 0; if (e.f >= R.discharge.tele / k) {
          const n = fast(e) ? R.discharge.nFast : R.discharge.n;
          for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (e.seq % 2 ? Math.PI / n : 0); shots.push({ kind: 'spark', x: e.x, y: e.y + 66, vx: Math.cos(a) * R.discharge.speed, vy: Math.sin(a) * R.discharge.speed, w: 9, h: 9, life: R.discharge.life }); }
          e.ev.push('discharge'); go(e, 'discharge'); } break;
        case 'discharge': if (e.f >= R.discharge.f) go(e, 'recover'); break;
        case 'guard': e.vx = 0; e.face = toward;
          if (e.blocks >= R.guard.blocks) { go(e, 'counter_tele'); break; }
          if (e.f >= R.guard.dur) go(e, 'recover'); break;
        case 'counter_tele': if (e.f >= R.guard.counterTele) { shots.push({ kind: 'burst', x: e.x, y: e.y + 56, r: 10, rMax: R.counter.r, life: R.counter.f, f: 0 }); e.ev.push('counter'); go(e, 'recover'); } break;
        case 'rush_tele': e.vx = 0; e.face = toward; if (e.f >= R.rush.tele / k) { e.vx = e.face * R.rush.speed * k; go(e, 'rush'); } break;
        case 'rush': break;
        case 'storm_tele': e.vx = 0; if (e.f >= R.storm.tele) { e.charged = true; e.ev.push('storm'); go(e, 'storm'); } break;
        case 'storm':
          e.vx = 0; e.face = toward;
          if (e.f % Math.round(R.storm.every / k) === 1 && p) { const x = Math.max(e.arena.x0 + 20, Math.min(e.arena.x1 - 20, p.x)); shots.push({ kind: 'bolt', x, y: e.arena.floor != null ? e.arena.floor : e.y, tele: R.storm.strikeTele, f: 0, w: R.storm.w, life: R.storm.strikeTele + R.storm.strikeF }); }
          if (e.f >= R.storm.dur) { e.charged = false; go(e, 'recover'); }
          break;
        case 'recover': e.vx = 0; if (e.f >= R.recover / k) go(e, 'walk'); break;
      }
      const atWall = phys(e);
      if (e.state === 'rush' && (atWall || e.f > 200)) { e.vx = 0; e.ev.push('rushwall'); go(e, 'recover'); }
    }
    function stepShots() {
      for (const s of shots) {
        s.life--;
        if (s.kind === 'wave') { s.x += s.vx; if (solid(s.x + Math.sign(s.vx) * s.w, s.y + 6)) s.life = 0; }
        else if (s.kind === 'spark') { s.x += s.vx; s.y += s.vy; if (solid(s.x, s.y) || s.y < 0) s.life = 0; }
        else if (s.kind === 'burst') { s.f++; s.r = 10 + (s.rMax - 10) * Math.min(1, s.f / 6); }
        else if (s.kind === 'bolt') { s.f++; }
      }
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].life <= 0) shots.splice(i, 1);
    }
    // 当たりの箱（害の無い間＝落雷の予兆は null）
    function shotBox(s) {
      if (s.kind === 'bolt') return s.f > s.tele ? { x0: s.x - s.w, x1: s.x + s.w, y0: s.y, y1: s.y + 600 } : null;
      if (s.kind === 'burst') { const r = s.r * 0.75; return { x0: s.x - r, x1: s.x + r, y0: s.y - r, y1: s.y + r }; }
      if (s.kind === 'wave') return { x0: s.x - s.w, x1: s.x + s.w, y0: s.y, y1: s.y + s.h };
      return { x0: s.x - s.w, x1: s.x + s.w, y0: s.y - s.h, y1: s.y + s.h };
    }
    // 攻撃を受ける。fromX：攻撃した自機の x（ガードの向き）。戻り値：true 当たった・'block' 雷殻で防いだ・false 当たらない
    function hurt(e, dmg, fromX) {
      if (e.dead || e.state === 'wait') return false;
      const front = fromX == null || (fromX - e.x) * e.face >= 0;
      if ((e.state === 'guard' || e.state === 'counter_tele') && front) { if (e.state === 'guard') e.blocks++; return 'block'; }
      if (e.state === 'guard') go(e, 'recover');                       // 後ろから当てるとガードが崩れる
      e.hp -= dmg; e.hitT = R.flinch;
      if (e.hp <= 0) { e.hp = 0; e.dead = true; e.deadF = 0; e.charged = false; shots.length = 0; }
      return true;
    }
    const wake = e => { if (e.state === 'wait') go(e, 'walk'); };
    const telegraph = e => /_tele$/.test(e.state) || e.state === 'guard';
    // ドット絵のコマ（assets/runner/raikaku.json の 行_列）。絵は左向き
    function frame(e) {
      const f = e.f, cyc = (row, ks, sp) => row + '_' + ks[Math.floor(f / sp) % ks.length], prog = (row, ks, n) => row + '_' + ks[Math.min(ks.length - 1, Math.floor(f / Math.max(1, n) * ks.length))];
      if (e.dead) return '7_' + Math.min(7, 3 + Math.floor(e.deadF / 14));
      if (e.hitT > 0 && !['guard', 'rush', 'storm', 'counter_tele'].includes(e.state)) return '7_' + Math.min(2, Math.floor((R.flinch - e.hitT) / 4));
      switch (e.state) {
        case 'walk': return cyc(1, [0, 1, 2, 3, 4, 5, 6, 7], 7);
        case 'stomp_tele': return prog(2, [0, 1, 2, 3], R.stomp.tele);
        case 'stomp': return prog(2, [4, 5, 6, 7], R.stomp.hitF);
        case 'discharge_tele': return prog(3, [0, 1, 2, 3], R.discharge.tele);
        case 'discharge': return cyc(3, [4, 5, 6], 5);
        case 'guard': return f < 8 ? '4_1' : f < 14 ? '4_2' : cyc(4, [3, 5], 9);
        case 'counter_tele': return '4_4';
        case 'rush_tele': return prog(5, [0, 1], R.rush.tele);
        case 'rush': return cyc(5, [2, 3, 4, 5], 4);
        case 'storm_tele': return prog(6, [0, 1, 2, 3], R.storm.tele);
        case 'storm': return cyc(6, [4, 5, 6], 6);
        case 'recover': return f < 10 ? '0_7' : cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
      }
      return cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
    }
    return { spawn, step, stepShots, shots, box, shotBox, hurt, wake, telegraph, frame };
  }
  const visible = () => BOSSES.filter(b => !b.hidden);
  // 隠しボスに会える（倒したボスの id の並び beaten が、隠しでないボスを全員ふくむ）
  const coldUnlocked = beaten => visible().every(b => (beaten || []).includes(b.id));
  const API = { BOSSES, RAIKAKU, make, visible, coldUnlocked };
  root.RunnerBosses = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
