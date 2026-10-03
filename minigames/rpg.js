// ══════════════════════════════════════════════════════════
// ストーリーRPG「壇ノ浦夢譚」
// 配信を終えて眠ったあと、だんのうらは夜の壇ノ浦の海の底──沈んだ都の夢を見る。
// 少女の霊「ミナモ」に導かれ、現実で失いかけている五つの灯
// （声・手・約束・眠り・名前）を、一晩に一章ずつ取り戻していく。
//
// 進行は gs.rpg に保存する（JSON化できる素のオブジェクト）。
//   {v, cleared(クリア済み章数), lastDay(最後にクリアした日), lv, exp,
//    items:{shell,ramune}, flags:{選択の記録}, endings:{見たエンド}, ending(正史のエンド)}
// 章Nは、章N-1をクリアした翌日以降に遊べる。全章クリア後は報酬なしで見返せる。
// ══════════════════════════════════════════════════════════
addMinigameStyle('rpg',`
.mg-rpg{padding:0;}
.rpg-root{position:absolute;inset:0;overflow:hidden;background:#02040b;color:var(--tx-b);font-family:var(--serif);-webkit-tap-highlight-color:transparent;touch-action:manipulation;user-select:none;-webkit-user-select:none;}
.rpg-cv{position:absolute;left:0;top:0;display:block;}
.rpg-ui{position:absolute;inset:0;pointer-events:none;}
.rpg-ui>*{pointer-events:auto;}
.rpg-hide{display:none!important;}
@keyframes rpgUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes rpgBlink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes rpgPulse{0%,100%{transform:scale(.8);opacity:.75}50%{transform:scale(1.15);opacity:1}}
@keyframes rpgGlow{0%,100%{text-shadow:0 0 14px rgba(0,232,200,.55),0 0 36px rgba(138,82,212,.45)}50%{text-shadow:0 0 22px rgba(0,232,200,.85),0 0 50px rgba(138,82,212,.7)}}
/* SFC風ウィンドウ：二重線の枠＋深い夜色のグラデーション */
.rpg-win,.rpg-box{background:linear-gradient(180deg,rgba(28,24,84,.95) 0%,rgba(14,11,48,.96) 55%,rgba(7,6,26,.97) 100%);border:2px solid #e6e0ff;border-radius:7px;box-shadow:0 0 0 2px #120c34,inset 0 0 0 2px rgba(138,82,212,.75),inset 0 0 22px rgba(0,232,200,.08),0 8px 22px rgba(0,0,0,.6);}
.rpg-box{position:absolute;left:8px;right:8px;bottom:8px;min-height:128px;display:flex;gap:10px;padding:16px 12px 18px;cursor:pointer;animation:rpgUp .22s ease;}
.rpg-plate{position:absolute;left:12px;top:-15px;padding:3px 12px 2px;font-family:var(--dot);font-size:.74rem;letter-spacing:.14em;color:#fff;background:linear-gradient(180deg,#3a2c8a,#1c1450);border:2px solid #e6e0ff;border-radius:4px;box-shadow:0 0 0 2px #120c34;white-space:nowrap;}
.rpg-por{flex:none;width:76px;height:76px;border-radius:4px;overflow:hidden;border:2px solid #cfc6f5;box-shadow:0 0 0 1px #120c34,0 0 12px rgba(138,82,212,.35);background:#0b0a1e;}
.rpg-por canvas{display:block;width:100%;height:100%;}
.rpg-tx{flex:1;min-width:0;}
.rpg-text{font-size:.9rem;line-height:1.85;color:#f2eeff;white-space:pre-wrap;word-break:break-word;min-height:3.7em;text-shadow:1px 1px 0 #0a0620;}
.rpg-box.nar .rpg-text{color:#cfc6ee;}
.rpg-box.mina .rpg-plate{background:linear-gradient(180deg,#126a7a,#08343e);color:#cffcff;}
.rpg-box.kid .rpg-plate{background:linear-gradient(180deg,#8a6a14,#4a3606);color:#fff3c8;}
.rpg-box.sea .rpg-plate,.rpg-box.foe .rpg-plate{background:linear-gradient(180deg,#8a1630,#40061a);color:#ffd8e0;}
.rpg-box.sea .rpg-text{color:#ffc4d2;font-style:italic;}
.rpg-box.com .rpg-text{font-family:var(--mono);font-size:.88rem;color:#d8ccff;}
.rpg-box.com .rpg-plate{font-family:var(--mono);background:linear-gradient(180deg,#5a4a10,#2a2006);color:#ffe7a8;}
.rpg-box.com .rpg-plate::before{content:'💬 ';}
.rpg-box.ghost .rpg-text{color:#ff9fb4;text-shadow:0 0 6px rgba(232,48,85,.7);}
.rpg-box.ghost .rpg-plate{background:linear-gradient(180deg,#3a0614,#100006);color:#ff9fb4;}
.rpg-next{position:absolute;right:12px;bottom:4px;font-size:.72rem;color:#fff;animation:rpgBlink .9s infinite;}
/* 選択肢 */
.rpg-choices{position:absolute;left:12px;right:12px;bottom:152px;display:flex;flex-direction:column;gap:8px;animation:rpgUp .3s ease;}
.rpg-ch{position:relative;min-height:52px;padding:9px 14px 9px 30px;text-align:left;background:linear-gradient(180deg,rgba(28,24,84,.96),rgba(9,7,30,.97));border:2px solid #cfc6f5;box-shadow:0 0 0 2px #120c34,inset 0 0 0 1px rgba(138,82,212,.7);border-radius:6px;color:var(--tx-b);font-family:var(--serif);font-size:.86rem;line-height:1.5;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:border-color .15s,box-shadow .15s;}
.rpg-ch small{display:block;font-size:.66rem;color:var(--tx-d);margin-top:2px;}
.rpg-ch.sel,.rpg-ch:hover{border-color:var(--cy);box-shadow:0 0 14px rgba(0,232,200,.28);}
.rpg-ch.sel::before{content:'▶';position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#fff;animation:rpgNudge .6s ease-in-out infinite;}
/* 探索 */
.rpg-spot{position:absolute;transform:translate(-50%,-50%);min-width:48px;min-height:48px;padding:2px;background:none;border:none;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;animation:rpgUp .4s ease;}
.rpg-spot i{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#fff 0,var(--cy) 32%,rgba(0,232,200,0) 70%);animation:rpgPulse 1.6s ease-in-out infinite;}
.rpg-spot span{font-family:var(--dot);font-size:.68rem;color:var(--tx-b);background:rgba(4,3,14,.78);border:1px solid rgba(0,232,200,.4);padding:4px 8px;border-radius:3px;white-space:nowrap;}
.rpg-spot.done i{background:radial-gradient(circle,#887 0,#554a70 35%,rgba(80,70,110,0) 70%);animation:none;opacity:.6;}
.rpg-spot.done span{color:var(--tx-d);border-color:rgba(94,80,120,.4);}
.rpg-spot.done span::after{content:' ✓';}
.rpg-spot.exit i{background:radial-gradient(circle,#fff 0,var(--gd) 32%,rgba(232,184,48,0) 70%);}
.rpg-spot.exit span{border-color:rgba(232,184,48,.6);color:#ffe7a8;}
.rpg-spot.sel span{border-color:#fff;box-shadow:0 0 12px rgba(0,232,200,.6);}
.rpg-hint{position:absolute;top:10px;left:50%;transform:translateX(-50%);max-width:94%;font-family:var(--dot);font-size:.66rem;letter-spacing:.06em;color:#e8e2ff;background:linear-gradient(180deg,rgba(28,24,84,.92),rgba(9,7,30,.94));border:2px solid #cfc6f5;box-shadow:0 0 0 2px #120c34;padding:5px 12px;border-radius:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;}
/* バトル */
.rpg-bt-top{position:absolute;top:8px;left:8px;right:8px;padding:8px 10px;pointer-events:none;}
.rpg-en-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}
.rpg-en-name{font-family:var(--dot);font-size:.84rem;color:#ffd0da;letter-spacing:.06em;}
.rpg-en-st{font-family:var(--mono);font-size:.62rem;color:var(--gd);}
.rpg-bar{height:7px;margin-top:5px;background:#1a1330;border-radius:4px;overflow:hidden;}
.rpg-bar>div{height:100%;width:100%;transition:width .35s ease;}
.rpg-bar.en>div{background:linear-gradient(90deg,#e83055,#ff7a90);}
.rpg-bar.hp>div{background:linear-gradient(90deg,#00e8c8,#7affe6);}
.rpg-bar.br>div{background:linear-gradient(90deg,#4a7dff,#9fc0ff);}
.rpg-intent{margin-top:5px;font-size:.7rem;color:var(--tx);line-height:1.5;}
.rpg-intent b{color:var(--rd);font-weight:normal;}
.rpg-bt-bot{position:absolute;left:8px;right:8px;bottom:8px;display:flex;flex-direction:column;gap:7px;padding:9px 8px 8px;}
.rpg-msg{min-height:3.1em;font-size:.78rem;line-height:1.6;color:var(--tx-b);padding:0 2px;}
.rpg-me{display:flex;gap:8px;align-items:center;}
.rpg-me .rpg-por{width:46px;height:46px;}
.rpg-me-bars{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
.rpg-me-row{display:flex;justify-content:space-between;font-family:var(--mono);font-size:.62rem;color:var(--tx);}
.rpg-me-row .rpg-bar{margin-top:0;flex:1;margin-left:6px;align-self:center;height:6px;}
.rpg-st{font-family:var(--dot);font-size:.6rem;color:var(--gd);min-height:1em;}
.rpg-cmds{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;}
.rpg-cmd{position:relative;min-height:52px;padding:4px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;background:linear-gradient(180deg,#241c5a,#0e0b2a);border:1px solid rgba(207,198,245,.55);border-radius:5px;color:var(--tx-b);font-family:var(--dot);font-size:.84rem;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .1s,border-color .15s;}
.rpg-cmd small{font-family:var(--mono);font-size:.56rem;color:var(--tx-d);}
.rpg-cmd:active{transform:scale(.95);}
.rpg-cmd.sel{border-color:#fff;box-shadow:0 0 10px rgba(0,232,200,.35),inset 0 0 10px rgba(0,232,200,.15);}
.rpg-cmd.sel::before{content:'▶';position:absolute;left:4px;top:50%;transform:translateY(-50%);font-size:.6rem;color:#fff;animation:rpgNudge .6s ease-in-out infinite;}
.rpg-cmd:disabled{opacity:.33;cursor:default;}
.rpg-cmd.wide{grid-column:span 2;}
.rpg-cmd.back{border-color:rgba(94,80,120,.6);color:var(--tx);}
.rpg-cmds.busy .rpg-cmd{opacity:.45;pointer-events:none;}
/* タイトル・章カード・エンド */
.rpg-menu{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:18px 18px 22px;text-align:center;overflow-y:auto;}
.rpg-logo{font-family:var(--serif);font-weight:700;font-size:2.15rem;letter-spacing:.32em;padding-left:.32em;color:#eefcff;animation:rpgGlow 4s ease-in-out infinite;}
.rpg-sub{font-size:.72rem;letter-spacing:.18em;color:var(--tx);}
.rpg-lights{display:flex;gap:12px;margin:6px 0 2px;}
.rpg-lt{display:flex;flex-direction:column;align-items:center;gap:4px;font-family:var(--dot);font-size:.6rem;color:var(--tx-d);}
.rpg-lt b{width:22px;height:22px;border-radius:50%;background:#16122a;border:1px solid #3a2f5a;}
.rpg-lt.on{color:#ffe7a8;}
.rpg-lt.on b{background:radial-gradient(circle,#fff 0,#ffd66a 38%,rgba(232,184,48,.25) 72%);border-color:rgba(232,184,48,.8);box-shadow:0 0 14px rgba(232,184,48,.75);}
.rpg-info{font-family:var(--mono);font-size:.64rem;color:var(--tx);letter-spacing:.05em;line-height:1.7;}
.rpg-note{font-size:.7rem;color:#b6acd8;line-height:1.7;max-width:320px;}
.rpg-btns{display:flex;flex-direction:column;gap:8px;width:100%;max-width:310px;margin-top:4px;}
.rpg-btn{position:relative;min-height:50px;padding:8px 14px 8px 24px;background:linear-gradient(180deg,rgba(28,24,84,.95),rgba(9,7,30,.96));border:2px solid #cfc6f5;box-shadow:0 0 0 2px #120c34,inset 0 0 0 1px rgba(138,82,212,.7);border-radius:6px;color:var(--tx-b);font-family:var(--dot);font-size:.84rem;letter-spacing:.08em;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.rpg-btn small{display:block;font-family:var(--serif);font-size:.62rem;color:var(--tx-d);letter-spacing:.02em;margin-top:2px;}
.rpg-btn.main{border-color:var(--cy);color:#dffffa;box-shadow:0 0 16px rgba(0,232,200,.18);}
.rpg-btn.sel{border-color:#fff;box-shadow:0 0 0 2px #120c34,0 0 16px rgba(0,232,200,.4);}
.rpg-btn.sel::before{content:'▶';position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:.7rem;color:#fff;animation:rpgNudge .6s ease-in-out infinite;}
.rpg-btn:disabled{opacity:.4;cursor:default;}
.rpg-btn.mini{min-height:44px;font-size:.74rem;}
.rpg-grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.rpg-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;text-align:center;background:radial-gradient(ellipse at center,rgba(8,14,34,.88),rgba(1,2,8,.97));opacity:0;transition:opacity .8s ease;pointer-events:none;}
.rpg-card.on{opacity:1;pointer-events:auto;}
.rpg-card .c1{font-family:var(--dot);font-size:.8rem;letter-spacing:.55em;padding-left:.55em;color:var(--cy);}
.rpg-card .c2{font-family:var(--serif);font-weight:700;font-size:2rem;letter-spacing:.32em;padding-left:.32em;color:#f4fbff;text-shadow:0 0 18px rgba(0,232,200,.55),0 0 42px rgba(138,82,212,.5);}
.rpg-card .c3{font-size:.74rem;letter-spacing:.2em;color:var(--tx);}
.rpg-card .ln{height:1px;width:0;background:linear-gradient(90deg,transparent,var(--cy),transparent);transition:width 1.6s ease .2s;}
.rpg-card.on .ln{width:72%;}
.rpg-card.gold .c1{color:var(--gd);}
.rpg-card.gold .c2{text-shadow:0 0 18px rgba(232,184,48,.7),0 0 42px rgba(232,140,48,.4);}
.rpg-card.red .c1{color:var(--rd);}
.rpg-card.red .c2{color:#ffd8e0;text-shadow:0 0 18px rgba(232,48,85,.7);}
.rpg-tap{font-family:var(--mono);font-size:.62rem;color:var(--tx-d);letter-spacing:.2em;margin-top:10px;animation:rpgBlink 1.6s infinite;}
.rpg-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px 22px;text-align:center;background:radial-gradient(ellipse at 50% 40%,rgba(10,16,38,.55),rgba(1,2,8,.9));animation:rpgUp .8s ease;cursor:pointer;}
.rpg-end:not(.dark){background:linear-gradient(180deg,rgba(255,236,190,.08) 0%,rgba(10,22,48,.35) 45%,rgba(4,8,22,.8) 100%);}
.rpg-end .e3,.rpg-end .e4,.rpg-end .e2{text-shadow:0 1px 3px rgba(0,0,20,.9),0 0 14px rgba(0,0,20,.6);}
.rpg-end .e1{font-family:var(--dot);font-size:.74rem;letter-spacing:.4em;color:var(--gd);}
.rpg-end .e2{font-family:var(--serif);font-weight:700;font-size:1.7rem;letter-spacing:.25em;color:#fff;text-shadow:0 0 18px rgba(232,184,48,.6);}
.rpg-end.dark .e1{color:var(--rd);}
.rpg-end.dark .e2{text-shadow:0 0 18px rgba(232,48,85,.7);color:#ffd8e0;}
.rpg-end .e3{font-size:.8rem;line-height:2;color:var(--tx-b);white-space:pre-wrap;max-width:330px;}
.rpg-end .e4{font-family:var(--serif);font-size:.86rem;color:#ffe7a8;letter-spacing:.06em;margin-top:6px;line-height:1.9;}
.rpg-end.dark .e4{color:#ffb8c6;}
.rpg-fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .6s ease;pointer-events:none;}
.rpg-fade.on{opacity:1;pointer-events:auto;}
.rpg-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .35s ease;}
.rpg-gain{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font-family:var(--serif);font-weight:700;font-size:1.25rem;letter-spacing:.2em;color:#fff6d8;text-shadow:0 0 16px rgba(232,184,48,.9),0 0 34px rgba(232,140,48,.6);white-space:nowrap;pointer-events:none;animation:rpgUp .6s ease;}
@keyframes rpgNudge{0%,100%{margin-left:0}50%{margin-left:3px}}
.rpg-fade.wipe{opacity:1;background:linear-gradient(90deg,#000 0,#000 94%,rgba(0,0,0,0));clip-path:inset(0 100% 0 0);transition:clip-path .55s cubic-bezier(.65,0,.35,1);}
.rpg-fade.wipe.go{clip-path:inset(0 0 0 0);pointer-events:auto;}
.rpg-fade.wipe.go.out{clip-path:inset(0 0 0 100%);}
.rpg-eye{font-family:var(--mono);font-size:.58rem;letter-spacing:.4em;color:var(--cy);opacity:.7;}
.rpg-lt{position:relative;}
.rpg-lt em{position:absolute;top:-6px;right:-9px;font-style:normal;font-family:var(--mono);font-size:.55rem;color:#fff;background:#8a52d4;border-radius:3px;padding:0 3px;}
.rpg-rank{font-family:var(--dot);font-size:.9rem;letter-spacing:.2em;color:var(--tx-b);}
.rpg-rank b{font-family:var(--serif);font-size:2.2rem;margin-left:6px;vertical-align:middle;color:#fff;text-shadow:0 0 16px rgba(232,184,48,.9);}
.rpg-rank.rS b{color:#ffe066;}.rpg-rank.rA b{color:#7affe6;}.rpg-rank.rC b{color:#b6acd8;text-shadow:none;}
.rpg-desc{color:#b6acd8;font-size:.72rem;}
.rpg-msg b{color:#fff;}.rpg-msg b.wk{color:#ffe066;}.rpg-msg b.cr{color:#ff9a50;}.rpg-msg b.dm{color:#ff8098;}
.rpg-intent small{color:var(--tx-d);margin-left:2px;}
.rpg-intent span{color:#ffd0da;}
.rpg-bar.hp.low>div{background:linear-gradient(90deg,#e83055,#ff9a50);animation:rpgBlink .8s infinite;}
.rpg-me-row span{min-width:76px;}
@media (min-width:420px){.rpg-text{font-size:.92rem;}}
`);

(function(){
'use strict';

// ── 章データ ──
const RPG_CH=[null,
  {no:1,kan:'第一章',title:'声の灯',  light:'声',  place:'沈んだ配信部屋'},
  {no:2,kan:'第二章',title:'手の灯',  light:'手',  place:'海底の工場'},
  {no:3,kan:'第三章',title:'約束の灯',light:'約束',place:'珊瑚の保育園'},
  {no:4,kan:'第四章',title:'眠りの灯',light:'眠り',place:'眠らない灯籠の回廊'},
  {no:5,kan:'第五章',title:'名前の灯',light:'名前',place:'名前を呑む渦'},
];
// 朝へつなぎとめる選択（錨）。三つ以上で真の目覚めへ
const ANCHORS=['ch1_call','ch2_share','ch3_promise','ch4_rest','ch5_papa'];
const ITEMS={
  shell: {name:'さくら貝',  desc:'HPを35回復'},
  ramune:{name:'夜光ラムネ',desc:'息を15回復・状態異常を治す'},
};

// ── 保存データ（gs.rpg） ──
function rpgDefaults(){return {v:1,cleared:0,lastDay:-1,lv:1,exp:0,items:{shell:1,ramune:1},flags:{},endings:{},ending:null,ranks:{},rating:null,rec:{wins:0,losses:0},opt:{speed:1}};}
function rpgPeek(){
  const r=(typeof gs!=='undefined'&&gs&&gs.rpg&&typeof gs.rpg==='object')?gs.rpg:{};
  return Object.assign(rpgDefaults(),r);
}
function rpgState(){
  const raw=(gs.rpg&&typeof gs.rpg==='object')?gs.rpg:{};
  const R=Object.assign(rpgDefaults(),raw);
  R.items=Object.assign({shell:0,ramune:0},raw.items||{shell:1,ramune:1});
  R.flags=Object.assign({},raw.flags||{});
  R.endings=Object.assign({},raw.endings||{});
  R.ranks=Object.assign({},raw.ranks||{});
  R.rec=Object.assign({wins:0,losses:0},raw.rec||{});
  R.opt=Object.assign({speed:1},raw.opt||{});
  if(!(R.opt.speed>=0&&R.opt.speed<=3))R.opt.speed=1;
  R.cleared=Math.max(0,Math.min(5,Math.floor(+R.cleared||0)));
  R.lv=Math.max(1,Math.floor(+R.lv||1));R.exp=Math.max(0,+R.exp||0);
  gs.rpg=R;
  return R;
}
const lockedToday=R=>R.cleared>0&&R.cleared<5&&R.lastDay===gs.day;
const expNeed=lv=>15+lv*12;

// ── 画像（白背景を抜いたスプライト／ポートレート） ──
const IMG={};
function keyWhite(im){
  const w=im.naturalWidth,h=im.naturalHeight;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d');x.drawImage(im,0,0);
  const d=x.getImageData(0,0,w,h),p=d.data;
  const bg=i=>{const r=p[i],g=p[i+1],b=p[i+2];return Math.min(r,g,b)>232&&Math.max(r,g,b)-Math.min(r,g,b)<22;};
  const seen=new Uint8Array(w*h),st=[];
  for(let i=0;i<w;i++){st.push(i,(h-1)*w+i);}for(let j=0;j<h;j++){st.push(j*w,j*w+w-1);}
  while(st.length){
    const k=st.pop();if(seen[k])continue;
    if(!bg(k*4))continue;
    seen[k]=1;p[k*4+3]=0;
    const px=k%w,py=(k/w)|0;
    if(px>0)st.push(k-1);if(px<w-1)st.push(k+1);if(py>0)st.push(k-w);if(py<h-1)st.push(k+w);
  }
  // 輪郭をなめらかに
  for(let k=0;k<w*h;k++){
    if(seen[k])continue;
    const px=k%w,py=(k/w)|0;
    if((px>0&&seen[k-1])||(px<w-1&&seen[k+1])||(py>0&&seen[k-w])||(py<h-1&&seen[k+w])){
      const i=k*4,br=(p[i]+p[i+1]+p[i+2])/3;
      if(br>170)p[i+3]=Math.max(40,Math.min(255,(255-br)*3.2));
    }
  }
  x.putImageData(d,0,0);
  return c;
}
function img(name,key){
  const id=name+(key?'#k':'');
  if(IMG[id])return IMG[id];
  const o={ok:false,src:null};IMG[id]=o;
  const im=new Image();
  im.onload=()=>{try{o.src=key?keyWhite(im):im;}catch(e){o.src=im;}o.ok=true;};
  im.src='assets/img/'+name+'.webp';
  return o;
}

// ── 乱数（装飾の配置用に固定シード） ──
function srand(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return()=>(s=s*16807%2147483647)/2147483647;}
const R1=srand(1185);
const SNOW=Array.from({length:70},()=>({x:R1(),y:R1(),s:.6+R1()*1.8,v:.2+R1()*.8,ph:R1()*6.28,a:.15+R1()*.45}));
const BUBS=Array.from({length:22},()=>({x:R1(),o:R1(),r:1.5+R1()*4.5,v:.5+R1()*1.1,ph:R1()*6.28}));
const WEED=Array.from({length:14},()=>({x:R1(),h:.12+R1()*.2,w:3+R1()*5,ph:R1()*6.28,c:R1()}));
const GLITCH=Array.from({length:26},()=>({x:R1()*2-1,y:R1()*2-1,w:.15+R1()*.5,h:.04+R1()*.12,c:R1(),ph:R1()*6.28}));

// ══════════════════════════════════════════════════════════
// 描画パーツ
// ══════════════════════════════════════════════════════════
let PX=0; // 視差：主人公の位置に応じて遠景をずらす
function par(x,W,k,fn){x.save();x.translate(-PX*W*k,0);fn();x.restore();}
function sand(x,W,H,t,y0,col,seed=7){
  const r=srand(seed);
  x.save();x.strokeStyle=col;x.lineWidth=1;
  for(let i=0;i<9;i++){const y=y0+(H-y0)*(i+.5)/9,a=.08+.1*(i/9);x.globalAlpha=a;x.beginPath();
    for(let px=-10;px<=W+10;px+=12){const yy=y+Math.sin(px*.03+i*1.7)*3*(1+i/5);px<0?x.moveTo(px,yy):x.lineTo(px,yy);}x.stroke();}
  x.globalAlpha=1;
  for(let i=0;i<16;i++){const px=r()*W,py=y0+(H-y0)*(.1+r()*.85),s=1.5+r()*4*(py/H);
    x.fillStyle=r()<.3?'rgba(255,200,220,.35)':'rgba(140,130,190,.28)';x.beginPath();x.ellipse(px,py,s*1.6,s,0,0,6.283);x.fill();}
  x.globalCompositeOperation='lighter';
  for(let i=0;i<5;i++){const px=W*(.1+i*.2)+Math.sin(t*.6+i)*W*.05,py=y0+(H-y0)*(.35+.1*Math.sin(t*.8+i*2));
    const g=x.createRadialGradient(px,py,0,px,py,W*.12);g.addColorStop(0,'rgba(160,220,255,.06)');g.addColorStop(1,'rgba(160,220,255,0)');x.fillStyle=g;x.fillRect(px-W*.12,py-W*.12,W*.24,W*.24);}
  x.restore();
}
function vgrad(x,W,H,stops){const g=x.createLinearGradient(0,0,0,H);stops.forEach(([o,c])=>g.addColorStop(o,c));x.fillStyle=g;x.fillRect(0,0,W,H);}
function glow(x,cx,cy,r,col,a){
  const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
  g.addColorStop(0,col.replace('A',a));g.addColorStop(1,col.replace('A',0));
  x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
}
function rays(x,W,H,t,col,n,a){
  x.save();x.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){
    const cx=W*(i+.5)/n+Math.sin(t*.18+i*1.7)*W*.06,sk=Math.sin(t*.11+i)*W*.08;
    const wt=W*.03+i%2*W*.015,wb=W*.16+(i%3)*W*.04,len=H*(.62+.2*((i*37)%5)/5);
    const g=x.createLinearGradient(0,0,0,len);
    const al=a*(.6+.4*Math.sin(t*.7+i*2.3));
    g.addColorStop(0,col.replace('A',al));g.addColorStop(1,col.replace('A',0));
    x.fillStyle=g;x.beginPath();x.moveTo(cx-wt,0);x.lineTo(cx+wt,0);x.lineTo(cx+wb+sk,len);x.lineTo(cx-wb+sk,len);x.closePath();x.fill();
  }
  x.restore();
}
function surface(x,W,H,t,a){
  x.save();x.strokeStyle=`rgba(190,235,255,${a})`;x.lineWidth=1;
  for(let k=0;k<3;k++){x.beginPath();for(let px=0;px<=W;px+=8){const y=H*.025+k*7+Math.sin(px*.025+t*1.4+k*2)*3;px?x.lineTo(px,y):x.moveTo(px,y);}x.stroke();}
  x.restore();
}
function snow(x,W,H,t,col){
  x.fillStyle=col;
  SNOW.forEach(p=>{
    const y=((p.y*H+t*p.v*14)%H+H)%H,px=p.x*W+Math.sin(t*.5+p.ph)*9;
    x.globalAlpha=p.a;x.fillRect(px,y,p.s,p.s);
  });
  x.globalAlpha=1;
}
function bubbles(x,W,H,t,a=1){
  x.save();x.lineWidth=1;
  BUBS.forEach(b=>{
    const span=H*1.25,y=H+20-((b.o*span+t*b.v*38)%span),px=b.x*W+Math.sin(t*1.3+b.ph)*7;
    x.strokeStyle=`rgba(200,240,255,${.35*a})`;x.beginPath();x.arc(px,y,b.r,0,6.283);x.stroke();
    x.fillStyle=`rgba(255,255,255,${.4*a})`;x.fillRect(px-b.r*.4,y-b.r*.5,1.2,1.2);
  });
  x.restore();
}
function seaweed(x,W,H,t,col,base=1){
  x.save();x.lineCap='round';
  WEED.forEach(b=>{
    const h=b.h*H,x0=b.x*W;let px=x0,py=H*base;
    x.strokeStyle=col[b.c<.5?0:1];
    for(let i=1;i<=10;i++){
      const nx=x0+Math.sin(t*1.1+b.ph+i*.42)*i*1.9,ny=H*base-h*i/10;
      x.lineWidth=Math.max(.6,b.w*(1-i/11));x.beginPath();x.moveTo(px,py);x.lineTo(nx,ny);x.stroke();px=nx;py=ny;
    }
  });
  x.restore();
}
function vignette(x,W,H,a,col='0,0,0'){
  const g=x.createRadialGradient(W/2,H*.45,Math.min(W,H)*.25,W/2,H*.45,Math.max(W,H)*.75);
  g.addColorStop(0,`rgba(${col},0)`);g.addColorStop(1,`rgba(${col},${a})`);x.fillStyle=g;x.fillRect(0,0,W,H);
}
function floor(x,W,H,y0,c0,c1){const g=x.createLinearGradient(0,y0,0,H);g.addColorStop(0,c0);g.addColorStop(1,c1);x.fillStyle=g;x.beginPath();x.moveTo(0,y0+6);x.quadraticCurveTo(W/2,y0-10,W,y0+4);x.lineTo(W,H);x.lineTo(0,H);x.fill();}
function torii(x,cx,by,s,col,tilt=0){
  x.save();x.translate(cx,by);x.rotate(tilt);x.fillStyle=col;
  const h=s,w=s*1.1;
  x.fillRect(-w*.36,-h,w*.07,h);x.fillRect(w*.29,-h,w*.07,h);
  x.fillRect(-w*.46,-h*.78,w*.92,h*.06);
  x.beginPath();x.moveTo(-w*.6,-h*.96);x.quadraticCurveTo(0,-h*.88,w*.6,-h*.96);x.lineTo(w*.56,-h*1.04);x.quadraticCurveTo(0,-h*.96,-w*.56,-h*1.04);x.fill();
  x.fillRect(-w*.5,-h*.92,w,h*.05);
  x.restore();
}
function roof(x,cx,by,w,h,col,tilt=0,win){
  x.save();x.translate(cx,by);x.rotate(tilt);x.fillStyle=col;
  x.fillRect(-w*.4,-h*.32,w*.8,h*.32);
  x.beginPath();x.moveTo(-w*.64,-h*.38);x.quadraticCurveTo(-w*.42,-h*.3,-w*.3,-h*.8);x.lineTo(w*.3,-h*.8);x.quadraticCurveTo(w*.42,-h*.3,w*.64,-h*.38);x.lineTo(w*.52,-h*.28);x.lineTo(-w*.52,-h*.28);x.closePath();x.fill();
  x.fillRect(-w*.34,-h*.86,w*.68,h*.07);
  x.beginPath();x.arc(-w*.34,-h*.86,h*.07,Math.PI,0);x.arc(w*.34,-h*.86,h*.07,Math.PI,0);x.fill();
  if(win){x.fillStyle=win;for(let i=-2;i<=2;i++)x.fillRect(i*w*.15-w*.04,-h*.24,w*.07,h*.13);}
  x.restore();
}
function toro(x,cx,by,s,t,lit=1,ph=0){
  // 石灯籠
  x.save();x.translate(cx,by);
  const st='#2a2a3e',st2='#1c1c2c';
  x.fillStyle=st2;x.fillRect(-s*.32,-s*.12,s*.64,s*.12);
  x.fillStyle=st;x.fillRect(-s*.1,-s*.62,s*.2,s*.5);
  x.fillStyle=st2;x.fillRect(-s*.28,-s*.72,s*.56,s*.1);
  x.fillStyle=st;x.fillRect(-s*.2,-s*1.02,s*.4,s*.3);
  const f=lit*(.75+.25*Math.sin(t*9+ph)+.1*Math.sin(t*23+ph*2));
  x.fillStyle=`rgba(255,${150+f*60|0},70,${.55+f*.45})`;x.fillRect(-s*.11,-s*.97,s*.22,s*.2);
  x.fillStyle=st2;x.beginPath();x.moveTo(-s*.42,-s*1.0);x.quadraticCurveTo(0,-s*1.12,s*.42,-s*1.0);x.lineTo(s*.12,-s*1.24);x.lineTo(-s*.12,-s*1.24);x.closePath();x.fill();
  x.beginPath();x.arc(0,-s*1.28,s*.06,0,6.283);x.fill();
  if(lit>0){x.globalCompositeOperation='lighter';glow(x,0,-s*.87,s*.9,'rgba(255,140,50,A)',.32*f);}
  x.restore();
}
function paperLantern(x,cx,cy,s,t,ph){
  x.save();x.translate(cx,cy);x.rotate(Math.sin(t*.8+ph)*.08);
  x.globalCompositeOperation='lighter';glow(x,0,0,s*2.2,'rgba(255,150,70,A)',.25);x.globalCompositeOperation='source-over';
  const g=x.createRadialGradient(0,0,1,0,0,s);g.addColorStop(0,'#ffe2a0');g.addColorStop(1,'#d9682e');
  x.fillStyle=g;x.beginPath();x.ellipse(0,0,s*.75,s,0,0,6.283);x.fill();
  x.strokeStyle='rgba(120,40,20,.5)';x.lineWidth=.8;for(let i=-2;i<=2;i++){x.beginPath();x.ellipse(0,0,s*.75,s*Math.abs(i)/2.6+.1,0,0,6.283);x.stroke();}
  x.fillStyle='#3a1a14';x.fillRect(-s*.4,-s*1.08,s*.8,s*.16);x.fillRect(-s*.4,s*.92,s*.8,s*.16);
  x.restore();
}
function coral(x,bx,by,len,ang,depth,t,col,ph){
  if(depth<=0||len<3)return;
  const sw=Math.sin(t*.9+ph+depth)*.06;
  const ex=bx+Math.cos(ang+sw)*len,ey=by+Math.sin(ang+sw)*len;
  x.strokeStyle=col;x.lineWidth=Math.max(1,depth*1.6);x.beginPath();x.moveTo(bx,by);x.lineTo(ex,ey);x.stroke();
  coral(x,ex,ey,len*.72,ang-.45,depth-1,t,col,ph+1);
  coral(x,ex,ey,len*.68,ang+.4,depth-1,t,col,ph+2);
  if(depth===1){x.fillStyle=col;x.beginPath();x.arc(ex,ey,2.2,0,6.283);x.fill();}
}
function jelly(x,cx,cy,s,t,ph,col){
  const p=.85+.15*Math.sin(t*2.2+ph);
  x.save();x.translate(cx,cy+Math.sin(t*.7+ph)*6);
  x.globalCompositeOperation='lighter';glow(x,0,0,s*2.4,col,.22);x.globalCompositeOperation='source-over';
  x.fillStyle=col.replace('A',.45);x.beginPath();x.ellipse(0,0,s*p,s*.7/p,0,Math.PI,0);x.quadraticCurveTo(0,s*.2,-s*p,0);x.fill();
  x.strokeStyle=col.replace('A',.4);x.lineWidth=1;
  for(let i=-2;i<=2;i++){x.beginPath();x.moveTo(i*s*.3,0);for(let k=1;k<=6;k++)x.lineTo(i*s*.3+Math.sin(t*2+ph+k*.8+i)*3,k*s*.32);x.stroke();}
  x.restore();
}
function rainWindow(x,cx,cy,w,h,t,frame='#2a2244'){
  x.save();
  const g=x.createLinearGradient(0,cy-h/2,0,cy+h/2);g.addColorStop(0,'#0c1530');g.addColorStop(1,'#1a0f2e');
  x.fillStyle=g;x.fillRect(cx-w/2,cy-h/2,w,h);
  x.save();x.beginPath();x.rect(cx-w/2,cy-h/2,w,h);x.clip();
  glow(x,cx-w*.2,cy+h*.3,w*.5,'rgba(255,60,160,A)',.35);glow(x,cx+w*.25,cy+h*.2,w*.45,'rgba(0,232,200,A)',.25);
  x.strokeStyle='rgba(170,190,255,.35)';x.lineWidth=1;
  for(let i=0;i<14;i++){const rx=cx-w/2+((i*37+t*40)%w),ry=cy-h/2+((i*53+t*220)%(h+20))-10;x.beginPath();x.moveTo(rx,ry);x.lineTo(rx-2,ry+9);x.stroke();}
  x.restore();
  x.strokeStyle=frame;x.lineWidth=4;x.strokeRect(cx-w/2,cy-h/2,w,h);x.lineWidth=2;
  x.beginPath();x.moveTo(cx,cy-h/2);x.lineTo(cx,cy+h/2);x.moveTo(cx-w/2,cy);x.lineTo(cx+w/2,cy);x.stroke();
  x.restore();
}

// ── 人物 ──
// ミナモ：寝間着の少女。半透明で、髪が水に流れている
function drawMinamo(x,cx,fy,s,t,a,expr){
  if(a<=0)return;
  x.save();x.globalAlpha=a*(.82+.08*Math.sin(t*2.3));
  const h=150*s,hy=fy-h*.78,hr=h*.11,bob=Math.sin(t*1.2)*4*s;
  x.translate(cx,bob);
  x.globalCompositeOperation='lighter';
  glow(x,0,fy-h*.45,h*.75,'rgba(80,220,255,A)',.22);
  x.globalCompositeOperation='source-over';
  // 後ろ髪
  x.lineCap='round';
  for(let i=0;i<9;i++){
    const ang=-Math.PI*.5+(i-4)*.2,len=h*(.42+(i%3)*.07);
    const ox=Math.cos(ang)*hr*.6,oy=hy+Math.sin(ang)*hr*.3;
    x.strokeStyle=`rgba(${40+i*6},${120+i*8},${170+i*6},.55)`;x.lineWidth=hr*.42;
    x.beginPath();x.moveTo(ox,oy);
    const sw=Math.sin(t*1.4+i*.7)*hr*1.2;
    x.bezierCurveTo(ox+(i-4)*hr*.35+sw*.3,oy+len*.35,ox+(i-4)*hr*.6-sw,oy+len*.7,ox+(i-4)*hr*.5+sw*1.3,oy+len);x.stroke();
  }
  // 体（寝間着）
  const dg=x.createLinearGradient(0,hy+hr,0,fy+8*s);
  dg.addColorStop(0,'rgba(225,250,255,.92)');dg.addColorStop(.7,'rgba(160,220,245,.55)');dg.addColorStop(1,'rgba(120,200,240,0)');
  x.fillStyle=dg;x.beginPath();
  x.moveTo(-hr*.55,hy+hr*.95);x.quadraticCurveTo(-hr*1.6,hy+h*.35,-hr*2.1,fy);
  for(let k=0;k<=6;k++){const px=-hr*2.1+k*hr*4.2/6;x.lineTo(px,fy+Math.sin(t*2+k*1.3)*5*s+(k%2)*6*s);}
  x.quadraticCurveTo(hr*1.6,hy+h*.35,hr*.55,hy+hr*.95);x.closePath();x.fill();
  // 腕
  x.strokeStyle='rgba(225,248,255,.8)';x.lineWidth=hr*.32;
  const sw2=Math.sin(t*1.1)*hr*.3;
  x.beginPath();x.moveTo(-hr*.8,hy+hr*1.4);x.quadraticCurveTo(-hr*1.5,hy+h*.28,-hr*1.2+sw2,hy+h*.4);x.stroke();
  x.beginPath();x.moveTo(hr*.8,hy+hr*1.4);x.quadraticCurveTo(hr*1.5,hy+h*.28,hr*1.2-sw2,hy+h*.4);x.stroke();
  // 襟
  x.strokeStyle='rgba(120,190,230,.7)';x.lineWidth=1.4*s;x.beginPath();x.moveTo(-hr*.5,hy+hr*1.05);x.lineTo(0,hy+hr*1.5);x.lineTo(hr*.5,hy+hr*1.05);x.stroke();
  // 顔
  const fg=x.createRadialGradient(-hr*.2,hy-hr*.2,1,0,hy,hr);fg.addColorStop(0,'#f4fdff');fg.addColorStop(1,'#bfe6f5');
  x.fillStyle=fg;x.beginPath();x.arc(0,hy,hr,0,6.283);x.fill();
  // 前髪
  x.fillStyle='rgba(50,130,180,.88)';x.beginPath();
  x.moveTo(-hr*1.1,hy+hr*.3);x.quadraticCurveTo(-hr*1.2,hy-hr*1.3,0,hy-hr*1.15);x.quadraticCurveTo(hr*1.2,hy-hr*1.3,hr*1.1,hy+hr*.3);
  x.quadraticCurveTo(hr*.7,hy-hr*.35,hr*.3,hy-hr*.2);x.quadraticCurveTo(0,hy-hr*.55,-hr*.3,hy-hr*.2);x.quadraticCurveTo(-hr*.7,hy-hr*.35,-hr*1.1,hy+hr*.3);x.fill();
  // 髪飾り（貝）
  x.fillStyle='#ffd0dc';x.beginPath();x.arc(hr*.75,hy-hr*.6,hr*.2,0,6.283);x.fill();
  // 目
  x.strokeStyle='#1d4a68';x.fillStyle='#1d4a68';x.lineWidth=Math.max(1,hr*.1);
  const ey=hy+hr*.12,ex=hr*.38;
  if(expr==='closed'||expr==='smile'){
    [-1,1].forEach(d=>{x.beginPath();x.arc(d*ex,ey+(expr==='smile'?hr*.06:-hr*.04),hr*.17,expr==='smile'?Math.PI*1.1:Math.PI*.1,expr==='smile'?Math.PI*1.9:Math.PI*.9);x.stroke();});
  }else{
    const blink=(t%4.2)<.12;
    [-1,1].forEach(d=>{
      if(blink){x.beginPath();x.moveTo(d*ex-hr*.15,ey);x.lineTo(d*ex+hr*.15,ey);x.stroke();return;}
      x.beginPath();x.ellipse(d*ex,ey,hr*.13,hr*(expr==='surprise'?.22:.18),0,0,6.283);x.fill();
      x.fillStyle='#c8f6ff';x.fillRect(d*ex-hr*.05,ey-hr*.1,hr*.07,hr*.07);x.fillStyle='#1d4a68';
    });
    if(expr==='sad'){x.beginPath();x.moveTo(-ex-hr*.2,ey-hr*.3);x.lineTo(-ex+hr*.12,ey-hr*.36);x.moveTo(ex+hr*.2,ey-hr*.3);x.lineTo(ex-hr*.12,ey-hr*.36);x.stroke();}
  }
  // 口・頬
  x.strokeStyle='#5a7c94';x.lineWidth=Math.max(.8,hr*.07);x.beginPath();
  if(expr==='smile')x.arc(0,hy+hr*.45,hr*.14,.2,Math.PI-.2);
  else if(expr==='surprise')x.arc(0,hy+hr*.5,hr*.08,0,6.283);
  else if(expr==='sad')x.arc(0,hy+hr*.62,hr*.12,Math.PI+.4,-.4);
  else{x.moveTo(-hr*.1,hy+hr*.52);x.lineTo(hr*.1,hy+hr*.52);}
  x.stroke();
  x.fillStyle='rgba(255,170,200,.35)';x.beginPath();x.arc(-hr*.55,hy+hr*.35,hr*.14,0,6.283);x.arc(hr*.55,hy+hr*.35,hr*.14,0,6.283);x.fill();
  x.restore();
}
// あの子：通園帽とかばんの、小さな光の影
function drawChild(x,cx,fy,s,t,a){
  if(a<=0)return;
  x.save();x.globalAlpha=a;x.translate(cx,fy+Math.sin(t*3)*2*s);
  x.globalCompositeOperation='lighter';glow(x,0,-40*s,60*s,'rgba(255,200,90,A)',.3);x.globalCompositeOperation='source-over';
  x.fillStyle='rgba(255,225,160,.85)';
  x.beginPath();x.arc(0,-52*s,11*s,0,6.283);x.fill();
  x.beginPath();x.moveTo(-9*s,-40*s);x.lineTo(9*s,-40*s);x.lineTo(12*s,-14*s);x.lineTo(-12*s,-14*s);x.fill();
  x.fillRect(-8*s,-14*s,5*s,13*s);x.fillRect(3*s,-14*s,5*s,13*s);
  x.fillStyle='rgba(255,210,60,.95)';x.beginPath();x.ellipse(0,-60*s,13*s,6*s,0,Math.PI,0);x.fill();x.fillRect(-15*s,-61*s,30*s,3*s);
  x.fillStyle='rgba(255,120,120,.8)';x.fillRect(8*s,-36*s,7*s,10*s);
  x.strokeStyle='rgba(255,120,120,.8)';x.lineWidth=1.5*s;x.beginPath();x.moveTo(-8*s,-40*s);x.lineTo(11*s,-30*s);x.stroke();
  x.restore();
}

// ══════════════════════════════════════════════════════════
// 背景（章ごとの夢の景色）
// ══════════════════════════════════════════════════════════
const NAMES_FLOAT=['だんのうら','パパ','■■ ■■','夜空の旅人','ひとりぼっち','深夜の常連','さくら','おかえり','こんばんは'];
const SCENES={
  // 眠る前の部屋
  night(x,W,H,t){
    vgrad(x,W,H,[[0,'#06071a'],[1,'#020208']]);
    rainWindow(x,W*.5,H*.3,W*.5,H*.28,t);
    x.fillStyle='#0c0a1c';x.fillRect(W*.06,H*.52,W*.36,H*.04);x.fillRect(W*.1,H*.56,W*.03,H*.12);x.fillRect(W*.35,H*.56,W*.03,H*.12);
    x.fillStyle='#14102a';x.fillRect(W*.12,H*.4,W*.2,H*.12);
    glow(x,W*.22,H*.46,W*.25,'rgba(138,82,212,A)',.12);
    x.fillStyle='#120f26';x.beginPath();x.ellipse(W*.6,H*.82,W*.42,H*.08,0,0,6.283);x.fill();
    x.fillStyle='#1b1636';x.beginPath();x.ellipse(W*.72,H*.79,W*.1,H*.035,0,0,6.283);x.fill();
    x.beginPath();x.ellipse(W*.48,H*.8,W*.17,H*.045,0,0,6.283);x.fill();
    vignette(x,W,H,.8);
  },
  menu(x,W,H,t){
    vgrad(x,W,H,[[0,'#0d2244'],[.45,'#071630'],[1,'#010309']]);
    rays(x,W,H,t,'rgba(120,220,255,A)',5,.07);surface(x,W,H,t,.18);
    par(x,W,.04,()=>{roof(x,W*.18,H*.74,W*.5,H*.2,'#06102a',-.06);roof(x,W*.86,H*.7,W*.42,H*.17,'#071230',.08);});
    torii(x,W*.52,H*.72,H*.26,'#3a1422',.04);
    floor(x,W,H,H*.73,'#081226','#020409');sand(x,W,H,t,H*.75,'#5a6aa8',3);
    seaweed(x,W,H,t,['#0d3a3a','#123048'],1);
    snow(x,W,H,t,'#cfe9ff');bubbles(x,W,H,t);vignette(x,W,H,.7);
  },
  // 第一章：沈んだ配信部屋
  room(x,W,H,t,v){
    const deep=v.variant==='deep';
    vgrad(x,W,H,deep?[[0,'#1a0a2e'],[.6,'#0c0518'],[1,'#030108']]:[[0,'#1a1450'],[.5,'#0c0a2c'],[1,'#030210']]);
    rays(x,W,H,t,deep?'rgba(255,90,140,A)':'rgba(140,120,255,A)',4,.08);surface(x,W,H,t,.14);
    par(x,W,.05,()=>{roof(x,W*.12,H*.5,W*.4,H*.16,'#0b0a26',-.12);torii(x,W*.85,H*.52,H*.2,'#3a1430',.1);roof(x,W*.6,H*.47,W*.3,H*.1,'#0d0b2c',.05);});
    floor(x,W,H,H*.6,'#110e30','#05040f');sand(x,W,H,t,H*.63,'#6a5ab8',11);
    if(!deep){
      rainWindow(x,W*.22,H*.3,W*.24,H*.16,t,'#2b2350');
      // 机・モニター・マイク
      x.fillStyle='#1d1840';x.fillRect(W*.42,H*.5,W*.44,H*.03);x.fillRect(W*.45,H*.53,W*.03,H*.1);x.fillRect(W*.8,H*.53,W*.03,H*.1);
      x.fillStyle='#0a0918';x.fillRect(W*.55,H*.33,W*.26,H*.15);x.fillRect(W*.665,H*.48,W*.03,H*.02);
      const sg=x.createLinearGradient(0,H*.34,0,H*.47);sg.addColorStop(0,'#0a4a5a');sg.addColorStop(1,'#122a52');
      x.fillStyle=sg;x.fillRect(W*.56,H*.34,W*.24,H*.13);
      x.fillStyle='rgba(180,255,240,.55)';
      for(let i=0;i<6;i++){const ly=H*.355+i*H*.018,lw=W*(.06+((i*7+Math.floor(t*1.5))%5)*.025);x.fillRect(W*.575,ly,lw,2);}
      x.globalCompositeOperation='lighter';glow(x,W*.68,H*.4,W*.3,'rgba(0,232,200,A)',.2+.05*Math.sin(t*3));x.globalCompositeOperation='source-over';
      x.strokeStyle='#2a2450';x.lineWidth=3;x.beginPath();x.moveTo(W*.46,H*.5);x.lineTo(W*.4,H*.38);x.lineTo(W*.47,H*.33);x.stroke();
      x.fillStyle='#3a3266';x.beginPath();x.ellipse(W*.48,H*.32,W*.022,H*.025,.4,0,6.283);x.fill();
      x.fillStyle='rgba(255,60,90,.9)';x.beginPath();x.arc(W*.49,H*.335,1.8,0,6.283);x.fill();
      // 椅子
      x.fillStyle='#16123a';x.fillRect(W*.6,H*.53,W*.12,H*.025);x.fillRect(W*.6,H*.43,W*.025,H*.11);x.fillRect(W*.65,H*.555,W*.015,H*.06);
      // ケーブル
      x.strokeStyle='#1a1638';x.lineWidth=2;x.beginPath();x.moveTo(W*.5,H*.52);x.bezierCurveTo(W*.45,H*.7,W*.2,H*.62,W*.05,H*.8);x.stroke();
    }else{
      x.globalCompositeOperation='lighter';glow(x,W*.5,H*.34,W*.6,'rgba(255,60,90,A)',.18+.06*Math.sin(t*2));x.globalCompositeOperation='source-over';
      x.font=`${Math.round(W*.032)}px "DotGothic16",monospace`;x.textAlign='center';
      ['つまらん','辞めろ','#炎上中','誰得','オワコン','切り抜くわ'].forEach((s,i)=>{
        const a=i*1.05+t*.25,r=W*(.32+.05*Math.sin(t+i));
        x.fillStyle=`rgba(255,120,150,${.18+.12*Math.sin(t*1.5+i)})`;x.fillText(s,W*.5+Math.cos(a)*r,H*.34+Math.sin(a)*r*.6);
      });
    }
    seaweed(x,W,H,t,['#1a2a5a','#2a1a4a'],1);
    snow(x,W,H,t,'#d8d0ff');bubbles(x,W,H,t);vignette(x,W,H,.75);
  },
  // 第二章：海底の工場
  factory(x,W,H,t,v){
    vgrad(x,W,H,[[0,'#0c2f30'],[.55,'#06191c'],[1,'#010506']]);
    rays(x,W,H,t,'rgba(140,255,200,A)',4,.06);surface(x,W,H,t,.12);
    // 遠景のタンク・煙突
    x.save();x.translate(-PX*W*.05,0);
    x.fillStyle='#072023';x.fillRect(W*.05,H*.2,W*.06,H*.4);x.fillRect(W*.86,H*.16,W*.07,H*.44);
    x.beginPath();x.arc(W*.7,H*.48,W*.12,Math.PI,0);x.fill();x.fillRect(W*.58,H*.48,W*.24,H*.1);
    x.fillStyle='rgba(255,180,60,.6)';x.fillRect(W*.075,H*.24,3,3);x.fillRect(W*.89,H*.2,3,3);x.restore();
    // 配管
    x.fillStyle='#163a3c';x.fillRect(0,H*.1,W,H*.025);x.fillRect(0,H*.16,W,H*.016);
    x.fillStyle='#1f4a4c';for(let i=0;i<6;i++){x.fillRect(W*(i*.19+.04),H*.093,W*.015,H*.04);}
    x.fillStyle='#163a3c';x.fillRect(W*.94,H*.1,W*.02,H*.5);
    // プレス機
    const px=W*.2,ram=Math.sin(t*(v.stopped?0:1.2))*H*.03;
    x.fillStyle='#22383a';x.fillRect(px-W*.12,H*.22,W*.24,H*.06);x.fillRect(px-W*.11,H*.28,W*.03,H*.32);x.fillRect(px+W*.08,H*.28,W*.03,H*.32);
    x.fillStyle='#2e4648';x.fillRect(px-W*.07,H*.28+ram+H*.04,W*.14,H*.08);
    x.fillStyle='#d8a020';for(let i=0;i<6;i++){x.fillRect(px-W*.12+i*W*.04,H*.585,W*.02,H*.015);}
    const bea=t*3;x.globalCompositeOperation='lighter';
    glow(x,px+Math.cos(bea)*W*.05,H*.21,W*.1,'rgba(255,170,40,A)',.35);x.globalCompositeOperation='source-over';
    x.fillStyle='#ffb030';x.beginPath();x.arc(px,H*.21,4,0,6.283);x.fill();
    // ロッカー
    x.fillStyle='#183034';for(let i=0;i<3;i++){x.fillRect(W*(.4+i*.06),H*.36,W*.055,H*.18);}
    x.fillStyle='#244448';for(let i=0;i<3;i++){x.fillRect(W*(.41+i*.06),H*.38,W*.035,H*.008);x.fillRect(W*(.41+i*.06),H*.395,W*.035,H*.008);}
    floor(x,W,H,H*.6,'#0c2224','#020607');sand(x,W,H,t,H*.66,'#4a8a7a',5);
    // コンベア
    const cy=H*.62,mov=v.conveyor?t*30:0;
    x.fillStyle='#1c3234';x.fillRect(W*.02,cy,W*.96,H*.025);
    x.fillStyle='#2c4a4c';for(let i=0;i<14;i++){const rx=W*.04+((i*W*.07+mov)%(W*.94));x.beginPath();x.arc(rx,cy+H*.0125,H*.01,0,6.283);x.fill();}
    x.fillStyle='#3a2c1c';[.15,.45,.72].forEach(b=>{const bx=(b*W+mov*1.2)%(W*.9);x.fillRect(bx,cy-H*.04,W*.08,H*.04);});
    // 制御盤
    const cx=W*.8;x.fillStyle='#1a2c30';x.fillRect(cx-W*.06,H*.36,W*.12,H*.22);
    for(let r=0;r<3;r++)for(let c=0;c<3;c++){
      const on=Math.sin(t*(2+r+c)+r*3+c)>0;const col=v.fixed?'#44ee88':(r===0&&c===1?'#e83055':['#e8b830','#44ee88','#e83055'][(r+c)%3]);
      x.fillStyle=on?col:'#203034';x.beginPath();x.arc(cx-W*.03+c*W*.03,H*.39+r*H*.03,W*.009,0,6.283);x.fill();
    }
    x.fillStyle=v.fixed?'#0a3a20':'#3a0a14';x.fillRect(cx-W*.045,H*.49,W*.09,H*.04);
    x.fillStyle=v.fixed?'#44ee88':'#ff5070';x.font=`${Math.round(W*.022)}px "Share Tech Mono",monospace`;x.textAlign='center';x.fillText(v.fixed?'RUN':'ERR 404',cx,H*.517);
    seaweed(x,W,H,t,['#1a3a2a','#2a3a1a'],1);
    snow(x,W,H,t,'#e0a070');bubbles(x,W,H,t,.8);vignette(x,W,H,.78);
  },
  // 第三章：珊瑚の保育園
  nursery(x,W,H,t,v){
    vgrad(x,W,H,[[0,'#2a1a52'],[.5,'#13194a'],[1,'#040612']]);
    rays(x,W,H,t,'rgba(255,170,210,A)',5,.07);surface(x,W,H,t,.16);
    jelly(x,W*.15,H*.18,W*.04,t,0,'rgba(255,170,220,A)');jelly(x,W*.82,H*.14,W*.035,t,2,'rgba(150,220,255,A)');jelly(x,W*.62,H*.08,W*.025,t,4,'rgba(255,220,160,A)');
    // 園舎
    const bx=W*.5,by=H*.58;
    x.fillStyle='#2c2650';x.fillRect(bx-W*.2,by-H*.17,W*.4,H*.17);
    x.fillStyle='#7a2c48';x.beginPath();x.moveTo(bx-W*.24,by-H*.165);x.lineTo(bx,by-H*.28);x.lineTo(bx+W*.24,by-H*.165);x.fill();
    x.fillStyle='#e8e0f8';x.beginPath();x.arc(bx,by-H*.205,W*.03,0,6.283);x.fill();
    x.strokeStyle='#2a2244';x.lineWidth=1.5;x.beginPath();x.moveTo(bx,by-H*.205);x.lineTo(bx,by-H*.22);x.moveTo(bx,by-H*.205);x.lineTo(bx+W*.016,by-H*.2);x.stroke();
    x.fillStyle=v.lit?'rgba(255,210,140,.75)':'rgba(255,200,140,.35)';
    x.fillRect(bx-W*.16,by-H*.13,W*.08,H*.05);x.fillRect(bx+W*.08,by-H*.13,W*.08,H*.05);
    x.fillStyle='#1a1638';x.fillRect(bx-W*.03,by-H*.09,W*.06,H*.09);
    x.globalCompositeOperation='lighter';glow(x,bx,by-H*.1,W*.3,'rgba(255,180,120,A)',.12);x.globalCompositeOperation='source-over';
    // すべり台
    x.strokeStyle='#5a3a6a';x.lineWidth=3;x.beginPath();x.moveTo(W*.1,H*.6);x.lineTo(W*.1,H*.46);x.moveTo(W*.14,H*.6);x.lineTo(W*.14,H*.46);x.stroke();
    x.strokeStyle='#d0607a';x.lineWidth=5;x.beginPath();x.moveTo(W*.14,H*.46);x.quadraticCurveTo(W*.22,H*.5,W*.27,H*.6);x.stroke();
    // ブランコ
    const sx=W*.86;x.strokeStyle='#4a3a6a';x.lineWidth=3;
    x.beginPath();x.moveTo(sx-W*.08,H*.6);x.lineTo(sx-W*.05,H*.42);x.lineTo(sx+W*.05,H*.42);x.lineTo(sx+W*.08,H*.6);x.stroke();
    const sa=Math.sin(t*1.3)*.35;x.save();x.translate(sx,H*.42);x.rotate(sa);x.strokeStyle='#8a7aa8';x.lineWidth=1;
    x.beginPath();x.moveTo(-W*.025,0);x.lineTo(-W*.025,H*.12);x.moveTo(W*.025,0);x.lineTo(W*.025,H*.12);x.stroke();
    x.fillStyle='#e8b830';x.fillRect(-W*.035,H*.12,W*.07,H*.012);x.restore();
    floor(x,W,H,H*.6,'#1e1a40','#05040e');sand(x,W,H,t,H*.68,'#b07ab0',13);
    // 珊瑚
    x.lineCap='round';
    coral(x,W*.03,H*.98,H*.11,-1.35,5,t,'rgba(255,110,140,.75)',0);
    coral(x,W*.22,H*.99,H*.07,-1.6,4,t,'rgba(255,170,110,.7)',3);
    coral(x,W*.97,H*.98,H*.12,-1.8,5,t,'rgba(240,120,190,.7)',5);
    coral(x,W*.76,H*.99,H*.06,-1.5,4,t,'rgba(255,200,120,.6)',7);
    // チューリップ
    ['#ff7090','#ffd060','#ff9a50','#d070ff','#ff7090'].forEach((c,i)=>{const tx=W*(.36+i*.07),ty=H*.66;
      x.strokeStyle='#2a6a4a';x.lineWidth=1.5;x.beginPath();x.moveTo(tx,ty);x.lineTo(tx,ty-H*.03);x.stroke();
      x.fillStyle=c;x.beginPath();x.arc(tx,ty-H*.035,W*.012,0,Math.PI);x.lineTo(tx-W*.012,ty-H*.045);x.lineTo(tx-W*.004,ty-H*.04);x.lineTo(tx,ty-H*.047);x.lineTo(tx+W*.004,ty-H*.04);x.lineTo(tx+W*.012,ty-H*.045);x.fill();});
    snow(x,W,H,t,'#ffd8ea');bubbles(x,W,H,t);vignette(x,W,H,.7,'4,2,18');
  },
  // 第四章：眠らない灯籠の回廊
  corridor(x,W,H,t,v){
    vgrad(x,W,H,[[0,'#0c0b2c'],[.42,'#100a26'],[1,'#020106']]);
    const vx=W/2-PX*W*.08,vy=H*.38;
    rays(x,W,H,t,'rgba(255,170,110,A)',3,.04);
    x.globalCompositeOperation='lighter';glow(x,vx,vy,W*.35,'rgba(255,120,60,A)',.18);x.globalCompositeOperation='source-over';
    // 床
    x.fillStyle='#0a0818';x.beginPath();x.moveTo(vx-W*.04,vy);x.lineTo(vx+W*.04,vy);x.lineTo(W*1.1,H);x.lineTo(-W*.1,H);x.fill();
    x.strokeStyle='rgba(120,90,160,.18)';x.lineWidth=1;
    for(let i=-4;i<=4;i++){x.beginPath();x.moveTo(vx+i*W*.01,vy);x.lineTo(vx+i*W*.2,H);x.stroke();}
    for(let k=1;k<9;k++){const z=1/(1+((k+t*.25)%8)*.55),y=vy+(H*.95-vy)*z;x.globalAlpha=z*.5;x.beginPath();x.moveTo(vx-(W*.6)*z,y);x.lineTo(vx+(W*.6)*z,y);x.stroke();}
    x.globalAlpha=1;
    const off=v.dim?.25:1;
    for(let d=8;d>=0;d--){
      const z=1/(1+d*.55),y=vy+(H*.66-vy)*z,s=H*.2*z;
      toro(x,vx-W*.44*z,y,s,t,off,d*1.3);toro(x,vx+W*.44*z,y,s,t,off,d*2.1+1);
    }
    for(let i=0;i<7;i++){
      const span=H*1.1,py=H-((i*span/7+t*12)%span),px=W*(.15+((i*41)%70)/100)+Math.sin(t*.6+i)*10;
      paperLantern(x,px,py,W*.022+(i%3)*W*.006,t,i);
    }
    x.fillStyle='rgba(180,160,255,.05)';for(let i=0;i<3;i++){x.fillRect(0,H*(.55+i*.08)+Math.sin(t*.5+i)*6,W,H*.03);}
    snow(x,W,H,t,'#ffd0a0');bubbles(x,W,H,t,.6);vignette(x,W,H,.82);
  },
  // 第五章：名前を呑む渦
  vortex(x,W,H,t,v){
    vgrad(x,W,H,[[0,'#170726'],[.5,'#0a0414'],[1,'#000']]);
    const cx=W/2,cy=H*.36,sp=v.calm?.15:.6;
    par(x,W,.05,()=>{roof(x,W*.14,H*.62,W*.42,H*.18,'#0e0820',-.25+Math.sin(t*.2)*.03,'rgba(255,120,80,.25)');
    roof(x,W*.9,H*.56,W*.38,H*.16,'#100a24',.3+Math.sin(t*.25)*.03,'rgba(255,120,80,.2)');});
    torii(x,W*.82,H*.86,H*.22,'#4a1628',.22);
    x.save();x.lineCap='round';
    for(let i=0;i<80;i++){
      const r=6+i*Math.min(W,H)*.0068,a=i*.36-t*sp*(1.4-i/100);
      const al=(1-i/80)*.55;
      x.strokeStyle=i%3?`rgba(150,70,220,${al})`:`rgba(255,70,110,${al})`;x.lineWidth=1+i*.03;
      x.beginPath();x.arc(cx,cy,r,a,a+.8);x.stroke();
    }
    x.restore();
    const cg=x.createRadialGradient(cx,cy,0,cx,cy,W*.08);cg.addColorStop(0,'#000');cg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=cg;x.fillRect(cx-W*.1,cy-W*.1,W*.2,W*.2);
    x.font=`${Math.round(W*.034)}px "DotGothic16",monospace`;x.textAlign='center';
    NAMES_FLOAT.forEach((n,i)=>{
      const a=i*.7+t*.2*(1+i%3*.3),r=W*(.18+((i*29)%30)/100)*(1-.08*Math.sin(t*.4+i));
      x.fillStyle=n==='パパ'?`rgba(255,220,140,${.55+.3*Math.sin(t*2+i)})`:`rgba(220,200,255,${.25+.2*Math.sin(t*1.3+i)})`;
      x.fillText(n,cx+Math.cos(a)*r,cy+Math.sin(a)*r*.75);
    });
    floor(x,W,H,H*.7,'#0c0618','#000');sand(x,W,H,t,H*.72,'#7a3a8a',17);
    seaweed(x,W,H,t,['#2a0e3a','#3a0e24'],1);
    snow(x,W,H,t,'#e0c0ff');bubbles(x,W,H,t,.6);vignette(x,W,H,.8);
  },
  // 目覚めの水面
  dawn(x,W,H,t){
    vgrad(x,W,H,[[0,'#ffe6a8'],[.25,'#9fd0e8'],[.6,'#2b5a8c'],[1,'#0b1a38']]);
    rays(x,W,H,t,'rgba(255,250,220,A)',6,.22);surface(x,W,H,t,.6);
    x.globalCompositeOperation='lighter';glow(x,W*.5,-H*.05,W*.9,'rgba(255,240,200,A)',.45);x.globalCompositeOperation='source-over';
    roof(x,W*.2,H*1.02,W*.5,H*.2,'rgba(20,40,80,.6)',-.05);torii(x,W*.78,H*1.0,H*.24,'rgba(90,40,60,.5)',.04);
    snow(x,W,H,t,'#fff');bubbles(x,W,H,t,1.4);
  },
  // 沈眠の都
  abyss(x,W,H,t){
    vgrad(x,W,H,[[0,'#1a0612'],[.5,'#0a0208'],[1,'#000']]);
    rays(x,W,H,t,'rgba(255,90,90,A)',3,.03);
    for(let i=0;i<7;i++){roof(x,W*(i/6),H*(.82+(i%2)*.06),W*.32,H*.13,'#0c0408',(i-3)*.03,`rgba(255,${120+i*10},70,${.35+.15*Math.sin(t*1.5+i)})`);}
    x.globalCompositeOperation='lighter';glow(x,W*.5,H*.9,W*.7,'rgba(255,90,50,A)',.22);x.globalCompositeOperation='source-over';
    snow(x,W,H,t,'#ffb0a0');vignette(x,W,H,.85);
  },
};

// ══════════════════════════════════════════════════════════
// 海の亡者（敵）の描画。e は {t, hit, charge, clones, armor, ...}
// ══════════════════════════════════════════════════════════
const FOES={
  noise(x,s,t,e){
    const tint=e.tint||'0';
    GLITCH.forEach((g,i)=>{
      const j=Math.sin(t*13+g.ph)>.6?(Math.random()-.5)*s*.25:0;
      const px=g.x*s*.42+Math.sin(t*1.5+g.ph)*s*.06+j,py=g.y*s*.36+Math.cos(t*1.2+g.ph)*s*.05;
      const c=tint==='o'?['rgba(255,160,80,.75)','rgba(255,90,60,.7)','rgba(255,230,180,.65)']:['rgba(220,240,255,.75)','rgba(0,232,200,.65)','rgba(255,60,160,.65)'];
      x.fillStyle=c[Math.floor(g.c*3)];x.fillRect(px-g.w*s*.16,py,g.w*s*.32,g.h*s*.35);
    });
    x.globalCompositeOperation='lighter';glow(x,0,0,s*.55,tint==='o'?'rgba(255,120,40,A)':'rgba(120,80,255,A)',.25);x.globalCompositeOperation='source-over';
    x.fillStyle='rgba(0,0,0,.35)';for(let y=-s*.45;y<s*.45;y+=4)x.fillRect(-s*.55,y,s*1.1,1);
    x.fillStyle='#fff';const ey=Math.sin(t*2)*s*.04;
    x.fillRect(-s*.16,-s*.08+ey,s*.08,s*.05);x.fillRect(s*.08,-s*.08+ey,s*.08,s*.05);
  },
  bubble(x,s,t,e){
    const r=s*.42*(1+.04*Math.sin(t*2.4))*(e.charge?1.25+.04*Math.sin(t*14):1);
    for(let i=0;i<7;i++){const a=t*.8+i*.9,rr=r*(1.15+.12*Math.sin(t+i));x.strokeStyle='rgba(255,170,150,.5)';x.lineWidth=1.2;x.beginPath();x.arc(Math.cos(a)*rr,Math.sin(a)*rr*.85,s*(.03+(i%3)*.02),0,6.283);x.stroke();}
    x.globalCompositeOperation='lighter';glow(x,0,0,r*1.8,'rgba(255,60,60,A)',e.charge?.5:.28);x.globalCompositeOperation='source-over';
    const g=x.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);
    g.addColorStop(0,'rgba(255,220,180,.5)');g.addColorStop(.55,'rgba(255,80,60,.42)');g.addColorStop(1,'rgba(140,10,40,.75)');
    x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,6.283);x.fill();
    x.strokeStyle='rgba(255,220,220,.7)';x.lineWidth=2;x.beginPath();x.arc(0,0,r,0,6.283);x.stroke();
    x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.ellipse(-r*.42,-r*.45,r*.16,r*.08,-.7,0,6.283);x.fill();
    x.font=`${Math.round(s*.085)}px "DotGothic16",monospace`;x.textAlign='center';
    ['炎上','辞めろ','つまらん','#晒し'].forEach((w,i)=>{const a=t*.6+i*1.57;x.fillStyle=`rgba(255,240,200,${.6+.3*Math.sin(t*3+i)})`;x.fillText(w,Math.cos(a)*r*.48,Math.sin(a)*r*.42+s*.03);});
    x.fillStyle='#200008';x.beginPath();x.ellipse(-r*.22,-r*.02,r*.07,r*.12,0,0,6.283);x.ellipse(r*.22,-r*.02,r*.07,r*.12,0,0,6.283);x.fill();
  },
  crab(x,s,t,e){
    const sn=Math.max(0,Math.sin(t*4))*.35;
    x.strokeStyle='#8a3a20';x.lineWidth=s*.035;x.lineCap='round';
    for(let i=0;i<3;i++)[-1,1].forEach(d=>{x.beginPath();x.moveTo(d*s*.2,s*.05);x.lineTo(d*s*(.38+i*.06),s*(.12+Math.sin(t*5+i)*.02));x.lineTo(d*s*(.44+i*.07),s*.28);x.stroke();});
    const bg=x.createRadialGradient(0,-s*.05,s*.05,0,0,s*.35);bg.addColorStop(0,'#c86a3a');bg.addColorStop(1,'#5a2010');
    x.fillStyle=bg;x.beginPath();x.ellipse(0,0,s*.34,s*.2,0,0,6.283);x.fill();
    x.fillStyle='rgba(60,40,30,.6)';for(let i=0;i<6;i++){x.beginPath();x.arc(Math.cos(i)*s*.2,Math.sin(i*2)*s*.08,s*.025,0,6.283);x.fill();}
    [-1,1].forEach(d=>{
      x.save();x.translate(d*s*.42,-s*.18);x.rotate(d*(-.3));
      x.fillStyle='#b05a30';x.beginPath();x.ellipse(0,0,s*.14,s*.1,0,0,6.283);x.fill();
      x.fillStyle='#02040b';x.beginPath();x.moveTo(d*s*.02,0);x.lineTo(d*s*.16,-s*.04-sn*s*.08);x.lineTo(d*s*.16,s*.04+sn*s*.08);x.fill();x.restore();
    });
    x.strokeStyle='#8a3a20';x.lineWidth=s*.02;[-1,1].forEach(d=>{x.beginPath();x.moveTo(d*s*.08,-s*.15);x.lineTo(d*s*.1,-s*.27);x.stroke();x.fillStyle='#ffe060';x.beginPath();x.arc(d*s*.1,-s*.28,s*.03,0,6.283);x.fill();});
  },
  rust(x,s,t,e){
    const sway=Math.sin(t*1.1)*s*.02;
    x.strokeStyle='#4a3a30';x.lineWidth=s*.07;x.lineCap='round';
    [-1,1].forEach(d=>{const a=Math.sin(t*1.3+d)*.15;x.beginPath();x.moveTo(d*s*.26,-s*.1);x.lineTo(d*s*(.45+a*.2),s*.12);x.lineTo(d*s*.4,s*.32);x.stroke();
      x.fillStyle='#5a4030';x.fillRect(d*s*.4-s*.06,s*.3,s*.12,s*.08);});
    const bg=x.createLinearGradient(-s*.3,0,s*.3,0);bg.addColorStop(0,'#5a3424');bg.addColorStop(.5,'#8a5a3a');bg.addColorStop(1,'#4a2a1c');
    x.fillStyle=bg;x.fillRect(-s*.28+sway,-s*.2,s*.56,s*.5);
    x.fillStyle='#c08050';for(let i=0;i<4;i++){x.beginPath();x.arc(-s*.22+sway+i*s*.146,-s*.15,s*.015,0,6.283);x.arc(-s*.22+sway+i*s*.146,s*.25,s*.015,0,6.283);x.fill();}
    x.fillStyle='#d8a020';for(let i=0;i<5;i++)x.fillRect(-s*.26+sway+i*s*.11,s*.05,s*.05,s*.04);
    // 歯車の頭
    x.save();x.translate(sway,-s*.36);x.rotate(t*(e.armor?.5:1.4));
    x.fillStyle='#6a4a34';
    for(let i=0;i<10;i++){x.save();x.rotate(i*.628);x.fillRect(-s*.03,-s*.2,s*.06,s*.06);x.restore();}
    x.beginPath();x.arc(0,0,s*.16,0,6.283);x.fill();x.restore();
    x.globalCompositeOperation='lighter';glow(x,sway,-s*.36,s*.2,'rgba(255,40,40,A)',.6+.3*Math.sin(t*5));x.globalCompositeOperation='source-over';
    x.fillStyle='#ff3040';x.beginPath();x.arc(sway,-s*.36,s*.05,0,6.283);x.fill();
    if(e.armor){
      const al=.45+.25*Math.sin(t*4);x.save();x.translate(sway,-s*.05);
      x.beginPath();x.ellipse(0,0,s*.46,s*.52,0,0,6.283);x.fillStyle=`rgba(110,170,240,${al*.25})`;x.fill();
      x.strokeStyle=`rgba(170,215,255,${al+.2})`;x.lineWidth=2;x.stroke();x.clip();
      x.strokeStyle=`rgba(170,215,255,${al*.5})`;x.lineWidth=1;const hs=s*.09;
      for(let r=-6;r<=6;r++)for(let c=-4;c<=4;c++){const hx2=c*hs*1.75+(r%2)*hs*.87,hy=r*hs*1.5;x.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;x.lineTo(hx2+Math.cos(a)*hs,hy+Math.sin(a)*hs);}x.closePath();x.stroke();}
      const sy=((t*.6)%1)*s*1.04-s*.52;const g=x.createLinearGradient(0,sy-s*.06,0,sy+s*.06);g.addColorStop(0,'rgba(200,235,255,0)');g.addColorStop(.5,`rgba(200,235,255,${al*.6})`);g.addColorStop(1,'rgba(200,235,255,0)');x.fillStyle=g;x.fillRect(-s*.5,sy-s*.06,s,s*.12);
      x.restore();}
  },
  letters(x,s,t,e){
    for(let i=0;i<7;i++){
      const a=t*.9+i*.9,r=s*(.2+.14*Math.sin(t*.7+i)),px=Math.cos(a)*r*1.4,py=Math.sin(a)*r;
      x.save();x.translate(px,py);x.rotate(Math.sin(t*3+i)*.4);x.scale(1,.6+.4*Math.abs(Math.sin(t*6+i)));
      x.fillStyle='#e8e0d0';x.fillRect(-s*.12,-s*.08,s*.24,s*.16);
      x.strokeStyle='#a09080';x.lineWidth=1;x.beginPath();x.moveTo(-s*.12,-s*.08);x.lineTo(0,s*.01);x.lineTo(s*.12,-s*.08);x.stroke();
      x.fillStyle='#d02030';x.font=`${Math.round(s*.05)}px "DotGothic16",monospace`;x.textAlign='center';x.fillText('督促',s*.05,s*.06);
      x.restore();
    }
  },
  debt(x,s,t,e){
    const g=1+(e.grow||0)*.06,sw=Math.sin(t*.9)*s*.03;
    x.save();x.scale(g,g);
    for(let k=3;k>=0;k--){
      x.fillStyle=`rgba(${8+k*6},${4+k*3},${20+k*8},${k?.25:.95})`;const o=k*s*.025;
      x.beginPath();x.moveTo(-s*.08+sw,-s*.42-o);x.quadraticCurveTo(-s*.32-o,s*.1,-s*.34-o+sw,s*.5);
      for(let i=0;i<=6;i++)x.lineTo(-s*.34+i*s*.113,s*.5+Math.sin(t*2+i)*s*.03+o);
      x.quadraticCurveTo(s*.32+o,s*.1,s*.08+sw,-s*.42-o);x.fill();
    }
    x.fillStyle='#07040f';x.beginPath();x.arc(sw,-s*.48,s*.1,0,6.283);x.fill();
    x.fillRect(-s*.18+sw,-s*.56,s*.36,s*.03);x.fillRect(-s*.1+sw,-s*.66,s*.2,s*.11);
    x.fillStyle='#fff';const bl=(t%3.3)<.1?.2:1;
    x.beginPath();x.ellipse(-s*.04+sw,-s*.48,s*.025,s*.012*bl,-.2,0,6.283);x.ellipse(s*.04+sw,-s*.48,s*.025,s*.012*bl,.2,0,6.283);x.fill();
    x.strokeStyle='#100a20';x.lineWidth=s*.05;x.lineCap='round';
    x.beginPath();x.moveTo(-s*.2,-s*.25);x.quadraticCurveTo(-s*.44,s*.05,-s*.4+Math.sin(t*1.3)*s*.05,s*.32);x.stroke();
    x.beginPath();x.moveTo(s*.2,-s*.25);x.quadraticCurveTo(s*.42,-s*.05,s*.3,s*.12);x.stroke();
    x.fillStyle='#e8e0d0';x.save();x.translate(s*.3,s*.12);x.rotate(-.2);x.fillRect(-s*.1,-s*.07,s*.2,s*.14);
    x.fillStyle='#d02030';x.font=`${Math.round(s*.042)}px "Share Tech Mono",monospace`;x.textAlign='center';x.fillText('¥840,000',0,s*.01);x.fillText('残高',0,-s*.03);x.restore();
    x.restore();
  },
  sheep(x,s,t,e){
    const c=e.clones||0;
    for(let k=c;k>=0;k--){
      x.save();
      if(k){x.translate((k%2?-1:1)*s*(.3+k*.08),-s*.12-k*s*.04);x.scale(.55,.55);x.globalAlpha=.6;}
      const b=Math.sin(t*2+k)*s*.02;
      x.fillStyle='#1a1630';x.fillRect(-s*.2,s*.1,s*.05,s*.2);x.fillRect(s*.15,s*.1,s*.05,s*.2);
      const wool=['#5a5280','#4a4470','#6a6290'];
      for(let i=0;i<10;i++){const a=i*.628;x.fillStyle=wool[i%3];x.beginPath();x.arc(Math.cos(a)*s*.24,Math.sin(a)*s*.14+b,s*.12,0,6.283);x.fill();}
      x.fillStyle='#6a6290';x.beginPath();x.ellipse(0,b,s*.26,s*.16,0,0,6.283);x.fill();
      x.fillStyle='#14102a';x.beginPath();x.ellipse(s*.3,-s*.08+b,s*.11,s*.13,.3,0,6.283);x.fill();
      x.fillStyle='#ff4060';x.beginPath();x.arc(s*.28,-s*.1+b,s*.03,0,6.283);x.arc(s*.35,-s*.09+b,s*.03,0,6.283);x.fill();
      x.fillStyle='#fff';x.beginPath();x.arc(s*.28,-s*.1+b,s*.012,0,6.283);x.arc(s*.35,-s*.09+b,s*.012,0,6.283);x.fill();
      x.restore();
    }
    x.font=`${Math.round(s*.07)}px "DotGothic16",monospace`;x.textAlign='center';
    for(let i=0;i<3+c;i++){const a=t*.5+i*2.1;x.fillStyle=`rgba(200,190,255,${.3+.2*Math.sin(t+i)})`;x.fillText(`${i+1}匹`,Math.cos(a)*s*.55,Math.sin(a)*s*.4-s*.1);}
  },
  watcher(x,s,t,e){
    // 配信枠
    x.strokeStyle='rgba(200,180,255,.35)';x.lineWidth=2;x.strokeRect(-s*.62,-s*.42,s*1.24,s*.84);
    x.fillStyle='#e83055';x.fillRect(-s*.6,-s*.4,s*.16,s*.07);x.fillStyle='#fff';x.font=`${Math.round(s*.05)}px "Share Tech Mono",monospace`;x.textAlign='center';x.fillText('LIVE',-s*.52,-s*.345);
    x.fillStyle='rgba(255,255,255,.6)';x.fillText('👁 '+(e.count||'∞'),s*.48,-s*.345);
    // 小さな目
    for(let i=0;i<9;i++){const a=i*.7+t*.3,r=s*(.42+.05*Math.sin(t+i)),px=Math.cos(a)*r,py=Math.sin(a)*r*.62;
      const op=Math.sin(t*1.7+i*2)>-.3;x.fillStyle='#e8e0f0';x.beginPath();x.ellipse(px,py,s*.04,op?s*.022:s*.004,0,0,6.283);x.fill();
      if(op){x.fillStyle='#601030';x.beginPath();x.arc(px,py,s*.014,0,6.283);x.fill();}}
    // 大きな目
    const open=e.charge?1.15:.85+.15*Math.sin(t*.8);
    x.globalCompositeOperation='lighter';glow(x,0,0,s*.6,'rgba(200,40,120,A)',e.charge?.55:.3);x.globalCompositeOperation='source-over';
    x.fillStyle='#ddd4ea';x.beginPath();x.moveTo(-s*.34,0);x.quadraticCurveTo(0,-s*.3*open,s*.34,0);x.quadraticCurveTo(0,s*.3*open,-s*.34,0);x.fill();
    x.save();x.beginPath();x.moveTo(-s*.34,0);x.quadraticCurveTo(0,-s*.3*open,s*.34,0);x.quadraticCurveTo(0,s*.3*open,-s*.34,0);x.clip();
    const lx=Math.sin(t*.7)*s*.06,ly=Math.cos(t*.5)*s*.03;
    const ig=x.createRadialGradient(lx,ly,s*.02,lx,ly,s*.13);ig.addColorStop(0,'#ff6090');ig.addColorStop(.6,'#801040');ig.addColorStop(1,'#30041a');
    x.fillStyle=ig;x.beginPath();x.arc(lx,ly,s*.13,0,6.283);x.fill();
    x.fillStyle='#000';x.beginPath();x.arc(lx,ly,s*(e.charge?.03:.055),0,6.283);x.fill();
    x.fillStyle='#fff';x.fillRect(lx-s*.05,ly-s*.06,s*.025,s*.025);x.restore();
    x.strokeStyle='#2a0a1a';x.lineWidth=2;x.beginPath();x.moveTo(-s*.34,0);x.quadraticCurveTo(0,-s*.3*open,s*.34,0);x.stroke();
    // 周りを回るコメント
    x.font=`${Math.round(s*.048)}px "DotGothic16",monospace`;
    ['さっきも同じ話、聞きました','30日目まで見ています','寝たら終わりますよ','後ろ、雨の音だけじゃないですよ'].forEach((w,i)=>{
      const a=t*.35+i*1.57,r=s*.62;x.fillStyle=`rgba(255,160,190,${.45+.3*Math.sin(t*2+i)})`;x.fillText(w,Math.cos(a)*r*.75,Math.sin(a)*r*.6+s*.02);
    });
  },
};
FOES.echo=(x,s,t,e)=>FOES.noise(x,s,t,Object.assign({},e,{tint:'o'}));

// ══════════════════════════════════════════════════════════
// 海の亡者のデータ。pat は行動の順番（毎ターン予告される）
//   k: hit=攻撃 st=状態異常 swell=膨張 armor=装甲 grow=利息 clone=増殖 same=反復 count=秒読み
//   m: 攻撃倍率 big: 大技（守ると軽減） counter: 守るとはね返せる
// ══════════════════════════════════════════════════════════
const ENEMY={
  noise:{name:'ノイズの群れ',hp:34,atk:6,exp:14,weak:null,
    hint:'ただの雑音の群れです。落ち着いて「語る」で、ひとつずつ黙らせて。',
    pat:[{k:'hit',n:'ザザッ…という雑音',m:1},{k:'hit',n:'耳を刺すハウリング',m:1.2},{k:'st',st:'noise',n:'砂嵐',m:.4,d:'ノイズ：語る・歌うが弱まる'}]},
  bubble:{name:'炎上の泡',hp:66,atk:8,exp:30,weak:'talk',
    hint:'怒鳴り返したら膨らむだけ。「語る」が一番効きます。膨らんだら、破裂する前に「守る」。',
    pat:[{k:'hit',n:'罵声の泡',m:1},{k:'st',st:'burn',n:'飛び火',m:.5,d:'やけど：毎ターン少し削られる'},{k:'swell',n:'ぶくぶくと膨らむ',d:'次の一撃が重い'},{k:'hit',n:'破裂する罵声',m:2.3,big:true}]},
  crab:{name:'錆びた蟹',hp:52,atk:8,exp:20,weak:'fix',
    hint:'錆で関節が固まってます。「直す」で錆を落とせば、動きが鈍るはず。',
    pat:[{k:'hit',n:'はさみ',m:1},{k:'hit',n:'泡を吹く',m:.8},{k:'hit',n:'大ばさみ',m:1.8,big:true}]},
  rust:{name:'鉄錆の番人',hp:106,atk:11,exp:42,weak:'fix',armor:true,
    hint:'装甲があるうちは、ほとんど通りません。「直す」で継ぎ目を見抜いて。装甲は締め直されるから、そのたびに。',
    pat:[{k:'hit',n:'鉄の腕',m:1.1},{k:'st',st:'noise',n:'鉄粉の嵐',m:.5,d:'ノイズ：語る・歌うが弱まる'},{k:'hit',n:'「ライン停止ハ許サレナイ」',m:2.0,big:true},{k:'armor',n:'装甲を締め直す',d:'受けるダメージ半減'}]},
  letters:{name:'督促状の群れ',hp:62,atk:9,exp:24,weak:'sing',
    hint:'紙だから、湿らせればふやけます。「歌う」の息で、まとめて。',
    pat:[{k:'hit',n:'督促状の雨',m:1},{k:'st',st:'fear',n:'赤い「至急」の判',m:.6,d:'怯え：与えるダメージが下がる'},{k:'hit',n:'紙の刃',m:1.25}]},
  debt:{name:'借金取りの影',hp:140,atk:11,exp:52,weak:'guard',
    hint:'あの「取り立て」から逃げないで。「守る」で正面から受け止めれば、はね返せます。利息で強くなる前に。',
    pat:[{k:'hit',n:'督促',m:1},{k:'grow',n:'利息が膨らむ',d:'攻撃力が上がる'},{k:'hit',n:'取り立て',m:2.0,big:true,counter:true},{k:'st',st:'fear',n:'「払えるのか？」',m:.6,d:'怯え：与えるダメージが下がる'},{k:'hit',n:'督促',m:1},{k:'hit',n:'取り立て',m:2.0,big:true,counter:true}]},
  echo:{name:'残響のノイズ',hp:78,atk:12,exp:28,weak:'pray',
    hint:'眠りかけた頭に響く耳鳴り。「祈る」で、静けさを取り戻して。',
    pat:[{k:'hit',n:'残響',m:1},{k:'st',st:'sleepy',n:'低いうなり',m:.4,d:'眠気：ときどき動けない'},{k:'st',st:'noise',n:'耳鳴り',m:.5,d:'ノイズ：語る・歌うが弱まる'},{k:'hit',n:'残響の波',m:1.3}]},
  sheep:{name:'眠れぬ羊',hp:175,atk:17,exp:62,weak:'sing',
    hint:'子守唄です。「歌う」で、増えた羊ごと寝かしつけて。突進は守って。',
    pat:[{k:'st',st:'sleepy',n:'「いっぴき、にひき……」',m:.3,d:'眠気：ときどき動けない'},{k:'clone',n:'羊が増える',d:'群れが増えるほど攻撃が増す'},{k:'hit',n:'頭突き',m:1},{k:'clone',n:'羊が増える',d:'群れが増えるほど攻撃が増す'},{k:'hit',n:'群れの突進',m:1.6,big:true}]},
  watcher:{name:'名無しの観測者',hp:280,atk:21,exp:0,weak:'pray',
    hint:'「祈る」が届きます。同じ行動を続けると、あれは数えて、そのぶん強く刺してくる。秒読みが終わる時は、必ず守って。',
    pat:[{k:'same',n:'「さっきも同じ話、聞きました」',m:.8,d:'同じ行動を続けるほど痛い'},{k:'count',n:'「30日目まで見ています」',d:'……秒読みが始まった'},{k:'st',st:'fear',n:'「後ろ、雨の音だけじゃないですよ」',m:.9,d:'怯え：与えるダメージが下がる'},{k:'st',st:'sleepy',n:'「寝たら終わりますよ」',m:.5,d:'眠気：ときどき動けない'},{k:'hit',n:'「──見ています」',m:2.4,big:true}]},
};
const ST_LABEL={noise:'🔇ノイズ',burn:'🔥やけど',sleepy:'💤眠気',fear:'😨怯え',promise:'🤞指切り'};
const ST_TURNS={noise:2,burn:3,sleepy:2,fear:2};
const LIGHT_COL=['','255,90,110','255,170,60','255,215,110','150,200,255','240,250,255'];
const LIGHT_SKILL={
  1:{n:'届く声',  d:'声の灯：大ダメージ（装甲無視）'},
  2:{n:'確かな手',d:'手の灯：装甲を外し、3ターン亀裂'},
  3:{n:'指切り',  d:'約束の灯：大回復＋2ターン被ダメ半減'},
  4:{n:'おやすみ',d:'眠りの灯：敵の次の行動を眠らせる'},
};
const FLAVOR={
  talk:['「聞こえてるよ。ちゃんと」','「今日さ、工場でな──」','「ご機嫌よう。……少し、話そうか」','「大丈夫。ここにいる」','「お前の話も、聞かせてくれよ」'],
  sing:['かすれた声で、いつもの曲を口ずさむ。','小さく、子守唄みたいに歌う。','深呼吸して、サビだけ歌う。'],
  fix:['音を聴く。……ここだ。継ぎ目を叩く。','止めて、確かめて、直す。いつもの手順だ。','手が覚えている。配線をたどる。'],
  pray:['目を閉じて祈る。……朝が来ますように。','あの子の寝顔を思い出す。','誰かの「おやすみ」を思い出す。'],
};

// ══════════════════════════════════════════════════════════
// 物語。G は進行用の関数群（start() の中で作る）
//   行の書式  'n:地の文' 'd.表情:だんのうら' 'm.表情:ミナモ' 'c:あの子' 's:海の声'
//            'k.名前:コメント' 'e.名前:亡者' 'mq:？？？（ミナモ）'
//   演出      '#bg 背景 [変種]' '#bgnow 背景' '#hero on|off|x 位置' '#mina on|off|x' '#kid on|off'
//            '#foe 種類|off' '#var キー 値' '#se 音' '#bgm 曲' '#shake 強さ' '#flash' '#wait ms' '#float 文字'
// ══════════════════════════════════════════════════════════
const STORY={};
STORY[1]=async G=>{
  await G.say(['#bgnow night','#bgm night',
    'n:午前三時。配信終了のボタンを押した。',
    'n:最後のコメントは「おつ」だった気がする。誰のものだったかは、もう思い出せない。',
    'd.tired:「……同接、ゼロか」',
    'n:布団に倒れ込む。隣で、あの子の寝息。窓の外で、雨の音。',
    'n:──雨の音だけ、のはずだった。',
    '#se ghost','#float 後ろ、雨の音だけじゃないですよ',
    'n:耳の奥で、ざあ、と波が鳴った。']);
  await G.card(1,'room');
  await G.say(['#hero on .3',
    'n:気がつくと、水の中にいた。',
    'n:息はできる。冷たくもない。ただ、耳が痛いほど静かだ。',
    'n:見上げれば、はるか上で水面が揺れている。見下ろせば、瓦屋根がいくつも沈んでいた。朱の剥げた鳥居。崩れた欄干。',
    'n:そのど真ん中に、見慣れた机とモニターが置かれている。……俺の配信部屋だ。',
    'd.fear:「……壇ノ浦、か。名前負けにもほどがあるだろ」',
    '#mina on .74','#se notif',
    'mq.smile:「こんばんは。……ここだと、『おはよう』のほうが近いのかな」',
    'd.fear:「──誰だ」',
    'm:「ミナモ、って呼んでください。水面（みなも）のミナモ。本当の名前は、ずっと前にこの海に沈めちゃったので」',
    'm:「ここは、眠れない人がたどり着く海の底。八百年前に沈んだ都です」',
    'm.sad:「『波の下にも都の候ふぞ』──そう言われて、沈んでいった小さな帝がいたんですって」',
    'd:「縁起でもない話を、初対面でするなよ」',
    'm:「だんのうらさん。あなた、少しずつ落としてきてますよね。大事なもの」',
    'm:「声。手。約束。眠り。……それから、名前」',
    'm:「五つの灯（ともしび）です。全部、この海のどこかに沈んでる。拾いに行かないと──あなたも、この都の人になっちゃう」',
    'd:「待て。なんで俺の名前を知ってる」',
    'm.closed:「……さあ。どうしてでしょうね」']);
  await G.explore({hint:'沈んだ配信部屋を調べよう',spots:[
    {id:'mic',label:'沈んだマイク',x:.46,y:.25,run:()=>G.say([
      'n:アームの先で、安物のマイクが揺れている。今夜も、俺の声を待っていたはずのもの。',
      'd:「……ご機嫌よう、だんのうらです」',
      'n:声は、ぽこぽこと泡になって、上へ逃げていった。音にならない。',
      'd.fear:「声が……出ない？」',
      'm.sad:「ここでは、灯のない声は届かないんです。毎晩あんなに喋ってるのに、あなたの声、だいぶ前から空っぽでした」',
      'd.tired:「……言ってくれるな」'])},
    {id:'mon',label:'光るモニター',x:.68,y:.4,run:async()=>{
      await G.say([
        'n:モニターの中で、今夜のコメント欄が流れ続けている。',
        'k.夜空の旅人:こんばんは〜',
        'k.深夜の常連:今日も来ました',
        'k.さくら:声、落ち着きますね',
        '#se ghost',
        'k.???:さっきも同じ話、聞きました',
        'd.fear:「……またこいつか。最近、たまに出るんだよ」',
        'm.sad:「…………」',
        'n:ミナモは、なぜか目を逸らした。',
        'n:画面の隅で、文字が点滅している。《配信を終了しますか？》──視聴者数は、ゼロ。']);
      const c=await G.choice('どうする？',[{t:'「……まだ、誰かいるか？」と呼びかける',s:'届くかどうかは、わからない'},{t:'配信を終了する',s:'もう、誰もいないのだから'}]);
      if(c===0){G.f.ch1_call=1;await G.say([
        'd:「……まだ、誰かいるか？」',
        'n:泡になった声が、モニターに吸い込まれていく。しばらくして、たった一行。',
        'k.ひとりぼっち:いますよ',
        'd.happy:「……物好きだな」',
        'm.smile:「物好きですね」',
        'n:なぜかミナモが、少しだけ笑った。']);}
      else{G.f.ch1_end=1;await G.say([
        'n:終了ボタンを押す。画面が暗くなり、部屋に静けさが戻ってくる。',
        'n:その静けさは、思っていたより優しかった。',
        'm:「……おつかれさまでした」',
        'n:暗くなったモニターの裏に、小さな瓶が転がっていた。']);
        await G.item('ramune',1);}
    }},
    {id:'bub',label:'ざわめく泡',x:.18,y:.5,run:async()=>{
      await G.say([
        'n:床のあたりで、灰色の泡がざわざわと騒いでいる。近づくと、砂嵐の音がした。',
        '#foe noise',
        'm.surprise:「ノイズの群れ……！　この海の亡者です。疲れた心に寄ってくるの」',
        'm:「戦い方、教えますね。『語る』で話しかける。『歌う』は息を使うけど、少し楽になります」',
        'm:「危ない攻撃が来るときは『守る』。息も整います。……大丈夫、見てますから」']);
      await G.battle('noise',{tutorial:true});
      await G.say(['n:ノイズが散って、ただの水に戻った。',
        'm.smile:「上手です。……配信のときと同じ。ちゃんと、一人ずつに話しかけるんです」']);
    }},
  ],exit:{label:'部屋の奥へ',x:.86,y:.52}});
  await G.say(['#bg room deep','#hero on .26','#mina on .76','#foe bubble','#bgm kaidan',
    'n:部屋の奥で、巨大な泡がふくらんでいた。',
    'n:半透明の膜の中で、赤い文字が渦を巻いている。どれも、どこかで見た言葉だ。',
    'e.炎上の泡:「ツマラン」「辞メロ」「オマエノ声ナンカ、誰モ聞イテナイ」',
    'd.fear:「……炎上の泡、か。あの夜のやつだ」',
    'm:「あなたが一番怖がってる声です。でも見て──泡の真ん中」',
    'n:罵声の渦の中心で、小さな赤い灯が、マイクのランプみたいに点滅していた。',
    'd:「怒鳴り返せば、割れるか？」',
    'm:「逆です。怒鳴ったら、もっと膨らむ。……いつもみたいに、ちゃんと『語って』あげてください」',
    'm:「それと、膨らんだら気をつけて。破裂する前に、守って」']);
  await G.battle('bubble');
  await G.say(['#foe off','#flash','#bgm night',
    'n:ぱちん、と泡が弾けた。罵声はただの水になって、ほどけて消えた。',
    'n:中から、小さな灯がゆっくり降りてくる。赤くて、頼りない光。配信中のランプと同じ色。']);
  await G.light(1);
  await G.say([
    'd:「……あー、あー。聞こえるか？」',
    'n:今度は、泡にならなかった。自分の声が、ちゃんと水を震わせた。',
    'm.smile:「聞こえます。……ずっと、聞こえてました」',
    'd:「ずっと？」',
    'm.closed:「次の夜も、来てください。灯は、あと四つあります」',
    ...(G.f.ch1_call?['n:モニターの残骸に、もう一行だけコメントが流れた。','k.ひとりぼっち:おやすみなさい','n:ミナモは、それを見ないふりをした。']:[]),
    'n:はるか上の水面が、白く光る。',
    'n:──目覚ましより少しだけ早く、目が覚めた。喉が、すこし軽い。']);
  await G.finish(1);
};

STORY[2]=async G=>{
  await G.say(['#bgnow night','#bgm night',
    'n:夜勤明けの体で配信をして、あの子を寝かしつけて、そのまま床で眠った。',
    'n:手のひらに、まだ工具の感触が残っている。……いや、残っていない。何も、感じない。']);
  await G.card(2,'factory');
  await G.say(['#hero on .3','#mina on .74',
    'n:今夜の海は、機械油の匂いがした。',
    'n:錆びた配管が頭上を這い、止まったコンベアが海底を横切っている。……見覚えがある。俺の職場だ。夢でまで。',
    'd.fear:「……手が」',
    'n:両手が、水に溶けたように透けていた。指を握っても、感触がない。',
    'm:「手の灯です。毎日あんなに使ってるのに、あなたは自分の手を信じてない」',
    'm.smile:「先週の配信で言ってましたよね。『ベアリングの音で、だいたい分かる』って。あれ、かっこよかったです」',
    'd:「……聞いてたのか、あんな話」',
    'm:「聞いてました。雑談の中で、一番好きでした」',
    'd:「物好きだな、ほんとに」']);
  await G.explore({hint:'海底の工場を調べよう',spots:[
    {id:'conv',label:'止まったコンベア',x:.55,y:.56,run:async()=>{
      await G.say(['n:コンベアのローラーに、何かが挟まっている。',
        'n:……錆だらけの蟹だ。はさみをカチカチ鳴らして、ラインを止めている。',
        '#foe crab','m.surprise:「来ます！」']);
      await G.battle('crab');
      await G.say(['#var conveyor 1','n:蟹が逃げていくと、コンベアがゆっくり回りはじめた。',
        'd:「……動いた」','m.smile:「ね。直せるじゃないですか」']);
    }},
    {id:'panel',label:'制御盤',x:.8,y:.3,run:async()=>{
      await G.say(['n:制御盤のランプが、赤く点滅している。小さな画面に《ERR 404》。',
        'd:「インターロックが噛んでる。……ラダー図、どこだ」',
        'n:扉を開けると、配線が海藻のように揺れていた。透けた指では、ドライバーがうまく掴めない。',
        'm:「……私に、何かできますか？」']);
      const c=await G.choice('どうする？',[{t:'ミナモに工具を渡して、手伝ってもらう',s:'一人で抱えなくていいのかもしれない'},{t:'一人で直す。いつもそうしてきた',s:'自分の手で、確かめたい'}]);
      if(c===0){G.f.ch2_share=1;await G.say([
        'd:「これ、持っててくれ。ここを照らしてくれればいい」',
        'm.surprise:「え、私？　工具なんて触ったこと……」',
        'd:「持ってるだけでいい。一人だと、手が足りないんだ」',
        'n:ミナモの淡い光が、配線の奥を照らす。絡まった一本が見えた。',
        '#var fixed 1','#se repair','n:ぱちん。ランプが緑に変わる。',
        'm.smile:「……誰かと一緒に何かを直すの、初めてです」',
        'd:「現場じゃ当たり前のことだよ。……俺が、忘れてただけだ」']);}
      else{G.f.ch2_alone=1;await G.say([
        'd:「いい。慣れてる」',
        'n:感覚のない指で、何度も、何度も、配線をたどる。',
        '#var fixed 1','#se repair','n:……あった。ぱちん。ランプが緑に変わる。',
        'd:「よし」',
        'm.sad:「……そうですね。あなたは、いつも一人で直す」',
        'n:その声は、少しだけ寂しそうだった。',
        'n:透けていた指先に、ほんの少し感覚が戻った。（以後「直す」が強くなる）']);}
    }},
    {id:'locker',label:'ロッカー',x:.46,y:.3,run:async()=>{
      await G.say(['n:自分のロッカーを開ける。作業着の内側に、一枚の絵が貼ってあった。',
        'n:クレヨンで描かれた、ヘルメットの男。《パパのおしごと》。',
        'd.happy:「……実物より、だいぶ強そうだな」',
        'm.smile:「きっと、そう見えてるんですよ。あの子には」',
        'n:絵の裏に、桜色の貝がひとつ挟まっていた。']);
      await G.item('shell',1);
    }},
  ],exit:{label:'プレス機の奥へ',x:.2,y:.44}});
  await G.say(['#hero x .42','#foe rust','#bgm kaidan',
    'n:奥のプレス機が、誰もいないのに動き続けている。',
    'n:錆びた鉄の巨体。歯車の頭の真ん中で、赤いランプがひとつ、こちらを睨んでいた。',
    'e.鉄錆の番人:「ライン停止ハ、許サレナイ。止マッタラ、オマエノ価値ハ、ナイ」',
    'd.tired:「……どこかで聞いたな、それ」',
    'm:「あの機械、あなたの手の灯を燃料にして動いてます。止めないと」',
    'm:「装甲が硬いです。まず『直す』で継ぎ目を見つけて。大きく振りかぶったら、守って」']);
  await G.battle('rust',{ally:!!G.f.ch2_share});
  await G.say(['#foe off','#var stopped 1','#flash','#bgm night',
    'n:番人が、軋みながら膝をついた。歯車がゆっくり止まる。',
    'd:「止まった機械は、壊れたんじゃない。……休んでるだけだ」',
    'n:鉄の胸が開き、中から灯がひとつ浮かび上がった。油に濡れたような、琥珀色の光。']);
  await G.light(2);
  await G.say(['n:透けていた両手に、輪郭が戻ってくる。握る。……ちゃんと、握れる。',
    'm:「さっきの言葉、自分にも言ってあげてください。止まっても、休んでるだけだって」',
    'd:「……善処する」',
    '#se ghost','#float 30日目まで見ています',
    'n:壁のモニターに、一行だけコメントが流れた。',
    'k.存在しないID:30日目まで見ています',
    'd.fear:「……この海、配信と繋がってるのか」',
    'm.sad:「見てる人が、敵だとは限りませんよ」',
    'n:ミナモはそれだけ言って、水面のほうを見上げた。',
    'n:──起きると、指先に、かすかに油の匂いが残っている気がした。']);
  await G.finish(2);
};

STORY[3]=async G=>{
  await G.say(['#bgnow night','#bgm night',
    'n:保育園の連絡帳に、先生の字。',
    'n:《最近、お迎えの時間が遅くなっていて、お子さんが少し寂しそうです》',
    'n:返事を書こうとして、ペンが止まったまま、眠ってしまった。']);
  await G.card(3,'nursery');
  await G.say(['#hero on .3','#mina on .74',
    'n:珊瑚の森の奥に、小さな園舎が沈んでいた。',
    'n:止まった時計。窓の灯り。チューリップの花壇。……あの子の保育園に、よく似ている。',
    '#kid on .56','c:「パパ！」',
    'd.fear:「──おい！」',
    'n:黄色い帽子の小さな影が、笑いながら珊瑚の向こうへ駆けていく。','#kid off',
    'm:「約束の灯は、あの子が持ってます。……あの子も、あなたを探してるみたい」']);
  await G.explore({hint:'珊瑚の保育園を調べよう',spots:[
    {id:'shoe',label:'下駄箱',x:.38,y:.4,run:async()=>{
      await G.say(['n:小さな靴が一足だけ残っている。名札の字が、水に滲んで読めない。',
        'd:「……俺が書いた字だ。油性ペンで書けって言われてたのに」',
        'm:「読めなくても、ちゃんとあの子の靴だって分かるんですね」',
        'n:靴の中に、光る小瓶が入っていた。']);
      await G.item('ramune',1);}},
    {id:'swing',label:'ブランコ',x:.86,y:.42,run:()=>G.say([
      'n:誰も乗っていないブランコが、ゆっくり揺れている。',
      'n:きい、きい、という音にまじって、声が聞こえた。',
      'c:「パパ、おむかえ、いちばんにきてね」',
      'd.tired:「……一番は、無理だったな。いつも最後だ」',
      'm:「最後でも、来てくれる人がいるのは……」',
      'n:ミナモは、そこで言葉を切った。',
      'm.sad:「……なんでもないです。待ってる側は、待ってるあいだ、ずっとひとりぼっちなんです。それだけ」'])},
    {id:'post',label:'郵便受け',x:.16,y:.38,run:async()=>{
      await G.say(['n:園の郵便受けから、封筒があふれ出している。赤い判子。《督促》《至急》《最終通知》。',
        'd.fear:「……なんで、ここにまで」',
        'n:封筒が、羽ばたくように一斉に舞い上がった。','#foe letters']);
      await G.battle('letters');
      await G.say(['n:紙の群れはふやけて、珊瑚のあいだに沈んでいった。',
        'm:「大丈夫ですか」','d.tired:「慣れてる。……慣れたくはないけどな」']);}},
  ],exit:{label:'園庭へ',x:.52,y:.52}});
  await G.say(['#var lit 1','#hero x .26','#mina x .82','#kid on .54',
    'n:園庭の真ん中に、あの子が立っていた。両手で、小さな灯を抱えている。',
    'c:「パパ、おそい」',
    'd.happy:「……ごめんな」',
    'c:「あのね。こんどのえんそく、パパもくる？」',
    'n:来月の遠足。保護者参加。平日。……シフトは、まだ出ていない。']);
  const c=await G.choice('あの子に、なんと答える？',[{t:'「行く。約束する」',s:'約束は、守るためにある'},{t:'「……行けるか、まだ分からない。ごめん」',s:'嘘は、つきたくない'}]);
  if(c===0){G.f.ch3_promise=1;await G.say([
    'd:「行く。約束する」',
    'c:「ほんと？　ゆびきり！」',
    'n:小さな小指が、透けた俺の小指に絡む。冷たい海の中で、そこだけが温かい。',
    'm:「……約束は、守るために起きなきゃいけないんですよ」',
    'd:「分かってる」']);}
  else{G.f.ch3_honest=1;await G.say([
    'd:「……行けるか、まだ分からない。ごめん」',
    'c:「…………うん。しってた」',
    'n:あの子は、笑った。慣れた笑い方だった。それが、一番こたえた。',
    'm.sad:「正直なのは、悪いことじゃないです。……でも」',
    'd:「分かってる。分かってるよ」',
    'n:嘘をつかなかった声は、少しだけ強くなった気がした。（以後「語る」が強くなる）']);}
  await G.say(['#se ghost','#shake 7','#foe debt','#bgm kaidan',
    'n:そのとき、園庭に長い影が差した。',
    'n:帽子をかぶった、背の高い影。長すぎる腕の先に、分厚い帳簿をぶら下げている。',
    'e.借金取りの影:「八十四万。利息を入れれば、もっとだ」',
    'e.借金取りの影:「遠足？　保育料も払えるかどうかの男が。……その灯は、担保にもらっていく」',
    '#kid off','n:あの子の姿が、ふっと消えた。灯だけが、影の帳簿に吸い込まれていく。',
    'd.fear:「──返せ！」',
    'm:「落ち着いて！　あの影の『取り立て』は重い。でも正面から『守れ』ば、はね返せます」',
    'm:「逃げないで。受け止めて、押し返すんです」']);
  await G.battle('debt');
  await G.say(['#foe off','#flash','#bgm night',
    'n:影がしぼんで、一枚の紙きれになった。《残高　￥840,000》。',
    'd:「……減らすさ。少しずつな。それしかない」',
    'n:紙が破れて、灯がこぼれ落ちる。','#kid on .54',
    'c:「パパ、これ」',
    'n:あの子が、拾った灯を両手で差し出してくる。日だまりみたいな、金色の光。']);
  await G.light(3);
  await G.say([...(G.f.ch3_promise?['c:「えんそく、やくそくだよ」','d.happy:「ああ。約束だ」']:['c:「パパ、むりしないでね」','d.tired:「……それ、パパのセリフなんだけどな」']),
    '#kid off','n:あの子が、泡になって水面へ昇っていく。',
    'm.closed:「……いいなあ」',
    'd:「なにが」',
    'm:「私ね、ずっと、夜はひとりでした。誰も帰ってこない部屋で、眠れなくて」',
    'm:「それで、あなたの配信をつけっぱなしにして、目を閉じてたんです」',
    'd.fear:「……リスナー、なのか。お前」',
    'm.smile:「次の夜に、ちゃんと話します。……今夜は、あの子の夢を見てあげてください」',
    'n:──目が覚めると、あの子が俺の小指を握ったまま眠っていた。']);
  await G.finish(3);
};

STORY[4]=async G=>{
  await G.say(['#bgnow night','#bgm night',
    'n:何日、まともに寝ていないんだろう。三日か、四日か。',
    'n:目を閉じても、まぶたの裏で通知が光る。工場のアラームが鳴る。コメントが流れる。',
    'n:……眠るのが、怖い。眠ったら、何かが終わってしまう気がする。']);
  await G.card(4,'corridor');
  await G.say(['#hero on .3','#mina on .7',
    'n:果てのない回廊に、石灯籠が並んでいた。',
    'n:ひとつひとつに火が入っている。消えることなく、ずっと。',
    'm:「眠らない灯籠。眠れなかった夜の数だけ、ここに灯がともるんです」',
    'd.tired:「……ずいぶん、たくさんあるな」',
    'm.sad:「ほとんど、あなたのです。……少しだけ、私のも」']);
  await G.explore({hint:'灯籠の回廊を調べよう',spots:[
    {id:'words',label:'灯籠の文字',x:.2,y:.38,run:()=>G.say([
      'n:灯籠の火袋に、文字が浮かんでいる。見覚えのある言葉。',
      '#se ghost','k.…:寝たら終わりますよ',
      'd.fear:「……配信に出てた、気味の悪いコメントだ」',
      'm.sad:「それ、書いたの、私です」',
      'd.fear:「──は？」',
      'm:「この海の浅いところから、ずっと見てたんです。あなたが、毎晩少しずつ沈んでいくのを」',
      'm:「『寝たら終わりますよ』は、『ここで眠ったら、もう戻れない』って意味でした」',
      'm:「『後ろ、雨の音だけじゃないですよ』は──あなたの後ろに、もう海が来てたから」',
      'm.sad:「言葉って、海を通ると、あんなふうに歪んじゃうんです。……怖がらせて、ごめんなさい」',
      'd.tired:「……心臓に悪いんだよ、あれ」',
      'm.smile:「ですよね」'])},
    {id:'lone',label:'小さな灯籠',x:.8,y:.38,run:()=>G.say([
      'n:回廊の端に、ひとつだけ小さな灯籠がある。火袋に、ハンドルネームが刻まれていた。',
      'n:《ひとりぼっち》',
      'd:「……いつも『こんばんは』の一言だけ書いて、最後までいる人だ」',
      'm.closed:「はい。……それしか、言えなかったから」',
      'm:「眠れない夜に、あなたの声だけが、ちゃんと人間の声でした。工場の話も、子どもの話も、くだらない雑談も」',
      'm:「私、死んでなんかいませんよ。どこかの部屋で、眠れないまま、眠ってるだけ」',
      'm.sad:「でも、あんまり長くここにいたから……浮かび方を、忘れちゃいました」',
      'd:「……ミナモ」',
      'm.smile:「そう呼んでくれるの、けっこう好きです」'])},
    {id:'echo',label:'うなる闇',x:.5,y:.3,run:async()=>{
      await G.say(['n:回廊の奥の闇が、低くうなっている。眠りかけた頭に響く、あの耳鳴りの音。','#foe echo']);
      await G.battle('echo');
      await G.say(['n:残響が消えると、回廊は少しだけ静かになった。']);}},
  ],exit:{label:'回廊の果てへ',x:.5,y:.56}});
  await G.say(['#hero x .3','#mina x .7',
    'n:回廊の果てに、ひときわ明るい灯籠が浮かんでいた。',
    's:「これを持っていきなさい」',
    'n:どこからともなく、水そのものが喋るような声。',
    's:「眠らない灯籠。これがあれば、もう眠らなくていい。配信も、工場も、子育ても、借金も。ぜんぶ、ぜんぶ、できる」',
    'm.surprise:「だんのうらさん……！」']);
  const c=await G.choice('眠らない灯籠を……',[{t:'受け取る',s:'眠らずに済むなら、もっと戦える'},{t:'吹き消す',s:'眠るのは、負けじゃない'}]);
  if(c===0){G.f.ch4_lantern=1;await G.say([
    'n:灯籠を掴む。熱い。体の奥から、力がみなぎってくる。眠気が、きれいに消える。（以後、戦闘で力と息が増す）',
    'd:「……これで、いい。これで、まだやれる」',
    'm.sad:「…………」',
    'n:ミナモは何も言わなかった。ただ、回廊の灯籠が、ひとつ増えた。']);}
  else{G.f.ch4_rest=1;await G.say([
    'd:「いらない」',
    'n:息を吹きかける。灯籠の火が、ふっと消えた。',
    '#var dim 1','n:回廊の灯籠が、ひとつ、またひとつ、静かに消えていく。暗くなるのに、不思議と怖くない。',
    'd:「眠るのは、負けじゃない。……あいつに教えてることだ。俺が守らなくてどうする」',
    'm.smile:「……はい」',
    'n:（以後、戦闘をいつも万全の体力で始められる）']);}
  await G.say(['#foe sheep','#se ghost','#bgm kaidan',
    'n:暗がりから、もこもこした影が這い出してきた。',
    'e.眠れぬ羊:「いっぴき……にひき……さんびき……」',
    'n:数えても数えても眠れない、赤い目の羊。数えるたびに、群れが増えていく。',
    'm:「眠れぬ羊……！　あれ、数えるほど増えます」',
    'm:「だんのうらさん、子守唄、歌えますか。あの子に歌ってる、あれ」',
    'd:「……下手だぞ」',
    'm.smile:「知ってます。でも、あれがいいんです」']);
  await G.battle('sheep');
  await G.say(['#foe off','#flash','#bgm night',
    'n:ねんねん、ころりよ。かすれた声で歌い終えると、羊たちは一匹ずつ丸くなって、寝息を立てはじめた。',
    'n:最後の一匹の毛の中から、青白い灯が転がり出る。月明かりみたいな、静かな光。']);
  await G.light(4);
  await G.say([
    'n:ふと見ると、ミナモも灯籠にもたれて、うとうとしていた。',
    'n:その輪郭が、少しだけ、薄くなっている。',
    'd.fear:「おい、ミナモ」',
    'm.closed:「……ん。久しぶりに、眠くなりました。あなたの歌のせい」',
    'm:「次が、最後です。名前の灯は、渦の底。……あそこには、私の名前も沈んでる」',
    'm.sad:「だんのうらさん。最後の夜、たぶん海は、本気であなたを引き止めます」',
    'n:──目が覚めた。久しぶりに、夢の途中で飛び起きなかった。']);
  await G.finish(4);
};

STORY[5]=async G=>{
  await G.say(['#bgnow night','#bgm night',
    'n:配信のタイトルを打ちかけて、手が止まった。',
    'n:《ご機嫌よう、■■■■です》──自分の名前が、出てこない。',
    'n:だんのうら。……本名は。本名は、なんだったか。',
    'n:考えているうちに、雨の音が、波の音に変わった。']);
  await G.card(5,'vortex');
  await G.say(['#hero on .3','#mina on .72',
    'n:沈んだ都の、そのまた底。',
    'n:御所の屋根も、鳥居も、すべてが巨大な渦に向かって傾いていた。渦のまわりを、無数の文字が回っている。',
    'n:名前だ。誰かの名前。誰かが、誰かを呼んだ声。',
    'd.fear:「……俺の名前、なんだっけ」',
    'm.sad:「だから、ここは怖いんです。名前を忘れたら、もう誰にも呼ばれない」',
    'm:「呼ばれない人は、浮かび上がれない。……私みたいに」']);
  await G.explore({hint:'名前を呑む渦を調べよう',spots:[
    {id:'palace',label:'沈んだ御所',x:.2,y:.5,run:()=>G.say([
      'n:傾いた御所の奥に、小さな玉座のようなものが沈んでいる。',
      'm:「八百年前、八歳の帝が、ここに沈みました。抱いて飛び込んだおばあさんが言ったんです」',
      'm:「『波の下にも、都の候ふぞ』──海の底にも都がありますよ、って」',
      'm.sad:「……優しい嘘だったんだと思います。怖くないように」',
      'd:「……俺は、あいつにそういう嘘はつかない」',
      'd:「怖いもんは怖い。でも、朝は来る。そう言ってやりたい」',
      'm.smile:「それ、すごく、父親っぽいです」'])},
    {id:'names',label:'漂う名前',x:.5,y:.58,run:async()=>{
      await G.say(['n:渦の縁を、三つの名前が漂っている。どれも、俺の名前だ。',
        'n:《だんのうら》。《■■ ■■》──滲んで読めない本名。それから、クレヨンみたいな字の《パパ》。',
        'm:「急いで。全部は無理です。……ひとつ、先に掴んで」']);
      const c=await G.choice('どの名前を掴む？',[{t:'《だんのうら》',s:'夜に居場所をくれた名前'},{t:'《■■ ■■》',s:'言えない、けれど本当の名前'},{t:'《パパ》',s:'毎朝、あの子が呼ぶ名前'}]);
      if(c===0){G.f.ch5_handle=1;await G.say(['n:《だんのうら》を掴む。マイクの前の、少しだけ強い自分。',
        'd:「ご機嫌よう、だんのうらです。……ああ、これは覚えてる」','n:（最終戦で「語る」「歌う」が強くなる）']);}
      else if(c===1){G.f.ch5_true=1;await G.say(['n:滲んだ名前を掴む。読めない。……でも、知っている。',
        'd:「本名は、言えない。でも、俺は知ってる。親がつけた、俺の名前だ」','n:（最終戦で最大HPが増える）']);}
      else{G.f.ch5_papa=1;await G.say(['n:《パパ》を掴む。ぎざぎざの、クレヨンの字。',
        'd.happy:「……一番よく呼ばれてる名前だな」','m.smile:「一番、強い名前です」','n:（最終戦の始めに、体も息も満ちる）']);}
    }},
    {id:'list',label:'リスナーの名前',x:.82,y:.48,run:async()=>{
      await G.say(['n:渦の外側を、見覚えのある名前たちが回っている。',
        'n:《夜空の旅人》《深夜の常連》《さくら》《ひとりぼっち》。',
        'd:「……みんな、名前を持って来てくれてたんだな。毎晩」',
        'm:「呼ばれた名前は、沈まないんです。……だから、私はまだ、ここにいられた」',
        'n:「さくら」の字のそばに、桜色の貝が光っていた。']);
      await G.item('shell',1);}},
  ],exit:{label:'渦の中心へ',x:.5,y:.2}});
  await G.say(['#foe watcher','#se ghost','#shake 10','#bgm mental',
    'n:渦の中心が、ゆっくりと開いた。',
    'n:目だった。配信画面の枠に囲まれた、巨大な目。そのまわりを、見覚えのあるコメントが回っている。',
    'e.名無しの観測者:「さっきも同じ話、聞きました」',
    'e.名無しの観測者:「30日目まで、見ています」',
    'd.fear:「……お前は、誰だ」',
    'e.名無しの観測者:「誰デモナイ。オマエガ『見ラレテイル』ト思ッタ、スベテノ目ダ」',
    'e.名無しの観測者:「失望スル目。笑ウ目。数エル目。……眠レ。ココデハ、誰モオマエヲ評価シナイ」',
    'm:「あれは、この海そのものです。あなたが怖がってきた、全部の目の形をしてる」',
    'm:「『祈る』が届きます。それと──同じことばかり繰り返さないで。あれは、それを数えてる」']);
  await G.battle('watcher',{final:true,half:()=>G.say([
    '#se ghost','e.名無しの観測者:「寝タラ、終ワリマスヨ」',
    'n:観測者が、ミナモの声で喋った。',
    'm.surprise:「……違う！」',
    'm:「それは、私の言葉です！　『ここで眠ったら戻れない』って、そういう意味で……！　勝手に使わないで！」',
    'n:ミナモが、だんのうらの前に出た。半透明の体が、目の光を受けて揺れる。',
    'm:「だんのうらさん。私、浮かび方を忘れてたんです。でも、あなたの声がずっと上から聞こえてたから、ここにいられた」',
    'm.smile:「今度は、私の番です。……見てるだけじゃなくて、隣にいます」',
    'n:（ミナモが加勢した。ときどき回復し、観測者の力を削ぐ）'])});
  await G.say(['#foe off','#flash','#var calm 1',
    'n:巨大な目が、ゆっくりと閉じていく。',
    'n:まわりを回っていたコメントが、ひとつずつほどけて、ただの文字に戻った。《こんばんは》《おつ》《また来ます》。',
    'n:渦の底から、最後の灯が浮かび上がる。白い、まっさらな光。']);
  await G.light(5);
  await G.say(['#bg abyss','#hero on .32','#mina on .7','#bgm night',
    'n:五つの灯が、胸の中で静かに燃えている。',
    'n:けれど、足もとの都に、温かい灯りがともりはじめた。',
    's:「波の下にも、都はあるよ」',
    's:「ここには借金もない。目覚ましもない。締め切りも、評価も、炎上もない」',
    ...(G.f.ch4_lantern?['s:「眠らない灯籠を、まだ持っているね。……ほら、もう朝なんて来なくていい。ずっと、ここで起きていればいい」']:[]),
    's:「その子と一緒に、ずっとここにいればいい」',
    'm.sad:「……私、いいですよ。ここで。だんのうらさんが一緒なら」',
    'n:ミナモが、ほんの少しだけ、そう言った。本心かどうかは、分からなかった。']);
  const c=await G.choice('沈むか、這い上がるか。',[{t:'朝を選ぶ',s:'水面へ。あの子が待つ朝へ'},{t:'ここで眠る',s:'もう、何も失わなくていい'}]);
  if(c===1)return G.ending('sink');
  return G.ending(G.anchors()>=3?'true':'wake');
};

// ── エンディング ──
const ENDS={
  true:{name:'目覚め ── 二人の朝',bg:'dawn',bgm:'rebirth',
    scene:['#bg dawn','#hero on .4','#mina on .62',
      'd:「……朝を選ぶ」',
      'm.sad:「そうですよね。……じゃあ、ここでお別れ──」',
      'd:「何言ってんだ。お前も来るんだよ」',
      'm.surprise:「え」',
      'd:「リスナー置いて、先に寝落ちする配信者がいるか。……行くぞ、ミナモ」',
      'n:透けた手を、掴む。今度は、ちゃんと掴めた。',
      'n:そのとき、はるか上から、声が降ってきた。',
      'c:「パパ！　あさだよ！」',
      'n:《パパ》。その名前が、錨を引き上げるみたいに、二人を水面へ引っぱっていく。',
      'm.smile:「……あったかい」',
      'n:光。泡。雨上がりの匂い。'],
    body:'目を開けると、あの子が胸の上に乗っていた。\n「パパ、おきた！」\n\n雨は止んでいた。\nスマホに、通知がひとつ。\n\n《ひとりぼっち：おはようございます。\n久しぶりに、朝に起きました。\n本当の名前は──今夜、配信で言います》',
    last:'「ここが、俺の壇ノ浦だ。沈むか、這い上がるか。\n──今日は、這い上がる。」'},
  wake:{name:'目覚め',bg:'dawn',bgm:'rebirth',
    scene:['#bg dawn','#hero on .4','#mina on .62',
      'd:「……朝を選ぶ。ミナモ、来い」',
      'n:手を伸ばす。指先が触れる。……すり抜けた。',
      'm.smile:「先に行ってください。私は、もう少しだけ、ここで──見てます」',
      'm:「30日目まで。ちゃんと、見てますから」',
      'd:「……ああ。見ててくれ」',
      '#mina off','n:水面が近づく。目覚ましの音が、まっすぐに聞こえる。'],
    body:'目覚ましが鳴っている。\n朝だ。ちゃんと、朝だ。\n\nあの子の寝顔を見て、少しだけ泣いた。\n\nその夜、配信のコメント欄に一行。\n《30日目まで見ています》\n\n──もう、怖くはなかった。',
    last:'「ここが、俺の壇ノ浦だ。沈むか、這い上がるか。\n──とりあえず今日は、這い上がった。」',
    hint:'朝へつなぎとめる選択が、もう少し多ければ──ミナモの手も、掴めたかもしれない。'},
  sink:{name:'沈眠',bg:'abyss',bgm:'collapse',dark:true,
    scene:['d.tired:「……少しだけ、眠らせてくれ」',
      'm.surprise:「だめ……！　だんのうらさん！」',
      'n:都の灯りが、やさしく近づいてくる。体が温かい。もう、何も考えなくていい。',
      's:「おかえり」',
      'n:遠くで、目覚ましが鳴っている。十回。二十回。',
      'c:「……パパ？　パパ、おきて」',
      'n:その声も、水の向こうで、少しずつ遠く──'],
    body:'目が覚めたのは、九時四十分だった。\n\n保育園に電話をかける。\n工場に電話をかける。\nあの子は、黙って朝ごはんを待っていた。\n\n夜。配信をつけると、コメントがひとつ。\n《存在しないID：おかえりなさい。また今夜》',
    last:'「ここが、俺の壇ノ浦だ。沈むか、這い上がるか。\n──今夜も、少しだけ沈んだ。」'},
};

// 再プレイ（全章クリア後の見返し）だけで聞ける、ミナモの追加のセリフ
const REPLAY_EXTRA={
  1:['#mina on .74','m.smile:「……また来てくれたんですね。二度目の夢は、少しだけ優しいですよ」','m:「この頃の私、まだ名前も言えなかったんです。ずるいですよね」'],
  2:['#mina on .74','m:「この夜のこと、覚えてます。工具の重さ、初めて知った夜」','m.smile:「ベアリングの話、もう一回してくれてもいいですよ」'],
  3:['#mina on .74','m.sad:「ここは、何度来ても少しだけ苦しいです。待ってる子の気持ち、知ってるから」','m.smile:「でも今は、迎えに来る人がいるって知ってる」'],
  4:['#mina on .7','m:「あのコメントの意味、もう分かってますよね。……この回廊、前より少し暗いです。いいことです」'],
  5:['#mina on .72','m:「最後の夜をもう一度、ですか」','m.smile:「何度見ても、選ぶのはあなたです。……私はちゃんと、隣にいますから」'],
};
const CMDS=[
  {k:'talk', l:'語る',c:0,d:'言葉で語りかける。息を使わない基本の行動。'},
  {k:'sing', l:'歌う',c:6,d:'歌でダメージを与え、自分も少し回復する。'},
  {k:'fix',  l:'直す',c:5,d:'継ぎ目を見抜く。装甲を外し、2ターン亀裂（受けるダメージ増）。'},
  {k:'guard',l:'守る',c:0,d:'身を固める。被ダメージを大きく減らし、状態異常を防ぐ。息+5。'},
  {k:'pray', l:'祈る',c:7,d:'大きく回復し、状態異常を治す。'},
  {k:'light',l:'灯す',c:0,d:'取り戻した灯の力を使う（戦闘ごとに各1回）。'},
  {k:'item', l:'道具',c:0,d:'道具を使う。'},
  {k:'look', l:'見る',c:0,d:'相手をよく見る。弱点の手がかり（ターンを使わない）。'},
];
const PAR={noise:3,bubble:6,crab:4,rust:7,letters:4,debt:8,echo:4,sheep:8,watcher:13};
const RANK_V={S:4,A:3,B:2,C:1};
const SPEEDS=[24,42,90,9999],SPEED_N=['ゆっくり','ふつう','はやい','瞬間'];

// ── 効果音：AU.se に加えて、Web Audio で短い音を合成（AU.ctx がある時だけ） ──
function sfx(type){
  try{
    const vol=(typeof AUDIO_SET!=='undefined'&&AUDIO_SET)?+AUDIO_SET.se:1;
    if(!vol||typeof AU==='undefined')return;
    if(!AU.ctx&&AU.init)AU.init();
    const c=AU.ctx;if(!c)return;
    if(c.state==='suspended'){c.resume().catch(()=>{});return;}
    const now=c.currentTime;
    const tone=(f,d,tp='sine',g=.05,at=0,f2)=>{const o=c.createOscillator(),gn=c.createGain();o.type=tp;o.frequency.setValueAtTime(f,now+at);if(f2)o.frequency.exponentialRampToValueAtTime(f2,now+at+d);gn.gain.setValueAtTime(.0001,now+at);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,g*vol),now+at+.008);gn.gain.exponentialRampToValueAtTime(.0001,now+at+d);o.connect(gn);gn.connect(c.destination);o.start(now+at);o.stop(now+at+d+.02);};
    const noise=(d,g=.08,at=0,fq=1200)=>{const n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=fq;const gn=c.createGain();gn.gain.value=g*vol;s.connect(f);f.connect(gn);gn.connect(c.destination);s.start(now+at);};
    switch(type){
      case 'blip':tone(760+Math.random()*80,.025,'square',.01);break;
      case 'hit':noise(.12,.2,0,900);tone(200,.12,'square',.04,0,60);break;
      case 'crit':noise(.2,.25,0,1500);tone(1500,.1,'square',.035,0,300);tone(110,.22,'sawtooth',.05,.02,40);break;
      case 'hurt':noise(.22,.22,0,420);tone(150,.26,'sawtooth',.05,0,45);break;
      case 'heal':[660,880,1100,1320].forEach((f,i)=>tone(f,.2,'sine',.04,i*.06));break;
      case 'guard':tone(300,.18,'triangle',.06,0,620);noise(.08,.05,0,3200);break;
      case 'counter':tone(220,.08,'square',.05,0,880);noise(.15,.2,.06,1800);break;
      case 'talk':tone(420,.05,'square',.025);tone(540,.05,'square',.025,.07);tone(470,.06,'square',.025,.14);break;
      case 'sing':[523,659,784,1047].forEach((f,i)=>tone(f,.18,'triangle',.04,i*.08));break;
      case 'fix':noise(.05,.15,0,4200);noise(.05,.15,.1,4200);tone(1900,.06,'square',.025,.2);break;
      case 'pray':[392,494,587,784].forEach((f,i)=>tone(f,.55,'sine',.032,i*.12));break;
      case 'light':[523,659,784,1047,1319,1568].forEach((f,i)=>tone(f,.45,'triangle',.04,i*.07));break;
      case 'lvup':[523,659,784,1047].forEach((f,i)=>tone(f,.14,'square',.03,i*.08));tone(1047,.45,'square',.03,.34);break;
      case 'enc':for(let i=0;i<7;i++)tone(180+i*110,.07,'sawtooth',.035,i*.045);noise(.35,.07,.3,700);break;
      case 'win':[784,784,784,1047].forEach((f,i)=>tone(f,i<3?.1:.5,'square',.03,i*.12));tone(523,.6,'triangle',.03,.36);break;
      case 'lose':[392,370,349,311].forEach((f,i)=>tone(f,.4,'triangle',.045,i*.26));break;
      case 'item':tone(988,.07,'square',.03);tone(1319,.16,'square',.03,.08);break;
      case 'down':noise(.6,.16,0,300);tone(220,.7,'sawtooth',.045,0,40);break;
      case 'wipe':noise(.45,.05,0,700);break;
      case 'bubble':tone(380,.09,'sine',.04,0,1000);break;
      case 'enemy':tone(130,.16,'sawtooth',.045,0,90);noise(.1,.08,0,500);break;
    }
  }catch(e){}
}

registerMinigame({
  id:'rpg', icon:'🌊', name:'壇ノ浦夢譚', genre:'ストーリーRPG', bgm:'night',
  get desc(){
    try{
      const R=rpgPeek();
      if(R.cleared>=5)return `五つの灯は、すべて戻った。${R.ending==='sink'?'……けれど、まだ海の音がする。':''}章を選んで見返せる（報酬なし・評価は記録される）。`;
      const c=RPG_CH[R.cleared+1];
      if(lockedToday(R))return `夢の続き──${c.kan}「${c.title}」は、明日の夜に。見返しはできる（報酬なし）。`;
      if(R.cleared===0)return '眠りの底、沈んだ都。少女ミナモと、失くした五つの灯を探す夢のRPG。今夜は第一章「声の灯」。';
      return `夢の続き──${c.kan}「${c.title}」（${c.place}）。灯 ${R.cleared}/5・Lv${R.lv}`;
    }catch(e){return '眠りの底、沈んだ都で五つの灯を探す夢のRPG。';}
  },
  get effect(){
    try{const R=rpgPeek();if(R.cleared>=5||lockedToday(R))return '見返し：報酬なし ／ 約60分';}catch(e){}
    return '章クリアで 疲労-10 精神↑ 希望↑ SP+1 ／ 約120分（負けると悪夢）';
  },
  help:'タップ/Enter 決定・矢印 選択・Esc 戻る',
  start(body,mg){
    const R=rpgState();
    const sk=Object.assign({},gs.skills||{});
    const S=k=>+sk[k]||0;
    const ABORT={rpgAbort:true};
    let phase='menu',chNo=0,isReplay=false,endKey=null,run=null;

    // ── DOM ──
    const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
    const root=el('div','rpg-root');body.appendChild(root);
    const cv=el('canvas','rpg-cv');root.appendChild(cv);const x=cv.getContext('2d');
    const ui=el('div','rpg-ui');root.appendChild(ui);
    const flashEl=el('div','rpg-flash');root.appendChild(flashEl);
    const fadeEl=el('div','rpg-fade');root.appendChild(fadeEl);
    const oc=document.createElement('canvas'),ox=oc.getContext('2d');
    const hc=document.createElement('canvas'),hx=hc.getContext('2d');
    const mc=document.createElement('canvas'),mx=mc.getContext('2d');
    let W=360,H=640,dpr=1;
    function resize(){
      const r=root.getBoundingClientRect();
      W=Math.max(240,r.width);H=Math.max(360,r.height);dpr=Math.min(2,window.devicePixelRatio||1);
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      oc.width=cv.width;oc.height=cv.height;
      if(BT)layoutBattle();
    }
    const ro=window.ResizeObserver?new ResizeObserver(()=>resize()):null;
    if(ro)ro.observe(root);
    window.addEventListener('resize',resize);
    let cleaned=false;
    function cleanup(){if(cleaned)return;cleaned=true;try{ro&&ro.disconnect();}catch(e){}window.removeEventListener('resize',resize);window.removeEventListener('keydown',capKey,true);window.removeEventListener('keyup',capKey,true);}
    if(typeof mg.onEnd==='function')mg.onEnd(cleanup);

    // テキストウィンドウ
    const box=el('div','rpg-box rpg-hide');
    box.innerHTML='<div class="rpg-plate"></div><div class="rpg-por"><canvas width="152" height="152"></canvas></div><div class="rpg-tx"><div class="rpg-text"></div></div><div class="rpg-next">▼</div>';
    ui.appendChild(box);
    const plate=box.querySelector('.rpg-plate'),porBox=box.querySelector('.rpg-por'),pc=porBox.querySelector('canvas'),txt=box.querySelector('.rpg-text'),nextEl=box.querySelector('.rpg-next');
    const hideBox=()=>box.classList.add('rpg-hide');

    // ── 画面の状態 ──
    const V={bg:'menu',v:{},t:0,stop:0,shake:0,hurt:0,dark:0,mosaic:0,battle:false,
      hero:{on:false,a:0,x:.3,tx:.3,face:1,ph:0,walk:false,lunge:0,flash:0,down:0},
      mina:{on:false,a:0,x:.72,tx:.72,expr:'normal'},
      kid:{on:false,a:0,x:.55,tx:.55},
      foe:null,foeCY:.3,foeS:200,bpTop:0,
      pops:[],floats:[],parts:[],fx:[],tw:[],light:null};
    img('sd_normal',true);['normal','happy','tired','fear','win','collapse'].forEach(e=>img('char_'+e));

    const sleep=ms=>new Promise((res,rej)=>setTimeout(()=>mg._ended?rej(ABORT):res(),ms));
    function tween(o,k,to,ms,ease){
      return new Promise((res,rej)=>{V.tw=V.tw.filter(t=>!(t.o===o&&t.k===k));V.tw.push({o,k,from:o[k],to,dur:ms/1000,t:0,ease,res,rej});});
    }
    function flash(a=.8){flashEl.style.transition='none';flashEl.style.opacity=a;void flashEl.offsetWidth;flashEl.style.transition='opacity .45s ease';flashEl.style.opacity=0;}
    function pop(px,py,txt2,col,big){V.pops.push({x:px,y:py,txt:txt2,col,t:0,big});}
    function burst(px,py,col,n=14,sp=160,sz=3){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=sp*(.3+Math.random()*.7);V.parts.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.5+Math.random()*.4,t:0,col,sz:sz*(.5+Math.random())});}}
    function bgm(t){if(mg._ended||typeof AU==='undefined')return;if(AU.bgmType!==t)AU.fadeBGM(t,500);}

    // ── 入力（カーソル・キー先行入力） ──
    let mode='none',focus={list:[],i:0,cols:1,back:null},kbBuf=null,tapRes=null,onFocusDesc=null;
    function btn(cls,html,fn){
      const b=el('button',cls,html);b.type='button';b.tabIndex=-1;
      b.addEventListener('mousedown',e=>e.preventDefault());
      b.addEventListener('click',e=>{e.stopPropagation();if(b.disabled||mg._ended)return;fn(e);});
      return b;
    }
    function setFocus(list,cols=1,back=null,start=0){
      focus={list,i:0,cols,back};
      let s=Math.min(start,list.length-1);while(s<list.length-1&&list[s]&&list[s].disabled)s++;focus.i=Math.max(0,s);
      list.forEach((b,i)=>b.addEventListener('pointerenter',()=>{if(focus.list===list&&!b.disabled&&focus.i!==i){focus.i=i;paintFocus();}}));
      paintFocus();
      if(kbBuf&&performance.now()-kbBuf.t<400){const k=kbBuf.k;kbBuf=null;navKey(k);}
    }
    function clearFocus(){focus={list:[],i:0,cols:1,back:null};}
    function paintFocus(){focus.list.forEach((b,i)=>b.classList.toggle('sel',i===focus.i));const b=focus.list[focus.i];if(b&&onFocusDesc&&b.dataset.desc)onFocusDesc(b.dataset.desc);}
    function navKey(k){
      const L=focus.list;if(!L.length)return;
      if(k==='Enter'||k===' '||k==='z'||k==='Z'){const b=L[focus.i];if(b&&!b.disabled)b.click();return;}
      if(k==='Escape'||k==='x'||k==='X'){if(focus.back&&!focus.back.disabled)focus.back.click();return;}
      const n=L.length,c=focus.cols;let d=0;
      if(k==='ArrowRight')d=1;else if(k==='ArrowLeft')d=-1;else if(k==='ArrowDown')d=c;else if(k==='ArrowUp')d=-c;else return;
      let j=focus.i;for(let s=0;s<n;s++){j=(j+d+n*4)%n;if(!L[j].disabled)break;}
      if(j!==focus.i){focus.i=j;paintFocus();AU.se('btn');}
    }
    // 画面全体のキー操作（main/ui.js 等）と二重に動かないよう、遊んでいる間は捕捉段階で受け取って止める
    const OWN_KEYS=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter','Escape','z','Z','x','X'];
    const capKey=e=>{
      if(mg._ended||!MG.def||MG.def.id!=='rpg'||!root.isConnected)return;
      if(!OWN_KEYS.includes(e.key))return;
      e.stopImmediatePropagation();
      onKeyEv(e);
    };
    window.addEventListener('keydown',capKey,true);window.addEventListener('keyup',capKey,true);
    mg.onKey(e=>onKeyEv(e));
    function onKeyEv(e){
      const k=e.key;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter','Escape'].includes(k))e.preventDefault();
      if(e.type!=='keydown')return;
      if(mode==='text'||mode==='tap'){if(k==='Enter'||k===' '||k==='z'||k==='Z'){if(e.repeat&&mode==='tap')return;onTap();}return;}
      if(focus.list.length){navKey(k);return;}
      kbBuf={k,t:performance.now()};
    }
    root.addEventListener('click',()=>onTap());
    function onTap(){
      if(mode==='text')advance();
      else if(mode==='tap'&&tapRes){const r=tapRes;tapRes=null;r();}
    }
    function waitTap(ms,min=250){
      return new Promise((res,rej)=>{
        const t0=performance.now();let done=false,timer=null;
        const fin=()=>{if(done)return;done=true;clearTimeout(timer);if(mode==='tap'){mode='none';tapRes=null;}mg._ended?rej(ABORT):res();};
        const arm=()=>{mode='tap';tapRes=()=>{if(performance.now()-t0<min){arm();return;}fin();};};
        arm();if(ms>0)timer=setTimeout(fin,ms);
      });
    }

    // ── 文章 ──
    let tw=null;
    const SPK={n:{cls:'nar'},d:{name:'だんのうら',por:'dan'},m:{name:'ミナモ',cls:'mina',por:'mina'},mq:{name:'？？？',cls:'mina',por:'mina'},
      c:{name:'あの子',cls:'kid',por:'kid'},s:{name:'海の声',cls:'sea',por:'sea'},k:{cls:'com'},e:{cls:'foe',por:'foe'}};
    const por={kind:null,expr:'normal'};
    function setBox(code,arg){
      const sp=SPK[code]||SPK.n;
      box.className='rpg-box '+(sp.cls||'');
      if(code==='k'&&['???','存在しないID','…'].includes(arg))box.classList.add('ghost');
      const name=(code==='k'||code==='e')?arg:sp.name;
      plate.textContent=name||'';plate.style.display=name?'':'none';
      por.kind=sp.por||null;
      por.expr=code==='d'?(['normal','happy','win','tired','fear','collapse'].includes(arg)?arg:'normal'):(arg||'normal');
      if(code==='m'||code==='mq')V.mina.expr=arg||'normal';
      porBox.style.display=por.kind?'':'none';
    }
    function showLine(text){
      return new Promise((res,rej)=>{
        txt.textContent='';nextEl.style.visibility='hidden';
        tw={full:text,n:0,shown:0,done:false,res};mode='text';
        if(SPEEDS[R.opt.speed]>=9999)finishTw();
      });
    }
    function finishTw(){if(!tw)return;tw.n=tw.full.length;tw.done=true;txt.textContent=tw.full;nextEl.style.visibility='visible';}
    function advance(){if(!tw)return;if(!tw.done){finishTw();return;}const r=tw.res;tw=null;mode='none';AU.se('btn');r();}
    function typeStep(dt){
      if(!tw||tw.done)return;
      tw.n+=dt*SPEEDS[R.opt.speed];
      const n=Math.min(tw.full.length,Math.floor(tw.n));
      if(n!==tw.shown){
        if(Math.floor(n/2)!==Math.floor(tw.shown/2)&&/\S/.test(tw.full[n-1]||''))sfx('blip');
        tw.shown=n;txt.textContent=tw.full.slice(0,n);
      }
      if(n>=tw.full.length)finishTw();
    }
    async function play(lines){
      for(const L of lines){
        if(mg._ended)throw ABORT;
        if(L[0]==='#'){await directive(L.slice(1));continue;}
        const ci=L.indexOf(':');const head=L.slice(0,ci),text=L.slice(ci+1);
        const dot=head.indexOf('.');const code=dot<0?head:head.slice(0,dot),arg=dot<0?'':head.slice(dot+1);
        setBox(code,arg);
        await showLine(text);
      }
    }
    function actor(A,a,b){
      if(a==='on'){if(!A.on||A.a<.05){A.x=A.tx=+b;}else A.tx=+b;A.on=true;}
      else if(a==='off')A.on=false;
      else if(a==='x'){A.tx=+b;A.on=true;}
    }
    async function directive(s){
      const p=s.split(' '),cmd=p[0],a=p[1],b=p[2];
      switch(cmd){
        case 'bg':await trans('wipe',()=>{V.bg=a;V.v={variant:b};});break;
        case 'bgnow':V.bg=a;V.v={variant:b};break;
        case 'var':V.v[a]=+b;break;
        case 'hero':actor(V.hero,a,b);break;
        case 'mina':actor(V.mina,a,b);break;
        case 'kid':actor(V.kid,a,b);break;
        case 'foe':if(a==='off'){if(V.foe)V.foe.ta=0;}else showFoe(a);break;
        case 'se':AU.se(a);break;
        case 'bgm':bgm(a);break;
        case 'shake':V.shake=+a||6;sfx('enemy');break;
        case 'flash':flash(.85);sfx('light');break;
        case 'wait':hideBox();await sleep(+a||500);break;
        case 'float':V.floats.push({txt:s.slice(6),x:.2+Math.random()*.5,y:.22+Math.random()*.2,t:0});break;
        case 'dark':V.dark=+a;break;
      }
    }
    function showFoe(kind){V.foe={kind,a:V.foe&&V.foe.kind===kind?V.foe.a:0,ta:1,hit:0,shake:0,atk:0,dead:0,e:{}};}

    // ── 場面転換：フェード／ワイプ／モザイク ──
    async function trans(type,mid){
      hideBox();
      if(type==='mosaic'){
        sfx('enc');AU.se('warn');
        for(let i=1;i<=12;i++){V.mosaic=i*2.5;await sleep(28);}
        fadeEl.classList.add('on');await sleep(260);
        mid&&mid();V.mosaic=0;
        fadeEl.classList.remove('on');await sleep(420);return;
      }
      if(type==='wipe'){
        sfx('wipe');
        fadeEl.className='rpg-fade wipe';void fadeEl.offsetWidth;fadeEl.classList.add('go');
        await sleep(560);mid&&mid();await sleep(120);
        fadeEl.classList.add('out');await sleep(580);fadeEl.className='rpg-fade';return;
      }
      fadeEl.classList.add('on');await sleep(650);mid&&mid();fadeEl.classList.remove('on');await sleep(500);
    }

    // ── 描画 ──
    const PE=W=>Math.max(.75,Math.min(1.35,Math.min(W/380,H/700)));
    function drawHeroAt(px,fy,sc,alpha,face,st){
      const im=img('sd_normal',true);if(!im.ok||alpha<=0)return;
      const h=104*sc,w=h*120/140;
      const step=st.walk?Math.sin(st.ph*10):0;
      const bob=st.walk?-Math.abs(step)*5*sc:Math.sin(V.t*2.2)*1.6*sc;
      const sq=st.walk?Math.abs(step)*.04:Math.sin(V.t*2.2)*.012;
      x.save();x.globalAlpha=alpha*(1-st.down*.5);
      x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(px,fy+2,w*.32*(1-Math.abs(bob)/(30*sc)),5*sc,0,0,6.283);x.fill();
      x.globalCompositeOperation='lighter';glow(x,px,fy-h*.5,h*.6,'rgba(120,200,255,A)',.1);x.globalCompositeOperation='source-over';
      x.translate(px,fy+bob);x.rotate((st.walk?step*.05:0)+st.down*1.2*face);x.scale(face*(1+sq),1-sq);
      let src=im.src;
      if(st.flash>0){
        if(hc.width!==im.src.width){hc.width=im.src.width;hc.height=im.src.height;}
        hx.globalCompositeOperation='source-over';hx.clearRect(0,0,hc.width,hc.height);hx.drawImage(im.src,0,0);
        hx.globalCompositeOperation='source-atop';hx.fillStyle=`rgba(255,70,90,${st.flash})`;hx.fillRect(0,0,hc.width,hc.height);hx.globalCompositeOperation='source-over';
        src=hc;
      }
      x.drawImage(src,-w/2,-h,w,h);
      x.restore();
    }
    function foePos(){
      if(V.battle)return {x:W*.56,y:V.foeCY,s:V.foeS};
      return {x:W*.5,y:H*.3,s:Math.min(W*.6,H*.36)};
    }
    function drawFoe(){
      const F=V.foe;if(!F||F.a<=.01)return;
      const P=foePos();
      ox.setTransform(1,0,0,1,0,0);ox.clearRect(0,0,oc.width,oc.height);
      ox.setTransform(dpr,0,0,dpr,0,0);
      const sh=F.shake>0?(Math.random()-.5)*F.shake:0;
      ox.translate(P.x+sh-F.atk*W*.12,P.y+F.atk*H*.05+F.dead*P.s*.15);
      ox.scale(1+F.atk*.12,(1+F.atk*.12)*(1-F.dead*.6));
      FOES[F.kind](ox,P.s,V.t,F.e);
      if(F.hit>0){ox.setTransform(1,0,0,1,0,0);ox.globalCompositeOperation='source-atop';ox.fillStyle=`rgba(255,255,255,${F.hit*.85})`;ox.fillRect(0,0,oc.width,oc.height);ox.globalCompositeOperation='source-over';}
      x.save();x.globalAlpha=F.a*(1-F.dead);x.drawImage(oc,0,0,W,H);x.restore();
    }
    function heroBattlePos(){return {x:W*.2+V.hero.lunge*W*.18,y:V.bpTop-6};}
    function render(){
      x.setTransform(dpr,0,0,dpr,0,0);
      let sx=0,sy=0;if(V.shake>0){sx=(Math.random()-.5)*V.shake;sy=(Math.random()-.5)*V.shake;}
      x.save();x.translate(sx,sy);
      (SCENES[V.bg]||SCENES.menu)(x,W,H,V.t,V.v);
      if(V.battle){x.fillStyle='rgba(2,2,12,.35)';x.fillRect(0,0,W,H);}
      if(V.dark>0){x.fillStyle=`rgba(0,0,8,${V.dark})`;x.fillRect(0,0,W,H);}
      PX=V.hero.x-.5;
      const sc=PE(W)*1.12,fy=H*.635;
      if(!V.battle){
        drawChild(x,V.kid.x*W,fy,sc*1.05,V.t,V.kid.a);
        drawHeroAt(V.hero.x*W,fy,sc,V.hero.a,V.hero.face,V.hero);
        drawMinamo(x,V.mina.x*W,fy+4,sc*.95,V.t,V.mina.a,V.mina.expr);
      }
      drawFoe();
      if(V.battle){
        const hp=heroBattlePos();
        drawHeroAt(hp.x,hp.y,sc*.92,1,1,V.hero);
        if(V.mina.on)drawMinamo(x,W*.08,hp.y,sc*.6,V.t,.75,V.mina.expr);
      }
      drawFx();
      x.restore();
      // 浮かぶ数字・コメント・灯
      V.pops.forEach(p=>{
        const k=p.t/1.1;x.globalAlpha=Math.max(0,1-k*k);
        x.font=`${p.big?26:19}px "DotGothic16",monospace`;x.textAlign='center';
        const yy=p.y-p.t*38-(p.t<.15?Math.sin(p.t/.15*Math.PI)*10:0);
        x.lineWidth=4;x.strokeStyle='rgba(0,0,0,.85)';x.strokeText(p.txt,p.x,yy);x.fillStyle=p.col;x.fillText(p.txt,p.x,yy);
      });
      x.globalAlpha=1;
      V.floats.forEach(f=>{
        const a=Math.min(1,f.t/.8)*Math.max(0,1-(f.t-3)/1.5);
        x.globalAlpha=Math.max(0,a)*.9;x.font=`${Math.round(Math.min(W*.045,18))}px "DotGothic16",monospace`;x.textAlign='center';
        x.fillStyle='#ff9fb4';x.shadowColor='#e83055';x.shadowBlur=10;
        x.fillText(f.txt,f.x*W+Math.sin(f.t*7)*1.5,f.y*H-f.t*8);x.shadowBlur=0;
      });
      x.globalAlpha=1;
      if(V.light){
        const L=V.light,k=Math.min(1,L.t/1.3),cy=H*(-.05+.43*(1-Math.pow(1-k,3))),r=W*.05*(1+.15*Math.sin(V.t*5))*(1+L.t*.08);
        x.globalCompositeOperation='lighter';
        glow(x,W/2,cy,r*7,`rgba(${LIGHT_COL[L.n]},A)`,.55);glow(x,W/2,cy,r*2.2,'rgba(255,255,255,A)',.9);
        for(let i=0;i<10;i++){const a=V.t*1.4+i*.628,rr=r*(2.6+Math.sin(V.t*3+i)*.6);x.fillStyle=`rgba(${LIGHT_COL[L.n]},.8)`;x.fillRect(W/2+Math.cos(a)*rr,cy+Math.sin(a)*rr,2.5,2.5);}
        x.globalCompositeOperation='source-over';
      }
      if(V.hurt>0){vignette(x,W,H,V.hurt*.7,'200,20,50');}
      if(V.mosaic>1){
        const m=Math.round(V.mosaic*dpr);
        mc.width=Math.max(1,Math.ceil(cv.width/m));mc.height=Math.max(1,Math.ceil(cv.height/m));
        mx.imageSmoothingEnabled=false;mx.drawImage(cv,0,0,mc.width,mc.height);
        x.setTransform(1,0,0,1,0,0);x.imageSmoothingEnabled=false;x.drawImage(mc,0,0,cv.width,cv.height);x.imageSmoothingEnabled=true;
      }
    }
    // スキルごとのエフェクト
    function addFx(type,o={}){V.fx.push(Object.assign({type,t:0,dur:.8},o));}
    function drawFx(){
      const F=foePos(),Hp=heroBattlePos();
      V.fx.forEach(f=>{
        const k=f.t/f.dur;if(k>1)return;
        x.save();
        switch(f.type){
          case 'words':{x.font='16px "DotGothic16",monospace';x.textAlign='center';
            ['聞','こ','え','る','よ'].forEach((c,i)=>{const kk=Math.max(0,Math.min(1,k*1.6-i*.12));if(kk<=0||kk>=1)return;
              const px=Hp.x+(F.x-Hp.x)*kk,py=Hp.y-50+(F.y-(Hp.y-50))*kk-Math.sin(kk*Math.PI)*40;
              x.globalAlpha=1-kk*.3;x.fillStyle='#bff8ff';x.shadowColor='#00e8c8';x.shadowBlur=8;x.fillText(c,px,py);});break;}
          case 'notes':{x.font='20px serif';x.textAlign='center';
            for(let i=0;i<6;i++){const kk=Math.max(0,Math.min(1,k*1.4-i*.08));if(kk<=0||kk>=1)continue;
              const px=Hp.x+(F.x-Hp.x)*kk+Math.sin(kk*9+i)*14,py=Hp.y-60+(F.y-(Hp.y-60))*kk-Math.sin(kk*Math.PI)*60;
              x.globalAlpha=1-kk*.4;x.fillStyle=i%2?'#ffd8f0':'#9ff5ff';x.shadowColor='#8a52d4';x.shadowBlur=10;x.fillText(i%2?'♪':'♫',px,py);}break;}
          case 'sparks':{x.strokeStyle=`rgba(255,230,120,${1-k})`;x.lineWidth=2;
            for(let i=0;i<10;i++){const a=i*.63+f.seed,r1=F.s*.1+k*F.s*.4,r2=r1+F.s*.08;x.beginPath();x.moveTo(F.x+Math.cos(a)*r1,F.y+Math.sin(a)*r1);x.lineTo(F.x+Math.cos(a)*r2,F.y+Math.sin(a)*r2);x.stroke();}
            x.strokeStyle=`rgba(255,255,255,${(1-k)*.9})`;x.lineWidth=3;x.beginPath();x.moveTo(F.x-F.s*.2,F.y-F.s*.25);x.lineTo(F.x-F.s*.03,F.y-F.s*.05);x.lineTo(F.x-F.s*.1,F.y+F.s*.05);x.lineTo(F.x+F.s*.15,F.y+F.s*.25);x.stroke();break;}
          case 'shield':{const r=58*(1+.05*Math.sin(V.t*8));x.globalAlpha=(1-k)*.9;x.strokeStyle='#7affe6';x.lineWidth=2.5;x.fillStyle='rgba(0,232,200,.12)';
            x.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;x.lineTo(Hp.x+12+Math.cos(a)*r*.8,Hp.y-48+Math.sin(a)*r);}x.closePath();x.fill();x.stroke();break;}
          case 'pillar':{const g=x.createLinearGradient(0,0,0,Hp.y);g.addColorStop(0,'rgba(255,250,210,0)');g.addColorStop(1,`rgba(255,240,180,${(1-k)*.55})`);
            x.globalCompositeOperation='lighter';x.fillStyle=g;const w=40*(1-k*.5);x.fillRect(Hp.x-w/2,0,w,Hp.y);
            for(let i=0;i<8;i++){x.fillStyle=`rgba(255,255,220,${1-k})`;x.fillRect(Hp.x+Math.sin(i*2.1+V.t*3)*28,Hp.y-(k*120+i*14)%Hp.y,2.5,2.5);}break;}
          case 'heal':{x.globalCompositeOperation='lighter';for(let i=0;i<12;i++){x.fillStyle=`rgba(120,255,180,${1-k})`;x.fillRect(Hp.x+Math.sin(i*1.7)*26,Hp.y-20-k*70-i*5,3,3);}break;}
          case 'ring':{x.globalCompositeOperation='lighter';x.strokeStyle=`rgba(${f.col},${1-k})`;x.lineWidth=6*(1-k)+1;
            x.beginPath();x.arc(F.x,F.y,F.s*(.1+k*.8),0,6.283);x.stroke();glow(x,F.x,F.y,F.s*.9,`rgba(${f.col},A)`,(1-k)*.5);break;}
          case 'claw':{x.strokeStyle=`rgba(255,60,90,${1-k})`;x.lineWidth=4;
            for(let i=0;i<3;i++){const o=(i-1)*14,kk=Math.min(1,k*3);x.beginPath();x.moveTo(Hp.x-30+o,Hp.y-90);x.lineTo(Hp.x-30+o+60*kk,Hp.y-90+60*kk);x.stroke();}break;}
          case 'zz':{x.font='18px "DotGothic16",monospace';x.fillStyle=`rgba(180,200,255,${1-k})`;x.fillText('Z',F.x+F.s*.2+k*20,F.y-F.s*.3-k*30);x.fillText('z',F.x+F.s*.32+k*14,F.y-F.s*.42-k*40);break;}
        }
        x.restore();
      });
      V.parts.forEach(p=>{const a=1-p.t/p.life;if(a<=0)return;x.globalAlpha=a;x.fillStyle=p.col;x.fillRect(p.x,p.y,p.sz,p.sz);});
      x.globalAlpha=1;
    }
    // 顔ウィンドウ
    function drawPor(c,kind,expr){
      const X=c.getContext('2d'),Z=c.width;X.setTransform(1,0,0,1,0,0);X.clearRect(0,0,Z,Z);X.globalAlpha=1;
      const bgc={dan:['#2a2460','#0c0a22'],mina:['#0e4a5c','#04121c'],kid:['#5a4214','#1a1006'],foe:['#4a0c22','#0c0208'],sea:['#3a0614','#000']}[kind]||['#222','#000'];
      const g=X.createRadialGradient(Z/2,Z*.4,2,Z/2,Z/2,Z*.75);g.addColorStop(0,bgc[0]);g.addColorStop(1,bgc[1]);X.fillStyle=g;X.fillRect(0,0,Z,Z);
      if(kind==='dan'){
        const im=img('char_'+(expr||'normal'));
        if(im.ok){X.drawImage(im.src,0,0,Z,Z);X.globalCompositeOperation='multiply';X.fillStyle='#b9c2f2';X.fillRect(0,0,Z,Z);X.globalCompositeOperation='source-over';}
      }else if(kind==='mina'){const h=Z*2.3,s=h/150;drawMinamo(X,Z/2,Z*.44+h*.78-Math.sin(V.t*1.2)*4*s,s,V.t,1.15,expr);}
      else if(kind==='kid'){const s=Z*.021;drawChild(X,Z/2,Z*.47+52*s,s,V.t,1);}
      else if(kind==='foe'){X.save();X.translate(Z/2,Z*.52);FOES[(V.foe&&V.foe.kind)||'noise'](X,Z*.92,V.t,(V.foe&&V.foe.e)||{});X.restore();}
      else if(kind==='sea'){X.strokeStyle='rgba(255,120,140,.5)';X.lineWidth=2;for(let i=0;i<5;i++){X.beginPath();for(let px=0;px<=Z;px+=6){const y=Z*(.25+i*.13)+Math.sin(px*.06+V.t*2+i)*5;px?X.lineTo(px,y):X.moveTo(px,y);}X.stroke();}
        X.fillStyle='rgba(255,200,210,.85)';X.beginPath();X.moveTo(Z*.3,Z*.5);X.quadraticCurveTo(Z*.5,Z*.6,Z*.7,Z*.5);X.quadraticCurveTo(Z*.5,Z*.54,Z*.3,Z*.5);X.fill();}
      const v=X.createRadialGradient(Z/2,Z/2,Z*.35,Z/2,Z/2,Z*.75);v.addColorStop(0,'rgba(0,0,10,0)');v.addColorStop(1,'rgba(0,0,10,.65)');X.fillStyle=v;X.fillRect(0,0,Z,Z);
    }

    // ── 毎フレーム ──
    mg.loop(dt=>{
      if(V.stop>0){V.stop-=dt;}else V.t+=dt;
      const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      V.tw=V.tw.filter(t=>{t.t+=dt;const k=Math.min(1,t.t/t.dur);t.o[t.k]=t.from+(t.to-t.from)*(t.ease===false?k:ease(k));if(k>=1){t.res();return false;}return true;});
      [V.hero,V.mina,V.kid].forEach(A=>{
        A.a+=((A.on?1:0)-A.a)*Math.min(1,dt*4);
        const d=A.tx-A.x;
        if(Math.abs(d)>.004){const st=Math.sign(d)*Math.min(Math.abs(d),dt*.42);A.x+=st;if(A===V.hero){A.walk=true;A.ph+=dt;A.face=d>0?1:-1;}}
        else if(A===V.hero)A.walk=false;
      });
      if(V.hero.flash>0)V.hero.flash=Math.max(0,V.hero.flash-dt*3);
      const F=V.foe;
      if(F){F.a+=(F.ta-F.a)*Math.min(1,dt*3.5);if(F.hit>0)F.hit=Math.max(0,F.hit-dt*5);if(F.shake>0)F.shake=Math.max(0,F.shake-dt*40);if(F.ta===0&&F.a<.02)V.foe=null;}
      if(V.shake>0){V.shake*=Math.pow(.02,dt);if(V.shake<.4)V.shake=0;}
      if(V.hurt>0)V.hurt=Math.max(0,V.hurt-dt*1.4);
      V.pops=V.pops.filter(p=>(p.t+=dt)<1.1);
      V.floats=V.floats.filter(f=>(f.t+=dt)<4.5);
      V.fx=V.fx.filter(f=>(f.t+=dt)<f.dur);
      V.parts=V.parts.filter(p=>{p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy=p.vy*.94-20*dt;return p.t<p.life;});
      if(V.light)V.light.t+=dt;
      typeStep(dt);
      render();
      if(por.kind&&!box.classList.contains('rpg-hide'))drawPor(pc,por.kind,por.expr);
      if(BT&&V.battle)drawPor(BT.pc,'dan',BT.p?(BT.p.hp<BT.p.max*.3?'fear':BT.p.hp<BT.p.max*.6?'tired':'normal'):'normal');
    });

    // ── 選択肢 ──
    function choice(prompt,opts){
      return new Promise(res=>{
        setBox('n','');plate.style.display='none';box.classList.remove('rpg-hide');
        txt.textContent=prompt;nextEl.style.visibility='hidden';mode='choice';
        const wrap=el('div','rpg-choices');
        const list=opts.map((o,i)=>btn('rpg-ch',`${o.t}${o.s?`<small>${o.s}</small>`:''}`,()=>{
          AU.se('decide');sfx('item');clearFocus();wrap.remove();mode='none';res(i);
        }));
        list.forEach(b=>wrap.appendChild(b));ui.appendChild(wrap);
        wrap.style.bottom=(box.offsetHeight+18)+'px';
        setFocus(list,1);
      });
    }

    // ── 探索 ──
    function walk(tx){V.hero.on=true;V.hero.tx=Math.max(.1,Math.min(.9,tx));return sleep(Math.min(1400,Math.abs(V.hero.tx-V.hero.x)/.42*1000+80));}
    function explore(def){
      hideBox();
      return new Promise((res,rej)=>{
        const done={};let spots=[];let busy=false;
        const hint=el('div','rpg-hint',def.hint+'　<span style="color:var(--gd)">▶ タップで調べる</span>');ui.appendChild(hint);
        const clear=()=>{spots.forEach(s=>s.remove());spots=[];clearFocus();};
        const place=(b,sp)=>{b.style.left=(sp.x*100)+'%';b.style.top=(sp.y*100)+'%';ui.appendChild(b);spots.push(b);};
        const build=()=>{
          clear();mode='explore';hint.style.display='';
          const live=[];
          def.spots.forEach(sp=>{
            const b=btn('rpg-spot'+(done[sp.id]?' done':''),`<i></i><span>${sp.label}</span>`,()=>go(sp));
            if(done[sp.id])b.disabled=true;else live.push(b);
            place(b,sp);
          });
          if(def.spots.every(sp=>done[sp.id])){
            const ex=def.exit;const b=btn('rpg-spot exit',`<i></i><span>▶ ${ex.label}</span>`,async()=>{
              if(busy)return;busy=true;AU.se('decide');clear();hint.remove();
              try{await walk(ex.x);res();}catch(e){rej(e);}
            });
            place(b,ex);live.push(b);
          }
          setFocus(live,1);
        };
        const go=async sp=>{
          if(busy)return;busy=true;AU.se('decide');clear();hint.style.display='none';
          try{await walk(sp.x);await sp.run();}catch(e){rej(e);return;}
          done[sp.id]=1;hideBox();busy=false;build();
        };
        build();
      });
    }

    // ── カード・灯・道具 ──
    async function card(n,nextBg){
      const c=RPG_CH[n];
      hideBox();
      const mk=(a,b,cc,cls)=>{const e=el('div','rpg-card '+(cls||''),`<div class="c1">${a}</div><div class="c2">${b}</div><div class="ln"></div><div class="c3">${cc}</div>`);ui.appendChild(e);return e;};
      const show=async(e,ms)=>{void e.offsetWidth;e.classList.add('on');AU.se('ghost');await sleep(900);V.floats=[];
        if(nextBg!==undefined){V.bg=nextBg;V.v={};V.hero.on=false;V.hero.a=0;V.mina.on=false;V.mina.a=0;V.kid.on=false;V.kid.a=0;V.foe=null;V.dark=0;}
        await waitTap(ms,600);e.classList.remove('on');await sleep(800);e.remove();};
      if(n===1&&!isReplay&&R.cleared===0)await show(mk('DANNOURA DREAM TALE','壇ノ浦夢譚','── 波の下にも、都はあるか ──'),2600);
      await show(mk(c.kan,c.title,`── ${c.place} ──`),2800);
      if(isReplay&&R.cleared>=5&&REPLAY_EXTRA[n])await play(REPLAY_EXTRA[n]);
    }
    async function gainLight(n){
      hideBox();V.light={t:0,n};sfx('light');AU.se('ach');
      await sleep(1500);flash(.9);
      const g=el('div','rpg-gain',`${RPG_CH[n].light}の灯を取り戻した`);g.style.color=`rgb(${LIGHT_COL[n]})`;ui.appendChild(g);
      run.lights=Math.max(run.lights,n);score();
      await waitTap(2600,800);g.remove();V.light=null;
    }
    async function giveItem(k,n){
      run.items[k]=(run.items[k]||0)+n;sfx('item');AU.se('ach');
      setBox('n','');await showLine(`《${ITEMS[k].name}》を手に入れた。（${ITEMS[k].desc}）`);
    }
    function score(){
      if(!run){mg.setScore('');return;}
      const l=run.lights||0;
      mg.setScore(`Lv${run.lv}　灯 <span style="color:var(--gd)">${'●'.repeat(l)}</span>${'○'.repeat(5-l)}`);
    }

    // ══ バトル ══
    let BT=null;
    function buildBattle(){
      const top=el('div','rpg-bt-top rpg-win');
      top.innerHTML='<div class="rpg-en-row"><span class="rpg-en-name"></span><span class="rpg-en-st"></span></div><div class="rpg-bar en"><div></div></div><div class="rpg-intent"></div>';
      const bot=el('div','rpg-bt-bot rpg-win');
      bot.innerHTML='<div class="rpg-msg"></div><div class="rpg-me"><div class="rpg-por"><canvas width="92" height="92"></canvas></div><div class="rpg-me-bars"><div class="rpg-me-row"><span class="hpT"></span><div class="rpg-bar hp"><div></div></div></div><div class="rpg-me-row"><span class="brT"></span><div class="rpg-bar br"><div></div></div></div><div class="rpg-st"></div></div></div><div class="rpg-cmds"></div>';
      ui.append(top,bot);
      const q=(e,s)=>e.querySelector(s);
      BT={top,bot,pc:q(bot,'canvas'),name:q(top,'.rpg-en-name'),est:q(top,'.rpg-en-st'),ebar:q(top,'.rpg-bar.en>div'),intent:q(top,'.rpg-intent'),
        msg:q(bot,'.rpg-msg'),hpT:q(bot,'.hpT'),brT:q(bot,'.brT'),hp:q(bot,'.rpg-bar.hp>div'),br:q(bot,'.rpg-bar.br>div'),st:q(bot,'.rpg-st'),cmds:q(bot,'.rpg-cmds'),p:null,e:null};
      layoutBattle();
    }
    function layoutBattle(){
      if(!BT)return;
      const rr=root.getBoundingClientRect(),tb=BT.top.getBoundingClientRect(),bb=BT.bot.getBoundingClientRect();
      const t=tb.bottom-rr.top,b=bb.top-rr.top;
      V.bpTop=b;V.foeCY=t+(b-t)*.44;V.foeS=Math.max(90,Math.min(W*.6,(b-t)*.78));
    }
    function showBattle(on){if(!BT)return;BT.top.classList.toggle('rpg-hide',!on);BT.bot.classList.toggle('rpg-hide',!on);V.battle=on;if(on){hideBox();layoutBattle();}}
    function removeBattle(){if(BT){BT.top.remove();BT.bot.remove();BT=null;}V.battle=false;onFocusDesc=null;}
    const bmsg=(s,ms=850,min=200)=>{if(BT)BT.msg.innerHTML=s;return ms?waitTap(ms,min):Promise.resolve();};

    function pStats(final){
      const lv=run.lv;
      return {max:44+(lv-1)*9+S('stressRes')*4+(final&&run.f.ch5_true?20:0),
        br:18+(lv-1)*2+S('sleepEff')*2+(run.f.ch4_lantern?6:0),
        pow:7+lv*2,
        pm:(.8+Math.max(0,Math.min(100,+gs.mental||0))/250)*(run.f.ch4_lantern?1.12:1)};
    }
    function updBattle(e,p){
      if(!BT)return;
      BT.name.textContent=e.D.name;
      BT.ebar.style.width=Math.max(0,e.hp/e.max*100)+'%';
      const es=[];if(e.armor)es.push('🛡装甲');if(e.crack>0)es.push(`💥亀裂${e.crack}`);if(e.sleep)es.push('💤');if(e.clones)es.push(`🐑×${e.clones}`);if(e.grow)es.push(`📈利息+${e.grow*2}`);if(e.count>0)es.push(`👁${e.count}`);if(e.ally)es.push('🌊ミナモ');
      BT.est.textContent=es.join(' ');
      const m=e.intent;
      BT.intent.innerHTML=m?`次の行動：${m.big?'<b>⚠ ':'<span>'}${m.n}${m.big?'</b>':'</span>'}${m.d?`<small>（${m.d}）</small>`:m.big?'<small>（大技。守れば軽減）</small>':''}`:'';
      BT.hpT.textContent=`HP ${Math.max(0,Math.ceil(p.hp))}/${p.max}`;BT.brT.textContent=`息 ${Math.floor(p.br)}/${p.brMax}`;
      BT.hp.style.width=Math.max(0,p.hp/p.max*100)+'%';BT.br.style.width=Math.max(0,p.br/p.brMax*100)+'%';
      BT.hp.parentNode.classList.toggle('low',p.hp<p.max*.3);
      BT.st.textContent=Object.keys(p.st).filter(k=>p.st[k]>0).map(k=>ST_LABEL[k]).join(' ')||'　';
    }
    // コマンド選択
    function chooseCommand(e,p){
      return new Promise(res=>{
        const top=()=>{
          BT.cmds.innerHTML='';BT.cmds.classList.remove('busy');
          const availL=[1,2,3,4].filter(i=>i<=run.lights&&!p.used[i]);
          const hasItem=Object.values(run.items).some(v=>v>0);
          const list=CMDS.map(c=>{
            const cost=c.c?`息${c.c}`:c.k==='light'?`${availL.length}/${Math.min(4,run.lights)}`:c.k==='item'?`${(run.items.shell||0)+(run.items.ramune||0)}個`:'';
            const b=btn('rpg-cmd',`${c.l}<small>${cost||'　'}</small>`,()=>{
              if(c.k==='light'){AU.se('decide');return sub('light');}
              if(c.k==='item'){AU.se('decide');return sub('item');}
              AU.se('decide');fin({k:c.k});
            });
            b.dataset.desc=c.d;
            if(c.c&&p.br<c.c)b.disabled=true;
            if(c.k==='light'&&!availL.length)b.disabled=true;
            if(c.k==='item'&&!hasItem)b.disabled=true;
            BT.cmds.appendChild(b);return b;
          });
          setFocus(list,4,null,Math.max(0,CMDS.findIndex(c=>c.k===BT.lastCmd)));layoutBattle();
        };
        const sub=kind=>{
          BT.cmds.innerHTML='';const list=[];
          if(kind==='light'){
            [1,2,3,4].filter(i=>i<=run.lights).forEach(i=>{
              const L=LIGHT_SKILL[i];const b=btn('rpg-cmd wide',`${RPG_CH[i].light}：${L.n}<small>${p.used[i]?'使用済み':'1回'}</small>`,()=>{AU.se('decide');fin({k:'light',n:i});});
              b.dataset.desc=L.d;if(p.used[i])b.disabled=true;BT.cmds.appendChild(b);list.push(b);
            });
          }else{
            Object.keys(ITEMS).forEach(k=>{
              const b=btn('rpg-cmd wide',`${ITEMS[k].name}<small>×${run.items[k]||0}</small>`,()=>{AU.se('decide');fin({k:'item',item:k});});
              b.dataset.desc=ITEMS[k].desc;if(!(run.items[k]>0))b.disabled=true;BT.cmds.appendChild(b);list.push(b);
            });
          }
          const back=btn('rpg-cmd wide back','もどる<small>Esc</small>',()=>{AU.se('back');top();});
          back.dataset.desc='コマンドに戻る。';BT.cmds.appendChild(back);list.push(back);
          setFocus(list,2,back);
        };
        const fin=a=>{clearFocus();BT.cmds.classList.add('busy');BT.lastCmd=a.k==='light'||a.k==='item'?BT.lastCmd:a.k;res(a);};
        onFocusDesc=d=>{if(BT)BT.msg.innerHTML=`<span class="rpg-desc">${d}</span>`;};
        top();
      });
    }
    async function heroLunge(){await tween(V.hero,'lunge',1,130);V.hero.lunge=1;tween(V.hero,'lunge',0,220);}
    function hurtFoe(e,d,o={}){
      e.hp=Math.max(0,e.hp-d);
      const F=V.foe,P=foePos();
      if(F){F.hit=1;F.shake=o.crit?18:10;}
      V.stop=o.crit?.14:.07;V.shake=Math.max(V.shake,o.crit?11:5);
      pop(P.x+(Math.random()-.5)*30,P.y-P.s*.15,String(d),o.weak?'#ffe066':o.crit?'#ff9a50':'#ffffff',o.crit||o.weak);
      burst(P.x,P.y,o.col||'#fff',o.crit?22:12,o.crit?240:160);
      sfx(o.crit?'crit':'hit');
      st.dealt+=d;
    }
    function hurtHero(p,d){
      p.hp-=d;V.hero.flash=1;V.hurt=Math.max(V.hurt,.55);V.shake=Math.max(V.shake,9);V.stop=.06;
      const hp=heroBattlePos();pop(hp.x+10,hp.y-70,String(d),'#ff6080',d>=15);
      sfx('hurt');AU.se('noise');st.dmg+=d;
    }
    function healHero(p,n){const before=p.hp;p.hp=Math.min(p.max,p.hp+n);const h=Math.round(p.hp-before);const hp=heroBattlePos();pop(hp.x+10,hp.y-70,'+'+h,'#7affb0');addFx('heal',{dur:.9});sfx('heal');return h;}
    const rnd=(a,b)=>a+Math.random()*(b-a);
    let st={dealt:0,dmg:0};
    function calc(e,p,base,kind,o={}){
      let d=base*rnd(.88,1.12);
      const weak=e.D.weak===kind;if(weak)d*=1.6;
      if(e.crack>0)d*=1.4;
      if(e.armor&&!o.pierce)d*=.45;
      if(p.st.fear>0)d*=.8;
      const crit=Math.random()<.08;if(crit)d*=1.5;
      return {d:Math.max(1,Math.round(d)),weak,crit};
    }
    async function doAct(a,e,p,P,opt){
      const fl=k=>FLAVOR[k][Math.floor(Math.random()*FLAVOR[k].length)];
      const F=foePos();
      if(a.k!=='look'){p.rep=(a.k===p.last)?p.rep+1:0;p.last=a.k;}
      const hitMsg=(r,extra='')=>`${r.weak?'<b class="wk">効いている！</b> ':''}${r.crit?'<b class="cr">会心！</b> ':''}${e.D.name}に <b>${r.d}</b> のダメージ。${extra}`;
      switch(a.k){
        case 'talk':{
          const b=(P.pow+S('chatSkill')*2+S('radioVibe')*1.5)*P.pm*(p.st.noise>0?.6:1)*(run.f.ch3_honest?1.1:1)*(opt.final&&run.f.ch5_handle?1.2:1);
          await bmsg(`「語る」── ${fl('talk')}`,650);sfx('talk');AU.se('micOn');
          addFx('words',{dur:.75});await heroLunge();await sleep(260);
          const r=calc(e,p,b,'talk');hurtFoe(e,r.d,{...r,col:'#9ff5ff'});await bmsg(hitMsg(r),800);break;}
        case 'sing':{
          p.br-=6;
          const b=(P.pow*.8+S('singSkill')*2.5)*P.pm*(p.st.noise>0?.6:1)*(opt.final&&run.f.ch5_handle?1.2:1);
          await bmsg(`「歌う」── ${fl('sing')}`,650);sfx('sing');
          addFx('notes',{dur:1});await sleep(600);
          const r=calc(e,p,b,'sing');hurtFoe(e,r.d,{...r,col:'#ffd8f0'});
          let ex='';if(e.D.weak==='sing'&&e.clones){e.clones=0;V.foe&&(V.foe.e.clones=0);ex=' 羊の群れがまどろみ、散っていった。';}
          const h=healHero(p,5+S('singSkill')*1.5+run.lv);
          await bmsg(hitMsg(r,`${ex} HPが ${h} 回復。`),950);break;}
        case 'fix':{
          p.br-=5;
          const b=(P.pow*.7+(S('wiring')+S('plc')+S('emergencyFix'))*1.5)*P.pm*(run.f.ch2_alone?1.3:1);
          await bmsg(`「直す」── ${fl('fix')}`,650);sfx('fix');AU.se('tool');
          await heroLunge();addFx('sparks',{dur:.6,seed:Math.random()*6});
          const had=e.armor;e.armor=false;e.crack=2;
          const r=calc(e,p,b,'fix',{pierce:true});hurtFoe(e,r.d,{...r,col:'#ffe680'});
          await bmsg(hitMsg(r,had?' <b>装甲が外れた！</b>':' 継ぎ目に亀裂が走った（2ターン）。'),950);break;}
        case 'guard':{
          p.guard=true;p.br=Math.min(p.brMax,p.br+5+S('emoCtrl'));sfx('guard');AU.se('btn');addFx('shield',{dur:1.6});
          await bmsg('「守る」── 身を固めて、息を整える。（被ダメージ大幅減・息+5）',800);break;}
        case 'pray':{
          p.br-=7;sfx('pray');addFx('pillar',{dur:1.2});
          await bmsg(`「祈る」── ${fl('pray')}`,700);
          const h=healHero(p,12+S('stressRes')*4+S('bedtime')*2+run.lv*1.5);
          ['noise','burn','sleepy','fear'].forEach(k=>delete p.st[k]);
          let ex='';
          if(e.D.weak==='pray'){const r=calc(e,p,P.pow*1.05,'pray');hurtFoe(e,r.d,{...r,col:'#fff6c8'});ex=` 祈りが届いた！ ${e.D.name}に <b>${r.d}</b>。`;}
          await bmsg(`HPが ${h} 回復し、心が静まった。${ex}`,950);break;}
        case 'light':{
          p.used[a.n]=1;const L=LIGHT_SKILL[a.n];
          sfx('light');AU.se('ach');flash(.5);addFx('ring',{dur:1,col:LIGHT_COL[a.n]});
          await bmsg(`<b style="color:rgb(${LIGHT_COL[a.n]})">${RPG_CH[a.n].light}の灯「${L.n}」</b>`,800);
          if(a.n===1){const r=calc(e,p,(P.pow*2+S('chatSkill')*2+S('singSkill')*2)*P.pm,'light',{pierce:true});hurtFoe(e,r.d,{...r,col:'#ff8a9a'});await bmsg(hitMsg(r,' 声が、水を震わせた。'),900);}
          if(a.n===2){e.armor=false;e.crack=3;const r=calc(e,p,P.pow*1.2*P.pm,'light',{pierce:true});addFx('sparks',{dur:.7,seed:1});hurtFoe(e,r.d,{...r,col:'#ffc060'});await bmsg(hitMsg(r,' 確かな手が、継ぎ目を割った。（亀裂3ターン）'),950);}
          if(a.n===3){const h=healHero(p,Math.round(p.max*.45));p.st.promise=2;addFx('shield',{dur:2});await bmsg(`小指が温かい。HPが ${h} 回復。2ターンのあいだ受けるダメージが半分になる。`,1000);}
          if(a.n===4){e.sleep=1;addFx('zz',{dur:1.6});const h=healHero(p,10);await bmsg(`${e.D.name}は、まどろみに落ちた。次の行動を眠って過ごす。（HP+${h}）`,1000);}
          break;}
        case 'item':{
          run.items[a.item]--;run.stat.items++;sfx('item');AU.se('decide');
          if(a.item==='shell'){const h=healHero(p,35);await bmsg(`さくら貝を耳にあてる。……波の音が、優しい。HPが ${h} 回復。`,950);}
          else{p.br=Math.min(p.brMax,p.br+15);['noise','burn','sleepy','fear'].forEach(k=>delete p.st[k]);addFx('heal',{dur:.9});sfx('bubble');await bmsg('夜光ラムネを飲む。しゅわっと、頭が澄んだ。息+15・状態異常が治った。',950);}
          break;}
      }
      updBattle(e,p);
    }
    async function foeAct(e,p){
      const m=e.intent;
      if(e.sleep){e.sleep=0;addFx('zz',{dur:1.2});await bmsg(`${e.D.name}は眠っている……。`,800);return;}
      const F=V.foe;
      const strike=async(mult,label)=>{
        if(F){await tween(F,'atk',1,140);}
        sfx('enemy');
        let d=e.atk*mult*(1+.3*e.clones)*rnd(.9,1.1);
        if(p.guard)d*=.35;if(p.st.promise>0)d*=.5;
        d=Math.max(1,Math.round(d));
        addFx('claw',{dur:.45});hurtHero(p,d);
        if(F)tween(F,'atk',0,220);
        await bmsg(`${label}　<b class="dm">${d}</b> のダメージ${p.guard?'（守った）':''}。`,800);
        return d;
      };
      switch(m.k){
        case 'hit':{
          await bmsg(`${e.D.name}の「${m.n}」！`,500,150);
          if(m.counter&&p.guard){
            if(F){await tween(F,'atk',1,140);}
            sfx('counter');AU.se('repair');addFx('shield',{dur:1});V.shake=12;V.stop=.15;flash(.5);
            const cd=Math.max(1,Math.round((e.atk*2+P0().pow)*rnd(.95,1.1)));
            if(F)tween(F,'atk',0,200);
            hurtFoe(e,cd,{weak:true,col:'#7affe6'});
            await bmsg(`正面から受け止めて──<b class="wk">押し返した！</b> ${e.D.name}に <b>${cd}</b> のダメージ。`,1000);
            if(e.charge)e.charge=false;break;
          }
          await strike(m.m,'');if(e.charge){e.charge=false;V.foe&&(V.foe.e.charge=false);}
          if(m.big&&e.kind==='watcher')e.count=0;
          break;}
        case 'st':{
          await bmsg(`${e.D.name}の「${m.n}」！`,500,150);
          if(m.m)await strike(m.m,'');
          if(p.guard){await bmsg('身を固めていたので、心は乱されなかった。',650);}
          else{p.st[m.st]=ST_TURNS[m.st];await bmsg(`${ST_LABEL[m.st]} になった。`,700);}
          break;}
        case 'swell':{e.charge=true;V.foe.e.charge=true;sfx('bubble');e.hp=Math.min(e.max,e.hp+6);await bmsg(`${e.D.name}は、ぶくぶくと膨らんでいく……！　<b class="dm">次の一撃が重い。</b>`,900);break;}
        case 'armor':{if(e.armor){await strike(1,`${e.D.name}の「鉄の腕」！`);}else{e.armor=true;V.foe.e.armor=true;AU.se('machine');await bmsg(`${e.D.name}は装甲を締め直した。（受けるダメージ半減）`,900);}break;}
        case 'grow':{e.atk+=2;e.grow++;V.foe.e.grow=e.grow;AU.se('warn');await bmsg(`利息が膨らむ。${e.D.name}の攻撃力が上がった。`,850);break;}
        case 'clone':{e.clones=Math.min(3,e.clones+1);V.foe.e.clones=e.clones;sfx('bubble');await bmsg(`羊が増えた。（群れ×${e.clones}：攻撃が増す）`,850);break;}
        case 'same':{await bmsg(`${e.D.name}：${m.n}`,600,150);await strike(m.m*(1+.6*p.rep),p.rep?`同じ行動が${p.rep+1}回続いている──`:'');break;}
        case 'count':{e.count=3;V.foe.e.count=3;e.charge=true;V.foe.e.charge=true;AU.se('ghost');await bmsg(`${e.D.name}：${m.n}　<b class="dm">……秒読みが始まった。</b>`,1000);break;}
      }
      if(e.count>0&&m.k!=='count'){e.count--;V.foe&&(V.foe.e.count=e.count);}
    }
    let P0=()=>({pow:9});
    async function battle(kind,opt={}){
      const D=ENEMY[kind];
      const P=pStats(opt.final);P0=()=>P;
      const e={kind,D,max:D.hp,hp:D.hp,atk:D.atk-(kind==='debt'&&run.f.ch3_honest?2:0),turn:0,crack:0,sleep:0,armor:!!D.armor,charge:false,clones:0,grow:0,count:0,ally:!!opt.ally,intent:D.pat[0]};
      const startFull=opt.tutorial||run.f.ch4_rest||(opt.final&&run.f.ch5_papa);
      const p={max:P.max,hp:startFull?P.max:Math.round(P.max*Math.max(.72,Math.min(1,1-(+gs.fatigue||0)/300))),brMax:P.br,br:P.br,st:{},last:null,rep:0,used:{},guts:false,guard:false};
      if(opt.final&&run.f.ch5_papa)p.st.promise=1;
      st={dealt:0,dmg:0};const prevMina=V.mina.on;
      run.stat.par+=PAR[kind]||5;
      await trans('mosaic',()=>{
        if(!V.foe||V.foe.kind!==kind)showFoe(kind);
        V.foe.a=1;V.foe.e=e;V.hero.lunge=0;V.hero.down=0;V.hero.flash=0;V.mina.on=!!(e.ally);
        buildBattle();BT.p=p;BT.e=e;showBattle(true);updBattle(e,p);BT.cmds.classList.add('busy');
        BT.cmds.innerHTML=CMDS.map(c=>`<button class="rpg-cmd" disabled>${c.l}<small>　</small></button>`).join('');layoutBattle();
      });
      bgm(opt.final?'mental':'kaidan');
      V.foe.e=e;if(e.armor)V.foe.e.armor=true;
      await bmsg(`<b>${D.name}</b>が あらわれた！`,900);
      if(opt.tutorial)await bmsg('▶ 下のコマンドから行動を選ぼう。予告された「次の行動」を見て、⚠ の大技には「守る」。',4000,900);
      let halfDone=false;
      while(true){
        if(mg._ended)throw ABORT;
        p.guard=false;updBattle(e,p);
        if(p.st.sleepy>0&&Math.random()<.3){await bmsg('まぶたが重い……体が、動かない。',900);p.last=null;p.rep=0;}
        else{const a=await chooseCommand(e,p);await doAct(a,e,p,P,opt);}
        run.stat.turns++;
        if(e.hp<=0)break;
        if(opt.half&&!halfDone&&e.hp<=e.max*.5){
          halfDone=true;showBattle(false);
          await opt.half();
          e.ally=true;V.mina.on=true;showBattle(true);updBattle(e,p);
        }
        if(e.ally&&(e.turn%2===1||kind==='watcher')){
          if(kind==='watcher'&&e.turn%2===0){e.atk=Math.max(15,e.atk-1);AU.se('repair');await bmsg('ミナモが、観測者の視線を遮った！　観測者の力が少し落ちた。',850);}
          else if(p.hp<p.max){const h=healHero(p,8+run.lv);await bmsg(`ミナモの淡い光が、傷を照らす。HPが ${h} 回復。`,850);}
        }
        await foeAct(e,p);updBattle(e,p);
        if(p.hp<=0){
          if(run.f.ch3_promise&&chNo>=3&&!p.guts){
            p.guts=true;p.hp=1;healHero(p,Math.round(p.max*.4));flash(.6);AU.se('ach');
            await bmsg('「パパ、がんばれ」──小さな声が聞こえた。<b class="wk">踏みとどまった！</b>',1400);
          }else{await defeat(p,e);}
        }
        if(p.st.burn>0){const d=3;p.hp=Math.max(1,p.hp-d);const hp=heroBattlePos();pop(hp.x,hp.y-60,String(d),'#ff9a50');await bmsg(`やけどがじりじりと痛む。（${d}）`,550);}
        Object.keys(p.st).forEach(k=>{p.st[k]--;if(p.st[k]<=0)delete p.st[k];});
        p.br=Math.min(p.brMax,p.br+(run.f.ch4_lantern?3:2));
        if(e.crack>0)e.crack--;
        e.turn++;e.intent=D.pat[e.turn%D.pat.length];
        if(e.count===0&&e.charge&&kind==='watcher'&&e.intent.k!=='hit'){e.charge=false;V.foe.e.charge=false;}
      }
      // 勝利
      const F=V.foe;
      sfx('down');V.stop=.25;flash(.7);
      const FP=foePos();burst(FP.x,FP.y,'#fff',40,260,4);
      if(F)await tween(F,'dead',1,900);
      if(F)F.ta=0;
      bgm('night');sfx('win');
      R.rec.wins=(R.rec.wins||0)+1;
      run.stat.dmg+=st.dmg;run.stat.maxsum+=p.max;
      let m=`<b>${D.name}</b>を しずめた！`;
      if(D.exp){run.exp+=D.exp;m+=`　経験 +${D.exp}`;}
      await bmsg(m,1300,400);
      while(run.exp>=expNeed(run.lv)){run.exp-=expNeed(run.lv);run.lv++;sfx('lvup');AU.se('rank');score();
        await bmsg(`<b class="wk">レベルが上がった！ Lv${run.lv}</b>　HP・息・力が上がった。`,1500,400);}
      await sleep(200);
      removeBattle();V.mina.on=prevMina;
      if(V.foe)V.foe.ta=0;
      return 'win';
    }
    async function defeat(p,e){
      p.hp=0;updBattle(e,p);
      sfx('lose');AU.se('noise');V.stop=.3;
      await tween(V.hero,'down',1,800);
      await bmsg('だんのうらは、暗い水の底へ沈んでいく……',1500,500);
      R.rec.losses=(R.rec.losses||0)+1;
      removeBattle();
      V.dark=.55;V.hurt=1;
      await play(['n:冷たい水が、肺の奥まで流れ込んでくる。','m.sad:「だんのうらさん……！　だめ、まだ──」','n:灯が遠ざかる。水面が、遠ざかる。']);
      hideBox();
      const c=el('div','rpg-card red',`<div class="c1">悪夢</div><div class="c2">目が覚めた</div><div class="ln"></div><div class="c3">シーツが汗で濡れている。<br>この章は、明日の夜にやり直せる。</div><div class="rpg-tap">TAP</div>`);
      ui.appendChild(c);void c.offsetWidth;c.classList.add('on');
      await waitTap(0,1200);
      endGame('lost');
    }

    // ── 章の終わり・エンディング ──
    function calcRank(){
      const s=run.stat;
      let sc=100-48*(s.dmg/Math.max(1,s.maxsum))-3*Math.max(0,s.turns-s.par)-6*s.items;
      return sc>=86?'S':sc>=70?'A':sc>=50?'B':'C';
    }
    function keepRank(n,r){const old=R.ranks[n];if(!old||RANK_V[r]>RANK_V[old])R.ranks[n]=r;}
    async function finishChapter(n){
      const rank=calcRank();run.rank=rank;
      hideBox();await trans('fade',()=>{V.bg='menu';V.hero.on=false;V.mina.on=false;V.kid.on=false;V.foe=null;V.dark=.4;});
      sfx('win');AU.se('rank');
      const next=n<5?`次は ${RPG_CH[n+1].kan}「${RPG_CH[n+1].title}」── 明日の夜に`:'';
      const c=el('div','rpg-card gold',`<div class="c1">${RPG_CH[n].kan}　了</div><div class="c2">${RPG_CH[n].title}</div><div class="ln"></div><div class="c3">灯 ${'●'.repeat(run.lights)}${'○'.repeat(5-run.lights)}　Lv${run.lv}</div><div class="rpg-rank r${rank}">評価 <b>${rank}</b></div><div class="c3">${isReplay?'見返し（報酬なし）':next}</div><div class="rpg-tap">TAP</div>`);
      ui.appendChild(c);void c.offsetWidth;c.classList.add('on');
      await waitTap(0,1200);
      endGame(isReplay?'replay':'clear');
    }
    async function playEnding(key,epi){
      const E=ENDS[key];endKey=key;
      if(!epi){
        run.rank=calcRank();
        if(E.dark){bgm('collapse');await play(E.scene);await trans('fade',()=>{V.bg='abyss';V.hero.on=false;V.mina.on=false;});}
        else{await play(E.scene);bgm(E.bgm);await trans('fade',()=>{V.bg='dawn';V.hero.on=false;V.mina.on=false;V.kid.on=false;});flash(.9);}
      }else{V.bg=E.bg;bgm(E.dark?'collapse':E.bgm);}
      hideBox();
      // 総合評価
      const ranks=Object.assign({},R.ranks);if(!epi&&run.rank&&(!ranks[5]||RANK_V[run.rank]>RANK_V[ranks[5]]))ranks[5]=run.rank;
      const vals=[1,2,3,4,5].map(i=>RANK_V[ranks[i]]||1);
      const avg=vals.reduce((a,b)=>a+b,0)/5+(key==='true'?.5:key==='sink'?-.5:0);
      const total=avg>=3.6?'S':avg>=2.8?'A':avg>=2?'B':'C';
      if(!epi)run.total=total;
      const e=el('div','rpg-end'+(E.dark?' dark':''),`<div class="e1">ENDING</div><div class="e2">${E.name}</div><div class="e3">${E.body}</div><div class="e4">${E.last.replace('\n','<br>')}</div>${E.hint&&!epi?`<div class="rpg-note">${E.hint}</div>`:''}<div class="rpg-info">各章の評価 ${[1,2,3,4,5].map(i=>ranks[i]||'-').join(' ')}　総合評価 <b style="color:var(--gd)">${total}</b></div><div class="rpg-tap">TAP</div>`);
      ui.appendChild(e);
      AU.se(E.dark?'ghost':'ach');
      await waitTap(0,2200);
      endGame(epi?'replay':(isReplay?'replay':'clear'));
    }
    function endGame(reason){mg.end(reason);throw ABORT;}

    // ── 物語に渡す関数群 ──
    const G={
      say:play,choice,explore,battle,card,light:gainLight,item:giveItem,finish:finishChapter,ending:k=>playEnding(k,false),
      get f(){return run.f;},get replay(){return isReplay;},
      anchors:()=>ANCHORS.filter(k=>run.f[k]).length,
    };

    // ── タイトル画面 ──
    let menuEl=null;
    function showMenu(){
      phase='menu';mode='menu';V.bg='menu';hideBox();
      mg.setTimer('夢譚');
      const lit=R.cleared;
      const m=el('div','rpg-menu');menuEl=m;
      const ends=['true','wake','sink'].filter(k=>R.endings[k]).length;
      m.innerHTML=`<div class="rpg-eye">DANNOURA DREAM TALE</div><div class="rpg-logo">壇ノ浦夢譚</div><div class="rpg-sub">── 波の下にも、都はあるか ──</div>
        <div class="rpg-lights">${RPG_CH.slice(1).map((c,i)=>`<div class="rpg-lt${i<lit?' on':''}"><b></b>${c.light}${R.ranks[i+1]?`<em>${R.ranks[i+1]}</em>`:''}</div>`).join('')}</div>
        <div class="rpg-info">Lv${R.lv}　さくら貝×${R.items.shell||0}　夜光ラムネ×${R.items.ramune||0}<br>勝利 ${R.rec.wins||0}　悪夢 ${R.rec.losses||0}　エンド ${ends}/3</div>`;
      const bw=el('div','rpg-btns');m.appendChild(bw);
      const list=[];
      const add=(b)=>{bw.appendChild(b);list.push(b);return b;};
      const n=R.cleared+1;
      if(R.cleared<5){
        const c=RPG_CH[n];
        if(lockedToday(R)){
          const b=add(btn('rpg-btn',`${c.kan}「${c.title}」<small>続きは明日の夜に。今夜はもう夢を見た。</small>`,()=>{}));b.disabled=true;
        }else add(btn('rpg-btn main',`${R.cleared?'つづきから':'はじめから'}　${c.kan}「${c.title}」<small>${c.place}</small>`,()=>go(n,false)));
      }else{
        const E=ENDS[R.ending]||ENDS.wake;
        add(btn('rpg-btn main',`エピローグ「${E.name}」<small>もう一度、あの朝を（報酬なし）</small>`,()=>epilogue()));
      }
      if(R.cleared>=5||lockedToday(R)){
        const g=el('div','rpg-grid2');bw.appendChild(g);
        for(let i=1;i<=R.cleared;i++){const c=RPG_CH[i];const b=btn('rpg-btn mini',`${c.kan}を見返す<small>${c.title}${R.ranks[i]?'・評価'+R.ranks[i]:''}</small>`,()=>go(i,true));g.appendChild(b);list.push(b);}
      }
      add(btn('rpg-btn mini',`文字の速さ：${SPEED_N[R.opt.speed]}`,e=>{R.opt.speed=(R.opt.speed+1)%SPEEDS.length;e.currentTarget.textContent=`文字の速さ：${SPEED_N[R.opt.speed]}`;AU.se('btn');sfx('blip');}));
      const back=add(btn('rpg-btn mini',`眠らずに戻る<small>今夜の夢はここまで</small>`,()=>{AU.se('back');mg.end('quit');}));
      ui.appendChild(m);
      setFocus(list,1,back);
    }
    async function go(n,replay){
      if(phase!=='menu')return;
      AU.se('decide');sfx('light');clearFocus();
      chNo=n;isReplay=replay;phase='play';
      run={lv:R.lv,exp:R.exp,items:Object.assign({},R.items),f:Object.assign({},R.flags),lights:n-1,stat:{turns:0,par:0,dmg:0,maxsum:0,items:0}};
      if(replay){/* 見返しは保存データの選択を引き継ぐが、結果は保存しない */}
      st={dealt:0,dmg:0};
      mg.setTimer(RPG_CH[n].kan+(replay?'（見返し）':''));score();
      await trans('fade',()=>{if(menuEl){menuEl.remove();menuEl=null;}});
      try{await STORY[n](G);}catch(err){if(err!==ABORT)console.error(err);}
    }
    async function epilogue(){
      if(phase!=='menu')return;
      AU.se('decide');clearFocus();phase='epi';isReplay=true;
      run={lv:R.lv,exp:R.exp,items:Object.assign({},R.items),f:Object.assign({},R.flags),lights:5,stat:{turns:0,par:0,dmg:0,maxsum:0,items:0}};
      await trans('fade',()=>{if(menuEl){menuEl.remove();menuEl=null;}});
      try{await playEnding(R.ending||'wake',true);}catch(err){if(err!==ABORT)console.error(err);}
    }
    showMenu();
    bgm('night');

    // ── 結果 ──
    const CLEAR_FX={1:{fatigue:-10,mental:3,hope:3},2:{fatigue:-10,mental:4,hope:4},3:{fatigue:-10,mental:5,hope:4},4:{fatigue:-10,mental:6,hope:5}};
    const END_FX={true:{fatigue:-12,mental:8,hope:8,childStress:-5},wake:{fatigue:-10,mental:6,hope:6},sink:{fatigue:-14,mental:2,childStress:6}};
    return {
      _dbg:{V,get mode(){return mode;},get run(){return run;},get phase(){return phase;},get bt(){return BT;}},
      result(reason){
        cleanup();
        const ch=RPG_CH[chNo]||{};
        if(reason==='quit'){
          if(phase==='menu')return {title:'🌊 壇ノ浦夢譚',summary:'夢の入口で引き返した。今夜の眠りは浅かった。',fx:{},time:10};
          return {title:'🌊 夢から覚めた',summary:`${ch.kan}「${ch.title}」の途中で目が覚めた。<br>${isReplay?'（見返し中だった）':'この章の進み具合は失われた。次の夜に、はじめからやり直せる。'}`,
            fx:isReplay?{}:{fatigue:-3},time:60};
        }
        if(reason==='lost'){
          return {title:'🌊 悪夢',summary:`海の亡者に呑まれ、汗だくで目が覚めた。<br>${isReplay?'（見返し中だった）':`${ch.kan}「${ch.title}」は、明日の夜にやり直せる。<br>夢の中で得た経験（Lv${run.lv}）は残っている。`}`,
            fx:isReplay?{}:{fatigue:-5,mental:-4},time:90,cutin:['fear','……海の音が、まだ耳に残ってる。'],
            log:isReplay?null:'夢の海で亡者に呑まれ、うなされて目が覚めた',
            after(){if(!isReplay){R.lv=run.lv;R.exp=run.exp;}}};
        }
        if(reason==='replay'){
          return {title:'🌊 壇ノ浦夢譚（見返し）',summary:phase==='epi'?`もう一度、あの朝の夢を見た。<br>「${(ENDS[R.ending]||ENDS.wake).name}」`:`${ch.kan}「${ch.title}」を見返した。${run&&run.rank?`評価 ${run.rank}`:''}${endKey?`<br>エンド「${ENDS[endKey].name}」`:''}<br>（見返しのため報酬なし）`,
            fx:{},time:phase==='epi'?30:60,
            after(){if(phase!=='epi'&&run&&run.rank)keepRank(chNo,run.rank);if(endKey)R.endings[endKey]=1;}};
        }
        // 章クリア
        const fx=chNo===5?END_FX[endKey]||END_FX.wake:CLEAR_FX[chNo];
        const last=chNo===5;
        const E=last?ENDS[endKey]:null;
        return {
          title:last?`🌊 ${E.name}`:`🌊 ${ch.kan}「${ch.title}」クリア`,
          summary:last
            ?`五つの灯をすべて取り戻した。<br>エンド「${E.name}」　評価 ${run.rank}・総合 ${run.total}`
            :`夢の中で「${ch.light}の灯」を取り戻した。（灯 ${chNo}/5・Lv${run.lv}・評価 ${run.rank}）<br>次の章は、明日の夜に。`,
          fx,time:last&&endKey==='sink'?150:120,sp:1,
          log:last?(endKey==='sink'?'夢の都で眠ろうとした。朝、起きられなかった':'夢の底から、朝を選んで這い上がった'):`夢の海で「${ch.light}の灯」を取り戻した`,
          cutin:last?(endKey==='sink'?['collapse','……波の下にも、都はあるんだって。']:['win','おはよう。……ちゃんと、朝だ。']):['happy',`……${ch.light}の灯が、戻ってきた。`],
          after(){
            R.cleared=Math.max(R.cleared,chNo);R.lastDay=gs.day;
            R.lv=run.lv;R.exp=run.exp;R.items=Object.assign({},run.items);
            Object.assign(R.flags,run.f);keepRank(chNo,run.rank);
            if(last){R.ending=endKey;R.endings[endKey]=1;R.rating=run.total;}
          },
        };
      },
    };
  },
});
})();
