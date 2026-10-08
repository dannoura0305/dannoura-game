/* ══════════════════════════════════════════════════════════
   main/day31.js — 本編タイトルの隠し項目「DAY 31」（おまけ『境界事象』TRUE END 後）
   ・表示条件：localStorage.kyokai_true_end === '1' かつ 本編エンディングを1つ以上見ている（dannoura_endings）
   ・選ぶと短いイベント（深夜の部屋 → PC → 身に覚えのない動画「月代町観測記録」00:00:44
     → 「聞こえますか？」→ だんのうら「……誰？」→ 切断 → 配信画面 視聴者1・コメント「また会ったね」→ 暗転 → タイトル）
   ・本編のセーブ・設定・エンディング記録には一切書き込まない（読むだけ）。
   ・タイトルの「おまけ：境界事象」ボタン（kyokai.html へ）のラベルもここで整える。
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ── 表示条件（DOMなし・テストで node:vm から呼ぶ）──
  function visible(ls) {
    var get = function (k) { try { return ls ? ls.getItem(k) : null; } catch (e) { return null; } };
    if (get('kyokai_true_end') !== '1') return false;
    var raw = get('dannoura_endings'); if (!raw) return false;
    var e; try { e = JSON.parse(raw); } catch (x) { return false; }
    var TYPES = ['collapse', 'bankrupt', 'flame', 'debtfree', 'engineer', 'father', 'king', 'rebirth', 'normal'];
    if (Array.isArray(e)) return e.some(function (t) { return TYPES.indexOf(t) >= 0; });
    if (!e || typeof e !== 'object') return false;
    return Object.keys(e).some(function (t) { return TYPES.indexOf(t) >= 0 && !!e[t]; });
  }

  var API = { visible: visible, play: play, active: false };
  root.DAY31 = API;
  if (typeof document === 'undefined') return;

  // ── 見た目（本編の配信画面・暗い部屋に寄せる）──
  var CSS = [
    '.d31{position:fixed;inset:0;z-index:400;background:#000;color:#efeaff;font-family:var(--dot,"DotGothic16",sans-serif);overflow:hidden;-webkit-tap-highlight-color:transparent;cursor:pointer;opacity:0;transition:opacity .6s;}',
    '.d31.on{opacity:1;}',
    '.d31 canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}',
    '.d31-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px);}',
    '.d31-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;opacity:0;transition:opacity .8s;pointer-events:none;}',
    '.d31-card.on{opacity:1;}',
    '.d31-card b{font-family:var(--mono,"Share Tech Mono",monospace);font-weight:normal;font-size:clamp(2.6rem,13vw,4.6rem);letter-spacing:.18em;color:#fff;text-shadow:0 0 18px rgba(160,120,255,.7),3px 3px 0 #1b0d40;}',
    '.d31-card i{font-style:normal;font-size:.8rem;letter-spacing:.3em;color:#a99cd8;}',
    '.d31-msg{position:absolute;left:50%;bottom:max(18px,4vh);transform:translateX(-50%);width:min(92vw,460px);box-sizing:border-box;padding:12px 14px 14px;background:linear-gradient(180deg,rgba(18,12,46,.94),rgba(8,5,24,.96));border:2px solid #6a58b8;box-shadow:0 0 0 2px #04020c,4px 4px 0 rgba(0,0,0,.5);border-radius:4px;font-size:.95rem;line-height:1.75;letter-spacing:.06em;min-height:4.4em;opacity:0;transition:opacity .25s;}',
    '.d31-msg.on{opacity:1;}',
    '.d31-msg .nm{display:inline-block;font-size:.7rem;color:#ffe48a;letter-spacing:.2em;margin-bottom:2px;}',
    '.d31-msg .nx{position:absolute;right:10px;bottom:6px;font-size:.6rem;color:#8ff4e6;animation:d31b 1s steps(1) infinite;}',
    '@keyframes d31b{50%{opacity:0}}',
    '.d31-player{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:min(90vw,440px);background:#0b0a14;border:2px solid #3a3456;box-shadow:0 0 40px rgba(120,140,255,.18);opacity:0;transition:opacity .4s;pointer-events:none;}',
    '.d31-player.on{opacity:1;}',
    '.d31-player .bar{display:flex;justify-content:space-between;gap:8px;padding:6px 10px;font-family:var(--mono,"Share Tech Mono",monospace);font-size:.68rem;color:#b9b2d8;background:#14112a;border-bottom:1px solid #2b2648;}',
    '.d31-player .bar b{font-family:var(--dot,"DotGothic16",sans-serif);font-weight:normal;color:#fff;letter-spacing:.12em;}',
    '.d31-player .scr{position:relative;aspect-ratio:16/9;background:#050508;overflow:hidden;}',
    '.d31-player .scr canvas{position:absolute;inset:0;}',
    '.d31-player .ft{display:flex;align-items:center;gap:8px;padding:6px 10px;font-family:var(--mono,"Share Tech Mono",monospace);font-size:.66rem;color:#8e88ac;}',
    '.d31-player .ft .tl{flex:1;height:3px;background:#2b2648;position:relative;}',
    '.d31-player .ft .tl s{position:absolute;left:0;top:0;bottom:0;width:0;background:#e8304a;text-decoration:none;}',
    '.d31-player .sub{position:absolute;left:0;right:0;bottom:8%;text-align:center;font-size:.95rem;color:#fff;text-shadow:0 0 4px #000,1px 1px 0 #000;letter-spacing:.1em;}',
    '.d31-hist{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:min(90vw,420px);background:#0d0b1c;border:2px solid #3a3456;font-family:var(--mono,"Share Tech Mono",monospace);font-size:.7rem;color:#b9b2d8;opacity:0;transition:opacity .4s;pointer-events:none;}',
    '.d31-hist.on{opacity:1;}',
    '.d31-hist div{padding:7px 10px;border-bottom:1px dashed #2b2648;display:flex;justify-content:space-between;gap:10px;}',
    '.d31-hist div:first-child{background:#14112a;color:#8ff4e6;letter-spacing:.2em;}',
    '.d31-hist div.hl{color:#fff;background:rgba(232,48,74,.12);}',
    '.d31-hist div.hl span:first-child{font-family:var(--dot,"DotGothic16",sans-serif);}',
    '.d31-str{position:absolute;inset:0;display:flex;flex-direction:column;background:#0a0720;opacity:0;transition:opacity .3s;pointer-events:none;}',
    '.d31-str.on{opacity:1;}',
    '.d31-str > *{width:100%;max-width:480px;margin:0 auto;box-sizing:border-box;}',
    '.d31-str .hd{background:linear-gradient(180deg,#1b1442,#0a0720);border-bottom:2px solid #6a58b8;padding:8px 12px;display:flex;align-items:center;gap:8px;}',
    '.d31-str .live{background:#e8304a;color:#fff;font-family:var(--mono,"Share Tech Mono",monospace);font-size:.62rem;padding:2px 6px;letter-spacing:.14em;}',
    '.d31-str .tt{flex:1;font-size:.78rem;color:#fff;}',
    '.d31-str .vc{font-family:var(--mono,"Share Tech Mono",monospace);font-size:.74rem;color:#ffe48a;}',
    '.d31-str .vis{height:75px;display:flex;align-items:center;justify-content:center;gap:4px;background:radial-gradient(ellipse at center,rgba(138,82,212,.14),transparent);}',
    '.d31-str .vis i{display:block;width:4px;height:3px;background:#6a58b8;opacity:.6;}',
    '.d31-str .st{display:flex;gap:6px;padding:5px 10px 8px;background:linear-gradient(180deg,#0f0b28,#09061c);border-top:1px solid rgba(217,204,255,.14);font-family:var(--mono,"Share Tech Mono",monospace);font-size:.62rem;color:#8e88ac;flex-wrap:wrap;}',
    '.d31-str .st span{padding:2px 6px;border:1px solid rgba(217,204,255,.14);}',
    '.d31.strm .d31-skip{display:none;}',
    '.d31-str .feed{flex:1;padding:10px 12px;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;}',
    '.d31-str .cm{font-size:.86rem;line-height:1.5;opacity:0;transform:translateY(6px);transition:opacity .5s,transform .5s;}',
    '.d31-str .cm.on{opacity:1;transform:none;}',
    '.d31-str .cm .u{color:#8e88ac;font-family:var(--mono,"Share Tech Mono",monospace);font-size:.7rem;margin-right:8px;}',
    '.d31-skip{position:absolute;bottom:max(8px,env(safe-area-inset-bottom));right:10px;z-index:3;font-family:var(--mono,"Share Tech Mono",monospace);font-size:.6rem;color:rgba(255,255,255,.35);background:none;border:1px solid rgba(255,255,255,.15);padding:6px 10px;cursor:pointer;}',
    '.d31.glitch canvas,.d31.glitch .d31-player{animation:d31g .12s steps(2) 3;}',
    '@keyframes d31g{0%{transform:translate(0,0)}50%{transform:translate(-6px,2px)}100%{transform:translate(5px,-1px)}}',
    '@media (prefers-reduced-motion:reduce){.d31 *{animation:none!important;transition-duration:.01s!important;}}'
  ].join('\n');

  // ── 音（WebAudio 合成。効果音の音量設定に従う）──
  var AC = null;
  function seVol() { try { return (typeof AUDIO_SET !== 'undefined' && AUDIO_SET) ? Math.max(0, Math.min(1, +AUDIO_SET.se)) : 1; } catch (e) { return 1; } }
  function ctx() { try { if (!AC) AC = new (root.AudioContext || root.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
  function noise(dur, vol) {
    var c = ctx(); if (!c || !seVol()) return;
    var n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = .6;
    g.gain.value = (vol || .18) * seVol(); s.buffer = b; s.connect(f); f.connect(g); g.connect(c.destination); s.start();
  }
  function tone(freq, dur, vol, type, when) {
    var c = ctx(); if (!c || !seVol()) return;
    var t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime((vol || .1) * seVol(), t + .05); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + .05);
  }
  function whistle() { tone(523, 2.4, .045, 'triangle'); tone(659, 2.4, .035, 'triangle', .05); tone(392, 2.6, .025, 'sine', .1); }
  function pcOn() { tone(1046, .12, .05, 'square'); tone(1568, .18, .04, 'square', .12); }
  function join() { tone(880, .08, .05, 'sine'); tone(1320, .12, .05, 'sine', .09); }

  // ── 描画 ──
  function drawRoom(cv, t, opt) {
    var dpr = Math.min(2, root.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#05040c'; g.fillRect(0, 0, W, H);
    // 窓（雨）
    var wx = W * .08, wy = H * .12, ww = W * .22, wh = H * .3;
    g.fillStyle = '#0c1024'; g.fillRect(wx, wy, ww, wh);
    g.strokeStyle = 'rgba(160,170,230,.12)'; g.lineWidth = 1;
    for (var i = 0; i < 18; i++) { var rx = wx + ((i * 37 + t * .09) % ww), ry = wy + ((i * 53 + t * .4) % wh); g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 2, ry + 9); g.stroke(); }
    g.strokeStyle = '#1a1830'; g.lineWidth = 3; g.strokeRect(wx, wy, ww, wh); g.beginPath(); g.moveTo(wx + ww / 2, wy); g.lineTo(wx + ww / 2, wy + wh); g.stroke();
    // 机
    var dy = H * .66; g.fillStyle = '#120e22'; g.fillRect(0, dy, W, H - dy); g.fillStyle = '#1d1736'; g.fillRect(0, dy, W, 4);
    // モニター
    var mw = Math.min(W * .46, 300), mh = mw * .6, mx = W * .5 - mw / 2, my = dy - mh - 24;
    var glow = opt.monitor ? .9 : .0;
    if (glow) { var rg = g.createRadialGradient(W / 2, my + mh / 2, 10, W / 2, my + mh / 2, Math.max(W, H) * .6); rg.addColorStop(0, 'rgba(110,120,220,' + (.22 * glow) + ')'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
    g.fillStyle = '#0a0a12'; g.fillRect(mx - 6, my - 6, mw + 12, mh + 12);
    g.fillStyle = opt.monitor ? '#2a2f5c' : '#07070b'; g.fillRect(mx, my, mw, mh);
    if (opt.monitor) { g.fillStyle = 'rgba(255,255,255,.08)'; for (var y = 0; y < mh; y += 3) g.fillRect(mx, my + y, mw, 1); }
    g.fillStyle = '#0a0a12'; g.fillRect(W / 2 - 8, my + mh + 6, 16, 18); g.fillRect(W / 2 - 34, dy - 4, 68, 4);
    // マイク
    var kx = mx + mw + 26; g.strokeStyle = '#2a2440'; g.lineWidth = 3; g.beginPath(); g.moveTo(kx, dy); g.lineTo(kx, dy - 60); g.lineTo(kx - 16, dy - 80); g.stroke();
    g.fillStyle = '#2f2850'; g.beginPath(); g.ellipse(kx - 18, dy - 88, 9, 14, -.5, 0, Math.PI * 2); g.fill();
    // 机の上：参考書・工具・子どもの絵（だんのうらの部屋）
    g.fillStyle = '#3a2a5a'; g.fillRect(mx - 70, dy - 16, 48, 12); g.fillStyle = '#5a3a3a'; g.fillRect(mx - 66, dy - 26, 42, 10);
    g.fillStyle = '#d8d0b8'; g.save(); g.translate(W * .82, H * .2); g.rotate(.06); g.fillRect(0, 0, W * .1, W * .075);
    g.strokeStyle = '#e8304a'; g.lineWidth = 2; g.beginPath(); g.arc(W * .05, W * .035, W * .02, 0, Math.PI * 2); g.stroke(); g.restore();
    // だんのうら（後ろ姿・逆光）：紫のポニーテール・小さなピンクのシルクハット・めがねのつる
    if (opt.man) {
      var cx = W / 2 + (opt.manX || 0), by = H * 1.02, hyT = dy + Math.min(40, H * .05), sh = Math.min((by - hyT) / .78, W * .6);
      g.fillStyle = '#0b0816';
      g.beginPath(); g.moveTo(cx - sh / 2, by); g.quadraticCurveTo(cx - sh / 2 + 6, by - sh * .55, cx - sh * .18, by - sh * .62); g.lineTo(cx + sh * .18, by - sh * .62); g.quadraticCurveTo(cx + sh / 2 - 6, by - sh * .55, cx + sh / 2, by); g.fill();
      var hy = by - sh * .78, hr = sh * .19;
      g.beginPath(); g.arc(cx, hy, hr, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#5b2f8e'; g.beginPath(); g.arc(cx, hy - 2, hr * .92, Math.PI * 1.05, Math.PI * 1.95); g.fill();
      g.strokeStyle = '#7a44b8'; g.lineWidth = hr * .32; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + hr * .2, hy - hr * .2); g.quadraticCurveTo(cx + hr * 1.3, hy + hr * .2, cx + hr * .9, hy + hr * 1.5); g.stroke();
      g.save(); g.translate(cx - hr * .25, hy - hr * .78); g.rotate(-.18); g.fillStyle = '#f08ab8';
      g.fillRect(-hr * .55, -hr * .08, hr * 1.1, hr * .16); g.fillRect(-hr * .32, -hr * .62, hr * .64, hr * .56);
      g.fillStyle = '#c85a8e'; g.fillRect(-hr * .32, -hr * .2, hr * .64, hr * .1); g.restore();
      g.strokeStyle = 'rgba(200,210,255,.55)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx - hr * .98, hy + 1); g.lineTo(cx - hr * .7, hy + 2); g.stroke();
      if (opt.monitor) { g.strokeStyle = 'rgba(140,150,255,.35)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, hy, hr, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    }
    // 走査ノイズ
    if (opt.noise) { for (var k = 0; k < 40; k++) { g.fillStyle = 'rgba(255,255,255,' + (Math.random() * .12) + ')'; g.fillRect(0, Math.random() * H, W, 1 + Math.random() * 3); } }
    // 時計
    g.fillStyle = 'rgba(232,48,74,.75)'; g.font = '12px "Share Tech Mono",monospace'; g.textAlign = 'left'; g.fillText('02:44', mx + 8, my + mh - 8 > my ? my - 12 : my);
  }
  // 動画の中：観測センターの端末の前の人物（シルエット・性別が分からない）
  function drawVideo(cv, t, k) {
    var dpr = Math.min(2, root.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (!W) return;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0a0e14'; g.fillRect(0, 0, W, H);
    // 背後の観測端末の光・棚
    g.fillStyle = 'rgba(80,220,200,.10)'; g.fillRect(W * .62, H * .14, W * .3, H * .34);
    g.fillStyle = 'rgba(80,220,200,.22)'; for (var i = 0; i < 6; i++) g.fillRect(W * .65, H * (.18 + i * .045), W * (.08 + (i * 7 % 5) * .03), 2);
    g.fillStyle = '#111823'; g.fillRect(W * .04, H * .1, W * .2, H * .55);
    // 人物（顔は暗く、輪郭だけ。上着と職員証のひも）
    var cx = W * .44, sh = H * .9;
    g.fillStyle = '#05070b';
    g.beginPath(); g.moveTo(cx - sh * .42, H); g.quadraticCurveTo(cx - sh * .4, H - sh * .42, cx - sh * .14, H - sh * .5); g.lineTo(cx + sh * .14, H - sh * .5); g.quadraticCurveTo(cx + sh * .4, H - sh * .42, cx + sh * .42, H); g.fill();
    g.beginPath(); g.ellipse(cx, H - sh * .7, sh * .15, sh * .18, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(80,220,200,.25)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(cx, H - sh * .7, sh * .15, sh * .18, 0, Math.PI * 1.6, Math.PI * 2.2); g.stroke();
    g.strokeStyle = 'rgba(200,200,220,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - sh * .08, H - sh * .5); g.lineTo(cx, H - sh * .26); g.lineTo(cx + sh * .08, H - sh * .5); g.stroke();
    g.fillStyle = 'rgba(220,220,235,.3)'; g.fillRect(cx - sh * .04, H - sh * .26, sh * .08, sh * .1);
    // 汽笛のように遠い光・ノイズ
    var nz = .08 + (k || 0) * .5;
    for (var j = 0; j < 30; j++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * nz + ')'; g.fillRect(0, Math.random() * H, W, 1 + Math.random() * 2); }
    if (k > .5) { var sy = Math.random() * H; g.drawImage(cv, 0, sy * dpr, W * dpr, 20 * dpr, 8 - Math.random() * 16, sy, W, 20); }
    g.fillStyle = 'rgba(232,48,74,.9)'; g.beginPath(); g.arc(14, 14, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '10px "Share Tech Mono",monospace'; g.fillText('REC  TSUKISHIRO-BR', 22, 18);
  }

  // ── 進行 ──
  var el = null, raf = 0, st = null, waitRes = null, timer = 0, ended = false;
  function wait(ms) { return new Promise(function (r) { waitRes = r; timer = setTimeout(function () { var f = waitRes; waitRes = null; if (f) f(); }, ms); }); }
  function tap() { clearTimeout(timer); var f = waitRes; waitRes = null; if (f) f(); }
  function q(s) { return el.querySelector(s); }
  function say(name, text, ms) {
    var m = q('.d31-msg');
    m.innerHTML = ''; if (name) { var n = document.createElement('div'); n.className = 'nm'; n.textContent = name; m.appendChild(n); }
    var b = document.createElement('div'); b.textContent = text; m.appendChild(b);
    var nx = document.createElement('span'); nx.className = 'nx'; nx.textContent = '▼'; m.appendChild(nx);
    m.classList.add('on');
    return wait(ms || 2600);
  }
  function hideMsg() { q('.d31-msg').classList.remove('on'); }
  function glitch() { el.classList.remove('glitch'); void el.offsetWidth; el.classList.add('glitch'); }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!st) return;
    if (st.room) drawRoom(q('.d31-room'), t, st);
    if (st.video) {
      var p = q('.d31-player .scr canvas'); drawVideo(p, t, st.vnoise || 0);
      var el2 = Math.min(44, (t - st.v0) / 1000 * (st.vspeed || 1));
      var ss = Math.floor(el2), s = q('.d31-player .ft .cur'); if (s) s.textContent = '00:00:' + (ss < 10 ? '0' : '') + ss;
      var bar = q('.d31-player .ft .tl s'); if (bar) bar.style.width = (el2 / 44 * 100) + '%';
    }
  }

  function play() {
    if (API.active) return;
    API.active = true; ended = false;
    if (!document.getElementById('d31-css')) { var s = document.createElement('style'); s.id = 'd31-css'; s.textContent = CSS; document.head.appendChild(s); }
    var bgm = null; try { if (typeof AU !== 'undefined' && AU && AU._ba && !AU._ba.paused) { bgm = AU._ba; bgm.pause(); } } catch (e) {}
    el = document.createElement('div'); el.className = 'd31'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'DAY 31');
    el.innerHTML =
      '<canvas class="d31-room"></canvas><div class="d31-scan"></div>' +
      '<div class="d31-card"><b>DAY 31</b><i>― 深夜 2:44 ―</i></div>' +
      '<div class="d31-hist"><div><span>配信履歴</span><span>HISTORY</span></div><div><span>DAY 30 深夜の配信</span><span>01:12:08</span></div><div class="hl"><span></span><span>00:00:44</span></div><div><span>DAY 29 怪談と歌</span><span>00:58:31</span></div></div>' +
      '<div class="d31-player"><div class="bar"><b></b><span>00:00:44</span></div><div class="scr"><canvas></canvas><div class="sub"></div></div><div class="ft"><span class="cur">00:00:00</span><span class="tl"><s></s></span><span>00:00:44</span></div></div>' +
      '<div class="d31-str"><div class="hd"><span class="live">LIVE</span><span class="tt">配信中…</span><span class="vc">👁 <span class="n">0</span></span></div><div class="vis"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="feed"></div><div class="st"><span>👥 ―</span><span>💜 ―</span><span>💫 ―</span><span>DAY 31</span></div></div>' +
      '<div class="d31-msg"></div><button class="d31-skip" type="button">SKIP</button>';
    q('.d31-hist .hl span').textContent = '月代町観測記録';
    q('.d31-player .bar b').textContent = '月代町観測記録';
    document.body.appendChild(el);
    el.addEventListener('click', function (e) { if (e.target.closest('.d31-skip')) { finish(true); return; } tap(); });
    var onKey = function (e) { if (!API.active) return; if (e.key === 'Escape') { finish(true); } else if (['Enter', ' ', 'z', 'Z'].indexOf(e.key) >= 0) { e.preventDefault(); tap(); } e.stopPropagation(); };
    window.addEventListener('keydown', onKey, true);
    raf = requestAnimationFrame(loop);
    requestAnimationFrame(function () { el.classList.add('on'); });

    function finish(skip) {
      if (ended) return; ended = true;
      clearTimeout(timer); waitRes = null;
      el.style.transition = 'opacity ' + (skip ? '.3s' : '1.6s'); el.classList.remove('on');
      setTimeout(function () {
        cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey, true);
        if (el && el.parentNode) el.parentNode.removeChild(el); el = null; st = null; API.active = false;
        try { if (bgm) bgm.play().catch(function () {}); } catch (e) {}
      }, skip ? 320 : 1700);
    }
    API._finish = finish;

    (async function () {
      try {
        var card = q('.d31-card'); card.classList.add('on'); whistle();
        await wait(2600); if (ended) return;
        card.classList.remove('on'); await wait(700); if (ended) return;
        st = { room: true, man: true, monitor: false };
        await say('', '30日目は、もう終わったはずだった。', 2600); if (ended) return;
        st.monitor = true; pcOn();
        await say('', '眠れずに、PCをつけた。', 2200); if (ended) return;
        await say('だんのうら', '……なーん、こんな時間に通知け？', 2400); if (ended) return;
        hideMsg(); q('.d31-hist').classList.add('on'); join();
        await say('', '配信履歴に、身に覚えのない配信がある。', 2600); if (ended) return;
        await say('', 'タイトル「月代町観測記録」。再生時間 00:00:44。', 2800); if (ended) return;
        hideMsg(); q('.d31-hist').classList.remove('on'); await wait(400); if (ended) return;
        // 再生
        st.video = true; st.v0 = performance.now(); st.vspeed = 4.7; st.vnoise = .15; q('.d31-player').classList.add('on'); noise(.4, .08);
        await wait(2400); if (ended) return;
        var sub = q('.d31-player .sub'); sub.textContent = '「聞こえますか？」';
        await wait(2600); if (ended) return;
        sub.textContent = ''; st.vnoise = .9; noise(.9, .2); glitch();
        await wait(1100); if (ended) return;
        st.vnoise = .3;
        await say('だんのうら', '……誰？', 2600); if (ended) return;
        // 切断
        hideMsg(); st.vnoise = 1.2; noise(1.2, .26); glitch();
        await wait(600); if (ended) return;
        q('.d31-player').classList.remove('on'); st.video = false; st.room = false; st.man = false;
        var cv = q('.d31-room'); var g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
        await wait(1200); if (ended) return;
        // いつもの配信画面
        var sc = q('.d31-str'); sc.classList.add('on'); el.classList.add('strm'); var n = sc.querySelector('.vc .n');
        n.textContent = '0'; await wait(900); if (ended) return;
        n.textContent = '1'; join(); await wait(1600); if (ended) return;
        var cm = document.createElement('div'); cm.className = 'cm'; var u = document.createElement('span'); u.className = 'u'; u.textContent = '――'; cm.appendChild(u); cm.appendChild(document.createTextNode('また会ったね'));
        sc.querySelector('.feed').appendChild(cm); requestAnimationFrame(function () { cm.classList.add('on'); }); tone(1760, .2, .04, 'sine');
        await wait(3600); if (ended) return;
        whistle();
        finish(false);
      } catch (e) { try { console.warn('[day31]', e); } catch (x) {} finish(true); }
    })();
  }

  // ── タイトルのボタン ──
  function lbl(icon, text, hint) {
    var ic = ''; try { if (root.ICONS) ic = root.ICONS.html(icon, 20).replace('class="ic ', 'class="ic ic-lead '); } catch (e) {}
    return '<span class="pr-lbl">' + ic + text + '</span><span class="pr-hint">' + hint + '</span>';
  }
  function initTitle() {
    var ky = document.getElementById('btn-kyokai');
    if (ky) ky.innerHTML = lbl('radio', 'おまけ：境界事象', 'EXTRA');
    var d = document.getElementById('btn-day31');
    if (d) {
      var ok = false; try { ok = visible(root.localStorage); } catch (e) { ok = false; }
      d.innerHTML = lbl('night', 'DAY 31', '――');
      d.style.display = ok ? '' : 'none';
    }
  }
  root.openKyokai = function () { try { location.href = 'kyokai.html'; } catch (e) {} };
  root.openDay31 = function () { play(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initTitle); else initTitle();
})(typeof window !== 'undefined' ? window : globalThis);
