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
// 各ゲーム専用のCSSを一度だけ<head>に差し込む（style.cssを共有で編集しなくて済むように）
function addMinigameStyle(id,css){
  if(document.getElementById('mg-style-'+id))return;
  const s=document.createElement('style');s.id='mg-style-'+id;s.textContent=css;document.head.appendChild(s);
}

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

function playedMinigameToday(id){return !!(gs.mgDay&&gs.mgDay[id]===gs.day);}

// ── 選択画面 ──
function openMinigamePicker(){
  const list=document.getElementById('mg-pick-items');
  list.innerHTML='';
  MINIGAMES.forEach(def=>{
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
  document.getElementById('mg-picker').classList.add('active');
}
function closeMinigamePicker(){document.getElementById('mg-picker').classList.remove('active');}

// ── 実行管理 ──
const MG={
  def:null,game:null,_iv:[],_raf:null,_keys:null,_ended:true,
  el(id){return document.getElementById(id);},
  open(id){
    const def=MINIGAMES.find(m=>m.id===id);
    if(!def)return;
    if(playedMinigameToday(id)){showNotif('今日はもうプレイした。また明日。');return;}
    closeMinigamePicker();
    this.def=def;this._ended=false;
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
      const dt=Math.min(.05,(now-last)/1000);last=now;
      fn(dt);
      if(!this._ended)this._raf=requestAnimationFrame(step);
    };
    this._raf=requestAnimationFrame(step);
  },
  onKey(fn){this._keys=fn;},
  end(reason){if(this.game&&!this._ended)this.finish(this.game.result(reason));},
  quit(){this.end('quit');},
  finish(r){
    if(this._ended)return;
    this._ended=true;
    this._iv.forEach(clearInterval);this._iv=[];
    if(this._raf)cancelAnimationFrame(this._raf);
    this._raf=null;this._keys=null;
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
    showResult(r.title,(r.summary?r.summary+'<br>':'')+fxToHtml(r.fx||{}));
    advTime(r.time||60);
    loadScene('main');
    checkGameOver();
  },
};
['keydown','keyup'].forEach(t=>document.addEventListener(t,e=>{if(MG._keys&&!MG._ended)MG._keys(e);}));
