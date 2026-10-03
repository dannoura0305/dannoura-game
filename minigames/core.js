// ══════════════════════════════════════════════════════════
// 追加ミニゲーム共通（シューティング・ローグライク・パズル・カードバトル）
// 各ゲームは registerMinigame() で登録する。どれも1日1回までプレイできる。
//
// 登録する定義:
//   {id, icon, name, genre, desc, effect, help, bgm,
//    start(body, mg) → {result(reason)} }
//   result() は {title, summary, fx:{mental,fatigue,...}, time, log, sp, cutin, after()} を返す
// ══════════════════════════════════════════════════════════
const MINIGAMES=[];
function registerMinigame(def){MINIGAMES.push(def);}
// ミニゲーム画面の見出し：タイトルは折り返さず、説明が長ければ「…」で省略する
document.head.insertAdjacentHTML('beforeend','<style id="mg-style-core">#mg-screen .mini-hd{min-width:0;}#mg-screen .mini-ttl{white-space:nowrap;flex-shrink:0;}#mg-screen .mg-help{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}#mg-screen .mini-endbtn.mg-quit-armed{border-color:var(--rd);color:var(--rd);font-size:.62rem;}</style>');
// 各ゲーム専用のCSSを一度だけ<head>に差し込む（style.cssを共有で編集しなくて済むように）
function addMinigameStyle(id,css){
  if(document.getElementById('mg-style-'+id))return;
  const s=document.createElement('style');s.id='mg-style-'+id;s.textContent=css;document.head.appendChild(s);
}

// ── ミニゲームの難しさ（設定画面で選ぶ・この端末に保存・初期値はやさしい） ──
// 各ゲームは mgDiff(やさしい時の値, ふつう時の値, むずかしい時の値) で数値を切り替える
const MG_DIFF_KEY='dannoura_mg_diff';
const MG_DIFF_NAMES={easy:'やさしい',normal:'ふつう',hard:'むずかしい'};
function mgDifficulty(){try{const v=localStorage.getItem(MG_DIFF_KEY);return MG_DIFF_NAMES[v]?v:'easy';}catch(e){return 'easy';}}
function setMgDifficulty(v){if(!MG_DIFF_NAMES[v])return;try{localStorage.setItem(MG_DIFF_KEY,v);}catch(e){}refreshMgDiffUI();}
function mgDiff(easy,normal,hard){const d=mgDifficulty();return d==='easy'?easy:d==='normal'?normal:hard;}
function refreshMgDiffUI(){
  const cur=mgDifficulty();
  document.querySelectorAll('#mg-diff button').forEach(b=>b.classList.toggle('on',b.dataset.d===cur));
  const lab=document.getElementById('mg-pick-diff');if(lab)lab.textContent='難しさ：'+MG_DIFF_NAMES[cur];
}
document.querySelectorAll('#mg-diff button').forEach(b=>b.addEventListener('click',()=>{setMgDifficulty(b.dataset.d);if(typeof AU!=='undefined')AU.se('decide');}));
refreshMgDiffUI();

const FX_LABEL={
  mental:'精神力',fatigue:'疲労',flame:'炎上',money:'収入',jobRep:'仕事評価',
  certKnow:'資格知識',followers:'フォロワー',streamPop:'配信人気',childStress:'育児ストレス',hope:'希望',
};
// 増えると悪い値（結果表示の色分け用）
const FX_BAD_UP={fatigue:true,flame:true,childStress:true};

function applyMinigameFx(fx){
  const clamp=v=>Math.max(0,Math.min(100,v));
  Object.entries(fx).forEach(([k,v])=>{
    if(!v)return;
    if(k==='money'){gs.money+=v;if(v>0)gs.debt=Math.max(0,gs.debt-Math.floor(v*.4));}
    else if(k==='followers')gs.followers=Math.max(0,gs.followers+v);
    else if(k==='flame')gs.flame=Math.max(0,gs.flame+v);
    else if(k==='hope')gs.personality.hope=clamp(gs.personality.hope+v);
    else gs[k]=clamp(gs[k]+v);
  });
}
function fxToHtml(fx){
  return Object.entries(fx).filter(([,v])=>v).map(([k,v])=>{
    const good=FX_BAD_UP[k]?v<0:v>0;
    const val=k==='money'?(v>0?'+':'-')+'¥'+Math.abs(v).toLocaleString():(v>0?'+':'')+v;
    return `${FX_LABEL[k]} <span class="${good?'up':'down'}">${val}</span>`;
  }).join('<br>');
}

// 3Dゲーム用：three.js（vendor/three.min.js）を初回だけ読み込む。window.THREE を返すPromise
let _threePromise=null;
function loadThree(){
  if(window.THREE)return Promise.resolve(window.THREE);
  if(_threePromise)return _threePromise;
  _threePromise=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='vendor/three.min.js';
    s.onload=()=>window.THREE?res(window.THREE):rej(new Error('three.js not available'));
    s.onerror=()=>{_threePromise=null;rej(new Error('vendor/three.min.js を読み込めませんでした'));};
    document.head.appendChild(s);
  });
  return _threePromise;
}

function playedMinigameToday(id){return !!(gs.mgDay&&gs.mgDay[id]===gs.day);}

// ── 選択画面（カテゴリ別タブ） ──
const MG_CATS=[
  {id:'all',    name:'すべて'},
  {id:'action', name:'アクション', ids:['shooter','runner','factory3d','race','stealth']},
  {id:'brain',  name:'頭脳・戦略', ids:['puzzle','blocks','quiz','escape','defense','cards','manager']},
  {id:'story',  name:'物語',       ids:['rpg','horror','rogue']},
  {id:'life',   name:'暮らし・癒し',ids:['cooking','fishing']},
];
function minigameCat(id){const c=MG_CATS.find(c=>c.ids&&c.ids.includes(id));return c?c.id:'brain';}
let _mgTab=(()=>{try{return localStorage.getItem('dannoura_mg_tab')||'all';}catch(e){return 'all';}})();
function openMinigamePicker(){
  const tabs=document.getElementById('mg-pick-tabs');
  if(tabs){
    tabs.innerHTML='';
    MG_CATS.forEach(c=>{
      const n=c.id==='all'?MINIGAMES.length:MINIGAMES.filter(d=>minigameCat(d.id)===c.id).length;
      if(!n)return;
      const b=document.createElement('button');
      b.className='mg-tab'+(c.id===_mgTab?' on':'');
      b.textContent=`${c.name} ${n}`;
      b.onclick=()=>{_mgTab=c.id;try{localStorage.setItem('dannoura_mg_tab',c.id);}catch(e){}openMinigamePicker();};
      tabs.appendChild(b);
    });
  }
  const list=document.getElementById('mg-pick-items');
  list.innerHTML='';
  const shown=MINIGAMES.filter(d=>_mgTab==='all'||minigameCat(d.id)===_mgTab);
  // まだ遊べるものを上に
  shown.slice().sort((a,b)=>playedMinigameToday(a.id)-playedMinigameToday(b.id)).forEach(def=>{
    const played=playedMinigameToday(def.id);
    const b=document.createElement('button');
    b.className='mg-pick'+(played?' played':'');
    b.disabled=played;
    b.innerHTML=`<div class="mg-pick-top"><span class="mg-pick-name">${def.icon} ${def.name}</span><span class="mg-pick-genre">${def.genre}</span></div>`+
      `<div class="mg-pick-desc">${def.desc}</div>`+
      `<div class="mg-pick-fx">${played?'今日はプレイ済み。また明日。':def.effect}</div>`;
    b.onclick=()=>MG.open(def.id);
    list.appendChild(b);
  });
  refreshMgDiffUI();
  const left=MINIGAMES.filter(d=>!playedMinigameToday(d.id)).length;
  const cnt=document.getElementById('mg-pick-count');
  if(cnt)cnt.textContent=`今夜あと${left}種`;
  list.scrollTop=0;
  document.getElementById('mg-picker').classList.add('active');
}
function closeMinigamePicker(){document.getElementById('mg-picker').classList.remove('active');}

// ── 実行管理 ──
const MG={
  def:null,game:null,_iv:[],_raf:null,_keys:null,_ended:true,_onEnd:[],
  el(id){return document.getElementById(id);},
  open(id){
    const def=MINIGAMES.find(m=>m.id===id);
    if(!def)return;
    if(playedMinigameToday(id)){showNotif('今日はもうプレイした。また明日。');return;}
    closeMinigamePicker();
    this.def=def;this._ended=false;this._onEnd=[];this._loopErr=false;
    this.el('mg-title').textContent=def.icon+' '+def.name;
    this.el('mg-help').textContent=def.help;
    const body=this.el('mg-body');
    body.innerHTML='';body.className='mg-body mg-'+def.id;
    this.setScore('');this.setTimer('');
    AU.fadeBGM(def.bgm||'factory',580);
    // プレイ中はセリフの吹き出しを出さない（操作ボタンに重なるため）
    document.body.classList.add('mg-active');
    this.el('mg-screen').classList.add('active');
    this.game=def.start(body,this);
  },
  setScore(html){this.el('mg-score').innerHTML=html;},
  setTimer(t){this.el('mg-timer').textContent=t;},
  every(fn,ms){const id=setInterval(fn,ms);this._iv.push(id);return id;},
  // dt（秒）付きの毎フレーム処理
  loop(fn){
    let last=performance.now();
    const step=now=>{
      if(this._ended)return;
      const dt=Math.max(0,Math.min(.05,(now-last)/1000)); // 初回フレームでマイナスになることがあるlast=now;
      // 1フレームの例外でゲーム全体が止まらないようにする（同じエラーは何度も出さない）
      try{fn(dt);}catch(e){if(!this._loopErr){this._loopErr=true;console.error(e);}}
      if(!this._ended)this._raf=requestAnimationFrame(step);
    };
    this._raf=requestAnimationFrame(step);
  },
  onKey(fn){this._keys=fn;},
  // ゲーム終了時（クリア・失敗・中断のどれでも）に一度だけ呼ばれる後片付け
  onEnd(fn){this._onEnd.push(fn);},
  end(reason){if(this.game&&!this._ended)this.finish(this.game.result(reason));},
  // 終了ボタンは誤タップ防止のため2回押しで確定（2.5秒以内）
  quit(){
    const btn=document.querySelector('#mg-screen .mini-endbtn');
    if(btn&&!this._quitArmed){
      this._quitArmed=true;const old=btn.textContent;btn.textContent='もう一度で終了';btn.classList.add('mg-quit-armed');
      clearTimeout(this._quitTO);this._quitTO=setTimeout(()=>{this._quitArmed=false;btn.textContent=old;btn.classList.remove('mg-quit-armed');},2500);
      return;
    }
    clearTimeout(this._quitTO);this._quitArmed=false;
    if(btn){btn.textContent='終了';btn.classList.remove('mg-quit-armed');}
    this.end('quit');
  },
  finish(r){
    if(this._ended)return;
    this._ended=true;
    this._iv.forEach(clearInterval);this._iv=[];
    if(this._raf)cancelAnimationFrame(this._raf);
    this._raf=null;this._keys=null;
    this._onEnd.forEach(fn=>{try{fn();}catch(e){console.warn(e);}});this._onEnd=[];
    this.el('mg-screen').classList.remove('active');
    document.body.classList.remove('mg-active');
    AU.fadeBGM('night',800);
    gs.mgDay=gs.mgDay||{};
    gs.mgDay[this.def.id]=gs.day;
    applyMinigameFx(r.fx||{});
    if(r.sp)gs.sp+=r.sp;
    if(r.after)r.after();
    if(r.log)logGrow(r.log);
    if(r.cutin)cutin(r.cutin[0],r.cutin[1]);
    updateNavActive('main');
    const spLine=r.sp?`<br>スキルポイント <span class="up">+${r.sp}</span>`:'';
    showResult(r.title,(r.summary?r.summary+'<br>':'')+fxToHtml(r.fx||{})+spLine);
    advTime(r.time||60);
    loadScene('main');
    checkGameOver();
  },
};
['keydown','keyup'].forEach(t=>document.addEventListener(t,e=>{if(MG._keys&&!MG._ended)MG._keys(e);}));
// ミニゲーム中に本編のイベント（ランダムイベント等）が起きたら、結果を閉じるまで待たせる
const _mgPendingEv=[];
if(typeof showEvPopup==='function'){
  const _sep=showEvPopup;
  window.showEvPopup=function(...a){
    // 表示中のイベントがあれば上書きせず順番待ち（以前は2つ目が1つ目の効果を消していた）
    if(document.body.classList.contains('mg-active')||document.getElementById('result-sc')?.classList.contains('active')||document.getElementById('ev-popup')?.classList.contains('active')){_mgPendingEv.push(a);return;}
    return _sep.apply(this,a);
  };
}
function _mgShowNextEv(){
  if(!_mgPendingEv.length||document.body.classList.contains('mg-active'))return;
  setTimeout(()=>{
    if(document.getElementById('ev-popup')?.classList.contains('active')||document.getElementById('result-sc')?.classList.contains('active'))return;
    const ev=_mgPendingEv.shift();if(ev)showEvPopup(...ev);
  },250);
}
if(typeof closeEvent==='function'){
  const _ce=closeEvent;
  window.closeEvent=function(...a){const r=_ce.apply(this,a);_mgShowNextEv();return r;};
}
if(typeof closeResult==='function'){
  const _cr=closeResult;
  window.closeResult=function(...a){
    const r=_cr.apply(this,a);_mgShowNextEv();return r;
  };
}
// タブが裏に回ったら、ミニゲームの効果音（Web Audio）を止めて戻ったら再開する
document.addEventListener('visibilitychange',()=>{
  if(MG._ended||typeof AU==='undefined'||!AU.ctx)return;
  try{document.hidden?AU.ctx.suspend():AU.ctx.resume();}catch(e){}
});
