/* ════════════════════════════════════════════════════════════
   main/ui.js — 本編UIの強化（SNES期の商業RPG風）
   game.js の関数を「包む」だけで、元の処理は必ず先に呼ぶ。
   ・行動メニュー：グループ分け（稼ぐ／休む／家族／遊ぶ／鍛える）・アイコン・コストチップ
   ・ゆびカーソル：ホバー／フォーカス／キー操作に追従（↑↓←→・Enter/Space/Z・Esc/X）
   ・HUD：月相つきDAY、区切りゲージ（精神・疲労）、数値のカウント＆フラッシュ
   ・メッセージ窓：名前プレート、送りマーク▼、タップ/Enterで全文表示
   ・リザルト／イベント／状態／スキル：窓の開閉演出・数値のポップイン
   ・シーン切替：ディザ・フェード
   他モジュール向けフック：window.UI（下部参照）
   ════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const $=id=>document.getElementById(id);
const RM=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
const reduced=()=>RM.matches;
const se=t=>{try{if(typeof AU!=='undefined')AU.se(t);}catch(e){}};
const raf=window.requestAnimationFrame.bind(window);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* 既存のグローバル関数を包む（前の関数を必ず呼ぶ・戻り値はそのまま返す） */
function wrap(name,after,before){
  const prev=window[name];
  if(typeof prev!=='function')return false;
  const w=function(...args){
    if(before){try{before.apply(this,args);}catch(e){console.error('[ui] before '+name,e);}}
    const r=prev.apply(this,args);
    if(after){try{after.call(this,r,...args);}catch(e){console.error('[ui] after '+name,e);}}
    return r;
  };
  w._uiPrev=prev;
  window[name]=w;
  return true;
}

/* ══════════════════════════════════════════
   1. 効果チップ
   ══════════════════════════════════════════ */
const INVERSE=/疲労|ストレス|借金|炎上|喉|時間/;   // 増えると悪い値
function chipTone(t){
  if(/リスク|危険|異変/.test(t))return 'warn';
  const m=t.match(/([+＋\-−])\s*[¥￥\d]/);
  if(m){const plus=m[1]==='+'||m[1]==='＋';return plus!==INVERSE.test(t)?'up':'down';}
  if(/時間大/.test(t))return 'warn';
  return '';
}
function chipHTML(t,tone){
  const tn=tone===undefined?chipTone(t):tone;
  return `<span class="chip${tn?' '+tn:''}">${esc(t)}</span>`;
}
/* 「🎤 歌の練習（歌スキル経験 疲労+4 精神-2）」→ アイコン／ラベル／チップ */
function parseTx(tx){
  let s=String(tx||'').trim(),icon='';
  const m=s.match(/^(\S+)\s+([\s\S]*)$/);
  if(m&&!/[぀-ヿ一-鿿A-Za-z0-9【「]/.test(m[1])&&m[1].length<=4){icon=m[1];s=m[2];}
  let costs=[];
  const pm=s.match(/^([\s\S]*?)[（(]([^（）()]*)[）)]\s*$/);
  if(pm&&pm[1].trim()){s=pm[1].trim();costs=pm[2].split(/[\s　]+/).filter(Boolean);}
  return {icon,label:s,costs};
}

/* ══════════════════════════════════════════
   2. 行動メニュー
   ══════════════════════════════════════════ */
const ACT_GUESS=[
  [/配信を始める/,'stream'],[/設備点検/,'factory'],[/温度・振動/,'diag'],
  [/少し休む/,'rest_light'],[/しっかり休む/,'rest_deep'],[/資格の勉強/,'study'],
  [/寝かしつけ/,'childcare'],[/歌の練習/,'singpractice'],[/ミニゲーム/,'minigames'],
  [/工場ネタ/,'factoryneta'],[/深夜2時/,'deepnight'],
];
const ACT_META={
  stream:     {grp:'earn',extra:[['収益・フォロワー','up'],['夜が明ける','warn']]},
  factory:    {grp:'earn',extra:[['収入','up'],['疲労+10']]},
  diag:       {grp:'earn',extra:[['収入','up'],['疲労+8']]},
  factoryneta:{grp:'special',extra:[['怪談配信','up']]},
  deepnight:  {grp:'special',extra:[['レア','warn']]},
  rest_light: {grp:'rest'}, rest_deep:{grp:'rest'},
  childcare:  {grp:'family'},
  minigames:  {grp:'play'},
  study:      {grp:'train'}, singpractice:{grp:'train'},
};
const GROUPS=[
  {id:'special',jp:'今夜だけ',en:'SPECIAL'},
  {id:'earn',  jp:'稼ぐ',  en:'WORK'},
  {id:'rest',  jp:'休む',  en:'REST'},
  {id:'family',jp:'家族',  en:'FAMILY'},
  {id:'play',  jp:'遊ぶ',  en:'PLAY'},
  {id:'train', jp:'鍛える',en:'TRAIN'},
  {id:'other', jp:'その他',en:'MORE'},
];
let lastChoiceList=null;     // buildChoices の最終結果（外側で包んで記録）
let lastAc=null;             // 最後に選んだ行動（カーソル位置の復元用）
let lastSceneKey=null;

function acFor(btn,i){
  const tx=btn.dataset.tx||btn.textContent;
  if(lastChoiceList){
    const c=lastChoiceList.find(c=>c&&c.tx===tx);
    if(c&&c.ac)return c.ac;
  }
  for(const [re,ac] of ACT_GUESS)if(re.test(tx))return ac;
  return null;
}
function minigamesLeft(){
  try{
    if(typeof MINIGAMES==='undefined'||typeof playedMinigameToday!=='function')return null;
    return MINIGAMES.filter(d=>!playedMinigameToday(d.id)).length;
  }catch(e){return null;}
}
/* ボタン1個をリッチ表示にする（元の文字列は data-tx に保存） */
function richButton(btn,ac){
  if(btn.dataset.ui)return;
  const tx=btn.textContent;
  btn.dataset.ui='1';btn.dataset.tx=tx;
  if(ac)btn.dataset.ac=ac;
  const p=parseTx(tx);
  if(p.icon==='▶')p.icon='';
  const meta=ac&&ACT_META[ac];
  let chips=p.costs.map(c=>chipHTML(c)).join('');
  if(meta&&meta.extra&&!p.costs.length)chips=meta.extra.map(([t,tn])=>chipHTML(t,tn)).join('');
  // ラベルに含まれる【】部分は2行目に回す
  let label=p.label,sub='';
  const bm=label.match(/^([\s\S]*?)(【[^】]*】)\s*$/);
  if(bm&&bm[1].trim()){label=bm[1].trim();sub=bm[2];}
  if(sub)chips=chipHTML(sub,'warn')+chips;
  btn.innerHTML=(p.icon?`<span class="cb-ico" aria-hidden="true">${esc(p.icon)}</span>`:'')+
    `<span class="cb-main"><span class="cb-lbl">${esc(label)}</span>${chips?`<span class="cb-cost">${chips}</span>`:''}</span>`;
  btn.setAttribute('aria-label',tx);
}

let enhancing=false;
function enhanceChoices(key){
  const ca=$('choices-area');if(!ca)return;
  enhancing=true;
  try{
    const btns=[...ca.querySelectorAll(':scope > .choice-btn')];
    const acs=btns.map((b,i)=>acFor(b,i));
    const known=acs.filter(a=>a&&ACT_META[a]).length;
    btns.forEach((b,i)=>richButton(b,acs[i]));
    const isMenu=key==='main'&&known>=3;
    ca.classList.toggle('ui-grid',isMenu);
    ca.querySelectorAll(':scope > .ui-grp').forEach(h=>h.remove());
    if(isMenu){
      const by={};
      btns.forEach((b,i)=>{
        const g=(acs[i]&&ACT_META[acs[i]]?ACT_META[acs[i]].grp:'other');
        (by[g]=by[g]||[]).push(b);
      });
      // 夜のミニゲーム：残り回数バッジ
      const mgBtn=btns[acs.indexOf('minigames')];
      if(mgBtn){
        const left=minigamesLeft();
        const cost=mgBtn.querySelector('.cb-cost');
        if(left!==null&&cost){
          cost.innerHTML=left?chipHTML(`今夜あと${left}種`,'up'):chipHTML('今夜は遊び尽くした','');
          mgBtn.classList.toggle('ui-locked',left===0);
        }
      }
      const order=GROUPS.filter(g=>by[g.id]&&by[g.id].length);
      const frag=document.createDocumentFragment();
      const head=(g,half)=>{const h=document.createElement('div');h.className='ui-grp'+(half?' half':'')+(g.id==='special'?' special':'');
        h.innerHTML=`<span>${g.jp}</span><span class="ui-grp-en">${g.en}</span>`;return h;};
      for(let i=0;i<order.length;i++){
        const g=order[i],list=by[g.id],nx=order[i+1];
        // 1件だけのグループが2つ続いたら横に並べる
        if(list.length===1&&nx&&by[nx.id].length===1){
          frag.append(head(g,true),head(nx,true),list[0],by[nx.id][0]);
          list[0].classList.remove('ui-wide');by[nx.id][0].classList.remove('ui-wide');
          i++;continue;
        }
        frag.appendChild(head(g,false));
        list.forEach((b,j)=>{b.classList.toggle('ui-wide',list.length%2===1&&j===0);frag.appendChild(b);});
      }
      ca.appendChild(frag);
    }else{
      btns.forEach(b=>b.classList.add('ui-wide'));
    }
    // 出現アニメ
    if(!reduced()){
      [...ca.querySelectorAll(':scope > .choice-btn')].forEach((b,i)=>{
        b.classList.remove('ui-enter');void b.offsetWidth;
        b.style.animationDelay=(i*22)+'ms';b.classList.add('ui-enter');
      });
    }
    // カーソル位置：前回選んだ行動 → 先頭
    const items=[...ca.querySelectorAll(':scope > .choice-btn')];
    const pick=(isMenu&&lastAc&&items.find(b=>b.dataset.ac===lastAc))||items[0];
    if(pick&&NAV.ctx&&NAV.ctx.id==='game'){NAV.set(pick,false);}
    NAV.remember('game',pick);
    ca.scrollTop=0;
    updateMore();
  }finally{enhancing=false;}
}
/* メニューに続きがあるか（▼表示） */
function updateMore(){
  const ca=$('choices-area');if(!ca)return;
  ca.classList.toggle('ui-more',ca.scrollHeight-ca.scrollTop-ca.clientHeight>8);
}
/* 選択時：最後の行動を記録＋押し込み */
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('#choices-area .choice-btn');
  if(b&&b.dataset.ac)lastAc=b.dataset.ac;
},true);

/* 後から足された選択肢（他モジュール）も見た目だけ整える */
function observeChoices(){
  const ca=$('choices-area');if(!ca||!window.MutationObserver)return;
  new MutationObserver(()=>{
    if(enhancing)return;
    ca.querySelectorAll(':scope > .choice-btn:not([data-ui])').forEach(b=>{richButton(b,acFor(b));if(ca.classList.contains('ui-grid'))b.classList.add('ui-wide');});
  }).observe(ca,{childList:true});
}
function observeStream(){
  const sc=$('str-choices');if(!sc||!window.MutationObserver)return;
  const run=()=>{
    sc.querySelectorAll('.sc:not([data-ui]),.str-type-btn:not([data-ui])').forEach(b=>{
      const tx=b.textContent;b.dataset.ui='1';b.dataset.tx=tx;
      const p=parseTx(tx);
      let label=p.label,chips=p.costs.map(c=>chipHTML(c)).join('');
      const bm=label.match(/^(【[^】]*】)\s*([\s\S]+)$/);
      if(bm){label=bm[2];chips=chipHTML(bm[1].replace(/[【】]/g,''),'warn')+chips;}
      b.innerHTML=`<span class="ui-rich">${p.icon?`<span class="cb-ico" aria-hidden="true">${esc(p.icon)}</span>`:''}<span class="cb-main"><span class="cb-lbl">${esc(label)}</span>${chips?`<span class="cb-cost">${chips}</span>`:''}</span></span>`;
      b.setAttribute('aria-label',tx);
    });
    const first=sc.querySelector('button');
    if(first)NAV.remember('stream',first);
  };
  new MutationObserver(run).observe(sc,{childList:true});
}

/* ══════════════════════════════════════════
   3. ゆびカーソル＆キー操作
   ══════════════════════════════════════════ */
const ITEM_SEL='button,.sk-card,.set-row';
const BLOCKERS=['mg-screen','factory-mini','diag-mini','song-mini'];
const isActive=el=>el&&el.classList.contains('active');
const notHidden=el=>el&&!el.classList.contains('hidden');
const CTX=[
  {id:'share',   el:'share-panel', open:isActive, close:'closeSharePanel'},
  {id:'ending',  el:'ending-sc',   open:isActive, kbdOnly:true},
  {id:'tutorial',el:'tutorial-sc', open:isActive, close:()=>{if(typeof tutorialStep==='function')tutorialStep(999);}},
  {id:'settings',el:'settings-sc', open:isActive, close:'closeSettings'},
  {id:'endlist', el:'endlist-sc',  open:isActive, close:'closeEndingList'},
  {id:'event',   el:'ev-popup',    open:isActive, close:'closeEvent'},
  {id:'result',  el:'result-sc',   open:isActive, close:'closeResult'},
  {id:'mgpick',  el:'mg-picker',   open:isActive, close:'closeMinigamePicker'},
  {id:'skill',   el:'skill-sc',    open:isActive, close:'closeSkill'},
  {id:'status',  el:'status-sc',   open:isActive, close:'closeStatus'},
  {id:'stream',  el:'streaming-ol',open:isActive, items:'#str-choices button'},
  {id:'game',    el:'game-screen', open:notHidden, items:'#choices-area .choice-btn,.bottom-nav .nav-btn', close:'openSettings'},
  {id:'story',   el:'story-screen',open:notHidden, kbdOnly:true},
  {id:'title',   el:'title-screen',open:notHidden, kbdOnly:true},
];
/* ゆびのドット絵（16×11） */
const HAND_PX=[
  '..OOOOO.........',
  '.OWWWWWOOOOOOOO.',
  'OWWWWWWWWWWWWWWO',
  'OWWWWWWOOOOOOOO.',
  'OWWWWWWWO.......',
  'OWWWWWWO........',
  'OWWWWWWWO.......',
  'OSWWWWWO........',
  'OSSWWWWWO.......',
  '.OSSSSSO........',
  '..OOOOO.........',
];
function handSVG(){
  const col={O:'#140b2e',W:'#ffffff',S:'#b9b0dc'};let r='';
  HAND_PX.forEach((row,y)=>{[...row].forEach((c,x)=>{if(col[c])r+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${col[c]}"/>`;});});
  return `<svg viewBox="0 0 16 11" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${r}</svg>`;
}
const INSIDE=/(^|\s)(choice-btn|sc|str-type-btn|sk-card|ev-btn|mg-pick|set-row|nav-btn|btn-start|mini-endbtn)(\s|$)/;

const NAV={
  ctx:null,cur:null,kbd:false,mem:{},hand:null,
  topCtx(){
    for(const id of BLOCKERS){if(isActive($(id)))return null;}
    if(document.body.classList.contains('mg-active'))return null;
    // 他モジュールのモーダル（aria-modal）が出ている間は何もしない
    for(const m of document.querySelectorAll('[aria-modal="true"]')){
      const cs=getComputedStyle(m);
      if(cs.display!=='none'&&cs.visibility!=='hidden'&&cs.pointerEvents!=='none'&&+cs.opacity>.05)return null;
    }
    if($('live-intro')?.classList.contains('show'))return null;
    for(const c of CTX){const el=$(c.el);if(el&&c.open(el))return c;}
    return null;
  },
  items(c){
    c=c||this.ctx;if(!c)return [];
    const root=$(c.el);if(!root)return [];
    const list=c.items?document.querySelectorAll(c.items):root.querySelectorAll(ITEM_SEL);
    return [...list].filter(el=>{
      if(el.disabled)return false;
      if(c.items&&!root.contains(el))return false;
      if(el.closest('.set-row')&&el!==el.closest('.set-row'))return false;
      if(el.matches('.sk-card.maxed'))return false;
      const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;
      const cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none';
    });
  },
  remember(id,el){if(el)this.mem[id]=el;},
  set(el,fromKey){
    if(this.cur===el){if(fromKey)this.scroll(el);return;}
    if(this.cur)this.cur.classList.remove('ui-cur');
    this.cur=el;
    if(el){
      el.classList.add('ui-cur');
      if(this.ctx)this.mem[this.ctx.id]=el;
      if(fromKey){this.scroll(el);se('comment');}
    }
  },
  scroll(el){try{el.scrollIntoView({block:'nearest',inline:'nearest',behavior:reduced()?'auto':'smooth'});}catch(e){}},
  /* 方向キー：画面上の位置で一番近い項目へ */
  move(dir){
    const items=this.items();if(!items.length)return;
    let cur=this.cur&&items.includes(this.cur)?this.cur:null;
    if(!cur){this.set(items[0],true);return;}
    const a=cur.getBoundingClientRect();
    const ax=a.left+a.width/2,ay=a.top+a.height/2;
    let best=null,bs=Infinity;
    for(const el of items){
      if(el===cur)continue;
      const b=el.getBoundingClientRect();
      const bx=b.left+b.width/2,by=b.top+b.height/2;
      let p,s;
      if(dir==='down'){if(b.top<a.bottom-4)continue;p=b.top-a.bottom;s=Math.abs(bx-ax);}
      else if(dir==='up'){if(b.bottom>a.top+4)continue;p=a.top-b.bottom;s=Math.abs(bx-ax);}
      else if(dir==='right'){if(b.left<a.right-4||b.bottom<a.top+2||b.top>a.bottom-2)continue;p=b.left-a.right;s=Math.abs(by-ay);}
      else{if(b.right>a.left+4||b.bottom<a.top+2||b.top>a.bottom-2)continue;p=a.left-b.right;s=Math.abs(by-ay);}
      const score=Math.max(0,p)+s*1.6;
      if(score<bs){bs=score;best=el;}
    }
    if(!best&&(dir==='down'||dir==='up')){best=dir==='down'?items[0]:items[items.length-1];}
    if(best)this.set(best,true);
  },
  activate(el){
    if(!el)return;
    el.classList.add('ui-press');setTimeout(()=>el.classList.remove('ui-press'),140);
    if(el.matches('.set-row'))return;
    const r=el.getBoundingClientRect();
    el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
  },
  /* 毎フレーム：文脈の切替とゆびの位置合わせ */
  tick(){
    const c=this.topCtx();
    if(c!==this.ctx){
      this.ctx=c;this.moved=false;
      if(this.cur){this.cur.classList.remove('ui-cur');this.cur=null;}
    }
    let el=this.cur;
    if(c){
      const root=$(c.el);
      if(!el||!el.isConnected||!root.contains(el)||el.disabled){
        const items=this.items(c);
        const m=this.mem[c.id];
        el=(m&&m.isConnected&&items.includes(m))?m:items[0]||null;
        if(el!==this.cur)this.set(el,false);
      }
    }
    const h=this.hand;
    const show=el&&c&&(!c.kbdOnly||this.kbd);
    if(show){
      const r=el.getBoundingClientRect();
      const cy=r.top+Math.min(r.height/2,26);
      const hit=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),Math.min(innerHeight-1,Math.max(0,r.top+r.height/2)));
      const visible=r.width>0&&hit&&(hit===el||el.contains(hit));
      if(visible){
        const inside=INSIDE.test(el.className)||r.left<20;
        const x=inside?r.left+3:r.left-19;
        h.style.transform=`translate(${Math.round(x)}px,${Math.round(cy-6)}px)`;
        h.classList.add('on');
      }else h.classList.remove('on');
    }else h.classList.remove('on');
    raf(()=>this.tick());
  },
  init(){
    const h=document.createElement('div');h.id='ui-hand';h.setAttribute('aria-hidden','true');h.innerHTML=handSVG();
    document.body.appendChild(h);this.hand=h;
    // キー操作中のスクロールで起きる pointerover は無視する（実際にマウスが動いたときだけ追従）
    let lx=-1,ly=-1;
    document.addEventListener('pointermove',e=>{
      if(Math.abs(e.clientX-lx)+Math.abs(e.clientY-ly)>3){
        this.moved=true;
        if(lx>=0&&this.kbd&&e.pointerType==='mouse'){this.kbd=false;const it=e.target.closest&&e.target.closest(ITEM_SEL);if(it&&this.ctx&&$(this.ctx.el).contains(it)&&this.items(this.ctx).includes(it))this.set(it,false);}
        lx=e.clientX;ly=e.clientY;
      }
    },{passive:true});
    document.addEventListener('pointerover',e=>{
      if(this.kbd)return;
      if(e.pointerType==='mouse'&&!this.moved)return;   // 画面が開いた直後の「下にあっただけ」のホバーは無視
      const c=this.ctx;if(!c||!e.target.closest)return;
      const it=e.target.closest(ITEM_SEL);
      if(it&&$(c.el).contains(it)&&this.items(c).includes(it))this.set(it,false);
    });
    document.addEventListener('focusin',e=>{
      const c=this.ctx;if(!c)return;
      const it=e.target.closest&&e.target.closest(ITEM_SEL);
      if(it&&$(c.el).contains(it))this.set(it,false);
    });
    document.addEventListener('pointerdown',()=>{this.kbd=false;},true);
    document.addEventListener('keydown',e=>this.key(e));
    raf(()=>this.tick());
  },
  key(e){
    if(e.defaultPrevented||e.isComposing||e.altKey||e.ctrlKey||e.metaKey)return;
    const t=e.target;
    if(t&&((t.tagName==='INPUT'&&t.type!=='range')||t.tagName==='TEXTAREA'||t.isContentEditable))return;
    const c=this.topCtx();if(!c)return;
    if(c!==this.ctx){this.ctx=c;}
    // 未知のオーバーレイに覆われていたら触らない
    const probe=this.cur&&$(c.el).contains(this.cur)?this.cur:this.items(c)[0];
    if(probe){
      const r=probe.getBoundingClientRect();
      const hit=document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left+r.width/2)),Math.min(innerHeight-1,Math.max(0,r.top+Math.min(r.height/2,20))));
      if(hit&&!$(c.el).contains(hit)&&!hit.closest('#notif-stack,#cutin-wrap'))return;
    }
    const k=e.key;
    const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[k];
    const ok=k==='Enter'||k===' '||k==='z'||k==='Z';
    const back=k==='Escape'||k==='x'||k==='X';
    if(!dir&&!ok&&!back)return;
    this.kbd=true;
    // 設定のスライダー：←→で値を変える
    if((dir==='left'||dir==='right')&&this.cur&&this.cur.matches('.set-row')){
      const inp=this.cur.querySelector('input[type=range]');
      if(inp){
        e.preventDefault();
        const st=+inp.step||1,v=Math.max(+inp.min,Math.min(+inp.max,+inp.value+(dir==='right'?st:-st)));
        inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));
        return;
      }
    }
    if(dir){e.preventDefault();this.move(dir);return;}
    if(ok){
      // メッセージ表示中なら全文を出すだけ
      if(c.id==='game'&&skipTyping()){e.preventDefault();return;}
      const items=this.items(c);
      const el=this.cur&&items.includes(this.cur)?this.cur:null;
      if(!el){if(items[0]){e.preventDefault();this.set(items[0],true);}return;}
      e.preventDefault();
      if(document.activeElement&&document.activeElement!==document.body)try{document.activeElement.blur();}catch(_){}
      this.activate(el);
      return;
    }
    if(back&&c.close){
      const fn=typeof c.close==='function'?c.close:window[c.close];
      if(typeof fn==='function'){e.preventDefault();if(c.id!=='game')se('back');fn();}
    }
  },
};

/* ══════════════════════════════════════════
   4. HUD（上部バー）
   ══════════════════════════════════════════ */
function moonSVG(day){
  const t=((day+2)%30)/30;                 // 1日目は三日月から
  const r=7,c=8;
  const off=t<.5?-(t*2)*2*r:(1-(t-.5)*2)*2*r;  // 影の円のずれ
  return `<svg class="ui-moon" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs><mask id="uiMoonMask"><rect width="16" height="16" fill="#fff"/><circle cx="${(c+off).toFixed(2)}" cy="${c}" r="${r}" fill="#000"/></mask></defs>
    <circle cx="${c}" cy="${c}" r="${r}" fill="#211a48" stroke="#4a3c86" stroke-width=".8"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="#ffeaa6" mask="url(#uiMoonMask)"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(255,240,190,.35)" stroke-width=".6"/></svg>`;
}
const HUD={
  built:false,lastDay:null,moonEl:null,
  build(){
    if(this.built)return;
    const dayCell=document.querySelector('.top-bar .top-day');
    const num=$('tb-day');
    if(dayCell&&num){
      const sub=dayCell.querySelector('.top-day-sub');
      const moon=document.createElement('span');moon.className='ui-moonwrap';
      const box=document.createElement('div');box.className='ui-daybox';
      const lbl=document.createElement('span');lbl.className='ui-daylbl';lbl.textContent='DAY';
      const row=document.createElement('div');row.className='ui-dayrow';
      row.append(num);if(sub)row.append(sub);
      box.append(lbl,row);
      dayCell.innerHTML='';dayCell.append(moon,box);
      this.moonEl=moon;
    }
    [['tb-mental','g-mental'],['tb-fatigue','g-fatigue']].forEach(([id,gid])=>{
      const v=$(id);if(!v)return;const cell=v.parentElement;
      cell.classList.add('ui-gcell');
      const g=document.createElement('div');g.className='ui-gauge';g.id='ui-'+gid;
      g.setAttribute('role','meter');g.setAttribute('aria-valuemin','0');g.setAttribute('aria-valuemax','100');
      g.innerHTML='<i></i><b></b>';cell.appendChild(g);
    });
    $('tb-rank')?.parentElement.classList.add('top-rank');
    this.built=true;
  },
  gauge(id,v,cls){
    const g=$(id);if(!g)return;
    const pct=Math.max(0,Math.min(100,v));
    g.querySelector('b').style.width=`calc(${pct}% - 2px)`;
    g.querySelector('i').style.width=`calc(${pct}% - 2px)`;
    g.className='ui-gauge '+cls;
    g.setAttribute('aria-valuenow',Math.round(pct));
  },
  update(){
    if(typeof gs==='undefined')return;
    this.build();
    const m=gs.mental,f=gs.fatigue;
    this.gauge('ui-g-mental',m,m<30?'g-bad':m<50?'g-warn':'g-pu');
    this.gauge('ui-g-fatigue',f,f>75?'g-bad':f>50?'g-warn':'g-ok');
    if(this.moonEl&&this.lastDay!==gs.day){
      this.moonEl.innerHTML=moonSVG(gs.day);
      if(this.lastDay!==null&&!reduced()){const n=$('tb-day');n.classList.remove('ui-pop');void n.offsetWidth;n.classList.add('ui-pop');}
      this.lastDay=gs.day;
    }
    track('tb-mental',false,true);
    track('tb-fatigue',true,true);
    track('tb-money',false,true);
    track('tb-debt',true,false);
    track('tb-flame',true,false);
    // 今日の目標が変わったら差し替え演出
    const gt=$('daily-guide-text'),gb=$('daily-guide');
    if(gt&&gb&&gb.dataset.last!==gt.textContent){
      if(gb.dataset.last!==undefined&&!reduced()){gb.classList.remove('ui-swap');void gb.offsetWidth;gb.classList.add('ui-swap');}
      gb.dataset.last=gt.textContent;
    }
  },
};

/* 数値のカウントアップ／ダウン＋フラッシュ */
const TW={};
function parseNum(s){
  const m=String(s).match(/-?\d[\d,]*(\.\d+)?/);if(!m)return null;
  return {v:parseFloat(m[0].replace(/,/g,'')),dec:m[1]?m[1].length-1:0,comma:m[0].includes(',')||/[¥￥]/.test(s.slice(0,m.index)),pre:s.slice(0,m.index),post:s.slice(m.index+m[0].length)};
}
function fmtNum(p,v){
  const n=p.dec?v.toFixed(p.dec):String(Math.round(v));
  const body=p.comma?Number(n).toLocaleString(undefined,{minimumFractionDigits:p.dec,maximumFractionDigits:p.dec}):n;
  return p.pre+body+p.post;
}
function flash(el,good){
  const cls=good?'ui-flash-up':'ui-flash-down';
  el.classList.remove('ui-flash-up','ui-flash-down');void el.offsetWidth;el.classList.add(cls);
  clearTimeout(el._uiFl);el._uiFl=setTimeout(()=>el.classList.remove(cls),720);
}
function spawnDelta(el,diff,p,good){
  if(reduced()||!el.offsetParent)return;
  if(!NAV.ctx||NAV.ctx.id!=='game')return;
  const host=el.closest('.top-cell')||el;
  const r=host.getBoundingClientRect();if(r.width<1)return;
  const d=document.createElement('div');
  d.className='ui-delta '+(good?'up':'down');
  const abs=Math.abs(diff);
  d.textContent=(diff>0?'+':'-')+(p.pre.includes('¥')?'¥':'')+(p.comma?Math.round(abs).toLocaleString():(p.dec?abs.toFixed(p.dec):Math.round(abs)));
  d.style.left=(r.left+r.width/2)+'px';d.style.top=(r.bottom-6)+'px';
  document.body.appendChild(d);setTimeout(()=>d.remove(),1150);
}
function track(id,inverse,delta){
  const el=$(id);if(!el)return;
  const txt=el.textContent;const p=parseNum(txt);if(!p)return;
  let st=TW[id];
  if(!st){TW[id]={shown:p.v,target:p.v,final:txt,anim:false};return;}
  if(st.target===p.v){st.final=txt;if(st.anim)el.textContent=fmtNum(p,st.shown);return;}
  const from=st.anim?st.shown:st.target,diff=p.v-from;
  st.target=p.v;st.final=txt;
  const good=(diff>0)!==inverse;
  if(!document.getElementById('game-screen')?.classList.contains('hidden')){
    flash(el,good);if(delta)spawnDelta(el,diff,p,good);
  }
  if(reduced()){st.shown=p.v;return;}
  const t0=performance.now(),dur=Math.min(900,320+Math.abs(diff)*8);
  st.anim=true;const token=st.tok=(st.tok||0)+1;
  el.textContent=fmtNum(p,from);
  const step=now=>{
    if(st.tok!==token)return;
    const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);
    st.shown=from+diff*e;
    if(k<1){el.textContent=fmtNum(p,st.shown);raf(step);}
    else{st.anim=false;st.shown=st.target;el.textContent=st.final;}
  };
  raf(step);
}
/* 要素内の数字を0から数え上げる（リザルト等） */
function countUp(el,delay){
  const txt=el.textContent,p=parseNum(txt);if(!p||reduced()||p.v===0)return;
  el.textContent=fmtNum(p,0);
  setTimeout(()=>{
    const t0=performance.now(),dur=Math.min(800,300+Math.abs(p.v)*.05+120);
    const step=now=>{const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);
      if(k<1){el.textContent=fmtNum(p,p.v*e);raf(step);}else el.textContent=txt;};
    raf(step);
  },delay||0);
}

/* ══════════════════════════════════════════
   5. メッセージ窓（送り・スキップ）
   ══════════════════════════════════════════ */
let typing=null;
function skipTyping(){
  if(!typing||typing.done)return false;
  try{if(typeof _typingTimer!=='undefined'&&_typingTimer!==null){clearInterval(_typingTimer);_typingTimer=null;_typingLock=false;}}catch(e){}
  const el=$(typing.id);if(el)el.textContent=typing.text;
  typing.finish();
  return true;
}
function wrapTypeText(){
  const prev=window.typeText;if(typeof prev!=='function')return;
  window.typeText=function(id,text,cb){
    if(id!=='dlg-content')return prev.apply(this,arguments);
    const area=document.querySelector('.dialogue-area');
    const tok={id,text:String(text==null?'':text),done:false};
    tok.finish=function(){
      if(tok.done)return;tok.done=true;
      if(typing===tok){typing=null;area&&area.classList.remove('ui-typing');}
      if(typeof cb==='function')cb();
    };
    typing=tok;area&&area.classList.add('ui-typing');
    return prev.call(this,id,text,()=>tok.finish());
  };
  window.typeText._uiPrev=prev;
}

/* ══════════════════════════════════════════
   6. シーン切替（ディザ・フェード）
   ══════════════════════════════════════════ */
function wipe(){
  if(reduced())return;
  const gb=document.querySelector('#game-screen .game-body');if(!gb)return;
  if($('game-screen').classList.contains('hidden'))return;
  let w=$('ui-wipe');
  if(!w){w=document.createElement('div');w.id='ui-wipe';gb.appendChild(w);w.addEventListener('animationend',()=>w.classList.remove('go'));}
  w.classList.remove('go');void w.offsetWidth;w.classList.add('go');
}

/* ══════════════════════════════════════════
   7. 各画面
   ══════════════════════════════════════════ */
function buildResultBox(){
  const rs=$('result-sc');if(!rs||rs.querySelector('.ui-res-box'))return;
  const box=document.createElement('div');box.className='ui-res-box';
  while(rs.firstChild)box.appendChild(rs.firstChild);
  rs.appendChild(box);
}
const BLOCK_TAGS=/^(DIV|P|UL|OL|TABLE|SECTION|H\d)$/;
function enhanceResult(){
  const body=$('res-body');if(!body)return;
  if([...body.children].some(c=>BLOCK_TAGS.test(c.tagName)))return;
  const rows=[];let cur=[];
  [...body.childNodes].forEach(n=>{
    if(n.nodeName==='BR'){rows.push(cur);cur=[];}
    else cur.push(n);
  });
  rows.push(cur);
  const real=rows.filter(r=>r.some(n=>n.textContent.trim()));
  if(!real.length)return;
  body.innerHTML='';
  real.forEach((nodes,i)=>{
    const row=document.createElement('div');row.className='res-row';
    row.style.animationDelay=(120+i*110)+'ms';
    const val=nodes.find(n=>n.nodeType===1&&/(^|\s)(up|down)(\s|$)/.test(n.className));
    if(val){
      const l=document.createElement('span');l.className='res-l';
      nodes.filter(n=>n!==val).forEach(n=>l.appendChild(n));
      row.append(l,val);
      countUp(val,180+i*110);
    }else nodes.forEach(n=>row.appendChild(n));
    body.appendChild(row);
  });
}
function enhanceEvent(){
  const fx=$('ev-fx');if(!fx)return;
  const t=fx.textContent.trim();
  fx.style.display=t?'':'none';
  if(!t)return;
  const parts=t.split(/\s*[|｜]\s*/).filter(Boolean);
  fx.innerHTML=parts.map(c=>chipHTML(c)).join('');
  if(!reduced())[...fx.children].forEach((c,i)=>c.style.animationDelay=(160+i*70)+'ms');
}
function enhanceStatus(){
  const body=$('status-body');if(!body)return;
  if(reduced())return;
  const fills=[...body.querySelectorAll('.srf')];
  const ws=fills.map(f=>f.style.width);
  fills.forEach(f=>{f.style.transition='none';f.style.width='0';});
  void body.offsetWidth;
  fills.forEach((f,i)=>{f.style.transition='';f.style.transitionDelay=(80+i*25)+'ms';f.style.width=ws[i];});
  body.querySelectorAll('.srv').forEach((v,i)=>countUp(v,80+i*25));
  const sc=$('status-sc');if(sc)sc.scrollTop=0;
}
function enhanceSkill(){
  const body=$('skill-body');if(!body)return;
  const nosp=typeof gs!=='undefined'&&gs.sp<1;
  body.querySelectorAll('.sk-card').forEach(card=>{
    card.classList.toggle('ui-nosp',nosp);
    const lv=card.querySelector('.sk-lv');
    const m=lv&&lv.textContent.match(/Lv\.(\d+)\/(\d+)/);
    if(m&&!card.querySelector('.ui-pips')){
      const p=document.createElement('div');p.className='ui-pips';
      const n=+m[1],max=+m[2];
      p.innerHTML=Array.from({length:max},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('');
      lv.after(p);
    }
  });
  track('skill-sp',false,false);
}

/* クリック音（元の処理で音が鳴らないボタンだけ） */
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('.ev-btn,.ui-res-box .btn-start,.mini-endbtn,.sub-gear,.mg-tab,.mg-pick:not([disabled])');
  if(!b)return;
  se(/閉じる|戻る|終了/.test(b.textContent)?'back':'decide');
},true);

/* AudioContext は最初の操作で用意する（効果音を序盤から鳴らすため） */
const initAudio=()=>{try{if(typeof AU!=='undefined'&&!AU.ctx)AU.init();}catch(e){}};
document.addEventListener('pointerdown',initAudio,{once:true,capture:true});
document.addEventListener('keydown',initAudio,{once:true,capture:true});

/* メッセージ窓のタップで全文表示 */
document.addEventListener('click',e=>{
  if(e.target.closest&&e.target.closest('.dialogue-area'))skipTyping();
});

/* ══════════════════════════════════════════
   8. 関数を包む
   ══════════════════════════════════════════ */
function install(){
  HUD.build();
  buildResultBox();
  wrapTypeText();
  wrap('loadScene',(r,key)=>{
    if(key!==lastSceneKey&&lastSceneKey!==null)wipe();
    lastSceneKey=key;
    enhanceChoices(key);
  });
  wrap('updateStats',()=>HUD.update());
  wrap('updateDayInfo',()=>HUD.update());
  wrap('showResult',()=>{enhanceResult();se('notif');});
  wrap('showEvPopup',()=>{enhanceEvent();se('notif');});
  wrap('openStatus',()=>enhanceStatus());
  wrap('openSkill',()=>enhanceSkill());
  wrap('showNotif',(r,msg)=>{
    const st=$('notif-stack');const el=st&&st.lastElementChild;
    if(el&&/🚨|⚠️/.test(String(msg)))el.classList.add('ui-danger');
  });
  observeChoices();observeStream();
  $('choices-area')?.addEventListener('scroll',updateMore,{passive:true});
  window.addEventListener('resize',updateMore);
  NAV.init();
  // 既に表示中の画面があれば反映
  HUD.update();
  const ca=$('choices-area');if(ca&&ca.children.length)enhanceChoices('main');
}
/* buildChoices は最後に包んで（他モジュールの追加分を含む）最終結果を記録する */
function installLate(){
  wrap('buildChoices',r=>{lastChoiceList=Array.isArray(r)?r:null;});
}

install();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installLate,{once:true});
else setTimeout(installLate,0);

/* 他モジュール向け */
window.UI={
  wrap,                          // UI.wrap(name, after, before)
  enhanceChoices,                // 選択肢を作り直したときに呼ぶと見た目を整える
  skipTyping,                    // メッセージを全文表示（表示中なら true）
  wipe,                          // シーン切替演出を手動で出す
  chip:chipHTML,                 // 効果チップのHTML
  setCursor:el=>NAV.set(el,true),// ゆびカーソルを任意の要素へ
};
})();
