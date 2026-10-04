// ═══════════════════════════════════════════════════════════
// 家・庭づくり：状態 gs.homeData（初期化・検証・移行・所持/素材/植物/報酬API）
//   gs は game.js のトップレベル const（window には無いが名前で参照できる）
//   どの関数も例外を外に出さない（壊れたセーブでもゲームを止めない）
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
HOME.hooks=HOME.hooks||{};
const CAT=id=>HOME.CATALOG&&HOME.CATALOG[id];
const G=()=>{try{return (typeof gs!=='undefined'&&gs)?gs:null;}catch(e){return null;}};
const today=()=>{const g=G();return g&&Number.isFinite(+g.day)?+g.day:1;};
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
const int0=v=>{v=Math.floor(+v);return Number.isFinite(v)&&v>0?v:0;};

const INIT_RECIPES=['repaired_shelf','cushion','flowerbed','fence','sea_glass','kid_desk','planter','clothesline','string_lights'];
// フェーズ2（v2）で足したもの：旧セーブには移行のとき一度だけ渡す
const V2_RECIPES=['kid_desk','planter','clothesline','string_lights'];
const V2_STORED=[['furniture.toy_box',1],['garden.watering_can',1]];
const VERSION=3;
const WEATHER_SEED=7;          // 天候の疑似乱数のシード（セーブごとに持つ。既定は固定値）
const INIT_MATS={wood:4,cloth:2,metal:2,sea:0};
const INIT_ROOM=[
  ['furniture.futon',0,1,0],
  ['furniture.bookshelf',3,0,0],
  ['furniture.desk_small',9,0,0],
  ['furniture.wood_chair',11,2,0],
  ['light.desk_lamp',11,0,0],
  ['deco.rug',4,3,0],
  ['furniture.low_table',5,3,0],
  ['memento.bear',0,4,0],
];
const INIT_GARDEN=[
  ['garden.small_tree',12,3,0],
  ['garden.fence',10,8,0],['garden.fence',11,8,0],['garden.fence',12,8,0],['garden.fence',13,8,0],['garden.fence',14,8,0],['garden.fence',15,8,0],
  ['garden.stepping_stone',7,1,0],['garden.stepping_stone',7,2,0],['garden.stepping_stone',6,3,0],['garden.stepping_stone',5,4,0],
];
const INIT_STORED=[['furniture.wood_chair',1],['furniture.cushion',2],['garden.bench',1],['garden.stepping_stone',2]].concat(V2_STORED);

function defVariant(itemId,v){
  const c=CAT(itemId);
  if(c&&c.variants){return c.variants.indexOf(v)>=0?v:c.variants[0];}
  return (typeof v==='string'&&v)?v:'default';
}
function invAdd(hd,itemId,n,variant){
  const v=defVariant(itemId,variant);
  const o=hd.inventory[itemId]=isObj(hd.inventory[itemId])?hd.inventory[itemId]:{};
  o[v]=Math.max(0,(o[v]|0)+n);
  if(!o[v])delete o[v];
  if(!Object.keys(o).length)delete hd.inventory[itemId];
}
const firstKey=o=>Object.keys(o||{})[0];
function defExterior(){const E=HOME.EXTERIOR||{},o={};Object.keys(E).forEach(k=>{o[k]=firstKey(E[k].opts);});return o;}
// 拡張の有無 → 広さ・出入口
function sizeOf(area,expanded){
  const Z=HOME.AREA_SIZES&&HOME.AREA_SIZES[area];
  if(Z)return expanded?Z.expanded:Z.base;
  const A=HOME.AREAS[area];return{w:A.w,h:A.h,door:A.door,gate:A.gate};
}
/* HOME.AREAS（placement.js などが読む広さ・出入口）を、このセーブの拡張状態に合わせる */
function syncAreas(hd){
  syncedFor=hd||null;
  ['room','garden'].forEach(area=>{
    const A=HOME.AREAS[area];if(!A)return;
    const z=sizeOf(area,!!(hd&&hd.expanded&&hd.expanded[area]));
    A.w=z.w;A.h=z.h;A.door={x:z.door.x,y:z.door.y};
    if(z.gate)A.gate={x:z.gate.x,y:z.gate.y};
    A.exits=[A.door].concat(A.gate?[A.gate]:[]).map(e=>({x:e.x,y:e.y}));
  });
}
HOME.syncAreas=syncAreas;
// 最初の配置（模様替えの「最初の状態に戻す」が使う）。書き換えられないよう写しを返す
HOME.defaultLayout=area=>(area==='room'?INIT_ROOM:area==='garden'?INIT_GARDEN:[]).map(r=>r.slice());
HOME.areaSize=sizeOf;
function fresh(){
  const hd={version:VERSION,inventory:{},materials:Object.assign({},INIT_MATS),unlockedRecipes:INIT_RECIPES.slice(),
    room:{width:12,height:8,floorId:'floor.wood',wallpaper:firstKey(HOME.WALLPAPERS)||'lavender',placements:[]},
    garden:{width:16,height:12,groundId:'ground.grass',placements:[]},
    plants:{},events:{},memories:[],appliedRewards:{},flags:{repairedShelf:false,lit:{},v2Items:true},seq:1,
    bonds:{},life:{},
    expanded:{room:false,garden:false},exterior:defExterior(),weatherSeed:WEATHER_SEED};
  syncAreas(hd);
  const put=(area,[itemId,x,y,rotation])=>{
    const c=CAT(itemId);if(!c)return;
    const variant=defVariant(itemId);
    hd[area].placements.push({instanceId:'p'+(hd.seq++),itemId,x,y,rotation,variant,layer:c.layer});
    invAdd(hd,itemId,1,variant);
  };
  INIT_ROOM.forEach(r=>put('room',r));
  INIT_GARDEN.forEach(r=>put('garden',r));
  INIT_STORED.forEach(([id,n])=>invAdd(hd,id,n));
  return hd;
}

/* 壊れたデータを直す：不明ID・不正座標・重なり・所持数超過の配置は「収納へ戻す」（＝配置だけ外す。所持数は増やさない） */
function repair(hd){
  hd.version=VERSION;
  // 所持
  const inv=isObj(hd.inventory)?hd.inventory:{};hd.inventory={};
  Object.keys(inv).forEach(id=>{
    const v=inv[id];
    if(!CAT(id)){hd.inventory[id]=v;return;}          // 未知のID：将来版のデータかもしれないので保持だけして無視する
    if(typeof v==='number'){invAdd(hd,id,int0(v));return;}
    if(isObj(v))Object.keys(v).forEach(k=>invAdd(hd,id,int0(v[k]),k));
  });
  // 素材
  const m=isObj(hd.materials)?hd.materials:{};hd.materials={};
  Object.keys(HOME.MATERIALS).forEach(k=>{hd.materials[k]=int0(m[k]);});
  // レシピ
  if(!Array.isArray(hd.unlockedRecipes))hd.unlockedRecipes=INIT_RECIPES.slice();
  hd.unlockedRecipes=[...new Set(hd.unlockedRecipes.filter(r=>typeof r==='string'&&HOME.RECIPES[r]))];
  // その他の入れ物
  ['plants','events','appliedRewards','flags'].forEach(k=>{if(!isObj(hd[k]))hd[k]={};});
  if(!Array.isArray(hd.memories))hd.memories=[];
  if(!isObj(hd.flags.lit))hd.flags.lit={};
  if(typeof hd.flags.repairedShelf!=='boolean')hd.flags.repairedShelf=!!hd.flags.repairedShelf;
  // v1 → v2：新しい初期収納とレシピを一度だけ渡す（目印 flags.v2Items）
  if(hd.flags.v2Items!==true){
    V2_STORED.forEach(([id,n])=>invAdd(hd,id,n));
    V2_RECIPES.forEach(r=>{if(hd.unlockedRecipes.indexOf(r)<0)hd.unlockedRecipes.push(r);});
    hd.flags.v2Items=true;
  }
  // 他のモジュール（bonds.js / lifemode.js）が中身を管理する入れ物：無いときだけ用意
  if(hd.bonds==null)hd.bonds={};
  if(hd.life==null)hd.life={};
  // v2 → v3：拡張（未拡張）・外観・内装・天候のシード。足りない・おかしい値だけ初期値にする（何度呼んでも同じ結果）
  // 縮めることはない：印が壊れていても、保存されている広さが拡張後なら拡張済みとみなす
  const ex=isObj(hd.expanded)?hd.expanded:{};
  const big=area=>{const b=hd[area],Z=HOME.AREA_SIZES&&HOME.AREA_SIZES[area];return !!(isObj(b)&&Z&&+b.width>=Z.expanded.w&&+b.height>=Z.expanded.h);};
  hd.expanded={room:ex.room===true||big('room'),garden:ex.garden===true||big('garden')};
  const E=HOME.EXTERIOR||{},ext=isObj(hd.exterior)?hd.exterior:{},defs=defExterior();
  hd.exterior={};Object.keys(E).forEach(k=>{hd.exterior[k]=(typeof ext[k]==='string'&&Object.prototype.hasOwnProperty.call(E[k].opts,ext[k]))?ext[k]:defs[k];});
  if(!Number.isFinite(+hd.weatherSeed))hd.weatherSeed=WEATHER_SEED;else hd.weatherSeed=Math.floor(+hd.weatherSeed);
  syncAreas(hd);
  Object.keys(hd.plants).forEach(id=>{
    const p=hd.plants[id];
    if(!isObj(p)){delete hd.plants[id];return;}
    p.name=String(p.name==null?'':p.name).slice(0,8)||'ひなた';
    p.color=typeof p.color==='string'?p.color:'pink';
    p.species=(typeof p.species==='string'&&HOME.PLANT_SPECIES&&HOME.PLANT_SPECIES[p.species])?p.species:'seed';
    if(p.holder!==undefined&&!(typeof p.holder==='string'&&HOME.isPlantable&&HOME.isPlantable(p.holder)))delete p.holder;
    p.stage=Math.min(HOME.BAL.maxStage,int0(p.stage));
    p.growth=int0(p.growth);
    p.plantedDay=Number.isFinite(+p.plantedDay)?+p.plantedDay:today();
    p.lastWateredDay=Number.isFinite(+p.lastWateredDay)?+p.lastWateredDay:p.plantedDay;
  });
  // 配置
  let maxSeq=int0(hd.seq)||1;
  const ids=new Set();
  const placedCnt={};
  ['room','garden'].forEach(area=>{
    const A=HOME.AREAS[area];
    const box=isObj(hd[area])?hd[area]:{};
    const raw=Array.isArray(box.placements)?box.placements:[];
    hd[area]=box;
    box.width=A.w;box.height=A.h;
    if(area==='room'){
      box.floorId=(typeof box.floorId==='string'&&(!HOME.FLOORS||HOME.FLOORS[box.floorId]))?box.floorId:'floor.wood';
      const W=HOME.WALLPAPERS||{};box.wallpaper=(typeof box.wallpaper==='string'&&W[box.wallpaper])?box.wallpaper:(firstKey(W)||'lavender');
    }
    else box.groundId=typeof box.groundId==='string'?box.groundId:'ground.grass';
    const list=[];
    raw.forEach(P=>{
      if(!isObj(P))return;
      const c=CAT(P.itemId);if(!c)return;                    // 不明ID → 無視
      const x=+P.x,y=+P.y;
      if(!Number.isInteger(x)||!Number.isInteger(y))return;
      let rot=HOME.normRot(P.rotation);
      if(c.rots.indexOf(rot)<0)rot=c.rots[0];
      const variant=defVariant(P.itemId,P.variant);
      const key=P.itemId+'|'+variant;
      if((placedCnt[key]|0)+1>HOME.owned(P.itemId,variant,hd))return;   // 所持数より多い → 収納へ
      const Q={instanceId:String(P.instanceId||''),itemId:P.itemId,x,y,rotation:rot,variant,layer:c.layer};
      const r=HOME.canPlace(area,list,Q,{skipReach:true});
      if(!r.ok)return;                                        // はみ出し・重なり・壁・出入口 → 収納へ
      list.push(Q);placedCnt[key]=(placedCnt[key]|0)+1;
    });
    // 通れない配置は、後から置いたものから収納へ戻す
    let guard=list.length+1;
    while(guard-->0&&!HOME.reachable(area,list).ok){
      let k=-1;for(let i=list.length-1;i>=0;i--){const c=CAT(list[i].itemId);if(c.solid&&c.layer==='furniture'){k=i;break;}}
      if(k<0)break;
      const P=list.splice(k,1)[0];placedCnt[P.itemId+'|'+P.variant]--;
    }
    box.placements=list;
  });
  // instanceId を一意に・seq を最大より大きく
  ['room','garden'].forEach(area=>hd[area].placements.forEach(P=>{
    const mm=/^p(\d+)$/.exec(P.instanceId);if(mm)maxSeq=Math.max(maxSeq,+mm[1]+1);
  }));
  Object.keys(hd.plants).forEach(id=>{const mm=/^p(\d+)$/.exec(id);if(mm)maxSeq=Math.max(maxSeq,+mm[1]+1);});
  ['room','garden'].forEach(area=>hd[area].placements.forEach(P=>{
    if(!P.instanceId||ids.has(P.instanceId))P.instanceId='p'+(maxSeq++);
    ids.add(P.instanceId);
  }));
  hd.seq=maxSeq;
  return hd;
}

HOME.ensure=function(){
  const g=G();if(!g)return null;
  try{
    if(!isObj(g.homeData)){g.homeData=fresh();return g.homeData;}
    return repair(g.homeData);
  }catch(e){
    try{console.error('[home] ensure',e);}catch(_){}
    try{g.homeData=fresh();}catch(_){}
    return g.homeData||null;
  }
};
HOME._fresh=fresh;
let syncedFor=null;
const HD=()=>{const g=G();if(!g)return null;if(!isObj(g.homeData)||g.homeData.version!==VERSION)return HOME.ensure();
  if(syncedFor!==g.homeData){syncedFor=g.homeData;syncAreas(g.homeData);}   // 別のセーブに差し替わったら広さを合わせ直す
  return g.homeData;};
HOME.data=HD;

HOME.owned=function(itemId,variant,hdIn){
  const hd=hdIn||HD();if(!hd)return 0;
  const o=hd.inventory&&hd.inventory[itemId];if(!isObj(o))return 0;
  if(variant===undefined)return Object.keys(o).reduce((s,k)=>s+(o[k]|0),0);
  return o[variant]|0;
};
HOME.placedCount=function(itemId,variant){
  const hd=HD();if(!hd)return 0;
  return ['room','garden'].reduce((s,a)=>s+hd[a].placements.filter(P=>P.itemId===itemId&&(variant===undefined||P.variant===variant)).length,0);
};
HOME.stored=function(itemId,variant){return Math.max(0,HOME.owned(itemId,variant)-HOME.placedCount(itemId,variant));};
HOME.variantsOf=function(itemId){
  const hd=HD();const o=hd&&hd.inventory[itemId];return isObj(o)?Object.keys(o):[];
};
HOME.findPlacement=function(id){
  const hd=HD();if(!hd)return null;
  for(const a of['room','garden']){const P=hd[a].placements.find(q=>q.instanceId===id);if(P)return{area:a,P};}
  return null;
};
// 新しい instanceId（配置・植物と重ならない）
HOME.newInstanceId=function(){
  const hd=HD();if(!hd)return null;
  if(!Number.isFinite(+hd.seq)||+hd.seq<1)hd.seq=1;
  let id;do{id='p'+(hd.seq++);}while(HOME.findPlacement(id)||(hd.plants&&hd.plants[id]));
  return id;
};
HOME.itemName=id=>{const c=CAT(id);return c?c.name:'？？？';};

HOME.addItem=function(itemId,n,variant){
  try{
    const hd=HD();if(!hd||!CAT(itemId))return false;
    n=n===undefined?1:Math.floor(+n);if(!Number.isFinite(n)||n<=0)return false;
    invAdd(hd,itemId,n,variant===undefined?'default':variant);
    HOME.emit('change',{type:'item',itemId,n});
    return true;
  }catch(e){return false;}
};
HOME.addMaterial=function(id,n){
  try{
    const hd=HD();if(!hd||!HOME.MATERIALS[id])return false;
    n=Math.floor(+n);if(!Number.isFinite(n)||!n)return false;
    hd.materials[id]=Math.max(0,(hd.materials[id]|0)+n);
    HOME.emit('change',{type:'material',id,n});
    return true;
  }catch(e){return false;}
};
HOME.unlockRecipe=function(id){
  const hd=HD();if(!hd||!HOME.RECIPES[id])return false;
  if(hd.unlockedRecipes.indexOf(id)>=0)return false;
  hd.unlockedRecipes.push(id);HOME.emit('change',{type:'recipe',id});return true;
};
HOME.hasRecipe=function(id){const hd=HD();return !!(hd&&hd.unlockedRecipes.indexOf(id)>=0);};

HOME.grantOnce=function(rewardId,fn){
  const hd=HD();if(!hd||!rewardId)return false;
  if(Object.prototype.hasOwnProperty.call(hd.appliedRewards,rewardId))return false;
  hd.appliedRewards[rewardId]=today();          // 先に記録（fn の中で再入しても二重にならない）
  try{if(typeof fn==='function')fn();}catch(e){try{console.error('[home] grantOnce',rewardId,e);}catch(_){}}
  return true;
};

// ── 植物（枯れない・責めない） ──
// o={name,color,species,holder}。species 省略時は 'seed'（娘の花）
HOME.plant=function(potId,o){
  const hd=HD();if(!hd||!potId)return null;
  o=o||{};
  const SP=HOME.PLANT_SPECIES||{};
  const species=(typeof o.species==='string'&&SP[o.species])?o.species:'seed';
  const sp=SP[species]||{};
  const name=String(o.name==null?'':o.name).trim().slice(0,8)||sp.defName||'ひなた';
  const p={name,color:typeof o.color==='string'?o.color:(sp.color||'pink'),species,stage:0,growth:0,plantedDay:today(),lastWateredDay:today()};
  if(typeof o.holder==='string'&&HOME.isPlantable&&HOME.isPlantable(o.holder))p.holder=o.holder;
  hd.plants[potId]=p;HOME.emit('change',{type:'plant',potId});
  return p;
};
// ── 種（消費アイテム） ──
HOME.seedId=species=>{const sp=HOME.PLANT_SPECIES&&HOME.PLANT_SPECIES[species];return sp&&sp.seedId||null;};
HOME.seedCount=function(species){const id=HOME.seedId(species);return id?HOME.owned(id):0;};
HOME.giveSeed=function(species,n){
  const id=HOME.seedId(species);if(!id)return false;
  return HOME.addItem(id,n===undefined?1:n);
};
// 持っている種：[{species,itemId,name,count}]
HOME.ownedSeeds=function(){
  const SP=HOME.PLANT_SPECIES||{};
  return Object.keys(SP).filter(k=>SP[k].seedId&&HOME.owned(SP[k].seedId)>0)
    .map(k=>({species:k,itemId:SP[k].seedId,name:SP[k].name,count:HOME.owned(SP[k].seedId)}));
};
HOME.plantOf=function(id){const hd=HD();return (hd&&hd.plants&&id&&isObj(hd.plants[id]))?hd.plants[id]:null;};
// 空の鉢・プランター（置いてあるもの）に種を植える。種は1つ消費。→ {ok, reason, plant}
HOME.plantSeed=function(instanceId,species,name){
  try{
    const hd=HD();if(!hd)return{ok:false,reason:'データを読み込めません'};
    const f=HOME.findPlacement(instanceId);
    if(!f)return{ok:false,reason:'その鉢は置かれていません'};
    const c=CAT(f.P.itemId);
    if(!c||!c.plantable)return{ok:false,reason:`${c?c.name:'それ'}には植えられません`};
    if(hd.plants[instanceId])return{ok:false,reason:'もう植えてあります'};
    const sid=HOME.seedId(species);
    if(!sid)return{ok:false,reason:'その種はありません'};
    if(HOME.owned(sid)<1)return{ok:false,reason:`${HOME.itemName(sid)}を持っていません`};
    invAdd(hd,sid,-1,'default');
    const p=HOME.plant(instanceId,{name,species,holder:f.P.itemId});
    HOME.emit('change',{type:'seed',species,potId:instanceId});
    return{ok:true,reason:'',plant:p};
  }catch(e){return{ok:false,reason:'うまく植えられませんでした'};}
};
// 雨の日は、植えてあるものすべてに「今日の水やり済み」を付ける（seasons.js の HOME.weather があるときだけ）
function rainingOn(d){try{return typeof HOME.weather==='function'&&HOME.weather(d)==='rain';}catch(e){return false;}}
HOME.applyRain=function(){
  try{
    const hd=HD();if(!hd)return 0;const d=today();
    if(!rainingOn(d))return 0;
    let n=0;Object.keys(hd.plants).forEach(id=>{const p=hd.plants[id];if(p&&p.lastWateredDay!==d){p.lastWateredDay=d;n++;}});
    if(n)HOME.emit('change',{type:'rain',n});
    return n;
  }catch(e){return 0;}
};
HOME.isRainyToday=()=>rainingOn(today());
HOME.water=function(potId){
  const hd=HD();const p=hd&&hd.plants[potId];if(!p)return false;
  if(rainingOn(today()))p.lastWateredDay=today();  // 雨：水やり不要（自動で済んでいる）
  if(p.lastWateredDay===today())return false;   // 今日はもう水をあげた
  p.lastWateredDay=today();HOME.emit('change',{type:'water',potId});
  return true;
};
HOME.wateredToday=function(potId){const hd=HD();const p=hd&&hd.plants[potId];return !!(p&&(p.lastWateredDay===today()||rainingOn(today())));};
HOME.tickDay=function(){
  try{
    const hd=HD();if(!hd)return false;
    const d=today();
    if(hd.flags.plantTick===d)return false;      // 同じ日に二度育たない
    hd.flags.plantTick=d;
    const B=HOME.BAL;
    HOME.applyRain();                              // 雨の日は自動で水やり済み
    // 季節：冬はゆっくり（2日に1回）。季節の仕組みが無いときは毎日
    let every=1;
    try{if(typeof HOME.season==='function'&&B.seasonGrowEvery)every=Math.max(1,B.seasonGrowEvery[HOME.season()]|0||1);}catch(e){every=1;}
    const grows=every<=1||(((d%every)+every)%every===0);
    Object.keys(hd.plants).forEach(id=>{
      const p=hd.plants[id];
      if(grows&&d-p.lastWateredDay<=B.waterGraceDays){
        p.growth=(p.growth|0)+1;
        if(p.growth>=B.growPerStage&&p.stage<B.maxStage){p.stage++;p.growth=0;}
        if(p.stage>=B.maxStage)p.growth=Math.min(p.growth,B.growPerStage);
      }
      // 水が足りなくても枯れない（育ちが止まるだけ）
    });
    HOME.emit('change',{type:'tick'});
    return true;
  }catch(e){return false;}
};

// 家で過ごす効果：精神+ は1日あたり上限つき
HOME.addHomeMental=function(n){
  const g=G(),hd=HD();if(!g||!hd)return 0;
  const d=today();
  if(hd.flags.mentalDay!==d){hd.flags.mentalDay=d;hd.flags.mentalGiven=0;}
  const give=Math.max(0,Math.min(n|0,HOME.BAL.dailyMentalCap-(hd.flags.mentalGiven|0)));
  if(give>0){hd.flags.mentalGiven=(hd.flags.mentalGiven|0)+give;g.mental=Math.min(100,(+g.mental||0)+give);}
  return give;
};

HOME.save=function(){
  try{
    if(typeof saveGame!=='function')return false;
    return saveGame(true)===true;
  }catch(e){return false;}
};

// ── イベント ──
const L={};
HOME.on=function(evt,fn){if(typeof fn!=='function')return()=>{};(L[evt]=L[evt]||[]).push(fn);return()=>HOME.off(evt,fn);};
HOME.off=function(evt,fn){const a=L[evt];if(a){const i=a.indexOf(fn);if(i>=0)a.splice(i,1);}};
HOME.emit=function(evt,data){(L[evt]||[]).slice().forEach(fn=>{try{fn(data);}catch(e){try{console.error('[home] '+evt,e);}catch(_){}}});};
})();
