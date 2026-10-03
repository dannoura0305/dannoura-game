// ══════════════════════════════════════════════════════════
// タワーディフェンス「荒らしディフェンス」
// 今夜の配信に荒らしの大群がなだれ込んでくる。コメント欄の流れに沿って
// 防衛を置き、最下部の「配信の心」を守り切る。全5ウェーブ、最後は炎上アカウント。
// ══════════════════════════════════════════════════════════
addMinigameStyle('defense',`
.mg-defense{background:radial-gradient(ellipse at 50% 70%,rgba(138,82,212,.12),transparent 70%),var(--bg);}
.defense-top{flex:none;width:100%;box-sizing:border-box;display:flex;align-items:center;gap:7px;padding:5px 8px;
  background:linear-gradient(180deg,rgba(22,13,44,.95),rgba(10,7,22,.75));border-bottom:1px solid rgba(138,82,212,.28);font-family:var(--dot);}
.defense-st{display:flex;gap:9px;align-items:baseline;white-space:nowrap;}
.defense-life{color:#ff6a9a;font-size:.86rem;text-shadow:0 0 8px rgba(255,80,140,.5);}
.defense-money{color:var(--gd);font-size:.86rem;text-shadow:0 0 8px rgba(232,184,48,.4);}
.defense-wave{color:var(--cy);font-family:var(--mono);font-size:.68rem;letter-spacing:.06em;}
.defense-btn{font-family:var(--dot);font-size:.7rem;color:var(--cy);background:rgba(0,232,200,.07);border:1px solid rgba(0,232,200,.6);
  border-radius:3px;padding:0 9px;min-height:34px;cursor:pointer;white-space:nowrap;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
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
  background:rgba(138,82,212,.07);border:1px solid rgba(138,82,212,.35);color:var(--tx);font-family:var(--dot);-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.defense-opt:not(:disabled):hover{border-color:var(--cy);background:rgba(0,232,200,.07);}
.defense-opt:disabled{opacity:.4;cursor:default;}
.defense-opt canvas{flex:none;width:40px;height:40px;}
.defense-opt b{display:block;font-weight:normal;font-size:.68rem;color:var(--tx-b);line-height:1.3;}
.defense-opt small{display:block;font-size:.56rem;color:var(--tx-d);line-height:1.35;}
.defense-opt i{font-style:normal;font-family:var(--mono);font-size:.66rem;color:var(--gd);}
.defense-info{display:flex;gap:8px;align-items:center;font-size:.62rem;line-height:1.55;}
.defense-info canvas{flex:none;width:52px;height:52px;}
.defense-acts{display:flex;gap:6px;margin-top:7px;}
.defense-acts .defense-btn{flex:1;min-height:38px;font-size:.7rem;}
.defense-sell{color:var(--rd)!important;border-color:rgba(232,48,85,.55)!important;background:rgba(232,48,85,.07)!important;}
.defense-intro{position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;pointer-events:none;
  animation:defense-introfade 3.6s ease-in forwards;}
.defense-intro div{background:rgba(6,4,16,.9);border:1px solid rgba(232,48,85,.6);border-radius:5px;padding:14px 18px;max-width:300px;
  text-align:center;box-shadow:0 0 30px rgba(232,48,85,.25);font-family:var(--dot);}
.defense-intro h3{margin:0 0 6px;font-weight:normal;color:#ff7090;font-size:.95rem;letter-spacing:.1em;text-shadow:0 0 10px rgba(232,48,85,.7);}
.defense-intro p{margin:3px 0;font-size:.68rem;color:var(--tx);line-height:1.7;}
.defense-intro p b{color:var(--cy);font-weight:normal;}
@keyframes defense-introfade{0%{opacity:0;}8%{opacity:1;}82%{opacity:1;}100%{opacity:0;visibility:hidden;}}
`);

registerMinigame({
  id:'defense', icon:'🛡', name:'荒らしディフェンス', genre:'タワーディフェンス', bgm:'stream',
  desc:'荒らしの大群がコメント欄に押し寄せる。流れに沿って防衛を置き、配信の「心」を最後まで守り抜け。',
  effect:'炎上↓ フォロワー↑ 配信人気↑ 精神↑ ／ 疲労+8 約60分',
  help:'空き枠をタップで配置・防衛をタップで強化',
  start(body,mg){
    // ── 定数 ──
    const COLS=7, ROWS=11, MAX_LIVES=10, WAVES=5;
    const FONT='"DotGothic16", monospace';
    // 経路（セル中心座標）。上から入り、うねって最下部の「心」へ
    const PATH=[[1,-1.4],[1,2],[5,2],[5,5],[1,5],[1,8],[3,8],[3,10]].map(p=>[p[0]+.5,p[1]+.5]);
    const SLOTS=[[0,1],[3,1],[5,1],[2,3],[4,3],[3,4],[6,4],[0,6],[3,6],[2,7],[2,9],[4,9]];
    const TW={
      mod:   {name:'モデレーター',     col:'#00e8c8', glow:'cy', cost:50, up:60, desc:'単体に安定した攻撃',
              lv:[{range:2.3,rate:.62,dmg:10},{range:2.5,rate:.45,dmg:17}]},
      ng:    {name:'NGワードフィルター',col:'#b07cff', glow:'pu', cost:60, up:60, desc:'範囲を減速＋じわじわ削る',
              lv:[{range:1.55,slow:.42,dps:5},{range:1.8,slow:.58,dps:10}]},
      cheer: {name:'常連の応援',       col:'#e8b830', glow:'gd', cost:70, up:70, desc:'近くの防衛の攻撃速度UP',
              lv:[{range:1.6,buff:1.3},{range:1.95,buff:1.55}]},
      report:{name:'通報ボタン',       col:'#e83055', glow:'rd', cost:90, up:90, desc:'遅いが重い一撃（範囲）',
              lv:[{range:2.8,rate:2.1,dmg:55,splash:.85},{range:3.1,rate:1.7,dmg:95,splash:1}]},
    };
    const TW_KEYS=['mod','ng','cheer','report'];
    const EN={
      troll:{name:'荒らし',     hp:34,  spd:1.85,r:.25, gold:7,  dmg:1},
      bot:  {name:'スパムBot',  hp:13,  spd:2.8, r:.16, gold:3,  dmg:1},
      anti: {name:'粘着アンチ', hp:120, spd:1.15, r:.3,  gold:15, dmg:2},
      boss: {name:'炎上アカウント',hp:950,spd:.72,r:.55,gold:80, dmg:5},
    };
    // ウェーブ構成 [種類, 数, 間隔秒, 開始秒]
    const WAVE_DEF=[
      {sub:'荒らしの先遣隊が来る',      g:[['troll',8,.8,0]]},
      {sub:'スパムBotの群れ',          g:[['troll',6,.9,0],['bot',7,.2,2.5],['bot',7,.2,6]]},
      {sub:'粘着アンチが張り付いてくる',g:[['troll',9,.7,0],['anti',4,1.9,1.5],['bot',8,.2,5]]},
      {sub:'大規模レイド',              g:[['bot',10,.2,0],['troll',12,.55,1.5],['anti',5,1.5,3.5],['bot',10,.2,8]]},
      {sub:'炎上アカウント 襲来',       g:[['troll',8,.6,0],['bot',12,.2,2],['anti',4,1.6,3.5],['boss',1,0,5]]},
    ];
    const CHAT=['草','888','おつ','初見','www','乙','うぽつ','神回','？？','ｗ','わこつ','ナイス','つよい','えぇ…','ねむい','雨すごい','おやすみ','かわいい'];

    // ── DOM ──
    const top=document.createElement('div');top.className='defense-top';
    top.innerHTML=`<div class="defense-st"><span class="defense-life">♥10</span><span class="defense-money">¥0</span><span class="defense-wave">WAVE 0/5</span></div>`+
      `<button class="defense-btn defense-next">▶ 開始</button><button class="defense-btn defense-spd">×1</button>`;
    const stage=document.createElement('div');stage.className='defense-stage';
    const cv=document.createElement('canvas');cv.className='defense-canvas';
    const menu=document.createElement('div');menu.className='defense-menu';
    const intro=document.createElement('div');intro.className='defense-intro';
    intro.innerHTML=`<div><h3>⚠ 荒らし警報</h3><p>荒らしの大群が今夜の配信に向かっている。</p>`+
      `<p><b>空き枠</b>をタップして防衛を配置。<br><b>防衛</b>をタップで強化・売却。</p><p>「配信の心」を5ウェーブ守り抜け。</p></div>`;
    stage.append(cv,menu,intro);body.append(top,stage);
    const elLife=top.querySelector('.defense-life'),elMoney=top.querySelector('.defense-money'),elWave=top.querySelector('.defense-wave');
    const btnNext=top.querySelector('.defense-next'),btnSpd=top.querySelector('.defense-spd');
    const cx=cv.getContext('2d');
    const bgCv=document.createElement('canvas'),bg=bgCv.getContext('2d');

    // ── 状態 ──
    const modCount=(gs.listeners||[]).filter(l=>l.type==='mod').length;
    const modBonus=Math.min(3,modCount)*30;
    let money=150+modBonus, lives=MAX_LIVES, wave=0, phase='prep', cd=13, speed=1;
    let gt=0, rt=0, spawnT=0, queue=[], qi=0, endT=0, endReason='', kills=0, leaked=0, earlyBonus=0, bossKilled=false;
    let towers=[], enemies=[], shots=[], floats=[], rings=[];
    let sel=null;            // {slot index}
    let hoverSlot=-1, previewType=null, shake=0, flash=0, heartHit=0;
    let banner=null;
    const slotTower=new Array(SLOTS.length).fill(null);

    // パーティクル（使い回しプール）
    const PN=420, parts=new Array(PN);
    for(let i=0;i<PN;i++)parts[i]={life:0,max:1,x:0,y:0,vx:0,vy:0,col:'#fff',sz:2,g:0};
    let pi=0;
    function spark(x,y,vx,vy,life,col,sz,grav){
      const p=parts[pi];pi=(pi+1)%PN;
      p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=life;p.max=life;p.col=col;p.sz=sz;p.g=grav||0;
    }
    function burst(x,y,n,col,spd,sz){
      for(let i=0;i<n;i++){const a=Math.random()*6.283,v=spd*(.3+Math.random()*.7);spark(x,y,Math.cos(a)*v,Math.sin(a)*v,.35+Math.random()*.35,col,sz||2.4,0);}
    }

    // ── 経路計算 ──
    const SEG=[];let PATH_LEN=0;
    for(let i=0;i<PATH.length-1;i++){
      const a=PATH[i],b=PATH[i+1],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
      SEG.push({ax:a[0],ay:a[1],dx:(b[0]-a[0])/len,dy:(b[1]-a[1])/len,len,start:PATH_LEN});PATH_LEN+=len;
    }
    const posOut={x:0,y:0,nx:0,ny:0};
    function posAt(d){
      let s=SEG[SEG.length-1];
      for(let i=0;i<SEG.length;i++){if(d<SEG[i].start+SEG[i].len){s=SEG[i];break;}}
      const t=Math.max(0,Math.min(s.len,d-s.start));
      posOut.x=s.ax+s.dx*t;posOut.y=s.ay+s.dy*t;posOut.nx=-s.dy;posOut.ny=s.dx;
      return posOut;
    }
    const HEART={x:PATH[PATH.length-1][0],y:PATH[PATH.length-1][1]};

    // 心のヒビ（固定乱数で生成）
    let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
    const CRACKS=[];
    for(let i=0;i<MAX_LIVES;i++){
      const a=(i*2.399)%6.283-1.2;const pts=[];let r=.08,ang=a;
      pts.push(Math.cos(ang)*r,Math.sin(ang)*r);
      for(let k=0;k<4;k++){r+=.22+rnd()*.12;ang+=(rnd()-.5)*.9;pts.push(Math.cos(ang)*r,Math.sin(ang)*r);}
      CRACKS.push(pts);
    }

    // ── サイズ ──
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
      renderBg();
      placeMenu();
    }
    const ro=new ResizeObserver(()=>{if(mg._ended){ro.disconnect();return;}resize();});
    ro.observe(stage);

    // ── 発光スプライト ──
    const GLOW={};
    [['cy','0,232,200'],['pu','176,124,255'],['gd','232,184,48'],['rd','232,48,85'],['pk','255,95,162'],['or','255,120,40'],['wh','230,220,255']].forEach(([k,rgb])=>{
      const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
      const gr=g.createRadialGradient(32,32,0,32,32,32);
      gr.addColorStop(0,`rgba(${rgb},.9)`);gr.addColorStop(.35,`rgba(${rgb},.35)`);gr.addColorStop(1,`rgba(${rgb},0)`);
      g.fillStyle=gr;g.fillRect(0,0,64,64);GLOW[k]=c;
    });
    function glow(g,x,y,r,k,a){
      g.globalAlpha=a;g.globalCompositeOperation='lighter';g.drawImage(GLOW[k],x-r,y-r,r*2,r*2);
      g.globalCompositeOperation='source-over';g.globalAlpha=1;
    }
    function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
    function circle(g,x,y,r){g.beginPath();g.arc(x,y,r,0,6.2832);}

    // ── 背景（静的部分はオフスクリーンに一度だけ描く） ──
    function renderBg(){
      const g=bg;g.setTransform(dpr,0,0,dpr,0,0);
      g.fillStyle='#05040e';g.fillRect(0,0,W,H);
      let gr=g.createRadialGradient(W/2,H*.62,10,W/2,H*.62,Math.max(W,H)*.75);
      gr.addColorStop(0,'rgba(60,30,110,.35)');gr.addColorStop(1,'rgba(5,4,14,0)');
      g.fillStyle=gr;g.fillRect(0,0,W,H);
      // グリッドの点
      g.fillStyle='rgba(138,82,212,.22)';
      for(let c=0;c<=COLS;c++)for(let r=0;r<=ROWS;r++)g.fillRect(X(c)-1,Y(r)-1,2,2);
      // 枠のUI装飾
      g.font=`${Math.round(C*.19)}px ${FONT}`;g.textBaseline='middle';
      g.textAlign='right';g.fillStyle='rgba(0,232,200,.4)';g.fillText('LIVE CHAT',X(6.9),Y(.32));
      g.fillStyle='rgba(232,48,85,.45)';g.font=`${Math.round(C*.16)}px ${FONT}`;g.fillText('荒らし警報 発令中',X(6.9),Y(.62));
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
      // 走査線
      g.fillStyle='rgba(0,0,0,.16)';for(let y=0;y<H;y+=3)g.fillRect(0,y,W,1);
      // 周辺減光
      gr=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);
      gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.55)');g.fillStyle=gr;g.fillRect(0,0,W,H);
    }

    // ── タワー描画（メニューのアイコンにも使う） ──
    function drawTower(g,x,y,s,type,lv,t,aim,fl){
      const d=TW[type];
      // 台座
      rrect(g,x-s*.4,y-s*.4,s*.8,s*.8,s*.14);g.fillStyle='#0d0a22';g.fill();
      g.lineWidth=Math.max(1,s*.03);g.strokeStyle=d.col;g.globalAlpha=.55+fl*.45;g.stroke();g.globalAlpha=1;
      if(lv>1){rrect(g,x-s*.45,y-s*.45,s*.9,s*.9,s*.17);g.strokeStyle=d.col;g.globalAlpha=.35;g.stroke();g.globalAlpha=1;}
      glow(g,x,y,s*.55,d.glow,.18+fl*.4);
      g.lineWidth=Math.max(1.2,s*.045);
      if(type==='mod'){
        g.beginPath();g.moveTo(x,y-s*.28);g.lineTo(x+s*.22,y-s*.19);g.lineTo(x+s*.2,y+s*.06);
        g.quadraticCurveTo(x+s*.13,y+s*.23,x,y+s*.3);g.quadraticCurveTo(x-s*.13,y+s*.23,x-s*.2,y+s*.06);g.lineTo(x-s*.22,y-s*.19);g.closePath();
        g.fillStyle='rgba(0,232,200,.16)';g.fill();g.strokeStyle='#00e8c8';g.stroke();
        // BANハンマー（標的の方を向く）
        g.save();g.translate(x,y);g.rotate(aim);
        g.strokeStyle='#bff8ee';g.beginPath();g.moveTo(-s*.08,0);g.lineTo(s*.16+fl*s*.05,0);g.stroke();
        g.fillStyle='#00e8c8';g.fillRect(s*.12+fl*s*.05,-s*.09,s*.08,s*.18);
        g.restore();
        if(lv>1){g.fillStyle='#e8b830';circle(g,x,y-s*.28,s*.05);g.fill();}
      }else if(type==='ng'){
        g.save();g.translate(x,y);
        g.rotate(t*1.2);g.setLineDash([s*.07,s*.06]);g.strokeStyle='rgba(176,124,255,.8)';circle(g,0,0,s*.31);g.stroke();
        if(lv>1){g.rotate(-t*2.6);g.strokeStyle='rgba(0,232,200,.6)';circle(g,0,0,s*.36);g.stroke();}
        g.setLineDash([]);g.restore();
        circle(g,x,y,s*.21);g.fillStyle='#22103e';g.fill();g.strokeStyle='#b07cff';g.stroke();
        g.fillStyle='#e8dcff';g.font=`${Math.round(s*.19)}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('NG',x,y+s*.01);
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
        // ハート
        g.fillStyle='#e8b830';heartPath(g,x,y+s*.2,s*.11);g.fill();
      }else if(type==='report'){
        g.fillStyle='#2a0c16';g.beginPath();g.ellipse(x,y+s*.1,s*.26,s*.12,0,0,6.2832);g.fill();g.strokeStyle='rgba(232,48,85,.6)';g.stroke();
        if(lv>1){g.save();g.setLineDash([s*.06,s*.06]);g.strokeStyle='#e8b830';circle(g,x,y,s*.33);g.stroke();g.restore();}
        const py=y-s*.02+fl*s*.07;
        circle(g,x,py,s*.2);g.fillStyle='#e83055';g.fill();g.strokeStyle='#ff9bb0';g.stroke();
        g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(x-s*.06,py-s*.08,s*.08,s*.04,-.5,0,6.2832);g.fill();
        g.fillStyle='#fff';g.font=`${Math.round(s*.24)}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('!',x,py+s*.01);g.textAlign='left';
      }
      // レベル表示
      for(let i=0;i<lv;i++){g.fillStyle=d.col;g.fillRect(x-s*.08+i*s*.11,y+s*.33,s*.07,s*.035);}
    }
    function heartPath(g,x,y,r){
      g.beginPath();g.moveTo(x,y+r*.9);
      g.bezierCurveTo(x-r*1.5,y-r*.1,x-r*.9,y-r*1.25,x,y-r*.45);
      g.bezierCurveTo(x+r*.9,y-r*1.25,x+r*1.5,y-r*.1,x,y+r*.9);g.closePath();
    }

    // ── 敵描画 ──
    function drawEnemy(g,e,t){
      const x=X(e.x),y=Y(e.y)+Math.sin(t*6+e.ph)*C*.025,r=EN[e.type].r*C;
      if(e.slowF<.99){g.save();g.setLineDash([3,3]);g.strokeStyle='rgba(176,124,255,.7)';g.lineWidth=1.5;circle(g,x,y,r+3);g.stroke();g.restore();}
      if(e.type==='troll'){
        glow(g,x,y,r*2,'rd',.25);
        g.fillStyle='#b81d3c';circle(g,x,y,r);g.fill();
        g.beginPath();g.moveTo(x-r*.55,y+r*.6);g.lineTo(x-r*.95,y+r*1.15);g.lineTo(x-r*.1,y+r*.85);g.fill();
        g.fillStyle='#ff5a78';circle(g,x-r*.25,y-r*.3,r*.45);g.globalAlpha=.35;g.fill();g.globalAlpha=1;
        g.strokeStyle='#ff9ab0';g.lineWidth=1.2;circle(g,x,y,r);g.stroke();
        g.fillStyle='#fff';
        circle(g,x-r*.36,y-r*.05,r*.2);g.fill();circle(g,x+r*.36,y-r*.05,r*.2);g.fill();
        g.fillStyle='#1a0008';circle(g,x-r*.32,y-r*.01,r*.1);g.fill();circle(g,x+r*.32,y-r*.01,r*.1);g.fill();
        g.strokeStyle='#1a0008';g.lineWidth=Math.max(1.2,r*.13);
        g.beginPath();g.moveTo(x-r*.65,y-r*.42);g.lineTo(x-r*.15,y-r*.22);g.moveTo(x+r*.65,y-r*.42);g.lineTo(x+r*.15,y-r*.22);
        g.moveTo(x-r*.35,y+r*.45);g.lineTo(x-r*.17,y+r*.32);g.lineTo(x,y+r*.45);g.lineTo(x+r*.17,y+r*.32);g.lineTo(x+r*.35,y+r*.45);g.stroke();
      }else if(e.type==='bot'){
        g.strokeStyle='#6fe0ff';g.lineWidth=1;g.beginPath();g.moveTo(x,y-r);g.lineTo(x,y-r*1.7);g.stroke();
        g.fillStyle=(Math.floor(t*6+e.ph)%2)?'#ff4060':'#6fe0ff';circle(g,x,y-r*1.75,r*.25);g.fill();
        rrect(g,x-r,y-r*.85,r*2,r*1.7,r*.35);g.fillStyle='#24485a';g.fill();g.strokeStyle='#6fe0ff';g.stroke();
        g.fillStyle='#08131a';g.fillRect(x-r*.75,y-r*.3,r*1.5,r*.5);
        g.fillStyle='#ff4060';g.fillRect(x-r*.7+(Math.sin(t*7+e.ph)*.5+.5)*r*1.1,y-r*.25,r*.3,r*.4);
      }else if(e.type==='anti'){
        glow(g,x,y,r*2.1,'pu',.22);
        g.fillStyle='#4c2178';
        for(let i=-1;i<=1;i++){const l=r*(.55+.25*Math.sin(t*3+i*1.7+e.ph));g.fillRect(x+i*r*.5-r*.13,y+r*.4,r*.26,l);circle(g,x+i*r*.5,y+r*.4+l,r*.14);g.fill();}
        g.beginPath();g.ellipse(x,y,r*1.05,r*.92,0,0,6.2832);g.fill();g.strokeStyle='#b07cff';g.lineWidth=1.4;g.stroke();
        // 半目でじっと見る
        for(const s of[-1,1]){
          g.fillStyle='#f0e8ff';g.beginPath();g.arc(x+s*r*.38,y-r*.08,r*.22,0,Math.PI);g.fill();
          g.fillStyle='#120420';circle(g,x+s*r*.38,y,r*.1);g.fill();
          g.strokeStyle='#120420';g.lineWidth=Math.max(1.2,r*.1);g.beginPath();g.moveTo(x+s*r*.12,y-r*.1);g.lineTo(x+s*r*.64,y-r*.08);g.stroke();
        }
        g.beginPath();g.moveTo(x-r*.25,y+r*.42);g.lineTo(x,y+r*.32);g.lineTo(x+r*.25,y+r*.42);g.stroke();
      }else{ // boss
        glow(g,x,y,r*2.6,'or',.45+.1*Math.sin(t*5));
        for(let i=0;i<11;i++){
          const a=Math.PI+i/10*Math.PI,fl=r*(.45+.3*Math.abs(Math.sin(t*7+i*1.3)));
          const bx=x+Math.cos(a)*r*.9,by=y+Math.sin(a)*r*.9;
          g.fillStyle=i%2?'#ff7a28':'#ffcc33';
          g.beginPath();g.moveTo(bx+Math.cos(a+1.57)*r*.18,by+Math.sin(a+1.57)*r*.18);
          g.lineTo(bx+Math.cos(a)*fl,by+Math.sin(a)*fl);g.lineTo(bx-Math.cos(a+1.57)*r*.18,by-Math.sin(a+1.57)*r*.18);g.fill();
        }
        g.fillStyle='#2a0810';circle(g,x,y,r);g.fill();
        g.strokeStyle='#ff6a2a';g.lineWidth=Math.max(2,r*.08);g.stroke();
        g.fillStyle='#ffcc33';
        for(const s of[-1,1]){g.beginPath();g.moveTo(x+s*r*.15,y-r*.05);g.lineTo(x+s*r*.6,y-r*.32);g.lineTo(x+s*r*.5,y+r*.05);g.closePath();g.fill();}
        g.beginPath();g.arc(x,y+r*.15,r*.48,.15,Math.PI-.15);g.closePath();g.fillStyle='#120206';g.fill();g.strokeStyle='#ff6a2a';g.lineWidth=1.5;g.stroke();
        g.fillStyle='#ffe2b0';for(let i=0;i<5;i++)g.fillRect(x-r*.36+i*r*.16,y+r*.2,r*.08,r*.1);
        g.font=`${Math.round(C*.2)}px ${FONT}`;g.textAlign='center';g.fillStyle='#ffb070';g.fillText('炎上アカウント',x,y-r*1.55);g.textAlign='left';
      }
      if(e.hit>0){g.globalAlpha=e.hit*3;g.fillStyle='#fff';circle(g,x,y,r*.95);g.fill();g.globalAlpha=1;}
      if(e.hp<e.max||e.type==='boss'){
        const bw=Math.max(C*.5,r*2),bx=x-bw/2,by=y-r-(e.type==='boss'?C*.25:7);
        g.fillStyle='rgba(0,0,0,.7)';g.fillRect(bx-1,by-1,bw+2,5);
        const f=Math.max(0,e.hp/e.max);g.fillStyle=f>.5?'#44ee88':f>.25?'#e8b830':'#e83055';g.fillRect(bx,by,bw*f,3);
      }
    }

    // ── ゲーム処理 ──
    function buildQueue(w){
      queue=[];qi=0;spawnT=0;
      WAVE_DEF[w-1].g.forEach(([type,n,iv,st])=>{for(let i=0;i<n;i++)queue.push({t:st+i*iv,type});});
      queue.sort((a,b)=>a.t-b.t);
    }
    function spawnEnemy(type,d,boost){
      const b=EN[type],mult=1+.14*(wave-1);
      enemies.push({type,d:d||0,x:0,y:0,hp:b.hp*mult*(boost||1),max:b.hp*mult*(boost||1),off:(Math.random()-.5)*(type==='boss'?0:.34),
        ph:Math.random()*6,slowF:1,hit:0,spawnCd:3,dead:false});
    }
    function startWave(){
      if(phase!=='prep')return;
      if(wave>0&&cd>1){earlyBonus+=Math.floor(cd);money+=Math.floor(cd);addFloat(X(3.5),Y(.8),`早期開始 +¥${Math.floor(cd)}`,'#e8b830');}
      wave++;phase='wave';buildQueue(wave);
      const boss=wave===WAVES;
      banner={t:rt,text:boss?'FINAL WAVE':`WAVE ${wave}`,sub:WAVE_DEF[wave-1].sub,col:boss?'#ff6a2a':'#00e8c8'};
      AU.se(boss?'warn':'live');
    }
    function waveCleared(){
      const bonus=20+wave*5;money+=bonus;
      if(wave>=WAVES){phase='end';endReason='clear';endT=2.4;
        banner={t:rt,text:'防衛成功',sub:'配信の心は守られた',col:'#44ee88'};AU.se('ach');}
      else{phase='prep';cd=6;banner={t:rt,text:`WAVE ${wave} クリア`,sub:`ボーナス +¥${bonus}`,col:'#e8b830'};AU.se('decide');}
      refreshMenu();
    }
    function addFloat(x,y,text,col){floats.push({x,y,text,col,life:1.1});if(floats.length>30)floats.shift();}
    function hurt(e,dmg){
      if(e.dead)return;
      e.hp-=dmg;e.hit=Math.min(.18,e.hit+.1);
      if(e.hp<=0){
        e.dead=true;kills++;const b=EN[e.type];money+=b.gold;
        const x=X(e.x),y=Y(e.y);
        const col=e.type==='bot'?'#6fe0ff':e.type==='anti'?'#b07cff':e.type==='boss'?'#ffcc33':'#ff5a78';
        burst(x,y,e.type==='boss'?60:e.type==='bot'?7:14,col,e.type==='boss'?260:150,e.type==='boss'?3.5:2.4);
        rings.push({x,y,r:b.r*C,max:b.r*C*(e.type==='boss'?5:2.6),life:.45,ml:.45,col});
        addFloat(x,y-b.r*C,`+¥${b.gold}`,'#e8b830');
        if(e.type==='boss'){bossKilled=true;shake=.5;AU.se('rank');}
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
    function build(si,type){
      const d=TW[type];if(slotTower[si]||money<d.cost||phase==='end')return;
      money-=d.cost;
      const t={type,lv:1,x:SLOTS[si][0]+.5,y:SLOTS[si][1]+.5,cd:.2,aim:-1.57,fl:0,buff:1,links:[],spent:d.cost,slot:si};
      towers.push(t);slotTower[si]=t;computeBuffs();
      burst(X(t.x),Y(t.y),14,d.col,120,2);rings.push({x:X(t.x),y:Y(t.y),r:C*.2,max:C*.7,life:.4,ml:.4,col:d.col});
      AU.se('tool');closeMenu();
    }
    function upgrade(si){
      const t=slotTower[si];if(!t||t.lv>1)return;const d=TW[t.type];if(money<d.up)return;
      money-=d.up;t.lv=2;t.spent+=d.up;computeBuffs();
      burst(X(t.x),Y(t.y),22,d.col,170,2.4);rings.push({x:X(t.x),y:Y(t.y),r:C*.3,max:C*1.1,life:.5,ml:.5,col:d.col});
      AU.se('repair');openMenu(si);
    }
    function sell(si){
      const t=slotTower[si];if(!t)return;
      money+=Math.floor(t.spent*.7);towers.splice(towers.indexOf(t),1);slotTower[si]=null;computeBuffs();
      burst(X(t.x),Y(t.y),10,'#bbaedd',90,2);AU.se('back');openMenu(si);
    }
    function firstInRange(x,y,range){
      let best=null,bd=-1;
      for(let i=0;i<enemies.length;i++){const e=enemies[i];if(e.dead)continue;
        const dx=e.x-x,dy=e.y-y;if(dx*dx+dy*dy<=range*range&&e.d>bd){bd=e.d;best=e;}}
      return best;
    }

    function update(dt){
      gt+=dt;
      if(phase==='prep'){cd-=dt;if(cd<=0)startWave();}
      else if(phase==='wave'){
        spawnT+=dt;
        while(qi<queue.length&&queue[qi].t<=spawnT){spawnEnemy(queue[qi].type);qi++;}
        if(qi>=queue.length&&enemies.length===0)waveCleared();
      }else if(phase==='end'){endT-=dt;if(endT<=0&&!mg._ended){mg.end(endReason);return;}}
      // 減速・持続ダメージ
      for(let i=0;i<enemies.length;i++)enemies[i].slowF=1;
      for(let k=0;k<towers.length;k++){const t=towers[k];if(t.type!=='ng')continue;const L=TW.ng.lv[t.lv-1];
        for(let i=0;i<enemies.length;i++){const e=enemies[i];if(e.dead)continue;
          const dx=e.x-t.x,dy=e.y-t.y;if(dx*dx+dy*dy>L.range*L.range)continue;
          e.slowF=Math.min(e.slowF,1-L.slow*(e.type==='boss'?.5:1));hurt(e,L.dps*t.buff*dt);
          if(Math.random()<dt*4)spark(X(e.x)+(Math.random()-.5)*C*.3,Y(e.y),0,-30,.4,'#b07cff',2,0);}
      }
      // 敵の移動
      for(let i=0;i<enemies.length;i++){const e=enemies[i];if(e.dead)continue;
        const b=EN[e.type];e.d+=b.spd*e.slowF*dt;e.hit=Math.max(0,e.hit-dt);
        const p=posAt(e.d);e.x=p.x+p.nx*e.off;e.y=p.y+p.ny*e.off;
        if(e.type==='boss'){
          e.spawnCd-=dt;if(Math.random()<dt*14)spark(X(e.x)+(Math.random()-.5)*C*.8,Y(e.y)-C*.3,(Math.random()-.5)*20,-60-Math.random()*40,.6,Math.random()<.5?'#ff7a28':'#ffcc33',2.6,0);
          if(e.spawnCd<=0&&e.d>1){e.spawnCd=3.4;for(let k=0;k<2;k++)spawnEnemy('bot',Math.max(0,e.d-.3-k*.35),1.4);
            addFloat(X(e.x),Y(e.y)-C*.9,'拡散！','#ff7a28');}
        }else if(e.type==='anti'&&Math.random()<dt*3)spark(X(e.x),Y(e.y)+C*.2,0,10,.8,'rgba(176,124,255,.6)',2.5,0);
        if(e.d>=PATH_LEN-.3){
          e.dead=true;leaked+=b.dmg;
          if(phase!=='end'||endReason!=='down'){
            lives=Math.max(0,lives-b.dmg);shake=Math.min(.6,shake+.25+b.dmg*.06);flash=.35;heartHit=.5;
            burst(X(HEART.x),Y(HEART.y),14,'#ff5fa2',160,2.6);addFloat(X(HEART.x),Y(HEART.y)-C*.6,`心 -${b.dmg}`,'#ff5f80');
            AU.se(b.dmg>=3?'ghost':'noise');
            if(lives<=0&&phase!=='end'){
              phase='end';endReason='down';endT=2.2;
              burst(X(HEART.x),Y(HEART.y),70,'#ff5fa2',260,3.2);
              banner={t:rt,text:'心が折れた',sub:'配信が荒らしに埋め尽くされた',col:'#e83055'};AU.se('warn');
            }
          }
        }
      }
      // タワーの攻撃
      for(let k=0;k<towers.length;k++){const t=towers[k];t.fl=Math.max(0,t.fl-dt*4);
        if(t.type!=='mod'&&t.type!=='report')continue;
        const L=TW[t.type].lv[t.lv-1];t.cd-=dt*t.buff;
        const tg=firstInRange(t.x,t.y,L.range);
        if(tg){const ta=Math.atan2(tg.y-t.y,tg.x-t.x);let da=ta-t.aim;da=Math.atan2(Math.sin(da),Math.cos(da));t.aim+=da*Math.min(1,dt*14);}
        if(t.cd<=0&&tg){
          t.cd=L.rate;t.fl=1;
          shots.push({kind:t.type,x:t.x+Math.cos(t.aim)*.25,y:t.y+Math.sin(t.aim)*.25,px:t.x,py:t.y,tg,tx:tg.x,ty:tg.y,dmg:L.dmg,splash:L.splash||0,
            spd:t.type==='mod'?10:6.5,dead:false});
          if(t.type==='report')AU.se('machine');
        }
      }
      // 弾
      let n=0;
      for(let i=0;i<shots.length;i++){const s=shots[i];
        if(s.tg&&!s.tg.dead){s.tx=s.tg.x;s.ty=s.tg.y;}
        const dx=s.tx-s.x,dy=s.ty-s.y,dist=Math.hypot(dx,dy),step=s.spd*dt;
        s.px=s.x;s.py=s.y;
        if(dist<=step+.08){
          const hx=X(s.tx),hy=Y(s.ty);
          if(s.kind==='mod'){if(s.tg&&!s.tg.dead)hurt(s.tg,s.dmg);burst(hx,hy,4,'#bff8ee',110,1.8);}
          else{
            for(let j=0;j<enemies.length;j++){const e=enemies[j];if(e.dead)continue;
              const d2=Math.hypot(e.x-s.tx,e.y-s.ty);if(d2<=s.splash)hurt(e,e===s.tg?s.dmg:s.dmg*.6);}
            burst(hx,hy,16,'#ff5a78',190,2.6);rings.push({x:hx,y:hy,r:4,max:s.splash*C,life:.35,ml:.35,col:'#e83055'});shake=Math.max(shake,.12);
          }
          continue;
        }
        s.x+=dx/dist*step;s.y+=dy/dist*step;
        if(s.kind==='report'&&Math.random()<.7)spark(X(s.x),Y(s.y),(Math.random()-.5)*20,(Math.random()-.5)*20,.3,'#ff7a90',2.2,0);
        shots[n++]=s;
      }
      shots.length=n;
      n=0;for(let i=0;i<enemies.length;i++)if(!enemies[i].dead)enemies[n++]=enemies[i];enemies.length=n;
      // エフェクト
      for(let i=0;i<PN;i++){const p=parts[i];if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.vx*=.96;p.vy*=.96;}
      n=0;for(let i=0;i<rings.length;i++){const r=rings[i];r.life-=dt;if(r.life>0)rings[n++]=r;}rings.length=n;
      n=0;for(let i=0;i<floats.length;i++){const f=floats[i];f.life-=dt;f.y-=28*dt;if(f.life>0)floats[n++]=f;}floats.length=n;
      shake=Math.max(0,shake-dt*1.6);flash=Math.max(0,flash-dt);heartHit=Math.max(0,heartHit-dt);
    }

    // ── 描画 ──
    const RAIN=[];for(let i=0;i<34;i++)RAIN.push({x:Math.random(),y:Math.random(),v:.5+Math.random()*.5});
    function draw(rdt){
      const g=cx;g.setTransform(dpr,0,0,dpr,0,0);
      g.drawImage(bgCv,0,0,W,H);
      if(shake>0){const s=shake*C*.14;g.translate((Math.random()-.5)*s,(Math.random()-.5)*s);}
      const t=rt;
      // レーンを流れるコメント
      g.font=`${Math.round(C*.2)}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
      const sp=PATH_LEN/CHAT.length;
      for(let i=0;i<CHAT.length;i++){
        const d=(i*sp+t*.55)%PATH_LEN;const p=posAt(d);
        g.fillStyle=i%4===0?'rgba(0,232,200,.2)':'rgba(187,174,221,.17)';g.fillText(CHAT[i],X(p.x),Y(p.y));
      }
      // 入口
      if(phase==='wave'&&qi<queue.length){const a=.5+.5*Math.sin(t*8);g.fillStyle=`rgba(232,48,85,${.4+a*.5})`;g.font=`${Math.round(C*.22)}px ${FONT}`;
        g.fillText('▼ 接近中',X(PATH[0][0]+.95),Y(.1));glow(g,X(PATH[0][0]),Y(-.1),C*.8,'rd',.3+a*.3);}
      // ON AIR
      const on=.6+.4*Math.sin(t*3);glow(g,X(.45),Y(10.5),C*.35,'rd',on*.5);
      g.fillStyle=`rgba(232,48,85,${on})`;circle(g,X(.32),Y(10.5),C*.07);g.fill();
      g.font=`${Math.round(C*.17)}px ${FONT}`;g.textAlign='left';g.fillStyle='rgba(255,140,160,.75)';g.fillText('ON AIR',X(.48),Y(10.5));
      // 配置枠
      for(let i=0;i<SLOTS.length;i++){
        if(slotTower[i])continue;const x=X(SLOTS[i][0]+.5),y=Y(SLOTS[i][1]+.5);
        const act=sel===i||hoverSlot===i;
        rrect(g,x-C*.36,y-C*.36,C*.72,C*.72,C*.12);g.fillStyle=act?'rgba(0,232,200,.1)':'rgba(138,82,212,.06)';g.fill();
        g.setLineDash([4,4]);g.lineDashOffset=-t*8;g.strokeStyle=act?'rgba(0,232,200,.85)':`rgba(138,82,212,${.4+.15*Math.sin(t*2+i)})`;g.lineWidth=1;g.stroke();g.setLineDash([]);
        g.strokeStyle=act?'#00e8c8':'rgba(187,174,221,.35)';g.beginPath();g.moveTo(x-C*.09,y);g.lineTo(x+C*.09,y);g.moveTo(x,y-C*.09);g.lineTo(x,y+C*.09);g.stroke();
      }
      // 射程表示
      if(sel!==null){
        const st=slotTower[sel],type=st?st.type:previewType;
        if(type){const L=TW[type].lv[st?st.lv-1:0];const x=X(SLOTS[sel][0]+.5),y=Y(SLOTS[sel][1]+.5);
          circle(g,x,y,L.range*C);g.fillStyle='rgba(0,232,200,.06)';g.fill();g.setLineDash([6,5]);g.lineDashOffset=t*10;g.strokeStyle=TW[type].col;g.globalAlpha=.7;g.lineWidth=1.3;g.stroke();g.setLineDash([]);g.globalAlpha=1;
          if(st&&st.lv<2){const L2=TW[type].lv[1];circle(g,x,y,L2.range*C);g.setLineDash([2,6]);g.strokeStyle='rgba(232,184,48,.4)';g.stroke();g.setLineDash([]);}}
      }
      // NG領域・応援リンク
      for(let k=0;k<towers.length;k++){const tw=towers[k],x=X(tw.x),y=Y(tw.y);
        if(tw.type==='ng'){const R=TW.ng.lv[tw.lv-1].range*C;
          const gr=g.createRadialGradient(x,y,R*.2,x,y,R);gr.addColorStop(0,'rgba(176,124,255,0)');gr.addColorStop(1,`rgba(176,124,255,${.1+.04*Math.sin(t*3+k)})`);
          circle(g,x,y,R);g.fillStyle=gr;g.fill();g.strokeStyle='rgba(176,124,255,.22)';g.lineWidth=1;g.stroke();}
        if(tw.type==='cheer'&&tw.links.length){g.setLineDash([3,5]);g.lineDashOffset=-t*20;g.strokeStyle='rgba(232,184,48,.45)';g.lineWidth=1.2;
          for(const o of tw.links){g.beginPath();g.moveTo(x,y);g.lineTo(X(o.x),Y(o.y));g.stroke();}g.setLineDash([]);}
      }
      // タワー
      for(let k=0;k<towers.length;k++){const tw=towers[k];drawTower(g,X(tw.x),Y(tw.y),C,tw.type,tw.lv,t+k,tw.aim,tw.fl);
        if(tw.buff>1){g.fillStyle='#e8b830';g.font=`${Math.round(C*.17)}px ${FONT}`;g.textAlign='center';g.fillText('▲',X(tw.x)+C*.32,Y(tw.y)-C*.3+Math.sin(t*4+k)*2);g.textAlign='left';}
        if(sel===tw.slot){rrect(g,X(tw.x)-C*.47,Y(tw.y)-C*.47,C*.94,C*.94,C*.18);g.strokeStyle='#fff';g.globalAlpha=.5+.3*Math.sin(t*6);g.lineWidth=1.5;g.stroke();g.globalAlpha=1;}
      }
      drawHeart(g,t);
      for(let i=0;i<enemies.length;i++)drawEnemy(g,enemies[i],t);
      // 弾
      for(let i=0;i<shots.length;i++){const s=shots[i],x=X(s.x),y=Y(s.y);
        if(s.kind==='mod'){const dx=s.x-s.px,dy=s.y-s.py,l=Math.hypot(dx,dy)||1;
          g.strokeStyle='#bff8ee';g.lineWidth=2.4;g.beginPath();g.moveTo(x-dx/l*C*.35,y-dy/l*C*.35);g.lineTo(x,y);g.stroke();glow(g,x,y,C*.22,'cy',.8);}
        else{glow(g,x,y,C*.4,'rd',.9);g.fillStyle='#ffd0d8';circle(g,x,y,C*.08);g.fill();}
      }
      // パーティクル
      for(let i=0;i<PN;i++){const p=parts[i];if(p.life<=0)continue;g.globalAlpha=Math.min(1,p.life/p.max*1.4);g.fillStyle=p.col;g.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);}
      g.globalAlpha=1;
      for(let i=0;i<rings.length;i++){const r=rings[i],f=1-r.life/r.ml;g.globalAlpha=1-f;g.strokeStyle=r.col;g.lineWidth=2;circle(g,r.x,r.y,r.r+(r.max-r.r)*f);g.stroke();}
      g.globalAlpha=1;
      g.font=`${Math.round(C*.21)}px ${FONT}`;g.textAlign='center';
      for(let i=0;i<floats.length;i++){const f=floats[i];g.globalAlpha=Math.min(1,f.life*2);g.fillStyle='#000';g.fillText(f.text,f.x+1,f.y+1);g.fillStyle=f.col;g.fillText(f.text,f.x,f.y);}
      g.globalAlpha=1;g.textAlign='left';
      g.setTransform(dpr,0,0,dpr,0,0);
      // 雨
      g.strokeStyle='rgba(150,170,255,.13)';g.lineWidth=1;g.beginPath();
      for(let i=0;i<RAIN.length;i++){const r=RAIN[i];r.y+=r.v*rdt*.9;if(r.y>1.05){r.y=-.05;r.x=Math.random();}
        const x=r.x*W,y=r.y*H;g.moveTo(x,y);g.lineTo(x-2,y+10+r.v*8);}
      g.stroke();
      if(flash>0){g.fillStyle=`rgba(232,48,85,${flash*.5})`;g.fillRect(0,0,W,H);}
      if(lives<=3&&phase!=='end'){const a=.12+.08*Math.sin(t*5);const gr=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);
        gr.addColorStop(0,'rgba(232,48,85,0)');gr.addColorStop(1,`rgba(232,48,85,${a})`);g.fillStyle=gr;g.fillRect(0,0,W,H);}
      drawBanner(g,t);
    }
    function drawHeart(g,t){
      const x=X(HEART.x),y=Y(HEART.y),ratio=lives/MAX_LIVES;
      const pul=1+.06*Math.sin(t*(2.2+(1-ratio)*7))+heartHit*.25;
      const r=C*.36*pul;
      glow(g,x,y,C*(1.3+heartHit),'pk',.35+.35*ratio+heartHit);
      // 外周リング
      g.strokeStyle=`rgba(255,95,162,${.25+.2*Math.sin(t*2)})`;g.lineWidth=1.2;circle(g,x,y,C*.48+Math.sin(t*2)*2);g.stroke();
      if(lives<=0&&phase==='end'){
        // 砕けた欠片
        g.fillStyle='#5a1020';for(let i=0;i<6;i++){const a=i*1.05+.3,dd=C*(.2+(2.2-endT)*.25);g.save();g.translate(x+Math.cos(a)*dd,y+Math.sin(a)*dd);g.rotate(a+t);g.fillRect(-C*.07,-C*.05,C*.14,C*.1);g.restore();}
        return;
      }
      heartPath(g,x,y+r*.15,r);
      g.fillStyle=ratio>.6?'#ff5fa2':ratio>.3?'#ff3d6e':'#c0203c';g.fill();
      g.strokeStyle='#ffd0e6';g.lineWidth=1.5;g.stroke();
      g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.ellipse(x-r*.42,y-r*.18,r*.18,r*.1,-.6,0,6.2832);g.fill();
      // ヒビ
      const lost=MAX_LIVES-lives;
      if(lost>0){g.save();heartPath(g,x,y+r*.15,r);g.clip();g.strokeStyle='#2a0612';g.lineWidth=Math.max(1.4,C*.035);g.lineJoin='miter';
        for(let i=0;i<lost&&i<CRACKS.length;i++){const c=CRACKS[i];g.beginPath();g.moveTo(x+c[0]*r,y+c[1]*r);for(let k=2;k<c.length;k+=2)g.lineTo(x+c[k]*r,y+c[k+1]*r);g.stroke();}
        g.restore();}
      g.font=`${Math.round(C*.17)}px ${FONT}`;g.textAlign='left';g.textBaseline='middle';
      g.fillStyle='rgba(255,170,210,.8)';g.fillText('配信の心',X(4.15),Y(10.32));
      g.fillStyle=ratio>.3?'#ff8ab8':'#ff4060';g.font=`${Math.round(C*.2)}px ${FONT}`;g.fillText(`♥ ${lives}/${MAX_LIVES}`,X(4.15),Y(10.62));
    }
    function drawBanner(g,t){
      if(!banner)return;const e=t-banner.t,D=2.3;if(e>D){banner=null;return;}
      const inT=Math.min(1,e/.25),outT=e>D-.35?(D-e)/.35:1,a=Math.max(0,Math.min(inT,outT));
      const cy=H*.42,bh=C*1.15;
      g.globalAlpha=a*.85;g.fillStyle='rgba(6,4,16,.9)';g.fillRect(0,cy-bh/2,W,bh);
      g.fillStyle=banner.col;g.fillRect((1-inT)*-W,cy-bh/2,W,2);g.fillRect((1-inT)*W,cy+bh/2-2,W,2);
      g.globalAlpha=a;g.textAlign='center';g.textBaseline='middle';
      const sx=(1-inT)*40;
      g.font=`${Math.round(C*.46)}px ${FONT}`;g.fillStyle=banner.col;g.shadowColor=banner.col;g.shadowBlur=14;
      g.fillText(banner.text,W/2+sx,cy-C*.14);g.shadowBlur=0;
      g.font=`${Math.round(C*.21)}px ${FONT}`;g.fillStyle='#deccf8';g.fillText(banner.sub,W/2-sx,cy+C*.3);
      g.globalAlpha=1;g.textAlign='left';
    }

    // ── メニュー ──
    function iconCanvas(type,lv,size){
      const c=document.createElement('canvas');c.width=c.height=size*dpr;const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
      drawTower(g,size/2,size/2,size*1.1,type,lv,.6,-.8,0);return c;
    }
    let menuBtns=[];
    function openMenu(si){
      sel=si;previewType=null;menuBtns=[];
      const t=slotTower[si];
      menu.innerHTML='';
      if(!t){
        menu.innerHTML=`<div class="defense-mh">防衛を配置<small>所持 ¥<span class="defense-mm">${money}</span></small><button class="defense-x">×</button></div><div class="defense-opts"></div>`;
        const box=menu.querySelector('.defense-opts');
        TW_KEYS.forEach((k,i)=>{const d=TW[k];
          const b=document.createElement('button');b.className='defense-opt';
          b.append(iconCanvas(k,1,40));
          const tx=document.createElement('div');tx.innerHTML=`<b>${d.name}</b><small>${d.desc}</small><i>¥${d.cost}</i>`;b.append(tx);
          b.onclick=()=>build(si,k);
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
        if(up){up.onclick=()=>upgrade(si);up._cost=d.up;menuBtns.push(up);}
        menu.querySelector('.defense-sell').onclick=()=>sell(si);
      }
      menu.querySelector('.defense-x').onclick=closeMenu;
      menu.classList.add('on');placeMenu();refreshMenu();
    }
    function closeMenu(){sel=null;previewType=null;menu.classList.remove('on');}
    function refreshMenu(){
      if(sel===null)return;
      menuBtns.forEach(b=>{b.disabled=money<b._cost||phase==='end';});
      const mm=menu.querySelector('.defense-mm');if(mm)mm.textContent=money;
    }
    function placeMenu(){
      if(sel===null)return;
      const row=SLOTS[sel][1];
      if(row>=5){menu.style.top='8px';menu.style.bottom='';}else{menu.style.bottom='8px';menu.style.top='';}
    }

    // ── 入力 ──
    function slotAt(px,py){
      const c=Math.floor((px-ox)/C),r=Math.floor((py-oy)/C);
      for(let i=0;i<SLOTS.length;i++)if(SLOTS[i][0]===c&&SLOTS[i][1]===r)return i;
      return -1;
    }
    cv.addEventListener('pointerdown',e=>{
      intro.style.display='none';
      const r=cv.getBoundingClientRect();const si=slotAt(e.clientX-r.left,e.clientY-r.top);
      if(si>=0){if(sel===si)closeMenu();else{openMenu(si);AU.se('btn');}}
      else closeMenu();
    });
    cv.addEventListener('pointermove',e=>{
      if(e.pointerType!=='mouse')return;const r=cv.getBoundingClientRect();hoverSlot=slotAt(e.clientX-r.left,e.clientY-r.top);
    });
    cv.addEventListener('pointerleave',()=>{hoverSlot=-1;});
    btnNext.onclick=()=>{if(phase==='prep'){startWave();intro.style.display='none';}};
    btnSpd.onclick=()=>{speed=speed===1?2:1;AU.se('btn');};
    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      const k=e.key;
      if(k===' '||k==='Enter'){e.preventDefault();if(phase==='prep')startWave();}
      else if(k==='x'||k==='X'){speed=speed===1?2:1;}
      else if(k==='Escape')closeMenu();
      else if(sel!==null&&k>='1'&&k<='4'&&!slotTower[sel])build(sel,TW_KEYS[+k-1]);
      else if(sel!==null&&(k==='u'||k==='U'))upgrade(sel);
      else if(sel!==null&&(k==='s'||k==='S')&&slotTower[sel])sell(sel);
    });

    // ── HUD ──
    let hudKey='';
    function hud(){
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
    if(modBonus)addFloat(W/2,H*.3,`モデレーター${Math.min(3,modCount)}人が駆けつけた +¥${modBonus}`,'#00e8c8');
    // デバッグ・テスト用の参照（ゲーム外からは使わない）
    cv._dbg={get state(){return{money,lives,wave,phase,cd,enemies:enemies.length,towers:towers.length,kills,speed,gt};},slots:SLOTS,
      cell:(c,r)=>({x:ox+(c+.5)*C,y:oy+(r+.5)*C})};

    mg.loop(rdt=>{
      rt+=rdt;
      for(let i=0;i<speed&&!mg._ended;i++)update(rdt);
      if(mg._ended)return;
      draw(rdt);hud();
    });

    return {result(reason){
      ro.disconnect();
      const clear=reason==='clear',down=reason==='down';
      const fx=clear?{flame:-Math.min(gs.flame,2+(lives>=8?1:0)),followers:8+Math.round(7*(lives-1)/(MAX_LIVES-1)),streamPop:5,mental:3,fatigue:8}
        :down?{mental:-6,flame:1,fatigue:8}:{fatigue:4};
      return {
        title:clear?'🛡 荒らしを退けた':down?'💔 心が折れた':'🛡 防衛を中断した',
        summary:`到達ウェーブ <span class="up">${wave}/${WAVES}</span>　撃退 <span class="up">${kills}</span>`+
          `<br>残った心 <span class="${lives>=5?'up':'down'}">${lives}/${MAX_LIVES}</span>`+(bossKilled?'　炎上アカウント撃破':'')+
          (modBonus?`<br><span class="up">モデレーターの援護 +¥${modBonus}</span>`:''),
        fx, time:clear||down?60:30, sp:clear?1:0,
        log:clear?'荒らしのレイドを最後まで防ぎ切った。コメント欄に、いつもの声が戻ってきた。':down?'荒らしに配信を埋め尽くされた。画面の向こうの常連が心配している。':'荒らし対策を途中で切り上げた。',
        cutin:clear?['win','……守れた。来てくれたみんなの居場所やからな。']:down?['fear','……コメント欄が、知らん言葉で埋まっていく。']:null,
      };
    }};
  },
});
