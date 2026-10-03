// ═══════════════════════════════════════════════════════════
// 家・庭づくり：模様替えモード
//   選択 → プレビュー（ゴースト）→ 置く／回転／収納／移動、取り消し／やり直し、確定／破棄
//   下書き（HOME.createDraft）の上で動かし、確定したときだけ gs.homeData に書き戻して保存する
//   模様替えの間はゲーム内の時間は進まない
//   画面の枠（S）は interactions.js が作る。ここは HOME.editor として操作だけを持つ
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const CAT=id=>HOME.CATALOG&&HOME.CATALOG[id];
const AREA_NAME=a=>(HOME.AREAS[a]||{}).name||a;

function variantName(itemId,v){
  if(itemId==='garden.pot'&&HOME.POT_COLORS[v])return HOME.POT_COLORS[v]+'い鉢';
  return '';
}
function displayName(itemId,v){
  const c=CAT(itemId);if(!c)return '？？？';
  const vn=variantName(itemId,v);return vn?`${c.name}（${vn}）`:c.name;
}

const ED={
  // 編集の状態（S.ed）を作る
  start(S){
    const hd=HOME.ensure();if(!hd)return false;
    S.ed={
      draft:HOME.createDraft({room:hd.room.placements,garden:hd.garden.placements},{
        owned:(i,v)=>HOME.owned(i,v),seq:hd.seq,plantIds:Object.keys(hd.plants||{}),
        plantHolder:id=>{const p=hd.plants&&hd.plants[id];return (p&&p.holder)||'garden.pot';},
      }),
      sel:null,          // {kind:'new',itemId,variant,rotation,x,y} | {kind:'placed',id,moving,x,y,rotation}
      check:null,        // 直近の canPlace 結果
      msg:'',
      filter:S.area,
      drag:null,
    };
    S.mode='edit';
    return true;
  },
  stop(S){S.ed=null;S.mode='live';},
  dirty(S){return !!(S.ed&&S.ed.draft.dirty());},

  // ── 状態 → 描画オプション ──
  renderOpts(S){
    const E=S.ed,D=E.draft;
    const o={placements:D.placements(S.area),grid:true,selId:null,hideId:null,ghost:null};
    const s=E.sel;
    if(s&&s.kind==='placed'){
      o.selId=s.id;
      if(s.moving&&Number.isInteger(s.x)){
        const f=D.find(s.id);
        if(f&&f.area===S.area){o.hideId=s.id;o.ghost=Object.assign({itemId:f.P.itemId,variant:f.P.variant,x:s.x,y:s.y,rotation:s.rotation},ED._ghostCheck(S));}
      }
    }else if(s&&s.kind==='new'&&Number.isInteger(s.x)){
      o.ghost=Object.assign({itemId:s.itemId,variant:s.variant,x:s.x,y:s.y,rotation:s.rotation},ED._ghostCheck(S));
    }
    return o;
  },
  _ghostCheck(S){
    const r=ED.check(S);
    return r?{ok:r.ok,bad:r.bad,cells:r.cells}:{ok:false,bad:[],cells:[]};
  },
  check(S){
    const E=S.ed,s=E&&E.sel;if(!s||!Number.isInteger(s.x))return null;
    const D=E.draft;
    if(s.kind==='new')return D.check(S.area,{itemId:s.itemId,variant:s.variant,x:s.x,y:s.y,rotation:s.rotation});
    const f=D.find(s.id);if(!f)return null;
    return D.check(S.area,{itemId:f.P.itemId,variant:f.P.variant,x:s.x,y:s.y,rotation:s.rotation},f.area===S.area?s.id:undefined);
  },

  // ── 案内文（色だけに頼らず文で伝える） ──
  info(S){
    const E=S.ed;if(!E)return '';
    if(E.msg)return E.msg;
    const s=E.sel,D=E.draft;
    if(!s)return `模様替え中（${AREA_NAME(S.area)}）：下の収納から選ぶか、置いてある家具をタップして選んでください。時間は進みません。`;
    if(s.kind==='new'){
      const n=D.stored(s.itemId,s.variant);
      const nm=displayName(s.itemId,s.variant);
      if(!Number.isInteger(s.x))return `「${nm}」（収納 ${n}）：置きたいマスをタップしてください。`;
      const r=ED.check(S);
      return r&&r.ok?`「${nm}」をここに置けます。［置く］で決定（向き ${HOME.ROT_DIR[s.rotation]==='down'?'下':HOME.ROT_DIR[s.rotation]==='up'?'上':HOME.ROT_DIR[s.rotation]==='left'?'左':'右'}）。`:`置けません：${r?r.reason:''}`;
    }
    const f=D.find(s.id);if(!f)return '';
    const nm=displayName(f.P.itemId,f.P.variant);
    if(s.moving){
      const r=ED.check(S);
      return r&&r.ok?`「${nm}」をここへ移動できます。［置く］で決定。`:`ここへは動かせません：${r?r.reason:''}`;
    }
    return `「${nm}」を選択中：［移動］［回転］［収納］が使えます。`;
  },

  // ── ボタン ──
  actions(S){
    const E=S.ed,s=E&&E.sel,D=E.draft;
    const previewing=!!(s&&(s.kind==='new'||s.moving)&&Number.isInteger(s.x));
    const r=previewing?ED.check(S):null;
    return[
      {id:'place',label:'置く',icon:'place',disabled:!previewing,primary:!!(r&&r.ok),fn:()=>ED.place(S)},
      {id:'rotate',label:'回転',icon:'rotate',disabled:!s||(s.kind==='new'?CAT(s.itemId).rots.length<2:false),fn:()=>ED.rotate(S)},
      {id:'store',label:'収納',icon:'store',disabled:!(s&&s.kind==='placed'),fn:()=>ED.store(S)},
      {id:'move',label:'移動',icon:'edit',disabled:!(s&&s.kind==='placed'&&!s.moving),fn:()=>ED.startMove(S)},
      {id:'cancel',label:'選択解除',icon:'close',disabled:!s,fn:()=>ED.cancel(S)},
      {id:'undo',label:'取り消し',icon:'undo',disabled:!D.canUndo(),fn:()=>ED.undo(S),row:2},
      {id:'redo',label:'やり直し',icon:'redo',disabled:!D.canRedo(),fn:()=>ED.redo(S),row:2},
      {id:'discard',label:'破棄',icon:'close',fn:()=>ED.askDiscard(S),row:2},
      {id:'commit',label:'確定',icon:'place',primary:true,fn:()=>ED.commit(S),row:2},
    ];
  },

  // ── 収納リスト ──
  inventory(S){
    const E=S.ed,D=E.draft,hd=HOME.data();
    const out=[];
    Object.keys(HOME.CATALOG).forEach(id=>{
      const c=CAT(id);
      if(c.kind==='seed')return;            // 種は置けない（暮らしモードで鉢に植える）
      if(E.filter!=='all'&&c.areas.indexOf(E.filter)<0)return;
      const inv=hd.inventory[id];if(!inv)return;
      Object.keys(inv).forEach(v=>{
        if(!(inv[v]>0))return;
        out.push({itemId:id,variant:v,name:displayName(id,v),stored:D.stored(id,v),owned:inv[v],
          areaOk:c.areas.indexOf(S.area)>=0,areas:c.areas.map(AREA_NAME).join('・')});
      });
    });
    return out;
  },
  pick(S,itemId,variant){
    const E=S.ed;const c=CAT(itemId);if(!c)return;
    const keep=E.sel&&E.sel.kind==='new'&&E.sel.itemId===itemId&&E.sel.variant===variant;
    E.sel={kind:'new',itemId,variant,rotation:keep?E.sel.rotation:c.rots[0],x:keep?E.sel.x:undefined,y:keep?E.sel.y:undefined};
    E.msg='';
    if(E.draft.stored(itemId,variant)<=0)E.msg=`収納に「${displayName(itemId,variant)}」が残っていません。置いてあるものを［収納］すると使えます。`;
    else if(c.areas.indexOf(S.area)<0)E.msg=`「${c.name}」は${AREA_NAME(S.area)}には置けません（${c.areas.map(AREA_NAME).join('・')}だけ）。`;
    S.refresh();
  },

  // ── 盤面の操作 ──
  hitPlaced(S,cell){
    const D=S.ed.draft,L=D.placements(S.area);
    const at=(P)=>HOME.cellsOf(P).some(q=>q.x===cell.x&&q.y===cell.y);
    if(cell.band)return L.find(P=>CAT(P.itemId).layer==='wall'&&P.x===cell.x)||null;
    return L.find(P=>CAT(P.itemId).layer==='furniture'&&at(P))
      ||L.find(P=>CAT(P.itemId).layer!=='furniture'&&CAT(P.itemId).layer!=='wall'&&at(P))
      ||(cell.y===0?L.find(P=>CAT(P.itemId).layer==='wall'&&P.x===cell.x):null)||null;
  },
  tap(S,cell){
    const E=S.ed;if(!E||!cell)return;
    E.msg='';
    const s=E.sel;
    if(s&&(s.kind==='new'||s.moving)){
      if(s.x===cell.x&&s.y===cell.y){ED.place(S);return;}   // 同じマスをもう一度タップ＝置く
      s.x=cell.x;s.y=cell.y;S.refresh();return;
    }
    const P=ED.hitPlaced(S,cell);
    E.sel=P?{kind:'placed',id:P.instanceId,moving:false,x:P.x,y:P.y,rotation:P.rotation}:null;
    S.refresh();
  },
  place(S){
    const E=S.ed,s=E.sel;if(!s||!Number.isInteger(s.x))return;
    let r;
    if(s.kind==='new'){
      r=E.draft.place(S.area,{itemId:s.itemId,variant:s.variant,x:s.x,y:s.y,rotation:s.rotation});
      if(r.ok){
        S.ui.toast(`「${displayName(s.itemId,s.variant)}」を置きました`);
        E.sel={kind:'placed',id:r.P.instanceId,moving:false,x:r.P.x,y:r.P.y,rotation:r.P.rotation};
      }
    }else{
      r=E.draft.move(s.id,{x:s.x,y:s.y,rotation:s.rotation,area:S.area});
      if(r.ok){S.ui.toast('移動しました');s.moving=false;}
    }
    E.msg=r.ok?'':`置けません：${r.reason}`;
    S.sfx&&S.sfx(r.ok?'place':'bad');
    S.refresh();
  },
  rotate(S){
    const E=S.ed,s=E.sel;if(!s)return;
    E.msg='';
    if(s.kind==='new'||s.moving){
      const itemId=s.kind==='new'?s.itemId:E.draft.find(s.id).P.itemId;
      const rots=CAT(itemId).rots;
      if(rots.length<2){E.msg=`「${CAT(itemId).name}」は回せません`;S.refresh();return;}
      s.rotation=rots[(rots.indexOf(s.rotation)+1)%rots.length];
      S.refresh();return;
    }
    const r=E.draft.rotate(s.id);
    if(r.ok){const f=E.draft.find(s.id);s.rotation=f.P.rotation;}
    else E.msg=r.reason;
    S.refresh();
  },
  store(S){
    const E=S.ed,s=E.sel;if(!s||s.kind!=='placed')return;
    const f=E.draft.find(s.id);if(!f)return;
    const r=E.draft.store(s.id);
    if(r.ok){S.ui.toast(`「${displayName(f.P.itemId,f.P.variant)}」を収納しました`);E.sel=null;E.msg='';}
    else E.msg=r.reason;
    S.refresh();
  },
  startMove(S){
    const E=S.ed,s=E.sel;if(!s||s.kind!=='placed')return;
    const f=E.draft.find(s.id);if(!f)return;
    s.moving=true;s.x=f.P.x;s.y=f.P.y;s.rotation=f.P.rotation;
    E.msg=`「${displayName(f.P.itemId,f.P.variant)}」の移動先をタップしてください。`;
    S.refresh();
  },
  cancel(S){
    const E=S.ed;if(!E)return false;
    if(E.sel&&E.sel.moving){E.sel.moving=false;const f=E.draft.find(E.sel.id);if(f){E.sel.x=f.P.x;E.sel.y=f.P.y;E.sel.rotation=f.P.rotation;}E.msg='';S.refresh();return true;}
    if(E.sel){E.sel=null;E.msg='';S.refresh();return true;}
    return false;
  },
  _afterHistory(S){
    const E=S.ed;
    if(E.sel&&E.sel.kind==='placed'){
      const f=E.draft.find(E.sel.id);
      if(!f||f.area!==S.area)E.sel=null;
      else Object.assign(E.sel,{moving:false,x:f.P.x,y:f.P.y,rotation:f.P.rotation});
    }
    E.msg='';S.refresh();
  },
  undo(S){if(S.ed.draft.undo()){S.ui.toast('ひとつ戻しました');ED._afterHistory(S);}},
  redo(S){if(S.ed.draft.redo()){S.ui.toast('やり直しました');ED._afterHistory(S);}},
  arrow(S,dx,dy){
    const s=S.ed.sel;if(!s||!(s.kind==='new'||s.moving))return false;
    const A=HOME.AREAS[S.area];
    if(!Number.isInteger(s.x)){s.x=Math.floor(A.w/2);s.y=Math.floor(A.h/2);}
    else{s.x=Math.max(0,Math.min(A.w-1,s.x+dx));s.y=Math.max(0,Math.min(A.h-1,s.y+dy));}
    S.ed.msg='';S.refresh();return true;
  },

  // ── PC：ドラッグで移動（タッチでは使わない＝ドラッグ不要） ──
  down(S,cell,ev){
    const E=S.ed;if(!E||!cell)return false;
    if(ev.pointerType==='touch')return false;
    const P=ED.hitPlaced(S,cell);
    if(!P)return false;
    E.drag={id:P.instanceId,ox:cell.x-P.x,oy:cell.y-P.y,sx:ev.clientX,sy:ev.clientY,active:false};
    return true;
  },
  dragMove(S,cell,ev){
    const E=S.ed,d=E&&E.drag;if(!d||!cell)return;
    if(!d.active){
      if(Math.hypot(ev.clientX-d.sx,ev.clientY-d.sy)<6)return;
      const f=E.draft.find(d.id);if(!f)return;
      d.active=true;E.sel={kind:'placed',id:d.id,moving:true,x:f.P.x,y:f.P.y,rotation:f.P.rotation};
    }
    const nx=cell.x-d.ox,ny=cell.band?0:cell.y-d.oy;
    if(E.sel.x!==nx||E.sel.y!==ny){E.sel.x=nx;E.sel.y=ny;E.msg='';S.refresh();}
  },
  up(S,cell){
    const E=S.ed,d=E&&E.drag;if(!d)return false;
    E.drag=null;
    if(!d.active)return false;       // ただのクリック → tap として扱う
    ED.place(S);
    if(E.sel&&E.sel.moving){       // 置けなかった：元の場所に戻して理由は残す
      const msg=E.msg;ED.cancel(S);E.sel={kind:'placed',id:d.id,moving:false,x:E.draft.find(d.id).P.x,y:E.draft.find(d.id).P.y,rotation:E.draft.find(d.id).P.rotation};E.msg=msg;S.refresh();
    }
    return true;
  },

  // ── キーボード ──
  key(S,e){
    const k=e.key,mod=e.ctrlKey||e.metaKey;
    if(mod&&(k==='z'||k==='Z')){if(e.shiftKey)ED.redo(S);else ED.undo(S);return true;}
    if(mod&&(k==='y'||k==='Y')){ED.redo(S);return true;}
    if(mod)return false;
    if(k==='r'||k==='R'){ED.rotate(S);return true;}
    if(k==='Escape'){ED.cancel(S);return true;}
    if(k==='Enter'&&S.ed.sel&&(S.ed.sel.kind==='new'||S.ed.sel.moving)){ED.place(S);return true;}
    if((k==='Delete'||k==='Backspace')&&S.ed.sel&&S.ed.sel.kind==='placed'){ED.store(S);return true;}
    if(k==='m'||k==='M'){ED.startMove(S);return true;}
    const dir={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[k];
    if(dir)return ED.arrow(S,dir[0],dir[1]);
    return false;
  },

  // ── 確定・破棄 ──
  commit(S){
    const E=S.ed;if(!E)return false;
    const hd=HOME.ensure();
    if(!E.draft.dirty()){ED.stop(S);S.ui.toast('変更はありませんでした');S.refresh();return true;}
    const before={room:hd.room.placements,garden:hd.garden.placements};
    const after=E.draft.result();
    hd.room.placements=after.room;hd.garden.placements=after.garden;
    hd.seq=Math.max(hd.seq|0,E.draft.seq|0);
    // 収納した灯りの点灯状態は消す
    const live=new Set(after.room.concat(after.garden).map(P=>P.instanceId));
    Object.keys(hd.flags.lit||{}).forEach(id=>{if(!live.has(id))delete hd.flags.lit[id];});
    ['room','garden'].forEach(area=>{
      const b=new Map(before[area].map(P=>[P.instanceId,P])),a=new Map(after[area].map(P=>[P.instanceId,P]));
      a.forEach((P,id)=>{if(!b.has(id))HOME.emit('placed',{area,placement:P,by:'editor'});});
      b.forEach((P,id)=>{if(!a.has(id))HOME.emit('stored',{area,placement:P,by:'editor'});});
    });
    HOME.emit('change',{type:'layout'});
    const ok=HOME.save();
    ED.stop(S);
    if(ok)S.ui.toast('💾 模様替えを確定して保存しました');
    else S.ui.toast('⚠ 保存に失敗しました。模様替えはこの画面には反映されていますが、セーブはできていません。');
    S.afterCommit&&S.afterCommit(ok);
    S.refresh();
    return ok;
  },
  discard(S){ED.stop(S);S.ui.toast('模様替えを破棄しました');S.refresh();},
  async askDiscard(S){
    if(!ED.dirty(S)){ED.discard(S);return;}
    const i=await S.ui.choice('模様替えの変更をすべて破棄しますか？',[{t:'破棄する'},{t:'続ける'}]);
    if(i===0)ED.discard(S);
  },
  // 閉じる前：未確定なら 確定・破棄・続ける を聞く。閉じてよければ true
  async confirmExit(S){
    if(!S.ed)return true;
    if(!ED.dirty(S)){ED.stop(S);return true;}
    const i=await S.ui.choice('模様替えがまだ確定されていません。',[{t:'確定して閉じる'},{t:'破棄して閉じる'},{t:'続ける'}]);
    if(i===0){ED.commit(S);return true;}
    if(i===1){ED.discard(S);return true;}
    return false;
  },
  displayName,
};
HOME.editor=ED;
})();
