// ══════════════════════════════════════════════════════════
// シューティング「炎上コメント撃退」
// 降ってくる悪意のコメントを撃ち落とし、応援コメントは撃たずに受け止める。
// タイトル → 導入会話 → 遊び方 → 4ウェーブ＋ボス「炎上の渦」 → 評価 → 結末会話
// ══════════════════════════════════════════════════════════
addMinigameStyle('shooter',`
.mg-shooter{background:#05040e;}
.mg-shooter .shooter-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;}
.mg-shooter .shooter-bomb{position:absolute;right:8px;bottom:8px;z-index:3;touch-action:none;
  min-width:96px;min-height:54px;padding:6px 10px 5px;border-radius:10px;border:2px solid rgba(0,232,200,.75);
  background:linear-gradient(180deg,rgba(0,74,70,.92),rgba(6,22,36,.94) 60%,rgba(4,10,24,.96));color:#c8fff5;
  font-family:var(--dot);font-size:.62rem;line-height:1.25;text-align:center;cursor:pointer;
  box-shadow:0 0 12px rgba(0,232,200,.35),inset 0 1px 0 rgba(255,255,255,.25),inset 0 -2px 0 rgba(0,0,0,.4);
  transition:opacity .3s,filter .3s,transform .08s;-webkit-tap-highlight-color:transparent;}
.mg-shooter .shooter-bomb b{display:block;font-size:.74rem;font-weight:normal;color:#eafffb;letter-spacing:.04em;}
.mg-shooter .shooter-bomb small{display:block;font-family:var(--mono);font-size:.56rem;color:rgba(200,255,245,.65);}
.mg-shooter .shooter-bomb.ready{animation:shooter-pulse 1.8s ease-in-out infinite;}
.mg-shooter .shooter-bomb:active{transform:scale(.94);}
.mg-shooter .shooter-bomb.used{opacity:.3;filter:grayscale(1);animation:none;box-shadow:none;}
.mg-shooter .shooter-bomb.hide{opacity:0;pointer-events:none;}
@keyframes shooter-pulse{0%,100%{box-shadow:0 0 10px rgba(0,232,200,.3),inset 0 1px 0 rgba(255,255,255,.25);}50%{box-shadow:0 0 22px rgba(0,232,200,.7),inset 0 1px 0 rgba(255,255,255,.35);}}
.mg-shooter .shooter-dlg{position:absolute;left:8px;right:8px;bottom:10px;z-index:5;display:flex;gap:10px;align-items:flex-start;
  padding:10px 12px 14px 10px;border-radius:8px;border:2px solid #8a52d4;touch-action:none;cursor:pointer;
  background:linear-gradient(180deg,rgba(22,14,46,.97),rgba(8,5,20,.98));
  box-shadow:inset 0 0 0 2px #05040e,inset 0 0 0 3px rgba(222,204,248,.22),0 8px 24px rgba(0,0,0,.7);
  transition:opacity .25s,transform .25s;}
.mg-shooter .shooter-dlg.off{opacity:0;transform:translateY(12px);pointer-events:none;}
.mg-shooter .shooter-face{width:74px;height:74px;flex:none;border-radius:4px;overflow:hidden;position:relative;
  border:2px solid #deccf8;box-shadow:0 0 0 2px #05040e,0 0 10px rgba(138,82,212,.5);background:#1b1234;}
.mg-shooter .shooter-face img{width:100%;height:100%;object-fit:cover;display:block;}
.mg-shooter .shooter-face.cm{background:radial-gradient(circle at 50% 40%,#5a0f24,#1a0510 70%);}
.mg-shooter .shooter-face.cm i{position:absolute;left:10px;right:10px;top:16px;height:30px;border-radius:12px;background:#3a0a1c;border:2px solid #e83055;
  box-shadow:0 0 10px rgba(232,48,85,.6);font-style:normal;color:#ffd0d8;font-family:var(--dot);font-size:.9rem;text-align:center;line-height:27px;}
.mg-shooter .shooter-face.cm i:after{content:'';position:absolute;left:18px;bottom:-9px;border:5px solid transparent;border-top:6px solid #e83055;}
.mg-shooter .shooter-face.cm u{position:absolute;left:0;right:0;bottom:6px;text-align:center;text-decoration:none;color:#e83055;font-family:var(--mono);font-size:.55rem;letter-spacing:.1em;}
.mg-shooter .shooter-dlg-main{flex:1;min-width:0;}
.mg-shooter .shooter-name{font-family:var(--dot);font-size:.7rem;color:#00e8c8;margin-bottom:3px;letter-spacing:.06em;}
.mg-shooter .shooter-name.cm{color:#ff6b81;}
.mg-shooter .shooter-text{font-family:var(--dot);font-size:.84rem;line-height:1.55;color:#deccf8;min-height:4.1em;white-space:pre-wrap;}
.mg-shooter .shooter-next{position:absolute;right:12px;bottom:4px;color:#e8b830;font-size:.7rem;animation:shooter-blink .8s steps(2) infinite;}
@keyframes shooter-blink{50%{opacity:0;}}
.mg-shooter .shooter-skip{position:absolute;right:8px;top:62px;z-index:6;padding:5px 10px;border-radius:6px;border:1px solid rgba(187,174,221,.4);
  background:rgba(10,7,22,.8);color:#bbaedd;font-family:var(--mono);font-size:.62rem;cursor:pointer;touch-action:none;}
.mg-shooter .shooter-skip.off{display:none;}
`);

registerMinigame({
  id:'shooter', icon:'🔥', name:'炎上コメント撃退', genre:'シューティング', bgm:'stream',
  desc:'降ってくる悪意のコメントを撃ち落とす。応援コメントは撃たずに受け止めよう。最後に「炎上の渦」が来る。',
  effect:'炎上↓ 精神↑ フォロワー↑ ／ 疲労+6 約40分',
  help:'ドラッグ／矢印で移動・自動射撃・Bでモデ召喚',
  start(body,mg){
    // ── 記録（遅延初期化） ──
    if(!gs.shooterData||typeof gs.shooterData!=='object')gs.shooterData={};
    const SD=gs.shooterData;
    SD.plays=SD.plays||0;SD.clears=SD.clears||0;SD.bossKills=SD.bossKills||0;
    SD.best=SD.best||{score:0,grade:'',combo:0};
    const remix=SD.clears>=1;
    const phaseNo=(typeof getPhase==='function')?getPhase():1;

    // ── 定数 ──
    const T_BOSS=48, T_END=63, MAX_SHIELD=5, BOSS_HP=remix?70:60, HUD_H=56;
    const SPD=remix?1.12:1, IVM=remix?.88:1;
    const FONT='"DotGothic16", monospace';
    const C={pu:'#8a52d4',cy:'#00e8c8',rd:'#e83055',gd:'#e8b830',gn:'#44ee88',tx:'#bbaedd',txb:'#deccf8'};
    const WAVES=[
      {t:0, name:'WAVE 1',sub:'荒らし、接近',      iv:.9, w:{basic:.75,zig:.25}},
      {t:12,name:'WAVE 2',sub:'切り抜き勢、襲来',  iv:.74,w:{basic:.4,zig:.3,armor:.3}},
      {t:24,name:'WAVE 3',sub:'まとめサイト拡散',  iv:.66,w:{basic:.28,zig:.2,armor:.15,split:.22,shooter:.15}},
      {t:36,name:'WAVE 4',sub:'深夜の大炎上',      iv:.54,w:{basic:.2,zig:.24,armor:.2,split:.2,shooter:.16}},
    ];
    const TXT={
      basic:['つまらん','辞めろ','誰得','オワコン','低評価','荒らし','は？','ブーメラン','声きもい'],
      zig:['w','草','乙w','ｗｗｗ','煽り','晒し','雑魚'],
      armor:['#炎上中','謝罪しろ','特定した','垢消せ','説明責任'],
      split:['拡散希望','切り抜くわ','まとめた','魚拓とった'],
      small:['草','w','RT','拡散','？'],
      shooter:['ソース出せ','論破','長文失礼','通報した'],
      good:['がんばれ','好き','おつ','応援してる','ありがとう','声いいね','また来た','無理すんな','寝てね','救われた'],
    };
    // 日が進むと、言葉の種類も変わっていく
    if(phaseNo>=2){TXT.basic.push('借金配信者','父親失格');TXT.armor.push('職場どこ？');TXT.good.push('いつもの声','待ってた');}
    if(phaseNo>=3){TXT.basic.push('もう終わり','見苦しい');TXT.good.push('生きてて','味方だよ');}
    if(remix){TXT.shooter.push('前も燃えてた');TXT.split.push('再燃');}
    const EB_CH=['黙','消','叩','晒','嘘','炎'];
    const POW={
      spread:{ch:'拡',col:'#e8b830',label:'拡散ショット',dur:8},
      barrier:{ch:'護',col:'#00e8c8',label:'バリア',dur:12},
      slow:{ch:'緩',col:'#9b8cff',label:'スロー',dur:5},
      heal:{ch:'♥',col:'#ff7aa8',label:'心が回復',dur:0},
    };
    const SCORE={basic:100,zig:150,armor:250,split:150,small:50,shooter:220};
    const GRADE_RANK={S:4,A:3,B:2,C:1,'':0};
    const IMG={};
    ['normal','tired','happy','win','fear'].forEach(k=>{const im=new Image();im.src='assets/img/char_'+k+'.webp';IMG[k]=im;});

    // ── 効果音（Web Audioで合成。無ければ AU.se） ──
    let noiseBuf=null;
    function actx(){
      if(typeof AU==='undefined')return null;
      if(typeof AUDIO_SET!=='undefined'&&AUDIO_SET.se<=0)return null;
      try{if(!AU.ctx&&AU.init)AU.init();}catch(_){}
      const c=AU.ctx;if(!c)return null;
      if(c.state==='suspended'){try{c.resume();}catch(_){}}
      return c;
    }
    const vol=()=>typeof AUDIO_SET!=='undefined'?AUDIO_SET.se:1;
    function tone(f1,f2,dur,type,g,delay){
      const c=actx();if(!c)return false;
      try{const t0=c.currentTime+(delay||0),o=c.createOscillator(),gn=c.createGain();
        o.type=type;o.frequency.setValueAtTime(f1,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t0+dur);
        gn.gain.setValueAtTime(Math.max(.0005,g*vol()),t0);gn.gain.exponentialRampToValueAtTime(.0005,t0+dur);
        o.connect(gn);gn.connect(c.destination);o.start(t0);o.stop(t0+dur+.02);}catch(_){}
      return true;
    }
    function noise(dur,g,freq,delay){
      const c=actx();if(!c)return false;
      try{
        if(!noiseBuf){noiseBuf=c.createBuffer(1,c.sampleRate*.5,c.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
        const t0=c.currentTime+(delay||0),s=c.createBufferSource(),f=c.createBiquadFilter(),gn=c.createGain();
        s.buffer=noiseBuf;f.type='lowpass';f.frequency.value=freq;
        gn.gain.setValueAtTime(Math.max(.0005,g*vol()),t0);gn.gain.exponentialRampToValueAtTime(.0005,t0+dur);
        s.connect(f);f.connect(gn);gn.connect(c.destination);s.start(t0);s.stop(t0+dur+.02);}catch(_){}
      return true;
    }
    let shotN=0;
    const SFX={
      shot(){if((shotN++)%2)return;tone(1500,900,.035,'square',.012);},
      hit(){noise(.04,.05,3000);},
      clink(){if(!tone(1800,1400,.06,'square',.03))AU.se('tool');noise(.03,.04,6000);},
      kill(){if(!tone(700,180,.12,'square',.045))AU.se('comment');noise(.1,.06,1800);},
      catch(){if(!tone(660,660,.07,'triangle',.06))AU.se('ach');tone(880,880,.07,'triangle',.06,.06);tone(1320,1320,.12,'triangle',.06,.12);},
      hurt(){if(!tone(320,60,.3,'sawtooth',.08))AU.se('noise');noise(.25,.1,900);},
      ff(){if(!tone(500,250,.2,'triangle',.06))AU.se('back');},
      bomb(){if(!tone(200,1600,.5,'sawtooth',.06))AU.se('rank');noise(.7,.12,2400);tone(1046,1046,.3,'triangle',.05,.35);},
      warn(){if(!tone(440,440,.18,'square',.05))AU.se('warn');tone(330,330,.18,'square',.05,.22);tone(440,440,.18,'square',.05,.44);tone(330,330,.18,'square',.05,.66);},
      wave(){if(!tone(523,523,.08,'triangle',.05))AU.se('live');tone(784,784,.12,'triangle',.05,.08);},
      boom(){if(!noise(1,.16,700))AU.se('machine');tone(120,40,.8,'sine',.12);},
      stamp(){if(!noise(.15,.14,500))AU.se('decide');tone(90,50,.2,'sine',.15);tone(1568,1568,.25,'triangle',.05,.12);},
      blip(){if(!tone(1200,1200,.02,'square',.012))AU.se('comment');},
      decide(){if(!tone(880,1320,.08,'triangle',.05))AU.se('decide');},
      title(){if(!tone(392,392,.12,'triangle',.05))AU.se('decide');tone(523,523,.12,'triangle',.05,.12);tone(784,784,.3,'triangle',.06,.24);},
    };
    let seCd=0;
    const sfx=k=>{if(k==='kill'||k==='hit'||k==='clink'){if(seCd>0)return;seCd=.05;}try{SFX[k]();}catch(_){}};

    // ── DOM ──
    const cv=document.createElement('canvas');cv.className='shooter-cv';body.appendChild(cv);
    const cx=cv.getContext('2d');
    const bombBtn=document.createElement('button');
    bombBtn.className='shooter-bomb hide';
    bombBtn.innerHTML='<b>モデレーター召喚</b><small>[B] 1回だけ</small>';
    body.appendChild(bombBtn);
    const dlg=document.createElement('div');dlg.className='shooter-dlg off';
    dlg.innerHTML='<div class="shooter-face"></div><div class="shooter-dlg-main"><div class="shooter-name"></div><div class="shooter-text"></div></div><div class="shooter-next">▼</div>';
    body.appendChild(dlg);
    const dFace=dlg.querySelector('.shooter-face'),dName=dlg.querySelector('.shooter-name'),dText=dlg.querySelector('.shooter-text'),dNext=dlg.querySelector('.shooter-next');
    const skipBtn=document.createElement('button');skipBtn.className='shooter-skip off';skipBtn.textContent='SKIP ▶▶';body.appendChild(skipBtn);

    // ── 画面サイズ・事前描画 ──
    let W=0,H=0,dpr=1;
    let lySky=null,lyFar=null,lyNear=null,lyChat=null,lyVig=null,dith=null;
    const glow={};
    const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*dpr));c.height=Math.max(1,Math.ceil(h*dpr));const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return [c,g];};
    const rnd=(a,b)=>a+Math.random()*(b-a);
    const pick=a=>a[(Math.random()*a.length)|0];
    const lerp=(a,b,f)=>a+(b-a)*f;
    const easeOutBack=x=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);};
    const easeOut=x=>1-Math.pow(1-x,3);
    function makeGlow(col,r){
      const [c,g]=mkCanvas(r*2,r*2);
      const gr=g.createRadialGradient(r,r,0,r,r,r);
      gr.addColorStop(0,col);gr.addColorStop(.35,col.replace(/[\d.]+\)$/,m=>(parseFloat(m)*.45)+')'));gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return c;
    }
    const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
    function buildLayers(){
      let g;
      // 夜空：色帯＋ディザ（16bit機らしいグラデーション）
      [lySky,g]=mkCanvas(W,H);
      const stops=[[0,'#040310'],[.4,'#0c0722'],[.7,'#1c0c36'],[.86,'#2a1040'],[1,'#140824']];
      const bands=18,bh=Math.ceil(H/bands);
      const colAt=f=>{for(let i=1;i<stops.length;i++)if(f<=stops[i][0]){const a=stops[i-1],b=stops[i],k=(f-a[0])/(b[0]-a[0]);const A=hex(a[1]),B=hex(b[1]);return `rgb(${A.map((v,j)=>Math.round(lerp(v,B[j],k))).join(',')})`;}return stops[stops.length-1][1];};
      for(let i=0;i<bands;i++){g.fillStyle=colAt(i/(bands-1));g.fillRect(0,i*bh,W,bh+1);}
      for(let i=1;i<bands;i++){ // 境目のディザ
        g.fillStyle=colAt(i/(bands-1));const y0=i*bh-4;
        for(let y=0;y<4;y+=2)for(let x=(y/2)%2*2;x<W;x+=4)g.fillRect(x,y0+y,2,2);
      }
      // 月と雲
      const mx=W*.78,my=H*.17;
      let rg=g.createRadialGradient(mx,my,0,mx,my,W*.38);
      rg.addColorStop(0,'rgba(190,170,240,.22)');rg.addColorStop(.12,'rgba(150,120,220,.12)');rg.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=rg;g.fillRect(0,0,W,H);
      g.fillStyle='#d8ceff';g.beginPath();g.arc(mx,my,11,0,7);g.fill();
      g.fillStyle='#b4a8e6';g.beginPath();g.arc(mx+3,my+2,8,0,7);g.fill();
      g.fillStyle='#d8ceff';g.beginPath();g.arc(mx-1,my-1,7,0,7);g.fill();
      for(let i=0;i<7;i++){
        const y=H*rnd(.08,.42),x=rnd(-40,W);
        const cg=g.createRadialGradient(x,y,0,x,y,rnd(60,130));
        cg.addColorStop(0,'rgba(40,24,70,.55)');cg.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=cg;g.fillRect(x-140,y-60,280,120);
      }
      [['rgba(232,48,85,.16)',.15,.72],['rgba(0,232,200,.12)',.6,.68],['rgba(138,82,212,.2)',.85,.78],['rgba(232,184,48,.08)',.4,.82]].forEach(([c,x,y])=>{
        const ng=g.createRadialGradient(W*x,H*y,0,W*x,H*y,W*.35);
        ng.addColorStop(0,c);ng.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=ng;g.fillRect(0,0,W,H);
      });
      // 遠景ビル
      const fw=W+80;
      [lyFar,g]=mkCanvas(fw,H);
      let x=0;
      while(x<fw){
        const bw=rnd(18,42),bh2=H*rnd(.14,.36),top=H-bh2;
        g.fillStyle='#100b22';g.fillRect(x,top,bw,bh2);
        g.fillStyle='#17102e';g.fillRect(x,top,2,bh2);
        if(Math.random()<.3){g.fillStyle='#100b22';g.fillRect(x+bw*.4,top-rnd(8,20),2,20);g.fillStyle='#ff3355';g.fillRect(x+bw*.4,top-20,2,2);}
        for(let wy=top+5;wy<H-4;wy+=7)for(let wx=x+3;wx<x+bw-3;wx+=6){
          if(Math.random()<.16){g.fillStyle=Math.random()<.7?'rgba(232,200,120,.28)':'rgba(120,220,255,.22)';g.fillRect(wx,wy,2,3);}
        }
        x+=bw+rnd(0,4);
      }
      // 近景ビル＋ネオン看板＋濡れた路面
      const nw=W+160;
      [lyNear,g]=mkCanvas(nw,H);
      x=-10;
      const signs=['配信','24H','ローン','質','夜','整備','BAR','珈琲'];
      while(x<nw){
        const bw=rnd(36,74),bh2=H*rnd(.1,.26),top=H-bh2;
        const bg=g.createLinearGradient(x,0,x+bw,0);bg.addColorStop(0,'#0c0818');bg.addColorStop(.25,'#07050f');bg.addColorStop(1,'#040309');
        g.fillStyle=bg;g.fillRect(x,top,bw,bh2);
        g.fillStyle='rgba(138,82,212,.28)';g.fillRect(x,top,bw,1);
        g.fillStyle='rgba(0,0,0,.4)';g.fillRect(x,top+1,bw,2);
        for(let wy=top+8;wy<H-14;wy+=10)for(let wx=x+5;wx<x+bw-6;wx+=9){
          const r=Math.random();
          if(r<.2){g.fillStyle=r<.06?'rgba(255,214,140,.55)':r<.12?'rgba(140,240,255,.4)':'rgba(255,160,200,.35)';g.fillRect(wx,wy,4,5);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(wx,wy+4,4,1);}
          else if(r<.3){g.fillStyle='rgba(60,50,90,.35)';g.fillRect(wx,wy,4,5);}
        }
        if(Math.random()<.45){
          const s=pick(signs),vert=s.length<=2&&Math.random()<.6;
          const col=pick(['#ff4f8b','#00e8c8','#b77bff','#ffcc55']);
          g.save();g.shadowColor=col;g.shadowBlur=10;g.fillStyle=col;g.strokeStyle=col;g.lineWidth=1.2;
          g.font=`11px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
          const sx=x+bw/2,sy=top+rnd(14,Math.max(16,bh2*.45));
          if(vert){g.strokeRect(sx-8,sy-4,16,s.length*13+8);for(let i=0;i<s.length;i++)g.fillText(s[i],sx,sy+9+i*13);}
          else{const tw=g.measureText(s).width;g.strokeRect(sx-tw/2-5,sy-8,tw+10,16);g.fillText(s,sx,sy+1);}
          g.restore();
        }
        x+=bw+rnd(2,10);
      }
      const rgd=g.createLinearGradient(0,H-26,0,H);
      rgd.addColorStop(0,'rgba(5,4,14,0)');rgd.addColorStop(1,'rgba(40,20,70,.55)');
      g.fillStyle=rgd;g.fillRect(0,H-26,nw,26);
      for(let i=0;i<14;i++){g.fillStyle=pick(['rgba(255,79,139,.18)','rgba(0,232,200,.15)','rgba(232,184,48,.12)']);g.fillRect(rnd(0,nw),H-rnd(2,12),rnd(10,40),1);}
      // 背景を流れるコメント欄の残像
      const ch=Math.ceil(H*1.2);
      [lyChat,g]=mkCanvas(W,ch);
      g.font=`10px ${FONT}`;g.textBaseline='top';
      const pool=[].concat(TXT.basic,TXT.zig,TXT.armor,TXT.good,['今北','初見','888','おやすみ','わこつ','ｗ']);
      for(let col=0;col<4;col++){
        const lx=W*(col/4)+rnd(6,30);
        for(let y=rnd(0,30);y<ch-12;y+=rnd(18,34)){g.fillStyle=Math.random()<.25?'rgba(0,232,200,.07)':'rgba(187,174,221,.06)';g.fillText(pick(pool),lx,y);}
      }
      // 周辺減光
      [lyVig,g]=mkCanvas(W,H);
      const vg=g.createRadialGradient(W/2,H*.55,Math.min(W,H)*.35,W/2,H*.55,Math.max(W,H)*.75);
      vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(2,1,8,.72)');
      g.fillStyle=vg;g.fillRect(0,0,W,H);
    }
    function resize(){
      const w=Math.max(240,body.clientWidth),h=Math.max(320,body.clientHeight);
      const nd=Math.min(2.5,window.devicePixelRatio||1);
      if(w===W&&h===H&&nd===dpr)return;
      const first=!W;
      W=w;H=h;dpr=nd;
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      if(!glow.cy){
        glow.cy=makeGlow('rgba(0,232,200,.9)',40);glow.rd=makeGlow('rgba(232,48,85,.85)',40);
        glow.gd=makeGlow('rgba(232,184,48,.9)',40);glow.pk=makeGlow('rgba(255,122,168,.85)',40);
        glow.pu=makeGlow('rgba(155,140,255,.85)',40);glow.or=makeGlow('rgba(255,120,30,.9)',40);
        glow.wt=makeGlow('rgba(255,255,255,.9)',40);
        const [dc,dg]=[document.createElement('canvas'),null];dc.width=dc.height=4;const d2=dc.getContext('2d');
        d2.fillStyle='rgba(0,0,0,.22)';d2.fillRect(0,0,2,2);d2.fillRect(2,2,2,2);
        dith=cx.createPattern(dc,'repeat');
      }
      buildLayers();
      if(first){player.x=player.tx=W/2;player.y=player.ty=H-90;}
      player.tx=Math.max(16,Math.min(W-16,player.tx));player.ty=Math.max(H*.42,Math.min(H-50,player.ty));
      rain.forEach(d=>{d.x=Math.random()*W;d.y=Math.random()*H;});
    }

    // ── 状態 ──
    const player={x:0,y:0,tx:0,ty:0,vx:0,tilt:0,recoil:0};
    const rain=[];for(let i=0;i<80;i++)rain.push({x:0,y:0,l:rnd(6,16),s:rnd(380,620),n:i<30});
    let enemies=[],goods=[],pb=[],eb=[],corpses=[],amb=[];
    const parts=[];for(let i=0;i<380;i++)parts.push({x:0,y:0,vx:0,vy:0,life:0,max:1,sz:2,col:'#fff'});
    let pi=0;
    const pops=[];for(let i=0;i<24;i++)pops.push({x:0,y:0,t:0,text:'',col:'#fff',big:false});
    let popi=0;
    const rings=[];for(let i=0;i<16;i++)rings.push({x:0,y:0,t:0,max:1,r:40,col:'#fff'});
    let ri=0;
    let scene='title', sceneT=0;
    let t=0, clock=0, shield=MAX_SHIELD, score=0, kills=0, caught=0, friendlyFire=0;
    let combo=0, comboT=0, maxCombo=0, fireCd=0, spawnCd=.8, goodCd=2.2, waveIdx=-1;
    let inv=0, shake=0, hurtFlash=0, whiteFlash=0, slowT=0, spreadT=0, barrierT=0, stop=0;
    let bombUsed=false, bombT=0, bombBuf=0, banner=null, dying=0, boss=null, bossBeaten=false, winT=0;
    let finalReason=null, grade=null, newRecord=false, trans=null, endCalled=false;
    let lastScoreHtml='', lastTimer='', glowPulse=0, glowCol='cy', forcePow=null, firstGood=true, touchedOnce=false;

    resize();
    const onResize=()=>{if(!mg._ended)resize();};
    window.addEventListener('resize',onResize);

    // ── 場面転換：ベイヤー配列のディザでワイプ ──
    const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
    function transition(mid,dur){if(trans)return;trans={t:0,dur:dur||.7,mid,done:false};}
    function drawTrans(){
      if(!trans)return;
      const f=trans.t/trans.dur;
      const amt=f<.5?f*2:(1-f)*2;
      if(amt<=0)return;
      const cs=8,cols=Math.ceil(W/cs),rows=Math.ceil(H/cs);
      cx.fillStyle='#05040e';cx.beginPath();
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const th=(BAYER[(y&3)*4+(x&3)]+.5)/16;
        const k=amt*1.25-((y/rows)*.25);
        if(th<k)cx.rect(x*cs,y*cs,cs,cs);
      }
      cx.fill();
    }

    // ── 会話 ──
    const SPK={
      dan:{name:'だんのうら'},
      cm:{name:'コメント欄',cm:true},
    };
    let lines=[],li=0,typed=0,lineDone=false,onDlgEnd=null;
    function setFace(sp,face){
      if(sp==='cm'){dFace.className='shooter-face cm';dFace.innerHTML='<i>!?</i><u>CHAT</u>';dName.className='shooter-name cm';}
      else{dFace.className='shooter-face';dFace.innerHTML='';const im=document.createElement('img');im.src='assets/img/char_'+(face||'normal')+'.webp';im.alt='';dFace.appendChild(im);dName.className='shooter-name';}
      dName.textContent=SPK[sp].name;
    }
    function startDialog(ls,done){
      lines=ls;li=0;onDlgEnd=done;dlg.classList.remove('off');skipBtn.classList.remove('off');showLine();
    }
    function showLine(){
      const L=lines[li];setFace(L[0],L[1]);typed=0;lineDone=false;dText.textContent='';dNext.style.visibility='hidden';
    }
    function advance(){
      if(trans)return;
      if(!lineDone){typed=1e9;return;}
      sfx('decide');
      li++;
      if(li>=lines.length){dlg.classList.add('off');skipBtn.classList.add('off');const f=onDlgEnd;onDlgEnd=null;if(f)f();return;}
      showLine();
    }
    function skipDialog(){if(!onDlgEnd||trans)return;sfx('decide');dlg.classList.add('off');skipBtn.classList.add('off');const f=onDlgEnd;onDlgEnd=null;f();}
    function updateDialog(dt){
      if(!onDlgEnd||lineDone)return;
      const txt=lines[li][2];
      const before=Math.floor(typed);
      typed+=dt*34;
      const n=Math.min(txt.length,Math.floor(typed));
      if(n!==before&&n%2===0&&n<txt.length)sfx('blip');
      dText.textContent=txt.slice(0,n);
      if(n>=txt.length){lineDone=true;dNext.style.visibility='visible';}
    }
    function introLines(){
      const L=[];
      const hot=gs.flame>=50;
      L.push(['cm',null,hot?'「#炎上中 トレンド入りおめｗ」\n「切り抜き見た」「説明しろ」':'「切り抜き見た」「#炎上中」\n「説明しろ」「謝罪まだ？」']);
      if(SD.clears>0)L.push(['dan','normal','……また荒れとる。\nでも前の夜も、ちゃんと越えられたやろ。']);
      else L.push(['dan','normal','子どもは、やっと寝た。\n工場の夜勤まで、あと二時間。']);
      if(phaseNo>=3)L.push(['dan','tired','正直、もう心がすり減っとる。\nそれでも――待ってくれてる人がおる。']);
      else L.push(['dan','tired','切り抜きで、言葉が一人歩きしとる。\n……でも、黙って待ってくれてる人もおる。']);
      L.push(['dan',remix?'win':'normal',remix?'今夜は前より荒れとる。気ぃ引き締めていくで。\n――マイク、入れる。':'借金も、配信も、逃げたら終わりや。\n――マイク、入れるで。']);
      return L;
    }
    function endingLines(){
      if(finalReason==='down')return [
        ['dan','tired','……ごめん。今夜はここで配信切るわ。'],
        ['dan','tired','画面を閉じたら、隣の部屋から\n子どもの寝息だけが聞こえた。'],
        ['dan','normal','明日も工場や。……この音を守るために、\nまた立てばええ。'],
      ];
      if(bossBeaten)return [
        ['dan','win','……渦が、消えた。\nコメント欄に「おつ」が並んどる。'],
        ['cm',null,'「今日も声聞けてよかった」\n「おやすみ、だんのうらさん」'],
        ['dan','happy','始業まであと三時間。\n子どもの弁当、卵焼き入れたろ。'],
      ];
      return [
        ['dan','happy','全部は消せんかった。\nけど、朝まで声は折れんかった。'],
        ['dan','normal','借金の明細は減らん。\nでも、味方の数はちゃんと増えとる。'],
        ['dan','happy','……寝顔、見てから寝よ。'],
      ];
    }

    // ── 入力 ──
    let drag=null;
    const keys={l:false,r:false,u:false,d:false};
    function tapAnywhere(){
      if(scene==='title'){goStory();return true;}
      if(scene==='story'||scene==='ending'){advance();return true;}
      if(scene==='howto'){if(sceneT>.5)beginPlay();return true;}
      if(scene==='grade'){if(sceneT>1.4)goEnding();return true;}
      return false;
    }
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();
      try{AU.init&&AU.init();}catch(_){}
      if(tapAnywhere())return;
      try{cv.setPointerCapture(e.pointerId);}catch(_){}
      touchedOnce=true;
      drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,px:player.tx,py:player.ty};
    });
    cv.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      player.tx=drag.px+(e.clientX-drag.sx)*1.3;
      player.ty=drag.py+(e.clientY-drag.sy)*1.3;
    });
    const endDrag=e=>{if(drag&&drag.id===e.pointerId)drag=null;};
    cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
    dlg.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();advance();});
    skipBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();skipDialog();});
    bombBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();bombBuf=.35;});
    mg.onKey(e=>{
      const k=e.key, dn=e.type==='keydown';
      const map={ArrowLeft:'l',a:'l',A:'l',ArrowRight:'r',d:'r',D:'r',ArrowUp:'u',w:'u',W:'u',ArrowDown:'d',s:'d',S:'d'};
      if(map[k]){e.preventDefault();keys[map[k]]=dn;if(dn)touchedOnce=true;return;}
      if(!dn||e.repeat)return;
      if(k==='Enter'||k===' '||k==='z'||k==='Z'){
        if(scene!=='play'){e.preventDefault();tapAnywhere();return;}
      }
      if(k==='Escape'&&scene==='story'){skipDialog();return;}
      if(scene==='play'&&(k==='b'||k==='B'||k==='x'||k==='X'||k===' ')){e.preventDefault();bombBuf=.35;}
    });

    // ── 場面の流れ ──
    function goStory(){if(scene!=='title'||trans)return;sfx('decide');transition(()=>{scene='story';sceneT=0;startDialog(introLines(),goHowto);});}
    function goHowto(){transition(()=>{scene='howto';sceneT=0;});}
    function beginPlay(){
      if(scene!=='howto'||trans)return;sfx('decide');
      transition(()=>{scene='play';sceneT=0;t=0;bombBtn.classList.remove('hide');bombBtn.classList.add('ready');
        if(remix)showBanner('REMIX','第二夜：前より荒れている','#ff9a3c',1.6);},.5);
    }
    function computeGrade(){
      if(finalReason==='down')return 'C';
      if(bossBeaten)return (shield>=3&&friendlyFire<=1&&maxCombo>=20)?'S':'A';
      return shield>=4?'A':'B';
    }
    function finishPlay(reason){
      if(finalReason)return;
      finalReason=reason;grade=computeGrade();
      bombBtn.classList.add('hide');
      if(reason==='clear')SD.clears++;
      if(bossBeaten)SD.bossKills++;
      if(score>SD.best.score){SD.best.score=score;newRecord=true;}
      if(GRADE_RANK[grade]>GRADE_RANK[SD.best.grade||''])SD.best.grade=grade;
      if(maxCombo>SD.best.combo)SD.best.combo=maxCombo;
      transition(()=>{scene='grade';sceneT=0;stampDone=false;enemies.length=0;goods.length=0;eb.length=0;pb.length=0;corpses.length=0;},.8);
    }
    let stampDone=false;
    function goEnding(){if(trans||scene!=='grade')return;sfx('decide');transition(()=>{scene='ending';sceneT=0;startDialog(endingLines(),()=>{transition(()=>{scene='done';if(!endCalled){endCalled=true;mg.end(finalReason);}},.6);});});}

    // ── 演出ヘルパ ──
    function burst(x,y,n,cols,spd,life,sz){
      for(let i=0;i<n;i++){
        const p=parts[pi];pi=(pi+1)%parts.length;
        const a=Math.random()*6.283,v=spd*(.3+Math.random()*.7);
        p.x=x;p.y=y;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.max=p.life=life*(.6+Math.random()*.4);
        p.sz=sz*(.6+Math.random()*.8);p.col=cols[(Math.random()*cols.length)|0];
      }
    }
    function ring(x,y,r,col,max){const o=rings[ri];ri=(ri+1)%rings.length;o.x=x;o.y=y;o.r=r;o.col=col;o.t=o.max=max||.45;}
    function pop(x,y,text,col,big){const o=pops[popi];popi=(popi+1)%pops.length;o.x=Math.max(50,Math.min(W-50,x));o.y=Math.max(HUD_H+14,y);o.text=text;o.col=col;o.t=big?1.3:.9;o.big=!!big;}
    function showBanner(main,sub,col,dur){banner={main,sub,col,t:0,dur:dur||1.9};}
    const mult=()=>1+Math.min(3,Math.floor(combo/5)*.5);

    // ── 生成 ──
    function measure(text,px){cx.font=`${px}px ${FONT}`;return cx.measureText(text).width;}
    function makeEnemy(type,x,y){
      const e={type,good:false,dead:false,flash:0,hitT:0,age:0,face:(Math.random()*3)|0,small:type==='small',fireCd:rnd(.8,1.4),vx:0,vy:0,hp:1,maxHp:1,text:'',tw:0,w:0,h:0,x:0,y:0,bx:0,amp:0,ph:Math.random()*6,stay:0,blink:rnd(1,3)};
      e.text=pick(TXT[type]);
      e.tw=measure(e.text,e.small?11:13);
      e.w=e.small?e.tw+18:e.tw+40;e.h=e.small?20:(type==='armor'?30:26);
      e.x=x!==undefined?x:rnd(e.w/2+6,W-e.w/2-6);e.y=y!==undefined?y:HUD_H-e.h;
      const wv=Math.max(0,waveIdx);
      if(type==='basic'){e.vy=(rnd(66,92)+wv*9)*SPD;}
      else if(type==='zig'){e.vy=(rnd(120,155)+wv*8)*SPD;e.amp=rnd(30,Math.min(70,W*.14));e.bx=Math.max(e.amp+e.w/2,Math.min(W-e.amp-e.w/2,e.x));}
      else if(type==='armor'){e.vy=rnd(42,54)*SPD;e.hp=e.maxHp=wv>=3||remix?4:3;}
      else if(type==='split'){e.vy=rnd(56,70)*SPD;e.hp=e.maxHp=2;}
      else if(type==='shooter'){e.vy=110;e.hp=e.maxHp=3;e.stay=HUD_H+H*rnd(.05,.2);e.bx=e.x;}
      else if(type==='small'){e.vy=rnd(85,110)*SPD;}
      return e;
    }
    const spawnEnemy=(type,x,y)=>{const e=makeEnemy(type,x,y);enemies.push(e);return e;};
    function spawnGood(){
      let kind;
      const r=Math.random();
      if(forcePow){kind=forcePow;forcePow=null;}
      else if(shield<=2&&r<.5)kind='heal';
      else kind=r<.32?'spread':r<.56?'barrier':r<.76?'slow':'heal';
      const text=pick(TXT.good);
      const tw=measure(text,13),w=tw+42;
      const g={good:true,dead:false,hp:3,flash:0,warned:false,pow:kind,text,tw,w,h:28,x:rnd(w/2+8,W-w/2-8),y:HUD_H-14,vy:rnd(52,64),age:0,hint:firstGood};
      if(firstGood){g.x=Math.max(w/2+8,Math.min(W-w/2-8,player.x+(player.x<W/2?90:-90)));firstGood=false;}
      goods.push(g);
    }
    function chooseType(){
      if(waveIdx<0)return 'basic';
      const w=WAVES[waveIdx].w;
      let r=Math.random(),acc=0;
      for(const k in w){acc+=w[k];if(r<acc){
        if(k==='shooter'){let n=0;for(const e of enemies)if(e.type==='shooter')n++;if(n>=(remix?3:2))return 'basic';}
        return k;}}
      return 'basic';
    }
    function startBoss(){
      const R=Math.max(46,Math.min(78,W*.17));
      boss={x:W/2,y:HUD_H-R*1.6,R,hp:BOSS_HP,max:BOSS_HP,t:0,pat:0,patT:-.9,fire:0,ang:0,flash:0,dead:false,dieT:0};
      forcePow='spread';goodCd=2.2;
      showBanner('WARNING','炎上の渦が近づいてくる','#e83055',2.4);
      sfx('warn');shake=Math.max(shake,6);
    }

    // ── ダメージ・取得 ──
    function loseShield(x,y,msg,kind){
      shield--;inv=1.3;shake=Math.max(shake,9);hurtFlash=.5;combo=0;stop=Math.max(stop,.09);player.hitT=.4;
      burst(x,y,18,['#e83055','#ff9aa8','#ffd0d8'],220,.6,3);
      pop(x,y-20,msg,'#ff7a90');
      sfx(kind||'hurt');
      if(shield<=0){dying=1.6;stop=.25;burst(player.x,player.y,40,['#e83055','#ffd0d8','#8a52d4'],300,1,4);ring(player.x,player.y,80,C.rd,.9);sfx('boom');}
    }
    function hurt(x,y,msg){
      if(inv>0||dying>0||winT>0||finalReason)return;
      if(barrierT>0){
        barrierT=0;inv=.8;stop=Math.max(stop,.05);ring(player.x,player.y,46,C.cy,.5);burst(player.x,player.y,16,['#00e8c8','#bff8ee'],180,.5,3);
        pop(player.x,player.y-34,'バリアが守った','#00e8c8');sfx('clink');return;
      }
      loseShield(x,y,msg||'刺さった…');
    }
    function killEnemy(e){
      e.dead=true;kills++;combo++;comboT=2.6;maxCombo=Math.max(maxCombo,combo);
      const m=mult(),quick=!e.small&&e.y<HUD_H+(H-HUD_H)*.3,pts=Math.round(SCORE[e.type]*m*(quick?1.5:1));
      score+=pts;
      const cols=e.type==='zig'?['#d04ce8','#f3c8ff','#fff']:e.type==='split'?['#ff8a2a','#ffd08a','#fff']:e.type==='armor'?['#9aa0b8','#e8b830','#fff']:['#e83055','#ffb0be','#e8b830'];
      burst(e.x,e.y,e.small?8:16,cols,e.small?140:200,.55,e.small?2:3);
      ring(e.x,e.y,e.small?22:34,cols[0],.35);
      pop(e.x,e.y-6,(quick?'速攻 ':'')+'+'+pts+(m>1?' ×'+m.toFixed(1):''),quick?'#7fffe8':m>=2?'#e8b830':'#ffe8b0');
      e.dieT=0;corpses.push(e);
      if(e.type==='armor'||e.type==='shooter'){stop=Math.max(stop,.045);shake=Math.max(shake,3);}
      if(e.type==='split'){spawnEnemy('small',e.x-10,e.y).vx=-75;spawnEnemy('small',e.x+10,e.y).vx=75;}
      sfx('kill');
    }
    function catchGood(g){
      g.dead=true;caught++;
      const p=POW[g.pow];
      if(shield<MAX_SHIELD)shield++;
      if(g.pow==='spread')spreadT=p.dur;
      else if(g.pow==='barrier')barrierT=p.dur;
      else if(g.pow==='slow')slowT=p.dur;
      score+=150;
      glowCol=g.pow==='spread'?'gd':g.pow==='slow'?'pu':g.pow==='heal'?'pk':'cy';glowPulse=.45;
      burst(g.x,g.y,18,[p.col,'#ffffff','#bff8ee'],160,.7,3);ring(player.x,player.y,50,p.col,.5);
      pop(player.x,player.y-46,p.label+'！',p.col,true);
      g.dieT=0;g.absorb=true;corpses.push(g);
      sfx('catch');
    }
    function bomb(){
      bombUsed=true;bombT=1.4;whiteFlash=.6;shake=Math.max(shake,12);stop=.14;
      bombBtn.classList.add('used');bombBtn.classList.remove('ready');
      for(const e of enemies)if(!e.dead)killEnemy(e);
      for(const b of eb){if(!b.dead){b.dead=true;burst(b.x,b.y,4,['#00e8c8','#fff'],90,.4,2);}}
      if(boss&&!boss.dead&&boss.t>1){boss.hp-=26;boss.flash=.3;score+=500;}
      ring(player.x,player.y,Math.max(W,H),C.cy,1.1);
      showBanner('モデレーター召喚','不適切なコメントを非表示にしました','#00e8c8',2);
      sfx('bomb');
    }

    // 待機画面用に漂うコメント
    for(let i=0;i<6;i++){const e=makeEnemy(pick(['basic','zig','armor','split']),undefined,rnd(HUD_H,H*.6));e.vy=rnd(14,26);amb.push(e);}
    sfx('title');

    // ── 更新 ──
    function compact(a){let j=0;for(let i=0;i<a.length;i++)if(!a[i].dead)a[j++]=a[i];a.length=j;}
    let resizeChk=0;
    mg.loop(dt=>{
      // 最初のフレームで dt が負になることがある（rAFの時刻が開始時刻より前）
      if(!(dt>0))dt=0;
      clock+=dt;seCd-=dt;sceneT+=dt;
      resizeChk-=dt;if(resizeChk<=0){resizeChk=.5;resize();}
      if(trans){trans.t+=dt;if(!trans.done&&trans.t>=trans.dur/2){trans.done=true;trans.mid&&trans.mid();}if(trans&&trans.t>=trans.dur)trans=null;}
      for(const d of rain){d.y+=d.s*dt*(d.n?.7:1);d.x+=d.s*dt*.12;if(d.y>H){d.y=-d.l;d.x=Math.random()*W*1.1-W*.1;}}
      if(shake>0)shake=Math.max(0,shake-dt*30);
      if(whiteFlash>0)whiteFlash-=dt;
      if(scene==='title'&&sceneT>2.6&&!trans)goStory();
      if(scene==='story'||scene==='ending')updateDialog(dt);
      if(scene==='howto'&&sceneT>5&&!trans)beginPlay();
      if(scene==='grade'&&!stampDone&&sceneT>.9){stampDone=true;sfx('stamp');shake=10;}
      if(scene!=='play'){
        for(const e of amb){e.age+=dt;e.y+=e.vy*dt;if(e.y>H+30){e.y=HUD_H-20;e.x=rnd(e.w/2+6,W-e.w/2-6);}}
        stepFx(dt);
        player.x+=(W/2-player.x)*Math.min(1,dt*4);player.y+=(H-90-player.y)*Math.min(1,dt*4);
        emitThruster(dt);
        draw();hud();
        return;
      }
      playStep(dt);
      draw();hud();
    });
    function emitThruster(){
      const p=parts[pi];pi=(pi+1)%parts.length;
      p.x=player.x+rnd(-3,3);p.y=player.y+32;p.vx=rnd(-20,20)-player.vx*.1;p.vy=rnd(90,150);p.max=p.life=rnd(.25,.4);p.sz=rnd(2,3.5);p.col=Math.random()<.5?'#00e8c8':'#8a52d4';
    }
    function stepFx(dt){
      for(const p of parts){if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;}}
      for(const o of pops)if(o.t>0){o.t-=dt;o.y-=(o.big?26:38)*dt;}
      for(const o of rings)if(o.t>0)o.t-=dt;
      for(const c of corpses)c.dieT+=dt;
      let j=0;for(const c of corpses)if(c.dieT<.4)corpses[j++]=c;corpses.length=j;
      if(banner){banner.t+=dt;if(banner.t>banner.dur)banner=null;}
      if(hurtFlash>0)hurtFlash-=dt;if(glowPulse>0)glowPulse-=dt;if(bombT>0)bombT-=dt;
    }
    function playStep(dt){
      if(bombBuf>0)bombBuf-=dt;
      // ヒットストップ中は時間を止める（演出だけ進める）
      if(stop>0){stop-=dt;stepFx(dt*.25);return;}
      const ts=slowT>0?.42:1, edt=dt*ts;
      const live=dying<=0&&winT<=0&&!finalReason;
      if(live)t+=dt;
      if(live&&bombBuf>0&&!bombUsed){bombBuf=0;bomb();}

      for(let i=WAVES.length-1;i>=0;i--){
        if(t>=WAVES[i].t&&t<T_BOSS&&waveIdx<i){waveIdx=i;if(i>0||!remix)showBanner(WAVES[i].name,WAVES[i].sub,'#deccf8');sfx('wave');break;}
      }
      if(t>=T_BOSS&&!boss)startBoss();

      // プレイヤー移動
      if(dying<=0){
        const ks=340*dt;
        if(keys.l)player.tx-=ks;if(keys.r)player.tx+=ks;if(keys.u)player.ty-=ks;if(keys.d)player.ty+=ks;
        player.tx=Math.max(16,Math.min(W-16,player.tx));player.ty=Math.max(H*.42,Math.min(H-50,player.ty));
        const ox=player.x,k=Math.min(1,dt*18);
        player.x+=(player.tx-player.x)*k;player.y+=(player.ty-player.y)*k;
        player.vx=(player.x-ox)/Math.max(dt,.001);
      }else{player.y+=60*dt;player.vx=0;}
      player.tilt+=(Math.max(-.35,Math.min(.35,player.vx*.0016))-player.tilt)*Math.min(1,dt*10);
      if(player.recoil>0)player.recoil-=dt;if(player.hitT>0)player.hitT-=dt;

      if(inv>0)inv-=dt;if(slowT>0)slowT-=dt;if(spreadT>0)spreadT-=dt;if(barrierT>0)barrierT-=dt;
      if(comboT>0){comboT-=dt;if(comboT<=0)combo=0;}
      stepFx(dt);
      if(dying<=0)emitThruster();

      if(live){
        fireCd-=dt;
        if(fireCd<=0){
          fireCd=.12;player.recoil=.05;
          const sx=player.x,sy=player.y-24;
          pb.push({x:sx,y:sy,vx:0,vy:-560,dead:false,gold:false});
          if(spreadT>0){pb.push({x:sx-6,y:sy+4,vx:-150,vy:-540,dead:false,gold:true});pb.push({x:sx+6,y:sy+4,vx:150,vy:-540,dead:false,gold:true});}
          sfx('shot');
        }
        if(t<T_BOSS){
          spawnCd-=dt;
          if(spawnCd<=0){spawnEnemy(chooseType());spawnCd=WAVES[Math.max(0,waveIdx)].iv*IVM*rnd(.7,1.3);}
          goodCd-=dt;
          if(goodCd<=0){spawnGood();goodCd=rnd(3.2,5);}
        }else if(boss&&!boss.dead){
          spawnCd-=dt;
          if(spawnCd<=0){spawnEnemy(Math.random()<.5?'zig':'basic');spawnCd=rnd(1.8,2.6)*IVM;}
          goodCd-=dt;
          if(goodCd<=0){spawnGood();goodCd=rnd(2.6,3.6);}
        }
      }

      for(const b of pb){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<HUD_H-10||b.x<-20||b.x>W+20)b.dead=true;}

      // 敵
      const hx=player.x,hy=player.y-6;
      for(const e of enemies){
        if(e.dead)continue;
        e.age+=edt;if(e.flash>0)e.flash-=dt;if(e.hitT>0)e.hitT-=dt;
        if(e.type==='zig'){e.y+=e.vy*edt;e.x=e.bx+Math.sin(e.age*4.2+e.ph)*e.amp;}
        else if(e.type==='shooter'){
          if(e.age<7){e.y+=(e.stay-e.y)*Math.min(1,edt*2.2);e.x=e.bx+Math.sin(e.age*.9+e.ph)*Math.min(60,W*.15);
            e.fireCd-=edt;
            if(e.fireCd<=0&&live){e.fireCd=rnd(1.4,1.9)/(remix?1.15:1);
              const a=Math.atan2(hy-e.y,hx-e.x);
              eb.push({x:e.x,y:e.y+e.h/2,vx:Math.cos(a)*120,vy:Math.sin(a)*120,ch:pick(EB_CH),dead:false,boss:false});
              ring(e.x,e.y+e.h/2,16,C.rd,.25);
            }
          }else{e.y-=150*edt;if(e.y<HUD_H-40)e.dead=true;}
        }else{e.y+=e.vy*edt;e.x+=e.vx*edt;if(e.x<e.w/2||e.x>W-e.w/2){e.vx*=-1;e.x=Math.max(e.w/2,Math.min(W-e.w/2,e.x));}}
        const hw=e.w/2,hh=e.h/2;
        for(const b of pb){
          if(b.dead)continue;
          if(b.x>e.x-hw-3&&b.x<e.x+hw+3&&b.y>e.y-hh-2&&b.y<e.y+hh+8){
            b.dead=true;e.hp--;e.flash=.07;e.hitT=.16;
            burst(b.x,b.y,3,['#fff','#00e8c8'],90,.25,2);
            if(e.hp<=0){killEnemy(e);break;}
            else{score+=10;sfx(e.type==='armor'?'clink':'hit');}
          }
        }
        if(e.dead)continue;
        // 当たり判定は見た目より小さめ（やさしめ）
        if(Math.abs(e.x-hx)<hw*.8+5&&Math.abs(e.y-hy)<hh*.7+9){e.dead=true;burst(e.x,e.y,12,['#e83055','#ffd0d8'],160,.5,3);hurt(hx,hy,'「'+e.text+'」');continue;}
        if(e.y-hh>H){e.dead=true;combo=0;if(!e.small)hurt(e.x,H-30,'「'+e.text+'」が刺さった');}
      }
      compact(enemies);

      // 応援コメント
      for(const g of goods){
        if(g.dead)continue;
        g.age+=dt;g.y+=g.vy*dt;if(g.flash>0)g.flash-=dt;
        const gx=g.x+Math.sin(g.age*2)*6;
        for(const b of pb){
          if(b.dead)continue;
          if(Math.abs(b.x-gx)<g.w/2&&Math.abs(b.y-g.y)<g.h/2+4){
            b.dead=true;g.hp--;g.flash=.12;
            if(g.hp>0){if(!g.warned){g.warned=true;pop(gx,g.y-18,'撃たないで！','#ff9ec0');sfx('hit');}break;}
            g.dead=true;friendlyFire++;
            burst(gx,g.y,14,['#ff7aa8','#bff8ee','#fff'],150,.6,3);
            g.x=gx;g.dieT=0;g.absorb=false;corpses.push(g);
            if(live&&inv<=0)loseShield(gx,g.y+10,'誤射… 応援を消した','ff');
            else pop(gx,g.y-14,'誤射…','#ff7aa8');
            break;
          }
        }
        if(g.dead)continue;
        // 受け止め判定は広め
        if(Math.abs(gx-player.x)<g.w/2+16&&Math.abs(g.y-player.y)<g.h/2+28&&dying<=0){g.x=gx;catchGood(g);continue;}
        if(g.y>H+30)g.dead=true;
      }
      compact(goods);

      for(const b of eb){
        if(b.dead)continue;
        b.x+=b.vx*edt;b.y+=b.vy*edt;
        if(b.y>H+20||b.y<HUD_H-40||b.x<-20||b.x>W+20){b.dead=true;continue;}
        const dx=b.x-hx,dy=b.y-hy;
        if(dx*dx+dy*dy<(barrierT>0?26*26:13*13)){b.dead=true;hurt(b.x,b.y,'「'+b.ch+'」');}
      }
      compact(eb);

      if(boss)bossStep(dt,edt,hx,hy,live);
      compact(pb);

      if(dying>0){dying-=dt;if(dying<=0)finishPlay('down');}
      if(winT>0){winT-=dt;if(winT<=0)finishPlay('clear');}
      if(t>=T_END&&live)finishPlay('clear');
    }
    function bossStep(dt,edt,hx,hy,live){
      const bs=boss;
      bs.t+=edt;if(bs.flash>0)bs.flash-=dt;
      if(!bs.dead){
        const ty=Math.max(bs.R+HUD_H+30,H*.24);
        bs.y+=(ty-bs.y)*Math.min(1,dt*1.2);
        bs.x=W/2+Math.sin(bs.t*.55)*(W/2-bs.R-14);
        bs.ang+=edt*(bs.hp<bs.max*.4?3.4:2.2);
        if(bs.t>2&&live){
          bs.patT+=edt;if(bs.patT>3.4){bs.patT=-.9;bs.pat=(bs.pat+1)%(remix?4:3);}
          bs.fire-=edt;if(bs.patT<0)bs.fire=Math.max(bs.fire,.05);
          const enr=bs.hp<bs.max*.4?1.25:1;
          if(bs.fire<=0){
            if(bs.pat===0){
              bs.fire=.19/enr;const a=bs.t*2.4;
              for(let s=0;s<2;s++){const aa=a+s*Math.PI;eb.push({x:bs.x+Math.cos(aa)*bs.R*.6,y:bs.y+Math.sin(aa)*bs.R*.6,vx:Math.cos(aa)*105,vy:Math.sin(aa)*105+25,ch:'炎',dead:false,boss:true});}
            }else if(bs.pat===1){
              bs.fire=.85/enr;const a=Math.atan2(hy-bs.y,hx-bs.x);
              for(let s=-2;s<=2;s++){const aa=a+s*.2;eb.push({x:bs.x,y:bs.y+bs.R*.5,vx:Math.cos(aa)*150,vy:Math.sin(aa)*150,ch:pick(EB_CH),dead:false,boss:true});}
              ring(bs.x,bs.y+bs.R*.5,26,'#ff7a1e',.3);
            }else if(bs.pat===2){
              bs.fire=1.3/enr;const n=14,gap=(Math.random()*n)|0,off=Math.random();
              for(let s=0;s<n;s++){if(s===gap||s===(gap+1)%n)continue;const aa=(s+off)/n*6.283;eb.push({x:bs.x,y:bs.y,vx:Math.cos(aa)*100,vy:Math.sin(aa)*100,ch:'炎',dead:false,boss:true});}
            }else{ // REMIX：降り注ぐ言葉
              bs.fire=.28/enr;const x=rnd(20,W-20);eb.push({x,y:HUD_H,vx:0,vy:130,ch:pick(EB_CH),dead:false,boss:true});
            }
          }
        }
        for(const b of pb){
          if(b.dead)continue;
          const dx=b.x-bs.x,dy=b.y-bs.y;
          if(dx*dx+dy*dy<bs.R*bs.R){b.dead=true;if(bs.t>1.2){bs.hp--;bs.flash=.06;score+=10;burst(b.x,b.y,3,['#ffcc55','#fff'],120,.3,2);sfx('hit');}}
        }
        {const dx=hx-bs.x,dy=hy-bs.y;if(dx*dx+dy*dy<(bs.R*.75)*(bs.R*.75))hurt(hx,hy,'渦に呑まれた');}
        if(bs.hp<=0){
          bs.dead=true;bs.hp=0;bossBeaten=true;winT=2.6;score+=3000;stop=.35;
          for(const b of eb)b.dead=true;
          for(const e of enemies)if(!e.dead){e.dead=true;e.dieT=0;corpses.push(e);burst(e.x,e.y,10,['#ffcc55','#fff'],150,.5,3);}
          showBanner('鎮火','炎上の渦が消えていく','#e8b830',2.4);
          whiteFlash=.6;shake=16;sfx('boom');
        }
      }else{
        bs.dieT+=dt;
        if(Math.random()<dt*14)burst(bs.x+rnd(-bs.R,bs.R),bs.y+rnd(-bs.R,bs.R),14,['#ff7a1e','#ffcc55','#fff','#e83055'],220,.7,4);
        if(Math.random()<dt*5){ring(bs.x+rnd(-bs.R,bs.R)*.6,bs.y+rnd(-bs.R,bs.R)*.6,50,'#ffcc55',.5);sfx('kill');}
      }
    }

    // ── 描画 ──
    function rr(x,y,w,h,r){
      cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();
    }
    function gl(c,x,y,r,a){cx.globalAlpha=a;cx.drawImage(c,x-r,y-r,r*2,r*2);}

    function drawBg(){
      cx.drawImage(lySky,0,0,W,H);
      const ch=lyChat.height/dpr,off=(clock*14)%ch;
      cx.globalAlpha=.45;cx.drawImage(lyChat,0,-off,W,ch);cx.drawImage(lyChat,0,ch-off,W,ch);cx.globalAlpha=1;
      const pxo=(player.x-W/2)/W;
      cx.drawImage(lyFar,-40-pxo*16+Math.sin(clock*.05)*6,0,W+80,H);
      cx.drawImage(lyNear,-80-pxo*40,0,W+160,H);
      if(boss){
        const a=boss.dead?Math.max(0,.35-boss.dieT*.15):Math.min(.35,boss.t*.12);
        if(a>0){cx.globalAlpha=a*(.85+Math.sin(clock*3)*.15);cx.drawImage(glow.or,-W*.3,-H*.25,W*1.6,H*1.0);cx.globalAlpha=1;}
      }
      cx.lineWidth=1;
      cx.strokeStyle='rgba(150,130,220,.16)';cx.beginPath();
      for(const d of rain)if(d.n){cx.moveTo(d.x,d.y);cx.lineTo(d.x+d.l*.09,d.y+d.l*.7);}
      cx.stroke();
      cx.strokeStyle='rgba(190,175,255,.3)';cx.beginPath();
      for(const d of rain)if(!d.n){cx.moveTo(d.x,d.y);cx.lineTo(d.x+d.l*.12,d.y+d.l);}
      cx.stroke();
    }

    function drawFace(x,y,r,e,col){
      cx.fillStyle=col;cx.beginPath();cx.arc(x,y,r,0,6.283);cx.fill();
      cx.fillStyle='rgba(255,255,255,.35)';cx.beginPath();cx.arc(x-r*.35,y-r*.4,r*.3,0,6.283);cx.fill();
      cx.fillStyle='rgba(0,0,0,.25)';cx.beginPath();cx.arc(x,y,r,.3,2.8);cx.lineTo(x,y);cx.fill();
      cx.strokeStyle='#1a0510';cx.fillStyle='#1a0510';cx.lineWidth=1.4;cx.lineCap='round';
      const pain=e.hitT>0;
      const blink=((e.age+e.blink)%3)<.12;
      const shout=((e.age*6)|0)%2===0;
      if(e.type==='armor'){
        cx.fillStyle='#1a1826';cx.fillRect(x-r*.85,y-r*.45,r*1.7,r*.55);
        cx.fillStyle=pain?'#fff':'#ff3b5c';
        if(!blink){cx.fillRect(x-r*.6,y-r*.3,r*.45,r*.25);cx.fillRect(x+r*.15,y-r*.3,r*.45,r*.25);}
        cx.beginPath();cx.moveTo(x-r*.4,y+r*.5);cx.lineTo(x+r*.4,y+r*(pain?.3:.5));cx.stroke();return;
      }
      if(e.type==='shooter'){
        cx.fillStyle='#1a0510';cx.beginPath();cx.arc(x,y-r*.1,r*.48,0,6.283);cx.fill();
        cx.fillStyle=pain?'#fff':e.fireCd<.35?'#fff':'#ff5050';
        cx.beginPath();cx.arc(x,y-r*.1,blink?r*.08:r*.24,0,6.283);cx.fill();
        cx.beginPath();cx.moveTo(x-r*.7,y-r*.7);cx.lineTo(x+r*.7,y-r*.55);cx.stroke();return;
      }
      cx.beginPath();
      if(pain){ // ＞＜
        cx.moveTo(x-r*.6,y-r*.4);cx.lineTo(x-r*.2,y-r*.15);cx.lineTo(x-r*.6,y+r*.1);
        cx.moveTo(x+r*.6,y-r*.4);cx.lineTo(x+r*.2,y-r*.15);cx.lineTo(x+r*.6,y+r*.1);cx.stroke();
        cx.beginPath();cx.ellipse(x,y+r*.5,r*.25,r*.18,0,0,6.283);cx.fill();return;
      }
      cx.moveTo(x-r*.75,y-r*.55);cx.lineTo(x-r*.2,y-r*.25);
      if(e.face===1){cx.moveTo(x+r*.2,y-r*.45);cx.lineTo(x+r*.75,y-r*.5);}else{cx.moveTo(x+r*.75,y-r*.55);cx.lineTo(x+r*.2,y-r*.25);}
      cx.stroke();
      if(blink){cx.beginPath();cx.moveTo(x-r*.5,y-r*.02);cx.lineTo(x-r*.2,y-r*.02);cx.moveTo(x+r*.2,y-r*.02);cx.lineTo(x+r*.5,y-r*.02);cx.stroke();}
      else{cx.fillRect(x-r*.45,y-r*.15,r*.22,r*.28);cx.fillRect(x+r*.25,y-r*.15,r*.22,r*.28);}
      cx.beginPath();
      if(e.face===0){if(shout){cx.ellipse(x,y+r*.5,r*.32,r*.2,0,0,6.283);cx.fill();}else{cx.arc(x,y+r*.75,r*.4,3.6,5.8);cx.stroke();}}
      else if(e.face===1){cx.moveTo(x-r*.35,y+r*.45);cx.quadraticCurveTo(x+r*.1,y+r*(shout?.2:.3),x+r*.5,y+r*.2);cx.stroke();}
      else{cx.ellipse(x,y+r*.45,r*.3,r*(shout?.3:.16),0,0,6.283);cx.fill();}
    }

    const ESTY={
      basic:{fill:'#3a0a1c',top:'#5a1430',st:'#e83055',tx:'#ffd6de',face:'#ff6b81',gl:'rd'},
      zig:{fill:'#300a3e',top:'#4c1660',st:'#d04ce8',tx:'#f3c8ff',face:'#e07bff',gl:'pu'},
      armor:{fill:'#242232',top:'#4a4862',st:'#a4aac4',tx:'#ff8fa3',face:'#7d8299',gl:'rd'},
      split:{fill:'#441c06',top:'#6a3210',st:'#ff8a2a',tx:'#ffe0c0',face:'#ffa24c',gl:'or'},
      shooter:{fill:'#42060f',top:'#661020',st:'#ff3b3b',tx:'#ffd0d0',face:'#ff6b6b',gl:'rd'},
      small:{fill:'#3c0e1e',top:'#5a1630',st:'#ff6b81',tx:'#ffd6de',face:'#ff6b81',gl:'rd'},
    };
    function bubbleBody(e,s,x,y,w,h,flash){
      const r=e.type==='armor'?5:h/2.4;
      // 影
      cx.fillStyle='rgba(0,0,0,.35)';rr(x+2,y+3,w,h,r);cx.fill();
      rr(x,y,w,h,r);
      if(flash){cx.fillStyle='#fff';cx.fill();}
      else{
        cx.fillStyle=s.fill;cx.fill();
        cx.save();cx.clip();
        cx.fillStyle=s.top;cx.fillRect(x,y,w,h*.45);
        cx.fillStyle=dith;cx.fillRect(x,y+h*.45-2,w,h*.55+2);
        cx.fillStyle='rgba(255,255,255,.22)';cx.fillRect(x+r*.6,y+2,w-r*1.2,1.5);
        cx.fillStyle='rgba(0,0,0,.35)';cx.fillRect(x,y+h-2.5,w,2.5);
        cx.restore();
      }
      cx.lineWidth=e.type==='armor'?2:1.5;cx.strokeStyle=s.st;rr(x,y,w,h,r);cx.stroke();
      // しっぽ（揺れる）
      const wig=Math.sin(e.age*8)*2;
      cx.fillStyle=flash?'#fff':s.fill;
      cx.beginPath();cx.moveTo(e.x-4,y+h-1);cx.lineTo(e.x+6+wig,y+h+7);cx.lineTo(e.x+7,y+h-1);cx.closePath();cx.fill();
      cx.beginPath();cx.moveTo(e.x-4,y+h);cx.lineTo(e.x+6+wig,y+h+7);cx.lineTo(e.x+7,y+h);cx.stroke();
    }
    function drawEnemy(e){
      const s=ESTY[e.type];
      let sx=1,sy=1;
      if(e.hitT>0){const f=e.hitT/.16;sx=1+.14*f;sy=1-.14*f;}
      else{const b=Math.sin(e.age*7+e.ph)*.03;sx=1+b;sy=1-b;}
      const w=e.w,h=e.h;
      // 速い敵は残像
      if(e.type==='zig'){
        cx.globalAlpha=.18;cx.fillStyle=s.st;
        rr(e.x-w/2-Math.cos(e.age*4.2+e.ph)*8,e.y-h/2-8,w,h,h/2.4);cx.fill();
        cx.globalAlpha=.09;rr(e.x-w/2-Math.cos(e.age*4.2+e.ph)*16,e.y-h/2-16,w,h,h/2.4);cx.fill();
      }
      gl(glow[s.gl],e.x,e.y,Math.max(w,h)*.8,.32);
      cx.globalAlpha=1;
      cx.save();cx.translate(e.x,e.y);cx.scale(sx,sy);cx.translate(-e.x,-e.y);
      const x=e.x-w/2,y=e.y-h/2,flash=e.flash>0;
      bubbleBody(e,s,x,y,w,h,flash);
      if(e.type==='armor'){
        cx.fillStyle='#c9cee0';
        cx.fillRect(x+3,y+3,2,2);cx.fillRect(x+w-5,y+3,2,2);cx.fillRect(x+3,y+h-5,2,2);cx.fillRect(x+w-5,y+h-5,2,2);
        if(e.hp<e.maxHp){cx.strokeStyle='rgba(255,255,255,.4)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+w*.7,y);cx.lineTo(x+w*.65,y+h*.4);cx.lineTo(x+w*.75,y+h*.6);cx.stroke();}
        for(let i=0;i<e.maxHp;i++){cx.fillStyle=i<e.hp?'#e8b830':'rgba(255,255,255,.15)';cx.fillRect(x+w/2-e.maxHp*4+i*8,y-6,6,3);}
      }else if(e.type==='split'){
        cx.strokeStyle='rgba(255,200,140,.6)';cx.lineWidth=1;cx.beginPath();
        cx.moveTo(e.x+4,y+1);cx.lineTo(e.x,y+h*.4);cx.lineTo(e.x+5,y+h*.6);cx.lineTo(e.x+1,y+h-1);cx.stroke();
      }else if(e.type==='shooter'){
        cx.strokeStyle='rgba(255,59,59,.45)';cx.lineWidth=1;rr(x-3,y-3,w+6,h+6,h/2.4+3);cx.stroke();
        for(let i=0;i<e.maxHp;i++){cx.fillStyle=i<e.hp?'#ff5050':'rgba(255,255,255,.15)';cx.fillRect(x+w/2-e.maxHp*4+i*8,y-7,6,3);}
      }
      if(e.small){
        cx.fillStyle=s.tx;cx.font=`11px ${FONT}`;cx.textAlign='left';
        cx.fillText(e.text,x+12,e.y+1);
        cx.fillStyle='#1a0510';cx.fillRect(x+5,e.y-3,2,2);cx.fillRect(x+5,e.y+1,2,2);
      }else{
        drawFace(x+15,e.y,9,e,flash?'#fff':s.face);
        cx.font=`13px ${FONT}`;cx.textAlign='left';
        cx.fillStyle='rgba(0,0,0,.5)';cx.fillText(e.text,x+30,e.y+2);
        cx.fillStyle=flash?'#000':s.tx;cx.fillText(e.text,x+29,e.y+1);
      }
      cx.restore();
    }
    function drawCorpse(c){
      const f=c.dieT/.4;
      if(c.good){
        if(c.absorb){ // マイクに吸い込まれる
          const k=easeOut(f);const x=lerp(c.x,player.x,k),y=lerp(c.y,player.y-10,k);
          cx.globalAlpha=1-f;gl(glow.cy,x,y,30*(1-f)+8,.8*(1-f));
          cx.globalAlpha=1-f;cx.fillStyle='#eafffb';cx.font=`${Math.round(13*(1-f*.6))}px ${FONT}`;cx.textAlign='center';cx.fillText(c.text,x,y);
        }else{
          cx.globalAlpha=1-f;cx.fillStyle='#ff9ec0';cx.font=`13px ${FONT}`;cx.textAlign='center';
          for(let i=0;i<c.text.length;i++)cx.fillText(c.text[i],c.x+(i-c.text.length/2)*14*(1+f*2),c.y+f*f*60+Math.sin(i*2)*f*20);
        }
        cx.globalAlpha=1;return;
      }
      // 吹き出しが真っ二つに割れて落ちる
      const s=ESTY[c.type];
      const dx=f*26,dy=f*f*50,rot=f*.6;
      cx.globalAlpha=1-f;
      for(let side=-1;side<=1;side+=2){
        cx.save();
        cx.translate(c.x+side*dx,c.y+dy);cx.rotate(side*rot);cx.translate(-c.x,-c.y);
        cx.beginPath();if(side<0)cx.rect(c.x-c.w,c.y-c.h,c.w,c.h*2);else cx.rect(c.x,c.y-c.h,c.w,c.h*2);cx.clip();
        bubbleBody(c,s,c.x-c.w/2,c.y-c.h/2,c.w,c.h,f<.15);
        cx.fillStyle=s.tx;cx.font=`${c.small?11:13}px ${FONT}`;cx.textAlign='left';cx.fillText(c.text,c.x-c.w/2+(c.small?12:29),c.y+1);
        cx.restore();
      }
      cx.globalAlpha=1;
    }
    function drawGood(g){
      const p=POW[g.pow];
      const x=g.x+Math.sin(g.age*2)*6,y=g.y+Math.sin(g.age*3)*2,w=g.w,h=g.h;
      const pul=.55+Math.sin(g.age*5)*.15;
      gl(glow[g.pow==='spread'?'gd':g.pow==='slow'?'pu':g.pow==='heal'?'pk':'cy'],x,y,w*.75,pul);
      gl(glow.cy,x,y,w*.5,.25);
      cx.globalAlpha=1;
      rr(x-w/2,y-h/2,w,h,h/2);
      cx.fillStyle=g.flash>0?'#782040':'#0a3034';cx.fill();
      cx.save();cx.clip();
      cx.fillStyle=g.flash>0?'#9a3058':'#145a5a';cx.fillRect(x-w/2,y-h/2,w,h*.45);
      cx.fillStyle=dith;cx.fillRect(x-w/2,y-h/2+h*.4,w,h*.6);
      cx.fillStyle='rgba(255,255,255,.3)';cx.fillRect(x-w/2+h/2,y-h/2+2,w-h,1.5);
      // 流れる光沢
      const sx=x-w/2+((g.age*60)%(w+40))-20;
      cx.fillStyle='rgba(255,255,255,.14)';cx.beginPath();cx.moveTo(sx,y-h/2);cx.lineTo(sx+10,y-h/2);cx.lineTo(sx,y+h/2);cx.lineTo(sx-10,y+h/2);cx.fill();
      cx.restore();
      cx.lineWidth=1.6;cx.strokeStyle=g.hp<3?(g.hp<2?'#ff7aa8':'#ffc0d8'):'#a0fff0';rr(x-w/2,y-h/2,w,h,h/2);cx.stroke();
      const hb=1+Math.max(0,Math.sin(g.age*6))*.15;
      cx.fillStyle='#ff9ec0';
      const hx=x-w/2+12,hy=y;
      cx.save();cx.translate(hx,hy);cx.scale(hb,hb);
      cx.beginPath();cx.moveTo(0,4);cx.bezierCurveTo(-7,-1,-3,-7,0,-3);cx.bezierCurveTo(3,-7,7,-1,0,4);cx.fill();cx.restore();
      cx.font=`13px ${FONT}`;cx.textAlign='left';
      cx.fillStyle='rgba(0,0,0,.45)';cx.fillText(g.text,x-w/2+22,y+2);
      cx.fillStyle='#eafffb';cx.fillText(g.text,x-w/2+21,y+1);
      const bx=x+w/2-1,by=y-h/2+1;
      cx.fillStyle='#05040e';cx.beginPath();cx.arc(bx,by,9.5,0,6.283);cx.fill();
      cx.fillStyle=p.col;cx.beginPath();cx.arc(bx,by,8,0,6.283);cx.fill();
      cx.fillStyle='rgba(255,255,255,.45)';cx.beginPath();cx.arc(bx-2.5,by-3,2.5,0,6.283);cx.fill();
      cx.fillStyle='#0a0716';cx.font=`10px ${FONT}`;cx.textAlign='center';cx.fillText(p.ch,bx,by+1);
      // 最初の1つは「受け止めて」の矢印
      if(g.hint&&scene==='play'){
        const ay=y+h/2+14+Math.sin(clock*8)*3;
        cx.fillStyle='#00e8c8';cx.font=`11px ${FONT}`;cx.fillText('撃たずに受け止めて',x,ay+12);
        cx.beginPath();cx.moveTo(x-6,ay-4);cx.lineTo(x+6,ay-4);cx.lineTo(x,ay+2);cx.fill();
      }
    }
    function drawEB(b){
      const col=b.boss?'or':'rd';
      gl(glow[col],b.x,b.y,16,.6);cx.globalAlpha=1;
      cx.fillStyle=b.boss?'#3a1204':'#3a0612';cx.beginPath();cx.arc(b.x,b.y,8,0,6.283);cx.fill();
      cx.fillStyle=b.boss?'rgba(255,170,90,.35)':'rgba(255,120,140,.35)';cx.beginPath();cx.arc(b.x-2,b.y-3,3,0,6.283);cx.fill();
      cx.strokeStyle=b.boss?'#ff9a3c':'#ff4d6a';cx.lineWidth=1.2;cx.beginPath();cx.arc(b.x,b.y,8,0,6.283);cx.stroke();
      cx.fillStyle=b.boss?'#ffd9a0':'#ffd0d8';cx.fillText(b.ch,b.x,b.y+1);
    }
    function drawPlayer(){
      let x=player.x,y=player.y+(player.recoil>0?2:0)+Math.sin(clock*3)*1.5;
      const dead=dying>0;
      if(dead&&dying<.9)return;
      const blink=inv>0&&!dead&&((clock*14)|0)%2===0;
      gl(glow.cy,x,y,48,.45+(glowPulse>0?glowPulse:0));
      if(glowPulse>0)gl(glow[glowCol],x,y,70,glowPulse*1.5);
      cx.globalAlpha=blink?.35:1;
      if(player.hitT>0){x+=Math.sin(clock*90)*3;}
      cx.save();cx.translate(x,y);cx.rotate(dead?(1.6-dying)*4:player.tilt);cx.scale(1.2,1.2);
      if(!dead){
        const fl=10+Math.sin(clock*40)*3+Math.random()*3+(Math.abs(player.vx)>40?4:0);
        cx.globalCompositeOperation='lighter';
        cx.fillStyle='rgba(0,232,200,.55)';cx.beginPath();cx.moveTo(-5,22);cx.lineTo(0,22+fl*1.6);cx.lineTo(5,22);cx.fill();
        cx.fillStyle='rgba(220,255,250,.85)';cx.beginPath();cx.moveTo(-2.5,22);cx.lineTo(0,22+fl*.9);cx.lineTo(2.5,22);cx.fill();
        cx.globalCompositeOperation='source-over';
      }
      // 持ち手（ベベル付き）
      cx.fillStyle='#14111f';cx.beginPath();cx.moveTo(-6.5,0);cx.lineTo(6.5,0);cx.lineTo(4,23);cx.lineTo(-4,23);cx.closePath();cx.fill();
      cx.fillStyle='#4a4268';cx.beginPath();cx.moveTo(-5,0);cx.lineTo(-1,0);cx.lineTo(-1,23);cx.lineTo(-3,23);cx.closePath();cx.fill();
      cx.fillStyle='#7a70a0';cx.fillRect(-4.5,1,1.2,20);
      cx.fillStyle='#e8b830';cx.fillRect(-7,-1,14,3.5);cx.fillStyle='#fff0b0';cx.fillRect(-7,-1,14,1);cx.fillStyle='#a07818';cx.fillRect(-7,1.8,14,.8);
      cx.fillStyle=((clock*2)|0)%2?'#ff3355':'#ff8899';cx.fillRect(-1.5,8,3,3);
      cx.fillStyle='#2b2540';cx.beginPath();cx.arc(0,-10,11,0,6.283);cx.fill();
      cx.save();cx.beginPath();cx.arc(0,-10,10,0,6.283);cx.clip();
      cx.strokeStyle='rgba(190,180,230,.45)';cx.lineWidth=.8;cx.beginPath();
      for(let i=-12;i<=12;i+=4){cx.moveTo(i-10,-22);cx.lineTo(i+10,2);cx.moveTo(i+10,-22);cx.lineTo(i-10,2);}
      cx.stroke();
      cx.fillStyle='rgba(0,0,0,.35)';cx.beginPath();cx.arc(3,-6,10,0,6.283);cx.fill();
      cx.fillStyle='rgba(255,255,255,.25)';cx.beginPath();cx.ellipse(-4,-15,4,2.5,-.6,0,6.283);cx.fill();
      cx.restore();
      cx.strokeStyle='#c9c2e6';cx.lineWidth=1.6;cx.beginPath();cx.arc(0,-10,11,0,6.283);cx.stroke();
      cx.strokeStyle='rgba(0,232,200,.6)';cx.lineWidth=1;cx.beginPath();cx.arc(0,-10,13.5,-2.6,-.55);cx.stroke();
      if(player.hitT>0||dead){cx.fillStyle='rgba(255,40,80,.5)';cx.beginPath();cx.arc(0,-10,12,0,6.283);cx.fill();cx.beginPath();cx.moveTo(-7,-1);cx.lineTo(7,-1);cx.lineTo(4,23);cx.lineTo(-4,23);cx.closePath();cx.fill();}
      cx.restore();
      cx.globalAlpha=1;
      if(barrierT>0){
        const a=barrierT<2?(((clock*8)|0)%2?.25:.6):.6;
        cx.strokeStyle=`rgba(0,232,200,${a})`;cx.lineWidth=2;
        cx.beginPath();cx.arc(x,y-4,30+Math.sin(clock*6)*1.5,0,6.283);cx.stroke();
        cx.fillStyle=`rgba(0,232,200,${a*.12})`;cx.fill();
        cx.strokeStyle=`rgba(200,255,250,${a*.6})`;cx.lineWidth=1;cx.beginPath();cx.arc(x,y-4,30,clock*3,clock*3+1.2);cx.stroke();
      }
      // 当たり判定の芯（ここに当たらなければ大丈夫）
      if(scene==='play'&&!dead){
        const hy=player.y-6;
        cx.fillStyle='rgba(5,4,14,.8)';cx.beginPath();cx.arc(player.x,hy,4.5,0,6.283);cx.fill();
        cx.fillStyle='#ffffff';cx.beginPath();cx.arc(player.x,hy,2.6,0,6.283);cx.fill();
        cx.strokeStyle='rgba(255,90,120,.9)';cx.lineWidth=1;cx.beginPath();cx.arc(player.x,hy,4.5,0,6.283);cx.stroke();
      }
    }
    function drawBoss(){
      const b=boss;if(!b)return;
      const fade=b.dead?Math.max(0,1-b.dieT/1.6):1;if(fade<=0)return;
      const enr=b.hp<b.max*.4&&!b.dead;
      const x=b.x+(b.flash>0?rnd(-2,2):0),y=b.y,R=b.R*(b.dead?1+b.dieT*.4:1+Math.sin(clock*4)*.03);
      gl(glow.or,x,y,R*2.4,.55*fade);gl(glow.rd,x,y,R*1.6,(enr?.8:.5)*fade);
      cx.globalAlpha=fade;
      cx.globalCompositeOperation='lighter';
      for(let arm=0;arm<5;arm++){
        const base=b.ang+arm*1.2566;
        cx.strokeStyle=arm%2?(enr?'rgba(255,60,60,.6)':'rgba(255,120,30,.55)'):'rgba(232,48,85,.55)';
        cx.lineWidth=R*.16;cx.lineCap='round';
        cx.beginPath();
        for(let s=0;s<=12;s++){const f=s/12,a=base+f*2.6,r=R*(.25+f*.85);const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.82;s?cx.lineTo(px,py):cx.moveTo(px,py);}
        cx.stroke();
        cx.strokeStyle='rgba(255,230,160,.35)';cx.lineWidth=R*.04;cx.stroke();
      }
      cx.globalCompositeOperation='source-over';
      cx.fillStyle=b.flash>0?'#5a1a0a':'#12040a';cx.beginPath();cx.arc(x,y,R*.42,0,6.283);cx.fill();
      cx.fillStyle='rgba(255,120,40,.18)';cx.beginPath();cx.arc(x,y+R*.1,R*.36,0,3.14);cx.fill();
      cx.strokeStyle='#ff7a1e';cx.lineWidth=2;cx.beginPath();cx.arc(x,y,R*.42,0,6.283);cx.stroke();
      const ey=y-R*.05,es=enr?1.3:1;
      cx.fillStyle=enr?'#ffffff':'#ffcc55';
      if(((clock+.3)%3.2)>.12||enr){
        cx.beginPath();cx.moveTo(x-R*.3*es,ey-R*.09*es);cx.lineTo(x-R*.08,ey+R*.02);cx.lineTo(x-R*.28*es,ey+R*.08);cx.closePath();cx.fill();
        cx.beginPath();cx.moveTo(x+R*.3*es,ey-R*.09*es);cx.lineTo(x+R*.08,ey+R*.02);cx.lineTo(x+R*.28*es,ey+R*.08);cx.closePath();cx.fill();
      }
      cx.strokeStyle='#ff4d4d';cx.lineWidth=2;cx.beginPath();
      const mo=((clock*5)|0)%2?R*.06:R*.1;
      for(let i=0;i<=6;i++){const px=x-R*.22+i*R*.073;const py=y+R*.2+(i%2?mo:0);i?cx.lineTo(px,py):cx.moveTo(px,py);}
      cx.stroke();
      // 次の攻撃の予告（テレグラフ）
      if(!b.dead&&b.patT<0&&b.t>2){
        const k=1+b.patT/.9, blinkA=.35+.45*(((clock*10)|0)%2);
        const names=['渦巻き','狙い撃ち','包囲網','言葉の雨'];
        cx.globalAlpha=fade*blinkA;cx.strokeStyle='#ffcc55';cx.lineWidth=1.5;
        if(b.pat===1){const a=Math.atan2(player.y-6-y,player.x-x);cx.setLineDash([6,6]);for(let s=-2;s<=2;s++){cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+Math.cos(a+s*.2)*H,y+Math.sin(a+s*.2)*H);cx.stroke();}cx.setLineDash([]);}
        else{cx.beginPath();cx.arc(x,y,R*(1.2+k*.8),0,6.283);cx.stroke();}
        cx.globalAlpha=fade;cx.font=`12px ${FONT}`;cx.textAlign='center';cx.fillStyle='#05040e';cx.fillText('▼ '+names[b.pat],x+1,y+R*1.25+1);cx.fillStyle='#ffcc55';cx.fillText('▼ '+names[b.pat],x,y+R*1.25);
      }
      cx.font=`${Math.round(R*.24)}px ${FONT}`;cx.textAlign='center';
      const words=['晒','叩','拡散','炎上','特定','謝罪'];
      for(let i=0;i<words.length;i++){
        const a=-b.ang*.6+i*1.047;cx.fillStyle=i%2?'#ffd0a0':'#ff8a8a';
        cx.fillText(words[i],x+Math.cos(a)*R*1.05,y+Math.sin(a)*R*.86);
      }
      cx.globalAlpha=1;
    }
    function drawParticles(){
      cx.globalCompositeOperation='lighter';
      for(const p of parts){
        if(p.life<=0)continue;
        cx.globalAlpha=Math.min(1,p.life/p.max*1.4);
        cx.fillStyle=p.col;cx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
      }
      for(const o of rings){
        if(o.t<=0)continue;
        const f=1-o.t/o.max;
        cx.globalAlpha=(1-f)*.8;cx.strokeStyle=o.col;cx.lineWidth=2.5*(1-f)+.5;
        cx.beginPath();cx.arc(o.x,o.y,o.r*(.2+easeOut(f)),0,6.283);cx.stroke();
      }
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
    }
    function drawPops(){
      cx.textAlign='center';
      for(const o of pops){
        if(o.t<=0)continue;
        const life=o.big?1.3:.9,age=life-o.t;
        const sc=age<.12?easeOutBack(age/.12):1;
        cx.globalAlpha=Math.min(1,o.t*2.2);
        cx.font=`${Math.round((o.big?14:12)*sc)}px ${FONT}`;
        cx.fillStyle='rgba(5,4,14,.8)';cx.fillText(o.text,o.x+1,o.y+1);
        cx.fillStyle=o.col;cx.fillText(o.text,o.x,o.y);
      }
      cx.globalAlpha=1;
    }
    function shieldIcon(x,y,on){
      cx.beginPath();cx.moveTo(x,y-7);cx.lineTo(x+6,y-4.5);cx.lineTo(x+5,y+2);cx.lineTo(x,y+7);cx.lineTo(x-5,y+2);cx.lineTo(x-6,y-4.5);cx.closePath();
      if(on){cx.fillStyle='#00a890';cx.fill();cx.fillStyle='#00e8c8';cx.beginPath();cx.moveTo(x,y-7);cx.lineTo(x+6,y-4.5);cx.lineTo(x+5,y+2);cx.lineTo(x,y+7);cx.closePath();cx.fill();cx.fillStyle='rgba(255,255,255,.55)';cx.fillRect(x-3,y-4,2,5);}
      else{cx.fillStyle='rgba(60,10,25,.6)';cx.fill();cx.strokeStyle='rgba(232,48,85,.6)';cx.lineWidth=1;cx.stroke();}
    }
    function drawHud(){
      // 固定のHUD帯（ゲーム世界はこの下だけ）
      const g=cx.createLinearGradient(0,0,0,HUD_H);
      g.addColorStop(0,'#0b0820');g.addColorStop(1,'#07051a');
      cx.fillStyle=g;cx.fillRect(0,0,W,HUD_H);
      cx.fillStyle='rgba(138,82,212,.55)';cx.fillRect(0,HUD_H-2,W,1);
      cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(0,HUD_H-1,W,1);
      cx.fillStyle='rgba(222,204,248,.06)';cx.fillRect(0,0,W,1);
      cx.textBaseline='middle';
      cx.font=`10px ${FONT}`;cx.textAlign='left';cx.fillStyle='#bbaedd';cx.fillText('こころ',10,16);
      const hurtShake=player.hitT>0?Math.sin(clock*80)*2:0;
      for(let i=0;i<MAX_SHIELD;i++)shieldIcon(52+i*15+(i===shield?hurtShake:0),16,i<shield);
      cx.textAlign='right';
      cx.font=`15px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText(String(score).padStart(6,'0'),W-10,16);
      cx.font=`9px ${FONT}`;cx.fillStyle='#5e5078';cx.fillText('BEST '+String(Math.max(SD.best.score,0)).padStart(6,'0'),W-10,31);
      if(remix){cx.textAlign='left';cx.fillStyle='#ff9a3c';cx.fillText('REMIX',10,32);}
      if(boss&&(!boss.dead||boss.dieT<1)){
        const bx=remix?50:10,bw=W-bx-112;
        cx.textAlign='left';cx.font=`10px ${FONT}`;cx.fillStyle='#ff9a6a';cx.fillText('炎上の渦',bx,44);
        const x0=bx+50,w0=bw-50;
        cx.fillStyle='#000';cx.fillRect(x0-1,39,w0+2,9);
        cx.fillStyle='#2a0a08';cx.fillRect(x0,40,w0,7);
        const f=Math.max(0,boss.hp/boss.max);
        cx.fillStyle=f<.4?'#ff3b3b':'#ff7a1e';cx.fillRect(x0,40,w0*f,7);
        cx.fillStyle='rgba(255,255,255,.4)';cx.fillRect(x0,40,w0*f,2);
        cx.fillStyle='rgba(0,0,0,.3)';for(let i=1;i<10;i++)cx.fillRect(x0+w0*i/10,40,1,7);
      }else if(scene==='play'){
        cx.textAlign='left';cx.font=`9px ${FONT}`;cx.fillStyle='#5e5078';
        const wv=waveIdx>=0?WAVES[waveIdx]:null;
        if(wv)cx.fillText(wv.name+'　'+wv.sub,remix?50:10,44);
        // 進行バー
        const px0=W*.5,pw=W*.5-112;
        if(pw>30){cx.fillStyle='rgba(255,255,255,.08)';cx.fillRect(px0,42,pw,3);cx.fillStyle='#8a52d4';cx.fillRect(px0,42,pw*Math.min(1,t/T_BOSS),3);cx.fillStyle='#e83055';cx.fillRect(px0+pw-2,40,3,7);}
      }
      if(scene!=='play')return;
      // 効果中のパワーアップ（帯の下）
      let yy=HUD_H+14;
      const bars=[[spreadT,POW.spread],[barrierT,POW.barrier],[slowT,POW.slow]];
      for(const [v,p] of bars){
        if(v<=0)continue;
        cx.fillStyle='rgba(5,4,14,.65)';rr(6,yy-8,118,16,5);cx.fill();
        cx.textAlign='left';cx.fillStyle=p.col;cx.font=`10px ${FONT}`;cx.fillText(p.label,11,yy);
        cx.fillStyle='rgba(255,255,255,.12)';cx.fillRect(74,yy-2,44,4);
        cx.fillStyle=p.col;cx.fillRect(74,yy-2,44*Math.max(0,v/p.dur),4);
        yy+=19;
      }
      if(combo>=2){
        const m=mult();
        const pul=comboT>2.4?1.2:1;
        cx.textAlign='right';
        cx.font=`${Math.round(13*pul)}px ${FONT}`;
        cx.fillStyle='rgba(5,4,14,.8)';cx.fillText(combo+' COMBO ×'+m.toFixed(1),W-9,HUD_H+15);
        cx.fillStyle=m>=2.5?'#ff9a3c':m>=1.5?'#e8b830':'#00e8c8';
        cx.fillText(combo+' COMBO ×'+m.toFixed(1),W-10,HUD_H+14);
        cx.fillStyle='rgba(255,255,255,.15)';cx.fillRect(W-80,HUD_H+24,70,2);
        cx.fillStyle='#e8b830';cx.fillRect(W-80,HUD_H+24,70*Math.max(0,comboT/2.6),2);
      }
      // 最初の数秒は操作の手ほどき
      if(t<5&&!touchedOnce){
        const a=Math.min(1,(5-t));cx.globalAlpha=a;
        const hx=player.x+Math.sin(clock*3)*40,hy=player.y+44;
        cx.fillStyle='rgba(255,255,255,.85)';cx.beginPath();cx.arc(hx,hy,7,0,6.283);cx.fill();
        cx.strokeStyle='rgba(255,255,255,.5)';cx.lineWidth=1.5;cx.beginPath();cx.arc(hx,hy,12+Math.sin(clock*6)*2,0,6.283);cx.stroke();
        cx.textAlign='center';cx.font=`11px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText('どこでもドラッグで移動',player.x,hy+24);
        cx.globalAlpha=1;
      }
    }
    function drawBanner(){
      if(!banner)return;
      const b=banner,f=b.t/b.dur;
      const a=f<.12?f/.12:f>.8?(1-f)/.2:1;
      const slide=f<.12?(1-easeOut(f/.12))*40:0;
      const y=H*.38;
      const hh=f<.1?30*easeOutBack(f/.1):30;
      cx.globalAlpha=a*.88;
      cx.fillStyle='rgba(5,4,14,.8)';cx.fillRect(0,y-hh,W,hh*2+2);
      cx.fillStyle=dith;cx.fillRect(0,y-hh,W,hh*2+2);
      cx.fillStyle=b.col;cx.fillRect(0,y-hh,W,1);cx.fillRect(0,y+hh+1,W,1);
      if(b.main==='WARNING'){
        cx.globalAlpha=a*.4;cx.fillStyle='#e83055';
        for(let i=-2;i<W/14+2;i++){const sx=i*14+((clock*40)%14);cx.beginPath();cx.moveTo(sx,y-30);cx.lineTo(sx+7,y-30);cx.lineTo(sx+1,y-22);cx.lineTo(sx-6,y-22);cx.fill();cx.beginPath();cx.moveTo(sx,y+23);cx.lineTo(sx+7,y+23);cx.lineTo(sx+1,y+31);cx.lineTo(sx-6,y+31);cx.fill();}
      }
      cx.globalAlpha=a;cx.textAlign='center';
      cx.font=`22px ${FONT}`;cx.fillStyle='rgba(0,0,0,.6)';cx.fillText(b.main,W/2+slide+2,y-4);
      cx.fillStyle=b.col;cx.fillText(b.main,W/2+slide,y-6);
      cx.font=`12px ${FONT}`;cx.fillStyle='#bbaedd';cx.fillText(b.sub,W/2-slide,y+16);
      cx.globalAlpha=1;
    }
    // タイトルロゴ
    function drawLogo(cxp,cyp,sc,a){
      cx.save();cx.globalAlpha=a;cx.translate(cxp,cyp);cx.scale(sc,sc);
      gl(glow.or,0,0,150,.35*a);gl(glow.rd,0,10,110,.3*a);cx.globalAlpha=a;
      cx.textAlign='center';cx.textBaseline='middle';
      const fs=Math.min(38,(W-40)/5.2);
      const draw=(txt,y,size)=>{
        cx.font=`${size}px ${FONT}`;
        cx.lineJoin='round';
        cx.strokeStyle='#05040e';cx.lineWidth=8;cx.strokeText(txt,0,y+3);
        cx.strokeStyle='#5a0a20';cx.lineWidth=6;cx.strokeText(txt,0,y);
        const g=cx.createLinearGradient(0,y-size/2,0,y+size/2);
        g.addColorStop(0,'#fff6c0');g.addColorStop(.35,'#ffcc55');g.addColorStop(.7,'#ff6a1e');g.addColorStop(1,'#e83055');
        cx.fillStyle=g;cx.fillText(txt,0,y);
        cx.save();cx.beginPath();cx.rect(-W,y-size/2,W*2,size*.3);cx.clip();cx.fillStyle='rgba(255,255,255,.35)';cx.fillText(txt,0,y);cx.restore();
      };
      draw('炎上コメント',-fs*.62,fs);
      draw('撃　退',fs*.62,fs*1.15);
      // 炎の舌
      cx.globalCompositeOperation='lighter';
      for(let i=0;i<7;i++){
        const fx=(i-3)*fs*.7,h=fs*(.35+Math.sin(clock*7+i*1.7)*.12);
        cx.fillStyle='rgba(255,120,30,.35)';cx.beginPath();cx.moveTo(fx-6,-fs*1.1);cx.quadraticCurveTo(fx+Math.sin(clock*5+i)*5,-fs*1.1-h*1.4,fx+6,-fs*1.1);cx.fill();
      }
      cx.globalCompositeOperation='source-over';
      cx.font=`11px ${FONT}`;cx.fillStyle='#00e8c8';cx.fillText('－ FLAME  BUSTER －',0,fs*1.55);
      cx.restore();cx.textBaseline='middle';
    }
    function drawTitle(){
      cx.fillStyle='rgba(5,4,14,.45)';cx.fillRect(0,0,W,H);
      const f=Math.min(1,sceneT/.7);
      drawLogo(W/2,H*.36,lerp(1.6,1,easeOutBack(f)),Math.min(1,sceneT*2));
      cx.textAlign='center';cx.font=`12px ${FONT}`;
      const night='第'+(SD.plays+1)+'夜'+(remix?'　REMIX':'');
      cx.fillStyle=remix?'#ff9a3c':'#bbaedd';cx.fillText(night,W/2,H*.36+90);
      if(SD.best.score>0){cx.fillStyle='#5e5078';cx.font=`10px ${FONT}`;cx.fillText('BEST '+SD.best.score+'　'+(SD.best.grade?'RANK '+SD.best.grade:''),W/2,H*.36+110);}
      if(sceneT>.8){cx.globalAlpha=.5+Math.sin(clock*5)*.4;cx.fillStyle='#deccf8';cx.font=`12px ${FONT}`;cx.fillText('TAP / ENTER',W/2,H*.7);cx.globalAlpha=1;}
    }
    function drawHowto(){
      const a=Math.min(1,sceneT/.3);
      cx.globalAlpha=a;
      cx.fillStyle='rgba(5,4,14,.55)';cx.fillRect(0,0,W,H);
      const pw=Math.min(W-28,340),ph=232,px=(W-pw)/2,py=H*.42-ph/2;
      cx.fillStyle='rgba(10,7,22,.96)';rr(px,py,pw,ph,8);cx.fill();
      cx.fillStyle=dith;rr(px,py,pw,ph,8);cx.fill();
      cx.strokeStyle='#8a52d4';cx.lineWidth=2;rr(px,py,pw,ph,8);cx.stroke();
      cx.strokeStyle='rgba(222,204,248,.2)';cx.lineWidth=1;rr(px+4,py+4,pw-8,ph-8,6);cx.stroke();
      cx.textAlign='center';cx.font=`15px ${FONT}`;cx.fillStyle='#e8b830';
      cx.fillText('― 遊び方 ―',W/2,py+22);
      cx.textAlign='left';cx.font=`12px ${FONT}`;
      const lx=px+18;
      cx.fillStyle='#00e8c8';cx.fillText('◆',lx,py+52);cx.fillStyle='#deccf8';cx.fillText('どこでもドラッグ／矢印で動く',lx+16,py+52);
      cx.fillStyle='#8a7aa8';cx.font=`10px ${FONT}`;cx.fillText('声（ショット）は自動で飛ぶ',lx+16,py+68);cx.font=`12px ${FONT}`;
      const demo={type:'basic',age:clock,ph:0,hitT:0,flash:0,face:0,blink:0,x:lx+13,y:py+94,w:26,h:18,fireCd:1,small:false};
      bubbleBody(demo,ESTY.basic,lx,py+85,26,18,false);
      cx.fillStyle='#deccf8';cx.textAlign='left';cx.font=`12px ${FONT}`;cx.fillText('赤い悪意は撃ち落とせ',lx+34,py+93);
      cx.fillStyle='#8a7aa8';cx.font=`10px ${FONT}`;cx.fillText('下まで落とすと心に刺さる（こころ−1）',lx+34,py+109);cx.font=`12px ${FONT}`;
      gl(glow.cy,lx+13,py+138,18,.5*a);cx.globalAlpha=a;
      cx.fillStyle='#0a3034';rr(lx,py+130,26,16,8);cx.fill();cx.strokeStyle='#a0fff0';cx.stroke();
      cx.fillStyle='#deccf8';cx.fillText('光る応援は撃たずに受け止める',lx+34,py+138);
      cx.fillStyle='#8a7aa8';cx.font=`10px ${FONT}`;cx.fillText('拡＝拡散 護＝バリア 緩＝スロー ♥＝回復',lx+34,py+154);cx.font=`12px ${FONT}`;
      cx.fillStyle='#e8b830';cx.fillText('◆',lx,py+180);cx.fillStyle='#deccf8';cx.fillText('ピンチはモデレーター召喚（1回）',lx+16,py+180);
      cx.textAlign='center';cx.fillStyle='rgba(222,204,248,'+(.5+Math.sin(clock*5)*.3)+')';
      cx.fillText('タップで開始',W/2,py+ph-16);
      // 自動開始までのゲージ
      cx.fillStyle='rgba(255,255,255,.1)';cx.fillRect(px+20,py+ph-6,pw-40,2);
      cx.fillStyle='#8a52d4';cx.fillRect(px+20,py+ph-6,(pw-40)*Math.min(1,sceneT/5),2);
      cx.globalAlpha=1;
    }
    function drawGrade(){
      cx.fillStyle='rgba(5,4,14,.7)';cx.fillRect(0,0,W,H);
      const pw=Math.min(W-28,340),ph=300,px=(W-pw)/2,py=Math.max(HUD_H+10,H*.44-ph/2);
      const op=Math.min(1,sceneT/.3);
      cx.globalAlpha=op;
      cx.fillStyle='rgba(10,7,22,.97)';rr(px,py,pw,ph,8);cx.fill();
      cx.fillStyle=dith;rr(px,py,pw,ph,8);cx.fill();
      cx.strokeStyle=finalReason==='down'?'#e83055':'#e8b830';cx.lineWidth=2;rr(px,py,pw,ph,8);cx.stroke();
      cx.strokeStyle='rgba(222,204,248,.2)';cx.lineWidth=1;rr(px+4,py+4,pw-8,ph-8,6);cx.stroke();
      cx.textAlign='center';cx.font=`16px ${FONT}`;
      cx.fillStyle=finalReason==='down'?'#ff7a90':'#e8b830';
      cx.fillText(finalReason==='down'?'― 心が、折れた ―':bossBeaten?'― 鎮火 ―':'― 夜明けまで耐えた ―',W/2,py+24);
      const rows=[['SCORE',score],['撃退',kills],['最大コンボ',maxCombo],['受け止めた応援',caught],['誤射',friendlyFire],['のこった こころ',Math.max(0,shield)+' / '+MAX_SHIELD]];
      cx.font=`12px ${FONT}`;
      for(let i=0;i<rows.length;i++){
        const appear=sceneT-.25-i*.08;if(appear<0)continue;
        const yy=py+54+i*22;
        cx.globalAlpha=op*Math.min(1,appear*5);
        cx.textAlign='left';cx.fillStyle='#bbaedd';cx.fillText(rows[i][0],px+22,yy);
        cx.textAlign='right';cx.fillStyle='#deccf8';
        const v=rows[i][1];
        cx.fillText(typeof v==='number'?Math.round(v*Math.min(1,appear*2.5)):v,px+pw*.62,yy);
      }
      cx.globalAlpha=op;
      // 評価スタンプ
      if(sceneT>.6){
        const f=Math.min(1,(sceneT-.6)/.3);
        const sc=lerp(3,1,easeOutBack(f));
        const gx=px+pw*.82,gy=py+108;
        const gc={S:'#ffcc55',A:'#00e8c8',B:'#9b8cff',C:'#ff6b81'}[grade];
        cx.save();cx.translate(gx,gy);cx.rotate(-.18);cx.scale(sc,sc);
        cx.globalAlpha=op*Math.min(1,f*2);
        gl(glow[grade==='S'?'gd':grade==='A'?'cy':grade==='B'?'pu':'rd'],0,0,50,.6);cx.globalAlpha=op;
        cx.strokeStyle=gc;cx.lineWidth=3;cx.beginPath();cx.arc(0,0,30,0,6.283);cx.stroke();
        cx.lineWidth=1;cx.beginPath();cx.arc(0,0,25,0,6.283);cx.stroke();
        cx.font=`40px ${FONT}`;cx.textAlign='center';cx.fillStyle='#05040e';cx.fillText(grade,2,4);cx.fillStyle=gc;cx.fillText(grade,0,2);
        cx.font=`7px ${FONT}`;cx.fillText('RANK',0,-16);
        cx.restore();
      }
      cx.textAlign='center';cx.font=`11px ${FONT}`;
      if(sceneT>1.1){
        cx.fillStyle='#5e5078';cx.fillText('BEST '+SD.best.score+'　最高ランク '+(SD.best.grade||'-')+'　クリア '+SD.clears+'回',W/2,py+ph-58);
        if(newRecord){cx.fillStyle=((clock*4)|0)%2?'#ffcc55':'#ff9a3c';cx.font=`14px ${FONT}`;cx.fillText('★ NEW RECORD ★',W/2,py+ph-80);}
        if(finalReason==='clear'&&SD.clears===1){cx.fillStyle='#ff9a3c';cx.font=`10px ${FONT}`;cx.fillText('次の夜から REMIX が解放される',W/2,py+ph-40);}
      }
      if(sceneT>1.4){cx.globalAlpha=.5+Math.sin(clock*5)*.4;cx.fillStyle='#deccf8';cx.font=`12px ${FONT}`;cx.fillText('タップで続ける',W/2,py+ph-18);}
      cx.globalAlpha=1;
    }
    function draw(){
      cx.setTransform(dpr,0,0,dpr,0,0);
      cx.textBaseline='middle';
      if(shake>0){cx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);}
      drawBg();
      // ゲーム世界はHUD帯の下だけに描く
      cx.save();cx.beginPath();cx.rect(-20,HUD_H,W+40,H);cx.clip();
      if(scene!=='play'){cx.globalAlpha=.55;for(const e of amb)drawEnemy(e);cx.globalAlpha=1;}
      drawBoss();
      cx.textBaseline='middle';
      for(const g of goods)drawGood(g);
      for(const e of enemies)drawEnemy(e);
      for(const c of corpses)drawCorpse(c);
      cx.globalCompositeOperation='lighter';
      cx.lineWidth=2.2;cx.lineCap='round';
      for(const b of pb){
        gl(b.gold?glow.gd:glow.cy,b.x,b.y,14,.75);
        cx.globalAlpha=1;cx.strokeStyle=b.gold?'#ffe9a8':'#c8fff6';
        const an=Math.atan2(b.vy,b.vx);
        cx.beginPath();cx.arc(b.x-Math.cos(an)*7,b.y-Math.sin(an)*7,9,an-.8,an+.8);cx.stroke();
        cx.globalAlpha=.55;cx.beginPath();cx.arc(b.x-Math.cos(an)*13,b.y-Math.sin(an)*13,9,an-.6,an+.6);cx.stroke();
      }
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      cx.font=`11px ${FONT}`;cx.textAlign='center';
      for(const b of eb)drawEB(b);
      if(scene==='play'||scene==='title'||scene==='story'||scene==='howto')drawPlayer();
      drawParticles();
      drawPops();
      cx.restore();
      if(slowT>0&&scene==='play'){cx.fillStyle=`rgba(90,80,220,${Math.min(.14,slowT*.1)})`;cx.fillRect(-20,-20,W+40,H+40);}
      cx.drawImage(lyVig,0,0,W,H);
      if(hurtFlash>0){cx.fillStyle=`rgba(232,48,85,${hurtFlash*.45})`;cx.fillRect(-20,-20,W+40,H+40);}
      if(whiteFlash>0){cx.fillStyle=`rgba(220,255,250,${whiteFlash*.6})`;cx.fillRect(-20,-20,W+40,H+40);}
      if(bombT>0){
        const f=1-bombT/1.4;
        cx.globalCompositeOperation='lighter';cx.globalAlpha=(1-f)*.5;
        cx.drawImage(glow.cy,-W*.2,H*(1-f*1.3)-60,W*1.4,120);
        cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      }
      cx.setTransform(dpr,0,0,dpr,0,0);
      drawHud();
      if(scene==='play')drawBanner();
      if(dying>0&&scene==='play'){cx.fillStyle=`rgba(5,4,14,${Math.min(.6,(1.6-dying)*.5)})`;cx.fillRect(0,HUD_H,W,H);
        cx.globalAlpha=Math.min(1,(1.6-dying)*2);cx.textAlign='center';cx.font=`18px ${FONT}`;cx.fillStyle='#ff7a90';cx.fillText('……心が、もたない',W/2,H*.45);cx.globalAlpha=1;}
      if(scene==='title')drawTitle();
      else if(scene==='howto')drawHowto();
      else if(scene==='grade')drawGrade();
      else if(scene==='story'||scene==='ending'){cx.fillStyle='rgba(5,4,14,.35)';cx.fillRect(0,HUD_H,W,H);
        if(scene==='story')drawLogo(W/2,H*.3,.62,.5);}
      drawTrans();
    }
    function hud(){
      const html=`SCORE <span style="color:var(--tx-b)">${score}</span>　撃退 ${kills}　🛡${Math.max(0,shield)}/${MAX_SHIELD}`;
      if(html!==lastScoreHtml){lastScoreHtml=html;mg.setScore(html);}
      const tm=scene!=='play'?(scene==='grade'||scene==='ending'?'RESULT':'READY'):boss&&!boss.dead?'渦 '+Math.max(0,Math.ceil(T_END-t)):String(Math.max(0,Math.ceil(T_END-t)));
      if(tm!==lastTimer){lastTimer=tm;mg.setTimer(tm);}
    }

    return {result(reason){
      window.removeEventListener('resize',onResize);
      // 評価・結末の途中で終了ボタンが押されても、決まった結果を使う
      if(finalReason)reason=finalReason;
      SD.plays++;SD.lastDay=gs.day;
      const clear=reason==='clear', down=reason==='down';
      const flameDown=clear?Math.min(5,2+Math.floor(kills/20))+(bossBeaten?1:0):Math.floor(kills/25);
      const fx={
        flame:-Math.min(gs.flame,flameDown),
        mental:clear?2+Math.max(0,shield)+(bossBeaten?1:0):down?-6:0,
        followers:clear?Math.min(10,Math.floor(kills/10))+Math.min(6,caught)+(bossBeaten?3:0):0,
        fatigue:down?8:6,
      };
      if(friendlyFire>=3)fx.followers=(fx.followers||0)-friendlyFire;
      if(clear&&bossBeaten)fx.hope=1;
      const title=clear?(bossBeaten?'🔥 炎上の渦を鎮めた':'🔥 炎上を耐えきった'):down?'💔 心が削られた':'🔥 撃退を中断した';
      return {
        title,
        summary:(grade?`ランク <span class="up">${grade}</span>　`:'')+`スコア <span class="up">${score}</span>　撃退 <span class="up">${kills}</span>　最大コンボ <span class="up">${maxCombo}</span>`+
          `<br>受け止めた応援 <span class="up">${caught}</span>`+(friendlyFire?`　誤射 <span class="down">${friendlyFire}</span>`:'')+
          (clear?(bossBeaten?'<br>「炎上の渦」を撃破した。':'<br>渦は消えきらなかったが、朝まで耐えた。'):''),
        fx, time:40, sp:clear?1:0,
        log:clear?(bossBeaten?'炎上の渦を鎮めた。届いた応援の声が、まだ耳に残っている。':'炎上コメントを撃退した。少し静かな夜になった。'):down?'荒れたコメント欄に心を削られた。子どもの寝息に救われた。':'荒れたコメント欄と向き合った。',
        cutin:clear?(bossBeaten?['win','……燃えてたのは画面の中だけや。ちゃんと届く声だけ拾うわ。']:['happy','……もう大丈夫。ちゃんと届く声だけ拾うわ。']):down?['tired','……今夜はもう、コメント欄見られへん。']:null,
      };
    }};
  },
});
