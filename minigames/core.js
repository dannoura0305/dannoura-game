// ══════════════════════════════════════════════════════════
// 追加ミニゲーム共通（シューティング・ローグライク・パズル・カードバトル）
// 各ゲームは registerMinigame() で登録する。どれも1日1回までプレイできる。
//
// 登録する定義:
//   {id, icon, name, genre, desc, effect, help, bgm,
//    start(body, mg) → {result(reason)} }
//   result() は {title, summary, fx:{mental,fatigue,...}, time, log, sp, cutin, after()} を返す
//
// 読み込み：ゲーム本体（minigames/<file>.js）は起動時には読まない。
//   選択画面は minigames/registry.js の目録（MG_META）だけで描き、
//   MG.open(id) のときに MG.load(id) で読み込んでから始める（Promise を返す）。
//   カードに指を置いた／マウスを乗せた時点で先読みする（MG.preload）。
// ══════════════════════════════════════════════════════════
// 目録の項目（start が無い）→ 読み込み後に本物の定義へ差し替わる。並び順は目録のまま
const MINIGAMES=(typeof MG_META!=='undefined'&&Array.isArray(MG_META))?MG_META.slice():[];
function registerMinigame(def){
  if(!def||!def.id)return;
  const i=MINIGAMES.findIndex(m=>m.id===def.id);
  if(i<0){MINIGAMES.push(def);return;}
  const meta=MINIGAMES[i];
  if(meta===def)return;
  if(meta.file&&!Object.prototype.hasOwnProperty.call(def,'file'))def.file=meta.file;
  MINIGAMES[i]=def;
  try{if(typeof MG!=='undefined'&&MG.def===meta)MG.def=def;}catch(e){}
}
function minigameLoaded(id){const d=MINIGAMES.find(m=>m.id===id);return !!(d&&typeof d.start==='function');}
// ミニゲーム画面の見出し：タイトルは折り返さず、説明が長ければ「…」で省略する
document.head.insertAdjacentHTML('beforeend','<style id="mg-style-core">#mg-screen:not(.active),#mg-screen:not(.active) *{pointer-events:none!important;}#mg-screen .mini-hd{min-width:0;}#mg-screen .mini-ttl{white-space:nowrap;flex-shrink:0;}#mg-screen .mg-help{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}#mg-screen .mini-endbtn.mg-quit-armed{border-color:var(--rd);color:var(--rd);font-size:.62rem;}</style>');
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
addMinigameStyle('diffbadge','.mg-diffb{display:inline-block;margin-left:7px;padding:1px 5px;border:1px solid currentColor;border-radius:3px;font-size:.58rem;letter-spacing:0;vertical-align:1px;}.mg-diffb-easy{color:#44ee88;}.mg-diffb-normal{color:#e8b830;}.mg-diffb-hard{color:#ff6a86;}');
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
// ミニゲームのアイコン（main/icons.js のドット絵。無ければ定義の絵文字）
function mgIconHTML(def,px){
  if(window.ICONS&&ICONS.has(def.id))return ICONS.html(def.id,px).replace('class="ic ','class="ic ic-lead ');
  return def.icon+' ';
}
// アイコン＋文字のボタン中身（文字はコード内の固定文言のみ）
function mgBtnHTML(name,label){
  return (window.ICONS?ICONS.html(name,16).replace('class="ic ','class="ic ic-lead '):'')+label;
}
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
      if(window.ICONS)b.innerHTML=ICONS.html(c.id,18)+`<span class="ic-t">${c.name} ${n}</span>`;
      else b.textContent=`${c.name} ${n}`;
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
    b.innerHTML=`<div class="mg-pick-top"><span class="mg-pick-name">${mgIconHTML(def,24)}${def.name}</span><span class="mg-pick-genre">${def.genre}</span></div>`+
      `<div class="mg-pick-desc">${def.desc}</div>`+
      `<div class="mg-pick-fx">${played?'今日はプレイ済み。また明日。':def.effect}</div>`;
    b.onclick=()=>MG.open(def.id);
    // 指を置いた・マウスを乗せた・キーで選んだ時点で本体を先読みする
    if(!played&&!minigameLoaded(def.id)){
      const pre=()=>MG.preload(def.id);
      b.addEventListener('pointerenter',pre,{once:true});
      b.addEventListener('touchstart',pre,{once:true,passive:true});
      b.addEventListener('focus',pre,{once:true});
    }
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

// ── 本体の遅延読み込み ──
// 読み込み中の小さな表示（選択画面の上に重ねる。ほかの画面の状態は変えない）
addMinigameStyle('loading',`
#mg-loading{position:fixed;inset:0;z-index:140;display:flex;align-items:center;justify-content:center;background:rgba(3,2,10,.55);opacity:0;pointer-events:none;transition:opacity .15s;}
#mg-loading.active{opacity:1;pointer-events:all;}
#mg-loading .mg-ld-box{display:flex;align-items:center;gap:10px;padding:12px 18px;max-width:86vw;border:1px solid rgba(232,184,48,.55);border-radius:6px;background:rgba(10,8,30,.96);box-shadow:0 6px 24px rgba(0,0,0,.6);color:var(--tx-b);font-family:var(--dot);font-size:.82rem;letter-spacing:.05em;}
#mg-loading .mg-ld-spin{flex:none;width:16px;height:16px;border:2px solid rgba(232,184,48,.25);border-top-color:var(--gd);border-radius:50%;animation:mgLdSpin .8s linear infinite;}
#mg-loading .mg-ld-name{display:block;font-size:.62rem;color:var(--tx);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
@keyframes mgLdSpin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion:reduce){#mg-loading .mg-ld-spin{animation-duration:2.4s;}}
`);
function mgLoadingShow(def){
  let el=document.getElementById('mg-loading');
  if(!el){
    el=document.createElement('div');el.id='mg-loading';el.setAttribute('role','status');el.setAttribute('aria-live','polite');
    el.innerHTML='<div class="mg-ld-box"><span class="mg-ld-spin"></span><div><div>読み込み中…</div><span class="mg-ld-name"></span></div></div>';
    document.body.appendChild(el);
  }
  el.querySelector('.mg-ld-name').textContent=def&&def.name?def.name:'';
  el.classList.add('active');
}
function mgLoadingHide(){const el=document.getElementById('mg-loading');if(el)el.classList.remove('active');}
const _mgLoads={};
const MG_LOAD_TIMEOUT=30000;

// ── 見出し左の小さな顔（だんのうら） ──
// main/homescene.js の正面の頭（16×17）と同じドット。疲労75以上か精神25以下なら
// 白髪・猫耳の疲れ切った姿（homescene の変身判定と同じ境目）。
const MG_AV_HEAD=[
"..........kkkk..","..........kppk..","..........kRRk..","......kkkkPPPPk.",
"....kkhhhhhhhhk.","...khhHHHhhhhhhk","..khHHhhhhhhhhhk",".kffFhhhhhhhhhhk",
".khfhhhhhhhhhhdk",".khhshhsshhshhdk",".khggggggggggdhk",".khgssgssgssghdk",
".khgssgssgssghdk",".khggggssgggghdk",".khsssssssssshdk","..khSssssssShdhk",
"...kkkkkkkk.dhk.",
];
const MG_AV_EARS=["..kk........kk..","..kik......kik..","..kiik....kiik..","..kiiwkkkkwiik..","..khhhhhhhhhhhk."];
const MG_AV_PAL={k:'#1b1226',h:'#5a3590',H:'#8c5fcc',d:'#3a2066',s:'#f6d6c2',S:'#d9a994',b:'#f2a2ac',g:'#2a1c36',
  e:'#6a3aa8',E:'#2c1648',w:'#ffffff',p:'#e07fb0',P:'#a54a80',R:'#6d2a56',f:'#ffb3cf',F:'#fff0a0',m:'#b4506e',u:'#9a7aa8'};
const MG_AV_PAL_T={h:'#dcd8ee',H:'#ffffff',d:'#a8a0c8',i:'#f29ab8',w:'#ffffff',f:'#ff9cc4',F:'#ffe0ec'};
function mgAvatarForm(){
  try{const fat=+gs.fatigue||0,men=+gs.mental;return (fat>=75||(Number.isFinite(men)&&men<=25))?'tired':'normal';}catch(e){return 'normal';}
}
function mgAvatarPaint(cv,form){
  const x=cv.getContext&&cv.getContext('2d');if(!x)return;
  cv.width=16;cv.height=17;x.clearRect(0,0,16,17);
  const tired=form==='tired';
  const rows=tired?MG_AV_EARS.concat(MG_AV_HEAD.slice(5)):MG_AV_HEAD;
  const pal=tired?Object.assign({},MG_AV_PAL,MG_AV_PAL_T):MG_AV_PAL;
  rows.forEach((r,y)=>{for(let i=0;i<r.length;i++){const c=pal[r[i]];if(!c)continue;x.fillStyle=c;x.fillRect(i,y,1,1);}});
  const P=(c,a,b,w,h)=>{x.fillStyle=c;x.fillRect(a,b,w,h);};
  if(tired){
    // 半分閉じた目・への字の口・目の下のクマ
    P(pal.k,4,11,2,1);P(pal.k,10,11,2,1);P(pal.e,4,12,2,1);P(pal.e,10,12,2,1);
    P(pal.u,4,14,2,1);P(pal.u,10,14,2,1);P(pal.m,7,15,2,1);
  }else{
    P(pal.e,4,11,2,2);P(pal.e,10,11,2,2);P(pal.E,4,12,2,1);P(pal.E,10,12,2,1);P(pal.w,5,11,1,1);P(pal.w,11,11,1,1);
    P(pal.m,7,14,2,1);P(pal.b,4,14,1,1);P(pal.b,11,14,1,1);
  }
}
function mgAvatarRender(){
  const hd=document.querySelector('#mg-screen .mini-hd');if(!hd)return;
  let cv=document.getElementById('mg-avatar');
  if(!cv){cv=document.createElement('canvas');cv.id='mg-avatar';cv.className='mg-avatar';cv.setAttribute('aria-hidden','true');hd.insertBefore(cv,hd.firstChild);}
  const form=mgAvatarForm();
  if(cv.dataset.form===form&&cv.width===16)return;
  cv.dataset.form=form;cv.title=form==='tired'?'だんのうら（限界）':'だんのうら';
  try{mgAvatarPaint(cv,form);}catch(e){}
}
addMinigameStyle('avatar',`
#mg-screen .mg-avatar{flex:none;width:32px;height:34px;margin:-6px 0 -6px -6px;image-rendering:pixelated;image-rendering:crisp-edges;filter:drop-shadow(0 0 3px rgba(140,95,204,.55));}
#mg-screen .mg-avatar[data-form="tired"]{filter:drop-shadow(0 0 3px rgba(242,154,184,.6));}
@media (max-width:360px){#mg-screen .mg-avatar{width:24px;height:26px;margin:-4px 0 -4px -6px;image-rendering:auto;}}
`);

// ── 実行管理 ──
const MG={
  def:null,game:null,_iv:[],_raf:null,_keys:null,_ended:true,_onEnd:[],
  el(id){return document.getElementById(id);},
  // 本体（minigames/<file>.js）を読み込む。読み込み済みならすぐ解決。def を返す Promise
  load(id){
    const cur=MINIGAMES.find(m=>m.id===id);
    if(!cur)return Promise.reject(new Error('unknown minigame: '+id));
    if(typeof cur.start==='function')return Promise.resolve(cur);
    if(_mgLoads[id])return _mgLoads[id];
    const file=String(cur.file||id).replace(/[^\w-]/g,'');
    const p=new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='minigames/'+file+'.js';s.async=true;s.dataset.mg=id;
      let done=false;
      const fail=err=>{if(done)return;done=true;clearTimeout(to);s.onload=s.onerror=null;s.remove();delete _mgLoads[id];rej(err);};
      const to=setTimeout(()=>fail(new Error('timeout: '+s.src)),MG_LOAD_TIMEOUT);
      s.onload=()=>{
        if(done)return;
        const d=MINIGAMES.find(m=>m.id===id);
        if(d&&typeof d.start==='function'){done=true;clearTimeout(to);res(d);}
        else fail(new Error('not registered: '+s.src));
      };
      s.onerror=()=>fail(new Error('load error: '+s.src));
      document.head.appendChild(s);
    });
    _mgLoads[id]=p;
    return p;
  },
  // 先読み（失敗しても何もしない。本番の open で改めて読み込む）
  preload(id){try{this.load(id).catch(()=>{});}catch(e){}},
  // 開く：読み込み済みなら同期的に始まる。戻り値は Promise<boolean>（始まったら true）
  open(id){
    const def=MINIGAMES.find(m=>m.id===id);
    if(!def)return Promise.resolve(false);
    if(playedMinigameToday(id)){showNotif('今日はもうプレイした。また明日。');return Promise.resolve(false);}
    if(typeof def.start==='function'){this._start(def);return Promise.resolve(true);}
    if(this._opening)return this._opening.then(()=>false);
    const picker=document.getElementById('mg-picker');
    const fromPicker=!!(picker&&picker.classList.contains('active'));
    mgLoadingShow(def);
    const t0=Date.now();
    const run=this.load(id).then(d=>{
      mgLoadingHide();
      // 読み込み中に選択画面を閉じた／別の画面に移った／日付が変わってプレイ済みになった → 始めない
      if(fromPicker&&!picker.classList.contains('active'))return false;
      if(!this._ended||playedMinigameToday(id))return false;
      this._start(d);
      return true;
    },err=>{
      mgLoadingHide();
      console.warn('[minigame] 読み込み失敗',id,err);
      if(typeof showNotif==='function')showNotif('ミニゲームを読み込めませんでした。通信を確かめて、もう一度選んでください。');
      return false;
    }).finally(()=>{this._opening=null;this.lastLoadMs=Date.now()-t0;});
    this._opening=run;
    return run;
  },
  _start(def){
    closeMinigamePicker();
    this.def=def;this._ended=false;this._onEnd=[];this._loopErr=false;
    if(window.ICONS&&ICONS.has(def.id))this.el('mg-title').innerHTML=mgIconHTML(def,20)+`<span class="ic-t">${def.name}</span>`;
    else this.el('mg-title').textContent=def.icon+' '+def.name;
    this.el('mg-help').textContent=def.help;
    mgAvatarRender();
    {const qb=document.querySelector('#mg-screen .mini-endbtn');if(qb&&!this._quitArmed)qb.innerHTML=mgBtnHTML('close','終了');}
    const body=this.el('mg-body');
    body.innerHTML='';body.className='mg-body mg-'+def.id;
    this.setScore('');this.setTimer('');
    AU.fadeBGM(def.bgm||'factory',580);
    // プレイ中はセリフの吹き出しを出さない（操作ボタンに重なるため）
    document.body.classList.add('mg-active');
    this.el('mg-screen').classList.add('active');
    this.game=def.start(body,this);
    // 見出しに難しさの表示が無いゲームには自動で付ける
    {const tt=this.el('mg-title');const d=mgDifficulty();if(tt&&!tt.querySelector('.mg-diffb'))tt.insertAdjacentHTML('beforeend',`<span class="mg-diffb mg-diffb-${d}">${MG_DIFF_NAMES[d]}</span>`);}
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
      this._quitArmed=true;btn.innerHTML=mgBtnHTML('warn','もう一度で終了');btn.classList.add('mg-quit-armed');
      clearTimeout(this._quitTO);this._quitTO=setTimeout(()=>{this._quitArmed=false;btn.innerHTML=mgBtnHTML('close','終了');btn.classList.remove('mg-quit-armed');},2500);
      return;
    }
    clearTimeout(this._quitTO);this._quitArmed=false;
    if(btn){btn.innerHTML=mgBtnHTML('close','終了');btn.classList.remove('mg-quit-armed');}
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
