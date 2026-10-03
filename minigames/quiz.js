// ══════════════════════════════════════════════════════════
// クイズ「危険物取扱者 一問一答」（乙種第4類）
// 深夜の勉強机。ランプの明かりの下で4択を10問。
// 1問15秒・連続正解でコンボ倍率・解説つき。
// 出題は資格知識(gs.certKnow)で難易度を寄せ、間違えた問題は gs.quizData に記録して出やすくする。
// 背景（窓の雨・ランプ・子どもの絵）と演出パーティクルはCanvas 2D、問題UIはDOM。
// ══════════════════════════════════════════════════════════
addMinigameStyle('quiz',`
.mg-quiz{padding:0;}
.quiz-root{position:relative;flex:1;min-height:0;width:100%;display:flex;flex-direction:column;overflow:hidden;font-family:var(--serif);user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;}
.quiz-bg,.quiz-fx{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;}
.quiz-fx{z-index:30;}
.quiz-scene{flex:1 1 auto;min-height:40px;position:relative;z-index:2;}
.quiz-hud{display:flex;align-items:center;gap:6px;padding:9px 12px 0;flex-wrap:wrap;}
.quiz-area{font-family:var(--dot);font-size:.68rem;letter-spacing:.06em;padding:3px 8px;border-radius:3px;border:1px solid currentColor;background:rgba(5,4,14,.72);box-shadow:0 0 10px -2px currentColor;transition:color .3s;}
.quiz-area.L{color:var(--cy);}.quiz-area.P{color:#b98cff;}.quiz-area.S{color:var(--gd);}
.quiz-qn{font-family:var(--mono);font-size:.74rem;color:var(--tx-b);background:rgba(5,4,14,.72);padding:3px 7px;border-radius:3px;}
.quiz-qn b{color:var(--cy);font-weight:normal;}
.quiz-review{font-family:var(--dot);font-size:.6rem;color:#ff8aa0;border:1px dashed rgba(232,48,85,.7);padding:2px 6px;border-radius:3px;background:rgba(40,6,16,.7);display:none;}
.quiz-review.on{display:inline-block;animation:quiz-blink 1.4s ease-in-out infinite;}
.quiz-combo{margin-left:auto;font-family:var(--dot);font-size:.78rem;color:var(--gd);background:rgba(5,4,14,.78);padding:3px 9px;border-radius:12px;border:1px solid rgba(232,184,48,.5);text-shadow:0 0 8px rgba(232,184,48,.8);opacity:0;transform:scale(.6);transition:opacity .25s,transform .25s;}
.quiz-combo.on{opacity:1;transform:scale(1);}
.quiz-combo.bump{animation:quiz-bump .45s cubic-bezier(.2,1.6,.4,1);}
.quiz-combo small{font-family:var(--mono);color:var(--tx-b);margin-left:4px;font-size:.7rem;}
.quiz-main{flex:0 0 auto;position:relative;z-index:2;padding:0 12px 12px;display:flex;flex-direction:column;gap:8px;}
.quiz-timer{position:relative;height:12px;display:flex;align-items:center;gap:8px;}
.quiz-timer-track{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.06);box-shadow:inset 0 1px 2px rgba(0,0,0,.6);position:relative;}
.quiz-timer-fill{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:4px 0 0 4px;background:linear-gradient(#f6d35e,#d49a22);box-shadow:0 0 8px rgba(232,184,48,.45);}
.quiz-timer-fill::after{content:'';position:absolute;right:-9px;top:0;border-left:9px solid #e9cfa0;border-top:4px solid transparent;border-bottom:4px solid transparent;}
.quiz-timer-fill::before{content:'';position:absolute;right:-9px;top:3px;width:3px;height:2px;background:#2a2238;border-radius:1px;}
.quiz-timer.low .quiz-timer-fill{background:linear-gradient(#ff6a84,#c4183c);box-shadow:0 0 12px rgba(232,48,85,.8);animation:quiz-pulse .5s ease-in-out infinite alternate;}
.quiz-timer-n{font-family:var(--mono);font-size:.78rem;color:var(--tx-b);min-width:26px;text-align:right;}
.quiz-timer.low .quiz-timer-n{color:#ff6a84;}
.quiz-card{position:relative;min-height:116px;padding:9px 12px 12px 34px;border-radius:3px;color:#2a2238;transform:rotate(-.6deg);
  background:radial-gradient(ellipse at 85% -10%,rgba(255,214,150,.55),transparent 65%),repeating-linear-gradient(180deg,transparent 0 25px,rgba(70,100,170,.28) 25px 26px),linear-gradient(#ece3cc,#d9cfb5);
  background-position:0 0,0 6px,0 0;box-shadow:0 10px 24px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.25),0 0 40px -10px rgba(255,190,110,.35);}
.quiz-card::before{content:'';position:absolute;left:24px;top:0;bottom:0;width:1px;background:rgba(220,60,80,.55);box-shadow:3px 0 0 rgba(220,60,80,.25);}
.quiz-card::after{content:'';position:absolute;left:50%;top:-8px;width:62px;height:16px;margin-left:-31px;background:rgba(200,220,255,.28);transform:rotate(2deg);box-shadow:0 1px 2px rgba(0,0,0,.2);}
.quiz-card.enter{animation:quiz-cardin .45s cubic-bezier(.2,1,.3,1);}
.quiz-card-head{display:flex;align-items:baseline;gap:8px;height:22px;}
.quiz-card-no{font-family:var(--dot);font-size:1rem;color:#c8243f;}
.quiz-card-diff{font-family:var(--mono);font-size:.7rem;color:#8a7a5a;letter-spacing:.1em;}
.quiz-card-area{margin-left:auto;font-family:var(--dot);font-size:.6rem;color:#6a5c80;}
.quiz-card-q{font-size:.95rem;line-height:26px;font-weight:600;margin-top:4px;}
.quiz-bigmark{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;pointer-events:none;overflow:visible;}
.quiz-bigmark path{fill:none;stroke:rgba(214,30,60,.62);stroke-width:9;stroke-linecap:round;stroke-dasharray:520;stroke-dashoffset:520;}
.quiz-bigmark.on path{animation:quiz-draw .5s cubic-bezier(.4,0,.2,1) forwards;}
.quiz-stamp{position:absolute;right:10px;bottom:8px;font-family:var(--dot);font-size:.95rem;color:#c8243f;border:3px double #c8243f;padding:2px 8px;border-radius:4px;transform:rotate(-12deg) scale(2.2);opacity:0;pointer-events:none;}
.quiz-stamp.on{animation:quiz-stamp .35s cubic-bezier(.3,1.4,.5,1) forwards;}
.quiz-choices{display:grid;gap:7px;}
.quiz-ch{position:relative;display:flex;align-items:center;gap:10px;min-height:52px;padding:8px 46px 8px 10px;text-align:left;cursor:pointer;color:var(--tx-b);font-family:var(--serif);font-size:.86rem;line-height:1.45;border-radius:7px;border:1px solid rgba(138,82,212,.38);
  background:linear-gradient(180deg,rgba(28,20,52,.94),rgba(13,9,28,.94));box-shadow:0 4px 12px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.05);transition:transform .12s,border-color .2s,background .25s,opacity .3s,box-shadow .25s;-webkit-tap-highlight-color:transparent;}
.quiz-ch.enter{animation:quiz-chin .4s cubic-bezier(.2,1,.3,1) backwards;}
.quiz-ch:hover{border-color:rgba(0,232,200,.6);}
.quiz-ch:active{transform:scale(.975);}
.quiz-ch:disabled{cursor:default;}
.quiz-ch-n{flex:0 0 auto;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:.82rem;border:1.5px solid var(--c);color:var(--c);box-shadow:0 0 8px -2px var(--c);background:rgba(0,0,0,.35);}
.quiz-ch-t{flex:1;}
.quiz-ch.is-correct{border-color:var(--gn);background:linear-gradient(180deg,rgba(20,70,48,.95),rgba(8,36,26,.95));box-shadow:0 0 18px -2px rgba(68,238,136,.55),inset 0 0 18px rgba(68,238,136,.12);}
.quiz-ch.is-wrong{border-color:var(--rd);background:linear-gradient(180deg,rgba(72,14,30,.95),rgba(34,6,16,.95));animation:quiz-shakex .4s;}
.quiz-ch.is-dim{opacity:.38;}
.quiz-mark{position:absolute;right:6px;top:50%;width:40px;height:40px;margin-top:-20px;overflow:visible;pointer-events:none;}
.quiz-mark path{fill:none;stroke:#ff2d55;stroke-width:4.5;stroke-linecap:round;stroke-dasharray:140;stroke-dashoffset:140;filter:drop-shadow(0 0 3px rgba(255,45,85,.6));}
.quiz-mark.ok path{stroke:#ff3b5c;}
.quiz-mark.on path{animation:quiz-draw .38s ease-out forwards;}
.quiz-mark.on path+path{animation-delay:.16s;}
.quiz-light{position:absolute;inset:0;z-index:3;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(ellipse 75% 60% at 80% 18%,rgba(255,196,120,.13),transparent 70%);animation:quiz-flicker 7s infinite;}
.quiz-sheet{position:absolute;left:8px;right:8px;bottom:8px;z-index:8;max-height:66%;overflow-y:auto;padding:12px 14px 12px;border-radius:10px;background:rgba(10,7,22,.97);border:1px solid rgba(138,82,212,.5);border-top:3px solid var(--sc,var(--cy));box-shadow:0 -10px 30px rgba(0,0,0,.6),0 0 30px -12px var(--sc,var(--cy));transform:translateY(120%);transition:transform .38s cubic-bezier(.2,1,.3,1);}
.quiz-sheet:not(.on){transform:translateY(calc(100% + 40px));visibility:hidden;transition:transform .3s,visibility 0s .3s;}
.quiz-sheet.on{transform:translateY(0);}
.quiz-pre .quiz-main,.quiz-pre .quiz-hud,.quiz-pre .quiz-who{opacity:0;pointer-events:none;}
.quiz-main,.quiz-hud,.quiz-who{transition:opacity .4s;}
.quiz-f-hist{display:flex;align-items:flex-end;gap:4px;height:34px;margin-top:4px;}
.quiz-f-hist i{flex:1;max-width:22px;background:rgba(58,42,88,.35);border-radius:2px 2px 0 0;position:relative;transform-origin:bottom;animation:quiz-grow .6s cubic-bezier(.2,1,.3,1) backwards;}
.quiz-f-hist i.now{background:#c8243f;}
.quiz-f-hist i.mk{background:repeating-linear-gradient(45deg,#3a2a58 0 3px,#5a4c80 3px 6px);}
.quiz-f-hist i.mk.now{background:repeating-linear-gradient(45deg,#c8243f 0 3px,#e05a70 3px 6px);}
.quiz-f-hist i b{position:absolute;top:-13px;left:0;right:0;text-align:center;font:normal .56rem var(--mono);color:#4a3c60;}
.quiz-f-rank{margin-top:8px;font-size:.72rem;color:#3a2a58;display:flex;align-items:center;gap:6px;}
.quiz-f-rank b{font-family:var(--dot);font-weight:normal;color:#c8243f;font-size:.9rem;}
.quiz-f-rbar{flex:1;height:6px;border-radius:3px;background:rgba(58,42,88,.15);overflow:hidden;}
.quiz-f-rbar i{display:block;height:100%;background:linear-gradient(90deg,#e8b830,#c8243f);}
.quiz-rup{font-family:var(--dot);font-size:.66rem;color:#fff;background:#e8b830;padding:1px 6px;border-radius:2px;animation:quiz-blink 1s infinite;}
@keyframes quiz-grow{from{transform:scaleY(0);}}
.quiz-verdict{font-family:var(--dot);font-size:1.25rem;letter-spacing:.08em;color:var(--sc);text-shadow:0 0 12px var(--sc);display:flex;align-items:baseline;gap:10px;}
.quiz-verdict small{font-family:var(--mono);font-size:.74rem;color:var(--gd);text-shadow:none;margin-left:auto;}
.quiz-ans{margin-top:6px;font-size:.8rem;color:var(--tx-b);padding:5px 8px;border-left:3px solid var(--gn);background:rgba(68,238,136,.07);}
.quiz-ans b{color:var(--gn);font-weight:600;}
.quiz-exp{margin-top:7px;font-size:.78rem;line-height:1.75;color:var(--tx);}
.quiz-exp::before{content:'✎ 解説　';font-family:var(--dot);color:var(--gd);font-size:.72rem;}
.quiz-btn{display:block;width:100%;margin-top:10px;min-height:48px;border-radius:7px;border:1px solid var(--cy);background:linear-gradient(180deg,rgba(0,232,200,.2),rgba(0,232,200,.07));color:var(--tx-b);font-family:var(--dot);font-size:.92rem;letter-spacing:.08em;cursor:pointer;box-shadow:0 0 16px -4px rgba(0,232,200,.6);transition:transform .1s,background .2s;}
.quiz-btn:active{transform:scale(.97);}
.quiz-btn:hover{background:linear-gradient(180deg,rgba(0,232,200,.3),rgba(0,232,200,.1));}
.quiz-btn small{font-family:var(--mono);font-size:.62rem;color:var(--tx-d);margin-left:6px;}
.quiz-pop{position:absolute;z-index:25;pointer-events:none;font-family:var(--dot);font-size:1.05rem;color:var(--gd);text-shadow:0 0 10px rgba(232,184,48,.9),0 2px 0 #000;white-space:nowrap;animation:quiz-popup 1.1s ease-out forwards;}
.quiz-pop.bad{color:#ff6a84;text-shadow:0 0 10px rgba(232,48,85,.9),0 2px 0 #000;}
.quiz-banner{position:absolute;left:0;right:0;top:34%;z-index:26;pointer-events:none;text-align:center;font-family:var(--dot);font-size:1.7rem;letter-spacing:.12em;color:#fff3c8;text-shadow:0 0 14px var(--gd),0 0 30px var(--gd),0 3px 0 #000;opacity:0;}
.quiz-banner.on{animation:quiz-banner 1.2s cubic-bezier(.2,1,.3,1) forwards;}
.quiz-banner::before,.quiz-banner::after{content:'';display:block;height:2px;margin:6px auto;width:70%;background:linear-gradient(90deg,transparent,var(--gd),transparent);}
.quiz-ov{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(5,4,14,.62);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity .35s;}
.quiz-ov.on{opacity:1;pointer-events:auto;}
.quiz-paper{position:relative;width:100%;max-width:360px;max-height:100%;overflow-y:auto;color:#2a2238;padding:16px 16px 14px 34px;border-radius:4px;transform:rotate(-.8deg);
  background:radial-gradient(ellipse at 80% -10%,rgba(255,214,150,.5),transparent 60%),repeating-linear-gradient(180deg,transparent 0 25px,rgba(70,100,170,.25) 25px 26px),linear-gradient(#ece3cc,#d6ccb1);background-position:0 0,0 10px,0 0;box-shadow:0 14px 34px rgba(0,0,0,.7),0 0 50px -10px rgba(255,190,110,.4);}
.quiz-ov.on .quiz-paper{animation:quiz-cardin .5s cubic-bezier(.2,1,.3,1);}
.quiz-paper::before{content:'';position:absolute;left:24px;top:0;bottom:0;width:1px;background:rgba(220,60,80,.55);box-shadow:3px 0 0 rgba(220,60,80,.25);}
.quiz-p-title{font-family:var(--dot);font-size:1.08rem;color:#3a2a58;letter-spacing:.04em;line-height:1.4;}
.quiz-p-title small{display:block;font-family:var(--mono);font-size:.62rem;color:#8a7a5a;letter-spacing:.12em;}
.quiz-p-list{margin:10px 0 4px;padding:0;list-style:none;font-size:.8rem;line-height:26px;}
.quiz-p-list li::before{content:'✓ ';color:#c8243f;font-weight:bold;}
.quiz-p-list kbd{font-family:var(--mono);font-size:.7rem;border:1px solid #8a7a5a;border-radius:3px;padding:0 4px;background:rgba(255,255,255,.4);}
.quiz-p-note{font-size:.72rem;line-height:1.6;color:#5a4c70;margin-top:4px;}
.quiz-p-note b{color:#c8243f;}
.quiz-paper .quiz-btn{color:#f2ecff;background:linear-gradient(180deg,#3a2a68,#22183f);border-color:#22183f;box-shadow:0 4px 10px rgba(0,0,0,.35);}
.quiz-paper .quiz-btn small{color:#b8a8d8;}
.quiz-f-top{display:flex;align-items:center;gap:10px;margin-top:6px;}
.quiz-f-num{position:relative;font-family:var(--dot);font-size:3rem;line-height:1;color:#c8243f;min-width:74px;text-align:center;padding:8px 4px;}
.quiz-f-num svg{position:absolute;inset:-8px -6px;width:calc(100% + 12px);height:calc(100% + 16px);overflow:visible;}
.quiz-f-num path{fill:none;stroke:rgba(200,36,63,.75);stroke-width:3.5;stroke-linecap:round;stroke-dasharray:400;stroke-dashoffset:400;animation:quiz-draw .7s .3s ease-out forwards;}
.quiz-f-num small{font-size:.9rem;color:#6a5c80;}
.quiz-f-sc{font-family:var(--mono);font-size:.78rem;color:#4a3c60;line-height:1.7;}
.quiz-f-sc b{font-family:var(--dot);font-size:1.25rem;color:#2a2238;font-weight:normal;}
.quiz-f-new{display:inline-block;font-family:var(--dot);font-size:.7rem;color:#fff;background:#c8243f;padding:1px 6px;border-radius:2px;margin-left:4px;animation:quiz-blink 1s infinite;}
.quiz-f-stamp{position:absolute;right:12px;top:12px;font-family:var(--dot);font-size:.95rem;color:#c8243f;border:3px double #c8243f;border-radius:50%;width:66px;height:66px;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.1;transform:rotate(14deg) scale(2.4);opacity:0;}
.quiz-ov.on .quiz-f-stamp{animation:quiz-stamp2 .4s 1.1s cubic-bezier(.3,1.4,.5,1) forwards;}
.quiz-f-stamp.mid{color:#b07a10;border-color:#b07a10;}
.quiz-f-stamp.low{color:#5a4c90;border-color:#5a4c90;}
.quiz-f-areas{margin-top:12px;display:grid;gap:6px;}
.quiz-f-row{display:grid;grid-template-columns:70px 1fr 66px;align-items:center;gap:6px;font-size:.72rem;}
.quiz-f-lab{font-family:var(--dot);color:#3a2a58;}
.quiz-f-bar{position:relative;height:12px;border-radius:2px;background:rgba(58,42,88,.14);overflow:hidden;}
.quiz-f-bar i{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--c);transition:width .9s cubic-bezier(.2,1,.3,1);}
.quiz-f-bar::after{content:'';position:absolute;left:60%;top:-2px;bottom:-2px;border-left:2px dashed rgba(200,36,63,.7);}
.quiz-f-val{font-family:var(--mono);font-size:.66rem;color:#4a3c60;text-align:right;white-space:nowrap;}
.quiz-f-cm{margin-top:10px;font-size:.78rem;line-height:1.7;color:#3a2a58;border-top:1px dashed rgba(58,42,88,.3);padding-top:8px;}
.quiz-shake{animation:quiz-shake .38s;}
.quiz-card.out{animation:quiz-cardout .26s cubic-bezier(.5,0,.8,.4) forwards;}
.quiz-timer-track::before{content:'';position:absolute;left:-5px;top:-1px;bottom:-1px;width:7px;border-radius:3px 0 0 3px;background:linear-gradient(#f3a3b5,#d6798d);box-shadow:inset -2px 0 0 #b8b8c8;z-index:1;}
.quiz-who{position:absolute;right:12px;bottom:6px;display:flex;align-items:flex-end;gap:6px;pointer-events:none;z-index:2;}
.quiz-face{width:58px;height:58px;border-radius:50%;background:#e9e0f6 center/cover no-repeat;border:2px solid rgba(255,200,130,.75);box-shadow:0 0 0 3px rgba(5,4,14,.8),0 0 18px rgba(255,190,110,.45);transition:transform .2s;}
.quiz-face.hop{animation:quiz-hop .4s cubic-bezier(.3,1.6,.5,1);}
.quiz-face.sad{animation:quiz-sad .5s;}
.quiz-bub{max-width:168px;font-family:var(--dot);font-size:.72rem;line-height:1.45;color:#2a2238;background:#f1ead8;padding:6px 9px;border-radius:9px 9px 2px 9px;box-shadow:0 3px 10px rgba(0,0,0,.5);opacity:0;transform:translateY(6px) scale(.9);transition:opacity .2s,transform .2s;margin-bottom:18px;}
.quiz-bub.on{opacity:1;transform:none;}
.quiz-phase{position:absolute;left:0;right:0;top:38%;z-index:27;pointer-events:none;height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(90deg,transparent,rgba(10,7,22,.94) 12%,rgba(10,7,22,.94) 88%,transparent);border-top:1px solid var(--pc);border-bottom:1px solid var(--pc);clip-path:inset(0 100% 0 0);}
.quiz-phase.on{animation:quiz-wipe 1.5s cubic-bezier(.6,0,.2,1) forwards;}
.quiz-phase b{font-family:var(--dot);font-size:1.45rem;letter-spacing:.2em;color:#fff;text-shadow:0 0 14px var(--pc),0 0 26px var(--pc);font-weight:normal;}
.quiz-phase small{font-family:var(--mono);font-size:.66rem;letter-spacing:.3em;color:var(--pc);}
.quiz-title{position:absolute;inset:0;z-index:21;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:18px;text-align:center;background:radial-gradient(ellipse at 50% 38%,rgba(40,24,70,.55),rgba(5,4,14,.9) 70%);transition:opacity .45s;}
.quiz-title.off{opacity:0;pointer-events:none;}
.quiz-logo{position:relative;padding:14px 18px 12px;}
.quiz-logo-badge{display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border:3px solid var(--rd);border-radius:12px;color:var(--rd);font-family:var(--dot);font-size:1.25rem;line-height:1;transform:rotate(-8deg);box-shadow:0 0 18px rgba(232,48,85,.6),inset 0 0 12px rgba(232,48,85,.3);background:rgba(30,6,14,.6);animation:quiz-stamp .5s .15s cubic-bezier(.3,1.4,.5,1) backwards;}
.quiz-logo-badge span{display:block;font-family:var(--mono);font-size:.5rem;letter-spacing:.04em;margin-top:4px;}
.quiz-logo-ttl{font-family:var(--dot);font-size:1.9rem;letter-spacing:.1em;color:#fff6e0;text-shadow:0 0 10px rgba(255,190,110,.9),0 0 30px rgba(232,184,48,.6),0 3px 0 #2a1a40;margin-top:8px;animation:quiz-chin .6s .35s backwards;}
.quiz-logo-ttl em{font-style:normal;color:var(--cy);text-shadow:0 0 10px var(--cy),0 0 26px var(--cy),0 3px 0 #002a26;}
.quiz-logo-sub{font-family:var(--serif);font-size:.74rem;letter-spacing:.2em;color:var(--tx);animation:quiz-chin .6s .5s backwards;}
.quiz-logo svg{display:block;margin:4px auto 0;width:210px;height:12px;overflow:visible;}
.quiz-logo svg path{fill:none;stroke:var(--gd);stroke-width:3;stroke-linecap:round;stroke-dasharray:260;stroke-dashoffset:260;animation:quiz-draw .6s .7s ease-out forwards;filter:drop-shadow(0 0 4px rgba(232,184,48,.8));}
.quiz-modes{display:grid;gap:8px;width:100%;max-width:300px;animation:quiz-chin .5s .8s backwards;}
.quiz-mode{min-height:54px;border-radius:8px;border:1px solid var(--mc);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.01));color:var(--tx-b);font-family:var(--dot);font-size:.95rem;letter-spacing:.06em;cursor:pointer;box-shadow:0 0 16px -5px var(--mc);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}
.quiz-mode small{font-family:var(--serif);font-size:.62rem;color:var(--tx);letter-spacing:0;}
.quiz-mode:active{transform:scale(.97);}
.quiz-mode:disabled{opacity:.4;cursor:default;box-shadow:none;}
.quiz-rec{font-family:var(--mono);font-size:.64rem;color:var(--tx-d);letter-spacing:.06em;animation:quiz-chin .5s 1s backwards;}
.quiz-story{position:absolute;inset:0;z-index:22;display:flex;flex-direction:column;justify-content:flex-end;padding:14px;background:linear-gradient(180deg,rgba(5,4,14,.15),rgba(5,4,14,.86) 55%);transition:opacity .45s;cursor:pointer;}
.quiz-story.off{opacity:0;pointer-events:none;}
.quiz-story-box{position:relative;display:flex;gap:10px;align-items:flex-start;background:rgba(10,7,22,.95);border:1px solid rgba(138,82,212,.55);border-radius:8px;padding:12px 12px 22px;min-height:112px;box-shadow:0 0 24px -6px rgba(138,82,212,.6);}
.quiz-story-box .quiz-face{flex:0 0 auto;width:64px;height:64px;}
.quiz-story-name{font-family:var(--dot);font-size:.68rem;color:var(--gd);margin-bottom:4px;letter-spacing:.1em;}
.quiz-story-txt{font-family:var(--serif);font-size:.86rem;line-height:1.8;color:var(--tx-b);min-height:3.6em;}
.quiz-story-nx{position:absolute;right:12px;bottom:6px;font-family:var(--mono);font-size:.62rem;color:var(--cy);animation:quiz-blink 1s infinite;}
.quiz-story-skip{position:absolute;right:12px;top:10px;z-index:1;font-family:var(--dot);font-size:.68rem;color:var(--tx);background:rgba(10,7,22,.85);border:1px solid rgba(187,174,221,.35);border-radius:14px;padding:6px 12px;cursor:pointer;}
.quiz-story-ttl{position:absolute;left:0;right:0;top:40%;text-align:center;font-family:var(--dot);color:#fff6e0;font-size:1.1rem;letter-spacing:.2em;text-shadow:0 0 12px rgba(255,190,110,.8);}
.quiz-story-ttl small{display:block;font-family:var(--mono);font-size:.62rem;color:var(--tx);letter-spacing:.3em;margin-bottom:4px;}
.quiz-grade{position:absolute;right:10px;top:8px;width:74px;height:74px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--dot);color:var(--gc);border:3px double var(--gc);border-radius:50%;transform:rotate(14deg) scale(2.4);opacity:0;line-height:1;}
.quiz-grade b{font-size:2.1rem;font-weight:normal;}
.quiz-grade span{font-size:.56rem;margin-top:2px;letter-spacing:.05em;}
.quiz-ov.on .quiz-grade{animation:quiz-stamp2 .4s 1.1s cubic-bezier(.3,1.4,.5,1) forwards;}
.quiz-mode-tag{display:inline-block;font-family:var(--dot);font-size:.58rem;color:#fff;background:#c8243f;padding:1px 6px;border-radius:2px;margin-left:6px;vertical-align:middle;letter-spacing:.05em;}
.quiz-hud .quiz-mode-tag{margin-left:0;}
@keyframes quiz-cardout{to{opacity:0;transform:translateX(-60px) rotate(-6deg) skewY(-3deg);}}
@keyframes quiz-hop{0%{transform:translateY(0);}40%{transform:translateY(-10px) scale(1.06);}100%{transform:none;}}
@keyframes quiz-sad{0%,100%{transform:none;}30%{transform:translateX(-4px) rotate(-6deg);}60%{transform:translateX(3px) rotate(4deg);}}
@keyframes quiz-wipe{0%{clip-path:inset(0 100% 0 0);}22%{clip-path:inset(0 0 0 0);}78%{clip-path:inset(0 0 0 0);}100%{clip-path:inset(0 0 0 100%);}}
@keyframes quiz-draw{to{stroke-dashoffset:0;}}
@keyframes quiz-cardin{from{opacity:0;transform:translateX(40px) rotate(4deg);}to{opacity:1;}}
@keyframes quiz-chin{from{opacity:0;transform:translateY(14px);}}
@keyframes quiz-bump{0%{transform:scale(1.5);}100%{transform:scale(1);}}
@keyframes quiz-pulse{from{opacity:1;}to{opacity:.55;}}
@keyframes quiz-blink{50%{opacity:.45;}}
@keyframes quiz-shakex{0%,100%{transform:translateX(0);}20%{transform:translateX(-7px);}40%{transform:translateX(6px);}60%{transform:translateX(-4px);}80%{transform:translateX(2px);}}
@keyframes quiz-shake{0%,100%{transform:translate(0,0);}25%{transform:translate(-5px,2px);}50%{transform:translate(4px,-2px);}75%{transform:translate(-2px,1px);}}
@keyframes quiz-stamp{0%{opacity:0;transform:rotate(-12deg) scale(2.2);}100%{opacity:.92;transform:rotate(-12deg) scale(1);}}
@keyframes quiz-stamp2{0%{opacity:0;transform:rotate(14deg) scale(2.4);}100%{opacity:.9;transform:rotate(14deg) scale(1);}}
@keyframes quiz-popup{0%{opacity:0;transform:translate(-50%,6px) scale(.7);}15%{opacity:1;transform:translate(-50%,-6px) scale(1.15);}100%{opacity:0;transform:translate(-50%,-52px) scale(1);}}
@keyframes quiz-banner{0%{opacity:0;transform:scale(2.2);letter-spacing:.5em;}20%{opacity:1;transform:scale(1);letter-spacing:.12em;}75%{opacity:1;}100%{opacity:0;transform:translateY(-18px);}}
@keyframes quiz-flicker{0%,100%{opacity:1;}46%{opacity:1;}47%{opacity:.6;}48%{opacity:1;}49%{opacity:.75;}50%{opacity:1;}}
`);

(()=>{
const FONT='"DotGothic16", monospace';
const QN=10, QTIME=15;
const AREA={
  L:{short:'法令',full:'危険物に関する法令',col:'#00e8c8'},
  P:{short:'物理・化学',full:'基礎的な物理学及び基礎的な化学',col:'#b98cff'},
  S:{short:'性質・消火',full:'危険物の性質並びにその火災予防及び消火の方法',col:'#e8b830'},
};
const NUMCOL=['#00e8c8','#b98cff','#e8b830','#ff6a84'];

// 問題バンク：a=分野 d=難易度(1〜3) q=問題 c=[正解, 誤答×3] e=解説
const BANK=[
  // ── 法令 ──
  {a:'L',d:1,q:'消防法で、第4類の危険物の性質は？',c:['引火性液体','酸化性液体','可燃性固体','自己反応性物質'],e:'第4類は「引火性液体」。第6類が酸化性液体、第2類が可燃性固体、第5類が自己反応性物質。'},
  {a:'L',d:2,q:'危険物の類と性質の組合せで正しいものは？',c:['第1類 ― 酸化性固体','第2類 ― 引火性液体','第5類 ― 酸化性液体','第6類 ― 自然発火性物質及び禁水性物質'],e:'第1類 酸化性固体／第2類 可燃性固体／第3類 自然発火性物質及び禁水性物質／第4類 引火性液体／第5類 自己反応性物質／第6類 酸化性液体。'},
  {a:'L',d:1,q:'特殊引火物の指定数量は？',c:['50L','200L','400L','1,000L'],e:'特殊引火物は第4類でいちばん危険性が高く、指定数量も最小の50L。'},
  {a:'L',d:1,q:'ガソリンの指定数量は？',c:['200L','50L','400L','1,000L'],e:'ガソリンは第1石油類（非水溶性）で200L。アセトンなど水溶性の第1石油類は400L。'},
  {a:'L',d:1,q:'アルコール類の指定数量は？',c:['400L','200L','1,000L','2,000L'],e:'メタノール・エタノールなどのアルコール類は400L。'},
  {a:'L',d:1,q:'灯油の指定数量は？',c:['1,000L','200L','2,000L','6,000L'],e:'灯油・軽油は第2石油類（非水溶性）で1,000L。酢酸など水溶性の第2石油類は2,000L。'},
  {a:'L',d:2,q:'重油の指定数量は？',c:['2,000L','1,000L','4,000L','6,000L'],e:'重油は第3石油類（非水溶性）で2,000L。グリセリンなど水溶性の第3石油類は4,000L。'},
  {a:'L',d:2,q:'ギヤー油などの第4石油類の指定数量は？',c:['6,000L','2,000L','4,000L','10,000L'],e:'ギヤー油・シリンダー油などの第4石油類は6,000L。'},
  {a:'L',d:2,q:'動植物油類の指定数量は？',c:['10,000L','2,000L','4,000L','6,000L'],e:'動植物油類は第4類でいちばん大きい10,000L。'},
  {a:'L',d:2,q:'ガソリン400Lと灯油1,000Lを同じ場所に貯蔵する。指定数量の倍数は？',c:['3','1.4','2','5'],e:'ガソリン 400÷200＝2、灯油 1,000÷1,000＝1。合計で指定数量の3倍。'},
  {a:'L',d:3,q:'アセトン800L・軽油3,000L・重油4,000Lを貯蔵する。指定数量の倍数の合計は？',c:['7','5','9','12'],e:'アセトンは第1石油類の水溶性で400L → 2倍。軽油 3,000÷1,000＝3倍、重油 4,000÷2,000＝2倍。合計7倍。'},
  {a:'L',d:2,q:'指定数量未満の危険物の貯蔵・取扱いの基準を定めているのは？',c:['市町村の火災予防条例','消防法の別表第一','都道府県公安委員会規則','労働安全衛生規則'],e:'指定数量以上は消防法で規制。指定数量未満は市町村の火災予防条例で基準が定められる。'},
  {a:'L',d:2,q:'製造所等を設置するとき、許可を受ける相手は？',c:['市町村長等','所轄の消防署長','都道府県公安委員会','労働基準監督署長'],e:'設置や変更の許可は「市町村長等」（区域により市町村長・都道府県知事・総務大臣）から受ける。'},
  {a:'L',d:2,q:'製造所等以外の場所で、指定数量以上の危険物を仮に貯蔵・取り扱う条件は？',c:['所轄消防長又は消防署長の承認を受け、10日以内','市町村長の許可を受け、30日以内','都道府県知事の承認を受け、1年以内','届け出れば期間の制限はない'],e:'仮貯蔵・仮取扱いは、所轄消防長又は消防署長の承認を受けて10日以内に限り認められる。'},
  {a:'L',d:1,q:'危険物取扱者でない人が、製造所等で危険物を取り扱えるのは？',c:['甲種、またはその類の乙種危険物取扱者が立ち会うとき','丙種危険物取扱者が立ち会うとき','作業後に責任者へ報告するとき','どんな場合でも取り扱えない'],e:'無資格者でも、甲種または取り扱える類の乙種危険物取扱者が立ち会えば取り扱える。丙種は立会いができない。'},
  {a:'L',d:1,q:'乙種第4類の免状で、取扱い・立会いができる危険物は？',c:['第4類の危険物すべて','第1類〜第6類すべて','第4類と第6類','ガソリン・灯油・軽油だけ'],e:'乙種は免状に書かれた類だけ。乙4なら第4類すべての取扱いと立会いができる。'},
  {a:'L',d:1,q:'危険物取扱者免状を交付するのは？',c:['都道府県知事','市町村長','消防庁長官','所轄の消防署長'],e:'試験に合格した者に、都道府県知事が免状を交付する。'},
  {a:'L',d:2,q:'免状の「書換え」が必要になるのは？',c:['氏名が変わったとき','現住所が変わったとき','勤務先が変わったとき','免状を汚してしまったとき'],e:'書換えは氏名・本籍地の属する都道府県が変わったときや、写真が撮影から10年を超えたとき。住所や勤務先は記載事項ではない。汚損・破損は「再交付」。'},
  {a:'L',d:2,q:'亡くした免状の再交付を受けた後、元の免状が見つかった。どうする？',c:['10日以内に、再交付を受けた都道府県知事に提出','30日以内に、市町村長に提出','両方とも持っておいてよい','1年以内に消防署で廃棄してもらう'],e:'見つかった免状は、10日以内に再交付を受けた都道府県知事へ提出する。'},
  {a:'L',d:2,q:'危険物の取扱作業に従事している危険物取扱者は、保安講習を受けた日以後の最初の4月1日から何年以内ごとに受講する？',c:['3年','1年','5年','10年'],e:'従事することになった日から1年以内に受講し、その後は受講日以後の最初の4月1日から3年以内ごとに受講する。'},
  {a:'L',d:2,q:'製造所等の定期点検は、原則としてどのくらいの頻度で行う？',c:['1年に1回以上','3か月に1回以上','3年に1回以上','5年に1回以上'],e:'定期点検は原則1年に1回以上。点検記録は原則3年間保存する。'},
  {a:'L',d:2,q:'危険物保安監督者に選任できるのは？',c:['甲種または乙種の取扱者で、製造所等での実務経験が6か月以上の者','丙種の取扱者で、実務経験が1年以上の者','資格はないが、実務経験が3年以上の者','免状を持っていれば実務経験は問わない'],e:'危険物保安監督者は、甲種または乙種危険物取扱者で、製造所等で6か月以上の実務経験がある者から選ぶ。'},
  {a:'L',d:1,q:'タンクローリー（移動タンク貯蔵所）で危険物を移送するときの決まりは？',c:['その危険物を扱える取扱者が乗車し、免状を携帯する','免状は事務所に保管しておけばよい','運転手が運転免許を持っていれば取扱者は不要','消防署に電話すれば無資格者だけで移送できる'],e:'移送するときは、その危険物を取り扱える危険物取扱者が乗車し、免状を携帯しなければならない。'},
  {a:'L',d:1,q:'第4類の危険物の運搬容器に表示する注意事項は？',c:['火気厳禁','禁水','衝撃注意','可燃物接触注意'],e:'第4類の運搬容器には「火気厳禁」と表示する。'},
  {a:'L',d:2,q:'製造所等を設置した。使用を開始できるのはいつ？',c:['完成検査を受け、基準に適合すると認められた後','工事が終わった翌日から','設置の許可を受けた日から','工事完了を消防署に電話した後'],e:'許可 → 工事 → 完成検査 → 完成検査済証の交付 → 使用開始、の順。'},
  {a:'L',d:3,q:'位置・構造・設備は変えずに、貯蔵する危険物の品名や数量を変えるときの手続きは？',c:['変更しようとする日の10日前までに市町村長等へ届け出る','変更した後、遅滞なく届け出る','市町村長等の許可を受ける','手続きは不要'],e:'品名・数量・指定数量の倍数の変更は、変更する日の10日前までに届出。位置・構造・設備の変更は「許可」が必要。'},
  {a:'L',d:2,q:'製造所等の用途を廃止したときの手続きは？',c:['遅滞なく市町村長等に届け出る','10日前までに許可を受ける','都道府県知事の承認を受ける','手続きは不要'],e:'用途廃止は遅滞なく市町村長等へ届出。製造所等の譲渡・引渡しも遅滞なく届出。'},
  {a:'L',d:3,q:'製造所の保安距離。敷地外の一般の住居からは何m以上離す？',c:['10m以上','3m以上','30m以上','50m以上'],e:'住居10m、高圧ガス施設20m、学校・病院など30m、重要文化財など50m。'},
  {a:'L',d:2,q:'第5種の消火設備に当たるものは？',c:['小型消火器や乾燥砂、水バケツ','大型消火器','スプリンクラー設備','屋内消火栓設備'],e:'第1種 消火栓／第2種 スプリンクラー／第3種 泡・粉末などの固定設備／第4種 大型消火器／第5種 小型消火器・乾燥砂など。'},
  {a:'L',d:3,q:'消防法令に違反した危険物取扱者に、免状の返納を命じることができるのは？',c:['免状を交付した都道府県知事','市町村長','所轄の消防署長','総務大臣'],e:'免状の返納命令は、その免状を交付した都道府県知事が出す。'},
  // ── 物理・化学 ──
  {a:'P',d:1,q:'燃焼の三要素の組合せは？',c:['可燃物・酸素供給源・点火源','可燃物・水・二酸化炭素','酸素・窒素・熱','点火源・圧力・湿度'],e:'3つのうち1つでも欠ければ燃焼は起こらない。消火はどれかを断つこと。'},
  {a:'P',d:1,q:'「引火点」の説明として正しいものは？',c:['火を近づけると燃え出すだけの蒸気を、液面上に発生する最低の液温','火源がなくても、自ら燃え出す最低の温度','液体が沸騰し始める温度','液体が凍り始める温度'],e:'引火点＝点火すると燃える濃度の蒸気が出る最低の液温。火源なしで燃え出す温度は「発火点」。'},
  {a:'P',d:1,q:'「発火点」の説明として正しいものは？',c:['空気中で加熱したとき、火源がなくても自ら燃え出す最低の温度','火を近づけたとき燃え出す最低の液温','燃焼で出る炎の最高温度','液体が蒸発し始める温度'],e:'発火点は火源なしで燃え出す温度。火を近づけて燃える最低の液温は「引火点」。'},
  {a:'P',d:1,q:'第4類の危険物（液体）の燃え方は？',c:['蒸発燃焼','分解燃焼','表面燃焼','自己燃焼'],e:'液面から蒸発した可燃性蒸気が空気と混ざって燃える＝蒸発燃焼。木材・石炭は分解燃焼、木炭・コークスは表面燃焼。'},
  {a:'P',d:2,q:'木炭やコークスの燃え方は？',c:['表面燃焼','蒸発燃焼','分解燃焼','自己燃焼'],e:'木炭やコークスは、炎をほとんど出さずに表面で酸素と反応して燃える（表面燃焼）。'},
  {a:'P',d:2,q:'燃焼範囲（爆発範囲）とは？',c:['可燃性蒸気と空気の混合気が燃焼できる濃度の範囲','炎が届く距離の範囲','燃えているときの温度の範囲','引火点から発火点までの温度の範囲'],e:'濃すぎても薄すぎても燃えない。下限値が低く、範囲が広いものほど危険。'},
  {a:'P',d:2,q:'一般に、物質が燃えやすくなる条件は？',c:['熱伝導率が小さい','発熱量が小さい','空気との接触面積が小さい','酸化されにくい'],e:'熱伝導率が小さいと熱が逃げずにたまる。発熱量が大きい・接触面積が大きい・酸化されやすいほど燃えやすい。'},
  {a:'P',d:1,q:'水で消火するときの主な消火効果は？',c:['冷却効果','窒息効果','除去効果','抑制効果'],e:'水は比熱と蒸発熱が大きく、熱をうばう冷却効果が大きい。'},
  {a:'P',d:2,q:'ガスの元栓を閉めて火を消す。これは何消火？',c:['除去消火','冷却消火','窒息消火','抑制消火'],e:'可燃物の供給を断つのは除去消火。'},
  {a:'P',d:2,q:'ハロゲン化物消火剤の主な消火効果は？',c:['抑制効果（負触媒効果）','除去効果','乳化効果','冷却効果だけ'],e:'ハロゲン化物は燃焼の連鎖反応をおさえる抑制効果が大きい。窒息効果もある。'},
  {a:'P',d:1,q:'静電気がたまりやすいのは？',c:['電気を通しにくい（絶縁性が高い）物質','電気をよく通す金属','湿った物質','接地（アース）された物質'],e:'不導体（絶縁抵抗が大きい）ほど電気が逃げずにたまる。乾燥した冬場も要注意。'},
  {a:'P',d:1,q:'静電気の災害を防ぐ方法として正しいものは？',c:['接地（アース）をする','湿度を下げる','流速を速くする','絶縁性の高い靴をはく'],e:'接地・加湿・流速を遅くする・導電性の作業服や靴を使う、が基本。'},
  {a:'P',d:1,q:'太陽の熱で地面が暖まる。この熱の伝わり方は？',c:['放射（ふく射）','伝導','対流','蒸発'],e:'熱は伝導・対流・放射で伝わる。間に物がなくても伝わるのが放射。'},
  {a:'P',d:2,q:'比熱の説明として正しいものは？',c:['物質1gの温度を1K（1℃）上げるのに必要な熱量','物質1kgを蒸発させるのに必要な熱量','物質が燃えたときに出る熱量','物質1gが溶けるのに必要な熱量'],e:'比熱が大きいものほど温まりにくく冷めにくい。水は比熱が大きい。'},
  {a:'P',d:1,q:'「酸化」とは？',c:['物質が酸素と化合すること','物質が酸素を失うこと','物質が水素と化合すること','物質が水に溶けること'],e:'酸素と化合する（または水素を失う）のが酸化。酸素を失う・水素と化合するのは還元。'},
  {a:'P',d:1,q:'pHが3の水溶液の性質は？',c:['酸性','中性','アルカリ性（塩基性）','pHからは判断できない'],e:'pH7が中性。7より小さいと酸性、大きいとアルカリ性（塩基性）。'},
  {a:'P',d:1,q:'化学変化はどれ？',c:['鉄がさびる','氷がとけて水になる','ガソリンが蒸発する','ニクロム線が電流で赤くなる'],e:'さび（酸化）は別の物質ができる化学変化。融解・蒸発・電熱線の発熱は物理変化。'},
  {a:'P',d:2,q:'混合物はどれ？',c:['ガソリン','水','酸素','エタノール'],e:'ガソリンは多くの炭化水素が混ざった混合物。水・エタノールは化合物、酸素は単体。'},
  {a:'P',d:2,q:'液体の沸点について正しいものは？',c:['外圧が高くなると、沸点は高くなる','外圧に関係なく一定','外圧が高くなると、沸点は低くなる','液体の量が多いほど高くなる'],e:'沸点は蒸気圧が外圧と等しくなる温度。圧力鍋の中では100℃より高い温度で沸騰する。'},
  {a:'P',d:2,q:'温度一定のまま、一定量の気体の圧力を2倍にすると体積は？',c:['1/2になる','2倍になる','変わらない','4倍になる'],e:'ボイルの法則：温度が一定なら、気体の体積は圧力に反比例する。'},
  {a:'P',d:1,q:'炭素が完全燃焼するとできる物質は？',c:['二酸化炭素','一酸化炭素','メタン','水素'],e:'完全燃焼でCO₂。酸素が足りない不完全燃焼では、有毒で可燃性の一酸化炭素（CO）ができる。'},
  {a:'P',d:2,q:'有機化合物の一般的な性質は？',c:['燃えやすいものが多い','水によく溶けるものが多い','融点が高いものが多い','電解質のものが多い'],e:'有機化合物は一般に燃えやすく、水に溶けにくいものが多い。融点・沸点は低く、非電解質が多い。'},
  {a:'P',d:2,q:'中和とはどんな反応？',c:['酸と塩基が反応して、塩と水ができる','酸どうしが反応して気体ができる','金属がさびる反応','水が電気分解される反応'],e:'酸＋塩基 → 塩＋水。'},
  {a:'P',d:1,q:'空気中の酸素は、体積でおよそ何％？',c:['約21％','約78％','約50％','約1％'],e:'空気は窒素が約78％、酸素が約21％。'},
  {a:'P',d:2,q:'「燃焼」の説明として正しいものは？',c:['熱と光の発生を伴う酸化反応','熱を吸収する還元反応','光を出さない分解反応','水と反応して気体を出す反応'],e:'燃焼は、熱と光を出しながら激しく進む酸化反応。'},
  {a:'P',d:3,q:'第4類の多くの液体が、こぼれた水の上に浮いて広がるのはなぜ？',c:['液比重が1より小さく、水に溶けにくいから','蒸気比重が1より大きいから','引火点が低いから','静電気を帯びやすいから'],e:'水より軽く水に溶けないので、水面に浮いて広がる。だから注水すると火災が広がる。'},
  {a:'P',d:3,q:'「潮解」とは？',c:['固体が空気中の水分を吸い、その水に溶ける現象','固体が液体を経ずに気体になる現象','結晶が水分を失って粉末になる現象','液体が冷えて固体になる現象'],e:'潮解は水分を吸って溶ける現象。直接気体になるのは昇華、結晶水を失うのは風解。'},
  // ── 性質・消火 ──
  {a:'S',d:1,q:'ガソリンの引火点は？',c:['−40℃以下','0℃前後','21℃前後','40℃以上'],e:'ガソリンの引火点は−40℃以下。冬の屋外でも火を近づければ燃える。'},
  {a:'S',d:2,q:'ガソリンの発火点は？',c:['約300℃','約90℃','約500℃','約1,000℃'],e:'発火点は約300℃。引火点（−40℃以下）と混同しないこと。'},
  {a:'S',d:1,q:'灯油の引火点は？',c:['40℃以上','−40℃以下','0℃以上','200℃以上'],e:'灯油は40℃以上、軽油は45℃以上。ただし霧状や布にしみた状態では引火しやすい。'},
  {a:'S',d:2,q:'軽油の引火点は？',c:['45℃以上','−20℃以下','21℃未満','250℃以上'],e:'軽油は45℃以上、灯油は40℃以上。どちらも第2石油類。'},
  {a:'S',d:1,q:'第1石油類の定義は？（1気圧において）',c:['引火点が21℃未満','引火点が21℃以上70℃未満','引火点が70℃以上200℃未満','引火点が200℃以上250℃未満'],e:'第1石油類は引火点21℃未満。ガソリン・ベンゼン・トルエン・アセトンなど。'},
  {a:'S',d:2,q:'第2石油類の定義は？（1気圧において）',c:['引火点が21℃以上70℃未満','引火点が21℃未満','引火点が70℃以上200℃未満','引火点が200℃以上250℃未満'],e:'第2石油類は21℃以上70℃未満。灯油・軽油・酢酸など。'},
  {a:'S',d:2,q:'第3石油類の定義は？（1気圧において）',c:['引火点が70℃以上200℃未満','引火点が21℃以上70℃未満','引火点が200℃以上250℃未満','引火点が250℃以上'],e:'第3石油類は70℃以上200℃未満。重油・クレオソート油・グリセリンなど。'},
  {a:'S',d:3,q:'第4石油類の定義は？（1気圧において）',c:['引火点が200℃以上250℃未満','引火点が70℃以上200℃未満','引火点が21℃以上70℃未満','引火点が250℃以上'],e:'第4石油類は200℃以上250℃未満。ギヤー油・シリンダー油など。'},
  {a:'S',d:1,q:'特殊引火物に当たるものは？',c:['ジエチルエーテル','灯油','重油','エタノール'],e:'ジエチルエーテル・二硫化炭素・アセトアルデヒド・酸化プロピレンなどが特殊引火物。'},
  {a:'S',d:2,q:'水より重く水に溶けないため、水を張って貯蔵する特殊引火物は？',c:['二硫化炭素','ジエチルエーテル','アセトアルデヒド','ガソリン'],e:'二硫化炭素は水より重いので、水を張って蒸気の発生を抑える。発火点が100℃以下ととても低い。'},
  {a:'S',d:2,q:'ジエチルエーテルについて正しいものは？',c:['空気や日光にふれると、爆発性の過酸化物ができるおそれがある','水より重いので水中に貯蔵する','引火点は40℃以上で引火しにくい','蒸気は空気より軽い'],e:'ジエチルエーテルは特殊引火物。密栓して冷暗所に。蒸気には麻酔性もある。'},
  {a:'S',d:1,q:'第4類の危険物の蒸気について正しいものは？',c:['空気より重く、低い所にたまりやすい','空気より軽く、天井付近にたまる','水によく溶けて消える','においがなく発生してもわからない'],e:'第4類の蒸気比重は1より大きい。床や溝にたまり、遠くまで流れて引火することがある。'},
  {a:'S',d:1,q:'ガソリン火災の消火方法として「不適切」なものは？',c:['棒状の水を放射する','泡消火剤を放射する','粉末消火剤を放射する','二酸化炭素消火剤を放射する'],e:'水より軽い油は水に浮いて広がり、火災が拡大する。泡・粉末・二酸化炭素などで窒息消火する。'},
  {a:'S',d:1,q:'第4類の火災に有効な、主な消火方法は？',c:['窒息消火','棒状の水による冷却消火','水で油を流し去る','強い風を送って吹き消す'],e:'泡・粉末・二酸化炭素などで空気（酸素）を断つ窒息消火が有効。'},
  {a:'S',d:2,q:'アルコールやアセトンなど水溶性液体の火災を泡で消すとき、正しいものは？',c:['水溶性液体用（耐アルコール）泡消火薬剤を使う','普通の泡消火薬剤がいちばん効果的','泡より棒状の水を大量にかける','乾いた布でたたいて消す'],e:'水溶性液体は普通の泡を溶かして消してしまう。水溶性液体用の泡を使う。'},
  {a:'S',d:2,q:'アセトンの品名は？',c:['第1石油類（水溶性）','第2石油類（非水溶性）','アルコール類','特殊引火物'],e:'アセトンは第1石油類の水溶性液体。指定数量は400L。'},
  {a:'S',d:1,q:'灯油と軽油の品名は？',c:['第2石油類','第1石油類','第3石油類','特殊引火物'],e:'灯油・軽油はどちらも第2石油類（非水溶性）。'},
  {a:'S',d:2,q:'重油の品名は？',c:['第3石油類','第2石油類','第4石油類','動植物油類'],e:'重油は第3石油類（非水溶性）。'},
  {a:'S',d:2,q:'メタノールについて正しいものは？',c:['毒性があり、炎の色が淡く見えにくい','水に溶けない','引火点が−40℃以下','蒸気は空気より軽い'],e:'メタノールはアルコール類で水とよく混ざる。毒性があり、明るい所では炎が見えにくい。'},
  {a:'S',d:1,q:'水によく溶ける（水溶性の）ものは？',c:['エタノール','ガソリン','灯油','ベンゼン'],e:'エタノールなどのアルコール類やアセトンは水溶性。ガソリン・灯油・ベンゼンは水に溶けない。'},
  {a:'S',d:2,q:'自動車用ガソリンについて正しいものは？',c:['オレンジ系の色に着色されている','無色透明で着色されていない','青色に着色されている','水より重い'],e:'灯油などと区別するためオレンジ系に着色されている。液比重は約0.65〜0.75で水より軽い。'},
  {a:'S',d:2,q:'アマニ油などの乾性油をしみ込ませた布を放置すると？',c:['酸化熱がたまり、自然発火するおそれがある','水分を吸って凍結する','静電気で金属を溶かす','有毒な塩素ガスを出す'],e:'乾性油（ヨウ素価が大きい）は空気中で酸化されやすく、その熱がこもると自然発火することがある。'},
  {a:'S',d:1,q:'タンクや容器に第4類を注入するときの静電気対策は？',c:['流速を遅くする','流速をできるだけ速くする','容器の接地を外す','室内を乾燥させる'],e:'流速を遅くし、接地し、湿度を保つ。'},
  {a:'S',d:1,q:'可燃性蒸気が出るおそれのある部屋の換気で正しいものは？',c:['低所にたまった蒸気を、屋外の高所に排出する','天井付近の空気だけを入れ替える','窓を閉めきって蒸気を外に出さない','扇風機で室内にかき混ぜる'],e:'蒸気は空気より重いので、低い所から吸い出して屋外の高所へ排出する。'},
  {a:'S',d:2,q:'灯油にガソリンが混ざるとどうなる？',c:['引火しやすくなり、危険が増す','引火点が高くなり安全になる','性質は何も変わらない','水に溶けるようになる'],e:'少し混じっただけで常温でも引火しやすくなる。容器の使い回しは厳禁。'},
  {a:'S',d:3,q:'ガソリンの燃焼範囲（爆発範囲）は？',c:['約1.4〜7.6vol％','約4〜75vol％','約15〜28vol％','約0.1〜0.5vol％'],e:'下限値が約1.4vol％と低く、わずかな蒸気でも燃える。'},
  {a:'S',d:3,q:'動植物油類の定義（1気圧において）は？',c:['引火点が250℃未満のもの','引火点が21℃未満のもの','引火点が70℃以上200℃未満のもの','引火点に関係なくすべて'],e:'動物の脂肉等や植物の種子・果肉から抽出したもので、1気圧で引火点が250℃未満のもの。'},
  {a:'S',d:1,q:'第4類を容器で保管するときの正しい方法は？',c:['密栓して、直射日光を避けた冷暗所に置く','栓をゆるめて蒸気を逃がしておく','暖房器具の近くに置く','日当たりのよい窓辺に置く'],e:'蒸気を出さないよう密栓し、熱や日光を避けて冷暗所に保管する。'},
  {a:'S',d:2,q:'トルエンの品名は？',c:['第1石油類（非水溶性）','第2石油類（水溶性）','アルコール類','第3石油類'],e:'トルエン・ベンゼンは第1石油類（非水溶性）。蒸気には毒性がある。'},
  {a:'S',d:2,q:'二酸化炭素消火剤の注意点は？',c:['密閉された室内では酸欠のおそれがある','電気設備の火災には使えない','消火後に大量の水が残る','油火災には効果がない'],e:'窒息効果で消すため、人がいる狭い場所では酸欠に注意。電気を通さないので電気火災にも使える。'},
];
BANK.forEach(q=>{let h=5381;for(const ch of q.q)h=((h*33)^ch.charCodeAt(0))>>>0;q.id=q.a+h.toString(36);});

function getData(){
  if(!gs.quizData||typeof gs.quizData!=='object')gs.quizData={};
  const d=gs.quizData;
  d.best=d.best||0;d.runs=d.runs||0;d.total=d.total||0;d.right=d.right||0;
  d.wrong=d.wrong||{};d.seen=d.seen||{};d.hist=d.hist||[];d.area=d.area||{L:[0,0],P:[0,0],S:[0,0]};
  return d;
}

// 出題：分野ごとに3問＋1問。資格知識で難易度を寄せ、間違えた問題は重みを上げる
// mock=模擬試験（難しめ寄せ）／focus=今夜の重点分野（4問になる）
// 並びは常に難易度順（ウォームアップ→本番→実戦）
function pickQuestions(ck,data,mock,focus){
  const t=Math.max(1,Math.min(3,1+ck/45+(mock?.9:0)));
  const w=q=>{
    const wr=data.wrong[q.id]||0,sn=data.seen[q.id]||0;
    return (1/(1+1.2*Math.abs(q.d-t)))*(1+1.6*Math.min(wr,3))/(1+.3*Math.min(sn,6));
  };
  const take=(pool,n)=>{
    const out=[];pool=pool.slice();
    while(out.length<n&&pool.length){
      const ws=pool.map(w),sum=ws.reduce((a,b)=>a+b,0);
      let r=Math.random()*sum,i=0;
      while(i<pool.length-1&&(r-=ws[i])>0)i++;
      out.push(pool.splice(i,1)[0]);
    }
    return out;
  };
  const chosen=[];
  ['L','P','S'].forEach(a=>chosen.push(...take(BANK.filter(q=>q.a===a),3)));
  chosen.push(...take(BANK.filter(q=>!chosen.includes(q)&&(!focus||q.a===focus)),QN-chosen.length));
  return chosen.map(q=>[q.d+Math.random()*.95,q]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
}
const multOf=c=>1+Math.min(Math.max(c-1,0),5)*.2;   // コンボ1:×1.0 … 6以上:×2.0
const PHASES=[
  {from:0,name:'ウォームアップ',en:'WARM-UP',col:'#00e8c8'},
  {from:3,name:'本番',en:'STANDARD',col:'#e8b830'},
  {from:7,name:'実戦',en:'FINAL',col:'#e83055'},
];
const phaseOf=i=>i>=7?2:i>=3?1:0;
const gradeOf=c=>c>=9?{g:'S',t:'合格確実',col:'#c8243f'}:c>=7?{g:'A',t:'合格圏',col:'#c8243f'}:c>=5?{g:'B',t:'あと一歩',col:'#b07a10'}:{g:'C',t:'要復習',col:'#5a4c90'};
const RANKS=[[0,'見習い'],[15,'研修生'],[35,'一人前'],[60,'ベテラン'],[90,'保全の鬼'],[130,'乙4マスター']];
const rankOf=n=>{let i=0;while(i+1<RANKS.length&&n>=RANKS[i+1][0])i++;return i;};
const IMG=n=>`url(assets/img/${n}.webp)`;
// 夜ごとに変わる導入の1行目
const OPENERS=[
  '午前2時。配信を切って、台所のテーブルにテキストを広げる。',
  '雨の音。洗い物を終えて、ようやく机に向かう。',
  '夜勤明けの頭に、ランプの光がしみる。',
  'コメント欄の残像がまだ目に残っている。テキストを開く。',
];
const ENDINGS={
  S:{face:'char_win',lines:['ノートの端に、赤ペンで小さく花丸を描いた。','工場のドラム缶の表示も、もう全部読める。……いける。','子ども部屋の寝息が、今夜はやけに穏やかに聞こえた。']},
  A:{face:'char_happy',lines:['間違えたところに付箋を貼った。明日の昼休みに、もう一回。','先輩の言ってた「火気厳禁」の意味が、今はちゃんとわかる。']},
  B:{face:'char_normal',lines:['半分くらいは、まだ霧の中。','でも、昨日の自分よりは一歩先にいる。','ランプを消して、子どもの布団を掛け直した。']},
  C:{face:'char_tired',lines:['文字が目の上を滑っていく。今夜は頭が働かない。','……無理はしない。倒れたら、あの子の朝ごはんを誰が作る。','ノートを閉じて、目を閉じた。']},
};

// 効果音：AU.se に加えて、AU.ctx があれば短い合成音を重ねる（SE音量0なら無音）
function synth(name,lv){
  try{
    if(typeof AU==='undefined')return;
    if(!AU.ctx&&AU.init)AU.init();
    const ac=AU.ctx;const vol=(typeof AUDIO_SET!=='undefined'?AUDIO_SET.se:1);
    if(!ac||!(vol>0))return;
    if(ac.state==='suspended')ac.resume().catch(()=>{});
    const t0=ac.currentTime+.005;
    const tone=(f,t,d,g,type,f2)=>{
      const o=ac.createOscillator(),gn=ac.createGain();o.type=type||'triangle';
      o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
      gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,g*vol),t+.01);gn.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(gn);gn.connect(ac.destination);o.start(t);o.stop(t+d+.02);
    };
    const noise=(t,d,g,fq,q,fq2)=>{
      const len=Math.max(1,Math.floor(ac.sampleRate*d)),buf=ac.createBuffer(1,len,ac.sampleRate),ch=buf.getChannelData(0);
      for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*(1-i/len);
      const s=ac.createBufferSource(),f=ac.createBiquadFilter(),gn=ac.createGain();s.buffer=buf;
      f.type='bandpass';f.frequency.setValueAtTime(fq,t);if(fq2)f.frequency.exponentialRampToValueAtTime(fq2,t+d);f.Q.value=q||1;
      gn.gain.setValueAtTime(g*vol,t);s.connect(f);f.connect(gn);gn.connect(ac.destination);s.start(t);
    };
    const k=Math.pow(2,Math.min(lv||0,8)/12);
    if(name==='ok'){[0,4,7,12].forEach((s,i)=>tone(660*k*Math.pow(2,s/12),t0+i*.055,.22,.07,'triangle'));tone(1320*k,t0+.2,.35,.03,'sine');}
    else if(name==='ng'){tone(220,t0,.28,.08,'square',110);tone(233,t0+.02,.28,.05,'sawtooth',116);}
    else if(name==='stamp'){noise(t0,.12,.5,180,.8);tone(90,t0,.14,.12,'sine',50);}
    else if(name==='page'){noise(t0,.22,.22,1800,.7,5200);}
    else if(name==='tick'){noise(t0,.025,.22,3200,4);}
    else if(name==='type'){tone(880+Math.random()*120,t0,.03,.025,'square');}
    else if(name==='phase'){[0,5,7,12].forEach((s,i)=>tone(392*Math.pow(2,s/12),t0+i*.09,.3,.05,'sawtooth'));noise(t0,.5,.08,600,.5,4000);}
    else if(name==='fanfare'){[0,4,7,12,16,19,24].forEach((s,i)=>tone(523*Math.pow(2,s/12),t0+i*.07,.4,.06,'triangle'));}
    else if(name==='title'){tone(98,t0,1.1,.08,'sine',96);[0,7,12].forEach((s,i)=>tone(392*Math.pow(2,s/12),t0+.15+i*.12,.6,.04,'triangle'));}
  }catch(e){}
}

registerMinigame({
  id:'quiz',icon:'📝',name:'危険物取扱者 一問一答',genre:'クイズ',bgm:'factory',
  desc:'来月は乙4の試験。深夜の机で4択を10問。連続正解でコンボ倍率、間違えた問題はまた出る。好成績で模擬試験モード解放。',
  effect:'資格知識↑ 仕事評価↑ 精神± ／ 疲労+5 約50分',
  help:'タップ／1〜4キーで解答・Enterで次へ',
  start(body,mg){
    const data=getData();
    const ck=(typeof gs.certKnow==='number')?gs.certKnow:0;
    const focus=['L','P','S'][(gs.day||1)%3];
    let qs=[],mock=false;
    const H=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

    // ── DOM ──
    const root=document.createElement('div');root.className='quiz-root quiz-pre';
    root.innerHTML=`
      <canvas class="quiz-bg"></canvas>
      <div class="quiz-scene"><div class="quiz-hud">
        <span class="quiz-area L">法令</span><span class="quiz-qn">Q <b>01</b>/10</span><span class="quiz-review">復習</span>
        <span class="quiz-combo"></span></div>
        <div class="quiz-who"><div class="quiz-bub"></div><div class="quiz-face"></div></div></div>
      <div class="quiz-main">
        <div class="quiz-timer"><div class="quiz-timer-track"><div class="quiz-timer-fill"></div></div><span class="quiz-timer-n">15</span></div>
        <div class="quiz-card"><div class="quiz-card-head"><span class="quiz-card-no">Q.1</span><span class="quiz-card-diff"></span><span class="quiz-card-area"></span></div>
          <div class="quiz-card-q"></div>
          <svg class="quiz-bigmark" viewBox="0 0 150 150"><path d="M88 18 C 40 10, 12 52, 22 92 C 32 132, 96 140, 124 104 C 148 72, 126 22, 80 20 C 66 21, 56 26, 50 30"/></svg>
          <div class="quiz-stamp">時間切れ</div></div>
        <div class="quiz-choices"></div>
      </div>
      <div class="quiz-light"></div>
      <div class="quiz-sheet"></div>
      <div class="quiz-banner"></div>
      <div class="quiz-phase"><small></small><b></b></div>
      <canvas class="quiz-fx"></canvas>
      <div class="quiz-ov"></div>
      <div class="quiz-story off"></div>
      <div class="quiz-title"></div>`;
    body.appendChild(root);
    const $=s=>root.querySelector(s);
    const bg=$('.quiz-bg'),fxc=$('.quiz-fx'),bx=bg.getContext('2d'),fx=fxc.getContext('2d');
    const elArea=$('.quiz-area'),elQn=$('.quiz-qn'),elRev=$('.quiz-review'),elCombo=$('.quiz-combo');
    const elTimer=$('.quiz-timer'),elFill=$('.quiz-timer-fill'),elTN=$('.quiz-timer-n');
    const elCard=$('.quiz-card'),elNo=$('.quiz-card-no'),elDiff=$('.quiz-card-diff'),elCA=$('.quiz-card-area'),elQ=$('.quiz-card-q');
    const elBig=$('.quiz-bigmark'),elStamp=$('.quiz-stamp'),elCh=$('.quiz-choices'),elSheet=$('.quiz-sheet');
    const elBanner=$('.quiz-banner'),elOv=$('.quiz-ov'),elMain=$('.quiz-main');
    const elFace=$('.quiz-who .quiz-face'),elBub=$('.quiz-bub'),elPhase=$('.quiz-phase'),elTitle=$('.quiz-title'),elStory=$('.quiz-story');

    // ── 状態 ──
    let st='title',qi=0,qtime=QTIME,cur=null,order=[],correctIdx=0,left=QTIME,lastSec=QTIME;
    let score=0,correct=0,combo=0,maxCombo=0,answered=0,sheetAt=0,finalAt=0,newBest=false,grade=null,unlocked=false;
    const byArea={L:[0,0],P:[0,0],S:[0,0]};
    const missed=[];
    const later=(fn,ms)=>setTimeout(()=>{if(!mg._ended)fn();},ms);

    // ── キャンバス（背景＋演出） ──
    let W=0,Hh=0,dpr=1,sceneH=100;
    const rain=[],drops=[],motes=[],parts=[];
    let lampOn=1,endG=null,endT=0,bld=[],flash=0,flashCol='255,190,110',vign=0,lampF=1,T=0;
    function resize(){
      const r=root.getBoundingClientRect();
      W=Math.max(1,r.width);Hh=Math.max(1,r.height);dpr=Math.min(2,window.devicePixelRatio||1);
      [bg,fxc].forEach(c=>{c.width=Math.round(W*dpr);c.height=Math.round(Hh*dpr);});
      sceneH=Math.max(40,elMain.offsetTop);
      const win=winRect();
      bld=[];let x=win.x-4;
      while(x<win.x+win.w){
        const bw=10+Math.random()*22,bh=win.h*(.25+Math.random()*.6);
        const lights=[];for(let i=0;i<8;i++)if(Math.random()<.55)lights.push([Math.random(),Math.random(),Math.random()<.2?'#00e8c8':Math.random()<.3?'#e83055':'#ffd38a']);
        bld.push({x,w:bw,h:bh,lights});x+=bw+Math.random()*4;
      }
      rain.length=0;for(let i=0;i<60;i++)rain.push({x:Math.random(),y:Math.random(),v:.8+Math.random()*.7,l:.05+Math.random()*.08});
      drops.length=0;for(let i=0;i<14;i++)drops.push({x:Math.random(),y:Math.random(),r:1+Math.random()*2.2,v:Math.random()<.4?.02+Math.random()*.06:0});
      if(!motes.length)for(let i=0;i<34;i++)motes.push({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.01,vy:-.004-Math.random()*.01,r:.6+Math.random()*1.4,p:Math.random()*6});
    }
    function winRect(){const h=Math.max(30,sceneH*.72);return {x:W*.05,y:Math.max(30,sceneH*.16),w:W*.46,h:Math.min(h,sceneH-Math.max(30,sceneH*.16)-6)};}
    for(let i=0;i<4;i++){const b=document.createElement('button');b.className='quiz-ch';b.disabled=true;b.innerHTML='<span class="quiz-ch-n" style="--c:#5e5078">'+(i+1)+'</span><span class="quiz-ch-t">　</span>';elCh.appendChild(b);}
    const ro=new ResizeObserver(()=>resize());ro.observe(root);ro.observe(elMain);
    resize();

    function drawBg(dt){
      T+=dt;
      const c=bx;c.setTransform(dpr,0,0,dpr,0,0);
      // 壁
      let g=c.createLinearGradient(0,0,0,Hh);g.addColorStop(0,'#0b0820');g.addColorStop(.6,'#07051a');g.addColorStop(1,'#05040e');
      c.fillStyle=g;c.fillRect(0,0,W,Hh);
      // 窓
      const w=winRect();
      if(w.h>18){
        c.save();c.beginPath();c.rect(w.x,w.y,w.w,w.h);c.clip();
        g=c.createLinearGradient(0,w.y,0,w.y+w.h);g.addColorStop(0,'#0a0a26');g.addColorStop(1,'#241037');c.fillStyle=g;c.fillRect(w.x,w.y,w.w,w.h);
        // ネオンのにじみ
        [[.25,.75,'0,232,200',.5],[.7,.62,'232,48,85',.55],[.5,.9,'138,82,212',.6]].forEach(([fx_,fy,col,rr],i)=>{
          const a=.22+.08*Math.sin(T*1.3+i*2);
          const gg=c.createRadialGradient(w.x+w.w*fx_,w.y+w.h*fy,0,w.x+w.w*fx_,w.y+w.h*fy,w.w*rr*.5);
          gg.addColorStop(0,`rgba(${col},${a})`);gg.addColorStop(1,`rgba(${col},0)`);c.fillStyle=gg;c.fillRect(w.x,w.y,w.w,w.h);
        });
        // ビル
        bld.forEach(b=>{
          c.fillStyle='#07061a';c.fillRect(b.x,w.y+w.h-b.h,b.w,b.h);
          b.lights.forEach(([lx,ly,col])=>{c.fillStyle=col;c.globalAlpha=.55;c.fillRect(b.x+2+lx*(b.w-5),w.y+w.h-b.h+3+ly*(b.h-6),2,2);});
          c.globalAlpha=1;
        });
        // 雨
        c.strokeStyle='rgba(170,190,255,.28)';c.lineWidth=1;c.beginPath();
        rain.forEach(r=>{
          r.y+=r.v*dt*1.3;if(r.y>1.1){r.y=-.1;r.x=Math.random();}
          const x=w.x+r.x*w.w,y=w.y+r.y*w.h;c.moveTo(x,y);c.lineTo(x-w.h*r.l*.25,y+w.h*r.l);
        });
        c.stroke();
        // ガラスの水滴
        drops.forEach(d=>{
          if(d.v){d.y+=d.v*dt;if(d.y>1.05){d.y=-.05;d.x=Math.random();}}
          const x=w.x+d.x*w.w,y=w.y+d.y*w.h;
          if(d.v){c.strokeStyle='rgba(200,210,255,.12)';c.lineWidth=d.r*.8;c.beginPath();c.moveTo(x,y-14);c.lineTo(x,y);c.stroke();}
          c.fillStyle='rgba(210,220,255,.35)';c.beginPath();c.arc(x,y,d.r,0,6.283);c.fill();
          c.fillStyle='rgba(255,255,255,.5)';c.fillRect(x-d.r*.4,y-d.r*.5,1,1);
        });
        c.restore();
        // 窓枠
        c.strokeStyle='#1b1533';c.lineWidth=5;c.strokeRect(w.x,w.y,w.w,w.h);
        c.lineWidth=3;c.beginPath();c.moveTo(w.x+w.w/2,w.y);c.lineTo(w.x+w.w/2,w.y+w.h);c.stroke();
        c.strokeStyle='rgba(138,82,212,.25)';c.lineWidth=1;c.strokeRect(w.x-3,w.y-3,w.w+6,w.h+6);
        // 付箋
        const sx=w.x+w.w-26,sy=w.y+w.h-22;
        if(w.h>50){
          c.save();c.translate(sx,sy);c.rotate(.08);
          c.fillStyle='rgba(232,200,80,.82)';c.fillRect(0,0,34,26);
          c.fillStyle='rgba(0,0,0,.18)';c.fillRect(0,22,34,4);
          c.fillStyle='#4a2a10';c.font='9px '+FONT;c.textAlign='center';c.fillText('乙4',17,11);c.fillText('合格!!',17,21);
          c.restore();
        }
      }
      // 子どもの絵（壁に貼ってある）
      const pw=Math.min(78,sceneH*.55,W*.22),ph=pw*.78;
      if(sceneH>78){
        const px=W*.56,py=Math.max(28,sceneH*.2);
        c.save();c.translate(px+pw/2,py+ph/2);c.rotate(-.06);
        c.fillStyle='#d9d2c0';c.fillRect(-pw/2,-ph/2,pw,ph);
        const lg=c.createLinearGradient(pw/2,-ph/2,-pw/2,ph/2);lg.addColorStop(0,'rgba(255,190,110,.25)');lg.addColorStop(1,'rgba(0,0,0,.35)');c.fillStyle=lg;c.fillRect(-pw/2,-ph/2,pw,ph);
        c.lineCap='round';c.lineJoin='round';
        // 太陽
        c.strokeStyle='#e8752a';c.lineWidth=2;c.beginPath();c.arc(pw*.3,-ph*.26,pw*.08,0,6.283);c.stroke();
        for(let i=0;i<8;i++){const a=i*.785;c.beginPath();c.moveTo(pw*.3+Math.cos(a)*pw*.11,-ph*.26+Math.sin(a)*pw*.11);c.lineTo(pw*.3+Math.cos(a)*pw*.15,-ph*.26+Math.sin(a)*pw*.15);c.stroke();}
        // 親子
        const fig=(x,s,col)=>{c.strokeStyle=col;c.lineWidth=1.6;c.beginPath();c.arc(x,ph*.02-s*.32,s*.12,0,6.283);c.moveTo(x,ph*.02-s*.2);c.lineTo(x,ph*.02+s*.12);c.moveTo(x-s*.14,ph*.02-s*.08);c.lineTo(x+s*.14,ph*.02-s*.08);c.moveTo(x,ph*.02+s*.12);c.lineTo(x-s*.1,ph*.02+s*.3);c.moveTo(x,ph*.02+s*.12);c.lineTo(x+s*.1,ph*.02+s*.3);c.stroke();};
        fig(-pw*.2,ph*.95,'#3a5ec8');fig(pw*.02,ph*.62,'#d0386a');
        c.fillStyle='#3d8a3a';c.fillRect(-pw/2+3,ph*.34,pw-6,2);
        c.fillStyle='#6b3fa0';c.font=Math.max(7,pw*.12)+'px '+FONT;c.textAlign='center';c.fillText('パパ がんばれ',0,ph*.47);
        c.fillStyle='rgba(200,220,255,.3)';c.fillRect(-pw*.12,-ph/2-4,pw*.24,7);
        c.restore();
      }
      // 机（下部）
      const dy=Math.max(sceneH-8,Hh*.3);
      g=c.createLinearGradient(0,dy,0,Hh);g.addColorStop(0,'#1d1328');g.addColorStop(1,'#0c0814');c.fillStyle=g;c.fillRect(0,dy,W,Hh-dy);
      c.strokeStyle='rgba(255,200,140,.05)';c.lineWidth=1;
      for(let i=0;i<9;i++){const yy=dy+12+i*((Hh-dy)/9);c.beginPath();c.moveTo(0,yy);c.bezierCurveTo(W*.3,yy+4,W*.6,yy-5,W,yy+2);c.stroke();}
      c.fillStyle='rgba(255,200,140,.12)';c.fillRect(0,dy,W,1.5);
      if(endG)drawNotebook(c,dt);
      // ランプ
      lampF+=((Math.random()<.008?.55*lampOn:lampOn)-lampF)*Math.min(1,dt*(lampOn<1?2:12));
      const lx=W*.83,ly=Math.max(26,Math.min(sceneH*.38,90));
      c.strokeStyle='#2a2140';c.lineWidth=4;c.beginPath();c.moveTo(W+10,-6);c.lineTo(W*.95,ly*.45);c.lineTo(lx+8,ly-10);c.stroke();
      c.fillStyle='#3a2f58';c.beginPath();c.arc(W*.95,ly*.45,4,0,6.283);c.fill();
      const cone=c.createLinearGradient(lx,ly,lx-W*.15,Hh);
      cone.addColorStop(0,`rgba(255,196,120,${.2*lampF+flash*.25})`);cone.addColorStop(1,'rgba(255,196,120,0)');
      c.save();c.globalCompositeOperation='lighter';c.fillStyle=cone;
      c.beginPath();c.moveTo(lx-14,ly+6);c.lineTo(lx+14,ly+6);c.lineTo(W*1.05,Hh);c.lineTo(-W*.15,Hh);c.closePath();c.fill();
      const glow=c.createRadialGradient(lx,ly+6,0,lx,ly+6,90);glow.addColorStop(0,`rgba(255,214,150,${.5*lampF})`);glow.addColorStop(1,'rgba(255,214,150,0)');
      c.fillStyle=glow;c.fillRect(lx-90,ly-84,180,180);
      // ほこり
      motes.forEach(m=>{
        m.x+=m.vx*dt;m.y+=m.vy*dt;m.p+=dt;
        if(m.y<0){m.y=1;m.x=Math.random();}if(m.x<0)m.x=1;if(m.x>1)m.x=0;
        const x=m.x*W,y=ly+m.y*(Hh-ly);
        const t=(y-ly)/(Hh-ly),cx0=lx-14+(-W*.15-(lx-14))*t,cx1=lx+14+(W*1.05-(lx+14))*t;
        if(x<cx0||x>cx1)return;
        c.fillStyle=`rgba(255,220,170,${(.25+.25*Math.sin(m.p*2))*lampF})`;c.beginPath();c.arc(x,y,m.r,0,6.283);c.fill();
      });
      if(flash>0){c.fillStyle=`rgba(${flashCol},${flash*.12})`;c.fillRect(0,0,W,Hh);}
      c.restore();
      // シェード
      c.fillStyle='#2b2244';c.beginPath();c.moveTo(lx-8,ly-16);c.lineTo(lx+8,ly-16);c.lineTo(lx+16,ly+6);c.lineTo(lx-16,ly+6);c.closePath();c.fill();
      c.strokeStyle='rgba(138,82,212,.6)';c.lineWidth=1;c.stroke();
      c.fillStyle=`rgba(255,236,190,${.85*lampF})`;c.beginPath();c.ellipse(lx,ly+6,14,3,0,0,6.283);c.fill();
      flash=Math.max(0,flash-dt*2.2);
    }

    // エピローグ：机の上のノート（評価で変わる）
    function drawNotebook(c,dt){
      endT+=dt;
      const nw=Math.min(W*.72,300),nh=nw*.46,cx=W/2,cy=sceneH+Math.max(nh*.6,(Hh-sceneH-150)/2);
      const pop_=Math.min(1,endT/.5),e=1-Math.pow(1-pop_,3);
      c.save();c.translate(cx,cy+(1-e)*30);c.rotate(-.05);c.globalAlpha=e;
      c.fillStyle='rgba(0,0,0,.45)';c.fillRect(-nw/2+6,-nh/2+8,nw,nh);
      if(endG==='C'){
        const g=c.createLinearGradient(-nw/4,0,nw/4,0);g.addColorStop(0,'#2c2150');g.addColorStop(1,'#3d2d6a');
        c.fillStyle=g;c.fillRect(-nw/4,-nh/2,nw/2,nh);
        c.fillStyle='#d9cfb5';c.fillRect(-nw/4+8,-nh/2+12,nw/2-16,16);
        c.fillStyle='#3a2a58';c.font='10px '+FONT;c.textAlign='center';c.fillText('乙4 ノート',0,-nh/2+24);
      }else{
        for(const sd of [-1,1]){
          const x0=sd<0?-nw/2:0;
          const g=c.createLinearGradient(x0,0,x0+nw/2,0);
          if(sd<0){g.addColorStop(0,'#e6dcc4');g.addColorStop(1,'#bfb398');}else{g.addColorStop(0,'#c4b89c');g.addColorStop(.12,'#e9e0c9');g.addColorStop(1,'#e6dcc4');}
          c.fillStyle=g;c.fillRect(x0,-nh/2,nw/2,nh);
          c.strokeStyle='rgba(70,100,170,.3)';c.lineWidth=1;
          for(let y=-nh/2+12;y<nh/2-4;y+=9){c.beginPath();c.moveTo(x0+8,y);c.lineTo(x0+nw/2-8,y);c.stroke();}
        }
        // 左ページの走り書き
        c.strokeStyle='rgba(40,34,60,.55)';c.lineWidth=1.2;
        for(let i=0;i<6;i++){const y=-nh/2+16+i*9,len=nw*.3*(.5+((i*37)%10)/14);c.beginPath();c.moveTo(-nw/2+12,y);for(let x=0;x<len;x+=4)c.lineTo(-nw/2+12+x,y-1.5*Math.sin(x*.9+i));c.stroke();}
        if(endG==='S'||endG==='A'){
          const p=Math.min(1,Math.max(0,(endT-.4)/1.3)),R=nh*.34,mx=nw*.25,my=0;
          c.strokeStyle='#d21e3c';c.lineWidth=2.4;c.lineCap='round';c.beginPath();
          const turns=2.2,steps=Math.floor(80*Math.min(1,p*1.6));
          for(let i=0;i<=steps;i++){const t=i/80,a=t*turns*6.283,r=R*.55*t;const x=mx+Math.cos(a)*r,y=my+Math.sin(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}
          c.stroke();
          if(endG==='S'&&p>.62){const q=Math.min(1,(p-.62)/.38),n=Math.floor(9*q);c.beginPath();
            for(let i=0;i<n;i++){const a0=i/9*6.283,a1=(i+1)/9*6.283,am=(a0+a1)/2;c.moveTo(mx+Math.cos(a0)*R*.7,my+Math.sin(a0)*R*.7);
              c.quadraticCurveTo(mx+Math.cos(am)*R*1.15,my+Math.sin(am)*R*1.15,mx+Math.cos(a1)*R*.7,my+Math.sin(a1)*R*.7);}
            c.stroke();}
          if(endG==='S'&&Math.random()<dt*6)parts.push({x:cx+mx+(Math.random()-.5)*R*2,y:cy+(Math.random()-.5)*R*2,vx:0,vy:-30,life:0,max:.8,sz:2.5,col:'#ffd38a',rot:0,vr:0,sh:0});
        }else{
          // 鉛筆が置いてある
          c.save();c.translate(nw*.22,nh*.05);c.rotate(-.5);
          c.fillStyle='#e8b830';c.fillRect(-nw*.2,-3,nw*.36,6);c.fillStyle='#e9cfa0';c.beginPath();c.moveTo(nw*.16,-3);c.lineTo(nw*.16+9,0);c.lineTo(nw*.16,3);c.fill();
          c.fillStyle='#f3a3b5';c.fillRect(-nw*.2-6,-3,6,6);c.restore();
        }
      }
      c.restore();
    }
    function burst(x,y,n,cols,power){
      for(let i=0;i<n;i++){
        const a=Math.random()*6.283,s=(60+Math.random()*220)*(power||1);
        parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-120*(power||1),life:0,max:.7+Math.random()*.7,
          sz:2+Math.random()*4,col:cols[i%cols.length],rot:Math.random()*6,vr:(Math.random()-.5)*14,sh:Math.random()<.5?0:1});
      }
    }
    function drawFx(dt){
      const c=fx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,Hh);
      for(let i=parts.length-1;i>=0;i--){
        const p=parts[i];p.life+=dt;if(p.life>=p.max){parts.splice(i,1);continue;}
        p.vy+=420*dt;p.vx*=1-1.6*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;
        const a=1-p.life/p.max;c.globalAlpha=a;c.fillStyle=p.col;
        if(p.sh){c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.fillRect(-p.sz,-p.sz*.4,p.sz*2,p.sz*.8);c.restore();}
        else{c.shadowColor=p.col;c.shadowBlur=8;c.beginPath();c.arc(p.x,p.y,p.sz*.6,0,6.283);c.fill();c.shadowBlur=0;}
      }
      c.globalAlpha=1;
      if(vign>0){
        const g=c.createRadialGradient(W/2,Hh/2,Math.min(W,Hh)*.25,W/2,Hh/2,Math.max(W,Hh)*.7);
        g.addColorStop(0,'rgba(232,48,85,0)');g.addColorStop(1,`rgba(232,48,85,${vign*.45})`);c.fillStyle=g;c.fillRect(0,0,W,Hh);
        vign=Math.max(0,vign-dt*1.6);
      }
    }

    // ── 表示 ──
    const pad=n=>String(n).padStart(2,'0');
    function hudScore(){mg.setScore(`SCORE <span style="color:var(--gd)">${score.toLocaleString()}</span>　正解 <span style="color:var(--gn)">${correct}</span>/${answered}`);}
    function setCombo(bump){
      if(combo>=2){
        elCombo.innerHTML=`🔥${combo} COMBO<small>×${multOf(combo).toFixed(1)}</small>`;elCombo.classList.add('on');
        if(bump){elCombo.classList.remove('bump');void elCombo.offsetWidth;elCombo.classList.add('bump');}
      }else elCombo.classList.remove('on');
    }
    function pop(x,y,html,bad){
      const d=document.createElement('div');d.className='quiz-pop'+(bad?' bad':'');d.innerHTML=html;
      d.style.left=x+'px';d.style.top=y+'px';root.appendChild(d);
      setTimeout(()=>d.remove(),1150);
    }
    function banner(txt){elBanner.textContent=txt;elBanner.classList.remove('on');void elBanner.offsetWidth;elBanner.classList.add('on');}
    function relRect(el){const a=el.getBoundingClientRect(),b=root.getBoundingClientRect();return {x:a.left-b.left,y:a.top-b.top,w:a.width,h:a.height};}

    // ── だんのうらの反応 ──
    let bubT=null;
    function face(n,anim){elFace.style.backgroundImage=IMG(n);if(anim){elFace.classList.remove('hop','sad');void elFace.offsetWidth;elFace.classList.add(anim);}}
    function say(txt,ms){elBub.textContent=txt;elBub.classList.add('on');clearTimeout(bubT);bubT=setTimeout(()=>elBub.classList.remove('on'),ms||1500);}
    const rpick=a=>a[Math.floor(Math.random()*a.length)];
    const OK_LINES=['よし！','覚えてる…！','それだ。','いける。'],COMBO_LINES=['冴えてる…！','止まらない。','頭が澄んでる。'],NG_LINES=['うっ…','そっちか…','付箋、貼っとこう。','くやしい…'];
    face('char_normal');

    // ── タイトル ──
    function showTitle(){
      const canMock=!!data.mockOpen;
      elTitle.innerHTML=`<div class="quiz-logo"><div class="quiz-logo-badge"><div>乙④<span>OTSU-4</span></div></div>
        <div class="quiz-logo-ttl">深夜の<em>一問一答</em></div><svg viewBox="0 0 210 12"><path d="M3 8 C 50 2, 120 12, 207 4"/></svg>
        <div class="quiz-logo-sub">危険物取扱者 乙種第4類</div></div>
        <div class="quiz-modes">
          <button class="quiz-mode" data-m="0" style="--mc:var(--cy)">いつもの10問<small>4択・解説つき／今夜の重点：${AREA[focus].short}</small></button>
          <button class="quiz-mode" data-m="1" style="--mc:var(--rd)" ${canMock?'':'disabled'}>${canMock?'模擬試験モード':'🔒 模擬試験モード'}<small>${canMock?'難問寄り・制限時間短め・得点×1.2':'1回で8問以上正解すると解放'}</small></button>
        </div>
        <div class="quiz-rec">${data.runs?`ランク【${RANKS[rankOf(data.right)][1]}】 BEST ${data.best.toLocaleString()} ・ 最高評価 ${data.bestGrade||'-'}<br>通算正答率 ${['L','P','S'].map(a=>AREA[a].short+' '+(data.area[a][1]?Math.round(data.area[a][0]/data.area[a][1]*100)+'%':'-')).join(' / ')}`:'— FIRST NIGHT —'}</div>`;
      elTitle.querySelectorAll('.quiz-mode').forEach(b=>b.addEventListener('click',()=>pickMode(b.dataset.m==='1')));
      synth('title');
    }
    function pickMode(m){
      if(st!=='title'||(m&&!data.mockOpen))return;
      mock=m;qs=pickQuestions(ck,data,mock,focus);
      AU.se('decide');synth('page');
      st='story';elTitle.classList.add('off');
      startStory(storyLines(),showIntro,'char_normal',`<small>PROLOGUE</small>${mock?'模擬試験の夜':'勉強の夜'}`);
    }

    // ── 会話シーン（導入・エピローグ） ──
    function storyLines(){
      return [OPENERS[(gs.day||1)%OPENERS.length],
        mock?'この前の手ごたえを確かめたい。今夜は本番形式の模擬試験だ。':'来月、危険物取扱者 乙種第4類の試験がある。',
        '受かれば工場で任される仕事が増える。手当も、少しだけ。',
        '隣の部屋で、子どもが寝返りを打った。……静かに、10問だけ。'];
    }
    let sLines=[],sIdx=0,sChar=0,sAcc=0,sDone=null,sTxt=null;
    function startStory(lines,done,faceN,title){
      sLines=lines;sIdx=0;sChar=0;sAcc=0;sDone=done;
      elStory.innerHTML=`${title?`<div class="quiz-story-ttl">${title}</div>`:''}<button class="quiz-story-skip">スキップ ▶▶</button>`+
        `<div class="quiz-story-box"><div class="quiz-face" style="background-image:${IMG(faceN)}"></div><div style="flex:1"><div class="quiz-story-name">だんのうら</div><div class="quiz-story-txt"></div></div><div class="quiz-story-nx">▼ TAP</div></div>`;
      sTxt=elStory.querySelector('.quiz-story-txt');
      elStory.classList.remove('off');
      elStory.querySelector('.quiz-story-skip').addEventListener('click',e=>{e.stopPropagation();AU.se('back');endStory();});
      elStory.onclick=advStory;
    }
    function advStory(){
      if(!sDone)return;
      const line=sLines[sIdx]||'';
      if(sChar<line.length){sChar=line.length;sTxt.textContent=line;return;}
      AU.se('btn');sIdx++;sChar=0;sAcc=0;
      if(sIdx>=sLines.length)endStory();
    }
    function endStory(){if(!sDone)return;const d=sDone;sDone=null;elStory.onclick=null;elStory.classList.add('off');d();}
    function storyTick(dt){
      if(!sDone||sIdx>=sLines.length)return;
      const line=sLines[sIdx];
      if(sChar>=line.length)return;
      sAcc+=dt;
      while(sAcc>.034&&sChar<line.length){sAcc-=.034;sChar++;if(sChar%2)synth('type');}
      sTxt.textContent=line.slice(0,sChar);
    }

    // ── 遊び方 ──
    function showIntro(){
      st='intro';
      const lvl=mock?'模擬試験（難問寄り）':ck<30?'やさしめ':ck<60?'標準':'難しめ';
      const rev=Object.keys(data.wrong).length;
      elOv.innerHTML=`<div class="quiz-paper">
        <div class="quiz-p-title"><small>HOW TO PLAY</small>遊び方${mock?'<span class="quiz-mode-tag">模擬試験</span>':''}</div>
        <ul class="quiz-p-list">
          <li>4択を<b>10問</b>。タップ／<kbd>1</kbd>〜<kbd>4</kbd>キー</li>
          <li>制限時間内に。早いほど高得点</li>
          <li>連続正解で<b>コンボ倍率</b>（最大×2.0）</li>
          <li>ウォームアップ → 本番 → <b>実戦</b>（時間短め・得点UP）</li>
        </ul>
        <div class="quiz-p-note">出題：<b>${lvl}</b>（資格知識 ${ck}）／重点 ${AREA[focus].short}${rev?`<br>復習待ち <b>${rev}問</b>（出やすくなっています）`:''}</div>
        <button class="quiz-btn">はじめる<small>Enter</small></button></div>`;
      elOv.querySelector('.quiz-btn').addEventListener('click',begin);
      elOv.classList.add('on');
    }
    function begin(){
      if(st!=='intro')return;
      st='wait';AU.se('decide');elOv.classList.remove('on');root.classList.remove('quiz-pre');
      later(()=>showPhase(0,showQuestion),250);
    }
    function showPhase(p,cb){
      const P=PHASES[p];
      elPhase.style.setProperty('--pc',P.col);
      elPhase.querySelector('small').textContent=`PHASE ${p+1} · ${P.en}`;
      elPhase.querySelector('b').textContent=P.name;
      elPhase.classList.remove('on');void elPhase.offsetWidth;elPhase.classList.add('on');
      synth('phase');AU.se('notif');
      say(['まずは肩慣らし。','ここからが本番。','最後は実戦問題。落ち着いて。'][p],1800);
      face(p===2?'char_fear':'char_normal','hop');
      later(cb,1050);
    }

    // ── 出題 ──
    function showQuestion(){
      cur=qs[qi];
      const ph=phaseOf(qi);
      qtime=mock?[13,13,11][ph]:[15,15,12][ph];
      st='ask';left=qtime;lastSec=qtime;
      data.seen[cur.id]=(data.seen[cur.id]||0)+1;
      order=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
      correctIdx=order.indexOf(0);
      elArea.className='quiz-area '+cur.a;elArea.textContent=AREA[cur.a].short;
      elQn.innerHTML=`Q <b>${pad(qi+1)}</b>/${QN}`;
      elRev.classList.toggle('on',(data.wrong[cur.id]||0)>0);
      elNo.textContent='Q.'+(qi+1);
      elDiff.textContent='難'+'★'.repeat(cur.d)+'☆'.repeat(3-cur.d);
      elCA.textContent=PHASES[ph].name+(mock?'・模試':'');
      elQ.textContent=cur.q;
      elBig.classList.remove('on');elStamp.classList.remove('on');
      elCard.classList.remove('enter','out');void elCard.offsetWidth;elCard.classList.add('enter');
      elTimer.classList.remove('low');elFill.style.width='100%';elTN.textContent=qtime;
      elCh.innerHTML='';
      order.forEach((oi,k)=>{
        const b=document.createElement('button');b.className='quiz-ch enter';b.style.animationDelay=(k*.06)+'s';
        b.style.setProperty('--c',NUMCOL[k]);
        b.innerHTML=`<span class="quiz-ch-n">${k+1}</span><span class="quiz-ch-t">${H(cur.c[oi])}</span><svg class="quiz-mark" viewBox="0 0 40 40"></svg>`;
        b.addEventListener('pointerdown',()=>{if(st==='ask')b.style.transform='scale(.975)';});
        b.addEventListener('click',()=>choose(k));
        elCh.appendChild(b);
      });
      elSheet.classList.remove('on');
      if(combo<3)face('char_normal');
      if((data.wrong[cur.id]||0)>0)say('……これ、前に間違えたやつだ。',1800);
      setCombo(false);hudScore();
      AU.se('notif');
    }

    function choose(k){
      if(st!=='ask')return;
      st='reveal';answered++;
      const btns=[...elCh.children];
      btns.forEach(b=>{b.disabled=true;b.style.transform='';});
      const ok=k===correctIdx,timeout=k<0;
      const area=byArea[cur.a];area[1]++;
      mg.setTimer('');
      const cb=btns[correctIdx],cr=relRect(cb);
      let gained=0;
      if(ok){
        correct++;area[0]++;combo++;maxCombo=Math.max(maxCombo,combo);
        const base=100+Math.round(Math.max(0,left)*10);
        gained=Math.round(base*multOf(combo)*(phaseOf(qi)===2?1.25:1)*(mock?1.2:1));score+=gained;
        if(data.wrong[cur.id]){data.wrong[cur.id]--;if(data.wrong[cur.id]<=0)delete data.wrong[cur.id];}
        cb.classList.add('is-correct');
        markSvg(cb,'ok');
        elBig.classList.remove('on');void elBig.offsetWidth;elBig.classList.add('on');
        btns.forEach((b,i)=>{if(i!==k)b.classList.add('is-dim');});
        burst(cr.x+cr.w*.8,cr.y+cr.h/2,22+Math.min(combo,6)*6,['#e8b830','#00e8c8','#44ee88','#fff3c8','#b98cff'],1+Math.min(combo,6)*.08);
        const cdr=relRect(elCard);burst(cdr.x+cdr.w/2,cdr.y+cdr.h/2,12,['#ff3b5c','#ffd38a'],.7);
        flash=1;flashCol='255,200,120';
        pop(cr.x+cr.w*.55,cr.y-4,`+${gained}${combo>=2?` <small style="font-size:.7em">×${multOf(combo).toFixed(1)}</small>`:''}`);
        AU.se(combo>=3?'ach':'rank');synth('ok',combo-1);
        face(combo>=3?'char_win':'char_happy','hop');say(combo>=3?rpick(COMBO_LINES):rpick(OK_LINES),1300);
        if([3,5,7,10].includes(combo)){later(()=>{banner(combo===10?'全問連続正解！':combo+'連続正解！');AU.se('ach');synth('fanfare');
          burst(W/2,Hh*.4,40,['#e8b830','#fff3c8','#e83055','#00e8c8'],1.3);},260);}
      }else{
        combo=0;
        data.wrong[cur.id]=Math.min(5,(data.wrong[cur.id]||0)+1);
        missed.push(cur);
        cb.classList.add('is-correct');markSvg(cb,'ok');
        if(!timeout){const wb=btns[k];wb.classList.add('is-wrong');markSvg(wb,'ng');const wr=relRect(wb);
          burst(wr.x+wr.w*.85,wr.y+wr.h/2,10,['#5e5078','#8a7a9a','#e83055'],.6);pop(wr.x+wr.w*.55,wr.y-4,'✕ 不正解',true);}
        else{elStamp.classList.remove('on');void elStamp.offsetWidth;elStamp.classList.add('on');synth('stamp');}
        btns.forEach((b,i)=>{if(i!==k&&i!==correctIdx)b.classList.add('is-dim');});
        vign=1;
        root.classList.remove('quiz-shake');void root.offsetWidth;root.classList.add('quiz-shake');
        AU.se('warn');synth('ng');
        face(timeout?'char_tired':'char_fear','sad');say(timeout?'あ、時間……':rpick(NG_LINES),1400);
      }
      setCombo(ok);hudScore();
      // 解説シート
      const last=qi>=QN-1;
      elSheet.style.setProperty('--sc',ok?'var(--gn)':'var(--rd)');
      elSheet.innerHTML=`<div class="quiz-verdict">${ok?'◯ 正解！':timeout?'⏱ 時間切れ':'✕ 不正解'}${ok?`<small>+${gained}</small>`:''}</div>`+
        `<div class="quiz-ans">正解：<b>${H(cur.c[0])}</b></div>`+
        `<div class="quiz-exp">${H(cur.e)}</div>`+
        `<button class="quiz-btn">${last?'採点する ▶':'次の問題へ ▶'}<small>Enter</small></button>`;
      elSheet.querySelector('.quiz-btn').addEventListener('click',next);
      later(openSheet,ok?480:650);
    }
    function markSvg(btn,kind){
      const s=btn.querySelector('.quiz-mark');
      s.innerHTML=kind==='ok'?'<path d="M24 5 C 10 3, 3 14, 6 25 C 9 36, 30 38, 35 26 C 39 15, 32 5, 20 6"/>':'<path d="M9 9 L31 31"/><path d="M31 9 L9 31"/>';
      s.classList.add(kind==='ok'?'ok':'ng');
      requestAnimationFrame(()=>s.classList.add('on'));
    }
    function openSheet(){if(st!=='reveal'||elSheet.classList.contains('on'))return;elSheet.classList.add('on');elSheet.scrollTop=0;sheetAt=performance.now();}
    function next(){
      if(st!=='reveal')return;
      if(!elSheet.classList.contains('on')){openSheet();return;}   // 早押しは解説をすぐ出す
      if(performance.now()-sheetAt<300)return;
      AU.se('btn');synth('page');
      elSheet.classList.remove('on');
      elCard.classList.remove('enter');elCard.classList.add('out');
      qi++;st='wait';
      if(qi>=QN){later(showFinal,320);return;}
      if(qi===3||qi===7)later(()=>showPhase(phaseOf(qi),showQuestion),240);
      else later(showQuestion,240);
    }

    // ── 採点 ──
    function showFinal(){
      st='final';finalAt=performance.now();mg.setTimer('');
      grade=gradeOf(correct);
      const rk0=rankOf(data.right);
      data.runs++;data.total+=QN;data.right+=correct;
      ['L','P','S'].forEach(a=>{data.area[a][0]+=byArea[a][0];data.area[a][1]+=byArea[a][1];});
      data.hist.push({d:gs.day||1,c:correct,m:mock?1:0});if(data.hist.length>7)data.hist.shift();
      const rk=rankOf(data.right),rankUp=rk>rk0;
      const nx=RANKS[rk+1],rpc=nx?Math.round((data.right-RANKS[rk][0])/(nx[0]-RANKS[rk][0])*100):100;
      if(score>data.best){newBest=data.best>0;data.best=score;}
      data.bestCorrect=Math.max(data.bestCorrect||0,correct);
      if(!data.bestGrade||'SABC'.indexOf(grade.g)<'SABC'.indexOf(data.bestGrade))data.bestGrade=grade.g;
      if(correct>=8&&!data.mockOpen){data.mockOpen=true;unlocked=true;}
      face(grade.g==='S'?'char_win':grade.g==='A'?'char_happy':grade.g==='B'?'char_normal':'char_tired','hop');
      elOv.innerHTML=`<div class="quiz-paper">
        <div class="quiz-grade" style="--gc:${grade.col}"><b>${grade.g}</b><span>${grade.t}</span></div>
        <div class="quiz-p-title"><small>RESULT · DAY ${gs.day||1}</small>今夜の採点${mock?'<span class="quiz-mode-tag">模擬試験</span>':''}</div>
        <div class="quiz-f-top">
          <div class="quiz-f-num"><span class="quiz-f-cnt">0</span><small>/${QN}</small><svg viewBox="0 0 100 70" preserveAspectRatio="none"><path d="M60 4 C 20 0, 2 22, 6 40 C 10 62, 80 70, 94 40 C 102 18, 70 2, 50 6"/></svg></div>
          <div class="quiz-f-sc">SCORE<br><b class="quiz-f-pts">0</b>${newBest?'<span class="quiz-f-new">NEW BEST</span>':''}<br>BEST ${data.best.toLocaleString()}　最大コンボ ${maxCombo}</div>
        </div>
        <div class="quiz-f-areas">${['L','P','S'].map(a=>{const [r,n]=byArea[a],pc=n?Math.round(r/n*100):0;
          return `<div class="quiz-f-row"><span class="quiz-f-lab">${AREA[a].short}</span><span class="quiz-f-bar" style="--c:${AREA[a].col}"><i data-w="${pc}"></i></span><span class="quiz-f-val">${r}/${n} ${pc}%</span></div>`;}).join('')}
          <div class="quiz-p-note" style="margin-top:0">赤い点線＝合格ライン（各科目60%）${missed.length?`<br>復習リストに +${missed.length}問`:''}${unlocked?'<br><b>🔓 模擬試験モードが解放された！</b>':''}</div></div>
        <div class="quiz-f-rank">ランク <b>${RANKS[rk][1]}</b>${rankUp?'<span class="quiz-rup">RANK UP!</span>':''}<span class="quiz-f-rbar"><i style="width:${rpc}%"></i></span><span style="font-family:var(--mono);font-size:.62rem">${nx?`次まで${nx[0]-data.right}問`:'MAX'}</span></div>
        <div class="quiz-p-note" style="margin-top:6px">最近の記録（正解数${data.hist.some(h=>h.m)?'・斜線＝模試':''}）</div>
        <div class="quiz-f-hist">${data.hist.map((h,i)=>`<i class="${i===data.hist.length-1?'now':''}${h.m?' mk':''}" style="height:${Math.max(6,h.c*10)}%;animation-delay:${.3+i*.06}s"><b>${h.c}</b></i>`).join('')}</div>
        <button class="quiz-btn">次へ ▶<small>Enter</small></button></div>`;
      elOv.querySelector('.quiz-btn').addEventListener('click',finish);
      if(rankUp)later(()=>{banner('ランクアップ！ '+RANKS[rk][1]);synth('fanfare');},1700);
      elOv.classList.add('on');
      synth('page');
      later(()=>{elOv.querySelectorAll('.quiz-f-bar i').forEach(i=>i.style.width=i.dataset.w+'%');},120);
      const cnt=elOv.querySelector('.quiz-f-cnt'),pts=elOv.querySelector('.quiz-f-pts');
      const t0=performance.now();
      const step=()=>{if(mg._ended||st!=='final')return;const k=Math.min(1,(performance.now()-t0)/900),e=1-Math.pow(1-k,3);
        cnt.textContent=Math.round(correct*e);pts.textContent=Math.round(score*e).toLocaleString();if(k<1){if(Math.random()<.4)synth('tick');requestAnimationFrame(step);}};
      requestAnimationFrame(step);
      later(()=>{synth('stamp');AU.se(correct>=7?'ach':'decide');
        if(correct>=7){synth('fanfare');const r=relRect(elOv.querySelector('.quiz-paper'));for(let i=0;i<3;i++)later(()=>burst(r.x+r.w*(.2+.3*i),r.y+30,26,['#e8b830','#00e8c8','#e83055','#44ee88','#b98cff'],1.1),i*160);}
      },1150);
    }
    function finish(){
      if(st!=='final'||performance.now()-finalAt<500)return;
      AU.se('decide');synth('page');
      st='ending';elOv.classList.remove('on');root.classList.add('quiz-pre');
      const E=ENDINGS[grade.g];
      if(grade.g==='B'||grade.g==='C')lampOn=grade.g==='C'?.3:.6;
      endG=grade.g;endT=0;
      later(()=>startStory(E.lines,()=>mg.end('done'),E.face,`<small>EPILOGUE · ${grade.g}</small>${grade.t}`),350);
    }

    // ── ループ・入力 ──
    mg.loop(dt=>{
      if(st==='ask'){
        left-=dt;
        const s=Math.max(0,Math.ceil(left));
        elFill.style.width=Math.max(0,left/qtime*100)+'%';
        if(s!==lastSec){lastSec=s;elTN.textContent=s;mg.setTimer(s+'s');
          if(s<=5&&s>0){elTimer.classList.add('low');AU.se('comment');synth('tick');if(s===5){face('char_fear');say('やば、時間……',1200);}}}
        if(left<=0)choose(-1);
      }
      storyTick(dt);
      drawBg(dt);drawFx(dt);
    });
    mg.onKey(e=>{
      if(e.type!=='keydown'||e.repeat)return;
      const k=e.key;
      if(st==='ask'&&k>='1'&&k<='4'){e.preventDefault();choose(+k-1);return;}
      if(st==='title'&&(k==='1'||k==='2')){e.preventDefault();pickMode(k==='2');return;}
      if(k==='Enter'||k===' '){
        e.preventDefault();
        if(st==='title')pickMode(false);else if(sDone)advStory();
        else if(st==='intro')begin();else if(st==='reveal')next();else if(st==='final')finish();
      }
    });
    mg.setTimer('');hudScore();
    showTitle();

    // テスト用フック（ゲームには影響しない）
    body._quiz={BANK,pickQuestions,state:()=>({st,qi,correct,score,combo,answered,correctIdx,cur:cur&&cur.id,byArea:JSON.parse(JSON.stringify(byArea))}),
      setLeft:v=>{left=v;}};

    return {result(reason){
      ro.disconnect();
      const done=reason==='done';
      let fx;
      if(done){
        fx={certKnow:Math.min(15,Math.round(correct*1.5)),jobRep:Math.floor(correct/3),
          mental:correct>=8?3:correct<=3?-2:0,fatigue:5};
      }else{
        fx={certKnow:correct,fatigue:2};
      }
      const areaStr=['L','P','S'].map(a=>`${AREA[a].short} ${byArea[a][0]}/${byArea[a][1]}`).join('　');
      return {
        title:done?(correct===QN?'📝 満点！':correct>=7?'📝 合格圏の手ごたえ':correct>=4?'📝 一問一答 終了':'📝 今夜は不調'):'📝 途中でノートを閉じた',
        summary:`正解 <span class="${correct>=(done?7:1)?'up':'down'}">${correct}/${done?QN:answered}</span>　スコア ${score.toLocaleString()}`+
          (done?`${newBest?' <span class="up">NEW BEST</span>':''}<br>${areaStr}`:'<br>途中まで解いた分だけ、頭に残った。'),
        fx,time:done?50:20,sp:done&&correct>=7?1:0,
        log:done?`乙4の一問一答を解いた（${correct}/${QN}問正解）。`:'乙4の一問一答を途中まで解いた。',
        cutin:done?(correct===QN?['win','……全部わかる。工場の匂いが、少しずつ文字になっていく。']
          :correct>=7?['happy','……覚えてる。ちゃんと、積み上がってる。']
          :correct<=3?['tired','……頭に入らない夜もある。また明日。']:null):null,
      };
    }};
  },
});
})();
