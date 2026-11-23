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
    // ── 面ごとの敵（利用者の希望「ロックマンX4 風」：面ごとに違う動きの敵。名前・見た目はこのゲームの物で、どれも仮） ──
    // 屋上（風斬の面）：瓦投げ＝屋根の上から放物線で瓦を投げる（落ちる所へ狙う）・風凧＝空を横に漂い、斜め下へ風の刃を飛ばす
    thrower: { name: '瓦投げ（仮）', hp: 3, w: 13, h: 38, every: 110, tele: 24, range: 380, flight: 52, touch: 1 },
    kite: { name: '風凧（仮）', hp: 2, w: 16, h: 24, speed: 1.1, span: 120, every: 120, tele: 20, range: 300, shot: 4.2, touch: 1, fly: true },
    // 排水路（濁流の面）：泥がえる＝間をおいて自機の方へ跳ねる・排水の目＝ふだんは閉じて攻撃が効かず、開くと水の玉を 3 つ噴き上げる（開いている間だけ効く）
    hopper: { name: '泥がえる（仮）', hp: 2, w: 13, h: 22, wait: 54, hop: 8.6, hopX: 2.6, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1 },
    spout: { name: '排水の目（仮）', hp: 3, w: 16, h: 30, every: 130, tele: 30, open: 60, n: 3, shot: 6.5, range: 420, touch: 1, still: true },
    // 送電区（雷殻の面）：火花虫＝歩き、時々止まって火花をまとう（まとう間は周りに触れると やられ）・碍子の盾＝正面の攻撃を盾で防ぐ。後ろから・溜め斬り・飛ぶ斬撃・雷突きで崩れる
    crawler: { name: '火花虫（仮）', hp: 2, w: 13, h: 18, speed: 0.9, every: 150, tele: 26, spark: 56, aura: 42, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1 },
    shield: { name: '碍子の盾（仮）', hp: 3, w: 14, h: 44, speed: 0.55, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1, breakBy: ['charge', 'charge_air', 'wave', 'raitotsu'] },
    // ── 雨坊主・からかさの代わりに足した面ごとの敵（docs/minigames/runner-hard-enemies.md の案） ──
    // 屋上：つむじ坊＝回りながら行き来し、近づくと ふくらんで自機を吸い寄せる・鳥居烏＝高い所にとまり、真下を通ると時間をずらして急降下して戻る
    tsumuji: { name: 'つむじ坊', hp: 2, w: 13, h: 30, speed: 1.3, every: 130, tele: 22, pull: 44, range: 170, force: 1.6, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1 },
    karasu: { name: '鳥居烏', hp: 1, w: 12, h: 18, under: 46, dive: 6.5, back: 2.6, touch: 1, fly: true },
    // 排水路：ごみ袋坊＝転がって行き来し、斬ると小さな袋 2 つに分かれる・しぶき鯉＝水面から弧を描いて跳ぶ（水位が上がると出る高さも上がる）
    gomi: { name: 'ごみ袋坊', hp: 2, w: 14, h: 26, speed: 1.0, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1 },
    gomi_s: { name: 'ごみ袋坊（小）', hp: 1, w: 9, h: 16, wait: 34, hop: 6.4, hopX: 2.2, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1 },
    koi: { name: 'しぶき鯉', hp: 1, w: 13, h: 22, every: 120, tele: 34, jump: 11.5, g: 0.3, range: 260, touch: 1, fly: true },
    // 送電区：電線ねずみ＝高い所（足場の裏・電線）を走り、真上に来ると落ちてくる・ぱちぱち玉＝漂って寄り、割れる（近づきすぎても）と左右へ火花
    nezumi: { name: '電線ねずみ', hp: 1, w: 11, h: 14, speed: 2.6, span: 110, drop: 26, gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, touch: 1 },
    pachi: { name: 'ぱちぱち玉', hp: 1, w: 11, h: 22, speed: 0.6, range: 320, near: 44, fuse: 22, spark: 4.2, touch: 1, fly: true },
  };
  // 面ごとの敵の一覧（試験と説明のため）
  const STAGE_FOES = { okujo: ['thrower', 'kite', 'tsumuji', 'karasu'], haisui: ['hopper', 'spout', 'gomi', 'koi'], koka: ['crawler', 'shield', 'nezumi', 'pachi'] };
  const SHOT = { tile: { w: 9, h: 9, g: 0.32 }, gust: { w: 12, h: 9, g: 0 }, water: { w: 8, h: 8, g: 0.3 }, spark: { w: 9, h: 7, g: 0 } };
  const DEATH_F = 24;                                               // 倒れて消えるまで

  function make(map, opts = {}) {
    const T = map.tile;
    const solid = (x, y) => map.solid(Math.floor(x / T), Math.floor(y / T));
    const ledges = map.ledges || [];
    // 足もとに床があるか（マスの床・好きな高さの足場）
    const stand = (x, y) => solid(x, y - 0.5) || ledges.some(L => x > L.x0 && x < L.x1 && Math.abs(y - L.y) < 1);
    // y から下で いちばん高い床の高さ（無ければ -Infinity）
    function floorAt(x, y) {
      let top = -Infinity; for (let cy = Math.floor((y - 0.5) / T); cy >= 0; cy--) if (solid(x, cy * T + 1)) { top = (cy + 1) * T; break; }
      for (const L of ledges) if (x > L.x0 && x < L.x1 && L.y <= y + 0.5 && L.y > top) top = L.y; return top;
    }
    const shots = [], born = [];   // born：倒れて分かれた敵（runner_hard.js が敵の並びへ足す）
    const waterAt = x => (typeof opts.waterAt === 'function' ? opts.waterAt(x) : null);   // しぶき鯉：その場所の水面の高さ（増水で変わる）
    function spawn(type, x, y, face = -1) {
      const D = TYPES[type];
      if (!D.fly && type !== 'nezumi') { const fy = floorAt(x, y + 0.5); if (fy > -Infinity) y = fy; }   // 地上の敵は足もとの床へ下ろす（電線ねずみは高い所を走る）
      const st = type === 'koi' ? 'under' : type === 'nezumi' ? 'run' : D.fly ? 'hover' : D.still ? 'shut' : 'walk';
      return { type, x, y, home: { x, y }, vx: 0, vy: 0, face, hp: D.hp, state: st, f: 0, cd: 40 + ((x * 7) | 0) % 50, hitT: 0, kb: 0, dead: false, gone: false, deadF: 0, delay: ((x / 40) | 0) % 2 ? 18 : 0 };
    }
    const toward = (e, p) => (p && p.x < e.x ? -1 : 1);
    const near = (e, p, r) => !!p && Math.abs(p.x - e.x) < r && Math.abs(p.y - e.y) < 260;
    const hidden = e => e.type === 'koi' && (e.state === 'under' || e.state === 'tele');   // 水の中の鯉は当たらない
    function box(e) { const D = TYPES[e.type]; if (hidden(e)) return { x0: 0, x1: -1, y0: 0, y1: -1 }; return { x0: e.x - D.w, x1: e.x + D.w, y0: e.y, y1: e.y + D.h }; }
    // 1 こま（p：自機の位置）
    function step(e, p) {
      const D = TYPES[e.type]; e.f++;
      if (e.dead) { e.deadF++; if (e.deadF >= DEATH_F) e.gone = true; return; }
      if (e.hitT > 0) {                                               // のけぞり：押し戻されるだけ
        e.hitT--; const nx = e.x + e.kb; if (!solid(nx + Math.sign(e.kb) * D.w, e.y + 4)) e.x = nx; e.kb *= 0.8;
        if (!D.fly) fall(e, D); return;
      }
      if (SPECIAL[e.type]) return SPECIAL[e.type](e, D, p);
      if (D.fly) return flyStep(e, D, p);
      // 歩く：前が壁か崖なら向きを変える
      walkOn(e, D, D.speed);
      fall(e, D);
    }
    function walkOn(e, D, v) {
      const ahead = e.x + e.face * (D.w + 2);
      if (solid(ahead, e.y + 4) || !stand(ahead, e.y)) e.face = -e.face; else e.x += e.face * v;
    }
    function fall(e, D) {
      if (e.vy <= 0 && stand(e.x, e.y)) { e.vy = 0; return; }
      if (e.vy < -D.fallCap) e.vy = -D.fallCap; e.vy -= D.gravity;
      const ny = e.y + e.vy;
      if (e.vy < 0) { const fy = floorAt(e.x, e.y); if (ny <= fy) { e.y = fy; e.vy = 0; e.landed = true; return; } }
      if (e.vy > 0 && solid(e.x, ny + (D.h || 20))) { e.vy = 0; return; }
      e.y = ny; if (e.y < -200) e.gone = true;
    }
    // 弾（瓦・風の刃・水の玉）：重さで落ちる物もある。壁・床で消える
    function shoot(kind, x, y, vx, vy) { shots.push(Object.assign({ kind, x, y, vx, vy, life: 200 }, SHOT[kind])); }
    function stepShots() {
      for (const s of shots) { s.life--; s.vy -= s.g; s.x += s.vx; s.y += s.vy; if (solid(s.x, s.y) || s.y < -100 || (s.vy < 0 && ledges.some(L => s.x > L.x0 && s.x < L.x1 && s.y <= L.y && s.y - s.vy > L.y))) s.life = 0; }
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].life <= 0) shots.splice(i, 1);
    }
    const shotBox = s => ({ x0: s.x - s.w, x1: s.x + s.w, y0: s.y - s.h, y1: s.y + s.h });
    // 放物線で (tx, ty) に落ちる初速（t こまで着く）
    const lob = (x, y, tx, ty, t, g) => ({ vx: (tx - x) / t, vy: (ty - y) / t + g * t / 2 });
    const SPECIAL = {
      thrower(e, D, p) {
        fall(e, D); e.face = toward(e, p);
        if (e.state === 'tele') { if (e.f >= D.tele) { const tx = p.x + (p.vx || 0) * D.flight * .5, v = lob(e.x, e.y + 34, tx, p.y + 10, D.flight, SHOT.tile.g); shoot('tile', e.x + e.face * 8, e.y + 34, v.vx, v.vy); e.state = 'walk'; e.f = 0; e.cd = D.every; } return; }
        if (--e.cd <= 0 && near(e, p, D.range)) { e.state = 'tele'; e.f = 0; }
      },
      kite(e, D, p) {
        e.x = e.home.x + Math.sin(e.f * 0.012 * D.speed) * D.span; e.y = e.home.y + Math.sin(e.f * 0.05) * 14; e.face = toward(e, p);
        if (e.state === 'tele') { if (e.f >= D.tele) { const dx = p.x - e.x, dy = (p.y + 24) - e.y, L = Math.hypot(dx, dy) || 1; shoot('gust', e.x, e.y, dx / L * D.shot, dy / L * D.shot); e.state = 'hover'; e.cd = D.every; } return; }
        if (--e.cd <= 0 && near(e, p, D.range) && p.y < e.y) { e.state = 'tele'; e.f = 0; }
      },
      hopper(e, D, p) {
        const onG = e.vy <= 0 && stand(e.x, e.y);
        if (onG) { e.vx = 0; if (e.state === 'hop') { e.state = 'walk'; e.f = 0; } if (e.state === 'walk' && e.f >= D.wait && p && Math.abs(p.x - e.x) < 360) { e.face = toward(e, p); e.vy = D.hop; e.vx = e.face * D.hopX; e.state = 'hop'; e.f = 0; e.y += 0.6; } }
        if (e.vx) { const nx = e.x + e.vx; if (!solid(nx + Math.sign(e.vx) * D.w, e.y + 6)) e.x = nx; else e.vx = 0; }
        fall(e, D);
      },
      spout(e, D, p) {
        e.face = toward(e, p);
        if (e.state === 'shut') { if (--e.cd <= 0 && near(e, p, D.range)) { e.state = 'tele'; e.f = 0; } return; }
        if (e.state === 'tele') { if (e.f >= D.tele) { for (let i = 0; i < D.n; i++) { const a = (i - (D.n - 1) / 2) * 0.5 + e.face * 0.35; shoot('water', e.x, e.y + D.h, Math.sin(a) * D.shot * .55, D.shot + Math.cos(a)); } e.state = 'open'; e.f = 0; } return; }
        if (e.state === 'open' && e.f >= D.open) { e.state = 'shut'; e.f = 0; e.cd = D.every; }
      },
      crawler(e, D, p) {
        fall(e, D);
        if (e.state === 'tele' || e.state === 'spark') { if (e.state === 'tele' && e.f >= D.tele) { e.state = 'spark'; e.f = 0; } else if (e.state === 'spark' && e.f >= D.spark) { e.state = 'walk'; e.f = 0; e.cd = D.every; } return; }
        walkOn(e, D, D.speed);
        if (--e.cd <= 0 && near(e, p, 300)) { e.state = 'tele'; e.f = 0; }
      },
      tsumuji(e, D, p) {   // ふくらんでいる間（pull）は e.pull に吸い寄せる強さを出す（runner_hard.js が自機を動かす）
        fall(e, D); e.pull = 0;
        if (e.state === 'tele') { if (e.f >= D.tele) { e.state = 'pull'; e.f = 0; } return; }
        if (e.state === 'pull') { if (p && Math.abs(p.x - e.x) < D.range && Math.abs(p.y - e.y) < 90) e.pull = D.force * (p.x < e.x ? 1 : -1); if (e.f >= D.pull) { e.state = 'walk'; e.f = 0; e.cd = D.every; } return; }
        walkOn(e, D, D.speed);
        if (--e.cd <= 0 && near(e, p, 150)) { e.state = 'tele'; e.f = 0; }
      },
      karasu(e, D, p) {   // とまる → 真下を通ると（2 羽目は少し遅れて）まっすぐ急降下 → 元の所へ戻る
        if (e.state === 'hover') { e.y = e.home.y + Math.sin(e.f * .05) * 2; e.x = e.home.x; e.face = toward(e, p);
          if (p && Math.abs(p.x - e.x) < D.under && p.y < e.y - 40) { e.state = 'wait'; e.f = 0; } return; }
        if (e.state === 'wait') { if (e.f >= 6 + e.delay) { e.state = 'dive'; e.f = 0; const dx = p.x - e.x, dy = (p.y + 24) - e.y, L = Math.hypot(dx, dy) || 1; e.vx = dx / L * D.dive; e.vy = dy / L * D.dive; } return; }
        if (e.state === 'dive') { e.x += e.vx; e.y += e.vy; if (e.f > 40 || stand(e.x, e.y) || solid(e.x, e.y)) { e.state = 'back'; e.f = 0; } return; }
        const dx = e.home.x - e.x, dy = e.home.y - e.y, L = Math.hypot(dx, dy); if (L < 3) { e.state = 'hover'; e.f = 0; e.x = e.home.x; e.y = e.home.y; } else { e.x += dx / L * D.back; e.y += dy / L * D.back; }
      },
      gomi(e, D, p) { fall(e, D); walkOn(e, D, D.speed); e.roll = (e.roll || 0) + e.face * D.speed * .08; },
      gomi_s(e, D, p) { return SPECIAL.hopper(e, D, p); },
      koi(e, D, p) {   // 水の中 → 泡立つ（予兆）→ 跳ぶ（弧）→ 水へ戻る
        const surf = Math.max(e.home.y, waterAt(e.home.x) ?? -Infinity);
        if (e.state === 'under') { e.x = e.home.x; e.y = surf - 30; if (--e.cd <= 0 && near(e, p, D.range)) { e.state = 'tele'; e.f = 0; } return; }
        if (e.state === 'tele') { e.y = surf - 30; if (e.f >= D.tele) { e.state = 'jump'; e.f = 0; e.y = surf - 10; e.vy = D.jump; e.vx = Math.max(-1.6, Math.min(1.6, (p.x - e.x) / 60)); e.face = e.vx < 0 ? -1 : 1; } return; }
        e.vy -= D.g; e.x += e.vx; e.y += e.vy; if (e.vy < 0 && e.y < surf - 12) { e.state = 'under'; e.cd = D.every; e.home.x = e.x; }
      },
      nezumi(e, D, p) {   // 高い所を走る → 真上なら落ちる → 床に着くと走って寄る
        if (e.state === 'run') { e.x += e.face * D.speed; if (Math.abs(e.x - e.home.x) > D.span) { e.face = e.x > e.home.x ? -1 : 1; } e.y = e.home.y;
          if (p && Math.abs(p.x - e.x) < D.drop && p.y < e.y - 30) { e.state = 'fall'; e.f = 0; e.vy = 0; } return; }
        if (e.state === 'fall') { fall(e, D); if (e.vy === 0 && stand(e.x, e.y)) { e.state = 'walk'; e.f = 0; e.face = toward(e, p); } return; }
        fall(e, D); walkOn(e, D, D.speed * .8);
      },
      pachi(e, D, p) {   // 漂って寄る。近づきすぎると ちらついて弾ける（左右へ火花）
        if (e.state === 'fuse') { if (e.f >= D.fuse) burst(e); return; }
        const dx = p ? p.x - e.x : 0, dy = p ? p.y + 24 - e.y : 0, L = Math.hypot(dx, dy) || 1;
        if (p && L < D.range) { e.x += dx / L * D.speed; e.y += dy / L * D.speed * .6; } e.y += Math.sin(e.f * .08) * .5;
        if (p && L < D.near) { e.state = 'fuse'; e.f = 0; }
      },
      shield(e, D, p) {
        fall(e, D); if (e.f % 40 === 1) e.face = toward(e, p);
        if (p && Math.abs(p.x - e.x) > 30) walkOn(e, D, D.speed);
      },
    };
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
    // ぱちぱち玉が弾ける：左右へ火花
    function burst(e) { if (e.dead) return; const D = TYPES.pachi; for (const d of [-1, 1]) shoot('spark', e.x + d * 8, e.y + 12, d * D.spark, 0); e.dead = true; e.deadF = 0; e.burst = true; }
    // 攻撃が当たった（move：技の名前・fromX：攻撃した側の x）。戻り値：true 当たった・'block' 防いだ（盾・閉じた排水の目）
    function hurt(e, dmg, kb, move, fromX) {
      if (e.dead) return false;
      const D = TYPES[e.type];
      if (e.type === 'spout' && e.state !== 'open' && e.state !== 'tele') return 'block';
      if (e.type === 'shield' && !(D.breakBy || []).includes(move) && (fromX == null || (fromX - e.x) * e.face >= 0)) { e.f = 1; e.blocked = true; return 'block'; }
      e.hp -= dmg; e.hitT = 10; e.kb = D.still ? 0 : kb || 0; if (e.type === 'walker' || e.type === 'flyer' || e.type === 'karasu') e.state = D.fly ? 'back' : 'walk'; e.pull = 0;
      if (e.hp <= 0) {
        if (e.type === 'pachi') { burst(e); return true; }   // 割れると火花
        e.dead = true; e.deadF = 0;
        if (e.type === 'gomi') for (const d of [-1, 1]) { const c = spawn('gomi_s', e.x + d * 10, e.y + 2, d); c.vx = d * 2.2; c.vy = 5; c.state = 'hop'; born.push(c); }   // 小さな袋 2 つに分かれる
      }
      return true;
    }
    // 自機に害のある箱：弾・火花虫の火花（まとう間）
    function hazards() {
      const out = shots.map(shotBox);
      return out;
    }
    function auraBox(e) { const D = TYPES[e.type]; return e.type === 'crawler' && e.state === 'spark' && !e.dead ? { x0: e.x - D.aura, x1: e.x + D.aura, y0: e.y - 6, y1: e.y + D.aura } : null; }
    return { spawn, step, box, hurt, shots, born, stepShots, shotBox, hazards, auraBox, floorAt, stand, hidden };
  }
  const API = { TYPES, STAGE_FOES, SHOT, DEATH_F, make };
  root.RunnerEnemies = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
