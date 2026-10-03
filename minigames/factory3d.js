// ══════════════════════════════════════════════════════════
// 3Dアクション「夜勤の第三工場」
// 停電した夜の工場を懐中電灯ひとつで歩き、計器5か所を点検して非常口へ。
// 闇の中を「影」がうろつく。ライトで照らすと退くが、暗がりでは近づいてくる。
// three.js（vendor/three.min.js）を loadThree() で読み込む。
// ══════════════════════════════════════════════════════════
addMinigameStyle('factory3d',`
.mg-factory3d{background:#020208;}
.factory3d-wrap{position:absolute;inset:0;overflow:hidden;background:#020208;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;}
.factory3d-wrap canvas{position:absolute;left:0;top:0;width:100%!important;height:100%!important;display:block;}
.factory3d-wrap.factory3d-hit canvas{filter:contrast(1.6) saturate(1.8) hue-rotate(-30deg) blur(1.4px);animation:factory3d-warp .42s steps(5) infinite;}
@keyframes factory3d-warp{0%{transform:none}20%{transform:translate(-7px,2px) skewX(4deg)}40%{transform:translate(6px,-3px) skewX(-5deg) scale(1.04)}60%{transform:translate(-3px,5px) skewY(2deg)}80%{transform:translate(4px,0) scale(1.02)}100%{transform:none}}
.factory3d-lay{position:absolute;inset:0;pointer-events:none;}
.factory3d-vig{background:radial-gradient(ellipse 75% 70% at 50% 50%,rgba(0,0,0,0) 40%,rgba(3,2,10,.55) 72%,rgba(0,0,0,.94) 100%);}
.factory3d-grain{inset:-60%;opacity:.13;mix-blend-mode:screen;background-size:160px 160px;animation:factory3d-grain .6s steps(6) infinite;}
@keyframes factory3d-grain{0%{transform:translate(0,0)}17%{transform:translate(-7%,4%)}33%{transform:translate(5%,-6%)}50%{transform:translate(-3%,7%)}67%{transform:translate(7%,2%)}83%{transform:translate(-5%,-4%)}100%{transform:translate(0,0)}}
.factory3d-scan{background:repeating-linear-gradient(0deg,rgba(0,0,0,.16) 0 1px,rgba(0,0,0,0) 1px 3px);opacity:.55;}
.factory3d-red{background:radial-gradient(ellipse at 50% 50%,rgba(232,48,85,0) 25%,rgba(150,10,40,.55) 70%,rgba(60,0,20,.95) 100%);opacity:0;}
.factory3d-flash{background:#c8d4ff;opacity:0;mix-blend-mode:screen;}
.factory3d-dark{background:#000;opacity:0;}
.factory3d-hud{position:absolute;inset:0;pointer-events:none;font-family:var(--dot);color:var(--tx-b);z-index:3;}
.factory3d-bat{position:absolute;left:10px;top:9px;display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:.68rem;color:#c8fff5;text-shadow:0 0 6px rgba(0,232,200,.6);}
.factory3d-bat .factory3d-cell{position:relative;width:62px;height:14px;border:1.5px solid rgba(200,255,245,.75);border-radius:3px;padding:1px;box-shadow:0 0 8px rgba(0,232,200,.3);}
.factory3d-bat .factory3d-cell:after{content:'';position:absolute;right:-5px;top:3px;width:3px;height:6px;background:rgba(200,255,245,.75);border-radius:0 2px 2px 0;}
.factory3d-bat .factory3d-cell i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#00b8a0,#00e8c8);border-radius:1px;transition:width .2s,background .3s;}
.factory3d-bat.mid i{background:linear-gradient(90deg,#b88a10,#e8b830)!important;}
.factory3d-bat.low{color:#ffb0c0;text-shadow:0 0 6px rgba(232,48,85,.8);animation:factory3d-blink .6s steps(2) infinite;}
.factory3d-bat.low i{background:linear-gradient(90deg,#a01030,#e83055)!important;}
@keyframes factory3d-blink{50%{opacity:.45}}
.factory3d-chk{position:absolute;right:10px;top:9px;display:flex;gap:4px;align-items:center;font-size:.6rem;color:var(--tx);}
.factory3d-chk span{width:13px;height:13px;border-radius:50%;border:1.5px solid rgba(232,184,48,.7);display:flex;align-items:center;justify-content:center;font-size:.55rem;color:transparent;box-shadow:0 0 6px rgba(232,184,48,.25);}
.factory3d-chk span.ok{background:#44ee88;border-color:#44ee88;color:#04140a;box-shadow:0 0 8px rgba(68,238,136,.7);}
.factory3d-nav{position:absolute;left:50%;top:32px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;font-size:.62rem;color:#ffe9a8;text-shadow:0 0 6px rgba(232,184,48,.7);background:rgba(5,4,14,.45);padding:2px 9px 2px 6px;border-radius:10px;border:1px solid rgba(232,184,48,.25);white-space:nowrap;}
.factory3d-nav b{display:inline-block;font-size:.8rem;line-height:1;color:#e8b830;}
.factory3d-nav.exit{color:#b8ffd2;text-shadow:0 0 6px rgba(68,238,136,.8);border-color:rgba(68,238,136,.35);}
.factory3d-nav.exit b{color:#44ee88;}
.factory3d-cross{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px 0 0 -2px;border-radius:50%;background:rgba(222,204,248,.7);box-shadow:0 0 4px rgba(222,204,248,.6);}
.factory3d-ring{position:absolute;left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;opacity:0;transition:opacity .15s;}
.factory3d-ring.on{opacity:1;}
.factory3d-ring circle{fill:none;stroke-width:4;}
.factory3d-prompt{position:absolute;left:50%;top:calc(50% + 40px);transform:translateX(-50%);font-size:.66rem;color:#ffe9a8;text-shadow:0 0 8px rgba(232,184,48,.8),0 0 2px #000;opacity:0;transition:opacity .15s;white-space:nowrap;}
.factory3d-prompt.on{opacity:1;}
.factory3d-toast{position:absolute;left:50%;top:27%;transform:translateX(-50%);font-size:.9rem;letter-spacing:.06em;white-space:nowrap;color:#deccf8;text-shadow:0 0 10px rgba(138,82,212,.9),0 0 2px #000;opacity:0;}
.factory3d-toast.ok{color:#b8ffd2;text-shadow:0 0 12px rgba(68,238,136,.9),0 0 2px #000;}
.factory3d-toast.bad{color:#ffb0c0;text-shadow:0 0 12px rgba(232,48,85,.95),0 0 2px #000;}
.factory3d-toast.show{animation:factory3d-toast 2.2s ease-out forwards;}
@keyframes factory3d-toast{0%{opacity:0;transform:translate(-50%,8px) scale(.94)}10%{opacity:1;transform:translate(-50%,0) scale(1)}78%{opacity:1}100%{opacity:0;transform:translate(-50%,-6px)}}
.factory3d-joy{position:absolute;width:104px;height:104px;margin:-52px 0 0 -52px;border-radius:50%;border:1.5px solid rgba(0,232,200,.35);background:radial-gradient(circle,rgba(0,232,200,.08),rgba(0,0,0,.25));pointer-events:none;opacity:0;transition:opacity .15s;z-index:4;}
.factory3d-joy.on{opacity:1;}
.factory3d-joy i{position:absolute;left:50%;top:50%;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(200,255,245,.55),rgba(0,140,120,.45));border:1px solid rgba(200,255,245,.6);box-shadow:0 0 12px rgba(0,232,200,.45);}
.factory3d-joyhint{position:absolute;left:18px;bottom:20px;width:84px;height:84px;border-radius:50%;border:1.5px dashed rgba(0,232,200,.22);pointer-events:none;z-index:2;display:flex;align-items:center;justify-content:center;font-size:.55rem;color:rgba(200,255,245,.35);font-family:var(--dot);}
.factory3d-act{position:absolute;right:16px;bottom:20px;width:78px;height:78px;border-radius:50%;z-index:5;touch-action:none;
  border:1.5px solid rgba(232,184,48,.55);background:radial-gradient(circle at 45% 35%,rgba(90,70,20,.75),rgba(14,10,24,.88));
  color:#ffe9a8;font-family:var(--dot);font-size:.72rem;line-height:1.15;text-align:center;cursor:pointer;
  box-shadow:0 0 10px rgba(232,184,48,.25),inset 0 0 10px rgba(232,184,48,.15);-webkit-tap-highlight-color:transparent;transition:box-shadow .2s,transform .08s,opacity .2s;}
.factory3d-act small{display:block;font-size:.5rem;color:rgba(255,233,168,.6);font-family:var(--mono);}
.factory3d-act.ready{border-color:#e8b830;box-shadow:0 0 18px rgba(232,184,48,.75),inset 0 0 14px rgba(232,184,48,.35);animation:factory3d-pulse 1s ease-in-out infinite;}
.factory3d-act.held{transform:scale(.93);}
@keyframes factory3d-pulse{50%{box-shadow:0 0 26px rgba(232,184,48,.95),inset 0 0 18px rgba(232,184,48,.45);}}
.factory3d-ov{position:absolute;inset:0;z-index:8;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:18px;text-align:center;
  background:radial-gradient(ellipse at 50% 45%,rgba(20,12,40,.82),rgba(2,1,8,.95));font-family:var(--dot);color:var(--tx);transition:opacity .5s;}
.factory3d-ov.hide{opacity:0;pointer-events:none;}
.factory3d-ov h3{margin:0;font-weight:normal;font-size:1.05rem;color:var(--tx-b);letter-spacing:.12em;text-shadow:0 0 12px rgba(138,82,212,.9);}
.factory3d-ov .factory3d-sub{font-family:var(--mono);font-size:.6rem;color:var(--tx-d);letter-spacing:.2em;}
.factory3d-ov ul{list-style:none;margin:4px 0;padding:0;font-size:.7rem;line-height:1.75;text-align:left;}
.factory3d-ov ul b{color:var(--gd);font-weight:normal;}
.factory3d-ov ul em{color:var(--rd);font-style:normal;}
.factory3d-ov ul i{color:var(--gn);font-style:normal;}
.factory3d-ov ul u{color:var(--cy);text-decoration:none;}
.factory3d-ov .factory3d-keys{font-size:.58rem;color:var(--tx-d);border-top:1px solid rgba(138,82,212,.3);padding-top:6px;}
.factory3d-ov .factory3d-bar{width:150px;height:3px;background:rgba(138,82,212,.25);border-radius:2px;overflow:hidden;}
.factory3d-ov .factory3d-bar i{display:block;height:100%;width:0;background:var(--pu);box-shadow:0 0 6px var(--pu);}
.factory3d-ov .factory3d-bar.run i{animation:factory3d-bar 3s linear forwards;}
@keyframes factory3d-bar{to{width:100%}}
.factory3d-ov button{margin-top:6px;padding:6px 16px;border-radius:8px;border:1px solid var(--rd);background:rgba(232,48,85,.15);color:#ffd0da;font-family:var(--dot);font-size:.75rem;cursor:pointer;}
.factory3d-load{font-size:.8rem;color:var(--tx-b);letter-spacing:.2em;animation:factory3d-blink 1.1s steps(2) infinite;}
`);

registerMinigame({
  id:'factory3d', icon:'🏭', name:'夜勤の第三工場', genre:'3Dアクション', bgm:'kaidan',
  desc:'停電した夜の第三工場。懐中電灯だけを頼りに計器5か所を点検し、非常口へ。闇の中を「影」がうろついている。',
  effect:'仕事評価↑ 資格知識↑ 収入↑ ／ 疲労+8 約70分',
  help:'左:移動 右:視点 点検:長押し／WASD・ドラッグ・E',
  start(body,mg){
    // ── 定数 ──
    const CELL=4, COLS=10, ROWS=15, HW=COLS*CELL/2, HD=ROWS*CELL/2;
    const FL_MAX=8,TIME_LIMIT=90, NEED=5, P_R=.36, EYE=1.62, SPEED=3.7;
    const SK=(gs&&gs.skills)||{};
    const HOLD_T=1.5*(1-Math.min(.3,((SK.soundDiag||0)+(SK.emergencyFix||0))*.03));
    const HIT_DMG=Math.round(30*(1-Math.min(.3,(SK.stressRes||0)*.03)));
    const rnd=(a,b)=>a+Math.random()*(b-a);
    const pick=a=>a[(Math.random()*a.length)|0];
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};
    const se=t=>{try{AU.se(t);}catch(e){}};

    // ── レイアウトのテンプレート（10列×15行、上が北＝非常口側、S＝スタート） ──
    // M:機械 T:タンク C:コンベア .:通路
    const TEMPLATES=[
      ['..........',
       '.MM.TT.MM.',
       '.MM....MM.',
       '..........',
       '.CCCC.CCC.',
       '..........',
       '.M.MM.M.M.',
       '.M....M.M.',
       '..........',
       'TT.MMMM.TT',
       '..........',
       '.CC.MM.CC.',
       '.CC....CC.',
       '..........',
       '....SS....'],
      ['..........',
       '.TT....TT.',
       '.TT.MM.TT.',
       '....MM....',
       '.MM....MM.',
       '.MM.C..MM.',
       '....C.....',
       '.T..C..T..',
       '.MM.C..MM.',
       '.MM....MM.',
       '....MM....',
       '.TT.MM.TT.',
       '.TT....TT.',
       '..........',
       '....SS....'],
      ['..........',
       '.MMM.MMMM.',
       '..........',
       '.C......T.',
       '.C.MMM..T.',
       '.C.MMM....',
       '.C......M.',
       '.C.T.T..M.',
       '.C......M.',
       '.C.MMMM...',
       '.C......T.',
       '.C.MM.MMT.',
       '..........',
       '.TT....MM.',
       '....SS....'],
    ];

    // ── 状態 ──
    const S={disposed:false,phase:'load',inspected:0,battery:100,hits:0,elapsed:0,timeLeft:TIME_LIMIT,picked:0,repels:0,endReason:null};
    let G=null;            // three.js 側の参照
    let ro=null;
    const offs=[];         // 解除するイベント
    const on=(el,ev,fn,opt)=>{el.addEventListener(ev,fn,opt);offs.push(()=>el.removeEventListener(ev,fn,opt));};

    // ── DOM ──
    const wrap=document.createElement('div');
    wrap.className='factory3d-wrap';
    wrap.innerHTML=`
      <div class="factory3d-lay factory3d-flash"></div>
      <div class="factory3d-lay factory3d-scan"></div>
      <div class="factory3d-lay factory3d-grain"></div>
      <div class="factory3d-lay factory3d-vig"></div>
      <div class="factory3d-lay factory3d-red"></div>
      <div class="factory3d-lay factory3d-dark"></div>
      <div class="factory3d-hud">
        <div class="factory3d-bat"><span>🔦</span><div class="factory3d-cell"><i></i></div><span class="factory3d-pct">100%</span></div>
        <div class="factory3d-chk"><span>✓</span><span>✓</span><span>✓</span><span>✓</span><span>✓</span></div>
        <div class="factory3d-nav"><b>▲</b><span>計器</span></div>
        <div class="factory3d-cross"></div>
        <svg class="factory3d-ring" viewBox="0 0 62 62"><circle cx="31" cy="31" r="26" stroke="rgba(232,184,48,.25)"/><circle class="factory3d-prog" cx="31" cy="31" r="26" stroke="#e8b830" stroke-dasharray="163.4" stroke-dashoffset="163.4" transform="rotate(-90 31 31)" stroke-linecap="round"/></svg>
        <div class="factory3d-prompt">長押しで点検</div>
        <div class="factory3d-toast"></div>
      </div>
      <div class="factory3d-joyhint">移動</div>
      <div class="factory3d-joy"><i></i></div>
      <button class="factory3d-act" type="button">点検<small>HOLD / E</small></button>
      <div class="factory3d-ov factory3d-loadov"><div class="factory3d-load">読み込み中…</div></div>`;
    body.appendChild(wrap);
    const $=s=>wrap.querySelector(s);
    const el={
      flash:$('.factory3d-flash'),red:$('.factory3d-red'),dark:$('.factory3d-dark'),grain:$('.factory3d-grain'),
      bat:$('.factory3d-bat'),batI:$('.factory3d-cell i'),pct:$('.factory3d-pct'),chk:[...wrap.querySelectorAll('.factory3d-chk span')],
      nav:$('.factory3d-nav'),navB:$('.factory3d-nav b'),navT:$('.factory3d-nav span'),
      ring:$('.factory3d-ring'),prog:$('.factory3d-prog'),prompt:$('.factory3d-prompt'),toast:$('.factory3d-toast'),
      joy:$('.factory3d-joy'),knob:$('.factory3d-joy i'),joyhint:$('.factory3d-joyhint'),act:$('.factory3d-act'),load:$('.factory3d-loadov'),
    };
    // フィルムグレイン（CSS背景用のノイズ画像をその場で生成）
    try{
      const nc=document.createElement('canvas');nc.width=nc.height=128;
      const ng=nc.getContext('2d');const id=ng.createImageData(128,128);
      for(let i=0;i<id.data.length;i+=4){const v=Math.random()*255|0;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=Math.random()<.5?255:0;}
      ng.putImageData(id,0,0);el.grain.style.backgroundImage=`url(${nc.toDataURL()})`;
    }catch(e){}
    mg.setScore(`点検 0/${NEED}`);mg.setTimer(TIME_LIMIT+'s');

    let toastT=0;
    function toast(msg,cls=''){
      el.toast.className='factory3d-toast';void el.toast.offsetWidth;
      el.toast.textContent=msg;el.toast.className='factory3d-toast show '+cls;toastT=2.2;
    }

    // ── 入力 ──
    const inp={f:0,b:0,l:0,r:0,actKey:false,actBtn:false,jx:0,jy:0,dyaw:0,dpitch:0};
    let joyId=null,joyX=0,joyY=0,lookId=null,lookX=0,lookY=0;
    const JR=46;
    on(wrap,'pointerdown',e=>{
      if(S.phase==='load'||S.phase==='intro'&&e.target.closest('.factory3d-ov'))return;
      if(e.target.closest('.factory3d-act'))return;
      const rc=wrap.getBoundingClientRect();
      const x=e.clientX-rc.left,y=e.clientY-rc.top;
      if(e.pointerType!=='mouse'&&x<rc.width*.48&&joyId===null){
        joyId=e.pointerId;joyX=e.clientX;joyY=e.clientY;
        el.joy.style.left=x+'px';el.joy.style.top=y+'px';el.joy.classList.add('on');el.knob.style.transform='';
        el.joyhint.style.opacity='0';
      }else if(lookId===null){lookId=e.pointerId;lookX=e.clientX;lookY=e.clientY;}
      try{wrap.setPointerCapture(e.pointerId);}catch(err){}
      e.preventDefault();
    });
    on(wrap,'pointermove',e=>{
      if(e.pointerId===joyId){
        let dx=e.clientX-joyX,dy=e.clientY-joyY;const d=Math.hypot(dx,dy);
        if(d>JR){dx*=JR/d;dy*=JR/d;}
        inp.jx=dx/JR;inp.jy=dy/JR;
        el.knob.style.transform=`translate(${dx}px,${dy}px)`;
      }else if(e.pointerId===lookId){
        const sens=e.pointerType==='mouse'?.0042:.0068;
        inp.dyaw-=(e.clientX-lookX)*sens;inp.dpitch-=(e.clientY-lookY)*sens;
        lookX=e.clientX;lookY=e.clientY;
      }
    });
    const ptrEnd=e=>{
      if(e.pointerId===joyId){joyId=null;inp.jx=inp.jy=0;el.joy.classList.remove('on');}
      if(e.pointerId===lookId)lookId=null;
    };
    on(wrap,'pointerup',ptrEnd);on(wrap,'pointercancel',ptrEnd);
    on(wrap,'contextmenu',e=>e.preventDefault());
    const actDown=e=>{inp.actBtn=true;el.act.classList.add('held');try{el.act.setPointerCapture(e.pointerId);}catch(err){}e.preventDefault();e.stopPropagation();};
    const actUp=()=>{inp.actBtn=false;el.act.classList.remove('held');};
    on(el.act,'pointerdown',actDown);on(el.act,'pointerup',actUp);on(el.act,'pointercancel',actUp);on(el.act,'lostpointercapture',actUp);
    mg.onKey(e=>{
      const dn=e.type==='keydown';const k=(e.key||'').toLowerCase();
      if(k==='w'||k==='arrowup')inp.f=dn?1:0;
      else if(k==='s'||k==='arrowdown')inp.b=dn?1:0;
      else if(k==='a'||k==='arrowleft')inp.l=dn?1:0;
      else if(k==='d'||k==='arrowright')inp.r=dn?1:0;
      else if(k==='e'||k===' '||k==='enter')inp.actKey=dn;
      else return;
      e.preventDefault();
      if(dn&&S.phase==='intro')skipIntro();
    });
    on(window,'blur',()=>{inp.f=inp.b=inp.l=inp.r=0;inp.actKey=inp.actBtn=false;});

    // ── 後片付け（WebGLコンテキストを確実に解放する） ──
    function cleanup(){
      if(S.disposed)return;
      S.disposed=true;
      offs.forEach(f=>{try{f();}catch(e){}});offs.length=0;
      if(ro){try{ro.disconnect();}catch(e){}ro=null;}
      if(G){
        const {scene,renderer,texs}=G;
        const geos=new Set(),mats=new Set();
        scene.traverse(o=>{
          if(o.geometry)geos.add(o.geometry);
          if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m));
          if(o.isInstancedMesh&&o.dispose)try{o.dispose();}catch(e){}
          if(o.isLight&&o.shadow&&o.shadow.map){o.shadow.map.dispose();o.shadow.map=null;}
        });
        G.extraGeos.forEach(g=>geos.add(g));G.extraMats.forEach(m=>mats.add(m));
        geos.forEach(g=>{try{g.dispose();}catch(e){}});
        mats.forEach(m=>{try{m.dispose();}catch(e){}});
        texs.forEach(t=>{try{t.dispose();}catch(e){}});
        scene.clear();
        try{renderer.renderLists.dispose();}catch(e){}
        try{renderer.dispose();renderer.forceContextLoss();}catch(e){}
        const cv=renderer.domElement;if(cv&&cv.parentNode)cv.parentNode.removeChild(cv);
        G=null;
      }
      wrap.classList.remove('factory3d-hit');
    }

    function showError(msg){
      el.load.innerHTML=`<div style="color:var(--rd);font-size:.8rem">3D表示を開始できませんでした</div>`+
        `<div style="font-size:.6rem;color:var(--tx-d);max-width:260px">${String(msg||'').replace(/[<>&]/g,'')}</div><button type="button">戻る</button>`;
      const b=el.load.querySelector('button');
      b.onclick=()=>mg.end('quit');
    }

    loadThree().then(THREE=>{
      if(mg._ended||S.disposed)return;
      try{build(THREE);}catch(e){console.error(e);cleanup();S.disposed=false;showError(e.message);S.disposed=true;}
    }).catch(e=>{if(!mg._ended&&!S.disposed)showError(e&&e.message);});

    // ══════════════════════════════════════════════════════
    // シーン構築
    // ══════════════════════════════════════════════════════
    function build(THREE){
      const coarse=window.matchMedia&&matchMedia('(pointer:coarse)').matches;
      const dpr=Math.min(window.devicePixelRatio||1,1.5);
      const renderer=new THREE.WebGLRenderer({antialias:dpr<1.3,powerPreference:'high-performance',alpha:false});
      renderer.setPixelRatio(dpr);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.25;
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFShadowMap;
      renderer.setClearColor(0x05040e,1);
      wrap.insertBefore(renderer.domElement,wrap.firstChild);
      renderer.domElement.addEventListener('webglcontextlost',e=>e.preventDefault());

      const scene=new THREE.Scene();
      const FOG=new THREE.Color(0x06050f);
      scene.fog=new THREE.FogExp2(FOG,.052);
      scene.background=FOG;
      const camera=new THREE.PerspectiveCamera(72,1,.08,60);
      camera.rotation.order='YXZ';
      scene.add(camera);
      const texs=[],extraGeos=[],extraMats=[];
      G={THREE,renderer,scene,camera,texs,extraGeos,extraMats};

      const maxAniso=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      function ctex(w,h,draw,o={}){
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const g=c.getContext('2d');draw(g,w,h);
        const t=new THREE.CanvasTexture(c);
        t.colorSpace=o.linear?THREE.NoColorSpace:THREE.SRGBColorSpace;
        if(o.repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(o.repeat[0],o.repeat[1]);}
        t.anisotropy=maxAniso;texs.push(t);return t;
      }
      const noise=(g,w,h,n,a,col)=>{for(let i=0;i<n;i++){g.fillStyle=col||`rgba(${Math.random()<.5?0:255},${Math.random()<.5?0:255},${Math.random()<.5?0:255},${a*Math.random()})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}};

      // ── テクスチャ（すべて手続き生成） ──
      const T={};
      T.floor=ctex(256,256,(g,w,h)=>{
        g.fillStyle='#4a4650';g.fillRect(0,0,w,h);
        for(let i=0;i<2600;i++){const v=50+Math.random()*50|0;g.fillStyle=`rgba(${v},${v-4},${v+6},.5)`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}
        for(let i=0;i<7;i++){const x=Math.random()*w,y=Math.random()*h,r=10+Math.random()*40;const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(20,16,26,.5)');gr.addColorStop(1,'rgba(20,16,26,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);}
        g.strokeStyle='rgba(18,14,22,.8)';g.lineWidth=2;g.strokeRect(0,0,w,h);
        g.strokeStyle='rgba(15,12,20,.55)';g.lineWidth=1;
        for(let i=0;i<3;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let j=0;j<6;j++){x+=rnd(-22,22);y+=rnd(-22,22);g.lineTo(x,y);}g.stroke();}
        g.fillStyle='rgba(200,170,40,.35)';g.fillRect(0,124,256,6);
      },{repeat:[COLS,ROWS]});
      T.floorSpec=ctex(256,256,(g,w,h)=>{
        g.fillStyle='#202020';g.fillRect(0,0,w,h);
        for(let i=0;i<5;i++){const x=Math.random()*w,y=Math.random()*h,r=18+Math.random()*44;g.fillStyle='#e8e8e8';g.beginPath();g.ellipse(x,y,r,r*rnd(.4,.8),Math.random()*3,0,7);g.fill();}
        noise(g,w,h,900,.4,'rgba(140,140,140,.35)');
      },{repeat:[COLS,ROWS],linear:true});
      T.wall=ctex(256,256,(g,w,h)=>{
        g.fillStyle='#3c4250';g.fillRect(0,0,w,h);
        for(let x=0;x<w;x+=16){g.fillStyle=x%32?'rgba(255,255,255,.05)':'rgba(0,0,0,.18)';g.fillRect(x,0,8,h);}
        for(let i=0;i<14;i++){const x=Math.random()*w,l=40+Math.random()*160;const gr=g.createLinearGradient(0,0,0,l);gr.addColorStop(0,'rgba(110,60,30,.45)');gr.addColorStop(1,'rgba(110,60,30,0)');g.fillStyle=gr;g.fillRect(x,Math.random()*60,3+Math.random()*6,l);}
        g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,w,3);g.fillRect(0,128,w,2);
        noise(g,w,h,1400,.12);
      },{repeat:[8,2]});
      T.mach=ctex(256,256,(g,w,h)=>{
        g.fillStyle='#8a9290';g.fillRect(0,0,w,h);
        const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(0,0,0,.35)');g.fillStyle=gr;g.fillRect(0,0,w,h);
        g.strokeStyle='rgba(20,22,26,.85)';g.lineWidth=2;
        [[6,6,120,150],[132,6,118,90],[132,100,118,56],[6,162,244,88]].forEach(r=>{g.strokeRect(...r);g.fillStyle='rgba(30,30,30,.7)';[[r[0]+5,r[1]+5],[r[0]+r[2]-5,r[1]+5],[r[0]+5,r[1]+r[3]-5],[r[0]+r[2]-5,r[1]+r[3]-5]].forEach(p=>{g.beginPath();g.arc(p[0],p[1],2,0,7);g.fill();});});
        g.fillStyle='rgba(15,16,20,.85)';for(let i=0;i<9;i++)g.fillRect(20,176+i*8,110,4);
        g.fillStyle='#d8b020';g.fillRect(150,20,80,40);g.fillStyle='#111';
        for(let i=-4;i<10;i++){g.beginPath();g.moveTo(150+i*12,60);g.lineTo(162+i*12,20);g.lineTo(168+i*12,20);g.lineTo(156+i*12,60);g.fill();}
        g.save();g.beginPath();g.rect(150,20,80,40);g.restore();
        g.fillStyle='#d8d0b0';g.fillRect(152,110,70,22);g.fillStyle='#222';g.font='bold 14px monospace';g.fillText('No.3-'+(10+Math.random()*80|0),156,126);
        g.fillStyle='#202428';g.fillRect(30,40,60,70);g.fillStyle='#601010';g.beginPath();g.arc(60,75,14,0,7);g.fill();g.fillStyle='#c02020';g.beginPath();g.arc(60,75,10,0,7);g.fill();
        for(let i=0;i<10;i++){const x=Math.random()*w,l=30+Math.random()*90;const r=g.createLinearGradient(0,0,0,l);r.addColorStop(0,'rgba(100,55,25,.5)');r.addColorStop(1,'rgba(100,55,25,0)');g.fillStyle=r;g.fillRect(x,Math.random()*h,2+Math.random()*4,l);}
        g.strokeStyle='rgba(255,255,255,.18)';g.lineWidth=1;for(let i=0;i<40;i++){const x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+rnd(-12,12),y+rnd(-4,4));g.stroke();}
        noise(g,w,h,1600,.15);
      });
      T.metal=ctex(128,128,(g,w,h)=>{
        g.fillStyle='#5a5e66';g.fillRect(0,0,w,h);
        for(let y=0;y<h;y+=2){g.fillStyle=`rgba(255,255,255,${Math.random()*.06})`;g.fillRect(0,y,w,1);}
        for(let i=0;i<6;i++){g.fillStyle='rgba(110,60,30,.3)';g.fillRect(Math.random()*w,Math.random()*h,6+Math.random()*20,3+Math.random()*12);}
        noise(g,w,h,600,.15);
      });
      T.stripe=ctex(64,64,(g,w,h)=>{
        g.fillStyle='#d8a818';g.fillRect(0,0,w,h);g.fillStyle='#141210';
        for(let i=-2;i<3;i++){g.beginPath();g.moveTo(i*32,h);g.lineTo(i*32+16,h);g.lineTo(i*32+16+h,0);g.lineTo(i*32+h,0);g.fill();}
        noise(g,w,h,250,.35,'rgba(30,25,20,.5)');
      },{repeat:[1,1]});
      T.belt=ctex(64,128,(g,w,h)=>{
        g.fillStyle='#1c1c20';g.fillRect(0,0,w,h);
        for(let y=0;y<h;y+=8){g.fillStyle='#2c2c32';g.fillRect(0,y,w,3);}
        g.fillStyle='#55555c';g.fillRect(0,0,4,h);g.fillRect(w-4,0,4,h);
      });
      T.box=ctex(64,64,(g,w,h)=>{
        g.fillStyle='#8a6a3e';g.fillRect(0,0,w,h);g.fillStyle='#a8844e';g.fillRect(0,28,w,8);
        g.strokeStyle='rgba(40,25,10,.6)';g.strokeRect(1,1,w-2,h-2);g.fillStyle='rgba(30,20,10,.7)';g.font='9px monospace';g.fillText('FRAGILE',6,14);
        noise(g,w,h,200,.15);
      });
      T.glow=ctex(64,64,(g,w,h)=>{
        const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.25,'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
      });
      T.dot=ctex(32,32,(g)=>{const gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);});
      T.beam=ctex(8,128,(g,w,h)=>{
        const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,w,h);
      },{linear:true});
      T.beam.flipY=false;
      T.cookie=ctex(128,128,(g,w,h)=>{
        g.fillStyle='#000';g.fillRect(0,0,w,h);
        const gr=g.createRadialGradient(64,64,0,64,64,62);
        gr.addColorStop(0,'#fff');gr.addColorStop(.45,'#e8e2d4');gr.addColorStop(.62,'#ffffff');gr.addColorStop(.7,'#8a8476');gr.addColorStop(.92,'#2a2824');gr.addColorStop(1,'#000');
        g.fillStyle=gr;g.fillRect(0,0,w,h);
        for(let i=0;i<10;i++){g.fillStyle=`rgba(0,0,0,${.06+Math.random()*.1})`;g.beginPath();g.arc(30+Math.random()*68,30+Math.random()*68,4+Math.random()*12,0,7);g.fill();}
      });
      T.rain=ctex(128,256,(g,w,h)=>{
        const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#1a2448');gr.addColorStop(1,'#0c1024');g.fillStyle=gr;g.fillRect(0,0,w,h);
        for(let i=0;i<160;i++){const x=Math.random()*w,y=Math.random()*h,l=6+Math.random()*26;g.strokeStyle=`rgba(170,195,255,${.12+Math.random()*.35})`;g.lineWidth=Math.random()<.2?1.5:.8;g.beginPath();g.moveTo(x,y);g.lineTo(x-1,y+l);g.stroke();}
        for(let i=0;i<40;i++){g.fillStyle=`rgba(200,215,255,${.25+Math.random()*.4})`;g.beginPath();g.arc(Math.random()*w,Math.random()*h,.8+Math.random()*1.6,0,7);g.fill();}
      },{repeat:[1,1]});
      T.exit=ctex(256,96,(g,w,h)=>{
        g.fillStyle='#0a8a3c';g.fillRect(0,0,w,h);g.fillStyle='#e8fff0';g.fillRect(6,6,84,84);
        g.fillStyle='#0a8a3c';
        // 走る人のピクトグラム
        g.beginPath();g.arc(52,22,8,0,7);g.fill();
        g.lineWidth=9;g.lineCap='round';g.strokeStyle='#0a8a3c';
        g.beginPath();g.moveTo(46,34);g.lineTo(38,56);g.stroke();
        g.beginPath();g.moveTo(38,56);g.lineTo(56,70);g.lineTo(54,84);g.stroke();
        g.beginPath();g.moveTo(38,56);g.lineTo(26,72);g.lineTo(14,72);g.stroke();
        g.beginPath();g.moveTo(44,40);g.lineTo(62,46);g.stroke();
        g.beginPath();g.moveTo(44,40);g.lineTo(28,44);g.stroke();
        g.fillStyle='#e8fff0';g.font='bold 34px "DotGothic16",sans-serif';g.textBaseline='middle';g.fillText('非常口',100,38);
        g.font='bold 20px monospace';g.fillText('EXIT ▶',112,72);
      });
      T.marker=ctex(64,64,(g)=>{
        g.translate(32,32);g.rotate(Math.PI/4);g.fillStyle='rgba(232,184,48,.95)';g.fillRect(-15,-15,30,30);g.strokeStyle='#fff6c8';g.lineWidth=2;g.strokeRect(-15,-15,30,30);
        g.rotate(-Math.PI/4);g.fillStyle='#1a1204';g.font='bold 26px monospace';g.textAlign='center';g.textBaseline='middle';g.fillText('!',0,2);
      });
      T.tick=ctex(256,64,(g,w,h)=>{
        g.fillStyle='rgba(4,20,10,.75)';g.fillRect(0,8,w,48);g.strokeStyle='#44ee88';g.lineWidth=2;g.strokeRect(1,9,w-2,46);
        g.fillStyle='#b8ffd2';g.font='28px "DotGothic16",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('✔ 点検完了',w/2,33);
      });
      T.banner=ctex(512,96,(g,w,h)=>{
        g.fillStyle='rgba(0,0,0,0)';g.clearRect(0,0,w,h);
        g.fillStyle='rgba(220,210,190,.85)';g.font='bold 76px "DotGothic16",sans-serif';g.textBaseline='middle';g.textAlign='center';g.fillText('第 三 工 場',w/2,50);
        g.globalCompositeOperation='destination-out';for(let i=0;i<500;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.8})`;g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*5,1+Math.random()*3);}
      });
      T.safety=ctex(512,128,(g,w,h)=>{
        g.fillStyle='#1c6a38';g.fillRect(0,0,w,h);g.strokeStyle='#e8e8d0';g.lineWidth=6;g.strokeRect(8,8,w-16,h-16);
        g.fillStyle='#f0f0e0';g.font='bold 64px "DotGothic16",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('安全第一',w/2,66);
        g.fillStyle='rgba(60,30,10,.35)';for(let i=0;i<8;i++)g.fillRect(Math.random()*w,0,4+Math.random()*10,h);
      });

      // ── マテリアル ──
      const M={
        floor:new THREE.MeshPhongMaterial({map:T.floor,specularMap:T.floorSpec,specular:0x8890a0,shininess:70}),
        wall:new THREE.MeshPhongMaterial({map:T.wall,shininess:10,specular:0x222222}),
        mach:new THREE.MeshPhongMaterial({map:T.mach,shininess:38,specular:0x555555}),
        metal:new THREE.MeshPhongMaterial({map:T.metal,shininess:55,specular:0x666666}),
        dark:new THREE.MeshPhongMaterial({color:0x24262c,shininess:30,specular:0x333333}),
        pipe:new THREE.MeshPhongMaterial({map:T.metal,color:0x8a8070,shininess:60,specular:0x777777}),
        stripe:new THREE.MeshPhongMaterial({map:T.stripe,shininess:20,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
        belt:new THREE.MeshPhongMaterial({map:T.belt,shininess:15}),
        box:new THREE.MeshLambertMaterial({map:T.box}),
        ceil:new THREE.MeshLambertMaterial({color:0x0c0c14}),
        rail:new THREE.MeshPhongMaterial({color:0xc89a20,shininess:40}),
        led:new THREE.MeshBasicMaterial({color:0xffffff}),
        glass:new THREE.MeshBasicMaterial({map:T.rain,color:0x5868a0,fog:false}),
        shaft:new THREE.MeshBasicMaterial({map:T.beam,color:0x6a7cc8,transparent:true,opacity:.05,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}),
        exitSign:new THREE.MeshBasicMaterial({map:T.exit,fog:false}),
        emerg:new THREE.MeshBasicMaterial({color:0xd8ffe8,fog:false}),
        tube:new THREE.MeshBasicMaterial({color:0xdde8ff}),
        banner:new THREE.MeshLambertMaterial({map:T.banner,transparent:true,depthWrite:false}),
        safety:new THREE.MeshLambertMaterial({map:T.safety}),
      };
      M.floor.color.setHex(0xa8a4b0);

      // ── インスタンス部品の収集 ──
      const parts={};
      const dummy=new THREE.Object3D();
      function part(key,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,color=null){(parts[key]=parts[key]||[]).push([x,y,z,sx,sy,sz,rx,ry,rz,color]);}
      const geoBox=new THREE.BoxGeometry(1,1,1);
      const geoCyl=new THREE.CylinderGeometry(1,1,1,12);
      const geoCylLo=new THREE.CylinderGeometry(1,1,1,8,1,true);
      const geoTank=new THREE.CylinderGeometry(1,1,1,20);
      const geoDome=new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2);
      const geoCone=new THREE.ConeGeometry(1,1,10,1,true);
      extraGeos.push(geoBox,geoCyl,geoCylLo,geoTank,geoDome,geoCone);
      const PARTDEF={
        machBody:[geoBox,M.mach,true,true],
        trim:[geoBox,M.dark,true,true],
        metalBox:[geoBox,M.metal,true,true],
        pipe:[geoCylLo,M.pipe,true,false],
        tank:[geoTank,M.metal,true,true],
        dome:[geoDome,M.metal,true,true],
        ring:[geoCyl,M.dark,false,false],
        belt:[geoBox,M.belt,false,true],
        cargo:[geoBox,M.box,true,true],
        rail:[geoBox,M.rail,false,false],
        led:[geoBox,M.led,false,false],
        beam:[geoBox,M.dark,false,false],
        shade:[geoCone,M.dark,false,false],
        emerg:[geoBox,M.emerg,false,false],
        pillar:[geoBox,M.wall,false,true],
        frame:[geoBox,M.dark,false,false],
      };
      function flushParts(){
        const col=new THREE.Color();
        for(const key in parts){
          const list=parts[key],[geo,mat,cast,recv]=PARTDEF[key];
          const im=new THREE.InstancedMesh(geo,mat,list.length);
          list.forEach((p,i)=>{
            dummy.position.set(p[0],p[1],p[2]);dummy.scale.set(p[3],p[4],p[5]);dummy.rotation.set(p[6],p[7],p[8]);dummy.updateMatrix();
            im.setMatrixAt(i,dummy.matrix);
            if(p[9]!=null){col.set(p[9]);im.setColorAt(i,col);}else if(im.instanceColor||list.some(q=>q[9]!=null)){col.set(0xffffff);im.setColorAt(i,col);}
          });
          if(im.instanceColor)im.instanceColor.needsUpdate=true;
          im.castShadow=cast;im.receiveShadow=recv;im.frustumCulled=false;
          scene.add(im);
        }
      }

      // ── ストライプ（危険表示）の床ストリップ：UVを長さに合わせて1つのジオメトリにまとめる ──
      const sp=[],su=[],si=[];
      function strip(x0,z0,x1,z1,wd,y=.012){
        const dx=x1-x0,dz=z1-z0,len=Math.hypot(dx,dz),nx=-dz/len*wd/2,nz=dx/len*wd/2,b=sp.length/3;
        sp.push(x0+nx,y,z0+nz, x0-nx,y,z0-nz, x1+nx,y,z1+nz, x1-nx,y,z1-nz);
        const u=len/wd;su.push(0,1,0,0,u,1,u,0);
        si.push(b,b+1,b+2,b+2,b+1,b+3);
      }
      function stripRect(x0,z0,x1,z1,wd=.32){const h=wd/2;strip(x0-h,z0,x1+h,z0,wd);strip(x0-h,z1,x1+h,z1,wd);strip(x0,z0+h,x0,z1-h,wd);strip(x1,z0+h,x1,z1-h,wd);}

      // ── レイアウト生成 ──
      let tpl=pick(TEMPLATES).slice();
      const mirror=Math.random()<.5;
      if(mirror)tpl=tpl.map(r=>r.split('').reverse().join(''));
      const grid=tpl.map(r=>r.split(''));
      const cx=c=>-HW+CELL*(c+.5), cz=r=>-HD+CELL*(r+.5);
      const inb=(r,c)=>r>=0&&r<ROWS&&c>=0&&c<COLS;
      const isFree=(r,c)=>inb(r,c)&&(grid[r][c]==='.'||grid[r][c]==='S');
      const isSolid=(r,c)=>inb(r,c)&&(grid[r][c]==='M'||grid[r][c]==='T');
      const cols=[];          // 当たり判定 {x0,x1,z0,z1,h}
      const addCol=(x,z,w,d,h)=>cols.push({x0:x-w/2,x1:x+w/2,z0:z-d/2,z1:z+d/2,h});
      const machTints=[0x8aa0a0,0x9aa08a,0x8890a8,0xa09a88,0x7a9a98,0xa8a8b0];
      const sparkSpots=[];

      // 機械：横に連続するMを1台の長い機械にまとめる
      for(let r=0;r<ROWS;r++){
        for(let c=0;c<COLS;c++){
          if(grid[r][c]!=='M'||(c>0&&grid[r][c-1]==='M'))continue;
          let n=1;while(c+n<COLS&&grid[r][c+n]==='M')n++;
          const x=(cx(c)+cx(c+n-1))/2,z=cz(r),w=n*CELL-.8,d=3.1,h=rnd(1.8,3.2);
          const tint=pick(machTints);
          part('trim',x,.12,z,w+.1,.24,d+.1);
          part('machBody',x,.24+h/2,z,w,h,d,0,0,0,tint);
          addCol(x,z,w+.1,d+.1,h+.24);
          stripRect(x-w/2-.45,z-d/2-.45,x+w/2+.45,z+d/2+.45);
          // 上部のハウジングと細部
          const segs=n;
          for(let s=0;s<segs;s++){
            const sx=cx(c+s);
            if(Math.random()<.7){const hh=rnd(.5,1.3),hw=rnd(1.4,2.6);part('metalBox',sx+rnd(-.4,.4),.24+h+hh/2,z+rnd(-.4,.4),hw,hh,rnd(1.2,2.2),0,0,0,tint);}
            if(Math.random()<.55){const ph=rnd(1.5,4);part('pipe',sx+rnd(-1,1),.24+h+ph/2,z+rnd(-.9,.9),.16,ph,.16);}
            // 操作盤とLED
            const side=Math.random()<.5?1:-1;
            part('trim',sx+rnd(-.8,.8),1.2,z+side*(d/2+.12),.8,.9,.24);
            for(let k=0;k<3;k++)part('led',sx+rnd(-1.2,1.2),rnd(.8,h),z+side*(d/2+.02),.07,.07,.02,0,0,0,pick([0xff2030,0xff2030,0x30ff70,0xffb020]));
            if(Math.random()<.25)sparkSpots.push(new THREE.Vector3(sx+rnd(-1,1),.24+h+.05,z+side*d/2));
          }
        }
      }
      // タンク
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        if(grid[r][c]!=='T')continue;
        const x=cx(c),z=cz(r),h=rnd(4,6.2),R=1.45;
        part('trim',x,.15,z,3.4,.3,3.4);
        part('tank',x,.3+h/2,z,R,h,R);
        part('dome',x,.3+h,z,R,.55,R);
        for(let k=1;k<=3;k++)part('ring',x,.3+h*k/4,z,R+.05,.1,R+.05);
        part('pipe',x+R*.7,.3+h+1.2,z,.14,2.6,.14);
        part('pipe',x,h*.4,z+R+.15,.09,h*.8,.09);
        addCol(x,z,3.2,3.2,h);
        stripRect(x-1.95,z-1.95,x+1.95,z+1.95);
      }
      // コンベア
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
        if(grid[r][c]!=='C')continue;
        const horiz=(c>0&&grid[r][c-1]==='C')||(c<COLS-1&&grid[r][c+1]==='C');
        const x=cx(c),z=cz(r),L=CELL,Wd=1.4;
        const sx=horiz?L:Wd,sz=horiz?Wd:L;
        part('frame',x,.62,z,sx,.2,sz);
        part('belt',x,.74,z,horiz?L:Wd-.2,.05,horiz?Wd-.2:L,0,horiz?Math.PI/2:0,0);
        part('rail',x+(horiz?0:Wd/2),.86,z+(horiz?Wd/2:0),horiz?L:.06,.18,horiz?.06:L);
        part('rail',x-(horiz?0:Wd/2),.86,z-(horiz?Wd/2:0),horiz?L:.06,.18,horiz?.06:L);
        for(const a of [-1.6,0,1.6])for(const b of [-.6,.6])part('frame',x+(horiz?a:b),.28,z+(horiz?b:a),.08,.56,.08);
        const nb=(Math.random()*3)|0;
        for(let k=0;k<nb;k++){const s=rnd(.45,.8),o=rnd(-1.4,1.4);part('cargo',x+(horiz?o:rnd(-.15,.15)),.77+s/2,z+(horiz?rnd(-.15,.15):o),s,s*rnd(.7,1),s,0,rnd(-.3,.3),0);}
        addCol(x,z,horiz?L:Wd+.1,horiz?Wd+.1:L,1);
      }

      // ── 床・壁・天井 ──
      const floorGeo=new THREE.PlaneGeometry(HW*2,HD*2);
      const floor=new THREE.Mesh(floorGeo,M.floor);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
      const WALL_H=11;
      [[0,-HD-.5,HW*2+2,1],[0,HD+.5,HW*2+2,1],[-HW-.5,0,1,HD*2],[HW+.5,0,1,HD*2]].forEach(([x,z,w,d],i)=>{
        const g=new THREE.BoxGeometry(w,WALL_H,d);
        const m=new THREE.Mesh(g,M.wall);m.position.set(x,WALL_H/2,z);m.receiveShadow=true;scene.add(m);
      });
      const ceil=new THREE.Mesh(new THREE.PlaneGeometry(HW*2,HD*2),M.ceil);ceil.rotation.x=Math.PI/2;ceil.position.y=WALL_H;scene.add(ceil);
      // 壁の柱
      for(let z=-HD+6;z<HD;z+=8){part('pillar',-HW+.25,WALL_H/2,z,.7,WALL_H,.9);part('pillar',HW-.25,WALL_H/2,z,.7,WALL_H,.9);}
      // 天井トラスとランプシェード（停電で消えている）
      for(let z=-HD+4;z<HD;z+=6){
        part('beam',0,WALL_H-.9,z,HW*2,.35,.25);
        part('beam',0,WALL_H-.25,z,HW*2,.12,.12);
        for(let x=-HW+4;x<HW;x+=4)part('beam',x,WALL_H-.57,z,.08,.7,.08,0,0,(x/4)%2?.6:-.6);
        for(const x of [-10,0,10]){part('pipe',x,WALL_H-1.9,z,.02,2,.02);part('shade',x,WALL_H-3,z,.45,.3,.45);}
      }
      // 壁沿いの配管
      for(const sx of [-1,1]){
        const x=sx*(HW-.45);
        for(const [y,r] of [[3.1,.16],[3.55,.12],[6.4,.22]])part('pipe',x,y,0,r,HD*2,r,Math.PI/2,0,0);
        for(let z=-HD+10;z<HD;z+=12)part('pipe',x,1.6,z,.1,3.2,.1);
      }
      for(const z of [-18,6,22])part('pipe',0,8.6,z,.2,HW*2,.2,0,0,Math.PI/2);
      // キャットウォーク（東側の壁沿い、高さ4.2m）
      const cwx=HW-1.9;
      part('frame',HW-.95,4.2,0,1.9,.08,HD*2-1);
      part('rail',cwx,5.25,0,.06,.06,HD*2-1);part('rail',cwx,4.75,0,.04,.04,HD*2-1);
      for(let z=-HD+1;z<HD;z+=2){part('rail',cwx,4.72,z,.06,1.05,.06);part('frame',HW-.9,3.7,z,.06,.06,1.6,0,0,0);}
      for(let z=-HD+3;z<HD;z+=6)part('frame',HW-.8,3.6,z,.08,1.4,.08,0,0,.85);
      strip(cwx+.08,-HD+.5,cwx+.08,HD-.5,.18,4.25);
      // 非常灯（白緑の小さな表示灯）
      const emergPos=[];
      for(let z=-HD+8;z<HD-4;z+=13){emergPos.push([-HW+.06,2.5,z,'x']);emergPos.push([HW-.06,2.5,z+6,'x']);}
      emergPos.forEach(p=>part('emerg',p[0],p[1],p[2],.04,.18,.5));

      // ── 高窓と雨 ──
      const winGeo=new THREE.PlaneGeometry(4.2,2.6);extraGeos.push(winGeo);
      const shaftGeo=new THREE.PlaneGeometry(3.6,9);shaftGeo.translate(0,-4.5,0);extraGeos.push(shaftGeo);
      const shafts=[];
      for(const sx of [-1,1]){
        for(let z=-HD+5;z<HD-2;z+=7){
          const w=new THREE.Mesh(winGeo,M.glass);w.position.set(sx*(HW-.02),7.7,z);w.rotation.y=-sx*Math.PI/2;scene.add(w);
          part('frame',sx*(HW-.05),7.7,z,.1,2.6,.1);part('frame',sx*(HW-.05),7.7,z,.1,.08,4.2);
          part('frame',sx*(HW-.05),6.4,z,.3,.12,4.4);part('frame',sx*(HW-.05),9,z,.12,.12,4.4);
          if(Math.random()<.6){
            const s=new THREE.Mesh(shaftGeo,M.shaft);s.position.set(sx*(HW-.1),8.6,z);s.rotation.set(0,-sx*Math.PI/2,0);
            s.rotateX(-.55);scene.add(s);shafts.push(s);
          }
        }
      }
      // 壁の文字
      {const g=new THREE.PlaneGeometry(9,1.7);const m=new THREE.Mesh(g,M.banner);m.position.set(-HW+.08,5.3,mirror?6:-6);m.rotation.y=Math.PI/2;scene.add(m);}
      {const g=new THREE.PlaneGeometry(4,1);const m=new THREE.Mesh(g,M.safety);m.position.set(0,5.4,HD-.02);m.rotation.y=Math.PI;scene.add(m);}

      // ── 蛍光灯（ちらつく、光源なし） ──
      const tubes=[];
      for(let i=0;i<2;i++){
        const g=new THREE.BoxGeometry(1.4,.06,.08);const mat=new THREE.MeshBasicMaterial({color:0xdde8ff});
        const m=new THREE.Mesh(g,mat);m.position.set(rnd(-12,12),WALL_H-3.25,-HD+4+6*((2+Math.random()*7)|0));scene.add(m);
        const gl=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0x9fb8ff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.5}));
        gl.scale.set(3.2,1.4,1);gl.position.copy(m.position);scene.add(gl);
        tubes.push({mat,gl,t:Math.random()*5});
      }

      // ── 非常口 ──
      const exitCol=pick([0,1,COLS-2,COLS-1]);
      const exitX=cx(exitCol),exitZ=-HD;
      const door=new THREE.Group();door.position.set(exitX,0,exitZ);scene.add(door);
      {
        const fr=new THREE.MeshPhongMaterial({color:0x3a3e46,shininess:40});
        const add=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=true;door.add(o);return o;};
        add(new THREE.BoxGeometry(.18,2.5,.3),fr,-.95,1.25,.12);add(new THREE.BoxGeometry(.18,2.5,.3),fr,.95,1.25,.12);add(new THREE.BoxGeometry(2.08,.18,.3),fr,0,2.5,.12);
        const slab=add(new THREE.BoxGeometry(1.72,2.4,.08),new THREE.MeshPhongMaterial({map:T.metal,color:0x6a8a78,shininess:50}),0,1.2,.05);
        add(new THREE.BoxGeometry(1.2,.07,.07),M.dark,0,1.05,.14);
        add(new THREE.BoxGeometry(2.2,.6,.1),M.exitSign,0,2.95,.1).material=M.exitSign;
        door.userData.slab=slab;
      }
      const exitLamp=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color:0xff2030,fog:false}));
      exitLamp.position.set(exitX+.75,1.9,exitZ+.2);scene.add(exitLamp);
      const exitGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0x30ff80,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.7}));
      exitGlow.scale.set(4.2,2,1);exitGlow.position.set(exitX,2.95,exitZ+.3);scene.add(exitGlow);
      const exitLight=new THREE.PointLight(0x30ff80,2,10,1.6);exitLight.position.set(exitX,2.6,exitZ+1.2);scene.add(exitLight);

      // ── 非常回転灯（赤） ──
      const beaconPos=[[-HW+.35,5.2,mirror?-10:-14],[HW-.35,5.6,mirror?12:6],[-HW+.35,5.2,18],[exitCol<5?8:-8,5.4,-HD+.35]];
      const beacons=[];
      const beamGeo=new THREE.ConeGeometry(1.25,7,16,1,true);beamGeo.translate(0,-3.5,0);beamGeo.rotateX(-Math.PI/2);extraGeos.push(beamGeo);
      const beamMat=new THREE.MeshBasicMaterial({map:T.beam,color:0xff1830,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false});
      const redGlowMat=new THREE.SpriteMaterial({map:T.glow,color:0xff2038,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.9});
      const domeMat=new THREE.MeshBasicMaterial({color:0xff3040});
      beaconPos.forEach((p,i)=>{
        const g=new THREE.Group();g.position.set(p[0],p[1],p[2]);scene.add(g);
        const dome=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),domeMat);g.add(dome);
        const base=new THREE.Mesh(new THREE.CylinderGeometry(.2,.22,.12,12),M.dark);base.position.y=-.16;g.add(base);
        const rot=new THREE.Group();g.add(rot);
        const b1=new THREE.Mesh(beamGeo,beamMat);b1.rotation.x=.18;rot.add(b1);
        const b2=new THREE.Mesh(beamGeo,beamMat);b2.rotation.set(.18,Math.PI,0);rot.add(b2);
        const gl=new THREE.Sprite(redGlowMat);gl.scale.set(1.6,1.6,1);g.add(gl);
        let light=null;
        if(i<3){light=new THREE.PointLight(0xff1830,4,14,1.6);const inward=p[0]<-HW+1?1:p[0]>HW-1?-1:0;light.position.set(p[0]+inward*1.2,p[1]-.4,p[2]+(p[2]<-HD+1?1.2:0));scene.add(light);}
        beacons.push({g,rot,light,ph:Math.random()*6,pos:new THREE.Vector3(p[0],0,p[2])});
      });

      // ── 光源 ──
      const hemi=new THREE.HemisphereLight(0x2a3466,0x0c0810,.35);scene.add(hemi);
      const spot=new THREE.SpotLight(0xfff0d8,8,30,.46,.45,1.25);
      spot.position.set(.22,-.18,.05);
      spot.castShadow=true;
      const SMAP=coarse?512:1024;
      spot.shadow.mapSize.set(SMAP,SMAP);spot.shadow.camera.near=.3;spot.shadow.camera.far=24;spot.shadow.bias=-.0006;spot.shadow.normalBias=.03;
      spot.map=T.cookie;
      camera.add(spot);
      const spotTarget=new THREE.Object3D();spotTarget.position.set(0,0,-6);camera.add(spotTarget);spot.target=spotTarget;
      // 懐中電灯の光の筋（加算合成のコーン）
      const fbGeo=new THREE.ConeGeometry(2.6,9,20,1,true);fbGeo.translate(0,-4.5,0);fbGeo.rotateX(Math.PI/2);extraGeos.push(fbGeo);
      const fbMat=new THREE.MeshBasicMaterial({map:T.beam,color:0xfff0d0,transparent:true,opacity:.055,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.BackSide,fog:false});
      const fbeam=new THREE.Mesh(fbGeo,fbMat);fbeam.position.copy(spot.position);camera.add(fbeam);
      // 懐中電灯に舞う埃
      const DUST=170,dustPos=new Float32Array(DUST*3),dustVel=new Float32Array(DUST*3);
      const seedDust=i=>{const d=rnd(.6,7),a=Math.random()*Math.PI*2,rr=Math.random()*d*.42;dustPos[i*3]=Math.cos(a)*rr+.2;dustPos[i*3+1]=Math.sin(a)*rr-.15;dustPos[i*3+2]=-d;dustVel[i*3]=rnd(-.05,.05);dustVel[i*3+1]=rnd(-.06,.03);dustVel[i*3+2]=rnd(-.03,.03);};
      for(let i=0;i<DUST;i++)seedDust(i);
      const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
      const dustMat=new THREE.PointsMaterial({map:T.dot,color:0xfff2d8,size:.035,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
      const dust=new THREE.Points(dustGeo,dustMat);dust.frustumCulled=false;camera.add(dust);

      // ── 火花 ──
      const SPK=48,spkPos=new Float32Array(SPK*3),spkVel=new Float32Array(SPK*3),spkLife=new Float32Array(SPK);
      const spkGeo=new THREE.BufferGeometry();spkGeo.setAttribute('position',new THREE.BufferAttribute(spkPos,3));
      const spkMat=new THREE.PointsMaterial({map:T.dot,color:0xffb050,size:.09,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
      const sparks=new THREE.Points(spkGeo,spkMat);sparks.frustumCulled=false;scene.add(sparks);
      for(let i=0;i<SPK;i++)spkPos[i*3+1]=-50;
      const spkGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0xffa040,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0}));
      spkGlow.scale.set(2.5,2.5,1);scene.add(spkGlow);
      let spkT=2;
      function burstSparks(){
        if(!sparkSpots.length)return;
        const p=pick(sparkSpots);spkGlow.position.copy(p);spkGlow.material.opacity=1;
        for(let i=0;i<SPK;i++){spkPos[i*3]=p.x;spkPos[i*3+1]=p.y;spkPos[i*3+2]=p.z;spkVel[i*3]=rnd(-2,2);spkVel[i*3+1]=rnd(.5,3.5);spkVel[i*3+2]=rnd(-2,2);spkLife[i]=rnd(.4,1.1);}
      }

      // ── 計器（点検対象）の配置 ──
      const freeCells=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(isFree(r,c))freeCells.push([r,c]);
      const START={x:0,z:HD-2};
      const cands=[];
      freeCells.forEach(([r,c])=>{
        if(r>=ROWS-2||r===0)return;
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc])=>{
          const nr=r+dr,nc=c+dc;
          const wallSide=!inb(nr,nc)&&dc!==0;
          if(isSolid(nr,nc)||wallSide)cands.push({r,c,dr,dc,x:cx(c)+dc*(CELL/2-.32),z:cz(r)+dr*(CELL/2-.32)});
        });
      });
      shuffle(cands);
      const gaugeSpots=[];
      for(const minD of [13,10,7,4,0]){
        for(const cd of cands){
          if(gaugeSpots.length>=NEED)break;
          if(gaugeSpots.some(g=>g.r===cd.r&&g.c===cd.c||Math.hypot(g.x-cd.x,g.z-cd.z)<minD))continue;
          if(Math.hypot(cd.x-START.x,cd.z-START.z)<Math.min(minD,8))continue;
          gaugeSpots.push(cd);
        }
        if(gaugeSpots.length>=NEED)break;
      }
      const dialGeo=new THREE.CircleGeometry(.24,28);extraGeos.push(dialGeo);
      const needleGeo=new THREE.BoxGeometry(.018,.2,.01);needleGeo.translate(0,.08,0);extraGeos.push(needleGeo);
      const markerMat=new THREE.SpriteMaterial({map:T.marker,transparent:true,depthWrite:false,fog:false});
      const gauges=gaugeSpots.map((s,i)=>{
        const label='P-0'+(i+1);
        const face=ctex(128,128,(g,w,h)=>{
          g.fillStyle='#1a1a1e';g.fillRect(0,0,w,h);
          g.fillStyle='#e4dcc6';g.beginPath();g.arc(64,64,60,0,7);g.fill();
          const a0=Math.PI*.75,span=Math.PI*1.5;
          const arc=(f0,f1,c)=>{g.strokeStyle=c;g.lineWidth=9;g.beginPath();g.arc(64,64,48,a0+span*f0,a0+span*f1);g.stroke();};
          arc(.35,.62,'#2aa860');arc(.8,1,'#d02838');
          g.strokeStyle='#222';for(let k=0;k<=20;k++){const a=a0+span*k/20,l=k%5?6:11;g.lineWidth=k%5?1.5:2.5;g.beginPath();g.moveTo(64+Math.cos(a)*54,64+Math.sin(a)*54);g.lineTo(64+Math.cos(a)*(54-l),64+Math.sin(a)*(54-l));g.stroke();}
          g.fillStyle='#222';g.font='bold 13px monospace';g.textAlign='center';g.fillText('MPa',64,92);g.font='bold 12px monospace';g.fillText(label,64,44);
          g.strokeStyle='#444';g.lineWidth=4;g.beginPath();g.arc(64,64,61,0,7);g.stroke();
        });
        const grp=new THREE.Group();grp.position.set(s.x,0,s.z);grp.rotation.y=Math.atan2(-s.dc,-s.dr);scene.add(grp);
        const housMat=new THREE.MeshPhongMaterial({color:0x3e5a6a,shininess:50,specular:0x445566});
        const post=new THREE.Mesh(new THREE.BoxGeometry(.14,1.05,.14),M.dark);post.position.y=.52;post.castShadow=true;grp.add(post);
        const hous=new THREE.Mesh(new THREE.BoxGeometry(.66,.64,.22),housMat);hous.position.set(0,1.36,0);hous.castShadow=true;hous.receiveShadow=true;grp.add(hous);
        const bez=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.05,24),M.metal);bez.rotation.x=Math.PI/2;bez.position.set(0,1.38,.12);grp.add(bez);
        const dmat=new THREE.MeshPhongMaterial({map:face,emissive:0x2a2618,emissiveMap:face,shininess:90,specular:0xaaaaaa});
        const dial=new THREE.Mesh(dialGeo,dmat);dial.position.set(0,1.38,.147);grp.add(dial);
        const pivot=new THREE.Group();pivot.position.set(0,1.38,.155);grp.add(pivot);
        const needle=new THREE.Mesh(needleGeo,new THREE.MeshBasicMaterial({color:0xc01818}));pivot.add(needle);
        const cap=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.02,10),M.dark);cap.rotation.x=Math.PI/2;cap.position.set(0,1.38,.16);grp.add(cap);
        const pp=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.7,8),M.pipe);pp.rotation.x=Math.PI/2;pp.position.set(0,1.2,-.42);grp.add(pp);
        const lampMat=new THREE.MeshBasicMaterial({color:0xffb020});
        const lamp=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),lampMat);lamp.position.set(.25,1.62,.12);grp.add(lamp);
        const lampGlow=new THREE.Sprite(new THREE.SpriteMaterial({map:T.glow,color:0xffa020,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8}));
        lampGlow.scale.set(.5,.5,1);lampGlow.position.copy(lamp.position);grp.add(lampGlow);
        const marker=new THREE.Sprite(markerMat);marker.scale.set(.42,.42,1);marker.position.set(0,2.35,0);grp.add(marker);
        const tick=new THREE.Sprite(new THREE.SpriteMaterial({map:T.tick,transparent:true,depthWrite:false,depthTest:false,fog:false,opacity:0}));
        tick.scale.set(1.3,.33,1);tick.position.set(0,2,.1);tick.visible=false;grp.add(tick);
        addCol(s.x,s.z,s.dr?0.72:0.4,s.dr?0.4:0.72,1.7);
        const nrm=new THREE.Vector3(-s.dc,0,-s.dr);
        const base=rnd(.82,1.0)*(Math.random()<.5?1:-1);
        return {i,x:s.x,z:s.z,nrm,pivot,lampMat,lampGlow,marker,tick,tickT:0,done:false,prog:0,base,target:rnd(-.25,.25),ang:base,center:new THREE.Vector3(s.x,1.38,s.z).addScaledVector(nrm,.15)};
      });

      // ── 予備電池 ──
      const used=new Set(gaugeSpots.map(g=>g.r+','+g.c));
      const batSpots=[];
      shuffle(freeCells.slice()).forEach(([r,c])=>{
        if(batSpots.length>=4||used.has(r+','+c)||r>=ROWS-2)return;
        const x=cx(c)+rnd(-1,1),z=cz(r)+rnd(-1,1);
        if(batSpots.some(b=>Math.hypot(b.x-x,b.z-z)<10))return;
        batSpots.push({x,z});
      });
      const batGeo=new THREE.CylinderGeometry(.08,.08,.3,12),batBand=new THREE.CylinderGeometry(.086,.086,.07,12);extraGeos.push(batGeo,batBand);
      const batMat=new THREE.MeshPhongMaterial({color:0x202428,shininess:80,specular:0x888888});
      const bandMat=new THREE.MeshBasicMaterial({color:0x00e8c8});
      const batGlowMat=new THREE.SpriteMaterial({map:T.glow,color:0x00e8c8,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.8});
      const bats=batSpots.map(b=>{
        const g=new THREE.Group();g.position.set(b.x,.5,b.z);scene.add(g);
        const m=new THREE.Mesh(batGeo,batMat);m.rotation.z=.5;g.add(m);
        const band=new THREE.Mesh(batBand,bandMat);m.add(band);band.position.y=.08;
        const gl=new THREE.Sprite(batGlowMat);gl.scale.set(.9,.9,1);g.add(gl);
        return {g,taken:false,ph:Math.random()*6};
      });

      // ── 影 ──
      const ghost=new THREE.Group();scene.add(ghost);
      const prof=[[0,0],[.42,.02],[.36,.3],[.4,.6],[.33,1.0],[.26,1.3],[.2,1.45],[.08,1.52],[0,1.53]].map(p=>new THREE.Vector2(p[0],p[1]));
      const lathe=new THREE.LatheGeometry(prof,14);extraGeos.push(lathe);
      const ghostMat=new THREE.MeshBasicMaterial({color:0x020104,transparent:true,opacity:.94});
      const gBody=new THREE.Mesh(lathe,ghostMat);gBody.castShadow=true;ghost.add(gBody);
      const auraMat=new THREE.MeshBasicMaterial({color:0x4a1460,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,side:THREE.BackSide,depthWrite:false});
      const aura=new THREE.Mesh(lathe,auraMat);aura.scale.set(1.12,1.04,1.12);ghost.add(aura);
      const head=new THREE.Mesh(new THREE.SphereGeometry(.19,14,10),ghostMat);head.position.y=1.7;head.scale.set(1,1.15,1);head.castShadow=true;ghost.add(head);
      const armGeo=new THREE.CylinderGeometry(.035,.015,1.1,6);armGeo.translate(0,-.55,0);extraGeos.push(armGeo);
      const arms=[-1,1].map(s=>{const a=new THREE.Mesh(armGeo,ghostMat);a.position.set(s*.3,1.38,.02);a.rotation.z=s*.12;ghost.add(a);return a;});
      const eyeMat=new THREE.MeshBasicMaterial({color:0xff2848,fog:false});
      const eyeGlowMat=new THREE.SpriteMaterial({map:T.glow,color:0xff1838,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,fog:false,opacity:.9});
      const eyes=[-1,1].map(s=>{const e=new THREE.Mesh(new THREE.SphereGeometry(.022,6,4),eyeMat);e.position.set(s*.07,1.72,.16);ghost.add(e);const gl=new THREE.Sprite(eyeGlowMat);gl.scale.set(.22,.22,1);gl.position.copy(e.position);ghost.add(gl);return e;});
      const WIS=36,wisPos=new Float32Array(WIS*3),wisLife=new Float32Array(WIS);
      for(let i=0;i<WIS;i++){wisLife[i]=Math.random();}
      const wisGeo=new THREE.BufferGeometry();wisGeo.setAttribute('position',new THREE.BufferAttribute(wisPos,3));
      const wisMat=new THREE.PointsMaterial({map:T.dot,color:0x140a1e,size:.32,transparent:true,opacity:.7,depthWrite:false});
      const wisps=new THREE.Points(wisGeo,wisMat);wisps.frustumCulled=false;ghost.add(wisps);
      const GH={x:0,z:0,wx:0,wz:0,lit:0,cool:0,seen:0,fade:1,stun:0,warp:0};
      function placeGhostFar(px,pz,minD=26){
        const opts=freeCells.filter(([r,c])=>Math.hypot(cx(c)-px,cz(r)-pz)>minD);
        const [r,c]=pick(opts.length?opts:freeCells);
        GH.x=cx(c);GH.z=cz(r);GH.fade=0;newWander();
      }
      function newWander(){const [r,c]=pick(freeCells);GH.wx=cx(c)+rnd(-1,1);GH.wz=cz(r)+rnd(-1,1);}
      placeGhostFar(START.x,START.z,32);

      flushParts();
      {
        const g=new THREE.BufferGeometry();
        g.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(su,2));
        g.setIndex(si);g.computeVertexNormals();
        const m=new THREE.Mesh(g,M.stripe);m.receiveShadow=true;scene.add(m);
      }

      // ── プレイヤー ──
      const P={x:START.x,z:START.z,yaw:0,pitch:-.04,vx:0,vz:0,bob:0,bobAmt:0,swayX:0,swayY:0,shake:0,hitT:0,fovK:0};
      function collide(){
        for(let it=0;it<2;it++){
          P.x=clamp(P.x,-HW+P_R+.3,HW-P_R-.3);P.z=clamp(P.z,-HD+P_R+.3,HD-P_R-.2);
          for(const b of cols){
            const qx=clamp(P.x,b.x0,b.x1),qz=clamp(P.z,b.z0,b.z1);
            const dx=P.x-qx,dz=P.z-qz,d2=dx*dx+dz*dz;
            if(d2>=P_R*P_R)continue;
            if(d2>1e-8){const d=Math.sqrt(d2);P.x=qx+dx/d*P_R;P.z=qz+dz/d*P_R;}
            else{
              const pl=P.x-b.x0,pr=b.x1-P.x,pt=P.z-b.z0,pb=b.z1-P.z,m=Math.min(pl,pr,pt,pb);
              if(m===pl)P.x=b.x0-P_R;else if(m===pr)P.x=b.x1+P_R;else if(m===pt)P.z=b.z0-P_R;else P.z=b.z1+P_R;
            }
          }
        }
      }
      // 2点間の遮蔽（背の高い障害物のみ）
      function occluded(ax,az,bx,bz){
        const dx=bx-ax,dz=bz-az;
        for(const b of cols){
          if(b.h<1.6)continue;
          let t0=0,t1=1;
          for(const [p,d,lo,hi] of [[ax,dx,b.x0,b.x1],[az,dz,b.z0,b.z1]]){
            if(Math.abs(d)<1e-6){if(p<lo||p>hi){t0=2;break;}continue;}
            let ta=(lo-p)/d,tb=(hi-p)/d;if(ta>tb)[ta,tb]=[tb,ta];
            t0=Math.max(t0,ta);t1=Math.min(t1,tb);if(t0>t1)break;
          }
          if(t0<=t1&&t0<1)return true;
        }
        return false;
      }

      // ── サイズ調整 ──
      function resize(){
        if(S.disposed||!G)return;
        const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);
        renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
      }
      resize();
      if(window.ResizeObserver){ro=new ResizeObserver(resize);ro.observe(wrap);}
      on(window,'resize',resize);

      // ── 遊び方オーバーレイ ──
      el.load.innerHTML=`<div class="factory3d-sub">NIGHT SHIFT ／ PLANT No.3 ／ POWER FAILURE</div>
        <h3>停電した第三工場</h3>
        <ul>
          <li>🔦 懐中電灯の電池が<u>体力</u>。予備電池を拾って補充</li>
          <li>⚙ <b>計器5か所</b>の正面で【点検】を長押し</li>
          <li>👁 <em>「影」</em>はライトを嫌う。照らして追い払え</li>
          <li>🚪 全部終えたら<i>緑の非常口</i>へ　制限 ${TIME_LIMIT}秒</li>
        </ul>
        <div class="factory3d-keys">スマホ：左で移動・右ドラッグで視点・ボタン長押しで点検<br>PC：WASD／矢印・マウスドラッグ・E／Space</div>
        <div class="factory3d-bar run"><i></i></div>`;
      S.phase='intro';
      let introT=3.1;
      on(el.load,'pointerdown',e=>{e.stopPropagation();skipIntro();});
      skipIntroFn=()=>{if(S.phase==='intro')introT=Math.min(introT,.05);};

      // ── 状態・演出 ──
      let tAll=0,hudT=0,lightT=rnd(4,8),lightSeq=[],flashV=0,lowWarned=false,exitWarnT=0,ghostSeT=0,overT=0,doorOpen=0;
      const camFwd=new THREE.Vector3();
      let lastShown='';

      function startPlay(){
        S.phase='play';el.load.classList.add('hide');
        toast('点検開始。計器を探せ');se('machine');
      }

      function endWith(reason){
        if(S.phase==='over')return;
        S.phase='over';S.endReason=reason;overT=reason==='down'?1.1:reason==='clear'?.9:.4;
        if(reason==='down'){se('ghost');}
        if(reason==='clear'){se('decide');}
        if(reason==='timeup'){toast('時間切れ','bad');se('warn');}
      }

      // 雷の予約
      function scheduleLightning(){
        lightSeq=[0,.08+rnd(0,.05),.22+rnd(0,.1),.5+rnd(0,.2)].slice(0,2+((Math.random()*3)|0)).map((t,i)=>({t,v:i===0?1:rnd(.4,.9)}));
        lightT=rnd(7,14);
      }

      // ── メインループ ──
      mg.loop(dt=>{
        if(S.disposed||!G)return;
        dt=clamp(dt||0,0,.05);
        tAll+=dt;
        if(S.phase==='intro'){introT-=dt;if(introT<=0)startPlay();}
        else if(S.phase==='play'){update(dt);if(S.disposed)return;}
        else if(S.phase==='over'){
          overT-=dt;
          if(S.endReason==='down'){el.dark.style.opacity=String(clamp(1-overT/1.1,0,1));spot.intensity*=.9;}
          if(S.endReason==='clear'){doorOpen=Math.min(1,doorOpen+dt*1.5);el.flash.style.opacity=String(clamp(1-overT/.9,0,1)*.6);}
          if(overT<=0){mg.end(S.endReason);return;}
        }
        if(S.disposed)return;
        world(dt);
        renderer.render(scene,camera);
      });

      function update(dt){
        S.elapsed+=dt;S.timeLeft-=dt;
        if(S.timeLeft<=0){S.timeLeft=0;endWith('timeup');return;}
        // 視点
        P.yaw+=inp.dyaw;P.pitch=clamp(P.pitch+inp.dpitch,-1.25,1.2);
        P.swayX=P.swayX*.85+inp.dyaw*2.2;P.swayY=P.swayY*.85+inp.dpitch*2.2;
        inp.dyaw=inp.dpitch=0;
        // 移動
        let mx=inp.r-inp.l+inp.jx,mz=inp.f-inp.b-inp.jy;
        const ml=Math.hypot(mx,mz);if(ml>1){mx/=ml;mz/=ml;}
        const inspecting=inp.actKey||inp.actBtn;
        const spd=SPEED*(inspecting&&curGauge?.25:1)*(P.hitT>0?.55:1);
        const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
        const tvx=(rx*mx+fx*mz)*spd,tvz=(rz*mx+fz*mz)*spd;
        const k=1-Math.exp(-dt*10);P.vx+=(tvx-P.vx)*k;P.vz+=(tvz-P.vz)*k;
        P.x+=P.vx*dt;P.z+=P.vz*dt;collide();
        const sp2=Math.hypot(P.vx,P.vz)/SPEED;
        P.bob+=dt*9.5*sp2;P.bobAmt+=(Math.min(1,sp2)-P.bobAmt)*Math.min(1,dt*6);

        // 電池
        S.battery-=dt*.5;
        if(S.battery<=0){S.battery=0;endWith('down');return;}
        if(S.battery<25&&!lowWarned){lowWarned=true;toast('電池が残りわずか','bad');se('warn');}
        if(S.battery>=30)lowWarned=false;

        // 予備電池
        bats.forEach(b=>{
          if(b.taken)return;
          if(Math.hypot(b.g.position.x-P.x,b.g.position.z-P.z)<1.1){
            b.taken=true;b.g.visible=false;S.picked++;
            S.battery=Math.min(100,S.battery+32);toast('予備電池 +32%','ok');se('btn');
          }
        });

        // 点検
        camera.getWorldDirection(camFwd);
        curGauge=null;
        let best=1e9;
        for(const g of gauges){
          if(g.done)continue;
          const dx=g.center.x-camera.position.x,dy=g.center.y-camera.position.y,dz=g.center.z-camera.position.z;
          const d=Math.hypot(dx,dy,dz);
          if(d>2.9)continue;
          const facing=(dx*camFwd.x+dy*camFwd.y+dz*camFwd.z)/d;
          const front=(P.x-g.x)*g.nrm.x+(P.z-g.z)*g.nrm.z;
          if(facing>.8&&front>.05&&d<best){best=d;curGauge=g;}
        }
        gauges.forEach(g=>{if(g!==curGauge&&!g.done)g.prog=Math.max(0,g.prog-dt*1.5);});
        if(curGauge){
          const g=curGauge;
          if(inspecting){
            if(g.prog===0)se('tool');
            g.prog+=dt/HOLD_T;
            if(g.prog>=1){
              g.prog=1;g.done=true;S.inspected++;g.tickT=1.8;g.tick.visible=true;g.marker.visible=false;
              g.lampMat.color.setHex(0x30ff70);g.lampGlow.material.color.setHex(0x30ff70);
              se('repair');
              mg.setScore(`点検 ${S.inspected}/${NEED}`);
              el.chk[S.inspected-1].classList.add('ok');
              if(S.inspected>=NEED){toast('全計器 点検完了！非常口へ','ok');se('ach');exitLamp.material.color.setHex(0x30ff70);}
              else toast(`点検完了 ${S.inspected}/${NEED}`,'ok');
            }
          }else g.prog=Math.max(0,g.prog-dt*1.5);
        }
        const showProg=curGauge?curGauge.prog:0;
        el.ring.classList.toggle('on',!!curGauge);
        el.prog.setAttribute('stroke-dashoffset',String(163.4*(1-showProg)));
        el.prompt.classList.toggle('on',!!curGauge&&showProg<.02);
        el.act.classList.toggle('ready',!!curGauge);

        // 非常口
        const dExit=Math.hypot(P.x-exitX,P.z-(exitZ+.6));
        if(dExit<1.9){
          if(S.inspected>=NEED){endWith('clear');return;}
          if(exitWarnT<=0){toast(`まだ点検が残っている（${S.inspected}/${NEED}）`,'bad');exitWarnT=3;se('back');}
        }
        exitWarnT-=dt;

        // 影
        updateGhost(dt);
        if(S.phase!=='play')return;

        // HUD（10Hz程度）
        hudT-=dt;
        if(hudT<=0){
          hudT=.1;
          const b=Math.ceil(S.battery);
          el.batI.style.width=b+'%';el.pct.textContent=b+'%';
          el.bat.className='factory3d-bat'+(b<=25?' low':b<=50?' mid':'');
          const tl=Math.ceil(S.timeLeft)+'s';if(tl!==lastShown){mg.setTimer(tl);lastShown=tl;}
          // 次の目標
          let tx,tz,lbl,ex=false;
          if(S.inspected>=NEED){tx=exitX;tz=exitZ+.6;lbl='非常口';ex=true;}
          else{let bd=1e9;gauges.forEach(g=>{if(g.done)return;const d=Math.hypot(g.x-P.x,g.z-P.z);if(d<bd){bd=d;tx=g.x;tz=g.z;}});lbl='計器';}
          const dx=tx-P.x,dz=tz-P.z,dist=Math.hypot(dx,dz);
          const lx=dx*rx+dz*rz,lf=dx*fx+dz*fz;
          el.navB.style.transform=`rotate(${Math.atan2(lx,lf)}rad)`;
          el.navT.textContent=`${lbl} ${Math.round(dist)}m`;
          el.nav.classList.toggle('exit',ex);
        }
      }

      let curGauge=null;
      function updateGhost(dt){
        GH.fade=Math.min(1,GH.fade+dt*.6);
        GH.cool-=dt;
        const dx=P.x-GH.x,dz=P.z-GH.z,dist=Math.hypot(dx,dz)||.001;
        const nx=dx/dist,nz=dz/dist;
        // ライトで照らしているか
        const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
        const cosA=(-nx*fx+-nz*fz);
        const beamOn=S.battery>0&&spot.intensity>FL_MAX*.25;
        const lit=beamOn&&dist<15&&cosA>Math.cos(.42)&&!occluded(P.x,P.z,GH.x,GH.z);
        // 暗がりにいるか（非常灯の近くは少し明るい）
        let nearLight=false;
        beacons.forEach(b=>{if(Math.hypot(b.pos.x-P.x,b.pos.z-P.z)<6.5)nearLight=true;});
        if(Math.hypot(exitX-P.x,exitZ-P.z)<6)nearLight=true;
        const prog=S.elapsed/TIME_LIMIT;
        const aggro=nearLight?13:22;
        if(lit&&GH.fade>.5){
          GH.lit+=dt;GH.stun=.6;
          GH.x-=nx*dt*2.4;GH.z-=nz*dt*2.4;
          if(GH.lit>1.25){
            S.repels++;GH.lit=0;toast('影が霧散した');se('noise');
            placeGhostFar(P.x,P.z,24);
          }
        }else{
          GH.lit=Math.max(0,GH.lit-dt*.5);
          GH.stun=Math.max(0,GH.stun-dt);
          if(GH.stun<=0){
            if(dist<aggro){
              const v=(1.45+1.15*prog)*(nearLight?.75:1.15)*(dist<6?1.25:1);
              GH.x+=nx*v*dt;GH.z+=nz*v*dt;
            }else{
              const wx=GH.wx-GH.x,wz=GH.wz-GH.z,wd=Math.hypot(wx,wz);
              if(wd<1)newWander();else{GH.x+=wx/wd*1.3*dt;GH.z+=wz/wd*1.3*dt;}
            }
          }
        }
        GH.x=clamp(GH.x,-HW+.6,HW-.6);GH.z=clamp(GH.z,-HD+.6,HD-.6);
        // 接近の気配
        ghostSeT-=dt;
        if(dist<8&&ghostSeT<=0&&!lit){se('ghost');ghostSeT=7;}
        // 接触
        if(dist<.95&&GH.fade>.6&&GH.cool<=0){
          S.hits++;S.battery=Math.max(0,S.battery-HIT_DMG);
          P.hitT=1;P.shake=1;GH.cool=2;
          wrap.classList.add('factory3d-hit');se('warn');
          toast(`影に触れられた　電池 -${HIT_DMG}%`,'bad');
          if(S.battery<=0){endWith('down');return;}
          placeGhostFar(P.x,P.z,22);
        }
        // 気配の赤み
        const prox=clamp(1-(dist-1)/7,0,1)*GH.fade*(lit?.4:1);
        el.red.style.opacity=String(Math.max(prox*.55,P.hitT*.9));
      }

      // 毎フレームの演出
      function world(dt){
        // カメラ
        P.hitT=Math.max(0,P.hitT-dt*1.1);P.shake=Math.max(0,P.shake-dt*1.6);
        if(P.hitT<=0)wrap.classList.remove('factory3d-hit');
        const bobY=Math.sin(P.bob)*.045*P.bobAmt,bobX=Math.cos(P.bob*.5)*.03*P.bobAmt;
        const sh=P.shake*P.shake;
        camera.position.set(P.x+rx0()*bobX+rnd(-1,1)*sh*.06,EYE+bobY+rnd(-1,1)*sh*.05,P.z+rz0()*bobX);
        camera.rotation.set(P.pitch+rnd(-1,1)*sh*.03,P.yaw,Math.cos(P.bob*.5)*.008*P.bobAmt+Math.sin(tAll*13)*sh*.06);
        const fov=72+Math.sin(tAll*20)*P.hitT*6+P.hitT*8;
        if(Math.abs(camera.fov-fov)>.05){camera.fov=fov;camera.updateProjectionMatrix();}
        // 懐中電灯
        const bf=S.battery/100;
        let inten=FL_MAX*(.3+.7*Math.min(1,bf*1.4+.1));
        if(bf<.25&&Math.random()<.09)inten*=rnd(.05,.5);
        if(P.hitT>.3&&Math.random()<.4)inten*=.1;
        if(S.phase==='over'&&S.endReason==='down')inten=Math.max(0,overT-.3)*FL_MAX*(Math.random()<.5?1:.2);
        spot.intensity=inten;
        spot.angle=.4+.08*Math.min(1,bf*1.5);
        spotTarget.position.set(clamp(-P.swayX,-1.2,1.2)+Math.sin(tAll*1.3)*.04,clamp(-P.swayY,-1,1)+Math.sin(tAll*1.7)*.03-.25-bobY*2,-6);
        fbeam.lookAt(camera.localToWorld(spotTarget.position.clone()));
        fbMat.opacity=.05*(inten/FL_MAX);
        dustMat.opacity=.5*(inten/FL_MAX);
        // 埃
        for(let i=0;i<DUST;i++){
          dustPos[i*3]+=dustVel[i*3]*dt;dustPos[i*3+1]+=dustVel[i*3+1]*dt;dustPos[i*3+2]+=dustVel[i*3+2]*dt-P.vz*0;
          if(dustPos[i*3+1]<-2.5||Math.abs(dustPos[i*3])>3.5)seedDust(i);
        }
        dustGeo.attributes.position.needsUpdate=true;
        // 回転灯
        beacons.forEach(b=>{
          b.ph+=dt*3.2;b.rot.rotation.y=b.ph;
          if(b.light)b.light.intensity=1.5+4*Math.abs(Math.cos(b.ph));
        });
        // 雷
        lightT-=dt;
        if(lightT<=0&&S.phase!=='intro'){scheduleLightning();se('noise');}
        flashV=Math.max(0,flashV-dt*5);
        if(lightSeq.length){lightSeq.forEach(s=>{s.t-=dt;if(s.t<=0&&!s.fired){s.fired=true;flashV=Math.max(flashV,s.v);}});if(lightSeq.every(s=>s.fired))lightSeq=[];}
        hemi.intensity=.35+flashV*3;
        M.glass.color.setRGB(.35+flashV*.65,.41+flashV*.59,.63+flashV*.37);
        M.shaft.opacity=.045+flashV*.32;
        if(S.phase!=='over'||S.endReason!=='clear')el.flash.style.opacity=String(flashV*.22);
        T.rain.offset.y=(T.rain.offset.y+dt*.35)%1;
        // 蛍光灯のちらつき
        tubes.forEach(t=>{t.t-=dt;const onv=t.t<0?(Math.random()<.5?1:0):0;if(t.t<-.25)t.t=rnd(1.5,5);t.mat.color.setScalar(onv?.95:.08);t.gl.material.opacity=onv?.5:0;});
        // 火花
        spkT-=dt;if(spkT<=0){burstSparks();spkT=rnd(2.5,6);}
        spkGlow.material.opacity=Math.max(0,spkGlow.material.opacity-dt*4);
        for(let i=0;i<SPK;i++){
          if(spkLife[i]<=0)continue;
          spkLife[i]-=dt;spkVel[i*3+1]-=9.8*dt;
          spkPos[i*3]+=spkVel[i*3]*dt;spkPos[i*3+1]+=spkVel[i*3+1]*dt;spkPos[i*3+2]+=spkVel[i*3+2]*dt;
          if(spkPos[i*3+1]<.02){spkPos[i*3+1]=.02;spkVel[i*3+1]*=-.3;spkVel[i*3]*=.5;spkVel[i*3+2]*=.5;}
          if(spkLife[i]<=0)spkPos[i*3+1]=-50;
        }
        spkGeo.attributes.position.needsUpdate=true;
        // 計器
        gauges.forEach(g=>{
          let a;
          if(g.done)a=g.target+Math.sin(tAll*3+g.i)*.02;
          else if(g.prog>0)a=g.base*(1-g.prog)+g.target*g.prog+Math.sin(tAll*38)*.25*(1-g.prog);
          else a=g.base+Math.sin(tAll*7+g.i)*.05;
          g.ang+=(a-g.ang)*Math.min(1,dt*12);
          g.pivot.rotation.z=-g.ang*2.2;
          if(!g.done){const p=.5+.5*Math.sin(tAll*4+g.i);g.lampGlow.material.opacity=.3+.6*p;g.marker.position.y=2.35+Math.sin(tAll*2.2+g.i)*.08;g.marker.material.opacity=.85;}
          if(g.tickT>0){g.tickT-=dt;g.tick.position.y=2+(1.8-g.tickT)*.3;g.tick.material.opacity=Math.min(1,g.tickT*1.5);if(g.tickT<=0)g.tick.visible=false;}
        });
        // 予備電池
        bats.forEach(b=>{if(b.taken)return;b.g.position.y=.5+Math.sin(tAll*2.5+b.ph)*.08;b.g.rotation.y+=dt*1.6;});
        // 非常口
        if(S.inspected>=NEED){exitLight.intensity=4+2*Math.sin(tAll*4);exitGlow.material.opacity=.8+.2*Math.sin(tAll*4);}
        else{exitLight.intensity=1.5;exitGlow.material.opacity=.55;}
        if(doorOpen>0){door.userData.slab.rotation.y=-doorOpen*1.4;door.userData.slab.position.x=-doorOpen*.6;}
        // 影の見た目
        ghost.position.set(GH.x,.04+Math.sin(tAll*1.7)*.06,GH.z);
        ghost.rotation.y=Math.atan2(P.x-GH.x,P.z-GH.z);
        const flick=GH.lit>0&&GH.stun>0?(Math.random()<.5?.25:.8):1;
        ghostMat.opacity=.94*GH.fade*flick;auraMat.opacity=.35*GH.fade*flick;
        ghost.visible=GH.fade>.02;
        eyeMat.color.setRGB(1,.16,.28).multiplyScalar(GH.fade);eyeGlowMat.opacity=.9*GH.fade*flick;
        ghost.scale.set(1+Math.sin(tAll*3)*.03,1+Math.sin(tAll*2.3)*.02,1);
        arms.forEach((a,i)=>{a.rotation.x=Math.sin(tAll*1.4+i)*.15;});
        for(let i=0;i<WIS;i++){
          wisLife[i]+=dt*.45;if(wisLife[i]>1){wisLife[i]=0;}
          const l=wisLife[i],ang=i*2.4+l*2;
          wisPos[i*3]=Math.cos(ang)*(.25+l*.3);wisPos[i*3+1]=l*2.1;wisPos[i*3+2]=Math.sin(ang)*(.25+l*.3);
        }
        wisGeo.attributes.position.needsUpdate=true;wisMat.opacity=.6*GH.fade;
        if(toastT>0)toastT-=dt;
      }
      const rx0=()=>Math.cos(P.yaw),rz0=()=>-Math.sin(P.yaw);
      // テスト用フック（localStorage factory3d_debug=1 のときだけ）
      try{if(localStorage.getItem('factory3d_debug')==='1')window.__f3d={S,P,GH,gauges,bats,exit:{x:exitX,z:exitZ},inp,renderer,skip:()=>skipIntro()};}catch(e){}
    }

    let skipIntroFn=null;
    function skipIntro(){if(skipIntroFn)skipIntroFn();}

    // ══════════════════════════════════════════════════════
    // 結果
    // ══════════════════════════════════════════════════════
    return {result(reason){
      cleanup();
      const n=S.inspected;
      const stat=`点検 <span class="${n>=NEED?'up':'down'}">${n}/${NEED}</span>　電池残量 <span class="up">${Math.ceil(S.battery)}%</span>`+
        `<br>影との接触 <span class="${S.hits?'down':'up'}">${S.hits}</span>　撃退 <span class="up">${S.repels}</span>　経過 ${Math.round(S.elapsed)}秒`;
      if(reason==='clear'){
        return {
          title:'🏭 第三工場、点検完了',summary:stat+'<br>停電の闇の中、全計器を確認して非常口から脱出した。',
          fx:{jobRep:10,certKnow:4,money:6000,mental:3,fatigue:8},time:70,sp:2,
          log:'停電した第三工場で計器5か所を点検した。暗がりに、確かに何かがいた。',
          cutin:['win','……全部異常なし。あの影のことは、報告書には書かれへんな。'],
          after(){gs.factoryNetaAvail=true;gs.factoryNetaType='第三工場の影';},
        };
      }
      if(reason==='down'){
        return {
          title:'🔦 ライトが消えた',summary:stat+'<br>電池が尽き、闇の中で何かに肩を掴まれた――気がした。',
          fx:{jobRep:n*2,mental:-8,fatigue:9},time:70,
          log:'第三工場の点検中に懐中電灯が切れた。あの影は何だったのか。',
          cutin:['fear','……真っ暗や。今、誰か後ろにおったよな……？'],
        };
      }
      if(reason==='timeup'){
        return {
          title:'⏱ 点検、時間切れ',summary:stat+'<br>復電の時刻に間に合わなかった。点検できた分だけ報告する。',
          fx:{jobRep:n*2,money:n*1000,fatigue:8},time:70,
          log:`停電中の第三工場で計器を${n}か所点検した。時間が足りなかった。`,
          cutin:['tired','……間に合わんかった。残りは朝番に引き継ぎや。'],
        };
      }
      return {
        title:'🏭 点検を切り上げた',summary:S.phase==='load'?'':stat,
        fx:{fatigue:3},time:30,log:'停電した工場の見回りを途中で切り上げた。',cutin:null,
      };
    }};
  },
});
