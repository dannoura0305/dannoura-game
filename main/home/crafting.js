// ═══════════════════════════════════════════════════════════
// 家・庭づくり：クラフト（素材の消費と完成品の追加を1操作で）
//   HOME.craft(recipeId)        → {ok, reason, itemId}
//   HOME.recipeInfo(recipeId)   → {unlocked, enough, need:[{id,name,need,have}]}
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const G=()=>{try{return (typeof gs!=='undefined'&&gs)?gs:null;}catch(e){return null;}};

HOME.recipeInfo=function(id){
  const r=HOME.RECIPES[id];const hd=HOME.data&&HOME.data();
  if(!r||!hd)return{unlocked:false,enough:false,need:[]};
  const need=Object.keys(r.mats).map(k=>({id:k,name:(HOME.MATERIALS[k]||{}).name||k,need:r.mats[k],have:hd.materials[k]|0}));
  return{unlocked:HOME.hasRecipe(id),enough:need.every(n=>n.have>=n.need),need};
};

let busy=false;
HOME.craft=function(id){
  if(busy)return{ok:false,reason:'いま作っているところです'};
  busy=true;
  try{
    const hd=HOME.data&&HOME.data();
    const r=HOME.RECIPES[id];
    if(!hd)return{ok:false,reason:'データを読み込めません'};
    if(!r||!HOME.CATALOG[r.out])return{ok:false,reason:'そのレシピはありません'};
    if(!HOME.hasRecipe(id))return{ok:false,reason:'まだ作り方を思いつきません'};
    const info=HOME.recipeInfo(id);
    const lack=info.need.find(n=>n.have<n.need);
    if(lack)return{ok:false,reason:`${lack.name}が足りません（あと${lack.need-lack.have}）`};
    // ここから先は途中で失敗しない操作だけ（素材消費＋完成品追加をまとめて行う）
    Object.keys(r.mats).forEach(k=>{hd.materials[k]=(hd.materials[k]|0)-r.mats[k];});
    const v='default';
    const inv=hd.inventory[r.out]=(hd.inventory[r.out]&&typeof hd.inventory[r.out]==='object')?hd.inventory[r.out]:{};
    const variant=(HOME.CATALOG[r.out].variants||[v])[0];
    inv[variant]=(inv[variant]|0)+(r.n||1);
    if(id==='repaired_shelf')hd.flags.repairedShelf=true;
    const g=G();
    if(g)g.fatigue=Math.min(100,(+g.fatigue||0)+HOME.BAL.craftFatigue);
    try{if(typeof advTime==='function')advTime(HOME.BAL.craftMin);}catch(e){}
    HOME.emit('crafted',{recipeId:id,itemId:r.out,n:r.n||1});
    HOME.emit('change',{type:'craft',recipeId:id});
    return{ok:true,reason:'',itemId:r.out,n:r.n||1};
  }catch(e){
    return{ok:false,reason:'うまく作れませんでした'};
  }finally{busy=false;}
};
})();
