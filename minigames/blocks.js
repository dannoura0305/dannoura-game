// ══════════════════════════════════════════════════════════
// 落ち物パズル「部品組み立てライン」
// 2個1組で落ちてくる部品を6列のラインに置く。置いた部品は1個ずつバラけて下へ落ちる。
// 同じ部品が3つ以上たて・よこにつながると、最後に置いた場所で1段上の部品に組み上がる（連鎖あり）。
// ネジ → ナット → ギア → モーター → ロボットアーム → ロボット（完成品）。完成品はフォークリフトで出荷。
// 不良品（赤札）は隣で2回組み立てが起きると直ってネジになる。列があふれたらライン停止。
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
.mg-blocks .blocks-por{position:absolute;left:14px;bottom:140px;width:min(46%,200px);aspect-ratio:1/1;pointer-events:none;border-radius:10px;overflow:hidden;
  border:2px solid rgba(0,232,200,.7);box-shadow:0 0 22px rgba(0,232,200,.3),0 6px 18px rgba(0,0,0,.6);background:#140e26;transition:opacity .25s,transform .3s,filter .3s;}
.mg-blocks .blocks-por::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 60%,rgba(10,7,22,.55));
  box-shadow:inset 0 0 0 4px rgba(10,7,22,.9);}
.mg-blocks .blocks-por img{width:100%;height:100%;object-fit:cover;object-position:top;display:block;}
.mg-blocks .blocks-por.dim{opacity:.45;transform:scale(.94);filter:grayscale(.5);border-color:rgba(187,174,221,.3);box-shadow:none;}
.mg-blocks .blocks-boss{position:absolute;right:16px;bottom:138px;width:78px;height:96px;pointer-events:none;transition:opacity .25s,transform .25s;}
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
  id:'blocks', icon:'🧱', name:'部品組み立てライン', genre:'落ち物パズル', bgm:'factory',
  desc:'2個1組で流れてくる部品を積み、同じ部品を3つつなげると1段上に組み立て。ネジ→ナット→ギア→モーター→アーム→ロボット完成でフォークリフトが出荷！ 連鎖組立で高得点。',
  effect:'収入↑ 仕事評価↑ 精神↑ ／ 疲労+6 約45分',
  help:'ドラッグで移動・タップで回転／下に払って落下',
  start(body,mg){
    // ── 定数 ──
    const COLS=6, VIS=12, HID=1, ROWS=VIS+HID;
    const DIFF=mgDifficulty();
    const DIFF_NAME={easy:'やさしい',normal:'ふつう',hard:'むずかしい'}[DIFF]||'やさしい';
    const TIME=mgDiff(150,120,100);
    const LOCK_DELAY=mgDiff(.8,.6,.45), MAX_RESETS=12, MERGE_T=.38;
    const DAS=.17, ARR=.07;
    const FALL=mgDiff([.95,.8,.66],[.72,.56,.44],[.52,.4,.3]);   // 1段落ちるのにかかる秒（便ごと）
    const DEF_RATE=mgDiff(.04,.09,.15), DEF_FROM=mgDiff(25,15,8), DEF_COOL=mgDiff(9,5,3);
    const WEIGHTS=mgDiff([40,33,21,6],[36,31,22,11],[31,28,24,17]); // ネジ・ナット・ギア・モーターの出やすさ
    const BIAS=mgDiff(.55,.3,.12);  // 積んである一番上の部品と同じものが来やすい
    const SAME=mgDiff(.38,.26,.16); // 2個とも同じ部品の組が来やすい
    let rescues=mgDiff(1,0,0);      // やさしい：あふれそうな時に一度だけ班長が上の部品を引き取ってくれる
    const FONT='"DotGothic16", monospace', MONO='"Share Tech Mono", monospace';
    const C={pu:'#8a52d4',cy:'#00e8c8',rd:'#e83055',gd:'#e8b830',gn:'#44ee88',tx:'#bbaedd',txd:'#5e5078',txb:'#deccf8'};
    const NAME={1:'ネジ',2:'ナット',3:'ギア',4:'モーター',5:'アーム',6:'ロボット',9:'不良品'};
    // 段ごとの色（部品の色味・タイル明・タイル暗）
    const TC={1:'#b4cbe2',2:'#f2c454',3:'#4fe0b0',4:'#78a2ff',5:'#ff9a48',6:'#ff74da',9:'#a29cae'};
    const COL={1:['#566a80','#1a2432'],2:['#86661e','#2c1e06'],3:['#1c7660','#08261e'],4:['#2a46a4','#0c143e'],5:['#a4501a','#381404'],6:['#9c2888','#380a30'],9:['#4a4652','#18161c']};
    const TP={1:10,2:30,3:80,4:200,5:500}, SHIP_PTS=4000;
    const SPEED=[
      {t:0,name:'通常便',sub:'まずは落ち着いて組もう',col:'#00e8c8'},
      {t:Math.round(TIME/3),name:'急ぎ便',sub:'トラックが待っとる！',col:'#e8b830'},
      {t:Math.round(TIME*2/3),name:'最終便',sub:'ラストスパート、組み上げろ！',col:'#e83055'},
    ];
    const DX=[0,1,0,-1], DY=[-1,0,1,0]; // 子部品の向き（0:上 1:右 2:下 3:左）
    const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

    const rnd=(a,b)=>a+Math.random()*(b-a);
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const bd=gs.blocksData=Object.assign({best:0,bestLines:0,plays:0,bestGrade:'',clears:0,bestShip:0,bestChain:0},gs.blocksData||{});

    // ── 効果音（Web Audioで合成。SE音量0なら無音） ──
    let nbuf=null;
    function sfx(name,arg){
      try{
        if(typeof AUDIO_SET!=='undefined'&&AUDIO_SET.se<=0)return;
        if(!AU.ctx&&AU.init)AU.init();
        const ac=AU.ctx;
        if(!ac)return;
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
          case 'lock':tone(170,'square',.045,.07,0,80);noise(.05,.06,0,600);break;
          case 'land':tone(120,'sine',.05,.06,0,70);noise(.03,.04,0,900,1.2);break;
          case 'hard':noise(.18,.18,0,260,.7);tone(110,'sine',.2,.2,0,40);noise(.05,.07,.02,2600,3);break;
          case 'hold':tone(392,'sine',.06,.07);tone(587,'sine',.06,.09,.06);break;
          case 'merge':{const tier=(arg&&arg.tier)||1,ch=(arg&&arg.chain)||1;const up=Math.pow(1.0595,Math.min(14,(ch-1)*3+tier));
            [392,494,587,784].forEach((f,i)=>tone(f*up,'triangle',.07,.14,i*.045));
            noise(.09,.16,0,3400,2.5);tone(90,'square',.06,.09,0,60);break;}
          case 'weld':noise(.04,.06,0,4200,4);break;
          case 'fix':tone(660,'square',.04,.06);tone(990,'square',.04,.1,.07);tone(1320,'triangle',.05,.16,.14);break;
          case 'tick':tone(880,'square',.03,.05);break;
          case 'ship':[523,659,784,1047].forEach((f,i)=>tone(f,'triangle',.08,i===3?.45:.12,i*.09));tone(1568,'sine',.05,.5,.38);tone(220,'sawtooth',.05,.5,.1,215);break;
          case 'beep':tone(1040,'square',.035,.09);tone(1040,'square',.035,.09,.22);break;
          case 'horn':tone(220,'sawtooth',.06,.55,0,215);tone(277,'sawtooth',.045,.55,0,272);break;
          case 'crash':noise(.28,.9,0,300,.5);noise(.18,.6,.12,900,.8);tone(90,'sawtooth',.12,.8,0,30);break;
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
    const se=t2=>{try{AU.se(t2);}catch(_){}};

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
    let W=0,H=0,CH=0,dpr=1,cs=20,wx=0,wy=0,ww=0,wh=0,laneY=0,laneH=40,palY=0,palH=10,BAR=60,fr=4;
    let lyBg=null,lyVig=null,logo=null;const openAt=performance.now();const spr={};
    const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*dpr));c.height=Math.max(1,Math.ceil(h*dpr));const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return [c,g];};
    function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}

    // 部品1マスの絵：段の色のタイルの上に、金属の部品を描く
    function drawCell(g,s,t){
      const r=s*.16,tc=TC[t];
      let gr=g.createLinearGradient(0,0,s*.4,s);gr.addColorStop(0,COL[t][0]);gr.addColorStop(1,COL[t][1]);
      g.fillStyle=gr;rr(g,.5,.5,s-1,s-1,r);g.fill();
      // ヘアライン仕上げ
      g.save();rr(g,.5,.5,s-1,s-1,r);g.clip();g.strokeStyle='rgba(255,255,255,.045)';g.lineWidth=1;
      for(let k=-s;k<s*2;k+=3){g.beginPath();g.moveTo(k,0);g.lineTo(k+s*.5,s);g.stroke();}
      const rg=g.createRadialGradient(s*.5,s*.45,0,s*.5,s*.45,s*.6);rg.addColorStop(0,'rgba(255,255,255,.12)');rg.addColorStop(1,'rgba(0,0,0,.25)');g.fillStyle=rg;g.fillRect(0,0,s,s);
      g.restore();
      // ベベル
      g.lineWidth=Math.max(1,s*.05);
      g.strokeStyle='rgba(255,255,255,.32)';g.beginPath();g.moveTo(s*.1,s-s*.12);g.lineTo(s*.07,s*.07);g.lineTo(s-s*.12,s*.07);g.stroke();
      g.strokeStyle='rgba(0,0,0,.5)';g.beginPath();g.moveTo(s-s*.06,s*.14);g.lineTo(s-s*.06,s-s*.06);g.lineTo(s*.14,s-s*.06);g.stroke();
      g.strokeStyle=tc;g.globalAlpha=t===6?.95:.6;g.lineWidth=Math.max(1,s*(t===6?.07:.04));rr(g,1,1,s-2,s-2,r);g.stroke();g.globalAlpha=1;
      // 金属のグラデーション
      const metal=(x0,y0,x1,y1,tint)=>{const q=g.createLinearGradient(x0,y0,x1,y1);q.addColorStop(0,'#ffffff');q.addColorStop(.28,tint);q.addColorStop(.62,'#2c2a38');q.addColorStop(.85,tint);q.addColorStop(1,'#e8eef8');return q;};
      const ol=()=>{g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=Math.max(1,s*.03);};
      g.save();g.translate(s/2,s/2);
      const u=s*.36;
      if(t===1){ // ネジ（横から見た小ねじ）
        g.rotate(-Math.PI/4);
        g.fillStyle=metal(0,-u*.2,0,u*.2,tc);g.fillRect(-u*.42,-u*.17,u*1.12,u*.34);
        g.beginPath();g.moveTo(u*.7,-u*.17);g.lineTo(u*1.02,0);g.lineTo(u*.7,u*.17);g.closePath();g.fill();
        ol();g.strokeRect(-u*.42,-u*.17,u*1.12,u*.34);
        g.strokeStyle='rgba(20,24,34,.7)';g.lineWidth=Math.max(1,s*.035);
        for(let x=-u*.3;x<u*.72;x+=u*.15){g.beginPath();g.moveTo(x,-u*.17);g.lineTo(x+u*.08,u*.17);g.stroke();}
        g.fillStyle=metal(0,-u*.52,0,u*.52,tc);rr(g,-u*.96,-u*.52,u*.56,u*1.04,u*.18);g.fill();ol();g.stroke();
        g.fillStyle='#14121c';g.fillRect(-u*.98,-u*.1,u*.2,u*.2);
      }else if(t===2){ // ナット（六角）
        g.fillStyle=metal(-u,-u,u,u,tc);g.beginPath();
        for(let k=0;k<6;k++){const a=k/6*Math.PI*2+Math.PI/6;g.lineTo(Math.cos(a)*u,Math.sin(a)*u);}
        g.closePath();g.fill();ol();g.stroke();
        g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=Math.max(1,s*.03);g.beginPath();g.arc(0,0,u*.8,0,7);g.stroke();
        g.fillStyle='#14121c';g.beginPath();g.arc(0,0,u*.38,0,7);g.fill();
        g.strokeStyle='rgba(200,190,150,.45)';g.lineWidth=Math.max(1,s*.025);g.beginPath();g.arc(0,0,u*.29,0,7);g.stroke();
        g.beginPath();g.arc(0,0,u*.2,0,7);g.stroke();
      }else if(t===3){ // ギア
        g.fillStyle=metal(-u,-u,u,u,tc);g.beginPath();
        for(let k=0;k<10;k++){const a=k/10*Math.PI*2;
          g.lineTo(Math.cos(a-.2)*u*.76,Math.sin(a-.2)*u*.76);g.lineTo(Math.cos(a-.11)*u,Math.sin(a-.11)*u);
          g.lineTo(Math.cos(a+.11)*u,Math.sin(a+.11)*u);g.lineTo(Math.cos(a+.2)*u*.76,Math.sin(a+.2)*u*.76);}
        g.closePath();g.fill();ol();g.stroke();
        g.fillStyle='rgba(8,30,24,.85)';for(let k=0;k<4;k++){const a=k/4*Math.PI*2+Math.PI/4;g.beginPath();g.arc(Math.cos(a)*u*.5,Math.sin(a)*u*.5,u*.13,0,7);g.fill();}
        g.fillStyle=metal(-u*.3,-u*.3,u*.3,u*.3,'#d8fff0');g.beginPath();g.arc(0,0,u*.28,0,7);g.fill();ol();g.stroke();
        g.fillStyle='#14121c';g.beginPath();g.arc(0,0,u*.12,0,7);g.fill();g.fillRect(-u*.04,-u*.2,u*.08,u*.1);
      }else if(t===4){ // モーター
        g.fillStyle='#14121c';g.fillRect(-u*.72,u*.55,u*.98,u*.24);
        g.fillStyle=metal(0,-u*.62,0,u*.62,tc);rr(g,-u*.9,-u*.6,u*1.36,u*1.2,u*.16);g.fill();ol();g.stroke();
        g.strokeStyle='rgba(0,0,0,.38)';g.lineWidth=Math.max(1,s*.035);
        for(let x=-u*.7;x<u*.32;x+=u*.15){g.beginPath();g.moveTo(x,-u*.6);g.lineTo(x,u*.6);g.stroke();}
        g.fillStyle=metal(0,-u*.6,0,u*.6,'#c8d6ff');g.beginPath();g.ellipse(u*.46,0,u*.17,u*.6,0,0,7);g.fill();ol();g.stroke();
        g.fillStyle='#e4ecf6';g.fillRect(u*.6,-u*.1,u*.38,u*.2);ol();g.strokeRect(u*.6,-u*.1,u*.38,u*.2);
        g.fillStyle='#1a2a6a';g.fillRect(-u*.42,-u*.86,u*.46,u*.28);ol();g.strokeRect(-u*.42,-u*.86,u*.46,u*.28);
        g.fillStyle='#ffd65a';g.fillRect(-u*.33,-u*.78,u*.08,u*.12);g.fillStyle='#e83055';g.fillRect(-u*.13,-u*.78,u*.08,u*.12);
      }else if(t===5){ // ロボットアーム
        g.fillStyle=metal(-u*.6,u*.6,u*.6,u,tc);g.beginPath();g.moveTo(-u*.7,u*.98);g.lineTo(u*.5,u*.98);g.lineTo(u*.3,u*.66);g.lineTo(-u*.5,u*.66);g.closePath();g.fill();ol();g.stroke();
        g.lineCap='round';
        const seg=(x0,y0,x1,y1,w)=>{g.strokeStyle='rgba(0,0,0,.65)';g.lineWidth=w+Math.max(2,s*.05);g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();
          g.strokeStyle=metal(x0-w,y0-w,x1+w,y1+w,tc);g.lineWidth=w;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();};
        seg(-u*.2,u*.6,u*.42,-u*.12,u*.34);
        seg(u*.42,-u*.12,-u*.32,-u*.56,u*.26);
        g.lineCap='butt';
        const joint=(x,y,rad)=>{g.fillStyle=metal(x-rad,y-rad,x+rad,y+rad,'#ffe0c0');g.beginPath();g.arc(x,y,rad,0,7);g.fill();ol();g.stroke();g.fillStyle='#14121c';g.beginPath();g.arc(x,y,rad*.35,0,7);g.fill();};
        joint(-u*.2,u*.6,u*.2);joint(u*.42,-u*.12,u*.22);
        g.strokeStyle='#e4ecf6';g.lineWidth=Math.max(1.2,s*.06);g.lineCap='round';
        g.beginPath();g.moveTo(-u*.32,-u*.56);g.lineTo(-u*.72,-u*.86);g.lineTo(-u*.94,-u*.72);g.moveTo(-u*.32,-u*.56);g.lineTo(-u*.74,-u*.42);g.lineTo(-u*.94,-u*.52);g.stroke();
        g.lineCap='butt';joint(-u*.32,-u*.56,u*.15);
      }else if(t===6){ // ロボット（完成品）
        g.strokeStyle='#e4ecf6';g.lineWidth=Math.max(1,s*.04);g.beginPath();g.moveTo(0,-u*.74);g.lineTo(0,-u*.96);g.stroke();
        g.fillStyle='#ffe066';g.beginPath();g.arc(0,-u*.98,u*.1,0,7);g.fill();
        g.fillStyle=metal(0,-u*.76,0,-u*.04,tc);rr(g,-u*.56,-u*.76,u*1.12,u*.72,u*.16);g.fill();ol();g.stroke();
        g.fillStyle='#0a1020';rr(g,-u*.42,-u*.62,u*.84,u*.36,u*.1);g.fill();
        g.fillStyle='#62f8ff';g.shadowColor='#62f8ff';g.shadowBlur=s*.12;
        g.beginPath();g.arc(-u*.2,-u*.44,u*.09,0,7);g.arc(u*.2,-u*.44,u*.09,0,7);g.fill();g.shadowBlur=0;
        g.fillStyle=metal(-u*.8,0,-u*.6,u*.6,tc);rr(g,-u*.82,u*.04,u*.22,u*.56,u*.08);g.fill();rr(g,u*.6,u*.04,u*.22,u*.56,u*.08);g.fill();
        g.fillStyle=metal(0,0,0,u*.82,tc);rr(g,-u*.52,0,u*1.04,u*.84,u*.14);g.fill();ol();g.stroke();
        g.fillStyle='#ffd65a';g.beginPath();g.arc(0,u*.38,u*.15,0,7);g.fill();ol();g.stroke();
        g.fillStyle='#14121c';g.fillRect(-u*.36,u*.64,u*.72,u*.06);
      }else{ // 不良品（ひびの入ったギア＋赤札）
        g.fillStyle=metal(-u,-u,u,u,'#8e8a98');g.beginPath();
        for(let k=0;k<8;k++){const a=k/8*Math.PI*2+.3;const rad=(k===3?.55:k===4?.7:1)*u*.86;
          g.lineTo(Math.cos(a-.22)*rad*.78,Math.sin(a-.22)*rad*.78);g.lineTo(Math.cos(a-.1)*rad,Math.sin(a-.1)*rad);g.lineTo(Math.cos(a+.1)*rad,Math.sin(a+.1)*rad);g.lineTo(Math.cos(a+.22)*rad*.78,Math.sin(a+.22)*rad*.78);}
        g.closePath();g.fill();ol();g.stroke();
        g.strokeStyle='#0c0a10';g.lineWidth=Math.max(1.2,s*.05);g.beginPath();g.moveTo(-u*.7,-u*.2);g.lineTo(-u*.25,u*.05);g.lineTo(-u*.32,u*.32);g.lineTo(u*.15,u*.62);g.stroke();
        g.fillStyle='#14121c';g.beginPath();g.arc(0,0,u*.2,0,7);g.fill();
        g.rotate(.22);
        g.strokeStyle='#f4e8d0';g.lineWidth=Math.max(1,s*.025);g.beginPath();g.moveTo(-u*.1,-u*.12);g.lineTo(u*.18,-u*.55);g.stroke();
        g.fillStyle='#e83055';rr(g,u*.06,-u*1.02,u*.9,u*.5,u*.06);g.fill();g.strokeStyle='rgba(60,0,10,.8)';g.lineWidth=Math.max(1,s*.025);g.stroke();
        g.fillStyle='#fff';g.font=`bold ${Math.max(6,Math.round(u*.36))}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('不良',u*.51,-u*.76);
      }
      g.restore();
      // 上面の光沢
      gr=g.createLinearGradient(0,0,0,s*.5);gr.addColorStop(0,'rgba(255,255,255,.2)');gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr;rr(g,1.5,1.5,s-3,s*.42,r*.8);g.fill();
      // 段の目印（左下の点）
      if(t<=5){const dr=Math.max(1,s*.035);for(let k=0;k<t;k++){g.fillStyle='rgba(0,0,0,.6)';g.beginPath();g.arc(s*.13+k*dr*2.7,s*.87,dr+.6,0,7);g.fill();g.fillStyle=tc;g.beginPath();g.arc(s*.13+k*dr*2.7,s*.87,dr,0,7);g.fill();}}
      if(t===6){g.fillStyle='#ffe066';const st=(x,y,R)=>{g.beginPath();for(let k=0;k<8;k++){const a=k/8*Math.PI*2,rad=k%2?R*.35:R;g.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}g.closePath();g.fill();};st(s*.85,s*.15,s*.1);st(s*.14,s*.84,s*.06);}
    }
    function buildSprites(){
      for(const t of [1,2,3,4,5,6,9]){const [c,g]=mkCanvas(cs,cs);drawCell(g,cs,t);spr[t]=c;}
      const [c,g]=mkCanvas(cs,cs);g.fillStyle='#fff';rr(g,.5,.5,cs-1,cs-1,cs*.16);g.fill();spr.w=c;
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
        if(w0<20)return;
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
      g.fillStyle='rgba(232,184,48,.35)';g.fillRect(0,laneY+laneH*.88,W,2);
      g.fillStyle='rgba(232,184,48,.18)';for(let x=0;x<W;x+=26)g.fillRect(x,laneY+laneH*.12,14,2);
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
      cs=Math.floor(Math.min((W-16)/(COLS+3.7),(CH-laneH-topPad-24)/(VIS+.45),60));
      cs=Math.max(14,cs);
      ww=cs*COLS;wh=cs*VIS;wx=Math.round((W-ww)/2);wy=topPad;
      fr=Math.max(4,Math.round(cs*.18));
      palH=Math.max(8,Math.round(cs*.42));palY=wy+wh+2;
      laneY=CH-laneH;
      logo=null;cv.width=Math.round(W*dpr);cv.height=Math.round(CH*dpr);cv.style.width=W+'px';cv.style.height=CH+'px';
      buildSprites();buildBg();
    }

    // ── 状態 ──
    let board=[];for(let y=0;y<ROWS;y++)board.push(new Array(COLS).fill(null));
    let queue=[],cur=null,hold=null,holdUsed=false,defCool=0,stamp=0;
    let phase='title',t=0,clock=0,acc=0,lockT=0,resets=0,lowY=0,settleT=0;
    let score=0,merges=0,shipped=0,chain=0,maxChain=0,fixed=0,pieces=0,rescueUsed=false;
    let mergeData=null,overT=0,overReason='',topRows=0;
    let shake=0,flash=0,danger=false,dangerSeen=false,introT=0;
    let pulse=0,spIdx=0,banner=null,wipe=null,fade=1,hitstop=0,buf=null,lastInput='touch',endReason='',grade='';
    const tut={step:0,t:0,done:[false,false,false,false]};
    const parts=[],pops=[],lifts=[],trails=[],debris=[],flyers=[];
    let lastScoreHtml='',lastTimer='';
    const belt=[];for(let i=0;i<8;i++)belt.push({x:i*70-30,v:22,t:1+(i*3)%5,s:rnd(.7,1)});
    const rain=[];for(let i=0;i<40;i++)rain.push({x:Math.random(),y:Math.random(),s:rnd(.5,.9)});
    const work=()=>Math.floor(merges/4+shipped*3); // 「出荷列数」に相当する仕事量

    // ── 部品の生成 ──
    const WSUM=WEIGHTS.reduce((a,b)=>a+b,0);
    function surfaceTiers(){const s=[];for(let x=0;x<COLS;x++)for(let y=0;y<ROWS;y++){const c=board[y][x];if(c){if(c.t<=4)s.push(c.t);break;}}return s;}
    function rollTier(){
      if(Math.random()<BIAS){const s=surfaceTiers();if(s.length)return s[(Math.random()*s.length)|0];}
      let r=Math.random()*WSUM;for(let i=0;i<WEIGHTS.length;i++){r-=WEIGHTS[i];if(r<0)return i+1;}return 1;
    }
    function genPair(){
      const a=rollTier();let b=Math.random()<SAME?a:rollTier();
      if(t>=DEF_FROM&&defCool<=0&&Math.random()<DEF_RATE){b=9;defCool=DEF_COOL;}else defCool--;
      return {a,b};
    }
    function nextPair(){while(queue.length<3)queue.push(genPair());return queue.shift();}
    const mkCell=tt=>({t:tt,hp:tt===9?2:0,st:stamp,oy:0,vy:0,bump:0,dead:false});

    // ── 操作中の2個組 ──
    function pcells(x,y,o){return [[x,y],[x+DX[o],y+DY[o]]];}
    function free(x,y){return x>=0&&x<COLS&&y>=0&&y<ROWS&&!board[y][x];}
    function fitsP(x,y,o){return free(x,y)&&free(x+DX[o],y+DY[o]);}
    function spawnPair(p){
      for(const x of [2,3,1,4,0,5]){
        if(!fitsP(x,1,0))continue;
        cur={a:p.a,b:p.b,x,y:1,o:0};acc=0;lockT=0;resets=0;
        if(fitsP(x,2,0))cur.y=2;
        lowY=cur.y;return true;
      }
      return false;
    }
    function spawnNext(p){
      p=p||nextPair();
      if(spawnPair(p))return true;
      if(rescues>0){doRescue();if(spawnPair(p))return true;}
      gameOver('topout');return false;
    }
    function onGround(){return !fitsP(cur.x,cur.y+1,cur.o);}
    function touchReset(){if(onGround()&&resets<MAX_RESETS){lockT=0;resets++;}}
    const busy=()=>phase==='settle'||phase==='merge';
    function buffer(a){if(busy()){buf={a,t:clock};return true;}return false;}
    function move(dx,quiet){
      if(phase!=='play'||!cur)return false;
      if(fitsP(cur.x+dx,cur.y,cur.o)){cur.x+=dx;touchReset();if(!quiet)sfx('move');tutDone(0);return true;}
      return false;
    }
    function rotate(dir){
      if(buffer(dir>0?'cw':'ccw'))return false;
      if(phase!=='play'||!cur)return false;
      tutDone(1);
      const o=(cur.o+dir+4)%4;
      // 壁蹴り：子部品の向きと反対へ1マス、だめなら1段上へ
      for(const [kx,ky] of [[0,0],[-DX[o],0],[0,-1]]){
        if(fitsP(cur.x+kx,cur.y+ky,o)){cur.x+=kx;cur.y+=ky;cur.o=o;touchReset();sfx('rotate');return true;}
      }
      // 1マス幅のすき間では上下を入れ替える
      if(cur.o===0||cur.o===2){const a=cur.a;cur.a=cur.b;cur.b=a;touchReset();sfx('rotate');return true;}
      return false;
    }
    function softStep(){
      if(phase!=='play'||!cur)return false;
      if(fitsP(cur.x,cur.y+1,cur.o)){cur.y++;score+=1;if(cur.y>lowY){lowY=cur.y;resets=0;lockT=0;}return true;}
      return false;
    }
    function dropY(){let y=cur.y;while(fitsP(cur.x,y+1,cur.o))y++;return y;}
    // 置いた後の着地点（2個はバラけて、それぞれの列の一番上に落ちる）
    function landing(){
      const top=[];for(let x=0;x<COLS;x++){let y=ROWS-1;while(y>=0&&board[y][x])y--;top[x]=y;}
      return pcells(cur.x,cur.y,cur.o).map(([x,y],i)=>({x,y,t:i?cur.b:cur.a})).sort((p,q)=>q.y-p.y).map(p=>({x:p.x,y:top[p.x]--,t:p.t}));
    }
    function hardDrop(){
      if(phase!=='play'||!cur)return;
      const gy=dropY(),d=gy-cur.y;
      landing().forEach(L=>{const sy=pcells(cur.x,cur.y,cur.o).find(([x])=>x===L.x)[1];if(L.y>sy)trails.push({x:L.x,y0:sy,y1:L.y,t:0,col:TC[L.t]});});
      cur.y=gy;score+=d*2;shake=Math.max(shake,3+Math.min(5,d*.3));hitstop=Math.max(hitstop,.03);
      sfx('hard');tutDone(2);pulse=Math.max(pulse,.3);
      lockPair(true);
    }
    function doHold(){
      if(buffer('hold'))return;
      if(phase!=='play'||!cur)return;
      if(holdUsed){sfx('warn');return;}
      const p={a:cur.a,b:cur.b};
      holdUsed=true;
      if(hold){const h=hold;hold=p;spawnNext(h);}else{hold=p;spawnNext();}
      sfx('hold');se('btn');
    }
    const cellPx=(X,Y)=>[wx+X*cs,wy+(Y-HID)*cs];
    function lockPair(hard){
      stamp++;
      pcells(cur.x,cur.y,cur.o).forEach(([x,y],i)=>{board[y][x]=mkCell(i?cur.b:cur.a);});
      pieces++;
      cur=null;holdUsed=false;
      sfx('lock');se('tool');
      doGravity();
      chain=0;settleT=0;phase='settle';
    }
    // 下が空いている部品を落とす（見た目は oy で少しずつ落ちる）
    function doGravity(){
      for(let x=0;x<COLS;x++){let w=ROWS-1;
        for(let y=ROWS-1;y>=0;y--){const c=board[y][x];if(!c)continue;if(y!==w){board[w][x]=c;board[y][x]=null;c.oy-=(w-y);}w--;}}
    }
    function animFall(dt){
      let any=false,landed=0;
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const c=board[y][x];if(!c||c.oy>=0)continue;
        any=true;c.vy=Math.min(28,c.vy+80*dt);c.oy=Math.min(0,c.oy+c.vy*dt);
        if(c.oy>=0){c.vy=0;landed++;const [px,py]=cellPx(x,y);for(let k=0;k<3;k++)spark(px+rnd(0,cs),py+cs,rnd(-40,40),rnd(-60,-10),.4,'rgba(200,190,220,.7)',2,false);}}
      if(landed)sfx('land');
      return any;
    }
    // 同じ段が3つ以上つながったかたまりを探す
    function findGroups(){
      const seen=new Set(),out=[];
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        const c=board[y][x];if(!c||c.t>5||seen.has(y*COLS+x))continue;
        const g=[],st=[[x,y]];seen.add(y*COLS+x);
        while(st.length){const [px,py]=st.pop();g.push([px,py]);
          for(const [dx,dy] of DIRS){const nx=px+dx,ny=py+dy;if(nx<0||nx>=COLS||ny<0||ny>=ROWS)continue;const k=ny*COLS+nx;if(seen.has(k))continue;
            const n=board[ny][nx];if(n&&n.t===c.t){seen.add(k);st.push([nx,ny]);}}}
        if(g.length>=3){
          // 組み上がる場所＝最後に置いた部品（同時なら下・左）
          let b=g[0];
          for(const p of g){const A=board[p[1]][p[0]],B=board[b[1]][b[0]];if(A.st>B.st||A.st===B.st&&(p[1]>b[1]||p[1]===b[1]&&p[0]<b[0]))b=p;}
          out.push({cells:g,tx:b[0],ty:b[1],tier:c.t});
        }
      }
      return out;
    }
    function resolveStep(){
      const groups=findGroups();
      if(!groups.length){afterResolve();return;}
      chain++;maxChain=Math.max(maxChain,chain);
      const map={};
      groups.forEach(G=>G.cells.forEach(([x,y])=>{map[y*COLS+x]={tx:G.tx,ty:G.ty,target:x===G.tx&&y===G.ty};}));
      mergeData={groups,map,t:0};phase='merge';
      sfx('merge',{tier:Math.max(...groups.map(G=>G.tier)),chain});se('repair');
      tutDone(3);
    }
    function applyMerge(){
      const md=mergeData;mergeData=null;
      const fixes=new Map();
      const mult=chain;
      md.groups.forEach((G,gi)=>{
        const n=G.cells.length,nt=G.tier+1;
        merges++;
        const pts=TP[G.tier]*n*mult;score+=pts;
        // 隣の不良品に「組み立て1回」を数える
        const touched=new Set();
        G.cells.forEach(([x,y])=>DIRS.forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;const c=board[ny]&&board[ny][nx];if(c&&c.t===9)touched.add(ny*COLS+nx);}));
        touched.forEach(k=>fixes.set(k,(fixes.get(k)||0)+1));
        G.cells.forEach(([x,y])=>{if(x!==G.tx||y!==G.ty)board[y][x]=null;});
        const T=board[G.ty][G.tx];stamp++;T.t=nt;T.st=stamp;T.bump=1;
        const [px,py]=cellPx(G.tx,G.ty),mx=px+cs/2,my=py+cs/2;
        for(let k=0;k<10+n*2;k++){const a=rnd(0,Math.PI*2),v=rnd(80,260);spark(mx,my,Math.cos(a)*v,Math.sin(a)*v-60,rnd(.3,.7),k%3?'#ffd27a':TC[nt],rnd(1.5,3),true);}
        if(nt===6)shipRobot(G.tx,G.ty,mult);
        else pop(`${NAME[nt]} 組立！ +${pts}`,my-cs*.3,TC[nt],nt>=4,gi*.18,mx,false,'merge');
      });
      if(chain>=2){const cc=['#44ee88','#00e8c8','#e8b830','#ff9ad0','#ff5a7a'][Math.min(4,chain-2)];pop(`${chain}連鎖組立！ ×${chain}`,wy+wh*.22,cc,true,.2,null,false,'chain');pulse=1;}
      flash=Math.max(flash,.25+Math.min(.4,chain*.08));shake=Math.max(shake,2+chain*1.5);hitstop=Math.max(hitstop,.04+Math.min(.06,chain*.015));
      fixes.forEach((v,k)=>{
        const x=k%COLS,y=(k/COLS)|0,c=board[y][x];if(!c||c.t!==9)return;
        c.hp-=v;const [px,py]=cellPx(x,y);
        if(c.hp<=0){stamp++;c.t=1;c.hp=0;c.st=stamp;c.bump=1;fixed++;
          pop('不良品 修理完了→ネジ',py,C.gn,false,.12,px+cs/2);sfx('fix');
          for(let q=0;q<10;q++)spark(px+cs/2,py+cs/2,rnd(-140,140),rnd(-180,20),rnd(.3,.6),C.gn,2,true);}
        else{c.bump=.6;pop(`あと${c.hp}回`,py,'#ff7a90',false,.12,px+cs/2,true,'merge');sfx('tick');}
      });
    }
    function shipRobot(x,y,mult){
      board[y][x]=null;shipped++;bd.clears++;
      const pts=SHIP_PTS*mult;score+=pts;
      const [px,py]=cellPx(x,y);
      flyers.push({x:px,y:py,t:0});
      addLift(shipped);
      pop(`ロボット完成！ 出荷！ +${pts}`,py,'#ff74da',true,0,px+cs/2);
      flash=.7;shake=Math.max(shake,8);sfx('ship');se('rank');
    }
    function afterResolve(){
      let over=false;for(let x=0;x<COLS;x++)if(board[0][x])over=true;
      if(over){if(rescues>0)doRescue();else{gameOver('topout');return;}}
      phase='play';
      if(!spawnNext())return;
      if(buf&&clock-buf.t<.6){const a=buf.a;buf=null;if(a==='hold')doHold();else rotate(a==='cw'?1:-1);}
      buf=null;
    }
    // やさしい：班長・岩切が上の部品をまとめて引き取ってくれる（1回だけ）
    function doRescue(){
      rescues--;rescueUsed=true;
      for(let y=0;y<HID+5;y++)for(let x=0;x<COLS;x++){const c=board[y][x];if(!c)continue;const [px,py]=cellPx(x,y);
        for(let k=0;k<4;k++)spark(px+cs/2,py+cs/2,rnd(-120,120),rnd(-220,-40),rnd(.4,.8),TC[c.t],2.5,true);board[y][x]=null;}
      pop('班長が上の部品を引き取った！',wy+wh*.3,C.gd,true);pop('（助けは一度だけ）',wy+wh*.3+cs*1.1,C.txb,false,.2);
      sfx('whistle');se('notif');shake=6;
    }
    function gameOver(reason){
      if(phase==='over')return;
      phase='over';overReason=reason;overT=0;topRows=0;cur=null;ptr=null;mergeData=null;
      if(reason==='topout'){sfx('crash');se('warn');shake=10;flash=.3;
        for(let y=0;y<ROWS&&debris.length<16;y++)for(let x=0;x<COLS;x++){const c=board[y][x];if(!c||Math.random()<.5)continue;
          const [px,py]=cellPx(x,y);debris.push({x:px,y:py,vx:rnd(-160,160),vy:rnd(-260,-60),a:0,va:rnd(-8,8),t:c.t});if(debris.length>=16)break;}}
      else{sfx('whistle');se('ach');}
    }

    // ── 演出 ──
    function spark(x,y,vx,vy,life,col,sz,add){
      if(parts.length>280)parts.shift();
      parts.push({x,y,vx,vy,life,max:life,col,sz,add});
    }
    function pop(text,y,col,big,delay,x,small,tag){
      // 連鎖の表示は最新の1つだけ。前の段の組立表示は早めに消して積み上がりすぎないようにする
      if(tag==='chain')for(let i=pops.length-1;i>=0;i--){if(pops[i].tag==='chain')pops.splice(i,1);}
      if(tag==='merge')pops.forEach(p2=>{if(p2.tag==='merge'&&p2.t>=0)p2.t=Math.max(p2.t,.8);});
      // 表示中（待機中も含む）の文字と重なるなら、1行ぶん上へ積んで少し遅らせる
      const lh=p2=>(p2.big?cs*.72:p2.small?cs*.4:cs*.52)*1.45,me={text,y,col,big,small,x,tag,t:-(delay||0)};
      const px0=x==null?wx+ww/2:x;
      for(let k=0;k<8;k++){
        const hit=pops.find(p2=>p2.t<.9&&Math.abs((p2.x==null?wx+ww/2:p2.x)-px0)<cs*3.2&&Math.abs((p2.y-Math.max(0,p2.t)*12)-me.y)<(lh(p2)+lh(me))/2);
        if(!hit)break;
        me.y=hit.y-Math.max(0,hit.t)*12-(lh(hit)+lh(me))/2;me.t=Math.min(me.t,hit.t-.15);
      }
      pops.push(me);if(pops.length>10)pops.shift();}
    function addLift(n){
      const last=lifts[lifts.length-1];
      const delay=Math.max(.55,last?.9-last.t:0);
      lifts.push({n,stack:[6],t:-delay,dur:2.6});
      if(lifts.length>4)lifts.shift();
    }

    // ── 会話シーン ──
    const FACE={normal:'assets/img/char_normal.webp',happy:'assets/img/char_happy.webp',win:'assets/img/char_win.webp',
      tired:'assets/img/char_tired.webp',fear:'assets/img/char_fear.webp',collapse:'assets/img/char_collapse.webp'};
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
        L.push({who:'boss',face:'normal',text:'だんのうら、悪い。組立ラインの子が急に休んでもうて、夜の分が回らへん。'});
        L.push({who:'boss',face:'normal',text:'部品は2個ひと組で流れてくる。同じ部品を3つくっつけたら、1段上の部品に組み上がるんや。'});
        L.push({who:'boss',face:'normal',text:'ネジ→ナット→ギア→モーター→アーム。アーム3本でロボット完成。完成品はフォークで出荷や。'});
        L.push({who:'dan',face:'tired',text:'……設備保全の仕事ちゃうけどな。ええよ、やります。'});
        L.push({who:'dan',face:'normal',text:'（残業代は、娘の上履き代や）'});
      }else if(bd.plays%2===1){
        L.push({who:'boss',face:'normal',text:'また組立の手が足らんのや。……前回の手際、評判よかったで。'});
        L.push({who:'dan',face:'normal',text:'褒めても何も出ませんよ。出るのはロボットだけです。'});
      }else{
        L.push({who:'boss',face:'normal',text:'今夜も頼むわ。最終便は待ってくれへんで。'});
        L.push({who:'dan',face:'tired',text:'（雨の音が、ラインのモーター音に混ざって聞こえる）'});
      }
      L.push({who:'boss',face:L[L.length-1].face,text:'赤札の「不良品」はそのままやと組めへん。隣で2回組み立てたら、直してネジに戻したる。'});
      L.push({who:'sys',face:L[L.length-1].face,text:DIFF==='easy'?'【やさしい】落下ゆっくり・不良品は少なめ。あふれそうになったら一度だけ班長が助けてくれる。':
        DIFF==='normal'?'【ふつう】通常便 → 急ぎ便 → 最終便で、少しずつ落下が速くなる。':'【むずかしい】落下が速く、不良品も多い。連鎖組立で一気に片付けよう。'});
      return L;
    }
    function calcGrade(Lw,reason){
      const order=['C','B','A','S'];
      let g=Lw>=20?3:Lw>=13?2:Lw>=7?1:0;
      if(reason==='topout')g=Math.max(0,g-1);
      return order[g];
    }
    function endingLines(reason,g){
      const L=[];
      if(reason==='topout'){
        L.push({who:'sys',face:'fear',text:'ガガガッ――！　部品があふれて、ラインが緊急停止した。'});
        L.push({who:'boss',face:'collapse',text:'止めろ止めろ！……怪我ないか。部品はええ、お前が無事ならそれでええ。'});
        L.push({who:'dan',face:'tired',text:shipped?`……ロボット${shipped}台は出せた。でも焦ると詰まる。分かってたのにな。`:'……焦ると詰まる。ラインも、人生も一緒やな。'});
      }else if(g==='S'||g==='A'){
        L.push({who:'boss',face:'happy',text:`全便、間に合うた！　ロボット${shipped}台、組立${merges}回やぞ。お前、保全より組立向いとるんちゃうか。`});
        L.push({who:'dan',face:'win',text:'……勘弁してください。でも、カチッとはまる感じ、ちょっと気持ちよかったです。'});
        L.push({who:'dan',face:'happy',text:'（テールランプが雨に滲んで遠ざかる。帰ったら、娘の寝顔を見よう）'});
      }else if(g==='B'){
        L.push({who:'boss',face:'normal',text:`組立${merges}回か。まあまあやな、助かったわ。`});
        L.push({who:'dan',face:'normal',text:'（帰ったら、寝顔だけ見よう。起こさんように）'});
      }else{
        L.push({who:'boss',face:'tired',text:'残りは朝番に回すわ。気にすんな、本業ちゃうんやし。'});
        L.push({who:'dan',face:'tired',text:'……すんません。次は、もうちょっと組めるようにします。'});
      }
      return L;
    }
    function toEnding(){
      phase='ending';endReason=overReason;
      grade=calcGrade(work(),endReason);
      const order='CBAS';
      if(!bd.bestGrade||order.indexOf(grade)>order.indexOf(bd.bestGrade))bd.bestGrade=grade;
      const gc={S:'#e8b830',A:'#00e8c8',B:'#bbaedd',C:'#8a7aa8'}[grade];
      scGrade.style.color=gc;scGrade.querySelector('b').textContent=grade;
      scGrade.querySelector('small').textContent=endReason==='topout'?'ライン停止':'組立評価';
      scGrade.classList.add('on');scGrade.classList.remove('stamp');scGradeT=.5;
      scSum.innerHTML=`出荷 <span>${shipped}</span> 台<br>組立 <span>${merges}</span> 回<br>最大連鎖 <span>${maxChain}</span><br>スコア <span>${score}</span>${score>bd.best?' <em>NEW!</em>':''}<br>`+
        `<small style="color:var(--tx-d)">自己ベスト ${Math.max(bd.best,score)}点</small>`;
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
        spawnNext();
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
    const TOUCH_DAS=260,TOUCH_ARR=.08;
    // タップ位置が操作中の部品の列か、その左右か（-1:左 0:部品の上 1:右）
    function tapSide(x){
      if(!cur)return x<W/2?-1:1;
      const c0=Math.min(cur.x,cur.x+DX[cur.o]),c1=Math.max(cur.x,cur.x+DX[cur.o]);
      const px0=wx+c0*cs-cs*.3,px1=wx+(c1+1)*cs+cs*.3;
      return x<px0?-1:x>px1?1:0;
    }
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();lastInput='touch';
      if(phase==='title'){if(performance.now()-openAt>450)toStory();return;}
      if(phase!=='play'&&!busy())return;
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
        if(Math.abs(dx)>cs*.5&&Math.abs(dx)>Math.abs(dy))ptr.mode='h';
        else if(dy>cs*.7&&dy>Math.abs(dx))ptr.mode='v';
        else if(dy<-cs*1.6&&-dy>Math.abs(dx)*1.5)ptr.mode='up';
      }
      // ドラッグ量に応じてマス単位で移動
      if(ptr.mode==='h'){const want=Math.trunc(dx/(cs*.85));let moved=false;
        while(ptr.cols<want){move(1,true);ptr.cols++;moved=true;}while(ptr.cols>want){move(-1,true);ptr.cols--;moved=true;}
        if(moved)sfx('move');}
      if(ptr.mode==='v'){const want=Math.floor((dy-cs*.4)/(cs*.65));while(ptr.rows<want){softStep();ptr.rows++;}}
    });
    const endPtr=e=>{
      if(!ptr||ptr.id!==e.pointerId)return;
      const p=ptr;ptr=null;
      if(phase!=='play'&&!busy())return;
      const dt=now()-p.t0,dx=p.x-p.x0,dy=p.y-p.y0;
      const s0=p.samples[0],s1=p.samples[p.samples.length-1];
      const vy=(s1[0]-s0[0])>0?(s1[1]-s0[1])/(s1[0]-s0[0]):0;
      if(p.mode==='v'||(!p.mode&&dy>cs*1.2)){
        if(dy>cs*1.5&&vy>.7&&dt<450)hardDrop();
        return;
      }
      if(p.mode==='up'){doHold();return;}
      if(p.mode||p.rep)return;
      if(dt>500||Math.abs(dx)>cs*.5||Math.abs(dy)>cs*.7)return;
      if(busy()){buffer('cw');return;}
      // タップ：部品の列なら回転、左右なら1マス移動
      const sd=tapSide(p.x0);
      if(sd===0)rotate(1);else move(sd);
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
      ['左右にドラッグ／部品の左右をタップで移動','← → で移動（押しっぱなしで連続）'],
      ['部品をタップ、または ↻ ↺ で回転','↑・X で回転、Z で逆回転'],
      ['下へ素早く払うと即落下（ゆっくりなら加速）','Space で即落下、↓ で加速'],
      ['同じ部品を3つつなげると1段上に組立！','同じ部品を3つつなげると1段上に組立！'],
    ];
    function tutDone(i){tut.done[i]=true;}
    function updateTut(dt){
      if(tut.step>=TUT.length)return;
      tut.t+=dt;
      if((tut.done[tut.step]&&tut.t>1.1)||tut.t>(tut.step===3?9:5)){tut.step++;tut.t=0;while(tut.step<TUT.length&&tut.done[tut.step])tut.step++;}
    }

    // ── 更新 ──
    const fallSec=()=>FALL[spIdx];
    function update(dt){
      clock+=dt;
      fade=Math.max(0,fade-dt*1.6);
      if(wipe){wipe.t+=dt;if(!wipe.fired&&wipe.t>=wipe.dur*.5){wipe.fired=true;wipe.mid();}if(wipe&&wipe.t>=wipe.dur)wipe=null;}
      if(scLines){const L=scLines[scIdx];if(scChars<L.text.length){const before=Math.floor(scChars);scChars=Math.min(L.text.length,scChars+dt*34);
        if(Math.floor(scChars)!==before){scLine.textContent=L.text.slice(0,Math.floor(scChars));if(++scBlip%3===0)sfx('blip');}}}
      if(scGradeT>0){scGradeT-=dt;if(scGradeT<=0){scGrade.classList.add('stamp');sfx('stamp');shake=6;}}
      if(phase==='title'||phase==='story'){introT=(performance.now()-openAt)/1000;updateFx(dt);return;}
      if(hitstop>0){hitstop-=dt;updateFx(dt*.3);return;}
      const active=phase==='play'||busy();
      if(active){
        t+=dt;
        updateTut(dt);
        if(spIdx<SPEED.length-1&&t>=SPEED[spIdx+1].t){spIdx++;banner={i:spIdx,t:0};sfx('horn');se('notif');}
        if(t>=TIME){t=TIME;gameOver('timeup');}
      }
      if(phase!=='over'&&phase!=='ending'){
        const falling=animFall(dt);
        if(phase==='settle'&&!falling){settleT+=dt;if(settleT>=.05){settleT=0;resolveStep();}}
      }
      if(phase==='merge'&&mergeData){
        const pt=mergeData.t;mergeData.t+=dt;
        // 溶接の火花
        if(Math.floor(pt*30)!==Math.floor(mergeData.t*30)){
          mergeData.groups.forEach(G=>{const [px,py]=cellPx(G.tx,G.ty);for(let k=0;k<2;k++)spark(px+cs/2+rnd(-cs*.3,cs*.3),py+cs/2+rnd(-cs*.3,cs*.3),rnd(-150,150),rnd(-200,40),rnd(.15,.35),k?'#fff3b0':'#ffb040',rnd(1.2,2.4),true);});
          if(Math.floor(mergeData.t*30)%3===0)sfx('weld');
        }
        if(mergeData.t>=MERGE_T){applyMerge();doGravity();settleT=0;phase='settle';}
      }
      if(phase==='play'&&cur){
        // 長押しで連続移動（タッチ）
        if(ptr&&!ptr.mode){
          const sd=tapSide(ptr.x0);
          if(sd&&now()-ptr.t0>TOUCH_DAS){if(!ptr.rep){ptr.rep=true;ptr.repT=0;}ptr.repT-=dt;if(ptr.repT<=0){move(sd);ptr.repT=TOUCH_ARR;}}
        }
        if(hDir){dasT+=dt;if(dasT>=DAS){arrT+=dt;let n=0;while(arrT>=ARR){arrT-=ARR;if(!move(hDir,n++>0))break;}}}
        let g=1/fallSec();
        if(held.d)g=Math.max(g,22);
        acc+=g*dt;
        while(acc>=1&&cur){
          if(fitsP(cur.x,cur.y+1,cur.o)){cur.y++;acc-=1;if(held.d)score+=1;if(cur.y>lowY){lowY=cur.y;resets=0;lockT=0;}}
          else{acc=0;break;}
        }
        if(cur&&onGround()){lockT+=dt;if(lockT>=LOCK_DELAY||resets>=MAX_RESETS&&lockT>=.08)lockPair(false);}
      }
      if(phase==='over'){
        overT+=dt;
        if(overReason==='topout'){
          const want=Math.min(ROWS,Math.floor(overT/.06));
          while(topRows<want){const y=ROWS-1-topRows;board[y].forEach(c=>{if(c)c.dead=true;});topRows++;}
          if(overT>2.1)toEnding();
        }else if(overT>2.2)toEnding();
      }
      // あふれそうな列（上から3段目まで積まれている）
      let hi=false;for(let x=0;x<COLS;x++)if(board[HID+2][x])hi=true;
      if(hi&&!danger&&phase==='play'&&!dangerSeen){sfx('warn');se('warn');dangerSeen=true;}
      if(!hi)dangerSeen=false;
      danger=hi&&phase!=='ending';
      if(banner){banner.t+=dt;if(banner.t>2)banner=null;}
      updateFx(dt);
      holdBtn.classList.toggle('dim',holdUsed&&phase==='play');
      hud();
    }
    function updateFx(dt){
      shake=Math.max(0,shake-dt*22);flash=Math.max(0,flash-dt*2.2);pulse=Math.max(0,pulse-dt*1.8);
      for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=380*dt;p.vx*=.985;}
      for(let i=pops.length-1;i>=0;i--){pops[i].t+=dt;if(pops[i].t>1.15)pops.splice(i,1);}
      for(let i=lifts.length-1;i>=0;i--){const L=lifts[i];const pt=L.t;L.t+=dt;if(pt<.05&&L.t>=.05)sfx('beep');if(L.t>L.dur)lifts.splice(i,1);}
      for(let i=trails.length-1;i>=0;i--){trails[i].t+=dt;if(trails[i].t>.28)trails.splice(i,1);}
      for(let i=flyers.length-1;i>=0;i--){const f=flyers[i];f.t+=dt;if(f.t>.9)flyers.splice(i,1);else if(Math.random()<.6)spark(f.cx||f.x,f.cy||f.y,rnd(-40,40),rnd(-20,40),.4,'#ffe066',2,true);}
      for(const b of belt){b.x+=dt*b.v;if(b.x>W+30)b.x=-30;}
      for(let i=debris.length-1;i>=0;i--){const d=debris[i];d.x+=d.vx*dt;d.y+=d.vy*dt;d.vy+=620*dt;d.a+=d.va*dt;if(d.y>CH+40)debris.splice(i,1);}
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const c=board[y][x];if(c&&c.bump>0)c.bump=Math.max(0,c.bump-dt*3.2);}
    }

    // ── 描画 ──
    function drawLamps(){
      const xs=[W*.18,W*.5,W*.82];
      xs.forEach((x,i)=>{
        const sw=Math.sin(clock*.9+i*1.7)*.035;
        const flick=(i===2&&Math.sin(clock*13)>.97?.35:1)*(1+pulse*1.6);
        const ly=16+(i===1?0:-3);
        const lx=x+Math.sin(sw)*ly;
        cx.strokeStyle='rgba(90,80,120,.7)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x,0);cx.lineTo(lx,ly);cx.stroke();
        cx.save();cx.globalCompositeOperation='lighter';
        const len=CH*.9,spread=W*.2;
        const ex=lx+Math.sin(sw)*len;
        const gr=cx.createLinearGradient(lx,ly,lx,ly+len);
        const tint=danger?'255,90,110':'255,214,150';
        gr.addColorStop(0,`rgba(${tint},${.16*flick})`);gr.addColorStop(.6,`rgba(${tint},${.04*flick})`);gr.addColorStop(1,'rgba(0,0,0,0)');
        cx.fillStyle=gr;cx.beginPath();cx.moveTo(lx-6,ly+4);cx.lineTo(lx+6,ly+4);cx.lineTo(ex+spread,ly+len);cx.lineTo(ex-spread,ly+len);cx.closePath();cx.fill();
        const rg=cx.createRadialGradient(lx,ly+5,0,lx,ly+5,28);rg.addColorStop(0,`rgba(${tint},${.5*flick})`);rg.addColorStop(1,'rgba(0,0,0,0)');
        cx.fillStyle=rg;cx.fillRect(lx-30,ly-25,60,60);
        cx.restore();
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
      cx.fillStyle='rgba(6,5,16,.86)';cx.fillRect(wx,wy,ww,wh);
      // 作業台の目盛り
      cx.strokeStyle='rgba(138,82,212,.1)';cx.lineWidth=1;cx.beginPath();
      for(let x=1;x<COLS;x++){cx.moveTo(wx+x*cs+.5,wy);cx.lineTo(wx+x*cs+.5,wy+wh);}
      for(let y=1;y<VIS;y++){cx.moveTo(wx,wy+y*cs+.5);cx.lineTo(wx+ww,wy+y*cs+.5);}
      cx.stroke();
      // あふれそうな列を赤く
      for(let x=0;x<COLS;x++){if(!board[HID+2][x]||phase==='ending')continue;
        const a=.18+.12*Math.sin(clock*9);const gr=cx.createLinearGradient(0,wy,0,wy+cs*4);gr.addColorStop(0,`rgba(232,48,85,${a})`);gr.addColorStop(1,'rgba(232,48,85,0)');
        cx.fillStyle=gr;cx.fillRect(wx+x*cs,wy,cs,cs*4);}
      if(active()&&TIME-t<=10){
        cx.font=`${Math.round(cs*4)}px ${MONO}`;cx.textAlign='center';cx.textBaseline='middle';
        cx.fillStyle=`rgba(232,48,85,${.1+.06*Math.sin(clock*8)})`;cx.fillText(String(Math.ceil(TIME-t)),wx+ww/2,wy+wh*.42);
      }
      // 鉄柱フレーム
      for(const fx of [wx-fr,wx+ww]){
        const gr=cx.createLinearGradient(fx,0,fx+fr,0);gr.addColorStop(0,'#4a4466');gr.addColorStop(.45,'#8a84a8');gr.addColorStop(1,'#2a2440');
        cx.fillStyle=gr;cx.fillRect(fx,wy-6,fr,wh+6+palH);
        cx.fillStyle='rgba(20,16,30,.8)';for(let y=wy+cs;y<wy+wh;y+=cs*3){cx.beginPath();cx.arc(fx+fr/2,y,1.3,0,7);cx.fill();}
      }
      // 上端の警戒ストライプ（投入口）
      const sh=5;
      cx.save();cx.beginPath();cx.rect(wx-fr,wy-sh-1,ww+fr*2,sh);cx.clip();
      cx.fillStyle=danger?'#e83055':'#e8b830';cx.fillRect(wx-fr,wy-sh-1,ww+fr*2,sh);
      cx.fillStyle='#16101e';for(let x=wx-fr-10;x<wx+ww+fr;x+=12){cx.beginPath();cx.moveTo(x,wy);cx.lineTo(x+6,wy);cx.lineTo(x+12,wy-sh-1);cx.lineTo(x+6,wy-sh-1);cx.closePath();cx.fill();}
      cx.restore();
      if(danger){
        const a=.25+.2*Math.sin(clock*9);
        cx.strokeStyle=`rgba(232,48,85,${a})`;cx.lineWidth=2;cx.strokeRect(wx-1,wy-1,ww+2,wh+2);
      }
    }
    function drawPallet(){
      const ry=palY+palH;
      cx.fillStyle='#1a1528';cx.fillRect(wx-cs*.6,ry,ww+cs*1.2,5);
      for(let x=wx-cs*.4;x<wx+ww+cs*.5;x+=cs*.7){
        cx.fillStyle='#6a6488';cx.beginPath();cx.arc(x,ry+2.5,2.4,0,7);cx.fill();
        const a=clock*6+x;cx.strokeStyle='rgba(20,16,30,.8)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x,ry+2.5);cx.lineTo(x+Math.cos(a)*2.2,ry+2.5+Math.sin(a)*2.2);cx.stroke();
      }
      // 作業台（鉄の台）
      const px=wx-2,pw=ww+4,db=Math.max(3,palH*.45);
      let gr=cx.createLinearGradient(0,palY,0,palY+db);gr.addColorStop(0,'#8a84a8');gr.addColorStop(1,'#3a3456');
      cx.fillStyle=gr;cx.fillRect(px,palY,pw,db);
      cx.fillStyle='#2a2440';for(const f of [0,.92])cx.fillRect(px+pw*f,palY+db,pw*.08,palH-db);
      cx.fillStyle='rgba(232,184,48,.8)';cx.fillRect(px,palY+palH-2,pw,2);
      cx.font=`${Math.max(7,Math.round(db*1.05))}px ${MONO}`;cx.textAlign='left';cx.textBaseline='middle';cx.fillStyle='rgba(10,8,20,.6)';
      cx.fillText('ASSY LINE 6',px+pw*.6,palY+db/2+.5);
    }
    const active=()=>phase==='play'||busy();
    function drawCellAt(c,px,py,alpha,glow){
      const s=cs*(1+c.bump*.22),o=(s-cs)/2;
      cx.globalAlpha=alpha;
      cx.drawImage(spr[c.t],px-o,py-o,s,s);
      if(c.dead){cx.fillStyle='rgba(30,26,40,.62)';cx.fillRect(px,py,cs,cs);}
      if(c.t===9&&!c.dead){ // 修理までの残り回数
        for(let k=0;k<2;k++){const on=k<c.hp;cx.fillStyle=on?'#ff3a5a':'rgba(68,238,136,.9)';cx.beginPath();cx.arc(px+cs*.16+k*cs*.17,py+cs*.84,Math.max(1.6,cs*.06),0,7);cx.fill();}
      }
      if(glow>0){cx.globalAlpha=alpha*glow*(.45+.25*Math.sin(clock*40));cx.drawImage(spr.w,px,py,cs,cs);}
      if(c.bump>.5){cx.globalAlpha=(c.bump-.5)*1.4;cx.drawImage(spr.w,px-o,py-o,s,s);}
      cx.globalAlpha=1;
    }
    function drawBoard(){
      cx.save();cx.beginPath();cx.rect(wx,wy,ww,wh);cx.clip();
      const mt=mergeData?Math.min(1,mergeData.t/MERGE_T):0,me=mt*mt;
      const later=[];
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
        const c=board[y][x];if(!c)continue;
        let px=wx+x*cs,py=wy+(y-HID+c.oy)*cs,alpha=1,glow=0;
        const m=mergeData&&mergeData.map[y*COLS+x];
        if(m){if(m.target)glow=.4+mt*.6;else{px+=(m.tx-x)*cs*me;py+=(m.ty-y)*cs*me;alpha=1-me*.6;later.push([c,px,py,alpha]);continue;}}
        drawCellAt(c,px,py,alpha,glow);
      }
      // 寄っていく部品は上に重ねて描く
      later.forEach(([c,px,py,a])=>drawCellAt(c,px,py,a,mt*.8));
      // 溶接の光
      if(mergeData){cx.save();cx.globalCompositeOperation='lighter';
        mergeData.groups.forEach(G=>{const [px,py]=cellPx(G.tx,G.ty);const rg=cx.createRadialGradient(px+cs/2,py+cs/2,0,px+cs/2,py+cs/2,cs*(1+mt));
          rg.addColorStop(0,`rgba(255,220,140,${.5*mt})`);rg.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=rg;cx.fillRect(px-cs*2,py-cs*2,cs*5,cs*5);});
        cx.restore();}
      // 即落下の残像
      for(const tr of trails){
        const a=1-tr.t/.28;const y0=wy+(tr.y0-HID)*cs,y1=wy+(tr.y1-HID)*cs;
        const gr=cx.createLinearGradient(0,y0,0,y1+cs);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,tr.col);
        cx.globalAlpha=a*.4;cx.fillStyle=gr;cx.fillRect(wx+tr.x*cs+3,y0,cs-6,y1-y0+cs);
      }
      cx.globalAlpha=1;
      if(cur&&phase==='play'){
        // 着地点のゴースト（2個がバラけて落ちる先）
        for(const L of landing()){if(L.y<HID)continue;const [px,py]=cellPx(L.x,L.y);
          cx.globalAlpha=.22;cx.drawImage(spr[L.t],px,py,cs,cs);cx.globalAlpha=.7;
          cx.strokeStyle=TC[L.t];cx.lineWidth=1.5;cx.setLineDash([3,2]);rr(cx,px+1.5,py+1.5,cs-3,cs-3,cs*.14);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1;}
        drawPair();
      }
      cx.restore();
      // 隠し段にはみ出した部品は枠の上に半透明で
      if(cur&&phase==='play'){
        cx.globalAlpha=.5;
        pcells(cur.x,cur.y,cur.o).forEach(([x,y],i)=>{if(y!==HID-1)return;cx.drawImage(spr[i?cur.b:cur.a],wx+x*cs,wy-cs+pairFrac()*cs,cs,cs);});
        cx.globalAlpha=1;
      }
    }
    // 自然落下のなめらかさ（1段の途中の位置）
    function pairFrac(){return cur&&fitsP(cur.x,cur.y+1,cur.o)?Math.min(.95,acc):0;}
    function drawPair(){
      const ground=onGround(),fy=pairFrac();
      pcells(cur.x,cur.y,cur.o).forEach(([x,y],i)=>{
        const px=wx+x*cs,py=wy+(y-HID+fy)*cs;
        cx.drawImage(spr[i?cur.b:cur.a],px,py,cs,cs);
        if(ground){cx.globalAlpha=.25*Math.min(1,lockT/LOCK_DELAY)*(.6+.4*Math.sin(clock*20));cx.drawImage(spr.w,px,py,cs,cs);cx.globalAlpha=1;}
        if(!i){cx.strokeStyle='rgba(255,255,255,.55)';cx.lineWidth=1.5;rr(cx,px+1,py+1,cs-2,cs-2,cs*.16);cx.stroke();}
      });
      // つなぎ目の金具
      const [ax,ay]=[wx+cur.x*cs+cs/2,wy+(cur.y-HID+fy)*cs+cs/2],bx=ax+DX[cur.o]*cs/2,by=ay+DY[cur.o]*cs/2;
      cx.fillStyle='#e8b830';cx.strokeStyle='#16101e';cx.lineWidth=1;cx.beginPath();cx.arc(bx,by,Math.max(2,cs*.08),0,7);cx.fill();cx.stroke();
    }
    function drawMiniPair(p,cxm,cym,ms,alpha){
      if(!p)return;
      cx.globalAlpha=alpha==null?1:alpha;
      cx.drawImage(spr[p.b],cxm-ms/2,cym-ms,ms,ms);cx.drawImage(spr[p.a],cxm-ms/2,cym,ms,ms);
      cx.globalAlpha=1;
    }
    function panel(x,y,w,h,label,col){
      cx.fillStyle='rgba(10,7,22,.88)';rr(cx,x,y,w,h,5);cx.fill();
      cx.strokeStyle=col;cx.globalAlpha=.55;cx.lineWidth=1;rr(cx,x+.5,y+.5,w-1,h-1,5);cx.stroke();cx.globalAlpha=1;
      cx.fillStyle=col;cx.fillRect(x+5,y,Math.min(w-10,30),2);
      cx.font=`${Math.max(9,Math.round(cs*.3))}px ${MONO}`;cx.textAlign='left';cx.textBaseline='top';cx.fillStyle=col;cx.fillText(label,x+6,y+4);
    }
    function drawSide(){
      const pw=Math.max(40,Math.min(wx-fr-8,cs*3.1)),lx=wx-fr-4-pw,rx=wx+ww+fr+4,rw=pw;
      const lab=Math.max(9,Math.round(cs*.3))+8;
      const ms=Math.min(cs*.72,(pw-10)/1.2);
      // HOLD
      const hh=lab+ms*2+10;
      panel(lx,wy,pw,hh,'HOLD',holdUsed?C.txd:C.cy);
      drawMiniPair(hold,lx+pw/2,wy+lab+ms+3,ms,holdUsed?.35:1);
      // NEXT（2組）
      const m2=ms*.8,nh=lab+ms*2+m2*2+18;
      panel(rx,wy,rw,nh,'NEXT',C.gd);
      drawMiniPair(queue[0],rx+rw/2,wy+lab+ms+3,ms,1);
      drawMiniPair(queue[1],rx+rw/2,wy+lab+ms*2+m2+12,m2,.75);
      // 実績
      let y=wy+hh+10;const sh=Math.min(palY-y-4,cs*6);
      const big=Math.max(15,Math.round(cs*.6)),sm=Math.max(9,Math.round(cs*.3));
      cx.fillStyle='rgba(10,7,22,.82)';rr(cx,lx,y-4,pw,sh,5);cx.fill();
      cx.strokeStyle='rgba(138,82,212,.3)';cx.lineWidth=1;rr(cx,lx+.5,y-3.5,pw-1,sh-1,5);cx.stroke();y+=2;
      const stat=(label,val,col,f)=>{
        if(y+sm+f>wy+hh+6+sh)return;
        cx.textAlign='left';cx.textBaseline='top';cx.font=`${sm}px ${FONT}`;cx.fillStyle=C.txd;cx.fillText(label,lx+5,y);
        cx.font=`${f}px ${MONO}`;cx.fillStyle=col;cx.fillText(val,lx+5,y+sm+2);y+=sm+f+8;
      };
      stat('出荷',shipped+'台','#ff74da',big);
      stat('組立',String(merges),C.cy,big);
      stat('最大連鎖',String(maxChain),C.gn,Math.round(big*.85));
      stat('SCORE',String(score),C.gd,Math.max(12,Math.round(cs*.42)));
      if(chain>=2&&busy()){cx.font=`${sm}px ${FONT}`;cx.fillStyle=C.gn;cx.fillText(chain+'連鎖中',lx+5,y);}
      // 組立の順番（左下）
      const ly0=wy+hh+10+sh+6,lms=Math.min(cs*.5,(palY-ly0-4)/6.4);
      if(lms>=10){
        for(let k=1;k<=6;k++){const yy=ly0+(k-1)*lms*1.07;cx.drawImage(spr[k],lx+2,yy,lms,lms);
          if(pw>lms+24){cx.font=`${Math.max(8,Math.round(lms*.55))}px ${FONT}`;cx.textAlign='left';cx.textBaseline='middle';cx.fillStyle=TC[k];cx.fillText(NAME[k],lx+lms+4,yy+lms/2,pw-lms-7);}}
      }
      // 残り時間ゲージ（右側）
      const gy=wy+nh+lab+6,gh=Math.max(40,palY-gy-18);
      if(gh>40){
        const f=Math.max(0,1-t/TIME);
        cx.fillStyle='rgba(10,7,22,.85)';rr(cx,rx+rw/2-7,gy,14,gh,4);cx.fill();
        const col=f<.12?C.rd:f<.35?C.gd:C.cy;
        cx.fillStyle=col;cx.globalAlpha=.85;rr(cx,rx+rw/2-5,gy+2+(gh-4)*(1-f),10,(gh-4)*f,3);cx.fill();cx.globalAlpha=1;
        SPEED.forEach((S,i)=>{if(!i)return;const yy=gy+2+(gh-4)*(S.t/TIME);cx.fillStyle=S.col;cx.fillRect(rx+rw/2-10,yy,20,2);
          cx.font=`${Math.max(8,Math.round(cs*.26))}px ${FONT}`;cx.textAlign='left';cx.textBaseline='middle';cx.fillText(S.name.slice(0,2),rx+rw/2+11,yy+1);});
        cx.font=`${sm}px ${FONT}`;cx.textAlign='center';cx.textBaseline='top';cx.fillStyle=C.txd;cx.fillText('定時',rx+rw/2,gy+gh+3);
      }
    }
    function drawForklift(x,base,s,stack){
      cx.save();cx.translate(x,base);
      const wr=s*.16;
      cx.fillStyle='rgba(0,0,0,.4)';cx.beginPath();cx.ellipse(s*.1,0,s*.85,s*.08,0,0,7);cx.fill();
      cx.fillStyle='#4a4466';cx.fillRect(s*.52,-s*1.05,s*.07,s*1.0);
      cx.fillStyle='#6a6488';cx.fillRect(s*.6,-s*1.0,s*.05,s*.95);
      const fy=-s*.18;
      cx.fillStyle='#8a84a8';cx.fillRect(s*.62,fy,s*.62,s*.05);
      // 荷を載せたパレット（完成ロボット）
      const cb=s*.5;
      cx.fillStyle='#8a6038';cx.fillRect(s*.66,fy-s*.07,s*.56,s*.07);
      stack.forEach(tp=>cx.drawImage(spr[tp],s*.69,fy-s*.07-cb,cb,cb));
      let gr=cx.createLinearGradient(0,-s*.6,0,0);gr.addColorStop(0,'#ffcc3a');gr.addColorStop(1,'#b8780e');
      cx.fillStyle=gr;rr(cx,-s*.55,-s*.5,s*1.08,s*.4,s*.06);cx.fill();
      cx.fillStyle='#2a2440';rr(cx,-s*.62,-s*.56,s*.32,s*.42,s*.06);cx.fill();
      cx.fillStyle='#16101e';cx.fillRect(-s*.5,-s*.32,s*.96,s*.06);
      cx.font=`bold ${Math.round(s*.13)}px ${MONO}`;cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='rgba(40,20,0,.6)';cx.fillText('FL-02',s*.12,-s*.4);
      cx.strokeStyle='#3a3456';cx.lineWidth=Math.max(1.5,s*.04);
      cx.beginPath();cx.moveTo(-s*.25,-s*.5);cx.lineTo(-s*.28,-s*1.02);cx.lineTo(s*.42,-s*1.02);cx.lineTo(s*.42,-s*.5);cx.stroke();
      cx.fillStyle='#2b2a44';cx.fillRect(s*.0,-s*.78,s*.17,s*.28);
      cx.fillStyle='#e9c6a4';cx.beginPath();cx.arc(s*.09,-s*.86,s*.09,0,7);cx.fill();
      cx.fillStyle='#e8b830';cx.beginPath();cx.arc(s*.09,-s*.9,s*.1,Math.PI,0);cx.fill();
      const on=Math.sin(clock*12)>0;
      cx.fillStyle=on?'#ff9a2a':'#7a3a0a';cx.fillRect(s*.05,-s*1.1,s*.1,s*.08);
      if(on){cx.save();cx.globalCompositeOperation='lighter';const rg=cx.createRadialGradient(s*.1,-s*1.06,0,s*.1,-s*1.06,s*.5);rg.addColorStop(0,'rgba(255,150,40,.45)');rg.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=rg;cx.fillRect(-s*.4,-s*1.56,s,s);cx.restore();}
      for(const wx2 of [-s*.38,s*.36]){
        cx.fillStyle='#120e1c';cx.beginPath();cx.arc(wx2,-wr,wr,0,7);cx.fill();
        cx.fillStyle='#6a6488';cx.beginPath();cx.arc(wx2,-wr,wr*.45,0,7);cx.fill();
        const a=x/wr;cx.strokeStyle='#16101e';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(wx2,-wr);cx.lineTo(wx2+Math.cos(a)*wr*.45,-wr+Math.sin(a)*wr*.45);cx.stroke();
      }
      cx.save();cx.globalCompositeOperation='lighter';
      gr=cx.createLinearGradient(s*.5,0,s*1.6,0);gr.addColorStop(0,'rgba(255,240,200,.28)');gr.addColorStop(1,'rgba(255,240,200,0)');
      cx.fillStyle=gr;cx.beginPath();cx.moveTo(s*.5,-s*.42);cx.lineTo(s*1.6,-s*.6);cx.lineTo(s*1.6,-s*.05);cx.closePath();cx.fill();cx.restore();
      cx.restore();
    }
    function drawTruck(base,s){
      const tw=s*1.5,th=s*1.25,x=W-tw*.72,y=base-th-s*.12;
      let gr=cx.createLinearGradient(x,0,x+tw,0);gr.addColorStop(0,'#3a3456');gr.addColorStop(1,'#1c1830');
      cx.fillStyle=gr;cx.fillRect(x,y,tw,th);
      gr=cx.createLinearGradient(x,0,x+tw*.6,0);gr.addColorStop(0,'rgba(255,214,150,.38)');gr.addColorStop(1,'rgba(255,214,150,.04)');
      cx.fillStyle='#0d0a18';cx.fillRect(x+4,y+4,tw*.6,th-8);cx.fillStyle=gr;cx.fillRect(x+4,y+4,tw*.6,th-8);
      // 積み込み済みのロボット
      const cb=s*.3;
      for(let i=0;i<Math.min(shipped,6);i++){const c=i%2,r=(i/2)|0;cx.drawImage(spr[6],x+6+c*cb,y+th-6-(r+1)*cb,cb,cb);}
      cx.strokeStyle='#5a5478';cx.lineWidth=2;cx.strokeRect(x+1,y+1,tw-2,th-2);
      cx.fillStyle='#e8b830';cx.fillRect(x,y+th-4,tw,4);
      cx.fillStyle='#16101e';for(let k=0;k<tw;k+=10)cx.fillRect(x+k,y+th-4,5,4);
      cx.fillStyle='rgba(232,48,85,.85)';cx.fillRect(x+2,y+th+1,5,3);
      cx.fillStyle='#0c0a14';for(const k of [.55,.8]){cx.beginPath();cx.arc(x+tw*k,base-s*.1,s*.13,0,7);cx.fill();}
      cx.font=`${Math.round(Math.max(8,s*.2))}px ${FONT}`;cx.textAlign='right';cx.textBaseline='bottom';cx.fillStyle='rgba(222,204,248,.6)';
      cx.fillText(`${SPEED[spIdx].name} 積込中`,W-4,y-2);
    }
    function drawLane(){
      const base=laneY+laneH*.82;
      const s=Math.max(26,Math.min(laneH*1.05,base-(palY+palH+8)));
      drawTruck(base,s);
      for(const L of lifts){
        if(L.t<0)continue;
        const f=L.t/L.dur;
        const e=f<.3?1-Math.pow(1-f/.3,2):f<.45?1:Math.pow((f-.45)/.55,1.8);
        const x=f<.3?-s*1.6+(W*.32+s*1.6)*e:f<.45?W*.32:W*.32+(W+s*2-W*.32)*e;
        drawForklift(x,base,s,L.stack);
        const ta=f<.12?f/.12:f>.85?(1-f)/.15:1;
        const bob=Math.sin(L.t*8)*2;
        cx.globalAlpha=Math.max(0,ta);
        const tx=x+s*.4,ty=base-s*1.45+bob;
        const label='出荷！';
        cx.font=`${Math.round(Math.max(13,s*.36))}px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';
        const tw=cx.measureText(label).width+14;
        cx.fillStyle='rgba(255,116,218,.95)';rr(cx,tx-tw/2,ty-12,tw,22,6);cx.fill();
        cx.beginPath();cx.moveTo(tx-5,ty+10);cx.lineTo(tx+5,ty+10);cx.lineTo(tx-2,ty+16);cx.closePath();cx.fill();
        cx.fillStyle='#0a0714';cx.fillText(label,tx,ty);
        cx.font=`${Math.round(Math.max(9,s*.24))}px ${MONO}`;cx.fillStyle=C.txb;cx.fillText(L.n+'台目',tx+tw/2+18,ty);
        cx.globalAlpha=1;
      }
    }
    // 完成したロボットが作業台からフォークの方へ飛んでいく
    function drawFlyers(){
      for(const f of flyers){
        const p=Math.min(1,f.t/.9),e=p*p*(3-2*p);
        const tx=W*.32+cs*.4,ty=laneY+laneH*.3;
        const x=f.x+(tx-f.x)*e,y=f.y+(ty-f.y)*e-Math.sin(p*Math.PI)*cs*2.2;
        f.cx=x+cs/2;f.cy=y+cs/2;
        const s=cs*(1+Math.sin(p*Math.PI)*.5);
        cx.save();cx.globalCompositeOperation='lighter';const rg=cx.createRadialGradient(x+cs/2,y+cs/2,0,x+cs/2,y+cs/2,s);
        rg.addColorStop(0,'rgba(255,116,218,.5)');rg.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=rg;cx.fillRect(x+cs/2-s,y+cs/2-s,s*2,s*2);cx.restore();
        cx.globalAlpha=p>.85?(1-p)/.15:1;cx.drawImage(spr[6],x+cs/2-s/2,y+cs/2-s/2,s,s);cx.globalAlpha=1;
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
        const a=p.t<.12?p.t/.12:p.t>.8?Math.max(0,(1.15-p.t)/.35):1;
        const sc=p.t<.12?1.2-p.t/.12*.2:1;
        let fs=Math.max(10,Math.round((p.big?cs*.72:p.small?cs*.4:cs*.52)*sc));
        cx.font=`${fs}px ${FONT}`;
        let tw=cx.measureText(p.text).width;
        if(tw>ww-6){fs=Math.max(9,Math.floor(fs*(ww-6)/tw));cx.font=`${fs}px ${FONT}`;tw=cx.measureText(p.text).width;}
        cx.globalAlpha=a;
        // 作業台（ウェル）の中に収める（入りきらない長さなら画面内）
        const x=tw<ww-4?clamp(p.x==null?wx+ww/2:p.x,wx+tw/2+2,wx+ww-tw/2-2):clamp(p.x==null?wx+ww/2:p.x,tw/2+4,W-tw/2-4);
        const y=clamp(p.y-p.t*12,wy+fs*.6,wy+wh-fs*.6);
        cx.lineJoin='round';cx.lineWidth=Math.max(4,fs*.28);cx.strokeStyle='rgba(5,4,14,.95)';
        cx.shadowColor='rgba(0,0,0,.9)';cx.shadowBlur=6;cx.shadowOffsetY=2;cx.strokeText(p.text,x,y);cx.shadowOffsetY=0;
        cx.shadowColor=p.col;cx.shadowBlur=p.small?4:12;cx.fillStyle=p.col;cx.fillText(p.text,x,y);cx.shadowBlur=0;
      }
      cx.globalAlpha=1;
    }
    // タイトル（ロゴ）カード
    function drawTitle(){
      if(phase!=='title')return;
      cx.fillStyle='rgba(5,4,14,.72)';cx.fillRect(0,0,W,CH);
      const pw=Math.min(W-24,380),ph=Math.min(CH-24,384),px=(W-pw)/2,py=Math.max(10,(CH-ph)/2-6);
      cx.fillStyle='rgba(10,7,22,.96)';rr(cx,px,py,pw,ph,10);cx.fill();
      cx.strokeStyle='rgba(138,82,212,.8)';cx.lineWidth=1;rr(cx,px+.5,py+.5,pw-1,ph-1,10);cx.stroke();
      for(const sy of [py,py+ph-6]){cx.save();cx.beginPath();cx.rect(px+8,sy,pw-16,6);cx.clip();cx.fillStyle='#e8b830';cx.fillRect(px,sy,pw,6);
        cx.fillStyle='#16101e';for(let x=px-14+(clock*18)%12;x<px+pw;x+=12){cx.beginPath();cx.moveTo(x,sy+6);cx.lineTo(x+6,sy+6);cx.lineTo(x+12,sy);cx.lineTo(x+6,sy);cx.closePath();cx.fill();}cx.restore();}
      cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`10px ${MONO}`;cx.fillStyle=C.txd;cx.fillText('DANNOURA WORKS ─ 第2工場 深夜組立ライン',W/2,py+22);
      // 組立の順番（ネジ→…→ロボット）が順に降ってくる
      const ms=Math.min(34,(pw-28)/8.5),gap=ms*.5,tot=ms*6+gap*5,bx=W/2-tot/2,by=py+40;
      for(let k=1;k<=6;k++){
        const lt=introT-.14*(k-1);if(lt<=0)continue;
        const fall=Math.min(1,lt/.35),bounce=fall>=1?Math.max(0,Math.sin(Math.min(1,(lt-.35)/.2)*Math.PI))*ms*.12:0;
        const x=bx+(k-1)*(ms+gap),y=by-(1-fall*fall)*(by-py+ms)-bounce;
        cx.drawImage(spr[k],x,y,ms,ms);
        if(k<6&&fall>=1){cx.font=`${Math.round(ms*.42)}px ${FONT}`;cx.fillStyle=C.txd;cx.fillText('▸',x+ms+gap/2,by+ms/2);}
        cx.font=`${Math.max(8,Math.round(ms*.3))}px ${FONT}`;cx.fillStyle=TC[k];cx.globalAlpha=fall;cx.fillText(NAME[k],x+ms/2,by+ms+9);cx.globalAlpha=1;
      }
      const ly=by+ms+46,fs=Math.min(36,pw/9.8);
      const la=Math.min(1,Math.max(0,(introT-.9)/.4));
      cx.globalAlpha=la;
      if(!logo||logo._fs!==fs){
        const TXT='部品組み立てライン';
        const lw=Math.ceil(fs*9.8),lh=Math.ceil(fs*1.8);let g;[logo,g]=mkCanvas(lw,lh);logo._fs=fs;logo._w=lw;logo._h=lh;
        g.font=`${fs}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';const mx=lw/2,my=lh/2;
        g.lineJoin='round';g.lineWidth=8;g.strokeStyle='#05040e';g.strokeText(TXT,mx,my);
        g.lineWidth=3;g.strokeStyle='#8a52d4';g.strokeText(TXT,mx,my);
        const lg=g.createLinearGradient(0,my-fs/2,0,my+fs/2);lg.addColorStop(0,'#fff6d8');lg.addColorStop(.45,'#ffd65a');lg.addColorStop(.55,'#c88a12');lg.addColorStop(1,'#ffe9a0');
        g.shadowColor='rgba(232,184,48,.6)';g.shadowBlur=16;g.fillStyle=lg;g.fillText(TXT,mx,my);g.shadowBlur=0;
      }
      cx.drawImage(logo,W/2-logo._w/2,ly-logo._h/2,logo._w,logo._h);
      const sx=((introT*.6)%2)*pw*1.4+px-pw*.2;
      cx.save();cx.globalCompositeOperation='lighter';const sg=cx.createLinearGradient(sx-30,0,sx+30,0);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,.22)');sg.addColorStop(1,'rgba(255,255,255,0)');
      cx.fillStyle=sg;cx.fillRect(px,ly-fs/2-2,pw,fs+4);cx.restore();
      cx.font=`10px ${MONO}`;cx.fillStyle=C.cy;cx.fillText('PARTS ASSEMBLY : NIGHT SHIFT',W/2,ly+fs*.62+4);
      cx.globalAlpha=1;
      let y=ly+fs*.62+28;
      const badge=(txt,col)=>{cx.font=`11px ${FONT}`;const tw=cx.measureText(txt).width+18;cx.fillStyle=col;cx.globalAlpha=.16;rr(cx,W/2-tw/2,y-10,tw,20,10);cx.fill();cx.globalAlpha=1;
        cx.strokeStyle=col;rr(cx,W/2-tw/2+.5,y-9.5,tw-1,19,10);cx.stroke();cx.fillStyle=col;cx.fillText(txt,W/2,y+.5);};
      badge(`難しさ：${DIFF_NAME}　制限時間 ${TIME}秒`,DIFF==='hard'?'#ff7a90':DIFF==='normal'?C.gd:C.cy);
      y+=26;
      cx.font=`11px ${FONT}`;
      const how=['同じ部品が3つつながると 1段上に組立','ロボット完成で フォークリフトが出荷！','赤札の不良品は 隣で2回組み立てると直る','部品があふれると ライン停止で終了'];
      how.forEach((s2,i)=>{cx.fillStyle=i===1?'#ff9ae4':C.tx;cx.fillText(s2,W/2,y+i*17);});
      y+=17*how.length+6;
      cx.fillStyle=C.txd;cx.font=`11px ${FONT}`;
      cx.fillText(bd.plays?`自己ベスト ${bd.best}点 / ロボット${bd.bestShip}台${bd.bestGrade?'　最高評価 '+bd.bestGrade:''}`:'はじめての組立作業',W/2,y);
      const ty=Math.min(py+ph-22,y+26);
      cx.font=`15px ${FONT}`;cx.fillStyle=`rgba(222,204,248,${.55+Math.sin(clock*5)*.35})`;
      cx.fillText(lastInput==='key'?'▶ キーを押して始業':'▶ タップで始業',W/2,ty);
    }
    function drawBanner(){
      if(!banner||phase==='over'||phase==='ending')return;
      const S=SPEED[banner.i],bt=banner.t;
      const inT=Math.min(1,bt/.25),outT=bt>1.6?(bt-1.6)/.4:0;
      const x=(1-inT)*-W+outT*W,y=wy+wh*.3,h=cs*2.2;
      cx.save();cx.translate(x,0);
      cx.fillStyle='rgba(5,4,14,.86)';cx.fillRect(0,y-h/2,W,h);
      cx.fillStyle=S.col;cx.fillRect(0,y-h/2,W,2);cx.fillRect(0,y+h/2-2,W,2);
      cx.globalAlpha=.18;for(let k=-1;k<W/18+1;k++){cx.beginPath();const o=k*18+(clock*40)%18;cx.moveTo(o,y+h/2);cx.lineTo(o+9,y+h/2);cx.lineTo(o+21,y-h/2);cx.lineTo(o+12,y-h/2);cx.closePath();cx.fill();}
      cx.globalAlpha=1;cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`${Math.round(Math.min(cs*.85,W/11))}px ${FONT}`;cx.shadowColor=S.col;cx.shadowBlur=14;cx.fillStyle=S.col;cx.fillText(S.name+(banner.i?' 到着！':' 作業開始！'),W/2,y-cs*.3);cx.shadowBlur=0;
      cx.font=`${Math.round(cs*.42)}px ${FONT}`;cx.fillStyle=C.txb;cx.fillText(S.sub,W/2,y+cs*.55);
      cx.restore();
    }
    function drawTut(){
      if(!active())return;
      if(tut.step>=TUT.length)return;
      const txt=TUT[tut.step][lastInput==='key'?1:0];
      const a=Math.min(1,tut.t*4)*(tut.done[tut.step]?Math.max(0,1-(tut.t-.6)*2):1);
      if(a<=0)return;
      const fs=Math.max(10,Math.round(Math.min(cs*.36,(W-60)/txt.length)));
      cx.globalAlpha=a;cx.font=`${fs}px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';
      const tw=Math.min(W-12,cx.measureText(txt).width+44),y=wy+wh-cs*.9,bh=fs*2;
      cx.fillStyle='rgba(10,7,22,.92)';rr(cx,W/2-tw/2,y-bh/2,tw,bh,bh/2);cx.fill();
      cx.strokeStyle=C.cy;cx.lineWidth=1;rr(cx,W/2-tw/2+.5,y-bh/2+.5,tw-1,bh-1,bh/2);cx.stroke();
      cx.fillStyle=C.cy;cx.fillText(`${tut.step+1}/4`,W/2-tw/2+16,y+.5);
      cx.fillStyle=tut.done[tut.step]?C.gn:C.txb;cx.fillText((tut.done[tut.step]?'✓ ':'')+txt,W/2+12,y+.5);
      cx.globalAlpha=1;
    }
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
    // 背景のベルトコンベア（流れる部品）と機械の表示灯
    function drawBelt(){
      const y=CH*.36;
      cx.fillStyle='rgba(30,24,52,.85)';cx.fillRect(0,y,W,4);
      cx.fillStyle='rgba(90,80,130,.45)';for(let x=-((clock*22)%10);x<W;x+=10)cx.fillRect(x,y+1,4,1.5);
      cx.globalAlpha=.5;
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
      cx.font=`${Math.round(Math.min(cs*1.0,W/9)*sc)}px ${FONT}`;cx.lineWidth=5;cx.strokeStyle='rgba(5,4,14,.95)';
      const msg=top?'ライン停止！':'定時！ 作業終了';
      cx.strokeText(msg,W/2,wy+wh*.4);cx.fillStyle=top?'#ff7a90':C.gd;cx.shadowColor=cx.fillStyle;cx.shadowBlur=14;cx.fillText(msg,W/2,wy+wh*.4);cx.shadowBlur=0;
      const sub=`出荷 ${shipped}台　組立 ${merges}回`;
      cx.font=`${Math.round(cs*.5)}px ${FONT}`;cx.fillStyle=C.txb;cx.strokeText(sub,W/2,wy+wh*.4+cs*1.2);cx.fillText(sub,W/2,wy+wh*.4+cs*1.2);
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
      drawFlyers();
      for(const d of debris){cx.save();cx.translate(d.x+cs/2,d.y+cs/2);cx.rotate(d.a);cx.drawImage(spr[d.t],-cs/2,-cs/2,cs,cs);cx.restore();}
      drawPops();
      drawTut();
      drawBanner();
      cx.drawImage(lyVig,0,0,W,CH);
      if(pulse>0){cx.strokeStyle=`rgba(0,232,200,${pulse*.7})`;cx.lineWidth=2+pulse*4;cx.strokeRect(wx-2,wy-2,ww+4,wh+4);}
      if(flash>0){cx.globalCompositeOperation='lighter';cx.fillStyle=`rgba(255,220,245,${flash*.22})`;cx.fillRect(wx,wy,ww,wh);cx.globalCompositeOperation='source-over';}
      cx.setTransform(dpr,0,0,dpr,0,0);
      drawOver();
      drawTitle();
      drawWipe();
    }
    function hud(){
      const html=`出荷 <span style="color:#ff74da">${shipped}</span>台　組立 <span style="color:var(--cy)">${merges}</span>　${SPEED[spIdx].name}　<span style="color:var(--tx-b)">${score}</span>`;
      if(html!==lastScoreHtml){lastScoreHtml=html;mg.setScore(html);}
      const tm=phase==='title'||phase==='story'?'READY':'残り '+Math.max(0,Math.ceil(TIME-t))+'秒';
      if(tm!==lastTimer){lastTimer=tm;mg.setTimer(tm);}
    }
    hud();
    mg.loop(dt=>{update(dt);if(!mg._ended)draw();});

    return {result(reason){
      window.removeEventListener('resize',onResize);
      // 終了演出・エンディング中に「終了」を押しても、本来の結果で精算する
      if(reason==='quit'&&(phase==='over'||phase==='ending')&&overReason)reason=overReason;
      const L=work();
      if(!grade&&reason!=='quit'){grade=calcGrade(L,reason);if(!bd.bestGrade||'CBAS'.indexOf(grade)>'CBAS'.indexOf(bd.bestGrade))bd.bestGrade=grade;}
      let fx,time,sp=0,title,cut=null,log;
      if(reason==='timeup'){
        fx={money:Math.min(6000,L*400),jobRep:Math.min(8,Math.floor(L/3)),mental:L>=10?2:0,fatigue:6};
        time=45;sp=L>=12?1:0;
        title=L>=12?'🧱 組立ノルマ達成！':'🧱 定時まで組み立てた';
        cut=L>=12?['win','……全部組んだった。今夜のロボット、俺の手で出したんや。']:L>=6?['happy','よし、これだけ組めたら上出来や。']:['normal','……手は動いた。それで十分や。'];
        log=shipped?`部品組み立てラインでロボット${shipped}台を完成・出荷（組立${merges}回）。フォークの回転灯が、今夜は誇らしく見えた。`:`部品組み立てラインで${merges}回の組み立てをこなした。`;
      }else if(reason==='topout'){
        fx={money:L*300,jobRep:Math.floor(L/4),mental:-2,fatigue:6};
        time=45;title='💥 ライン停止……';
        cut=['tired','……詰め込みすぎた。焦ると詰まるのは、仕事も人生も一緒やな。'];
        log=`部品組み立てラインで部品があふれてライン停止。組立${merges}回、出荷${shipped}台。`;
      }else{
        fx={money:L*200,fatigue:2};time=20;title='🧱 組み立てを切り上げた';
        log=merges?`部品組み立てを途中で切り上げた（組立${merges}回）。`:'部品組み立てを途中でやめた。';
      }
      const newBest=score>bd.best;
      if(newBest)bd.best=score;
      if(L>bd.bestLines)bd.bestLines=L;
      if(shipped>bd.bestShip)bd.bestShip=shipped;
      if(maxChain>bd.bestChain)bd.bestChain=maxChain;
      return {
        title,
        summary:(grade&&reason!=='quit'?`評価 <span class="up">${grade}</span>　`:'')+`出荷 <span class="up">${shipped}台</span>　組立 <span class="up">${merges}回</span>　スコア <span class="up">${score}</span>${newBest&&score>0?' <span class="up">NEW!</span>':''}`+
          `<br>最大連鎖 <span class="up">${maxChain}</span>　不良品修理 <span class="up">${fixed}</span>${rescueUsed?'　班長の助け 1回':''}`,
        fx,time,sp,log,cutin:cut,
      };
    }};
  },
});
