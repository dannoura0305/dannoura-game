// ═══════════════════════════════════════════════════════════
// 家・庭：部屋・庭を広げる（フェーズ3 §3）
//   HOME.expandInfo(area) → {area, done, from:{w,h}, to:{w,h}, money, mats:[{id,name,need,have}], enough, reason}
//   HOME.expand(area)     → {ok, reason}   一回きり。素材とお金をまとめて払う（途中で失敗しない）。縮めることはない
//   HOME.expansion.run(area) → Promise<boolean>  確認 → 会話 → 拡張 → 保存（画面から）
// 広がるのは右と下だけ：今の配置の座標はそのまま。部屋の出入口は新しい下端の行へ、庭の戸口・門は同じ位置。
// 価格は HOME.BAL.expand（catalog.js）。
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const G=()=>{try{return (typeof gs!=='undefined'&&gs)?gs:null;}catch(e){return null;}};
const AREA_NAME={room:'部屋',garden:'庭'};
const yen=n=>'¥'+(Math.floor(+n)||0).toLocaleString('ja-JP');

function price(area){const B=HOME.BAL&&HOME.BAL.expand;return (B&&B[area])||null;}
function info(area){
  const hd=HOME.data&&HOME.data();const P=price(area);const g=G();
  const Z=HOME.AREA_SIZES&&HOME.AREA_SIZES[area];
  if(!hd||!P||!Z)return{area,done:false,enough:false,reason:'いまは広げられません',mats:[],money:0,from:null,to:null};
  const done=!!(hd.expanded&&hd.expanded[area]);
  const mats=Object.keys(P.mats||{}).map(id=>({id,name:(HOME.MATERIALS[id]||{}).name||id,need:P.mats[id],have:hd.materials[id]|0}));
  const have=g&&Number.isFinite(+g.money)?+g.money:0;
  const lackMat=mats.find(m=>m.have<m.need);
  let reason='';
  if(done)reason=`${AREA_NAME[area]}はもう広げてあります`;
  else if(lackMat)reason=`${lackMat.name}が足りません（あと${lackMat.need-lackMat.have}）`;
  else if(have<P.money)reason=`お金が足りません（あと${yen(P.money-have)}）`;
  return{area,done,from:{w:Z.base.w,h:Z.base.h},to:{w:Z.expanded.w,h:Z.expanded.h},money:P.money,moneyHave:have,mats,enough:!done&&!reason,reason};
}
HOME.expandInfo=info;

// 広げたあとの広さで、今の配置がすべて有効で通れるか（念のため。右と下に広げるだけなので通常は必ず通る）
function checkAfter(hd,area){
  const A=HOME.AREAS[area];const keep={w:A.w,h:A.h,door:A.door,gate:A.gate,exits:A.exits};
  const z=HOME.AREA_SIZES[area].expanded;
  try{
    A.w=z.w;A.h=z.h;A.door={x:z.door.x,y:z.door.y};if(z.gate)A.gate={x:z.gate.x,y:z.gate.y};
    A.exits=[A.door].concat(A.gate?[A.gate]:[]);
    const list=hd[area].placements||[];
    for(let i=0;i<list.length;i++){
      const r=HOME.canPlace(area,list.filter((_,j)=>j!==i),list[i],{skipReach:true,ignoreId:list[i].instanceId});
      if(!r.ok)return{ok:false,reason:r.reason};
    }
    const rr=HOME.reachable(area,list);
    return rr.ok?{ok:true}:{ok:false,reason:rr.reason};
  }finally{Object.assign(A,keep);}
}

let busy=false;
HOME.expand=function(area){
  if(busy)return{ok:false,reason:'いま工事中です'};
  busy=true;
  try{
    if(area!=='room'&&area!=='garden')return{ok:false,reason:'その場所は広げられません'};
    const hd=HOME.data&&HOME.data();const g=G();
    if(!hd||!g)return{ok:false,reason:'データを読み込めません'};
    const I=info(area);
    if(!I.enough)return{ok:false,reason:I.reason||'いまは広げられません'};
    const chk=checkAfter(hd,area);
    if(!chk.ok)return{ok:false,reason:'今の置き方のままでは広げられません：'+chk.reason};
    // ここから先は途中で失敗しない操作だけ（支払い＋拡張をまとめて）
    const P=price(area);
    Object.keys(P.mats||{}).forEach(k=>{hd.materials[k]=(hd.materials[k]|0)-P.mats[k];});
    g.money=(+g.money||0)-P.money;
    hd.expanded=Object.assign({room:false,garden:false},hd.expanded||{});
    hd.expanded[area]=true;
    const z=HOME.AREA_SIZES[area].expanded;
    hd[area].width=z.w;hd[area].height=z.h;
    HOME.syncAreas(hd);
    HOME.emit('expanded',{area,from:I.from,to:I.to});
    HOME.emit('change',{type:'expand',area});
    return{ok:true,reason:'',from:I.from,to:I.to};
  }catch(e){
    try{console.error('[home] expand',e);}catch(_){}
    return{ok:false,reason:'うまく広げられませんでした'};
  }finally{busy=false;}
};

/* ── 画面から：確認 → 工事の場面 → 保存 ── */
const DAN=(text,face)=>({who:'dan',face:face||'normal',text});
const KID=(text,face)=>({who:'kid',face:face||'normal',text});
const NAR=text=>({who:'',text});
const SCENE={
  room:[
    NAR('休みの日。物置にしていた奥の納戸の、うすい仕切りを外すことにした。'),
    {who:'hancho',face:'happy',text:'おう、来たで。こんな仕切り、ワシとお前で昼までや。'},
    DAN('班長、ほんとに助かります。……アタシ、お茶とおにぎり用意しとくちゃ。','smile'),
    NAR('バールで釘を浮かせ、板を一枚ずつ外していく。娘は廊下で、クマと一緒に「がんばれー」と応援している。'),
    {who:'hancho',face:'happy',text:'ほれ、床もちょっと張り足しといた。……ええ部屋になったやないか。'},
    KID('わあ、ひろーい！ ここで、おどれるね！','happy'),
    DAN('ほんとね。……ありがとう、班長。今度、なんかおごらせてちょうだい。','smile'),
  ],
  garden:[
    NAR('垣根の向こうの、千代さんちとの間の空き地。草ぼうぼうのまま、ずっと手つかずだった。'),
    {who:'chiyo',face:'happy',text:'あそこ、使うてええよ。うちじゃ手が回らんけえ、草ぼうぼうよりずっとええわ。'},
    DAN('ええんですか……！ じゃあ、ありがたく。ちゃんと手入れします。','smile'),
    NAR('草を刈り、石をどけ、娘と一緒に柵をひとつずつ立て直した。土の匂いがする。'),
    KID('パパ、おにわ、おっきくなった！ おはな、もっと植えられるね','happy'),
    {who:'chiyo',face:'happy',text:'まあまあ、よう働いたねえ。……お茶にしようや。'},
  ],
};
async function run(area){
  const ui=HOME.ui;if(!ui)return false;
  const I=info(area);
  if(I.done){ui.toast(`${AREA_NAME[area]}はもう広げてあります`);return false;}
  const need=I.mats.map(m=>`${m.name}${m.need}`).join('・');
  if(!I.enough){
    await ui.say([NAR(`${AREA_NAME[area]}を広げるには、${need}と${yen(I.money)}が要る。（${I.reason}）`)]);
    return false;
  }
  const i=await ui.choice(`${AREA_NAME[area]}を広げる？（${I.from.w}×${I.from.h} → ${I.to.w}×${I.to.h}マス）\n${need}・${yen(I.money)}（所持 ${yen(I.moneyHave)}）を使います。一回きりで、元には戻せません。`,
    [{t:'広げる',s:'置いてある家具はそのまま'},{t:'やめておく'}]);
  if(i!==0)return false;
  const r=HOME.expand(area);
  if(!r.ok){try{if(typeof AU!=='undefined')AU.se('warn');}catch(e){}ui.toast(`広げられません：${r.reason}`);return false;}
  try{if(typeof AU!=='undefined')AU.se('repair');}catch(e){}
  const S=HOME._screen;
  if(S&&S.open&&typeof S.refresh==='function'){try{S.onResize&&S.onResize();S.refresh();}catch(e){}}
  await ui.say(SCENE[area]);
  try{HOME.memories&&HOME.memories.add&&HOME.memories.add({id:'expand.'+area,day:(G()&&G().day)|0||1,who:area==='room'?['dan','kid','hancho']:['dan','kid','chiyo'],
    what:area==='room'?'部屋がひと回り広くなった':'庭がひろがった',items:[],
    text:area==='room'?'班長と仕切りを外した。娘はさっそく、広くなったところでくるくる回っていた。':'千代さんの空き地を借りて、庭が広くなった。娘と柵を立てた手が、まだ土の匂いがする。',
    snapshot:HOME.memories.snapshotOf?HOME.memories.snapshotOf(area):null});}catch(e){}
  const ok=HOME.save();
  ui.toast(ok?`🔨 ${AREA_NAME[area]}が ${I.to.w}×${I.to.h}マスになりました（保存しました）`:`⚠ ${AREA_NAME[area]}は広がりましたが、保存に失敗しました`);
  return true;
}
HOME.expansion={info,run,price,SCENE};
})();
