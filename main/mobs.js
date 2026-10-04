// ═══════════════════════════════════════════════════════════
// 脇役（モブ）の顔グラ：assets/img/mob_<id>[_<表情>].svg
//   娘の CHILD_IMG と同じ画風のバストアップ（256×256・背景透過）
//   MOB_IMG[id][表情] → 画像パス
//   mobPortrait(id, face) → 画像パス（無い表情は近いもの → normal）
//   mobImage(id, face)    → 先読み済みの Image（canvas に描くとき用）
//   mobImgTag(id, face, bg) → <img> の HTML（DOM の会話窓用）
//   生成画像（main/artpack.js の ARTPACK）に portrait.<id>.<表情> があれば、そちらを優先する
//   listenerAvatarSrc(name, tp) / listenerAvatarHTML(name, tp, opt) → 配信コメントのアイコン（下）
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
// 生成画像の差し替え（assets/gen/manifest.json の file）。無い・読めないときは null
function _genSrc(id){try{return (typeof window!=='undefined'&&window.ARTPACK&&window.ARTPACK.src(id))||null;}catch(e){return null;}}
function mobFaceKey(id,face){
  const m=MOB_IMG[id];if(!m)return null;
  if(face&&m[face])return face;
  const al=MOB_FACE_ALIAS[face]||[];
  for(const k of al)if(m[k])return k;
  return 'normal';
}
function mobPortrait(id,face){
  const m=MOB_IMG[id];if(!m)return null;
  const k=mobFaceKey(id,face);
  // 生成画像：頼まれた表情 → 近い表情 → normal の順（SVG より先に見る）
  if(face&&face!==k){const g=_genSrc('portrait.'+id+'.'+face);if(g)return g;}
  const g=_genSrc('portrait.'+id+'.'+k);if(g)return g;
  return m[k]||m.normal;
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

// ═══════════════════════════════════════════════════════════
// 配信コメントのアイコン（リスナーのアカウント画像）
//   物語（main/story.js）の会話窓で出るアイコンと同じ図柄を、32×32 の小さなベクター絵にしたもの。
//   夜空の旅人＝夜道とヘッドライト／ひとりぼっち＝丘の上の星／深夜の常連＝三日月とマグ／さくら＝桜の花／
//   夜鷹＝mob_yodaka.svg（赤い目の鳥）。名前の決まっていない人は、名前から決まる顔（髪型・色・小物）。
//   生成画像 avatar.<key>（assets/gen/manifest.json）があればそちらを使う（名前から決まる顔は除く）。
// ═══════════════════════════════════════════════════════════
const AV_O='#1b1226';
const LISTENER_KEY={
  '夜空の旅人':'tabibito','ひとりぼっち':'hitori','深夜の常連':'joren','さくら':'sakura','夜鷹':'yodaka',
  'アンチ':'anti','匿名':'anon','（非公開）':'anon','元常連':'exreg',
  '怪談好き':'kaidan','ホラー民':'kaidan','怖がり':'kaidan','深夜ラジオ好き':'radio','孤独な人':'radio',
  '音楽好き':'music','深夜の人':'music','ゲーマー':'gamer','深夜勢':'gamer',
  '受験生':'study','同志':'study','夜更かし':'study','社会人':'study',
  '設備屋':'factory','工場勤務':'factory','見習い':'factory','先輩':'factory',
};
// 生成画像の差し替え先の一覧（docs/gen-art.md・assets/gen/manifest.json と同じ）
const LISTENER_AV_KEYS=['tabibito','hitori','joren','sakura','fake','yodaka','gift','gem','anti','ghost','anon','exreg','kaidan','radio','music','gamer','study','factory'];
function _avHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function listenerKey(name,tp){
  const n=String(name==null?'':name).replace(/[​-‍﻿]/g,'').trim();
  if(n==='さくら'&&tp==='ghost')return 'fake';          // さくらのなりすまし
  if(n==='夜鷹')return 'yodaka';
  if(tp==='ghost'||tp==='anomaly')return 'ghost';
  if(/^ギフト💎/.test(n))return 'gem';
  if(/^ギフト/.test(n))return 'gift';
  if(LISTENER_KEY[n])return LISTENER_KEY[n];
  if(!n||/^[?？…・.\d\s]+$/.test(n)||/削除|存在しない/.test(n))return 'ghost';
  if(/^常連/.test(n))return 'joren2';
  return 'p'+(_avHash(n)%100000);
}
function _avSvg(bg1,bg2,body){
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="64" height="64">'+
    '<defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+bg1+'"/><stop offset="1" stop-color="'+bg2+'"/></linearGradient></defs>'+
    '<rect width="32" height="32" fill="url(#b)"/>'+body+'</svg>';
}
function _avStar(cx,cy,R,r){let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,k=i%2?r:R;d+=(i?'L':'M')+(cx+Math.cos(a)*k).toFixed(2)+' '+(cy+Math.sin(a)*k).toFixed(2);}return d+'Z';}
const _AV_ART={
  tabibito:()=>_avSvg('#22306a','#070a18',
    `<circle cx="24" cy="6" r="1.3" fill="#fff6c8"/><circle cx="8" cy="5" r=".8" fill="#fff" opacity=".7"/><circle cx="15" cy="9.5" r=".6" fill="#fff" opacity=".6"/><circle cx="28" cy="12" r=".5" fill="#fff" opacity=".5"/>`+
    `<path d="M0 18 Q8 15 16 17 Q24 15 32 17 V32 H0Z" fill="#0d1124"/>`+
    `<path d="M14.5 17.6 L17.5 17.6 L29 32 L3 32Z" fill="#2c2e3e" stroke="${AV_O}" stroke-width=".8"/>`+
    `<g fill="#e8d070"><rect x="15.6" y="19.5" width=".8" height="1.6"/><rect x="15.5" y="23" width="1" height="2.2"/><rect x="15.4" y="27.2" width="1.2" height="3.4"/></g>`+
    `<ellipse cx="10" cy="27.5" rx="5.5" ry="3" fill="#fff4c0" opacity=".22"/><ellipse cx="22" cy="27.5" rx="5.5" ry="3" fill="#fff4c0" opacity=".22"/>`+
    `<circle cx="10" cy="27.5" r="1.9" fill="#fffbe0" stroke="${AV_O}" stroke-width=".6"/><circle cx="22" cy="27.5" r="1.9" fill="#fffbe0" stroke="${AV_O}" stroke-width=".6"/>`),
  hitori:()=>_avSvg('#2c2460','#07050f',
    `<circle cx="16" cy="11" r="9" fill="#fff8d0" opacity=".12"/><circle cx="16" cy="11" r="6" fill="#fff8d0" opacity=".12"/>`+
    `<path d="${_avStar(16,11.2,6,2.6)}" fill="#fff2b0" stroke="${AV_O}" stroke-width=".8" stroke-linejoin="round"/>`+
    `<path d="M14.6 9.2 L15.6 8.4" stroke="#fff" stroke-width=".7" stroke-linecap="round"/>`+
    `<path d="M0 25 Q16 19 32 25 V32 H0Z" fill="#140f2c" stroke="${AV_O}" stroke-width=".8"/>`+
    `<circle cx="16" cy="19.6" r="1.5" fill="#3c3672"/><path d="M14.7 21 h2.6 l.4 2.4 h-3.4Z" fill="#3c3672"/>`),
  joren:()=>_avSvg('#1a3848','#040a10',
    `<circle cx="22.5" cy="8.5" r="5.6" fill="#f0e6c0"/><circle cx="25" cy="7" r="4.7" fill="#1b3646"/>`+
    `<circle cx="5" cy="5" r=".6" fill="#fff" opacity=".6"/><circle cx="11" cy="9" r=".5" fill="#fff" opacity=".5"/>`+
    `<path d="M11 14.6 q-1.6 -2 0 -4 M15 14.6 q-1.6 -2 0 -4" stroke="#cfd8e0" stroke-width=".9" fill="none" opacity=".6" stroke-linecap="round"/>`+
    `<path d="M19 19.4 a3.4 3.4 0 0 1 0 6.8" stroke="#cfd8e0" stroke-width="2.2" fill="none"/><path d="M19 19.4 a3.4 3.4 0 0 1 0 6.8" stroke="${AV_O}" stroke-width=".5" fill="none" opacity=".6"/>`+
    `<rect x="6.5" y="16.5" width="13" height="12" rx="2.4" fill="#cfd8e0" stroke="${AV_O}" stroke-width=".9"/>`+
    `<rect x="8" y="18.6" width="1.4" height="7.5" rx=".7" fill="#fff" opacity=".7"/><rect x="15.4" y="17.6" width="3" height="10" fill="#9aa8b8" opacity=".55"/>`+
    `<ellipse cx="13" cy="17.2" rx="5.6" ry="1.1" fill="#5a3a2a"/>`),
  sakura:()=>_avSvg('#6a2852','#16060f',
    [0,72,144,216,288].map(a=>`<ellipse cx="16" cy="9.6" rx="4.3" ry="6.2" fill="#f6b6c8" stroke="${AV_O}" stroke-width=".8" transform="rotate(${a} 16 16.5)"/>`).join('')+
    [0,72,144,216,288].map(a=>`<ellipse cx="16" cy="11" rx="1.7" ry="3" fill="#ffd8e4" transform="rotate(${a} 16 16.5)"/>`).join('')+
    `<circle cx="16" cy="16.5" r="2.8" fill="#e07a98" stroke="${AV_O}" stroke-width=".7"/>`+
    [0,72,144,216,288].map(a=>`<circle cx="16" cy="13.2" r=".7" fill="#ffe2a8" transform="rotate(${a} 16 16.5)"/>`).join('')),
  fake:()=>_avSvg('#2a1820','#050204',
    `<g transform="translate(1.2 0)" opacity=".4">`+[0,72,216,288].map(a=>`<ellipse cx="16" cy="9.6" rx="4.3" ry="6.2" fill="#ff2050" transform="rotate(${a} 16 16.5)"/>`).join('')+`</g>`+
    [0,72,216,288].map(a=>`<ellipse cx="16" cy="9.6" rx="4.3" ry="6.2" fill="#b8a0a8" stroke="${AV_O}" stroke-width=".8" transform="rotate(${a} 16 16.5)"/>`).join('')+
    `<circle cx="16" cy="16.5" r="2.8" fill="#6a4a52" stroke="${AV_O}" stroke-width=".7"/>`+
    `<g fill="#fff" opacity=".22"><rect x="2" y="7" width="28" height=".6"/><rect x="4" y="19.5" width="25" height=".5"/><rect x="1" y="24" width="14" height=".5"/></g>`),
  gift:()=>_avSvg('#6a4c14','#1a1004',
    `<circle cx="6" cy="7" r=".9" fill="#fff6c0"/><circle cx="26.5" cy="9" r=".7" fill="#fff6c0"/><path d="M26 4 v3 M24.5 5.5 h3" stroke="#fff6c0" stroke-width=".7"/>`+
    `<rect x="8" y="15" width="16" height="12" rx="1" fill="#e8b830" stroke="${AV_O}" stroke-width=".9"/>`+
    `<rect x="6.8" y="11.5" width="18.4" height="4.4" rx="1" fill="#ffd25a" stroke="${AV_O}" stroke-width=".9"/>`+
    `<rect x="14.6" y="11.5" width="2.8" height="15.5" fill="#e83055" stroke="${AV_O}" stroke-width=".6"/>`+
    `<ellipse cx="12.6" cy="9.8" rx="3.2" ry="2" fill="#ff5a7a" stroke="${AV_O}" stroke-width=".7" transform="rotate(-18 12.6 9.8)"/><ellipse cx="19.4" cy="9.8" rx="3.2" ry="2" fill="#ff5a7a" stroke="${AV_O}" stroke-width=".7" transform="rotate(18 19.4 9.8)"/>`+
    `<rect x="9.5" y="16.5" width="4" height="1" fill="#fff3c0" opacity=".7"/>`),
  gem:()=>_avSvg('#0c4458','#02121a',
    `<circle cx="16" cy="15" r="10" fill="#6fe8ff" opacity=".12"/>`+
    `<path d="M9 12 L13 7.5 H19 L23 12 L16 25.5Z" fill="#6fe8ff" stroke="${AV_O}" stroke-width=".9" stroke-linejoin="round"/>`+
    `<path d="M9 12 H23 M13 7.5 L14.4 12 L16 25.5 L17.6 12 L19 7.5" stroke="#1f7a92" stroke-width=".6" fill="none"/>`+
    `<path d="M10.6 11.6 L13.2 8.4" stroke="#fff" stroke-width=".9" stroke-linecap="round"/>`+
    `<path d="M25 6 v3 M23.5 7.5 h3 M6 20 v2 M5 21 h2" stroke="#d8fbff" stroke-width=".7"/>`),
  anti:()=>_avSvg('#560a18','#120206',
    `<rect x="4" y="6" width="24" height="16" rx="5" fill="#b81d3c" stroke="${AV_O}" stroke-width="1"/>`+
    `<path d="M11 21.5 L9.5 27 L16 21.5Z" fill="#b81d3c" stroke="${AV_O}" stroke-width="1" stroke-linejoin="round"/><rect x="10" y="20.6" width="5.6" height="1.6" fill="#b81d3c"/>`+
    `<rect x="6" y="7.4" width="20" height="2" rx="1" fill="#ff6b81" opacity=".55"/>`+
    `<path d="M8.5 11 L13.6 13.2 M23.5 11 L18.4 13.2" stroke="${AV_O}" stroke-width="1.5" stroke-linecap="round"/>`+
    `<rect x="10.2" y="13.4" width="3" height="2.4" fill="#fff"/><rect x="18.8" y="13.4" width="3" height="2.4" fill="#fff"/>`+
    `<rect x="11.6" y="14" width="1.4" height="1.6" fill="${AV_O}"/><rect x="19" y="14" width="1.4" height="1.6" fill="${AV_O}"/>`+
    `<path d="M11.5 19.4 L13.2 18 L14.8 19.4 L16.4 18 L18 19.4 L19.6 18 L20.6 19" stroke="${AV_O}" stroke-width="1.1" fill="none" stroke-linejoin="round"/>`),
  ghost:()=>_avSvg('#160c16','#000',
    `<g fill="#fff" opacity=".1"><rect y="6" width="32" height=".6"/><rect y="13.5" width="32" height="1"/><rect y="22" width="32" height=".6"/><rect y="27" width="32" height=".5"/></g>`+
    `<rect x="3" y="10" width="7" height="1" fill="#e83055" opacity=".25"/><rect x="21" y="24" width="8" height=".8" fill="#5aa0c8" opacity=".25"/>`+
    `<ellipse cx="12" cy="15" rx="2" ry="1" fill="#e83055" opacity=".85"/><ellipse cx="20" cy="15" rx="2" ry="1" fill="#e83055" opacity=".85"/>`+
    `<ellipse cx="12" cy="15" rx="3.6" ry="2" fill="#e83055" opacity=".18"/><ellipse cx="20" cy="15" rx="3.6" ry="2" fill="#e83055" opacity=".18"/>`+
    `<g fill="#6a5a6a"><rect x="12.5" y="23" width="1.3" height="1.3"/><rect x="15.4" y="23" width="1.3" height="1.3"/><rect x="18.3" y="23" width="1.3" height="1.3"/></g>`),
  anon:()=>_avSvg('#3c3c4e','#16161e',
    `<circle cx="16" cy="13" r="5.4" fill="#8e8ea6" stroke="${AV_O}" stroke-width=".9"/>`+
    `<path d="M5.5 32 C6.5 23.5 11 21 16 21 C21 21 25.5 23.5 26.5 32Z" fill="#8e8ea6" stroke="${AV_O}" stroke-width=".9"/>`+
    `<circle cx="14.2" cy="11.2" r="1.4" fill="#fff" opacity=".25"/>`),
  exreg:()=>_avSvg('#14444a','#03100f',
    `<circle cx="25" cy="7" r="3.4" fill="#ffe2a0" opacity=".9"/><circle cx="25" cy="7" r="6" fill="#ffe2a0" opacity=".14"/>`+
    `<rect x="5.5" y="12" width="21" height="14" rx="1.2" fill="#e8f4f0" stroke="${AV_O}" stroke-width=".9"/>`+
    `<path d="M5.8 12.4 L16 20 L26.2 12.4" stroke="${AV_O}" stroke-width=".9" fill="#cfe4de" stroke-linejoin="round"/>`+
    `<path d="M16 17.2 c-1.3-1.6-3.4-.4-2 1.3 l2 1.8 l2-1.8 c1.4-1.7-.7-2.9-2-1.3Z" fill="#ff7a9a"/>`),
  kaidan:()=>_avSvg('#2a1640','#07040e',
    `<path d="M9 27 L9 14 C9 8.5 12 6 16 6 C20 6 23 8.5 23 14 L23 27 L20.5 25 L18.2 27.4 L16 25 L13.8 27.4 L11.5 25Z" fill="#e8ecff" stroke="${AV_O}" stroke-width=".9" stroke-linejoin="round"/>`+
    `<path d="M20 9 C21.5 10.4 22 12 22 14 L22 24" stroke="#b8c0e8" stroke-width="1.4" fill="none" opacity=".7"/>`+
    `<ellipse cx="13.4" cy="14.6" rx="1.2" ry="1.8" fill="${AV_O}"/><ellipse cx="18.6" cy="14.6" rx="1.2" ry="1.8" fill="${AV_O}"/>`+
    `<ellipse cx="16" cy="19.2" rx="1.2" ry="1.5" fill="${AV_O}"/><circle cx="11.4" cy="17.2" r="1" fill="#ff9ab0" opacity=".5"/><circle cx="20.6" cy="17.2" r="1" fill="#ff9ab0" opacity=".5"/>`),
  radio:()=>_avSvg('#3a2610','#0e0804',
    `<path d="M9 13 L21 6" stroke="#c8ccd6" stroke-width="1.1"/><circle cx="21" cy="6" r="1" fill="#e83055"/>`+
    `<rect x="5" y="13" width="22" height="13" rx="2.4" fill="#c87a3a" stroke="${AV_O}" stroke-width=".9"/>`+
    `<circle cx="11.5" cy="19.5" r="4" fill="#3a2a20" stroke="${AV_O}" stroke-width=".7"/><g fill="#7a5a40"><circle cx="10.2" cy="18.2" r=".6"/><circle cx="12.8" cy="18.2" r=".6"/><circle cx="10.2" cy="20.8" r=".6"/><circle cx="12.8" cy="20.8" r=".6"/><circle cx="11.5" cy="19.5" r=".6"/></g>`+
    `<rect x="17.5" y="16" width="7" height="3.4" rx=".6" fill="#ffe2a0" stroke="${AV_O}" stroke-width=".6"/><rect x="20.6" y="16.2" width=".7" height="3" fill="#e83055"/>`+
    `<circle cx="19.5" cy="22.6" r="1.3" fill="#e8d8b8" stroke="${AV_O}" stroke-width=".5"/><circle cx="23" cy="22.6" r="1.3" fill="#e8d8b8" stroke="${AV_O}" stroke-width=".5"/>`),
  music:()=>_avSvg('#3a1a5e','#0a0416',
    `<circle cx="16" cy="16" r="11" fill="#ff8cc8" opacity=".1"/>`+
    `<path d="M12.5 23 V9.5 L23 7 V20.5" stroke="${AV_O}" stroke-width="2.4" fill="none" stroke-linejoin="round"/><path d="M12.5 23 V9.5 L23 7 V20.5" stroke="#ffb0e0" stroke-width="1.3" fill="none" stroke-linejoin="round"/>`+
    `<path d="M12.5 11.8 L23 9.3" stroke="#ffb0e0" stroke-width="1.6"/>`+
    `<ellipse cx="10.4" cy="23.4" rx="2.7" ry="2.1" fill="#ffb0e0" stroke="${AV_O}" stroke-width=".9" transform="rotate(-20 10.4 23.4)"/><ellipse cx="20.9" cy="20.9" rx="2.7" ry="2.1" fill="#ffb0e0" stroke="${AV_O}" stroke-width=".9" transform="rotate(-20 20.9 20.9)"/>`+
    `<path d="M5 8 v3 M3.5 9.5 h3" stroke="#fff" stroke-width=".7" opacity=".7"/>`),
  gamer:()=>_avSvg('#14284a','#030812',
    `<path d="M7 12 H25 C28.5 12 30 19 28.5 23.5 C27.5 26 24.8 26 23.5 24 L21.5 21 H10.5 L8.5 24 C7.2 26 4.5 26 3.5 23.5 C2 19 3.5 12 7 12Z" fill="#5a6a8e" stroke="${AV_O}" stroke-width=".9" stroke-linejoin="round"/>`+
    `<path d="M7.2 15.5 v4 M5.2 17.5 h4" stroke="${AV_O}" stroke-width="1.6"/>`+
    `<circle cx="22.4" cy="15.6" r="1.2" fill="#ff5a7a"/><circle cx="25" cy="18" r="1.2" fill="#6fe0ff"/><circle cx="19.8" cy="18" r="1.2" fill="#ffd25a"/><circle cx="22.4" cy="20.4" r="1.2" fill="#44ee88"/>`+
    `<rect x="13.2" y="15.4" width="2" height="1" rx=".5" fill="#2a3450"/><rect x="16.8" y="15.4" width="2" height="1" rx=".5" fill="#2a3450"/><rect x="8" y="13" width="16" height="1" fill="#fff" opacity=".2"/>`),
  study:()=>_avSvg('#1c3424','#040c06',
    `<rect x="5" y="9" width="15" height="19" rx="1" fill="#f4efe6" stroke="${AV_O}" stroke-width=".9"/>`+
    `<g stroke="#9ab0c8" stroke-width=".6"><path d="M8 13.5 h9 M8 16.5 h9 M8 19.5 h9 M8 22.5 h6"/></g><path d="M7 9 v19" stroke="#e86a7a" stroke-width=".7"/>`+
    `<g transform="rotate(35 22 16)"><rect x="20.4" y="4" width="3.4" height="17" fill="#ffd25a" stroke="${AV_O}" stroke-width=".8"/><path d="M20.4 21 L22.1 25 L23.8 21Z" fill="#f2cf98" stroke="${AV_O}" stroke-width=".8" stroke-linejoin="round"/><path d="M21.6 23.6 L22.1 25 L22.6 23.6Z" fill="${AV_O}"/><rect x="20.4" y="4" width="3.4" height="2.2" fill="#ff9ab0" stroke="${AV_O}" stroke-width=".8"/></g>`),
  factory:()=>_avSvg('#1e2836','#05080e',
    `<path d="M6.5 20 C6.5 10 11 7 16 7 C21 7 25.5 10 25.5 20Z" fill="#f2c230" stroke="${AV_O}" stroke-width=".9"/>`+
    `<path d="M16 7 V20" stroke="#d9a820" stroke-width="2"/><path d="M10 11 C11 9.5 12.5 8.7 14 8.4" stroke="#fff6c0" stroke-width="1" fill="none" stroke-linecap="round"/>`+
    `<rect x="4" y="19.5" width="24" height="3.4" rx="1.6" fill="#d9a820" stroke="${AV_O}" stroke-width=".9"/>`+
    `<circle cx="11" cy="14.6" r="2.6" fill="#fff" stroke="${AV_O}" stroke-width=".5"/><path d="M11 12.8 v3.6 M9.2 14.6 h3.6" stroke="#2c9a4a" stroke-width="1.2"/>`+
    `<g transform="rotate(-40 22 27)"><rect x="17" y="26.2" width="10" height="1.8" rx=".6" fill="#a8b0c0" stroke="${AV_O}" stroke-width=".5"/></g>`),
  joren2:()=>_avSvg('#203a48','#060e14',
    `<rect x="7.5" y="13" width="13" height="13" rx="2.4" fill="#e8c8a8" stroke="${AV_O}" stroke-width=".9"/>`+
    `<path d="M20.5 16 a3.4 3.4 0 0 1 0 6.8" stroke="#e8c8a8" stroke-width="2.2" fill="none"/>`+
    `<ellipse cx="14" cy="13.8" rx="5.6" ry="1.1" fill="#7a4a2a"/><path d="M12 10.6 q-1.4 -1.8 0 -3.6 M16 10.6 q-1.4 -1.8 0 -3.6" stroke="#e8f0f4" stroke-width=".9" fill="none" opacity=".55" stroke-linecap="round"/>`+
    `<rect x="9" y="15.5" width="1.4" height="8" rx=".7" fill="#fff" opacity=".6"/>`),
};
// 名前の決まっていない人の顔（名前のハッシュから髪型・色・小物を選ぶ。毎回同じ顔になる）
const _AV_BG=[['#2a3a6a','#0a0e1e'],['#4a2a5a','#120a18'],['#1e4a4a','#06120f'],['#5a3a1e','#140c06'],['#3a2a6a','#0a0718'],['#5a2a3a','#14060c'],['#24405a','#060e16'],['#3a4a2a','#0c1006']];
const _AV_HAIR=['#2a2230','#5a3a28','#8a5a34','#d8b060','#c8c8d8','#e88aa8','#4a6ab8','#3a8a6a','#7a2a3a','#1e3050'];
const _AV_SKIN=['#f6dccb','#efc7aa','#dcab86'];
const _AV_CLOTH=['#5a6a8e','#8a4a6a','#3a7a6a','#a87a3a','#6a5aa8','#3a4a5e','#b85a5a','#e8e0d0'];
function _avPerson(key){
  let h=_avHash(key)||1;const r=n=>{h=Math.imul(h^(h>>>15),2246822507)>>>0;h^=h>>>13;return (h>>>0)%n;};
  const bg=_AV_BG[r(_AV_BG.length)],hair=_AV_HAIR[r(_AV_HAIR.length)],skin=_AV_SKIN[r(3)],cloth=_AV_CLOTH[r(_AV_CLOTH.length)];
  const style=r(5),eyes=r(3),acc=r(6),hat=_AV_CLOTH[r(_AV_CLOTH.length)];
  let back='',front='';
  if(style===1)back=`<path d="M7.5 15 C7 7.5 11 5.5 16 5.5 C21 5.5 25 7.5 24.5 15 L24.5 22 L20.5 22 L20.5 14 L11.5 14 L11.5 22 L7.5 22Z" fill="${hair}" stroke="${AV_O}" stroke-width=".9"/>`;
  if(style===3)back=`<path d="M7 14 C7 4.5 25 4.5 25 14 L26 27 L6 27Z" fill="${hair}" stroke="${AV_O}" stroke-width=".9"/>`;
  if(style===4)back=`<circle cx="16" cy="15" r="9.6" fill="${hat}" stroke="${AV_O}" stroke-width=".9"/>`;
  if(style===0)front=`<path d="M8.6 15 C8 8 12 6 16 6 C20 6 24 8 23.4 15 C22 11.5 19 10.5 16 11 C13 10.5 10 11.5 8.6 15Z" fill="${hair}" stroke="${AV_O}" stroke-width=".9"/>`;
  else if(style===1||style===3)front=`<path d="M8.8 14 C8.8 8 12 6.5 16 6.5 C20 6.5 23.2 8 23.2 14 C21.5 11.6 18.5 10.6 16 11.8 C13.5 10.6 10.5 11.6 8.8 14Z" fill="${hair}" stroke="${AV_O}" stroke-width=".9"/>`;
  else if(style===2)front=`<path d="M8.5 14.5 L7.6 9 L10.4 10 L10.8 5.8 L13.6 8.4 L16 4.8 L18.4 8.4 L21.2 5.8 L21.6 10 L24.4 9 L23.5 14.5 C21 11.4 11 11.4 8.5 14.5Z" fill="${hair}" stroke="${AV_O}" stroke-width=".9" stroke-linejoin="round"/>`;
  else front=`<path d="M9.4 13.6 C10 9.5 13 8.6 16 8.6 C19 8.6 22 9.5 22.6 13.6 C20.5 12 18 11.6 16 12.4 C14 11.6 11.5 12 9.4 13.6Z" fill="${hair}" stroke="${AV_O}" stroke-width=".8"/>`;
  if(style===0&&acc===5)front+=`<path d="M7.6 13 C7.6 6 24.4 6 24.4 13Z" fill="${hat}" stroke="${AV_O}" stroke-width=".9"/><rect x="6.8" y="11.6" width="18.4" height="2.4" rx="1" fill="${hat}" stroke="${AV_O}" stroke-width=".8"/><circle cx="16" cy="6" r="1.5" fill="#fff" stroke="${AV_O}" stroke-width=".6"/>`;
  let face='';
  if(eyes===0)face=`<rect x="12.2" y="15.4" width="1.6" height="2.2" rx=".4" fill="${AV_O}"/><rect x="18.2" y="15.4" width="1.6" height="2.2" rx=".4" fill="${AV_O}"/><rect x="12.4" y="15.5" width=".6" height=".6" fill="#fff"/><rect x="18.4" y="15.5" width=".6" height=".6" fill="#fff"/>`;
  else if(eyes===1)face=`<path d="M11.8 16.8 q1.2 -1.4 2.4 0 M17.8 16.8 q1.2 -1.4 2.4 0" stroke="${AV_O}" stroke-width=".9" fill="none" stroke-linecap="round"/>`;
  else face=`<path d="M11.8 16.4 h2.4 M17.8 16.4 h2.4" stroke="${AV_O}" stroke-width=".9" stroke-linecap="round"/>`;
  face+=`<path d="M14.8 19.6 q1.2 .8 2.4 0" stroke="#a05a4a" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
  face+=`<ellipse cx="11.6" cy="18.4" rx="1.2" ry=".6" fill="#ff8a8a" opacity=".45"/><ellipse cx="20.4" cy="18.4" rx="1.2" ry=".6" fill="#ff8a8a" opacity=".45"/>`;
  let extra='';
  if(acc===1)extra=`<circle cx="13" cy="16.4" r="2.3" fill="#fff" fill-opacity=".12" stroke="#3a3a4a" stroke-width=".8"/><circle cx="19" cy="16.4" r="2.3" fill="#fff" fill-opacity=".12" stroke="#3a3a4a" stroke-width=".8"/><path d="M15.3 16.2 h1.4" stroke="#3a3a4a" stroke-width=".8"/>`;
  else if(acc===2&&style!==4)extra=`<path d="M7.6 15.5 C7.6 4.8 24.4 4.8 24.4 15.5" stroke="${AV_O}" stroke-width="2.6" fill="none"/><path d="M7.6 15.5 C7.6 4.8 24.4 4.8 24.4 15.5" stroke="#6fe0d0" stroke-width="1.4" fill="none"/><rect x="5.8" y="13.4" width="3.2" height="5.2" rx="1.2" fill="#6fe0d0" stroke="${AV_O}" stroke-width=".8"/><rect x="23" y="13.4" width="3.2" height="5.2" rx="1.2" fill="#6fe0d0" stroke="${AV_O}" stroke-width=".8"/>`;
  else if(acc===3)extra=`<path d="M9.6 17.6 L11.4 18.6 M22.4 17.6 L20.6 18.6" stroke="#cfd8e4" stroke-width=".6"/><path d="M11.2 18.2 Q16 17.2 20.8 18.2 L20.4 21.2 Q16 23.4 11.6 21.2Z" fill="#cfe0ee" stroke="${AV_O}" stroke-width=".7"/><path d="M12.4 19.6 h7.2 M12.6 20.8 h6.8" stroke="#9ab0c4" stroke-width=".4"/>`;
  return _avSvg(bg[0],bg[1],
    back+
    `<path d="M5 32 C6 25.5 11 23.4 16 23.4 C21 23.4 26 25.5 27 32Z" fill="${cloth}" stroke="${AV_O}" stroke-width=".9"/>`+
    `<rect x="14.2" y="20.5" width="3.6" height="3.6" fill="${skin}"/>`+
    `<ellipse cx="16" cy="15.4" rx="6.8" ry="7" fill="${skin}" stroke="${AV_O}" stroke-width=".9"/>`+
    front+face+extra);
}
const _avCache={};
function _avData(svg){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
function listenerAvatarSrc(name,tp){
  const key=listenerKey(name,tp);
  if(key.charAt(0)!=='p'||_AV_ART[key]){const g=_genSrc('avatar.'+key);if(g)return g;}
  if(key==='yodaka')return mobPortrait('yodaka');
  if(_avCache[key])return _avCache[key];
  const fn=_AV_ART[key];
  return (_avCache[key]=_avData(fn?fn():_avPerson(key)));
}
let _avCssDone=false;
function _avCss(){
  if(_avCssDone||typeof document==='undefined')return;_avCssDone=true;
  try{
    const st=document.createElement('style');st.id='mob-av-style';
    st.textContent='.ci-av{position:relative;flex:0 0 auto;width:22px;height:22px;margin-top:-1px;border-radius:5px;overflow:visible;box-shadow:0 0 0 1px rgba(201,160,255,.35),0 1px 3px rgba(0,0,0,.6);}'+
      '.ci-av>img{display:block;width:100%;height:100%;border-radius:5px;image-rendering:auto;}'+
      '.ci-av .ci-mod{position:absolute;right:-4px;bottom:-3px;width:11px;height:12px;background:no-repeat center/contain url("'+_avData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 13"><path d="M6 .6 L11.2 2.4 V6.4 C11.2 9.4 8.8 11.4 6 12.4 C3.2 11.4 .8 9.4 .8 6.4 V2.4Z" fill="#2c9adf" stroke="#1b1226" stroke-width="1"/><path d="M3.6 6.4 L5.4 8.2 L8.6 4.6" stroke="#fff" stroke-width="1.3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>')+'");}'+
      '.ci.ghost .ci-av,.ci.anomaly .ci-av{box-shadow:0 0 0 1px rgba(232,48,85,.45),0 0 6px rgba(232,48,85,.25);}'+
      '.ci.super .ci-av{box-shadow:0 0 0 1px rgba(232,184,48,.75),0 0 6px rgba(232,184,48,.35);}'+
      '.ci.rare .ci-av{box-shadow:0 0 0 1px rgba(0,232,200,.7),0 0 6px rgba(0,232,200,.3);}'+
      '.ci.ghost .ci-av>img{opacity:.75;filter:saturate(.6);}'+
      '.hr-msg .ci-av{display:inline-block;width:16px;height:16px;vertical-align:-3px;margin-right:6px;border-radius:4px;}';
    document.head.appendChild(st);
  }catch(e){}
}
// opt: {mod:true}（モデレーターの盾）, {size:px}, {style:'…'}（span に足す CSS）
function listenerAvatarHTML(name,tp,opt){
  _avCss();
  const src=listenerAvatarSrc(name,tp);if(!src)return '';
  const o=opt||{};const sz=(o.size?`width:${o.size}px;height:${o.size}px;`:'')+(o.style||'');
  return `<span class="ci-av" aria-hidden="true"${sz?` style="${sz}"`:''}><img src="${src}" alt="" draggable="false">${o.mod?'<i class="ci-mod"></i>':''}</span>`;
}
