// ═══════════════════════════════════════════════════════════
// 家・庭：写真を撮る（フェーズ3 §5）
//   HOME.photo.filename(area, day?) → 'dannoura-home-<area>-day<d>.png'
//   HOME.photo.render(area?, {scale}) → canvas（今の部屋／庭を、人物・ねこ・お客さん・季節・天候・灯りごと。整数倍でくっきり）
//   HOME.photo.save(area?)  → {ok, reason, mode:'download'|'tab'}   <a download>。iOS は新しいタブに出して長押し保存の案内
//   HOME.photo.toMemory(area?) → {ok, reason}  思い出帳に「配置の写し」だけを貼る（画像は保存しない）
//   HOME.photo.open()        … 暮らしモードの［写真を撮る］：プレビューと［端末に保存］［思い出帳に貼る］
// 失敗したときは成功と表示しない。画像データは localStorage に入れない。
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const G=()=>{try{return (typeof gs!=='undefined'&&gs)?gs:null;}catch(e){return null;}};
const AREA_NAME={room:'部屋',garden:'庭'};
const SCALE=2;          // 書き出しの倍率（整数倍：1ドット＝4px）

function dayNum(d){const g=G();const v=d!==undefined?+d:(g?+g.day:1);return Number.isFinite(v)&&v>0?Math.floor(v):1;}
function filename(area,day){
  area=area==='garden'?'garden':'room';
  return `dannoura-home-${area}-day${dayNum(day)}.png`;
}
function curArea(){const S=HOME._screen;return S&&S.open&&S.area?S.area:'room';}
function isNight(){const g=G();const h=g?+g.hour:22;return h>=18||h<6;}
function cond(){
  const o={};
  try{if(typeof HOME.season==='function')o.season=HOME.season();if(typeof HOME.weather==='function')o.weather=HOME.weather();}catch(e){}
  o.night=isNight();
  return o;
}
function lookNow(){
  const hd=HOME.data&&HOME.data();if(!hd)return null;
  return{exterior:Object.assign({},hd.exterior||{}),wallpaper:hd.room&&hd.room.wallpaper,floorId:hd.room&&hd.room.floorId};
}
function caption(area){
  const g=G();const life=g&&g.homeData&&g.homeData.life&&g.homeData.life.active?g.homeData.life:null;
  const d=life?`暮らし ${(life.day|0)+1}日目`:`DAY ${dayNum()}`;
  let sw='';try{sw=typeof HOME.seasonLabel==='function'?HOME.seasonLabel():'';}catch(e){}
  return `だんのうらの家・${AREA_NAME[area]}　${d}${sw?'　'+sw:''}`;
}
// 今の画面と同じ絵を、余白とひとことの帯つきで描く
function render(area,opt){
  opt=opt||{};
  try{
    if(typeof document==='undefined'||typeof HOME.renderArea!=='function')return null;
    area=area==='garden'||area==='room'?area:curArea();
    const S=HOME._screen;
    const L=HOME.layout(area,32);
    const k=Math.max(1,Math.floor(opt.scale||SCALE));
    const pad=6,capH=opt.caption===false?0:22;
    const cv=document.createElement('canvas');
    cv.width=(L.cw+pad*2)*k;cv.height=(L.ch+pad*2+capH)*k;
    const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;
    ctx.scale(k,k);
    // 額縁（夜の紺＋アンバーの縁）
    ctx.fillStyle='#1b1226';ctx.fillRect(0,0,L.cw+pad*2,L.ch+pad*2+capH);
    ctx.fillStyle='#3a2a60';ctx.fillRect(2,2,L.cw+pad*2-4,L.ch+pad*2+capH-4);
    ctx.fillStyle='#ffd98a';ctx.fillRect(pad-2,pad-2,L.cw+4,1);ctx.fillRect(pad-2,pad+L.ch+1,L.cw+4,1);ctx.fillRect(pad-2,pad-2,1,L.ch+4);ctx.fillRect(pad+L.cw+1,pad-2,1,L.ch+4);
    ctx.save();ctx.translate(pad,pad);
    ctx.beginPath();ctx.rect(0,0,L.cw,L.ch);ctx.clip();
    const same=S&&S.open&&S.area===area;
    const chars=[];
    if(same&&S.chars){['dan','kid','cat'].forEach(w=>{const c=S.chars[w];if(c&&!c.hidden)chars.push(Object.assign({},c,{moving:false}));});if(S.visitor)chars.push(Object.assign({},S.visitor));}
    const c0=cond();
    const o={T:32,t:same?S.t:0,chars,night:c0.night,season:c0.season,weather:c0.weather,particles:same?'frozen':false};
    if(same&&S.mode==='edit'&&S.ed&&HOME.editor){const eo=HOME.editor.renderOpts(S);o.placements=eo.placements;if(eo.look)o.look=eo.look;o.chars=[];}
    HOME.renderArea(ctx,area,o);
    ctx.restore();
    if(capH){
      ctx.fillStyle='#fff3d8';
      ctx.font='12px "DotGothic16", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
      ctx.textBaseline='middle';ctx.textAlign='left';
      ctx.fillText(caption(area),pad+2,L.ch+pad*2+capH/2-2);
      try{const ic=root.HOME_ART&&root.HOME_ART.uiIcon&&root.HOME_ART.uiIcon('photo');if(ic)ctx.drawImage(ic,0,0,32,32,L.cw+pad-18,L.ch+pad*2+capH/2-10,16,16);}catch(e){}
    }
    return cv;
  }catch(e){try{console.error('[home] photo',e);}catch(_){}return null;}
}
function isIOS(){
  try{const n=root.navigator||{};return /iP(hone|ad|od)/.test(n.userAgent||'')||(/Macintosh/.test(n.userAgent||'')&&(n.maxTouchPoints|0)>1);}catch(e){return false;}
}
function dataUrlToBlob(url){
  const i=url.indexOf(',');const bin=atob(url.slice(i+1));
  const a=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)a[k]=bin.charCodeAt(k);
  return new Blob([a],{type:'image/png'});
}
// 同期で処理する（iOS のポップアップ許可・ダウンロードはタップの直後でないと止められるため）
function save(area){
  area=area==='garden'||area==='room'?area:curArea();
  let url='';
  try{const cv=render(area);if(!cv)return{ok:false,reason:'写真を作れませんでした'};url=cv.toDataURL('image/png');}
  catch(e){return{ok:false,reason:'写真を作れませんでした'};}
  if(!/^data:image\/png;base64,./.test(url))return{ok:false,reason:'写真を作れませんでした'};
  const name=filename(area);
  if(isIOS()){
    let w=null;
    try{w=root.open('','_blank');}catch(e){w=null;}
    if(!w)return{ok:false,reason:'新しいタブを開けませんでした（ポップアップを許可してください）'};
    try{
      const d=w.document;
      d.open();
      d.write('<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title></title>'+
        '<style>body{margin:0;background:#0b0820;color:#fff3d8;font-family:sans-serif;text-align:center;padding:14px}img{max-width:100%;image-rendering:pixelated;border-radius:6px}p{line-height:1.7;font-size:15px}</style></head><body>'+
        '<p>写真を<b>長押し</b>して「写真に追加」または「“ファイル”に保存」を選んでください。</p><img alt=""><p class="n"></p></body></html>');
      d.close();
      d.title=name;
      const im=d.querySelector('img');im.src=url;im.alt=name;
      d.querySelector('.n').textContent=name;
    }catch(e){try{w.close();}catch(_){}return{ok:false,reason:'新しいタブに写真を出せませんでした'};}
    return{ok:true,reason:'',mode:'tab',filename:name};
  }
  try{
    const blob=dataUrlToBlob(url);
    if(!blob||!blob.size)return{ok:false,reason:'写真を作れませんでした'};
    const href=URL.createObjectURL(blob);
    const a=document.createElement('a');
    if(!('download' in a)){URL.revokeObjectURL(href);return{ok:false,reason:'このブラウザでは保存できません'};}
    a.href=href;a.download=name;a.rel='noopener';a.style.display='none';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>{try{URL.revokeObjectURL(href);}catch(e){}},30000);
    return{ok:true,reason:'',mode:'download',filename:name,bytes:blob.size};
  }catch(e){return{ok:false,reason:'保存できませんでした'};}
}
const MEMO_TEXT={
  summer:'夏の光の中の、ふたりの家。',autumn:'少し涼しくなった風の中で。',winter:'吐く息が白い日の、あたたかい家。',spring:'やわらかい日ざしの、ふたりの家。',
};
function toMemory(area){
  area=area==='garden'||area==='room'?area:curArea();
  try{
    if(!HOME.memories||typeof HOME.memories.add!=='function'||typeof HOME.memories.snapshotOf!=='function')return{ok:false,reason:'思い出帳が開けません'};
    const d=dayNum();const id=`photo.${area}.d${d}`;
    if(HOME.memories.has&&HOME.memories.has(id))return{ok:false,reason:`今日の${AREA_NAME[area]}の写真は、もう貼ってあります`};
    const snap=HOME.memories.snapshotOf(area);if(!snap)return{ok:false,reason:'写真を作れませんでした'};
    const c0=cond();
    Object.assign(snap,{season:c0.season,weather:c0.weather,night:c0.night,look:lookNow()});
    const who=['dan','kid'];const S=HOME._screen;if(S&&S.open&&S.area===area&&S.visitor&&who.indexOf(S.visitor.who)<0)who.push(S.visitor.who);
    let sw='';try{sw=HOME.seasonLabel?HOME.seasonLabel():'';}catch(e){}
    const ok=HOME.memories.add({id,day:d,who,what:`写真：${AREA_NAME[area]}${sw?'（'+sw+'）':''}`,items:[],text:MEMO_TEXT[c0.season]||MEMO_TEXT.summer,snapshot:snap});
    if(!ok)return{ok:false,reason:'思い出帳に貼れませんでした'};
    const saved=HOME.save?HOME.save():false;
    return{ok:true,reason:'',saved,id};
  }catch(e){return{ok:false,reason:'思い出帳に貼れませんでした'};}
}

/* ── プレビュー（家の画面の上に重ねる） ── */
let ov=null;
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
function close(){
  const S=HOME._screen;
  if(ov){const back=ov._back;ov.remove();ov=null;try{if(back&&document.contains(back))back.focus({preventScroll:true});}catch(e){}}
  if(S&&S.overlay&&S.overlay.kind==='photo')S.overlay=null;
  if(S&&S.open&&S.refresh)S.refresh();
}
function open(){
  const S=HOME._screen;if(!S||!S.open||!S.el)return false;
  close();
  const area=S.area;
  const cv=render(area);
  const toast=t=>{try{HOME.ui.toast(t);}catch(e){}};
  if(!cv){toast('⚠ 写真を作れませんでした');return false;}
  const box=el('div','hm-photo');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','写真');
  const panel=el('div','hm-photo-box');
  panel.appendChild(el('div','hm-craft-title','📷 写真を撮る'));
  cv.className='hm-photo-cv';cv.setAttribute('role','img');cv.setAttribute('aria-label',caption(area));
  panel.appendChild(cv);
  panel.appendChild(el('div','hm-photo-name',filename(area)));
  const msg=el('div','hm-photo-msg');msg.setAttribute('aria-live','polite');
  const row=el('div','hm-row');
  const mk=(label,fn,cls)=>{const b=el('button','hm-btn'+(cls?' '+cls:''));b.type='button';b.appendChild(el('span','hm-btn-t',label));b.addEventListener('click',e=>{e.stopPropagation();fn(b);});return b;};
  const bSave=mk('端末に保存',()=>{
    const r=save(area);
    if(r.ok){msg.textContent=r.mode==='tab'?'新しいタブに写真を出しました。長押しで保存できます。':`「${r.filename}」を書き出しました。`;toast(r.mode==='tab'?'📷 新しいタブの写真を長押しして保存してください':'📷 写真を書き出しました');}
    else{msg.textContent=`保存できませんでした：${r.reason}`;toast(`⚠ 写真を保存できませんでした：${r.reason}`);}
  },'hm-primary');
  const bMemo=mk('思い出帳に貼る',b=>{
    const r=toMemory(area);
    if(r.ok){msg.textContent=r.saved?'思い出帳に貼りました。':'思い出帳に貼りました（セーブは失敗しました）。';toast('📖 思い出帳に貼りました');b.disabled=true;}
    else{msg.textContent=r.reason;toast(r.reason);}
  });
  const bClose=mk('閉じる',()=>close());
  row.appendChild(bSave);row.appendChild(bMemo);row.appendChild(bClose);
  panel.appendChild(msg);panel.appendChild(row);
  panel.appendChild(el('div','hm-photo-note','保存されるのは端末の中だけです（ゲームのセーブには画像を入れません）。'));
  box.appendChild(panel);
  box.addEventListener('click',e=>{e.stopPropagation();if(e.target===box)close();});
  box._back=document.activeElement;
  S.el.appendChild(box);ov=box;
  S.overlay={kind:'photo',key(e){if(e.key==='Escape'){e.preventDefault();close();}},close};
  setTimeout(()=>{try{bSave.focus({preventScroll:true});}catch(e){}},0);
  return true;
}
HOME.photo={filename,render,save,toMemory,open,close,isOpen:()=>!!ov,SCALE};
if(typeof HOME.on==='function')HOME.on('close',()=>{if(ov){ov.remove();ov=null;}});
})();
