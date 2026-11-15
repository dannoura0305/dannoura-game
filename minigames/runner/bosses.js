// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：ボス（段 5）
// ・ボスはデータの表（BOSSES）。人数・順番・面・覚える技は表を書き換えるだけで変わる（ボス選択画面は表から並べる）
// ・正式なボスの名前・見た目・能力・登場理由は未決定。今あるのは仕組みを確かめるための「仮のボス」1 体だけ
// ・隠しボス（風邪菌・仮）は表に枠だけ置く（hidden。まだ戦えない）
// ・DOM を使わない（node で試験する：tests/runner-hard-boss.test.mjs）。ふつうのスクリプトとして読むと RunnerBosses が生える
// ・座標は act.js と同じ（x 右が＋・y 上が＋・足もと）。1 こま＝1/60 秒
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const BOSSES = [
    { id: 'boss_a', name: '大きな雨坊主（仮）', stage: 'stage1', teaches: 'rising', hidden: false, order: null, reason: '（未定）' },
    // 隠しボス：通常ボスを全員倒した後にコンビニへ着くと、看病の場面から始まる（解放の条件は仮：設計案 §6-4 の案 A）。一度戦うと選択画面からも戦える
    { id: 'cold', name: '風邪菌（仮）', stage: 'home', teaches: null, hidden: true, unlock: 'after_all', reason: '子どもは元気になってきたのに、今度は看病していた自分が…' },
  ];
  // 仮のボス：大きな雨坊主（仮）。のしのし近づく・跳んで踏みつけ（地を這う波 2 つ）・雨粒を吐く（3 つ・山なり）。体力が半分を切ると速くなる
  const BOSS_A = { hp: 24, w: 24, h: 70, walk: 0.8, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1,
    slam: { tele: 34, jump: 14.5, wave: 4.6, waveLife: 70 }, spit: { tele: 26, n: 3, speed: 5.2 }, rest: 50, flinch: 8 };

  function make(map) {
    const T = map.tile, solid = (x, y) => map.solid(Math.floor(x / T), Math.floor(y / T));
    const shots = [];
    function spawn(id, x, y, arena) {
      return { id, kind: 'boss', x, y, vx: 0, vy: 0, face: -1, hp: BOSS_A.hp, hpMax: BOSS_A.hp, state: 'wait', f: 0, act: 0, hitT: 0, dead: false, deadF: 0, arena, seq: 0 };
    }
    const box = e => ({ x0: e.x - BOSS_A.w, x1: e.x + BOSS_A.w, y0: e.y, y1: e.y + BOSS_A.h });
    function onGround(e) { return solid(e.x, e.y - 0.5); }
    function phys(e) {
      if (!onGround(e) || e.vy > 0) {
        if (e.vy < -BOSS_A.fallCap) e.vy = -BOSS_A.fallCap; e.vy -= BOSS_A.gravity;
        let ny = e.y + e.vy; if (e.vy < 0 && solid(e.x, ny)) { ny = (Math.floor(ny / T) + 1) * T; e.vy = 0; e.landed = true; } e.y = ny;
      }
      let nx = e.x + e.vx; nx = Math.max(e.arena.x0 + BOSS_A.w, Math.min(e.arena.x1 - BOSS_A.w, nx)); e.x = nx;
    }
    const fast = e => e.hp <= e.hpMax / 2;
    function go(e, st) { e.state = st; e.f = 0; }
    // 1 こま（p：自機）
    function step(e, p) {
      e.f++; e.landed = false;
      if (e.dead) { e.deadF++; return; }
      if (e.hitT > 0) e.hitT--;
      const k = fast(e) ? 1.35 : 1, dx = p ? p.x - e.x : 0;
      switch (e.state) {
        case 'wait': e.vx = 0; break;                                            // 部屋に入るまで待つ（wake で起きる）
        case 'walk':
          e.face = dx < 0 ? -1 : 1; e.vx = e.face * BOSS_A.walk * k;
          if (e.f > BOSS_A.rest / k) { e.seq++; go(e, e.seq % 3 === 2 ? 'spit_tele' : 'slam_tele'); }
          break;
        case 'slam_tele': e.vx = 0; if (e.f >= BOSS_A.slam.tele / k) { e.vy = BOSS_A.slam.jump; e.vx = Math.max(-6, Math.min(6, dx / 40)); go(e, 'slam_air'); } break;
        case 'slam_air':
          if (e.landed || (onGround(e) && e.f > 4)) {
            e.vx = 0; for (const d of [-1, 1]) shots.push({ kind: 'wave', x: e.x + d * BOSS_A.w, y: e.y, vx: d * BOSS_A.slam.wave * k, vy: 0, w: 12, h: 22, life: BOSS_A.slam.waveLife });
            go(e, 'recover');
          }
          break;
        case 'spit_tele': e.vx = 0; e.face = dx < 0 ? -1 : 1; if (e.f >= BOSS_A.spit.tele / k) {
          for (let i = 0; i < BOSS_A.spit.n; i++) { const a = 0.55 + i * 0.28; shots.push({ kind: 'drop', x: e.x + e.face * 20, y: e.y + 56, vx: e.face * Math.cos(a) * BOSS_A.spit.speed * (0.6 + i * 0.25), vy: Math.sin(a) * BOSS_A.spit.speed, w: 7, h: 7, life: 150, g: 0.2 }); }
          go(e, 'recover'); } break;
        case 'recover': e.vx = 0; if (e.f >= 30 / k) go(e, 'walk'); break;
      }
      phys(e);
    }
    function stepShots() {
      for (const s of shots) {
        s.life--; s.x += s.vx; s.y += s.vy; if (s.g) s.vy -= s.g;
        if (s.kind === 'drop' && (solid(s.x, s.y) || s.y < 0)) s.life = 0;
        if (s.kind === 'wave' && solid(s.x + Math.sign(s.vx) * s.w, s.y + 6)) s.life = 0;
      }
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].life <= 0) shots.splice(i, 1);
    }
    const shotBox = s => ({ x0: s.x - s.w, x1: s.x + s.w, y0: s.y - (s.kind === 'drop' ? s.h : 0), y1: s.y + s.h });
    function hurt(e, dmg) {
      if (e.dead || e.state === 'wait') return false;
      e.hp -= dmg; e.hitT = BOSS_A.flinch;
      if (e.hp <= 0) { e.hp = 0; e.dead = true; e.deadF = 0; shots.length = 0; }
      return true;
    }
    const wake = e => { if (e.state === 'wait') go(e, 'walk'); };
    return { spawn, step, stepShots, shots, box, shotBox, hurt, wake, telegraph: e => e.state === 'slam_tele' || e.state === 'spit_tele' };
  }
  const visible = () => BOSSES.filter(b => !b.hidden);
  // 隠しボスに会える（倒したボスの id の並び beaten が、隠しでないボスを全員ふくむ）
  const coldUnlocked = beaten => visible().every(b => (beaten || []).includes(b.id));
  const API = { BOSSES, BOSS_A, make, visible, coldUnlocked };
  root.RunnerBosses = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
