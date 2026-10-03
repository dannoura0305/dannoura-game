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
.hr-chat{position:absolute;left:7px;width:76%;bottom:calc(var(--hb) + 6px);height:34%;display:flex;flex-direction:column;justify-content:flex-end;gap:3px;pointer-events:none;z-index:2;-webkit-mask-image:linear-gradient(transparent,#000 30%);mask-image:linear-gradient(transparent,#000 30%);transition:opacity .4s;}
.hr-stage.choosing .hr-chat{opacity:.35;}
.hr-msg{font-family:var(--dot);font-size:.72rem;line-height:1.45;color:#ece4ff;text-shadow:0 0 3px #000,0 1px 2px #000;padding:2px 7px;background:rgba(6,4,16,.5);border-left:2px solid rgba(138,82,212,.5);border-radius:0 3px 3px 0;align-self:flex-start;max-width:100%;animation:hr-in .32s ease-out;word-break:break-all;}
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
.hr-title{justify-content:space-between;padding:56px 18px 20px;}
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
.hr-end{background:rgba(3,2,8,.78);cursor:pointer;}
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
@keyframes hr-logo{0%,90%,100%{transform:none;opacity:1}91%{transform:translateX(-5px) skewX(8deg);opacity:.7}92%{transform:translateX(4px);clip-path:inset(30% 0 40% 0)}93%{transform:none;clip-path:none}}
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
