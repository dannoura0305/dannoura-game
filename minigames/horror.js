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

// ── 団地のエレベーター ──
SC.e_danchi={
  bake(g,w,h,R){
    rect(g,0,0,w,h,LG(g,0,0,0,h*.6,[[0,'#0a0918'],[1,'#191630']]));
    const bx=w*.08,by=h*.1,bw=w*.66,bh=h*.48;
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
    rect(g,0,h*.58,w,h*.42,LG(g,0,h*.58,0,h,[[0,'#121020'],[1,'#07060c']]));texFill(g,TX.conc,.5,0,h*.58,w,h*.42);
    g.strokeStyle='#08070e';g.lineWidth=2;for(let i=0;i<4;i++){const cx=w*(.14+i*.09),cy=h*.6;g.beginPath();g.arc(cx,cy,h*.018,0,TAU);g.arc(cx+w*.05,cy,h*.018,0,TAU);g.moveTo(cx,cy);g.lineTo(cx+w*.025,cy-h*.025);g.lineTo(cx+w*.05,cy);g.stroke();}
    rect(g,w*.86,h*.3,w*.012,h*.3,'#0c0a14');
    for(let i=0;i<4;i++){g.fillStyle='rgba(120,110,180,.08)';g.beginPath();g.ellipse(R()*w,h*(.66+R()*.25),w*(.1+R()*.1),h*.01,0,0,TAU);g.fill();}
  },
  draw(g,w,h,t,S,E){
    const bx=w*.08,by=h*.1,bw=w*.66,bh=h*.48,ex=bx+bw+2,ew=w*.1;
    const cab=(Math.sin(t*.35)*.5+.5)*4;const cy=by+bh*(.08+(4-cab)*.19);
    rect(g,ex+ew*.3,cy,ew*.4,bh*.07,'rgba(200,220,255,.75)');glow(g,ex+ew*.5,cy+bh*.035,ew*1.2,'190,210,255',.22);
    glow(g,w*.865,h*.3,w*.12,'200,230,255',.35);
    g.save();g.globalCompositeOperation='lighter';g.fillStyle=LG(g,0,h*.3,0,h*.62,[[0,'rgba(200,230,255,.16)'],[1,'rgba(200,230,255,0)']]);poly(g,[[w*.86,h*.3],[w*.872,h*.3],[w*.98,h*.62],[w*.74,h*.62]]);g.fill();g.restore();
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
    const fl=Math.sin(t*15)>.9?.3:1;glow(g,vx,vy-h*.06,w*.06,'200,210,255',.5*fl);rect(g,vx-3,vy-h*.065,6,3,'#dfe4ff');
    // 傘
    const n=S.fig?9:3;for(let i=0;i<n;i++){const u=.25+((i*.37)%1)*.65,x=lerp(i%2?w*.1:w*.7,vx,u),y=lerp(h*.9,vy+h*.05,u),hh=lerp(h*.2,h*.03,u);
      g.fillStyle='#040308';poly(g,[[x-hh*.06,y-hh],[x+hh*.06,y-hh],[x+hh*.02,y],[x-hh*.02,y]]);g.fill();rect(g,x-.5,y-hh*1.12,1.2,hh*.14,'#040308');
      g.fillStyle='rgba(140,160,230,.1)';g.beginPath();g.ellipse(x,y+2,hh*.12,hh*.02,0,0,TAU);g.fill();}
    if(S.fig){const a=.6+.3*Math.sin(t*.8);g.save();g.globalAlpha=a;figure(g,'woman',vx+w*.01,vy+h*.07,h*.13,{c:'#020105',umbrella:'open'});g.restore();}
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
    rect(g,wx,wy,ww,wh,LG(g,0,wy,0,wy+wh,[[0,'#2a3254'],[.6,'#161c34'],[1,'#0c1020']]));
    skyline(g,wx,wy+wh*.5,ww,wh*.5,R,.1,'#0a0d1a');
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
    if(S.child===2){g.globalAlpha=.85;figure(g,'child',wx+ww*.55,wy+wh*1.25,wh*.95,{c:'#05060e'});g.globalAlpha=1;
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
    if(S.fig){const z=S._z=lerp(S._z==null?(S.z||0):S._z,S.z||0,.03);const sc=[.17,.27,.42,.72][Math.min(3,Math.round(z))]*0+lerp(.17,.8,z/3);
      const fx=vx+w*.02*z+Math.sin(t*37)*(z>2?2:0.5),fy=lerp(vy+h*.04,h*.98,Math.pow(z/3,1.3));
      g.save();g.globalAlpha=.9;if(Math.sin(t*13)>.92)g.globalAlpha=.3;figure(g,'hood',fx,fy,h*sc,{c:'#0a0e0c'});g.restore();}
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
