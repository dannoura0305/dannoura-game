// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版（試作・段 3：試しの 1 面）
// 横スクロールの 2D アクション。自機の動きは minigames/runner/act.js（RunnerAct・1/60 の固定の歩み）。
// ・まだ試作：開発用の印（URL に ?runnerhard=1）がある時だけ選択画面に出る（minigames/core.js の末尾）。通常版（runner.js）には触らない
// ・この段では攻撃・敵・ボスは無い（段 4 から）。傘を差して走る・跳ぶ・ダッシュ・壁ずり・壁蹴り・スライドで、コンビニまで行く
// ・主人公の絵は通常版（runner.js の drawFigure・drawUmbrella）を写した物。共通のファイルに寄せるのは後の段
// 設計：docs/minigames/runner-hard-design.md
// ══════════════════════════════════════════════════════════
addMinigameStyle('runner_hard', `
.mg-runner_hard{background:#05040e;}
.mg-runner_hard .rh-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;}
`);

// 試しの 1 面（区間の並び）。寸法：地面の上は y=80（2 マス）
var RunnerHardStage = RunnerHardStage || {
  W: 152, H: 14,
  rows() {
    const W = this.W, H = this.H, g = Array.from({ length: H }, () => Array(W).fill('.'));
    const put = (c, cy, ch) => { if (c >= 0 && c < W && cy >= 0 && cy < H) g[H - 1 - cy][c] = ch; };
    const fill = (c0, c1, y0, y1, ch = '#') => { for (let c = c0; c <= c1; c++) for (let y = y0; y <= y1; y++) put(c, y, ch); };
    fill(0, W - 1, 0, 1);                       // 地面（上が y=80）
    fill(0, 0, 2, H - 1); fill(W - 1, W - 1, 2, H - 1);   // 両端の壁
    put(2, 2, 'S');
    fill(14, 15, 2, 2);                         // 箱（1 マス）：ふつうのジャンプ
    fill(22, 24, 0, 1, '.'); fill(22, 24, 0, 0, '^');      // 穴（3 マス・とげ）：歩きながらのジャンプで越える
    fill(30, 32, 5, 5, '='); fill(36, 38, 7, 7, '=');      // ひさし（上からだけ乗れる）：寄り道
    put(42, 2, 'C');                            // 途中の印
    fill(48, 62, 2, 6);                         // 高い塀（5 マス＝200px）：ジャンプでは届かない → 壁蹴りで登る
    fill(70, 75, 0, 1, '.'); fill(70, 75, 0, 0, '^');      // 広い穴（6 マス＝240px）：歩きのジャンプ（約 154px）では届かない → ダッシュジャンプ（約 363px）
    put(66, 2, 'C');
    fill(84, 94, 3, H - 2);                     // 低い天井（すき間 40px）：スライドでくぐる
    put(100, 2, 'C');
    // ボスの部屋（列 108〜134）：入ると後ろ（107）の柵が閉まり、倒すと前（135）の柵が開く（柵は runner_hard.js が map.extra に足す）
    put(144, 2, 'G');                           // コンビニの戸（ボスの部屋の先）
    return g.map(r => r.join(''));
  },
  // 弱い敵の置き場所 [種類, 列, 高さ（マス）, 向き]（名前・見た目は仮）
  enemies() {
    return [['walker', 19, 2, -1], ['flyer', 34, 6, -1], ['walker', 40, 2, -1], ['walker', 56, 7, -1], ['walker', 80, 2, -1], ['flyer', 97, 4, -1]];
  },
  // ボスの部屋：[入口の列, 出口の列]（柵は c0-1 と c1+1）・ボスの立つ列・どのボスか（RunnerBosses.BOSSES の id）
  arena() { return { c0: 108, c1: 134, bossC: 128, boss: 'boss_a' }; },
};

registerMinigame({
  id: 'runner_hard', icon: '☔', name: '買い出しダッシュ（高難易度版・試作）', genre: 'アクション', bgm: 'mg_runner',
  desc: '試作：横スクロールのアクション。走る・跳ぶ・ダッシュ・壁蹴り・傘で斬って、雨の町をコンビニまで。ボスを倒すと技を覚える。',
  effect: '育児ストレス↓ 精神↑ ／ 疲労+8 約40分',
  help: '←→:移動 Z:ジャンプ X:攻撃 C:ダッシュ ↓:スライド ↑+X:覚えた技',
  start(body, mg) {
    const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), rnd = (a, b) => a + Math.random() * (b - a);
    // ── 記録（gs.runnerHard。通常版の gs.runnerData には触らない） ──
    if (!gs.runnerHard || typeof gs.runnerHard !== 'object') gs.runnerHard = { v: 1, beaten: [], moves: [], proto: { plays: 0, clears: 0, bestTime: 0 } };
    const REC = gs.runnerHard; if (!REC.proto) REC.proto = { plays: 0, clears: 0, bestTime: 0 };

    const cv = document.createElement('canvas'); cv.className = 'rh-cv'; cv.tabIndex = 0; body.appendChild(cv);
    const cx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, sc = 1, VW = 0, VH = 560;
    function resize() {
      const r = body.getBoundingClientRect();
      W = Math.max(240, Math.floor(r.width)); H = Math.max(240, Math.floor(r.height));
      dpr = Math.min(3, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
      sc = Math.min(H / 560, W / 520); VW = W / sc; VH = H / sc;   // 縦の 560（14 マス）は必ず入れ、横も最低 520 は見せる（縦長のスマホでは上に空が広がる）
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (!mg._ended) resize(); }) : null;

    // ── 面（試しの 1 面）：区間ごとに組み立てる（1 マス 40px・縦 14 マス＝560）。上の行が高い所
    //  # 床・壁　= 上からだけ乗れる床（店のひさし）　^ とげ（割れた植木鉢の破片）　S 始まり　C 途中の印　G コンビニの戸
    //  通れることは tests/runner-hard-stage.test.mjs で自機を動かして確かめる
    const ROWS = RunnerHardStage.rows();
    let act = null, map = null, B = null, C = null, E = null, foes = [], kills = 0, hitStop = 0, acc = 0, prevIn = {};
    let BZ = null, boss = null, AR = null, arenaOn = false, selIdx = 0, learnedNow = null;
    const selList = () => RunnerBosses.visible();
    let spawn = { x: 0, y: 0 }, check = { x: 0, y: 0 }, goal = { x: 0, y: 0 };

    // ── 状態 ──
    let phase = 'load', phaseT = 0, t = 0, hp = 5, falls = 0, hurts = 0, runTime = 0, outcome = null, committed = false, camX = 0, camY = 0, shake = 0, flash = 0, banner = null;
    // 難しさ（ミニゲームの選択画面の「やさしい・ふつう・むずかしい」）。むずかしい＝受け取った数値のまま（元の作品の形）
    const DIFF = typeof mgDifficulty === 'function' ? mgDifficulty() : 'normal';
    const DF = {
      easy: { hp: 7, boss: .75, phys: { wallStickF: 14, coyoteF: 6, bufferF: 6, invulF: 90 } },
      normal: { hp: 5, boss: 1, phys: { wallStickF: 10, coyoteF: 4, bufferF: 4, invulF: 72 } },
      hard: { hp: 4, boss: 1.25, phys: {} },
    }[DIFF] || null;
    const HP_MAX = DF ? DF.hp : 5; hp = HP_MAX;
    const P = []; for (let i = 0; i < 160; i++) P.push({ a: false, x: 0, y: 0, vx: 0, vy: 0, l: 0, m: 1, c: '#fff', s: 2, g: 0 });
    function emit(x, y, vx, vy, l, c, s, g) { for (const p of P) if (!p.a) { Object.assign(p, { a: true, x, y, vx, vy, l, m: l, c, s, g }); return; } }
    const RN = 180, rx = new Float32Array(RN), ry = new Float32Array(RN), rl = new Float32Array(RN), rv = new Float32Array(RN);
    function initRain() { for (let i = 0; i < RN; i++) { rx[i] = Math.random() * (VW + 120); ry[i] = Math.random() * VH; rl[i] = 9 + Math.random() * 12; rv[i] = 620 + Math.random() * 320; } }

    // ── 効果音（通常版と同じく合成。AUDIO_SET.se に従う） ──
    function actx() { if (typeof AU === 'undefined' || typeof AUDIO_SET === 'undefined' || !(AUDIO_SET.se > 0)) return null; try { AU.init(); } catch (e) {} const c = AU.ctx; if (c && c.state === 'suspended') c.resume().catch(() => {}); return c; }
    function blip(type, f0, f1, dur, g) { const c = actx(); if (!c) return; const t0 = c.currentTime, o = c.createOscillator(), v = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t0); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); v.gain.setValueAtTime(.0001, t0); v.gain.linearRampToValueAtTime(g * AUDIO_SET.se, t0 + .008); v.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(v); v.connect(AU.out || c.destination); o.start(t0); o.stop(t0 + dur + .02); }
    const SE = { swing: big => { blip('sawtooth', big ? 900 : 1300, big ? 300 : 500, big ? .16 : .1, .05); }, hit: dead => { blip('square', dead ? 180 : 260, dead ? 60 : 140, dead ? .22 : .09, .12); }, jump: () => blip('triangle', 420, 760, .12, .12), dash: () => blip('sawtooth', 160, 90, .14, .05), kick: () => blip('square', 300, 620, .1, .07), land: () => blip('sine', 140, 70, .08, .12), hurt: () => blip('square', 220, 90, .25, .1), slide: () => blip('sawtooth', 120, 80, .2, .04), check: () => { blip('sine', 660, 0, .12, .09); setTimeout(() => blip('sine', 990, 0, .2, .08), 90); }, clear: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip('triangle', f, 0, .25, .1), i * 110)) };

    // ── 入力：キーボード・ゲームパッド・画面のボタン ──
    const K = { l: false, r: false, j: false, d: false, dn: false, atk: false, up: false };
    const keyMap = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', z: 'j', Z: 'j', ' ': 'j', ArrowUp: 'up', w: 'up', W: 'up', c: 'd', C: 'd', Shift: 'd', ArrowDown: 'dn', s: 'dn', S: 'dn', x: 'atk', X: 'atk' };
    mg.onKey(e => {
      const k = keyMap[e.key]; if (!k) { if (e.key === 'Enter' && e.type === 'keydown') advance(); return; }
      e.preventDefault(); K[k] = e.type === 'keydown';
      if (e.type === 'keydown' && (k === 'j' || k === 'atk') && !e.repeat) advance();
      if (e.type === 'keydown' && phase === 'select' && (k === 'l' || k === 'r')) selIdx = (selIdx + (k === 'r' ? 1 : -1) + selList().length) % selList().length;
    });
    function padInput() {
      const o = { l: false, r: false, j: false, d: false, dn: false, atk: false, up: false };
      let pads = []; try { pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : []; } catch (e) {}
      for (const g of pads) {
        const b = i => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        o.l = o.l || b(14) || ax < -.4; o.r = o.r || b(15) || ax > .4; o.dn = o.dn || b(13) || ay > .6; o.up = o.up || b(12) || ay < -.6;
        o.j = o.j || b(0); o.atk = o.atk || b(2) || b(3); o.d = o.d || b(1) || b(5) || b(7);   // A ジャンプ・X（Y）攻撃・B（RB・RT）ダッシュ
        if (b(0) && !padPrevA) advance(); padPrevA = b(0);
      }
      return o;
    }
    let padPrevA = false;
    // 画面のボタン（スマホ）：左下に ← →、右下に ジャンプ・ダッシュ・スライド。複数の指に対応
    const touches = new Map(); let showTouch = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
    const btns = () => { const r = 34, y = VH - 58; return [{ k: 'l', x: 52, y, r, lab: '◀' }, { k: 'r', x: 132, y, r, lab: '▶' }, { k: 'up', x: 92, y: y - 126, r: 24, lab: '▲' }, { k: 'dn', x: 92, y: y - 66, r: 26, lab: '▼' }, { k: 'd', x: VW - 212, y: y + 4, r: 30, lab: 'ダッシュ' }, { k: 'atk', x: VW - 136, y: y - 4, r: 34, lab: '攻撃' }, { k: 'j', x: VW - 58, y: y - 30, r: 38, lab: 'ジャンプ' }]; };
    function touchKeys() { const o = { l: false, r: false, j: false, d: false, dn: false, atk: false, up: false }; for (const p of touches.values()) for (const b of btns()) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 14) o[b.k] = true; return o; }
    const toV = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc }; };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); if (e.pointerType === 'touch') showTouch = true; if (advance()) return; try { cv.setPointerCapture(e.pointerId); } catch (_) {} touches.set(e.pointerId, toV(e)); });
    cv.addEventListener('pointermove', e => { if (touches.has(e.pointerId)) touches.set(e.pointerId, toV(e)); });
    const up = e => touches.delete(e.pointerId); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('contextmenu', e => e.preventDefault());
    function readInput() { const p = padInput(), tch = showTouch ? touchKeys() : {}; const o = {}; for (const k of ['l', 'r', 'j', 'd', 'dn', 'atk', 'up']) o[k] = !!(K[k] || p[k] || tch[k]); return o; }

    // ── 流れ ──
    function advance() {
      if (phase === 'intro' && phaseT > .4) { phase = 'select'; phaseT = 0; return true; }
      if (phase === 'select' && phaseT > .3) { phase = 'play'; phaseT = 0; banner = { t: 0, txt: 'STAGE 1　雨の住宅街（試作）' }; return true; }
      if (phase === 'learn' && phaseT > .8) { finishLearn(); return true; }
      if (phase === 'clear' && phaseT > 1.6) { finish(); return true; }
      if (phase === 'over' && phaseT > 1.2) { finish(); return true; }
      return phase !== 'play';
    }
    function finish() { if (!mg._ended) mg.end(outcome || 'quit'); }
    function commit() {
      if (committed) return; committed = true;
      const R = REC.proto; R.plays = (R.plays | 0) + 1;
      if (outcome === 'clear') { R.clears = (R.clears | 0) + 1; if (!R.bestTime || runTime < R.bestTime) R.bestTime = Math.round(runTime * 10) / 10; }
    }
    function respawn() { B = act.body(check.x, check.y, 1); B.invul = 60; if (arenaOn && boss && !boss.dead) { arenaOn = false; setGates(false); boss = spawnBoss(); BZ.shots.length = 0; } }
    function spawnBoss() { const e = BZ.spawn(AR.boss, AR.bossC * map.tile + map.tile / 2, 2 * map.tile, AR); e.hp = e.hpMax = Math.round(e.hpMax * (DF ? DF.boss : 1)); return e; }
    function damage(n, why) {
      hp -= n; hurts++; flash = .8; shake = .3; SE.hurt(); if (mg.buzz) try { mg.buzz(40); } catch (_) {}
      if (hp <= 0) { hp = 0; phase = 'over'; phaseT = 0; outcome = 'down'; commit(); }
    }

    // ── 面を作る ──
    function build() {
      map = RunnerAct.makeMap(ROWS.map(r => r.replace(/[SCG]/g, '.')));
      const T = map.tile, Hh = ROWS.length;
      ROWS.forEach((row, r) => { for (let c = 0; c < row.length; c++) { const ch = row[c], p = { x: c * T + T / 2, y: (Hh - 1 - r) * T }; if (ch === 'S') spawn = p; if (ch === 'G') goal = p; if (ch === 'C') (checks.push(p)); } });
      // 印の足もとを床まで下ろす
      const drop = p => { let y = p.y; while (y > 0 && !map.solid(Math.floor(p.x / T), Math.floor((y - 1) / T))) y -= T; p.y = Math.max(0, Math.ceil(y / T) * T); };
      [spawn, goal, ...checks].forEach(drop);
      act = RunnerAct.make({ map, phys: DF ? DF.phys : {} }); C = RunnerCombat.make(act, { learned: REC.moves || [] }); E = RunnerEnemies.make(map);
      foes = RunnerHardStage.enemies().map(([type, c, cy, face]) => E.spawn(type, c * T + T / 2, cy * T, face));
      BZ = RunnerBosses.make(map); const a = RunnerHardStage.arena(); AR = Object.assign({}, a, { x0: a.c0 * T, x1: (a.c1 + 1) * T });
      if (!(REC.beaten || []).includes(a.boss)) boss = spawnBoss();
      check = { x: spawn.x, y: spawn.y }; B = act.body(spawn.x, spawn.y, 1);
      phase = 'intro'; phaseT = 0;
    }
    const checks = [];
    // だんのうらのドット絵（assets/runner/dannoura.webp・.json。利用者の絵）。読めるまで・読めない時は、今までのコードで描く人物
    let SPR = null;
    function loadSprite() {
      fetch('assets/runner/dannoura.json').then(r => r.json()).then(meta => {
        const img = new Image(); img.onload = () => { SPR = { img, F: meta.frames }; }; img.src = 'assets/runner/' + meta.image;
      }).catch(() => {});
    }
    // 自機の動き・技・敵（minigames/runner/*.js）を順に読む（読み込み済みなら読まない）
    function loadAct() {
      const need = [['RunnerAct', 'act'], ['RunnerCombat', 'combat'], ['RunnerEnemies', 'enemies'], ['RunnerBosses', 'bosses']].filter(([g]) => typeof window[g] === 'undefined');
      const next = () => {
        if (mg._ended) return; const n = need.shift(); if (!n) { build(); return; }
        const s = document.createElement('script'); s.src = 'minigames/runner/' + n[1] + '.js'; s.async = true;
        s.onload = next; s.onerror = () => { phase = 'error'; }; document.head.appendChild(s);
      };
      next();
    }

    // ── 1 こま（1/60 秒）：技 → 自機の動き → 踏み込み → 敵 → 当たり ──
    function frame(raw) {
      const inp = Object.assign({}, raw); inp.atkP = inp.atk && !prevIn.atk; inp.jP = inp.j && !prevIn.j; inp.dP = inp.d && !prevIn.d; prevIn = raw;
      if (hitStop > 0) { hitStop--; if (inp.atkP) B.atkBuf = RunnerCombat.BUFFER_F; return; }   // 当たった瞬間の止め（押した攻撃は覚えておく）
      const wasAtk = B.atk && B.atk.id + ':' + B.atk.chain;
      act.step(B, C.pre(B, inp)); C.post(B);
      if (B.atk && B.atk.id + ':' + B.atk.chain !== wasAtk) { SE.swing(B.atk.id === 'slash3'); }
      for (const e of foes) E.step(e, B);
      foes = foes.filter(e => !e.gone);
      // 攻撃が敵に当たる
      const hb = C.hitbox(B);
      if (hb) for (const e of foes) {
        if (e.dead || !RunnerCombat.overlap(hb, E.box(e)) || !C.tryHit(B, e)) continue;
        E.hurt(e, hb.dmg, hb.kb); hitStop = Math.max(hitStop, hb.hitstop); shake = Math.max(shake, hb.hitstop > 5 ? .25 : .12); SE.hit(e.dead);
        const ex = e.x, ey = e.y + 18; for (let i = 0; i < (e.dead ? 16 : 8); i++) emit(ex, ey, rnd(-160, 160), rnd(-60, 200), .35, i % 2 ? '#e8f0ff' : '#00e8c8', 2.2, 400);
        if (e.dead) kills++;
      }
      // ボスの部屋：入ると柵が閉まり、ボスが起きる
      if (boss && !boss.dead && !arenaOn && B.x > AR.x0 + 40 && B.y < 140) { arenaOn = true; setGates(true); BZ.wake(boss); banner = { t: 0, txt: 'ボス　' + bossDef().name }; SE.check(); }
      if (boss) {
        BZ.step(boss, B); BZ.stepShots();
        if (hb && !boss.dead && RunnerCombat.overlap(hb, BZ.box(boss)) && C.tryHit(B, boss)) { if (BZ.hurt(boss, hb.dmg)) { hitStop = Math.max(hitStop, hb.hitstop + 1); shake = Math.max(shake, .15); SE.hit(boss.dead); for (let i = 0; i < 10; i++) emit(boss.x, boss.y + 40, rnd(-180, 180), rnd(-40, 220), .4, i % 2 ? '#e8f0ff' : '#00e8c8', 2.4, 400); if (boss.dead) { shake = .6; SE.clear(); } } }
        if (boss.dead && boss.deadF === 70) { phase = 'learn'; phaseT = 0; learnedNow = bossDef().teaches; }
        if (B.invul <= 0 && B.state !== 'hurt') { const pb = act.box(B); let hit = !boss.dead && boss.state !== 'wait' && RunnerCombat.overlap(pb, BZ.box(boss)) ? boss.x : null; for (const sh of BZ.shots) if (RunnerCombat.overlap(pb, BZ.shotBox(sh))) { hit = sh.x; sh.life = 0; } if (hit !== null) { B.atk = null; act.hurt(B, hit < B.x ? -1 : 1); } }
      }
      // 敵に触れる → やられ（後ろへ飛ぶ・無敵）
      if (B.invul <= 0 && B.state !== 'hurt') { const pb = act.box(B); for (const e of foes) { if (e.dead || !RunnerCombat.overlap(pb, E.box(e))) continue; B.atk = null; act.hurt(B, e.x < B.x ? -1 : 1); break; } }   // 敵の方を向いたまま、後ろへ飛ぶ
    }
    const bossDef = () => RunnerBosses.BOSSES.find(b => b.id === AR.boss);
    // 柵（部屋の入口と出口）：map.extra に壁を足す・消す
    function setGates(on) { for (const c of [AR.c0 - 1, AR.c1 + 1]) for (let cy = 2; cy < 12; cy++) { const k = c + ',' + cy; if (on) map.extra.add(k); else map.extra.delete(k); } }
    // 技を覚える：記録（gs.runnerHard.beaten・moves）に入れ、柵を開ける
    function finishLearn() {
      const d = bossDef(); REC.beaten = REC.beaten || []; REC.moves = REC.moves || [];
      if (!REC.beaten.includes(d.id)) { REC.beaten.push(d.id); firstBeat = d; }
      if (d.teaches && !REC.moves.includes(d.teaches)) REC.moves.push(d.teaches);
      if (d.teaches) C.learn(d.teaches);
      setGates(false); arenaOn = false; boss = null; phase = 'play'; phaseT = 0; banner = { t: 0, txt: 'コンビニへ（柵が開いた）' };
    }
    // ── 更新 ──
    let lastState = 'stand';
    function update(dt) {
      t += dt; phaseT += dt; if (flash > 0) flash = Math.max(0, flash - dt * 2.4); if (shake > 0) shake = Math.max(0, shake - dt);
      if (banner) { banner.t += dt; if (banner.t > 2.6) banner = null; }
      for (const p of P) { if (!p.a) continue; p.l -= dt; if (p.l <= 0) { p.a = false; continue; } p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
      for (let i = 0; i < RN; i++) { rx[i] -= 90 * dt; ry[i] += rv[i] * dt; if (ry[i] > VH + 10) { ry[i] = -10 - Math.random() * 60; rx[i] = Math.random() * (VW + 160); } if (rx[i] < -30) rx[i] += VW + 150; }
      if (phase !== 'play' || !act) { if (phase === 'clear' && B) { B.vx = 0; } return; }
      runTime += dt;
      const inp = readInput(), wasInvul = B.invul;
      acc = Math.min(acc + dt, 5 / 60);
      while (acc >= 1 / 60 - 1e-9) { acc -= 1 / 60; frame(inp); if (phase !== 'play') break; }
      // 状態の変わり目の音と粒
      if (B.state !== lastState) {
        if (B.state === 'jump') { SE.jump(); for (let i = 0; i < 6; i++) emit(B.x, B.y, rnd(-80, 80), rnd(20, 90), .3, 'rgba(170,200,255,.75)', 2, 300); }
        if (B.state === 'dash') { SE.dash(); for (let i = 0; i < 8; i++) emit(B.x - B.face * 8, B.y + 2, -B.face * rnd(60, 160), rnd(10, 60), .3, 'rgba(170,200,255,.7)', 2, 300); }
        if (B.state === 'wall_kick') SE.kick();
        if (B.state === 'land') { SE.land(); for (let i = 0; i < 6; i++) emit(B.x + rnd(-8, 8), B.y, rnd(-70, 70), rnd(20, 70), .3, 'rgba(170,200,255,.7)', 1.8, 300); }
        if (B.state === 'slide') SE.slide();
        if (B.state === 'hurt' && !wasInvul) damage(1, 'spike');
        lastState = B.state;
      }
      if (B.state === 'wall_slide' && B.vy < 0 && Math.random() < .5) emit(B.x + B.wallDir * 7, B.y + 30, -B.wallDir * rnd(10, 40), rnd(-20, 20), .25, 'rgba(200,220,255,.7)', 1.5, 200);
      // 穴に落ちた
      if (B.y < -120) { falls++; damage(1, 'pit'); if (phase === 'play') respawn(); }
      // 途中の印
      for (const c of checks) if (!c.got && Math.abs(B.x - c.x) < 24 && Math.abs(B.y - c.y) < 60) { c.got = true; check = { x: c.x, y: c.y }; SE.check(); banner = { t: 0, txt: '途中の印（ここから やり直せる）' }; }
      // コンビニの戸
      if (Math.abs(B.x - goal.x) < 26 && Math.abs(B.y - goal.y) < 30) { phase = 'clear'; phaseT = 0; outcome = 'clear'; SE.clear(); commit(); for (let i = 0; i < 20; i++) emit(B.x, B.y + 30, rnd(-140, 140), rnd(40, 200), .8, i % 2 ? '#00e8c8' : '#e8b830', 2.5, 300); }
    }

    // ── 描画 ──
    const PAL_N = { pants: '#2e2048', shoe: '#0e0a18', jacket: '#8a74b8', jacketB: '#5e4c88', hair: '#3d2266', hairHi: '#6a44a8', skin: '#e6cdd8', hat: '#c86a9a', rim: null };
    const PAL_R = { pants: 'rgba(0,232,200,.55)', shoe: 'rgba(0,232,200,.55)', jacket: 'rgba(0,232,200,.55)', jacketB: 'rgba(0,232,200,.55)', hair: 'rgba(0,232,200,.55)', hairHi: 'rgba(0,232,200,.55)', skin: 'rgba(0,232,200,.55)', hat: 'rgba(0,232,200,.55)', rim: true };
    const J = { hx: 0, hy: 0, lean: 0, lt: [0, 0], rt: [0, 0], la: [0, 0], ra: [0, 0], ua: 0 };
    let ph = 0;
    function seg(x, y, a, l) { return [x + Math.sin(a) * l, y + Math.cos(a) * l]; }
    function limb(x, y, a1, l1, a2, l2, col, w, shoe) { const k = seg(x, y, a1, l1), f = seg(k[0], k[1], a2, l2); cx.strokeStyle = col; cx.lineWidth = w; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(k[0], k[1]); cx.lineTo(f[0], f[1]); cx.stroke(); if (shoe) { cx.fillStyle = shoe; cx.beginPath(); cx.ellipse(f[0] + 2, f[1] - 1, 4.5, 2.4, 0, 0, TAU); cx.fill(); } return f; }
    function setPose() {
      const st = B.state, spd = Math.abs(B.vx) * 60;
      const set = (hy, lean, lt, rt, la, ra, ua) => { J.hx = 0; J.hy = hy; J.lean = lean; J.lt[0] = lt[0]; J.lt[1] = lt[1]; J.rt[0] = rt[0]; J.rt[1] = rt[1]; J.la[0] = la[0]; J.la[1] = la[1]; J.ra[0] = ra[0]; J.ra[1] = ra[1]; J.ua = ua; };
      if (B.atk) {                                                    // 攻撃：傘を閉じて振る（腕の角度を、出る前 → 当たる間 → 戻り で動かす）
        const m = RunnerCombat.MOVES[B.atk.id], f = B.atk.f, u = f <= m.startup ? 0 : f <= m.startup + m.active ? (f - m.startup) / m.active : 1;
        const sw = { slash1: [2.8, .55], slash2: [.7, 2.5], slash3: [3.1, .25], air: [2.7, .35] }[B.atk.id] || [2.8, .55], aa = sw[0] + (sw[1] - sw[0]) * u;
        const air = m.on === 'air';
        return set(air ? -28 : -26, (B.atk.id === 'slash3' ? .35 : .22) * (u > 0 ? 1 : .4), air ? [1.1, -.2] : [.55, -.05], air ? [.3, -1.0] : [-.45, -.25], [-.6, .3], [aa, aa], 0);
      }
      if (st === 'hurt') return set(-27, -.42, [.5, .2], [-.4, -.6], [2.3, 2.9], [2.2, 2.5], -.5);
      if (st === 'slide') return set(-9, -.95, [1.55, 1.6], [1.05, -.25], [-1.1, -.6], [1.4, 1.9], 1.25);
      if (st === 'wall_slide') return set(-28, -.15, [.6, -.2], [.1, -.5], [-1.4, -.9], [2.7, 2.9], -.2);
      if (st === 'wall_kick') return set(-27, .35, [1.0, -.4], [-.6, -1.0], [1.4, 1.9], [2.75, 2.9], .3);
      if (act.STATES && (st === 'jump' || st === 'fall')) { const upk = clamp(B.vy / (5.324 * 2.5), -1, 1); return set(-28, .28, [1.2 - upk * .2, -.1], [.35, -1.1 + upk * .3], [1.1 + upk * .4, 1.8], [2.75, 2.9], .25 - upk * .15); }
      if (st === 'dash') { const s = Math.sin(ph); return set(-25, .55, [1.1 * s + .3, -.6], [-.9 * s + .2, -1.2], [-1.2, -.4], [2.6, 2.8], .55); }
      if (spd < 10) { const b = Math.sin(t * 2.4) * .6; return set(-28 + b, .06, [.12, .04], [-.1, -.12], [.15, .5], [2.85, 3.0], .08); }
      const s = Math.sin(ph), c = Math.cos(ph);
      J.hx = 0; J.hy = -27 - Math.abs(c) * 2.4; J.lean = .2; J.lt[0] = .85 * s; J.lt[1] = J.lt[0] - (.15 + 1.25 * Math.max(0, c)); J.rt[0] = -.85 * s; J.rt[1] = J.rt[0] - (.15 + 1.25 * Math.max(0, -c)); J.la[0] = -.95 * s + .2; J.la[1] = J.la[0] + 1.3; J.ra[0] = 2.7 + s * .08; J.ra[1] = 2.95 + s * .06; J.ua = .32;
    }
    function drawFigure(pal, ox, oy) {
      cx.save(); cx.translate(ox, oy); cx.lineCap = 'round'; cx.lineJoin = 'round';
      const hx = J.hx, hy = J.hy, sx = hx + Math.sin(J.lean) * 17, sy = hy - Math.cos(J.lean) * 17, hdx = sx + Math.sin(J.lean) * 8.5, hdy = sy - Math.cos(J.lean) * 8.5;
      const wave = Math.sin(t * 9) * 2.5, back = Math.abs(B.vx) > .5 ? 1 : .4;
      cx.fillStyle = pal.hair; cx.beginPath(); cx.moveTo(hdx - 3, hdy - 6); cx.quadraticCurveTo(hdx - 16 * back - 6, hdy - 6 + wave, hdx - 24 * back - 4, hdy + 4 + wave * 1.5); cx.quadraticCurveTo(hdx - 12 * back - 4, hdy + 4, hdx - 4, hdy + 3); cx.closePath(); cx.fill();
      limb(hx - 1, hy, J.rt[0], 14, J.rt[1], 14, pal.rim ? pal.pants : '#221838', 6, pal.shoe);
      const hand = limb(sx - 1, sy + 1, J.ra[0], 10, J.ra[1], 10, pal.rim ? pal.jacket : pal.jacketB, 5, null);
      cx.strokeStyle = pal.jacket; cx.lineWidth = 11; cx.beginPath(); cx.moveTo(hx, hy); cx.lineTo(sx, sy); cx.stroke();
      if (!pal.rim) { cx.strokeStyle = '#e8a8c8'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(hx + Math.cos(J.lean) * 1.5, hy - 2); cx.lineTo(sx + Math.cos(J.lean) * 1.5, sy + 3); cx.stroke(); }
      limb(hx + 1, hy, J.lt[0], 14, J.lt[1], 14, pal.pants, 6, pal.shoe);
      cx.fillStyle = pal.skin; cx.beginPath(); cx.arc(hdx + 1, hdy, 7, 0, TAU); cx.fill();
      cx.fillStyle = pal.hair; cx.beginPath(); cx.arc(hdx - 1, hdy - 1, 7.6, Math.PI * .55, Math.PI * 1.95); cx.quadraticCurveTo(hdx + 6, hdy - 2, hdx + 3, hdy + 1); cx.closePath(); cx.fill(); cx.fillRect(hdx - 7, hdy - 2, 4, 11);
      if (!pal.rim) { cx.fillStyle = pal.hairHi; cx.fillRect(hdx - 4, hdy - 7, 5, 1.5); cx.strokeStyle = '#2a1c36'; cx.lineWidth = 1; cx.strokeRect(hdx + 3.5, hdy - .6, 4.4, 3); cx.fillStyle = 'rgba(200,255,250,.85)'; cx.fillRect(hdx + 4, hdy, 3.5, 2); cx.fillStyle = '#ff9ac8'; for (let i = 0; i < 5; i++) { const a = i * TAU / 5; cx.beginPath(); cx.arc(hdx - 5 + Math.cos(a) * 1.3, hdy - 6 + Math.sin(a) * 1.3, 1.1, 0, TAU); cx.fill(); } }
      cx.save(); cx.translate(hdx + 1, hdy - 7); cx.rotate(J.lean * .6 - .12); cx.fillStyle = pal.hat; cx.fillRect(-6, -1, 12, 2); cx.fillRect(-3.5, -7, 7, 6.5); cx.restore();
      limb(sx + 1, sy + 1, J.la[0], 10, J.la[1], 10, pal.jacket, 5, null);
      if (B.atk) drawClosedUmbrella(pal, hand[0], hand[1]); else drawUmbrella(pal, hand[0], hand[1], J.ua);
      cx.restore();
    }
    // 攻撃の形（仮）：傘を閉じて刀のように振る。腕の向き（J.ra）に合わせて、閉じた傘を手の先へ伸ばす
    function drawClosedUmbrella(pal, hx, hy) {
      const a = J.ra[1];
      cx.save(); cx.translate(hx, hy); cx.rotate(-a + Math.PI);
      cx.strokeStyle = pal.rim ? pal.jacket : '#c8c0d8'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, 3); cx.lineTo(0, -40); cx.stroke();
      if (!pal.rim) { cx.fillStyle = 'rgba(200,215,240,.85)'; cx.beginPath(); cx.moveTo(-3.5, -8); cx.lineTo(0, -40); cx.lineTo(3.5, -8); cx.closePath(); cx.fill(); cx.strokeStyle = '#8a74b8'; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(-3, -16); cx.lineTo(3, -18); cx.stroke(); }
      cx.restore();
    }
    function drawUmbrella(pal, hx, hy, ua) {
      cx.save(); cx.translate(hx, hy); cx.rotate(ua);
      const R = 23, top = -40;
      cx.strokeStyle = pal.rim ? pal.jacket : '#c8c0d8'; cx.lineWidth = 1.6; cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(0, top - 4); cx.stroke(); cx.beginPath(); cx.arc(2.5, 0, 2.5, Math.PI, 0, true); cx.stroke();
      if (pal.rim) { cx.restore(); return; }
      const dmg = clamp(Math.ceil((HP_MAX - hp) * 3 / HP_MAX), 0, 3), lf = dmg >= 2 ? -10 : 0, flap = dmg >= 1 ? Math.sin(t * 22) * 3 : 0;
      cx.fillStyle = 'rgba(220,235,255,.24)'; cx.strokeStyle = 'rgba(235,245,255,.8)'; cx.lineWidth = 1.1; cx.beginPath();
      cx.moveTo(-R, top + 16 + lf); cx.quadraticCurveTo(-R * .85, top - 2, 0, top - 4); cx.quadraticCurveTo(R * .85, top - 2, R, top + 16); cx.quadraticCurveTo(R * .75, top + 12, R * .5, top + 14 + flap); cx.quadraticCurveTo(R * .25, top + 11, 0, top + 14); cx.quadraticCurveTo(-R * .25, top + 11, -R * .5, top + 14 + lf * .6); cx.quadraticCurveTo(-R * .75, top + 12 + lf, -R, top + 16 + lf); cx.closePath(); cx.fill(); cx.stroke();
      cx.strokeStyle = 'rgba(235,245,255,.45)'; cx.lineWidth = .8; cx.beginPath(); cx.moveTo(0, top - 4); cx.quadraticCurveTo(-R * .3, top + 2, -R * .5, top + 14 + lf * .6); cx.moveTo(0, top - 4); cx.quadraticCurveTo(R * .3, top + 2, R * .5, top + 14 + flap); cx.stroke();
      cx.restore();
    }
    // 画面の座標：x = 世界の x − camX、y = 地面の基準から（上が＋）→ 画面の下が 0
    const sx = x => x - camX, sy = y => VH - (y - camY);
    function drawBack() {
      const g = cx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0a0820'); g.addColorStop(.6, '#1a1238'); g.addColorStop(1, '#241a40'); cx.fillStyle = g; cx.fillRect(0, 0, VW, VH);
      // 遠くの家並み（2 枚・ゆっくり流れる）
      for (const [k, col, hBase, wd] of [[.2, '#140f2c', 200, 90], [.45, '#1c1538', 140, 70]]) {
        cx.fillStyle = col; const off = (camX * k) % (wd * 8);
        for (let i = -1; i < VW / wd + 2; i++) { const n = Math.floor((camX * k) / wd) + i, hh = hBase + ((n * 73) % 5) * 26 - camY * k * .3, x = i * wd - (camX * k) % wd; cx.fillRect(x, VH - hh - 60, wd - 6, hh + 60); if (k > .3) { cx.fillStyle = 'rgba(255,214,120,.5)'; for (let w = 0; w < 3; w++) if ((n * 7 + w * 3) % 4 === 0) cx.fillRect(x + 10 + w * 18, VH - hh - 40 + w * 22, 8, 10); cx.fillStyle = col; } }
        void off;
      }
    }
    function drawTiles() {
      const T = map.tile, c0 = Math.floor(camX / T) - 1, c1 = c0 + Math.ceil(VW / T) + 3;
      for (let c = c0; c <= c1; c++) for (let cy = 0; cy < ROWS.length; cy++) {
        const ch = map.at(c, cy), x = sx(c * T), y = sy((cy + 1) * T);
        if (ch === '#') {
          const topOpen = map.at(c, cy + 1) !== '#';
          cx.fillStyle = '#2a2440'; cx.fillRect(x, y, T + .5, T + .5);
          cx.fillStyle = '#332b4e'; cx.fillRect(x + 2, y + 2, T - 4, T - 4);
          cx.fillStyle = 'rgba(0,0,0,.25)'; cx.fillRect(x, y + T / 2, T, 1); cx.fillRect(x + (cy % 2 ? T / 2 : 0), y, 1, T / 2); cx.fillRect(x + (cy % 2 ? 0 : T / 2), y + T / 2, 1, T / 2);
          if (topOpen) { cx.fillStyle = '#5a4e80'; cx.fillRect(x, y, T + .5, 4); cx.fillStyle = 'rgba(160,190,255,.35)'; cx.fillRect(x, y + 4, T, 1); }
        } else if (ch === '=') {
          cx.fillStyle = '#7a2a58'; cx.fillRect(x, y, T + .5, 7); for (let i = 0; i < 4; i++) { cx.fillStyle = i % 2 ? '#e8e0f0' : '#c86a9a'; cx.fillRect(x + i * 10, y + 7, 10, 5); }
        } else if (ch === '^') {
          cx.fillStyle = '#5a4030'; cx.fillRect(x, y + T - 10, T, 10);
          cx.fillStyle = '#c8b8a8'; for (let i = 0; i < 4; i++) { cx.beginPath(); cx.moveTo(x + i * 10, y + T - 8); cx.lineTo(x + i * 10 + 5, y + T - 26 - (i % 2) * 6); cx.lineTo(x + i * 10 + 10, y + T - 8); cx.closePath(); cx.fill(); }
        }
      }
      // 途中の印（傘立て）とコンビニ
      for (const c of checks) { const x = sx(c.x), y = sy(c.y); cx.fillStyle = c.got ? '#00e8c8' : '#5a5a78'; cx.fillRect(x - 3, y - 34, 6, 34); cx.fillRect(x - 10, y - 38, 20, 5); }
      const gx = sx(goal.x), gy = sy(goal.y);
      cx.fillStyle = '#e8f0ff'; cx.fillRect(gx - 70, gy - 120, 140, 120); cx.fillStyle = '#30a8ff'; cx.fillRect(gx - 70, gy - 120, 140, 18); cx.fillStyle = '#ff7a30'; cx.fillRect(gx - 70, gy - 102, 140, 6);
      cx.fillStyle = '#fff'; cx.font = 'bold 13px sans-serif'; cx.textAlign = 'center'; cx.fillText('24H', gx, gy - 106);
      cx.fillStyle = 'rgba(255,250,200,.85)'; cx.fillRect(gx - 22, gy - 70, 44, 70); cx.fillStyle = 'rgba(255,240,160,.25)'; cx.fillRect(gx - 90, gy - 4, 180, 6);
    }
    // 敵（仮の見た目）：雨坊主＝雨合羽の小さな坊主・からかさ＝一つ目の古い傘
    function drawFoes() {
      for (const e of foes) {
        const x = sx(e.x), y = sy(e.y), a = e.dead ? Math.max(0, 1 - e.deadF / RunnerEnemies.DEATH_F) : 1, fl = e.hitT > 6;
        cx.globalAlpha = a; cx.save(); cx.translate(x, y); if (e.dead) cx.scale(1 + e.deadF * .03, 1 - e.deadF * .03);
        if (e.type === 'walker') {
          const bob = Math.abs(Math.sin(e.f * .2)) * 2;
          cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(0, 1, 14, 3, 0, 0, TAU); cx.fill();
          cx.fillStyle = fl ? '#ffffff' : '#3a6a8a'; cx.beginPath(); cx.moveTo(-14, 0); cx.quadraticCurveTo(-12, -30 - bob, 0, -36 - bob); cx.quadraticCurveTo(12, -30 - bob, 14, 0); cx.closePath(); cx.fill();
          cx.fillStyle = fl ? '#ffffff' : '#5a9ac0'; cx.beginPath(); cx.arc(0, -26 - bob, 11, Math.PI, 0); cx.fill();
          cx.fillStyle = '#0a0a18'; cx.fillRect(e.face * 3 - 5, -24 - bob, 3, 4); cx.fillRect(e.face * 3 + 2, -24 - bob, 3, 4);
        } else {
          const tilt = e.state === 'dive' ? .5 * Math.sign(e.vx || 1) : Math.sin(e.f * .07) * .15;
          cx.rotate(tilt);
          cx.fillStyle = fl ? '#ffffff' : '#b04a5a'; cx.beginPath(); cx.moveTo(-18, -8); cx.quadraticCurveTo(0, -34, 18, -8); cx.closePath(); cx.fill();
          cx.strokeStyle = '#3a1a20'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(0, -8); cx.lineTo(0, 8); cx.stroke();
          cx.fillStyle = '#fff6e0'; cx.beginPath(); cx.arc(0, -16, 5, 0, TAU); cx.fill(); cx.fillStyle = '#1a0a10'; cx.beginPath(); cx.arc(e.face * 1.5, -16, 2.2, 0, TAU); cx.fill();
          cx.fillStyle = '#e8a0a8'; cx.fillRect(4, -10, 6, 3);
        }
        cx.restore(); cx.globalAlpha = 1;
      }
    }
    // 仮のボス：大きな雨坊主（仮）。予兆の間は体が膨らんで赤く光る
    function drawBoss() {
      if (!boss) return;
      for (const sh of BZ.shots) { const x = sx(sh.x), y = sy(sh.y); cx.fillStyle = sh.kind === 'wave' ? 'rgba(120,200,255,.85)' : '#7ac8ff';
        if (sh.kind === 'wave') { cx.beginPath(); cx.moveTo(x - 12, y); cx.quadraticCurveTo(x, y - 30, x + 12, y); cx.closePath(); cx.fill(); } else { cx.beginPath(); cx.arc(x, y - 3, 6, 0, TAU); cx.moveTo(x - 5, y - 5); cx.lineTo(x, y - 14); cx.lineTo(x + 5, y - 5); cx.fill(); } }
      const e = boss, x = sx(e.x), y = sy(e.y), tele = BZ.telegraph(e), a = e.dead ? Math.max(0, 1 - e.deadF / 70) : 1, fl = e.hitT > 4;
      cx.globalAlpha = a; cx.save(); cx.translate(x, y); const sq = tele ? 1 + Math.sin(e.f * .6) * .06 : 1; cx.scale(2.1 * sq, 2.1 / sq);
      if (e.dead) cx.rotate(Math.min(1.4, e.deadF * .03) * -e.face);
      cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(0, 1, 15, 3, 0, 0, TAU); cx.fill();
      cx.fillStyle = fl ? '#ffffff' : tele ? '#a04a6a' : '#2f5a7a'; cx.beginPath(); cx.moveTo(-15, 0); cx.quadraticCurveTo(-13, -32, 0, -38); cx.quadraticCurveTo(13, -32, 15, 0); cx.closePath(); cx.fill();
      cx.fillStyle = fl ? '#ffffff' : '#4a86b0'; cx.beginPath(); cx.arc(0, -27, 12, Math.PI, 0); cx.fill();
      cx.fillStyle = tele ? '#ff4060' : '#0a0a18'; cx.fillRect(e.face * 3 - 6, -25, 4, 5); cx.fillRect(e.face * 3 + 2, -25, 4, 5);
      cx.restore(); cx.globalAlpha = 1;
    }
    // 振りの軌跡（当たる間だけ）
    function drawSlash() {
      const hb = C && C.hitbox(B); if (!hb) return;
      if (SPR) cx.globalAlpha = .45;
      const x0 = sx(hb.x0), x1 = sx(hb.x1), y0 = sy(hb.y1), y1 = sy(hb.y0), cxm = (x0 + x1) / 2, cym = (y0 + y1) / 2, f = B.face;
      cx.strokeStyle = hb.id === 'slash3' ? 'rgba(232,184,48,.9)' : 'rgba(0,232,200,.85)'; cx.lineWidth = hb.id === 'slash3' ? 5 : 3.5; cx.lineCap = 'round';
      cx.beginPath();
      if (hb.id === 'slash2') cx.ellipse(cxm - f * 10, cym, (x1 - x0) / 2, (y1 - y0) / 2, 0, f > 0 ? -1.4 : Math.PI - 1.7, f > 0 ? 1.7 : Math.PI + 1.4);
      else cx.ellipse(cxm - f * 10, cym, (x1 - x0) / 2, (y1 - y0) / 2, 0, f > 0 ? -1.9 : Math.PI - .4, f > 0 ? .4 : Math.PI + 1.9);
      cx.stroke(); cx.lineCap = 'butt'; cx.globalAlpha = 1;
    }
    // 状態 → ドット絵のコマ（行_列）。行：0 立つ・1 走る・2 ジャンプ・3 ダッシュとスライド・4 拳と構え・5 傘で斬る・6 傘を開く・7 やられ
    const ATK_SPR = { rising: ['4_1', '4_2', '4_3'], slash1: ['5_1', '5_2', '5_0'], slash2: ['5_4', '5_5', '5_7'], slash3: ['4_3', '5_6', '4_7'], air: ['2_3', '5_6', '2_4'] };
    function spriteKey() {
      const st = B.state, f = B.f, cyc = (keys, fps) => keys[Math.floor(t * fps) % keys.length];
      if (phase === 'over') return '7_4';
      if (phase === 'intro' || phase === 'clear') return cyc(['0_0', '0_1', '0_2', '0_3', '0_4', '0_5', '0_6', '0_7'], 8);
      if (B.atk) { const m = RunnerCombat.MOVES[B.atk.id], ks = ATK_SPR[B.atk.id] || ATK_SPR.slash1, a = B.atk.f; return a <= m.startup ? ks[0] : a <= m.startup + m.active ? ks[1] : ks[2]; }
      if (st === 'hurt') return f < 8 ? '7_0' : '7_1';
      if (st === 'slide') return f < 4 ? '3_4' : '3_5';
      if (st === 'dash') return ['3_1', '3_2', '3_3'][Math.floor(f / 4) % 3];
      if (st === 'dash_end') return '3_7';
      if (st === 'wall_slide') return '4_6';
      if (st === 'wall_kick') return f < 5 ? '4_6' : '2_2';
      if (st === 'jump') return f < 5 ? '2_1' : B.vy > 5 ? '2_2' : '2_3';
      if (st === 'fall') return B.vy > -4 ? '2_3' : B.vy > -9 ? '2_4' : '2_5';
      if (st === 'land') return '2_6';
      if (st === 'walk' || st === 'walk_start') return '1_' + (Math.floor(Math.abs(B.x) / 16) % 8);   // 進んだ距離でコマを送る（足が滑らない）
      return cyc(['0_0', '0_1', '0_2', '0_3', '0_4', '0_5', '0_6', '0_7'], 7);
    }
    const SPR_SCALE = .74;                                            // 立った姿で 約 70px（当たりの高さ 48px より少し大きく見せる）
    function drawSprite(x, y, alpha) {
      const k = spriteKey(), r = SPR.F[k] || SPR.F['0_0'], f = B.face || 1, s2 = SPR_SCALE;
      cx.globalAlpha = alpha; cx.save(); cx.translate(x, y); cx.scale(f * s2, s2);
      cx.drawImage(SPR.img, r[0], r[1], r[2], r[3], -r[4], -r[5], r[2], r[3]);
      cx.restore(); cx.globalAlpha = 1;
    }
    function drawPlayer() {
      if (SPR) {
        let alpha = 1; if (B.invul > 0 && B.state !== 'hurt') alpha = (Math.floor(B.invul / 4) % 2) ? .35 : 1;
        const x = sx(B.x), y = sy(B.y);
        cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(x, y + 1, 14, 2.5, 0, 0, TAU); cx.fill();
        drawSprite(x, y, alpha); return;
      }
      setPose(); ph += Math.abs(B.vx) * .2;
      let alpha = 1; if (B.invul > 0) alpha = (Math.floor(B.invul / 4) % 2) ? .35 : 1;
      const x = sx(B.x), y = sy(B.y);
      cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(x, y + 1, 12, 2.5, 0, 0, TAU); cx.fill();
      cx.globalAlpha = alpha; cx.save(); cx.translate(x, y); cx.scale(1.12 * B.face, 1.12);
      drawFigure(PAL_R, 1.3, -1); drawFigure(PAL_N, 0, 0);
      cx.restore(); cx.globalAlpha = 1;
    }
    function drawBossBar() {
      if (!boss || !arenaOn) return; const w = Math.min(320, VW - 40), x = (VW - w) / 2, y = 48;
      cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(x - 4, y - 16, w + 8, 30); cx.fillStyle = '#deccf8'; cx.font = '11px sans-serif'; cx.textAlign = 'left'; cx.fillText(bossDef().name, x, y - 4);
      cx.fillStyle = 'rgba(255,255,255,.15)'; cx.fillRect(x, y, w, 7); cx.fillStyle = '#ff6a8a'; cx.fillRect(x, y, w * boss.hp / boss.hpMax, 7);
    }
    function drawSelect() {
      cx.fillStyle = 'rgba(5,4,14,.86)'; cx.fillRect(0, 0, VW, VH); cx.textAlign = 'center';
      cx.fillStyle = '#00e8c8'; cx.font = 'bold 20px sans-serif'; cx.fillText('どこへ行く？（試作）', VW / 2, 90);
      const L = selList(), cw = 170, gap = 18, x0 = VW / 2 - (L.length * cw + (L.length - 1) * gap) / 2;
      L.forEach((d, i) => {
        const x = x0 + i * (cw + gap), y = 140, beat = (REC.beaten || []).includes(d.id), on = i === selIdx;
        cx.fillStyle = on ? 'rgba(0,232,200,.18)' : 'rgba(255,255,255,.06)'; cx.fillRect(x, y, cw, 210); cx.strokeStyle = on ? '#00e8c8' : 'rgba(255,255,255,.25)'; cx.lineWidth = 2; cx.strokeRect(x, y, cw, 210);
        cx.save(); cx.translate(x + cw / 2, y + 120); cx.scale(1.6, 1.6); cx.fillStyle = beat ? '#555a6a' : '#2f5a7a'; cx.beginPath(); cx.moveTo(-15, 0); cx.quadraticCurveTo(-13, -32, 0, -38); cx.quadraticCurveTo(13, -32, 15, 0); cx.closePath(); cx.fill(); cx.restore();
        cx.fillStyle = '#deccf8'; cx.font = 'bold 13px sans-serif'; cx.fillText(d.name, x + cw / 2, y + 150);
        cx.font = '11px sans-serif'; cx.fillStyle = beat ? '#e8b830' : 'rgba(222,204,248,.7)';
        const mv = d.teaches && RunnerCombat.MOVES[d.teaches]; cx.fillText(beat ? '倒した（' + (mv ? mv.name : '') + '）' : '覚える技：？？？', x + cw / 2, y + 172);
        cx.fillStyle = 'rgba(222,204,248,.5)'; cx.fillText('雨の住宅街（試作）', x + cw / 2, y + 192);
      });
      cx.fillStyle = 'rgba(222,204,248,.55)'; cx.font = '11px sans-serif'; cx.fillText('ボスの人数・名前・技は、まだ仮です', VW / 2, 384);
      if (Math.sin(t * 6) > -.3) { cx.fillStyle = '#e8b830'; cx.font = '13px sans-serif'; cx.fillText((showTouch ? 'タップ' : 'Z・Enter') + 'で 行く', VW / 2, 420); }
    }
    function drawHUD() {
      cx.textAlign = 'left'; cx.font = 'bold 14px sans-serif';
      cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fillRect(10, 10, 184, 30); cx.fillStyle = '#deccf8'; cx.fillText('☂', 18, 31);
      for (let i = 0; i < HP_MAX; i++) { cx.fillStyle = i < hp ? '#00e8c8' : 'rgba(255,255,255,.15)'; cx.fillRect(38 + i * 18, 18, 14, 14); }
      cx.textAlign = 'right'; cx.fillStyle = '#deccf8'; cx.fillText(runTime.toFixed(1) + '秒', VW - 14, 30);
      if (showTouch && phase === 'play') { for (const b of btns()) { const on = touchKeys()[b.k]; cx.fillStyle = on ? 'rgba(0,232,200,.35)' : 'rgba(255,255,255,.1)'; cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(b.x, b.y, b.r, 0, TAU); cx.fill(); cx.stroke(); cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = (b.lab.length > 1 ? 11 : 16) + 'px sans-serif'; cx.fillText(b.lab, b.x, b.y + 5); } }
    }
    function card(lines, sub) {
      cx.fillStyle = 'rgba(5,4,14,.78)'; cx.fillRect(0, 0, VW, VH); cx.textAlign = 'center';
      lines.forEach((l, i) => { cx.fillStyle = i ? '#deccf8' : '#00e8c8'; cx.font = (i ? '15px' : 'bold 22px') + ' sans-serif'; cx.fillText(l, VW / 2, VH / 2 - 40 + i * 30); });
      if (sub && Math.sin(t * 6) > -.3) { cx.fillStyle = '#e8b830'; cx.font = '13px sans-serif'; cx.fillText(sub, VW / 2, VH / 2 + 90); }
    }
    function draw() {
      cx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
      if (!act) { cx.fillStyle = '#05040e'; cx.fillRect(0, 0, VW, VH); cx.fillStyle = '#deccf8'; cx.textAlign = 'center'; cx.font = '14px sans-serif'; cx.fillText(phase === 'error' ? '読み込めませんでした' : '読み込み中…', VW / 2, VH / 2); return; }
      // カメラ：向いている方を少し広く見せる・縦はゆっくり追う
      const wantX = clamp(B.x - VW * (B.face > 0 ? .38 : .62), 0, map.W * map.tile - VW), wantY = clamp(B.y - 160, 0, Math.max(0, map.H * map.tile - VH));
      camX += (wantX - camX) * .12; camY += (wantY - camY) * .08;
      const shx = shake > 0 ? rnd(-3, 3) * shake * 3 : 0;
      cx.save(); cx.translate(shx, 0);
      drawBack(); drawTiles();
      for (const p of P) if (p.a) { cx.globalAlpha = Math.max(0, p.l / p.m); cx.fillStyle = p.c; cx.fillRect(sx(p.x) - p.s / 2, sy(p.y) - p.s / 2, p.s, p.s); }
      cx.globalAlpha = 1; drawFoes(); drawBoss(); drawPlayer(); drawSlash();
      cx.strokeStyle = 'rgba(170,190,255,.3)'; cx.lineWidth = 1; cx.beginPath(); for (let i = 0; i < RN; i += 2) { cx.moveTo(rx[i], ry[i]); cx.lineTo(rx[i] - 6, ry[i] - rl[i]); } cx.stroke();
      cx.restore();
      if (flash > 0) { cx.fillStyle = `rgba(255,120,140,${flash * .25})`; cx.fillRect(0, 0, VW, VH); }
      drawHUD(); drawBossBar();
      if (banner) { const a = Math.min(1, banner.t * 3, (2.6 - banner.t) * 3); cx.globalAlpha = a; cx.fillStyle = 'rgba(5,4,14,.7)'; cx.fillRect(0, 70, VW, 34); cx.fillStyle = '#00e8c8'; cx.font = 'bold 15px sans-serif'; cx.textAlign = 'center'; cx.fillText(banner.txt, VW / 2, 93); cx.globalAlpha = 1; }
      if (phase === 'intro') card(['高難易度版（試作）', '雨の町を、コンビニまで。', '←→ 移動　Z ジャンプ　X 攻撃（3 段・空中）　C ダッシュ　↓ スライド　↑＋X 覚えた技', '壁に向かって押しながら跳ぶと、壁を蹴る'], (showTouch ? 'タップ' : 'Z・Enter') + 'で はじめる');
      if (phase === 'select') drawSelect();
      if (phase === 'learn') { const mv = RunnerCombat.MOVES[learnedNow] || {}; card(['新しい技を覚えた', mv.name || '', '↑を押しながら 攻撃（X）', '上と前を広く払う'], (showTouch ? 'タップ' : 'Z・Enter') + 'で 続ける'); }
      if (phase === 'clear') card(['コンビニに着いた', `${runTime.toFixed(1)} 秒　／　ぶつかった ${hurts} 回`, '冷却シートと、プリン。'], (showTouch ? 'タップ' : 'Z・Enter') + 'で 戻る');
      if (phase === 'over') card(['傘が折れた……', 'もう一度、行かなきゃ。'], (showTouch ? 'タップ' : 'Z・Enter') + 'で 戻る');
    }

    // 試験の時だけの入口（window.__MG_TEST__ がある時だけ）
    if (typeof window !== 'undefined' && window.__MG_TEST__) window.__MG_TEST__.runnerHard = {
      get s() { return { boss: boss ? { hp: boss.hp, state: boss.state, dead: boss.dead, x: boss.x } : null, arenaOn, arena: AR, moves: C ? [...C.learned] : [], beaten: REC.beaten || [], sprite: !!SPR, spriteKey: SPR && B ? spriteKey() : null, phase, hp, falls, hurts, runTime, outcome, kills, foes: foes.map(e => ({ type: e.type, x: e.x, y: e.y, hp: e.hp, dead: e.dead, face: e.face })), invul: B && B.invul, atk: B && B.atk && B.atk.id, x: B && B.x, y: B && B.y, state: B && B.state, goal, spawn, checks: checks.map(c => !!c.got) }; },
      bossHp(n) { if (boss) boss.hp = n; },
      warp(x, y) { if (B) { B.x = x; B.y = y; B.vx = B.vy = 0; act.go(B, 'fall'); } }, start() { advance(); },
    };

    try { if (mg.exposeSfx) mg.exposeSfx(Object.keys(SE), k => SE[k] && SE[k]()); } catch (_) {}   // 音の一覧（設定・試験から鳴らせる）
    resize(); initRain(); if (ro) ro.observe(body);
    loadAct(); loadSprite();
    mg.loop(dt => { update(Math.max(0, Math.min(.1, dt))); if (mg._ended) return; draw(); });

    let firstBeat = null;                                             // この回で初めて倒したボス（結果の表示とごほうび）
    return { result(reason) {
      if (ro) ro.disconnect();
      if (outcome) reason = outcome;
      if (reason === 'clear' || reason === 'down') commit();
      const clear = reason === 'clear', down = reason === 'down';
      const mv = firstBeat && RunnerCombat.MOVES[firstBeat.teaches];
      // 本編への効き目：通常版（クリアで育児ストレス −8・精神 +2・疲労 +8）と同じくらい。初めてボスを倒した回は少し多め
      const fx = clear ? { childStress: -(6 + (firstBeat ? 2 : 0)), mental: 2 + (firstBeat ? 2 : 0), fatigue: 8 } : down ? { childStress: -2, mental: -3, fatigue: 8 } : { fatigue: 4 };
      return {
        title: (clear ? '☔ コンビニまで着いた' : down ? '☔ 傘が折れた' : '☔ 引き返した') + '（高難易度版・試作）',
        summary: (clear ? `冷却シートと、いつものプリンを買えた。<br>${runTime.toFixed(1)} 秒　ぶつかった <span class="${hurts ? 'down' : 'up'}">${hurts}</span> 回` : `ぶつかった ${hurts} 回`)
          + (firstBeat ? `<br>${firstBeat.name} を倒した。新しい技 <span class="up">${mv ? mv.name : ''}</span>` : ''),
        fx, time: clear || down ? 40 : 20, sp: firstBeat ? 1 : 0,
        log: clear ? '豪雨の中、傘を振るって町を抜け、コンビニまで行った（高難易度版）。' + (firstBeat ? firstBeat.name + 'を倒した。' : '') : down ? '豪雨の中で傘が折れて、引き返した（高難易度版）。' : '買い出し（高難易度版）の途中で引き返した。',
        cutin: clear ? ['happy', '……ずぶ濡れだけど、買えたわよ。熱、下がるといいわね。'] : down ? ['tired', '……今日はここまで。明日こそ、ね。'] : null,
      };
    } };
  },
});
