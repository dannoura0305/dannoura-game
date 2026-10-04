// ═══════════════════════════════════════════════════════════
// 家・庭：季節と天候（フェーズ3 §4）
//   HOME.season(day?)        → 'summer'|'autumn'|'winter'|'spring'
//       本編：1〜22日 夏（7月はじまり）、23日〜 初秋（'autumn'）
//       暮らしモード：life.day で 夏→秋→冬→春 と 15日ごとに巡る
//   HOME.weather(day?)       → 'clear'|'cloudy'|'rain'|'snow'(冬のみ)  日ごとに決まる疑似乱数（gs.day と homeData.weatherSeed）
//   HOME.seasonLabel(day?)   → 「夏・晴れ」など（見出しに出す文字ラベル）
//   HOME.seasonOf({day}|{life:true,lifeDay}) / HOME.weatherOf(day, season, seed) … 純粋な判定（テスト用）
//   HOME.seasons.drawParticles(ctx, area, L, cond) … 雨・雪・落ち葉・蛍（夏の夜）・花びら（春）
//       最大 HOME.BAL.particleMax（60）個。画面を閉じたら捨てる。prefers-reduced-motion では出さない
//   雨の日は植えたものが自動で水やり済み（state.js の HOME.applyRain。家を開いたとき・日送りで適用）
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const G=()=>{try{return (typeof gs!=='undefined'&&gs)?gs:null;}catch(e){return null;}};
const ORDER=['summer','autumn','winter','spring'];
const STORY_AUTUMN_DAY=23;     // 本編：この日から初秋
const LIFE_SPAN=15;            // 暮らしモード：ひとつの季節の日数
const DEF_SEED=7;

HOME.SEASON_NAMES={summer:'夏',autumn:'秋',winter:'冬',spring:'春'};
HOME.WEATHER_NAMES={clear:'晴れ',cloudy:'くもり',rain:'雨',snow:'雪'};

function today(){const g=G();return g&&Number.isFinite(+g.day)?+g.day:1;}
function lifeOf(){const g=G();const l=g&&g.homeData&&g.homeData.life;return (l&&typeof l==='object'&&l.active===true)?l:null;}
function seedOf(){const g=G();const s=g&&g.homeData&&g.homeData.weatherSeed;return Number.isFinite(+s)?Math.floor(+s):DEF_SEED;}

// 純粋：o={day} または {life:true, lifeDay}
function seasonOf(o){
  o=o||{};
  if(o.life){const ld=Math.max(0,Math.floor(+o.lifeDay||0));return ORDER[Math.floor(ld/LIFE_SPAN)%ORDER.length];}
  const d=Number.isFinite(+o.day)?+o.day:1;
  return d>=STORY_AUTUMN_DAY?'autumn':'summer';
}
// 暮らしモードの何日目か（gs.day → life.day）。暮らしモードより前の日なら null
function lifeDayFor(d){
  const L=lifeOf();if(!L)return null;
  const g=G();
  const base=Number.isFinite(+L.baseDay)?+L.baseDay:(today()-(L.day|0));
  if(d===undefined)return L.day|0;
  void g;
  return d>=base?d-base:null;
}
HOME.season=function(day){
  try{
    const d=day===undefined?today():+day;
    const ld=lifeDayFor(day===undefined?undefined:d);
    if(ld!=null)return seasonOf({life:true,lifeDay:ld});
    return seasonOf({day:d});
  }catch(e){return 'summer';}
};
// 「初秋」かどうか（本編の秋）
HOME.isEarlyAutumn=function(day){return HOME.season(day)==='autumn'&&lifeDayFor(day===undefined?undefined:+day)==null;};

function rand(d,seed){
  let h=Math.imul((d|0)^0x9e3779b9,0x85ebca6b)^Math.imul((seed|0)+0x632be5ab,0xc2b2ae35);
  h=Math.imul(h^(h>>>15),0x2c1b3c6d);h=Math.imul(h^(h>>>12),0x297a2d39);h^=h>>>15;
  return (h>>>0)/4294967296;
}
const TABLE={
  summer:[['clear',.56],['cloudy',.24],['rain',.20]],
  autumn:[['clear',.50],['cloudy',.30],['rain',.20]],
  winter:[['clear',.34],['cloudy',.28],['snow',.28],['rain',.10]],
  spring:[['clear',.48],['cloudy',.26],['rain',.26]],
};
function weatherOf(day,season,seed){
  day=Math.floor(+day||1);
  if(day<=1)return 'clear';                       // はじまりの夜は晴れ（「7月の夏の夜」）
  const t=TABLE[season]||TABLE.summer;
  let r=rand(day,seed==null?DEF_SEED:seed);
  for(const [w,p] of t){if((r-=p)<0)return w;}
  return t[0][0];
}
HOME.weather=function(day){
  try{const d=day===undefined?today():+day;return weatherOf(d,HOME.season(d),seedOf());}catch(e){return 'clear';}
};
HOME.seasonLabel=function(day){
  const s=HOME.season(day),w=HOME.weather(day);
  const sn=(s==='autumn'&&HOME.isEarlyAutumn(day))?'初秋':HOME.SEASON_NAMES[s];
  return `${sn}・${HOME.WEATHER_NAMES[w]}`;
};
HOME.seasonOf=seasonOf;
HOME.weatherOf=weatherOf;

/* ══════════════ パーティクル ══════════════ */
let mq=null;
function reduced(){
  try{if(!mq&&root.matchMedia)mq=root.matchMedia('(prefers-reduced-motion: reduce)');return !!(mq&&mq.matches);}catch(e){return false;}
}
const MAX=()=>Math.max(0,(HOME.BAL&&HOME.BAL.particleMax)|0||60);
const PS={list:[],key:'',last:null};
// 欲しい数：[kind, n]
function wanted(area,c){
  const out=[];
  if(area==='garden'){
    if(c.weather==='rain')out.push(['rain',52]);
    else if(c.weather==='snow')out.push(['snow',44]);
    else{
      if(c.season==='autumn')out.push(['leaf',12]);
      if(c.season==='spring')out.push(['petal',16]);
      if(c.season==='summer'&&c.night)out.push(['firefly',12]);
      if(c.season==='winter'&&c.weather==='cloudy')out.push(['snow',8]);
    }
  }else{
    if(c.weather==='rain')out.push(['rain',16]);
    else if(c.weather==='snow')out.push(['snow',14]);
  }
  return out;
}
const LEAF_C=['#e08a34','#d0604a','#ffd84a','#c8602e'];
const PETAL_C=['#ffd0e0','#f59aae','#fff0f4'];
function spawn(kind,R,fresh){
  const r=Math.random;
  const p={kind,x:R.x+r()*R.w,y:fresh?R.y+r()*R.h:R.y-8-r()*20,ph:r()*6.28};
  if(kind==='rain'){p.vy=380+r()*80;p.vx=-36;p.len=8+Math.floor(r()*3)*2;}
  else if(kind==='snow'){p.vy=20+r()*22;p.vx=0;p.big=r()<.3;}
  else if(kind==='leaf'){p.vy=24+r()*16;p.vx=10+r()*10;p.col=LEAF_C[Math.floor(r()*LEAF_C.length)];}
  else if(kind==='petal'){p.vy=18+r()*14;p.vx=14+r()*12;p.col=PETAL_C[Math.floor(r()*PETAL_C.length)];}
  else if(kind==='firefly'){p.x=R.x+r()*R.w;p.y=R.y+R.h*.3+r()*R.h*.7;p.vx=(r()-.5)*18;p.vy=(r()-.5)*12;p.blink=.6+r()*.9;}
  return p;
}
function regionOf(area,L){
  if(area==='garden')return{x:0,y:0,w:L.cw,h:L.ch};
  const a=root.HOME_ART;
  const w=a&&typeof a.wallWindow==='function'?a.wallWindow(L.cw,L.band,L.T):null;
  return w&&w.w>4&&w.h>4?w:null;
}
function step(R,dt){
  PS.list.forEach(p=>{
    if(p.kind==='firefly'){
      p.ph+=dt*p.blink*2;
      p.vx+=(Math.random()-.5)*20*dt;p.vy+=(Math.random()-.5)*16*dt;
      p.vx=Math.max(-16,Math.min(16,p.vx));p.vy=Math.max(-12,Math.min(12,p.vy));
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      if(p.x<R.x)p.vx=Math.abs(p.vx);if(p.x>R.x+R.w)p.vx=-Math.abs(p.vx);
      if(p.y<R.y+R.h*.25)p.vy=Math.abs(p.vy);if(p.y>R.y+R.h)p.vy=-Math.abs(p.vy);
      return;
    }
    p.ph+=dt*2.2;
    const sway=(p.kind==='rain')?0:Math.sin(p.ph)*(p.kind==='snow'?10:18);
    p.x+=(p.vx+sway)*dt;p.y+=p.vy*dt;
    if(p.y>R.y+R.h+4||p.x<R.x-20||p.x>R.x+R.w+20){const q=spawn(p.kind,R,false);Object.assign(p,q);}
  });
}
const glowCache={};
function glow(){
  if(glowCache.c||typeof document==='undefined')return glowCache.c||null;
  const c=document.createElement('canvas');c.width=c.height=17;const x=c.getContext('2d');
  [[8,.05],[6,.08],[4,.12],[2,.2]].forEach(([r,a])=>{x.fillStyle=`rgba(220,255,140,${a})`;for(let yy=-r;yy<=r;yy++){const hw=Math.round(Math.sqrt(r*r-yy*yy));x.fillRect(8-hw,8+yy,hw*2+1,1);}});
  return glowCache.c=c;
}
function paint(ctx,R,dot){
  const sn=v=>Math.round(v/dot)*dot;
  PS.list.forEach(p=>{
    const x=sn(p.x),y=sn(p.y);
    if(p.kind==='rain'){ctx.fillStyle='rgba(206,224,255,.55)';ctx.fillRect(x,y,dot,p.len);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x,y,dot,dot);}
    else if(p.kind==='snow'){ctx.fillStyle='#ffffff';if(p.big){ctx.fillRect(x-dot,y,dot*3,dot);ctx.fillRect(x,y-dot,dot,dot*3);}else ctx.fillRect(x,y,dot,dot);}
    else if(p.kind==='leaf'){const f=Math.sin(p.ph)>0;ctx.fillStyle=p.col;ctx.fillRect(x,y,f?dot*2:dot,f?dot:dot*2);ctx.fillStyle='rgba(90,40,30,.6)';ctx.fillRect(x,y+(f?dot:dot*2),dot,dot);}
    else if(p.kind==='petal'){ctx.fillStyle=p.col;ctx.fillRect(x,y,dot*2,dot);ctx.fillStyle='#ffffff';ctx.fillRect(x,y,dot,dot);}
    else if(p.kind==='firefly'){
      const a=.35+.65*Math.max(0,Math.sin(p.ph));
      const g=glow();
      ctx.save();ctx.globalAlpha*=a;
      if(g){ctx.globalCompositeOperation='lighter';ctx.drawImage(g,x-8*dot/2,y-8*dot/2,17*dot/2,17*dot/2);ctx.globalCompositeOperation='source-over';}
      ctx.fillStyle='#f4ffb0';ctx.fillRect(x,y,dot,dot);ctx.restore();
    }
  });
}
// cond={season, weather, night, t(秒), frozen}
function drawParticles(ctx,area,L,cond){
  cond=cond||{};
  if(reduced()){PS.list=[];return 0;}
  const R=regionOf(area,L);if(!R){PS.list=[];return 0;}
  const key=[area,cond.season,cond.weather,cond.night?1:0,L.cw,L.ch].join('|');
  if(key!==PS.key){PS.list=[];PS.key=key;PS.last=null;}
  if(!cond.frozen){
    const t=+cond.t||0;
    const dt=PS.last==null?0:Math.max(0,Math.min(.1,t-PS.last));PS.last=t;
    const want=wanted(area,cond);
    let room=MAX()-PS.list.length;
    want.forEach(([k,n])=>{let have=PS.list.filter(p=>p.kind===k).length;while(have<n&&room>0){PS.list.push(spawn(k,R,true));have++;room--;}});
    // 条件に合わない種類は捨てる
    const kinds=new Set(want.map(w=>w[0]));PS.list=PS.list.filter(p=>kinds.has(p.kind));
    if(PS.list.length>MAX())PS.list.length=MAX();
    step(R,dt);
  }
  if(!PS.list.length)return 0;
  ctx.save();
  if(area!=='garden'){ctx.beginPath();ctx.rect(R.x,R.y,R.w,R.h);ctx.clip();}
  paint(ctx,R,Math.max(1,Math.round((L.T||32)/16)));
  ctx.restore();
  return PS.list.length;
}
function clear(){PS.list=[];PS.key='';PS.last=null;}
HOME.seasons={drawParticles,clear,count:()=>PS.list.length,wanted,reduced,STORY_AUTUMN_DAY,LIFE_SPAN,ORDER};

// 家を開いたら：雨なら水やり済みに。閉じたらパーティクルを捨てる
if(typeof HOME.on==='function'){
  HOME.on('open',()=>{
    try{
      HOME.applyRain&&HOME.applyRain();
      // 雨の日：一日に一度だけ「水やりは要らない」と知らせる
      const g=G(),hd=HOME.data&&HOME.data();
      if(g&&hd&&HOME.weather()==='rain'&&Object.keys(hd.plants||{}).length&&hd.flags.rainNote!==g.day){
        hd.flags.rainNote=g.day;
        setTimeout(()=>{try{HOME.ui&&HOME.ui.toast&&HOME.ui.toast('☔ 雨の日。鉢やプランターは、雨が水やりをしてくれた。');}catch(e){}},900);
      }
    }catch(e){}
  });
  HOME.on('close',clear);
}
})();
