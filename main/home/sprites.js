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
  const tones=[C.f2,C.f3,C.f2,C.f1,C.f3,C.f4];
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
      if(g<0.07)R(x,C.f4,i,y0+1,1,1);else if(g>0.95)R(x,C.f1,i,y0+2,1,1);
    }
    R(x,C.f5,0,y0+3,U,1);              // 板の継ぎ目
    for(let i=0;i<U;i++)if(hash(gx*U+i,row,5)<0.5)R(x,'rgba(255,230,190,0.10)',i,y0,1,1);
  }
  return c;
}
function grassTile(gx,gy){
  const c=mk(U,U),x=c.getContext('2d');
  const big=hash(gx>>1,gy>>1,11);
  R(x,big<0.3?C.g3:C.g2,0,0,U,U);
  for(let j=0;j<U;j++)for(let i=0;i<U;i++){
    const v=hash(gx*U+i,gy*U+j,2);
    if(v<0.06)R(x,C.g4,i,j);else if(v<0.12)R(x,big<0.3?C.g2:C.g1,i,j);
  }
  // 草の房（V字）
  srand(Math.floor(hash(gx,gy,4)*1e9));
  const n=2+Math.floor(rnd()*3);
  for(let k=0;k<n;k++){const i=1+Math.floor(rnd()*13),j=2+Math.floor(rnd()*12);R(x,C.g4,i,j+1);R(x,C.g4,i+2,j+1);R(x,C.g1,i,j);R(x,C.g1,i+2,j);R(x,C.g4,i+1,j+2);}
  // 小さな花
  const fr=hash(gx,gy,8);
  if(fr<0.22){
    const cols=[C.cr1,C.yel,C.pk2,'#c8b4ff'];const fc=cols[Math.floor(hash(gx,gy,12)*cols.length)];
    const i=2+Math.floor(hash(gx,gy,13)*11),j=2+Math.floor(hash(gx,gy,14)*11);
    R(x,C.g4,i,j+2);R(x,fc,i-1,j);R(x,fc,i+1,j);R(x,fc,i,j-1);R(x,fc,i,j+1);R(x,fr<0.1?C.am3:C.yel,i,j);
  }
  return c;
}
function pathTile(gx,gy){ // 予備：踏み固めた土
  const c=mk(U,U),x=c.getContext('2d');R(x,'#b89a72',0,0,U,U);
  for(let j=0;j<U;j++)for(let i=0;i<U;i++){const v=hash(gx*U+i,gy*U+j,21);if(v<0.08)R(x,'#9a7c58',i,j);else if(v>0.94)R(x,'#d4b88e',i,j);}
  return c;
}
const TILES={'floor.wood':floorTile,'ground.grass':grassTile,'ground.path':pathTile};
function drawTile(ctx,tileId,px,py,T,gx,gy){
  try{
    const f=TILES[tileId];gx=gx|0;gy=gy|0;
    const key='t|'+tileId+'|'+gx+'|'+gy;
    let img=cache.get(key);
    if(!img){img=f?f(gx,gy):qbox(1,1);cache.set(key,img);}
    blit(ctx,img,px,py,scaleOf(T));
  }catch(e){}
}

// ───────── 壁（部屋の奥の帯） ─────────
function wallArt(aw,ah){
  const c=mk(aw,ah),x=c.getContext('2d');
  // 壁紙：くすんだ藤色にうすい縦縞
  R(x,'#7c6f9a',0,0,aw,ah);
  for(let i=0;i<aw;i+=8){R(x,'#75688f',i,0,1,ah);R(x,'#8578a2',i+4,0,1,ah);}
  for(let i=0;i<aw;i+=8)for(let j=6;j<ah-6;j+=8)R(x,'#8f82ac',i+4,j,1,1);
  // 天井際の陰
  R(x,'#4a3f66',0,0,aw,2);R(x,'#5e5280',0,2,aw,1);R(x,'#6c608c',0,3,aw,1);
  // 幅木
  const bb=ah-4;
  R(x,OL,0,bb-1,aw,1);R(x,'#9a7058',0,bb,aw,1);R(x,'#7a5440',0,bb+1,aw,2);R(x,'#5a3c2e',0,bb+3,aw,1);
  // 窓（中央）＋ カーテン
  if(ah>=22&&aw>=40){
    const ww=Math.min(54,Math.max(30,Math.round(aw*0.28)))&~1, wh=Math.min(ah-12,30);
    const wx=Math.round((aw-ww)/2), wy=Math.max(4,Math.round((bb-wh)/2)-1);
    // 窓からのアンバー（部屋の灯りの照り返し）
    for(let k=3;k>=1;k--){x.fillStyle='rgba(255,196,120,'+(0.05*k)+')';x.fillRect(wx-4*k,wy-2*k,ww+8*k,wh+4*k+2);}
    O(x,wx-2,wy-2,ww+4,wh+4,'#e6d6bc');R(x,'#fff2da',wx-1,wy-1,ww+2,1);R(x,'#c4ae8c',wx-1,wy+wh,ww+2,1);
    R(x,OL,wx,wy,ww,wh);
    // 夜空（段階）
    const bands=[C.ny4,C.ny3,C.ny2,C.ny1];
    for(let j=0;j<wh-2;j++){R(x,bands[Math.min(3,Math.floor(j/(wh-2)*4))],wx+1,wy+1+j,ww-2,1);}
    srand(42);for(let k=0;k<Math.floor(ww*wh/50);k++){const sx=wx+2+Math.floor(rnd()*(ww-4)),sy=wy+2+Math.floor(rnd()*(wh*0.6));R(x,rnd()<0.3?'#ffffff':'#fff4c8',sx,sy);}
    // 三日月
    const mx=wx+ww-9,my=wy+4;ell(x,mx,my,3,3,'#fff1b8');ell(x,mx+2,my-1,3,3,C.ny4);
    // 遠くの家並み（窓にアンバーの灯り）
    const hy=wy+wh-1;
    for(let i=1;i<ww-1;i++){const hh=3+Math.floor(hash(i>>2,5,6)*5)+((i>>2)%3===0?2:0);R(x,'#141028',wx+i,hy-hh,1,hh);}
    for(let i=3;i<ww-3;i+=4){if(hash(i,3,7)<0.55)R(x,C.am2,wx+i,hy-3,1,1);}
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
  if(aw>=120&&ah>=22){
    for(const fx of[Math.round(aw*0.14),Math.round(aw*0.86)]){
      const fy=Math.round(bb*0.38);
      for(let k=4;k>=1;k--){x.fillStyle='rgba(255,190,110,'+(0.045*k)+')';x.fillRect(fx-3*k-1,fy-2*k,6*k+3,4*k+3);}
      O(x,fx-2,fy-2,5,5,C.am2);R(x,C.am1,fx-1,fy-1,2,2);R(x,'#5a3c2e',fx-1,fy+3,3,2);
    }
  }
  return c;
}
function drawWall(ctx,px,py,w,h,T){
  try{
    const s=scaleOf(T),aw=Math.max(1,Math.round(w/s)),ah=Math.max(1,Math.round(h/s));
    const key='w|'+aw+'|'+ah;let img=cache.get(key);
    if(!img){img=wallArt(aw,ah);cache.set(key,img);}
    const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
    ctx.drawImage(img,Math.round(px),Math.round(py),Math.round(w),Math.round(h));
    ctx.imageSmoothingEnabled=sm;
  }catch(e){}
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
    shadowRect(x,6,4,12,28);
    // 天板（奥行きは細い）
    bev(x,2,-26,12,30,P);
    // 上から覗く本
    R(x,P.dk,9,-23,4,25);
    srand(5);for(let j=-22;j<1;j+=2){R(x,['#c8505a','#5a7ad0','#e8c050','#5f9e5c','#8c5fcc','#f2a2ac'][Math.floor(rnd()*6)],9+Math.floor(rnd()*2),j,2,1);}
    // 手前の側板
    bev(x,2,3,12,29,{hi:P.base,base:P.mid,mid:P.lo});
    R(x,P.lo,4,10,8,1);R(x,P.lo,4,20,8,1);
    R(x,OL,13,3,1,29);
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
    shadowRect(x,6,4,12,28);
    bev(x,2,-12,12,16,P);
    R(x,P.dk,9,-9,4,11);R(x,'#bfe8ea',10,-8,2,2);R(x,C.pk2,10,-3,2,2);
    bev(x,2,3,12,29,{hi:P.base,base:P.mid,mid:P.lo});
    // 側板の継ぎ当て
    O(x,4,12,8,6,NEW.base);R(x,NEW.hi,5,13,6,1);R(x,OL,5,15,1,1);R(x,OL,10,15,1,1);
    bracket(8,24);
    R(x,OL,13,3,1,29);
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
    for(let i=0;i<4;i++)for(let j=0;j<3;j++)star(6+i*7+(j%2)*3,24+j*6);
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
  const plate=(X,Y)=>{oell(x,X,Y,4,2,C.cr1);R(x,OL,X-1,Y-2,3,3);R(x,'#ffffff',X-1,Y-2,3,2);R(x,'#2a2a3a',X-1,Y,3,1);};
  if(o.rot===0){cup(6,3,C.vi1);cup(21,3,C.pk2);plate(16,-1);}
  else{cup(13,-3,C.vi1);cup(13,9,C.pk2);plate(7,4);}
}

function glowCanvas(rgb,r){
  const key='glow|'+rgb+'|'+r;let c=cache.get(key);if(c)return c;
  c=mk(r*2+1,r*2+1);const x=c.getContext('2d');
  const steps=[[1,.10],[.75,.10],[.5,.14],[.3,.2]];
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
  // 取っ手
  R(x,OL,4,-15,8,1);R(x,OL,3,-14,1,4);R(x,OL,12,-14,1,4);R(x,C.me2,4,-14,8,1);
  // 貝殻（扇形）
  const S=lit?['#ffffff','#f2fffb','#c8eee8','#8fd2cc']:['#fff6f8','#f4e2ea','#dcc0cc','#b898a8'];
  for(let j=0;j<12;j++){const hw=Math.round(1+Math.sqrt(j/11)*6);R(x,OL,8-hw-1,-11+j,hw*2+2,1);}
  R(x,OL,4,1,8,2);R(x,OL,5,3,6,5);
  for(let j=0;j<11;j++){const hw=Math.round(1+Math.sqrt(j/11)*6)-1;R(x,S[1],8-hw,-10+j,hw*2,1);}
  for(let k=-2;k<=2;k++){for(let j=2;j<11;j++){const xx=8+Math.round(k*j/3.2);R(x,S[2],xx,-10+j,1,1);}}
  R(x,S[0],5,-7,2,1);R(x,S[0],4,-5,1,2);
  O(x,5,1,6,3,S[3]);R(x,S[2],6,2,4,1);
  O(x,6,3,4,5,'#7a6a8a');R(x,'#a898b8',7,4,1,3);
  // 真珠の灯
  if(lit){R(x,OL,6,-4,4,4);R(x,C.te1,7,-3,2,2);R(x,'#ffffff',7,-3,1,1);}
  else{R(x,OL,6,-4,4,4);R(x,'#e6dce8',7,-3,2,2);R(x,'#ffffff',7,-3,1,1);}
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
function plantArt(x,cx,base,stage,color,fr){
  const st=Math.max(0,Math.min(4,stage|0)),sw=fr?1:0;
  const leaf=(X,Y,dir)=>{R(x,OL,X-1+(dir<0?-1:0),Y-1,4,3);R(x,C.g2,X+(dir<0?-1:0),Y,2,1);R(x,C.g1,X+(dir<0?-1:0),Y,1,1);};
  if(st===0){R(x,OL,cx-2,base-3,5,3);R(x,C.g2,cx-1,base-2,1,1);R(x,C.g2,cx+1,base-2,1,1);R(x,C.g1,cx,base-2,1,1);return;}
  const hgt=[0,4,7,10,11][st];
  const top=base-hgt;
  R(x,OL,cx-1,top,3,hgt+1);R(x,C.g3,cx,top+1,1,hgt);
  const tx=cx+(st>=2?sw:0);
  if(st>=1){leaf(cx+2,top+2,1);leaf(cx-3,top+2+(st>=2?1:0),-1);}
  if(st>=2){leaf(cx+2,base-3,1);leaf(cx-3,base-4,-1);}
  if(st===3){const fc=flowerCols(color);R(x,OL,tx-2,top-4,5,6);R(x,C.g2,tx-1,top-3,3,4);R(x,fc[1],tx-1,top-3,3,2);R(x,fc[0],tx-1,top-3,1,1);R(x,C.g3,tx,top-1,1,1);}
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
  if(o.plant)plantArt(x,8,6,o.plant.stage,o.plant.color,o.frame);
}

function flowerbed(x,o){
  const P=WOOD,cols=['pink','yellow','white','purple','red','blue'];
  const fl=(X,Y,c,big)=>{const f=FLOWER[c];R(x,OL,X-1,Y-1,3,3);R(x,f[1],X,Y,1,1);if(big){R(x,f[1],X-1,Y,1,1);R(x,f[1],X+1,Y,1,1);R(x,f[1],X,Y-1,1,1);R(x,f[0],X,Y,1,1);}};
  if(o.rot===0){
    shadowRect(x,3,6,31,10);
    O(x,0,-2,32,17,'#5a3a2a');
    R(x,'#6e4a34',1,-1,30,10);
    for(let i=0;i<30;i+=3)R(x,'#4e3020',1+i,1+(i%2)*3,1,1);
    srand(17);
    for(let i=0;i<7;i++){const X=3+i*4,Y=1+(i%2)*3;R(x,C.g3,X,Y+1,1,3);R(x,C.g2,X-1,Y+3,1,1);R(x,C.g2,X+1,Y+2,1,1);fl(X+((o.frame&&i%2)?1:0),Y,cols[i%cols.length],true);}
    O(x,0,8,32,8,P.base);R(x,P.hi,1,9,30,1);R(x,P.mid,1,13,30,1);R(x,P.lo,1,14,30,1);
    for(let i=8;i<32;i+=8)R(x,P.lo,i,9,1,5);
    bev(x,0,-3,32,3,P);
  }else{
    shadowRect(x,3,4,14,28);
    O(x,0,-4,16,34,'#5a3a2a');R(x,'#6e4a34',1,-3,14,26);
    for(let j=0;j<6;j++){const X=4+(j%2)*7,Y=-1+j*4;R(x,C.g3,X,Y+1,1,3);R(x,C.g2,X-1,Y+3,1,1);fl(X+((o.frame&&j%2)?1:0),Y,cols[j%cols.length],true);}
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
    bev(x,0,0,32,8,P);R(x,P.mid,1,3,30,1);R(x,OL,0,8,32,1);
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
    bev(x,2,-2,13,29,P);R(x,P.mid,8,-1,1,27);
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
    R(x,SH2,10,-4,2,20);
    // 縦に続く横木（上から見た上面）
    R(x,OL,5,-6,1,16);R(x,OL,10,-6,1,16);R(x,P.base,6,-6,4,16);R(x,P.hi,6,-6,1,16);R(x,P.lo,9,-6,1,16);
    for(let j=-6;j<10;j+=4)R(x,P.mid,7,j,2,1);
    // 杭
    O(x,4,-1,8,13,P.base);R(x,P.hi,5,0,6,1);R(x,P.hi,5,0,1,11);R(x,P.lo,10,1,1,10);
    O(x,5,-3,6,4,P.hi);R(x,'#7a5a3a',4,12,8,1);
  }
}

function steppingStone(x,o){
  ell(x,9,10,7,4,'rgba(27,18,38,0.22)');
  oell(x,8,8,6,4,C.st2);
  ell(x,7,7,5,3,C.st2);ell(x,6,6,3,1,C.st1);R(x,C.st3,10,10,3,1);R(x,C.st3,12,9,1,1);
  R(x,C.st3,4,9,1,1);R(x,C.st1,9,6,1,1);
  oell(x,13,13,1,1,C.st3);R(x,C.st2,12,12,1,1);
  R(x,C.g1,1,12,1,1);R(x,C.g4,2,13,1,1);
}

function smallTree(x,o){
  const sw=o.frame?1:0;
  shE(x,10,13,7,2);
  O(x,6,2,5,13,'#8a5a3a');R(x,'#a8724a',7,3,1,11);R(x,'#6a4028',9,3,1,11);R(x,'#6a4028',4,13,2,1);R(x,'#6a4028',11,13,2,1);R(x,OL,3,14,10,1);
  // 樹冠
  const blob=(cx,cy,r,col)=>oell(x,cx,cy,r,r*0.85,col);
  blob(4+sw,-6,5,C.g3);blob(12+sw,-6,5,C.g3);blob(8+sw,-12,6,C.g3);blob(8,-2,5,C.g4);
  ell(x,4+sw,-6,5,4,C.g3);ell(x,12+sw,-6,5,4,C.g3);ell(x,8+sw,-12,6,5,C.g3);ell(x,8,-2,5,4,C.g4);
  ell(x,7+sw,-13,4,3,C.g2);ell(x,3+sw,-7,3,2,C.g2);ell(x,11+sw,-8,3,2,C.g2);
  ell(x,6+sw,-14,2,1,C.g1);ell(x,2+sw,-8,1,1,C.g1);ell(x,10+sw,-9,1,1,C.g1);
  R(x,C.g4,13+sw,-3,2,1);R(x,C.g4,9+sw,-6,2,1);R(x,C.g5,5,0,6,1);
  // 小さな白い花
  for(const [X,Y] of [[5,-11],[11,-12],[13,-5],[3,-4],[9,-7]]){R(x,'#ffffff',X+sw,Y);R(x,'#ffd0e0',X+sw+1,Y);}
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
  'light.shell_lantern':{w:1,h:1,rots:[0],f:shellLantern,light:{rgb:'120,236,214',cx:8,cy:-3,r:26}},
  'memento.child_drawing':{w:1,h:1,rots:[0],f:childDrawing,wall:true},
  'memento.bear':{w:1,h:1,rots:[0],f:bear},
  'memento.flower_tag':{w:1,h:1,rots:[0],f:flowerTag},
  'garden.pot':{w:1,h:1,rots:[0],f:pot,variants:['default','red','blue','yellow'],anim:true},
  'garden.flowerbed':{w:2,h:1,rots:[0,90],f:flowerbed,anim:true},
  'garden.bench':{w:2,h:1,rots:[0,90,180,270],f:bench,flipRot:90},
  'garden.fence':{w:1,h:1,rots:[0,90],f:fence},
  'garden.stepping_stone':{w:1,h:1,rots:[0],f:steppingStone},
  'garden.small_tree':{w:1,h:1,rots:[0],f:smallTree,anim:true},
  'deco.rug':{w:3,h:2,rots:[0,90],f:rug},
  'deco.sea_glass':{w:1,h:1,rots:[0],f:seaGlass,anim:true}
};

function normRot(def,r){
  r=((Math.round((+r||0)/90)*90)%360+360)%360;
  if(def.rots.indexOf(r)>=0)return r;
  if(r===180&&def.rots.indexOf(0)>=0)return 0;
  if(r===270&&def.rots.indexOf(90)>=0)return 90;
  return def.rots[0];
}
function itemArt(id,rot,variant,plant,lit,frame){
  const def=ITEMS[id];
  const pk=plant?((plant.stage|0)+':'+(plant.color||'')):'';
  const key='i|'+id+'|'+rot+'|'+variant+'|'+pk+'|'+(lit?1:0)+'|'+frame;
  let c=cache.get(key);if(c)return c;
  const sw=(rot===90||rot===270);
  const fw=sw?def.h:def.w,fh=sw?def.w:def.h,W=fw*U,H=fh*U;
  c=mk(W+PAD*2,H+PAD+TOP);const x=c.getContext('2d');
  if(def.flipRot&&rot===90){
    // 左向き(90)は右向き(270)を左右反転。影は光源（左上）に合わせて右下へずらし直す
    const a=mk(c.width,c.height),ax=a.getContext('2d'),sh=mk(c.width,c.height),sx=sh.getContext('2d');
    ax.translate(PAD,TOP);sx.translate(PAD,TOP);
    SHX=sx;try{def.f(ax,{W,H,rot:270,variant,plant,lit,frame});}finally{SHX=null;}
    x.drawImage(flipC(sh),2,0);x.drawImage(flipC(a),0,0);
  }else{
    x.save();x.translate(PAD,TOP);def.f(x,{W,H,rot,variant,plant,lit,frame});x.restore();
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
    const plant=itemId==='garden.pot'&&o.plant?o.plant:null;
    const lit=!!(def.light&&o.lit);
    const img=itemArt(itemId,rot,variant,plant,lit,frame);
    blit(ctx,img,px-PAD*s,py-TOP*s,s);
    if(lit){
      const L=def.light,g=glowCanvas(L.rgb,L.r);
      let a=0.9;
      if(o.t!=null)a*=itemId==='light.shell_lantern'?(0.82+0.18*Math.sin(t*2.1)):(0.9+0.06*Math.sin(t*7.3)+0.04*Math.sin(t*13.1));
      ctx.globalAlpha*=a;
      const op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='lighter';
      blit(ctx,g,px+(L.cx-L.r)*s,py+(L.cy-L.r)*s,s);
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

function charArt(who,dir,frame,pose){
  const key='c|'+who+'|'+dir+'|'+frame+'|'+pose;
  let c=cache.get(key);if(c)return c;
  const D=who==='kid'?KID:DAN,pal=who==='kid'?KID_PAL:DAN_PAL;
  const side=(dir==='left'||dir==='right');
  const back=dir==='up';
  const head=side?D.headS:back?D.headB:D.headF;
  let body=side?D.bodyS:back?D.bodyB:D.bodyF;
  let legs;
  if(pose==='sit'){legs=side?D.sitS:back?D.sitB:D.sitF;}
  else{const f=pose==='walk'?((frame|0)%4+4)%4:0;legs=(side?D.legsS:D.legsF)[f];}
  if(pose==='sit'&&!side)body=body.slice(0,body.length-1);
  const hh=head.length,bh=body.length,lh=legs.length;
  const H=hh-1+bh+lh+1;
  c=mk(U,H+1);const x=c.getContext('2d');
  // 足元の影
  shE(x,8.5,H-1,5,1.2);
  const by=hh-1;
  const hop=(pose==='walk'&&(frame%2===1)&&!side)?0:0;
  map(x,legs,pal,0,by+bh);
  map(x,body,pal,0,by+hop);
  map(x,head,pal,0,hop);
  if(who==='kid'){
    if(side){map(x,TAIL_L,pal,0,5+hop);}
    else{map(x,TAIL_L,pal,0,5+hop);map(x,TAIL_R,pal,12,5+hop);}
  }
  if(dir==='left')c=flipC(c);
  cache.set(key,c);return c;
}
function drawChar(ctx,who,dir,frame,px,py,T,pose){
  try{
    const s=scaleOf(T);
    who=who==='kid'?'kid':'dan';
    dir=(dir==='up'||dir==='left'||dir==='right')?dir:'down';
    pose=(pose==='walk'||pose==='sit')?pose:'stand';
    const img=charArt(who,dir,frame|0,pose);
    const lift=pose==='sit'?2:0;
    blit(ctx,img,px+((U-img.width)/2)*s,py+(U-img.height-lift)*s,s);
  }catch(e){}
}

// ───────── アイコン ─────────
function contentBox(c){
  const w=c.width,h=c.height,d=c.getContext('2d').getImageData(0,0,w,h).data;
  let x0=w,y0=h,x1=-1,y1=-1;
  for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(d[(j*w+i)*4+3]>60){if(i<x0)x0=i;if(i>x1)x1=i;if(j<y0)y0=j;if(j>y1)y1=j;}
  if(x1<0)return{x:0,y:0,w:w,h:h};return{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
}
function icon(itemId,variant){
  const key='icon|'+itemId+'|'+(variant||'');
  let c=cache.get(key);if(c)return c;
  c=mk(48,48);const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  try{
    const def=ITEMS[itemId];
    let art;
    if(!def)art=qbox(1,1);
    else{
      let v=variant||'default';if(def.variants&&def.variants.indexOf(v)<0)v=def.variants[0];if(!def.variants)v='default';
      art=itemArt(itemId,def.rots[0],v,itemId==='garden.pot'?{stage:1,color:'pink'}:null,false,0);
    }
    const b=contentBox(art);
    let k=Math.min(44/b.w,44/b.h);if(k>=1)k=Math.floor(k);
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
  rotate:[
    "................",
    ".....kkkkkk.....",
    "...kkaaaaaakk...",
    "..kaaAkkkkaaak..",
    ".kaAkk....kkak..",
    ".kaAk.......k...",
    "kaAk...........",
    "kaAk......kkkkkk",
    "kaAk.......kaak.",
    "kaAk......kaAk..",
    ".kaAk....kaAk...",
    ".kaAkk..kaAk....",
    "..kaaAkkaAk.....",
    "...kkaaaak......",
    ".....kkkk.......",
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
function uiIcon(name){
  const key='ui|'+name;let c=cache.get(key);if(c)return c;
  c=mk(32,32);const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  try{
    const a=mk(16,16),ax=a.getContext('2d');
    if(UI[name])map(ax,UI[name],UIP,0,0);
    else map(ax,[".kkkk.","kwwwwk","kwkkwk","kkkwwk","..kwk.","..kwk.","..kkk.","..kwk.","..kkk."],{k:OL,w:'#ffffff'},5,3);
    // 右下へ落ち影
    const sh=mk(16,16),sx=sh.getContext('2d');sx.drawImage(a,0,0);sx.globalCompositeOperation='source-in';sx.fillStyle='rgba(27,18,38,0.35)';sx.fillRect(0,0,16,16);
    x.drawImage(sh,0,0,16,16,2,2,32,32);
    x.drawImage(a,0,0,16,16,0,0,32,32);
  }catch(e){}
  cache.set(key,c);return c;
}

function items(){return Object.keys(ITEMS).map(id=>({id,w:ITEMS[id].w,h:ITEMS[id].h,rots:ITEMS[id].rots.slice(),variants:(ITEMS[id].variants||['default']).slice(),wall:!!ITEMS[id].wall,light:!!ITEMS[id].light}));}

window.HOME_ART={
  TILE:32, ART_TILE:U,
  drawTile, drawWall, drawItem, drawChar, icon, uiIcon,
  items, uiNames:Object.keys(UI),
  palette:C,
  clearCache(){cache.clear();}
};
})();
