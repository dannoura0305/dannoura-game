// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版（試作。段の進み具合は docs/minigames/runner-hard-design.md の「進み具合」）
// 横スクロールの 2D アクション。自機の動きは minigames/runner/act.js（RunnerAct・1/60 の固定の歩み）。
// ・まだ試作：開発用の印（URL に ?runnerhard=1）がある時だけ選択画面に出る（minigames/core.js の末尾）。通常版（runner.js）には触らない
// ・この段では攻撃・敵・ボスは無い（段 4 から）。傘を差して走る・跳ぶ・ダッシュ・壁ずり・壁蹴り・スライドで、コンビニまで行く
// ・主人公の絵は通常版（runner.js の drawFigure・drawUmbrella）を写した物。共通のファイルに寄せるのは後の段
// 設計：docs/minigames/runner-hard-design.md
// ══════════════════════════════════════════════════════════
addMinigameStyle('runner_hard', `
.mg-runner_hard{background:#05040e;}
.mg-body.mg-runner_hard{max-width:none;}
#mg-screen .rh-fs{margin-left:auto;flex-shrink:0;padding:3px 9px;border:1px solid rgba(0,232,200,.55);border-radius:4px;background:rgba(0,232,200,.08);color:#00e8c8;font-size:.7rem;line-height:1.4;cursor:pointer;white-space:nowrap;}
#mg-screen:fullscreen{background:#05040e;}
.mg-runner_hard .rh-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;}
`);

// 試しの 1 面（区間の並び）。寸法：地面の上は y=80（2 マス）
var RunnerHardStage = RunnerHardStage || {
  id: 'jutaku', name: '雨の住宅街', W: 152, H: 14,
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
  arena() { return { c0: 108, c1: 134, bossC: 128, boss: null }; },   // 仮のボス（大きな雨坊主・仮）は雷殻の怪異に差し替えた
  gimmicks() { return {}; },
};

// 雷殻の怪異の面「高架下・都市送電区」：利用者の背景の絵 3 枚（assets/runner/koka_1〜3.webp：桜と鉄の足場の変電所・高架下の変電所・屋内の変圧器の広間）を左から並べた面
//  絵の 1px＝世界の 1px（2000×667 を半分で保存して 2 倍で描く）。世界の y ＝ 698 − 絵の y。1 枚＝50 マス・全部で 150 マス
//  床・鉄の足場・渡り廊下は「好きな高さの足場」（ledges）。足場の間の 稲妻の走る穴 へ落ちたら途中の印から
//  帯電する床（strips）：外の床の 3 か所で周期的に電気が流れる（流れる前にちらつく）。ボスの部屋は屋内の広間（マスの床・160）。部屋の上に「高電圧」の看板（踏みつけで壊れる・雷雲招来で帯電）
var RunnerHardStageKoka = RunnerHardStageKoka || {
  id: 'koka', name: '高架下・都市送電区', W: 150, H: 14, fallY: 40, art: ['koka_1', 'koka_2', 'koka_3'], artTop: 698,
  rows() {
    const W = this.W, H = this.H, g = Array.from({ length: H }, () => Array(W).fill('.'));
    const put = (c, cy, ch) => { if (c >= 0 && c < W && cy >= 0 && cy < H) g[H - 1 - cy][c] = ch; };
    const fill = (c0, c1, y0, y1, ch = '#') => { for (let c = c0; c <= c1; c++) for (let y = y0; y <= y1; y++) put(c, y, ch); };
    fill(0, 0, 0, H - 1); fill(W - 1, W - 1, 0, H - 1);
    put(2, 7, 'S'); put(26, 5, 'C'); put(52, 5, 'C'); put(92, 5, 'C');
    fill(100, W - 2, 0, 3);                       // 3 枚目：屋内の広間（床 160）。ボスの部屋（列 106〜120）
    put(145, 4, 'G');                             // 広間の右の戸
    return g.map(r => r.join(''));
  },
  ledges() {
    const A = [   // [絵の番号（0〜2）, x0, x1, 絵の y]
      [0, 0, 195, 445], [0, 195, 345, 518], [0, 335, 470, 482], [0, 550, 735, 553], [0, 535, 750, 413], [0, 815, 1005, 340], [0, 885, 985, 538], [0, 985, 2000, 538],
      [1, 0, 460, 538], [1, 545, 695, 545], [1, 655, 1245, 362], [1, 785, 935, 498], [1, 1020, 1250, 455], [1, 1250, 2000, 538],
    ];
    return A.map(([i, x0, x1, y]) => ({ x0: i * 2000 + x0, x1: i * 2000 + x1, y: 698 - y }));
  },
  enemies() { return [['flyer', 12, 9, -1], ['flyer', 30, 7, -1], ['flyer', 44, 7, -1], ['flyer', 63, 9, -1], ['flyer', 80, 8, -1], ['walker', 102, 4, -1], ['walker', 104, 4, -1]]; },
  arena() { return { c0: 106, c1: 120, bossC: 117, boss: 'raikaku', floorCy: 4 }; },
  gimmicks() {
    return {
      strips: [{ c0: 28, c1: 32, cy: 3, period: 180, on: 80, off: 0 }, { c0: 38, c1: 42, cy: 3, period: 180, on: 80, off: 90 }, { c0: 84, c1: 89, cy: 3, period: 200, on: 90, off: 40 }],
      crumbles: [{ c0: 108, c1: 110, cy: 6, stable: true, arena: true }, { c0: 116, c1: 118, cy: 6, stable: true, arena: true }],
    };
  },
};
// 風斬の怪異の面「雨のビルの屋上」：利用者の背景の絵 3 枚（assets/runner/okujo_1〜3.webp：桜と鳥居の屋上・給水塔と社殿の屋上・社の長い屋上）を左から並べた面
//  絵の 1px＝世界の 1px（2000×667 を半分で保存して 2 倍で描く）。世界の y ＝ 595 − 絵の y。1 枚＝50 マス・全部で 150 マス
//  ビルの屋上・塔・渡り廊下・壁の張り出しは「好きな高さの足場」（ledges：上からだけ乗れる）。すき間（ビルの間）へ落ちたら途中の印から
//  突風（winds）：塔と塔の間で吹く。向かい風の間は押し戻される。ボスの部屋は 3 枚目の社の屋上（マスの床・160）
var RunnerHardStageOkujo = RunnerHardStageOkujo || {
  id: 'okujo', name: '雨のビルの屋上', W: 150, H: 14, fallY: 40, art: ['okujo_1', 'okujo_2', 'okujo_3'], artTop: 595,
  rows() {
    const W = this.W, H = this.H, g = Array.from({ length: H }, () => Array(W).fill('.'));
    const put = (c, cy, ch) => { if (c >= 0 && c < W && cy >= 0 && cy < H) g[H - 1 - cy][c] = ch; };
    const fill = (c0, c1, y0, y1, ch = '#') => { for (let c = c0; c <= c1; c++) for (let y = y0; y <= y1; y++) put(c, y, ch); };
    fill(0, 0, 0, H - 1); fill(W - 1, W - 1, 0, H - 1);
    put(3, 5, 'S'); put(41, 5, 'C'); put(53, 5, 'C'); put(92, 5, 'C');
    fill(100, W - 2, 0, 3);                       // 3 枚目：社の長い屋上（床 160）。ボスの部屋（列 103〜117）
    put(126, 4, 'G');                             // 社殿の前（コンビニへの近道の戸・仮）
    return g.map(r => r.join(''));
  },
  ledges() {
    const A = [   // [絵の番号（0〜2）, x0, x1, 絵の y]
      [0, 0, 455, 435], [0, 555, 765, 397], [0, 765, 915, 397], [0, 900, 1120, 320], [0, 950, 1043, 443], [0, 1064, 1121, 374], [0, 1210, 1410, 400], [0, 1214, 1300, 474], [0, 1435, 2000, 435],
      [1, 0, 385, 435], [1, 385, 570, 435], [1, 565, 775, 282], [1, 654, 731, 421], [1, 726, 789, 343], [1, 895, 1080, 160], [1, 928, 1007, 365], [1, 1007, 1078, 290], [1, 1090, 1410, 400], [1, 1410, 1540, 410], [1, 1530, 2000, 435],
    ];
    return A.map(([i, x0, x1, y]) => ({ x0: i * 2000 + x0, x1: i * 2000 + x1, y: 595 - y }));
  },
  enemies() { return [['flyer', 14, 8, -1], ['flyer', 33, 10, -1], ['flyer', 48, 9, -1], ['flyer', 66, 11, -1], ['flyer', 84, 9, -1], ['walker', 101, 4, -1]]; },
  arena() { return { c0: 103, c1: 117, bossC: 114, boss: 'kazegiri', floorCy: 4 }; },
  gimmicks() {
    return { winds: [{ c0: 8, c1: 15, dir: -1, period: 220, on: 100, off: 0, force: 5 }, { c0: 69, c1: 79, dir: -1, period: 240, on: 110, off: 60, force: 3.2 }, { c0: 84, c1: 98, dir: 1, period: 200, on: 110, off: 30, force: 2.0 }] };
  },
};
// 濁流の怪異の面「排水路・増水した市街地」：利用者の背景の絵 3 枚（assets/runner/haisui_1〜3.webp：外の排水機場・ポンプ室の中・水門の広間）を左から並べた面
//  絵の 1px＝世界の 1px（絵は 2000×667。半分の大きさで保存して 2 倍で描く）。世界の y ＝ 605 − 絵の y。1 枚＝50 マス・全部で 150 マス
//  足場は絵の通り：岸壁・水門の床はマス（#）、マスに乗らない高さの柱・張り出しは「好きな高さの足場」（ledges：上からだけ乗れる）
//  水（絵の y 520 あたり＝世界の 85）より下へ落ちたら、穴に落ちたのと同じ（途中の印から）。増水（floods）で水位が上がる間は、高い足場へ
var RunnerHardStageHaisui = RunnerHardStageHaisui || {
  id: 'haisui', name: '排水路・増水した市街地', W: 150, H: 14, fallY: 70, art: ['haisui_1', 'haisui_2', 'haisui_3'], artTop: 605,
  rows() {
    const W = this.W, H = this.H, g = Array.from({ length: H }, () => Array(W).fill('.'));
    const put = (c, cy, ch) => { if (c >= 0 && c < W && cy >= 0 && cy < H) g[H - 1 - cy][c] = ch; };
    const fill = (c0, c1, y0, y1, ch = '#') => { for (let c = c0; c <= c1; c++) for (let y = y0; y <= y1; y++) put(c, y, ch); };
    fill(0, 0, 0, H - 1); fill(W - 1, W - 1, 0, H - 1);
    fill(1, 8, 0, 3); put(3, 4, 'S');              // 1 枚目：左の岸壁（床 160）
    fill(40, 57, 0, 4); put(45, 5, 'C');           // 1 枚目の右の岸壁 〜 2 枚目の左の床（床 200）
    fill(64, 71, 5, 5); put(67, 6, 'C');           // 2 枚目：まん中の作業台（床 240）
    fill(108, W - 2, 0, 3); put(108, 4, 'C');      // 3 枚目：水門の広間（床 160）。ボスの部屋（列 111〜125）
    put(136, 4, 'G');
    return g.map(r => r.join(''));
  },
  // 好きな高さの足場（世界の px）：絵の柱・張り出し・岸壁の上の縁
  ledges() {
    return [
      { x0: 590, x1: 750, y: 137 }, { x0: 835, x1: 955, y: 110 }, { x0: 1000, x1: 1180, y: 165 }, { x0: 1300, x1: 1435, y: 203 }, { x0: 1578, x1: 1600, y: 200 },   // 1 枚目：水の中の柱・右の岸壁の縁
      { x0: 2345, x1: 2475, y: 175 }, { x0: 2895, x1: 3065, y: 170 }, { x0: 3180, x1: 3270, y: 215 }, { x0: 3285, x1: 3410, y: 177 }, { x0: 3405, x1: 4000, y: 230 },   // 2 枚目
      { x0: 4000, x1: 4320, y: 180 },                                                                       // 3 枚目：左の一段高い床
    ];
  },
  enemies() { return [['walker', 5, 4, -1], ['flyer', 22, 7, -1], ['flyer', 33, 8, -1], ['walker', 47, 5, -1], ['flyer', 60, 8, -1], ['walker', 69, 6, -1], ['flyer', 80, 9, -1], ['flyer', 100, 8, -1]]; },
  arena() { return { c0: 111, c1: 125, bossC: 122, boss: 'dakuryu', floorCy: 4 }; },
  gimmicks() {
    return {
      floods: [{ c0: 9, c1: 39, base: 85, max: 70, period: 340, on: 170, off: 0 }, { c0: 58, c1: 85, base: 85, max: 100, period: 320, on: 160, off: 120 }],
      crumbles: [{ c0: 113, c1: 115, cy: 6, stable: true, arena: true }, { c0: 121, c1: 123, cy: 6, stable: true, arena: true }],   // 部屋の高い足場（大波から逃げる）
    };
  },
};
// ボスの面の表（BOSSES の stage → 面）。雨の住宅街は、教えていた仮のボスを差し替えたので今はどのボスの面でもない（残してある）
var RunnerHardStages = RunnerHardStages || { jutaku: RunnerHardStage, koka: RunnerHardStageKoka, okujo: RunnerHardStageOkujo, haisui: RunnerHardStageHaisui };

registerMinigame({
  id: 'runner_hard', icon: '☔', name: '買い出しダッシュ（高難易度版・試作）', genre: 'アクション', bgm: 'mg_runner',
  desc: '試作：横スクロールのアクション。走る・跳ぶ・ダッシュ・壁蹴り・傘で斬って、雨の町をコンビニまで。ボスを倒すと技を覚える。',
  effect: '育児ストレス↓ 精神↑ ／ 疲労+8 約40分',
  help: '←→:移動 Z:ジャンプ X:攻撃 C:ダッシュ ↓:スライド（技はボスを倒して覚える）',
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
    // 全画面（高難易度版だけ）：本編の 480px の枠を外して窓いっぱいに使う（上の .mg-body.mg-runner_hard）。さらに「全画面」ボタンでアドレスバーなども隠す
    //  スマホは全画面の間 横向きに固定を試みる（できない端末はそのまま）。全画面の仕組みが無い端末（iPhone の Safari など）ではボタンを出さない。終わると戻す
    const scr = document.getElementById('mg-screen'), hd = scr && scr.querySelector('.mini-hd');
    const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    const fsOK = !!(scr && (scr.requestFullscreen || scr.webkitRequestFullscreen) && (document.fullscreenEnabled || document.webkitFullscreenEnabled));
    let fsBtn = null;
    const fsLabel = () => { if (!fsBtn) return; const t2 = fsEl() ? '全画面を戻す' : '全画面'; fsBtn.title = t2; fsBtn.setAttribute('aria-label', t2); fsBtn.textContent = (typeof matchMedia !== 'undefined' && matchMedia('(max-width: 480px)').matches) ? '⛶' : '⛶ ' + t2; };   // 幅の狭いスマホは印だけ
    function fsExit() { try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (_) {} if (fsEl()) { try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (_) {} } }
    function fsToggle() {
      if (fsEl()) { fsExit(); return; }
      try { const r = (scr.requestFullscreen || scr.webkitRequestFullscreen).call(scr, { navigationUI: 'hide' }); if (r && r.then) r.then(() => { if (screen.orientation && screen.orientation.lock && matchMedia('(pointer: coarse)').matches) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => {}); } catch (_) {}
    }
    if (fsOK && hd) { fsBtn = document.createElement('button'); fsBtn.type = 'button'; fsBtn.className = 'rh-fs'; fsBtn.addEventListener('click', e => { e.stopPropagation(); fsToggle(); setTimeout(() => cv.focus(), 50); }); hd.appendChild(fsBtn); fsLabel(); document.addEventListener('fullscreenchange', fsLabel); document.addEventListener('webkitfullscreenchange', fsLabel); }

    // ── 面（試しの 1 面）：区間ごとに組み立てる（1 マス 40px・縦 14 マス＝560）。上の行が高い所
    //  # 床・壁　= 上からだけ乗れる床（店のひさし）　^ とげ（割れた植木鉢の破片）　S 始まり　C 途中の印　G コンビニの戸
    //  通れることは tests/runner-hard-stage.test.mjs で自機を動かして確かめる
    // 面はボスを選んでから決まる（ボスの表の stage → RunnerHardStages）。読み込みの時は、選択画面の最初のボスの面を後ろに見せる
    let STAGE = RunnerHardStage, ROWS = STAGE.rows(), GM = null, BSPR = {};   // ボスのドット絵（id → { img, F }）
    const stageOf = d => RunnerHardStages[d && d.stage] || RunnerHardStage;
    let act = null, map = null, B = null, C = null, E = null, foes = [], kills = 0, hitStop = 0, acc = 0, prevIn = {};
    let BZ = null, boss = null, AR = null, arenaOn = false, selIdx = 0, learnedNow = null;
    // 隠しボス（風邪菌・仮）：CZ＝cold.js の部屋・cboss＝本体・infect＝感染ゲージ（0〜100）・coldRes＝'win'/'lose'・coldOnly＝選択画面から直接
    let CZ = null, cboss = null, infect = 0, infF = 0, coldRes = null, coldOnly = false, story = null, coldFirst = false;
    const coldRec = () => (REC.cold = REC.cold || { seen: false, wins: 0, losses: 0, last: null });
    const selList = () => RunnerBosses.visible().concat(REC.cold && REC.cold.seen ? [RunnerBosses.BOSSES.find(b => b.id === 'cold')] : []);
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
    const SE = { swing: big => { blip('sawtooth', big ? 900 : 1300, big ? 300 : 500, big ? .16 : .1, .05); }, hit: dead => { blip('square', dead ? 180 : 260, dead ? 60 : 140, dead ? .22 : .09, .12); }, jump: () => blip('triangle', 420, 760, .12, .12), dash: () => blip('sawtooth', 160, 90, .14, .05), kick: () => blip('square', 300, 620, .1, .07), land: () => blip('sine', 140, 70, .08, .12), hurt: () => blip('square', 220, 90, .25, .1), slide: () => blip('sawtooth', 120, 80, .2, .04), check: () => { blip('sine', 660, 0, .12, .09); setTimeout(() => blip('sine', 990, 0, .2, .08), 90); }, clear: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip('triangle', f, 0, .25, .1), i * 110)), zap: () => { blip('sawtooth', 1800, 200, .3, .05); blip('square', 90, 60, .3, .06); }, block: () => { blip('square', 1500, 1200, .06, .07); blip('triangle', 2400, 0, .12, .04); }, warn: () => { for (let i = 0; i < 6; i++) setTimeout(() => blip('square', i % 2 ? 620 : 880, 0, .22, .07), i * 380); } };

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
      // コントローラーは入力管理（input/input-manager.js の INPUT）経由で読む。論理ボタン（A＝下 B＝右 X＝左 Y＝上…）を標準配置の番号に戻して使う
      const S = (typeof INPUT !== 'undefined' && INPUT.state && INPUT.state.connected) ? INPUT.state : null;
      const NUM = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L3', 'R3', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
      const sw = typeof INPUT !== 'undefined' && INPUT.opts && INPUT.opts.confirm === 'east';   // 決定ボタンを右にしている時は A と B を入れ替える
      for (const g of S ? [S] : []) {
        const b = i => { let n = NUM[i]; if (sw && (n === 'A' || n === 'B')) n = n === 'A' ? 'B' : 'A'; return !!g.buttons[n]; }, ax = g.axes.LX || 0, ay = g.axes.LY || 0;
        o.l = o.l || b(14) || ax < -.4; o.r = o.r || b(15) || ax > .4; o.dn = o.dn || b(13) || ay > .6; o.up = o.up || b(12) || ay < -.6;
        o.j = o.j || b(0); o.atk = o.atk || b(2) || b(3); o.d = o.d || b(1) || b(5) || b(7);   // A ジャンプ・X（Y）攻撃・B（RB・RT）ダッシュ
        if (b(0) && !padPrevA) advance(); padPrevA = b(0);
        const lr = (b(15) || ax > .5) - (b(14) || ax < -.5); if (phase === 'select' && lr && !padPrevLR) selIdx = (selIdx + lr + selList().length) % selList().length; padPrevLR = lr;   // 選択画面：十字・スティックで選ぶ
      }
      return o;
    }
    let padPrevA = false, padPrevLR = 0, selRects = [];   // selRects：選択画面のカードの場所（画面の座標。タップで選ぶ）
    // 画面のボタン（スマホ）：左下に ← →、右下に ジャンプ・ダッシュ・スライド。複数の指に対応
    const touches = new Map(); let showTouch = (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches);
    const btns = () => { const r = 34, y = VH - 58; return [{ k: 'l', x: 52, y, r, lab: '◀' }, { k: 'r', x: 132, y, r, lab: '▶' }, { k: 'up', x: 92, y: y - 126, r: 24, lab: '▲' }, { k: 'dn', x: 92, y: y - 66, r: 26, lab: '▼' }, { k: 'd', x: VW - 212, y: y + 4, r: 30, lab: 'ダッシュ' }, { k: 'atk', x: VW - 136, y: y - 4, r: 34, lab: '攻撃' }, { k: 'j', x: VW - 58, y: y - 30, r: 38, lab: 'ジャンプ' }]; };
    function touchKeys() { const o = { l: false, r: false, j: false, d: false, dn: false, atk: false, up: false }; for (const p of touches.values()) for (const b of btns()) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 14) o[b.k] = true; return o; }
    const toV = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / sc, y: (e.clientY - r.top) / sc }; };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); if (e.pointerType === 'touch') showTouch = true;
      if (phase === 'select') { const v = toV(e), i = selRects.findIndex(r => v.x >= r.x0 && v.x <= r.x1 && v.y >= r.y0 && v.y <= r.y1); if (i >= 0 && i !== selIdx) { selIdx = i; return; } }   // 別のカードを押すと選ぶ・選んでいるカード（か、カードの外）を押すと行く
      if (advance()) return; try { cv.setPointerCapture(e.pointerId); } catch (_) {} touches.set(e.pointerId, toV(e)); });
    cv.addEventListener('pointermove', e => { if (touches.has(e.pointerId)) touches.set(e.pointerId, toV(e)); });
    const up = e => touches.delete(e.pointerId); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('contextmenu', e => e.preventDefault());
    function readInput() { const p = padInput(), tch = showTouch ? touchKeys() : {}; const o = {}; for (const k of ['l', 'r', 'j', 'd', 'dn', 'atk', 'up']) o[k] = !!(K[k] || p[k] || tch[k]); return o; }

    // ── 流れ ──
    function advance() {
      if (phase === 'intro' && phaseT > .4) { phase = 'select'; phaseT = 0; return true; }
      if (phase === 'select' && phaseT > .3) { const d = selList()[selIdx]; if (d && d.id === 'cold') { coldOnly = true; committed = true; coldStory(true); return true; } if (stageOf(d) !== STAGE) build(stageOf(d)); phase = 'play'; phaseT = 0; banner = { t: 0, txt: 'STAGE　' + STAGE.name }; return true; }
      if (phase === 'story' && phaseT > .3) { story.i++; phaseT = 0; if (story.i >= story.lines.length) story.then(); return true; }
      if (phase === 'coldend' && phaseT > 1.2) { finish(); return true; }
      if (phase === 'learn' && phaseT > .8) { finishLearn(); return true; }
      if (phase === 'clear' && phaseT > 1.6) { if (RunnerBosses.coldUnlocked(REC.beaten) && !coldRec().seen && typeof RunnerCold !== 'undefined') coldStory(false); else finish(); return true; }
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
    function spawnBoss() { const e = BZ.spawn(AR.boss, AR.bossC * map.tile + map.tile / 2, AR.floor, AR); e.hp = e.hpMax = Math.round(e.hpMax * (DF ? DF.boss : 1)); return e; }
    function damage(n, why) {
      hp -= n; hurts++; flash = .8; shake = .3; SE.hurt(); if (mg.buzz) try { mg.buzz(40); } catch (_) {}
      if (hp <= 0) { hp = 0; phase = 'over'; phaseT = 0; outcome = 'down'; commit(); }
    }

    // ── 隠しボス：看病の場面 → WARNING → 戦い → 結末（台詞は利用者の指示のまま。ト書きは（ ）） ──
    const N = txt => ({ who: '', txt }), D = txt => ({ who: 'だんのうら', txt });
    function say(lines, then) { story = { lines, i: 0, then }; phase = 'story'; phaseT = 0; }
    function coldStory(short) {
      const tail = [N('（子どもの熱は下がり、少しずつ元気になってきた）'), D('よかったわぁ。ようやく元気になってきたじゃない'), D('……へっくしゅん！'), D('……あら？')];
      say(short ? tail : [N('（帰宅。冷却シートを貼って、プリンは冷蔵庫に。今夜はずっと、そばにいる）'), N('── 数日後 ──')].concat(tail), () => { phase = 'warning'; phaseT = 0; SE.warn(); });
    }
    function startCold() {
      // 家の絵（assets/runner/home.webp・2000×667：雨の夜の 2 階建ての家の断面）が読めていれば、絵の通りの 50 マスの家。1 階の縁側（床 80）・2 階の床（342）・右の階段（段の足場）。読めなければ 1 画面の部屋
      const HOME = !!ART.home, H = ROWS.length, W = HOME ? 50 : clamp(Math.floor(VW / 40), 13, 34), rows = [];   // 1 画面に収まる部屋（縦長のスマホで 13 マス・横長で 15 マスほど）
      for (let r = 0; r < H; r++) { const cy = H - 1 - r; let row = cy <= 1 ? '#'.repeat(W) : '#' + '.'.repeat(W - 2) + '#'; if (HOME && cy > 1) row = '####' + '.'.repeat(W - 8) + '####'; rows.push(row); }   // 家の外（庭・道）は壁
      map = RunnerAct.makeMap(rows); const T = map.tile;
      if (HOME) for (const [x0, x1, y] of [[330, 1590, 342], [1760, 1850, 150], [1690, 1770, 220], [1615, 1700, 290]]) map.ledges.push({ x0, x1, y });   // 2 階の床・階段の段（世界の y ＝ 620 − 絵の y）
      act = RunnerAct.make({ map, phys: DF ? DF.phys : {}, airDash: () => !!C && C.usable('kazebashiri') }); C = RunnerCombat.make(act, { learned: REC.moves || [] });
      foes = []; boss = null; arenaOn = false; B = act.body((HOME ? 6 : 3) * T + T / 2, 2 * T, 1); B.invul = 60; lastState = B.state;
      CZ = RunnerCold.make({ x0: (HOME ? 4 : 1) * T, x1: (W - (HOME ? 4 : 1)) * T, floor: 2 * T }); CZ.W = W; CZ.home = HOME; cboss = CZ.spawn(HOME ? 19 * T : (W - 4) * T);
      cboss.hp = cboss.hpMax = Math.round(cboss.hpMax * (DF ? DF.boss : 1));
      infect = 0; infF = 0; camX = 0; camY = 0; hitStop = 0; acc = 0;
      const R = coldRec(); coldFirst = !R.seen; R.seen = true;
      phase = 'play'; phaseT = 0; banner = { t: 0, txt: 'ボス　' + RunnerBosses.BOSSES.find(b => b.id === 'cold').name };
    }
    function addInfect(n) {
      infect = Math.min(100, infect + n); hurts++; flash = .8; shake = .3; SE.hurt(); if (mg.buzz) try { mg.buzz(40); } catch (_) {}
      if (infect >= 100) coldEnd('lose');
    }
    function coldEnd(res) {
      if (coldRes) return; coldRes = res; const R = coldRec(); R.last = res; if (res === 'win') R.wins = (R.wins | 0) + 1; else R.losses = (R.losses | 0) + 1;
      if (coldOnly) outcome = 'cold';
      if (res === 'win') say([N('（翌朝）'), D('ふふん、そう簡単に倒れてられないのよ！'), N('（子どもは、すっかり元気になっている）')], () => { phase = 'coldend'; phaseT = 0; SE.clear(); });
      else say([N('（翌朝。子どもは元気になったのに、布団で寝込んでいるのは――）'), D('……今度はあたしが風邪ひいたわ……'), N('（元気になった子どもが、枕元にやってきた）')], () => { phase = 'coldend'; phaseT = 0; });
    }
    // 戦いの 1 こま（自機の動きの後）
    function coldFrame() {
      CZ.step(cboss, B); CZ.stepOthers(B);
      if (cboss.ev && cboss.ev.includes('form2')) { banner = { t: 0, txt: '第 2 形態（激昂・本気）' }; SE.warn(); shake = Math.max(shake, .5); }
      const hb = C.hitbox(B), ov = RunnerCombat.overlap;
      if (hb) {
        if (!cboss.dead && ov(hb, CZ.box(cboss)) && C.tryHit(B, cboss) && CZ.hurt(cboss, hb.dmg)) { hitStop = Math.max(hitStop, hb.hitstop + 1); shake = Math.max(shake, .15); SE.hit(cboss.dead); for (let i = 0; i < 10; i++) emit(cboss.x, cboss.y, rnd(-180, 180), rnd(-120, 180), .4, i % 2 ? '#c8ff8a' : '#00e8c8', 2.4, 300); if (cboss.dead) { shake = .6; SE.clear(); } }
        for (const m of CZ.minis) if (!m.dead && ov(hb, CZ.miniBox(m)) && C.tryHit(B, m) && CZ.hurtMini(m)) { SE.hit(true); for (let i = 0; i < 6; i++) emit(m.x, m.y + 8, rnd(-120, 120), rnd(20, 160), .3, '#9ad860', 2, 400); }
      }
      if (cboss.dead) { if (cboss.deadF > 60) coldEnd('win'); return; }
      if (++infF >= 120) { infF = 0; infect = Math.max(0, infect - 1); }   // 少しずつ治る
      if (B.invul <= 0 && B.state !== 'hurt') {
        const pb = act.box(B), I = RunnerCold.COLD.infect; let hit = null, n = 0;
        if (ov(pb, CZ.box(cboss))) { hit = cboss.x; n = I.touch; }
        if (hit === null) for (const sh of CZ.shots) if (!(sh.wait > 0) && ov(pb, CZ.shotBox(sh))) { hit = sh.x; n = I.shot; sh.life = 0; break; }
        if (hit === null) for (const m of CZ.minis) if (!m.dead && ov(pb, CZ.miniBox(m))) { hit = m.x; n = I.mini; break; }
        if (hit === null) for (const m of CZ.mists) if (ov(pb, CZ.mistBox(m))) { hit = m.x; n = I.mist; break; }
        if (hit !== null) { B.atk = null; act.hurt(B, hit < B.x ? -1 : 1); addInfect(n); }
      }
    }

    // ── 面を作る ──
    function build(st) {
      if (st) { STAGE = st; ROWS = STAGE.rows(); }
      checks.length = 0; foes = []; boss = null; arenaOn = false; kills = 0;
      map = RunnerAct.makeMap(ROWS.map(r => r.replace(/[SCG]/g, '.')));
      if (STAGE.ledges) for (const L of STAGE.ledges()) map.ledges.push(L);   // 好きな高さの足場（背景の絵に合わせる面）
      const T = map.tile, Hh = ROWS.length;
      ROWS.forEach((row, r) => { for (let c = 0; c < row.length; c++) { const ch = row[c], p = { x: c * T + T / 2, y: (Hh - 1 - r) * T }; if (ch === 'S') spawn = p; if (ch === 'G') goal = p; if (ch === 'C') (checks.push(p)); } });
      // 印の足もとを床まで下ろす
      const drop = p => { const y0 = p.y; let y = p.y; while (y > 0 && !map.solid(Math.floor(p.x / T), Math.floor((y - 1) / T))) y -= T; p.y = Math.max(0, Math.ceil(y / T) * T);
        for (const L of map.ledges) if (L.y <= y0 + 0.01 && L.y > p.y && p.x > L.x0 && p.x < L.x1) p.y = L.y; };   // 好きな高さの足場の上にも置ける
      [spawn, goal, ...checks].forEach(drop);
      act = RunnerAct.make({ map, phys: DF ? DF.phys : {}, airDash: () => !!C && C.usable('kazebashiri') }); C = RunnerCombat.make(act, { learned: REC.moves || [] }); E = RunnerEnemies.make(map);
      foes = STAGE.enemies().map(([type, c, cy, face]) => E.spawn(type, c * T + T / 2, cy * T, face));
      GM = RunnerGimmicks.make(map, STAGE.gimmicks ? STAGE.gimmicks() : {});
      BZ = RunnerBosses.make(map); const a = STAGE.arena(); AR = Object.assign({}, a, { x0: a.c0 * T, x1: (a.c1 + 1) * T, floor: (a.floorCy || 2) * T, fcy: a.floorCy || 2 });   // 部屋の床の高さ（マス）は面ごと（ふつうは 2＝80）
      if (a.boss && !(REC.beaten || []).includes(a.boss)) boss = spawnBoss();
      check = { x: spawn.x, y: spawn.y }; B = act.body(spawn.x, spawn.y, 1); camX = 0; camY = 0;
    }
    const checks = [];
    // だんのうらのドット絵（assets/runner/dannoura.webp・.json。利用者の絵）。読めるまで・読めない時は、今までのコードで描く人物
    let SPR = null, SEL = null; const ART = {};   // ART：面の背景の絵（名前 → 画像）   // SEL：ボス選択画面の絵（assets/runner/select.json）
    function loadSprite() {
      fetch('assets/runner/select.json').then(r => r.json()).then(meta => { const bg = new Image(), img = new Image(); let n = 0; const ok = () => { if (++n === 2) SEL = { bg, img, F: meta.frames, W: meta.W, H: meta.H }; }; bg.onload = ok; img.onload = ok; bg.src = 'assets/runner/' + meta.bg; img.src = 'assets/runner/' + meta.image; }).catch(() => {});   // ボス選択画面の絵（利用者の絵）
      for (const nm of ['haisui_1', 'haisui_2', 'haisui_3', 'okujo_1', 'okujo_2', 'okujo_3', 'koka_1', 'koka_2', 'koka_3', 'home']) { const img = new Image(); img.onload = () => { ART[nm] = img; }; img.src = 'assets/runner/' + nm + '.webp'; }   // 濁流・風斬・雷殻の面と、風邪菌の家の背景（利用者の絵）
      for (const id of ['kazegiri', 'dakuryu', 'raikaku', 'kazekin'])   // ボスと隠しボスのドット絵（利用者の絵）
      fetch('assets/runner/' + id + '.json').then(r => r.json()).then(meta => { const img = new Image(); img.onload = () => { BSPR[id] = { img, F: meta.frames }; }; img.src = 'assets/runner/' + meta.image; }).catch(() => {});
      fetch('assets/runner/dannoura.json').then(r => r.json()).then(meta => {
        const img = new Image(); img.onload = () => { SPR = { img, F: meta.frames }; }; img.src = 'assets/runner/' + meta.image;
      }).catch(() => {});
    }
    // 自機の動き・技・敵（minigames/runner/*.js）を順に読む（読み込み済みなら読まない）
    function loadAct() {
      const need = [['RunnerAct', 'act'], ['RunnerCombat', 'combat'], ['RunnerEnemies', 'enemies'], ['RunnerBosses', 'bosses'], ['RunnerCold', 'cold'], ['RunnerGimmicks', 'gimmicks']].filter(([g]) => typeof window[g] === 'undefined');
      const next = () => {
        if (mg._ended) return; const n = need.shift(); if (!n) { build(stageOf(selList()[0])); phase = 'intro'; phaseT = 0; return; }
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
      if (CZ) { coldFrame(); return; }
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
      // 面の仕掛け：帯電する床・壊れる足場・帯電した看板（触れると やられ）
      if (GM) { GM.step(B, act.box(B)); if (B.invul <= 0 && B.state !== 'hurt' && GM.shock(act.box(B))) { B.atk = null; act.hurt(B, B.face || 1); for (let i = 0; i < 10; i++) emit(B.x, B.y + 20, rnd(-120, 120), rnd(20, 200), .3, i % 2 ? '#d080ff' : '#fff6a0', 2, 300); } }
      // ボスの部屋：入ると柵が閉まり、ボスが起きる
      if (boss && !boss.dead && !arenaOn && B.x > AR.x0 + 40 && B.y < AR.floor + 60) { arenaOn = true; setGates(true); BZ.wake(boss); banner = { t: 0, txt: 'ボス　' + bossDef().name }; SE.check(); }
      if (boss) {
        BZ.step(boss, B); BZ.stepShots();
        for (const ev of boss.ev || []) { if (ev === 'stomp') { GM && GM.breakArena(); shake = Math.max(shake, .4); SE.land(); } if (ev === 'rushwall') { shake = Math.max(shake, .35); SE.hit(true); } if (ev === 'special') { banner = { t: 0, txt: bossDef().special || '' }; SE.warn(); shake = Math.max(shake, .3); } if (ev === 'discharge' || ev === 'counter') SE.zap(); if (ev === 'dash' || ev === 'slash') SE.swing(ev === 'dash'); if (ev === 'shot' || ev === 'grab') SE.slide(); if (ev === 'wave') { SE.warn(); banner = { t: 0, txt: '大波' }; } }
        if (GM) GM.charge(!!boss.charged && !boss.dead);
        if (hb && !boss.dead && RunnerCombat.overlap(hb, BZ.box(boss)) && C.tryHit(B, boss)) { const r = BZ.hurt(boss, hb.dmg, B.x); if (r === 'block') { hitStop = Math.max(hitStop, 3); SE.block(); for (let i = 0; i < 8; i++) emit(boss.x + boss.face * 40, B.y + 30, -boss.face * rnd(40, 200), rnd(-60, 160), .25, i % 2 ? '#d080ff' : '#ffffff', 2, 200); } else if (r) { hitStop = Math.max(hitStop, hb.hitstop + 1); shake = Math.max(shake, .15); SE.hit(boss.dead); for (let i = 0; i < 10; i++) emit(boss.x, boss.y + 40, rnd(-180, 180), rnd(-40, 220), .4, i % 2 ? '#e8f0ff' : '#00e8c8', 2.4, 400); if (boss.dead) { shake = .6; SE.clear(); } } }
        if (boss.dead && boss.deadF === RunnerBosses.RAIKAKU.deadF) { phase = 'learn'; phaseT = 0; learnedNow = bossDef().teaches; }
        if (B.invul <= 0 && B.state !== 'hurt') { const pb = act.box(B); let hit = !boss.dead && boss.state !== 'wait' && RunnerCombat.overlap(pb, BZ.box(boss)) ? boss.x : null; for (const sh of BZ.shots) { const sb = BZ.shotBox(sh); if (sb && RunnerCombat.overlap(pb, sb)) { hit = sh.x; if (['spark', 'wave', 'blade', 'drop'].includes(sh.kind)) sh.life = 0; } } if (hit !== null) { B.atk = null; act.hurt(B, hit < B.x ? -1 : 1); } }
      }
      // 敵に触れる → やられ（後ろへ飛ぶ・無敵）
      if (B.invul <= 0 && B.state !== 'hurt') { const pb = act.box(B); for (const e of foes) { if (e.dead || !RunnerCombat.overlap(pb, E.box(e))) continue; B.atk = null; act.hurt(B, e.x < B.x ? -1 : 1); break; } }   // 敵の方を向いたまま、後ろへ飛ぶ
    }
    const bossDef = () => RunnerBosses.BOSSES.find(b => b.id === AR.boss);
    // 柵（部屋の入口と出口）：map.extra に壁を足す・消す
    function setGates(on) { for (const c of [AR.c0 - 1, AR.c1 + 1]) for (let cy = AR.fcy; cy < AR.fcy + 10; cy++) { const k = c + ',' + cy; if (on) map.extra.add(k); else map.extra.delete(k); } }
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
      if (phase === 'warning' && phaseT > 2.4) startCold();
      if (phase !== 'play' || !act) { if (phase === 'clear' && B) { B.vx = 0; } return; }
      runTime += dt;
      const inp = readInput(), wasInvul = B.invul;
      acc = Math.min(acc + dt, 5 / 60);
      while (acc >= 1 / 60 - 1e-9) { acc -= 1 / 60; frame(inp); if (phase !== 'play') break; }
      // 状態の変わり目の音と粒
      if (B.state !== lastState) {
        if (B.state === 'jump') { SE.jump(); for (let i = 0; i < 6; i++) emit(B.x, B.y, rnd(-80, 80), rnd(20, 90), .3, 'rgba(170,200,255,.75)', 2, 300); }
        if (B.state === 'dash' || B.state === 'air_dash') { SE.dash(); for (let i = 0; i < 8; i++) emit(B.x - B.face * 8, B.y + 2, -B.face * rnd(60, 160), rnd(10, 60), .3, 'rgba(170,200,255,.7)', 2, 300); }
        if (B.state === 'wall_kick') SE.kick();
        if (B.state === 'land') { SE.land(); for (let i = 0; i < 6; i++) emit(B.x + rnd(-8, 8), B.y, rnd(-70, 70), rnd(20, 70), .3, 'rgba(170,200,255,.7)', 1.8, 300); }
        if (B.state === 'slide') SE.slide();
        if (B.state === 'hurt' && !wasInvul && !CZ) damage(1, 'spike');   // 風邪菌の戦いは感染ゲージ（coldFrame）
        lastState = B.state;
      }
      if (B.state === 'wall_slide' && B.vy < 0 && Math.random() < .5) emit(B.x + B.wallDir * 7, B.y + 30, -B.wallDir * rnd(10, 40), rnd(-20, 20), .25, 'rgba(200,220,255,.7)', 1.5, 200);
      if (CZ) return;
      // 穴に落ちた
      if (B.y < (STAGE.fallY != null ? STAGE.fallY : -120)) { falls++; damage(1, 'pit'); if (phase === 'play') respawn(); }
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
      if (CZ && CZ.home && ART.home) {   // 家の絵：世界の y ＝ 620 − 絵の y（1 階の縁側の前の縁が 80・2 階の床が 342）
        cx.fillStyle = '#251855'; cx.fillRect(0, 0, VW, VH); const sm = cx.imageSmoothingEnabled; cx.imageSmoothingEnabled = false;
        cx.drawImage(ART.home, Math.floor(sx(0)), Math.floor(sy(620)), 2001, 668); cx.imageSmoothingEnabled = sm; return;
      }
      if (CZ) { drawHome(); return; }
      if (STAGE.art && STAGE.art.every(n => ART[n])) { drawArt(); return; }
      if (STAGE.id === 'koka') { drawKoka(); return; }
      if (STAGE.id === 'okujo') { drawOkujo(); return; }
      if (STAGE.id === 'haisui') { drawHaisui(); return; }
      const g = cx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0a0820'); g.addColorStop(.6, '#1a1238'); g.addColorStop(1, '#241a40'); cx.fillStyle = g; cx.fillRect(0, 0, VW, VH);
      // 遠くの家並み（2 枚・ゆっくり流れる）
      for (const [k, col, hBase, wd] of [[.2, '#140f2c', 200, 90], [.45, '#1c1538', 140, 70]]) {
        cx.fillStyle = col; const off = (camX * k) % (wd * 8);
        for (let i = -1; i < VW / wd + 2; i++) { const n = Math.floor((camX * k) / wd) + i, hh = hBase + ((n * 73) % 5) * 26 - camY * k * .3, x = i * wd - (camX * k) % wd; cx.fillRect(x, VH - hh - 60, wd - 6, hh + 60); if (k > .3) { cx.fillStyle = 'rgba(255,214,120,.5)'; for (let w = 0; w < 3; w++) if ((n * 7 + w * 3) % 4 === 0) cx.fillRect(x + 10 + w * 18, VH - hh - 40 + w * 22, 8, 10); cx.fillStyle = col; } }
        void off;
      }
    }
    function drawTiles() {
      const T = map.tile, c0 = Math.floor(camX / T) - 1, c1 = c0 + Math.ceil(VW / T) + 3, artOn = artVisible();
      for (let c = c0; c <= c1; c++) for (let cy = 0; cy < ROWS.length; cy++) {
        const ch = map.at(c, cy), x = sx(c * T), y = sy((cy + 1) * T);
        if (artOn) continue;                                         // 背景の絵が足場を描いている
        if (CZ && CZ.home && ART.home) continue;                    // 家の絵が床を描いている
        if (ch === '#' && CZ) {   // 家の床（板の間）と壁
          const wall = cy > 1; cx.fillStyle = wall ? '#3a2a24' : '#6a4a32'; cx.fillRect(x, y, T + .5, T + .5);
          if (!wall) { cx.fillStyle = 'rgba(0,0,0,.22)'; cx.fillRect(x, y + T / 2, T, 1); cx.fillRect(x + (c % 3) * 13, y, 1, T); if (map.at(c, cy + 1) !== '#') { cx.fillStyle = '#8a6a48'; cx.fillRect(x, y, T + .5, 4); } }
          else { cx.fillStyle = 'rgba(255,255,255,.05)'; cx.fillRect(x + 4, y, 3, T); }
        } else if (ch === '#' && STAGE.id === 'okujo') {   // ビル：壁に窓・屋上の縁に手すり
          const topOpen = map.at(c, cy + 1) !== '#';
          cx.fillStyle = '#241c3a'; cx.fillRect(x, y, T + .5, T + .5); cx.fillStyle = (c * 7 + cy * 3) % 5 < 2 ? 'rgba(255,200,120,.35)' : 'rgba(120,110,180,.25)'; cx.fillRect(x + 10, y + 10, 20, 16);
          if (topOpen) { cx.fillStyle = '#4a3e66'; cx.fillRect(x, y, T + .5, 6); cx.strokeStyle = 'rgba(200,190,230,.5)'; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(x, y - 14); cx.lineTo(x + T, y - 14); for (let i = 0; i <= T; i += 10) { cx.moveTo(x + i, y - 14); cx.lineTo(x + i, y); } cx.stroke(); }
        } else if (ch === '#' && STAGE.id === 'haisui') {   // 濡れたコンクリートの護岸
          const topOpen = map.at(c, cy + 1) !== '#';
          cx.fillStyle = '#20263a'; cx.fillRect(x, y, T + .5, T + .5); cx.fillStyle = '#2a3048'; cx.fillRect(x + 2, y + 2, T - 4, T - 4); cx.fillStyle = 'rgba(120,180,255,.12)'; cx.fillRect(x + 4, y + 20, T - 8, 2);
          if (topOpen) { cx.fillStyle = '#3e4a6a'; cx.fillRect(x, y, T + .5, 5); cx.fillStyle = 'rgba(160,200,255,.4)'; cx.fillRect(x, y + 5, T, 1); }
        } else if (ch === '=' && STAGE.id === 'haisui') {   // 鉄の足場（手すり付き）
          cx.fillStyle = '#5a6078'; cx.fillRect(x, y, T + .5, 6); cx.fillStyle = '#3a3e52'; for (let i = 4; i < T; i += 8) cx.fillRect(x + i, y + 6, 3, 10); cx.strokeStyle = 'rgba(220,230,255,.4)'; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(x, y - 12); cx.lineTo(x + T, y - 12); cx.stroke();
        } else if (ch === '^' && STAGE.id === 'haisui') {   // 濁った排水（とげの代わりの見た目）
          cx.fillStyle = 'rgba(70,60,120,.9)'; cx.fillRect(x, y + 8, T + .5, T - 8); cx.strokeStyle = 'rgba(190,200,255,.7)'; cx.lineWidth = 2; cx.beginPath(); for (let i = 0; i <= T; i += 8) cx.lineTo(x + i, y + 8 + Math.sin((c * T + i) * .2 + t * 8) * 3); cx.stroke();
        } else if (ch === '#' && STAGE.id === 'koka') {   // 打ちっぱなしのコンクリート・縁に黄と黒の注意の帯
          const topOpen = map.at(c, cy + 1) !== '#';
          cx.fillStyle = '#2c2a3c'; cx.fillRect(x, y, T + .5, T + .5); cx.fillStyle = '#353348'; cx.fillRect(x + 2, y + 2, T - 4, T - 4);
          cx.fillStyle = 'rgba(0,0,0,.3)'; cx.fillRect(x + 6, y + 8, 2, 2); cx.fillRect(x + 28, y + 26, 2, 2); cx.fillRect(x, y + T - 1, T, 1);
          if (topOpen) { for (let i = 0; i < 4; i++) { cx.fillStyle = i % 2 ? '#1a1a22' : '#e8b830'; cx.fillRect(x + i * 10, y, 10, 5); } cx.fillStyle = 'rgba(200,160,255,.3)'; cx.fillRect(x, y + 5, T, 1); }
        } else if (ch === '#') {
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
      if (CZ) return;
      if (arenaOn && AR) for (const c of [AR.c0 - 1, AR.c1 + 1]) {   // ボスの部屋の柵（閉まっている間）：縦の鉄格子
        const x = sx(c * T), y0 = sy((AR.fcy + 10) * T), y1 = sy(AR.fcy * T); cx.fillStyle = 'rgba(20,14,40,.78)'; cx.fillRect(x, y0, T, y1 - y0);
        cx.fillStyle = '#7a6aa8'; for (let i = 4; i < T; i += 9) cx.fillRect(x + i, y0, 3, y1 - y0); cx.fillStyle = '#e8b830'; for (let yy = y0; yy < y1; yy += 60) cx.fillRect(x, yy, T, 5);
        cx.fillStyle = `rgba(255,90,140,${.35 + .25 * Math.sin(t * 6)})`; cx.fillRect(x, y1 - 6, T, 6);
      }
      drawGimmicks();
      // 途中の印（傘立て）とコンビニ
      for (const c of checks) { const x = sx(c.x), y = sy(c.y); cx.fillStyle = c.got ? '#00e8c8' : '#5a5a78'; cx.fillRect(x - 3, y - 34, 6, 34); cx.fillRect(x - 10, y - 38, 20, 5); }
      const gx = sx(goal.x), gy = sy(goal.y);
      cx.fillStyle = '#e8f0ff'; cx.fillRect(gx - 70, gy - 120, 140, 120); cx.fillStyle = '#30a8ff'; cx.fillRect(gx - 70, gy - 120, 140, 18); cx.fillStyle = '#ff7a30'; cx.fillRect(gx - 70, gy - 102, 140, 6);
      cx.fillStyle = '#fff'; cx.font = 'bold 13px sans-serif'; cx.textAlign = 'center'; cx.fillText('24H', gx, gy - 106);
      cx.fillStyle = 'rgba(255,250,200,.85)'; cx.fillRect(gx - 22, gy - 70, 44, 70); cx.fillStyle = 'rgba(255,240,160,.25)'; cx.fillRect(gx - 90, gy - 4, 180, 6);
    }
    // 高架下・都市送電区：夜の街・高架（上を電車が通る）・鉄塔と電線・遠くの雷
    function drawKoka() {
      const g = cx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#120a28'); g.addColorStop(.55, '#22163e'); g.addColorStop(1, '#2a1c44'); cx.fillStyle = g; cx.fillRect(0, 0, VW, VH);
      if ((t * 1.3) % 6 < .12) { cx.fillStyle = 'rgba(200,170,255,.18)'; cx.fillRect(0, 0, VW, VH); }   // 遠くの稲光
      // ビル（2 枚）
      for (const [k, col, hBase, wd] of [[.15, '#180f30', 260, 80], [.35, '#201640', 180, 64]]) {
        for (let i = -1; i < VW / wd + 2; i++) { const n = Math.floor((camX * k) / wd) + i, hh = hBase + ((n * 61) % 6) * 30 - camY * k * .3, x = i * wd - (camX * k) % wd; cx.fillStyle = col; cx.fillRect(x, VH - hh - 60, wd - 8, hh + 60);
          cx.fillStyle = k > .3 ? 'rgba(255,120,220,.45)' : 'rgba(170,140,255,.35)'; for (let w = 0; w < 6; w++) if ((n * 5 + w * 7) % 5 < 2) cx.fillRect(x + 8 + (w % 3) * 18, VH - hh - 40 + Math.floor(w / 3) * 26, 8, 10); }
      }
      // 鉄塔と電線
      const k2 = .55, sp = 520; for (let i = -1; i < VW / sp + 2; i++) { const x = i * sp - (camX * k2) % sp + 200, base = VH - 40 + camY * .2;
        cx.strokeStyle = '#3a2c5a'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(x - 40, base); cx.lineTo(x - 6, base - 320); cx.lineTo(x + 6, base - 320); cx.lineTo(x + 40, base); cx.stroke();
        cx.lineWidth = 1.5; for (let h = 40; h < 320; h += 40) { const w = 40 - h * 34 / 320; cx.beginPath(); cx.moveTo(x - w, base - h); cx.lineTo(x + w - 4, base - h - 40); cx.moveTo(x + w, base - h); cx.lineTo(x - w + 4, base - h - 40); cx.stroke(); }
        cx.strokeStyle = 'rgba(160,140,200,.5)'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(x - 60, base - 300); cx.lineTo(x + 60, base - 300); cx.stroke();
        cx.beginPath(); for (const dy of [0, 22]) { cx.moveTo(x + 60, base - 300 + dy); cx.quadraticCurveTo(x + sp / 2, base - 240 + dy, x + sp - 60, base - 300 + dy); } cx.stroke(); }
      // 高架（上の方を横切る桁と柱）
      const k3 = .8, gy = 40 + camY * .1; cx.fillStyle = '#16102a'; cx.fillRect(0, gy, VW, 46); cx.fillStyle = '#e8b830'; for (let x = -((camX * k3) % 40); x < VW; x += 40) cx.fillRect(x, gy + 40, 20, 6);
      cx.fillStyle = 'rgba(255,160,230,.5)'; const tr = ((t * 260) % (VW + 600)) - 300; if (Math.floor(t / 9) % 2 === 0) for (let w = 0; w < 10; w++) cx.fillRect(tr + w * 28, gy + 12, 18, 8);   // 電車の窓
      for (let i = -1; i < VW / 360 + 2; i++) { const x = i * 360 - (camX * k3) % 360; cx.fillStyle = '#1c1434'; cx.fillRect(x, gy + 46, 34, VH); cx.fillStyle = 'rgba(255,255,255,.04)'; cx.fillRect(x + 4, gy + 46, 4, VH); }
    }
    // 背景の絵を面に並べる（1 枚＝2000×667 の世界の px。保存は半分なので 2 倍で描く・ぼかさない）。絵の上は夜空の色
    const artVisible = () => STAGE.art && STAGE.art.every(n => ART[n]);
    function drawArt() {
      const top = STAGE.artTop || 605; cx.fillStyle = '#0c0a26'; cx.fillRect(0, 0, VW, Math.max(0, sy(top)) + 2);
      const sm = cx.imageSmoothingEnabled; cx.imageSmoothingEnabled = false;
      STAGE.art.forEach((n, i) => { const x = sx(i * 2000); if (x > VW || x + 2000 < 0) return; cx.drawImage(ART[n], Math.floor(x), Math.floor(sy(top)), 2001, 668); });
      cx.imageSmoothingEnabled = sm;
      const bot = sy(top - 667); if (bot < VH) { cx.fillStyle = '#0a0820'; cx.fillRect(0, bot - 1, VW, VH - bot + 1); }   // 絵の下（水面の下・地面の下）
    }
    // 雨のビルの屋上：夜のビル街・遠くのネオン・月
    function drawOkujo() {
      const g = cx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0c0a24'); g.addColorStop(.6, '#1e1440'); g.addColorStop(1, '#3a1e4a'); cx.fillStyle = g; cx.fillRect(0, 0, VW, VH);
      cx.fillStyle = 'rgba(230,220,255,.85)'; cx.beginPath(); cx.arc(VW * .78 - camX * .02, 90, 26, 0, TAU); cx.fill(); cx.fillStyle = 'rgba(12,10,36,.9)'; cx.beginPath(); cx.arc(VW * .78 - camX * .02 + 10, 84, 24, 0, TAU); cx.fill();
      for (const [k, col, hBase, wd] of [[.12, '#140e2e', 300, 70], [.3, '#1c1438', 220, 90]]) {
        for (let i = -1; i < VW / wd + 2; i++) { const n = Math.floor((camX * k) / wd) + i, hh = hBase + ((n * 37) % 7) * 34 - camY * k * .3, x = i * wd - (camX * k) % wd; cx.fillStyle = col; cx.fillRect(x, VH - hh - 40, wd - 10, hh + 40);
          if (k > .2 && n % 3 === 0) { cx.fillStyle = 'rgba(255,90,200,.55)'; cx.fillRect(x + 8, VH - hh - 20, wd - 26, 8); } }
      }
    }
    // 排水路・増水した市街地：高架・街灯・雨の川面
    function drawHaisui() {
      const g = cx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#0a0c24'); g.addColorStop(.6, '#161a3c'); g.addColorStop(1, '#1e2448'); cx.fillStyle = g; cx.fillRect(0, 0, VW, VH);
      for (let i = -1; i < VW / 80 + 2; i++) { const n = Math.floor((camX * .2) / 80) + i, hh = 200 + ((n * 53) % 6) * 30, x = i * 80 - (camX * .2) % 80; cx.fillStyle = '#121434'; cx.fillRect(x, VH - hh - 60, 72, hh + 60); cx.fillStyle = 'rgba(160,190,255,.25)'; if (n % 2) cx.fillRect(x + 12, VH - hh - 40, 8, 10); }
      const gy = 60; cx.fillStyle = '#10122c'; cx.fillRect(0, gy, VW, 40); for (let i = -1; i < VW / 300 + 2; i++) { const x = i * 300 - (camX * .6) % 300; cx.fillRect(x, gy + 40, 30, VH); }
      for (let i = -1; i < VW / 260 + 2; i++) { const x = i * 260 - (camX * .9) % 260 + 120, base = VH - 40 + camY * .2; cx.strokeStyle = '#3a3a52'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(x, base); cx.lineTo(x, base - 150); cx.lineTo(x + 18, base - 150); cx.stroke(); cx.fillStyle = 'rgba(255,220,150,.9)'; cx.beginPath(); cx.arc(x + 18, base - 146, 5, 0, TAU); cx.fill(); cx.fillStyle = 'rgba(255,220,150,.08)'; cx.beginPath(); cx.moveTo(x + 18, base - 146); cx.lineTo(x - 30, base); cx.lineTo(x + 66, base); cx.fill(); }
    }
    // 水（増水・大波）：波打つ水面・白い波頭・しぶき。下は絵の川に溶け込むよう、元の水面より下まで塗る。x0・x1 は画面の座標、yBase・lv は世界の高さ
    function drawWater(x0, x1, yBase, lv, below = 60) {   // below：元の水面より下を塗る深さ（部屋の床の上なら浅く）
      if (lv <= 1 || x1 <= x0) return;
      const ty = sy(yBase + lv), by = Math.min(VH, sy(yBase - below)), amp = Math.min(1, lv / 30);
      const wave = x => (Math.sin(x * .034 + t * 3.1) * 4 + Math.sin(x * .012 - t * 1.6) * 3 + Math.sin(x * .09 + t * 6) * 1.2) * amp;
      const g = cx.createLinearGradient(0, ty - 6, 0, by); g.addColorStop(0, 'rgba(110,130,235,.82)'); g.addColorStop(.18, 'rgba(58,66,180,.86)'); g.addColorStop(.7, 'rgba(32,26,110,.9)'); g.addColorStop(1, 'rgba(22,16,80,.55)');
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(x0, by); for (let x = x0; x <= x1 + 5; x += 5) cx.lineTo(Math.min(x, x1), ty + wave(Math.min(x, x1) + camX)); cx.lineTo(x1, by); cx.closePath(); cx.fill();
      cx.strokeStyle = 'rgba(150,170,255,.28)'; cx.lineWidth = 2; cx.beginPath();   // 水の中の流れの筋
      for (let i = 0; i < (x1 - x0) / 40; i++) { const xx = x0 + ((i * 97 + t * 70) % (x1 - x0)), yy = ty + 14 + ((i * 37) % Math.max(10, by - ty - 20)); cx.moveTo(xx, yy); cx.lineTo(Math.min(x1, xx + 18 + (i % 3) * 8), yy); } cx.stroke();
      cx.strokeStyle = 'rgba(240,244,255,.95)'; cx.lineWidth = 3; cx.beginPath(); for (let x = x0; x <= x1; x += 4) cx.lineTo(x, ty + wave(x + camX)); cx.stroke();   // 波頭
      cx.fillStyle = 'rgba(235,240,255,.85)';
      for (let i = 0; i < (x1 - x0) / 12; i++) { const xx = x0 + ((i * 53 + t * 45) % (x1 - x0)), h2 = ((i * 7 + Math.floor(t * 12)) % 5); cx.fillRect(xx, ty + wave(xx + camX) - 3 - h2 * 2, 3, 3); }   // しぶき
    }
    // 面の仕掛け：帯電する床（流れる前にちらつく）・壊れる足場（揺れる）・ボスの部屋の看板（雷雲招来の間は帯電）
    function drawGimmicks() {
      if (!GM) return; const T = map.tile;
      for (const w of GM.winds) {   // 突風：吹く前は細い雨の筋・吹いている間は強い横殴りの筋
        const on = GM.live(w), wn = GM.warn(w); if (!on && !wn) continue; const x0 = sx(w.c0 * T), x1 = sx((w.c1 + 1) * T);
        cx.strokeStyle = on ? 'rgba(220,210,255,.55)' : 'rgba(220,210,255,.2)'; cx.lineWidth = on ? 2 : 1; cx.beginPath();
        for (let i = 0; i < (on ? 40 : 14); i++) { const xx = x0 + ((i * 97 + w.dir * t * 900) % (x1 - x0) + (x1 - x0)) % (x1 - x0), yy = (i * 53) % VH; cx.moveTo(xx, yy); cx.lineTo(xx + w.dir * (on ? 40 : 18), yy + 4); } cx.stroke();
      }
      for (const fl of GM.floods) {   // 増水：上がる前に水面がちらつく
        const lv = GM.level(fl), x0 = sx(fl.c0 * T), x1 = sx((fl.c1 + 1) * T), base = sy(fl.base);
        if (GM.warn(fl)) { cx.fillStyle = `rgba(230,236,255,${.35 + .35 * Math.sin(t * 24)})`; for (let xx = x0; xx < x1; xx += 22) cx.fillRect(xx + (Math.floor(t * 20) % 3) * 4, base - 3 - Math.abs(Math.sin(xx + t * 9)) * 6, 4, 3); }   // 上がる前：水面が泡立つ
        drawWater(x0, x1, fl.base, lv);
      }
      for (const s2 of GM.strips) {
        const x0 = sx(s2.c0 * T), x1 = sx((s2.c1 + 1) * T), y = sy((s2.cy + 1) * T), on = GM.live(s2), wn = GM.warn(s2);
        cx.fillStyle = '#1a1424'; cx.fillRect(x0, y - 4, x1 - x0, 6); for (let x = x0; x < x1; x += 20) { cx.fillStyle = on ? '#d080ff' : wn && Math.sin(t * 40) > 0 ? '#c060e0' : '#5a3a70'; cx.fillRect(x + 2, y - 3, 14, 3); }
        if (on) { cx.strokeStyle = 'rgba(220,150,255,.9)'; cx.lineWidth = 1.6; cx.beginPath(); for (let x = x0; x < x1; x += 16) { const h = 8 + Math.random() * 18; cx.moveTo(x, y - 2); cx.lineTo(x + 5, y - h); cx.lineTo(x + 9, y - h * .5); cx.lineTo(x + 14, y - h - 4); } cx.stroke(); cx.fillStyle = 'rgba(200,120,255,.18)'; cx.fillRect(x0, y - 26, x1 - x0, 24); }
      }
      for (const c of GM.crumbles) {
        if (c.st === 'gone') continue; const jit = c.st === 'shake' ? rnd(-2, 2) : 0, x0 = sx(c.c0 * T) + jit, w = (c.c1 - c.c0 + 1) * T, y = sy((c.cy + 1) * T);
        if (c.arena && STAGE.id === 'haisui') {   // 排水管の足場
          cx.fillStyle = '#4a5270'; cx.fillRect(x0, y, w, 16); cx.fillStyle = '#6a7298'; cx.fillRect(x0, y, w, 4); cx.fillStyle = '#2a3048'; for (let xx = 0; xx < w; xx += 30) cx.fillRect(x0 + xx, y, 5, 16);
          cx.strokeStyle = '#3a3e52'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x0 + 8, y + 16); cx.lineTo(x0 + 8, VH); cx.moveTo(x0 + w - 8, y + 16); cx.lineTo(x0 + w - 8, VH); cx.stroke();
        } else if (c.arena) {   // 吊られた看板「高電圧」
          cx.strokeStyle = '#4a3a60'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x0 + 10, y); cx.lineTo(x0 + 10, 0); cx.moveTo(x0 + w - 10, y); cx.lineTo(x0 + w - 10, 0); cx.stroke();
          cx.fillStyle = '#e8e0f0'; cx.fillRect(x0, y, w, T); cx.fillStyle = '#e8b830'; cx.fillRect(x0, y, w, 6); cx.fillStyle = '#c0203a'; cx.font = 'bold 18px sans-serif'; cx.textAlign = 'center'; cx.fillText('高電圧', x0 + w / 2, y + 29);
          if (GM.charged) { cx.fillStyle = 'rgba(210,130,255,.35)'; cx.fillRect(x0 - 3, y - 3, w + 6, T + 6); cx.strokeStyle = 'rgba(240,200,255,.95)'; cx.lineWidth = 1.5; cx.beginPath(); for (let x = x0; x < x0 + w; x += 14) { cx.moveTo(x, y); cx.lineTo(x + 4, y - 8 - Math.random() * 10); cx.lineTo(x + 9, y - 3); } cx.stroke(); }
        } else {         // 錆びた鉄の板（グレーチング）
          cx.fillStyle = '#5a4a5a'; cx.fillRect(x0, y, w, 12); cx.fillStyle = '#3a2e3a'; for (let x = 4; x < w; x += 8) cx.fillRect(x0 + x, y + 2, 3, 8);
          cx.fillStyle = '#8a6a5a'; cx.fillRect(x0, y, w, 2); if (c.st === 'shake') { cx.fillStyle = 'rgba(200,180,160,.6)'; cx.fillRect(x0 + rnd(0, w), y + 12 + rnd(0, 8), 2, 2); }
        }
      }
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
    // ボス：利用者のドット絵（assets/runner/<id>.webp。どれも左向き）。大きさは bosses.js の表の scale。読めない時は形だけの代わり
    function drawBoss() {
      if (!boss) return;
      // 雷雲招来：部屋の上に雷雲
      if (boss.state === 'storm' || boss.state === 'storm_tele') { const a = boss.state === 'storm' ? .85 : Math.min(.85, boss.f / 50); cx.fillStyle = `rgba(30,16,50,${a})`; const x0 = sx(AR.x0), x1 = sx(AR.x1); for (let x = x0; x < x1; x += 46) { cx.beginPath(); cx.arc(x + 20, 30 + Math.sin(x * .07 + t) * 8, 40, 0, TAU); cx.fill(); } if (boss.state === 'storm' && Math.random() < .08) { cx.fillStyle = 'rgba(220,180,255,.15)'; cx.fillRect(0, 0, VW, VH); } }
      for (const sh of BZ.shots) {
        const x = sx(sh.x), y = sy(sh.y);
        if (sh.kind === 'wave') { cx.fillStyle = 'rgba(255,220,120,.9)'; cx.beginPath(); cx.moveTo(x - 14, y); cx.lineTo(x - 6, y - 26); cx.lineTo(x, y - 12); cx.lineTo(x + 6, y - 30); cx.lineTo(x + 14, y); cx.closePath(); cx.fill(); }
        else if (sh.kind === 'spark') { cx.fillStyle = '#f0d0ff'; cx.beginPath(); cx.arc(x, y, 6, 0, TAU); cx.fill(); cx.strokeStyle = 'rgba(200,120,255,.9)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x - 10, y + rnd(-6, 6)); cx.lineTo(x, y); cx.lineTo(x + 10, y + rnd(-6, 6)); cx.stroke(); }
        else if (sh.kind === 'burst') { cx.strokeStyle = `rgba(230,170,255,${sh.life / 16})`; cx.lineWidth = 6; cx.beginPath(); cx.arc(x, y, sh.r, 0, TAU); cx.stroke(); cx.lineWidth = 2; cx.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; cx.moveTo(x + Math.cos(a) * sh.r * .4, y + Math.sin(a) * sh.r * .4); cx.lineTo(x + Math.cos(a + .2) * sh.r, y + Math.sin(a + .2) * sh.r); } cx.stroke(); }
        else if (sh.kind === 'melee') { if (sh.owner && sh.owner.id === 'kazegiri') { const f = sh.owner.face; cx.strokeStyle = 'rgba(255,140,230,.85)'; cx.lineWidth = 4; cx.beginPath(); cx.ellipse(x, y - sh.h / 2, sh.w, sh.h / 2, 0, f > 0 ? -1.4 : Math.PI - 1.4, f > 0 ? 1.4 : Math.PI + 1.4); cx.stroke(); } else { cx.fillStyle = 'rgba(120,170,255,.45)'; cx.beginPath(); cx.ellipse(x, y - sh.h / 2, sh.w, sh.h / 2, 0, 0, TAU); cx.fill(); } }
        else if (sh.kind === 'ring') { cx.strokeStyle = 'rgba(255,170,235,.55)'; cx.lineWidth = 3; for (let i = 0; i < 3; i++) { const a0 = t * 9 + i * 2.1; cx.beginPath(); cx.arc(x, y, sh.r * (.75 + i * .12), a0, a0 + 1.6); cx.stroke(); } }
        else if (sh.kind === 'blade') { cx.save(); cx.translate(x, y); cx.scale(Math.sign(sh.vx) || 1, 1); cx.fillStyle = 'rgba(255,190,240,.9)'; cx.beginPath(); cx.moveTo(-16, -14); cx.quadraticCurveTo(18, 0, -16, 14); cx.quadraticCurveTo(4, 0, -16, -14); cx.fill(); cx.restore(); for (let i = 0; i < 2; i++) { cx.fillStyle = '#ffc8e8'; cx.fillRect(x - Math.sign(sh.vx) * (20 + i * 10), y + rnd(-6, 6), 4, 4); } }
        else if (sh.kind === 'drop') { cx.fillStyle = 'rgba(150,190,255,.95)'; cx.beginPath(); cx.arc(x, y, 9, 0, TAU); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.6)'; cx.beginPath(); cx.arc(x - 3, y - 3, 3, 0, TAU); cx.fill(); }
        else if (sh.kind === 'splash') { cx.strokeStyle = 'rgba(170,210,255,.85)'; cx.lineWidth = 2; cx.beginPath(); for (let i = -2; i <= 2; i++) { cx.moveTo(x + i * 6, y); cx.lineTo(x + i * 9, y - 12 - (2 - Math.abs(i)) * 6 * (sh.life / 26)); } cx.stroke(); }
        else if (sh.kind === 'surge') {   // 濁流：前が巻き込む大きな波
          const d = Math.sign(sh.vx) || 1, Hh = sh.h, fx = x + d * sh.w, g = cx.createLinearGradient(0, y - Hh * 1.1, 0, y); g.addColorStop(0, 'rgba(110,130,235,.92)'); g.addColorStop(.4, 'rgba(56,64,178,.92)'); g.addColorStop(1, 'rgba(26,20,96,.9)');
          cx.fillStyle = g; cx.beginPath(); cx.moveTo(x - d * 130, y); cx.quadraticCurveTo(x - d * 70, y - Hh * .45, x - d * 12, y - Hh * .95); cx.quadraticCurveTo(fx + d * 18, y - Hh * 1.12, fx + d * 6, y - Hh * .55); cx.quadraticCurveTo(fx - d * 10, y - Hh * .42, fx - d * 2, y - Hh * .28); cx.lineTo(fx + d * 8, y); cx.closePath(); cx.fill();
          cx.strokeStyle = 'rgba(240,244,255,.95)'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(x - d * 70, y - Hh * .45); cx.quadraticCurveTo(x - d * 30, y - Hh * .85, x - d * 12, y - Hh * .95); cx.quadraticCurveTo(fx + d * 18, y - Hh * 1.12, fx + d * 6, y - Hh * .55); cx.stroke();
          cx.fillStyle = 'rgba(235,240,255,.9)'; for (let i = 0; i < 10; i++) cx.fillRect(fx + d * (4 + ((i * 13 + sh.life * 3) % 26)), y - Hh * (.3 + ((i * 17) % 70) / 100) - (sh.life * (i + 1)) % 9, 3, 3);   // しぶき
        }
        else if (sh.kind === 'flood') drawWater(sx(sh.x0), sx(sh.x1), sh.y, sh.level, 4);   // 大波：部屋の水位（床の上だけ）
        else if (sh.kind === 'bolt') {
          if (sh.f <= sh.tele) { cx.fillStyle = `rgba(255,90,120,${.25 + .25 * Math.sin(sh.f * .8)})`; cx.fillRect(x - sh.w, 0, sh.w * 2, y); cx.fillStyle = '#ff5a78'; cx.fillRect(x - sh.w, y - 4, sh.w * 2, 4); }   // 予兆：落ちる所が赤く光る
          else { cx.fillStyle = 'rgba(240,210,255,.95)'; cx.beginPath(); let px = x; cx.moveTo(px, 0); for (let yy = 0; yy < y; yy += 30) { px = x + rnd(-sh.w * .7, sh.w * .7); cx.lineTo(px, yy); } cx.lineTo(x, y); cx.lineTo(x + 6, y); cx.lineTo(px + 6, 0); cx.closePath(); cx.fill(); cx.fillStyle = 'rgba(200,140,255,.3)'; cx.fillRect(x - sh.w * 2, 0, sh.w * 4, y); }
        }
      }
      const e = boss, x = sx(e.x), y = sy(e.y), tele = BZ.telegraph(e), a = e.dead ? Math.max(0, 1 - Math.max(0, e.deadF - 50) / 30) : 1, fl = e.hitT > 6;
      cx.fillStyle = 'rgba(0,0,0,.4)'; cx.beginPath(); cx.ellipse(x, y + 1, 44, 5, 0, 0, TAU); cx.fill();
      const SP = BSPR[e.id];
      if (SP) {
        const r = SP.F[BZ.frame(e)] || SP.F['0_0'], k = BZ.spec(e).scale || 1;
        const blit = (ox, al) => { cx.globalAlpha = al; cx.save(); cx.translate(x + ox, y); cx.scale(-(e.face || -1) * k, k); cx.drawImage(SP.img, r[0], r[1], r[2], r[3], -r[4], -r[5], r[2], r[3]); cx.restore(); };
        if (e.state === 'dash' || e.state === 'rush' || e.state === 'thrust') { blit(-e.vx * 6, a * .18); blit(-e.vx * 3, a * .32); }   // 残像
        blit(0, a);
        if (fl) { cx.globalCompositeOperation = 'lighter'; blit(0, .45); cx.globalCompositeOperation = 'source-over'; }
        cx.globalAlpha = 1;
      } else {
        cx.globalAlpha = a; cx.fillStyle = fl ? '#ffffff' : tele ? '#a04ad0' : '#5a3a8a'; cx.fillRect(x - 30, y - 112, 60, 112); cx.fillStyle = '#e8b830'; cx.fillRect(x - 30, y - 70, 60, 8); cx.fillStyle = '#ff60d0'; cx.fillRect(x + e.face * 10 - 6, y - 96, 12, 6); cx.globalAlpha = 1;
      }
      if (e.state === 'guard' && !SP) { cx.strokeStyle = 'rgba(220,150,255,.8)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(x + e.face * 40, y - 60, 40, 0, TAU); cx.stroke(); }
      if (tele && !e.dead && e.state !== 'guard') { cx.fillStyle = `rgba(230,170,255,${.15 + .15 * Math.sin(t * 30)})`; cx.beginPath(); cx.ellipse(x, y - 60, 60, 70, 0, 0, TAU); cx.fill(); }
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
    const ATK_SPR = { rising: ['4_1', '4_2', '4_3'], slash1: ['5_1', '5_2', '5_0'], slash2: ['5_4', '5_5', '5_7'], slash3: ['4_3', '5_6', '4_7'], air: ['2_3', '5_6', '2_4'], raitotsu: ['3_2', '5_6', '3_7'], mizukiri: ['3_4', '3_5', '3_5'] };
    function spriteKey() {
      const st = B.state, f = B.f, cyc = (keys, fps) => keys[Math.floor(t * fps) % keys.length];
      if (phase === 'over') return '7_4';
      if (phase === 'intro' || phase === 'clear') return cyc(['0_0', '0_1', '0_2', '0_3', '0_4', '0_5', '0_6', '0_7'], 8);
      if (B.atk) { const m = RunnerCombat.MOVES[B.atk.id], ks = ATK_SPR[B.atk.id] || ATK_SPR.slash1, a = B.atk.f; return a <= m.startup ? ks[0] : a <= m.startup + m.active ? ks[1] : ks[2]; }
      if (st === 'hurt') return f < 8 ? '7_0' : '7_1';
      if (st === 'slide') return f < 4 ? '3_4' : '3_5';
      if (st === 'dash') return ['3_1', '3_2', '3_3'][Math.floor(f / 4) % 3];
      if (st === 'air_dash') return f < 4 ? '3_1' : '3_2';
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
    // 家（隠しボスの部屋）：雨の窓・布団の子ども・やかん
    function drawHome() {
      const g = cx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#2a1e2a'); g.addColorStop(1, '#3e2c30'); cx.fillStyle = g; cx.fillRect(0, 0, VW, VH);
      cx.fillStyle = 'rgba(255,220,160,.06)'; for (let i = 0; i < 20; i++) cx.fillRect(sx(i * 60), 0, 2, VH);   // 壁紙の筋
      const RW = CZ ? CZ.W * 40 : 1040, wx = sx(RW / 2 - 100), wy = sy(9 * 40);   // 窓（外は雨）
      cx.fillStyle = '#5a4030'; cx.fillRect(wx - 6, wy - 6, 212, 132); cx.fillStyle = '#141a30'; cx.fillRect(wx, wy, 200, 120);
      cx.strokeStyle = 'rgba(170,190,255,.45)'; cx.lineWidth = 1; cx.beginPath(); for (let i = 0; i < 26; i++) { const rx0 = wx + ((i * 37 + t * 220) % 200), ry0 = wy + ((i * 53 + t * 380) % 110); cx.moveTo(rx0, ry0); cx.lineTo(rx0 - 3, ry0 + 9); } cx.stroke();
      cx.fillStyle = '#5a4030'; cx.fillRect(wx + 97, wy, 6, 120); cx.fillRect(wx, wy + 57, 200, 6);
      cx.fillStyle = 'rgba(200,120,140,.55)'; cx.fillRect(wx - 30, wy - 10, 30, 150); cx.fillRect(wx + 200, wy - 10, 30, 150);   // カーテン
      // 布団と子ども（奥の左）
      const fx = sx(1.2 * 40), fy = sy(2 * 40);
      cx.fillStyle = '#e8e0f0'; cx.fillRect(fx, fy - 16, 120, 16); cx.fillStyle = '#c86a9a'; cx.fillRect(fx + 28, fy - 26, 92, 14);
      cx.fillStyle = '#fff'; cx.fillRect(fx + 4, fy - 24, 24, 10); cx.fillStyle = '#f0d4c4'; cx.beginPath(); cx.arc(fx + 18, fy - 26, 8, 0, TAU); cx.fill();
      cx.fillStyle = '#3d2a20'; cx.beginPath(); cx.arc(fx + 18, fy - 29, 8, Math.PI * 1.05, Math.PI * 1.95); cx.fill();
      cx.strokeStyle = '#3d2a20'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(fx + 13, fy - 25); cx.lineTo(fx + 16, fy - 25); cx.moveTo(fx + 20, fy - 25); cx.lineTo(fx + 23, fy - 25); cx.stroke();
      if (CZ && !cboss.dead) { cx.fillStyle = '#aee0ff'; cx.fillRect(fx + 13, fy - 33, 10, 5); }   // 冷却シート
      // ちゃぶ台とやかん（奥の右）
      const tx = sx(RW - 2.6 * 40), ty = sy(2 * 40);
      cx.fillStyle = '#5a3a26'; cx.fillRect(tx - 40, ty - 22, 80, 6); cx.fillRect(tx - 34, ty - 16, 5, 16); cx.fillRect(tx + 29, ty - 16, 5, 16);
      cx.fillStyle = '#a8a8b8'; cx.beginPath(); cx.ellipse(tx, ty - 32, 12, 10, 0, 0, TAU); cx.fill(); cx.fillRect(tx + 10, ty - 36, 10, 3);
      if (Math.sin(t * 3) > 0) { cx.fillStyle = 'rgba(255,255,255,.25)'; cx.beginPath(); cx.arc(tx + 22, ty - 46 - (t * 20) % 14, 4, 0, TAU); cx.fill(); }
    }
    // 風邪菌：利用者のドット絵（assets/runner/kazekin.webp。左向き）。霧（エアロ）・菌弾・雑魚ウイルス。第 2 形態は大きく。読めない時は形だけの代わり
    function drawCold() {
      if (!CZ) return;
      for (const m of CZ.mists) { const x = sx(m.x), y = sy(m.y), r = m.r * Math.min(1, m.f / 20, m.life / 30); cx.fillStyle = 'rgba(240,140,220,.22)'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + m.f * .03; cx.beginPath(); cx.arc(x + Math.cos(a) * r * .45, y + Math.sin(a) * r * .3, r * .6, 0, TAU); cx.fill(); } }
      const SP = BSPR.kazekin;
      if (SP) {
        const blit = (key, x, y, k, face, al) => { const r = SP.F[key]; if (!r) return; cx.globalAlpha = al; cx.save(); cx.translate(x, y); cx.scale(-(face || -1) * k, k); cx.drawImage(SP.img, r[0], r[1], r[2], r[3], -r[4], -r[5], r[2], r[3]); cx.restore(); cx.globalAlpha = 1; };
        for (const sh of CZ.shots) if (!(sh.wait > 0)) blit(CZ.shotFrame(sh), sx(sh.x), sy(sh.y) + 9, .38, 1, 1);
        for (const m of CZ.minis) blit(CZ.miniFrame(m), sx(m.x), sy(m.y), .42, m.vx > 0 ? 1 : -1, m.dead ? Math.max(0, 1 - m.deadF / 24) : 1);
        const e = cboss, R = CZ.radius(e), k = .8 * (e.form === 2 ? 1.25 : 1) * (e.state === 'form2' ? 1 + Math.sin(e.f * .8) * .06 : 1), a = e.dead ? Math.max(0, 1 - e.deadF / 60) : 1;
        if (e.dead) { for (let i = 0; i < 3; i++) emit(e.x + rnd(-R, R), e.y + rnd(-R, R), rnd(-60, 60), rnd(-20, 80), .5, i % 2 ? '#d070ff' : '#ff9ae0', 2.4, -40); }   // ウイルス粒子となって霧のように消える
        blit(e.dead ? '0_0' : CZ.frame(e), sx(e.x), sy(e.y - R * 1.15), k, e.face, a);
        if (e.hitT > 4 && !e.dead) { cx.globalCompositeOperation = 'lighter'; blit(CZ.frame(e), sx(e.x), sy(e.y - R * 1.15), k, e.face, .45); cx.globalCompositeOperation = 'source-over'; }
        return;
      }
      for (const sh of CZ.shots) { const x = sx(sh.x), y = sy(sh.y); cx.fillStyle = 'rgba(170,230,110,.85)'; cx.beginPath(); cx.arc(x, y, sh.r, 0, TAU); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.5)'; cx.beginPath(); cx.arc(x - 2, y - 2, 2, 0, TAU); cx.fill(); }
      for (const m of CZ.minis) {
        const x = sx(m.x), y = sy(m.y), a = m.dead ? Math.max(0, 1 - m.deadF / 20) : 1; cx.globalAlpha = a;
        cx.fillStyle = '#7ac040'; cx.beginPath(); for (let i = 0; i < 10; i++) { const an = i / 10 * TAU, rr = i % 2 ? 7 : 11; cx.lineTo(x + Math.cos(an) * rr, y - 9 + Math.sin(an) * rr); } cx.closePath(); cx.fill();
        cx.fillStyle = '#1a2a10'; cx.fillRect(x - 4, y - 11, 2, 3); cx.fillRect(x + 2, y - 11, 2, 3); cx.globalAlpha = 1;
      }
      const e = cboss, x = sx(e.x), y = sy(e.y), tele = CZ.telegraph(e), fl = e.hitT > 4, a = e.dead ? Math.max(0, 1 - e.deadF / 60) : 1, R = RunnerCold.COLD.r;
      cx.globalAlpha = a; cx.save(); cx.translate(x, y); const sq = tele ? 1 + Math.sin(e.f * .7) * .08 : 1; cx.scale(sq, 1 / sq); if (e.dead) cx.rotate(e.deadF * .08);
      cx.fillStyle = fl ? '#ffffff' : e.state === 'rush' ? '#a0d040' : '#6ab030'; cx.beginPath();
      for (let i = 0; i < 24; i++) { const an = i / 24 * TAU + e.f * .01, rr = i % 2 ? R * .82 : R * 1.12; cx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } cx.closePath(); cx.fill();
      cx.fillStyle = fl ? '#ffffff' : '#8ad050'; cx.beginPath(); cx.arc(0, 0, R * .72, 0, TAU); cx.fill();
      const f = e.face; cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(f * 6 - 9, -6, 7, 0, TAU); cx.arc(f * 6 + 9, -6, 7, 0, TAU); cx.fill();
      cx.fillStyle = '#1a2a10'; cx.beginPath(); cx.arc(f * 8 - 9, -5, 3, 0, TAU); cx.arc(f * 8 + 9, -5, 3, 0, TAU); cx.fill();
      if (tele) { cx.fillStyle = 'rgba(255,90,110,.8)'; cx.beginPath(); cx.arc(f * 6 - 16, 8, 6, 0, TAU); cx.arc(f * 6 + 16, 8, 6, 0, TAU); cx.fill(); cx.fillStyle = '#3a1a10'; cx.beginPath(); cx.ellipse(f * 6, 12, 5, 7, 0, 0, TAU); cx.fill(); }
      else { cx.strokeStyle = '#1a2a10'; cx.lineWidth = 2; cx.beginPath(); cx.arc(f * 6, 8, 7, .2, Math.PI - .2); cx.stroke(); }
      cx.restore(); cx.globalAlpha = 1;
    }
    function drawStory() {
      cx.fillStyle = 'rgba(5,4,14,.9)'; cx.fillRect(0, 0, VW, VH); const L = story.lines[Math.min(story.i, story.lines.length - 1)], bw = Math.min(560, VW - 32), bx = (VW - bw) / 2, by = VH - 190;
      cx.fillStyle = 'rgba(255,255,255,.06)'; cx.fillRect(bx, by, bw, 110); cx.strokeStyle = 'rgba(222,204,248,.4)'; cx.lineWidth = 2; cx.strokeRect(bx, by, bw, 110);
      cx.textAlign = 'left'; if (L.who) { cx.fillStyle = '#00e8c8'; cx.font = 'bold 14px sans-serif'; cx.fillText(L.who, bx + 16, by + 26); }
      cx.fillStyle = L.who ? '#ffffff' : 'rgba(222,204,248,.8)'; cx.font = '16px sans-serif';
      const words = [...L.txt], maxW = bw - 32; let line = '', ly = by + (L.who ? 56 : 44); for (const ch of words) { if (cx.measureText(line + ch).width > maxW) { cx.fillText(line, bx + 16, ly); line = ''; ly += 24; } line += ch; } cx.fillText(line, bx + 16, ly);
      if (Math.sin(t * 6) > -.3) { cx.textAlign = 'right'; cx.fillStyle = '#e8b830'; cx.font = '12px sans-serif'; cx.fillText('▼ ' + (showTouch ? 'タップ' : 'Z・Enter'), bx + bw - 12, by + 100); }
    }
    function drawWarning() {
      cx.fillStyle = `rgba(80,0,10,${.55 + Math.sin(t * 10) * .15})`; cx.fillRect(0, 0, VW, VH);
      const y = VH / 2; cx.fillStyle = '#ff2a40'; cx.fillRect(0, y - 70, VW, 10); cx.fillRect(0, y + 60, VW, 10);
      cx.fillStyle = 'rgba(0,0,0,.6)'; cx.fillRect(0, y - 60, VW, 120);
      if (Math.sin(t * 9) > -.5) { cx.textAlign = 'center'; cx.fillStyle = '#ff4a5a'; cx.font = 'bold 48px sans-serif'; cx.fillText('WARNING', VW / 2, y + 4); }
      cx.fillStyle = '#ffd0d8'; cx.font = 'bold 18px sans-serif'; cx.textAlign = 'center'; cx.fillText('風邪菌襲来！', VW / 2, y + 40);
    }
    function drawBossBar() {
      if (CZ && cboss && phase === 'play') { const w = Math.min(320, VW - 40), x = (VW - w) / 2, y = 48; cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(x - 4, y - 16, w + 8, 30); cx.fillStyle = '#deccf8'; cx.font = '11px sans-serif'; cx.textAlign = 'left'; cx.fillText(RunnerBosses.BOSSES.find(b => b.id === 'cold').name, x, y - 4); cx.fillStyle = 'rgba(255,255,255,.15)'; cx.fillRect(x, y, w, 7); cx.fillStyle = '#8ad050'; cx.fillRect(x, y, w * cboss.hp / cboss.hpMax, 7); return; }
      if (!boss || !arenaOn) return; const w = Math.min(320, VW - 40), x = (VW - w) / 2, y = 48;
      cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(x - 4, y - 16, w + 8, 30); cx.fillStyle = '#deccf8'; cx.font = '11px sans-serif'; cx.textAlign = 'left'; cx.fillText(bossDef().name, x, y - 4);
      cx.fillStyle = 'rgba(255,255,255,.15)'; cx.fillRect(x, y, w, 7); cx.fillStyle = '#ff6a8a'; cx.fillRect(x, y, w * boss.hp / boss.hpMax, 7);
    }
    // ボス選択画面（利用者の絵「BOSS SELECT」）：背景・カードの中身・CLEAR／SECRET の札は絵。枠・選んでいる光・▼・下の帯の名前と面はコードで描く
    const ELEM = { kazegiri: ['風', '#ff7ae0'], dakuryu: ['水', '#7ac8ff'], raikaku: ['雷', '#ffd84a'], cold: ['菌', '#e070ff'] };
    function drawSelect() {
      if (SEL) { drawSelectArt(); return; }
      drawSelectPlain();
    }
    function drawSelectArt() {
      const L = selList(), n = L.length, IW = SEL.W, IH = SEL.H, k = Math.min(VW / IW, (VH - 20) / IH), ox = (VW - IW * k) / 2, oy = Math.max(10, (VH - IH * k) / 2);
      cx.fillStyle = '#07051a'; cx.fillRect(0, 0, VW, VH);
      cx.save(); cx.translate(ox, oy); cx.scale(k, k); cx.drawImage(SEL.bg, 0, 0);
      const rr = (x, y, w, h, r) => { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); };
      const cw = 374, ch = 612, top = 138, gap = n > 3 ? 18 : 60, x0 = IW / 2 - (n * cw + (n - 1) * gap) / 2; selRects = [];
      L.forEach((d, i) => {
        const x = x0 + i * (cw + gap), on = i === selIdx, beat = (REC.beaten || []).includes(d.id), a = SEL.F[d.id === 'cold' ? 'kazekin' : d.id];
        selRects.push({ x0: ox + x * k, x1: ox + (x + cw) * k, y0: oy + top * k, y1: oy + (top + ch) * k });
        cx.fillStyle = '#160e30'; rr(x, top, cw, ch, 16); cx.fill();
        if (a) cx.drawImage(SEL.img, a[0], a[1], a[2], a[3], x + 14, top + 66, cw - 28, 530);
        if (!on) { cx.fillStyle = 'rgba(10,6,28,.38)'; cx.fillRect(x + 14, top + 66, cw - 28, 530); }
        if (on) { cx.shadowColor = '#ff40e0'; cx.shadowBlur = 34 + Math.sin(t * 5) * 8; }
        cx.lineWidth = on ? 8 : 5; cx.strokeStyle = on ? '#ff7af2' : '#5e4c9a'; rr(x, top, cw, ch, 16); cx.stroke(); cx.shadowBlur = 0;
        if (on) {   // 角の かぎ と ▼
          cx.strokeStyle = '#ffffff'; cx.lineWidth = 5; const m = 18, L2 = 34;
          for (const [px, py, sx2, sy2] of [[x + m, top + m, 1, 1], [x + cw - m, top + m, -1, 1], [x + m, top + ch - m, 1, -1], [x + cw - m, top + ch - m, -1, -1]]) { cx.beginPath(); cx.moveTo(px + sx2 * L2, py); cx.lineTo(px, py); cx.lineTo(px, py + sy2 * L2); cx.stroke(); }
          const by = top - 46 + Math.sin(t * 6) * 6; cx.fillStyle = '#ffffff'; cx.strokeStyle = '#ff7af2'; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(x + cw / 2 - 34, by); cx.lineTo(x + cw / 2 + 34, by); cx.lineTo(x + cw / 2, by + 34); cx.closePath(); cx.stroke(); cx.fill();
        }
        const badge = d.id === 'cold' ? SEL.F.secret : beat ? SEL.F.clear : null;
        if (badge) { const bw = Math.min(cw - 30, badge[2]), bh = badge[3] * bw / badge[2]; cx.drawImage(SEL.img, badge[0], badge[1], badge[2], badge[3], x + (cw - bw) / 2, top + 10, bw, bh); }
        else { cx.fillStyle = 'rgba(222,204,248,.55)'; cx.font = 'bold 26px sans-serif'; cx.textAlign = 'center'; cx.fillText(d.order ? 'BOSS ' + d.order : '', x + cw / 2, top + 46); }
      });
      // 下の帯：選んでいるボスの名前と面
      const d = L[selIdx] || L[0], el = ELEM[d.id] || ['？', '#ffffff'], st = d.id === 'cold' ? '家（看病のあと）' : stageOf(d).name;
      cx.fillStyle = el[1]; cx.beginPath(); cx.arc(318, 840, 26, 0, TAU); cx.fill(); cx.fillStyle = '#1a0e34'; cx.font = 'bold 32px sans-serif'; cx.textAlign = 'center'; cx.fillText(el[0], 318, 852);
      cx.textAlign = 'left'; cx.fillStyle = '#ffffff'; let z = 58; do { cx.font = 'bold ' + z + 'px sans-serif'; } while (cx.measureText(d.name).width > 290 && --z > 20); cx.fillText(d.name, 360, 840 + z * .36);
      cx.fillStyle = '#ffe070'; z = 36; do { cx.font = 'bold ' + z + 'px sans-serif'; } while (cx.measureText(st).width > 330 && --z > 14); cx.fillText(st, 758, 840 + z * .36);
      if (showTouch) { cx.fillStyle = 'rgba(7,5,26,.85)'; cx.fillRect(1140, 806, 500, 70); cx.fillStyle = '#ffffff'; cx.font = 'bold 25px sans-serif'; cx.textAlign = 'center'; cx.fillText('カードをタップで選ぶ／もう一度で 行く', 1385, 850); }
      const mv = d.teaches && RunnerCombat.MOVES[d.teaches], beat = (REC.beaten || []).includes(d.id);
      cx.fillStyle = 'rgba(7,5,26,.7)'; cx.fillRect(IW / 2 - 330, 757, 660, 34); cx.fillStyle = 'rgba(232,220,255,.95)'; cx.font = 'bold 24px sans-serif'; cx.textAlign = 'center'; cx.fillText(d.id === 'cold' ? (coldRec().wins ? `追い払った ${coldRec().wins} 回` : 'まだ追い払えていない') : beat ? '倒した ── 覚えた技：' + (mv ? mv.name : '') : '倒すと 技を覚える（技は まだ仮です）', IW / 2, 782);
      cx.restore();
    }
    function drawSelectPlain() {
      cx.fillStyle = 'rgba(5,4,14,.86)'; cx.fillRect(0, 0, VW, VH); cx.textAlign = 'center';
      cx.fillStyle = '#00e8c8'; cx.font = 'bold 20px sans-serif'; cx.fillText('どこへ行く？（試作）', VW / 2, 90);
      const L = selList(), gap = L.length > 3 ? 8 : 18, cw = Math.min(170, (VW - 24 - gap * (L.length - 1)) / L.length), x0 = VW / 2 - (L.length * cw + (L.length - 1) * gap) / 2;
      selRects = L.map((d, i) => ({ x0: x0 + i * (cw + gap), x1: x0 + i * (cw + gap) + cw, y0: 140, y1: 350 }));
      const thumb = (id, x, y, dim) => { const SP = BSPR[id]; if (!SP) return false; const r = SP.F['0_0'], k = Math.min(1.1, (cw - 14) / r[2], 96 / r[3]); cx.save(); cx.translate(x + cw / 2, y + 128); cx.scale(-k, k); if (dim) cx.globalAlpha = .55; cx.drawImage(SP.img, r[0], r[1], r[2], r[3], -r[4], -r[5], r[2], r[3]); cx.restore(); cx.globalAlpha = 1; return true; };
      const fit = (txt, w, px, bold) => { let z = px; do { cx.font = (bold ? 'bold ' : '') + z + 'px sans-serif'; } while (cx.measureText(txt).width > w && --z > 7); };
      L.forEach((d, i) => {
        const x = x0 + i * (cw + gap), y = 140, on = i === selIdx;
        if (d.id === 'cold') { const R = coldRec(); cx.fillStyle = on ? 'rgba(138,208,80,.18)' : 'rgba(255,255,255,.06)'; cx.fillRect(x, y, cw, 210); cx.strokeStyle = on ? '#8ad050' : 'rgba(255,255,255,.25)'; cx.lineWidth = 2; cx.strokeRect(x, y, cw, 210);
          if (!thumb('kazekin', x, y, false)) { cx.fillStyle = '#6ab030'; cx.beginPath(); for (let k = 0; k < 20; k++) { const an = k / 20 * TAU, rr = k % 2 ? 26 : 34; cx.lineTo(x + cw / 2 + Math.cos(an) * rr, y + 80 + Math.sin(an) * rr); } cx.closePath(); cx.fill(); }
          cx.fillStyle = '#deccf8'; fit(d.name, cw - 8, 13, true); cx.fillText(d.name, x + cw / 2, y + 150); const w1 = R.wins ? `追い払った ${R.wins} 回` : 'まだ追い払えていない'; fit(w1, cw - 8, 11); cx.fillStyle = R.wins ? '#e8b830' : 'rgba(222,204,248,.7)'; cx.fillText(w1, x + cw / 2, y + 172); cx.fillStyle = 'rgba(222,204,248,.5)'; fit('家（看病のあと）', cw - 8, 11); cx.fillText('家（看病のあと）', x + cw / 2, y + 192); return; }
        const beat = (REC.beaten || []).includes(d.id);
        cx.fillStyle = on ? 'rgba(0,232,200,.18)' : 'rgba(255,255,255,.06)'; cx.fillRect(x, y, cw, 210); cx.strokeStyle = on ? '#00e8c8' : 'rgba(255,255,255,.25)'; cx.lineWidth = 2; cx.strokeRect(x, y, cw, 210);
        if (!thumb(d.id, x, y, beat)) { cx.save(); cx.translate(x + cw / 2, y + 120); cx.scale(1.6, 1.6); cx.fillStyle = beat ? '#555a6a' : '#5a3a8a'; cx.fillRect(-15, -38, 30, 38); cx.restore(); }
        cx.fillStyle = '#e8b830'; cx.font = 'bold 10px sans-serif'; if (d.order) cx.fillText('BOSS ' + d.order, x + cw / 2, y + 16);
        cx.fillStyle = '#deccf8'; fit(d.name, cw - 8, 13, true); cx.fillText(d.name, x + cw / 2, y + 150);
        const mv = d.teaches && RunnerCombat.MOVES[d.teaches], w2 = beat ? '倒した（' + (mv ? mv.name : '') + '）' : '覚える技：？？？'; fit(w2, cw - 8, 11); cx.fillStyle = beat ? '#e8b830' : 'rgba(222,204,248,.7)'; cx.fillText(w2, x + cw / 2, y + 172);
        cx.fillStyle = 'rgba(222,204,248,.5)'; fit(stageOf(d).name, cw - 8, 11); cx.fillText(stageOf(d).name, x + cw / 2, y + 192);
      });
      cx.fillStyle = 'rgba(222,204,248,.55)'; cx.font = '11px sans-serif'; cx.fillText('ボスを選ぶと、そのボスの面へ（覚える技は、まだ仮です）', VW / 2, 384);
      if (Math.sin(t * 6) > -.3) { cx.fillStyle = '#e8b830'; cx.font = '13px sans-serif'; cx.fillText((showTouch ? 'タップ' : 'Z・Enter') + 'で 行く', VW / 2, 420); }
    }
    function drawHUD() {
      cx.textAlign = 'left'; cx.font = 'bold 14px sans-serif';
      if (CZ) {   // 感染ゲージ（満タンで寝込む）
        cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fillRect(10, 10, 220, 30); cx.fillStyle = '#deccf8'; cx.font = 'bold 12px sans-serif'; cx.fillText('感染', 16, 30);
        cx.fillStyle = 'rgba(255,255,255,.15)'; cx.fillRect(52, 18, 168, 14); cx.fillStyle = infect > 70 ? '#ff4a5a' : infect > 40 ? '#e8b830' : '#8ad050'; cx.fillRect(52, 18, 168 * infect / 100, 14); cx.font = 'bold 14px sans-serif';
      } else {
      cx.fillStyle = 'rgba(0,0,0,.5)'; cx.fillRect(10, 10, 184, 30); cx.fillStyle = '#deccf8'; cx.fillText('☂', 18, 31);
      for (let i = 0; i < HP_MAX; i++) { cx.fillStyle = i < hp ? '#00e8c8' : 'rgba(255,255,255,.15)'; cx.fillRect(38 + i * 18, 18, 14, 14); }
      }
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
      let wantX = clamp(B.x - VW * (B.face > 0 ? .38 : .62), 0, map.W * map.tile - VW);
      if (arenaOn && AR) { const lo = AR.x0 - map.tile, hi = AR.x1 + map.tile - VW; wantX = hi >= lo ? clamp(B.x - VW / 2, lo, hi) : (lo + hi) / 2; }   // ボスの部屋ではカメラが部屋に止まる
      const wantY = clamp(B.y - 160, 0, Math.max(0, map.H * map.tile - VH));
      camX += (wantX - camX) * .12; camY += (wantY - camY) * .08;
      const shx = shake > 0 ? rnd(-3, 3) * shake * 3 : 0;
      cx.save(); cx.translate(shx, 0);
      drawBack(); drawTiles();
      for (const p of P) if (p.a) { cx.globalAlpha = Math.max(0, p.l / p.m); cx.fillStyle = p.c; cx.fillRect(sx(p.x) - p.s / 2, sy(p.y) - p.s / 2, p.s, p.s); }
      cx.globalAlpha = 1; drawFoes(); drawBoss(); drawCold(); drawPlayer(); drawSlash();
      if (!CZ) { cx.strokeStyle = 'rgba(170,190,255,.3)'; cx.lineWidth = 1; cx.beginPath(); for (let i = 0; i < RN; i += 2) { cx.moveTo(rx[i], ry[i]); cx.lineTo(rx[i] - 6, ry[i] - rl[i]); } cx.stroke(); }
      cx.restore();
      if (flash > 0) { cx.fillStyle = `rgba(255,120,140,${flash * .25})`; cx.fillRect(0, 0, VW, VH); }
      drawHUD(); drawBossBar();
      if (banner) { const a = Math.min(1, banner.t * 3, (2.6 - banner.t) * 3); cx.globalAlpha = a; cx.fillStyle = 'rgba(5,4,14,.7)'; cx.fillRect(0, 70, VW, 34); cx.fillStyle = '#00e8c8'; cx.font = 'bold 15px sans-serif'; cx.textAlign = 'center'; cx.fillText(banner.txt, VW / 2, 93); cx.globalAlpha = 1; }
      if (phase === 'intro') card(['高難易度版（試作）', '雨の町を、コンビニまで。', '←→ 移動　Z ジャンプ　X 攻撃（3 段・空中）　C ダッシュ　↓ スライド', '壁に向かって押しながら跳ぶと、壁を蹴る　（ボスを倒すと 技を覚える）'], (showTouch ? 'タップ' : 'Z・Enter') + 'で はじめる');
      if (phase === 'select') drawSelect();
      if (phase === 'learn') { const mv = RunnerCombat.MOVES[learnedNow] || {}; card(['新しい技を覚えた', mv.name || '', mv.howto || '', mv.desc || ''], (showTouch ? 'タップ' : 'Z・Enter') + 'で 続ける'); }
      if (phase === 'clear') card(['コンビニに着いた', `${runTime.toFixed(1)} 秒　／　ぶつかった ${hurts} 回`, '冷却シートと、プリン。'], (showTouch ? 'タップ' : 'Z・Enter') + 'で 戻る');
      if (phase === 'over') card(['傘が折れた……', 'もう一度、行かなきゃ。'], (showTouch ? 'タップ' : 'Z・Enter') + 'で 戻る');
      if (phase === 'story') drawStory();
      if (phase === 'warning') drawWarning();
      if (phase === 'coldend') {
        if (coldRes === 'win') { cx.fillStyle = 'rgba(5,4,14,.82)'; cx.fillRect(0, 0, VW, VH); cx.textAlign = 'center'; cx.fillStyle = '#e8b830'; cx.font = 'bold ' + Math.min(34, VW / 14) + 'px sans-serif'; cx.fillText('父ちゃんは今日も休めない！', VW / 2, VH / 2 - 10); cx.fillStyle = '#deccf8'; cx.font = '14px sans-serif'; cx.fillText(`風邪菌を追い払った　／　感染 ${Math.round(infect)}%`, VW / 2, VH / 2 + 30); if (Math.sin(t * 6) > -.3) { cx.fillStyle = '#e8b830'; cx.font = '13px sans-serif'; cx.fillText((showTouch ? 'タップ' : 'Z・Enter') + 'で 戻る', VW / 2, VH / 2 + 90); } }
        else card(['寝込んでしまった……', '子どもが、枕元にいる。'], (showTouch ? 'タップ' : 'Z・Enter') + 'で 戻る');
      }
    }

    // 試験の時だけの入口（window.__MG_TEST__ がある時だけ）
    if (typeof window !== 'undefined' && window.__MG_TEST__) window.__MG_TEST__.runnerHard = {
      get s() { return { selArt: !!SEL, selRects, VW, stage: STAGE.id, bossSprite: !!(boss ? BSPR[boss.id] : BSPR.raikaku), sprites: Object.keys(BSPR), sel: typeof RunnerBosses !== 'undefined' ? selList().map(d => d.id) : [], selIdx, gmW: GM ? { winds: GM.winds.map(q => GM.live(q)), floods: GM.floods.map(q => Math.round(GM.level(q))) } : null, gm: GM ? { strips: GM.strips.map(q => GM.live(q)), crumbles: GM.crumbles.map(c => c.st), charged: GM.charged } : null, boss: boss ? { hp: boss.hp, state: boss.state, dead: boss.dead, x: boss.x, face: boss.face, frame: BZ.frame(boss), w: BZ.spec(boss).w, grounded: boss.grounded, y: boss.y } : null, art: artVisible(), arenaOn, arena: AR, moves: C ? [...C.learned] : [], beaten: REC.beaten || [], sprite: !!SPR, spriteKey: SPR && B ? spriteKey() : null, phase, hp, falls, hurts, runTime, outcome, kills, foes: foes.map(e => ({ type: e.type, x: e.x, y: e.y, hp: e.hp, dead: e.dead, face: e.face })), invul: B && B.invul, atk: B && B.atk && B.atk.id, x: B && B.x, y: B && B.y, state: B && B.state, goal, spawn, checks: checks.map(c => !!c.got) }; },
      get cold() { return { on: !!CZ, home: !!(CZ && CZ.home), hp: cboss ? cboss.hp : null, state: cboss ? cboss.state : null, dead: cboss ? cboss.dead : null, x: cboss ? cboss.x : null, y: cboss ? cboss.y : null, infect, res: coldRes, rec: REC.cold || null, story: story ? { i: story.i, n: story.lines.length, txt: (story.lines[story.i] || {}).txt } : null, sel: selList().map(d => d.id) }; },
      heal() { hp = HP_MAX; }, coldHp(n) { if (cboss) cboss.hp = n; }, infect(n) { infect = n; }, beatAll() { REC.beaten = RunnerBosses.visible().map(b => b.id); },
      bossHp(n) { if (boss) boss.hp = n; }, bossGo(st) { if (boss) { boss.state = st; boss.f = 0; boss.blocks = 0; } },
      warp(x, y) { if (B) { B.x = x; B.y = y; B.vx = B.vy = 0; act.go(B, 'fall'); } }, start() { advance(); },
    };

    try { if (mg.exposeSfx) mg.exposeSfx(Object.keys(SE), k => SE[k] && SE[k]()); } catch (_) {}   // 音の一覧（設定・試験から鳴らせる）
    resize(); initRain(); if (ro) ro.observe(body);
    loadAct(); loadSprite();
    mg.loop(dt => { update(Math.max(0, Math.min(.1, dt))); if (mg._ended) return; draw(); });

    let firstBeat = null;                                             // この回で初めて倒したボス（結果の表示とごほうび）
    return { result(reason) {
      if (ro) ro.disconnect();
      fsExit(); if (fsBtn) { fsBtn.remove(); document.removeEventListener('fullscreenchange', fsLabel); document.removeEventListener('webkitfullscreenchange', fsLabel); }
      if (outcome) reason = outcome;
      if (reason === 'clear' || reason === 'down') commit();
      if (reason === 'cold' || (reason === 'clear' && coldRes)) {   // 隠しボス（看病のあと）。効き目は通常のクリアに近く、負けても軽め
        const win = coldRes === 'win', withRun = reason === 'clear';
        const fx = win ? { childStress: -(6 + (firstBeat ? 2 : 0)), mental: 3 + (firstBeat ? 2 : 0), fatigue: 8 } : coldRes === 'lose' ? { childStress: -4, mental: -1, fatigue: 8 } : { fatigue: 4 };
        return {
          title: (win ? '🦠 父ちゃんは今日も休めない！' : coldRes === 'lose' ? '🦠 今度は自分が風邪をひいた' : '🦠 引き返した') + '（高難易度版・試作）',
          summary: (withRun ? `コンビニまで ${runTime.toFixed(1)} 秒。` : '') + (win ? '風邪菌を追い払った。子どもは、すっかり元気になっている。' : coldRes === 'lose' ? '寝込んでしまった。元気になった子どもが、枕元にやってきた。' : '')
            + `<br>感染 ${Math.round(infect)}%` + (firstBeat ? `<br>${firstBeat.name} を倒した。` : ''),
          fx, time: 40, sp: firstBeat ? 1 : 0,
          log: win ? '子どもの風邪がうつりかけたが、気合いで追い払った（高難易度版）。' : coldRes === 'lose' ? '子どもは元気になったが、看病していた自分が風邪で寝込んだ（高難易度版）。' : '看病のあと、途中で引き返した（高難易度版）。',
          cutin: win ? ['happy', 'ふふん、そう簡単に倒れてられないのよ！'] : coldRes === 'lose' ? ['tired', '……今度はあたしが風邪ひいたわ……'] : null,
        };
      }
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
