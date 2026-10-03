// ══════════════════════════════════════════════════════════
// タワーディフェンス「荒らしディフェンス」
// 今夜の配信に荒らしの大群がなだれ込んでくる。コメント欄の流れに沿って
// 防衛を置き、最下部の「配信の心」を守り切る。全5ウェーブ、最後は炎上アカウント。
// タイトル → 導入会話 → 防衛（チュートリアル付き）→ 評価＆エンディング会話 → 結果
// 記録は gs.defenseData に保存。初クリアで第2レーン「深夜の二重螺旋」が解放される。
// ══════════════════════════════════════════════════════════
addMinigameStyle('defense',`
.mg-defense{background:radial-gradient(ellipse at 50% 70%,rgba(138,82,212,.12),transparent 70%),var(--bg);}
.defense-top{flex:none;width:100%;box-sizing:border-box;display:flex;align-items:center;gap:7px;padding:5px 8px;
  background:linear-gradient(180deg,rgba(22,13,44,.95),rgba(10,7,22,.75));border-bottom:1px solid rgba(138,82,212,.28);font-family:var(--dot);transition:opacity .3s;}
.defense-top.defense-hide{visibility:hidden;opacity:0;}
.defense-st{display:flex;gap:9px;align-items:baseline;white-space:nowrap;}
.defense-life{color:#ff6a9a;font-size:.86rem;text-shadow:0 0 8px rgba(255,80,140,.5);}
.defense-money{color:var(--gd);font-size:.86rem;text-shadow:0 0 8px rgba(232,184,48,.4);}
.defense-money.bump{animation:defense-bump .25s ease-out;}
.defense-life.bump{animation:defense-hurt .35s ease-out;}
@keyframes defense-bump{40%{transform:scale(1.25);color:#fff6c0;}}
@keyframes defense-hurt{30%{transform:translateX(-3px);color:#fff;}60%{transform:translateX(3px);}}
.defense-wave{color:var(--cy);font-family:var(--mono);font-size:.68rem;letter-spacing:.06em;}
.defense-btn{font-family:var(--dot);font-size:.7rem;color:var(--cy);background:rgba(0,232,200,.07);border:1px solid rgba(0,232,200,.6);
  border-radius:3px;padding:0 9px;min-height:34px;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .08s;}
.defense-btn:active{transform:scale(.94);}
.defense-btn:disabled{opacity:.42;cursor:default;}
.defense-next{margin-left:auto;color:#fff;border-color:var(--pu);background:linear-gradient(180deg,rgba(138,82,212,.45),rgba(138,82,212,.18));box-shadow:0 0 10px rgba(138,82,212,.35);}
.defense-next.go{animation:defense-blink 1s ease-in-out infinite;}
.defense-spd{min-width:42px;}
.defense-spd.on{color:#05040e;background:var(--cy);box-shadow:0 0 10px rgba(0,232,200,.6);}
@keyframes defense-blink{50%{box-shadow:0 0 18px rgba(138,82,212,.85);}}
.defense-stage{flex:1;min-height:0;width:100%;position:relative;overflow:hidden;}
.defense-canvas{position:absolute;left:0;top:0;display:block;touch-action:none;cursor:pointer;}
.defense-menu{position:absolute;left:8px;right:8px;max-width:400px;margin:0 auto;z-index:3;box-sizing:border-box;padding:8px;
  background:rgba(9,6,20,.96);border:1px solid var(--pu);border-radius:5px;box-shadow:0 0 22px rgba(138,82,212,.35),inset 0 0 20px rgba(138,82,212,.08);
  font-family:var(--dot);color:var(--tx);display:none;}
.defense-menu.on{display:block;animation:defense-pop .16s ease-out;}
@keyframes defense-pop{from{opacity:0;transform:translateY(6px) scale(.98);}}
.defense-mh{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:.74rem;color:var(--tx-b);}
.defense-mh small{font-family:var(--mono);color:var(--tx-d);font-size:.6rem;}
.defense-x{margin-left:auto;background:none;border:1px solid rgba(187,174,221,.3);color:var(--tx);border-radius:3px;min-width:34px;min-height:30px;cursor:pointer;font-size:.8rem;}
.defense-opts{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.defense-opt{display:flex;align-items:center;gap:6px;text-align:left;padding:5px 6px;min-height:52px;border-radius:4px;cursor:pointer;
  background:rgba(138,82,212,.07);border:1px solid rgba(138,82,212,.35);color:var(--tx);font-family:var(--dot);-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .08s;}
.defense-opt:active{transform:scale(.96);}
.defense-opt:hover{border-color:var(--cy);background:rgba(0,232,200,.07);}
.defense-opt.poor,.defense-btn.poor{opacity:.45;}
.defense-opt canvas{flex:none;width:40px;height:40px;}
.defense-opt b{display:block;font-weight:normal;font-size:.68rem;color:var(--tx-b);line-height:1.3;}
.defense-opt small{display:block;font-size:.56rem;color:var(--tx-d);line-height:1.35;}
.defense-opt i{font-style:normal;font-family:var(--mono);font-size:.66rem;color:var(--gd);}
.defense-shake{animation:defense-no .3s ease-out;}
@keyframes defense-no{20%{transform:translateX(-5px);}40%{transform:translateX(5px);}60%{transform:translateX(-3px);}80%{transform:translateX(2px);}}
.defense-info{display:flex;gap:8px;align-items:center;font-size:.62rem;line-height:1.55;}
.defense-info canvas{flex:none;width:52px;height:52px;}
.defense-acts{display:flex;gap:6px;margin-top:7px;}
.defense-acts .defense-btn{flex:1;min-height:38px;font-size:.7rem;}
.defense-sell{color:var(--rd)!important;border-color:rgba(232,48,85,.55)!important;background:rgba(232,48,85,.07)!important;}
`);

registerMinigame({
  id:'defense', icon:'🛡', name:'荒らしディフェンス', genre:'タワーディフェンス', bgm:'stream',
  desc:'荒らしの大群がコメント欄に押し寄せる。流れに沿って防衛を置き、配信の「心」を最後まで守り抜け。',
  effect:'炎上↓ フォロワー↑ 配信人気↑ 精神↑ ／ 疲労+8 約60分',
  help:'空き枠に配置・タップで強化',
  start(body,mg){
    // ══ 定数・データ ══
    const COLS=7, ROWS=11, MAX_LIVES=10, WAVES=5;
    const FONT='"DotGothic16", monospace';
    const LANES={
      A:{name:'宵の一本道',   path:[[1,-1.4],[1,2],[5,2],[5,5],[1,5],[1,8],[3,8],[3,10]],
         slots:[[0,1],[3,1],[5,1],[2,3],[4,3],[3,4],[6,4],[0,6],[3,6],[2,7],[2,9],[4,9]],tut:3+4*100,spd:1,bonus:0,labelLeft:false},
      B:{name:'深夜の二重螺旋',path:[[5,-1.4],[5,1],[1,1],[1,4],[5,4],[5,7],[1,7],[1,9],[3,9],[3,10]],
         slots:[[3,0],[2,2],[4,3],[0,3],[6,2],[2,5],[4,6],[6,6],[0,8],[2,8],[3,8],[4,8]],tut:2+5*100,spd:1.18,bonus:30,labelLeft:true},
    };
    const TW={
      mod:   {name:'モデレーター',      col:'#00e8c8', glow:'cy', cost:50, up:60, desc:'単体に安定した攻撃',
              lv:[{range:2.3,rate:.62,dmg:10},{range:2.5,rate:.45,dmg:17}]},
      ng:    {name:'NGワードフィルター',col:'#b07cff', glow:'pu', cost:60, up:60, desc:'範囲減速＋継続ダメージ',
              lv:[{range:1.55,slow:.42,dps:5},{range:1.8,slow:.58,dps:10}]},
      cheer: {name:'常連の応援',        col:'#e8b830', glow:'gd', cost:70, up:70, desc:'周囲の攻撃速度UP',
              lv:[{range:1.6,buff:1.3},{range:1.95,buff:1.55}]},
      report:{name:'通報ボタン',        col:'#e83055', glow:'rd', cost:90, up:90, desc:'遅いが重い範囲攻撃',
              lv:[{range:2.8,rate:2.1,dmg:55,splash:.85},{range:3.1,rate:1.7,dmg:95,splash:1}]},
    };
    const TW_KEYS=['mod','ng','cheer','report'];
    const QUIP={mod:['BANします','ルール守ってね','見張りは任せて'],ng:['NG登録完了','その言葉は通さない'],cheer:['みんな、いくよー！','ペンライト準備OK'],report:['通報、受理','証拠は揃ってる']};
    const QUIP_UP={mod:'権限アップ！',ng:'辞書を拡張した',cheer:'推しのためなら！',report:'運営に直通だ'};
    const EN={
      troll:{name:'荒らし',        hp:34,  spd:2.0, r:.25, gold:8,  dmg:1},
      bot:  {name:'スパムBot',     hp:13,  spd:3.0, r:.16, gold:3,  dmg:1},
      anti: {name:'粘着アンチ',    hp:120, spd:1.25,r:.3,  gold:16, dmg:2},
      boss: {name:'炎上アカウント',hp:900, spd:.85, r:.55, gold:80, dmg:5},
    };
    // ウェーブ構成 [種類, 数, 間隔秒, 開始秒]（×1で全体120秒以内に収まる長さ）
    const WAVE_DEF=[
      {sub:'荒らしの先遣隊が来る',      g:[['troll',6,.75,0]]},
      {sub:'スパムBotの群れ',          g:[['troll',4,.8,0],['bot',6,.2,2],['bot',6,.2,4.5]]},
      {sub:'粘着アンチが張り付いてくる',g:[['troll',7,.6,0],['anti',3,1.6,1],['bot',6,.2,4]]},
      {sub:'大規模レイド',              g:[['bot',8,.2,0],['troll',9,.5,1],['anti',4,1.3,2.5],['bot',8,.2,6]]},
      {sub:'炎上アカウント 襲来',       g:[['troll',6,.55,0],['bot',8,.2,1.5],['anti',3,1.5,2.5],['boss',1,0,3.5]]},
    ];
    const CHAT=['草','888','おつ','初見','www','乙','うぽつ','神回','？？','ｗ','わこつ','ナイス','つよい','えぇ…','ねむい','雨すごい','おやすみ','かわいい'];
    const GRADE_COL={S:'#ffd84a',A:'#00e8c8',B:'#b07cff',C:'#9a8fb0'};
    const GRADE_RANK={S:4,A:3,B:2,C:1};

    // 記録（セーブに含まれる）
    const DD=gs.defenseData=Object.assign({plays:0,clears:0,best:null,lane:'A',laneB:false,stars:{}},gs.defenseData||{});
    if(!DD.stars)DD.stars={};
    const starsOf=(clear,l)=>!clear?0:l>=8?3:l>=4?2:1;
    const day=gs.day||1;
    const dayScale=1+Math.min(.2,Math.max(0,day-1)*.007);   // 日が進むほど荒らしが手強くなる
    if(day>=10)WAVE_DEF[1].g.push(['anti',2,1.5,3]);         // 後半の日は第2波から粘着アンチが混ざる
    let laneKey=DD.laneB&&DD.lane==='B'?'B':'A';
    let LANE=LANES[laneKey],PATH,SLOTS,SEG=[],PATH_LEN=0,HEART={x:0,y:0};
    function setLane(k){
      laneKey=k;LANE=LANES[k];
      PATH=LANE.path.map(p=>[p[0]+.5,p[1]+.5]);SLOTS=LANE.slots;
      SEG.length=0;PATH_LEN=0;
      for(let i=0;i<PATH.length-1;i++){
        const a=PATH[i],b=PATH[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
        SEG.push({ax:a[0],ay:a[1],dx:(b[0]-a[0])/len,dy:(b[1]-a[1])/len,len,start:PATH_LEN});PATH_LEN+=len;
      }
      HEART.x=PATH[PATH.length-1][0];HEART.y=PATH[PATH.length-1][1];
    }
    setLane(laneKey);

    // ══ DOM ══
    const top=document.createElement('div');top.className='defense-top defense-hide';
    top.innerHTML=`<div class="defense-st"><span class="defense-life">♥10</span><span class="defense-money">¥0</span><span class="defense-wave">WAVE 0/5</span></div>`+
      `<button class="defense-btn defense-next">▶ 開始</button><button class="defense-btn defense-spd">×1</button>`;
    const stage=document.createElement('div');stage.className='defense-stage';
    const cv=document.createElement('canvas');cv.className='defense-canvas';
    const menu=document.createElement('div');menu.className='defense-menu';
    stage.append(cv,menu);body.append(top,stage);
    const elLife=top.querySelector('.defense-life'),elMoney=top.querySelector('.defense-money'),elWave=top.querySelector('.defense-wave');
    const btnNext=top.querySelector('.defense-next'),btnSpd=top.querySelector('.defense-spd');
    const cx=cv.getContext('2d');
    const bgCv=document.createElement('canvas'),bg=bgCv.getContext('2d');
    const mosCv=document.createElement('canvas'),mos=mosCv.getContext('2d');
    const IMG={};
    ['normal','happy','win','fear','tired'].forEach(k=>{const im=new Image();im.src='assets/img/char_'+k+'.webp';IMG[k]=im;});

    // ══ 効果音（Web Audioで合成。無ければ AU.se にフォールバック） ══
    try{AU.init();if(AU.ctx&&AU.ctx.state==='suspended')AU.ctx.resume();}catch(e){}
    const seVol=()=>typeof AUDIO_SET!=='undefined'?AUDIO_SET.se:1;
    let noiseBuf=null;const sndLast={};
    const SND_FB={shot:'comment',hit:'comment',boom:'machine',coin:'comment',build:'tool',upgrade:'repair',sell:'back',deny:'warn',hurt:'noise',
      wave:'live',boss:'warn',clear:'ach',lose:'ghost',type:'comment',stamp:'rank',tap:'btn',death:'comment',spawn:'notif',start:'decide'};
    const SND_GAP={shot:.07,hit:.05,coin:.06,type:.045,death:.05,tap:.04};
    function tone(ac,f0,f1,dur,type,gain,delay){
      const t=ac.currentTime+(delay||0),o=ac.createOscillator(),g=ac.createGain();
      o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t+dur);
      g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(Math.max(.0002,gain),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+dur+.03);
    }
    function noise(ac,dur,gain,freq,delay){
      if(!noiseBuf){noiseBuf=ac.createBuffer(1,ac.sampleRate*.5,ac.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
      const t=ac.currentTime+(delay||0),s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
      s.buffer=noiseBuf;f.type='lowpass';f.frequency.value=freq;
      g.gain.setValueAtTime(Math.max(.0002,gain),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
      s.connect(f);f.connect(g);g.connect(ac.destination);s.start(t);s.stop(t+dur+.02);
    }
    function sfx(kind){
      const vol=seVol();if(!(vol>0)||mg._ended)return;
      const ac=AU.ctx;
      if(!ac){try{AU.se(SND_FB[kind]||'btn');}catch(e){}return;}
      const now=ac.currentTime;if(sndLast[kind]&&now-sndLast[kind]<(SND_GAP[kind]||.03))return;sndLast[kind]=now;
      const v=vol*.55;
      try{switch(kind){
        case 'shot':tone(ac,1500,700,.06,'square',.025*v);break;
        case 'hit':noise(ac,.05,.05*v,3200);break;
        case 'boom':noise(ac,.32,.2*v,900);tone(ac,150,40,.3,'sine',.3*v);break;
        case 'coin':tone(ac,1320,1320,.05,'square',.022*v);tone(ac,1980,1980,.09,'square',.022*v,.05);break;
        case 'build':[523,659,784].forEach((f,i)=>tone(ac,f,f,.09,'triangle',.08*v,i*.05));noise(ac,.08,.06*v,1500);break;
        case 'upgrade':[523,659,784,1047].forEach((f,i)=>tone(ac,f,f,.1,'square',.035*v,i*.06));tone(ac,2093,2093,.3,'sine',.04*v,.24);break;
        case 'sell':[784,587,440].forEach((f,i)=>tone(ac,f,f,.08,'triangle',.07*v,i*.05));break;
        case 'deny':tone(ac,150,120,.16,'square',.07*v);tone(ac,150,120,.12,'square',.06*v,.12);break;
        case 'hurt':tone(ac,240,55,.28,'sawtooth',.11*v);noise(ac,.18,.1*v,700);break;
        case 'wave':[392,523,659,784].forEach((f,i)=>tone(ac,f,f,.12,'triangle',.07*v,i*.07));break;
        case 'boss':for(let i=0;i<3;i++)tone(ac,380,760,.32,'sawtooth',.05*v,i*.34);break;
        case 'clear':[523,659,784,1047,784,1047,1319].forEach((f,i)=>tone(ac,f,f,i===6?.5:.12,'square',.04*v,i*.1));break;
        case 'lose':[392,330,262,196].forEach((f,i)=>tone(ac,f,f*.98,.35,'triangle',.08*v,i*.22));break;
        case 'type':tone(ac,820+Math.random()*120,820,.025,'square',.012*v);break;
        case 'stamp':noise(ac,.2,.2*v,500);tone(ac,95,45,.3,'sine',.35*v);break;
        case 'tap':tone(ac,720,720,.03,'sine',.035*v);break;
        case 'death':tone(ac,640,180,.09,'square',.03*v);break;
        case 'spawn':tone(ac,200,520,.18,'sawtooth',.04*v);break;
        case 'start':[659,988].forEach((f,i)=>tone(ac,f,f,.12,'triangle',.08*v,i*.08));break;
      }}catch(e){}
    }
    const se=t=>{try{AU.se(t);}catch(e){}};

    // ══ 状態 ══
    const modCount=(gs.listeners||[]).filter(l=>l.type==='mod').length;
    const modBonus=Math.min(3,modCount)*30;
    let scene='title', tr=null;
    let money=0, lives=MAX_LIVES, wave=0, phase='prep', cd=12, speed=1;
    let gt=0, rt=0, spawnT=0, queue=[], qi=0, endT=0, endReason='', kills=0, leaked=0, bossKilled=false, playT=0;
    let towers=[], enemies=[], shots=[], floats=[], rings=[], corpses=[], taps=[];
    let sel=null, hoverSlot=-1, previewType=null, shake=0, flash=0, heartHit=0, stop=0, toast=null;
    let banner=null, bubble=null, tut=0, tutT=0, dlg=null, ending=null;
    let slotTower=[];

    // パーティクル（使い回しプール）
    const PN=480, parts=new Array(PN);
    for(let i=0;i<PN;i++)parts[i]={life:0,max:1,x:0,y:0,vx:0,vy:0,col:'#fff',sz:2,g:0};
    let pi=0;
    function spark(x,y,vx,vy,life,col,sz,grav){
      const p=parts[pi];pi=(pi+1)%PN;
      p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=life;p.max=life;p.col=col;p.sz=sz;p.g=grav||0;
    }
    function burst(x,y,n,col,spd,sz){
      for(let i=0;i<n;i++){const a=Math.random()*6.283,v=spd*(.3+Math.random()*.7);spark(x,y,Math.cos(a)*v,Math.sin(a)*v,.35+Math.random()*.35,col,sz||2.4,0);}
    }

    const posOut={x:0,y:0,nx:0,ny:0};
    function posAt(d){
      let s=SEG[SEG.length-1];
      for(let i=0;i<SEG.length;i++){if(d<SEG[i].start+SEG[i].len){s=SEG[i];break;}}
      const t=Math.max(0,Math.min(s.len,d-s.start));
      posOut.x=s.ax+s.dx*t;posOut.y=s.ay+s.dy*t;posOut.nx=-s.dy;posOut.ny=s.dx;
      return posOut;
    }

    // 心のヒビ（固定乱数で生成）
    let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const CRACKS=[];
    for(let i=0;i<MAX_LIVES;i++){
      const a=(i*2.399)%6.283-1.2;const pts=[];let r=.08,ang=a;
      pts.push(Math.cos(ang)*r,Math.sin(ang)*r);
      for(let k=0;k<4;k++){r+=.22+rnd()*.12;ang+=(rnd()-.5)*.9;pts.push(Math.cos(ang)*r,Math.sin(ang)*r);}
      CRACKS.push(pts);
    }
    const SHARD_A=[0,.8,1.6,2.4,3.1,3.9,4.7,5.5];

    // ══ サイズ ══
    const dpr=Math.min(3,window.devicePixelRatio||1);
    let W=300,H=400,C=40,ox=0,oy=0;
    const X=u=>ox+u*C, Y=v=>oy+v*C;
    function resize(){
      const r=stage.getBoundingClientRect();
      W=Math.max(220,Math.floor(r.width));H=Math.max(300,Math.floor(r.height));
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      C=Math.min(W/COLS,(H-6)/ROWS);
      ox=(W-C*COLS)/2;oy=Math.max(4,(H-C*ROWS)/2+2);
      bgCv.width=cv.width;bgCv.height=cv.height;
      mosCv.width=cv.width;mosCv.height=cv.height;
      renderBg();placeMenu();
      if(dlg)dlg.wrapped=null;
    }
    const ro=new ResizeObserver(()=>{if(mg._ended){ro.disconnect();return;}resize();});
    ro.observe(stage);

    // ══ 描画ユーティリティ ══
    const GLOW={};
    [['cy','0,232,200'],['pu','176,124,255'],['gd','232,184,48'],['rd','232,48,85'],['pk','255,95,162'],['or','255,120,40'],['wh','230,220,255']].forEach(([k,rgb])=>{
      const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
      const gr=g.createRadialGradient(32,32,0,32,32,32);
      gr.addColorStop(0,`rgba(${rgb},.9)`);gr.addColorStop(.35,`rgba(${rgb},.35)`);gr.addColorStop(1,`rgba(${rgb},0)`);
      g.fillStyle=gr;g.fillRect(0,0,64,64);GLOW[k]=c;
    });
    function glow(g,x,y,r,k,a){
      if(a<=0)return;
      g.globalAlpha=Math.min(1,a);g.globalCompositeOperation='lighter';g.drawImage(GLOW[k],x-r,y-r,r*2,r*2);
      g.globalCompositeOperation='source-over';g.globalAlpha=1;
    }
    function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
    function circle(g,x,y,r){g.beginPath();g.arc(x,y,Math.max(.1,r),0,6.2832);}
    function heartPath(g,x,y,r){
      g.beginPath();g.moveTo(x,y+r*.9);
      g.bezierCurveTo(x-r*1.5,y-r*.1,x-r*.9,y-r*1.25,x,y-r*.45);
      g.bezierCurveTo(x+r*.9,y-r*1.25,x+r*1.5,y-r*.1,x,y+r*.9);g.closePath();
    }
    const fnt=px=>`${Math.round(px)}px ${FONT}`;
    function wrapText(g,text,maxW){
      const out=[];let line='';
      for(const ch of text){if(g.measureText(line+ch).width>maxW&&line){out.push(line);line=ch;}else line+=ch;}
      if(line)out.push(line);return out;
    }

    // ══ 背景（静的部分はオフスクリーンに一度だけ描く） ══
    function renderBg(){
      const g=bg;g.setTransform(dpr,0,0,dpr,0,0);
      g.fillStyle='#05040e';g.fillRect(0,0,W,H);
      let gr=g.createRadialGradient(W/2,H*.62,10,W/2,H*.62,Math.max(W,H)*.75);
      gr.addColorStop(0,'rgba(60,30,110,.35)');gr.addColorStop(1,'rgba(5,4,14,0)');
      g.fillStyle=gr;g.fillRect(0,0,W,H);
      g.fillStyle='rgba(138,82,212,.22)';
      for(let c=0;c<=COLS;c++)for(let r=0;r<=ROWS;r++)g.fillRect(X(c)-1,Y(r)-1,2,2);
      // 枠のUI装飾
      g.textBaseline='middle';
      const lx=LANE.labelLeft?X(.1):X(6.9);g.textAlign=LANE.labelLeft?'left':'right';
      g.font=fnt(C*.19);g.fillStyle='rgba(0,232,200,.4)';g.fillText('LIVE CHAT',lx,Y(.32));
      g.fillStyle='rgba(232,48,85,.45)';g.font=fnt(C*.16);g.fillText('荒らし警報 発令中',lx,Y(.62));
      g.textAlign='left';
      // レーン
      g.lineJoin='round';g.lineCap='round';
      const lane=()=>{g.beginPath();g.moveTo(X(PATH[0][0]),Y(PATH[0][1]));for(let i=1;i<PATH.length;i++)g.lineTo(X(PATH[i][0]),Y(PATH[i][1]));};
      g.save();g.shadowColor='rgba(138,82,212,.9)';g.shadowBlur=C*.5;
      lane();g.strokeStyle='rgba(138,82,212,.55)';g.lineWidth=C*.84;g.stroke();g.restore();
      lane();g.strokeStyle='rgba(0,232,200,.45)';g.lineWidth=C*.76;g.stroke();
      lane();g.strokeStyle='#0b0819';g.lineWidth=C*.71;g.stroke();
      lane();g.strokeStyle='rgba(138,82,212,.09)';g.lineWidth=C*.46;g.stroke();
      g.setLineDash([3,9]);lane();g.strokeStyle='rgba(187,174,221,.13)';g.lineWidth=1;g.stroke();g.setLineDash([]);
      g.fillStyle='rgba(0,0,0,.16)';for(let y=0;y<H;y+=3)g.fillRect(0,y,W,1);
      gr=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);
      gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=gr;g.fillRect(0,0,W,H);
    }

    // ══ タワー描画（待機・発射・強化のコマ）。メニューのアイコンにも使う ══
    function drawTower(g,x,y,s,type,lv,t,aim,fl,hasTarget){
      const d=TW[type];
      // 待機: 台座の呼吸グロー
      const breathe=.5+.5*Math.sin(t*2.4);
      rrect(g,x-s*.4,y-s*.4,s*.8,s*.8,s*.14);g.fillStyle='#0d0a22';g.fill();
      g.lineWidth=Math.max(1,s*.03);g.strokeStyle=d.col;g.globalAlpha=.45+breathe*.2+fl*.35;g.stroke();g.globalAlpha=1;
      if(lv>1){rrect(g,x-s*.45,y-s*.45,s*.9,s*.9,s*.17);g.strokeStyle=d.col;g.globalAlpha=.3+breathe*.2;g.stroke();g.globalAlpha=1;
        // Lv2 の角飾り
        g.fillStyle=d.col;[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a,b])=>g.fillRect(x+a*s*.43-1.5,y+b*s*.43-1.5,3,3));}
      glow(g,x,y,s*.55,d.glow,.14+breathe*.08+fl*.4);
      g.lineWidth=Math.max(1.2,s*.045);
      if(type==='mod'){
        const rec=fl*s*.04;
        g.beginPath();g.moveTo(x,y-s*.28+rec);g.lineTo(x+s*.22,y-s*.19+rec);g.lineTo(x+s*.2,y+s*.06);
        g.quadraticCurveTo(x+s*.13,y+s*.23,x,y+s*.3);g.quadraticCurveTo(x-s*.13,y+s*.23,x-s*.2,y+s*.06);g.lineTo(x-s*.22,y-s*.19+rec);g.closePath();
        g.fillStyle='rgba(0,232,200,.16)';g.fill();g.strokeStyle='#00e8c8';g.stroke();
        // 盾のきらめき（待機コマ）
        const sh=(t*.6)%3;if(sh<.4){g.save();g.clip();g.fillStyle='rgba(255,255,255,.25)';g.fillRect(x-s*.3+sh*s*1.5,y-s*.3,s*.08,s*.6);g.restore();}
        // BANハンマー：標的が無いときは揺れて待機、発射時は振り下ろし
        const a=hasTarget?aim:aim+Math.sin(t*2)*.25;
        g.save();g.translate(x,y);g.rotate(a);
        const push=fl*s*.07;
        g.strokeStyle='#bff8ee';g.beginPath();g.moveTo(-s*.08,0);g.lineTo(s*.16+push,0);g.stroke();
        g.fillStyle='#00e8c8';g.fillRect(s*.12+push,-s*.09,s*.08,s*.18);
        if(fl>.6){g.fillStyle='#fff';g.beginPath();for(let i=0;i<8;i++){const r=i%2?s*.05:s*.13,an=i/8*6.283;g.lineTo(s*.26+push+Math.cos(an)*r,Math.sin(an)*r);}g.fill();}
        g.restore();
        if(lv>1){g.fillStyle='#e8b830';circle(g,x,y-s*.28,s*.05);g.fill();}
      }else if(type==='ng'){
        g.save();g.translate(x,y);
        g.rotate(t*1.2);g.setLineDash([s*.07,s*.06]);g.strokeStyle='rgba(176,124,255,.8)';circle(g,0,0,s*.31+fl*s*.03);g.stroke();
        if(lv>1){g.rotate(-t*2.6);g.strokeStyle='rgba(0,232,200,.6)';circle(g,0,0,s*.36);g.stroke();}
        g.setLineDash([]);g.restore();
        circle(g,x,y,s*.21);g.fillStyle=hasTarget&&Math.floor(t*6)%2?'#3a1666':'#22103e';g.fill();g.strokeStyle='#b07cff';g.stroke();
        g.fillStyle='#e8dcff';g.font=fnt(s*.19);g.textAlign='center';g.textBaseline='middle';g.fillText('NG',x,y+s*.01);
        g.strokeStyle='rgba(232,48,85,.9)';g.beginPath();g.moveTo(x-s*.15,y-s*.15);g.lineTo(x+s*.15,y+s*.15);g.stroke();
        g.textAlign='left';
      }else if(type==='cheer'){
        const n=lv>1?2:1;
        for(let i=0;i<n;i++){
          const sw=Math.sin(t*4+i*2.1)*.45+(n>1?(i?.35:-.35):0);
          g.save();g.translate(x,y+s*.22);g.rotate(sw);
          const hue=['#ff6ab0','#00e8c8','#e8b830'][(Math.floor(t*1.5)+i)%3];
          g.fillStyle='#3a2a10';g.fillRect(-s*.04,-s*.12,s*.08,s*.14);
          g.fillStyle=hue;g.globalAlpha=.9;rrect(g,-s*.045,-s*.46,s*.09,s*.36,s*.04);g.fill();g.globalAlpha=1;
          g.restore();
          const tx=x+Math.sin(sw)*s*.4,ty=y+s*.22-Math.cos(sw)*s*.4;
          glow(g,tx,ty,s*.22,i?'cy':'pk',.6);
        }
        const hb=1+.12*Math.max(0,Math.sin(t*6));
        g.fillStyle='#e8b830';heartPath(g,x,y+s*.2,s*.11*hb);g.fill();
      }else if(type==='report'){
        g.fillStyle='#2a0c16';g.beginPath();g.ellipse(x,y+s*.1,s*.26,s*.12,0,0,6.2832);g.fill();g.strokeStyle='rgba(232,48,85,.6)';g.stroke();
        if(lv>1){g.save();g.setLineDash([s*.06,s*.06]);g.lineDashOffset=-t*8;g.strokeStyle='#e8b830';circle(g,x,y,s*.33);g.stroke();g.restore();}
        const py=y-s*.02+fl*s*.07;
        circle(g,x,py,s*.2);g.fillStyle=fl>.5?'#ff8098':'#e83055';g.fill();g.strokeStyle='#ff9bb0';g.stroke();
        g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(x-s*.06,py-s*.08,s*.08,s*.04,-.5,0,6.2832);g.fill();
        g.fillStyle='#fff';g.font=fnt(s*.24);g.textAlign='center';g.textBaseline='middle';g.fillText('!',x,py+s*.01);g.textAlign='left';
        // 待機ランプ
        g.fillStyle=Math.floor(t*2)%2?'#ffcc33':'#5a3a10';g.fillRect(x+s*.22,y+s*.08,s*.05,s*.05);
      }
      for(let i=0;i<lv;i++){g.fillStyle=d.col;g.fillRect(x-s*.08+i*s*.11,y+s*.33,s*.07,s*.035);}
    }

    // ══ 敵描画（歩き4コマ／被弾コマ） ══
    function drawEnemy(g,e,t){
      const b=EN[e.type],fr=Math.floor(e.anim*8)%4;
      const bob=[0,-1,0,1][fr]*C*.025;
      const x=X(e.x)+(e.hitF>0?e.kx*C*.04:0),y=Y(e.y)+bob,r=b.r*C;
      const hurt=e.hitF>0;
      if(e.slowF<.99){g.save();g.setLineDash([3,3]);g.lineDashOffset=t*10;g.strokeStyle='rgba(176,124,255,.75)';g.lineWidth=1.5;circle(g,x,y,r+3);g.stroke();g.restore();}
      if(e.type==='troll'){
        const sx=[1,1.07,1,.95][fr],sy=2-sx;
        glow(g,x,y,r*2,'rd',.25);
        g.save();g.translate(x,y);g.scale(sx,sy);
        g.fillStyle='#b81d3c';circle(g,0,0,r);g.fill();
        const tf=fr<2?1:-1;   // しっぽの向きがコマで入れ替わる
        g.beginPath();g.moveTo(-r*.55*tf,r*.6);g.lineTo(-r*.95*tf,r*1.15);g.lineTo(-r*.1*tf,r*.85);g.fill();
        g.fillStyle='rgba(255,90,120,.35)';circle(g,-r*.25,-r*.3,r*.45);g.fill();
        g.strokeStyle='#ff9ab0';g.lineWidth=1.2;circle(g,0,0,r);g.stroke();
        g.strokeStyle='#1a0008';g.fillStyle='#fff';g.lineWidth=Math.max(1.2,r*.13);
        if(hurt){ // ＞＜
          g.beginPath();g.moveTo(-r*.55,-r*.2);g.lineTo(-r*.25,-r*.05);g.lineTo(-r*.55,r*.1);g.moveTo(r*.55,-r*.2);g.lineTo(r*.25,-r*.05);g.lineTo(r*.55,r*.1);g.stroke();
        }else{
          circle(g,-r*.36,-r*.05,r*.2);g.fill();circle(g,r*.36,-r*.05,r*.2);g.fill();
          g.fillStyle='#1a0008';circle(g,-r*.32,-r*.01,r*.1);g.fill();circle(g,r*.32,-r*.01,r*.1);g.fill();
          g.beginPath();g.moveTo(-r*.65,-r*.42);g.lineTo(-r*.15,-r*.22);g.moveTo(r*.65,-r*.42);g.lineTo(r*.15,-r*.22);g.stroke();
        }
        if(fr%2===0&&!hurt){g.beginPath();g.moveTo(-r*.35,r*.45);g.lineTo(-r*.17,r*.32);g.lineTo(0,r*.45);g.lineTo(r*.17,r*.32);g.lineTo(r*.35,r*.45);g.stroke();}
        else{g.fillStyle='#1a0008';g.beginPath();g.ellipse(0,r*.42,r*.2,r*.15,0,0,6.2832);g.fill();}
        g.restore();
      }else if(e.type==='bot'){
        const tilt=[-.2,0,.2,0][fr];
        g.strokeStyle='#6fe0ff';g.lineWidth=1;g.beginPath();g.moveTo(x,y-r);g.lineTo(x+Math.sin(tilt)*r*.7,y-r*1.7);g.stroke();
        g.fillStyle=(fr%2)?'#ff4060':'#6fe0ff';circle(g,x+Math.sin(tilt)*r*.7,y-r*1.75,r*.25);g.fill();
        // 脚（交互に動く）
        g.fillStyle='#6fe0ff';const l1=fr<2?r*.35:r*.15,l2=fr<2?r*.15:r*.35;
        g.fillRect(x-r*.6,y+r*.8,r*.3,l1);g.fillRect(x+r*.3,y+r*.8,r*.3,l2);
        rrect(g,x-r,y-r*.85,r*2,r*1.7,r*.35);g.fillStyle=hurt?'#e0f8ff':'#24485a';g.fill();g.strokeStyle='#6fe0ff';g.stroke();
        g.fillStyle='#08131a';g.fillRect(x-r*.75,y-r*.3,r*1.5,r*.5);
        g.fillStyle='#ff4060';g.fillRect(x-r*.7+(Math.sin(t*7+e.ph)*.5+.5)*r*1.1,y-r*.25,r*.3,r*.4);
      }else if(e.type==='anti'){
        glow(g,x,y,r*2.1,'pu',.22);
        const sq=[1,1.04,1.08,1.04][fr];
        g.fillStyle='#4c2178';
        for(let i=-1;i<=1;i++){const l=r*(.45+.18*((fr+i+3)%4));g.fillRect(x+i*r*.5-r*.13,y+r*.4,r*.26,l);circle(g,x+i*r*.5,y+r*.4+l,r*.14);g.fill();}
        g.beginPath();g.ellipse(x,y+r*(sq-1)*.5,r*1.05*sq,r*.92/sq,0,0,6.2832);g.fill();g.strokeStyle='#b07cff';g.lineWidth=1.4;g.stroke();
        for(const s of[-1,1]){
          if(hurt){g.strokeStyle='#f0e8ff';g.lineWidth=Math.max(1.2,r*.1);g.beginPath();g.moveTo(x+s*r*.2,y-r*.02);g.lineTo(x+s*r*.56,y-r*.02);g.stroke();continue;}
          g.fillStyle='#f0e8ff';g.beginPath();g.arc(x+s*r*.38,y-r*.08,r*.22,0,Math.PI);g.fill();
          g.fillStyle='#120420';circle(g,x+s*r*.38,y,r*.1);g.fill();
          g.strokeStyle='#120420';g.lineWidth=Math.max(1.2,r*.1);g.beginPath();g.moveTo(x+s*r*.12,y-r*.1);g.lineTo(x+s*r*.64,y-r*.08);g.stroke();
        }
        g.strokeStyle='#120420';g.beginPath();g.moveTo(x-r*.25,y+r*.42);g.lineTo(x,y+r*.32);g.lineTo(x+r*.25,y+r*.42);g.stroke();
      }else{ // ボス
        glow(g,x,y,r*2.6,'or',.45+.1*Math.sin(t*5));
        for(let i=0;i<11;i++){
          const a=Math.PI+i/10*Math.PI,fl=r*(.45+.3*Math.abs(Math.sin(t*7+i*1.3)));
          const bx=x+Math.cos(a)*r*.9,by=y+Math.sin(a)*r*.9;
          g.fillStyle=(i+fr)%2?'#ff7a28':'#ffcc33';
          g.beginPath();g.moveTo(bx+Math.cos(a+1.57)*r*.18,by+Math.sin(a+1.57)*r*.18);
          g.lineTo(bx+Math.cos(a)*fl,by+Math.sin(a)*fl);g.lineTo(bx-Math.cos(a+1.57)*r*.18,by-Math.sin(a+1.57)*r*.18);g.fill();
        }
        g.fillStyle=hurt?'#5a1a10':'#2a0810';circle(g,x,y,r);g.fill();
        g.strokeStyle='#ff6a2a';g.lineWidth=Math.max(2,r*.08);g.stroke();
        g.fillStyle=hurt?'#fff':'#ffcc33';
        for(const s of[-1,1]){g.beginPath();g.moveTo(x+s*r*.15,y-r*.05);g.lineTo(x+s*r*.6,y-r*.32);g.lineTo(x+s*r*.5,y+r*.05);g.closePath();g.fill();}
        const shout=e.shoutT>0, mo=shout?.62:(fr%2?.48:.4);
        g.beginPath();g.arc(x,y+r*.15,r*mo,.15,Math.PI-.15);g.closePath();g.fillStyle='#120206';g.fill();g.strokeStyle='#ff6a2a';g.lineWidth=1.5;g.stroke();
        g.fillStyle='#ffe2b0';for(let i=0;i<5;i++)g.fillRect(x-r*.36+i*r*.16,y+r*.2,r*.08,r*.1);
        if(shout)glow(g,x,y+r*.4,r*1.2,'or',.6);
        g.font=fnt(C*.2);g.textAlign='center';g.fillStyle='#ffb070';g.fillText('炎上アカウント',x,y-r*1.6);g.textAlign='left';
      }
      if(e.hitF>0){g.globalAlpha=e.hitF*4;g.fillStyle='#fff';circle(g,x,y,r*.95);g.globalCompositeOperation='lighter';g.fill();g.globalCompositeOperation='source-over';g.globalAlpha=1;}
      if(e.hp<e.max||e.type==='boss'){
        const bw=Math.max(C*.5,r*2),bx=x-bw/2,by=y-r-(e.type==='boss'?C*.28:8);
        g.fillStyle='rgba(0,0,0,.7)';g.fillRect(bx-1,by-1,bw+2,5);
        const f=Math.max(0,e.hp/e.max);g.fillStyle=f>.5?'#44ee88':f>.25?'#e8b830':'#e83055';g.fillRect(bx,by,bw*f,3);
        g.fillStyle='rgba(255,255,255,.35)';g.fillRect(bx,by,bw*f,1);
      }
    }
    // 撃破コマ：膨張（×目）→ 破片が散る → リング
    function drawCorpse(g,c){
      const f=c.t/c.max,r=c.r;
      if(f<.3){
        const s=1+f*1.2;g.globalAlpha=1;
        g.fillStyle='#fff';circle(g,c.x,c.y,r*s);g.fill();
        g.fillStyle=c.col;circle(g,c.x,c.y,r*s*.85);g.fill();
        g.strokeStyle='#1a0008';g.lineWidth=Math.max(1.2,r*.14);
        for(const sx of[-1,1]){const ex=c.x+sx*r*.35,ey=c.y-r*.05,k=r*.14;g.beginPath();g.moveTo(ex-k,ey-k);g.lineTo(ex+k,ey+k);g.moveTo(ex+k,ey-k);g.lineTo(ex-k,ey+k);g.stroke();}
      }else{
        const k=(f-.3)/.7;
        g.globalAlpha=1-k;g.fillStyle=c.col;
        for(let i=0;i<SHARD_A.length;i++){const a=SHARD_A[i]+c.rot,d=r*(.4+k*1.8),sz=r*.32*(1-k*.6);
          g.save();g.translate(c.x+Math.cos(a)*d,c.y+Math.sin(a)*d);g.rotate(a+k*4);g.fillRect(-sz/2,-sz/2,sz,sz);g.restore();}
        g.strokeStyle='#fff';g.lineWidth=1.5;circle(g,c.x,c.y,r*(1+k*1.6));g.stroke();
        g.globalAlpha=1;
      }
    }

    // ══ 常連の立ち絵（ドット風に描く／まばたき2コマ） ══
    function drawListener(g,x,y,s,who,t,talking){
      const blink=(t%3.2)<.12;
      const gr=g.createLinearGradient(x,y,x,y+s);
      gr.addColorStop(0,who==='sakura'?'#3a1a3a':'#0c1a2a');gr.addColorStop(1,'#0a0716');
      g.fillStyle=gr;g.fillRect(x,y,s,s);
      const cxp=x+s/2,cy=y+s*.48+(talking?Math.sin(t*14)*s*.01:0);
      if(who==='sakura'){
        g.fillStyle='#ff8cc0';g.beginPath();g.ellipse(cxp,y+s*1.02,s*.38,s*.24,0,0,6.2832);g.fill(); // パーカー
        g.fillStyle='#ffffff';g.fillRect(cxp-s*.02,y+s*.8,s*.04,s*.12);
        g.fillStyle='#e8679f';circle(g,cxp,cy-s*.04,s*.27);g.fill();                              // 後ろ髪
        g.fillRect(cxp-s*.27,cy-s*.04,s*.54,s*.26);
        g.fillStyle='#f8dccb';circle(g,cxp,cy+s*.02,s*.2);g.fill();                               // 顔
        g.fillStyle='#ff7ab0';g.beginPath();g.arc(cxp,cy-s*.04,s*.23,Math.PI*1.05,Math.PI*1.95);g.lineTo(cxp+s*.1,cy-s*.06);g.lineTo(cxp,cy-s*.12);g.lineTo(cxp-s*.12,cy-s*.05);g.closePath();g.fill(); // 前髪
        // 桜のヘアピン
        g.fillStyle='#ffe1ee';for(let i=0;i<5;i++){const a=i/5*6.283+t*.5;circle(g,cxp+s*.17+Math.cos(a)*s*.035,cy-s*.15+Math.sin(a)*s*.035,s*.028);g.fill();}
        g.fillStyle='#e8b830';circle(g,cxp+s*.17,cy-s*.15,s*.015);g.fill();
        g.fillStyle='#3a1030';
        if(blink){g.fillRect(cxp-s*.11,cy+s*.03,s*.07,s*.012);g.fillRect(cxp+s*.04,cy+s*.03,s*.07,s*.012);}
        else{g.fillRect(cxp-s*.1,cy,s*.05,s*.07);g.fillRect(cxp+s*.05,cy,s*.05,s*.07);g.fillStyle='#fff';g.fillRect(cxp-s*.09,cy+s*.005,s*.02,s*.02);g.fillRect(cxp+s*.06,cy+s*.005,s*.02,s*.02);}
        g.fillStyle='rgba(255,110,150,.5)';g.fillRect(cxp-s*.15,cy+s*.08,s*.05,s*.025);g.fillRect(cxp+s*.1,cy+s*.08,s*.05,s*.025);
        g.fillStyle='#a03050';g.fillRect(cxp-s*.025,cy+s*.12,s*.05,talking&&Math.floor(t*10)%2?s*.03:s*.012);
      }else{ // 深夜の常連：フードとヘッドホン
        g.fillStyle='#1c2a44';g.beginPath();g.ellipse(cxp,y+s*1.02,s*.42,s*.26,0,0,6.2832);g.fill();
        g.fillStyle='#22324e';circle(g,cxp,cy,s*.29);g.fill();g.fillRect(cxp-s*.29,cy,s*.58,s*.3);
        g.fillStyle='#0b1020';circle(g,cxp,cy+s*.04,s*.2);g.fill();                                  // 影になった顔
        g.fillStyle='#d9c8b8';g.beginPath();g.ellipse(cxp,cy+s*.09,s*.15,s*.12,0,0,Math.PI);g.fill();
        g.strokeStyle='#00e8c8';g.lineWidth=Math.max(1.5,s*.025);g.beginPath();g.arc(cxp,cy-s*.02,s*.31,Math.PI*1.1,Math.PI*1.9);g.stroke(); // ヘッドホン
        g.fillStyle='#00e8c8';g.fillRect(cxp-s*.34,cy-s*.04,s*.08,s*.14);g.fillRect(cxp+s*.26,cy-s*.04,s*.08,s*.14);
        const gl=blink?.25:.9;g.strokeStyle=`rgba(0,232,200,${gl})`;g.lineWidth=Math.max(1.2,s*.02);
        g.strokeRect(cxp-s*.13,cy+s*.0,s*.1,s*.06);g.strokeRect(cxp+s*.03,cy+s*.0,s*.1,s*.06);
        glow(g,cxp,cy+s*.03,s*.18,'cy',blink?.15:.35);
        g.fillStyle='#5a3a30';g.fillRect(cxp-s*.03,cy+s*.15,s*.06,talking&&Math.floor(t*10)%2?s*.025:s*.01);
      }
      g.strokeStyle=who==='sakura'?'#ff7ab8':'#00e8c8';g.lineWidth=2;g.strokeRect(x+1,y+1,s-2,s-2);
    }
    function drawPortrait(g,x,y,s,spk,face,t,talking){
      if(spk==='dan'){
        const im=IMG[face]||IMG.normal;
        g.fillStyle='#120c24';g.fillRect(x,y,s,s);
        if(im.complete&&im.naturalWidth){g.drawImage(im,x,y+(talking?Math.sin(t*14)*s*.008:0),s,s);}
        g.strokeStyle='#8a52d4';g.lineWidth=2;g.strokeRect(x+1,y+1,s-2,s-2);
      }else drawListener(g,x,y,s,spk,t,talking);
    }
    const SPK={dan:{name:'だんのうら',col:'#c9a0ff'},sakura:{name:'さくら',col:'#ff8cc0'},joren:{name:'深夜の常連',col:'#00e8c8'}};

    // ══ 会話システム（タイプライター表示） ══
    function startDialog(lines,onEnd){dlg={lines,i:0,shown:0,onEnd,wrapped:null,t:0};}
    function dialogTap(){
      if(!dlg)return;const L=dlg.lines[dlg.i][2];
      if(dlg.shown<L.length){dlg.shown=L.length;return;}
      dlg.i++;dlg.shown=0;dlg.wrapped=null;se('btn');
      if(dlg.i>=dlg.lines.length){const f=dlg.onEnd;dlg=null;if(f)f();}
    }
    function updateDialog(dt){
      if(!dlg)return;dlg.t+=dt;
      const L=dlg.lines[dlg.i][2],before=Math.floor(dlg.shown);
      dlg.shown=Math.min(L.length,dlg.shown+dt*30);
      if(Math.floor(dlg.shown)!==before&&L[before]!=='…'&&L[before]!=='。')sfx('type');
    }
    function drawDialog(g,t){
      if(!dlg)return;
      const [spk,face,text]=dlg.lines[dlg.i];
      const bh=Math.max(104,Math.min(150,C*2.2)),bx=8,bw=W-16,by=H-bh-10;
      const ps=bh-20,right=spk!=='dan';
      g.fillStyle='rgba(8,5,20,.94)';rrect(g,bx,by,bw,bh,6);g.fill();
      g.strokeStyle=SPK[spk].col;g.lineWidth=1.5;g.stroke();
      g.strokeStyle='rgba(255,255,255,.08)';rrect(g,bx+3,by+3,bw-6,bh-6,4);g.stroke();
      const px=right?bx+bw-ps-10:bx+10;
      drawPortrait(g,px,by+10,ps,spk,face,t,dlg.shown<text.length);
      // 名前札
      g.font=fnt(Math.max(12,C*.22));const nw=g.measureText(SPK[spk].name).width+18;
      const nx=right?bx+bw-nw-12:bx+12;
      g.fillStyle='#0a0716';rrect(g,nx,by-13,nw,22,3);g.fill();g.strokeStyle=SPK[spk].col;g.stroke();
      g.fillStyle=SPK[spk].col;g.textBaseline='middle';g.fillText(SPK[spk].name,nx+9,by-2);
      // 本文
      const fs=Math.max(13,Math.min(17,C*.27));g.font=fnt(fs);
      const tx=right?bx+14:px+ps+12,tw=bw-ps-36;
      if(!dlg.wrapped)dlg.wrapped=wrapText(g,text,tw);
      let left=Math.floor(dlg.shown);g.fillStyle='#e8dcff';g.textBaseline='top';
      for(let i=0;i<dlg.wrapped.length&&left>0;i++){const ln=dlg.wrapped[i];g.fillText(ln.slice(0,left),tx,by+16+i*(fs*1.55));left-=ln.length;}
      if(dlg.shown>=text.length&&Math.floor(t*3)%2){g.fillStyle=SPK[spk].col;g.fillText('▼',right?bx+bw-ps-34:bx+bw-24,by+bh-fs-8);}
      g.textBaseline='middle';
    }

    // ══ 画面切り替え（フェード／モザイク／ワイプ） ══
    function transition(kind,dur,mid){if(tr)return;tr={kind,t:0,dur,mid,fired:false};}
    function updateTransition(dt){
      if(!tr)return;tr.t+=dt;
      if(!tr.fired&&tr.t>=tr.dur/2){tr.fired=true;if(tr.mid)tr.mid();}
      if(tr&&tr.t>=tr.dur)tr=null;
    }
    function drawTransition(g){
      if(!tr)return;const p=Math.min(1,tr.t/tr.dur),cover=p<.5?p*2:(1-p)*2;
      if(tr.kind==='mosaic'){
        const b=Math.max(1,Math.round(cover*30*dpr));
        if(b>1){const sw=Math.ceil(cv.width/b),sh=Math.ceil(cv.height/b);
          mos.imageSmoothingEnabled=false;mos.clearRect(0,0,sw,sh);mos.drawImage(cv,0,0,cv.width,cv.height,0,0,sw,sh);
          g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=false;g.drawImage(mosCv,0,0,sw,sh,0,0,sw*b,sh*b);g.imageSmoothingEnabled=true;
          g.setTransform(dpr,0,0,dpr,0,0);}
        g.fillStyle=`rgba(5,4,14,${cover*cover})`;g.fillRect(0,0,W,H);
      }else if(tr.kind==='wipe'){
        const n=12,bhh=H/n;g.fillStyle='#05040e';
        for(let i=0;i<n;i++){const w=W*Math.max(0,Math.min(1,cover*1.6-(i%3)*.15));
          if(i%2)g.fillRect(W-w,i*bhh,w,bhh+1);else g.fillRect(0,i*bhh,w,bhh+1);}
        g.fillStyle='#00e8c8';
        for(let i=0;i<n;i++){const w=W*Math.max(0,Math.min(1,cover*1.6-(i%3)*.15));if(w>0&&w<W){g.fillRect(i%2?W-w-2:w,i*bhh,2,bhh);}}
      }else{g.fillStyle=`rgba(5,4,14,${cover})`;g.fillRect(0,0,W,H);}
    }

    // ══ タイトル ══
    let titleBtns=[];
    function drawTitle(g,t){
      g.drawImage(bgCv,0,0,W,H);
      g.fillStyle='rgba(5,4,14,.72)';g.fillRect(0,0,W,H);
      drawChatRain(g,t);
      const cxm=W/2,em=Math.min(W*.2,H*.13),ey=H*.2;
      // エンブレム：盾＋心
      glow(g,cxm,ey,em*2.2,'pu',.5);
      g.save();g.translate(cxm,ey);
      g.lineWidth=3;g.strokeStyle='#00e8c8';g.fillStyle='rgba(0,232,200,.08)';
      g.beginPath();g.moveTo(0,-em);g.lineTo(em*.85,-em*.65);g.lineTo(em*.78,em*.2);g.quadraticCurveTo(em*.5,em*.8,0,em*1.05);g.quadraticCurveTo(-em*.5,em*.8,-em*.78,em*.2);g.lineTo(-em*.85,-em*.65);g.closePath();g.fill();g.stroke();
      g.lineWidth=1;g.strokeStyle='rgba(0,232,200,.4)';g.stroke();
      const hp=1+.07*Math.sin(t*3);g.fillStyle='#ff5fa2';heartPath(g,0,em*.05,em*.42*hp);g.fill();g.strokeStyle='#ffd0e6';g.lineWidth=1.5;g.stroke();
      glow(g,0,0,em*1.1,'pk',.55);
      g.restore();
      // 吹き出し（荒らし）が盾の周りを回る
      for(let i=0;i<3;i++){const a=t*.8+i*2.09,rx=cxm+Math.cos(a)*em*1.55,ry=ey+Math.sin(a)*em*.9;
        g.fillStyle='#b81d3c';circle(g,rx,ry,em*.17);g.fill();g.fillStyle='#fff';g.fillRect(rx-em*.09,ry-em*.03,em*.05,em*.05);g.fillRect(rx+em*.04,ry-em*.03,em*.05,em*.05);}
      // ロゴ
      const ly=ey+em*1.6,fs1=Math.min(W*.085,H*.05),fs2=Math.min(W*.125,H*.075);
      g.textAlign='center';g.textBaseline='middle';
      g.font=fnt(fs1);const gx=Math.random()<.08?(Math.random()-.5)*6:0;
      g.fillStyle='rgba(0,232,200,.7)';g.fillText('荒らし',cxm-2+gx,ly);g.fillStyle='rgba(232,48,85,.8)';g.fillText('荒らし',cxm+2-gx,ly);
      g.fillStyle='#ffd0d8';g.fillText('荒らし',cxm,ly);
      g.font=fnt(fs2);
      g.lineWidth=4;g.strokeStyle='#2a1050';g.strokeText('ディフェンス',cxm,ly+fs2*1.05);
      g.shadowColor='#8a52d4';g.shadowBlur=16;
      const lg=g.createLinearGradient(0,ly+fs2*.5,0,ly+fs2*1.6);lg.addColorStop(0,'#ffffff');lg.addColorStop(.55,'#c9a0ff');lg.addColorStop(1,'#00e8c8');
      g.fillStyle=lg;g.fillText('ディフェンス',cxm,ly+fs2*1.05);g.shadowBlur=0;
      g.font=fnt(Math.max(10,fs1*.42));g.fillStyle='rgba(0,232,200,.75)';g.fillText('TROLL  RAID  DEFENSE',cxm,ly+fs2*1.85);
      g.fillStyle='#bbaedd';g.font=fnt(Math.max(11,fs1*.5));g.fillText('― 配信の心を守り抜け ―',cxm,ly+fs2*2.4);
      // レーン選択（初クリアで解放）
      titleBtns=[];
      let yy=ly+fs2*3.1;const bw=Math.min(150,W*.4),bh2=40;
      if(DD.laneB){
        ['A','B'].forEach((k,i)=>{const bx=cxm+(i?6:-bw-6),on=laneKey===k;
          rrect(g,bx,yy,bw,bh2,5);g.fillStyle=on?'rgba(0,232,200,.16)':'rgba(138,82,212,.08)';g.fill();g.strokeStyle=on?'#00e8c8':'rgba(138,82,212,.5)';g.lineWidth=on?2:1;g.stroke();
          g.font=fnt(11);g.fillStyle=on?'#00e8c8':'#9a8fb0';g.fillText('LANE '+k,bx+bw/2,yy+12);
          g.font=fnt(13);g.fillStyle=on?'#fff':'#bbaedd';g.fillText(LANES[k].name,bx+bw/2,yy+28);
          drawStars(g,bx+bw/2,yy+bh2+9,DD.stars[k]||0,1,6);
          titleBtns.push({x:bx,y:yy,w:bw,h:bh2,lane:k});});
        yy+=bh2+26;
      }else{drawStars(g,cxm,yy+4,DD.stars.A||0,1,7);g.font=fnt(11);g.fillStyle='rgba(154,143,176,.7)';g.fillText('🔒 初クリアで第2レーン解放',cxm,yy+24);yy+=44;}
      // 記録
      g.font=fnt(12);g.fillStyle='#9a8fb0';
      const best=DD.best;
      g.fillText(best?`BEST ${best.grade}　心 ${best.lives}/10　撃退 ${best.kills}　クリア ${DD.clears}回`:'BEST ―　初めての防衛戦',cxm,yy+6);
      if(dayScale>1){g.fillStyle='rgba(232,48,85,.75)';g.fillText(`Day ${day}　荒らしの勢い +${Math.round((dayScale-1)*100)}%`,cxm,yy+26);}
      // スタート
      const sy=Math.min(H-40,yy+64);
      g.font=fnt(Math.max(15,fs1*.62));g.globalAlpha=.55+.45*Math.abs(Math.sin(t*2.5));g.fillStyle='#ffffff';g.fillText('▶ TAP TO START',cxm,sy);g.globalAlpha=1;
      titleBtns.push({x:0,y:sy-24,w:W,h:48,start:true});
      g.textAlign='left';
    }
    // タイトル／導入用の降るコメント
    const RAINTXT=[];for(let i=0;i<14;i++)RAINTXT.push({x:Math.random(),y:Math.random(),v:.04+Math.random()*.06,s:CHAT[i%CHAT.length],bad:i%3===0});
    const BAD=['凸るぞ','荒らし','つまらん','晒す','w','炎上','#拡散'];
    function drawChatRain(g,t){
      g.font=fnt(C*.22);g.textAlign='center';
      for(const r of RAINTXT){const y=((r.y+t*r.v)%1.1-.05)*H;g.fillStyle=r.bad?'rgba(232,48,85,.22)':'rgba(187,174,221,.12)';
        g.fillText(r.bad?BAD[(r.s.length+Math.floor(r.y*7))%BAD.length]:r.s,r.x*W,y);}
      g.textAlign='left';
    }

    // ══ 導入シーン ══
    function introLines(){
      const again=DD.plays>0;
      const L=[
        ['joren','',again?'だんのうらさん、また予告が出てる。今夜も「凸る」って。':'だんのうらさん、まとめ板に予告が出てる。今夜ここを荒らすって。'],
        ['dan','fear','……来るんか。子ども、やっと寝たとこやのに。'],
        ['sakura','','モデのみんなも待機してるよ。コメ欄、一緒に守ろ！'],
        ['dan','normal','ありがとう。配信の心だけは、絶対に折らせへん。'],
      ];
      if(laneKey==='B')L[2]=['sakura','','今夜は流れが二重にうねってる。配置、よく考えてね！'];
      return L;
    }
    function drawStory(g,t){
      g.drawImage(bgCv,0,0,W,H);
      g.fillStyle='rgba(5,4,14,.66)';g.fillRect(0,0,W,H);
      drawChatRain(g,t);
      // 掲示板の「予告」カード（グリッチ表示）
      const cw=Math.min(W-40,320),ch=Math.min(150,H*.24),cxx=(W-cw)/2,cyy=H*.13;
      const jit=Math.random()<.06?(Math.random()-.5)*8:0;
      g.fillStyle='rgba(20,6,14,.92)';rrect(g,cxx+jit,cyy,cw,ch,4);g.fill();g.strokeStyle='#e83055';g.lineWidth=1.5;g.stroke();
      g.fillStyle='#e83055';g.fillRect(cxx+jit,cyy,cw,24);
      g.font=fnt(12);g.fillStyle='#fff';g.textBaseline='middle';g.fillText('匿名掲示板 ― 実況（雑談）板',cxx+10+jit,cyy+12);
      g.font=fnt(Math.max(13,Math.min(17,W*.042)));g.fillStyle='#ffd0d8';
      g.fillText('【予告】今夜',cxx+14,cyy+48);
      g.fillStyle='#ff6a8a';g.fillText('だんのうらの配信 凸るぞ',cxx+14,cyy+74);
      g.font=fnt(12);g.fillStyle='rgba(255,208,216,.6)';g.fillText(`>>1 了解　>>2 Bot回す　>>3 祭りだ${'w'.repeat(1+Math.floor(t*3)%4)}`,cxx+14,cyy+ch-24);
      // 荒らしのシルエット
      for(let i=0;i<5;i++){const sx=W*(.15+i*.18),sy=cyy+ch+40+Math.sin(t*3+i)*4;
        g.fillStyle='rgba(184,29,60,.5)';circle(g,sx,sy,C*.22);g.fill();g.fillStyle='rgba(255,255,255,.7)';g.fillRect(sx-C*.1,sy-C*.03,C*.05,C*.05);g.fillRect(sx+C*.05,sy-C*.03,C*.05,C*.05);}
      drawDialog(g,t);
      // スキップ
      g.font=fnt(12);g.fillStyle='rgba(187,174,221,.75)';g.textAlign='right';g.fillText('SKIP ▶▶',W-12,16);g.textAlign='left';
    }

    // ══ ウェーブ間のひとこと ══
    const BETWEEN=[
      ['sakura','','ナイス！ 次はBotの群れが来るって。足止めしよ！'],
      ['joren','','粘着アンチが来る。NGフィルターで足を止めて叩け。'],
      ['dan','normal','……まだや。指、震えてる場合ちゃう。'],
      ['sakura','','待って、炎上アカウントが来る！ 通報の準備！'],
    ];
    function say(line,dur){bubble={line,t:0,dur:dur||4.2,shown:0};}

    // ══ ゲーム処理 ══
    function resetGame(){
      money=150+modBonus+LANE.bonus;lives=MAX_LIVES;wave=0;phase='prep';cd=12;gt=0;
      towers=[];enemies=[];shots=[];corpses=[];slotTower=new Array(SLOTS.length).fill(null);
      tut=0;tutT=0;
      if(modBonus)addFloat(W/2,H*.32,`モデレーター${Math.min(3,modCount)}人が駆けつけた +¥${modBonus}`,'#00e8c8');
    }
    function buildQueue(w){
      queue=[];qi=0;spawnT=0;
      WAVE_DEF[w-1].g.forEach(([type,n,iv,st])=>{for(let i=0;i<n;i++)queue.push({t:st+i*iv,type});});
      queue.sort((a,b)=>a.t-b.t);
    }
    function spawnEnemy(type,d,boost){
      const b=EN[type],hp=b.hp*(1+.14*(wave-1))*dayScale*(boost||1);
      enemies.push({type,d:d||0,x:0,y:0,hp,max:hp,off:(Math.random()-.5)*(type==='boss'?0:.34),
        ph:Math.random()*6,anim:Math.random(),slowF:1,hitF:0,kx:0,spawnCd:3,shoutT:0,dead:false});
      if(type==='boss'){shake=.4;sfx('boss');}
    }
    function startWave(){
      if(phase!=='prep'||scene!=='play')return;
      if(wave>0&&cd>1){const b=Math.floor(cd);money+=b;addFloat(W/2,Y(.9),`早期開始 +¥${b}`,'#e8b830');}
      wave++;phase='wave';buildQueue(wave);bubble=null;
      if(tut<2){tut=2;tutT=0;}
      const boss=wave===WAVES;
      banner={t:rt,text:boss?'FINAL WAVE':`WAVE ${wave}`,sub:WAVE_DEF[wave-1].sub,col:boss?'#ff6a2a':'#00e8c8'};
      sfx(boss?'boss':'wave');se(boss?'warn':'live');
    }
    function waveCleared(){
      const bonus=20+wave*5;money+=bonus;bumpMoney();
      if(wave>=WAVES){phase='end';endReason='clear';endT=2.2;
        banner={t:rt,text:'防衛成功',sub:'配信の心は守られた',col:'#44ee88'};sfx('clear');se('ach');}
      else{phase='prep';cd=6;banner={t:rt,text:`WAVE ${wave} クリア`,sub:`ボーナス +¥${bonus}`,col:'#e8b830'};sfx('coin');se('decide');
        say(BETWEEN[wave-1]);}
      refreshMenu();
    }
    function addFloat(x,y,text,col){floats.push({x,y,text,col,life:1.1});if(floats.length>30)floats.shift();}
    function bumpMoney(){elMoney.classList.remove('bump');void elMoney.offsetWidth;elMoney.classList.add('bump');}
    function hurt(e,dmg,big){
      if(e.dead)return;
      e.hp-=dmg;if(big||dmg>=8){e.hitF=.12;e.kx=Math.random()<.5?-1:1;}
      if(e.hp<=0){
        e.dead=true;kills++;const b=EN[e.type];money+=b.gold;
        const x=X(e.x),y=Y(e.y);
        const col=e.type==='bot'?'#6fe0ff':e.type==='anti'?'#9a5ad8':e.type==='boss'?'#ff7a28':'#e8385a';
        corpses.push({x,y,r:b.r*C,col,t:0,max:e.type==='boss'?.9:.38,rot:Math.random()*6});
        burst(x,y,e.type==='boss'?70:e.type==='bot'?7:14,col,e.type==='boss'?280:150,e.type==='boss'?3.5:2.4);
        rings.push({x,y,r:b.r*C,max:b.r*C*(e.type==='boss'?5:2.6),life:.45,ml:.45,col});
        addFloat(x,y-b.r*C,`+¥${b.gold}`,'#e8b830');sfx('coin');sfx('death');
        if(e.type==='boss'){bossKilled=true;shake=.7;stop=.28;flash=.2;sfx('boom');se('rank');}
        else if(e.type==='anti'){stop=Math.max(stop,.05);shake=Math.max(shake,.15);}
        refreshMenu();
      }
    }
    function computeBuffs(){
      towers.forEach(t=>{t.buff=1;t.links=[];});
      towers.forEach(c=>{
        if(c.type!=='cheer')return;const L=TW.cheer.lv[c.lv-1];
        towers.forEach(t=>{
          if(t===c||t.type==='cheer')return;
          if(Math.hypot(t.x-c.x,t.y-c.y)<=L.range+.01){t.buff=Math.max(t.buff,L.buff);c.links.push(t);}
        });
      });
    }
    function deny(btn,si){
      sfx('deny');se('warn');
      if(btn){btn.classList.remove('defense-shake');void btn.offsetWidth;btn.classList.add('defense-shake');}
      if(si!=null)addFloat(X(SLOTS[si][0]+.5),Y(SLOTS[si][1]+.1),'投げ銭が足りない','#ff7090');
    }
    function build(si,type,btn){
      const d=TW[type];if(slotTower[si]||phase==='end')return;
      if(money<d.cost){deny(btn,si);return;}
      money-=d.cost;bumpMoney();
      const t={type,lv:1,x:SLOTS[si][0]+.5,y:SLOTS[si][1]+.5,cd:.2,aim:-1.57,fl:0,buff:1,links:[],spent:d.cost,slot:si,bt:.45,ut:0,tg:false};
      towers.push(t);slotTower[si]=t;computeBuffs();
      se('tool');sfx('build');closeMenu();
      const q=QUIP[type];addFloat(X(t.x),Y(t.y)-C*.75,'「'+q[Math.floor(Math.random()*q.length)]+'」',d.col);
      if(tut===0){tut=1;tutT=0;}
    }
    function upgrade(si,btn){
      const t=slotTower[si];if(!t||t.lv>1)return;const d=TW[t.type];
      if(money<d.up){deny(btn,si);return;}
      money-=d.up;t.lv=2;t.spent+=d.up;t.ut=.9;computeBuffs();bumpMoney();
      burst(X(t.x),Y(t.y),22,d.col,170,2.4);rings.push({x:X(t.x),y:Y(t.y),r:C*.3,max:C*1.1,life:.5,ml:.5,col:d.col});
      addFloat(X(t.x),Y(t.y)-C*.5,'LEVEL UP!','#ffe080');addFloat(X(t.x),Y(t.y)-C*.85,'「'+QUIP_UP[t.type]+'」',d.col);
      se('repair');sfx('upgrade');stop=Math.max(stop,.06);openMenu(si);
    }
    function sell(si){
      const t=slotTower[si];if(!t)return;
      const back=Math.floor(t.spent*.7);money+=back;bumpMoney();towers.splice(towers.indexOf(t),1);slotTower[si]=null;computeBuffs();
      burst(X(t.x),Y(t.y),12,'#bbaedd',100,2);addFloat(X(t.x),Y(t.y)-C*.3,`+¥${back}`,'#e8b830');
      se('back');sfx('sell');closeMenu();
    }
    function firstInRange(x,y,range){
      let best=null,bd=-1;
      for(let i=0;i<enemies.length;i++){const e=enemies[i];if(e.dead)continue;
        const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy<=range*range&&e.d>bd){bd=e.d;best=e;}}
      return best;
    }
    function heartDamage(b){
      lives=Math.max(0,lives-b.dmg);shake=Math.min(.7,shake+.25+b.dmg*.06);flash=.35;heartHit=.5;stop=Math.max(stop,b.dmg>=3?.18:.07);
      burst(X(HEART.x),Y(HEART.y),14,'#ff5fa2',160,2.6);addFloat(X(HEART.x),Y(HEART.y)-C*.6,`心 -${b.dmg}`,'#ff5f80');
      sfx('hurt');se(b.dmg>=3?'ghost':'noise');
      elLife.classList.remove('bump');void elLife.offsetWidth;elLife.classList.add('bump');
      if(lives===3&&phase!=='end')say(['joren','','心が限界だ。踏ん張れ、だんのうらさん！'],3);
      if(lives<=0&&phase!=='end'){
        phase='end';endReason='down';endT=2.2;
        burst(X(HEART.x),Y(HEART.y),70,'#ff5fa2',260,3.2);
        banner={t:rt,text:'心が折れた',sub:'配信が荒らしに埋め尽くされた',col:'#e83055'};sfx('lose');se('warn');
      }
    }

    function update(dt){
      gt+=dt;tutT+=dt;
      if(phase==='prep'){cd-=dt;if(cd<=0)startWave();}
      else if(phase==='wave'){
        spawnT+=dt;
        while(qi<queue.length&&queue[qi].t<=spawnT){spawnEnemy(queue[qi].type);qi++;}
        if(qi>=queue.length&&enemies.length===0)waveCleared();
      }else if(phase==='end'){endT-=dt;if(endT<=0&&!tr){playT=gt;closeMenu();transition('mosaic',1.1,enterEnding);}}
      if(tut===2&&tutT>5)tut=3;
      for(let i=0;i<enemies.length;i++)enemies[i].slowF=1;
      for(let k=0;k<towers.length;k++){const t=towers[k];if(t.type!=='ng')continue;const L=TW.ng.lv[t.lv-1];t.tg=false;
        for(let i=0;i<enemies.length;i++){const e=enemies[i];if(e.dead)continue;
          const dx=e.x-t.x,dy=e.y-t.y;if(dx*dx+dy*dy>L.range*L.range)continue;
          t.tg=true;e.slowF=Math.min(e.slowF,1-L.slow*(e.type==='boss'?.5:1));hurt(e,L.dps*t.buff*dt);
          if(Math.random()<dt*4)spark(X(e.x)+(Math.random()-.5)*C*.3,Y(e.y),0,-30,.4,'#b07cff',2,0);}
      }
      for(let i=0;i<enemies.length;i++){const e=enemies[i];if(e.dead)continue;
        const b=EN[e.type],v=b.spd*LANE.spd*e.slowF*(e.hitF>0&&e.type!=='boss'?.6:1);
        e.d+=v*dt;e.anim+=dt*v*.9;e.hitF=Math.max(0,e.hitF-dt);e.shoutT=Math.max(0,e.shoutT-dt);
        const p=posAt(e.d);e.x=p.x+p.nx*e.off;e.y=p.y+p.ny*e.off;
        if(e.type==='boss'){
          e.spawnCd-=dt;if(Math.random()<dt*14)spark(X(e.x)+(Math.random()-.5)*C*.8,Y(e.y)-C*.3,(Math.random()-.5)*20,-60-Math.random()*40,.6,Math.random()<.5?'#ff7a28':'#ffcc33',2.6,0);
          if(e.spawnCd<=0&&e.d>1){e.spawnCd=3.4;e.shoutT=.5;for(let k=0;k<2;k++)spawnEnemy('bot',Math.max(0,e.d-.3-k*.35),1.4);
            addFloat(X(e.x),Y(e.y)-C*.9,'拡散！','#ff7a28');sfx('spawn');}
        }else if(e.type==='anti'&&Math.random()<dt*3)spark(X(e.x),Y(e.y)+C*.2,0,10,.8,'rgba(176,124,255,.6)',2.5,0);
        if(e.d>=PATH_LEN-.3){
          e.dead=true;leaked+=b.dmg;
          if(!(phase==='end'&&endReason==='down'))heartDamage(b);
        }
      }
      for(let k=0;k<towers.length;k++){const t=towers[k];t.fl=Math.max(0,t.fl-dt*4);t.bt=Math.max(0,t.bt-dt);t.ut=Math.max(0,t.ut-dt);
        if(t.type!=='mod'&&t.type!=='report')continue;
        const L=TW[t.type].lv[t.lv-1];t.cd-=dt*t.buff;
        const tg=firstInRange(t.x,t.y,L.range);t.tg=!!tg;
        if(tg){const ta=Math.atan2(tg.y-t.y,tg.x-t.x);let da=ta-t.aim;da=Math.atan2(Math.sin(da),Math.cos(da));t.aim+=da*Math.min(1,dt*14);}
        if(t.cd<=0&&tg&&t.bt<=0){
          t.cd=L.rate;t.fl=1;
          shots.push({kind:t.type,x:t.x+Math.cos(t.aim)*.25,y:t.y+Math.sin(t.aim)*.25,px:t.x,py:t.y,tg,tx:tg.x,ty:tg.y,dmg:L.dmg,splash:L.splash||0,
            spd:t.type==='mod'?10:6.5});
          sfx('shot');
        }
      }
      let n=0;
      for(let i=0;i<shots.length;i++){const s=shots[i];
        if(s.tg&&!s.tg.dead){s.tx=s.tg.x;s.ty=s.tg.y;}
        const dx=s.tx-s.x,dy=s.ty-s.y,dist=Math.hypot(dx,dy),step=s.spd*dt;
        s.px=s.x;s.py=s.y;
        if(dist<=step+.08){
          const hx=X(s.tx),hy=Y(s.ty);
          if(s.kind==='mod'){if(s.tg&&!s.tg.dead)hurt(s.tg,s.dmg);burst(hx,hy,5,'#bff8ee',120,1.8);sfx('hit');}
          else{
            let bossHit=false;
            for(let j=0;j<enemies.length;j++){const e=enemies[j];if(e.dead)continue;
              if(Math.hypot(e.x-s.tx,e.y-s.ty)<=s.splash){if(e.type==='boss')bossHit=true;hurt(e,e===s.tg?s.dmg:s.dmg*.6,true);}}
            burst(hx,hy,18,'#ff5a78',200,2.6);rings.push({x:hx,y:hy,r:4,max:s.splash*C,life:.35,ml:.35,col:'#e83055'});
            shake=Math.max(shake,bossHit?.3:.16);stop=Math.max(stop,bossHit?.08:.045);sfx('boom');
          }
          continue;
        }
        s.x+=dx/dist*step;s.y+=dy/dist*step;
        if(s.kind==='report'&&Math.random()<.7)spark(X(s.x),Y(s.y),(Math.random()-.5)*20,(Math.random()-.5)*20,.3,'#ff7a90',2.2,0);
        shots[n++]=s;
      }
      shots.length=n;
      n=0;for(let i=0;i<enemies.length;i++)if(!enemies[i].dead)enemies[n++]=enemies[i];enemies.length=n;
      updateFx(dt);
    }
    function updateFx(dt){
      for(let i=0;i<PN;i++){const p=parts[i];if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.vx*=.96;p.vy*=.96;}
      let n=0;for(let i=0;i<rings.length;i++){const r=rings[i];r.life-=dt;if(r.life>0)rings[n++]=r;}rings.length=n;
      n=0;for(let i=0;i<floats.length;i++){const f=floats[i];f.life-=dt;f.y-=28*dt;if(f.life>0)floats[n++]=f;}floats.length=n;
      n=0;for(let i=0;i<corpses.length;i++){const c=corpses[i];c.t+=dt;if(c.t<c.max)corpses[n++]=c;}corpses.length=n;
      shake=Math.max(0,shake-dt*1.6);flash=Math.max(0,flash-dt);heartHit=Math.max(0,heartHit-dt);
    }

    // ══ プレイ画面の描画 ══
    const RAIN=[];for(let i=0;i<34;i++)RAIN.push({x:Math.random(),y:Math.random(),v:.5+Math.random()*.5});
    function drawPlay(g,t,rdt){
      g.drawImage(bgCv,0,0,W,H);
      if(shake>0){const s=shake*C*.16;g.translate((Math.random()-.5)*s,(Math.random()-.5)*s);}
      g.font=fnt(C*.2);g.textAlign='center';g.textBaseline='middle';
      const sp=PATH_LEN/CHAT.length;
      for(let i=0;i<CHAT.length;i++){
        const d=(i*sp+t*.55)%PATH_LEN;const p=posAt(d);
        g.fillStyle=i%4===0?'rgba(0,232,200,.2)':'rgba(187,174,221,.17)';g.fillText(CHAT[i],X(p.x),Y(p.y));
      }
      if(phase==='wave'&&qi<queue.length){const a=.5+.5*Math.sin(t*8);g.fillStyle=`rgba(232,48,85,${.4+a*.5})`;g.font=fnt(C*.22);
        g.fillText('▼ 接近中',X(PATH[0][0]+(laneKey==='B'?-.95:.95)),Y(.1));glow(g,X(PATH[0][0]),Y(-.1),C*.8,'rd',.3+a*.3);}
      const on=.6+.4*Math.sin(t*3);glow(g,X(.45),Y(10.5),C*.35,'rd',on*.5);
      g.fillStyle=`rgba(232,48,85,${on})`;circle(g,X(.32),Y(10.5),C*.07);g.fill();
      g.font=fnt(C*.17);g.textAlign='left';g.fillStyle='rgba(255,140,160,.75)';g.fillText('ON AIR',X(.48),Y(10.5));
      // 配置枠
      for(let i=0;i<SLOTS.length;i++){
        if(slotTower[i])continue;const x=X(SLOTS[i][0]+.5),y=Y(SLOTS[i][1]+.5);
        const act=sel===i||hoverSlot===i;
        rrect(g,x-C*.36,y-C*.36,C*.72,C*.72,C*.12);g.fillStyle=act?'rgba(0,232,200,.1)':'rgba(138,82,212,.06)';g.fill();
        g.setLineDash([4,4]);g.lineDashOffset=-t*8;g.strokeStyle=act?'rgba(0,232,200,.85)':`rgba(138,82,212,${.4+.15*Math.sin(t*2+i)})`;g.lineWidth=1;g.stroke();g.setLineDash([]);
        g.strokeStyle=act?'#00e8c8':'rgba(187,174,221,.35)';g.beginPath();g.moveTo(x-C*.09,y);g.lineTo(x+C*.09,y);g.moveTo(x,y-C*.09);g.lineTo(x,y+C*.09);g.stroke();
      }
      if(sel!==null){
        const st=slotTower[sel],type=st?st.type:previewType;
        if(type){const L=TW[type].lv[st?st.lv-1:0];const x=X(SLOTS[sel][0]+.5),y=Y(SLOTS[sel][1]+.5);
          circle(g,x,y,L.range*C);g.fillStyle='rgba(0,232,200,.06)';g.fill();g.setLineDash([6,5]);g.lineDashOffset=t*10;g.strokeStyle=TW[type].col;g.globalAlpha=.7;g.lineWidth=1.3;g.stroke();g.setLineDash([]);g.globalAlpha=1;
          if(st&&st.lv<2){const L2=TW[type].lv[1];circle(g,x,y,L2.range*C);g.setLineDash([2,6]);g.strokeStyle='rgba(232,184,48,.4)';g.stroke();g.setLineDash([]);}}
      }
      for(let k=0;k<towers.length;k++){const tw=towers[k],x=X(tw.x),y=Y(tw.y);
        if(tw.type==='ng'){const R=TW.ng.lv[tw.lv-1].range*C;
          const gr=g.createRadialGradient(x,y,R*.2,x,y,R);gr.addColorStop(0,'rgba(176,124,255,0)');gr.addColorStop(1,`rgba(176,124,255,${.1+.04*Math.sin(t*3+k)})`);
          circle(g,x,y,R);g.fillStyle=gr;g.fill();g.strokeStyle='rgba(176,124,255,.22)';g.lineWidth=1;g.stroke();}
        if(tw.type==='cheer'&&tw.links.length){g.setLineDash([3,5]);g.lineDashOffset=-t*20;g.strokeStyle='rgba(232,184,48,.5)';g.lineWidth=1.2;
          for(const o of tw.links){g.beginPath();g.moveTo(x,y);g.lineTo(X(o.x),Y(o.y));g.stroke();}g.setLineDash([]);}
      }
      // タワー（建設＝落下バウンド、強化＝光の柱）
      for(let k=0;k<towers.length;k++){const tw=towers[k];let x=X(tw.x),y=Y(tw.y),s=C;
        if(tw.bt>0){const f=1-tw.bt/.45;y-=(1-f)*(1-f)*C*1.2;s=C*(f<.8?1:1+Math.sin((f-.8)/.2*Math.PI)*.12);
          if(tw.bt<.06&&!tw.landed){tw.landed=true;burst(x,Y(tw.y)+C*.3,12,'#bbaedd',90,2);rings.push({x,y:Y(tw.y),r:C*.2,max:C*.7,life:.35,ml:.35,col:TW[tw.type].col});shake=Math.max(shake,.1);}}
        if(tw.ut>0){const f=tw.ut/.9;const gr=g.createLinearGradient(0,y-C*2,0,y+C*.4);gr.addColorStop(0,'rgba(255,240,180,0)');gr.addColorStop(1,`rgba(255,240,180,${f*.55})`);
          g.fillStyle=gr;g.fillRect(x-C*.32*f,y-C*2,C*.64*f,C*2.4);s=C*(1+Math.sin((1-f)*Math.PI*3)*.1*f);}
        drawTower(g,x,y,s,tw.type,tw.lv,t+k,tw.aim,tw.fl,tw.tg);
        if(tw.buff>1){g.fillStyle='#e8b830';g.font=fnt(C*.17);g.textAlign='center';g.fillText('▲',x+C*.32,y-C*.3+Math.sin(t*4+k)*2);g.textAlign='left';}
        if(sel===tw.slot){rrect(g,x-C*.47,y-C*.47,C*.94,C*.94,C*.18);g.strokeStyle='#fff';g.globalAlpha=.5+.3*Math.sin(t*6);g.lineWidth=1.5;g.stroke();g.globalAlpha=1;}
      }
      drawHeart(g,t);
      for(let i=0;i<enemies.length;i++)drawEnemy(g,enemies[i],t);
      for(let i=0;i<corpses.length;i++)drawCorpse(g,corpses[i]);
      for(let i=0;i<shots.length;i++){const s=shots[i],x=X(s.x),y=Y(s.y);
        if(s.kind==='mod'){const dx=s.x-s.px,dy=s.y-s.py,l=Math.hypot(dx,dy)||1;
          g.strokeStyle='#bff8ee';g.lineWidth=2.4;g.beginPath();g.moveTo(x-dx/l*C*.35,y-dy/l*C*.35);g.lineTo(x,y);g.stroke();glow(g,x,y,C*.22,'cy',.8);}
        else{glow(g,x,y,C*.4,'rd',.9);g.fillStyle='#ffd0d8';circle(g,x,y,C*.08);g.fill();}
      }
      drawFx(g);
      drawTutorial(g,t);
      drawPreview(g,t);
      g.setTransform(dpr,0,0,dpr,0,0);
      drawRain(g,rdt);
      if(flash>0){g.fillStyle=`rgba(232,48,85,${flash*.5})`;g.fillRect(0,0,W,H);}
      if(lives<=3&&phase!=='end'){const a=.12+.08*Math.sin(t*5);const gr=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);
        gr.addColorStop(0,'rgba(232,48,85,0)');gr.addColorStop(1,`rgba(232,48,85,${a})`);g.fillStyle=gr;g.fillRect(0,0,W,H);}
      drawBubble(g,t);
      drawBanner(g,t);
      if(toast&&t-toast.t<1.1){const a=Math.min(1,(1.1-(t-toast.t))*3);g.globalAlpha=a;g.font=fnt(C*.34);g.textAlign='center';g.fillStyle='#00e8c8';g.fillText(toast.text,W/2,H*.6);g.globalAlpha=1;g.textAlign='left';}
    }
    function drawFx(g){
      for(let i=0;i<PN;i++){const p=parts[i];if(p.life<=0)continue;g.globalAlpha=Math.min(1,p.life/p.max*1.4);g.fillStyle=p.col;g.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);}
      g.globalAlpha=1;
      for(let i=0;i<rings.length;i++){const r=rings[i],f=1-r.life/r.ml;g.globalAlpha=1-f;g.strokeStyle=r.col;g.lineWidth=2;circle(g,r.x,r.y,r.r+(r.max-r.r)*f);g.stroke();}
      g.globalAlpha=1;
      g.font=fnt(C*.21);g.textAlign='center';g.textBaseline='middle';
      for(let i=0;i<floats.length;i++){const f=floats[i];g.globalAlpha=Math.min(1,f.life*2);g.fillStyle='#000';g.fillText(f.text,f.x+1,f.y+1);g.fillStyle=f.col;g.fillText(f.text,f.x,f.y);}
      g.globalAlpha=1;g.textAlign='left';
      // タップの波紋
      let n=0;for(let i=0;i<taps.length;i++){const p=taps[i],f=(rt-p.t)/.35;if(f>=1)continue;taps[n++]=p;
        g.globalAlpha=1-f;g.strokeStyle=p.ok?'#00e8c8':'rgba(187,174,221,.8)';g.lineWidth=2;circle(g,p.x,p.y,6+f*(p.ok?C*.5:C*.25));g.stroke();}
      taps.length=n;g.globalAlpha=1;
    }
    function drawRain(g,rdt){
      g.strokeStyle='rgba(150,170,255,.13)';g.lineWidth=1;g.beginPath();
      for(let i=0;i<RAIN.length;i++){const r=RAIN[i];r.y+=r.v*rdt*.9;if(r.y>1.05){r.y=-.05;r.x=Math.random();}
        const x=r.x*W,y=r.y*H;g.moveTo(x,y);g.lineTo(x-2,y+10+r.v*8);}
      g.stroke();
    }
    function drawHeart(g,t){
      const x=X(HEART.x),y=Y(HEART.y),ratio=lives/MAX_LIVES;
      const pul=1+.06*Math.sin(t*(2.2+(1-ratio)*7))+heartHit*.25;
      const r=C*.36*pul;
      glow(g,x,y,C*(1.3+heartHit),'pk',.35+.35*ratio+heartHit);
      g.strokeStyle=`rgba(255,95,162,${.25+.2*Math.sin(t*2)})`;g.lineWidth=1.2;circle(g,x,y,C*.48+Math.sin(t*2)*2);g.stroke();
      if(lives<=0){
        g.fillStyle='#5a1020';for(let i=0;i<6;i++){const a=i*1.05+.3,dd=C*(.2+Math.min(1.6,(2.2-endT))*.25);g.save();g.translate(x+Math.cos(a)*dd,y+Math.sin(a)*dd);g.rotate(a+t);g.fillRect(-C*.07,-C*.05,C*.14,C*.1);g.restore();}
        return;
      }
      heartPath(g,x,y+r*.15,r);
      g.fillStyle=heartHit>.3?'#ffffff':ratio>.6?'#ff5fa2':ratio>.3?'#ff3d6e':'#c0203c';g.fill();
      g.strokeStyle='#ffd0e6';g.lineWidth=1.5;g.stroke();
      g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.ellipse(x-r*.42,y-r*.18,r*.18,r*.1,-.6,0,6.2832);g.fill();
      const lost=MAX_LIVES-lives;
      if(lost>0){g.save();heartPath(g,x,y+r*.15,r);g.clip();g.strokeStyle='#2a0612';g.lineWidth=Math.max(1.4,C*.035);g.lineJoin='miter';
        for(let i=0;i<lost&&i<CRACKS.length;i++){const c=CRACKS[i];g.beginPath();g.moveTo(x+c[0]*r,y+c[1]*r);for(let k=2;k<c.length;k+=2)g.lineTo(x+c[k]*r,y+c[k+1]*r);g.stroke();}
        g.restore();}
      g.font=fnt(C*.17);g.textAlign='left';g.textBaseline='middle';
      g.fillStyle='rgba(255,170,210,.8)';g.fillText('配信の心',X(4.15),Y(10.32));
      g.fillStyle=ratio>.3?'#ff8ab8':'#ff4060';g.font=fnt(C*.2);g.fillText(`♥ ${lives}/${MAX_LIVES}`,X(4.15),Y(10.62));
    }
    function drawBanner(g,t){
      if(!banner)return;const e=t-banner.t,D=2.3;if(e>D){banner=null;return;}
      const inT=Math.min(1,e/.25),outT=e>D-.35?(D-e)/.35:1,a=Math.max(0,Math.min(inT,outT));
      const cy=H*.42,bh=C*1.15;
      g.globalAlpha=a*.85;g.fillStyle='rgba(6,4,16,.9)';g.fillRect(0,cy-bh/2,W,bh);
      g.fillStyle=banner.col;g.fillRect((1-inT)*-W,cy-bh/2,W,2);g.fillRect((1-inT)*W,cy+bh/2-2,W,2);
      g.globalAlpha=a;g.textAlign='center';g.textBaseline='middle';
      const sx=(1-inT)*40;
      g.font=fnt(C*.46);g.fillStyle=banner.col;g.shadowColor=banner.col;g.shadowBlur=14;
      g.fillText(banner.text,W/2+sx,cy-C*.14);g.shadowBlur=0;
      g.font=fnt(C*.21);g.fillStyle='#deccf8';g.fillText(banner.sub,W/2-sx,cy+C*.3);
      g.globalAlpha=1;g.textAlign='left';
    }
    let bubbleRect=null;
    function drawBubble(g,t){
      bubbleRect=null;if(!bubble)return;
      const [spk,face,text]=bubble.line,f=bubble.t;
      const a=Math.min(1,f*5,(bubble.dur-f)*4);if(a<=0)return;
      const bh=Math.max(54,C*1.05),bx=8,bw=W-16,by=6-(1-Math.min(1,f*5))*20;
      g.globalAlpha=a;
      g.fillStyle='rgba(8,5,20,.92)';rrect(g,bx,by,bw,bh,5);g.fill();g.strokeStyle=SPK[spk].col;g.lineWidth=1.3;g.stroke();
      const ps=bh-10;drawPortrait(g,bx+5,by+5,ps,spk,face||'normal',t,bubble.shown<text.length);
      const fs=Math.max(11,Math.min(14,C*.23));g.font=fnt(fs);g.textBaseline='top';
      g.fillStyle=SPK[spk].col;g.fillText(SPK[spk].name,bx+ps+14,by+6);
      g.fillStyle='#e8dcff';const lines=wrapText(g,text,bw-ps-26);let left=Math.floor(bubble.shown);
      for(let i=0;i<lines.length&&i<2&&left>0;i++){g.fillText(lines[i].slice(0,left),bx+ps+14,by+8+fs*1.25*(i+1));left-=lines[i].length;}
      g.globalAlpha=1;g.textBaseline='middle';
      bubbleRect={x:bx,y:by,w:bw,h:bh};
    }
    // チュートリアル（最初の10秒で操作が分かる）
    function drawTutorial(g,t){
      if(tut>=3||phase==='end')return;
      g.textAlign='center';g.textBaseline='middle';
      if(tut===0){
        const tc=LANE.tut%100,tr2=Math.floor(LANE.tut/100);
        if(slotTower[SLOTS.findIndex(s=>s[0]===tc&&s[1]===tr2)])return;
        const x=X(tc+.5),y=Y(tr2+.5),b=Math.abs(Math.sin(t*4))*C*.15;
        g.strokeStyle='#00e8c8';g.lineWidth=2;circle(g,x,y,C*(.45+.1*Math.sin(t*6)));g.stroke();
        // 指アイコン
        g.save();g.translate(x+C*.25,y+C*.3+b);
        g.fillStyle='#fff';rrect(g,-C*.06,-C*.22,C*.12,C*.3,C*.06);g.fill();rrect(g,-C*.1,0,C*.3,C*.22,C*.08);g.fill();
        g.strokeStyle='#05040e';g.lineWidth=1;g.stroke();g.restore();
        tipBox(g,x,y+C*.95,'空き枠をタップして防衛を置こう');
      }else if(tut===1&&phase==='prep'){
        tipBox(g,W-110,30,'▲ 準備できたら開始（自動でも始まる）');
      }else if(tut===2){
        tipBox(g,W/2,H*.62,'防衛をタップ → 強化・売却。×2で倍速');
      }
      g.textAlign='left';
    }
    // 次のウェーブ予告（入口の横に敵の顔ぶれと数を出す）
    const PV={troll:'#e8385a',bot:'#6fe0ff',anti:'#9a5ad8',boss:'#ff7a28'};
    function drawPreview(g,t){
      if(phase!=='prep'||wave>=WAVES||bubble)return;
      const cnt={};WAVE_DEF[wave].g.forEach(([ty,n])=>{cnt[ty]=(cnt[ty]||0)+n;});
      const keys=Object.keys(cnt),fs=Math.max(10,C*.19),iw=C*.95;
      const w=keys.length*iw+C*.95,h=C*.62,x=laneKey==='B'?X(.15):X(6.85)-w,y=Y(.05);
      g.fillStyle='rgba(8,5,20,.88)';rrect(g,x,y,w,h,4);g.fill();g.strokeStyle=wave+1===WAVES?'#ff7a28':'rgba(0,232,200,.6)';g.lineWidth=1;g.stroke();
      g.font=fnt(fs*.9);g.textAlign='left';g.textBaseline='middle';g.fillStyle=wave+1===WAVES?'#ff9a58':'#00e8c8';g.fillText('NEXT',x+5,y+h/2);
      keys.forEach((k,i)=>{const ix=x+C*.95+i*iw,iy=y+h/2,r=C*.13*(k==='boss'?1.35:1);
        g.fillStyle=PV[k];circle(g,ix,iy,r);g.fill();g.fillStyle='#fff';g.fillRect(ix-r*.5,iy-r*.25,r*.35,r*.35);g.fillRect(ix+r*.15,iy-r*.25,r*.35,r*.35);
        g.fillStyle='#e8dcff';g.fillText('×'+cnt[k],ix+r+3,iy);});
    }
    function tipBox(g,x,y,text){
      g.font=fnt(Math.max(11,C*.21));const w=g.measureText(text).width+20,h=Math.max(24,C*.42);
      const bx=Math.max(6,Math.min(W-w-6,x-w/2));
      g.fillStyle='rgba(0,40,36,.92)';rrect(g,bx,y-h/2,w,h,4);g.fill();g.strokeStyle='#00e8c8';g.lineWidth=1.2;g.stroke();
      g.fillStyle='#bff8ee';g.fillText(text,bx+w/2,y+1);
    }

    // ══ エンディング（評価＆会話） ══
    function gradeOf(){
      if(endReason!=='clear')return 'C';
      return lives>=MAX_LIVES?'S':lives>=7?'A':lives>=4?'B':'C';
    }
    function enterEnding(){
      scene='ending';sel=null;closeMenu();bubble=null;banner=null;
      const clear=endReason==='clear',grade=gradeOf();
      DD.plays++;
      const firstClear=clear&&DD.clears===0;
      if(clear)DD.clears++;
      const rec={grade,lives,kills,time:Math.round(playT),lane:laneKey};
      const b=DD.best;
      const better=clear&&(!b||GRADE_RANK[grade]>GRADE_RANK[b.grade]||(grade===b.grade&&(lives>b.lives||(lives===b.lives&&kills>b.kills))));
      if(better)DD.best=rec;
      const unlocked=firstClear&&!DD.laneB;if(clear)DD.laneB=true;
      const stars=starsOf(clear,lives),prevStars=DD.stars[laneKey]||0;if(stars>prevStars)DD.stars[laneKey]=stars;
      ending={t:0,grade,clear,better,unlocked,stars,stamped:false,talk:false};
      let lines;
      if(!clear)lines=[['sakura','','だんのうらさん……大丈夫？ 今夜はもう休も。'],['dan','fear','……ごめん。今夜は、ここまでにさせて。']];
      else if(grade==='S')lines=[['joren','','ノーダメージ……伝説の夜だ。切り抜かれるぞ、これ。'],['dan','win','みんなのおかげや。今夜の配信、最後まで続けるで。']];
      else if(grade==='C')lines=[['joren','','ギリギリだった……。でも、守り切った。'],['dan','tired','ボロボロやけど、配信は続いてる。それで十分や。']];
      else lines=[['sakura','','守りきったね！ おつかれさま！'],['dan','happy','……ちょっと削られたけど、心はまだあったかい。']];
      ending.lines=lines;
      sfx(clear?'clear':'lose');
    }
    function updateEnding(dt){
      const e=ending;e.t+=dt;
      if(!e.stamped&&e.t>=.95){e.stamped=true;sfx('stamp');se('rank');shake=.35;
        burst(W/2,H*.3,40,GRADE_COL[e.grade],260,3);rings.push({x:W/2,y:H*.3,r:C*.6,max:C*2.4,life:.6,ml:.6,col:GRADE_COL[e.grade]});}
      if(!e.talk&&e.t>=2.1){e.talk=true;startDialog(e.lines,finishGame);}
      updateDialog(dt);updateFx(dt);
      if(e.t>16)finishGame();
    }
    // 星（レーンごとの評価）。p=表示の進み具合
    function drawStars(g,x,y,n,p,r){
      for(let i=0;i<3;i++){const sx=x+(i-1)*r*2.4,on=i<n,pp=Math.max(0,Math.min(1,p*3-i));
        if(pp<=0&&on)continue;
        const sc=on?1+(1-pp)*.8:1;
        g.save();g.translate(sx,y);g.scale(sc,sc);g.beginPath();
        for(let k=0;k<10;k++){const rr=k%2?r*.45:r,a=-Math.PI/2+k*Math.PI/5;g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}
        g.closePath();g.fillStyle=on?'#ffd84a':'rgba(90,80,120,.6)';g.fill();g.strokeStyle=on?'#fff3b0':'rgba(150,140,180,.5)';g.lineWidth=1.2;g.stroke();g.restore();
        if(on&&pp>0&&pp<.2)glow(g,sx,y,r*2,'gd',.8);
      }
    }
    function finishGame(){if(scene==='done')return;scene='done';dlg=null;transition('fade',.7,()=>{if(!mg._ended)mg.end(endReason);});}
    function drawEnding(g,t){
      const e=ending;
      g.drawImage(bgCv,0,0,W,H);
      if(shake>0){const s=shake*C*.16;g.translate((Math.random()-.5)*s,(Math.random()-.5)*s);}
      g.fillStyle='rgba(5,4,14,.8)';g.fillRect(0,0,W,H);
      drawChatRain(g,t*.5);
      g.textAlign='center';g.textBaseline='middle';
      // 見出し（一文字ずつ）
      const head=e.clear?'防衛成功':'防衛失敗',hc=e.clear?'#44ee88':'#e83055';
      const nh=Math.min(head.length,Math.floor(e.t*10));
      g.font=fnt(Math.min(W*.09,C*.6));g.fillStyle=hc;g.shadowColor=hc;g.shadowBlur=12;g.fillText(head.slice(0,nh),W/2,H*.09);g.shadowBlur=0;
      g.font=fnt(12);g.fillStyle='#9a8fb0';g.fillText(`LANE ${laneKey}「${LANE.name}」`,W/2,H*.09+C*.5);
      // 評価スタンプ
      const gy=H*.3,R=Math.min(W*.17,C*1.25);
      if(e.t>.6){
        const k=Math.min(1,(e.t-.6)/.35),sc=e.stamped?1+Math.max(0,.15-(e.t-.95))*1.5:3-2*k;
        g.save();g.translate(W/2,gy);g.scale(sc,sc);g.rotate(-.12);g.globalAlpha=Math.min(1,k*1.5);
        glow(g,0,0,R*2,e.grade==='S'?'gd':e.grade==='A'?'cy':'pu',.6);
        g.strokeStyle=GRADE_COL[e.grade];g.lineWidth=4;circle(g,0,0,R);g.stroke();g.lineWidth=1.5;circle(g,0,0,R*.86);g.stroke();
        g.font=fnt(R*1.25);g.fillStyle=GRADE_COL[e.grade];g.fillText(e.grade,0,R*.04);
        g.font=fnt(R*.2);g.fillText('RANK',0,-R*.68);
        g.restore();g.globalAlpha=1;
      }
      // 成績（順に表示）
      const rows=[['到達ウェーブ',`${wave}/${WAVES}`],['残った心',`${lives}/${MAX_LIVES}`],['撃退数',`${kills}`],['防衛時間',`${Math.floor(playT/60)}:${String(Math.round(playT)%60).padStart(2,'0')}`]];
      g.font=fnt(Math.max(13,C*.24));
      const sy=gy+R+C*.55,lh=Math.max(20,C*.4);
      rows.forEach((r,i)=>{if(e.t<1.2+i*.15)return;const y=sy+i*lh;
        g.textAlign='right';g.fillStyle='#9a8fb0';g.fillText(r[0],W/2-10,y);g.textAlign='left';g.fillStyle='#e8dcff';g.fillText(r[1],W/2+10,y);});
      g.textAlign='center';
      let ny=sy+rows.length*lh+6;
      drawStars(g,W/2,gy-R-C*.38,e.stars,Math.min(1,Math.max(0,(e.t-1.1)/.6)),C*.32);
      ny+=4;
      if(e.better&&e.t>1.9&&Math.floor(t*4)%2){g.fillStyle='#ffd84a';g.font=fnt(14);g.fillText('★ NEW RECORD ★',W/2,ny);}
      ny+=22;
      if(e.unlocked&&e.t>1.9){g.fillStyle='#00e8c8';g.font=fnt(12);g.fillText('NEW LANE 解放：深夜の二重螺旋',W/2,ny);}
      drawFx(g);
      g.setTransform(dpr,0,0,dpr,0,0);
      drawRain(g,1/60);
      drawDialog(g,t);
      g.textAlign='left';
    }

    // ══ メニュー ══
    function iconCanvas(type,lv,size){
      const c=document.createElement('canvas');c.width=c.height=size*dpr;const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
      drawTower(g,size/2,size/2,size*1.1,type,lv,.6,-.8,0,false);return c;
    }
    let menuBtns=[];
    function openMenu(si){
      sel=si;previewType=null;menuBtns=[];
      const t=slotTower[si];
      menu.innerHTML='';
      if(!t){
        menu.innerHTML=`<div class="defense-mh">防衛を配置<small>所持 ¥<span class="defense-mm">${money}</span></small><button class="defense-x">×</button></div><div class="defense-opts"></div>`;
        const box=menu.querySelector('.defense-opts');
        TW_KEYS.forEach(k=>{const d=TW[k];
          const b=document.createElement('button');b.className='defense-opt';
          b.append(iconCanvas(k,1,40));
          const tx=document.createElement('div');tx.innerHTML=`<b>${d.name}</b><small>${d.desc}</small><i>¥${d.cost}</i>`;b.append(tx);
          b.onclick=()=>build(si,k,b);
          b.onpointerenter=()=>{previewType=k;};b.onpointerleave=()=>{if(previewType===k)previewType=null;};
          b._cost=d.cost;box.append(b);menuBtns.push(b);
        });
      }else{
        const d=TW[t.type],L=d.lv[t.lv-1];
        const stat=t.type==='mod'?`威力${L.dmg} 間隔${L.rate}s 射程${L.range}`:t.type==='ng'?`減速${Math.round(L.slow*100)}% 毎秒${L.dps}ダメージ`:
          t.type==='cheer'?`周囲の攻撃速度 ×${L.buff}`:`威力${L.dmg}(範囲) 間隔${L.rate}s 射程${L.range}`;
        const nxt=t.lv<2?d.lv[1]:null;
        const nstat=!nxt?'':t.type==='mod'?`→ 威力${nxt.dmg} 間隔${nxt.rate}s`:t.type==='ng'?`→ 減速${Math.round(nxt.slow*100)}% 毎秒${nxt.dps}`:
          t.type==='cheer'?`→ ×${nxt.buff} 範囲拡大`:`→ 威力${nxt.dmg} 間隔${nxt.rate}s`;
        menu.innerHTML=`<div class="defense-mh">${d.name}　Lv${t.lv}<small>所持 ¥<span class="defense-mm">${money}</span></small><button class="defense-x">×</button></div>`+
          `<div class="defense-info"><span class="defense-ic"></span><div>${d.desc}<br><span style="color:var(--cy)">${stat}</span>`+
          `${nxt?`<br><span style="color:var(--gd)">${nstat}</span>`:'<br><span style="color:var(--tx-d)">最大強化済み</span>'}`+
          `${t.buff>1?`<br><span style="color:var(--gd)">▲ 常連の応援で強化中</span>`:''}</div></div>`+
          `<div class="defense-acts">${nxt?`<button class="defense-btn defense-up">強化 ¥${d.up}</button>`:''}<button class="defense-btn defense-sell">売却 +¥${Math.floor(t.spent*.7)}</button></div>`;
        menu.querySelector('.defense-ic').append(iconCanvas(t.type,t.lv,52));
        const up=menu.querySelector('.defense-up');
        if(up){up.onclick=()=>upgrade(si,up);up._cost=d.up;menuBtns.push(up);}
        menu.querySelector('.defense-sell').onclick=()=>sell(si);
      }
      menu.querySelector('.defense-x').onclick=()=>{se('back');closeMenu();};
      menu.classList.add('on');placeMenu();refreshMenu();
    }
    function closeMenu(){sel=null;previewType=null;menu.classList.remove('on');}
    function refreshMenu(){
      if(sel===null)return;
      menuBtns.forEach(b=>{b.classList.toggle('poor',money<b._cost);});
      const mm=menu.querySelector('.defense-mm');if(mm)mm.textContent=money;
    }
    function placeMenu(){
      if(sel===null)return;
      const row=SLOTS[sel][1];
      if(row>=5){menu.style.top='8px';menu.style.bottom='';}else{menu.style.bottom='8px';menu.style.top='';}
    }

    // ══ 入力 ══
    function slotAt(px,py){
      const c=Math.floor((px-ox)/C),r=Math.floor((py-oy)/C);
      for(let i=0;i<SLOTS.length;i++)if(SLOTS[i][0]===c&&SLOTS[i][1]===r)return i;
      return -1;
    }
    function goStory(){
      if(tr)return;sfx('start');se('decide');
      transition('mosaic',1,()=>{scene='story';startDialog(introLines(),goPlay);});
    }
    function goPlay(){
      if(tr&&scene==='play')return;
      dlg=null;
      transition('wipe',.8,()=>{scene='play';resetGame();top.classList.remove('defense-hide');hudKey='';});
    }
    cv.addEventListener('pointerdown',e=>{
      const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;
      if(tr&&scene!=='play')return;
      if(scene==='title'){
        taps.push({x:px,y:py,t:rt,ok:true});
        for(const b of titleBtns){if(px>=b.x&&px<=b.x+b.w&&py>=b.y&&py<=b.y+b.h){
          if(b.lane){if(laneKey!==b.lane){setLane(b.lane);DD.lane=b.lane;renderBg();}se('btn');sfx('tap');return;}
        }}
        goStory();return;
      }
      if(scene==='story'){
        taps.push({x:px,y:py,t:rt,ok:true});
        if(px>W-90&&py<34){se('back');dlg=null;goPlay();return;}
        dialogTap();return;
      }
      if(scene==='ending'){taps.push({x:px,y:py,t:rt,ok:true});
        if(ending.t<2.1){ending.t=2.1;if(!ending.stamped)ending.t=.95;return;}
        dialogTap();return;}
      if(scene!=='play')return;
      if(bubbleRect&&px>=bubbleRect.x&&px<=bubbleRect.x+bubbleRect.w&&py>=bubbleRect.y&&py<=bubbleRect.y+bubbleRect.h){bubble=null;se('btn');return;}
      const si=slotAt(px,py);
      taps.push({x:px,y:py,t:rt,ok:si>=0});
      if(si>=0){if(sel===si){closeMenu();se('back');}else{openMenu(si);se('btn');sfx('tap');}}
      else{if(sel!==null)se('back');else sfx('tap');closeMenu();}
    });
    cv.addEventListener('pointermove',e=>{
      if(e.pointerType!=='mouse'||scene!=='play')return;const r=cv.getBoundingClientRect();hoverSlot=slotAt(e.clientX-r.left,e.clientY-r.top);
    });
    cv.addEventListener('pointerleave',()=>{hoverSlot=-1;});
    function toggleSpeed(){speed=speed===1?2:1;se('btn');sfx('tap');toast={text:speed===2?'×2 倍速':'×1 通常',t:rt};}
    btnNext.onclick=()=>{if(phase==='prep'&&scene==='play'){se('decide');startWave();}};
    btnSpd.onclick=toggleSpeed;
    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      const k=e.key;
      if(scene==='title'){if(k===' '||k==='Enter'){e.preventDefault();goStory();}return;}
      if(scene==='story'||scene==='ending'){if(k===' '||k==='Enter'){e.preventDefault();if(scene==='ending'&&ending.t<2.1)ending.t=2.1;else dialogTap();}else if(k==='Escape'&&scene==='story'){dlg=null;goPlay();}return;}
      if(scene!=='play')return;
      if(k===' '||k==='Enter'){e.preventDefault();if(phase==='prep'){se('decide');startWave();}}
      else if(k==='x'||k==='X')toggleSpeed();
      else if(k==='Escape'){if(sel!==null)se('back');closeMenu();}
      else if(sel!==null&&k>='1'&&k<='4'&&!slotTower[sel])build(sel,TW_KEYS[+k-1]);
      else if(sel!==null&&(k==='u'||k==='U'))upgrade(sel);
      else if(sel!==null&&(k==='s'||k==='S')&&slotTower[sel])sell(sel);
    });

    // ══ HUD ══
    let hudKey='';
    function hud(){
      if(scene!=='play'){
        const key='s'+scene;if(key===hudKey)return;hudKey=key;
        top.classList.add('defense-hide');
        const b=DD.best;mg.setScore(b?`BEST ${b.grade}　心 ${b.lives}/10`:'BEST ―');mg.setTimer(scene==='title'?'TITLE':scene==='story'?'STORY':'RESULT');
        return;
      }
      const nextTxt=phase==='prep'?`▶ WAVE${wave+1} 開始 ${Math.ceil(cd)}`:phase==='wave'?`WAVE${wave} 防衛中`:endReason==='clear'?'防衛成功':'—';
      const key=lives+'|'+money+'|'+wave+'|'+nextTxt+'|'+speed;
      if(key===hudKey)return;hudKey=key;
      elLife.textContent='♥'+lives;elMoney.textContent='¥'+money;elWave.textContent=`WAVE ${wave}/${WAVES}`;
      btnNext.textContent=nextTxt;btnNext.disabled=phase!=='prep';btnNext.classList.toggle('go',phase==='prep');
      btnSpd.textContent='×'+speed;btnSpd.classList.toggle('on',speed===2);
      mg.setScore(`心 ${lives}/${MAX_LIVES}　撃退 ${kills}`);
      mg.setTimer(phase==='prep'?`次の波 ${Math.ceil(cd)}`:`W${wave}/${WAVES}`);
      refreshMenu();
    }

    resize();
    mg.loop(rdt=>{
      rt+=rdt;
      updateTransition(rdt);
      if(mg._ended)return;
      if(scene==='play'){
        if(bubble){bubble.t+=rdt;bubble.shown=Math.min(bubble.line[2].length,bubble.shown+rdt*34);if(bubble.t>bubble.dur)bubble=null;}
        if(stop>0){stop-=rdt;updateFx(rdt*.15);}
        else for(let i=0;i<speed&&!mg._ended&&scene==='play';i++)update(rdt);
      }else if(scene==='story'){updateDialog(rdt);updateFx(rdt);}
      else if(scene==='ending'||scene==='done'){if(scene==='ending')updateEnding(rdt);else updateFx(rdt);}
      else updateFx(rdt);
      if(mg._ended)return;
      const g=cx;g.setTransform(dpr,0,0,dpr,0,0);
      if(scene==='title'){drawTitle(g,rt);drawFx(g);drawRain(g,rdt);}
      else if(scene==='story'){drawStory(g,rt);drawFx(g);}
      else if(scene==='play')drawPlay(g,rt,rdt);
      else drawEnding(g,rt);
      g.setTransform(dpr,0,0,dpr,0,0);
      drawTransition(g);
      hud();
    });

    return {result(reason){
      ro.disconnect();
      if(!ending)DD.plays++;   // 途中終了も1プレイとして数える
      const clear=reason==='clear',down=reason==='down';
      const fx=clear?{flame:-Math.min(gs.flame,2+(lives>=8?1:0)),followers:8+Math.round(7*(lives-1)/(MAX_LIVES-1)),streamPop:5,mental:3,fatigue:8}
        :down?{mental:-6,flame:1,fatigue:8}:{fatigue:4};
      const grade=ending?ending.grade:null;
      return {
        title:clear?'🛡 荒らしを退けた':down?'💔 心が折れた':'🛡 防衛を中断した',
        summary:(grade?`評価 <span class="up">${grade}</span>　`:'')+`到達ウェーブ <span class="up">${wave}/${WAVES}</span>　撃退 <span class="up">${kills}</span>`+
          `<br>残った心 <span class="${lives>=5?'up':'down'}">${lives}/${MAX_LIVES}</span>`+(bossKilled?'　炎上アカウント撃破':'')+
          (modBonus&&wave>0?`<br><span class="up">モデレーターの援護 +¥${modBonus}</span>`:'')+
          (ending&&ending.unlocked?'<br><span class="up">第2レーン「深夜の二重螺旋」解放</span>':''),
        fx, time:clear||down?60:30, sp:clear?1:0,
        log:clear?'荒らしのレイドを最後まで防ぎ切った。コメント欄に、いつもの声が戻ってきた。':down?'荒らしに配信を埋め尽くされた。画面の向こうの常連が心配している。':'荒らし対策を途中で切り上げた。',
        cutin:clear?['win','……守れた。来てくれたみんなの居場所やからな。']:down?['fear','……コメント欄が、知らん言葉で埋まっていく。']:null,
      };
    }};
  },
});
