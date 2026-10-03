// ══════════════════════════════════════════════════════════
// ホラーノベル「怪談配信・実録編」
// だんのうらが、リスナーから届いた「実録怪談」を生配信で朗読するサウンドノベル。
// 1プレイ1話（未読の話から順に）。各話は三幕構成・選択肢3回で、
// 隠しゲージ「盛り上がり」と「霊障」が動き、エンディングが3種に分岐する。
//   霊障が高い → 話が部屋に滲み出す（画面の色・部屋の背景・名前のないコメント）
// 4話すべて読むと、最終話「三十日目の投稿」が解放される。
// 背景・人影・エフェクトはすべてCanvas 2Dで描画。効果音はWeb Audioで合成。
// 記録は gs.horrorData（既読・回収エンディング・設定）。
// ══════════════════════════════════════════════════════════
addMinigameStyle('horror',`
.mg-horror{padding:0;max-width:520px;}
.hr-stage{position:relative;flex:1;min-height:0;width:100%;overflow:hidden;background:#05040e;cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;--hb:168px;}
.hr-cv{position:absolute;inset:0;width:100%;height:100%;display:block;}
.hr-top{position:absolute;left:0;right:0;top:0;height:30px;display:flex;align-items:center;gap:7px;padding:0 9px;background:linear-gradient(rgba(5,4,14,.92),rgba(5,4,14,0));font-family:var(--mono);font-size:.6rem;color:var(--tx);z-index:3;pointer-events:none;transition:opacity .5s;}
.hr-live{background:var(--rd);color:#fff;padding:1px 6px 1px 5px;border-radius:2px;letter-spacing:.12em;display:flex;align-items:center;gap:4px;box-shadow:0 0 8px rgba(232,48,85,.5);}
.hr-live i{width:6px;height:6px;border-radius:50%;background:#fff;animation:hr-blink 1.1s infinite;}
.hr-view{color:var(--tx-b);min-width:44px;}
.hr-heart{color:#ff8fb8;}
.hr-ttl{flex:1;font-family:var(--dot);color:var(--tx-b);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-align:right;opacity:.85;letter-spacing:.04em;}
.hr-stage.ui-off .hr-top,.hr-stage.ui-off .hr-chat,.hr-stage.ui-off .hr-box{opacity:0;pointer-events:none;}
.hr-chat{position:absolute;left:7px;width:68%;bottom:calc(var(--hb) + 6px);height:25%;display:flex;flex-direction:column;justify-content:flex-end;gap:3px;pointer-events:none;z-index:2;-webkit-mask-image:linear-gradient(transparent,#000 30%);mask-image:linear-gradient(transparent,#000 30%);transition:opacity .4s;}
.hr-stage.choosing .hr-chat{opacity:.35;}
.hr-msg{font-family:var(--dot);font-size:.7rem;line-height:1.4;color:#ece4ff;text-shadow:0 0 3px #000,0 1px 2px #000;padding:2px 7px;background:rgba(6,4,16,.5);border-left:2px solid rgba(138,82,212,.5);border-radius:0 3px 3px 0;align-self:flex-start;max-width:100%;animation:hr-in .32s ease-out;word-break:break-all;}
.hr-msg b{font-weight:normal;margin-right:7px;color:#9a8fb8;}
.hr-msg.sys{color:var(--gd);border-left-color:var(--gd);font-family:var(--mono);font-size:.64rem;}
.hr-msg.nn{color:#b9d0e6;background:rgba(10,22,34,.55);border-left-color:#5b7690;text-shadow:0 0 6px rgba(150,200,255,.55);animation:hr-in .32s ease-out,hr-nn 3.2s ease-in-out infinite;}
.hr-msg.nn b{display:inline-block;width:3.4em;height:.85em;border-bottom:1px dashed #6b7c90;vertical-align:-1px;margin-right:7px;}
.hr-msg.odd b{color:#6f6888;font-style:italic;}
.hr-msg.hype{border-left-color:var(--gd);}
.hr-chat.gl .hr-msg{animation:hr-gl .18s steps(2) 3;}
.hr-box{position:absolute;left:7px;right:7px;bottom:7px;height:var(--hb);background:linear-gradient(rgba(12,8,26,.94),rgba(6,4,16,.97));border:1px solid rgba(138,82,212,.5);border-radius:4px;padding:7px 12px 10px;z-index:4;box-shadow:0 0 20px rgba(0,0,0,.7),inset 0 0 26px rgba(138,82,212,.08),inset 0 1px 0 rgba(222,204,248,.08);transition:border-color .8s,box-shadow .8s,opacity .4s;display:flex;flex-direction:column;}
.hr-box::before{content:"";position:absolute;inset:3px;border:1px solid rgba(138,82,212,.14);border-radius:2px;pointer-events:none;}
.hr-stage.r2 .hr-box{border-color:rgba(200,70,110,.55);}
.hr-stage.r3 .hr-box{border-color:rgba(232,48,85,.75);box-shadow:0 0 22px rgba(232,48,85,.25),inset 0 0 30px rgba(232,48,85,.1);}
.hr-bar{display:flex;align-items:center;gap:5px;min-height:26px;margin-bottom:3px;}
.hr-name{font-family:var(--dot);font-size:.74rem;letter-spacing:.1em;color:var(--cy);padding:1px 8px;border:1px solid rgba(0,232,200,.35);background:rgba(0,232,200,.06);border-radius:2px;white-space:nowrap;}
.hr-name.r{color:var(--gd);border-color:rgba(232,184,48,.4);background:rgba(232,184,48,.06);}
.hr-name.h{color:#b9d0e6;border-color:rgba(150,190,230,.4);background:rgba(150,190,230,.06);}
.hr-name.none{visibility:hidden;}
.hr-tgs{margin-left:auto;display:flex;gap:4px;}
.hr-tg{font-family:var(--mono);font-size:.6rem;letter-spacing:.04em;min-width:34px;height:26px;padding:0 6px;border:1px solid rgba(138,82,212,.42);background:rgba(138,82,212,.1);color:var(--tx);border-radius:2px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.hr-tg:active{transform:translateY(1px);}
.hr-tg.on{color:#05040e;border-color:var(--cy);background:var(--cy);box-shadow:0 0 8px rgba(0,232,200,.45);}
.hr-text{flex:1;font-family:var(--serif);font-size:.95rem;line-height:1.78;color:var(--tx-b);white-space:pre-wrap;overflow:hidden;letter-spacing:.02em;text-shadow:0 0 1px rgba(222,204,248,.3);}
.hr-text.d{font-family:var(--dot);font-size:.92rem;color:#e6f7f4;}
.hr-text.s{font-style:italic;color:#a99fc4;text-align:center;font-size:.86rem;padding-top:6px;}
.hr-text.r{color:#f0e6d0;}
.hr-text.h{color:#c9dcef;}
.hr-text .gch{color:var(--rd);}
.hr-next{position:absolute;right:12px;bottom:7px;color:var(--cy);font-size:.66rem;animation:hr-bob .9s ease-in-out infinite;opacity:0;}
.hr-next.on{opacity:1;}
.hr-mode{position:absolute;left:12px;bottom:6px;font-family:var(--mono);font-size:.55rem;color:var(--cy);letter-spacing:.15em;opacity:.8;}
.hr-choices{position:absolute;left:0;right:0;top:36px;bottom:calc(var(--hb) + 10px);display:flex;flex-direction:column;justify-content:center;gap:10px;padding:0 16px;z-index:5;pointer-events:none;}
.hr-ch{pointer-events:auto;display:flex;align-items:center;gap:11px;min-height:56px;padding:9px 14px 9px 10px;text-align:left;font-family:var(--serif);font-size:.9rem;line-height:1.45;color:var(--tx-b);background:linear-gradient(90deg,rgba(26,14,48,.96),rgba(10,7,22,.93));border:1px solid rgba(138,82,212,.55);border-left:3px solid var(--pu);border-radius:3px;cursor:pointer;opacity:0;transform:translateX(-18px);transition:opacity .28s,transform .28s,background .15s,border-color .15s;box-shadow:0 4px 16px rgba(0,0,0,.6);-webkit-tap-highlight-color:transparent;}
.hr-ch.in{opacity:1;transform:none;}
.hr-ch:hover,.hr-ch.sel{border-color:var(--cy);border-left-color:var(--cy);background:linear-gradient(90deg,rgba(0,70,64,.9),rgba(10,7,22,.93));}
.hr-ch.pick{border-color:var(--gd);border-left-color:var(--gd);background:linear-gradient(90deg,rgba(80,60,10,.9),rgba(10,7,22,.93));}
.hr-ch.out{opacity:0;transform:translateX(18px);}
.hr-ch i{font-style:normal;flex:none;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:.78rem;color:var(--cy);border:1px solid rgba(0,232,200,.5);border-radius:50%;}
.hr-chq{text-align:center;font-family:var(--dot);font-size:.72rem;color:var(--tx);letter-spacing:.2em;text-shadow:0 0 6px #000;opacity:0;transition:opacity .3s;}
.hr-chq.in{opacity:.9;}
.hr-flash{position:absolute;inset:0;z-index:9;pointer-events:none;opacity:0;background:#fff;}
.hr-ov{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px;cursor:default;animation:hr-fade .35s ease-out;}
.hr-ov.dim{background:rgba(4,3,10,.82);}
.hr-panel{width:100%;max-width:400px;max-height:100%;display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--pu);border-radius:4px;box-shadow:0 0 30px rgba(138,82,212,.25);overflow:hidden;}
.hr-ph{display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(138,82,212,.3);font-family:var(--mono);font-size:.68rem;letter-spacing:.14em;color:var(--cy);}
.hr-ph button{margin-left:auto;}
.hr-pb{flex:1;overflow-y:auto;padding:10px 12px;-webkit-overflow-scrolling:touch;}
.hr-btn{font-family:var(--dot);font-size:.8rem;letter-spacing:.08em;color:var(--tx-b);background:rgba(138,82,212,.14);border:1px solid rgba(138,82,212,.55);border-radius:3px;padding:0 14px;min-height:44px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.hr-btn:hover{border-color:var(--cy);color:#fff;}
.hr-btn.main{background:linear-gradient(90deg,rgba(232,48,85,.3),rgba(138,82,212,.25));border-color:var(--rd);color:#fff;font-size:.92rem;min-height:52px;box-shadow:0 0 16px rgba(232,48,85,.25);}
.hr-btn.sm{min-height:32px;font-size:.66rem;padding:0 10px;}
.hr-log-e{padding:6px 0;border-bottom:1px dashed rgba(138,82,212,.18);font-size:.8rem;line-height:1.65;}
.hr-log-e b{display:block;font-family:var(--dot);font-weight:normal;font-size:.62rem;color:var(--cy);letter-spacing:.1em;}
.hr-log-e.r b{color:var(--gd);}
.hr-log-e.s{color:#a99fc4;font-style:italic;text-align:center;}
.hr-log-e.ch{color:var(--gd);font-family:var(--dot);font-size:.72rem;}
.hr-log-e.act{color:var(--rd);font-family:var(--dot);text-align:center;letter-spacing:.2em;font-size:.72rem;}
.hr-row{display:flex;align-items:center;gap:8px;margin:8px 0;font-size:.78rem;}
.hr-row>span{flex:1;}
.hr-seg{display:flex;gap:3px;}
.hr-seg button{min-width:40px;}
.hr-seg button.on{background:var(--cy);color:#05040e;border-color:var(--cy);}
.hr-note{font-size:.66rem;color:var(--tx-d);line-height:1.6;}
/* タイトル */
.hr-title{justify-content:space-between;padding:56px 18px 20px;background:linear-gradient(rgba(4,3,10,.9),rgba(4,3,10,.6) 38%,rgba(4,3,10,.55) 60%,rgba(4,3,10,.92));}
.hr-logo{text-align:center;position:relative;}
.hr-logo .k1{font-family:var(--mono);font-size:.6rem;letter-spacing:.5em;color:var(--rd);margin-bottom:8px;text-shadow:0 0 8px rgba(232,48,85,.7);}
.hr-logo .k2{font-family:var(--serif);font-weight:900;font-size:2.7rem;line-height:1.05;letter-spacing:.12em;color:#efe6ff;text-shadow:2px 0 rgba(232,48,85,.55),-2px 0 rgba(0,232,200,.4),0 0 24px rgba(138,82,212,.8);animation:hr-logo 7s infinite;}
.hr-logo .k3{display:inline-block;margin-top:10px;font-family:var(--dot);font-size:1rem;letter-spacing:.6em;padding:3px 4px 3px 14px;color:#05040e;background:var(--tx-b);box-shadow:0 0 14px rgba(222,204,248,.4);}
.hr-logo .k4{margin-top:12px;font-family:var(--serif);font-size:.72rem;color:var(--tx);letter-spacing:.2em;opacity:.85;}
.hr-logo .drip{position:absolute;top:58px;width:2px;background:linear-gradient(rgba(232,48,85,.0),rgba(232,48,85,.7));border-radius:0 0 2px 2px;animation:hr-drip 5s ease-in infinite;}
.hr-menu{width:100%;max-width:340px;display:flex;flex-direction:column;gap:9px;}
.hr-next-s{font-family:var(--serif);font-size:.74rem;color:var(--tx);text-align:center;margin-bottom:2px;line-height:1.6;}
.hr-next-s em{font-style:normal;color:var(--gd);}
.hr-menu .two{display:flex;gap:8px;}.hr-menu .two .hr-btn{flex:1;}
.hr-press{font-family:var(--mono);font-size:.6rem;letter-spacing:.3em;color:var(--tx-d);text-align:center;margin-top:4px;}
/* 投稿の手紙 */
.hr-letter{width:100%;max-width:360px;background:linear-gradient(#1b1626,#110d1a);border:1px solid rgba(232,184,48,.45);border-radius:3px;padding:18px 18px 14px;box-shadow:0 10px 40px rgba(0,0,0,.8),inset 0 0 40px rgba(232,184,48,.05);position:relative;background-image:repeating-linear-gradient(transparent 0 27px,rgba(232,184,48,.08) 27px 28px);animation:hr-letter .6s ease-out;cursor:pointer;}
.hr-letter .no{font-family:var(--mono);font-size:.58rem;letter-spacing:.25em;color:var(--gd);opacity:.8;}
.hr-letter .tt{font-family:var(--serif);font-weight:700;font-size:1.32rem;color:#f4ead6;margin:8px 0 4px;letter-spacing:.06em;line-height:1.4;}
.hr-letter .fr{font-family:var(--dot);font-size:.68rem;color:var(--tx);}
.hr-letter .bl{font-family:var(--serif);font-size:.82rem;line-height:1.95;color:#d8ccb4;margin:12px 0 10px;}
.hr-letter .st{display:flex;justify-content:space-between;font-family:var(--mono);font-size:.56rem;color:var(--tx-d);letter-spacing:.1em;}
.hr-letter .go{text-align:center;font-family:var(--dot);font-size:.74rem;color:var(--cy);margin-top:12px;animation:hr-blink 1.6s infinite;}
.hr-letter.hid{border-color:rgba(150,190,230,.5);background-image:repeating-linear-gradient(transparent 0 27px,rgba(150,190,230,.07) 27px 28px);}
.hr-letter.hid .tt{color:#cfe2f4;}
/* 幕カード */
.hr-act{pointer-events:none;background:radial-gradient(ellipse at center,rgba(4,3,10,.75),rgba(4,3,10,.2) 70%);}
.hr-act .a1{font-family:var(--mono);font-size:.62rem;letter-spacing:.6em;color:var(--rd);text-shadow:0 0 8px rgba(232,48,85,.6);animation:hr-actin 2.4s ease-out both;}
.hr-act .a2{font-family:var(--serif);font-weight:700;font-size:1.5rem;letter-spacing:.24em;color:#f0e8ff;margin-top:10px;text-shadow:0 0 18px rgba(138,82,212,.9);animation:hr-actin 2.4s .15s ease-out both;}
.hr-act .a3{width:0;height:1px;margin-top:12px;background:linear-gradient(90deg,transparent,var(--tx-b),transparent);animation:hr-line 2.4s .1s ease-out both;}
/* エンディング */
.hr-end{background:radial-gradient(ellipse at center,rgba(8,4,16,.88),rgba(2,1,6,.96));cursor:pointer;padding:24px;}
.hr-end .e4 .fn{display:block;max-width:300px;margin:10px auto 0;color:#b9d0e6;font-family:var(--serif);letter-spacing:.04em;line-height:1.7;}
.hr-end .e1{font-family:var(--mono);font-size:.62rem;letter-spacing:.55em;color:var(--tx-d);}
.hr-end .e2{font-family:var(--serif);font-weight:900;font-size:1.9rem;letter-spacing:.2em;margin:10px 0 2px;animation:hr-endin 1.4s ease-out both;}
.hr-end .e3{font-family:var(--serif);font-size:1rem;color:var(--tx-b);letter-spacing:.1em;animation:hr-endin 1.4s .3s ease-out both;text-align:center;}
.hr-end .e4{margin-top:18px;font-family:var(--mono);font-size:.62rem;color:var(--tx);letter-spacing:.12em;text-align:center;line-height:1.9;animation:hr-endin 1.4s .6s ease-out both;}
.hr-end .new{display:inline-block;margin-left:6px;padding:0 5px;background:var(--gd);color:#05040e;font-size:.56rem;border-radius:2px;}
.hr-end .e5{margin-top:22px;font-family:var(--dot);font-size:.72rem;color:var(--cy);animation:hr-blink 1.6s infinite;}
.hr-end.good .e2{color:var(--gd);text-shadow:0 0 18px rgba(232,184,48,.6);}
.hr-end.normal .e2{color:var(--tx-b);text-shadow:0 0 14px rgba(138,82,212,.7);}
.hr-end.cursed .e2{color:var(--rd);text-shadow:2px 0 rgba(0,232,200,.4),0 0 20px rgba(232,48,85,.8);}
/* エンディング一覧 */
.hr-es{margin-bottom:12px;}
.hr-es-h{display:flex;align-items:center;gap:8px;font-family:var(--dot);font-size:.78rem;color:var(--tx-b);}
.hr-es-h span{margin-left:auto;font-family:var(--mono);font-size:.62rem;color:var(--cy);}
.hr-es-bar{height:3px;background:rgba(138,82,212,.2);margin:5px 0 6px;border-radius:2px;overflow:hidden;}
.hr-es-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--pu),var(--cy));}
.hr-es-e{display:flex;gap:7px;align-items:center;font-size:.72rem;padding:3px 0;color:var(--tx);}
.hr-es-e em{font-style:normal;font-family:var(--mono);font-size:.56rem;padding:1px 5px;border-radius:2px;border:1px solid;min-width:40px;text-align:center;}
.hr-es-e .g{color:var(--gd);}.hr-es-e .n{color:var(--tx);}.hr-es-e .c{color:var(--rd);}
.hr-es-e.lock{color:var(--tx-d);}
.hr-tut li{margin:0 0 10px 0;list-style:none;font-size:.8rem;line-height:1.7;display:flex;gap:9px;}
.hr-tut li b{flex:none;font-family:var(--mono);font-weight:normal;color:var(--cy);border:1px solid rgba(0,232,200,.4);border-radius:2px;padding:0 6px;height:22px;font-size:.62rem;display:flex;align-items:center;}
.hr-tut ul{padding:0;margin:0;}
@keyframes hr-blink{50%{opacity:.25}}
@keyframes hr-bob{50%{transform:translateY(3px)}}
@keyframes hr-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes hr-fade{from{opacity:0}}
@keyframes hr-nn{0%,100%{opacity:1}48%{opacity:1}50%{opacity:.35;transform:translateX(1px)}52%{opacity:1;transform:none}}
@keyframes hr-gl{0%{transform:translateX(-4px);text-shadow:3px 0 var(--rd),-3px 0 var(--cy)}100%{transform:translateX(4px)}}
@keyframes hr-logo{0%,90%,94%,100%{transform:none;opacity:1;clip-path:inset(0 0 0 0)}91%{transform:translateX(-5px) skewX(8deg);opacity:.7;clip-path:inset(0 0 0 0)}92%{transform:translateX(4px);opacity:1;clip-path:inset(30% 0 40% 0)}93%{transform:translateX(-2px);clip-path:inset(0 0 55% 0)}}
@keyframes hr-drip{0%{height:0;opacity:0}20%{opacity:1}70%{height:26px;opacity:1}100%{height:34px;opacity:0}}
@keyframes hr-letter{from{opacity:0;transform:translateY(24px) rotate(-1.5deg)}to{opacity:1;transform:none}}
@keyframes hr-actin{0%{opacity:0;letter-spacing:.9em;filter:blur(4px)}25%{opacity:1;filter:none}75%{opacity:1}100%{opacity:0}}
@keyframes hr-line{0%{width:0;opacity:0}30%{width:220px;opacity:1}75%{opacity:1}100%{width:260px;opacity:0}}
@keyframes hr-endin{from{opacity:0;transform:scale(1.08);filter:blur(5px)}to{opacity:1;transform:none;filter:none}}
@media (max-height:640px){.hr-logo .k2{font-size:2.1rem}.hr-title{padding-top:40px}.hr-text{font-size:.88rem;line-height:1.65}}
`);

(()=>{
// ───────────────────────── 小道具 ─────────────────────────
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const FM='"Share Tech Mono", monospace',FD='"DotGothic16", sans-serif',FS='"Noto Serif JP", serif';
function mkRnd(seed){let s=seed>>>0||1;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
function poly(g,pts){g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();}
function LG(g,x0,y0,x1,y1,st){const r=g.createLinearGradient(x0,y0,x1,y1);st.forEach(s=>r.addColorStop(s[0],s[1]));return r;}
function RG(g,x,y,r0,r1,st){const r=g.createRadialGradient(x,y,r0,x,y,r1);st.forEach(s=>r.addColorStop(s[0],s[1]));return r;}
function glow(g,x,y,r,rgb,a){if(a<=0||r<=0)return;g.save();g.globalCompositeOperation='lighter';g.fillStyle=RG(g,x,y,0,r,[[0,`rgba(${rgb},${a})`],[.4,`rgba(${rgb},${a*.35})`],[1,`rgba(${rgb},0)`]]);g.fillRect(x-r,y-r,r*2,r*2);g.restore();}
function rect(g,x,y,w,h,f){g.fillStyle=f;g.fillRect(x,y,w,h);}
const mkC=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c;};

// ── 手続き生成テクスチャ（一度だけ作る） ──
let TX=null;
function textures(){
  if(TX)return TX;
  const r=mkRnd(77);
  const conc=mkC(160,160),a=conc.getContext('2d');
  for(let i=0;i<2600;i++){const v=r();a.fillStyle=v<.5?`rgba(0,0,0,${.05+r()*.18})`:`rgba(255,255,255,${.015+r()*.05})`;a.fillRect(r()*160,r()*160,1+r()*2,1+r()*2);}
  for(let i=0;i<26;i++){const x=r()*160,y=r()*160,rr=6+r()*22;a.fillStyle=RG(a,x,y,0,rr,[[0,`rgba(0,0,0,${.06+r()*.08})`],[1,'rgba(0,0,0,0)']]);a.fillRect(x-rr,y-rr,rr*2,rr*2);}
  for(let i=0;i<6;i++){a.strokeStyle=`rgba(0,0,0,${.12+r()*.1})`;a.lineWidth=.6;a.beginPath();let x=r()*160,y=r()*160;a.moveTo(x,y);for(let k=0;k<6;k++){x+=(r()-.5)*18;y+=r()*12;a.lineTo(x,y);}a.stroke();}
  const wood=mkC(200,64),b=wood.getContext('2d');
  for(let y=0;y<64;y++){b.fillStyle=`rgba(${r()<.5?0:255},${r()<.5?0:200},${r()<.5?0:150},${.02+r()*.05})`;b.fillRect(0,y,200,1);}
  for(let i=0;i<40;i++){b.strokeStyle=`rgba(0,0,0,${.08+r()*.12})`;b.lineWidth=.7;b.beginPath();const y=r()*64;b.moveTo(0,y);b.bezierCurveTo(60,y+(r()-.5)*6,140,y+(r()-.5)*6,200,y+(r()-.5)*4);b.stroke();}
  const grain=mkC(128,128),c=grain.getContext('2d'),id=c.createImageData(128,128);
  for(let i=0;i<id.data.length;i+=4){const v=r()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=r()*38;}
  c.putImageData(id,0,0);
  const noises=[0,1,2].map(()=>{const n=mkC(96,96),d=n.getContext('2d'),im=d.createImageData(96,96);for(let i=0;i<im.data.length;i+=4){const v=r()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255;}d.putImageData(im,0,0);return n;});
  const scan=mkC(2,3),s=scan.getContext('2d');s.fillStyle='rgba(0,0,0,.55)';s.fillRect(0,2,2,1);
  const brush=mkC(160,40),bb=brush.getContext('2d');
  for(let i=0;i<300;i++){bb.fillStyle=`rgba(255,255,255,${r()*.06})`;bb.fillRect(r()*160,r()*40,20+r()*80,.6);}
  TX={conc,wood,grain,noises,scan,brush};
  return TX;
}
function texFill(g,tex,alpha,x,y,w,h,comp){g.save();g.globalAlpha=alpha;if(comp)g.globalCompositeOperation=comp;g.fillStyle=g.createPattern(tex,'repeat');g.fillRect(x,y,w,h);g.restore();}
function texPoly(g,tex,alpha,pts){g.save();poly(g,pts);g.clip();g.globalAlpha=alpha;g.fillStyle=g.createPattern(tex,'repeat');g.fill();g.restore();}

// ── 窓ガラスを伝う雨 ──
function glassRain(g,x,y,w,h,t,seed,a){
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  const n=Math.max(10,(w*h/260)|0);
  g.strokeStyle=`rgba(190,205,255,${a||.22})`;g.lineWidth=1;g.beginPath();
  for(let i=0;i<n;i++){
    const f=((i*0.6180339+seed*.137)%1),sp=60+((i*37)%50)*3;
    const px=x+f*w,py=y+((i*91.7+t*sp)%(h+40))-20,l=6+(i%5)*3;
    g.moveTo(px,py);g.lineTo(px-l*.12,py+l);
  }
  g.stroke();
  g.fillStyle='rgba(200,215,255,.16)';
  for(let i=0;i<n*.6;i++){const px=x+((i*0.754877+seed*.31)%1)*w,py=y+((i*0.5698403+seed*.21)%1)*h;g.fillRect(px,py,1.5,1.5);}
  g.restore();
}
// 遠景の街並み（窓の外）
function skyline(g,x,y,w,h,rnd,lit,col){
  let cx=x;g.fillStyle=col||'#05060c';
  while(cx<x+w){const bw=w*(.08+rnd()*.14),bh=h*(.25+rnd()*.6);g.fillRect(cx,y+h-bh,bw+1,bh);
    for(let wy=y+h-bh+4;wy<y+h-4;wy+=6)for(let wx=cx+3;wx<cx+bw-3;wx+=5)if(rnd()<lit){g.fillStyle=rnd()<.7?'rgba(232,190,110,.55)':'rgba(150,210,230,.45)';g.fillRect(wx,wy,2,2.5);g.fillStyle=col||'#05060c';}
    cx+=bw;}
}

// ───────────────────── 人影（シルエット） ─────────────────────
// (x,y)=足元、h=身長。opts.c 塗り色, opts.rim 縁の光
function figure(g,kind,x,y,h,o){
  o=o||{};const c=o.c||'#030208';const u=h/100;
  g.save();g.translate(x,y);if(o.flip)g.scale(-1,1);
  g.fillStyle=c;g.beginPath();
  if(kind==='worker'){
    g.ellipse(0,-88*u,7.5*u,8.5*u,0,0,TAU);
    g.moveTo(-10*u,-90*u);g.quadraticCurveTo(0,-104*u,10*u,-90*u);g.lineTo(12*u,-88*u);g.lineTo(-12*u,-88*u);g.closePath();
    g.moveTo(-14*u,-77*u);g.quadraticCurveTo(0,-81*u,14*u,-77*u);g.lineTo(17*u,-44*u);g.lineTo(11*u,-44*u);g.lineTo(9*u,0);g.lineTo(2*u,0);g.lineTo(0,-40*u);g.lineTo(-2*u,0);g.lineTo(-9*u,0);g.lineTo(-11*u,-44*u);g.lineTo(-17*u,-44*u);g.closePath();
    g.moveTo(14*u,-72*u);g.lineTo(26*u,-56*u);g.lineTo(30*u,-58*u);g.lineTo(20*u,-74*u);g.closePath();
  }else if(kind==='woman'){
    g.moveTo(0,-100*u);g.bezierCurveTo(-11*u,-100*u,-12*u,-86*u,-11*u,-70*u);g.lineTo(-13*u,-60*u);g.lineTo(-8*u,-62*u);
    g.lineTo(-12*u,-28*u);g.lineTo(-6*u,-28*u);g.lineTo(-5*u,0);g.lineTo(-1*u,0);g.lineTo(0,-28*u);g.lineTo(1*u,0);g.lineTo(5*u,0);g.lineTo(6*u,-28*u);g.lineTo(12*u,-28*u);
    g.lineTo(8*u,-62*u);g.lineTo(13*u,-60*u);g.lineTo(11*u,-70*u);g.bezierCurveTo(12*u,-86*u,11*u,-100*u,0,-100*u);g.closePath();
    if(o.umbrella==='open'){g.moveTo(-34*u,-92*u);g.quadraticCurveTo(0,-128*u,34*u,-92*u);g.quadraticCurveTo(24*u,-96*u,17*u,-90*u);g.quadraticCurveTo(8*u,-96*u,0,-90*u);g.quadraticCurveTo(-8*u,-96*u,-17*u,-90*u);g.quadraticCurveTo(-24*u,-96*u,-34*u,-92*u);g.closePath();g.rect(-.8*u,-112*u,1.6*u,52*u);}
    else if(o.umbrella){g.moveTo(14*u,-50*u);g.lineTo(19*u,-50*u);g.lineTo(18*u,-2*u);g.lineTo(16.5*u,4*u);g.lineTo(15*u,-2*u);g.closePath();}
  }else if(kind==='child'){
    g.moveTo(0,-62*u);g.bezierCurveTo(-14*u,-62*u,-16*u,-44*u,-13*u,-40*u);g.lineTo(-17*u,-14*u);g.lineTo(-8*u,-14*u);g.lineTo(-8*u,0);g.lineTo(-1*u,0);g.lineTo(-1*u,-14*u);g.lineTo(1*u,-14*u);g.lineTo(1*u,0);g.lineTo(8*u,0);g.lineTo(8*u,-14*u);g.lineTo(17*u,-14*u);g.lineTo(13*u,-40*u);g.bezierCurveTo(16*u,-44*u,14*u,-62*u,0,-62*u);g.closePath();
  }else if(kind==='hood'){
    g.moveTo(-3*u,-96*u);g.bezierCurveTo(-16*u,-96*u,-18*u,-80*u,-14*u,-72*u);g.bezierCurveTo(-22*u,-66*u,-20*u,-50*u,-18*u,-36*u);g.lineTo(-12*u,-36*u);g.lineTo(-9*u,0);g.lineTo(-2*u,0);g.lineTo(0,-34*u);g.lineTo(2*u,0);g.lineTo(9*u,0);g.lineTo(12*u,-36*u);g.lineTo(18*u,-36*u);g.bezierCurveTo(20*u,-54*u,18*u,-70*u,10*u,-76*u);g.bezierCurveTo(12*u,-86*u,8*u,-96*u,-3*u,-96*u);g.closePath();
  }else if(kind==='seated'){
    g.ellipse(0,-78*u,10*u,11.5*u,0,0,TAU);
    g.moveTo(-24*u,-56*u);g.quadraticCurveTo(0,-68*u,24*u,-56*u);g.lineTo(28*u,0);g.lineTo(-28*u,0);g.closePath();
  }else{ // tall
    g.ellipse(0,-90*u,8*u,10*u,0,0,TAU);
    g.moveTo(-13*u,-78*u);g.quadraticCurveTo(0,-83*u,13*u,-78*u);g.lineTo(16*u,-30*u);g.lineTo(9*u,0);g.lineTo(-9*u,0);g.lineTo(-16*u,-30*u);g.closePath();
  }
  g.fill();
  if(kind==='seated'&&o.headset){g.strokeStyle=o.headset;g.lineWidth=2.4*u;g.beginPath();g.arc(0,-78*u,12*u,Math.PI*1.05,Math.PI*1.95);g.stroke();g.fillStyle=o.headset;g.fillRect(-13.5*u,-80*u,4*u,8*u);g.fillRect(9.5*u,-80*u,4*u,8*u);}
  if(o.rim){g.globalCompositeOperation='lighter';g.strokeStyle=o.rim;g.lineWidth=Math.max(1,1.2*u);g.stroke();}
  g.restore();
}

// ───────────────────────── 背景シーン ─────────────────────────
// 各シーン: bake(g,w,h,R) 静的部分（キャッシュ） / draw(g,w,h,t,S,E) 動く部分
// S=シーンの状態フラグ, E={lt:雷,st:霊障段階,bleed:滲み出す話,mild}
const SC={};

// ── だんのうらの部屋（配信者の背中ごしの視点） ──
function roomBase(g,w,h,R,dark){
  rect(g,0,0,w,h,LG(g,0,0,0,h,[[0,'#130d24'],[.6,'#0c0818'],[1,'#07050e']]));
  texFill(g,TX.conc,.45,0,0,w,h);
  // 窓
  const wx=w*.04,wy=h*.07,ww=w*.36,wh=h*.34;
  rect(g,wx,wy,ww,wh,LG(g,0,wy,0,wy+wh,[[0,'#0b1634'],[1,'#05070f']]));
  skyline(g,wx,wy+wh*.35,ww,wh*.65,R,.18,'#04050b');
  // カーテン
  for(let i=0;i<6;i++){const cx=wx+ww-ww*.18+i*ww*.035;rect(g,cx,wy-6,ww*.04,wh+16,i%2?'#2a1844':'#1f1236');}
  for(let i=0;i<4;i++){const cx=wx-ww*.06+i*ww*.03;rect(g,cx,wy-6,ww*.035,wh+16,i%2?'#2a1844':'#1f1236');}
  g.strokeStyle='#1c1530';g.lineWidth=5;g.strokeRect(wx,wy,ww,wh);g.lineWidth=3;g.beginPath();g.moveTo(wx+ww/2,wy);g.lineTo(wx+ww/2,wy+wh);g.stroke();
  rect(g,wx-6,wy+wh+2,ww+12,5,'#1a1328');
  // ドア
  const dx=w*.83,dy=h*.1,dw=w*.15,dh=h*.5;
  rect(g,dx-4,dy-4,dw+8,dh+4,'#1c1430');rect(g,dx,dy,dw,dh,LG(g,dx,0,dx+dw,0,[[0,'#1a1228'],[1,'#120c1e']]));
  texFill(g,TX.wood,.4,dx,dy,dw,dh);
  g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=1;g.strokeRect(dx+dw*.15,dy+dh*.08,dw*.7,dh*.35);g.strokeRect(dx+dw*.15,dy+dh*.52,dw*.7,dh*.4);
  rect(g,dx+dw*.12,dy+dh*.5,4,4,'#6a5a80');
  // 子どもの絵
  const px=w*.48,py=h*.1,pw=w*.15,ph=h*.11;
  g.save();g.translate(px+pw/2,py+ph/2);g.rotate(-.04);
  rect(g,-pw/2,-ph/2,pw,ph,'#a9a090');texFill(g,TX.conc,.25,-pw/2,-ph/2,pw,ph);
  g.lineWidth=1.6;g.strokeStyle='#c84';g.beginPath();g.arc(-pw*.3,-ph*.22,ph*.14,0,TAU);g.stroke();
  for(let i=0;i<8;i++){const a=i/8*TAU;g.beginPath();g.moveTo(-pw*.3+Math.cos(a)*ph*.18,-ph*.22+Math.sin(a)*ph*.18);g.lineTo(-pw*.3+Math.cos(a)*ph*.26,-ph*.22+Math.sin(a)*ph*.26);g.stroke();}
  g.strokeStyle='#36a';[[.05,.0],[.25,.06]].forEach(([fx,fy],k)=>{const s=k?.7:1;g.beginPath();g.arc(pw*fx,-ph*.05+fy*ph,ph*.08*s,0,TAU);g.moveTo(pw*fx,ph*.03+fy*ph);g.lineTo(pw*fx,ph*.25*s+fy*ph);g.moveTo(pw*fx-ph*.12*s,ph*.12+fy*ph);g.lineTo(pw*fx+ph*.12*s,ph*.12+fy*ph);g.stroke();});
  g.strokeStyle='#4a6';g.beginPath();g.moveTo(-pw/2+3,ph*.38);g.lineTo(pw/2-3,ph*.36);g.stroke();
  rect(g,-3,-ph/2-3,6,5,'#c55');
  g.restore();
  // 棚
  rect(g,w*.45,h*.27,w*.33,4,'#241a34');
  [[.47,.035,.05,'#2c2040'],[.52,.025,.06,'#3a2638'],[.555,.03,.045,'#22304a'],[.6,.06,.035,'#30283e'],[.68,.04,.055,'#2a1f30'],[.73,.03,.04,'#3b2e22']].forEach(([x,bw,bh,c])=>rect(g,w*x,h*.27-h*bh,w*bw,h*bh,c));
  // 机
  poly(g,[[0,h*.52],[w,h*.52],[w,h],[0,h]]);g.fillStyle=LG(g,0,h*.52,0,h,[[0,'#21182e'],[1,'#0d0915']]);g.fill();
  texFill(g,TX.wood,.5,0,h*.52,w,h*.48);
  rect(g,0,h*.52,w,3,'#33264a');
  // モニター
  const mx=w*.27,my=h*.25,mw=w*.46,mh=h*.25;
  rect(g,w*.47,my+mh,w*.06,h*.04,'#0b0812');rect(g,w*.42,h*.535,w*.16,h*.012,'#0b0812');
  rect(g,mx-5,my-5,mw+10,mh+10,'#08060d');
  // マグ・マイク・キーボード
  rect(g,w*.12,h*.47,w*.06,h*.06,'#3a2a3c');g.strokeStyle='#3a2a3c';g.lineWidth=3;g.beginPath();g.arc(w*.18,h*.5,h*.016,-1.4,1.4);g.stroke();
  g.strokeStyle='#100c18';g.lineWidth=4;g.beginPath();g.moveTo(w*.92,h*.52);g.lineTo(w*.86,h*.38);g.lineTo(w*.74,h*.42);g.stroke();
  g.fillStyle='#100c18';g.beginPath();g.ellipse(w*.735,h*.43,w*.025,h*.03,.4,0,TAU);g.fill();
  rect(g,w*.3,h*.56,w*.4,h*.035,'#0e0a16');
  // 本人（背中）
  if(!dark){
    rect(g,w*.36,h*.6,w*.28,h*.4,'#0a0712');
    figure(g,'seated',w*.5,h*1.02,h*.5,{c:'#06040b',headset:'#16121f'});
  }
}
SC.room={
  bake(g,w,h,R){roomBase(g,w,h,R,false);},
  draw(g,w,h,t,S,E){
    const wx=w*.04,wy=h*.07,ww=w*.36,wh=h*.34;
    if(E.lt>0){g.save();g.globalCompositeOperation='lighter';rect(g,wx,wy,ww,wh,`rgba(150,170,255,${E.lt*.5})`);g.restore();}
    glassRain(g,wx,wy,ww,wh,t,3,.25);
    roomDyn(g,w,h,t,S,E,wx,wy,ww,wh);
  }
};
function roomDyn(g,w,h,t,S,E,wx,wy,ww,wh){
  const st=E.st,bl=S.bleed;
  // 窓の外の人影
  if(st>=2||bl){const vis=E.lt>0?1:clamp(Math.sin(t*.5)*2-.6,0,1)*.6;if(vis>0){g.save();g.globalAlpha=vis;figure(g,'tall',wx+ww*.28,wy+wh+6,wh*.75,{c:'#020205'});g.restore();}}
  // モニターの光
  const mx=w*.27,my=h*.25,mw=w*.46,mh=h*.25;
  const fl=st>=1&&Math.sin(t*23)>.93?.5:1;
  rect(g,mx,my,mw,mh,LG(g,0,my,0,my+mh,[[0,`rgba(40,60,120,${.95*fl})`],[1,`rgba(20,18,50,${fl})`]]));
  g.fillStyle='rgba(232,48,85,.85)';g.fillRect(mx+6,my+6,18,6);
  for(let i=0;i<7;i++){const yy=my+16+i*(mh-22)/7,ww2=mw*(.25+((i*37+((t*1.5)|0)*13)%40)/100);g.fillStyle=i%3===0?'rgba(0,232,200,.5)':'rgba(222,204,248,.35)';g.fillRect(mx+mw*.55,yy,ww2*.7,2.5);}
  g.fillStyle='rgba(222,204,248,.25)';for(let i=0;i<5;i++)g.fillRect(mx+8,my+20+i*mh*.13,mw*.42,2);
  if(S.viewers1){g.font=`${h*.04}px ${FM}`;g.fillStyle='#e83055';g.fillText('LIVE  1',mx+mw*.35,my+mh*.6);}
  glow(g,w*.5,h*.42,w*.55,'60,90,200',.28*fl);
  // スタンドライト
  const lf=st>=1?(Math.sin(t*17)>.8||Math.sin(t*3.1)>.97?.35:1):1;
  glow(g,w*.08,h*.44,w*.32,'232,170,90',.3*lf*(S.lights?1.6:1));
  if(S.lights){g.save();g.globalCompositeOperation='lighter';rect(g,0,0,w,h,'rgba(120,100,140,.12)');g.restore();}
  // ドアの隙間
  if(st>=2||bl){const dx=w*.83,dy=h*.1,dw=w*.15,dh=h*.5,gap=dw*(bl?.32:.12+.04*Math.sin(t*.3));rect(g,dx,dy,gap,dh,'#010103');
    if(bl&&E.bleed!=='hidden'){g.save();g.globalAlpha=.5+.3*Math.sin(t*2);g.fillStyle='#fff';g.beginPath();g.arc(dx+gap*.6,dy+dh*.32,1.6,0,TAU);g.arc(dx+gap*.6+5,dy+dh*.32,1.6,0,TAU);g.fill();g.restore();}}
  // 滲み出した話
  if(bl||st>=3){
    const b=E.bleed;
    if(b==='factory'){const a=t*2.6;g.save();g.globalCompositeOperation='lighter';g.translate(w*.9,h*.06);g.rotate(a);g.fillStyle=LG(g,0,0,w*1.1,0,[[0,'rgba(255,40,40,.4)'],[1,'rgba(255,40,40,0)']]);g.beginPath();g.moveTo(0,0);g.lineTo(w*1.2,-w*.18);g.lineTo(w*1.2,w*.18);g.closePath();g.fill();g.restore();rect(g,w*.885,h*.045,w*.03,h*.03,'#ff3030');glow(g,w*.9,h*.06,w*.06,'255,50,50',.7);}
    else if(b==='elev'){g.save();g.font=`bold ${h*.06}px ${FM}`;g.textAlign='center';g.fillStyle='#ff2a3a';g.shadowColor='#ff0020';g.shadowBlur=14;rect(g,w*.86,h*.035,w*.1,h*.06,'#0a0204');g.fillStyle='#ff2a3a';g.fillText('6',w*.91,h*.085);g.restore();}
    else if(b==='nursery'){const bx=w*.84,by=h*.6;[[0,0],[w*.05,h*.005]].forEach(([ox,oy])=>{g.fillStyle='#d8b020';g.beginPath();g.moveTo(bx+ox,by+oy-h*.07);g.lineTo(bx+ox+w*.03,by+oy-h*.07);g.lineTo(bx+ox+w*.03,by+oy-h*.015);g.quadraticCurveTo(bx+ox+w*.055,by+oy-h*.012,bx+ox+w*.055,by+oy);g.lineTo(bx+ox,by+oy);g.closePath();g.fill();});glow(g,bx+w*.04,by-h*.03,w*.09,'230,190,40',.25);}
    else if(b==='konbini'){g.save();g.font=`${h*.032}px ${FM}`;g.fillStyle='rgba(220,255,220,.85)';g.fillText('CAM 05',w*.05,h*.09);g.fillText('03:33:'+String(((t*1)|0)%60).padStart(2,'0'),w*.05,h*.13);if(Math.sin(t*4)>0){g.fillStyle='#e83055';g.beginPath();g.arc(w*.3,h*.08,h*.008,0,TAU);g.fill();}g.restore();}
    else if(b==='hidden'){g.save();g.globalAlpha=.55+.2*Math.sin(t*.7);figure(g,'tall',w*.62,h*.95,h*.7,{c:'#000003'});g.restore();}
  }
}
SC.void={
  bake(g,w,h,R){roomBase(g,w,h,R,true);rect(g,0,0,w,h,'rgba(0,0,0,.72)');},
  draw(g,w,h,t,S,E){
    const mx=w*.27,my=h*.25,mw=w*.46,mh=h*.25;
    rect(g,mx,my,mw,mh,'rgba(30,30,60,.85)');
    g.font=`${h*.04}px ${FM}`;g.fillStyle=Math.sin(t*3)>0?'#e83055':'#7a1828';g.fillText('● LIVE  1',mx+mw*.3,my+mh*.45);
    g.font=`${h*.022}px ${FM}`;g.fillStyle='rgba(200,200,255,.5)';g.fillText('00:'+String(30+((t/60)|0)).padStart(2,'0')+':'+String((t|0)%60).padStart(2,'0'),mx+mw*.36,my+mh*.65);
    glow(g,w*.5,h*.4,w*.5,'60,70,160',.25);
    g.save();g.fillStyle='#030207';g.beginPath();g.ellipse(w*.5,h*.6,w*.13,h*.05,0,0,TAU);g.fill();rect(g,w*.36,h*.6,w*.28,h*.4,'#030207');g.restore();
    glassRain(g,w*.04,h*.07,w*.36,h*.34,t,9,.12);
  }
};
SC.h_screen={
  bake(g,w,h,R){
    rect(g,0,0,w,h,'#05040a');
    const bx=w*.03,by=h*.05,bw=w*.94,bh=h*.62;
    rect(g,bx,by,bw,bh,'#0c0a12');rect(g,bx+8,by+8,bw-16,bh-16,'#0e1428');
    rect(g,bx+8,by+8,bw-16,16,'#1d2240');
    g.fillStyle='#e83055';g.beginPath();g.arc(bx+18,by+16,3,0,TAU);g.fill();g.fillStyle='#e8b830';g.beginPath();g.arc(bx+28,by+16,3,0,TAU);g.fill();
    g.font=`${11}px ${FM}`;g.fillStyle='#8a8fb8';g.fillText('submission_030.txt',bx+40,by+20);
    rect(g,bx,by+bh,bw,h*.03,'#0a0810');
    rect(g,0,h*.72,w,h*.28,LG(g,0,h*.72,0,h,[[0,'#140f1c'],[1,'#07050c']]));texFill(g,TX.wood,.4,0,h*.72,w,h*.28);
  },
  draw(g,w,h,t,S,E){
    const bx=w*.03,by=h*.05,bw=w*.94,bh=h*.62,x0=bx+18,y0=by+36;
    const lines=['雨の多い街に、怪談を読む配信者がいます。','工場で働いて、子どもを育てて、','夜になると、マイクの前に座ります。','','部屋の窓は左側。','机の上には、冷めたマグカップ。','壁には、子どもの描いた絵が一枚。','','三十日目の夜。','配信者は、配信を切らずに眠りました。','そして――'];
    const fs=Math.max(10,Math.min(14,w*.032));g.font=`${fs}px ${FS}`;
    lines.forEach((l,i)=>{if(!l)return;let s=l;if(E.st>=2&&Math.random()<.04*E.st)s=s.replace(/./g,c=>Math.random()<.3?'■':c);g.fillStyle=E.st>=3&&i>=8?'rgba(255,120,140,.9)':'rgba(210,215,240,.82)';g.fillText(s,x0,y0+i*fs*1.55);});
    if(Math.sin(t*5)>0)rect(g,x0+fs*3.2,y0+10*fs*1.55-fs*.9,fs*.55,fs*1.1,'#deccf8');
    glow(g,w*.5,h*.36,w*.7,'70,90,190',.2);
    // 画面に映りこむ顔の影
    g.save();g.globalAlpha=.1+(E.st>=2?.12:0)+(E.lt>0?.2:0);figure(g,'seated',w*.52,h*.72,h*.5,{c:'#9aa8d8'});
    if(E.st>=3){figure(g,'tall',w*.74,h*.72,h*.62,{c:'#9aa8d8'});}g.restore();
    texFill(g,TX.scan,.3,bx+8,by+8,bw-16,bh-16);
  }
};
SC.h_dawn={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,0,h*.6,[[0,'#2a3460'],[.5,'#7a6a98'],[.85,'#e8a8a0'],[1,'#f4d0a0']]));
    skyline(g,0,h*.34,w,h*.26,R,.05,'#1a1630');
    rect(g,0,h*.6,w,h*.4,LG(g,0,h*.6,0,h,[[0,'#2a1e34'],[1,'#120c18']]));texFill(g,TX.wood,.4,0,h*.6,w,h*.4);
    rect(g,0,0,w*.06,h*.62,'#2a1844');rect(g,w*.94,0,w*.06,h*.62,'#2a1844');
    g.strokeStyle='#1c1530';g.lineWidth=8;g.strokeRect(w*.06,0,w*.88,h*.6);g.lineWidth=5;g.beginPath();g.moveTo(w*.5,0);g.lineTo(w*.5,h*.6);g.stroke();
    rect(g,w*.12,h*.55,w*.08,h*.06,'#3a2a3c');
  },
  draw(g,w,h,t){
    glow(g,w*.7,h*.5,w*.6,'255,210,160',.35+.05*Math.sin(t));
    g.fillStyle='rgba(20,16,30,.7)';for(let i=0;i<3;i++){const bx=(w*.2+i*w*.13+t*12*(1+i*.2))%(w*1.1),by=h*.18+i*h*.04+Math.sin(t*2+i)*3;g.beginPath();g.moveTo(bx-6,by);g.quadraticCurveTo(bx-3,by-3,bx,by);g.quadraticCurveTo(bx+3,by-3,bx+6,by);g.lineWidth=1.5;g.strokeStyle='rgba(20,16,30,.7)';g.stroke();}
    g.save();g.globalCompositeOperation='lighter';for(let i=0;i<5;i++){g.fillStyle=`rgba(255,220,180,${.04+.02*Math.sin(t+i)})`;poly(g,[[w*.7,h*.45],[w*(.1+i*.12),h],[w*(.16+i*.12),h]]);g.fill();}g.restore();
  }
};

// ── 第三工場 ──
SC.f_gate={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,0,h*.6,[[0,'#0d0a1e'],[1,'#1a1428']]));
    for(let i=0;i<7;i++){g.fillStyle=`rgba(60,50,90,${.08+R()*.08})`;g.beginPath();g.ellipse(R()*w,h*(.05+R()*.2),w*(.2+R()*.3),h*(.03+R()*.03),0,0,TAU);g.fill();}
    // 工場（ノコギリ屋根）
    const by=h*.26,bh=h*.24;rect(g,w*.05,by,w*.9,bh,'#07060e');
    g.fillStyle='#07060e';for(let i=0;i<6;i++){const x=w*.05+i*w*.15;poly(g,[[x,by],[x+w*.11,by-h*.05],[x+w*.15,by-h*.05],[x+w*.15,by]]);g.fill();g.fillStyle='rgba(120,130,180,.12)';poly(g,[[x+w*.11,by-h*.05],[x+w*.15,by-h*.05],[x+w*.15,by],[x+w*.11,by]]);g.fill();g.fillStyle='#07060e';}
    rect(g,w*.78,h*.04,w*.04,h*.22,'#06050c');rect(g,w*.775,h*.04,w*.05,h*.012,'#0c0a16');
    texFill(g,TX.conc,.6,w*.05,by,w*.9,bh);
    for(let i=0;i<9;i++){const x=w*.08+i*w*.095;rect(g,x,by+bh*.25,w*.06,bh*.22,R()<.15?'rgba(232,180,90,.35)':'#0b0a16');}
    rect(g,w*.42,by+bh*.55,w*.16,bh*.45,'#030208');
    // 地面
    rect(g,0,h*.5,w,h*.5,LG(g,0,h*.5,0,h,[[0,'#100d1a'],[1,'#07060c']]));texFill(g,TX.conc,.5,0,h*.5,w,h*.5);
    for(let i=0;i<5;i++){g.fillStyle='rgba(120,110,170,.07)';g.beginPath();g.ellipse(R()*w,h*(.56+R()*.3),w*(.08+R()*.12),h*.012,0,0,TAU);g.fill();}
    // 門と看板
    rect(g,w*.08,h*.36,w*.025,h*.26,'#120f1c');rect(g,w*.895,h*.36,w*.025,h*.26,'#120f1c');
    rect(g,w*.16,h*.4,w*.14,h*.045,'#1c1a24');g.font=`bold ${h*.024}px ${FS}`;g.fillStyle='#8c8496';g.textAlign='center';g.fillText('第三工場',w*.23,h*.432);g.textAlign='left';
    rect(g,w*.32,h*.405,w*.12,h*.032,'#3a1218');g.font=`${h*.016}px ${FD}`;g.fillStyle='#d88';g.fillText('解体予定',w*.335,h*.428);
    // フェンス
    g.strokeStyle='rgba(90,90,120,.35)';g.lineWidth=1;const fy=h*.44,fh=h*.2;
    for(let x=-fh;x<w+fh;x+=12){g.beginPath();g.moveTo(x,fy);g.lineTo(x+fh*.6,fy+fh);g.moveTo(x+fh*.6,fy);g.lineTo(x,fy+fh);g.stroke();}
    rect(g,0,fy-3,w,3,'#1e1a2a');rect(g,0,fy+fh,w,3,'#1e1a2a');
    // 街灯
    rect(g,w*.68,h*.2,w*.012,h*.46,'#0c0a14');rect(g,w*.62,h*.2,w*.07,h*.01,'#0c0a14');
  },
  draw(g,w,h,t,S,E){
    if(Math.sin(t*2)>.2)glow(g,w*.8,h*.045,w*.05,'255,50,50',.9);
    const lx=w*.625,ly=h*.215,fl=Math.sin(t*29)>.95?.4:1;
    g.save();g.globalCompositeOperation='lighter';g.fillStyle=LG(g,0,ly,0,h*.66,[[0,`rgba(255,170,80,${.3*fl})`],[1,'rgba(255,170,80,0)']]);poly(g,[[lx-4,ly],[lx+4,ly],[lx+w*.14,h*.66],[lx-w*.14,h*.66]]);g.fill();g.restore();
    glow(g,lx,ly+3,w*.08,'255,190,110',.8*fl);
    g.save();poly(g,[[lx-4,ly],[lx+4,ly],[lx+w*.14,h*.66],[lx-w*.14,h*.66]]);g.clip();g.strokeStyle='rgba(255,210,150,.45)';g.beginPath();for(let i=0;i<40;i++){const x=lx-w*.14+((i*53.3)%(w*.28)),y=ly+((i*37+t*420)%(h*.45));g.moveTo(x,y);g.lineTo(x-2,y+9);}g.stroke();g.restore();
    glow(g,lx,h*.68,w*.1,'255,170,80',.18*fl);
    if(E.lt>0){g.save();g.globalCompositeOperation='lighter';rect(g,0,0,w,h*.3,`rgba(160,170,255,${E.lt*.35})`);g.restore();}
  }
};
function corridor(w,h){const vx=w*.5,vy=h*.36,bw=w*.3,bh=h*.22;return {vx,vy,bw,bh,x0:vx-bw/2,x1:vx+bw/2,y0:vy-bh/2,y1:vy+bh/2};}
SC.f_corr={
  bake(g,w,h,R){
    const C=corridor(w,h),{x0,x1,y0,y1}=C,H=h*.72;
    rect(g,0,0,w,h,'#06050c');
    poly(g,[[0,0],[w,0],[x1,y0],[x0,y0]]);g.fillStyle=LG(g,0,0,0,y0,[[0,'#0a0916'],[1,'#13102a']]);g.fill();
    poly(g,[[0,H],[w,H],[x1,y1],[x0,y1]]);g.fillStyle=LG(g,0,y1,0,H,[[0,'#16131f'],[1,'#0b0a12']]);g.fill();rect(g,0,H,w,h-H,'#0b0a12');
    texPoly(g,TX.conc,.6,[[0,H],[w,H],[x1,y1],[x0,y1]]);rect(g,0,H,w,h-H,'#0b0a12');texFill(g,TX.conc,.6,0,H,w,h-H);
    poly(g,[[0,0],[x0,y0],[x0,y1],[0,H]]);g.fillStyle=LG(g,0,0,x0,0,[[0,'#0c0b18'],[1,'#171430']]);g.fill();texPoly(g,TX.conc,.55,[[0,0],[x0,y0],[x0,y1],[0,H]]);
    poly(g,[[w,0],[x1,y0],[x1,y1],[w,H]]);g.fillStyle=LG(g,w,0,x1,0,[[0,'#0c0b18'],[1,'#171430']]);g.fill();texPoly(g,TX.conc,.55,[[w,0],[x1,y0],[x1,y1],[w,H]]);
    rect(g,x0,y0,x1-x0,y1-y0,'#100d1e');texFill(g,TX.conc,.5,x0,y0,x1-x0,y1-y0);
    // 床の目地
    g.strokeStyle='rgba(138,82,212,.07)';g.lineWidth=1;
    for(let i=-8;i<=8;i++){g.beginPath();g.moveTo(w/2+i*w*.16,H);g.lineTo(C.vx+i*(x1-x0)/16,y1);g.stroke();}
    for(let k=1;k<9;k++){const f=Math.pow(k/9,1.8),yy=lerp(y1,H,f);g.beginPath();g.moveTo(lerp(x0,0,f),yy);g.lineTo(lerp(x1,w,f),yy);g.stroke();}
    rect(g,x0,y1-2,x1-x0,2,'rgba(232,184,48,.25)');
    // 配管
    const pipe=(side,fy,th,col)=>{const ox=side<0?0:w,ix=side<0?x0:x1;const oy=fy*H,iy=lerp(y0,y1,fy);
      g.fillStyle=col;poly(g,[[ox,oy-th],[ix,iy-th*.22],[ix,iy+th*.22],[ox,oy+th]]);g.fill();
      g.fillStyle='rgba(200,190,255,.08)';poly(g,[[ox,oy-th],[ix,iy-th*.22],[ix,iy-th*.12],[ox,oy-th*.5]]);g.fill();
      for(let d=.3;d<6;d*=1.7){const u=1-1/(1+d),fx=lerp(ox,ix,u),fyy=lerp(oy,iy,u),ft=lerp(th,th*.22,u)*1.35;rect(g,fx-1.5,fyy-ft,3,ft*2,'rgba(0,0,0,.55)');}};
    pipe(-1,.18,9,'#1d1a2e');pipe(-1,.27,6,'#24182a');pipe(1,.15,11,'#1a1c2c');pipe(1,.32,5,'#2a2030');pipe(-1,.62,4,'#1a1626');
    // 高窓
    [[.12,.24],[.4,.5],[.62,.7]].forEach(([u0,u1])=>{const p=(u,fy)=>[lerp(0,x0,u),lerp(fy*H,lerp(y0,y1,fy),u)];poly(g,[p(u0,.04),p(u1,.04),p(u1,.12),p(u0,.12)]);g.fillStyle='#0d1530';g.fill();});
    // 奥の扉
    const dw=(x1-x0)*.26,dh=(y1-y0)*.66,dx=C.vx-dw/2,dy=y1-dh;rect(g,dx-2,dy-2,dw+4,dh+2,'#1c1828');rect(g,dx,dy,dw,dh,'#221d30');texFill(g,TX.conc,.4,dx,dy,dw,dh);
    rect(g,dx+dw*.78,dy+dh*.5,2,4,'#6a6080');
    // 警告灯の台
    rect(g,x1-12,y0+5,8,5,'#2a1a1a');
    // 点検表示板
    rect(g,x0+(x1-x0)*.06,y0+(y1-y0)*.22,(x1-x0)*.22,(y1-y0)*.18,'#1a2a1e');g.font=`${Math.max(7,(y1-y0)*.07)}px ${FD}`;g.fillStyle='#6a9a78';g.fillText('No.12',x0+(x1-x0)*.08,y0+(y1-y0)*.34);
  },
  draw(g,w,h,t,S,E){
    const C=corridor(w,h),{x0,x1,y0,y1}=C,H=h*.72;
    // 高窓に雷
    if(E.lt>0){g.save();g.globalCompositeOperation='lighter';[[.12,.24],[.4,.5],[.62,.7]].forEach(([u0,u1])=>{const p=(u,fy)=>[lerp(0,x0,u),lerp(fy*H,lerp(y0,y1,fy),u)];poly(g,[p(u0,.04),p(u1,.04),p(u1,.12),p(u0,.12)]);g.fillStyle=`rgba(170,180,255,${E.lt*.8})`;g.fill();});rect(g,0,0,w,h,`rgba(120,130,220,${E.lt*.15})`);g.restore();}
    // 蛍光灯
    [.08,.35,.6,.8].forEach((u,i)=>{const cy=lerp(0,y0,u)+4,hw=lerp(w*.16,(x1-x0)*.14,u);const on=i===1?(Math.sin(t*13)>.2||Math.sin(t*2.3)>.6?1:.08):(S.dark?0:1);
      rect(g,C.vx-hw,cy,hw*2,lerp(5,2,u),on>.5?'#d8e0ff':'#2a2840');if(on>.5)glow(g,C.vx,cy+20*(1-u),hw*2.4,'190,200,255',.18*on);});
    // 床の反射
    g.save();g.globalCompositeOperation='lighter';g.fillStyle=LG(g,0,y1,0,H,[[0,'rgba(180,190,255,.0)'],[1,'rgba(180,190,255,.08)']]);poly(g,[[C.vx-6,y1],[C.vx+6,y1],[C.vx+w*.08,H],[C.vx-w*.08,H]]);g.fill();g.restore();
    // 扉
    const dw=(x1-x0)*.26,dh=(y1-y0)*.66,dx=C.vx-dw/2,dy=y1-dh;
    if(S.door){rect(g,dx,dy,dw*.35,dh,'#010103');}
    if(S.sign){const sx=dx-dw*.2,sy=dy-dh*.36,sw=dw*1.4,sh=dh*.26;rect(g,sx,sy,sw,sh,S.sign>1?'#3a0a12':'#10161a');g.strokeStyle=S.sign>1?'#e83055':'#6a8a90';g.strokeRect(sx,sy,sw,sh);g.font=`bold ${sh*.62}px ${FM}`;g.textAlign='center';g.fillStyle=S.sign>1?'#ff6680':'#bfe';g.fillText('No.13',sx+sw/2,sy+sh*.75);g.textAlign='left';glow(g,sx+sw/2,sy+sh/2,sw,S.sign>1?'232,48,85':'120,220,200',.15+.05*Math.sin(t*3));}
    // 回転灯
    const a=t*2.4,lx=x1-8,ly=y0+4;
    g.save();g.globalCompositeOperation='lighter';g.translate(lx,ly);g.rotate(a);g.fillStyle=LG(g,0,0,w*.9,0,[[0,'rgba(255,40,50,.35)'],[1,'rgba(255,40,50,0)']]);g.beginPath();g.moveTo(0,0);g.lineTo(w,-w*.14);g.lineTo(w,w*.14);g.closePath();g.fill();g.restore();
    glow(g,lx,ly,14,'255,60,60',.9);
    // 霧
    fogBand(g,w,h,t,y1-10,H*.25,'90,80,140',.12);
  }
};
SC.f_stair={
  bake(g,w,h,R){
    rect(g,0,0,w,h,'#030207');
    const vx=w*.5,vy=h*.3,n=13,top=h*.66;
    // 左右の壁（コンクリート）
    poly(g,[[0,0],[w*.3,0],[vx-w*.09,vy],[vx-w*.09,vy+h*.04],[0,top+h*.1]]);g.fillStyle=LG(g,0,0,vx,0,[[0,'#1a1830'],[1,'#07060e']]);g.fill();texPoly(g,TX.conc,.8,[[0,0],[w*.3,0],[vx-w*.09,vy],[vx-w*.09,vy+h*.04],[0,top+h*.1]]);
    poly(g,[[w,0],[w*.7,0],[vx+w*.09,vy],[vx+w*.09,vy+h*.04],[w,top+h*.1]]);g.fillStyle=LG(g,w,0,vx,0,[[0,'#1a1830'],[1,'#07060e']]);g.fill();texPoly(g,TX.conc,.8,[[w,0],[w*.7,0],[vx+w*.09,vy],[vx+w*.09,vy+h*.04],[w,top+h*.1]]);
    poly(g,[[w*.3,0],[w*.7,0],[vx+w*.09,vy],[vx-w*.09,vy]]);g.fillStyle='#08070f';g.fill();texPoly(g,TX.conc,.6,[[w*.3,0],[w*.7,0],[vx+w*.09,vy],[vx-w*.09,vy]]);
    // 段
    const e=f=>1-Math.pow(1-f,1.8);
    for(let i=0;i<n;i++){const f0=i/n,f1=(i+1)/n;
      const ya=lerp(top,vy+h*.04,e(f0)),yb=lerp(top,vy+h*.04,e(f1)),xa=lerp(w*.1,vx-w*.09,e(f0)),xb=lerp(w*.1,vx-w*.09,e(f1));
      const tread=(ya-yb)*.45,dk=Math.pow(1-i/n,1.3);
      rect(g,xa,yb+tread,w-xa*2,ya-yb-tread,`rgb(${10*dk+3|0},${9*dk+3|0},${18*dk+5|0})`);
      rect(g,xb,yb,w-xb*2,tread,`rgb(${40*dk+6|0},${36*dk+5|0},${58*dk+9|0})`);
      texFill(g,TX.conc,.5*dk,xb,yb,w-xb*2,ya-yb);
      rect(g,xb,yb,w-xb*2,1.5,`rgba(232,184,48,${.35*dk})`);}
    // 扉枠（手前）
    rect(g,0,0,w*.07,h,'#0f0c18');rect(g,w*.93,0,w*.07,h,'#0f0c18');rect(g,0,0,w,h*.035,'#0f0c18');texFill(g,TX.conc,.6,0,0,w*.07,h);texFill(g,TX.conc,.6,w*.93,0,w*.07,h);
    rect(g,w*.07,h*.035,2,h,'#2a2238');rect(g,w*.93-2,h*.035,2,h,'#2a2238');
    // 手すり
    g.strokeStyle='#3a3448';g.lineWidth=3;g.beginPath();g.moveTo(w*.08,h*.5);g.lineTo(vx-w*.1,vy-h*.03);g.stroke();g.beginPath();g.moveTo(w*.92,h*.5);g.lineTo(vx+w*.1,vy-h*.03);g.stroke();
    // 床（手前の踊り場）
    rect(g,w*.07,top,w*.86,h-top,'#100d1a');texFill(g,TX.conc,.6,w*.07,top,w*.86,h-top);rect(g,w*.07,top,w*.86,2,'rgba(232,184,48,.4)');
    // 立入禁止の札
    g.save();g.translate(w*.76,h*.12);g.rotate(.05);rect(g,-w*.1,-h*.025,w*.2,h*.05,'#c8a020');rect(g,-w*.095,-h*.021,w*.19,h*.042,'#1a1408');g.font=`bold ${h*.022}px ${FD}`;g.textAlign='center';g.fillStyle='#e8c030';g.fillText('立入禁止',0,h*.009);g.restore();
    g.strokeStyle='rgba(200,180,80,.35)';g.lineWidth=1;g.beginPath();g.moveTo(w*.66,h*.1);g.lineTo(w*.7,h*.035);g.moveTo(w*.86,h*.1);g.lineTo(w*.83,h*.035);g.stroke();
  },
  draw(g,w,h,t,S,E){
    const vx=w*.5,vy=h*.3;
    if(S.light){const sw=Math.sin(t*1.3),ix=vx+sw*w*.02,a=.35+(S.fig?.25:0);
      glow(g,ix,vy+h*.03,w*.22,'225,232,255',a);
      g.save();g.globalCompositeOperation='lighter';g.fillStyle=LG(g,0,vy,0,h*.62,[[0,`rgba(225,232,255,${S.fig?.22:.1})`],[1,'rgba(225,232,255,0)']]);
      if(S.fig)poly(g,[[ix-4,vy+h*.01],[ix+4,vy+h*.01],[vx+w*.32,h*.64],[vx-w*.32,h*.64]]);else poly(g,[[ix-3,vy+h*.03],[ix+3,vy+h*.03],[ix+w*.18+sw*w*.3,0],[ix-w*.02+sw*w*.3,0]]);
      g.fill();g.restore();}
    if(S.fig){g.save();g.globalAlpha=Math.min(1,(S._figT||0));figure(g,'worker',vx,vy+h*.045,h*.13,{c:'#010003',rim:'rgba(200,210,255,.3)'});g.restore();glow(g,vx+h*.035,vy-h*.03,h*.05,'255,255,255',.9*Math.min(1,S._figT||0));}
    fogBand(g,w,h,t,vy+h*.02,h*.08,'60,60,110',.18);
    const fl=Math.sin(t*7)>.95?.2:1;glow(g,w*.5,h*.02,w*.3,'200,200,255',.08*fl);
  }
};
SC.f_office={
  bake(g,w,h,R){
    // 朝の詰所の机。点検表を真上から
    rect(g,0,0,w,h,LG(g,0,0,0,h,[[0,'#3a3040'],[1,'#141018']]));texFill(g,TX.wood,.7,0,0,w,h);texFill(g,TX.wood,.4,0,0,w,h);
    // 窓の光の帯
    g.save();g.globalCompositeOperation='lighter';g.fillStyle='rgba(150,170,220,.07)';poly(g,[[0,0],[w*.5,0],[w*.15,h*.7],[0,h*.55]]);g.fill();g.restore();
    // バインダー
    const bx=w*.08,by=h*.05,bw=w*.84,bh=h*.5;
    rect(g,bx-6,by-6,bw+12,bh+12,'#1e2230');texFill(g,TX.conc,.4,bx-6,by-6,bw+12,bh+12);
    rect(g,bx+bw*.33,by-12,bw*.34,20,'#8a90a0');rect(g,bx+bw*.36,by-8,bw*.28,8,'#5a6070');
    rect(g,bx,by,bw,bh,'#dcd6c4');texFill(g,TX.conc,.22,bx,by,bw,bh);
    g.fillStyle='#2a2a30';g.font=`bold ${bh*.055}px ${FS}`;g.fillText('巡回点検表　第三工場',bx+bw*.05,by+bh*.1);
    g.font=`${bh*.032}px ${FS}`;g.fillStyle='#555';g.fillText('※記入は鉛筆で行うこと（消して直せるように）',bx+bw*.05,by+bh*.145);
    const rows=['ボイラー室','コンプレッサー','冷却塔','排水ポンプ','受変電設備','配電盤','空調機','消火ポンプ','排気ファン','冷凍機','給水ポンプ','屋上受水槽'];
    const rh=bh*.062;g.font=`${rh*.62}px ${FS}`;
    for(let i=0;i<12;i++){const yy=by+bh*.2+i*rh;g.strokeStyle='rgba(60,60,80,.35)';g.lineWidth=1;g.beginPath();g.moveTo(bx+bw*.04,yy+rh*.25);g.lineTo(bx+bw*.96,yy+rh*.25);g.stroke();
      g.fillStyle='#4a4a52';g.fillText(`No.${i+1}　${rows[i]}`,bx+bw*.05,yy);g.fillStyle='rgba(80,80,90,.7)';g.fillText('異常なし',bx+bw*.66,yy);}
    g.strokeStyle='rgba(60,60,80,.35)';g.beginPath();g.moveTo(bx+bw*.6,by+bh*.13);g.lineTo(bx+bw*.6,by+bh*.96);g.stroke();
    // 鉛筆とボールペン
    g.save();g.translate(w*.2,h*.62);g.rotate(-.25);rect(g,0,0,w*.32,h*.014,'#d8a830');rect(g,w*.32,0,w*.03,h*.014,'#e8c8a0');rect(g,-w*.03,0,w*.03,h*.014,'#c88');g.restore();
    g.save();g.translate(w*.55,h*.66);g.rotate(.18);rect(g,0,0,w*.3,h*.012,'#1a2a6a');rect(g,w*.3,h*.002,w*.025,h*.008,'#888');g.restore();
    rect(g,w*.72,h*.58,w*.16,h*.08,'#2a1e18');g.fillStyle='#3a2a20';g.beginPath();g.ellipse(w*.8,h*.58,w*.08,h*.012,0,0,TAU);g.fill();
  },
  draw(g,w,h,t,S,E){
    const bx=w*.08,by=h*.05,bw=w*.84,bh=h*.5,rh=bh*.062;
    const fl=Math.sin(t*19)>.97?.5:1;glow(g,w*.5,0,w*.7,'210,220,255',.12*fl);
    if(S.paper){const yy=by+bh*.2+12*rh;
      g.save();g.globalCompositeOperation='multiply';g.fillStyle=`rgba(255,220,120,${.5+.12*Math.sin(t*3)})`;g.fillRect(bx+bw*.03,yy-rh*.8,bw*.94,rh*1.1);g.restore();
      g.font=`${rh*.66}px ${FS}`;g.fillStyle='#16248a';g.fillText('No.13　地下ピット',bx+bw*.05,yy);
      g.font=`bold ${rh*.7}px ${FS}`;g.fillStyle=S.paper>1?'#b8102a':'#16248a';g.fillText(S.paper>1?'三十日目':'異常なし',bx+bw*.66,yy);
      g.strokeStyle='rgba(22,36,138,.8)';g.lineWidth=1.2;g.beginPath();g.moveTo(bx+bw*.04,yy+rh*.25);g.lineTo(bx+bw*.96,yy+rh*.25);g.stroke();}
  }
};
function fogBand(g,w,h,t,y,hh,rgb,a){
  g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<4;i++){const x=((t*(8+i*5)+i*w*.37)%(w*1.6))-w*.3,yy=y+Math.sin(t*.3+i)*hh*.2+i*hh*.15;g.fillStyle=RG(g,x,yy,0,w*.45,[[0,`rgba(${rgb},${a})`],[1,`rgba(${rgb},0)`]]);g.fillRect(x-w*.45,yy-hh,w*.9,hh*2);}
  g.restore();
}

// ── 団地のエレベーター ──
SC.e_danchi={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,0,h*.6,[[0,'#0a0918'],[1,'#191630']]));
    const bx=w*.05,by=h*.2,bw=w*.58,bh=h*.4;
    rect(g,bx,by,bw,bh,'#141220');texFill(g,TX.conc,.75,bx,by,bw,bh);
    rect(g,bx-4,by-6,bw+8,8,'#0e0c16');
    for(let f=0;f<5;f++){const fy=by+bh*(.06+f*.19);rect(g,bx,fy+bh*.12,bw,3,'#1e1b2c');
      for(let i=0;i<5;i++){const fx=bx+bw*(.05+i*.19);const lit=R();rect(g,fx,fy,bw*.12,bh*.1,lit<.25?'rgba(232,184,110,.55)':lit<.32?'rgba(140,200,220,.4)':'#08070e');
        if(lit<.25)rect(g,fx+bw*.03,fy,bw*.025,bh*.1,'rgba(60,30,40,.4)');
        rect(g,fx-1,fy+bh*.1,bw*.12+2,2,'#24202f');}}
    g.font=`bold ${h*.03}px ${FS}`;g.fillStyle='#5a5670';g.fillText('3号棟',bx+bw*.04,by+bh*.04+h*.015);
    // 外付けエレベーター塔
    const ex=bx+bw+2,ew=w*.1;rect(g,ex,by-h*.04,ew,bh+h*.04,'#100e1a');texFill(g,TX.conc,.7,ex,by-h*.04,ew,bh+h*.04);
    for(let f=0;f<5;f++)rect(g,ex+ew*.3,by+bh*(.08+f*.19),ew*.4,bh*.07,'#08070e');
    rect(g,ex,by-h*.06,ew,h*.025,'#0c0a14');
    // 地面と自転車
    rect(g,0,h*.6,w,h*.4,LG(g,0,h*.6,0,h,[[0,'#121020'],[1,'#07060c']]));texFill(g,TX.conc,.5,0,h*.6,w,h*.4);
    g.strokeStyle='#08070e';g.lineWidth=2;for(let i=0;i<3;i++){const cx=w*(.12+i*.14),cy=h*.62;g.beginPath();g.arc(cx,cy,h*.018,0,TAU);g.arc(cx+w*.05,cy,h*.018,0,TAU);g.moveTo(cx,cy);g.lineTo(cx+w*.025,cy-h*.025);g.lineTo(cx+w*.05,cy);g.stroke();}
    rect(g,w*.86,h*.36,w*.012,h*.25,'#0c0a14');
    for(let i=0;i<4;i++){g.fillStyle='rgba(120,110,180,.08)';g.beginPath();g.ellipse(R()*w,h*(.66+R()*.25),w*(.1+R()*.1),h*.01,0,0,TAU);g.fill();}
  },
  draw(g,w,h,t,S,E){
    const bx=w*.05,by=h*.2,bw=w*.58,bh=h*.4,ex=bx+bw+2,ew=w*.1;
    const cab=(Math.sin(t*.35)*.5+.5)*4;const cy=by+bh*(.08+(4-cab)*.19);
    rect(g,ex+ew*.3,cy,ew*.4,bh*.07,'rgba(200,220,255,.75)');glow(g,ex+ew*.5,cy+bh*.035,ew*1.2,'190,210,255',.22);
    glow(g,w*.865,h*.36,w*.12,'200,230,255',.35);
    g.save();g.globalCompositeOperation='lighter';g.fillStyle=LG(g,0,h*.3,0,h*.62,[[0,'rgba(200,230,255,.16)'],[1,'rgba(200,230,255,0)']]);poly(g,[[w*.86,h*.36],[w*.872,h*.36],[w*.98,h*.62],[w*.74,h*.62]]);g.fill();g.restore();
    if(E.lt>0){g.save();g.globalCompositeOperation='lighter';rect(g,0,0,w,h,`rgba(150,160,255,${E.lt*.22})`);g.restore();}
    // 屋上に6階の明かり（霊障）
    if(E.st>=2){g.globalAlpha=.4+.3*Math.sin(t*1.7);rect(g,bx+bw*.43,by-h*.05,bw*.12,h*.035,'rgba(232,48,85,.6)');g.globalAlpha=1;}
  }
};
function elevBox(w,h){return {rx0:w*.17,ry0:h*.08,rx1:w*.83,ry1:h*.66};}
SC.e_inside={
  bake(g,w,h,R){
    const {rx0,ry0,rx1,ry1}=elevBox(w,h);
    rect(g,0,0,w,h,'#0a0a10');
    poly(g,[[0,0],[w,0],[rx1,ry0],[rx0,ry0]]);g.fillStyle='#16161e';g.fill();
    poly(g,[[0,0],[rx0,ry0],[rx0,ry1],[0,h*.82]]);g.fillStyle=LG(g,0,0,rx0,0,[[0,'#24242e'],[1,'#3a3a46']]);g.fill();texPoly(g,TX.brush,.8,[[0,0],[rx0,ry0],[rx0,ry1],[0,h*.82]]);
    poly(g,[[w,0],[rx1,ry0],[rx1,ry1],[w,h*.82]]);g.fillStyle=LG(g,w,0,rx1,0,[[0,'#24242e'],[1,'#3a3a46']]);g.fill();texPoly(g,TX.brush,.8,[[w,0],[rx1,ry0],[rx1,ry1],[w,h*.82]]);
    poly(g,[[0,h*.82],[w,h*.82],[rx1,ry1],[rx0,ry1]]);g.fillStyle='#17161c';g.fill();texPoly(g,TX.conc,.8,[[0,h*.82],[w,h*.82],[rx1,ry1],[rx0,ry1]]);rect(g,0,h*.82,w,h*.18,'#121117');texFill(g,TX.conc,.7,0,h*.82,w,h*.18);
    rect(g,rx0,ry0,rx1-rx0,ry1-ry0,LG(g,rx0,0,rx1,0,[[0,'#3a3a48'],[.5,'#4a4a58'],[1,'#33333f']]));texFill(g,TX.brush,.9,rx0,ry0,rx1-rx0,ry1-ry0);
    // 手すり
    g.strokeStyle='#5a5a68';g.lineWidth=4;g.beginPath();g.moveTo(0,h*.5);g.lineTo(rx0,ry0+(ry1-ry0)*.62);g.stroke();g.beginPath();g.moveTo(w,h*.5);g.lineTo(rx1,ry0+(ry1-ry0)*.62);g.stroke();
    // 階数表示枠
    const iw=(rx1-rx0)*.22,ix=(rx0+rx1)/2-iw/2,iy=ry0+(ry1-ry0)*.04;rect(g,ix,iy,iw,(ry1-ry0)*.1,'#08080c');
    // 操作盤
    const px=rx1-(rx1-rx0)*.12,py=ry0+(ry1-ry0)*.3;rect(g,px,py,(rx1-rx0)*.09,(ry1-ry0)*.42,'#24242e');
    // 注意書き
    rect(g,rx0+(rx1-rx0)*.03,ry0+(ry1-ry0)*.3,(rx1-rx0)*.08,(ry1-ry0)*.12,'#c8c4b0');g.font=`${Math.max(6,h*.012)}px ${FD}`;g.fillStyle='#333';g.fillText('定員',rx0+(rx1-rx0)*.04,ry0+(ry1-ry0)*.36);g.fillText('4名',rx0+(rx1-rx0)*.04,ry0+(ry1-ry0)*.4);
  },
  draw(g,w,h,t,S,E){
    const {rx0,ry0,rx1,ry1}=elevBox(w,h),RW=rx1-rx0,RH=ry1-ry0;
    const dx0=rx0+RW*.16,dx1=rx1-RW*.16,dy0=ry0+RH*.17,dy1=ry1,dw=(dx1-dx0)/2;
    S._open=lerp(S._open||0,S.open?1:0,.04);const op=S._open;
    if(op>.01){rect(g,dx0,dy0,dx1-dx0,dy1-dy0,'#020205');glassRain(g,dx0+dw*.6,dy0,dw*.8,dy1-dy0,t,2,.1);fogBand(g,w,h,t,dy1-RH*.15,RH*.2,'60,70,120',.12);
      g.fillStyle='rgba(120,130,200,.12)';g.fillRect(dx0,dy1-RH*.06,dx1-dx0,RH*.06);}
    const pan=(x,ww)=>{rect(g,x,dy0,ww,dy1-dy0,LG(g,x,0,x+ww,0,[[0,'#56566a'],[.5,'#6a6a7c'],[1,'#4a4a5a']]));texFill(g,TX.brush,1,x,dy0,ww,dy1-dy0);rect(g,x,dy0,ww,2,'rgba(255,255,255,.12)');};
    pan(dx0-dw*op,dw);pan(dx0+dw+dw*op,dw);
    rect(g,dx0+dw-1+0,dy0,2,dy1-dy0,'rgba(0,0,0,.5)');
    // 映りこみ（女）
    if(S.woman){g.save();g.beginPath();g.rect(dx0-dw*op,dy0,dw,dy1-dy0);g.clip();g.globalAlpha=.35+(E.st>=2?.2:0);figure(g,'woman',dx0+dw*.45-dw*op,dy1-2,(dy1-dy0)*.86,{c:'#0c0c16',umbrella:true});g.restore();}
    // 階数表示
    const iw=RW*.22,ix=(rx0+rx1)/2-iw/2,iy=ry0+RH*.04,ih=RH*.1;
    const fl=String(S.floor||1);const red=fl==='6';
    g.font=`bold ${ih*.8}px ${FM}`;g.textAlign='center';g.fillStyle=red?'#ff2a3a':'#ff8a3a';g.shadowColor=red?'#ff0020':'#ff6000';g.shadowBlur=red?16:8;
    if(!(red&&Math.sin(t*9)>.7))g.fillText(fl,ix+iw/2,iy+ih*.82);g.shadowBlur=0;g.textAlign='left';
    g.fillStyle=red?'#ff2a3a':'#ff8a3a';if(S.floor&&S.floor<6){poly(g,[[ix+iw*.12,iy+ih*.7],[ix+iw*.22,iy+ih*.25],[ix+iw*.32,iy+ih*.7]]);g.fill();}
    glow(g,ix+iw/2,iy+ih/2,iw*1.4,red?'255,30,50':'255,120,60',red?.4:.18);
    // ボタン
    const px=rx1-RW*.12,py=ry0+RH*.3,pw=RW*.09,ph=RH*.42;
    for(let i=0;i<5;i++){const by=py+ph*(.88-i*.17),cx=px+pw/2,r=pw*.28;const lit=(i===2&&S.floor<3)||(i===4&&S.woman&&S.floor<5);g.fillStyle=lit?'#ffcc88':'#8a8a98';g.beginPath();g.arc(cx,by,r,0,TAU);g.fill();if(lit)glow(g,cx,by,r*3,'255,190,110',.4);}
    // 天井灯
    const on=S.open?(Math.sin(t*11)>-.2?1:.2):(Math.sin(t*7.3)>.96?.3:1);
    rect(g,w*.3,h*.015,w*.4,h*.02,on>.5?'#e8ecff':'#3a3a48');glow(g,w*.5,h*.03,w*.6,'220,225,255',.22*on);
    if(on<.5){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,w,h);}
    // しずく・水たまり
    if(S.drip){const px2=dx0+dw*.35,py2=h*.8;g.fillStyle='rgba(120,140,200,.18)';g.beginPath();g.ellipse(px2,py2,w*.1,h*.016,0,0,TAU);g.fill();
      for(let i=0;i<3;i++){const ph2=((t*.8+i/3)%1);g.strokeStyle=`rgba(180,200,255,${.4*(1-ph2)})`;g.lineWidth=1;g.beginPath();g.ellipse(px2,py2,w*.1*ph2,h*.016*ph2,0,0,TAU);g.stroke();}
      const dy=(t*1.4%1);rect(g,px2-1,lerp(h*.55,py2,dy),2,5,'rgba(180,200,255,.6)');}
  }
};
SC.e_hall={
  bake(g,w,h,R){
    rect(g,0,0,w,h,'#030308');
    const vx=w*.46,vy=h*.36;
    poly(g,[[0,0],[vx-w*.04,vy-h*.07],[vx-w*.04,vy+h*.05],[0,h*.7]]);g.fillStyle=LG(g,0,0,vx,0,[[0,'#12121c'],[1,'#07070c']]);g.fill();texPoly(g,TX.conc,.8,[[0,0],[vx-w*.04,vy-h*.07],[vx-w*.04,vy+h*.05],[0,h*.7]]);
    poly(g,[[0,0],[w,0],[vx+w*.04,vy-h*.07],[vx-w*.04,vy-h*.07]]);g.fillStyle='#0b0b14';g.fill();
    // 扉
    for(let d=0;d<5;d++){const u0=1-1/(1+d*.7+.2),u1=1-1/(1+d*.7+.55);const p=(u,f)=>[lerp(0,vx-w*.04,u),lerp(lerp(0,h*.7,f),lerp(vy-h*.07,vy+h*.05,f),u)];
      poly(g,[p(u0,.25),p(u1,.25),p(u1,1),p(u0,1)]);g.fillStyle='#1c1a2a';g.fill();
      const q=p((u0+u1)/2,.18);rect(g,q[0]-2,q[1]-2,6,4,'#3a3650');}
    // 右側の手すり（外は雨）
    poly(g,[[w,h*.08],[vx+w*.04,vy-h*.05],[vx+w*.04,vy+h*.05],[w,h*.7]]);g.fillStyle='#05060d';g.fill();
    for(let i=0;i<14;i++){const u=1-1/(1+i*.35);const x=lerp(w,vx+w*.04,u);g.fillStyle='#14121e';g.fillRect(x,lerp(h*.42,vy,u),Math.max(1,3*(1-u)),lerp(h*.28,h*.05,u));}
    g.strokeStyle='#1e1c2c';g.lineWidth=4;g.beginPath();g.moveTo(w,h*.42);g.lineTo(vx+w*.04,vy);g.stroke();
    // 水面
    poly(g,[[0,h*.7],[w,h*.7],[vx+w*.04,vy+h*.05],[vx-w*.04,vy+h*.05]]);g.fillStyle=LG(g,0,vy,0,h*.7,[[0,'#0a0c18'],[1,'#141a2c']]);g.fill();rect(g,0,h*.7,w,h*.3,'#141a2c');
  },
  draw(g,w,h,t,S,E){
    const vx=w*.46,vy=h*.36;
    glassRain(g,vx+w*.05,0,w*.5,h*.7,t,4,.16);
    if(E.lt>0){g.save();g.globalCompositeOperation='lighter';poly(g,[[w,h*.08],[vx+w*.04,vy-h*.05],[vx+w*.04,vy+h*.05],[w,h*.7]]);g.fillStyle=`rgba(160,170,255,${E.lt*.5})`;g.fill();g.restore();}
    // 水面の反射とさざ波
    g.save();g.globalCompositeOperation='lighter';for(let i=0;i<14;i++){const y=lerp(vy+h*.06,h,Math.pow(i/14,1.4)),ww=lerp(w*.05,w*.9,i/14);g.strokeStyle=`rgba(140,160,230,${.05+.04*Math.sin(t*2+i)})`;g.lineWidth=1;g.beginPath();g.moveTo(vx-ww/2+Math.sin(t+i)*6,y);g.lineTo(vx+ww/2+Math.sin(t*1.3+i)*6,y);g.stroke();}g.restore();
    // 奥の小さな明かり
    const fl=Math.sin(t*15)>.9?.3:1;glow(g,vx,vy-h*.06,w*.16,'200,210,255',.55*fl);rect(g,vx-4,vy-h*.066,8,3,'#dfe4ff');g.save();g.globalCompositeOperation='lighter';g.fillStyle=LG(g,0,vy,0,h*.9,[[0,`rgba(200,210,255,${.14*fl})`],[1,'rgba(200,210,255,0)']]);poly(g,[[vx-3,vy+h*.05],[vx+3,vy+h*.05],[vx+w*.06,h*.9],[vx-w*.06,h*.9]]);g.fill();g.restore();
    // 傘
    const n=S.fig?9:3;for(let i=0;i<n;i++){const u=.25+((i*.37)%1)*.65,x=lerp(i%2?w*.1:w*.7,vx,u),y=lerp(h*.9,vy+h*.05,u),hh=lerp(h*.2,h*.03,u);
      g.fillStyle='#040308';poly(g,[[x-hh*.06,y-hh],[x+hh*.06,y-hh],[x+hh*.02,y],[x-hh*.02,y]]);g.fill();rect(g,x-.5,y-hh*1.12,1.2,hh*.14,'#040308');
      g.fillStyle='rgba(140,160,230,.1)';g.beginPath();g.ellipse(x,y+2,hh*.12,hh*.02,0,0,TAU);g.fill();}
    if(S.fig){const a=.75+.25*Math.sin(t*.8);glow(g,vx,vy+h*.02,w*.22,'150,160,220',.18);g.save();g.globalAlpha=a;figure(g,'woman',vx+w*.02,vy+h*.12,h*.19,{c:'#010003',umbrella:'open',rim:'rgba(170,180,255,.25)'});g.restore();}
    fogBand(g,w,h,t,vy+h*.05,h*.08,'70,80,140',.16);
  }
};
SC.e_panel={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,w,0,[[0,'#30303c'],[.5,'#44444f'],[1,'#2a2a34']]));texFill(g,TX.brush,1,0,0,w,h);texFill(g,TX.brush,.6,0,0,w,h);
    const px=w*.28,py=h*.04,pw=w*.44,ph=h*.6;
    rect(g,px-4,py-4,pw+8,ph+8,'#1a1a22');rect(g,px,py,pw,ph,LG(g,px,0,px+pw,0,[[0,'#5a5a68'],[.5,'#767684'],[1,'#50505e']]));texFill(g,TX.brush,1,px,py,pw,ph);
    for(let i=0;i<4;i++){g.fillStyle='#22222a';g.beginPath();g.arc(px+(i%2?pw-8:8),py+(i<2?8:ph-8),3,0,TAU);g.fill();}
  },
  draw(g,w,h,t,S,E){
    const px=w*.28,py=h*.04,pw=w*.44,ph=h*.6,cx=px+pw/2,r=Math.min(pw*.16,ph*.06);
    g.font=`bold ${r*.95}px ${FM}`;g.textAlign='center';
    for(let i=0;i<5;i++){const by=py+ph*(.88-i*.135);
      g.fillStyle='#2a2a32';g.beginPath();g.arc(cx,by,r*1.15,0,TAU);g.fill();g.fillStyle=LG(g,0,by-r,0,by+r,[[0,'#b0b0bc'],[1,'#707080']]);g.beginPath();g.arc(cx,by,r,0,TAU);g.fill();
      g.fillStyle='#2a2a34';g.fillText(String(i+1),cx,by+r*.35);
      rect(g,cx+r*1.6,by-2,r*.5,4,'#3a3a44');}
    // テープで塞がれたボタン
    const by=py+ph*(.88-5*.135);
    g.fillStyle='#2a2a32';g.beginPath();g.arc(cx,by,r*1.15,0,TAU);g.fill();
    g.save();g.translate(cx,by);g.rotate(-.2);
    const peel=S.tape?1:0;
    g.fillStyle='#c8bc98';g.fillRect(-r*1.6,-r*.5,r*3.2,r*.55);g.rotate(.45);g.fillRect(-r*1.6,-r*.15,r*3.2-peel*r*1.2,r*.55);
    texFill(g,TX.conc,.4,-r*1.6,-r*.5,r*3.2,r*1.2);
    if(peel){g.fillStyle='#a89c7a';poly(g,[[r*.4,-r*.15],[r*1.6,-r*.15],[r*1.2,-r*.9]]);g.fill();
      g.rotate(-.25);g.font=`${r*.45}px ${FS}`;g.fillStyle=`rgba(190,20,40,${.75+.25*Math.sin(t*4)})`;g.fillText('あなたの階',r*.15,r*.45);}
    g.restore();g.textAlign='left';
    glow(g,cx,by,r*4,'232,48,85',.08+.06*Math.sin(t*2)+(peel?.15:0));
    // 濡れた指のあと
    g.fillStyle='rgba(180,200,240,.15)';for(let i=0;i<4;i++){g.beginPath();g.ellipse(cx-r*1.4+i*r*.9,by+r*1.7+Math.sin(i)*3,r*.18,r*.25,0,0,TAU);g.fill();}
    const fl=Math.sin(t*9)>.95?.4:1;glow(g,w*.5,0,w*.7,'220,225,255',.1*fl);
  }
};

// ── 保育園 ──
function garland(g,w,y,t,R){
  const cols=['#a05070','#b09040','#4a70a0','#5a9060'];
  g.strokeStyle='#4a3a50';g.lineWidth=1;g.beginPath();for(let x=0;x<=w;x+=8){g.lineTo(x,y+Math.sin(x/w*Math.PI)*16+Math.sin(t*.8+x*.02)*1.5);}g.stroke();
  for(let i=0;i<14;i++){const x=(i+.5)*w/14,yy=y+Math.sin(x/w*Math.PI)*16+Math.sin(t*.8+x*.02)*1.5;g.fillStyle=cols[i%4];g.globalAlpha=.55;poly(g,[[x-7,yy],[x+7,yy],[x+Math.sin(t+i)*1.5,yy+14]]);g.fill();g.globalAlpha=1;}
}
SC.n_genkan={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,0,h,[[0,'#1a1c2e'],[1,'#0f101c']]));texFill(g,TX.conc,.35,0,0,w,h);
    // ガラス戸
    const gx=w*.04,gy=h*.08,gw=w*.4,gh=h*.5;rect(g,gx,gy,gw,gh,LG(g,0,gy,0,gy+gh,[[0,'#1c2848'],[1,'#0c1222']]));
    skyline(g,gx,gy+gh*.45,gw,gh*.3,R,.12,'#0a0e1c');rect(g,gx,gy+gh*.75,gw,gh*.25,'#0a0d18');
    g.strokeStyle='#2a2438';g.lineWidth=5;g.strokeRect(gx,gy,gw,gh);g.beginPath();g.moveTo(gx+gw/2,gy);g.lineTo(gx+gw/2,gy+gh);g.stroke();
    rect(g,gx+gw*.2,gy+gh*.48,gw*.6,gh*.05,'rgba(220,200,180,.12)');g.font=`${h*.016}px ${FD}`;g.fillStyle='rgba(230,210,190,.35)';g.fillText('ひまわりぐみ',gx+gw*.3,gy+gh*.515);
    // 下駄箱
    const sx=w*.5,sy=h*.2,sw=w*.46,sh=h*.4,cols=4,rows=4;rect(g,sx-5,sy-5,sw+10,sh+10,'#3a2818');texFill(g,TX.wood,.8,sx-5,sy-5,sw+10,sh+10);
    const shoe=['#d8d8d0','#c8b8b8','#b8c8d8','#d0c8a8'];
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const cx=sx+c*sw/cols+3,cy=sy+r*sh/rows+3,cw=sw/cols-6,ch=sh/rows-6;rect(g,cx,cy,cw,ch,'#120c08');
      rect(g,cx+cw*.15,cy+2,cw*.7,ch*.18,'#d8d0c0');g.fillStyle=['#e07090','#e0b040','#60a0d0','#70c080'][(r+c)%4];g.beginPath();g.arc(cx+cw*.27,cy+2+ch*.09,ch*.06,0,TAU);g.fill();
      g.fillStyle='rgba(60,50,40,.7)';g.fillRect(cx+cw*.4,cy+2+ch*.07,cw*.35,1.5);
      if(r<3&&R()<.3){g.fillStyle=shoe[(r*4+c)%4];g.fillRect(cx+cw*.15,cy+ch*.7,cw*.3,ch*.22);g.fillRect(cx+cw*.52,cy+ch*.7,cw*.3,ch*.22);}}
    // 傘立て
    rect(g,w*.08,h*.6,w*.12,h*.06,'#2a2a38');['#e0c040','#d06080','#4a80c0'].forEach((c,i)=>{g.fillStyle=c;g.globalAlpha=.7;poly(g,[[w*(.1+i*.035),h*.6],[w*(.115+i*.035),h*.6],[w*(.11+i*.035),h*.5]]);g.fill();});g.globalAlpha=1;
    // 床・すのこ
    rect(g,0,h*.62,w,h*.38,LG(g,0,h*.62,0,h,[[0,'#2a2018'],[1,'#120d0a']]));texFill(g,TX.wood,.7,0,h*.62,w,h*.38);
    for(let i=0;i<6;i++)rect(g,w*.48,h*(.64+i*.022),w*.48,h*.012,'#3a2a1c');
  },
  draw(g,w,h,t,S,E){
    const gx=w*.04,gy=h*.08,gw=w*.4,gh=h*.5;
    glassRain(g,gx,gy,gw,gh,t,6,.25);
    if(E.lt>0){g.save();g.globalCompositeOperation='lighter';rect(g,gx,gy,gw,gh,`rgba(160,170,255,${E.lt*.45})`);g.restore();}
    garland(g,w,h*.02,t);
    const fl=S.dark?.15:(Math.sin(t*21)>.97?.5:1);glow(g,w*.5,h*.02,w*.7,'240,220,190',.16*fl);
    if(S.dark){g.fillStyle='rgba(0,0,10,.4)';g.fillRect(0,0,w,h);}
    // 黄色い長靴
    if(S.boots){const sx=w*.5,sy=h*.2,sw=w*.46,sh=h*.4,cw=sw/4-6,ch=sh/4-6,cx=sx+sw/4+3,cy=sy+3*sh/4+3;
      [0,1].forEach(k=>{const bx=cx+cw*(.12+k*.42),by=cy+ch*.95;g.fillStyle='#e0b828';g.beginPath();g.moveTo(bx,by-ch*.7);g.lineTo(bx+cw*.22,by-ch*.7);g.lineTo(bx+cw*.22,by-ch*.2);g.quadraticCurveTo(bx+cw*.36,by-ch*.18,bx+cw*.36,by);g.lineTo(bx,by);g.closePath();g.fill();rect(g,bx,by-ch*.7,cw*.22,ch*.06,'#f4d860');});
      glow(g,cx+cw/2,cy+ch*.6,cw*1.4,'240,200,60',.16+.08*Math.sin(t*1.6));}
    if(S.child===1){g.save();g.beginPath();g.rect(gx,gy,gw,gh);g.clip();g.globalAlpha=.55+.15*Math.sin(t);figure(g,'child',gx+gw*.68,gy+gh*.82,gh*.3,{c:'#03040a'});g.restore();}
  }
};
SC.n_window={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,0,h,[[0,'#1a1c30'],[1,'#0e0f1c']]));texFill(g,TX.conc,.35,0,0,w,h);
    const wx=w*.1,wy=h*.08,ww=w*.8,wh=h*.42;
    rect(g,wx,wy,ww,wh,LG(g,0,wy,0,wy+wh,[[0,'#40507e'],[.6,'#2a3456'],[1,'#141a30']]));
    skyline(g,wx,wy+wh*.55,ww,wh*.45,R,.1,'#121628');
    rect(g,wx,wy+wh*.82,ww,wh*.18,'#0b0e18');
    g.strokeStyle='#2e2840';g.lineWidth=6;g.strokeRect(wx,wy,ww,wh);for(let i=1;i<4;i++){g.lineWidth=4;g.beginPath();g.moveTo(wx+ww*i/4,wy);g.lineTo(wx+ww*i/4,wy+wh);g.stroke();}
    rect(g,wx-8,wy+wh,ww+16,7,'#3a3048');
    // 子どもの絵
    for(let i=0;i<6;i++){const px=w*(.06+i*.155),py=h*.53;rect(g,px,py,w*.12,h*.07,['#d8d0c0','#e0d4c8','#d0d8d0'][i%3]);g.strokeStyle=['#d06070','#4a80c0','#60a060','#d0a040'][i%4];g.lineWidth=1.5;g.beginPath();g.arc(px+w*.06,py+h*.035,h*.018,0,TAU);g.stroke();g.beginPath();g.moveTo(px+w*.02,py+h*.06);g.lineTo(px+w*.1,py+h*.058);g.stroke();}
    // 床と小さい机・椅子
    rect(g,0,h*.63,w,h*.37,LG(g,0,h*.63,0,h,[[0,'#2a2018'],[1,'#120d0a']]));texFill(g,TX.wood,.7,0,h*.63,w,h*.37);
    for(let i=0;i<2;i++){const tx=w*(.15+i*.45);rect(g,tx,h*.7,w*.32,h*.025,'#3a2a20');rect(g,tx+4,h*.72,4,h*.07,'#2a1e18');rect(g,tx+w*.32-8,h*.72,4,h*.07,'#2a1e18');
      for(let k=0;k<2;k++){const cx=tx+w*(.03+k*.17);rect(g,cx,h*.68,w*.07,h*.06,'#1e1612');rect(g,cx,h*.74,w*.07,h*.01,'#2a1e18');}}
  },
  draw(g,w,h,t,S,E){
    const wx=w*.1,wy=h*.08,ww=w*.8,wh=h*.42;
    if(E.lt>0){g.save();g.globalCompositeOperation='lighter';rect(g,wx,wy,ww,wh,`rgba(170,180,255,${E.lt*.5})`);g.restore();}
    // 外の子ども
    g.save();g.beginPath();g.rect(wx,wy,ww,wh);g.clip();
    if(S.child===1){g.globalAlpha=.6;g.filter&&(g.filter='blur(1.5px)');figure(g,'child',wx+ww*.6,wy+wh*.92,wh*.34,{c:'#04050c'});g.filter='none';}
    if(S.child===2){g.globalAlpha=1;figure(g,'child',wx+ww*.55,wy+wh*1.06,wh*1.05,{c:'#020208',rim:'rgba(160,190,255,.35)'});
      g.fillStyle='rgba(200,215,240,.18)';g.beginPath();g.ellipse(wx+ww*.55,wy+wh*.42,ww*.12,wh*.12,0,0,TAU);g.fill();
      g.strokeStyle='rgba(230,240,255,.55)';g.lineWidth=2;g.beginPath();g.moveTo(wx+ww*.5,wy+wh*.38);g.lineTo(wx+ww*.52,wy+wh*.46);g.moveTo(wx+ww*.55,wy+wh*.37);g.quadraticCurveTo(wx+ww*.6,wy+wh*.4,wx+ww*.56,wy+wh*.46);g.moveTo(wx+ww*.59,wy+wh*.39);g.lineTo(wx+ww*.62,wy+wh*.37);g.stroke();
      for(let i=0;i<2;i++){g.fillStyle='rgba(220,230,255,.14)';g.beginPath();g.ellipse(wx+ww*(.47+i*.17),wy+wh*.55,ww*.025,wh*.05,0,0,TAU);g.fill();}}
    g.restore();
    glassRain(g,wx,wy,ww,wh,t,8,.24);
    // てるてる坊主
    const sw=Math.sin(t*1.1)*.12;g.save();g.translate(wx+ww*.2,wy);g.rotate(sw);g.strokeStyle='#bbb';g.lineWidth=1;g.beginPath();g.moveTo(0,0);g.lineTo(0,h*.08);g.stroke();
    g.fillStyle='#d8d4cc';g.beginPath();g.arc(0,h*.095,h*.022,0,TAU);g.fill();poly(g,[[-h*.012,h*.11],[h*.012,h*.11],[h*.03,h*.155],[-h*.03,h*.155]]);g.fill();
    g.fillStyle='#333';g.fillRect(-h*.009,h*.09,2,2);g.fillRect(h*.006,h*.09,2,2);g.restore();
    garland(g,w,h*.0,t);
    glow(g,w*.5,0,w*.6,'240,220,190',.1);
  }
};
SC.n_boots={
  bake(g,w,h,R){
    rect(g,0,0,w,h,'#140d08');
    const cx=w*.08,cy=h*.08,cw=w*.84,ch=h*.52;
    rect(g,cx-14,cy-14,cw+28,ch+28,'#4a3420');texFill(g,TX.wood,1,cx-14,cy-14,cw+28,ch+28);texFill(g,TX.wood,.6,cx-14,cy-14,cw+28,ch+28);
    rect(g,cx,cy,cw,ch,LG(g,0,cy,0,cy+ch,[[0,'#0a0604'],[1,'#1a120c']]));
    rect(g,cx+cw*.3,cy-12,cw*.4,10,'#e0d8c8');g.fillStyle='#e0b040';g.beginPath();g.arc(cx+cw*.35,cy-7,3.5,0,TAU);g.fill();
    rect(g,0,h*.62,w,h*.38,LG(g,0,h*.62,0,h,[[0,'#2a1e14'],[1,'#0e0906']]));texFill(g,TX.wood,.7,0,h*.62,w,h*.38);
  },
  draw(g,w,h,t,S,E){
    const cx=w*.08,cy=h*.08,cw=w*.84,ch=h*.52;
    [0,1].forEach(k=>{const bx=cx+cw*(.12+k*.42),by=cy+ch*.96,bw=cw*.26,bh=ch*.78;
      g.fillStyle=LG(g,bx,0,bx+bw,0,[[0,'#c89818'],[.4,'#f0c830'],[1,'#b08410']]);
      g.beginPath();g.moveTo(bx,by-bh);g.lineTo(bx+bw*.62,by-bh);g.lineTo(bx+bw*.62,by-bh*.28);g.quadraticCurveTo(bx+bw,by-bh*.25,bx+bw,by-bh*.06);g.lineTo(bx+bw,by);g.lineTo(bx,by);g.closePath();g.fill();
      rect(g,bx,by-bh,bw*.62,bh*.07,'#f8e070');rect(g,bx,by-bh*.05,bw,bh*.05,'#6a5010');
      g.fillStyle='rgba(255,255,255,.22)';g.fillRect(bx+bw*.08,by-bh*.9,bw*.06,bh*.6);
      // 名前のタグ
      const tx=bx+bw*.08,ty=by-bh*.6,tw=bw*.46,th=bh*.13;rect(g,tx,ty,tw,th,'#f4f0e4');
      if(S.name){g.strokeStyle=E.st>=3?'#b01828':'#2a2a3a';g.lineWidth=1.6;g.beginPath();for(let i=0;i<3;i++){const x=tx+tw*(.15+i*.27),y=ty+th*.5;g.moveTo(x,y-th*.25);g.quadraticCurveTo(x+tw*.12,y-th*.3,x+tw*.05,y);g.quadraticCurveTo(x-tw*.03,y+th*.3,x+tw*.14,y+th*.2);}g.stroke();}
      // 水滴
      const d=(t*.7+k*.4)%1;g.fillStyle=`rgba(200,220,255,${.6*(1-d)})`;g.beginPath();g.ellipse(bx+bw*.3,lerp(by-bh*.4,by,d),2,3,0,0,TAU);g.fill();});
    glow(g,w*.5,cy+ch*.6,w*.5,'240,200,60',.12+.05*Math.sin(t*1.4));
    g.fillStyle='rgba(120,150,210,.16)';g.beginPath();g.ellipse(w*.5,cy+ch+h*.04,w*.32,h*.025,0,0,TAU);g.fill();
    glow(g,w*.5,0,w*.8,'240,220,190',.08);
  }
};

// ── 深夜のコンビニ ──
SC.k_ext={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,0,h*.5,[[0,'#06060e'],[1,'#12142a']]));
    skyline(g,0,h*.12,w,h*.18,R,.04,'#05050a');
    const sx=w*.08,sy=h*.22,sw=w*.84,sh=h*.3;
    rect(g,sx-6,sy-h*.05,sw+12,sh+h*.05,'#d8dce4');texFill(g,TX.conc,.3,sx-6,sy-h*.05,sw+12,sh+h*.05);
    rect(g,sx-6,sy-h*.045,sw+12,h*.012,'#2aa898');rect(g,sx-6,sy-h*.03,sw+12,h*.012,'#e8a040');rect(g,sx-6,sy-h*.015,sw+12,h*.01,'#d84860');
    rect(g,sx,sy,sw,sh,'#cfe8ee');
    for(let i=0;i<5;i++){const yy=sy+sh*(.2+i*.15);rect(g,sx+sw*.05,yy,sw*.55,sh*.05,'#8aa0b0');for(let k=0;k<14;k++)rect(g,sx+sw*.05+k*sw*.04,yy-sh*.08,sw*.03,sh*.08,['#d86070','#60a0d0','#e0c050','#70c090'][(k+i)%4]);}
    rect(g,sx+sw*.68,sy+sh*.1,sw*.28,sh*.85,'#e8f4f8');for(let k=0;k<4;k++)rect(g,sx+sw*.68+k*sw*.07,sy+sh*.1,2,sh*.85,'#9ab');
    g.strokeStyle='#5a6070';g.lineWidth=3;for(let i=1;i<5;i++){g.beginPath();g.moveTo(sx+sw*i/5,sy);g.lineTo(sx+sw*i/5,sy+sh);g.stroke();}
    rect(g,sx+sw*.4,sy+sh*.15,sw*.2,sh*.85,'rgba(200,230,240,.4)');
    rect(g,0,sy+sh,w,h-(sy+sh),LG(g,0,sy+sh,0,h,[[0,'#1a1c28'],[1,'#08080e']]));texFill(g,TX.conc,.6,0,sy+sh,w,h-(sy+sh));
    g.strokeStyle='rgba(230,230,240,.3)';g.lineWidth=2;for(let i=0;i<5;i++){g.beginPath();g.moveTo(w*(.1+i*.2),h*.6);g.lineTo(w*(.02+i*.24),h*.75);g.stroke();}
    rect(g,0,h*.78,w,h*.22,'#06060a');g.strokeStyle='rgba(232,184,48,.4)';g.setLineDash([16,14]);g.beginPath();g.moveTo(0,h*.86);g.lineTo(w,h*.86);g.stroke();g.setLineDash([]);
  },
  draw(g,w,h,t,S,E){
    const sx=w*.08,sy=h*.22,sw=w*.84,sh=h*.3,fl=Math.sin(t*31)>.96?.6:1;
    glow(g,w*.5,sy+sh*.5,w*.7,'200,240,250',.3*fl);
    g.save();g.globalCompositeOperation='lighter';g.fillStyle=LG(g,0,sy+sh,0,h*.8,[[0,'rgba(200,240,250,.25)'],[1,'rgba(200,240,250,0)']]);poly(g,[[sx,sy+sh],[sx+sw,sy+sh],[w,h*.8],[0,h*.8]]);g.fill();g.restore();
    g.save();g.beginPath();g.rect(0,sy+sh,w,h);g.clip();g.globalAlpha=.25;g.scale(1,-1);g.translate(0,-(sy+sh)*2);g.fillStyle='#bfe0e8';g.fillRect(sx,sy+sh*.4,sw,sh*.6);g.restore();
    g.save();g.beginPath();g.rect(0,sy-h*.05,w,h);g.clip();g.strokeStyle='rgba(220,240,255,.35)';g.beginPath();for(let i=0;i<70;i++){const x=(i*37.7)%w,y=sy-h*.05+((i*53+t*500)%(h*.6));g.moveTo(x,y);g.lineTo(x-2,y+10);}g.stroke();g.restore();
    // 店内の人影（霊障）
    if(E.st>=1){g.save();g.globalAlpha=.5;figure(g,'hood',sx+sw*.78,sy+sh*.97,sh*.6,{c:'#203038'});g.restore();}
    // 通り過ぎる車のライト
    const cx=((t*.25)%3)*w*1.5-w*.5;if(cx>-w*.2&&cx<w*1.2){glow(g,cx,h*.82,w*.12,'255,240,200',.5);glow(g,cx+w*.08,h*.82,w*.12,'255,240,200',.5);}
  }
};
function camAisle(g,w,h,R,y0,y1){
  // CCTVの店内（モノクロ）
  const vx=w*.52,vy=y0+(y1-y0)*.34,H=y1;
  rect(g,0,y0,w,y1-y0,'#18201c');
  poly(g,[[0,H],[w,H],[vx+w*.12,vy+h*.03],[vx-w*.12,vy+h*.03]]);g.fillStyle=LG(g,0,vy,0,H,[[0,'#3a4440'],[1,'#58645e']]);g.fill();
  g.strokeStyle='rgba(20,30,25,.5)';g.lineWidth=1;for(let i=-6;i<=6;i++){g.beginPath();g.moveTo(vx+i*w*.14,H);g.lineTo(vx+i*w*.02,vy+h*.03);g.stroke();}
  for(let k=1;k<8;k++){const f=Math.pow(k/8,1.7),yy=lerp(vy+h*.03,H,f);g.beginPath();g.moveTo(lerp(vx-w*.12,0,f),yy);g.lineTo(lerp(vx+w*.12,w,f),yy);g.stroke();}
  // 奥の冷蔵ケース
  rect(g,vx-w*.22,y0+(y1-y0)*.12,w*.44,(vy+h*.03)-(y0+(y1-y0)*.12),'#9ab4a6');
  for(let i=0;i<6;i++)rect(g,vx-w*.22+i*w*.073,y0+(y1-y0)*.12,2,(vy+h*.03)-(y0+(y1-y0)*.12),'#4a5a52');
  for(let r=0;r<4;r++)for(let i=0;i<18;i++)rect(g,vx-w*.21+i*w*.024,y0+(y1-y0)*(.15+r*.05),w*.015,(y1-y0)*.035,`rgb(${90+(i*37+r*11)%60},${110+(i*13)%50},${100+(i*29)%40})`);
  // 左右の棚
  [-1,1].forEach(s=>{const ox=s<0?0:w,ix=vx+s*w*.12;poly(g,[[ox,y0+(y1-y0)*.05],[ix,y0+(y1-y0)*.2],[ix,vy+h*.03],[ox,H-(y1-y0)*.12]]);g.fillStyle='#262e2a';g.fill();
    for(let k=0;k<5;k++){const f=k/5;g.strokeStyle='#4a5650';g.lineWidth=2;g.beginPath();g.moveTo(ox,lerp(y0+(y1-y0)*.05,H-(y1-y0)*.12,f));g.lineTo(ix,lerp(y0+(y1-y0)*.2,vy+h*.03,f));g.stroke();
      for(let j=0;j<10;j++){const u=j/10,x=lerp(ox,ix,u),yy=lerp(lerp(y0+(y1-y0)*.05,H-(y1-y0)*.12,f),lerp(y0+(y1-y0)*.2,vy+h*.03,f),u);const hh=lerp(16,5,u);rect(g,x,yy-hh,s*lerp(10,3,u),hh,`rgb(${70+(j*31+k*17)%60},${80+(j*19)%50},${76+(j*7)%40})`);}}});
  return {vx,vy,H};
}
SC.k_cam={
  bake(g,w,h,R){rect(g,0,0,w,h,'#0c100e');camAisle(g,w,h,R,0,h*.82);rect(g,0,h*.82,w,h*.18,'#0a0c0b');},
  draw(g,w,h,t,S,E){
    const vx=w*.52,vy=h*.82*.34;
    glow(g,vx,h*.82*.2,w*.4,'200,240,220',.15);
    if(S.fig){const z=S._z=lerp(S._z==null?(S.z||0):S._z,S.z||0,.03);const zi=Math.min(2,Math.floor(z)),zf=z-zi,SCL=[.13,.2,.32,.78],FY=[vy+h*.05,vy+h*.11,vy+h*.24,h*.98];const sc=lerp(SCL[zi],SCL[zi+1],zf);
      const fx=vx+w*.02*z+Math.sin(t*37)*(z>2?2:0.5),fy=lerp(FY[zi],FY[zi+1],zf);
      g.save();g.globalAlpha=1;if(Math.sin(t*13)>.92)g.globalAlpha=.35;g.shadowColor='rgba(0,0,0,.8)';g.shadowBlur=12;figure(g,'hood',fx,fy,h*sc,{c:'#020403',rim:'rgba(220,255,230,.25)'});g.restore();}
    // CCTV風
    camOSD(g,w,h,t,'CAM 02',E);
  }
};
function camOSD(g,w,h,t,label,E){
  g.save();g.globalCompositeOperation='multiply';rect(g,0,0,w,h,'#a8d0b4');g.restore();
  texFill(g,TX.scan,.55,0,0,w,h);
  const n=TX.noises[(t*24|0)%3];g.save();g.globalAlpha=.08+.03*E.st;g.globalCompositeOperation='overlay';g.drawImage(n,0,0,w,h);g.restore();
  // ローリングバー
  const ry=((t*.15)%1)*h*1.3-h*.15;g.fillStyle='rgba(220,255,230,.05)';g.fillRect(0,ry,w,h*.08);
  g.fillStyle=RG(g,w/2,h*.42,h*.25,h*.75,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.7)']]);g.fillRect(0,0,w,h);
  if(!label)return;
  g.font=`${Math.max(10,h*.022)}px ${FM}`;g.fillStyle='rgba(220,255,230,.85)';
  g.fillText(label,12,48);const sec=String(12+((t|0)%48)).padStart(2,'0');g.fillText('2016/11/04  03:33:'+sec,12,48+h*.03);
  if(Math.sin(t*4)>0){g.fillStyle='#e83055';g.beginPath();g.arc(w*.42,44,4,0,TAU);g.fill();g.fillStyle='rgba(220,255,230,.85)';g.fillText('REC',w*.42+8,48);}
}
SC.k_multi={
  bake(g,w,h,R){
    rect(g,0,0,w,h,'#050806');
    const tw=w/2-6,th=h*.33;
    for(let i=0;i<4;i++){const x=4+(i%2)*(tw+4),y=36+((i/2)|0)*(th+4);g.save();g.beginPath();g.rect(x,y,tw,th);g.clip();g.translate(x,y);
      if(i===1){rect(g,0,0,tw,th,'#28302c');rect(g,tw*.1,th*.55,tw*.8,th*.2,'#4a5650');rect(g,tw*.2,th*.3,tw*.2,th*.25,'#3a4440');}
      else{camAisle(g,tw,th*1.15,R,0,th);}
      g.restore();g.strokeStyle='#1a221e';g.lineWidth=2;g.strokeRect(x,y,tw,th);}
  },
  draw(g,w,h,t,S,E){
    const tw=w/2-6,th=h*.33;
    g.font=`${Math.max(9,h*.017)}px ${FM}`;
    for(let i=0;i<4;i++){const x=4+(i%2)*(tw+4),y=36+((i/2)|0)*(th+4);g.fillStyle='rgba(220,255,230,.85)';g.fillText('CAM 0'+(i+1),x+6,y+14);}
    if(S.cam5){const big=S.cam5>1;const cw=big?w*.86:w*.5,ch=big?h*.42:h*.24,x=(w-cw)/2,y=big?h*.12:h*.22+Math.sin(t*3)*2;
      g.save();g.fillStyle='#000';g.fillRect(x-3,y-3,cw+6,ch+6);g.beginPath();g.rect(x,y,cw,ch);g.clip();
      rect(g,x,y,cw,ch,'#1c2420');rect(g,x+cw*.25,y+ch*.3,cw*.5,ch*.32,'#6a8a80');glow(g,x+cw*.5,y+ch*.45,cw*.4,'180,230,210',.3);
      rect(g,x,y+ch*.7,cw,ch*.3,'#2a3430');figure(g,'seated',x+cw*.5,y+ch*1.02,ch*.62,{c:'#0a100e'});
      if(big||E.st>=3){g.globalAlpha=.85;figure(g,'tall',x+cw*.78,y+ch*1.05,ch*.95,{c:'#050806'});g.globalAlpha=1;}
      g.restore();g.strokeStyle='#e83055';g.lineWidth=2;g.strokeRect(x,y,cw,ch);
      g.fillStyle='#ff6a80';g.fillText('CAM 05',x+6,y+14);}
    camOSD(g,w,h,t,'',E);
  }
};

// ───────────────────────── 投稿（シナリオ） ─────────────────────────
// 文字列: 'r:投稿文' 'd:だんのうら' 's:地の文・音' 'c[n]:名前|コメント'（n=表示に必要な霊障。名前のない者は既定2）
// 名前の略記: 夜=夜空の旅人 ひ=ひとりぼっち 常=深夜の常連 さ=さくら ？=名前のない者
// オブジェクト: {bg,tr} {act,title} {set} {fx} {snd} {wait} {rain} {face} {choice:[{t,h,r,go}]} {go} {ending:1}
const ENDK=['good','normal','cursed'];
const END_LABEL={good:'神回',normal:'普通に終わる',cursed:'何かを呼んだ'};
const OPEN=[{bg:'room',tr:'fade'},{rain:1},'s:――雨の夜。配信開始のチャイムが、小さく鳴る。',{snd:'chime'}];
const STORIES=[
{id:'factory',title:'第三工場の点検ルート',short:'第三工場',from:'元・夜勤保全さん（40代）',no:'0013',bleed:'factory',
 blurb:'十年前、取り壊しが決まった工場で最後の夜勤巡回をしました。点検ポイントは十二。……そのはずでした。',
 ends:{good:'十三行目は鉛筆で',normal:'雨音だけが残る',cursed:'点検ポイント No.13'},
 nodes:{
 start:[...OPEN,
  'd:……こんばんは。だんのうらです。今夜も「工場で聞いた話」、始めます。',
  'c:夜|こんばんは。今夜も雨ですね','c:常|夜勤明けに間に合った','c:さ|わこつ〜！',
  'd:今日はリスナーさんからの投稿です。件名に「実録」って書いてある。',
  'd:送ってくれたのは、元・夜勤の保全さん。……同業だ。ちょっと嬉しい。',
  'c:ひ|同業さんの話、リアルで好き…','c:常|保全の怪談はガチで怖いやつ',
  'd:じゃあ、読みます。部屋の電気、つけたい人はつけてね。',
  {act:1,title:'巡回ルート'},{bg:'f_gate',tr:'mosaic'},{rain:1.3},
  'r:十年前の話です。取り壊しが決まった第三工場で、私は最後の夜勤巡回をしていました。',
  'r:操業はもう止まっていて、残っているのは、止めきれない配管の圧と、雨漏りの音だけでした。',
  'r:点検ポイントは十二。ボイラー室から始めて、最後は屋上の受水槽。',
  'd:わかる。巡回ルートって体が覚えるんだよね。目をつぶっても回れる。','c:匿名の保全マン|巡回あるある',
  'r:点検表は、鉛筆で書く決まりでした。間違えても、消して直せるように。',
  'd:うちの工場もそう。……地味だけど、大事なルールなんだよ。',
  {bg:'f_corr',tr:'fade'},{rain:.6},
  'r:十二番まで回り終えて、詰所に戻ろうとしたときです。',
  'r:バインダーに挟んだ点検表に、見覚えのない十三行目が増えていました。',{set:{sign:1}},{snd:'drip'},
  'r:「No.13　地下ピット　異常有無」。……地下ピットなんて、第三工場の図面にはありません。',
  'c:ひ|え……','c:さ|増えてるのこわい','c:常|図面にないピットは現場あるある（ない）',
  'd:……さて。ここ、どう読もうかな。',
  {choice:[{t:'点検表を、本物みたいに読み上げる',h:1,r:2,go:'c1a'},{t:'「地下ピットってどこだと思う？」とチャットに振る',h:2,r:0,go:'c1b'},{t:'余計なことはせず、淡々と先を読む',h:0,r:0,go:'c1c'}]}],
 c1a:['d:（バインダーを持つ手つきで）……No.1、ボイラー室。圧力、正常。','d:No.2、コンプレッサー。異音なし。No.3、冷却塔。……No.4――',{snd:'hum'},{fx:'glitch'},
  's:――マイクに、低い唸りが混じる。機械の、回る音。','c:常|今の音なに？','c:夜|演出ですか？ 機械の音がしました','c:？|No.5、排水ポンプ。異常なし','c2:さ|え、今の誰が書いたの',
  'd:……うちのPCのファン、かな。続けます。',{go:'p2'}],
 c1b:['d:みんなならどこだと思う？ 図面にない、地下ピット。','c:常|排水ピットだろ','c:匿名の保全マン|旧設備の基礎の点検口とか','c:さ|行っちゃダメなとこ','c:ひ|工場の地下って、それだけでいやだ…','c:夜|昔の防空壕、という線は？',
  'd:さすが、みんな詳しい。……でもね、投稿者さんの答えは、どれでもなかったんです。',{go:'p2'}],
 c1c:['d:……淡々といきます。こういうのは、盛らない方が怖いから。','c:夜|わかります','c:常|プロの判断',{go:'p2'}],
 p2:[{act:2,title:'十三番目'},
  'r:私は、十三番を探しました。……探してしまった、と言うべきかもしれません。',
  'r:ボイラー室の奥。いつも鍵がかかっている鉄扉が、指一本ぶん、開いていました。',{set:{door:1}},{snd:'creak'},
  {bg:'f_stair',tr:'wipe'},
  'r:扉の向こうは、下へ降りる階段でした。下から、懐中電灯の明かりが、ゆっくり上がってきます。',{set:{light:1}},
  'r:誰かが点検している。そう思いました。その夜の夜勤は、私ひとりのはずなのに。',
  {fx:'thunder'},'s:――遠くで、雷。',
  'r:階段の下から、構内放送みたいな、ひび割れた声がしました。',{wait:700},
  'r:「――No.13、異常なし」',{fx:'glitch'},{snd:'static'},
  'c:ひ|ひっ','c:さ|声に出さないで……','c:常|放送って、操業止まってんのに？',
  'd:……。',
  {choice:[{t:'投稿者が「返事をしたか」どうかを読む',h:1,r:3,go:'c2a'},{t:'いったん区切って、チャットと一緒に落ち着く',h:0,r:-1,go:'c2b'},{t:'保全屋として「やっちゃいけない行動」を解説する',h:3,r:0,go:'c2c'}]}],
 c2a:['r:私は反射で、返事をしてしまいました。','r:「了解、異常なし」。無線にそう返すのが、巡回の癖だったんです。',{wait:500},
  'r:懐中電灯の光が、ぴたりと止まりました。それから、ゆっくり、こちらを向きました。',{set:{fig:1}},{fx:'shake'},{snd:'heart'},{face:'fear'},
  'c:常|うわあああ','c:？|返事、ありがとうございます','c3:さ|ねえ今のコメント、名前なかったよ？',
  'd:……返事、しちゃったのか。','d:投稿者さんは、そのまま扉を閉めて、走って詰所に戻ったそうです。',{go:'p3'}],
 c2b:['d:……ちょっと、一回お茶飲みます。','s:――カップを置く音。雨の音。','d:みんなも、部屋の電気つけていいからね。怖いのは、話の中だけで十分。',
  'c:夜|つけました','c:ひ|ありがとう。ちょっと落ち着いた','c:常|休憩たすかる',
  'd:よし。……投稿者さんも、その場では何も答えずに、扉を閉めたそうです。',{go:'p3'}],
 c2c:['d:保全屋として言わせて。知らない扉が開いてたら、まず入らない。報告して、必ず二人で行く。','d:確認できない場所に、ひとりで降りる。それは怪談とか関係なく、絶対にだめ。',
  'c:匿名の保全マン|これはガチ','c:常|急に安全教育始まって草','c:さ|でも説得力すごい','c:新人オペ|明日から気をつけます',
  'd:……投稿者さんも、そうしたんです。扉を閉めて、詰所に戻った。えらい。',{go:'p3'}],
 p3:[{act:3,title:'引き継ぎ'},{bg:'f_office',tr:'fade'},{rain:.5},
  'r:翌朝。引き継ぎで点検表を出すと、班長が不思議そうな顔をしました。','r:「お前、地下ピットなんか、どうやって行ったんだ」',
  'r:十三行目が、埋まっていたんです。私の字で。',{set:{paper:1}},
  'r:「地下ピット　異常なし」。',{wait:600},'r:……ボールペンで。',{snd:'heart'},
  'c:夜|鉛筆の決まりって、そういう……','c:常|消せないやつじゃん',
  'r:そして、その行の日付欄には、その夜ではない日付が入っていました。',
  'd:……投稿の最後に、その日付が書いてあります。',
  {choice:[{t:'最後の日付を、そのまま読み上げる',h:1,r:3,go:'c3a'},{t:'読まずに、投稿を閉じる',h:1,r:-2,go:'c3b'},{t:'「何日だと思う？」と、締めをチャットに委ねる',h:2,r:1,go:'c3c'}]}],
 c3a:['d:……日付は、「三十日目」。年も、月もなくて。ただ、三十日目。',{set:{paper:2}},{fx:'glitch'},{snd:'static'},
  'c:？|30日目まで見ています','c:ひ|まって、それ前の配信でも誰か書いてなかった？','c3:さ|だんのうらさん、今日って、何日目？',{ending:1}],
 c3b:['d:……これは、読まないでおきます。投稿者さんも「できれば読まないでほしい」って書いてるので。','c:夜|英断です','c:さ|それが一番こわい','c:常|読まないのが保全の正解',{ending:1}],
 c3c:['d:みんなは、何日だと思う？','c:常|13日','c:ねこまた|今日の日付だったら泣く','c:さ|明日とか言わないでね','c:？|あなたの日付です','d:……はい、この話はここまで。',{ending:1}],
 end_good:[{bg:'room',tr:'fade'},{rain:.8},'s:――コメント欄が、拍手みたいに流れていく。',
  'c:匿名の保全マン|現役保全だけど、明日の巡回ちょっと怖い','c:夜|今日の、すごく良かったです','c:さ|神回！！','c:常|切り抜き待ってる',
  'd:……投稿者さん、ありがとう。第三工場は、もう更地になったそうです。','d:みんなも、知らない十三行目を見つけたら、ひとりで降りないこと。……約束ね。','d:今夜の「工場で聞いた話」は、ここまで。おつかれさまでした。'],
 end_normal:[{bg:'room',tr:'fade'},'s:――雨の音だけが、しばらく流れる。','d:……以上、投稿でした。投稿者さん、ありがとう。','c:夜|おつかれさまでした','c:ひ|おやすみなさい……','d:……おやすみ。点検表は、鉛筆で書こうね。'],
 end_cursed:[{bg:'room',tr:'glitch'},{set:{bleed:1}},'s:――配信終了ボタンを押した。画面が暗くなる。','d:……ふう。今日のは、ちょっと疲れたな。',{wait:800},{snd:'phone'},{fx:'flash'},
  's:ピコン。スマホに、職場の点検アプリの通知。','d:「点検ポイント No.13　だんのうら宅　異常なし」','d:……うちに、点検ポイントなんて。',
  'c0:？|次は、あなたの点検ですね','s:――配信は、もう切ったはずだった。',{fx:'tear'}],
 }},
{id:'elev',title:'団地のエレベーター',short:'団地',from:'元・住人さん（20代）',no:'0021',bleed:'elev',
 blurb:'子どもの頃に住んでいた、五階建ての古い団地の話です。エレベーターの床は、晴れの日でも少し濡れていました。',
 ends:{good:'何階ですか',normal:'階段で帰る',cursed:'あなたの階'},
 nodes:{
 start:[...OPEN,
  'd:こんばんは、だんのうらです。今日の「工場で聞いた話」……は、工場じゃないです。ごめん。',
  'c:常|看板詐欺で草','c:さ|わこつ〜',
  'd:団地の話。投稿者さんが子どもの頃に住んでた、五階建ての古い団地。',
  'c:夜|団地の怪談は、生活の匂いがして怖いんですよね','c:ひ|うちも団地……',
  {act:1,title:'定員四人'},{bg:'e_danchi',tr:'mosaic'},{rain:1.2},
  'r:うちの棟には、あとから外付けした小さなエレベーターがありました。定員は四人。',
  'r:どういうわけか、床がいつも少しだけ濡れていました。晴れの日でも。',
  'r:母には、ひとつだけ言われていました。「エレベーターで知らない人に階を聞かれても、答えちゃだめよ」',
  'd:……防犯の話、だよね。普通に考えたら。','c:常|お母さん正しい',
  {bg:'e_inside',tr:'fade'},{rain:.2},{set:{floor:1}},
  'r:塾の帰り、夜の十時過ぎでした。一階で乗り込んで、三階を押します。',
  'r:扉が閉まる直前。傘を持った女の人が、すっと乗ってきました。',{set:{woman:1,drip:1}},{snd:'drip'},
  'r:閉じた傘の先から、ぽた、ぽた、と水が垂れていました。外は、もう雨が上がっていたのに。',
  'r:女の人は前を向いたまま、私に聞きました。',{wait:500},
  'r:「何階ですか」',{snd:'heart'},
  'c:ひ|こわいこわい','c:夜|お母さんの言いつけ……',
  'd:……このセリフ、どう読もう。',
  {choice:[{t:'女の人の声色で、ゆっくり読む',h:2,r:2,go:'c1a'},{t:'「チン」とか効果音まで自分でやる',h:3,r:0,go:'c1b'},{t:'いつもの声のまま読む',h:0,r:0,go:'c1c'}]}],
 c1a:['d:（声を落として）……「何階、ですか」。','s:――マイクのノイズが、ほんの少しだけ長く残る。',{fx:'glitch'},'c:夜|声色うますぎて鳥肌','c:？|何階ですか','c2:常|おい今の誰だ。真似すんな',{go:'p2'}],
 c1b:['d:……チン。ウィーーン……ガコン。',{snd:'chime'},'c:常|効果音うまくて草','c:さ|再現度たかい','c:ねこまた|ちょっと怖さやわらいだ','d:いや、雰囲気は大事でしょ。続けます。',{go:'p2'}],
 c1c:['d:「何階ですか」。……普通に、聞かれただけなんだよね。','c:夜|それが一番こわいです',{go:'p2'}],
 p2:[{act:2,title:'六階'},
  'r:私は、言いつけを破って「三階です」と答えました。女の人は黙って、五階のボタンを押しました。',
  'r:エレベーターが動き出します。一、二、三。……止まりません。',{set:{floor:4}},{snd:'hum'},{wait:600},{set:{floor:5}},
  'r:四、五。そして表示が、ありえない数字になりました。',{set:{floor:6}},{fx:'redflash'},{snd:'chime'},
  'r:「６」。うちの団地は、五階建てです。','c:さ|ひぇ','c:ひ|6階……','c:常|屋上じゃん',
  {set:{open:1}},{wait:900},
  'r:扉が開きました。廊下は真っ暗で、ずっと奥まで、水が張っていました。',
  {bg:'e_hall',tr:'wipe'},{rain:.9},
  'r:屋根のすぐ上のはずなのに、雨の音が、廊下の奥から聞こえてくるんです。',
  'r:女の人が、傘を開きながら振り返りました。「降りないんですか」',
  {choice:[{t:'投稿者が「降りたか」を読み進める',h:1,r:3,go:'c2a'},{t:'エレベーターの「閉」ボタンの話をする',h:2,r:-1,go:'c2b'},{t:'チャットに「降りる？ 降りない？」を聞く',h:2,r:1,go:'c2c'}]}],
 c2a:['r:私は、一歩だけ、廊下に足を出してしまいました。','r:靴が、くるぶしまで沈みました。冷たい水でした。',{set:{fig:1}},{fx:'shake'},{snd:'drip'},{face:'fear'},
  'r:廊下の奥で、たくさんの傘を閉じる音がしました。ぱさ。ぱさ。ぱさ。',
  'c:常|無理無理無理','c:？|足、まだ冷たいでしょう','c3:さ|名前のない人、さっきからいるよね……？',
  'd:……戻れたんだよね。戻れたから、こうして投稿できてる。',{go:'p3'}],
 c2b:['d:ちなみに、エレベーターの「閉」ボタン。押しっぱなしで扉が閉まる機種、多いんだよ。','d:投稿者さんも、ずっと「閉」を押してたって。指が白くなるくらい。',
  'c:昇降機のひと|点検屋です。あれ押しっぱなしで閉まります','c:さ|わたしも連打する派','c:夜|閉ボタンは正義',
  'r:扉は、ゆっくり閉まりました。女の人は最後まで、廊下の奥を見ていました。',{go:'p3'}],
 c2c:['d:みんなならどうする？ 降りる？ 降りない？','c:常|降りない一択','c:ねこまた|降りる（配信者魂）','c:ひ|ぜったい降りない','c:？|降りてください','c2:さ|……今の、だれ？',
  'd:多数決、「降りない」で。……投稿者さんも、降りなかった。',{go:'p3'}],
 p3:[{act:3,title:'塞がれたボタン'},{bg:'e_inside',tr:'fade'},{rain:.2},{set:{floor:3,woman:0,open:0,_open:0}},
  'r:気づくと、三階で扉が開いていました。女の人は、いませんでした。',
  'r:床には、傘から落ちた水たまりだけが、残っていました。',
  'r:何年もたって、引っ越しの日。最後にエレベーターに乗ったとき、ボタンの列を見て気づいたんです。',
  {bg:'e_panel',tr:'mosaic'},
  'r:「５」の上に、もうひとつ。テープで塞がれたボタンがあることに。',
  'c:常|うわ','c:夜|「定員四人」っていうのも、ずっと気になってました',
  {choice:[{t:'テープの下に何が書いてあったかを読む',h:1,r:3,go:'c3a'},{t:'テープの話は読まずに締める',h:0,r:-2,go:'c3b'},{t:'「みんなの家のエレベーターは大丈夫？」と問いかける',h:2,r:1,go:'c3c'}]}],
 c3a:['d:……テープは、端が少しだけ剥がれてて。その下に、手書きで。',{wait:600},{set:{tape:1}},'d:「あなたの階」。',{fx:'glitch'},{snd:'static'},
  'c:？|いま、あなたの階で止まりました','c3:ひ|だんのうらさんの家って、何階だっけ……',{ending:1}],
 c3b:['d:……テープの下は、投稿には書いてありません。投稿者さんも、剥がさなかったそうです。','c:夜|それでいいと思います','c:常|剥がさないのが正解',{ending:1}],
 c3c:['d:みんなの家のエレベーター、ボタンの数、数えたことある？','c:常|今から数えてくる','c:ねこまた|うちは階段しかない。勝ち','c:さ|明日から絶対見ちゃう','c:？|数えなくていいですよ',{ending:1}],
 end_good:[{bg:'room',tr:'fade'},{rain:.8},'s:――コメント欄が、「何階ですか」で埋まっていく。','c:さ|しばらく頭から離れない','c:常|今日イチの神回','c:昇降機のひと|点検で行った団地を思い出した……',
  'd:……投稿者さん、ありがとう。今は別の街の、二階の部屋に住んでるそうです。','d:みんなも。知らない階で扉が開いたら、閉を押してね。……おつかれさまでした。'],
 end_normal:[{bg:'room',tr:'fade'},'d:……以上です。投稿者さん、ありがとう。','c:夜|おつかれさまでした','c:ひ|エレベーター乗れなくなりそう','d:階段もいい運動だよ。……おやすみ。'],
 end_cursed:[{bg:'room',tr:'glitch'},{set:{bleed:1}},'s:――配信を切った。部屋が、雨の音で満ちる。',{wait:800},{snd:'intercom'},{fx:'flash'},
  's:ピンポーン。','d:……インターホン？ こんな時間に。','d:モニターには、誰も映っていない。共用廊下の床が、濡れているだけ。',
  'c0:？|何階ですか','s:――このアパートに、エレベーターはない。',{fx:'tear'}],
 }},
{id:'nursery',title:'保育園の忘れ物',short:'保育園',from:'元・保育士さん（30代）',no:'0034',bleed:'nursery',
 blurb:'雨の日の夕方、お迎えがすべて終わったあと。下駄箱には、いつも黄色い長靴が一足だけ残っていました。',
 ends:{good:'おむかえ、来たよ',normal:'明日も雨',cursed:'十五センチの長靴'},
 nodes:{
 start:[...OPEN,
  'd:こんばんは。……今日の投稿は、正直、読むのを少し迷いました。',
  'd:保育園の話です。うちも子どもを預けてるから、なんだか他人事じゃなくて。',
  'c:さ|だんのうらさんのとこも保育園だもんね','c:夜|ゆっくりで大丈夫ですよ','c:ひ|やさしい話だといいな',
  {act:1,title:'雨の日の忘れ物'},{bg:'n_genkan',tr:'mosaic'},{rain:1.1},
  'r:私が勤めていた園には、雨の日にだけ出てくる「忘れ物」がありました。',
  'r:全員のお迎えが終わったあと。下駄箱の一番下の段に、黄色い長靴が一足、残っているんです。',{set:{boots:1}},
  'r:名前は書いてありません。どのクラスの子のものでもありません。',
  'r:それなのに翌朝には、なくなっています。誰かが、ちゃんと迎えに来たみたいに。',
  'r:延長保育の名簿にも、不思議なことがありました。雨の日だけ、一番下に一行、空欄が増えるんです。',
  'c:常|名簿の空欄はこわい','c:ひ|ちょっとさみしい話……？',
  'd:……どう読もう。',
  {choice:[{t:'保育士さんの気持ちに寄り添って、静かに読む',h:2,r:0,go:'c1a'},{t:'長靴の「持ち主」を探るように読む',h:1,r:2,go:'c1b'},{t:'自分の子の保育園の話を少しする',h:2,r:-1,go:'c1c'}]}],
 c1a:['d:……保育士さんって、最後の子が帰るまで、ずっと玄関を見てるんだよね。','d:うちの子のお迎えが遅れた日も、先生、ずっと一緒に待っててくれた。','c:夜|先生、ありがたいですよね','c:さ|わかる……泣きそう',{go:'p2'}],
 c1b:['d:……名前のない長靴。小さいね。たぶん、二歳か三歳くらい。',{snd:'drip'},'s:――雨の音が、一瞬だけ近くなる。','c:？|十五センチです','c2:常|なんでサイズ知ってんの','c2:さ|サイズ言うのやめて……',{go:'p2'}],
 c1c:['d:うちの子の園もさ、雨の日は玄関が長靴だらけになるんだ。','d:で、だいたい誰かひとりは、左右逆に履いて帰る。うちのとか。','c:常|かわいい','c:さ|ほっこりした','c:ひ|ちょっと怖くなくなった。ありがとう',{go:'p2'}],
 p2:[{act:2,title:'おむかえ、まだ？'},{bg:'n_window',tr:'fade'},
  'r:ある雨の夕方。延長保育の最後の一人を送り出して、私はひとりで戸締まりをしていました。',
  'r:下駄箱には、黄色い長靴。いつものように、そこにありました。',
  'r:窓の鍵を確かめていたとき、背中のほうから、小さな声がしました。',{wait:700},
  'r:「せんせい。おむかえ、まだ？」',{snd:'whisper'},{fx:'glitch'},
  'c:ひ|やだ、泣きそう','c:さ|こわいより、かなしい……',
  'r:振り向くと、窓の外。雨の中に、小さい子の影がひとつ、立っていました。',{set:{child:1}},
  {choice:[{t:'保育士さんが「なんと答えたか」を読む',h:2,r:1,go:'c2a'},{t:'影の「顔」について書かれた部分を読む',h:1,r:3,go:'c2b'},{t:'読むのを止めて、子どもの寝顔を見てくる',h:0,r:-2,go:'c2c'}]}],
 c2a:['r:私は、いつもの声で言いました。「もうすぐ来るよ。せんせいと一緒に待ってようね」','r:影は、こくん、と、うなずいたように見えました。','c:夜|先生、やさしい','c:さ|泣いた','c:常|これは神投稿',{go:'p3'}],
 c2b:['r:窓ガラスは雨で曇っていて、顔は見えませんでした。','r:でも、その子がガラスにおでこをつけて、じっとこちらを見ているのは、わかりました。',{set:{child:2}},{fx:'shake'},{snd:'knock'},{face:'fear'},
  'r:息で曇ったガラスに、小さな指で、何かを書いていました。','c:？|お名前、書いてましたよ','c3:常|やめろって','c3:さ|今のコメント、名前ないよ……？',{go:'p3'}],
 c2c:['d:……ごめん、ちょっとだけ。子ども、見てきます。','s:――マイク、ミュート。三十秒。',{wait:1000},'c:夜|いってらっしゃい','c:ひ|待ってるね','c:さ|パパしてる','d:……寝てた。布団、蹴っ飛ばしてた。……続けます。',{go:'p3'}],
 p3:[{act:3,title:'名前'},{set:{child:0}},{bg:'n_genkan',tr:'fade'},
  'r:その日から、私は雨の日の戸締まりのとき、必ず玄関に声をかけるようになりました。','r:「おむかえ、来たよ」って。',
  'r:翌朝になると、長靴はやっぱり、なくなっていました。',
  'r:園を辞める最後の日。下駄箱の長靴に、初めて名前が書いてありました。',{bg:'n_boots',tr:'mosaic'},{set:{name:1}},
  'c:常|ついに名前','c:ひ|どきどきする',
  {choice:[{t:'長靴に書いてあった名前を読む',h:1,r:3,go:'c3a'},{t:'名前は伏せて、投稿者さんの最後の一文を読む',h:3,r:0,go:'c3b'},{t:'自分の部屋の玄関に「おむかえ来たよ」と言ってみる',h:2,r:2,go:'c3c'}]}],
 c3a:['d:……名前は、ひらがなで。',{wait:700},'d:……え。','d:……うちの子と、同じ名前だ。',{fx:'redflash'},{snd:'heart'},{face:'fear'},'c:？|おむかえ、まだ？','c3:さ|だんのうらさん？ 大丈夫？',{ending:1}],
 c3b:['r:「あの子はきっと、ちゃんと迎えに来てもらえたんだと思います。だから最後に、名前を書いて置いていったんだと思います」','d:……先生、ありがとう。','c:夜|泣きました','c:さ|いい話だった……','c:ひ|あの子、おうちに帰れたんだね',{ending:1}],
 c3c:['d:……「おむかえ、来たよ」。',{wait:800},{snd:'knock'},'s:――部屋の玄関で、ぱた、と小さな音。','c:常|今なんか音した？','c:？|はーい',{ending:1}],
 end_good:[{bg:'room',tr:'fade'},{rain:.6},'c:さ|今日の配信、ずっと覚えてると思う','c:夜|明日のお迎え、少し早く行こうかな','c:ひ|先生にありがとうって言いたくなった',
  'd:……投稿者さん、ありがとう。今は別の仕事だけど、雨の日はまだ玄関を見ちゃうそうです。','d:俺も、明日のお迎え、ちょっと早く行きます。……おやすみなさい。'],
 end_normal:[{bg:'room',tr:'fade'},'d:……以上です。投稿者さん、ありがとうございました。','c:夜|おつかれさまでした','c:ひ|おやすみなさい','d:明日も雨だって。長靴、出しとかなきゃ。……おやすみ。'],
 end_cursed:[{bg:'room',tr:'glitch'},{set:{bleed:1}},'s:――配信を切った。子ども部屋から、寝息が聞こえる。','d:……玄関の鍵、かけたよな。',{wait:700},{snd:'knock'},
  's:玄関に、黄色い長靴が一足。……うちの子のは、青だ。',{fx:'flash'},'c0:？|おむかえ、ありがとう','s:――長靴の先が、少しだけ、濡れていた。',{fx:'tear'}],
 }},
{id:'konbini',title:'深夜コンビニの防犯カメラ',short:'コンビニ',from:'元・夜勤バイトさん（大学生）',no:'0047',bleed:'konbini',
 blurb:'国道沿いのコンビニで、深夜ワンオペしてました。防犯カメラは四台。マジで実話っす。',
 ends:{good:'三時三十三分',normal:'昼に行けば大丈夫',cursed:'CAM 05'},
 nodes:{
 start:[...OPEN,
  'd:こんばんは。今夜の投稿は、コンビニの夜勤バイトをしてた大学生さんから。',
  'c:常|コンビニ夜勤は怪談の宝庫','c:さ|わたし昔やってた！',
  'd:文章が若い。「マジで実話っす」って書いてある。……いいね、読みます。',
  {act:1,title:'午前三時三十三分'},{bg:'k_ext',tr:'mosaic'},{rain:1.3},
  'r:国道沿いのコンビニで、深夜ワンオペしてました。客なんて、一時間に一人来るかどうかっす。',
  'r:暇なときは、レジ裏のモニターで防犯カメラ見るのが癖でした。カメラは四台。入口、レジ、雑誌棚、ドリンクの前。',
  'd:……ちゃんと場所まで書いてくれてる。こういうの、大事。',
  {bg:'k_cam',tr:'glitch'},{rain:0},
  'r:その夜の、午前三時三十三分。','r:カメラ２。ドリンクの冷蔵ケースの前に、人が立ってたんです。',{set:{fig:1,z:0}},{snd:'static'},
  'r:でも、入店のチャイムは鳴ってない。顔を上げて店内を見ても、誰もいないんすよ。',
  'c:ひ|定番だけどこわい','c:夜|カメラにだけ、いる……',
  {choice:[{t:'防犯カメラ映像を「実況」するように読む',h:3,r:1,go:'c1a'},{t:'時刻の「三時三十三分」をじっくり強調する',h:1,r:2,go:'c1b'},{t:'淡々と、事実だけ読む',h:0,r:0,go:'c1c'}]}],
 c1a:['d:さあカメラ２、冷蔵ケースの前。動かない。動かない。……おっと、まだ動かない！','c:常|実況やめろｗ','c:ねこまた|スポーツ中継で草','c:さ|こわいのに笑っちゃう','d:……ごめん。ここからは真面目に読みます。',{go:'p2'}],
 c1b:['d:……三時、三十三分。……三十三分。',{fx:'glitch'},'s:――配信画面の時計が、一瞬止まって見えた。','c:？|いま、3時33分ですね','c2:夜|え、まだ1時ですよ','c2:常|誰だよ',{go:'p2'}],
 c1c:['d:チャイムは鳴っていない。店内には誰もいない。カメラにだけ、いる。','c:夜|事実だけだと、逆にこわいです',{go:'p2'}],
 p2:[{act:2,title:'一歩ずつ'},
  'r:次の夜も、三時三十三分。その人は、またカメラ２に映りました。今度は、冷蔵ケースから一歩こっち寄りに。',{set:{z:1}},{snd:'step'},
  'r:その次の夜は、雑誌の棚の前。その次は、レジに向かう通路の途中。',{set:{z:2}},{snd:'step'},
  'r:毎晩、少しずつカメラに近づいてくるんす。顔は、いつも下を向いてて、見えませんでした。',
  'c:ひ|やだやだ','c:さ|店長に言った？','c:常|俺ならその日に辞める',
  {choice:[{t:'録画を「巻き戻して」確かめた話を読む',h:1,r:3,go:'c2a'},{t:'「店長に報告した」くだりを読む',h:1,r:-1,go:'c2b'},{t:'チャットと一緒に「あと何日で来るか」計算する',h:3,r:1,go:'c2c'}]}],
 c2a:['r:録画を巻き戻してみたら、その人、毎晩おんなじ動きしてたんです。','r:どこに立ってても、ガラスとか棚とかに、指で何か書いてる。毎晩、同じものを。',{set:{z:3}},{fx:'shake'},{snd:'static'},{face:'fear'},
  'c:？|カメラの番号です','c3:常|は？','c3:さ|名前ない人のコメント、さっきから何……？',{go:'p3'}],
 c2b:['r:店長に録画を見せたら、黙って首を振られました。','r:「カメラ２はな、去年から壊れてるんだよ。何も映らないはずなんだ」','c:夜|ひえ','c:常|じゃあ何が映ってたんだよ','c:匿名の保全マン|配線どうなってんだ',{go:'p3'}],
 c2c:['d:冷蔵ケースからレジまで、だいたい四メートル。一晩一メートルずつだとして……。','c:常|あと4日','c:ねこまた|計算すな','c:さ|理系の怪談配信','c:？|あと、一日です','d:……ちょっと、計算やめよう。',{go:'p3'}],
 p3:[{act:3,title:'五台目'},
  'r:バイトを辞める前の夜。三時三十三分。',{set:{fig:0}},
  'r:カメラ２には、誰も映ってませんでした。',
  'r:ほっとして、ほかのカメラも見ました。カメラ１、２、３、４。',
  {bg:'k_multi',tr:'mosaic'},
  'r:……カメラが、五台になってました。',{set:{cam5:1}},{fx:'glitch'},{snd:'heart'},
  'c:常|5台目……','c:夜|最初に「四台」って書いてありましたよね',
  {choice:[{t:'五台目のカメラに映っていた場所を読む',h:1,r:3,go:'c3a'},{t:'投稿者さんが「すぐに店を出た」くだりを読む',h:1,r:-1,go:'c3b'},{t:'「みんなもカメラ確認してね」と冗談めかして締める',h:3,r:1,go:'c3c'}]}],
 c3a:['d:……五台目に映ってたのは、店じゃなかった。','d:知らない部屋。机があって、モニターが光ってて。男がひとり、ヘッドホンをして、何か喋ってる。',{set:{cam5:2}},{fx:'redflash'},{snd:'static'},
  'c:？|あなたの後ろからです','c3:さ|待って、それって',{ending:1}],
 c3b:['r:そのまま店を出て、朝まで国道沿いのファミレスにいました。次の日、辞めました。','d:……正解だと思う。','c:夜|逃げるが勝ちです','c:常|店長には同情する',{ending:1}],
 c3c:['d:みんなも、スマホのインカメ、ちゃんと閉じてる？ ……なんてね。','c:常|ステッカー貼ってる','c:ねこまた|今貼った','c:さ|笑えないって','c:？|閉じても見えます',{ending:1}],
 end_good:[{bg:'room',tr:'fade'},{rain:.8},'c:元コンビニ夜勤|三時台にチャイム鳴らない客、マジでいる','c:さ|コンビニ夜勤勢みんな震えてる','c:常|神回。切り抜き確定',
  'd:……投稿者さん、ありがとう。今は昼のバイトだそうです。','d:みんなも、夜中にカメラ見ちゃう癖は、ほどほどにね。おつかれさまでした。'],
 end_normal:[{bg:'room',tr:'fade'},'d:……以上です。投稿者さん、ありがとう。','c:夜|おつかれさまでした','c:ひ|コンビニ行けなくなった','d:昼に行けば大丈夫。……たぶん。おやすみ。'],
 end_cursed:[{bg:'room',tr:'glitch'},{set:{bleed:1}},'s:――配信を切った。暗くなったモニターに、自分の顔が映る。','s:……右上に、見覚えのない表示がある。',{fx:'flash'},{snd:'static'},
  'd:「CAM 05　03:33」','c0:？|カメラ５、あなたの後ろです','s:――振り向けなかった。',{fx:'tear'}],
 }},
{id:'hidden',title:'三十日目の投稿',short:'最終話',from:'',no:'0030',bleed:'hidden',hidden:true,
 blurb:'雨の多い街に、怪談を読む配信者がいます。',
 ends:{good:'朝が来る',normal:'空白のまま',cursed:'三十日目まで'},
 nodes:{
 start:[...OPEN,
  'd:こんばんは。……今夜の投稿、ちょっと変なんです。',
  'd:送り主の欄が、空白で。件名は「三十日目の投稿」。',
  'c:常|30日目って、前の配信でも出てきたやつ？','c:さ|やめよ？ 別の投稿にしよ？','c:夜|でも、気になります',
  'd:今まで読んだ投稿、覚えてる？ 十三行目。六階。黄色い長靴。五台目のカメラ。',
  'd:どの投稿にも、送ってくれた人が書いてないはずの一文が、こっそり足されてたんだ。……「三十日目」って。',
  'c:ひ|え……','c:常|マジかよ',
  'd:たぶん、これはその答え合わせ。……読みます。',
  {act:1,title:'雨の街の配信者'},{bg:'h_screen',tr:'mosaic'},{rain:.4},
  'r:雨の多い街に、怪談を読む配信者がいます。工場で働いて、子どもを育てて、夜になると、マイクの前に座ります。',
  'c:常|これ、だんのうらさんのことじゃん','c:ひ|え……',
  'r:部屋の窓は左側。机の上には、冷めたマグカップ。壁には、子どもの描いた絵が一枚。',{snd:'heart'},
  'd:……合ってる。全部。',
  'c:さ|特定班？ こわいって','c:夜|配信に映ったことのあるもの、ですかね……？',
  'd:……いや。窓は、一度も映したことない。',
  {choice:[{t:'このまま読み進める',h:1,r:2,go:'c1a'},{t:'「特定はやめてね」とチャットに念押しする',h:2,r:0,go:'c1b'},{t:'部屋の電気を、全部つける',h:1,r:-1,go:'c1c'}]}],
 c1a:['d:……続けます。読まないと、たぶん、終わらない気がする。','c:？|えらいですね','c2:さ|だれ？？',{go:'p2'}],
 c1b:['d:みんな、こういうの真似しないでね。住所とか、部屋のこととか、詮索しないこと。','c:常|当たり前だ','c:夜|約束します','c:ひ|だんのうらさんのこと、守る','c:さ|わたしたちが見張ってるから大丈夫！',{go:'p2'}],
 c1c:['d:……ちょっと待って。電気、全部つける。',{set:{lights:1}},'s:――天井の灯りが、二度、瞬いてから点く。','c:夜|えらいです','c:常|明るいと少しマシ',{go:'p2'}],
 p2:[{act:2,title:'先回りする文章'},{bg:'room',tr:'fade'},
  'r:配信者は、この投稿を読みながら、きっとこう言います。「……合ってる。全部」',
  'd:……。','c:常|は？',
  'r:そして、さくらさんが書きます。「だれ？ こわい」',
  'c:さ|だれ？ こわい',{wait:500},'c:さ|あ、ちがう、今のはわたしが自分で',{fx:'glitch'},{snd:'static'},
  'c:ひ|やだ、もうやめよう？',
  'r:配信者は、迷います。読むのをやめるか。やめないか。',
  'r:でも、どちらを選んでも、ここに書いてあります。',
  {choice:[{t:'やめずに、最後の段落まで読む',h:1,r:3,go:'c2a'},{t:'「みんなは、どう思う？」と常連たちに聞く',h:3,r:0,go:'c2b'},{t:'投稿のファイルを閉じようとする',h:0,r:1,go:'c2c'}]}],
 c2a:['d:……読むよ。最後まで。','r:えらいですね。',{fx:'shake'},{snd:'heart'},'c:？|えらいですね','c3:常|同じこと書いてある……',{go:'p3'}],
 c2b:['d:……みんなは、どう思う？ 正直に言って。','c:夜|こわいです。でも、ひとりで読ませたくないです','c:常|一緒に聞いてる。だから読め。何かあったら俺らが騒ぐ','c:ひ|わたしも、いる。ずっといる','c:さ|名前、呼ぶからね。だんのうらさんの名前',
  'd:……ありがとう。みんなの名前、ちゃんと見えてる。',{go:'p3'}],
 c2c:['d:……閉じる。閉じます。',{fx:'glitch'},'s:――閉じるボタンを押しても、ウィンドウが閉じない。','r:閉じようとしても、閉じません。最後まで、読んでください。','c:？|最後まで、どうぞ','c:常|おいPC大丈夫か',{go:'p3'}],
 p3:[{act:3,title:'三十日目'},{bg:'h_screen',tr:'wipe'},
  'r:三十日目の夜。配信者は、とても疲れていました。',
  'r:借金のこと。仕事のこと。子どものこと。眠らないと、と思いながら、マイクの前に座っていました。',
  'd:……。','c:夜|だんのうらさん、ちゃんと寝てますか',
  'r:最後の段落です。','r:「配信者は、配信を切らずに眠りました。そして――」',{wait:700},
  'd:……ここから先は、空白。何も書いてない。',
  'c:？|寝たら終わりますよ','c:？|後ろ、雨の音だけじゃないですよ',
  {choice:[{t:'空白の続きを、自分の声で読む',h:1,r:3,go:'c3a'},{t:'チャットに「続きを書いて」と頼む',h:3,r:0,go:'c3b'},{t:'何も言わず、配信を切る',h:0,r:0,go:'c3c'}],meta:1}],
 c3a:['d:……「配信者は、配信を切らずに眠りました。そして」',{wait:700},'d:「三十日目まで、見られていました」',{fx:'redflash'},{snd:'static'},'c:？|はい。見ています','c3:さ|だんのうらさん！！',{ending:1}],
 c3b:['d:……みんな。続き、書いてくれないかな。俺じゃなくて、みんなの言葉で。','c:夜|そして、朝が来ました','c:常|そして、ちゃんと起きて仕事に行きました','c:ひ|そして、子どもと朝ごはんを食べました','c:さ|そして、次の配信も、わたしたちは聞きに来ました',
  'd:……うん。それがいい。',{ending:1}],
 c3c:['d:……今日は、ここまで。','s:――配信終了。ボタンは、ちゃんと押せた。',{ending:1}],
 end_good:[{bg:'h_dawn',tr:'fade'},{rain:0},'s:――カーテンの隙間が、白んでいく。雨が、やんでいた。','d:……朝だ。',
  'c:さ|おはよう！！','c:常|おはよう。仕事行ってこい','c:夜|おはようございます。いい朝ですね','c:ひ|おはよう。……ありがとう',
  'd:……みんな、ありがとう。今日は寝る。ちゃんと、布団で。','s:――投稿のファイルは、いつの間にか消えていた。'],
 end_normal:[{bg:'room',tr:'fade'},'d:……今夜は、この投稿はおしまい。空白は、空白のままにしておきます。','c:夜|おつかれさまでした','c:常|寝ろよ','d:うん。……寝る。おやすみ。'],
 end_cursed:[{bg:'void',tr:'glitch'},{set:{bleed:1,viewers1:1}},'s:――気づくと、机に突っ伏していた。','s:配信は、まだ続いている。視聴者数は、ひとり。',{fx:'flash'},{snd:'static'},
  'c0:？|おはようございます','c0:？|今日で、何日目ですか','s:――雨の音だけが、ずっと続いている。',{fx:'tear'}],
 }},
];
const CHAT_NAMES={'夜':'夜空の旅人','ひ':'ひとりぼっち','常':'深夜の常連','さ':'さくら'};
const REG_COL={'夜空の旅人':'#7ab8ff','ひとりぼっち':'#c49cff','深夜の常連':'#44ee88','さくら':'#ff8fb8'};
const AMB={
  reg:{'夜空の旅人':['こんばんは','声が落ち着きますね','雨の日の怪談、いいですね','鳥肌たちました','この時間の配信、楽しみにしてます'],
       'ひとりぼっち':['ひとりで聞いてる…','電気つけた','こわいけど聞いちゃう','布団かぶった','ここにいるよ'],
       '深夜の常連':['待ってた','夜勤明けに沁みる','わかる','保全の話はリアルなんだよな','ここ好き'],
       'さくら':['こわ','むり〜','続き気になる！','だんのうらさん声いい','ひぇ']},
  crowd:['ねこまた','kuro_77','残業明け','しじみ汁','uni','tomo','雨音フェチ','夜勤の佐藤','もぐら','いぬ派','3交代','ゆず','初見です','nanashi_k'],
  msg:['こわ','ひぇ','続きはよ','音量下げた','後ろ振り向けない','こんばんは〜','初見です','鳥肌','ヘッドホンで聞いてる','おもろい','え','まって','雨の音いいな','読むのうまい'],
  hype:['神回の予感','同接増えてる','切り抜き確定','拡散してくる','ここすき','8888888','今日のやばい','トレンド入りそう'],
  oddNames:['　','……','rain','３０','ｓ','夜空の旅入','さくら ','■■■'],
  odd:['さっきも同じ話、聞きました','後ろの雨音、変ですね','30日目まで見ています','寝たら終わりますよ','後ろ、雨の音だけじゃないですよ','いいこえ','もっと読んで'],
  know:['マグカップ、もう冷めてますよ','左の窓、鍵かかってないですね','お子さん、さっき寝返りしました','背中のドア、少しだけ開いてます','いま、まばたき三回しましたね','イヤホンの左、聞こえにくいでしょう','壁の絵、太陽の色がきれいですね'],
  react:[['さくら','今の誰？'],['深夜の常連','名前ないアカウントって作れたっけ'],['夜空の旅人','通報しておきました'],['ひとりぼっち','こわいこわい'],['深夜の常連','演出だよな？ な？']],
};

// ───────────────────────── 効果音（Web Audio合成） ─────────────────────────
// AU.ctx があるときだけ鳴らす。音量は AUDIO_SET.se に比例、0なら無音。
function makeSnd(){
  let ctx=null,master=null,amb=null,nb=null,dead=false;
  const vol=()=>{try{return typeof AUDIO_SET!=='undefined'?AUDIO_SET.se:1;}catch(e){return 1;}};
  function get(){
    if(dead||!window.AU)return null;
    try{AU.init();}catch(e){}
    ctx=AU.ctx;if(!ctx)return null;
    const v=vol();if(!(v>0)){if(master)master.gain.value=0;return null;}
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    if(!master){master=ctx.createGain();master.connect(ctx.destination);}
    master.gain.value=v;
    if(!nb){nb=ctx.createBuffer(1,ctx.sampleRate*2|0,ctx.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
    return ctx;
  }
  function env(g,t0,a,pk,d){g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(Math.max(.0002,pk),t0+a);g.gain.exponentialRampToValueAtTime(.0001,t0+a+d);}
  function osc(type,f,t0,a,pk,d,f2){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+a+d);env(g,t0,a,pk,d);o.connect(g);g.connect(master);o.start(t0);o.stop(t0+a+d+.05);}
  function noise(t0,a,pk,d,ft,fq,q,fq2){const s=ctx.createBufferSource();s.buffer=nb;s.loop=true;const f=ctx.createBiquadFilter();f.type=ft;f.frequency.setValueAtTime(fq,t0);if(fq2)f.frequency.exponentialRampToValueAtTime(fq2,t0+a+d);f.Q.value=q||1;const g=ctx.createGain();env(g,t0,a,pk,d);s.connect(f);f.connect(g);g.connect(master);s.start(t0,Math.random());s.stop(t0+a+d+.05);}
  return {
    play(n,k){
      k=k==null?1:k;if(k<=0)return;const c=get();if(!c)return;const t=c.currentTime+.01;
      try{switch(n){
        case 'chime':osc('sine',659,t,.01,.07*k,1.1);osc('sine',523,t+.42,.01,.07*k,1.4);break;
        case 'intercom':osc('triangle',784,t,.01,.11*k,.9);osc('triangle',622,t+.5,.01,.11*k,1.5);break;
        case 'drip':osc('sine',1500,t,.002,.07*k,.16,360);break;
        case 'heart':osc('sine',60,t,.012,.28*k,.22,38);osc('sine',58,t+.3,.012,.2*k,.26,36);break;
        case 'creak':{const o=ctx.createOscillator(),f=ctx.createBiquadFilter(),g=ctx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(70,t);for(let i=1;i<9;i++)o.frequency.linearRampToValueAtTime(55+Math.random()*70,t+i*.12);f.type='bandpass';f.frequency.value=850;f.Q.value=7;env(g,t,.08,.12*k,1);o.connect(f);f.connect(g);g.connect(master);o.start(t);o.stop(t+1.2);}break;
        case 'static':noise(t,.004,.1*k,.42,'highpass',2400,.7);noise(t,.004,.05*k,.3,'bandpass',600,2);break;
        case 'thunder':noise(t,.03,.32*k,2.8,'lowpass',420,.7,55);noise(t+.04,.01,.12*k,.35,'lowpass',1600,.5);break;
        case 'whisper':noise(t,.35,.05*k,1.4,'bandpass',900,9,2400);noise(t+.25,.3,.035*k,1.2,'bandpass',1700,9,650);break;
        case 'knock':[0,.24].forEach(o=>{noise(t+o,.003,.28*k,.12,'lowpass',520,1);osc('sine',120,t+o,.003,.14*k,.1,70);});break;
        case 'step':noise(t,.006,.16*k,.2,'lowpass',280,1);break;
        case 'phone':[0,.17].forEach(o=>osc('square',1320,t+o,.004,.04*k,.11));break;
        case 'hum':osc('sawtooth',62,t,.35,.05*k,1.6);osc('sawtooth',93,t,.35,.025*k,1.6);break;
        case 'tick':osc('sine',1900+Math.random()*200,t,.002,.01*k,.03);break;
        case 'page':noise(t,.01,.05*k,.16,'bandpass',3200,1.2,1800);break;
        case 'act':osc('sine',110,t,.05,.12*k,2.2,82);osc('triangle',220,t,.05,.03*k,1.6,164);break;
        case 'sting':osc('sawtooth',46,t,.01,.12*k,1.4,30);noise(t,.005,.08*k,.9,'bandpass',1200,4,300);break;
        case 'pick':osc('triangle',520,t,.005,.05*k,.12);osc('sine',780,t+.05,.005,.04*k,.18);break;
      }}catch(e){}
    },
    ambient(rain,dr){
      const c=get();if(!c)return;
      try{
        if(!amb){const s=c.createBufferSource();s.buffer=nb;s.loop=true;const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=450;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2800;const g=c.createGain();g.gain.value=.0001;s.connect(hp);hp.connect(lp);lp.connect(g);g.connect(master);s.start();
          const o=c.createOscillator();o.type='sine';o.frequency.value=46;const o2=c.createOscillator();o2.type='sine';o2.frequency.value=46.7;const og=c.createGain();og.gain.value=.0001;o.connect(og);o2.connect(og);og.connect(master);o.start();o2.start();amb={s,g,o,o2,og};}
        const t=c.currentTime;amb.g.gain.cancelScheduledValues(t);amb.g.gain.setTargetAtTime(Math.max(.0001,.045*rain),t,.6);
        amb.og.gain.cancelScheduledValues(t);amb.og.gain.setTargetAtTime(Math.max(.0001,dr),t,.9);
      }catch(e){}
    },
    stop(){dead=true;if(amb){try{amb.s.stop();amb.o.stop();amb.o2.stop();}catch(e){}}amb=null;if(master){try{master.disconnect();}catch(e){}}master=null;},
  };
}

// ───────────────────────── 記録 ─────────────────────────
function hdata(){
  const d=gs.horrorData||(gs.horrorData={});
  d.read=d.read||{};d.ends=d.ends||{};
  if(d.mild==null)d.mild=false;if(d.speed==null)d.speed=1;d.auto=!!d.auto;d.plays=d.plays||0;
  return d;
}
const baseStories=()=>STORIES.filter(s=>!s.hidden);
const hiddenOpen=d=>baseStories().every(s=>d.read[s.id]);
const storyEnds=(d,s)=>ENDK.filter(k=>d.ends[s.id+':'+k]).length;
const totalEnds=d=>STORIES.reduce((a,s)=>a+storyEnds(d,s),0);
function pickStory(d){
  const avail=STORIES.filter(s=>!s.hidden||hiddenOpen(d));
  const unread=avail.find(s=>!d.read[s.id]);if(unread)return unread;
  const miss=avail.filter(s=>storyEnds(d,s)<3&&s.id!==d.last);
  const pool=miss.length?miss:avail.filter(s=>s.id!==d.last);
  return pool[Math.floor(Math.random()*pool.length)]||avail[0];
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ───────────────────────── 本体 ─────────────────────────
const CPS=[22,40,72,9999],SPEED_L=['遅い','普通','速い','瞬間'];
const OUTDOOR={room:1,f_gate:1,f_corr:1,f_office:1,e_danchi:1,e_hall:1,n_genkan:1,n_window:1,k_ext:1,void:1};
registerMinigame({
  id:'horror', icon:'👻', name:'怪談配信・実録編', genre:'ホラーノベル', bgm:'kaidan',
  desc:'リスナーから届いた「実録怪談」を生配信で朗読するサウンドノベル。読み方の選び方で、コメント欄の盛り上がりと……部屋の様子が変わっていく。',
  effect:'配信人気↑ フォロワー↑ 精神↓リスク ／ 疲労+6〜8 約60分',
  help:'タップで読み進める・1〜3で選択',
  start(body,mg){
    textures();
    const hd=hdata();
    let story=pickStory(hd);
    const SFX=makeSnd();
    body.innerHTML=`<div class="hr-stage"><canvas class="hr-cv"></canvas>
<div class="hr-top"><span class="hr-live"><i></i><span class="hr-lv">LIVE</span></span><span class="hr-view">👁 --</span><span class="hr-heart">♥ 0</span><span class="hr-ttl"></span></div>
<div class="hr-chat"></div><div class="hr-choices"></div>
<div class="hr-box"><div class="hr-bar"><span class="hr-name none">　</span><div class="hr-tgs"><button class="hr-tg" data-k="log">LOG</button><button class="hr-tg" data-k="auto">AUTO</button><button class="hr-tg" data-k="skip">SKIP</button><button class="hr-tg" data-k="cfg">⚙</button></div></div><div class="hr-text"></div><div class="hr-mode"></div><div class="hr-next">▼</div></div>
<div class="hr-flash"></div></div>`;
    const stage=body.firstChild,cv=stage.querySelector('.hr-cv'),g=cv.getContext('2d');
    const $=s=>stage.querySelector(s);
    const chatEl=$('.hr-chat'),chEl=$('.hr-choices'),boxEl=$('.hr-box'),nameEl=$('.hr-name'),textEl=$('.hr-text'),nextEl=$('.hr-next'),modeEl=$('.hr-mode'),flashEl=$('.hr-flash');
    const viewEl=$('.hr-view'),heartEl=$('.hr-heart'),ttlEl=$('.hr-ttl'),lvEl=$('.hr-lv');
    const tgEls={};stage.querySelectorAll('.hr-tg').forEach(b=>tgEls[b.dataset.k]=b);
    const faces={};['normal','happy','fear','tired'].forEach(k=>{const im=new Image();im.src=`assets/img/char_${k}.webp`;faces[k]=im;});

    // ── 状態 ──
    let W=0,H=0,dpr=1,T=0;
    let phase='title',overlay=null;
    let hype=0,rei=0,hearts=0,endKey=null,endNew=false,justUnlocked=false,offline=false;
    let S={},bg='room',tr=null,stack=[],line=null,lineDone=false,autoT=0,skipT=0,skip=false;
    let busyT=0,busyRate=1,buf=null,chOn=false,chList=[],chSel=-1,actNo=0,actTitle='';
    let lt=0,ltNext=6+Math.random()*8,glT=0,glAmp=1,microT=3,faceO=null,faceT=0;
    let rainI=1,rainTarget=1,drops=[],chatQ=[],chatT=0,ambT=2,lastSe=0,startedAt=0;
    const LOG=[];
    const bakes={};let bufA=null,bufB=null,tiny=null;
    const stg=()=>rei>=6?3:rei>=4?2:rei>=2?1:0;
    const later=(fn,ms)=>setTimeout(()=>{if(!mg._ended)fn();},ms);
    const se=t=>{try{AU.se(t);}catch(e){}};
    const snd=(n,k)=>{const sudden={static:1,thunder:1,knock:1,intercom:1,phone:1,sting:1,creak:1};if(hd.mild&&sudden[n]){if(n==='static'||n==='sting'||n==='thunder')return;k=(k||1)*.35;}SFX.play(n,k);};

    // ── サイズ ──
    function resize(){
      const r=stage.getBoundingClientRect();W=Math.max(200,r.width|0);H=Math.max(300,r.height|0);
      dpr=Math.min(2,window.devicePixelRatio||1);cv.width=W*dpr|0;cv.height=H*dpr|0;
      for(const k in bakes)delete bakes[k];bufA=bufB=null;
      const hb=Math.round(clamp(H*.2,136,170));stage.style.setProperty('--hb',hb+'px');
      const n=Math.min(170,(W*H/2600)|0);drops=Array.from({length:n},()=>({x:Math.random()*W,y:Math.random()*H,l:8+Math.random()*16,v:420+Math.random()*380,a:.05+Math.random()*.12}));
    }
    const ro=new ResizeObserver(()=>resize());ro.observe(stage);resize();
    function bake(id){
      if(bakes[id])return bakes[id];
      const c=mkC(W*dpr,H*dpr),x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);SC[id].bake(x,W,H,mkRnd(id.length*977+id.charCodeAt(0)*31));
      return bakes[id]=c;
    }
    function env(){return {lt,st:offline&&endKey==='cursed'?3:stg(),bleed:story.bleed,mild:hd.mild};}
    function renderScene(id,x){x.drawImage(bake(id),0,0,W,H);SC[id].draw(x,W,H,T,S,env());}
    function mkBuf(){const c=mkC(W*dpr,H*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);return c;}

    // ── 描画 ──
    function draw(){
      g.setTransform(dpr,0,0,dpr,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';
      if(tr){
        if(!bufA)bufA=mkBuf();if(!bufB)bufB=mkBuf();
        const a=bufA.getContext('2d'),b=bufB.getContext('2d');
        renderScene(tr.from,a);renderScene(bg,b);
        const p=clamp(tr.t/tr.dur,0,1);
        if(tr.type==='fade'){g.drawImage(p<.5?bufA:bufB,0,0,W,H);rect(g,0,0,W,H,`rgba(3,2,8,${1-Math.abs(p-.5)*2})`);}
        else if(tr.type==='mosaic'){const src=p<.5?bufA:bufB,k=1-Math.abs(p-.5)*2,bs=Math.max(1,Math.round(1+k*k*26));
          const tw=Math.max(2,(W/bs)|0),th=Math.max(2,(H/bs)|0);if(!tiny)tiny=mkC(tw,th);tiny.width=tw;tiny.height=th;const tx=tiny.getContext('2d');tx.imageSmoothingEnabled=true;tx.drawImage(src,0,0,tw,th);
          g.imageSmoothingEnabled=false;g.drawImage(tiny,0,0,W,H);g.imageSmoothingEnabled=true;rect(g,0,0,W,H,`rgba(3,2,8,${k*.45})`);}
        else if(tr.type==='wipe'){g.drawImage(bufA,0,0,W,H);const n=12;g.save();g.beginPath();
          for(let i=0;i<n;i++){const q=clamp(p*1.6-((i*7)%n)/n*.6,0,1),x=i*W/n;g.rect(x,0,W/n+1,q*H);g.moveTo(x+W/n*.5,q*H);g.arc(x+W/n*.5,q*H,W/n*.5,0,Math.PI);}
          g.clip();g.drawImage(bufB,0,0,W,H);g.restore();}
        else{g.drawImage(p<.5?bufA:bufB,0,0,W,H);glT=Math.max(glT,.12);glAmp=hd.mild?.4:2.2;rect(g,0,0,W,H,`rgba(0,0,0,${(1-Math.abs(p-.5)*2)*.5})`);}
      }else renderScene(bg,g);
      const E=env();
      // 前景の雨
      if(rainI>.02){g.strokeStyle=`rgba(175,185,255,${.13*rainI})`;g.lineWidth=1;g.beginPath();for(const d of drops){g.moveTo(d.x,d.y);g.lineTo(d.x-d.l*.16,d.y+d.l);}g.stroke();}
      // 色調（霊障）
      const st=E.st;
      if(st>0){g.save();g.globalCompositeOperation='multiply';rect(g,0,0,W,H,['#fff','#e6def2','#dcbfd2','#d29aaa'][st]);g.globalCompositeOperation='saturation';rect(g,0,0,W,H,`rgba(128,128,128,${st*.12})`);g.restore();
        if(st>=2){const p=.5+.5*Math.sin(T*1.3);g.fillStyle=RG(g,W/2,H*.42,H*.3,H*.8,[[0,'rgba(120,0,20,0)'],[1,`rgba(120,0,20,${(st-1)*.18*p})`]]);g.fillRect(0,0,W,H);}}
      if(lt>0){g.save();g.globalCompositeOperation='lighter';rect(g,0,0,W,H,`rgba(140,150,255,${lt*(hd.mild?.05:.12)})`);g.restore();}
      // カメラ枠（配信者のアバター）
      if(phase!=='title'&&phase!=='letter'&&!offline&&bg!=='void'&&bg!=='h_dawn'&&!(tr&&(tr.from==='void')))drawCam(E);
      // ビネット・ノイズ・走査線
      g.fillStyle=RG(g,W/2,H*.45,Math.min(W,H)*.3,Math.max(W,H)*.75,[[0,'rgba(0,0,0,0)'],[1,`rgba(0,0,0,${.6+st*.08})`]]);g.fillRect(0,0,W,H);
      g.save();g.globalAlpha=(.04+st*.025)*(hd.mild?.6:1);g.globalCompositeOperation='overlay';g.drawImage(TX.noises[(T*20|0)%3],0,0,W,H);g.restore();
      texFill(g,TX.scan,.16,0,0,W,H);
      // グリッチ
      if(glT>0){g.setTransform(1,0,0,1,0,0);const n=3+(Math.random()*5|0);
        for(let i=0;i<n;i++){const sy=Math.random()*cv.height,sh=(3+Math.random()*26)*dpr,off=(Math.random()-.5)*36*dpr*glAmp;g.drawImage(cv,0,sy,cv.width,sh,off,sy,cv.width,sh);}
        if(!hd.mild){g.globalCompositeOperation='lighter';g.fillStyle=`rgba(232,48,85,${.1*glAmp})`;g.fillRect(0,Math.random()*cv.height,cv.width,(4+Math.random()*12)*dpr);g.fillStyle=`rgba(0,232,200,${.08*glAmp})`;g.fillRect(0,Math.random()*cv.height,cv.width,(2+Math.random()*8)*dpr);g.globalCompositeOperation='source-over';}
        g.setTransform(dpr,0,0,dpr,0,0);}
    }
    function drawCam(E){
      const cw=Math.round(Math.min(118,W*.3)),ch=Math.round(cw*.8),x=W-cw-8,y=36,st=E.st;
      g.save();g.beginPath();g.rect(x,y,cw,ch);g.clip();
      rect(g,x,y,cw,ch,LG(g,0,y,0,y+ch,[[0,st>=3?'#2a0e18':'#1a1230'],[1,'#0a0716']]));
      // 背後の窓
      const wx=x+cw*.06,wy=y+ch*.1,ww=cw*.34,wh=ch*.42;rect(g,wx,wy,ww,wh,'#0a1430');if(lt>0)rect(g,wx,wy,ww,wh,`rgba(170,180,255,${lt*.6})`);glassRain(g,wx,wy,ww,wh,T,11,.3);
      if(st>=2){const v=lt>0?1:clamp(Math.sin(T*.6+1)*2-.5,0,.7);if(v>0){g.globalAlpha=v;figure(g,'tall',wx+ww*.5,wy+wh+2,wh*.85,{c:'#010103'});g.globalAlpha=1;}}
      g.strokeStyle='#1c1530';g.lineWidth=2;g.strokeRect(wx,wy,ww,wh);
      const lf=st>=1&&Math.sin(T*17)>.85?.3:1;glow(g,x+cw*.12,y+ch*.85,cw*.4,'232,170,90',.25*lf);
      if(st>=2){rect(g,x+cw*.9,y+ch*.08,cw*.06,ch*.8,'#010102');}
      // アバター
      const face=faceO||(st>=3||(rei>=4&&Math.sin(T*.4)>0)?'fear':hype>=5?'happy':(gs.fatigue>70?'tired':'normal'));
      const im=faces[face],ax=x+cw*.66,ay=y+ch*.6,ar=ch*.36;
      g.save();g.beginPath();g.arc(ax,ay,ar,0,TAU);g.clip();rect(g,ax-ar,ay-ar,ar*2,ar*2,'#2a2040');
      if(im.complete&&im.naturalWidth){const jx=st>=3&&Math.random()<.08?(Math.random()-.5)*8:0;g.drawImage(im,ax-ar+jx,ay-ar,ar*2,ar*2);}
      rect(g,ax-ar,ay-ar,ar*2,ar*2,`rgba(10,6,24,${.22+st*.06})`);g.restore();
      g.strokeStyle=st>=3?'#e83055':'rgba(0,232,200,.7)';g.lineWidth=1.5;g.beginPath();g.arc(ax,ay,ar+1,0,TAU);g.stroke();
      // 音量メーター
      const talking=line&&!lineDone&&line.type!=='s';for(let i=0;i<5;i++){const on=talking&&Math.random()<.7-i*.12;rect(g,x+5,y+ch-8-i*5,4,3,on?(i>3?'#e83055':'#44ee88'):'rgba(255,255,255,.12)');}
      if(st>=1){g.globalAlpha=.06*st;g.drawImage(TX.noises[(T*30|0)%3],x,y,cw,ch);g.globalAlpha=1;}
      g.restore();
      g.strokeStyle=st>=3?'rgba(232,48,85,.8)':'rgba(138,82,212,.7)';g.lineWidth=1;g.strokeRect(x+.5,y+.5,cw-1,ch-1);
      g.font=`9px ${FM}`;g.fillStyle='rgba(222,204,248,.85)';g.fillText(offline?'CAM ─ OFF':'CAM ● '+(st>=3&&Math.sin(T*2)>.6?'？？？':'だんのうら'),x+4,y+11);
      if(!offline&&Math.sin(T*3)>0){g.fillStyle='#e83055';g.beginPath();g.arc(x+cw-8,y+8,2.5,0,TAU);g.fill();}
    }

    // ── チャット ──
    function addChat(name,msg,cls){
      const d=document.createElement('div');d.className='hr-msg'+(cls?' '+cls:'');
      const nb=document.createElement('b');if(cls!=='nn'&&cls!=='sys')nb.textContent=name;if(REG_COL[name])nb.style.color=REG_COL[name];
      if(cls!=='sys')d.appendChild(nb);d.appendChild(document.createTextNode(msg));
      chatEl.appendChild(d);while(chatEl.children.length>6)chatEl.removeChild(chatEl.firstChild);
      if(T-lastSe>.22){lastSe=T;se('comment');}
    }
    function queueChat(raw){
      const m=raw.match(/^c(\d?):([^|]*)\|(.*)$/);if(!m)return;
      let name=m[2],need=m[1]===''?null:+m[1];const nn=name==='？';
      if(need==null)need=nn?2:0;
      if(rei<need&&!(offline&&need===0))return;
      if(CHAT_NAMES[name])name=CHAT_NAMES[name];
      chatQ.push({name,msg:m[3],cls:nn?'nn':''});
    }
    function pumpChat(dt){
      chatT-=dt*(skip?6:1);
      if(chatQ.length&&chatT<=0){const c=chatQ.shift();addChat(c.name,c.msg,c.cls);if(c.cls==='nn'&&stg()>=2&&!hd.mild){chatEl.classList.add('gl');later(()=>chatEl.classList.remove('gl'),500);}
        chatT=.45+Math.random()*.55;if(skip&&chatQ.length>5)chatQ.splice(0,chatQ.length-5);}
      if(phase==='play'||phase==='choice'||phase==='busy'){ambT-=dt;if(ambT<=0&&!chatQ.length&&!offline){ambient();ambT=Math.max(.9,3.2-hype*.25+Math.random()*1.6-(stg()>=2?.4:0));}}
    }
    function ambient(){
      const r=Math.random(),st=stg();
      if(st>=2&&r<.12+st*.05){addChat('',AMB.know[Math.random()*AMB.know.length|0],'nn');if(Math.random()<.55){const re=AMB.react[Math.random()*AMB.react.length|0];later(()=>addChat(re[0],re[1]),900+Math.random()*700);}return;}
      if(st>=1&&r<.28){addChat(AMB.oddNames[Math.random()*AMB.oddNames.length|0],AMB.odd[Math.random()*AMB.odd.length|0],'odd');return;}
      if(hype>=4&&r<.5){addChat(AMB.crowd[Math.random()*AMB.crowd.length|0],AMB.hype[Math.random()*AMB.hype.length|0],'hype');return;}
      if(r<.72){const n=Object.keys(AMB.reg)[Math.random()*4|0];const l=AMB.reg[n];addChat(n,l[Math.random()*l.length|0]);return;}
      addChat(AMB.crowd[Math.random()*AMB.crowd.length|0],AMB.msg[Math.random()*AMB.msg.length|0]);
    }

    // ── 演出 ──
    function fx(k){
      if(k==='glitch'){glT=.55;glAmp=hd.mild?.35:1.3;if(!hd.mild){boxEl.animate([{transform:'translateX(-3px)',filter:'hue-rotate(40deg)'},{transform:'translateX(3px)'},{transform:'none'}],{duration:260});}}
      else if(k==='tear'){glT=1.2;glAmp=hd.mild?.4:3;snd('static');if(!hd.mild)stage.animate([{filter:'contrast(1.6) saturate(0)'},{filter:'none'}],{duration:900});}
      else if(k==='flash'||k==='redflash'){if(hd.mild){glT=.3;glAmp=.3;return;}flashEl.style.background=k==='flash'?'#e8eaff':'#e83055';flashEl.animate([{opacity:k==='flash'?.85:.55},{opacity:0}],{duration:k==='flash'?420:650,easing:'ease-out'});snd('sting',.7);}
      else if(k==='shake'){if(hd.mild)return;stage.animate([{transform:'translate(0,0)'},{transform:'translate(-7px,3px)'},{transform:'translate(6px,-4px)'},{transform:'translate(-4px,2px)'},{transform:'translate(2px,-1px)'},{transform:'none'}],{duration:420});}
      else if(k==='thunder'){strike(1);}
    }
    function strike(big){lt=hd.mild?.35:1;later(()=>snd('thunder',big?1:.35),big?250:1100);}

    // ── 進行 ──
    const isChat=s=>typeof s==='string'&&/^c\d?:/.test(s);
    function step(){
      while(true){
        const top=stack[stack.length-1];
        if(!top){if(endKey&&phase!=='endcard'&&phase!=='done')showEnd();return;}
        if(top.i>=top.a.length){stack.pop();continue;}
        const s=top.a[top.i++];
        if(typeof s==='string'){
          if(isChat(s)){queueChat(s);continue;}
          const ty=s[0],tx=s.slice(2);showLine(ty,tx);
          while(isChat(top.a[top.i]))queueChat(top.a[top.i++]);
          return;
        }
        if(s.set)Object.assign(S,s.set);
        if(s.rain!=null){rainTarget=s.rain;SFX.ambient(s.rain,stg()*.012);}
        if(s.snd)snd(s.snd);
        if(s.face){faceO=s.face;faceT=5;}
        if(s.fx)fx(s.fx);
        if(s.choice){showChoices(s.choice,s.meta);return;}
        if(s.go){stack=[{a:story.nodes[s.go],i:0}];continue;}
        if(s.ending){decideEnding();continue;}
        if(s.bg){
          if(s.tr&&s.bg!==bg){tr={from:bg,type:s.tr,t:0,dur:s.tr==='glitch'?.7:s.tr==='wipe'?1.1:s.tr==='mosaic'?1.1:1.0};bg=s.bg;busy(tr.dur,'tr');snd(s.tr==='glitch'?'static':'page',.6);return;}
          bg=s.bg;continue;
        }
        if(s.act){showAct(s.act,s.title);return;}
        if(s.wait){busy(s.wait/1000,'wait');return;}
      }
    }
    function busy(sec,kind){phase='busy';busyT=sec;busyRate=skip?3:1;line=null;nextEl.classList.remove('on');}
    function showLine(ty,tx){
      phase='play';line={type:ty,text:tx,n:0};lineDone=false;autoT=0;skipT=0;
      const hid=story.hidden&&ty==='r';
      nameEl.className='hr-name'+(ty==='s'?' none':ty==='r'?(hid?' h':' r'):'');
      nameEl.textContent=ty==='d'?'だんのうら':ty==='r'?(hid?'📄 ――':'📄 投稿文'):'　';
      textEl.className='hr-text '+(hid?'h':ty);textEl.textContent='';nextEl.classList.remove('on');
      LOG.push({ty,tx,who:nameEl.textContent});
      if(CPS[hd.speed]>999||skip){line.n=tx.length;}
    }
    function advance(){
      if(overlay)return;
      if(phase==='play'&&line){if(line.n<line.text.length){line.n=line.text.length;return;}snd('tick',2);step();return;}
      if(phase==='busy'){busyRate=Math.max(busyRate,3.5);return;}
      if(phase==='endcard'){finishStory();return;}
    }
    function showChoices(list,meta){
      phase='choice';chOn=false;chList=list;chSel=-1;stage.classList.add('choosing');nextEl.classList.remove('on');
      if(skip)setSkip(false);
      chEl.innerHTML='<div class="hr-chq">― どう読む？ ―</div>';
      list.forEach((c,i)=>{const b=document.createElement('button');b.className='hr-ch';b.innerHTML=`<i>${i+1}</i><span>${esc(c.t)}</span>`;
        b.onclick=e=>{e.stopPropagation();pick(i);};b.onmouseenter=()=>sel(i);chEl.appendChild(b);later(()=>b.classList.add('in'),80+i*90);});
      later(()=>chEl.firstChild&&chEl.firstChild.classList.add('in'),30);
      snd('pick',.6);
      later(()=>{chOn=true;if(buf!=null&&typeof buf==='number'){const k=buf;buf=null;pick(k);}},80+list.length*90+200);
      // メタ演出：選択肢が書き換わる
      if(meta&&rei>=4)later(()=>{if(phase!=='choice')return;const sp=[...chEl.querySelectorAll('.hr-ch span')];const orig=sp.map(s=>s.textContent);sp.forEach(s=>s.textContent=list[0].t);if(!hd.mild){snd('static',.5);glT=.3;}later(()=>sp.forEach((s,i)=>s.textContent=orig[i]),900);},1400);
    }
    function sel(i){chSel=i;[...chEl.querySelectorAll('.hr-ch')].forEach((b,k)=>b.classList.toggle('sel',k===i));}
    function pick(i){
      if(phase!=='choice')return;if(!chOn){buf=i;return;}
      const c=chList[i];if(!c)return;chOn=false;
      const bs=[...chEl.querySelectorAll('.hr-ch')];bs.forEach((b,k)=>b.classList.add(k===i?'pick':'out'));se('decide');
      LOG.push({ty:'ch',tx:'▶ '+c.t});
      const st0=stg();hype+=c.h;rei=Math.max(0,rei+c.r);
      if(c.h>0){hearts+=c.h*(7+(Math.random()*6|0));if(c.h>=2){for(let k=0;k<c.h;k++)later(()=>addChat(AMB.crowd[Math.random()*AMB.crowd.length|0],AMB.hype[Math.random()*AMB.hype.length|0],'hype'),300+k*260);}}
      const st1=stg();if(st1>st0){later(()=>{fx('glitch');snd('sting',.5);},500);}
      SFX.ambient(rainTarget,st1*.012);
      stage.classList.toggle('r2',st1>=2);stage.classList.toggle('r3',st1>=3);
      later(()=>{chEl.innerHTML='';stage.classList.remove('choosing');phase='play';stack=[{a:story.nodes[c.go],i:0}];step();},420);
    }
    function decideEnding(){
      const key=rei>=6?'cursed':hype>=6?'good':'normal';endKey=key;
      const id=story.id+':'+key;endNew=!hd.ends[id];const wasOpen=hiddenOpen(hd);
      hd.ends[id]=1;hd.read[story.id]=1;hd.last=story.id;hd.plays++;
      justUnlocked=!wasOpen&&hiddenOpen(hd);
      if(key==='cursed'){offline=true;lvEl.textContent='OFF';$('.hr-live').style.background='#3a3048';}
      stack=[{a:story.nodes['end_'+key],i:0}];
    }
    function showAct(n,title){
      actNo=n;actTitle=title;updScore();
      const o=document.createElement('div');o.className='hr-ov hr-act';
      o.innerHTML=`<div class="a1">第${'一二三'[n-1]}幕</div><div class="a2">${esc(title)}</div><div class="a3"></div>`;
      stage.appendChild(o);LOG.push({ty:'act',tx:`第${'一二三'[n-1]}幕　${title}`});
      snd('act');busy(2.3,'act');o._kill=()=>o.remove();actEl=o;
    }
    let actEl=null;
    function endBusy(){
      if(tr){tr=null;}
      if(actEl){const o=actEl;actEl=null;o.style.transition='opacity .25s';o.style.opacity='0';later(()=>o.remove(),260);}
      phase='play';step();
    }
    function showEnd(){
      phase='endcard';stage.classList.add('ui-off');nextEl.classList.remove('on');
      const n=storyEnds(hd,story),tot=totalEnds(hd),all=STORIES.length*3;
      const o=document.createElement('div');o.className='hr-ov hr-end '+endKey;
      o.innerHTML=`<div class="e1">ENDING</div><div class="e2">${END_LABEL[endKey]}</div><div class="e3">「${esc(story.ends[endKey])}」${endNew?'<span class="new">NEW</span>':''}</div>`+
        `<div class="e4">${esc(story.title)}　回収 ${n}/3<br>全エンディング ${tot}/${all}（${Math.round(tot/all*100)}%）`+
        (!story.hidden?`<span class="fn">――投稿の末尾に、送り主の知らない一文。<br>「三十日目まで、見ています」</span>`:'')+
        (justUnlocked?`<br><span style="color:var(--gd)">◆ 最終話「？？？」が解放されました</span>`:'')+`</div><div class="e5">▶ タップで配信を終える</div>`;
      o.onclick=e=>{e.stopPropagation();finishStory();};
      stage.appendChild(o);
      if(endKey==='good')se('rank');else if(endKey==='cursed'){if(!hd.mild)se('ghost');snd('sting',.6);}else se('notif');
      mg.setScore(`📖 ${esc(story.short)}　<span style="color:var(--gd)">END ${tot}/${all}</span>`);
    }
    function finishStory(){if(phase==='done')return;phase='done';se('decide');mg.end(endKey);}

    // ── オーバーレイ ──
    function closeOv(){if(overlay){overlay.remove();overlay=null;se('back');}}
    function openOv(html,cls){if(overlay)overlay.remove();const o=document.createElement('div');o.className='hr-ov dim '+(cls||'');o.innerHTML=html;o.onclick=e=>e.stopPropagation();stage.appendChild(o);overlay=o;se('btn');return o;}
    function openLog(){
      const rows=LOG.slice(-80).map(e=>e.ty==='ch'?`<div class="hr-log-e ch">${esc(e.tx)}</div>`:e.ty==='act'?`<div class="hr-log-e act">${esc(e.tx)}</div>`:e.ty==='s'?`<div class="hr-log-e s">${esc(e.tx)}</div>`:`<div class="hr-log-e ${e.ty}"><b>${esc(e.who)}</b>${esc(e.tx)}</div>`).join('')||'<div class="hr-note">まだ何もありません。</div>';
      const o=openOv(`<div class="hr-panel"><div class="hr-ph">BACKLOG<button class="hr-btn sm" data-x>閉じる</button></div><div class="hr-pb">${rows}</div></div>`);
      o.querySelector('[data-x]').onclick=closeOv;const pb=o.querySelector('.hr-pb');pb.scrollTop=pb.scrollHeight;
    }
    function openCfg(){
      const o=openOv(`<div class="hr-panel"><div class="hr-ph">SETTINGS<button class="hr-btn sm" data-x>閉じる</button></div><div class="hr-pb">
<div class="hr-row"><span>文字の速さ</span><div class="hr-seg" data-seg="speed">${SPEED_L.map((l,i)=>`<button class="hr-btn sm${hd.speed===i?' on':''}" data-v="${i}">${l}</button>`).join('')}</div></div>
<div class="hr-row"><span>怖さ控えめ</span><div class="hr-seg" data-seg="mild"><button class="hr-btn sm${!hd.mild?' on':''}" data-v="0">OFF</button><button class="hr-btn sm${hd.mild?' on':''}" data-v="1">ON</button></div></div>
<div class="hr-note">怖さ控えめ：画面のフラッシュ・揺れ・急な大きい音をなくし、ノイズ演出を弱めます。</div>
<div class="hr-row"><button class="hr-btn sm" data-tut style="flex:1">遊び方</button><button class="hr-btn sm" data-end style="flex:1">エンディング一覧</button></div></div></div>`);
      o.querySelector('[data-x]').onclick=closeOv;
      o.querySelectorAll('[data-seg]').forEach(sg=>sg.querySelectorAll('button').forEach(b=>b.onclick=()=>{const v=+b.dataset.v;if(sg.dataset.seg==='speed')hd.speed=v;else hd.mild=!!v;sg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));se('notif');updTitle();}));
      o.querySelector('[data-tut]').onclick=()=>openTut();o.querySelector('[data-end]').onclick=()=>openEnds();
    }
    function openTut(after){
      const o=openOv(`<div class="hr-panel"><div class="hr-ph">HOW TO PLAY<button class="hr-btn sm" data-x>${after?'はじめる':'閉じる'}</button></div><div class="hr-pb hr-tut"><ul>
<li><b>TAP</b><span>画面をタップ（Enter／Space）で読み進めます。文字の途中でタップすると、一気に表示。</span></li>
<li><b>1-3</b><span>選択肢はタップか数字キーで。どう読むかで、配信の空気が変わります。</span></li>
<li><b>CHAT</b><span>コメント欄は生きています。盛り上がれば神回に。……ただ、話に深入りしすぎると、名前のないコメントが増えていきます。</span></li>
<li><b>LOG</b><span>読み返し。AUTO＝自動送り、SKIP＝早送り（選択肢で止まります）。⚙で文字の速さと「怖さ控えめ」。</span></li>
<li><b>END</b><span>1話につきエンディングは3つ。すべての投稿を読むと……。</span></li></ul></div></div>`);
      o.querySelector('[data-x]').onclick=()=>{hd.tut=1;closeOv();if(after)after();};
    }
    function openEnds(){
      const tot=totalEnds(hd),all=STORIES.length*3,ho=hiddenOpen(hd);
      const rows=STORIES.map(s=>{const lock=s.hidden&&!ho,n=storyEnds(hd,s);
        return `<div class="hr-es"><div class="hr-es-h">${lock?'？？？':esc(s.title)}${hd.read[s.id]?'':' <i style="font-style:normal;color:var(--gd);font-size:.6rem">未読</i>'}<span>${Math.round(n/3*100)}%</span></div><div class="hr-es-bar"><i style="width:${n/3*100}%"></i></div>`+
          ENDK.map((k,j)=>{const got=hd.ends[s.id+':'+k];return `<div class="hr-es-e${got?'':' lock'}"><em class="${'gnc'[j]}">${END_LABEL[k]}</em>${got?'「'+esc(s.ends[k])+'」':'？？？'}</div>`;}).join('')+'</div>';}).join('');
      const o=openOv(`<div class="hr-panel"><div class="hr-ph">ENDINGS ${tot}/${all}（${Math.round(tot/all*100)}%）<button class="hr-btn sm" data-x>閉じる</button></div><div class="hr-pb">${rows}</div></div>`);
      o.querySelector('[data-x]').onclick=closeOv;
    }

    // ── タイトル・投稿 ──
    let titleEl=null;
    function updTitle(){if(!titleEl)return;const tot=totalEnds(hd),all=STORIES.length*3;const eb=titleEl.querySelector('[data-end]');if(eb)eb.textContent=`エンディング一覧 ${Math.round(tot/all*100)}%`;}
    function showTitle(){
      phase='title';stage.classList.add('ui-off');
      const o=document.createElement('div');o.className='hr-ov hr-title';
      const tot=totalEnds(hd),all=STORIES.length*3;
      const drips=[18,37,61,79].map((l,i)=>`<i class="drip" style="left:${l}%;animation-delay:${i*1.3}s"></i>`).join('');
      o.innerHTML=`<div class="hr-logo">${drips}<div class="k1">KAIDAN STREAM</div><div class="k2">怪談配信</div><div class="k3">実録編</div><div class="k4">― リスナー投稿・実録怪談 朗読配信 ―</div></div>
<div class="hr-menu"><div class="hr-next-s">今夜の投稿：<em>${story.hidden?'差出人のない投稿':esc(story.title)}</em>${hd.read[story.id]?'（再読）':''}</div>
<button class="hr-btn main" data-go>▶ 配信を始める</button>
<div class="two"><button class="hr-btn" data-end>エンディング一覧 ${Math.round(tot/all*100)}%</button><button class="hr-btn" data-cfg>⚙ 設定</button></div>
<div class="hr-press">TAP START ・ ENTER</div></div>`;
      o.querySelector('[data-go]').onclick=e=>{e.stopPropagation();titleGo();};
      o.querySelector('[data-end]').onclick=e=>{e.stopPropagation();openEnds();};
      o.querySelector('[data-cfg]').onclick=e=>{e.stopPropagation();openCfg();};
      o.onclick=e=>e.stopPropagation();
      stage.appendChild(o);titleEl=o;
      mg.setScore('👻 怪談配信・実録編');mg.setTimer('STANDBY');
    }
    function titleGo(){if(phase!=='title'||overlay)return;se('decide');try{AU.init();}catch(e){}SFX.ambient(1,0);if(!hd.tut){openTut(()=>showLetter());return;}showLetter();}
    function showLetter(){
      if(titleEl){const t=titleEl;titleEl=null;t.style.transition='opacity .4s';t.style.opacity='0';later(()=>t.remove(),420);}
      phase='letter';snd('page');
      const o=document.createElement('div');o.className='hr-ov dim';
      const hid=story.hidden;
      o.innerHTML=`<div class="hr-letter${hid?' hid':''}"><div class="no">LISTENER SUBMISSION　No.${story.no}</div><div class="tt">${esc(story.title)}</div><div class="fr">${hid?'差出人：　　　　　':'差出人：'+esc(story.from)}</div><div class="bl">${esc(story.blurb)}</div><div class="st"><span>既読 ${baseStories().filter(s=>hd.read[s.id]).length}/${baseStories().length}</span><span>回収 ${storyEnds(hd,story)}/3</span></div><div class="go">▶ タップで朗読をはじめる</div></div>`;
      o.onclick=e=>{e.stopPropagation();if(phase!=='letter')return;o.style.transition='opacity .35s';o.style.opacity='0';later(()=>o.remove(),360);beginStory();};
      stage.appendChild(o);letterEl=o;
    }
    let letterEl=null;
    function beginStory(){
      phase='play';stage.classList.remove('ui-off');startedAt=T;ttlEl.textContent='実録怪談｜'+story.short;updScore();
      se('live');addChat('','🔴 配信を開始しました','sys');
      stack=[{a:story.nodes.start,i:0}];step();
    }
    function updScore(){mg.setScore(`📖 ${esc(story.short)}${actNo?`　<span style="color:var(--tx-d)">第${'一二三'[actNo-1]}幕</span>`:''}`);}
    function setSkip(v){skip=v;tgEls.skip.classList.toggle('on',v);modeEl.textContent=v?'SKIP ▶▶':hd.auto?'AUTO ▶':'';}
    function setAuto(v){hd.auto=v;tgEls.auto.classList.toggle('on',v);modeEl.textContent=skip?'SKIP ▶▶':v?'AUTO ▶':'';}
    setAuto(hd.auto);

    // ── 入力 ──
    stage.addEventListener('click',e=>{if(e.target.closest('button'))return;if(phase==='title'){return;}if(phase==='letter')return;advance();});
    Object.entries(tgEls).forEach(([k,b])=>b.addEventListener('click',e=>{e.stopPropagation();
      if(k==='log'){openLog();}else if(k==='cfg'){openCfg();}
      else if(k==='auto'){setAuto(!hd.auto);se('notif');}
      else if(k==='skip'){setSkip(!skip);se('notif');}}));
    mg.onKey(e=>{
      if(e.type!=='keydown')return;const k=e.key;
      if(k==='Escape'){if(overlay){closeOv();e.preventDefault();}return;}
      if(overlay){if(k==='Enter'||k===' '){const x=overlay.querySelector('[data-x]');if(x)x.click();e.preventDefault();}return;}
      if(k==='Enter'||k===' '){e.preventDefault();if(e.repeat&&phase!=='play')return;
        if(phase==='title')titleGo();else if(phase==='letter')letterEl&&letterEl.click();else if(phase==='choice'){if(chSel>=0)pick(chSel);}else advance();return;}
      if(/^[1-3]$/.test(k)&&phase==='choice'){pick(+k-1);return;}
      if(phase==='choice'&&(k==='ArrowDown'||k==='ArrowUp')){e.preventDefault();const n=chList.length;sel(chSel<0?0:(chSel+(k==='ArrowDown'?1:n-1))%n);return;}
      if(k==='a'||k==='A')tgEls.auto.click();else if(k==='s'||k==='S')tgEls.skip.click();else if(k==='l'||k==='L')tgEls.log.click();
    });

    // ── 毎フレーム ──
    mg.every(()=>{
      if(phase==='title'||phase==='letter')return;
      const sec=Math.max(0,T-startedAt|0);mg.setTimer((offline?'OFF ':'LIVE ')+String(sec/60|0).padStart(2,'0')+':'+String(sec%60).padStart(2,'0'));
      let v=18+Math.min(260,Math.round((gs.followers||0)*.12))+hype*21+Math.round(Math.sin(T*.7)*4+Math.random()*5);
      if(S.viewers1)v=1;else if(stg()>=3&&Math.random()<.25)v=[13,30,1][Math.random()*3|0];
      if(offline&&!S.viewers1)v=0;
      viewEl.textContent='👁 '+v;heartEl.textContent='♥ '+(hearts+Math.round(T*.15));
    },1000);
    mg.loop(dt=>{
      dt=Math.max(0,dt);T+=dt;
      // 雷
      ltNext-=dt;if(ltNext<=0){ltNext=9+Math.random()*14;if(rainI>.4&&OUTDOOR[bg]&&phase!=='title'){lt=hd.mild?.35:.9;if(!hd.mild)later(()=>snd('thunder',.3),900+Math.random()*900);}else if(rainI>.4&&phase==='title'){lt=.6;}}
      if(lt>0){const ph=lt;lt=Math.max(0,lt-dt*(lt>.6?1.4:2.2));if(ph>.75&&lt<=.75&&Math.random()<.6)lt=.95;}
      rainI=lerp(rainI,rainTarget,Math.min(1,dt*.8));
      for(const d of drops){d.y+=d.v*dt;d.x-=d.v*dt*.16;if(d.y>H){d.y=-20;d.x=Math.random()*W*1.2;}}
      if(glT>0)glT-=dt;
      if(stg()>=3&&!hd.mild){microT-=dt;if(microT<=0){microT=2+Math.random()*4;glT=Math.max(glT,.12);glAmp=.8;}}
      if(faceT>0){faceT-=dt;if(faceT<=0)faceO=null;}
      if(S.fig&&(S._figT||0)<1)S._figT=(S._figT||0)+dt*.8;
      // 遷移・待ち
      if(tr)tr.t+=dt*busyRate;
      if(phase==='busy'){busyT-=dt*busyRate;if(busyT<=0){busyT=0;endBusy();}}
      // 文字送り
      if(phase==='play'&&line){
        const L=line.text.length;
        if(line.n<L){const before=line.n|0;line.n=Math.min(L,line.n+dt*CPS[hd.speed]*(skip?20:1));const now=line.n|0;
          if(now!==before){let s=line.text.slice(0,now);if(stg()>=3&&line.type==='r'&&now<L&&Math.random()<.35)s+='▓';textEl.textContent=s;if(!skip&&line.type!=='s'&&now%4===0)snd('tick');}
        }else if(!lineDone){lineDone=true;textEl.textContent=line.text;nextEl.classList.add('on');}
        else{
          if(skip){skipT+=dt;if(skipT>.08)advance();}
          else if(hd.auto&&!overlay){autoT+=dt;if(autoT>1.1+L*.055*(hd.speed===0?1.3:1))advance();}
        }
      }
      pumpChat(dt);
      draw();
    });

    // ── 開始 ──
    showTitle();

    // テスト用フック（ゲームには影響しない）
    body._hr={state:()=>({phase,story:story.id,hype,rei,stage:stg(),endKey,bg,line:line&&line.text,choices:phase==='choice'?chList.map(c=>c.t):null,overlay:!!overlay,offline}),
      setStory(id){if(phase==='title'){const s=STORIES.find(x=>x.id===id);if(s){story=s;titleEl&&titleEl.remove();titleEl=null;showTitle();}}},
      go:()=>titleGo(),letter:()=>letterEl&&letterEl.click(),adv:()=>advance(),pick:i=>{chOn=true;pick(i);},fin:()=>finishStory(),stories:STORIES.map(s=>s.id),
      scene(id,set,r,st){if(titleEl){titleEl.remove();titleEl=null;}if(st){story=STORIES.find(x=>x.id===st)||story;}bg=id;tr=null;S=Object.assign({},set||{});rei=r||0;phase='busy';busyT=9999;stage.classList.remove('ui-off');}};

    function cleanup(){try{ro.disconnect();}catch(e){}SFX.stop();}
    if(typeof mg.onEnd==='function')mg.onEnd(cleanup);
    return {result(reason){
      cleanup();
      if(reason==='quit'&&endKey)reason=endKey;
      const bar=v=>'■'.repeat(clamp(v,0,9))+'□'.repeat(9-clamp(v,0,9));
      const tot=totalEnds(hd),all=STORIES.length*3;
      if(reason==='quit'){
        return {title:'👻 配信を途中で切り上げた',summary:`「${esc(story.title)}」は、途中まで読んだところで配信を閉じた。`,fx:{fatigue:2},time:20,log:null,cutin:null};
      }
      const head=`今夜の投稿：「${esc(story.title)}」<br>エンディング：<span class="${reason==='cursed'?'down':'up'}">${END_LABEL[reason]}「${esc(story.ends[reason])}」</span>${endNew?' NEW':''}<br>盛り上がり <span class="up">${bar(hype)}</span><br>霊障　　　 <span class="down">${bar(rei)}</span><br>エンディング回収 ${tot}/${all}`+(justUnlocked?'<br><span class="up">最終話が解放された</span>':'');
      if(reason==='good')return {title:'👻 神回！ 実録怪談配信',summary:head,fx:{streamPop:6,followers:12,mental:-1,fatigue:6},time:60,sp:1,
        log:`実録怪談「${story.title}」の朗読配信が神回になった。`,cutin:['win','……神回だった。投稿者さん、ありがとう。']};
      if(reason==='cursed')return {title:'👻 ……何かを、呼んでしまった',summary:head+'<br>配信は切ったはずなのに、名前のないコメントが残っている。',fx:{followers:8,mental:-7,fatigue:8},time:60,
        log:`実録怪談「${story.title}」を読んだ夜、名前のないコメントが部屋のことを書いていた。`,cutin:['fear','……配信、切ったよな？　まだ、コメントが流れてる。'],
        after(){gs.factoryNetaAvail=true;gs.factoryNetaType='実録怪談の続き';}};
      return {title:'👻 実録怪談配信 おつかれさま',summary:head,fx:{streamPop:3,followers:5,fatigue:6},time:60,
        log:`実録怪談「${story.title}」を朗読配信した。`,cutin:null};
    }};
  },
});
})();
