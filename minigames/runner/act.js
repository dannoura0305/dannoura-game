// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：自機の動き（段 2）
// ・1/60 秒の固定の歩み。状態の表（入った時に 1 度だけの準備・毎こま・移る先）で書く
// ・数値は docs/minigames/runner-hard/physics.json（仕組みと数値だけ。元の作品の名前・絵・音・コードは使わない）
//   元の値（px/こま・縦 224 の画面）× SCALE（2.5＝runner.js の仮想の高さ 560）＝ゲームの px/こま
// ・座標：x は右が＋、y は上が＋（足もと）。runner.js の py と同じ向き
// ・DOM を使わない（node で試験する：tests/runner-hard-act.test.mjs）。ふつうのスクリプトとして読むと RunnerAct が生える
// ・1 こまの順番：①入力で状態を変える ②落ちていれば縦の速さを上限で止める ③重さを引く ④位置に速さを足す ⑤壁・床との当たりを直す
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const SCALE = 2.5;
  // 元の値（px/こま・こま数）。むずかしさの調整はこの表を書き換える（make(opts.phys) で上書きできる）
  const BASE = {
    walkStart: 1.0, walkStartF: 5, walk: 1.46875, rewalkF: 10,
    dash: 3.457031, dashF: 33, dashEndF: 8, airDashF: 0,          // airDashF 0＝空中ダッシュなし（1 作目の形）
    airDashLearnF: 18,                                             // 習得技（仮）「風走り」：空中ダッシュ（風斬の怪異を倒すと。opts.airDash が真の時だけ。空中で 1 回）
    jump: 5.324219, gravity: 0.25, fallCap: 5.5,                  // 上限：-5.5 で止めてから重さを引くので、動くのは 5.75
    wallStickF: 8, wallSlide: 2.0, kickWindF: 5, kickPushF: 8,
    hurtX: 0.539062, hurtY: 2.0, invulF: 60, landF: 4,
    slideF: 33, slide: 1.46875,                                    // スライディング（今の runner.js の 0.55 秒）：速さは歩きと同じ（仮）
    coyoteF: 0, bufferF: 0,                                        // 床から落ちた直後の猶予・先に押したジャンプを覚える（元の作品にあるかは未確認。やさしさの調整で使う）
  };
  const BODY = { hw: 7, h: 48, slideH: 21 };                       // 当たりの大きさ（今の runner.js と同じ）
  const TILE = 40;

  // ── 地図：文字の行（上の行が高い所）。'#' 床・壁　'=' 上からだけ乗れる床　'^' とげ　'.' 空き ──
  function makeMap(rows, tile = TILE) {
    const H = rows.length, W = Math.max(...rows.map(r => r.length));
    const at = (cx, cy) => { const r = H - 1 - cy; if (cx < 0 || cx >= W) return '#'; if (r < 0) return '.'; if (r >= H) return '#'; return rows[r][cx] || '.'; };
    const extra = new Set();                                         // 後から足す壁（ボスの部屋の柵など）：'列,高さ'
    const ledges = [];                                               // 好きな高さの「上からだけ乗れる足場」：{ x0, x1, y }（世界の px。背景の絵に合わせる面で使う）
    return { rows, tile, W, H, at, extra, ledges, solid: (cx, cy) => at(cx, cy) === '#' || extra.has(cx + ',' + cy), oneway: (cx, cy) => at(cx, cy) === '=', spike: (cx, cy) => at(cx, cy) === '^' };
  }
  const EMPTY = { tile: TILE, at: () => '.', solid: () => false, oneway: () => false, spike: () => false };

  function make(opts = {}) {
    const P = Object.assign({}, BASE, opts.phys || {}), k = opts.scale ?? SCALE;
    const V = n => n * k;                                          // 元の px/こま → ゲームの px/こま
    const map = opts.map || EMPTY;
    const T = map.tile;

    // ── 当たり ──
    const h = b => (b.state === 'slide' ? BODY.slideH : BODY.h);
    const cells = (a, z) => { const o = []; for (let c = Math.floor(a / T); c <= Math.floor((z - 1e-6) / T); c++) o.push(c); return o; };
    const solidBox = (x0, x1, y0, y1) => { for (const cx of cells(x0, x1)) for (const cy of cells(y0, y1)) if (map.solid(cx, cy)) return true; return false; };
    function onGround(b) {
      const y = b.y - 0.5, cy = Math.floor(y / T);
      for (const cx of cells(b.x - BODY.hw, b.x + BODY.hw)) { if (map.solid(cx, cy)) return true; if (map.oneway(cx, cy) && Math.abs(b.y - (cy + 1) * T) < 0.6) return true; }
      if (map.ledges) for (const L of map.ledges) if (Math.abs(b.y - L.y) < 0.6 && b.x + BODY.hw > L.x0 && b.x - BODY.hw < L.x1) return true;
      return false;
    }
    const wallAt = (b, dir) => { const x = dir > 0 ? b.x + BODY.hw + 0.5 : b.x - BODY.hw - 0.5; return solidBox(x - 0.01, x + 0.01, b.y + 1, b.y + h(b) - 1); };
    function moveX(b, dx) {
      if (!dx) return false;
      const nx = b.x + dx, x0 = nx - BODY.hw, x1 = nx + BODY.hw;
      if (!solidBox(x0, x1, b.y + 0.01, b.y + h(b) - 0.01)) { b.x = nx; return false; }
      b.x = dx > 0 ? Math.floor(x1 / T) * T - BODY.hw - 0.001 : (Math.floor(x0 / T) + 1) * T + BODY.hw + 0.001;
      return true;
    }
    function moveY(b, dy) {
      if (!dy) return 0;
      const ny = b.y + dy, x0 = b.x - BODY.hw, x1 = b.x + BODY.hw;
      if (dy < 0) {                                                // 落ちる：床・上からだけ乗れる床（前のこまで上にいた時だけ）
        let land = -Infinity;
        if (map.ledges) for (const L of map.ledges) if (b.y >= L.y - 0.01 && ny < L.y && x1 > L.x0 && x0 < L.x1) land = Math.max(land, L.y);   // 好きな高さの足場
        const cyTop = Math.floor((b.y - 1e-6) / T), cyBot = Math.floor(ny / T);
        for (let cy = cyTop; cy >= cyBot && (cy + 1) * T > land; cy--) for (const cx of cells(x0, x1)) {
          const top = (cy + 1) * T;
          if ((map.solid(cx, cy) || (map.oneway(cx, cy) && b.y >= top - 0.01)) && ny < top) { b.y = top; return -1; }
        }
        if (land > -Infinity) { b.y = land; return -1; }
      } else if (solidBox(x0, x1, ny + h(b) - 0.01, ny + h(b))) { b.y = Math.floor((ny + h(b)) / T) * T - h(b) - 0.001; return 1; }   // 天井
      b.y = ny; return 0;
    }

    // ── 状態の表 ──
    const S = {};
    const go = (b, st, inp) => { b.state = st; b.f = 0; if (S[st].enter) S[st].enter(b, inp); };
    const dirOf = inp => (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    const groundCtl = (b, inp) => {                                // 地上で共通：ジャンプ・ダッシュ・スライド・落ちる
      if (b.jumpP) { b.dashJump = b.state === 'dash' || (b.state === 'dash_end' && inp.d); go(b, 'jump', inp); return true; }
      if (inp.dP && b.state !== 'dash') { go(b, 'dash', inp); return true; }
      if (inp.dnP && b.state !== 'slide') { go(b, 'slide', inp); return true; }
      return false;
    };
    S.stand = { enter: b => { b.vx = 0; },
      tick(b, inp) { if (groundCtl(b, inp)) return; const d = dirOf(inp); if (d) { b.face = d; go(b, b.sinceWalk <= P.rewalkF ? 'walk' : 'walk_start', inp); } } };
    S.walk_start = { enter: (b, inp) => { b.vx = V(P.walkStart) * b.face; },
      tick(b, inp) { if (groundCtl(b, inp)) return; const d = dirOf(inp); if (!d) return go(b, 'stand', inp); if (d !== b.face) { b.face = d; b.f = 0; } b.vx = V(P.walkStart) * b.face; if (b.f >= P.walkStartF) go(b, 'walk', inp); } };
    S.walk = { enter: b => { b.vx = V(P.walk) * b.face; },
      tick(b, inp) { if (groundCtl(b, inp)) return; const d = dirOf(inp); if (!d) { b.sinceWalk = 0; return go(b, 'stand', inp); } b.face = d; b.vx = V(P.walk) * d; } };
    S.dash = { enter: (b, inp) => { const d = dirOf(inp); if (d) b.face = d; b.vx = V(P.dash) * b.face; b.dashLeft = P.dashF; },
      tick(b, inp) { if (b.jumpP) { b.dashJump = true; return go(b, 'jump', inp); } b.vx = V(P.dash) * b.face; if (--b.dashLeft <= 0 || !inp.d || b.hitWall) go(b, 'dash_end', inp); } };
    S.dash_end = { enter: b => { b.vx = 0; },
      tick(b, inp) { if (groundCtl(b, inp)) return; const d = dirOf(inp); if (d) { b.face = d; return go(b, 'walk', inp); } if (b.f >= P.dashEndF) go(b, 'stand', inp); } };
    S.slide = { enter: (b, inp) => { const d = dirOf(inp); if (d) b.face = d; b.vx = V(P.slide) * b.face; },
      tick(b, inp) { if (b.jumpP && !solidBox(b.x - BODY.hw, b.x + BODY.hw, b.y + BODY.slideH, b.y + BODY.h)) { b.dashJump = false; return go(b, 'jump', inp); } b.vx = V(P.slide) * b.face;
        if (b.f >= P.slideF && !solidBox(b.x - BODY.hw, b.x + BODY.hw, b.y + BODY.slideH, b.y + BODY.h)) go(b, 'stand', inp); } };   // 低い所では立てるまで滑り続ける
    const canAirDash = () => (P.airDashF > 0) || (typeof opts.airDash === 'function' ? !!opts.airDash() : !!opts.airDash);
    const airCtl = (b, inp) => {                                   // 空中で共通：横は押している間だけ（慣性なし）・壁
      const d = dirOf(inp); if (d) b.face = d;
      if (inp.dP && !b.airDashed && canAirDash() && (b.state === 'jump' || b.state === 'fall')) { go(b, 'air_dash', inp); return true; }
      b.vx = d ? V(b.dashJump ? P.dash : P.walk) * d : 0;
      if (d && wallAt(b, d)) { if (b.jumpP) { b.kickDir = -d; return go(b, 'wall_kick', inp), true; } if (b.vy <= 0) { b.wallDir = d; return go(b, 'wall_slide', inp), true; } }
      if (b.jumpP && b.coyote > 0 && !b.usedCoyote) { b.usedCoyote = true; go(b, 'jump', inp); return true; }
      return false;
    };
    S.jump = { air: true, enter: b => { b.vy = V(P.jump); b.coyote = 0; },
      tick(b, inp) { if (airCtl(b, inp)) return; if (!inp.j && b.vy > 0) b.vy = 0; if (b.vy <= 0) go(b, 'fall', inp); } };
    S.fall = { air: true, tick(b, inp) { airCtl(b, inp); } };
    S.land = { enter: b => { b.vx = 0; },
      tick(b, inp) { if (groundCtl(b, inp)) return; const d = dirOf(inp); if (d) { b.face = d; return go(b, b.sinceWalk <= P.rewalkF ? 'walk' : 'walk_start', inp); } if (b.f >= P.landF) go(b, 'stand', inp); } };
    S.air_dash = { air: true, nograv: true, enter: (b, inp) => { const d = dirOf(inp); if (d) b.face = d; b.vy = 0; b.vx = V(P.dash) * b.face; b.airDashed = true; },   // 空中ダッシュ：横へまっすぐ（落ちない）。終わるとダッシュの速さのまま落ちる
      tick(b, inp) { b.vy = 0; b.vx = V(P.dash) * b.face; if (b.f >= (P.airDashF || P.airDashLearnF) || b.hitWall || !inp.d) { b.dashJump = true; go(b, 'fall', inp); } } };
    S.wall_slide = { air: true, nograv: true, enter: b => { b.vx = 0; b.vy = 0; b.dashJump = false; b.airDashed = false; },
      tick(b, inp) {
        if (b.jumpP) { b.kickDir = -b.wallDir; return go(b, 'wall_kick', inp); }
        const d = dirOf(inp); if (d !== b.wallDir || !wallAt(b, b.wallDir)) { b.face = d || b.face; b.vx = d ? V(P.walk) * d : 0; return go(b, 'fall', inp); }
        b.vx = 0; b.vy = b.f >= P.wallStickF ? -V(P.wallSlide) : 0; } };   // 付いたこまを 1 こま目と数えて 8 こま止まる
    S.wall_kick = { air: true, enter: (b, inp) => { b.vx = 0; b.vy = 0; b.face = b.kickDir; b.dashJump = !!inp.d; },
      grav: b => b.f >= P.kickWindF,                               // 溜めの間は止まる（重さもかからない）。入ったこまを溜めの 1 こま目と数える
      tick(b, inp) {
        if (b.f < P.kickWindF) { b.vx = 0; b.vy = 0; return; }
        if (b.f === P.kickWindF) { b.vy = V(P.jump); b.kickT = P.kickPushF; }
        b.vx = V(b.dashJump ? P.dash : P.walk) * b.kickDir;           // 押し出しの間は入力に関係なく壁と逆へ
        if (--b.kickT <= 0) { b.f = 0; if (inp.j) b.state = 'jump'; else { b.vy = 0; b.state = 'fall'; } }   // 押していれば上がり続け、離していれば落ちる
      } };
    S.hurt = { air: true, enter: b => { b.vx = -V(P.hurtX) * b.face; b.vy = V(P.hurtY); b.invul = P.invulF; b.dashJump = false; },
      tick(b) { b.vx = -V(P.hurtX) * b.face; } };

    // ── 1 こま ──
    function step(b, inp = {}) {
      inp = Object.assign({ l: false, r: false, j: false, d: false, dn: false }, inp);
      const pv = b.prev || {}; inp.jP = inp.j && !pv.j; inp.dP = inp.d && !pv.d; inp.dnP = inp.dn && !pv.dn; b.prev = { j: inp.j, d: inp.d, dn: inp.dn };
      if (inp.jP) b.buf = Math.max(1, P.bufferF + 1); else if (b.buf > 0) b.buf--;
      b.jumpP = b.buf > 0;
      b.f++; if (b.invul > 0) b.invul--; if (b.sinceWalk < 999) b.sinceWalk++;
      const st0 = b.state;
      // ① 入力で状態を変える
      S[b.state].tick(b, inp);
      if (b.state !== st0 && (b.state === 'jump' || b.state === 'wall_kick')) b.buf = 0;   // 押したジャンプを使った
      // ②③ 縦（空中の状態だけ）：落ちていれば上限で止めてから重さを引く
      const def = S[b.state], air = !!def.air;
      if (air && !def.nograv && (!def.grav || def.grav(b))) { if (b.vy < -V(P.fallCap)) b.vy = -V(P.fallCap); b.vy -= V(P.gravity); }
      // ④⑤ 動かして当たりを直す（横 → 縦）
      b.hitWall = moveX(b, b.vx);
      const hitY = air ? moveY(b, b.vy) : 0;
      if (hitY > 0) b.vy = 0;                                      // 天井
      if (air && hitY < 0) { b.vy = 0; b.dashJump = false; b.airDashed = false; b.usedCoyote = false; go(b, b.state === 'hurt' ? 'stand' : 'land', inp); }
      else if (!air) {
        if (!onGround(b)) { b.coyote = P.coyoteF; b.usedCoyote = false; b.vy = 0; b.dashJump = b.state === 'dash'; go(b, 'fall', inp); }
        else b.y = Math.round(b.y * 1000) / 1000;
      }
      if (air && b.coyote > 0) b.coyote--;
      // とげ
      if (b.invul <= 0) { for (const cx of cells(b.x - BODY.hw, b.x + BODY.hw)) for (const cy of cells(b.y, b.y + h(b))) if (map.spike(cx, cy)) { hurt(b); return b; } }
      return b;
    }
    function hurt(b, fromDir) { if (b.invul > 0) return false; if (fromDir) b.face = fromDir; go(b, 'hurt', {}); return true; }
    function body(x = 0, y = 0, face = 1) { return { x, y, vx: 0, vy: 0, face, state: 'stand', f: 0, sinceWalk: 999, invul: 0, buf: 0, coyote: 0, usedCoyote: false, dashJump: false, dashLeft: 0, kickT: 0, kickDir: 0, wallDir: 0, prev: null, hitWall: false }; }
    const box = b => ({ x0: b.x - BODY.hw, x1: b.x + BODY.hw, y0: b.y, y1: b.y + h(b) });
    return { P, step, body, hurt, box, go: (b, st) => go(b, st, {}), onGround, map, scale: k, STATES: Object.keys(S) };
  }

  // ── 固定の歩み：dt（秒）を 1/60 ずつ回す。余りは次へ持ち越す。1 回に最大 maxSteps 歩 ──
  function stepper(act, maxSteps = 5) {
    let acc = 0;
    return (b, dt, inp) => { acc = Math.min(acc + dt, maxSteps / 60); let n = 0; while (acc >= 1 / 60 - 1e-9) { act.step(b, inp); acc -= 1 / 60; n++; } return n; };
  }

  const API = { SCALE, BASE, BODY, TILE, make, makeMap, stepper };
  root.RunnerAct = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
