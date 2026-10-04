// ═══════════════════════════════════════════════════════════
// クリア後の暮らしモード（HOME.lifeMode）  設計：docs/home-story-design.md「クリア後の暮らしモード」
//   - 良い結末・ふつうの結末の最終画面に「🏡 暮らしを続ける」（#life-btn。表示判定は game.js が setEnding(type) で聞く）
//   - 状態 gs.homeData.life = { active, day, startedFrom, baseDay }
//   - 暮らしモード中は本編の画面を隠し、家・庭の画面を開いたまま。「☀ 一日を過ごす」で life.day++
//     （家の仕組みは gs.day を「今日」として使うので gs.day も1つ進める。借金・精神・疲労などは動かさない）
//   - 本編の nextDay / checkGameOver / triggerEnding / 共有パネル / ENDLESS は暮らしモード中は何もしない
//   - 「タイトルへ」：保存してページを読み直す（本編の状態をメモリに残さない）
//   - タイトルの「つづきから」：暮らしモード中のセーブなら家・庭の画面から再開
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const SIM=(()=>{try{return !!(root.frameElement&&/simulator/.test(root.parent.location.pathname));}catch(e){return false;}})();
const HAS_DOM=typeof document!=='undefined'&&!!document.getElementById;

const GOOD=['rebirth','king','engineer','father','debtfree','normal'];
const MAT_NAME={wood:'木材',cloth:'布',metal:'金具',sea:'海のかけら'};
const DAY_HOUR=10;

function G(){try{return typeof gs!=='undefined'?gs:null;}catch(e){return null;}}
function hd(){
  try{if(typeof HOME.ensure==='function')return HOME.ensure();}catch(e){}
  const g=G();return g&&g.homeData&&typeof g.homeData==='object'?g.homeData:null;
}
function lifeOf(h){return h&&h.life&&typeof h.life==='object'?h.life:null;}
function isActive(){const g=G();const l=g&&g.homeData&&lifeOf(g.homeData);return !!(l&&l.active===true);}
function call(fn,...a){try{return typeof fn==='function'?fn(...a):undefined;}catch(e){try{console.warn('[lifemode]',e);}catch(_){}return undefined;}}
function $(id){return HAS_DOM?document.getElementById(id):null;}

// ── 純粋な判定 ──
// 結末の種類 → 「暮らしを続ける」を出すか（悪い結末・未知の種類は出さない）
function offersLife(type){return GOOD.indexOf(type)>=0;}
// 保存データ（saveGame の形）が暮らしモード中か
function saveIsLife(saveData){
  try{const l=saveData&&saveData.gs&&saveData.gs.homeData&&saveData.gs.homeData.life;return !!(l&&l.active===true);}catch(e){return false;}
}
// その日の素材（少しだけ）：基本は木材と布を交互、5日ごとに海のかけら
function dailyMaterialFor(lifeDay){
  if(lifeDay>0&&lifeDay%5===0)return {id:'sea',n:1};
  return lifeDay%2===1?{id:'wood',n:1}:{id:'cloth',n:1};
}

let pendingEnding=null;
// game.js の triggerEnding から：表示する結末を覚え、ボタンを出すかを返す
function setEnding(type){pendingEnding=type||null;return !SIM&&offersLife(type);}

// ── 状態 ──
function begin(type){
  const g=G(),h=hd();if(!g||!h)return null;
  h.life={active:true,day:0,startedFrom:type,baseDay:Number.isFinite(+g.day)?+g.day:30};
  setDaytime();
  return h.life;
}
function setDaytime(){
  const g=G();if(!g)return;
  g.hour=DAY_HOUR;g.min=0;
  g._dayDone=true;   // advTime（クラフト等）から本編の nextDay が走らないように
}
// 一日を過ごす（UIなし）。本編のパラメータは触らない
function advance(){
  if(!isActive())return null;
  const g=G(),h=hd(),l=lifeOf(h);if(!g||!l)return null;
  l.day=(l.day|0)+1;
  g.day=(Number.isFinite(+g.day)?+g.day:30)+1;
  setDaytime();
  call(HOME.tickDay);
  if(HOME.events)call(HOME.events.tick);
  if(HOME.life_events)call(HOME.life_events.tick);
  const mat=dailyMaterialFor(l.day);
  let got=false;
  if(typeof HOME.addMaterial==='function'){try{HOME.addMaterial(mat.id,mat.n);got=true;}catch(e){got=false;}}
  const saved=save();
  return {day:l.day,mat:got?mat:null,saved};
}
function save(){
  try{if(typeof HOME.save==='function')return !!HOME.save();}catch(e){}
  try{if(typeof saveGame==='function')return saveGame(true)!==false;}catch(e){}
  return false;
}

// ── 本編の関数を暮らしモード中だけ止める（他のラップより外側に付けるため、読み込み完了後に付ける） ──
let installed=false;
function wrap(name,make){
  const prev=root[name];
  if(typeof prev!=='function')return null;
  root[name]=make(prev);
  return prev;
}
function install(){
  if(installed)return;installed=true;
  ['nextDay','checkGameOver','triggerEnding','showSharePanel','startEndlessMode'].forEach(n=>{
    wrap(n,prev=>function(){if(isActive())return undefined;return prev.apply(this,arguments);});
  });
  // つづきから：暮らしモードのセーブなら家・庭から
  wrap('loadGame',prev=>function(){
    if(!SIM&&resumeFromSave())return true;
    return prev.apply(this,arguments);
  });
  // はじめから：前の家・暮らしをメモリに残さない
  wrap('startStory',prev=>function(){
    try{const g=G();if(g&&'homeData' in g)delete g.homeData;}catch(e){}
    return prev.apply(this,arguments);
  });
  if(typeof HOME.on==='function'){
    HOME.on('open',()=>{if(isActive())setTimeout(decorate,0);});
    HOME.on('close',()=>{if(isActive()&&!SIM)toTitle();});
  }
  updateContinueLabel();
}

/* ══════════════ 画面 ══════════════ */
const UI={bar:null,iv:0,busy:false,leaving:false};
function injectStyle(){
  if(!HAS_DOM||$('hm-life-style'))return;
  const st=document.createElement('style');st.id='hm-life-style';
  st.textContent=`
body.life-mode #ending-sc,body.life-mode #share-panel{display:none!important;}
.hm.hm-lifemode .hm-close{display:none!important;}
.hm.hm-lifemode .hm-head{flex-wrap:wrap!important;}
.hm-lifebar{order:10;flex:1 1 100%;display:flex;align-items:center;gap:6px;min-width:0;}
.hm-lifebar .hm-life-day{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;line-height:1.2;white-space:nowrap;overflow:hidden;}
.hm-lifebar .hm-life-day b{font-weight:normal;font-size:.92rem;color:#ffe9b0;letter-spacing:.08em;text-shadow:0 0 8px rgba(255,200,120,.35);}
.hm-lifebar .hm-life-day small{font-size:.62rem;color:#b8a8e0;overflow:hidden;text-overflow:ellipsis;}
.hm-lifebar .hm-btn{flex:0 0 auto;}
.hm-lifebar .hm-life-next{min-width:132px;}
body.life-mode .hm-toast-stack{top:calc(max(8px,env(safe-area-inset-top)) + 110px);}
@media (min-width:900px){body.life-mode .hm-toast-stack{top:calc(max(8px,env(safe-area-inset-top)) + 64px);}
.hm-lifebar{flex-basis:auto;flex:0 1 auto;order:0;margin-left:auto;}.hm-lifebar .hm-life-day{flex:0 1 auto;margin-right:6px;text-align:right;}}
`;
  document.head.appendChild(st);
}
function lbtn(text,cls,fn){
  const b=document.createElement('button');b.type='button';b.className='hm-btn '+(cls||'');b.textContent=text;
  b.addEventListener('click',e=>{e.stopPropagation();fn();});
  return b;
}
function endingName(type){
  try{const e=(typeof ENDING_LIST!=='undefined'?ENDING_LIST:[]).find(x=>x.type===type);if(e)return e.name;}catch(e){}
  return '';
}
function decorate(){
  if(!HAS_DOM||!isActive())return;
  const ol=$('home-ol');if(!ol)return;
  injectStyle();
  ol.classList.add('hm-lifemode');
  const head=ol.querySelector('.hm-head');if(!head)return;
  let bar=head.querySelector('.hm-lifebar');
  if(!bar){
    bar=document.createElement('div');bar.className='hm-lifebar';bar.setAttribute('role','group');bar.setAttribute('aria-label','暮らし');
    const lab=document.createElement('div');lab.className='hm-life-day';lab.setAttribute('aria-live','polite');
    lab.appendChild(document.createElement('b'));lab.appendChild(document.createElement('small'));
    bar.appendChild(lab);
    bar.appendChild(lbtn('☀ 一日を過ごす','hm-primary hm-life-next',spendDay));
    bar.appendChild(lbtn('タイトルへ','hm-life-title',goTitle));
    head.appendChild(bar);
  }
  UI.bar=bar;
  const tt=ol.querySelector('.hm-title-t');if(tt)tt.textContent='🏡 だんのうらの家';
  updateBar();
  clearInterval(UI.iv);
  UI.iv=setInterval(()=>{if(!$('home-ol')){clearInterval(UI.iv);UI.iv=0;return;}updateBar();},400);
}
function screenBusy(){
  const S=HOME._screen;
  return UI.busy||!!(S&&(S.busy||S.mode==='edit'||S.craftOpen));
}
function updateBar(){
  const bar=UI.bar;if(!bar||!bar.isConnected)return;
  const l=lifeOf(G()&&G().homeData);if(!l)return;
  const b=bar.querySelector('.hm-life-day b'),s=bar.querySelector('.hm-life-day small');
  const t=`暮らし ${(l.day|0)+1}日目`;
  if(b.textContent!==t)b.textContent=t;
  const nm=endingName(l.startedFrom);const sub=nm?`『${nm}』のあとで`:'30日のあとで';
  if(s.textContent!==sub)s.textContent=sub;
  const busy=screenBusy();
  bar.querySelectorAll('button').forEach(x=>{x.disabled=busy;});
}
function toast(t){try{if(HOME.ui&&HOME.ui.toast)HOME.ui.toast(t);}catch(e){}}
async function spendDay(){
  if(screenBusy()||!isActive())return;
  UI.busy=true;updateBar();
  try{
    try{if(typeof AU!=='undefined')AU.se('btn');}catch(e){}
    const r=advance();
    if(!r)return;
    toast(`☀ 暮らし ${r.day+1}日目の朝。`);
    if(r.mat)toast(`${r.mat.id==='sea'?'🐚 浜で拾った':r.mat.id==='wood'?'🪵 近所で分けてもらった':'🧵 端切れが出た'}（${MAT_NAME[r.mat.id]||r.mat.id}+${r.mat.n}）`);
    if(!r.saved)toast('💾 保存できませんでした');
    const S=HOME._screen;
    if(S&&S.open&&typeof S.refresh==='function')S.refresh();
    // その日の出来事（家を開いたときのフック）をもう一度
    if(S&&S.open&&!S.busy&&HOME.hooks&&typeof HOME.hooks.onOpen==='function'){
      S.busy=true;try{S.refresh();}catch(e){}
      try{await HOME.hooks.onOpen(S.area);}catch(e){}
      S.busy=false;if(S.open)try{S.refresh();}catch(e){}
    }
  }finally{UI.busy=false;updateBar();}
}
function goTitle(){
  if(screenBusy()&&!(HOME._screen&&HOME._screen.mode==='edit'))return;
  // 画面を閉じる（模様替え中なら確認）→ close イベントで toTitle
  if(typeof HOME.requestClose==='function'&&HOME.isOpen&&HOME.isOpen()){HOME.requestClose();return;}
  toTitle();
}
function toTitle(){
  if(UI.leaving)return;UI.leaving=true;
  clearInterval(UI.iv);UI.iv=0;
  save();
  try{root.location.reload();}catch(e){}
}

// 画面の後始末をして家・庭を開く
function enterUI(){
  if(!HAS_DOM||SIM)return false;
  injectStyle();
  document.body.classList.add('life-mode');
  try{if(root.PR&&typeof root.PR.closeEnding==='function')root.PR.closeEnding();}catch(e){}
  try{if(typeof _endingIv!=='undefined'&&_endingIv){clearInterval(_endingIv);_endingIv=null;}}catch(e){}
  try{if(typeof commentIv!=='undefined')clearInterval(commentIv);if(typeof anomalyIv!=='undefined')clearInterval(anomalyIv);}catch(e){}
  ['ending-sc','share-panel'].forEach(id=>{const e=$(id);if(e)e.classList.remove('active');});
  const ec=$('end-comments');if(ec)ec.style.display='none';
  const rf=$('red-flash');if(rf)rf.style.opacity='0';
  document.body.classList.remove('ph3','ph3crit');
  try{document.body.setAttribute('data-phase','1');}catch(e){}
  ['title-screen','story-screen','game-screen'].forEach(id=>{const e=$(id);if(e)e.classList.add('hidden');});
  try{if(typeof setRain==='function')setRain(0);}catch(e){}
  setDaytime();
  const ok=typeof HOME.open==='function'&&HOME.open('room');
  if(ok)decorate();
  return !!ok;
}
// 結末の最終画面のボタンから
function startFromEnding(){
  if(SIM||!offersLife(pendingEnding))return false;
  if(isActive())return enterUI();
  const l=begin(pendingEnding);if(!l)return false;
  save();
  try{if(typeof AU!=='undefined')AU.fadeBGM('rebirth',800);}catch(e){}
  const ok=enterUI();
  if(ok)setTimeout(()=>toast('🏡 ここからは、ふたりの暮らし。急がなくていい。'),400);
  return ok;
}
// タイトルの「つづきから」
function resumeFromSave(){
  let sd=null;
  try{const raw=readActiveRaw();sd=raw?JSON.parse(raw):null;}catch(e){sd=null;}
  if(!saveIsLife(sd))return false;
  try{if(!sd.version||(typeof SAVE_VERSION!=='undefined'&&sd.version>SAVE_VERSION))return false;}catch(e){}
  try{root.saveDataToGs(sd.gs);}catch(e){try{console.warn('[lifemode] resume',e);}catch(_){}return false;}
  if(!isActive())return false;
  try{if(typeof unlockAudio==='function')unlockAudio(()=>{try{AU.playBGM('rebirth');}catch(e){}});}catch(e){}
  const ok=enterUI();
  if(ok){const l=lifeOf(G().homeData);setTimeout(()=>toast(`📂 暮らし ${(l.day|0)+1}日目から再開しました。`),400);}
  return ok;
}
// 今のスロット（game.js の SAVESLOTS / SAVE_SLOT）のセーブ。旧版（スロットなし）は SAVE_KEY をそのまま読む
function readActiveRaw(){
  try{if(typeof SAVESLOTS!=='undefined'&&typeof SAVE_SLOT!=='undefined')return SAVESLOTS.raw(SAVE_SLOT);}catch(e){}
  try{return localStorage.getItem(typeof SAVE_KEY!=='undefined'?SAVE_KEY:'dannoura_save_v1');}catch(e){return null;}
}
// タイトルの「つづきから」の表示（暮らしモードのセーブなら日数を出す）
// スロットがある版では game.js の checkSaveData が各スロットの「暮らし ○日目」まで出すので、ここでは何もしない
function updateContinueLabel(){
  if(!HAS_DOM)return;
  try{if(typeof SAVESLOTS!=='undefined')return;}catch(e){}
  try{
    const raw=localStorage.getItem(typeof SAVE_KEY!=='undefined'?SAVE_KEY:'dannoura_save_v1');if(!raw)return;
    const sd=JSON.parse(raw);if(!saveIsLife(sd))return;
    const btn=$('btn-continue');if(!btn)return;
    const l=sd.gs.homeData.life;const nm=endingName(l.startedFrom);
    btn.textContent=`▶ つづきから  🏡 暮らし ${(l.day|0)+1}日目${nm?' / '+nm+'のあと':''}`;
  }catch(e){}
}

HOME.lifeMode={
  GOOD,offersLife,saveIsLife,dailyMaterialFor,setEnding,isActive,
  begin,advance,install,startFromEnding,resumeFromSave,spendDay,goTitle,
  get pendingEnding(){return pendingEnding;},
};

if(typeof document!=='undefined'&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
else if(typeof document!=='undefined')setTimeout(install,0);
})();
