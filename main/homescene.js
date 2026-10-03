/* ══════════════════════════════════════════════════════════
   homescene.js — メイン画面の「部屋」シーン（ピクセルアート・キャンバス）
   ・.scene-area 内に 1 枚の canvas を置き、低解像度バッファ(256x90)に描いて
     整数倍(devicePixelRatio 考慮)で拡大表示する。
   ・loadScene をラップして hsSetScene(key) を呼ぶ。gs は毎フレーム読むだけ。
   ・game.js / index.html / style.css は触らない。CSS は #hs-style で注入。
   ══════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ───────── 定数 ─────────
const RW=256, RH=90;          // 部屋バッファ（仮想ピクセル）
const FLOOR=66;               // 床の始まり
const WIN={x:118,y:8,w:50,h:38};             // 窓枠
const GL={x:121,y:11,w:44,h:32};             // ガラス（左右2枚・中央に桟）
const MULL_X=142;                            // 中央の桟（2px）
const LAMP={x:50,y:30};                     // フロアランプのシェード左上
const DESK={x:182,y:50,w:70};                // 机の天板
const MON={x:202,y:26,w:30,h:21};            // モニター外枠
const SCR={x:204,y:28,w:26,h:16};            // 画面
const CLK={x:176,y:10};                      // 壁のデジタル時計
const CAL={x:68,y:12};                       // カレンダー
const FUTON={x:62,y:70,w:56,h:14};           // 布団

// ───────── CSS 注入 ─────────
function injectCSS(){
  if(document.getElementById('hs-style'))return;
  const st=document.createElement('style');st.id='hs-style';
  st.textContent=`
#game-screen .scene-area{height:180px;background:#07060f;}
#game-screen .scene-area #scene-bg{display:none;}
.hs-canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;image-rendering:pixelated;image-rendering:crisp-edges;z-index:0;}
#game-screen .scene-area #scene-label,#game-screen .scene-area #scene-extra{z-index:2;text-shadow:0 1px 0 #000,1px 0 0 #000,-1px 0 0 #000,0 -1px 0 #000,0 0 6px rgba(0,0,0,.9);}
#game-screen .scene-area #scene-label{opacity:.95;background:rgba(5,4,14,.55);padding:1px 6px;border-radius:2px;top:6px;bottom:auto;left:8px;}
#game-screen .scene-area #scene-extra{color:#d8cdf0;background:rgba(5,4,14,.5);padding:0 5px;border-radius:2px;}
.hs-fade-edge{position:absolute;left:0;right:0;bottom:0;height:10px;z-index:1;pointer-events:none;background:linear-gradient(transparent,rgba(5,4,14,.65));}
@media (max-height:640px){#game-screen .scene-area{height:136px;}}
@media (max-height:520px){#game-screen .scene-area{height:112px;}}
`;
  document.head.appendChild(st);
}

// ───────── パレット ─────────
const PAL={
  k:'#1b1226', h:'#5a3590', H:'#8c5fcc', d:'#3a2066',
  s:'#f6d6c2', S:'#d9a994', b:'#f2a2ac', g:'#2a1c36',
  e:'#6a3aa8', E:'#2c1648', w:'#ffffff', p:'#e07fb0', P:'#a54a80', R:'#6d2a56',
  f:'#ffb3cf', F:'#fff0a0', c:'#c6b2ee', C:'#9682ca', t:'#f19ac0',K:'#1b1226', T:'#c7709a',
  n:'#5a3f80', N:'#3d2a5c', o:'#2a2036', m:'#b4506e', u:'#9a7aa8',
  y:'#3d2c2a', Y:'#5c463e', z:'#ffffff', q:'#e6d27a', r:'#e05a6a', x:'#9be6ff', a:'#cfe8ff'
};

// ───────── スプライト定義（文字マップ） ─────────
// 正面の頭 16x17（目・口は描画時に重ねる）
const HEAD_F=[
"..........kkkk..",
"..........kppk..",
"..........kRRk..",
"......kkkkPPPPk.",
"....kkhhhhhhhhk.",
"...khhHHHhhhhhhk",
"..khHHhhhhhhhhhk",
".kffFhhhhhhhhhhk",
".khfhhhhhhhhhhdk",
".khhshhsshhshhdk",
".khggggggggggdhk",
".khgssgssgssghdk",
".khgssgssgssghdk",
".khggggssgggghdk",
".khsssssssssshdk",
"..khSssssssShdhk",
"...kkkkkkkk.dhk.",
];
// 後ろ姿の頭
const HEAD_B=[
"..kkkk..........",
"..kppk..........",
"..kRRk..........",
".kPPPPkkkk......",
".khhhhhhhhkk....",
"khhhhhhhHHhhk...",
"khhhhhhhhhHHhk..",
"khhhhhhhhhhFffk.",
"kdhhhhhhhhhhfhk.",
"kdhhhhHhhhhhhhk.",
"khdhhhhhhhhhdhk.",
"khddhhhhhhhhdhk.",
"khddhhhhhhhddhk.",
"khdddhhhhhhddhk.",
"khddddhhhhdddhk.",
"khkdddddddddhk..",
".khk.kkkkkkkk...",
];
// 横向き（右向き）の頭
const HEAD_S=[
"........kkkk....",
"........kppk....",
"........kRRk....",
"......kkPPPPk...",
"....kkhhhhhhkk..",
"...khhhHHHhhhhk.",
"..khhHHhhhhhhhhk",
".khfFhhhhhhhhhhk",
".khhfhhhhhhhshhk",
"khhhhhhhhhhssshk",
"khhhhhhhhgggggsk",
"khdhhhhhgggssgsk",
"khdhhhhhhhgssgsk",
"khddhhhhhhggggsk",
"khddhhhhhssbsssk",
"khdddhhhhSsssmk.",
".kkddddkkkkkkk..",
];
// 正面の体（立ち） 16x11
const BODY_F=[
".....kksskk..dhk",
"...kccttttcck.dk",
"..kcccttttccckk.",
"..kcCkttttkCck..",
"..kcCkTttTkCck..",
"..ksskNnnNksskk.",
"...kkknnnnkkk...",
".....knnknnk....",
".....knnknnk....",
".....kookkook...",
".....kkk..kkk...",
];
// 後ろ姿の体
const BODY_B=[
"dhk..kssssk.....",
"dk.kcccccccck...",
"..kcccccccccck..",
"..kcCkccccckCck.",
"..kcCkcccCckCck.",
"..ksskNnnNkssk..",
"...kkknnnnkkk...",
".....knnknnk....",
".....knnknnk....",
".....kookkook...",
".....kkk..kkk...",
];
// 横向き体（右向き）＋ 歩行の脚 4種
const BODY_S=[
"......kssk......",
".....kcttck.....",
"....kcccttk.....",
"....kcCcttk.....",
"....kcCcTtk.....",
"....kcssNnk.....",
".....knnnnk.....",
];
const LEGS_S=[
[".....knnnk......",".....knnnk......",".....kooook.....",".....kkkkk......"],
["....knnknnk.....","...knnk.knnk....","..kook...kook...","..kkk....kkk...."],
[".....knnnk......",".....knnnk......",".....kooook.....",".....kkkkk......"],
["....knnknnk.....","...knnk.knnk....","..kook...kook...","..kkk....kkk...."],
];
// 歌う時の体（右向き・腕を胸元へ）
const BODY_SING=[
"......kssk......",
".....kcttck.....",
"....kcccttkk....",
"....kcCcksssk...",
"....kcCcTtkk....",
"....kcccNnk.....",
".....knnnnk.....",
".....knnnk......",
".....knnnk......",
".....kooook.....",
".....kkkkk......",
];
// 床に体育座り 16x9
const BODY_SIT=[
".....kksskk.....",
"...kkcttttckk...",
"..kcccttttccck..",
"..kcCkssssskCk..",
"..knnnnnnnnnnk..",
"..knNnnnnnnNnk..",
"..knnnnkknnnnk..",
"..koooo..ooook..",
"..kkkkk..kkkkk..",
];
// 正座（右向き、腕は前へ）16x9
const BODY_KNEEL=[
"......kssk......",
".....kcttck.....",
"....kcccttk.....",
"....kcCcttkkk...",
"....kcCcTtsssk..",
"...kknnnnnkkk...",
"..koonnnnnnnk...",
"..kkkkkkkkkkk...",
];
// 子ども（仰向けで枕の上）8x8
const CHILD=[
"...kkkk...",
".kkyyyykk.",
"kyyYYyyyyk",
"kyYyyyyyyk",
"kyysyyssyk",
"kssssssssk",
"kskkssKksk",
"ksbssssbsk",
".kssssssk.",
"..kkkkkk..",
];
const CHILD_TURN=[
"...kkkk...",
".kkyyyykk.",
"kyyYYyyyyk",
"kyYyyyyyyk",
"kyyyyyysyk",
"kyyyyyssk.",
"kyyyyskKk.",
".kyyysbsk.",
"..kyysssk.",
"...kkkkk..",
];
// グリフ
const G_Z=["zzzzz","...z.","..z..",".z...","zzzzz"];
const G_z=["zzz",".z.","zzz"];
const G_NOTE=["..zz","..zz","..z.","..z.","zzz.","zz.."];
const G_NOTE2=[".zzzz",".z..z",".z..z","zz.zz","zz.zz"];
const G_HEART=[".r.r.","rrrrr","rrrrr",".rrr.","..r.."];
const G_DOTS=["z.z.z"];
const G_SWEAT=[".x.","xax","xxx",".x."];
const G_SIL=[
"....aaaa....",
"...aaaaaa...",
"..aaaaaaaa..",
"..aaaaaaaa..",
"..aaEaaEaa..",
"..aaaaaaaa..",
"..aaaaaaaa..",
".aaaaaaaaaa.",
".aaa.aa.aaa.",
".aaa.aa.aaa.",
"aaaaaaaaaaaa",
"aaaaaaaaaaaa",
"aaaa.aa.aaaa",
"aaaa....aaaa",
"aaa......aaa",
"aaa......aaa",
];

function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function sprite(rows,pal){
  let w=0;for(const r of rows)w=Math.max(w,r.length);
  const c=mkCanvas(w,rows.length),x=c.getContext('2d');
  rows.forEach((r,yy)=>{for(let i=0;i<r.length;i++){const ch=r[i];if(ch==='.'||ch===' ')continue;const col=(pal&&pal[ch])||PAL[ch];if(!col)continue;x.fillStyle=col;x.fillRect(i,yy,1,1);}});
  return c;
}
function flipped(src){const c=mkCanvas(src.width,src.height),x=c.getContext('2d');x.translate(src.width,0);x.scale(-1,1);x.drawImage(src,0,0);return c;}
function rotated(src){ // -90°（頭が左）
  const c=mkCanvas(src.height,src.width),x=c.getContext('2d');x.translate(0,src.width);x.rotate(-Math.PI/2);x.drawImage(src,0,0);return c;}
function stack(parts){ // [[canvas,dx,dy],...] 合成
  let w=0,h=0;for(const p of parts){w=Math.max(w,p[1]+p[0].width);h=Math.max(h,p[2]+p[0].height);}
  const c=mkCanvas(w,h),x=c.getContext('2d');for(const p of parts)x.drawImage(p[0],p[1],p[2]);return c;}
function makeLight(r,rgb){
  const c=mkCanvas(r*2,r*2),x=c.getContext('2d');
  const g=x.createRadialGradient(r,r,0,r,r,r);
  g.addColorStop(0,`rgba(${rgb},1)`);g.addColorStop(.22,`rgba(${rgb},.62)`);g.addColorStop(.5,`rgba(${rgb},.26)`);g.addColorStop(.8,`rgba(${rgb},.07)`);g.addColorStop(1,`rgba(${rgb},0)`);
  x.fillStyle=g;x.fillRect(0,0,r*2,r*2);return c;}

// ───────── 乱数（決定的） ─────────
let seed=1337;function srand(s){seed=s>>>0||1;}function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}

// ───────── 状態 ─────────
const S={
  inited:false, area:null, cv:null, cx:null, buf:null, bx:null, light:null, lx:null, tmp:null, tx:null,
  bg:null, sky:null, skyKey:'', spr:{}, lights:{},
  scale:1, vw:RW, camX:0, camT:0, scan:null, vign:null,
  key:'main', prevKey:'main', sceneT:0, t:0, last:0, acc:0, visible:true, visCheck:0,
  trans:null, // {t,dur,to}
  // ライト強度（現在→目標）
  L:{lamp:1,desk:0,mon:.35,night:0,win:1}, LT:{lamp:1,desk:0,mon:.35,night:0,win:1},
  amb:[0,0,0], flash:0, flashSeq:0, flashT:6, bolt:null,
  glitch:0, glitchT:12, refl:0, reflT:30, ghost:0, ghostT:25,
  wasStream:false, afterStream:0,
};
// アクター（だんのうら）
const A={x:132,tx:132,mode:'stand',face:1,walkF:0,walkT:0,idleT:3,blinkT:2,blink:0,yawn:0,look:0,
  bob:0,stand:0,mood:'normal',spot:0,act:0,subT:0};
// 子ども
const K={stir:0,turn:0,turnT:20,arm:0};
// パーティクル（プール）
const PN=48;const P=[];for(let i=0;i<PN;i++)P.push({on:false,x:0,y:0,vx:0,vy:0,life:0,max:1,g:null,ph:0});
function emit(g,x,y,vx,vy,life){for(let i=0;i<PN;i++){const p=P[i];if(!p.on){p.on=true;p.g=g;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=life;p.max=life;p.ph=Math.random()*6;return p;}}return null;}
// 雨粒（プール）
const DN=110;const D=[];for(let i=0;i<DN;i++)D.push({x:Math.random()*GL.w,y:Math.random()*GL.h,v:1,l:2});
const BEADS=[];for(let i=0;i<7;i++)BEADS.push({x:2+Math.random()*(GL.w-4),y:Math.random()*GL.h,v:0,wait:Math.random()*8});

// ───────── 背景（静的）を一度だけ描く ─────────
function R(x,c,X,Y,W,H){x.fillStyle=c;x.fillRect(X,Y,W,H);}
function buildBG(){
  const c=mkCanvas(RW,RH),x=c.getContext('2d');
  // 壁
  R(x,'#9c94b8',0,0,RW,FLOOR);
  for(let i=0;i<RW;i+=8){R(x,'#948cb0',i,0,1,FLOOR);R(x,'#a59dc0',i+4,0,1,FLOOR);}
  R(x,'#b2aacb',0,0,RW,2); // 天井際
  R(x,'#7c7598',0,2,RW,1);
  // 壁のシミ（雨漏り）
  R(x,'#8f87ab',64,2,3,8);R(x,'#8f87ab',65,10,1,3);
  // 腰板・巾木
  R(x,'#6a5a68',0,FLOOR-3,RW,3);R(x,'#4a3c4a',0,FLOOR-1,RW,1);
  // 床（板張り）
  for(let yy=FLOOR;yy<RH;yy++){const k=(yy-FLOOR)/(RH-FLOOR);R(x,k<.5?'#8a6a52':'#7d5f49',0,yy,RW,1);}
  for(let yy=FLOOR+4;yy<RH;yy+=5)R(x,'#634a3a',0,yy,RW,1);
  srand(77);for(let yy=FLOOR;yy<RH;yy+=5){let xx=Math.floor(rnd()*20);while(xx<RW){R(x,'#634a3a',xx,yy,1,5);R(x,'#9a7a60',xx+1,yy,8,1);xx+=24+Math.floor(rnd()*20);}}
  // ── キッチン（左） ──
  // 吊戸棚
  R(x,'#1b1226',18,8,30,16);R(x,'#d8cdb8',19,9,28,14);R(x,'#bfb29a',19,21,28,2);R(x,'#1b1226',32,9,1,14);R(x,'#8a7a60',30,15,1,3);R(x,'#8a7a60',35,15,1,3);
  // 冷蔵庫
  R(x,'#1b1226',2,26,17,FLOOR-26);R(x,'#dfe4ea',3,27,15,FLOOR-28);R(x,'#c2c8d2',3,40,15,1);R(x,'#b6bcc8',16,28,1,FLOOR-30);
  R(x,'#8b93a3',5,30,1,7);R(x,'#8b93a3',5,43,1,9);
  // 子どもの絵（冷蔵庫）
  R(x,'#fffbea',8,44,8,7);R(x,'#f07a7a',9,47,2,2);R(x,'#7ab0f0',12,46,3,3);R(x,'#3a2a4a',10,49,4,1);R(x,'#ffd84a',14,44,2,1);
  R(x,'#e05a6a',11,43,2,1); // マグネット
  // カウンター
  R(x,'#1b1226',19,44,30,FLOOR-44);R(x,'#c4b49c',20,45,28,3);R(x,'#7e6e5e',20,48,28,FLOOR-49);
  R(x,'#5e5048',33,49,1,FLOOR-50);R(x,'#b0a080',28,55,3,1);R(x,'#b0a080',37,55,3,1);
  R(x,'#9aa4b0',22,45,9,2);R(x,'#6a7480',23,46,7,1); // シンク
  R(x,'#9aa4b0',26,40,1,5);R(x,'#9aa4b0',26,40,4,1); // 蛇口
  // ケトル
  R(x,'#1b1226',38,38,8,7);R(x,'#c85a5a',39,39,6,5);R(x,'#e88080',40,39,2,1);R(x,'#1b1226',45,40,2,1);
  // 黄色い帽子（壁のフック）
  R(x,'#5a4a3a',98,24,1,2);R(x,'#1b1226',95,26,8,5);R(x,'#ffd23a',96,26,6,4);R(x,'#ffe88a',97,26,2,1);R(x,'#e0a020',94,30,10,1);R(x,'#e0a020',96,31,1,3);R(x,'#e0a020',101,31,1,3);
  // ── カレンダー ──
  R(x,'#1b1226',CAL.x-1,CAL.y-1,24,24);R(x,'#f4efe6',CAL.x,CAL.y,22,22);R(x,'#c84a5a',CAL.x,CAL.y,22,4);R(x,'#5a4a4a',CAL.x+10,CAL.y-3,2,3);
  for(let i=0;i<30;i++){const cx=CAL.x+2+(i%6)*3,cy=CAL.y+6+Math.floor(i/6)*3;R(x,'#d6cfc2',cx,cy,2,2);}
  // ── フロアランプ ──
  R(x,'#1b1226',LAMP.x+4,LAMP.y+8,2,FLOOR+10-(LAMP.y+8));R(x,'#4a3a3a',LAMP.x+4,LAMP.y+8,1,FLOOR+10-(LAMP.y+8));
  R(x,'#1b1226',LAMP.x,FLOOR+9,10,2);
  // ── 窓 ──
  R(x,'#3a2e3a',WIN.x-2,WIN.y-3,WIN.w+4,2); // カーテンレール
  R(x,'#1b1226',WIN.x,WIN.y,WIN.w,WIN.h);R(x,'#e6e0ee',WIN.x+1,WIN.y+1,WIN.w-2,WIN.h-2);R(x,'#c3bad3',WIN.x+1,WIN.y+WIN.h-3,WIN.w-2,2);
  x.clearRect(GL.x,GL.y,GL.w,GL.h);
  R(x,'#e6e0ee',MULL_X,GL.y,2,GL.h);R(x,'#b3aac6',MULL_X+1,GL.y,1,GL.h);
  R(x,'#1b1226',WIN.x-3,WIN.y+WIN.h,WIN.w+6,4);R(x,'#d4cce0',WIN.x-2,WIN.y+WIN.h,WIN.w+4,2); // 窓台
  // 窓台の小物（てるてる坊主）
  R(x,'#4a3a4a',152,GL.y,1,6);R(x,'#a8a6c0',150,GL.y+6,5,4);R(x,'#9896b2',149,GL.y+10,7,3);R(x,'#1b1226',151,GL.y+8,1,1);R(x,'#1b1226',153,GL.y+8,1,1);
  // カーテン
  for(const cx0 of [WIN.x-8,WIN.x+WIN.w-1]){
    R(x,'#1b1226',cx0,WIN.y-2,10,WIN.h+8);R(x,'#6a7cc0',cx0+1,WIN.y-1,8,WIN.h+6);
    for(let i=0;i<4;i++){R(x,'#5466a6',cx0+2+i*2,WIN.y-1,1,WIN.h+6);}
    R(x,'#8696d6',cx0+1,WIN.y-1,1,WIN.h+6);
    R(x,'#c8a040',cx0+1,WIN.y+22,8,2); // タッセル
  }
  // ── 時計（壁） ──
  R(x,'#1b1226',CLK.x,CLK.y,24,11);R(x,'#2a2236',CLK.x+1,CLK.y+1,22,9);R(x,'#100c18',CLK.x+2,CLK.y+2,20,7);
  // ── ポスター ──
  R(x,'#1b1226',234,6,20,26);R(x,'#3a2060',235,7,18,24);R(x,'#8a52d4',237,10,14,3);R(x,'#00e8c8',239,15,10,1);R(x,'#ffb3cf',240,18,8,8);R(x,'#3a2060',242,20,4,4);R(x,'#d8cdf0',237,28,14,1);
  // ヘッドホン（フック）
  R(x,'#5a4a4a',230,30,1,2);R(x,'#1b1226',226,32,9,2);R(x,'#1b1226',225,33,2,6);R(x,'#1b1226',233,33,2,6);R(x,'#d94a8a',225,36,2,4);R(x,'#d94a8a',233,36,2,4);
  // ── 机 ──
  R(x,'#1b1226',DESK.x,DESK.y,DESK.w,3);R(x,'#6e5a4a',DESK.x+1,DESK.y,DESK.w-2,2);R(x,'#8a725e',DESK.x+1,DESK.y,DESK.w-2,1);
  R(x,'#1b1226',DESK.x+2,DESK.y+3,3,FLOOR+8-DESK.y-3);R(x,'#4a3a32',DESK.x+3,DESK.y+3,1,FLOOR+8-DESK.y-3);
  R(x,'#1b1226',DESK.x+DESK.w-5,DESK.y+3,3,FLOOR+8-DESK.y-3);
  // PC本体（机の下）
  R(x,'#1b1226',236,55,14,FLOOR+8-55);R(x,'#2e2840',237,56,12,FLOOR+6-55);R(x,'#3c3454',238,57,2,14);R(x,'#121018',240,66,7,1);R(x,'#121018',240,68,7,1);
  // モニター
  R(x,'#1b1226',MON.x,MON.y,MON.w,MON.h);R(x,'#2c2638',MON.x+1,MON.y+1,MON.w-2,MON.h-2);
  R(x,'#1b1226',MON.x+13,MON.y+MON.h,4,3);R(x,'#1b1226',MON.x+9,DESK.y-1,12,1);
  // キーボード・マウス
  R(x,'#1b1226',203,48,20,2);R(x,'#cfc8dc',204,48,18,1);R(x,'#1b1226',226,48,4,2);R(x,'#cfc8dc',227,48,2,1);
  // マイク（アーム）
  R(x,'#1b1226',248,30,2,20);R(x,'#1b1226',236,24,14,2);R(x,'#3a3448',237,24,12,1);R(x,'#1b1226',232,22,5,8);R(x,'#7a7290',233,23,3,6);R(x,'#b0a8c4',233,23,1,5);
  // マグカップ
  R(x,'#1b1226',187,45,6,5);R(x,'#f4efe6',188,46,4,3);R(x,'#8a52d4',188,47,4,1);R(x,'#1b1226',193,46,1,2);
  // 請求書の束（机の端）
  R(x,'#e8e2d0',184,47,1,3);R(x,'#f4efe6',184,49,1,1);
  // ── 低いちゃぶ台と請求書 ──
  R(x,'#1b1226',156,73,24,3);R(x,'#9a6a4a',157,73,22,2);R(x,'#1b1226',158,76,2,6);R(x,'#1b1226',176,76,2,6);
  R(x,'#f4efe6',161,71,8,2);R(x,'#e05a6a',166,71,2,1);R(x,'#e8e2d0',163,70,7,1);R(x,'#f4efe6',170,72,5,1);
  // ── 床の小物（ぬいぐるみ・積み木） ──
  {const bx=46,by=80;R(x,'#1b1226',bx,by,7,7);R(x,'#c49a6a',bx+1,by+1,5,5);R(x,'#1b1226',bx-1,by-2,3,3);R(x,'#1b1226',bx+5,by-2,3,3);R(x,'#c49a6a',bx,by-1,1,1);R(x,'#c49a6a',bx+6,by-1,1,1);R(x,'#c49a6a',bx+1,by,5,1);R(x,'#1b1226',bx+2,by+2,1,1);R(x,'#1b1226',bx+4,by+2,1,1);R(x,'#e8b0a0',bx+3,by+3,1,1);R(x,'#e05a8a',bx+2,by+5,3,1);}
  R(x,'#1b1226',30,83,5,5);R(x,'#e85a5a',31,84,3,3);R(x,'#1b1226',35,85,4,4);R(x,'#5aa0e8',36,86,2,2);R(x,'#1b1226',140,86,4,3);R(x,'#ffd23a',141,87,2,1);
  // ── 布団 ──
  R(x,'#1b1226',FUTON.x-1,FUTON.y-1,FUTON.w+2,FUTON.h+2);R(x,'#e8e0d2',FUTON.x,FUTON.y,FUTON.w,FUTON.h);R(x,'#cfc6b6',FUTON.x,FUTON.y+FUTON.h-3,FUTON.w,3);
  
  return c;
}

// ───────── スプライト類の生成 ─────────
function buildSprites(){
  const s=S.spr;
  s.headF=sprite(HEAD_F);s.headB=sprite(HEAD_B);s.headS=sprite(HEAD_S);s.headSL=flipped(s.headS);
  s.bodyF=sprite(BODY_F);s.bodyB=sprite(BODY_B);
  s.bodyS=sprite(BODY_S);s.legs=LEGS_S.map(l=>sprite(l));
  s.walkR=s.legs.map(l=>stack([[s.bodyS,0,0],[l,0,7]]));s.walkL=s.walkR.map(flipped);
  s.sing=sprite(BODY_SING);s.sit=sprite(BODY_SIT);s.kneel=sprite(BODY_KNEEL);s.kneelL=flipped(s.kneel);
  // 寝顔（目を閉じた正面の頭を回転）
  const hc=mkCanvas(16,17),hx=hc.getContext('2d');hx.drawImage(s.headF,0,0);
  hx.fillStyle=PAL.s;hx.fillRect(4,11,2,2);hx.fillRect(10,11,2,2);hx.fillRect(7,11,2,2);
  hx.fillStyle=PAL.E;hx.fillRect(4,12,2,1);hx.fillRect(10,12,2,1);hx.fillStyle=PAL.b;hx.fillRect(4,14,1,1);hx.fillRect(11,14,1,1);
  s.sleepF=hc;
  s.child=sprite(CHILD);s.childT=sprite(CHILD_TURN);
  s.Z=sprite(G_Z);s.z=sprite(G_z);s.note=sprite(G_NOTE,{z:'#ffd6f0'});s.note2=sprite(G_NOTE2,{z:'#bfefff'});
  s.heart=sprite(G_HEART,{r:'#ff7aa8'});s.dots=sprite(G_DOTS);s.sweat=sprite(G_SWEAT);s.sil=sprite(G_SIL,{a:'#dcd6f4',E:'#1a0a14'});
  s.Zb=sprite(G_Z,{z:'#bcd4ff'});s.zb=sprite(G_z,{z:'#bcd4ff'});
  // ライト
  S.lights.lamp=makeLight(72,'255,196,128');
  S.lights.desk=makeLight(44,'255,236,190');
  S.lights.mon=makeLight(48,'120,170,255');
  S.lights.win=makeLight(60,'120,140,220');
  S.lights.night=makeLight(26,'255,150,80');
  S.lights.small=makeLight(10,'255,255,255');
  S.lights.glowW=makeLight(14,'255,210,150');
  S.lights.glowC=makeLight(14,'110,200,255');
}

// ───────── 色ユーティリティ ─────────
function hx2(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function lerpKeys(keys,m,out){ // keys: [[m,[r,g,b]],...]
  let a=keys[0],b=keys[keys.length-1];
  for(let i=0;i<keys.length-1;i++){if(m>=keys[i][0]&&m<=keys[i+1][0]){a=keys[i];b=keys[i+1];break;}}
  if(m<=keys[0][0]){a=b=keys[0];}else if(m>=keys[keys.length-1][0]){a=b=keys[keys.length-1];}
  const k=a===b?0:(m-a[0])/(b[0]-a[0]);
  for(let i=0;i<3;i++)out[i]=a[1][i]+(b[1][i]-a[1][i])*k;return out;}
const SKY_TOP=[[0,hx2('#0d0b2a')],[180,hx2('#080720')],[300,hx2('#05050f')],[390,hx2('#10123a')],[450,hx2('#34447e')],[480,hx2('#7a98d0')]];
const SKY_BOT=[[0,hx2('#3a2858')],[180,hx2('#241a40')],[300,hx2('#1a1232')],[390,hx2('#2e2a58')],[450,hx2('#c88690')],[480,hx2('#ffcf9c')]];
const AMB=[[0,[42,40,80]],[180,[32,30,66]],[300,[27,26,58]],[420,[44,42,82]],[460,[88,82,124]],[480,[142,132,164]]];
function nightMin(){
  const h=(typeof gs!=='undefined'&&gs)?gs.hour:22, mi=(typeof gs!=='undefined'&&gs)?gs.min:0;
  if(h>=22)return (h-22)*60+mi;
  if(h<6)return 120+h*60+mi;
  if(h<14)return 480;
  return 0;
}
const _c1=[0,0,0],_c2=[0,0,0];
function rgb(a){return 'rgb('+(a[0]|0)+','+(a[1]|0)+','+(a[2]|0)+')';}

// 空と街の描画（ゲーム内時刻が変わった時だけ）
let CITY=null;
function buildCity(){
  srand(4242);CITY={far:[],near:[]};
  let xx=-2;while(xx<GL.w){const w=4+Math.floor(rnd()*6),h=4+Math.floor(rnd()*9);CITY.far.push({x:xx,w,h});xx+=w-1;}
  xx=-3;while(xx<GL.w){const w=6+Math.floor(rnd()*9),h=4+Math.floor(rnd()*8);const wins=[];for(let wy=2;wy<h-1;wy+=3)for(let wx=1;wx<w-1;wx+=2)wins.push({x:wx,y:wy,r:rnd(),c:rnd()<.8?0:1});CITY.near.push({x:xx,w,h,wins});xx+=w+1+Math.floor(rnd()*2);}
}
function drawSky(m){
  if(!S.sky)S.sky=mkCanvas(GL.w,GL.h);
  const x=S.sky.getContext('2d');
  lerpKeys(SKY_TOP,m,_c1);lerpKeys(SKY_BOT,m,_c2);
  for(let yy=0;yy<GL.h;yy++){const k=Math.pow(yy/(GL.h-1),1.4);x.fillStyle='rgb('+((_c1[0]+(_c2[0]-_c1[0])*k)|0)+','+((_c1[1]+(_c2[1]-_c1[1])*k)|0)+','+((_c1[2]+(_c2[2]-_c1[2])*k)|0)+')';x.fillRect(0,yy,GL.w,1);}
  // 遠景のビル
  const dawn=Math.max(0,(m-420)/60);
  x.fillStyle=dawn>.5?'#3a3a60':'#1c1838';for(const b of CITY.far)x.fillRect(b.x,GL.h-b.h-6,b.w,b.h+6);
  // 電波塔
  x.fillStyle=dawn>.5?'#3a3a60':'#1c1838';x.fillRect(31,GL.h-24,1,18);x.fillRect(30,GL.h-12,3,6);
  // 近景のビルと窓明かり（夜が更けると減る）
  const lit=m<60?.55:m<180?.42:m<300?.22:m<420?.16:.3;
  for(const b of CITY.near){
    x.fillStyle=dawn>.5?'#2a2848':'#0d0b1c';x.fillRect(b.x,GL.h-b.h,b.w,b.h);
    for(const w of b.wins){if(w.r<lit){x.fillStyle=w.c?'#9adcff':'#ffd27a';x.fillRect(b.x+w.x,GL.h-b.h+w.y,1,1);}}
  }
}

// ───────── 初期化 ─────────
function init(){
  if(S.inited)return true;
  const area=document.querySelector('#game-screen .scene-area')||document.querySelector('.scene-area');
  if(!area)return false;
  injectCSS();
  S.area=area;
  const cv=document.createElement('canvas');cv.className='hs-canvas';cv.setAttribute('aria-hidden','true');
  area.insertBefore(cv,area.firstChild);
  const edge=document.createElement('div');edge.className='hs-fade-edge';area.insertBefore(edge,cv.nextSibling);
  S.cv=cv;S.cx=cv.getContext('2d',{alpha:false});
  S.buf=mkCanvas(RW,RH);S.bx=S.buf.getContext('2d');
  S.light=mkCanvas(RW,RH);S.lx=S.light.getContext('2d');S.glow=mkCanvas(RW,RH);S.gx=S.glow.getContext('2d');
  S.tmp=mkCanvas(RW,RH);S.tx=S.tmp.getContext('2d');
  S.bg=buildBG();buildSprites();buildCity();
  resize();
  if(window.ResizeObserver)new ResizeObserver(resize).observe(area);else window.addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)kick();});
  S.inited=true;
  applySetup(S.key,true);
  kick();
  return true;
}
function resize(){
  if(!S.area)return;
  const r=S.area.getBoundingClientRect();
  if(r.width<2||r.height<2)return;
  const dpr=window.devicePixelRatio||1;
  // 仮想1ピクセル＝デバイス k ピクセル（整数・最大4）。それ以上は CSS の pixelated 拡大に任せる。
  const k=Math.max(1,Math.min(4,Math.round(r.height*dpr/RH)));
  const ch=RH*k, cw=Math.max(1,Math.round(r.width*ch/r.height));
  if(S.cv.width!==cw)S.cv.width=cw;if(S.cv.height!==ch)S.cv.height=ch;
  S.scale=k; S.vw=cw/k;
  S.cx.imageSmoothingEnabled=false;
  // スキャンライン模様
  if(k>=3){const pc=mkCanvas(1,k),px=pc.getContext('2d');px.fillStyle='rgba(0,0,0,.16)';px.fillRect(0,k-1,1,1);S.scan=S.cx.createPattern(pc,'repeat');}else S.scan=null;
  // 周辺減光（低解像度で一度だけ作る）
  const vw=Math.ceil(Math.min(S.vw,RW));
  const vc=mkCanvas(vw,RH),vx=vc.getContext('2d');
  const g=vx.createRadialGradient(vw/2,RH*.45,Math.min(vw,RH)*.4,vw/2,RH*.45,Math.max(vw,RH)*.72);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(4,2,12,.6)');vx.fillStyle=g;vx.fillRect(0,0,vw,RH);S.vign=vc;
}

// ───────── シーン設定 ─────────
const FOCUS={main:132,rest_light:120,rest_deep:96,study:210,childcare:104,singpractice:192};
function lightsFor(k){
  const L=S.LT;L.desk=0;L.night=0;L.win=1;
  switch(k){
    case'rest_light':L.lamp=.55;L.mon=.15;break;
    case'rest_deep':L.lamp=0;L.mon=0;L.night=1;L.win=.75;break;
    case'study':L.lamp=.45;L.mon=.6;L.desk=1;break;
    case'childcare':L.lamp=.6;L.mon=.12;break;
    case'singpractice':L.lamp=.8;L.mon=.75;break;
    default:L.lamp=1;L.mon=.3;
  }
}
function applySetup(k,instant){
  S.key=k;S.sceneT=0;lightsFor(k);
  for(let i=0;i<PN;i++)P[i].on=false;
  A.act=0;A.subT=0;A.yawn=0;A.look=0;
  switch(k){
    case'rest_light':A.mode='sit';A.x=A.tx=124;break;
    case'rest_deep':A.mode='lie';A.x=A.tx=84;break;
    case'study':A.mode='desk';A.x=A.tx=208;break;
    case'childcare':A.mode='kneel';A.x=A.tx=117;K.stir=3+Math.random()*2+((typeof gs!=='undefined'&&gs.childStress>50)?2:0);break;
    case'singpractice':A.mode='sing';A.x=A.tx=180;break;
    default:{
      // メインに戻る：前の場所から立ち上がって歩いてくる
      const fromX={rest_light:124,rest_deep:104,study:206,childcare:117,singpractice:180}[S.prevKey];
      A.mode='stand';A.idleT=2+Math.random()*3;
      if(!instant&&fromX!==undefined){A.x=fromX;A.tx=pickSpot();A.mode='walk';}
      else if(instant){A.x=A.tx=pickSpot();}
    }
  }
  if(instant){const L=S.L,T=S.LT;for(const n in T)L[n]=T[n];S.camX=camTarget();}
}
function pickSpot(){const sp=[132,148,126];A.spot=(A.spot+1+Math.floor(Math.random()*2))%sp.length;return sp[A.spot];}
function camTarget(){
  const vw=Math.min(S.vw,RW);
  let f=FOCUS[S.key]||132;if(S.key==='main')f=A.x+4;
  return Math.max(0,Math.min(RW-vw,f-vw/2));
}

window.hsSetScene=function(k){
  if(!S.inited&&!init()){S.key=k;return;}
  if(!(k in FOCUS))k='main';
  const from=S.key;
  // メインへ戻る時は暗転せず歩いて戻る。それ以外はモザイク遷移。
  if(k==='main'){S.prevKey=from;if(from!=='main'||S.trans)applySetup('main',false);else{S.sceneT=0;}S.trans=null;}
  else{S.prevKey=from;S.trans={t:0,dur:.75,to:k,done:false};}
  kick();
};

// loadScene をラップ（他のラップも尊重して必ず前のものを呼ぶ）
if(typeof window.loadScene==='function'){
  const _ls=window.loadScene;
  window.loadScene=function(k){const r=_ls.apply(this,arguments);try{hsSetScene(k);}catch(e){console.warn('[homescene]',e);}return r;};
  try{loadScene=window.loadScene;}catch(e){}
}

// ───────── 更新 ─────────
function gsv(n,d){return (typeof gs!=='undefined'&&gs&&typeof gs[n]==='number')?gs[n]:d;}
function phase(){try{return typeof getPhase==='function'?getPhase():1;}catch(e){return 1;}}
function rainLevel(){try{return typeof rainI==='number'?rainI:.7;}catch(e){return .7;}}

function update(dt){
  S.t+=dt;S.sceneT+=dt;
  const ph=phase(), fat=gsv('fatigue',30), men=gsv('mental',70);
  // 遷移
  if(S.trans){const tr=S.trans;tr.t+=dt;if(!tr.done&&tr.t>=tr.dur/2){tr.done=true;S.prevKey=S.key;applySetup(tr.to,true);}if(tr.t>=tr.dur)S.trans=null;}
  // ライト
  const L=S.L,T=S.LT,ks=Math.min(1,dt*2.2);for(const n in T)L[n]+=(T[n]-L[n])*ks;
  // 雷
  const rl=rainLevel();
  S.flashT-=dt;
  if(S.flashT<=0&&rl>.3){S.flashSeq=1;S.flashT=(ph===3?9:16)+Math.random()*(26/Math.max(.5,rl));makeBolt();}
  if(S.flashSeq>0){S.flashSeq+=dt;const q=S.flashSeq;S.flash=q<1.08?1:q<1.16?.25:q<1.26?.85:q<1.6?Math.max(0,.85-(q-1.26)*2.5):0;if(q>1.7){S.flashSeq=0;S.flash=0;S.bolt=null;}}
  // 第3段階の異変
  if(ph===3){
    S.glitchT-=dt;if(S.glitchT<=0){S.glitch=.12+Math.random()*.16;S.glitchT=(men<20?6:12)+Math.random()*14;}
    S.reflT-=dt*(A.mode==='back'?2.5:1);if(S.reflT<=0&&S.refl<=0){S.refl=3;S.reflT=28+Math.random()*30;}
    if(S.key==='main'){S.ghostT-=dt;if(S.ghostT<=0&&S.ghost<=0){S.ghost=5.5;S.ghostT=24+Math.random()*26;}}
  }else{S.glitch=0;S.refl=0;S.ghost=0;}
  if(S.glitch>0)S.glitch-=dt;if(S.refl>0)S.refl-=dt;if(S.ghost>0)S.ghost-=dt;
  if(S.afterStream>0)S.afterStream-=dt;
  if(S.flick>0)S.flick-=dt;else if(Math.random()<dt*.08)S.flick=.12;
  // アクター
  updateActor(dt,fat,men);
  // 子ども
  if(K.stir>0)K.stir-=dt;
  K.turnT-=dt;if(K.turnT<=0){K.turn=K.turn?0:1;K.turnT=18+Math.random()*30;}
  if(S.key==='childcare'&&K.stir>0&&Math.random()<dt*1.2)emit('sweat',FUTON.x+13,60,0,-2,0.6);
  // パーティクル
  for(let i=0;i<PN;i++){const p=P[i];if(!p.on)continue;p.life-=dt;if(p.life<=0){p.on=false;continue;}p.x+=p.vx*dt+Math.sin(S.t*2+p.ph)*dt*3;p.y+=p.vy*dt;}
  // 雨
  const spd=60+rl*45;
  for(let i=0;i<DN;i++){const d=D[i];d.y+=spd*d.v*dt;d.x-=spd*.18*d.v*dt;if(d.y>GL.h){d.y-=GL.h+4;d.x=Math.random()*(GL.w+8);}if(d.x<-2)d.x+=GL.w+4;}
  for(const b of BEADS){if(b.wait>0){b.wait-=dt;continue;}b.y+=(4+Math.random()*10)*dt;if(b.y>GL.h){b.y=-2;b.x=2+Math.random()*(GL.w-4);b.wait=2+Math.random()*8;}}
  // カメラ
  const ct=camTarget();S.camX+=(ct-S.camX)*Math.min(1,dt*3);
}
function makeBolt(){
  if(Math.random()<.45){S.bolt=null;return;}
  if(!S.bolt)S.bolt=new Int8Array(14);
  let xx=6+Math.floor(Math.random()*(GL.w-12));for(let i=0;i<14;i++){xx+=Math.floor(Math.random()*3)-1;S.bolt[i]=xx;}
}
function updateActor(dt,fat,men){
  A.blinkT-=dt;if(A.blinkT<=0){A.blink=.14;A.blinkT=2+Math.random()*3.5;}if(A.blink>0)A.blink-=dt;
  if(A.yawn>0)A.yawn-=dt;
  const tired=fat>=70, low=men<25;
  A.mood=low?'low':tired?'tired':(men>70&&fat<40)?'good':'normal';
  if(S.key==='main'){
    if(A.mode==='walk'){
      const sp=(tired?13:21)*dt, d=A.tx-A.x;
      if(Math.abs(d)<=sp){A.x=A.tx;A.mode=low?'sit':'stand';A.idleT=2.5+Math.random()*3;}
      else{A.x+=Math.sign(d)*sp;A.face=Math.sign(d);A.walkT+=dt*(tired?5:7);A.walkF=Math.floor(A.walkT)%4;}
      return;
    }
    if(low&&A.mode!=='sit'){A.tx=124;A.mode=Math.abs(A.x-124)>1?'walk':'sit';return;}
    if(!low&&A.mode==='sit'){A.mode='stand';}
    A.idleT-=dt;
    if(A.mode==='back'){A.look-=dt;if(A.look<=0){A.mode='stand';A.idleT=3+Math.random()*4;}return;}
    if(A.idleT<=0&&A.mode==='stand'){
      const r=Math.random();
      if(r<.42&&A.x>=122&&A.x<=162){A.mode='back';A.look=2.8+Math.random()*2.5;}
      else if(r<.75){A.tx=pickSpot();if(Math.abs(A.tx-A.x)>2)A.mode='walk';else A.idleT=2;}
      else if(tired||r<.85){A.yawn=1.3;A.idleT=3+Math.random()*3;}
      else A.idleT=2.5+Math.random()*3;
    }
    if(A.mode==='sit'&&Math.random()<dt*.15)emit('dots',A.x+4,57,0,-3,1.6);
  }else{
    // 各アクション中の演出
    A.subT+=dt;
    if(S.key==='rest_light'){if(A.subT>1.6){A.subT=0;emit('z',A.x+12,56,4,-6,2.4);}}
    else if(S.key==='rest_deep'){if(A.subT>1.4){A.subT=0;emit('Z',FUTON.x+36,54,5,-6,3);}}
    else if(S.key==='study'){
      if(A.subT>.18&&Math.random()<.5){A.subT=0;emit('dot',A.x+10+Math.random()*3,DESK.y-1,(Math.random()-.5)*8,-8,.35);}
      if(fat>=70&&Math.floor(S.sceneT/3)%3===2)A.act=1;else A.act=0; // 居眠りでうとうと
    }
    else if(S.key==='singpractice'){if(A.subT>.7){A.subT=0;emit(Math.random()<.5?'note':'note2',A.x+14,60,6+Math.random()*6,-9,2.6);}}
    else if(S.key==='childcare'){if(K.stir<=0&&A.subT>2.2){A.subT=0;emit(Math.random()<.35?'heart':'zb',FUTON.x+12+Math.random()*4,60,3,-5,2.4);}}
  }
}

// ───────── 描画 ─────────
function D2(img,x,y){S.bx.drawImage(img,Math.round(x),Math.round(y));}
function digit(x,n,X,Y,col){ // 3x5 数字
  const F=DIG[n];x.fillStyle=col;for(let i=0;i<15;i++)if(F&(1<<(14-i)))x.fillRect(X+(i%3),Y+((i/3)|0),1,1);}
const DIG=[0b111101101101111,0b010110010010111,0b111001111100111,0b111001111001111,0b101101111001001,0b111100111001111,0b111100111101111,0b111001010010010,0b111101111101111,0b111101111001111];

function drawWindow(x,m,ph){
  const sk=Math.round(m/5);
  if(S.skyKey!==sk){S.skyKey=sk;drawSky(m);}
  x.drawImage(S.sky,GL.x,GL.y);
  // 航空障害灯
  if(Math.floor(S.t*1.2)%2===0){x.fillStyle='#ff4050';x.fillRect(GL.x+31,GL.y+GL.h-25,1,1);}
  // 雷
  if(S.flash>0){
    x.globalAlpha=S.flash*.75;x.fillStyle='#dfe6ff';x.fillRect(GL.x,GL.y,GL.w,GL.h);x.globalAlpha=1;
    if(S.bolt&&S.flash>.5){x.fillStyle='#ffffff';for(let i=0;i<14;i++)x.fillRect(GL.x+S.bolt[i],GL.y+i,1,1);}
  }
  // 映り込み（第3段階）
  if(S.refl>0){const a=S.refl>2.4?(3-S.refl)/.6:S.refl<.6?S.refl/.6:1;x.globalAlpha=a*.38;x.drawImage(S.spr.sil,GL.x+27,GL.y+GL.h-16);x.globalAlpha=1;}
  // 雨（遠い筋）
  const rl=rainLevel(),n=Math.min(DN,Math.round(rl*40));
  x.fillStyle='rgba(170,185,255,.55)';
  for(let i=0;i<n;i++){const d=D[i];const px=GL.x+(d.x|0),py=GL.y+(d.y|0);if(px<GL.x||px>=GL.x+GL.w)continue;x.fillRect(px,py,1,d.l);if(d.l>2&&px-1>=GL.x)x.fillRect(px-1,py+d.l,1,1);}
  // ガラスの水滴
  x.fillStyle='rgba(220,230,255,.6)';for(const b of BEADS){x.fillRect(GL.x+(b.x|0),GL.y+(b.y|0),1,2);}
  x.fillStyle='rgba(220,230,255,.18)';for(const b of BEADS){if(b.wait<=0)x.fillRect(GL.x+(b.x|0),GL.y,1,Math.max(0,b.y|0));}
  // 結露の下端
  x.fillStyle='rgba(200,210,240,.12)';x.fillRect(GL.x,GL.y+GL.h-3,GL.w,3);
}

function drawCalendar(x){
  const day=gsv('day',1);
  for(let i=0;i<30;i++){
    const cx=CAL.x+2+(i%6)*3,cy=CAL.y+6+((i/6)|0)*3;
    if(i+1<day){x.fillStyle='#c84a5a';x.fillRect(cx,cy,1,1);x.fillRect(cx+1,cy+1,1,1);}
    else if(i+1===day){x.fillStyle=(Math.floor(S.t*2)%2)?'#00b8a0':'#3a8aa0';x.fillRect(cx,cy,2,2);}
    else if(i===29){x.fillStyle='#e05a6a';x.fillRect(cx,cy,2,2);}
  }
}

function drawLampShade(x,on){
  const X=LAMP.x,Y=LAMP.y;
  x.fillStyle='#1b1226';x.fillRect(X-1,Y,12,9);x.fillRect(X,Y-1,10,1);
  x.fillStyle=on>.3?'#ffe2b0':'#a89a86';x.fillRect(X,Y,10,8);
  x.fillStyle=on>.3?'#ffcf8a':'#8a7c6c';x.fillRect(X,Y+6,10,2);x.fillRect(X,Y,1,8);
}

function drawDeskProps(x,k){
  // 卓上ライト（勉強時に点灯）
  x.fillStyle='#1b1226';x.fillRect(246,36,2,14);x.fillRect(238,34,10,2);x.fillRect(236,35,6,4);x.fillRect(244,49,6,1);
  x.fillStyle=S.L.desk>.3?'#fff4c8':'#6a6276';x.fillRect(237,38,4,1);
  if(k==='study'){
    // 開いた参考書とノート
    x.fillStyle='#1b1226';x.fillRect(188,46,22,4);x.fillStyle='#f4efe6';x.fillRect(189,46,9,3);x.fillRect(200,46,9,3);x.fillStyle='#c8c0b0';x.fillRect(198,46,2,3);
    x.fillStyle='#8a8aa0';x.fillRect(190,47,6,1);x.fillRect(201,47,6,1);x.fillRect(190,48,5,1);
    x.fillStyle='#e05a6a';x.fillRect(201,48,3,1);
    // 参考書の山
    x.fillStyle='#1b1226';x.fillRect(184,42,8,8);x.fillStyle='#3a6ab0';x.fillRect(185,43,6,2);x.fillStyle='#d0a030';x.fillRect(185,45,6,2);x.fillStyle='#5aa060';x.fillRect(185,47,6,2);
  }
}

function drawScreen(x,k,ph){
  const X=SCR.x,Y=SCR.y,W=SCR.w,H=SCR.h,m=S.L.mon;
  if(S.ghost>0&&ph===3){
    x.fillStyle='#0a0612';x.fillRect(X,Y,W,H);
    const sc=(S.t*6)|0;
    for(let i=0;i<5;i++){const row=(i+sc)%9,yy=Y+H-2-i*3;const red=((row*7+sc)%11)===0;
      x.fillStyle=red?'#ff3050':'#6a5a8a';x.fillRect(X+2,yy,3,1);x.fillStyle=red?'#ff8090':'#b8b0d0';x.fillRect(X+6,yy,6+((row*5)%12),1);}
    if(Math.floor(S.t*3)%2){x.fillStyle='#ff3050';x.fillRect(X+2,Y+2,2,2);}
    return;
  }
  if(m<.05){x.fillStyle='#0c0a12';x.fillRect(X,Y,W,H);x.fillStyle=Math.floor(S.t)%3?'#d08030':'#603818';x.fillRect(MON.x+MON.w-3,MON.y+MON.h-2,1,1);return;}
  if(k==='study'){
    x.fillStyle='#e8ecf4';x.fillRect(X,Y,W,H);x.fillStyle='#3a62b0';x.fillRect(X,Y,W,2);
    x.fillStyle='#9aa0b4';for(let i=0;i<5;i++)x.fillRect(X+2,Y+4+i*2,6+((i*7)%14),1);
    x.fillStyle='#d04050';x.fillRect(X+W-8,Y+5,5,4);
    return;
  }
  if(k==='singpractice'){
    x.fillStyle='#120a24';x.fillRect(X,Y,W,H);
    const p=(S.sceneT*.35)%1;
    for(let i=0;i<3;i++){const yy=Y+4+i*4,w=W-6-i*3;x.fillStyle='#5a4a8a';x.fillRect(X+3,yy,w,1);if(i===((S.sceneT/2.8)|0)%3){x.fillStyle='#ff7ab8';x.fillRect(X+3,yy,(w*p)|0,1);}}
    x.fillStyle='#00e8c8';x.fillRect(X+2,Y+H-2,((W-4)*((S.sceneT*.08)%1))|0,1);
    return;
  }
  if(S.afterStream>0){
    x.fillStyle='#160c2a';x.fillRect(X,Y,W,H);x.fillStyle='#2a1a4a';x.fillRect(X+1,Y+1,15,10);
    x.fillStyle='#e05a8a';x.fillRect(X+6,Y+4,4,5);x.fillStyle='#8a52d4';x.fillRect(X+17,Y+1,8,14);
    x.fillStyle='#d8cdf0';for(let i=0;i<4;i++)x.fillRect(X+18,Y+3+i*3,4+(i%2)*2,1);
    x.fillStyle='#ff3050';x.fillRect(X+2,Y+12,4,2);
    return;
  }
  // スクリーンセーバー（ゆらぐロゴ）
  x.fillStyle='#0c0a1a';x.fillRect(X,Y,W,H);
  const bx=X+2+(((Math.sin(S.t*.4)+1)*.5*(W-10))|0), by=Y+2+(((Math.cos(S.t*.31)+1)*.5*(H-7))|0);
  x.fillStyle='#4a2a80';x.fillRect(bx,by,6,3);x.fillStyle='#8a52d4';x.fillRect(bx+1,by+1,4,1);
}

function pillow(x,X,Y,w){x.fillStyle='#1b1226';x.fillRect(X-1,Y-1,w+2,6);x.fillStyle='#f4efe6';x.fillRect(X,Y,w,4);x.fillStyle='#d8d0c0';x.fillRect(X,Y+3,w,1);x.fillStyle='#ffffff';x.fillRect(X+1,Y,w-3,1);}
function drawChild(x,k){
  const breath=(Math.sin(S.t*1.7)>.2)?1:0;
  const stirring=k==='childcare'&&K.stir>0;
  const turn=stirring?(Math.floor(S.t*2.2)%2):K.turn;
  const both=A.mode==='lie';
  pillow(x,FUTON.x+2,FUTON.y-3,14);
  if(both)pillow(x,FUTON.x+20,FUTON.y-3,18);
  // 子どもの頭
  D2(turn?S.spr.childT:S.spr.child,FUTON.x+4,FUTON.y-7+(stirring&&turn?1:0)+(breath&&!stirring?0:0));
  // 親（添い寝）
  if(both){const br=(Math.sin(S.t*1.1)>0)?1:0;D2(S.spr.sleepF,FUTON.x+21,FUTON.y-14+br);}
  // 掛け布団
  const by=FUTON.y+1-breath, X0=FUTON.x+1, bw=FUTON.w-3, bh=FUTON.h-1+breath;
  x.fillStyle='#1b1226';x.fillRect(X0-1,by-1,bw+2,bh+1);
  x.fillStyle='#6f8fd0';x.fillRect(X0,by,bw,bh-1);
  x.fillStyle='#9ab4ec';x.fillRect(X0,by,bw,2);x.fillStyle='#f4efe6';x.fillRect(X0,by,bw,1);
  x.fillStyle='#5670b0';x.fillRect(X0,by+bh-4,bw,2);
  if(both){x.fillStyle='#5670b0';x.fillRect(X0+17,by+3,1,bh-6);x.fillStyle='#86a2de';x.fillRect(X0+28,by+2,10,2);}
  else{x.fillStyle='#86a2de';x.fillRect(X0+6,by+2,14,2);x.fillStyle='#5670b0';x.fillRect(X0+18,by+4,1,bh-7);}
  // 星柄
  x.fillStyle='#f4dc7a';for(let i=0;i<6;i++){x.fillRect(X0+5+i*9,by+4+(i%2)*3,1,1);if(i%2)x.fillRect(X0+4+i*9,by+5,3,1),x.fillRect(X0+5+i*9,by+4,1,3);}
  // 寝返り中の腕
  if(stirring&&Math.floor(S.t*1.5)%2){x.fillStyle='#1b1226';x.fillRect(FUTON.x+12,by-2,7,3);x.fillStyle=PAL.s;x.fillRect(FUTON.x+13,by-1,5,1);}
}

function drawActor(x,fat,men){
  const s=S.spr, mood=A.mood, t=S.t;
  const bx=Math.round(A.x), feet=84;
  switch(A.mode){
    case'stand':{
      const sway=mood==='tired'?(Math.sin(t*1.3)>0?1:0):0;
      const bob=(Math.sin(t*2.2)>.6)?1:0; // 呼吸
      D2(s.bodyF,bx+sway,feet-11);
      const hy=feet-11-16+bob+(mood==='low'?1:0);
      D2(s.headF,bx+sway,hy);
      drawFaceF(x,bx+sway,hy,fat,men);
      if(mood==='tired'&&Math.sin(t*.7)>.85&&A.yawn<=0)A.yawn=1.2;
      break;}
    case'back':{
      const bob=(Math.sin(t*2.2)>.6)?1:0;
      D2(s.bodyB,bx,feet-11);D2(s.headB,bx,feet-27+bob-1);
      break;}
    case'walk':{
      const img=(A.face<0?s.walkL:s.walkR)[A.walkF];const hop=(A.walkF%2)?-1:0;
      D2(img,bx,feet-11+hop);D2(A.face<0?s.headSL:s.headS,bx,feet-27+hop);
      drawFaceS(x,bx,feet-27+hop,A.face<0,fat);
      break;}
    case'sit':{
      const nod=mood==='low'||S.key==='rest_light'?(Math.sin(t*.9)>0?1:0):0;
      D2(s.sit,bx,feet-9);
      const hy=feet-9-15+(mood==='low'?2:0)+nod;
      D2(s.headF,bx,hy);
      if(S.key==='rest_light'||mood==='low')drawEyes(x,bx,hy,'closed');else drawFaceF(x,bx,hy,fat,men);
      if(mood==='low'&&S.key==='main'){ // どんより線
        x.fillStyle='#6a5a9a';for(let i=0;i<4;i++){const ly=hy-6+((t*6+i*3)%6|0);x.fillRect(bx+3+i*3,ly,1,3);}
      }
      break;}
    case'desk':{
      const scr=(Math.floor(t*8)%2), nod=A.act?2:0, Y0=DESK.y-1;
      // 背中（上半身のみ）
      x.drawImage(s.bodyB,0,0,16,6,bx,Y0,16,6);
      // 右腕（鉛筆を動かす）
      x.fillStyle='#1b1226';x.fillRect(bx+12,Y0+1+scr,5,4);x.fillStyle=PAL.c;x.fillRect(bx+13,Y0+2+scr,3,2);x.fillStyle=PAL.s;x.fillRect(bx+15,Y0+1+scr,1,1);
      x.fillStyle='#1b1226';x.fillRect(bx-1,Y0+1,4,4);x.fillStyle=PAL.C;x.fillRect(bx,Y0+2,2,2);
      D2(s.headB,bx,Y0-16+nod);
      // 椅子
      x.fillStyle='#1b1226';x.fillRect(bx,Y0+5,16,11);x.fillStyle='#3a3256';x.fillRect(bx+1,Y0+6,14,9);x.fillStyle='#544a7a';x.fillRect(bx+2,Y0+7,12,1);x.fillStyle='#2a2440';x.fillRect(bx+1,Y0+13,14,2);
      x.fillStyle='#1b1226';x.fillRect(bx-1,Y0+16,18,3);x.fillRect(bx+7,Y0+19,2,6);x.fillRect(bx+2,Y0+25,12,1);x.fillRect(bx+1,Y0+26,2,1);x.fillRect(bx+13,Y0+26,2,1);
      if(A.act&&Math.floor(t)%2)emit('zb',bx+12,Y0-18,3,-5,1.4);
      break;}
    case'sing':{
      const sw=Math.sin(t*2)>0?1:0;
      // マイクスタンド
      x.fillStyle='#1b1226';x.fillRect(bx+19,62,1,22);x.fillRect(bx+16,84,7,1);x.fillRect(bx+15,61,5,1);x.fillStyle='#8a8aa0';x.fillRect(bx+14,59,3,3);x.fillStyle='#1b1226';x.fillRect(bx+14,62,3,1);
      D2(s.sing,bx,feet-11);
      const hy=feet-11-16-(Math.sin(t*1.4)>.3?1:0);
      D2(s.headS,bx+sw,hy);
      // 口
      const open=Math.sin(t*5.3)+Math.sin(t*3.1)>.2;
      x.fillStyle=open?PAL.k:PAL.m;x.fillRect(bx+sw+13,hy+15,1,open?2:1);
      drawFaceS(x,bx+sw,hy,false,fat,true);
      break;}
    case'kneel':{
      const pat=K.stir>0?(Math.floor(t*4)%2):(Math.floor(t*1.6)%2);
      const fy=86;
      D2(s.kneelL,bx,fy-8);
      // 伸ばした腕と手（トントン）
      const ay=fy-5-pat;
      x.fillStyle='#1b1226';x.fillRect(bx-7,ay-1,12,4);x.fillStyle=PAL.c;x.fillRect(bx-5,ay,10,2);x.fillStyle=PAL.C;x.fillRect(bx-5,ay+1,10,1);
      x.fillStyle='#1b1226';x.fillRect(bx-10,ay-1,4,4);x.fillStyle=PAL.s;x.fillRect(bx-9,ay,3,2);
      const hy=fy-8-16+(K.stir>0?0:1);
      D2(s.headSL,bx,hy);
      drawFaceS(x,bx,hy,true,fat,false,K.stir<=0);
      break;}
    case'lie':{
      break;}
  }
}
function drawEyes(x,X,Y,st){
  // 目のマス: 左(4,11)-(5,12) 右(10,11)-(11,12)
  if(st==='closed'){x.fillStyle=PAL.E;x.fillRect(X+4,Y+12,2,1);x.fillRect(X+10,Y+12,2,1);return;}
  if(st==='half'){x.fillStyle=PAL.k;x.fillRect(X+4,Y+11,2,1);x.fillRect(X+10,Y+11,2,1);x.fillStyle=PAL.e;x.fillRect(X+4,Y+12,2,1);x.fillRect(X+10,Y+12,2,1);return;}
  if(st==='down'){x.fillStyle=PAL.e;x.fillRect(X+4,Y+12,2,1);x.fillRect(X+10,Y+12,2,1);x.fillStyle=PAL.k;x.fillRect(X+4,Y+11,1,1);x.fillRect(X+11,Y+11,1,1);return;}
  x.fillStyle=PAL.e;x.fillRect(X+4,Y+11,2,2);x.fillRect(X+10,Y+11,2,2);
  x.fillStyle=PAL.E;x.fillRect(X+4,Y+12,2,1);x.fillRect(X+10,Y+12,2,1);
  x.fillStyle=PAL.w;x.fillRect(X+5,Y+11,1,1);x.fillRect(X+11,Y+11,1,1);
}
function drawFaceF(x,X,Y,fat,men){
  const mood=A.mood;
  let eyes='open';
  if(A.blink>0||A.yawn>0)eyes='closed';else if(mood==='tired')eyes='half';else if(mood==='low')eyes='down';
  drawEyes(x,X,Y,eyes);
  // 口
  if(A.yawn>0){x.fillStyle=PAL.k;x.fillRect(X+7,Y+14,2,2);x.fillStyle=PAL.m;x.fillRect(X+7,Y+15,2,1);}
  else if(mood==='good'){x.fillStyle=PAL.m;x.fillRect(X+7,Y+14,2,1);x.fillStyle=PAL.k;x.fillRect(X+7,Y+15,2,1);}
  else if(mood==='low'){x.fillStyle=PAL.m;x.fillRect(X+6,Y+15,1,1);x.fillRect(X+9,Y+15,1,1);x.fillRect(X+7,Y+14,2,1);}
  else {x.fillStyle=PAL.m;x.fillRect(X+7,Y+14,2,1);}
  // 頬
  if(mood!=='low'){x.fillStyle=PAL.b;x.fillRect(X+4,Y+14,1,1);x.fillRect(X+11,Y+14,1,1);}
  // クマ
  if(fat>=55){x.fillStyle=PAL.u;x.fillRect(X+4,Y+14,2,1);x.fillRect(X+10,Y+14,2,1);}
  if(fat>=85&&Math.floor(S.t*.8)%3===0){x.drawImage(S.spr.sweat,X+13,Y+5);}
}
function drawFaceS(x,X,Y,flip,fat,sing,calm){
  // 横顔の目（右向き: レンズ内 列11-12, 行11-12）
  const c1=flip?3:12, c2=flip?4:11;
  const closed=sing||A.blink>0||calm;
  if(closed){x.fillStyle=PAL.E;x.fillRect(X+Math.min(c1,c2),Y+12,2,1);}
  else{x.fillStyle=PAL.e;x.fillRect(X+c1,Y+11,1,2);x.fillStyle=PAL.E;x.fillRect(X+c1,Y+12,1,1);x.fillStyle=PAL.w;x.fillRect(X+c2,Y+11,1,1);}
  if(fat>=55){x.fillStyle=PAL.u;x.fillRect(X+Math.min(c1,c2),Y+14,2,1);}
}
function drawParticles(x){
  const s=S.spr;
  for(let i=0;i<PN;i++){const p=P[i];if(!p.on)continue;
    const a=Math.min(1,p.life/(p.max*.35),(p.max-p.life)/.25+.2);
    x.globalAlpha=Math.max(0,Math.min(1,a));
    let img=null;
    switch(p.g){case'Z':img=s.Zb;break;case'z':img=s.zb;break;case'zb':img=s.zb;break;case'note':img=s.note;break;case'note2':img=s.note2;break;case'heart':img=s.heart;break;case'dots':img=s.dots;break;case'sweat':img=s.sweat;break;
      case'dot':x.fillStyle='#d8d0e8';x.fillRect(p.x|0,p.y|0,1,1);break;}
    if(img)x.drawImage(img,p.x|0,p.y|0);
  }
  x.globalAlpha=1;
}

const LK=new Int16Array(10), LK2=new Int16Array(10);
function drawLighting(m,ph){
  const L=S.L;
  lerpKeys(AMB,m,_c1);
  let f=S.key==='rest_deep'?.72:1;
  if(S.trans){const q=S.trans.t/S.trans.dur;f*=1-Math.sin(Math.min(1,q)*Math.PI)*.9;}
  let r=_c1[0]*f,g=_c1[1]*f,b=_c1[2]*f;
  if(ph===3){r+=6;g-=4;}
  if(S.flash>0){r+=150*S.flash;g+=160*S.flash;b+=190*S.flash;}
  // 量子化したキーが変わった時だけライトマップを作り直す
  const flick=(ph===3&&S.glitch>0)?.65:(S.flick>0?.94:1);
  LK[0]=r|0;LK[1]=g|0;LK[2]=b|0;
  LK[3]=Math.round(Math.min(1,L.lamp*flick)*40);LK[4]=Math.round(L.desk*40);
  LK[5]=Math.round(Math.min(1,L.mon*(S.ghost>0?1.4:1))*40)+(S.ghost>0&&L.mon<.5?100:0);
  LK[6]=Math.round(L.night*40);
  const dawn=Math.max(0,(m-400)/80);
  LK[7]=Math.round(Math.min(1,(.35+dawn*.6)*L.win+S.flash*.6)*40);
  let same=true;for(let i=0;i<8;i++)if(LK[i]!==LK2[i]){same=false;LK2[i]=LK[i];}
  if(!same||!S.lightOk){
    S.lightOk=true;
    const lx=S.lx;
    lx.globalCompositeOperation='source-over';lx.globalAlpha=1;
    lx.fillStyle='rgb('+LK[0]+','+LK[1]+','+LK[2]+')';lx.fillRect(0,0,RW,RH);
    lx.globalCompositeOperation='lighter';
    if(LK[3]>0){lx.globalAlpha=LK[3]/40;lx.drawImage(S.lights.lamp,LAMP.x+5-72,LAMP.y+8-72);}
    if(LK[4]>0){lx.globalAlpha=LK[4]/40;lx.drawImage(S.lights.desk,240-44,40-44);}
    const mo=LK[5]%100;if(mo>0){lx.globalAlpha=mo/40;lx.drawImage(S.lights.mon,MON.x+15-48,MON.y+10-48);}
    if(LK[5]>=100){lx.globalAlpha=.6;lx.drawImage(S.lights.mon,MON.x+15-48,MON.y+10-48);}
    if(LK[6]>0){lx.globalAlpha=LK[6]/40;lx.drawImage(S.lights.night,58-26,64-26);}
    lx.globalAlpha=LK[7]/40;lx.drawImage(S.lights.win,GL.x+GL.w/2-60,GL.y+GL.h-20-30);
    lx.globalAlpha=1;
    // ガラス部分は素通し
    lx.globalCompositeOperation='source-over';lx.fillStyle='#ffffff';
    lx.fillRect(GL.x,GL.y,MULL_X-GL.x,GL.h);lx.fillRect(MULL_X+2,GL.y,GL.x+GL.w-MULL_X-2,GL.h);
    // 発光体のにじみ（加算用）
    const gx=S.gx;gx.globalCompositeOperation='source-over';gx.clearRect(0,0,RW,RH);gx.globalCompositeOperation='lighter';
    if(LK[3]>0){gx.globalAlpha=.35*LK[3]/40;gx.drawImage(S.lights.glowW,LAMP.x+5-14,LAMP.y+5-14);}
    if(mo>0||LK[5]>=100){gx.globalAlpha=.25*Math.min(1,mo/40+(LK[5]>=100?.6:0));gx.drawImage(S.lights.glowC,MON.x+15-14,MON.y+10-14);}
    if(LK[4]>0){gx.globalAlpha=.5*LK[4]/40;gx.drawImage(S.lights.glowW,239-14,39-14);}
    gx.globalAlpha=.18;gx.drawImage(S.lights.glowW,CLK.x+12-14,CLK.y+5-14);
    gx.globalAlpha=1;gx.globalCompositeOperation='source-over';
  }
  // 乗算
  const bx=S.bx;bx.globalCompositeOperation='multiply';bx.drawImage(S.light,0,0);bx.globalCompositeOperation='source-over';
}

function drawEmissive(x,m,ph){
  const L=S.L;
  // ランプのシェード
  if(L.lamp>.05){x.globalAlpha=Math.min(1,L.lamp);drawLampShade(x,1);x.globalAlpha=1;
}
  // モニター画面
  if(L.mon>.05||S.ghost>0){x.globalAlpha=Math.min(1,.35+L.mon);drawScreen(x,S.key,ph);x.globalAlpha=1;
}
  else drawScreen(x,S.key,ph);
  // デスクライトの光点
  // 時計
  let h=gsv('hour',22),mi=gsv('min',0);
  if(ph===3&&S.glitch>0){h=4;mi=44;}
  const col=ph===3&&S.glitch>0?'#ff3050':'#ff5a7a';
  const X=CLK.x+3,Y=CLK.y+3;
  digit(x,(h/10|0)%10,X,Y,col);digit(x,h%10,X+4,Y,col);
  if(Math.floor(S.t*2)%2===0){x.fillStyle=col;x.fillRect(X+8,Y+1,1,1);x.fillRect(X+8,Y+3,1,1);}
  digit(x,(mi/10|0)%10,X+10,Y,col);digit(x,mi%10,X+14,Y,col);
  x.globalCompositeOperation='lighter';x.drawImage(S.glow,0,0);x.globalCompositeOperation='source-over';
  // PCの LED
  x.fillStyle=Math.floor(S.t*1.5)%4?'#00e8c8':'#007a6a';x.fillRect(238,58,1,1);
  // 常夜灯
  if(L.night>.05){x.globalAlpha=L.night;x.fillStyle='#1b1226';x.fillRect(57,62,4,4);x.fillStyle='#ffb070';x.fillRect(58,63,2,2);x.globalAlpha=1;}
}

function postFX(ph){
  const x=S.bx;
  // 第3段階：グリッチ
  if(S.glitch>0){
    S.tx.clearRect(0,0,RW,RH);S.tx.drawImage(S.buf,0,0);
    for(let i=0;i<3;i++){const y=(Math.random()*RH)|0,h=2+((Math.random()*5)|0),dx=((Math.random()-.5)*10)|0;x.drawImage(S.tmp,0,y,RW,h,dx,y,RW,h);}
    x.globalCompositeOperation='lighter';x.globalAlpha=.25;x.fillStyle='#ff0040';x.fillRect(0,(Math.random()*RH)|0,RW,1);x.fillStyle='#00ffd0';x.fillRect(0,(Math.random()*RH)|0,RW,1);x.globalAlpha=1;x.globalCompositeOperation='source-over';
  }
  // 遷移のモザイク
  if(S.trans){
    const q=Math.min(1,S.trans.t/S.trans.dur), k=Math.sin(q*Math.PI);
    const ms=Math.max(1,Math.round(1+k*7));
    if(ms>1){const w=Math.ceil(RW/ms),h=Math.ceil(RH/ms);S.tx.clearRect(0,0,RW,RH);S.tx.imageSmoothingEnabled=false;S.tx.drawImage(S.buf,0,0,RW,RH,0,0,w,h);x.imageSmoothingEnabled=false;x.clearRect(0,0,RW,RH);x.drawImage(S.tmp,0,0,w,h,0,0,w*ms,h*ms);}
  }
}

function render(){
  const x=S.bx, m=nightMin(), ph=phase(), fat=gsv('fatigue',30), men=gsv('mental',70);
  x.globalCompositeOperation='source-over';x.globalAlpha=1;x.imageSmoothingEnabled=false;
  x.fillStyle='#07060f';x.fillRect(0,0,RW,RH);
  drawWindow(x,m,ph);
  x.drawImage(S.bg,0,0);
  drawCalendar(x);
  drawLampShade(x,0);
  drawDeskProps(x,S.key);
  drawScreen(x,S.key,ph);
  drawChild(x,S.key);
  drawActor(x,fat,men);
  drawLighting(m,ph);
  drawEmissive(x,m,ph);
  drawParticles(x);
  postFX(ph);
  // 拡大表示
  const c=S.cx,cw=S.cv.width,ch=S.cv.height,sc=S.scale;
  c.imageSmoothingEnabled=false;
  const vw=Math.min(S.vw,RW);
  let cam=Math.round(S.camX);cam=Math.max(0,Math.min(RW-Math.ceil(vw),cam));
  if(S.vign)x.drawImage(S.vign,S.vw>RW?0:cam,0,S.vw>RW?RW:S.vign.width,RH);
  if(S.vw>RW){c.fillStyle='#05040e';c.fillRect(0,0,cw,ch);const ox=Math.round((cw-RW*sc)/2);c.drawImage(S.buf,0,0,RW,RH,ox,0,Math.round(RW*sc),ch);}
  else c.drawImage(S.buf,cam,0,Math.ceil(vw),RH,0,0,Math.round(Math.ceil(vw)*sc),ch);
  if(S.scan){c.fillStyle=S.scan;c.fillRect(0,0,cw,ch);}
}

// ───────── 可視判定とループ ─────────
let running=false,timer=0;
function isVisible(){
  if(document.hidden)return false;
  const gsEl=document.getElementById('game-screen');
  if(!gsEl||gsEl.classList.contains('hidden'))return false;
  const so=document.getElementById('streaming-ol');
  if(so&&so.classList.contains('active')){S.wasStream=true;return false;}
  const r=S.area.getBoundingClientRect();
  if(r.width<2||r.height<2||r.bottom<0||r.top>window.innerHeight)return false;
  const el=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  if(!el)return false;
  if(S.area.contains(el)||el===S.area)return true;
  // 覆っている要素がほぼ透明なら「見えている」とみなす
  for(let n=el;n&&n!==document.body;n=n.parentElement){const cs=getComputedStyle(n);if(parseFloat(cs.opacity)<.3||cs.visibility==='hidden')return true;}
  return false;
}
function frame(now){
  running=false;
  if(!S.inited)return;
  S.visCheck-=1;
  if(S.visCheck<=0){S.visCheck=8;S.visible=isVisible();}
  if(!S.visible){S.last=0;clearTimeout(timer);timer=setTimeout(kick,350);return;}
  if(S.wasStream){S.wasStream=false;if(S.key==='main'){A.mode='walk';A.x=206;A.tx=pickSpot();S.afterStream=3;}}
  if(!S.last)S.last=now;
  let dt=(now-S.last)/1000;
  if(dt>=1/31||dt<0){
    S.last=now;dt=Math.min(.1,Math.max(0,dt));
    update(dt);render();
  }
  running=true;requestAnimationFrame(frame);
}
function kick(){if(running||!S.inited)return;S.visCheck=0;running=true;requestAnimationFrame(frame);}

// デバッグ／他モジュール向け
window.hsScene={state:S,actor:A,kick:kick,render:()=>{if(S.inited){update(0);render();}}};

// 起動
function boot(){if(init()){try{const sl=document.getElementById('scene-label');const k=Object.keys(FOCUS).find(n=>typeof scenes!=='undefined'&&scenes[n]&&scenes[n].lbl===(sl&&sl.textContent));if(k)applySetup(k,true);}catch(e){}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
