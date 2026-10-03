/* ════════════════════════════════════════════════════════════════
   main/presentation.js
   本編の「見せ方」レイヤー（タイトル／オープニング／日替わりカード／エンディング）
   - game.js の関数を「包む」だけで、元の処理は必ず呼ぶ
   - 独自のCSS（#pr-style, .pr-*）とDOMを差し込む
   - prefers-reduced-motion / 効果音音量（AUDIO_SET.se）を尊重
   ════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
if(window.__prPresentation) return;
window.__prPresentation = true;

const $ = id => document.getElementById(id);
const RM = (()=>{ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } })();
const hasGs = () => typeof gs !== 'undefined';
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ───────────────────────── サウンド（効果音のみ・設定音量に従う） ───────────────────────── */
function seVol(){ try{ return typeof AUDIO_SET !== 'undefined' ? AUDIO_SET.se : 1; }catch(e){ return 1; } }
function actx(){ try{ return (typeof AU !== 'undefined' && AU.ctx) ? AU.ctx : null; }catch(e){ return null; } }
function ensureCtx(){ try{ if(typeof AU !== 'undefined' && !AU.ctx) AU.init(); const c = actx(); if(c && c.state === 'suspended') c.resume().catch(()=>{}); }catch(e){} }
function tone(f, dur, type, g, f2, delay){
  const c = actx(); const v = seVol(); if(!c || v <= 0) return;
  try{
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), gn = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if(f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0);
    gn.gain.linearRampToValueAtTime(Math.max(.0012, (g || .05) * v), t0 + .008);
    gn.gain.exponentialRampToValueAtTime(.0008, t0 + dur);
    o.connect(gn); gn.connect(c.destination); o.start(t0); o.stop(t0 + dur + .03);
  }catch(e){}
}
function noise(dur, g, freq, delay){
  const c = actx(); const v = seVol(); if(!c || v <= 0) return;
  try{
    const t0 = c.currentTime + (delay || 0);
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1 - i/len);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain();
    s.buffer = buf; f.type = 'lowpass'; f.frequency.value = freq || 800;
    gn.gain.value = (g || .1) * v;
    s.connect(f); f.connect(gn); gn.connect(c.destination); s.start(t0);
  }catch(e){}
}
const SFX = {
  cursor(){ tone(1180,.045,'square',.022); },
  decide(){ tone(784,.07,'square',.03); tone(1175,.12,'square',.03,null,.06); },
  blip(){ tone(1320,.022,'square',.009); },
  stamp(){ tone(120,.32,'sine',.22,45); noise(.12,.12,500); },
  page(){ tone(660,.06,'triangle',.03); },
  chime(){ [523,784,1046].forEach((f,i)=>tone(f,.5,'triangle',.028,null,i*.07)); },
  gong(){ tone(98,1.4,'sine',.16,92); tone(196,1.1,'triangle',.05,190); noise(.3,.05,300); },
  dread(){ tone(110,1.2,'sawtooth',.05,48); noise(.6,.08,260); },
  glory(){ [392,523,659,784,1046].forEach((f,i)=>tone(f,.9,'triangle',.03,null,i*.11)); },
  clock(){ tone(1568,.08,'square',.025); tone(1568,.08,'square',.025,null,.14); },
};

/* ───────────────────────── ピクセル描画キット ───────────────────────── */
const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
function mk(w,h){ const c = document.createElement('canvas'); c.width = Math.max(1,w|0); c.height = Math.max(1,h|0); return c; }
function rng(seed){ return function(){ seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rgb(h){ h = h.replace('#',''); return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)]; }
// SNES風：ディザ付きの縦グラデーション
function grad(ctx,x,y,w,h,stops){
  w|=0; h|=0; if(w<1||h<1) return;
  const img = ctx.createImageData(w,h), d = img.data, cols = stops.map(rgb), n = cols.length-1;
  for(let j=0;j<h;j++){
    const t = j/Math.max(1,h-1)*n, i = Math.min(n-1, Math.floor(t)), f = t-i;
    for(let k=0;k<w;k++){
      const th = (BAYER[((j+y)&3)*4+((k+x)&3)]+.5)/16, c = f>th ? cols[i+1] : cols[i], p = (j*w+k)*4;
      d[p]=c[0]; d[p+1]=c[1]; d[p+2]=c[2]; d[p+3]=255;
    }
  }
  ctx.putImageData(img,x|0,y|0);
}
function R_(ctx,x,y,w,h,c){ ctx.fillStyle = c; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function P_(ctx,x,y,c){ ctx.fillStyle = c; ctx.fillRect(Math.round(x),Math.round(y),1,1); }
function C_(ctx,cx,cy,r,c){ ctx.fillStyle = c; for(let y=-r;y<=r;y++){ const w = Math.floor(Math.sqrt(r*r-y*y)+.35); ctx.fillRect(Math.round(cx-w),Math.round(cy+y),w*2+1,1); } }
// ディザで半透明っぽく塗る（level 0-16）
function D_(ctx,x,y,w,h,c,level){ ctx.fillStyle = c; for(let j=0;j<h;j++) for(let k=0;k<w;k++){ if(BAYER[((j+y)&3)*4+((k+x)&3)] < level) ctx.fillRect(x+k,y+j,1,1); } }
function glow(ctx,x,y,r,col,a){ const g = ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,col.replace('A',a)); g.addColorStop(1,col.replace('A',0)); ctx.fillStyle = g; ctx.fillRect(x-r,y-r,r*2,r*2); }
// 3x5 ピクセルフォント
const F3 = {'0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001001001001','8':'111101111101111','9':'111101111001111',':':'000010000010000','L':'100100100100111','I':'111010010010111','V':'101101101101010','E':'111100111100111','O':'111101101101111','N':'101111111111101','A':'010101111101101','R':'110101110101101','F':'111100110100100','S':'111100111001111','T':'111010010010010','Y':'101101010010010','D':'110101101101110',' ':'000000000000000','●':'000111111111000'};
function ptext(ctx,s,x,y,c,sc){ sc = sc||1; ctx.fillStyle = c; let cx = x; for(const ch of s){ const g = F3[ch] || F3[' ']; for(let i=0;i<15;i++) if(g[i]==='1') ctx.fillRect(cx+(i%3)*sc, y+Math.floor(i/3)*sc, sc, sc); cx += 4*sc; } }

/* ───────────────────────── 壇ノ浦（海峡）の情景：タイトルと序章で共用 ───────────────────────── */
function buildStrait(w,h,o){
  o = Object.assign({hz:.56, apt:true, city:true, wall:true, flags:false, seed:11, moonX:.8, moonY:.14}, o||{});
  const S = {w,h,o}; const R = rng(o.seed); const m = Math.min(w,h);
  const hy = S.hy = Math.round(h*o.hz);
  const range = S.range = Math.max(3, Math.round(w*.045)); const pad = S.pad = range+2; const LW = S.LW = w+pad*2;
  // 空
  S.sky = mk(w,hy+1); grad(S.sky.getContext('2d'),0,0,w,hy+1,['#03021a','#070524','#0e0932','#1a0f44','#2c1556','#462064','#5f2a6a','#7a346c']);
  S.stars = []; const ns = Math.round(w*hy/240);
  for(let i=0;i<ns;i++) S.stars.push({x:R()*w|0, y:R()*hy*.72|0, p:R()*7, big:R()<.08});
  S.moon = {x:Math.round(w*o.moonX), y:Math.max(6,Math.round(hy*o.moonY)), r:Math.max(4,Math.round(m*.045))};
  S.clouds = []; for(let i=0;i<6;i++) S.clouds.push({x:R()*w*1.4, y:Math.round(hy*(.1+R()*.62)), w:Math.round(w*(.22+R()*.3)), h:Math.max(1,Math.round(m*(.008+R()*.012))), v:.4+R()*1.1});
  // 対岸の山並み
  const hl = S.hills = mk(LW,hy+1), hc = hl.getContext('2d'); S.hlights = [];
  for(let x=0;x<LW;x++){
    const y1 = hy - m*.05*(.55+.45*Math.sin(x*.031+1.3)+.25*Math.sin(x*.093+.4));
    R_(hc,x,y1,1,hy-y1+1,'#1b1342');
    const y2 = hy - m*.026*(.5+.5*Math.sin(x*.057+2.1)+.3*Math.sin(x*.17));
    R_(hc,x,y2,1,hy-y2+1,'#110b2c');
    if(R()<.22){ const ly = hy-1-Math.floor(R()*m*.016); const c = R()<.7?'#ffcf7a':'#9fe8ff'; P_(hc,x,ly,c); if(R()<.3) S.hlights.push({x,c}); }
  }
  // 関門橋
  const br = S.br = mk(LW,hy+2), bc = br.getContext('2d');
  const deck = S.deck = hy - Math.max(3, Math.round(m*.045));
  const th = Math.max(12, Math.round(m*.2)), top = deck - th;
  const t1 = Math.round(LW*.22), t2 = Math.round(LW*.78), mid = (t1+t2)/2, half = (t2-t1)/2;
  const cab = x => {
    if(x>=t1 && x<=t2){ const u=(x-mid)/half; return top+1 + (deck-3-(top+1))*(1-u*u); }
    if(x<t1){ const u=x/t1; return deck-1 - (deck-2-top)*u*u; }
    const u=(LW-x)/(LW-t2); return deck-1 - (deck-2-top)*u*u;
  };
  for(let x=0;x<LW;x++){ const y = cab(x); if(x%3===0) R_(bc,x,y,1,deck-y,'#251c48'); }
  for(let x=0;x<LW;x++){ P_(bc,x,cab(x),'#6c5ca8'); }
  R_(bc,0,deck,LW,2,'#2f2558'); R_(bc,0,deck+2,LW,1,'#191335');
  const lw = Math.max(1, Math.round(m*.011));
  [t1,t2].forEach(t=>{
    R_(bc,t-2-lw,top,lw,hy-top+1,'#3d3070'); R_(bc,t+2,top,lw,hy-top+1,'#3d3070');
    R_(bc,t-2-lw,top,lw*2+4,1,'#4a3c84'); R_(bc,t-2,top+Math.round(th*.45),4,1,'#3d3070'); R_(bc,t-2,deck+3,4,1,'#3d3070');
  });
  S.towers = [t1,t2]; S.ttop = top; S.blights = [];
  for(let x=1;x<LW;x+=3){ P_(bc,x,deck,'#ffd27a'); if(x%12===1) S.blights.push(x); }
  for(let x=t1+3;x<t2-2;x+=5) P_(bc,x,cab(x),'#c8fbff');
  // 海
  S.sea = mk(w,h-hy); grad(S.sea.getContext('2d'),0,0,w,h-hy,['#1a1040','#110a34','#0b0726','#07051a','#04030f']);
  S.waves = []; const nw = Math.round(w*(h-hy)/70);
  for(let i=0;i<nw;i++){ const y = hy+2+Math.floor(Math.pow(R(),1.3)*(h-hy-2)); S.waves.push({x:R()*w, y, l:1+Math.round(R()*(2+(y-hy)/(h-hy)*5)), v:(.8+R())*(R()<.5?-1:1)}); }
  S.flags = [];
  if(o.flags) for(let i=0;i<5;i++) S.flags.push({x:w*(.18+R()*.64), y:hy+3+R()*(h-hy)*.55, p:R()*6, s:.2+R()*.4});
  // 手前の街（左）
  S.neon = [];
  if(o.city){
    const cc = (S.city = mk(LW,h)).getContext('2d'); let x = 0; const maxX = LW*.3;
    while(x<maxX){
      const bw = 4+Math.floor(R()*9); const bh = Math.round(h*(.07+R()*.16)*(1.2-x/maxX*.6)); const tp = h-bh;
      const sh = ['#0a0720','#0c0924','#0e0a28'][Math.floor(R()*3)];
      R_(cc,x,tp,bw,bh,sh); R_(cc,x,tp,1,bh,'#171232');
      for(let wy=tp+2; wy<h-2; wy+=3) for(let wx=x+1; wx<x+bw-1; wx+=2){ const r = R(); if(r<.16) P_(cc,wx,wy,['#ffd27a','#ffe8b0','#8fe6ff','#ffb46a'][Math.floor(R()*4)]); else if(r<.4) P_(cc,wx,wy,'#16122e'); }
      if(R()<.35 && bh>8) S.neon.push({x:x+1+Math.floor(R()*Math.max(1,bw-3)), y:tp+2+Math.floor(R()*bh*.25), w:R()<.5?1:2, h:3+Math.floor(R()*5), c:['#ff4fa8','#38f0e0','#ffcc4a','#b06cff'][Math.floor(R()*4)], p:R()*10});
      if(R()<.3){ R_(cc,x+Math.floor(bw/2),tp-3,1,3,'#1a1436'); S.neon.push({x:x+Math.floor(bw/2), y:tp-4, w:1, h:1, c:'#ff3048', p:R()*10, blink:true}); }
      x += bw + (R()<.25?1:0);
    }
  }
  // 手前のアパート（右）：ひとつだけ灯る窓
  if(o.apt){
    const ac = (S.apt = mk(LW,h)).getContext('2d');
    const aw = Math.max(16, Math.round(w*.25)), ax = LW-pad-aw+Math.round(aw*.22), at = Math.round(h*o.aptTop || h*.4);
    R_(ac,ax,at,aw+pad,h-at,'#06041a'); R_(ac,ax,at,1,h-at,'#16112e'); R_(ac,ax-1,at-1,aw+pad+1,1,'#1e1838');
    R_(ac,ax+3,at-4,5,3,'#0a0720'); // 給水塔
    S.aptLight = {x:ax+5, y:at-5};
    const fh = Math.max(4, Math.round(m*.034));
    let best = null;
    for(let fy=at+3, fl=0; fy<h-fh; fy+=fh, fl++){
      R_(ac,ax+1,fy+fh-1,aw+pad,1,'#120d28');
      for(let wx=ax+3; wx<ax+aw+pad-2; wx+=4){
        P_(ac,wx,fy,'#0e0b24'); P_(ac,wx+1,fy,'#0e0b24'); P_(ac,wx,fy+1,'#0e0b24'); P_(ac,wx+1,fy+1,'#0e0b24');
        if(!best && fy>h*.52 && wx>ax+6 && wx<LW-pad-4) best = {x:wx, y:fy};
      }
    }
    S.win = best || {x:ax+7, y:Math.round(h*.6)};
    R_(ac,S.win.x-1,S.win.y-1,4,4,'#06041a');
  }
  // 岸壁と街灯
  S.lamps = [];
  if(o.wall){
    const wc = (S.wall = mk(LW,h)).getContext('2d'); const wy = S.wy = Math.round(h*.92);
    R_(wc,0,wy,LW,h-wy,'#05030f'); R_(wc,0,wy,LW,1,'#1d1838');
    for(let x=0;x<LW;x+=2) P_(wc,x,wy-2,'#141030'); R_(wc,0,wy-3,LW,1,'#1a1436');
    const step = Math.max(24, Math.round(w*.3)); const lh = Math.max(7, Math.round(m*.07));
    for(let x=Math.round(step*.4); x<LW; x+=step){ R_(wc,x,wy-lh,1,lh,'#1e1838'); R_(wc,x-1,wy-lh-1,3,1,'#2a2448'); S.lamps.push({x, y:wy-lh}); }
  }
  // 雨
  S.drops = []; const nd = Math.round(w*h/170);
  for(let i=0;i<nd;i++) S.drops.push({x:R()*w, y:R()*h, v:2.2+R()*2.4, l:2+Math.floor(R()*4), z:R()});
  S.rip = [];
  S.flash = 0; S.nextBolt = 9 + R()*12;
  return S;
}
function drawStrait(ctx,S,t,cx){
  const {w,h,hy,pad} = S;
  cx = cx || 0;
  ctx.drawImage(S.sky,0,0);
  // 星
  for(const s of S.stars){ const a = .35+.65*Math.max(0,Math.sin(t*1.7+s.p)); if(a<.45) continue; P_(ctx,s.x,s.y, a>.9?'#ffffff':'#b8aee8'); if(s.big && a>.85){ P_(ctx,s.x-1,s.y,'#8a80c8'); P_(ctx,s.x+1,s.y,'#8a80c8'); P_(ctx,s.x,s.y-1,'#8a80c8'); P_(ctx,s.x,s.y+1,'#8a80c8'); } }
  // 月
  const mo = S.moon, mx = Math.round(mo.x - cx*.06);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx,mx,mo.y,mo.r*4.2,'rgba(150,130,255,A)',.22); ctx.restore();
  C_(ctx,mx,mo.y,mo.r,'#f4ecd8'); C_(ctx,mx-1,mo.y,mo.r-1,'#fff8e8'); C_(ctx,mx+Math.ceil(mo.r*.55),mo.y-Math.ceil(mo.r*.3),mo.r,'#1a1046');
  // 雲
  for(const c of S.clouds){ const x = ((c.x + t*c.v - cx*.1) % (S.w*1.4) + S.w*1.4) % (S.w*1.4) - S.w*.3; D_(ctx,Math.round(x),c.y,c.w,c.h,'#2a1a56',9); D_(ctx,Math.round(x)+3,c.y-1,Math.round(c.w*.6),1,'#3a2466',6); }
  // 山・橋
  ctx.drawImage(S.hills, Math.round(-pad + cx*.15), 0);
  const bx = Math.round(-pad + cx*.3);
  ctx.drawImage(S.br, bx, 0);
  const blink = Math.sin(t*3.2) > .1;
  if(blink) S.towers.forEach(x=>{ P_(ctx,x+bx-1,S.ttop-1,'#ff3048'); ctx.save(); ctx.globalCompositeOperation='lighter'; glow(ctx,x+bx,S.ttop-1,4,'rgba(255,40,70,A)',.5); ctx.restore(); });
  // 海
  ctx.drawImage(S.sea,0,hy+1);
  for(const wv of S.waves){ const x = ((wv.x + t*wv.v*3) % w + w) % w; const near = (wv.y-hy)/(h-hy); ctx.fillStyle = near>.5 ? 'rgba(90,80,170,.55)' : 'rgba(110,100,190,.4)'; ctx.fillRect(Math.round(x),wv.y,wv.l,1); }
  // 反射（月・橋・対岸の灯）
  const fr = Math.floor(t*7);
  const refl = (x, len, col, wid) => { for(let y=hy+2; y<Math.min(h,hy+2+len); y+=2){ const hsh = Math.sin(y*12.9898 + fr*78.233)*43758.5453; const r = hsh - Math.floor(hsh); if(r < .35) continue; const dx = Math.round(Math.sin(y*.6 + t*2.6)*1.6); ctx.fillStyle = col; ctx.fillRect(Math.round(x+dx-(wid>1&&r>.7?1:0)), y, wid>1&&r>.7?wid+1:wid, 1); } };
  refl(mx, (h-hy)*.9, 'rgba(255,240,200,.55)', 2);
  for(const x of S.blights){ const sx = x+bx; if(sx<0||sx>w) continue; refl(sx, (h-hy)*.35, 'rgba(255,200,110,.35)', 1); }
  for(const l of S.hlights){ const sx = l.x + Math.round(-pad + cx*.15); if(sx<0||sx>w) continue; refl(sx, (h-hy)*.18, l.c==='#9fe8ff'?'rgba(140,230,255,.3)':'rgba(255,200,120,.3)', 1); }
  // 平家の赤旗（序章のみ）
  for(const f of S.flags){ const y = f.y + Math.sin(t*1.3+f.p)*1.2 + t*f.s*.6; if(y>h) continue; const x = Math.round(f.x + Math.sin(t*.7+f.p)*2 - cx*.4); R_(ctx,x,y-4,1,5,'#5a4a3a'); R_(ctx,x+1,y-4,3,2,'#c8203a'); P_(ctx,x+1,y-2,'#8a1428'); D_(ctx,x-1,Math.round(y)+1,4,1,'rgba(200,40,60,.6)',8); }
  // 雨の波紋
  if(!RM && Math.random()<.5) S.rip.push({x:Math.random()*w, y:hy+3+Math.random()*(h-hy-3), a:0});
  for(let i=S.rip.length-1;i>=0;i--){ const r = S.rip[i]; r.a += .08; if(r.a>1){ S.rip.splice(i,1); continue; } const s = Math.round(r.a*3); ctx.fillStyle = `rgba(160,150,240,${.45*(1-r.a)})`; ctx.fillRect(Math.round(r.x-s),Math.round(r.y),1,1); ctx.fillRect(Math.round(r.x+s),Math.round(r.y),1,1); }
  // 手前の街
  if(S.city){
    const cxo = Math.round(-pad + cx*.6); ctx.drawImage(S.city, cxo, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for(const n of S.neon){ const on = n.blink ? Math.sin(t*2.6+n.p)>.2 : (Math.sin(t*9+n.p*3)>-.92 || Math.random()<.5); if(!on) continue; ctx.fillStyle = n.c; ctx.fillRect(n.x+cxo,n.y,n.w,n.h); glow(ctx,n.x+cxo+n.w/2,n.y+n.h/2,n.blink?3:6,hexA(n.c),.35); }
    ctx.restore();
  }
  // アパートと灯る窓
  if(S.apt){
    const ao = Math.round(-pad + cx); ctx.drawImage(S.apt, ao, 0);
    const wx = S.win.x+ao, wy = S.win.y; const flick = .85 + .15*Math.sin(t*5.3) + (Math.random()<.04 ? -.2 : 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(ctx,wx+1,wy+1,9,'rgba(255,180,90,A)',.32*flick); glow(ctx,wx+1,wy+1,3.5,'rgba(255,210,140,A)',.6*flick); ctx.restore();
    R_(ctx,wx,wy,3,3,'#ffcf7a'); P_(ctx,wx+2,wy,'#ffe9b8'); P_(ctx,wx+1,wy+2, Math.sin(t*7)>0 ? '#7fd8ff' : '#a8e8ff'); P_(ctx,wx,wy+1,'#3a2440');
    if(Math.sin(t*2.2)>0){ P_(ctx,S.aptLight.x+ao,S.aptLight.y,'#ff3048'); }
  }
  // 岸壁
  if(S.wall){
    const wo = Math.round(-pad + cx*1.1); ctx.drawImage(S.wall, wo, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for(const l of S.lamps){ const x = l.x+wo; glow(ctx,x,l.y,10,'rgba(255,190,110,A)',.28); glow(ctx,x,S.wy,8,'rgba(255,190,110,A)',.14); }
    ctx.restore();
    for(const l of S.lamps) R_(ctx,l.x+wo-1,l.y,3,1,'#ffe0a0');
  }
  // 雨
  for(const d of S.drops){
    if(!RM){ d.y += d.v*(.7+d.z*.6); d.x -= d.v*.18; if(d.y>h){ d.y = -d.l; d.x = Math.random()*(w+20); } if(d.x<-2) d.x += w+4; }
    ctx.fillStyle = d.z>.6 ? 'rgba(200,190,255,.42)' : 'rgba(150,140,230,.26)';
    ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, d.l); if(d.z>.75) ctx.fillRect(Math.round(d.x)-1, Math.round(d.y)+d.l, 1, 1);
  }
  // 稲光
  if(!RM){
    if(t > S.nextBolt){ S.flash = 1; S.nextBolt = t + 14 + Math.random()*16; }
    if(S.flash>0){ ctx.fillStyle = `rgba(200,190,255,${(S.flash>.8?.35:.12*S.flash)})`; ctx.fillRect(0,0,w,hy); S.flash -= .06; }
  }
}
function hexA(hx){ const c = rgb(hx); return `rgba(${c[0]},${c[1]},${c[2]},A)`; }

/* ───────────────────────── 序章の各場面（256x160） ───────────────────────── */
const OW = 256, OH = 160;
function buildFactory(){
  const S = {}; const R = rng(3);
  const c = (S.bg = mk(OW,OH)).getContext('2d');
  grad(c,0,0,OW,112,['#120a34','#2a1250','#5a1e5e','#9a325e','#d8525a','#f08a4a','#ffbe62']);
  // 夕日（レトロな縞）
  for(let y=-20;y<=20;y++){ const yy = 104+y; if(yy>111) break; if(y>4 && (y%4===0 || y%4===1 && y>10)) continue; const wv = Math.floor(Math.sqrt(400-y*y)); R_(c,184-wv,yy,wv*2+1,1, y<-8?'#ffe08a':y<2?'#ffc66a':'#ff9a5a'); }
  for(let x=0;x<OW;x++){ const y = 100 - 6*(.5+.5*Math.sin(x*.05)) - 3*Math.sin(x*.13); R_(c,x,y,1,112-y,'#5a2050'); }
  // 工場群
  const F = '#1a0b26';
  R_(c,10,80,190,32,F);
  for(let x=10;x<200;x+=12){ for(let k=0;k<12;k++) R_(c,x+k,80-Math.floor(k/2),1,Math.floor(k/2)+1,F); }
  [[58,34,6],[74,44,5],[152,28,7]].forEach(([x,y,w])=>{ R_(c,x,y,w,80-y,F); R_(c,x,y+4,w,1,'#3a1a3c'); R_(c,x,y+12,w,1,'#3a1a3c'); });
  S.chim = [[61,33],[76,43],[155,27]];
  C_(c,220,98,12,F); R_(c,206,100,28,12,F); P_(c,214,90,'#3a1a3c');
  R_(c,236,40,2,72,F); R_(c,214,40,40,2,F); R_(c,250,42,1,24,'#2a1434'); // クレーン
  R_(c,0,95,10,17,F); R_(c,200,92,6,20,F);
  for(let x=14;x<198;x+=5) for(let y=86;y<108;y+=6) if(R()<.4) R_(c,x,y,2,2,R()<.8?'#ffb85a':'#ffe09a');
  R_(c,0,104,256,1,'#2a1430');
  // 地面
  grad(c,0,112,OW,48,['#1a0a20','#120818','#0a0510']);
  R_(c,0,128,OW,1,'#24122e'); for(let x=0;x<OW;x+=14) R_(c,x,140,8,1,'#2a1a34');
  // フェンス
  for(let x=0;x<OW;x+=6){ R_(c,x,118,1,12,'#0a0410'); } R_(c,0,118,OW,1,'#0a0410'); R_(c,0,123,OW,1,'#0a0410');
  // 街灯
  [[34,96],[130,96]].forEach(([x,y])=>{ R_(c,x,y,1,32,'#0a0410'); R_(c,x,y,5,1,'#0a0410'); });
  S.lamps = [[38,97],[134,97]];
  // だんのうら（作業着とヘルメット）
  const px = 112, py = 132;
  R_(c,px+1,py-16,5,4,'#d8d0e8'); R_(c,px,py-13,7,1,'#d8d0e8'); // ヘルメット
  R_(c,px+2,py-12,3,3,'#120818'); R_(c,px+1,py-9,5,9,'#120818'); R_(c,px,py-8,1,6,'#120818'); R_(c,px+6,py-8,1,5,'#120818');
  R_(c,px+7,py-4,3,3,'#2a1838'); // 弁当袋
  R_(c,px+1,py,2,6,'#120818'); R_(c,px+4,py,2,6,'#120818'); R_(c,px,py+6,8,1,'#05020a');
  S.smoke = []; S.birds = [{x:-10,y:30,v:.35},{x:-24,y:36,v:.32},{x:-17,y:26,v:.33}];
  S.sparks = [];
  return S;
}
function drawFactory(ctx,S,t){
  ctx.drawImage(S.bg,0,0);
  // 煙
  if(Math.random()<.25){ const ch = S.chim[Math.floor(Math.random()*3)]; S.smoke.push({x:ch[0]+2,y:ch[1],r:2,a:.7}); }
  for(let i=S.smoke.length-1;i>=0;i--){ const s = S.smoke[i]; s.x += .25; s.y -= .18; s.r += .045; s.a -= .0045; if(s.a<=0){ S.smoke.splice(i,1); continue; } ctx.globalAlpha = s.a*.55; C_(ctx,s.x,s.y,Math.round(s.r),'#6a4a7a'); C_(ctx,s.x-1,s.y-1,Math.max(1,Math.round(s.r)-2),'#8a6a8a'); ctx.globalAlpha = 1; }
  S.chim.forEach(([x,y],i)=>{ if(Math.sin(t*2.5+i)>0) P_(ctx,x+2,y-1,'#ff3048'); });
  // 溶接の火花
  if(Math.sin(t*1.7)>.3){ ctx.save(); ctx.globalCompositeOperation='lighter'; glow(ctx,96,102,7,'rgba(140,220,255,A)',.6+.3*Math.random()); ctx.restore(); for(let i=0;i<2;i++) S.sparks.push({x:96,y:102,vx:(Math.random()-.5)*1.6,vy:-Math.random()*1.4,l:20}); }
  for(let i=S.sparks.length-1;i>=0;i--){ const s = S.sparks[i]; s.x+=s.vx; s.y+=s.vy; s.vy+=.12; if(--s.l<=0){ S.sparks.splice(i,1); continue; } P_(ctx,s.x,s.y, s.l>12?'#fff4c0':'#ffb040'); }
  // 鳥
  for(const b of S.birds){ b.x += b.v; if(b.x>OW+10) b.x = -20; const f = Math.sin(t*8+b.y)>0; const x = Math.round(b.x), y = Math.round(b.y + Math.sin(t+b.y)*1.5); P_(ctx,x,y,'#1a0a26'); P_(ctx,x-1,y-(f?1:0),'#1a0a26'); P_(ctx,x+1,y-(f?1:0),'#1a0a26'); P_(ctx,x-2,y-(f?2:0),'#1a0a26'); P_(ctx,x+2,y-(f?2:0),'#1a0a26'); }
  ctx.save(); ctx.globalCompositeOperation='lighter'; S.lamps.forEach(([x,y])=>{ glow(ctx,x,y+1,16,'rgba(255,170,80,A)',.25); }); ctx.restore();
  S.lamps.forEach(([x,y])=>R_(ctx,x-1,y,3,1,'#ffe0a0'));
}
function buildChild(){
  const S = {}; const R = rng(5);
  const c = (S.bg = mk(OW,OH)).getContext('2d');
  grad(c,0,0,OW,112,['#0a0a24','#0e0e2e','#121234','#16143a']);
  grad(c,0,112,OW,48,['#120e28','#0e0a20','#0a0718']);
  for(let x=0;x<OW;x+=32) R_(c,x,112,1,48,'#1a1534'); R_(c,0,112,OW,1,'#24203e'); R_(c,0,136,OW,1,'#17122c');
  // 窓
  R_(c,168,18,72,74,'#2a2650'); R_(c,171,21,66,68,'#070720'); R_(c,203,21,2,68,'#2a2650'); R_(c,171,54,66,2,'#2a2650');
  for(let i=0;i<40;i++){ const x = 172+Math.floor(R()*64), y = 60+Math.floor(R()*28); if(x>202&&x<206) continue; P_(c,x,y,['#ffd27a','#8fe6ff','#ff6fb8','#ffe8b0'][Math.floor(R()*4)]); }
  for(let x=172;x<237;x++){ const y = 80 - Math.floor(4*Math.abs(Math.sin(x*.21))) - (x%9===0?6:0); if(x>202&&x<206) continue; R_(c,x,y,1,89-y,'#0c0a26'); }
  // カーテン
  for(let x=160;x<174;x++) R_(c,x,14,1,84,(x%3===0)?'#22163e':'#2e1e50'); R_(c,156,12,90,3,'#1a1432');
  // 子どもの絵
  R_(c,84,30,30,22,'#e6dcc4'); R_(c,84,30,30,1,'#c8bea8');
  C_(c,108,36,3,'#ffb030'); R_(c,90,46,2,5,'#4a6ad8'); C_(c,91,44,2,'#e8907a'); R_(c,98,47,2,4,'#e84a6a'); C_(c,99,45,1,'#e8907a'); R_(c,86,51,26,1,'#5aa85a');
  P_(c,99,30,'#d84a4a'); P_(c,98,29,'#d84a4a');
  // 布団
  R_(c,34,112,124,24,'#9c96cc'); R_(c,34,112,124,2,'#c8c2e8'); R_(c,34,134,124,2,'#6e68a0');
  R_(c,40,100,26,12,'#e8e4f8'); R_(c,40,110,26,2,'#bcb6dc');
  // くまのぬいぐるみ
  C_(c,28,108,6,'#8a6248'); C_(c,24,102,2,'#8a6248'); C_(c,32,102,2,'#8a6248'); C_(c,28,110,2,'#b08a6a'); P_(c,26,107,'#1a1010'); P_(c,30,107,'#1a1010');
  // ナイトライト
  R_(c,184,118,8,10,'#e8d0a0'); R_(c,183,128,10,2,'#5a4a3a');
  S.zz = [];
  return S;
}
function drawChild(ctx,S,t){
  ctx.drawImage(S.bg,0,0);
  // 月明かり
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(120,140,255,.07)'; ctx.beginPath(); ctx.moveTo(171,89); ctx.lineTo(237,89); ctx.lineTo(200,160); ctx.lineTo(96,160); ctx.closePath(); ctx.fill(); ctx.restore();
  // 窓の雨
  for(let i=0;i<14;i++){ const x = 172+((i*37+Math.floor(t*30)*7)%64), y = 21+((i*53+Math.floor(t*90))%62); if(x>202&&x<206) continue; R_(ctx,x,y,1,3,'rgba(160,170,255,.5)'); }
  // 掛け布団（寝息で上下）
  const br = Math.round(Math.sin(t*1.5)*1.2);
  ctx.fillStyle = '#5a4c9c'; ctx.beginPath(); ctx.moveTo(60,136); ctx.lineTo(60,112); ctx.quadraticCurveTo(100,100-br*2,150,110); ctx.lineTo(154,136); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6e60b4'; ctx.beginPath(); ctx.moveTo(60,113); ctx.quadraticCurveTo(100,101-br*2,150,111); ctx.lineTo(150,114); ctx.quadraticCurveTo(100,105-br*2,60,117); ctx.closePath(); ctx.fill();
  [[80,122],[100,118],[122,126],[138,119],[92,130],[112,131]].forEach(([x,y])=>{ P_(ctx,x,y-br,'#a898e8'); P_(ctx,x+1,y-br,'#8a7ad0'); });
  // 子どもの寝顔
  C_(ctx,54,106,7,'#2a2040'); R_(ctx,50,104,9,7,'#f2c8b0'); R_(ctx,50,103,10,2,'#2a2040'); R_(ctx,51,107,2,1,'#5a3a4a'); R_(ctx,56,107,2,1,'#5a3a4a'); P_(ctx,53,110,'#d89a8a'); P_(ctx,50,109,'#f2a8a0'); P_(ctx,58,109,'#f2a8a0');
  R_(ctx,58,110,6,4,'#f2c8b0');
  // ナイトライトの灯り
  const pl = .75+.25*Math.sin(t*1.1);
  ctx.save(); ctx.globalCompositeOperation='lighter'; glow(ctx,188,122,40,'rgba(255,170,90,A)',.22*pl); glow(ctx,188,122,10,'rgba(255,220,160,A)',.6*pl); ctx.restore();
  // zzz
  if(Math.random()<.012 && S.zz.length<3) S.zz.push({x:62,y:98,a:1});
  for(let i=S.zz.length-1;i>=0;i--){ const z = S.zz[i]; z.y -= .12; z.x += .06+Math.sin(t*2+i)*.05; z.a -= .004; if(z.a<=0){ S.zz.splice(i,1); continue; } ctx.globalAlpha = z.a; const x = Math.round(z.x), y = Math.round(z.y); R_(ctx,x,y,3,1,'#c8c0ff'); P_(ctx,x+1,y+1,'#c8c0ff'); R_(ctx,x,y+2,3,1,'#c8c0ff'); ctx.globalAlpha = 1; }
}
function buildDesk(){
  const S = {};
  const c = (S.bg = mk(OW,OH)).getContext('2d');
  grad(c,0,0,OW,112,['#07061a','#0a0820','#0d0a26','#100c2a']);
  // 窓（雨）
  R_(c,12,10,52,50,'#1a1636'); R_(c,14,12,48,46,'#05051a');
  for(let i=0;i<14;i++) P_(c,16+((i*29)%44),40+((i*13)%16),['#ffd27a','#8fe6ff','#ff6fb8'][i%3]);
  // 棚と配信グッズ
  R_(c,150,14,90,2,'#1e1838'); R_(c,156,6,8,8,'#2a2050'); R_(c,168,8,14,6,'#3a2a5a'); R_(c,190,4,6,10,'#4a2a5a'); C_(c,214,10,3,'#5a3a7a');
  // 机
  R_(c,0,112,OW,48,'#22182e'); R_(c,0,112,OW,2,'#4a3460'); R_(c,0,114,OW,1,'#2e2040');
  for(let x=0;x<OW;x+=40) R_(c,x+8,120,20,1,'#281c34');
  // モニター
  R_(c,126,36,104,68,'#14102a'); R_(c,129,39,98,62,'#0a1030'); R_(c,174,104,8,8,'#14102a'); R_(c,162,110,32,3,'#1a1432');
  // マイク（ショックマウント付き）
  R_(c,79,74,2,36,'#2a2440'); R_(c,68,108,24,4,'#1e1a30'); R_(c,70,107,20,1,'#3a3454');
  R_(c,66,50,28,2,'#1a1830'); R_(c,66,66,28,2,'#1a1830'); R_(c,66,50,2,18,'#1a1830'); R_(c,92,50,2,18,'#1a1830');
  C_(c,80,43,9,'#8a8aa8'); R_(c,71,43,19,14,'#8a8aa8');
  for(let y=35;y<56;y+=2) for(let x=72;x<89;x+=2){ if(y<43 && (x-80)**2+(y-43)**2>70) continue; P_(c,x+(y%4?1:0),y,'#5a5a78'); }
  R_(c,73,40,2,15,'#d8d8f0'); R_(c,70,56,21,3,'#c8c8e0'); R_(c,71,59,19,16,'#3a3854'); R_(c,72,60,2,14,'#5a5878');
  // ポップガード
  for(let x=56;x<67;x+=2) P_(c,x,60+Math.round((x-56)*.2),'#2a2440');
  C_(c,50,50,12,'#1a1828'); C_(c,50,50,10,'#0c0a1a'); for(let y=41;y<60;y+=2) for(let x=41;x<60;x+=2) if((x-50)**2+(y-50)**2<90) P_(c,x,y,'#1e1a32');
  // 請求書の束
  R_(c,10,104,40,9,'#cfc6e0'); R_(c,12,101,36,4,'#e4dcf0'); for(let x=14;x<46;x+=4) R_(c,x,106,2,1,'#8a809a'); R_(c,40,102,6,2,'#d84a5a');
  // マグカップ
  R_(c,206,98,12,14,'#c84a6a'); R_(c,218,101,3,7,'#c84a6a'); R_(c,207,98,10,2,'#2a1410');
  // 時計
  R_(c,104,96,30,14,'#0e0c18'); R_(c,105,97,28,12,'#18141e');
  // ON AIR ランプ
  R_(c,22,70,40,14,'#141022');
  S.live = false; S.clock = '21:59';
  return S;
}
function drawDesk(ctx,S,t){
  ctx.drawImage(S.bg,0,0);
  for(let i=0;i<10;i++){ const x = 15+((i*31+Math.floor(t*25)*5)%46), y = 13+((i*47+Math.floor(t*80))%40); R_(ctx,x,y,1,3,'rgba(160,170,255,.45)'); }
  // モニター画面
  const mx = 129, my = 39;
  if(S.live){
    R_(ctx,mx,my,98,62,'#10183e');
    R_(ctx,mx+4,my+4,58,40,'#1c1848'); C_(ctx,mx+33,my+22,8,'#3a2a6a'); R_(ctx,mx+25,my+30,16,10,'#3a2a6a');
    R_(ctx,mx+4,my+4,20,7,'#e8304a'); ptext(ctx,'LIVE',mx+6,my+5,'#fff');
    for(let i=0;i<6;i++){ const y = my+6+i*8 - (Math.floor(t*6)%8); if(y<my+3||y>my+56) continue; R_(ctx,mx+66,y,6,2,['#38f0e0','#ff6fb8','#ffd27a'][i%3]); R_(ctx,mx+74,y,10+((i*7)%14),2,'#8a84b8'); }
    for(let i=0;i<14;i++){ const h = 2+Math.round(Math.abs(Math.sin(t*9+i*.9))*8); R_(ctx,mx+6+i*4,my+56-h,2,h,'#38f0e0'); }
  } else {
    R_(ctx,mx,my,98,62,'#0a1030'); ptext(ctx,'OFFLINE',mx+35,my+28,Math.sin(t*3)>0?'#5a6aa8':'#3a4a88');
  }
  ctx.save(); ctx.globalCompositeOperation='lighter'; glow(ctx,178,70,90,S.live?'rgba(80,140,255,A)':'rgba(60,90,200,A)',S.live?.2:.12); ctx.restore();
  P_(ctx,80,64,S.live?'#ff3048':'#38f0e0');
  // ON AIR
  if(S.live){ R_(ctx,23,71,38,12,'#e8304a'); ptext(ctx,'ON AIR',30,74,'#fff0f0'); ctx.save(); ctx.globalCompositeOperation='lighter'; glow(ctx,42,77,30,'rgba(255,40,70,A)',.35+.1*Math.sin(t*4)); ctx.restore(); }
  else { R_(ctx,23,71,38,12,'#2a1020'); ptext(ctx,'ON AIR',30,74,'#5a2a3a'); }
  // 時計
  const s = (Math.floor(t*2)%2===0) ? S.clock : S.clock.replace(':',' ');
  ptext(ctx,s,107,100,'#ff4060');
  // 湯気
  for(let i=0;i<3;i++){ const y = 94 - ((t*8+i*7)%18); const x = 210+i*3+Math.round(Math.sin(t*2+y*.3+i)); ctx.globalAlpha = .5*(1-(94-y)/18); P_(ctx,x,y,'#c8c0e8'); ctx.globalAlpha = 1; }
  // デスクライト
  ctx.save(); ctx.globalCompositeOperation='lighter'; glow(ctx,30,104,40,'rgba(255,180,100,A)',.16); ctx.restore();
}
function buildSea(){ return buildStrait(OW,OH,{hz:.5, apt:false, city:true, wall:false, flags:true, seed:29, moonX:.7, moonY:.3}); }

/* ───────────────────────── スタイル ───────────────────────── */
function injectStyle(){
  if($('pr-style')) return;
  const st = document.createElement('style'); st.id = 'pr-style';
  st.textContent = `
:root{--pr-dot:var(--dot,'DotGothic16'),'DotGothic16',sans-serif;--pr-serif:'Noto Serif JP','Hiragino Mincho ProN','Yu Mincho',var(--serif,serif),serif;--pr-mono:var(--mono,'Share Tech Mono'),monospace;}
.pr-win{background:linear-gradient(180deg,rgba(44,28,118,.95) 0%,rgba(22,14,70,.96) 60%,rgba(12,8,44,.97) 100%);border:2px solid #f1ecff;border-radius:7px;box-shadow:0 0 0 2px #090520,inset 0 0 0 2px rgba(130,110,230,.55),inset 0 0 22px rgba(0,0,0,.45),0 10px 28px rgba(0,0,0,.6);}
@keyframes pr-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes pr-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}
@keyframes pr-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
@keyframes pr-fadein{from{opacity:0}to{opacity:1}}

/* ── タイトル ── */
#title-screen.pr-on{background:#04030f;gap:0;padding:0;overflow:hidden;}
#title-screen.pr-on > :not(.pr-title){display:none!important;}
.pr-title{position:absolute;inset:0;overflow:hidden;color:#efeaff;font-family:var(--pr-dot);-webkit-tap-highlight-color:transparent;touch-action:manipulation;cursor:pointer;}
.pr-tcv{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;display:block;}
.pr-tvig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 120% 90% at 50% 40%,transparent 55%,rgba(2,1,10,.65) 100%),linear-gradient(180deg,rgba(2,1,12,.35),transparent 30%);}
.pr-tscan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.14) 0 1px,transparent 1px 3px);opacity:.55;}
.pr-tblack{position:absolute;inset:0;background:#000;pointer-events:none;animation:pr-tb 1.6s ease .1s forwards;}
@keyframes pr-tb{to{opacity:0}}
.pr-logo-wrap{position:absolute;left:50%;top:clamp(46px,10vh,120px);transform:translateX(-50%);width:min(92vw,600px);display:flex;flex-direction:column;align-items:center;pointer-events:none;}
.pr-eye{font-family:var(--pr-mono);font-size:clamp(.55rem,2.4vw,.7rem);letter-spacing:.32em;color:#8ff4e6;text-shadow:0 0 8px rgba(0,232,200,.6);opacity:0;animation:pr-fadein 1.2s ease .2s forwards;text-transform:uppercase;margin-bottom:2px;}
.pr-logo{position:relative;width:100%;}
.pr-logo svg.pr-shine-svg{position:absolute;left:0;top:0;filter:none;pointer-events:none;}
.pr-logo svg{width:100%;height:auto;overflow:visible;display:block;filter:drop-shadow(0 0 12px rgba(170,110,255,.55)) drop-shadow(0 3px 0 #0b0522);}
.pr-g{font-family:var(--pr-serif);font-weight:700;font-size:122px;fill:url(#pr-lg);fill-opacity:0;stroke:#fbf8ff;stroke-width:2.4;stroke-linejoin:round;stroke-dasharray:1000;stroke-dashoffset:1000;animation:pr-draw 1.15s cubic-bezier(.55,.1,.3,1) var(--d) forwards,pr-fill .8s ease calc(var(--d) + .85s) forwards;}
@keyframes pr-draw{to{stroke-dashoffset:0}}
@keyframes pr-fill{to{fill-opacity:1;stroke-width:1;stroke:#2a1458}}
.pr-swash{fill:none;stroke:url(#pr-sw);stroke-width:9;stroke-linecap:round;stroke-dasharray:700;stroke-dashoffset:700;animation:pr-draw .9s cubic-bezier(.6,0,.2,1) 2.15s forwards;}
.pr-swash2{fill:none;stroke:#8ff4e6;stroke-width:2;stroke-linecap:round;opacity:.7;stroke-dasharray:700;stroke-dashoffset:700;animation:pr-draw 1s cubic-bezier(.6,0,.2,1) 2.35s forwards;}
.pr-shine{transform:translateX(-700px);animation:pr-shine 6s ease-in-out 3.6s infinite;}
@keyframes pr-shine{0%{transform:translateX(-700px)}22%,100%{transform:translateX(760px)}}
.pr-seal{position:absolute;right:1%;bottom:4%;width:13%;aspect-ratio:1;background:#c8203a;color:#fff3ee;font-family:var(--pr-serif);font-weight:700;display:flex;align-items:center;justify-content:center;font-size:clamp(1rem,5.4vw,2.1rem);border-radius:5px;box-shadow:inset 0 0 0 2px rgba(255,220,210,.5),inset 0 0 8px rgba(80,0,10,.6),0 0 14px rgba(232,48,85,.45);transform:rotate(-8deg) scale(2.6);opacity:0;animation:pr-stamp .32s cubic-bezier(.3,1.6,.6,1) 2.75s forwards;}
@keyframes pr-stamp{0%{opacity:0;transform:rotate(-8deg) scale(2.6)}60%{opacity:1}100%{opacity:.95;transform:rotate(-8deg) scale(1)}}
.pr-sub{margin-top:6px;font-family:var(--pr-serif);font-size:clamp(.88rem,4vw,1.25rem);letter-spacing:.42em;color:#e9e2ff;text-shadow:0 0 10px rgba(140,90,255,.8),2px 2px 0 #0b0522;white-space:nowrap;}
.pr-sub span{display:inline-block;opacity:0;transform:translateY(6px);animation:pr-up .5s ease forwards;}
@keyframes pr-up{to{opacity:1;transform:none}}
.pr-tag{margin-top:10px;font-family:var(--pr-mono);font-size:clamp(.55rem,2.4vw,.68rem);color:#ffd27a;letter-spacing:.2em;border:1px solid rgba(255,210,122,.4);padding:3px 12px;background:rgba(10,6,30,.55);opacity:0;animation:pr-fadein .8s ease 3.6s forwards;}
.pr-title.pr-skipintro .pr-intro,.pr-title.pr-skipintro .pr-intro *{animation-delay:0s!important;animation-duration:.01s!important;}
.pr-title.pr-skipintro .pr-tblack{display:none;}
.pr-press{position:absolute;left:0;right:0;bottom:calc(16vh + 10px);text-align:center;font-size:clamp(.92rem,4vw,1.15rem);letter-spacing:.3em;color:#fff;text-shadow:0 0 10px rgba(143,244,230,.9),2px 2px 0 #0b0522;opacity:0;pointer-events:none;transition:opacity .3s;}
.pr-title[data-st="attract"] .pr-press{opacity:1;}
.pr-title[data-st="attract"] .pr-press b{animation:pr-blink 1.2s steps(1) infinite;font-weight:normal;}
.pr-copy{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-family:var(--pr-mono);font-size:.56rem;letter-spacing:.2em;color:rgba(200,190,255,.5);pointer-events:none;}
.pr-title[data-st="menu"] .pr-copy{opacity:0;}
.pr-menu{position:absolute;left:50%;bottom:max(16px,3.5vh);width:min(88vw,380px);padding:10px 8px 8px;transform:translate(-50%,24px);opacity:0;pointer-events:none;transition:transform .35s cubic-bezier(.2,1.3,.4,1),opacity .25s;cursor:default;}
.pr-title[data-st="menu"] .pr-menu{transform:translate(-50%,0);opacity:1;pointer-events:auto;}
.pr-menu-head{font-family:var(--pr-mono);font-size:.58rem;letter-spacing:.24em;color:#8ff4e6;padding:0 10px 6px;display:flex;justify-content:space-between;border-bottom:1px dashed rgba(200,190,255,.25);margin-bottom:4px;}
#title-screen .pr-menu .pr-mi{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%!important;margin:0!important;padding:8px 12px 8px 34px!important;min-height:44px;background:transparent!important;border:none!important;border-radius:4px!important;color:#f3efff!important;font-family:var(--pr-dot)!important;font-size:clamp(.95rem,4.2vw,1.05rem)!important;letter-spacing:.14em!important;text-align:left;cursor:pointer;opacity:1!important;position:relative;overflow:visible;transition:background .12s;text-shadow:2px 2px 0 #0b0522;box-shadow:none!important;transform:none!important;line-height:1.3;}
#title-screen .pr-menu .pr-mi::before,#title-screen .pr-menu .pr-mi::after{display:none!important;}
#title-screen .pr-menu .pr-mi.pr-cur{background:linear-gradient(90deg,rgba(150,120,255,.32),rgba(150,120,255,.04))!important;}
#title-screen .pr-menu .pr-mi[disabled]{opacity:.5!important;color:#a49cc8!important;cursor:default;}
#title-screen .pr-menu .pr-mi.pr-flash{animation:pr-mflash .32s steps(2) 1;}
@keyframes pr-mflash{0%{background:rgba(255,255,255,.55)}100%{background:transparent}}
.pr-mi .pr-hint{font-family:var(--pr-mono);font-size:.6rem;letter-spacing:.06em;color:#9ff3e6;text-shadow:none;white-space:nowrap;}
.pr-mi .pr-lbl{white-space:nowrap;}
.pr-mi .pr-dots{display:inline-block;animation:pr-blink .9s steps(1) infinite;}
#title-screen .pr-menu #btn-continue .pr-hint{color:#ffd27a;font-size:.56rem;white-space:normal;text-align:right;line-height:1.35;}
.pr-cursor{position:absolute;left:12px;top:0;width:14px;height:14px;pointer-events:none;transition:top .1s steps(3);animation:pr-nudge .5s steps(2) infinite;filter:drop-shadow(1px 1px 0 #0b0522);}
.pr-cursor svg{width:100%;height:100%;display:block;shape-rendering:crispEdges;}
#title-screen .pr-menu #btn-delete-wrap{margin:2px 0 0!important;text-align:right;}
#title-screen .pr-menu #btn-delete-wrap button{font-size:.56rem!important;color:rgba(255,120,140,.6)!important;}
.pr-shake{animation:pr-shake .28s linear 1;}
@keyframes pr-shake{0%,100%{transform:translate(0,0)}25%{transform:translate(2px,-2px)}50%{transform:translate(-2px,1px)}75%{transform:translate(1px,2px)}}

/* ── 序章 ── */
#story-screen.pr-cine #story-log,#story-screen.pr-cine #story-go{visibility:hidden!important;}
.pr-op{position:fixed;inset:0;z-index:46;background:#000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .6s;font-family:var(--pr-dot);color:#f4f0ff;-webkit-tap-highlight-color:transparent;user-select:none;cursor:pointer;}
.pr-op.on{opacity:1;}
.pr-op-bgc{position:absolute;inset:0;width:100%;height:100%;filter:blur(26px) brightness(.38) saturate(1.3);transform:scale(1.25);opacity:.9;}
.pr-op-stage{position:relative;width:min(calc(100vw - 24px),760px);display:flex;flex-direction:column;gap:14px;transition:opacity .4s;}
.pr-op-head{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--pr-mono);font-size:.62rem;letter-spacing:.28em;color:#8ff4e6;padding:0 4px;}
.pr-op-head b{font-weight:normal;color:rgba(220,210,255,.55);}
.pr-op-frame{position:relative;width:100%;aspect-ratio:16/10;overflow:hidden;border:2px solid #f1ecff;border-radius:6px;box-shadow:0 0 0 2px #090520,0 0 0 4px rgba(130,110,230,.35),0 14px 40px rgba(0,0,0,.7);background:#000;max-height:calc(100vh - 260px);}
.pr-op-frame canvas{width:100%;height:100%;display:block;image-rendering:pixelated;image-rendering:crisp-edges;transform-origin:50% 60%;}
.pr-op-frame canvas.pr-kb{animation:pr-kb 16s ease-out forwards;}
@keyframes pr-kb{from{transform:scale(1.1)}to{transform:scale(1)}}
.pr-op-cap{position:absolute;left:10px;top:10px;font-family:var(--pr-mono);font-size:.66rem;letter-spacing:.18em;color:#fff;background:rgba(5,3,20,.7);border:1px solid rgba(240,236,255,.6);padding:3px 10px;border-radius:3px;opacity:0;transform:translateX(-8px);transition:opacity .5s,transform .5s;}
.pr-op-cap.on{opacity:1;transform:none;}
.pr-op-chap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(3,2,14,.55);opacity:0;transition:opacity .6s;pointer-events:none;}
.pr-op-chap.on{opacity:1;}
.pr-op-chap span{font-family:var(--pr-serif);font-weight:700;font-size:clamp(1.15rem,5.6vw,2rem);letter-spacing:.3em;color:#fff;text-shadow:0 0 14px rgba(232,48,85,.8),2px 2px 0 #1a0510;padding-left:.3em;}
.pr-op-chap i{display:block;width:0;height:2px;margin-top:10px;background:linear-gradient(90deg,transparent,#e8304a,transparent);transition:width 1.1s ease .2s;}
.pr-op-chap.on i{width:70%;}
.pr-msg{position:relative;min-height:calc(4.4em + 28px);padding:16px 18px 14px;font-size:clamp(.92rem,3.8vw,1.08rem);line-height:1.75;letter-spacing:.06em;text-shadow:2px 2px 0 #0b0522;transition:opacity .3s;}
.pr-msg.off{opacity:0;}
.pr-msg-name{position:absolute;top:-13px;left:14px;font-size:.72rem;letter-spacing:.2em;padding:2px 12px;background:#2c1c76;border:2px solid #f1ecff;border-radius:4px;color:#ffd27a;display:none;}
.pr-msg-name.on{display:block;}
.pr-msg-next{position:absolute;right:14px;bottom:6px;color:#8ff4e6;font-size:.8rem;opacity:0;}
.pr-msg-next.on{opacity:1;animation:pr-bob .6s steps(2) infinite;}
.pr-skip{position:fixed;top:max(10px,env(safe-area-inset-top));right:10px;z-index:5;font-family:var(--pr-mono);font-size:.7rem;letter-spacing:.2em;color:#f1ecff;background:rgba(10,6,30,.7);border:1px solid rgba(240,236,255,.55);border-radius:3px;padding:8px 14px;min-height:36px;cursor:pointer;}
.pr-skip:hover{background:rgba(60,40,140,.8);}
.pr-op-final{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;opacity:0;pointer-events:none;transition:opacity .8s;text-align:center;padding:0 16px;}
.pr-op-final.on{opacity:1;}
.pr-op-final .pr-f1{font-family:var(--pr-serif);font-size:clamp(1.05rem,5vw,1.6rem);letter-spacing:.2em;color:#8ff4e6;text-shadow:0 0 16px rgba(0,232,200,.6);}
.pr-op-final .pr-f2{font-family:var(--pr-mono);font-size:.7rem;letter-spacing:.4em;color:rgba(220,210,255,.6);}
.pr-op-mos{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .45s;}
.pr-op-mos.on{opacity:1;}

/* ── 日替わりカード ── */
.pr-day{position:fixed;inset:0;z-index:240;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .25s;font-family:var(--pr-dot);color:#fff;-webkit-tap-highlight-color:transparent;}
.pr-day.on{opacity:1;pointer-events:auto;cursor:pointer;transition:none;}
.pr-day-bg{position:absolute;inset:0;background:radial-gradient(ellipse 90% 60% at 50% 50%,var(--pr-dbg2),var(--pr-dbg) 70%);}
.pr-day-rain{position:absolute;inset:-20% 0 0 0;opacity:var(--pr-rain,0);background:repeating-linear-gradient(100deg,transparent 0 14px,rgba(200,180,255,.12) 14px 15px,transparent 15px 37px);animation:pr-drain .5s linear infinite;}
@keyframes pr-drain{to{transform:translate(-6px,40px)}}
.pr-day-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.25) 0 1px,transparent 1px 3px);opacity:var(--pr-scan,.3);}
.pr-day-bar{position:absolute;left:0;right:0;height:16vh;background:#000;transition:transform .3s cubic-bezier(.2,.8,.3,1);}
.pr-day-bar.t{top:0;transform:translateY(-100%);} .pr-day-bar.b{bottom:0;transform:translateY(100%);}
.pr-day.on .pr-day-bar{transform:none;}
.pr-day-in{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 16px;max-width:560px;}
.pr-day-act{font-family:var(--pr-serif);font-weight:700;font-size:clamp(.9rem,4vw,1.1rem);letter-spacing:.5em;color:var(--pr-acc);padding-left:.5em;display:none;opacity:0;}
.pr-day-acttl{font-family:var(--pr-serif);font-weight:700;font-size:clamp(1.7rem,8vw,2.8rem);letter-spacing:.18em;color:#fff;text-shadow:0 0 18px var(--pr-acc),3px 3px 0 rgba(0,0,0,.6);display:none;opacity:0;margin:2px 0 10px;}
.pr-day.act .pr-day-act,.pr-day.act .pr-day-acttl{display:block;}
.pr-day-num{font-size:clamp(2.6rem,13vw,4.4rem);letter-spacing:.06em;line-height:1;color:#fff;text-shadow:0 0 16px var(--pr-acc),3px 3px 0 rgba(0,0,0,.7);opacity:0;}
.pr-day-num small{font-size:.38em;letter-spacing:.3em;color:var(--pr-acc);vertical-align:.6em;margin-right:.2em;}
.pr-day-num em{font-style:normal;font-size:.34em;color:rgba(255,255,255,.45);letter-spacing:.1em;margin-left:.2em;}
.pr-day.act .pr-day-num{font-size:clamp(1.5rem,7vw,2.1rem);}
.pr-day-hr{width:0;height:2px;margin:12px 0 8px;background:linear-gradient(90deg,transparent,var(--pr-acc),transparent);}
.pr-day-wk{font-family:var(--pr-mono);font-size:.72rem;letter-spacing:.26em;color:var(--pr-acc);opacity:0;}
.pr-day-line{margin-top:12px;font-family:var(--pr-serif);font-size:clamp(.88rem,3.8vw,1.05rem);letter-spacing:.14em;color:#ece6ff;opacity:0;text-shadow:2px 2px 0 rgba(0,0,0,.7);}
.pr-day-tap{position:absolute;right:14px;bottom:calc(16vh + 8px);font-family:var(--pr-mono);font-size:.56rem;letter-spacing:.2em;color:rgba(255,255,255,.4);}
.pr-day.on .pr-day-act{animation:pr-dIn .35s ease .02s forwards;}
.pr-day.on .pr-day-acttl{animation:pr-dZoom .5s cubic-bezier(.2,1.2,.4,1) .1s forwards;}
.pr-day.on .pr-day-num{animation:pr-dZoom .4s cubic-bezier(.2,1.3,.4,1) .05s forwards;}
.pr-day.on .pr-day-hr{animation:pr-dHr .45s ease .2s forwards;}
.pr-day.on .pr-day-wk{animation:pr-dIn .35s ease .25s forwards;}
.pr-day.on .pr-day-line{animation:pr-dIn .4s ease .38s forwards;}
.pr-day.act.on .pr-day-num{animation-delay:.3s;} .pr-day.act.on .pr-day-wk{animation-delay:.42s;} .pr-day.act.on .pr-day-line{animation-delay:.5s;}
@keyframes pr-dIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes pr-dZoom{from{opacity:0;transform:scale(1.5);filter:blur(4px)}to{opacity:1;transform:none;filter:none}}
@keyframes pr-dHr{to{width:min(70vw,360px)}}
.pr-day[data-ph="1"]{--pr-dbg:rgba(3,5,20,.94);--pr-dbg2:rgba(16,28,70,.94);--pr-acc:#4ff0dc;--pr-rain:.35;--pr-scan:.25;}
.pr-day[data-ph="2"]{--pr-dbg:rgba(10,3,24,.95);--pr-dbg2:rgba(52,16,80,.95);--pr-acc:#d080ff;--pr-rain:.7;--pr-scan:.35;}
.pr-day[data-ph="3"]{--pr-dbg:rgba(16,1,8,.96);--pr-dbg2:rgba(80,8,28,.95);--pr-acc:#ff4a68;--pr-rain:1;--pr-scan:.55;}
.pr-day[data-ph="4"]{--pr-dbg:rgba(2,2,10,.95);--pr-dbg2:rgba(24,20,60,.95);--pr-acc:#ffd27a;--pr-rain:.4;--pr-scan:.3;}
.pr-day[data-ph="3"].on .pr-day-num{text-shadow:-3px 0 rgba(0,240,255,.55),3px 0 rgba(255,20,80,.7),0 0 18px var(--pr-acc);}
.pr-day[data-ph="3"].on .pr-day-in{animation:pr-jit 1.4s steps(1) infinite;}
@keyframes pr-jit{0%,100%{transform:none}31%{transform:translateX(-3px)}33%{transform:translateX(2px) skewX(-4deg)}35%{transform:none}72%{transform:translateY(1px)}74%{transform:none}}
.pr-day.out{opacity:0!important;transition:opacity .3s;}

/* ── エンディング ── */
.pr-end{position:fixed;inset:0;z-index:305;background:#000;color:#f2eeff;font-family:var(--pr-serif);overflow:hidden;opacity:0;pointer-events:none;transition:opacity .8s;-webkit-tap-highlight-color:transparent;user-select:none;}
.pr-end.on{opacity:1;pointer-events:auto;}
.pr-end-bg{position:absolute;inset:-6%;background-size:cover;background-position:center;filter:blur(18px) saturate(1.2) brightness(.45);opacity:0;transition:opacity 2s;transform:scale(1.1);}
.pr-end.s-main .pr-end-bg,.pr-end.s-credits .pr-end-bg,.pr-end.s-final .pr-end-bg{opacity:1;}
.pr-end.s-credits .pr-end-bg{filter:blur(22px) saturate(1) brightness(.25);}
.pr-end-tint{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen;opacity:0;transition:opacity 2s;}
.pr-end.s-main .pr-end-tint,.pr-end.s-final .pr-end-tint{opacity:1;}
.pr-end-rays{position:absolute;left:50%;top:-30%;width:160vmax;height:160vmax;margin-left:-80vmax;pointer-events:none;opacity:0;transition:opacity 3s;mix-blend-mode:screen;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,210,150,.12) 0deg 4deg,transparent 4deg 13deg);-webkit-mask:radial-gradient(circle at 50% 50%,#000 0,transparent 55%);mask:radial-gradient(circle at 50% 50%,#000 0,transparent 55%);animation:pr-rot 60s linear infinite;}
.pr-end.rays.s-main .pr-end-rays,.pr-end.rays.s-final .pr-end-rays{opacity:1;}
@keyframes pr-rot{to{transform:rotate(360deg)}}
.pr-end-fx{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;}
.pr-end-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(0,0,0,.75) 100%);}
.pr-end-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px);opacity:.5;}
.pr-end-flash{position:absolute;inset:0;pointer-events:none;opacity:0;}
.pr-end-flash.go{animation:pr-flash 1.6s ease-out forwards;}
@keyframes pr-flash{0%{opacity:1}100%{opacity:0}}
.pr-end-main{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:14px;padding:max(52px,7vh) 16px 56px;opacity:0;transition:opacity 1.2s;overflow-y:auto;scrollbar-width:none;}
.pr-end-main::-webkit-scrollbar{display:none;}
.pr-end.s-main .pr-end-main{opacity:1;}
.pr-end-pic{position:relative;flex:none;width:min(64vw,300px,40vh);aspect-ratio:2/3;overflow:hidden;border:2px solid #f1ecff;border-radius:6px;box-shadow:0 0 0 2px #090520,0 0 0 4px var(--pr-ec,#8a52d4),0 0 40px var(--pr-ecg,rgba(138,82,212,.45)),0 18px 40px rgba(0,0,0,.7);background:#0a0818;}
.pr-end-pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;transform-origin:50% 40%;}
.pr-end-pic::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,rgba(0,0,0,.35));pointer-events:none;}
.pr-kb-in{animation:pr-kbIn 20s ease-out forwards;} @keyframes pr-kbIn{from{transform:scale(1.02)}to{transform:scale(1.2) translateY(-3%)}}
.pr-kb-out{animation:pr-kbOut 20s ease-out forwards;} @keyframes pr-kbOut{from{transform:scale(1.22) translateY(-4%)}to{transform:scale(1.03)}}
.pr-kb-up{animation:pr-kbUp 20s ease-out forwards;} @keyframes pr-kbUp{from{transform:scale(1.18) translateY(7%)}to{transform:scale(1.08) translateY(-4%)}}
.pr-kb-pan{animation:pr-kbPan 20s ease-in-out forwards;} @keyframes pr-kbPan{from{transform:scale(1.2) translateX(-6%)}to{transform:scale(1.12) translateX(5%)}}
.pr-kb-down{animation:pr-kbDown 20s ease-in forwards;} @keyframes pr-kbDown{from{transform:scale(1.04)}to{transform:scale(1.2) translateY(6%);filter:brightness(.7) saturate(.6)}}
.pr-glitch .pr-end-pic{animation:pr-gl 3.4s steps(1) infinite;}
@keyframes pr-gl{0%,100%{transform:none;filter:none}46%{transform:translateX(-4px);filter:hue-rotate(-30deg) contrast(1.4)}47%{transform:translateX(5px) skewX(3deg)}48%{transform:none;filter:none}83%{transform:translateY(2px);filter:saturate(2) brightness(1.3)}84%{transform:none;filter:none}}
.pr-end-text{width:min(100%,420px);display:flex;flex-direction:column;align-items:center;text-align:center;}
.pr-end-label{font-family:var(--pr-mono);font-size:.62rem;letter-spacing:.42em;color:rgba(230,224,255,.6);}
.pr-end-ttl{font-family:var(--pr-dot);font-size:clamp(1.3rem,6vw,1.9rem);letter-spacing:.16em;margin:4px 0 12px;text-shadow:0 0 16px currentColor,2px 2px 0 #000;}
.pr-end-lines{width:100%;}
.pr-el{font-size:clamp(.86rem,3.7vw,.98rem);line-height:2;letter-spacing:.08em;color:#ece6ff;opacity:0;transform:translateY(6px);transition:opacity .9s,transform .9s;text-shadow:0 2px 6px rgba(0,0,0,.9);}
.pr-el.on{opacity:1;transform:none;}
.pr-el.gap{height:.8em;}
.pr-el.quote{margin-top:6px;font-weight:700;font-size:clamp(.98rem,4.4vw,1.15rem);color:var(--pr-ec,#fff);text-shadow:0 0 14px var(--pr-ecg,rgba(138,82,212,.6)),0 2px 6px #000;}
.pr-el.epi-h{margin-top:14px;font-family:var(--pr-mono);font-size:.6rem;letter-spacing:.4em;color:rgba(230,224,255,.5);}
.pr-el.epi{font-size:clamp(.8rem,3.4vw,.9rem);color:#cfc6ef;font-style:italic;}
.pr-end-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;pointer-events:none;opacity:0;transition:opacity .9s;text-align:center;padding:0 16px;}
.pr-end.s-card .pr-end-card{opacity:1;}
.pr-end-card .pr-c1{font-family:var(--pr-mono);font-size:.7rem;letter-spacing:.6em;color:rgba(240,236,255,.7);padding-left:.6em;}
.pr-end-card .pr-c2{font-family:var(--pr-dot);font-size:clamp(1.7rem,8.4vw,3rem);letter-spacing:.16em;text-shadow:0 0 22px currentColor,3px 3px 0 #000;}
.pr-end.s-card .pr-c2{animation:pr-dZoom .9s cubic-bezier(.2,1.1,.4,1) forwards;}
.pr-end-card .pr-c3{width:0;height:2px;background:linear-gradient(90deg,transparent,currentColor,transparent);}
.pr-end.s-card .pr-c3{animation:pr-dHr 1s ease .4s forwards;}
.pr-cr{position:absolute;inset:0;overflow:hidden;opacity:0;transition:opacity 1s;pointer-events:none;}
.pr-end.s-credits .pr-cr{opacity:1;}
.pr-cr-roll{position:absolute;left:0;right:0;top:0;display:flex;flex-direction:column;align-items:center;text-align:center;padding:0 16px;will-change:transform;}
.pr-cr-roll .h{font-family:var(--pr-mono);font-size:.62rem;letter-spacing:.45em;color:#8ff4e6;margin:44px 0 10px;padding-left:.45em;}
.pr-cr-roll .n{font-family:var(--pr-dot);font-size:clamp(.95rem,4.2vw,1.1rem);letter-spacing:.16em;line-height:2;color:#f4f0ff;text-shadow:2px 2px 0 #000;}
.pr-cr-roll .s{font-size:.78rem;letter-spacing:.12em;color:rgba(230,224,255,.7);line-height:1.9;}
.pr-cr-roll .big{font-family:var(--pr-serif);font-weight:700;font-size:clamp(2rem,10vw,3rem);letter-spacing:.2em;color:#fff;text-shadow:0 0 18px rgba(170,110,255,.8),3px 3px 0 #0b0522;}
.pr-cr-roll .tl{font-family:var(--pr-dot);font-size:clamp(1.1rem,5vw,1.4rem);letter-spacing:.14em;margin-top:8px;text-shadow:0 0 12px currentColor,2px 2px 0 #000;}
.pr-cr-roll .st{display:grid;grid-template-columns:auto auto;gap:4px 18px;font-family:var(--pr-mono);font-size:.74rem;letter-spacing:.08em;color:#e6e0ff;margin-top:6px;text-align:left;}
.pr-cr-roll .st b{color:#ffd27a;font-weight:normal;text-align:right;}
.pr-cr-quote{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;opacity:0;transition:opacity 1.4s;pointer-events:none;text-align:center;padding:0 16px;}
.pr-cr-quote.on{opacity:1;}
.pr-cr-quote .q{font-family:var(--pr-serif);font-weight:700;font-size:clamp(1.25rem,6vw,2rem);letter-spacing:.24em;color:#fff;text-shadow:0 0 22px rgba(232,48,85,.7),3px 3px 0 #000;padding-left:.24em;}
.pr-cr-quote .f{font-family:var(--pr-mono);font-size:.8rem;letter-spacing:.8em;color:rgba(240,236,255,.6);padding-left:.8em;}
.pr-end-final{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px 16px;opacity:0;pointer-events:none;transition:opacity 1s;overflow-y:auto;}
.pr-end.s-final .pr-end-final{opacity:1;pointer-events:auto;}
.pr-end-final .pr-fpic{width:min(40vw,170px,24vh);aspect-ratio:2/3;border:2px solid #f1ecff;border-radius:5px;background-size:cover;background-position:center;box-shadow:0 0 0 2px #090520,0 0 0 4px var(--pr-ec,#8a52d4),0 0 30px var(--pr-ecg,rgba(138,82,212,.45));}
.pr-end-final .pr-fttl{font-family:var(--pr-dot);font-size:clamp(1.2rem,5.6vw,1.6rem);letter-spacing:.14em;text-shadow:0 0 14px currentColor,2px 2px 0 #000;margin-top:6px;}
.pr-end-final .pr-fcnt{font-family:var(--pr-mono);font-size:.66rem;letter-spacing:.24em;color:rgba(230,224,255,.65);}
.pr-end-final .pr-fbar{width:min(70vw,260px);height:6px;border:1px solid rgba(240,236,255,.5);border-radius:2px;overflow:hidden;background:rgba(0,0,0,.5);}
.pr-end-final .pr-fbar i{display:block;height:100%;background:linear-gradient(90deg,#8a52d4,#00e8c8);}
.pr-end-final #end-buttons{margin-top:8px!important;width:min(84vw,320px);}
.pr-end-final #end-buttons .btn-start,.pr-end-final .pr-share{width:100%;margin:0!important;}
.pr-end-final .pr-share{display:block;padding:12px 20px;min-height:46px;background:rgba(10,6,30,.7);border:1px solid rgba(0,232,200,.7);color:#8ff4e6;font-family:var(--pr-dot);font-size:.92rem;letter-spacing:.16em;cursor:pointer;border-radius:2px;}
.pr-end-final .pr-share:hover{background:rgba(0,232,200,.15);}
.pr-end-ctl{position:absolute;left:0;right:0;bottom:max(12px,env(safe-area-inset-bottom));text-align:center;font-family:var(--pr-mono);font-size:.58rem;letter-spacing:.3em;color:rgba(240,236,255,.45);pointer-events:none;}
.pr-end.s-final .pr-end-ctl,.pr-end.s-final .pr-skip{display:none;}
.pr-cmt{position:absolute;font-family:var(--pr-dot);font-size:.78rem;color:#fff;background:rgba(20,10,50,.7);border:1px solid rgba(255,120,220,.6);border-radius:10px;padding:3px 10px;white-space:nowrap;pointer-events:none;animation:pr-cmt 5s linear forwards;text-shadow:1px 1px 0 #000;}
@keyframes pr-cmt{0%{opacity:0;transform:translateY(0)}10%{opacity:1}80%{opacity:1}100%{opacity:0;transform:translateY(-140px)}}

@media (min-width:760px){
  .pr-end-main{flex-direction:row;justify-content:center;align-items:center;gap:40px;padding:40px 40px 60px;}
  .pr-end-pic{width:min(36vw,380px,52vh);}
  .pr-end-text{align-items:flex-start;text-align:left;width:min(42vw,420px);}
  .pr-end-lines{max-height:70vh;}
}
@media (prefers-reduced-motion: reduce){
  .pr-title *,.pr-op *,.pr-day *,.pr-end *{animation-duration:.01s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.15s!important;}
  .pr-title[data-st="attract"] .pr-press b{animation:none!important;}
}
`;
  document.head.appendChild(st);
}

/* ════════════════════════════════════════════════════════════════
   1) タイトル画面
   ════════════════════════════════════════════════════════════════ */
const T = { el:null, cv:null, ctx:null, S:null, raf:0, t0:0, st:'intro', items:[], cur:0, px:0, py:0, sc:3, introTimer:0 };
const CURSOR_SVG = '<svg viewBox="0 0 7 7"><rect x="0" y="0" width="2" height="7" fill="#fff"/><rect x="2" y="1" width="2" height="5" fill="#fff"/><rect x="4" y="2" width="2" height="3" fill="#fff"/><rect x="6" y="3" width="1" height="1" fill="#fff"/><rect x="1" y="1" width="1" height="5" fill="#c8c0ff"/></svg>';

function buildTitle(){
  const ts = $('title-screen'); if(!ts || ts.querySelector('.pr-title')) return;
  const get = (sel, d) => { const e = ts.querySelector(sel); return (e && e.textContent.trim()) || d; };
  const eye = get('.t-eye','― a story of resurrection ―');
  const sub = get('.t-sub','深夜、繋がりの海へ');
  const tag = get('.t-tag','壇ノ浦から這い上がれ'); const badge = get('.t-badge','30日間サバイバル');
  const glyphs = ['だ','ん','の','う','ら'];
  const texts = glyphs.map((g,i)=>`<text class="pr-g" x="${64+i*108}" y="138" text-anchor="middle" style="--d:${(.35+i*.26).toFixed(2)}s">${g}</text>`).join('');
  const clips = glyphs.map((g,i)=>`<text x="${64+i*108}" y="138" text-anchor="middle" style="font-family:var(--pr-serif);font-weight:700;font-size:122px">${g}</text>`).join('');
  const w = document.createElement('div'); w.className = 'pr-title'; w.dataset.st = 'intro';
  w.innerHTML = `
    <canvas class="pr-tcv" aria-hidden="true"></canvas>
    <div class="pr-tvig"></div><div class="pr-tscan"></div>
    <div class="pr-logo-wrap pr-intro">
      <div class="pr-eye pr-intro">${esc(eye)}</div>
      <div class="pr-logo pr-intro">
        <svg viewBox="0 0 600 190" role="img" aria-label="だんのうら">
          <defs>
            <linearGradient id="pr-lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e6dcff"/><stop offset=".55" stop-color="#b79cff"/><stop offset="1" stop-color="#7a4ad8"/></linearGradient>
            <linearGradient id="pr-sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00e8c8" stop-opacity="0"/><stop offset=".2" stop-color="#00e8c8"/><stop offset=".7" stop-color="#8a52d4"/><stop offset="1" stop-color="#e8304a" stop-opacity=".2"/></linearGradient>
            <linearGradient id="pr-shg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
            <filter id="pr-ink" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
            <clipPath id="pr-clip">${clips}</clipPath>
          </defs>
          <g filter="url(#pr-ink)">${texts}
            <path class="pr-swash" d="M18,168 C110,146 190,184 300,163 S470,140 584,160"/>
          </g>
          <path class="pr-swash2" d="M60,178 C150,164 230,188 320,174 S470,160 560,172"/>
        </svg>
        <svg class="pr-shine-svg" viewBox="0 0 600 190" aria-hidden="true"><g clip-path="url(#pr-clip)"><rect class="pr-shine" x="0" y="0" width="140" height="190" fill="url(#pr-shg)" transform="skewX(-20)"/></g></svg>
        <div class="pr-seal pr-intro">壇</div>
      </div>
      <div class="pr-sub pr-intro">${[...sub].map((c,i)=>`<span style="animation-delay:${(3.05+i*.07).toFixed(2)}s">${esc(c)}</span>`).join('')}</div>
      <div class="pr-tag pr-intro">${esc(tag)}　／　${esc(badge)}</div>
    </div>
    <div class="pr-press"><b>― タップしてはじめる ―</b></div>
    <div class="pr-menu pr-win" role="menu">
      <div class="pr-menu-head"><span>MAIN MENU</span><span>NIGHT 22:00</span></div>
      <div class="pr-cursor">${CURSOR_SVG}</div>
    </div>
    <div class="pr-copy">© 2026 DANNOURA PROJECT ・ 壇ノ浦から這い上がれ</div>
    <div class="pr-tblack"></div>`;
  ts.appendChild(w); ts.classList.add('pr-on');
  T.el = w; T.cv = w.querySelector('.pr-tcv'); T.ctx = T.cv.getContext('2d');
  // 既存ボタンをメニューへ移動（id・onclickはそのまま）
  const menu = w.querySelector('.pr-menu');
  const startBtn = $('btn-start-main'), contBtn = $('btn-continue'), endBtn = $('btn-endings');
  const setBtn = [...ts.querySelectorAll('button')].find(b => /openSettings/.test(b.getAttribute('onclick')||'') && !menu.contains(b));
  const delWrap = $('btn-delete-wrap');
  [contBtn, startBtn, endBtn, setBtn].forEach(b=>{ if(b){ b.classList.add('pr-mi'); b.setAttribute('role','menuitem'); menu.appendChild(b); } });
  if(delWrap) menu.appendChild(delWrap);
  if(setBtn) setBtn.dataset.prKind = 'settings';
  relabel();
  // ボタンの文言変化（読み込み完了・セーブ確認）を見張って整形
  const mo = new MutationObserver(()=>{ mo.disconnect(); relabel(); observe(); });
  const observe = () => [startBtn,contBtn,endBtn].forEach(b=>{ if(b) mo.observe(b,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['disabled','style']}); });
  observe();
  // 入力
  w.addEventListener('pointerdown', onTitlePointer);
  menu.addEventListener('pointerover', e=>{ const b = e.target.closest('.pr-mi'); if(b){ const i = T.items.indexOf(b); if(i>=0 && i!==T.cur){ T.cur = i; placeCursor(); SFX.cursor(); } } });
  menu.addEventListener('click', e=>{ const b = e.target.closest('.pr-mi'); if(b && !b.disabled){ SFX.decide(); b.classList.remove('pr-flash'); void b.offsetWidth; b.classList.add('pr-flash'); } }, true);
  window.addEventListener('keydown', onTitleKey, true);
  window.addEventListener('resize', ()=>{ if(titleVisible()) setupTitleCanvas(); });
  window.addEventListener('pointermove', e=>{ T.px = (e.clientX/innerWidth-.5); T.py = (e.clientY/innerHeight-.5); }, {passive:true});
  setupTitleCanvas();
  T.t0 = performance.now();
  T.introTimer = setTimeout(()=>{ if(T.st==='intro') setTitleState('attract'); }, RM ? 400 : 3900);
  setTimeout(()=>{ if(T.st==='intro' || T.st==='attract') SFX.stamp(); }, 2780);
  if(!RM) loopTitle(); else drawTitleOnce();
}
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function relabel(){
  const sb = $('btn-start-main'), cb = $('btn-continue'), eb = $('btn-endings');
  if(sb){ const want = sb.disabled ? 'L' : 'R'; if(sb.dataset.prL !== want || !sb.querySelector('.pr-lbl')){ sb.dataset.prL = want; sb.innerHTML = sb.disabled ? '<span class="pr-lbl">読み込み中<span class="pr-dots">…</span></span><span class="pr-hint">LOADING</span>' : '<span class="pr-lbl">はじめから</span><span class="pr-hint">NEW GAME</span>'; } }
  if(cb && !cb.querySelector('.pr-lbl')){
    const raw = cb.textContent.replace(/^▶\s*/,'').trim(); const m = raw.match(/つづきから\s*(.*)$/);
    const det = m ? m[1].split('/').map(s=>s.trim()).filter(Boolean).join(' ・ ') : '';
    cb.innerHTML = `<span class="pr-lbl">つづきから</span><span class="pr-hint">${esc(det)}</span>`;
  }
  if(eb && !eb.querySelector('.pr-lbl')){ const m = eb.textContent.match(/（(\d+)\/(\d+)）/); eb.innerHTML = `<span class="pr-lbl">エンディング一覧</span><span class="pr-hint">${m ? m[1]+' / '+m[2] : ''}</span>`; }
  const set = T.el && T.el.querySelector('[data-pr-kind="settings"]');
  if(set && !set.querySelector('.pr-lbl')) set.innerHTML = '<span class="pr-lbl">設定・遊び方</span><span class="pr-hint">OPTION</span>';
  refreshItems();
}
function refreshItems(){
  if(!T.el) return;
  T.items = [...T.el.querySelectorAll('.pr-menu .pr-mi')].filter(b => b.style.display !== 'none' && getComputedStyle(b).display !== 'none');
  if(T.cur >= T.items.length) T.cur = 0;
  placeCursor();
}
function placeCursor(){
  if(!T.el) return; const c = T.el.querySelector('.pr-cursor'); const b = T.items[T.cur];
  T.items.forEach((x,i)=>x.classList.toggle('pr-cur', i===T.cur));
  if(c && b){ c.style.top = (b.offsetTop + b.offsetHeight/2 - 7) + 'px'; c.style.display = 'block'; }
}
function titleVisible(){ const ts = $('title-screen'); return ts && !ts.classList.contains('hidden'); }
function modalOpen(){ return ['settings-sc','endlist-sc','tutorial-sc'].some(id=>{ const e = $(id); return e && e.classList.contains('active'); }); }
function setTitleState(s){
  if(!T.el) return; T.st = s; T.el.dataset.st = s;
  if(s !== 'intro') T.el.classList.add('pr-skipintro');
  if(s === 'menu'){
    refreshItems();
    const cb = $('btn-continue'); const ci = T.items.indexOf(cb);
    const sb = $('btn-start-main');
    T.cur = ci >= 0 ? ci : Math.max(0, T.items.indexOf(sb));
    requestAnimationFrame(placeCursor); setTimeout(placeCursor, 380);
  }
}
function onTitlePointer(e){
  ensureCtx();
  if(T.st === 'intro'){ clearTimeout(T.introTimer); setTitleState('attract'); return; }
  if(T.st === 'attract'){ SFX.decide(); setTitleState('menu'); e.preventDefault(); return; }
}
function onTitleKey(e){
  if(!titleVisible() || modalOpen()) return;
  const k = e.key;
  if(e.defaultPrevented) return;
  if(T.st !== 'menu'){ if(['Enter',' ','z','Z','ArrowDown','ArrowUp'].includes(k)){ e.preventDefault(); ensureCtx(); if(T.st==='intro'){ clearTimeout(T.introTimer); setTitleState('attract'); } else { SFX.decide(); setTitleState('menu'); } } return; }
  if(k === 'ArrowDown' || k === 'ArrowUp'){
    e.preventDefault(); refreshItems(); if(!T.items.length) return;
    T.cur = (T.cur + (k==='ArrowDown'?1:-1) + T.items.length) % T.items.length; placeCursor(); SFX.cursor();
  } else if(k === 'Enter' || k === ' ' || k === 'z' || k === 'Z'){
    e.preventDefault(); const b = T.items[T.cur]; if(b && !b.disabled) b.click();
  }
}
function setupTitleCanvas(){
  const W = innerWidth, H = innerHeight;
  T.sc = clamp(Math.round(Math.min(W,H)/140), 2, 4);
  const w = Math.ceil(W/T.sc), h = Math.ceil(H/T.sc);
  T.cv.width = w; T.cv.height = h;
  const portrait = H > W;
  T.S = buildStrait(w, h, {hz: portrait ? .58 : .6, aptTop: portrait ? .44 : .36, moonX: portrait ? .82 : .86, moonY: .1});
  if(RM) drawTitleOnce();
}
function drawTitleOnce(){ if(T.S) drawStrait(T.ctx, T.S, 4, 0); }
function loopTitle(){
  T.raf = requestAnimationFrame(loopTitle);
  if(!titleVisible() || document.hidden || !T.S) return;
  const now = performance.now(); if(now - (T.last||0) < 31) return; T.last = now;   // 30fps（ドット絵なので十分）
  const t = (now - T.t0)/1000;
  const cx = Math.sin(t*.07) * T.S.range * .8 + T.px * T.S.range * .6;
  drawStrait(T.ctx, T.S, t, cx);
}

/* ════════════════════════════════════════════════════════════════
   2) 序章（オープニング）
   ════════════════════════════════════════════════════════════════ */
const OP_SCRIPT = [
  {k:'factory', cap:'17:40 ― 工場', lines:[
    {t:'だんのうら。本名は言えない。'},
    {t:'設備保全技術者、シングルファーザー、深夜配信者。'},
    {t:'昼は工場の設備を守る。'}]},
  {k:'child', cap:'21:48 ― 六畳の部屋', lines:[
    {t:'夜の22時。子どもが眠った部屋に、静けさが戻ってきた。'}]},
  {k:'desk', cap:'22:00 ― 机の前', lines:[
    {t:'机の上の安物のマイクが、今夜もだんのうらの声を待っている。', ev:'clock'},
    {n:'だんのうら', t:'「借金、残り84万。保育料、今月24日まで。資格試験は来月だ。」'},
    {n:'だんのうら', t:'「それでも今夜も配信する。誰かが見ていてくれるかもしれないから。」', ev:'live'},
    {t:'夜は、ネットに居場所を作る。'}]},
  {k:'sea', cap:'壇ノ浦', chap:'壇ノ浦から這い上がれ', lines:[
    {n:'だんのうら', t:'「ここが、俺の壇ノ浦だ。」'},
    {n:'だんのうら', t:'「沈むか、這い上がるか。」'}]},
];
const OP = { el:null, active:false, done:false, tok:0, si:0, li:-1, typing:false, iv:0, tm:0, raf:0, S:null, draw:null, mos:1, t0:0, cur:null };
const SCENES = { factory:[buildFactory,drawFactory], child:[buildChild,drawChild], desk:[buildDesk,drawDesk], sea:[buildSea,(c,S,t)=>drawStrait(c,S,t,Math.sin(t*.12)*S.range*.9)] };

function buildOp(){
  if(OP.el) return OP.el;
  const el = document.createElement('div'); el.className = 'pr-op'; el.setAttribute('aria-live','polite'); el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','プロローグ');
  el.innerHTML = `
    <canvas class="pr-op-bgc" width="64" height="40"></canvas>
    <div class="pr-op-stage">
      <div class="pr-op-head"><span>PROLOGUE</span><b class="pr-op-no">1 / 4</b></div>
      <div class="pr-op-frame"><canvas width="${OW}" height="${OH}"></canvas><div class="pr-op-cap"></div><div class="pr-op-chap"><span></span><i></i></div><div class="pr-op-mos"></div></div>
      <div class="pr-msg pr-win off"><div class="pr-msg-name"></div><div class="pr-msg-tx"></div><div class="pr-msg-next">▼</div></div>
    </div>
    <div class="pr-op-final"><div class="pr-f1"></div><div class="pr-f2">DAY 1 ／ 30</div></div>
    <button class="pr-skip" type="button">SKIP ▶▶</button>`;
  document.body.appendChild(el);
  OP.el = el; OP.cv = el.querySelector('canvas'); OP.ctx = OP.cv.getContext('2d');
  OP.buf = mk(OW,OH); OP.bctx = OP.buf.getContext('2d'); OP.bg = el.querySelector('.pr-op-bgc').getContext('2d'); OP.fr = 0;
  el.querySelector('.pr-skip').addEventListener('click', e=>{ e.stopPropagation(); SFX.decide(); finishOpening(); });
  el.addEventListener('pointerdown', e=>{ if(e.target.closest('.pr-skip')) return; opTap(); });
  window.addEventListener('keydown', e=>{
    if(!OP.active || e.defaultPrevented) return;
    if(e.key==='Escape'){ e.preventDefault(); finishOpening(); }
    else if(['Enter',' ','z','Z'].includes(e.key)){ e.preventDefault(); opTap(); }
  });
  return el;
}
function startOpening(){
  buildOp(); ensureCtx();
  OP.active = true; OP.done = false; OP.tok++;
  const ss = $('story-screen'); if(ss) ss.classList.add('pr-cine');
  OP.el.style.display = 'flex'; void OP.el.offsetWidth; OP.el.classList.add('on');
  OP.el.querySelector('.pr-op-stage').style.opacity = '1';
  OP.el.querySelector('.pr-op-final').classList.remove('on');
  OP.t0 = performance.now();
  cancelAnimationFrame(OP.raf); opLoop();
  playScene(0, OP.tok);
}
function opLoop(){
  OP.raf = requestAnimationFrame(opLoop);
  if(!OP.S || document.hidden) return;
  const now = performance.now(); if(now - (OP.last||0) < 31) return; OP.last = now;
  const t = (performance.now() - OP.t0)/1000;
  if(RM && OP._drawn && OP.mos<=1) return;
  OP.draw(OP.bctx, OP.S, t);
  const m = Math.round(OP.mos);
  if(m > 1){
    const sw = Math.max(1, Math.round(OW/m)), sh = Math.max(1, Math.round(OH/m));
    const tmp = OP.tmp || (OP.tmp = mk(OW,OH)); const tc = tmp.getContext('2d');
    tc.imageSmoothingEnabled = false; tc.clearRect(0,0,OW,OH); tc.drawImage(OP.buf,0,0,sw,sh);
    OP.ctx.imageSmoothingEnabled = false; OP.ctx.drawImage(tmp,0,0,sw,sh,0,0,OW,OH);
  } else OP.ctx.drawImage(OP.buf,0,0);
  if((OP.fr++ % 6) === 0) OP.bg.drawImage(OP.cv,0,0,64,40);
  OP._drawn = true;
}
function tweenMos(from,to,ms){ return new Promise(r=>{ if(RM){ OP.mos = to; return r(); } const s = performance.now(); const f = ()=>{ const k = Math.min(1,(performance.now()-s)/ms); OP.mos = from + (to-from)*k; if(k<1) requestAnimationFrame(f); else r(); }; f(); }); }
async function playScene(i, tok){
  if(tok !== OP.tok) return;
  if(i >= OP_SCRIPT.length) return opFinal(tok);
  const sc = OP_SCRIPT[i]; OP.si = i; OP.li = -1;
  const el = OP.el, cap = el.querySelector('.pr-op-cap'), msg = el.querySelector('.pr-msg'), chap = el.querySelector('.pr-op-chap'), black = el.querySelector('.pr-op-mos');
  el.querySelector('.pr-op-no').textContent = `${i+1} / ${OP_SCRIPT.length}`;
  const [b,d] = SCENES[sc.k]; OP.S = b(); OP.draw = d; OP._drawn = false;
  OP.t0 = performance.now();
  const cnv = OP.cv; cnv.classList.remove('pr-kb'); void cnv.offsetWidth; if(!RM) cnv.classList.add('pr-kb');
  OP.mos = 12; black.classList.remove('on');
  await tweenMos(12,1,520); if(tok !== OP.tok) return;
  cap.textContent = sc.cap; cap.classList.add('on'); SFX.page();
  if(sc.chap){
    chap.querySelector('span').textContent = '── ' + sc.chap + ' ──'; chap.classList.add('on'); SFX.gong();
    await opWait(2300, tok); if(tok !== OP.tok) return; chap.classList.remove('on');
  }
  await sleep(250); if(tok !== OP.tok) return;
  msg.classList.remove('off');
  nextLine(tok);
}
function opWait(ms, tok){ return new Promise(r=>{ OP.waitR = r; OP.tm = setTimeout(()=>{ OP.waitR = null; r(); }, RM ? Math.min(ms,1200) : ms); }); }
function nextLine(tok){
  if(tok !== OP.tok) return;
  clearTimeout(OP.tm); clearInterval(OP.iv);
  const sc = OP_SCRIPT[OP.si]; OP.li++;
  if(OP.li >= sc.lines.length) return sceneOut(tok);
  const l = sc.lines[OP.li]; OP.cur = l;
  const el = OP.el, name = el.querySelector('.pr-msg-name'), tx = el.querySelector('.pr-msg-tx'), nx = el.querySelector('.pr-msg-next');
  name.textContent = l.n || ''; name.classList.toggle('on', !!l.n);
  nx.classList.remove('on'); tx.textContent = '';
  if(l.ev) sceneEvent(l.ev);
  OP.typing = true; let n = 0; const chars = [...l.t];
  if(RM){ finishTyping(tok); return; }
  OP.iv = setInterval(()=>{ n++; tx.textContent = chars.slice(0,n).join(''); if(n%2===0 && !/[、。「」…]/.test(chars[n-1]||'')) SFX.blip(); if(n >= chars.length) finishTyping(tok); }, 48);
}
function finishTyping(tok){
  clearInterval(OP.iv); OP.typing = false;
  const l = OP.cur; const el = OP.el;
  el.querySelector('.pr-msg-tx').textContent = l.t; el.querySelector('.pr-msg-next').classList.add('on');
  clearTimeout(OP.tm); OP.tm = setTimeout(()=>nextLine(tok), Math.max(1700, [...l.t].length*75));
}
function sceneEvent(ev){
  setTimeout(()=>{
    if(!OP.S) return;
    if(ev==='clock'){ OP.S.clock = '22:00'; SFX.clock(); }
    if(ev==='live'){ OP.S.live = true; OP.S.clock = '22:00'; try{ AU.se('micOn'); }catch(e){} }
  }, ev==='clock' ? 900 : 300);
}
async function sceneOut(tok){
  const el = OP.el; el.querySelector('.pr-msg').classList.add('off'); el.querySelector('.pr-op-cap').classList.remove('on');
  await tweenMos(1,14,450); if(tok !== OP.tok) return;
  el.querySelector('.pr-op-mos').classList.add('on'); await sleep(420);
  playScene(OP.si+1, tok);
}
async function opFinal(tok){
  const el = OP.el; el.querySelector('.pr-op-stage').style.opacity = '0';
  const fin = el.querySelector('.pr-op-final'), f1 = fin.querySelector('.pr-f1');
  const last = (typeof storyLines !== 'undefined' && storyLines.length && storyLines[storyLines.length-1].tx) || '── 30日間のサバイバルが始まる。';
  f1.textContent = ''; fin.classList.add('on'); SFX.chime();
  const chars = [...last];
  for(let i=1;i<=chars.length;i++){ if(tok !== OP.tok) return; f1.textContent = chars.slice(0,i).join(''); if(!RM) await sleep(70); }
  await opWait(2000, tok); if(tok !== OP.tok) return;
  finishOpening();
}
function opTap(){
  if(!OP.active || OP.done) return;
  ensureCtx();
  if(OP.waitR){ clearTimeout(OP.tm); const r = OP.waitR; OP.waitR = null; r(); return; }
  if(OP.typing){ finishTyping(OP.tok); return; }
  const msg = OP.el.querySelector('.pr-msg');
  if(!msg.classList.contains('off') && OP.cur){ SFX.page(); nextLine(OP.tok); }
}
function closeOpening(){
  if(!OP.el) return;
  OP.active = false; OP.tok++; clearInterval(OP.iv); clearTimeout(OP.tm);
  OP.el.classList.remove('on');
  setTimeout(()=>{ if(!OP.active){ cancelAnimationFrame(OP.raf); OP.el.style.display = 'none'; OP.S = null; } }, 650);
  const ss = $('story-screen'); if(ss) ss.classList.remove('pr-cine');
}
function finishOpening(){
  if(OP.done) return; OP.done = true;
  closeOpening();
  try{ window.goToGame(); }catch(e){ console.warn('[presentation] goToGame', e); }
}

/* ════════════════════════════════════════════════════════════════
   3) 日替わりカード
   ════════════════════════════════════════════════════════════════ */
// 幕の区切り。main/story.js がある場合は物語側の四幕構成（1/8/21/27日）と名前に合わせる
const ACTS_OWN = {
  1:{no:'第一幕', ttl:'沈む夜'}, 8:{no:'第二幕', ttl:'波間の声'}, 15:{no:'第三幕', ttl:'潮目'},
  22:{no:'第四幕', ttl:'急流'}, 28:{no:'終　幕', ttl:'這い上がる者'},
};
const ACTS_STORY = { 1:{no:'第一幕', ttl:'沈む夜'}, 8:{no:'第二幕', ttl:'波の下'}, 21:{no:'第三幕', ttl:'底'}, 27:{no:'終　幕', ttl:'夜明け'} };
const hasStory = () => !!(window.Story && typeof window.Story.pick === 'function' && typeof window.storyFlags === 'function');
function actFor(day){ return (hasStory() ? ACTS_STORY : ACTS_OWN)[day] || null; }
// その夜に物語シーンが入るか（入るなら物語側が日付と幕のカードを出す）
function storySceneFor(day){
  if(window.storyScenePending) return true;
  try{ return hasStory() && day <= 30 && !!window.Story.pick(day); }catch(e){ return false; }
}
const DAY_LINES = [null,
  '今夜から、三十日。', '同じ夜は、二度と来ない。', '眠い目をこすって、マイクの電源を入れる。', '雨は、まだ止まない。', '子どもの寝息だけが、時計より正確だ。', '工場の機械音が、耳の奥に残っている。', '一週間。まだ、沈んでいない。',
  '声は、どこまで届くのだろう。', '通知の音に、少しだけ救われる。', 'コメント欄に、見慣れた名前。', '借金の数字が、夢にまで出てきた。', '眠りの浅い夜が続く。', '画面の向こうも、きっと眠れない。', '二週間。波はまだ高い。',
  '潮の流れが、変わりはじめる。', '保全の勘が、少し冴えてきた。', '参考書に、付箋が増えた。', '「おつかれ」の一言が、沁みる。', '海の匂いのする夜だった。', '折り返しは、とうに過ぎた。', '三週間。体が、重い。',
  '壇ノ浦の潮は、速い。', '眠気と、借金と、赤いランプ。', '保育料の締め切りの日。', '給料日。小さな前進。', 'あと少し。あと少しだけ。', '夜が、少しだけ短く感じる。',
  'あと三夜。', '沈むか、這い上がるか。', '最後の夜。月末の審判が来る。'];
const ENDLESS_LINES = ['まだ、夜は続く。','壇ノ浦の向こうに、灯りが見える。','今夜も、誰かが待っている。','潮は、また満ちてくる。'];
const DC = { el:null, tm:0, active:false, resolve:null };
function currentAct(d){ const m = hasStory() ? ACTS_STORY : ACTS_OWN; let a = null; Object.keys(m).map(Number).sort((x,y)=>x-y).forEach(k=>{ if(d >= k) a = m[k]; }); return a; }
function weekLabel(d){ if(d>30) return 'ENDLESS NIGHT'; if(d<=7) return '第一週'; if(d<=14) return '第二週'; if(d<=21) return '第三週'; if(d<=28) return '第四週'; return '最終週'; }
function phaseOf(d){ return d>30 ? 4 : d<=7 ? 1 : d<=20 ? 2 : 3; }
function buildDayCard(){
  if(DC.el) return DC.el;
  const el = document.createElement('div'); el.className = 'pr-day'; el.setAttribute('aria-live','polite'); el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true');
  el.innerHTML = `<div class="pr-day-bg"></div><div class="pr-day-rain"></div><div class="pr-day-scan"></div><div class="pr-day-bar t"></div><div class="pr-day-bar b"></div>
    <div class="pr-day-in"><div class="pr-day-act"></div><div class="pr-day-acttl"></div><div class="pr-day-num"></div><div class="pr-day-hr"></div><div class="pr-day-wk"></div><div class="pr-day-line"></div></div>
    <div class="pr-day-tap">TAP ▶</div>`;
  document.body.appendChild(el);
  el.addEventListener('pointerdown', e=>{ e.preventDefault(); e.stopPropagation(); hideDayCard(); });
  DC.el = el; return el;
}
function showDayCard(day, opt){
  opt = opt || {};
  try{
    if(EN.active) return Promise.resolve();
    const el = buildDayCard(); clearTimeout(DC.tm); clearTimeout(DC.tm2);
    const pending = opt.pending != null ? opt.pending : storySceneFor(day);
    // 物語シーンが幕開けを担う夜は、こちらは通常の日付カードにして重複を避ける
    const act = !opt.noAct && !(pending && hasStory()) && actFor(day);
    const ph = phaseOf(day);
    el.dataset.ph = ph; el.classList.toggle('act', !!act);
    el.querySelector('.pr-day-act').textContent = act ? act.no : '';
    el.querySelector('.pr-day-acttl').textContent = act ? `「${act.ttl}」` : '';
    el.querySelector('.pr-day-num').innerHTML = `<small>DAY</small>${day}${day<=30?'<em>/30</em>':''}`;
    let wk = opt.sub || `― ${weekLabel(day)} ―`;
    if(!act && !opt.sub && day <= 30){ const a = currentAct(day); if(a) wk = `― ${weekLabel(day)} ・ ${a.no.replace('　','')}「${a.ttl}」 ―`; }
    el.querySelector('.pr-day-wk').textContent = wk;
    el.querySelector('.pr-day-line').textContent = opt.line || (day>30 ? ENDLESS_LINES[day % ENDLESS_LINES.length] : DAY_LINES[day] || '');
    el.classList.remove('on','out'); void el.offsetWidth; el.classList.add('on');
    DC.active = true; window.prDayCardActive = true;
    document.dispatchEvent(new CustomEvent('pr:daycard', {detail:{day, state:'start'}}));
    if(act) SFX.gong(); else if(ph===3) SFX.dread(); else SFX.chime();
    // 物語シーンが控えているときは短めにして譲る
    const dur = RM ? 1000 : act ? 1500 : (pending ? 1000 : 1250);
    // 実際に描画されてから時間を数える（重い端末でカードが見えないまま消えないように）
    const myTok = DC.tok = (DC.tok||0) + 1;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(DC.active && DC.tok === myTok){ clearTimeout(DC.tm); DC.tm = setTimeout(()=>hideDayCard(), dur); } }));
    DC.tm = setTimeout(()=>hideDayCard(), dur + 1500); // 保険
    return new Promise(r => { DC.resolve = r; });
  }catch(e){ console.warn('[presentation] day card', e); return Promise.resolve(); }
}
function hideDayCard(immediate){
  if(!DC.el || !DC.active) return;
  clearTimeout(DC.tm); DC.active = false; window.prDayCardActive = false;
  DC.el.classList.add('out');
  DC.tm2 = setTimeout(()=>{ DC.el.classList.remove('on','out'); }, immediate ? 0 : 300);
  if(immediate) DC.el.classList.remove('on','out');
  document.dispatchEvent(new CustomEvent('pr:daycard', {detail:{day: hasGs()?gs.day:0, state:'end'}}));
  const r = DC.resolve; DC.resolve = null; if(r) r();
}
// 他モジュール向け：カード終了を待てる
window.prDayCardDone = () => DC.active ? new Promise(r=>{ const f = e=>{ if(e.detail.state==='end'){ document.removeEventListener('pr:daycard', f); r(); } }; document.addEventListener('pr:daycard', f); }) : Promise.resolve();

/* ════════════════════════════════════════════════════════════════
   4) エンディング
   ════════════════════════════════════════════════════════════════ */
const EN = { el:null, active:false, stage:'', tok:0, raf:0, parts:[], cfg:null, waitR:null, info:null, shareArgs:null, anim:null, cmtIv:0, t0:0 };
const EFX = {
  rebirth: {kb:'up',   flash:'#fff6e8', tint:'radial-gradient(ellipse at 50% 20%,rgba(255,150,80,.28),transparent 70%)', rays:true, spawn:{mote:.5}, c:'#00e8c8', g:'rgba(0,232,200,.45)'},
  king:    {kb:'in',   flash:'#ffe8ff', tint:'radial-gradient(ellipse at 50% 80%,rgba(220,60,255,.25),transparent 70%)', spawn:{confetti:1.1}, comments:true, c:'#e8b830', g:'rgba(232,184,48,.5)'},
  engineer:{kb:'pan',  flash:'#fff0d0', tint:'radial-gradient(ellipse at 70% 30%,rgba(255,160,60,.22),transparent 70%)', spawn:{spark:2.2, mote:.15}, c:'#e8b830', g:'rgba(232,184,48,.5)'},
  father:  {kb:'in',   flash:'#fff4ec', tint:'radial-gradient(ellipse at 40% 30%,rgba(255,190,140,.25),transparent 70%)', rays:true, spawn:{bokeh:.3, mote:.25}, c:'#c89aff', g:'rgba(160,110,255,.5)'},
  debtfree:{kb:'up',   flash:'#ffffff', tint:'radial-gradient(ellipse at 50% 10%,rgba(255,220,150,.3),transparent 70%)', rays:true, spawn:{rain:5, mote:.35, bird:.012}, rainStop:2600, c:'#44ee88', g:'rgba(68,238,136,.45)'},
  normal:  {kb:'out',  flash:'#e8e4ff', tint:'radial-gradient(ellipse at 70% 10%,rgba(120,120,255,.2),transparent 70%)', spawn:{rain:2.5, mote:.08}, c:'#a77cf0', g:'rgba(138,82,212,.5)'},
  collapse:{kb:'down', flash:'#200008', tint:'radial-gradient(ellipse at 50% 100%,rgba(160,0,40,.3),transparent 70%)', spawn:{rain:9, bubble:.5}, glitch:true, bad:true, c:'#e83055', g:'rgba(232,48,85,.5)'},
  bankrupt:{kb:'out',  flash:'#101018', tint:'linear-gradient(180deg,rgba(90,90,120,.25),transparent)', spawn:{rain:6, bill:.2}, bad:true, c:'#e83055', g:'rgba(232,48,85,.45)'},
  flame:   {kb:'in',   flash:'#300800', tint:'radial-gradient(ellipse at 50% 100%,rgba(255,70,20,.32),transparent 70%)', spawn:{ember:1.8}, glitch:true, bad:true, c:'#ff5a3a', g:'rgba(255,90,58,.5)'},
};
function buildEnd(){
  if(EN.el) return EN.el;
  const el = document.createElement('div'); el.className = 'pr-end'; el.setAttribute('aria-live','polite'); el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-label','エンディング');
  el.innerHTML = `
    <div class="pr-end-bg"></div><div class="pr-end-tint"></div><div class="pr-end-rays"></div>
    <canvas class="pr-end-fx"></canvas>
    <div class="pr-end-main">
      <div class="pr-end-pic"><img alt=""></div>
      <div class="pr-end-text"><div class="pr-end-label">― ENDING ―</div><div class="pr-end-ttl"></div><div class="pr-end-lines"></div></div>
    </div>
    <div class="pr-end-card"><div class="pr-c1">ENDING</div><div class="pr-c2"></div><div class="pr-c3"></div></div>
    <div class="pr-cr"><div class="pr-cr-roll"></div></div>
    <div class="pr-cr-quote"><div class="q">沈むか、這い上がるか。</div><div class="f"></div></div>
    <div class="pr-end-final"><div class="pr-fpic"></div><div class="pr-fttl"></div><div class="pr-fcnt"></div><div class="pr-fbar"><i></i></div><button class="pr-share" type="button">📤 結果カードを見る・共有する</button></div>
    <div class="pr-end-vig"></div><div class="pr-end-scan"></div><div class="pr-end-flash"></div>
    <div class="pr-end-ctl">TAP ▶ 次へ</div>
    <button class="pr-skip" type="button">SKIP ▶▶</button>`;
  document.body.appendChild(el);
  EN.el = el; EN.cv = el.querySelector('.pr-end-fx'); EN.ctx = EN.cv.getContext('2d');
  el.querySelector('.pr-skip').addEventListener('click', e=>{ e.stopPropagation(); SFX.decide(); endFinal(EN.tok); });
  el.querySelector('.pr-share').addEventListener('click', e=>{ e.stopPropagation(); SFX.decide(); openShare(); });
  el.addEventListener('pointerdown', e=>{ if(e.target.closest('button')) return; endTap(); });
  window.addEventListener('keydown', e=>{
    if(!EN.active || e.defaultPrevented) return;
    if(EN.stage==='final'){
      if(e.key==='ArrowDown' || e.key==='ArrowUp'){
        e.preventDefault();
        const bs = [...EN.el.querySelectorAll('.pr-end-final button')].filter(b=>b.offsetParent);
        if(!bs.length) return;
        const i = bs.indexOf(document.activeElement);
        const n = i<0 ? 0 : (i + (e.key==='ArrowDown'?1:-1) + bs.length) % bs.length;
        bs[n].focus(); SFX.cursor();
      }
      return;
    }
    if(e.key==='Escape'){ e.preventDefault(); endFinal(EN.tok); }
    else if(['Enter',' ','z','Z'].includes(e.key)){ e.preventDefault(); endTap(); }
  });
  window.addEventListener('resize', fitFx);
  return el;
}
function fitFx(){ if(!EN.cv) return; const s = 2; EN.cv.width = Math.ceil(innerWidth/s); EN.cv.height = Math.ceil(innerHeight/s); }
function setStage(s){ EN.stage = s; ['s-card','s-main','s-credits','s-final'].forEach(c=>EN.el.classList.remove(c)); if(s) EN.el.classList.add('s-'+s); }
function endWait(ms, tok){ return new Promise(r=>{ const done = ()=>{ clearTimeout(t); if(EN.waitR===done) EN.waitR = null; r(tok===EN.tok); }; const t = setTimeout(done, RM ? Math.min(ms, 1500) : ms); EN.waitR = done; }); }
function endTap(){ ensureCtx(); if(EN.waitR){ EN.waitR(); return; } if(EN.stage==='credits' && EN.anim){ EN.anim.playbackRate = EN.anim.playbackRate > 1 ? 1 : 5; } }
function epilogueLines(type){
  const out = [];
  try{
    if(typeof window.storyFlags === 'function'){
      const f = window.storyFlags() || {};
      const ep = f.epilogue || f.epilogueLines;
      if(Array.isArray(ep)) out.push(...ep.filter(x=>typeof x==='string').slice(0,2));
      else if(typeof ep === 'string') out.push(ep);
    }
  }catch(e){}
  if(out.length || !hasGs()) return out.slice(0,2);
  const bad = EFX[type] && EFX[type].bad;
  const ls = (gs.listeners||[]).slice().sort((a,b)=>(b.trust||0)-(a.trust||0));
  if(bad){
    out.push({collapse:'マイクの電源ランプだけが、まだ点いている。', bankrupt:'空っぽの机の上に、子どもの描いた絵が一枚残っていた。', flame:'通知は、もう鳴らない。それでも子どもは「おはよう」と言った。'}[type] || '夜は、いつか明ける。');
  } else {
    if(ls[0] && (ls[0].trust||0) > 0) out.push(`「${ls[0].name}」は、最後の夜もコメントをくれた。`);
    out.push(gs.childStress < 40 ? '子どもは今夜も、小さな寝息を立てている。' : '眠る子どもの顔を、しばらく見ていた。');
  }
  return out.slice(0,2);
}
function startEnding(info){
  buildEnd(); fitFx(); ensureCtx();
  hideDayCard(true); closeOpening();
  const tok = ++EN.tok; EN.active = true; EN.info = info; EN.shareArgs = null;
  const cfg = EN.cfg = EFX[info.type] || EFX.normal;
  const el = EN.el;
  el.style.setProperty('--pr-ec', cfg.c); el.style.setProperty('--pr-ecg', cfg.g);
  el.classList.toggle('rays', !!cfg.rays); el.classList.toggle('pr-glitch', !!cfg.glitch && !RM);
  el.querySelector('.pr-end-bg').style.backgroundImage = info.img ? `url("${info.img}")` : 'none';
  el.querySelector('.pr-end-tint').style.background = cfg.tint;
  const pic = el.querySelector('.pr-end-pic'), img = pic.querySelector('img');
  pic.style.display = info.img ? '' : 'none';
  img.className = ''; if(info.img) img.src = info.img;
  const col = info.color || cfg.c;
  el.querySelector('.pr-end-ttl').textContent = info.title; el.querySelector('.pr-end-ttl').style.color = col;
  el.querySelector('.pr-c2').textContent = info.title; el.querySelector('.pr-end-card').style.color = col;
  el.querySelector('.pr-end-lines').innerHTML = '';
  el.querySelector('.pr-cr-quote').classList.remove('on');
  el.querySelector('.pr-end-main').scrollTop = 0;
  // 既存のボタン群を最終画面へ移す
  const eb = $('end-buttons'); if(eb){ EN.ebHome = EN.ebHome || eb.parentNode; el.querySelector('.pr-end-final').appendChild(eb); }
  EN.parts = []; EN.t0 = performance.now(); EN.rainOn = true;
  setStage('');
  el.style.display = 'block'; void el.offsetWidth; el.classList.add('on');
  cancelAnimationFrame(EN.raf); fxLoop();
  runEnding(tok);
}
async function runEnding(tok){
  const el = EN.el, cfg = EN.cfg, info = EN.info;
  await sleep(500); if(tok!==EN.tok) return;
  // 導入：白飛び（グッド）／ノイズ（バッド）
  const fl = el.querySelector('.pr-end-flash'); fl.style.background = cfg.flash; fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  if(cfg.bad) SFX.dread(); else SFX.glory();
  setStage('card');
  if(!await endWait(2600, tok)) return;
  setStage('main');
  const img = el.querySelector('.pr-end-pic img'); if(!RM) img.className = 'pr-kb-' + cfg.kb;
  if(cfg.comments) startComments(tok);
  if(cfg.rainStop) setTimeout(()=>{ if(tok===EN.tok) EN.rainOn = false; }, cfg.rainStop);
  if(!await endWait(1300, tok)) return;
  // 本文を一行ずつ
  const box = el.querySelector('.pr-end-lines'), main = el.querySelector('.pr-end-main');
  const lines = String(info.body || '').split('\n');
  const add = (txt, cls) => { const d = document.createElement('div'); d.className = 'pr-el ' + (cls||''); d.textContent = txt; box.appendChild(d); requestAnimationFrame(()=>d.classList.add('on')); try{ d.scrollIntoView({block:'nearest', behavior: RM?'auto':'smooth'}); }catch(e){} return d; };
  for(const ln of lines){
    if(tok!==EN.tok) return;
    if(!ln.trim()){ add('','gap'); if(!await endWait(380, tok)) return; continue; }
    const q = /^──/.test(ln.trim());
    add(ln, q ? 'quote' : '');
    if(q) SFX.page();
    if(!await endWait(q ? 2200 : 1100 + [...ln].length*45, tok)) return;
  }
  const ep = epilogueLines(info.type);
  if(ep.length){
    add('― その後 ―','epi-h'); if(!await endWait(700, tok)) return;
    for(const e of ep){ add(e,'epi'); if(!await endWait(1500 + [...e].length*40, tok)) return; }
  }
  if(!await endWait(2600, tok)) return;
  await rollCredits(tok);
}
function creditsHTML(){
  const info = EN.info; const g = hasGs() ? gs : null;
  const day = info.day || (g ? g.day : 30);
  const names = g && Array.isArray(g.listeners) ? g.listeners.map(l=>l.name) : ['夜空の旅人','ひとりぼっち','深夜の常連','さくら'];
  const st = g ? `<div class="st"><span>過ごした夜</span><b>${day} 夜</b><span>フォロワー</span><b>${(g.followers||0).toLocaleString()} 人</b><span>配信回数</span><b>${g.streamCount||0} 回</b><span>残りの借金</span><b>¥${Math.max(0,g.debt||0).toLocaleString()}</b></div>` : '';
  return `
    <div class="big">だんのうら</div><div class="s">― 深夜、繋がりの海へ ―</div>
    <div class="h">ENDING</div><div class="tl" style="color:${esc(info.color||'#fff')}">${esc(info.title)}</div>
    <div class="h">RECORD</div>${st}
    <div class="h">CAST</div><div class="n">だんのうら</div><div class="s">設備保全技術者・深夜配信者・ひとりの親</div><div class="n">子ども</div><div class="s">いちばん小さな、いちばん大事なリスナー</div>
    <div class="h">STAFF</div><div class="s">企画・脚本・制作</div><div class="n">だんのうら制作班</div><div class="s">音楽・効果音</div><div class="n">深夜の雨音とノイズ</div><div class="s">舞台</div><div class="n">壇ノ浦 ― 関門の海</div>
    <div class="h">SPECIAL THANKS</div><div class="s">深夜のリスナーのみなさん</div>${names.map(n=>`<div class="n">${esc(n)}</div>`).join('')}
    <div class="s" style="margin-top:14px">そして ―― 画面の向こうの、あなたへ。</div>
    <div style="height:30vh"></div>`;
}
async function rollCredits(tok){
  if(tok!==EN.tok) return;
  const el = EN.el, roll = el.querySelector('.pr-cr-roll');
  roll.innerHTML = creditsHTML();
  setStage('credits');
  const H = innerHeight, rh = roll.scrollHeight;
  if(RM){ roll.style.transform = 'none'; if(!await endWait(6000, tok)) return; }
  else{
    const dur = (H + rh) / 52 * 1000;
    try{
      EN.anim = roll.animate([{transform:`translateY(${H}px)`},{transform:`translateY(${-rh}px)`}], {duration:dur, easing:'linear', fill:'forwards'});
      await Promise.race([EN.anim.finished, new Promise(r=>{ const iv = setInterval(()=>{ if(tok!==EN.tok){ clearInterval(iv); r(); } }, 200); EN.anim.finished.then(()=>clearInterval(iv), ()=>clearInterval(iv)); })]);
    }catch(e){}
    EN.anim = null;
  }
  if(tok!==EN.tok) return;
  const q = el.querySelector('.pr-cr-quote'); q.querySelector('.f').textContent = EN.cfg.bad ? '― TO BE CONTINUED ―' : '― FIN ―';
  q.classList.add('on'); SFX.gong();
  if(!await endWait(3400, tok)) return;
  q.classList.remove('on');
  endFinal(tok);
}
function endFinal(tok){
  if(tok!==EN.tok || !EN.active) return;
  EN.tok++; // 以降の演出を止める
  if(EN.anim){ try{ EN.anim.cancel(); }catch(e){} EN.anim = null; }
  if(EN.waitR){ const r = EN.waitR; EN.waitR = null; r(); }
  const el = EN.el, info = EN.info;
  el.querySelector('.pr-cr-quote').classList.remove('on');
  el.querySelector('.pr-fpic').style.backgroundImage = info.img ? `url("${info.img}")` : 'none';
  el.querySelector('.pr-fpic').style.display = info.img ? '' : 'none';
  const ft = el.querySelector('.pr-fttl'); ft.textContent = info.title; ft.style.color = info.color || EN.cfg.c;
  let n = 0, tot = 9;
  try{ const seen = loadSeenEndings(); tot = ENDING_LIST.length; n = ENDING_LIST.filter(e=>seen[e.type]).length; }catch(e){}
  el.querySelector('.pr-fcnt').textContent = `ENDING COLLECTION  ${n} / ${tot}`;
  el.querySelector('.pr-fbar i').style.width = (n/tot*100) + '%';
  setStage('final');
  setTimeout(()=>{ try{ const b = [...el.querySelectorAll('.pr-end-final button')].find(x=>x.offsetParent); if(b) b.focus({preventScroll:true}); }catch(e){} }, 600);
}
function openShare(){
  const a = EN.shareArgs || [EN.info.type, hasGs() ? (gs._endless || gs.day > 30) : true];
  try{ (_prevShare || window.showSharePanel)(a[0], a[1]); }catch(e){ console.warn('[presentation] share', e); }
}
function closeEnding(){
  if(!EN.el || !EN.active) return;
  EN.active = false; EN.tok++; clearInterval(EN.cmtIv);
  if(EN.anim){ try{ EN.anim.cancel(); }catch(e){} EN.anim = null; }
  EN.el.classList.remove('on');
  const eb = $('end-buttons'); if(eb && EN.ebHome && eb.parentNode !== EN.ebHome) EN.ebHome.appendChild(eb);
  setTimeout(()=>{ if(!EN.active){ cancelAnimationFrame(EN.raf); EN.el.style.display = 'none'; setStage(''); } }, 850);
}
function startComments(tok){
  const msgs = ['また来ます','いつも聴いてます','声、好きです','ありがとう','おつかれ！','888888','今夜も最高','……ありがと'];
  const names = hasGs() && gs.listeners ? gs.listeners.map(l=>l.name) : ['夜空の旅人'];
  clearInterval(EN.cmtIv);
  EN.cmtIv = setInterval(()=>{
    if(tok!==EN.tok || !EN.active){ clearInterval(EN.cmtIv); return; }
    if(EN.stage!=='main') return;
    const d = document.createElement('div'); d.className = 'pr-cmt';
    d.textContent = `${names[Math.floor(Math.random()*names.length)]}：${msgs[Math.floor(Math.random()*msgs.length)]}`;
    d.style.left = (4 + Math.random()*60) + '%'; d.style.bottom = (8 + Math.random()*30) + '%';
    EN.el.appendChild(d); setTimeout(()=>d.remove(), 5100);
  }, RM ? 2400 : 900);
}
// ── パーティクル ──
function spawn(kind, W, H){
  const r = Math.random;
  switch(kind){
    case 'rain':     return {x:r()*W*1.1, y:-10, vx:-.6, vy:5+r()*3, l:4+r()*5|0};
    case 'mote':     return {x:r()*W, y:H+4, vx:(r()-.5)*.3, vy:-(.2+r()*.5), life:300+r()*200, c:r()<.5?'#ffe0a0':'#ffffff', ph:r()*6};
    case 'confetti': return {x:r()*W, y:-6, vx:(r()-.5)*.8, vy:.6+r()*1.2, c:['#ff4fa8','#38f0e0','#ffd27a','#b06cff','#ffffff'][r()*5|0], ph:r()*6, life:900};
    case 'spark':    return {x:W*(.55+r()*.45), y:H*(r()*.35), vx:-(.5+r()*2), vy:-r()*1.5, life:40+r()*40, c:r()<.6?'#ffcc5a':'#fff4c0'};
    case 'bokeh':    return {x:r()*W, y:H+10, vx:(r()-.5)*.2, vy:-(.1+r()*.25), s:3+r()*6|0, life:900, c:r()<.5?'rgba(255,190,140,':'rgba(255,230,190,', ph:r()*6};
    case 'bird':     return {x:-10, y:H*(.1+r()*.25), vx:.6+r()*.4, vy:0, life:2000, ph:r()*6};
    case 'bubble':   return {x:r()*W, y:H+6, vx:0, vy:-(.3+r()*.6), s:1+r()*2|0, life:900, ph:r()*6};
    case 'bill':     return {x:r()*W, y:-8, vx:(r()-.5)*.5, vy:.4+r()*.5, life:1200, ph:r()*6};
    case 'ember':    return {x:r()*W, y:H+4, vx:(r()-.5)*.6, vy:-(.6+r()*1.2), life:120+r()*160, c:r()<.5?'#ff6a2a':'#ffb040', ph:r()*6};
  }

}
function fxLoop(){
  EN.raf = requestAnimationFrame(fxLoop);
  if(document.hidden || !EN.cfg) return;
  const now = performance.now(); if(now - (EN.last||0) < 31) return; EN.last = now;
  const c = EN.ctx, W = EN.cv.width, H = EN.cv.height, cfg = EN.cfg;
  c.clearRect(0,0,W,H);
  if(RM && EN._fxDrawn) return;
  const sp = cfg.spawn || {};
  for(const k in sp){
    if(k==='rain' && !EN.rainOn) continue;
    let n = sp[k] * (RM ? .3 : 1);
    while(n > 0){ if(n >= 1 || Math.random() < n){ const p = spawn(k, W, H); if(p){ p.k = k; EN.parts.push(p); } } n -= 1; }
  }
  if(EN.parts.length > 900) EN.parts.splice(0, EN.parts.length - 900);
  const t = performance.now()/1000;
  for(let i=EN.parts.length-1;i>=0;i--){
    const p = EN.parts[i];
    p.x += p.vx; p.y += p.vy; if(p.life !== undefined) p.life--;
    if(p.y > H+12 || p.y < -14 || p.x < -14 || p.x > W+14 || p.life <= 0){ EN.parts.splice(i,1); continue; }
    switch(p.k){
      case 'rain': c.fillStyle = 'rgba(170,165,240,.45)'; c.fillRect(p.x|0, p.y|0, 1, p.l); break;
      case 'mote': { const a = .4+.4*Math.sin(t*3+p.ph); c.globalAlpha = Math.max(0,Math.min(1,a*Math.min(1,p.life/80))); c.fillStyle = p.c; c.fillRect(p.x|0,p.y|0,1,1); c.globalAlpha = 1; p.x += Math.sin(t+p.ph)*.15; break; }
      case 'confetti': { const f = Math.sin(t*6+p.ph) > 0; c.fillStyle = p.c; c.fillRect(p.x|0,p.y|0, f?2:1, f?1:2); p.x += Math.sin(t*2+p.ph)*.3; break; }
      case 'spark': c.fillStyle = p.c; c.fillRect(p.x|0,p.y|0,1,1); if(p.life>30) c.fillRect((p.x-p.vx)|0,(p.y-p.vy)|0,1,1); p.vy += .06; break;
      case 'bokeh': { const a = .18+.12*Math.sin(t+p.ph); c.fillStyle = p.c + a + ')'; c.beginPath(); c.arc(p.x,p.y,p.s,0,6.3); c.fill(); break; }
      case 'bird': { const f = Math.sin(t*8+p.ph) > 0; const x = p.x|0, y = (p.y + Math.sin(t+p.ph)*2)|0; c.fillStyle = '#2a2040'; c.fillRect(x,y,1,1); c.fillRect(x-1,y-(f?1:0),1,1); c.fillRect(x+1,y-(f?1:0),1,1); c.fillRect(x-2,y-(f?2:0),1,1); c.fillRect(x+2,y-(f?2:0),1,1); break; }
      case 'bubble': { p.x += Math.sin(t*2+p.ph)*.25; c.strokeStyle = 'rgba(180,200,255,.4)'; c.strokeRect((p.x|0)+.5,(p.y|0)+.5,p.s+1,p.s+1); break; }
      case 'bill': { const f = Math.sin(t*3+p.ph); p.x += f*.5; c.fillStyle = f > 0 ? 'rgba(200,190,170,.7)' : 'rgba(150,140,130,.7)'; c.fillRect(p.x|0,p.y|0, f>0?5:3, 3); c.fillStyle='rgba(90,120,90,.7)'; c.fillRect((p.x|0)+1,(p.y|0)+1,1,1); break; }
      case 'ember': { p.x += Math.sin(t*3+p.ph)*.35; c.globalAlpha = Math.min(1, p.life/60); c.fillStyle = p.c; c.fillRect(p.x|0,p.y|0,1,1); c.globalAlpha = 1; break; }
    }
  }
  EN._fxDrawn = true;
}

/* ════════════════════════════════════════════════════════════════
   5) 既存関数のラップ
   ════════════════════════════════════════════════════════════════ */
function wrap(name, make){
  const prev = window[name];
  if(typeof prev !== 'function') return null;
  window[name] = make(prev);
  return prev;
}
// 序章：元処理（音声の解錠・画面切替・テキスト）を通してから演出を被せる
wrap('startStory', prev => function(){
  const r = prev.apply(this, arguments);
  try{ startOpening(); }catch(e){ console.warn('[presentation] opening', e); }
  return r;
});
// ゲーム開始：演出を閉じ、第一幕カード
wrap('goToGame', prev => function(){
  OP.done = true; closeOpening();
  const r = prev.apply(this, arguments);
  try{ if(hasGs()) showDayCard(gs.day); }catch(e){}
  return r;
});
// 日替わり：nextDayの冒頭でカードを出す（ポップアップや物語シーンはカードの後ろで準備され、カード明けに見える）
wrap('nextDay', prev => function(){
  let day = 0, show = false;
  try{ day = gs.day + 1; show = !EN.active && (day <= 30 || gs._endless); }catch(e){}
  if(show) showDayCard(day);
  const r = prev.apply(this, arguments);
  if(EN.active) hideDayCard(true);
  return r;
});
// つづきから：現在の日のカード
wrap('loadGame', prev => function(){
  const r = prev.apply(this, arguments);
  try{ if(r && hasGs()) showDayCard(gs.day, {noAct: true, sub: `― ${weekLabel(gs.day)} ・ つづきから ―`}); }catch(e){}
  return r;
});
// セーブ削除後、つづきからを隠す（checkSaveDataはデータ無しのとき何もしないため）
wrap('deleteSave', prev => function(){
  const r = prev.apply(this, arguments);
  try{
    let has = false; try{ has = !!localStorage.getItem(typeof SAVE_KEY !== 'undefined' ? SAVE_KEY : 'dannoura_save_v1'); }catch(e){}
    if(!has){ const b = $('btn-continue'), w = $('btn-delete-wrap'); if(b) b.style.display = 'none'; if(w) w.style.display = 'none'; T.cur = 0; refreshItems(); }
  }catch(e){}
  return r;
});
// エンディング
wrap('triggerEnding', prev => function(forced){
  hideDayCard(true);
  const r = prev.apply(this, arguments);
  try{
    const title = $('end-title').textContent;
    let type = forced;
    try{ const hit = ENDING_LIST.find(e=>e.name===title); if(hit) type = hit.type; }catch(e){}
    if(!EFX[type]) type = 'normal';
    const isFinal = hasGs() ? (gs._endless || gs.day > 30) : false;
    const day = hasGs() ? (forced ? gs.day : gs.day - 1) : 30;
    startEnding({type, title, body: $('end-body').textContent, color: $('end-title').style.color, img: $('end-img').getAttribute('src') || '', day, isFinal});
  }catch(e){ console.warn('[presentation] ending', e); }
  return r;
});
// 共有パネルの自動表示はエンディング演出中は保留（最終画面のボタンから開く）
const _prevShare = wrap('showSharePanel', prev => function(endType, isFinal){
  if(EN.active){ EN.shareArgs = [endType, isFinal]; return; }
  return prev.apply(this, arguments);
});
wrap('startEndlessMode', prev => function(){
  closeEnding();
  return prev.apply(this, arguments);
});
// 他スクリプトから状態を確認できるように
window.PR = { showDayCard, hideDayCard, startOpening, finishOpening, endingActive: () => EN.active, openingActive: () => OP.active };

/* ───────────────────────── 起動 ───────────────────────── */
function boot(){
  try{ injectStyle(); }catch(e){ console.warn('[presentation] style', e); }
  try{ buildTitle(); }catch(e){ console.warn('[presentation] title', e); const ts = $('title-screen'); if(ts) ts.classList.remove('pr-on'); }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
