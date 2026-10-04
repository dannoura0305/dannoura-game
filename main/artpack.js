// ═══════════════════════════════════════════════════════════
// 生成画像の受け口（だんのうら以外の脇役・リスナー・敵・小物）
//
//   assets/gen/manifest.json の assets[].file に PNG のパスを書くと、
//   コード描画・SVG の代わりにその画像を使う。file が null・読めない画像のときは今までどおり。
//   （家・庭は assets/original/manifest.json、RPG は minigames/rpg.js 側の受け口で別管理）
//
//   ARTPACK.ready        … Promise（読み込みが終わると、使える差し替えの数で解決。失敗しても reject しない）
//   ARTPACK.src(id)      … 読み込めた画像の URL（無ければ null）
//   ARTPACK.img(id)      … 読み込み済みの Image（無ければ null）
//   ARTPACK.has(id)      … src(id) が null でないか
//   ARTPACK.entry(id)    … manifest の項目（file が null でも返す。無ければ null）
//   ARTPACK.draw(ctx,id,x,y,w,h,{frame,smooth}) … canvas に描く。描けたら true（横並びのコマ frames に対応）
//   ARTPACK.onReady(fn)  … 読み込み後に fn(ARTPACK)（もう終わっていればすぐ）
//
//   使っている場所：main/mobs.js（脇役の顔グラ portrait.<id>.<表情>・配信コメントのアイコン avatar.<key>）、
//   娘の顔 CHILD_IMG（portrait.kid.<表情>）、物語のリスナーのアイコン（avatar.<key>）、
//   ミニゲームの敵（mg.<game>.<name>）。一覧は docs/gen-art.md。
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const MANIFEST='assets/gen/manifest.json';
const SAFE=/^[A-Za-z0-9_\-./]+\.(png|webp|jpe?g|svg)$/i;
const TIMEOUT=10000;
const entries=new Map();   // id → manifest の項目
const loaded=new Map();    // id → {src, img}
const waiters=[];
let done=false,resolveReady=null;
const ready=new Promise(r=>{resolveReady=r;});

function safeFile(f){return typeof f==='string'&&SAFE.test(f)&&f.indexOf('..')<0&&f.charAt(0)!=='/'&&!/^[a-z][a-z0-9+.-]*:/i.test(f);}
function fileUrl(a){return a.file+(a.rev!=null&&a.rev!==''?'?v='+encodeURIComponent(String(a.rev)):'');}

function loadOne(a){
  return new Promise(res=>{
    let im,fin=false;const end=()=>{if(!fin){fin=true;res();}};
    try{im=new Image();}catch(e){return end();}
    const url=fileUrl(a);
    try{im.decoding='async';}catch(e){}
    im.onload=()=>{if(im.naturalWidth>0)loaded.set(a.id,{src:url,img:im});end();};
    im.onerror=end;
    setTimeout(end,TIMEOUT);
    try{im.src=url;}catch(e){end();}
  });
}
// manifest（オブジェクト）を取り込む。テストからも呼べる
function ingest(m){
  const list=m&&Array.isArray(m.assets)?m.assets:[];
  const jobs=[];
  list.forEach(a=>{
    if(!a||typeof a.id!=='string'||!a.id)return;
    entries.set(a.id,a);
    if(safeFile(a.file))jobs.push(loadOne(a));
  });
  return Promise.all(jobs).then(()=>loaded.size);
}
function finish(n){
  if(done)return;done=true;
  applyChild();
  resolveReady(n|0);
  waiters.splice(0).forEach(fn=>{try{fn(api);}catch(e){}});
  try{window.dispatchEvent(new CustomEvent('artpack:ready',{detail:{count:n|0}}));}catch(e){}
}
// 娘の顔：CHILD_IMG（game.js）の中身を差し替えると、物語・ミニゲーム・出来事の窓すべてに効く
const childOrig={};
function applyChild(){
  try{
    if(typeof CHILD_IMG==='undefined'||!CHILD_IMG)return;
    Object.keys(CHILD_IMG).forEach(k=>{
      if(!(k in childOrig))childOrig[k]=CHILD_IMG[k];
      const s=api.src('portrait.kid.'+k);
      CHILD_IMG[k]=s||childOrig[k];
    });
  }catch(e){}
}
function load(){
  try{
    if(typeof fetch!=='function'||typeof location==='undefined'||!/^https?:$/.test(location.protocol)){finish(0);return;}
    fetch(MANIFEST,{cache:'no-cache'})
      .then(r=>r&&r.ok?r.json():null)
      .then(m=>m?ingest(m):0)
      .then(finish,()=>finish(loaded.size));
  }catch(e){finish(0);}
}

const api={
  ready,
  src(id){const o=loaded.get(id);return o?o.src:null;},
  img(id){const o=loaded.get(id);return o?o.img:null;},
  has(id){return loaded.has(id);},
  entry(id){return entries.get(id)||null;},
  ids(){return Array.from(entries.keys());},
  get count(){return loaded.size;},
  get loaded(){return done;},
  onReady(fn){if(typeof fn!=='function')return;if(done){try{fn(api);}catch(e){}}else waiters.push(fn);},
  // 横に並んだコマ（frames）にも対応。smooth=false でドット絵をくっきり
  draw(ctx,id,x,y,w,h,opt){
    const o=loaded.get(id);if(!o||!ctx)return false;
    const e=entries.get(id)||{},op=opt||{};
    const n=Math.max(1,(+e.frames)|0),fi=((op.frame|0)%n+n)%n;
    const iw=o.img.naturalWidth,ih=o.img.naturalHeight,fw=iw/n;
    const sm=ctx.imageSmoothingEnabled;
    try{
      ctx.imageSmoothingEnabled=op.smooth!=null?!!op.smooth:e.pixel!==true;
      ctx.drawImage(o.img,fi*fw,0,fw,ih,x,y,w,h);
    }catch(err){return false;}
    finally{ctx.imageSmoothingEnabled=sm;}
    return true;
  },
  _ingest(m){return ingest(m).then(n=>{applyChild();return n;});},
  _finish:finish,
  _childOrig:childOrig,
};
window.ARTPACK=api;
load();
})();
