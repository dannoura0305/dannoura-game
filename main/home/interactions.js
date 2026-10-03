// ═══════════════════════════════════════════════════════════
// 家・庭づくり：画面（開閉）・暮らしモード（調べる・使う・娘と話す）・会話UI・クラフト画面
//   HOME.open(area='room') / HOME.close() / HOME.isOpen()
//   HOME.ui.say(lines) / HOME.ui.choice(prompt, options) / HOME.ui.prompt(label, def, max) / HOME.ui.toast(text)
//   フック：HOME.hooks.onOpen(area) / HOME.hooks.talkKid() / HOME.hooks.useItem(P) → Promise<boolean handled>
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
  }catch(e){}
  return null;
}
const WHO_NAME={dan:'だんのうら',kid:'娘'};
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
    const t=$el('div','hm-toast',String(text));st.appendChild(t);
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
  Object.assign(S,{el,cv,ctx:cv.getContext('2d'),stage,info,acts,drawer,craft,modeEl:mode,tabs});
}

function on(target,type,fn,opt){target.addEventListener(type,fn,opt);S.offs.push(()=>target.removeEventListener(type,fn,opt));}

function resize(){
  if(!S.open)return;
  const L=HOME.layout(S.area,S.T);
  const aw=Math.max(80,S.stage.clientWidth-8),ah=Math.max(80,S.stage.clientHeight-8);
  let sc=Math.min(aw/L.cw,ah/L.ch);
  if(sc>1)sc=Math.min(3,Math.floor(sc*4)/4);
  S.scale=sc;
  const dpr=root.devicePixelRatio||1;
  S.k=Math.max(1,Math.min(4,Math.ceil(sc*dpr)));
  S.cv.width=L.cw*S.k;S.cv.height=L.ch*S.k;
  S.cv.style.width=Math.round(L.cw*sc)+'px';S.cv.style.height=Math.round(L.ch*sc)+'px';
  S.ctx=S.cv.getContext('2d');S.ctx.imageSmoothingEnabled=false;
}

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
}
function fixChars(){
  if(!S.chars)return;
  ['dan','kid'].forEach(w=>{
    const c=S.chars[w];c.path=[];c.moving=false;
    if(c.pose==='sit'){c.pose='stand';}
    const x=Math.round(c.x),y=Math.round(c.y);
    if(solidAt(S.area,x,y)){const f=nearestFree(S.area,x,y,w==='kid'?{x:Math.round(S.chars.dan.x),y:Math.round(S.chars.dan.y)}:null);c.x=f.x;c.y=f.y;}
    else{c.x=x;c.y=y;}
  });
}
function walkTo(c,cell){
  return new Promise(res=>{
    const p=pathTo(S.area,{x:c.x,y:c.y},cell);
    if(!p){res(false);return;}
    if(c.pose==='sit')c.pose='stand';
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
  ['dan','kid'].forEach(w=>{
    const c=S.chars[w];
    if(c.path&&c.path.length){
      const n=c.path[0],sp=(w==='kid'?3:3.6)*dt;
      const dx=n.x-c.x,dy=n.y-c.y,d=Math.hypot(dx,dy);
      if(d>0.001)c.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
      if(d<=sp){c.x=n.x;c.y=n.y;c.path.shift();}else{c.x+=dx/d*sp;c.y+=dy/d*sp;}
      c.moving=true;
      if(!c.path.length){c.moving=false;const f=c.onArrive;c.onArrive=null;f&&f();}
    }else c.moving=false;
  });
  // 娘はときどき歩き回る
  if(!S.busy&&!DLG.active&&S.mode==='live'){
    S.kidTimer-=dt;
    const k=S.chars.kid;
    if(S.kidTimer<=0&&!k.moving&&k.pose!=='sit'){
      S.kidTimer=2.5+Math.random()*3.5;
      const A=HOME.AREAS[S.area],dan=S.chars.dan;
      for(let tries=0;tries<12;tries++){
        const tx=Math.round(k.x)+Math.floor(Math.random()*7)-3,ty=Math.round(k.y)+Math.floor(Math.random()*5)-2;
        if(tx<0||ty<0||tx>=A.w||ty>=A.h)continue;
        if(Math.round(dan.x)===tx&&Math.round(dan.y)===ty)continue;
        if(HOME._isExit(S.area,tx,ty))continue;
        const p=pathTo(S.area,{x:k.x,y:k.y},{x:tx,y:ty});
        if(p&&p.length&&p.length<=6){k.path=p;break;}
      }
    }
  }
}

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
    o.chars=S.chars?[S.chars.dan,S.chars.kid]:[];
    if(S.sel&&S.sel.kind==='item'){
      const P=findP(S.sel.id);
      if(P){const c=HOME.useCell(S.area,placements(S.area),P);if(c&&CAT(P.itemId).use!=='self')o.marks=[c];}
    }
    if(S.sel&&S.sel.kind==='char'&&S.chars){const c=S.chars[S.sel.who];o.marks=[{x:Math.round(c.x),y:Math.round(c.y)}];}
  }
  o.T=S.T;o.t=S.t;o.night=isNight();
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
    for(const w of['kid','dan']){
      const c=S.chars[w],cx=Math.round(c.x),cy=Math.round(c.y);
      if(cell.x===cx&&(cell.y===cy||(!cell.band&&cell.y===cy-1&&!itemAt(cell))))return{kind:'char',who:w};
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
  if(!p)return P.itemId==='garden.pot'?'まだ何も植えていない。':'';
  const st=HOME.STAGE_NAMES[Math.max(0,Math.min(4,p.stage|0))];
  return `植えた花「${p.name}」：${st}（水やり：${HOME.wateredToday&&HOME.wateredToday(P.instanceId)?'今日はあげた':'今日はまだ'}）`;
}
function liveInfo(){
  if(S.msg)return S.msg;
  const s=S.sel;
  if(!s)return `暮らしモード（${HOME.AREAS[S.area].name}）：人や家具をタップすると調べられます。`;
  if(s.kind==='char')return s.who==='kid'?'娘（4さい）。くまのぬいぐるみと、パパの声が大好き。［話す］で話しかけられます。':'だんのうら。設備保全の仕事と深夜配信をこなす、シングルファーザー。';
  const P=findP(s.id);if(!P)return '';
  const c=CAT(P.itemId);
  const pt=plantText(P);
  return `${ED().displayName(P.itemId,P.variant)}：${c.desc}${pt?' '+pt:''}`;
}
function useLabel(P){
  const c=CAT(P.itemId);
  if(c.light){const h=hd();return h.flags.lit&&h.flags.lit[P.instanceId]?'灯りを消す':'灯りを点ける';}
  if(P.itemId==='garden.pot'){const h=hd();return h.plants&&h.plants[P.instanceId]?'水やり・ながめる':'眺める';}
  return c.verb||'使う';
}
function liveActions(){
  const a=[];const s=S.sel;
  if(s&&s.kind==='char'&&s.who==='kid')a.push({label:'話す',icon:'talk',fn:talkKid,primary:true});
  if(s&&s.kind==='item'){
    const P=findP(s.id);
    if(P){
      const c=CAT(P.itemId);
      if(c.use&&c.use!=='none')a.push({label:useLabel(P),icon:P.itemId==='garden.pot'?'water':'place',fn:()=>useItem(P),primary:true});
      a.push({label:'調べる',icon:'edit',fn:()=>inspect(P)});
    }
  }
  a.push({label:'模様替え',icon:'edit',fn:()=>enterEdit(),row:2});
  a.push({label:'クラフト',icon:'craft',fn:()=>openCraft(),row:2});
  if(HOME.memories&&typeof HOME.memories.openBook==='function')a.push({label:'思い出帳',icon:'memories',fn:()=>{try{HOME.memories.openBook();}catch(e){}},row:2});
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
    if(!cell.band&&!solidAt(S.area,cell.x,cell.y))walkTo(S.chars.dan,{x:cell.x,y:cell.y});
  }else S.sel=h;
  refresh();
}
function standUp(){
  const d=S.chars&&S.chars.dan;
  if(d&&d.pose==='sit'){d.pose='stand';if(d.standAt){d.x=d.standAt.x;d.y=d.standAt.y;d.standAt=null;}}
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
  await runBusy(async()=>{
    const kid=S.chars.kid,dan=S.chars.dan;
    kid.path=[];kid.moving=false;kid.x=Math.round(kid.x);kid.y=Math.round(kid.y);
    // 娘の隣まで歩く
    const A=HOME.AREAS[S.area];
    const cand=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>({x:kid.x+dx,y:kid.y+dy})).filter(q=>q.x>=0&&q.y>=0&&q.x<A.w&&q.y<A.h&&!solidAt(S.area,q.x,q.y));
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
    }
    if(c.light){
      const h=hd();h.flags.lit=h.flags.lit||{};
      const on=!h.flags.lit[P.instanceId];
      if(on)h.flags.lit[P.instanceId]=true;else delete h.flags.lit[P.instanceId];
      HOME.ui.toast(on?`💡 ${c.name}を点けた`:`${c.name}を消した`);
      HOME.emit('change',{type:'light'});
      return;
    }
    if(P.itemId==='garden.pot'){
      const h=hd();
      if(h.plants&&h.plants[P.instanceId]){
        if(HOME.water(P.instanceId)){
          await HOME.ui.say([NAR('じょうろの水が、ゆっくり土にしみこんでいく。')]);
          const g=HOME.addHomeMental(HOME.BAL.waterMental);if(g>0)HOME.ui.toast(`🌱 水をあげた（精神+${g}）`);
        }else await HOME.ui.say([NAR('土はまだしっとりしている。今日はこれで十分。')]);
        return;
      }
    }
    if(P.itemId==='memento.flower_tag'){
      const h=hd();const names=Object.keys(h.plants||{}).map(k=>h.plants[k].name);
      if(names.length){await HOME.ui.say([NAR(`名札には「${names[names.length-1]}」と書いてある。`)]);return;}
    }
    await HOME.ui.say(USE_LINES[P.itemId]||[NAR(`${c.name}を${c.verb||'使った'}。`)]);
  });
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
  Object.keys(HOME.MATERIALS).forEach(k=>{const m=HOME.MATERIALS[k];mats.appendChild($el('span','hm-mat',`${m.icon} ${m.name} ${h.materials[k]|0}`));});
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
      need.appendChild($el('span','hm-need-i'+(ok?' ok':' ng'),`${HOME.MATERIALS[n.id].icon} ${n.name} ${n.need}（所持 ${n.have}）${ok?'':'・足りない'}`));
    });
    t.appendChild(need);card.appendChild(t);
    const b=btn('つくる','craft',()=>doCraft(id,b),'hm-primary');
    b.disabled=!info.enough||S.crafting;
    b.setAttribute('aria-label',`${r.name}をつくる（${HOME.BAL.craftMin}分）${info.enough?'':'：素材が足りない'}`);
    card.appendChild(b);
    list.appendChild(card);
  });
  box.appendChild(list);
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
function renderDrawer(){
  const E=S.ed,el=S.drawer;
  const keep=el.querySelector('.hm-inv');const sl=keep?keep.scrollLeft:0;
  el.textContent='';
  const chips=$el('div','hm-chips');chips.setAttribute('role','group');chips.setAttribute('aria-label','収納の絞り込み');
  [['room','部屋に置ける'],['garden','庭に置ける'],['all','すべて']].forEach(([f,l])=>{
    const b=btn(l,null,()=>{E.filter=f;refresh();},'hm-chip'+(E.filter===f?' on':''));
    b.setAttribute('aria-pressed',E.filter===f?'true':'false');chips.appendChild(b);
  });
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
    if(DLG.active||S.craftOpen)return;
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
  on(root,'keydown',onKey,true);
  on(S.el,'contextmenu',e=>e.preventDefault());
}
function onKey(e){
  if(!S.open)return;
  if(DLG.active){dlgKey(e);e.stopPropagation();return;}
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
