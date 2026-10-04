// ══════════════════════════════════════════════════════════
// ホーム画面に追加・オフライン対応（sw.js の登録と「新しいバージョン」のお知らせ）
// ・https か localhost のときだけ登録する（file:// や http の公開先では何もしない）
// ・バランスシミュレーター（tools/simulator.html の iframe）など、枠の中では登録しない
// ・新しい sw.js が待機したら「新しいバージョンがあります・更新」を出し、押したら切り替えて再読み込み
// ══════════════════════════════════════════════════════════
(function(){
  'use strict';
  const inFrame=(()=>{try{return window.self!==window.top;}catch(e){return true;}})();
  const secure=location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1';
  if(inFrame||!secure||!('serviceWorker' in navigator))return;

  const css=`
#pwa-toast{position:fixed;left:50%;bottom:calc(64px + env(safe-area-inset-bottom,0px));transform:translate(-50%,16px);z-index:400;display:flex;align-items:center;gap:10px;
  max-width:calc(100vw - 32px);box-sizing:border-box;padding:9px 10px 9px 14px;border:1px solid rgba(232,184,48,.7);border-radius:6px;background:rgba(10,8,32,.97);
  box-shadow:0 6px 24px rgba(0,0,0,.6);color:#deccf8;font-family:'DotGothic16',sans-serif;font-size:.78rem;letter-spacing:.04em;opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;}
#pwa-toast.on{opacity:1;transform:translate(-50%,0);pointer-events:auto;}
#pwa-toast button{flex:none;min-height:34px;padding:4px 12px;border-radius:4px;font:inherit;cursor:pointer;}
#pwa-toast .pwa-go{background:#e8b830;color:#1a1206;border:1px solid #e8b830;font-weight:bold;}
#pwa-toast .pwa-x{background:transparent;color:#a59fb8;border:1px solid rgba(165,159,184,.4);padding:4px 9px;}
@media (prefers-reduced-motion:reduce){#pwa-toast{transition:none;}}`;

  let reloading=false;
  function showUpdate(reg){
    if(!reg||!reg.waiting||document.getElementById('pwa-toast'))return;
    const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    const t=document.createElement('div');t.id='pwa-toast';t.setAttribute('role','status');
    t.innerHTML='<span>新しいバージョンがあります</span><button class="pwa-go" type="button">更新</button><button class="pwa-x" type="button" aria-label="あとで">×</button>';
    document.body.appendChild(t);
    requestAnimationFrame(()=>t.classList.add('on'));
    t.querySelector('.pwa-go').onclick=()=>{
      t.querySelector('.pwa-go').disabled=true;
      // セーブ前に切り替えるとプレイ中の内容が消えるので、可能なら保存してから
      // （本編の画面で、ミニゲーム中でないときだけ。状態画面の「セーブ」と同じ扱い）
      try{
        const gsEl=document.getElementById('game-screen');
        if(typeof saveGame==='function'&&typeof gs!=='undefined'&&gs&&gs.day&&gsEl&&!gsEl.classList.contains('hidden')&&!document.body.classList.contains('mg-active'))saveGame(true);
      }catch(e){}
      if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
      else location.reload();
    };
    t.querySelector('.pwa-x').onclick=()=>{t.classList.remove('on');setTimeout(()=>t.remove(),250);};
  }
  // 新しい sw.js が制御を引き継いだら1回だけ再読み込み（更新ボタンを押したときだけ）
  let wantReload=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(wantReload&&!reloading){reloading=true;location.reload();}});

  function register(){
    navigator.serviceWorker.register('sw.js',{scope:'./'}).then(reg=>{
      window.__pwaReg=reg;
      const watch=w=>{if(!w)return;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdate(reg);});};
      if(reg.waiting&&navigator.serviceWorker.controller)showUpdate(reg);
      watch(reg.installing);
      reg.addEventListener('updatefound',()=>watch(reg.installing));
      // 開いたままでも時々更新を確かめる（1時間ごと・表に出ているときだけ）
      setInterval(()=>{if(!document.hidden)reg.update().catch(()=>{});},3600*1000);
    }).catch(e=>console.warn('[pwa] service worker の登録に失敗',e));
  }
  // 更新ボタン → SKIP_WAITING → controllerchange で再読み込み
  document.addEventListener('click',e=>{if(e.target&&e.target.closest&&e.target.closest('#pwa-toast .pwa-go'))wantReload=true;},true);
  if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
})();
