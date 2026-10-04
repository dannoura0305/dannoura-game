// ═══════════════════════════════════════════════════════════
// 家・庭づくり：配置の純ロジック（DOM に依存しない）
//   HOME.footprint(itemId, rotation)          → {w,h}
//   HOME.cellsOf(P)                           → [{x,y}]
//   HOME.canPlace(area, placements, cand, opts) → {ok, reason, cells, bad}
//   HOME.reachable(area, placements)          → {ok, reason, cells}
//   HOME.useCell(area, placements, P)         → {x,y} | null
//   HOME.canUse(area, placements, P)          → {ok, reason, cell}
//   HOME.createDraft(src, opts)               → 模様替えの下書き（取り消し/やり直し付き）
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const CAT=id=>HOME.CATALOG&&HOME.CATALOG[id];
const AREA=a=>HOME.AREAS&&HOME.AREAS[a];
const LAYER_NAME={furniture:'家具',rug:'ラグ',path:'飛び石',wall:'壁の飾り'};

function normRot(r){r=Math.round(+r||0);r=((r%360)+360)%360;return r;}
function footprint(itemId,rotation){
  const c=CAT(itemId);if(!c)return{w:1,h:1};
  const r=normRot(rotation);
  return (r===90||r===270)?{w:c.h,h:c.w}:{w:c.w,h:c.h};
}
function cellsOf(P){
  const f=footprint(P.itemId,P.rotation),out=[];
  for(let j=0;j<f.h;j++)for(let i=0;i<f.w;i++)out.push({x:P.x+i,y:P.y+j});
  return out;
}
function layerOf(P){const c=CAT(P.itemId);return c?c.layer:(P.layer||'furniture');}
function inB(A,x,y){return x>=0&&y>=0&&x<A.w&&y<A.h;}
function isExit(A,x,y){return (A.exits||[]).some(e=>e.x===x&&e.y===y);}
function solidGrid(A,placements,ignoreId){
  const g=new Uint8Array(A.w*A.h);
  (placements||[]).forEach(P=>{
    if(!P||(ignoreId!=null&&P.instanceId===ignoreId))return;
    const c=CAT(P.itemId);if(!c||!c.solid||c.layer!=='furniture')return;
    cellsOf(P).forEach(q=>{if(inB(A,q.x,q.y))g[q.y*A.w+q.x]=1;});
  });
  return g;
}
function bfs(A,solid,start){
  const seen=new Uint8Array(A.w*A.h);
  if(!start||!inB(A,start.x,start.y)||solid[start.y*A.w+start.x])return seen;
  const q=[start.y*A.w+start.x];seen[q[0]]=1;
  while(q.length){
    const k=q.shift(),x=k%A.w,y=(k/A.w)|0;
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{
      const nx=x+dx,ny=y+dy;if(!inB(A,nx,ny))return;
      const nk=ny*A.w+nx;if(seen[nk]||solid[nk])return;
      seen[nk]=1;q.push(nk);
    });
  }
  return seen;
}
function reachable(area,placements){
  const A=AREA(area);if(!A)return{ok:false,reason:'場所が不明です',cells:[]};
  const solid=solidGrid(A,placements);
  const blockedExit=(A.exits||[]).filter(e=>solid[e.y*A.w+e.x]);
  if(blockedExit.length)return{ok:false,reason:area==='room'?'出入口がふさがってしまいます':'戸口か門がふさがってしまいます',cells:blockedExit};
  const seen=bfs(A,solid,A.door);
  if(area==='garden'){
    const g=A.gate;
    if(g&&!seen[g.y*A.w+g.x])return{ok:false,reason:'家の戸口から門まで通れなくなります',cells:[g]};
    return{ok:true,reason:'',cells:[]};
  }
  const lost=[];
  for(let y=0;y<A.h;y++)for(let x=0;x<A.w;x++){const k=y*A.w+x;if(!solid[k]&&!seen[k])lost.push({x,y});}
  if(lost.length)return{ok:false,reason:'通れない場所（行き止まり）ができてしまいます',cells:lost};
  return{ok:true,reason:'',cells:[]};
}

/* 置けるか？ cand={itemId,x,y,rotation,variant}  opts={ignoreId, stored, skipReach} */
function canPlace(area,placements,cand,opts){
  opts=opts||{};
  const res=(ok,reason,cells,bad)=>({ok,reason:reason||'',cells:cells||[],bad:bad||[]});
  const c=cand&&CAT(cand.itemId);
  if(!c)return res(false,'知らないアイテムです');
  if(c.kind==='seed')return res(false,`${c.name}は置けません（空の鉢かプランターに植えます）`);
  const A=AREA(area);if(!A)return res(false,'場所が不明です');
  if(c.areas.indexOf(area)<0)return res(false,`${c.name}は${A.name}には置けません（${c.areas.map(a=>AREA(a).name).join('・')}だけ）`);
  const rot=normRot(cand.rotation);
  if(c.rots.indexOf(rot)<0)return res(false,`${c.name}はその向きにできません`);
  if(opts.stored!==undefined&&opts.stored<=0)return res(false,`収納に${c.name}が残っていません`);
  if(!Number.isInteger(cand.x)||!Number.isInteger(cand.y))return res(false,'置く場所を選んでください');
  const P={itemId:cand.itemId,x:cand.x,y:cand.y,rotation:rot};
  const cells=cellsOf(P);
  const out=cells.filter(q=>!inB(A,q.x,q.y));
  if(out.length)return res(false,`${A.name}からはみ出しています`,cells,cells.filter(q=>inB(A,q.x,q.y)).length?out:[]);
  if(c.layer==='wall'){
    if(area!=='room'||cells.some(q=>q.y!==0))return res(false,`${c.name}は壁（いちばん奥の列）にしか掛けられません`,cells,cells.filter(q=>q.y!==0));
  }else if(c.wallOnly)return res(false,`${c.name}は壁にしか掛けられません`,cells,cells);
  // 同じレイヤー同士の重なり
  const occ=new Map();
  (placements||[]).forEach(Q=>{
    if(!Q||(opts.ignoreId!=null&&Q.instanceId===opts.ignoreId)||layerOf(Q)!==c.layer)return;
    cellsOf(Q).forEach(q=>occ.set(q.x+','+q.y,Q));
  });
  const hit=cells.filter(q=>occ.has(q.x+','+q.y));
  if(hit.length){
    const other=CAT(occ.get(hit[0].x+','+hit[0].y).itemId);
    return res(false,`${other?other.name:'ほかの'+LAYER_NAME[c.layer]}と重なっています`,cells,hit);
  }
  // 出入口は常に空ける（家具・灯り・鉢など furniture レイヤー）
  if(c.layer==='furniture'){
    const ex=cells.filter(q=>isExit(A,q.x,q.y));
    if(ex.length)return res(false,area==='room'?'出入口をふさいでしまいます':'戸口・門をふさいでしまいます',cells,ex);
  }
  if(!opts.skipReach&&c.solid&&c.layer==='furniture'){
    const next=(placements||[]).filter(Q=>Q&&!(opts.ignoreId!=null&&Q.instanceId===opts.ignoreId)).concat([P]);
    const r=reachable(area,next);
    if(!r.ok)return res(false,r.reason,cells,r.cells.length&&r.cells.length<=cells.length*3?r.cells:cells);
  }
  return res(true,'',cells,[]);
}

/* 「使う位置」：正面の隣・長辺の横・自分のマス・周りのどこか */
function useCandidates(A,P){
  const c=CAT(P.itemId);if(!c)return[];
  const f=footprint(P.itemId,P.rotation),r=normRot(P.rotation),L=[];
  const row=(y)=>{for(let i=0;i<f.w;i++)L.push({x:P.x+i,y});};
  const col=(x)=>{for(let j=0;j<f.h;j++)L.push({x,y:P.y+j});};
  switch(c.use){
    case'self':L.push({x:P.x,y:P.y});break;
    case'wall':L.push({x:P.x,y:0},{x:P.x,y:1});break;
    case'front':
      if(r===0)row(P.y+f.h);else if(r===180)row(P.y-1);else if(r===90)col(P.x-1);else col(P.x+f.w);
      break;
    case'side':
      if(f.h>=f.w){col(P.x-1);col(P.x+f.w);}else{row(P.y-1);row(P.y+f.h);}
      break;
    case'near':row(P.y+f.h);col(P.x-1);col(P.x+f.w);row(P.y-1);break;
    default:return[];
  }
  return L.filter(q=>inB(A,q.x,q.y));
}
function useCell(area,placements,P){
  const A=AREA(area);if(!A||!P)return null;
  const L=useCandidates(A,P);if(!L.length)return null;
  const c=CAT(P.itemId);
  if(c.use==='self')return L[0];
  const solid=solidGrid(A,placements),seen=bfs(A,solid,A.door);
  return L.find(q=>!solid[q.y*A.w+q.x]&&seen[q.y*A.w+q.x])||L.find(q=>!solid[q.y*A.w+q.x])||L[0];
}
function canUse(area,placements,P){
  const c=P&&CAT(P.itemId);if(!c)return{ok:false,reason:'知らないアイテムです',cell:null};
  if(c.use==='none'||!c.use)return{ok:false,reason:`${c.name}は使うものではありません`,cell:null};
  const A=AREA(area);
  const cell=useCell(area,placements,P);
  if(!cell)return{ok:false,reason:`${c.name}の使う側が${A?A.name:''}の外を向いていて使えません`,cell:null};
  if(c.use==='self')return{ok:true,reason:'',cell};
  const solid=solidGrid(A,placements);
  const where=c.use==='front'?'正面':c.use==='side'?'横':'まわり';
  if(solid[cell.y*A.w+cell.x])return{ok:false,reason:`${c.name}の${where}がふさがっていて使えません`,cell};
  const seen=bfs(A,solid,A.door);
  if(!seen[cell.y*A.w+cell.x])return{ok:false,reason:`${c.name}の${where}まで歩いて行けません`,cell};
  return{ok:true,reason:'',cell};
}

/* 人が立てるマス：solid でない・出入口でない・avoid（他の人物）でない。(x,y) に最も近いマスを返す（無ければ null）
   訪問者の位置決めに使う（壁ぎわ・家具の上・出入口には決して置かない） */
function standCell(area,placements,x,y,avoid){
  const A=AREA(area);if(!A)return null;
  const solid=solidGrid(A,placements),seen=bfs(A,solid,A.door);
  const av=new Set((avoid||[]).filter(Boolean).map(q=>Math.round(q.x)+','+Math.round(q.y)));
  x=Number.isFinite(+x)?Math.round(+x):A.door.x;y=Number.isFinite(+y)?Math.round(+y):A.door.y;
  let best=null,bd=1e9;
  for(let pass=0;pass<2&&!best;pass++){
    for(let yy=0;yy<A.h;yy++)for(let xx=0;xx<A.w;xx++){
      const k=yy*A.w+xx;
      if(solid[k]||isExit(A,xx,yy)||av.has(xx+','+yy))continue;
      if(pass===0&&!seen[k])continue;            // まずは出入口から歩いて行けるマス
      const d=Math.abs(xx-x)+Math.abs(yy-y)+(yy*A.w+xx)*1e-6;
      if(d<bd){bd=d;best={x:xx,y:yy};}
    }
  }
  return best;
}

/* ねこの昼寝の場所の候補：[{x,y,on}]。on=null は床（solid でないマス）、on=instanceId は家具の上（ベンチ・布団）
   クッション・ラグの上・庭の日なた（家の壁から離れた草地）・ベンチ・布団の足もと。出入口は除く */
function catSpots(area,placements,opts){
  opts=opts||{};
  const A=AREA(area);if(!A)return[];
  const solid=solidGrid(A,placements),out=[],seen=new Set();
  const add=(x,y,on,kind)=>{const k=x+','+y;if(seen.has(k)||!inB(A,x,y)||isExit(A,x,y))return;if(!on&&solid[y*A.w+x])return;seen.add(k);out.push({x,y,on:on||null,kind});};
  (placements||[]).forEach(P=>{
    const c=CAT(P.itemId);if(!c)return;
    if(P.itemId==='furniture.cushion')add(P.x,P.y,null,'cushion');
    else if(P.itemId==='deco.rug')cellsOf(P).forEach(q=>add(q.x,q.y,null,'rug'));
    else if(P.itemId==='garden.bench')cellsOf(P).forEach(q=>add(q.x,q.y,P.instanceId,'bench'));
    else if(P.itemId==='furniture.futon'){const cs=cellsOf(P);const f=footprint(P.itemId,P.rotation);
      // 足もと：縦なら下の行、横なら左の列（頭は上／右）
      cs.filter(q=>f.h>f.w?q.y===P.y+f.h-1:q.x===P.x).forEach(q=>add(q.x,q.y,P.instanceId,'futon'));}
  });
  if(area==='garden'&&!opts.night){
    for(let y=3;y<A.h;y++)for(let x=0;x<A.w;x++)if((x*7+y*3)%5===0)add(x,y,null,'sun');
  }
  return out;
}

/* ── 模様替えの下書き（純ロジック・取り消し/やり直し） ──
   src: {room:[P], garden:[P]}  opts: {owned(itemId,variant)→n, seq, plantIds:[id], plantHolder(id)→itemId}
   収納した鉢・プランターを置き直すと、同じ種類の入れ物に植わっていた植物（持ち主のいない記録）を引き継ぐ
   所持総数は変えず、配置だけを動かす → 収納数＝所持−配置 は常に整合する */
function clone(o){return JSON.parse(JSON.stringify(o));}
function createDraft(src,opts){
  opts=opts||{};
  const owned=opts.owned||(()=>0);
  let state={room:clone((src&&src.room)||[]),garden:clone((src&&src.garden)||[])};
  // フェーズ3：外観・内装（{exterior:{roof,wall,door}, wallpaper, floorId}）も下書きに入れて、取り消し/やり直しの対象にする
  if(src&&src.look&&typeof src.look==='object')state.look=clone(src.look);
  const orig=JSON.stringify(state);
  const past=[],future=[];
  let seq=Math.max(1,opts.seq|0);
  const plantIds=(opts.plantIds||[]).slice();
  const holderOf=typeof opts.plantHolder==='function'?opts.plantHolder:(()=>'garden.pot');
  const all=()=>state.room.concat(state.garden);
  const placed=(itemId,variant)=>all().filter(P=>P.itemId===itemId&&(variant===undefined||P.variant===variant)).length;
  const stored=(itemId,variant)=>Math.max(0,owned(itemId,variant)-placed(itemId,variant));
  const find=id=>{for(const a of['room','garden']){const i=state[a].findIndex(P=>P.instanceId===id);if(i>=0)return{area:a,i,P:state[a][i]};}return null;};
  const commit=fn=>{const snap=clone(state);const r=fn();if(r&&r.ok){past.push(snap);if(past.length>200)past.shift();future.length=0;}return r;};
  const newId=itemId=>{
    const c=CAT(itemId);
    if(c&&c.plantable){const used=new Set(all().map(P=>P.instanceId));const orphan=plantIds.find(id=>!used.has(id)&&(holderOf(id)||'garden.pot')===itemId);if(orphan)return orphan;}
    let id;const used=new Set(all().map(P=>P.instanceId));do{id='p'+(seq++);}while(used.has(id)||plantIds.indexOf(id)>=0);return id;
  };
  const D={
    get state(){return state;},
    get seq(){return seq;},
    placements:a=>state[a],
    stored,placed,find,
    canUndo:()=>past.length>0,canRedo:()=>future.length>0,
    dirty:()=>JSON.stringify(state)!==orig,
    check(area,cand,ignoreId){
      const o={ignoreId};
      if(!ignoreId)o.stored=stored(cand.itemId,cand.variant||'default');
      return canPlace(area,state[area],cand,o);
    },
    place(area,cand){
      return commit(()=>{
        const variant=cand.variant||'default';
        const r=D.check(area,Object.assign({},cand,{variant}));
        if(!r.ok)return r;
        const c=CAT(cand.itemId);
        const P={instanceId:newId(cand.itemId),itemId:cand.itemId,x:cand.x,y:cand.y,rotation:normRot(cand.rotation),variant,layer:c.layer};
        state[area].push(P);
        return Object.assign(r,{P});
      });
    },
    move(id,to){
      return commit(()=>{
        const f=find(id);if(!f)return{ok:false,reason:'その家具は見つかりません'};
        const cand={itemId:f.P.itemId,x:to.x,y:to.y,rotation:to.rotation===undefined?f.P.rotation:to.rotation,variant:f.P.variant};
        const area=to.area||f.area;
        if(area!==f.area){
          const r=canPlace(area,state[area],cand,{});if(!r.ok)return r;
          state[f.area].splice(f.i,1);
          const P=Object.assign({},f.P,{x:cand.x,y:cand.y,rotation:normRot(cand.rotation)});state[area].push(P);
          return Object.assign(r,{P});
        }
        const r=canPlace(area,state[area],cand,{ignoreId:id});if(!r.ok)return r;
        Object.assign(f.P,{x:cand.x,y:cand.y,rotation:normRot(cand.rotation)});
        return Object.assign(r,{P:f.P});
      });
    },
    rotate(id){
      const f=find(id);if(!f)return{ok:false,reason:'その家具は見つかりません'};
      const c=CAT(f.P.itemId);
      if(c.rots.length<2)return{ok:false,reason:`${c.name}は回せません`};
      const k=c.rots.indexOf(normRot(f.P.rotation));
      let first=null;
      for(let s=1;s<c.rots.length;s++){
        const rot=c.rots[(k+s)%c.rots.length];
        const r=canPlace(f.area,state[f.area],{itemId:f.P.itemId,x:f.P.x,y:f.P.y,rotation:rot,variant:f.P.variant},{ignoreId:id});
        if(r.ok)return D.move(id,{x:f.P.x,y:f.P.y,rotation:rot});
        if(!first)first=r;
      }
      return{ok:false,reason:'回せません：'+first.reason,cells:first.cells,bad:first.bad};
    },
    store(id){
      return commit(()=>{
        const f=find(id);if(!f)return{ok:false,reason:'その家具は見つかりません'};
        state[f.area].splice(f.i,1);
        return{ok:true,reason:'',P:f.P};
      });
    },
    // 場所ごとの「最初の状態に戻す」（1回の取り消しで元に戻る）
    //   layout が無い：その場所に置いてあるものをすべて収納へ（出入口をふさぐものは無いので、全部外して安全）
    //   layout=[[itemId,x,y,rotation],...]：すべて収納してから、収納にあるぶんだけ最初の配置に置く
    //   所持数（owned）は触らない＝増えない・消えない。置けないもの・足りないものは収納のまま（skipped）
    reset(area,layout){
      if(!state[area])return{ok:false,reason:'場所が不明です'};
      const sig=L=>JSON.stringify(L.map(P=>[P.itemId,P.x,P.y,normRot(P.rotation),P.variant].join(',')).sort());
      const before=sig(state[area]);
      const r=commit(()=>{
        const removed=state[area].length;
        state[area]=[];
        let placed=0;const skipped=[];
        (Array.isArray(layout)?layout:[]).forEach(row=>{
          const itemId=row[0],x=row[1],y=row[2],rotation=normRot(row[3]);
          const c=CAT(itemId);if(!c){skipped.push(itemId);return;}
          const vars=c.variants&&c.variants.length?c.variants:['default'];
          const v=vars.find(v=>stored(itemId,v)>0);
          if(!v){skipped.push(itemId);return;}
          const chk=canPlace(area,state[area],{itemId,x,y,rotation,variant:v},{stored:stored(itemId,v)});
          if(!chk.ok){skipped.push(itemId);return;}
          state[area].push({instanceId:newId(itemId),itemId,x,y,rotation,variant:v,layer:c.layer});
          placed++;
        });
        if(!removed&&!placed)return{ok:false,reason:'置いてあるものがありません'};
        return{ok:true,reason:'',removed,placed,skipped};
      });
      if(r.ok&&sig(state[area])===before){state=past.pop();return{ok:false,reason:'もう最初の状態です',same:true};}
      return r;
    },
    look:()=>state.look||null,
    // 外観・内装を変える。patch={exterior:{roof:'red'}} / {wallpaper:'mint'} / {floorId:'floor.tatami'}
    setLook(patch){
      if(!state.look)return{ok:false,reason:'外観・内装は変えられません'};
      const cur=JSON.stringify(state.look);
      const next=clone(state.look);
      if(patch&&patch.exterior&&typeof patch.exterior==='object')next.exterior=Object.assign({},next.exterior||{},patch.exterior);
      ['wallpaper','floorId'].forEach(k=>{if(patch&&typeof patch[k]==='string')next[k]=patch[k];});
      if(JSON.stringify(next)===cur)return{ok:true,reason:'',same:true};
      return commit(()=>{state.look=next;return{ok:true,reason:''};});
    },
    undo(){if(!past.length)return false;future.push(clone(state));state=past.pop();return true;},
    redo(){if(!future.length)return false;past.push(clone(state));state=future.pop();return true;},
    result(){return clone(state);},
  };
  return D;
}

Object.assign(HOME,{normRot,footprint,cellsOf,layerOf,solidGrid,reachable,canPlace,useCell,canUse,createDraft,standCell,catSpots,
  _isExit:(area,x,y)=>{const A=AREA(area);return !!(A&&isExit(A,x,y));}});
})();
