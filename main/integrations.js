// ═══════════════════════════════════════════════════════════
// 家・庭と本編／RPG／エンディングの接続（関数を包むだけ。元の関数は必ず呼ぶ）
//   saveDataToGs … 読込直後に HOME.ensure()（前のセーブの家は残らない：/Data$/ キーは元関数が消す）
//   nextDay      … 植物の成長 HOME.tickDay() と HOME.events.tick()
//   endFactory / handleChoice('childcare') / MG.finish（釣り・RPG） … 素材を少しだけ（1日1回ずつ）
//   RPG第2章クリア … 貝殻ランタンのレシピ（夢で得た「発想」）＋思い出（grantOnce で一度だけ）
//   RPG第1章 → 風鈴／第4章 → 海のモビール／第5章 → 家の表札のレシピ、第3章 → 約束の思い出（bonds）
//   休む・子育て・工場 → HOME.bonds.note（1日1キー）、日送り → HOME.life_events.tick()
//   エンディング「その後」… 良い結末・ふつうの結末だけ、bonds の一言を足す（結末の種類は変えない）
//   エンディング … 良い結末のときだけ、家／庭の絵と娘の一言（HOME.endingReflection）
// 設計：docs/home-story-design.md
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const SIM=(()=>{try{return !!(root.frameElement&&/simulator/.test(root.parent.location.pathname));}catch(e){return false;}})();

function G(){try{return typeof gs!=='undefined'?gs:null;}catch(e){return null;}}
function day(){const g=G();return g&&Number.isFinite(+g.day)?+g.day:1;}
function hd(){try{return typeof HOME.ensure==='function'?HOME.ensure():null;}catch(e){return null;}}
function notif(msg){try{if(!SIM&&typeof showNotif==='function')showNotif(msg);}catch(e){}}
function flags(h){if(!h.flags||typeof h.flags!=='object')h.flags={};return h.flags;}
function grantOnce(id,fn){
  if(typeof HOME.grantOnce==='function')return !!HOME.grantOnce(id,fn);
  const h=hd();if(!h)return false;
  if(!h.appliedRewards||typeof h.appliedRewards!=='object')h.appliedRewards={};
  if(h.appliedRewards[id]!=null)return false;
  h.appliedRewards[id]=day();fn();return true;
}

// ── 素材（1日1回ずつ・少しだけ） ──
const MAT_NAME={wood:'木材',cloth:'布',metal:'金具',sea:'海のかけら'};
function dailyMaterial(key,mat,n,msg){
  const h=hd();if(!h||typeof HOME.addMaterial!=='function')return false;
  const f=flags(h);
  let d=f.matDaily;
  if(!d||typeof d!=='object'||d.day!==day())d=f.matDaily={day:day()};
  if(d[key])return false;
  d[key]=1;
  try{HOME.addMaterial(mat,n);}catch(e){return false;}
  notif(`${msg}（${MAT_NAME[mat]||mat}+${n}）`);
  return true;
}

// ── RPG：章クリアの報酬と第2章のランタン ──
function rpgCleared(){const g=G();return g&&g.rpg&&Number.isFinite(+g.rpg.cleared)?+g.rpg.cleared:0;}
// 章ごとの「夢で得た発想」：レシピは毎回そろえ直す（定義が後から増えても取りこぼさない）。通知と思い出は一度だけ
const CH_RECIPES={
  1:{item:'deco.wind_chime',guess:'wind_chime',memo:'rpg.ch1.chime',what:'夢の部屋の音',
     text:'夢の配信部屋で、泡にならずに届いた声。……金具と海のかけらで、風の音を鳴らすものが作れそうな気がした。',
     notif:'🎐 夢で聞いた音を思い出した。クラフト「風鈴」が作れるようになった'},
  4:{item:'deco.sea_mobile',guess:'sea_mobile',memo:'rpg.ch4.mobile',what:'眠りの灯の色',
     text:'眠らない灯籠を抜けたあとの、静かな青い光。……あの子の布団の上で、ゆっくり回る海を作ってみようと思った。',
     notif:'🐟 夢で見た海の色を思い出した。クラフト「海のモビール」が作れるようになった'},
  5:{item:'garden.nameplate',guess:'nameplate',memo:'rpg.ch5.nameplate',what:'名前の灯',
     text:'渦の底で掴んだ名前。……家の戸口に、ふたりの名前を掛けておこうと思った。呼ばれる場所が、ここにあるように。',
     notif:'🏠 夢で掴んだ名前を思い出した。クラフト「家の表札」が作れるようになった'},
};
function recipeFor(itemId,guess){
  const R=HOME.RECIPES||{};
  if(R[guess])return guess;
  for(const k in R)if(R[k]&&R[k].out===itemId)return k;
  return null;
}
function syncChapterRecipes(silent){
  const c=rpgCleared();let any=false;
  Object.keys(CH_RECIPES).forEach(k=>{
    const n=+k,def=CH_RECIPES[k];
    if(c<n)return;
    const id=recipeFor(def.item,def.guess);
    if(!id)return;                                   // まだ定義が無い（後で読み込まれたら、そのときに）
    try{if(HOME.hasRecipe&&!HOME.hasRecipe(id))HOME.unlockRecipe&&HOME.unlockRecipe(id);}catch(e){}
    const got=grantOnce('rpg.ch'+n+'.recipe',()=>{
      try{HOME.memories&&HOME.memories.add&&HOME.memories.add({id:def.memo,day:day(),who:['dan','minamo'],what:def.what,items:[def.item],text:def.text,snapshot:null});}catch(e){}
      if(!silent)notif(def.notif);
    });
    any=any||got;
  });
  // 第3章：約束の灯（約束した／正直に言った）→ 思い出と bonds
  if(c>=3){
    const g=G();const rf=g&&g.rpg&&g.rpg.flags||{};
    grantOnce('rpg.ch3.promise',()=>{
      const p=!!rf.ch3_promise;
      try{HOME.memories&&HOME.memories.add&&HOME.memories.add({id:'rpg.ch3.promise',day:day(),who:['dan','kid','minamo'],what:p?'夢の中のゆびきり':'夢の中の正直な返事',items:[],
        text:p?'珊瑚の保育園で、夢の中のあの子とゆびきりをした。「おゆうぎかい、やくそくだよ」':'夢の中のあの子に「行けるか、まだ分からないの」と正直に言った。「…………うん。しってた」',snapshot:null});}catch(e){}
    });
    try{HOME.bonds&&HOME.bonds.sync&&HOME.bonds.sync();}catch(e){}
  }
  return any;
}
function syncRpg(silent){
  const c=rpgCleared();
  syncChapterRecipes(silent);
  if(c<2)return false;
  return grantOnce('rpg.ch2.shell_lantern',()=>{
    try{HOME.unlockRecipe&&HOME.unlockRecipe('shell_lantern');}catch(e){}
    try{HOME.memories&&HOME.memories.add&&HOME.memories.add({id:'rpg.ch2.lantern',day:day(),who:['dan','minamo'],what:'夢の工場の灯り',items:['light.shell_lantern'],
      text:'夢の海の底で見た、琥珀色の灯り。……浜の貝殻と金具があれば、あれに似たものが作れるかもしれない。',snapshot:null});}catch(e){}
    if(!silent)notif('💡 夢で見た灯りを思い出した。クラフト「貝殻ランタン」が作れるようになった');
  });
}
function rpgClearReward(n){
  if(!(n>=1&&n<=5))return false;
  return grantOnce('rpg.clear.'+n,()=>{
    try{HOME.addMaterial&&HOME.addMaterial('sea',n>=3?2:1);}catch(e){}
    notif(`🐚 夢の余韻のまま、朝の浜を少し歩いた。海のかけらを拾った（海のかけら+${n>=3?2:1}）`);
  });
}

// ── 状態の同期（棚・模様替えのフラグ） ──
function syncFlags(){
  const h=hd();if(!h)return;
  const f=flags(h);
  try{if(!f.repairedShelf&&typeof HOME.owned==='function'&&HOME.owned('furniture.repaired_shelf')>0)f.repairedShelf=true;}catch(e){}
}
let hooked=false;
function hookEvents(){
  if(hooked||typeof HOME.on!=='function')return;
  hooked=true;
  try{
    HOME.on('crafted',e=>{
      const id=e&&(e.recipeId||e.recipe||e.id||e.out||e.itemId);
      if(id==='repaired_shelf'||id==='furniture.repaired_shelf'||(e&&e.out==='furniture.repaired_shelf')){const h=hd();if(h)flags(h).repairedShelf=true;}
      else syncFlags();
    });
    HOME.on('placed',e=>{if(e&&e.by==='event')return;const h=hd();if(h)flags(h).decorated=true;});
    HOME.on('stored',()=>{const h=hd();if(h)flags(h).decorated=true;});
  }catch(e){}
}

// ── 関数ラップ ──
function wrap(name,make){
  const prev=root[name];
  if(typeof prev!=='function')return null;
  root[name]=make(prev);
  return prev;
}
// 読込：元の処理（前の家の削除を含む）→ 家の初期化・修復
wrap('saveDataToGs',prev=>function(saved){
  const r=prev.apply(this,arguments);
  try{if(HOME.isOpen&&HOME.isOpen()&&HOME.close)HOME.close();}catch(e){}
  try{if(HOME.memories&&HOME.memories.closeBook)HOME.memories.closeBook();}catch(e){}
  try{hd();syncFlags();syncRpg(true);}catch(e){console.warn('[home] load',e);}
  return r;
});
// 日送り：元の処理 → 植物の成長 → 物語 → （元の処理が保存していれば）保存し直す
wrap('nextDay',prev=>function(){
  const r=prev.apply(this,arguments);
  try{
    if(typeof HOME.tickDay==='function')HOME.tickDay();
    if(HOME.events&&typeof HOME.events.tick==='function')HOME.events.tick();
    if(HOME.life_events&&typeof HOME.life_events.tick==='function')HOME.life_events.tick();
    let has=false;try{has=!!localStorage.getItem(typeof SAVE_KEY!=='undefined'?SAVE_KEY:'dannoura_save_v1');}catch(e){}
    if(has&&typeof saveGame==='function')saveGame(true);
  }catch(e){console.warn('[home] nextDay',e);}
  return r;
});
// 工場の仕事：許可された端材を持ち帰る
wrap('endFactory',prev=>function(){
  let worked=true;try{worked=typeof ff==='undefined'||ff>0;}catch(e){}
  const r=prev.apply(this,arguments);
  try{if(worked&&HOME.bonds&&HOME.bonds.note)HOME.bonds.note('work',day());}catch(e){}
  try{if(worked){const metal=day()%2===0;dailyMaterial('factory',metal?'metal':'wood',1,metal?'🔩 持ち帰りを許可された端材の金具をもらった':'🪵 持ち帰りを許可された端材をもらった');}}catch(e){}
  return r;
});
// 子育て：小さくなった服を端切れに
wrap('handleChoice',prev=>function(ac){
  // 休む・寝かしつけは、元の処理（日付が進むことがある）より前の日付で記録する
  try{
    if(HOME.bonds&&HOME.bonds.note){
      if(ac==='rest_light'||ac==='rest_deep')HOME.bonds.note('rest','act.d'+day());
      else if(ac==='childcare')HOME.bonds.note('care',day());
    }
  }catch(e){}
  const r=prev.apply(this,arguments);
  try{if(ac==='childcare')dailyMaterial('childcare','cloth',1,'🧵 小さくなったあの子の服を、端切れにした');}catch(e){}
  return r;
});
// ミニゲーム：釣り・RPG（MG は minigames/core.js のトップレベル const）
(function(){
  let mg=null;try{mg=typeof MG!=='undefined'?MG:null;}catch(e){mg=null;}
  if(!mg||typeof mg.finish!=='function')return;
  const prev=mg.finish;
  mg.finish=function(r){
    const id=this.def&&this.def.id;
    const before=id==='rpg'?rpgCleared():0;
    const wasEnded=this._ended;
    const out=prev.apply(this,arguments);
    if(wasEnded)return out;
    try{
      if(id==='fishing'&&r&&r.fx&&r.fx.hope>0)dailyMaterial('fishing','sea',1,'🐚 港の波打ち際で、海のかけらを拾った');
      if(id==='rpg'){const after=rpgCleared();if(after>before){for(let n=before+1;n<=after;n++)rpgClearReward(n);syncRpg(false);}}
    }catch(e){console.warn('[home] minigame',e);}
    return out;
  };
})();

// ── エンディングの振り返り（main/presentation.js の runEnding から呼ばれる） ──
function snapshotCanvas(ref){
  if(typeof HOME.snapshot!=='function'||!ref||!ref.area)return null;
  try{
    const opt={scale:1};
    if(ref.snapshot){opt.placements=ref.snapshot.placements;opt.plants=ref.snapshot.plants;
      if(HOME.memories&&HOME.memories.litMap)opt.lit=HOME.memories.litMap(ref.snapshot);}
    const cv=HOME.snapshot(ref.area,opt);
    return cv&&cv.nodeType===1?cv:null;
  }catch(e){return null;}
}
// bonds の一言（悪い結末・未知の結末には何も足さない）
const BAD_END=['collapse','bankrupt','flame'];
function bondsLine(type){
  if(!type||BAD_END.indexOf(type)>=0)return null;
  try{return HOME.bonds&&typeof HOME.bonds.endingLine==='function'?HOME.bonds.endingLine(type)||null:null;}catch(e){return null;}
}
function endingReflection(type){
  const bl=bondsLine(type);
  let ref=null;
  if(HOME.events&&typeof HOME.events.reflection==='function'){try{ref=HOME.events.reflection(type);}catch(e){ref=null;}}
  if(!ref)return bl?{head:'― この30日 ―',node:null,lines:[bl],kind:'bonds'}:null;
  const node=document.createElement('div');
  node.className='pr-el home-reflect';
  node.style.cssText='margin:10px auto 4px;max-width:min(92%,420px);';
  const cv=snapshotCanvas(ref);
  if(cv){
    cv.style.cssText='display:block;width:100%;height:auto;max-height:42vh;object-fit:contain;image-rendering:pixelated;border-radius:6px;box-shadow:0 0 0 2px rgba(255,240,220,.55),0 6px 20px rgba(0,0,0,.6);background:#1a1426;';
    cv.setAttribute('role','img');
    cv.setAttribute('aria-label',(ref.area==='garden'?'庭':'部屋')+'のようす');
    node.appendChild(cv);
  }else if(ref.kind==='home'){
    // 絵が描けないなら、暮らしの振り返りは出さない（bonds の一言だけ）
    return bl?{head:'― この30日 ―',node:null,lines:[bl],kind:'bonds'}:null;
  }
  // 結末の思い出（花のときだけ・一度だけ）
  try{
    if(ref.kind==='flower'&&HOME.memories&&HOME.memories.add){
      HOME.memories.add({id:'wp.6.ending',day:day(),who:['dan','kid'],what:'窓辺の小さな約束',items:['garden.pot'],
        text:ref.lines.join('\n'),snapshot:ref.snapshot||(ref.area&&HOME.memories.snapshotOf?HOME.memories.snapshotOf(ref.area):null)});
      const s=HOME.events.state&&HOME.events.state();if(s&&s.step<6&&s.step>=5)s.step=6;
    }
  }catch(e){}
  const lines=ref.lines.slice(0,2);
  if(bl)lines.push(bl);
  return {head:ref.head||'― 暮らし ―',node:cv?node:null,lines,kind:ref.kind};
}
HOME.endingReflection=endingReflection;

// ── 初期化 ──
HOME.integrations={dailyMaterial,syncRpg,syncChapterRecipes,rpgClearReward,syncFlags,endingReflection,bondsLine};
function boot(){hookEvents();try{if(G()&&G().homeData){syncFlags();syncRpg(true);}}catch(e){}}
if(typeof document!=='undefined'&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
