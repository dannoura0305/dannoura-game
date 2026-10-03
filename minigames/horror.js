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
    rect(g,0,0,w,h,'#040308');
    const vx=w*.5,vy=h*.62,n=11;
    poly(g,[[0,0],[w*.24,0],[vx-w*.07,vy],[0,h*.75]]);g.fillStyle=LG(g,0,0,w*.4,0,[[0,'#16142a'],[1,'#0a0914']]);g.fill();texPoly(g,TX.conc,.7,[[0,0],[w*.24,0],[vx-w*.07,vy],[0,h*.75]]);
    poly(g,[[w,0],[w*.76,0],[vx+w*.07,vy],[w,h*.75]]);g.fillStyle=LG(g,w,0,w*.6,0,[[0,'#16142a'],[1,'#0a0914']]);g.fill();texPoly(g,TX.conc,.7,[[w,0],[w*.76,0],[vx+w*.07,vy],[w,h*.75]]);
    for(let i=0;i<n;i++){const f0=i/n,f1=(i+1)/n,e=f=>1-Math.pow(1-f,1.6);
      const ya=lerp(h*.75,vy,e(f0)),yb=lerp(h*.75,vy,e(f1)),xa=lerp(w*.08,w*.43,e(f0)),xb=lerp(w*.08,w*.43,e(f1));
      const tread=(ya-yb)*.55,dk=1-i/n;
      rect(g,xa,yb+tread,w-xa*2,ya-yb-tread,`rgb(${12*dk+4|0},${11*dk+3|0},${22*dk+6|0})`);
      rect(g,xb,yb,w-xb*2,tread,`rgb(${30*dk+5|0},${27*dk+4|0},${44*dk+8|0})`);
      rect(g,xb,yb,w-xb*2,1.5,`rgba(232,184,48,${.18*dk})`);}
    rect(g,0,h*.75,w,h*.25,'#0d0b16');texFill(g,TX.conc,.5,0,h*.75,w,h*.25);
    rect(g,w*.3,h*.2,w*.4,2,'rgba(0,0,0,.4)');
    g.strokeStyle='#2a2638';g.lineWidth=3;g.beginPath();g.moveTo(w*.06,h*.55);g.lineTo(vx-w*.09,vy-h*.08);g.stroke();g.beginPath();g.moveTo(w*.94,h*.55);g.lineTo(vx+w*.09,vy-h*.08);g.stroke();
    rect(g,w*.08,h*.1,w*.12,h*.05,'#2a2410');g.font=`bold ${h*.022}px ${FD}`;g.fillStyle='#d8b830';g.fillText('立入禁止',w*.09,h*.135);
  },
  draw(g,w,h,t,S,E){
    const vx=w*.5,vy=h*.62;
    if(S.light){const sw=Math.sin(t*1.3)*.15,ix=vx+sw*w*.1;
      glow(g,ix,vy+4,w*.2,'230,235,255',.5+(S.fig?.3:0));
      g.save();g.globalCompositeOperation='lighter';g.fillStyle=LG(g,0,vy,0,h*.2,[[0,'rgba(230,235,255,.22)'],[1,'rgba(230,235,255,0)']]);poly(g,[[ix-3,vy],[ix+3,vy],[ix+w*.25+sw*w,h*.18],[ix-w*.25+sw*w,h*.18]]);g.fill();g.restore();}
    if(S.fig){g.save();g.globalAlpha=Math.min(1,(S._figT||0));figure(g,'worker',vx,vy+h*.005,h*.16,{c:'#020105',rim:'rgba(200,210,255,.6)'});g.restore();glow(g,vx+h*.04,vy-h*.09,h*.06,'255,255,255',.9);}
    fogBand(g,w,h,t,vy-h*.08,h*.12,'60,60,110',.2);
  }
};
SC.f_office={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,0,h,[[0,'#16182a'],[1,'#0b0c16']]));texFill(g,TX.conc,.4,0,0,w,h);
    // 朝の窓
    const wx=w*.08,wy=h*.06,ww=w*.5,wh=h*.28;rect(g,wx,wy,ww,wh,LG(g,0,wy,0,wy+wh,[[0,'#4a5270'],[1,'#2a3048']]));
    skyline(g,wx,wy+wh*.45,ww,wh*.55,R,.0,'#1c2034');
    g.strokeStyle='#121420';g.lineWidth=5;g.strokeRect(wx,wy,ww,wh);for(let i=1;i<3;i++){g.beginPath();g.moveTo(wx+ww*i/3,wy);g.lineTo(wx+ww*i/3,wy+wh);g.stroke();}
    // ロッカー
    for(let i=0;i<3;i++){const lx=w*.66+i*w*.105;rect(g,lx,h*.04,w*.1,h*.44,'#1e2234');texFill(g,TX.brush,.6,lx,h*.04,w*.1,h*.44);rect(g,lx+w*.07,h*.22,3,h*.03,'#4a4e66');for(let k=0;k<3;k++)rect(g,lx+w*.02,h*.07+k*5,w*.06,2,'#0e101a');}
    // ホワイトボード
    rect(g,w*.1,h*.37,w*.36,h*.1,'#c8ccd8');g.strokeStyle='#5a6a9a';g.lineWidth=1;for(let i=0;i<4;i++){g.beginPath();g.moveTo(w*.12,h*.39+i*h*.018);g.lineTo(w*.12+w*(.12+R()*.18),h*.39+i*h*.018);g.stroke();}
    // 机と点検表
    poly(g,[[0,h*.5],[w,h*.5],[w,h],[0,h]]);g.fillStyle=LG(g,0,h*.5,0,h,[[0,'#3a3040'],[1,'#1a1420']]);g.fill();texFill(g,TX.wood,.55,0,h*.5,w,h*.5);
    g.save();g.translate(w*.5,h*.6);g.rotate(-.05);
    const pw=w*.62,ph=h*.33;rect(g,-pw/2-6,-ph/2-6,pw+12,ph+12,'#2a2230');rect(g,-pw/2,-ph/2,pw,ph,'#d8d2c0');texFill(g,TX.conc,.18,-pw/2,-ph/2,pw,ph);
    rect(g,-pw*.12,-ph/2-10,pw*.24,12,'#8890a0');
    g.fillStyle='#333';g.font=`bold ${ph*.07}px ${FS}`;g.fillText('巡回点検表　第三工場',-pw*.45,-ph*.36);
    const rows=['ボイラー室','コンプレッサー','冷却塔','排水ポンプ','受変電','配電盤','空調機','屋上受水槽'];
    g.font=`${ph*.045}px ${FS}`;
    for(let i=0;i<8;i++){const yy=-ph*.27+i*ph*.075;g.strokeStyle='rgba(60,60,80,.4)';g.beginPath();g.moveTo(-pw*.46,yy+ph*.02);g.lineTo(pw*.46,yy+ph*.02);g.stroke();g.fillStyle='#555';g.fillText(`No.${i+5>12?'':''}${i+5}　${rows[i]}`,-pw*.44,yy);g.fillStyle='rgba(90,90,90,.75)';g.fillText('異常なし',pw*.12,yy);}
    g.restore();
  },
  draw(g,w,h,t,S,E){
    glassRain(g,w*.08,h*.06,w*.5,h*.28,t,5,.2);
    const fl=Math.sin(t*19)>.97?.5:1;rect(g,w*.3,0,w*.4,5,'#cfd6ff');glow(g,w*.5,h*.02,w*.5,'200,210,255',.14*fl);
    if(S.paper){g.save();g.translate(w*.5,h*.6);g.rotate(-.05);const pw=w*.62,ph=h*.33,yy=-ph*.27+8*ph*.075;
      g.font=`${ph*.05}px ${FS}`;g.fillStyle='#1a2a8a';g.fillText('No.13　地下ピット',-pw*.44,yy);
      g.font=`bold ${ph*.055}px ${FS}`;g.fillStyle=S.paper>1?'#c01830':'#1a2a8a';g.fillText(S.paper>1?'三十日目':'異常なし',pw*.12,yy);
      g.strokeStyle='rgba(26,42,138,.8)';g.beginPath();g.moveTo(-pw*.46,yy+ph*.02);g.lineTo(pw*.46,yy+ph*.02);g.stroke();
      g.globalCompositeOperation='multiply';g.fillStyle=`rgba(255,220,120,${.4+.1*Math.sin(t*3)})`;g.fillRect(-pw*.46,yy-ph*.055,pw*.92,ph*.075);g.restore();}
  }
};
function fogBand(g,w,h,t,y,hh,rgb,a){
  g.save();g.globalCompositeOperation='lighter';
  for(let i=0;i<4;i++){const x=((t*(8+i*5)+i*w*.37)%(w*1.6))-w*.3,yy=y+Math.sin(t*.3+i)*hh*.2+i*hh*.15;g.fillStyle=RG(g,x,yy,0,w*.45,[[0,`rgba(${rgb},${a})`],[1,`rgba(${rgb},0)`]]);g.fillRect(x-w*.45,yy-hh,w*.9,hh*2);}
  g.restore();
}
