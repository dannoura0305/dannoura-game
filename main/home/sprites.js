// main/home/sprites.js — 家・庭のドット絵（コードで描く独自素材）
// 公開：window.HOME_ART のみ。
// 描画は「1タイル＝16ドット」の原寸キャンバスに描いてキャッシュし、T/16 倍で拡大して貼る（T=32 なら1ドット=2px）。
// 光源は左上、影は右下へ。外周線は #1b1226。
(function(){
'use strict';

const U=16;            // 1タイルのドット数
const PAD=4, TOP=30;   // アイテム画像の余白（左右下=PAD、上=TOP：背の高い家具・壁掛け用）
const OL='#1b1226';
const SH='rgba(27,18,38,0.30)';     // 落ち影
const SH2='rgba(27,18,38,0.18)';    // 薄い影

// ───────── パレット（docs/asset-style-guide.md と同期） ─────────
const C={
  ol:OL,
  // 家具の木（明るい→暗い）
  w1:'#f2cf98', w2:'#d9a066', w3:'#b97c45', w4:'#8a5530', w5:'#5e3820',
  // 床の木
  f1:'#b88a62', f2:'#a87a56', f3:'#9c6f4d', f4:'#8e6344', f5:'#6e4a36',
  // 布・紙
  cr1:'#fffaf0', cr2:'#f4efe6', cr3:'#ddd2c0', cr4:'#b8a890',
  // 掛け布団（夜の青紫）
  bl1:'#a8c0f0', bl2:'#7f9ad8', bl3:'#5f78b8', bl4:'#465a96',
  // ピンク・紫
  pk1:'#ffd0e0', pk2:'#f59aae', pk3:'#d9708e', pk4:'#a54a70',
  vi1:'#c6b2ee', vi2:'#8c5fcc', vi3:'#5a3590', vi4:'#3a2066',
  // 庭の緑
  g1:'#a8d88a', g2:'#7fbf6e', g3:'#5f9e5c', g4:'#43784a', g5:'#2e5640',
  // 石
  st1:'#d6d2de', st2:'#aeaabe', st3:'#87839c', st4:'#625e78',
  // 灯り（アンバー）
  am1:'#fff4cc', am2:'#ffd98a', am3:'#ffb85a', am4:'#e08a34',
  // 夢の海（ティール）
  te1:'#e4fff8', te2:'#9ff0e0', te3:'#4fc8bc', te4:'#2a8f96', te5:'#1f5f70',
  // 夜空
  ny1:'#4a4a8e', ny2:'#33306a', ny3:'#262352', ny4:'#1c1838',
  // 金具
  me1:'#e4e8f0', me2:'#a8b0c0', me3:'#6e7488',
  yel:'#ffe066', red:'#e05a6a'
};
const WOOD={hi:C.w1,base:C.w2,mid:C.w3,lo:C.w4,dk:C.w5};
const WHITEWOOD={hi:'#ffffff',base:'#ece6f0',mid:'#d2c8dc',lo:'#a99cb8',dk:'#776a8a'};
const POTS={
  default:{hi:'#eaa47c',base:'#c8714a',lo:'#94492f'},
  red:{hi:'#f39a9a',base:'#d24a58',lo:'#93303f'},
  blue:{hi:'#9cbaf4',base:'#5a7ad0',lo:'#3a4f96'},
  yellow:{hi:'#fff2a8',base:'#e8c050',lo:'#ac862a'}
};
const FLOWER={
  red:['#ff8a8a','#e04a5a','#a02a3a'], pink:['#ffc4dc','#f58ab0','#c05a84'],
  blue:['#bcd4ff','#6f93e8','#3f5cb0'], yellow:['#fff4b0','#ffd84a','#c89a20'],
  white:['#ffffff','#eae6f4','#b4accc'], purple:['#dcc4ff','#a070e0','#6a40a8'],
  orange:['#ffd0a0','#ff9a4a','#c0602a']
};

// ───────── 基本 ─────────
const cache=new Map();
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c;}
function R(x,c,X,Y,W,H){x.fillStyle=c;x.fillRect(X,Y,W==null?1:W,H==null?1:H);}
function O(x,X,Y,W,H,fill){R(x,OL,X,Y,W,H);if(W>2&&H>2)R(x,fill,X+1,Y+1,W-2,H-2);}
// 外周線つきの箱（左上ハイライト・右下陰）
function bev(x,X,Y,W,H,p){O(x,X,Y,W,H,p.base);if(W>3&&H>3){R(x,p.hi,X+1,Y+1,W-2,1);R(x,p.hi,X+1,Y+1,1,H-2);R(x,p.mid||p.lo,X+1,Y+H-2,W-2,1);R(x,p.mid||p.lo,X+W-2,Y+2,1,H-3);}}
function ell(x,cx,cy,rx,ry,col){x.fillStyle=col;for(let yy=Math.ceil(-ry);yy<=ry;yy++){const k=1-(yy*yy)/(ry*ry);if(k<0)continue;const hw=Math.round(rx*Math.sqrt(k));x.fillRect(Math.round(cx-hw),Math.round(cy+yy),hw*2+1,1);}}
function oell(x,cx,cy,rx,ry,col){ell(x,cx,cy,rx+1,ry+1,OL);ell(x,cx,cy,rx,ry,col);}
function hash(a,b,c){let h=(a|0)*374761393+(b|0)*668265263+(c|0)*2147483647;h=(h^(h>>>13))*1274126177;h=h^(h>>>16);return (h>>>0)/4294967296;}
let seed=1;function srand(s){seed=(s>>>0)||1;}function rnd(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function map(x,rows,pal,X,Y){for(let r=0;r<rows.length;r++){const row=rows[r];for(let i=0;i<row.length;i++){const ch=row[i];if(ch==='.'||ch===' ')continue;const col=pal[ch];if(!col)continue;x.fillStyle=col;x.fillRect(X+i,Y+r,1,1);}}}
function flipC(src){const c=mk(src.width,src.height),x=c.getContext('2d');x.translate(src.width,0);x.scale(-1,1);x.drawImage(src,0,0);return c;}
// 不透明ドットの周囲に外周線を足す（アイコン用）
function outlined(src,col){
  const w=src.width,h=src.height,c=mk(w,h),x=c.getContext('2d');
  const d=src.getContext('2d').getImageData(0,0,w,h).data;x.fillStyle=col||OL;
  const op=(i,j)=>i>=0&&j>=0&&i<w&&j<h&&d[(j*w+i)*4+3]>40;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){if(!op(i,j)&&(op(i-1,j)||op(i+1,j)||op(i,j-1)||op(i,j+1)))x.fillRect(i,j,1,1);}
  x.drawImage(src,0,0);return c;
}
function scaleOf(T){return (T||32)/U;}
function blit(ctx,img,dx,dy,s){
  const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,Math.round(dx),Math.round(dy),Math.round(img.width*s),Math.round(img.height*s));
  ctx.imageSmoothingEnabled=sm;
}

// ───────── 床・地面 ─────────
function floorTile(gx,gy){
  const c=mk(U,U),x=c.getContext('2d');
  const tones=[C.f2,C.f3,C.f2,'#b08060',C.f3,'#a27450'];
  for(let r=0;r<4;r++){
    const row=gy*4+r, off=Math.floor(hash(row,7,1)*48), y0=r*4;
    for(let i=0;i<U;i++){
      const wx=gx*U+i+off, plank=Math.floor(wx/48), edge=(wx%48)===0;
      const base=tones[Math.floor(hash(plank,row,3)*tones.length)];
      R(x,base,i,y0,1,4);
      if(edge){R(x,C.f5,i,y0,1,3);continue;}
      if((wx%48)===1)R(x,C.f1,i,y0,1,3);
      // 木目
      const g=hash(wx,row,9);
      if(g<0.035)R(x,C.f4,i,y0+1,2,1);else if(g>0.975)R(x,C.f1,i,y0+2,1,1);
    }
    R(x,C.f4,0,y0+3,U,1);              // 板の継ぎ目
    R(x,'rgba(255,230,190,0.10)',0,y0,U,1);
  }
  return c;
}
// 季節の草の色（base, patch, dark, light, tuft-dark, tuft-light）
const GRASS={
  summer:{b:C.g2,p:'#76b468',d:C.g3,l:C.g1,td:C.g4,tl:C.g1,fl:[C.cr1,C.yel,C.pk2,'#c8b4ff'],fr:0.22},
  autumn:{b:'#a3b45e',p:'#b6b45c',d:'#7f9a4e',l:'#c8c878',td:'#6e7e40',tl:'#d4cc80',fl:[C.am3,'#d0604a',C.yel],fr:0.30,leaf:true},
  winter:{b:'#8fa088',p:'#9cad98',d:'#76886f',l:'#c4d0c8',td:'#647460',tl:'#d8e2e4',fl:[],fr:0},
  spring:{b:'#86c870',p:'#96d27e',d:'#6aae5c',l:'#bce6a0',td:'#5a9a50',tl:'#c8f0aa',fl:[C.pk1,C.pk2,C.cr1,'#fff4b0','#c8b4ff'],fr:0.34},
};
function grassTile(gx,gy,season,snow){
  const G=GRASS[season]||GRASS.summer;
  const c=mk(U,U),x=c.getContext('2d');
  if(snow){
    // 雪：白い地面に、ところどころ草の先がのぞく
    R(x,'#eef2f8',0,0,U,U);
    for(let j=0;j<U;j++)for(let i=0;i<U;i++){
      const wx=gx*U+i,wy=gy*U+j,v=hash(wx,wy,2);
      const m=Math.sin(wx*0.19+Math.sin(wy*0.11)*2)+Math.sin(wy*0.15+wx*0.07);
      if(m<-1.0&&v<0.7)R(x,'#dfe6f2',i,j);
      if(v<0.03)R(x,'#c8d2e6',i,j);else if(v>0.985)R(x,'#ffffff',i,j);
    }
    srand(Math.floor(hash(gx,gy,4)*1e9));
    const n=Math.floor(rnd()*3);
    for(let k=0;k<n;k++){const i=1+Math.floor(rnd()*13),j=3+Math.floor(rnd()*11);R(x,'#7e9a7e',i,j);R(x,'#7e9a7e',i+2,j);R(x,'#c8d2e6',i,j+1,3,1);}
    return c;
  }
  R(x,G.b,0,0,U,U);
  for(let j=0;j<U;j++)for(let i=0;i<U;i++){
    const wx=gx*U+i,wy=gy*U+j;
    // ゆるやかなまだら（タイル境界をまたいで連続）
    const m=Math.sin(wx*0.21+Math.sin(wy*0.13)*2)+Math.sin(wy*0.17+wx*0.05);
    const v=hash(wx,wy,2);
    if(m<-1.1&&v<0.6)R(x,G.p,i,j);
    if(v<0.05)R(x,G.d,i,j);else if(v<0.09)R(x,G.l,i,j);
  }
  // 草の房（V字）
  srand(Math.floor(hash(gx,gy,4)*1e9));
  const n=2+Math.floor(rnd()*3);
  for(let k=0;k<n;k++){const i=1+Math.floor(rnd()*13),j=2+Math.floor(rnd()*12);R(x,G.td,i,j+1);R(x,G.td,i+2,j+1);R(x,G.tl,i,j);R(x,G.tl,i+2,j);R(x,G.td,i+1,j+2);}
  // 小さな花
  const fr=hash(gx,gy,8);
  if(fr<G.fr&&G.fl.length){
    const cols=G.fl;const fc=cols[Math.floor(hash(gx,gy,12)*cols.length)];
    const i=2+Math.floor(hash(gx,gy,13)*11),j=2+Math.floor(hash(gx,gy,14)*11);
    R(x,G.td,i,j+2);R(x,fc,i-1,j);R(x,fc,i+1,j);R(x,fc,i,j-1);R(x,fc,i,j+1);R(x,fr<0.1?C.am3:C.yel,i,j);
  }
  // 秋：落ち葉
  if(G.leaf){
    const LC=[C.am3,'#d0604a',C.yel,'#c8602e'];
    for(let k=0;k<2;k++){if(hash(gx,gy,30+k)<0.55){const i=1+Math.floor(hash(gx,gy,40+k)*13),j=1+Math.floor(hash(gx,gy,50+k)*13),lc=LC[Math.floor(hash(gx,gy,60+k)*LC.length)];R(x,lc,i,j,2,1);R(x,lc,i+1,j+1,1,1);R(x,'#8a5530',i,j+1,1,1);}}
  }
  // 冬：霜
  if(season==='winter'){for(let k=0;k<4;k++){const i=Math.floor(hash(gx,gy,70+k)*16),j=Math.floor(hash(gx,gy,80+k)*16);R(x,'#e8eef4',i,j);}}
  return c;
}
function pathTile(gx,gy){ // 予備：踏み固めた土
  const c=mk(U,U),x=c.getContext('2d');R(x,'#b89a72',0,0,U,U);
  for(let j=0;j<U;j++)for(let i=0;i<U;i++){const v=hash(gx*U+i,gy*U+j,21);if(v<0.08)R(x,'#9a7c58',i,j);else if(v>0.94)R(x,'#d4b88e',i,j);}
  return c;
}
// 畳：2×2 マスごとに「横2枚」と「縦2枚」を交互に敷く（1枚＝2×1マス）。長い辺に緑の縁（へり）
function tatamiTile(gx,gy){
  const c=mk(U,U),x=c.getContext('2d');
  const bx=gx>>1,by=gy>>1,lx=gx&1,ly=gy&1;
  const horiz=((bx+by)%2)===0;
  const B='#cdc683',Bl='#d9d396',Bd='#b4ae6c',EDGE='#56684a',EDGE2='#74865e';
  R(x,B,0,0,U,U);
  for(let j=0;j<U;j++)for(let i=0;i<U;i++){
    const k=horiz?i:j;
    if(k%2===0)R(x,Bl,i,j);
    if(hash(gx*U+i,gy*U+j,5)<0.03)R(x,Bd,i,j);
  }
  if(horiz){
    R(x,EDGE2,0,0,U,1);R(x,EDGE,0,1,U,1);
    if(lx===0)R(x,Bd,0,2,1,U-2);
  }else{
    R(x,EDGE2,0,0,1,U);R(x,EDGE,1,0,1,U);
    if(ly===0)R(x,Bd,2,0,U-2,1);
  }
  return c;
}
// 濃い木の床（ウォルナット）
function darkFloorTile(gx,gy){
  const c=mk(U,U),x=c.getContext('2d');
  const tones=['#6e4a36','#644232','#74503a','#5e3e2e'];
  for(let r=0;r<4;r++){
    const row=gy*4+r,off=Math.floor(hash(row,11,1)*40),y0=r*4;
    for(let i=0;i<U;i++){
      const wx=gx*U+i+off,plank=Math.floor(wx/40),edge=(wx%40)===0;
      R(x,tones[Math.floor(hash(plank,row,3)*tones.length)],i,y0,1,4);
      if(edge){R(x,'#3a2418',i,y0,1,3);continue;}
      if((wx%40)===1)R(x,'#8a6448',i,y0,1,3);
      const g=hash(wx,row,9);if(g<0.04)R(x,'#4e3226',i,y0+1,2,1);else if(g>0.98)R(x,'#8a6448',i,y0+2,1,1);
    }
    R(x,'#4a2e22',0,y0+3,U,1);R(x,'rgba(255,220,180,0.08)',0,y0,U,1);
  }
  return c;
}
const TILES={'floor.wood':floorTile,'floor.tatami':tatamiTile,'floor.dark':darkFloorTile,'ground.grass':grassTile,'ground.path':pathTile};
// o（任意）={season:'summer'|'autumn'|'winter'|'spring', snow:true} … 庭の草の季節
function drawTile(ctx,tileId,px,py,T,gx,gy,o){
  try{
    gx=gx|0;gy=gy|0;
    if(drawRaster(ctx,tileId,['default'],px,py,T,1,1,true))return;
    const f=TILES[tileId];
    const ss=tileId==='ground.grass'&&o?((o.season&&GRASS[o.season]?o.season:'summer')+(o.snow?'s':'')):'';
    const key='t|'+tileId+'|'+gx+'|'+gy+'|'+ss;
    let img=cache.get(key);
    if(!img){img=f?(ss?f(gx,gy,o.season,!!o.snow):f(gx,gy)):qbox(1,1);cache.set(key,img);}
    blit(ctx,img,px,py,scaleOf(T));
  }catch(e){}
}

// ───────── 壁（部屋の奥の帯） ─────────
// 壁紙（昼／夜）：[地, 柄1, 柄2, 点]、柄の種類
const WALLPAPER={
  lavender:{day:['#a89cc4','#a194bc','#b1a6cc','#bcb2d4'],night:['#7c6f9a','#75688f','#8578a2','#8f82ac'],ceil:['#4a3f66','#5e5280','#6c608c'],pat:'stripe'},
  mint:    {day:['#a8d6c6','#9cccbc','#b6e0d2','#cdebe0'],night:['#5f8a86','#58807c','#679490','#78a29e'],ceil:['#2e4a4a','#3e5e5c','#4c6e6a'],pat:'dot'},
  cream:   {day:['#eadcc0','#e0d0b0','#f0e4cc','#f8eedc'],night:['#9a8a78','#928270','#a49482','#b0a08c'],ceil:['#5a4a3e','#6e5e50','#7e6e5e'],pat:'check'},
  night:   {day:['#4a4a8e','#44448a','#525296','#ffe8a0'],night:['#2c2a5e','#28265a','#343268','#ffe08a'],ceil:['#16142e','#1e1c40','#24224c'],pat:'star'},
};
// 窓の外の空：天候×昼夜（上→下の4段）
const SKY={
  clear: {d:['#8ec8f0','#a4d4f4','#bce0f6','#d4ecf8'],n:[C.ny4,C.ny3,C.ny2,C.ny1]},
  cloudy:{d:['#a4b0c4','#b0bacc','#bcc4d4','#c8d0de'],n:['#1e1e34','#26263e','#2e2e48','#363652']},
  rain:  {d:['#7c8ca4','#8494ac','#8c9cb4','#96a6bc'],n:['#161a2c','#1c2236','#222a40','#28304a']},
  snow:  {d:['#b8c2d6','#c4cce0','#d0d8e8','#dce2ee'],n:['#262840','#2e304a','#363854','#3e405e']},
};
// 窓の位置（原寸ドット）。部屋の壁帯の中央
function windowRect(aw,ah){
  if(!(ah>=22&&aw>=40))return null;
  const bb=ah-4;
  const ww=Math.min(54,Math.max(30,Math.round(aw*0.28)))&~1, wh=Math.min(ah-12,30);
  const wx=Math.round((aw-ww)/2), wy=Math.max(4,Math.round((bb-wh)/2)-1);
  return{x:wx,y:wy,w:ww,h:wh,bb};
}
function wallArt(aw,ah,day,wpId,weather,season){
  const c=mk(aw,ah),x=c.getContext('2d');
  const WPd=WALLPAPER[wpId]||WALLPAPER.lavender;
  const WP=day?WPd.day:WPd.night;
  weather=SKY[weather]?weather:'clear';
  R(x,WP[0],0,0,aw,ah);
  if(WPd.pat==='stripe'){
    for(let i=0;i<aw;i+=8){R(x,WP[1],i,0,1,ah);R(x,WP[2],i+4,0,1,ah);}
    for(let i=0;i<aw;i+=8)for(let j=6;j<ah-6;j+=8)R(x,WP[3],i+4,j,1,1);
  }else if(WPd.pat==='dot'){
    // ミント：小さな菱形の水玉
    for(let j=4;j<ah-6;j+=6)for(let i=((j/6)%2)*5;i<aw;i+=10){R(x,WP[3],i+2,j,1,1);R(x,WP[2],i+1,j+1,3,1);R(x,WP[3],i+2,j+2,1,1);}
    for(let j=7;j<ah-6;j+=6)for(let i=0;i<aw;i+=10)R(x,WP[1],i+((j%12)?7:2),j,1,1);
  }else if(WPd.pat==='check'){
    // クリーム：やさしい格子
    for(let j=0;j<ah;j+=8)R(x,WP[1],0,j,aw,1);
    for(let i=0;i<aw;i+=8)R(x,WP[1],i,0,1,ah);
    for(let j=4;j<ah-6;j+=8)for(let i=4;i<aw;i+=8)R(x,WP[3],i,j,1,1);
  }else{
    // 夜空：濃紺に小さな星
    for(let i=0;i<aw;i+=12)R(x,WP[1],i,0,1,ah);
    for(let k=0;k<Math.floor(aw*ah/45);k++){const sx=Math.floor(hash(k,3,91)*aw),sy=6+Math.floor(hash(k,5,92)*(ah-14));R(x,hash(k,7,93)<0.25?WP[3]:WP[2],sx,sy);}
    for(let k=0;k<Math.floor(aw/26);k++){const sx=6+Math.floor(hash(k,9,94)*(aw-12)),sy=7+Math.floor(hash(k,11,95)*(ah-18));R(x,WP[3],sx,sy);R(x,WP[3],sx-1,sy+1,3,1);R(x,WP[3],sx,sy+2);}
  }
  // 天井際の陰
  R(x,WPd.ceil[0],0,0,aw,2);R(x,WPd.ceil[1],0,2,aw,1);R(x,WPd.ceil[2],0,3,aw,1);
  // 幅木
  const bb=ah-4;
  R(x,OL,0,bb-1,aw,1);R(x,'#9a7058',0,bb,aw,1);R(x,'#7a5440',0,bb+1,aw,2);R(x,'#5a3c2e',0,bb+3,aw,1);
  // 窓（中央）＋ カーテン
  const W=windowRect(aw,ah);
  if(W){
    const ww=W.w,wh=W.h,wx=W.x,wy=W.y;
    // 窓からのアンバー（部屋の灯りの照り返し）
    for(let k=3;k>=1;k--){x.fillStyle=(day?'rgba(255,250,220,':'rgba(255,196,120,')+(0.05*k)+')';x.fillRect(wx-4*k,wy-2*k,ww+8*k,wh+4*k+2);}
    O(x,wx-2,wy-2,ww+4,wh+4,'#e6d6bc');R(x,'#fff2da',wx-1,wy-1,ww+2,1);R(x,'#c4ae8c',wx-1,wy+wh,ww+2,1);
    R(x,OL,wx,wy,ww,wh);
    // 空（段階）
    const bands=SKY[weather][day?'d':'n'];
    for(let j=0;j<wh-2;j++){R(x,bands[Math.min(3,Math.floor(j/(wh-2)*4))],wx+1,wy+1+j,ww-2,1);}
    const hy=wy+wh-1;
    const snowy=weather==='snow';
    if(day){
      // 昼：雲と、明るい家並み
      if(weather!=='clear'){srand(9);for(let k=0;k<4;k++){const cx0=wx+2+Math.floor(rnd()*(ww-12)),cy0=wy+2+Math.floor(rnd()*(wh*0.3));const cc=weather==='cloudy'?'#e4e8f0':'#a8b2c4';ell(x,cx0+4,cy0+1,4,2,cc);ell(x,cx0+8,cy0,3,2,cc);R(x,weather==='cloudy'?'#c8d0dc':'#8a96aa',cx0+1,cy0+3,10,1);}}
      else{srand(7);for(let k=0;k<3;k++){const cx0=wx+3+Math.floor(rnd()*(ww-12)),cy0=wy+3+Math.floor(rnd()*(wh*0.35));ell(x,cx0+3,cy0+1,3,1,'#ffffff');ell(x,cx0+6,cy0,2,1,'#ffffff');R(x,'#e4f0f8',cx0+1,cy0+2,7,1);}}
      const dim=weather==='clear'?0:1;
      for(let i=1;i<ww-1;i++){const hh=3+Math.floor(hash(i>>2,5,6)*5)+((i>>2)%3===0?2:0);R(x,(i>>2)%2?(dim?'#8a90aa':'#9aa0c0'):(dim?'#9aa0b8':'#aab0cc'),wx+i,hy-hh,1,hh);R(x,snowy?'#ffffff':'#c8cce0',wx+i,hy-hh,1,snowy?2:1);}
    }else{
      if(weather==='clear'){
        srand(42);for(let k=0;k<Math.floor(ww*wh/50);k++){const sx=wx+2+Math.floor(rnd()*(ww-4)),sy=wy+2+Math.floor(rnd()*(wh*0.6));R(x,rnd()<0.3?'#ffffff':'#fff4c8',sx,sy);}
        // 三日月
        const mx=wx+ww-9,my=wy+4;ell(x,mx,my,3,3,'#fff1b8');ell(x,mx+2,my-1,3,3,C.ny4);
      }else{
        srand(13);for(let k=0;k<3;k++){const cx0=wx+2+Math.floor(rnd()*(ww-12)),cy0=wy+2+Math.floor(rnd()*(wh*0.3));ell(x,cx0+4,cy0+1,4,2,'#3a3a58');ell(x,cx0+8,cy0,3,2,'#3a3a58');}
      }
      // 遠くの家並み（窓にアンバーの灯り）
      for(let i=1;i<ww-1;i++){const hh=3+Math.floor(hash(i>>2,5,6)*5)+((i>>2)%3===0?2:0);R(x,'#141028',wx+i,hy-hh,1,hh);if(snowy)R(x,'#c8cce0',wx+i,hy-hh,1,1);}
      for(let i=3;i<ww-3;i+=4){if(hash(i,3,7)<0.55)R(x,C.am2,wx+i,hy-3,1,1);}
    }
    // 静かな雨すじ・雪（動かない分。動く分は HOME.seasons が窓の中に重ねる）
    if(weather==='rain'){for(let k=0;k<Math.floor(ww/3);k++){const sx=wx+2+Math.floor(hash(k,1,71)*(ww-4)),sy=wy+2+Math.floor(hash(k,2,72)*(wh-8));R(x,day?'#d4def0':'#5a6888',sx,sy,1,3);}}
    if(snowy){for(let k=0;k<Math.floor(ww/2);k++){const sx=wx+2+Math.floor(hash(k,1,73)*(ww-4)),sy=wy+2+Math.floor(hash(k,2,74)*(wh-5));R(x,'#ffffff',sx,sy);}}
    // 季節の枝（窓の左上から）
    if(season==='autumn'||season==='spring'||season==='winter'){
      const LC=season==='autumn'?[C.am3,'#d0604a',C.yel]:season==='spring'?[C.pk1,C.pk2,'#ffffff']:[];
      const br=day?'#6a4a3a':'#3a2a30';
      for(let i=0;i<12;i++)R(x,br,wx+1+i,wy+3+Math.floor(i/3),1,1);
      R(x,br,wx+5,wy+1,1,3);R(x,br,wx+9,wy+5,1,2);
      if(LC.length)for(let k=0;k<10;k++){const lx=wx+1+Math.floor(hash(k,4,75)*14),ly=wy+1+Math.floor(hash(k,5,76)*7);R(x,LC[k%LC.length],lx,ly,(k%3)?1:2,1);}
      else if(snowy)for(let i=0;i<12;i+=2)R(x,'#ffffff',wx+1+i,wy+2+Math.floor(i/3),2,1);
    }
    // 桟
    R(x,'#e6d6bc',wx+ww/2-1,wy+1,2,wh-1);R(x,'#c4ae8c',wx+ww/2,wy+1,1,wh-1);
    R(x,'#e6d6bc',wx+1,wy+Math.round(wh*0.45),ww-2,1);
    // 窓台
    O(x,wx-4,wy+wh+1,ww+8,4,'#eedcc0');R(x,'#fff4e0',wx-3,wy+wh+2,ww+6,1);R(x,SH,wx-3,wy+wh+5,ww+8,2);
    // カーテン
    for(const side of[-1,1]){
      const cx0=side<0?wx-10:wx+ww+2;
      O(x,cx0,wy-4,8,wh+8,'#6a7cc0');
      for(let i=0;i<3;i++)R(x,'#56679f',cx0+2+i*2,wy-3,1,wh+6);
      R(x,'#8a9ade',cx0+1,wy-3,1,wh+6);
      R(x,C.am3,cx0+1,wy+Math.round(wh*0.55),6,2);
      R(x,SH2,side<0?cx0+8:cx0+8,wy-3,1,wh+8);
    }
    R(x,'#3a2e3a',wx-12,wy-6,ww+24,2);R(x,OL,wx-12,wy-4,ww+24,1);
  }
  // 壁の灯り（左右の小さな壁灯）
  if(aw>=120&&ah>=22&&!day){
    for(const fx of[Math.round(aw*0.14),Math.round(aw*0.86)]){
      const fy=Math.round(bb*0.38);
      for(let k=4;k>=1;k--){x.fillStyle='rgba(255,190,110,'+(0.045*k)+')';x.fillRect(fx-3*k-1,fy-2*k,6*k+3,4*k+3);}
      O(x,fx-2,fy-2,5,5,C.am2);R(x,C.am1,fx-1,fy-1,2,2);R(x,'#5a3c2e',fx-1,fy+3,3,2);
    }
  }
  return c;
}
// opts.night：false なら昼の窓（青空・雲・明るい壁紙・壁灯は消灯）。省略時は夜（フェーズ1と同じ）
// opts.wallpaper：'lavender'|'mint'|'cream'|'night'、opts.weather：窓の外の天候、opts.season：窓の外の枝
function drawWall(ctx,px,py,w,h,T,opts){
  try{
    const s=scaleOf(T),aw=Math.max(1,Math.round(w/s)),ah=Math.max(1,Math.round(h/s));
    const day=!!(opts&&opts.night===false);
    const wp=opts&&WALLPAPER[opts.wallpaper]?opts.wallpaper:'lavender';
    const we=opts&&SKY[opts.weather]?opts.weather:'clear';
    const se=opts&&typeof opts.season==='string'?opts.season:'summer';
    const key='w|'+aw+'|'+ah+'|'+(day?'d':'n')+'|'+wp+'|'+we+'|'+se;let img=cache.get(key);
    if(!img){img=wallArt(aw,ah,day,wp,we,se);cache.set(key,img);}
    const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,Math.round(px),Math.round(py),Math.round(w),Math.round(h));
    ctx.imageSmoothingEnabled=sm;
  }catch(e){}
}
// 窓のガラスの範囲（画面 px）。天候のパーティクルを窓の中だけに描くため
function wallWindow(w,h,T){
  const s=scaleOf(T),aw=Math.max(1,Math.round(w/s)),ah=Math.max(1,Math.round(h/s));
  const r=windowRect(aw,ah);if(!r)return null;
  return{x:(r.x+1)*s,y:(r.y+1)*s,w:(r.w-2)*s,h:(r.h-2)*s};
}

// ───────── アイテム ─────────
// f(x,o)：x は足元範囲の左上が (0,0) になるよう平行移動済み。o={W,H,rot,variant,plant,lit,frame}
let SHX=null; // 影の描き先（左右反転の家具で影だけ別に描く）
function shadowRect(x,X,Y,W,H){R(SHX||x,SH,X,Y,W,H);}
function shE(x,cx,cy,rx,ry){ell(SHX||x,cx,cy,rx,ry,SH);}

function deskSmall(x,o){
  const P=WOOD;
  if(o.rot===0){
    shadowRect(x,4,9,30,7);
    O(x,2,6,4,10,P.lo);O(x,26,6,4,10,P.lo);R(x,P.mid,3,7,1,8);R(x,P.mid,27,7,1,8);
    O(x,0,2,32,7,P.mid);R(x,P.lo,1,7,30,1);
    O(x,11,3,10,4,P.base);R(x,P.hi,12,4,8,1);R(x,P.dk,15,5,2,1);
    bev(x,0,-7,32,10,P);
    for(let i=0;i<3;i++)R(x,P.mid,4+i*9,-4+i*2,5,1);
    // ノートと鉛筆
    O(x,4,-6,10,6,C.cr2);R(x,C.cr3,9,-5,1,4);R(x,C.cr3,5,-4,3,1);R(x,C.cr3,10,-3,3,1);R(x,C.cr3,5,-2,3,1);
    R(x,OL,15,-2,7,2);R(x,C.yel,16,-2,5,1);R(x,C.pk2,15,-2,1,1);
    // 小さなマグ
    O(x,24,-7,5,6,C.vi1);R(x,'#ffffff',25,-6,1,3);R(x,OL,29,-5,1,3);
  }else{
    shadowRect(x,4,10,14,22);
    O(x,1,22,4,10,P.lo);O(x,11,22,4,10,P.lo);
    O(x,0,18,16,6,P.mid);R(x,P.lo,1,22,14,1);
    bev(x,0,-6,16,25,P);
    for(let i=0;i<3;i++)R(x,P.mid,4+(i%2)*4,-2+i*7,1,5);
    // 引き出しの取っ手（左＝正面）
    R(x,OL,0,4,2,6);R(x,P.dk,1,5,1,4);
    O(x,3,-3,8,10,C.cr2);R(x,C.cr3,4,1,6,1);R(x,C.cr3,5,-1,3,1);R(x,C.cr3,5,3,4,1);
    O(x,6,10,5,6,C.vi1);R(x,'#ffffff',7,11,1,3);
  }
}

function woodChair(x,o){
  const P=o.variant==='white'?WHITEWOOD:WOOD;
  const r=o.rot;
  if(r===0){
    shE(x,9,13,6,2);
    O(x,2,-10,3,18,P.lo);O(x,11,-10,3,18,P.lo);
    bev(x,1,-11,14,4,P);O(x,3,-6,10,3,P.mid);R(x,P.hi,4,-5,8,1);
    O(x,2,7,3,8,P.lo);O(x,11,7,3,8,P.lo);
    bev(x,1,1,14,7,P);R(x,P.mid,1,7,14,1);R(x,OL,1,8,14,1);
  }else if(r===180){
    shE(x,9,13,6,2);
    O(x,2,6,3,9,P.lo);O(x,11,6,3,9,P.lo);
    bev(x,1,-1,14,7,P);
    O(x,2,-8,3,20,P.base);O(x,11,-8,3,20,P.base);R(x,P.hi,3,-7,1,18);R(x,P.hi,12,-7,1,18);
    bev(x,1,-9,14,4,P);O(x,3,1,10,3,P.mid);R(x,P.hi,4,2,8,1);
  }else{
    // 270＝右向き（背もたれが左）。90 は左右反転。
    shE(x,9,13,6,2);
    O(x,3,6,3,9,P.lo);O(x,11,6,3,9,P.lo);
    bev(x,2,1,13,7,P);R(x,P.mid,3,6,11,1);
    O(x,1,-11,4,19,P.base);R(x,P.hi,2,-10,1,17);R(x,P.mid,3,-10,1,17);
    O(x,0,-12,6,3,P.hi);
  }
}

function books(x,X,Y,W,H,sd){
  srand(sd);const cols=['#c8505a','#5a7ad0','#e8c050','#5f9e5c','#8c5fcc','#f2a2ac','#e6d8c4','#3fa6a0'];
  let i=X;while(i<X+W-1){const bw=1+Math.floor(rnd()*2),bh=H-Math.floor(rnd()*3);if(rnd()<0.12){i+=1;continue;}
    R(x,cols[Math.floor(rnd()*cols.length)],i,Y+H-bh,bw,bh);R(x,'rgba(255,255,255,0.35)',i,Y+H-bh,1,1);R(x,'rgba(27,18,38,0.35)',i+bw,Y+H-bh,1,bh);i+=bw+1;}
}
function bookshelf(x,o){
  const P=WOOD,r=o.rot;
  if(r===0){
    shadowRect(x,4,8,30,8);
    O(x,0,-24,32,40,P.dk);
    bev(x,0,-26,32,4,P);
    O(x,0,-23,3,39,P.base);R(x,P.hi,1,-22,1,37);O(x,29,-23,3,39,P.mid);
    for(const sy of[-13,-2]){O(x,2,sy,28,3,P.base);R(x,P.hi,3,sy+1,26,1);}
    R(x,'#4a2a18',3,-22,26,9);R(x,'#4a2a18',3,-10,26,8);R(x,'#4a2a18',3,1,26,10);
    books(x,3,-21,26,8,11);books(x,3,-9,26,7,23);books(x,3,2,20,9,37);
    O(x,23,6,5,5,C.te3);R(x,C.te2,24,7,2,1); // 小箱
    O(x,1,11,30,5,P.mid);R(x,P.lo,2,14,28,1);
  }else if(r===180){
    shadowRect(x,4,8,30,8);
    bev(x,0,-24,32,40,{hi:P.base,base:P.mid,mid:P.lo});
    for(let i=8;i<32;i+=8)R(x,P.lo,i,-22,1,36);
    bev(x,0,-26,32,4,P);
    O(x,1,11,30,5,P.lo);
  }else{
    // 270＝右向き（棚の開口が右）。90 は反転。
    shadowRect(x,7,6,11,26);
    // 天板（奥行きは細い）
    bev(x,3,-28,10,22,P);
    // 開いた側（右）から覗く本の背
    R(x,OL,12,-26,3,58);R(x,'#4a2a18',13,-25,1,56);
    srand(5);for(let j=-24;j<30;j+=2){R(x,['#c8505a','#5a7ad0','#e8c050','#5f9e5c','#8c5fcc','#f2a2ac'][Math.floor(rnd()*6)],13,j,1,1+Math.floor(rnd()*2));}
    for(const sy of[-8,4,16])R(x,P.base,13,sy,1,1);
    // 手前の側板（背の高さ＝正面の高さ）
    bev(x,3,-7,10,39,{hi:P.base,base:P.mid,mid:P.lo});
    R(x,P.lo,5,4,6,1);R(x,P.lo,5,16,6,1);
  }
}

function repairedShelf(x,o){
  const P=WOOD,r=o.rot,NEW={hi:'#fff0c8',base:'#f0d4a0',mid:'#d8b47a',lo:'#b8925a'};
  const bracket=(X,Y)=>{R(x,OL,X,Y,5,4);R(x,C.me2,X+1,Y+1,3,1);R(x,C.me2,X+1,Y+1,1,2);R(x,C.me1,X+1,Y+1,1,1);R(x,C.me3,X+3,Y+2,1,1);};
  if(r===0){
    shadowRect(x,4,9,30,7);
    O(x,0,-10,32,26,P.dk);
    bev(x,0,-12,32,5,P);
    O(x,0,-8,3,24,P.base);R(x,P.hi,1,-7,1,22);O(x,29,-8,3,24,P.mid);
    // 直した中段（新しい板）
    O(x,2,1,28,3,NEW.base);R(x,NEW.hi,3,2,26,1);R(x,OL,8,2,1,1);R(x,OL,23,2,1,1);
    bracket(3,4);bracket(24,4);
    R(x,'#4a2a18',3,-7,26,8);R(x,'#4a2a18',3,4,26,8);
    // 中身：ガラス瓶・小箱・工具
    O(x,5,-6,6,7,'#bfe8ea');R(x,'#ffffff',6,-5,1,4);R(x,C.am2,7,-2,3,2);R(x,C.w4,6,-7,4,1);
    O(x,14,-4,7,5,C.pk2);R(x,C.pk1,15,-3,5,1);
    R(x,OL,23,-5,5,1);R(x,C.me2,23,-6,2,1);R(x,C.w3,25,-5,3,1);
    O(x,8,8,8,4,C.cr2);R(x,C.cr3,9,9,6,1);
    O(x,20,6,5,6,C.g3);R(x,C.g1,21,7,1,3);
    O(x,1,12,30,4,P.mid);R(x,P.lo,2,14,28,1);
  }else if(r===180){
    shadowRect(x,4,9,30,7);
    bev(x,0,-10,32,26,{hi:P.base,base:P.mid,mid:P.lo});
    for(let i=8;i<32;i+=8)R(x,P.lo,i,-8,1,22);
    // 筋交い（新しい木）
    for(let k=0;k<22;k++){R(x,OL,4+k,12-Math.floor(k*0.8),3,3);}
    for(let k=0;k<22;k++){R(x,NEW.base,5+k,13-Math.floor(k*0.8)-1,1,1);R(x,NEW.hi,5+k,12-Math.floor(k*0.8)-1,1,1);}
    bracket(2,-8);bracket(25,10);
    bev(x,0,-12,32,5,P);
    O(x,1,12,30,4,P.lo);
  }else{
    shadowRect(x,7,10,11,22);
    bev(x,2,-14,12,22,P);
    R(x,OL,11,-12,4,42);R(x,'#4a2a18',12,-11,2,40);R(x,'#bfe8ea',12,-8,2,3);R(x,C.pk2,12,0,2,2);R(x,C.g3,12,14,2,3);R(x,C.cr2,12,22,2,2);
    R(x,NEW.base,12,6,2,1);
    bev(x,2,7,12,25,{hi:P.base,base:P.mid,mid:P.lo});
    // 側板の継ぎ当て
    O(x,4,12,7,6,NEW.base);R(x,NEW.hi,5,13,5,1);R(x,OL,5,15,1,1);R(x,OL,9,15,1,1);
    bracket(7,23);
  }
}

function futon(x,o){
  const star=(X,Y)=>{R(x,'#f4dc7a',X,Y,1,1);R(x,'#f4dc7a',X-1,Y+1,3,1);R(x,'#f4dc7a',X,Y+2,1,1);};
  if(o.rot===0){
    shadowRect(x,3,4,31,45);
    O(x,1,1,30,46,C.cr2);R(x,C.cr1,2,2,28,1);R(x,C.cr3,2,43,28,2);R(x,C.cr4,2,45,28,1);
    // 枕
    O(x,7,3,18,9,C.cr1);R(x,'#ffffff',8,4,15,1);R(x,C.cr3,8,10,16,1);R(x,C.cr3,15,5,1,4);
    // 掛け布団
    O(x,1,13,30,32,C.bl2);R(x,C.bl1,2,14,28,2);R(x,C.cr2,2,14,28,1);
    R(x,C.bl3,2,40,28,4);R(x,C.bl3,29,16,1,24);R(x,C.bl1,2,16,1,24);
    R(x,C.bl3,4,22,24,1);
    for(let i=0;i<4;i++)for(let j=0;j<3;j++)star(5+i*7+(j%2)*3,24+j*6);
  }else{
    // 90：頭が右、足元が左
    shadowRect(x,3,3,47,31);
    O(x,1,1,46,30,C.cr2);R(x,C.cr1,2,2,44,1);R(x,C.cr3,2,27,44,2);R(x,C.cr4,2,29,44,1);
    O(x,36,6,10,17,C.cr1);R(x,'#ffffff',37,7,8,1);R(x,C.cr3,37,21,8,1);R(x,C.cr3,40,11,4,1);
    O(x,1,1,33,29,C.bl2);R(x,C.bl1,2,2,31,2);R(x,C.cr2,31,2,2,26);R(x,C.bl1,30,2,1,26);
    R(x,C.bl3,2,25,31,4);R(x,C.bl3,10,4,1,20);
    for(let i=0;i<4;i++)for(let j=0;j<3;j++)star(5+i*7+(j%2)*3,6+j*6);
  }
}

function cushion(x,o){
  shE(x,9,12,7,3);
  O(x,1,2,14,12,C.pk2);R(x,C.pk1,2,3,12,1);R(x,C.pk1,2,3,1,9);R(x,C.pk3,2,11,12,2);R(x,C.pk3,13,4,1,8);
  R(x,OL,1,13,14,1);R(x,C.pk4,2,13,12,1);R(x,OL,1,14,14,1);
  // 綴じ目と房
  R(x,C.pk4,7,7,2,1);R(x,C.pk3,4,5,1,1);R(x,C.pk3,11,5,1,1);R(x,C.pk3,4,10,1,1);R(x,C.pk3,11,10,1,1);
  for(const [X,Y] of [[0,1],[14,1],[0,12],[14,12]]){R(x,OL,X,Y,2,2);R(x,C.yel,X,Y,1,1);}
}

function lowTable(x,o){
  const P=WOOD;
  shadowRect(x,4,22,30,8);
  O(x,3,20,4,10,P.lo);O(x,25,20,4,10,P.lo);
  O(x,0,16,32,6,P.mid);R(x,P.lo,1,20,30,1);
  // 天板（角を落とす）
  bev(x,0,-6,32,23,P);
  x.clearRect(0,-6,1,1);x.clearRect(31,-6,1,1);
  if(o.rot===0){for(let k=0;k<4;k++)R(x,P.mid,3+((k*7)%20),-2+k*5,8,1);}
  else{for(let k=0;k<4;k++)R(x,P.mid,5+k*7,-3+((k*5)%10),1,8);}
  // ふたり分の茶碗とおにぎり
  const cup=(X,Y,col)=>{O(x,X,Y,5,4,col);R(x,'#ffffff',X+1,Y+1,1,1);R(x,C.am2,X+1,Y,3,1);};
  const plate=(X,Y)=>{oell(x,X,Y,4,2,C.cr2);R(x,C.cr3,X-3,Y+1,7,1);for(const [dx,dy] of [[-2,-1],[1,-1],[0,0]]){R(x,OL,X+dx-1,Y+dy-1,3,3);R(x,'#ff9a3a',X+dx-1+1,Y+dy-1+1,1,1);R(x,'#ffb85a',X+dx-1,Y+dy,1,1);}};
  if(o.rot===0){cup(6,3,C.vi1);cup(21,3,C.pk2);plate(16,-1);}
  else{cup(13,-3,C.vi1);cup(13,9,C.pk2);plate(7,4);}
}

function glowCanvas(rgb,r){
  const key='glow|'+rgb+'|'+r;let c=cache.get(key);if(c)return c;
  c=mk(r*2+1,r*2+1);const x=c.getContext('2d');
  const steps=[[1,.05],[.86,.06],[.72,.07],[.58,.08],[.44,.1],[.3,.12],[.18,.14]];
  for(const [k,a] of steps){x.fillStyle='rgba('+rgb+','+a+')';const rr=Math.round(r*k);for(let yy=-rr;yy<=rr;yy++){const hw=Math.round(Math.sqrt(rr*rr-yy*yy));x.fillRect(r-hw,r+yy,hw*2+1,1);}}
  cache.set(key,c);return c;
}
function deskLamp(x,o){
  const P=WOOD;
  shE(x,9,13,6,2);
  // 小さな台
  O(x,3,7,3,8,P.lo);O(x,10,7,3,8,P.lo);
  bev(x,1,2,14,7,P);R(x,P.mid,2,7,12,1);
  // ランプ
  O(x,5,0,6,3,'#6e5a7a');R(x,'#a08cb0',6,1,3,1);
  R(x,OL,7,-8,2,9);R(x,'#c8a060',7,-8,1,8);
  const lit=o.lit;
  const sh=lit?[C.am1,C.am2,C.am3]:['#efe2c8','#d6c4a4','#b6a080'];
  R(x,OL,4,-15,8,1);R(x,OL,3,-14,10,1);R(x,OL,2,-13,12,5);R(x,OL,1,-9,14,2);
  R(x,sh[0],5,-14,6,1);R(x,sh[0],3,-13,3,4);R(x,sh[1],6,-13,6,4);R(x,sh[2],2,-9,12,1);R(x,sh[1],12,-12,1,3);
  if(lit){R(x,'#ffffff',4,-13,1,2);R(x,C.am1,6,-8,4,1);}
}
function shellLantern(x,o){
  const lit=o.lit;
  shE(x,9,13,6,2);
  // 流木の台
  O(x,2,8,12,6,'#c8b8a0');R(x,'#e2d6c2',3,9,10,1);R(x,'#a8987e',3,12,10,1);R(x,'#8a7a64',6,10,3,1);
  // 帆立貝（上が丸く広く、下の蝶番へすぼまる）
  const S=lit?['#ffffff','#e6fbf5','#9ad8d0','#5fb0ac']:['#fff8fa','#f6e2ea','#d4b2c2','#a8889a'];
  const hwAt=j=>{ // j: 0(上)..12(下)
    if(j<5)return Math.round(7*Math.sqrt(1-((4-j)/5)*((4-j)/5)));
    return Math.max(1,Math.round(7-(j-4)*0.75));};
  for(let j=0;j<13;j++){const hw=hwAt(j);R(x,OL,8-hw-1,-13+j,hw*2+2,1);}
  R(x,OL,8-hwAt(0),-14,hwAt(0)*2,1);
  for(let j=0;j<12;j++){const hw=hwAt(j)-1;if(hw>0)R(x,S[1],8-hw,-13+j+0,hw*2,1);}
  for(let k=-3;k<=3;k++){for(let j=1;j<12;j++){const xx=8+Math.round(k*(12-j)/5);if(Math.abs(xx-8)<hwAt(j)-1)R(x,S[3],xx-(k<0?1:0),-13+j,1,1);}}
  for(let i=-6;i<=6;i+=2)R(x,OL,8+i-(i<0?1:0),-12,1,1); // 波打つ縁
  R(x,S[0],4,-12,2,1);R(x,S[0],3,-11,1,2);
  // 蝶番の耳
  O(x,4,-2,8,3,S[3]);R(x,S[2],5,-1,6,1);
  // 首（金具）
  O(x,6,1,4,8,'#7a6a8a');R(x,'#a898b8',7,2,1,6);
  // 真珠の灯
  R(x,OL,7,-8,2,1);R(x,OL,6,-7,1,2);R(x,OL,9,-7,1,2);R(x,OL,7,-5,2,1);R(x,lit?C.te2:'#e6dce8',7,-7,2,2);R(x,'#ffffff',7,-7,1,1);
}

function childDrawing(x,o){
  // 壁に掛ける：足元の行(y=0)より上の壁帯に描く
  const Y=-24;
  R(x,SH2,15,Y+2,2,14);R(x,SH2,3,Y+16,14,2);
  R(x,OL,7,Y-5,2,1);R(x,'#c0a080',6,Y-4,1,1);R(x,'#c0a080',9,Y-4,1,1);R(x,'#c0a080',5,Y-3,1,1);R(x,'#c0a080',10,Y-3,1,1);R(x,'#c0a080',4,Y-2,1,1);R(x,'#c0a080',11,Y-2,1,1);
  bev(x,1,Y-1,15,16,WOOD);
  R(x,OL,3,Y+1,11,12);R(x,'#fffbee',4,Y+2,9,10);
  // 太陽
  R(x,'#ffc83a',11,Y+2,2,2);R(x,'#ffe08a',10,Y+2,1,1);
  // 地面
  R(x,'#7fcf6e',4,Y+10,9,1);R(x,'#5fae5c',5,Y+11,2,1);R(x,'#5fae5c',9,Y+11,3,1);
  // パパ（紫の髪・めがね）
  R(x,'#7a50c0',5,Y+3,3,2);R(x,'#f6c6a8',5,Y+5,3,1);R(x,'#2a1c36',5,Y+5,1,1);R(x,'#2a1c36',7,Y+5,1,1);
  R(x,'#b8a0e8',6,Y+6,1,3);R(x,'#b8a0e8',5,Y+7,1,1);R(x,'#5a3f80',5,Y+9,1,1);R(x,'#5a3f80',7,Y+9,1,1);
  // 手をつなぐ
  R(x,'#f08aa8',7,Y+7,2,1);
  // むすめ（ピンクの花のふたつ結び・ミントのパジャマ）
  R(x,'#3a2a5a',9,Y+6,2,1);R(x,'#ff8ab8',8,Y+6,1,1);R(x,'#ff8ab8',11,Y+6,1,1);R(x,'#f6c6a8',9,Y+7,2,1);
  R(x,'#7ad8b8',9,Y+8,2,2);
  // ハート
  R(x,'#f05a7a',7,Y+2,1,1);R(x,'#f05a7a',9,Y+2,1,1);R(x,'#f05a7a',8,Y+3,1,1);
}

function bear(x,o){
  const B={b:'#a8724a',B:'#86553a',c:'#e8c49a',t:'#d9b088',k:OL,e:'#2a1c36',w:'#ffffff',n:'#5a3a2a',p:'#f2a2ac',r:'#c89060'};
  shE(x,9,13,6,2);
  map(x,[
    "..kk......kk.r..",
    ".kbbk....kttk...",
    ".kbcbkkkkktcrk..",
    "..kbbbbbbbbbk...",
    ".kbbbbbbbbbbbk..",
    ".kbbekbbbkebbk..",
    ".kbbbbcccbbbbk..",
    ".kbpbbcnccbpbk..",
    "..kbbbcccbbbk...",
    "..kkbbbbbbbkk...",
    ".kbBkbbcbbkBbk..",
    ".kbBkbcccbkBbk..",
    "..kkbbcccbbkk...",
    ".kccbkbbbkbcck..",
    ".kcckkkkkkkcck..",
    "..kk.......kk...",
  ],B,0,-2);
  // ほつれ（画面右の耳＝クマの左耳）：糸のくず
  R(x,'#e8c49a',13,-3,1,1);R(x,OL,12,-3,1,1);R(x,'#d9b088',14,-1,1,1);
}

function flowerTag(x,o){
  shE(x,9,13,4,1);
  R(x,'#7a5a3a',6,12,5,2);
  O(x,7,-1,3,15,C.w3);R(x,C.w2,8,0,1,12);
  O(x,1,-9,15,10,'#efd6a6');R(x,'#fff0cc',2,-8,13,1);R(x,'#d4b47e',2,-1,13,1);
  R(x,OL,8,-10,1,1);
  // クレヨンの字（なまえ）
  const cr='#d05a8a';
  R(x,cr,3,-6,1,3);R(x,cr,4,-6,2,1);R(x,cr,5,-5,1,2);
  R(x,cr,7,-6,2,1);R(x,cr,7,-5,1,2);R(x,cr,8,-4,1,1);
  R(x,cr,10,-6,1,1);R(x,cr,11,-5,1,2);R(x,cr,10,-4,1,1);
  R(x,'#6a8ad0',3,-3,9,1);
  // 小さな花の落書き
  R(x,C.yel,13,-6,1,1);R(x,'#ff8ab8',12,-6,1,1);R(x,'#ff8ab8',14,-6,1,1);R(x,'#ff8ab8',13,-7,1,1);R(x,'#ff8ab8',13,-5,1,1);R(x,'#5fae5c',13,-4,1,2);
}

function flowerCols(color){
  if(typeof color==='string'){
    if(FLOWER[color])return FLOWER[color];
    if(/^#[0-9a-fA-F]{6}$/.test(color))return ['#ffffff',color,'#5a3a50'];
  }
  return FLOWER.pink;
}
const LEAF_R=["..kk.",".kgGk","kgGk.",".kk.."],LEAF_L=[".kk..","kGgk.",".kGgk","..kk."];
// ── 植物の種類ごとの絵（stage 0..4 共通） ──
function sprout(x,cx,base){map(x,[".k.k.","kGkGk",".kgk.","..k.."],{k:OL,g:C.g3,G:C.g1},cx-2,base-3);}
const HEART_R=[".kk.k.","kGgkgk","kgggk.",".kgk..","..k..."],HEART_L=[".k.kk.","kgkgGk",".kgggk","..kgk.","...k.."];
function morningGlory(x,cx,base,st,color,fr){
  const LP={k:OL,g:C.g3,G:C.g1};
  if(st===0){sprout(x,cx,base);return;}
  if(st===1){R(x,OL,cx-1,base-4,3,5);R(x,C.g3,cx,base-3,1,4);map(x,HEART_R,LP,cx,base-8);map(x,HEART_L,LP,cx-5,base-8);return;}
  // 支柱（竹）
  const top=base-[0,0,13,17,19][st];
  R(x,OL,cx+1,top-1,3,base-top+2);R(x,'#e2cf8a',cx+2,top,1,base-top);R(x,'#b8a060',cx+2,top+4,1,1);R(x,'#b8a060',cx+2,top+10,1,1);
  // つる（支柱に巻きつく）
  const vh=[0,0,9,14,17][st];
  for(let j=0;j<vh;j++)R(x,C.g4,cx+2+[-1,-1,0,1,1,0][j%6],base-1-j,1,1);
  const leaves=[[],[],[[-4,-5],[3,-9]],[[-4,-5],[3,-9],[-4,-13]],[[-4,-5],[3,-9],[-4,-13],[3,-16]]][st];
  leaves.forEach(([dx,dy])=>map(x,dx<0?HEART_L:HEART_R,LP,dx<0?cx+dx-1:cx+dx+1,base+dy-2));
  if(st===3){R(x,OL,cx+4,top-3,3,4);R(x,'#a070e0',cx+5,top-2,1,2);R(x,'#dcc4ff',cx+5,top-2,1,1);}
  if(st===4){
    const fl=(X,Y,cols)=>map(x,["..kkk..",".kaabk.","kabwbbk","kbwwwbk","kbbwbck",".kbbck.","..kkk.."],{k:OL,a:cols[0],b:cols[1],c:cols[2],w:'#ffffff'},X-3,Y-3);
    const c1=FLOWER[color]&&color!=='pink'?flowerCols(color):FLOWER.blue;
    fl(cx-3+(fr?1:0),base-11,c1);fl(cx+6,base-17,FLOWER.purple);
  }
}
function sunflower(x,cx,base,st,color,fr){
  const LP={k:OL,g:C.g3,G:C.g1};
  if(st===0){sprout(x,cx,base);return;}
  const hgt=[0,4,9,15,18][st],top=base-hgt,sw=(st>=3&&fr)?1:0;
  R(x,OL,cx-1,top,3,hgt+1);R(x,C.g3,cx,top+1,1,hgt);R(x,C.g4,cx,base-3,1,3);
  if(st===1){map(x,LEAF_R,LP,cx,top-2);map(x,LEAF_L,LP,cx-4,top-2);return;}
  // 大きな葉
  const big=(X,Y,left)=>map(x,left?["..kkk.",".kGggk","kGgggk","kgggk.",".kkk.."]:[".kkk..","kggGk.","kgggGk",".kgggk","..kkk."],LP,X,Y);
  big(cx+1,base-7,false);big(cx-6,base-9,true);
  if(st>=3)big(cx+1,base-13,false);
  if(st===3){R(x,OL,cx-2+sw,top-4,5,5);R(x,C.g2,cx-1+sw,top-3,3,3);R(x,C.g1,cx-1+sw,top-3,1,1);R(x,'#ffd84a',cx+sw,top-4,1,1);}
  if(st===4){
    const X=cx+sw,Y=top-5;
    R(x,OL,X-4,Y-3,9,9);x.clearRect(X-4,Y-3,1,1);x.clearRect(X+4,Y-3,1,1);x.clearRect(X-4,Y+5,1,1);x.clearRect(X+4,Y+5,1,1);
    R(x,OL,X-5,Y-1,1,5);R(x,OL,X+5,Y-1,1,5);R(x,OL,X-2,Y-4,5,1);R(x,OL,X-2,Y+6,5,1);
    R(x,'#ffd84a',X-4,Y-1,9,5);R(x,'#ffd84a',X-2,Y-3,5,9);R(x,'#ffd84a',X-3,Y-2,7,7);
    R(x,'#fff4b0',X-3,Y-2,2,1);R(x,'#fff4b0',X-4,Y-1,1,2);R(x,'#e0a020',X+2,Y+4,2,1);R(x,'#e0a020',X+3,Y+3,1,1);
    R(x,'#7a4a28',X-2,Y-1,5,5);R(x,'#5a321a',X-1,Y,3,3);R(x,'#9a6638',X-2,Y-1,1,1);R(x,'#3a2418',X,Y+1,1,1);
  }
}
function herb(x,cx,base,st,color,fr,idx){
  if(st===0){sprout(x,cx,base);return;}
  const sw=fr?1:0;
  if(st===1){map(x,[".k.k.k.","kGkgkGk",".kgggk.","..kkk.."],{k:OL,g:C.g3,G:C.g1},cx-3,base-4);return;}
  const rx=[0,0,3,4,5][st],ry=[0,0,2,3,4][st];
  const cy=base-ry-1;
  oell(x,cx,cy,rx,ry,C.g3);
  ell(x,cx-1,cy-1,rx-1,Math.max(1,ry-1),C.g2);
  // 葉の重なり
  srand(31+st+(idx|0)*7);
  for(let k=0;k<rx*2;k++){const dx=Math.round((rnd()*2-1)*(rx-1)),dy=Math.round((rnd()*2-1)*(ry-1));R(x,rnd()<0.5?C.g1:C.g4,cx+dx,cy+dy,1,1);}
  R(x,C.g4,cx-rx+1,cy+ry-1,rx*2-1,1);
  if(st===4){
    const fc=color==='purple'?'#c6b2ee':'#ffffff';
    for(const [dx,dy] of [[-3,-3],[0,-4],[3,-2],[-1,-1]]){R(x,fc,cx+dx+(dy<-2?sw:0),cy+dy,1,1);R(x,OL,cx+dx+(dy<-2?sw:0),cy+dy+1,1,1);}
  }
}

function plantArt(x,cx,base,stage,color,fr,species,idx,bloom){
  let st=Math.max(0,Math.min(4,stage|0));const sw=fr?1:0;
  if(bloom===false&&st>=4)st=3;     // 季節はずれ：花は咲かず、つぼみのまま（枯れない）
  if(species==='morning_glory'){morningGlory(x,cx,base,st,color,fr);return;}
  if(species==='sunflower'){sunflower(x,cx,base,st,color,fr);return;}
  if(species==='herb'){herb(x,cx,base,st,color,fr,idx);return;}
  const LP={k:OL,g:C.g3,G:C.g1};
  if(st===0){map(x,[".k.k.","kGkGk",".kgk.","..k.."],LP,cx-2,base-3);return;}
  const hgt=[0,4,8,10,11][st];
  const top=base-hgt;
  R(x,OL,cx-1,top,3,hgt+1);R(x,C.g3,cx,top+1,1,hgt);
  const tx=cx+(st>=2?sw:0);
  if(st===1){map(x,LEAF_R,LP,cx,top-2);map(x,LEAF_L,LP,cx-4,top-2);R(x,C.g3,cx,top,1,1);}
  if(st>=2){map(x,LEAF_R,LP,cx+1,base-5);map(x,LEAF_L,LP,cx-4,base-6);R(x,C.g3,cx,base-5,1,4);}
  if(st>=2){map(x,LEAF_R,LP,cx+1,top);map(x,LEAF_L,LP,cx-4,top+1);R(x,C.g3,cx,top+1,1,4);}
  if(st===3){const fc=flowerCols(color);map(x,[".kk.","kabk","kabk","kggk",".kk."],{k:OL,a:fc[0],b:fc[1],g:C.g2},tx-1,top-4);}
  if(st===4){
    const fc=flowerCols(color);
    // 5枚の花びら
    const fy=top-4;
    R(x,OL,tx-3,fy-2,7,7);x.clearRect(tx-3,fy-2,1,1);x.clearRect(tx+3,fy-2,1,1);x.clearRect(tx-3,fy+4,1,1);x.clearRect(tx+3,fy+4,1,1);
    R(x,OL,tx-4,fy,1,3);R(x,OL,tx+4,fy,1,3);R(x,OL,tx-1,fy-3,3,1);R(x,OL,tx-1,fy+5,3,1);
    R(x,fc[1],tx-3,fy,7,3);R(x,fc[1],tx-1,fy-2,3,7);R(x,fc[1],tx-2,fy-1,5,5);
    R(x,fc[0],tx-2,fy-1,2,1);R(x,fc[0],tx-3,fy,1,1);R(x,fc[2],tx+2,fy+3,1,1);R(x,fc[2],tx+1,fy+4,2,1);
    R(x,'#ffd84a',tx-1,fy,3,3);R(x,'#ffffff',tx-1,fy,1,1);R(x,'#e0a020',tx+1,fy+2,1,1);
  }
}
function pot(x,o){
  const P=POTS[o.variant]||POTS.default;
  shE(x,9,14,6,2);
  // 鉢
  R(x,OL,2,5,12,4);R(x,P.base,3,6,10,2);R(x,P.hi,3,6,10,1);
  for(let j=0;j<6;j++){const ins=Math.floor(j/2.5);R(x,OL,3+ins,9+j,10-ins*2,1);R(x,P.base,4+ins,9+j,8-ins*2,1);R(x,P.hi,4+ins,9+j,1,1);R(x,P.lo,11-ins,9+j,1,1);}
  R(x,OL,4,15,8,1);
  R(x,P.lo,3,8,10,1);
  R(x,'#5a3a2a',4,6,8,1);R(x,'#3e2618',5,6,6,1);
  if(o.plant)plantArt(x,8,6,o.plant.stage,o.plant.color,o.frame,o.plant.species,0,o.plant.bloom);
}

function flowerbed(x,o){
  const P=WOOD,cols=['pink','yellow','white','purple','red','blue'];
  const fl=(X,Y,c)=>{const f=FLOWER[c];R(x,OL,X-1,Y-2,3,5);R(x,OL,X-2,Y-1,5,3);R(x,f[1],X-1,Y-1,3,3);R(x,f[0],X-1,Y-1,1,1);R(x,f[2],X+1,Y+1,1,1);R(x,'#ffd84a',X,Y,1,1);};
  if(o.rot===0){
    shadowRect(x,3,6,31,10);
    O(x,0,-2,32,17,'#5a3a2a');
    R(x,'#6e4a34',1,-1,30,10);
    for(let i=0;i<30;i+=3)R(x,'#4e3020',1+i,1+(i%2)*3,1,1);
    srand(17);
    for(let i=0;i<7;i++){const X=4+i*4,Y=1+(i%2)*3;R(x,C.g4,X-2,Y+3,5,2);R(x,C.g2,X-2,Y+3,2,1);R(x,C.g2,X+1,Y+3,1,1);fl(X+((o.frame&&i%2)?1:0),Y,cols[i%cols.length]);}
    O(x,0,8,32,8,P.base);R(x,P.hi,1,9,30,1);R(x,P.mid,1,13,30,1);R(x,P.lo,1,14,30,1);
    for(let i=8;i<32;i+=8)R(x,P.lo,i,9,1,5);
    bev(x,0,-3,32,3,P);
  }else{
    shadowRect(x,3,4,14,28);
    O(x,0,-4,16,34,'#5a3a2a');R(x,'#6e4a34',1,-3,14,26);
    for(let j=0;j<6;j++){const X=5+(j%2)*5,Y=-1+j*4;R(x,C.g4,X-2,Y+2,5,2);R(x,C.g2,X-2,Y+2,2,1);fl(X+((o.frame&&j%2)?1:0),Y,cols[j%cols.length]);}
    bev(x,0,-5,16,3,P);bev(x,0,-5,3,30,P);bev(x,13,-5,3,30,P);
    O(x,0,23,16,9,P.base);R(x,P.hi,1,24,14,1);R(x,P.lo,1,30,14,1);
  }
}

function bench(x,o){
  const P=WOOD,r=o.rot;
  if(r===0){
    shadowRect(x,4,9,30,6);
    O(x,2,-10,3,18,P.lo);O(x,27,-10,3,18,P.lo);
    bev(x,0,-11,32,4,P);bev(x,0,-6,32,4,P);
    O(x,2,7,3,8,P.lo);O(x,27,7,3,8,P.lo);
    bev(x,0,0,32,8,P);R(x,P.mid,1,3,30,1);R(x,P.lo,1,4,30,1);R(x,OL,0,8,32,1);
  }else if(r===180){
    shadowRect(x,4,9,30,6);
    O(x,2,6,3,9,P.lo);O(x,27,6,3,9,P.lo);
    bev(x,0,-2,32,8,P);R(x,P.mid,1,1,30,1);
    O(x,2,-8,3,20,P.base);O(x,27,-8,3,20,P.base);
    bev(x,0,-9,32,4,P);bev(x,0,1,32,4,P);
  }else{
    // 270＝右向き（背もたれが左）
    shadowRect(x,6,4,12,29);
    O(x,3,26,3,6,P.lo);O(x,11,26,3,6,P.lo);
    bev(x,2,-2,13,29,P);for(let j=3;j<26;j+=5)R(x,P.mid,3,j,11,1);R(x,P.lo,13,-1,1,27);
    O(x,0,-12,5,38,P.base);R(x,P.hi,1,-11,1,36);R(x,P.mid,3,-11,1,36);
    R(x,P.lo,1,-1,3,1);R(x,P.lo,1,24,3,1);
  }
}

function fence(x,o){
  const P=WOOD;
  if(o.rot===0){
    ell(x,9,13,7,1,SH2);R(x,SH2,0,9,16,2);
    // 横木（左右はつながるよう外周なし）
    for(const ry of[-4,2]){R(x,OL,0,ry-1,16,1);R(x,P.base,0,ry,16,2);R(x,P.hi,0,ry,16,1);R(x,OL,0,ry+2,16,1);R(x,P.lo,0,ry+2,16,1);R(x,OL,0,ry+3,16,1);}
    // 杭
    R(x,OL,5,-9,6,21);R(x,OL,6,-10,4,1);
    R(x,P.base,6,-9,4,20);R(x,P.hi,6,-9,1,19);R(x,P.lo,9,-8,1,19);R(x,P.w1||P.hi,7,-9,2,1);
    R(x,'#7a5a3a',5,11,6,1);
  }else{
    R(x,SH2,10,-6,2,16);
    // 縦に続く横木（上から見ると細い帯。上下の外周なしでつながる）
    R(x,OL,5,-10,1,16);R(x,OL,10,-10,1,16);R(x,P.base,6,-10,4,16);R(x,P.hi,6,-10,1,16);R(x,P.lo,9,-10,1,16);
    R(x,P.mid,7,-8,2,1);R(x,P.mid,7,-1,2,1);
    // 杭（頭と根元）
    O(x,4,-5,8,5,P.hi);R(x,P.base,5,-2,6,2);R(x,'#fff0c8',5,-4,2,1);
    O(x,5,0,6,8,P.base);R(x,P.hi,6,1,1,6);R(x,P.lo,9,1,1,6);
    R(x,'#7a5a3a',4,7,8,1);R(x,SH,6,8,6,1);
  }
}

function steppingStone(x,o){
  ell(x,9,10,7,4,'rgba(27,18,38,0.22)');
  oell(x,8,8,6,4,C.st2);
  ell(x,7,7,5,3,C.st2);ell(x,6,6,3,1,C.st1);R(x,C.st3,10,10,3,1);R(x,C.st3,12,9,1,1);
  R(x,C.st3,4,9,1,1);R(x,C.st1,9,6,1,1);
  oell(x,13,14,2,1,C.st3);R(x,C.st2,12,13,2,1);
  R(x,C.g1,1,12,1,1);R(x,C.g4,2,13,1,1);
}

// 季節の葉の色：[g1 明, g2, g3 地, g4 陰, g5 最暗]
const LEAVES={
  summer:[C.g1,C.g2,C.g3,C.g4,C.g5],
  autumn:['#ffd98a','#ffb85a','#e08a34','#b8562e','#7a3424'],
  spring:['#fff0f4','#ffc4dc','#f59aae','#d9708e','#a54a70'],
};
function smallTree(x,o){
  const sw=o.frame?1:0;
  const season=o.season||'summer';
  shE(x,10,13,7,2);
  O(x,6,2,5,13,'#8a5a3a');R(x,'#a8724a',7,3,1,11);R(x,'#6a4028',9,3,1,11);R(x,'#6a4028',4,13,2,1);R(x,'#6a4028',11,13,2,1);R(x,OL,3,14,10,1);
  if(season==='winter'){
    // 冬：葉を落とした枝（雪の日は枝に雪）
    const BR='#8a5a3a',BRd='#6a4028';
    const br=(pts,col)=>pts.forEach(([X,Y])=>{R(x,OL,X-1,Y,3,1);});
    const limbs=[[8,1],[8,0],[8,-1],[8,-2],[8,-3],[7,-4],[7,-5],[6,-6],[6,-7],[5,-8],[5,-9],[9,-4],[10,-5],[10,-6],[11,-7],[11,-8],[12,-9],[8,-5],[8,-6],[8,-7],[8,-8],[9,-9],[9,-10],[9,-11],[4,-10],[3,-11],[13,-10],[14,-11],[7,-11],[6,-12],[10,-12]];
    br(limbs);
    limbs.forEach(([X,Y],i)=>R(x,i%3?BR:BRd,X,Y,1,1));
    R(x,'#a8724a',8,-3,1,3);
    if(o.snow){[[5,-9],[6,-12],[9,-12],[12,-10],[3,-12],[14,-12],[8,-9]].forEach(([X,Y])=>{R(x,'#ffffff',X-1,Y-1,3,1);R(x,'#dfe6f2',X,Y,1,1);});R(x,'#ffffff',3,13,3,1);R(x,'#ffffff',11,13,3,1);}
    return;
  }
  const L=LEAVES[season]||LEAVES.summer;
  // 樹冠
  const blob=(cx,cy,r,col)=>oell(x,cx,cy,r,r*0.85,col);
  blob(4+sw,-6,5,L[2]);blob(12+sw,-6,5,L[2]);blob(8+sw,-12,6,L[2]);blob(8,-2,5,L[3]);
  ell(x,4+sw,-6,5,4,L[2]);ell(x,12+sw,-6,5,4,L[2]);ell(x,8+sw,-12,6,5,L[2]);ell(x,8,-2,5,4,L[3]);
  ell(x,7+sw,-13,4,3,L[1]);ell(x,3+sw,-7,3,2,L[1]);ell(x,11+sw,-8,3,2,L[1]);
  ell(x,6+sw,-14,2,1,L[0]);ell(x,2+sw,-8,1,1,L[0]);ell(x,10+sw,-9,1,1,L[0]);
  R(x,L[3],13+sw,-3,2,1);R(x,L[3],9+sw,-6,2,1);R(x,L[4],5,0,6,1);
  if(season==='summer'){
    // 小さな白い花
    for(const [X,Y] of [[5,-11],[11,-12],[13,-5],[3,-4],[9,-7]]){R(x,'#ffffff',X+sw,Y);R(x,'#ffd0e0',X+sw+1,Y);}
  }else if(season==='spring'){
    for(const [X,Y] of [[5,-11],[11,-12],[13,-5],[3,-4],[9,-7],[7,-9]]){R(x,'#ffffff',X+sw,Y);}
    R(x,C.pk2,2,14,1,1);R(x,C.pk1,13,13,1,1);           // 足もとの花びら
  }else{
    // 秋：足もとの落ち葉
    R(x,C.am3,2,13,2,1);R(x,'#d0604a',13,14,2,1);R(x,C.yel,12,12,1,1);
  }
}

function rug(x,o){
  const W=o.W,H=o.H,F='#f2d6b8',B1='#5a3f80',B2='#3d2a5c',FLD='#b5677e',FLD2='#a05a70',M='#f2c4a0';
  R(x,SH2,2,2,W,H-2);
  const horiz=o.rot===0;
  const X0=horiz?2:0,Y0=horiz?1:2,RW=horiz?W-4:W,RH=horiz?H-2:H-4;
  O(x,X0,Y0,RW,RH,B1);R(x,B2,X0+1,Y0+RH-2,RW-2,1);
  R(x,F,X0+2,Y0+2,RW-4,RH-4);R(x,FLD,X0+3,Y0+3,RW-6,RH-6);
  for(let j=Y0+4;j<Y0+RH-4;j+=2)R(x,FLD2,X0+4,j,RW-8,1);
  // ひし形の模様
  const cx=X0+RW/2|0,cy=Y0+RH/2|0;
  for(let k=0;k<5;k++){R(x,M,cx-k,cy-4+k,1,1);R(x,M,cx+k,cy-4+k,1,1);R(x,M,cx-k,cy+4-k,1,1);R(x,M,cx+k,cy+4-k,1,1);}
  R(x,'#ffe8a0',cx,cy,1,1);
  const n=horiz?2:1;
  for(let s of[-1,1]){const ox=horiz?cx+s*14:cx,oy=horiz?cy:cy+s*14;for(let k=0;k<3;k++){R(x,M,ox-k,oy-2+k,1,1);R(x,M,ox+k,oy-2+k,1,1);R(x,M,ox-k,oy+2-k,1,1);R(x,M,ox+k,oy+2-k,1,1);}}
  // 縁の点々
  for(let i=X0+3;i<X0+RW-3;i+=3){R(x,F,i,Y0+1,1,1);R(x,F,i,Y0+RH-2,1,1);}
  // 房
  if(horiz){for(let j=Y0+1;j<Y0+RH-1;j+=2){R(x,F,0,j,2,1);R(x,F,W-2,j,2,1);}}
  else{for(let i=X0+1;i<X0+RW-1;i+=2){R(x,F,i,0,1,2);R(x,F,i,H-2,1,2);}}
}

function seaGlass(x,o){
  const sw=o.frame?1:0;
  shE(x,9,13,6,2);
  // 流木の台と柱
  O(x,2,9,12,5,'#c8b8a0');R(x,'#e2d6c2',3,10,10,1);R(x,'#9a8a72',3,12,10,1);
  O(x,7,-12,3,22,'#b8a68a');R(x,'#d6c8ae',8,-11,1,20);
  // 横木
  O(x,0,-14,16,3,'#c8b8a0');R(x,'#e2d6c2',1,-13,14,1);
  // 吊られたガラス片
  const g=[['#5fd0c0','#bff6ec',2],['#9fd8f4','#e4f8ff',6],['#bff0c8','#f0fff2',10],['#4fb4c8','#aeeaf4',13]];
  for(let i=0;i<g.length;i++){
    const [c1,c2,X]=g[i],len=3+(i%2)*3,dx=(i%2?sw:-sw)*(sw?1:0);
    R(x,'#8a8aa0',X,-11,1,len);
    const Y=-11+len;
    R(x,OL,X-1+dx,Y,4,5);R(x,c1,X+dx,Y+1,2,3);R(x,c2,X+dx,Y+1,1,1);
  }
  // きらめき
  if(o.frame){R(x,'#ffffff',12,-15,1,1);}else{R(x,'#ffffff',3,-4,1,1);}
}

// ───────── フェーズ2のアイテム ─────────
function toyBox(x,o){
  const P=WOOD;
  shadowRect(x,3,12,14,4);
  // 立てかけたふた（奥）
  O(x,1,-9,14,6,P.mid);R(x,P.base,2,-8,12,2);R(x,P.hi,2,-8,12,1);R(x,P.lo,2,-5,12,1);
  // 箱の口（中は暗い）
  O(x,0,-4,16,6,P.dk);R(x,'#3a2418',1,-3,14,4);
  // おもちゃ：赤いボール・青い積み木・黄色いアヒル
  oell(x,4,-4,3,3,C.red);R(x,'#ff9a9a',3,-6,2,1);R(x,'#ffffff',3,-6,1,1);R(x,'#a83a4a',5,-2,2,1);
  O(x,8,-6,5,5,'#5a7ad0');R(x,'#9cbaf4',9,-5,3,1);R(x,'#ffffff',10,-4,1,2);R(x,'#3a4f96',9,-2,3,1);
  oell(x,13,-3,2,2,C.yel);R(x,'#ff9a3a',15,-3,1,1);R(x,OL,13,-4,1,1);R(x,'#fff2a8',12,-4,1,1);
  // 前の面
  bev(x,0,1,16,14,P);
  R(x,C.pk2,1,6,14,4);R(x,C.pk1,1,6,14,1);R(x,C.pk3,1,9,14,1);
  // 星のシール
  R(x,C.yel,7,6,2,4);R(x,C.yel,6,7,4,2);R(x,'#fff4b0',7,7,1,1);
  R(x,P.mid,1,12,14,1);R(x,P.lo,1,13,14,1);
}
function kidDesk(x,o){
  const P={hi:'#fff4dc',base:'#f2d6a6',mid:'#d9b47c',lo:'#b08a56',dk:'#7a5a3a'};
  const r=o.rot;
  if(r===0||r===180){
    shadowRect(x,3,10,14,5);
    O(x,1,6,3,9,P.lo);O(x,12,6,3,9,P.lo);
    if(r===0){O(x,0,4,16,4,P.mid);R(x,P.lo,1,6,14,1);}
    bev(x,0,-4,16,9,P);
    if(r===0){
      // 画用紙とクレヨン
      O(x,2,-3,8,6,C.cr1);R(x,'#ffc83a',7,-2,2,2);R(x,'#7fcf6e',3,1,6,1);R(x,'#f58ab0',4,-1,2,2);R(x,'#6f93e8',6,-1,1,2);
      R(x,OL,11,-3,4,5);R(x,'#e04a5a',12,-2,1,3);R(x,'#ffd84a',13,-2,1,3);R(x,'#6f93e8',12,0,1,1);R(x,'#5fae5c',13,0,1,1);
    }else{
      O(x,0,-4,16,12,P.mid);R(x,P.base,1,-3,14,1);R(x,P.lo,1,6,14,1);
      R(x,'#f58ab0',3,1,3,2);R(x,C.yel,10,2,2,2);   // 裏のシール
    }
  }else{
    // 270＝右向き（娘は右側に座る）
    shadowRect(x,5,9,10,6);
    O(x,3,6,3,9,P.lo);O(x,10,6,3,9,P.lo);
    bev(x,2,-5,12,12,P);
    O(x,4,-4,7,6,C.cr1);R(x,'#ffc83a',5,-3,2,1);R(x,'#7fcf6e',5,0,5,1);
    R(x,OL,11,1,3,4);R(x,'#e04a5a',12,2,1,1);R(x,'#6f93e8',12,3,1,1);
    R(x,P.lo,3,6,10,1);
  }
}
function oldRadio(x,o){
  const P=WOOD,B={hi:'#c08a5a',base:'#9a6638',mid:'#7a4a28',lo:'#5a321a'};
  shE(x,9,14,6,2);
  // 小さな台
  O(x,2,8,3,7,P.lo);O(x,11,8,3,7,P.lo);
  bev(x,1,4,14,6,P);R(x,P.mid,2,8,12,1);
  // ラジオ本体（角の丸い木箱）
  R(x,OL,2,-7,12,1);R(x,OL,1,-6,14,11);
  R(x,B.base,2,-6,12,10);R(x,B.hi,3,-6,10,1);R(x,B.hi,2,-5,1,8);R(x,B.lo,2,3,12,1);R(x,B.mid,13,-5,1,8);
  // 布のスピーカー
  R(x,OL,3,-4,6,6);R(x,'#efe2c8',4,-3,4,4);for(let j=0;j<4;j+=2)R(x,'#cdb894',4,-3+j,4,1);
  // ダイヤル窓（灯り色）と目盛
  R(x,OL,9,-4,4,3);R(x,C.am2,10,-3,2,1);R(x,'#e08a34',11,-3,1,1);
  // つまみ
  R(x,OL,9,0,2,2);R(x,'#efe2c8',9,0,1,1);R(x,OL,12,0,2,2);R(x,'#efe2c8',12,0,1,1);
  // アンテナ
  R(x,C.me3,12,-12,1,5);R(x,C.me1,12,-13,1,1);
}
function toolbox(x,o){
  const Rd={hi:'#ff8a8a',base:'#d04a4a',mid:'#a8323a',lo:'#7a2430'};
  shE(x,9,14,7,2);
  // 取っ手
  R(x,OL,4,-4,8,1);R(x,OL,3,-3,1,4);R(x,OL,12,-3,1,4);R(x,C.me2,4,-3,8,1);R(x,C.me1,4,-3,3,1);R(x,C.me3,5,-2,6,1);
  // ふた
  bev(x,0,0,16,5,Rd);
  // 本体
  O(x,0,4,16,11,Rd.base);R(x,Rd.hi,1,5,1,8);R(x,Rd.mid,1,12,14,1);R(x,Rd.lo,1,13,14,1);R(x,Rd.mid,14,5,1,8);
  R(x,OL,0,4,16,1);
  // 留め金
  R(x,OL,6,3,4,4);R(x,C.me1,7,4,2,2);R(x,C.me3,8,5,1,1);
  // へこみと擦れ
  R(x,Rd.lo,12,7,2,1);R(x,Rd.hi,11,8,1,1);R(x,'#e8b48e',3,9,1,1);R(x,'#e8b48e',2,10,2,1);
  // 古いシール（緑の名札）
  R(x,OL,4,8,5,4);R(x,'#f4f2ea',5,9,3,2);R(x,'#2f9a52',5,9,1,2);
}
function recitalPhoto(x,o){
  const Y=-24;
  R(x,SH2,15,Y+1,2,14);R(x,SH2,3,Y+15,14,2);
  R(x,OL,7,Y-4,2,1);R(x,'#c0a080',6,Y-3,1,1);R(x,'#c0a080',9,Y-3,1,1);R(x,'#c0a080',5,Y-2,1,1);R(x,'#c0a080',10,Y-2,1,1);
  O(x,1,Y-1,15,15,'#f4efe6');R(x,'#ffffff',2,Y,13,1);R(x,'#ffffff',2,Y,1,13);R(x,C.cr3,2,Y+12,13,1);R(x,C.cr3,14,Y+1,1,12);
  R(x,OL,3,Y+1,11,11);
  // 舞台：幕・床・スポットライト
  R(x,'#3a2a4a',4,Y+2,9,9);
  R(x,'#c8505a',4,Y+2,2,7);R(x,'#c8505a',11,Y+2,2,7);R(x,'#a83a4a',5,Y+2,1,7);R(x,'#a83a4a',11,Y+2,1,7);R(x,'#e05a6a',4,Y+2,9,1);
  R(x,'#fff4cc',7,Y+3,3,1);R(x,'rgba(255,244,204,0.5)',6,Y+4,5,5);
  R(x,'#b97c45',4,Y+9,9,2);R(x,'#d9a066',4,Y+9,9,1);
  // 花の冠の娘（ピンクのドレス）
  R(x,'#ff8ab8',7,Y+3,1,1);R(x,C.yel,8,Y+3,1,1);R(x,'#ff8ab8',9,Y+3,1,1);
  R(x,'#35224e',7,Y+4,3,1);R(x,'#ffe9de',7,Y+5,3,1);R(x,'#35224e',7,Y+5,1,1);
  R(x,'#f59aae',7,Y+6,3,2);R(x,'#ffd0e0',6,Y+7,5,1);R(x,'#ffe9de',6,Y+6,1,1);R(x,'#ffe9de',10,Y+5,1,1);
  R(x,'#ffe9de',7,Y+8,1,1);R(x,'#ffe9de',9,Y+8,1,1);
  // 手書きの日付
  R(x,'#6a8ad0',4,Y+11,4,1);
}
function windChime(x,o){
  const sw=o.frame?1:0,Y=-29;
  // 吊り紐
  R(x,'#8a8aa0',8,Y,1,4);R(x,OL,7,Y,3,1);
  // ガラスの鐘（夢の海の色・透け感は段差で）
  R(x,OL,6,Y+3,5,1);R(x,OL,5,Y+4,7,1);R(x,OL,4,Y+5,9,5);
  R(x,C.te2,6,Y+4,5,1);R(x,C.te2,5,Y+5,7,4);R(x,C.te1,6,Y+5,2,2);R(x,'#ffffff',6,Y+5,1,1);
  R(x,C.te3,5,Y+8,7,1);R(x,C.te4,10,Y+6,1,2);
  // 金魚の絵
  R(x,'#e05a6a',8,Y+6,2,1);R(x,'#ff8a8a',10,Y+6,1,1);R(x,'#e05a6a',10,Y+7,1,1);
  R(x,OL,4,Y+9,9,1);
  // 舌と短冊
  R(x,'#8a8aa0',8+sw,Y+10,1,3);
  R(x,OL,6+sw*2,Y+13,5,10);R(x,'#fff4e0',7+sw*2,Y+14,3,8);R(x,'#c6b2ee',7+sw*2,Y+14,3,1);
  R(x,'#6a8ad0',8+sw*2,Y+16,1,4);
  R(x,SH2,12,Y+5,2,5);
}
function seaMobile(x,o){
  const sw=o.frame?1:0,Y=-29;
  R(x,'#8a8aa0',8,Y,1,2);
  // 流木の横木
  O(x,1,Y+2,15,3,'#c8b8a0');R(x,'#e2d6c2',2,Y+3,13,1);R(x,'#9a8a72',12,Y+3,2,1);
  // 糸と飾り：魚（ティール）・貝（ピンク）・星（黄）
  const d=[sw,-sw,sw];
  R(x,'#8a8aa0',3,Y+5,1,6);R(x,'#8a8aa0',8,Y+5,1,11);R(x,'#8a8aa0',13,Y+5,1,4);
  // 魚
  {const X=1+d[0],YY=Y+11;R(x,OL,X,YY,6,4);R(x,C.te3,X+1,YY+1,3,2);R(x,C.te2,X+1,YY+1,2,1);R(x,OL,X+1,YY+1,1,1);R(x,C.te4,X+4,YY+1,1,2);x.clearRect(X+5,YY,1,1);x.clearRect(X+5,YY+3,1,1);}
  // 貝
  {const X=6+d[1],YY=Y+16;R(x,OL,X,YY,5,4);R(x,'#f6e2ea',X+1,YY+1,3,2);R(x,'#d4b2c2',X+2,YY+1,1,2);x.clearRect(X,YY,1,1);x.clearRect(X+4,YY,1,1);}
  // 星
  {const X=11+d[2],YY=Y+9;R(x,OL,X+1,YY,3,5);R(x,OL,X,YY+1,5,3);R(x,C.yel,X+2,YY+1,1,3);R(x,C.yel,X+1,YY+2,3,1);R(x,'#fff4b0',X+2,YY+2,1,1);}
  R(x,SH2,14,Y+6,1,8);
}
function nameplate(x,o){
  const P=WOOD;
  shE(x,9,14,6,2);
  // 柱
  O(x,6,-2,5,16,P.lo);R(x,P.mid,7,-1,1,14);
  R(x,'#7a5a3a',4,13,9,2);
  // 小さな屋根
  R(x,OL,1,-14,14,1);R(x,OL,0,-13,16,3);R(x,'#5a4a6a',1,-13,14,1);R(x,'#7a6a8a',1,-12,14,1);R(x,'#4a3a5a',2,-11,12,1);
  // 表札（白木に彫った字）
  O(x,2,-10,12,10,'#f4e2c0');R(x,'#fff4dc',3,-9,10,1);R(x,'#d8c09a',3,-2,10,1);R(x,'#d8c09a',12,-8,1,6);
  const k='#5a3a2a';
  R(x,k,5,-8,2,1);R(x,k,5,-7,1,2);R(x,k,6,-6,1,1);
  R(x,k,8,-8,2,1);R(x,k,9,-7,1,1);R(x,k,8,-6,2,1);
  R(x,k,5,-4,1,1);R(x,k,6,-4,1,1);R(x,k,8,-4,2,1);R(x,k,10,-5,1,2);
  // 貝の飾り
  R(x,'#f6e2ea',12,-4,1,1);R(x,C.pk3,12,-3,1,1);
}
function laundry(x,X,Y,kind,sw){
  const pin=(px,py)=>{R(x,OL,px,py-1,1,2);R(x,'#f2cf98',px,py-1,1,1);};
  if(kind==='dress'){R(x,OL,X+sw,Y,6,1);R(x,OL,X-1+sw,Y+1,8,7);R(x,C.pk2,X+sw,Y+1,6,6);R(x,C.pk1,X+sw,Y+1,6,1);R(x,C.pk3,X+sw,Y+6,6,1);R(x,'#ffffff',X+2+sw,Y+3,1,1);R(x,'#ffffff',X+4+sw,Y+5,1,1);x.clearRect(X-1+sw,Y+1,1,2);x.clearRect(X+6+sw,Y+1,1,2);pin(X+1,Y);pin(X+4,Y);}
  else if(kind==='shirt'){R(x,OL,X-1,Y,10,4);R(x,OL,X+1,Y+3,6,6);R(x,C.vi1,X,Y+1,8,2);R(x,C.vi1,X+2,Y+3,4,5);R(x,'#ffffff',X+2,Y+1,1,1);R(x,'#9682ca',X+5,Y+3,1,5);R(x,'#f19ac0',X+3,Y+1,2,1);pin(X,Y);pin(X+7,Y);}
  else{R(x,OL,X,Y,6,9);R(x,C.cr1,X+1,Y+1,4,7);R(x,'#a8c0f0',X+1,Y+5,4,1);R(x,C.cr3,X+4,Y+1,1,7);pin(X+1,Y);pin(X+4,Y);}
}
function clothesline(x,o){
  const P=WOOD,sw=o.frame?1:0;
  if(o.rot===0){
    shadowRect(x,4,12,42,3);
    // 柱（T字）
    for(const X of[2,43]){O(x,X,-20,3,35,P.lo);R(x,P.mid,X+1,-19,1,33);O(x,X-3,-21,9,3,P.base);R(x,P.hi,X-2,-20,7,1);O(x,X-1,12,5,3,'#7a5a3a');}
    // ロープ（少したるむ）
    for(let i=4;i<44;i++){const yy=-19+Math.round(Math.sin((i-4)/40*Math.PI)*3);R(x,'#efe2c8',i,yy,1,1);R(x,'rgba(27,18,38,0.35)',i,yy+1,1,1);}
    laundry(x,9,-16,'dress',sw);laundry(x,20,-14,'shirt',0);laundry(x,33,-15,'towel',0);
  }else{
    // 90：柱が上下。ロープは縦に、洗濯物は横向き（細く）見える
    shadowRect(x,6,2,6,44);
    for(let i=1;i<43;i++){const xx=8+Math.round(Math.sin(i/42*Math.PI)*2);R(x,'rgba(27,18,38,0.2)',xx+3,i+4,1,1);}
    O(x,6,-18,3,24,P.lo);R(x,P.mid,7,-17,1,22);O(x,2,-19,11,3,P.base);R(x,P.hi,3,-18,9,1);
    for(let j=-16;j<26;j++){const xx=7+Math.round(Math.sin((j+16)/42*Math.PI)*2);R(x,'#efe2c8',xx,j,1,1);}
    // 洗濯物（横から）
    const side=(Y,c1,c2,h)=>{R(x,OL,7+sw,Y,4,h);R(x,c1,8+sw,Y+1,2,h-2);R(x,c2,9+sw,Y+1,1,h-2);};
    side(-12,C.pk2,C.pk3,7);side(-2,C.vi1,'#9682ca',9);side(10,C.cr1,C.cr3,8);
    O(x,6,24,3,22,P.lo);R(x,P.mid,7,25,1,20);O(x,2,23,11,3,P.base);R(x,P.hi,3,24,9,1);
    O(x,5,44,5,3,'#7a5a3a');
  }
}
const BULB=['#ffd98a','#ffb0c8','#9ff0e0','#fff4cc'];
function stringBulbs(rot){
  // 電球の位置（足元の左上が原点・ドット）
  const L=[];
  if(rot===0){for(let i=5;i<=27;i+=4){L.push({x:i,y:-17+Math.round(Math.sin((i-2)/28*Math.PI)*4)});}}
  else{for(let j=-13;j<=27;j+=5){L.push({x:8+Math.round(Math.sin((j+16)/44*Math.PI)*3),y:j});}}
  return L;
}
function stringLights(x,o){
  const lit=o.lit,P={hi:'#a8b0c0',base:'#6e7488',lo:'#4a4e60'};
  const pole=(X,Y,h)=>{R(x,OL,X,Y,3,h);R(x,P.base,X+1,Y+1,1,h-2);R(x,P.hi,X+1,Y+1,1,1);R(x,SH2,X+3,Y+h-2,2,2);};
  const bulbs=stringBulbs(o.rot===90?90:0);
  if(o.rot!==90){
    pole(0,-20,34);pole(29,-20,34);
    for(let i=2;i<30;i++){const yy=-19+Math.round(Math.sin((i-2)/28*Math.PI)*4);R(x,'#3a3448',i,yy,1,1);}
  }else{
    pole(6,-20,26);
    for(let j=-19;j<30;j++){const xx=8+Math.round(Math.sin((j+16)/44*Math.PI)*3);R(x,'#3a3448',xx,j,1,1);}
    pole(6,10,22);
  }
  bulbs.forEach((b,i)=>{
    const c=lit?BULB[i%BULB.length]:'#e6e0d0';
    R(x,OL,b.x-1,b.y+1,3,3);R(x,c,b.x,b.y+2,1,1);R(x,lit?'#ffffff':'#cfc8b8',b.x,b.y+1,1,1);
  });
}
function planterArt(x,o){
  const P=WOOD;
  const pl=o.plant;
  if(o.rot!==90){
    shadowRect(x,3,10,31,5);
    // 土
    O(x,0,0,32,6,'#5a3a2a');R(x,'#6e4a34',1,1,30,4);for(let i=2;i<30;i+=3)R(x,'#4e3020',i,2+(i%2),1,1);
    if(pl)(pl.species==='herb'||!pl.species||pl.species==='seed'?[8,16,24]:[9,23]).forEach((cx,i)=>plantArt(x,cx,3,pl.stage,pl.color,(o.frame+i)%2,pl.species,i,pl.bloom));
    // 手前の板
    O(x,0,4,32,11,P.base);R(x,P.hi,1,5,30,1);R(x,P.mid,1,12,30,1);R(x,P.lo,1,13,30,1);
    for(let i=8;i<32;i+=8)R(x,P.lo,i,6,1,6);
    R(x,P.dk,2,9,2,1);R(x,P.dk,28,9,2,1);
  }else{
    shadowRect(x,3,2,14,30);
    O(x,0,-4,16,31,'#5a3a2a');R(x,'#6e4a34',1,-3,14,29);
    bev(x,0,-5,3,32,P);bev(x,13,-5,3,32,P);bev(x,0,-5,16,3,P);
    if(pl)(pl.species==='herb'||!pl.species||pl.species==='seed'?[-1,8,17]:[1,15]).forEach((by,i)=>plantArt(x,8,by+4,pl.stage,pl.color,(o.frame+i)%2,pl.species,i,pl.bloom));
    O(x,0,25,16,7,P.base);R(x,P.hi,1,26,14,1);R(x,P.lo,1,30,14,1);
  }
}
function wateringCan(x,o){
  const M={hi:'#e4f0f8',base:'#9cc4dc',mid:'#6e9ab8',lo:'#4a7090'};
  shE(x,8,14,6,2);
  // 注ぎ口
  for(let k=0;k<6;k++){R(x,OL,10+k,6-k,2,3);}
  for(let k=0;k<6;k++){R(x,M.base,11+k,7-k,1,1);}
  R(x,OL,15,-1,3,4);R(x,M.hi,16,0,1,2);
  // 取っ手
  R(x,OL,3,-2,8,1);R(x,OL,2,-1,1,5);R(x,OL,11,-1,1,4);R(x,M.mid,3,-1,8,1);
  // 胴
  R(x,OL,1,3,11,1);R(x,OL,0,4,13,10);R(x,OL,1,14,11,1);
  R(x,M.base,1,4,11,10);R(x,M.hi,2,4,9,1);R(x,M.hi,1,5,1,7);R(x,M.mid,11,5,1,8);R(x,M.lo,2,12,9,1);
  R(x,M.mid,1,8,11,1);
  // 水のしずく
  R(x,'#bcd4ff',17,4,1,1);
}

// 「？」の箱
function qbox(fw,fh){
  const c=mk(fw*U,fh*U),x=c.getContext('2d');
  const W=fw*U,H=fh*U;
  O(x,1,1,W-2,H-2,'#d8b888');R(x,'#f0d8a8',2,2,W-4,1);R(x,'#b08a5a',2,H-3,W-4,1);
  const qx=(W>>1)-3,qy=(H>>1)-5;
  map(x,[".kkkk.","kwwwwk","kwkkwk","kkkwwk","..kwk.","..kwk.","..kkk.","..kwk.","..kkk."],{k:OL,w:'#ffffff'},qx,qy);
  return c;
}

const ITEMS={
  'furniture.desk_small':{w:2,h:1,rots:[0,90],f:deskSmall},
  'furniture.wood_chair':{w:1,h:1,rots:[0,90,180,270],f:woodChair,variants:['natural','white'],flipRot:90},
  'furniture.repaired_shelf':{w:2,h:1,rots:[0,90,180,270],f:repairedShelf,flipRot:90},
  'furniture.bookshelf':{w:2,h:1,rots:[0,90,180,270],f:bookshelf,flipRot:90},
  'furniture.futon':{w:2,h:3,rots:[0,90],f:futon},
  'furniture.cushion':{w:1,h:1,rots:[0],f:cushion},
  'furniture.low_table':{w:2,h:2,rots:[0,90],f:lowTable},
  'light.desk_lamp':{w:1,h:1,rots:[0],f:deskLamp,light:{rgb:'255,196,110',cx:8,cy:-10,r:28}},
  'light.shell_lantern':{w:1,h:1,rots:[0],f:shellLantern,light:{rgb:'120,236,214',cx:8,cy:-6,r:26}},
  'memento.child_drawing':{w:1,h:1,rots:[0],f:childDrawing,wall:true},
  'memento.bear':{w:1,h:1,rots:[0],f:bear},
  'memento.flower_tag':{w:1,h:1,rots:[0],f:flowerTag},
  'garden.pot':{w:1,h:1,rots:[0],f:pot,variants:['default','red','blue','yellow'],anim:true},
  'garden.flowerbed':{w:2,h:1,rots:[0,90],f:flowerbed,anim:true},
  'garden.bench':{w:2,h:1,rots:[0,90,180,270],f:bench,flipRot:90},
  'garden.fence':{w:1,h:1,rots:[0,90],f:fence},
  'garden.stepping_stone':{w:1,h:1,rots:[0],f:steppingStone},
  'garden.small_tree':{w:1,h:1,rots:[0],f:smallTree,anim:true,seasonal:true},
  'deco.rug':{w:3,h:2,rots:[0,90],f:rug},
  'deco.sea_glass':{w:1,h:1,rots:[0],f:seaGlass,anim:true},
  // フェーズ2
  'furniture.toy_box':{w:1,h:1,rots:[0],f:toyBox},
  'furniture.kid_desk':{w:1,h:1,rots:[0,90,180,270],f:kidDesk,flipRot:90},
  'furniture.old_radio':{w:1,h:1,rots:[0],f:oldRadio},
  'memento.toolbox':{w:1,h:1,rots:[0],f:toolbox},
  'memento.recital_photo':{w:1,h:1,rots:[0],f:recitalPhoto,wall:true},
  'deco.wind_chime':{w:1,h:1,rots:[0],f:windChime,wall:true,anim:true},
  'deco.sea_mobile':{w:1,h:1,rots:[0],f:seaMobile,wall:true,anim:true},
  'garden.nameplate':{w:1,h:1,rots:[0],f:nameplate},
  'garden.clothesline':{w:3,h:1,rots:[0,90],f:clothesline,anim:true},
  'light.string_lights':{w:2,h:1,rots:[0,90],f:stringLights,light:{rgb:'255,214,140',r:8,a:0.5,spots:rot=>stringBulbs(rot).map(b=>({cx:b.x,cy:b.y+2}))}},
  'garden.planter':{w:2,h:1,rots:[0,90],f:planterArt,anim:true,plantable:true},
  'garden.watering_can':{w:1,h:1,rots:[0],f:wateringCan}
};
ITEMS['garden.pot'].plantable=true;

function normRot(def,r){
  r=((Math.round((+r||0)/90)*90)%360+360)%360;
  if(def.rots.indexOf(r)>=0)return r;
  if(r===180&&def.rots.indexOf(0)>=0)return 0;
  if(r===270&&def.rots.indexOf(90)>=0)return 90;
  return def.rots[0];
}
function itemArt(id,rot,variant,plant,lit,frame,season,snow){
  const def=ITEMS[id];
  const pk=plant?((plant.stage|0)+':'+(plant.color||'')+':'+(plant.species||'seed')+(plant.bloom===false?':nb':'')):'';
  if(!def.seasonal){season='';snow=false;}
  const key='i|'+id+'|'+rot+'|'+variant+'|'+pk+'|'+(lit?1:0)+'|'+frame+(season?'|'+season+(snow?'s':''):'');
  let c=cache.get(key);if(c)return c;
  const sw=(rot===90||rot===270);
  const fw=sw?def.h:def.w,fh=sw?def.w:def.h,W=fw*U,H=fh*U;
  c=mk(W+PAD*2,H+PAD+TOP);const x=c.getContext('2d');
  if(def.flipRot&&rot===90){
    // 左向き(90)は右向き(270)を左右反転。影は光源（左上）に合わせて右下へずらし直す
    const a=mk(c.width,c.height),ax=a.getContext('2d'),sh=mk(c.width,c.height),sx=sh.getContext('2d');
    ax.translate(PAD,TOP);sx.translate(PAD,TOP);
    SHX=sx;try{def.f(ax,{W,H,rot:270,variant,plant,lit,frame,season,snow});}finally{SHX=null;}
    x.drawImage(flipC(sh),2,0);x.drawImage(flipC(a),0,0);
  }else{
    x.save();x.translate(PAD,TOP);def.f(x,{W,H,rot,variant,plant,lit,frame,season,snow});x.restore();
  }
  cache.set(key,c);return c;
}

function drawItem(ctx,itemId,o){
  o=o||{};
  try{
    const s=scaleOf(o.T),px=o.px||0,py=o.py||0;
    const def=ITEMS[itemId];
    ctx.save();
    if(o.ghost)ctx.globalAlpha*=0.55;
    if(!def){
      const k='q|1|1';let q=cache.get(k);if(!q){q=qbox(1,1);cache.set(k,q);}
      blit(ctx,q,px,py,s);ctx.restore();return;
    }
    const rot=normRot(def,o.rotation);
    let variant=o.variant||'default';
    if(def.variants&&def.variants.indexOf(variant)<0)variant=def.variants[0];
    if(!def.variants)variant='default';
    const t=typeof o.t==='number'?(o.t>1e5?o.t/1000:o.t):0;
    const frame=def.anim&&o.t!=null?(Math.floor(t*1.4)%2):0;
    const plant=def.plantable&&o.plant?o.plant:null;
    const lit=!!(def.light&&o.lit);
    // §6 生成画像の受け口：manifest の file が読み込めていれば、それを優先（植物の入った鉢・点灯中の灯りはコード描画の差分が要るので除く）
    const fr=(def.anim&&frame)?['_f1','']:[''];
    const rk=[];fr.forEach(f=>{rk.push(`r${rot}_${variant}${lit?'_lit':''}${f}`,`r${rot}_${variant}${f}`,`r${rot}${lit?'_lit':''}${f}`,`r${rot}${f}`);});rk.push(lit?'lit':'default','default');
    if(!plant&&drawRaster(ctx,itemId,rk,px,py,o.T,1,1,false)){
      if(!lit){ctx.restore();return;}
    }else{
      const img=itemArt(itemId,rot,variant,plant,lit,frame,o.season,!!o.snow);
      blit(ctx,img,px-PAD*s,py-TOP*s,s);
    }
    if(lit){
      const L=def.light,g=glowCanvas(L.rgb,L.r);
      let a=L.a||0.9;
      if(o.t!=null)a*=itemId==='light.shell_lantern'?(0.82+0.18*Math.sin(t*2.1)):(0.9+0.06*Math.sin(t*7.3)+0.04*Math.sin(t*13.1));
      ctx.globalAlpha*=a;
      const op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='lighter';
      const spots=L.spots?L.spots(rot):[{cx:L.cx,cy:L.cy}];
      spots.forEach(p=>blit(ctx,g,px+(p.cx-L.r)*s,py+(p.cy-L.r)*s,s));
      ctx.globalCompositeOperation=op;
    }
    ctx.restore();
  }catch(e){try{ctx.restore();}catch(_){}}
}

// ───────── キャラクター ─────────
const DAN_PAL={k:OL,h:'#5a3590',H:'#8c5fcc',d:'#3a2066',s:'#f6d6c2',S:'#d9a994',b:'#f2a2ac',g:'#2a1c36',e:'#8a5ad0',E:'#2c1648',w:'#ffffff',
  p:'#e07fb0',P:'#a54a80',c:'#c6b2ee',C:'#9682ca',t:'#f19ac0',T:'#c7709a',n:'#5a3f80',N:'#3d2a5c',o:'#2a2036',m:'#b4506e'};
const KID_PAL={k:OL,h:'#35224e',H:'#6a54a4',d:'#24163a',s:'#ffe9de',S:'#f4c8b4',b:'#f59aae',r:'#d0607a',E:'#3a2048',e:'#8a52d0',w:'#ffffff',
  f:'#ffaad4',F:'#ffe066',m:'#9fe2c8',M:'#6cc4a4',y:'#ffe066'};

const DAN={
  headF:[
    ".....kkkkkk..kk.",
    "...kkhhhhhhkkppk",
    "..khhHHHhhhhhkPk",
    ".khHHhhhhhhhhhkk",
    ".khHhhhhhhhhhhhk",
    ".khhhhhhhhhhhhdk",
    ".khhshhhshhhshdk",
    ".khggggggggggdhk",
    ".khgEegssgEegdhk",
    ".khgwegssgwegdhk",
    ".khggggssggggdhk",
    ".khsbssssssbsdhk",
    "..khSsssmmsssdk.",
    "...kkkkkkkkkkdhk"],
  headB:[
    ".kk..kkkkkk.....",
    "kppkkhhhhhhkk...",
    "kPkhhhHHhhhhhk..",
    "kkhhhhhhHHhhhhk.",
    "khdhhhhhhhHhhhhk",
    "khdhhhhhhhhhhhhk",
    "khdhhhhhhhhhhhdk",
    "khddhhhhhhhhhhdk",
    "khddhhhhhhhhhddk",
    "khdddhhhhhhhdddk",
    "khddddhhhhhddddk",
    "khdddddddddddddk",
    "khdddddddddddk..",
    "dhkkkkkkkkkkk..."],
  headS:[
    ".....kkkkkk.kk..",
    "...kkhhhhhhkppk.",
    "..khhhHHHhhhkPk.",
    ".khhHHhhhhhhhkk.",
    ".khHhhhhhhhhhhk.",
    "khhhhhhhhhhhhhhk",
    "khhhhhhhhhshhshk",
    "khdhhhhhggggggsk",
    "khdhhhhhhsgEegsk",
    "khddhhhhhsgwegss",
    "khddhhhhhsggggsk",
    "khdddhhhhssbsssk",
    ".khdddhhhSssmsk.",
    "..kkkddkkkkkkk.."],
  bodyF:[
    ".....kksskk..dhk",
    "...kccttttcck.dk",
    "..kcccttttccckk.",
    "..kcCkttttkCck..",
    "..kcCkTttTkCck..",
    "..ksskNnnNksskk.",
    "...kkknnnnkkk..."],
  bodyB:[
    "dhk..kssssk.....",
    "dk.kcccccccck...",
    "..kcccccccccck..",
    "..kcCkccccckCck.",
    "..kcCkcccCckCck.",
    "..ksskNnnNkssk..",
    "...kkknnnnkkk..."],
  bodyS:[
    "......kssk......",
    ".....kcttck.....",
    "....kcccttk.....",
    "....kcCcttk.....",
    "....kcCcTtk.....",
    "....kcssNnk.....",
    ".....knnnnk....."],
  legsF:[
    [".....knnknnk....",".....knnknnk....",".....kookkook...",".....kkk..kkk..."],
    [".....knnknnk....",".....kooknnk....",".....kkkkkook...","..........kkk..."],
    [".....knnknnk....",".....knnknnk....",".....kookkook...",".....kkk..kkk..."],
    [".....knnknnk....",".....knnkkook...",".....kookkkkk...",".....kkk........"]],
  legsS:[
    [".....knnnk......",".....knnnk......",".....kooook.....",".....kkkkk......"],
    ["....knnknnk.....","...knnk.knnk....","..kook...kook...","..kkk....kkk...."],
    [".....knnnk......",".....knnnk......",".....kooook.....",".....kkkkk......"],
    ["....knnnnnk.....","....knnkknnk....","...kook..kook...","...kkk...kkk...."]],
  sitF:["..kknnnnnnnnkk..","..knNnnnnnnNnk..","...kook..kook...","...kkk....kkk..."],
  sitS:[".....knnnnnnnk..",".....kkkkkknnk..","..........kook..","..........kkkk.."],
  sitB:["...kknnnnnnkk...","...kkkkkkkkkk..."]
};
const KID={
  headF:[
    ".....kkkkkk.....",
    "...kkhhHHhhkk...",
    "..khhHHhhhhhhk..",
    ".khHHhhhhhhhhhk.",
    ".khHhhhhhhhhhhk.",
    ".khhhhhhhhhhhhk.",
    ".khsssssssssshk.",
    ".khsEEssssEEshk.",
    ".khswessssweshk.",
    ".khbeesssseebhk.",
    "..khsssrrssshk..",
    "...kkkkkkkkkk..."],
  headB:[
    ".....kkkkkk.....",
    "...kkhhHHhhkk...",
    "..khhhhhHHhhhk..",
    ".khhhhhhhhHhhhk.",
    ".khhhhhhhhhhhhk.",
    ".khhhhhhhhhhhhk.",
    ".khdhhhhhhhhdhk.",
    ".khddhhhhhhddhk.",
    ".khdddhhhhdddhk.",
    ".khddddddddddhk.",
    "..khddddddddhk..",
    "...kkkkkkkkkk..."],
  headS:[
    ".....kkkkkk.....",
    "...kkhhHHhhkk...",
    "..khhhHHhhhhhk..",
    ".khhHHhhhhhhhhk.",
    ".khHhhhhhhhhhhk.",
    ".khhhhhhhhhhhhhk",
    ".khhhhhhhsssssk.",
    ".khhhhhhhssEEsk.",
    ".khdhhhhhsswesk.",
    ".khddhhhhseebsk.",
    "..khddhhhsssrsk.",
    "...kkkkkkkkkkk.."],
  bodyF:[
    "....kmmmmmmk....",
    "...kmmmmmymmk...",
    "...kMkmymmkMk...",
    "...kskmmmmksk...",
    "....kmmmmmmk...."],
  bodyB:[
    "....kmmmmmmk....",
    "...kmmymmmmmk...",
    "...kMkmmmmkMk...",
    "...kskmmymksk...",
    "....kmmmmmmk...."],
  bodyS:[
    ".....kmmmmk.....",
    "....kmmmmmyk....",
    "....kmMmmmmk....",
    "....kmsMmmmk....",
    ".....kmmmmk....."],
  legsF:[
    ["....kmmkkmmk....","....ksskkssk....","....kkkkkkkk...."],
    ["....ksskkmmk....","....kkkkkssk....","........kkkk...."],
    ["....kmmkkmmk....","....ksskkssk....","....kkkkkkkk...."],
    ["....kmmkkssk....","....ksskkkkk....","....kkkk........"]],
  legsS:[
    [".....kmmmk......",".....kssssk.....",".....kkkkkk....."],
    ["....kmmkmmk.....","...kssk.kssk....","...kkk...kkk...."],
    [".....kmmmk......",".....kssssk.....",".....kkkkkk....."],
    ["....kmmmmmk.....","....kssksssk....","....kkk.kkkk...."]],
  sitF:["...kmmmmmmmmk...","...ksskmmkssk...","...kkkk..kkkk..."],
  sitS:[".....kmmmmmmssk.",".....kkkkkkkkkk."],
  sitB:["....kmmmmmmk....","....kkkkkkkk...."]
};
// 娘のふたつ結び（花つき）：頭の左右に重ねる
const TAIL_L=["kfk.","fFfk","kfkh","khhk",".kk."];
const TAIL_R=[".kfk","kfFf","hkfk","khhk",".kk."];
// ── 訪問者：千代さん（お隣）・班長 ──
// 千代さん：銀髪のお団子・かんざし・金縁メガネ・えんじのカーディガン・長いスカート。腰が少し曲がる（横向きで頭が前へ）
const CHIYO_PAL={k:OL,h:'#dcd8e6',H:'#ffffff',d:'#a7a0b6',s:'#f8dcc8',S:'#e6b49a',g:'#c9a24a',E:'#3a2430',b:'#f2a2ac',m:'#b06a6a',
  c:'#8e5a84',C:'#5e3658',w:'#fff8ea',y:'#e9d38a',n:'#6a5a72',N:'#4a3e52',o:'#3a2a30'};
const CHIYO={
  headF:[
    "......kkkk......",
    ".....kHhhhk.....",
    ".....khhhdk.....",
    "...kkkkkkkkkk...",
    "..khHHhhhhhhhk..",
    ".khHhhhhhhhhhdk.",
    ".khhhhhhhhhhhdk.",
    ".khsssssssssshk.",
    ".khsssssssssshk.",
    ".kdgEgsggsgEgdk.",
    ".kdbssssssssbdk.",
    "..kssssmmssssk..",
    "...kkSssssSkk...",
    ".....kkkkkk....."],
  headB:[
    "......kkkk......",
    ".....kHhhhk.....",
    ".....khhhdk.....",
    "...kkkkkkkkkk...",
    "..khhhHHhhhhhk..",
    ".khhhhhhhHhhhdk.",
    ".khhhhhhhhhhhdk.",
    ".khhhhhhhhhhhdk.",
    ".khdhhhhhhhhddk.",
    ".khddhhhhhhdddk.",
    ".kdddddddddddk..",
    "..kddddddddddk..",
    "...kkssssssk....",
    ".....kkkkkk....."],
  headS:[
    "..kkkk..........",
    ".kHhhhk.........",
    ".khhhdk.........",
    "..kkkkkkkkk.....",
    ".khHHhhhhhhkk...",
    "khHhhhhhhhhhhk..",
    "khhhhhhhhhhhhk..",
    "khdhhhhhhssssk..",
    "khdhhhhhssssk...",
    "khddhhhhgEgsss..",
    ".khdhhhhssssbk..",
    ".kkddhhhssssmk..",
    "...kkkkkSsssk...",
    "........kkkk...."],
  bodyF:[
    ".....kkwwkk.....",
    "...kkccwwcckk...",
    "..kcCccwwccCck..",
    "..kcCcyckcccCk..",
    "..kcCcccccccCk..",
    "..ksskcccccksk..",
    "...kknnnnnnkk..."],
  bodyB:[
    ".....kkkkkk.....",
    "...kkcccccckk...",
    "..kcCcccccccCk..",
    "..kcCcccccccCk..",
    "..kcCCcccccCCk..",
    "..ksskccccckssk.",
    "...kknnnnnnkk..."],
  bodyS:[
    ".....kkk........",
    "...kkcccwk......",
    "..kccccccwk.....",
    "..kcCCcccck.....",
    "..kcCcccssk.....",
    "...kcccccsk.....",
    "....knnnnk......"],
  legsF:[
    ["...knnnnnnnnk...","...knNnnnnNnk...","....kookkook....","....kkk..kkk...."],
    ["...knnnnnnnnk...","...knNnnnnNnk...","....kookkkkkk...","....kkk........."],
    ["...knnnnnnnnk...","...knNnnnnNnk...","....kookkook....","....kkk..kkk...."],
    ["...knnnnnnnnk...","...knNnnnnNnk...","....kkkkkook....",".........kkk...."]],
  legsS:[
    ["...knnnnnk......","...knNnnnk......","....kooook......","....kkkkk......."],
    ["..knnnnnnk......","..knNnnnnnk.....","..kook.kook.....","..kkk..kkk......"],
    ["...knnnnnk......","...knNnnnk......","....kooook......","....kkkkk......."],
    ["...knnnnnnk.....","...knNnnnnk.....","...kook.kook....","...kkk..kkk....."]],
  sitF:["..kknnnnnnnnkk..","..knNnnnnnnNnk..","...kook..kook...","...kkk....kkk..."],
  sitS:["...knnnnnnnnk...","...kkkkkknnnk...","..........kook..","..........kkkk.."],
  sitB:["...kknnnnnnkk...","...kkkkkkkkkk..."],
  headSdx:1   // 横向きは頭が少し前に出る（腰が少し曲がる）
};
// 班長：黄色いヘルメット・紺の作業着・白い襟・緑の名札
const HANCHO_PAL={k:OL,y:'#ffe680',Y:'#f5c22a',O:'#c98f0e',a:'#6a6560',s:'#f3c9a4',S:'#d9a17c',b:'#3a3430',E:'#1a0f24',m:'#8a4a3a',
  u:'#4b5b78',U:'#2b3550',w:'#eef0ea',G:'#2f9a52',n:'#3a4866',N:'#24304a',o:'#3a3430',l:'#5a4a3a'};
const HANCHO={
  headF:[
    ".....kkkkkk.....",
    "...kkyyyYYYkk...",
    "..kyyYYYYYYYOk..",
    ".kyYYYYyYYYYYOk.",
    ".kyYYYYYYYYYYOk.",
    "kOOOOOOOOOOOOOOk",
    ".kkkkkkkkkkkkkk.",
    ".kaSssssssssSak.",
    ".kabbbssssbbbak.",
    ".kasEEssssEEsak.",
    ".kassssSSssssak.",
    "..kssssmmmmssk..",
    "..kSSssssssSSk..",
    "...kkkkkkkkkk..."],
  headB:[
    ".....kkkkkk.....",
    "...kkyyyYYYkk...",
    "..kyyYYYYYYYOk..",
    ".kyYYYYYYYYYYOk.",
    ".kyYYYYYYYYYYOk.",
    "kOOOOOOOOOOOOOOk",
    ".kkkkkkkkkkkkkk.",
    ".kaaaaaaaaaaaak.",
    ".kaaaaaaaaaaaak.",
    ".kaaaaaaaaaaaak.",
    ".kSaaaaaaaaaaSk.",
    "..kSSSSSSSSSSk..",
    "..kSSSSSSSSSSk..",
    "...kkkkkkkkkk..."],
  headS:[
    ".....kkkkkk.....",
    "...kkyyyYYYkk...",
    "..kyyYYYYYYYOk..",
    ".kyYYYYYYYYYYOk.",
    ".kyYYYYYYYYYYOk.",
    ".kOOOOOOOOOOOOOk",
    "..kkkkkkkkkkkkkk",
    "..kaaaaaasssssk.",
    "..kaaaaasbbbbsk.",
    "..kaaaaassEEssk.",
    "..kaaSaasssssSsk",
    "..kSaSSssssmmsk.",
    "...kSSSSsssSSk..",
    "....kkkkkkkkk..."],
  bodyF:[
    ".....kkSSkk.....",
    "...kkuwwwwukk...",
    "..kuuuuwwuuuuk..",
    ".kuUukGwkuuuUuk.",
    ".kuUuuuuuuuuUuk.",
    ".kssuuuuuuuussk.",
    "..kkUUUUUUUUkk.."],
  bodyB:[
    ".....kkSSkk.....",
    "...kkuuuuuukk...",
    "..kuuuuuuuuuuk..",
    ".kuUuuuuuuuuUuk.",
    ".kuUuuuUUuuuUuk.",
    ".kssuuuuuuuussk.",
    "..kkUUUUUUUUkk.."],
  bodyS:[
    "......kSSk......",
    ".....kuuwwk.....",
    "....kuuuuuk.....",
    "....kuUuuuk.....",
    "....kuUuGuk.....",
    "....kussuUk.....",
    ".....kUUUUk....."],
  legsF:DAN.legsF.map(f=>f.map(r=>r.replace(/o/g,'o'))),
  legsS:DAN.legsS,
  sitF:DAN.sitF,
  sitS:DAN.sitS,
  sitB:DAN.sitB
};
const CHARS={dan:{D:DAN,pal:DAN_PAL},kid:{D:KID,pal:KID_PAL},chiyo:{D:CHIYO,pal:CHIYO_PAL},hancho:{D:HANCHO,pal:HANCHO_PAL}};
const SEATED={sit:1,read:1,work:1,hold:1};
// 千代さんのかんざし（赤い軸・赤い玉・金の飾り）
function kanzashi(x,dir){
  const st='#b44a3a',ball='#e86a5a',gold='#e8c060';
  const line=(x0,y0,x1,y1)=>{const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let i=0;i<=n;i++)R(x,st,Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),1,1);};
  if(dir==='right'){line(0,3,6,0);R(x,OL,6,-1,3,3);R(x,ball,7,0,1,1);R(x,gold,8,2,1,2);return;}
  if(dir==='up'){line(4,0,12,3);R(x,OL,2,-1,3,3);R(x,ball,3,0,1,1);R(x,gold,2,2,1,2);return;}
  line(4,3,11,0);R(x,OL,11,-1,3,3);R(x,ball,12,0,1,1);R(x,gold,13,2,1,2);
}
// 娘：絵本を読む（座って本をひらく）
function bookOverlay(x,dir,by,frame){
  if(dir==='up'){R(x,OL,2,by+2,2,3);R(x,C.pk2,2,by+3,1,1);R(x,OL,12,by+2,2,3);R(x,C.pk2,13,by+3,1,1);return;}
  if(dir==='right'){R(x,OL,10,by,5,5);R(x,C.cr1,11,by+1,3,3);R(x,C.pk2,14,by+1,1,3);R(x,C.cr3,11,by+2+(frame?1:0),3,1);R(x,'#ffe9de',10,by+3,1,1);return;}
  // 正面：ひらいた絵本（表紙ピンク・ページに絵）
  R(x,OL,2,by+1,12,6);R(x,C.pk3,3,by+2,10,4);
  R(x,C.cr1,3,by+2,4,3);R(x,C.cr1,9,by+2,4,3);R(x,C.cr3,7,by+2,2,3);R(x,OL,7,by+2,1,4);
  R(x,'#7fcf6e',4,by+4,2,1);R(x,'#ffc83a',10,by+3,1,1);R(x,'#6f93e8',11,by+4,1,1);
  if(frame){R(x,C.cr2,9,by+1,3,1);}
  R(x,'#ffe9de',2,by+4,1,1);R(x,'#ffe9de',13,by+4,1,1);
}
// だんのうら：机で作業（ペンを動かす）
function workOverlay(x,dir,by,frame){
  const sl='#c6b2ee',hand='#f6d6c2';
  if(dir==='up'){R(x,OL,1+(frame?0:1),by+1,3,4);R(x,sl,2+(frame?0:1),by+2,1,2);R(x,OL,12,by+1-(frame?1:0),3,4);R(x,sl,13,by+2-(frame?1:0),1,2);return;}
  if(dir==='right'){R(x,OL,9,by+2,5,3);R(x,sl,10,by+3,2,1);R(x,hand,12,by+3,1,1);R(x,OL,13+(frame?1:0),by+1,1,3);R(x,C.yel,13+(frame?1:0),by+2,1,1);return;}
  R(x,OL,9+(frame?1:0),by+3,4,3);R(x,hand,10+(frame?1:0),by+4,2,1);R(x,C.yel,12+(frame?1:0),by+2,1,2);
}
// だんのうら：眠った娘を抱いて座る（布団が無い夜の代わり）
function holdOverlay(x,dir,by,frame){
  if(dir!=='down'){R(x,OL,3,by+1,10,5);R(x,C.bl2,4,by+2,8,3);R(x,C.bl1,4,by+2,8,1);R(x,'#35224e',4,by,4,2);return;}
  // 毛布にくるまった娘
  R(x,OL,4,by+2,10,6);R(x,C.bl2,5,by+3,8,4);R(x,C.bl1,5,by+3,8,1);R(x,C.bl3,5,by+6,8,1);R(x,'#f4dc7a',9,by+4,1,1);R(x,'#f4dc7a',11,by+5,1,1);
  // 頭（肩にもたれる）
  R(x,OL,2,by-1,7,6);R(x,'#35224e',3,by,5,4);R(x,'#6a54a4',4,by,2,1);
  R(x,'#ffe9de',4,by+2,4,2);R(x,'#3a2048',4,by+2,1,1);R(x,'#3a2048',6,by+2,1,1);R(x,'#f59aae',7,by+3,1,1);
  R(x,'#ffaad4',2,by+1,1,1);
  // 抱く腕
  R(x,OL,3,by+5,12,1);R(x,'#c6b2ee',4,by+5,10,1);R(x,'#f6d6c2',12,by+5,2,1);
}
// 娘：布団で寝る（布団の足元範囲の左上が原点。縦＝rot0、横＝rot90）
function sleepArt(dir,frame){
  const c=mk(32,48),x=c.getContext('2d');
  const head=KID.headF.slice();
  head[7]=".khsssssssssshk.";head[8]=".khsEEssssEEshk.";head[9]=".khbsssssssbshk.";
  // 枕の上の頭
  map(x,TAIL_L,KID_PAL,8,6);map(x,TAIL_R,KID_PAL,20,6);
  map(x,head,KID_PAL,8,1);
  // 掛け布団のふくらみ（肩まで）
  // 枕元の襟（ミントのパジャマ）と、体の形にふくらんだ布団（外周線は付けず、色の段差で）
  R(x,'#9fe2c8',11,12,10,2);R(x,'#6cc4a4',11,13,10,1);
  R(x,C.cr2,9,13,14,1);R(x,C.bl1,9,14,14,2);
  R(x,C.bl1,9,16,2,12);R(x,C.bl3,21,16,2,13);R(x,C.bl4,23,17,1,11);R(x,C.bl3,10,28,12,2);R(x,C.bl4,11,30,10,1);
  // 布団から出た手
  R(x,OL,10,15,5,4);R(x,'#9fe2c8',11,16,2,2);R(x,'#ffe9de',13,16,1,2);
  for(const [X,Y] of [[17,20],[12,25],[19,27]]){R(x,'#f4dc7a',X,Y,1,1);R(x,'#f4dc7a',X-1,Y+1,3,1);R(x,'#f4dc7a',X,Y+2,1,1);}
  const zz=(t,zx,zy)=>{const zc='#e4dcff',zs='rgba(27,18,38,0.45)';R(t,zs,zx+1,zy+1,3,1);R(t,zs,zx+1,zy+4,3,1);R(t,zc,zx,zy,3,1);R(t,zc,zx+1,zy+1,1,1);R(t,zc,zx,zy+2,1,1);R(t,zc,zx,zy+3,3,1);};
  if(dir==='down'||dir==='up'){zz(x,frame?26:25,frame?0:2);return c;}
  // 横（rot90：頭が右）：時計回りに90°回す
  const r=mk(48,32),rx=r.getContext('2d');
  rx.save();rx.translate(48,-2);rx.rotate(Math.PI/2);rx.drawImage(c,0,0);rx.restore();
  zz(rx,frame?33:32,frame?0:2);
  return r;
}

function charArt(who,dir,frame,pose){
  const key='c|'+who+'|'+dir+'|'+frame+'|'+pose;
  let c=cache.get(key);if(c)return c;
  if(pose==='sleep'){c=sleepArt(dir,frame);cache.set(key,c);return c;}
  const ch=CHARS[who]||CHARS.dan,D=ch.D,pal=ch.pal;
  const side=(dir==='left'||dir==='right');
  const back=dir==='up';
  const head=side?D.headS:back?D.headB:D.headF;
  let body=side?D.bodyS:back?D.bodyB:D.bodyF;
  let legs;
  const seated=!!SEATED[pose];
  if(seated){legs=side?D.sitS:back?D.sitB:D.sitF;}
  else{const f=pose==='walk'?((frame|0)%4+4)%4:0;legs=(side?D.legsS:D.legsF)[f];}
  if(seated&&!side)body=body.slice(0,body.length-1);
  const hh=head.length,bh=body.length,lh=legs.length;
  const H=hh-1+bh+lh+1;
  c=mk(U,H+1);const x=c.getContext('2d');
  // 足元の影
  shE(x,8.5,H-1,5,1.2);
  const by=hh-1;
  const hop=(pose==='walk'&&(frame%2===1)&&!side)?0:0;
  map(x,legs,pal,0,by+bh);
  map(x,body,pal,0,by+hop);
  const hdx=side?(D.headSdx|0):0;
  map(x,head,pal,hdx,hop);
  if(who==='kid'){
    if(side){map(x,TAIL_L,pal,0,5+hop);}
    else{map(x,TAIL_L,pal,0,5+hop);map(x,TAIL_R,pal,12,5+hop);}
    if(pose==='read')bookOverlay(x,dir==='left'?'right':dir,by,frame&1);
  }
  if(who==='chiyo'){x.save();x.translate(hdx,0);kanzashi(x,dir==='left'?'right':dir);x.restore();}
  if(who==='dan'&&pose==='work')workOverlay(x,dir==='left'?'right':dir,by,frame&1);
  if(who==='dan'&&pose==='hold')holdOverlay(x,dir==='left'?'right':dir,by,frame&1);
  if(dir==='left')c=flipC(c);
  cache.set(key,c);return c;
}
function drawChar(ctx,who,dir,frame,px,py,T,pose){
  try{
    const s=scaleOf(T);
    if(RASTER.size&&RASTER.has('char.'+who)){
      const d0=(dir==='up'||dir==='left'||dir==='right')?dir:'down',p0=pose||'stand',f0=frame|0;
      if(drawRaster(ctx,'char.'+who,[`${d0}_${p0}_${f0}`,`${d0}_${p0}_${f0&1}`,`${d0}_${p0}`,`${d0}_${p0==='walk'?'stand':p0}`,d0,'default'],px,py,T,1,1,false,true))return;
    }
    if(who==='cat'){
      dir=(dir==='up'||dir==='left'||dir==='right')?dir:'down';
      pose=(pose==='walk'||pose==='sit'||pose==='sleep')?pose:'stand';
      const key='cat|'+dir+'|'+(frame&1)+'|'+pose;let img=cache.get(key);if(!img){img=catArt(dir,frame|0,pose);cache.set(key,img);}
      blit(ctx,img,px,py+(U-img.height)*s,s);return;
    }
    who=CHARS[who]?who:'dan';
    dir=(dir==='up'||dir==='left'||dir==='right')?dir:'down';
    pose=(pose==='walk'||SEATED[pose]||pose==='sleep')?pose:'stand';
    if(pose==='sleep'&&who!=='kid')pose='sit';
    if(pose==='read'&&who!=='kid')pose='sit';
    if((pose==='work'||pose==='hold')&&who!=='dan')pose='sit';
    const img=charArt(who,dir,frame|0,pose);
    // 寝ている娘は布団の足元範囲の左上 (px,py) にそのまま重ねる
    if(pose==='sleep'){blit(ctx,img,px,py,s);return;}
    const lift=SEATED[pose]?2:0;
    blit(ctx,img,px+((U-img.width)/2)*s,py+(U-img.height-lift)*s,s);
  }catch(e){}
}


// ── 家のねこ（三毛猫：白地に茶と黒のぶち。目は黄緑、耳の内側はピンク＝ステルスのねこと同じ） ──
const CAT_C={w:'#fbf6ee',W:'#ddd2c4',o:'#f0a050',O:'#c87030',b:'#3a2a36',B:'#5a4a56',e:'#d8ec60',p:'#f5a0b0',n:'#e87a90'};
function catArt(dir,frame,pose){
  const t=mk(16,14),x=t.getContext('2d'),K=CAT_C;
  const f=frame&1;
  if(pose==='sleep'){
    // 丸くなって眠る（しっぽで体を包む）
    ell(x,8,9,6,3.6,K.w);ell(x,6,8,3,2,K.o);ell(x,10,7,2,1.4,K.b);
    ell(x,12,9,2.6,2.4,K.w);R(x,K.o,11,7,2,1);R(x,K.b,13,7,1,1);
    R(x,K.o,10,6,1,1);R(x,K.b,14,6,1,1);                  // 耳
    R(x,'#8a7a80',12,9,2,1);                              // 閉じた目
    for(let i=2;i<12;i++)R(x,i>9?K.b:K.O,i,12-(i<4?1:0),1,1);  // しっぽ
    R(x,K.W,4,11,7,1);
    if(f)R(x,K.W,6,6,3,1);                                // 寝息でふくらむ
    const o=outlined(t);const c=mk(16,14),cx=c.getContext('2d');ell(cx,8,12,6,1.2,SH);cx.drawImage(o,0,0);return c;
  }
  const side=dir==='left'||dir==='right';
  if(side){
    if(pose==='sit'){
      ell(x,7,9,3.5,3.5,K.w);ell(x,6,8,2,2,K.o);R(x,K.W,8,11,3,1);
      R(x,K.w,8,10,1,3);R(x,K.w,10,10,1,3);                // 前足
      for(let i=1;i<7;i++)R(x,i<3?K.b:K.o,i,12,1,1);R(x,K.b,1,11,1,1);   // しっぽ
      ell(x,9,4,3,2.6,K.w);R(x,K.o,7,3,2,2);R(x,K.b,10,2,1,1);
      R(x,K.o,7,1,1,2);R(x,K.b,11,1,1,2);R(x,K.p,7,2,1,1);
      R(x,K.e,10,4,1,1);R(x,K.n,12,5,1,1);
    }else{
      const lg=pose==='walk'?(f?1:-1):0;
      ell(x,7,8,5,2.6,K.w);ell(x,5,7,2.2,1.6,K.o);ell(x,9,7,1.6,1,K.b);R(x,K.W,4,10,7,1);
      R(x,K.w,3+lg,10,1,3);R(x,K.w,5-lg,10,1,3);R(x,K.w,9+lg,10,1,3);R(x,K.w,11-lg,10,1,3);
      // しっぽ（ゆらゆら）
      R(x,K.o,2,7,1,1);R(x,K.o,1,6,1,1);R(x,K.O,1,5,1,1);R(x,K.b,1+(f?1:0),4,1,1);R(x,K.b,1+(f?1:0),3,1,1);
      ell(x,12,5,2.6,2.4,K.w);R(x,K.o,10,4,2,2);R(x,K.b,13,3,1,1);
      R(x,K.o,10,2,1,2);R(x,K.b,13,2,1,2);R(x,K.p,10,3,1,1);
      R(x,K.e,13,5,1,1);R(x,K.n,15,6,1,1);
    }
  }else if(dir==='up'){
    ell(x,8,9,4,3,K.w);ell(x,6,8,2,2,K.o);ell(x,10,10,1.6,1.2,K.b);
    if(pose!=='sit'){const lg=pose==='walk'?(f?1:0):0;R(x,K.w,5,11+lg,1,2-lg);R(x,K.w,10,11+(1-lg),1,1+lg);}
    for(let j=4;j<9;j++)R(x,j<6?K.b:K.o,12+(j<6&&f?1:0),j,1,1);   // 立てたしっぽ
    ell(x,8,4,3.4,2.6,K.w);R(x,K.o,5,3,3,2);R(x,K.b,10,3,1,2);
    R(x,K.o,5,1,1,2);R(x,K.b,11,1,1,2);
  }else{
    ell(x,8,9,3.6,3,K.w);R(x,K.W,6,11,5,1);ell(x,10,9,1.4,1.4,K.o);
    if(pose==='sit'){R(x,K.w,6,10,1,3);R(x,K.w,9,10,1,3);for(let i=10;i<14;i++)R(x,i>12?K.b:K.o,i,12,1,1);}
    else{const lg=pose==='walk'?(f?1:0):0;R(x,K.w,6,10+lg,1,3-lg);R(x,K.w,9,11-lg,1,2+lg);R(x,K.o,12,7,1,4);R(x,K.b,13,6,1,2);}
    ell(x,8,5,3.6,2.8,K.w);R(x,K.o,5,3,3,2);R(x,K.b,10,3,2,1);
    R(x,K.o,5,1,1,2);R(x,K.b,11,1,1,2);R(x,K.p,5,2,1,1);R(x,K.p,11,2,1,1);
    R(x,K.e,6,5,1,1);R(x,K.e,10,5,1,1);R(x,OL,6,5,1,1);R(x,OL,10,5,1,1);R(x,K.e,6,4,1,1);R(x,K.e,10,4,1,1);
    R(x,K.n,8,6,1,1);
  }
  const o=outlined(t);
  const c=mk(16,14),cx=c.getContext('2d');ell(cx,8,13,5,1,SH);cx.drawImage(o,0,0);
  return dir==='left'?flipC(c):c;
}
// ───────── アイコン ─────────
function contentBox(c){
  const w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(d[(j*w+i)*4+3]>60){if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j;}
  if(x1<0)return{x:0,y:0,w:w,h:h};return{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
}
// 種の袋（アイコン用・16×16）：袋の絵で種類がわかる＋名前も別に表示する
function seedPacket(species){
  const c=mk(16,16),x=c.getContext('2d');
  const bg={morning_glory:'#dcd4f4',sunflower:'#fff0c0',herb:'#d8f0d0'}[species]||C.cr2;
  R(x,SH2,3,3,13,13);
  O(x,2,1,12,14,bg);R(x,'#ffffff',3,2,10,1);R(x,C.cr3,3,13,10,1);
  // 折り返し
  R(x,OL,2,4,12,1);R(x,C.cr1,3,2,10,2);
  // 袋の絵
  if(species==='morning_glory'){R(x,OL,5,6,6,6);R(x,OL,4,7,8,4);R(x,'#6f93e8',5,7,6,4);R(x,'#6f93e8',6,6+1,4,5-1);R(x,'#ffffff',7,8,2,2);R(x,'#bcd4ff',5,7,2,1);R(x,C.g3,11,11,2,2);}
  else if(species==='sunflower'){R(x,OL,4,5,8,8);R(x,'#ffd84a',5,6,6,6);R(x,'#7a4a28',6,7,4,4);R(x,'#5a321a',7,8,2,2);R(x,'#fff4b0',5,6,2,1);}
  else{R(x,OL,4,6,8,7);R(x,C.g3,5,7,6,5);R(x,C.g2,5,7,3,2);R(x,C.g1,6,7,1,1);R(x,C.g4,8,10,3,2);R(x,'#ffffff',9,7,1,1);}
  // 種つぶ
  R(x,'#5a3a2a',3,14,1,1);R(x,'#5a3a2a',12,14,1,1);
  return c;
}
// 素材のアイコン（16×16・外周線つき）：main/icons.js の wood/cloth/metal/sea と同じ絵（パレットはスタイルガイド）
const MAT_PAL={o:'#f2cf98',O:'#d9a066',x:'#b97c45',X:'#8a5530',Z:'#5e3820',b:'#ffd98a',d:'#e08a34',p:'#ffd0e0',P:'#f59aae',q:'#d9708e',w:'#fffaf0',m:'#e4e8f0',M:'#a8b0c0',z:'#6e7488',v:'#c6b2ee',V:'#8c5fcc',u:'#5a3590',a:'#fff4cc',e:'#9ff0e0',E:'#4fc8bc',f:'#2a8f96'};
const MAT_ROWS={
  wood:[
    ".............",
    "..oo.........",
    ".obbo.xxxxxx.",
    "obxdbxOOOOOOx",
    "obdZdxbOOOOOX",
    "obxdbxOOOOOOX",
    ".obbo.XXXXXX.",
    "..oo.........",
    "...bbbbbbbbb.",
    "..oOOOOOOOOOx",
    "..oOxOOOOxOOX",
    "...XXXXXXXXX."],
  cloth:[
    "..........m..",
    ".........mz..",
    ".ppppppppmp..",
    "pPPPPPPPmPPq.",
    "pPwPwPwmwPPq.",
    "pPPPPPmPPPPq.",
    "qqqqqzqqqqqq.",
    "vvvvvvvvvvvV.",
    "vVVVVVVVVVVu.",
    "vVaVaVaVaVVu.",
    "uuuuuuuuuuuu."],
  metal:[
    "....mmmmm....",
    "...mMMMMMz...",
    "..mMMmmmMMz..",
    ".mMMm...zMMz.",
    ".mMm.....zMz.",
    ".mMm.....zMz.",
    ".mMm.....zMz.",
    ".mMMz...zMMz.",
    "..zMMzzzMMz..",
    "...zMMMMMz...",
    "....zzzzz...."],
  sea:[
    "....ppppp....",
    "..ppPpPpPpp..",
    ".pPwPpPpPpPq.",
    ".pPpPpPpPpPq.",
    "pwPpPpPpPpPpq",
    "pPpPpPpPpPpPq",
    ".qPpPpPpPpPq.",
    "..qPpPpPpPq..",
    "...qqPpPqq..e",
    "....pqqqp..eE",
    "....qq.qq.eEf",
    "..........ff."],
};
function materialArt(id){
  const R0=MAT_ROWS[id];if(!R0)return null;
  const a=mk(16,16),ax=a.getContext('2d');
  const w=Math.max(...R0.map(r=>r.length)),h=R0.length;
  map(ax,R0,MAT_PAL,1+((14-w)>>1),1+((14-h)>>1));
  return outlined(a);
}
function icon(itemId,variant){
  const key='icon|'+itemId+'|'+(variant||'');
  let c=cache.get(key);if(c)return c;
  c=mk(48,48);const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  try{
    const def=ITEMS[itemId];
    let art;
    if(!def&&/^seed\./.test(itemId))art=seedPacket(itemId.slice(5));
    else if(!def&&/^mat\./.test(itemId))art=materialArt(itemId.slice(4))||qbox(1,1);
    else if(itemId==='char.cat')art=catArt('down',0,'sit');
    else if(!def)art=qbox(1,1);
    else{
      let v=variant||'default';if(def.variants&&def.variants.indexOf(v)<0)v=def.variants[0];if(!def.variants)v='default';
      art=itemArt(itemId,def.rots[0],v,itemId==='garden.pot'?{stage:1,color:'pink'}:null,itemId==='light.string_lights',0);
    }
    const b=contentBox(art);
    let k=Math.min(44/b.w,44/b.h);if(k>=2)k=Math.floor(k);
    const dw=Math.round(b.w*k),dh=Math.round(b.h*k);
    x.drawImage(art,b.x,b.y,b.w,b.h,Math.round((48-dw)/2),Math.round((48-dh)/2),dw,dh);
  }catch(e){}
  cache.set(key,c);return c;
}

const UIP={k:OL,a:C.am2,A:C.am4,w:C.cr1,W:C.cr3,n:C.w3,N:C.w4,m:'#9fe2c8',M:'#4fb49a',b:'#7ab8f0',B:'#4a7ac8',p:C.pk2,P:C.pk4,g:C.g2,G:C.g4,v:C.vi2,V:C.vi3,l:C.vi1,r:C.red,R:'#a83a4a',c:C.st2,C:C.st4,y:C.yel,s:'#ffffff'};
const UI={
  place:[
    "......kkkk......",
    "......kaak......",
    "......kaAk......",
    "......kaAk......",
    "...kkkkaAkkkk...",
    "....kaaaaaAk....",
    ".....kaaaAk.....",
    "......kaAk......",
    ".......kk.......",
    "..kkkkkkkkkkkk..",
    ".knnnnnnnnnnnnk.",
    ".knwnnnnnnnnwnk.",
    ".knnnnnnnnnnnnk.",
    ".kNNNNNNNNNNNNk.",
    "..kkkkkkkkkkkk..",
    "................"],
  store:[
    "......kkkk......",
    "......kmmk......",
    "....kkkmMkkk....",
    ".....kmmmMk.....",
    "......kmMk......",
    "..kkkkkkkkkkkk..",
    ".knnnnnkknnnnnk.",
    ".kwwwwwwwwwwwwk.",
    ".kkkkkkkkkkkkkk.",
    "..knnnnnnnnnnk..",
    "..knnnkkkknnnk..",
    "..knnnkwwknnNk..",
    "..knnnkkkknnNk..",
    "..knnnnnnnnnNk..",
    "..kNNNNNNNNNNk..",
    "...kkkkkkkkkk..."],
  undo:[
    "................",
    "....kk..........",
    "...kbk..........",
    "..kbbkkkkkkk....",
    ".kbbbbbbbbbbkk..",
    "kbbbbbbbbbbbbBk.",
    ".kbbbkkkkkkkbBBk",
    "..kbbk.....kkBBk",
    "...kbk.......kBk",
    "....kk.......kBk",
    "............kBBk",
    "........kkkkBBk.",
    "........kbbbBk..",
    "........kkkkk...",
    "................",
    "................"],
  craft:[
    "................",
    "..kkkkkk........",
    ".kccccccck......",
    ".kcsccccCCk.....",
    ".kcccccCCCk.....",
    "..kkkkCCCk......",
    "......kCkk......",
    ".....kNnk.......",
    "....kNnk...k....",
    "...kNnk...kyk...",
    "..kNnk...kyyyk..",
    ".kNnk.....kyk...",
    ".kNk.......k....",
    "..k.............",
    "................",
    "................"],
  memories:[
    "................",
    "..kkkkkkkkkkk...",
    ".kpppppppppppk..",
    ".kPpppppppppppk.",
    ".kPpppkk.kkpppk.",
    ".kPppkrrkrrkppk.",
    ".kPppkrrrrrkppk.",
    ".kPpppkrrrkpppk.",
    ".kPppppkrkppppk.",
    ".kPpppppkpppppk.",
    ".kPppppppppppPk.",
    ".kPkkkkkkkkkkkk.",
    ".kPwwwwwwwwwwwk.",
    ".kkWWWWWWWWWWWk.",
    "..kkkkkkkkkkkkk.",
    "................"],
  close:[
    "................",
    "..kkk......kkk..",
    ".kwwwk....kwwwk.",
    ".kwwwwk..kwwwWk.",
    "..kwwwwkkwwwWk..",
    "...kwwwwwwwWk...",
    "....kwwwwwWk....",
    ".....kwwwWk.....",
    "....kwwwwwWk....",
    "...kwwwwwwwWk...",
    "..kwwwWkkwwwWk..",
    ".kwwwWk..kwwwWk.",
    ".kwwWk....kwwWk.",
    "..kkk......kkk..",
    "................",
    "................"],
  edit:[
    "................",
    "...........kkk..",
    "..........kpppk.",
    ".........kPpppk.",
    "........kkPPpk..",
    ".......kyykPk...",
    "......kyyyykk...",
    ".....kyyyyAk....",
    "....kyyyyAk.....",
    "...kyyyyAk......",
    "..kwyyyAk.......",
    "..kwwyAk........",
    ".kCkwkk.........",
    ".kkkk...........",
    "................",
    "................"],
  room:[
    "................",
    ".......kk.......",
    "......kvvk..kk..",
    ".....kvvvvk.kNk.",
    "....kvvvvvvkkNk.",
    "...kvvvvvvvvkNk.",
    "..kvvVVVVVVvvkk.",
    ".kvVkkkkkkkkVvk.",
    ".kkkwwwwwwwwkkk.",
    "...kwkkkwkkwk...",
    "...kwkakwknwk...",
    "...kwkkkwknwk...",
    "...kwwwwwknwk...",
    "...kWWWWWknWk...",
    "...kkkkkkkkkk...",
    "................"],
  garden:[
    "................",
    ".....kkk........",
    "....kpppk.......",
    "...kppyppk..kk..",
    "...kpyyypk.kgGk.",
    "...kppyppkkgGk..",
    "....kpppk.kgk...",
    ".kk..kgk.kgk....",
    "kgGk.kgkkgk.....",
    ".kgGkkgkgk......",
    "..kkgggGk.......",
    "....kgGk........",
    "..kkkkkkkkkkk...",
    ".knnnnnnnnnnnk..",
    ".kNNNNNNNNNNNk..",
    "..kkkkkkkkkkk..."],
  water:[
    "................",
    "............k...",
    "......kkkk.kbk..",
    ".....kBBBBk.k...",
    "....kk....kk..k.",
    "..kkkkkkkkkkkkbk",
    ".kbbsbbbbbbbkbk.",
    "kBkbsbbbbbbbbk..",
    "kBkbbbbbbbbbk...",
    "kBkbbbbbbbbbk.k.",
    ".kkbbbbbbbbbkkbk",
    "...kbbbbbbBBk.k.",
    "...kBBBBBBBBk...",
    "....kkkkkkkk....",
    "................",
    "................"],
  talk:[
    "................",
    "...kkkkkkkkkk...",
    "..kwwwwwwwwwwk..",
    ".kwwwwwwwwwwwWk.",
    ".kwwwwwwwwwwwWk.",
    ".kwwkkwkkwkkwWk.",
    ".kwwkkwkkwkkwWk.",
    ".kwwwwwwwwwwwWk.",
    ".kwwwwwwwwwwWWk.",
    "..kWwwwwwwwWWk..",
    "...kkkwwkkkkk...",
    ".....kwWk.......",
    "....kwWk........",
    "....kkk.........",
    "................",
    "................"]
};
UI.redo=UI.undo.map(r=>r.padEnd(16,'.').split('').reverse().join(''));
function drawRotate(ax){
  // 時計回りの矢印（輪＋矢じり）を描いて外周線を足す
  const t=mk(16,16),tx=t.getContext('2d');
  for(let j=0;j<16;j++)for(let i=0;i<16;i++){
    const dx=i+0.5-8,dy=j+0.5-8.5,d=Math.hypot(dx,dy),ang=Math.atan2(dy,dx)*180/Math.PI;
    if(d>=3.6&&d<=6.1&&!(ang>-75&&ang<-5))R(tx,d>5?C.am4:C.am2,i,j);
  }
  // 矢じり（右上、下向き）
  for(let k=0;k<4;k++)R(tx,C.am2,10+k,4+k,7-2*k,1);
  R(tx,C.am1,5,4,2,1);
  ax.drawImage(outlined(t),0,0);
}
function uiIcon(name){
  const key='ui|'+name;let c=cache.get(key);if(c)return c;
  c=mk(32,32);const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  try{
    const a=mk(16,16),ax=a.getContext('2d');
    if(name==='rotate')drawRotate(ax);
    else if(UI[name])map(ax,UI[name],UIP,0,0);
    else map(ax,[".kkkk.","kwwwwk","kwkkwk","kkkwwk","..kwk.","..kwk.","..kkk.","..kwk.","..kkk."],{k:OL,w:'#ffffff'},5,3);
    // 右下へ落ち影
    const sh=mk(16,16),sx=sh.getContext('2d');sx.drawImage(a,0,0);sx.globalCompositeOperation='source-in';sx.fillStyle='rgba(27,18,38,0.35)';sx.fillRect(0,0,16,16);
    x.drawImage(sh,0,0,16,16,2,2,32,32);
    x.drawImage(a,0,0,16,16,0,0,32,32);
  }catch(e){}
  cache.set(key,c);return c;
}

// ───────── フェーズ3：家の正面（庭の上端）・生成画像の受け口・追加アイコン ─────────
UI.photo=[
  "................",
  "....kkkkkk......",
  "...kCccccCk.....",
  ".kkkkkkkkkkkkkk.",
  ".kcccccccccccak.",
  ".kccckkkkkcccck.",
  ".kcckbbbbBkccck.",
  ".kcckbsbbBkccck.",
  ".kcckbbbBBkccck.",
  ".kcckBBBBBkccck.",
  ".kccckkkkkcccck.",
  ".kCCCCCCCCCCCCk.",
  ".kkkkkkkkkkkkkk.",
  "................",
  "................",
  "................"];
UI.look=[
  "................",
  ".......kk.......",
  "......kPPk......",
  ".....kPppPk.....",
  "....kPppppPk....",
  "...kPppppppPk...",
  "..kkkkkkkkkkkk..",
  "...kwwwwwwwwk...",
  "...kwbbwwkkWk...",
  "...kwbbwkaaWk...",
  "...kwwwwkaAWk...",
  "...kWWWWkaAWk...",
  "..kkkkkkkkkkkk..",
  "................",
  "................",
  "................"];

const ROOFS={navy:['#7a8ac8','#4a5a9a','#3a4680','#2c3566','#1f2650'],red:['#f09a88','#d86a5a','#b84a44','#8e3434','#6a2428'],
  green:['#9ccf9a','#6aa070','#4e8058','#3a6044','#284632'],brown:['#c89a70','#a07050','#7e5438','#5e3c28','#422818']};
const WALLS={cream:['#fffaf0','#f6e8c8','#e4d0a8','#c8b088','#a08860'],white:['#ffffff','#f0eef4','#dcd6e4','#bcb2c8','#948aa4'],
  wood:['#e0aa78','#c08858','#a06c40','#7e5030','#5a3820']};
const DOORS={wood:[C.w1,C.w2,C.w3,C.w4,C.w5],blue:['#bcd4ff','#7f9ad8','#5a7ad0','#3a4f96','#28386e']};
const BOXFL={summer:[C.pk2,C.yel,C.pk1],autumn:[C.am3,'#d0604a',C.yel],winter:['#43784a','#5f9e5c','#ffffff'],spring:[C.pk1,'#ffffff',C.pk2]};
// 家の正面のレイアウト（原寸ドット）：家は左端から戸口の右5マスまで。残りは垣根と夜の海
function houseGeo(aw,ah,doorX){
  const hw=Math.min(aw,(doorX+6)*U);
  const dx=doorX*U;
  const wins=[];
  [1.6,4.2,doorX+2.7,doorX+4.6,doorX-2.6].forEach(t=>{
    const cx=Math.round(t*U),x0=cx-10;
    if(x0<10||x0+20>hw-10)return;
    if(x0+20>dx-4&&x0<dx+U+14)return;                 // 戸口と灯りに重ねない
    if(wins.some(w=>Math.abs(w.x-x0)<26))return;
    wins.push({x:x0,y:Math.round(ah*0.44),w:20,h:14});
  });
  return{hw,dx,dy:Math.round(ah*0.42),wins,lantern:{x:dx+U+3,y:Math.round(ah*0.5)}};
}
function houseArt(aw,ah,o){
  const c=mk(aw,ah),x=c.getContext('2d');
  const day=!o.night,we=SKY[o.weather]?o.weather:'clear',season=o.season||'summer',snow=we==='snow';
  const RF=ROOFS[o.roof]||ROOFS.navy,WL=WALLS[o.wall]||WALLS.cream,DR=DOORS[o.door]||DOORS.wood;
  const G=houseGeo(aw,ah,o.doorX|0);
  // 空
  const sky=SKY[we][day?'d':'n'];
  for(let j=0;j<ah;j++)R(x,sky[Math.min(3,Math.floor(j/(ah*0.7)*4))],0,j,aw,1);
  if(!day&&we==='clear'){
    srand(5);for(let k=0;k<Math.floor(aw*ah/60);k++){const sx=Math.floor(rnd()*aw),sy=Math.floor(rnd()*ah*0.55);R(x,rnd()<0.3?'#ffffff':'#fff4c8',sx,sy);}
    if(aw-G.hw>30){const mx=aw-14,my=7;ell(x,mx,my,4,4,'#fff1b8');ell(x,mx+2,my-1,4,4,sky[0]);}
  }else if(we!=='clear'){
    srand(8);for(let k=0;k<Math.max(2,Math.floor(aw/50));k++){const cx0=Math.floor(rnd()*aw),cy0=2+Math.floor(rnd()*10);const cc=day?(we==='cloudy'?'#e4e8f0':'#9aa4b8'):'#3a3a58';ell(x,cx0,cy0,7,2,cc);ell(x,cx0+6,cy0-1,5,2,cc);}
  }else{srand(7);for(let k=0;k<Math.max(2,Math.floor(aw/70));k++){const cx0=Math.floor(rnd()*aw),cy0=3+Math.floor(rnd()*8);ell(x,cx0,cy0,5,1,'#ffffff');ell(x,cx0+4,cy0-1,3,1,'#ffffff');}}
  // 右側の景色：遠くの海と灯台、千代さんの垣根
  if(aw-G.hw>8){
    const sx0=G.hw-6,seaY=Math.round(ah*0.56);
    const SEA=day?(we==='clear'?['#5a9ad0','#4a86c0','#7ab8e8']:['#6a86a4','#5a7694','#8aa2bc']):[C.te5,'#173f52',C.te4];
    // 岬と灯台
    const lx=aw-18;
    for(let i=0;i<aw-sx0;i++){R(x,i%7===0?SEA[2]:SEA[0],sx0+i,seaY,1,1);R(x,SEA[1],sx0+i,seaY+1,1,ah-seaY);}
    for(let i=0;i<24;i++){const hh=Math.max(0,4-Math.abs(i-12)/3|0);R(x,day?'#5a7a6a':'#141028',lx-12+i,seaY-hh,1,hh+1);}
    R(x,OL,lx-2,seaY-12,5,12);R(x,'#ffffff',lx-1,seaY-11,3,10);R(x,C.red,lx-1,seaY-8,3,2);R(x,C.red,lx-1,seaY-4,3,2);
    R(x,OL,lx-2,seaY-15,5,3);R(x,day?C.am1:C.am2,lx-1,seaY-14,3,1);
    // 水面のきらめき・街の灯り
    for(let k=0;k<Math.floor((aw-sx0)/6);k++){const px0=sx0+3+Math.floor(hash(k,3,81)*(aw-sx0-6)),py0=seaY+2+Math.floor(hash(k,4,82)*(ah-seaY-4));R(x,day?'#cfe6f8':(hash(k,5,83)<0.5?C.am2:C.te2),px0,py0,2,1);}
    if(!day)for(let k=0;k<5;k++)R(x,C.am2,lx-10+k*4,seaY-1,1,1);
    // 垣根（季節の色）
    const HL=season==='autumn'?['#c8c060','#a0a048','#7a7a38','#565628']:season==='winter'?['#7a9a7a','#5a7a5e','#46624c','#304636']:season==='spring'?['#a8e090','#7ec46e','#5fa05c','#43784a']:[C.g1,C.g2,C.g3,C.g4];
    const hy=Math.round(ah*0.72);
    for(let i=0;i<aw-sx0;i+=6){const bx=sx0+i;oell(x,bx+3,hy+2,4,3,HL[2]);ell(x,bx+2,hy+1,2,2,HL[1]);R(x,HL[0],bx+1,hy,1,1);}
    R(x,HL[2],sx0,hy+3,aw-sx0,ah-hy-3);R(x,HL[3],sx0,ah-3,aw-sx0,3);
    for(let i=0;i<aw-sx0;i+=4){if(hash(i,9,84)<0.5)R(x,HL[1],sx0+i,hy+5+Math.floor(hash(i,8,85)*6),2,1);}
    if(season==='spring')for(let k=0;k<6;k++)R(x,'#ffffff',sx0+4+Math.floor(hash(k,1,86)*(aw-sx0-8)),hy+1+Math.floor(hash(k,2,87)*8),1,1);
    if(season==='summer')for(let k=0;k<4;k++){const fx=sx0+4+Math.floor(hash(k,3,88)*(aw-sx0-8)),fy=hy+2+Math.floor(hash(k,4,89)*8);R(x,C.pk2,fx,fy,2,2);R(x,C.yel,fx,fy,1,1);}
    if(snow)for(let i=0;i<aw-sx0;i+=6){R(x,'#ffffff',sx0+i,hy-1,5,2);}
    // 柵の杭（垣根の前）
    for(let i=4;i<aw-sx0;i+=12){R(x,OL,sx0+i,ah-10,3,10);R(x,C.w2,sx0+i+1,ah-9,1,9);}
    R(x,OL,sx0,ah-7,aw-sx0,1);R(x,C.w3,sx0,ah-6,aw-sx0,1);
  }
  // 壁
  const wx0=4,wx1=G.hw-4,top=17;
  R(x,OL,wx0,top,wx1-wx0,ah-top);
  R(x,WL[1],wx0+1,top,wx1-wx0-2,ah-top);
  if(o.wall==='wood'){
    for(let i=wx0+1;i<wx1-1;i+=5){R(x,WL[3],i,top,1,ah-top);R(x,WL[0],i+1,top,1,ah-top);}
    for(let k=0;k<Math.floor((wx1-wx0)/6);k++){R(x,WL[2],wx0+2+Math.floor(hash(k,1,61)*(wx1-wx0-4)),top+3+Math.floor(hash(k,2,62)*(ah-top-6)),1,2);}
  }else{
    for(let k=0;k<Math.floor((wx1-wx0)*(ah-top)/40);k++){R(x,WL[2],wx0+2+Math.floor(hash(k,1,63)*(wx1-wx0-4)),top+2+Math.floor(hash(k,2,64)*(ah-top-12)),1,1);}
    // 腰板
    const ky=ah-10;
    R(x,OL,wx0,ky-1,wx1-wx0,1);R(x,C.w3,wx0+1,ky,wx1-wx0-2,8);R(x,C.w2,wx0+1,ky,wx1-wx0-2,1);
    for(let i=wx0+1;i<wx1-1;i+=6)R(x,C.w4,i,ky+1,1,7);
  }
  R(x,WL[3],wx0+1,top,wx1-wx0-2,2);R(x,SH,wx0+1,top+2,wx1-wx0-2,2);
  R(x,WL[0],wx0+1,top+4,1,ah-top-6);R(x,WL[3],wx1-2,top+2,1,ah-top-4);
  // 土台
  R(x,OL,wx0,ah-3,wx1-wx0,1);R(x,C.st3,wx0+1,ah-2,wx1-wx0-2,2);R(x,C.st2,wx0+1,ah-2,wx1-wx0-2,1);
  // 窓（夜は内側の灯り）
  G.wins.forEach((w,i)=>{
    O(x,w.x-2,w.y-2,w.w+4,w.h+4,C.w3);R(x,C.w2,w.x-1,w.y-1,w.w+2,1);
    R(x,OL,w.x,w.y,w.w,w.h);
    if(day){const SB=SKY[we].d;for(let j=0;j<w.h-2;j++)R(x,SB[Math.min(3,j>>2)],w.x+1,w.y+1+j,w.w-2,1);for(let k=0;k<4;k++)R(x,'#ffffff',w.x+3+k,w.y+w.h-4-k,2,1);}
    else{R(x,C.am2,w.x+1,w.y+1,w.w-2,w.h-2);R(x,C.am1,w.x+2,w.y+2,w.w-4,3);R(x,C.am3,w.x+1,w.y+w.h-4,w.w-2,3);
      // カーテンの影と、部屋の中の人影（ふたり分の小さなシルエット・ひとつの窓だけ）
      R(x,'#d88a4a',w.x+1,w.y+1,3,w.h-2);R(x,'#d88a4a',w.x+w.w-4,w.y+1,3,w.h-2);
      if(i===0){R(x,'#a0603a',w.x+7,w.y+6,3,7);R(x,'#a0603a',w.x+7,w.y+4,3,2);R(x,'#a0603a',w.x+12,w.y+8,2,5);R(x,'#a0603a',w.x+12,w.y+7,2,1);}}
    R(x,C.w3,w.x+w.w/2-1,w.y+1,2,w.h-2);R(x,C.w3,w.x+1,w.y+Math.round(w.h/2),w.w-2,1);
    // 花箱
    const by=w.y+w.h+2,FL=BOXFL[season]||BOXFL.summer;
    for(let k=0;k<6;k++){const fx=w.x-1+k*4;R(x,season==='winter'?'#43784a':C.g3,fx,by-2,3,2);R(x,FL[k%FL.length],fx+1,by-3,(season==='winter'&&k%2)?1:2,(season==='winter')?1:2);}
    if(snow)R(x,'#ffffff',w.x-2,by-3,w.w+4,1);
    bev(x,w.x-2,by,w.w+4,4,WOOD);
  });
  // 戸口
  {
    const d0=G.dx,dy=G.dy;
    R(x,OL,d0,dy-2,U,ah-dy+2);
    bev(x,d0-2,dy-4,U+4,3,WOOD);
    R(x,DR[1],d0+2,dy,U-4,ah-dy-2);
    R(x,DR[0],d0+2,dy,1,ah-dy-2);R(x,DR[3],d0+U-3,dy,1,ah-dy-2);
    R(x,DR[2],d0+4,dy+12,U-8,1);R(x,DR[2],d0+4,dy+18,U-8,1);
    // 戸の小窓
    R(x,OL,d0+4,dy+2,U-8,7);R(x,day?'#bce0f6':C.am2,d0+5,dy+3,U-10,5);if(!day)R(x,C.am1,d0+5,dy+3,U-10,1);else R(x,'#ffffff',d0+5,dy+3,2,1);
    R(x,OL,d0+U/2,dy+3,1,5);
    // 取っ手
    R(x,OL,d0+U-6,dy+13,3,3);R(x,C.am2,d0+U-5,dy+14,1,1);
    // 踏み石
    R(x,OL,d0-1,ah-2,U+2,1);R(x,C.st2,d0,ah-1,U,1);
  }
  // 戸口の灯り（つり下げのランタン）
  {const L=G.lantern;
    R(x,OL,L.x+2,L.y-6,1,4);R(x,OL,L.x,L.y-3,5,1);
    O(x,L.x,L.y-2,5,7,day?C.am1:C.am2);R(x,day?'#fff8e0':C.am1,L.x+1,L.y-1,2,2);R(x,C.w4,L.x,L.y+5,5,1);}
  // 屋根（手前に張り出す瓦）
  {
    const r0=2,r1=16;
    for(let r=r0;r<=r1;r++){
      const ins=Math.round(10*(r1-r)/(r1-r0));
      const lx=Math.max(0,wx0-3+ins),rx=Math.min(aw,wx1+3-ins);
      const band=(r-r0)%3;
      R(x,band===2?RF[3]:band===0?RF[1]:RF[2],lx,r,rx-lx,1);
      for(let i=lx+((Math.floor((r-r0)/3)%2)*3);i<rx;i+=6)R(x,RF[3],i,r,1,1);
      R(x,OL,lx,r,1,1);R(x,OL,rx-1,r,1,1);
      if(band===0)R(x,RF[0],lx+1,r,Math.min(6,rx-lx-2),1);
    }
    const lx0=Math.max(0,wx0-3+10),rx0=Math.min(aw,wx1+3-10);
    R(x,OL,lx0,r0-1,rx0-lx0,1);R(x,RF[0],lx0+1,r0,rx0-lx0-2,1);
    R(x,OL,Math.max(0,wx0-3),r1+1,Math.min(aw,wx1+3)-Math.max(0,wx0-3),1);
    R(x,SH,wx0+1,r1+2,wx1-wx0-2,1);
    if(snow||season==='winter'&&o.weather==='snow'){
      for(let r=r0;r<r0+4;r++){const ins=Math.round(10*(r1-r)/(r1-r0));const lx=Math.max(0,wx0-3+ins)+1,rx=Math.min(aw,wx1+3-ins)-1;R(x,r===r0+3?'#dfe6f2':'#ffffff',lx,r,rx-lx,1);}
      for(let i=wx0;i<wx1;i+=7){R(x,'#dfe6f2',i,r1+1,1,2+(i%3));}
    }
    if(season==='autumn'){for(let k=0;k<6;k++){R(x,[C.am3,'#d0604a',C.yel][k%3],wx0+6+Math.floor(hash(k,2,66)*(wx1-wx0-12)),r0+3+Math.floor(hash(k,3,67)*10),2,1);}}
    if(season==='spring'){for(let k=0;k<8;k++){R(x,C.pk1,wx0+6+Math.floor(hash(k,2,68)*(wx1-wx0-12)),r0+3+Math.floor(hash(k,3,69)*10),1,1);}}
  }
  return c;
}
// 庭の上端に家の正面を描く。o={roof,wall,door,doorX,night,season,weather,glow}
//   glow:true のときは「灯り」（窓・戸の小窓・ランタンのにじみ）だけを lighter で重ねる（夜の暗さの後に呼ぶ）
function drawHouse(ctx,px,py,w,h,T,o){
  o=o||{};
  try{
    const s=scaleOf(T),aw=Math.max(1,Math.round(w/s)),ah=Math.max(1,Math.round(h/s));
    if(o.glow){
      if(!o.night)return;
      const G=houseGeo(aw,ah,o.doorX|0),g=glowCanvas('255,196,110',18),gs2=glowCanvas('255,214,140',10);
      const op=ctx.globalCompositeOperation,ga=ctx.globalAlpha;ctx.globalCompositeOperation='lighter';
      const fl=o.t!=null?0.9+0.06*Math.sin(o.t*6.1)+0.04*Math.sin(o.t*11.3):1;
      ctx.globalAlpha=ga*0.75;
      G.wins.forEach(wn=>blit(ctx,g,px+(wn.x+wn.w/2-18)*s,py+(wn.y+wn.h/2-18)*s,s));
      ctx.globalAlpha=ga*fl;
      blit(ctx,gs2,px+(G.lantern.x+2-10)*s,py+(G.lantern.y+1-10)*s,s);
      blit(ctx,gs2,px+(G.dx+U/2-10)*s,py+(G.dy+5-10)*s,s);
      ctx.globalCompositeOperation=op;ctx.globalAlpha=ga;
      return;
    }
    if(drawRaster(ctx,'house.front',[`${o.roof}_${o.wall}_${o.door}`,'default'],px,py,T,1,1,false,false,{w,h}))return;
    const key=['h',aw,ah,o.roof,o.wall,o.door,o.doorX|0,o.night?1:0,o.season||'summer',o.weather||'clear'].join('|');
    let img=cache.get(key);if(!img){img=houseArt(aw,ah,o);cache.set(key,img);}
    const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,Math.round(px),Math.round(py),Math.round(w),Math.round(h));
    ctx.imageSmoothingEnabled=sm;
  }catch(e){}
}

// ───────── §6 生成画像の受け口（assets/original/manifest.json の file） ─────────
// file：'assets/original/home/xxx.png'（すべての向き・色で共通）か {"r0_default":"…","r90":"…","default":"…"}（キーは右から順に省略可）
// anchor：{x,y,tile} … PNG の中で「足元範囲（回転後の占有マス）の左上」が来る位置（PNG の px）と、1マスの PNG 上の大きさ（既定 32）
//   人物は「立っているマスの左上」。省略時：アイテムはコード描画と同じ余白（x=8,y=60,tile=32）、人物は下端中央、床・地面は1枚＝1マス
const RASTER=new Map();
function drawRaster(ctx,id,keys,px,py,T,fw,fh,isTile,isChar,box){
  if(!RASTER.size)return false;
  const r=RASTER.get(id);if(!r)return false;
  let img=null;
  for(const k of keys){const m=r.imgs[k];if(m&&m.complete&&m.naturalWidth>0){img=m;break;}}
  if(!img)return false;
  const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
  try{
    T=T||32;
    if(isTile){ctx.drawImage(img,Math.round(px),Math.round(py),T,T);return true;}
    if(box){ctx.drawImage(img,Math.round(px),Math.round(py),Math.round(box.w),Math.round(box.h));return true;}
    const a=r.anchor||{};
    const tile=+a.tile>0?+a.tile:32,k=T/tile;
    const iw=img.naturalWidth,ih=img.naturalHeight;
    let ax=Number.isFinite(+a.x)?+a.x:null,ay=Number.isFinite(+a.y)?+a.y:null;
    if(ax==null||ay==null){
      if(isChar){ax=(iw-tile)/2;ay=ih-tile;}
      else{ax=PAD*2*tile/32;ay=TOP*2*tile/32;}
    }
    ctx.drawImage(img,Math.round(px-ax*k),Math.round(py-ay*k),Math.round(iw*k),Math.round(ih*k));
    return true;
  }finally{ctx.imageSmoothingEnabled=sm;}
}
const SAFE_FILE=/^[A-Za-z0-9_\-./]+\.png$/;
function loadRaster(manifest,base){
  let n=0;
  ((manifest&&manifest.assets)||[]).forEach(a=>{
    if(!a||typeof a.id!=='string'||!a.file)return;
    const files=typeof a.file==='string'?{default:a.file}:(typeof a.file==='object'?a.file:null);
    if(!files)return;
    const ent={imgs:{},anchor:a.anchor&&typeof a.anchor==='object'?a.anchor:null};
    Object.keys(files).forEach(k=>{
      const f=files[k];
      if(typeof f!=='string'||!SAFE_FILE.test(f)||f.indexOf('..')>=0||f.charAt(0)==='/')return;
      try{
        const im=new Image();
        im.onload=()=>{ent.imgs[k]=im;RASTER.set(a.id,ent);if(window.HOME_ART)window.HOME_ART.rasterCount=RASTER.size;};
        im.onerror=()=>{};               // 読めなければコード描画のまま
        im.src=(base||'')+f;n++;
      }catch(e){}
    });
  });
  return n;
}
function loadManifest(){
  try{
    if(typeof fetch!=='function'||typeof location==='undefined'||!/^https?:$/.test(location.protocol))return;
    fetch('assets/original/manifest.json',{cache:'no-cache'}).then(r=>r&&r.ok?r.json():null).then(m=>{if(m)loadRaster(m,'');}).catch(()=>{});
  }catch(e){}
}

function items(){return Object.keys(ITEMS).map(id=>({id,w:ITEMS[id].w,h:ITEMS[id].h,rots:ITEMS[id].rots.slice(),variants:(ITEMS[id].variants||['default']).slice(),wall:!!ITEMS[id].wall,light:!!ITEMS[id].light}));}

window.HOME_ART={
  TILE:32, ART_TILE:U,
  drawTile, drawWall, drawItem, drawChar, icon, uiIcon,
  drawHouse, wallWindow, houseGeo,
  wallpapers:Object.keys(WALLPAPER), roofs:Object.keys(ROOFS), walls:Object.keys(WALLS), doors:Object.keys(DOORS),
  floors:Object.keys(TILES).filter(k=>/^floor\./.test(k)), seasons:Object.keys(GRASS),
  loadRaster, rasterCount:0, hasRaster:id=>RASTER.has(id),
  items, uiNames:Object.keys(UI).concat('rotate'),
  chars:Object.keys(CHARS).concat('cat'), poses:['stand','walk','sit','read','work','hold','sleep'],
  plantSpecies:['seed','morning_glory','sunflower','herb'],
  materials:Object.keys(MAT_ROWS),   // HOME_ART.icon('mat.'+id)
  palette:C,
  clearCache(){cache.clear();}
};
loadManifest();
})();
