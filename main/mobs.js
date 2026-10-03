// ═══════════════════════════════════════════════════════════
// 脇役（モブ）の顔グラ：assets/img/mob_<id>[_<表情>].svg
//   娘の CHILD_IMG と同じ画風のバストアップ（256×256・背景透過）
//   MOB_IMG[id][表情] → 画像パス
//   mobPortrait(id, face) → 画像パス（無い表情は近いもの → normal）
//   mobImage(id, face)    → 先読み済みの Image（canvas に描くとき用）
//   mobImgTag(id, face, bg) → <img> の HTML（DOM の会話窓用）
// ═══════════════════════════════════════════════════════════
const MOB_DIR='assets/img/';
const MOB_FACES={
  hancho:['normal','happy','worry','shout'],          // 班長・岩切（工場の班長）
  sensei:['normal','happy','worry'],                  // 保育園の先生
  chiyo: ['normal','happy','worry'],                  // お隣の千代さん
  gen:   ['normal','happy'],                          // 源さん（夜釣りの常連）
  minamo:['normal','smile','closed','sad','surprise'],// ミナモ（夢の海の少女）
  sakura:['normal','happy','sad'],                    // さくら（リスナー）
  joren: ['normal','happy'],                          // 深夜の常連（リスナー）
  midori:['normal','happy'],                          // ミドリ（コラボ相手の配信者）
  senpai:['normal','happy'],                          // 定年間近の先輩
  yodaka:['normal'],                                  // 夜鷹（アイコン：赤い目の鳥）
};
const MOB_IMG={};
Object.keys(MOB_FACES).forEach(id=>{
  const o={};
  MOB_FACES[id].forEach(f=>{o[f]=MOB_DIR+'mob_'+id+(f==='normal'?'':'_'+f)+'.svg';});
  MOB_IMG[id]=o;
});
// 台本でよく使う表情名 → 用意した表情名
const MOB_FACE_ALIAS={
  happy:['happy','smile'],smile:['smile','happy'],win:['happy','smile'],good:['happy','smile'],
  tired:['worry','sad'],sad:['sad','worry'],fear:['worry','surprise','sad'],worry:['worry','sad'],
  collapse:['shout','surprise','worry'],angry:['shout','worry'],shout:['shout','surprise'],
  surprise:['surprise','shout'],closed:['closed','smile','happy'],sleep:['closed','smile'],
};
function mobPortrait(id,face){
  const m=MOB_IMG[id];if(!m)return null;
  if(face&&m[face])return m[face];
  const al=MOB_FACE_ALIAS[face]||[];
  for(const k of al)if(m[k])return m[k];
  return m.normal;
}
const _mobImgCache={};
function mobImage(id,face){
  const src=mobPortrait(id,face);if(!src)return null;
  if(!_mobImgCache[src]){const im=new Image();im.decoding='async';im.src=src;_mobImgCache[src]=im;}
  return _mobImgCache[src];
}
function mobImgReady(im){return !!(im&&im.complete&&im.naturalWidth>0);}
function mobImgTag(id,face,bg,style){
  const src=mobPortrait(id,face);if(!src)return '';
  return `<img class="mob-por" src="${src}" alt="" draggable="false" style="display:block;width:100%;height:100%;object-fit:cover;${bg?'background:'+bg+';':''}${style||''}">`;
}

// ── 出来事ポップアップに、関わる人物の顔を添える（game.js の showEvPopup から呼ぶ） ──
const MOB_EV_MAP=[
  [/子どもが発熱/,'kid','fever'],[/参観日|冷蔵庫の絵/,'kid','happy'],
  [/改善提案/,'hancho','happy'],[/工場で緊急対応|設備更新/,'hancho','normal'],
  [/先輩/,'senpai','happy'],[/コラボ/,'midori','normal'],[/リスナーからの言葉/,'joren','happy'],
];
function mobEvPortrait(title){
  try{
    const box=document.querySelector('#ev-popup .ev-box');if(!box)return;
    let el=box.querySelector('.ev-mob');
    const hit=MOB_EV_MAP.find(r=>r[0].test(String(title||'')));
    let src=null;
    if(hit){
      if(hit[1]==='kid')src=(typeof CHILD_IMG!=='undefined'&&CHILD_IMG[hit[2]])||null;
      else src=mobPortrait(hit[1],hit[2]);
    }
    if(!src){if(el)el.style.display='none';return;}
    if(!el){
      el=document.createElement('div');el.className='ev-mob';
      el.style.cssText='float:right;width:76px;height:76px;margin:4px 0 6px 10px;border-radius:50%;overflow:hidden;border:2px solid #cfc6f5;'+
        'box-shadow:0 0 0 2px #120c34,0 0 14px rgba(138,82,212,.45);background:radial-gradient(circle at 50% 40%,#6a5a96,#2a2048 72%,#140e26);';
      el.innerHTML='<img alt="" draggable="false" style="display:block;width:118%;height:118%;max-width:none;margin:-4% 0 0 -9%;">';
      const desc=box.querySelector('.ev-desc');box.insertBefore(el,desc||box.firstChild);
    }
    el.querySelector('img').src=src;el.style.display='';
  }catch(e){}
}
