// ═══════════════════════════════════════════════════════════
// 家・庭づくり：画面（開閉）・暮らしモード（調べる・使う・娘と話す）・会話UI・クラフト画面
//   HOME.open(area='room') / HOME.close() / HOME.isOpen()
//   HOME.ui.say(lines) / HOME.ui.choice(prompt, options) / HOME.ui.prompt(label, def, max) / HOME.ui.toast(text)
//   フック：HOME.hooks.onOpen(area) / HOME.hooks.talkKid() / HOME.hooks.useItem(P) / HOME.hooks.talkVisitor(who) → Promise<boolean handled>
//   訪問者：HOME.setVisitor({who:'chiyo'|'hancho', area, x, y, dir, pose, sitOn}) / HOME.clearVisitor() / HOME.visitor()
//   娘の過ごし方：HOME.kidActivity() → 'sleep'|'held'|'cushion'|'read'|'draw'|'play'|'plants'|'radio'|'mobile'|'wander'|'away'|null
//   植える：空の鉢・プランターを［種を植える］→ 持っている種を選ぶ（HOME.plantSeed）
//   既存の横スクロールの部屋（homescene.js）には触らない。閉じたら描画ループと入力を必ず止める。
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=window;
const HOME=root.HOME=root.HOME||{};
HOME.hooks=HOME.hooks||{};
const CAT=id=>HOME.CATALOG&&HOME.CATALOG[id];
const ART=()=>root.HOME_ART||null;
const ED=()=>HOME.editor;
const G=()=>{try{return (typeof gs!=='undefined'&&gs)?gs:null;}catch(e){return null;}};
const inSim=()=>{try{return !!(root.frameElement&&/simulator/.test(root.parent.location.pathname));}catch(e){return false;}};
const isNight=()=>{const g=G();const h=g?+g.hour:22;return h>=18||h<6;};
const sfx=t=>{try{if(typeof AU!=='undefined')AU.se({place:'decide',bad:'warn',craft:'repair',talk:'btn'}[t]||t);}catch(e){}};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const $el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;};

// HOME_ART の画像は使い回し（キャッシュ）なので、DOM に置くときは複製する
function copyCanvas(src){
  if(!src||!src.width)return null;
  const c=document.createElement('canvas');c.width=src.width;c.height=src.height;
  const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(src,0,0);
  return c;
}
function uiIcon(name){
  const a=ART();
  if(a&&typeof a.uiIcon==='function'){try{const c=copyCanvas(a.uiIcon(name));if(c){c.setAttribute('aria-hidden','true');c.classList.add('hm-ic');return c;}}catch(e){}}
  return null;
}
function itemIcon(itemId,variant){
  const a=ART();
  let c=null;
  if(a&&typeof a.icon==='function'){try{c=copyCanvas(a.icon(itemId,variant));}catch(e){c=null;}}
  if(!c||c.nodeType!==1){
    // 代用：配置と同じ描画を縮めて描く
    c=document.createElement('canvas');c.width=48;c.height=48;
    const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
    const f=HOME.footprint(itemId,0),T=Math.floor(44/Math.max(f.w,f.h));
    try{
      ctx.translate(Math.floor((48-f.w*T)/2),Math.floor((48-f.h*T)/2));
      if(HOME._drawItem)HOME._drawItem(ctx,itemId,{rotation:0,variant,T,t:0,px:0,py:0});
    }catch(e){}
  }
  c.classList.add('hm-item-ic');
  c.setAttribute('role','img');
  c.setAttribute('aria-label',(CAT(itemId)||{}).name||'？？？');
  return c;
}
// 素材のアイコン＋文字（絵文字は使わない）
function matIcon(k){
  const a=ART();let c=null;
  if(a&&typeof a.icon==='function'){try{c=copyCanvas(a.icon('mat.'+k));}catch(e){c=null;}}
  if(!c&&root.ICONS){try{c=root.ICONS.canvas(k,20);}catch(e){c=null;}}
  if(c){c.classList.add('hm-mat-ic');c.setAttribute('aria-hidden','true');}
  return c;
}
function matTag(cls,k,text){
  const s=$el('span',cls);const ic=matIcon(k);if(ic)s.appendChild(ic);
  s.appendChild($el('span','hm-mat-t',text));
  return s;
}
function btn(label,icon,fn,cls){
  const b=$el('button','hm-btn'+(cls?' '+cls:''));
  b.type='button';
  const ic=icon&&uiIcon(icon);if(ic)b.appendChild(ic);
  b.appendChild($el('span','hm-btn-t',label));
  b.addEventListener('click',e=>{e.stopPropagation();if(b.disabled)return;sfx('btn');fn&&fn(e);});
  return b;
}

/* ══════════════ 会話UI（家の画面の外でも使える） ══════════════ */
const DLG={active:null,chain:Promise.resolve(),gen:0};
function dlgLayer(){
  let el=document.getElementById('home-dlg');
  if(!el){el=$el('div','hm-dlg');el.id='home-dlg';document.body.appendChild(el);}
  return el;
}
function portrait(who,face){
  try{
    if(who==='kid'&&typeof CHILD_IMG!=='undefined'){const m={smile:'happy',tired:'sad',cry:'sad',sleepy:'sleep'};return CHILD_IMG[face]||CHILD_IMG[m[face]]||CHILD_IMG.normal;}
    if(who==='dan'&&typeof CHAR_IMG!=='undefined'){const m={smile:'happy',good:'happy',sad:'tired',worry:'tired',cry:'tired'};return CHAR_IMG[face]||CHAR_IMG[m[face]]||CHAR_IMG.normal;}
    if(VISITOR_FACES[who]){const m={smile:'happy',good:'happy',sad:'worry',angry:'shout'};const f=VISITOR_FACES[who].indexOf(face)>=0?face:VISITOR_FACES[who].indexOf(m[face])>=0?m[face]:'';return `assets/img/mob_${who}${f?'_'+f:''}.svg`;}
  }catch(e){}
  return null;
}
const WHO_NAME={dan:'だんのうら',kid:'娘',chiyo:'千代さん',hancho:'班長'};
const VISITOR_FACES={chiyo:['happy','worry'],hancho:['happy','shout','worry']};
function serial(fn){
  const p=DLG.chain.then(fn,fn);
  DLG.chain=p.catch(()=>{});
  return p;
}
function showBox(build){
  return new Promise(resolve=>{
    const layer=dlgLayer();
    layer.textContent='';
    layer.classList.add('on');
    const finish=v=>{
      if(DLG.active!==st)return;
      DLG.active=null;layer.classList.remove('on');layer.textContent='';
      try{if(st.prevFocus&&st.prevFocus.focus&&document.contains(st.prevFocus))st.prevFocus.focus();}catch(e){}
      resolve(v);
    };
    const st={finish,prevFocus:document.activeElement};
    DLG.active=st;
    build(layer,st);
  });
}
function sayOne(L){
  return showBox((layer,st)=>{
    const box=$el('div','hm-dlg-box hm-say');
    box.setAttribute('role','dialog');box.setAttribute('aria-live','polite');
    const src=L.who?portrait(L.who,L.face):null;
    if(src){const im=$el('img','hm-dlg-face');im.src=src;im.alt=WHO_NAME[L.who]||'';box.appendChild(im);}
    const body=$el('div','hm-dlg-body');
    if(L.who&&WHO_NAME[L.who])body.appendChild($el('div','hm-dlg-name',WHO_NAME[L.who]));
    body.appendChild($el('div','hm-dlg-text'+(L.who?'':' narr'),String(L.text==null?'':L.text)));
    const next=$el('button','hm-dlg-next','次へ ▼');next.type='button';
    next.setAttribute('aria-label','次へ');
    body.appendChild(next);
    box.appendChild(body);layer.appendChild(box);
    st.advance=()=>st.finish(true);
    st.kind='say';
    layer.onclick=e=>{e.stopPropagation();st.advance();};
    setTimeout(()=>{try{next.focus({preventScroll:true});}catch(e){}},0);
  });
}
HOME.ui=HOME.ui||{};
HOME.ui.say=function(lines){
  if(inSim())return Promise.resolve();
  const arr=(Array.isArray(lines)?lines:[lines]).filter(Boolean).map(l=>typeof l==='string'?{who:'',text:l}:l);
  const gen=DLG.gen;
  return serial(async()=>{for(const L of arr){if(DLG.gen!==gen)break;await sayOne(L);}});
};
HOME.ui.choice=function(prompt,options){
  options=Array.isArray(options)?options:[];
  if(inSim())return Promise.resolve(0);
  return serial(()=>showBox((layer,st)=>{
    const box=$el('div','hm-dlg-box hm-choice');
    box.setAttribute('role','dialog');box.setAttribute('aria-label',String(prompt||'選択'));
    if(prompt)box.appendChild($el('div','hm-dlg-text',String(prompt)));
    const list=$el('div','hm-choice-list');
    const bs=options.map((o,i)=>{
      const b=$el('button','hm-btn hm-choice-btn');b.type='button';
      b.appendChild($el('span','hm-btn-t',`${i+1}. ${o&&o.t!=null?o.t:String(o)}`));
      if(o&&o.s)b.appendChild($el('span','hm-choice-sub',String(o.s)));
      b.addEventListener('click',e=>{e.stopPropagation();sfx('btn');st.finish(i);});
      list.appendChild(b);return b;
    });
    box.appendChild(list);layer.appendChild(box);
    layer.onclick=e=>e.stopPropagation();
    st.kind='choice';st.buttons=bs;st.cancel=()=>st.finish(options.length-1);
    setTimeout(()=>{try{bs[0]&&bs[0].focus({preventScroll:true});}catch(e){}},0);
  }));
};
HOME.ui.prompt=function(label,def,maxLen){
  maxLen=Math.max(1,maxLen|0||8);
  if(inSim())return Promise.resolve(def==null?'':String(def));
  return serial(()=>showBox((layer,st)=>{
    const box=$el('div','hm-dlg-box hm-prompt');
    box.setAttribute('role','dialog');box.setAttribute('aria-label',String(label||'入力'));
    const id='hm-prompt-in';
    const lb=$el('label','hm-dlg-text',String(label||''));lb.htmlFor=id;box.appendChild(lb);
    const inp=document.createElement('input');inp.type='text';inp.id=id;inp.className='hm-input';inp.maxLength=maxLen;
    inp.value=String(def==null?'':def).slice(0,maxLen);inp.setAttribute('autocomplete','off');
    box.appendChild(inp);
    box.appendChild($el('div','hm-choice-sub',`${maxLen}文字まで`));
    const row=$el('div','hm-choice-list hm-row');
    const ok=btn('決定',null,()=>st.finish(Array.from(inp.value.trim()).slice(0,maxLen).join('')));
    const ng=btn('やめる',null,()=>st.finish(null));
    row.appendChild(ok);row.appendChild(ng);box.appendChild(row);
    layer.appendChild(box);
    layer.onclick=e=>e.stopPropagation();
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();ok.click();}});
    st.kind='prompt';st.cancel=()=>st.finish(null);
    setTimeout(()=>{try{inp.focus();inp.select();}catch(e){}},0);
  }));
};
HOME.ui.toast=function(text){
  if(inSim())return;
  try{
    let st=document.getElementById('home-toast');
    if(!st){st=$el('div','hm-toast-stack');st.id='home-toast';st.setAttribute('role','status');st.setAttribute('aria-live','polite');document.body.appendChild(st);}
    while(st.children.length>=3)st.firstChild.remove();
    const t=$el('div','hm-toast');
    // 先頭の絵文字は操作アイコン（main/icons.js）に置き換える（素材の 🪵🧵🔩🐚 も）
    let body=String(text);
    const I=root.ICONS;
    if(I&&typeof I.lead==='function'){try{const l=I.lead(body);if(l.name){const c=I.canvas(l.name,20);c.classList.add('hm-toast-ic');c.setAttribute('aria-hidden','true');t.appendChild(c);body=l.rest;}}catch(e){}}
    t.appendChild(document.createTextNode(body));
    st.appendChild(t);
    setTimeout(()=>t.classList.add('out'),2600);setTimeout(()=>t.remove(),3200);
  }catch(e){}
};
function dlgKey(e){
  const st=DLG.active;if(!st)return false;
  const k=e.key;
  if(st.kind==='say'){
    if(k==='Enter'||k===' '||k==='z'||k==='Z'){e.preventDefault();st.advance();}
    return true;
  }
  if(st.kind==='choice'){
    const i=st.buttons.indexOf(document.activeElement);
    if(k==='ArrowDown'||k==='ArrowUp'){e.preventDefault();const n=(i<0?0:i+(k==='ArrowDown'?1:-1)+st.buttons.length)%st.buttons.length;st.buttons[n].focus();}
    else if(/^[1-9]$/.test(k)&&st.buttons[+k-1]){e.preventDefault();st.buttons[+k-1].click();}
    else if(k==='Escape'){e.preventDefault();st.cancel();}
    return true;
  }
  if(st.kind==='prompt'){if(k==='Escape'){e.preventDefault();st.cancel();}return true;}
  return true;
}

/* ══════════════ 画面 ══════════════ */
const S={
  open:false,el:null,cv:null,ctx:null,area:'room',mode:'live',T:32,k:1,scale:1,raf:0,last:0,t:0,
  chars:null,sel:null,msg:'',ed:null,craftOpen:false,busy:false,offs:[],kidTimer:2,crafting:false,
  visitor:null,visitorReq:null,kidAct:{key:'wander'},catAct:{key:'sit'},catTimer:2,lastAct:'',sleepCheck:0,
  ui:HOME.ui,sfx,
};
S.refresh=()=>refresh();
const hd=()=>HOME.data&&HOME.data();
const placements=area=>{const h=hd();return h&&h[area]?h[area].placements:[];};
const findP=id=>placements(S.area).find(P=>P.instanceId===id)||null;

function build(){
  const el=$el('div','hm');el.id='home-ol';
  el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','家・庭');
  el.tabIndex=-1;
  const head=$el('div','hm-head');
  const title=$el('div','hm-title');title.appendChild($el('span','hm-title-t','🏡 だんのうらの家'));
  // 季節・天候（文字ラベル）
  const sw=$el('span','hm-sw');sw.setAttribute('aria-live','polite');title.appendChild(sw);
  head.appendChild(title);
  const tabs=$el('div','hm-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','場所');
  ['room','garden'].forEach(a=>{
    const b=btn(HOME.AREAS[a].name,a,()=>setArea(a),'hm-tab');
    b.setAttribute('role','tab');b.dataset.area=a;tabs.appendChild(b);
  });
  head.appendChild(tabs);
  const cl=btn('閉じる','close',()=>requestClose(),'hm-close');
  head.appendChild(cl);
  el.appendChild(head);
  const stage=$el('div','hm-stage');
  const cv=document.createElement('canvas');cv.className='hm-cv';
  cv.setAttribute('role','img');
  stage.appendChild(cv);el.appendChild(stage);
  const mode=$el('div','hm-mode');el.appendChild(mode);
  const info=$el('div','hm-info');info.setAttribute('aria-live','polite');el.appendChild(info);
  const acts=$el('div','hm-actions');el.appendChild(acts);
  const drawer=$el('div','hm-drawer');drawer.hidden=true;el.appendChild(drawer);
  const craft=$el('div','hm-craft');craft.hidden=true;craft.setAttribute('role','dialog');craft.setAttribute('aria-label','クラフト');el.appendChild(craft);
  document.body.appendChild(el);
  Object.assign(S,{el,cv,ctx:cv.getContext('2d'),stage,info,acts,drawer,craft,modeEl:mode,tabs,swEl:sw});
}

function on(target,type,fn,opt){target.addEventListener(type,fn,opt);S.offs.push(()=>target.removeEventListener(type,fn,opt));}

// 1マスの最小の大きさ（CSS px）。広げた庭がスマホで小さくなりすぎないよう、足りないときは盤面をスクロールにする
const MIN_CELL=22;
function resize(){
  if(!S.open)return;
  const L=HOME.layout(S.area,S.T);
  const aw=Math.max(80,S.stage.clientWidth-8),ah=Math.max(80,S.stage.clientHeight-8);
  let sc=Math.min(aw/L.cw,ah/L.ch);
  if(sc>1)sc=Math.min(3,Math.floor(sc*4)/4);
  const minSc=MIN_CELL/L.T;
  const scroll=sc<minSc&&ah/L.ch>=minSc*0.98;     // 横がはみ出すだけなら横スクロール
  if(scroll)sc=Math.min(minSc,ah/L.ch);
  S.stage.classList.toggle('hm-scroll',scroll);
  S.scale=sc;
  const dpr=root.devicePixelRatio||1;
  S.k=Math.max(1,Math.min(4,Math.ceil(sc*dpr)));
  S.cv.width=L.cw*S.k;S.cv.height=L.ch*S.k;
  S.cv.style.width=Math.round(L.cw*sc)+'px';S.cv.style.height=Math.round(L.ch*sc)+'px';
  S.ctx=S.cv.getContext('2d');S.ctx.imageSmoothingEnabled=false;
  if(scroll&&S.scrollArea!==S.area+L.cw){
    // はじめは戸口（庭）・出入口（部屋）のあたりが見えるように
    S.scrollArea=S.area+L.cw;
    const A=HOME.AREAS[S.area];const cx=(A.door.x+.5)*L.T*sc;
    S.stage.scrollLeft=Math.max(0,cx-S.stage.clientWidth/2);
  }else if(!scroll)S.scrollArea='';
}
S.onResize=()=>resize();

function cellAt(ev){
  const L=HOME.layout(S.area,S.T),r=S.cv.getBoundingClientRect();
  const px=(ev.clientX-r.left)/r.width*L.cw,py=(ev.clientY-r.top)/r.height*L.ch;
  if(px<0||py<0||px>=L.cw||py>=L.ch)return null;
  const x=Math.floor(px/L.T);
  if(py<L.band)return{x,y:0,band:true};
  return{x,y:Math.min(L.h-1,Math.floor((py-L.band)/L.T))};
}

/* ── 人物（だんのうら・娘） ── */
function solidAt(area,x,y,list){
  const A=HOME.AREAS[area];if(x<0||y<0||x>=A.w||y>=A.h)return true;
  return !!HOME.solidGrid(A,list||placements(area))[y*A.w+x];
}
function pathTo(area,from,to){
  const A=HOME.AREAS[area],g=HOME.solidGrid(A,placements(area));
  const k=(x,y)=>y*A.w+x,sx=Math.round(from.x),sy=Math.round(from.y);
  if(to.x<0||to.y<0||to.x>=A.w||to.y>=A.h||g[k(to.x,to.y)])return null;
  const prev=new Map();prev.set(k(sx,sy),-1);const q=[k(sx,sy)];
  while(q.length){
    const c=q.shift();if(c===k(to.x,to.y))break;
    const x=c%A.w,y=(c/A.w)|0;
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=A.w||ny>=A.h)continue;
      const n=k(nx,ny);if(prev.has(n)||g[n])continue;prev.set(n,c);q.push(n);
    }
  }
  if(!prev.has(k(to.x,to.y)))return null;
  const out=[];let c=k(to.x,to.y);
  while(c!==-1&&c!==k(sx,sy)){out.unshift({x:c%A.w,y:(c/A.w)|0});c=prev.get(c);}
  return out;
}
function nearestFree(area,x,y,avoid){
  const A=HOME.AREAS[area];let best=null,bd=1e9;
  const g=HOME.solidGrid(A,placements(area));
  for(let yy=0;yy<A.h;yy++)for(let xx=0;xx<A.w;xx++){
    if(g[yy*A.w+xx])continue;if(avoid&&avoid.x===xx&&avoid.y===yy)continue;
    const d=Math.abs(xx-x)+Math.abs(yy-y);if(d<bd){bd=d;best={x:xx,y:yy};}
  }
  return best||{x:0,y:0};
}
function placeChars(){
  const a=S.area;
  const d=a==='room'?nearestFree(a,6,6):nearestFree(a,7,1);
  const k=a==='room'?nearestFree(a,4,5,d):nearestFree(a,8,2,d);
  S.chars={
    dan:{who:'dan',x:d.x,y:d.y,dir:'down',pose:'stand',path:[],moving:false},
    kid:{who:'kid',x:k.x,y:k.y,dir:'down',pose:'stand',path:[],moving:false},
  };
  S.kidTimer=2+Math.random()*2;
  S.kidAct={key:'wander'};
  // ねこ（三毛猫）：保存しない。開くたびに近くのどこかにいる
  const cs=HOME.standCell(a,placements(a),a==='room'?2+Math.floor(Math.random()*8):3+Math.floor(Math.random()*10),a==='room'?3+Math.floor(Math.random()*3):4+Math.floor(Math.random()*6),[d,k])||{x:1,y:1};
  S.chars.cat={who:'cat',x:cs.x,y:cs.y,dir:Math.random()<.5?'left':'right',pose:'sit',path:[],moving:false,zb:.1};
  S.catAct={key:'sit'};S.catTimer=2+Math.random()*3;
  syncSleep(true);
  placeVisitor();
}
function fixChars(){
  if(!S.chars)return;
  {const c=S.chars.cat;if(c){c.path=[];c.moving=false;c.onArrive=null;
    if(!c.on&&solidAt(S.area,Math.round(c.x),Math.round(c.y))||c.on&&!placements(S.area).some(P=>P.instanceId===c.on)){const f=HOME.standCell(S.area,placements(S.area),c.x,c.y,occupied('cat'));if(f){c.x=f.x;c.y=f.y;}c.on=null;c.pose='sit';c.zb=.1;}
    S.catAct={key:c.pose==='sleep'?'nap':'sit'};S.catTimer=1;}}
  ['dan','kid'].forEach(w=>{
    const c=S.chars[w];c.path=[];c.moving=false;
    if(w==='kid'&&(S.kidAct.key==='sleep'||S.kidAct.key==='held'))return;   // 眠っている娘は動かさない
    if(w==='dan'&&c.pose==='hold')return;
    if(c.pose!=='stand'&&c.pose!=='walk'){c.pose='stand';c.zb=.1;}
    if(w==='kid')S.kidAct={key:'wander'};
    const x=Math.round(c.x),y=Math.round(c.y);
    if(solidAt(S.area,x,y)){const f=nearestFree(S.area,x,y,w==='kid'?{x:Math.round(S.chars.dan.x),y:Math.round(S.chars.dan.y)}:null);c.x=f.x;c.y=f.y;}
    else{c.x=x;c.y=y;}
  });
  syncSleep(true);
  placeVisitor();
}
function walkTo(c,cell){
  return new Promise(res=>{
    const p=pathTo(S.area,{x:c.x,y:c.y},cell);
    if(!p){res(false);return;}
    if(c.pose!=='stand'&&c.pose!=='walk'){c.pose='stand';c.zb=.1;}
    if(c.who==='kid'&&S.kidAct.key!=='sleep'&&S.kidAct.key!=='held')S.kidAct={key:'wander'};
    c.path=p;c.onArrive=()=>res(true);
    if(!p.length){c.onArrive=null;res(true);}
  });
}
function face(c,tx,ty){
  const dx=tx-c.x,dy=ty-c.y;
  c.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
}
function updateChars(dt){
  if(!S.chars)return;
  ['dan','kid','cat'].forEach(w=>{
    const c=S.chars[w];if(!c)return;
    if(c.path&&c.path.length){
      const n=c.path[0],sp=(w==='kid'?3:w==='cat'?1.7:3.6)*dt;
      const dx=n.x-c.x,dy=n.y-c.y,d=Math.hypot(dx,dy);
      if(d>0.001)c.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
      if(d<=sp){c.x=n.x;c.y=n.y;c.path.shift();}else{c.x+=dx/d*sp;c.y+=dy/d*sp;}
      c.moving=true;
      if(!c.path.length){c.moving=false;const f=c.onArrive;c.onArrive=null;f&&f();}
    }else c.moving=false;
  });
  // 小さな動き（本をめくる・ペンを動かす・寝息）
  const k=S.chars.kid,d=S.chars.dan;
  k.frame=(k.pose==='sleep'||k.pose==='read')?Math.floor(S.t/1.4)%2:undefined;
  d.frame=d.pose==='work'?Math.floor(S.t*2.2)%2:d.pose==='hold'?Math.floor(S.t/1.4)%2:undefined;
  if(!S.busy&&!DLG.active&&S.mode==='live'){
    S.sleepCheck-=dt;
    if(S.sleepCheck<=0){S.sleepCheck=1;syncSleep(false);}
    updateKid(dt);
    updateCat(dt);
  }
  if(S.chars.cat)S.chars.cat.frame=S.chars.cat.pose==='sleep'?Math.floor(S.t/1.6)%2:undefined;
}

/* ── ねこ：ゆっくり歩き、クッション・ラグ・布団・ベンチ・庭の日なたで昼寝する。solid なマスは歩かない ── */
function catHopOff(c){
  if(!c.on)return;
  const f=HOME.standCell(S.area,placements(S.area),c.x,c.y,occupied('cat'));
  if(f){c.x=f.x;c.y=f.y;}
  c.on=null;c.zb=.1;
}
function catGoNap(c,spot){
  // 家具の上なら、そばの立てるマスまで歩いてから飛び乗る
  const to=spot.on?HOME.standCell(S.area,placements(S.area),spot.x,spot.y,occupied('cat')):{x:spot.x,y:spot.y};
  if(!to)return false;
  catHopOff(c);
  const p=pathTo(S.area,{x:c.x,y:c.y},to);if(!p)return false;
  c.pose='stand';c.path=p;S.catAct={key:'going'};
  const arrive=()=>{
    if(spot.on){
      const P=placements(S.area).find(q=>q.instanceId===spot.on);if(!P){S.catAct={key:'sit'};c.pose='sit';S.catTimer=2;return;}
      const f=HOME.footprint(P.itemId,P.rotation);
      face(c,spot.x,spot.y);c.x=spot.x;c.y=spot.y;c.on=spot.on;c.zb=(P.y+f.h-1-spot.y)+.12;
    }
    c.pose='sleep';S.catAct={key:'nap',kind:spot.kind,night:S.catAct.night};S.catTimer=14+Math.random()*12;
  };
  if(!p.length)arrive();else c.onArrive=arrive;
  return true;
}
function updateCat(dt){
  const c=S.chars.cat;if(!c||c.moving)return;
  if(S.catAct.key==='going'&&!(c.path&&c.path.length)){c.onArrive=null;S.catAct={key:'sit'};c.pose='sit';S.catTimer=2;}
  // 夜：娘が寝ていたら、布団の足もとで丸くなる
  if(S.kidAct.key==='sleep'||S.kidAct.key==='held'){
    if(S.catAct.night)return;
    let ok=false;
    if(S.kidAct.key==='sleep'){
      const fut=placements(S.area).find(P=>P.instanceId===S.kidAct.id);
      const spot=fut&&HOME.catSpots(S.area,[fut]).find(s=>s.kind==='futon');
      if(spot)ok=catGoNap(c,spot);
    }else{
      const d=S.chars.dan,f=HOME.standCell(S.area,placements(S.area),d.x+1,d.y,occupied('cat'));
      if(f)ok=catGoNap(c,{x:f.x,y:f.y,on:null,kind:'dan'});
    }
    S.catAct.night=true;
    if(!ok){c.pose='sleep';S.catAct={key:'nap',night:true};}
    return;
  }
  if(S.catAct.night){S.catAct={key:'sit'};S.catTimer=0;}
  S.catTimer-=dt;if(S.catTimer>0)return;
  const r=Math.random();
  if(r<.45){
    const occ=occupied('cat');
    const spots=HOME.catSpots(S.area,placements(S.area),{night:isNight()}).filter(s=>!isOcc(occ,s.x,s.y));
    if(spots.length&&catGoNap(c,spots[Math.floor(Math.random()*spots.length)]))return;
  }
  catHopOff(c);
  if(r<.7){c.pose='sit';S.catAct={key:'sit'};S.catTimer=5+Math.random()*4;return;}
  // ゆっくり2〜3マス歩く
  c.pose='stand';S.catAct={key:'walk'};S.catTimer=3+Math.random()*3;
  const A=HOME.AREAS[S.area],occ=occupied('cat');
  for(let tries=0;tries<12;tries++){
    const tx=Math.round(c.x)+Math.floor(Math.random()*5)-2,ty=Math.round(c.y)+Math.floor(Math.random()*5)-2;
    if(tx<0||ty<0||tx>=A.w||ty>=A.h||isOcc(occ,tx,ty)||HOME._isExit(S.area,tx,ty))continue;
    const p=pathTo(S.area,{x:c.x,y:c.y},{x:tx,y:ty});
    if(p&&p.length&&p.length<=4){c.path=p;c.onArrive=()=>{c.pose='sit';};break;}
  }
}

/* ── 娘の過ごし方（置いてある家具に応じて。使う位置が空いているときだけ） ── */
const sleepHour=()=>{const g=G();return !!(g&&HOME.isKidSleepHour&&HOME.isKidSleepHour(g.hour));};
function occupied(except){
  const L=[];
  if(S.chars){['dan','kid','cat'].forEach(w=>{if(w!==except&&S.chars[w]&&!S.chars[w].hidden)L.push({x:Math.round(S.chars[w].x),y:Math.round(S.chars[w].y)});});
    const d=S.chars.dan;if(d.path&&d.path.length&&except!=='dan'){const e=d.path[d.path.length-1];L.push({x:e.x,y:e.y});}}
  if(S.visitor)L.push({x:S.visitor.x,y:S.visitor.y});
  return L;
}
const isOcc=(L,x,y)=>L.some(q=>q.x===x&&q.y===y);
// 23時〜5時台は布団で寝る。布団が収納中なら、だんのうらが抱いて座る
function syncSleep(force){
  if(!S.chars)return;
  const k=S.chars.kid,d=S.chars.dan,asleep=S.kidAct.key==='sleep'||S.kidAct.key==='held'||S.kidAct.key==='away';
  if(sleepHour()){
    if(asleep&&!force)return;
    k.path=[];k.moving=false;k.hidden=false;
    if(S.area!=='room'){k.hidden=true;S.kidAct={key:'away'};return;}     // 庭の画面：娘は部屋で眠っている
    const fut=placements('room').find(P=>P.itemId==='furniture.futon');
    if(fut){
      const f=HOME.footprint(fut.itemId,fut.rotation);
      Object.assign(k,{x:fut.x,y:fut.y,pose:'sleep',dir:fut.rotation===90?'right':'down',zb:f.h-1+.05,sleepCells:HOME.cellsOf(fut)});
      S.kidAct={key:'sleep',id:fut.instanceId};
      if(d.pose==='hold'){d.pose='stand';d.zb=.1;}
    }else{
      k.hidden=true;k.sleepCells=null;
      d.path=[];d.moving=false;
      const cush=placements('room').find(P=>P.itemId==='furniture.cushion');
      const at=cush?{x:cush.x,y:cush.y}:{x:Math.round(d.x),y:Math.round(d.y)};
      if(!solidAt('room',at.x,at.y)){d.x=at.x;d.y=at.y;}
      Object.assign(d,{pose:'hold',dir:'down',zb:.1});
      S.kidAct={key:'held'};
    }
    return;
  }
  if(!asleep)return;
  // 朝：起きる
  k.hidden=false;k.sleepCells=null;k.zb=.1;k.pose='stand';k.dir='down';
  if(d.pose==='hold'){d.pose='stand';}
  const f=HOME.standCell?HOME.standCell(S.area,placements(S.area),k.x,k.y,occupied('kid')):null;
  if(f){k.x=f.x;k.y=f.y;}
  S.kidAct={key:'wander'};S.kidTimer=2;
}
function faceDir(c,P){if(!P.itemId){face(c,P.x,P.y);return;}const fp=HOME.footprint(P.itemId,P.rotation);face(c,P.x+(fp.w-1)/2,P.y+(fp.h-1)/2);}
const OPP={down:'up',up:'down',left:'right',right:'left'};
// 今いる場所で選べる過ごし方の候補
function kidOptions(){
  const area=S.area,L=placements(area),occ=occupied('kid'),out=[];
  const hd0=hd();
  L.forEach(P=>{
    const c=CAT(P.itemId);if(!c||!c.kidUse)return;
    let cell=null,pose='stand',dir=null;
    if(c.kidUse==='cushion'){cell={x:P.x,y:P.y};pose='sit';dir='down';}
    else if(c.kidUse==='mobile'){
      cell=[{x:P.x,y:1},{x:P.x,y:0}].find(q=>!solidAt(area,q.x,q.y)&&!isOcc(occ,q.x,q.y)&&!HOME._isExit(area,q.x,q.y))||null;dir='up';
    }else{
      const u=HOME.canUse(area,L,P);if(!u.ok)return;
      cell=u.cell;
      if(c.kidUse==='read'){pose='read';dir=HOME.ROT_DIR[P.rotation]||'down';}
      else if(c.kidUse==='draw'){pose='sit';dir=OPP[HOME.ROT_DIR[P.rotation]]||'up';}
      else if(c.kidUse==='play'||c.kidUse==='radio'){pose='sit';}
    }
    if(!cell||isOcc(occ,cell.x,cell.y)||HOME._isExit(area,cell.x,cell.y))return;
    if(c.kidUse!=='cushion'&&solidAt(area,cell.x,cell.y))return;
    // 植物：植えてある鉢・プランターを優先
    const w=c.kidUse==='plants'?((hd0&&hd0.plants&&hd0.plants[P.instanceId])?2:.6):1.6;
    out.push({key:c.kidUse,P,cell,pose,dir,w});
  });
  // ねこをなでに行く（ねこが座っているか寝ているとき）
  const cat=S.chars&&S.chars.cat;
  if(cat&&!cat.moving&&(cat.pose==='sit'||cat.pose==='sleep')){
    const cx=Math.round(cat.x),cy=Math.round(cat.y);
    const cell=[[0,1],[-1,0],[1,0],[0,-1]].map(([dx,dy])=>({x:cx+dx,y:cy+dy})).find(q=>!solidAt(area,q.x,q.y)&&!isOcc(occ,q.x,q.y)&&!HOME._isExit(area,q.x,q.y));
    if(cell)out.push({key:'cat',P:{instanceId:'cat',itemId:'',x:cx,y:cy,rotation:0},cell,pose:'sit',dir:null,w:1.1,cat:true});
  }
  return out;
}
function updateKid(dt){
  const k=S.chars.kid;
  const key=S.kidAct.key;
  if(key==='sleep'||key==='held'||key==='away'||k.moving)return;
  // 向かう途中で止められた（話しかけられた等）→ 少し待って選び直す
  if(S.kidAct.going&&!(k.path&&k.path.length)){k.onArrive=null;S.kidAct={key:'wander'};S.kidTimer=Math.min(S.kidTimer,2.5);}
  S.kidTimer-=dt;
  if(S.kidTimer>0)return;
  if(k.pose!=='stand'){k.pose='stand';k.zb=.1;}
  const opts=kidOptions().filter(o=>!(o.key===S.lastAct&&Math.random()<.7));
  const total=opts.reduce((s,o)=>s+o.w,0)+1.4;      // 1.4 = ただ歩き回る
  let r=Math.random()*total;
  const pick=opts.find(o=>(r-=o.w)<0);
  if(pick){
    const p=pathTo(S.area,{x:k.x,y:k.y},pick.cell);
    if(p){
      k.path=p;S.kidAct={key:'wander',going:pick.key};
      const arrive=()=>{
        // 着いたとき、まだ使えるか確かめる（模様替え・人の移動）
        const still=kidOptions().find(o=>o.key===pick.key&&o.P.instanceId===pick.P.instanceId&&o.cell.x===pick.cell.x&&o.cell.y===pick.cell.y);
        if(!still||Math.round(k.x)!==pick.cell.x||Math.round(k.y)!==pick.cell.y){S.kidAct={key:'wander'};S.kidTimer=1.5;return;}
        k.pose=pick.pose;k.zb=.1;
        if(pick.dir)k.dir=pick.dir;else if(pick.cat)face(k,pick.P.x,pick.P.y);else faceDir(k,pick.P);
        S.kidAct={key:pick.key,id:pick.P.instanceId};S.lastAct=pick.key;
        S.kidTimer=9+Math.random()*7;
      };
      if(!p.length)arrive();else k.onArrive=arrive;
      S.kidTimer=30;   // 着くまで次を選ばない（onArrive で決め直す）
      return;
    }
  }
  // 歩き回る
  S.kidAct={key:'wander'};S.lastAct='wander';
  S.kidTimer=3+Math.random()*4;
  const A=HOME.AREAS[S.area],occ=occupied('kid');
  for(let tries=0;tries<12;tries++){
    const tx=Math.round(k.x)+Math.floor(Math.random()*7)-3,ty=Math.round(k.y)+Math.floor(Math.random()*5)-2;
    if(tx<0||ty<0||tx>=A.w||ty>=A.h)continue;
    if(isOcc(occ,tx,ty))continue;
    if(HOME._isExit(S.area,tx,ty))continue;
    const p=pathTo(S.area,{x:k.x,y:k.y},{x:tx,y:ty});
    if(p&&p.length&&p.length<=6){k.path=p;break;}
  }
}
HOME.kidActivity=function(){
  if(!S.open||!S.chars)return null;
  return S.kidAct.key||'wander';
};

/* ── 訪問者（一時的。保存しない。画面を閉じると消える） ── */
const VISITORS={chiyo:1,hancho:1};
function placeVisitor(){
  const v=S.visitorReq;
  if(!S.open||!v||!S.chars){S.visitor=null;return null;}
  if(v.area!==S.area){S.visitor=null;return null;}
  const L=placements(S.area);
  let pos=null,pose=v.pose==='sit'||v.pose==='walk'?v.pose:'stand',dir=v.dir,zb=.1;
  if(v.sitOn){
    // 座る家具（ベンチ・椅子・クッション）の上に座る
    const P=L.find(q=>q.instanceId===v.sitOn);const c=P&&CAT(P.itemId);
    if(c&&c.verb==='座る'){
      const occ=occupied(null);
      const seat=HOME.cellsOf(P).filter(q=>!isOcc(occ,q.x,q.y)).sort((a,b)=>(Math.abs(a.x-(+v.x||a.x))+Math.abs(a.y-(+v.y||a.y)))-(Math.abs(b.x-(+v.x||b.x))+Math.abs(b.y-(+v.y||b.y))))[0];
      if(seat){pos=seat;pose='sit';dir=HOME.ROT_DIR[P.rotation]||'down';zb=(P.rotation===180&&c.solid)?-.3:.1;}
    }
  }
  if(!pos){pos=HOME.standCell(S.area,L,v.x,v.y,occupied(null));if(pose==='sit')pose='stand';}
  if(!pos){S.visitor=null;return null;}
  S.visitor={who:v.who,x:pos.x,y:pos.y,dir:['down','up','left','right'].indexOf(dir)>=0?dir:'down',pose,zb,visitor:true,path:[],moving:false};
  return {x:pos.x,y:pos.y};
}
HOME.setVisitor=function(o){
  try{
    o=o||{};
    if(!VISITORS[o.who])return false;
    const area=HOME.AREAS[o.area]?o.area:(S.open?S.area:'garden');
    S.visitorReq={who:o.who,area,x:o.x,y:o.y,dir:o.dir,pose:o.pose,sitOn:o.sitOn||null};
    if(!S.open)return true;                 // 画面を開いたときに出る（閉じると消える）
    const r=placeVisitor();
    if(S.open)refresh();
    return r||true;
  }catch(e){return false;}
};
HOME.clearVisitor=function(){
  S.visitorReq=null;S.visitor=null;
  if(S.sel&&S.sel.kind==='char'&&S.sel.who==='visitor')S.sel=null;
  if(S.open)refresh();
  return true;
};
HOME.visitor=function(){const v=S.visitor;return v?{who:v.who,area:S.area,x:v.x,y:v.y,dir:v.dir,pose:v.pose}:null;};
// 娘を座る家具に座らせる（生活イベントの「並んで座る」場面用）。座れたら true
HOME.kidSitOn=function(instanceId){
  if(!S.open||!S.chars)return false;
  const k=S.chars.kid;if(S.kidAct.key==='sleep'||S.kidAct.key==='held')return false;
  const P=placements(S.area).find(q=>q.instanceId===instanceId);const c=P&&CAT(P.itemId);
  if(!c||c.verb!=='座る')return false;
  const occ=occupied('kid');const seat=HOME.cellsOf(P).find(q=>!isOcc(occ,q.x,q.y));if(!seat)return false;
  Object.assign(k,{x:seat.x,y:seat.y,path:[],moving:false,pose:'sit',dir:HOME.ROT_DIR[P.rotation]||'down',zb:(P.rotation===180&&c.solid)?-.3:.1});
  S.kidAct={key:'sit',id:instanceId};S.kidTimer=20;
  return true;
};

/* ── 描画ループ ── */
function draw(){
  const ctx=S.ctx;if(!ctx)return;
  ctx.setTransform(S.k,0,0,S.k,0,0);
  ctx.imageSmoothingEnabled=false;
  const L=HOME.layout(S.area,S.T);
  ctx.clearRect(0,0,L.cw,L.ch);
  let o;
  if(S.mode==='edit'&&S.ed)o=ED().renderOpts(S);
  else{
    o={placements:placements(S.area),selId:S.sel&&S.sel.kind==='item'?S.sel.id:null};
    o.chars=S.chars?[S.chars.dan,S.chars.kid,S.chars.cat].filter(c=>c&&!c.hidden):[];
    if(S.visitor)o.chars.push(S.visitor);
    o.particles=true;
    if(S.sel&&S.sel.kind==='item'){
      const P=findP(S.sel.id);
      if(P){const c=HOME.useCell(S.area,placements(S.area),P);if(c&&CAT(P.itemId).use!=='self')o.marks=[c];}
    }
    if(S.sel&&S.sel.kind==='char'&&S.chars){const c=S.sel.who==='visitor'?S.visitor:S.chars[S.sel.who];if(c&&!c.hidden)o.marks=c.sleepCells&&c.pose==='sleep'?[]:[{x:Math.round(c.x),y:Math.round(c.y)}];}
  }
  o.T=S.T;o.t=S.t;o.night=isNight();
  if(S.mode==='edit')o.particles=true;
  try{if(typeof HOME.season==='function'){o.season=HOME.season();o.weather=HOME.weather();}}catch(e){}
  try{HOME.renderArea(ctx,S.area,o);}catch(e){if(!S._errLogged){S._errLogged=true;try{console.error('[home] render',e);}catch(_){}}}
}
function frame(ts){
  if(!S.open)return;
  S.raf=requestAnimationFrame(frame);
  const dt=S.last?Math.min(.05,(ts-S.last)/1000):0;S.last=ts;S.t+=dt;
  if(S.mode==='live')updateChars(dt);
  draw();
}

/* ── 暮らしモード：選択・調べる・使う・話す ── */
function hitLive(cell){
  if(S.chars){
    const ct=S.chars.cat;
    if(ct&&!cell.band&&cell.x===Math.round(ct.x)&&cell.y===Math.round(ct.y))return{kind:'char',who:'cat'};
    const v=S.visitor;
    if(v&&cell.x===v.x&&(cell.y===v.y||(!cell.band&&cell.y===v.y-1&&!itemAt(cell))))return{kind:'char',who:'visitor'};
    const k=S.chars.kid;
    if(k.pose==='sleep'&&k.sleepCells&&!cell.band&&k.sleepCells.slice(0,4).some(q=>q.x===cell.x&&q.y===cell.y))return{kind:'char',who:'kid'};
    for(const w of['kid','dan']){
      const c=S.chars[w],cx=Math.round(c.x),cy=Math.round(c.y);
      if(c.hidden||c.pose==='sleep')continue;
      if(cell.x===cx&&(cell.y===cy||(!cell.band&&cell.y===cy-1&&!itemAt(cell))))return{kind:'char',who:(w==='dan'&&c.pose==='hold')?'kid':w};
    }
  }
  const P=itemAt(cell);
  return P?{kind:'item',id:P.instanceId}:null;
}
function itemAt(cell){
  const L=placements(S.area);
  const at=P=>HOME.cellsOf(P).some(q=>q.x===cell.x&&q.y===cell.y);
  if(cell.band)return L.find(P=>CAT(P.itemId)&&CAT(P.itemId).layer==='wall'&&P.x===cell.x)||null;
  return L.find(P=>CAT(P.itemId)&&CAT(P.itemId).layer==='furniture'&&at(P))
    ||(cell.y===0?L.find(P=>CAT(P.itemId)&&CAT(P.itemId).layer==='wall'&&P.x===cell.x):null)
    ||L.find(P=>CAT(P.itemId)&&at(P))||null;
}
function plantText(P){
  const h=hd();const p=h&&h.plants&&h.plants[P.instanceId];
  const c=CAT(P.itemId);
  if(!p)return c&&c.plantable?(HOME.ownedSeeds&&HOME.ownedSeeds().length?'まだ何も植えていない。［種を植える］で植えられる。':'まだ何も植えていない。'):'';
  const st=HOME.STAGE_NAMES[Math.max(0,Math.min(4,p.stage|0))];
  const sp=(HOME.PLANT_SPECIES[p.species]||HOME.PLANT_SPECIES.seed).name;
  return `植えた${sp}「${p.name}」：${st}（水やり：${HOME.wateredToday&&HOME.wateredToday(P.instanceId)?'今日はあげた':'今日はまだ'}）`;
}
const VISITOR_INFO={chiyo:'お隣の千代さん。下関の言葉で話す、世話好きなおばあちゃん。［話す］で話しかけられます。',hancho:'工場の班長。口は悪いが面倒見がいい。［話す］で話しかけられます。'};
const KID_INFO={cat:'娘（4さい）。ねこのそばにしゃがんで、そっと撫でている。',sit:'娘（4さい）。ちょこんと座っている。',sleep:'娘（4さい）。布団で、すうすう眠っている。［寝顔を見る］',held:'娘（4さい）。パパの腕の中で眠っている。［寝顔を見る］',
  cushion:'娘（4さい）。クッションにちょこんと座っている。',read:'娘（4さい）。本棚の前で、絵本をひらいている。',draw:'娘（4さい）。小さな机でお絵かきをしている。',
  play:'娘（4さい）。おもちゃ箱で遊んでいる。',plants:'娘（4さい）。植物をじっと眺めている。',radio:'娘（4さい）。ラジオの前に座って、耳をすませている。',mobile:'娘（4さい）。モビールを見上げている。'};
function liveInfo(){
  if(S.msg)return S.msg;
  const s=S.sel;
  if(!s)return `暮らしモード（${HOME.AREAS[S.area].name}）：人や家具をタップすると調べられます。`;
  if(s.kind==='char'){
    if(s.who==='visitor')return S.visitor?VISITOR_INFO[S.visitor.who]:'';
    if(s.who==='cat')return S.catAct.key==='nap'?'うちのねこ（三毛猫）。丸くなって眠っている。［やさしく撫でる］':'うちのねこ（三毛猫）。夜になると、ときどきいたずらをする。［やさしく撫でる］';
    if(s.who==='kid')return KID_INFO[S.kidAct.key]?KID_INFO[S.kidAct.key]+(kidSleeping()?'':'［話す］で話しかけられます。'):'娘（4さい）。くまのぬいぐるみと、パパの声が大好き。［話す］で話しかけられます。';
    return 'だんのうら。設備保全の仕事と深夜配信をこなす、シングルファーザー。';
  }
  const P=findP(s.id);if(!P)return '';
  const c=CAT(P.itemId);
  const pt=plantText(P);
  return `${ED().displayName(P.itemId,P.variant)}：${c.desc}${pt?' '+pt:''}`;
}
function useLabel(P){
  const c=CAT(P.itemId);
  if(c.light){const h=hd();return h.flags.lit&&h.flags.lit[P.instanceId]?'灯りを消す':'灯りを点ける';}
  if(c.plantable){const h=hd();if(h.plants&&h.plants[P.instanceId])return '水やり・ながめる';return HOME.ownedSeeds&&HOME.ownedSeeds().length?'種を植える':'眺める';}
  return c.verb||'使う';
}
const kidSleeping=()=>S.kidAct.key==='sleep'||S.kidAct.key==='held';
function liveActions(){
  const a=[];const s=S.sel;
  if(s&&s.kind==='char'&&s.who==='kid')a.push(kidSleeping()?{label:'寝顔を見る',icon:'talk',fn:watchKid,primary:true}:{label:'話す',icon:'talk',fn:talkKid,primary:true});
  if(s&&s.kind==='char'&&s.who==='cat'&&S.chars&&S.chars.cat)a.push({label:'やさしく撫でる',icon:'talk',fn:petCat,primary:true});
  if(s&&s.kind==='char'&&s.who==='visitor'&&S.visitor)a.push({label:'話す',icon:'talk',fn:talkVisitor,primary:true});
  if(s&&s.kind==='item'){
    const P=findP(s.id);
    if(P){
      const c=CAT(P.itemId);
      if(c.use&&c.use!=='none')a.push({label:useLabel(P),icon:(c.plantable||P.itemId==='garden.watering_can')?'water':'place',fn:()=>useItem(P),primary:true});
      a.push({label:'調べる',icon:'edit',fn:()=>inspect(P)});
    }
  }
  a.push({label:'模様替え',icon:'edit',fn:()=>enterEdit(),row:2});
  a.push({label:'クラフト',icon:'craft',fn:()=>openCraft(),row:2});
  if(HOME.memories&&typeof HOME.memories.openBook==='function')a.push({label:'思い出帳',icon:'memories',fn:()=>{try{HOME.memories.openBook();}catch(e){}},row:2});
  if(HOME.photo&&typeof HOME.photo.open==='function')a.push({label:'写真を撮る',icon:'photo',fn:()=>{if(!S.busy)HOME.photo.open();},row:2,id:'photo'});
  return a;
}
function tapLive(cell){
  if(S.busy)return;
  S.msg='';
  standUp();
  const h=hitLive(cell);
  if(!h){
    S.sel=null;
    // 空いているマスなら、そこまで歩く
    if(S.chars.dan.pose==='hold')S.msg='腕の中で娘が眠っている。起こさないように、いまは動かないでおこう。';
    else if(!cell.band&&!solidAt(S.area,cell.x,cell.y))walkTo(S.chars.dan,{x:cell.x,y:cell.y});
  }else S.sel=h;
  refresh();
}
function standUp(){
  const d=S.chars&&S.chars.dan;
  if(d&&(d.pose==='sit'||d.pose==='work')){d.pose='stand';d.zb=.1;if(d.standAt){d.x=d.standAt.x;d.y=d.standAt.y;d.standAt=null;}}
}
async function runBusy(fn){
  if(S.busy)return;
  S.busy=true;refresh();
  try{await fn();}catch(e){try{console.error('[home]',e);}catch(_){}}
  finally{S.busy=false;if(S.open)refresh();}
}
const DAN=(text,face)=>({who:'dan',face:face||'normal',text});
const KID=(text,face)=>({who:'kid',face:face||'normal',text});
const NAR=text=>({who:'',text});
const TALKS=[
  [KID('パパ、きょうもおしごと？'),DAN('そうよ。でも帰ってきたら、いっぱい遊ぶわよ。約束。'),KID('やくそく！','happy')],
  [KID('みて！ くまちゃんとおどってるの','happy'),DAN('あら上手。……パパも混ぜてちょうだい。','happy')],
  [KID('パパのこえ、すき'),DAN('……ありがと。それだけで、明日もがんばれるわ。','happy')],
  [KID('パパ、ねむい？'),DAN('ちょっとだけね。あんたの顔見たら、目ぇ覚めたちゃ。','happy')],
  [KID('きょうね、ほいくえんで、おえかきしたの'),DAN('あら、何を描いたの？'),KID('ないしょー！','happy')],
];
async function talkKid(){
  if(kidSleeping())return watchKid();
  await runBusy(async()=>{
    const kid=S.chars.kid,dan=S.chars.dan;
    kid.path=[];kid.moving=false;kid.onArrive=null;kid.x=Math.round(kid.x);kid.y=Math.round(kid.y);
    if(S.kidAct.going)S.kidAct={key:'wander'};
    // 娘の隣まで歩く
    const A=HOME.AREAS[S.area];
    const cand=[[-1,0],[1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:kid.x+dx,y:kid.y+dy})).filter(q=>q.x>=0&&q.y>=0&&q.x<A.w&&q.y<A.h&&!solidAt(S.area,q.x,q.y));
    for(const q of cand){if(await walkTo(dan,q))break;}
    face(dan,kid.x,kid.y);face(kid,dan.x,dan.y);
    HOME.emit('interact',{type:'talkKid',area:S.area});
    let handled=false;
    if(typeof HOME.hooks.talkKid==='function'){try{handled=!!(await HOME.hooks.talkKid());}catch(e){handled=false;}}
    if(!handled){
      const h=hd();const i=((h&&h.flags.talkIdx)|0)%TALKS.length;if(h)h.flags.talkIdx=i+1;
      await HOME.ui.say(TALKS[i]);
      const g=HOME.addHomeMental?HOME.addHomeMental(HOME.BAL.talkMental):0;
      if(g>0){HOME.ui.toast(`🙂 心が少し軽くなった（精神+${g}）`);try{typeof updateStats==='function'&&updateStats();}catch(e){}}
    }
  });
}
// 寝顔を見る：起こさない。フック HOME.hooks.talkKid は呼ばない（起きているときだけ）
const SLEEP_LINES=[
  [NAR('小さな寝息が聞こえる。'),DAN('……おやすみ。今日も、ありがとうね。')],
  [NAR('掛け布団から、ちいさな手がはみ出している。そっと中に戻した。'),DAN('……起こさんように、そっとね。')],
  [NAR('寝言で「パパ……」と聞こえた気がした。'),DAN('……ここにおるよ。')],
  [NAR('まつげが、ときどき小さくふるえる。夢を見ているのかもしれない。'),DAN('いい夢、見ちょってね。')],
];
const HELD_LINES=[
  [NAR('腕の中で、すうすうと寝息を立てている。'),DAN('……また重たくなったわね。')],
  [NAR('胸のあたりが、あったかい。'),DAN('布団、出しておかんとね。……今夜はこのままでいいか。')],
];
async function watchKid(){
  await runBusy(async()=>{
    const kid=S.chars.kid,dan=S.chars.dan;
    if(S.kidAct.key==='sleep'){
      const fut=placements(S.area).find(P=>P.instanceId===S.kidAct.id);
      const u=fut&&HOME.canUse(S.area,placements(S.area),fut);
      if(u&&u.ok&&await walkTo(dan,u.cell))faceDir(dan,fut);
    }
    HOME.emit('interact',{type:'watchKid',area:S.area,held:S.kidAct.key==='held'});
    let handled=false;
    if(typeof HOME.hooks.watchKid==='function'){try{handled=!!(await HOME.hooks.watchKid(S.kidAct.key));}catch(e){handled=false;}}
    if(handled)return;
    const h=hd();const L=S.kidAct.key==='held'?HELD_LINES:SLEEP_LINES;
    const i=((h&&h.flags.sleepIdx)|0)%L.length;if(h)h.flags.sleepIdx=i+1;
    await HOME.ui.say(L[i]);
    void kid;
  });
}
// 訪問者と話す：フック HOME.hooks.talkVisitor(who) が無い・扱わないときは、ていねいな一言
const VISITOR_LINES={
  chiyo:[{who:'chiyo',face:'happy',text:'あら、だんのうらさん。今日もようがんばっちょるねえ。'},DAN('千代さんこそ。いつも、ありがとうございます。','smile')],
  hancho:[{who:'hancho',face:'happy',text:'おう、邪魔しとるで。ええ家やないか。'},DAN('散らかってて、すんません。……ゆっくりしてってください。','smile')],
};
async function talkVisitor(){
  const v=S.visitor;if(!v)return;
  await runBusy(async()=>{
    const dan=S.chars.dan,A=HOME.AREAS[S.area];
    const cand=[[-1,0],[1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:v.x+dx,y:v.y+dy})).filter(q=>q.x>=0&&q.y>=0&&q.x<A.w&&q.y<A.h&&!solidAt(S.area,q.x,q.y));
    if(dan.pose!=='hold')for(const q of cand){if(await walkTo(dan,q))break;}
    if(!S.visitor)return;
    face(dan,v.x,v.y);if(v.pose!=='sit')face(v,dan.x,dan.y);
    HOME.emit('interact',{type:'talkVisitor',who:v.who,area:S.area});
    let handled=false;
    if(typeof HOME.hooks.talkVisitor==='function'){try{handled=!!(await HOME.hooks.talkVisitor(v.who));}catch(e){handled=false;}}
    if(!handled)await HOME.ui.say(VISITOR_LINES[v.who]||[NAR('お客さんに、会釈をした。')]);
  });
}
// ねこ：撫でる。フック HOME.hooks.talkCat() が扱わなければ短い一言
const CAT_LINES=[
  [NAR('やさしく撫でると、ゴロゴロと喉を鳴らした。')],
  [NAR('背中を撫でると、しっぽがゆっくり揺れた。'),DAN('……夜のいたずらは、ほどほどにしてね。')],
  [NAR('撫でようとしたら、手のひらに頭をこすりつけてきた。')],
  [NAR('茶色と黒のぶちが、灯りの下でつやつやしている。'),DAN('あんたも、うちの家族よね。','smile')],
];
async function petCat(){
  const c=S.chars&&S.chars.cat;if(!c)return;
  await runBusy(async()=>{
    const dan=S.chars.dan,A=HOME.AREAS[S.area],cx=Math.round(c.x),cy=Math.round(c.y);
    if(dan.pose!=='hold'){
      const cand=[[-1,0],[1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:cx+dx,y:cy+dy})).filter(q=>q.x>=0&&q.y>=0&&q.x<A.w&&q.y<A.h&&!solidAt(S.area,q.x,q.y));
      for(const q of cand){if(await walkTo(dan,q))break;}
      face(dan,cx,cy);
    }
    HOME.emit('interact',{type:'talkCat',area:S.area});
    let handled=false;
    if(typeof HOME.hooks.talkCat==='function'){try{handled=!!(await HOME.hooks.talkCat());}catch(e){handled=false;}}
    if(handled)return;
    const h=hd();const i=((h&&h.flags.catIdx)|0)%CAT_LINES.length;if(h)h.flags.catIdx=i+1;
    await HOME.ui.say(CAT_LINES[i]);
  });
}
HOME.catActivity=function(){return S.open&&S.chars&&S.chars.cat?S.catAct.key:null;};
const USE_LINES={
  'furniture.desk_small':[DAN('さ、ちょっとだけ勉強しとこうかしら。……あと5分だけよ、アタシ。')],
  'furniture.wood_chair':[DAN('ふぅ……座ると、どっと来るわね。')],
  'garden.bench':[DAN('夜風が気持ちいいわね。'),KID('パパ、となり、すわっていい？'),DAN('もちろんよ。ほら、おいで。','happy')],
  'furniture.cushion':[DAN('ふかふか。……このまま寝ちゃいそう。')],
  'furniture.repaired_shelf':[DAN('ガタつき、もう無いわね。アタシ、やればできる子なのよ。','happy')],
  'furniture.bookshelf':[NAR('絵本と、危険物の参考書が同じ段に並んでいる。'),KID('パパ、これよんで！'),DAN('はいはい。……「むかしむかし、あるところに」','happy')],
  'furniture.futon':[DAN('ほら、おふとん入られ。……おやすみ。'),KID('……パパも、はやくねてね'),DAN('……うん。もう少しだけ、お仕事したらね。')],
  'furniture.low_table':[KID('いただきまーす！','happy'),DAN('はい、いただきます。よう噛んで食べられ。','happy')],
  'memento.child_drawing':[NAR('クレヨンで描いた「パパとわたし」。パパの頭に、なぜか猫の耳がある。'),DAN('……何回見ても、泣きそうになるのよ、これ。')],
  'memento.bear':[KID('くまちゃん、ここでおるすばんしてるの'),DAN('えらいわね、くまちゃん。お家、守っといてちょうだい。')],
  'memento.flower_tag':[NAR('娘が書いた名札。クレヨンの字が、少しだけ斜めになっている。')],
  'garden.pot':[NAR('小さな鉢。土の匂いがする。')],
  'garden.flowerbed':[NAR('木枠の花壇。何を植えようか、娘と相談したい。')],
  'garden.small_tree':[NAR('引っ越した日に植えた若い木。少しずつ、背がのびている。')],
  'deco.sea_glass':[NAR('角の丸いガラスが、灯りを受けてかすかに光る。'),DAN('海って、こういうのをくれるのよね。')],
  'furniture.toy_box':[NAR('ふたを開けると、積み木とボールと、片方の耳がとれたアヒル。'),DAN('……今度、耳、縫うちゃろうか。')],
  'furniture.kid_desk':[NAR('画用紙に、大きな丸と小さな丸。手をつないでいる。'),DAN('これは……パパと、あんた？','smile')],
  'furniture.old_radio':[NAR('つまみを回すと、ざらざらの向こうから、古い歌が聞こえてきた。'),DAN('夜が長いけえ、か。……千代さんの言うとおりね。')],
  'memento.toolbox':[NAR('ふたの裏に、かすれた字で「岩切」。使いこんだスパナが、きちんと並んでいる。'),DAN('……ええ仕事、せんとね。')],
  'memento.recital_photo':[NAR('花の冠をかぶって、舞台のまんなかで手をふる娘。'),DAN('この日のこと、ずっと覚えとくわ。','smile')],
  'deco.wind_chime':[NAR('ちりん、と、海の色の音がした。')],
  'deco.sea_mobile':[NAR('布の魚が、ゆっくり回っている。'),DAN('夢の海の続きみたいね。')],
  'garden.nameplate':[NAR('「だんのうら」。自分で彫った字は、少しだけ右に傾いている。'),DAN('……ここが、うちよ。')],
  'garden.clothesline':[NAR('小さなワンピースと、パーカーと、タオル。風に揺れている。'),DAN('今日はよう乾きそうね。')],
  'garden.planter':[NAR('横長のプランター。土がふかふかしている。')],
  'garden.watering_can':[NAR('ブリキのじょうろ。水を入れると、ずしりと重い。')],
};
async function useItem(P){
  const c=CAT(P.itemId);
  const can=HOME.canUse(S.area,placements(S.area),P);
  if(!can.ok){
    S.msg=`使えない：${can.reason}`;sfx('bad');HOME.ui.toast(S.msg);refresh();return;
  }
  await runBusy(async()=>{
    const dan=S.chars.dan;
    const ok=await walkTo(dan,can.cell);
    if(!ok&&c.use!=='self'){S.msg='使えない：そこまで歩いて行けません';return;}
    const fp=HOME.footprint(P.itemId,P.rotation);
    face(dan,P.x+(fp.w-1)/2,P.y+(fp.h-1)/2);
    HOME.emit('interact',{type:'use',area:S.area,placement:P});
    let handled=false;
    if(typeof HOME.hooks.useItem==='function'){try{handled=!!(await HOME.hooks.useItem(P));}catch(e){handled=false;}}
    if(handled)return;
    // 座る：椅子・ベンチ・クッションに腰かける
    if(c.verb==='座る'){
      const cells=HOME.cellsOf(P);
      const seat=cells.reduce((b,q)=>Math.abs(q.x-dan.x)+Math.abs(q.y-dan.y)<Math.abs(b.x-dan.x)+Math.abs(b.y-dan.y)?q:b,cells[0]);
      dan.standAt={x:dan.x,y:dan.y};dan.x=seat.x;dan.y=seat.y;dan.pose='sit';dan.dir=HOME.ROT_DIR[P.rotation]||'down';
      // 背もたれが手前（180°）の椅子・ベンチは、人物を家具より先に描く
      dan.zb=(P.rotation===180&&c.layer==='furniture'&&c.solid)?-.3:.1;
    }
    if(c.light){
      const h=hd();h.flags.lit=h.flags.lit||{};
      const on=!h.flags.lit[P.instanceId];
      if(on)h.flags.lit[P.instanceId]=true;else delete h.flags.lit[P.instanceId];
      HOME.ui.toast(on?`💡 ${c.name}を点けた`:`${c.name}を消した`);
      HOME.emit('change',{type:'light'});
      return;
    }
    if(c.plantable&&!(hd().plants&&hd().plants[P.instanceId])){
      if(await plantFlow(P))return;
    }
    if(P.itemId==='garden.watering_can'){await waterAll();return;}
    if(P.itemId==='furniture.desk_small'){
      dan.standAt={x:dan.x,y:dan.y};dan.pose='work';
    }
    if(c.plantable){
      const h=hd();
      if(h.plants&&h.plants[P.instanceId]){
        if(HOME.water(P.instanceId)){
          await HOME.ui.say([NAR('じょうろの水が、ゆっくり土にしみこんでいく。')]);
          const g=HOME.addHomeMental(HOME.BAL.waterMental);if(g>0)HOME.ui.toast(`🌱 水をあげた（精神+${g}）`);
        }else await HOME.ui.say([NAR('土はまだしっとりしている。今日はこれで十分。')]);
        return;
      }
    }
    if(P.itemId==='deco.wind_chime'){HOME.ui.toast('🎐 ちりん……');}
    if(P.itemId==='memento.flower_tag'){
      const h=hd();const names=Object.keys(h.plants||{}).map(k=>h.plants[k].name);
      if(names.length){await HOME.ui.say([NAR(`名札には「${names[names.length-1]}」と書いてある。`)]);return;}
    }
    await HOME.ui.say(USE_LINES[P.itemId]||[NAR(`${c.name}を${c.verb||'使った'}。`)]);
  });
}
// 空の鉢・プランターに種を植える（持っている種を選ぶ）。植えたら true
async function plantFlow(P){
  const seeds=HOME.ownedSeeds?HOME.ownedSeeds():[];
  const c=CAT(P.itemId);
  if(!seeds.length){await HOME.ui.say([NAR(`空の${c.name}。種があれば、ここに植えられる。`)]);return true;}
  const i=await HOME.ui.choice(`${c.name}に、何を植える？`,seeds.map(s=>({t:`${s.name}の種`,s:`あと${s.count}つ`})).concat([{t:'やめておく'}]));
  if(!S.open||i==null||i<0||i>=seeds.length)return true;
  const sp=seeds[i],def=(HOME.PLANT_SPECIES[sp.species]||{}).defName||sp.name;
  const name=await HOME.ui.prompt(`${sp.name}に名前をつける？（空欄なら「${def}」）`,'',8);
  if(!S.open)return true;
  const r=HOME.plantSeed(P.instanceId,sp.species,name||'');
  if(!r.ok){sfx('bad');HOME.ui.toast(`植えられません：${r.reason}`);return true;}
  sfx('place');
  const kidAwake=!kidSleeping()&&S.chars&&!S.chars.kid.hidden;
  await HOME.ui.say([NAR(`${c.name}に、${sp.name}の種をまいた。「${r.plant.name}」。`)].concat(kidAwake?[KID('はやく、めがでるといいね','happy')]:[]));
  HOME.save();
  return true;
}
// じょうろ：この場所の、植えてある鉢・プランターにまとめて水をあげる
async function waterAll(){
  const h=hd();let n=0,done=0;
  placements(S.area).forEach(P=>{const c=CAT(P.itemId);if(!c||!c.plantable||!(h.plants&&h.plants[P.instanceId]))return;n++;if(HOME.water(P.instanceId))done++;});
  if(!n){await HOME.ui.say([NAR(`${HOME.AREAS[S.area].name}には、まだ植えたものがない。`)]);return;}
  if(!done){await HOME.ui.say([NAR('どれも土はしっとりしている。今日は、これで十分。')]);return;}
  await HOME.ui.say([NAR(`じょうろで、${done}つの鉢に水をあげた。`)]);
  const g=HOME.addHomeMental(HOME.BAL.waterMental);if(g>0)HOME.ui.toast(`🌱 水をあげた（精神+${g}）`);
  HOME.save();
}
async function inspect(P){
  await runBusy(async()=>{
    const c=CAT(P.itemId);
    const lines=[NAR(`${ED().displayName(P.itemId,P.variant)}。${c.desc}`)];
    const pt=plantText(P);if(pt)lines.push(NAR(pt));
    const u=HOME.canUse(S.area,placements(S.area),P);
    if(c.use&&c.use!=='none'&&!u.ok)lines.push(NAR(`（いまは使えない：${u.reason}）`));
    HOME.emit('interact',{type:'inspect',area:S.area,placement:P});
    await HOME.ui.say(lines);
  });
}

/* ── 模様替えモードへ ── */
function enterEdit(){
  if(S.busy)return;
  closeCraft();
  standUp();
  if(!ED()||!ED().start(S)){HOME.ui.toast('模様替えを始められませんでした');return;}
  S.sel=null;S.msg='';
  sfx('btn');
  refresh();
}

/* ── クラフト ── */
function openCraft(){
  if(S.mode==='edit'||S.busy)return;
  S.craftOpen=true;S.craft.hidden=false;renderCraft();
  setTimeout(()=>{try{S.craft.querySelector('button').focus({preventScroll:true});}catch(e){}},0);
}
function closeCraft(){if(!S.craft)return;S.craftOpen=false;S.craft.hidden=true;}
function renderCraft(){
  const el=S.craft,h=hd();if(!el||!h)return;
  el.textContent='';
  const box=$el('div','hm-craft-box');
  const head=$el('div','hm-craft-head');
  head.appendChild($el('div','hm-craft-title','🔨 クラフト'));
  head.appendChild($el('div','hm-craft-cost',`1回 ${HOME.BAL.craftMin}分・疲労+${HOME.BAL.craftFatigue}`));
  head.appendChild(btn('閉じる','close',()=>closeCraft(),'hm-close'));
  box.appendChild(head);
  const mats=$el('div','hm-mats');
  Object.keys(HOME.MATERIALS).forEach(k=>{const m=HOME.MATERIALS[k];mats.appendChild(matTag('hm-mat',k,`${m.name} ${h.materials[k]|0}`));});
  box.appendChild(mats);
  const list=$el('div','hm-recipes');
  Object.keys(HOME.RECIPES).forEach(id=>{
    const r=HOME.RECIPES[id],info=HOME.recipeInfo(id);
    const card=$el('div','hm-recipe'+(info.unlocked?'':' locked'));
    if(!info.unlocked){
      const q=$el('div','hm-item-ic hm-q','？');q.setAttribute('aria-hidden','true');card.appendChild(q);
      const t=$el('div','hm-recipe-t');t.appendChild($el('div','hm-recipe-name','？？？'));t.appendChild($el('div','hm-recipe-note','まだ作り方を思いつかない'));
      card.appendChild(t);list.appendChild(card);return;
    }
    card.appendChild(itemIcon(r.out,undefined));
    const t=$el('div','hm-recipe-t');
    t.appendChild($el('div','hm-recipe-name',`${r.name}`));
    t.appendChild($el('div','hm-recipe-note',`→ ${CAT(r.out).name}（収納 ${HOME.stored(r.out)}）　${r.note||''}`));
    const need=$el('div','hm-need');
    info.need.forEach(n=>{
      const ok=n.have>=n.need;
      need.appendChild(matTag('hm-need-i'+(ok?' ok':' ng'),n.id,`${n.name} ${n.need}（所持 ${n.have}）${ok?'':'・足りない'}`));
    });
    t.appendChild(need);card.appendChild(t);
    const b=btn('つくる','craft',()=>doCraft(id,b),'hm-primary');
    b.disabled=!info.enough||S.crafting;
    b.setAttribute('aria-label',`${r.name}をつくる（${HOME.BAL.craftMin}分）${info.enough?'':'：素材が足りない'}`);
    card.appendChild(b);
    list.appendChild(card);
  });
  box.appendChild(list);
  // 家の改修（部屋・庭を広げる：一回きり・素材＋お金）
  if(typeof HOME.expandInfo==='function'&&HOME.expansion){
    const sec=$el('div','hm-recipes hm-expand');
    sec.appendChild($el('div','hm-craft-sub','🏗 家の改修（一回きり）'));
    ['room','garden'].forEach(area=>{
      const I=HOME.expandInfo(area);if(!I||!I.from)return;
      const card=$el('div','hm-recipe'+(I.done?' done':''));
      const q=$el('div','hm-item-ic hm-q',area==='room'?'⌂':'✿');q.setAttribute('aria-hidden','true');card.appendChild(q);
      const t=$el('div','hm-recipe-t');
      t.appendChild($el('div','hm-recipe-name',area==='room'?'部屋を広げる':'庭を広げる'));
      t.appendChild($el('div','hm-recipe-note',I.done?`広げました（${I.to.w}×${I.to.h}マス）`:`${I.from.w}×${I.from.h} → ${I.to.w}×${I.to.h}マス　${area==='room'?'奥の納戸の仕切りを外す':'お隣との間の空き地を借りる'}`));
      if(!I.done){
        const need=$el('div','hm-need');
        I.mats.forEach(n=>{const ok=n.have>=n.need;need.appendChild(matTag('hm-need-i'+(ok?' ok':' ng'),n.id,`${n.name} ${n.need}（所持 ${n.have}）${ok?'':'・足りない'}`));});
        const okm=I.moneyHave>=I.money;
        need.appendChild($el('span','hm-need-i'+(okm?' ok':' ng'),`💴 ¥${I.money.toLocaleString('ja-JP')}（所持 ¥${Math.floor(I.moneyHave).toLocaleString('ja-JP')}）${okm?'':'・足りない'}`));
        t.appendChild(need);
      }
      card.appendChild(t);
      if(!I.done){
        const b=btn('広げる','craft',()=>{closeCraft();runBusy(async()=>{await HOME.expansion.run(area);if(S.open){resize();fixChars();}});},I.enough?'hm-primary':'');
        b.disabled=!I.enough||S.busy;
        b.setAttribute('aria-label',`${area==='room'?'部屋':'庭'}を広げる${I.enough?'':'：'+I.reason}`);
        card.appendChild(b);
      }
      sec.appendChild(card);
    });
    box.appendChild(sec);
  }
  el.appendChild(box);
}
function doCraft(id,b){
  if(S.crafting)return;          // 連打を防ぐ
  S.crafting=true;if(b)b.disabled=true;
  const r=HOME.craft(id);
  if(r.ok){
    sfx('craft');
    HOME.ui.toast(`🔨 ${CAT(r.itemId).name}ができた！（収納に入れました・${HOME.BAL.craftMin}分経過）`);
    HOME.save();
  }else{sfx('bad');HOME.ui.toast(`作れません：${r.reason}`);}
  renderCraft();
  setTimeout(()=>{S.crafting=false;if(S.craftOpen)renderCraft();},450);
  // 夜が明けたら、家の画面を閉じて本編の日送りに任せる
  const g=G();
  if(g&&g._dayDone){HOME.ui.toast('🌅 夜が明けた……');setTimeout(()=>HOME.close(),700);}
}

/* ── 共通の再描画（DOM） ── */
function refresh(){
  if(!S.open)return;
  const edit=S.mode==='edit'&&S.ed;
  S.el.classList.toggle('editing',!!edit);
  S.tabs.querySelectorAll('.hm-tab').forEach(b=>{const on=b.dataset.area===S.area;b.setAttribute('aria-selected',on?'true':'false');b.classList.toggle('on',on);});
  S.modeEl.textContent=edit?'🛠 模様替えモード（時間は進みません）':'🏠 暮らしモード';
  S.info.textContent=edit?ED().info(S):liveInfo();
  S.info.classList.toggle('warn',!!(edit?/^(置けません|ここへは動かせません|回せません|収納に|「.*」は.*には置けません)/.test(S.info.textContent):/^使えない/.test(S.info.textContent)));
  S.cv.setAttribute('aria-label',`${HOME.AREAS[S.area].name}の見取り図（${HOME.AREAS[S.area].w}×${HOME.AREAS[S.area].h}マス）`);
  if(S.swEl){let t='';try{t=typeof HOME.seasonLabel==='function'?HOME.seasonLabel():'';}catch(e){}if(S.swEl.textContent!==t)S.swEl.textContent=t;S.swEl.hidden=!t;}
  // ボタン
  S.acts.textContent='';
  const list=edit?ED().actions(S):liveActions();
  const r1=$el('div','hm-row'),r2=$el('div','hm-row');
  list.forEach(a=>{
    const b=btn(a.label,a.icon,a.fn,(a.primary?'hm-primary':'')+' hm-act-'+(a.id||''));
    b.disabled=!!a.disabled||(!edit&&S.busy);
    (a.row===2?r2:r1).appendChild(b);
  });
  if(r1.children.length)S.acts.appendChild(r1);
  S.acts.appendChild(r2);
  // 収納（模様替えのみ）
  S.drawer.hidden=!edit;
  if(edit)renderDrawer();
  if(S.craftOpen)renderCraft();
}
// 外観・内装の見本の色（ボタンには必ず名前も書く）
const SWATCH={
  roof:{navy:'#3a4680',red:'#b84a44',green:'#4e8058',brown:'#7e5438'},
  wall:{cream:'#f6e8c8',white:'#f0eef4',wood:'#c08858'},
  door:{wood:'#d9a066',blue:'#5a7ad0'},
  wallpaper:{lavender:'#a89cc4',mint:'#a8d6c6',cream:'#eadcc0',night:'#2c2a5e'},
  floorId:{'floor.wood':'#a87a56','floor.tatami':'#c8c47c','floor.dark':'#644232'},
};
function renderLook(el){
  const E=S.ed;
  el.textContent='';
  const wrap=$el('div','hm-look');wrap.setAttribute('role','group');wrap.setAttribute('aria-label',S.area==='garden'?'外観':'内装');
  const hd0=$el('div','hm-look-top');
  hd0.appendChild($el('div','hm-look-h',S.area==='garden'?'外観（庭から見た家）：時間も素材も使いません':'内装：時間も素材も使いません'));
  const back=btn('収納にもどる','store',()=>ED().togglePanel(S),'hm-chip hm-look-back');back.setAttribute('aria-label','収納の一覧にもどる');
  hd0.appendChild(back);wrap.appendChild(hd0);
  ED().lookGroups(S).forEach(g=>{
    const row=$el('div','hm-look-row');
    row.appendChild($el('span','hm-look-l',g.label));
    const opts=$el('div','hm-look-opts');opts.setAttribute('role','radiogroup');opts.setAttribute('aria-label',g.label);
    g.opts.forEach(o=>{
      const on=o.v===g.cur;
      const b=$el('button','hm-btn hm-chip hm-look-b'+(on?' on':''));b.type='button';
      b.setAttribute('role','radio');b.setAttribute('aria-checked',on?'true':'false');
      const sw=$el('span','hm-swatch');sw.style.background=(SWATCH[g.key]||{})[o.v]||'#888';sw.setAttribute('aria-hidden','true');
      b.appendChild(sw);b.appendChild($el('span','hm-btn-t',o.name+(on?' ✓':'')));
      b.addEventListener('click',e=>{e.stopPropagation();ED().setLook(S,g.patch(o.v),`${g.label}：${o.name}`);});
      opts.appendChild(b);
    });
    row.appendChild(opts);wrap.appendChild(row);
  });
  wrap.appendChild($el('div','hm-look-note',S.area==='garden'?'部屋のタブに切りかえると、壁紙と床を選べます。':'庭のタブに切りかえると、屋根・外壁・戸の色を選べます。'));
  el.appendChild(wrap);
  void E;
}
function renderDrawer(){
  const E=S.ed,el=S.drawer;
  if(E.panel==='look'){renderLook(el);return;}
  const keep=el.querySelector('.hm-inv');const sl=keep?keep.scrollLeft:0;
  el.textContent='';
  const chips=$el('div','hm-chips');chips.setAttribute('role','group');chips.setAttribute('aria-label','収納の絞り込み');
  [['room','部屋に置ける'],['garden','庭に置ける'],['all','すべて']].forEach(([f,l])=>{
    const b=btn(l,null,()=>{E.filter=f;refresh();},'hm-chip'+(E.filter===f?' on':''));
    b.setAttribute('aria-pressed',E.filter===f?'true':'false');chips.appendChild(b);
  });
  if(ED().lookGroups){const lb=btn('外観・内装','look',()=>ED().togglePanel(S),'hm-chip hm-chip-look');lb.setAttribute('aria-pressed','false');chips.appendChild(lb);}
  // 最初の状態に戻す（確認ダイアログ → 下書きに1操作。［取り消し］で戻せる）
  if(ED().askReset){const rs=btn(ED().resetLabel(S),'undo',()=>{if(!S.busy)ED().askReset(S);},'hm-chip hm-chip-reset');rs.setAttribute('aria-label',ED().resetLabel(S)+'（確認があります）');chips.appendChild(rs);}
  el.appendChild(chips);
  const inv=$el('div','hm-inv');inv.setAttribute('role','list');inv.setAttribute('aria-label','収納');
  const items=ED().inventory(S);
  if(!items.length)inv.appendChild($el('div','hm-empty','ここに置けるものは持っていません'));
  items.forEach(it=>{
    const b=$el('button','hm-inv-i');b.type='button';b.setAttribute('role','listitem');
    const sel=E.sel&&E.sel.kind==='new'&&E.sel.itemId===it.itemId&&E.sel.variant===it.variant;
    if(sel)b.classList.add('on');
    if(it.stored<=0)b.classList.add('empty');
    if(!it.areaOk)b.classList.add('ng');
    b.setAttribute('aria-pressed',sel?'true':'false');
    b.setAttribute('aria-label',`${it.name}：収納 ${it.stored}／所持 ${it.owned}${it.areaOk?'':`（${it.areas}だけ）`}`);
    b.appendChild(itemIcon(it.itemId,it.variant));
    b.appendChild($el('span','hm-inv-n',it.name));
    b.appendChild($el('span','hm-inv-c',`収納 ${it.stored}`+(it.areaOk?'':`・${it.areas}`)));
    b.addEventListener('click',e=>{e.stopPropagation();sfx('btn');ED().pick(S,it.itemId,it.variant);});
    inv.appendChild(b);
  });
  el.appendChild(inv);
  inv.scrollLeft=sl;
}

function setArea(a){
  if(!HOME.AREAS[a]||a===S.area)return;
  if(S.busy)return;
  S.area=a;S.sel=null;S.msg='';
  if(S.ed){S.ed.sel=null;S.ed.msg='';S.ed.filter=a;}
  placeChars();resize();refresh();
}

/* ── 入力 ── */
function bindInput(){
  let down=null;
  on(S.cv,'pointerdown',e=>{
    if(DLG.active||S.craftOpen||S.overlay)return;
    const cell=cellAt(e);
    down={x:e.clientX,y:e.clientY,id:e.pointerId,cell,dragged:false};
    if(S.mode==='edit'&&S.ed&&ED().down(S,cell,e)){try{S.cv.setPointerCapture(e.pointerId);}catch(_){}}
  });
  on(S.cv,'pointermove',e=>{
    if(!down||S.mode!=='edit'||!S.ed||!S.ed.drag)return;
    const cell=cellAt(e);if(cell)ED().dragMove(S,cell,e);
  });
  on(S.cv,'pointerup',e=>{
    if(!down)return;
    const d=down;down=null;
    const cell=cellAt(e);
    if(S.mode==='edit'&&S.ed){
      if(ED().up(S,cell))return;
      if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>14||!cell)return;
      ED().tap(S,cell);return;
    }
    if(!cell||Math.hypot(e.clientX-d.x,e.clientY-d.y)>14)return;
    tapLive(cell);
  });
  on(S.cv,'pointercancel',()=>{down=null;if(S.ed)S.ed.drag=null;});
  on(root,'resize',()=>resize());
  // 収納欄の開閉などで盤面の高さが変わったら合わせる
  if(typeof ResizeObserver==='function'){
    let last='';
    const ro=new ResizeObserver(()=>{const k=S.stage?S.stage.clientWidth+'x'+S.stage.clientHeight:'';if(k!==last){last=k;resize();}});
    ro.observe(S.stage);S.offs.push(()=>ro.disconnect());
  }
  on(root,'keydown',onKey,true);
  on(S.el,'contextmenu',e=>e.preventDefault());
}
function onKey(e){
  if(!S.open)return;
  if(DLG.active){dlgKey(e);e.stopPropagation();return;}
  if(S.overlay){try{S.overlay.key&&S.overlay.key(e);}catch(_){}e.stopPropagation();return;}
  const t=e.target;
  if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')){e.stopPropagation();return;}
  if(e.key==='Tab')return;
  if((e.key==='Enter'||e.key===' ')&&t&&t.closest&&t.closest('#home-ol button')&&!(S.mode==='edit'&&e.key==='Enter'&&S.ed&&S.ed.sel&&(S.ed.sel.kind==='new'||S.ed.sel.moving)&&t.closest('.hm-inv'))){e.stopPropagation();return;}
  let used=false;
  if(S.craftOpen){if(e.key==='Escape'){closeCraft();refresh();used=true;}}
  else if(S.mode==='edit'&&S.ed)used=ED().key(S,e);
  else{
    if(e.key==='Escape'){if(S.sel){S.sel=null;S.msg='';refresh();}else requestClose();used=true;}
    else if(e.key==='e'||e.key==='E'){enterEdit();used=true;}
  }
  if(used)e.preventDefault();
  e.stopPropagation();
}

/* ── 開く・閉じる ── */
HOME.open=function(area){
  try{
    if(inSim())return false;
    area=HOME.AREAS[area]?area:'room';
    if(S.open){setArea(area);return true;}
    if(!HOME.ensure())return false;
    build();
    S.open=true;S.area=area;S.mode='live';S.sel=null;S.msg='';S.ed=null;S.busy=false;S.craftOpen=false;S.t=0;S.last=0;S._errLogged=false;
    document.body.classList.add('home-open');
    placeChars();
    bindInput();
    resize();refresh();
    requestAnimationFrame(()=>{resize();});
    S.raf=requestAnimationFrame(frame);
    try{S.el.focus({preventScroll:true});}catch(e){}
    HOME.emit('open',{area});
    if(typeof HOME.hooks.onOpen==='function'){
      setTimeout(()=>{
        if(!S.open)return;
        runBusy(async()=>{try{await HOME.hooks.onOpen(S.area);}catch(e){}if(S.open){fixChars();}});
      },350);
    }
    return true;
  }catch(e){
    try{console.error('[home] open',e);}catch(_){}
    try{teardown();}catch(_){}
    return false;
  }
};
function teardown(){
  if(S.raf)cancelAnimationFrame(S.raf);S.raf=0;
  S.offs.forEach(f=>{try{f();}catch(e){}});S.offs=[];
  if(S.el&&S.el.parentNode)S.el.parentNode.removeChild(S.el);
  // 開いたままの会話は閉じる
  DLG.gen++;
  if(DLG.active){try{const st=DLG.active;(st.cancel||st.advance||(()=>st.finish(null)))();}catch(e){}}
  document.body.classList.remove('home-open');
  S.open=false;S.el=null;S.cv=null;S.ctx=null;S.ed=null;S.mode='live';S.chars=null;S.sel=null;S.craftOpen=false;S.busy=false;
  S.visitor=null;S.visitorReq=null;S.kidAct={key:'wander'};S.overlay=null;S.scrollArea='';
}
let closing=false;
async function requestClose(){
  if(closing||!S.open)return;
  closing=true;
  try{
    if(S.mode==='edit'&&S.ed){const ok=await ED().confirmExit(S);if(!ok){refresh();return;}}
    HOME.close();
  }finally{closing=false;}
}
HOME.requestClose=requestClose;
// 強制的に閉じる（未確定の模様替えは破棄）。画面のボタンからは requestClose で確認する
HOME.close=function(){
  if(!S.open)return false;
  const area=S.area;
  teardown();
  HOME.emit('close',{area});
  try{if(typeof updateStats==='function')updateStats();}catch(e){}
  return true;
};
HOME.isOpen=()=>S.open;
HOME._screen=S;
})();
