// ═══════════════════════════════════════════════════════════
// 思い出帳（HOME.memories）
//   HOME.memories.add(M)   … 思い出を1件記録（同じ id は二度と追加しない）
//   HOME.memories.list()   … 日付順のコピー
//   HOME.memories.has(id)
//   HOME.memories.snapshotOf(area) … 今の配置だけを写し取った軽いデータ（画像は保存しない）
//   HOME.memories.openBook() / closeBook()
// M = { id, day, who:['dan','kid'], what, items:[itemId], text, snapshot:null|{area, placements, plants} }
// 保存されるのは配置データだけ。サムネイルは開くたびに HOME.snapshot で描き直す。
// 設計：docs/home-story-design.md
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const SIM=(()=>{try{return !!(root.frameElement&&/simulator/.test(root.parent.location.pathname));}catch(e){return false;}})();
const MAX=120;              // 思い出の上限（古いものから外す）
const WHO={dan:'だんのうら',kid:'娘'};

function G(){try{return typeof gs!=='undefined'?gs:null;}catch(e){return null;}}
function hd(){
  try{
    if(typeof HOME.ensure==='function')return HOME.ensure();
    const g=G();return g?g.homeData||null:null;
  }catch(e){return null;}
}
function arr(h){if(!h)return [];if(!Array.isArray(h.memories))h.memories=[];return h.memories;}
const str=(v,n)=>typeof v==='string'?v.slice(0,n):'';
const int=(v,d)=>Number.isFinite(+v)?Math.floor(+v):d;

// 配置データだけを取り出す（関数・画像・余計なキーは入れない）
function cleanP(p){
  if(!p||typeof p!=='object'||typeof p.itemId!=='string')return null;
  const o={instanceId:str(p.instanceId,24),itemId:str(p.itemId,48),x:int(p.x,0),y:int(p.y,0),rotation:int(p.rotation,0),variant:str(p.variant,16)||'default',layer:str(p.layer,16)||'furniture'};
  if(p.lit===true)o.lit=true;
  return o;
}
function cleanSnapshot(s){
  if(!s||typeof s!=='object')return null;
  const area=s.area==='garden'?'garden':'room';
  const placements=(Array.isArray(s.placements)?s.placements:[]).slice(0,200).map(cleanP).filter(Boolean);
  const plants={};
  const src=s.plants&&typeof s.plants==='object'?s.plants:{};
  placements.forEach(p=>{
    const pl=src[p.instanceId];
    if(pl&&typeof pl==='object')plants[p.instanceId]={name:str(pl.name,8),color:str(pl.color,12),stage:Math.max(0,Math.min(4,int(pl.stage,0)))};
  });
  return {area,placements,plants};
}
function snapshotOf(area){
  const h=hd();if(!h)return null;
  area=area==='garden'?'garden':'room';
  const A=h[area];if(!A)return null;
  const lit=h.flags&&h.flags.lit&&typeof h.flags.lit==='object'?h.flags.lit:{};
  return cleanSnapshot({area,placements:(A.placements||[]).map(p=>lit[p&&p.instanceId]?Object.assign({},p,{lit:true}):p),plants:h.plants||{}});
}

function add(M){
  if(!M||typeof M.id!=='string'||!M.id)return false;
  const h=hd();if(!h)return false;
  const list=arr(h);
  if(list.some(m=>m&&m.id===M.id))return false;
  const g=G();
  const e={
    id:M.id.slice(0,64),
    day:int(M.day,g?g.day:1),
    who:(Array.isArray(M.who)?M.who:[]).filter(w=>typeof w==='string').slice(0,4),
    what:str(M.what,40),
    items:(Array.isArray(M.items)?M.items:[]).filter(w=>typeof w==='string').slice(0,8),
    text:str(M.text,300),
    snapshot:cleanSnapshot(M.snapshot),
  };
  list.push(e);
  while(list.length>MAX)list.shift();
  try{HOME.emit&&HOME.emit('change',{memory:e.id});}catch(err){}
  return true;
}
function list(){
  const h=hd();
  return arr(h).filter(m=>m&&typeof m.id==='string').map((m,i)=>({m,i})).sort((a,b)=>(a.m.day-b.m.day)||(a.i-b.i)).map(o=>o.m);
}
function has(id){const h=hd();return arr(h).some(m=>m&&m.id===id);}
function get(id){const h=hd();return arr(h).find(m=>m&&m.id===id)||null;}

// ── 思い出帳の画面 ──
const CSS=`
.hm-book{position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;background:rgba(6,4,18,.72);padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));box-sizing:border-box;animation:hmBookIn .22s ease;}
@keyframes hmBookIn{from{opacity:0}to{opacity:1}}
.hm-book-panel{position:relative;width:min(560px,100%);max-height:100%;display:flex;flex-direction:column;background:#f6efe1;color:#3a2c22;border-radius:10px;box-shadow:0 0 0 3px #5a4030,0 12px 40px rgba(0,0,0,.6);overflow:hidden;font-family:inherit;}
.hm-book-hd{display:flex;align-items:center;gap:8px;padding:10px 10px 10px 16px;background:#e9dcc2;border-bottom:2px dashed #b89c78;}
.hm-book-hd h2{flex:1;margin:0;font-size:1.05rem;letter-spacing:.12em;color:#4a3626;}
.hm-book-close{min-width:88px;min-height:44px;padding:6px 14px;border-radius:8px;border:2px solid #5a4030;background:#fffaf0;color:#3a2c22;font-size:.95rem;font-family:inherit;cursor:pointer;}
.hm-book-close:focus-visible{outline:3px solid #d0702a;outline-offset:2px;}
.hm-book-list{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:8px 14px 18px;overscroll-behavior:contain;}
.hm-book-day{margin:14px 0 6px;font-size:.78rem;letter-spacing:.2em;color:#8a6a4a;border-bottom:1px solid #d8c6a6;padding-bottom:2px;}
.hm-mem{display:flex;gap:12px;align-items:flex-start;padding:10px 0;border-bottom:1px dotted #d8c6a6;}
.hm-mem:last-child{border-bottom:none;}
.hm-mem-body{flex:1;min-width:0;}
.hm-mem-what{font-weight:700;font-size:.95rem;line-height:1.5;color:#3a2c22;}
.hm-mem-who{font-size:.72rem;color:#8a6a4a;margin-top:1px;}
.hm-mem-text{margin:4px 0 0;font-size:.86rem;line-height:1.75;white-space:pre-wrap;word-break:break-word;color:#4a3a2e;}
.hm-mem-pic{flex:none;width:min(38%,170px);}
.hm-mem-pic canvas{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:4px;box-shadow:0 0 0 2px #5a4030;background:#2a2030;}
.hm-book-empty{padding:28px 6px;text-align:center;line-height:1.9;color:#7a6050;font-size:.9rem;}
@media (max-width:420px){.hm-mem{flex-direction:column;}.hm-mem-pic{width:100%;max-width:280px;}}
@media (prefers-color-scheme:dark){.hm-book-panel{background:#2a2230;color:#efe6da;}.hm-book-hd{background:#3a2e3e;border-color:#6a5a6e;}.hm-book-hd h2,.hm-mem-what{color:#f6ecdc;}.hm-mem-text{color:#e2d6c8;}.hm-book-day,.hm-mem-who,.hm-book-empty{color:#c8b49a;}.hm-book-close{background:#45384a;color:#fff;border-color:#c8b49a;}}
`;
function injectCSS(){
  if(document.getElementById('hm-book-style'))return;
  const st=document.createElement('style');st.id='hm-book-style';st.textContent=CSS;document.head.appendChild(st);
}
let bookEl=null,prevFocus=null,onKey=null;
function litMap(snap){const m={};((snap&&snap.placements)||[]).forEach(p=>{if(p.lit)m[p.instanceId]=true;});return m;}
function thumb(snap){
  if(!snap||typeof HOME.snapshot!=='function')return null;
  try{
    const cv=HOME.snapshot(snap.area,{placements:snap.placements,plants:snap.plants,lit:litMap(snap),scale:.5});
    return cv&&cv.nodeType===1?cv:null;
  }catch(e){return null;}
}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
function openBook(){
  if(SIM||typeof document==='undefined')return false;
  closeBook();
  injectCSS();
  prevFocus=document.activeElement;
  const wrap=el('div','hm-book');
  wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','思い出帳');
  const panel=el('div','hm-book-panel');
  const hdr=el('div','hm-book-hd');
  hdr.appendChild(el('h2',null,'📖 思い出帳'));
  const close=el('button','hm-book-close','閉じる');close.type='button';
  close.addEventListener('click',e=>{e.stopPropagation();closeBook();});
  hdr.appendChild(close);
  const body=el('div','hm-book-list');
  const ms=list();
  if(!ms.length){
    body.appendChild(el('div','hm-book-empty','まだ、なにも書かれていない。\n……これから、少しずつ。'));
  }else{
    let lastDay=null;
    ms.forEach(m=>{
      if(m.day!==lastDay){lastDay=m.day;body.appendChild(el('div','hm-book-day',`DAY ${m.day}`));}
      const a=el('article','hm-mem');
      const b=el('div','hm-mem-body');
      b.appendChild(el('div','hm-mem-what',m.what||'（無題）'));
      const who=(m.who||[]).map(w=>WHO[w]||'').filter(Boolean).join('と');
      if(who)b.appendChild(el('div','hm-mem-who',who));
      if(m.text)b.appendChild(el('p','hm-mem-text',m.text));
      a.appendChild(b);
      const cv=thumb(m.snapshot);
      if(cv){const p=el('div','hm-mem-pic');cv.setAttribute('role','img');cv.setAttribute('aria-label',(m.snapshot.area==='garden'?'庭':'部屋')+'のようす');p.appendChild(cv);a.appendChild(p);}
      body.appendChild(a);
    });
  }
  panel.appendChild(hdr);panel.appendChild(body);wrap.appendChild(panel);
  wrap.addEventListener('click',e=>{if(e.target===wrap)closeBook();});
  // 下の画面にタップやキーが抜けないようにする
  ['pointerdown','touchstart','wheel'].forEach(t=>wrap.addEventListener(t,e=>e.stopPropagation(),{passive:true}));
  onKey=e=>{
    if(!bookEl)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeBook();}
    else if(e.key==='Tab'){e.preventDefault();close.focus();}
  };
  document.addEventListener('keydown',onKey,true);
  document.body.appendChild(wrap);
  bookEl=wrap;
  setTimeout(()=>{try{close.focus({preventScroll:true});}catch(e){}},30);
  try{HOME.emit&&HOME.emit('memories-open');}catch(e){}
  return true;
}
function closeBook(){
  if(onKey){document.removeEventListener('keydown',onKey,true);onKey=null;}
  if(bookEl){bookEl.remove();bookEl=null;
    try{if(prevFocus&&prevFocus.focus&&document.contains(prevFocus))prevFocus.focus({preventScroll:true});}catch(e){}
    prevFocus=null;
    try{HOME.emit&&HOME.emit('memories-close');}catch(e){}
  }
}

HOME.memories={add,list,has,get,snapshotOf,cleanSnapshot,litMap,openBook,closeBook,isOpen:()=>!!bookEl};
})();
