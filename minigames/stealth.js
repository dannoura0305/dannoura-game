// ══════════════════════════════════════════════════════════
// ステルス「起こさないで家事」
// やっと寝た子どもを起こさないように、0:00までに4つの家事を終わらせる。
// 物音メーターは移動の速さ・床のきしみ・踏んだおもちゃ・水音などで上がり、ゆっくり下がる。
// 子どもの眠りは「ぐっすり」と「うとうと」を繰り返し、うとうと中は物音に敏感になる。
// ══════════════════════════════════════════════════════════
addMinigameStyle('stealth',`
.mg-stealth{background:#05040e;}
.mg-stealth .stealth-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;}
.mg-stealth .stealth-act{position:absolute;right:14px;bottom:10px;z-index:3;width:80px;height:80px;border-radius:50%;padding:0;
  touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;cursor:pointer;
  border:1.5px solid rgba(0,232,200,.55);
  background:radial-gradient(circle at 50% 36%,rgba(0,84,80,.92),rgba(8,10,28,.95) 72%);
  color:#d6fff8;font-family:var(--dot);font-size:.8rem;line-height:1.15;text-align:center;
  box-shadow:0 0 14px rgba(0,232,200,.28),inset 0 0 12px rgba(0,232,200,.18);
  transition:opacity .25s,filter .25s,transform .08s,box-shadow .2s;--p:0;}
.mg-stealth .stealth-act::before{content:'';position:absolute;inset:-6px;border-radius:50%;pointer-events:none;
  background:conic-gradient(#7dffe9 calc(var(--p)*1%),rgba(255,255,255,.05) 0);
  -webkit-mask:radial-gradient(circle,transparent 62%,#000 64%,#000 70%,transparent 72%);
          mask:radial-gradient(circle,transparent 62%,#000 64%,#000 70%,transparent 72%);}
.mg-stealth .stealth-act b{display:block;font-weight:normal;font-size:.86rem;letter-spacing:.06em;}
.mg-stealth .stealth-act small{display:block;font-family:var(--mono);font-size:.5rem;color:rgba(214,255,248,.55);margin-top:2px;}
.mg-stealth .stealth-act.off{opacity:.38;filter:grayscale(.85);box-shadow:none;}
.mg-stealth .stealth-act.ready{animation:stealth-pulse 1.6s ease-in-out infinite;}
.mg-stealth .stealth-act.on{transform:scale(.93);box-shadow:0 0 24px rgba(0,232,200,.7),inset 0 0 16px rgba(0,232,200,.35);animation:none;}
.mg-stealth .stealth-act.hide{opacity:0;pointer-events:none;}
@keyframes stealth-pulse{0%,100%{box-shadow:0 0 10px rgba(0,232,200,.25),inset 0 0 10px rgba(0,232,200,.15);}50%{box-shadow:0 0 22px rgba(0,232,200,.6),inset 0 0 14px rgba(0,232,200,.3);}}
`);

registerMinigame({
  id:'stealth', icon:'🤫', name:'起こさないで家事', genre:'ステルス', bgm:'night',
  desc:'やっと寝た子の横で、0時までに家事を4つ。足音、床のきしみ、踏んだおもちゃ……物音を立てたら起きてしまう。',
  effect:'育児ストレス↓ 精神↑ 希望↑ ／ 疲労+4 約45分',
  help:'ドラッグで移動（ゆっくり＝静か）・長押しで家事／WASD+Space（Shiftで早足）',
  start(body,mg){
    // ── 定数 ──
    const FONT='"DotGothic16", monospace';
    const T_INTRO=3.4, T_PLAY=80;
    const WW=300, WH=480;            // 部屋のワールド座標
    const TOP_H=42, BOT_H=92;        // 画面上部HUD・下部操作帯
    const MAXV=104, PR=10;           // 最高速度・プレイヤー半径
    const CHILD={x:69,y:58};
    const sk=gs.skills||{};
    const holdMul=1-.05*Math.min(5,sk.chores||0);
    // 記録（遅延初期化・JSONで保存できる形）
    const data=gs.stealthData||(gs.stealthData={plays:0,clears:0,best:0,bestScore:0,bestGrade:''});
    // 難易度：クリア回数と日数で少しずつ上がる（0〜3）
    const hard=Math.min(3,(data.clears||0)+((gs.day||1)>=8?1:0)+((gs.day||1)>=15?1:0));
    const sensMul=(1-.04*Math.min(5,sk.bedtime||0))*(1+.07*hard);
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;};

    const OBST=[
      [0,250,120,258],[190,250,300,258],   // 間仕切り（ふすまの開口 120〜190）
      [34,28,104,142],                     // 布団
      [218,40,262,80],                     // 洗濯かご
      [236,200,280,240],                   // おもちゃ箱
      [8,184,32,248],                      // タンス
      [244,266,292,472],                   // 流し台・コンロ・冷蔵庫
      [46,318,148,382],                    // テーブル＋椅子
    ];
    // きしむ床板：敷居の板は毎回、ほかは毎晩ちがう場所
    const CREAK=[[122,258,168,278]].concat(shuffle([[176,298,226,316],[66,392,118,408],[196,428,240,446],[150,60,196,84],[150,330,200,350],[84,284,132,302],[160,410,206,428],[120,170,170,190]]).slice(0,3+Math.min(2,hard)));
    const creakFound=CREAK.map(()=>0), creakIn=CREAK.map(()=>false);
    const ST={
      laundry:{x:240,y:62,r:42,hold:3.6,label:'たたむ',name:'洗濯物をたたむ',icon:'衣',mx:240,my:100},
      dishes:{x:258,y:330,r:38,hold:4.6,label:'洗う',name:'食器を洗う',icon:'皿',mx:234,my:330},
      note:{x:110,y:352,r:50,hold:3.6,label:'書く',name:'連絡帳と明日の準備',icon:'帳',mx:110,my:394},
      toys:{x:258,y:220,r:38,hold:1.0,label:'しまう',name:'おもちゃを片付ける',icon:'玩',mx:258,my:192},
    };
    const ORDER=['laundry','dishes','note','toys'];
    for(const k of ORDER){ST[k].p=0;ST[k].done=false;ST[k].hold*=holdMul;}
    // おもちゃ：候補地からランダムに。難しくなるほど数が増える
    const TOY_SPOTS=shuffle([[150,112],[188,206],[96,206],[170,296],[212,150],[130,160],[62,166],[200,380],[100,432],[176,446],[226,112],[160,36],[214,288],[130,222]]);
    const nToys=5+Math.min(2,hard);
    const BLK=[['#e85a6a','あ'],['#4ab0e8','い'],['#58d08a','う'],['#b07ae8','え'],['#ff9a4a','お']];
    const kinds=shuffle(['block','block','block','car','duck','block','ball']);
    const toys=[];
    for(let i=0;i<nToys;i++){
      const k=kinds[i],b=BLK[i%5];
      toys.push({x:TOY_SPOTS[i][0],y:TOY_SPOTS[i][1],k,c:k==='car'?'#e8b830':k==='duck'?'#ffd84a':k==='ball'?'#ff7aa8':b[0],ch:b[1],
        vx:0,vy:0,cool:0,got:false,p:0,rot:Math.random()*6,tw:Math.random()*6});
    }
    const CAT_WP=[[200,120],[150,200],[160,300],[200,360],[120,440],[214,232],[130,60],[80,170]];
    const CAT_MIS=[
      {x:110,y:308,sx:112,sy:328,txt:'ガシャン',what:'コップ'},
      {x:232,y:392,sx:262,sy:392,txt:'カラン…',what:'お鍋のふた'},
      {x:238,y:96,sx:240,sy:62,txt:'バサッ',what:'洗濯物の山'},
    ];

    // ── DOM ──
    const cv=document.createElement('canvas');cv.className='stealth-cv';body.appendChild(cv);
    const cx=cv.getContext('2d');
    const act=document.createElement('button');act.className='stealth-act hide';
    act.innerHTML='<b>家事</b><small>HOLD</small>';body.appendChild(act);
    const actB=act.querySelector('b');

    // 立ち絵（タイトル・会話・エンディング用）
    const IMG={};
    ['normal','tired','fear','happy'].forEach(k=>{const im=new Image();im.src='assets/img/char_'+k+'.webp';IMG[k]=im;});

    // ── 効果音（Web Audioで合成。AU.se と同じ音量設定に従う） ──
    const SX={
      nb:null,water:null,
      c(){
        if(typeof AUDIO_SET!=='undefined'&&!(AUDIO_SET.se>0))return null;
        try{AU.init();}catch(_){}
        const c=AU.ctx;if(!c)return null;
        if(c.state==='suspended'){try{c.resume();}catch(_){}}
        return c;
      },
      v(){return typeof AUDIO_SET!=='undefined'?AUDIO_SET.se:1;},
      buf(c){
        if(!this.nb){const n=(c.sampleRate*1.2)|0,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.nb=b;}
        return this.nb;
      },
      tone(c,type,f0,f1,dur,peak,dl,lp){
        const t0=c.currentTime+(dl||0),o=c.createOscillator(),g=c.createGain();
        o.type=type;o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
        g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t0+Math.min(.02,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
        if(lp){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;f.Q.value=4;o.connect(f);f.connect(g);}else o.connect(g);
        g.connect(c.destination);o.start(t0);o.stop(t0+dur+.02);
      },
      noise(c,dur,peak,ft,f0,f1,q,dl){
        const t0=c.currentTime+(dl||0),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
        s.buffer=this.buf(c);f.type=ft;f.frequency.setValueAtTime(f0,t0);f.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);f.Q.value=q;
        g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t0+Math.min(.015,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
        s.connect(f);f.connect(g);g.connect(c.destination);s.start(t0,Math.random()*.5);s.stop(t0+dur+.02);
      },
      play(k,amt){
        const c=this.c();if(!c)return;
        const v=this.v()*(amt||1);
        try{switch(k){
          case 'step':this.noise(c,.08,.06*v,'lowpass',240,140,1);break;
          case 'creak':this.tone(c,'sawtooth',230,120,.45,.05*v,0,900);this.tone(c,'sawtooth',236,128,.4,.03*v,.02,700);break;
          case 'clack':for(let i=0;i<3;i++){this.noise(c,.05,.14*v,'bandpass',2600-i*300,2200,3,i*.055);this.tone(c,'square',1200-i*220,900,.035,.025*v,i*.055);}break;
          case 'squeak':this.tone(c,'sine',1300,2100,.12,.08*v);this.tone(c,'sine',2000,1100,.22,.07*v,.12);break;
          case 'rattle':for(let i=0;i<7;i++)this.noise(c,.03,.07*v,'bandpass',1500+i*60,1400,4,i*.045);break;
          case 'ball':this.tone(c,'sine',300,180,.12,.09*v);this.tone(c,'sine',280,170,.1,.05*v,.2);break;
          case 'rustle':this.noise(c,.24,.05*v,'bandpass',3400,2200,.8);break;
          case 'clink':this.tone(c,'sine',2600,2580,.3,.05*v);this.tone(c,'sine',3950,3900,.2,.03*v);break;
          case 'scratch':this.noise(c,.1,.025*v,'highpass',5200,4800,.7);break;
          case 'zip':this.noise(c,.32,.05*v,'bandpass',700,3400,5);break;
          case 'pick':this.tone(c,'sine',660,990,.12,.05*v);break;
          case 'done':this.tone(c,'triangle',880,880,.28,.06*v);this.tone(c,'triangle',1320,1320,.45,.05*v,.11);break;
          case 'box':this.noise(c,.08,.16*v,'lowpass',700,260,1);this.tone(c,'square',170,90,.09,.04*v);break;
          case 'meow':this.tone(c,'triangle',620,980,.14,.05*v,0,1900);this.tone(c,'triangle',980,520,.3,.05*v,.13,1700);break;
          case 'purr':this.tone(c,'sawtooth',27,24,.9,.06*v,0,220);break;
          case 'crash':this.noise(c,.45,.2*v,'highpass',1600,500,.7);this.tone(c,'sine',1900,1700,.6,.04*v);this.tone(c,'sine',2870,2800,.4,.025*v,.05);break;
          case 'whimper':this.tone(c,'sine',560,430,.35,.035*v,0);this.tone(c,'sine',520,400,.4,.03*v,.4);break;
          case 'cry':this.tone(c,'sawtooth',470,580,.6,.05*v,0,1500);this.tone(c,'sawtooth',580,400,.9,.05*v,.6,1500);break;
          case 'heart':this.tone(c,'sine',62,44,.13,.16*v);this.tone(c,'sine',58,42,.13,.1*v,.17);break;
          case 'blip':this.tone(c,'square',900,900,.025,.012*v);break;
          case 'whoosh':this.noise(c,.6,.04*v,'bandpass',300,2400,2);break;
          case 'bird':this.tone(c,'sine',3600,4600,.06,.03*v);this.tone(c,'sine',3800,4800,.06,.025*v,.1);break;
          case 'stamp':this.noise(c,.12,.2*v,'lowpass',500,120,1);this.tone(c,'triangle',523,523,.5,.05*v,.05);this.tone(c,'triangle',784,784,.6,.05*v,.15);this.tone(c,'triangle',1046,1046,.8,.05*v,.25);break;
          case 'sad':this.tone(c,'triangle',440,430,.5,.05*v);this.tone(c,'triangle',349,345,.8,.05*v,.25);break;
          case 'tension':this.tone(c,'sawtooth',55,52,1.4,.05*v,0,260);this.tone(c,'sawtooth',82,78,1.4,.03*v,0,300);break;
          case 'alert':this.tone(c,'square',740,740,.08,.04*v);this.tone(c,'square',988,988,.12,.04*v,.09);break;
        }}catch(_){}
      },
      setWater(on){
        const c=on?this.c():AU.ctx;
        if(!c)return;
        try{
          if(on&&!this.water){
            const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
            s.buffer=this.buf(c);s.loop=true;f.type='bandpass';f.frequency.value=1500;f.Q.value=.6;g.gain.value=.0001;
            s.connect(f);f.connect(g);g.connect(c.destination);s.start();this.water={s,g};
          }
          if(this.water)this.water.g.gain.setTargetAtTime(on?.05*this.v():.0001,c.currentTime,.08);
        }catch(_){}
      },
      stop(){if(this.water){try{this.water.s.stop();}catch(_){}this.water=null;}},
    };

    // ── サイズ・事前描画 ──
    let W=0,H=0,dpr=1,S=1,OX=0,OY=0;
    let lyStatic=null,lyDark=null,lyBeam=null,lyVig=null;
    const glow={};
    const rnd=(a,b)=>a+Math.random()*(b-a);
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;
    function mkC(w,h,d){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*d));c.height=Math.max(1,Math.ceil(h*d));return [c,c.getContext('2d')];}
    function makeGlow(rgb,r){
      const [c,g]=mkC(r*2,r*2,1);
      const gr=g.createRadialGradient(r,r,0,r,r,r);
      gr.addColorStop(0,`rgba(${rgb},1)`);gr.addColorStop(.3,`rgba(${rgb},.42)`);gr.addColorStop(.65,`rgba(${rgb},.1)`);gr.addColorStop(1,`rgba(${rgb},0)`);
      g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return c;
    }
    function rrp(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
    // 決定的な乱数（リサイズで模様が変わらないように）
    let seed=7;const srnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};

    function buildStatic(){
      seed=7;
      const [c,g]=mkC(WW*S,WH*S,dpr);g.setTransform(dpr*S,0,0,dpr*S,0,0);
      lyStatic=c;
      // 床：畳
      const mats=[[8,8,142,80,1],[150,8,142,80,1],[8,88,80,162,0],[88,88,102,81,1],[88,169,102,81,1],[190,88,102,162,0]];
      for(const [x,y,w,h,hor] of mats){
        const gr=g.createLinearGradient(x,y,x+w,y+h);
        gr.addColorStop(0,'#8a8656');gr.addColorStop(.5,'#7c7a4c');gr.addColorStop(1,'#6e6c42');
        g.fillStyle=gr;g.fillRect(x,y,w,h);
        g.strokeStyle='rgba(40,40,16,.22)';g.lineWidth=.6;
        g.beginPath();
        if(hor){for(let yy=y+2;yy<y+h;yy+=2.4){g.moveTo(x,yy);g.lineTo(x+w,yy);}}
        else{for(let xx=x+2;xx<x+w;xx+=2.4){g.moveTo(xx,y);g.lineTo(xx,y+h);}}
        g.stroke();
        for(let i=0;i<40;i++){g.fillStyle=`rgba(${srnd()<.5?'255,250,200':'30,30,10'},${.03+srnd()*.05})`;
          if(hor)g.fillRect(x+srnd()*w,y+srnd()*h,6+srnd()*20,1);else g.fillRect(x+srnd()*w,y+srnd()*h,1,6+srnd()*20);}
        // 畳縁
        g.fillStyle='#1e2a1c';
        if(hor){g.fillRect(x,y,w,3);g.fillRect(x,y+h-3,w,3);}else{g.fillRect(x,y,3,h);g.fillRect(x+w-3,y,3,h);}
        g.fillStyle='rgba(120,160,110,.18)';
        if(hor){for(let xx=x+3;xx<x+w;xx+=5){g.fillRect(xx,y+1,2,1);g.fillRect(xx,y+h-2,2,1);}}
        else{for(let yy=y+3;yy<y+h;yy+=5){g.fillRect(x+1,yy,1,2);g.fillRect(x+w-2,yy,1,2);}}
        g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=.8;g.strokeRect(x+.4,y+.4,w-.8,h-.8);
      }
      // 床：台所のフローリング
      for(let y=258,row=0;y<472;y+=13,row++){
        let x=8-((row*37)%60);
        while(x<292){
          const L=50+srnd()*60,v=srnd();
          g.fillStyle=`rgb(${84+v*18|0},${58+v*12|0},${40+v*8|0})`;
          g.fillRect(Math.max(8,x),y,Math.min(L,292-Math.max(8,x)),13);
          g.strokeStyle='rgba(30,18,10,.18)';g.lineWidth=.5;g.beginPath();
          for(let k=0;k<3;k++){const gy=y+2+srnd()*9;g.moveTo(Math.max(8,x),gy);g.bezierCurveTo(x+L*.3,gy+srnd()*2-1,x+L*.6,gy+srnd()*2-1,Math.min(292,x+L),gy);}
          g.stroke();
          g.fillStyle='rgba(20,12,6,.7)';g.fillRect(Math.max(8,x),y,.8,13);
          x+=L;
        }
        g.fillStyle='rgba(20,12,6,.75)';g.fillRect(8,y,284,.9);
        g.fillStyle='rgba(255,220,180,.05)';g.fillRect(8,y+1,284,1);
      }
      // きしむ板（ほんの少し色が違う）
      for(const [x0,y0,x1,y1] of CREAK){if(y0<250)continue;g.fillStyle='rgba(120,90,60,.12)';g.fillRect(x0,y0,x1-x0,y1-y0);}
      // 玄関のタイル
      g.fillStyle='#3d3a44';g.fillRect(8,412,52,60);
      g.strokeStyle='rgba(10,8,16,.6)';g.lineWidth=.7;
      for(let y=412;y<472;y+=12){g.beginPath();g.moveTo(8,y);g.lineTo(60,y);g.stroke();}
      for(let x=8;x<60;x+=13){g.beginPath();g.moveTo(x,412);g.lineTo(x,472);g.stroke();}
      g.fillStyle='#5a4030';g.fillRect(60,410,4,62); // 上がり框
      g.fillStyle='rgba(255,220,180,.08)';g.fillRect(60,410,1,62);
      // 濡れた傘と水たまり
      g.fillStyle='rgba(120,150,200,.18)';g.beginPath();g.ellipse(22,452,10,6,0,0,7);g.fill();
      g.strokeStyle='#2a2238';g.lineWidth=3;g.beginPath();g.moveTo(14,468);g.lineTo(34,436);g.stroke();
      g.fillStyle='#4a2a5a';g.beginPath();g.moveTo(34,436);g.lineTo(28,430);g.lineTo(40,428);g.closePath();g.fill();
      // 靴（大きいのと小さいの）
      g.fillStyle='#1c1820';rrp(g,30,452,9,16,4);g.fill();rrp(g,41,452,9,16,4);g.fill();
      g.fillStyle='#d85a7a';rrp(g,18,420,6,10,3);g.fill();rrp(g,26,420,6,10,3);g.fill();
      g.fillStyle='rgba(255,255,255,.4)';g.fillRect(19,421,4,2);g.fillRect(27,421,4,2);

      // 影（家具の下）
      g.fillStyle='rgba(0,0,0,.28)';
      for(const o of OBST){if(o[1]===250)continue;g.fillRect(o[0]+3,o[1]+4,o[2]-o[0],o[3]-o[1]);}

      // 布団
      g.fillStyle='#cfc6b4';rrp(g,34,28,70,114,6);g.fill();
      g.strokeStyle='rgba(90,80,70,.5)';g.lineWidth=.8;g.stroke();
      g.fillStyle='rgba(255,255,255,.1)';rrp(g,36,30,66,6,3);g.fill();
      // 枕
      g.fillStyle='#e8e0d4';rrp(g,50,40,38,18,7);g.fill();
      g.strokeStyle='rgba(120,100,90,.4)';g.stroke();
      // タンス＋写真立て
      g.fillStyle='#4a3424';g.fillRect(8,184,24,64);
      g.fillStyle='#5c4230';for(let y=188;y<246;y+=15){g.fillRect(10,y,20,13);g.fillStyle='#c8a060';g.fillRect(18,y+5,4,2);g.fillStyle='#5c4230';}
      g.fillStyle='#d8c8a8';g.fillRect(12,196,10,8);g.fillStyle='#e8b830';g.fillRect(13,197,8,6);
      // 洗濯かご（中身は動的に描く）
      g.fillStyle='#8a6a40';rrp(g,218,40,44,40,8);g.fill();
      g.strokeStyle='#5a4228';g.lineWidth=.8;
      for(let x=222;x<262;x+=4){g.beginPath();g.moveTo(x,42);g.lineTo(x,78);g.stroke();}
      for(let y=44;y<80;y+=4){g.beginPath();g.moveTo(220,y);g.lineTo(260,y);g.stroke();}
      g.fillStyle='#2e2418';rrp(g,222,44,36,32,6);g.fill();
      // おもちゃ箱
      g.fillStyle='#7a5638';g.fillRect(236,200,44,40);
      g.fillStyle='#8e6644';g.fillRect(238,202,40,36);
      g.fillStyle='#e85a6a';g.beginPath();g.arc(248,212,4,0,7);g.fill();
      g.fillStyle='#4ab0e8';g.fillRect(262,216,7,7);
      g.fillStyle='#e8b830';g.beginPath();g.moveTo(256,230);g.lineTo(261,222);g.lineTo(266,230);g.closePath();g.fill();
      g.strokeStyle='rgba(30,20,10,.6)';g.lineWidth=1;g.strokeRect(236.5,200.5,43,39);
      // 台所：流し台
      g.fillStyle='#5c5a68';g.fillRect(244,266,48,154);
      g.fillStyle='#7a7888';g.fillRect(244,266,48,2);
      g.fillStyle='rgba(255,255,255,.06)';for(let y=270;y<420;y+=6)g.fillRect(246,y,44,.6);
      // 炊飯器
      g.fillStyle='#d8d4cc';rrp(g,256,272,24,22,8);g.fill();
      g.fillStyle='#a8a49c';g.beginPath();g.arc(268,283,6,0,7);g.fill();
      // シンク
      g.fillStyle='#2a2834';rrp(g,250,306,36,46,5);g.fill();
      g.strokeStyle='#8a88a0';g.lineWidth=1.4;g.stroke();
      g.fillStyle='#14121c';g.beginPath();g.arc(268,340,3,0,7);g.fill();
      g.fillStyle='#9a98b0';g.fillRect(284,322,6,4);g.fillRect(276,323,10,2.4);  // 蛇口
      // コンロ
      g.fillStyle='#2a2830';g.fillRect(248,368,40,44);
      for(const [bx,by] of [[258,380],[278,380],[268,400]]){g.strokeStyle='#4a4858';g.lineWidth=2;g.beginPath();g.arc(bx,by,6,0,7);g.stroke();}
      // 冷蔵庫
      g.fillStyle='#b4b6c2';g.fillRect(246,424,46,48);
      g.fillStyle='#9a9caa';g.fillRect(246,446,46,1.2);g.fillRect(250,428,2,14);
      // 子どもの絵（マグネット）
      g.fillStyle='#f0ead8';g.fillRect(260,452,22,16);
      g.strokeStyle='#e85a6a';g.lineWidth=1;g.beginPath();g.arc(266,459,3,0,7);g.stroke();
      g.strokeStyle='#4ab0e8';g.beginPath();g.arc(275,460,4,0,7);g.stroke();
      g.strokeStyle='#58a050';g.beginPath();g.moveTo(262,467);g.lineTo(280,466);g.stroke();
      g.fillStyle='#e8b830';g.beginPath();g.arc(271,452,1.6,0,7);g.fill();
      // テーブル＋椅子
      g.fillStyle='#3e2c22';rrp(g,46,326,14,20,3);g.fill();rrp(g,46,354,14,20,3);g.fill();
      g.fillStyle='#4e3828';rrp(g,48,328,10,16,2);g.fill();rrp(g,48,356,10,16,2);g.fill();
      g.fillStyle='#6a4a32';rrp(g,62,320,86,62,4);g.fill();
      g.strokeStyle='rgba(30,18,10,.4)';g.lineWidth=.5;
      for(let y=324;y<380;y+=4.5){g.beginPath();g.moveTo(64,y);g.bezierCurveTo(90,y+1,120,y-1,146,y);g.stroke();}
      g.strokeStyle='rgba(255,220,180,.15)';g.lineWidth=1;g.strokeRect(62.5,320.5,85,61);
      // テーブル上：保育園バッグ・子どもの絵
      g.fillStyle='#f0a0b0';rrp(g,124,356,20,16,4);g.fill();
      g.strokeStyle='#c06078';g.lineWidth=1;g.beginPath();g.arc(134,356,5,Math.PI,0);g.stroke();
      g.fillStyle='#fff';g.fillRect(130,362,8,5);
      g.save();g.translate(78,334);g.rotate(-.2);g.fillStyle='#ece6d6';g.fillRect(0,0,18,14);
      g.fillStyle='#e8b830';g.beginPath();g.arc(6,6,3,0,7);g.fill();g.strokeStyle='#e85a6a';g.beginPath();g.moveTo(10,10);g.lineTo(16,4);g.stroke();g.restore();

      // 壁
      g.fillStyle='#17121f';
      g.fillRect(0,0,WW,8);g.fillRect(0,472,WW,8);g.fillRect(0,0,8,WH);g.fillRect(292,0,8,WH);
      g.fillRect(0,250,120,8);g.fillRect(190,250,110,8);
      g.fillStyle='#2a2238';
      g.fillRect(8,7,284,1.2);g.fillRect(8,471,284,1.2);g.fillRect(7,8,1.2,464);g.fillRect(291.8,8,1.2,464);
      g.fillRect(8,249,112,1.2);g.fillRect(190,249,102,1.2);g.fillRect(8,257.5,112,1);g.fillRect(190,257.5,102,1);
      // ふすま（開いて右に寄せてある）
      g.fillStyle='#d8ccb0';g.fillRect(190,251,62,6);
      g.fillStyle='#6a5a40';g.fillRect(190,251,62,1);g.fillRect(190,256,62,1);g.fillRect(220,251,1.5,6);
      // 窓（上の壁）
      g.fillStyle='#202a48';g.fillRect(150,1,110,7);
      g.fillStyle='rgba(160,190,255,.35)';g.fillRect(150,1,110,2);
      // カーテン（左右に寄せて、真ん中だけ少し開いている）
      const curt=(x0,x1)=>{
        g.fillStyle='#3a3060';g.fillRect(x0,6,x1-x0,9);
        for(let x=x0;x<x1;x+=4){g.fillStyle='rgba(255,255,255,.07)';g.fillRect(x,6,1.4,9);g.fillStyle='rgba(0,0,0,.25)';g.fillRect(x+2.4,6,1.2,9);}
      };
      curt(146,186);curt(224,264);
      // 玄関ドア（下の壁）
      g.fillStyle='#2c2436';g.fillRect(10,472,46,8);
      g.fillStyle='rgba(120,220,255,.3)';g.fillRect(22,474,22,3);
      // コンセントの常夜灯
      g.fillStyle='#e8e0d0';rrp(g,13,160,10,12,2);g.fill();
    }
    function buildDark(){
      const [c,g]=mkC(WW*S,WH*S,dpr);g.setTransform(dpr*S,0,0,dpr*S,0,0);
      lyDark=c;
      g.fillStyle='rgba(3,2,12,.80)';g.fillRect(0,0,WW,WH);
      g.globalCompositeOperation='destination-out';
      const hole=(x,y,r,a)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,`rgba(0,0,0,${a})`);gr.addColorStop(.5,`rgba(0,0,0,${a*.45})`);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);};
      hole(18,166,130,.8);
      hole(205,12,80,.55);
      hole(268,286,34,.35);
      hole(32,470,110,.5);
      hole(150,300,150,.18);
      hole(150,120,170,.2);
      // 月明かりの帯
      try{g.filter='blur(5px)';}catch(_){}
      const lg=g.createLinearGradient(0,8,0,240);lg.addColorStop(0,'rgba(0,0,0,.7)');lg.addColorStop(1,'rgba(0,0,0,.25)');
      g.fillStyle=lg;g.beginPath();g.moveTo(186,8);g.lineTo(224,8);g.lineTo(170,236);g.lineTo(118,236);g.closePath();g.fill();
      try{g.filter='none';}catch(_){}
      // 光の帯（加算用）
      const [b,bg]=mkC(WW*S,WH*S,dpr);bg.setTransform(dpr*S,0,0,dpr*S,0,0);
      lyBeam=b;
      try{bg.filter='blur(4px)';}catch(_){}
      const bl=bg.createLinearGradient(0,8,0,240);bl.addColorStop(0,'rgba(150,180,255,.55)');bl.addColorStop(.6,'rgba(120,140,240,.22)');bl.addColorStop(1,'rgba(100,110,220,0)');
      bg.fillStyle=bl;bg.beginPath();bg.moveTo(186,8);bg.lineTo(224,8);bg.lineTo(170,240);bg.lineTo(116,240);bg.closePath();bg.fill();
      // 窓枠の影（十字）
      bg.globalCompositeOperation='destination-out';bg.fillStyle='rgba(0,0,0,.55)';
      bg.beginPath();bg.moveTo(203,8);bg.lineTo(207,8);bg.lineTo(146,240);bg.lineTo(141,240);bg.closePath();bg.fill();
      bg.fillRect(100,120,140,5);
      try{bg.filter='none';}catch(_){}
      // 周辺減光（画面全体）
      let vg;[lyVig,vg]=mkC(W,H,dpr);vg.setTransform(dpr,0,0,dpr,0,0);
      const gr=vg.createRadialGradient(W/2,H*.5,Math.min(W,H)*.3,W/2,H*.5,Math.max(W,H)*.72);
      gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(2,1,8,.7)');vg.fillStyle=gr;vg.fillRect(0,0,W,H);
    }
    function resize(){
      const w=Math.max(260,body.clientWidth),h=Math.max(380,body.clientHeight);
      const nd=Math.min(2.5,window.devicePixelRatio||1);
      if(w===W&&h===H&&nd===dpr)return;
      W=w;H=h;dpr=nd;
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      S=Math.min((W-10)/WW,(H-TOP_H-BOT_H-6)/WH);
      OX=(W-WW*S)/2;OY=TOP_H+Math.max(0,(H-TOP_H-BOT_H-WH*S)/2);
      if(!glow.warm){
        glow.warm=makeGlow('255,170,90',64);glow.moon=makeGlow('150,180,255',64);glow.cy=makeGlow('0,232,200',48);
        glow.rd=makeGlow('232,48,85',48);glow.gd=makeGlow('232,184,48',48);glow.wt=makeGlow('255,255,255',48);
        glow.gn=makeGlow('68,238,136',32);glow.pk=makeGlow('255,110,180',64);glow.pu=makeGlow('138,82,212',64);
      }
      buildStatic();buildDark();
    }

    // ── 状態 ──
    const P={x:150,y:446,vx:0,vy:0,ang:-Math.PI/2,walk:0,carry:0,yelp:0};
    const cat={x:150,y:228,tx:150,ty:228,path:[],ang:.4,walk:0,mode:'nap',wait:2,mis:null,misT:0,pet:0,tail:0,cd:hard>=2?4:7,jump:0};
    const parts=[];for(let i=0;i<220;i++)parts.push({x:0,y:0,vx:0,vy:0,life:0,max:1,sz:1,col:'#fff',g:0});
    let pi=0;
    const rings=[];for(let i=0;i<20;i++)rings.push({x:0,y:0,t:0,max:1,r:20,col:'#fff'});
    let ri=0;
    const pops=[];for(let i=0;i<20;i++)pops.push({x:0,y:0,t:0,max:1,text:'',col:'#fff',sz:9});
    let popi=0;
    const motes=[];for(let i=0;i<26;i++)motes.push({x:rnd(120,220),y:rnd(10,230),ph:Math.random()*6,s:rnd(.4,1.2)});
    const zzz=[];for(let i=0;i<6;i++)zzz.push({t:0,x:0,y:0,s:1,on:false});
    let zzzCd=.5;
    let t=-T_INTRO, clock=0, noise=0, maxNoise=0, spikeGrace=0, stirSaid=false, warnCd=0;
    let holding=false, keyHold=false, phase='play', endT=0, shake=0, redFlash=0, banner=null;
    let stepAcc=0, chopCd=0, lastScore='', lastTimer='', lastAct='', lastP=-1, curSt=null, curToy=null, seCd=0;
    let toysLeft=toys.length, catPets=0, toyHits=0, creaks=0, cleared=0;
    let waterOn=false, sleepCycle=0, cycT=.05, gphase=1, childRoll=0, rollSide=1, wasLight=false, heartCd=0, alertLv=0, idleT=0;
    // 場面：title → talk → game（t<0 は操作説明）→ ending
    let scene='title', sceneT=0, trans=null, endReason=null, grade='', gradeScore=0, newBest=false;
    let talkI=0, talkC=0, blipCd=0;
    const TALK=[['tired','……やっと寝た。今日は保育園で、ずっと走り回ってたらしい。']];
    if((gs.childStress||0)>55)TALK.push(['fear','最近は夜中によう泣く。今夜は、ほんまに起こしたくない。']);
    else if(data.clears>0)TALK.push(['normal','前はおもちゃ踏んで、起こしかけたからな。……今夜も慎重にいこ。']);
    TALK.push(['normal','洗濯物、洗い物、連絡帳、おもちゃ。0時までに全部片付けたい。']);
    TALK.push(['tired','そーっと、な。足音ひとつで、また寝かしつけ1時間コースや。']);
    data.plays=(data.plays||0)+1;

    resize();
    const onResize=()=>{if(!mg._ended)resize();};
    window.addEventListener('resize',onResize);

    // ── 入力 ──
    let joy=null;
    const keys={l:false,r:false,u:false,d:false,run:false};
    function advance(){
      if(trans)return;
      if(scene==='title'){goScene('talk');}
      else if(scene==='talk'){
        const L=TALK[talkI][1];
        if(talkC<L.length){talkC=L.length;return;}
        talkI++;talkC=0;SX.play('blip');
        if(talkI>=TALK.length)goScene('game');
      }
      else if(scene==='game'&&t<-.3)t=-.3;
      else if(scene==='ending'&&sceneT>1.6&&!mg._ended){mg.end(endReason);}
    }
    function goScene(sc){
      SX.play('whoosh');
      trans={t:0,dur:.8,mid:()=>{scene=sc;sceneT=0;if(sc==='game'){t=-T_INTRO;}if(sc==='ending'){SX.stop();SX.play('bird');}},done:false};
    }
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(scene!=='game'||t<-.3){advance();return;}
      if(joy)return;
      try{cv.setPointerCapture(e.pointerId);}catch(_){}
      joy={id:e.pointerId,sx:e.clientX,sy:e.clientY,dx:0,dy:0};
    });
    cv.addEventListener('pointermove',e=>{
      if(!joy||joy.id!==e.pointerId)return;
      joy.dx=e.clientX-joy.sx;joy.dy=e.clientY-joy.sy;
      const R=54,d=Math.hypot(joy.dx,joy.dy);
      if(d>R*1.6){const k=(d-R*1.6)/d;joy.sx+=joy.dx*k;joy.sy+=joy.dy*k;joy.dx=e.clientX-joy.sx;joy.dy=e.clientY-joy.sy;}
    });
    const endJoy=e=>{if(joy&&joy.id===e.pointerId)joy=null;};
    cv.addEventListener('pointerup',endJoy);cv.addEventListener('pointercancel',endJoy);
    act.addEventListener('pointerdown',e=>{e.preventDefault();if(scene!=='game'||t<-.3){advance();return;}holding=true;try{act.setPointerCapture(e.pointerId);}catch(_){}});
    const actUp=e=>{holding=false;};
    act.addEventListener('pointerup',actUp);act.addEventListener('pointercancel',actUp);act.addEventListener('lostpointercapture',actUp);
    act.addEventListener('contextmenu',e=>e.preventDefault());
    mg.onKey(e=>{
      const k=e.key,dn=e.type==='keydown';
      const map={ArrowLeft:'l',a:'l',A:'l',ArrowRight:'r',d:'r',D:'r',ArrowUp:'u',w:'u',W:'u',ArrowDown:'d',s:'d',S:'d'};
      if(map[k]){e.preventDefault();keys[map[k]]=dn;if(dn&&scene==='game'&&t<-.3)t=-.3;return;}
      if(k==='Shift'){keys.run=dn;return;}
      if(k===' '||k==='e'||k==='E'||k==='Enter'){e.preventDefault();
        if(scene!=='game'||t<-.3){if(dn&&!e.repeat)advance();return;}
        keyHold=dn;}
    });

    // ── 演出ヘルパ ──
    function burst(x,y,n,cols,spd,life,sz,grav){
      for(let i=0;i<n;i++){
        const p=parts[pi];pi=(pi+1)%parts.length;
        const a=Math.random()*6.283,v=spd*(.3+Math.random()*.7);
        p.x=x;p.y=y;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.max=p.life=life*(.6+Math.random()*.4);
        p.sz=sz*(.6+Math.random()*.8);p.col=cols[(Math.random()*cols.length)|0];p.g=grav||0;
      }
    }
    function ring(x,y,r,col,max){const o=rings[ri];ri=(ri+1)%rings.length;o.x=x;o.y=y;o.r=r;o.col=col;o.t=o.max=max||.6;}
    function pop(x,y,text,col,sz,dur){const o=pops[popi];popi=(popi+1)%pops.length;o.x=x;o.y=y;o.text=text;o.col=col;o.sz=sz||9;o.t=o.max=dur||1;}
    function se(type,force){if(force||seCd<=0){try{AU.se(type);}catch(_){}seCd=.08;}}
    function showBanner(main,sub,col,dur){banner={main,sub,col,t:0,dur:dur||2};}
    const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
    const att=(x,y)=>clamp(1.35-dist(x,y,CHILD.x,CHILD.y)/260,.4,1.25);
    const sens=()=>(.55+.9*sleepCycle)*sensMul;
    function addNoise(amount,x,y){ // 連続音（毎フレーム）
      if(phase!=='play')return;
      noise+=amount*sens()*att(x,y);
    }
    function spike(amount,x,y,text,col){ // 突発音
      if(phase!=='play')return;
      const v=amount*sens()*att(x,y);
      noise+=v;spikeGrace=1;
      const c=col||(v>14?'#e83055':v>6?'#e8b830':'#bbaedd');
      ring(x,y,10+v*2.4,c,.5+v*.02);
      if(text)pop(x,y-12,text,c,v>14?12:9,1.1);
      if(v>14){shake=Math.max(shake,4);se('noise');}
    }
    function floorAt(x,y){return y<250?'tatami':(x<60&&y>412)?'tile':'wood';}

    // ── 当たり判定 ──
    function collide(o,r){
      for(let it=0;it<2;it++){
        for(const b of OBST){
          const nx=clamp(o.x,b[0],b[2]),ny=clamp(o.y,b[1],b[3]);
          const dx=o.x-nx,dy=o.y-ny,d2=dx*dx+dy*dy;
          if(d2<r*r){
            if(d2>1e-6){const d=Math.sqrt(d2),k=(r-d)/d;o.x+=dx*k;o.y+=dy*k;}
            else{ // 中に入り込んだ場合は最短の辺へ
              const l=o.x-b[0],rr=b[2]-o.x,u=o.y-b[1],dd=b[3]-o.y,m=Math.min(l,rr,u,dd);
              if(m===l)o.x=b[0]-r;else if(m===rr)o.x=b[2]+r;else if(m===u)o.y=b[1]-r;else o.y=b[3]+r;
            }
          }
        }
        o.x=clamp(o.x,8+r,292-r);o.y=clamp(o.y,8+r,472-r);
      }
    }

    // ── 進行 ──
    function nearestStation(){
      // おもちゃ（床の上）
      let best=null,bd=1e9;
      curToy=null;
      for(const ty of toys){if(ty.got)continue;const d=dist(P.x,P.y,ty.x,ty.y);if(d<PR+16&&d<bd){bd=d;curToy=ty;}}
      if(curToy)return 'toy';
      for(const k of ORDER){
        const s=ST[k];if(s.done)continue;
        const d=dist(P.x,P.y,s.x,s.y);
        if(d<s.r&&d<bd){bd=d;best=k;}
      }
      return best;
    }
    function completeStation(k){
      const s=ST[k];s.done=true;s.p=1;
      se('decide',true);SX.play('done');
      burst(s.x,s.y,22,['#7dffe9','#ffffff','#e8b830'],60,.9,1.6);
      ring(s.x,s.y,30,'#00e8c8',.7);
      const done=ORDER.filter(o=>ST[o].done).length;
      pop(s.x,s.y-22,s.name+' ✓',ORDER.length===done?'#e8b830':'#7dffe9',10,1.6);
      if(k==='note'){spike(5,s.x,s.y,'ジッ…');SX.play('zip');}
      if(k==='toys'){spike(8,s.x,s.y,'カタン');SX.play('box');}
      if(done===ORDER.length){
        phase='clear';endT=0;cleared=t;
        showBanner('ぜんぶ、終わった','起こさずにすんだ。……おやすみ','#e8b830',2.8);
        try{AU.se('ach');}catch(_){}SX.setWater(false);
        burst(CHILD.x,CHILD.y+10,40,['#e8b830','#ffe8b0','#ffffff'],70,1.6,1.8);
      }
    }
    function wake(){
      phase='woke';endT=0;redFlash=1;shake=10;
      try{AU.se('warn');}catch(_){}SX.setWater(false);SX.play('cry');
      showBanner('……起こしてしまった','「ぱぱぁ……」','#e83055',2.6);
      burst(CHILD.x,CHILD.y,26,['#9ad8ff','#ffffff'],70,1.2,1.6,40);
    }

    function update(dt){
      clock+=dt;seCd-=dt;warnCd-=dt;
      if(shake>0)shake=Math.max(0,shake-dt*20);
      if(redFlash>0)redFlash=Math.max(0,redFlash-dt*.8);
      if(P.yelp>0)P.yelp-=dt;
      sceneT+=dt;
      if(trans){trans.t+=dt;if(!trans.done&&trans.t>=trans.dur/2){trans.done=true;trans.mid();}if(trans.t>=trans.dur)trans=null;}
      for(const m of motes){m.ph+=dt*m.s;m.y+=dt*3*m.s;m.x+=Math.sin(m.ph)*dt*2;if(m.y>230){m.y=rnd(10,40);m.x=rnd(150,225);}}
      if(scene==='title'){if(sceneT>3.2&&!trans)goScene('talk');return;}
      if(scene==='talk'){
        const L=TALK[Math.min(talkI,TALK.length-1)][1];
        if(talkC<L.length){talkC=Math.min(L.length,talkC+dt*26);blipCd-=dt;if(blipCd<=0){blipCd=.07;SX.play('blip',.7);}}
        cat.tail+=dt;
        return;
      }
      if(scene==='ending'){
        cat.tail+=dt;
        for(const p of parts){if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;}}
        if(sceneT>1.35&&sceneT-dt<=1.35){SX.play(endReason==='woke'?'sad':'stamp');try{AU.se(endReason==='clear'?'rank':'back');}catch(_){}}
        if(sceneT>3&&sceneT-dt<=3)SX.play('bird');
        if(sceneT>12&&!mg._ended&&!trans){mg.end(endReason);}
        return;
      }
      if(t<0){t+=dt;if(t>=0){t=0;act.classList.remove('hide');showBanner('23:00','フェーズ1：寝入りばな。ぐっすり眠っている','#8ab0ff',2);SX.play('done',.6);}}
      else if(phase==='play')t+=dt;
      if(banner){banner.t+=dt;if(banner.t>banner.dur)banner=null;}

      // フェーズ（難易度の三段階）
      const T2=hard>=2?16:24, T3=50;
      if(phase==='play'){
        if(gphase===1&&t>=T2){gphase=2;showBanner('23:'+String(Math.floor(T2/T_PLAY*60)).padStart(2,'0')+'　ねこが起きた','フェーズ2：いたずらに気をつけて','#e8b830',2.2);
          if(cat.mode==='nap'){cat.mode='wander';cat.wait=.8;cat.jump=.5;pop(cat.x,cat.y-14,'ふぁ……','#e8b830',9,1.2);SX.play('meow');}}
        if(gphase===2&&t>=T3){gphase=3;showBanner('23:37　眠りが浅くなってきた','フェーズ3：「うとうと」が長く、頻繁に','#ff8aa0',2.2);SX.play('tension');}
      }
      // 眠りの周期（ぐっすり→うとうと）。フェーズが進むほど浅い時間が長く、周期も短い
      const period=gphase===1?24:gphase===2?20:14, ls=gphase===1?.72:gphase===2?.6:.45;
      if(t>0)cycT=(cycT+dt/period)%1;
      const cyc=cycT;
      let target=cyc<ls?0:cyc<ls+.08?(cyc-ls)/.08:cyc<.92?1:1-(cyc-.92)/.08;
      sleepCycle+=(target-sleepCycle)*Math.min(1,dt*3);
      if(t<=0)sleepCycle=0;
      // 寝返り
      const light=sleepCycle>.5;
      if(light&&!wasLight&&phase==='play'){rollSide=Math.random()<.5?-1:1;pop(CHILD.x+16,CHILD.y-16,'もぞ……','#e8b830',9,1.2);SX.play('rustle',.5);}
      wasLight=light;
      childRoll+=((light?rollSide:0)-childRoll)*Math.min(1,dt*2.2);
      // 警戒段階（静寂→気配→警戒）
      const lv=noise>66?2:noise>35?1:0;
      if(lv>alertLv&&phase==='play'){if(lv===2){SX.play('alert');SX.play('tension',.8);}else SX.play('heart',.6);}
      alertLv=lv;
      heartCd-=dt;
      if(lv===2&&phase==='play'&&heartCd<=0){heartCd=1.05-noise/100*.45;SX.play('heart');}

      // 移動
      let ix=0,iy=0,spd=0;
      const isHold=(holding||keyHold)&&t>=0&&phase==='play';
      if(t>=0&&phase==='play'&&!isHold){
        if(joy){const d=Math.hypot(joy.dx,joy.dy);if(d>4){ix=joy.dx/d;iy=joy.dy/d;spd=Math.min(1,(d-4)/50);}}
        else{
          ix=(keys.r?1:0)-(keys.l?1:0);iy=(keys.d?1:0)-(keys.u?1:0);
          const d=Math.hypot(ix,iy);if(d>0){ix/=d;iy/=d;spd=keys.run?1:.4;}
        }
      }
      const tvx=ix*spd*MAXV,tvy=iy*spd*MAXV;
      const k=Math.min(1,dt*9);
      P.vx+=(tvx-P.vx)*k;P.vy+=(tvy-P.vy)*k;
      const px0=P.x,py0=P.y;
      P.x+=P.vx*dt;P.y+=P.vy*dt;
      collide(P,PR);
      const mv=Math.hypot(P.x-px0,P.y-py0);
      const s=dt>0?Math.min(1,mv/dt/MAXV):0;
      if(s>.04){
        const ta=Math.atan2(P.vy,P.vx);let da=ta-P.ang;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;P.ang+=da*Math.min(1,dt*12);
        P.walk+=mv*.16;
      }
      // 足音
      if(phase==='play'&&t>=0){
        const fl=floorAt(P.x,P.y);
        const fm=fl==='tatami'?.75:fl==='tile'?1.2:1;
        const q=Math.max(0,(s-.32)/.68);
        if(q>0)addNoise(26*Math.pow(q,1.25)*fm*dt,P.x,P.y);
        stepAcc+=mv;
        if(stepAcc>22){stepAcc=0;if(s>.2){ring(P.x,P.y,6+s*16,q>0?'rgba(232,184,48,.7)':'rgba(187,174,221,.35)',.5);SX.play('step',.25+s*.9*fm);}}
        // きしむ床
        for(let i=0;i<CREAK.length;i++){
          const c=CREAK[i],inside=P.x>c[0]&&P.x<c[2]&&P.y>c[1]&&P.y<c[3];
          if(inside&&!creakIn[i]&&s>.06){
            const v=3+15*Math.pow(s,1.2);
            spike(v,P.x,P.y,s>.5?'ギィッ！':'ギシ…');creakFound[i]=1;creaks++;
            SX.play('creak',.4+s);
          }
          creakIn[i]=inside;
        }
        // おもちゃを踏む
        for(const ty of toys){
          if(ty.got)continue;
          ty.cool-=dt;
          const d=dist(P.x,P.y,ty.x,ty.y);
          if(d<PR+5&&s>.12&&ty.cool<=0){
            ty.cool=1.2;toyHits++;
            const base=ty.k==='block'?16+22*s:ty.k==='duck'?18+14*s:ty.k==='ball'?8+12*s:10+16*s;
            const txt=ty.k==='block'?'ガチャッ':ty.k==='duck'?'ピーッ！':ty.k==='ball'?'ポン…':'ガラガラ';
            spike(base,ty.x,ty.y,txt);
            SX.play(ty.k==='block'?'clack':ty.k==='duck'?'squeak':ty.k==='ball'?'ball':'rattle');
            const kk=ty.k==='car'?2.2:ty.k==='ball'?2.8:1.2;
            ty.vx=P.vx*kk+rnd(-20,20);ty.vy=P.vy*kk+rnd(-20,20);
            if(ty.k==='block'||ty.k==='duck'){P.yelp=.9;pop(P.x,P.y-20,ty.k==='block'?'っ……！':'わっ','#ffd0d8',10,1);P.vx*=.2;P.vy*=.2;}
            burst(ty.x,ty.y,8,[ty.c,'#ffffff'],60,.4,1.4);
          }
        }
      }
      // おもちゃの滑り
      for(const ty of toys){
        if(ty.got)continue;
        if(ty.vx||ty.vy){
          ty.x+=ty.vx*dt;ty.y+=ty.vy*dt;ty.rot+=(Math.abs(ty.vx)+Math.abs(ty.vy))*dt*.03;
          const f=Math.pow(ty.k==='car'||ty.k==='ball'?.35:.02,dt);ty.vx*=f;ty.vy*=f;
          const o={x:ty.x,y:ty.y};collide(o,5);
          if(o.x!==ty.x)ty.vx*=-.5;if(o.y!==ty.y)ty.vy*=-.5;ty.x=o.x;ty.y=o.y;
          if(Math.abs(ty.vx)+Math.abs(ty.vy)<2){ty.vx=ty.vy=0;}
        }
      }

      // 家事（長押し）
      curSt=phase==='play'&&t>=0?nearestStation():null;
      const wOn=isHold&&curSt==='dishes'&&phase==='play';
      if(wOn!==waterOn){waterOn=wOn;SX.setWater(wOn);}
      // アニメーション状態
      P.state=P.yelp>0?'startled':isHold&&curSt?'act':s<.04?'idle':s<.36?'sneak':s<.75?'walk':'run';
      idleT=(P.state==='idle'&&phase==='play'&&t>0)?idleT+dt:0;
      if(isHold&&curSt){
        P.vx*=.5;P.vy*=.5;
        chopCd-=dt;
        if(curSt==='toy'){
          const ty=curToy;
          ty.p+=dt/(.45*holdMul);
          if(ty.p>=1){ty.got=true;toysLeft--;P.carry++;se('btn',true);SX.play('pick');spike(2,ty.x,ty.y,null);
            burst(ty.x,ty.y,10,[ty.c,'#ffffff'],40,.5,1.3);pop(ty.x,ty.y-12,'ひろった '+(toys.length-toysLeft)+'/'+toys.length,'#7dffe9',9,1);}
        }else if(curSt==='toys'&&toysLeft>0){
          if(chopCd<=0){chopCd=1.4;pop(ST.toys.x,ST.toys.y-26,'まだ床に '+toysLeft+'個','#e8b830',9,1.2);}
        }else{
          const s0=ST[curSt];
          s0.p+=dt/s0.hold;
          if(curSt==='laundry'){addNoise(1.4*dt,s0.x,s0.y);if(chopCd<=0){chopCd=rnd(.9,1.4);spike(2.6,s0.x,s0.y,'パサ');SX.play('rustle');burst(s0.x+rnd(-8,8),s0.y+18,4,['#e8e0f0','#c8d8ff'],20,.6,1.2);}}
          else if(curSt==='dishes'){addNoise(7*dt,s0.x,s0.y);
            const p=parts[pi];pi=(pi+1)%parts.length;p.x=s0.x+14+rnd(-1,1);p.y=s0.y-6;p.vx=rnd(-14,4);p.vy=rnd(10,30);p.max=p.life=.5;p.sz=1;p.col='#a8d8ff';p.g=60;
            if(chopCd<=0){chopCd=rnd(.6,1.1);spike(6,s0.x,s0.y,Math.random()<.5?'カチャ':'カン');SX.play('clink');}}
          else if(curSt==='note'){addNoise(.4*dt,s0.x,s0.y);if(chopCd<=0){chopCd=1.2;SX.play('scratch');pop(s0.x+rnd(-10,10),s0.y-18,['カリカリ','「きょうも げんきでした」','ハンカチよし','着替えよし'][(Math.random()*4)|0],'#bbaedd',8,1);}}
          else if(curSt==='toys'){if(s0.p>.05)P.carry=Math.ceil(toys.length*(1-s0.p));}
          if(s0.p>=1){if(curSt==='toys')P.carry=0;completeStation(curSt);}
        }
      }else chopCd=Math.min(chopCd,.15);

      // ねこ
      updateCat(dt);

      // 物音メーターの減衰
      if(spikeGrace>0)spikeGrace-=dt;
      noise-=(spikeGrace>0?2.5:6+noise*.03)*dt;
      noise=Math.max(0,noise);
      maxNoise=Math.max(maxNoise,noise);
      if(phase==='play'&&t>=0){
        if(noise>=100){noise=100;wake();}
        else if(noise>66&&!stirSaid){stirSaid=true;pop(CHILD.x+22,CHILD.y-14,'ん……ぅ','#ffb0c0',11,1.4);SX.play('whimper');if(warnCd<=0){se('warn',true);warnCd=3;}}
        else if(noise<50)stirSaid=false;
        if(t>=T_PLAY){phase='late';endT=0;SX.setWater(false);showBanner('0:00','……日付が変わってしまった','#8a7aa8',2.4);try{AU.se('back');}catch(_){}}
      }
      if(phase!=='play'){
        endT+=dt;
        if(endT>2.6&&!trans&&scene==='game'){endReason=phase;computeGrade();goScene('ending');}
      }

      // Zzz
      zzzCd-=dt;
      if(zzzCd<=0&&phase!=='woke'){
        zzzCd=sleepCycle>.5?2.2:1.1;
        const z=zzz.find(o=>!o.on);if(z){z.on=true;z.t=0;z.x=CHILD.x+10;z.y=CHILD.y-6;z.s=sleepCycle>.5?.6:1;}
      }
      for(const z of zzz){if(z.on){z.t+=dt;if(z.t>2.6)z.on=false;}}
      // 粒子
      for(const p of parts){if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;p.vx*=.97;p.vy*=.97;}}
      for(const r of rings)if(r.t>0)r.t-=dt;
      for(const o of pops)if(o.t>0){o.t-=dt;o.y-=dt*10;}
      for(const ty of toys)ty.tw+=dt;
    }

    function catGo(x,y){
      cat.path.length=0;
      const sideA=cat.y<254,sideB=y<254;
      if(sideA!==sideB){cat.path.push([cat.y<254?182:180,sideA?240:268]);cat.path.push([180,sideA?268:240]);}
      cat.path.push([x,y]);
      const n=cat.path.shift();cat.tx=n[0];cat.ty=n[1];
    }
    function updateCat(dt){
      cat.tail+=dt;
      if(cat.jump>0)cat.jump=Math.max(0,cat.jump-dt);
      if(t<0||cat.mode==='nap')return;
      if(cat.pet>0)cat.pet-=dt;
      const d=dist(cat.x,cat.y,cat.tx,cat.ty);
      if(d>2&&cat.mode!=='sit'){
        const sp=cat.mode==='go'?40:28;
        const ux=(cat.tx-cat.x)/d,uy=(cat.ty-cat.y)/d;
        cat.x+=ux*sp*dt;cat.y+=uy*sp*dt;cat.walk+=sp*dt*.2;
        const ta=Math.atan2(uy,ux);let da=ta-cat.ang;while(da>Math.PI)da-=6.283;while(da<-Math.PI)da+=6.283;cat.ang+=da*Math.min(1,dt*8);
        return;
      }
      if(cat.path.length){const n=cat.path.shift();cat.tx=n[0];cat.ty=n[1];return;}
      cat.cd-=dt;
      if(cat.mode==='go'){cat.mode='mis';cat.misT=3;pop(cat.x,cat.y-16,'……','#e8b830',9,1);}
      if(cat.mode==='mis'){
        cat.misT-=dt;
        if(dist(P.x,P.y,cat.x,cat.y)<36&&phase==='play'){
          cat.mode='sit';cat.wait=3;cat.pet=1.4;catPets++;
          pop(cat.x,cat.y-18,'ゴロゴロ…','#ffb0d0',10,1.4);burst(cat.x,cat.y-8,8,['#ff7aa8','#ffd0e0'],30,1,1.6,-10);
          se('repair');SX.play('purr');cat.cd=rnd(16,22);return;
        }
        if(cat.misT<=0){
          const m=cat.mis;spike(20,m.sx,m.sy,m.txt);SX.play('crash');cat.jump=.5;burst(m.sx,m.sy,14,['#dcd4ff','#ffffff','#e8b830'],70,.6,1.6);
          cat.mode='flee';catGo(...CAT_WP[(Math.random()*CAT_WP.length)|0]);cat.cd=rnd(16,22);
        }
        return;
      }
      if(cat.mode==='sit'){cat.wait-=dt;if(cat.wait<=0)cat.mode='wander';return;}
      cat.wait-=dt;
      if(cat.wait>0)return;
      if(cat.cd<=0&&phase==='play'&&t<T_PLAY-8){
        cat.mis=CAT_MIS[(Math.random()*CAT_MIS.length)|0];cat.mode='go';catGo(cat.mis.x,cat.mis.y);
        pop(cat.x,cat.y-14,'にゃ','#e8b830',8,.8);SX.play('meow',.6);
      }else{
        cat.mode='wander';cat.wait=rnd(1.5,4);
        const w=CAT_WP[(Math.random()*CAT_WP.length)|0];catGo(w[0],w[1]);
      }
    }

    // ── 描画 ──
    const wx=x=>OX+x*S, wy=y=>OY+y*S;
    function setW(){cx.setTransform(dpr*S,0,0,dpr*S,dpr*OX,dpr*OY);}
    function setS(){cx.setTransform(dpr,0,0,dpr,0,0);}
    function gl(img,x,y,r,a){cx.globalAlpha=a;cx.drawImage(img,x-r,y-r,r*2,r*2);}
    function drawLaundry(){
      const s=ST.laundry,p=s.p;
      // かごの中の山（減っていく）
      const n=Math.round(7*(1-p));
      const cols=['#c8c0e0','#e8a0b0','#a0c0e8','#f0ead8','#b0e0c0','#e8d090','#d0d0d8'];
      for(let i=0;i<n;i++){
        cx.fillStyle=cols[i];cx.save();cx.translate(226+(i*11)%28+4,48+((i*7)%20)+3);cx.rotate(i*.9);
        rrp(cx,-6,-4,12,8,3);cx.fill();cx.restore();
      }
      // たたんだ山（増えていく）
      const m=Math.floor(p*5+.001);
      for(let i=0;i<m;i++){
        cx.fillStyle=cols[i+1];rrp(cx,210-i*.5,86-i*2.6,16,8,2);cx.fill();
        cx.strokeStyle='rgba(0,0,0,.25)';cx.lineWidth=.5;cx.stroke();
      }
      if(curSt==='laundry'&&(holding||keyHold)&&phase==='play'){
        // 手元でぱたぱた揺れる布
        const f=Math.sin(clock*9);
        cx.fillStyle=cols[(m+1)%7];cx.save();cx.translate(P.x+Math.cos(P.ang)*12,P.y+Math.sin(P.ang)*12);cx.rotate(P.ang);cx.scale(1,.6+.4*Math.abs(f));
        rrp(cx,-7,-8,14,16,3);cx.fill();cx.restore();
      }
    }
    function drawDishes(){
      const p=ST.dishes.p,n=Math.round(6*(1-p));
      for(let i=0;i<n;i++){
        const x=258+(i%3)*9-(i>2?3:0),y=316+((i/3)|0)*12+(i%2)*3;
        cx.fillStyle=i%2?'#e8e4ee':'#c8d8e8';cx.beginPath();cx.ellipse(x,y,5.5,5,0,0,7);cx.fill();
        cx.strokeStyle='rgba(80,80,110,.6)';cx.lineWidth=.6;cx.beginPath();cx.arc(x,y,3,0,7);cx.stroke();
      }
      const m=Math.floor(p*6+.001);
      for(let i=0;i<m;i++){cx.fillStyle='#dce6f0';cx.fillRect(272,358+(i<6?-i*1.5:0)-36,10,1.6);}
      // 水
      if(curSt==='dishes'&&(holding||keyHold)&&phase==='play'){
        cx.strokeStyle='rgba(170,220,255,.8)';cx.lineWidth=1.4;cx.beginPath();cx.moveTo(277,325);cx.lineTo(276+Math.sin(clock*30)*.5,336);cx.stroke();
      }
    }
    function drawNote(){
      const p=ST.note.p;
      // 連絡帳
      cx.save();cx.translate(100,350);cx.rotate(.08);
      if(p>0){cx.fillStyle='#f4eedc';cx.fillRect(-12,-8,24,16);cx.fillStyle='#4a90c8';cx.fillRect(-.6,-8,1.2,16);
        cx.strokeStyle='rgba(60,60,90,.6)';cx.lineWidth=.5;const lines=Math.floor(p*8);
        for(let i=0;i<lines;i++){const lx=i<4?-10:2,ly=-5+(i%4)*3.4;cx.beginPath();cx.moveTo(lx,ly);cx.lineTo(lx+7+((i*3)%3),ly);cx.stroke();}}
      else{cx.fillStyle='#4a90c8';cx.fillRect(-6,-8,12,16);cx.fillStyle='#fff';cx.fillRect(-3,-5,6,3);}
      cx.restore();
      // 鉛筆
      cx.strokeStyle='#e8b830';cx.lineWidth=1.6;cx.beginPath();
      const pp=curSt==='note'&&(holding||keyHold)?Math.sin(clock*14)*2:0;
      cx.moveTo(112+pp,346);cx.lineTo(120+pp,338);cx.stroke();
      // コップ（ねこが狙う）
      if(!(cat.mis===CAT_MIS[0]&&cat.mode==='flee')){cx.fillStyle='rgba(200,220,255,.75)';cx.beginPath();cx.arc(112,328,4,0,7);cx.fill();cx.fillStyle='rgba(255,255,255,.6)';cx.fillRect(110,326,1.4,1.4);}
    }
    function drawToy(ty){
      if(ty.got)return;
      cx.save();cx.translate(ty.x,ty.y);
      cx.fillStyle='rgba(0,0,0,.35)';cx.beginPath();cx.ellipse(1.5,2.5,6,4,0,0,7);cx.fill();
      cx.rotate(ty.rot);
      if(ty.k==='block'){
        cx.fillStyle=ty.c;cx.fillRect(-5,-5,10,10);cx.fillStyle='rgba(255,255,255,.3)';cx.fillRect(-5,-5,10,2);
        cx.fillStyle='rgba(0,0,0,.25)';cx.fillRect(-5,3,10,2);
        cx.fillStyle='#fff';cx.font=`7px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(ty.ch,0,.5);
      }else if(ty.k==='car'){
        cx.fillStyle=ty.c;rrp(cx,-7,-4,14,8,2.5);cx.fill();cx.fillStyle='#5ac8f0';cx.fillRect(-2,-3,5,6);
        cx.fillStyle='#202020';cx.fillRect(-6,-5,3,1.6);cx.fillRect(3,-5,3,1.6);cx.fillRect(-6,3.4,3,1.6);cx.fillRect(3,3.4,3,1.6);
      }else{
        cx.fillStyle=ty.c;cx.beginPath();cx.ellipse(0,1,6,5,0,0,7);cx.fill();cx.beginPath();cx.arc(3,-3,3.4,0,7);cx.fill();
        cx.fillStyle='#ff8a2a';cx.fillRect(5.5,-3.5,3,1.6);cx.fillStyle='#202020';cx.fillRect(3.5,-4.4,1,1);
      }
      cx.restore();
    }
    function drawChild(){
      const br=Math.sin(clock*(phase==='woke'?0:1.9))*.5+.5;
      const stir=Math.max(0,(noise-50)/50);
      const roll=sleepCycle*Math.sin(clock*.7)*1.6+stir*Math.sin(clock*18)*1.2;
      if(phase==='woke'&&endT>.3){
        // 起き上がって泣いている
        const k=Math.min(1,(endT-.3)/.5);
        cx.fillStyle='#8cc4e8';rrp(cx,36,74,66,66,6);cx.fill();
        cx.fillStyle='#f0c8d8';cx.beginPath();cx.ellipse(69,78-k*6,13,10,0,0,7);cx.fill();
        cx.fillStyle='#f6dcc8';cx.beginPath();cx.arc(69,62-k*8,9.5,0,7);cx.fill();
        cx.fillStyle='#3a2a20';cx.beginPath();cx.arc(69,59-k*8,9.5,Math.PI*1.05,Math.PI*1.95);cx.fill();
        cx.strokeStyle='#3a2a20';cx.lineWidth=1;cx.beginPath();cx.arc(65.5,63-k*8,1.6,Math.PI*1.1,Math.PI*1.9);cx.stroke();cx.beginPath();cx.arc(72.5,63-k*8,1.6,Math.PI*1.1,Math.PI*1.9);cx.stroke();
        cx.fillStyle='#c04060';cx.beginPath();cx.ellipse(69,67.5-k*8,2.2,1.6+Math.abs(Math.sin(clock*8))*.8,0,0,7);cx.fill();
        return;
      }
      // 頭
      cx.save();cx.translate(69+roll,52);
      cx.fillStyle='#f6dcc8';cx.beginPath();cx.arc(0,0,8.5,0,7);cx.fill();
      cx.fillStyle='#3a2a20';cx.beginPath();cx.arc(0,-2.5,8.8,Math.PI*.95,Math.PI*2.05);cx.fill();
      cx.beginPath();cx.arc(-4,-7,3,0,7);cx.fill();
      cx.fillStyle='#ffb0b8';cx.globalAlpha=.6;cx.beginPath();cx.arc(-5,3,1.8,0,7);cx.fill();cx.beginPath();cx.arc(5,3,1.8,0,7);cx.fill();cx.globalAlpha=1;
      cx.strokeStyle='#5a3a30';cx.lineWidth=.8;
      cx.beginPath();cx.arc(-3,1,1.6,.2,Math.PI-.2);cx.stroke();cx.beginPath();cx.arc(3,1,1.6,.2,Math.PI-.2);cx.stroke();
      cx.restore();
      // 掛け布団（呼吸でふくらむ）
      cx.save();cx.translate(69,104);cx.scale(1+br*.02+stir*.02,1+br*.03);cx.rotate(roll*.01);
      cx.fillStyle='#8cc4e8';rrp(cx,-34,-40,68,76,8);cx.fill();
      cx.fillStyle='rgba(255,255,255,.12)';rrp(cx,-34,-40,68,10,6);cx.fill();
      cx.fillStyle='#f0e8a0';
      for(const [sx,sy] of [[-20,-20],[10,-26],[18,4],[-12,10],[4,22],[-24,26],[22,26]]){
        cx.beginPath();for(let i=0;i<5;i++){const a=i*1.2566-1.57;cx.lineTo(sx+Math.cos(a)*3,sy+Math.sin(a)*3);const b=a+.628;cx.lineTo(sx+Math.cos(b)*1.3,sy+Math.sin(b)*1.3);}cx.closePath();cx.fill();
      }
      cx.fillStyle='rgba(0,0,0,.15)';cx.beginPath();cx.ellipse(-4,-6,16,22,0,0,7);cx.fill(); // 体のふくらみの影
      cx.fillStyle='rgba(255,255,255,.08)';cx.beginPath();cx.ellipse(-8,-12,10,14,0,0,7);cx.fill();
      cx.restore();
      // ぬいぐるみ
      cx.fillStyle='#c8a080';cx.beginPath();cx.arc(92,60,5,0,7);cx.fill();cx.beginPath();cx.arc(88.5,56,2,0,7);cx.fill();cx.beginPath();cx.arc(95.5,56,2,0,7);cx.fill();
      cx.fillStyle='#3a2a20';cx.fillRect(90.5,59,1,1);cx.fillRect(93,59,1,1);
      // うとうと中は手が出る
      if(sleepCycle>.5){cx.fillStyle='#f6dcc8';cx.beginPath();cx.ellipse(44+roll,72,4,3,.4,0,7);cx.fill();}
    }
    function drawPlayer(){
      const a=P.ang,sw=Math.sin(P.walk)*Math.min(1,Math.hypot(P.vx,P.vy)/40);
      const doing=(holding||keyHold)&&curSt&&phase==='play';
      cx.save();cx.translate(P.x,P.y);
      cx.fillStyle='rgba(0,0,0,.4)';cx.beginPath();cx.ellipse(2,3,13,10,0,0,7);cx.fill();
      cx.rotate(a+Math.PI/2); // 上向き基準
      // 足
      cx.fillStyle='#2a2440';
      cx.beginPath();cx.ellipse(-4,-sw*6,3,4.6,0,0,7);cx.fill();
      cx.beginPath();cx.ellipse(4,sw*6,3,4.6,0,0,7);cx.fill();
      // 腕
      const ar=doing?-7+Math.sin(clock*12)*2:sw*5;
      cx.fillStyle='#4a3670';
      cx.beginPath();cx.ellipse(-11,ar,3.4,5,0,0,7);cx.fill();
      cx.beginPath();cx.ellipse(11,doing?-7-Math.sin(clock*12)*2:-sw*5,3.4,5,0,0,7);cx.fill();
      cx.fillStyle='#e8c8b0';
      cx.beginPath();cx.arc(-11,ar-4.5,2.2,0,7);cx.fill();
      cx.beginPath();cx.arc(11,(doing?-7-Math.sin(clock*12)*2:-sw*5)-4.5,2.2,0,7);cx.fill();
      // 胴（パーカー）
      const tg=cx.createLinearGradient(-12,0,12,0);tg.addColorStop(0,'#3e2c62');tg.addColorStop(.5,'#5a4290');tg.addColorStop(1,'#33244f');
      cx.fillStyle=tg;cx.beginPath();cx.ellipse(0,1,12,7.5,0,0,7);cx.fill();
      cx.fillStyle='#2e2048';cx.beginPath();cx.ellipse(0,5.5,7,3.4,0,0,7);cx.fill(); // フード
      cx.strokeStyle='rgba(0,232,200,.35)';cx.lineWidth=.7;cx.beginPath();cx.moveTo(-3,-2);cx.lineTo(-3,2);cx.moveTo(3,-2);cx.lineTo(3,2);cx.stroke();
      // 頭
      cx.fillStyle='#e8c8b0';cx.beginPath();cx.arc(0,-3.5,5.4,Math.PI*1.1,Math.PI*1.9,true);cx.fill();
      cx.fillStyle='#16121e';cx.beginPath();cx.arc(0,-.5,6.4,0,7);cx.fill();
      cx.fillStyle='rgba(138,82,212,.45)';cx.beginPath();cx.arc(-1.6,-2,3,0,7);cx.fill();
      cx.strokeStyle='#16121e';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(1,4);cx.quadraticCurveTo(4,7,2,9);cx.stroke(); // 寝ぐせ
      cx.restore();
      // 持っているおもちゃ
      if(P.carry>0){
        for(let i=0;i<P.carry;i++){const tc=['#e85a6a','#4ab0e8','#e8b830','#ffd84a','#58d08a'][i%5];
          cx.fillStyle=tc;cx.fillRect(P.x-8+i*4,P.y-20-(i%2)*2,3.5,3.5);}
      }
    }
    function drawCat(){
      const c=cat;
      cx.save();cx.translate(c.x,c.y);
      cx.fillStyle='rgba(0,0,0,.35)';cx.beginPath();cx.ellipse(1,2,9,5,0,0,7);cx.fill();
      cx.rotate(c.ang);
      const sit=c.mode==='sit'||c.mode==='mis'||c.wait>0&&c.mode==='wander';
      // しっぽ
      cx.strokeStyle='#120e18';cx.lineWidth=2.4;cx.lineCap='round';
      const tw=Math.sin(c.tail*(c.mode==='mis'?7:2.4))*(c.mode==='mis'?7:4);
      cx.beginPath();cx.moveTo(-7,0);cx.quadraticCurveTo(-13,tw,-17,tw*.4+(sit?4:0));cx.stroke();
      cx.lineCap='butt';
      cx.fillStyle='#120e18';
      cx.beginPath();cx.ellipse(-1,0,sit?6.5:8,sit?5.5:4.4,0,0,7);cx.fill();
      cx.beginPath();cx.arc(7,0,4.2,0,7);cx.fill();
      cx.beginPath();cx.moveTo(7,-3);cx.lineTo(10,-6);cx.lineTo(9.5,-1.5);cx.closePath();cx.fill();
      cx.beginPath();cx.moveTo(7,3);cx.lineTo(10,6);cx.lineTo(9.5,1.5);cx.closePath();cx.fill();
      cx.fillStyle='rgba(138,82,212,.25)';cx.beginPath();cx.ellipse(-2,-1.5,5,1.6,0,0,7);cx.fill();
      cx.restore();
    }
    function drawCatEyes(){
      const c=cat;
      const ex=c.x+Math.cos(c.ang)*9,ey=c.y+Math.sin(c.ang)*9,nx=-Math.sin(c.ang)*1.8,ny=Math.cos(c.ang)*1.8;
      const blink=(Math.sin(clock*.9+1)>.97)||c.pet>0;
      if(blink)return;
      gl(glow.gd,ex,ey,7,.5);
      cx.globalAlpha=1;cx.fillStyle='#e8f070';
      cx.fillRect(ex+nx-.6,ey+ny-.6,1.2,1.2);cx.fillRect(ex-nx-.6,ey-ny-.6,1.2,1.2);
    }

    function drawStationMarks(){
      cx.textAlign='center';cx.textBaseline='middle';
      for(const k of ORDER){
        const s=ST[k];
        const mx=k==='laundry'?240:k==='dishes'?236:k==='note'?110:258;
        const my=k==='laundry'?100:k==='dishes'?330:k==='note'?394:192;
        if(s.done){
          cx.globalAlpha=.7;cx.fillStyle='#44ee88';cx.font=`9px ${FONT}`;cx.fillText('✓',mx,my);continue;
        }
        const near=curSt===k;
        const pulse=.5+Math.sin(clock*3+mx)*.5;
        gl(glow.cy,mx,my,near?20:12+pulse*4,near?.5:.18+pulse*.12);
        cx.globalAlpha=near?1:.55;
        cx.strokeStyle='#7dffe9';cx.lineWidth=.8;cx.beginPath();cx.arc(mx,my,6,0,7);cx.stroke();
        cx.fillStyle='#d6fff8';cx.font=`7px ${FONT}`;cx.fillText(s.icon,mx,my+.5);
        if(s.p>0){cx.strokeStyle='#e8b830';cx.lineWidth=1.4;cx.beginPath();cx.arc(mx,my,8,-1.57,-1.57+6.283*s.p);cx.stroke();}
      }
      cx.globalAlpha=1;
      // 床のおもちゃのきらめき
      for(const ty of toys){
        if(ty.got)continue;
        const tw=Math.max(0,Math.sin(ty.tw*2.2));
        if(tw>.6){gl(glow.wt,ty.x-2,ty.y-3,5+tw*3,(tw-.6)*.9);}
      }
      // 見つけたきしむ板
      cx.globalAlpha=.45;cx.fillStyle='#e8b830';cx.font=`7px ${FONT}`;
      for(let i=0;i<CREAK.length;i++){if(!creakFound[i])continue;const c=CREAK[i];
        cx.setLineDash([2,2]);cx.strokeStyle='rgba(232,184,48,.5)';cx.lineWidth=.6;cx.strokeRect(c[0],c[1],c[2]-c[0],c[3]-c[1]);cx.setLineDash([]);
        cx.fillText('ギシ',(c[0]+c[2])/2,(c[1]+c[3])/2);}
      cx.globalAlpha=1;
    }
    function drawPlayerProgress(){
      if(!curSt||phase!=='play')return;
      let p=0;
      if(curSt==='toy')p=curToy.p;else p=ST[curSt].p;
      const hold=holding||keyHold;
      if(!hold&&p<=0)return;
      cx.globalAlpha=1;
      cx.strokeStyle='rgba(0,0,0,.5)';cx.lineWidth=3;cx.beginPath();cx.arc(P.x,P.y,16,0,7);cx.stroke();
      cx.strokeStyle=hold?'#7dffe9':'rgba(125,255,233,.5)';cx.lineWidth=2;cx.beginPath();cx.arc(P.x,P.y,16,-1.57,-1.57+6.283*Math.min(1,p));cx.stroke();
    }
    function drawZzz(){
      cx.textAlign='center';cx.textBaseline='middle';
      for(const z of zzz){
        if(!z.on)continue;
        const f=z.t/2.6;
        cx.globalAlpha=(f<.2?f/.2:1-(f-.2)/.8)*.8;
        cx.fillStyle=sleepCycle>.5?'#e8c070':'#a8c0ff';
        cx.font=`${(7+f*6)*z.s|0}px ${FONT}`;
        cx.fillText(f<.33?'z':'Z',z.x+f*14+Math.sin(f*8)*2,z.y-f*26);
      }
      cx.globalAlpha=1;
    }
    function drawLights(){
      cx.globalCompositeOperation='lighter';
      // 月明かり（雨粒の影でゆらぐ）
      cx.globalAlpha=.55+Math.sin(clock*.7)*.06+Math.sin(clock*3.1)*.03;
      cx.setTransform(dpr,0,0,dpr,dpr*OX,dpr*OY);cx.drawImage(lyBeam,0,0,WW*S,WH*S);setW();
      // 光の中のほこり
      for(const m of motes){const a=.25+Math.sin(m.ph*2)*.2;if(a<=0)continue;cx.globalAlpha=a;cx.fillStyle='#c8d8ff';cx.fillRect(m.x,m.y,.9,.9);}
      // 常夜灯
      const fl=1+Math.sin(clock*1.3)*.03;
      gl(glow.warm,18,166,70*fl,.5);gl(glow.warm,18,166,16,.9);
      // 窓の光
      gl(glow.moon,205,8,46,.45);
      // 炊飯器のLED・外のネオン
      gl(glow.gn,272,288,10,.7+Math.sin(clock*2)*.2);
      const nc=(Math.sin(clock*.5)+1)/2;
      gl(glow.pk,32,476,70,.18+nc*.12);gl(glow.cy,34,476,50,.12+(1-nc)*.12);
      // 手元灯（洗い物中）
      if(curSt==='dishes'&&(holding||keyHold)&&phase==='play')gl(glow.wt,266,330,40,.22);
      // プレイヤーのまわり（目が慣れている）
      gl(glow.wt,P.x,P.y,38,.08);
      if(phase==='clear'){gl(glow.gd,CHILD.x,CHILD.y+30,80,Math.min(.35,endT*.2));}
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      drawCatEyes();
      // 雨の窓
      cx.fillStyle='rgba(180,200,255,.5)';
      for(let i=0;i<9;i++){const x=152+((i*13+clock*3)%106),y=1.5+((clock*(10+i)+i*3)%5);cx.fillRect(x,y,.5,1.6);}
    }
    function drawFx(){
      // 音の波紋
      for(const r of rings){
        if(r.t<=0)continue;
        const f=1-r.t/r.max;
        cx.globalAlpha=(1-f)*.85;cx.strokeStyle=r.col;cx.lineWidth=1.2*(1-f)+.3;
        cx.beginPath();cx.arc(r.x,r.y,r.r*(.3+f*.9),0,7);cx.stroke();
        if(r.r>20){cx.globalAlpha=(1-f)*.4;cx.beginPath();cx.arc(r.x,r.y,r.r*(.15+f*.6),0,7);cx.stroke();}
      }
      cx.globalCompositeOperation='lighter';
      for(const p of parts){
        if(p.life<=0)continue;
        cx.globalAlpha=Math.min(1,p.life/p.max*1.4);cx.fillStyle=p.col;
        cx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
      }
      cx.globalCompositeOperation='source-over';
      cx.textAlign='center';cx.textBaseline='middle';
      for(const o of pops){
        if(o.t<=0)continue;
        const f=1-o.t/o.max;
        cx.globalAlpha=f<.1?f/.1:o.t/o.max<.3?o.t/o.max/.3:1;
        cx.font=`${o.sz}px ${FONT}`;
        cx.lineWidth=2.4;cx.strokeStyle='rgba(5,4,14,.85)';cx.strokeText(o.text,o.x,o.y);
        cx.fillStyle=o.col;cx.fillText(o.text,o.x,o.y);
      }
      cx.globalAlpha=1;
      // ねこの「！」
      if(cat.mode==='mis'){
        const k=cat.misT;
        const bx=cat.x,by=cat.y-16-Math.abs(Math.sin(clock*8))*2;
        cx.fillStyle=k<1?'#e83055':'#e8b830';cx.font=`12px ${FONT}`;
        cx.strokeStyle='rgba(5,4,14,.9)';cx.lineWidth=2.5;cx.strokeText('！',bx,by);cx.fillText('！',bx,by);
        cx.strokeStyle=k<1?'#e83055':'#e8b830';cx.lineWidth=1;cx.globalAlpha=.6;
        cx.beginPath();cx.arc(cat.x,cat.y,36,-1.57,-1.57+6.283*(k/3));cx.stroke();cx.globalAlpha=1;
      }
    }
    function drawHud(){
      setS();
      // 上部：物音メーター
      cx.fillStyle='rgba(10,7,22,.92)';cx.fillRect(0,0,W,TOP_H-4);
      cx.fillStyle='rgba(138,82,212,.35)';cx.fillRect(0,TOP_H-4,W,1);
      const bx=50,bw=Math.max(80,W-50-136),by=12,bh=12;
      cx.font=`11px ${FONT}`;cx.textAlign='left';cx.textBaseline='middle';cx.fillStyle='#bbaedd';cx.fillText('物音',12,by+bh/2);
      cx.fillStyle='rgba(255,255,255,.06)';rrp(cx,bx,by,bw,bh,5);cx.fill();
      const nv=Math.min(1,noise/100);
      if(nv>0){
        const gr=cx.createLinearGradient(bx,0,bx+bw,0);
        gr.addColorStop(0,'#44ee88');gr.addColorStop(.45,'#e8b830');gr.addColorStop(.8,'#e83055');gr.addColorStop(1,'#ff2050');
        cx.save();rrp(cx,bx,by,bw,bh,5);cx.clip();cx.fillStyle=gr;cx.fillRect(bx,by,bw*nv,bh);
        cx.fillStyle='rgba(255,255,255,.25)';cx.fillRect(bx,by,bw*nv,2);cx.restore();
        if(nv>.66){cx.globalCompositeOperation='lighter';gl(glow.rd,bx+bw*nv,by+bh/2,20,(nv-.6)*(.6+Math.sin(clock*12)*.4));cx.globalCompositeOperation='source-over';cx.globalAlpha=1;}
      }
      cx.strokeStyle='rgba(222,204,248,.35)';cx.lineWidth=1;rrp(cx,bx,by,bw,bh,5);cx.stroke();
      cx.fillStyle='rgba(222,204,248,.4)';cx.fillRect(bx+bw*.66,by-2,1,bh+4);
      cx.font=`8px ${FONT}`;cx.fillStyle='rgba(187,174,221,.6)';cx.fillText('起きる→',bx+bw-34,by+bh+8);
      // 子どもの眠り
      const st=phase==='woke'?['起きた','#e83055']:noise>66?['もぞもぞ…','#ff8aa0']:sleepCycle>.5?['うとうと','#e8b830']:['ぐっすり','#8ab0ff'];
      const sx=W-128;
      cx.fillStyle='rgba(255,255,255,.04)';rrp(cx,sx,7,118,24,8);cx.fill();
      cx.strokeStyle=st[1];cx.globalAlpha=.6;cx.stroke();cx.globalAlpha=1;
      // 三日月
      cx.fillStyle=st[1];cx.beginPath();cx.arc(sx+15,19,6,0,7);cx.fill();
      cx.fillStyle='#0d0a1c';cx.beginPath();cx.arc(sx+18,16.5,5.4,0,7);cx.fill();
      cx.fillStyle=st[1];cx.font=`11px ${FONT}`;cx.fillText(st[0],sx+28,19.5);
      // 眠りの深さの波
      cx.strokeStyle=st[1];cx.globalAlpha=.55;cx.lineWidth=1;cx.beginPath();
      for(let i=0;i<24;i++){const x=sx+86+i,y=19+Math.sin(i*.5-clock*(1.5+sleepCycle*4))*(2+sleepCycle*3);i?cx.lineTo(x,y):cx.moveTo(x,y);}
      cx.stroke();cx.globalAlpha=1;
      // 下部：ヒント
      const y0=H-BOT_H+6;
      cx.fillStyle='rgba(10,7,22,.86)';cx.fillRect(0,H-BOT_H,W,BOT_H);
      cx.fillStyle='rgba(138,82,212,.3)';cx.fillRect(0,H-BOT_H,W,1);
      cx.textAlign='left';cx.font=`11px ${FONT}`;
      let hint='',sub='';
      if(phase!=='play'){hint='';}
      else if(curSt==='toy'){hint='おもちゃを拾う';sub='長押し（Space / E）';}
      else if(curSt==='toys'&&toysLeft>0){hint='おもちゃ箱';sub='床のおもちゃを先に拾おう（あと'+toysLeft+'個）';}
      else if(curSt){hint=ST[curSt].name;sub=curSt==='dishes'?'水音に注意：うとうと中は手を止めて':curSt==='laundry'?'子どもの近く。そっとたたもう':'長押しで進める';}
      else{hint='ドラッグで移動';sub='ゆっくり動けば足音は立たない';}
      cx.fillStyle=curSt?'#7dffe9':'#deccf8';cx.fillText(hint,14,y0+12);
      cx.font=`9px ${FONT}`;cx.fillStyle='#8a7aa8';cx.fillText(sub,14,y0+28);
      // 家事リスト
      let lx=14;
      cx.font=`10px ${FONT}`;
      for(const k of ORDER){
        const s=ST[k];
        const lbl=k==='toys'?(s.done?'玩✓':'玩'+(toys.length-toysLeft)+'/'+toys.length):s.icon+(s.done?'✓':s.p>0?Math.floor(s.p*100)+'%':'');
        const w=cx.measureText(lbl).width+12;
        cx.fillStyle=s.done?'rgba(68,238,136,.14)':'rgba(255,255,255,.05)';rrp(cx,lx,y0+40,w,18,6);cx.fill();
        cx.strokeStyle=s.done?'rgba(68,238,136,.6)':'rgba(187,174,221,.25)';cx.lineWidth=1;cx.stroke();
        cx.fillStyle=s.done?'#44ee88':'#bbaedd';cx.fillText(lbl,lx+6,y0+50);
        lx+=w+5;
      }
      // ジョイスティック
      if(joy&&t>=0&&phase==='play'){
        const r=cv.getBoundingClientRect();
        const jx=joy.sx-r.left,jy=joy.sy-r.top;
        const d=Math.hypot(joy.dx,joy.dy),R=54,kk=d>R?R/d:1;
        const q=Math.min(1,Math.max(0,(d-4)/50));
        cx.globalAlpha=.8;
        cx.fillStyle='rgba(10,7,22,.35)';cx.beginPath();cx.arc(jx,jy,R,0,7);cx.fill();
        cx.strokeStyle='rgba(187,174,221,.35)';cx.lineWidth=1.2;cx.stroke();
        cx.fillStyle='rgba(0,232,200,.1)';cx.beginPath();cx.arc(jx,jy,4+50*.32,0,7);cx.fill();
        cx.strokeStyle='rgba(0,232,200,.45)';cx.setLineDash([3,3]);cx.stroke();cx.setLineDash([]);
        cx.font=`8px ${FONT}`;cx.textAlign='center';cx.fillStyle='rgba(125,255,233,.6)';cx.fillText('しずか',jx,jy-R-8);
        const kc=q>.32?(q>.7?'#e83055':'#e8b830'):'#7dffe9';
        cx.globalCompositeOperation='lighter';gl(q>.32?(q>.7?glow.rd:glow.gd):glow.cy,jx+joy.dx*kk,jy+joy.dy*kk,30,.5);cx.globalCompositeOperation='source-over';
        cx.globalAlpha=.9;cx.fillStyle=kc;cx.beginPath();cx.arc(jx+joy.dx*kk,jy+joy.dy*kk,13,0,7);cx.fill();
        cx.fillStyle='rgba(255,255,255,.4)';cx.beginPath();cx.arc(jx+joy.dx*kk-3,jy+joy.dy*kk-4,4,0,7);cx.fill();
        cx.globalAlpha=1;
      }
    }
    function drawBanner(){
      if(!banner)return;
      const b=banner,f=b.t/b.dur;
      const a=f<.12?f/.12:f>.8?(1-f)/.2:1;
      const y=OY+WH*S*.5;
      cx.globalAlpha=a*.88;cx.fillStyle='rgba(5,4,14,.78)';cx.fillRect(0,y-32,W,64);
      cx.fillStyle=b.col;cx.fillRect(0,y-32,W,1);cx.fillRect(0,y+31,W,1);
      cx.globalAlpha=a;cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`21px ${FONT}`;cx.fillStyle=b.col;cx.fillText(b.main,W/2,y-8);
      cx.font=`12px ${FONT}`;cx.fillStyle='#bbaedd';cx.fillText(b.sub,W/2,y+15);
      cx.globalAlpha=1;
    }
    function drawIntro(){
      const f=-t;if(f<=0)return;
      const a=Math.min(1,f/.3);
      cx.globalAlpha=a;cx.fillStyle='rgba(5,4,14,.72)';cx.fillRect(0,0,W,H);
      const pw=Math.min(W-28,340),ph=236,px=(W-pw)/2,py=H*.42-ph/2;
      cx.fillStyle='rgba(10,7,22,.96)';rrp(cx,px,py,pw,ph,10);cx.fill();
      cx.strokeStyle='rgba(138,82,212,.7)';cx.lineWidth=1;cx.stroke();
      cx.textAlign='center';cx.textBaseline='middle';cx.font=`16px ${FONT}`;cx.fillStyle='#deccf8';
      cx.fillText('……やっと、寝てくれた',W/2,py+26);
      cx.font=`10px ${FONT}`;cx.fillStyle='#8a7aa8';cx.fillText('0:00までに、起こさずに家事を4つ',W/2,py+46);
      cx.textAlign='left';const lx=px+18;
      const line=(y,col,mark,txt,sub)=>{cx.font=`12px ${FONT}`;cx.fillStyle=col;cx.fillText(mark,lx,y);cx.fillStyle='#bbaedd';cx.fillText(txt,lx+18,y);
        if(sub){cx.font=`10px ${FONT}`;cx.fillStyle='#8a7aa8';cx.fillText(sub,lx+18,y+15);}};
      line(py+76,'#00e8c8','◆','ドラッグで移動','小さく動かす＝忍び足（WASD／Shiftで早足）');
      line(py+112,'#7dffe9','◆','光る印の前で長押し','家事が進む（Space／E）');
      line(py+148,'#e83055','◆','物音メーターが満タンで起きる','床のきしみ・おもちゃ・水音・ねこに注意');
      line(py+184,'#e8b830','◆','「うとうと」中は音に敏感','「ぐっすり」の間に動こう');
      cx.textAlign='center';cx.font=`12px ${FONT}`;cx.fillStyle=`rgba(222,204,248,${.5+Math.sin(clock*5)*.3})`;
      cx.fillText('タップで開始',W/2,py+ph-16);
      cx.globalAlpha=1;
    }
    function draw(){
      setS();
      cx.fillStyle='#05040e';cx.fillRect(0,0,W,H);
      const sx=shake>0?(Math.random()-.5)*shake:0,sy=shake>0?(Math.random()-.5)*shake:0;
      cx.setTransform(dpr,0,0,dpr,dpr*(OX+sx),dpr*(OY+sy));
      cx.drawImage(lyStatic,0,0,WW*S,WH*S);
      cx.setTransform(dpr*S,0,0,dpr*S,dpr*(OX+sx),dpr*(OY+sy));
      drawLaundry();drawDishes();drawNote();
      for(const ty of toys)drawToy(ty);
      drawChild();
      drawCat();
      drawPlayer();
      cx.setTransform(dpr,0,0,dpr,dpr*(OX+sx),dpr*(OY+sy));
      cx.globalAlpha=1;cx.drawImage(lyDark,0,0,WW*S,WH*S);
      cx.setTransform(dpr*S,0,0,dpr*S,dpr*(OX+sx),dpr*(OY+sy));
      drawLights();
      cx.setTransform(dpr*S,0,0,dpr*S,dpr*(OX+sx),dpr*(OY+sy));
      drawZzz();
      drawStationMarks();
      drawFx();
      drawPlayerProgress();
      setS();
      cx.drawImage(lyVig,0,0,W,H);
      // 物音が大きいと心臓の音のように赤く脈打つ
      const nv=noise/100;
      if(nv>.55&&phase==='play'){
        const hb=Math.pow(Math.max(0,Math.sin(clock*(5+nv*5))),8);
        cx.fillStyle=`rgba(232,48,85,${(nv-.55)*.35*(.5+hb)})`;cx.fillRect(0,0,W,H);
      }
      if(redFlash>0){cx.fillStyle=`rgba(232,48,85,${redFlash*.3})`;cx.fillRect(0,0,W,H);}
      if(phase==='late'){cx.fillStyle=`rgba(5,4,14,${Math.min(.5,endT*.25)})`;cx.fillRect(0,0,W,H);}
      drawHud();
      drawBanner();
      drawIntro();
    }
    function hud(){
      const parts2=ORDER.map(k=>{const s=ST[k];const nm=k==='laundry'?'洗濯':k==='dishes'?'食器':k==='note'?'連絡帳':'玩具';
        return `<span style="color:${s.done?'var(--gn)':'var(--tx-d)'}">${s.done?'✓':'・'}${nm}</span>`;}).join(' ');
      if(parts2!==lastScore){lastScore=parts2;mg.setScore(parts2);}
      const mins=Math.min(60,Math.floor(Math.max(0,t)/T_PLAY*60));
      const tm=t<0?'23:00':mins>=60?'0:00':'23:'+String(mins).padStart(2,'0');
      if(tm!==lastTimer){lastTimer=tm;mg.setTimer(tm);}
      // 操作ボタン
      let lbl='家事',on=false,ready=false,p=0;
      if(phase==='play'&&t>=0&&curSt){
        if(curSt==='toy'){lbl='拾う';ready=true;p=curToy.p;}
        else if(curSt==='toys'&&toysLeft>0){lbl='しまう';ready=false;}
        else{lbl=ST[curSt].label;ready=true;p=ST[curSt].p;}
      }
      on=ready&&(holding||keyHold);
      const cls='stealth-act'+(t<0?' hide':'')+(ready?(on?' on':' ready'):' off');
      if(cls!==act.className)act.className=cls;
      if(lbl!==lastAct){lastAct=lbl;actB.textContent=lbl;}
      const pp=Math.round(p*50)*2;
      if(pp!==lastP){lastP=pp;act.style.setProperty('--p',pp);}
    }

    mg.loop(dt=>{
      update(dt);
      if(mg._ended)return;
      draw();hud();
    });

    return {result(reason){
      window.removeEventListener('resize',onResize);
      const done=ORDER.filter(k=>ST[k].done).length;
      const doneNames=ORDER.filter(k=>ST[k].done).map(k=>ST[k].name).join('・')||'なし';
      let fx,title,time,sp=0,log,cutin=null;
      if(reason==='clear'){
        const sec=Math.round(cleared);
        data.clears=(data.clears||0)+1;
        const newBest=!data.best||sec<data.best;if(newBest)data.best=sec;
        fx={childStress:-10,mental:3,hope:2,fatigue:4};time=45;sp=1;
        title='🤫 起こさずに、ぜんぶ終わった';
        log='子どもを起こさずに家事を終えた。寝顔を見て、少しだけ肩の力が抜けた。';
        cutin=['happy','……おやすみ。明日もちゃんと起こしたるからな。'];
        return {title,time,sp,fx,log,cutin,summary:`家事 <span class="up">${done}/4</span>　23:${String(Math.min(59,Math.floor(cleared/T_PLAY*60))).padStart(2,'0')} に完了`+
          `<br>最大の物音 <span class="${maxNoise>70?'down':'up'}">${Math.round(maxNoise)}%</span>`+(catPets?`　ねこをなでた <span class="up">${catPets}</span>`:'')+
          (newBest?'<br>自己ベスト更新！':`<br>最速記録 ${data.best}秒`)};
      }
      if(reason==='woke'){
        fx={childStress:4,mental:-3,fatigue:6};time=60;
        title='😢 起こしてしまった';
        log='物音で子どもが起きてしまった。抱っこして、もう一度寝かしつけた。';
        cutin=['tired','ごめんな、起こしてもうたな……よしよし。'];
        return {title,time,sp,fx,log,cutin,summary:`終わった家事 ${done}/4（${doneNames}）<br>泣き止むまで、背中をとんとんした。`+(toyHits?`<br>踏んだおもちゃ <span class="down">${toyHits}</span>`:'')};
      }
      if(reason==='late'){
        const cs=-Math.min(6,done*2);
        fx={childStress:cs,fatigue:5};time=60;
        title='🕛 0時を過ぎてしまった';
        log='家事が終わらないまま日付が変わった。残りは朝にまわす。';
        cutin=['tired','……もう0時か。残りは朝やな。'];
        return {title,time,sp,fx,log,cutin,summary:`終わった家事 ${done}/4（${doneNames}）<br>子どもは、ぐっすり眠っている。`};
      }
      fx={fatigue:2};time=20;
      return {title:'🤫 家事を切り上げた',time,sp,fx,log:'家事を途中で切り上げた。',cutin:null,summary:`終わった家事 ${done}/4`};
    }};
  },
});
