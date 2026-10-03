// ══════════════════════════════════════════════════════════
// 経営シミュレーション「チャンネル運営会議」
// 来週の配信スケジュール（月〜日）に企画カードを並べ、時間帯を決めて「放送開始」。
// 1週間を夜ごとにシミュレーションし、最後に通信簿（S〜D）を出す。
// 流れ：タイトル → 会話（チュートリアル） → 企画会議 → 1週間の放送 → 通信簿
// 隠しルール（遊ぶと「気づき」としてメモに残る）:
//   1) 客層との相性（スキル・資格知識・仕事評価＋セーブごとの隠し嗜好）
//   2) 新鮮さ：同じ企画の繰り返しで低下（連日だとさらに）
//   3) シナジー（告知→コラボ/歌枠、怪談→ラジオ、工場↔資格、休み→歌枠/コラボ、ラジオ→凸待ち）
//   4) 疲労：連続配信で加速・休みでリセット・限界で寝落ち／週末疲労70超はペナルティ
//   5) 時間帯（怪談・ラジオは2時、歌枠・ゲームは22時、0時は全体に少し強い）・週末・トレンド×1.5
// 遊んだ回数／日数で新企画（凸待ち・耐久配信）が解禁。記録は gs.managerData。
// グラフィックはすべてコード描画（ドット絵のカード・だんのうら・相方）＋ char_*.webp の立ち絵。
// ══════════════════════════════════════════════════════════
addMinigameStyle('manager',`
.mg-manager{padding:0;}
.mgr-root{position:relative;flex:1;min-height:0;width:100%;display:flex;flex-direction:column;font-family:var(--dot);color:var(--tx);user-select:none;-webkit-user-select:none;overflow:hidden;
  background:
    repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px),
    linear-gradient(rgba(138,82,212,.06) 1px,transparent 1px) 0 0/22px 22px,
    linear-gradient(90deg,rgba(138,82,212,.06) 1px,transparent 1px) 0 0/22px 22px,
    radial-gradient(120% 60% at 50% 0%,rgba(138,82,212,.2),transparent 60%),
    linear-gradient(180deg,#09061e,#05040e);}
.mgr-root button{font-family:var(--dot);-webkit-tap-highlight-color:transparent;cursor:pointer;}
.mgr-root img.px,.mgr-px{image-rendering:pixelated;image-rendering:crisp-edges;}
.mgr-plan,.mgr-sim{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;padding:7px 9px 8px;}
.mgr-panel{border:1px solid rgba(138,82,212,.35);border-radius:6px;background:linear-gradient(180deg,rgba(30,20,60,.55),rgba(10,7,22,.85));box-shadow:inset 0 1px 0 rgba(255,255,255,.07),inset 0 -2px 0 rgba(0,0,0,.4),0 2px 8px rgba(0,0,0,.4);}
.mgr-top{display:flex;gap:6px;align-items:stretch;}
.mgr-trend{flex:1;display:flex;align-items:center;gap:8px;padding:4px 9px;border:1px solid rgba(232,184,48,.45);border-radius:6px;background:linear-gradient(90deg,rgba(232,184,48,.17),rgba(232,184,48,.02) 80%),rgba(10,7,22,.8);box-shadow:inset 0 1px 0 rgba(255,240,200,.12);min-width:0;}
.mgr-trend img{width:30px;height:30px;filter:drop-shadow(0 0 5px rgba(232,184,48,.7));animation:mgrFlick 1.6s ease-in-out infinite;}
.mgr-trend small{font-family:var(--mono);font-size:.54rem;color:var(--gd);letter-spacing:.12em;display:block;line-height:1.15;}
.mgr-trend b{font-weight:normal;color:var(--tx-b);font-size:.8rem;white-space:nowrap;}
@keyframes mgrFlick{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.mgr-memo-btn{min-width:50px;min-height:44px;border:1px solid rgba(138,82,212,.55);background:linear-gradient(180deg,rgba(138,82,212,.22),rgba(138,82,212,.06));color:var(--tx-b);border-radius:6px;font-size:.62rem;line-height:1.25;padding:2px 6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);}
.mgr-memo-btn .n{font-family:var(--mono);color:var(--gd);}
.mgr-kpis{display:flex;gap:5px;}
.mgr-kpi{flex:1;padding:3px 7px;min-width:0;}
.mgr-kpi small{display:block;font-family:var(--mono);font-size:.5rem;color:var(--tx-d);letter-spacing:.06em;white-space:nowrap;}
.mgr-kpi b{font-weight:normal;font-family:var(--mono);font-size:.8rem;color:var(--tx-b);display:flex;align-items:center;gap:3px;}
.mgr-kpi b img{width:16px;height:16px;}
.mgr-kpi .bar{height:4px;border-radius:2px;background:rgba(255,255,255,.07);margin-top:2px;overflow:hidden;}
.mgr-kpi .bar i{display:block;height:100%;border-radius:2px;background:var(--gn);transition:width .35s,background .35s;}
.mgr-board{display:flex;flex-direction:column;gap:4px;flex:1;min-height:0;padding:5px;}
.mgr-row{display:flex;gap:5px;align-items:stretch;flex:1;min-height:44px;max-height:58px;}
.mgr-day{width:32px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:5px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));font-size:.86rem;color:var(--tx-b);line-height:1;box-shadow:inset 0 1px 0 rgba(255,255,255,.06);}
.mgr-day small{font-family:var(--mono);font-size:.48rem;color:var(--tx-d);margin-top:3px;}
.mgr-day.we{color:#ff8fb0;}
.mgr-slot{position:relative;flex:1;min-width:0;border:1px dashed rgba(138,82,212,.45);border-radius:6px;display:flex;align-items:center;gap:8px;padding:0 9px 0 6px;background:repeating-linear-gradient(135deg,rgba(138,82,212,.05) 0 6px,transparent 6px 12px);transition:border-color .15s,background .15s,transform .15s;touch-action:none;overflow:hidden;cursor:pointer;}
.mgr-slot .ph{font-size:.62rem;color:var(--tx-d);letter-spacing:.05em;padding-left:4px;}
.mgr-slot.hot{border-color:var(--cy);border-style:solid;background:rgba(0,232,200,.13);transform:scale(1.02);box-shadow:0 0 12px rgba(0,232,200,.35);}
.mgr-slot.armed{border-color:rgba(0,232,200,.7);animation:mgrArm 1s ease-in-out infinite;}
@keyframes mgrArm{50%{background-color:rgba(0,232,200,.08)}}
.mgr-slot.full{border-style:solid;border-color:color-mix(in srgb,var(--c) 75%,transparent);background:linear-gradient(90deg,color-mix(in srgb,var(--c) 30%,#0a0716),rgba(10,7,22,.75) 72%);box-shadow:inset 3px 0 0 var(--c),inset 0 1px 0 rgba(255,255,255,.08);}
.mgr-slot .art{width:34px;height:34px;flex:0 0 34px;border-radius:5px;background:radial-gradient(circle at 50% 40%,color-mix(in srgb,var(--c) 45%,transparent),rgba(5,4,14,.8) 75%);border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;}
.mgr-slot .art img{width:28px;height:28px;}
.mgr-slot .nm{font-size:.76rem;color:var(--tx-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;text-shadow:0 1px 0 #000;}
.mgr-slot .tr{font-family:var(--mono);font-size:.5rem;color:#05040e;background:var(--gd);border-radius:2px;padding:0 3px;margin-left:5px;vertical-align:2px;}
.mgr-slot .ft{position:absolute;left:0;bottom:0;height:3px;background:var(--gn);opacity:.85;transition:width .35s,background .35s;}
.mgr-slot.pop{animation:mgrPop .3s cubic-bezier(.2,1.8,.4,1);}
@keyframes mgrPop{0%{transform:scale(.9)}100%{transform:scale(1)}}
.mgr-slot.shake{animation:mgrShake .3s;}
@keyframes mgrShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.mgr-band{width:52px;border:1px solid rgba(0,232,200,.3);background:linear-gradient(180deg,rgba(0,232,200,.12),rgba(0,232,200,.03));color:var(--cy);border-radius:6px;font-family:var(--mono)!important;font-size:.76rem;line-height:1.05;padding:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);transition:transform .1s;}
.mgr-band:active{transform:scale(.93);}
.mgr-band small{display:block;font-family:var(--dot);font-size:.5rem;color:var(--tx-d);margin-top:2px;}
.mgr-band:disabled{opacity:.22;cursor:default;}
.mgr-band.b2{color:#a8b0ff;border-color:rgba(130,140,255,.5);background:linear-gradient(180deg,rgba(90,100,255,.18),rgba(90,100,255,.04));}
.mgr-band.b0{color:var(--gd);border-color:rgba(232,184,48,.45);background:linear-gradient(180deg,rgba(232,184,48,.16),rgba(232,184,48,.03));}
.mgr-tray{display:grid;grid-template-columns:repeat(var(--cols,5),1fr);gap:5px;padding:5px;}
.mgr-card{position:relative;min-height:52px;border:1px solid color-mix(in srgb,var(--c) 70%,transparent);border-radius:7px;background:linear-gradient(170deg,color-mix(in srgb,var(--c) 30%,#0b0820),#0a0716 68%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:3px 1px 2px;touch-action:none;transition:transform .14s,box-shadow .14s,opacity .2s;color:var(--tx-b);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 0 rgba(0,0,0,.5);overflow:hidden;cursor:grab;}
.mgr-card::after{content:"";position:absolute;left:-30%;top:0;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.13),transparent);transform:skewX(-15deg);pointer-events:none;}
.mgr-card img{width:30px;height:30px;filter:drop-shadow(0 1px 0 rgba(0,0,0,.7));}
.mgr-card .nm{font-size:.54rem;letter-spacing:-.02em;white-space:nowrap;text-shadow:0 1px 0 #000;}
.mgr-card .lim{position:absolute;top:2px;right:2px;font-family:var(--mono);font-size:.54rem;background:var(--c);color:#05040e;border-radius:7px;padding:0 4px;line-height:1.4;}
.mgr-card .nw{position:absolute;top:2px;left:2px;font-family:var(--mono);font-size:.46rem;background:var(--gd);color:#05040e;border-radius:2px;padding:0 3px;}
.mgr-card.sel{transform:translateY(-4px);box-shadow:0 0 0 2px var(--cy),0 0 16px rgba(0,232,200,.5),inset 0 1px 0 rgba(255,255,255,.18);}
.mgr-card.out{opacity:.3;filter:grayscale(.8);cursor:not-allowed;}
.mgr-card:active{transform:scale(.95);}
.mgr-ghost{position:fixed;z-index:9999;pointer-events:none;width:62px;transform:translate(-50%,-60%) rotate(-5deg) scale(1.1);box-shadow:0 10px 24px rgba(0,0,0,.65),0 0 18px color-mix(in srgb,var(--c) 65%,transparent);opacity:.96;transition:none;}
.mgr-fly{position:fixed;z-index:9999;pointer-events:none;transition:left .2s cubic-bezier(.3,.7,.3,1),top .2s cubic-bezier(.3,.7,.3,1),transform .2s,opacity .2s;}
.mgr-adv{display:flex;align-items:center;gap:7px;min-height:30px;padding:2px 8px 2px 3px;}
.mgr-adv img{width:26px;height:26px;border-radius:4px;border:1px solid rgba(232,184,48,.5);background:#120c2a;flex:0 0 26px;}
.mgr-hint{flex:1;font-size:.62rem;line-height:1.35;color:var(--tx);transition:color .2s;}
.mgr-hint.warn{color:#ff6f8c;}
.mgr-hint.ok{color:var(--cy);}
.mgr-hint.adv{color:var(--gd);}
.mgr-actions{display:flex;gap:6px;}
.mgr-undo{width:86px;min-height:50px;border-radius:7px;border:1px solid rgba(138,82,212,.55);background:linear-gradient(180deg,rgba(138,82,212,.2),rgba(138,82,212,.05));color:var(--tx-b);font-size:.72rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);}
.mgr-undo:disabled{opacity:.3;cursor:default;}
.mgr-go{flex:1;min-height:50px;border-radius:7px;border:1px solid var(--rd);background:linear-gradient(180deg,rgba(255,90,120,.35),rgba(232,48,85,.2) 50%,rgba(138,82,212,.3));color:#fff;font-size:.95rem;letter-spacing:.15em;box-shadow:0 0 18px rgba(232,48,85,.4),inset 0 1px 0 rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;gap:8px;text-shadow:0 0 6px rgba(255,80,120,.8);}
.mgr-go:not(:disabled){animation:mgrGo 1.6s ease-in-out infinite;}
@keyframes mgrGo{50%{box-shadow:0 0 28px rgba(232,48,85,.7),inset 0 1px 0 rgba(255,255,255,.25)}}
.mgr-go:disabled{opacity:.38;box-shadow:none;cursor:default;text-shadow:none;}
.mgr-go .dot{width:9px;height:9px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 8px #ff3b5c;animation:mgrBlink 1s steps(2) infinite;}
@keyframes mgrBlink{50%{opacity:.2}}
.mgr-hand{position:absolute;z-index:15;width:36px;height:36px;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.8));transition:left .9s cubic-bezier(.5,0,.3,1),top .9s cubic-bezier(.5,0,.3,1),opacity .3s;}
/* overlay */
.mgr-ov{position:absolute;inset:0;z-index:20;background:rgba(5,4,14,.84);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:10px;animation:mgrFade .25s;}
@keyframes mgrFade{from{opacity:0}to{opacity:1}}
.mgr-box{width:100%;max-width:410px;max-height:100%;overflow-y:auto;background:linear-gradient(180deg,rgba(26,18,52,.98),rgba(10,7,22,.98));border:1px solid var(--pu);border-radius:9px;padding:13px 13px 11px;box-shadow:0 0 30px rgba(138,82,212,.32),inset 0 1px 0 rgba(255,255,255,.08);}
.mgr-box h3{margin:0 0 6px;font-weight:normal;font-size:1rem;color:var(--tx-b);letter-spacing:.08em;}
.mgr-box .sub{font-family:var(--mono);font-size:.56rem;color:var(--cy);letter-spacing:.15em;}
.mgr-note{font-size:.66rem;line-height:1.7;border-left:2px solid var(--gd);padding:3px 8px;margin:7px 0;background:rgba(232,184,48,.05);font-family:var(--serif);}
.mgr-note b{color:var(--gd);font-weight:normal;font-family:var(--dot);}
.mgr-btn{display:block;width:100%;min-height:48px;margin-top:10px;border-radius:7px;border:1px solid var(--cy);background:linear-gradient(180deg,rgba(0,232,200,.2),rgba(0,232,200,.05));color:var(--cy);font-size:.88rem;letter-spacing:.1em;box-shadow:inset 0 1px 0 rgba(255,255,255,.12);}
.mgr-found{font-size:.66rem;line-height:1.6;padding:4px 0;border-bottom:1px dashed rgba(138,82,212,.22);font-family:var(--serif);}
.mgr-found.new{color:var(--tx-b);}
.mgr-found .nw{font-family:var(--mono);font-size:.52rem;background:var(--gd);color:#05040e;border-radius:2px;padding:0 4px;margin-left:4px;}
.mgr-found.lock{color:var(--tx-d);}
.mgr-past{width:100%;border-collapse:collapse;font-size:.64rem;margin-top:4px;}
.mgr-past td,.mgr-past th{padding:4px 3px;border-bottom:1px solid rgba(138,82,212,.15);text-align:left;font-weight:normal;}
.mgr-past th{font-family:var(--mono);font-size:.52rem;color:var(--tx-d);}
.mgr-past .pl img{width:14px;height:14px;vertical-align:middle;}
.mgr-g{font-family:var(--mono);font-size:.82rem;}
.mgr-gS{color:var(--gd);text-shadow:0 0 6px rgba(232,184,48,.6);} .mgr-gA{color:var(--cy);} .mgr-gB{color:#b48cf0;} .mgr-gC{color:var(--tx);} .mgr-gD{color:var(--rd);}
.mgr-sec{font-family:var(--mono);font-size:.56rem;color:var(--cy);letter-spacing:.14em;margin-top:9px;}
/* title */
.mgr-title{position:absolute;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;
  background:radial-gradient(80% 50% at 50% 42%,rgba(138,82,212,.32),transparent 70%),linear-gradient(180deg,#0b0726,#05040e);overflow:hidden;}
.mgr-title canvas{position:absolute;inset:0;width:100%;height:100%;}
.mgr-logo{position:relative;text-align:center;animation:mgrLogo .8s cubic-bezier(.2,1.5,.4,1) both;}
@keyframes mgrLogo{from{opacity:0;transform:scale(.6) translateY(20px)}to{opacity:1;transform:none}}
.mgr-logo img{width:76px;height:76px;filter:drop-shadow(0 0 12px rgba(0,232,200,.6));}
.mgr-logo .jp{font-size:1.85rem;letter-spacing:.06em;color:#fff;line-height:1.15;text-shadow:0 0 4px #fff,0 0 12px var(--pu),0 0 26px var(--pu),3px 3px 0 #3a1a70;}
.mgr-logo .en{font-family:var(--mono);font-size:.68rem;letter-spacing:.42em;color:var(--cy);margin-top:5px;text-shadow:0 0 8px rgba(0,232,200,.7);}
.mgr-logo .bar{height:2px;margin:9px auto 0;width:80%;background:linear-gradient(90deg,transparent,var(--rd),var(--gd),var(--cy),transparent);}
.mgr-tstat{position:relative;font-family:var(--mono);font-size:.66rem;color:var(--tx);letter-spacing:.08em;display:flex;gap:14px;}
.mgr-tstat b{font-weight:normal;color:var(--tx-b);}
.mgr-press{position:relative;margin-top:18px;min-height:48px;padding:0 26px;border:1px solid var(--cy);border-radius:24px;background:rgba(0,232,200,.08);color:var(--cy);font-size:.82rem;letter-spacing:.2em;animation:mgrPress 1.3s ease-in-out infinite;}
@keyframes mgrPress{50%{box-shadow:0 0 18px rgba(0,232,200,.5);background:rgba(0,232,200,.18)}}
/* story */
.mgr-story{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;justify-content:flex-end;padding:10px;background:linear-gradient(180deg,rgba(5,4,14,.25),rgba(5,4,14,.86) 55%);cursor:pointer;}
.mgr-vn{position:relative;display:flex;gap:10px;align-items:flex-end;}
.mgr-por{position:relative;width:96px;height:96px;flex:0 0 96px;border-radius:8px;overflow:hidden;border:2px solid var(--pc,#8a52d4);box-shadow:0 0 16px color-mix(in srgb,var(--pc,#8a52d4) 50%,transparent);background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--pc,#8a52d4) 40%,#120c2a),#08061a);animation:mgrPor .3s ease-out;}
@keyframes mgrPor{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.mgr-por img{width:100%;height:100%;object-fit:cover;display:block;}
.mgr-msg{flex:1;min-height:96px;border:1px solid rgba(222,204,248,.35);border-radius:8px;background:linear-gradient(180deg,rgba(26,18,52,.96),rgba(10,7,22,.96));padding:8px 10px 18px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 4px 16px rgba(0,0,0,.6);position:relative;}
.mgr-msg .who{display:inline-block;font-size:.62rem;color:#05040e;background:var(--pc,#8a52d4);padding:1px 8px;border-radius:3px;margin-bottom:5px;}
.mgr-msg .tx{font-family:var(--serif);font-size:.78rem;line-height:1.75;color:var(--tx-b);min-height:3.4em;}
.mgr-msg .nx{position:absolute;right:9px;bottom:5px;color:var(--cy);font-size:.6rem;animation:mgrBlink 1s steps(2) infinite;}
.mgr-skip{position:absolute;bottom:130px;right:10px;min-height:44px;min-width:64px;border-radius:22px;border:1px solid rgba(222,204,248,.35);background:rgba(10,7,22,.8);color:var(--tx);font-size:.66rem;}
.mgr-dots{display:flex;gap:4px;justify-content:center;margin-top:7px;}
.mgr-dots i{width:6px;height:6px;border-radius:50%;background:rgba(222,204,248,.2);}
.mgr-dots i.on{background:var(--cy);}
/* wipe */
.mgr-wipe{position:absolute;inset:0;z-index:70;pointer-events:none;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(100deg,#e83055 0,#8a52d4 3%,#0c0826 3.5%,#0c0826 96.5%,#00e8c8 97%,#00e8c8 100%);animation:mgrWipeIn .26s ease-in both;}
.mgr-wipe span{font-family:var(--mono);font-size:.8rem;letter-spacing:.5em;color:var(--cy);text-shadow:0 0 8px var(--cy);}
.mgr-wipe.out{animation:mgrWipeOut .3s ease-out both;}
@keyframes mgrWipeIn{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes mgrWipeOut{from{clip-path:inset(0 0 0 0)}to{clip-path:inset(0 0 0 100%)}}
/* sim */
.mgr-mon{position:relative;flex:0 0 auto;height:clamp(200px,37vh,300px);border-radius:8px;overflow:hidden;border:1px solid rgba(138,82,212,.45);box-shadow:0 0 22px rgba(138,82,212,.22),inset 0 0 0 1px rgba(255,255,255,.04);}
.mgr-mon canvas,.mgr-chart canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
.mgr-chat{position:absolute;right:6px;bottom:8px;width:50%;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none;}
.mgr-bub{max-width:100%;background:rgba(8,6,20,.85);border:1px solid rgba(138,82,212,.5);border-radius:9px 9px 2px 9px;padding:3px 8px;font-size:.6rem;line-height:1.45;color:var(--tx-b);animation:mgrBub .3s cubic-bezier(.2,1.6,.4,1);transition:opacity .4s;}
.mgr-bub i{font-style:normal;font-size:.5rem;display:block;}
.mgr-bub.sc{border-color:var(--gd);background:linear-gradient(90deg,rgba(90,64,8,.92),rgba(40,28,6,.92));}
@keyframes mgrBub{from{opacity:0;transform:translateY(12px) scale(.85)}to{opacity:1;transform:none}}
.mgr-evt{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:3;padding:7px 13px;border-radius:6px;font-size:.74rem;white-space:nowrap;background:linear-gradient(180deg,rgba(26,18,52,.96),rgba(5,4,14,.96));border:1px solid var(--c,#e8b830);color:var(--tx-b);box-shadow:0 0 18px color-mix(in srgb,var(--c,#e8b830) 55%,transparent);animation:mgrEvt 2s ease-out forwards;pointer-events:none;}
.mgr-evt small{display:block;font-family:var(--mono);font-size:.56rem;color:var(--c,#e8b830);text-align:center;}
@keyframes mgrEvt{0%{opacity:0;transform:translate(-50%,-30%) scale(.8)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.06)}20%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%)}}
.mgr-disc{position:absolute;left:8px;width:46%;bottom:10px;z-index:4;padding:5px 9px;border-radius:6px;border:1px solid var(--gd);background:linear-gradient(90deg,rgba(80,56,6,.95),rgba(20,14,4,.92));color:#fff4d0;font-size:.64rem;line-height:1.45;box-shadow:0 0 18px rgba(232,184,48,.5);animation:mgrDisc 2.3s ease-out forwards;pointer-events:none;}
.mgr-disc b{font-weight:normal;font-family:var(--mono);color:#05040e;background:var(--gd);padding:0 5px;border-radius:2px;margin-right:6px;font-size:.58rem;}
@keyframes mgrDisc{0%{opacity:0;transform:translateY(-12px) scale(.95)}10%{opacity:1;transform:none}85%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}
.mgr-week{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
.mgr-wd{border:1px solid rgba(138,82,212,.28);border-radius:5px;padding:2px 0 3px;text-align:center;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01));transition:all .25s;min-height:48px;}
.mgr-wd .d{font-size:.52rem;color:var(--tx-d);white-space:nowrap;}
.mgr-wd img{width:20px;height:20px;display:block;margin:1px auto 0;}
.mgr-wd .r{font-family:var(--mono);font-size:.58rem;color:var(--tx-d);min-height:.9em;}
.mgr-wd.now{border-color:var(--cy);background:rgba(0,232,200,.1);box-shadow:0 0 12px rgba(0,232,200,.3);transform:translateY(-2px);}
.mgr-wd.done .r{color:var(--gn);}
.mgr-wd.done.bad .r{color:var(--rd);}
.mgr-wd.done.great{border-color:var(--gd);}
.mgr-wd.done.great .r{color:var(--gd);}
.mgr-chart{position:relative;flex:1;min-height:150px;border-radius:8px;touch-action:none;}
.mgr-ctrl{display:flex;gap:6px;}
.mgr-ctrl button{flex:1;min-height:44px;border-radius:6px;border:1px solid rgba(0,232,200,.35);background:linear-gradient(180deg,rgba(0,232,200,.12),rgba(0,232,200,.03));color:var(--cy);font-size:.72rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);}
.mgr-ctrl button.on{background:rgba(0,232,200,.25);}
/* report */
.mgr-rep{border-color:var(--gc,#8a52d4);box-shadow:0 0 34px color-mix(in srgb,var(--gc,#8a52d4) 38%,transparent),inset 0 1px 0 rgba(255,255,255,.08);}
.mgr-rep-hd{display:flex;align-items:center;gap:12px;margin-top:4px;}
.mgr-rep-hd .pl img{width:18px;height:18px;vertical-align:middle;}
.mgr-stamp{width:76px;height:76px;flex:0 0 76px;border-radius:50%;border:3px double var(--gc);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:2.6rem;color:var(--gc);text-shadow:0 0 14px var(--gc);box-shadow:0 0 18px color-mix(in srgb,var(--gc) 45%,transparent),inset 0 0 14px color-mix(in srgb,var(--gc) 30%,transparent);transform:rotate(-10deg);animation:mgrStamp .55s cubic-bezier(.2,1.6,.4,1) both .35s;background:radial-gradient(circle,color-mix(in srgb,var(--gc) 14%,transparent),transparent 70%);}
@keyframes mgrStamp{from{opacity:0;transform:rotate(-30deg) scale(2.8)}to{opacity:1;transform:rotate(-10deg) scale(1)}}
.mgr-stats{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:9px 0 4px;}
.mgr-stat{border:1px solid rgba(138,82,212,.28);border-radius:6px;padding:4px 8px;background:linear-gradient(180deg,rgba(138,82,212,.1),rgba(138,82,212,.02));}
.mgr-stat small{display:block;font-size:.54rem;color:var(--tx-d);font-family:var(--mono);}
.mgr-stat b{font-weight:normal;font-family:var(--mono);font-size:1.05rem;color:var(--tx-b);}
.mgr-say{display:flex;gap:8px;align-items:flex-start;margin-top:7px;animation:mgrPor .35s ease-out both;}
.mgr-say .pp{width:46px;height:46px;flex:0 0 46px;border-radius:6px;overflow:hidden;border:1.5px solid var(--pc);background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--pc) 40%,#120c2a),#08061a);}
.mgr-say .pp img{width:100%;height:100%;object-fit:cover;display:block;}
.mgr-say .bb{flex:1;font-family:var(--serif);font-size:.7rem;line-height:1.6;color:var(--tx-b);background:rgba(255,255,255,.04);border:1px solid rgba(222,204,248,.18);border-radius:2px 8px 8px 8px;padding:4px 8px;}
.mgr-say .bb i{font-style:normal;display:block;font-family:var(--dot);font-size:.54rem;color:var(--pc);}
`);

(()=>{
const FONT='"DotGothic16", monospace';
const MONO='"Share Tech Mono", monospace';
const DAYS=['月','火','水','木','金','土','日'];
const BANDS=['22時','0時','2時'];

// ═════ ドット絵 ═════
const PAL={k:'#1a1030',w:'#ffffff',l:'#deccf8',p:'#a77ef0',c:'#00e8c8',r:'#e83055',y:'#e8b830',o:'#ff9a3c',g:'#44ee88',b:'#6fa8ff',m:'#ff6fa8',n:'#5e5078',s:'#9a9ab4',d:'#3a2a60',t:'#f6d6c4',e:'#2a1440'};
const ICONS={
  zatsu:['............','.kkkkkkk....','kllllllk....','klpllplk....','kllllllk....','.kklkkk.....','...kk.kkkkk.','.....kcccccck','.....kcwcwck.','.....kcccccck','........kck.','.........k..'],
  kaidan:['...kkkk.....','..kllllk....','.kllllllk...','.klkllklk...','.klkllklk...','.kllllllk..y','.kllkkllk.yo','.kllllllk..y','.kllllllk.kwk','.klkllklk.kwk','..k.kk.k..kwk','..........kkk'],
  uta:['.....k...m..','..kkk.....mm','.ksssk....m.','kslsssk..mm.','ksssssk.mmm.','ksssssk.mm..','.kssk.......','..kk...m....','..kk...mm...','..kk..mmm...','.kkkk.mm....','kddddk......'],
  game:['............','............','..kkkkkkkk..','.kddddddddk.','kddwddddgddk','kdwwwddgdgdk','kddwddddgddk','kddddkkddddk','kdddk..kdddk','.kkk....kkk.','............','............'],
  study:['.........ky.','........kyk.','.......kyk..','......kok...','.....kkk....','kkkkk..kkkkk','klllkkkklllk','klkklkklkklk','klllllkllllk','klkklkklkklk','kbbbbbkbbbbk','.kkkkkkkkkk.'],
  factory:['....kkkk....','..k.kook.k..','.kokkookkok.','..kooooook..','kkoookkoookk','koookddkoook','koookddkoook','kkoookkoookk','..kooooook..','.kokkookkok.','..k.kook.k..','....kkkk....'],
  radio:['.........c..','..........c.','........k..c','.kkkkkkkkkk.','kddddddddddk','kdlllddccddk','kdlklddccddk','kdlllddddddk','kddddddyyddk','kddddddddddk','.kkkkkkkkkk.','.k........k.'],
  collab:['.....rr.....','..pp....gg..','.pppp..gggg.','.pttp..gttg.','.tktt..ttkt.','.tttt..tttt.','..tt....tt..','.pppp..cccc.','pppppp.ccccc','pppppp.ccccc','pppppp.ccccc','............'],
  short:['..kkkkkkkk..','..kddddddk..','..kdrrrrdk..','..kdrwrrdk..','..kdrwwrdk..','..kdrwrrdk..','..kdrrrrdk..','..kddddddk..','..kdlllldk..','..kddddddk..','..kdddwddk..','..kkkkkkkk..'],
  rest:['...kkkk.....','..kyyyk..lll','.kyyyk.....l','.kyyk.....l.','kyyyk....lll','kyyyk.......','kyyyyk......','.kyyyyk.....','.kyyyyykkk..','..kkyyyyyyk.','....kkkkkk..','............'],
  totsu:['....kkkk....','...k....k...','.......k....','......k.....','......k.....','............','.kkk....kkk.','kcck....kcck','kccckkkkccck','.kccccccccck','..kccccccck.','...kkkkkkk..'],
  endure:['.kkkkkkkkkk.','..kllllllk..','..kyyyyyyk..','...kyyyyk...','....kyyk....','.....kk.....','....kllk....','...klyylk...','..klyyyylk..','..kyyyyyyk..','.kkkkkkkkkk.','............'],
  logo:['............','........yyyy','..........yy','.........y.y','....y...y...','...y.y.y....','..y...y.....','.y.......cc.','......cc.cc.','...cc.cc.cc.','cc.cc.cc.cc.','cc.cc.cc.cc.'],
  fire:['.....r......','....rr..r...','...rrr.rr...','..rrorrrr...','..rroorrrr..','.rrooyorrr..','.rroyyyorr..','.rooyyyoor..','.rooywyyor..','..roywwyr...','...ryyyr....','....rrr.....'],
  hand:['...kk.......','..kwwk......','..kwwk......','..kwwkkk....','..kwwkwwkk..','kkkwwkwwkwk.','kwkwwwwwwwk.','kwwwwwwwwwk.','.kwwwwwwwwk.','..kwwwwwwk..','...kwwwwwk..','...kkkkkk...'],
};
function pxCanvas(rows,pal,scale){
  const h=rows.length,w=Math.max(...rows.map(r=>r.length));
  const cv=document.createElement('canvas');cv.width=w*scale;cv.height=h*scale;
  const c=cv.getContext('2d');
  rows.forEach((r,y)=>{for(let x=0;x<r.length;x++){const ch=r[x];if(ch==='.'||!pal[ch])continue;c.fillStyle=pal[ch];c.fillRect(x*scale,y*scale,scale,scale);}});
  return cv;
}
const _icon={},_iconCv={};
function iconCv(k){if(!_iconCv[k])_iconCv[k]=pxCanvas(ICONS[k],PAL,4);return _iconCv[k];}
function icon(k){if(!_icon[k])_icon[k]=iconCv(k).toDataURL();return _icon[k];}
const img=(k,cls)=>`<img class="px${cls?' '+cls:''}" src="${icon(k)}" alt="">`;

// だんのうら（ドット絵）22×24：目・口は差し替え
const HERO=[
'......HHHHHHHH........',
'....HHhhhhhhhhHH......',
'...HhhhHHHHHHhhhH..FF.',
'..HhhHHHHHHHHHHhhHFfF.',
'..HhHHHHHHHHHHHHhHHFF.',
'.HHHHSSHSSSSHSSHHHHH..',
'.HHHSSSSSSSSSSSSHHHHH.',
'.HHGGGGGsSSsGGGGGHHHH.',
'.HHG111GSSSSG222GHHHH.',
'.HHG333GSSSSG444GHHHHh',
'.HHGGGGGSSSSGGGGGHHHHh',
'.HHSBBSSSSSSSSBBSHHHhh',
'.HHSSSSS5555SSSSSHHhhH',
'..HHSSSSS66SSSSSHHhhH.',
'..HHHsSSSSSSSSsHHHhH..',
'...HHH.ssSSss.HHHhH...',
'....JJJCCssCCJJJhH....',
'...JJJJJCPPCJJJJJH....',
'..JJJjJJJPPJJJjJJJ....',
'.JJJjjJJJPPJJJjjJJJ...',
'.JJjjJJJJPPJJJJjjJJ...',
'.JJjJJJJJPPJJJJJjJJ...',
'.JJjJJJJJPPJJJJJjJJ...',
'.SSjJJJJJPPJJJJJjSS...',
];
const HERO_PAL={H:'#3d2163',h:'#6b3fa8',S:'#f8dccb',s:'#e2b09e',E:'#2a1440',W:'#ffffff',G:'#4a2f78',L:'#fff1ea',B:'#ff9aaa',M:'#b8304f',m:'#ff7a95',F:'#ff9ad5',f:'#fff0f8',J:'#b9a6e6',j:'#8c78c4',P:'#ff8fb0',C:'#efe8ff'};
const EYES={open:['LWE','LEE'],blink:['LLL','EEE'],tired:['GGG','LEE'],happy:['LEL','ELE'],sleep:['LLL','sEs']};
const MOUTH={close:['SMMS','SS'],talk:['MmmM','MM'],sing:['MmmM','mm'],smile:['MSSM','SS']};
function heroRows(eye,mouth){
  const [e1,e2]=EYES[eye],[m1,m2]=MOUTH[mouth];
  const rv=s=>s.split('').reverse().join('');
  return HERO.map(r=>r.replace('111',e1).replace('222',rv(e1)).replace('333',e2).replace('444',rv(e2)).replace('5555',m1).replace('66',m2));
}
const PARTNER_PAL=Object.assign({},HERO_PAL,{H:'#16503c',h:'#33b07a',G:'#f8dccb',L:'#f8dccb',F:'#00e8c8',f:'#9ffff0',J:'#2f2f50',j:'#20203a',P:'#00e8c8',C:'#3a3a60',E:'#0e4a32',B:'#ffb0b8'});
const FAN_PAL=Object.assign({},HERO_PAL,{H:'#1c2236',h:'#2e3a5c',G:'#f8dccb',L:'#f8dccb',F:'#1c2236',f:'#e8b830',J:'#2e3a5c',j:'#1c2236',P:'#e8b830',C:'#2e3a5c',B:'#f8dccb'});
const _spr={};
function sprite(who,eye,mouth){
  const key=who+eye+mouth;
  if(!_spr[key]){
    const pal=who==='mid'?PARTNER_PAL:who==='fan'?FAN_PAL:HERO_PAL;
    let rows=heroRows(eye,mouth);
    if(who==='mid')rows=rows.map(r=>r.split('').reverse().join(''));
    _spr[key]=pxCanvas(rows,pal,1);
  }
  return _spr[key];
}
const _por={};
function portrait(who){ // 胸像（頭部を切り出して拡大）
  if(!_por[who]){
    const s=sprite(who,'open','smile');const cv=document.createElement('canvas');cv.width=96;cv.height=96;
    const c=cv.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(s,0,0,22,20,4,10,88,80);
    if(who==='mid'){ // ヘッドホン
      c.fillStyle='#1a1030';c.fillRect(6,12,84,6);c.fillStyle='#00e8c8';c.fillRect(8,10,80,5);
      c.fillStyle='#1a1030';c.fillRect(0,38,14,26);c.fillRect(82,38,14,26);c.fillStyle='#00e8c8';c.fillRect(2,40,10,22);c.fillRect(84,40,10,22);
    }
    if(who==='fan'){ // フード
      c.fillStyle='#2e3a5c';c.fillRect(0,64,96,32);c.fillStyle='#e8b830';c.fillRect(44,76,8,8);
    }
    _por[who]=cv.toDataURL();
  }
  return _por[who];
}
const CAST={
  hero:{n:'だんのうら',c:'#a77ef0'},
  fan:{n:'深夜の常連',c:'#e8b830'},
  mid:{n:'コラボ相手・ミドリ',c:'#00e8c8'},
};
const porSrc=(who,face)=>who==='hero'?`assets/img/char_${face||'normal'}.webp`:portrait(who);

// ═════ 効果音（Web Audio 合成。AU.ctx があるときだけ）═════
function sfx(kind){
  try{
    if(typeof AU==='undefined')return;
    if(!AU.ctx&&AU.init)AU.init();
    const ctx=AU.ctx,vol=(typeof AUDIO_SET!=='undefined'?AUDIO_SET.se:1);
    if(!ctx||!(vol>0))return;
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    const t0=ctx.currentTime;
    const tone=(f,at,d,g,type,f2)=>{
      const o=ctx.createOscillator(),gn=ctx.createGain();o.type=type||'square';
      o.frequency.setValueAtTime(f,t0+at);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+at+d);
      gn.gain.setValueAtTime(0.0001,t0+at);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,g*vol),t0+at+.008);
      gn.gain.exponentialRampToValueAtTime(.0001,t0+at+d);
      o.connect(gn);gn.connect(ctx.destination);o.start(t0+at);o.stop(t0+at+d+.02);
    };
    switch(kind){
      case 'pick':tone(988,0,.05,.035,'square');break;
      case 'place':tone(784,0,.05,.04,'square');tone(1175,.05,.09,.04,'square');break;
      case 'remove':tone(523,0,.05,.035,'triangle');tone(392,.05,.08,.035,'triangle');break;
      case 'undo':tone(659,0,.05,.035,'triangle');tone(494,.05,.05,.035,'triangle');tone(392,.1,.08,.03,'triangle');break;
      case 'band':tone(1318,0,.04,.025,'square');break;
      case 'deny':tone(180,0,.12,.05,'square',120);break;
      case 'go':[523,659,784,1047].forEach((f,i)=>tone(f,i*.07,.14,.045,'square'));tone(1568,.3,.35,.03,'triangle');break;
      case 'wipe':tone(200,0,.25,.025,'sawtooth',1600);break;
      case 'text':tone(1400+Math.random()*200,0,.025,.012,'square');break;
      case 'next':tone(880,0,.04,.03,'triangle');tone(1320,.04,.06,.03,'triangle');break;
      case 'night':tone(392,0,.2,.03,'triangle');tone(587,.08,.25,.025,'triangle');break;
      case 'good':tone(988,0,.08,.04,'square');tone(1319,.08,.16,.04,'square');break;
      case 'great':[784,988,1175,1568].forEach((f,i)=>tone(f,i*.06,.12,.04,'square'));break;
      case 'disc':[1047,1319,1568,2093].forEach((f,i)=>tone(f,i*.05,.1,.03,'triangle'));break;
      case 'bad':tone(330,0,.15,.04,'square',220);tone(247,.14,.22,.04,'square',165);break;
      case 'coin':tone(988,0,.06,.04,'square');tone(1319,.06,.22,.04,'square');break;
      case 'roll':for(let i=0;i<14;i++)tone(140+i*6,i*.045,.035,.03,'square');break;
      case 'stamp':tone(110,0,.22,.09,'sine',50);tone(1568,.06,.4,.03,'triangle');tone(2093,.12,.5,.02,'triangle');break;
      case 'fanfare':[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,i*.09,.16,.04,'square'));break;
      case 'sad':tone(392,0,.25,.035,'triangle');tone(330,.22,.25,.035,'triangle');tone(262,.44,.45,.035,'triangle');break;
    }
  }catch(e){}
}

// ═════ データ ═════
const T={
  zatsu:  {n:'深夜雑談',     s:'雑談',  c:'#a77ef0',fat:9},
  kaidan: {n:'怪談',         s:'怪談',  c:'#6fa8ff',fat:10},
  uta:    {n:'歌枠',         s:'歌枠',  c:'#ff6fa8',fat:12},
  game:   {n:'ゲーム実況',   s:'ゲーム',c:'#44ee88',fat:11},
  study:  {n:'資格勉強配信', s:'資格',  c:'#e8b830',fat:8},
  factory:{n:'工場トーク',   s:'工場',  c:'#ff9a3c',fat:9},
  radio:  {n:'深夜ラジオ',   s:'ラジオ',c:'#00e8c8',fat:8},
  totsu:  {n:'凸待ち',       s:'凸待ち',c:'#5ad8ff',fat:9,unlock:'totsu'},
  endure: {n:'耐久配信',     s:'耐久',  c:'#ffcf40',fat:26,lim:1,unlock:'endure'},
  collab: {n:'コラボ',       s:'コラボ',c:'#e83055',fat:15,lim:1},
  short:  {n:'告知ショート動画',s:'告知',c:'#deccf8',fat:4,lim:2},
  rest:   {n:'休み',         s:'休み',  c:'#7a6a9a',fat:-28},
};
const STREAMS=['zatsu','kaidan','uta','game','study','factory','radio'];
const isStream=t=>!!t&&t!=='short'&&t!=='rest';
const FOUND={
  trend:      '🔥 今週のトレンド企画は大きく伸びる（×1.5）',
  fav:        '⭐ 客層と相性のいい企画ほど伸びる（客層メモがヒント）',
  repeat:     '🔁 同じ企画を繰り返すと新鮮さが落ちる（連日だとさらに）',
  short_big:  '📣 告知の翌日のコラボ・歌枠はぐっと伸びる',
  short:      '📣 告知ショートの翌日は、配信が少し伸びる',
  kaidan_radio:'👻→📻 怪談の翌日のラジオは「余韻」で伸びる',
  work:       '🏭↔📘 工場トークと資格勉強は続けると相性がいい',
  rest_fresh: '💤→🎤 休みの翌日の歌枠・コラボは調子がいい',
  radio_totsu:'📻→☎ ラジオでお便り募集した翌日の凸待ちは盛り上がる',
  streak:     '😪 連続配信が続くほど疲れがたまる。休みでリセット',
  tired:      '🥱 疲労が55を超えると配信の質が落ちていく',
  sleep:      '💤 疲労が限界に近いと、配信中に寝落ちする',
  late:       '🌙 怪談と深夜ラジオは2時が刺さる',
  early:      '🕙 歌枠とゲーム実況は22時のほうが見られる',
  midnight:   '🕛 0時はリスナーが一番多い時間帯（少し疲れる）',
  late_bad:   '🌑 2時の配信は人が少なく、疲れも大きい',
  weekend:    '📅 金・土の夜は見に来る人が多い',
  endure_after:'⏳ 耐久配信の翌日は反動で失速する',
};
const CHAT={
  zatsu:['こんばんは〜','今日もおつかれさま','わかるｗ','その話もっと聞きたい','寝る前に寄った'],
  kaidan:['こわ…','後ろ振り向けない','ひえっ','電気つけたわ','今日の話やばい'],
  uta:['声きれい','888888','鳥肌たった','もう一曲！','泣いた'],
  game:['そこ右！','うますぎ','ｗｗｗ','今のは惜しい','ナイス！'],
  study:['一緒に勉強してます','電験わかる','ノート取った','がんばれ〜','その公式忘れてた'],
  factory:['設備保全あるある','うちの工場も','ベアリングの話好き','現場の人だ','異音の話こわい'],
  radio:['この時間落ち着く','作業BGMにしてる','お便り読まれた！','声が眠気に効く','ふつおた助かる'],
  totsu:['凸ります！','緊張する〜','声かわいい','次わたし！','通話つながった'],
  endure:['まだやってるｗ','耐久えらい','朝まで付き合う','あと少し！','がんばれー！'],
  collab:['コラボ助かる','ミドリちゃんから来ました','てぇてぇ','掛け合い最高','初見です！'],
};
const NAMES=[['夜空の旅人','#6fa8ff'],['ひとりぼっち','#a77ef0'],['深夜の常連','#e8b830'],['さくら','#ff8fb0'],['ななし','#9a9ab4'],['初見さん','#44ee88']];
const TIRED_CHAT=['眠そう？','無理しないでね','今日は早めに寝て','声かすれてない？'];
const GRADE_C={S:'#e8b830',A:'#00e8c8',B:'#a77ef0',C:'#bbaedd',D:'#e83055'};
const REWARD={
  S:{followers:15,streamPop:6,mental:2,fatigue:4},
  A:{followers:10,streamPop:4,fatigue:4},
  B:{followers:6,streamPop:2,fatigue:4},
  C:{followers:2,mental:-2,fatigue:4},
  D:{followers:2,mental:-2,fatigue:4},
};
const gradeOf=s=>s>=8.8?'S':s>=7.5?'A':s>=6?'B':s>=3.8?'C':'D';
const fatCol=f=>f>=80?'#e83055':f>=55?'#e8b830':'#44ee88';

// ── 客層との相性（gs から計算）──
function affinity(g,taste){
  const sk=(g.skills)||{};
  const base={
    zatsu:.95+(sk.chatSkill||0)*.05,
    kaidan:.85+(sk.kaidanSkill||0)*.065,
    uta:.8+(sk.singSkill||0)*.07-((g.throatFatigue||0)>60?.2:0),
    game:1.0,
    study:.75+(g.certKnow||0)*.006,
    factory:.75+(g.jobRep||0)*.006,
    radio:.85+(sk.radioVibe||0)*.06,
    totsu:.9+(sk.chatSkill||0)*.04+((g.followers||0)>120?.1:0),
    endure:1.05,
    collab:1.25,
  };
  const a={};
  Object.keys(base).forEach(k=>{a[k]=Math.max(.55,Math.min(1.6,base[k]+((taste&&taste[k])||0)));});
  return a;
}

// ── 1週間のシミュレーション（純関数・乱数は rnd）──
// plan: [{t,b}]×7  env: {aff,trend,startFat,base,fix,flame,rnd}
function simulate(plan,env){
  const rnd=env.rnd||Math.random;
  let F=env.startFat,streak=0,score=0;
  const nights=[],found=new Set(),cnt={};
  const top=STREAMS.slice().sort((a,b)=>env.aff[b]-env.aff[a]).slice(0,2);
  for(let i=0;i<7;i++){
    const {t,b}=plan[i];const prev=i?plan[i-1].t:null;
    const n={i,t,b,q:0,mult:[],evt:null,fat0:F,peak:0,views:0,found:[]};
    const add=id=>{if(!found.has(id)){found.add(id);n.found.push(id);}};
    if(t==='rest'){
      F=Math.max(0,F-28);streak=0;
      if(rnd()<.35){n.evt={txt:'子どもと一緒に早寝した',c:'#44ee88',good:true};F=Math.max(0,F-6);}
      n.fat=F;nights.push(n);continue;
    }
    if(t==='short'){
      F=Math.min(100,F+T.short.fat);
      n.q=.3;score+=.3;n.fat=F;n.views=Math.round(env.base*(4+rnd()*3));
      nights.push(n);continue;
    }
    // 配信の夜
    let q=env.aff[t];
    n.mult.push(['客層との相性',env.aff[t]]);
    if(top.includes(t))add('fav');
    let bm=b===1?1.12:b===2?.8:1;
    if(b===2&&(t==='kaidan'||t==='radio')){bm=1.35;add('late');}
    else if(b===0&&(t==='uta'||t==='game')){bm=1.15;add('early');}
    else if(b===1)add('midnight');
    else if(b===2)add('late_bad');
    if(bm!==1)n.mult.push([BANDS[b]+'の時間帯',bm]);
    q*=bm;
    if(i===4||i===5){q*=1.08;n.mult.push(['週末',1.08]);add('weekend');}
    const c=cnt[t]||0;cnt[t]=c+1;
    if(c>0){let nv=Math.max(.45,1-.2*c);if(prev===t)nv*=.9;q*=nv;n.mult.push(['新鮮さ低下',nv]);add('repeat');}
    let sy=1,syl='';
    if(prev==='short'){if(t==='collab'||t==='uta'){sy=1.45;add('short_big');}else{sy=1.15;add('short');}syl='告知の効果';}
    else if(prev==='kaidan'&&t==='radio'){sy=1.2;add('kaidan_radio');syl='怪談の余韻';}
    else if(prev==='radio'&&t==='totsu'){sy=1.25;add('radio_totsu');syl='お便り→凸待ち';}
    else if((prev==='study'&&t==='factory')||(prev==='factory'&&t==='study')){sy=1.15;add('work');syl='仕事つながり';}
    else if(prev==='rest'&&(t==='collab'||t==='uta')){sy=1.1;add('rest_fresh');syl='休み明けで絶好調';}
    else if(prev==='endure'){sy=.85;add('endure_after');syl='耐久の反動';}
    if(sy!==1){q*=sy;n.mult.push([syl,sy]);n.combo=syl;}
    if(t===env.trend){q*=1.5;n.mult.push(['トレンド一致',1.5]);add('trend');}
    if(t==='endure'){q*=1.45;n.mult.push(['耐久の熱量',1.45]);}
    // 疲労
    const addF=T[t].fat+streak*3+[0,3,7][b];
    if(streak>=3)add('streak');
    streak++;
    const Fmid=Math.min(100,F+addF*.5);
    F=Math.min(100,F+addF);
    if(Fmid>55){const fm=Math.max(.45,1-(Fmid-55)/70);q*=fm;n.mult.push(['疲れ',fm]);add('tired');}
    // ハプニング
    if(Fmid>=86){q*=.5;n.evt={txt:'途中で寝落ちしてしまった…',c:'#e83055',m:.5,sleep:true};add('sleep');}
    else{
      const r=rnd();
      if(r<.05){n.evt={txt:'切り抜きがバズった！',c:'#e8b830',m:1.35,good:true,big:true};}
      else if(r<.11){n.evt={txt:'さくらからスパチャ ¥500',c:'#e8b830',m:1.1,good:true,sc:'さくら'};}
      else if(r<.17){n.evt={txt:'深夜の常連が友達を連れてきた',c:'#44ee88',m:1.15,good:true};}
      else if(r<.21){n.evt={txt:'夜空の旅人が初見さんを案内',c:'#44ee88',m:1.12,good:true};}
      else if(r<.21+(b===0?.08:.03)){n.evt={txt:'子どもが起きてきた…中断',c:'#e83055',m:.85};}
      else if(r<.27+(b===0?.05:0)){
        const fx=env.fix>=3;n.evt={txt:fx?'回線落ち→設備保全の腕で即復旧':'回線が落ちた…',c:fx?'#e8b830':'#e83055',m:fx?.93:.8};
      }
      else if(r<.30+(b===0?.05:0)+Math.min(.08,(env.flame||0)*.002)){n.evt={txt:'荒らしが来た…',c:'#e83055',m:.85};}
      if(n.evt)q*=n.evt.m;
    }
    if(n.evt)n.mult.push([n.evt.good?'ハプニング（良）':'ハプニング',n.evt.m]);
    n.q=q;n.fat=F;
    n.peak=Math.max(1,Math.round(env.base*q*(.9+rnd()*.2)*(t==='collab'?1.25:1)));
    score+=q;
    nights.push(n);
  }
  let pen=0;
  if(F>70)pen=(F-70)*.04;
  score=Math.max(0,score-pen);
  const grade=gradeOf(score);
  // 新規フォロワーを夜ごとに配分（合計＝評価の報酬）
  const total=REWARD[grade].followers;
  const w=nights.map(n=>n.q*(n.t==='collab'?1.3:1));
  const ws=w.reduce((a,b)=>a+b,0)||1;
  const raw=w.map(x=>x/ws*total),fl=raw.map(Math.floor);
  let left=total-fl.reduce((a,b)=>a+b,0);
  raw.map((x,i)=>[x-fl[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{if(left>0&&w[i]>0){fl[i]++;left--;}});
  nights.forEach((n,i)=>n.gain=fl[i]);
  return {nights,score,pen,grade,found:[...found],endFat:F,peak:Math.max(0,...nights.map(n=>n.peak))};
}
function fatPreview(plan,start){
  let F=start,streak=0;const out=[],streaks=[];
  plan.forEach(p=>{
    if(!p.t){out.push(null);streaks.push(0);return;}
    if(p.t==='rest'){F=Math.max(0,F-28);streak=0;}
    else if(p.t==='short')F=Math.min(100,F+4);
    else{F=Math.min(100,F+T[p.t].fat+streak*3+[0,3,7][p.b]);streak++;}
    out.push(F);streaks.push(streak);
  });
  out.streaks=streaks;
  return out;
}

registerMinigame({
  id:'manager',icon:'📈',name:'チャンネル運営会議',genre:'経営シミュレーション',
  desc:'来週7日分の配信企画をスケジュール表に並べて、1週間を早送りで見届ける。客層・トレンド・並び順・疲れを読んで高評価を狙え。遊ぶほど新企画が解禁。',
  effect:'フォロワー↑ 配信人気↑ 精神±（評価しだい） ／ 疲労+4 約50分',
  help:'カードをドラッグ／タップ→曜日をタップ',
  bgm:'stream',
  _sim:simulate,_aff:affinity,
  start(body,mg){
    const later=(ms,fn)=>setTimeout(()=>{if(!mg._ended)fn();},ms);
    const se=t=>{try{AU.se(t);}catch(e){}};
    // ── 永続データ ──
    const md=gs.managerData=gs.managerData||{};
    if(!md.taste){
      md.taste={};
      [...STREAMS,'totsu'].forEach(k=>{md.taste[k]=Math.round((Math.random()*.3-.15)*20)/20;});
    }
    md.reports=md.reports||[];md.found=md.found||[];md.plays=md.plays||0;md.unlocked=md.unlocked||[];
    // 新企画の解禁
    const newly=[];
    if(!md.unlocked.includes('totsu')&&(md.plays>=1||gs.day>=8)){md.unlocked.push('totsu');newly.push('totsu');}
    if(!md.unlocked.includes('endure')&&(md.plays>=2||gs.day>=15)){md.unlocked.push('endure');newly.push('endure');}
    const KEYS=Object.keys(T).filter(k=>!T[k].unlock||md.unlocked.includes(T[k].unlock));
    const STREAMS_ON=KEYS.filter(k=>isStream(k)&&k!=='collab'&&k!=='endure');
    const aff=affinity(gs,md.taste);
    const lastTrend=md.reports.length?md.reports[md.reports.length-1].trend:null;
    const tpool=STREAMS_ON.filter(k=>k!==lastTrend);
    const trend=tpool[Math.floor(Math.random()*tpool.length)];
    const startFat=Math.round(Math.max(0,Math.min(60,(gs.fatigue||0)*.45)));
    const base=6+(gs.followers||0)*.15+(gs.streamPop||0)*.45;
    const favs=STREAMS_ON.slice().sort((a,b)=>aff[b]-aff[a]);
    const plan=DAYS.map(()=>({t:null,b:1}));
    const hist=[];
    let phase='title',sel=null,planLeft=120,res=null,simDone=false,speed=1,placedOnce=false;

    const root=document.createElement('div');root.className='mgr-root';body.appendChild(root);
    const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
    const used=(t,except)=>plan.filter((p,i)=>p.t===t&&i!==except).length;
    function wipe(label,cb){
      const w=el('div','mgr-wipe',`<span>${label||'CHANNEL OPS'}</span>`);root.appendChild(w);sfx('wipe');
      later(300,()=>{cb();w.classList.add('out');later(320,()=>w.remove());});
    }

    // ═════ 企画会議（プランニング画面）═════
    const pl=el('div','mgr-plan');root.appendChild(pl);
    const top=el('div','mgr-top');pl.appendChild(top);
    top.appendChild(el('div','mgr-trend',`${img('fire')}<div><small>WEEKLY TREND ／ 今週のトレンド</small><b>${T[trend].n}　×1.5</b></div>`));
    const memoBtn=el('button','mgr-memo-btn',`📝メモ<br><span class="n">${md.found.length}/${Object.keys(FOUND).length}</span>`);top.appendChild(memoBtn);
    const kp=el('div','mgr-kpis');pl.appendChild(kp);
    kp.innerHTML=`<div class="mgr-kpi mgr-panel"><small>FOLLOWERS</small><b>${(gs.followers||0).toLocaleString()}</b></div>`+
      `<div class="mgr-kpi mgr-panel"><small>コラボ / 告知 残り</small><b class="k-bud"></b></div>`+
      `<div class="mgr-kpi mgr-panel"><small>日曜夜の疲労 見込み</small><b class="k-fat"></b><div class="bar"><i class="k-fbar"></i></div></div>`;
    const board=el('div','mgr-board mgr-panel');pl.appendChild(board);
    const rows=DAYS.map((d,i)=>{
      const r=el('div','mgr-row');
      r.appendChild(el('div','mgr-day'+(i>=5?' we':''),`${d}<small>${['MON','TUE','WED','THU','FRI','SAT','SUN'][i]}</small>`));
      const s=el('div','mgr-slot');s.dataset.i=i;r.appendChild(s);
      const bb=el('button','mgr-band');r.appendChild(bb);
      bb.onclick=()=>{
        if(phase!=='plan')return;
        if(!isStream(plan[i].t)){se('back');sfx('deny');say('休み・告知の日は時間帯なし',true);return;}
        snap();plan[i].b=(plan[i].b+1)%3;se('tool');sfx('band');
        say(`${DAYS[i]}曜は ${BANDS[plan[i].b]} から配信`,false,true);renderBoard();
      };
      board.appendChild(r);
      return {r,s,bb};
    });
    const tray=el('div','mgr-tray mgr-panel');pl.appendChild(tray);
    tray.style.setProperty('--cols',Math.ceil(KEYS.length/2));
    const cards={};
    KEYS.forEach(k=>{
      const c=el('div','mgr-card',`${img(k)}<span class="nm">${T[k].s}</span>`+(T[k].lim?`<span class="lim"></span>`:'')+(newly.includes(k)?'<span class="nw">NEW</span>':''));
      c.style.setProperty('--c',T[k].c);c.dataset.k=k;tray.appendChild(c);cards[k]=c;
    });
    const adv=el('div','mgr-adv mgr-panel',`<img class="px" src="${portrait('fan')}" alt=""><div class="mgr-hint"></div>`);pl.appendChild(adv);
    const hint=adv.querySelector('.mgr-hint');
    const act=el('div','mgr-actions');pl.appendChild(act);
    const undoBtn=el('button','mgr-undo','↶ 戻す');act.appendChild(undoBtn);
    const goBtn=el('button','mgr-go','<span class="dot"></span>放送開始');act.appendChild(goBtn);

    let hintTo=null,hintHold=false;
    function say(txt,warn,ok,advice){hint.textContent=txt;hint.className='mgr-hint'+(warn?' warn':advice?' adv':ok?' ok':'');hintHold=true;clearTimeout(hintTo);hintTo=setTimeout(()=>{if(!mg._ended){hintHold=false;defaultHint();}},advice?3600:2400);}
    function defaultHint(){
      if(hintHold)return;
      const empty=plan.filter(p=>!p.t).length;
      hint.className='mgr-hint';
      hint.textContent=sel?`「${T[sel].n}」を置く曜日をタップ`:empty?`あと${empty}日ぶん企画を入れよう（置いた枠をタップで外す）`:'準備OK！ 右の時間帯ボタンで 22時/0時/2時';
    }
    // 常連のアドバイス（既に見つけた法則だけ口にする）
    function advise(i){
      const k=plan[i].t,fp=fatPreview(plan,startFat),prev=i?plan[i-1].t:null,next=i<6?plan[i+1].t:null,kn=id=>md.found.includes(id);
      if(fp[i]>=86)return kn('sleep')?'そこまで詰めると寝落ちするっすよ…！':'その日、だいぶ疲れてそうっす…';
      if(k===trend)return 'トレンド企画！ 伸びそうっす🔥';
      if(kn('short_big')&&prev==='short'&&(k==='collab'||k==='uta'))return '告知の次の日にそれ、鉄板っす！';
      if(kn('short_big')&&k==='short'&&(next==='collab'||next==='uta'))return '告知→翌日で人を呼べるっす！';
      if(kn('kaidan_radio')&&((prev==='kaidan'&&k==='radio')||(k==='kaidan'&&next==='radio')))return '怪談からのラジオ、余韻で沁みるやつっす';
      if(kn('repeat')&&isStream(k)&&used(k,i)>=1)return '同じ企画が続くと飽きられるっすよ？';
      if(kn('streak')&&fp.streaks[i]>=4)return '連続配信、そろそろ休みを挟んだほうが…';
      if(isStream(k)&&k===favs[0])return 'それ、最近ウケてるやつっす！';
      return null;
    }
    function snap(){hist.push(plan.map(p=>({t:p.t,b:p.b})));if(hist.length>40)hist.shift();}
    function canPlace(k,i){return !T[k].lim||used(k,i)<T[k].lim;}
    function shake(i){const s=rows[i].s;s.classList.remove('shake');void s.offsetWidth;s.classList.add('shake');}
    function popSlot(i){const s=rows[i].s;s.classList.remove('pop');void s.offsetWidth;s.classList.add('pop');}
    // カードが枠へ吸い込まれる演出
    function fly(k,fromEl,i,fromXY){
      const tr=rows[i].s.getBoundingClientRect();
      const f=el('div','mgr-card mgr-fly',`${img(k)}<span class="nm">${T[k].s}</span>`);f.style.setProperty('--c',T[k].c);
      let x,y,w=62,h=52;
      if(fromXY){[x,y]=fromXY;x-=w/2;y-=h*.6;}else{const fr=fromEl.getBoundingClientRect();x=fr.left;y=fr.top;w=fr.width;h=fr.height;}
      Object.assign(f.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px'});document.body.appendChild(f);
      requestAnimationFrame(()=>{Object.assign(f.style,{left:(tr.left+4)+'px',top:(tr.top+tr.height/2-h/2)+'px',transform:'scale(.7)',opacity:'.2'});});
      setTimeout(()=>f.remove(),230);
    }
    function place(k,i,from,fromEl,fromXY){
      if(from==null&&!canPlace(k,i)){shake(i);se('warn');sfx('deny');say(`${T[k].n}は今週${T[k].lim}回まで`,true);return false;}
      snap();
      let msg;
      if(from!=null&&from!==i){const tmp=plan[i].t;plan[i].t=k;plan[from].t=tmp;msg=tmp?`${DAYS[from]}曜と${DAYS[i]}曜を入れ替えた`:`${T[k].n}を${DAYS[i]}曜へ移動`;}
      else{const old=plan[i].t;plan[i].t=k;msg=old&&old!==k?`${DAYS[i]}曜：${T[old].s} → ${T[k].n}`:`${DAYS[i]}曜に「${T[k].n}」`;}
      se('decide');sfx('place');
      if(fromEl||fromXY)fly(k,fromEl,i,fromXY);
      later(fromEl||fromXY?170:0,()=>{popSlot(i);});
      placedOnce=true;stopCoach();
      renderBoard();
      const a=advise(i);
      if(a)say(a,false,false,true);else say(msg,false,true);
      return true;
    }
    function removeAt(i){if(!plan[i].t)return;snap();const k=plan[i].t;plan[i].t=null;se('back');sfx('remove');say(`${DAYS[i]}曜の「${T[k].n}」を外した`);renderBoard();}
    undoBtn.onclick=()=>{
      if(phase!=='plan'||!hist.length){se('back');sfx('deny');return;}
      const h=hist.pop();h.forEach((p,i)=>{plan[i].t=p.t;plan[i].b=p.b;});
      se('back');sfx('undo');say('ひとつ前に戻した',false,true);renderBoard();
    };
    function renderBoard(){
      const fp=fatPreview(plan,startFat);
      rows.forEach(({s,bb},i)=>{
        const p=plan[i];
        s.classList.toggle('full',!!p.t);
        s.classList.toggle('armed',!!sel&&phase==='plan');
        if(p.t){
          s.style.setProperty('--c',T[p.t].c);
          s.innerHTML=`<span class="art">${img(p.t)}</span><span class="nm">${T[p.t].n}${p.t===trend?'<span class="tr">TREND</span>':''}</span><span class="ft" style="width:${fp[i]}%;background:${fatCol(fp[i])}"></span>`;
        }else s.innerHTML='<span class="ph">＋ 企画カードをここへ</span>';
        const st=isStream(p.t);bb.disabled=!st;
        bb.className='mgr-band'+(st?' b'+p.b:'');
        bb.innerHTML=st?`${BANDS[p.b]}<small>${['宵','深夜','丑三つ'][p.b]}</small>`:'—';
      });
      KEYS.forEach(k=>{
        const c=cards[k];c.classList.toggle('sel',sel===k);
        if(T[k].lim){const l=T[k].lim-used(k);c.querySelector('.lim').textContent='×'+l;c.classList.toggle('out',l<=0);}
      });
      const last=fp.filter(v=>v!=null).pop();
      const fv=last==null?startFat:last;
      kp.querySelector('.k-bud').innerHTML=`${img('collab')}${T.collab.lim-used('collab')}　${img('short')}${T.short.lim-used('short')}`;
      kp.querySelector('.k-fat').textContent=fv+(fv>70?' ⚠':'');
      const fb=kp.querySelector('.k-fbar');fb.style.width=fv+'%';fb.style.background=fatCol(fv);
      goBtn.disabled=plan.some(p=>!p.t);
      undoBtn.disabled=!hist.length;
      if(phase==='plan')mg.setScore(`企画 ${plan.filter(p=>p.t).length}/7 ・ トレンド ${T[trend].s}`);
      defaultHint();
    }

    // ── ドラッグ＆タップ ──
    let drag=null;
    function slotAt(x,y){const e=document.elementFromPoint(x,y);return e&&e.closest?e.closest('.mgr-slot'):null;}
    function clearHot(){rows.forEach(r=>r.s.classList.remove('hot'));}
    function onDown(e){
      if(phase!=='plan')return;
      const card=e.target.closest('.mgr-card'),slot=e.target.closest('.mgr-slot');
      if(!card&&!slot)return;
      let k,from=null;
      if(card){k=card.dataset.k;if(card.classList.contains('out')){se('warn');sfx('deny');say(`${T[k].n}は今週もう使い切った（枠から外すと戻る）`,true);return;}}
      else{from=+slot.dataset.i;k=plan[from].t;}
      drag={k,from,x0:e.clientX,y0:e.clientY,moved:false,ghost:null,id:e.pointerId};
      try{(card||slot).setPointerCapture(e.pointerId);}catch(_){}
      e.preventDefault();
    }
    function onMove(e){
      if(!drag||e.pointerId!==drag.id)return;
      if(!drag.moved&&drag.k&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>8){
        drag.moved=true;sfx('pick');
        const g=el('div','mgr-card mgr-ghost',`${img(drag.k)}<span class="nm">${T[drag.k].s}</span>`);
        g.style.setProperty('--c',T[drag.k].c);document.body.appendChild(g);drag.ghost=g;
        if(drag.from!=null)rows[drag.from].s.style.opacity=.35;
        stopCoach();
      }
      if(drag.moved){
        drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
        const s=slotAt(e.clientX,e.clientY);
        rows.forEach(r=>r.s.classList.toggle('hot',r.s===s));
      }
    }
    function onUp(e){
      if(!drag||e.pointerId!==drag.id)return;
      const d=drag;drag=null;
      if(d.ghost)d.ghost.remove();clearHot();
      if(d.from!=null)rows[d.from].s.style.opacity='';
      if(phase!=='plan')return;
      if(d.moved){
        const s=slotAt(e.clientX,e.clientY);
        if(s){place(d.k,+s.dataset.i,d.from,null,[e.clientX,e.clientY]);}
        else if(d.from!=null)removeAt(d.from);
        else{se('back');sfx('deny');say('曜日の枠の上で離してね');}
        return;
      }
      // タップ
      if(d.from==null){sel=sel===d.k?null:d.k;se('btn');sfx('pick');hintHold=false;renderBoard();return;}
      const i=d.from;
      if(sel){const k=sel;if(place(k,i,null,cards[k])&&!canPlace(k,-1))sel=null;renderBoard();}
      else removeAt(i);
    }
    pl.addEventListener('pointerdown',e=>{
      const slot=e.target.closest('.mgr-slot');
      if(slot&&!plan[+slot.dataset.i].t){
        if(phase!=='plan')return;
        if(sel){const k=sel;if(place(k,+slot.dataset.i,null,cards[k])&&!canPlace(k,-1))sel=null;renderBoard();}
        else{se('back');shake(+slot.dataset.i);say('下の企画カードを選ぶか、ドラッグして置こう',true);}
        e.preventDefault();return;
      }
      onDown(e);
    });
    pl.addEventListener('pointermove',onMove);
    pl.addEventListener('pointerup',onUp);
    pl.addEventListener('pointercancel',()=>{if(drag&&drag.ghost)drag.ghost.remove();if(drag&&drag.from!=null)rows[drag.from].s.style.opacity='';drag=null;clearHot();});
    goBtn.onclick=()=>{if(phase==='plan'&&!goBtn.disabled)startSim();else if(phase==='plan'){se('warn');sfx('deny');say('7日ぶん全部埋めよう',true);}};

    // ── チュートリアルの「手」：カードを月曜へ運ぶ見本 ──
    let coach=null,coachIv=null;
    function startCoach(){
      if(placedOnce||coach||phase!=='plan')return;
      coach=el('img','mgr-hand mgr-px');coach.src=icon('hand');root.appendChild(coach);
      const step=()=>{
        if(!coach||phase!=='plan')return;
        const rr=root.getBoundingClientRect(),c=cards[favs[0]]||cards.zatsu,cr=c.getBoundingClientRect(),sr=rows[0].s.getBoundingClientRect();
        coach.style.transition='none';coach.style.opacity='1';
        coach.style.left=(cr.left-rr.left+cr.width/2-6)+'px';coach.style.top=(cr.top-rr.top+cr.height/2-4)+'px';
        later(350,()=>{if(!coach)return;coach.style.transition='';coach.style.left=(sr.left-rr.left+sr.width*.35)+'px';coach.style.top=(sr.top-rr.top+sr.height/2-6)+'px';});
        later(1500,()=>{if(coach)coach.style.opacity='0';});
      };
      step();coachIv=mg.every(step,2300);
    }
    function stopCoach(){if(coach){coach.remove();coach=null;}if(coachIv){clearInterval(coachIv);coachIv=null;}}

    // ── メモ（気づき・過去の通信簿）──
    const planStr=arr=>arr.map(t=>T[t]?img(t):'').join('');
    function pastTable(n,markFirst){
      return `<table class="mgr-past"><tr><th>日</th><th>評価</th><th>流行</th><th>計画</th><th>疲労</th></tr>`+
        md.reports.slice(-n).reverse().map((r,k)=>`<tr${markFirst&&k===0?' style="color:var(--tx-b)"':''}><td>${r.day}日目${markFirst&&k===0?'★':''}</td><td class="mgr-g mgr-g${r.grade}">${r.grade}</td><td class="pl">${img(r.trend)}</td><td class="pl">${planStr(r.plan)}</td><td>${r.fat}</td></tr>`).join('')+'</table>';
    }
    function memoHtml(){
      const ids=Object.keys(FOUND);
      const f=ids.map(id=>md.found.includes(id)?`<div class="mgr-found">${FOUND[id]}</div>`:'').join('')+
        (md.found.length<ids.length?`<div class="mgr-found lock">？？？ 未発見の法則 あと${ids.length-md.found.length}個</div>`:'');
      return `<div class="mgr-sec">NOTES ／ これまでの気づき ${md.found.length}/${ids.length}</div>${f}`+
        (md.reports.length?`<div class="mgr-sec">PAST REPORTS ／ 過去の通信簿（BEST ${md.best||'-'}）</div>${pastTable(5)}`:'');
    }
    function audienceNote(){
      return `<div class="mgr-note"><b>客層メモ</b>：最近のリスナーは「${T[favs[0]].n}」と「${T[favs[1]].n}」の反応がいい気がする。「${T[favs[favs.length-1]].n}」はいまいち…？</div>`;
    }
    memoBtn.onclick=()=>{
      if(phase!=='plan')return;se('decide');sfx('next');
      const ov=el('div','mgr-ov');const bx=el('div','mgr-box',`<div class="sub">MEETING MEMO</div><h3>📝 運営メモ</h3>${audienceNote()}
        <div class="mgr-note" style="border-color:var(--cy)"><b style="color:var(--cy)">基本</b>：🤝コラボ週1・📣告知週2まで。💤休みで疲労−28。日曜夜の疲労が70を超えると減点。</div>${memoHtml()}`);
      const b=el('button','mgr-btn','閉じる');b.onclick=()=>{se('back');sfx('remove');ov.remove();};bx.appendChild(b);ov.appendChild(bx);root.appendChild(ov);
    };

    // ═════ タイトル ═════
    const title=el('div','mgr-title');root.appendChild(title);
    const tcv=el('canvas');title.appendChild(tcv);
    title.insertAdjacentHTML('beforeend',`<div class="mgr-logo">${img('logo')}<div class="jp">チャンネル運営会議</div><div class="en">CHANNEL OPS MEETING</div><div class="bar"></div></div>
      <div class="mgr-tstat"><span>会議 <b>${md.plays}</b>回</span><span>BEST <b class="mgr-g${md.best||''}">${md.best||'-'}</b></span><span>気づき <b>${md.found.length}/${Object.keys(FOUND).length}</b></span></div>
      ${newly.length?`<div class="mgr-tstat" style="color:var(--gd)">NEW 企画解禁：${newly.map(k=>T[k].n).join('・')}</div>`:''}
      <button class="mgr-press">TAP TO START</button>`);
    let titleT=0;
    const tChat=['888888','こんばんは〜','今週も楽しみ','初見です！','神回きた','おつかれさま','トレンド何？','コラボ待ってた'].map(t=>({t,x:Math.random(),v:.05+Math.random()*.05,o:Math.random()}));
    const tStars=Array.from({length:60},()=>[Math.random(),Math.random(),Math.random()]);
    const tBars=Array.from({length:14},()=>({h:.2+Math.random()*.6,s:.5+Math.random()}));
    function drawTitle(dt){
      titleT+=dt;
      const dpr=Math.min(2,window.devicePixelRatio||1),W=tcv.clientWidth,H=tcv.clientHeight;
      if(!W)return;
      if(tcv.width!==Math.round(W*dpr)){tcv.width=Math.round(W*dpr);tcv.height=Math.round(H*dpr);}
      const c=tcv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
      // 星と月
      tStars.forEach(([x,y,ph])=>{c.globalAlpha=.25+.6*Math.abs(Math.sin(titleT*1.3+ph*7));c.fillStyle='#deccf8';c.fillRect(x*W,y*H*.5,1.5,1.5);});
      c.globalAlpha=1;
      const mr=Math.min(W,H)*.09,mx=W*.78,my=H*.14;
      c.fillStyle='#fff6d8';c.shadowColor='#fff0b0';c.shadowBlur=30;c.beginPath();c.arc(mx,my,mr,0,7);c.fill();c.shadowBlur=0;
      c.fillStyle='#0b0726';c.beginPath();c.arc(mx+mr*.42,my-mr*.18,mr*.88,0,7);c.fill();
      c.strokeStyle='rgba(138,82,212,.25)';c.lineWidth=1;
      const hy=H*.72;
      for(let i=-10;i<=10;i++){c.beginPath();c.moveTo(W/2+i*20,hy);c.lineTo(W/2+i*160,H);c.stroke();}
      for(let k=0;k<8;k++){const f=((k+titleT*.6)%8)/8,y=hy+(H-hy)*f*f;c.globalAlpha=f;c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke();}
      c.globalAlpha=1;
      const bw=W/tBars.length;
      tBars.forEach((b,i)=>{const h=(H*.3)*(b.h+.15*Math.sin(titleT*b.s*2+i));const rgb=i%3?'0,232,200':'138,82,212';c.fillStyle=`rgba(${rgb},.12)`;c.fillRect(i*bw+3,hy-h,bw-6,h);c.fillStyle=`rgba(${rgb},.5)`;c.fillRect(i*bw+3,hy-h,bw-6,2);});
      // だんのうらのドット絵がタイトルで小さく揺れる
      tChat.forEach(b=>{const y=H*.68-((titleT*b.v+b.o)%1)*H*.62,a=Math.sin(((titleT*b.v+b.o)%1)*Math.PI);
        c.globalAlpha=a*.35;c.font=`11px ${FONT}`;c.textAlign='left';const tw=c.measureText(b.t).width+14;
        c.fillStyle='rgba(138,82,212,.35)';c.fillRect(b.x*(W-tw),y-9,tw,18);c.fillStyle='#deccf8';c.fillText(b.t,b.x*(W-tw)+7,y+4);});
      c.globalAlpha=1;
      const S=3,blink=(titleT%3)<.12,sp=sprite('hero',blink?'blink':'open',(titleT*6|0)%2?'talk':'close');
      const sm=sprite('mid',(titleT%3.7)<.12?'blink':'open',(titleT*5|0)%3?'close':'talk');
      c.imageSmoothingEnabled=false;
      c.drawImage(sm,14,hy-24*S+Math.round(Math.sin(titleT*3+1)*2),22*S,24*S);
      c.drawImage(sp,W-22*S-14,hy-24*S+Math.round(Math.sin(titleT*3)*2),22*S,24*S);
    }
    title.onclick=()=>{
      if(phase!=='title')return;phase='story0';se('decide');sfx('go');
      wipe('MEETING START',()=>{title.remove();startStory();});
    };

    // ═════ 会話（＝チュートリアル）═════
    const LINES=[
      {who:'hero',face:'normal',t:'来週の配信、7日ぶんの企画を決めよう。借金のためにも、ちゃんと伸ばしたい。'},
      {who:'fan',t:`今週は「${T[trend].n}」がトレンドらしいっすよ！ あと、最近は「${T[favs[0]].n}」がウケてるっす。`},
      {who:'mid',t:'コラボは週1回ね。前の日に告知ショート出してくれたら、うちのリスナーも連れてくよ！'},
      {who:'hero',face:'happy',t:'カードを曜日にドラッグ。同じ企画ばかりだと飽きられるし、疲れたら休み。……よし、会議開始。'},
    ];
    let story=null,li=0,typing=null;
    function startStory(){
      phase='story';
      story=el('div','mgr-story');root.appendChild(story);
      const sk=el('button','mgr-skip','SKIP ▶▶');story.appendChild(sk);
      sk.onclick=e=>{e.stopPropagation();se('back');sfx('next');endStory();};
      story.onclick=()=>advance();
      showLine();
    }
    function showLine(){
      const L=LINES[li],cast=CAST[L.who];
      const vn=story.querySelector('.mgr-vn');if(vn)vn.remove();
      const box=el('div','mgr-vn');box.style.setProperty('--pc',cast.c);
      box.innerHTML=`<div class="mgr-por"><img class="${L.who==='hero'?'':'px'}" src="${porSrc(L.who,L.face)}" alt=""></div>
        <div class="mgr-msg"><span class="who">${cast.n}</span><div class="tx"></div><span class="nx">▼ TAP</span>
        <div class="mgr-dots">${LINES.map((_,k)=>`<i class="${k===li?'on':''}"></i>`).join('')}</div></div>`;
      story.appendChild(box);
      const tx=box.querySelector('.tx');let n=0;
      typing={full:L.t,tx};
      const tick=()=>{if(!typing||typing.tx!==tx)return;n++;tx.textContent=L.t.slice(0,n);if(n%2)sfx('text');if(n<L.t.length)later(26,tick);else typing=null;};
      tick();
    }
    function advance(){
      if(phase!=='story')return;
      if(typing){typing.tx.textContent=typing.full;typing=null;return;}
      li++;se('btn');sfx('next');
      if(li>=LINES.length)endStory();else showLine();
    }
    function endStory(){
      if(phase!=='story')return;
      phase='plan';typing=null;
      if(story){story.style.transition='opacity .3s';story.style.opacity='0';const s=story;later(300,()=>s.remove());}
      renderBoard();say('カードを曜日へドラッグ（タップ→曜日タップでもOK）',false,true);
      later(350,startCoach);
    }

    renderBoard();mg.setTimer('会議 2:00');mg.setScore('チャンネル運営会議');

    // 会議の残り時間（切れたら空き枠は休みにして放送開始）
    mg.every(()=>{
      if(phase!=='plan')return;
      if(root.querySelector('.mgr-ov'))return; // メモを読んでいる間は止める
      planLeft--;
      mg.setTimer(`会議 ${Math.floor(Math.max(0,planLeft)/60)}:${String(Math.max(0,planLeft)%60).padStart(2,'0')}`);
      if(planLeft===15){se('warn');sfx('deny');say('会議の残り時間わずか！空き枠は休みになる',true);}
      if(planLeft<=0){snap();plan.forEach(p=>{if(!p.t)p.t='rest';});renderBoard();startSim();}
    },1000);

    // ═════ 放送（シミュレーション画面）═════
    let sim,mon,mcv,mctx,chat,week,ccv,cctx,tip=null;
    let night=0,nt=0,evtShown=false,discShown=false,chatT=0,vShown=0,repShown=false,endT=0,happyT=0,mouthT=0,mouthOpen=false,blinkT=2;
    const dur=n=>n.t==='rest'||n.t==='short'?2.4:3.8;

    function startSim(){
      if(phase!=='plan')return;
      phase='simwait';sel=null;stopCoach();se('live');sfx('go');
      res=simulate(plan,{aff,trend,startFat,base,fix:(gs.skills&&gs.skills.emergencyFix)||0,flame:gs.flame||0});
      wipe('ON AIR',()=>{
        pl.remove();
        sim=el('div','mgr-sim');root.appendChild(sim);
        mon=el('div','mgr-mon');sim.appendChild(mon);
        mcv=el('canvas');mon.appendChild(mcv);mctx=mcv.getContext('2d');
        chat=el('div','mgr-chat');mon.appendChild(chat);
        week=el('div','mgr-week');sim.appendChild(week);
        plan.forEach((p,i)=>week.appendChild(el('div','mgr-wd',`<div class="d">${DAYS[i]}${isStream(p.t)?' '+BANDS[p.b]:''}</div>${img(p.t)}<div class="r"></div>`)));
        const chart=el('div','mgr-chart mgr-panel');sim.appendChild(chart);
        ccv=el('canvas');chart.appendChild(ccv);cctx=ccv.getContext('2d');
        const tipAt=e=>{const r=ccv.getBoundingClientRect();tip={x:e.clientX-r.left,y:e.clientY-r.top};};
        chart.addEventListener('pointerdown',tipAt);chart.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)tipAt(e);});
        chart.addEventListener('pointerleave',()=>{tip=null;});
        const ctrl=el('div','mgr-ctrl');sim.appendChild(ctrl);
        const bSp=el('button','','▶▶ 早送り');const bSk=el('button','','⏭ 結果まで飛ばす');
        bSp.onclick=()=>{speed=speed===1?2.5:1;bSp.classList.toggle('on',speed>1);bSp.textContent=speed>1?'▶ ふつう':'▶▶ 早送り';se('tool');sfx('band');};
        bSk.onclick=()=>{if(simDone)return;se('decide');sfx('next');finishSim();};
        ctrl.appendChild(bSp);ctrl.appendChild(bSk);
        night=0;nt=0;phase='sim';beginNight();
      });
    }
    function beginNight(){
      evtShown=false;discShown=false;chatT=.3;vShown=0;chat.innerHTML='';
      [...week.children].forEach((w,i)=>w.classList.toggle('now',i===night));
      const n=res.nights[night];
      if(n.t==='rest'||n.t==='short')se('notif');else se('micOn');
      sfx('night');
      mg.setTimer(`放送 ${night+1}/7 ${DAYS[night]}曜`);
    }
    function endNight(){
      const n=res.nights[night],w=week.children[night];
      w.classList.remove('now');w.classList.add('done');
      const r=w.querySelector('.r');
      if(n.t==='rest'){r.textContent='OFF';r.style.color='var(--tx-d)';}
      else{r.textContent=`+${n.gain}`;if(isStream(n.t)&&n.q<.8)w.classList.add('bad');if(n.q>=1.6)w.classList.add('great');}
      if(n.gain>0){se('comment');sfx('coin');}
    }
    function finishSim(){
      if(simDone)return;simDone=true;
      if(week)[...week.children].forEach((w,i)=>{if(!w.classList.contains('done')){night=i;endNight();}});
      night=6;nt=dur(res.nights[6]);
      if(chat)chat.innerHTML='';
      // 記録
      md.plays++;
      md.reports.push({day:gs.day,grade:res.grade,trend,plan:plan.map(p=>p.t),fat:res.endFat,score:Math.round(res.score*10)/10});
      if(md.reports.length>8)md.reports.shift();
      res.prevBest=md.best||null;
      if(!md.best||'SABCD'.indexOf(res.grade)<'SABCD'.indexOf(md.best))md.best=res.grade;
      res.newFound=res.found.filter(f=>!md.found.includes(f));
      md.found.push(...res.newFound);
      mg.setTimer('放送終了');
      endT=0;phase='end';
    }
    function bubble(n){
      if(!isStream(n.t))return;
      const tired=n.fat>60&&Math.random()<.35;
      let txt=tired?TIRED_CHAT[(Math.random()*TIRED_CHAT.length)|0]:CHAT[n.t][(Math.random()*CHAT[n.t].length)|0];
      if(!tired&&n.t===trend&&Math.random()<.2)txt='トレンドから来ました！';
      const [nm,nc]=NAMES[(Math.random()*NAMES.length)|0];
      const b=el('div','mgr-bub',`<i style="color:${nc}">${nm}</i>${txt}`);chat.appendChild(b);
      while(chat.children.length>4)chat.firstChild.remove();
      [...chat.children].forEach((c,i,a)=>{c.style.opacity=i<a.length-3?.35:1;});
      if(Math.random()<.5)sfx('text');
    }
    function showEvt(n){
      if(!n.evt)return;
      const e=el('div','mgr-evt',`<small>${n.evt.good?'HAPPENING!':'TROUBLE…'}</small>${n.evt.txt}`);e.style.setProperty('--c',n.evt.c);mon.appendChild(e);
      later(2000,()=>e.remove());
      se(n.evt.good?'rank':'noise');sfx(n.evt.big?'great':n.evt.good?'good':'bad');
      if(n.evt.good)happyT=1.4;
      if(n.evt.sc){const b=el('div','mgr-bub sc',`<i style="color:#ff8fb0">${n.evt.sc}</i>¥500　今日もおつかれさま！`);chat.appendChild(b);}
    }
    // 新しい法則に気づいた瞬間（初めてのコンボ）
    function showDiscovery(n){
      const nw=n.found.filter(id=>!md.found.includes(id));
      if(!nw.length)return;
      const id=nw.find(x=>['short_big','short','kaidan_radio','work','rest_fresh','radio_totsu','trend','late','early','fav'].includes(x))||nw[0];
      const d=el('div','mgr-disc',`<b>新発見！</b>${FOUND[id]}`);mon.appendChild(d);
      later(2300,()=>d.remove());
      se('ach');sfx('disc');happyT=Math.max(happyT,.8);
    }

    // ── 描画 ──
    function fit(cv){
      const dpr=Math.min(2,window.devicePixelRatio||1);
      const w=cv.clientWidth,h=cv.clientHeight;
      if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
      return [w,h,dpr];
    }
    let clock=0;
    const stars=Array.from({length:40},()=>[Math.random(),Math.random()*.55,Math.random()]);
    const city=Array.from({length:22},()=>[Math.random()*.5+.25,Math.random()]);
    function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
    // 回転する数字（オドメーター）
    function odometer(c,x,y,v,dw,dh,digits){
      const frac=v%1,iv=Math.floor(v);let lowerNine=true;
      for(let p=0;p<digits;p++){
        const d=Math.floor(iv/10**p)%10;
        const f=p===0?frac:(lowerNine?frac:0);
        const cx=x+(digits-1-p)*dw;
        c.save();c.beginPath();c.rect(cx,y,dw,dh);c.clip();
        c.fillText(String(d),cx+dw/2,y+dh/2-f*dh);
        c.fillText(String((d+1)%10),cx+dw/2,y+dh/2+dh-f*dh);
        c.restore();
        lowerNine=lowerNine&&d===9;
      }
    }
    function drawMon(dt){
      const [W,H,dpr]=fit(mcv);const c=mctx;c.setTransform(dpr,0,0,dpr,0,0);
      const n=res.nights[Math.min(night,6)];
      const end=phase==='end';
      const off=n.t==='rest'||end;
      const col=end?'#8a52d4':off?'#5e5078':T[n.t].c;
      const p=end?1:Math.min(1,nt/dur(n));
      // 部屋（壁紙の縦じま）
      const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#120d30');g.addColorStop(1,'#07051a');c.fillStyle=g;c.fillRect(0,0,W,H);
      c.fillStyle='rgba(255,255,255,.025)';for(let x=0;x<W;x+=14)c.fillRect(x,0,6,H*.84);
      // 窓
      const wx=W*.04,wy=H*.12,ww=W*.34,wh=H*.42;
      c.save();c.beginPath();c.rect(wx,wy,ww,wh);c.clip();
      const sky=c.createLinearGradient(0,wy,0,wy+wh);sky.addColorStop(0,'#0a0b2e');sky.addColorStop(1,'#26164a');c.fillStyle=sky;c.fillRect(wx,wy,ww,wh);
      stars.forEach(([sx,sy,ph])=>{c.globalAlpha=.4+.6*Math.abs(Math.sin(clock*1.5+ph*9));c.fillStyle='#deccf8';c.fillRect(wx+sx*ww,wy+sy*wh,1.3,1.3);});
      c.globalAlpha=1;
      const mx=wx+ww*(.2+.6*((night+p)/7)),my=wy+wh*(.32-.12*Math.sin(Math.PI*(night+p)/7)),mr=Math.min(ww,wh)*.1;
      c.fillStyle='#fff6d8';c.shadowColor='#fff0b0';c.shadowBlur=14;c.beginPath();c.arc(mx,my,mr,0,7);c.fill();c.shadowBlur=0;
      c.fillStyle='#14123a';c.beginPath();c.arc(mx+mr*.45,my-mr*.2,mr*.9,0,7);c.fill();
      city.forEach(([ch,ph],i)=>{const bx=wx+i*ww/22,bh=wh*ch*.6;c.fillStyle='#07061a';c.fillRect(bx,wy+wh-bh,ww/22+1,bh);
        if(Math.sin(clock*.7+ph*20)>.1){c.fillStyle=i%3?'#e8b830aa':'#00e8c888';c.fillRect(bx+2,wy+wh-bh+4+ph*8,2,2);}});
      c.restore();
      c.strokeStyle='#3a2a6a';c.lineWidth=3;c.strokeRect(wx,wy,ww,wh);c.lineWidth=2;c.beginPath();c.moveTo(wx+ww/2,wy);c.lineTo(wx+ww/2,wy+wh);c.stroke();
      c.fillStyle='#2a1a52';c.fillRect(wx-6,wy-6,10,wh+14);c.fillRect(wx+ww-4,wy-6,10,wh+14);
      // 部屋の光（企画カラー）
      if(!off){const rg=c.createRadialGradient(W*.6,H*.55,10,W*.6,H*.55,W*.6);rg.addColorStop(0,col+'48');rg.addColorStop(1,'transparent');c.fillStyle=rg;c.fillRect(0,0,W,H);}
      const S=Math.max(2,Math.floor(H*.46/24));
      // モニター（机の上・左）
      {const mw=W*.26,mh=H*.21,mxx=W*.05,myy=H*.86-mh-8;
      c.fillStyle='#0a0716';c.fillRect(mxx-3,myy-3,mw+6,mh+6);c.fillStyle='#2a2050';c.fillRect(mxx+mw/2-4,myy+mh+3,8,5);
      if(!off||end){
        const sg=c.createLinearGradient(0,myy,0,myy+mh);sg.addColorStop(0,col+'55');sg.addColorStop(1,col+'15');c.fillStyle=sg;c.fillRect(mxx,myy,mw,mh);
        const isz=Math.max(12,Math.floor(mh*.75/12)*12);
        c.drawImage(iconCv(end?'logo':n.t),mxx+mw/2-isz/2,myy+mh/2-isz/2+Math.round(Math.sin(clock*3)),isz,isz);
        c.fillStyle='rgba(255,255,255,.06)';for(let y=myy;y<myy+mh;y+=3)c.fillRect(mxx,y,mw,1);
      }else{c.fillStyle='#05040e';c.fillRect(mxx,myy,mw,mh);}}
      c.imageSmoothingEnabled=false;
      // だんのうら（スプライトのコマ：目パチ・口パク・歌・疲れ・寝落ち・笑顔）
      const fatNow=end?res.endFat:n.fat0+(n.fat-n.fat0)*p;
      blinkT-=dt;if(blinkT<-.12)blinkT=1.8+Math.random()*2.5;
      mouthT-=dt*(speed>1?1.5:1);if(mouthT<=0){mouthOpen=!mouthOpen;mouthT=.1+Math.random()*.18;}
      happyT-=dt;
      let eye='open',mouth='close';
      const live=!off&&n.t!=='short';
      if(off&&!end)eye='sleep';
      else if(end){eye='happy';mouth='smile';}
      else{
        if(fatNow>65)eye='tired';
        if(happyT>0){eye='happy';}
        if(blinkT<0)eye='blink';
        if(live)mouth=mouthOpen?(n.t==='uta'?'sing':'talk'):(happyT>0?'smile':'close');
        if(n.evt&&n.evt.sleep&&evtShown){eye='sleep';mouth='close';}
      }
      const spr=sprite('hero',eye,mouth);
      const hx=Math.round(W*.66-11*S),sway=n.t==='uta'&&live?Math.round(Math.sin(clock*4)*S*.6):0;
      const nod=(n.evt&&n.evt.sleep&&evtShown)?S*2:0;
      const hy=Math.round(H*.88-24*S+(off&&!end?S:0)+(live&&mouthOpen?-1:0)+nod);
      if(n.t==='collab'&&!end){
        const ps=sprite('mid',blinkT>.6&&blinkT<.75?'blink':'open',!mouthOpen&&live?'talk':'close');
        const pS=S*.85;
        const px0=hx-19*S,py0=hy+3*S;
        c.drawImage(ps,px0,py0,22*pS,24*pS);
        c.fillStyle='#00e8c8';c.fillRect(px0+2*pS,py0,18*pS,pS);c.fillRect(px0,py0+7*pS,2*pS,4*pS);c.fillRect(px0+20*pS,py0+7*pS,2*pS,4*pS);
      }
      c.globalAlpha=off&&!end?.55:1;
      c.drawImage(spr,hx+sway,hy,22*S,24*S);c.globalAlpha=1;
      // 机
      c.fillStyle='#1d1540';c.fillRect(0,H*.86,W,H*.14);c.fillStyle='#3a2c70';c.fillRect(0,H*.86,W,2);
      c.fillStyle='rgba(0,0,0,.25)';c.fillRect(0,H*.86+2,W,4);
      // 机の上の小物：キーボード・マグカップ・LEDテープ
      {const ky=H*.86+H*.035,kx=hx+3*S,kw=16*S;
      c.fillStyle='#120c2a';c.fillRect(kx,ky,kw,H*.05);c.fillStyle='#2a2050';
      for(let r=0;r<2;r++)for(let k=0;k<8;k++)c.fillRect(kx+3+k*(kw-6)/8,ky+3+r*(H*.05-4)/2,(kw-6)/8-2,(H*.05-8)/2);
      const mgx=W*.9,mgy=H*.86-H*.07;c.fillStyle='#e8b830';c.fillRect(mgx,mgy,W*.045,H*.07);c.fillStyle='#b88a10';c.fillRect(mgx+W*.045,mgy+H*.015,4,H*.035);
      if(!off){c.globalAlpha=.4+.3*Math.sin(clock*2);c.fillStyle='#ffffff';c.fillRect(mgx+3,mgy-6-Math.sin(clock*3)*2,2,4);c.fillRect(mgx+8,mgy-9+Math.sin(clock*3)*2,2,5);c.globalAlpha=1;}
      const led=c.createLinearGradient(0,0,W,0);led.addColorStop(0,off?'#2a2050':col);led.addColorStop(1,off?'#1a1030':'#8a52d4');c.fillStyle=led;c.globalAlpha=off?.4:.7+.3*Math.sin(clock*2.5);c.fillRect(0,H-3,W,3);c.globalAlpha=1;}
      // マイク
      if(live){const mx2=hx+18*S+sway,my2=hy+11*S;c.fillStyle='#4a4a60';c.fillRect(mx2+S,my2+3*S,S,H*.86-my2-3*S);c.fillStyle='#2b2b36';c.fillRect(mx2,my2,3*S,4*S);c.fillStyle='#6a6a80';c.fillRect(mx2,my2,3*S,S);}
      // スマホ（告知の夜）
      if(n.t==='short'&&!end){const px=hx+8*S,py=hy+17*S;c.fillStyle='#1a1030';c.fillRect(px,py,6*S,8*S);c.fillStyle='#e83055';c.fillRect(px+S,py+S,4*S,Math.max(S,6*S*p));c.fillStyle='#fff';c.fillRect(px+2.5*S,py+2*S,S,S);}
      // 演出パーティクル
      if(live){
        c.font=`${Math.round(H*.065)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';
        for(let k=0;k<6;k++){
          const ph=(clock*.35+k/6)%1;const px=W*(.42+.5*((k*.37)%1))+Math.sin(clock+k)*6,py=H*(.82-.62*ph);
          c.globalAlpha=Math.sin(ph*Math.PI)*.75;c.fillStyle=col;
          c.fillText(n.t==='uta'?'♪':n.t==='kaidan'?'✦':n.t==='radio'?'〜':n.t==='game'?'▶':n.t==='endure'?'⌛':n.t==='totsu'?'☎':'・',px,py);
        }
        c.globalAlpha=1;
      }
      if(off&&!end){c.fillStyle='#deccf8';c.font=`${Math.round(H*.07)}px ${FONT}`;c.textAlign='left';c.textBaseline='middle';
        for(let k=0;k<3;k++){const ph=(clock*.5+k/3)%1;c.globalAlpha=Math.sin(ph*Math.PI);c.fillText('z',hx+20*S+ph*W*.06,hy+(4-ph*5)*S);}c.globalAlpha=1;
        c.fillStyle='rgba(0,0,20,.35)';c.fillRect(0,0,W,H);}
      const vg=c.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.75);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,.5)');c.fillStyle=vg;c.fillRect(0,0,W,H);
      // HUD
      c.textBaseline='middle';c.textAlign='left';
      const bx=8,by=8;
      const lab=end?'END':live?'LIVE':n.t==='short'?'EDITING':'OFFLINE';
      c.font=`11px ${MONO}`;const lw=c.measureText(lab).width+(live?26:16);
      c.fillStyle=live?'#e83055':n.t==='short'&&!end?'#8a52d4':'#2a2050';roundRect(c,bx,by,lw,20,4);c.fill();
      c.fillStyle='#fff';
      if(live){c.globalAlpha=Math.sin(clock*6)>0?1:.3;c.beginPath();c.arc(bx+10,by+10,3.5,0,7);c.fill();c.globalAlpha=1;}
      c.fillText(lab,bx+(live?18:8),by+10.5);
      c.font=`${Math.round(Math.min(15,H*.072))}px ${FONT}`;c.fillStyle='#deccf8';
      c.shadowColor='#000';c.shadowBlur=4;
      c.fillText(end?'1週間おつかれさま':`${DAYS[night]}曜 ${isStream(n.t)?BANDS[n.b]+' ':''}${T[n.t].n}`,bx,by+36);
      let ly=by+54;
      if(isStream(n.t)&&n.t===trend&&!end){c.fillStyle='#e8b830';c.font=`10px ${FONT}`;c.fillText('★ トレンド企画',bx,ly);ly+=15;}
      if(n.combo&&!end&&p>.15){c.fillStyle=n.combo==='耐久の反動'?'#ff6f8c':'#00e8c8';c.font=`10px ${FONT}`;c.fillText((n.combo==='耐久の反動'?'▼ ':'◆ COMBO ')+n.combo,bx,ly);}
      c.shadowBlur=0;
      // 同接（回転式カウンター）
      if(live){
        const viewers=n.peak*Math.min(1,p/.55)*(p>.85?1-(p-.85)*.8:1);
        vShown+=(Math.round(viewers)-vShown)*Math.min(1,dt*7);if(Math.abs(vShown-Math.round(viewers))<.03)vShown=Math.round(viewers);
        const dw=9,dh=16,dg=Math.max(2,String(n.peak).length);
        const tw=dg*dw+34;
        c.fillStyle='rgba(5,4,14,.8)';roundRect(c,W-tw-8,by,tw,22,4);c.fill();c.strokeStyle='rgba(222,204,248,.2)';c.lineWidth=1;c.stroke();
        c.fillStyle='#ff6f8c';c.font=`10px ${FONT}`;c.textAlign='left';c.fillText('同接',W-tw-3,by+11.5);
        c.fillStyle='#fff';c.font=`14px ${MONO}`;c.textAlign='center';
        odometer(c,W-dg*dw-12,by+3,Math.max(0,vShown),dw,dh,dg);
      }else if(n.t==='short'&&!end){
        const t=`▶ ${Math.round(n.views*p)}回再生`;c.font=`12px ${MONO}`;const tw=c.measureText(t).width+14;
        c.fillStyle='rgba(5,4,14,.8)';roundRect(c,W-tw-8,by,tw,22,4);c.fill();c.fillStyle='#deccf8';c.textAlign='left';c.fillText(t,W-tw-1,by+11.5);
      }
      // 疲労ゲージ
      c.textAlign='left';
      const fw=Math.min(110,W*.3),fx=W-fw-8,fy=by+32;
      c.fillStyle='rgba(5,4,14,.8)';roundRect(c,fx-4,fy-5,fw+8,18,4);c.fill();
      c.fillStyle='#bbaedd';c.font=`9px ${FONT}`;c.fillText('疲労',fx,fy+4);
      c.fillStyle='#ffffff14';c.fillRect(fx+26,fy+1,fw-46,6);
      c.fillStyle=fatCol(fatNow);c.fillRect(fx+26,fy+1,(fw-46)*fatNow/100,6);
      c.fillStyle='#deccf8';c.font=`10px ${MONO}`;c.textAlign='right';c.fillText(Math.round(fatNow),fx+fw,fy+4.5);
    }

    function drawChart(){
      const [W,H,dpr]=fit(ccv);const c=cctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
      const prog=phase==='end'?7:night+Math.min(1,nt/dur(res.nights[night]));
      // 2つのパネル（それぞれ1本のY軸）：新規フォロワー累計／疲労
      const cum=[0];res.nights.forEach(n=>cum.push(cum[cum.length-1]+n.gain));
      const fat=[startFat];res.nights.forEach(n=>fat.push(n.fat));
      const L=30,R=W-38,gap=14,ph=(H-18-gap-18)/2;
      const panels=[
        {name:'新規フォロワー（今週の累計）',y0:16,data:cum,max:Math.max(4,Math.ceil(cum[7]/4)*4),col:'#00e8c8',unit:'人'},
        {name:'疲労',y0:16+ph+gap,data:fat,max:100,col:'#e8b830',unit:'',danger:70},
      ];
      const X=i=>L+(R-L)*i/7;
      let tipInfo=null;
      panels.forEach(P=>{
        const Y=v=>P.y0+ph-(ph-12)*v/P.max;
        c.font=`10px ${FONT}`;c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#bbaedd';c.fillText(P.name,L,P.y0+4);
        c.strokeStyle='rgba(187,174,221,.08)';c.lineWidth=1;c.font=`9px ${MONO}`;c.fillStyle='#5e5078';c.textAlign='right';c.textBaseline='middle';
        [0,.5,1].forEach(f=>{const v=Math.round(P.max*f),y=Y(v);c.beginPath();c.moveTo(L,y);c.lineTo(R,y);c.stroke();c.fillText(v,L-5,y);});
        if(P.danger){const y=Y(P.danger);c.setLineDash([3,3]);c.strokeStyle='rgba(232,48,85,.35)';c.beginPath();c.moveTo(L,y);c.lineTo(R,y);c.stroke();c.setLineDash([]);
          c.fillStyle='#5e5078';c.textAlign='left';c.fillText('危険',R+5,y);}
        const pts=[];
        for(let i=0;i<=7;i++){
          if(i<=Math.floor(prog))pts.push([X(i),Y(P.data[i]),i]);
          else{const f=prog-Math.floor(prog);if(f>0){const a=P.data[i-1],b=P.data[i];pts.push([X(i-1+f),Y(a+(b-a)*f),-1,a+(b-a)*f]);}break;}
        }
        if(pts.length>1){
          c.beginPath();pts.forEach(([x,y],k)=>k?c.lineTo(x,y):c.moveTo(x,y));
          c.lineTo(pts[pts.length-1][0],P.y0+ph);c.lineTo(pts[0][0],P.y0+ph);c.closePath();
          const ag=c.createLinearGradient(0,P.y0,0,P.y0+ph);ag.addColorStop(0,P.col+'30');ag.addColorStop(1,P.col+'00');c.fillStyle=ag;c.fill();
        }
        c.strokeStyle=P.col;c.lineWidth=1.6;c.lineJoin='round';c.beginPath();pts.forEach(([x,y],k)=>k?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
        pts.forEach(([x,y,i])=>{if(i<0)return;c.fillStyle='#05040e';c.strokeStyle=P.col;c.lineWidth=1.4;c.beginPath();c.arc(x,y,2.6,0,7);c.fill();c.stroke();
          if(tip&&Math.abs(tip.x-x)<(R-L)/14&&tip.y>P.y0-6&&tip.y<P.y0+ph+6)tipInfo={x,y,i,P};});
        const lp=pts[pts.length-1];
        if(lp){const v=lp[2]>=0?P.data[lp[2]]:lp[3];
          c.fillStyle='#deccf8';c.font=`10px ${MONO}`;c.textAlign='left';c.textBaseline='middle';c.fillText((P.unit?'+':'')+Math.round(v)+P.unit,Math.min(lp[0]+6,R+3),lp[1]-8);}
      });
      c.fillStyle='#5e5078';c.font=`9px ${FONT}`;c.textAlign='center';c.textBaseline='alphabetic';
      ['開始',...DAYS].forEach((d,i)=>c.fillText(d,X(i),H-4));
      if(tipInfo){
        const {x,y,i,P}=tipInfo;const n=i>0?res.nights[i-1]:null;
        const l1=i===0?'開始時点':`${DAYS[i-1]}曜 ${T[n.t].n}`;
        const l2=P.unit?`累計 +${P.data[i]}人`+(n?`（この夜 +${n.gain}）`:''):`疲労 ${P.data[i]}`;
        const l3=n&&isStream(n.t)?`最高同接 ${n.peak}人`:'';
        c.font=`10px ${FONT}`;const tw=Math.max(...[l1,l2,l3].map(s=>c.measureText(s).width))+14;const th=l3?46:32;
        let tx=x+8,ty=y-th-6;if(tx+tw>W-2)tx=x-tw-8;if(ty<2)ty=y+8;
        c.strokeStyle='rgba(222,204,248,.25)';c.setLineDash([2,3]);c.beginPath();c.moveTo(x,P.y0);c.lineTo(x,P.y0+ph);c.stroke();c.setLineDash([]);
        c.fillStyle='rgba(10,7,22,.96)';c.strokeStyle='rgba(222,204,248,.35)';c.lineWidth=1;roundRect(c,tx,ty,tw,th,4);c.fill();c.stroke();
        c.fillStyle='#deccf8';c.textAlign='left';c.textBaseline='top';c.fillText(l1,tx+7,ty+5);c.fillStyle='#bbaedd';c.fillText(l2,tx+7,ty+19);if(l3)c.fillText(l3,tx+7,ty+33);
      }
    }

    // ═════ 通信簿 ═════
    const HERO_SAY={
      S:['win','……数字は正直ね。届いた夜が、ちゃんとあった。'],
      A:['happy','いい並びだった。この感覚、来週も忘れずにいこう。'],
      B:['normal','悪くない。でも、もう一手あった気がする。メモを見返そう。'],
      C:['tired','空回りの夜が多かった……。並べ方、見直さないと。'],
      D:['collapse','詰め込みすぎた……。休むのも運営のうち、ね。'],
    };
    const FAN_SAY={S:'今週、神回多すぎっす！ 切り抜き追いつかないっすよｗ',A:'毎晩楽しみにしてたっす。来週も行くっす！',B:'まったり見てたっす〜。次はトレンド企画も見たいっす',C:'……最近ちょっと同じ感じが続いてるっすね',D:'眠そうで心配っす……無理しないでほしいっす'};
    function showReport(){
      if(repShown)return;repShown=true;
      wipe('WEEKLY REPORT',()=>buildReport());
    }
    function buildReport(){
      const g=res.grade,gc=GRADE_C[g];
      const streams=res.nights.filter(n=>isStream(n.t));
      const best=streams.slice().sort((a,b)=>b.q-a.q)[0],worst=streams.slice().sort((a,b)=>a.q-b.q)[0];
      const nightLine=n=>`${DAYS[n.i]}曜 ${T[n.t].n}（${n.mult.filter(m=>m[1]!==1).map(m=>`${m[0]}×${m[1].toFixed(2)}`).join('・')}）`;
      let heroLine=HERO_SAY[g][1];
      if(res.endFat>70&&(g==='S'||g==='A'||g==='B'))heroLine+=' ……でも、さすがに体が重い。';
      let fanLine=FAN_SAY[g];
      if(g!=='S'&&g!=='D'){
        if(res.found.includes('sleep'))fanLine='寝落ちした夜、ちょっと心配したっすよ…。休みも入れてほしいっす';
        else if(res.found.includes('trend'))fanLine='トレンド企画、ちゃんと押さえてたっすね！';
        else if(res.found.includes('repeat'))fanLine='同じ企画が続いた週は、ちょっと人が減ってた気がするっす';
      }
      const col=plan.findIndex(p=>p.t==='collab');
      const midLine=col<0?null:res.found.includes('short_big')?'告知ありがと！ うちの子たちも「また来たい」って！':'楽しかった！ 次は前の日に告知してくれたら、もっと連れてこれるかも。';
      const say=(who,face,t,d)=>`<div class="mgr-say" style="--pc:${CAST[who].c};animation-delay:${d}s"><div class="pp"><img class="${who==='hero'?'':'px'}" src="${porSrc(who,face)}" alt=""></div><div class="bb"><i>${CAST[who].n}</i>${t}</div></div>`;
      const ov=el('div','mgr-ov');
      const bx=el('div','mgr-box mgr-rep');bx.style.setProperty('--gc',gc);
      const bestTxt=res.prevBest==null?'<span style="color:var(--gd)">はじめての通信簿</span>':'SABCD'.indexOf(g)<'SABCD'.indexOf(res.prevBest)?`<span style="color:var(--gd)">BEST更新！（前回までの最高 ${res.prevBest}）</span>`:`これまでの最高 ${md.best}`;
      bx.innerHTML=`<div class="sub">WEEKLY REPORT ／ ${gs.day}日目の会議</div>
        <div class="mgr-rep-hd"><div class="mgr-stamp">${g}</div><div style="flex:1"><h3 style="margin:0">週間通信簿</h3>
          <div class="pl" style="margin-top:3px">${planStr(plan.map(p=>p.t))}</div>
          <div style="font-size:.6rem;margin-top:2px">${bestTxt}</div></div></div>
        ${say('hero',HERO_SAY[g][0],heroLine,.5)}
        <div class="mgr-stats">
          <div class="mgr-stat"><small>新規フォロワー</small><b style="color:var(--cy)">+${REWARD[g].followers}</b></div>
          <div class="mgr-stat"><small>最高同接</small><b>${res.peak}人</b></div>
          <div class="mgr-stat"><small>日曜夜の疲労</small><b style="color:${fatCol(res.endFat)}">${res.endFat}</b></div>
          <div class="mgr-stat"><small>週間スコア</small><b>${res.score.toFixed(1)}</b></div>
        </div>
        ${say('fan',null,fanLine,.8)}
        ${midLine?say('mid',null,midLine,1.0):''}
        ${best?`<div class="mgr-note" style="border-color:var(--gn)"><b style="color:var(--gn)">ベストの夜</b>：${nightLine(best)}</div>`:''}
        ${worst&&worst!==best?`<div class="mgr-note" style="border-color:var(--rd)"><b style="color:var(--rd)">ワーストの夜</b>：${nightLine(worst)}</div>`:''}
        ${res.pen>0?`<div class="mgr-note" style="border-color:var(--rd)"><b style="color:var(--rd)">疲労ペナルティ</b>：日曜夜の疲労が70超え（−${res.pen.toFixed(1)}）</div>`:''}
        <div class="mgr-sec">INSIGHTS ／ 今週の気づき（全${md.found.length}/${Object.keys(FOUND).length}）</div>
        ${res.found.length?res.found.map(f=>`<div class="mgr-found${res.newFound.includes(f)?' new':''}">${FOUND[f]}${res.newFound.includes(f)?'<span class="nw">NEW</span>':''}</div>`).join(''):'<div class="mgr-found">特になし</div>'}
        ${md.reports.length>1?`<div class="mgr-sec">PAST REPORTS ／ 過去の通信簿</div>${pastTable(4,true)}`:''}`;
      const b=el('button','mgr-btn','会議を終える');b.style.borderColor=gc;b.style.color=gc;
      b.onclick=()=>{se('decide');mg.end('done');};
      bx.appendChild(b);ov.appendChild(bx);root.appendChild(ov);
      sfx('roll');
      later(420,()=>{sfx('stamp');se(g==='S'||g==='A'?'ach':'rank');});
      later(900,()=>sfx(g==='S'||g==='A'?'fanfare':g==='B'?'good':'sad'));
      mg.setScore(`評価 <span style="color:${gc}">${g}</span> ・ スコア ${res.score.toFixed(1)}`);
    }

    // ═════ ループ ═════
    mg.loop(dt=>{
      clock+=dt;
      if(phase==='title')drawTitle(dt);
      if(phase==='sim'){
        const n=res.nights[night];
        nt+=dt*speed;
        const D=dur(n);
        if(!discShown&&nt>D*.2){discShown=true;showDiscovery(n);}
        if(!evtShown&&nt>D*.5){evtShown=true;showEvt(n);}
        chatT-=dt*speed;
        if(chatT<=0){chatT=.45+Math.random()*.4;bubble(n);}
        if(nt>=D){
          endNight();
          if(night>=6)finishSim();
          else{night++;nt=0;beginNight();}
        }
        if(phase==='sim')mg.setScore(`放送中 ${DAYS[night]}曜 ・ 今週 +${res.nights.slice(0,night).reduce((a,n)=>a+n.gain,0)}人`);
      }
      if(phase==='end'){endT+=dt;if(endT>1.2)showReport();}
      if(sim&&mcv)drawMon(dt),drawChart();
    });

    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        if(phase==='title')title.onclick();
        else if(phase==='story')advance();
        else if(phase==='plan'&&!goBtn.disabled&&!root.querySelector('.mgr-ov'))startSim();
        else if(phase==='end'&&repShown)mg.end('done');
      }
      else if((e.key==='z'||e.key==='Z')&&phase==='plan')undoBtn.onclick();
    });

    // テスト用フック
    body._mgr={plan,get phase(){return phase;},get res(){return res;},trend,aff,favs,KEYS,
      fill(arr){arr.forEach((p,i)=>{plan[i].t=p[0];plan[i].b=p[1]==null?1:p[1];});
        if(phase!=='plan'){const t=root.querySelector('.mgr-title');if(t)t.remove();if(story)story.remove();phase='plan';}
        stopCoach();renderBoard();},
      go:()=>startSim(),skip:()=>finishSim(),setSpeed:v=>{speed=v;}};

    function cleanup(){
      stopCoach();
      document.querySelectorAll('.mgr-ghost,.mgr-fly').forEach(g=>g.remove());
      clearTimeout(hintTo);
    }

    return {result(reason){
      cleanup();
      if(reason==='quit'&&res&&!simDone)finishSim();        // 放送が始まっていれば最後まで集計
      if(reason==='quit'&&simDone)reason='done';            // 放送済みなら通信簿どおりに精算
      if(reason!=='done'||!res){
        return {title:'📈 会議を途中で切り上げた',summary:'来週の計画は白紙のまま。なんとなく配信することにした。',
          fx:{fatigue:1},time:15,log:null,cutin:null};
      }
      const g=res.grade,fx=Object.assign({},REWARD[g]);
      return {
        title:`📈 週間通信簿：${g}評価`,
        summary:`トレンド「${T[trend].n}」 ・ 最高同接 <span class="up">${res.peak}人</span> ・ 日曜夜の疲労 <span class="${res.endFat>70?'down':'up'}">${res.endFat}</span>`+
          (res.newFound&&res.newFound.length?`<br>新しい気づき <span class="up">${res.newFound.length}件</span>（会議メモに記録）`:''),
        fx,time:50,sp:g==='S'?1:0,
        log:`来週の配信計画を立てた（${g}評価）。`,
        cutin:g==='S'?['win',HERO_SAY.S[1]]:g==='A'?['happy','……いい並びだったわ。来週もこの調子で。']:(g==='C'||g==='D')?['tired','……詰め込みすぎたかも。休むのも、運営のうちね。']:null,
      };
    }};
  },
});
})();
