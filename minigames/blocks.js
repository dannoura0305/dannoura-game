// ══════════════════════════════════════════════════════════
// 落ち物パズル「部品積み込み」
// 工場の部品・木箱をパレットに積み込み、横一列そろったら出荷（ライン消去）。
// 90秒のタイムアタック。積み上がって溢れたら荷崩れで終了。
// ══════════════════════════════════════════════════════════
addMinigameStyle('blocks',`
.mg-blocks{background:#05040e;}
.mg-blocks .blocks-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;}
.mg-blocks .blocks-bar{position:absolute;left:0;right:0;bottom:0;display:flex;gap:6px;padding:6px 8px 7px;box-sizing:border-box;
  background:linear-gradient(180deg,rgba(14,10,30,.96),rgba(6,4,14,.98));border-top:1px solid rgba(138,82,212,.35);touch-action:none;}
.mg-blocks .blocks-bar::before{content:"";position:absolute;left:0;right:0;top:-4px;height:3px;
  background:repeating-linear-gradient(135deg,rgba(232,184,48,.55) 0 7px,rgba(10,8,20,.55) 7px 14px);}
.mg-blocks .blocks-btn{flex:1;min-width:0;border-radius:7px;border:1px solid rgba(187,174,221,.28);touch-action:none;cursor:pointer;
  background:linear-gradient(180deg,#2a2440 0%,#17122a 55%,#100c1e 100%);color:#deccf8;font-family:var(--dot);font-size:.95rem;line-height:1.05;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14),inset 0 -2px 0 rgba(0,0,0,.45),0 2px 6px rgba(0,0,0,.5);
  display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 2px;-webkit-tap-highlight-color:transparent;
  transition:transform .06s,filter .1s;user-select:none;-webkit-user-select:none;}
.mg-blocks .blocks-btn small{font-family:var(--mono);font-size:.5rem;color:rgba(187,174,221,.55);margin-top:2px;letter-spacing:.04em;}
.mg-blocks .blocks-btn.hold{border-color:rgba(0,232,200,.45);color:#bff8ee;}
.mg-blocks .blocks-btn.drop{border-color:rgba(232,184,48,.5);color:#ffe7a6;}
.mg-blocks .blocks-btn.on{transform:translateY(1px) scale(.96);filter:brightness(1.35);}
.mg-blocks .blocks-btn.dim{opacity:.4;}
.mg-blocks .blocks-scene{position:absolute;left:0;right:0;top:0;bottom:0;z-index:5;display:flex;flex-direction:column;justify-content:flex-end;
  background:linear-gradient(180deg,rgba(5,4,14,0) 30%,rgba(5,4,14,.82) 70%,rgba(5,4,14,.95));opacity:0;pointer-events:none;transition:opacity .35s;touch-action:none;}
.mg-blocks .blocks-scene.show{opacity:1;pointer-events:auto;}
.mg-blocks .blocks-por{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);width:min(64%,250px);height:min(48%,330px);pointer-events:none;
  transition:opacity .25s,transform .35s;}
.mg-blocks .blocks-por img{width:100%;height:100%;object-fit:contain;object-position:bottom;filter:drop-shadow(0 0 18px rgba(138,82,212,.45));}
.mg-blocks .blocks-por.dim{opacity:.35;transform:translateX(-50%) scale(.96);filter:grayscale(.4);}
.mg-blocks .blocks-boss{position:absolute;right:14px;bottom:150px;width:78px;height:96px;pointer-events:none;transition:opacity .25s,transform .25s;}
.mg-blocks .blocks-boss.dim{opacity:.3;transform:scale(.94);}
.mg-blocks .blocks-box{position:relative;margin:0 10px 12px;min-height:112px;padding:22px 14px 14px;border-radius:8px;box-sizing:border-box;
  background:linear-gradient(180deg,rgba(18,12,36,.97),rgba(8,6,20,.98));border:1px solid rgba(138,82,212,.7);
  box-shadow:0 0 22px rgba(138,82,212,.25),inset 0 1px 0 rgba(255,255,255,.08);}
.mg-blocks .blocks-box::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;border-radius:8px 8px 0 0;
  background:repeating-linear-gradient(135deg,#e8b830 0 8px,#16101e 8px 16px);opacity:.85;}
.mg-blocks .blocks-name{position:absolute;left:12px;top:-12px;padding:2px 10px;border-radius:4px;font-family:var(--dot);font-size:.72rem;
  color:#0a0714;background:#00e8c8;letter-spacing:.06em;}
.mg-blocks .blocks-name.boss{background:#e8b830;}
.mg-blocks .blocks-name.sys{background:#8a52d4;color:#f4ecff;}
.mg-blocks .blocks-line{font-family:var(--dot);font-size:.86rem;line-height:1.75;color:#deccf8;min-height:3.4em;white-space:pre-wrap;}
.mg-blocks .blocks-next{position:absolute;right:12px;bottom:6px;color:#00e8c8;font-size:.7rem;animation:blocks-bob 1s ease-in-out infinite;}
.mg-blocks .blocks-skip{position:absolute;right:10px;top:10px;padding:4px 10px;border-radius:12px;border:1px solid rgba(187,174,221,.35);
  background:rgba(10,7,22,.85);color:#bbaedd;font-family:var(--dot);font-size:.66rem;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.mg-blocks .blocks-grade{position:absolute;right:16px;top:16%;width:96px;height:96px;border-radius:50%;display:none;align-items:center;justify-content:center;
  flex-direction:column;font-family:var(--mono);border:4px double currentColor;transform:rotate(-14deg) scale(2.4);opacity:0;
  transition:transform .32s cubic-bezier(.2,1.6,.5,1),opacity .2s;background:rgba(5,4,14,.75);box-shadow:0 0 26px currentColor;}
.mg-blocks .blocks-grade b{font-size:3rem;line-height:.9;font-weight:normal;}
.mg-blocks .blocks-grade small{font-family:var(--dot);font-size:.56rem;margin-top:2px;}
.mg-blocks .blocks-grade.on{display:flex;}
.mg-blocks .blocks-grade.stamp{transform:rotate(-14deg) scale(1);opacity:1;}
.mg-blocks .blocks-sum{position:absolute;left:14px;top:14%;font-family:var(--dot);font-size:.78rem;line-height:1.9;color:#bbaedd;display:none;
  padding:10px 14px;background:rgba(10,7,22,.86);border:1px solid rgba(0,232,200,.35);border-radius:6px;}
.mg-blocks .blocks-sum.on{display:block;}
.mg-blocks .blocks-sum span{color:#00e8c8;font-family:var(--mono);}
.mg-blocks .blocks-sum em{font-style:normal;color:#e8b830;}
@keyframes blocks-bob{0%,100%{transform:translateY(0);}50%{transform:translateY(3px);}}
`);

registerMinigame({
  id:'blocks', icon:'🧱', name:'部品積み込み', genre:'落ち物パズル', bgm:'factory',
  desc:'落ちてくる部品や木箱をパレットに積み込む。横一列そろえばフォークリフトが「出荷！」。90秒でどれだけ出荷できるか。',
  effect:'収入↑ 仕事評価↑ 精神↑ ／ 疲労+6 約45分',
  help:'左右タップ/←→移動・ピースタップ/↑Xで回転・下に払う/Spaceで落下・C保留',
  start(body,mg){
    // ── 定数 ──
    const COLS=10, ROWS=22, HID=2, TIME=90, LOCK_DELAY=.5, MAX_RESETS=15, CLEAR_T=.34;
    const DAS=.16, ARR=.045;
    const FONT='"DotGothic16", monospace', MONO='"Share Tech Mono", monospace';
    const C={pu:'#8a52d4',cy:'#00e8c8',rd:'#e83055',gd:'#e8b830',gn:'#44ee88',tx:'#bbaedd',txd:'#5e5078',txb:'#deccf8'};
    const NAMES=['','I','O','T','S','Z','J','L'];
    // 部品ごとの色（明・暗）と呼び名
    const COL={1:['#3fd8ea','#0b5f78'],2:['#e4ad4c','#6e4212'],3:['#ad74f4','#3f1a7a'],4:['#52e290','#125e36'],
      5:['#f04c66','#6e1024'],6:['#5c8af6','#18297a'],7:['#f68e3a','#7a330a'],8:['#7c768a','#26222f'],9:['#8e9aa8','#2e3440']};
    const PART={1:'鋼管',2:'木箱',3:'ギアボックス',4:'バッテリー',5:'危険物',6:'モーター',7:'精密機器'};
    // 速度フェーズ（便）
    const SPEED=[
      {t:0, name:'通常便',sub:'まずは丁寧に積もう',base:1,col:'#00e8c8'},
      {t:30,name:'急ぎ便',sub:'トラックが待っとる！',base:4,col:'#e8b830'},
      {t:60,name:'最終便',sub:'ラスト30秒、全部出せ！',base:7,col:'#e83055'},
    ];
    const BASE=[
      null,
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[1,1],[1,1]],
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,1],[1,1,0],[0,0,0]],
      [[1,1,0],[0,1,1],[0,0,0]],
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,0,1],[1,1,1],[0,0,0]],
    ];
    // 回転ごとのセル座標を前計算
    const SH=[null];
    for(let t=1;t<=7;t++){
      let m=BASE[t];const rots=[];
      for(let r=0;r<4;r++){
        const cells=[];m.forEach((row,y)=>row.forEach((v,x)=>{if(v)cells.push([x,y]);}));
        rots.push(cells);
        const n=m.length;m=m.map((row,y)=>row.map((_,x)=>m[n-1-x][y]));
      }
      SH.push(rots);
    }
    // 壁蹴り（SRS準拠。yは上向き→下向きに変換して使う）
    const K_JLSTZ={'0>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'1>0':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
      '1>2':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'2>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
      '2>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'3>2':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
      '3>0':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'0>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]]};
    const K_I={'0>1':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'1>0':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
      '1>2':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],'2>1':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
      '2>3':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'3>2':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
      '3>0':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'0>3':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]};

    const rnd=(a,b)=>a+Math.random()*(b-a);
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const bd=gs.blocksData=Object.assign({best:0,bestLines:0,plays:0,bestGrade:'',clears:0},gs.blocksData||{});
    // 2回目以降は日によって「重量物の日」：下から重い部品がせり上がってくる
    const mode=bd.plays>=1&&((gs.day||0)+bd.plays)%2===0?'heavy':'normal';

    // ── 効果音（Web Audioで合成。無ければAU.seで代用。SE音量0なら無音） ──
    let nbuf=null;
    function sfx(name,arg){
      try{
        if(typeof AUDIO_SET!=='undefined'&&AUDIO_SET.se<=0)return;
        if(!AU.ctx&&AU.init)AU.init();
        const ac=AU.ctx;
        if(!ac){return;}
        if(ac.state==='suspended')ac.resume().catch(()=>{});
        const vol=(typeof AUDIO_SET!=='undefined'?AUDIO_SET.se:1)*.9,t0=ac.currentTime;
        const tone=(f,type,g,d,at,f2)=>{at=at||0;const o=ac.createOscillator(),gn=ac.createGain();o.type=type;o.frequency.setValueAtTime(f,t0+at);
          if(f2)o.frequency.exponentialRampToValueAtTime(f2,t0+at+d);gn.gain.setValueAtTime(.0001,t0+at);gn.gain.linearRampToValueAtTime(g*vol,t0+at+.006);
          gn.gain.exponentialRampToValueAtTime(.0001,t0+at+d);o.connect(gn);gn.connect(ac.destination);o.start(t0+at);o.stop(t0+at+d+.03);};
        const noise=(g,d,at,freq,q)=>{at=at||0;
          if(!nbuf){nbuf=ac.createBuffer(1,ac.sampleRate*.5,ac.sampleRate);const ch=nbuf.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;}
          const s=ac.createBufferSource(),f=ac.createBiquadFilter(),gn=ac.createGain();s.buffer=nbuf;f.type='bandpass';f.frequency.value=freq||800;f.Q.value=q||.8;
          gn.gain.setValueAtTime(g*vol,t0+at);gn.gain.exponentialRampToValueAtTime(.0001,t0+at+d);s.connect(f);f.connect(gn);gn.connect(ac.destination);s.start(t0+at);s.stop(t0+at+d+.02);};
        switch(name){
          case 'move':tone(300,'square',.018,.03);noise(.02,.025,0,2400,2);break;
          case 'rotate':tone(480,'triangle',.05,.06,0,760);noise(.025,.03,0,3200,3);break;
          case 'lock':tone(150,'square',.05,.08,0,70);noise(.06,.07,0,500);break;
          case 'hard':noise(.2,.2,0,260,.7);tone(110,'sine',.22,.22,0,38);noise(.06,.08,.02,2600,3);break;
          case 'hold':tone(392,'sine',.06,.07);tone(587,'sine',.06,.09,.06);break;
          case 'clear':{const notes=[523,659,784,1047,1319];const n=arg||1;
            for(let i=0;i<=n;i++)tone(notes[i],'triangle',.08,.16,i*.055);
            noise(.08,.25,0,1800,1.4);if(n>=4){tone(1568,'sine',.06,.5,.28);tone(2093,'sine',.05,.6,.36);}break;}
          case 'beep':tone(1040,'square',.035,.09);tone(1040,'square',.035,.09,.22);break;
          case 'horn':tone(220,'sawtooth',.06,.55,0,215);tone(277,'sawtooth',.045,.55,0,272);break;
          case 'crash':noise(.28,.9,0,300,.5);noise(.18,.6,.12,900,.8);tone(90,'sawtooth',.12,.8,0,30);break;
          case 'heavy':tone(70,'square',.12,.25,0,45);noise(.12,.25,0,180);break;
          case 'start':[523,784,1047].forEach((f,i)=>tone(f,'square',.04,.12,i*.08));break;
          case 'blip':tone(760+Math.random()*80,'square',.012,.025);break;
          case 'warn':tone(660,'square',.04,.12);tone(520,'square',.04,.14,.14);break;
          case 'whistle':tone(1800,'sine',.06,.18,0,2200);tone(1800,'sine',.06,.4,.22,2100);break;
          case 'stamp':noise(.2,.15,0,400);tone(160,'square',.08,.12,0,80);break;
          case 'fanfare':[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,'triangle',.07,i===5?.5:.13,i*.11));break;
          case 'sad':[392,370,330,262].forEach((f,i)=>tone(f,'triangle',.05,.3,i*.2));break;
          default:tone(420,'sine',.05,.05);
        }
      }catch(_){}
    }
    // AU.se（共通SE）も操作ごとに鳴らす。合成SEと重ねる
    const se=t=>{try{AU.se(t);}catch(_){}};

    // ── DOM ──
    const cv=document.createElement('canvas');cv.className='blocks-cv';body.appendChild(cv);
    const cx=cv.getContext('2d');
    const bar=document.createElement('div');bar.className='blocks-bar';
    bar.innerHTML='<button class="blocks-btn hold" data-a="hold">保留<small>HOLD [C]</small></button>'+
      '<button class="blocks-btn" data-a="ccw">↺<small>[Z]</small></button>'+
      '<button class="blocks-btn" data-a="cw">↻<small>[↑/X]</small></button>'+
      '<button class="blocks-btn drop" data-a="drop">⤓ 落下<small>[SPACE]</small></button>';
    body.appendChild(bar);
    const holdBtn=bar.querySelector('[data-a="hold"]');
    // 会話シーン（導入・エンディング）
    const scene=document.createElement('div');scene.className='blocks-scene';
    scene.innerHTML='<div class="blocks-por"><img alt=""></div>'+
      '<div class="blocks-boss"><svg viewBox="0 0 78 96" width="78" height="96">'+
      '<defs><linearGradient id="blocksHelm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd65a"/><stop offset="1" stop-color="#b8820e"/></linearGradient></defs>'+
      '<path d="M8 96 Q10 66 39 62 Q68 66 70 96Z" fill="#2c3550"/><path d="M30 62 L39 76 L48 62Z" fill="#cfd6e6"/>'+
      '<rect x="27" y="34" width="24" height="26" rx="10" fill="#d8b392"/><rect x="29" y="50" width="20" height="3" fill="#7a5a44" opacity=".7"/>'+
      '<circle cx="34" cy="44" r="1.8" fill="#2a1c14"/><circle cx="45" cy="44" r="1.8" fill="#2a1c14"/>'+
      '<path d="M18 36 Q20 12 39 12 Q58 12 60 36Z" fill="url(#blocksHelm)"/><rect x="14" y="34" width="50" height="5" rx="2" fill="#d9a01e"/>'+
      '<rect x="33" y="18" width="12" height="9" rx="2" fill="#16101e"/><text x="39" y="25.5" font-size="7" text-anchor="middle" fill="#ffd65a" font-family="sans-serif">班</text>'+
      '<rect x="12" y="76" width="18" height="6" fill="#00e8c8" opacity=".85"/></svg></div>'+
      '<div class="blocks-grade"><b>A</b><small>評価</small></div><div class="blocks-sum"></div>'+
      '<div class="blocks-box"><div class="blocks-name"></div><div class="blocks-line"></div><div class="blocks-next">▼</div></div>'+
      '<button class="blocks-skip">スキップ ▶▶</button>';
    body.appendChild(scene);
    const scPor=scene.querySelector('.blocks-por'),scImg=scPor.querySelector('img'),scBoss=scene.querySelector('.blocks-boss');
    const scName=scene.querySelector('.blocks-name'),scLine=scene.querySelector('.blocks-line'),scSkip=scene.querySelector('.blocks-skip');
    const scGrade=scene.querySelector('.blocks-grade'),scSum=scene.querySelector('.blocks-sum'),scBox=scene.querySelector('.blocks-box');

    // ── レイアウト ──
    let W=0,H=0,CH=0,dpr=1,cs=20,wx=0,wy=0,ww=0,wh=0,side=60,laneY=0,laneH=40,palY=0,palH=10,BAR=60;
    let lyBg=null,lyVig=null;const spr={};
    const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*dpr));c.height=Math.max(1,Math.ceil(h*dpr));const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return [c,g];};
    function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}

    // 部品1マスの絵（金属のベベル・ボルト・ステンシル）
    function drawCell(g,s,t){
      const [lt,dk]=COL[t];const r=s*.13;
      let gr=g.createLinearGradient(0,0,s*.6,s);gr.addColorStop(0,lt);gr.addColorStop(1,dk);
      g.fillStyle=gr;rr(g,.5,.5,s-1,s-1,r);g.fill();
      // ベベル
      g.lineWidth=Math.max(1,s*.06);
      g.strokeStyle='rgba(255,255,255,.5)';g.beginPath();g.moveTo(s*.12,s-s*.1);g.lineTo(s*.08,s*.08);g.lineTo(s-s*.1,s*.08);g.stroke();
      g.strokeStyle='rgba(0,0,0,.5)';g.beginPath();g.moveTo(s-s*.07,s*.14);g.lineTo(s-s*.07,s-s*.07);g.lineTo(s*.14,s-s*.07);g.stroke();
      g.strokeStyle='rgba(0,0,0,.65)';g.lineWidth=1;rr(g,.5,.5,s-1,s-1,r);g.stroke();
      // 内側パネル
      const i=s*.2,iw=s-i*2;
      g.save();rr(g,i,i,iw,iw,s*.06);g.clip();
      g.fillStyle='rgba(0,0,0,.2)';g.fillRect(i,i,iw,iw);
      const cxm=s/2,cym=s/2;
      if(t===1){ // 鋼管：円筒の光沢
        gr=g.createLinearGradient(0,i,0,i+iw);gr.addColorStop(0,'rgba(0,0,0,.3)');gr.addColorStop(.35,'rgba(230,255,255,.6)');gr.addColorStop(.5,'rgba(255,255,255,.25)');gr.addColorStop(1,'rgba(0,0,0,.4)');
        g.fillStyle=gr;g.fillRect(i,i+iw*.12,iw,iw*.76);
        g.fillStyle='rgba(0,30,40,.55)';g.fillRect(i+iw*.12,i,iw*.08,iw);g.fillRect(i+iw*.8,i,iw*.08,iw);
      }else if(t===2){ // 木箱：板目と筋交い
        g.fillStyle='rgba(120,70,20,.35)';g.fillRect(i,i,iw,iw);
        g.strokeStyle='rgba(60,30,6,.6)';g.lineWidth=Math.max(1,s*.04);
        for(let k=1;k<3;k++){g.beginPath();g.moveTo(i,i+iw*k/3);g.lineTo(i+iw,i+iw*k/3);g.stroke();}
        g.lineWidth=Math.max(1.2,s*.08);g.strokeStyle='rgba(70,36,8,.75)';g.beginPath();g.moveTo(i,i+iw);g.lineTo(i+iw,i);g.stroke();
        g.strokeStyle='rgba(255,220,150,.25)';g.lineWidth=1;g.beginPath();g.moveTo(i,i+iw-1.5);g.lineTo(i+iw-1.5,i);g.stroke();
      }else if(t===3){ // ギア
        const R=iw*.42,ri=iw*.28;g.fillStyle='rgba(225,205,255,.55)';g.beginPath();
        for(let k=0;k<16;k++){const a=k/16*Math.PI*2,rad=k%2?ri:R;g.lineTo(cxm+Math.cos(a)*rad,cym+Math.sin(a)*rad);}
        g.closePath();g.fill();g.fillStyle='rgba(40,14,80,.8)';g.beginPath();g.arc(cxm,cym,iw*.12,0,7);g.fill();
      }else if(t===4){ // バッテリー：稲妻
        g.fillStyle='rgba(225,255,235,.75)';g.beginPath();
        g.moveTo(cxm+iw*.08,i+iw*.06);g.lineTo(cxm-iw*.28,cym+iw*.06);g.lineTo(cxm-iw*.02,cym+iw*.06);
        g.lineTo(cxm-iw*.1,i+iw*.94);g.lineTo(cxm+iw*.3,cym-iw*.08);g.lineTo(cxm+iw*.03,cym-iw*.08);g.closePath();g.fill();
      }else if(t===5){ // 危険物：斜線
        g.fillStyle='rgba(30,4,10,.55)';
        for(let k=-2;k<5;k++){g.beginPath();const o=i+k*iw*.34;g.moveTo(o,i+iw);g.lineTo(o+iw*.17,i+iw);g.lineTo(o+iw*.17+iw,i);g.lineTo(o+iw,i);g.closePath();g.fill();}
        g.fillStyle='rgba(255,220,120,.85)';g.font=`bold ${Math.round(iw*.7)}px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.fillText('!',cxm,cym+1);
      }else if(t===6){ // モーター：コイル
        g.strokeStyle='rgba(200,220,255,.5)';g.lineWidth=Math.max(1,s*.05);
        for(let k=0;k<4;k++){const xx=i+iw*(.14+k*.24);g.beginPath();g.moveTo(xx,i);g.lineTo(xx,i+iw);g.stroke();}
        g.fillStyle='rgba(16,24,70,.9)';g.beginPath();g.arc(cxm,cym,iw*.24,0,7);g.fill();
        g.fillStyle='rgba(210,225,255,.85)';g.beginPath();g.arc(cxm,cym,iw*.1,0,7);g.fill();
      }else if(t===7){ // 精密機器：天地無用の矢印
        g.fillStyle='rgba(60,20,2,.7)';
        for(const ox of [-.2,.2]){const ax=cxm+ox*iw;g.beginPath();g.moveTo(ax,i+iw*.1);g.lineTo(ax+iw*.17,i+iw*.42);g.lineTo(ax+iw*.06,i+iw*.42);g.lineTo(ax+iw*.06,i+iw*.86);g.lineTo(ax-iw*.06,i+iw*.86);g.lineTo(ax-iw*.06,i+iw*.42);g.lineTo(ax-iw*.17,i+iw*.42);g.closePath();g.fill();}
      }else if(t===9){ // 重量物：縞鋼板＋ステンシル
        g.strokeStyle='rgba(230,240,255,.22)';g.lineWidth=Math.max(1,s*.05);
        for(let k=0;k<4;k++)for(let j=0;j<4;j++){const ox=i+iw*(.12+k*.25),oy=i+iw*(.12+j*.25);g.beginPath();g.moveTo(ox,oy+(k+j)%2*iw*.12);g.lineTo(ox+iw*.12,oy+((k+j+1)%2)*iw*.12);g.stroke();}
        g.fillStyle='rgba(232,184,48,.85)';g.font=`${Math.max(5,Math.round(iw*.36))}px ${MONO}`;g.textAlign='center';g.textBaseline='middle';g.fillText('t',cxm,cym+.5);
      }else{ // 荷崩れ（灰）
        g.strokeStyle='rgba(20,16,26,.7)';g.lineWidth=Math.max(1,s*.07);g.beginPath();g.moveTo(i,i);g.lineTo(i+iw,i+iw);g.moveTo(i+iw,i);g.lineTo(i,i+iw);g.stroke();
      }
      g.restore();
      // 上面の光沢
      gr=g.createLinearGradient(0,0,0,s*.5);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr;rr(g,1.5,1.5,s-3,s*.45,r*.8);g.fill();
      // ボルト
      const br=Math.max(.9,s*.055);
      for(const [bx,by] of [[s*.12,s*.12],[s*.88,s*.12],[s*.12,s*.88],[s*.88,s*.88]]){
        g.fillStyle='rgba(0,0,0,.55)';g.beginPath();g.arc(bx+.4,by+.6,br,0,7);g.fill();
        g.fillStyle='#d8d2e6';g.beginPath();g.arc(bx,by,br,0,7);g.fill();
        g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(bx-br*.3,by-br*.3,br*.4,0,7);g.fill();
      }
    }
    function buildSprites(){
      for(let t=1;t<=9;t++){const [c,g]=mkCanvas(cs,cs);drawCell(g,cs,t);spr[t]=c;}
      // 白く光るマス（消去フラッシュ）
      const [c,g]=mkCanvas(cs,cs);g.fillStyle='#fff';rr(g,.5,.5,cs-1,cs-1,cs*.13);g.fill();spr.w=c;
    }
    function buildBg(){
      let g;[lyBg,g]=mkCanvas(W,CH);
      let gr=g.createLinearGradient(0,0,0,CH);
      gr.addColorStop(0,'#07051a');gr.addColorStop(.5,'#0d0a22');gr.addColorStop(1,'#090614');
      g.fillStyle=gr;g.fillRect(0,0,W,CH);
      // 波板の壁
      for(let x=0;x<W;x+=7){g.fillStyle=x%14?'rgba(140,120,200,.035)':'rgba(0,0,0,.18)';g.fillRect(x,0,3,CH);}
      // 高窓（雨の夜）
      const winY=CH*.07,winH=CH*.12;
      for(let x=6;x<W-30;x+=Math.max(52,W*.16)){
        const ww2=Math.max(36,W*.1);
        gr=g.createLinearGradient(0,winY,0,winY+winH);gr.addColorStop(0,'#141238');gr.addColorStop(1,'#231545');
        g.fillStyle=gr;g.fillRect(x,winY,ww2,winH);
        g.strokeStyle='rgba(120,100,180,.35)';g.lineWidth=2;g.strokeRect(x,winY,ww2,winH);
        g.lineWidth=1;g.beginPath();g.moveTo(x+ww2/2,winY);g.lineTo(x+ww2/2,winY+winH);g.moveTo(x,winY+winH/2);g.lineTo(x+ww2,winY+winH/2);g.stroke();
        g.fillStyle='rgba(0,232,200,.07)';g.fillRect(x+2,winY+2,ww2*.35,winH*.4);
      }
      // 天井の梁（トラス）
      g.strokeStyle='rgba(110,96,150,.28)';g.lineWidth=2;
      g.beginPath();g.moveTo(0,4);g.lineTo(W,4);g.moveTo(0,18);g.lineTo(W,18);g.stroke();
      g.lineWidth=1;g.beginPath();for(let x=0;x<W;x+=18){g.moveTo(x,4);g.lineTo(x+9,18);g.lineTo(x+18,4);}g.stroke();
      // 両脇の棚と段ボール
      const shelf=(x0,w0)=>{
        const top=CH*.48,bot=palY+palH;
        g.fillStyle='rgba(40,30,70,.55)';g.fillRect(x0,top,3,bot-top);g.fillRect(x0+w0-3,top,3,bot-top);
        for(let y=top+8;y<bot;y+=Math.max(34,(bot-top)/4)){
          g.fillStyle='rgba(232,140,48,.22)';g.fillRect(x0,y,w0,3);
          let bx=x0+4;
          while(bx<x0+w0-12){const bw=rnd(10,Math.min(26,w0*.4)),bh=rnd(10,24);
            g.fillStyle=`rgba(${(rnd(70,110))|0},${(rnd(50,72))|0},${(rnd(40,60))|0},.5)`;g.fillRect(bx,y-bh,bw,bh);
            g.fillStyle='rgba(0,0,0,.25)';g.fillRect(bx,y-bh+bh*.45,bw,1.5);bx+=bw+rnd(2,6);}
        }
      };
      shelf(4,wx-14);shelf(wx+ww+10,W-(wx+ww+10)-4);
      // 床
      const fy=palY+palH;
      gr=g.createLinearGradient(0,fy,0,CH);gr.addColorStop(0,'#12101e');gr.addColorStop(1,'#07060c');
      g.fillStyle=gr;g.fillRect(0,fy,W,CH-fy);
      // 床の黄色い通路線
      g.fillStyle='rgba(232,184,48,.35)';g.fillRect(0,laneY+laneH*.88,W,2);
      g.fillStyle='rgba(232,184,48,.18)';for(let x=0;x<W;x+=26)g.fillRect(x,laneY+laneH*.12,14,2);
      // 濡れた床の反射
      [[W*.2,'rgba(232,184,48,.07)'],[W*.5,'rgba(0,232,200,.05)'],[W*.8,'rgba(232,48,85,.05)']].forEach(([x,c])=>{
        const rg=g.createRadialGradient(x,CH,0,x,CH,W*.3);rg.addColorStop(0,c);rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,fy,W,CH-fy);});
      [lyVig,g]=mkCanvas(W,CH);
      const vg=g.createRadialGradient(W/2,CH*.5,Math.min(W,CH)*.35,W/2,CH*.5,Math.max(W,CH)*.78);
      vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(2,1,8,.7)');g.fillStyle=vg;g.fillRect(0,0,W,CH);
    }
    function resize(){
      const w=Math.max(260,body.clientWidth),h=Math.max(380,body.clientHeight);
      const nd=Math.min(2.5,window.devicePixelRatio||1);
      if(w===W&&h===H&&nd===dpr)return;
      W=w;H=h;dpr=nd;
      BAR=clamp(Math.round(H*.085),50,62);bar.style.height=BAR+'px';
      CH=H-BAR;
      laneH=clamp(Math.round(CH*.08),34,50);
      const topPad=26;
      cs=Math.floor(Math.min((W-14)/15.4,(CH-laneH-topPad-12-24)/20));
      cs=Math.max(12,cs);
      ww=cs*COLS;wh=cs*20;wx=Math.round((W-ww)/2);wy=topPad;
      palH=Math.max(8,Math.round(cs*.42));palY=wy+wh+2;
      laneY=CH-laneH;
      side=wx-8;
      cv.width=Math.round(W*dpr);cv.height=Math.round(CH*dpr);cv.style.width=W+'px';cv.style.height=CH+'px';
      buildSprites();buildBg();
    }

    // ── 状態 ──
    let board=[];for(let y=0;y<ROWS;y++)board.push(new Array(COLS).fill(0));
    let bag=[],queue=[],cur=null,hold=0,holdUsed=false;
    let phase='title',t=0,clock=0,acc=0,lockT=0,resets=0,lowY=0,lastRot=false,lastKick=false;
    let lines=0,score=0,level=1,combo=-1,b2b=false,maxCombo=0,quads=0,tspins=0,pieces=0;
    let clearRows=[],clearT=0,overT=0,overReason='',topRows=0;
    let shake=0,flash=0,danger=false,dangerSeen=false,introT=0;
    let spIdx=0,banner=null,wipe=null,fade=1,hitstop=0,buf=null,garbT=0,firstClear=false,lastInput='touch',endReason='',grade='';
    const tut={step:0,t:0,done:[false,false,false,false]};
    const parts=[],pops=[],lifts=[],trails=[];
    let lastScoreHtml='',lastTimer='';
    const belt=[];for(let i=0;i<8;i++)belt.push({x:i*70-30,v:22,t:1+(i*3)%7,s:rnd(.7,1)});
    const rain=[];for(let i=0;i<40;i++)rain.push({x:Math.random(),y:Math.random(),s:rnd(.5,.9)});

    function refillBag(){const b=[1,2,3,4,5,6,7];for(let i=b.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[b[i],b[j]]=[b[j],b[i]];}bag.push(...b);}
    function nextType(){while(queue.length<6){if(!bag.length)refillBag();queue.push(bag.shift());}return queue.shift();}
    function fits(tp,r,x,y){
      for(const [cx0,cy0] of SH[tp][r]){const X=x+cx0,Y=y+cy0;
        if(X<0||X>=COLS||Y>=ROWS)return false;if(Y>=0&&board[Y][X])return false;}
      return true;
    }
    function spawn(tp){
      cur={t:tp,r:0,x:tp===2?4:3,y:0};
      acc=0;lockT=0;resets=0;lastRot=false;
      if(!fits(cur.t,0,cur.x,cur.y)){gameOver('topout');return false;}
      if(fits(cur.t,0,cur.x,cur.y+1))cur.y++;
      lowY=cur.y;
      return true;
    }
    function onGround(){return !fits(cur.t,cur.r,cur.x,cur.y+1);}
    function touchReset(){if(onGround()&&resets<MAX_RESETS){lockT=0;resets++;}}
    // 消去演出中の入力は先行入力として覚えておき、次のピース出現時に反映
    function buffer(a){if(phase==='clear'){buf={a,t:clock};return true;}return false;}
    function move(dx,quiet){
      if(phase!=='play'||!cur)return false;
      if(fits(cur.t,cur.r,cur.x+dx,cur.y)){cur.x+=dx;lastRot=false;touchReset();if(!quiet)sfx('move');tutDone(0);return true;}
      return false;
    }
    function rotate(dir){
      if(buffer(dir>0?'cw':'ccw'))return false;
      if(phase!=='play'||!cur)return false;
      tutDone(1);
      if(cur.t===2){touchReset();sfx('rotate');return true;}
      const from=cur.r,to=(cur.r+dir+4)%4,tbl=(cur.t===1?K_I:K_JLSTZ)[from+'>'+to];
      for(let k=0;k<tbl.length;k++){const [kx,ky]=tbl[k];
        if(fits(cur.t,to,cur.x+kx,cur.y-ky)){cur.x+=kx;cur.y-=ky;cur.r=to;lastRot=true;lastKick=k>0;touchReset();sfx('rotate');
          if(cur.y>lowY){lowY=cur.y;resets=0;lockT=0;}return true;}
      }
      return false;
    }
    function softStep(){
      if(phase!=='play'||!cur)return false;
      if(fits(cur.t,cur.r,cur.x,cur.y+1)){cur.y++;lastRot=false;score+=1;if(cur.y>lowY){lowY=cur.y;resets=0;lockT=0;}return true;}
      return false;
    }
    function ghostY(){let y=cur.y;while(fits(cur.t,cur.r,cur.x,y+1))y++;return y;}
    function hardDrop(){
      if(phase!=='play'||!cur)return;
      const gy=ghostY(),d=gy-cur.y;
      if(d>0){lastRot=false;
        // 落下の残像
        const cells=SH[cur.t][cur.r];
        let minx=9,maxx=0;cells.forEach(([a])=>{minx=Math.min(minx,a);maxx=Math.max(maxx,a);});
        trails.push({x:cur.x+minx,w:maxx-minx+1,y0:cur.y,y1:gy,t:0,col:COL[cur.t][0]});
      }
      cur.y=gy;score+=d*2;shake=Math.max(shake,3+Math.min(5,d*.3));hitstop=Math.max(hitstop,.035);
      sfx('hard');tutDone(2);
      lock(true);
    }
    function doHold(){
      if(buffer('hold'))return;
      if(phase!=='play'||!cur)return;
      if(holdUsed){sfx('warn');return;}
      const tp=cur.t;
      holdUsed=true;
      if(hold){const h=hold;hold=tp;spawn(h);}else{hold=tp;spawn(nextType());}
      sfx('hold');se('btn');tutDone(3);
    }
    function cellPx(X,Y){return [wx+X*cs,wy+(Y-HID)*cs];}
    function lock(hard){
      const tp=cur.t;let allHidden=true;
      for(const [a,b] of SH[tp][cur.r]){const X=cur.x+a,Y=cur.y+b;if(Y>=0)board[Y][X]=tp;if(Y>=HID)allHidden=false;}
      // 着地のほこり
      for(const [a,b] of SH[tp][cur.r]){const Y=cur.y+b;if(Y+1>=ROWS||board[Y+1]&&board[Y+1][cur.x+a]&&!SH[tp][cur.r].some(([c,d])=>c===a&&d===b+1)){
        const [px,py]=cellPx(cur.x+a,Y);for(let k=0;k<(hard?4:2);k++)spark(px+rnd(0,cs),py+cs,rnd(-40,40),rnd(-60,-10),.45,'rgba(200,190,220,.7)',2,false);}}
      pieces++;
      // Tスピン判定（3コーナー）
      let tspin=false;
      if(tp===3&&lastRot){let n=0;for(const [a,b] of [[0,0],[2,0],[0,2],[2,2]]){const X=cur.x+a,Y=cur.y+b;if(X<0||X>=COLS||Y>=ROWS||(Y>=0&&board[Y][X]))n++;}tspin=n>=3;}
      cur=null;holdUsed=false;
      if(allHidden){gameOver('topout');return;}
      const full=[];for(let y=0;y<ROWS;y++)if(board[y].every(v=>v))full.push(y);
      const n=full.length;
      if(n){
        combo++;maxCombo=Math.max(maxCombo,combo);
        const hardClear=n===4||tspin;
        const b2bNow=hardClear&&b2b;
        let pts=(tspin?[0,800,1200,1600,1600][n]:[0,100,300,500,800][n])*level;
        if(b2bNow)pts=Math.floor(pts*1.5);
        pts+=50*Math.max(0,combo)*level;
        b2b=hardClear;
        if(n===4)quads++;if(tspin)tspins++;
        lines+=n;
        // 全消し判定（消える行以外が空か）
        const perfect=board.every((row,y)=>full.includes(y)||row.every(v=>!v));
        if(perfect)pts+=3000*level;
        score+=pts;
        clearRows=full;clearT=0;phase='clear';
        flash=n===4?.7:.35+n*.08;shake=Math.max(shake,n*2.2);
        const cols=[];full.forEach(y=>board[y].forEach(v=>cols.push(v)));
        addLift(n,cols);
        const mid=wy+((full[0]+full[n-1])/2-HID+.5)*cs;
        const label=(tspin?'Tねじ込み ':'')+(n===4?'一括出荷！！':n===3?'3列出荷！':n===2?'2列出荷！':'出荷！');
        pop(label,mid,n===4||tspin?C.gd:C.cy,n>=3||tspin);
        if(b2bNow)pop('B2B 連続大口出荷',mid+cs*1.3,'#ff9ad0',false,.15);
        if(combo>=1)pop(`${combo} コンボ`,mid-cs*1.4,C.gn,false,.08);
        if(perfect)pop('全出荷！ パレット空っぽ',wy+wh*.35,'#ffffff',true,.25);
        full.forEach(y=>{for(let X=0;X<COLS;X++){const [px,py]=cellPx(X,y);
          for(let k=0;k<2;k++)spark(px+cs/2,py+cs/2,rnd(60,260),rnd(-120,80),rnd(.4,.8),COL[board[y][X]][0],rnd(2,3.5),true);}});
        sfx('clear',tspin?Math.max(n,3):n);se(n===4||tspin?'rank':'repair');
        hitstop=.06+n*.025;firstClear=true;bd.clears++;
      }else{
        combo=-1;
        if(tspin){score+=400*level;tspins++;pop('Tねじ込み',wy+wh*.4,C.gd,false);}
        sfx('lock');se('tool');
        spawn(nextType());
      }
      level=calcLevel();
    }
    function calcLevel(){return Math.min(12,SPEED[spIdx].base+Math.floor(lines/10));}
    function gravity(){return Math.pow(.8-(level-1)*.007,level-1);} // 1段あたりの秒
    function finishClear(){
      const keep=board.filter((_,y)=>!clearRows.includes(y));
      while(keep.length<ROWS)keep.unshift(new Array(COLS).fill(0));
      board=keep;clearRows=[];phase='play';
      if(!spawn(nextType()))return;
      // 先行入力（回転・保留）
      if(buf&&clock-buf.t<.5){const a=buf.a;buf=null;if(a==='hold')doHold();else rotate(a==='cw'?1:-1);}
      buf=null;
    }
    // 重量物の日：下から重い部品の列がせり上がる
    function pushGarbage(){
      if(board[0].some(v=>v)||board[1].some(v=>v)){gameOver('topout');return;}
      const gap=(Math.random()*COLS)|0;
      board.shift();board.push(Array.from({length:COLS},(_,x)=>x===gap?0:9));
      if(cur&&!fits(cur.t,cur.r,cur.x,cur.y)){cur.y--;if(!fits(cur.t,cur.r,cur.x,cur.y)){gameOver('topout');return;}}
      if(cur)lowY=Math.min(lowY,cur.y);
      shake=Math.max(shake,4);sfx('heavy');se('machine');
      pop('重量物 搬入！',wy+wh*.78,'#9fb2c8',false);
    }
    function gameOver(reason){
      if(phase==='over')return;
      phase='over';overReason=reason;overT=0;topRows=0;cur=null;ptr=null;
      if(reason==='topout'){sfx('crash');se('warn');shake=10;flash=.3;}
      else{sfx('whistle');se('ach');}
    }

    // ── 演出 ──
    function spark(x,y,vx,vy,life,col,sz,add){
      if(parts.length>260)parts.shift();
      parts.push({x,y,vx,vy,life,max:life,col,sz,add});
    }
    function pop(text,y,col,big,delay){pops.push({text,y,col,big,t:-(delay||0)});if(pops.length>8)pops.shift();}
    function addLift(n,cols){
      const last=lifts[lifts.length-1];
      const delay=last?Math.max(0,.8-last.t):0;
      const stack=[];for(let k=0;k<Math.min(4,n);k++)stack.push(cols[(Math.random()*cols.length)|0]||2);
      lifts.push({n,stack,t:-delay,dur:2.6});
      if(lifts.length>4)lifts.shift();
    }

    // ── 会話シーン ──
    const FACE={normal:'assets/img/char_normal.webp',happy:'assets/img/char_happy.webp',win:'assets/img/char_win.webp',
      tired:'assets/img/char_tired.webp',fear:'assets/img/char_fear.webp'};
    let scLines=null,scIdx=0,scChars=0,scDone=null,scBlip=0,scGradeT=-1;
    function showScene(lines,done){
      scLines=lines;scIdx=0;scDone=done;scene.classList.add('show');setLine();
    }
    function setLine(){
      const L=scLines[scIdx];scChars=0;
      scName.textContent=L.who==='boss'?'班長・岩切':L.who==='sys'?'――':'だんのうら';
      scName.className='blocks-name'+(L.who==='boss'?' boss':L.who==='sys'?' sys':'');
      if(L.face){scImg.src=FACE[L.face];}
      scPor.classList.toggle('dim',L.who!=='dan');
      scBoss.classList.toggle('dim',L.who!=='boss');
      scLine.textContent='';
      if(L.fx)L.fx();
    }
    function advanceScene(){
      if(!scLines)return;
      const L=scLines[scIdx];
      if(scChars<L.text.length){scChars=L.text.length;scLine.textContent=L.text;return;}
      se('btn');
      scIdx++;
      if(scIdx>=scLines.length){finishScene();return;}
      setLine();
    }
    function finishScene(){
      if(!scLines)return;
      scLines=null;scene.classList.remove('show');
      const d=scDone;scDone=null;if(d)d();
    }
    scene.addEventListener('pointerdown',e=>{e.preventDefault();lastInput='touch';advanceScene();});
    scSkip.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();se('back');finishScene();});

    function introLines(){
      const L=[];
      if(bd.plays===0){
        L.push({who:'boss',face:'normal',text:'だんのうら、悪い。夜の便に積み残しが出てもうた。'});
        L.push({who:'boss',face:'normal',text:'トラックの出発まで90秒。パレットに部品を積んで、横一列そろったらフォークで出す。'});
        L.push({who:'dan',face:'tired',text:'……設備保全の仕事ちゃうけどな。ええよ、やります。'});
        L.push({who:'dan',face:'normal',text:'（残業代は、息子の上履き代や）'});
      }else if(bd.plays%2===1){
        L.push({who:'boss',face:'normal',text:'また積み残しや。……前回の手際、評判よかったで。'});
        L.push({who:'dan',face:'normal',text:'褒めても何も出ませんよ。出るのは部品だけです。'});
      }else{
        L.push({who:'boss',face:'normal',text:'今夜も頼むわ。最終便は待ってくれへんで。'});
        L.push({who:'dan',face:'tired',text:'（雨の音が、フォークの警告音に混ざって聞こえる）'});
      }
      if(mode==='heavy')L.push({who:'boss',face:'normal',text:'今日は重量物の日や。一回出荷したら、下から重い荷がどんどん上がってくるで。'});
      L.push({who:'sys',face:L[L.length-1].face,text:'【通常便 → 急ぎ便 → 最終便】30秒ごとに落下が速くなる。'});
      return L;
    }
    function calcGrade(L,reason){
      const order=['C','B','A','S'];
      let g=L>=20?3:L>=14?2:L>=8?1:0;
      if(reason==='topout')g=Math.max(0,g-1);
      return order[g];
    }
    function endingLines(reason,g){
      const L=[];
      if(reason==='topout'){
        L.push({who:'sys',face:'fear',text:'ガシャーン――！　パレットの上で、部品の山が崩れた。'});
        L.push({who:'boss',face:'fear',text:'怪我ないか！？　荷はええ、お前が無事ならそれでええ。'});
        L.push({who:'dan',face:'tired',text:lines>=8?`……${lines}列は出せた。でも焦ると崩れる。分かってたのにな。`:'……焦ると崩れる。仕事も、人生も一緒やな。'});
      }else if(g==='S'||g==='A'){
        L.push({who:'boss',face:'happy',text:`全便、間に合うた！　${lines}列やぞ。お前、保全より物流向いとるんちゃうか。`});
        L.push({who:'dan',face:'win',text:'……勘弁してください。でも、ちょっと気持ちよかったです。'});
        L.push({who:'dan',face:'happy',text:'（テールランプが雨に滲んで遠ざかる。今夜は、ちゃんと間に合った）'});
      }else if(g==='B'){
        L.push({who:'boss',face:'normal',text:`${lines}列か。まあまあやな、助かったわ。`});
        L.push({who:'dan',face:'normal',text:'（帰ったら、寝顔だけ見よう。起こさんように）'});
      }else{
        L.push({who:'boss',face:'tired',text:'残りは朝番に回すわ。気にすんな、本業ちゃうんやし。'});
        L.push({who:'dan',face:'tired',text:'……すんません。次は、もうちょっと積めるようにします。'});
      }
      return L;
    }
    function toEnding(){
      phase='ending';endReason=overReason;
      grade=calcGrade(lines,endReason);
      const order='CBAS';
      if(!bd.bestGrade||order.indexOf(grade)>order.indexOf(bd.bestGrade))bd.bestGrade=grade;
      const gc={S:'#e8b830',A:'#00e8c8',B:'#bbaedd',C:'#8a7aa8'}[grade];
      scGrade.style.color=gc;scGrade.querySelector('b').textContent=grade;
      scGrade.querySelector('small').textContent=endReason==='topout'?'荷崩れ':'出荷評価';
      scGrade.classList.add('on');scGrade.classList.remove('stamp');scGradeT=.5;
      scSum.innerHTML=`出荷 <span>${lines}</span> 列<br>スコア <span>${score}</span>${score>bd.best?' <em>NEW!</em>':''}<br>最大コンボ <span>${Math.max(0,maxCombo)}</span><br>`+
        `<small style="color:var(--tx-d)">自己ベスト ${Math.max(bd.bestLines,lines)}列</small>`;
      scSum.classList.add('on');
      scBox.style.marginTop='0';scSkip.textContent='結果へ ▶▶';
      if(endReason==='topout')sfx('sad');else if(grade==='S'||grade==='A')sfx('fanfare');else sfx('start');
      showScene(endingLines(endReason,grade),()=>{if(!mg._ended)mg.end(endReason);});
    }
    function doWipe(mid){wipe={t:0,dur:.75,mid,fired:false};sfx('beep');}
    function toStory(){
      if(phase!=='title'||wipe)return;
      se('decide');
      doWipe(()=>{phase='story';showScene(introLines(),startGame);});
    }

    // ── 入力（キー） ──
    const held={l:false,r:false,d:false};let hDir=0,dasT=0,arrT=0;
    function startGame(){
      if(phase!=='story')return;
      doWipe(()=>{
        phase='play';t=0;spIdx=0;
        bd.plays++;
        if(mode==='heavy'){for(let k=0;k<2;k++){const gap=(Math.random()*COLS)|0;board.shift();board.push(Array.from({length:COLS},(_,x)=>x===gap?0:9));}}
        spawn(nextType());
        level=calcLevel();
        banner={i:0,t:0};sfx('start');se('decide');
      });
    }
    mg.onKey(e=>{
      const k=e.key,dn=e.type==='keydown';
      const game=['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' ','x','X','z','Z','c','C','Shift','a','A','d','D','s','S','w','W','Enter'];
      if(!game.includes(k))return;
      e.preventDefault();
      if(dn)lastInput='key';
      if(phase==='title'){if(dn&&!e.repeat)toStory();return;}
      if(phase==='story'||phase==='ending'){if(dn&&!e.repeat&&(k===' '||k==='Enter'||k==='z'||k==='Z'||k==='x'||k==='X'))advanceScene();return;}
      if(k==='ArrowLeft'||k==='a'||k==='A'){held.l=dn;if(dn&&!e.repeat){hDir=-1;dasT=0;arrT=0;move(-1);}else if(!dn&&hDir===-1)hDir=held.r?1:0;return;}
      if(k==='ArrowRight'||k==='d'||k==='D'){held.r=dn;if(dn&&!e.repeat){hDir=1;dasT=0;arrT=0;move(1);}else if(!dn&&hDir===1)hDir=held.l?-1:0;return;}
      if(k==='ArrowDown'||k==='s'||k==='S'){held.d=dn;if(dn&&!e.repeat){if(softStep())sfx('move');}return;}
      if(!dn||e.repeat)return;
      if(k==='ArrowUp'||k==='x'||k==='X'||k==='w'||k==='W')rotate(1);
      else if(k==='z'||k==='Z')rotate(-1);
      else if(k===' '||k==='Enter')hardDrop();
      else if(k==='c'||k==='C'||k==='Shift')doHold();
    });

    // ── 入力（タッチ／マウス） ──
    let ptr=null;
    const now=()=>performance.now();
    const TOUCH_DAS=240,TOUCH_ARR=.06;
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();lastInput='touch';
      if(phase==='title'){if(introT>.5)toStory();return;}
      if(phase!=='play'&&phase!=='clear')return;
      try{cv.setPointerCapture(e.pointerId);}catch(_){}
      const r=cv.getBoundingClientRect();
      ptr={id:e.pointerId,x0:e.clientX-r.left,y0:e.clientY-r.top,x:e.clientX-r.left,y:e.clientY-r.top,t0:now(),
        cols:0,rows:0,mode:null,rep:false,repT:0,samples:[[now(),e.clientY]]};
    });
    cv.addEventListener('pointermove',e=>{
      if(!ptr||ptr.id!==e.pointerId)return;
      const r=cv.getBoundingClientRect();
      ptr.x=e.clientX-r.left;ptr.y=e.clientY-r.top;
      ptr.samples.push([now(),e.clientY]);if(ptr.samples.length>6)ptr.samples.shift();
      const dx=ptr.x-ptr.x0,dy=ptr.y-ptr.y0;
      if(!ptr.mode&&!ptr.rep){
        if(Math.abs(dx)>cs*.55&&Math.abs(dx)>Math.abs(dy))ptr.mode='h';
        else if(dy>cs*.7&&dy>Math.abs(dx))ptr.mode='v';
        else if(dy<-cs*1.6&&-dy>Math.abs(dx)*1.5)ptr.mode='up';
      }
      // ドラッグ量に応じてマス単位で移動（壁に当たっても指の位置に追従）
      if(ptr.mode==='h'){const want=Math.trunc(dx/(cs*.8));let moved=false;
        while(ptr.cols<want){move(1,true);ptr.cols++;moved=true;}while(ptr.cols>want){move(-1,true);ptr.cols--;moved=true;}
        if(moved)sfx('move');}
      if(ptr.mode==='v'){const want=Math.floor((dy-cs*.4)/(cs*.65));while(ptr.rows<want){softStep();ptr.rows++;}}
    });
    const endPtr=e=>{
      if(!ptr||ptr.id!==e.pointerId)return;
      const p=ptr;ptr=null;
      if(phase!=='play'&&phase!=='clear')return;
      const dt=now()-p.t0,dx=p.x-p.x0,dy=p.y-p.y0;
      // 直近の速度（px/ms）
      const s0=p.samples[0],s1=p.samples[p.samples.length-1];
      const vy=(s1[0]-s0[0])>0?(s1[1]-s0[1])/(s1[0]-s0[0]):0;
      if(p.mode==='v'||(!p.mode&&dy>cs*1.2)){
        if(dy>cs*1.5&&vy>.7&&dt<450)hardDrop();
        return;
      }
      if(p.mode==='up'){doHold();return;}
      if(p.mode||p.rep)return;
      if(dt>500||Math.abs(dx)>cs*.55||Math.abs(dy)>cs*.7)return;
      if(phase==='clear'){buffer('cw');return;}
      // タップ：ピースの上なら回転、それ以外は左右へ1マス
      if(cur){
        const cells=SH[cur.t][cur.r];let x0=99,x1=-99,y0=99,y1=-99;
        cells.forEach(([a,b])=>{x0=Math.min(x0,a);x1=Math.max(x1,a);y0=Math.min(y0,b);y1=Math.max(y1,b);});
        const px0=wx+(cur.x+x0)*cs-cs*.5,px1=wx+(cur.x+x1+1)*cs+cs*.5,py0=wy+(cur.y+y0-HID)*cs-cs*.7,py1=wy+(cur.y+y1+1-HID)*cs+cs*.7;
        if(p.x0>=px0&&p.x0<=px1&&p.y0>=py0&&p.y0<=py1){rotate(1);return;}
      }
      move(p.x0<W/2?-1:1);
    };
    cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
    bar.querySelectorAll('.blocks-btn').forEach(b=>{
      b.addEventListener('pointerdown',e=>{
        e.preventDefault();e.stopPropagation();lastInput='touch';
        b.classList.add('on');setTimeout(()=>{if(!mg._ended)b.classList.remove('on');},110);
        if(phase==='title'){toStory();return;}
        if(phase==='story'||phase==='ending'){advanceScene();return;}
        const a=b.dataset.a;
        if(a==='hold')doHold();else if(a==='cw')rotate(1);else if(a==='ccw')rotate(-1);else if(a==='drop')hardDrop();
      });
    });

    resize();
    const onResize=()=>{if(!mg._ended)resize();};
    window.addEventListener('resize',onResize);

    // ── チュートリアル（最初の十数秒） ──
    const TUT=[
      ['画面の左右をタップ／左右にドラッグで移動','← → で移動（押しっぱなしで連続）'],
      ['部品をタップ、または ↻ ↺ で回転','↑・X で回転、Z で逆回転'],
      ['下へ素早く払うと即落下（ゆっくりなら加速）','Space で即落下、↓ で加速'],
      ['上に払う／保留ボタンで部品をキープ','C で保留（ピース1つにつき1回）'],
    ];
    function tutDone(i){tut.done[i]=true;}
    function updateTut(dt){
      if(tut.step>=TUT.length)return;
      tut.t+=dt;
      if((tut.done[tut.step]&&tut.t>1.1)||tut.t>5){tut.step++;tut.t=0;while(tut.step<TUT.length&&tut.done[tut.step])tut.step++;}
    }

    // ── 更新 ──
    function update(dt){
      clock+=dt;
      fade=Math.max(0,fade-dt*1.6);
      if(wipe){wipe.t+=dt;if(!wipe.fired&&wipe.t>=wipe.dur*.5){wipe.fired=true;wipe.mid();}if(wipe.t>=wipe.dur)wipe=null;}
      // 会話の文字送り
      if(scLines){const L=scLines[scIdx];if(scChars<L.text.length){const before=Math.floor(scChars);scChars=Math.min(L.text.length,scChars+dt*34);
        if(Math.floor(scChars)!==before){scLine.textContent=L.text.slice(0,Math.floor(scChars));if(++scBlip%3===0)sfx('blip');}}}
      if(scGradeT>0){scGradeT-=dt;if(scGradeT<=0){scGrade.classList.add('stamp');sfx('stamp');shake=6;}}
      if(phase==='title'||phase==='story'){introT+=dt;updateFx(dt);return;}
      if(hitstop>0){hitstop-=dt;return;} // ヒットストップ
      if(phase==='play'||phase==='clear'){
        t+=dt;
        updateTut(dt);
        // 速度フェーズの切り替え
        if(spIdx<SPEED.length-1&&t>=SPEED[spIdx+1].t){spIdx++;level=calcLevel();banner={i:spIdx,t:0};sfx('horn');se('notif');}
        // 重量物の日
        if(mode==='heavy'&&firstClear&&phase==='play'){garbT+=dt;if(garbT>=(spIdx>=2?11:15)){garbT=0;pushGarbage();}}
        if(t>=TIME&&phase!=='over'){t=TIME;gameOver('timeup');}
      }
      if(phase==='play'&&cur){
        // 長押しで連続移動（タッチのDAS/ARR）
        if(ptr&&!ptr.mode){
          const held2=now()-ptr.t0;
          if(held2>TOUCH_DAS){if(!ptr.rep){ptr.rep=true;ptr.repT=0;}ptr.repT-=dt;if(ptr.repT<=0){move(ptr.x0<W/2?-1:1);ptr.repT=TOUCH_ARR;}}
        }
        // キーのDAS/ARR
        if(hDir){dasT+=dt;if(dasT>=DAS){arrT+=dt;let n=0;while(arrT>=ARR){arrT-=ARR;if(!move(hDir,n++>0))break;}}}
        let g=1/gravity();
        if(held.d)g=Math.max(g,24);
        acc+=g*dt;
        while(acc>=1&&cur){
          if(fits(cur.t,cur.r,cur.x,cur.y+1)){cur.y++;acc-=1;lastRot=false;if(held.d)score+=1;if(cur.y>lowY){lowY=cur.y;resets=0;lockT=0;}}
          else{acc=0;break;}
        }
        if(cur&&onGround()){lockT+=dt;if(lockT>=LOCK_DELAY||resets>=MAX_RESETS&&lockT>=.08)lock(false);}
      }
      if(phase==='clear'){clearT+=dt;if(clearT>=CLEAR_T)finishClear();}
      if(phase==='over'){
        overT+=dt;
        if(overReason==='topout'){
          const want=Math.min(ROWS,Math.floor(overT/.045));
          while(topRows<want){const y=ROWS-1-topRows;board[y]=board[y].map(v=>v?8:0);topRows++;}
          if(overT>2.1)toEnding();
        }else if(overT>2.2)toEnding();
      }
      // 危険ライン
      let hi=false;for(let y=0;y<HID+4;y++)if(board[y].some(v=>v))hi=true;
      if(hi&&!danger&&phase==='play'&&!dangerSeen){sfx('warn');se('warn');dangerSeen=true;}
      if(!hi)dangerSeen=false;
      danger=hi&&phase!=='ending';
      if(banner){banner.t+=dt;if(banner.t>2)banner=null;}
      updateFx(dt);
      holdBtn.classList.toggle('dim',holdUsed&&phase==='play');
      hud();
    }
    function updateFx(dt){
      shake=Math.max(0,shake-dt*22);flash=Math.max(0,flash-dt*2.2);
      for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.vx*=.985;}
      for(let i=pops.length-1;i>=0;i--){pops[i].t+=dt;if(pops[i].t>1.5)pops.splice(i,1);}
      for(let i=lifts.length-1;i>=0;i--){const L=lifts[i];const pt=L.t;L.t+=dt;if(pt<.05&&L.t>=.05)sfx('beep');if(L.t>L.dur)lifts.splice(i,1);}
      for(let i=trails.length-1;i>=0;i--){trails[i].t+=dt;if(trails[i].t>.28)trails.splice(i,1);}
      for(const b of belt){b.x+=dt*b.v;if(b.x>W+30)b.x=-30;}
    }

    // ── 描画 ──
    function drawLamps(){
      const xs=[W*.18,W*.5,W*.82];
      xs.forEach((x,i)=>{
        const sw=Math.sin(clock*.9+i*1.7)*.035;
        const flick=i===2&&Math.sin(clock*13)>.97?.35:1;
        const ly=16+(i===1?0:-3);
        const lx=x+Math.sin(sw)*ly;
        // コード
        cx.strokeStyle='rgba(90,80,120,.7)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x,0);cx.lineTo(lx,ly);cx.stroke();
        // 光の円錐
        cx.save();cx.globalCompositeOperation='lighter';
        const len=CH*.9,spread=W*.2;
        const ang=sw;
        const ex=lx+Math.sin(ang)*len;
        const gr=cx.createLinearGradient(lx,ly,lx,ly+len);
        const tint=danger?'255,90,110':'255,214,150';
        gr.addColorStop(0,`rgba(${tint},${.16*flick})`);gr.addColorStop(.6,`rgba(${tint},${.04*flick})`);gr.addColorStop(1,'rgba(0,0,0,0)');
        cx.fillStyle=gr;cx.beginPath();cx.moveTo(lx-6,ly+4);cx.lineTo(lx+6,ly+4);cx.lineTo(ex+spread,ly+len);cx.lineTo(ex-spread,ly+len);cx.closePath();cx.fill();
        const rg=cx.createRadialGradient(lx,ly+5,0,lx,ly+5,28);rg.addColorStop(0,`rgba(${tint},${.5*flick})`);rg.addColorStop(1,'rgba(0,0,0,0)');
        cx.fillStyle=rg;cx.fillRect(lx-30,ly-25,60,60);
        cx.restore();
        // 傘
        cx.fillStyle='#2a2440';cx.beginPath();cx.moveTo(lx-3,ly-2);cx.lineTo(lx+3,ly-2);cx.lineTo(lx+10,ly+5);cx.lineTo(lx-10,ly+5);cx.closePath();cx.fill();
        cx.fillStyle=`rgba(255,232,190,${.9*flick})`;cx.fillRect(lx-6,ly+5,12,2);
      });
    }
    function drawRain(){
      cx.strokeStyle='rgba(150,170,255,.18)';cx.lineWidth=1;cx.beginPath();
      const winY=CH*.07,winH=CH*.12;
      for(const d of rain){d.y+=d.s*.016;if(d.y>1)d.y-=1;const x=d.x*W,y=winY+d.y*winH;cx.moveTo(x,y);cx.lineTo(x-1,y+5);}
      cx.stroke();
    }
    function drawWell(){
      // 背面
      cx.fillStyle='rgba(6,5,16,.84)';cx.fillRect(wx,wy,ww,wh);
      cx.strokeStyle='rgba(138,82,212,.09)';cx.lineWidth=1;cx.beginPath();
      for(let x=1;x<COLS;x++){cx.moveTo(wx+x*cs+.5,wy);cx.lineTo(wx+x*cs+.5,wy+wh);}
      for(let y=1;y<20;y++){cx.moveTo(wx,wy+y*cs+.5);cx.lineTo(wx+ww,wy+y*cs+.5);}
      cx.stroke();
      // 残り時間の透かし（最後の10秒）
      if((phase==='play'||phase==='clear')&&TIME-t<=10){
        cx.font=`${Math.round(cs*5)}px ${MONO}`;cx.textAlign='center';cx.textBaseline='middle';
        cx.fillStyle=`rgba(232,48,85,${.1+.06*Math.sin(clock*8)})`;cx.fillText(String(Math.ceil(TIME-t)),wx+ww/2,wy+wh*.42);
      }
      // 鉄柱フレーム
      const fr=Math.max(4,Math.round(cs*.22));
      for(const fx of [wx-fr,wx+ww]){
        const gr=cx.createLinearGradient(fx,0,fx+fr,0);gr.addColorStop(0,'#4a4466');gr.addColorStop(.45,'#8a84a8');gr.addColorStop(1,'#2a2440');
        cx.fillStyle=gr;cx.fillRect(fx,wy-6,fr,wh+6+palH);
        cx.fillStyle='rgba(20,16,30,.8)';for(let y=wy+cs;y<wy+wh;y+=cs*3){cx.beginPath();cx.arc(fx+fr/2,y,1.3,0,7);cx.fill();}
      }
      // 上端の警戒ストライプ
      const sh=5;
      cx.save();cx.beginPath();cx.rect(wx-fr,wy-sh-1,ww+fr*2,sh);cx.clip();
      cx.fillStyle=danger?'#e83055':'#e8b830';cx.fillRect(wx-fr,wy-sh-1,ww+fr*2,sh);
      cx.fillStyle='#16101e';for(let x=wx-fr-10;x<wx+ww+fr;x+=12){cx.beginPath();cx.moveTo(x,wy);cx.lineTo(x+6,wy);cx.lineTo(x+12,wy-sh-1);cx.lineTo(x+6,wy-sh-1);cx.closePath();cx.fill();}
      cx.restore();
      if(danger){
        const a=.25+.2*Math.sin(clock*9);
        cx.strokeStyle=`rgba(232,48,85,${a})`;cx.lineWidth=2;cx.strokeRect(wx-1,wy-1,ww+2,wh+2);
        const gr=cx.createLinearGradient(0,wy,0,wy+cs*4);gr.addColorStop(0,`rgba(232,48,85,${a*.6})`);gr.addColorStop(1,'rgba(232,48,85,0)');
        cx.fillStyle=gr;cx.fillRect(wx,wy,ww,cs*4);
      }
    }
    function drawPallet(){
      // ローラーコンベア
      const ry=palY+palH;
      cx.fillStyle='#1a1528';cx.fillRect(wx-cs*.6,ry,ww+cs*1.2,5);
      for(let x=wx-cs*.4;x<wx+ww+cs*.5;x+=cs*.7){
        cx.fillStyle='#6a6488';cx.beginPath();cx.arc(x,ry+2.5,2.4,0,7);cx.fill();
        const a=clock*6+x;cx.strokeStyle='rgba(20,16,30,.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x,ry+2.5);cx.lineTo(x+Math.cos(a)*2.2,ry+2.5+Math.sin(a)*2.2);cx.stroke();
      }
      // 木製パレット
      const px=wx-2,pw=ww+4;
      const db=Math.max(3,palH*.38);
      let gr=cx.createLinearGradient(0,palY,0,palY+db);gr.addColorStop(0,'#b88a52');gr.addColorStop(1,'#6e4c26');
      cx.fillStyle=gr;cx.fillRect(px,palY,pw,db);
      cx.fillStyle='rgba(40,22,6,.5)';for(let x=px+pw/7;x<px+pw-2;x+=pw/7)cx.fillRect(x,palY,1,db);
      const bh=palH-db*2;
      cx.fillStyle='#5a3c1c';for(const f of [0,.45,.9])cx.fillRect(px+pw*f,palY+db,pw*.1,bh);
      cx.fillStyle='#0a0710';for(const [a,b] of [[.1,.45],[.55,.9]])cx.fillRect(px+pw*a,palY+db,pw*(b-a),bh);
      gr=cx.createLinearGradient(0,palY+db+bh,0,palY+palH);gr.addColorStop(0,'#a07446');gr.addColorStop(1,'#5a3c1c');
      cx.fillStyle=gr;cx.fillRect(px,palY+db+bh,pw,db);
      cx.font=`${Math.max(7,Math.round(db*1.1))}px ${MONO}`;cx.textAlign='left';cx.textBaseline='middle';cx.fillStyle='rgba(30,14,4,.55)';
      cx.fillText('DAN-PLT 1100',px+pw*.6,palY+db/2+.5);
    }
    function drawBoard(){
      cx.save();cx.beginPath();cx.rect(wx,wy-cs*.0,ww,wh);cx.clip();
      const cp=phase==='clear'?clearT/CLEAR_T:0;
      for(let y=HID;y<ROWS;y++){
        const isClr=clearRows.includes(y);
        const off=isClr?cp*cp*ww*1.15:0;
        for(let x=0;x<COLS;x++){const v=board[y][x];if(!v)continue;
          const px=wx+x*cs+off,py=wy+(y-HID)*cs;
          cx.globalAlpha=isClr?Math.max(0,1-cp*.8):1;
          cx.drawImage(spr[v],px,py,cs,cs);
          if(isClr){cx.globalAlpha=Math.max(0,.85-cp*1.2);cx.drawImage(spr.w,px,py,cs,cs);}
        }
        if(isClr){cx.globalAlpha=Math.max(0,.6-cp);cx.fillStyle='#fff';cx.fillRect(wx,wy+(y-HID)*cs+cs*.4,ww,cs*.2);}
      }
      cx.globalAlpha=1;
      // ハードドロップの残像
      for(const tr of trails){
        const a=1-tr.t/.28;const y0=wy+(tr.y0-HID)*cs,y1=wy+(tr.y1-HID)*cs;
        const gr=cx.createLinearGradient(0,y0,0,y1+cs);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,tr.col);
        cx.globalAlpha=a*.45;cx.fillStyle=gr;cx.fillRect(wx+tr.x*cs+2,y0,tr.w*cs-4,y1-y0+cs);
      }
      cx.globalAlpha=1;
      if(cur&&phase==='play'){
        // ゴースト
        const gy=ghostY(),[lt]=COL[cur.t];
        for(const [a,b] of SH[cur.t][cur.r]){const px=wx+(cur.x+a)*cs,py=wy+(gy+b-HID)*cs;if(gy+b<HID)continue;
          cx.fillStyle='rgba(255,255,255,.05)';cx.fillRect(px+1,py+1,cs-2,cs-2);
          cx.strokeStyle=lt;cx.globalAlpha=.55;cx.lineWidth=1.5;cx.setLineDash([3,2]);rr(cx,px+1.5,py+1.5,cs-3,cs-3,cs*.12);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1;}
        // 操作中のピース
        const ground=onGround();
        for(const [a,b] of SH[cur.t][cur.r]){const Y=cur.y+b;const px=wx+(cur.x+a)*cs,py=wy+(Y-HID)*cs;
          cx.drawImage(spr[cur.t],px,py,cs,cs);
          if(ground){cx.globalAlpha=.25*Math.min(1,lockT/LOCK_DELAY)*(.6+.4*Math.sin(clock*20));cx.drawImage(spr.w,px,py,cs,cs);cx.globalAlpha=1;}
        }
      }
      cx.restore();
      // 隠し段にはみ出したピースは枠の上に半透明で
      if(cur&&phase==='play'){
        cx.globalAlpha=.5;
        for(const [a,b] of SH[cur.t][cur.r]){const Y=cur.y+b;if(Y>=HID||Y<HID-1)continue;cx.drawImage(spr[cur.t],wx+(cur.x+a)*cs,wy-cs,cs,cs);}
        cx.globalAlpha=1;
      }
    }
    function drawMini(tp,cxm,cym,ms,alpha){
      if(!tp)return;
      const cells=SH[tp][0];let x0=9,x1=0,y0=9,y1=0;
      cells.forEach(([a,b])=>{x0=Math.min(x0,a);x1=Math.max(x1,a);y0=Math.min(y0,b);y1=Math.max(y1,b);});
      const w=(x1-x0+1)*ms,h=(y1-y0+1)*ms;
      cx.globalAlpha=alpha==null?1:alpha;
      for(const [a,b] of cells)cx.drawImage(spr[tp],cxm-w/2+(a-x0)*ms,cym-h/2+(b-y0)*ms,ms,ms);
      cx.globalAlpha=1;
    }
    function panel(x,y,w,h,label,col){
      cx.fillStyle='rgba(10,7,22,.88)';rr(cx,x,y,w,h,5);cx.fill();
      cx.strokeStyle=col;cx.globalAlpha=.55;cx.lineWidth=1;rr(cx,x+.5,y+.5,w-1,h-1,5);cx.stroke();cx.globalAlpha=1;
      cx.fillStyle=col;cx.fillRect(x+5,y,Math.min(w-10,30),2);
      cx.font=`${Math.max(9,Math.round(cs*.42))}px ${MONO}`;cx.textAlign='left';cx.textBaseline='top';cx.fillStyle=col;cx.fillText(label,x+6,y+4);
    }
    function drawSide(){
      const pw=side-4,lx=4,rx=wx+ww+Math.max(4,Math.round(cs*.22))+4,rw=W-rx-4;
      const ms=Math.min(cs*.62,(Math.min(pw,rw)-10)/4.1);
      const lab=Math.max(9,Math.round(cs*.42))+6;
      // HOLD
      const hh=lab+ms*2.6;
      panel(lx,wy,pw,hh,'HOLD',holdUsed?C.txd:C.cy);
      drawMini(hold,lx+pw/2,wy+lab+(hh-lab)/2,ms,holdUsed?.35:1);
      // NEXT
      const nh=lab+ms*2.5*3+4;
      panel(rx,wy,rw,nh,'NEXT',C.gd);
      for(let i=0;i<3;i++)drawMini(queue[i],rx+rw/2,wy+lab+ms*1.25+i*ms*2.5,i===0?ms:ms*.85,i===0?1:.8);
      if(queue[0]){cx.font=`${Math.max(8,Math.round(cs*.36))}px ${FONT}`;cx.textAlign='center';cx.textBaseline='top';cx.fillStyle=C.tx;
        cx.fillText(PART[queue[0]],rx+rw/2,wy+nh+4);}
      // 実績
      let y=wy+hh+10;
      const big=Math.max(16,Math.round(cs*.9)),sm=Math.max(9,Math.round(cs*.4));
      const stat=(label,val,col)=>{
        cx.textAlign='left';cx.textBaseline='top';cx.font=`${sm}px ${FONT}`;cx.fillStyle=C.txd;cx.fillText(label,lx+4,y);
        cx.font=`${big}px ${MONO}`;cx.fillStyle=col;cx.fillText(val,lx+4,y+sm+2);y+=sm+big+8;
      };
      stat('出荷',String(lines),C.cy);
      stat('LEVEL',String(level),C.txb);
      cx.font=`${sm}px ${FONT}`;cx.fillStyle=C.txd;cx.fillText('SCORE',lx+4,y);
      cx.font=`${Math.max(12,Math.round(cs*.58))}px ${MONO}`;cx.fillStyle=C.gd;cx.fillText(String(score),lx+4,y+sm+2);y+=sm+cs*.6+10;
      if(combo>=1){cx.font=`${sm}px ${FONT}`;cx.fillStyle=C.gn;cx.fillText(combo+' コンボ中',lx+4,y);y+=sm+4;}
      if(b2b){cx.font=`${sm}px ${FONT}`;cx.fillStyle='#ff9ad0';cx.fillText('B2B 待機',lx+4,y);}
      // 残り時間ゲージ（右側）
      const gy=wy+nh+lab+10,gh=Math.max(40,palY-gy-14);
      if(gh>40){
        const f=phase==='intro'?1:Math.max(0,1-t/TIME);
        cx.fillStyle='rgba(10,7,22,.85)';rr(cx,rx+rw/2-7,gy,14,gh,4);cx.fill();
        const col=f<.12?C.rd:f<.35?C.gd:C.cy;
        cx.fillStyle=col;cx.globalAlpha=.85;rr(cx,rx+rw/2-5,gy+2+(gh-4)*(1-f),10,(gh-4)*f,3);cx.fill();cx.globalAlpha=1;
        cx.font=`${sm}px ${FONT}`;cx.textAlign='center';cx.textBaseline='top';cx.fillStyle=C.txd;cx.fillText('定時',rx+rw/2,gy+gh+3);
      }
    }
    function drawForklift(x,base,s,stack,dir){
      // s: スケール（高さ基準）。右向きに走る
      cx.save();cx.translate(x,base);
      const wr=s*.16;
      // 影
      cx.fillStyle='rgba(0,0,0,.4)';cx.beginPath();cx.ellipse(s*.1,0,s*.85,s*.08,0,0,7);cx.fill();
      // マスト
      cx.fillStyle='#4a4466';cx.fillRect(s*.52,-s*1.05,s*.07,s*1.0);
      cx.fillStyle='#6a6488';cx.fillRect(s*.6,-s*1.0,s*.05,s*.95);
      // フォーク＋荷
      const fy=-s*.12-Math.min(1,(stack.length?1:0))*s*.06;
      cx.fillStyle='#8a84a8';cx.fillRect(s*.62,fy,s*.62,s*.05);
      const cb=s*.28;
      // 荷を載せたパレット
      cx.fillStyle='#8a6038';cx.fillRect(s*.66,fy-s*.07,cb*2,s*.07);
      stack.forEach((tp,i)=>{const col=i%2,row=(i/2)|0;cx.drawImage(spr[tp],s*.68+col*cb,fy-s*.07-(row+1)*cb,cb,cb);});
      // 車体
      let gr=cx.createLinearGradient(0,-s*.6,0,0);gr.addColorStop(0,'#ffcc3a');gr.addColorStop(1,'#b8780e');
      cx.fillStyle=gr;rr(cx,-s*.55,-s*.5,s*1.08,s*.4,s*.06);cx.fill();
      cx.fillStyle='#2a2440';rr(cx,-s*.62,-s*.56,s*.32,s*.42,s*.06);cx.fill(); // カウンターウェイト
      cx.fillStyle='#16101e';cx.fillRect(-s*.5,-s*.32,s*.96,s*.06);
      cx.font=`bold ${Math.round(s*.13)}px ${MONO}`;cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='rgba(40,20,0,.6)';cx.fillText('FL-02',s*.12,-s*.4);
      // 運転席の屋根（ヘッドガード）
      cx.strokeStyle='#3a3456';cx.lineWidth=Math.max(1.5,s*.04);
      cx.beginPath();cx.moveTo(-s*.25,-s*.5);cx.lineTo(-s*.28,-s*1.02);cx.lineTo(s*.42,-s*1.02);cx.lineTo(s*.42,-s*.5);cx.stroke();
      cx.beginPath();cx.moveTo(-s*.28,-s*1.02);cx.lineTo(s*.42,-s*1.02);cx.stroke();
      // 運転手（だんのうら）
      cx.fillStyle='#2b2a44';cx.fillRect(s*.0,-s*.78,s*.17,s*.28);
      cx.fillStyle='#e9c6a4';cx.beginPath();cx.arc(s*.09,-s*.86,s*.09,0,7);cx.fill();
      cx.fillStyle='#e8b830';cx.beginPath();cx.arc(s*.09,-s*.9,s*.1,Math.PI,0);cx.fill(); // ヘルメット
      // 回転灯
      const on=Math.sin(clock*12)>0;
      cx.fillStyle=on?'#ff9a2a':'#7a3a0a';cx.fillRect(s*.05,-s*1.1,s*.1,s*.08);
      if(on){cx.save();cx.globalCompositeOperation='lighter';const rg=cx.createRadialGradient(s*.1,-s*1.06,0,s*.1,-s*1.06,s*.5);rg.addColorStop(0,'rgba(255,150,40,.45)');rg.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=rg;cx.fillRect(-s*.4,-s*1.56,s,s);cx.restore();}
      // 車輪
      for(const wx2 of [-s*.38,s*.36]){
        cx.fillStyle='#120e1c';cx.beginPath();cx.arc(wx2,-wr,wr,0,7);cx.fill();
        cx.fillStyle='#6a6488';cx.beginPath();cx.arc(wx2,-wr,wr*.45,0,7);cx.fill();
        const a=x/wr;cx.strokeStyle='#16101e';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(wx2,-wr);cx.lineTo(wx2+Math.cos(a)*wr*.45,-wr+Math.sin(a)*wr*.45);cx.stroke();
      }
      // ヘッドライト
      cx.save();cx.globalCompositeOperation='lighter';
      gr=cx.createLinearGradient(s*.5,0,s*1.6,0);gr.addColorStop(0,'rgba(255,240,200,.28)');gr.addColorStop(1,'rgba(255,240,200,0)');
      cx.fillStyle=gr;cx.beginPath();cx.moveTo(s*.5,-s*.42);cx.lineTo(s*1.6,-s*.6);cx.lineTo(s*1.6,-s*.05);cx.closePath();cx.fill();cx.restore();
      cx.restore();
    }
    function drawLane(){
      const base=laneY+laneH*.82;
      const s=Math.min(laneH*1.05,(laneY+laneH*.82)-(palY+palH+8))*1;
      for(const L of lifts){
        if(L.t<0)continue;
        const f=L.t/L.dur;
        // 入場→停止→出発
        const e=f<.3?1-Math.pow(1-f/.3,2):f<.45?1:Math.pow((f-.45)/.55,1.8);
        const x=f<.3?-s*1.6+(W*.32+s*1.6)*e:f<.45?W*.32:W*.32+(W+s*2-W*.32)*e;
        drawForklift(x,base,Math.max(26,s),L.stack,1);
        // 「出荷！」吹き出し
        const ta=f<.12?f/.12:f>.85?(1-f)/.15:1;
        const bob=Math.sin(L.t*8)*2;
        cx.globalAlpha=Math.max(0,ta);
        const tx=x+s*.4,ty=base-s*1.45+bob;
        const label=L.n>=4?'一括出荷！':'出荷！';
        cx.font=`${Math.round(Math.max(13,s*.36))}px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';
        const tw=cx.measureText(label).width+14;
        cx.fillStyle=L.n>=4?'rgba(232,184,48,.95)':'rgba(0,232,200,.92)';rr(cx,tx-tw/2,ty-12,tw,22,6);cx.fill();
        cx.beginPath();cx.moveTo(tx-5,ty+10);cx.lineTo(tx+5,ty+10);cx.lineTo(tx-2,ty+16);cx.closePath();cx.fill();
        cx.fillStyle='#0a0714';cx.fillText(label,tx,ty);
        cx.font=`${Math.round(Math.max(9,s*.24))}px ${MONO}`;cx.fillStyle=C.txb;cx.fillText('×'+L.n+'列',tx+tw/2+16,ty);
        cx.globalAlpha=1;
      }
    }
    function drawParticles(){
      for(const p of parts){
        cx.globalAlpha=Math.max(0,p.life/p.max);
        if(p.add)cx.globalCompositeOperation='lighter';
        cx.fillStyle=p.col;cx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
        cx.globalCompositeOperation='source-over';
      }
      cx.globalAlpha=1;
    }
    function drawPops(){
      cx.textAlign='center';cx.textBaseline='middle';
      for(const p of pops){
        if(p.t<0)continue;
        const a=p.t<.12?p.t/.12:p.t>1.1?Math.max(0,(1.5-p.t)/.4):1;
        const sc=p.t<.12?1.4-p.t/.12*.4:1;
        const fs=Math.round((p.big?cs*.95:cs*.66)*sc);
        cx.font=`${fs}px ${FONT}`;
        cx.globalAlpha=a;
        const y=p.y-p.t*18;
        cx.lineWidth=4;cx.strokeStyle='rgba(5,4,14,.9)';cx.strokeText(p.text,wx+ww/2,y);
        cx.shadowColor=p.col;cx.shadowBlur=12;cx.fillStyle=p.col;cx.fillText(p.text,wx+ww/2,y);cx.shadowBlur=0;
      }
      cx.globalAlpha=1;
    }
    // タイトル（ロゴ）カード
    function drawTitle(){
      if(phase!=='title')return;
      cx.fillStyle='rgba(5,4,14,.72)';cx.fillRect(0,0,W,CH);
      const pw=Math.min(W-24,360),ph=Math.min(CH-24,400),px=(W-pw)/2,py=Math.max(10,(CH-ph)/2-6);
      cx.fillStyle='rgba(10,7,22,.96)';rr(cx,px,py,pw,ph,10);cx.fill();
      cx.strokeStyle='rgba(138,82,212,.8)';cx.lineWidth=1;rr(cx,px+.5,py+.5,pw-1,ph-1,10);cx.stroke();
      // 上下の警戒ストライプ
      for(const sy of [py,py+ph-6]){cx.save();cx.beginPath();cx.rect(px+8,sy,pw-16,6);cx.clip();cx.fillStyle='#e8b830';cx.fillRect(px,sy,pw,6);
        cx.fillStyle='#16101e';for(let x=px-14+(clock*18)%12;x<px+pw;x+=12){cx.beginPath();cx.moveTo(x,sy+6);cx.lineTo(x+6,sy+6);cx.lineTo(x+12,sy);cx.lineTo(x+6,sy);cx.closePath();cx.fill();}cx.restore();}
      cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`10px ${MONO}`;cx.fillStyle=C.txd;cx.fillText('DANNOURA WORKS ─ 第2倉庫 深夜出荷ライン',W/2,py+22);
      // 落ちてきて積み上がる部品（ロゴの土台）
      const ms=Math.min(26,(pw-60)/7.5),bx=W/2-ms*3.5,by=py+40;
      const order=[[1,0,1],[6,1,1],[3,2,1],[2,3,1],[4,4,1],[5,5,1],[7,6,1],[3,1,0],[2,3,0],[7,5,0]];
      order.forEach(([tp,cx0,row],i)=>{
        const lt=introT-.12*i;if(lt<=0)return;
        const land=by+row*ms,fall=Math.min(1,lt/.35),bounce=fall>=1?Math.max(0,Math.sin(Math.min(1,(lt-.35)/.2)*Math.PI))*ms*.12:0;
        const y=land-(1-fall*fall)*(land-py+ms)-bounce;
        cx.drawImage(spr[tp],bx+cx0*ms,y,ms,ms);
      });
      // ロゴ文字
      const ly=by+ms*2+30,fs=Math.min(40,pw/7.2);
      cx.font=`${fs}px ${FONT}`;
      const la=Math.min(1,Math.max(0,(introT-.9)/.4));
      cx.globalAlpha=la;
      cx.lineJoin='round';cx.lineWidth=8;cx.strokeStyle='#05040e';cx.strokeText('部品積み込み',W/2,ly);
      cx.lineWidth=3;cx.strokeStyle='#8a52d4';cx.strokeText('部品積み込み',W/2,ly);
      const lg=cx.createLinearGradient(0,ly-fs/2,0,ly+fs/2);lg.addColorStop(0,'#fff6d8');lg.addColorStop(.45,'#ffd65a');lg.addColorStop(.55,'#c88a12');lg.addColorStop(1,'#ffe9a0');
      cx.shadowColor='rgba(232,184,48,.6)';cx.shadowBlur=16;cx.fillStyle=lg;cx.fillText('部品積み込み',W/2,ly);cx.shadowBlur=0;
      // 光の走査
      const sx=((introT*.6)%2)*pw*1.4+px-pw*.2;
      cx.save();cx.globalCompositeOperation='lighter';const sg=cx.createLinearGradient(sx-30,0,sx+30,0);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,.22)');sg.addColorStop(1,'rgba(255,255,255,0)');
      cx.fillStyle=sg;cx.fillRect(px,ly-fs/2-2,pw,fs+4);cx.restore();
      cx.font=`10px ${MONO}`;cx.fillStyle=C.cy;cx.fillText('PARTS LOADING : NIGHT SHIFT',W/2,ly+fs*.62+4);
      cx.globalAlpha=1;
      // 本日の作業
      let y=ly+fs*.62+28;
      const badge=(txt,col)=>{cx.font=`11px ${FONT}`;const tw=cx.measureText(txt).width+18;cx.fillStyle=col;cx.globalAlpha=.16;rr(cx,W/2-tw/2,y-10,tw,20,10);cx.fill();cx.globalAlpha=1;
        cx.strokeStyle=col;rr(cx,W/2-tw/2+.5,y-9.5,tw-1,19,10);cx.stroke();cx.fillStyle=col;cx.fillText(txt,W/2,y+.5);};
      badge(mode==='heavy'?'本日：重量物の日（下から荷がせり上がる）':'本日：通常出荷　制限時間 90秒',mode==='heavy'?'#9fb2c8':C.cy);
      y+=26;
      cx.font=`11px ${FONT}`;cx.fillStyle=C.tx;
      const how=[['横一列そろえると フォークリフトで出荷',C.tx],['通常便 → 急ぎ便 → 最終便 で加速',C.tx],['積み上げて溢れると 荷崩れで終了',C.tx]];
      how.forEach(([s2,c],i)=>{cx.fillStyle=c;cx.fillText(s2,W/2,y+i*17);});
      y+=17*3+6;
      cx.fillStyle=C.txd;cx.font=`11px ${FONT}`;
      cx.fillText(bd.plays?`自己ベスト ${bd.bestLines}列 / ${bd.best}点${bd.bestGrade?'　最高評価 '+bd.bestGrade:''}`:'はじめての積み込み作業',W/2,y);
      const ty=Math.min(py+ph-24,y+28);
      cx.font=`15px ${FONT}`;cx.fillStyle=`rgba(222,204,248,${.55+Math.sin(clock*5)*.35})`;
      cx.fillText(lastInput==='key'?'▶ キーを押して始業':'▶ タップで始業',W/2,ty);
    }
    // 便の切り替えバナー
    function drawBanner(){
      if(!banner)return;
      const S=SPEED[banner.i],bt=banner.t;
      const inT=Math.min(1,bt/.25),outT=bt>1.6?(bt-1.6)/.4:0;
      const x=(1-inT)*-W+outT*W,y=wy+wh*.3,h=cs*2.4;
      cx.save();cx.translate(x,0);
      cx.fillStyle='rgba(5,4,14,.86)';cx.fillRect(0,y-h/2,W,h);
      cx.fillStyle=S.col;cx.fillRect(0,y-h/2,W,2);cx.fillRect(0,y+h/2-2,W,2);
      cx.globalAlpha=.18;for(let k=-1;k<W/18+1;k++){cx.beginPath();const o=k*18+(clock*40)%18;cx.moveTo(o,y+h/2);cx.lineTo(o+9,y+h/2);cx.lineTo(o+21,y-h/2);cx.lineTo(o+12,y-h/2);cx.closePath();cx.fill();}
      cx.globalAlpha=1;cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`${Math.round(cs*1.05)}px ${FONT}`;cx.shadowColor=S.col;cx.shadowBlur=14;cx.fillStyle=S.col;cx.fillText(S.name+(banner.i?' 到着！':' 作業開始！'),W/2,y-cs*.35);cx.shadowBlur=0;
      cx.font=`${Math.round(cs*.5)}px ${FONT}`;cx.fillStyle=C.txb;cx.fillText(S.sub,W/2,y+cs*.6);
      cx.restore();
    }
    // チュートリアルのヒント
    function drawTut(){
      if(phase!=='play'&&phase!=='clear')return;
      if(tut.step>=TUT.length)return;
      const txt=TUT[tut.step][lastInput==='key'?1:0];
      const a=Math.min(1,tut.t*4)*(tut.done[tut.step]?Math.max(0,1-(tut.t-.6)*2):1);
      if(a<=0)return;
      cx.globalAlpha=a;cx.font=`${Math.max(10,Math.round(cs*.46))}px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';
      const tw=Math.min(ww+40,cx.measureText(txt).width+38),y=wy+wh-cs*1.0;
      cx.fillStyle='rgba(10,7,22,.9)';rr(cx,W/2-tw/2,y-cs*.5,tw,cs,cs*.5);cx.fill();
      cx.strokeStyle=C.cy;cx.lineWidth=1;rr(cx,W/2-tw/2+.5,y-cs*.5+.5,tw-1,cs-1,cs*.5);cx.stroke();
      cx.fillStyle=C.cy;cx.fillText(`${tut.step+1}/4`,W/2-tw/2+14,y+.5);
      cx.fillStyle=tut.done[tut.step]?C.gn:C.txb;cx.fillText((tut.done[tut.step]?'✓ ':'')+txt,W/2+9,y+.5);
      cx.globalAlpha=1;
    }
    // 画面の切り替え（警戒ストライプのワイプ）
    function drawWipe(){
      if(fade>0){cx.fillStyle=`rgba(5,4,14,${fade})`;cx.fillRect(0,0,W,CH);}
      if(!wipe)return;
      const p=wipe.t/wipe.dur,e=p<.5?p/.5:1-(p-.5)/.5;
      const x0=p<.5?0:W*(1-e),x1=p<.5?W*e:W;
      cx.fillStyle='#07050f';cx.fillRect(x0,0,x1-x0,CH);
      const edge=p<.5?x1:x0;
      cx.save();cx.beginPath();cx.rect(edge-10,0,20,CH);cx.clip();cx.fillStyle='#e8b830';cx.fillRect(edge-10,0,20,CH);
      cx.fillStyle='#16101e';for(let y=-20;y<CH;y+=16){cx.beginPath();cx.moveTo(edge-10,y);cx.lineTo(edge+10,y+10);cx.lineTo(edge+10,y+18);cx.lineTo(edge-10,y+8);cx.closePath();cx.fill();}
      cx.restore();
      if(p>.35&&p<.65){cx.font=`16px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle=C.gd;cx.globalAlpha=1-Math.abs(p-.5)/.15;cx.fillText('― 作業準備中 ―',W/2,CH/2);cx.globalAlpha=1;}
    }
    // 背景のベルトコンベア（流れる段ボール）と機械の表示灯
    function drawBelt(){
      const y=CH*.36;
      cx.fillStyle='rgba(30,24,52,.85)';cx.fillRect(0,y,W,4);
      cx.fillStyle='rgba(90,80,130,.45)';for(let x=-((clock*22)%10);x<W;x+=10)cx.fillRect(x,y+1,4,1.5);
      cx.globalAlpha=.55;
      for(const b of belt){const s=12*b.s;cx.drawImage(spr[b.t],b.x,y-s,s,s);}
      cx.globalAlpha=1;
      for(let i=0;i<5;i++){const x=W*(.08+i*.21),yy=CH*.43+(i%2)*8,on=Math.sin(clock*(1.3+i*.7)+i)>.2;
        cx.fillStyle=on?(i%3===0?'rgba(68,238,136,.8)':i%3===1?'rgba(232,48,85,.75)':'rgba(232,184,48,.75)'):'rgba(60,50,80,.6)';cx.fillRect(x,yy,3,3);}
    }
    function drawOver(){
      if(phase!=='over'&&phase!=='ending')return;
      const a=phase==='ending'?1:Math.min(1,overT*2);
      cx.fillStyle=`rgba(5,4,14,${a*(phase==='ending'?.6:.45)})`;cx.fillRect(0,0,W,CH);
      if(phase==='ending')return;
      cx.globalAlpha=a;cx.textAlign='center';cx.textBaseline='middle';
      const top=overReason==='topout';
      const sc=1+Math.max(0,.4-overT)*1.5;
      cx.font=`${Math.round(cs*1.15*sc)}px ${FONT}`;cx.lineWidth=5;cx.strokeStyle='rgba(5,4,14,.95)';
      const msg=top?'荷崩れ！':'定時！ 作業終了';
      cx.strokeText(msg,W/2,wy+wh*.4);cx.fillStyle=top?'#ff7a90':C.gd;cx.shadowColor=cx.fillStyle;cx.shadowBlur=14;cx.fillText(msg,W/2,wy+wh*.4);cx.shadowBlur=0;
      cx.font=`${Math.round(cs*.6)}px ${FONT}`;cx.fillStyle=C.txb;cx.strokeText(`出荷 ${lines}列`,W/2,wy+wh*.4+cs*1.3);cx.fillText(`出荷 ${lines}列`,W/2,wy+wh*.4+cs*1.3);
      cx.globalAlpha=1;
    }
    function draw(){
      cx.setTransform(dpr,0,0,dpr,0,0);
      if(shake>0)cx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
      cx.drawImage(lyBg,0,0,W,CH);
      drawRain();
      drawBelt();
      drawLamps();
      drawWell();
      drawPallet();
      drawBoard();
      drawSide();
      drawLane();
      drawParticles();
      drawPops();
      drawTut();
      drawBanner();
      cx.drawImage(lyVig,0,0,W,CH);
      if(flash>0){cx.globalCompositeOperation='lighter';cx.fillStyle=`rgba(200,255,245,${flash*.25})`;cx.fillRect(wx,wy,ww,wh);cx.globalCompositeOperation='source-over';}
      cx.setTransform(dpr,0,0,dpr,0,0);
      drawOver();
      drawTitle();
      drawWipe();
    }
    function hud(){
      const html=`出荷 <span style="color:var(--cy)">${lines}</span>列　${SPEED[spIdx].name} LV${level}　<span style="color:var(--tx-b)">${score}</span>`;
      if(html!==lastScoreHtml){lastScoreHtml=html;mg.setScore(html);}
      const tm=phase==='title'||phase==='story'?'READY':'残り '+Math.max(0,Math.ceil(TIME-t))+'秒';
      if(tm!==lastTimer){lastTimer=tm;mg.setTimer(tm);}
    }
    hud();
    mg.loop(dt=>{update(dt);if(!mg._ended)draw();});

    // テスト用の内部状態参照
    this._dbg={get board(){return board;},set board(b){board=b;},get cur(){return cur;},get phase(){return phase;},get queue(){return queue;},
      get lines(){return lines;},set lines(v){lines=v;},get t(){return t;},set t(v){t=v;},get score(){return score;},get spIdx(){return spIdx;},get mode(){return mode;},
      toStory,startGame,advanceScene,finishScene,hardDrop,move,rotate,doHold,spawn,pushGarbage};

    return {result(reason){
      window.removeEventListener('resize',onResize);
      // 終了演出・エンディング中に「終了」を押しても、本来の結果で精算する
      if(reason==='quit'&&(phase==='over'||phase==='ending')&&overReason)reason=overReason;
      const L=lines;
      if(!grade&&reason!=='quit'){grade=calcGrade(L,reason);const order='CBAS';if(!bd.bestGrade||order.indexOf(grade)>order.indexOf(grade))bd.bestGrade=bd.bestGrade||grade;}
      let fx,time,sp=0,title,cut=null,log;
      if(reason==='timeup'){
        fx={money:Math.min(6000,L*400),jobRep:Math.min(8,Math.floor(L/3)),mental:L>=10?2:0,fatigue:6};
        time=45;sp=L>=12?1:0;
        title=L>=12?'🧱 出荷ノルマ達成！':'🧱 定時まで積み込んだ';
        cut=L>=12?['win','……全部積んだった。今日の出荷、俺の手で回したんや。']:L>=6?['happy','よし、これだけ出せたら上出来や。']:['normal','……手は動いた。それで十分や。'];
        log=L>=12?`部品積み込みで${L}列を出荷。フォークリフトの回転灯が、今夜は誇らしく見えた。`:`部品積み込みで${L}列を出荷した。`;
      }else if(reason==='topout'){
        fx={money:L*300,jobRep:Math.floor(L/4),mental:-2,fatigue:6};
        time=45;title='💥 荷崩れ……';
        cut=['tired','……積みすぎた。焦ると崩れるのは、仕事も人生も一緒やな。'];
        log=`部品積み込み中に荷崩れ。出荷できたのは${L}列。`;
      }else{
        fx={money:L*200,fatigue:2};time=20;title='🧱 積み込みを切り上げた';
        log=L?`部品積み込みを途中で切り上げた（${L}列出荷）。`:'部品積み込みを途中でやめた。';
      }
      const newBest=score>bd.best;
      if(newBest)bd.best=score;
      if(L>bd.bestLines)bd.bestLines=L;
      return {
        title,
        summary:(grade&&reason!=='quit'?`評価 <span class="up">${grade}</span>　`:'')+`出荷 <span class="up">${L}列</span>　スコア <span class="up">${score}</span>${newBest&&score>0?' <span class="up">NEW!</span>':''}`+
          `<br>最大コンボ <span class="up">${Math.max(0,maxCombo)}</span>　一括出荷 <span class="up">${quads}</span>　Tねじ込み <span class="up">${tspins}</span>`,
        fx,time,sp,log,cutin:cut,
      };
    }};
  },
});
