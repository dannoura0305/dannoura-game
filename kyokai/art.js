// kyokai/art.js — 『境界事象 ― 月代町観測記録 ―』の場面イラスト・人物の顔・シロ・UIアイコン
// 公開：window.KY_ART のみ。すべてキャンバスのコードで描いた独自素材（生成画像は使っていない）。
//
// 技法：場面は 320×180 ドットの原寸キャンバスに描き（静止部分はキャッシュ）、毎フレーム揺れもの（雨・灯りのゆらぎ・
//       モニター・列車の灯り）だけ足して、最近傍で拡大して貼る。看板・ポスターの文字だけは拡大後の解像度で描く
//       （小さな漢字が潰れないように）。人物の顔は 64×80 ドット、アイコンは 16×16 ドットを 2 倍。
//       外周線は #1b1226、光源は場面ごとの灯り（ナトリウム灯のアンバー・モニターの青・境界のシアン）。赤は危険／444 だけ。
// 座標：場面上の位置は「16:9 の絵全体に対する 0..1 の比率」。画面の縦横比が違うときは cover（はみ出しを切る）で貼るので、
//       当たり判定は KY_ART.toScene(px,py,cw,ch) / KY_ART.toCanvas(nx,ny,cw,ch) で変換する。大事な物は横 0.14〜0.86 に置いてある
//       （4:3 に切っても見える）。各場面の注目物の座標は docs/kyokai/scenes.md と KY_ART.objects(id, world)。
(function(){
'use strict';

const W=320,H=180,TAU=Math.PI*2;
const OL='#1b1226';
const FG="'Hiragino Kaku Gothic ProN','Yu Gothic','Noto Sans JP','Meiryo','IPAPGothic',sans-serif";
const FM="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP','IPAPMincho','IPAMincho',serif";
const FMONO="'Consolas','Menlo','Noto Sans Mono','DejaVu Sans Mono',monospace";

// ───────── パレット ─────────
const P={
  ol:OL,
  // 夜（藍）
  n0:'#06051a',n1:'#0c0b22',n2:'#13122e',n3:'#1c1838',n4:'#262352',n5:'#33306a',n6:'#4a4a8e',n7:'#6e6eb0',
  // 夕暮れ
  d1:'#2a2350',d2:'#4a3466',d3:'#7a4a6e',d4:'#b8665e',d5:'#e09a6e',
  // ナトリウム灯（アンバー）
  a1:'#fff4cc',a2:'#ffd98a',a3:'#ffb85a',a4:'#e08a34',a5:'#9a5420',a6:'#5a3018',
  // 境界（シアン）
  c1:'#e4fff8',c2:'#9ff0e0',c3:'#4fc8bc',c4:'#2a8f96',c5:'#1f5f70',
  // 危険・444（赤）
  r1:'#ff9a9a',r2:'#e05a6a',r3:'#b02a40',r4:'#6a1428',
  // 石・コンクリート（夜の青み）
  s1:'#d6d2de',s2:'#aeaabe',s3:'#87839c',s4:'#625e78',s5:'#46425c',s6:'#302c44',s7:'#211e32',
  // 木
  w1:'#e8c898',w2:'#c89a66',w3:'#9c7048',w4:'#704a30',w5:'#4a2e20',w6:'#2e1c16',
  // 緑（夜）
  g1:'#7fae7a',g2:'#56866a',g3:'#3a6454',g4:'#284a40',g5:'#1a3230',g6:'#10201f',
  // 錆
  u1:'#c8794a',u2:'#9a5434',u3:'#6a3424',
  // 紙
  p1:'#f4efe6',p2:'#ddd2c0',p3:'#b8a890',p4:'#8a7c68',
  // ピンク・紫（深夜配信の男性）
  k1:'#ffd0e0',k2:'#f59aae',k3:'#d9708e',k4:'#a54a70',
  v1:'#d8c8f4',v2:'#b49ae6',v3:'#8c5fcc',v4:'#5a3590',v5:'#3a2066',
  // 画面
  m1:'#d8f0ff',m2:'#8ec8f0',m3:'#4a8ad0',m4:'#24508a',m5:'#14284a',
  wh:'#f4f2fa',bk:'#0a0812'
};

// ───────── 基本 ─────────
function mk(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);try{c.getContext('2d',{willReadFrequently:true});}catch(e){}return c;}
function R(g,c,x,y,w,h){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w==null?1:Math.round(w),h==null?1:Math.round(h));}
function px(g,c,x,y){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),1,1);}
function line(g,c,x0,y0,x1,y1){
  x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);g.fillStyle=c;
  const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy,n=0;
  while(n++<4000){g.fillRect(x0,y0,1,1);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}
}
// たるんだ電線
function wire(g,c,x0,y0,x1,y1,sag){
  const n=Math.max(2,Math.abs(x1-x0)|0);let lx=x0,ly=y0;
  for(let i=1;i<=n;i++){const t=i/n,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t+Math.sin(t*Math.PI)*sag;line(g,c,lx,ly,x,y);lx=x;ly=y;}
}
function ell(g,c,cx,cy,rx,ry){g.fillStyle=c;for(let yy=Math.ceil(-ry);yy<=ry;yy++){const k=1-(yy*yy)/(ry*ry||1);if(k<0)continue;const hw=Math.round(rx*Math.sqrt(k));g.fillRect(Math.round(cx-hw),Math.round(cy+yy),hw*2+1,1);}}
// 走査線で塗る多角形（にじまない）
function poly(g,c,pts){
  g.fillStyle=c;let y0=1e9,y1=-1e9;for(let i=0;i<pts.length;i+=2){y0=Math.min(y0,pts[i+1]);y1=Math.max(y1,pts[i+1]);}
  const n=pts.length/2;
  for(let y=Math.floor(y0);y<=Math.ceil(y1);y++){
    const yc=y+.5,xs=[];
    for(let i=0;i<n;i++){const ax=pts[i*2],ay=pts[i*2+1],bx=pts[((i+1)%n)*2],by=pts[((i+1)%n)*2+1];
      if((ay<=yc&&by>yc)||(by<=yc&&ay>yc)){xs.push(ax+(yc-ay)/(by-ay)*(bx-ax));}}
    xs.sort((a,b)=>a-b);
    for(let k=0;k+1<xs.length;k+=2){const a=Math.round(xs[k]),b=Math.round(xs[k+1]);if(b>a)g.fillRect(a,y,b-a,1);}
  }
}
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>(v+.5)/16);
function bay(x,y){return BAYER[(y&3)*4+(x&3)];}
// 縦のディザ・グラデーション（色の段を Bayer で混ぜる）
function vgrad(g,x,y,w,h,cols){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);const n=cols.length-1;
  for(let j=0;j<h;j++){const f=n*j/Math.max(1,h-1),i=Math.min(n-1,Math.floor(f)),fr=f-i;
    for(let k=0;k<w;k++){g.fillStyle=fr>bay(x+k,y+j)?cols[i+1]:cols[i];g.fillRect(x+k,y+j,1,1);}}
}
function hgrad(g,x,y,w,h,cols){
  x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);const n=cols.length-1;
  for(let k=0;k<w;k++){const f=n*k/Math.max(1,w-1),i=Math.min(n-1,Math.floor(f)),fr=f-i;
    for(let j=0;j<h;j++){g.fillStyle=fr>bay(x+k,y+j)?cols[i+1]:cols[i];g.fillRect(x+k,y+j,1,1);}}
}
// 一色を割合 f で重ねる（ディザ）
function dith(g,c,x,y,w,h,f){g.fillStyle=c;x=Math.round(x);y=Math.round(y);for(let j=0;j<h;j++)for(let k=0;k<w;k++)if(f>bay(x+k,y+j))g.fillRect(x+k,y+j,1,1);}
// 灯り：段になった円を加算で重ねる
function glow(g,x,y,r,rgb,a,steps){
  steps=steps||6;const o=g.globalCompositeOperation;g.globalCompositeOperation='lighter';
  for(let i=steps;i>=1;i--){const rr=r*i/steps;ell(g,`rgba(${rgb},${(a/steps).toFixed(3)})`,x,y,rr,rr);}
  g.globalCompositeOperation=o;
}
function glowE(g,x,y,rx,ry,rgb,a,steps){
  steps=steps||6;const o=g.globalCompositeOperation;g.globalCompositeOperation='lighter';
  for(let i=steps;i>=1;i--){ell(g,`rgba(${rgb},${(a/steps).toFixed(3)})`,x,y,rx*i/steps,ry*i/steps);}
  g.globalCompositeOperation=o;
}
// 街灯の光の円錐
function cone(g,x,y,w0,w1,h,rgb,a){
  const o=g.globalCompositeOperation;g.globalCompositeOperation='lighter';
  for(let i=0;i<4;i++){const k=1-i*.22;poly(g,`rgba(${rgb},${(a/4).toFixed(3)})`,[x-w0/2*k,y,x+w0/2*k,y,x+w1/2*k,y+h,x-w1/2*k,y+h]);}
  g.globalCompositeOperation=o;
}
function shade(g,c,a,x,y,w,h){g.save();g.globalAlpha=a;R(g,c,x==null?0:x,y==null?0:y,w==null?W:w,h==null?H:h);g.restore();}
let SEED=1;function srand(s){let h=Math.imul((s|0)^0x9e3779b9,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;SEED=(h>>>0)||1;}function rnd(){SEED=(SEED*1664525+1013904223)>>>0;return SEED/4294967296;}
function hash(a,b){let h=(a|0)*374761393+(b|0)*668265263;h=(h^(h>>>13))*1274126177;h=h^(h>>>16);return (h>>>0)/4294967296;}
function speck(g,c,x,y,w,h,n,seed){srand(seed||7);g.fillStyle=c;for(let i=0;i<n;i++)g.fillRect(Math.round(x+rnd()*w),Math.round(y+rnd()*h),1,1);}
function stars(g,x,y,w,h,n,seed){srand(seed||3);for(let i=0;i<n;i++){const sx=x+rnd()*w,sy=y+rnd()*h,b=rnd();px(g,b>.92?P.wh:b>.6?'#8a8ac8':'#4e4e8a',sx,sy);}}
// 外周線＋左上の光（rpg.js の pixelPost と同じ考え方）
function post(g,w,h,o){
  o=o||{};const d=g.getImageData(0,0,w,h),p=d.data,n=w*h,minA=o.minA||60;
  const a=new Uint8Array(n);for(let i=0;i<n;i++)a[i]=p[i*4+3]>minA?1:0;
  const L0=o.line||[27,18,38];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,q=i*4;
    const L=x>0&&a[i-1],Rr=x<w-1&&a[i+1],U=y>0&&a[i-w],D=y<h-1&&a[i+w];
    if(!a[i]){if(L||Rr||U||D){p[q]=L0[0];p[q+1]=L0[1];p[q+2]=L0[2];p[q+3]=o.lineA||255;}continue;}
    if(o.shade===false||p[q+3]<160)continue;
    const lr=o.light==='r';
    const darkSide=lr?(!L||!D):(!Rr||!D),liteSide=lr?(!Rr||!U):(!L||!U);
    if(darkSide){const k=.24;p[q]+=(27-p[q])*k;p[q+1]+=(18-p[q+1])*k;p[q+2]+=(38-p[q+2])*k;}
    else if(liteSide){const k=o.rim||.14;const rc=o.rimc||[255,250,236];p[q]+=(rc[0]-p[q])*k;p[q+1]+=(rc[1]-p[q+1])*k;p[q+2]+=(rc[2]-p[q+2])*k;}
  }
  g.putImageData(d,0,0);
}
function hexRgb(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function mix(a,b,f){const A=hexRgb(a),B=hexRgb(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*f).toString(16).padStart(2,'0')).join('');}

// ───────── 描画中の場面の状態（文字・注目物） ─────────
let S=null;   // {txt:[], mk:[], w, o, stab}
// 文字（拡大後に描く）：x,y は原寸ドット、s は原寸ドットでの文字の高さ
//   o: {c 色, f 'g'|'m'|'mono', al 'left'|'center'|'right', v 縦書き, b 太字, a 透明度, alt 安定度<70 で差し替える文, gl 発光色, rot 回転(rad), sp 字間(原寸), max 最大幅(原寸)}
function tx(x,y,s,str,o){if(S)S.txt.push(Object.assign({x,y,s,str:String(str)},o||{}));}
// 注目物（ホットスポットの目安）。x,y,w,h は原寸ドット
function mark(id,label,x,y,w,h){if(S&&!S.mk.some(m=>m.id===id))S.mk.push({id,label,x:+(x/W).toFixed(3),y:+(y/H).toFixed(3),w:+(w/W).toFixed(3),h:+(h/H).toFixed(3)});}
function stab(){return S?S.stab:100;}
function flag(n){return !!(S&&S.o&&S.o.flags&&S.o.flags[n]);}
function flag2(o,n){return !!(o&&o.flags&&o.flags[n]);}
// 分室のホワイトボードが「着任初日（2:17 より前）」の板書か
function officeBoardBlank(o){return flag2(o,'boardBlank')||!!(o&&o.spot==='c2_office'&&o.side==='a');}

// ───────── 人（場面用の小さな全身） ─────────
// o: {f:'f'|'b'|'l'|'r', hair, skin, top, top2, bot, shoe, hat:'cap'|'conductor'|'helmet'|'bun'|'kerchief', long:bool, skirt:bool, bag, kid, apron, umbrella, light:'l'|'r'}
function person(g,x,yb,h,o){
  o=o||{};const sw=Math.ceil(h*.75)+6,shh=h+6,c=mk(sw,shh),q=c.getContext('2d');
  const cx=sw/2|0,top=4;
  const hh=Math.max(3,Math.round(h*(o.kid?.24:.17))),hw=Math.max(3,Math.round(hh*.92));
  const th=Math.max(3,Math.round(h*(o.kid?.32:.36))),bw=Math.max(4,Math.round(h*(o.kid?.3:.28)));
  const lg=h-hh-th-1,f=o.f||'f';
  const skin=o.skin||'#d8b8a8',hair=o.hair||'#2a2234',top1=o.top||'#4a4a6a',top2=o.top2||mix(top1,'#000000',.3),bot=o.bot||'#2e2c40',shoe=o.shoe||'#1a1624';
  const hy=top,ty=top+hh+1,ly=ty+th;
  // 脚
  if(o.skirt){poly(q,bot,[cx-bw/2,ly-1,cx+bw/2,ly-1,cx+bw/2+1,ly+lg*.5,cx-bw/2-1,ly+lg*.5]);R(q,skin,cx-bw/2+1,ly+lg*.5,2,lg*.5-1);R(q,skin,cx+bw/2-3,ly+lg*.5,2,lg*.5-1);}
  else{const lw=Math.max(1,Math.round(bw*.38));R(q,bot,cx-bw/2+1,ly,lw,lg);R(q,bot,cx+bw/2-1-lw,ly,lw,lg);}
  R(q,shoe,cx-bw/2+(f==='l'?0:1),ly+lg-1,Math.max(2,bw*.4),1);R(q,shoe,cx+bw/2-1-Math.max(2,bw*.4)+(f==='r'?1:0),ly+lg-1,Math.max(2,bw*.4),1);
  // 胴
  poly(q,top1,[cx-bw/2,ty+1,cx-bw/2+1,ty,cx+bw/2-1,ty,cx+bw/2,ty+1,cx+bw/2,ly+(o.coat?lg*.4:0),cx-bw/2,ly+(o.coat?lg*.4:0)]);
  R(q,top2,cx+(f==='r'?-bw/2:bw/2-2),ty+1,2,th-1);
  if(o.apron)R(q,o.apron,cx-bw/2+2,ty+th*.35,bw-4,th*.65+lg*.35);
  // 腕
  const aw=Math.max(1,Math.round(bw*.18));
  R(q,top2,cx-bw/2-aw+1,ty+1,aw,th*.85);R(q,top2,cx+bw/2-1,ty+1,aw,th*.85);
  if(f!=='b'){R(q,skin,cx-bw/2-aw+1,ty+th*.85,aw,Math.max(1,aw));R(q,skin,cx+bw/2-1,ty+th*.85,aw,Math.max(1,aw));}
  if(o.bag)R(q,o.bag,cx+bw/2-1,ty+th*.6,Math.max(2,bw*.35),Math.max(2,th*.4));
  // 頭
  const hx=cx-hw/2+(f==='l'?-1:f==='r'?1:0);
  R(q,skin,hx,hy,hw,hh);R(q,skin,cx-1,hy+hh,2,1);
  if(f==='b'){R(q,hair,hx,hy,hw,hh);}
  else{R(q,hair,hx,hy,hw,Math.max(1,Math.round(hh*.38)));if(f==='l')R(q,hair,hx+hw-2,hy,2,hh*.8);else if(f==='r')R(q,hair,hx,hy,2,hh*.8);else{R(q,hair,hx,hy,1,hh*.7);R(q,hair,hx+hw-1,hy,1,hh*.7);}
    if(h>=26&&f==='f'){px(q,'#1a1420',cx-2,hy+hh*.55);px(q,'#1a1420',cx+1,hy+hh*.55);}}
  if(o.long)R(q,hair,hx-(f==='b'?0:0),hy+hh*.4,hw,hh*.9+th*.25);
  if(o.hat==='cap')R(q,o.hatc||'#2a2a4a',hx-1,hy-1,hw+2,Math.max(2,hh*.3));
  if(o.hat==='conductor'){R(q,o.hatc||'#1c2440',hx-1,hy-2,hw+2,Math.max(2,hh*.42));R(q,'#c8a040',hx+1,hy-1,hw-2,1);R(q,'#0e1020',hx-1,hy+hh*.3-1,hw+3,1);}
  if(o.hat==='helmet'){R(q,o.hatc||'#e8c040',hx-1,hy-2,hw+2,Math.max(2,hh*.45));}
  if(o.hat==='bun')R(q,hair,cx-2,hy-2,4,3);
  if(o.hat==='kerchief')R(q,o.hatc||'#8a4a5a',hx-1,hy-1,hw+2,Math.max(2,hh*.45));
  post(q,sw,shh,{light:o.light||'l',rim:o.rim||.1,rimc:o.rimc});
  g.drawImage(c,Math.round(x-sw/2),Math.round(yb-h-top));
}

// 遠くの人影（色だけの小さな影）
function shadowMan(g,x,yb,h,c){c=c||'#0c0a16';R(g,c,x-h*.13,yb-h*.82,h*.26,h*.82-h*.1);R(g,c,x-h*.09,yb-h,h*.18,h*.19);R(g,c,x-h*.11,yb-h*.18,h*.08,h*.18);R(g,c,x+h*.03,yb-h*.18,h*.08,h*.18);}

// ───────── 共通の小道具 ─────────
function windowLit(g,x,y,w,h,o){
  o=o||{};R(g,OL,x-1,y-1,w+2,h+2);
  if(o.lit){vgrad(g,x,y,w,h,[o.c1||P.a2,o.c2||P.a3,o.c3||P.a4]);if(o.curtain)R(g,mix(o.c2||P.a3,'#000000',.25),x,y,Math.max(1,w*.3),h);if(o.fig){R(g,'rgba(40,20,20,.55)',x+w*.55,y+h*.35,w*.22,h*.65);R(g,'rgba(40,20,20,.55)',x+w*.58,y+h*.15,w*.16,h*.22);}}
  else{vgrad(g,x,y,w,h,[o.d1||'#2a2c50',o.d2||'#171630']);px(g,'#5a5a9a',x+1,y+1);}
  if(o.bars){for(let i=1;i<o.bars;i++)R(g,OL,x+Math.round(w*i/o.bars),y,1,h);}
  if(o.hbar)R(g,OL,x,y+Math.round(h/2),w,1);
}
function pole(g,x,yb,h,o){
  o=o||{};const c=o.c||'#2a2638';R(g,OL,x-2,yb-h,4,h);R(g,c,x-1,yb-h,2,h);px(g,'#4a4660',x-1,yb-h+2);
  R(g,OL,x-7,yb-h+4,14,2);R(g,c,x-6,yb-h+4,12,1);
  if(o.arm2){R(g,OL,x-5,yb-h+9,10,2);}
  if(o.trans){R(g,OL,x+1,yb-h+12,5,8);R(g,'#3a3650',x+2,yb-h+13,3,6);}
  if(o.plate){R(g,OL,x-3,yb-h*.45,6,9);R(g,o.plate,x-2,yb-h*.45+1,4,7);}
}
function lamp(g,x,y,o){
  o=o||{};const rgb=o.rgb||'255,184,90';
  R(g,OL,x-1,y,2,o.h||40);R(g,'#2c2838',x,y,1,o.h||40);
  R(g,OL,x-1,y-1,o.left?-7:8,3);R(g,OL,x+(o.left?-9:6),y-1,5,4);R(g,o.on===false?'#3a3650':P.a2,x+(o.left?-8:7),y+1,3,2);
  if(o.on!==false){const lx=x+(o.left?-6.5:8.5),ly=y+3;cone(g,lx,ly,3,o.cw||46,o.ch||((o.h||40)-3),rgb,o.ca||.22);glow(g,lx,ly,o.gr||16,rgb,o.ga||.35);}
}
// 自販機
function vending(g,x,y,o){
  o=o||{};const w=o.w||16,h=o.h||28,body=o.body||'#c8ccd8';
  R(g,OL,x-1,y-1,w+2,h+2);R(g,body,x,y,w,h);R(g,mix(body,'#000000',.3),x+w-2,y,2,h);
  R(g,OL,x+2,y+2,w-5,h*.5);vgrad(g,x+3,y+3,w-7,h*.5-2,['#eaf6ff','#a6d4f0']);
  const rows=3,cols=4,cw=(w-7)/cols;
  for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){const cc=(o.cans||['#e05a6a','#4a8ad0','#f0c040','#5ab07a'])[(r*cols+k)%(o.cans||[1,2,3,4]).length];R(g,cc,x+3+k*cw+.5,y+4+r*(h*.5-3)/rows,Math.max(1,cw-1),Math.max(2,(h*.5-3)/rows-1));}
  R(g,'#1e1a2a',x+3,y+h*.62,w-7,3);R(g,'#2a2a3a',x+3,y+h-6,w-7,4);
  if(o.on!==false){glowE(g,x+w/2,y+h*.4,w*1.6,h*.9,o.rgb||'200,230,255',.28);}
}
function grass(g,x,y,w,n,cols,seed){srand(seed||11);for(let i=0;i<n;i++){const gx=x+rnd()*w,gh=1+rnd()*4|0;R(g,cols[(rnd()*cols.length)|0],gx,y-gh,1,gh);}}
function rainOn(g,t,n,rgb,len,seed){srand(seed||99);const c=`rgba(${rgb||'190,210,255'},.45)`;for(let i=0;i<n;i++){const x0=rnd()*W,sp=150+rnd()*90,ph=rnd();const yy=((ph*H+t*sp)%(H+20))-10,xx=(x0-yy*.18+W)%W;R(g,c,xx,yy,1,len||4);}}
function motes(g,t,n,rgb,area,seed){area=area||[0,0,W,H];srand(seed||5);for(let i=0;i<n;i++){const bx=area[0]+rnd()*area[2],by=area[1]+rnd()*area[3],sp=.2+rnd()*.5,ph=rnd()*TAU;const x=bx+Math.sin(t*sp+ph)*6,y=by-((t*sp*6+ph*10)%area[3]);const a=.25+.35*Math.max(0,Math.sin(t*1.3+ph));px(g,`rgba(${rgb||'159,240,224'},${a.toFixed(2)})`,x,y<area[1]?y+area[3]:y);}}
function fog(g,t,y,h,rgb,a,seed){srand(seed||21);for(let i=0;i<14;i++){const bx=rnd()*W,by=y+rnd()*h,rx=30+rnd()*50,ry=4+rnd()*6,sp=2+rnd()*4;const xx=((bx+t*sp)%(W+rx*2))-rx;glowE(g,xx,by,rx,ry,rgb||'120,130,180',a||.08,3);}}
function moon(g,x,y,r,o){o=o||{};glow(g,x,y,r*3.2,o.rgb||'200,210,255',.18);ell(g,o.c||'#e8e6f4',x,y,r,r);if(o.phase!==false)ell(g,o.dark||P.n2,x+r*.45,y-r*.15,r*.85,r*.9);}
function hills(g,y,amp,col,seed,step){srand(seed||4);step=step||6;let yy=y;const pts=[0,H];for(let x=0;x<=W+step;x+=step){yy+=(rnd()-.5)*amp;yy=Math.max(y-amp*2,Math.min(y+amp,yy));pts.push(x,yy);}pts.push(W,H);poly(g,col,pts);}
function treeLine(g,y,col,seed,size){srand(seed||8);size=size||8;for(let x=-4;x<W+8;x+=size*.55){const h=size*(.8+rnd()*.9);poly(g,col,[x-size*.5,y,x,y-h,x+size*.5,y]);}R(g,col,0,y,W,H-y);}
function crack(g,c,x,y,len,seed){srand(seed||13);let cx=x,cy=y;for(let i=0;i<len;i++){const nx=cx+(rnd()-.5)*4,ny=cy+1+rnd()*2;line(g,c,cx,cy,nx,ny);cx=nx;cy=ny;if(rnd()<.15){let bx=cx,by=cy;for(let k=0;k<3;k++){const ax=bx+(rnd()-.3)*4,ay=by+rnd()*2;line(g,c,bx,by,ax,ay);bx=ax;by=ay;}}}}
function vines(g,x,y,w,h,seed,cols){cols=cols||[P.g3,P.g2,P.g4];srand(seed||17);const n=Math.max(2,w/9|0);for(let i=0;i<n;i++){const vx0=x+rnd()*w,L=h*(.25+rnd()*.75),ph=rnd()*6,amp=.6+rnd()*1.6;let side=1;
    for(let k=0;k<L;k++){const vx=vx0+Math.sin(k*.18+ph)*amp,vy=y+k;px(g,cols[2]||cols[0],vx,vy);
      if(k%2===0){side=-side;const lc=cols[(rnd()*2)|0];px(g,lc,vx+side,vy);px(g,lc,vx+side*2,vy+1);if(rnd()<.45){px(g,lc,vx+side,vy+1);px(g,cols[1],vx+side*2,vy);}}}
    if(rnd()<.5){const by=y+L;px(g,cols[1],vx0-1,by);px(g,cols[0],vx0,by+1);}}}
function debris(g,x,y,w,n,seed){srand(seed||19);for(let i=0;i<n;i++){const dx=x+rnd()*w,s=1+rnd()*4|0;R(g,rnd()<.5?P.s5:P.s6,dx,y-s+rnd()*3,s+1,s);px(g,P.s4,dx,y-s+rnd()*3);}}
// 縦長の看板（文字は拡大後）
function vsign(g,x,y,w,h,bg,str,o){o=o||{};R(g,OL,x-1,y-1,w+2,h+2);R(g,bg,x,y,w,h);R(g,mix(bg,'#ffffff',.25),x,y,w,1);if(o.lit)glowE(g,x+w/2,y+h/2,w*1.5,h*.8,o.rgb||'255,200,140',.18);tx(x+w/2,y+2,Math.min(w-2,o.s||w-3),str,{c:o.c||'#1a1420',v:true,f:o.f||'g',b:true,al:'center',alt:o.alt,sp:o.sp,gl:o.gl});}
function hsign(g,x,y,w,h,bg,str,o){o=o||{};R(g,OL,x-1,y-1,w+2,h+2);R(g,bg,x,y,w,h);R(g,mix(bg,'#ffffff',.22),x,y,w,1);R(g,mix(bg,'#000000',.3),x,y+h-1,w,1);if(o.lit)glowE(g,x+w/2,y+h/2,w*.9,h*1.8,o.rgb||'255,200,140',.16);if(str)tx(x+w/2,y+(h-(o.s||h-3))/2,o.s||h-3,str,{c:o.c||'#1a1420',f:o.f||'g',b:o.b!==false,al:'center',alt:o.alt,sp:o.sp,gl:o.gl,max:w-2});}
function clock(g,x,y,r,hh,mm,o){o=o||{};ell(g,OL,x,y,r+1,r+1);ell(g,o.face||P.p1,x,y,r,r);for(let i=0;i<12;i++){const a=i/12*TAU;px(g,'#5a5068',x+Math.sin(a)*(r-1),y-Math.cos(a)*(r-1));}
  const ha=((hh%12)+mm/60)/12*TAU,ma=mm/60*TAU;line(g,'#1a1420',x,y,x+Math.sin(ha)*r*.5,y-Math.cos(ha)*r*.5);line(g,'#1a1420',x,y,x+Math.sin(ma)*r*.8,y-Math.cos(ma)*r*.8);if(o.sec!=null){const sa=o.sec/60*TAU;line(g,P.r2,x,y,x+Math.sin(sa)*r*.85,y-Math.cos(sa)*r*.85);}}
// 小さなモニター（ブラウン管 crt / 液晶 lcd）
function monitor(g,x,y,w,h,o){
  o=o||{};
  if(o.crt){R(g,OL,x-1,y-1,w+2,h+4);R(g,o.body||'#c8c0a8',x,y,w,h+2);R(g,mix(o.body||'#c8c0a8','#000000',.3),x,y+h,w,2);R(g,OL,x+2,y+2,w-4,h-4);R(g,o.scr||'#16301e',x+3,y+3,w-6,h-6);R(g,mix(o.scr||'#16301e','#ffffff',.08),x+3,y+3,w-6,1);R(g,o.body||'#c8c0a8',x+w*.3,y+h+2,w*.4,2);}
  else{R(g,OL,x-1,y-1,w+2,h+2);R(g,'#1a1824',x,y,w,h);R(g,o.scr||P.m5,x+1,y+1,w-2,h-2);R(g,OL,x+w/2-1,y+h+1,2,2);R(g,OL,x+w/2-3,y+h+3,6,1);}
}
function desk(g,x,y,w,h,o){o=o||{};const top=o.top||P.w3,side=mix(top,'#000000',.35);R(g,OL,x-1,y-1,w+2,3);R(g,top,x,y,w,2);R(g,mix(top,'#ffffff',.18),x,y,w,1);R(g,OL,x,y+2,w,h-2);R(g,side,x+1,y+2,w-2,h-3);if(o.drawer){R(g,mix(side,'#000000',.2),x+w-o.drawer-1,y+3,o.drawer,h-5);for(let i=0;i<3;i++)R(g,OL,x+w-o.drawer,y+3+(h-5)*(i+1)/3,o.drawer-2,1);}}
function chair(g,x,y,o){o=o||{};const c=o.c||'#2a2a40';R(g,OL,x-1,y-1,10,13);R(g,c,x,y,8,11);R(g,OL,x-1,y+12,10,3);R(g,mix(c,'#ffffff',.1),x,y+12,8,2);R(g,OL,x+3,y+15,2,4);R(g,OL,x,y+19,8,1);}
function plant(g,x,y,o){o=o||{};R(g,OL,x-3,y-1,8,7);R(g,o.pot||'#9a5434',x-2,y,6,5);srand(o.seed||3);for(let i=0;i<10;i++){const a=-Math.PI/2+(rnd()-.5)*2.2,l=4+rnd()*8;line(g,rnd()<.5?P.g3:P.g2,x+1,y,x+1+Math.cos(a)*l,y+Math.sin(a)*l);}}
function photoFrame(g,x,y,w,h,o){o=o||{};R(g,OL,x-1,y-1,w+2,h+2);R(g,o.frame||P.p2,x,y,w,h);R(g,o.bg||'#6a7898',x+1,y+1,w-2,h-2);
  if(o.person!==false){const hc=o.hair||'#2a2030';ell(g,o.skin||'#d8b8a8',x+w/2,y+h*.42,w*.2,h*.2);R(g,hc,x+w/2-w*.22,y+h*.18,w*.44,h*.12);R(g,o.top||'#3a4a6a',x+w*.2,y+h*.7,w*.6,h*.3-1);}}
function poster(g,x,y,w,h,bg,o){o=o||{};R(g,OL,x-1,y-1,w+2,h+2);R(g,bg,x,y,w,h);if(o.art)o.art(g,x,y,w,h);if(o.torn){poly(g,o.torn,[x+w-4,y+h,x+w,y+h-5,x+w,y+h]);}}

// ════════════════════════════════════════════════════════════════
//  場面の登録：SC[id] = {worlds:'AB…', name, bg(g,w,o)→data, fx(g,w,t,o,data), key(o)}
//  bg は静止部分（キャッシュされる）。fx は毎フレームの揺れもの。
// ════════════════════════════════════════════════════════════════
const SC={};
function scene(id,def){SC[id]=def;}

// 部屋の壁・床・天井
function room(g,o){
  vgrad(g,0,0,W,o.floorY,o.wall);
  if(o.wain){R(g,OL,0,o.wainY-1,W,1);vgrad(g,0,o.wainY,W,o.floorY-o.wainY,o.wain);for(let x=6;x<W;x+=14)R(g,mix(o.wain[o.wain.length-1],'#000000',.25),x,o.wainY+2,1,o.floorY-o.wainY-3);}
  R(g,OL,0,o.floorY-3,W,1);R(g,o.base||P.s6,0,o.floorY-2,W,2);
  vgrad(g,0,o.floorY,W,H-o.floorY,o.floor);
  if(o.tiles){for(let y=o.floorY+4,k=0;y<H;y+=6+k*2,k++)R(g,mix(o.floor[0],'#000000',.25),0,y,W,1);for(let i=-12;i<=12;i++)line(g,mix(o.floor[0],'#000000',.2),160+i*16,o.floorY,160+i*40,H);}
  if(o.boards){for(let y=o.floorY+3,k=0;y<H;y+=4+k,k++){R(g,mix(o.floor[1],'#000000',.3),0,y,W,1);srand(y);for(let x=rnd()*30;x<W;x+=30+rnd()*30)R(g,mix(o.floor[1],'#000000',.3),x,y-4-k,1,4+k);}}
  if(o.ceil){R(g,o.ceil,0,0,W,5);R(g,OL,0,5,W,1);}
}
function tube(g,x,y,w,on){R(g,OL,x-1,y-1,w+2,4);R(g,on?'#f4fbff':'#4a4a5a',x,y,w,2);if(on){glowE(g,x+w/2,y+6,w*.9,22,'200,225,255',.16);}}

// ───────── 観測センター：事務室 ─────────
scene('center_office',{worlds:'ABC',name:'観測センター月代分室・事務室',
  // flags.boardBlank：着任初日（2:17 の前）のホワイトボード／違和感探し c2_office の「初日の写真」側も同じ
  // flags.clockAlt：END B の分室（壁時計の銘が「月代時計」）
  key(o){return (officeBoardBlank(o)?'bb':'')+(flag2(o,'clockAlt')?'ca':'');},
  bg(g,w,o){
    if(w==='A'){room(g,{wall:['#565a78','#4c5070','#3e4260'],floorY:122,floor:['#3a3c52','#2a2a3e','#1e1e2e'],tiles:true,ceil:'#6a6e8a',base:'#2a2a3a'});}
    else if(w==='B'){room(g,{wall:['#6a5a52','#5a4a44','#4a3c38'],wain:['#5a3a26','#4a2e1e'],wainY:88,floorY:122,floor:['#5a3c28','#4a3020','#3a2418'],boards:true,ceil:'#7a6658',base:'#2e1c14'});}
    else{room(g,{wall:['#2a2e40','#22263a','#1a1c2c'],floorY:122,floor:['#22222e','#1a1a24','#121218'],ceil:'#30324a',base:'#141420'});}
    // 天井灯
    if(w==='A'){tube(g,50,7,40,true);tube(g,140,7,40,true);tube(g,230,7,40,true);}
    else if(w==='B'){for(const x of [70,160,250]){line(g,OL,x,5,x,12);ell(g,OL,x,15,6,4);ell(g,'#e8d0a0',x,15,5,3);glow(g,x,16,40,'255,200,130',.32);}}
    else{tube(g,50,7,40,false);R(g,OL,140,6,22,3);line(g,OL,162,6,176,22);R(g,'#4a4a5a',163,8,12,2);}
    // 室名の札（上中央）
    hsign(g,112,9,96,10,w==='B'?'#3a2a1e':w==='C'?'#3a3c4a':'#e8eaf2',w==='A'?'特殊現象観測センター 月代分室':w==='B'?'國立 月代觀測所':'特殊現象観 　ンター',{c:w==='B'?'#e8d4a0':w==='C'?'#7a7c8a':'#2a2c40',s:6.4,f:w==='B'?'m':'g',alt:w==='A'?'境界事象対策局 月代分室':w==='B'?'國立 月代觀測署':null});
    mark('nameplate','室名の札（A:特殊現象観測センター 月代分室／B:國立 月代觀測所）',112,9,96,10);
    // 窓
    const wx=44,wy=26,ww=56,wh=58;R(g,OL,wx-2,wy-2,ww+4,wh+4);R(g,w==='B'?'#6a4a30':'#8a8ea8',wx-1,wy-1,ww+2,wh+2);
    if(w==='C')vgrad(g,wx,wy,ww,wh,['#1a3a44','#2a5a5e','#3a6a64']);else vgrad(g,wx,wy,ww,wh,['#0c0b24','#1c1a40','#2e2a54']);
    stars(g,wx,wy,ww,wh*.5,14,w==='B'?5:4);
    if(w!=='C')moon(g,wx+44,wy+12,4,{dark:'#14132e'});
    srand(31);let hy=wy+38;const hp=[wx,wy+wh];for(let x=wx;x<=wx+ww;x+=4){hy+=(rnd()-.5)*3;hp.push(x,Math.min(wy+wh,hy));}hp.push(wx+ww,wy+wh);poly(g,w==='C'?'#1a2a30':'#0e0e22',hp);
    srand(33);for(let i=0;i<16;i++){const lx=wx+2+rnd()*(ww-4),ly=wy+44+rnd()*12;if(w==='C'){if(rnd()<.15)px(g,P.c2,lx,ly);}else px(g,rnd()<.7?P.a2:P.a1,lx,ly);}
    if(w==='B'){// 架線と信号：鉄道がある
      wire(g,'#3a3656',wx,wy+33,wx+ww,wy+31,1);wire(g,'#3a3656',wx,wy+35,wx+ww,wy+34,1);R(g,'#2a2846',wx+8,wy+30,1,20);R(g,'#2a2846',wx+40,wy+29,1,22);px(g,'#5af08a',wx+50,wy+40);glow(g,wx+50,wy+40,3,'90,240,140',.4);
      mark('window_rail','窓の外：架線と信号（Bだけ。鉄道がある）',wx,wy+26,ww,24);}
    if(w==='C'){crack(g,'#c8e8f0',wx+10,wy+2,24,9);crack(g,'#c8e8f0',wx+38,wy+6,18,12);vines(g,wx,wy,ww,30,4);}
    R(g,w==='B'?'#6a4a30':'#8a8ea8',wx+ww/2-1,wy,2,wh);R(g,w==='B'?'#6a4a30':'#8a8ea8',wx,wy+wh/2-1,ww,2);
    mark('window','窓（夜の町）',wx,wy,ww,wh);
    // 板書（A:ホワイトボード／B:黒板）
    const bx=108,by=30,bw=46,bh=36;
    if(w==='B'){R(g,OL,bx-2,by-2,bw+4,bh+4);R(g,'#7a5a3a',bx-1,by-1,bw+2,bh+2);R(g,'#24382c',bx,by,bw,bh);speck(g,'#34483c',bx,by,bw,bh,40,3);
      tx(bx+3,by+3,4.6,'本日ノ観測',{c:'#e8eee0',f:'m'});tx(bx+3,by+10,4.2,'異常 ナシ',{c:'#e8eee0',f:'m'});tx(bx+3,by+17,4,'当番 御堂',{c:'#d8e0d0',f:'m'});R(g,'#e8eee0',bx+28,by+bh-3,6,1);}
    else if(w==='A'&&officeBoardBlank(o)){R(g,OL,bx-2,by-2,bw+4,bh+4);R(g,'#b8bccc',bx-1,by-1,bw+2,bh+2);R(g,'#e8ecf4',bx,by,bw,bh);
      tx(bx+3,by+3,4.4,'ようこそ 月代分室へ',{c:'#2a40a0'});tx(bx+3,by+11,4.2,'当直：如月・新人',{c:'#2a40a0'});tx(bx+3,by+18,4,'日報は朝9時まで',{c:'#c03040'});R(g,'#c03040',bx+bw-8,by+bh+1,5,2);R(g,'#2a40a0',bx+bw-14,by+bh+1,5,2);}
    else if(w==='A'){R(g,OL,bx-2,by-2,bw+4,bh+4);R(g,'#b8bccc',bx-1,by-1,bw+2,bh+2);R(g,'#e8ecf4',bx,by,bw,bh);
      tx(bx+3,by+3,4.6,'2:17 通信障害',{c:'#2a40a0'});tx(bx+3,by+10,4.2,'約1分／映像・音声のみ',{c:'#2a40a0'});tx(bx+3,by+17,4.2,'※停電なし',{c:'#c03040'});line(g,'#2a40a0',bx+4,by+30,bx+40,by+26);R(g,'#c03040',bx+bw-8,by+bh+1,5,2);R(g,'#2a40a0',bx+bw-14,by+bh+1,5,2);}
    else{R(g,OL,bx-2,by-2,bw+4,bh+4);R(g,'#5a5e6e',bx,by,bw,bh);line(g,'#3a3e4e',bx,by+6,bx+bw,by+bh-4);tx(bx+3,by+12,4.4,'2:17',{c:'#3a4a7a',a:.6});}
    mark('board',w==='B'?'黒板（本日ノ観測 異常ナシ）':w==='A'&&officeBoardBlank(o)?'ホワイトボード（着任初日：ようこそ／当直表）':'ホワイトボード（2:17 通信障害のメモ）',bx,by,bw,bh);
    // 時計
    const cx=172,cy=42;
    if(w==='B'){R(g,OL,cx-8,cy-11,16,34);R(g,'#5a3a22',cx-7,cy-10,14,32);clock(g,cx,cy-2,6,2,17,{face:'#f0e4c8'});R(g,OL,cx-4,cy+7,8,12);R(g,'#2a1810',cx-3,cy+8,6,10);
      tx(cx,cy+22.5,2.6,'明光舎',{c:'#e8d4a0',al:'center',f:'m'});}
    else if(w==='A'){clock(g,cx,cy,9,2,17,{sec:12});tx(cx,cy+3,2.2,flag2(o,'clockAlt')?'月代時計':'TSUKUYO',{c:'#6a6a7a',al:'center',f:flag2(o,'clockAlt')?'m':'g'});}
    else{clock(g,cx,cy,9,4,44,{face:'#9a98a8'});crack(g,'#5a5868',cx-6,cy-7,6,4);}
    mark('clock',w==='A'?(flag2(o,'clockAlt')?'壁の時計（メーカー 月代時計・END B）':'壁の時計（メーカー TSUKUYO・2:17）'):w==='B'?'振り子時計（メーカー 明光舎）':'止まった時計（4:44）',cx-10,cy-11,20,w==='B'?36:22);
    // 職員写真
    const px0=190,py0=30;R(g,OL,px0-2,py0-2,52,36);R(g,w==='B'?'#4a3020':'#c8b898',px0-1,py0-1,50,34);R(g,w==='B'?'#3a2618':'#a89878',px0,py0,48,32);
    const staff=[['#2a2030','#d8b8a8','#4a5a7a'],['#5a5a60','#d0b0a0','#6a4a3a'],['#1a1820','#e0c0b0','#2a3a5a'],['#3a2a20','#d8b8a0','#5a6a5a'],['#2a2a3a','#d8c0b0','#3a3a4a'],['#8a8890','#d0b0a0','#4a3a5a']];
    const nPh=w==='B'?6:5;
    for(let i=0;i<nPh;i++){const c=i%3,r=i/3|0;const fx0=px0+3+c*15,fy0=py0+3+r*15;if(w==='C'&&i===2){R(g,OL,fx0-1,fy0-1,13,14);R(g,'#4a4a52',fx0,fy0,11,12);continue;}
      photoFrame(g,fx0,fy0,11,12,{hair:staff[i][0],skin:w==='C'?'#9a98a0':staff[i][1],top:staff[i][2],bg:w==='B'?'#8a7a60':'#7a8aa8',frame:w==='B'?'#d8c8a0':P.p2});}
    if(w==='A')R(g,'#b8a888',px0+33,py0+18,11,12);
    tx(px0+24,py0+33.5,2.6,w==='B'?'所員一同':'職員',{c:w==='B'?'#e8d4a0':'#3a3448',al:'center',f:w==='B'?'m':'g'});
    mark('staff_photos',w==='B'?'職員写真（6人：右下に見知らぬ1人が多い）':'職員写真（5人。右下は空き）',px0-2,py0-2,52,40);
    if(w==='B')mark('photo_extra','職員写真の6人目（白髪の人物：Aにはいない）',px0+33,py0+18,11,12);
    // カレンダー／ポスター
    const kx=248,ky=30;R(g,OL,kx-1,ky-1,22,28);R(g,P.p1,kx,ky,20,26);R(g,w==='B'?'#a03030':'#3a5aa0',kx,ky,20,6);
    for(let r=0;r<4;r++)for(let c=0;c<5;c++)px(g,c===0?'#c03040':'#5a5468',kx+2+c*4,ky+12+r*3.4);
    if(w==='C'){R(g,'#5a5660',kx,ky,20,26);poly(g,'#3a3644',[kx,ky+14,kx+20,ky+10,kx+20,ky+26,kx,ky+26]);}
    tx(kx+10,ky+.6,4.2,w==='B'?'十月':w==='C'?'':'10月',{c:'#ffffff',al:'center',f:w==='B'?'m':'g',b:true});
    tx(kx+10,ky+7.2,2.6,w==='B'?'昭和百一年':w==='C'?'':'令和八年',{c:'#2a2434',al:'center',f:w==='B'?'m':'g'});
    mark('calendar',w==='B'?'カレンダー（昭和百一年 十月）':'カレンダー（令和八年 10月）',kx-1,ky-1,22,28);
    // ドア
    R(g,OL,282,38,28,84);R(g,w==='B'?'#6a4a30':'#7a7e98',283,39,26,83);R(g,w==='B'?'#5a3a24':'#6a6e88',286,44,20,30);R(g,P.a3,304,82,2,4);
    if(w==='C'){poly(g,'#0a0a12',[283,39,300,39,292,122,283,122]);}
    // 標語ポスター（ドアの左）
    poster(g,258,66,18,24,w==='B'?'#e8dcc0':'#f0f2f8');
    if(w==='A'){R(g,'#3a6ad0',259,67,16,5);tx(267,73,2.8,'情報',{c:'#2a2c40',al:'center',b:true});tx(267,77,2.8,'セキュリティ',{c:'#2a2c40',al:'center'});tx(267,81.5,2.6,'強化月間',{c:'#2a2c40',al:'center'});}
    else if(w==='B'){R(g,'#c03030',259,67,16,5);tx(267,72.5,4.4,'火の',{c:'#a02020',al:'center',f:'m',b:true});tx(267,78,4.4,'用心',{c:'#a02020',al:'center',f:'m',b:true});}
    else{R(g,'#4a4a52',258,66,18,24);}
    mark('poster',w==='B'?'標語ポスター「火の用心」':'標語ポスター「情報セキュリティ強化月間」',257,65,20,26);
    // 左端：A 給水器／B 石油ストーブ
    if(w==='A'){R(g,OL,15,82,14,40);R(g,'#dfe4ee',16,83,12,38);ell(g,OL,22,76,6,7);ell(g,'#9ac8f0',22,76,5,6);R(g,'#3a8ae0',19,96,2,3);R(g,'#e04a4a',24,96,2,3);mark('cooler','ウォーターサーバー（Aだけ）',14,68,16,54);}
    else if(w==='B'){R(g,OL,13,100,18,22);R(g,'#5a5a62',14,101,16,20);R(g,OL,16,104,12,10);R(g,'#ff9040',17,105,10,8);glow(g,22,110,22,'255,140,60',.4);R(g,'#7a7a82',14,98,16,3);mark('stove','石油ストーブ（Bだけ）',12,96,20,26);}
    // 机（奥）
    desk(g,30,118,104,16,{top:w==='B'?'#7a5236':'#9aa0b4',drawer:16});desk(g,178,118,110,16,{top:w==='B'?'#7a5236':'#9aa0b4',drawer:16});
    if(w==='C'){poly(g,'#121218',[178,118,288,124,288,134,178,134]);}
    // 左の机の上
    if(w==='A'){monitor(g,44,92,30,20,{scr:'#1a3a6a'});monitor(g,78,94,28,18,{scr:'#24305a'});
      R(g,OL,112,110,16,8);R(g,'#2a2c38',113,111,14,6);for(let i=0;i<6;i++)px(g,'#7a8098',115+i*2,113);R(g,'#2a2c38',110,108,6,3);
      mark('terminal','端末（液晶モニター2台）',42,90,66,28);mark('phone','ビジネスフォン',110,107,18,11);}
    else if(w==='B'){monitor(g,46,88,34,26,{crt:true,scr:'#0e2a14'});R(g,OL,84,110,22,8);R(g,'#3a3a40',85,111,20,6);for(let i=0;i<8;i++)px(g,'#a8a8b0',86+i*2.4,113);
      ell(g,OL,118,113,8,4);ell(g,'#1a1a1e',118,113,7,3);ell(g,'#2a2a30',118,112,4,2);R(g,OL,111,108,14,3);R(g,'#1a1a1e',112,108,12,2);
      mark('terminal','端末（ブラウン管・緑の文字）',44,86,40,32);mark('phone','黒電話（ダイヤル式）',109,106,19,12);}
    else{R(g,OL,46,104,30,8);R(g,'#2a2a34',47,105,28,6);debris(g,30,122,100,14,5);mark('terminal','倒れた端末',44,100,36,14);}
    // 右の机の上
    if(w==='A'){monitor(g,196,92,32,22,{scr:'#16305a'});R(g,OL,236,108,30,10);R(g,'#c8ccd8',237,109,28,8);R(g,'#3a3e52',238,110,26,5);
      R(g,OL,272,108,8,10);R(g,'#e8e4dc',273,109,6,8);R(g,'#c86a4a',273,112,6,2);
      R(g,OL,250,104,14,4);R(g,'#f4efe6',251,104,12,3);
      mark('laptop','ノートPC',236,107,30,12);mark('mug','マグカップ（湯気）',271,104,10,14);}
    else if(w==='B'){monitor(g,196,90,30,24,{crt:true,scr:'#0e2a14',body:'#b8b098'});
      R(g,OL,236,104,34,14);R(g,'#3a3a40',237,105,32,12);R(g,'#1a1a1e',239,100,28,5);R(g,'#f4efe6',243,94,20,8);for(let i=0;i<8;i++)px(g,'#d8d8dc',240+i*3.5,113);
      R(g,OL,274,110,10,7);R(g,'#8a8a92',275,111,8,5);
      mark('typewriter','タイプライター（Bだけ）',236,93,35,26);mark('ashtray','灰皿',273,109,12,9);}
    else{debris(g,180,122,108,20,9);R(g,OL,240,140,22,6);R(g,P.p2,241,141,20,4);}
    // 椅子
    if(w!=='C'){chair(g,74,124,{c:w==='B'?'#5a3a2a':'#2a2c44'});chair(g,232,124,{c:w==='B'?'#5a3a2a':'#2a2c44'});}
    else{poly(g,'#1a1a28',[70,150,84,140,92,152,78,160]);}
    // 手前：自分の机のふち
    if(w!=='C'){const top=w==='B'?'#7a5236':'#8a90a4';poly(g,OL,[60,163,260,163,272,180,48,180]);poly(g,top,[61,164,259,164,270,180,50,180]);R(g,mix(top,'#ffffff',.2),61,164,198,1);
      R(g,OL,96,166,26,12);R(g,P.p1,97,167,24,10);for(let k=0;k<4;k++)R(g,'#8a8a9a',99,169+k*2,16-(k%2)*5,1);line(g,w==='B'?'#2a2a2a':'#2a40a0',124,176,132,168);
      R(g,OL,196,166,10,11);R(g,w==='B'?'#e8e0c8':'#e8e4dc',197,167,8,9);R(g,w==='B'?'#5a3a2a':'#3a6ad0',197,170,8,2);
      if(w==='A'){R(g,OL,150,168,28,10);R(g,'#2a2c38',151,169,26,8);for(let k=0;k<6;k++)R(g,'#5a6078',152+k*4,171,3,1);}else{R(g,OL,146,166,30,12);R(g,'#3a2a20',147,167,28,10);R(g,'#d8c8a0',149,168,24,7);}
      mark('my_desk','自分の机（書類・'+(w==='A'?'キーボード':'帳面')+'・マグ）',48,163,224,17);}
    // 床の書類（C）
    if(w==='C'){srand(77);for(let i=0;i<12;i++){const x=20+rnd()*280,y=140+rnd()*34;R(g,'#8a8a98',x,y,6,3);}vines(g,40,0,240,26,8);crack(g,'#0e0e14',30,6,30,4);glowE(g,160,174,70,10,'79,200,188',.25);}
    return {w};
  },
  fx(g,w,t,o){
    if(w==='A'){if(Math.sin(t*23)>.97&&Math.sin(t*1.3)>.2)R(g,'rgba(10,10,30,.25)',140,6,42,30);
      for(let i=0;i<3;i++){const a=((t*.6+i/3)%1);px(g,`rgba(230,230,240,${(1-a)*.5})`,276+Math.sin(t*2+i)*1.5,103-a*10);}
      R(g,`rgba(120,170,255,${.05+.03*Math.sin(t*3)})`,40,88,70,26);
      const s=(t|0)%60;clock(g,172,42,9,2,17,{sec:s});}
    if(w==='B'){const sw=Math.sin(t*3.1)*2;R(g,'#2a1810',169,50,6,10);line(g,'#c8a050',172,50,172+sw,56);ell(g,'#e0b860',172+sw,57,1.5,1.5);
      R(g,`rgba(60,255,120,${.04+.02*Math.sin(t*5)})`,48,90,30,22);if((t*2|0)%2)R(g,'#6aff9a',53,100,2,1);
      glow(g,22,110,8+Math.sin(t*7)*1.5,'255,140,60',.12);}
    if(w==='C'){motes(g,t,14,'159,240,224',[20,100,280,80],3);}
  }
});

// ───────── 観測センター：サーバー室 ─────────
scene('center_server',{worlds:'ABC',name:'観測センター・サーバー室',
  bg(g,w){
    const vx=160,vy=86;
    // 背景（奥の壁）
    vgrad(g,0,0,W,H,w==='B'?['#2a2420','#1e1a18','#141010']:w==='C'?['#101418','#0c1012','#080a0c']:['#141a2e','#10162a','#0a0e1e']);
    // 床
    poly(g,w==='B'?'#3a3028':w==='C'?'#141818':'#1e2436',[0,H,W,H,vx+40,vy+30,vx-40,vy+30]);
    for(let i=1;i<9;i++){const y=vy+30+(H-vy-30)*Math.pow(i/9,1.6);R(g,w==='B'?'#2a2018':'#161a2a',0,y,W,1);}
    for(let i=-6;i<=6;i++)line(g,w==='B'?'#2a2018':'#161a2a',vx+i*7,vy+30,vx+i*40,H);
    // 天井
    poly(g,w==='B'?'#2a2420':'#121628',[0,0,W,0,vx+40,vy-44,vx-40,vy-44]);
    for(let i=0;i<4;i++){const k=i/4,y=(vy-44)*k;}
    // 奥の壁と端末
    R(g,OL,vx-41,vy-45,82,76);vgrad(g,vx-40,vy-44,80,74,w==='B'?['#3a322a','#2a241e']:w==='C'?['#1a2020','#121616']:['#1e2640','#161c32']);
    const D={leds:[]};
    // 左右のラック列（遠近）
    for(const side of [-1,1]){
      for(let k=0;k<5;k++){
        const z0=k/5,z1=(k+.86)/5;const xa=side<0?0+(vx-40)*z0*1.0:W-(W-(vx+40))*z0,xb=side<0?(vx-40)*z1:W-(W-(vx+40))*z1;
        const ta=0+(vy-44)*z0,tb=(vy-44)*z1,ba=H-(H-(vy+30))*z0,bb=H-(H-(vy+30))*z1;
        const body=w==='B'?(k%2?'#8a8670':'#9a9480'):w==='C'?'#1c1e22':'#16182a';
        poly(g,OL,[xa,ta-1,xb,tb-1,xb,bb+1,xa,ba+1]);poly(g,body,[xa+side*-0,ta,xb,tb,xb,bb,xa,ba]);
        const face=w==='B'?'#6a6656':w==='C'?'#141518':'#0e1020';
        // 前面の細部
        const nx=Math.abs(xb-xa);
        if(w==='B'){// テープの円盤
          for(let r=0;r<2;r++){const cx=(xa+xb)/2,cy=ta+(ba-ta)*(.22+r*.26)+((tb-ta)*.5);const rr=Math.max(2,nx*.22);ell(g,OL,cx,cy,rr*.7+1,rr+1);ell(g,'#2a2a2a',cx,cy,rr*.7,rr);ell(g,'#8a8a8a',cx,cy,rr*.25,rr*.35);D.leds.push({x:cx,y:cy,r:rr,reel:true,k});}
          for(let i=0;i<4;i++){const ly=ta+(ba-ta)*(.66+i*.07);const lx=xa+(xb-xa)*.3;D.leds.push({x:lx,y:ly,c:i%2?'255,180,60':'255,90,60',k});}}
        else if(w==='A'){for(let i=0;i<10;i++){const f=(i+1)/11,ly=ta+(ba-ta)*f*.92+((tb-ta)-(ta-ta))*0;const y1=ta+(ba-ta)*f,y2=tb+(bb-tb)*f;line(g,'#242842',xa,y1,xb,y2);
            for(let j=0;j<3;j++){const ff=.2+j*.25;D.leds.push({x:xa+(xb-xa)*ff,y:y1+(y2-y1)*ff+1,c:j===0?'90,240,160':(j===1?'90,170,255':'90,240,160'),k});}}}
        else{for(let i=0;i<6;i++){const f=(i+1)/7,y1=ta+(ba-ta)*f,y2=tb+(bb-tb)*f;line(g,'#0a0a0c',xa,y1,xb,y2);}if(k===1&&side>0)D.leds.push({x:xa+(xb-xa)*.4,y:(ta+ba)/2,c:'230,60,80',k,red:true});}
        // 床への反射
        if(w==='C'&&k<2){poly(g,'rgba(60,80,90,.35)',[xa,ba+2,xb,bb+2,xb,bb+8,xa,ba+16]);}
      }
    }
    // ケーブルラック（天井）
    if(w!=='C'){for(const s of [-1,1]){line(g,w==='B'?'#5a5040':'#2a3050',vx+s*18,vy-44,vx+s*90,0);line(g,w==='B'?'#5a5040':'#2a3050',vx+s*24,vy-44,vx+s*130,0);}
      for(let i=0;i<5;i++){const f=i/5;line(g,w==='B'?'#4a4232':'#222842',vx-18-72*f,vy-44-(vy-44)*f,vx+18+72*f,vy-44-(vy-44)*f);}}
    else{line(g,'#1a1a1a',100,0,150,60);line(g,'#1a1a1a',152,60,148,90);}
    // 奥の端末
    const cx=vx,cy=vy-6;
    if(w==='B'){R(g,OL,cx-26,cy-6,52,40);R(g,'#b8b098',cx-25,cy-5,50,38);R(g,OL,cx-18,cy-2,36,22);R(g,'#1e1406',cx-17,cy-1,34,20);for(let i=0;i<5;i++)R(g,'#e0a040',cx-15,cy+1+i*3.5,10+((i*7)%18),1);R(g,'#8a8270',cx-25,cy+24,50,8);for(let i=0;i<12;i++)px(g,'#3a3a32',cx-22+i*4,cy+27);
      tx(cx,cy-12,4.4,'電算室',{c:'#e8d8b0',al:'center',f:'m',b:true});hsign(g,cx-14,cy-16,28,8,'#5a3a26',null);
      mark('log_terminal','奥の端末（ブラウン管・アンバー文字）',cx-26,cy-6,52,40);}
    else if(w==='A'){desk(g,cx-28,cy+20,56,10,{top:'#3a4058'});monitor(g,cx-18,cy-2,36,22,{scr:'#0a1a34'});for(let i=0;i<6;i++)R(g,i===5?'#e05a6a':'#6ac8ff',cx-16,cy+1+i*3,6+((i*11)%22),1);
      hsign(g,cx-26,cy-20,52,8,'#d8dce8','サーバー室',{c:'#2a2c40',s:5.2});
      mark('log_terminal','奥の端末（ログの画面）',cx-28,cy-4,56,36);}
    else{desk(g,cx-28,cy+20,56,10,{top:'#22242c'});monitor(g,cx-18,cy-2,36,22,{scr:'#0a0c10'});R(g,'#e05a6a',cx-14,cy+6,2,2);mark('log_terminal','奥の端末（ほぼ消えている）',cx-28,cy-4,56,36);}
    // ラックの札
    if(w==='A'){hsign(g,62,40,20,7,'#e8eaf2','RACK-04',{c:'#2a2c40',s:4.4});mark('rack_label','ラックの札「RACK-04」',60,38,24,11);}
    else if(w==='B'){hsign(g,60,38,24,9,'#e8dcc0','第四號機',{c:'#2a1a10',s:5.4,f:'m'});mark('rack_label','機械の札「第四號機」',58,36,28,13);mark('tape_reel','テープ記憶装置の円盤（Bだけ）',20,40,50,80);}
    else{R(g,OL,62,52,18,6);R(g,'#5a5a62',63,53,16,4);mark('rack_label','落ちかけた札',60,50,22,10);mark('red_led','赤く点滅するランプ（4回ずつ）',220,60,30,40);}
    if(w==='A'){R(g,OL,232,118,12,8);R(g,'#ffe066',233,119,10,6);tx(238,119.6,2.6,'点検中',{c:'#3a2a10',al:'center'});mark('note','貼り紙「点検中」',231,117,14,10);}
    if(w==='C'){glowE(g,160,170,90,10,'40,60,70',.3);speck(g,'#2a2e34',0,120,W,60,120,3);}
    return D;
  },
  fx(g,w,t,o,D){
    if(!D)return;
    for(const L of D.leds){
      if(L.reel){const a=t*(1.2+L.k*.3);for(let i=0;i<3;i++){const aa=a+i*TAU/3;px(g,'#c8c8c8',L.x+Math.cos(aa)*L.r*.45*.7,L.y+Math.sin(aa)*L.r*.45);}continue;}
      if(L.red){const ph=(t*2)%3;const on=ph<2&&((ph*2)%1)<.5;if(on){px(g,'#ff4a5a',L.x,L.y);glow(g,L.x,L.y,8,'230,60,80',.5);}continue;}
      const on=hash(L.x*7+L.y*3,(t*(3+L.k))|0)>.35;if(on)px(g,`rgb(${L.c})`,L.x,L.y);
    }
    if(w==='A'){const y=((t*10)%18)|0;R(g,'rgba(106,200,255,.25)',142,80+y,36,1);}
  }
});

// ───────── 観測センター：観測装置室 ─────────
scene('center_lab',{worlds:'ABC',name:'観測センター・観測装置室',
  key(o){return o&&o.flags&&o.flags.feed?'feed':'';},
  bg(g,w,o){
    room(g,w==='B'?{wall:['#2e2a30','#26222a','#1e1a22'],floorY:126,floor:['#2a2420','#221c18','#1a1410'],boards:true,base:'#140e0c'}:w==='C'?{wall:['#121620','#0e121a','#0a0c14'],floorY:126,floor:['#141820','#0e1218','#0a0c10'],base:'#08080c'}:{wall:['#161c34','#121830','#0e1226'],floorY:126,floor:['#1a2036','#141a2c','#0e1220'],tiles:true,base:'#0a0c18'});
    const D={};
    // 大モニター
    const mx=96,my=18,mw=128,mh=70;
    if(w==='B'){// ブラウン管の壁
      R(g,OL,mx-4,my-3,mw+8,mh+8);R(g,'#4a4236',mx-3,my-2,mw+6,mh+6);
      for(let r=0;r<3;r++)for(let c=0;c<4;c++){const x=mx+c*32+1,y=my+r*23+1;monitor(g,x+1,y+1,28,19,{crt:true,scr:'#0a2010',body:'#a8a088'});}
      mark('big_monitor','ブラウン管の壁（12台）',mx-4,my-3,mw+8,mh+8);}
    else{R(g,OL,mx-2,my-2,mw+4,mh+4);R(g,'#1a1c28',mx-1,my-1,mw+2,mh+2);R(g,w==='C'?'#06080a':'#06142a',mx,my,mw,mh);
      if(w==='C'){crack(g,'#8a9aa8',mx+60,my+2,30,5);crack(g,'#8a9aa8',mx+64,my+6,26,8);crack(g,'#5a6a78',mx+30,my+20,16,3);}
      mark('big_monitor',w==='C'?'割れた大モニター':'大モニター',mx-2,my-2,mw+4,mh+4);}
    D.m={mx,my,mw,mh};
    // 観測装置（リング）
    const ax=160,ay=118;
    ell(g,'rgba(0,0,0,.4)',ax,ay+20,40,6);
    R(g,OL,ax-30,ay+6,60,16);R(g,w==='B'?'#6a6050':'#3a4058',ax-29,ay+7,58,14);R(g,w==='B'?'#8a7e66':'#4a5270',ax-29,ay+7,58,2);
    for(let i=0;i<5;i++)px(g,w==='C'?'#3a2a2a':i%2?P.c2:P.a2,ax-22+i*10,ay+14);
    ell(g,OL,ax,ay-12,27,20);ell(g,w==='B'?'#8a7e66':'#5a6488',ax,ay-12,26,19);ell(g,OL,ax,ay-12,20,14);ell(g,w==='B'?'#2a2420':w==='C'?'#0a0c10':'#0a1830',ax,ay-12,19,13);
    R(g,OL,ax-28,ay-8,4,16);R(g,OL,ax+24,ay-8,4,16);
    if(w==='C'){crack(g,OL,ax-10,ay-30,14,3);poly(g,'#0a0c10',[ax+8,ay-31,ax+26,ay-20,ax+18,ay-8]);}
    mark('apparatus','観測装置（リング）',ax-30,ay-34,60,58);
    D.ring={ax,ay};
    // 操作卓（手前）
    poly(g,OL,[34,150,286,150,300,180,20,180]);poly(g,w==='B'?'#5a4a36':'#2a3048',[36,151,284,151,297,180,23,180]);
    R(g,w==='B'?'#7a6648':'#3a4260',36,151,248,2);
    if(w==='B'){for(let i=0;i<14;i++){ell(g,OL,52+i*16,162,3,3);ell(g,i%3?'#c8c0a8':'#c84a3a',52+i*16,162,2,2);}
      // オシロスコープ・録音機
      R(g,OL,30,120,34,28);R(g,'#8a8270',31,121,32,26);R(g,OL,34,124,22,16);R(g,'#0a2410',35,125,20,14);mark('oscilloscope','オシロスコープ（Bだけ）',29,119,36,30);
      R(g,OL,250,120,40,28);R(g,'#7a7260',251,121,38,26);ell(g,OL,262,131,7,7);ell(g,'#3a3a3a',262,131,6,6);ell(g,OL,280,131,7,7);ell(g,'#3a3a3a',280,131,6,6);mark('recorder','オープンリールの録音機（Bだけ）',249,119,42,30);D.reels=[[262,131],[280,131]];}
    else{for(let i=0;i<20;i++)R(g,w==='C'?'#1a1c22':i%5===0?'#2a6a8a':'#1a2438',48+i*11,158,8,4);
      R(g,OL,30,120,34,28);R(g,w==='C'?'#1a1c22':'#262c44',31,121,32,26);R(g,w==='C'?'#08080a':'#0a1a30',33,123,28,16);mark('sub_monitor',w==='C'?'消えた補助モニター':'補助モニター（波形）',29,119,36,30);
      R(g,OL,252,124,36,24);R(g,w==='C'?'#1a1c22':'#2a3048',253,125,34,22);for(let i=0;i<4;i++)R(g,w==='C'?'#2a2a2a':'#4ac8bc',256+i*8,130,5,10);mark('meter','境界計測ユニット',251,123,38,26);}
    mark('console','操作卓',34,150,252,30);
    if(w==='C'){vines(g,0,0,W,30,9);debris(g,40,150,240,30,3);}
    return D;
  },
  fx(g,w,t,o,D){
    const {mx,my,mw,mh}=D.m;
    const feed=o&&o.flags&&o.flags.feed;
    if(w==='B'){
      for(let r=0;r<3;r++)for(let c=0;c<4;c++){const x=mx+c*32+5,y=my+r*23+5;
        if(feed&&r===1&&(c===1||c===2)){feedImg(g,x,y,20,11,t,1);continue;}
        const v=hash(r*4+c,(t*2)|0);R(g,`rgba(90,255,140,${.08+v*.12})`,x,y,20,11);for(let i=0;i<3;i++)R(g,'rgba(120,255,160,.5)',x+1,y+2+i*3,4+((r*3+c+i*5+(t|0))%14),1);}
      for(let k=0;k<20;k++){const xx=36+k,yy=132+Math.sin(k*.7+t*6)*4;px(g,'#6aff8a',xx,yy);}
      if(D.reels)for(const [x,y] of D.reels){const a=t*2;px(g,'#c8c8c8',x+Math.cos(a)*3,y+Math.sin(a)*3);px(g,'#c8c8c8',x-Math.cos(a)*3,y-Math.sin(a)*3);}
    }else if(w==='A'){
      if(feed)feedImg(g,mx,my,mw,mh,t,1);
      else{for(let i=0;i<mw;i+=1){const y=my+mh*.55+Math.sin(i*.12+t*2)*6*Math.sin(i*.03+t*.5)+Math.sin(i*.5+t*7)*1.2;px(g,P.c3,mx+i,y);}
        for(let i=0;i<mw;i+=8)R(g,'rgba(80,140,220,.18)',mx+i,my,1,mh);for(let j=0;j<mh;j+=10)R(g,'rgba(80,140,220,.14)',mx,my+j,mw,1);
        R(g,'rgba(255,90,100,.8)',mx+4,my+4,2,2);glowE(g,mx+mw/2,my+mh/2,mw*.7,mh*.7,'60,140,255',.14);}
      for(let k=0;k<26;k++)px(g,P.c2,35+k,130+Math.sin(k*.5+t*4)*3);
      const pulse=.25+.2*Math.sin(t*2);glowE(g,D.ring.ax,D.ring.ay-12,18,12,'79,200,188',pulse);
    }else{
      if(feed)feedImg(g,mx+30,my+16,60,34,t,.6);
      if(Math.sin(t*9)>.8){glow(g,D.ring.ax+14,D.ring.ay-24,6,'159,240,224',.6);line(g,P.c1,D.ring.ax+12,D.ring.ay-26,D.ring.ax+18,D.ring.ay-20);}
      motes(g,t,10,'159,240,224',[60,60,200,100],8);
    }
  }
});
// 受信した配信映像（暗い部屋・モニターの光・逆光の人影・ノイズ越し）
function feedImg(g,x,y,w,h,t,amt){
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();
  R(g,'#0a0814',x,y,w,h);
  glowE(g,x+w*.5,y+h*.55,w*.35,h*.35,'120,110,230',.5);
  R(g,'#2a2a5a',x+w*.36,y+h*.36,w*.28,h*.26);R(g,'#7a7ae0',x+w*.38,y+h*.38,w*.24,h*.2);
  // 人影（後ろ姿：紫の髪・小さな帽子）
  const cx=x+w*.5,by=y+h;const s=h/40;
  R(g,'#100c1a',cx-7*s,by-14*s,14*s,14*s);ell(g,'#120c20',cx,by-18*s,5*s,5.5*s);R(g,'#3a2066',cx-4*s,by-23*s,8*s,4*s);R(g,'#5a3590',cx+3*s,by-18*s,2*s,9*s);
  R(g,'#a54a70',cx-2*s,by-27*s,4*s,4*s);R(g,'#a54a70',cx-3*s,by-24*s,6*s,1*s);
  // ノイズ
  for(let j=0;j<h;j+=1){if(hash(j,(t*20)|0)>.85){const off=(hash(j+3,(t*20)|0)-.5)*6;g.drawImage(g.canvas,x,y+j,w,1,x+off,y+j,w,1);}}
  for(let i=0;i<w*h*.08*amt;i++){const nx=x+hash(i,(t*30)|0)*w,ny=y+hash(i+77,(t*30)|0)*h;px(g,hash(i,9)>.5?'rgba(220,220,240,.5)':'rgba(10,10,20,.6)',nx,ny);}
  R(g,'rgba(255,255,255,.04)',x,y+((t*30)%h),w,2);
  g.restore();
}

// ───────── 観測センター：地下 ─────────
scene('center_basement',{worlds:'ABC',name:'観測センター・地下通路',
  key(o){return o&&o.flags&&o.flags.unlocked?'u':'';},
  bg(g,w,o){
    const lit=w==='A';
    vgrad(g,0,0,W,128,lit?['#3a4050','#343a4a','#2a3040']:w==='B'?['#14161e','#101218','#0c0e12']:['#1a1c22','#14161a','#0e1012']);
    vgrad(g,0,128,W,52,lit?['#2a2e3a','#22262e','#1a1c24']:['#0e1014','#0a0c0e','#08080a']);
    R(g,OL,0,127,W,1);
    // 黄黒の警告帯
    for(let x=0;x<W;x+=8){poly(g,lit?'#c8a030':'#4a3e1a',[x,122,x+4,122,x+8,127,x+4,127]);}
    // 天井の配管
    for(let i=0;i<3;i++){const y=6+i*7,c=[lit?'#6a7080':'#2a2c34',lit?'#8a5a3a':'#3a2a20',lit?'#5a6a5a':'#22282a'][i];R(g,OL,0,y-1,W,6);R(g,c,0,y,W,4);R(g,mix(c,'#ffffff',.2),0,y,W,1);for(let x=30+i*20;x<W;x+=90){R(g,OL,x,y-2,4,8);R(g,mix(c,'#ffffff',.1),x+1,y-1,2,6);}}
    // 壁の継ぎ目
    for(let x=20;x<W;x+=40)R(g,lit?'#2e3442':'#0c0e12',x,28,1,94);
    // 扉
    const dx=130,dy=50,dw=60,dh=78;
    R(g,OL,dx-4,dy-4,dw+8,dh+4);R(g,lit?'#5a6070':'#2a2c32',dx-3,dy-3,dw+6,dh+3);
    const open=(w==='B')||(w==='A'&&flag('unlocked'));
    if(open){R(g,'#040406',dx,dy,dw,dh);poly(g,lit?'#6a7080':'#2a2e36',[dx,dy,dx+16,dy+6,dx+16,dy+dh,dx,dy+dh]);if(w==='A')glowE(g,dx+40,dy+dh-8,24,10,'159,240,224',.18);}
    else{R(g,lit?'#7a8090':'#3a3c44',dx,dy,dw,dh);R(g,lit?'#8a90a0':'#44464e',dx,dy,dw,2);R(g,OL,dx+dw/2,dy,1,dh);for(const yy of [dy+12,dy+dh-14]){R(g,OL,dx+6,yy,dw-12,1);}R(g,OL,dx+dw/2-6,dy+38,4,8);R(g,OL,dx+dw/2+2,dy+38,4,8);}
    if(w==='C'){poly(g,'#1e2026',[dx+dw-8,dy,dx+dw,dy,dx+dw,dy+dh,dx+dw-14,dy+dh]);crack(g,OL,dx+20,dy+4,30,6);}
    hsign(g,dx+10,dy-14,40,8,lit?'#e8eaf2':'#3a3c44',w==='B'?'第二観測室':'第二観測室',{c:lit?'#2a2c40':'#7a7c84',s:5});
    mark('door','第二観測室の扉'+(w==='A'?'（電子錠・施錠）':w==='B'?'（停電で開いている）':'（歪んで動かない）'),dx-4,dy-4,dw+8,dh+4);
    mark('door_sign','扉の札「第二観測室」',dx+10,dy-14,40,8);
    // 電子錠
    const kx=198,ky=82;R(g,OL,kx-1,ky-1,12,18);R(g,lit?'#2a2c34':'#1a1a1e',kx,ky,10,16);for(let r=0;r<3;r++)for(let c=0;c<3;c++)px(g,lit?'#8a90a0':'#3a3a40',kx+2+c*3,ky+6+r*3);
    D_key={x:kx+5,y:ky+3};mark('keypad','電子錠（テンキー）',kx-1,ky-1,12,18);
    // 配電盤（左の壁）
    const bx=94,by=58;R(g,OL,bx-1,by-1,30,40);R(g,lit?'#8a8e9a':'#3a3c44',bx,by,28,38);
    if(w==='B'){R(g,'#0e0e12',bx+2,by+2,24,34);for(let i=0;i<4;i++){R(g,OL,bx+5+i*5,by+8,3,10);R(g,i===2?'#c84a3a':'#9a9aa0',bx+5+i*5,by+(i===2?14:9),3,4);}poly(g,'#4a4c54',[bx+28,by,bx+38,by+4,bx+38,by+40,bx+28,by+38]);}
    else{R(g,mix(lit?'#8a8e9a':'#3a3c44','#000000',.2),bx+2,by+2,24,34);R(g,'#e8c030',bx+9,by+10,10,8);poly(g,OL,[bx+14,by+11,bx+11,by+15,bx+14,by+15,bx+13,by+18,bx+17,by+13,bx+14,by+13]);}
    tx(bx+14,by+31,3,'分電盤',{c:lit?'#2a2c34':'#5a5c64',al:'center'});
    mark('breaker','分電盤'+(w==='B'?'（蓋が開いている・レバーが下がっている）':''),bx-1,by-1,w==='B'?40:30,40);
    // 非常灯
    R(g,OL,250,40,22,9);R(g,'#2a8a4a',251,41,20,7);tx(261,41.6,4,'非常口',{c:'#e8fff0',al:'center',b:true});glowE(g,261,44,20,10,'60,220,120',w==='A'?.12:.3);
    mark('exit_sign','非常口の灯り',249,39,24,11);
    // 左の崩れた壁（C）
    if(w==='C'){poly(g,'#060808',[34,70,58,60,80,74,86,118,74,128,40,126,28,100]);glowE(g,58,98,26,22,'79,200,188',.35);for(let i=0;i<8;i++){const a=i/8*TAU;R(g,P.s5,58+Math.cos(a)*28,98+Math.sin(a)*28,3,2);}debris(g,24,140,90,30,4);
      mark('wall_hole','崩れた壁の穴（別室へ通じる）',28,58,60,72);}
    else mark('wall','左の壁（Cでは崩れて穴になる場所）',28,58,60,72);
    // 照明
    if(lit){for(const x of [60,160,260])tube(g,x-16,30,32,true);}
    else{for(const x of [60,160,260]){R(g,OL,x-17,29,34,4);R(g,'#2a2a30',x-16,30,32,2);}}
    if(w==='B'){shade(g,'#04050a',.45);glowE(g,261,44,30,16,'60,220,120',.2);}
    if(w==='C')shade(g,'#020304',.2);
    return {open};
  },
  fx(g,w,t){
    const kx=198,ky=82;
    if(w==='A'){const ok=flag('unlocked');const on=ok||Math.sin(t*4)>0;R(g,ok?'#5aff8a':on?'#ff4a5a':'#5a1a20',kx+3,ky+2,4,2);if(on)glow(g,kx+5,ky+3,5,ok?'90,255,140':'255,74,90',.4);}
    if(w==='B'){motes(g,t,6,'180,180,200',[100,40,120,90],7);}
    if(w==='C'){const a=.2+.12*Math.sin(t*1.7);glowE(g,58,98,18,16,'159,240,224',a);motes(g,t,10,'159,240,224',[30,60,60,70],4);}
  }
});
let D_key=null;

// ════════════════════════════════════════════════════════════════
//  町の場所（夜）
// ════════════════════════════════════════════════════════════════
// 夜空：A 藍＋町明かり／B 少し温かい・星が多い／C 色の抜けた青緑・星なし
function nightSky(g,w,yH,o){
  o=o||{};
  if(w==='C'){vgrad(g,0,0,W,yH,['#0e1a1e','#1a2e30','#2e4a46','#4a6a5e']);moon(g,o.mx||250,o.my||26,9,{c:'#c8e0d4',phase:false,rgb:'160,220,200'});}
  else if(w==='B'){vgrad(g,0,0,W,yH,['#0a0a1e','#161430','#262040','#3a2c44']);stars(g,0,0,W,yH*.75,90,o.seed||12);moon(g,o.mx||250,o.my||26,7,{dark:'#161430',rgb:'255,230,190'});}
  else{vgrad(g,0,0,W,yH,['#07061a','#121230','#20204a','#3a3058']);stars(g,0,0,W,yH*.6,46,o.seed||11);moon(g,o.mx||250,o.my||26,7,{dark:'#121230'});}
}

// ───────── 月代商店街 ─────────
scene('shotengai',{worlds:'ABC',name:'月代商店街',
  bg(g,w){
    const gy=128;
    // 奥（アーケードの向こうの夜）
    vgrad(g,0,0,W,gy,w==='C'?['#0c1416','#121c1e']:w==='B'?['#1a1420','#221a24']:['#0c0c1e','#141428']);
    // 路面
    vgrad(g,0,gy,W,H-gy,w==='B'?['#3a3230','#2a2422','#1a1616']:w==='C'?['#1a2020','#121616','#0c0e0e']:['#2a2a3a','#20202e','#16161e']);
    for(let y=gy+4,k=0;y<H;y+=5+k,k++)R(g,'rgba(0,0,0,.25)',0,y,W,1);
    for(let i=-10;i<=10;i++)line(g,'rgba(0,0,0,.18)',160+i*18,gy,160+i*44,H);
    const D={lights:[],flick:[]};
    // 店
    const shops=[[0,72],[76,156],[164,244],[248,320]];
    const pal=w==='B'?['#6a4a34','#5a3e2c','#7a5a40','#5a4434']:w==='C'?['#2a2e30','#262a2c','#2e3234','#24282a']:['#4a4a5e','#3e4256','#52566a','#44465a'];
    shops.forEach(([x0,x1],i)=>{
      R(g,OL,x0,30,x1-x0,gy-30);R(g,pal[i],x0+1,31,x1-x0-2,gy-31);
      // 二階の窓
      const wy=32;for(let k=0;k<2;k++){const ww=(x1-x0-16)/2;windowLit(g,x0+5+k*(ww+6),wy+2,ww,8,{lit:w!=='C'&&((i+k)%3===0),c1:'#ffe0a8',c2:'#e8b070',c3:'#b07848',bars:3});}
    });
    // 看板・店先
    const signBg=w==='B'?['#e8dcc0','#7a1e1e','#2a3a5a','#c03030']:w==='C'?['#3a3e40','#34383a','#3a3e40','#34383a']:['#e8f0f8','#c8302a','#2a4a7a','#8a8e9a'];
    const names=w==='A'?['コインランドリー','やまだ精肉店','月代書店','テナント募集']:w==='B'?['月代湯','三ツ星食堂','月代貸本','たばこ']:['コイ　ランド','やま　精肉','月代書','　'];
    const tcol=w==='B'?['#2a1a10','#f8e8c0','#f0e0b8','#ffffff']:w==='C'?['#5a5e60','#5a5e60','#5a5e60','#5a5e60']:['#1a3a8a','#ffffff','#f0e8d0','#3a3c48'];
    shops.forEach(([x0,x1],i)=>{
      const sw=x1-x0-8;hsign(g,x0+4,46,sw,11,signBg[i],names[i],{c:tcol[i],s:i===0&&w==='A'?6.2:7.4,f:w==='B'?'m':'g',lit:w!=='C'&&!(w==='A'&&i===3),rgb:w==='B'?'255,190,120':'220,230,255',alt:(w==='A'&&i===2)?'月代書房':(w==='B'&&i===1)?'三ツ星食當':null});
    });
    mark('sign_1','左端の店の看板（A:コインランドリー／B:月代湯）',4,46,64,11);
    mark('sign_2','看板（A:やまだ精肉店／B:三ツ星食堂）',80,46,72,11);
    mark('sign_3','看板（A:月代書店／B:月代貸本）',168,46,72,11);
    mark('sign_4','右端の看板（A:テナント募集／B:たばこ）',252,46,64,11);
    // 1: コインランドリー／銭湯
    if(w==='A'){R(g,OL,6,62,60,66);vgrad(g,7,63,58,64,['#e8f4ff','#b8d4f0','#8ab0d8']);for(let k=0;k<3;k++){R(g,OL,10+k*18,82,15,18);R(g,'#f4f8ff',11+k*18,83,13,16);ell(g,OL,17.5+k*18,92,5,5);ell(g,'#5a7aa8',17.5+k*18,92,4,4);D.lights.push(['drum',17.5+k*18,92]);}glowE(g,36,96,50,40,'200,225,255',.25);}
    else if(w==='B'){R(g,OL,6,62,60,66);vgrad(g,7,63,58,64,['#ffe0a8','#e8a868','#b07040']);R(g,'#2a3a6a',12,62,48,22);for(let k=0;k<4;k++)R(g,OL,12+k*12,62,1,22);tx(36,66,9,'ゆ',{c:'#f0f0ff',al:'center',b:true,f:'m'});glowE(g,36,100,44,32,'255,190,120',.3);mark('noren','銭湯ののれん「ゆ」（Bだけ）',10,61,52,24);}
    else{R(g,OL,6,62,60,66);R(g,'#3a4044',7,63,58,64);for(let y=64;y<127;y+=3)R(g,'#2e3236',7,y,58,1);}
    // 2: 精肉店（シャッター）／食堂
    if(w==='A'){R(g,OL,80,62,72,66);R(g,'#8a8e9c',81,63,70,64);for(let y=64;y<127;y+=3)R(g,'#6e7280',81,y,70,1);R(g,OL,98,82,36,18);R(g,P.p1,99,83,34,16);tx(116,85,3.4,'長い間ご愛顧',{c:'#2a2a3a',al:'center'});tx(116,90,3.4,'ありがとう',{c:'#2a2a3a',al:'center'});tx(116,95,3.4,'ございました',{c:'#2a2a3a',al:'center'});mark('notice','シャッターの貼り紙（閉店のあいさつ）',97,81,38,20);}
    else if(w==='B'){R(g,OL,80,62,72,66);vgrad(g,81,63,70,64,['#ffd898','#e0a060','#a86a3a']);for(let k=0;k<3;k++){R(g,'#f0e8d8',86+k*20,62,17,24);R(g,OL,86+k*20,62,1,24);}tx(116,66,6,'めし',{c:'#2a1a10',al:'center',f:'m',b:true});
      person(g,104,124,30,{f:'b',hair:'#2a2020',top:'#5a6a7a',bot:'#3a3a48'});R(g,OL,118,104,24,3);R(g,P.w3,118,104,24,2);
      R(g,OL,132,72,14,20);R(g,'#2a1810',133,73,12,18);tx(139,74,3.2,'本日',{c:'#f0e0b0',al:'center',f:'m'});tx(139,79,3,'ライス',{c:'#f0e0b0',al:'center',f:'m'});tx(139,83.5,3,'カレー',{c:'#f0e0b0',al:'center',f:'m'});
      glowE(g,116,100,50,34,'255,190,120',.3);
      // 赤ちょうちん
      R(g,OL,82,58,1,6);ell(g,OL,84,70,5,7);ell(g,'#d83a2a',84,70,4,6);R(g,'#2a1a10',81,64,6,1);R(g,'#2a1a10',81,76,6,1);glow(g,84,70,16,'255,90,60',.4);D.flick.push([84,70]);
      mark('menu','品書き「本日 ライスカレー」',131,71,16,22);mark('lantern','赤ちょうちん',78,62,12,16);}
    else{R(g,OL,80,62,72,66);R(g,'#4a4e54',81,63,70,64);for(let y=64;y<127;y+=3)R(g,'#3a3e44',81,y,70,1);poly(g,'#0a0c0e',[110,100,130,96,140,128,100,128]);crack(g,'#2a2e30',90,64,30,8);}
    // 柱のポスター
    if(w!=='C'){poster(g,139,64,14,20,w==='B'?'#e8d8b0':'#fff4e8');
      if(w==='A'){R(g,'#2a2a6a',140,65,12,11);ell(g,'#ffd060',146,69,2,2);R(g,'#ff7a5a',142,71,1,1);R(g,'#5ad0ff',149,72,1,1);tx(146,76.5,2.6,'月代',{c:'#c03030',al:'center',b:true});tx(146,79.5,2.6,'夏祭り',{c:'#c03030',al:'center',b:true});tx(146,82.4,1.8,'8.15',{c:'#2a2a3a',al:'center'});}
      else{R(g,'#1a1a2a',140,65,12,10);ell(g,'#f0e8c0',147,68,2,2);R(g,'#c8a040',141,72,10,1);for(let k=0;k<4;k++)px(g,'#ffd060',142+k*2.6,71);tx(146,75.5,2.6,'月代劇場',{c:'#8a1a1a',al:'center',f:'m',b:true});tx(146,78.8,2.4,'月の汽車',{c:'#2a1a10',al:'center',f:'m'});tx(146,81.8,1.8,'上映中',{c:'#2a1a10',al:'center',f:'m'});}
      mark('poster',w==='A'?'柱のポスター「月代夏祭り 8.15」':'柱のポスター「月代劇場 月の汽車 上映中」',138,63,16,22);}
    // 3: 書店／貸本
    R(g,OL,168,62,72,66);vgrad(g,169,63,70,64,w==='C'?['#22282a','#1a1e20']:['#ffe4b0','#e8b478','#b07c48']);
    if(w!=='C'){for(let r=0;r<4;r++){R(g,P.w4,172,68+r*14,30,2);srand(r+3+(w==='B'?9:0));for(let x=173;x<201;x+=2){const hh=6+rnd()*5|0;R(g,['#8a3a3a','#3a5a8a','#5a7a4a','#d8c8a0','#6a4a7a'][(rnd()*5)|0],x,68+r*14-hh,2,hh);}}
      R(g,OL,206,96,30,12);R(g,P.w3,207,97,28,10);for(let k=0;k<6;k++)R(g,['#c8b890','#8a5a4a','#4a6a8a'][k%3],208+k*4.4,93,4,4);
      if(w==='A'){person(g,220,124,30,{f:'f',hair:'#8a8890',skin:'#d8b8a0',top:'#5a6a4a',bot:'#3a3a40',apron:'#3a4a6a'});mark('shopkeeper','書店の店主（年配の女性）',212,92,18,34);}
      else{person(g,222,124,31,{f:'l',hair:'#d8d8d8',skin:'#d0b098',top:'#4a3a2a',bot:'#2a2a2a'});R(g,OL,208,86,10,8);R(g,P.p1,209,87,8,6);mark('shopkeeper','貸本屋の主人（白髪の老人）',212,92,18,34);
        tx(186,104,3,'一冊十円',{c:'#2a1a10',al:'center',f:'m'});}
      glowE(g,204,100,52,36,'255,200,140',.3);}
    else{R(g,'#1a1e20',169,63,70,64);for(let r=0;r<3;r++)R(g,'#2a2e30',172,72+r*16,40,2);debris(g,170,128,68,14,6);}
    mark('shop_3','店の中（本棚・店主）',168,62,72,66);
    // 4: テナント募集／たばこ屋
    if(w==='A'){R(g,OL,252,62,68,66);R(g,'#7a7e8c',253,63,66,64);for(let y=64;y<127;y+=3)R(g,'#626674',253,y,66,1);R(g,OL,264,80,26,16);R(g,'#f4f4f8',265,81,24,14);tx(277,83,3.6,'テナント',{c:'#c03040',al:'center',b:true});tx(277,88.5,3.6,'募集',{c:'#c03040',al:'center',b:true});}
    else if(w==='B'){R(g,OL,252,62,68,66);R(g,'#5a4434',253,63,66,64);R(g,OL,258,74,40,22);vgrad(g,259,75,38,20,['#ffe0a8','#d8a060']);R(g,'#c03030',258,96,40,6);tx(278,96.6,4.4,'たばこ',{c:'#ffffff',al:'center',b:true});
      R(g,OL,302,88,12,18);R(g,'#f08ab0',303,89,10,16);R(g,'#c8608a',304,92,8,4);mark('pink_phone','ピンク電話（Bだけ）',301,87,14,20);glowE(g,278,86,30,20,'255,200,140',.25);}
    else{R(g,OL,252,62,68,66);R(g,'#30343a',253,63,66,64);poly(g,'#0c0e10',[260,70,300,64,310,128,256,128]);}
    // 中央手前：A 自販機／B 丸ポスト
    if(w==='A'){vending(g,150,98,{w:16,h:30,cans:['#e05a6a','#5a9ad0','#f0c040','#5ab07a','#e8e8f0','#8a5a3a']});mark('vending','自動販売機（Aだけ。Bでは丸ポスト）',149,97,18,32);}
    else if(w==='B'){R(g,OL,151,98,14,30);R(g,'#d0302a',152,101,12,27);ell(g,OL,158,100,7,4);ell(g,'#e0403a',158,100,6,3);R(g,OL,154,106,8,2);R(g,'#2a1a10',152,124,12,4);tx(158,110,3,'〒',{c:'#ffe8e0',al:'center',b:true});mark('vending','丸型ポスト（Bだけ。Aでは自動販売機）',149,96,18,32);}
    else{poly(g,'#2a2e34',[146,128,166,118,172,124,152,130]);mark('vending','倒れた箱（自販機の残骸）',144,116,30,16);}
    // アーケードの屋根
    if(w!=='C'){R(g,OL,0,0,W,30);vgrad(g,0,0,W,28,w==='B'?['#3a2c22','#2a1e18']:['#2a2e44','#1e2236']);for(let x=0;x<W;x+=20){R(g,w==='B'?'#4a3a2a':'#3a3e5a',x,0,2,28);}for(let y=4;y<28;y+=8)R(g,w==='B'?'#4a3a2a':'#363a54',0,y,W,1);
      R(g,OL,0,28,W,3);R(g,w==='B'?'#6a5040':'#5a5e7a',0,28,W,2);}
    else{R(g,'#0e1416',0,0,W,30);poly(g,OL,[0,0,140,0,90,60,0,40]);poly(g,'#2a3034',[2,2,136,2,88,56,2,38]);for(let k=0;k<6;k++)line(g,'#1a2022',10+k*22,2,k*10,40);poly(g,'#1a2022',[200,0,320,0,320,22,240,30]);vines(g,0,30,W,40,12);}
    // 入口の看板
    const ax=104,ay=33,aw=112,ah=13;R(g,OL,ax+10,28,1,6);R(g,OL,ax+aw-10,28,1,6);
    if(w==='C'){poly(g,OL,[ax,ay+4,ax+aw,ay-2,ax+aw,ay+ah-2,ax,ay+ah+4]);poly(g,'#3a3e44',[ax+1,ay+5,ax+aw-1,ay-1,ax+aw-1,ay+ah-3,ax+1,ay+ah+3]);tx(160,ay+2,8,'月代商店',{c:'#6a7074',al:'center',rot:-.05,b:true});}
    else{hsign(g,ax,ay,aw,ah,w==='B'?'#2a3a2a':'#1e3a6a',w==='A'?'月代商店街':'月代銀座',{c:w==='B'?'#f0e0b0':'#ffffff',s:9,f:w==='B'?'m':'g',lit:true,rgb:w==='B'?'255,200,140':'200,220,255',gl:w==='A'?'rgba(150,200,255,.7)':null,alt:w==='A'?'月代商店會':'月代銀坐'});}
    mark('arch','入口の看板（A:月代商店街／B:月代銀座）',ax,ay-2,aw,ah+6);
    // B：駅への案内
    if(w==='B'){R(g,OL,236,31,1,4);R(g,OL,262,31,1,4);hsign(g,228,35,44,9,'#f0ece0','月代駅 →',{c:'#1a2a5a',s:6.4,f:'m'});mark('station_sign','吊り下げ案内「月代駅 →」（Bだけ）',228,31,44,13);}
    // 吊りの灯り
    const lx=[40,120,200,280];
    lx.forEach((x,i)=>{
      if(w==='A'){R(g,OL,x-6,30,12,3);R(g,'#e8f0ff',x-5,31,10,1);glowE(g,x,40,30,18,'200,220,255',.16);cone(g,x,32,10,60,96,'200,220,255',.05);}
      else if(w==='B'){line(g,OL,x,30,x,36);ell(g,OL,x,40,4,5);ell(g,'#ffe0a0',x,40,3,4);glow(g,x,40,26,'255,200,130',.32);cone(g,x,44,8,54,84,'255,200,130',.06);D.flick.push([x,40]);}
      else if(i===2){R(g,OL,x-6,30,12,3);D.lights.push(['flick',x,36]);}
    });
    // 通行人
    if(w==='B'){person(g,64,150,36,{f:'r',hair:'#2a2020',skin:'#d8b8a0',top:'#8a4a4a',bot:'#4a3a4a',skirt:true,bag:'#c8a060'});person(g,250,152,26,{kid:true,f:'l',hair:'#1a1a1a',skin:'#e0c0a8',top:'#e8e0c8',bot:'#2a3a6a'});
      mark('passerby','買い物かごの女性（Bだけ）',54,112,22,40);mark('child','走る子供（Bだけ）',242,124,18,28);}
    if(w==='A'){mark('cat','ねこ（Aだけ）',96,140,14,10);R(g,OL,98,141,10,7);R(g,'#2a2830',99,142,8,5);R(g,OL,104,138,5,4);R(g,'#2a2830',105,139,3,3);px(g,'#d8ec60',106,140);R(g,'#2a2830',96,143,3,1);}
    // 路面の反射
    if(w==='A'){glowE(g,36,150,30,6,'200,225,255',.12);glowE(g,158,146,12,5,'200,230,255',.14);}
    if(w==='B'){glowE(g,116,146,30,6,'255,190,120',.14);}
    if(w==='C'){debris(g,10,160,300,40,8);glowE(g,200,164,40,6,'79,200,188',.16);}
    return D;
  },
  fx(g,w,t,o,D){
    for(const L of D.lights){
      if(L[0]==='drum'){const a=t*6;px(g,'#c8e0ff',L[1]+Math.cos(a)*2.5,L[2]+Math.sin(a)*2.5);}
      if(L[0]==='flick'){const on=Math.sin(t*13)>-.2&&Math.sin(t*2.3)>-.7;if(on){R(g,'#c8f0e8',L[1]-5,31,10,1);glowE(g,L[1],40,26,16,'159,240,224',.18);}}
    }
    for(const [x,y] of D.flick){glow(g,x,y,8,'255,180,110',.06+.05*Math.sin(t*5+x));}
    if(w==='A'){glowE(g,158,104,10,14,'200,230,255',.05+.03*Math.sin(t*2));}
    if(w==='C')motes(g,t,12,'159,240,224',[0,60,W,100],12);
  }
});

// ───────── 月代小学校 ─────────
scene('school',{worlds:'ABC',name:'月代小学校',
  bg(g,w){
    nightSky(g,w,110,{mx:262,my:22,seed:21});
    // 遠景の山
    hills(g,78,5,w==='C'?'#1a2a2a':'#14142c',22,8);
    const gy=124;
    // 校庭
    vgrad(g,0,104,W,H-104,w==='C'?['#1a2420','#121a18','#0c1010']:w==='B'?['#2a2420','#221c1a','#16120e']:['#1e1e30','#181826','#10101a']);
    const D={};
    if(w==='A'||w==='C'){
      // 三階建てコンクリート
      const bx=44,by=48,bw=232,bh=58;
      R(g,OL,bx-1,by-1,bw+2,bh+2);vgrad(g,bx,by,bw,bh,w==='C'?['#4a5250','#3a4240','#2e3432']:['#7a7e94','#6a6e84','#5a5e74']);
      R(g,OL,bx-2,by-3,bw+4,3);R(g,w==='C'?'#3a4240':'#8a8ea4',bx-1,by-2,bw+2,1);
      for(let x=bx;x<bx+bw;x+=6)R(g,w==='C'?'#2a2e2e':'#4a4e64',x,by-7,1,4);R(g,w==='C'?'#2a2e2e':'#4a4e64',bx,by-7,bw,1);
      // 時計塔
      R(g,OL,146,26,28,24);R(g,w==='C'?'#4a5250':'#7e8298',147,27,26,23);R(g,OL,145,24,30,3);
      for(let f=0;f<3;f++)for(let k=0;k<12;k++){const wx=bx+6+k*19,wy=by+5+f*18;if(wx>140&&wx<174)continue;
        const lit=w==='A'&&f===2&&k===2;const broken=w==='C'&&hash(f,k)>.55;
        windowLit(g,wx,wy,13,10,{lit,c1:'#e8f0e0',c2:'#c8d8c0',c3:'#98b0a0',bars:2,d1:w==='C'?'#141c1c':'#2a2c50',d2:w==='C'?'#0a1010':'#16162e'});if(broken){poly(g,'#060808',[wx,wy,wx+8,wy,wx+3,wy+10,wx,wy+10]);}}
      R(g,OL,150,86,20,20);R(g,w==='C'?'#0a0e0e':'#1a1c2c',151,87,18,19);R(g,w==='C'?'#2a2e2e':'#5a6070',151,87,18,2);
      if(w==='A'){D.lit=[44+6+2*19,48+5+2*18];mark('lit_window','明かりのついた窓（宿直室）',D.lit[0]-1,D.lit[1]-1,15,12);}
      if(w==='C'){poly(g,'#0a1010',[bx+150,by-4,bx+200,by-8,bx+232,by+12,bx+232,by+30,bx+190,by+10]);vines(g,bx,by,bw,40,31);glowE(g,206,70,10,8,'79,200,188',.3);}
    }else{
      // 木造二階建て
      const bx=44,by=56,bw=232,bh=50;
      poly(g,OL,[bx-8,by+1,bx+20,by-14,bx+bw-20,by-14,bx+bw+8,by+1]);poly(g,'#3a3a48',[bx-6,by,bx+21,by-13,bx+bw-21,by-13,bx+bw+6,by]);for(let k=0;k<5;k++)R(g,'#2e2e3a',bx-4+k*3,by-2-k*2.6,bw+8-k*6,1);
      R(g,OL,bx-1,by-1,bw+2,bh+2);R(g,'#6a4e36',bx,by,bw,bh);for(let x=bx;x<bx+bw;x+=3)R(g,'#5a3e2a',x,by,1,bh);R(g,'#4a3020',bx,by+24,bw,2);
      for(let f=0;f<2;f++)for(let k=0;k<11;k++){const wx=bx+6+k*21,wy=by+5+f*24;if(wx>136&&wx<176)continue;windowLit(g,wx,wy,15,14,{lit:false,bars:3,hbar:true,d1:'#2a2c48',d2:'#141426'});}
      // 玄関の破風と時計
      poly(g,OL,[138,by+2,160,by-26,182,by+2]);poly(g,'#4a4a5a',[141,by+1,160,by-23,179,by+1]);R(g,OL,142,by,36,bh);R(g,'#7a5a40',143,by+1,34,bh-1);R(g,OL,150,by+22,20,bh-22);R(g,'#2a1a10',151,by+23,18,bh-23);
      D.bell=1;
      // 二宮像のような「本を読む子」の像
      R(g,OL,224,128,16,12);R(g,P.s4,225,129,14,10);R(g,P.s3,225,129,14,2);
      person(g,232,128,22,{kid:true,f:'f',hair:'#6a6a70',skin:'#8a8a90',top:'#7a7a80',bot:'#6a6a70',shoe:'#5a5a60',light:'l'});R(g,'#9a9aa0',229,113,6,3);
      mark('statue','本を読む子供の銅像（Bだけ）',222,104,20,36);
    }
    // 時計
    const ccx=160,ccy=w==='B'?44:38;
    if(w==='C'){ell(g,OL,ccx,ccy,8,8);ell(g,'#5a6260',ccx,ccy,7,7);crack(g,'#2a2e2e',ccx-4,ccy-5,6,2);}
    else{clock(g,ccx,ccy,w==='B'?7:8,2,17,{face:w==='B'?'#f0e4c8':'#eef2f8'});if(w==='B')for(let i=0;i<4;i++)px(g,'#3a2a1a',ccx+Math.sin(i*Math.PI/2)*5,ccy-Math.cos(i*Math.PI/2)*5);}
    mark('clock',w==='C'?'針のない時計':'校舎の時計（2:17）',ccx-9,ccy-9,18,18);
    // 垂れ幕
    if(w!=='C'){const bx=196,by=w==='B'?58:50;R(g,OL,bx-1,by-1,12,52);R(g,'#f4f0e8',bx,by,10,50);R(g,'#c83030',bx,by,10,3);
      tx(bx+5,by+4.5,6.4,w==='A'?'祝創立五十周年':'祝創立百周年',{c:'#2a1a1a',v:true,al:'center',f:'m',b:true,sp:-.1,alt:w==='A'?'祝創立五十一周年':null});
      mark('banner',w==='A'?'垂れ幕「祝 創立五十周年」':'垂れ幕「祝 創立百周年」',bx-1,by-1,12,52);}
    // 塀と門
    R(g,OL,0,gy-2,W,2);for(let x=0;x<W;x+=4){if(x>74&&x<246)continue;R(g,w==='C'?'#2a3030':'#5a5e70',x,gy-14,2,14);}R(g,w==='C'?'#2a3030':'#5a5e70',0,gy-14,74,1);R(g,w==='C'?'#2a3030':'#5a5e70',246,gy-14,74,1);
    // 門柱
    for(const x of [58,246]){R(g,OL,x-1,98,18,62);R(g,w==='B'?'#8a8070':w==='C'?'#3a4040':'#9a9aa8',x,99,16,60);R(g,w==='B'?'#a09888':w==='C'?'#4a5050':'#b0b0bc',x,99,16,2);R(g,OL,x-2,96,20,4);}
    // 表札（左の門柱）
    R(g,OL,61,104,10,40);R(g,w==='B'?'#d8c8a0':w==='C'?'#4a4e4c':'#e8e4dc',62,105,8,38);
    tx(66,106,5.2,w==='A'?'月代町立月代小学校':w==='B'?'月代町立月代小學校':'月代町立　小学',{c:w==='C'?'#2a2e2e':'#1a1a1a',v:true,al:'center',f:'m',sp:-.22});
    mark('gate_plate',w==='B'?'門柱の表札「月代町立月代小學校」（旧字）':'門柱の表札「月代町立月代小学校」',60,103,12,42);
    // 門扉
    if(w==='C'){poly(g,'#3a4040',[78,158,140,150,142,156,80,164]);for(let k=0;k<8;k++)line(g,OL,82+k*8,157-k,84+k*8,163-k);}
    else{R(g,OL,76,128,168,2);for(let x=78;x<244;x+=6)R(g,w==='B'?'#3a3a40':'#5a5e70',x,130,1,24);R(g,OL,76,154,168,2);}
    // A：自転車と注意看板
    if(w==='A'){ell(g,OL,226,150,5,5);ell(g,'#1e1e2a',226,150,4,4);ell(g,OL,240,150,5,5);ell(g,'#1e1e2a',240,150,4,4);line(g,'#8a3a3a',226,150,233,144);line(g,'#8a3a3a',233,144,240,150);line(g,'#8a3a3a',233,144,238,143);line(g,'#8a3a3a',230,143,233,150);
      R(g,OL,264,120,1,30);R(g,OL,256,108,22,14);R(g,'#ffe066',257,109,20,12);tx(267,110,3.4,'不審者に',{c:'#2a1a1a',al:'center',b:true});tx(267,115,3.4,'注意',{c:'#c02020',al:'center',b:true});
      mark('bicycle','自転車（Aだけ）',220,142,26,14);mark('caution_sign','看板「不審者に注意」（Aだけ）',255,107,24,16);}
    // 桜の木（左）
    srand(5);R(g,OL,20,70,6,58);R(g,'#2a2020',21,70,4,58);for(let i=0;i<10;i++){const a=-Math.PI/2+(rnd()-.5)*2.4,l=12+rnd()*16;line(g,'#2a2020',23,80,23+Math.cos(a)*l,80+Math.sin(a)*l);}
    if(w==='C'){grass(g,0,140,W,160,['#1a2a26','#24342e','#2e4034'],9);grass(g,0,170,W,200,['#1a2a26','#24342e','#2e4034'],10);debris(g,80,170,160,20,5);}
    return D;
  },
  fx(g,w,t,o,D){
    if(w==='A'&&D.lit){const a=.12+.05*Math.sin(t*1.7);glowE(g,D.lit[0]+6,D.lit[1]+5,16,10,'220,240,220',a);}
    if(w==='B'){glowE(g,160,44,10,10,'255,220,170',.08+.04*Math.sin(t*2));}
    if(w==='C')motes(g,t,10,'159,240,224',[140,50,120,40],2);
    // 風で揺れる枝
    const s=Math.sin(t*.8)*1.2;px(g,'#2a2020',23+12+s,66);
  }
});

// ───────── 神社 ─────────
scene('shrine',{worlds:'ABC',name:'月代神社',
  bg(g,w){
    nightSky(g,w,90,{mx:70,my:20,seed:31});
    // 杉の森
    treeLine(g,74,w==='C'?'#122220':'#0e1424',33,14);treeLine(g,92,w==='C'?'#0c1816':'#0a0e1a',35,18);
    const D={};
    // 参道と境内
    vgrad(g,0,118,W,H-118,w==='C'?['#1a2220','#121816']:['#24222e','#1a1822','#121018']);
    // 社殿
    const hx=160,hy=70;
    poly(g,OL,[hx-52,hy+6,hx-34,hy-14,hx+34,hy-14,hx+52,hy+6]);poly(g,w==='C'?'#1e2422':'#2a2a36',[hx-49,hy+5,hx-33,hy-12,hx+33,hy-12,hx+49,hy+5]);
    for(let k=0;k<4;k++)R(g,w==='C'?'#161c1a':'#22222e',hx-44+k*4,hy+2-k*4,88-k*8,1);
    R(g,OL,hx-40,hy+5,80,44);R(g,w==='C'?'#2a2420':'#5a3a2a',hx-39,hy+6,78,43);
    for(let k=0;k<5;k++)R(g,w==='C'?'#1e1a18':'#4a2e20',hx-38+k*19,hy+6,2,43);
    // 幕と紋
    R(g,w==='C'?'#3a3a3a':'#e8e4ec',hx-36,hy+8,72,10);for(let k=0;k<9;k++)R(g,w==='C'?'#2e2e2e':'#4a3a7a',hx-36+k*8,hy+8,4,10);
    ell(g,OL,hx,hy+13,6,6);ell(g,w==='C'?'#4a4a4a':'#f0ecf4',hx,hy+13,5,5);
    if(w==='A'){ell(g,'#4a3a7a',hx,hy+13,4,4);ell(g,'#f0ecf4',hx+2,hy+12,3.5,3.5);}
    else if(w==='B'){for(let i=0;i<8;i++){const a=i/8*TAU;line(g,'#7a2a2a',hx,hy+13,hx+Math.cos(a)*4,hy+13+Math.sin(a)*4);}ell(g,'#7a2a2a',hx,hy+13,1,1);}
    mark('crest',w==='A'?'幕の紋（三日月）':w==='B'?'幕の紋（八本の輻の車輪）':'色あせた紋',hx-7,hy+6,14,14);
    // 賽銭箱と鈴
    R(g,OL,hx-12,hy+34,24,12);R(g,w==='C'?'#2a2420':'#7a5236',hx-11,hy+35,22,10);for(let k=0;k<5;k++)R(g,'#3a2418',hx-10+k*4.5,hy+35,1,3);
    line(g,'#c8a050',hx,hy+18,hx,hy+30);ell(g,'#d8b050',hx,hy+20,2,2);
    mark('offering_box','賽銭箱と鈴',hx-13,hy+16,26,31);
    if(w==='C'){poly(g,'#0a0e0c',[hx-49,hy+5,hx-10,hy-12,hx+33,hy-12,hx+20,hy+30,hx-30,hy+40]);for(let i=0;i<6;i++)line(g,'#2a2420',hx-40+i*12,hy-6+i*3,hx-20+i*10,hy+36);}
    // 石段
    for(let k=0;k<10;k++){const y=124+k*6,hw=16+k*5.2;R(g,OL,hx-hw-1,y-1,hw*2+2,7);R(g,w==='C'?'#3a403e':'#5a5868',hx-hw,y,hw*2,5);R(g,w==='C'?'#4a504e':'#706e80',hx-hw,y,hw*2,1);}
    // 鳥居
    const tc=w==='A'?'#b8402e':w==='B'?'#8a8a96':'#5a3a30',tcd=mix(tc,'#000000',.35);
    if(w==='C'){R(g,OL,126,60,9,68);R(g,tc,127,61,7,67);poly(g,OL,[110,120,118,116,200,140,196,146]);poly(g,tc,[112,120,118,118,198,141,196,144]);poly(g,OL,[150,128,186,98,190,102,154,132]);}
    else{R(g,OL,126,60,9,68);R(g,tc,127,61,7,67);R(g,tcd,132,61,2,67);R(g,OL,185,60,9,68);R(g,tc,186,61,7,67);R(g,tcd,191,61,2,67);
      R(g,OL,112,52,96,7);R(g,tc,113,53,94,5);R(g,mix(tc,'#ffffff',.2),113,53,94,1);poly(g,OL,[108,50,112,52,112,58,108,54]);poly(g,OL,[212,50,208,52,208,58,212,54]);
      R(g,OL,118,63,84,5);R(g,tc,119,64,82,3);
      R(g,OL,150,59,20,22);R(g,w==='B'?'#3a3a44':'#2a1e18',151,60,18,20);R(g,'#c8a050',151,60,18,1);
      tx(160,61.5,7.6,w==='A'?'月代':'月見',{c:'#e8d090',v:true,al:'center',f:'m',b:true,alt:w==='A'?'月白':null});}
    mark('torii',w==='A'?'朱の鳥居':w==='B'?'石の鳥居':'倒れた鳥居',110,50,100,78);
    mark('plaque',w==='A'?'鳥居の額「月代」':w==='B'?'鳥居の額「月見」':'（額は落ちている）',150,59,20,22);
    // 灯籠
    for(const x of [96,224]){
      if(w==='C'&&x===224){poly(g,P.s5,[214,140,234,132,238,138,218,146]);continue;}
      R(g,OL,x-7,96,14,4);R(g,w==='C'?'#3a403e':'#7a7888',x-6,97,12,2);R(g,OL,x-5,100,10,10);R(g,w==='C'?'#2e3432':'#6a6878',x-4,101,8,8);
      R(g,w==='B'?P.a2:'#1a1820',x-2,102,4,5);R(g,OL,x-2,110,4,16);R(g,w==='C'?'#3a403e':'#6a6878',x-1,110,2,16);R(g,OL,x-6,126,12,3);
      if(w==='B'){glow(g,x,104,22,'255,190,110',.4);D.lan=(D.lan||[]).concat([[x,104]]);}
    }
    mark('lanterns',w==='B'?'灯籠（火が入っている）':'石灯籠（消えている）',88,94,144,36);
    // 狛犬／狐
    for(const [x,f] of [[76,1],[244,-1]]){
      R(g,OL,x-9,124,18,14);R(g,w==='C'?'#3a403e':'#6a6878',x-8,125,16,12);R(g,w==='C'?'#4a504e':'#7a7888',x-8,125,16,2);
      if(w==='B'){// 狐
        poly(g,OL,[x-6,124,x+6,124,x+5,112,x+f*2,104,x-5,112]);poly(g,'#d8d4dc',[x-5,123,x+5,123,x+4,112,x+f*2,106,x-4,112]);poly(g,OL,[x-3,106,x-2,98,x,104]);poly(g,OL,[x+3,106,x+2,98,x,104]);poly(g,OL,[x+f*2,106,x+f*9,108,x+f*2,110]);R(g,'#c83030',x-4,113,8,4);
      }else if(w==='A'){// 狛犬
        poly(g,OL,[x-7,124,x+7,124,x+6,110,x+f*3,104,x-6,108]);poly(g,'#7a7888',[x-6,123,x+6,123,x+5,111,x+f*3,106,x-5,109]);R(g,'#5a5868',x-6,108,4,8);px(g,OL,x+f*4,108);}
      else{poly(g,'#3a403e',[x-6,124,x+4,124,x+2,116,x-6,118]);}
    }
    mark('guardians',w==='B'?'狐の像（赤い前掛け）':w==='A'?'狛犬':'崩れた像',66,98,188,40);
    // 絵馬掛け
    R(g,OL,250,92,32,2);R(g,OL,252,94,1,24);R(g,OL,279,94,1,24);R(g,P.w4,250,91,32,1);
    srand(w==='B'?71:70);for(let r=0;r<2;r++)for(let k=0;k<5;k++){if(w==='C'&&rnd()<.6)continue;const ex=254+k*5,ey=96+r*8;poly(g,OL,[ex,ey+1,ex+2,ey-1,ex+4,ey+1,ex+4,ey+6,ex,ey+6]);R(g,w==='B'?'#f0f0f4':'#d8b880',ex+1,ey+1,3,4);if(w==='B')R(g,'#f0f0f4',ex+1,ey-1,3,1);}
    mark('ema',w==='B'?'おみくじ結び（白い紙）':'絵馬掛け',249,90,34,24);
    // 御神木
    R(g,OL,26,40,20,96);R(g,'#2a2220',27,40,18,96);for(let y=44;y<136;y+=5)R(g,'#221a18',29,y,14,1);R(g,'#e8e0d0',25,92,22,2);for(let k=0;k<4;k++){R(g,'#f4f0e8',29+k*4,94,2,5);}
    mark('sacred_tree','御神木としめ縄',24,38,24,100);
    if(w==='C'){vines(g,100,52,120,40,41);grass(g,0,180,W,200,['#1a2a26','#24342e'],7);}
    else grass(g,0,124,80,40,['#14141e','#1a1a26'],7);
    return D;
  },
  fx(g,w,t,o,D){
    if(w==='B'&&D.lan)for(const [x,y] of D.lan){glow(g,x,y,10,'255,170,90',.08+.06*Math.sin(t*6+x));}
    if(w==='C')motes(g,t,22,'159,240,224',[60,40,200,120],3);
    if(w==='A')motes(g,t,5,'200,200,255',[110,60,100,60],9);
  }
});

// ───────── 廃トンネル ─────────
scene('tunnel',{worlds:'ABC',name:'廃トンネル（月代隧道）',
  bg(g,w){
    nightSky(g,w,60,{mx:268,my:16,seed:41});
    // 山肌
    poly(g,w==='C'?'#162420':'#12182a',[0,70,40,40,100,26,170,20,240,30,290,44,320,60,320,H,0,H]);
    srand(43);for(let i=0;i<300;i++){const x=rnd()*W,y=24+rnd()*120;if(y<40-x*.1)continue;px(g,rnd()<.5?(w==='C'?'#1e2e28':'#1a2236'):(w==='C'?'#24382e':'#202a40'),x,y);}
    treeLine(g,48,w==='C'?'#0e1c18':'#0a1020',45,10);
    const D={};
    // 道（A：舗装の跡／B：線路）
    vgrad(g,0,140,W,40,w==='C'?['#1a2220','#121816']:['#262434','#1c1a26','#121018']);
    poly(g,w==='B'?'#3a3430':'#2e2e3a',[100,180,220,180,190,140,130,140]);
    if(w==='B'){for(let k=0;k<8;k++){const y=140+k*5.5,f=k/8;R(g,'#4a3a2a',132-f*30,y,56+f*60,2);}line(g,'#9a9aa8',142,140,118,180);line(g,'#9a9aa8',178,140,202,180);line(g,'#c8c8d4',143,140,119,180);
      mark('rails','線路（Bだけ）',112,138,96,42);}
    else if(w==='A'){for(let k=0;k<4;k++)R(g,'#8a8a6a',158,146+k*9,3,4);grass(g,100,180,120,80,['#1e2a24','#26342a','#1a2420'],43);}
    // 坑門
    const cx=160;
    R(g,OL,104,54,112,90);vgrad(g,105,55,110,88,w==='C'?['#3a3e3a','#2e322e']:w==='B'?['#6a5a52','#5a4a44']:['#5a5250','#4a4240']);
    for(let y=58;y<142;y+=5){const off=(y/5|0)%2*5;for(let x=106+off;x<214;x+=10)R(g,w==='C'?'#2a2e2a':'#3a3230',x,y,1,4);R(g,w==='C'?'#2a2e2a':'#3a3230',105,y+4,110,1);}
    // アーチの石
    for(let i=0;i<=14;i++){const a=Math.PI+i/14*Math.PI,x=cx+Math.cos(a)*40,y=104+Math.sin(a)*36;R(g,OL,x-3,y-3,7,7);R(g,w==='C'?'#4a504a':'#8a7a70',x-2,y-2,5,5);}
    poly(g,'#020204',(()=>{const p=[];for(let i=0;i<=20;i++){const a=Math.PI+i/20*Math.PI;p.push(cx+Math.cos(a)*36,104+Math.sin(a)*32);}p.push(cx+36,144,cx-36,144);return p;})());
    // 扁額
    R(g,OL,140,58,40,10);R(g,w==='C'?'#3a3e3a':'#2a2420',141,59,38,8);tx(160,59.6,6.6,w==='C'?'月　隧道':'月代隧道',{c:w==='C'?'#5a5e5a':'#d8c8a0',al:'center',f:'m',b:true,alt:w==='A'?'月代隧堂':null});
    mark('plaque','扁額「月代隧道」',139,57,42,12);
    // 中
    if(w==='B'){for(let k=0;k<6;k++){const f=k/6,y=86+f*20,x1=cx-30+f*24,x2=cx+30-f*24;px(g,P.a2,x1,y);px(g,P.a2,x2,y);glow(g,x1,y,4-f*2,'255,200,120',.4);glow(g,x2,y,4-f*2,'255,200,120',.4);}
      mark('tunnel_lamps','トンネル内の灯り（Bだけ）',124,80,72,40);}
    if(w==='C'){glowE(g,cx,120,22,16,'79,200,188',.5);poly(g,'#3a3e3a',[104,144,104,92,126,84,140,110,150,144]);debris(g,100,146,60,30,9);mark('rubble','崩れた左半分',104,84,46,60);}
    mark('opening','坑口（中は真っ暗）',124,72,72,72);
    // 柵と立入禁止（A）
    if(w==='A'){for(let k=0;k<4;k++){const x=126+k*20;R(g,OL,x,118,3,26);R(g,'#e8e8ec',x+1,119,1,24);}for(const y of [122,132]){R(g,OL,124,y,72,5);for(let x=125;x<195;x+=8){R(g,'#e85a2a',x,y+1,4,3);R(g,'#f0f0f0',x+4,y+1,4,3);}}
      R(g,OL,146,104,28,12);R(g,'#f4f4f4',147,105,26,10);tx(160,106,6.6,'立入禁止',{c:'#c02020',al:'center',b:true});
      mark('barrier','柵と「立入禁止」の札（Aだけ）',124,103,72,41);
      // 落書き
      tx(118,92,4.6,'ナギ',{c:'rgba(230,120,160,.55)',al:'center',rot:-.15,b:true});mark('graffiti','壁の落書き（かすれた「ナギ」）',108,86,22,12);}
    // 脇の銘板
    R(g,OL,224,98,22,18);R(g,w==='C'?'#3a3e3a':'#c8c0a8',225,99,20,16);R(g,OL,234,116,2,24);
    tx(235,100,2.8,w==='B'?'月代線':w==='C'?'':'この先',{c:'#2a2420',al:'center',f:'m',b:true});tx(235,104,2.8,w==='B'?'第三隧道':w==='C'?'':'通行止め',{c:'#2a2420',al:'center',f:'m'});tx(235,108.5,2.4,w==='B'?'延長 418m':w==='C'?'':'月代町',{c:'#2a2420',al:'center',f:'m'});
    mark('side_plate',w==='B'?'銘板「月代線 第三隧道」':'銘板「この先 通行止め 月代町」',223,97,24,20);
    // 信号機（B）
    if(w==='B'){R(g,OL,256,60,3,84);R(g,'#4a4a52',257,60,1,84);R(g,OL,252,60,11,22);R(g,'#1a1a1e',253,61,9,20);ell(g,'#2a1a1a',257,66,2,2);ell(g,'#5aff8a',257,74,2,2);glow(g,257,74,10,'90,255,140',.45);mark('signal','鉄道の信号機（青）',251,58,13,86);}
    else if(w==='A'){R(g,OL,256,96,3,48);R(g,'#5a5a62',257,96,1,48);R(g,OL,248,90,18,8);R(g,'#2a6aa8',249,91,16,6);mark('signal','錆びた道路標識の柱',247,88,20,56);}
    if(w==='C'){vines(g,104,52,112,50,49);}
    else vines(g,104,54,112,22,47,[P.g5,P.g4,P.g6]);
    return D;
  },
  fx(g,w,t){
    // しずく
    const y=((t*40)%40);px(g,'rgba(180,200,230,.8)',150,104+y*.0+y);
    if(w==='C'){glowE(g,160,120,16+Math.sin(t*2)*3,12,'159,240,224',.2);motes(g,t,14,'159,240,224',[124,76,72,70],5);}
    fog(g,t,138,30,w==='C'?'100,180,170':'120,120,170',.07,43);
  }
});

// ───────── 山道（地図にない道） ─────────
scene('mountain_road',{worlds:'ABC',name:'山道（地図にない道）',
  bg(g,w){
    nightSky(g,w,90,{mx:86,my:22,seed:51});
    hills(g,52,6,w==='C'?'#1a2a28':'#161a34',52,10);hills(g,66,6,w==='C'?'#142220':'#10142a',53,8);
    treeLine(g,84,w==='C'?'#0e1c18':'#0a0e1e',54,16);
    vgrad(g,0,84,W,H-84,w==='C'?['#0e1a16','#0a1210']:['#0c1020','#080a16']);
    // 道
    poly(g,'#2a2a38',[40,H,250,H,184,110,170,96,150,88,138,88,150,96,152,110]);
    poly(g,w==='C'?'#2a302c':'#323244',[48,H,240,H,180,112,168,98,150,90,142,90,152,98,156,112]);
    for(let k=0;k<6;k++){const f=k/6,y=180-f*86;R(g,w==='C'?'#5a6050':'#c8c0a0',146+f*4-(1-f)*4,y-(1-f)*6,1+(1-f)*2,3+(1-f)*4);}
    // ガードレール
    for(let k=0;k<7;k++){const f=k/7,x=244-f*62,y=170-f*72,h=10-f*6;R(g,OL,x,y-h,2,h);R(g,'#c8c8d0',x,y-h,1,h);}
    line(g,'#d8d8e0',244,160,182,98);line(g,'#9a9aa8',244,163,182,100);
    // 分かれ道（地図にない道）
    const D={};
    if(w==='B'){poly(g,'#3a3a4a',[200,128,212,120,286,100,296,106]);poly(g,'#44445a',[204,126,214,121,286,103,292,106]);
      lamp(g,268,62,{h:42,left:false,cw:30,ch:40});R(g,OL,248,74,1,36);ell(g,OL,248,72,6,6);ell(g,'#e8e8f0',248,72,5,5);ell(g,'#c03030',248,72,3,3);
      R(g,OL,240,82,16,12);R(g,'#f4f4f0',241,83,14,10);tx(248,83.4,2.6,'月代駅前',{c:'#1a2a6a',al:'center',b:true});tx(248,87,2.2,'時刻表',{c:'#2a2a2a',al:'center'});for(let k=0;k<3;k++)R(g,'#5a5a6a',242,90+k,12,0.5);
      mark('bus_stop','バス停「月代駅前」（Bだけ）',239,66,18,44);mark('side_road','舗装された脇道（Bでは街灯つき）',200,96,96,34);}
    else if(w==='A'){poly(g,'#1e2228',[200,130,214,122,286,104,300,110]);grass(g,200,132,100,90,['#1a2a26','#22322c','#14201c'],57);glowE(g,262,110,36,10,'79,200,188',.16);
      mark('side_road','地図にない脇道（草に埋もれ、かすかに光る）',200,96,96,34);}
    else{poly(g,'#1a2420',[200,130,214,122,286,104,300,110]);mark('side_road','脇道（霧の中）',200,96,96,34);}
    // カーブミラー
    R(g,OL,206,52,3,70);R(g,'#e87a3a',207,52,1,70);ell(g,OL,207,48,10,9);ell(g,'#e87a3a',207,48,9,8);ell(g,w==='C'?'#3a4a4a':'#4a5a7a',207,48,7,6);px(g,'#9ab0d0',204,45);
    if(w==='C')crack(g,'#c8d8e0',203,43,6,3);
    D.mirror=[207,48];
    mark('mirror',w==='C'?'割れたカーブミラー':'カーブミラー（映り込みが変わる）',196,38,22,84);
    // 道路標識
    R(g,OL,86,72,2,52);R(g,'#8a8a96',86,72,1,52);R(g,OL,72,60,30,14);R(g,w==='C'?'#2a4a4a':'#2a5aa8',73,61,28,12);R(g,'#ffffff',74,62,26,1);
    tx(87,62.8,5.2,w==='C'?'月　峠':'月代峠',{c:'#ffffff',al:'center',b:true});tx(87,68.8,2.6,w==='B'?'月代駅 3km':'1.5km',{c:'#e0e8ff',al:'center'});
    mark('road_sign',w==='B'?'標識「月代峠／月代駅 3km」':'標識「月代峠 1.5km」',71,59,32,16);
    // 倒木（C）
    if(w==='C'){poly(g,OL,[70,150,250,120,254,128,74,160]);poly(g,'#3a2a20',[72,151,250,122,252,126,74,157]);mark('fallen_tree','道をふさぐ倒木',70,118,184,42);}
    // 手前の草
    grass(g,0,180,50,60,['#1a2228','#222a34'],58);grass(g,262,180,58,60,['#1a2228','#222a34'],59);
    return D;
  },
  fx(g,w,t,o,D){
    fog(g,t,96,40,w==='C'?'100,170,160':'110,120,170',.08,52);
    if(w==='A'){motes(g,t,10,'159,240,224',[220,90,80,30],6);}
    if(w==='B'){glowE(g,276,66,8,6,'255,190,110',.05+.04*Math.sin(t*9));}
    // ミラーにちらつく何か
    if(D&&D.mirror&&w!=='C'&&Math.sin(t*.7)>.93){R(g,'rgba(230,230,255,.6)',D.mirror[0]-1,D.mirror[1]-2,2,4);}
  }
});

// ───────── 月代駅（廃墟・営業中で共通の構図） ─────────
// 手前に線路、中段にホーム、上に上屋。駅名標は中央、ベンチと時刻表は左、時計は右の上屋の下、広告板はその右（4:3 に切っても見える位置）。
function stationBase(g,mode,behind){
  // mode: 'ruin'（A 廃墟）'kept'（B 夜の無人駅）'C'（崩れ）'live'（営業中）'liveB'
  const live=mode==='live'||mode==='liveB',ruin=mode==='ruin'||mode==='C';
  const w=mode==='C'?'C':(mode==='kept'||mode==='liveB')?'B':'A';
  nightSky(g,w,100,{mx:48,my:18,seed:61});
  hills(g,64,5,w==='C'?'#1a2a28':'#141a32',62,8);treeLine(g,84,w==='C'?'#0e1c18':'#0a0e1e',63,12);
  const D={};
  // 奥の線路（列車が止まる側）
  R(g,w==='C'?'#141c1a':'#12121e',0,84,W,30);
  R(g,ruin?'#4a3a30':'#5a5a6a',0,104,W,1);R(g,ruin?'#3a2e26':'#7a7a8a',0,108,W,1);
  if(behind)behind(g,D);
  // ホーム
  R(g,OL,0,111,W,2);vgrad(g,0,113,W,8,ruin?['#5a5a5e','#4a4a50']:['#7a7a88','#6a6a78']);
  if(!ruin||mode==='ruin'){for(let x=0;x<W;x+=4)R(g,mode==='ruin'?'#7a6a3a':'#e8c040',x,114,3,1);}
  R(g,OL,0,121,W,1);vgrad(g,0,122,W,30,ruin?['#3a3a40','#2e2e34','#24242a']:['#4a4a58','#3e3e4a','#32323c']);
  for(let x=0;x<W;x+=20)R(g,ruin?'#2a2a30':'#383844',x,122,1,30);
  if(ruin){srand(64);for(let i=0;i<10;i++){const x=rnd()*W;crack(g,'#1e1e22',x,123,10,i+3);}poly(g,'#24242a',[60,111,84,111,78,124,64,121]);}
  // 手前の線路
  vgrad(g,0,152,W,28,w==='C'?['#1a2220','#141a18']:['#2a2622','#201c1a','#16120e']);
  for(let x=-4;x<W;x+=11){R(g,ruin?'#3a2a20':'#4a3a2e',x,160,8,3);R(g,ruin?'#3a2a20':'#4a3a2e',x+2,172,8,3);}
  R(g,OL,0,157,W,3);R(g,ruin?'#7a4a30':'#a8a8b8',0,157,W,1);R(g,ruin?'#5a3a28':'#8a8a98',0,158,W,1);
  R(g,OL,0,170,W,3);R(g,ruin?'#7a4a30':'#a8a8b8',0,170,W,1);R(g,ruin?'#5a3a28':'#8a8a98',0,171,W,1);
  if(ruin)grass(g,0,180,W,mode==='C'?380:220,['#1e2e26','#2a3a2e','#18241e','#34442e'],65);
  // 上屋
  const cy=46;
  for(const x of [58,160,262]){R(g,OL,x-3,cy+6,6,106-cy-6+5);R(g,ruin?'#4a3a34':'#6a6a7a',x-2,cy+6,4,106-cy-1);R(g,ruin?'#5a4a40':'#8a8a9a',x-2,cy+6,1,106-cy-1);}
  if(mode==='C'){poly(g,OL,[20,cy-2,180,cy-6,200,cy+40,40,cy+16]);poly(g,'#3a3a40',[22,cy-1,178,cy-5,196,cy+36,40,cy+14]);R(g,OL,190,cy-2,110,8);R(g,'#3a3a40',191,cy-1,108,6);}
  else{R(g,OL,20,cy-4,282,11);R(g,ruin?'#4a3e3a':'#5a5e72',21,cy-3,280,9);R(g,ruin?'#5a4e48':'#7a7e94',21,cy-3,280,2);R(g,OL,20,cy+6,282,1);
    if(mode==='ruin'){for(const x0 of [90,200]){poly(g,'#0a0a14',[x0,cy-3,x0+18,cy-3,x0+12,cy+6,x0+4,cy+6]);}vines(g,22,cy+6,278,26,66);}}
  // 灯り
  const lampX=[110,214];
  for(const x of lampX){R(g,OL,x-5,cy+6,10,3);
    if(live||mode==='kept'){R(g,'#f4f8ff',x-4,cy+7,8,1);glowE(g,x,cy+14,46,22,live?'220,230,255':'200,210,255',live?.28:.14);cone(g,x,cy+8,8,70,58,live?'220,230,255':'200,210,255',live?.08:.04);}
    else R(g,'#2a2a30',x-4,cy+7,8,1);}
  D.lampX=lampX;
  // 駅名標
  const nx=126,ny=74,nw=68,nh=26;
  R(g,OL,nx+8,ny+nh,3,112-ny-nh);R(g,OL,nx+nw-11,ny+nh,3,112-ny-nh);
  R(g,OL,nx-1,ny-1,nw+2,nh+2);R(g,ruin?'#b8b4a8':'#f4f4f4',nx,ny,nw,nh);R(g,ruin?'#3a5a4a':'#2a6a4a',nx,ny+nh-7,nw,7);
  if(mode==='ruin'){speck(g,'#8a6a4a',nx,ny,nw,nh,60,67);poly(g,'#7a5a3a',[nx+nw-14,ny,nx+nw,ny,nx+nw,ny+10]);}
  if(mode==='C'){poly(g,'#0e1412',[nx+30,ny,nx+nw,ny,nx+nw,ny+nh,nx+40,ny+nh]);}
  const nm=mode==='ruin'?'つき　ろ':mode==='C'?'つき':'つきしろ';
  tx(nx+nw/2,ny+2,3.4,mode==='ruin'||mode==='C'?'':'月　代',{c:'#2a2a2a',al:'center',f:'m'});
  tx(nx+nw/2,ny+6,10,nm,{c:'#1a1a1a',al:'center',b:true,alt:live?'つきじろ':null});
  if(mode!=='C'){tx(nx+3,ny+nh-6.4,4.4,mode==='ruin'?'←　さな':'← ささなみ',{c:'#ffffff'});tx(nx+nw-3,ny+nh-6.4,4.4,mode==='ruin'?'みず　→':'みずはら →',{c:'#ffffff',al:'right'});}
  mark('name_board','駅名標「つきしろ」'+(mode==='ruin'?'（文字が欠けている）':''),nx-1,ny-1,nw+2,nh+2);
  // 時計（上屋の下）
  const cx=214,cyy=cy+16;line(g,OL,cx,cy+6,cx,cyy-7);
  if(mode==='C'){mark('clock','（時計は落ちている）',cx-8,cyy-8,16,16);}
  else{R(g,OL,cx-8,cyy-7,16,14);R(g,ruin?'#4a4a50':'#2a2a34',cx-7,cyy-6,14,12);clock(g,cx,cyy,5,2,mode==='ruin'?44:mode==='kept'?17:44,{face:ruin?'#a8a49a':'#f4f4f4'});
    mark('clock',mode==='ruin'?'止まった時計（2:44）':mode==='kept'?'時計（2:17）':'時計（2:44・秒針が動く）',cx-8,cyy-7,16,14);}
  D.clock=[cx,cyy];
  // 時刻表（左の柱）
  R(g,OL,60,68,20,28);R(g,ruin?'#8a8478':'#f0f0ec',61,69,18,26);R(g,ruin?'#4a3a30':'#1a3a6a',61,69,18,5);
  tx(70,69.4,3.4,ruin?'':'時刻表',{c:'#ffffff',al:'center',b:true});
  if(!ruin){for(let r=0;r<6;r++){tx(62.5,75+r*3.2,2.4,['5','6','7','22','23','0'][r],{c:'#1a1a1a',b:true});for(let k=0;k<3;k++)R(g,'#5a5a6a',67+k*4,76+r*3.2,2,1);}R(g,'#c83030',62,93.6,16,.6);tx(70,93.6,2.2,'終電 0:44',{c:'#c83030',al:'center',b:true});}
  else{speck(g,'#5a4a3a',61,69,18,26,40,68);poly(g,'#3a3a3e',[233,84,253,80,253,99,233,99]);}
  mark('timetable',ruin?'時刻表（はがれている）':'時刻表（終電 0:44）',59,67,22,30);
  // 広告板（右）
  const ax=230,ay=64,aw=44,ah=40;R(g,OL,ax+6,ay+ah,2,112-ay-ah);R(g,OL,ax+aw-8,ay+ah,2,112-ay-ah);R(g,OL,ax-2,ay-2,aw+4,ah+4);R(g,ruin?'#3a3632':'#3a3a48',ax-1,ay-1,aw+2,ah+2);
  D.ad=[ax,ay,aw,ah];
  if(live)adSmall(g,ax,ay,aw,ah);
  else if(mode==='kept'){R(g,'#d8d4c8',ax,ay,aw,ah);R(g,'#2a4a8a',ax,ay,aw,8);tx(ax+aw/2,ay+1.5,4.4,'月代の名水',{c:'#ffffff',al:'center',b:true});ell(g,'#6a9ad0',ax+aw/2,ay+24,10,9);tx(ax+aw/2,ay+33,3,'月代町観光協会',{c:'#2a2a3a',al:'center'});}
  else{R(g,'#5a5248',ax,ay,aw,ah);speck(g,'#7a6a58',ax,ay,aw,ah,90,69);poly(g,'#c8c0b0',[ax+2,ay+4,ax+20,ay+2,ax+16,ay+20,ax+4,ay+22]);for(let k=0;k<3;k++)R(g,'#3a3430',ax+6+k*4,ay+8,2,3);}
  mark('ad_board',live?'広告板（配信サービス「よるのまど」：配信者の写真5枚）':mode==='kept'?'広告板（月代の名水）':'朽ちた広告板（紙の切れ端）',ax-2,ay-2,aw+4,ah+4);
  // ベンチ
  if(mode!=='C'){R(g,OL,80,98,34,4);R(g,ruin?'#5a4030':'#8a5a3a',81,99,32,2);R(g,OL,80,93,34,3);R(g,ruin?'#5a4030':'#8a5a3a',81,94,32,1);R(g,OL,83,102,2,9);R(g,OL,109,102,2,9);
    if(mode==='ruin'){poly(g,'#1a1a1e',[100,98,114,98,114,101,104,101]);}
    mark('bench','ベンチ',79,92,36,20);}
  else{poly(g,'#3a2a20',[80,110,112,104,114,108,82,112]);mark('bench','壊れたベンチ',79,102,36,12);}
  // 待合室（左奥）
  R(g,OL,0,60,46,52);R(g,ruin?'#3a3230':'#5a4a40',0,61,45,51);windowLit(g,8,70,28,18,{lit:mode==='kept'||live,c1:'#fff0c8',c2:'#e8c890',c3:'#c8a070',bars:3,d1:ruin?'#141418':'#1e2034'});
  R(g,OL,14,94,16,18);R(g,ruin?'#2a2220':'#3a2a20',15,95,14,17);
  mark('waiting_room',mode==='kept'||live?'待合室（明かり）':'待合室（暗い）',0,60,46,52);
  if(mode==='C'){glowE(g,160,120,120,16,'79,200,188',.15);vines(g,0,40,W,50,61);}
  return D;
}
// 広告（小）：配信サービス「よるのまど」
function adSmall(g,x,y,w,h){
  R(g,'#14122a',x,y,w,h);vgrad(g,x,y,w,8,['#3a2a7a','#2a1e5a']);tx(x+w/2,y+1.4,4.4,'よるのまど',{c:'#f0e8ff',al:'center',b:true});
  tx(x+w/2,y+9,2.2,'深夜ライブ配信 毎晩更新',{c:'#c8c0f0',al:'center'});
  const fw=7,gap=1.2;for(let i=0;i<5;i++){const fx=x+2.6+i*(fw+gap),fy=y+15;R(g,OL,fx-.5,fy-.5,fw+1,10);
    if(i<4){R(g,['#5a7ab0','#b07a8a','#6aa08a','#a89060'][i],fx,fy,fw,9);ell(g,'#e0c4b0',fx+fw/2,fy+4,2,2.4);R(g,['#2a1a1a','#d8c060','#1a2a3a','#6a3a2a'][i],fx+1,fy+1,fw-2,2);R(g,'#2a2a3a',fx+1,fy+7,fw-2,2);}
    else{R(g,'#3a3a4a',fx,fy,fw,9);}
    R(g,'#e8e4f0',fx,fy+10,fw,2.5);}
  R(g,'#e83a6a',x+w-10,y+h-6,8,4);tx(x+w-6,y+h-5.6,2.4,'LIVE',{c:'#ffffff',al:'center',b:true});
}

scene('station_ruin',{worlds:'ABC',name:'月代駅（廃墟）',
  bg(g,w){return stationBase(g,w==='A'?'ruin':w==='B'?'kept':'C');},
  fx(g,w,t,o,D){
    if(w==='C'){motes(g,t,20,'159,240,224',[0,40,W,120],61);fog(g,t,96,40,'100,170,160',.08,62);}
    if(w==='A'){fog(g,t,100,40,'110,120,170',.07,63);motes(g,t,6,'200,200,255',[100,70,120,40],64);}
    if(w==='B'){for(const x of D.lampX)glowE(g,x,60,20,10,'200,210,255',.03+.02*Math.sin(t*3+x));}
  }
});

scene('station_live',{worlds:'AB',name:'月代駅（営業中）',
  key(o){return (o.adCloseup?'ad':'')+(o.flags&&o.flags.train===false?'nt':'');},
  vig:.35,
  bg(g,w,o){
    if(o.adCloseup)return adCloseBg(g,w,o);
    const train=!(o.flags&&o.flags.train===false);
    const D=stationBase(g,w==='B'?'liveB':'live',(g,D)=>{
    if(train){
      const ty=58,th=48;const c1=w==='B'?'#d8d0b0':'#e8dcc0',c2=w==='B'?'#3a6a4a':'#8a2a3a';
      R(g,OL,-2,ty-1,236,th+2);R(g,c1,0,ty,234,th);R(g,c2,0,ty+th-14,234,14);R(g,c2,0,ty+4,234,3);R(g,mix(c1,'#000000',.2),0,ty,234,2);
      // 窓と乗客
      for(let k=0;k<10;k++){const x=4+k*23;if(k%4===3){R(g,OL,x,ty+10,14,th-12);R(g,mix(c1,'#000000',.15),x+1,ty+11,12,th-13);R(g,OL,x+7,ty+11,1,th-13);continue;}
        R(g,OL,x,ty+10,18,16);vgrad(g,x+1,ty+11,16,14,['#fff4d8','#f0d8a0','#d8b878']);
        srand(k*7+3);if(rnd()<.8){const ph=x+3+rnd()*8;R(g,'rgba(40,30,40,.75)',ph,ty+15,5,10);R(g,'rgba(40,30,40,.75)',ph+1,ty+12,3,3);}
        if(rnd()<.5){const ph=x+10+rnd()*4;R(g,'rgba(40,30,40,.6)',ph,ty+16,4,9);R(g,'rgba(40,30,40,.6)',ph+.5,ty+13,3,3);}
        glowE(g,x+9,ty+18,14,10,'255,230,170',.22);}
      // 先頭（右）
      poly(g,OL,[232,ty-1,246,ty+6,248,ty+th+1,232,ty+th+1]);poly(g,c1,[233,ty,245,ty+7,247,ty+th,233,ty+th]);R(g,c2,233,ty+th-14,14,14);
      ell(g,'#fff8e0',241,ty+th-8,2,2);glow(g,241,ty+th-8,18,'255,240,200',.5);
      tx(239,ty+12,3,w==='B'?'急行':'普通',{c:'#1a1a1a',al:'center',b:true});
      mark('train','停車中の列車（乗客の影）',0,ty-1,248,th+2);
      D.train={ty,th};
    }else{mark('train','（列車なし：flags.train=false）',0,58,248,50);}
    });
    // 群衆
    const crowd=[
      [30,140,40,{f:'b',hair:'#1a1a22',top:'#3a3a4a',bot:'#2a2a34',bag:'#5a4a3a'}],
      [72,139,38,{f:'r',hair:'#3a2a20',top:'#8a6a4a',bot:'#4a4a5a',skirt:true,long:true}],
      [124,141,36,{f:'f',hair:'#1a1a1a',top:'#2a3a5a',bot:'#1a2a4a',skirt:true,bag:'#3a2a20'}],
      [144,141,40,{f:'l',hair:'#2a2020',top:'#4a4a52',bot:'#2a2a30',bag:'#1a1a1e'}],
      [190,140,34,{f:'f',hair:'#9a9aa0',top:'#6a4a5a',bot:'#3a3040',skirt:true}],
      [206,141,24,{kid:true,f:'f',hair:'#1a1a1a',top:'#e0b040',bot:'#3a4a7a'}],
      [252,142,40,{f:'b',hair:'#2a1a1a',top:'#5a4a3a',bot:'#2a2a2a'}],
      [292,140,38,{f:'l',hair:'#1a1a2a',top:'#2a2a30',bot:'#1a1a20',hat:'cap',hatc:'#3a3a40'}]];
    crowd.forEach((c,i)=>{if(stab()<=30&&i===4)return;person(g,c[0],c[1],c[2],Object.assign({rim:.16,rimc:[220,230,255]},c[3]));});
    if(stab()>30)mark('old_woman','年配の女性と子供（安定度30未満で消える）',180,104,34,38);
    // 駅員
    person(g,104,140,40,{f:'f',hair:'#1a1a1a',skin:'#d8b8a0',top:'#1c2440',top2:'#141a30',bot:'#141a30',hat:'conductor',rim:.16,rimc:[220,230,255]});
    R(g,OL,112,118,3,8);R(g,'#e8e8f0',112,118,2,3);R(g,'#c83030',112,121,2,3);
    mark('conductor','駅員（制帽・旗）',94,98,22,44);
    mark('crowd','乗客たち',20,98,290,44);
    return D;
  },
  fx(g,w,t,o,D){
    if(o.adCloseup){adCloseFx(g,w,t,o,D);return;}
    if(D.clock){const [cx,cy]=D.clock;R(g,'#2a2a34',cx-6,cy-5,12,10);clock(g,cx,cy,5,2,44,{face:'#f4f4f4',sec:(t*1|0)%60});}
    if(D.train){const {ty,th}=D;for(let k=0;k<10;k++){if(k%4===3)continue;const x=4+k*23;const f=.06+.04*Math.sin(t*2+k);R(g,`rgba(255,240,200,${f})`,x+1,ty+11,16,14);}}
    // 広告の5枚目のノイズ
    if(D.ad){const [x,y,w2]=D.ad;const fx0=x+2.6+4*8.2,fy=y+15;for(let j=0;j<9;j++)for(let i=0;i<7;i++){const v=hash(i+j*7,(t*16)|0);px(g,v>.66?'#c8c8d8':v>.33?'#5a5a6a':'#1a1a24',fx0+i,fy+j);}}
    for(const x of D.lampX||[])glowE(g,x,60,24,12,'220,230,255',.03+.03*Math.sin(t*2.2+x));
  },
  post(ctx,L,w,t,o,D){
    if(o.adCloseup&&D&&D.tag){
      const g=+o.glitch||0;
      const T=[{x:D.tag[0],y:D.tag[1],s:D.tag[2],str:'だんのうら',c:'#1a1424',al:'center',b:true,glitch:g}];
      if(g>0){ctx.save();ctx.globalAlpha=.6;drawText(ctx,[Object.assign({},T[0],{x:T[0].x+g*1.4,c:'rgba(232,48,85,.8)'})],L,o,100,t);drawText(ctx,[Object.assign({},T[0],{x:T[0].x-g*1.4,c:'rgba(79,220,230,.8)'})],L,o,100,t);ctx.restore();}
      drawText(ctx,T,L,o,100,t);
    }
  }
});
// 広告の大写し（opts.adCloseup）
function adCloseBg(g,w,o){
  vgrad(g,0,0,W,H,['#1a1a2a','#14141e','#0e0e16']);
  // 壁のタイル
  for(let y=0;y<H;y+=8)R(g,'#20202e',0,y,W,1);for(let x=0;x<W;x+=12)for(let y=0;y<H;y+=8)R(g,'#20202e',x+((y/8)%2)*6,y,1,8);
  // 額縁
  const x=34,y=14,ww=252,hh=146;
  R(g,OL,x-4,y-4,ww+8,hh+8);R(g,'#4a4a58',x-3,y-3,ww+6,hh+6);R(g,'#6a6a7a',x-3,y-3,ww+6,1);
  vgrad(g,x,y,ww,hh,['#1c1838','#14122a','#0e0c20']);
  vgrad(g,x,y,ww,22,['#4a3490','#3a2a7a','#2a1e5a']);
  tx(x+ww/2,y+3,13,'よるのまど',{c:'#f4eeff',al:'center',b:true,gl:'rgba(200,180,255,.8)'});
  tx(x+ww/2,y+24,5,'深夜ライブ配信サービス　毎晩更新中　─　眠れない夜に、だれかの声を',{c:'#c8c0f0',al:'center'});
  // 月のロゴ
  ell(g,'#f0e8c0',x+18,y+11,6,6);ell(g,'#3a2a7a',x+21,y+9,5,5);
  const D={photos:[]};const pw=40,ph=50,gap=6,x0=x+(ww-(5*pw+4*gap))/2,py=y+36;
  const names=['ほしのこ','くろがね','みなも','ユキチ'];const bgs=['#5a7ab0','#b07a8a','#6aa08a','#a89060'];const hair=['#2a1a1a','#d8c060','#1a2a3a','#6a3a2a'];const top=['#3a3a5a','#e8e0f0','#2a4a4a','#5a2a2a'];
  for(let i=0;i<5;i++){const fx=x0+i*(pw+gap);R(g,OL,fx-1,py-1,pw+2,ph+2);R(g,'#f0ecf4',fx,py,pw,ph);
    if(i<4){vgrad(g,fx+2,py+2,pw-4,ph-4,[bgs[i],mix(bgs[i],'#000000',.3)]);
      // 胸から上の人物
      ell(g,top[i],fx+pw/2,py+ph-2,14,10);R(g,'#e0c4b0',fx+pw/2-3,py+28,6,6);ell(g,'#e8ccb8',fx+pw/2,py+22,8,9);
      ell(g,hair[i],fx+pw/2,py+16,9,6);if(i===1||i===2){R(g,hair[i],fx+pw/2-9,py+16,4,16);R(g,hair[i],fx+pw/2+5,py+16,4,16);}
      if(i===3)R(g,hair[i],fx+pw/2-9,py+11,18,4);
      px(g,'#2a1a1a',fx+pw/2-3,py+23);px(g,'#2a1a1a',fx+pw/2+3,py+23);R(g,'#c86a6a',fx+pw/2-1,py+27,3,1);
      if(i===0){ell(g,'#ffe080',fx+pw/2+7,py+12,2,2);}}
    else{D.photos.push([fx+2,py+2,pw-4,ph-4]);D.tag=[fx+pw/2,py+ph+3,6];R(g,'#2a2a34',fx+2,py+2,pw-4,ph-4);}
    // 名札の地
    R(g,i<4?'#2a2450':'#e8e4f0',fx-1,py+ph+2,pw+2,8);
    if(i<4)tx(fx+pw/2,py+ph+3,6,names[i],{c:'#f0ecf4',al:'center',b:true});
  }
  mark('photo_1','写真1「ほしのこ」',x0-1,py-1,pw+2,ph+12);mark('photo_2','写真2「くろがね」',x0+pw+gap-1,py-1,pw+2,ph+12);mark('photo_3','写真3「みなも」',x0+2*(pw+gap)-1,py-1,pw+2,ph+12);mark('photo_4','写真4「ユキチ」',x0+3*(pw+gap)-1,py-1,pw+2,ph+12);
  mark('photo_noise','写真5（ノイズで顔が見えない）',x0+4*(pw+gap)-1,py-1,pw+2,ph+2);mark('name_tag','5枚目の名札（だんのうら：opts.glitch で崩れる）',x0+4*(pw+gap)-1,py+ph+1,pw+2,10);
  tx(x+ww/2,y+hh-14,4.4,'アプリで「よるのまど」と検索',{c:'#a8a0d8',al:'center'});
  R(g,'#e83a6a',x+ww-30,y+hh-16,24,10);tx(x+ww-18,y+hh-14.6,6,'LIVE',{c:'#ffffff',al:'center',b:true});
  // 蛍光灯の映り込み
  poly(g,'rgba(255,255,255,.05)',[x+20,y,x+70,y,x+20,y+hh,x-30,y+hh]);
  return D;
}
function adCloseFx(g,w,t,o,D){
  const gl=+o.glitch||0;
  for(const [x,y,ww,hh] of D.photos){
    for(let j=0;j<hh;j++)for(let i=0;i<ww;i+=1){const v=hash(i*3+j*131,(t*14)|0);g.fillStyle=v>.7?'#b8b8c8':v>.4?'#4a4a5a':'#16161e';g.fillRect(x+i,y+j,1,1);}
    // ノイズの奥の気配：紫の髪・小さな帽子・めがね（顔は見えない）
    const a=.35+.25*Math.sin(t*1.3);g.save();g.globalAlpha=a;
    ell(g,'#5a3590',x+ww/2,y+hh*.42,8,9);R(g,'#5a3590',x+ww/2+4,y+hh*.42,4,14);R(g,'#a54a70',x+ww/2-4,y+hh*.14,8,5);R(g,'#a54a70',x+ww/2-6,y+hh*.24,12,2);
    R(g,'#d9708e',x+ww/2+6,y+hh*.3,3,3);ell(g,'#c6b2ee',x+ww/2,y+hh-3,14,8);
    R(g,'#0a0812',x+ww/2-6,y+hh*.46,5,3);R(g,'#0a0812',x+ww/2+1,y+hh*.46,5,3);
    g.restore();
    for(let k=0;k<3;k++){const yy=y+((t*40+k*17)%hh);R(g,'rgba(255,255,255,.12)',x,yy,ww,1);}
  }
  if(gl>0){
    TMP.getContext('2d').clearRect(0,0,W,H);TMP.getContext('2d').drawImage(g.canvas,0,0);
    const n=Math.round(4+gl*14);for(let i=0;i<n;i++){const y=(hash(i,(t*9)|0)*H)|0,h=1+((hash(i+5,(t*9)|0)*6*gl)|0),off=Math.round((hash(i+9,(t*9)|0)-.5)*24*gl);g.drawImage(TMP,0,y,W,h,off,y,W,h);}
    g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.25*gl;g.drawImage(TMP,2*gl,0);g.restore();
    if(gl>.6){for(let i=0;i<30;i++){const y=hash(i,(t*20)|0)*H;R(g,'rgba(180,240,255,.18)',0,y,W,1);}}
  }
}

// ───────── 住宅街 ─────────
scene('residential',{worlds:'ABC',name:'住宅街',
  bg(g,w){
    nightSky(g,w,90,{mx:290,my:18,seed:71});
    hills(g,60,4,w==='C'?'#1a2a28':'#14182e',72,10);
    const D={win:[]};
    // B：火の見櫓（遠景）
    if(w==='B'){const fx=112,c='#3e3a58';line(g,c,fx-8,92,fx-2,24);line(g,c,fx+8,92,fx+2,24);for(let k=0;k<6;k++){line(g,c,fx-8+k,92-k*11,fx+7-k,81-k*11);line(g,c,fx+8-k,92-k*11,fx-7+k,81-k*11);}R(g,c,fx-6,26,12,2);poly(g,c,[fx-6,24,fx,15,fx+6,24]);ell(g,'#c8a050',fx,21,1.5,1.5);R(g,c,fx,10,1,6);mark('fire_tower','火の見やぐら（Bだけ。半鐘つき）',102,9,20,84);}
    // 家
    const houses=[[28,108],[122,202],[214,294]];
    const roofs=w==='C'?['#2a302e','#262c2a','#2a302e']:w==='B'?['#3a3a48','#4a3a34','#3a3a48']:['#3a4680','#5e3c28','#3a6044'];
    const walls=w==='C'?['#3a403e','#343a38','#3a403e']:w==='B'?['#8a7458','#7a6450','#8a7458']:['#d8cfbf','#b8b0a8','#e4d8c0'];
    houses.forEach(([x0,x1],i)=>{
      const hw=x1-x0,top=i===1?50:56;
      R(g,OL,x0,top+14,hw,120-top-14);vgrad(g,x0+1,top+15,hw-2,120-top-15,[walls[i],mix(walls[i],'#000000',.3)]);
      if(w==='B')for(let x=x0+2;x<x1-1;x+=3)R(g,mix(walls[i],'#000000',.15),x,top+15,1,120-top-15);
      // 屋根
      if(w==='C'&&i!==1){poly(g,OL,[x0-6,top+15,x0+hw*.4,top-2,x0+hw*.6,top+8,x1+6,top+15]);poly(g,roofs[i],[x0-4,top+14,x0+hw*.4,top,x0+hw*.6,top+9,x1+4,top+14]);poly(g,'#0a0e0c',[x0+hw*.3,top+8,x0+hw*.7,top+8,x0+hw*.6,top+20,x0+hw*.4,top+22]);}
      else{poly(g,OL,[x0-6,top+15,x0+hw/2,top-2,x1+6,top+15]);poly(g,roofs[i],[x0-4,top+14,x0+hw/2,top,x1+4,top+14]);for(let k=1;k<5;k++){const yy=top+k*3;R(g,mix(roofs[i],'#000000',.25),x0+hw/2-(hw/2+4)*k/5,yy,(hw+8)*k/5,1);}}
      // 窓
      const lit=w==='A'?[[1,1,0],[0,0,0],[0,1,0]][i]:w==='B'?[[1,0,1],[1,1,0],[0,1,0]][i]:[[0,0,0],[0,0,0],[0,0,0]][i];
      const wins=[[x0+8,top+22,16,12],[x1-24,top+22,16,12],[x0+8,top+44,20,14]];
      wins.forEach((r,k)=>{windowLit(g,r[0],r[1],r[2],r[3],{lit:!!lit[k],curtain:true,fig:i===0&&k===2&&lit[k],bars:2,d1:w==='C'?'#141c1a':'#22243e',d2:w==='C'?'#0a100e':'#121428'});if(lit[k])D.win.push([r[0]+r[2]/2,r[1]+r[3]/2]);
        if(w==='C'&&hash(i,k)>.4)poly(g,'#060808',[r[0],r[1],r[0]+r[2]*.6,r[1],r[0]+2,r[1]+r[3]]);});
      // 玄関
      R(g,OL,x1-30,top+40,16,120-top-40);R(g,w==='C'?'#2a2e2c':'#6a4a34',x1-29,top+41,14,120-top-41);R(g,P.a3,x1-17,top+56,1,2);
      if(w==='A'&&i!==1)glow(g,x1-22,top+38,8,'255,200,130',.3);
    });
    mark('house_1','左の家（A:窓2つ明かり／B:窓2つ明かり）',28,56,80,64);
    mark('house_2',w==='B'?'中央の家（明かりがついている：表札「水原」）':w==='A'?'中央の家（空き家・「売家」）':'中央の家（崩れ）',122,50,80,70);
    mark('house_3','右の家',214,56,80,64);
    // ブロック塀
    for(const [x0,x1] of [[20,116],[118,206],[210,302]]){R(g,OL,x0,120,x1-x0,20);R(g,w==='C'?'#3a3e3c':'#8a8a92',x0+1,121,x1-x0-2,19);for(let y=124;y<140;y+=5)R(g,w==='C'?'#2a2e2c':'#6a6a72',x0+1,y,x1-x0-2,1);for(let y=121,k=0;y<140;y+=5,k++)for(let x=x0+1+(k%2)*6;x<x1;x+=12)R(g,w==='C'?'#2a2e2c':'#6a6a72',x,y,1,5);}
    // 表札
    const plates=[[30,'佐伯'],[124,w==='B'?'水原':w==='A'?'':''],[216,'高橋']];
    plates.forEach(([x,n],i)=>{if(!n&&!(w==='A'&&i===1))return;R(g,OL,x,124,8,12);R(g,w==='C'?'#4a4e4c':'#e8e0cc',x+1,125,6,10);if(n)tx(x+4,125.4,3.6,n,{c:'#1a1a1a',v:true,al:'center',f:'m',sp:-.1});});
    mark('nameplate_2',w==='B'?'中央の家の表札「水原」':'中央の家の表札（空白）',123,123,10,14);
    if(w==='A'){R(g,OL,150,122,24,14);R(g,'#f4f4f8',151,123,22,12);tx(162,123.4,5.4,'売家',{c:'#c02020',al:'center',b:true});tx(162,130,2.4,'月代不動産',{c:'#2a2a3a',al:'center'});mark('for_sale','「売家」の札（Aだけ）',149,121,26,16);}
    // 犬小屋と犬
    if(w!=='C'){const dx=258,dy=124;poly(g,OL,[dx-9,dy-8,dx,dy-16,dx+9,dy-8]);poly(g,'#8a3a2a',[dx-8,dy-8,dx,dy-15,dx+8,dy-8]);R(g,OL,dx-8,dy-8,16,12);R(g,'#a87a50',dx-7,dy-7,14,11);R(g,'#1a1210',dx-3,dy-4,6,8);
      const bx=dx+14,by=dy+2;
      if(w==='A'){R(g,OL,bx-6,by-6,12,7);R(g,'#c8803a',bx-5,by-5,10,5);R(g,OL,bx+3,by-10,6,6);R(g,'#c8803a',bx+4,by-9,4,4);R(g,'#f0e0c8',bx+5,by-7,3,2);px(g,OL,bx+5,by-9);R(g,OL,bx-5,by+1,2,2);R(g,OL,bx+2,by+1,2,2);R(g,'#c8803a',bx-8,by-7,2,3);
        mark('dog','犬（茶色の柴犬「タロウ」）',bx-9,by-12,18,16);}
      else{R(g,OL,bx-7,by-8,15,9);R(g,'#f0f0f0',bx-6,by-7,13,7);R(g,'#1a1a1a',bx-3,by-6,3,2);R(g,'#1a1a1a',bx+2,by-4,2,2);R(g,OL,bx+4,by-13,7,7);R(g,'#f0f0f0',bx+5,by-12,5,5);R(g,'#1a1a1a',bx+5,by-12,2,4);R(g,OL,bx-6,by+1,2,3);R(g,OL,bx+3,by+1,2,3);
        mark('dog','犬（白黒のぶち：同じ名前「タロウ」）',bx-9,by-14,20,18);}}
    // 自販機（Bだけ：中身はこの世界にない飲み物）／Aは台の跡
    if(w==='B'){vending(g,96,104,{w:16,h:30,body:'#d8c8a8',cans:['#c8a040','#8a3a6a','#3a8a8a','#e8e0c8','#6a4a8a']});R(g,OL,98,98,12,5);R(g,'#c83a3a',99,99,10,3);tx(104,99,2.4,'ツキミ',{c:'#ffffff',al:'center',b:true});mark('vending','自動販売機（Bだけ：知らない銘柄「ツキミ」）',95,97,18,38);}
    else if(w==='A'){R(g,OL,94,134,20,6);R(g,'#7a7a82',95,135,18,4);for(const k of [0,1])for(const j of [0,1])px(g,'#3a3a40',97+k*14,136+j*2);mark('vending','自販機の跡（コンクリートの台とボルト穴だけ）',93,133,22,8);}
    // 電柱と電線
    pole(g,118,140,96,{trans:true,c:w==='B'?'#4a3a2a':'#5a5a6a'});pole(g,208,140,96,{c:w==='B'?'#4a3a2a':'#5a5a6a',plate:w==='B'?'#e8e0c0':'#2a6aa8'});
    tx(208,140-96*.45+1,2.2,w==='B'?'月':'',{c:'#2a2a2a',al:'center'});
    const wc=w==='C'?'#141818':'#0a0a14';
    if(w==='C'){wire(g,wc,0,52,118,46,8);wire(g,wc,118,46,170,120,6);wire(g,wc,208,46,320,52,8);}
    else{for(const dy of [0,3,6]){wire(g,wc,0,50+dy,118,46+dy,6);wire(g,wc,118,46+dy,208,46+dy,7);wire(g,wc,208,46+dy,320,50+dy,6);}
      if(w==='B'){for(const dy of [12,15]){wire(g,wc,0,58+dy,118,52+dy,4);wire(g,wc,118,52+dy,208,52+dy,5);wire(g,wc,208,52+dy,320,58+dy,4);}}}
    mark('pole','電柱（右：住所の札）',200,44,16,96);
    // 街灯（右の電柱）
    if(w!=='C'){lamp(g,208,70,{h:0,left:true,cw:70,ch:80,rgb:'255,184,90',ca:.25,gr:20});}
    // 道路
    vgrad(g,0,140,W,40,w==='C'?['#1a201e','#141816','#0e1210']:['#2a2a36','#22222c','#18181e']);R(g,w==='C'?'#3a403e':'#c8c8d0',0,142,W,1);
    for(let x=10;x<W;x+=30)R(g,w==='C'?'#3a403e':'#8a8a92',x,165,14,1);
    ell(g,OL,160,170,8,3);ell(g,w==='C'?'#2a2e2c':'#3a3a46',160,170,7,2);
    // 人（Bだけ）
    if(w==='B'){person(g,186,150,38,{f:'l',hair:'#2a2020',top:'#7a5a6a',bot:'#3a3040',skirt:true,bag:'#a87a50',rim:.18,rimc:[255,210,150]});mark('resident','買い物帰りの女性（Bだけ）',176,110,20,42);}
    if(w==='C'){vines(g,20,100,282,40,73);grass(g,0,180,W,200,['#1a2a26','#24342e'],74);debris(g,0,170,W,30,75);}
    return D;
  },
  fx(g,w,t,o,D){
    for(const [x,y] of D.win)glowE(g,x,y,12,8,'255,200,130',.05+.03*Math.sin(t*1.3+x));
    if(w==='C')motes(g,t,12,'159,240,224',[0,60,W,100],71);
    // 中央の家：Bでは明かりがときどき揺れる
    if(w==='B'){const f=Math.sin(t*.9)>.6?.1:0;if(f)R(g,`rgba(255,220,160,${f})`,130,72,16,12);}
  }
});

// ───────── 河川敷・崩れた橋 ─────────
scene('riverbank',{worlds:'ABC',name:'河川敷（崩れた橋）',
  bg(g,w){
    nightSky(g,w,92,{mx:220,my:24,seed:81});
    const D={};
    // 対岸の町
    hills(g,74,3,w==='C'?'#1a2a28':'#12162a',82,8);
    srand(83);for(let x=0;x<W;x+=6+rnd()*8){const h=4+rnd()*10;R(g,w==='C'?'#141e1c':'#0e1020',x,88-h,5+rnd()*6,h+4);if(w!=='C'&&rnd()<(w==='B'?.7:.45))px(g,P.a2,x+2,88-h+2+rnd()*3);}
    if(w==='B'){R(g,'#0e1020',40,56,5,34);R(g,'#0e1020',38,54,9,3);mark('chimney','対岸の煙突（Bだけ）',36,50,12,40);D.smoke=[42,52];}
    // 川
    vgrad(g,0,90,W,48,w==='C'?['#2a2420','#3a2e26','#2a221c']:['#0e1230','#141a40','#0c1028']);
    if(w==='C'){srand(85);for(let i=0;i<30;i++){const x=rnd()*W,y=92+rnd()*44;line(g,'#1a1612',x,y,x+6+rnd()*10,y+rnd()*3);}for(const [x,y] of [[90,120],[230,110]]){ell(g,'#2a6a6a',x,y,14,3);glowE(g,x,y,16,4,'79,200,188',.3);}}
    // 橋
    const by=64;
    if(w==='B'){// 鉄橋（トラス）＋列車
      R(g,OL,0,by+16,W,5);R(g,'#5a5a6a',0,by+17,W,3);
      for(let x=0;x<W;x+=24){line(g,'#4a4a5a',x,by+17,x+12,by);line(g,'#4a4a5a',x+12,by,x+24,by+17);}R(g,'#4a4a5a',0,by,W,2);
      for(const x of [40,140,240]){R(g,OL,x-5,by+21,10,70-by+20);R(g,'#3a3a44',x-4,by+21,8,70-by+20);}
      mark('bridge','鉄道の鉄橋（Bだけ：列車が渡る）',0,by-2,W,30);D.train=1;}
    else if(w==='A'){// コンクリート橋の中央が落ちている
      poly(g,OL,[0,by+8,124,by+12,128,by+20,0,by+18]);poly(g,'#5a5a66',[0,by+9,123,by+13,126,by+18,0,by+17]);
      poly(g,OL,[196,by+14,W,by+8,W,by+18,192,by+22]);poly(g,'#5a5a66',[197,by+15,W,by+9,W,by+17,194,by+20]);
      poly(g,'#4a4a56',[128,by+18,140,by+40,148,by+44,132,by+22]);
      for(let k=0;k<4;k++){line(g,'#8a6a4a',124+k*2,by+14,128+k*3,by+24+k*2);line(g,'#8a6a4a',196-k*2,by+16,192-k*3,by+26+k*2);}
      for(const x of [60,250]){R(g,OL,x-5,by+18,10,70-by+18);R(g,'#3a3a44',x-4,by+18,8,70-by+18);}
      R(g,OL,0,by+5,124,1);R(g,OL,196,by+5,W-196,1);for(let x=4;x<124;x+=8)R(g,OL,x,by+5,1,5);for(let x=200;x<W;x+=8)R(g,OL,x,by+5,1,5);
      mark('bridge','崩れた橋（中央が落ちている）',0,by+4,W,22);mark('gap','落ちた区間',124,by+8,72,40);}
    else{poly(g,'#2a2e2c',[0,by+10,90,by+14,90,by+20,0,by+18]);poly(g,'#2a2e2c',[230,by+16,W,by+10,W,by+18,230,by+22]);poly(g,'#22262a',[100,124,150,116,160,126,108,132]);mark('bridge','橋の残骸',0,by+8,W,30);}
    // 月の映り込み
    D.moonY=[220,104];
    // 手前の土手
    poly(g,w==='C'?'#1a2420':'#121a1e',[0,132,80,128,180,134,260,128,W,132,W,H,0,H]);
    vgrad(g,0,150,W,30,w==='C'?['#1a2420','#121a16']:['#141c20','#0e1416']);
    R(g,w==='C'?'#2a302c':'#3a3a3e',0,160,W,6);R(g,w==='C'?'#3a403c':'#4a4a50',0,160,W,1);
    // ボート（A）／釣り人（B）
    if(w==='A'){poly(g,OL,[70,128,104,128,100,134,74,134]);poly(g,'#5a4a3a',[72,129,102,129,99,133,75,133]);line(g,'#3a3a3a',104,130,118,140);mark('boat','岸につながれた古いボート（Aだけ）',68,126,38,10);}
    if(w==='B'){person(g,90,138,26,{f:'r',hair:'#3a3a3a',top:'#4a5a4a',bot:'#3a3a32',hat:'cap',hatc:'#4a4a3a',rim:.2,rimc:[255,210,150]});line(g,'#8a8a7a',96,118,130,104);line(g,'#6a6a6a',130,104,132,124);R(g,OL,74,132,6,6);R(g,P.a2,75,133,4,4);glow(g,77,135,12,'255,200,120',.4);mark('fisherman','夜釣りの男性とランタン（Bだけ）',70,108,64,32);}
    // 看板
    R(g,OL,236,118,2,26);R(g,OL,224,104,26,16);R(g,w==='C'?'#4a4e4c':w==='B'?'#e8e0c8':'#ffffff',225,105,24,14);
    if(w==='A'){R(g,'#c02020',225,105,24,4);tx(237,105.1,3.4,'あぶない',{c:'#ffffff',al:'center',b:true});tx(237,110,2.6,'川に入らない',{c:'#1a1a1a',al:'center'});tx(237,114,2.4,'月代町',{c:'#1a1a1a',al:'center'});}
    else if(w==='B'){tx(237,105.6,3.4,'月代川',{c:'#1a2a5a',al:'center',f:'m',b:true});tx(237,110.4,3,'遊泳禁止',{c:'#a02020',al:'center',f:'m',b:true});tx(237,114.6,2.2,'月代村',{c:'#1a1a1a',al:'center',f:'m'});}
    mark('sign',w==='A'?'看板「あぶない 川に入らない 月代町」':w==='B'?'看板「月代川 遊泳禁止 月代村」（村！）':'読めない看板',223,103,28,41);
    // 葦
    srand(87);for(let i=0;i<80;i++){const x=i<40?rnd()*60:260+rnd()*60,h=10+rnd()*22,yb=150+rnd()*20;line(g,w==='C'?'#2a3a30':'#1e2a2a',x,yb,x+(rnd()-.5)*4,yb-h);if(rnd()<.4)R(g,w==='C'?'#4a5a40':'#4a4a3a',x-1+(rnd()-.5)*4,yb-h-3,2,4);}
    return D;
  },
  fx(g,w,t,o,D){
    if(w!=='C'){const [mx,my]=D.moonY;for(let k=0;k<7;k++){const y=my+k*4,ww=10-k+Math.sin(t*2+k)*2;R(g,`rgba(220,220,255,${.35-k*.04})`,mx-ww/2+Math.sin(t*1.5+k)*2,y,ww,1);}
      for(let i=0;i<14;i++){const x=(hash(i,3)*W+t*6*(i%2?1:-1)+W)%W,y=96+hash(i,5)*38;R(g,'rgba(120,140,220,.25)',x,y,4+hash(i,7)*6,1);}}
    if(D.train){const x=((t*60)%(W+200))-150;for(let k=0;k<6;k++){const xx=x+k*22;R(g,OL,xx,51,20,13);R(g,'#c8c0a0',xx+1,52,18,11);R(g,'#ffe8b0',xx+3,54,5,4);R(g,'#ffe8b0',xx+11,54,5,4);}
      glowE(g,x+140,58,10,6,'255,240,200',.4);
      for(let k=0;k<6;k++){const xx=x+k*22+8;R(g,'rgba(255,220,150,.15)',xx,96+((k*7)%10),8,1);}}
    if(D.smoke){for(let k=0;k<5;k++){const a=((t*.3+k/5)%1);glow(g,D.smoke[0]+a*14,D.smoke[1]-a*24,2+a*5,'120,120,150',.1*(1-a));}}
    if(w==='C')motes(g,t,14,'159,240,224',[0,90,W,60],81);
    // 葦の揺れ
    for(let i=0;i<6;i++){const x=20+i*8+Math.sin(t*1.2+i)*1.5;px(g,'#4a4a3a',x,128);}
  }
});

// ───────── 旧研究施設 ─────────
scene('old_lab',{worlds:'ABC',name:'旧研究施設（月代第二研究所）',
  bg(g,w){
    const on=w==='B';
    room(g,on?{wall:['#4a5468','#3e485c','#323a4e'],floorY:132,floor:['#3a3e4a','#2e323c','#22262e'],tiles:true,base:'#1a1e26'}:w==='C'?{wall:['#141a1c','#101618','#0c1012'],floorY:132,floor:['#141a18','#0e1210','#0a0c0a'],base:'#08090a'}:{wall:['#1e2230','#1a1e2a','#141822'],floorY:132,floor:['#1e2028','#18191f','#121318'],tiles:true,base:'#0c0d12'});
    const D={};
    // 高窓（月光）
    for(const x of [30,250]){R(g,OL,x-1,10,42,22);vgrad(g,x,11,40,20,w==='C'?['#2a4a46','#1a3432']:['#1a1e40','#2a2e58']);for(let k=1;k<4;k++)R(g,OL,x+k*10,11,1,20);if(!on){poly(g,'rgba(160,170,230,.06)',[x,31,x+40,31,x+70,132,x+20,132]);}}
    if(w==='A'){poly(g,'#0a0a10',[252,11,262,11,256,24]);}
    // 室名の札
    hsign(g,112,6,96,10,on?'#e8eaf2':w==='C'?'#2a2e2e':'#7a7a80',on?'月代第二研究所　九条研究室':'月代第二研究所',{c:on?'#1a2a4a':w==='C'?'#4a4e4e':'#2a2a30',s:6,alt:on?'月代第二研究所　九条研究所':null});
    mark('plate',on?'札「月代第二研究所 九条研究室」':'札「月代第二研究所」（さびている）',112,6,96,10);
    // 中央の円筒装置
    const cx=160,ty=26,by=126;
    R(g,OL,cx-30,ty-2,60,8);R(g,on?'#8a90a0':'#4a4e58',cx-29,ty-1,58,6);R(g,OL,cx-30,by-8,60,10);R(g,on?'#8a90a0':'#4a4e58',cx-29,by-7,58,8);
    R(g,OL,cx-24,ty+6,48,by-ty-14);
    if(on){vgrad(g,cx-23,ty+6,46,by-ty-14,['#3ab8b0','#2a8a90','#1a5a6a']);for(let k=0;k<8;k++)R(g,'rgba(228,255,248,.25)',cx-18+k*5,ty+8,1,by-ty-18);glowE(g,cx,(ty+by)/2,46,52,'79,200,188',.4);}
    else if(w==='A'){R(g,'#0e1218',cx-23,ty+6,46,by-ty-14);poly(g,'rgba(160,200,220,.18)',[cx-23,ty+6,cx-6,ty+6,cx-16,by-8,cx-23,by-8]);poly(g,'#060810',[cx+2,ty+30,cx+23,ty+20,cx+23,ty+60,cx+8,ty+54]);
      for(let i=0;i<10;i++){srand(91+i);R(g,'rgba(180,210,230,.5)',cx-26+rnd()*52,by+2+rnd()*10,1+rnd()*2,1);}}
    else{R(g,'#060808',cx-23,ty+6,46,by-ty-14);poly(g,'#0e1416',[cx-23,ty+40,cx+23,ty+30,cx+23,by-8,cx-23,by-8]);crack(g,P.c3,cx-10,by,20,3);crack(g,P.c3,cx+6,by,16,5);glowE(g,cx,by+6,30,6,'79,200,188',.4);}
    for(const s of [-1,1]){R(g,OL,cx+s*30-2,ty,4,by-ty);R(g,on?'#6a7080':'#3a3e48',cx+s*30-1,ty,2,by-ty);}
    // 配管
    for(const [x,y,c] of [[cx-30,40,'#6a5a4a'],[cx+30,60,'#4a5a6a']]){const dir=x<cx?-1:1;R(g,OL,dir<0?0:x,y-1,dir<0?x:W-x,5);R(g,on?c:mix(c,'#000000',.5),dir<0?0:x,y,dir<0?x:W-x,3);}
    mark('chamber',on?'円筒の観測槽（シアンに光る液体）':w==='A'?'割れた円筒の観測槽':'砕けた観測槽',cx-30,ty-2,60,by-ty+10);
    // 黒板（右）
    const bx=214,bby=44;R(g,OL,bx-2,bby-2,64,44);R(g,'#5a4030',bx-1,bby-1,62,42);R(g,on?'#24382c':'#1e2a24',bx,bby,60,40);
    if(on){tx(bx+3,bby+3,4,'Δφ = ∫ψ(t)dt',{c:'#e8eee0',f:'mono'});tx(bx+3,bby+10,4,'観測周期 T=30',{c:'#e8eee0'});tx(bx+3,bby+17,3.6,'世界線の分岐 → 2^n',{c:'#e8eee0'});tx(bx+3,bby+24,3.6,'固定観測者 1',{c:'#ffe8a0'});ell(g,'#e8eee0',bx+48,bby+13,6,4);}
    else{tx(bx+3,bby+4,4,'Δφ = ∫ψ',{c:'rgba(220,230,220,.4)',f:'mono'});tx(bx+3,bby+12,4,'T=30',{c:'rgba(220,230,220,.45)'});tx(bx+30,bby+26,5,'？',{c:'rgba(220,230,220,.3)'});speck(g,'#2a3a30',bx,bby,60,40,60,93);}
    mark('blackboard',on?'黒板（観測周期 T=30・固定観測者 1）':'黒板（かすれた数式と T=30）',bx-2,bby-2,64,44);
    // 机（左）とPC・家族写真
    desk(g,38,112,86,20,{top:on?'#8a8e9c':'#4a4c54',drawer:18});
    monitor(g,46,88,28,22,{crt:true,scr:on?'#0e2a14':'#0a0e0c',body:on?'#c8c0a8':'#6a665a'});
    R(g,OL,94,98,12,14);R(g,on?'#c8a050':'#6a5a3a',95,99,10,12);R(g,on?'#8aa0c0':'#3a4048',96,100,8,8);ell(g,on?'#e0c4b0':'#7a6a60',98,104,1.5,1.5);ell(g,on?'#e0c4b0':'#7a6a60',101,103,1.5,1.5);ell(g,on?'#e0c4b0':'#7a6a60',100,106,1,1);
    mark('family_photo','写真立て（三人家族）',93,97,14,16);mark('old_pc','古い端末',44,86,32,26);
    R(g,OL,108,104,14,8);R(g,P.p1,109,105,12,6);
    if(!on){srand(95);for(let i=0;i<14;i++){const x=40+rnd()*240,y=134+rnd()*40;R(g,'#6a6a72',x,y,5,3);}}
    // 書類棚
    R(g,OL,262,92,46,40);R(g,on?'#6a7080':'#2a2e34',263,93,44,39);for(let r=0;r<3;r++){R(g,OL,263,104+r*12,44,1);for(let k=0;k<7;k++)R(g,['#3a5a8a','#8a3a3a','#5a7a4a','#c8b890'][(k+r)%4],265+k*6,95+r*12,4,9);}
    if(!on)poly(g,'#0c0e10',[263,118,307,112,307,132,263,132]);
    mark('shelf','書類棚（ファイル）',261,91,48,42);
    // 研究員（B）
    if(on){person(g,232,128,40,{f:'l',hair:'#1a1a1a',top:'#e8ecf0',top2:'#c8ccd8',bot:'#2a2a34',coat:true});person(g,86,132,38,{f:'b',hair:'#3a2a20',top:'#e8ecf0',top2:'#c8ccd8',bot:'#3a3a44',coat:true});
      mark('researchers','白衣の研究員2人（Bだけ）',72,88,176,46);
      for(const x of [70,160,250])tube(g,x-18,34,36,true);}
    if(w==='C'){vines(g,0,32,W,50,97);grass(g,0,180,W,160,['#1a2a26','#24342e'],98);}
    return D;
  },
  fx(g,w,t){
    if(w==='B'){for(let k=0;k<6;k++){const y=120-((t*16+k*15)%86);px(g,'rgba(228,255,248,.7)',150+((k*7)%20),y);}glowE(g,160,76,30,40,'79,200,188',.08+.04*Math.sin(t*2));}
    if(w==='C'){motes(g,t,18,'159,240,224',[100,60,120,80],91);glowE(g,160,132,24+Math.sin(t*3)*4,5,'159,240,224',.2);}
    if(w==='A'){motes(g,t,12,'200,200,230',[20,30,280,100],92);}
  }
});

// ───────── 誰もいない月代町 ─────────
scene('empty_town',{worlds:'ABC',name:'誰もいない月代町',
  bg(g,w){
    const vx=160,vy=92;
    if(w==='C')vgrad(g,0,0,W,vy+4,['#9ab8b0','#b8d0c4','#d8e4d4','#e8ecdc']);
    else if(w==='B')vgrad(g,0,0,W,vy+4,['#2a2a4a','#4a4466','#7a6a7a','#a8888a']);
    else vgrad(g,0,0,W,vy+4,['#1e2448','#3a4472','#6a6e96','#9a98b4']);
    const D={};
    if(w==='C'){ell(g,'rgba(255,255,255,.18)',160,40,70,70);ell(g,'#c8dcd0',160,40,66,66);ell(g,'#d8e4d8',160,40,58,58);
      // 遠くの白い塔
      R(g,'#f0f4f0',156,40,8,vy-38);R(g,'#c8d8d0',162,40,2,vy-38);poly(g,'#f0f4f0',[154,40,160,30,166,40]);glow(g,160,34,6,'159,240,224',.6);mark('far_tower','地平の白い塔（境界現象対策局）',150,28,20,66);}
    // 道路（一点透視）
    poly(g,w==='C'?'#9aa8a0':'#3a3a4a',[0,H,W,H,vx+6,vy,vx-6,vy]);
    for(let k=0;k<8;k++){const f=Math.pow(k/8,1.8),y=vy+(H-vy)*f,h=1+f*4;R(g,w==='C'?'#c8d0c8':'#d8d8e0',vx-.5-f*2,y,1+f*3,h);}
    // 横断歩道
    for(let k=0;k<9;k++){const x0=40+k*28;poly(g,w==='C'?'#c8d0c8':'#c8c8d4',[x0,164,x0+16,164,x0+18,172,x0+2,172]);}
    // 建物（左右）：歩道の線にそって手前→奥へ
    const bcol=w==='C'?['#b8c4bc','#a8b4ac','#c4ccc4']:w==='B'?['#5a4a44','#6a564a','#4a3e3a']:['#3a3e58','#4a4e68','#34384e'];
    const zs=[0,.3,.5,.64,.74,.82,.88];
    for(const s of [-1,1]){for(let k=0;k<6;k++){
      const z0=zs[k],z1=zs[k+1]-.012;
      const gx=z=>s<0?(-60+(vx-26+60)*z):(W+60-(W+60-(vx+26))*z),gyy=z=>H-10-(H-10-(vy+2))*z,sc=z=>1-z*.92;
      const xa=gx(z0),xb=gx(z1),ba=gyy(z0),bb=gyy(z1),hk=130+((k*37)%40);const ta=ba-hk*sc(z0),tb=bb-hk*sc(z1);
      poly(g,OL,[xa,ta-1,xb,tb-1,xb,bb+1,xa,ba+1]);poly(g,bcol[k%3],[xa,ta,xb,tb,xb,bb,xa,ba]);
      for(let r=1;r<5;r++){const f=r/5;line(g,mix(bcol[k%3],'#000000',.35),xa,ba-(ba-ta)*f,xb,bb-(bb-tb)*f);}
      for(let c=1;c<4;c++){const f=c/4;const x=xa+(xb-xa)*f;line(g,mix(bcol[k%3],'#000000',.25),x,(ta+(tb-ta)*f),x,(ba+(bb-ba)*f));}
      // 看板（手前の2軒）
      if(k===1||k===2){const f0=.12,f1=.88;const sx0=xa+(xb-xa)*f0,sx1=xa+(xb-xa)*f1;const sy0=ta+(tb-ta)*f0+(ba-ta)*.18,sy1=ta+(tb-ta)*f1+(bb-tb)*.18;const sh=(ba-ta)*.12;
        poly(g,OL,[sx0,sy0-1,sx1,sy1-1,sx1,sy1+sh*sc(z1)/sc(z0)+1,sx0,sy0+sh+1]);poly(g,w==='C'?'#eef0ea':w==='B'?'#d8c8a0':'#dde2ee',[sx0,sy0,sx1,sy1,sx1,sy1+sh*sc(z1)/sc(z0),sx0,sy0+sh]);
        const names=w==='A'?(s<0?['','月代信用金庫','ムーンマート']:['','月代本通り','さくら薬局']):w==='B'?(s<0?['','月代銀行','月代百貨店']:['','月代駅前通り','三ツ星堂']):['','',''];
        const cxs=(sx0+sx1)/2,cys=(sy0+sy1)/2;tx(cxs,cys+sh*.12,sh*.62,names[k],{c:w==='B'?'#3a1a10':'#1a2a4a',al:'center',b:true,f:w==='B'?'m':'g',max:Math.abs(sx1-sx0)-2});
        if(k===1)mark(s<0?'sign_left':'sign_right',w==='C'?'白紙の看板':'看板（'+names[1]+'）',Math.min(sx0,sx1),Math.min(sy0,sy1),Math.abs(sx1-sx0),sh+Math.abs(sy1-sy0));}
    }}
    // 歩道
    poly(g,w==='C'?'#c8d0c8':'#4a4a5a',[-60,H-10,vx-26,vy+2,vx-6,vy,0,H+40]);poly(g,w==='C'?'#c8d0c8':'#4a4a5a',[W+60,H-10,vx+26,vy+2,vx+6,vy,W,H+40]);
    // 信号機
    R(g,OL,226,46,3,98);R(g,'#5a5a6a',227,46,1,98);R(g,OL,210,44,30,10);R(g,w==='C'?'#c8d0c8':'#2a2a34',211,45,28,8);for(let k=0;k<3;k++){ell(g,'#1a1a1e',217+k*8,49,2.5,2.5);}
    D.sig=[233,49];mark('signal','信号機（黄色の点滅）',208,42,34,104);
    // バス停のベンチ
    R(g,OL,72,128,30,3);R(g,w==='C'?'#c8d0c8':'#7a5a3a',73,128,28,2);R(g,OL,74,131,2,8);R(g,OL,98,131,2,8);R(g,OL,66,92,2,48);R(g,OL,60,86,14,12);R(g,w==='C'?'#e8ece4':'#e8e8f0',61,87,12,10);
    tx(67,87.6,2.6,w==='C'?'':w==='B'?'月代駅前':'本通り',{c:'#1a2a5a',al:'center',b:true});
    mark('bus_stop','バス停（ベンチ）',58,84,46,56);
    // 時計の柱
    R(g,OL,118,70,2,70);ell(g,OL,119,66,7,7);ell(g,w==='C'?'#e8ece4':'#f4f4f4',119,66,6,6);if(w!=='C')clock(g,119,66,5,2,17);mark('street_clock',w==='C'?'針のない街の時計':'街の時計（2:17で止まっている）',111,58,16,82);
    // 電線
    const wc=w==='C'?'#7a8a82':'#14141e';wire(g,wc,0,40,vx-4,vy-20,10);wire(g,wc,W,40,vx+4,vy-20,10);if(w==='B'){wire(g,wc,0,46,W,46,6);wire(g,wc,0,49,W,49,6);mark('tram_wire','架線（Bだけ）',0,40,W,14);}
    // 落ちているもの
    if(w!=='C'){R(g,OL,180,150,8,5);R(g,'#e05a6a',181,151,6,3);mark('lost_item','道に落ちた赤い傘',178,148,12,8);}
    return D;
  },
  fx(g,w,t,o,D){
    const on=Math.sin(t*3)>0;if(on&&w!=='C'){ell(g,'#ffd040',D.sig[0],D.sig[1],2.5,2.5);glow(g,D.sig[0],D.sig[1],10,'255,208,64',.5);}
    if(w==='C'){motes(g,t,26,'255,255,255',[0,0,W,H],101);}
    else fog(g,t,80,30,w==='B'?'200,170,170':'170,170,210',.05,102);
  }
});

// ───────── 境界現象対策局（未来の施設） ─────────
scene('bureau',{worlds:'AC',name:'境界現象対策局・記録保管室',
  key(o){return o&&o.flags?((o.flags.b30?'b':'')+(o.flags.observers?'o':'')):'';},
  bg(g,w,o){
    const on=w==='A';const vx=160,vy=78;
    vgrad(g,0,0,W,H,on?['#c8d0d8','#b0bac4','#98a4b0']:['#1a2228','#141a20','#0e1216']);
    // 天井の曲面と光の筋
    poly(g,on?'#dce4ec':'#22282e',[0,0,W,0,vx+60,vy-50,vx-60,vy-50]);
    for(let k=0;k<5;k++){const f=k/5;R(g,on?'#f4fcff':'#2a3a40',vx-60-100*f,(vy-50)*(1-f),120+200*f,1);}
    if(on)for(let k=-2;k<=2;k++)line(g,'#7ff0e8',vx+k*20,vy-50,vx+k*90,0);
    // 床
    poly(g,on?'#a8b4c0':'#101418',[0,H,W,H,vx+60,vy+40,vx-60,vy+40]);
    for(let k=-4;k<=4;k++)line(g,on?'#98a4b0':'#0c1012',vx+k*15,vy+40,vx+k*80,H);
    if(on){line(g,'#7ff0e8',vx-30,vy+40,vx-110,H);line(g,'#7ff0e8',vx+30,vy+40,vx+110,H);}
    // 奥の壁
    R(g,on?'#e8eef4':'#1a2026',vx-60,vy-50,120,90);
    // 左右の保管棚
    for(const s of [-1,1])for(let k=0;k<5;k++){const z0=k/5,z1=(k+.85)/5;const xa=s<0?(vx-60)*z0:W-(W-(vx+60))*z0,xb=s<0?(vx-60)*z1:W-(W-(vx+60))*z1;
      const ta=(vy-50)*z0+6*(1-z0),tb=(vy-50)*z1+6*(1-z1),ba=H-(H-(vy+40))*z0-10*(1-z0),bb=H-(H-(vy+40))*z1-10*(1-z1);
      poly(g,OL,[xa,ta-1,xb,tb-1,xb,bb+1,xa,ba+1]);poly(g,on?'#f0f4f8':'#20282e',[xa,ta,xb,tb,xb,bb,xa,ba]);
      for(let r=1;r<6;r++){const f=r/6;line(g,on?'#b8c4d0':'#141a1e',xa,ta+(ba-ta)*f,xb,tb+(bb-tb)*f);
        for(let c=0;c<3;c++){const fx=(c+.5)/3;const x=xa+(xb-xa)*fx,y=ta+(ba-ta)*(f-.08)+((tb-ta)*fx);px(g,on?'#5ad8d0':(hash(k*7+r,c)>.8?'#e05a6a':'#1a3a3a'),x,y);}}
    }
    mark('archive','保管棚（記録シリンダー）',0,6,100,160);
    // 札
    hsign(g,vx-56,vy-46,112,9,on?'#ffffff':'#2a3034','境界現象対策局　第三記録保管室',{c:on?'#1a3a5a':'#5a6a70',s:5.4});
    mark('sign','札「境界現象対策局 第三記録保管室」',vx-56,vy-46,112,9);
    // 中央の端末とホログラム
    const tx0=vx-34,ty0=vy-34,tw=68,th=46;
    R(g,OL,tx0-1,ty0-1,tw+2,th+2);R(g,on?'#0e2a34':'#0a1418',tx0,ty0,tw,th);
    const D={screen:[tx0,ty0,tw,th]};
    const fl=o&&o.flags||{};
    if(fl.b30){tx(tx0+3,ty0+2,4.4,'境界観測記録 B-30',{c:'#9ff0e0',b:true});
      const rows=['対象：男性','職業：設備関連業務','深夜に定期的な映像配信','周辺で低確率の境界ノイズ','特記：精神・睡眠で強度変動','氏名：■■■■■'];
      rows.forEach((r,i)=>tx(tx0+3,ty0+9+i*5.6,3.4,r,{c:i===5?'#e05a6a':'#c8f0ea'}));}
    else{ell(g,'#2a6a6a',vx,ty0+20,12,12);ell(g,on?'#0e2a34':'#0a1418',vx,ty0+20,9,9);R(g,'#4fc8bc',vx-1,ty0+8,2,24);R(g,'#4fc8bc',vx-12,ty0+19,24,2);tx(vx,ty0+35,4,'ARCHIVE',{c:'#9ff0e0',al:'center',f:'mono',b:true});}
    R(g,OL,vx-40,vy+12,80,14);R(g,on?'#d8e0e8':'#22282e',vx-39,vy+13,78,12);for(let k=0;k<10;k++)R(g,on?'#5ad8d0':'#1a3a3a',vx-34+k*7,vy+17,4,2);
    mark('terminal',fl.b30?'中央の端末（境界観測記録 B-30）':'中央の端末（記録の検索）',tx0-1,ty0-1,tw+2,th+30);
    // 右：観測者一覧パネル
    const px0=244,py0=50;R(g,OL,px0-1,py0-1,40,56);R(g,on?'#0e2a34':'#0a1418',px0,py0,38,54);
    if(fl.observers){tx(px0+2,py0+2,3.4,'観測者一覧',{c:'#9ff0e0',b:true});['001','002','003','004','005','…'].forEach((n,i)=>tx(px0+3,py0+8+i*5.4,3.4,n+(i<5?'  所属：月代':''),{c:'#c8f0ea',f:'mono'}));tx(px0+3,py0+42,4,'444  所属：――',{c:'#e05a6a',f:'mono',b:true});}
    else{for(let k=0;k<6;k++)R(g,'#2a6a6a',px0+3,py0+6+k*7,10+((k*13)%22),2);}
    mark('observer_panel',fl.observers?'観測者一覧（最後に 444）':'右の表示板',px0-1,py0-1,40,56);
    if(!on){for(let i=0;i<5;i++)crack(g,'#2a3a40',40+i*60,vy+60,20,i+101);}
    return D;
  },
  fx(g,w,t,o,D){
    const [x,y,ww,hh]=D.screen;R(g,`rgba(159,240,224,${.05+.03*Math.sin(t*3)})`,x,y,ww,hh);R(g,'rgba(159,240,224,.12)',x,y+((t*12)%hh),ww,1);
    if(w==='A')glowE(g,160,56,60,30,'159,240,224',.06);
    else{if(Math.sin(t*7)>.6)glowE(g,160,56,40,24,'159,240,224',.1);motes(g,t,10,'159,240,224',[60,40,200,100],111);}
  }
});

// ════════════════════════════════════════════════════════════════
//  特別な場面
// ════════════════════════════════════════════════════════════════

// ───────── 深夜配信の男性（後ろ姿のみ） ─────────
// 紫の長い髪をポニーテール、小さなピンクのシルクハット、ピンクの花の髪飾り、黒い四角いめがね（後ろからはツルだけ）、ラベンダーの上着。
// 顔は描かない：振り返っても逆光で暗く、めがねが光るだけ。
// o: {turn 0..1, pose:'normal'|'upright'|'lean', outfit:'jacket'|'work', hat:true, s:倍率}
function manBack(g,cx,by,o){
  o=o||{};const s=o.s||1,turn=Math.max(0,Math.min(1,+o.turn||0)),work=o.outfit==='work',legs=!!o.legs;
  const cw=Math.ceil(96*s),ch=Math.ceil((legs?150:112)*s),c=mk(cw,ch),q=c.getContext('2d');
  const oy=legs?ch-48*s:ch-6*s;
  const X=v=>cw/2+v*s,Y=v=>oy+v*s;
  const pp=(col,pts)=>poly(q,col,pts.map((v,i)=>i%2?Y(v):X(v)));
  const up=o.pose==='upright'?-4:o.pose==='lean'?3:0,fw=o.pose==='upright'?2:0;
  const hx=turn*2,hy=-80+up;
  const J=work?['#5a6a8a','#3e4c6c','#2c3854','#222c44']:['#b8a6e0','#9a84c8','#7c66ac','#5e4a8c'];
  const H0=['#c8a8f0','#9a72dc','#7a50c0','#5a3590'];
  // 脚（立ち姿）
  if(legs){pp(J[2],[-16,0,-2,0,-3,40,-15,40]);pp(J[2],[2,0,16,0,15,40,3,40]);pp(J[3],[-6,2,-2,2,-3,40,-7,40]);R(q,'#1a1a22',X(-17),Y(38),15*s,5*s);R(q,'#1a1a22',X(2),Y(38),15*s,5*s);}
  // 胴（なで肩）
  pp(J[1],[-6,hy+16,-15,hy+18,-21-fw,hy+22,-24-fw,hy+28,-25-fw,hy+40,-23,0,23,0,25+fw,hy+40,24+fw,hy+28,21+fw,hy+22,15,hy+18,6,hy+16]);
  pp(J[0],[-6,hy+17,-14,hy+19,-20-fw,hy+23,-22-fw,hy+29,-23-fw,hy+40,-21,-2,-10,-2,-8,hy+40]);
  pp(J[2],[10,hy+30,23+fw,hy+40,22,-2,14,-2]);
  line(q,J[3],X(0),Y(hy+22),X(0),Y(-2));
  line(q,J[2],X(-14),Y(hy+34),X(-6),Y(hy+46));line(q,J[2],X(12),Y(hy+36),X(6),Y(hy+50));line(q,J[2],X(-18),Y(-20),X(-8),Y(-14));
  if(work){R(q,'#c8c8b8',X(-26),Y(-24),52*s,3*s);R(q,'#e8e8d8',X(-26),Y(-24),52*s,1*s);}
  else{R(q,J[3],X(-26),Y(-6),52*s,4*s);}
  // 腕
  pp(J[2],[-24-fw,hy+26,-28-fw,hy+42,-27,-14,-22,-12,-22,hy+40]);pp(J[2],[24+fw,hy+26,28+fw,hy+42,27,-14,22,-12,22,hy+40]);
  if(o.wrench){pp(J[1],[22,hy+26,40,hy+14,43,hy+19,27,hy+34]);ell(q,'#c8a898',X(42),Y(hy+15),3*s,3*s);R(q,'#a8b0bc',X(42),Y(hy+4),3*s,14*s);R(q,'#a8b0bc',X(39),Y(hy+2),9*s,3*s);}
  // 首・えり
  R(q,'#b89888',X(hx-4),Y(hy+9),8*s,9*s);
  if(!work)pp(P.k1,[hx-7,hy+16,hx+7,hy+16,hx+4,hy+20,hx-4,hy+20]);else pp(J[3],[hx-8,hy+15,hx+8,hy+15,hx+6,hy+19,hx-6,hy+19]);
  // 耳
  ell(q,'#c8a090',X(hx-10),Y(hy+1),1.5*s,2.5*s);ell(q,'#c8a090',X(hx+10),Y(hy+1),1.5*s,2.5*s);
  const tx0=hx+turn*6,ty0=hy+7-turn*2;
  const drawTail=()=>{
  // ポニーテール（ピンクの結び目から背中へ）
  
  const T=[[0,0,4.5],[1.5,7,5.2],[3.5,14,5],[5,22,4.4],[6.5,30,3.6],[7,37,2.4],[8,42,1]];
  for(let i=0;i<T.length-1;i++){const [ax,ay,aw]=T[i],[bx,by2,bw]=T[i+1];pp(H0[2],[tx0+ax-aw,ty0+ay,tx0+ax+aw,ty0+ay,tx0+bx+bw,ty0+by2,tx0+bx-bw,ty0+by2]);}
  for(let i=0;i<T.length-1;i++){const [ax,ay]=T[i],[bx,by2]=T[i+1];line(q,H0[1],X(tx0+ax-1.5),Y(ty0+ay),X(tx0+bx-1.2),Y(ty0+by2));line(q,H0[3],X(tx0+ax+2),Y(ty0+ay+1),X(tx0+bx+1.6),Y(ty0+by2));}
  R(q,P.k3,X(tx0-3),Y(ty0-2),6*s,3*s);R(q,P.k2,X(tx0-3),Y(ty0-2),6*s,1*s);
  };
  if(turn>.4)drawTail();
  // 頭（後ろ：髪）
  ell(q,H0[2],X(hx),Y(hy),10*s,11*s);
  if(turn>0){const fwd=10*turn;ell(q,'#4a3644',X(hx-10+fwd*.8),Y(hy+1),fwd*s,9.5*s);ell(q,H0[2],X(hx+turn*4),Y(hy-1),(10-turn*4.5)*s,11*s);}
  ell(q,H0[1],X(hx-2+turn*3),Y(hy-5),6*s,4*s);ell(q,H0[0],X(hx-3+turn*3),Y(hy-6),3*s,1.5*s);
  for(let k=-7;k<=7;k+=2.5)line(q,H0[3],X(hx+k*.4+turn*3),Y(hy-8),X(hx+k*.9+turn*2),Y(hy+9));
  if(turn<=.4)drawTail();
  // めがねのツル
  line(q,'#0e0a14',X(hx-11),Y(hy-1),X(hx-8),Y(hy-2));line(q,'#0e0a14',X(hx+11),Y(hy-1),X(hx+8),Y(hy-2));
  // 花の髪飾り
  if(!o.noFlower){const fx=hx-8+turn*2,fy=hy-6;for(let i=0;i<5;i++){const a=i/5*TAU-.3;ell(q,P.k2,X(fx+Math.cos(a)*2.2),Y(fy+Math.sin(a)*2.2),1.5*s,1.5*s);}ell(q,'#ffe080',X(fx),Y(fy),1*s,1*s);}
  // 帽子
  if(o.hat!==false){
    if(work){ell(q,J[1],X(hx),Y(hy-5),10.5*s,7*s);ell(q,J[0],X(hx-2),Y(hy-8),6*s,3*s);R(q,J[2],X(hx-10.5),Y(hy-1),21*s,2*s);ell(q,H0[2],X(tx0),Y(ty0-3),3*s,3*s);}
    else{const hx2=hx+4-turn*2,hy2=hy-10;ell(q,P.k3,X(hx2),Y(hy2),8*s,2.2*s);R(q,P.k2,X(hx2-4.5),Y(hy2-10),9*s,10*s);R(q,P.k4,X(hx2-4.5),Y(hy2-3.5),9*s,2.4*s);R(q,P.k1,X(hx2-4.5),Y(hy2-10),2*s,6*s);R(q,P.k3,X(hx2+2.5),Y(hy2-10),2*s,7*s);}
  }
  // 逆光：内側を暗く、ふち1〜2ドットを明るく
  const d=q.getImageData(0,0,cw,ch),p=d.data;const a=new Uint8Array(cw*ch);for(let i=0;i<cw*ch;i++)a[i]=p[i*4+3]>60?1:0;
  const rim=o.rim||[214,206,255],dark=o.dark==null?.5:o.dark;
  const op=(x,y)=>x>=0&&y>=0&&x<cw&&y<ch&&a[y*cw+x];
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){const i=y*cw+x,k=i*4;if(!a[i])continue;
    const e1=!op(x-1,y)||!op(x+1,y)||!op(x,y-1)||!op(x,y+1);const e2=!e1&&(!op(x-2,y)||!op(x+2,y)||!op(x,y-2));
    p[k]*=dark;p[k+1]*=dark;p[k+2]*=dark;
    const f=e1?.7:e2?.28:0;if(f){p[k]+=(rim[0]-p[k])*f;p[k+1]+=(rim[1]-p[k+1])*f;p[k+2]+=(rim[2]-p[k+2])*f;}}
  q.putImageData(d,0,0);post(q,cw,ch,{shade:false});
  // めがねの反射（振り向いたとき）
  let gx=0,gy=0;
  if(turn>.35){gx=X(hx-10+turn*6);gy=Y(hy+0);const ga=Math.min(1,(turn-.35)*2.2);
    q.fillStyle=`rgba(8,6,14,${ga})`;q.fillRect(gx-4*s,gy-1.5*s,5*s,3.5*s);if(turn>.7)q.fillRect(gx+2*s,gy-1.5*s,4.5*s,3.5*s);
    q.fillStyle=`rgba(240,248,255,${ga})`;q.fillRect(gx-3*s,gy-.5*s,2*s,1*s);if(turn>.7)q.fillRect(gx+3*s,gy-.5*s,2.5*s,1*s);}
  const ox=Math.round(cx-cw/2),oy2=Math.round(by-oy);g.drawImage(c,ox,oy2);
  return {gx:ox+gx,gy:oy2+gy};
}

// ───────── 境界の向こうの配信部屋 ─────────
scene('stream_room',{worlds:'A',name:'境界の向こうの配信部屋',vig:.6,
  key(o){return (o.variant||'')+'|'+(Math.round((+o.turn||0)*8)/8);},
  bg(g,w,o){
    const v=o.variant||'normal',turn=+o.turn||0;
    const tidy=v==='success';
    // 壁と床
    vgrad(g,0,0,W,128,tidy?['#1e1a2c','#262036','#2a2238']:['#0e0c1a','#151226','#1a1630']);
    vgrad(g,0,128,W,52,['#120e1a','#0c0a12']);
    const D={v};
    // 窓とカーテン（右）
    R(g,OL,272,22,40,70);R(g,'#2a2240',273,23,38,68);for(let k=0;k<6;k++)R(g,'#221a36',275+k*6,23,3,68);R(g,'rgba(255,184,90,.25)',291,23,2,68);glowE(g,292,60,8,34,'255,184,90',.08);
    // 棚（左）
    R(g,OL,14,36,56,78);R(g,'#2a2030',15,37,54,76);for(let r=0;r<3;r++){R(g,OL,15,56+r*19,54,2);srand(r+21);for(let x=17;x<66;x+=3){const hh=8+rnd()*8|0;R(g,['#5a3a6a','#3a4a6a','#6a4a3a','#4a5a4a','#7a5a7a'][(rnd()*5)|0],x,56+r*19-hh,2,hh);}}
    R(g,'#d8708e',50,42,6,8);ell(g,'#c6b2ee',53,40,3,3);// ぬいぐるみ
    mark('shelf','棚（本・小物）',14,36,56,78);
    // 子供のクレヨン画
    const dx=78,dy=20;R(g,OL,dx-1,dy-1,30,22);R(g,'#f4efe6',dx,dy,28,20);R(g,'#e8e0d0',dx,dy+18,28,2);
    ell(g,'#ffb84a',dx+5,dy+4,2.5,2.5);for(let i=0;i<6;i++){const a=i/6*TAU;px(g,'#ffb84a',dx+5+Math.cos(a)*4,dy+4+Math.sin(a)*4);}
    poly(g,'#e8708a',[dx+14,dy+10,dx+19,dy+5,dx+24,dy+10]);R(g,'#e8708a',dx+15,dy+10,8,6);R(g,'#5a7ad0',dx+18,dy+12,2,4);
    // 大きい人（紫の髪・ピンクの帽子）と小さい人
    R(g,'#8c5fcc',dx+5,dy+9,3,3);R(g,'#f59aae',dx+5,dy+7,3,2);line(g,'#5a5a6a',dx+6,dy+12,dx+6,dy+16);line(g,'#5a5a6a',dx+4,dy+13,dx+8,dy+13);
    R(g,'#3a2a3a',dx+10,dy+12,2,2);line(g,'#5a5a6a',dx+11,dy+14,dx+11,dy+17);line(g,'#ff8ab0',dx+8,dy+14,dx+10,dy+13);
    R(g,'#5ab07a',dx,dy+17,28,1);px(g,'#e05a6a',dx+26,dy+2);px(g,'#e05a6a',dx+25,dy+3);
    R(g,'#c8c0b0',dx+12,dy-2,4,3);
    mark('drawing','壁に貼られた子供のクレヨン画（紫の髪の大人と小さな子）',dx-1,dy-3,30,25);
    // 資格証（study）
    if(v==='study'){for(let i=0;i<8;i++){const fx=214+(i%4)*14,fy=14+(i>>2)*15;R(g,OL,fx-1,fy-1,13,12);R(g,'#c8a050',fx,fy,11,10);R(g,'#f4efe6',fx+1,fy+1,9,8);R(g,'#c83030',fx+6,fy+6,2,2);for(let k=0;k<3;k++)R(g,'#8a8a9a',fx+2,fy+2+k*1.6,5,.6);}
      mark('certificates','壁一面の資格証（8枚）',212,12,58,30);}
    // 机
    poly(g,OL,[40,118,280,118,300,150,20,150]);poly(g,tidy?'#5a4030':'#3a2a2a',[42,119,278,119,297,149,23,149]);R(g,tidy?'#7a5a40':'#4a3632',42,119,236,2);
    R(g,OL,24,150,272,6);R(g,tidy?'#3a2a20':'#241a1a',25,150,270,5);
    // モニター
    const mx=110,my=44,mw=100,mh=62;
    R(g,OL,mx-2,my-2,mw+4,mh+4);R(g,'#16141e',mx-1,my-1,mw+2,mh+2);
    R(g,OL,mx+mw/2-3,my+mh+2,6,10);R(g,OL,mx+mw/2-12,my+mh+11,24,3);
    R(g,OL,214,60,46,36);R(g,'#16141e',215,61,44,34);R(g,OL,234,96,6,22);
    D.mon=[mx,my,mw,mh];D.side=[216,62,42,32];
    // マイク（アーム）
    const mic=v==='stream'?[146,80]:[124,86];
    line(g,OL,78,118,96,90);line(g,'#3a3a44',79,118,97,90);line(g,OL,96,90,mic[0]-4,mic[1]+2);line(g,'#3a3a44',96,91,mic[0]-4,mic[1]+3);
    R(g,OL,mic[0]-4,mic[1]-6,8,14);R(g,'#2a2a34',mic[0]-3,mic[1]-5,6,12);for(let k=0;k<4;k++)R(g,'#4a4a56',mic[0]-3,mic[1]-4+k*3,6,1);
    ell(g,'rgba(40,40,60,.5)',mic[0]+7,mic[1],5,6);
    mark('mic','マイク（アームつき）',mic[0]-10,mic[1]-8,22,18);
    // キーボード・小物
    R(g,OL,128,124,64,8);R(g,'#1e1c26',129,125,62,6);D.kb=[129,125,62,6];
    R(g,OL,200,126,10,7);R(g,'#2a2a34',201,127,8,5);
    if(v==='study'){for(let k=0;k<5;k++){R(g,OL,52,124-k*5,30,5);R(g,['#3a5a8a','#8a3a3a','#5a7a4a','#c8b890','#6a4a7a'][k],53,125-k*5,28,3);}for(let k=0;k<4;k++){R(g,OL,232,126-k*5,26,5);R(g,['#c8b890','#3a5a8a','#8a3a3a','#5a7a4a'][k],233,127-k*5,24,3);}
      tx(67,105.6,2.6,'電気',{c:'#f4efe6',al:'center',b:true});mark('books','積まれた参考書',50,98,210,32);
      R(g,OL,268,98,3,22);R(g,OL,262,96,14,4);R(g,P.a2,263,97,12,2);glow(g,269,104,30,'255,200,130',.3);}
    else if(tidy){plant(g,64,122,{seed:5});R(g,OL,240,110,16,14);R(g,'#c8a050',241,111,14,12);R(g,'#8aa0c0',242,112,12,10);ell(g,'#e0c4b0',246,116,2,2);ell(g,'#e0c4b0',250,117,1.5,1.5);
      R(g,OL,268,92,3,28);R(g,OL,260,88,18,6);R(g,P.a3,261,89,16,4);glow(g,269,96,40,'255,200,130',.4);mark('photo','写真立て（大人と子供）',239,109,18,16);}
    else if(v!=='collapse'){R(g,OL,226,116,8,10);R(g,'#e8e4dc',227,117,6,8);R(g,OL,240,114,6,12);R(g,'#5ab07a',241,115,4,10);R(g,OL,248,116,6,10);R(g,'#e05a6a',249,117,4,8);srand(9);for(let i=0;i<5;i++)R(g,'#d8d2c8',60+rnd()*40,124+rnd()*8,6,3);
      mark('desk_items','机の上（マグ・缶・紙くず）',58,112,198,24);}
    // リングライト（stream）
    if(v==='stream'){ell(g,OL,254,48,19,19);ell(g,'#fff8f0',254,48,17,17);ell(g,'#1a1626',254,48,13,13);glow(g,254,48,50,'255,240,230',.5);R(g,OL,253,67,2,52);mark('ring_light','リングライト',234,28,40,92);}
    // 人物
    if(v==='collapse'){// 椅子だけが後ろへ押されている
      poly(g,OL,[150,120,186,116,192,160,146,166]);poly(g,'#22202c',[152,121,184,117,189,158,149,163]);R(g,OL,160,166,4,10);R(g,OL,146,174,34,3);
      mark('empty_chair','誰もいない椅子（後ろへ押されている）',144,114,50,64);
    }else{
      const pose=v==='success'?'upright':v==='stream'?'lean':'normal';
      D.head=manBack(g,160,150,{turn,pose,s:1,dark:v==='success'?.56:.46});
      // 椅子の背（こちら側にあるので男性の腰を隠す）
      R(g,OL,132,124,56,36);R(g,'#1e1c28',133,125,54,34);R(g,'#2a2836',133,125,54,2);R(g,'#16141e',157,127,6,30);
      R(g,OL,158,160,4,14);R(g,OL,142,172,36,3);
      mark('streamer','モニターの前の男性（後ろ姿：紫の髪・小さな帽子）',122,50,76,110);
    }
    mark('monitor','メインモニター（配信画面）',mx-2,my-2,mw+4,mh+4);
    return D;
  },
  fx(g,w,t,o,D){
    const v=D.v,[mx,my,mw,mh]=D.mon;
    // モニターの中身（人物の後ろに見える部分）→ 人物の上に重ならないよう、明るさだけ足す
    const scr=v==='collapse'?'#0a0a12':'#1a1840';
    // 画面（人物の背後なので、人物の外側だけ塗る：静止レイヤーの暗い画面ピクセルを置き換える）
    const img=g.getImageData(mx,my,mw,mh),p=img.data;
    for(let j=0;j<mh;j++)for(let i=0;i<mw;i++){const k=(j*mw+i)*4;if(p[k]===0x16&&p[k+1]===0x14&&p[k+2]===0x1e){let r=26,gg=24,b=64;
        if(v!=='collapse'){if(i<mw*.66){// カメラ枠
            const cx=i-mw*.33,cy=j-mh*.45;const vg=1-Math.min(1,(cx*cx+cy*cy)/900);r=30+vg*40;gg=26+vg*30;b=70+vg*70;}
          else{r=20;gg=18;b=40;if(j%6<1&&i>mw*.7&&i<mw*.7+((j*13)%22)+6){r=200;gg=196;b=230;}}
          if(j<6){r=40;gg=34;b=90;}
          if(j<5&&i>3&&i<14&&Math.sin(t*4)>-.3){r=232;gg=58;b=106;}}
        else{r=12;gg=12;b=18;if(Math.abs(j-mh/2)<1&&i>mw*.4&&i<mw*.6){r=60;gg=60;b=70;}}
        const n=hash(i+j*mw,(t*12)|0)*10;p[k]=r+n;p[k+1]=gg+n;p[k+2]=b+n;}}
    g.putImageData(img,mx,my);
    // 横のモニター
    const [sx,sy,sw,sh]=D.side;for(let j=0;j<sh;j+=3)R(g,v==='collapse'?'#101018':'#2a2a50',sx,sy+j,sw,2);if(v!=='collapse')for(let j=0;j<6;j++)R(g,'rgba(200,200,240,.6)',sx+2,sy+3+j*5,6+((j*17+(t*2|0))%30),1);
    // 部屋への光
    if(v!=='collapse'){glowE(g,160,80,120,70,'120,110,230',.16+.03*Math.sin(t*2.2));glowE(g,160,140,90,14,'120,110,230',.12);
      const [kx,ky,kw,kh]=D.kb;for(let i=0;i<kw;i+=4)R(g,`rgba(${150+((i*7)%100)},120,255,.4)`,kx+i,ky+1,3,1);}
    else glowE(g,160,80,60,40,'60,60,90',.08);
    // ノイズ越し
    const nz=o.noise==null?.12:+o.noise;for(let i=0;i<W*H*.01*nz*10;i++){px(g,hash(i,(t*24)|0)>.5?'rgba(220,220,255,.12)':'rgba(0,0,0,.25)',hash(i+3,(t*24)|0)*W,hash(i+7,(t*24)|0)*H);}
    if(nz>0)R(g,'rgba(255,255,255,.03)',0,(t*40)%H,W,2);
    // 配信の大きな視聴者数（stream）
    if(v==='stream'){tx(160,5,12,'視聴者 '+(12840+((t*3)|0)).toLocaleString('ja-JP')+'人',{c:'#ffffff',al:'center',b:true,gl:'rgba(232,58,106,.9)'});tx(160,19,5,'♥ 98,402　コメント 3,210/分',{c:'#ffd0e0',al:'center'});}
    // めがねの光
    if(D.head&&(+o.turn||0)>.35){glow(g,D.head.gx,D.head.gy,6+Math.sin(t*6)*1.5,'240,248,255',.5);}
  },
  post(ctx,L,w,t,o){
    // 走査線（ノイズ越しの映像らしさ）
    const nz=o.noise==null?.12:+o.noise;if(nz<=0)return;ctx.save();ctx.globalAlpha=Math.min(.3,nz*1.2);ctx.fillStyle='#000';const step=Math.max(2,L.s*1.5);for(let y=L.oy;y<L.oy+H*L.s;y+=step)ctx.fillRect(L.ox,y,W*L.s,Math.max(1,step*.35));ctx.restore();
  }
});

// ───────── 工場の幻 ─────────
scene('factory_glimpse',{worlds:'A',name:'工場（一瞬の幻）',vig:.7,
  bg(g){
    vgrad(g,0,0,W,130,['#1a2226','#222c30','#2a3438']);vgrad(g,0,130,W,50,['#2a2a2a','#1e1e1e','#141414']);
    R(g,'#c8a030',0,140,W,2);for(let x=0;x<W;x+=12)poly(g,'#1a1a1a',[x,140,x+5,140,x+8,142,x+3,142]);
    // 壁の配管
    const pc=[['#6a7a7a',10],['#8a5a3a',22],['#5a6a5a',100]];
    pc.forEach(([c,y])=>{R(g,OL,0,y-1,W,7);R(g,c,0,y,W,5);R(g,mix(c,'#ffffff',.25),0,y,W,1);for(let x=20;x<W;x+=70){R(g,OL,x,y-3,5,11);R(g,mix(c,'#ffffff',.1),x+1,y-2,3,9);}});
    for(const x of [104,290]){R(g,OL,x-1,0,8,140);R(g,'#5a6a6a',x,0,6,140);R(g,'#7a8a8a',x,0,1,140);}
    // バルブ（赤いハンドル）
    for(const [x,y] of [[60,22],[230,100],[107,60]]){ell(g,OL,x,y-6,6,6);ell(g,'#c83a2a',x,y-6,5,5);ell(g,OL,x,y-6,2,2);line(g,'#c83a2a',x-5,y-6,x+5,y-6);R(g,OL,x-1,y-2,2,4);}
    mark('valve','赤いバルブ',52,10,18,16);
    // 圧力計
    for(const [x,y] of [[140,48],[162,48]]){ell(g,OL,x,y,7,7);ell(g,'#e8e4dc',x,y,6,6);line(g,'#c83030',x,y,x+3,y-3);R(g,OL,x-1,y+7,2,6);}
    mark('gauge','圧力計（2つ）',132,40,38,20);
    // 工具板
    R(g,OL,26,42,68,50);R(g,'#5a4a38',27,43,66,48);for(let y=46;y<90;y+=4)for(let x=30;x<92;x+=4)px(g,'#3a3024',x,y);
    // 工具の影絵
    R(g,'#9aa0a8',32,48,3,22);ell(g,'#9aa0a8',33,47,3,3);R(g,'#9aa0a8',42,50,3,18);R(g,'#c83a2a',41,62,5,8);R(g,'#9aa0a8',52,48,10,3);R(g,'#7a5030',56,51,2,16);
    R(g,'#9aa0a8',68,48,2,20);R(g,'#9aa0a8',66,48,6,3);R(g,'#e8c030',76,52,10,12);R(g,'#2a2a2a',78,64,6,4);for(let k=0;k<5;k++)R(g,'#9aa0a8',32+k*12,76,8,2);
    tx(60,86,3.4,'工具は元の位置へ',{c:'#e8e0c8',al:'center',b:true});
    mark('tool_board','工具板（レンチ・ハンマー）',25,41,70,52);
    // 機械（ポンプとモーター）
    R(g,OL,168,74,104,66);vgrad(g,169,75,102,64,['#4a7a8a','#3a6474','#2a4c5a']);R(g,'#5a8a9a',169,75,102,2);
    for(let k=0;k<8;k++)R(g,'#2a4c5a',176+k*11,80,2,30);
    ell(g,OL,190,128,16,10);ell(g,'#5a6a6a',190,128,15,9);R(g,OL,240,60,26,20);R(g,'#5a6a6a',241,61,24,18);R(g,'#e8c030',244,64,10,4);tx(249,64,2.6,'危険',{c:'#1a1a1a',al:'center',b:true});
    R(g,OL,266,96,54,8);R(g,'#6a7a7a',266,97,54,6);
    mark('machine','大きなポンプとモーター（点検中）',166,58,108,84);
    // 作業灯
    R(g,OL,134,96,2,44);R(g,OL,128,90,14,8);R(g,P.a2,129,91,12,6);cone(g,140,94,6,90,48,'255,200,120',.28);glow(g,135,94,26,'255,200,120',.4);
    mark('work_lamp','作業灯',126,88,18,52);
    // 作業している男性（後ろ姿・作業服・紫のポニーテール）
    manBack(g,206,176,{outfit:'work',s:.82,legs:true,rim:[255,214,150],dark:.62});R(g,OL,238,156,22,12);R(g,'#c83a2a',239,157,20,10);R(g,'#e85a4a',239,157,20,2);R(g,OL,244,153,10,4);mark('toolbox','赤い工具箱',237,152,24,17);
    mark('worker','機械を直している作業服の男性（後ろ姿・紫のポニーテール）',176,58,72,96);
    return {};
  },
  fx(g,w,t){
    // 火花・湯気
    const sp=Math.sin(t*5)>.3;if(sp)for(let i=0;i<8;i++){const a=hash(i,(t*12)|0)*Math.PI,l=2+hash(i+3,(t*12)|0)*8;line(g,i%2?'#ffe080':'#ffffff',244,74,244+Math.cos(a)*l,74-Math.sin(a)*l);}
    if(sp)glow(g,244,74,10,'255,220,140',.4);
    for(let k=0;k<6;k++){const a=((t*.5+k/6)%1);glow(g,300+Math.sin(t+k)*4,100-a*60,3+a*8,'200,210,220',.12*(1-a));}
    // 幻：ふちから崩れる
    for(let i=0;i<260;i++){const e=hash(i,(t*10)|0);const side=i%4;let x,y;const d=e*e*26;
      if(side===0){x=hash(i+1,9)*W;y=d;}else if(side===1){x=hash(i+1,9)*W;y=H-d;}else if(side===2){x=d;y=hash(i+1,9)*H;}else{x=W-d;y=hash(i+1,9)*H;}
      px(g,hash(i,(t*20)|0)>.5?'rgba(159,240,224,.55)':'rgba(4,8,10,.8)',x,y);}
    // ずれ
    if(Math.sin(t*1.7)>.85){TMP.getContext('2d').clearRect(0,0,W,H);TMP.getContext('2d').drawImage(g.canvas,0,0);g.save();g.globalAlpha=.25;g.globalCompositeOperation='lighter';g.drawImage(TMP,3,0);g.restore();}
  }
});

// ───────── 最終章：混ざり合う世界 ─────────
// 割れた破片ごとに別の場所（月代駅・未来の研究所・別世界の学校・海・空中都市・工場・配信部屋）が映り、t で入れ替わる。
let EXTRA_SRC=null;
function extraSrc(){
  if(EXTRA_SRC)return EXTRA_SRC;
  // 海
  const sea=mk(W,H),a=sea.getContext('2d');vgrad(a,0,0,W,96,['#0c1a3a','#1a3a6a','#4a7aa8','#a8c8e0']);vgrad(a,0,96,W,84,['#2a5a8a','#1a3a6a','#0c1e3a']);
  for(let i=0;i<60;i++){srand(i+5);const y=100+rnd()*78,x=rnd()*W;R(a,'rgba(220,240,255,.4)',x,y,4+rnd()*12,1);}ell(a,'#fff8e0',200,70,12,12);glow(a,200,70,40,'255,240,200',.3);
  // 空中都市
  const sky=mk(W,H),b=sky.getContext('2d');vgrad(b,0,0,W,H,['#e8b8a0','#c88aa0','#7a6aa8','#3a3a7a']);
  for(let k=0;k<5;k++){const cx=40+k*64,cy=60+((k*37)%50),w2=28+((k*13)%20);poly(b,'#2a2a4a',[cx-w2,cy,cx+w2,cy,cx+w2*.4,cy+20,cx,cy+34,cx-w2*.4,cy+20]);for(let j=0;j<4;j++){const bh=10+((j*k*7)%22);R(b,'#3a3a5a',cx-w2+6+j*12,cy-bh,9,bh);R(b,'#ffd98a',cx-w2+8+j*12,cy-bh+3,2,2);}}
  for(let i=0;i<8;i++){glowE(b,(i*53)%W,120+((i*31)%50),40,8,'255,255,255',.12);}
  EXTRA_SRC={sea,sky};return EXTRA_SRC;
}
const SHARDS=(()=>{
  // 中心から放射状の破片
  const cx=160,cy=92,out=[];const n=9;const ang=[];for(let i=0;i<n;i++)ang.push(i/n*TAU+(hash(i,3)-.5)*.5);
  for(let i=0;i<n;i++){const a0=ang[i],a1=ang[(i+1)%n]+(i===n-1?TAU:0);const r0=18+hash(i,4)*16,r1=18+hash(i+1,4)*16;
    const am=(a0+a1)/2;out.push([cx+Math.cos(a0)*r0,cy+Math.sin(a0)*r0*.8,cx+Math.cos(a0)*400,cy+Math.sin(a0)*400,cx+Math.cos(am)*420,cy+Math.sin(am)*420,cx+Math.cos(a1)*400,cy+Math.sin(a1)*400,cx+Math.cos(a1)*r1,cy+Math.sin(a1)*r1*.8]);}
  return out;
})();
scene('collapse',{worlds:'A',name:'混ざり合う世界',vig:.55,
  bg(g){R(g,'#04030c',0,0,W,H);for(let i=0;i<40;i++)px(g,'#2a2a5a',hash(i,1)*W,hash(i,2)*H);
    mark('center','境界の裂け目（中央）',130,66,60,52);mark('fragments','混ざり合う場所の破片（t で入れ替わる）',0,0,320,180);return {};},
  fx(g,w,t,o){
    const ex=extraSrc();
    const src=[()=>getStatic('station_ruin','A',{}).c,()=>getStatic('bureau','A',{}).c,()=>getStatic('school','B',{}).c,()=>ex.sea,()=>ex.sky,()=>getStatic('factory_glimpse','A',{}).c,()=>getStatic('station_live','A',{}).c,()=>getStatic('shrine','B',{}).c,()=>getStatic('residential','A',{}).c];
    const phase=Math.floor(t/2.5);
    SHARDS.forEach((pts,i)=>{
      let si=(i+phase*2)%src.length;
      // 配信部屋：ごく短く一枚だけ
      const room=((phase+i)%11===3)&&((t%2.5)<.9);
      g.save();g.beginPath();g.moveTo(pts[0],pts[1]);for(let k=2;k<pts.length;k+=2)g.lineTo(pts[k],pts[k+1]);g.closePath();g.clip();
      const dx=Math.sin(t*.4+i)*6,dy=Math.cos(t*.3+i*2)*4;
      g.drawImage(room?getStatic('stream_room','A',{}).c:src[si](),dx-6,dy-4,W+12,H+8);
      g.fillStyle=`rgba(10,8,30,${.25+.15*Math.sin(t+i)})`;g.fillRect(0,0,W,H);
      g.restore();
    });
    // 破片のふち
    SHARDS.forEach(pts=>{for(let k=0;k<pts.length-2;k+=2){line(g,'rgba(159,240,224,.65)',pts[k],pts[k+1],pts[k+2],pts[k+3]);}});
    // 中心の裂け目
    ell(g,'#020208',160,92,26+Math.sin(t*2)*2,22);glow(g,160,92,44,'159,240,224',.3);ell(g,'#e4fff8',160,92,3,3);
    motes(g,t,40,'228,255,248',[0,0,W,H],131);
  }
});

// ───────── 境界核 ─────────
scene('core',{worlds:'A',name:'境界核',vig:.6,
  bg(g){vgrad(g,0,0,W,H,['#020210','#06061e','#0a0a2a','#04040e']);stars(g,0,0,W,H,120,141);mark('core','境界核（中央の光）',130,62,60,60);return {};},
  fx(g,w,t,o){
    const pr=Math.max(0,Math.min(1,+o.progress||0));const cx=160,cy=92;
    // リング
    for(let r=0;r<6;r++){const rad=24+r*12+pr*r*10,tilt=.35+r*.06,rot=t*(.3+r*.12)*(r%2?1:-1);const n=Math.round(rad*2.6);
      for(let k=0;k<n;k++){const a=k/n*TAU+rot;const gap=(Math.sin(a*3+r)>.6-pr*.6);if(gap)continue;const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad*tilt;const front=Math.sin(a)>0;
        px(g,front?(r===2&&k%37===0?'#e05a6a':'#9ff0e0'):'#2a8f96',x,y);}}
    // 周回する破片
    for(let i=0;i<14;i++){const a=t*(.4+hash(i,1)*.5)+i,rad=40+hash(i,2)*70+pr*30;const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad*.45;const s=2+hash(i,3)*4;
      poly(g,i%5===0?'#e4fff8':'#4fc8bc',[x,y-s,x+s*.7,y,x,y+s*.6,x-s*.6,y]);}
    // 核
    const r0=16*(1-pr*.5)+Math.sin(t*3)*1.5;glow(g,cx,cy,70*(1-pr*.4),'159,240,224',.5);ell(g,'#4fc8bc',cx,cy,r0,r0);ell(g,'#9ff0e0',cx,cy,r0*.75,r0*.75);ell(g,'#ffffff',cx,cy,r0*.4,r0*.4);
    if(pr>0){for(let i=0;i<5;i++){const a=i/5*TAU+t*.2;line(g,'#020210',cx,cy,cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);}}
    // 444 の赤い点（ときどき）
    if(Math.sin(t*.7)>.9){const a=t*1.1;glow(g,cx+Math.cos(a)*110,cy+Math.sin(a)*40,5,'224,90,106',.8);}
  }
});

// ───────── 町の地図 ─────────
// 地点の位置（0..1）。KY.AREAS[id].map にはこの値を使う。
const MAP_AREAS={
  center:        {x:.20,y:.66,name:'観測センター',scene:'center_office'},
  shotengai:     {x:.45,y:.57,name:'月代商店街',scene:'shotengai'},
  residential:   {x:.35,y:.82,name:'住宅街',scene:'residential'},
  school:        {x:.60,y:.40,name:'月代小学校',scene:'school'},
  shrine:        {x:.78,y:.22,name:'神社',scene:'shrine'},
  riverbank:     {x:.66,y:.74,name:'河川敷',scene:'riverbank'},
  tunnel:        {x:.84,y:.50,name:'廃トンネル',scene:'tunnel'},
  mountain_road: {x:.24,y:.34,name:'山道',scene:'mountain_road'},
  station_ruin:  {x:.40,y:.16,name:'月代駅跡',scene:'station_ruin'},
  old_lab:       {x:.84,y:.82,name:'旧研究施設',scene:'old_lab'}
};
function mapIcon(g,id,x,y,w){
  const c=w==='C'?'#5a6a66':null;
  switch(id){
    case 'center':R(g,OL,x-7,y-6,14,10);R(g,c||'#d8dce8',x-6,y-5,12,8);R(g,c||'#4fc8bc',x-5,y-4,10,2);R(g,OL,x+2,y-10,1,4);ell(g,c||'#9ff0e0',x+2,y-11,1,1);break;
    case 'shotengai':for(let k=0;k<3;k++){R(g,OL,x-8+k*5,y-5,5,8);R(g,c||['#e05a6a','#ffd98a','#5a9ad0'][k],x-7+k*5,y-4,3,6);}R(g,OL,x-9,y-7,18,2);break;
    case 'residential':for(let k=0;k<2;k++){poly(g,OL,[x-9+k*9,y-1,x-5+k*9,y-6,x-1+k*9,y-1]);R(g,OL,x-8+k*9,y-1,7,6);R(g,c||'#e4d8c0',x-7+k*9,y,5,4);}break;
    case 'school':R(g,OL,x-9,y-5,18,9);R(g,c||'#aeb2c8',x-8,y-4,16,7);R(g,OL,x-2,y-9,4,5);R(g,c||'#f4f4f4',x-1,y-8,2,2);break;
    case 'shrine':R(g,OL,x-7,y-7,14,2);R(g,c||'#c8402e',x-6,y-7,12,1);R(g,OL,x-5,y-5,2,9);R(g,OL,x+3,y-5,2,9);R(g,c||'#c8402e',x-5,y-5,1,8);R(g,c||'#c8402e',x+3,y-5,1,8);break;
    case 'riverbank':poly(g,OL,[x-9,y,x+9,y-3,x+9,y+1,x-9,y+4]);R(g,c||'#8a8a9a',x-8,y,6,2);R(g,c||'#8a8a9a',x+3,y-2,5,2);break;
    case 'tunnel':ell(g,OL,x,y,8,7);ell(g,c||'#7a6a60',x,y,7,6);ell(g,'#020204',x,y+1,4,5);R(g,c||'#7a6a60',x-8,y+2,16,5);break;
    case 'mountain_road':poly(g,OL,[x-9,y+4,x-2,y-7,x+5,y+4]);poly(g,c||'#3a6454',[x-7,y+3,x-2,y-5,x+3,y+3]);line(g,c||'#e8d8b0',x-6,y+6,x+8,y-2);break;
    case 'station_ruin':R(g,OL,x-9,y-4,18,3);R(g,c||'#8a8a96',x-8,y-3,16,1);R(g,OL,x-7,y-1,2,6);R(g,OL,x+5,y-1,2,6);R(g,OL,x-4,y-1,8,4);R(g,c||'#f4f4f4',x-3,y,6,2);break;
    case 'old_lab':R(g,OL,x-7,y-7,14,12);R(g,c||'#4a5468',x-6,y-6,12,10);ell(g,c||'#4fc8bc',x,y-1,2,3);break;
  }
}
scene('town_map',{worlds:'ABC',name:'月代町の地図',vig:.3,
  key(o){return JSON.stringify([o.locked||null,o.unlocked||null,o.current||null,o.visited||null]);},
  bg(g,w,o){
    // 地面
    vgrad(g,0,0,W,H,w==='C'?['#1a2422','#16201e','#121a18']:w==='B'?['#2a2a2a','#26241e','#201e1a']:['#1a2034','#18203a','#141a30']);
    srand(151);for(let i=0;i<500;i++)px(g,w==='C'?'#1e2a28':w==='B'?'#302c24':'#1e2640',rnd()*W,rnd()*H);
    // 山（上）
    for(let i=0;i<14;i++){const x=10+i*22+hash(i,1)*8,y=10+hash(i,2)*18;poly(g,OL,[x-14,y+14,x,y-6,x+14,y+14]);poly(g,w==='C'?'#2a3a34':'#2e3a4a',[x-12,y+13,x,y-4,x+12,y+13]);R(g,w==='C'?'#3a4a44':'#4a5670',x-1,y-4,2,3);}
    // 森の点
    srand(153);for(let i=0;i<70;i++){const x=rnd()*W,y=rnd()*H;const nearArea=Object.values(MAP_AREAS).some(a=>Math.abs(a.x*W-x)<18&&Math.abs(a.y*H-y)<14);if(nearArea)continue;if(y<36||rnd()<.35){ell(g,w==='C'?'#1e3430':'#1e3a3a',x,y,2.5,2);px(g,w==='C'?'#2a4a40':'#2a4e4a',x-1,y-1);}}
    // 田んぼ
    for(let i=0;i<6;i++){const x=200+(i%3)*18,y=120+(i>>1)*10;R(g,w==='C'?'#22302c':'#22304a',x,y,16,8);R(g,w==='C'?'#1a2622':'#1a2640',x,y+4,16,1);}
    // 川
    const riv=[[300,0],[290,30],[262,60],[240,96],[214,126],[196,150],[176,180]];
    for(let i=0;i<riv.length-1;i++){const [x0,y0]=riv[i],[x1,y1]=riv[i+1];for(let k=0;k<=1;k+=.05){const x=x0+(x1-x0)*k,y=y0+(y1-y0)*k;ell(g,w==='C'?'#3a3226':'#2a4a7a',x,y,7,4);}}
    for(let i=0;i<riv.length-1;i++){const [x0,y0]=riv[i],[x1,y1]=riv[i+1];line(g,w==='C'?'#4a4030':'#4a7ab0',x0-2,y0,x1-2,y1);}
    // 道
    const road=w==='C'?'#4a524e':w==='B'?'#a89878':'#b8b0a0';
    const roads=[[64,118,144,102],[144,102,192,72],[144,102,112,148],[144,102,212,134],[212,134,268,148],[192,72,250,40],[192,72,268,90],[64,118,78,62],[78,62,128,30]];
    roads.forEach(r=>{line(g,OL,r[0],r[1]+1,r[2],r[3]+1);line(g,road,r[0],r[1],r[2],r[3]);});
    // 橋（A：崩れ／B：鉄橋）
    if(w==='B'){// 鉄道（Bだけ）
      const rail=[[0,56],[60,44],[128,30],[200,40],[262,62],[320,70]];for(let i=0;i<rail.length-1;i++){const [x0,y0]=rail[i],[x1,y1]=rail[i+1];line(g,OL,x0,y0,x1,y1);line(g,OL,x0,y0+2,x1,y1+2);for(let k=0;k<1;k+=.08){const x=x0+(x1-x0)*k,y=y0+(y1-y0)*k;R(g,'#8a7a5a',x,y-1,1,4);}}
      tx(276,58,4,'月代線',{c:'#e8d8b0',f:'m',b:true});mark('railway','鉄道 月代線（Bの地図だけ）',0,26,320,46);}
    else if(w==='A'){for(let k=0;k<1;k+=.1){const x=60+(200-60)*k,y=44+(40-44)*k;}}
    // 町の名前
    tx(18,160,9,w==='B'?'月代村':'月代町',{c:w==='C'?'#5a6a66':'#e8e0c8',f:'m',b:true,alt:w==='A'?'月白町':null});
    tx(18,172,3.6,w==='C'?'――観測不能――':'特殊現象観測センター 月代分室 作成',{c:w==='C'?'#5a6a66':'#a8a8c0',f:'m'});
    // 方位
    R(g,OL,296,148,1,18);poly(g,'#e8e0c8',[296,146,293,153,299,153]);tx(296,166,4,'北',{c:'#e8e0c8',al:'center',f:'m'});
    // 地点
    const locked=new Set(o.locked||[]);const un=o.unlocked?new Set(o.unlocked):null;const vis=new Set(o.visited||[]);
    const D={cur:null};
    Object.keys(MAP_AREAS).forEach(id=>{const a=MAP_AREAS[id];const x=a.x*W,y=a.y*H;
      const isL=locked.has(id)||(un&&!un.has(id));
      mapIcon(g,id,x,y,w);
      if(isL){for(let k=0;k<7;k++){const fx=x+(hash(k,id.length)-.5)*26,fy=y+(hash(k+3,id.length)-.5)*14;glowE(g,fx,fy,10+hash(k,7)*6,6+hash(k,8)*3,'150,160,190',.2,3);}
        tx(x,y+8,5,'？？？',{c:'#c8cce0',al:'center',b:true});}
      else{R(g,'rgba(8,8,20,.65)',x-a.name.length*2.7-2,y+7,a.name.length*5.4+4,8);tx(x,y+7.5,5.2,a.name,{c:vis.has(id)?'#a8b0c8':'#f4f0e0',al:'center',b:true,f:'m'});}
      if(o.current===id)D.cur=[x,y];
      mark(id,a.name+(isL?'（霧：未解放）':''),x-14,y-10,28,24);
    });
    if(w==='C'){R(g,'rgba(10,20,18,.35)',0,0,W,H);}
    return D;
  },
  fx(g,w,t,o,D){
    if(D.cur){const [x,y]=D.cur;const r=8+Math.sin(t*3)*2;for(let k=0;k<24;k++){const a=k/24*TAU;px(g,'#9ff0e0',x+Math.cos(a)*r,y+Math.sin(a)*r*.7);}glow(g,x,y,10,'159,240,224',.3);}
    if(w==='C')motes(g,t,12,'159,240,224',[0,0,W,H],161);
  }
});

// ───────── 観測ボードの背景 ─────────
scene('board_bg',{worlds:'ABC',name:'観測ボードの背景',vig:.5,
  bg(g,w){
    vgrad(g,0,0,W,H,w==='C'?['#0a1414','#081010']:w==='B'?['#14120e','#0e0c0a']:['#0a0e1e','#080b18']);
    const gc=w==='B'?'#2a2418':w==='C'?'#12201e':'#121a30',gc2=w==='B'?'#3a3220':w==='C'?'#1a2e2a':'#1a2644';
    for(let x=0;x<W;x+=8)R(g,x%40===0?gc2:gc,x,0,1,H);for(let y=0;y<H;y+=8)R(g,y%40===0?gc2:gc,0,y,W,1);
    // うっすら町の輪郭
    const riv=[[300,0],[262,60],[214,126],[176,180]];for(let i=0;i<riv.length-1;i++)line(g,w==='B'?'#3a3020':'#1e3050',riv[i][0],riv[i][1],riv[i+1][0],riv[i+1][1]);
    // 角の括弧
    const bc=w==='B'?'#8a7a50':'#4fc8bc';for(const [x,y,sx,sy] of [[6,6,1,1],[313,6,-1,1],[6,173,1,-1],[313,173,-1,-1]]){R(g,bc,sx>0?x:x-10,y,11,1);R(g,bc,x,sy>0?y:y-10,1,11);}
    tx(10,9,4,w==='B'?'觀測板':'OBSERVATION BOARD',{c:w==='B'?'#a89870':'#4fc8bc',f:w==='B'?'m':'mono',b:true,a:.8});
    tx(310,9,3.4,'月代分室',{c:w==='B'?'#a89870':'#4fc8bc',al:'right',a:.6});
    return {};
  },
  fx(g,w,t){const y=(t*14)%H;R(g,w==='B'?'rgba(200,170,110,.06)':'rgba(79,200,188,.07)',0,y,W,2);}
});

// ════════════════════════════════════════════════════════════════
//  人物の顔（64×80 ドットの胸から上。外周線つき・左上からの光）
// ════════════════════════════════════════════════════════════════
const PW=64,PH=80;
const PCACHE=new Map();
// 目：x,y は目の中心。st={iris, lash, white, big(子供), narrow}
function pEye(q,x,y,face,st,side){
  const lash=st.lash||'#2a1a24',wh=st.white||'#f6f2f6',ir=st.iris||'#3a3048',big=st.big?1:0;
  if(face==='smile'&&!st.softSmile){R(q,lash,x-2,y,1,1);R(q,lash,x-1,y-1,3,1);R(q,lash,x+2,y,1,1);return;}
  const top=y-1-big,hgt=3+big;
  if(face==='surprise'){R(q,wh,x-2,top-1,5,hgt+1);R(q,ir,x-1,top,2,2+big);px(q,'#ffffff',x-1,top);R(q,lash,x-2,top-2,5,1);return;}
  R(q,wh,x-2,top,5,hgt);
  let iy=top;if(face==='sad'||face==='worry')iy=top+1;
  R(q,ir,x-1,iy,3,hgt-(face==='sad'?1:0));R(q,mix(ir,'#000000',.4),x,iy+1,1,Math.max(1,hgt-2));
  if(face!=='cold')px(q,'#ffffff',x-1,iy);
  // まぶた
  let lid=0;if(face==='serious'||face==='cold'||face==='sad'||(face==='smile'&&st.softSmile)||st.tired)lid=1;if(st.narrow&&face!=='surprise')lid=Math.max(lid,1);if(face==='cold')lid=2;
  R(q,lash,x-2,top-1,5,1);if(lid)R(q,st.lid||mix(st.skin||'#e8c8b8','#000000',.12),x-2,top,5,lid);if(lid)R(q,lash,x-2,top+lid-1,5,1);
  if(st.lashOut)px(q,lash,x+side*3,top-1+(st.lashOut>1?0:1));
  if(face==='smile'&&st.softSmile)R(q,st.skin||'#e8c8b8',x-2,top+hgt-1,5,1);
  if(st.bags)R(q,st.bags,x-2,top+hgt,4,1);
}
function pBrow(q,x,y,face,col,side,thick){
  // side: -1 左目 / +1 右目（内側は中央寄り）
  const inner=x-side*2,outer=x+side*2;
  let yi=y,yo=y;if(face==='worry'||face==='sad'){yi=y-1;yo=y+.5;}if(face==='serious'||face==='cold'){yi=y+1;yo=y-.5;}if(face==='surprise'){yi=y-2;yo=y-2;}if(face==='smile'){yi=y-.5;yo=y-.5;}
  line(q,col,inner,yi,outer,yo);if(thick)line(q,col,inner,yi+1,outer-side,yo+1);
}
function pMouth(q,x,y,face,col,o){
  o=o||{};const dk=mix(col,'#000000',.35);
  switch(face){
    case 'smile':R(q,dk,x-2,y,1,1);R(q,dk,x-1,y+1,3,1);R(q,dk,x+2,y,1,1);if(o.open){R(q,'#c86a7a',x-1,y,3,1);}break;
    case 'worry':px(q,dk,x-2,y+1);R(q,dk,x-1,y,1,1);px(q,dk,x,y+1);R(q,dk,x+1,y,1,1);break;
    case 'surprise':ell(q,dk,x,y+.5,1.5,1.6);px(q,'#c86a7a',x,y+1);break;
    case 'serious':R(q,dk,x-2,y,5,1);break;
    case 'cold':R(q,mix(col,'#ffffff',.1),x-2,y,5,1);break;
    case 'sad':R(q,dk,x-1,y,3,1);px(q,dk,x-2,y+1);px(q,dk,x+2,y+1);break;
    default:R(q,dk,x-1,y,3,1);px(q,mix(col,'#000000',.15),x+2,y);
  }
}
// 顔の輪郭
function pHead(q,o){
  const cx=o.cx||32,cy=o.cy||30,rx=o.rx||12.5,ry=o.ry||14,jaw=o.jaw==null?.55:o.jaw,sk=o.skin;
  ell(q,sk,cx,cy-1,rx,ry*.86);
  poly(q,sk,[cx-rx,cy-2,cx-rx+.5,cy+ry*.4,cx-rx*jaw,cy+ry*.82,cx-2,cy+ry,cx+2,cy+ry,cx+rx*jaw,cy+ry*.82,cx+rx-.5,cy+ry*.4,cx+rx,cy-2]);
  // 耳
  ell(q,sk,cx-rx-.5,cy+1,1.6,3);ell(q,sk,cx+rx+.5,cy+1,1.6,3);px(q,mix(sk,'#000000',.2),cx-rx-.5,cy+1);px(q,mix(sk,'#000000',.2),cx+rx+.5,cy+1);
  // 陰（右・あごの下）
  const sh=o.shade||mix(sk,'#5a3a4a',.28);
  poly(q,sh,[cx+rx-2,cy-2,cx+rx,cy-2,cx+rx-.5,cy+ry*.4,cx+rx*jaw,cy+ry*.82,cx+2,cy+ry,cx+3,cy+ry-1,cx+rx*jaw-1,cy+ry*.78,cx+rx-2.5,cy+ry*.38]);
  if(o.gaunt){line(q,sh,cx-rx+2,cy+4,cx-rx*jaw,cy+ry*.7);line(q,sh,cx+rx-3,cy+4,cx+rx*jaw-1,cy+ry*.7);}
  // 鼻
  px(q,sh,cx+1,cy+5);px(q,sh,cx,cy+6);if(o.nose)px(q,sh,cx+1,cy+4);
  if(o.blush){R(q,o.blush,cx-9,cy+5,3,1);R(q,o.blush,cx+6,cy+5,3,1);}
}
function pBody(q,o){
  // 首
  const cx=32,ny=o.ny||42;R(q,o.neck||mix(o.skin,'#5a3a4a',.2),cx-4,ny,8,10);
  const sw=o.sw||26,top=o.top||52;
  poly(q,o.c1,[cx-6,top-2,cx-sw+6,top,cx-sw+1,top+4,cx-sw-1,PH,cx+sw+1,PH,cx+sw-1,top+4,cx+sw-6,top,cx+6,top-2]);
  poly(q,o.c2||mix(o.c1,'#000000',.25),[cx+sw-10,top+1,cx+sw-1,top+4,cx+sw+1,PH,cx+sw-12,PH]);
}
function pPost(q){post(q,PW,PH,{minA:80});}

const PORTRAITS={
  // 如月ユウ：先輩観測員。落ち着いた目、長めの黒髪（片側に流した前髪）、キャメルのコートにタートルネック
  yuu:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#f0d6c6',hair='#23263a',hl='#3e4668',hd='#161826';
    // 後ろ髪
    poly(q,hair,[17,24,20,12,32,8,44,12,47,24,48,40,44,46,41,36,23,36,20,46,16,40]);
    pBody(q,{skin:sk,c1:'#a88a64',c2:'#86684a',sw:27});
    // タートルネック
    R(q,'#2c2c3c',26,44,12,10);R(q,'#3a3a4c',26,44,12,2);for(let k=0;k<3;k++)R(q,'#22222e',27,47+k*2,10,1);
    // コートのえり
    poly(q,'#b89a72',[22,52,28,50,30,62,24,74,18,58]);poly(q,'#b89a72',[42,52,36,50,34,62,40,74,46,58]);
    poly(q,'#7a5e40',[30,62,34,62,34,80,30,80]);
    // ネックストラップと職員証
    line(q,'#3a8ac0',27,52,29,66);line(q,'#3a8ac0',37,52,35,66);R(q,'#e8eef4',29,66,7,9);R(q,'#3a8ac0',29,66,7,2);R(q,'#8a9ab0',30,70,3,3);
    pHead(q,{skin:sk,rx:12,ry:14.5,jaw:.52});
    const st={iris:'#3e4c6a',lash:'#1e1a26',skin:sk,softSmile:true,narrow:f==='normal'};
    pEye(q,26,31,f,st,-1);pEye(q,38,31,f,st,1);
    pBrow(q,26,27,f,hd,-1);pBrow(q,38,27,f,hd,1);
    pMouth(q,32,39,f,'#c08078');
    // 前髪（右から左へ流す）
    poly(q,hair,[19,26,20,14,30,10,42,12,46,20,46,26,43,22,38,20,34,23,30,20,26,26,23,24,21,30]);
    line(q,hl,24,14,36,12);line(q,hl,22,18,28,15);line(q,hd,34,22,38,19);line(q,hd,28,22,30,19);
    poly(q,hair,[44,20,47,24,47,36,45,34]);poly(q,hair,[19,24,17,32,18,40,20,34]);
    pPost(q);}},
  // 御堂：室長。白髪まじりの短髪、疲れた目（くま）、無精ひげ、カーディガンにシャツとゆるいネクタイ
  mido:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#e4c4ae',hair='#5a524e',hl='#8a8480',hd='#3a3432';
    pBody(q,{skin:sk,c1:'#7a5a44',c2:'#5e4232',sw:28});
    poly(q,'#d4dcea',[25,50,32,54,39,50,38,62,32,66,26,62]);R(q,'#b8c4d6',31,52,2,14);
    poly(q,'#3a5a4a',[30,54,34,54,35,66,32,70,29,66]);R(q,'#4a6a5a',31,54,2,2);
    for(let y=58;y<80;y+=3){px(q,'#6a4a36',22,y);px(q,'#6a4a36',42,y);}
    poly(q,'#8a6a52',[20,52,26,50,30,80,22,80]);poly(q,'#6a4e3a',[44,52,38,50,34,80,42,80]);
    pHead(q,{skin:sk,rx:12.5,ry:14.5,jaw:.62,nose:true});
    // 無精ひげ
    srand(400);for(let i=0;i<26;i++){px(q,'rgba(80,70,70,.45)',23+rnd()*18,38+rnd()*6);}
    const st={iris:'#4a3a32',lash:'#2a201c',skin:sk,tired:true,bags:'#c8a090',softSmile:true};
    pEye(q,26,31,f,st,-1);pEye(q,38,31,f,st,1);
    pBrow(q,26,27,f,hd,-1,true);pBrow(q,38,27,f,hd,1,true);
    pMouth(q,32,40,f,'#b07a6e');
    line(q,'#c8a490',24,37,25,40);line(q,'#c8a490',40,37,39,40);
    // 髪（短い・こめかみが少し後退・白髪）
    poly(q,hair,[19,26,20,16,26,11,32,10,40,11,45,17,45,26,42,20,38,18,32,19,27,18,22,21]);
    srand(300);for(let i=0;i<14;i++){px(q,hl,21+rnd()*22,12+rnd()*8);}
    R(q,hl,19,22,2,6);R(q,hl,43,22,2,6);
    pPost(q);}},
  // ナギ：別の世界の10歳くらいの少女。黒いおかっぱ、赤い髪留め、丸えりのブラウスに紺のジャンパースカート（少し古い型）
  nagi:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#f6e0d2',hair='#1e1a24',hl='#3e3850';
    poly(q,hair,[16,30,18,14,32,9,46,14,48,30,48,44,40,44,24,44,16,44]);
    pBody(q,{skin:sk,c1:'#f2eee2',c2:'#d8d2c2',sw:21,top:54,ny:44});
    // 丸えり
    ell(q,'#ffffff',27,55,5,3);ell(q,'#ffffff',37,55,5,3);R(q,'#c83a3a',30,55,4,2);
    // ジャンパースカート
    poly(q,'#34466a',[20,62,26,60,26,80,18,80]);poly(q,'#34466a',[44,62,38,60,38,80,46,80]);poly(q,'#34466a',[24,66,40,66,42,80,22,80]);R(q,'#26344e',22,66,20,1);ell(q,'#e8d070',25,68,1,1);ell(q,'#e8d070',39,68,1,1);
    pHead(q,{skin:sk,cy:31,rx:13,ry:13.5,jaw:.62,blush:'#f0a8a8'});
    const st={iris:'#2a2030',lash:'#1a1420',skin:sk,big:true,lashOut:1};
    pEye(q,26,32,f,st,-1);pEye(q,38,32,f,st,1);
    pBrow(q,26,27,f,'#2a2230',-1);pBrow(q,38,27,f,'#2a2230',1);
    pMouth(q,32,40,f,'#d08080');
    // おかっぱの前髪（まっすぐ）
    poly(q,hair,[18,28,19,16,26,11,38,11,45,16,46,28,44,25,20,25]);R(q,hair,19,24,26,2);
    for(let x=20;x<45;x+=4)R(q,hl,x,15,1,8);line(q,hl,22,13,34,11);
    // 赤い髪留め
    R(q,'#c83a3a',39,16,6,3);R(q,'#e85a5a',39,16,6,1);
    pPost(q);}},
  // 九条シン：やせた・端正・不気味なほど静か。後ろへ流した長めの黒髪に白い筋、高いえりの黒い外套、銀のピン
  kujo:{faces:['normal','smile','worry','surprise','serious','cold','sad'],draw(q,f){
    const sk='#e6dcd6',hair='#141218',hl='#3a3644',hd='#08070a';
    poly(q,hair,[19,22,22,12,32,8,42,12,45,22,46,40,44,52,40,46,24,46,20,52,18,40]);
    pBody(q,{skin:sk,c1:'#1c1a24',c2:'#121018',sw:26});
    // 高いえり
    poly(q,'#24222e',[22,46,28,44,30,58,24,62,20,56]);poly(q,'#24222e',[42,46,36,44,34,58,40,62,44,56]);
    R(q,'#5a1e2a',29,50,6,10);R(q,'#7a2a3a',30,50,4,2);
    R(q,'#c8ccd8',40,60,2,2);px(q,'#ffffff',40,60);
    pHead(q,{skin:sk,rx:11,ry:15.5,jaw:.48,gaunt:true,nose:true,shade:'#b8a8b4'});
    const st={iris:'#2a2228',lash:'#141018',skin:sk,narrow:true,lid:'#cfc2c4',bags:'#cab8c0',softSmile:true};
    pEye(q,26.5,31,f,st,-1);pEye(q,37.5,31,f,st,1);
    pBrow(q,26.5,27,f==='smile'?'normal':f,hd,-1);pBrow(q,37.5,27,f==='smile'?'normal':f,hd,1);
    pMouth(q,32,41,f==='smile'?'smile':f,'#a88890');
    // 後ろへ流した髪と、垂れた数本・白い筋
    poly(q,hair,[20,24,21,14,28,9,38,9,44,14,44,24,42,18,36,15,30,15,24,18]);
    line(q,hl,26,12,40,13);line(q,'#a8a4b0',36,10,43,18);line(q,'#a8a4b0',37,10,44,19);
    line(q,hair,27,17,25,29);line(q,hair,28,17,27,26);
    pPost(q);}},
  // シロ：白い小さな生き物。輪郭がゆらいで形が定まらない。黒い二つの目
  shiro:{faces:['idle','alert','glow','normal','smile','worry','surprise','serious'],live:true,draw(q,f,t){
    const cx=32,cy=50,face=f==='normal'?'idle':f;
    if(face==='glow'){glow(q,cx,cy,30,'159,240,224',.55);}
    else glow(q,cx,cy,22,'200,240,255',.18);
    const N=40,pts=[];const ra=face==='alert'?15:16,rb=face==='alert'?13:12;
    for(let i=0;i<N;i++){const a=i/N*TAU;let r=1+.08*Math.sin(a*3+t*2.1)+.06*Math.sin(a*5-t*1.7)+.05*Math.sin(a*2+t*.9);
      // 耳（ゆらいで現れたり消えたり）
      const ear=Math.max(0,Math.cos(a+Math.PI/2+.5))**8*(face==='alert'?.55:.25+.15*Math.sin(t*1.3))+Math.max(0,Math.cos(a+Math.PI/2-.5))**8*(face==='alert'?.55:.25+.15*Math.sin(t*1.1+1));
      r+=ear;pts.push(cx+Math.cos(a)*ra*r,cy+Math.sin(a)*rb*r*(a>0&&a<Math.PI?.9:1));}
    // ぼやけた縁（外側に薄い輪）
    const big=pts.map((v,i)=>i%2?cy+(v-cy)*1.12:cx+(v-cx)*1.12);
    poly(q,'rgba(230,244,255,.35)',big);
    poly(q,'#f4f8fc',pts);
    const inner=pts.map((v,i)=>i%2?cy+(v-cy)*.7-1:cx+(v-cx)*.7-1);poly(q,'#ffffff',inner);
    // 陰
    ell(q,'rgba(150,170,200,.35)',cx+4,cy+7,9,3);
    // 目
    const ey=cy-1,ed=6;
    if(face==='glow'||face==='smile'){for(const s of [-1,1]){R(q,'#1a1a2a',cx+s*ed-1,ey,3,1);px(q,'#1a1a2a',cx+s*ed-2,ey+1);px(q,'#1a1a2a',cx+s*ed+2,ey+1);}}
    else{const eh=face==='alert'||face==='surprise'?4:3;for(const s of [-1,1]){R(q,'#16141e',cx+s*ed-1,ey-eh+2,3,eh);px(q,'#ffffff',cx+s*ed-1,ey-eh+2);}}
    if(face==='worry'){px(q,'#8a9ab0',cx-ed-2,ey-3);px(q,'#8a9ab0',cx+ed+2,ey-3);}
    if(face==='alert'){for(let k=0;k<3;k++)px(q,'#9ff0e0',cx-14+k*14,cy-18-(k===1?3:0));}
    if(face==='glow'){motes(q,t,14,'159,240,224',[8,18,48,52],5);}
    post(q,PW,PH,{minA:120,shade:false,line:[90,110,140]});
  }},
  // 住民A：商店の主人（50代の女性・パーマ・紺のエプロン）
  resident_a:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#ecc8b0',hair='#6a4a3a',hl='#8a6a54';
    for(let i=0;i<18;i++){const a=i/18*Math.PI-Math.PI;ell(q,hair,32+Math.cos(a)*13,26+Math.sin(a)*12,4,4);}ell(q,hair,32,22,13,10);
    pBody(q,{skin:sk,c1:'#c87a7a',c2:'#a85a5a',sw:27});
    poly(q,'#2e3e66',[22,58,42,58,44,80,20,80]);R(q,'#2e3e66',24,52,2,7);R(q,'#2e3e66',38,52,2,7);R(q,'#e8e0d0',28,64,8,5);
    pHead(q,{skin:sk,rx:12.5,ry:14,jaw:.6,blush:'#e8a8a0'});
    const st={iris:'#4a3428',lash:'#2a1c18',skin:sk,softSmile:true};
    pEye(q,26,31,f,st,-1);pEye(q,38,31,f,st,1);pBrow(q,26,27,f,'#4a3428',-1);pBrow(q,38,27,f,'#4a3428',1);pMouth(q,32,40,f,'#c87a78');
    for(let i=0;i<9;i++){ell(q,hair,21+i*2.8,17+Math.sin(i)*1.2,3,3);}line(q,hl,24,15,36,14);
    line(q,'#d0a890',23,36,24,38);line(q,'#d0a890',41,36,40,38);
    pPost(q);}},
  // 住民B：年配の男性（はげ頭・白い横髪・太い眉・ベスト）
  resident_b:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#e0bca4';
    pBody(q,{skin:sk,c1:'#5a5a4a',c2:'#44443a',sw:26});poly(q,'#e8e4d8',[26,50,32,56,38,50,36,70,28,70]);poly(q,'#7a6a4a',[22,54,29,52,31,80,22,80]);poly(q,'#7a6a4a',[42,54,35,52,33,80,42,80]);for(let k=0;k<3;k++)px(q,'#d8c890',33,60+k*5);
    pHead(q,{skin:sk,rx:12.5,ry:14.5,jaw:.62,nose:true});
    ell(q,'#e8e4e8',20,26,3,6);ell(q,'#e8e4e8',44,26,3,6);ell(q,'#f0b8a0',28,17,4,2);
    const st={iris:'#3a2e28',lash:'#2a201c',skin:sk,narrow:true,softSmile:true};
    pEye(q,26,31,f,st,-1);pEye(q,38,31,f,st,1);
    pBrow(q,26,26.5,f,'#e8e4e8',-1,true);pBrow(q,38,26.5,f,'#e8e4e8',1,true);
    pMouth(q,32,40,f,'#a87870');
    line(q,'#c49a84',23,35,25,40);line(q,'#c49a84',41,35,39,40);R(q,'#c49a84',28,22,8,1);R(q,'#c49a84',29,24,6,1);
    pPost(q);}},
  // 住民C：学生（高校生・学ラン・短い黒髪）
  resident_c:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#f2d6c2',hair='#1a1a22',hl='#3a3a4e';
    pBody(q,{skin:sk,c1:'#1e2030',c2:'#14161e',sw:25});R(q,'#1e2030',26,46,12,6);R(q,'#2e3044',26,46,12,1);for(let k=0;k<3;k++){ell(q,'#c8a040',32,57+k*7,1,1);}
    pHead(q,{skin:sk,rx:12,ry:14,jaw:.52});
    const st={iris:'#2a2228',lash:'#1a1420',skin:sk};
    pEye(q,26,31,f,st,-1);pEye(q,38,31,f,st,1);pBrow(q,26,27,f,'#1a1a22',-1,true);pBrow(q,38,27,f,'#1a1a22',1,true);pMouth(q,32,39,f,'#c88078');
    poly(q,hair,[19,28,19,16,26,10,38,10,45,16,45,28,43,22,40,25,37,21,33,25,30,21,26,25,22,22]);line(q,hl,24,13,38,12);
    pPost(q);}},
  // 住民D：母親（30代・低い位置で結んだ髪・明るいセーター）
  resident_d:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#f2d8c8',hair='#4a3028',hl='#6a4a3e';
    poly(q,hair,[18,26,21,13,32,9,43,13,46,26,46,44,42,52,40,40,24,40,20,46]);
    pBody(q,{skin:sk,c1:'#e8c8a8',c2:'#c8a888',sw:25});for(let y=56;y<80;y+=4)R(q,'#d8b898',14,y,36,1);
    pHead(q,{skin:sk,rx:12,ry:14,jaw:.54,blush:'#f0b0a8'});
    const st={iris:'#4a3028',lash:'#2a1a18',skin:sk,lashOut:1,softSmile:true};
    pEye(q,26,31,f,st,-1);pEye(q,38,31,f,st,1);pBrow(q,26,27,f,'#4a3028',-1);pBrow(q,38,27,f,'#4a3028',1);pMouth(q,32,39,f,'#d08080');
    poly(q,hair,[19,26,20,15,30,10,40,11,45,17,46,26,40,18,32,17,24,20]);line(q,hl,24,14,34,12);
    ell(q,hair,44,46,4,5);R(q,'#c87a8a',41,42,4,2);
    pPost(q);}},
  // 住民E：駅員（制帽・紺の制服・口ひげ）
  resident_e:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#e6c4ac';
    pBody(q,{skin:sk,c1:'#1e2a48',c2:'#141c34',sw:27});poly(q,'#e8eef4',[27,48,32,54,37,48,36,58,28,58]);R(q,'#1e2a48',31,54,2,6);for(let k=0;k<3;k++)ell(q,'#d8b850',32,62+k*6,1,1);R(q,'#d8b850',42,58,6,2);
    pHead(q,{skin:sk,rx:12.5,ry:14,jaw:.6,nose:true});
    const st={iris:'#3a2e28',lash:'#2a201c',skin:sk,narrow:true,softSmile:true};
    pEye(q,26,31,f,st,-1);pEye(q,38,31,f,st,1);pBrow(q,26,27,f,'#2a2420',-1,true);pBrow(q,38,27,f,'#2a2420',1,true);
    R(q,'#3a302a',28,37,8,2);px(q,'#3a302a',27,38);px(q,'#3a302a',36,38);pMouth(q,32,40,f,'#a87870');
    // 制帽
    R(q,'#1a2440',19,14,26,8);R(q,'#2a3658',19,14,26,2);R(q,'#0e1426',17,21,30,3);R(q,'#d8b850',22,20,20,1);ell(q,'#d8b850',32,17,2,2);
    R(q,'#3a3430',20,24,2,4);R(q,'#3a3430',42,24,2,4);
    pPost(q);}},
  // 住民F：子供（黄色い通学帽・赤いほっぺ）
  resident_f:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    const sk='#f6dccc';
    pBody(q,{skin:sk,c1:'#5a8ad0',c2:'#4a70b0',sw:19,top:56,ny:44});R(q,'#ffffff',28,56,8,3);R(q,'#e85a5a',23,66,3,8);R(q,'#e85a5a',38,66,3,8);
    pHead(q,{skin:sk,cy:32,rx:13,ry:13,jaw:.66,blush:'#f09898'});
    const st={iris:'#2a2028',lash:'#1a1420',skin:sk,big:true};
    pEye(q,26,33,f,st,-1);pEye(q,38,33,f,st,1);pBrow(q,26,28,f,'#3a2a24',-1);pBrow(q,38,28,f,'#3a2a24',1);pMouth(q,32,41,f,'#d07878',{open:true});
    R(q,'#2a2024',20,24,24,3);
    // 黄色い帽子
    ell(q,'#f4c830',32,20,15,8);R(q,'#f4c830',17,20,30,5);R(q,'#d8a818',15,24,34,2);R(q,'#ffe070',24,14,8,2);
    pPost(q);}},
  // 主人公（顔は出さない）：影の人影＋観測端末の職員証
  player:{faces:['normal','smile','worry','surprise','serious'],draw(q,f){
    ell(q,'#2a2c40',32,30,12.5,14);R(q,'#2a2c40',28,42,8,10);
    poly(q,'#2a2c40',[26,50,8,56,4,80,60,80,56,56,38,50]);
    // 職員証
    line(q,'#4fc8bc',26,52,29,64);line(q,'#4fc8bc',38,52,35,64);R(q,'#0e1a24',27,64,11,14);R(q,'#4fc8bc',28,65,9,2);R(q,'#9ff0e0',29,68,3,4);for(let k=0;k<3;k++)R(q,'#4fc8bc',33,68+k*2,4,1);
    glowE(q,32,71,10,8,'79,200,188',.3);
    // 縁の光
    post(q,PW,PH,{minA:80,shade:false});
  }}
};
// 未定義の表情は normal（シロは idle）にそろえる
function portrait(ctx,who,face,w,h,opts){
  if(!ctx)return;const o=opts||{};
  try{
    w=w||ctx.canvas.width;h=h||ctx.canvas.height;const x0=o.x||0,y0=o.y||0;
    const im=raster(['portrait.'+who+'.'+face,'portrait.'+who]);
    if(im){ctx.save();const s=Math.min(w/im.naturalWidth,h/im.naturalHeight);const dw=im.naturalWidth*s,dh=im.naturalHeight*s;ctx.drawImage(im,x0+(w-dw)/2,y0+h-dh,dw,dh);ctx.restore();return;}
    let P0=PORTRAITS[who];
    if(!P0&&/^resident_/.test(String(who)))P0=PORTRAITS.resident_a;
    if(!P0)P0=PORTRAITS.player;
    const f=P0.faces.indexOf(face)>=0?face:P0.faces[0];
    let c;
    if(P0.live){const t=o.t!=null?+o.t:(typeof performance!=='undefined'?performance.now()/1000:0);const fr=Math.floor(t*8)%64;const key=who+'|'+f+'|'+fr;c=PCACHE.get(key);
      if(!c){c=mk(PW,PH);P0.draw(c.getContext('2d'),f,fr/8);PCACHE.set(key,c);if(PCACHE.size>400)PCACHE.delete(PCACHE.keys().next().value);}}
    else{const key=who+'|'+f;c=PCACHE.get(key);if(!c){c=mk(PW,PH);P0.draw(c.getContext('2d'),f);PCACHE.set(key,c);}}
    let s=Math.min(w/PW,h/PH);if(s>=1&&!o.smooth)s=Math.max(1,Math.floor(s*2)/2);
    const dw=PW*s,dh=PH*s;
    ctx.save();const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
    if(o.bg){ctx.fillStyle=o.bg;ctx.fillRect(x0,y0,w,h);}
    ctx.drawImage(c,Math.round(x0+(w-dw)/2),Math.round(y0+h-dh),Math.round(dw),Math.round(dh));
    ctx.imageSmoothingEnabled=sm;ctx.restore();
  }catch(e){try{ctx.restore();}catch(e2){}}
}

// ════════════════════════════════════════════════════════════════
//  アイコン（16×16 ドットを 2 倍 → 32×32）
// ════════════════════════════════════════════════════════════════
const ICONS=new Map();
const IC={w:'#eef2fa',l:'#c4cce0',m:'#8a96b4',d:'#4a5474',k:'#262c44',c:'#4fc8bc',c2:'#9ff0e0',a:'#ffb85a',a2:'#ffd98a',r:'#e05a6a',r2:'#ff9a9a',g:'#6ad08a',p:'#f59aae',v:'#b49ae6'};
const FONT3={A:['010','101','111','101','101'],B:['110','101','110','101','110'],C:['011','100','100','100','011'],'0':['111','101','101','101','111'],'3':['111','001','011','001','111'],'4':['101','101','111','001','001'],'!':['1','1','1','0','1']};
function glyph(q,ch,x,y,col){const f=FONT3[ch];if(!f)return;f.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]==='1')px(q,col,x+i,y+j);});}
const ICON_DEF={
  look(q){ell(q,IC.l,6,6,4.5,4.5);ell(q,'#1e3a4a',6,6,3,3);ell(q,IC.c2,5,5,1.5,1.2);for(let k=0;k<4;k++){R(q,IC.a,9+k,9+k,2,2);}R(q,IC.d,13,13,2,2);},
  photo(q){R(q,IC.l,1,5,14,9);R(q,IC.m,1,12,14,2);R(q,IC.l,4,3,5,2);ell(q,IC.k,8,9,3.5,3.5);ell(q,'#3a6a9a',8,9,2.5,2.5);px(q,IC.c2,7,8);R(q,IC.a,12,6,2,1);},
  ev_photo(q){R(q,IC.w,2,2,12,13);R(q,'#3a5a8a',3,3,10,8);ell(q,IC.a2,10,5,1,1);poly(q,'#2a4a3a',[3,11,6,7,9,10,11,8,13,11]);R(q,IC.l,3,12,10,2);},
  record(q){R(q,IC.l,6,1,5,9);R(q,IC.m,6,1,1,9);for(let k=0;k<4;k++)R(q,IC.d,7,2+k*2,3,1);line(q,IC.m,4,7,4,9);line(q,IC.m,12,7,12,9);line(q,IC.m,5,11,11,11);R(q,IC.m,8,11,1,3);R(q,IC.m,5,14,7,1);ell(q,IC.r,13,3,1.5,1.5);},
  scan(q){for(let r=2;r<=6;r+=2){for(let k=0;k<=12;k++){const a=-Math.PI*.85+k/12*Math.PI*.7;px(q,r===6?IC.c:IC.c2,8+Math.cos(a)*r,10+Math.sin(a)*r);}}R(q,IC.l,6,10,4,5);R(q,IC.c,7,11,2,1);for(let x=1;x<15;x++)px(q,IC.c,x,14-Math.round(Math.abs(Math.sin(x*.9))*2));},
  talk(q){R(q,IC.w,1,2,10,7);poly(q,IC.w,[3,9,6,9,3,12]);R(q,IC.l,6,7,9,6);poly(q,IC.l,[12,13,14,13,14,15]);for(let k=0;k<3;k++)px(q,IC.d,3+k*3,5);for(let k=0;k<3;k++)px(q,IC.d,8+k*2,10);},
  world_A(q){ell(q,'#3a5aa8',8,8,7,7);ell(q,'#5a7ad0',7,7,5,5);glyph(q,'A',7,6,IC.w);R(q,IC.w,6,5,1,1);},
  world_B(q){ell(q,'#9a6a2a',8,8,7,7);ell(q,'#c8903a',7,7,5,5);glyph(q,'B',7,6,'#fff4d8');},
  world_C(q){ell(q,'#1f5f70',8,8,7,7);ell(q,'#2a8f96',7,7,5,5);glyph(q,'C',7,6,IC.c2);line(q,'#0e2a30',3,4,8,9);line(q,'#0e2a30',8,9,6,13);},
  battery(q){R(q,IC.l,1,4,13,8);R(q,IC.k,2,5,11,6);R(q,IC.l,14,6,1,4);for(let k=0;k<3;k++)R(q,IC.g,3+k*3.4,6,3,4);},
  light(q){ell(q,IC.a2,8,6,4.5,4.5);ell(q,IC.a1||'#fff4cc',7,5,2,2);R(q,IC.m,6,10,5,2);R(q,IC.d,6,12,5,2);R(q,IC.m,7,14,3,1);glow(q,8,6,7,'255,217,138',.4);},
  med(q){R(q,IC.w,1,4,14,10);R(q,IC.l,1,12,14,2);R(q,IC.m,5,2,6,2);R(q,IC.r,7,6,2,6);R(q,IC.r,5,8,6,2);},
  stab(q){R(q,IC.l,6,1,4,2);R(q,IC.w,5,3,6,11);R(q,IC.c,6,7,4,6);R(q,IC.c2,6,7,1,6);R(q,IC.l,5,14,6,1);glow(q,8,10,6,'79,200,188',.35);},
  phone(q){R(q,IC.k,4,1,8,14);R(q,'#2a4a7a',5,3,6,9);R(q,IC.c,5,3,6,1);R(q,IC.m,7,13,2,1);for(let k=0;k<3;k++)R(q,IC.c2,6,5+k*2,3+k,1);},
  flashlight(q){poly(q,IC.l,[1,10,8,6,10,9,3,13]);poly(q,IC.m,[2,12,9,8,10,9,3,13]);poly(q,IC.a2,[8,5,11,3,13,8,10,10]);poly(q,'rgba(255,217,138,.5)',[11,3,15,0,15,13,13,8]);},
  magnet(q){for(let k=0;k<=10;k++){const a=Math.PI+k/10*Math.PI;R(q,IC.r,8+Math.cos(a)*5-1,8-Math.sin(a)*5-1,3,3);}R(q,IC.r,2,8,3,5);R(q,IC.r,11,8,3,5);R(q,IC.l,2,12,3,3);R(q,IC.l,11,12,3,3);},
  boundary_meter(q){R(q,IC.l,2,1,12,14);R(q,IC.k,3,2,10,7);for(let k=0;k<=8;k++){const a=Math.PI+k/8*Math.PI;px(q,IC.c2,8+Math.cos(a)*4,8+Math.sin(a)*4);}line(q,IC.r,8,8,11,4);ell(q,IC.c,5,12,1,1);ell(q,IC.c,11,12,1,1);R(q,IC.m,7,11,2,2);},
  hq_recorder(q){R(q,IC.l,1,3,14,11);R(q,IC.k,2,4,12,5);ell(q,IC.d,5,6,1.5,1.5);ell(q,IC.d,11,6,1.5,1.5);for(let k=0;k<6;k++)R(q,k>3?IC.r:IC.g,3+k*2,11,1,2);R(q,IC.m,10,1,1,3);ell(q,IC.r,13,10,1,1);},
  wave_scanner(q){R(q,IC.l,1,5,14,10);R(q,IC.k,2,6,9,7);for(let x=2;x<11;x++)px(q,IC.c2,x,9+Math.round(Math.sin(x*1.3)*2));line(q,IC.m,13,5,15,0);ell(q,IC.r,15,0,1,1);R(q,IC.c,12,7,2,2);R(q,IC.a,12,11,2,2);},
  portable_observer(q){ell(q,IC.l,8,8,6.5,6.5);ell(q,IC.k,8,8,4.5,4.5);ell(q,IC.c,8,8,3,3);ell(q,IC.c2,7,7,1.5,1.5);glow(q,8,8,8,'79,200,188',.35);R(q,IC.m,1,7,2,3);R(q,IC.m,13,7,2,3);},
  anchor(q){ell(q,IC.l,8,3,2,2);ell(q,IC.k,8,3,1,1);R(q,IC.l,7,5,2,9);R(q,IC.l,4,6,8,2);for(let k=0;k<=6;k++){const a=k/6*Math.PI;px(q,IC.c2,8+Math.cos(a)*6,10+Math.sin(a)*4);px(q,IC.c,8+Math.cos(a)*6,11+Math.sin(a)*4);}R(q,IC.c2,1,9,2,2);R(q,IC.c2,13,9,2,2);},
  shiro_link(q){ell(q,'#f4f8fc',8,9,6,5);ell(q,'#ffffff',7,8,4,3);R(q,'#16141e',5,8,1,2);R(q,'#16141e',10,8,1,2);ell(q,'#f4f8fc',5,4,1.5,2);ell(q,'#f4f8fc',11,4,1.5,2);glow(q,8,9,8,'159,240,224',.35);for(let k=0;k<8;k++){const a=k/8*TAU;px(q,IC.c,8+Math.cos(a)*7.4,9+Math.sin(a)*6.4);}},
  testimony(q){R(q,IC.w,1,2,14,9);poly(q,IC.w,[4,11,8,11,4,14]);R(q,IC.d,3,4,2,3);R(q,IC.d,6,4,2,3);for(let k=0;k<3;k++)R(q,IC.m,9,4+k*2,4,1);},
  audio(q){poly(q,IC.l,[1,6,4,6,8,2,8,14,4,10,1,10]);for(let r=3;r<=7;r+=2)for(let k=0;k<=6;k++){const a=-Math.PI/3+k/6*Math.PI*2/3;px(q,IC.c2,8+Math.cos(a)*r,8+Math.sin(a)*r);}},
  map(q){poly(q,IC.l,[1,3,5,1,10,3,15,1,15,13,10,15,5,13,1,15]);R(q,IC.m,5,1,1,12);R(q,IC.m,10,3,1,12);line(q,'#3a6ab0',2,10,14,6);ell(q,IC.r,9,6,2,2);px(q,IC.w,9,5);R(q,IC.r,9,8,1,2);},
  video(q){R(q,IC.k,1,3,14,10);R(q,'#2a2a5a',2,4,12,8);poly(q,IC.w,[6,5,11,8,6,11]);for(let k=0;k<4;k++){px(q,IC.l,2+k*4,2);px(q,IC.l,2+k*4,13);}},
  log(q){R(q,IC.k,1,2,14,12);R(q,IC.m,1,2,14,2);px(q,IC.r,2,2);px(q,IC.a,4,2);px(q,IC.g,6,2);R(q,IC.c2,3,6,1,1);px(q,IC.c2,4,7);R(q,IC.c2,3,8,1,1);R(q,IC.c,6,7,6,1);R(q,IC.c,3,10,9,1);R(q,IC.c,3,12,5,1);},
  item(q){poly(q,'#c89a66',[2,5,8,2,14,5,14,12,8,15,2,12]);poly(q,'#9c7048',[8,8,14,5,14,12,8,15]);poly(q,'#e8c898',[2,5,8,2,14,5,8,8]);R(q,'#704a30',8,8,1,7);},
  person(q){ell(q,IC.l,8,5,3.5,3.5);poly(q,IC.l,[2,15,3,11,6,9,10,9,13,11,14,15]);ell(q,IC.w,7,4,1.5,1.2);},
  article(q){R(q,IC.w,1,2,14,12);R(q,IC.d,2,3,12,2);R(q,IC.m,2,6,6,5);for(let k=0;k<4;k++)R(q,IC.m,9,6+k*2,5,1);R(q,IC.m,2,12,12,1);},
  board(q){R(q,'#8a6a4a',1,2,14,12);R(q,'#b08a60',2,3,12,10);R(q,IC.w,3,4,3,3);R(q,IC.w,10,5,3,3);R(q,IC.w,6,9,3,3);line(q,IC.r,4,5,11,6);line(q,IC.r,11,6,7,10);px(q,IC.r,4,4);px(q,IC.r,11,5);px(q,IC.r,7,9);},
  notebook(q){R(q,'#2a4a7a',3,1,11,14);R(q,'#3a5a8a',4,1,10,14);for(let k=0;k<6;k++)R(q,IC.l,2,2+k*2.3,3,1);R(q,IC.w,7,4,5,3);R(q,IC.a,12,1,1,6);},
  evidence(q){poly(q,'#c8a050',[1,4,6,4,7,3,15,3,15,14,1,14]);R(q,'#e8c070',1,6,14,8);R(q,IC.w,4,7,6,5);R(q,IC.m,11,2,2,5);R(q,IC.l,11,2,2,1);},
  diff(q){R(q,'#3a5aa8',1,2,8,11);R(q,'#c8903a',7,4,8,11);R(q,IC.w,7,4,2,9);glyph(q,'A',3,5,IC.w);glyph(q,'B',11,7,'#fff4d8');},
  people(q){ell(q,IC.m,11,5,2.5,2.5);poly(q,IC.m,[7,14,8,10,11,9,14,10,15,14]);ell(q,IC.l,6,6,3,3);poly(q,IC.l,[1,15,2,11,5,9,8,9,10,11,11,15]);},
  danger(q){poly(q,IC.r,[8,1,15,14,1,14]);poly(q,'#ff7a8a',[8,3,13,13,3,13]);glyph(q,'!',8,6,IC.k);},
  sync(q){for(let k=0;k<=10;k++){const a=-Math.PI*.2+k/10*Math.PI*.9;px(q,IC.c2,8+Math.cos(a)*6,8+Math.sin(a)*6);px(q,IC.c2,8-Math.cos(a)*6,8-Math.sin(a)*6);}poly(q,IC.c2,[1,4,5,4,3,7]);poly(q,IC.c2,[15,12,11,12,13,9]);ell(q,'#f4f8fc',8,8,3,2.5);px(q,'#16141e',7,8);px(q,'#16141e',9,8);},
  b30(q){R(q,'#2a2c44',1,3,14,10);R(q,IC.r,1,3,14,2);glyph(q,'B',2,7,IC.w);glyph(q,'3',6,7,IC.w);glyph(q,'0',10,7,IC.w);},
  save(q){R(q,'#3a5a8a',1,1,14,14);R(q,IC.w,4,1,8,5);R(q,'#3a5a8a',9,2,2,3);R(q,IC.l,3,9,10,6);for(let k=0;k<2;k++)R(q,IC.m,4,11+k*2,8,1);},
  settings(q){for(let k=0;k<8;k++){const a=k/8*TAU;R(q,IC.l,8+Math.cos(a)*5.5-1,8+Math.sin(a)*5.5-1,3,3);}ell(q,IC.l,8,8,5,5);ell(q,IC.k,8,8,2,2);},
  back(q){poly(q,IC.l,[1,8,7,2,7,5,14,5,14,11,7,11,7,14]);R(q,IC.w,7,6,6,1);}
};
const ICON_ALIAS={A:'world_A',B:'world_B',C:'world_C',worldA:'world_A',worldB:'world_B',worldC:'world_C',world_a:'world_A',world_b:'world_B',world_c:'world_C',
  ev_testimony:'testimony',ev_audio:'audio',ev_map:'map',ev_video:'video',ev_log:'log',ev_item:'item',ev_person:'person',ev_article:'article',
  menu_map:'map',notes:'notebook',hand:'talk',record_audio:'record',flash:'flashlight',meter:'boundary_meter',recorder:'hq_recorder',scanner:'wave_scanner',observer:'portable_observer',link:'shiro_link'};
const ICON_NAMES=Object.keys(ICON_DEF);
function icon(name){
  name=String(name||'');let n=ICON_ALIAS[name]||name;
  if(!ICON_DEF[n]){const m=n.replace(/^(act|item|eq|equip|menu|ev)_/,'');if(ICON_DEF[m])n=m;}
  const key=n;if(ICONS.has(key))return ICONS.get(key);
  const out=mk(32,32),o=out.getContext('2d');
  try{
    const im=raster(['icon.'+n]);
    if(im){o.drawImage(im,0,0,32,32);return out;}
    const c=mk(16,16),q=c.getContext('2d');
    if(ICON_DEF[n])ICON_DEF[n](q);
    else{R(q,IC.d,3,3,10,10);R(q,IC.k,4,4,8,8);R(q,IC.m,7,5,2,1);R(q,IC.m,8,6,1,2);R(q,IC.m,7,8,1,1);R(q,IC.m,7,10,1,1);}
    post(q,16,16,{minA:70});
    o.imageSmoothingEnabled=false;o.drawImage(c,0,0,32,32);
  }catch(e){}
  if(ICON_DEF[n])ICONS.set(key,out);
  return out;
}

// ════════════════════════════════════════════════════════════════
//  描画の流れ：静止レイヤー（キャッシュ）→ 揺れもの → 安定度のズレ → 暗さ → 拡大 → 文字 → ハイライト
// ════════════════════════════════════════════════════════════════
const STATIC=new Map();
function stabBucket(v){v=v==null?100:+v;if(!(v>=0))v=100;return v>=70?100:v>=50?70:v>=30?50:v>=10?30:10;}
function getStatic(id,world,o){
  const def=SC[id];const sb=stabBucket(o.stability);
  const extra=def.key?def.key(o)||'':'';
  const key=id+'|'+world+'|'+sb+'|'+extra;
  let e=STATIC.get(key);
  if(e){STATIC.delete(key);STATIC.set(key,e);return e;}
  const c=mk(W,H),g=c.getContext('2d');
  const prev=S;S={txt:[],mk:[],w:world,o,stab:sb};
  let data=null;
  try{data=def.bg(g,world,o)||null;}finally{e={c,txt:S.txt,mk:S.mk,data,sb};S=prev;}
  STATIC.set(key,e);
  while(STATIC.size>60){STATIC.delete(STATIC.keys().next().value);}
  return e;
}
function worldOf(id,world){const def=SC[id];const ws=def.worlds||'A';world=String(world||'A').toUpperCase();return ws.indexOf(world)>=0?{w:world,fb:false}:{w:ws[0],fb:world};}

// 画面への貼り方（cover：はみ出しを切る／contain：全体を入れる）
function layout(cw,ch,fit){const s=fit==='contain'?Math.min(cw/W,ch/H):Math.max(cw/W,ch/H);return {s,ox:(cw-W*s)/2,oy:(ch-H*s)/2,W,H};}
function toCanvas(nx,ny,cw,ch,fit){const L=layout(cw,ch,fit);return {x:L.ox+nx*W*L.s,y:L.oy+ny*H*L.s};}
function toScene(px_,py_,cw,ch,fit){const L=layout(cw,ch,fit);return {x:(px_-L.ox)/(W*L.s),y:(py_-L.oy)/(H*L.s)};}
// 4:3 などに切ったときに見えている範囲（0..1）
function visible(cw,ch,fit){const a=toScene(0,0,cw,ch,fit),b=toScene(cw,ch,cw,ch,fit);return {x0:Math.max(0,a.x),y0:Math.max(0,a.y),x1:Math.min(1,b.x),y1:Math.min(1,b.y)};}

let FR=null,FG2=null,TMP=null;
function frame(){if(!FR){FR=mk(W,H);FG2=FR.getContext('2d');TMP=mk(W,H);}return FG2;}

function drawText(ctx,list,L,o,sb,t){
  for(const T of list){
    let str=T.str;if(sb<100&&T.alt)str=T.alt;if(!str)continue;
    if(T.glitch){str=glitchStr(str,T.glitch,t);}
    const fs=Math.max(4,T.s*L.s);
    ctx.save();
    ctx.globalAlpha=T.a==null?1:T.a;
    const fam=T.f==='m'?FM:T.f==='mono'?FMONO:FG;
    ctx.font=(T.b?'700 ':'400 ')+fs.toFixed(1)+'px '+fam;
    ctx.fillStyle=T.c||'#fff';ctx.textBaseline='top';
    if(T.gl){ctx.shadowColor=T.gl;ctx.shadowBlur=fs*.6;}
    const x=L.ox+T.x*L.s,y=L.oy+T.y*L.s;
    if(T.rot){ctx.translate(x,y);ctx.rotate(T.rot);ctx.translate(-x,-y);}
    if(T.v){ctx.textAlign='center';const step=fs*(T.sp?1+T.sp:1.04);const chars=Array.from(str);for(let i=0;i<chars.length;i++){const ch=chars[i];if(ch==='ー'||ch==='－'){ctx.save();ctx.translate(x,y+i*step+fs/2);ctx.rotate(Math.PI/2);ctx.fillText(ch,0,-fs/2);ctx.restore();}else ctx.fillText(ch,x,y+i*step);}}
    else{ctx.textAlign=T.al||'left';
      if(T.max){const mw=T.max*L.s;const m=ctx.measureText(str).width;if(m>mw){const ax=T.al==='center'?x:T.al==='right'?x:x;ctx.translate(ax,y);ctx.scale(mw/m,1);ctx.fillText(str,0,0);ctx.restore();continue;}}
      ctx.fillText(str,x,y);}
    ctx.restore();
  }
}
const GL_CH='▓▒░#@%&?_＃■□◆ノイズ〓';
function glitchStr(s,amt,t){const a=Array.from(s);const k=(t*12)|0;return a.map((c,i)=>hash(i*31+k,k*7+i)<amt*.7?GL_CH[(hash(i,k)*GL_CH.length)|0]:c).join('');}

// 安定度が下がったときのズレ
function drift(g,id,sb,t){
  if(sb>=100)return;
  const seed=[...id].reduce((a,c)=>a*31+c.charCodeAt(0),7)>>>0;
  const n=sb>=70?1:sb>=50?2:sb>=30?4:7;
  TMP.getContext('2d').clearRect(0,0,W,H);TMP.getContext('2d').drawImage(FR,0,0);
  for(let i=0;i<n;i++){const y=(hash(seed,i)*H)|0,h=2+((hash(seed+1,i)*(sb>=50?3:8))|0);const live=hash(seed+i,(t*1.5)|0)>.35;const off=(hash(seed+2,i)>.5?1:-1)*(sb>=70?1:sb>=50?2:3)*(live?1:.5);
    g.drawImage(TMP,0,y,W,h,Math.round(off),y,W,h);}
  if(sb<=50){g.save();g.globalAlpha=sb<=30?.16:.08;g.globalCompositeOperation='lighter';g.drawImage(TMP,1,0);g.restore();R(g,'rgba(79,200,188,.05)',0,0,W,H);}
  if(sb<=10){for(let i=0;i<20;i++){const y=hash(i,(t*8)|0)*H;R(g,'rgba(200,240,255,.12)',0,y,W,1);}}
}
function tintFallback(g,fb){
  if(fb==='B'){shade(g,'#8a5a2a',.12);}
  else if(fb==='C'){g.save();g.globalCompositeOperation='saturation';R(g,'rgba(80,80,80,.55)',0,0,W,H);g.restore();shade(g,'#061014',.35);}
  else shade(g,'#20304a',.12);
}
function darkness(g,o){
  const d=TMP,q=d.getContext('2d');q.clearRect(0,0,W,H);q.globalCompositeOperation='source-over';q.fillStyle='rgba(2,2,8,.86)';q.fillRect(0,0,W,H);
  q.globalCompositeOperation='destination-out';
  const holes=(o.highlight&&o.highlight.length?o.highlight:[]).map(h=>({x:h.x*W,y:h.y*H,r:Math.max(14,(h.r||.06)*W*1.6)}));
  if(o.flashlight!==false)holes.push({x:(o.light&&o.light.x!=null?o.light.x:.5)*W,y:(o.light&&o.light.y!=null?o.light.y:.58)*H,r:(o.light&&o.light.r||.17)*W});
  for(const h of holes){const gr=q.createRadialGradient(h.x,h.y,0,h.x,h.y,h.r);gr.addColorStop(0,'rgba(0,0,0,.95)');gr.addColorStop(.55,'rgba(0,0,0,.7)');gr.addColorStop(1,'rgba(0,0,0,0)');q.fillStyle=gr;q.beginPath();q.arc(h.x,h.y,h.r,0,TAU);q.fill();}
  q.globalCompositeOperation='source-over';g.drawImage(d,0,0);
}
function placeholder(ctx,id,cw,ch){
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#0c0b1e';ctx.fillRect(0,0,cw,ch);
  ctx.strokeStyle='rgba(79,200,188,.18)';ctx.lineWidth=1;const st=Math.max(12,cw/24);
  for(let x=0;x<cw;x+=st){ctx.beginPath();ctx.moveTo(x+.5,0);ctx.lineTo(x+.5,ch);ctx.stroke();}
  for(let y=0;y<ch;y+=st){ctx.beginPath();ctx.moveTo(0,y+.5);ctx.lineTo(cw,y+.5);ctx.stroke();}
  ctx.fillStyle='rgba(159,240,224,.7)';ctx.font='700 '+Math.max(10,ch*.06)+'px '+FMONO;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('NO SIGNAL',cw/2,ch/2-ch*.04);ctx.font=Math.max(8,ch*.035)+'px '+FMONO;ctx.fillStyle='rgba(159,240,224,.45)';ctx.fillText(String(id||'?'),cw/2,ch/2+ch*.05);
  ctx.restore();
}

// ───────── 生成画像の受け口（assets/kyokai/manifest.json の file） ─────────
const RASTER=new Map();
const SAFE_FILE=/^[A-Za-z0-9_\-./]+\.(png|jpg|jpeg|webp)$/;
function loadRaster(m,base){
  let n=0;((m&&m.assets)||[]).forEach(a=>{
    if(!a||typeof a.id!=='string'||typeof a.file!=='string'||!a.file)return;
    const f=a.file;if(!SAFE_FILE.test(f)||f.indexOf('..')>=0||f.charAt(0)==='/')return;
    try{const im=new Image();im.onload=()=>{RASTER.set(a.id,im);API.rasterCount=RASTER.size;};im.onerror=()=>{};im.src=(base||'')+f;n++;}catch(e){}
  });return n;
}
function loadManifest(){
  try{if(typeof fetch!=='function'||typeof location==='undefined'||!/^https?:$/.test(location.protocol))return;
    fetch('assets/kyokai/manifest.json',{cache:'no-cache'}).then(r=>r&&r.ok?r.json():null).then(m=>{if(m)loadRaster(m,'');}).catch(()=>{});}catch(e){}
}
function raster(ids){for(const id of ids){const im=RASTER.get(id);if(im&&im.complete&&im.naturalWidth>0)return im;}return null;}
function cover(ctx,im,x,y,w,h,fit){const iw=im.naturalWidth,ih=im.naturalHeight;const s=fit==='contain'?Math.min(w/iw,h/ih):Math.max(w/iw,h/ih);const dw=iw*s,dh=ih*s;ctx.drawImage(im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}

function highlights(ctx,L,o,t){
  if(!o.highlight||!o.highlight.length)return;
  ctx.save();
  for(const h of o.highlight){const x=L.ox+h.x*W*L.s,y=L.oy+h.y*H*L.s,r=Math.max(8,(h.r||.04)*W*L.s);const p=.5+.5*Math.sin(t*3+h.x*9);
    const gr=ctx.createRadialGradient(x,y,r*.2,x,y,r*1.4);gr.addColorStop(0,'rgba(159,240,224,0)');gr.addColorStop(.7,`rgba(159,240,224,${.12+.1*p})`);gr.addColorStop(1,'rgba(159,240,224,0)');
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r*1.4,0,TAU);ctx.fill();
    ctx.strokeStyle=`rgba(200,255,245,${.45+.35*p})`;ctx.lineWidth=Math.max(1,L.s*.6);ctx.setLineDash([L.s*3,L.s*2]);ctx.lineDashOffset=-t*L.s*6;ctx.beginPath();ctx.arc(x,y,r*(1+.06*p),0,TAU);ctx.stroke();}
  ctx.restore();
}
function vignette(ctx,cw,ch,a){const g=ctx.createRadialGradient(cw/2,ch/2,Math.min(cw,ch)*.35,cw/2,ch/2,Math.max(cw,ch)*.75);g.addColorStop(0,'rgba(4,3,12,0)');g.addColorStop(1,`rgba(4,3,12,${a})`);ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch);}

function draw(ctx,id,world,t,opts){
  if(!ctx||!ctx.canvas)return;
  const cw=ctx.canvas.width,ch=ctx.canvas.height;t=+t||0;const o=opts||{};
  try{
    ctx.save();ctx.setTransform(1,0,0,1,0,0);
    if(!SC[id]){ctx.restore();placeholder(ctx,id,cw,ch);return;}
    const ww=worldOf(id,world);
    const im=raster(['scene.'+id+'.'+String(world||'A').toUpperCase(),'scene.'+id]);
    if(im&&!o.noRaster){ctx.fillStyle='#06051a';ctx.fillRect(0,0,cw,ch);cover(ctx,im,0,0,cw,ch,o.fit);const L=layout(cw,ch,o.fit);highlights(ctx,L,o,t);ctx.restore();return;}
    const def=SC[id];const e=getStatic(id,ww.w,o);
    const g=frame();g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,W,H);g.drawImage(e.c,0,0);
    const prev=S;S={txt:[],mk:[],w:ww.w,o,stab:e.sb};let dyn;
    try{if(def.fx)def.fx(g,ww.w,t,o,e.data);dyn=S.txt;}finally{S=prev;}
    drift(g,id,e.sb,t);
    if(ww.fb)tintFallback(g,ww.fb);
    if(o.dark)darkness(g,o);
    const L=layout(cw,ch,o.fit);
    ctx.fillStyle='#06051a';ctx.fillRect(0,0,cw,ch);
    ctx.imageSmoothingEnabled=false;ctx.drawImage(FR,0,0,W,H,L.ox,L.oy,W*L.s,H*L.s);
    if(!o.dark){drawText(ctx,e.txt,L,o,e.sb,t);}
    else{ctx.save();ctx.globalAlpha=.25;drawText(ctx,e.txt,L,o,e.sb,t);ctx.restore();}
    drawText(ctx,dyn||[],L,o,e.sb,t);
    if(def.post)def.post(ctx,L,ww.w,t,o,e.data);
    if(o.vignette!==false)vignette(ctx,cw,ch,def.vig==null?.45:def.vig);
    highlights(ctx,L,o,t);
    ctx.restore();
  }catch(err){try{ctx.restore();}catch(e2){}placeholder(ctx,id,cw,ch);if(!API._warned){API._warned=1;try{console.warn('[KY_ART]',id,err&&err.message);}catch(e3){}}}
}
function objects(id,world,opts){
  if(!SC[id])return [];const ww=worldOf(id,world);const e=getStatic(id,ww.w,opts||{});return e.mk.map(m=>Object.assign({},m));
}
function sceneIds(){return Object.keys(SC);}

// ════════════════════════════════════════════════════════════════
const API={
  W,H,
  draw,portrait,icon,
  ids(kind){if(kind==='portrait')return Object.keys(PORTRAITS);if(kind==='icon')return ICON_NAMES.slice();return sceneIds();},
  worlds(id){return SC[id]?(SC[id].worlds||'A').split(''):[];},
  has(id){return !!SC[id];},
  name(id){return SC[id]?SC[id].name:'';},
  faces(who){const p=PORTRAITS[who];return p?p.faces.slice():[];},
  objects,layout,toCanvas,toScene,visible,
  MAP_AREAS,
  palette:P,
  loadRaster,rasterCount:0,hasRaster:id=>RASTER.has(id),
  clearCache(){STATIC.clear();ICONS.clear();PCACHE.clear();},
  _warned:0
};
window.KY_ART=API;
loadManifest();
})();
