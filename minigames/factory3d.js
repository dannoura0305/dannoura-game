// ══════════════════════════════════════════════════════════
// 3Dアクション「夜勤の第三工場」
// 落雷で停電した夜の第三工場。懐中電灯ひとつで計器5か所を点検して非常口へ。
// 闇の中を「影」がうろつく。光を当てると影の“まとい”が焼けて霧散するが、
// 暗がりや背後からは静かに近づいてくる。電池＝体力。
// 流れ：タイトル → 無線（班長） → 操作説明 → 探索（静寂→影の出現→追跡） → 結末・評価
// three.js（vendor/three.min.js）を loadThree() で読み込む。
// ══════════════════════════════════════════════════════════
addMinigameStyle('factory3d',`
.mg-factory3d{background:#020208;}
.factory3d-wrap{position:absolute;inset:0;overflow:hidden;background:#020208;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;}
.factory3d-wrap canvas{position:absolute;left:0;top:0;width:100%!important;height:100%!important;display:block;}
.factory3d-wrap.factory3d-hit canvas{filter:contrast(1.6) saturate(1.8) hue-rotate(-30deg) blur(1.4px);animation:factory3d-warp .42s steps(5) infinite;}
@keyframes factory3d-warp{0%{transform:none}20%{transform:translate(-7px,2px) skewX(4deg)}40%{transform:translate(6px,-3px) skewX(-5deg) scale(1.04)}60%{transform:translate(-3px,5px) skewY(2deg)}80%{transform:translate(4px,0) scale(1.02)}100%{transform:none}}
.factory3d-wrap.factory3d-glitch canvas{animation:factory3d-warp .25s steps(3) 2;}
.factory3d-lay{position:absolute;inset:0;pointer-events:none;}
.factory3d-vig{background:radial-gradient(ellipse 78% 72% at 50% 50%,rgba(0,0,0,0) 42%,rgba(3,2,10,.5) 72%,rgba(0,0,0,.93) 100%);transition:transform .12s;}
.factory3d-grain{inset:-60%;opacity:.045;mix-blend-mode:screen;background-size:160px 160px;animation:factory3d-grain .6s steps(6) infinite;}
@keyframes factory3d-grain{0%{transform:translate(0,0)}17%{transform:translate(-7%,4%)}33%{transform:translate(5%,-6%)}50%{transform:translate(-3%,7%)}67%{transform:translate(7%,2%)}83%{transform:translate(-5%,-4%)}100%{transform:translate(0,0)}}
.factory3d-scan{background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,rgba(0,0,0,0) 1px 3px);opacity:.28;}
.factory3d-red{background:radial-gradient(ellipse at 50% 50%,rgba(232,48,85,0) 30%,rgba(150,10,40,.5) 72%,rgba(60,0,20,.95) 100%);opacity:0;}
.factory3d-flash{background:#c8d4ff;opacity:0;mix-blend-mode:screen;}
.factory3d-dark{background:#000;opacity:0;}
.factory3d-hud{position:absolute;inset:0;pointer-events:none;font-family:var(--dot);color:var(--tx-b);z-index:3;transition:opacity .5s;}
.factory3d-wrap.factory3d-cine .factory3d-hud,.factory3d-wrap.factory3d-cine .factory3d-act,.factory3d-wrap.factory3d-cine .factory3d-joyhint{opacity:0;pointer-events:none;}
.factory3d-bat{position:absolute;left:10px;top:9px;display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:.68rem;color:#c8fff5;text-shadow:0 0 6px rgba(0,232,200,.6);}
.factory3d-bat .factory3d-cell{position:relative;width:62px;height:14px;border:1.5px solid rgba(200,255,245,.75);border-radius:3px;padding:1px;box-shadow:0 0 8px rgba(0,232,200,.3);}
.factory3d-bat .factory3d-cell:after{content:'';position:absolute;right:-5px;top:3px;width:3px;height:6px;background:rgba(200,255,245,.75);border-radius:0 2px 2px 0;}
.factory3d-bat .factory3d-cell i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#00b8a0,#00e8c8);border-radius:1px;transition:width .2s,background .3s;}
.factory3d-bat.mid i{background:linear-gradient(90deg,#b88a10,#e8b830)!important;}
.factory3d-bat.low{color:#ffb0c0;text-shadow:0 0 6px rgba(232,48,85,.8);animation:factory3d-blink .6s steps(2) infinite;}
.factory3d-bat.low i{background:linear-gradient(90deg,#a01030,#e83055)!important;}
.factory3d-bat.drain{color:#ffe9a8;}
@keyframes factory3d-blink{50%{opacity:.45}}
.factory3d-chk{position:absolute;right:10px;top:9px;display:flex;gap:4px;align-items:center;font-size:.6rem;color:var(--tx);}
.factory3d-chk span{width:13px;height:13px;border-radius:50%;border:1.5px solid rgba(232,184,48,.7);display:flex;align-items:center;justify-content:center;font-size:.55rem;color:transparent;box-shadow:0 0 6px rgba(232,184,48,.25);transition:all .3s;}
.factory3d-chk span.ok{background:#44ee88;border-color:#44ee88;color:#04140a;box-shadow:0 0 8px rgba(68,238,136,.7);transform:scale(1.15);}
.factory3d-nav{position:absolute;left:50%;top:32px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;font-size:.62rem;color:#ffe9a8;text-shadow:0 0 6px rgba(232,184,48,.7);background:rgba(5,4,14,.45);padding:2px 9px 2px 6px;border-radius:10px;border:1px solid rgba(232,184,48,.25);white-space:nowrap;}
.factory3d-nav b{display:inline-block;font-size:.8rem;line-height:1;color:#e8b830;}
.factory3d-nav.exit{color:#b8ffd2;text-shadow:0 0 6px rgba(68,238,136,.8);border-color:rgba(68,238,136,.35);}
.factory3d-nav.exit b{color:#44ee88;}
.factory3d-phase{position:absolute;left:50%;top:54px;transform:translateX(-50%);font-family:var(--mono);font-size:.52rem;letter-spacing:.25em;color:rgba(222,204,248,.45);white-space:nowrap;}
.factory3d-phase.p1{color:rgba(232,140,160,.7);}
.factory3d-phase.p2{color:#ff6a88;text-shadow:0 0 6px rgba(232,48,85,.8);animation:factory3d-blink .8s steps(2) infinite;}
.factory3d-cross{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:rgba(222,204,248,.7);box-shadow:0 0 4px rgba(222,204,248,.6);}
.factory3d-ring{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;opacity:0;transition:opacity .15s;}
.factory3d-ring.on{opacity:1;}
.factory3d-ring circle{fill:none;stroke-width:4;}
.factory3d-prompt{position:absolute;left:50%;top:calc(50% + 40px);transform:translateX(-50%);font-size:.66rem;color:#ffe9a8;text-shadow:0 0 8px rgba(232,184,48,.8),0 0 2px #000;opacity:0;transition:opacity .15s;white-space:nowrap;background:rgba(5,4,14,.5);padding:1px 8px;border-radius:8px;}
.factory3d-prompt.on{opacity:1;}
.factory3d-toast{position:absolute;left:50%;top:27%;transform:translateX(-50%);font-size:.9rem;letter-spacing:.06em;white-space:nowrap;color:#deccf8;text-shadow:0 0 10px rgba(138,82,212,.9),0 0 2px #000;opacity:0;}
.factory3d-toast.ok{color:#b8ffd2;text-shadow:0 0 12px rgba(68,238,136,.9),0 0 2px #000;}
.factory3d-toast.bad{color:#ffb0c0;text-shadow:0 0 12px rgba(232,48,85,.95),0 0 2px #000;}
.factory3d-toast.show{animation:factory3d-toast 2.4s ease-out forwards;}
@keyframes factory3d-toast{0%{opacity:0;transform:translate(-50%,8px) scale(.94)}10%{opacity:1;transform:translate(-50%,0) scale(1)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-6px)}}
.factory3d-hint{position:absolute;left:50%;bottom:112px;transform:translateX(-50%);max-width:88%;font-size:.62rem;line-height:1.45;text-align:center;color:#c8fff5;background:rgba(4,16,20,.72);border:1px solid rgba(0,232,200,.4);border-radius:9px;padding:5px 11px;box-shadow:0 0 12px rgba(0,232,200,.2);opacity:0;transition:opacity .35s;}
.factory3d-hint.on{opacity:1;}
.factory3d-hint b{color:#ffe9a8;font-weight:normal;}
.factory3d-joy{position:absolute;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;border:1.5px solid rgba(0,232,200,.35);background:radial-gradient(circle,rgba(0,232,200,.08),rgba(0,0,0,.25));pointer-events:none;opacity:0;transition:opacity .15s;z-index:4;}
.factory3d-joy.on{opacity:1;}
.factory3d-joy i{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(200,255,245,.55),rgba(0,140,120,.45));border:1px solid rgba(200,255,245,.6);box-shadow:0 0 12px rgba(0,232,200,.45);}
.factory3d-joyhint{position:absolute;left:18px;bottom:20px;width:84px;height:84px;border-radius:50%;border:1.5px dashed rgba(0,232,200,.22);pointer-events:none;z-index:2;display:flex;align-items:center;justify-content:center;font-size:.55rem;color:rgba(200,255,245,.35);font-family:var(--dot);transition:opacity .4s;}
.factory3d-act{position:absolute;right:16px;bottom:20px;width:78px;height:78px;border-radius:50%;z-index:5;touch-action:none;
  border:1.5px solid rgba(232,184,48,.55);background:radial-gradient(circle at 45% 35%,rgba(90,70,20,.75),rgba(14,10,24,.88));
  color:#ffe9a8;font-family:var(--dot);font-size:.72rem;line-height:1.15;text-align:center;cursor:pointer;
  box-shadow:0 0 10px rgba(232,184,48,.25),inset 0 0 10px rgba(232,184,48,.15);-webkit-tap-highlight-color:transparent;transition:box-shadow .2s,transform .08s,opacity .3s,border-color .2s;}
.factory3d-act small{display:block;font-size:.5rem;color:rgba(255,233,168,.6);font-family:var(--mono);}
.factory3d-act.focus{border-color:rgba(200,220,255,.55);color:#e4ecff;background:radial-gradient(circle at 45% 35%,rgba(60,70,110,.75),rgba(14,10,24,.88));box-shadow:0 0 10px rgba(160,190,255,.25);}
.factory3d-act.focus small{color:rgba(220,230,255,.6);}
.factory3d-act.ready{border-color:#e8b830;box-shadow:0 0 18px rgba(232,184,48,.75),inset 0 0 14px rgba(232,184,48,.35);animation:factory3d-pulse 1s ease-in-out infinite;}
.factory3d-act.held{transform:scale(.93);}
@keyframes factory3d-pulse{50%{box-shadow:0 0 26px rgba(232,184,48,.95),inset 0 0 18px rgba(232,184,48,.45);}}
.factory3d-ov{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:18px;text-align:center;
  background:radial-gradient(ellipse at 50% 45%,rgba(20,12,40,.8),rgba(2,1,8,.95));font-family:var(--dot);color:var(--tx);}
.factory3d-ov.hide{display:none;}
.factory3d-ov.factory3d-gout{animation:factory3d-gout .5s steps(5) forwards;pointer-events:none;}
@keyframes factory3d-gout{0%{opacity:1}30%{transform:translateX(-8px) skewX(8deg);filter:hue-rotate(90deg)}60%{opacity:.7;transform:translateX(6px) scaleY(.5);clip-path:inset(28% 0 28% 0)}100%{opacity:0;transform:scaleY(.02);clip-path:inset(49% 0 49% 0)}}
.factory3d-ov.factory3d-gin{animation:factory3d-gin .45s steps(5) both;}
@keyframes factory3d-gin{0%{opacity:0;transform:scaleY(.02);clip-path:inset(49% 0 49% 0)}50%{opacity:.8;transform:translateX(-6px) scaleY(.6) skewX(-6deg);filter:hue-rotate(-80deg)}100%{opacity:1;transform:none;clip-path:inset(0 0 0 0)}}
.factory3d-ov h3{margin:0;font-weight:normal;font-size:1rem;color:var(--tx-b);letter-spacing:.12em;text-shadow:0 0 12px rgba(138,82,212,.9);}
.factory3d-sub{font-family:var(--mono);font-size:.56rem;color:var(--tx-d);letter-spacing:.24em;}
.factory3d-ov ul{list-style:none;margin:4px 0;padding:0;font-size:.68rem;line-height:1.75;text-align:left;}
.factory3d-ov ul b{color:var(--gd);font-weight:normal;}
.factory3d-ov ul em{color:var(--rd);font-style:normal;}
.factory3d-ov ul i{color:var(--gn);font-style:normal;}
.factory3d-ov ul u{color:var(--cy);text-decoration:none;}
.factory3d-keys{font-size:.56rem;color:var(--tx-d);border-top:1px solid rgba(138,82,212,.3);padding-top:6px;line-height:1.6;}
.factory3d-bar{width:150px;height:3px;background:rgba(138,82,212,.25);border-radius:2px;overflow:hidden;}
.factory3d-bar i{display:block;height:100%;width:0;background:var(--pu);box-shadow:0 0 6px var(--pu);animation:factory3d-bar 3s linear forwards;}
@keyframes factory3d-bar{to{width:100%}}
.factory3d-ov button,.factory3d-btn{margin-top:6px;padding:7px 18px;border-radius:8px;border:1px solid var(--gd);background:rgba(232,184,48,.12);color:#ffe9a8;font-family:var(--dot);font-size:.78rem;cursor:pointer;letter-spacing:.08em;}
.factory3d-load{font-size:.8rem;color:var(--tx-b);letter-spacing:.2em;animation:factory3d-blink 1.1s steps(2) infinite;}
.factory3d-ov.factory3d-titleov{background:radial-gradient(ellipse at 50% 42%,rgba(40,10,30,.35),rgba(2,1,8,.82) 70%,rgba(0,0,0,.96));gap:4px;}
.factory3d-logo{position:relative;font-size:2.5rem;line-height:1.05;color:#f2e8ff;letter-spacing:.14em;text-shadow:0 0 18px rgba(138,82,212,.95),0 0 3px #fff;animation:factory3d-glitch 2.8s steps(1) infinite;margin:6px 0 2px;}
.factory3d-logo small{display:block;font-size:.85rem;letter-spacing:.6em;color:var(--gd);text-shadow:0 0 8px rgba(232,184,48,.8);margin-bottom:4px;}
.factory3d-logo:after{content:'';display:block;height:2px;margin:8px auto 0;width:80%;background:linear-gradient(90deg,transparent,#e83055,transparent);box-shadow:0 0 10px #e83055;}
@keyframes factory3d-glitch{0%,100%{text-shadow:0 0 18px rgba(138,82,212,.95),0 0 3px #fff;transform:none;clip-path:none}7%{text-shadow:-4px 0 #e83055,4px 0 #00e8c8;transform:translateX(3px) skewX(-8deg)}9%{text-shadow:0 0 18px rgba(138,82,212,.95);transform:none}51%{text-shadow:3px 0 #e83055,-3px 0 #00e8c8;clip-path:inset(18% 0 46% 0);transform:translateX(-4px)}53%{clip-path:none;transform:none;text-shadow:0 0 18px rgba(138,82,212,.95)}78%{opacity:.75}79%{opacity:1}}
.factory3d-tap{margin-top:14px;font-family:var(--mono);font-size:.6rem;letter-spacing:.4em;color:var(--tx);animation:factory3d-blink 1.2s steps(2) infinite;}
.factory3d-rec{font-family:var(--mono);font-size:.56rem;color:var(--gd);letter-spacing:.12em;}
.factory3d-bars:before,.factory3d-bars:after{content:'';position:absolute;left:0;right:0;height:0;background:#000;z-index:7;transition:height .5s ease;}
.factory3d-bars:before{top:0}.factory3d-bars:after{bottom:0}
.factory3d-wrap.factory3d-cine .factory3d-bars:before,.factory3d-wrap.factory3d-cine .factory3d-bars:after{height:9%;}
.factory3d-talk{position:absolute;left:8px;right:8px;bottom:11%;z-index:9;display:flex;gap:8px;align-items:flex-end;opacity:0;transform:translateY(10px);transition:opacity .35s,transform .35s;pointer-events:none;}
.factory3d-talk.on{opacity:1;transform:none;pointer-events:auto;}
.factory3d-por{flex:none;width:92px;height:116px;border:1px solid rgba(138,82,212,.65);border-radius:7px;background:#0a0716 center top/cover no-repeat;box-shadow:0 0 14px rgba(138,82,212,.45);position:relative;overflow:hidden;}
.factory3d-por.radio{background:linear-gradient(180deg,#12101e,#07060e);border-color:rgba(0,232,200,.55);box-shadow:0 0 14px rgba(0,232,200,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;font-family:var(--mono);font-size:.5rem;color:#8afff0;letter-spacing:.2em;}
.factory3d-por.radio b{font-size:1.7rem;font-weight:normal;filter:drop-shadow(0 0 6px rgba(0,232,200,.6));}
.factory3d-por.radio .factory3d-wave{display:flex;gap:2px;height:16px;align-items:center;}
.factory3d-por.radio .factory3d-wave i{width:3px;background:#00e8c8;border-radius:1px;animation:factory3d-wv .5s ease-in-out infinite alternate;}
@keyframes factory3d-wv{from{height:3px}to{height:15px}}
.factory3d-box{flex:1;min-width:0;background:var(--panel);border:1px solid rgba(138,82,212,.55);border-radius:9px;padding:7px 10px 8px;min-height:84px;box-shadow:0 0 16px rgba(0,0,0,.6);}
.factory3d-name{font-size:.6rem;color:var(--cy);letter-spacing:.1em;margin-bottom:3px;}
.factory3d-name.dan{color:var(--gd);}
.factory3d-line{font-family:var(--dot);font-size:.78rem;color:var(--tx-b);line-height:1.55;min-height:2.4em;}
.factory3d-next{text-align:right;font-family:var(--mono);font-size:.55rem;color:var(--tx-d);animation:factory3d-blink 1s steps(2) infinite;}
.factory3d-skip{position:absolute;right:10px;top:calc(9% + 8px);z-index:10;padding:3px 10px;border-radius:7px;border:1px solid rgba(187,174,221,.4);background:rgba(5,4,14,.6);color:var(--tx);font-family:var(--dot);font-size:.6rem;cursor:pointer;display:none;}
.factory3d-wrap.factory3d-story .factory3d-skip{display:block;}
.factory3d-end{position:absolute;inset:0;z-index:9;display:none;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14px;font-family:var(--dot);color:var(--tx);background:radial-gradient(ellipse at 50% 40%,rgba(20,12,40,.4),rgba(2,1,8,.8));}
.factory3d-end.on{display:flex;animation:factory3d-gin .5s steps(5) both;}
.factory3d-end h3{margin:0;font-weight:normal;font-size:1rem;letter-spacing:.1em;color:var(--tx-b);text-shadow:0 0 10px rgba(138,82,212,.8);}
.factory3d-end .factory3d-row{display:flex;gap:10px;align-items:center;width:100%;max-width:380px;}
.factory3d-end .factory3d-por{width:84px;height:106px;}
.factory3d-end .factory3d-box{min-height:0;font-size:.68rem;line-height:1.6;color:var(--tx-b);text-align:left;}
.factory3d-end .factory3d-box p{margin:0 0 3px;}
.factory3d-end .factory3d-box p span{color:var(--cy);font-size:.58rem;margin-right:4px;}
.factory3d-grade{display:flex;align-items:center;gap:14px;margin:2px 0;}
.factory3d-grade b{font-family:var(--mono);font-weight:normal;font-size:3.6rem;line-height:1;width:72px;height:72px;display:flex;align-items:center;justify-content:center;border:3px solid currentColor;border-radius:10px;transform:rotate(-8deg);animation:factory3d-stamp .5s cubic-bezier(.2,1.6,.4,1) .35s both;}
.factory3d-grade b.S{color:#ffd84a;text-shadow:0 0 18px rgba(255,216,74,.9);box-shadow:0 0 18px rgba(255,216,74,.5);}
.factory3d-grade b.A{color:#44ee88;text-shadow:0 0 14px rgba(68,238,136,.8);}
.factory3d-grade b.B{color:#00e8c8;text-shadow:0 0 12px rgba(0,232,200,.7);}
.factory3d-grade b.C{color:#bbaedd;text-shadow:0 0 10px rgba(138,82,212,.7);}
@keyframes factory3d-stamp{0%{opacity:0;transform:rotate(-8deg) scale(2.6)}100%{opacity:1;transform:rotate(-8deg) scale(1)}}
.factory3d-stats{font-family:var(--mono);font-size:.62rem;line-height:1.65;color:var(--tx);text-align:left;}
.factory3d-stats em{font-style:normal;color:var(--tx-b);}
.factory3d-new{color:var(--gd);font-size:.6rem;letter-spacing:.2em;animation:factory3d-blink .7s steps(2) infinite;}
`);

registerMinigame({
  id:'factory3d', icon:'🏭', name:'夜勤の第三工場', genre:'3Dアクション', bgm:'kaidan',
  desc:'落雷で停電した夜の第三工場。懐中電灯だけを頼りに計器5か所を点検し、非常口へ。闇の中を「影」がうろついている。',
  effect:'仕事評価↑ 資格知識↑ 収入↑ ／ 疲労+8 約70分',
  help:'左:移動 右:視点 ボタン長押し:点検/集光 ／ WASD・ドラッグ・E',
  start(body,mg){
    // ── 定数 ──
    const CELL=4, COLS=10, ROWS=15, HW=COLS*CELL/2, HD=ROWS*CELL/2;
    // 難しさ（設定画面で選ぶ。むずかしい＝従来の調整）
    const DIFF=mgDifficulty();
    const DF={
      time:mgDiff(130,110,90),    // 制限時間（秒）
      ghost:mgDiff(.7,.85,1),     // 影の速さ
      drain:mgDiff(.6,.8,1),      // 電池の減り
      dmg:mgDiff(.6,.8,1),        // 影に触れられた時の電池ダメージ
      hold:mgDiff(.7,.85,1),      // 計器の点検に必要な長押し時間
      burn:mgDiff(1.5,1.2,1),     // 光で影を焼く速さ
      bats:mgDiff(6,5,4),         // 予備電池の数
      dash:mgDiff(.5,.8,1),       // 目を離した隙に詰める距離
    };
    addMinigameStyle('diffbadge','.mg-diffb{display:inline-block;margin-left:7px;padding:1px 5px;border:1px solid currentColor;border-radius:3px;font-size:.58rem;letter-spacing:0;vertical-align:1px;}.mg-diffb-easy{color:#44ee88;}.mg-diffb-normal{color:#e8b830;}.mg-diffb-hard{color:#ff6a86;}');
    {const tt=mg.el('mg-title');if(tt&&!tt.querySelector('.mg-diffb'))tt.insertAdjacentHTML('beforeend',`<span class="mg-diffb mg-diffb-${DIFF}">${MG_DIFF_NAMES[DIFF]}</span>`);}
    const FL_MAX=20, TIME_LIMIT=DF.time, NEED=5, P_R=.36, EYE=1.62, SPEED=3.7;
    const SK=(gs&&gs.skills)||{};
    const HOLD_T=1.5*DF.hold*(1-Math.min(.3,((SK.soundDiag||0)+(SK.emergencyFix||0))*.03));
    const HIT_DMG=Math.round(30*DF.dmg*(1-Math.min(.3,(SK.stressRes||0)*.03)));
    // 記録と難易度（クリア回数・日数で影が強くなる）
    const DATA=gs.factory3dData=Object.assign({plays:0,clears:0,best:'',bestScore:0,bestTime:0},gs.factory3dData||{});
    const HARD=Math.min(3,DATA.clears)+Math.min(1,(gs.day||1)/30);
    const GHOST_MUL=(1+HARD*.08)*DF.ghost, DRAIN=.5*(1+HARD*.05)*DF.drain;
    const rnd=(a,b)=>a+Math.random()*(b-a);
    const pick=a=>a[(Math.random()*a.length)|0];
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
    const se=t=>{try{AU.se(t);}catch(e){}};
    const coarse=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);

    // ── レイアウトのテンプレート（10列×15行、上が北＝非常口側、S＝スタート） ──
    // M:機械 T:タンク C:コンベア .:通路
    const TEMPLATES=[
      ['..........',
       '.MM.TT.MM.',
       '.MM....MM.',
       '..........',
       '.CCCC.CCC.',
       '..........',
       '.M.MM.M.M.',
       '.M....M.M.',
       '..........',
       'TT.MMMM.TT',
       '..........',
       '.CC.MM.CC.',
       '.CC....CC.',
       '..........',
       '....SS....'],
      ['..........',
       '.TT....TT.',
       '.TT.MM.TT.',
       '....MM....',
       '.MM....MM.',
       '.MM.C..MM.',
       '....C.....',
       '.T..C..T..',
       '.MM.C..MM.',
       '.MM....MM.',
       '....MM....',
       '.TT.MM.TT.',
       '.TT....TT.',
       '..........',
       '....SS....'],
      ['..........',
       '.MMM.MMMM.',
       '..........',
       '.C......T.',
       '.C.MMM..T.',
       '.C.MMM....',
       '.C......M.',
       '.C.T.T..M.',
       '.C......M.',
       '.C.MMMM...',
       '.C......T.',
       '.C.MM.MMT.',
       '..........',
       '.TT....MM.',
       '....SS....'],
      ['..........',
       '.MM.MM.MM.',
       '..........',
       'T.CCCCCC.T',
       '..........',
       '.MMM..MMM.',
       '.....T....',
       '.TT.....M.',
       '.TT.MMM.M.',
       '........M.',
       '.CCCC..T..',
       '..........',
       '.M.MM.MM.T',
       '.M........',
       '....SS....'],
    ];

    // ── 状態 ──
    const S={disposed:false,phase:'load',inspected:0,battery:100,hits:0,elapsed:0,timeLeft:TIME_LIMIT,picked:0,repels:0,
      endReason:null,tension:0,grade:'',score:0,newRec:false,focusT:0};
    let G=null;            // three.js 側の参照
    let ro=null;
    const offs=[];         // 解除するイベント
    const on=(el,ev,fn,opt)=>{el.addEventListener(ev,fn,opt);offs.push(()=>el.removeEventListener(ev,fn,opt));};
    let advance=()=>{};    // 演出フェーズを進める（buildで差し替え）

    // ── DOM ──
    const wrap=document.createElement('div');
    wrap.className='factory3d-wrap factory3d-cine';
    wrap.innerHTML=`
      <div class="factory3d-lay factory3d-flash"></div>
      <div class="factory3d-lay factory3d-scan"></div>
      <div class="factory3d-lay factory3d-grain"></div>
      <div class="factory3d-lay factory3d-vig"></div>
      <div class="factory3d-lay factory3d-red"></div>
      <div class="factory3d-lay factory3d-dark"></div>
      <div class="factory3d-lay factory3d-bars"></div>
      <div class="factory3d-hud">
        <div class="factory3d-bat"><span>🔦</span><div class="factory3d-cell"><i></i></div><span class="factory3d-pct">100%</span></div>
        <div class="factory3d-chk"><span>✓</span><span>✓</span><span>✓</span><span>✓</span><span>✓</span></div>
        <div class="factory3d-nav"><b>▲</b><span>計器</span></div>
        <div class="factory3d-phase">— 静寂 —</div>
        <div class="factory3d-cross"></div>
        <svg class="factory3d-ring" viewBox="0 0 62 62"><circle cx="31" cy="31" r="26" stroke="rgba(232,184,48,.25)"/><circle class="factory3d-prog" cx="31" cy="31" r="26" stroke="#e8b830" stroke-dasharray="163.4" stroke-dashoffset="163.4" transform="rotate(-90 31 31)" stroke-linecap="round"/></svg>
        <div class="factory3d-prompt">長押しで点検</div>
        <div class="factory3d-toast"></div>
        <div class="factory3d-hint"></div>
      </div>
      <div class="factory3d-joyhint">移動</div>
      <div class="factory3d-joy"><i></i></div>
      <button class="factory3d-act focus" type="button">集光<small>HOLD / E</small></button>
      <div class="factory3d-talk"><div class="factory3d-por"></div><div class="factory3d-box"><div class="factory3d-name"></div><div class="factory3d-line"></div><div class="factory3d-next">▼ TAP</div></div></div>
      <button class="factory3d-skip" type="button">スキップ ▶▶</button>
      <div class="factory3d-end"></div>
      <div class="factory3d-ov factory3d-loadov"><div class="factory3d-load">読み込み中…</div></div>`;
    body.appendChild(wrap);
    const $=s=>wrap.querySelector(s);
    const el={
      flash:$('.factory3d-flash'),red:$('.factory3d-red'),dark:$('.factory3d-dark'),grain:$('.factory3d-grain'),vig:$('.factory3d-vig'),
      bat:$('.factory3d-bat'),batI:$('.factory3d-cell i'),pct:$('.factory3d-pct'),chk:[...wrap.querySelectorAll('.factory3d-chk span')],
      nav:$('.factory3d-nav'),navB:$('.factory3d-nav b'),navT:$('.factory3d-nav span'),phase:$('.factory3d-phase'),
      ring:$('.factory3d-ring'),prog:$('.factory3d-prog'),prompt:$('.factory3d-prompt'),toast:$('.factory3d-toast'),hint:$('.factory3d-hint'),
      joy:$('.factory3d-joy'),knob:$('.factory3d-joy i'),joyhint:$('.factory3d-joyhint'),act:$('.factory3d-act'),load:$('.factory3d-loadov'),
      talk:$('.factory3d-talk'),por:$('.factory3d-por'),name:$('.factory3d-name'),line:$('.factory3d-line'),skip:$('.factory3d-skip'),end:$('.factory3d-end'),
    };
    // フィルムグレイン（CSS背景用のノイズ画像をその場で生成）
    try{
      const nc=document.createElement('canvas');nc.width=nc.height=128;
      const ng=nc.getContext('2d');const id=ng.createImageData(128,128);
      for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255|0;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=Math.random()<.5?255:0;}
      ng.putImageData(id,0,0);el.grain.style.backgroundImage=`url(${nc.toDataURL()})`;
    }catch(e){}
    mg.setScore(`点検 0/${NEED}`);mg.setTimer(TIME_LIMIT+'s');

    function toast(msg,cls=''){
      el.toast.className='factory3d-toast';void el.toast.offsetWidth;
      el.toast.textContent=msg;el.toast.className='factory3d-toast show '+cls;
    }

    // ══════════════════════════════════════════════════════
    // 効果音（Web Audio合成：足音・環境音・心音・雷など）
    // AU.ctx がある時だけ。音量は AUDIO_SET.se に追従し、0なら無音。
    // ══════════════════════════════════════════════════════
    const SFX={ctx:null,out:null,noise:null,loops:[],whisper:null,burn:null,hb:0};
    const seVol=()=>{try{return typeof AUDIO_SET!=='undefined'?+AUDIO_SET.se||0:1;}catch(e){return 1;}};
    function sfxInit(){
      try{
        if(SFX.ctx||typeof AU==='undefined')return;
        if(AU.init)AU.init();
        const c=AU.ctx;if(!c)return;
        if(c.state==='suspended')c.resume().catch(()=>{});
        SFX.ctx=c;SFX.out=c.createGain();SFX.out.gain.value=0;SFX.out.connect(c.destination);
        const len=c.sampleRate*2,buf=c.createBuffer(1,len,c.sampleRate),d=buf.getChannelData(0);
        for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
        SFX.noise=buf;
        // 環境音：雨（屋根を叩く）
        const rain=noiseSrc(true),rf=c.createBiquadFilter(),rg=c.createGain();
        rf.type='lowpass';rf.frequency.value=900;rg.gain.value=.05;rain.connect(rf);rf.connect(rg);rg.connect(SFX.out);rain.start();
        // 非常用発電機のうなり
        const o1=c.createOscillator(),o2=c.createOscillator(),hf=c.createBiquadFilter(),hg=c.createGain();
        o1.type='sawtooth';o1.frequency.value=49;o2.type='sine';o2.frequency.value=98.6;hf.type='lowpass';hf.frequency.value=160;hg.gain.value=.03;
        o1.connect(hf);o2.connect(hf);hf.connect(hg);hg.connect(SFX.out);o1.start();o2.start();
        SFX.hum={o1,hg};
        // 影のささやき（帯域ノイズ、近いほど大きい）
        const w=noiseSrc(true),wf=c.createBiquadFilter(),wg=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();
        wf.type='bandpass';wf.frequency.value=1100;wf.Q.value=7;wg.gain.value=0;lfo.frequency.value=3.3;lg.gain.value=500;
        lfo.connect(lg);lg.connect(wf.frequency);w.connect(wf);wf.connect(wg);wg.connect(SFX.out);w.start();lfo.start();
        SFX.whisper=wg;
        // 影が光で焼ける音
        const b=noiseSrc(true),bf=c.createBiquadFilter(),bg=c.createGain();
        bf.type='highpass';bf.frequency.value=2600;bg.gain.value=0;b.connect(bf);bf.connect(bg);bg.connect(SFX.out);b.start();
        SFX.burn=bg;
        SFX.loops.push(rain,o1,o2,w,lfo,b);
      }catch(e){SFX.ctx=null;}
    }
    function noiseSrc(loop){const s=SFX.ctx.createBufferSource();s.buffer=SFX.noise;s.loop=!!loop;if(loop)s.loopStart=Math.random();return s;}
    function sfxTick(dt,ghostNear,burning,tension){
      if(!SFX.ctx)return;
      const v=seVol(),t=SFX.ctx.currentTime;
      try{
        SFX.out.gain.setTargetAtTime(S.disposed?0:v,t,.1);
        SFX.whisper.gain.setTargetAtTime(ghostNear*.09,t,.15);
        SFX.burn.gain.setTargetAtTime(burning?.05:0,t,.05);
        SFX.hum.o1.frequency.setTargetAtTime(tension>=2?54:49,t,.5);
      }catch(e){}
      // 心音（影が出てから、近いほど速く強く）
      if(tension>=1&&v>0){
        SFX.hb-=dt;
        if(SFX.hb<=0){
          const rate=.9+ghostNear*1.6+(tension>=2?.35:0);SFX.hb=1/rate;
          const g=.12+ghostNear*.35;thump(0,g);thump(.16,g*.7);
          if(ghostNear>.45){el.vig.style.transform='scale(1.06)';setTimeout(()=>{if(!S.disposed)el.vig.style.transform='';},120);}
        }
      }
    }
    function env(node,g0,dur,at=0){const c=SFX.ctx,g=c.createGain(),t=c.currentTime+at;g.gain.setValueAtTime(Math.max(.0001,g0),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);node.connect(g);g.connect(SFX.out);return t;}
    function thump(at,g){
      if(!SFX.ctx||seVol()<=0)return;
      try{const c=SFX.ctx,o=c.createOscillator();o.type='sine';const t=c.currentTime+at;o.frequency.setValueAtTime(70,t);o.frequency.exponentialRampToValueAtTime(38,t+.14);env(o,g,.18,at);o.start(t);o.stop(t+.2);}catch(e){}
    }
    function step(){
      if(!SFX.ctx||seVol()<=0)return;
      try{const c=SFX.ctx,n=noiseSrc(false),f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=rnd(350,650);f.Q.value=1.2;n.connect(f);const t=env(f,.22,.11);n.start(t,Math.random());n.stop(t+.13);
        const o=c.createOscillator();o.frequency.value=rnd(70,90);env(o,.08,.07);o.start();o.stop(c.currentTime+.08);}catch(e){}
    }
    function thunder(delay){
      if(!SFX.ctx||seVol()<=0)return;
      try{const c=SFX.ctx,n=noiseSrc(false),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=260;n.connect(f);const t=env(f,.5,2.6,delay);n.start(t,Math.random());n.stop(t+2.7);}catch(e){}
    }
    function plink(g){
      if(!SFX.ctx||seVol()<=0)return;
      try{const c=SFX.ctx,o=c.createOscillator();o.type='sine';const t=c.currentTime;o.frequency.setValueAtTime(1500,t);o.frequency.exponentialRampToValueAtTime(700,t+.08);env(o,g,.12);o.start(t);o.stop(t+.14);}catch(e){}
    }
    function click(){
      if(!SFX.ctx||seVol()<=0)return;
      try{const c=SFX.ctx,o=c.createOscillator();o.type='square';o.frequency.value=1800;env(o,.04,.03);o.start();o.stop(c.currentTime+.04);}catch(e){}
    }
    function sting(){ // 影の出現時の不協和音
      if(!SFX.ctx||seVol()<=0)return;
      try{const c=SFX.ctx;[233,247,330].forEach((f,i)=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;o.connect(lp);env(lp,.05,1.6,i*.03);o.start();o.stop(c.currentTime+1.8);});}catch(e){}
    }
    function sfxStop(){
      SFX.loops.forEach(n=>{try{n.stop();}catch(e){}try{n.disconnect();}catch(e){}});SFX.loops=[];
      if(SFX.out){try{SFX.out.disconnect();}catch(e){}}
      SFX.ctx=null;
    }

    // ── 入力 ──
    const inp={f:0,b:0,l:0,r:0,actKey:false,actBtn:false,jx:0,jy:0,dyaw:0,dpitch:0,buf:0};
    let joyId=null,joyX=0,joyY=0,lookId=null,lookX=0,lookY=0;
    const JR=46,DEAD=.14;
    on(wrap,'pointerdown',e=>{
      if(S.phase!=='play'){
        if(e.target.closest('.factory3d-skip,.factory3d-end button,.factory3d-loadov button'))return;
        if(S.phase!=='load'&&S.phase!=='over')advance();
        return;
      }
      if(e.target.closest('.factory3d-act'))return;
      const rc=wrap.getBoundingClientRect();
      const x=e.clientX-rc.left,y=e.clientY-rc.top;
      if(e.pointerType!=='mouse'&&x<rc.width*.48&&joyId===null){
        joyId=e.pointerId;joyX=e.clientX;joyY=e.clientY;
        el.joy.style.left=x+'px';el.joy.style.top=y+'px';el.joy.classList.add('on');el.knob.style.transform='';
        el.joyhint.style.opacity='0';
      }else if(lookId===null){lookId=e.pointerId;lookX=e.clientX;lookY=e.clientY;}
      try{wrap.setPointerCapture(e.pointerId);}catch(err){}
      e.preventDefault();
    });
    on(wrap,'pointermove',e=>{
      if(e.pointerId===joyId){
        let dx=e.clientX-joyX,dy=e.clientY-joyY;const d=Math.hypot(dx,dy);
        if(d>JR){dx*=JR/d;dy*=JR/d;}
        // デッドゾーン付きで正規化
        const n=Math.min(1,d/JR),k=n<DEAD?0:(n-DEAD)/(1-DEAD)/(n||1);
        inp.jx=dx/JR*k;inp.jy=dy/JR*k;
        el.knob.style.transform=`translate(${dx}px,${dy}px)`;
      }else if(e.pointerId===lookId){
        const sens=e.pointerType==='mouse'?.0042:.0068;
        inp.dyaw-=(e.clientX-lookX)*sens;inp.dpitch-=(e.clientY-lookY)*sens;
        lookX=e.clientX;lookY=e.clientY;
      }
    });
    const ptrEnd=e=>{
      if(e.pointerId===joyId){joyId=null;inp.jx=inp.jy=0;el.joy.classList.remove('on');}
      if(e.pointerId===lookId)lookId=null;
    };
    on(wrap,'pointerup',ptrEnd);on(wrap,'pointercancel',ptrEnd);
    on(wrap,'contextmenu',e=>e.preventDefault());
    const actDown=e=>{if(S.phase!=='play')return;inp.actBtn=true;inp.buf=.3;el.act.classList.add('held');try{el.act.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();e.stopPropagation();};
    const actUp=()=>{inp.actBtn=false;el.act.classList.remove('held');};
    on(el.act,'pointerdown',actDown);on(el.act,'pointerup',actUp);on(el.act,'pointercancel',actUp);on(el.act,'lostpointercapture',actUp);
    on(el.skip,'pointerdown',e=>{e.stopPropagation();advance(true);});
    mg.onKey(e=>{
      const dn=e.type==='keydown';const k=(e.key||'').toLowerCase();
      if(k==='w'||k==='arrowup')inp.f=dn?1:0;
      else if(k==='s'||k==='arrowdown')inp.b=dn?1:0;
      else if(k==='a'||k==='arrowleft')inp.l=dn?1:0;
      else if(k==='d'||k==='arrowright')inp.r=dn?1:0;
      else if(k==='e'||k===' '||k==='enter'){if(dn&&!inp.actKey)inp.buf=.3;inp.actKey=dn;}
      else if(k==='escape'&&dn&&S.phase==='story'){advance(true);}
      else return;
      e.preventDefault();
      if(dn&&!e.repeat&&S.phase!=='play'&&S.phase!=='load'&&S.phase!=='over'&&(k==='e'||k===' '||k==='enter'))advance();
    });
    on(window,'blur',()=>{inp.f=inp.b=inp.l=inp.r=0;inp.actKey=inp.actBtn=false;});

    // ── 後片付け（WebGLコンテキストと音を確実に解放する） ──
    function cleanup(){
      if(S.disposed)return;
      S.disposed=true;
      sfxStop();
      offs.forEach(f=>{try{f();}catch(e){}});offs.length=0;
      if(ro){try{ro.disconnect();}catch(e){}ro=null;}
      if(G){
        const {scene,renderer,texs}=G;
        const geos=new Set(),mats=new Set();
        scene.traverse(o=>{
          if(o.geometry)geos.add(o.geometry);
          if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));
          if(o.isInstancedMesh&&o.dispose)try{o.dispose();}catch(e){}
          if(o.isLight&&o.shadow&&o.shadow.map){o.shadow.map.dispose();o.shadow.map=null;}
        });
        G.extraGeos.forEach(g=>geos.add(g));G.extraMats.forEach(m=>mats.add(m));
        geos.forEach(g=>{try{g.dispose();}catch(e){}});
        mats.forEach(m=>{try{m.dispose();}catch(e){}});
        texs.forEach(t=>{try{t.dispose();}catch(e){}});
        scene.clear();
        try{renderer.renderLists.dispose();}catch(e){}
        try{renderer.dispose();renderer.forceContextLoss();}catch(e){}
        const cv=renderer.domElement;if(cv&&cv.parentNode)cv.parentNode.removeChild(cv);
        G=null;
      }
      try{if(window.__f3d)delete window.__f3d;}catch(e){}
      wrap.classList.remove('factory3d-hit');
    }

    if(typeof mg.onEnd==='function')mg.onEnd(cleanup);

    function showError(msg){
      el.load.classList.remove('hide');
      el.load.innerHTML=`<div style="color:var(--rd);font-size:.8rem">3D表示を開始できませんでした</div>`+
        `<div style="font-size:.6rem;color:var(--tx-d);max-width:260px">${String(msg||'').replace(/[<>&]/g,'')}</div><button type="button">戻る</button>`;
      el.load.querySelector('button').onclick=()=>mg.end('quit');
    }

    loadThree().then(THREE=>{
      if(mg._ended||S.disposed)return;
      try{build(THREE);}
      catch(e){
        console.error(e);
        // 作りかけのレンダラーを解放してからエラー表示（終了ボタンで戻れる）
        try{if(G){G.renderer.dispose();G.renderer.forceContextLoss();G.renderer.domElement.remove();}}catch(err){}
        G=null;S.phase='load';showError(e.message);
      }
    }).catch(e=>{if(!mg._ended&&!S.disposed)showError(e&&e.message);});

    // ══════════════════════════════════════════════════════
    // シーン構築
    // ══════════════════════════════════════════════════════
    function build(THREE){
      const dpr=Math.min(window.devicePixelRatio||1,1.5);
      const renderer=new THREE.WebGLRenderer({antialias:dpr<1.3,powerPreference:'high-performance',alpha:false});
      renderer.setPixelRatio(dpr);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.2;
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFShadowMap;
      renderer.setClearColor(0x05040e,1);
      wrap.insertBefore(renderer.domElement,wrap.firstChild);
      renderer.domElement.addEventListener('webglcontextlost',e=>e.preventDefault());

      const scene=new THREE.Scene();
      const FOG=new THREE.Color(0x06050f);
      scene.fog=new THREE.FogExp2(FOG,.052);
      scene.background=FOG;
      const camera=new THREE.PerspectiveCamera(72,1,.08,60);
      camera.rotation.order='YXZ';
      scene.add(camera);
      const texs=[],extraGeos=[],extraMats=[];
      G={THREE,renderer,scene,camera,texs,extraGeos,extraMats};

      const maxAniso=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      function ctex(w,h,draw,o={}){
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const g=c.getContext('2d');draw(g,w,h);
        const t=new THREE.CanvasTexture(c);
        t.colorSpace=o.linear?THREE.NoColorSpace:THREE.SRGBColorSpace;
        if(o.repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(o.repeat[0],o.repeat[1]);}
        t.anisotropy=maxAniso;texs.push(t);return t;
      }
      const noise=(g,w,h,n,a,col)=>{for(let i=0;i<n;i++){g.fillStyle=col||`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},${Math.random()<.5?0:255},${a*Math.random()})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}};

      // ── テクスチャ（すべて手続き生成） ──
      const T={};
      T.floor=ctex(256,256,(g,w,h)=>{
        g.fillStyle='#86828c';g.fillRect(0,0,w,h);
        for(let i=0;i<2600;i++){const v=105+Math.random()*60|0;g.fillStyle=`rgba(${v},${v-4},${v+6},.5)`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}
        for(let i=0;i<7;i++){const x=Math.random()*w,y=Math.random()*h,r=10+Math.random()*40;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(20,16,26,.5)');gr.addColorStop(1,'rgba(20,16,26,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}
        g.strokeStyle='rgba(18,14,22,.8)';g.lineWidth=2;g.strokeRect(0,0,w,h);
        g.strokeStyle='rgba(15,12,20,.55)';g.lineWidth=1;
        for(let i=0;i<3;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let j=0;j<6;j++){x+=rnd(-22,22);y+=rnd(-22,22);g.lineTo(x,y);}g.stroke();}
        g.fillStyle='rgba(200,170,40,.35)';g.fillRect(0,124,256,6);
      },{repeat:[COLS,ROWS]});
      T.floorSpec=ctex(256,256,(g,w,h)=>{
        g.fillStyle='#202020';g.fillRect(0,0,w,h);
        for(let i=0;i<5;i++){const x=Math.random()*w,y=Math.random()*h,r=18+Math.random()*44;g.fillStyle='#e8e8e8';g.beginPath();g.ellipse(x,y,r,r*rnd(.4,.8),Math.random()*3,0,7);g.fill();}
        noise(g,w,h,900,.4,'rgba(140,140,140,.35)');
      },{repeat:[COLS,ROWS],linear:true});
      T.wall=ctex(256,256,(g,w,h)=>{
        g.fillStyle='#5c6474';g.fillRect(0,0,w,h);
        for(let x=0;x<w;x+=16){g.fillStyle=x%32?'rgba(255,255,255,.05)':'rgba(0,0,0,.18)';g.fillRect(x,0,8,h);}
        for(let i=0;i<14;i++){const x=Math.random()*w,l=40+Math.random()*160;const gr=g.createLinearGradient(0,0,0,l);gr.addColorStop(0,'rgba(110,60,30,.45)');gr.addColorStop(1,'rgba(110,60,30,0)');g.fillStyle=gr;g.fillRect(x,Math.random()*60,3+Math.random()*6,l);}
        g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,w,3);g.fillRect(0,128,w,2);
        noise(g,w,h,1400,.12);
      },{repeat:[8,2]});
      T.mach=ctex(256,256,(g,w,h)=>{
        g.fillStyle='#a8b0ac';g.fillRect(0,0,w,h);
        const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,.18)');gr.addColorStop(.7,'rgba(0,0,0,.1)');gr.addColorStop(1,'rgba(20,10,0,.55)');g.fillStyle=gr;g.fillRect(0,0,w,h);
        g.strokeStyle='rgba(10,10,14,.95)';g.lineWidth=3;
        [[6,6,120,150],[132,6,118,90],[132,100,118,56],[6,162,244,88]].forEach(r=>{g.strokeRect(...r);g.fillStyle='rgba(30,30,30,.7)';[[r[0]+5,r[1]+5],[r[0]+r[2]-5,r[1]+5],[r[0]+5,r[1]+r[3]-5],[r[0]+r[2]-5,r[1]+r[3]-5]].forEach(p=>{g.beginPath();g.arc(p[0],p[1],2,0,7);g.fill();});});
        g.fillStyle='rgba(15,16,20,.85)';for(let i=0;i<9;i++)g.fillRect(20,176+i*8,110,4);
        g.fillStyle='#d8b020';g.fillRect(150,20,80,40);g.fillStyle='#111';
        for(let i=-4;i<10;i++){g.beginPath();g.moveTo(150+i*12,60);g.lineTo(162+i*12,20);g.lineTo(168+i*12,20);g.lineTo(156+i*12,60);g.fill();}
        g.save();g.beginPath();g.rect(150,20,80,40);g.restore();
        g.fillStyle='#d8d0b0';g.fillRect(152,110,70,22);g.fillStyle='#222';g.font='bold 14px monospace';g.fillText('No.3-'+(10+Math.random()*80|0),156,126);
        g.fillStyle='#202428';g.fillRect(30,40,60,70);g.fillStyle='#601010';g.beginPath();g.arc(60,75,14,0,7);g.fill();g.fillStyle='#c02020';g.beginPath();g.arc(60,75,10,0,7);g.fill();
        for(let i=0;i<10;i++){const x=Math.random()*w,l=30+Math.random()*90;const r=g.createLinearGradient(0,0,0,l);r.addColorStop(0,'rgba(100,55,25,.5)');r.addColorStop(1,'rgba(100,55,25,0)');g.fillStyle=r;g.fillRect(x,Math.random()*h,2+Math.random()*4,l);}
        g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;for(let i=0;i<40;i++){const x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+rnd(-12,12),y+rnd(-4,4));g.stroke();}
        noise(g,w,h,1600,.15);
      });
      T.metal=ctex(128,128,(g,w,h)=>{
        g.fillStyle='#5a5e66';g.fillRect(0,0,w,h);
        for(let y=0;y<h;y+=2){g.fillStyle=`rgba(255,255,255,${Math.random()*.06})`;g.fillRect(0,y,w,1);}
        for(let i=0;i<6;i++){g.fillStyle='rgba(110,60,30,.3)';g.fillRect(Math.random()*w,Math.random()*h,6+Math.random()*20,3+Math.random()*12);}
        noise(g,w,h,600,.15);
      });
      T.stripe=ctex(64,64,(g,w,h)=>{
        g.fillStyle='#d8a818';g.fillRect(0,0,w,h);g.fillStyle='#141210';
        for(let i=-2;i<3;i++){g.beginPath();g.moveTo(i*32,h);g.lineTo(i*32+16,h);g.lineTo(i*32+16+h,0);g.lineTo(i*32+h,0);g.fill();}
        noise(g,w,h,250,.35,'rgba(30,25,20,.5)');
      },{repeat:[1,1]});
      T.belt=ctex(64,128,(g,w,h)=>{
        g.fillStyle='#1c1c20';g.fillRect(0,0,w,h);
        for(let y=0;y<h;y+=8){g.fillStyle='#2c2c32';g.fillRect(0,y,w,3);}
        g.fillStyle='#55555c';g.fillRect(0,0,4,h);g.fillRect(w-4,0,4,h);
      });
      T.box=ctex(64,64,(g,w,h)=>{
        g.fillStyle='#8a6a3e';g.fillRect(0,0,w,h);g.fillStyle='#a8844e';g.fillRect(0,28,w,8);
        g.strokeStyle='rgba(40,25,10,.6)';g.strokeRect(1,1,w-2,h-2);g.fillStyle='rgba(30,20,10,.7)';g.font='9px monospace';g.fillText('FRAGILE',6,14);
        noise(g,w,h,200,.15);
      });
      T.glow=ctex(64,64,(g,w,h)=>{
        const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
      });
      T.dot=ctex(32,32,(g)=>{const gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);});
      T.beam=ctex(8,128,(g,w,h)=>{
        const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
      },{linear:true});
      T.cookie=ctex(128,128,(g,w,h)=>{
        g.fillStyle='#000';g.fillRect(0,0,w,h);
        const gr=g.createRadialGradient(64,64,0,64,64,62);
        gr.addColorStop(0,'#fff');gr.addColorStop(.5,'#f4f0e8');gr.addColorStop(.64,'#ffffff');gr.addColorStop(.74,'#a8a294');gr.addColorStop(.93,'#2a2824');gr.addColorStop(1,'#000');
        g.fillStyle=gr;g.fillRect(0,0,w,h);
        for(let i=0;i<8;i++){g.fillStyle=`rgba(0,0,0,${.03+Math.random()*.06})`;g.beginPath();g.arc(30+Math.random()*68,30+Math.random()*68,4+Math.random()*12,0,7);g.fill();}
      });
      T.rain=ctex(128,256,(g,w,h)=>{
        const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1a2448');gr.addColorStop(1,'#0c1024');g.fillStyle=gr;g.fillRect(0,0,w,h);
        for(let i=0;i<160;i++){const x=Math.random()*w,y=Math.random()*h,l=6+Math.random()*26;g.strokeStyle=`rgba(170,195,255,${.12+Math.random()*.35})`;g.lineWidth=Math.random()<.2?1.5:.8;g.beginPath();g.moveTo(x,y);g.lineTo(x-1,y+l);g.stroke();}
        for(let i=0;i<40;i++){g.fillStyle=`rgba(200,215,255,${.25+Math.random()*.4})`;g.beginPath();g.arc(Math.random()*w,Math.random()*h,.8+Math.random()*1.6,0,7);g.fill();}
      },{repeat:[1,1]});
      T.exit=ctex(256,96,(g,w,h)=>{
        g.fillStyle='#0a8a3c';g.fillRect(0,0,w,h);g.fillStyle='#e8fff0';g.fillRect(6,6,84,84);
        g.fillStyle='#0a8a3c';
        // 走る人のピクトグラム
        g.beginPath();g.arc(52,22,8,0,7);g.fill();
        g.lineWidth=9;g.lineCap='round';g.strokeStyle='#0a8a3c';
        g.beginPath();g.moveTo(46,34);g.lineTo(38,56);g.stroke();
        g.beginPath();g.moveTo(38,56);g.lineTo(56,70);g.lineTo(54,84);g.stroke();
        g.beginPath();g.moveTo(38,56);g.lineTo(26,72);g.lineTo(14,72);g.stroke();
        g.beginPath();g.moveTo(44,40);g.lineTo(62,46);g.stroke();
        g.beginPath();g.moveTo(44,40);g.lineTo(28,44);g.stroke();
        g.fillStyle='#e8fff0';g.font='bold 34px "DotGothic16",sans-serif';g.textBaseline='middle';g.fillText('非常口',100,38);
        g.font='bold 20px monospace';g.fillText('EXIT ▶',112,72);
      });
      T.marker=ctex(64,64,(g)=>{
        g.translate(32,32);g.rotate(Math.PI/4);g.fillStyle='rgba(232,184,48,.95)';g.fillRect(-15,-15,30,30);g.strokeStyle='#fff6c8';g.lineWidth=2;g.strokeRect(-15,-15,30,30);
        g.rotate(-Math.PI/4);g.fillStyle='#1a1204';g.font='bold 26px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText('!',0,2);
      });
      T.tick=ctex(256,64,(g,w,h)=>{
        g.fillStyle='rgba(4,20,10,.75)';g.fillRect(0,8,w,48);g.strokeStyle='#44ee88';g.lineWidth=2;g.strokeRect(1,9,w-2,46);
        g.fillStyle='#b8ffd2';g.font='28px "DotGothic16",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('✔ 点検完了',w/2,33);
      });
      T.banner=ctex(512,96,(g,w,h)=>{
        g.fillStyle='rgba(0,0,0,0)';g.clearRect(0,0,w,h);
        g.fillStyle='rgba(220,210,190,.85)';g.font='bold 76px "DotGothic16",sans-serif';g.textBaseline='middle';g.textAlign='center';g.fillText('第 三 工 場',w/2,50);
        g.globalCompositeOperation='destination-out';for(let i=0;i<500;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.8})`;g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*5,1+Math.random()*3);}
      });
      T.safety=ctex(512,128,(g,w,h)=>{
        g.fillStyle='#1c6a38';g.fillRect(0,0,w,h);g.strokeStyle='#e8e8d0';g.lineWidth=6;g.strokeRect(8,8,w-16,h-16);
        g.fillStyle='#f0f0e0';g.font='bold 64px "DotGothic16",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('安全第一',w/2,66);
        g.fillStyle='rgba(60,30,10,.35)';for(let i=0;i<8;i++)g.fillRect(Math.random()*w,0,4+Math.random()*10,h);
      });

      // ── マテリアル ──
      const M={
        floor:new THREE.MeshPhongMaterial({map:T.floor,specularMap:T.floorSpec,specular:0x8890a0,shininess:70}),
        wall:new THREE.MeshPhongMaterial({map:T.wall,shininess:10,specular:0x222222}),
        mach:new THREE.MeshPhongMaterial({map:T.mach,shininess:45,specular:0x666666}),
        metal:new THREE.MeshPhongMaterial({map:T.metal,shininess:55,specular:0x666666}),
        dark:new THREE.MeshPhongMaterial({color:0x24262c,shininess:30,specular:0x333333}),
        pipe:new THREE.MeshPhongMaterial({map:T.metal,color:0x8a8070,shininess:60,specular:0x777777}),
        stripe:new THREE.MeshPhongMaterial({map:T.stripe,shininess:20,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
        belt:new THREE.MeshPhongMaterial({map:T.belt,shininess:15}),
        box:new THREE.MeshLambertMaterial({map:T.box}),
        ceil:new THREE.MeshLambertMaterial({color:0x0c0c14}),
        rail:new THREE.MeshPhongMaterial({color:0xc89a20,shininess:40}),
        led:new THREE.MeshBasicMaterial({color:0xffffff}),
        glass:new THREE.MeshBasicMaterial({map:T.rain,color:0x5868a0,fog:false}),
        shaft:new THREE.MeshBasicMaterial({map:T.beam,color:0x6a7cc8,transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}),
        exitSign:new THREE.MeshBasicMaterial({map:T.exit,fog:false}),
        emerg:new THREE.MeshBasicMaterial({color:0xd8ffe8,fog:false}),
        tube:new THREE.MeshBasicMaterial({color:0xdde8ff}),
        lampOff:new THREE.MeshBasicMaterial({color:0x14141c}),
        decal:new THREE.MeshLambertMaterial({map:null,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}),
        banner:new THREE.MeshLambertMaterial({map:T.banner,transparent:true,depthWrite:false}),
        safety:new THREE.MeshLambertMaterial({map:T.safety}),
      };
      M.floor.color.setHex(0xe8e4f0);

      // ── インスタンス部品の収集 ──
      const WALL_H=11;
      const parts={};
      const lampSpots=[];
      const dummy=new THREE.Object3D();
      function part(key,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,color=null){(parts[key]=parts[key]||[]).push([x,y,z,sx,sy,sz,rx,ry,rz,color]);}
      const geoBox=new THREE.BoxGeometry(1,1,1);
      const geoCyl=new THREE.CylinderGeometry(1,1,1,12);
      const geoCylLo=new THREE.CylinderGeometry(1,1,1,8,1,true);
      const geoTank=new THREE.CylinderGeometry(1,1,1,20);
      const geoDome=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2);
      const geoCone=new THREE.ConeGeometry(1,1,10,1,true);
      extraGeos.push(geoBox,geoCyl,geoCylLo,geoTank,geoDome,geoCone);
      const PARTDEF={
        machBody:[geoBox,M.mach,true,true],
        trim:[geoBox,M.dark,true,true],
        motor:[geoCyl,M.metal,true,true],
        fly:[geoCyl,M.dark,true,false],
        lamp:[geoBox,M.lampOff,false,false],
        metalBox:[geoBox,M.metal,true,true],
        pipe:[geoCylLo,M.pipe,true,false],
        tank:[geoTank,M.metal,true,true],
        dome:[geoDome,M.metal,true,true],
        ring:[geoCyl,M.dark,false,false],
        belt:[geoBox,M.belt,false,true],
        cargo:[geoBox,M.box,true,true],
        rail:[geoBox,M.rail,false,false],
        led:[geoBox,M.led,false,false],
        beam:[geoBox,M.dark,false,false],
        shade:[geoCone,M.dark,false,false],
        emerg:[geoBox,M.emerg,false,false],
        pillar:[geoBox,M.wall,false,true],
        frame:[geoBox,M.dark,false,false],
      };
      function flushParts(){
        const col=new THREE.Color();
        for(const key in parts){
          const list=parts[key],[geo,mat,cast,recv]=PARTDEF[key];
          const im=new THREE.InstancedMesh(geo,mat,list.length);
          list.forEach((p,i)=>{
            dummy.position.set(p[0],p[1],p[2]);dummy.scale.set(p[3],p[4],p[5]);dummy.rotation.set(p[6],p[7],p[8]);dummy.updateMatrix();
            im.setMatrixAt(i,dummy.matrix);
            if(p[9]!=null){col.set(p[9]);im.setColorAt(i,col);}else if(im.instanceColor||list.some(q=>q[9]!=null)){col.set(0xffffff);im.setColorAt(i,col);}
          });
          if(im.instanceColor)im.instanceColor.needsUpdate=true;
          im.castShadow=cast;im.receiveShadow=recv;im.frustumCulled=false;
          scene.add(im);
        }
      }

      // ── ストライプ（危険表示）の床ストリップ：UVを長さに合わせて1つのジオメトリにまとめる ──
      const sp=[],su=[],si=[];
      function strip(x0,z0,x1,z1,wd,y=.012){
        const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz),nx=-dz/len*wd/2,nz=dx/len*wd/2,b=sp.length/3;
        sp.push(x0+nx,y,z0+nz, x0-nx,y,z0-nz, x1+nx,y,z1+nz, x1-nx,y,z1-nz);
        const u=len/wd;su.push(0,1,0,0,u,1,u,0);
        si.push(b,b+1,b+2,b+2,b+1,b+3);
      }
      function stripRect(x0,z0,x1,z1,wd=.32){const h=wd/2;strip(x0-h,z0,x1+h,z0,wd);strip(x0-h,z1,x1+h,z1,wd);strip(x0,z0+h,x0,z1-h,wd);strip(x1,z0+h,x1,z1-h,wd);}

      // ── レイアウト生成 ──
      let tpl=pick(TEMPLATES).slice();
      const mirror=Math.random()<.5;
      if(mirror)tpl=tpl.map(r=>r.split('').reverse().join(''));
      const grid=tpl.map(r=>r.split(''));
      const cx=c=>-HW+CELL*(c+.5), cz=r=>-HD+CELL*(r+.5);
      const inb=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
      const isFree=(r,c)=>inb(r,c)&&(grid[r][c]==='.'||grid[r][c]==='S');
      const isSolid=(r,c)=>inb(r,c)&&(grid[r][c]==='M'||grid[r][c]==='T');
      const cols=[];          // 当たり判定 {x0,x1,z0,z1,h}
      const addCol=(x,z,w,d,h)=>cols.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,h});
      const machTints=[0x6fb0a8,0xb8b070,0x7890c8,0xc89a60,0x60a890,0xb0b4c0,0xc87060];
      const sparkSpots=[];

      // 機械：横に連続するMを1台の長い機械にまとめる
      for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
          if(grid[r][c]!=='M'||(c>0&&grid[r][c-1]==='M'))continue;
          let n=1;while(c+n<COLS&&grid[r][c+n]==='M')n++;
          const x=(cx(c)+cx(c+n-1))/2,z=cz(r),w=n*CELL-.8,d=3.1,h=rnd(1.8,3.2);
          const tint=pick(machTints);
          part('trim',x,.12,z,w+.1,.24,d+.1);
          part('machBody',x,.24+h/2,z,w,h,d,0,0,0,tint);
          addCol(x,z,w+.1,d+.1,h+.24);
          stripRect(x-w/2-.45,z-d/2-.45,x+w/2+.45,z+d/2+.45);
          // 上部のハウジングと細部
          const segs=n;
          for(let s=0;s<segs;s++){
            const sx=cx(c+s);
            if(Math.random()<.7){const hh=rnd(.5,1.3),hw=rnd(1.4,2.6);part('metalBox',sx+rnd(-.4,.4),.24+h+hh/2,z+rnd(-.4,.4),hw,hh,rnd(1.2,2.2),0,0,0,tint);}
            if(Math.random()<.55){const ph=rnd(1.5,4);part('pipe',sx+rnd(-1,1),.24+h+ph/2,z+rnd(-.9,.9),.16,ph,.16);}
            if(Math.random()<.3){const dh=WALL_H-1-(.24+h);part('metalBox',sx+rnd(-.6,.6),.24+h+dh/2,z,.7,dh,.7);}
            // 側面のモーターとフライホイール
            if(Math.random()<.6){const ms=Math.random()<.5?1:-1,my=rnd(.5,.9),mz=z+ms*(d/2+.38);
              part('motor',sx+rnd(-.5,.5),my,mz,.36,1.1,.36,0,0,Math.PI/2,0x40506a);
              part('fly',sx+.75,my,mz,.5,.08,.5,0,0,Math.PI/2);
              part('trim',sx,.3,mz,1.3,.6,.6);}
            if(Math.random()<.4)part('rail',sx,h*.5,z+(Math.random()<.5?1:-1)*(d/2+.03),rnd(.8,2.4),.12,.02);
            // 操作盤とLED
            const side=Math.random()<.5?1:-1;
            part('trim',sx+rnd(-.8,.8),1.2,z+side*(d/2+.12),.8,.9,.24);
            for(let k=0;k<3;k++)part('led',sx+rnd(-1.2,1.2),rnd(.8,h),z+side*(d/2+.02),.1,.1,.03,0,0,0,pick([0xff2030,0xff2030,0x30ff70,0xffb020]));
            if(Math.random()<.25)sparkSpots.push(new THREE.Vector3(sx+rnd(-1,1),.24+h+.05,z+side*d/2));
          }
        }
      }
      // タンク
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        if(grid[r][c]!=='T')continue;
        const x=cx(c),z=cz(r),h=rnd(4,6.2),R=1.45;
        part('trim',x,.15,z,3.4,.3,3.4);
        part('tank',x,.3+h/2,z,R,h,R);
        part('dome',x,.3+h,z,R,.55,R);
        for(let k=1;k<=3;k++)part('ring',x,.3+h*k/4,z,R+.05,.1,R+.05);
        part('pipe',x+R*.7,.3+h+1.2,z,.14,2.6,.14);
        part('pipe',x,h*.4,z+R+.15,.09,h*.8,.09);
        addCol(x,z,3.2,3.2,h);
        stripRect(x-1.95,z-1.95,x+1.95,z+1.95);
      }
      // コンベア
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        if(grid[r][c]!=='C')continue;
        const horiz=(c>0&&grid[r][c-1]==='C')||(c<COLS-1&&grid[r][c+1]==='C');
        const x=cx(c),z=cz(r),L=CELL,Wd=1.4;
        const sx=horiz?L:Wd,sz=horiz?Wd:L;
        part('frame',x,.62,z,sx,.2,sz);
        part('belt',x,.74,z,horiz?L:Wd-.2,.05,horiz?Wd-.2:L,0,horiz?Math.PI/2:0,0);
        part('rail',x+(horiz?0:Wd/2),.86,z+(horiz?Wd/2:0),horiz?L:.06,.18,horiz?.06:L);
        part('rail',x-(horiz?0:Wd/2),.86,z-(horiz?Wd/2:0),horiz?L:.06,.18,horiz?.06:L);
        for(const a of [-1.6,0,1.6])for(const b of [-.6,.6])part('frame',x+(horiz?a:b),.28,z+(horiz?b:a),.08,.56,.08);
        const nb=(Math.random()*3)|0;
        for(let k=0;k<nb;k++){const s=rnd(.45,.8),o=rnd(-1.4,1.4);part('cargo',x+(horiz?o:rnd(-.15,.15)),.77+s/2,z+(horiz?rnd(-.15,.15):o),s,s*rnd(.7,1),s,0,rnd(-.3,.3),0);}
        addCol(x,z,horiz?L:Wd+.1,horiz?Wd+.1:L,1);
      }

      // ── 床・壁・天井 ──
      const floorGeo=new THREE.PlaneGeometry(HW*2,HD*2);
      const floor=new THREE.Mesh(floorGeo,M.floor);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
      [[0,-HD-.5,HW*2+2,1],[0,HD+.5,HW*2+2,1],[-HW-.5,0,1,HD*2],[HW+.5,0,1,HD*2]].forEach(([x,z,w,d],i)=>{
        const g=new THREE.BoxGeometry(w,WALL_H,d);
        const m=new THREE.Mesh(g,M.wall);m.position.set(x,WALL_H/2,z);m.receiveShadow=true;scene.add(m);
      });
      const ceil=new THREE.Mesh(new THREE.PlaneGeometry(HW*2,HD*2),M.ceil);ceil.rotation.x=Math.PI/2;ceil.position.y=WALL_H;scene.add(ceil);
      // 壁の柱
      for(let z=-HD+6;z<HD;z+=8){part('pillar',-HW+.25,WALL_H/2,z,.7,WALL_H,.9);part('pillar',HW-.25,WALL_H/2,z,.7,WALL_H,.9);}
      // 天井トラスとランプシェード（停電で消えている）
      for(let z=-HD+4;z<HD;z+=6){
        part('beam',0,WALL_H-.9,z,HW*2,.35,.25);
        part('beam',0,WALL_H-.25,z,HW*2,.12,.12);
        for(let x=-HW+4;x<HW;x+=4)part('beam',x,WALL_H-.57,z,.08,.7,.08,0,0,(x/4)%2?.6:-.6);
        for(const x of [-10,0,10]){part('pipe',x,WALL_H-1.9,z,.02,2,.02);part('shade',x,WALL_H-3,z,.45,.3,.45);part('lamp',x,WALL_H-3.17,z,.5,.05,.5);lampSpots.push([x,z]);}
      }
      // 壁沿いの配管
      for(const sx of [-1,1]){
        const x=sx*(HW-.45);
        for(const [y,r] of [[3.1,.16],[3.55,.12],[6.4,.22]])part('pipe',x,y,0,r,HD*2,r,Math.PI/2,0,0);
        for(let z=-HD+10;z<HD;z+=12)part('pipe',x,1.6,z,.1,3.2,.1);
      }
      for(const z of [-18,6,22])part('pipe',0,8.6,z,.2,HW*2,.2,0,0,Math.PI/2);
      // キャットウォーク（東側の壁沿い、高さ4.2m）
      const cwx=HW-1.9;
      part('frame',HW-.95,4.2,0,1.9,.08,HD*2-1);
      part('rail',cwx,5.25,0,.06,.06,HD*2-1);part('rail',cwx,4.75,0,.04,.04,HD*2-1);
      for(let z=-HD+1;z<HD;z+=2){part('rail',cwx,4.72,z,.06,1.05,.06);part('frame',HW-.9,3.7,z,.06,.06,1.6,0,0,0);}
      for(let z=-HD+3;z<HD;z+=6)part('frame',HW-.8,3.6,z,.08,1.4,.08,0,0,.85);
      strip(cwx+.08,-HD+.5,cwx+.08,HD-.5,.18,4.25);
      // 非常灯（白緑の小さな表示灯）
      const emergPos=[];
      for(let z=-HD+8;z<HD-4;z+=13){emergPos.push([-HW+.06,2.5,z,'x']);emergPos.push([HW-.06,2.5,z+6,'x']);}
      const emSignGeo=new THREE.PlaneGeometry(.9,.34);extraGeos.push(emSignGeo);
      const emGlowMat=new THREE.SpriteMaterial({map:T.glow,color:0x30ff80,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.45});
      emergPos.forEach(p=>{
        const m=new THREE.Mesh(emSignGeo,M.exitSign);m.position.set(p[0]+(p[0]<0?.03:-.03),p[1],p[2]);m.rotation.y=p[0]<0?Math.PI/2:-Math.PI/2;scene.add(m);
        const gl=new THREE.Sprite(emGlowMat);gl.scale.set(1.8,.9,1);gl.position.set(p[0]+(p[0]<0?.25:-.25),p[1],p[2]);scene.add(gl);
      });

      // ── 高窓と雨 ──
      const winGeo=new THREE.PlaneGeometry(4.2,2.6);extraGeos.push(winGeo);
      const shaftGeo=new THREE.PlaneGeometry(3.6,9);shaftGeo.translate(0,-4.5,0);extraGeos.push(shaftGeo);
      const shafts=[];
      for(const sx of [-1,1]){
        for(let z=-HD+5;z<HD-2;z+=7){
          const w=new THREE.Mesh(winGeo,M.glass);w.position.set(sx*(HW-.02),7.7,z);w.rotation.y=-sx*Math.PI/2;scene.add(w);
          part('frame',sx*(HW-.05),7.7,z,.1,2.6,.1);part('frame',sx*(HW-.05),7.7,z,.1,.08,4.2);
          part('frame',sx*(HW-.05),6.4,z,.3,.12,4.4);part('frame',sx*(HW-.05),9,z,.12,.12,4.4);
          if(Math.random()<.6){
            const s=new THREE.Mesh(shaftGeo,M.shaft);s.position.set(sx*(HW-.1),8.6,z);s.rotation.set(0,-sx*Math.PI/2,0);
            s.rotateX(-.55);scene.add(s);shafts.push(s);
          }
        }
      }
      // 壁の文字
      {const g=new THREE.PlaneGeometry(9,1.7);const m=new THREE.Mesh(g,M.banner);m.position.set(-HW+.08,5.3,mirror?6:-6);m.rotation.y=Math.PI/2;scene.add(m);}
      {const g=new THREE.PlaneGeometry(4,1);const m=new THREE.Mesh(g,M.safety);m.position.set(0,5.4,HD-.02);m.rotation.y=Math.PI;scene.add(m);}

      // ── 蛍光灯（ちらつく、光源なし） ──
      const tubes=[];
      for(let i=0;i<2;i++){
        const g=new THREE.BoxGeometry(1.4,.06,.08);const mat=new THREE.MeshBasicMaterial({color:0xdde8ff});
        const m=new THREE.Mesh(g,mat);m.position.set(rnd(-12,12),WALL_H-3.25,-HD+4+6*((2+Math.random()*7)|0));scene.add(m);
        const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0x9fb8ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.5}));
        gl.scale.set(3.2,1.4,1);gl.position.copy(m.position);scene.add(gl);
        tubes.push({mat,gl,t:Math.random()*5});
      }

      // ── 非常口 ──
      const exitCol=pick([0,1,COLS-2,COLS-1]);
      const exitX=cx(exitCol),exitZ=-HD;
      const door=new THREE.Group();door.position.set(exitX,0,exitZ);scene.add(door);
      {
        const fr=new THREE.MeshPhongMaterial({color:0x3a3e46,shininess:40});
        const add=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=true;door.add(o);return o;};
        add(new THREE.BoxGeometry(.18,2.5,.3),fr,-.95,1.25,.12);add(new THREE.BoxGeometry(.18,2.5,.3),fr,.95,1.25,.12);add(new THREE.BoxGeometry(2.08,.18,.3),fr,0,2.5,.12);
        const slab=add(new THREE.BoxGeometry(1.72,2.4,.08),new THREE.MeshPhongMaterial({map:T.metal,color:0x6a8a78,shininess:50}),0,1.2,.05);
        add(new THREE.BoxGeometry(1.2,.07,.07),M.dark,0,1.05,.14);
        add(new THREE.BoxGeometry(2.2,.6,.1),M.exitSign,0,2.95,.1).material=M.exitSign;
        door.userData.slab=slab;
      }
      const exitLamp=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:0xff2030,fog:false}));
      exitLamp.position.set(exitX+.75,1.9,exitZ+.2);scene.add(exitLamp);
      const exitGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0x30ff80,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.7}));
      exitGlow.scale.set(4.2,2,1);exitGlow.position.set(exitX,2.95,exitZ+.3);scene.add(exitGlow);
      const exitLight=new THREE.PointLight(0x30ff80,2,10,1.6);exitLight.position.set(exitX,2.6,exitZ+1.2);scene.add(exitLight);

      // ── 非常回転灯（赤） ──
      const beaconPos=[[-HW+.35,5.2,mirror?-10:-14],[HW-.35,5.6,mirror?12:6],[-HW+.35,5.2,18],[exitCol<5?8:-8,5.4,-HD+.35]];
      const beacons=[];
      const beamGeo=new THREE.ConeGeometry(1.25,7,16,1,true);beamGeo.translate(0,-3.5,0);beamGeo.rotateX(-Math.PI/2);extraGeos.push(beamGeo);
      const beamMat=new THREE.MeshBasicMaterial({map:T.beam,color:0xff1830,transparent:true,opacity:.07,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
      const redGlowMat=new THREE.SpriteMaterial({map:T.glow,color:0xff2038,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.9});
      const domeMat=new THREE.MeshBasicMaterial({color:0xff3040});
      beaconPos.forEach((p,i)=>{
        const g=new THREE.Group();g.position.set(p[0],p[1],p[2]);scene.add(g);
        const dome=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),domeMat);g.add(dome);
        const base=new THREE.Mesh(new THREE.CylinderGeometry(.2,.22,.12,12),M.dark);base.position.y=-.16;g.add(base);
        const rot=new THREE.Group();g.add(rot);
        const b1=new THREE.Mesh(beamGeo,beamMat);b1.rotation.x=.18;rot.add(b1);
        const b2=new THREE.Mesh(beamGeo,beamMat);b2.rotation.set(.18,Math.PI,0);rot.add(b2);
        const gl=new THREE.Sprite(redGlowMat);gl.scale.set(1.6,1.6,1);g.add(gl);
        let light=null;
        if(i<3){light=new THREE.PointLight(0xff1830,4,14,1.6);const inward=p[0]<-HW+1?1:p[0]>HW-1?-1:0;light.position.set(p[0]+inward*1.2,p[1]-.4,p[2]+(p[2]<-HD+1?1.2:0));scene.add(light);}
        beacons.push({g,rot,light,ph:Math.random()*6,pos:new THREE.Vector3(p[0],0,p[2])});
      });

      // ── 光源 ──
      const hemi=new THREE.HemisphereLight(0x3a4680,0x120c18,.5);scene.add(hemi);
      const spot=new THREE.SpotLight(0xffe8c8,20,36,.46,.35,1.15);
      spot.position.set(.22,-.18,.05);
      spot.castShadow=true;
      const SMAP=coarse?512:1024;
      spot.shadow.mapSize.set(SMAP,SMAP);spot.shadow.camera.near=.3;spot.shadow.camera.far=24;spot.shadow.bias=-.0006;spot.shadow.normalBias=.03;
      spot.map=T.cookie;
      camera.add(spot);
      const spotTarget=new THREE.Object3D();spotTarget.position.set(0,0,-6);camera.add(spotTarget);spot.target=spotTarget;
      // 懐中電灯の光の筋（加算合成のコーン）
      const fbGeo=new THREE.ConeGeometry(2.6,9,20,1,true);fbGeo.translate(0,-4.5,0);fbGeo.rotateX(Math.PI/2);extraGeos.push(fbGeo);
      const fbMat=new THREE.MeshBasicMaterial({map:T.beam,color:0xfff0d0,transparent:true,opacity:.055,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide,fog:false});
      const fbeam=new THREE.Mesh(fbGeo,fbMat);fbeam.position.copy(spot.position);camera.add(fbeam);
      // 懐中電灯に舞う埃
      const DUST=110,dustPos=new Float32Array(DUST*3),dustVel=new Float32Array(DUST*3);
      const seedDust=i=>{const d=rnd(1.2,7),a=Math.random()*Math.PI*2,rr=Math.random()*d*.42;dustPos[i*3]=Math.cos(a)*rr+.2;dustPos[i*3+1]=Math.sin(a)*rr-.15;dustPos[i*3+2]=-d;dustVel[i*3]=rnd(-.05,.05);dustVel[i*3+1]=rnd(-.06,.03);dustVel[i*3+2]=rnd(-.03,.03);};
      for(let i=0;i<DUST;i++)seedDust(i);
      const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
      const dustMat=new THREE.PointsMaterial({map:T.dot,color:0xfff2d8,size:.016,transparent:true,opacity:.5,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
      const dust=new THREE.Points(dustGeo,dustMat);dust.frustumCulled=false;camera.add(dust);

      // ── 火花 ──
      const SPK=48,spkPos=new Float32Array(SPK*3),spkVel=new Float32Array(SPK*3),spkLife=new Float32Array(SPK);
      const spkGeo=new THREE.BufferGeometry();spkGeo.setAttribute('position',new THREE.BufferAttribute(spkPos,3));
      const spkMat=new THREE.PointsMaterial({map:T.dot,color:0xffb050,size:.09,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
      const sparks=new THREE.Points(spkGeo,spkMat);sparks.frustumCulled=false;scene.add(sparks);
      for(let i=0;i<SPK;i++)spkPos[i*3+1]=-50;
      const spkGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0xffa040,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));
      spkGlow.scale.set(2.5,2.5,1);scene.add(spkGlow);
      let spkT=2;
      function burstSparks(){
        if(!sparkSpots.length)return;
        const p=pick(sparkSpots);spkGlow.position.copy(p);spkGlow.material.opacity=1;
        for(let i=0;i<SPK;i++){spkPos[i*3]=p.x;spkPos[i*3+1]=p.y;spkPos[i*3+2]=p.z;spkVel[i*3]=rnd(-2,2);spkVel[i*3+1]=rnd(.5,3.5);spkVel[i*3+2]=rnd(-2,2);spkLife[i]=rnd(.4,1.1);}
      }

      // ── 計器（点検対象）の配置 ──
      const freeCells=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isFree(r,c))freeCells.push([r,c]);
      const START={x:0,z:HD-2};
      const cands=[];
      freeCells.forEach(([r,c])=>{
        if(r>=ROWS-2||r===0)return;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc])=>{
          const nr=r+dr,nc=c+dc;
          const wallSide=!inb(nr,nc)&&dc!==0;
          if(isSolid(nr,nc)||wallSide)cands.push({r,c,dr,dc,x:cx(c)+dc*(CELL/2-.32),z:cz(r)+dr*(CELL/2-.32)});
        });
      });
      shuffle(cands);
      const gaugeSpots=[];
      for(const minD of [13,10,7,4,0]){
        for(const cd of cands){
          if(gaugeSpots.length>=NEED)break;
          if(gaugeSpots.some(g=>g.r===cd.r&&g.c===cd.c||Math.hypot(g.x-cd.x,g.z-cd.z)<minD))continue;
          if(Math.hypot(cd.x-START.x,cd.z-START.z)<Math.min(minD,8))continue;
          gaugeSpots.push(cd);
        }
        if(gaugeSpots.length>=NEED)break;
      }
      const dialGeo=new THREE.CircleGeometry(.24,28);extraGeos.push(dialGeo);
      const needleGeo=new THREE.BoxGeometry(.018,.2,.01);needleGeo.translate(0,.08,0);extraGeos.push(needleGeo);
      const markerMat=new THREE.SpriteMaterial({map:T.marker,transparent:true,depthWrite:false,fog:false});
      const gauges=gaugeSpots.map((s,i)=>{
        const label='P-0'+(i+1);
        const face=ctex(128,128,(g,w,h)=>{
          g.fillStyle='#1a1a1e';g.fillRect(0,0,w,h);
          g.fillStyle='#e4dcc6';g.beginPath();g.arc(64,64,60,0,7);g.fill();
          const a0=Math.PI*.75,span=Math.PI*1.5;
          const arc=(f0,f1,c)=>{g.strokeStyle=c;g.lineWidth=9;g.beginPath();g.arc(64,64,48,a0+span*f0,a0+span*f1);g.stroke();};
          arc(.35,.62,'#2aa860');arc(.8,1,'#d02838');
          g.strokeStyle='#222';for(let k=0;k<=20;k++){const a=a0+span*k/20,l=k%5?6:11;g.lineWidth=k%5?1.5:2.5;g.beginPath();g.moveTo(64+Math.cos(a)*54,64+Math.sin(a)*54);g.lineTo(64+Math.cos(a)*(54-l),64+Math.sin(a)*(54-l));g.stroke();}
          g.fillStyle='#222';g.font='bold 13px monospace';g.textAlign='center';g.fillText('MPa',64,92);g.font='bold 12px monospace';g.fillText(label,64,44);
          g.strokeStyle='#444';g.lineWidth=4;g.beginPath();g.arc(64,64,61,0,7);g.stroke();
        });
        const grp=new THREE.Group();grp.position.set(s.x,0,s.z);grp.rotation.y=Math.atan2(-s.dc,-s.dr);scene.add(grp);
        const housMat=new THREE.MeshPhongMaterial({color:0x3e5a6a,shininess:50,specular:0x445566});
        const post=new THREE.Mesh(new THREE.BoxGeometry(.14,1.05,.14),M.dark);post.position.y=.52;post.castShadow=true;grp.add(post);
        const hous=new THREE.Mesh(new THREE.BoxGeometry(.66,.64,.22),housMat);hous.position.set(0,1.36,0);hous.castShadow=true;hous.receiveShadow=true;grp.add(hous);
        const bez=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.05,24),M.metal);bez.rotation.x=Math.PI/2;bez.position.set(0,1.38,.12);grp.add(bez);
        const dmat=new THREE.MeshPhongMaterial({map:face,color:0xb8b4a8,emissive:0x3a3426,emissiveMap:face,shininess:40,specular:0x444444});
        const dial=new THREE.Mesh(dialGeo,dmat);dial.position.set(0,1.38,.147);grp.add(dial);
        const pivot=new THREE.Group();pivot.position.set(0,1.38,.155);grp.add(pivot);
        const needle=new THREE.Mesh(needleGeo,new THREE.MeshBasicMaterial({color:0xc01818}));pivot.add(needle);
        const cap=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.02,10),M.dark);cap.rotation.x=Math.PI/2;cap.position.set(0,1.38,.16);grp.add(cap);
        const pp=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.7,8),M.pipe);pp.rotation.x=Math.PI/2;pp.position.set(0,1.2,-.42);grp.add(pp);
        const lampMat=new THREE.MeshBasicMaterial({color:0xffb020});
        const lamp=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),lampMat);lamp.position.set(.25,1.62,.12);grp.add(lamp);
        const lampGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0xffa020,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8}));
        lampGlow.scale.set(.5,.5,1);lampGlow.position.copy(lamp.position);grp.add(lampGlow);
        const marker=new THREE.Sprite(markerMat);marker.scale.set(.42,.42,1);marker.position.set(0,2.35,0);grp.add(marker);
        const tick=new THREE.Sprite(new THREE.SpriteMaterial({map:T.tick,transparent:true,depthWrite:false,depthTest:false,fog:false,opacity:0}));
        tick.scale.set(1.3,.33,1);tick.position.set(0,2,.1);tick.visible=false;grp.add(tick);
        addCol(s.x,s.z,s.dr?0.72:0.4,s.dr?0.4:0.72,1.7);
        const nrm=new THREE.Vector3(-s.dc,0,-s.dr);
        const base=rnd(.82,1.0)*(Math.random()<.5?1:-1);
        return {i,x:s.x,z:s.z,nrm,pivot,lampMat,lampGlow,marker,tick,tickT:0,done:false,prog:0,base,target:rnd(-.25,.25),ang:base,center:new THREE.Vector3(s.x,1.38,s.z).addScaledVector(nrm,.15)};
      });

      // ── 予備電池 ──
      const used=new Set(gaugeSpots.map(g=>g.r+','+g.c));
      const batSpots=[];
      shuffle(freeCells.slice()).forEach(([r,c])=>{
        if(batSpots.length>=DF.bats||used.has(r+','+c)||r>=ROWS-2)return;
        const x=cx(c)+rnd(-1,1),z=cz(r)+rnd(-1,1);
        if(batSpots.some(b=>Math.hypot(b.x-x,b.z-z)<10))return;
        batSpots.push({x,z});
      });
      const batGeo=new THREE.CylinderGeometry(.08,.08,.3,12),batBand=new THREE.CylinderGeometry(.086,.086,.07,12);extraGeos.push(batGeo,batBand);
      const batMat=new THREE.MeshPhongMaterial({color:0x202428,shininess:80,specular:0x888888});
      const bandMat=new THREE.MeshBasicMaterial({color:0x00e8c8});
      const batGlowMat=new THREE.SpriteMaterial({map:T.glow,color:0x00e8c8,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8});
      const bats=batSpots.map(b=>{
        const g=new THREE.Group();g.position.set(b.x,.5,b.z);scene.add(g);
        const m=new THREE.Mesh(batGeo,batMat);m.rotation.z=.5;g.add(m);
        const band=new THREE.Mesh(batBand,bandMat);m.add(band);band.position.y=.08;
        const gl=new THREE.Sprite(batGlowMat);gl.scale.set(.9,.9,1);g.add(gl);
        return {g,taken:false,ph:Math.random()*6};
      });

      // ── 影 ──
      const ghost=new THREE.Group();scene.add(ghost);
      const prof=[[0,0],[.42,.02],[.36,.3],[.4,.6],[.33,1.0],[.26,1.3],[.2,1.45],[.08,1.52],[0,1.53]].map(p=>new THREE.Vector2(p[0],p[1]));
      const lathe=new THREE.LatheGeometry(prof,14);extraGeos.push(lathe);
      const ghostMat=new THREE.MeshBasicMaterial({color:0x020104,transparent:true,opacity:.94});
      const gBody=new THREE.Mesh(lathe,ghostMat);gBody.castShadow=true;ghost.add(gBody);
      const auraMat=new THREE.MeshBasicMaterial({color:0x7a2aa0,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false});
      const aura=new THREE.Mesh(lathe,auraMat);aura.scale.set(1.12,1.04,1.12);ghost.add(aura);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.19,14,10),ghostMat);head.position.y=1.7;head.scale.set(1,1.15,1);head.castShadow=true;ghost.add(head);
      const armGeo=new THREE.CylinderGeometry(.035,.015,1.1,6);armGeo.translate(0,-.55,0);extraGeos.push(armGeo);
      const arms=[-1,1].map(s=>{const a=new THREE.Mesh(armGeo,ghostMat);a.position.set(s*.3,1.38,.02);a.rotation.z=s*.12;ghost.add(a);return a;});
      const eyeMat=new THREE.MeshBasicMaterial({color:0xff2848,fog:false});
      const eyeGlowMat=new THREE.SpriteMaterial({map:T.glow,color:0xff1838,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.9});
      const eyes=[-1,1].map(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.022,6,4),eyeMat);e.position.set(s*.07,1.72,.16);ghost.add(e);const gl=new THREE.Sprite(eyeGlowMat);gl.scale.set(.22,.22,1);gl.position.copy(e.position);ghost.add(gl);return e;});
      const WIS=36,wisPos=new Float32Array(WIS*3),wisLife=new Float32Array(WIS);
      for(let i=0;i<WIS;i++){wisLife[i]=Math.random();}
      const wisGeo=new THREE.BufferGeometry();wisGeo.setAttribute('position',new THREE.BufferAttribute(wisPos,3));
      const wisMat=new THREE.PointsMaterial({map:T.dot,color:0x140a1e,size:.32,transparent:true,opacity:.7,depthWrite:false});
      const wisps=new THREE.Points(wisGeo,wisMat);wisps.frustumCulled=false;ghost.add(wisps);
      const GH={x:0,z:0,wx:0,wz:0,lit:0,cool:0,seen:0,fade:1,stun:0,warp:0};
      function placeGhostFar(px,pz,minD=26){
        const opts=freeCells.filter(([r,c])=>Math.hypot(cx(c)-px,cz(r)-pz)>minD);
        const [r,c]=pick(opts.length?opts:freeCells);
        GH.x=cx(c);GH.z=cz(r);GH.fade=0;newWander();
      }
      function newWander(){const [r,c]=pick(freeCells);GH.wx=cx(c)+rnd(-1,1);GH.wz=cz(r)+rnd(-1,1);}
      placeGhostFar(START.x,START.z,32);

      flushParts();
      {
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(su,2));
        g.setIndex(si);g.computeVertexNormals();
        const m=new THREE.Mesh(g,M.stripe);m.receiveShadow=true;scene.add(m);
      }

      // ── プレイヤー ──
      const P={x:START.x,z:START.z,yaw:0,pitch:-.04,vx:0,vz:0,bob:0,bobAmt:0,swayX:0,swayY:0,shake:0,hitT:0,fovK:0};
      function collide(){
        for(let it=0;it<2;it++){
          P.x=clamp(P.x,-HW+P_R+.3,HW-P_R-.3);P.z=clamp(P.z,-HD+P_R+.3,HD-P_R-.2);
          for(const b of cols){
            const qx=clamp(P.x,b.x0,b.x1),qz=clamp(P.z,b.z0,b.z1);
            const dx=P.x-qx,dz=P.z-qz,d2=dx*dx+dz*dz;
            if(d2>=P_R*P_R)continue;
            if(d2>1e-8){const d=Math.sqrt(d2);P.x=qx+dx/d*P_R;P.z=qz+dz/d*P_R;}
            else{
              const pl=P.x-b.x0,pr=b.x1-P.x,pt=P.z-b.z0,pb=b.z1-P.z,m=Math.min(pl,pr,pt,pb);
              if(m===pl)P.x=b.x0-P_R;else if(m===pr)P.x=b.x1+P_R;else if(m===pt)P.z=b.z0-P_R;else P.z=b.z1+P_R;
            }
          }
        }
      }
      // 2点間の遮蔽（背の高い障害物のみ）
      function occluded(ax,az,bx,bz){
        const dx=bx-ax,dz=bz-az;
        for(const b of cols){
          if(b.h<1.6)continue;
          let t0=0,t1=1;
          for(const [p,d,lo,hi] of [[ax,dx,b.x0,b.x1],[az,dz,b.z0,b.z1]]){
            if(Math.abs(d)<1e-6){if(p<lo||p>hi){t0=2;break;}continue;}
            let ta=(lo-p)/d,tb=(hi-p)/d;if(ta>tb)[ta,tb]=[tb,ta];
            t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)break;
          }
          if(t0<=t1&&t0<1)return true;
        }
        return false;
      }

      // ── サイズ調整 ──
      function resize(){
        if(S.disposed||!G)return;
        const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);
        renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
      }
      resize();
      if(window.ResizeObserver){ro=new ResizeObserver(resize);ro.observe(wrap);}
      on(window,'resize',resize);

      // ── 床のステンシル表示 ──
      function stencilTex(txt,fg,bg,arrow){
        return ctex(256,96,(g,w,h)=>{
          g.clearRect(0,0,w,h);
          if(bg){g.strokeStyle=bg;g.lineWidth=7;g.strokeRect(6,6,w-12,h-12);}
          g.fillStyle=fg;g.font='bold 50px "DotGothic16",sans-serif';g.textAlign='center';g.textBaseline='middle';
          if(arrow){g.fillText(txt,w/2+34,h/2+2);g.beginPath();g.moveTo(40,14);g.lineTo(66,46);g.lineTo(50,46);g.lineTo(50,82);g.lineTo(30,82);g.lineTo(30,46);g.lineTo(14,46);g.closePath();g.fill();}
          else g.fillText(txt,w/2,h/2+2);
          g.globalCompositeOperation='destination-out';
          for(let i=0;i<700;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.9})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*5,1+Math.random()*3);}
        });
      }
      const decalGeo=new THREE.PlaneGeometry(2.7,1);extraGeos.push(decalGeo);
      const DECALS=[['立入禁止','rgba(220,50,60,.85)','rgba(220,50,60,.85)'],['足元注意','rgba(230,190,40,.8)',null],['3番ライン','rgba(220,220,220,.6)',null],['非常口','rgba(60,220,120,.75)',null,true]];
      const decalCells=shuffle(freeCells.filter(([r,c])=>r>0&&r<ROWS-1)).slice(0,6);
      decalCells.forEach(([r,c],i)=>{
        const d=DECALS[i%DECALS.length];
        const mat=new THREE.MeshLambertMaterial({map:stencilTex(d[0],d[1],d[2],d[3]),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
        const m=new THREE.Mesh(decalGeo,mat);m.rotation.x=-Math.PI/2;
        if(!d[3])m.rotation.z=pick([0,Math.PI/2,Math.PI,-Math.PI/2]);
        m.position.set(cx(c)+rnd(-.4,.4),.02,cz(r)+rnd(-.4,.4));m.receiveShadow=true;scene.add(m);
      });

      // ── 雨漏り（しずくと波紋） ──
      const dropGeo=new THREE.SphereGeometry(1,6,4),ringGeo=new THREE.RingGeometry(.7,1,24);ringGeo.rotateX(-Math.PI/2);extraGeos.push(dropGeo,ringGeo);
      const dropMat=new THREE.MeshPhongMaterial({color:0x9ab4f0,emissive:0x1a2440,shininess:120,specular:0xffffff,transparent:true,opacity:.8});
      const drips=shuffle(freeCells.slice()).slice(0,4).map(([r,c])=>{
        const x=cx(c)+rnd(-1.2,1.2),z=cz(r)+rnd(-1.2,1.2);
        const drop=new THREE.Mesh(dropGeo,dropMat);drop.scale.set(.022,.07,.022);scene.add(drop);
        const ring=new THREE.Mesh(ringGeo,new THREE.MeshBasicMaterial({color:0xb8c8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
        ring.position.set(x,.025,z);scene.add(ring);
        return {x,z,drop,ring,y:-1,vy:0,wait:rnd(0,2),rt:1};
      });

      // ── 影の補足：背後の闇と、裾のぼろ布 ──
      const smoke=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0x000000,transparent:true,opacity:.75,depthWrite:false}));
      smoke.scale.set(2.4,3.4,1);smoke.position.set(0,1.1,-.25);ghost.add(smoke);
      const ragGeo=new THREE.PlaneGeometry(.14,.7);ragGeo.translate(0,-.35,0);extraGeos.push(ragGeo);
      const ragMat=new THREE.MeshBasicMaterial({color:0x030106,transparent:true,opacity:.9,side:THREE.DoubleSide});
      const rags=[];
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2,m=new THREE.Mesh(ragGeo,ragMat);m.position.set(Math.sin(a)*.36,.45,Math.cos(a)*.36);m.rotation.y=a;ghost.add(m);rags.push(m);}
      GH.shroud=1;

      // ══════════════════════════════════════════════════════
      // 演出フロー：タイトル → 無線 → 操作説明 → 探索 → 結末
      // ══════════════════════════════════════════════════════
      const STORY=[
        {who:'班長（無線）',por:'radio',text:'だんのうら、聞こえるか。第三工場が落雷で停電や。'},
        {who:'班長（無線）',por:'radio',text:`復電まであと${TIME_LIMIT}秒。それまでに圧力計5か所、目視で頼むわ。`},
        {who:'だんのうら',por:'char_normal',text:'了解です。……懐中電灯一本で、ですか。'},
        {who:'班長（無線）',por:'radio',text:DATA.clears?'……また“影”を見たて話が出とる。前より濃いらしい。光、絶やすなよ。':'……それとな。あそこは夜、“影”が出るて噂や。光、絶やすなよ。'},
        {who:'だんのうら',por:'char_normal',text:'（娘が起きる前には帰らな。――行くか）'},
      ];
      let phaseT=0,storyIdx=-1,typed=0,lineFull=false,pendingHide=null,pendingT=0,glitchT=0;
      const setPor=(elm,por)=>{
        if(por==='radio'){elm.className='factory3d-por radio';elm.style.backgroundImage='';elm.innerHTML='<b>📻</b><div class="factory3d-wave"><i></i><i style="animation-delay:.15s"></i><i style="animation-delay:.3s"></i><i style="animation-delay:.1s"></i><i style="animation-delay:.25s"></i></div>RADIO';}
        else{elm.className='factory3d-por';elm.innerHTML='';elm.style.backgroundImage=`url(assets/img/${por}.webp)`;}
      };
      function glitchOut(elm){elm.classList.remove('factory3d-gin');elm.classList.add('factory3d-gout');pendingHide=elm;pendingT=.5;wrap.classList.add('factory3d-glitch');glitchT=.55;}
      function showTitle(){
        S.phase='title';phaseT=3.2;
        el.load.className='factory3d-ov factory3d-loadov factory3d-titleov factory3d-gin';
        el.load.innerHTML=`<div class="factory3d-sub">NIGHT SHIFT ／ PLANT No.3 ／ POWER FAILURE</div>
          <div class="factory3d-logo"><small>夜勤の</small>第三工場</div>
          <div class="factory3d-sub">${DATA.clears?`影の濃さ Lv.${1+Math.min(3,DATA.clears)}`:'—— 停電の夜 ——'}　難しさ：${MG_DIFF_NAMES[DIFF]}</div>
          ${DATA.best?`<div class="factory3d-rec">BEST ${DATA.best}　${DATA.bestScore} pts</div>`:''}
          <div class="factory3d-tap">TAP TO START</div>`;
        se('notif');
      }
      function goStory(){
        glitchOut(el.load);
        S.phase='story';wrap.classList.add('factory3d-story');storyIdx=-1;nextLine();
        el.talk.classList.add('on');
      }
      function nextLine(){
        storyIdx++;
        if(storyIdx>=STORY.length){goHowto();return;}
        const L=STORY[storyIdx];
        setPor(el.por,L.por);
        el.name.textContent=L.who;el.name.className='factory3d-name'+(L.who==='だんのうら'?' dan':'');
        typed=0;lineFull=false;el.line.textContent='';phaseT=3.6;
        if(L.por==='radio')se('micOn');else se('btn');
      }
      function goHowto(){
        S.phase='howto';phaseT=3;
        wrap.classList.remove('factory3d-story');el.talk.classList.remove('on');
        el.load.className='factory3d-ov factory3d-loadov factory3d-gin';
        el.load.innerHTML=`<h3>停電した第三工場</h3>
          <ul>
            <li>⚙ <b>計器5か所</b>の正面で【点検】ボタンを長押し</li>
            <li>🔦 懐中電灯の電池が<u>体力</u>。予備電池で補充</li>
            <li>👁 <em>「影」</em>は光に弱い。【集光】長押しで焼き払え</li>
            <li>　 ただし目を離すと、近づいてくる</li>
            <li>🚪 全部終えたら<i>緑の非常口</i>へ　制限 ${TIME_LIMIT}秒</li>
          </ul>
          <div class="factory3d-keys">${coarse?'左ドラッグ：移動　右ドラッグ：視点　右下ボタン長押し：点検／集光':'WASD・矢印：移動　マウスドラッグ：視点　E／Space長押し：点検／集光'}</div>
          <div class="factory3d-bar"><i></i></div>`;
      }
      function startPlay(){
        glitchOut(el.load);
        S.phase='play';wrap.classList.remove('factory3d-cine');
        DATA.plays++;
        P.yaw=camYaw;P.pitch=-.04;
        toast('点検開始。計器を探せ');se('machine');click();
        hintIdx=0;hintT=0;showHint();
      }
      advance=(skip)=>{
        if(S.phase==='title'){if(phaseT<2.9)goStory();}
        else if(S.phase==='story'){
          if(skip===true){goHowto();return;}
          if(!lineFull){typed=999;}else nextLine();
        }
        else if(S.phase==='howto'){if(phaseT<2.6)startPlay();}
        else if(S.phase==='ending'){if(phaseT>1.2)mg.end(S.endReason);}
      };

      // ── チュートリアルヒント（最初の10秒ほど） ──
      let hintIdx=-1,hintT=0,hintShown='';
      const HINTS=[
        {t:coarse?'画面の<b>左側</b>をドラッグして移動':'<b>WASD／矢印キー</b>で移動',done:()=>S.moved>2.5},
        {t:coarse?'画面の<b>右側</b>をドラッグして見回す':'<b>マウスをドラッグ</b>して見回す',done:()=>S.looked>.9},
        {t:'上の<b>▲</b>が次の計器の方向。正面に立って<b>【点検】長押し</b>',done:()=>S.inspected>0},
      ];
      S.moved=0;S.looked=0;
      function showHint(html){
        const h=html||(hintIdx>=0&&hintIdx<HINTS.length?HINTS[hintIdx].t:'');
        if(h!==hintShown){hintShown=h;if(h)el.hint.innerHTML=h;}
        el.hint.classList.toggle('on',!!h);
      }
      let focusHintT=0;
      function tickHints(dt){
        if(focusHintT>0){focusHintT-=dt;showHint('<b>【集光】長押し</b>で影を焼き払え。目を離すと近づく');if(focusHintT<=0)showHint();return;}
        if(hintIdx<0||hintIdx>=HINTS.length){if(hintShown)showHint('');return;}
        hintT+=dt;
        if((HINTS[hintIdx].done()&&hintT>1.6)||hintT>7){hintIdx++;hintT=0;showHint();}
      }

      // ── 緊張の段階：0 静寂 → 1 影の出現 → 2 追跡 ──
      function setTension(n){
        if(S.tension>=n)return;
        S.tension=n;
        if(n===1){
          const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
          const c=freeCells.map(([r,c])=>({x:cx(c),z:cz(r)})).filter(p=>{const dx=p.x-P.x,dz=p.z-P.z,d=Math.hypot(dx,dz);return d>11&&d<20&&(dx*fx+dz*fz)/d>.55;});
          if(c.length){const p=pick(c);GH.x=p.x;GH.z=p.z;}else placeGhostFar(P.x,P.z,15);
          GH.fade=1;GH.stun=2;GH.shroud=1;
          lightning(1);thunder(.25);sting();se('ghost');
          toast('……奥に、何かいる','bad');
          el.phase.textContent='— 気配 —';el.phase.className='factory3d-phase p1';
          focusHintT=4.5;
        }else if(n===2){
          toast(S.inspected>=NEED?'影が追ってくる――非常口へ急げ！':'影が追ってくる――急げ！','bad');se('warn');sting();
          el.phase.textContent='— 追跡 —';el.phase.className='factory3d-phase p2';
          lightning(.8);thunder(.4);
        }
      }

      // ── 状態・演出 ──
      let tAll=0,hudT=0,lightT=rnd(5,9),lightSeq=[],flashV=0,lowWarned=false,exitWarnT=0,ghostSeT=0,overT=0,doorOpen=0,powerV=0,lastStep=0,stutterT=3,camYaw=0,ghostNear=0,burning=false,focusing=false;
      const camFwd=new THREE.Vector3();
      let lastShown='',curGauge=null;
      function lightning(v){lightSeq=[{t:0,v:v||1},{t:.09,v:.5},{t:.22+rnd(0,.1),v:rnd(.5,.9)}];}

      // ── 結果・評価 ──
      const RANKV={S:4,A:3,B:2,C:1,'':0};
      function finalize(){
        const n=S.inspected,clear=S.endReason==='clear';
        let sc=n*800+S.repels*150+S.picked*60-S.hits*250;
        if(clear)sc+=2000+Math.round(S.timeLeft*40)+Math.round(S.battery*10);
        sc=Math.max(0,sc);
        let g='C';
        if(clear)g=(S.hits===0&&S.timeLeft>=20)?'S':(S.hits<=1&&S.timeLeft>=8)?'A':'B';
        S.grade=g;S.score=sc;
        S.newRec=sc>DATA.bestScore;
        if(clear)DATA.clears++;
        if(RANKV[g]>RANKV[DATA.best||''])DATA.best=g;
        if(S.newRec)DATA.bestScore=sc;
        if(clear&&(!DATA.bestTime||S.elapsed<DATA.bestTime))DATA.bestTime=Math.round(S.elapsed);
      }
      function endWith(reason){
        if(S.phase!=='play')return;
        S.phase='over';S.endReason=reason;
        inp.actBtn=inp.actKey=false;el.act.classList.remove('ready','held');
        el.ring.classList.remove('on');el.prompt.classList.remove('on');showHint('');
        finalize();
        if(reason==='down'){overT=1.6;se('ghost');sting();toast('ライトが……','bad');
          const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);GH.x=P.x+fx*1.3;GH.z=P.z+fz*1.3;GH.fade=1;}
        if(reason==='clear'){overT=2.2;se('decide');toast('脱出――復電した','ok');S.power=1;}
        if(reason==='timeup'){overT=2;toast('復電――時間切れ','bad');se('warn');S.power=1;}
      }
      const LINES={
        S:[['班長','よう戻った。完璧や――照明、入れるで。'],['だんのうら','全部異常なしです。……報告書に書けへんもんが一つ、ありましたけど。']],
        A:[['班長','ご苦労さん。復電したで。全部見てくれたな。'],['だんのうら','はい。……あの影、最後までついてきてました。']],
        B:[['班長','間に合ったか。ようやった、顔色悪いで。'],['だんのうら','……ライト、もうちょっとで切れるとこでした。']],
        down:[['だんのうら','……ライトが、消え――　後ろに、誰か……'],['班長（無線）','だんのうら？　おい、応答せえ！　だんのうら！']],
        timeup:[['班長（無線）','復電した。残りは朝番に回す。……無事か？'],['だんのうら','なんとか。……影の噂、ほんまやったんですね。']],
      };
      function showEnding(){
        S.phase='ending';phaseT=0;
        wrap.classList.add('factory3d-cine');
        const r=S.endReason,g=S.grade;
        const key=r==='clear'?g:r;
        const por=r==='clear'?(g==='B'?'char_happy':'char_win'):r==='down'?'char_fear':'char_tired';
        const title=r==='clear'?'第三工場、点検完了':r==='down'?'ライトが消えた':'時間切れ――復電';
        const L=LINES[key]||LINES.B;
        el.end.innerHTML=`<div class="factory3d-sub">SHIFT REPORT ／ PLANT No.3</div><h3>${title}</h3>
          <div class="factory3d-row"><div class="factory3d-por"></div><div class="factory3d-box">${L.map(l=>`<p><span>${l[0]}</span>${l[1]}</p>`).join('')}</div></div>
          <div class="factory3d-grade"><b class="${g}">${g}</b><div class="factory3d-stats">点検　<em>${S.inspected}/${NEED}</em><br>残り　<em>${Math.ceil(S.timeLeft)}秒</em>　電池 <em>${Math.ceil(S.battery)}%</em><br>接触　<em>${S.hits}</em>　撃退 <em>${S.repels}</em><br>SCORE <em>${S.score}</em></div></div>
          ${S.newRec?'<div class="factory3d-new">★ NEW RECORD ★</div>':''}
          <div class="factory3d-rec">BEST ${DATA.best||'-'}　${DATA.bestScore} pts${DATA.bestTime?`　最速 ${DATA.bestTime}秒`:''}　／　クリア ${DATA.clears}回</div>
          <button class="factory3d-btn" type="button">報告して戻る ▶</button>`;
        setPor(el.end.querySelector('.factory3d-por'),por);
        el.end.querySelector('button').onclick=()=>mg.end(S.endReason);
        el.end.classList.add('on');
        se(r==='clear'?(g==='S'?'rank':'ach'):'back');
      }

      // ── メインループ ──
      showTitle();
      sfxInit();
      mg.loop(dt=>frame(dt,true));
      function frame(dt,draw){
        if(S.disposed||!G)return;
        dt=clamp(dt||0,0,.05);
        tAll+=dt;
        if(pendingHide){pendingT-=dt;if(pendingT<=0){pendingHide.classList.add('hide');pendingHide.classList.remove('factory3d-gout');pendingHide=null;}}
        if(glitchT>0){glitchT-=dt;if(glitchT<=0)wrap.classList.remove('factory3d-glitch');}
        if(S.phase==='title'){phaseT-=dt;if(phaseT<=0)goStory();}
        else if(S.phase==='story'){
          if(!lineFull){typed+=dt*30;const tx=STORY[storyIdx].text;el.line.textContent=tx.slice(0,Math.floor(typed));if(typed>=tx.length){lineFull=true;el.line.textContent=tx;}}
          else{phaseT-=dt;if(phaseT<=0)nextLine();}
        }
        else if(S.phase==='howto'){phaseT-=dt;if(phaseT<=0)startPlay();}
        else if(S.phase==='play'){update(dt);if(S.disposed)return;}
        else if(S.phase==='over'){
          overT-=dt;
          if(S.endReason==='down'){el.dark.style.opacity=String(clamp(1-(overT-.2)/1.2,0,1));el.red.style.opacity='.8';}
          if(S.endReason==='clear'){doorOpen=Math.min(1,doorOpen+dt*1.2);el.flash.style.opacity=String(clamp(1-overT/2.2,0,1)*.35);}
          if(overT<=0)showEnding();
        }
        else if(S.phase==='ending'){phaseT+=dt;}
        if(S.disposed)return;
        if(S.phase==='title'||S.phase==='story'||S.phase==='howto'){camYaw=Math.sin(tAll*.22)*.5;P.yaw=camYaw;P.pitch=.06+Math.sin(tAll*.31)*.05;}
        world(dt);
        sfxTick(dt,S.phase==='play'?ghostNear:0,burning&&S.phase==='play',S.tension);
        if(draw)renderer.render(scene,camera);else camera.updateMatrixWorld(true);
      }

      function update(dt){
        S.elapsed+=dt;S.timeLeft-=dt;
        if(S.timeLeft<=0){S.timeLeft=0;endWith('timeup');return;}
        inp.buf=Math.max(0,inp.buf-dt);
        // 視点
        P.yaw+=inp.dyaw;P.pitch=clamp(P.pitch+inp.dpitch,-1.25,1.2);
        S.looked+=Math.abs(inp.dyaw)+Math.abs(inp.dpitch);
        P.swayX=P.swayX*.85+inp.dyaw*2.2;P.swayY=P.swayY*.85+inp.dpitch*2.2;
        inp.dyaw=inp.dpitch=0;
        // 移動（なめらかな加減速、壁に沿って滑る当たり判定）
        let mx=inp.r-inp.l+inp.jx,mz=inp.f-inp.b-inp.jy;
        const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml;}
        const held=inp.actKey||inp.actBtn;
        const spd=SPEED*(held&&curGauge?.25:held?.7:1)*(P.hitT>0?.55:1);
        const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
        const tvx=(rx*mx+fx*mz)*spd,tvz=(rz*mx+fz*mz)*spd;
        const acc=(Math.hypot(tvx,tvz)>Math.hypot(P.vx,P.vz))?8:11;
        const k=1-Math.exp(-dt*acc);P.vx+=(tvx-P.vx)*k;P.vz+=(tvz-P.vz)*k;
        const ox=P.x,oz=P.z;
        P.x+=P.vx*dt;P.z+=P.vz*dt;collide();
        // 壁に当たった分の速度を落とす（滑りは残す）
        P.vx=(P.x-ox)/Math.max(dt,1e-4)*.5+P.vx*.5;P.vz=(P.z-oz)/Math.max(dt,1e-4)*.5+P.vz*.5;
        S.moved+=Math.hypot(P.x-ox,P.z-oz);
        const sp2=Math.hypot(P.vx,P.vz)/SPEED;
        P.bob+=dt*9.5*Math.min(1.1,sp2);P.bobAmt+=(Math.min(1,sp2)-P.bobAmt)*Math.min(1,dt*6);
        const stepIdx=Math.floor(P.bob/Math.PI);
        if(stepIdx!==lastStep){lastStep=stepIdx;if(P.bobAmt>.25)step();}

        // 点検対象の判定
        camera.getWorldDirection(camFwd);
        curGauge=null;
        let best=1e9;
        for(const g of gauges){
          if(g.done)continue;
          const dx=g.center.x-camera.position.x,dy=g.center.y-camera.position.y,dz=g.center.z-camera.position.z;
          const d=Math.hypot(dx,dy,dz);
          if(d>2.9)continue;
          const facing=(dx*camFwd.x+dy*camFwd.y+dz*camFwd.z)/d;
          const front=(P.x-g.x)*g.nrm.x+(P.z-g.z)*g.nrm.z;
          if(facing>.8&&front>.05&&d<best){best=d;curGauge=g;}
        }
        // ボタンは押した直後0.3秒を先行入力として受け付ける
        const acting=held||inp.buf>0;
        focusing=!curGauge&&held&&S.battery>0;
        if(focusing&&S.focusT<=0)click();
        S.focusT=focusing?S.focusT+dt:0;

        // 電池（集光中は消費が大きい）
        S.battery-=dt*(DRAIN+(focusing?2.6:0));
        if(S.battery<=0){S.battery=0;endWith('down');return;}
        if(S.battery<25&&!lowWarned){lowWarned=true;toast('電池が残りわずか','bad');se('warn');}
        if(S.battery>=30)lowWarned=false;

        // 予備電池
        bats.forEach(b=>{
          if(b.taken)return;
          if(Math.hypot(b.g.position.x-P.x,b.g.position.z-P.z)<1.15){
            b.taken=true;b.g.visible=false;S.picked++;
            S.battery=Math.min(100,S.battery+32);toast('予備電池 +32%','ok');se('btn');click();
          }
        });

        gauges.forEach(g=>{if(g!==curGauge&&!g.done)g.prog=Math.max(0,g.prog-dt*1.5);});
        if(curGauge){
          const g=curGauge;
          if(acting){
            if(g.prog===0)se('tool');
            g.prog+=dt/HOLD_T;
            if(g.prog>=1){
              g.prog=1;g.done=true;S.inspected++;g.tickT=1.8;g.tick.visible=true;g.marker.visible=false;
              g.lampMat.color.setHex(0x30ff70);g.lampGlow.material.color.setHex(0x30ff70);
              se('repair');inp.buf=0;
              mg.setScore(`点検 ${S.inspected}/${NEED}`);
              el.chk[S.inspected-1].classList.add('ok');
              if(S.inspected>=NEED){toast('全計器 点検完了！非常口へ','ok');se('ach');exitLamp.material.color.setHex(0x30ff70);}
              else toast(`点検完了 ${S.inspected}/${NEED}`,'ok');
            }
          }else g.prog=Math.max(0,g.prog-dt*1.5);
        }
        const showProg=curGauge?curGauge.prog:0;
        el.ring.classList.toggle('on',!!curGauge);
        el.prog.setAttribute('stroke-dashoffset',String(163.4*(1-showProg)));
        el.prompt.classList.toggle('on',!!curGauge&&showProg<.02);
        el.act.classList.toggle('ready',!!curGauge);
        el.act.classList.toggle('focus',!curGauge);
        const lbl=curGauge?'点検':'集光';
        if(el.act.dataset.l!==lbl){el.act.dataset.l=lbl;el.act.innerHTML=`${lbl}<small>HOLD / E</small>`;}

        // 緊張の段階
        if(S.tension===0&&(S.inspected>=1||S.elapsed>18))setTension(1);
        if(S.tension===1&&(S.inspected>=NEED-1||S.timeLeft<30))setTension(2);

        // 非常口
        const dExit=Math.hypot(P.x-exitX,P.z-(exitZ+.6));
        if(dExit<1.9){
          if(S.inspected>=NEED){endWith('clear');return;}
          if(exitWarnT<=0){toast(`まだ点検が残っている（${S.inspected}/${NEED}）`,'bad');exitWarnT=3;se('back');}
        }
        exitWarnT-=dt;

        // 影
        updateGhost(dt);
        if(S.phase!=='play')return;
        tickHints(dt);

        // HUD（10Hz程度）
        hudT-=dt;
        if(hudT<=0){
          hudT=.1;
          const b=Math.ceil(S.battery);
          el.batI.style.width=b+'%';el.pct.textContent=b+'%';
          el.bat.className='factory3d-bat'+(b<=25?' low':b<=50?' mid':'')+(focusing?' drain':'');
          const tl=Math.ceil(S.timeLeft)+'s';if(tl!==lastShown){mg.setTimer(tl);lastShown=tl;}
          let tx,tz,lbl2,ex=false;
          if(S.inspected>=NEED){tx=exitX;tz=exitZ+.6;lbl2='非常口';ex=true;}
          else{let bd=1e9;gauges.forEach(g=>{if(g.done)return;const d=Math.hypot(g.x-P.x,g.z-P.z);if(d<bd){bd=d;tx=g.x;tz=g.z;}});lbl2='計器';}
          const dx=tx-P.x,dz=tz-P.z,dist=Math.hypot(dx,dz);
          const lx=dx*rx+dz*rz,lf=dx*fx+dz*fz;
          el.navB.style.transform=`rotate(${Math.atan2(lx,lf)}rad)`;
          el.navT.textContent=`${lbl2} ${Math.round(dist)}m`;
          el.nav.classList.toggle('exit',ex);
        }
      }

      function updateGhost(dt){
        burning=false;
        if(S.tension<1){GH.fade=0;ghostNear=0;el.red.style.opacity=String(P.hitT*.9);return;}
        GH.fade=Math.min(1,GH.fade+dt*.6);
        GH.cool-=dt;
        const dx=P.x-GH.x,dz=P.z-GH.z,dist=Math.hypot(dx,dz)||.001;
        const nx=dx/dist,nz=dz/dist;
        const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
        const cosA=(-nx*fx+-nz*fz);                 // 視線と影の方向
        const beamOn=S.battery>0&&spot.intensity>FL_MAX*.25;
        const range=focusing?19:13,cone=focusing?.3:.42;
        const lit=beamOn&&dist<range&&cosA>Math.cos(cone)&&!occluded(P.x,P.z,GH.x,GH.z);
        // 非常灯や非常口の近くは「暗がり」ではない
        let nearLight=false;
        beacons.forEach(b=>{if(Math.hypot(b.pos.x-P.x,b.pos.z-P.z)<6.5)nearLight=true;});
        if(Math.hypot(exitX-P.x,exitZ-P.z)<6)nearLight=true;
        const prog=S.elapsed/TIME_LIMIT;
        const aggro=S.tension>=2?99:nearLight?13:22;
        if(lit&&GH.fade>.5){
          // 光で“まとい”が焼ける。焼き切ると霧散する
          burning=true;
          GH.shroud-=dt*(focusing?1.5:.5)*DF.burn;GH.stun=.5;
          const push=focusing?3.2:1.8;
          GH.x-=nx*dt*push;GH.z-=nz*dt*push;
          if(GH.shroud<=0){
            S.repels++;GH.shroud=1;toast('影が霧散した','ok');se('noise');
            wrap.classList.add('factory3d-glitch');glitchT=.5;
            placeGhostFar(P.x,P.z,24);
          }
        }else{
          GH.shroud=Math.min(1,GH.shroud+dt*.12);
          GH.stun=Math.max(0,GH.stun-dt);
          if(GH.stun<=0){
            if(dist<aggro){
              // 見られていない時ほど速い（視界の外から迫る）
              const seen=cosA>.55;
              const v=(1.35+1.1*prog)*GHOST_MUL*(nearLight?.75:1.1)*(seen?.55:1.25)*(S.tension>=2?1.15:1);
              GH.x+=nx*v*dt;GH.z+=nz*v*dt;
              // 目を離した隙に、ふっと距離を詰める
              stutterT-=dt;
              if(stutterT<=0&&!seen&&dist>4.5&&dist<16){stutterT=rnd(2.2,4);GH.x+=nx*1.7*DF.dash;GH.z+=nz*1.7*DF.dash;if(SFX.whisper)ghostNear=Math.min(1,ghostNear+.4);}
            }else{
              const wx=GH.wx-GH.x,wz=GH.wz-GH.z,wd=Math.hypot(wx,wz);
              if(wd<1)newWander();else{GH.x+=wx/wd*1.3*dt;GH.z+=wz/wd*1.3*dt;}
            }
          }
        }
        GH.x=clamp(GH.x,-HW+.6,HW-.6);GH.z=clamp(GH.z,-HD+.6,HD-.6);
        ghostSeT-=dt;
        if(dist<8&&ghostSeT<=0&&!lit){se('ghost');ghostSeT=7;}
        // 接触
        if(dist<.95&&GH.fade>.6&&GH.cool<=0){
          S.hits++;S.battery=Math.max(0,S.battery-HIT_DMG);
          P.hitT=1;P.shake=1;GH.cool=2;
          wrap.classList.add('factory3d-hit');se('warn');thump(0,.5);
          toast(`影に触れられた　電池 -${HIT_DMG}%`,'bad');
          if(S.battery<=0){endWith('down');return;}
          placeGhostFar(P.x,P.z,22);
        }
        const prox=clamp(1-(dist-1)/8,0,1)*GH.fade;
        ghostNear+=(prox-ghostNear)*Math.min(1,dt*3);
        el.red.style.opacity=String(Math.max(ghostNear*(lit?.25:.5),P.hitT*.9));
      }

      // 毎フレームの演出
      function world(dt){
        // カメラ（頭の揺れ・被弾時の揺れ）
        P.hitT=Math.max(0,P.hitT-dt*1.1);P.shake=Math.max(0,P.shake-dt*1.6);
        if(P.hitT<=0&&glitchT<=0)wrap.classList.remove('factory3d-hit');
        const bobY=Math.sin(P.bob)*.045*P.bobAmt,bobX=Math.cos(P.bob*.5)*.03*P.bobAmt;
        const sh=P.shake*P.shake;
        const rxx=Math.cos(P.yaw),rzz=-Math.sin(P.yaw);
        camera.position.set(P.x+rxx*bobX+rnd(-1,1)*sh*.06,EYE+bobY+rnd(-1,1)*sh*.05,P.z+rzz*bobX);
        camera.rotation.set(P.pitch+rnd(-1,1)*sh*.03,P.yaw,Math.cos(P.bob*.5)*.008*P.bobAmt+Math.sin(tAll*13)*sh*.06);
        const fov=72+Math.sin(tAll*20)*P.hitT*6+P.hitT*8+(focusing?-4:0);
        if(Math.abs(camera.fov-fov)>.05){camera.fov+=(fov-camera.fov)*Math.min(1,dt*10);camera.updateProjectionMatrix();}
        // 懐中電灯
        const bf=S.battery/100;
        let inten=FL_MAX*(.3+.7*Math.min(1,bf*1.4+.1))*(focusing?1.8:1);
        if(bf<.25&&Math.random()<.09)inten*=rnd(.05,.5);
        if(P.hitT>.3&&Math.random()<.4)inten*=.1;
        if(S.phase==='over'&&S.endReason==='down')inten=Math.max(0,overT-.6)*FL_MAX*(Math.random()<.5?1:.15);
        spot.intensity=inten;
        const ang=focusing?.27:.4+.08*Math.min(1,bf*1.5);
        spot.angle+=(ang-spot.angle)*Math.min(1,dt*10);
        spotTarget.position.set(clamp(-P.swayX,-1.2,1.2)+Math.sin(tAll*1.3)*.04,clamp(-P.swayY,-1,1)+Math.sin(tAll*1.7)*.03-.25-bobY*2,-6);
        fbeam.lookAt(camera.localToWorld(spotTarget.position.clone()));
        const bs=spot.angle/.48;fbeam.scale.set(bs,bs,1);
        fbMat.opacity=.05*(inten/FL_MAX);
        dustMat.opacity=.32*Math.min(1.4,inten/FL_MAX)*(S.phase==='play'||S.phase==='over'?1:.4);
        for(let i=0;i<DUST;i++){
          dustPos[i*3]+=dustVel[i*3]*dt;dustPos[i*3+1]+=dustVel[i*3+1]*dt;dustPos[i*3+2]+=dustVel[i*3+2]*dt;
          if(dustPos[i*3+1]<-2.5||Math.abs(dustPos[i*3])>3.5)seedDust(i);
        }
        dustGeo.attributes.position.needsUpdate=true;
        // 回転灯（追跡段階で速くなる）
        const bspd=S.tension>=2?6:3.2;
        beacons.forEach(b=>{
          b.ph+=dt*bspd;b.rot.rotation.y=b.ph;
          if(b.light)b.light.intensity=(1.5+4*Math.abs(Math.cos(b.ph)))*(S.tension>=2?1.4:1);
        });
        // 雷
        lightT-=dt;
        if(lightT<=0&&S.phase!=='title'){lightning(rnd(.6,1));thunder(rnd(.3,1.2));lightT=S.tension>=2?rnd(4,8):rnd(7,14);}
        flashV=Math.max(0,flashV-dt*5);
        if(lightSeq.length){lightSeq.forEach(s=>{s.t-=dt;if(s.t<=0&&!s.fired){s.fired=true;flashV=Math.max(flashV,s.v);}});if(lightSeq.every(s=>s.fired))lightSeq=[];}
        // 復電（クリア・時間切れ）
        if(S.power)powerV=Math.min(1,powerV+dt*.9);
        hemi.intensity=.62+flashV*3+powerV*1.6;
        if(powerV>0){hemi.color.setRGB(.16+powerV*.84,.2+powerV*.76,.4+powerV*.5);hemi.groundColor.setRGB(.05+powerV*.25,.03+powerV*.22,.06+powerV*.2);M.lampOff.color.setRGB(.08+powerV*.92,.08+powerV*.88,.1+powerV*.7);scene.fog.density=.052-powerV*.026;}
        M.glass.color.setRGB(.35+flashV*.65,.41+flashV*.59,.63+flashV*.37);
        M.shaft.opacity=.045+flashV*.32;
        if(!(S.phase==='over'&&S.endReason==='clear'))el.flash.style.opacity=String(flashV*.22);
        T.rain.offset.y=(T.rain.offset.y+dt*.35)%1;
        // 蛍光灯のちらつき
        tubes.forEach(t=>{t.t-=dt;const onv=powerV>.5||(t.t<0&&Math.random()<.5);if(t.t<-.25)t.t=rnd(1.5,5);t.mat.color.setScalar(onv?.95:.08);t.gl.material.opacity=onv?.5:0;});
        // 火花
        spkT-=dt;if(spkT<=0){burstSparks();spkT=rnd(2.5,6);}
        spkGlow.material.opacity=Math.max(0,spkGlow.material.opacity-dt*4);
        for(let i=0;i<SPK;i++){
          if(spkLife[i]<=0)continue;
          spkLife[i]-=dt;spkVel[i*3+1]-=9.8*dt;
          spkPos[i*3]+=spkVel[i*3]*dt;spkPos[i*3+1]+=spkVel[i*3+1]*dt;spkPos[i*3+2]+=spkVel[i*3+2]*dt;
          if(spkPos[i*3+1]<.02){spkPos[i*3+1]=.02;spkVel[i*3+1]*=-.3;spkVel[i*3]*=.5;spkVel[i*3+2]*=.5;}
          if(spkLife[i]<=0)spkPos[i*3+1]=-50;
        }
        spkGeo.attributes.position.needsUpdate=true;
        // 雨漏り
        drips.forEach(d=>{
          if(d.y<0){d.wait-=dt;d.drop.visible=false;if(d.wait<=0){d.y=WALL_H-1.2;d.vy=0;d.drop.visible=true;}}
          else{d.vy-=9.8*dt;d.y+=d.vy*dt;d.drop.position.set(d.x,d.y,d.z);
            if(d.y<=.03){d.y=-1;d.wait=rnd(.8,2.2);d.rt=0;const dd=Math.hypot(d.x-P.x,d.z-P.z);if(dd<9&&S.phase==='play')plink(.05*(1-dd/9));}}
          if(d.rt<1){d.rt+=dt*1.4;const s=.05+d.rt*.45;d.ring.scale.set(s,1,s);d.ring.material.opacity=(1-d.rt)*.5;}
        });
        // 計器
        gauges.forEach(g=>{
          let a;
          if(g.done)a=g.target+Math.sin(tAll*3+g.i)*.02;
          else if(g.prog>0)a=g.base*(1-g.prog)+g.target*g.prog+Math.sin(tAll*38)*.25*(1-g.prog);
          else a=g.base+Math.sin(tAll*7+g.i)*.05;
          g.ang+=(a-g.ang)*Math.min(1,dt*12);
          g.pivot.rotation.z=-g.ang*2.2;
          if(!g.done){const p=.5+.5*Math.sin(tAll*4+g.i);g.lampGlow.material.opacity=.3+.6*p;g.marker.position.y=2.35+Math.sin(tAll*2.2+g.i)*.08;g.marker.visible=Math.hypot(g.x-P.x,g.z-P.z)>3.2;}
          if(g.tickT>0){g.tickT-=dt;g.tick.position.y=2+(1.8-g.tickT)*.3;g.tick.material.opacity=Math.min(1,g.tickT*1.5);if(g.tickT<=0)g.tick.visible=false;}
        });
        // 予備電池
        bats.forEach(b=>{if(b.taken)return;b.g.position.y=.5+Math.sin(tAll*2.5+b.ph)*.08;b.g.rotation.y+=dt*1.6;});
        // 非常口
        if(S.inspected>=NEED){exitLight.intensity=4+2*Math.sin(tAll*4);exitGlow.material.opacity=.8+.2*Math.sin(tAll*4);}
        else{exitLight.intensity=1.5;exitGlow.material.opacity=.55;}
        if(doorOpen>0){door.userData.slab.rotation.y=-doorOpen*1.4;door.userData.slab.position.x=-doorOpen*.6;}
        // 影の見た目
        if(S.power&&S.endReason!=='down')GH.fade=Math.max(0,GH.fade-dt*1.5);
        ghost.visible=GH.fade>.02;
        if(ghost.visible){
          const jit=(S.tension>=2&&Math.random()<.04)?rnd(-.12,.12):0;
          ghost.position.set(GH.x+jit,.04+Math.sin(tAll*1.7)*.06,GH.z);
          ghost.rotation.y=Math.atan2(P.x-GH.x,P.z-GH.z);
          const sr=GH.shroud;
          const flick=burning?(Math.random()<.5?.3:.85):1;
          ghostMat.opacity=.94*GH.fade*flick;ragMat.opacity=.9*GH.fade*flick;
          auraMat.opacity=(.55+(1-sr)*.45)*GH.fade*flick;
          auraMat.color.setRGB(.48+(1-sr)*.5,.16+(1-sr)*.25,.63-(1-sr)*.2);
          smoke.material.opacity=.7*GH.fade;
          eyeMat.color.setRGB(1,.16,.28).multiplyScalar(GH.fade);eyeGlowMat.opacity=.9*GH.fade*flick;
          const sc=.8+.2*sr;
          ghost.scale.set(sc*(1+Math.sin(tAll*3)*.03),sc*(1+Math.sin(tAll*2.3)*.02)*(1+(S.tension>=2?.08:0)),sc);
          arms.forEach((a,i)=>{a.rotation.x=Math.sin(tAll*1.4+i)*.15-(ghostNear>.6?.9*ghostNear:0);});
          rags.forEach((m,i)=>{m.rotation.x=Math.sin(tAll*3+i*1.7)*.35;});
          head.rotation.z=Math.sin(tAll*.9)*.25+(Math.random()<.02?rnd(-.5,.5):0);
          for(let i=0;i<WIS;i++){
            wisLife[i]+=dt*(burning?1.4:.45);if(wisLife[i]>1)wisLife[i]=0;
            const l=wisLife[i],a=i*2.4+l*2;
            wisPos[i*3]=Math.cos(a)*(.25+l*.3);wisPos[i*3+1]=l*2.1;wisPos[i*3+2]=Math.sin(a)*(.25+l*.3);
          }
          wisGeo.attributes.position.needsUpdate=true;wisMat.opacity=.6*GH.fade;
          wisMat.color.setHex(burning?0x8a3ab0:0x140a1e);wisMat.blending=burning?THREE.AdditiveBlending:THREE.NormalBlending;
        }
      }
      // テスト用フック（localStorage factory3d_debug=1 のときだけ）
      try{if(localStorage.getItem('factory3d_debug')==='1')window.__f3d={S,P,GH,gauges,bats,exit:{x:exitX,z:exitZ},inp,renderer,DATA,adv:()=>advance(),skip:()=>{advance(true);},start:()=>{if(S.phase!=='play'){goHowto();startPlay();}},setTension,endWith,tick:(n,dt)=>{for(let i=0;i<n&&!S.disposed&&!mg._ended;i++)frame(dt||.05,false);}};}catch(e){}
    }

    // ══════════════════════════════════════════════════════
    // 結果（報酬は結末の種類で決まる。評価演出の後でも同じ）
    // ══════════════════════════════════════════════════════
    return {result(reason){
      if(S.endReason&&reason==='quit')reason=S.endReason;
      cleanup();
      const n=S.inspected;
      const stat=`評価 <span class="up">${S.grade||'-'}</span>　点検 <span class="${n>=NEED?'up':'down'}">${n}/${NEED}</span>　電池 <span class="up">${Math.ceil(S.battery)}%</span>`+
        `<br>影との接触 <span class="${S.hits?'down':'up'}">${S.hits}</span>　撃退 <span class="up">${S.repels}</span>　経過 ${Math.round(S.elapsed)}秒`;
      if(reason==='clear'){
        return {
          title:'🏭 第三工場、点検完了',summary:stat+'<br>停電の闇の中、全計器を確認して非常口から脱出した。',
          fx:{jobRep:10,certKnow:4,money:6000,mental:3,fatigue:8},time:70,sp:2,
          log:'停電した第三工場で計器5か所を点検した。暗がりに、確かに何かがいた。',
          cutin:['win','……全部異常なし。あの影のことは、報告書には書かれへんな。'],
          after(){gs.factoryNetaAvail=true;gs.factoryNetaType='第三工場の影';},
        };
      }
      if(reason==='down'){
        return {
          title:'🔦 ライトが消えた',summary:stat+'<br>電池が尽き、闇の中で何かに肩を掴まれた――気がした。',
          fx:{jobRep:n*2,mental:-8,fatigue:9},time:70,
          log:'第三工場の点検中に懐中電灯が切れた。あの影は何だったのか。',
          cutin:['fear','……真っ暗や。今、誰か後ろにおったよな……？'],
        };
      }
      if(reason==='timeup'){
        return {
          title:'⏱ 点検、時間切れ',summary:stat+'<br>復電の時刻に間に合わなかった。点検できた分だけ報告する。',
          fx:{jobRep:n*2,money:n*1000,fatigue:8},time:70,
          log:`停電中の第三工場で計器を${n}か所点検した。時間が足りなかった。`,
          cutin:['tired','……間に合わんかった。残りは朝番に引き継ぎや。'],
        };
      }
      return {
        title:'🏭 点検を切り上げた',summary:S.phase==='load'||S.phase==='title'||S.phase==='story'||S.phase==='howto'?'':stat,
        fx:{fatigue:3},time:30,log:'停電した工場の見回りを途中で切り上げた。',cutin:null,
      };
    }};
  },
});
