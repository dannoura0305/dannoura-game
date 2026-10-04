// ═══════════════════════════════════════════════════════════
// 家・庭づくり：見下ろし2Dグリッドの描画
//   HOME.layout(area, T)                 → {w,h,T,band,cw,ch}  キャンバスの大きさと床の原点
//   HOME.renderArea(ctx, area, opts)     → 床・壁・配置・人物・プレビューを描く
//   HOME.snapshot(area, {placements, plants, scale, lit, night, season, weather, chars, look}) → HTMLCanvasElement
//   フェーズ3：庭の上端は家の正面（屋根・壁・戸口・窓）。季節・天候（opts.season / opts.weather）と外観・内装（opts.look）を描き分ける
// 絵は HOME_ART（sprites.js）に任せ、無いときは色つきの箱で代用する（例外を出さない）
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const ART=()=>root.HOME_ART||null;
const CAT=id=>HOME.CATALOG&&HOME.CATALOG[id];
// 壁の飾り：HOME_ART は床の0行目を基準に上へ描く。代用の箱は壁帯の中に描く
function wallPy(L){const a=ART();return a&&typeof a.drawItem==='function'?L.band:L.band-L.T-6;}
const LAYER_ORDER={rug:0,path:0,wall:1,furniture:2};

HOME.layout=function(area,T){
  T=T||32;const A=HOME.AREAS[area]||HOME.AREAS.room;
  // 壁帯：部屋＝壁掛けの絵（床0行目から上へ約1.8マス）が収まる高さ。庭＝家の正面（屋根つき）
  const band=area==='garden'?T*3:T*2;
  return{w:A.w,h:A.h,T,band,cw:A.w*T,ch:A.h*T+band};
};

// ── 代用の絵（HOME_ART が無い・失敗したとき） ──
const FB={
  'furniture.desk_small':'#a0703c','furniture.wood_chair':'#b07a40','furniture.repaired_shelf':'#8a6a48','furniture.bookshelf':'#7a4e2a',
  'furniture.futon':'#e8e2f0','furniture.cushion':'#e07090','furniture.low_table':'#9a6436','light.desk_lamp':'#f0c060',
  'light.shell_lantern':'#f2d6c0','memento.child_drawing':'#f8f0d8','memento.bear':'#b07850','memento.flower_tag':'#f0e0b0',
  'garden.pot':'#c0603a','garden.flowerbed':'#6a4a2a','garden.bench':'#a87038','garden.fence':'#c8a070','garden.stepping_stone':'#9a9aa2',
  'garden.small_tree':'#3f8f4a','deco.rug':'#7d64c8','deco.sea_glass':'#7ad8d0',
  'furniture.toy_box':'#e8a0b0','furniture.kid_desk':'#f2d6a6','furniture.old_radio':'#9a6638','memento.toolbox':'#d04a4a',
  'memento.recital_photo':'#f4efe6','deco.wind_chime':'#9ff0e0','deco.sea_mobile':'#4fc8bc','garden.nameplate':'#f4e2c0',
  'garden.clothesline':'#efe2c8','light.string_lights':'#ffd98a','garden.planter':'#d9a066','garden.watering_can':'#9cc4dc',
};
const POT={red:'#c0503a',blue:'#4a6ac8',yellow:'#d8b030'};
function fbItem(ctx,itemId,o){
  const c=CAT(itemId);const f=HOME.footprint(itemId,o.rotation);
  const T=o.T,w=f.w*T,h=f.h*T,x=o.px,y=o.py;
  ctx.save();
  if(o.ghost)ctx.globalAlpha*=.6;
  const col=itemId==='garden.pot'?(POT[o.variant]||POT.red):(FB[itemId]||'#888');
  const flat=c&&(c.layer==='rug'||c.layer==='path');
  const ins=flat?2:4;
  ctx.fillStyle=col;
  if(c&&c.layer==='path'){ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,w/2-4,h/2-6,0,0,Math.PI*2);ctx.fill();}
  else ctx.fillRect(x+ins,y+ins,w-ins*2,h-ins*2);
  if(!flat){ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(x+ins,y+h-ins-4,w-ins*2,4);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(x+ins,y+ins,w-ins*2,3);}
  ctx.strokeStyle='rgba(20,10,30,.7)';ctx.lineWidth=1;ctx.strokeRect(x+ins+.5,y+ins+.5,w-ins*2-1,h-ins*2-1);
  if(o.plant){
    const st=o.plant.stage|0;
    ctx.fillStyle='#3f9a4a';ctx.fillRect(x+T/2-1,y+T/2-4-st*2,2,6+st*2);
    if(st>=3){ctx.fillStyle=o.plant.color==='yellow'?'#f0d040':o.plant.color==='blue'?'#6aa0ff':'#ff7a9a';ctx.beginPath();ctx.arc(x+T/2,y+T/2-6-st*2,st>=4?5:3,0,Math.PI*2);ctx.fill();}
  }
  if(o.lit){ctx.fillStyle='#fff3b0';ctx.beginPath();ctx.arc(x+w/2,y+h/2,4,0,Math.PI*2);ctx.fill();}
  if(!flat&&c&&T>=24){
    ctx.fillStyle='rgba(20,10,30,.85)';ctx.font=`${Math.round(T*.34)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(c.name.slice(0,1),x+w/2,y+h/2+1);
  }
  ctx.restore();
}
function fbChar(ctx,who,dir,frame,px,py,T,pose){
  const kid=who==='kid';
  const s=T/32,bob=(frame%2)*s;
  if(pose==='sleep'){ctx.save();ctx.fillStyle='#3a2418';ctx.beginPath();ctx.arc(px+T,py+T*.4,6*s,0,Math.PI*2);ctx.fill();ctx.restore();return;}
  const BODY={kid:'#9fe2c8',dan:'#5a4a8a',chiyo:'#8e5a84',hancho:'#4b5b78'},HAIR={kid:'#3a2418',dan:'#2a2030',chiyo:'#dcd8e6',hancho:'#f5c22a'};
  const cx=px+T/2;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(cx,py+T-3*s,9*s,3*s,0,0,Math.PI*2);ctx.fill();
  const bh=(kid?12:18)*s,hr=(kid?6:6.5)*s;
  const by=py+T-4*s-bh-(pose==='sit'?-4*s:0)+bob;
  ctx.fillStyle=BODY[who]||'#5a4a8a';ctx.fillRect(cx-(kid?6:8)*s,by,(kid?12:16)*s,bh);
  ctx.fillStyle='#f3d2b8';ctx.beginPath();ctx.arc(cx,by-hr+1*s,hr,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=HAIR[who]||'#2a2030';ctx.beginPath();ctx.arc(cx,by-hr-1*s,hr,Math.PI,Math.PI*2);ctx.fill();
  if(dir!=='up'){ctx.fillStyle='#20141c';ctx.fillRect(cx-3*s,by-hr,1.5*s,2*s);ctx.fillRect(cx+1.5*s,by-hr,1.5*s,2*s);}
  ctx.restore();
}
function drawItem(ctx,itemId,o){
  const a=ART();
  if(a&&typeof a.drawItem==='function'){
    try{a.drawItem(ctx,itemId,o);return;}catch(e){}
  }
  fbItem(ctx,itemId,o);
}
function drawChar(ctx,c,px,py,T,t){
  const a=ART();
  const frame=c.frame!==undefined?c.frame:(c.moving?Math.floor(t*6)%4:0);
  const pose=(c.moving&&(!c.pose||c.pose==='stand'))?'walk':(c.pose||'stand');
  if(a&&typeof a.drawChar==='function'){
    try{a.drawChar(ctx,c.who,c.dir||'down',frame,px,py,T,pose);return;}catch(e){}
  }
  fbChar(ctx,c.who,c.dir||'down',frame,px,py,T,c.pose||'stand');
}
function drawTile(ctx,id,px,py,T,gx,gy,o){
  const a=ART();
  if(a&&typeof a.drawTile==='function'){try{a.drawTile(ctx,id,px,py,T,gx,gy,o);return;}catch(e){}}
  if(id==='ground.grass'){
    ctx.fillStyle=(gx+gy)%2?'#5f9a4c':'#66a352';ctx.fillRect(px,py,T,T);
    ctx.fillStyle='#7cb85e';ctx.fillRect(px+((gx*7+gy*3)%5)*5+3,py+((gx*5+gy*11)%5)*5+4,2,3);
  }else{
    ctx.fillStyle=gy%2?'#b98a58':'#c29560';ctx.fillRect(px,py,T,T);
    ctx.fillStyle='rgba(90,55,25,.35)';ctx.fillRect(px,py+T-1,T,1);
    ctx.fillRect(px+((gy*13)%T),py,1,T);
  }
}
function drawBand(ctx,area,L,o,K){
  const T=L.T;
  const a=ART();
  if(area==='room'){
    if(a&&typeof a.drawWall==='function'){try{a.drawWall(ctx,0,0,L.cw,L.band,T,{night:o.wallNight!==undefined?!!o.wallNight:!!o.night,wallpaper:K.look.wallpaper,weather:K.weather,season:K.season});return;}catch(e){}}
    ctx.fillStyle='#d9cdb4';ctx.fillRect(0,0,L.cw,L.band);
    ctx.fillStyle='#c4b596';for(let x=0;x<L.cw;x+=8)ctx.fillRect(x,0,1,L.band);
    ctx.fillStyle='#8a6440';ctx.fillRect(0,L.band-6,L.cw,6);
    // 窓
    const wx=7*T,wy=4;ctx.fillStyle='#6a5030';ctx.fillRect(wx-2,wy-2,T*1.5+4,L.band-14);
    ctx.fillStyle=o.night?'#1c2450':'#9fd0f0';ctx.fillRect(wx,wy,T*1.5,L.band-18);
    ctx.fillStyle='#6a5030';ctx.fillRect(wx+T*.75-1,wy,2,L.band-18);
    if(o.night){ctx.fillStyle='#fff6c0';ctx.fillRect(wx+T*1.1,wy+5,3,3);}
  }else{
    if(a&&typeof a.drawHouse==='function'){try{a.drawHouse(ctx,0,0,L.cw,L.band,T,houseOpts(o,K,false));return;}catch(e){}}
    // 家の外壁（戸口つき）
    ctx.fillStyle='#8a6a4e';ctx.fillRect(0,0,L.cw,L.band);
    ctx.fillStyle='#7a5c42';for(let y=0;y<L.band;y+=8)ctx.fillRect(0,y,L.cw,2);
    ctx.fillStyle='#4a3a32';ctx.fillRect(0,0,L.cw,6);
    const d=HOME.AREAS.garden.door;
    ctx.fillStyle='#3a2a20';ctx.fillRect(d.x*T+3,6,T-6,L.band-6);
    ctx.fillStyle=o.night?'#f0c870':'#c8a070';ctx.fillRect(d.x*T+6,10,T-12,L.band-12);
    ctx.fillStyle='#6a4a30';ctx.fillRect(d.x*T+T-11,L.band/2+2,3,3);
    [[3,'win'],[11,'win']].forEach(([x])=>{ctx.fillStyle='#5a4030';ctx.fillRect(x*T-2,8,T+4,L.band-20);ctx.fillStyle=o.night?'#f0c870':'#9fd0f0';ctx.fillRect(x*T,10,T,L.band-24);});
  }
}
function houseOpts(o,K,glow){
  const ex=K.look.exterior||{};
  return{roof:ex.roof,wall:ex.wall,door:ex.door,doorX:HOME.AREAS.garden.door.x,night:!!o.night,season:K.season,weather:K.weather,t:o.t,glow};
}
// 季節・天候・外観・内装（描画の条件）。指定が無ければ「夏・晴れ・初期の見た目」（昔の思い出の絵が変わらないように）
function condOf(area,opts,hd){
  const look=Object.assign({exterior:(hd&&hd.exterior)||{},wallpaper:(hd&&hd.room&&hd.room.wallpaper)||'lavender',floorId:(hd&&hd.room&&hd.room.floorId)||'floor.wood'},opts.look||{});
  const season=typeof opts.season==='string'?opts.season:'summer';
  const weather=typeof opts.weather==='string'?opts.weather:'clear';
  return{look,season,weather,snow:weather==='snow'};
}
// 季節はずれの花は咲かない（ひまわり＝夏、あさがお＝夏〜秋）。枯れない
function bloomOf(species,season){
  const sp=HOME.PLANT_SPECIES&&HOME.PLANT_SPECIES[species];
  return !(sp&&Array.isArray(sp.bloom))||sp.bloom.indexOf(season)>=0;
}
function drawExits(ctx,area,L){
  const T=L.T,A=HOME.AREAS[area];
  (A.exits||[]).forEach((e,i)=>{
    const px=e.x*T,py=L.band+e.y*T;
    ctx.save();
    ctx.fillStyle=area==='room'?'rgba(120,70,40,.55)':'rgba(170,150,110,.65)';
    ctx.fillRect(px+3,py+3,T-6,T-6);
    ctx.strokeStyle='rgba(255,240,200,.55)';ctx.setLineDash([3,3]);ctx.strokeRect(px+3.5,py+3.5,T-7,T-7);
    if(area==='garden'&&i===1){ctx.setLineDash([]);ctx.fillStyle='#7a5a3a';ctx.fillRect(px,py-4,4,T+8);ctx.fillRect(px,py+T/2-2,T/2,3);}
    ctx.restore();
  });
}
function cellCross(ctx,px,py,T){
  ctx.save();
  ctx.fillStyle='rgba(220,40,60,.35)';ctx.fillRect(px,py,T,T);
  ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(2,T/10);
  ctx.beginPath();ctx.moveTo(px+5,py+5);ctx.lineTo(px+T-5,py+T-5);ctx.moveTo(px+T-5,py+5);ctx.lineTo(px+5,py+T-5);ctx.stroke();
  ctx.strokeStyle='#d0203a';ctx.lineWidth=Math.max(1,T/20);ctx.stroke();
  ctx.strokeStyle='#d0203a';ctx.lineWidth=2;ctx.strokeRect(px+1,py+1,T-2,T-2);
  ctx.restore();
}

/* opts: {placements, plants, T, t, chars:[{who,x,y,dir,pose,moving}], ghost:{itemId,x,y,rotation,variant,ok,bad,cells},
          selId, hideId, lit:{id:true}, night, grid, marks:[{x,y}]} */
HOME.renderArea=function(ctx,area,opts){
  opts=opts||{};
  const L=HOME.layout(area,opts.T||32),T=L.T,t=opts.t||0;
  const hd=HOME.data&&HOME.data();
  const A=HOME.AREAS[area];
  const placements=opts.placements||(hd&&hd[area]&&hd[area].placements)||[];
  const plants=opts.plants||(hd&&hd.plants)||{};
  const lit=opts.lit||(hd&&hd.flags&&hd.flags.lit)||{};
  const K=condOf(area,opts,hd);
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  drawBand(ctx,area,L,opts,K);
  const base=area==='room'?K.look.floorId:((hd&&hd.garden&&hd.garden.groundId)||'ground.grass');
  const tileO=area==='garden'?{season:K.season,snow:K.snow}:undefined;
  for(let y=0;y<A.h;y++)for(let x=0;x<A.w;x++)drawTile(ctx,base,x*T,L.band+y*T,T,x,y,tileO);
  drawExits(ctx,area,L);
  if(opts.grid){
    ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=1;
    for(let x=1;x<A.w;x++){ctx.beginPath();ctx.moveTo(x*T+.5,L.band);ctx.lineTo(x*T+.5,L.ch);ctx.stroke();}
    for(let y=1;y<A.h;y++){ctx.beginPath();ctx.moveTo(0,L.band+y*T+.5);ctx.lineTo(L.cw,L.band+y*T+.5);ctx.stroke();}
  }
  const vis=placements.filter(P=>P&&CAT(P.itemId)&&P.instanceId!==opts.hideId);
  const itemOpts=P=>({rotation:P.rotation,variant:P.variant,T,t,lit:!!lit[P.instanceId],season:area==='garden'?K.season:'summer',snow:area==='garden'&&K.snow,
    plant:(CAT(P.itemId).plantable&&plants[P.instanceId])?{stage:plants[P.instanceId].stage|0,color:plants[P.instanceId].color,name:plants[P.instanceId].name,species:plants[P.instanceId].species||'seed',
      bloom:bloomOf(plants[P.instanceId].species||'seed',K.season)}:null});
  const posOf=P=>{const c=CAT(P.itemId);return c.layer==='wall'?{px:P.x*T,py:wallPy(L)}:{px:P.x*T,py:L.band+P.y*T};};
  // 床の上（ラグ・飛び石）→ 壁の飾り
  vis.filter(P=>LAYER_ORDER[CAT(P.itemId).layer]<2).sort((a,b)=>LAYER_ORDER[CAT(a.itemId).layer]-LAYER_ORDER[CAT(b.itemId).layer]||a.y-b.y)
    .forEach(P=>drawItem(ctx,P.itemId,Object.assign(itemOpts(P),posOf(P))));
  // 家具と人物を奥（y が小さい）から
  const draws=[];
  vis.filter(P=>CAT(P.itemId).layer==='furniture').forEach(P=>{
    const f=HOME.footprint(P.itemId,P.rotation);
    draws.push({z:P.y+f.h-1+(CAT(P.itemId).solid?0:-.2),fn:()=>drawItem(ctx,P.itemId,Object.assign(itemOpts(P),posOf(P)))});
  });
  (opts.chars||[]).forEach(c=>draws.push({z:c.y+(typeof c.zb==='number'?c.zb:.1),fn:()=>drawChar(ctx,c,Math.round(c.x*T),Math.round(L.band+c.y*T),T,t)}));
  draws.sort((a,b)=>a.z-b.z).forEach(d=>d.fn());
  // 夜：部屋を少し暗く、灯りの周りを明るく
  if(opts.night){
    ctx.save();
    ctx.fillStyle=area==='room'?'rgba(16,14,48,.32)':'rgba(10,16,52,.42)';ctx.fillRect(0,0,L.cw,L.ch);
    ctx.globalCompositeOperation='lighter';
    vis.forEach(P=>{
      const c=CAT(P.itemId);if(!c.light||!lit[P.instanceId])return;
      const p=posOf(P),f=HOME.footprint(P.itemId,P.rotation),cx=p.px+f.w*T/2,cy=p.py+f.h*T/2;
      const g=ctx.createRadialGradient(cx,cy,2,cx,cy,T*3);
      g.addColorStop(0,'rgba(255,190,90,.22)');g.addColorStop(1,'rgba(255,190,90,0)');
      ctx.fillStyle=g;ctx.fillRect(cx-T*3,cy-T*3,T*6,T*6);
    });
    ctx.restore();
    if(area==='garden'){const a=ART();if(a&&typeof a.drawHouse==='function'){try{a.drawHouse(ctx,0,0,L.cw,L.band,T,houseOpts(opts,K,true));}catch(e){}}}
  }
  // 天候の色合い（庭）と、季節・天候のパーティクル（seasons.js。閉じたら止まる・reduce-motion では出ない）
  if(area==='garden'&&K.weather!=='clear'){
    ctx.save();
    ctx.fillStyle=K.weather==='rain'?'rgba(40,52,84,.20)':K.weather==='snow'?'rgba(230,236,255,.07)':'rgba(70,72,96,.10)';
    ctx.fillRect(0,0,L.cw,L.ch);ctx.restore();
  }
  if(opts.particles&&HOME.seasons&&typeof HOME.seasons.drawParticles==='function'){
    try{HOME.seasons.drawParticles(ctx,area,L,{season:K.season,weather:K.weather,night:!!opts.night,t,frozen:opts.particles==='frozen'});}catch(e){}
  }
  // 目印（使う位置など）
  (opts.marks||[]).forEach(m=>{
    ctx.save();ctx.strokeStyle='#ffe680';ctx.lineWidth=2;ctx.setLineDash([4,3]);
    ctx.strokeRect(m.x*T+3,L.band+m.y*T+3,T-6,T-6);ctx.restore();
  });
  // 選択中
  if(opts.selId){
    const P=placements.find(q=>q&&q.instanceId===opts.selId);
    if(P&&P.instanceId!==opts.hideId){
      const f=HOME.footprint(P.itemId,P.rotation),p=posOf(P);
      if(CAT(P.itemId).layer==='wall')p.py=L.band-T-6;
      ctx.save();ctx.strokeStyle='#00e8c8';ctx.lineWidth=2;ctx.setLineDash([5,3]);ctx.lineDashOffset=-t*20;
      ctx.strokeRect(p.px+1,p.py+1,f.w*T-2,f.h*T-2);ctx.restore();
    }
  }
  // プレビュー（ゴースト）：置けないマスは ✕ 模様
  const g=opts.ghost;
  if(g&&CAT(g.itemId)&&Number.isInteger(g.x)){
    const c=CAT(g.itemId),f=HOME.footprint(g.itemId,g.rotation);
    const wall=c.layer==='wall'&&g.y===0;
    const gp={px:g.x*T,py:wall?wallPy(L):L.band+g.y*T};
    drawItem(ctx,g.itemId,{rotation:g.rotation,variant:g.variant,T,t,ghost:true,px:gp.px,py:gp.py});
    ctx.save();
    ctx.lineWidth=2;
    ctx.strokeStyle=g.ok?'#7dffb0':'#ff4060';
    if(!g.ok)ctx.setLineDash([4,3]);
    const by=wall?L.band-T-6:gp.py;
    ctx.strokeRect(gp.px+1,by+1,f.w*T-2,f.h*T-2);
    ctx.restore();
    if(!g.ok){
      const bad=(g.bad&&g.bad.length?g.bad:(g.cells||[]));
      bad.forEach(q=>{if(q.x>=0&&q.y>=0&&q.x<A.w&&q.y<A.h)cellCross(ctx,q.x*T,wall&&q.y===0?L.band-T-6:L.band+q.y*T,T);});
    }else{
      ctx.save();ctx.fillStyle='rgba(125,255,176,.18)';ctx.fillRect(gp.px,wall?L.band-T-6:gp.py,f.w*T,f.h*T);ctx.restore();
    }
  }
  ctx.restore();
  return L;
};

HOME._drawItem=drawItem;
HOME._drawChar=drawChar;
HOME.snapshot=function(area,o){
  o=o||{};
  try{
    if(typeof document==='undefined')return null;
    const scale=o.scale||1,L=HOME.layout(area,32);
    const cv=document.createElement('canvas');
    cv.width=Math.round(L.cw*scale);cv.height=Math.round(L.ch*scale);
    const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.scale(scale,scale);
    HOME.renderArea(ctx,area,{placements:o.placements,plants:o.plants,lit:o.lit,night:!!o.night,wallNight:o.night===undefined?true:!!o.night,chars:o.chars||[],T:32,t:o.t||0,
      season:o.season,weather:o.weather,look:o.look,particles:o.particles});
    return cv;
  }catch(e){try{console.error('[home] snapshot',e);}catch(_){}return null;}
};
})();
