// ══════════════════════════════════════════════════════════
// 釣り（癒し系）「夜釣りで頭を空っぽに」
// 壇ノ浦の夜の港。関門橋の灯り、灯台の光、波に崩れる月。
// 常連の源さんの隣で6投だけ糸を垂らす。浅場・中層・沖、宵の口→夜更け→丑三つ時で
// 寄ってくるものが変わる。釣れたものは魚図鑑（gs.fishingData）に残る。
// ══════════════════════════════════════════════════════════
addMinigameStyle('diffbadge','.mg-diffb{display:inline-block;margin-left:7px;padding:1px 5px;border:1px solid currentColor;border-radius:3px;font-size:.58rem;letter-spacing:0;vertical-align:1px;}.mg-diffb-easy{color:#44ee88;}.mg-diffb-normal{color:#e8b830;}.mg-diffb-hard{color:#ff6a86;}');
addMinigameStyle('fishing',`
.mg-fishing{background:#05040e;}
.mg-fishing .fishing-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;}
.mg-fishing .fishing-zbtn{position:absolute;right:8px;top:8px;z-index:4;touch-action:none;padding:5px 9px 4px;border-radius:12px;
  border:1px solid rgba(0,232,200,.45);background:rgba(8,10,28,.72);color:#bff6ee;font-family:var(--dot);font-size:.64rem;letter-spacing:.04em;
  cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:0 0 10px rgba(0,232,200,.18);transition:opacity .4s;}
.mg-fishing .fishing-zbtn.hide{opacity:0;pointer-events:none;}
.mg-fishing .fishing-zbtn small{font-family:var(--mono);font-size:.58rem;color:rgba(190,246,238,.65);margin-left:4px;}
.mg-fishing .fishing-zbtn:active{transform:scale(.95);}
.mg-fishing .fishing-ov{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(3,2,10,.55);opacity:0;pointer-events:none;transition:opacity .35s;touch-action:none;}
.mg-fishing .fishing-ov.on{opacity:1;pointer-events:auto;}
.mg-fishing .fishing-panel{width:100%;max-width:330px;background:rgba(10,7,22,.94);border:1px solid rgba(138,82,212,.6);border-radius:10px;
  padding:16px 16px 12px;color:var(--tx);font-family:var(--dot);box-shadow:0 0 28px rgba(80,60,180,.25),inset 0 0 20px rgba(138,82,212,.08);}
.mg-fishing .fishing-h{font-size:1rem;color:var(--tx-b);text-align:center;letter-spacing:.08em;}
.mg-fishing .fishing-sub{font-family:var(--mono);font-size:.62rem;color:var(--cy);text-align:center;margin:4px 0 10px;letter-spacing:.05em;line-height:1.6;}
.mg-fishing .fishing-step{display:flex;gap:9px;align-items:center;font-size:.72rem;line-height:1.55;margin:8px 0;}
.mg-fishing .fishing-step canvas{flex:0 0 46px;width:46px;height:46px;border-radius:8px;background:rgba(0,232,200,.05);border:1px solid rgba(0,232,200,.25);}
.mg-fishing .fishing-step small{display:block;color:var(--tx-d);font-size:.6rem;}
.mg-fishing .fishing-tap{text-align:center;margin-top:12px;font-size:.72rem;color:var(--tx-b);animation:fishing-blink 2.2s ease-in-out infinite;}
@keyframes fishing-blink{0%,100%{opacity:.45}50%{opacity:1}}
.mg-fishing .fishing-card{position:relative;text-align:center;transform:translateY(10px) scale(.97);transition:transform .45s cubic-bezier(.2,.9,.3,1.2);}
.mg-fishing .fishing-ov.on .fishing-card{transform:none;}
.mg-fishing .fishing-card.rare{border-color:rgba(232,184,48,.85);box-shadow:0 0 30px rgba(232,184,48,.3),inset 0 0 24px rgba(232,184,48,.1);}
.mg-fishing .fishing-card canvas{display:block;margin:2px auto 4px;width:260px;height:130px;max-width:100%;}
.mg-fishing .fishing-tag{position:absolute;left:10px;top:10px;font-family:var(--mono);font-size:.58rem;padding:2px 7px;border-radius:9px;border:1px solid;}
.mg-fishing .fishing-tag.new{color:var(--gn);border-color:rgba(68,238,136,.6);background:rgba(68,238,136,.08);}
.mg-fishing .fishing-tag.rare{left:auto;right:10px;color:var(--gd);border-color:rgba(232,184,48,.65);background:rgba(232,184,48,.08);}
.mg-fishing .fishing-tag.big{left:auto;right:10px;color:#ff9ab0;border-color:rgba(255,120,150,.6);background:rgba(232,48,85,.08);}
.mg-fishing .fishing-nm{font-size:1.1rem;color:var(--tx-b);letter-spacing:.1em;}
.mg-fishing .fishing-sz{font-family:var(--mono);font-size:.7rem;color:var(--cy);margin:2px 0 8px;}
.mg-fishing .fishing-sz em{font-style:normal;color:var(--gd);margin-left:6px;}
.mg-fishing .fishing-fl{font-family:var(--serif);font-size:.74rem;line-height:1.85;color:var(--tx);text-align:left;padding:8px 4px 0;border-top:1px dashed rgba(138,82,212,.35);}
.mg-fishing .fishing-zk{max-height:100%;display:flex;flex-direction:column;max-width:400px;}
.mg-fishing .fishing-zgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;overflow-y:auto;padding:2px 2px 4px;margin-top:4px;}
.mg-fishing .fishing-zc{border:1px solid rgba(138,82,212,.3);border-radius:6px;background:rgba(138,82,212,.05);padding:4px 5px 5px;text-align:center;}
.mg-fishing .fishing-zc.got{border-color:rgba(0,232,200,.35);}
.mg-fishing .fishing-zc.r3.got{border-color:rgba(232,184,48,.6);background:rgba(232,184,48,.05);}
.mg-fishing .fishing-zc canvas{display:block;width:100%;height:auto;aspect-ratio:2/1;}
.mg-fishing .fishing-zc .n{font-size:.68rem;color:var(--tx-b);}
.mg-fishing .fishing-zc .d{font-family:var(--mono);font-size:.54rem;color:var(--tx-d);line-height:1.5;}
.mg-fishing .fishing-zclose{margin:10px auto 0;display:block;background:transparent;border:1px solid rgba(138,82,212,.6);color:var(--tx-b);
  font-family:var(--dot);font-size:.72rem;padding:6px 22px;border-radius:14px;cursor:pointer;}
.mg-fishing .fishing-talk{position:absolute;left:8px;right:8px;top:8px;z-index:4;display:flex;gap:10px;align-items:stretch;
  background:linear-gradient(180deg,rgba(14,10,32,.95),rgba(8,6,20,.96));border:1px solid rgba(138,82,212,.65);border-radius:10px;padding:9px 10px;
  box-shadow:0 0 24px rgba(0,0,0,.6),inset 0 0 18px rgba(138,82,212,.1);opacity:0;transform:translateY(-12px);transition:opacity .3s,transform .3s;pointer-events:none;touch-action:none;}
.mg-fishing .fishing-talk.on{opacity:1;transform:none;pointer-events:auto;}
.mg-fishing .fishing-pt{flex:0 0 68px;width:68px;height:68px;border-radius:8px;overflow:hidden;border:1px solid rgba(222,204,248,.35);background:#120d26;}
.mg-fishing .fishing-pt img,.mg-fishing .fishing-pt canvas{width:100%;height:100%;display:block;object-fit:cover;}
.mg-fishing .fishing-tk{flex:1;min-width:0;display:flex;flex-direction:column;}
.mg-fishing .fishing-tn{font-family:var(--dot);font-size:.66rem;color:var(--cy);letter-spacing:.08em;margin-bottom:3px;}
.mg-fishing .fishing-tn.gen{color:var(--gd);}
.mg-fishing .fishing-tt{font-family:var(--serif);font-size:.78rem;line-height:1.75;color:var(--tx-b);min-height:3.5em;}
.mg-fishing .fishing-tnx{align-self:flex-end;font-size:.62rem;color:var(--tx-d);animation:fishing-blink 1.4s ease-in-out infinite;}
`);

registerMinigame({
  id:'fishing', icon:'🎣', name:'夜釣りで頭を空っぽに', genre:'釣り（癒し系）', bgm:'night',
  desc:'壇ノ浦の夜の港で、常連の源さんの隣に6投だけ糸を垂らす。関門橋の灯りと波の音。釣れたものは魚図鑑に残っていく。',
  effect:'精神↑ 疲労↓ 希望↑ 魚図鑑 ／ 疲労-4 約60分',
  help:'長押し→離して投げる／ウキが沈んだらタップ／長押しで枠を右へ',
  start(body,mg){
    const FONT='"DotGothic16", monospace';
    // 難しさ（開始時に読む）：やり取りの光の枠の幅・魚の動きの速さ・枠から外れた時の逃げやすさ
    const DIFF=mgDifficulty();
    mg.el('mg-title').insertAdjacentHTML('beforeend',`<span class="mg-diffb mg-diffb-${DIFF}">${MG_DIFF_NAMES[DIFF]}</span>`);
    const RZW=mgDiff(1.4,1.18,1),RSPD=mgDiff(.72,.86,1),RDECAY=mgDiff(.055,.085,.12),RGRACE=mgDiff(.8,.4,0);
    const CASTS=6;
    const ZONE=['浅場','中層','沖'];
    const TIMES=['宵の口','夜更け','丑三つ時'];
    // zones: 0浅場 1中層 2沖 / t:出る時間帯の下限 / beh:引き方
    const SPECIES=[
      {id:'aji',name:'マアジ',r:1,w:11,min:14,max:28,zones:[1,2],beh:'dart',col:['#4d6f94','#c9d6e2','#f2f5f8'],h:.27,tail:'fork',fin:'soft',eye:.075,scute:true,tint:'rgba(232,206,96,.32)',
        flav:['港の夜の定番。灯りに集まる小魚を追って、群れで回ってくる。','背中の青が、月の光でいちばんきれいに見える魚。']},
      {id:'mebaru',name:'メバル',r:1,w:11,min:13,max:27,zones:[0,1],beh:'calm',col:['#2f2c3c','#6d6a7c','#b4b0bc'],h:.34,tail:'trunc',fin:'spiky',eye:.11,bars:'rgba(16,14,26,.45)',
        flav:['大きな目で月明かりを見上げている。「春告魚」とも呼ばれる。','凪の夜ほどよく浮く。静かにしてたら、向こうから来てくれる。']},
      {id:'kasago',name:'カサゴ',r:1,w:9,min:12,max:25,zones:[0],beh:'sink',col:['#8e2f22','#c0603e','#ecc0a0'],h:.36,tail:'round',fin:'spiky',eye:.085,mottle:'rgba(60,16,12,.5)',
        flav:['岸壁の隙間に住む、根の主。トゲに気をつけて。','ゴツゴツした顔だけど、味は優しいのよ。']},
      {id:'seigo',name:'セイゴ',r:1,w:8,min:22,max:42,zones:[1,2],beh:'dart',col:['#3f4f62','#93a3b4','#e8eef4'],h:.24,tail:'fork',fin:'spiky',eye:.06,
        flav:['スズキの若い頃の名前。出世魚は、育つたびに名前が変わる。','この子もいつか、名前が変わるくらい大きくなる。']},
      {id:'fugu',name:'クサフグ',r:1,w:9,min:9,max:18,zones:[0,1],beh:'calm',col:['#3f5a30','#7b8f58','#f6f3e6'],h:.54,tail:'round',fin:'soft',eye:.1,dots:'rgba(238,238,214,.75)',
        flav:['下関では「ふく」と呼ぶ。福に通じるから、らしい。','怒るとぷくっと膨らむ。……その気持ち、ちょっとわかる。']},
      {id:'haze',name:'マハゼ',r:1,w:8,min:7,max:16,zones:[0],beh:'calm',col:['#7a6a4a','#b5a47e','#eee4cc'],h:.21,tail:'round',fin:'soft',eye:.085,dots:'rgba(70,52,32,.55)',
        flav:['足元の砂地でちょこんと待っている。子どもでも釣れる魚。','「今度あの子も連れてこよう」と思った。']},
      {id:'mejina',name:'メジナ',r:1,w:7,min:18,max:36,zones:[1,2],beh:'sink',col:['#18222f','#33465a','#6c7e90'],h:.43,tail:'fork',fin:'soft',eye:.07,
        flav:['磯の黒い魚。引きが強くて、手のひらが熱くなる。','夜の海と同じ色をしている。']},
      {id:'tachiuo',name:'タチウオ',kind:'ribbon',r:2,w:5,min:60,max:105,zones:[2],t:1,beh:'dart',
        flav:['刀みたいに光る、立ったまま泳ぐ魚。月を一本、釣り上げたみたいね。','銀色が手に移りそうなほど、ぴかぴかしている。']},
      {id:'anago',name:'マアナゴ',kind:'eel',r:2,w:5,min:30,max:62,zones:[0,1],t:1,beh:'sink',
        flav:['夜の住人。体の白い点々は「はかり目」と呼ばれる。','にょろりと逃げようとする。……今夜は逃がしてあげましょ。']},
      {id:'glass',name:'シーグラス',kind:'glass',r:2,w:3,min:2,max:5,unit:'径',zones:[0],beh:'item',
        flav:['波に丸められたガラスの欠片。何十年、海を旅してきたのかしら。','角が取れてる。……人も、こんなふうになれたらいいのにね。']},
      {id:'boot',name:'片方の長靴',kind:'boot',r:2,w:2,min:22,max:28,zones:[0,1],beh:'item',
        flav:['……長靴だった。もう片方は、どこの海にいるのかしら。','重かった。期待した分だけ、ちょっと笑えた。']},
      {id:'ika',name:'光るイカ',kind:'squid',r:3,w:3.2,min:12,max:28,zones:[1,2],t:1,beh:'dart',
        flav:['水の中で青く光っていた。星がひとつ、海に落ちてきたみたい。','光で話をする生き物らしい。何を言ってたのかしら。']},
      {id:'heike',name:'平家ガニ',kind:'crab',r:3,w:2.8,min:2,max:4,unit:'甲幅',zones:[0,1],t:1,beh:'sink',
        flav:['甲羅に怒った人の顔。壇ノ浦に沈んだ平家の武者の無念が宿る、と伝わる。','そっと海に返した。……ここは、そういう海ながやちゃ。']},
      {id:'suzu',name:'古い鈴',kind:'bell',r:3,w:3,min:3,max:6,unit:'径',zones:[2],t:2,beh:'item',
        flav:['錆びた鈴。振るとまだ、かすかに鳴る。誰の物だったのかしら。','八百年前、この海峡で鳴っていた音かもしれない。']},
    ];
    const SP=Object.fromEntries(SPECIES.map(s=>[s.id,s]));
    const WHERE=s=>s.zones.map(z=>ZONE[z]).join('・')+(s.t?`／${TIMES[s.t]}から`:'');

    // ── 永続データ（魚図鑑・記録） ──
    if(!gs.fishingData||typeof gs.fishingData!=='object')gs.fishingData={};
    const FD=gs.fishingData;
    if(!FD.seen||typeof FD.seen!=='object')FD.seen={};
    if(!FD.grades||typeof FD.grades!=='object')FD.grades={};
    FD.total=FD.total||0;FD.sessions=FD.sessions||0;FD.visits=(FD.visits||0)+1;
    const zCount=()=>SPECIES.filter(s=>FD.seen[s.id]).length;
    const GRADE_ORDER=['C','B','A','S'];
    // 解禁条件のある珍品
    function locked(s){
      if(s.id==='suzu')return FD.visits<2;              // 二度目の夜から
      if(s.id==='heike')return !(WEATHER==='mist'||zCount()>=4);
      return false;
    }
    const LOCK_HINT={suzu:'二度目の夜から。丑三つ時の沖に……',heike:'霧の夜か、図鑑が4種を超えたら',ika:'夜更けの中層〜沖で、青く光る何か'};

    // ── 今夜の天気（来るたびに変わる）と月齢（日付で決まる） ──
    function mkRng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
    const seed0=((gs.day||1)*7919+FD.visits*104729)>>>0;
    const wr=mkRng(seed0)();
    const WEATHER=wr<.5?'clear':wr<.78?'rain':'mist';
    const WNAME={clear:'晴れ・凪',rain:'小雨',mist:'朧月'}[WEATHER];
    const moonAge=(((gs.day||1)+11)%29.5);
    const moonPhase=moonAge/29.5; // 0新月 .5満月
    const MOON_NAME=moonAge<2||moonAge>27.5?'新月前後':moonAge<6?'三日月':moonAge<9?'上弦':moonAge<13?'十三夜':moonAge<16.5?'満月':moonAge<21?'寝待月':moonAge<24?'下弦':'有明月';
    const TIDE=['大潮','中潮','小潮','長潮','若潮'][Math.floor(moonAge/3)%5];

    // ── DOM ──
    const cv=document.createElement('canvas');cv.className='fishing-cv';body.appendChild(cv);
    let cx=cv.getContext('2d');
    const zbtn=document.createElement('button');zbtn.className='fishing-zbtn hide';body.appendChild(zbtn);
    const ov=document.createElement('div');ov.className='fishing-ov';body.appendChild(ov);
    const tk=document.createElement('div');tk.className='fishing-talk';
    tk.innerHTML='<div class="fishing-pt"></div><div class="fishing-tk"><div class="fishing-tn"></div><div class="fishing-tt"></div><div class="fishing-tnx">▼</div></div>';
    body.appendChild(tk);
    const tkPt=tk.querySelector('.fishing-pt'),tkName=tk.querySelector('.fishing-tn'),tkText=tk.querySelector('.fishing-tt');
    const updZbtn=()=>{zbtn.innerHTML=`📖 図鑑<small>${zCount()}/${SPECIES.length}</small>`;};
    updZbtn();

    const rnd=(a,b)=>a+Math.random()*(b-a);
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;
    const lerp=(a,b,f)=>a+(b-a)*f;
    const ease=f=>f<.5?2*f*f:1-Math.pow(-2*f+2,2)/2;
    function se(t){try{AU.se(t);}catch(_){}}
    function buzz(ms){try{if(navigator.vibrate)navigator.vibrate(ms);}catch(_){}}

    // ── 効果音（Web Audioで合成。AUDIO_SET.se に追従、0なら無音） ──
    const SFX={
      ctx:null,nb:null,amb:null,
      vol(){return typeof AUDIO_SET==='object'?clamp(+AUDIO_SET.se||0,0,1):0;},
      ok(){if(this.vol()<=0)return false;try{if(!AU.ctx&&AU.init)AU.init();}catch(_){}this.ctx=AU.ctx||null;
        if(this.ctx&&this.ctx.state==='suspended'){try{this.ctx.resume();}catch(_){}}return !!this.ctx;},
      buf(){if(!this.nb){const c=this.ctx,n=Math.floor(c.sampleRate*1.6),b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;this.nb=b;}return this.nb;},
      nz(dur,f0,f1,q,g,delay){if(!this.ok())return;try{const c=this.ctx,t=c.currentTime+(delay||0),v=g*this.vol();
        const s=c.createBufferSource();s.buffer=this.buf();const f=c.createBiquadFilter();f.type='bandpass';f.Q.value=q;
        f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+dur);
        const gn=c.createGain();gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+.015);gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
        s.connect(f);f.connect(gn);gn.connect(c.destination);s.start(t,Math.random()*.8);s.stop(t+dur+.05);}catch(_){}},
      tone(f0,f1,dur,g,type,delay){if(!this.ok())return;try{const c=this.ctx,t=c.currentTime+(delay||0),v=g*this.vol();
        const o=c.createOscillator(),gn=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+dur);
        gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+.01);gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
        o.connect(gn);gn.connect(c.destination);o.start(t);o.stop(t+dur+.05);}catch(_){}},
      splash(big){this.nz(big?.55:.32,2600,280,.7,big?.2:.12);this.tone(240,80,.16,.05);},
      plop(){this.tone(540,170,.11,.07);this.nz(.12,1900,700,1.4,.05);},
      nibble(){this.tone(700,420,.06,.04);},
      click(){this.tone(2800,2300,.016,.018,'square');},
      whoosh(){this.nz(.42,280,2800,1.6,.1);},
      chime(){[988,1480,1976].forEach((f,i)=>this.tone(f,f*.998,1.6,.05/(i+1),'sine',i*.07));},
      bell(){[1320,1980].forEach((f,i)=>this.tone(f,f,2.2,.035,'sine',i*.25));},
      stamp(){this.tone(110,55,.25,.12,'triangle');this.nz(.2,600,200,1,.08);},
      ambStart(){if(this.amb||!this.ok())return;try{const c=this.ctx;
        const s=c.createBufferSource();s.buffer=this.buf();s.loop=true;
        const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=420;
        const g=c.createGain();g.gain.value=0;const lfo=c.createOscillator();lfo.frequency.value=.085;const lg=c.createGain();lg.gain.value=0;
        lfo.connect(lg);lg.connect(g.gain);s.connect(f);f.connect(g);g.connect(c.destination);s.start();lfo.start();
        this.amb={s,g,lg,lfo};this.ambSet();}catch(_){this.amb=null;}},
      ambSet(){if(!this.amb)return;const v=this.vol();try{const t=this.ctx.currentTime;this.amb.g.gain.setTargetAtTime(.026*v,t,.6);this.amb.lg.gain.setTargetAtTime(.016*v,t,.6);}catch(_){}},
      ambStop(){const a=this.amb;this.amb=null;if(!a)return;try{const t=this.ctx.currentTime;a.g.gain.cancelScheduledValues(t);a.g.gain.setTargetAtTime(0,t,.15);a.lg.gain.setTargetAtTime(0,t,.15);
        setTimeout(()=>{try{a.s.stop();a.lfo.stop();a.g.disconnect();}catch(_){}},900);}catch(_){}},
    };

    // ── 画面サイズ・事前描画 ──
    let W=0,H=0,dpr=1,HZ=0,PY=0,U=1,M=28; // HZ=水平線, PY=岸壁の上端, U=キャラの縮尺, M=視差の余白
    let lySky=null,lyFar=null,lyWater=null,lyMid=null,lyPier=null,lyVig=null,genPortrait=null;
    const glow={};
    let townRefl=[],stars=[];
    const BR={},LH={},RL={},HERO={},GEN={},PROP={};
    const mkCanvas=(w,h,d)=>{const r=d||dpr;const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*r));c.height=Math.max(1,Math.ceil(h*r));const g=c.getContext('2d');g.setTransform(r,0,0,r,0,0);return [c,g];};
    function makeGlow(col,r){
      const [c,g]=mkCanvas(r*2,r*2,1);
      const gr=g.createRadialGradient(r,r,0,r,r,r);
      gr.addColorStop(0,`rgba(${col},1)`);gr.addColorStop(.22,`rgba(${col},.42)`);gr.addColorStop(.55,`rgba(${col},.1)`);gr.addColorStop(1,`rgba(${col},0)`);
      g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return c;
    }
    function gl(img,x,y,r,a){if(a<=0)return;cx.globalAlpha=Math.min(1,a);cx.drawImage(img,x-r,y-r,r*2,r*2);}
    const depthAt=y=>clamp((y-HZ)/(PY-HZ),0,1);
    const scaleAt=y=>.28+.72*Math.pow(depthAt(y),1.15);
    const zoneOf=y=>{const d=depthAt(y);return d>.58?0:d>.3?1:2;};

    function drawMoon(g,x,y,r,ph,bright){
      // 地球照のうっすらした円
      g.fillStyle=`rgba(60,56,96,${.5*bright})`;g.beginPath();g.arc(x,y,r,0,7);g.fill();
      const k=Math.cos(ph*Math.PI*2); // 1=新月 -1=満月
      const waxing=ph<.5;
      g.save();g.translate(x,y);if(!waxing)g.scale(-1,1);
      g.beginPath();
      g.arc(0,0,r,-Math.PI/2,Math.PI/2,false);           // 光っている側の半円
      const rx=Math.max(.01,r*Math.abs(k));
      if(k<0)g.ellipse(0,0,rx,r,0,Math.PI/2,Math.PI*1.5,false); // 満ちている：反対側へふくらむ
      else g.ellipse(0,0,rx,r,0,Math.PI/2,-Math.PI/2,true);       // 欠けている：内側へ
      g.closePath();
      const mg2=g.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);
      mg2.addColorStop(0,`rgba(255,250,232,${bright})`);mg2.addColorStop(1,`rgba(218,210,238,${bright*.9})`);
      g.fillStyle=mg2;g.fill();
      g.clip();
      g.fillStyle=`rgba(150,140,180,${.22*bright})`;
      [[-.3,-.2,.32],[.25,.1,.24],[-.05,.38,.2],[.35,-.35,.14]].forEach(([dx,dy,s])=>{g.beginPath();g.arc(dx*r,dy*r,s*r,0,7);g.fill();});
      g.restore();
    }

    function buildLayers(){
      const R=mkRng(seed0+99);
      const rr=(a,b)=>a+R()*(b-a);
      HZ=Math.round(H*.4);PY=Math.round(H*.85);
      U=clamp(Math.min(W/360,H/700),.75,1.4);
      const WW=W+M*2; // 左右に余白
      const moon={x:W*.76+M,y:H*.12,r:Math.max(13,Math.min(W,H)*.042)};
      const lit=.15+.85*Math.sin(Math.PI*moonPhase); // 月の明るさ
      BR.moon={x:W*.76,y:H*.12,r:moon.r};BR.lit=lit;
      // ── 空（上下に余白を持たせて、パンしても途切れないように） ──
      const SKT=Math.round(H*.2); // 上の余白
      let g;[lySky,g]=mkCanvas(WW,HZ+SKT+H*.5);
      g.translate(0,SKT);
      const sky=g.createLinearGradient(0,-SKT,0,HZ);
      if(WEATHER==='rain'){sky.addColorStop(0,'#05040c');sky.addColorStop(.6,'#0d0b1e');sky.addColorStop(1,'#1a1530');}
      else if(WEATHER==='mist'){sky.addColorStop(0,'#060512');sky.addColorStop(.55,'#12102a');sky.addColorStop(1,'#272042');}
      else{sky.addColorStop(0,'#020209');sky.addColorStop(.5,'#0a0a24');sky.addColorStop(1,'#1d1a40');}
      g.fillStyle=sky;g.fillRect(0,-SKT,WW,HZ+SKT);
      g.fillStyle=WEATHER==='mist'?'#272042':WEATHER==='rain'?'#1a1530':'#1d1a40';g.fillRect(0,HZ,WW,H*.5);
      lySky._top=SKT;
      if(WEATHER==='clear'){
        g.save();g.translate(WW*.12,HZ*.95);g.rotate(-.85);
        const mw=g.createLinearGradient(0,-50,0,50);mw.addColorStop(0,'rgba(120,110,200,0)');mw.addColorStop(.5,'rgba(130,120,210,.08)');mw.addColorStop(1,'rgba(120,110,200,0)');
        g.fillStyle=mw;g.fillRect(-20,-50,H*1.4,100);g.restore();
      }
      stars=[];
      const nStar=(WEATHER==='clear'?190:WEATHER==='mist'?70:26)*(1.2-lit*.4);
      for(let i=0;i<nStar;i++){
        const x=rr(0,WW),y=-SKT+Math.pow(R(),1.3)*(HZ+SKT)*.94;
        const d=Math.hypot(x-moon.x,y-moon.y);
        if(d<moon.r*2.2)continue;
        const b=R();
        g.fillStyle=`rgba(${b<.15?'255,226,190':b<.3?'190,215,255':'230,228,255'},${(.18+R()*.55)*(WEATHER==='clear'?1:.6)*clamp(d/(moon.r*6),.25,1)})`;
        const s=R()<.08?1.6:1;g.fillRect(x,y,s,s);
        if(i%5===0&&b>.5&&y<HZ-H*.1)stars.push({x:x-M,y,ph:R()*6.28,sp:rr(1,3)});
      }
      const halo=(WEATHER==='mist'?moon.r*9:WEATHER==='rain'?moon.r*7:moon.r*6)*(.5+lit*.5);
      let rg=g.createRadialGradient(moon.x,moon.y,moon.r*.8,moon.x,moon.y,halo);
      rg.addColorStop(0,`rgba(220,214,255,${(WEATHER==='rain'?.16:.22)*lit})`);rg.addColorStop(.25,`rgba(160,150,230,${.08*lit})`);rg.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=rg;g.fillRect(0,-SKT,WW,HZ+SKT);
      if(WEATHER==='mist'){g.strokeStyle=`rgba(200,190,255,${.07*lit})`;g.lineWidth=moon.r*.9;g.beginPath();g.arc(moon.x,moon.y,moon.r*3.4,0,7);g.stroke();}
      drawMoon(g,moon.x,moon.y,moon.r,moonPhase,WEATHER==='rain'?.55:WEATHER==='mist'?.75:1);
      const nCloud=WEATHER==='clear'?4:WEATHER==='mist'?10:13;
      for(let i=0;i<nCloud;i++){
        const y=rr(-SKT*.5,HZ*.75),x=rr(-60,WW+60),w=rr(80,210),h=rr(14,34);
        const cg=g.createRadialGradient(x,y,0,x,y,w*.6);
        const nearMoon=Math.hypot(x-moon.x,y-moon.y)<w;
        cg.addColorStop(0,nearMoon?`rgba(90,80,140,${.15+.15*lit})`:WEATHER==='rain'?'rgba(26,22,44,.65)':'rgba(40,32,72,.35)');cg.addColorStop(1,'rgba(0,0,0,0)');
        g.save();g.translate(x,y);g.scale(1,h/w);g.translate(-x,-y);g.fillStyle=cg;g.fillRect(x-w,y-w,w*2,w*2);g.restore();
      }

      // ── 遠景：陸・街・関門橋（下に水の帯を持つ） ──
      [lyFar,g]=mkCanvas(WW,HZ+H*.16);
      const hillL=x=>HZ-H*.05*Math.pow(clamp(1-(x-M)/(W*.24),0,1),.7)-H*.006;
      const hillR=x=>{const f=clamp((x-M-W*.5)/(W*.5),0,1);return HZ-H*.018-H*.075*Math.sin(f*Math.PI*.8)*(.7+.3*Math.sin(f*9));};
      const wb=g.createLinearGradient(0,HZ,0,HZ+H*.16);wb.addColorStop(0,WEATHER==='mist'?'#1d1838':'#15112e');wb.addColorStop(1,'#0d0a22');
      g.fillStyle=wb;g.fillRect(0,HZ,WW,H*.16);
      g.fillStyle='#0b0918';
      g.beginPath();g.moveTo(0,HZ+2);for(let x=0;x<=M+W*.26;x+=4)g.lineTo(x,x<M?hillL(M):hillL(x));g.lineTo(M+W*.26,HZ+2);g.fill();
      g.fillStyle='#0d0a1c';
      g.beginPath();g.moveTo(M+W*.5,HZ+2);for(let x=M+W*.5;x<=WW+4;x+=4)g.lineTo(x,hillR(x));g.lineTo(WW,HZ+2);g.fill();
      // 稜線のかすかな月明かり
      g.strokeStyle=`rgba(150,140,220,${.08+.1*lit})`;g.lineWidth=1;
      g.beginPath();for(let x=M+W*.5;x<=WW;x+=4){x===M+W*.5?g.moveTo(x,hillR(x)):g.lineTo(x,hillR(x));}g.stroke();
      const hx=M+W*.86,hy=hillR(hx);
      townRefl=[];
      const town=(x0,x1,topF)=>{
        for(let i=0;i<(x1-x0)/3.2;i++){
          const x=rr(x0,x1),top=topF(x),y=rr(Math.min(HZ-1,top+2),HZ-1);
          const c=R()<.7?'255,206,140':R()<.5?'200,225,255':'255,170,200';
          const a=rr(.25,.85);
          g.fillStyle=`rgba(${c},${a})`;g.fillRect(x,y,R()<.2?2:1,1);
          if(R()<.16&&y>HZ-H*.02)townRefl.push({x:x-M,c,a:a*.55,len:rr(4,16),ph:R()*6.28,dy:rr(0,3)});
        }
      };
      town(0,M+W*.25,hillL);town(M+W*.5,WW,hillR);
      g.fillStyle='rgba(255,236,200,.8)';g.fillRect(hx-1,hy-3,2,3);
      // 関門橋（吊り橋）
      BR.x0=-W*.04;BR.x1=W*.6;BR.t1=W*.16;BR.t2=W*.46;
      BR.deck=HZ-H*.022;BR.top=HZ-H*.085;
      const cable=x=>{
        if(x<BR.t1){const f=(x-BR.x0)/(BR.t1-BR.x0);return lerp(BR.deck-1,BR.top,Math.pow(f,1.25));}
        if(x>BR.t2){const f=(BR.x1-x)/(BR.x1-BR.t2);return lerp(BR.deck-1,BR.top,Math.pow(f,1.25));}
        const f=(x-BR.t1)/(BR.t2-BR.t1);return BR.top+(BR.deck-3-BR.top)*(1-Math.pow(2*f-1,2));
      };
      g.save();g.translate(M,0);
      g.strokeStyle='rgba(30,26,58,.9)';g.lineWidth=1;
      g.beginPath();for(let x=BR.x0;x<=BR.x1;x+=2){x===BR.x0?g.moveTo(x,cable(x)):g.lineTo(x,cable(x));}g.stroke();
      g.strokeStyle='rgba(40,34,70,.55)';
      for(let x=BR.x0+6;x<BR.x1;x+=6){g.beginPath();g.moveTo(x,cable(x));g.lineTo(x,BR.deck);g.stroke();}
      g.fillStyle='#120f26';g.fillRect(BR.x0,BR.deck,BR.x1-BR.x0,2.5);
      [BR.t1,BR.t2].forEach(tx=>{
        g.fillStyle='#16122c';g.fillRect(tx-2.2,BR.top-2,1.6,HZ-BR.top+2);g.fillRect(tx+.8,BR.top-2,1.6,HZ-BR.top+2);
        g.fillRect(tx-2.2,BR.top+(BR.deck-BR.top)*.35,4.6,1.2);
      });
      BR.lights=[];
      for(let x=BR.x0+3;x<BR.x1;x+=W*.018)BR.lights.push({x,y:cable(x),c:'255,246,226',a:.75});
      for(let x=BR.x0+2;x<BR.x1;x+=W*.012)BR.lights.push({x,y:BR.deck+1,c:'255,196,110',a:.85,refl:true,ph:R()*6.28});
      BR.lights.forEach(l=>{g.fillStyle=`rgba(${l.c},${l.a})`;g.fillRect(l.x-.6,l.y-.6,1.3,1.3);});
      g.restore();
      const mz=g.createLinearGradient(0,HZ-H*.05,0,HZ+6);
      mz.addColorStop(0,'rgba(60,50,110,0)');mz.addColorStop(1,`rgba(70,60,120,${WEATHER==='mist'?.38:WEATHER==='rain'?.25:.16})`);
      g.fillStyle=mz;g.fillRect(0,HZ-H*.05,WW,H*.05+6);

      // ── 海面 ──
      [lyWater,g]=mkCanvas(WW,H-HZ);
      const wg=g.createLinearGradient(0,0,0,H-HZ);
      wg.addColorStop(0,WEATHER==='mist'?'#1d1838':'#15112e');wg.addColorStop(.15,'#0d0a22');wg.addColorStop(.6,'#070616');wg.addColorStop(1,'#04030c');
      g.fillStyle=wg;g.fillRect(0,0,WW,H-HZ);
      for(let i=0;i<90;i++){
        const y=Math.pow(R(),1.8)*(PY-HZ)*.95+3,d=depthAt(HZ+y);
        g.fillStyle=`rgba(120,110,190,${.025+d*.05})`;g.fillRect(rr(-20,WW),y,rr(10,60)*(.3+d),1);
      }
      // ── 中景：防波堤と灯台 ──
      [lyMid,g]=mkCanvas(WW,H*.16);
      const bwL=H*.035,bwR=H*.06;
      RL.x=W*.24;RL.y=HZ+bwL;LH.x=W*.7;LH.y=HZ+bwR;
      g.translate(M,-HZ+H*.06);
      g.fillStyle='#09071a';g.fillRect(-M,HZ+bwL-2,W*.25+M,3);
      g.fillStyle='rgba(120,100,180,.14)';g.fillRect(-M,HZ+bwL-2,W*.25+M,1);
      g.fillStyle='#0b0920';g.fillRect(W*.66,HZ+bwR-3,W*.34+M,4);
      g.fillStyle='rgba(120,100,180,.16)';g.fillRect(W*.66,HZ+bwR-3,W*.34+M,1);
      // テトラポッドの影
      for(let x=W*.67;x<W+M;x+=7){g.fillStyle='#07061a';g.beginPath();g.moveTo(x,HZ+bwR+1);g.lineTo(x+3.5,HZ+bwR-5);g.lineTo(x+7,HZ+bwR+1);g.fill();}
      const rh=H*.032;RL.top=HZ+bwL-rh;
      g.fillStyle='#6a1e2c';g.beginPath();g.moveTo(RL.x-3,HZ+bwL-1);g.lineTo(RL.x+3,HZ+bwL-1);g.lineTo(RL.x+2,HZ+bwL-rh);g.lineTo(RL.x-2,HZ+bwL-rh);g.fill();
      g.fillStyle='rgba(255,180,190,.25)';g.fillRect(RL.x-2.5,HZ+bwL-rh*.9,1,rh*.8);
      g.fillStyle='#2a0e16';g.fillRect(RL.x-2.5,HZ+bwL-rh-3,5,3);
      const lh=H*.075;LH.top=HZ+bwR-lh;
      const tg=g.createLinearGradient(LH.x-5,0,LH.x+5,0);tg.addColorStop(0,'#8c88a8');tg.addColorStop(.45,'#d8d4ec');tg.addColorStop(1,'#5a5674');
      g.fillStyle=tg;g.beginPath();g.moveTo(LH.x-5,HZ+bwR-2);g.lineTo(LH.x+5,HZ+bwR-2);g.lineTo(LH.x+3.2,HZ+bwR-lh);g.lineTo(LH.x-3.2,HZ+bwR-lh);g.fill();
      g.fillStyle='rgba(60,56,90,.5)';for(let i=1;i<4;i++)g.fillRect(LH.x-4.6+i*.4,HZ+bwR-lh*i/4,9.2-i*.8,1);
      g.fillStyle='#3a3654';g.fillRect(LH.x-4.5,HZ+bwR-lh-1,9,2);
      g.fillStyle='#1c1a30';g.fillRect(LH.x-3,HZ+bwR-lh-7,6,6);
      g.fillStyle='#2a2640';g.beginPath();g.moveTo(LH.x-3.8,HZ+bwR-lh-7);g.lineTo(LH.x+3.8,HZ+bwR-lh-7);g.lineTo(LH.x,HZ+bwR-lh-11);g.fill();
      LH.lamp=LH.top-4;lyMid._y=HZ-H*.06;

      // ── 岸壁（手前） ──
      [lyPier,g]=mkCanvas(WW,H-PY+2);
      g.translate(M,0);
      const ph=H-PY;
      const pg=g.createLinearGradient(0,0,0,ph);pg.addColorStop(0,'#211b3a');pg.addColorStop(.1,'#17122c');pg.addColorStop(1,'#0a0816');
      g.fillStyle=pg;g.fillRect(-M,0,WW,ph+2);
      g.fillStyle='rgba(200,180,250,.32)';g.fillRect(-M,0,WW,1);
      g.fillStyle='rgba(0,0,0,.45)';g.fillRect(-M,2,WW,2);
      for(let x=rr(20,60)-M;x<W+M;x+=rr(70,120)){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,4,1,ph);}
      for(let i=0;i<70;i++){g.fillStyle=`rgba(${R()<.5?'0,0,0':'120,110,170'},${rr(.03,.08)})`;g.fillRect(rr(-M,W+M),rr(5,ph),rr(2,14),rr(1,3));}
      // 雨の夜は濡れた路面の反射
      if(WEATHER==='rain'){for(let i=0;i<20;i++){g.fillStyle=`rgba(${R()<.5?'255,190,120':'150,140,230'},.08)`;g.fillRect(rr(0,W),rr(ph*.3,ph),rr(20,50),1);}}
      // 係船柱とロープ
      const bx=W*.36,by=ph*.3;
      g.fillStyle='#0c0a18';g.beginPath();g.ellipse(bx,by+10,14*U,5*U,0,0,7);g.fill();
      g.fillStyle='#1e1a30';g.fillRect(bx-9*U,by-6*U,18*U,16*U);
      g.fillStyle='#2b2643';g.beginPath();g.ellipse(bx,by-6*U,12*U,4.5*U,0,0,7);g.fill();
      g.fillStyle='rgba(200,180,255,.15)';g.fillRect(bx-8*U,by-5*U,3*U,14*U);
      g.strokeStyle='rgba(150,130,100,.5)';g.lineWidth=1.5;g.beginPath();g.moveTo(bx+8*U,by);g.quadraticCurveTo(bx+30*U,by+16,bx+24*U,-1);g.stroke();
      // ランタンの灯りだまり
      PROP.lantern={x:W*.5,y:PY+ph*.42};
      const lx=W*.5,ly=ph*.42;
      const lgr=g.createRadialGradient(lx,ly,0,lx,ly,W*.3);lgr.addColorStop(0,'rgba(255,190,110,.2)');lgr.addColorStop(1,'rgba(255,190,110,0)');
      g.fillStyle=lgr;g.fillRect(-M,0,WW,ph);
      // バケツ（だんのうらの）
      const kx=W*.6,ky=ph*.36;PROP.bucket={x:kx,y:PY+ky};
      g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(kx,ky+20*U,17*U,5*U,0,0,7);g.fill();
      const bk=g.createLinearGradient(kx-15*U,0,kx+15*U,0);bk.addColorStop(0,'#1a4a5e');bk.addColorStop(.6,'#2c7088');bk.addColorStop(1,'#163a4a');
      g.fillStyle=bk;g.beginPath();g.moveTo(kx-15*U,ky);g.lineTo(kx+15*U,ky);g.lineTo(kx+12*U,ky+20*U);g.lineTo(kx-12*U,ky+20*U);g.fill();
      g.fillStyle='#0d2430';g.beginPath();g.ellipse(kx,ky,15*U,4.5*U,0,0,7);g.fill();
      g.strokeStyle='rgba(180,200,210,.5)';g.lineWidth=1;g.beginPath();g.ellipse(kx,ky-2*U,14*U,10*U,0,Math.PI,0);g.stroke();
      // 缶コーヒー
      const cxp=W*.68,cyp=ph*.62;
      g.fillStyle='#6a3b22';g.fillRect(cxp-3.5*U,cyp-10*U,7*U,11*U);g.fillStyle='#d8b070';g.fillRect(cxp-3.5*U,cyp-6*U,7*U,2.5*U);
      g.fillStyle='#a8a0b8';g.beginPath();g.ellipse(cxp,cyp-10*U,3.5*U,1.3*U,0,0,7);g.fill();
      // ランタン本体
      g.fillStyle='#2a2238';g.fillRect(lx-5*U,ly-4*U,10*U,12*U);
      g.fillStyle='#ffd9a0';g.fillRect(lx-3.5*U,ly-2*U,7*U,8*U);
      g.fillStyle='#2a2238';g.fillRect(lx-6*U,ly-6*U,12*U,2.5*U);g.fillRect(lx-6*U,ly+7*U,12*U,2*U);
      g.strokeStyle='#4a405e';g.beginPath();g.arc(lx,ly-7*U,3*U,Math.PI,0);g.stroke();
      // 源さんの道具（クーラーボックスと水筒）
      const ox=W*.14;
      g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(ox+30*U,ph*.62+8*U,16*U,4*U,0,0,7);g.fill();
      g.fillStyle='#5a6a74';g.fillRect(ox+22*U,ph*.62-14*U,7*U,22*U);g.fillStyle='#8a9aa4';g.fillRect(ox+22*U,ph*.62-16*U,7*U,3*U);
      PROP.thermos={x:ox+25.5*U,y:PY+ph*.62-17*U};

      // 人物の基準位置
      HERO.x=W*.8;HERO.y=PY+ph*.5;
      GEN.x=W*.14;GEN.y=PY+ph*.52;
      GEN.tip={x:W*.3,y:H*.63};GEN.float={x:W*.27,y:HZ+(PY-HZ)*.52};

      // 周辺減光
      [lyVig,g]=mkCanvas(W,H);
      const vg=g.createRadialGradient(W/2,H*.5,Math.min(W,H)*.38,W/2,H*.5,Math.max(W,H)*.78);
      vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(2,1,8,.6)');
      g.fillStyle=vg;g.fillRect(0,0,W,H);
    }
    // 源さんの顔（会話用）
    function buildGenPortrait(){
      const [c,g]=mkCanvas(68,68,2);
      const bg=g.createLinearGradient(0,0,0,68);bg.addColorStop(0,'#1c1636');bg.addColorStop(1,'#0c0a1c');g.fillStyle=bg;g.fillRect(0,0,68,68);
      g.fillStyle='rgba(255,190,110,.18)';g.beginPath();g.arc(52,56,30,0,7);g.fill();
      // 体
      g.fillStyle='#3e4430';g.beginPath();g.moveTo(8,68);g.quadraticCurveTo(12,48,34,46);g.quadraticCurveTo(56,48,60,68);g.fill();
      g.fillStyle='#2a2e20';g.fillRect(30,46,8,22);
      // 顔
      g.fillStyle='#c89870';g.beginPath();g.ellipse(34,34,13,15,0,0,7);g.fill();
      g.fillStyle='#b88660';g.beginPath();g.ellipse(21,35,3,4.5,0,0,7);g.fill();g.beginPath();g.ellipse(47,35,3,4.5,0,0,7);g.fill();
      // 白いひげと眉
      g.fillStyle='#e8e4dc';g.beginPath();g.ellipse(34,45,10,5,0,0,Math.PI);g.fill();
      g.fillRect(25,29,7,2);g.fillRect(36,29,7,2);
      // 目（細め）としわ
      g.strokeStyle='#4a3020';g.lineWidth=1.2;g.beginPath();g.moveTo(26,33);g.quadraticCurveTo(28.5,34.5,31,33);g.moveTo(37,33);g.quadraticCurveTo(39.5,34.5,42,33);g.stroke();
      g.strokeStyle='rgba(90,60,40,.5)';g.lineWidth=.8;g.beginPath();g.moveTo(27,38);g.lineTo(29,40);g.moveTo(41,38);g.lineTo(39,40);g.moveTo(28,25);g.lineTo(40,25);g.stroke();
      g.fillStyle='#a87050';g.beginPath();g.ellipse(34,38,2.4,3,0,0,7);g.fill();
      g.strokeStyle='#6a4030';g.beginPath();g.moveTo(31,43);g.quadraticCurveTo(34,44.5,37,43);g.stroke();
      // 帽子
      g.fillStyle='#1e2a4a';g.beginPath();g.ellipse(34,22,15,9,0,Math.PI,0);g.fill();g.fillRect(19,21,30,4);
      g.fillStyle='#16203a';g.beginPath();g.ellipse(26,25,13,3,-.08,0,7);g.fill();
      g.fillStyle='#e8b830';g.fillRect(31,15,6,3);
      return c;
    }
    function resize(){
      const w=Math.max(240,body.clientWidth),h=Math.max(320,body.clientHeight);
      const nd=Math.min(2.5,window.devicePixelRatio||1);
      if(w===W&&h===H&&nd===dpr)return;
      const ow=W,oh=H;
      W=w;H=h;dpr=nd;
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      if(!glow.cy){
        glow.cy=makeGlow('90,255,226',32);glow.bl=makeGlow('110,170,255',32);glow.wm=makeGlow('255,200,130',32);
        glow.rd=makeGlow('255,80,70',32);glow.wt=makeGlow('255,250,235',32);glow.gn=makeGlow('140,255,170',32);
      }
      if(!genPortrait)genPortrait=buildGenPortrait();
      buildLayers();
      if(ow&&oh){const fx=W/ow,fy=H/oh;fl.x*=fx;fl.y*=fy;fl.tx*=fx;fl.ty*=fy;fl.sx*=fx;fl.sy*=fy;}
      plank.forEach(p=>{if(!ow){p.x=rnd(0,W);p.y=rnd(HZ+H*.05,PY-4);}else{p.x*=W/ow;p.y=clamp(p.y*H/oh,HZ+4,PY-4);}});
      drops.forEach(d=>{d.x=rnd(0,W);d.y=rnd(-H,H);});
    }
    // ── 生き物の絵 ──
    function drawCreature(g,s,L,t,inWater){
      const k=s.kind||'fish';
      if(k==='fish')return drawFish(g,s,L,t);
      if(k==='ribbon')return drawRibbon(g,L,t);
      if(k==='eel')return drawEel(g,L,t);
      if(k==='squid')return drawSquid(g,L,t);
      if(k==='crab')return drawCrab(g,L);
      if(k==='bell')return drawBell(g,L);
      if(k==='glass')return drawGlass(g,L);
      if(k==='boot')return drawBoot(g,L);
    }
    function drawFish(g,s,L,t){
      const H=L*s.h,hh=H/2;
      const [c0,c1,c2]=s.col;
      const topY=x=>{const f=(x-L*.02)/(L*.5);return -hh*.96*(1-f*f*.85);};
      const botY=x=>{const f=(x+L*.02)/(L*.48);return hh*.9*(1-f*f*.8);};
      g.lineJoin='round';
      // 尾びれ
      g.fillStyle=c0;g.globalAlpha=.92;
      g.beginPath();
      if(s.tail==='fork'){g.moveTo(-L*.35,-hh*.14);g.quadraticCurveTo(-L*.43,-hh*.5,-L*.52,-hh*1.0);g.quadraticCurveTo(-L*.45,0,-L*.52,hh*1.0);g.quadraticCurveTo(-L*.43,hh*.5,-L*.35,hh*.14);}
      else if(s.tail==='trunc'){g.moveTo(-L*.35,-hh*.16);g.lineTo(-L*.5,-hh*.72);g.quadraticCurveTo(-L*.52,0,-L*.5,hh*.72);g.lineTo(-L*.35,hh*.16);}
      else{g.moveTo(-L*.35,-hh*.16);g.quadraticCurveTo(-L*.55,-hh*.8,-L*.53,0);g.quadraticCurveTo(-L*.55,hh*.8,-L*.35,hh*.16);}
      g.closePath();g.fill();
      // 尾のすじ
      g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=.6;
      for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(-L*.37,i*hh*.04);g.lineTo(-L*.5,i*hh*.25);g.stroke();}
      // 背びれ・しりびれ
      g.fillStyle=c0;
      const dorsal=(x0,x1,hgt,spiky)=>{
        g.beginPath();g.moveTo(x0,topY(x0)+2);
        const n=spiky?9:4;
        for(let i=0;i<=n;i++){const x=lerp(x0,x1,i/n);const hb=hgt*(spiky?(i%2?1:.55):Math.sin(i/n*Math.PI)*.9+.1);g.lineTo(x,topY(x)-hb);}
        g.lineTo(x1,topY(x1)+2);g.closePath();g.fill();
        g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=.6;
        for(let i=0;i<=n;i+=1){const x=lerp(x0,x1,i/n);g.beginPath();g.moveTo(x,topY(x));g.lineTo(x,topY(x)-hgt*.8);g.stroke();}
      };
      g.globalAlpha=.85;
      dorsal(L*.22,-L*.05,hh*.62,s.fin==='spiky');
      dorsal(-L*.05,-L*.3,hh*.42,false);
      g.beginPath();g.moveTo(-L*.06,botY(-L*.06)-2);g.lineTo(-L*.14,botY(-L*.14)+hh*.42);g.lineTo(-L*.3,botY(-L*.3)+hh*.3);g.lineTo(-L*.31,botY(-L*.31)-2);g.closePath();g.fill();
      g.beginPath();g.moveTo(L*.12,botY(L*.12)-2);g.lineTo(L*.06,botY(L*.06)+hh*.38);g.lineTo(L*.02,botY(L*.02)-1);g.closePath();g.fill();
      g.globalAlpha=1;
      // 体
      const body=()=>{g.beginPath();g.moveTo(L*.5,hh*.06);
        g.bezierCurveTo(L*.46,-hh*.7,L*.18,-hh*1.04,-L*.06,-hh*.9);
        g.bezierCurveTo(-L*.24,-hh*.72,-L*.33,-hh*.34,-L*.38,-hh*.16);
        g.lineTo(-L*.38,hh*.16);
        g.bezierCurveTo(-L*.32,hh*.4,-L*.18,hh*.84,0,hh*.88);
        g.bezierCurveTo(L*.22,hh*.92,L*.44,hh*.62,L*.5,hh*.06);g.closePath();};
      body();
      const bg=g.createLinearGradient(0,-hh,0,hh);
      bg.addColorStop(0,c0);bg.addColorStop(.45,c1);bg.addColorStop(.62,c2);bg.addColorStop(1,c2);
      g.fillStyle=bg;g.fill();
      g.save();body();g.clip();
      if(s.tint){g.fillStyle=s.tint;g.fillRect(-L*.4,-hh*.15,L*.9,hh*.22);}
      if(s.bars){g.fillStyle=s.bars;for(let i=0;i<5;i++){const x=L*.18-i*L*.12;g.beginPath();g.ellipse(x,-hh*.3,L*.035,hh*.6,.15,0,7);g.fill();}}
      if(s.mottle){g.fillStyle=s.mottle;const R=mkRng(7);for(let i=0;i<18;i++){g.beginPath();g.ellipse(lerp(-L*.38,L*.4,R()),lerp(-hh,hh*.4,R()),L*lerp(.02,.05,R()),hh*lerp(.08,.2,R()),R()*3,0,7);g.fill();}
        g.fillStyle='rgba(255,230,210,.25)';for(let i=0;i<10;i++){g.beginPath();g.arc(lerp(-L*.35,L*.35,R()),lerp(-hh*.6,hh*.5,R()),L*.008,0,7);g.fill();}}
      if(s.dots){g.fillStyle=s.dots;const R=mkRng(3);for(let i=0;i<26;i++){const x=lerp(-L*.36,L*.4,R()),y=lerp(-hh*.85,hh*.2,R());g.beginPath();g.arc(x,y,L*lerp(.007,.014,R()),0,7);g.fill();}}
      // うろこの質感
      if(s.id!=='fugu'){const sc=Math.max(2.2,L*.028);g.lineWidth=.6;
        for(let row=0,yy=-hh;yy<hh;yy+=sc*.8,row++)for(let xx=-L*.36+(row%2)*sc*.5;xx<L*.3;xx+=sc){
          g.strokeStyle=row%3?'rgba(255,255,255,.07)':'rgba(0,0,0,.1)';g.beginPath();g.arc(xx,yy,sc*.55,-1.2,1.2);g.stroke();}}
      // 腹側の陰
      const ab=g.createLinearGradient(0,hh*.2,0,hh);ab.addColorStop(0,'rgba(0,0,0,0)');ab.addColorStop(1,'rgba(10,8,30,.28)');g.fillStyle=ab;g.fillRect(-L*.4,hh*.2,L*.9,hh);
      // つや
      const sh=g.createLinearGradient(0,-hh,0,0);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(.6,'rgba(255,255,255,.14)');sh.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=sh;g.fillRect(-L*.4,-hh,L*.9,hh);
      g.restore();
      // 側線・ゼイゴ
      g.strokeStyle='rgba(20,20,30,.35)';g.lineWidth=.8;
      g.beginPath();g.moveTo(L*.26,-hh*.32);g.quadraticCurveTo(L*.0,-hh*.38,-L*.36,-hh*.02);g.stroke();
      if(s.scute){g.strokeStyle='rgba(230,236,245,.55)';for(let i=0;i<14;i++){const f=i/13,x=lerp(L*.02,-L*.36,f),y=lerp(-hh*.33,-hh*.02,f);g.beginPath();g.moveTo(x-1.5,y-1.5);g.lineTo(x+1,y);g.lineTo(x-1.5,y+1.5);g.stroke();}}
      // えら・胸びれ
      g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;
      g.beginPath();g.arc(L*.4,-hh*.02,hh*.62,Math.PI*.62,Math.PI*1.32);g.stroke();
      g.fillStyle=c1;g.globalAlpha=.55;
      g.beginPath();g.moveTo(L*.21,hh*.1);g.quadraticCurveTo(L*.08,hh*.05+Math.sin(t*4)*hh*.06,L*.03,hh*.42);g.quadraticCurveTo(L*.13,hh*.4,L*.21,hh*.24);g.fill();
      g.globalAlpha=1;
      // 目
      const ex=L*.36,ey=-hh*.22,er=L*s.eye*.5;
      g.fillStyle='#e8dcae';g.beginPath();g.arc(ex,ey,er,0,7);g.fill();
      g.fillStyle='#0a0810';g.beginPath();g.arc(ex+er*.1,ey,er*.66,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(ex-er*.18,ey-er*.25,er*.22,0,7);g.fill();
      // 口
      g.strokeStyle='rgba(0,0,0,.4)';g.beginPath();g.moveTo(L*.5,hh*.06);g.lineTo(L*.44,hh*.12);g.stroke();
      if(s.fin==='spiky'&&s.id==='kasago'){ // 頭のトゲ
        g.fillStyle=c0;for(let i=0;i<3;i++){const x=L*(.3-i*.05);g.beginPath();g.moveTo(x,topY(x)+1);g.lineTo(x+2,topY(x)-hh*.22);g.lineTo(x+4,topY(x)+1);g.fill();}
      }
    }
    function bandPath(g,L,thick,wave,t,headR){
      const N=36,pts=[];
      for(let i=0;i<=N;i++){const f=i/N,x=lerp(L*.5,-L*.5,f);const y=Math.sin(f*5.2-t*2)*wave*f;const w=thick*(f<.08?lerp(headR,1,f/.08):f>.6?lerp(1,.08,(f-.6)/.4):1);pts.push([x,y,w]);}
      g.beginPath();pts.forEach(([x,y,w],i)=>i?g.lineTo(x,y-w):g.moveTo(x,y-w));
      for(let i=N;i>=0;i--){const [x,y,w]=pts[i];g.lineTo(x,y+w);}g.closePath();
      return pts;
    }
    function drawRibbon(g,L,t){
      const th=L*.04;
      // 背びれ
      g.strokeStyle='rgba(200,215,240,.35)';g.lineWidth=th*.9;
      g.beginPath();for(let i=0;i<=30;i++){const f=.1+i/30*.8,x=lerp(L*.5,-L*.5,f),y=Math.sin(f*5.2-t*2)*L*.035*f-th*1.1;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
      const pts=bandPath(g,L,th,L*.035,t,.6);
      const sg=g.createLinearGradient(0,-th,0,th);sg.addColorStop(0,'#aebcd2');sg.addColorStop(.4,'#ffffff');sg.addColorStop(.6,'#dfe8f4');sg.addColorStop(1,'#8e9cb4');
      g.fillStyle=sg;g.fill();
      g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=.8;g.stroke();
      // 光の粒
      g.fillStyle='rgba(255,255,255,.9)';for(let i=4;i<26;i+=3){const [x,y]=pts[i];g.fillRect(x,y-th*.3,1.5,1);}
      // 顔
      const [hx,hy]=pts[1];
      g.fillStyle='#f4f8ff';g.beginPath();g.moveTo(L*.5,0);g.lineTo(L*.46,-th*.9);g.lineTo(L*.44,th*.4);g.fill();
      g.fillStyle='#e8dcae';g.beginPath();g.arc(hx-L*.03,hy-th*.2,th*.55,0,7);g.fill();
      g.fillStyle='#0a0810';g.beginPath();g.arc(hx-L*.03,hy-th*.2,th*.36,0,7);g.fill();
    }
    function drawEel(g,L,t){
      const th=L*.045;
      g.fillStyle='rgba(110,86,60,.5)';bandPath(g,L,th*1.35,L*.06,t,.9);g.fill();
      const pts=bandPath(g,L,th,L*.06,t,.95);
      const eg=g.createLinearGradient(0,-th,0,th);eg.addColorStop(0,'#4a3624');eg.addColorStop(.5,'#7a5c3c');eg.addColorStop(1,'#e8dcc0');
      g.fillStyle=eg;g.fill();
      g.fillStyle='rgba(250,245,230,.85)';for(let i=3;i<30;i+=2){const [x,y]=pts[i];g.beginPath();g.arc(x,y-th*.05,th*.13,0,7);g.fill();}
      g.fillStyle='rgba(250,245,230,.6)';for(let i=3;i<14;i+=2){const [x,y]=pts[i];g.beginPath();g.arc(x,y-th*.55,th*.09,0,7);g.fill();}
      const [hx,hy]=pts[1];
      g.fillStyle='#2a1c10';g.beginPath();g.arc(hx,hy-th*.35,th*.24,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.8)';g.fillRect(hx-th*.08,hy-th*.48,1.2,1.2);
    }
    function drawSquid(g,L,t){
      // 光
      g.save();g.globalCompositeOperation='lighter';
      const rg=g.createRadialGradient(0,0,0,0,0,L*.6);rg.addColorStop(0,'rgba(80,170,255,.35)');rg.addColorStop(1,'rgba(80,170,255,0)');
      g.fillStyle=rg;g.fillRect(-L*.6,-L*.6,L*1.2,L*1.2);g.restore();
      // 腕
      g.strokeStyle='rgba(200,150,190,.85)';g.lineCap='round';
      for(let i=0;i<8;i++){const a=(i-3.5)*.07;g.lineWidth=L*.018;g.beginPath();g.moveTo(-L*.05,a*L*.3);
        g.quadraticCurveTo(-L*.25,a*L*1.2+Math.sin(t*3+i)*L*.02,-L*.42-(i%3)*L*.02,a*L*1.6+Math.sin(t*3+i)*L*.04);g.stroke();}
      g.lineWidth=L*.012;g.beginPath();g.moveTo(-L*.05,0);g.quadraticCurveTo(-L*.35,L*.05,-L*.52,L*.02);g.stroke();
      // 胴
      g.fillStyle='rgba(220,170,200,.92)';
      g.beginPath();g.moveTo(L*.48,0);g.quadraticCurveTo(L*.36,-L*.13,0,-L*.1);g.quadraticCurveTo(-L*.08,0,0,L*.1);g.quadraticCurveTo(L*.36,L*.13,L*.48,0);g.fill();
      // ひれ
      g.fillStyle='rgba(210,160,200,.75)';
      g.beginPath();g.moveTo(L*.48,0);g.lineTo(L*.32,-L*.17);g.lineTo(L*.24,-L*.07);g.closePath();g.fill();
      g.beginPath();g.moveTo(L*.48,0);g.lineTo(L*.32,L*.17);g.lineTo(L*.24,L*.07);g.closePath();g.fill();
      // 頭
      g.fillStyle='rgba(225,180,205,.95)';g.beginPath();g.ellipse(-L*.04,0,L*.07,L*.07,0,0,7);g.fill();
      g.fillStyle='#16101e';g.beginPath();g.arc(-L*.05,-L*.035,L*.024,0,7);g.fill();
      // 発光点
      g.save();g.globalCompositeOperation='lighter';
      const R=mkRng(5);
      for(let i=0;i<22;i++){const x=lerp(-L*.02,L*.44,R()),y=lerp(-L*.08,L*.08,R())*(1-(x/L));const a=.5+.5*Math.sin(t*3+i);
        g.fillStyle=`rgba(120,200,255,${.35+a*.55})`;g.beginPath();g.arc(x,y,L*.012,0,7);g.fill();}
      for(let i=0;i<8;i++){const a=(i-3.5)*.07;g.fillStyle='rgba(140,220,255,.9)';g.beginPath();g.arc(-L*.42-(i%3)*L*.02,a*L*1.6+Math.sin(t*3+i)*L*.04,L*.014,0,7);g.fill();}
      g.restore();
    }
    function drawCrab(g,L){
      const r=L*.5;
      g.strokeStyle='#6a3a30';g.lineCap='round';
      for(let sd=-1;sd<=1;sd+=2)for(let i=0;i<4;i++){
        const a=sd*(.25+i*.28),x0=Math.cos(a)*r*.7*sd*sd,y0=r*.1+i*r*.06;
        g.lineWidth=r*.09;g.beginPath();g.moveTo(sd*r*.6,y0);g.lineTo(sd*r*(1.05+i*.06),y0-r*.3+i*r*.22);g.lineTo(sd*r*(1.25+i*.05),y0+r*.35+i*r*.12);g.stroke();
      }
      // はさみ
      g.fillStyle='#7a4236';
      for(let sd=-1;sd<=1;sd+=2){g.beginPath();g.ellipse(sd*r*.78,-r*.62,r*.2,r*.14,sd*.6,0,7);g.fill();
        g.lineWidth=r*.08;g.beginPath();g.moveTo(sd*r*.5,-r*.3);g.lineTo(sd*r*.7,-r*.55);g.stroke();}
      // 甲羅
      const cg=g.createRadialGradient(-r*.2,-r*.3,r*.1,0,0,r*.8);cg.addColorStop(0,'#b8735a');cg.addColorStop(1,'#6e3a2c');
      g.fillStyle=cg;g.beginPath();g.moveTo(0,-r*.72);g.bezierCurveTo(r*.62,-r*.7,r*.74,r*.1,r*.4,r*.52);g.quadraticCurveTo(0,r*.7,-r*.4,r*.52);g.bezierCurveTo(-r*.74,r*.1,-r*.62,-r*.7,0,-r*.72);g.fill();
      // 顔のような溝（怒った顔）
      g.strokeStyle='rgba(40,14,10,.75)';g.lineWidth=r*.05;
      g.beginPath();g.moveTo(-r*.42,-r*.32);g.quadraticCurveTo(-r*.2,-r*.12,-r*.06,-r*.2);g.stroke();
      g.beginPath();g.moveTo(r*.42,-r*.32);g.quadraticCurveTo(r*.2,-r*.12,r*.06,-r*.2);g.stroke();
      g.beginPath();g.ellipse(-r*.22,-r*.04,r*.1,r*.07,0,0,7);g.stroke();
      g.beginPath();g.ellipse(r*.22,-r*.04,r*.1,r*.07,0,0,7);g.stroke();
      g.beginPath();g.moveTo(0,-r*.1);g.lineTo(0,r*.12);g.stroke();
      g.beginPath();g.moveTo(-r*.28,r*.32);g.quadraticCurveTo(0,r*.18,r*.28,r*.32);g.stroke();
      g.fillStyle='rgba(255,220,200,.15)';g.beginPath();g.ellipse(-r*.25,-r*.45,r*.18,r*.08,-.3,0,7);g.fill();
      g.fillStyle='#1a0c0a';g.fillRect(-r*.1,-r*.82,r*.06,r*.1);g.fillRect(r*.04,-r*.82,r*.06,r*.1);
    }
    function drawBell(g,L){
      const r=L*.42;
      // 紐
      g.strokeStyle='#b8323a';g.lineWidth=r*.12;g.lineCap='round';
      g.beginPath();g.moveTo(0,-r*1.05);g.quadraticCurveTo(r*.5,-r*1.6,r*1.1,-r*1.2);g.stroke();
      g.beginPath();g.moveTo(r*1.1,-r*1.2);g.lineTo(r*1.25,-r*.8);g.moveTo(r*1.1,-r*1.2);g.lineTo(r*1.4,-r*1.0);g.stroke();
      g.strokeStyle='#6a5a3a';g.lineWidth=r*.14;g.beginPath();g.arc(0,-r*1.0,r*.18,0,7);g.stroke();
      // 本体
      const bg=g.createRadialGradient(-r*.35,-r*.35,r*.1,0,0,r*1.05);bg.addColorStop(0,'#d8c27a');bg.addColorStop(.5,'#8a7a40');bg.addColorStop(1,'#3e3a22');
      g.fillStyle=bg;g.beginPath();g.arc(0,0,r*.92,0,7);g.fill();
      // 緑青
      g.fillStyle='rgba(80,170,140,.45)';const R=mkRng(9);
      for(let i=0;i<9;i++){g.beginPath();g.ellipse(lerp(-r*.6,r*.6,R()),lerp(-r*.5,r*.7,R()),r*lerp(.08,.2,R()),r*lerp(.05,.12,R()),R()*3,0,7);g.fill();}
      g.strokeStyle='rgba(40,34,18,.7)';g.lineWidth=r*.06;g.beginPath();g.arc(0,0,r*.92,Math.PI*.08,Math.PI*.92);g.stroke();
      g.beginPath();g.moveTo(-r*.92,r*.05);g.lineTo(r*.92,r*.05);g.stroke();
      g.fillStyle='#15120a';g.beginPath();g.ellipse(0,r*.48,r*.42,r*.08,0,0,7);g.fill();
      g.beginPath();g.arc(-r*.4,r*.48,r*.1,0,7);g.arc(r*.4,r*.48,r*.1,0,7);g.fill();
      g.fillStyle='rgba(255,250,220,.55)';g.beginPath();g.ellipse(-r*.38,-r*.42,r*.16,r*.08,-.6,0,7);g.fill();
    }
    function drawGlass(g,L){
      const r=L*.36;
      g.save();g.globalCompositeOperation='lighter';
      const rg=g.createRadialGradient(0,0,0,0,0,r*2);rg.addColorStop(0,'rgba(80,220,170,.25)');rg.addColorStop(1,'rgba(80,220,170,0)');g.fillStyle=rg;g.fillRect(-r*2,-r*2,r*4,r*4);g.restore();
      g.beginPath();const pts=[[1,-.1],[.7,-.7],[-.1,-.85],[-.8,-.5],[-.95,.2],[-.4,.75],[.5,.7]];
      pts.forEach(([x,y],i)=>{const n=pts[(i+1)%pts.length];const mx=(x+n[0])/2*r,my=(y+n[1])/2*r;if(!i)g.moveTo(mx,my);else g.quadraticCurveTo(x*r,y*r,mx,my);});
      const [x0,y0]=pts[0];const n0=pts[1];g.quadraticCurveTo(x0*r,y0*r,(x0+n0[0])/2*r,(y0+n0[1])/2*r);g.closePath();
      const gg=g.createLinearGradient(-r,-r,r,r);gg.addColorStop(0,'rgba(170,255,210,.85)');gg.addColorStop(.5,'rgba(60,170,130,.75)');gg.addColorStop(1,'rgba(20,90,80,.85)');
      g.fillStyle=gg;g.fill();g.strokeStyle='rgba(220,255,240,.5)';g.lineWidth=1;g.stroke();
      g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(-r*.35,-r*.35,r*.25,r*.1,-.6,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.18)';const R=mkRng(4);for(let i=0;i<14;i++)g.fillRect(lerp(-r*.6,r*.6,R()),lerp(-r*.5,r*.5,R()),1,1);
    }
    function drawBoot(g,L){
      const r=L*.5;
      const bg=g.createLinearGradient(-r,0,r,0);bg.addColorStop(0,'#1e3a2a');bg.addColorStop(.5,'#2e5a40');bg.addColorStop(1,'#16281e');
      g.fillStyle=bg;
      g.beginPath();g.moveTo(-r*.45,-r*1.0);g.lineTo(r*.2,-r*1.0);g.lineTo(r*.25,r*.25);g.quadraticCurveTo(r*.95,r*.3,r*1.0,r*.65);g.lineTo(r*1.0,r*.85);g.lineTo(-r*.5,r*.85);g.closePath();g.fill();
      g.fillStyle='#0e1a14';g.fillRect(-r*.52,r*.78,r*1.54,r*.14);
      g.fillStyle='#16281e';g.beginPath();g.ellipse(-r*.12,-r*1.0,r*.34,r*.08,0,0,7);g.fill();
      g.fillStyle='rgba(200,255,220,.12)';g.fillRect(-r*.35,-r*.9,r*.1,r*1.5);
      g.fillStyle='rgba(120,180,90,.55)';g.beginPath();g.ellipse(r*.4,r*.5,r*.18,r*.06,.3,0,7);g.fill();
      // しずく
      g.fillStyle='rgba(160,220,255,.7)';[[r*.7,r*1.05],[-r*.2,r*1.1]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,r*.05,0,7);g.fill();});
    }


    // ── 状態 ──
    const plank=[];for(let i=0;i<56;i++)plank.push({x:0,y:0,ph:Math.random()*6.28,sp:rnd(.5,1.6),b:0,vx:rnd(-3,3)});
    const drops=[];if(WEATHER==='rain')for(let i=0;i<75;i++)drops.push({x:0,y:0,l:rnd(7,15),s:rnd(330,480)});
    const rings=[];for(let i=0;i<32;i++)rings.push({x:0,y:0,t:0,max:1,r:10,s:1,a:.5,c:'200,220,255'});
    let rgi=0;
    const parts=[];for(let i=0;i<110;i++)parts.push({x:0,y:0,vx:0,vy:0,life:0,max:1,c:'cy',gy:0});
    let pti=0;
    const fl={x:0,y:0,tx:0,ty:0,sx:0,sy:0,sink:0,sinkT:0,vis:false,castP:0,zone:0};
    const shadow={on:false,a:0,ang:0,r:70,x:0,y:0,dart:0};
    const reel={z:.35,zv:0,f:.5,fv:0,ft:.5,fcd:0,pr:.25,zw:.3,inside:false,grace:0,clickT:0,splT:0};
    let state='black',stT=0,clock=0,paused=false;
    let castsLeft=CASTS,power=0,powDir=1,aim=0,aimStart=0,pressX=0,holding=false,pressBuf=-9;
    let waitT=0,nibbles=[],misses=0,cur=null,timeIdx=0,nightLv=0;
    let tension=0,camX=0,camOff=0,fadeA=1;
    let msg='',msgT=0,msgCol='#bbaedd',banner=null;
    let cardReadyAt=0,ignoreRelease=false,firstReel=true,bucketT=0,lastCatch=null;
    const catches=[];let newSpecies=0,rareCaught=false,bigCaught=false,escapes=0,grade='C',score=0,gradeT=0;
    let bgCache=null,bgG=null,bgKey='';
    let lhAng=Math.random()*6.28,lastHud='',lastTm='',rzT=0,ambT=0,genTwitch=0;
    const keys={l:false,r:false};

    function ring(x,y,r,a,c,max){const o=rings[rgi];rgi=(rgi+1)%rings.length;o.x=x;o.y=y;o.r=r;o.a=a;o.c=c||'200,220,255';o.t=o.max=max||1.6;o.s=scaleAt(y);}
    function splash(x,y,n,spd,col){
      const s=scaleAt(y);
      for(let i=0;i<n;i++){const p=parts[pti];pti=(pti+1)%parts.length;
        const a=-Math.PI/2+rnd(-1.1,1.1),v=spd*s*rnd(.4,1);
        p.x=x;p.y=y;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.max=p.life=rnd(.35,.7);p.c=col||(Math.random()<.5?'cy':'wt');p.gy=y;}
      plank.forEach(p=>{if(Math.hypot(p.x-x,(p.y-y)*2)<90*s)p.b=1;});
    }
    function say(text,col,dur){msg=text;msgCol=col||'#bbaedd';msgT=dur||2.2;}
    function showBanner(main,sub,col){banner={main,sub,col:col||'#deccf8',t:0,dur:2.3};}
    function setState(s){state=s;stT=0;}

    // ── 会話 ──
    const talk={on:false,lines:[],i:0,shown:0,done:null};
    const heroImg=f=>`<img src="assets/img/char_${f}.webp" alt="">`;
    function talkStart(lines,done){
      talk.on=true;talk.lines=lines;talk.i=0;talk.done=done;
      tk.classList.add('on');talkShow();
    }
    function talkShow(){
      const L=talk.lines[talk.i];talk.shown=0;
      if(L.who==='gen'&&typeof mobImgTag==='function'&&mobPortrait('gen')){ // 源さんの顔グラ（main/mobs.js）
        tkPt.innerHTML=mobImgTag('gen',L.face,'radial-gradient(circle at 50% 38%,#4a5a8a,#141228 72%)','transform:scale(1.18);transform-origin:50% 16%;');
        tkName.textContent='源さん（常連の釣り人）';tkName.className='fishing-tn gen';}
      else if(L.who==='gen'){tkPt.innerHTML='';const c=document.createElement('canvas');c.width=genPortrait.width;c.height=genPortrait.height;c.getContext('2d').drawImage(genPortrait,0,0);tkPt.appendChild(c);
        tkName.textContent='源さん（常連の釣り人）';tkName.className='fishing-tn gen';}
      else{tkPt.innerHTML=heroImg(L.face||'normal');tkName.textContent='だんのうら';tkName.className='fishing-tn';}
      tkText.textContent='';
    }
    function talkTap(){
      const L=talk.lines[talk.i];
      if(talk.shown<L.text.length){talk.shown=L.text.length;tkText.textContent=L.text;return;}
      se('btn');
      talk.i++;
      if(talk.i>=talk.lines.length){talk.on=false;tk.classList.remove('on');const d=talk.done;talk.done=null;if(d)d();return;}
      talkShow();
    }
    tk.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(!paused&&talk.on)talkTap();});

    function introLines(){
      const tired=(gs.fatigue||0)>60;
      const L=[];
      if(FD.visits<=1){
        L.push({who:'hero',face:tired?'tired':'normal',text:'配信、終わり。……同接のことは、今は考えたくない。'});
        L.push({who:'hero',face:'normal',text:'あの子は寝たわ。三十分だけ、海の音を聞きに来たの。'});
        L.push({who:'gen',text:'お、見ん顔じゃのう。竿、余っとるけえ使いんさい。'});
        L.push({who:'gen',text:`今夜は${WNAME}、${TIDE}じゃ。力を抜け。焦っとる奴に、魚は寄ってこん。`});
      }else{
        L.push({who:'hero',face:tired?'tired':'normal',text:tired?'工場の機械の音が、まだ耳の奥で鳴っとるわ。':(gs.flame||0)>30?'コメント欄は見ないでおくわ。今夜は海だけ見るの。':'……また来ちゃった。ここ、落ち着くのよね。'});
        L.push({who:'gen',text:`おう、来たか。図鑑は${zCount()}種か。今夜は${WNAME}、月は${MOON_NAME}じゃ。`});
        if(FD.visits===2)L.push({who:'gen',text:'丑三つ時の沖にはの、ときどき妙なもんがかかる。わしは鈴の音を聞いたことがある。'});
        else if(!FD.seen.heike&&WEATHER==='mist')L.push({who:'gen',text:'こういう霧の晩はの……平家の蟹が上がってくる。'});
      }
      return L;
    }
    function endingLines(){
      const L=[],n=catches.length;
      const rare=catches.find(c=>SP[c.id].r===3);
      const happy=grade==='S'||grade==='A';
      if(rare)L.push({who:'gen',text:`……${SP[rare.id].name}か。わしも五十年で二度しか見とらん。`},{who:'hero',face:'happy',text:'この海、まだまだ知らないことばっかりね。'});
      else if(n>=5)L.push({who:'gen',text:'ようけ釣ったのう。腕が上がったわ。'},{who:'hero',face:'happy',text:'……明日のお弁当、ちょっと豪華にしちゃおうかしら。'});
      else if(n>=2)L.push({who:'gen',text:'ぼちぼちじゃな。それでええ。'},{who:'hero',face:'normal',text:'うん。……それでいいのよね。'});
      else L.push({who:'gen',text:'釣れん夜もある。海を見に来た、それで十分じゃ。'},{who:'hero',face:'normal',text:'……なんか、頭が静かになった。'});
      if(newSpecies)L.push({who:'hero',face:happy?'happy':'normal',text:`図鑑、${newSpecies}つ埋まった。……起きたら、あの子に見せてあげよう。`});
      L.push({who:'gen',text:'気ぃつけて帰りんさい。また来いよ。'});
      return L;
    }

    // ── 入力 ──
    function press(x){
      if(paused||mg._ended)return;
      holding=true;
      if(talk.on){talkTap();return;}
      if(state==='title'){startPan();return;}
      if(state==='ready'){setState('charge');power=0;powDir=1;aimStart=aim;pressX=x==null?null:x;se('btn');}
      else if(state==='bite'){hook();}
      else if(state==='wait'||state==='fly'){pressBuf=clock;}
      else if(state==='card'){if(clock>=cardReadyAt)closeCard();}
    }
    function release(){
      if(!holding)return;
      holding=false;
      if(ignoreRelease){ignoreRelease=false;return;}
      if(paused||mg._ended)return;
      if(state==='charge')cast();
    }
    cv.addEventListener('pointerdown',e=>{e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(_){}press(e.clientX);});
    cv.addEventListener('pointermove',e=>{if(state==='charge'&&holding&&pressX!=null){aim=clamp(aimStart+(e.clientX-pressX)/(W*.35),-1,1);}});
    cv.addEventListener('pointerup',e=>{e.preventDefault();release();});
    cv.addEventListener('pointercancel',()=>release());
    cv.addEventListener('contextmenu',e=>e.preventDefault());
    mg.onKey(e=>{
      const k=e.key,dn=e.type==='keydown';
      if(k==='ArrowLeft'||k==='a'||k==='A'){keys.l=dn;e.preventDefault();return;}
      if(k==='ArrowRight'||k==='d'||k==='D'){keys.r=dn;e.preventDefault();return;}
      if(k===' '||k==='Enter'){
        e.preventDefault();
        if(dn){if(e.repeat)return;
          if(paused){closeZukan();return;}
          if(state==='howto'){startPlay();return;}
          press(null);}
        else release();
      }else if(dn&&(k==='z'||k==='Z')&&!e.repeat){paused?closeZukan():openZukan();}
    });

    // ── 進行 ──
    function startPan(){
      if(state!=='title')return;
      SFX.ambStart();se('decide');
      setState('pan');
    }
    function startStory(){
      setState('story');
      talkStart(introLines(),()=>openHowto());
    }
    function rodGeom(){
      const t=clock;
      let gx=HERO.x-24*U,gy=HERO.y-50*U;
      const tx0=W*.5,ty0=H*.56;
      const Lr=Math.hypot(tx0-gx,ty0-gy);
      let a=Math.atan2(ty0-gy,tx0-gx),bend=.06;
      if(state==='charge'){a+=power*.55;gy-=power*10*U;gx+=power*5*U;bend=.04+power*.06;}
      else if(state==='fly'){const f=Math.min(1,stT/.45);a-=Math.sin(f*Math.PI)*.32;bend=.12*Math.sin(f*Math.PI);}
      else if(state==='reel'){a-=.05+tension*.2+(Math.abs(reel.fv)>.6?Math.sin(t*26)*.015:0);bend=.1+tension*.32;}
      else if(state==='bite'){a-=.04;}
      else if(state==='card'){a+=.3;bend=.16;}
      a+=Math.sin(t*.9)*.008;
      return {gx,gy,a,bend,L:Lr,tx:gx+Math.cos(a)*Lr,ty:gy+Math.sin(a)*Lr};
    }
    function cast(){
      timeIdx=Math.min(2,Math.floor((CASTS-castsLeft)/2));
      castsLeft--;
      const p=power;
      const d=lerp(.8,.08,p);
      const rg=rodGeom();
      fl.sx=rg.tx;fl.sy=rg.ty;
      fl.ty=HZ+(PY-HZ)*d+rnd(-3,3);
      fl.tx=clamp(W*.6+aim*W*.26+rnd(-6,6),W*.32,W*.9);
      fl.vis=true;fl.sink=0;fl.castP=p;fl.zone=zoneOf(fl.ty);
      setState('fly');se('btn');SFX.whoosh();
    }
    function landed(){
      fl.x=fl.tx;fl.y=fl.ty;
      splash(fl.x,fl.y,10,90);ring(fl.x,fl.y,4,.6,'200,230,255',1.8);ring(fl.x,fl.y,2,.4,'120,255,230',1.3);
      SFX.plop();se('notif');
      // ここで何が寄ってくるかが決まる（影の大きさで分かる）
      const s=pickSpecies();
      const f=clamp(Math.pow(Math.random(),1.35)*(.78+fl.castP*.22)+(s.r===3?.15:0),0,1);
      cur={sp:s,size:+(s.min+(s.max-s.min)*f).toFixed(1),sf:f};
      const big=(s.kind==='ribbon'||s.kind==='eel')?f>.75:f>.82;
      cur.big=big&&s.beh!=='item';
      setState('wait');misses=0;pressBuf=-9;scheduleBite(rnd(3,5)-fl.castP*.5);
      shadow.on=false;shadow.a=0;shadow.ang=rnd(0,6.28);shadow.r=80;
      if(firstReel&&castsLeft===CASTS-1)say('魚の影が寄ってくる。ウキが沈むまで待って','#bbaedd',3);
    }
    function scheduleBite(t){
      waitT=Math.max(2,t);nibbles=[];
      const n=1+((Math.random()*2)|0);
      for(let i=0;i<n;i++)nibbles.push(rnd(Math.min(1.8,waitT-.5),waitT-.35));
      nibbles.sort((a,b)=>a-b);
    }
    function pickSpecies(){
      const z=fl.zone;
      let tot=0;
      const ws=SPECIES.map(s=>{
        if(locked(s)||(s.t&&timeIdx<s.t))return 0;
        let w=s.w*(s.zones.includes(z)?1:.12);
        if(WEATHER==='rain'&&(s.id==='anago'||s.id==='ika'))w*=1.6;
        if(WEATHER==='mist'&&(s.id==='heike'||s.id==='suzu'))w*=1.6;
        if(WEATHER==='clear'&&(s.id==='tachiuo'||s.id==='ika'))w*=1.3;
        if(s.id==='ika'&&moonPhase>.4&&moonPhase<.6)w*=1.3; // 満月の夜はイカが浮く
        if(!FD.seen[s.id]&&s.r===1)w*=1.4;
        tot+=w;return w;
      });
      let r=Math.random()*tot;
      for(let i=0;i<SPECIES.length;i++){r-=ws[i];if(r<=0&&ws[i]>0)return SPECIES[i];}
      return SPECIES[0];
    }
    function hook(){
      const s=cur.sp;
      const item=s.beh==='item';
      cur.str=item?.2:clamp(.3+cur.sf*.45+(s.r-1)*.12,0,1);
      Object.assign(reel,{z:.35,zv:0,f:.5,fv:0,ft:.5,fcd:.4,pr:.28,zw:(item?.38:clamp(.31-cur.sf*.05-(s.r===3?.03:0),.22,.34))*RZW,inside:true,grace:(firstReel?2.2:.8)+RGRACE,clickT:0,splT:0});
      tension=.3;shadow.on=false;
      setState('reel');se('decide');buzz(25);
      splash(fl.x,fl.y,14,130);ring(fl.x,fl.y,3,.7,'120,255,230',1.4);SFX.splash(cur.big);
      if(firstReel)say('長押しで光の枠が右へ、離すと左へ。魚を枠に入れて','#00e8c8',3.6);
      else say(item?'……ん？ 重いだけで、暴れないわね':cur.big?'重い……大物よ！':'かかった！','#00e8c8',1.6);
      firstReel=false;
    }
    function escape(text){
      escapes++;cur=null;
      say(text,'#9a8cc0',2.6);
      se('back');setState('after');fl.vis=false;shadow.on=false;
    }
    function caught(){
      const s=cur.sp;
      const rec=FD.seen[s.id];
      const isNew=!rec;
      const record=rec&&cur.size>rec.max;
      if(isNew){FD.seen[s.id]={n:1,max:cur.size,day:gs.day||1};newSpecies++;}
      else{rec.n++;if(record)rec.max=cur.size;}
      FD.total++;
      if(s.r===3)rareCaught=true;
      if(cur.big)bigCaught=true;
      catches.push({id:s.id,size:cur.size,sf:cur.sf,isNew,big:cur.big});
      lastCatch={sp:s,size:cur.size};
      splash(fl.x,fl.y,20,160);ring(fl.x,fl.y,4,.8,'120,255,230',1.6);
      SFX.splash(true);
      if(s.id==='suzu')SFX.bell();else if(s.r===3||isNew)SFX.chime();
      se(s.r===3||isNew?'ach':'rank');buzz(40);
      fl.vis=false;
      showCard(s,cur.size,isNew,record,cur.big);
      cur=null;updZbtn();
    }
    function nextOrEnd(){
      if(castsLeft<=0)startEnding();
      else{
        setState('ready');
        const ti=Math.min(2,Math.floor((CASTS-castsLeft)/2));
        if(ti!==timeIdx){showBanner(`── ${TIMES[ti]} ──`,ti===1?'街の灯りが減ってきた':'海が、いちばん静かな時間',ti===2?'#9fb8ff':'#deccf8');se('notif');}
      }
    }
    function computeGrade(){
      score=0;
      catches.forEach(c=>{const s=SP[c.id];score+=10+c.sf*6+(s.r-1)*12+(c.big?6:0);});
      score+=newSpecies*6;
      score=Math.round(score);
      grade=score>=110?'S':score>=75?'A':score>=40?'B':'C';
    }
    function startEnding(){
      computeGrade();
      FD.sessions++;FD.grades[grade]=(FD.grades[grade]||0)+1;
      const b=FD.best||{};
      if(!b.grade||GRADE_ORDER.indexOf(grade)>GRADE_ORDER.indexOf(b.grade)||(grade===b.grade&&score>(b.score||0)))FD.best={grade,score,count:catches.length,day:gs.day||1};
      FD.bestCount=Math.max(FD.bestCount||0,catches.length);
      setState('ending');gradeT=0;zbtn.classList.add('hide');
    }

    // ── カード・図鑑・説明 ──
    function showCard(s,size,isNew,record,big){
      setState('card');cardReadyAt=clock+.6;
      const unit=s.unit||'全長';
      const fl2=isNew?s.flav[0]:s.flav[(Math.random()*s.flav.length)|0];
      ov.innerHTML=`<div class="fishing-panel fishing-card${s.r===3?' rare':''}">`+
        (isNew?'<span class="fishing-tag new">NEW 図鑑登録</span>':'')+(s.r===3?'<span class="fishing-tag rare">めずらしい</span>':big?'<span class="fishing-tag big">大物</span>':'')+
        `<canvas width="10" height="10"></canvas><div class="fishing-nm">${s.name}</div>`+
        `<div class="fishing-sz">${unit} ${size.toFixed(1)}cm${record?'<em>自己ベスト更新</em>':''}</div>`+
        `<div class="fishing-fl">${fl2}</div><div class="fishing-tap">タップで続ける（のこり${castsLeft}投）</div></div>`;
      drawCardCanvas(ov.querySelector('canvas'),s,260,130,size,false);
      ov.classList.add('on');
      ov.onpointerdown=e=>{e.preventDefault();e.stopPropagation();if(clock>=cardReadyAt)closeCard();};
    }
    function closeCard(){
      ov.classList.remove('on');ov.onpointerdown=null;
      ignoreRelease=holding;
      bucketT=1;SFX.plop();se('btn');
      nextOrEnd();
    }
    function drawCardCanvas(c,s,w,h,size,sil){
      const r=Math.min(2.5,window.devicePixelRatio||1);
      c.width=Math.round(w*r);c.height=Math.round(h*r);
      const g=c.getContext('2d');g.setTransform(r,0,0,r,0,0);
      if(!sil){
        const bg=g.createRadialGradient(w/2,h*.55,4,w/2,h*.55,w*.55);
        bg.addColorStop(0,s.r===3?'rgba(232,184,48,.16)':'rgba(0,232,200,.1)');bg.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=bg;g.fillRect(0,0,w,h);
        g.fillStyle='rgba(120,110,200,.12)';for(let i=0;i<5;i++)g.fillRect(w*.15+i*17,h*.86+(i%2)*3,30,1);
      }
      const L=creatureLen(s,w,size);
      g.save();g.translate(w/2,h*.5);
      drawCreature(g,s,L,clock,false);
      g.restore();
      if(sil){g.globalCompositeOperation='source-in';g.fillStyle='rgba(34,28,58,1)';g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';}
    }
    function creatureLen(s,w,size){
      const k=s.kind;
      if(k==='ribbon'||k==='eel')return w*.86;
      if(k==='crab'||k==='bell'||k==='glass'||k==='boot')return w*.36;
      if(k==='squid')return w*.66;
      const f=size?clamp((size-s.min)/(s.max-s.min),0,1):.6;
      return w*(.56+f*.18);
    }
    function howtoIcon(c,kind){
      const [_,g]=[null,c.getContext('2d')];const r=2;c.width=46*r;c.height=46*r;g.setTransform(r,0,0,r,0,0);
      g.lineCap='round';
      if(kind===1){ // 長押しのゲージと弧
        g.setLineDash([2,3]);g.strokeStyle='rgba(222,204,248,.7)';g.beginPath();g.moveTo(36,38);g.quadraticCurveTo(22,2,8,26);g.stroke();g.setLineDash([]);
        g.strokeStyle='#00e8c8';g.beginPath();g.ellipse(8,28,5,1.6,0,0,7);g.stroke();
        g.fillStyle='rgba(0,232,200,.25)';g.fillRect(6,40,34,3);g.fillStyle='#00e8c8';g.fillRect(6,40,22,3);
      }else if(kind===2){ // ウキが沈む
        g.strokeStyle='rgba(200,220,255,.5)';g.beginPath();g.ellipse(23,30,14,4,0,0,7);g.stroke();g.beginPath();g.ellipse(23,30,8,2.2,0,0,7);g.stroke();
        g.fillStyle='#e8e0f0';g.fillRect(21.5,24,3,6);g.fillStyle='#ff6a3a';g.fillRect(21.5,22,3,3);
        const gr=g.createRadialGradient(23,22,0,23,22,8);gr.addColorStop(0,'rgba(255,100,80,.8)');gr.addColorStop(1,'rgba(255,100,80,0)');g.fillStyle=gr;g.fillRect(13,12,20,20);
        g.fillStyle='#44ee88';g.font=`14px ${FONT}`;g.textAlign='center';g.fillText('！',23,13);
        g.fillStyle='rgba(2,2,8,.6)';g.beginPath();g.ellipse(16,36,9,2.5,.2,0,7);g.fill();
      }else{ // 追従バー
        g.fillStyle='rgba(255,255,255,.08)';g.fillRect(4,20,38,8);
        g.fillStyle='rgba(0,232,200,.35)';g.strokeStyle='#00e8c8';g.fillRect(16,19,14,10);g.strokeRect(16,19,14,10);
        g.fillStyle='#c9d6e2';g.beginPath();g.ellipse(24,24,4,2,0,0,7);g.fill();g.beginPath();g.moveTo(20,24);g.lineTo(18,22);g.lineTo(18,26);g.fill();
        g.fillStyle='rgba(68,238,136,.3)';g.fillRect(4,34,38,3);g.fillStyle='#44ee88';g.fillRect(4,34,24,3);
      }
    }
    function openHowto(){
      setState('howto');
      ov.innerHTML=`<div class="fishing-panel"><div class="fishing-h">夜釣りのしかた</div>`+
        `<div class="fishing-sub">今夜：${WNAME}・${MOON_NAME}・${TIDE}　のこり${CASTS}投</div>`+
        `<div class="fishing-step"><canvas data-k="1"></canvas><div>長押しで力をためて、離して投げる<small>押したまま左右になぞると狙いが変わる。遠いほど深場（浅場・中層・沖）</small></div></div>`+
        `<div class="fishing-step"><canvas data-k="2"></canvas><div>影が寄ってきて、ウキがスッと沈んだらタップ<small>影の大きさが獲物の大きさ。ツンツンは様子見</small></div></div>`+
        `<div class="fishing-step"><canvas data-k="3"></canvas><div>長押しで光の枠が右へ、離すと左へ<small>魚を枠に入れておくと、少しずつ寄ってくる</small></div></div>`+
        `<div class="fishing-tap">タップではじめる</div></div>`;
      ov.querySelectorAll('canvas').forEach(c=>howtoIcon(c,+c.dataset.k));
      ov.classList.add('on');
      ov.onpointerdown=e=>{e.preventDefault();e.stopPropagation();startPlay();};
    }
    function startPlay(){
      if(state!=='howto')return;
      ov.classList.remove('on');ov.onpointerdown=null;
      setState('ready');se('decide');zbtn.classList.remove('hide');
      showBanner(`── ${TIMES[0]} ──`,`${WNAME}・${MOON_NAME}`,'#deccf8');
    }
    let zkPrev=null;
    function openZukan(){
      if(paused||mg._ended)return;
      if(!['ready','card','after','wait','howto'].includes(state)){say('いまは手が離せない','#8e80b0',1.2);return;}
      paused=true;holding=false;se('btn');
      zkPrev={html:ov.innerHTML,on:ov.classList.contains('on'),pd:ov.onpointerdown};
      const n=zCount(),b=FD.best;
      ov.innerHTML=`<div class="fishing-panel fishing-zk"><div class="fishing-h">魚図鑑</div>`+
        `<div class="fishing-sub">${n}/${SPECIES.length}種　通算${FD.total}匹　夜釣り${FD.sessions}回`+(b?`<br>最高評価 ${b.grade}（${b.count}匹）　最多 ${FD.bestCount||0}匹`:'')+`</div>`+
        `<div class="fishing-zgrid">${SPECIES.map(s=>{const r=FD.seen[s.id];
          const hint=r?WHERE(s):(LOCK_HINT[s.id]||(s.r>=2?WHERE(s):'まだ出会っていない'));
          return `<div class="fishing-zc r${s.r}${r?' got':''}"><canvas data-id="${s.id}"></canvas><div class="n">${r?s.name:'？？？'}</div>`+
            `<div class="d">${r?`×${r.n}　最大${r.max.toFixed(1)}cm<br>`:''}${hint}</div></div>`;}).join('')}</div>`+
        `<button class="fishing-zclose">とじる</button></div>`;
      ov.querySelectorAll('canvas').forEach(c=>{const s=SP[c.dataset.id];drawCardCanvas(c,s,160,80,FD.seen[s.id]?FD.seen[s.id].max:0,!FD.seen[s.id]);});
      ov.onpointerdown=e=>{e.stopPropagation();};
      ov.querySelector('.fishing-zclose').onclick=e=>{e.stopPropagation();closeZukan();};
      ov.classList.add('on');
    }
    function closeZukan(){
      if(!paused)return;
      paused=false;se('back');
      const p=zkPrev;zkPrev=null;
      if(p&&p.on){
        ov.innerHTML=p.html;ov.onpointerdown=p.pd;
        const c=ov.querySelector('.fishing-card canvas');
        if(c&&lastCatch)drawCardCanvas(c,lastCatch.sp,260,130,lastCatch.size,false);
        ov.querySelectorAll('.fishing-step canvas').forEach(c=>howtoIcon(c,+c.dataset.k));
      }else{ov.classList.remove('on');ov.onpointerdown=null;ov.innerHTML='';}
    }
    zbtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();paused?closeZukan():openZukan();});

    // ── 人物 ──
    function heroPose(){
      let lean=0;
      if(state==='reel')lean=.05+tension*.12;
      else if(state==='charge')lean=-.03-power*.07;
      else if(state==='bite')lean=-.06;
      else if(state==='card')lean=.05;
      // 時々バケツや源さんの方を見る
      let turn=0;
      if(talk.on&&talk.lines[talk.i]&&talk.lines[talk.i].who==='gen')turn=1;
      else if(state==='ready'||state==='wait'){const p=clock%11;turn=p>8.6&&p<10.4?Math.min(1,(p-8.6)*3,(10.4-p)*3):0;}
      return {lean,turn,breath:Math.sin(clock*1.7)*.8};
    }
    function limb(x0,y0,x1,y1,w,col){cx.strokeStyle=col;cx.lineWidth=w;cx.lineCap='round';cx.beginPath();cx.moveTo(x0,y0);cx.quadraticCurveTo((x0+x1)/2+(y1-y0)*.12,(y0+y1)/2+Math.abs(x1-x0)*.15,x1,y1);cx.stroke();}
    function rodPath(rg){
      const ux=Math.cos(rg.a),uy=Math.sin(rg.a);
      const bx=rg.gx-ux*26*U,by=rg.gy-uy*26*U;
      const nx=uy,ny=-ux; // 上側へ反る
      const mx=(bx+rg.tx)/2+nx*rg.bend*rg.L*.32,my=(by+rg.ty)/2+ny*rg.bend*rg.L*.32;
      const tipDrop=rg.bend*rg.L*.12;
      return {bx,by,mx,my,tx:rg.tx-nx*tipDrop*.2,ty:rg.ty+tipDrop*.6,ux,uy};
    }
    function drawRod(rg){
      const p=rodPath(rg);
      const P=f=>{const u=1-f;return [u*u*p.bx+2*u*f*p.mx+f*f*p.tx,u*u*p.by+2*u*f*p.my+f*f*p.ty];};
      const seg=(w,col,f0,f1)=>{cx.strokeStyle=col;cx.lineWidth=w;cx.lineCap='round';cx.beginPath();
        for(let i=0;i<=14;i++){const [x,y]=P(lerp(f0,f1,i/14));i?cx.lineTo(x,y):cx.moveTo(x,y);}cx.stroke();};
      seg(5.5*U,'#140f20',0,.2);seg(3.6*U,'#2a2040',.18,.5);seg(2.4*U,'#3a2e58',.48,.8);seg(1.4*U,'#4c3e70',.78,1);
      seg(1,'rgba(220,200,255,.35)',.06,.97);
      // グリップのコルク
      seg(6*U,'#6a4e36',.06,.16);
      cx.fillStyle='rgba(210,200,240,.6)';
      for(const f of [.36,.55,.7,.83,.93]){const [x,y]=P(f);cx.fillRect(x-1,y-1,2,2);}
      // 穂先の灯り
      const [tx,ty]=P(1);
      cx.globalCompositeOperation='lighter';gl(glow.cy,tx,ty,6,.6);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      return {tx,ty,P};
    }
    function drawHero(rg){
      const t=clock,u=U,x=HERO.x,y=HERO.y;
      const ps=heroPose();
      // 足元の影
      cx.fillStyle='rgba(0,0,0,.42)';cx.beginPath();cx.ellipse(x,y+2*u,30*u,6*u,0,0,7);cx.fill();
      // クーラーボックス
      const cg=cx.createLinearGradient(x-20*u,0,x+20*u,0);cg.addColorStop(0,'#c8b8a8');cg.addColorStop(.3,'#d6dde6');cg.addColorStop(1,'#7e8a9a');
      cx.fillStyle=cg;cx.fillRect(x-20*u,y-22*u,40*u,22*u);
      cx.fillStyle='#2f6f9f';cx.fillRect(x-21*u,y-24*u,42*u,5*u);
      cx.fillStyle='rgba(255,255,255,.25)';cx.fillRect(x-21*u,y-24*u,42*u,1);
      cx.fillStyle='rgba(0,0,0,.25)';cx.fillRect(x-20*u,y-6*u,40*u,1);
      // 竿・腕・体
      const rp=drawRod(rg);
      const sx=x,sy=y-22*u;
      const sh=(dx,dy)=>{const c=Math.cos(ps.lean),s=Math.sin(ps.lean);return [sx+dx*c-dy*s,sy+dx*s+dy*c];};
      const [lsx,lsy]=sh(-14*u,-36*u+ps.breath),[rsx,rsy]=sh(14*u,-36*u+ps.breath);
      // リールとハンドル
      const rx=rg.gx-rp.ux*12*u+rp.uy*-5*u,ry=rg.gy-rp.uy*12*u+5*u;
      const ca=state==='reel'&&holding?t*16:state==='reel'?t*2:.9;
      const hx=rx+Math.cos(ca)*7*u,hy=ry+Math.sin(ca)*7*u;
      cx.fillStyle='#2e2846';cx.beginPath();cx.arc(rx,ry,6.5*u,0,7);cx.fill();
      cx.strokeStyle='rgba(210,200,255,.45)';cx.lineWidth=1;cx.beginPath();cx.arc(rx,ry,4.5*u,0,7);cx.stroke();
      // 右腕（リールを巻く手）
      const rhx=state==='charge'?rg.gx-rp.ux*18*u:hx,rhy=state==='charge'?rg.gy-rp.uy*18*u:hy;
      limb(rsx,rsy,rhx,rhy,8*u,'#2a2142');
      cx.fillStyle='#e6c2ae';cx.beginPath();cx.arc(rhx,rhy,3.4*u,0,7);cx.fill();
      // 胴（パーカーの背中）
      cx.save();cx.translate(sx,sy);cx.rotate(ps.lean);
      cx.beginPath();cx.moveTo(-18*u,0);cx.lineTo(18*u,0);
      cx.quadraticCurveTo(22*u,-22*u,16*u,-36*u+ps.breath);cx.quadraticCurveTo(0,-42*u+ps.breath,-16*u,-36*u+ps.breath);cx.quadraticCurveTo(-22*u,-22*u,-18*u,0);cx.closePath();
      const tg=cx.createLinearGradient(-20*u,0,20*u,0);tg.addColorStop(0,'#5a4680');tg.addColorStop(.35,'#3a2e5c');tg.addColorStop(1,'#1c1630');
      cx.fillStyle=tg;cx.fill();
      cx.strokeStyle='rgba(255,190,120,.35)';cx.lineWidth=1.4;cx.beginPath();cx.moveTo(-18*u,0);cx.quadraticCurveTo(-22*u,-22*u,-16*u,-36*u+ps.breath);cx.stroke();
      cx.strokeStyle='rgba(190,180,255,.22)';cx.beginPath();cx.moveTo(4*u,-40*u+ps.breath);cx.quadraticCurveTo(14*u,-38*u,17*u,-30*u);cx.stroke();
      // しわとフード
      cx.strokeStyle='rgba(0,0,0,.25)';cx.lineWidth=1;cx.beginPath();cx.moveTo(-6*u,-6*u);cx.quadraticCurveTo(-2*u,-18*u,-8*u,-28*u);cx.moveTo(8*u,-4*u);cx.quadraticCurveTo(4*u,-16*u,9*u,-26*u);cx.stroke();
      cx.fillStyle='#2a2046';cx.beginPath();cx.ellipse(0,-35*u+ps.breath,12*u,6*u,0,0,7);cx.fill();
      cx.fillStyle='#e8b830';cx.fillRect(-3*u,-14*u,6*u,1.5*u); // パーカーの小さなロゴ
      // 頭
      const hxx=-ps.turn*2.5*u,hyy=-50*u+ps.breath;
      const sway=Math.sin(t*1.3)*2.5*u+(state==='reel'?Math.sin(t*9)*tension*1.5*u:0);
      // ポニーテール
      cx.strokeStyle='#2c1850';cx.lineCap='round';
      const pt=(w,col)=>{cx.strokeStyle=col;cx.lineWidth=w;cx.beginPath();cx.moveTo(hxx+9*u,hyy-6*u);cx.quadraticCurveTo(hxx+22*u+sway,hyy+2*u,hxx+17*u+sway*1.6,hyy+22*u);cx.stroke();};
      pt(8*u,'#2c1850');pt(4*u,'#4a2c80');pt(1.2*u,'rgba(170,140,230,.5)');
      const hg=cx.createRadialGradient(hxx-4*u,hyy-5*u,2*u,hxx,hyy,14*u);hg.addColorStop(0,'#5a3896');hg.addColorStop(1,'#2a1648');
      cx.fillStyle=hg;cx.beginPath();cx.arc(hxx,hyy,13*u,0,7);cx.fill();
      if(ps.turn>.05){ // 横顔が少し見える
        cx.save();cx.beginPath();cx.arc(hxx,hyy,13*u,0,7);cx.clip();
        cx.fillStyle=`rgba(236,200,182,${ps.turn})`;cx.beginPath();cx.ellipse(hxx-13*u,hyy+3*u,5*u,7*u,0,0,7);cx.fill();cx.restore();
        cx.strokeStyle=`rgba(200,255,250,${.7*ps.turn})`;cx.lineWidth=1.2;cx.beginPath();cx.moveTo(hxx-13*u,hyy+1*u);cx.lineTo(hxx-6*u,hyy+.5*u);cx.stroke();
      }
      cx.strokeStyle='rgba(150,120,220,.4)';cx.lineWidth=1;
      for(let i=0;i<4;i++){cx.beginPath();cx.arc(hxx+(i-1.5)*3*u,hyy+4*u,11*u,-2.2+i*.12,-1.2+i*.1);cx.stroke();}
      cx.strokeStyle='rgba(255,190,120,.35)';cx.beginPath();cx.arc(hxx,hyy,12.6*u,2.2,3.6);cx.stroke();
      // 花飾り
      for(let i=0;i<5;i++){const a=i*1.256+t*.2;cx.fillStyle='#f0a6c8';cx.beginPath();cx.arc(hxx+10*u+Math.cos(a)*2*u,hyy-8*u+Math.sin(a)*2*u,1.6*u,0,7);cx.fill();}
      cx.fillStyle='#ffe0a0';cx.beginPath();cx.arc(hxx+10*u,hyy-8*u,1*u,0,7);cx.fill();
      // シルクハット
      cx.save();cx.translate(hxx-3*u,hyy-11*u);cx.rotate(-.2+Math.sin(t*1.1)*.02);
      cx.fillStyle='#8a3f6a';cx.beginPath();cx.ellipse(0,0,12*u,3*u,0,0,7);cx.fill();
      const hgd=cx.createLinearGradient(-7*u,0,7*u,0);hgd.addColorStop(0,'#e8a0c4');hgd.addColorStop(.5,'#d27aa8');hgd.addColorStop(1,'#8a3f6a');
      cx.fillStyle=hgd;cx.fillRect(-7*u,-12*u,14*u,12*u);
      cx.fillStyle='#5a2244';cx.fillRect(-7*u,-4*u,14*u,2.6*u);
      cx.fillStyle='#f0b8d4';cx.beginPath();cx.ellipse(0,-12*u,7*u,1.8*u,0,0,7);cx.fill();
      cx.restore();
      cx.restore();
      // 左腕（竿を握る手）
      limb(lsx,lsy,rg.gx,rg.gy,8*u,'#4a3a6e');
      cx.fillStyle='#ecc8b4';cx.beginPath();cx.arc(rg.gx,rg.gy,3.6*u,0,7);cx.fill();
      return rp;
    }
    function drawGen(){
      const t=clock,u=U,x=GEN.x,y=GEN.y;
      const speaking=talk.on&&talk.lines[talk.i]&&talk.lines[talk.i].who==='gen';
      const turn=speaking?1:0;
      const tw=genTwitch>0?Math.sin(genTwitch*Math.PI)*.06:0;
      cx.fillStyle='rgba(0,0,0,.4)';cx.beginPath();cx.ellipse(x,y+2*u,24*u,5*u,0,0,7);cx.fill();
      // 逆さのバケツ
      const bg=cx.createLinearGradient(x-13*u,0,x+13*u,0);bg.addColorStop(0,'#7a3a1a');bg.addColorStop(.6,'#c06a30');bg.addColorStop(1,'#e8a060');
      cx.fillStyle=bg;cx.beginPath();cx.moveTo(x-13*u,y);cx.lineTo(x+13*u,y);cx.lineTo(x+10*u,y-16*u);cx.lineTo(x-10*u,y-16*u);cx.fill();
      cx.fillStyle='rgba(0,0,0,.2)';cx.fillRect(x-12*u,y-6*u,24*u,1.2);cx.fillRect(x-11*u,y-11*u,22*u,1.2);
      // 竿と糸
      const gx=x+16*u,gy=y-34*u;
      const ta=Math.atan2(GEN.tip.y-gy,GEN.tip.x-gx)-tw,L=Math.hypot(GEN.tip.x-gx,GEN.tip.y-gy);
      const tx=gx+Math.cos(ta)*L,ty=gy+Math.sin(ta)*L;
      cx.strokeStyle='#1a1426';cx.lineWidth=3*u;cx.lineCap='round';cx.beginPath();cx.moveTo(gx-Math.cos(ta)*18*u,gy-Math.sin(ta)*18*u);cx.lineTo(gx,gy);cx.stroke();
      cx.strokeStyle='#3a3050';cx.lineWidth=1.6*u;cx.beginPath();cx.moveTo(gx,gy);cx.quadraticCurveTo((gx+tx)/2+6*u,(gy+ty)/2-4*u,tx,ty);cx.stroke();
      const fx=GEN.float.x+camX*(.8-1),fy=GEN.float.y+Math.sin(t*1.4+1)*1.1-26*scaleAt(GEN.float.y)*.9+camOff*(.95-1);
      cx.strokeStyle='rgba(220,220,240,.22)';cx.lineWidth=.7;cx.beginPath();cx.moveTo(tx,ty);cx.quadraticCurveTo((tx+fx)/2,Math.max(ty,fy)+30,fx,fy);cx.stroke();
      cx.globalCompositeOperation='lighter';gl(glow.gn,tx,ty,5,.5);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      // 脚（バケツに腰かけて膝を立てる・ゴム長靴）
      const leg=(ox,col,bootC,sole)=>{
        const hx0=x+ox+2*u,hy0=y-17*u,kx=x+ox+19*u,ky=y-23*u,fx=x+ox+12.5*u,fy=y;
        cx.strokeStyle=col;cx.lineCap='round';cx.lineWidth=8.5*u;cx.beginPath();cx.moveTo(hx0,hy0);cx.lineTo(kx,ky);cx.stroke();
        cx.lineWidth=7*u;cx.beginPath();cx.moveTo(kx,ky);cx.lineTo(fx-1*u,fy-10*u);cx.stroke();
        cx.strokeStyle='rgba(255,190,120,.22)';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(hx0+2*u,hy0-4*u);cx.lineTo(kx+1*u,ky-4*u);cx.stroke();
        cx.fillStyle=bootC;cx.beginPath();cx.moveTo(fx-5*u,fy-13*u);cx.lineTo(fx+3.2*u,fy-13*u);cx.lineTo(fx+3.6*u,fy-4*u);
        cx.quadraticCurveTo(fx+9.5*u,fy-4*u,fx+9.5*u,fy-.5*u);cx.lineTo(fx-5.5*u,fy-.5*u);cx.closePath();cx.fill();
        cx.fillStyle=sole;cx.fillRect(fx-5.5*u,fy-1.6*u,15*u,1.6*u);cx.fillRect(fx-5.4*u,fy-13.5*u,8.8*u,1.6*u);
        cx.fillStyle='rgba(200,255,220,.16)';cx.fillRect(fx-3.8*u,fy-11.5*u,1.3*u,8*u);
      };
      leg(-4*u,'#2c2e22','#1a2a20','#080a08');
      // 奥の腕（膝に置いた手）
      limb(x+3*u,y-42*u,x+18*u,y-27*u,6*u,'#1e2016');
      cx.fillStyle='#9a7254';cx.beginPath();cx.ellipse(x+19*u,y-26.5*u,3*u,2.3*u,.3,0,7);cx.fill();
      leg(0,'#4a4c38','#2a4434','#0c100c');
      // 体（前かがみ・作業ジャンパーの上に釣りベスト・首にタオル）
      cx.save();cx.translate(x,y-16*u);cx.rotate(.22+Math.sin(t*1.2)*.012);
      const torso=()=>{cx.beginPath();cx.moveTo(-13*u,0);cx.lineTo(13*u,0);cx.quadraticCurveTo(16*u,-20*u,8*u,-32*u);cx.quadraticCurveTo(-6*u,-36*u,-13*u,-26*u);cx.quadraticCurveTo(-17*u,-12*u,-13*u,0);cx.closePath();};
      torso();
      const jg=cx.createLinearGradient(-15*u,0,15*u,0);jg.addColorStop(0,'#24261a');jg.addColorStop(.6,'#3a3e2a');jg.addColorStop(1,'#5a5a3a');
      cx.fillStyle=jg;cx.fill();
      cx.save();torso();cx.clip();
      const vg=cx.createLinearGradient(-15*u,0,15*u,0);vg.addColorStop(0,'#3e3a24');vg.addColorStop(.55,'#6a6240');vg.addColorStop(1,'#8a8054');
      cx.fillStyle=vg;cx.fillRect(-16*u,-30*u,32*u,30*u);
      cx.fillStyle='#2e3222';cx.beginPath();cx.ellipse(5*u,-23*u,6*u,7.5*u,.25,0,7);cx.fill();   // 袖ぐり（ジャンパーが見える）
      cx.fillStyle='#2a2c1c';cx.fillRect(-16*u,-2.5*u,32*u,2.5*u);                                 // 裾
      // ポケットとフラップ
      const pk=(px,py,pw,ph)=>{cx.fillStyle='rgba(0,0,0,.22)';cx.fillRect(px,py,pw,ph);cx.fillStyle='#4e482e';cx.fillRect(px-.4*u,py-1.6*u,pw+.8*u,2*u);
        cx.fillStyle='rgba(255,230,170,.28)';cx.fillRect(px-.4*u,py-1.6*u,pw+.8*u,.6);};
      pk(5*u,-12*u,6.5*u,7*u);pk(-6*u,-11*u,6*u,7*u);
      cx.fillStyle='#c8c0a0';cx.fillRect(9.5*u,-19*u,1*u,4*u);                                      // 胸ポケットのラインカッター
      cx.restore();
      cx.strokeStyle='rgba(255,190,120,.35)';cx.lineWidth=1.3;cx.beginPath();cx.moveTo(13*u,0);cx.quadraticCurveTo(16*u,-20*u,8*u,-32*u);cx.stroke();
      cx.strokeStyle='rgba(0,0,0,.3)';cx.lineWidth=1;cx.beginPath();cx.moveTo(-4*u,-4*u);cx.lineTo(-2*u,-28*u);cx.stroke();
      // 頭
      const hx=3*u+turn*2*u,hy=-41*u+Math.sin(t*1.2)*.6;
      cx.fillStyle='#8a6448';cx.fillRect(hx-4*u,hy+4*u,7*u,7*u);                                    // 首
      // タオル（首に巻いて前に垂らす）
      cx.fillStyle='#d8d8d0';cx.beginPath();cx.ellipse(hx+.5*u,hy+10*u,8*u,3.2*u,.15,0,7);cx.fill();
      cx.beginPath();cx.moveTo(hx+5*u,hy+10*u);cx.lineTo(hx+9.5*u,hy+10.5*u);cx.lineTo(hx+11*u,hy+19*u+Math.sin(t*1.5)*.6);cx.lineTo(hx+7*u,hy+19*u);cx.closePath();cx.fill();
      cx.fillStyle='rgba(60,90,160,.6)';cx.fillRect(hx+7.2*u,hy+16.5*u,3.6*u,1*u);
      cx.fillStyle='rgba(0,0,0,.18)';cx.beginPath();cx.ellipse(hx-1*u,hy+11*u,6*u,1.6*u,.15,0,Math.PI);cx.fill();
      // 後ろ髪（白髪まじり）と顔
      cx.fillStyle='#7a7670';cx.beginPath();cx.ellipse(hx-4*u,hy+1.5*u,5*u,5.5*u,0,0,7);cx.fill();
      const fg=cx.createLinearGradient(hx-8*u,0,hx+9*u,0);fg.addColorStop(0,'#8a6248');fg.addColorStop(.6,'#c49272');fg.addColorStop(1,'#d8a882');
      cx.fillStyle=fg;cx.beginPath();cx.ellipse(hx+1*u,hy+1*u,7.6*u,8*u,0,0,7);cx.fill();
      cx.beginPath();cx.moveTo(hx+7.8*u,hy-.5*u);cx.lineTo(hx+10.6*u,hy+3.2*u);cx.lineTo(hx+7.6*u,hy+4.2*u);cx.closePath();cx.fill();   // 鼻
      cx.fillStyle='#a87656';cx.beginPath();cx.ellipse(hx-1.2*u,hy+2*u,2*u,2.8*u,0,0,7);cx.fill();                                      // 耳
      cx.strokeStyle='rgba(60,30,20,.5)';cx.lineWidth=.8;cx.beginPath();cx.arc(hx-1*u,hy+2*u,1.1*u,-1.2,1.6);cx.stroke();
      cx.fillStyle='#b4b0a8';cx.fillRect(hx-4*u,hy-2*u,2.4*u,5*u);                                    // もみあげ
      // ひげ（無精ひげ）
      cx.fillStyle='rgba(216,212,204,.92)';cx.beginPath();cx.moveTo(hx-1.5*u,hy+5*u);cx.quadraticCurveTo(hx+1*u,hy+10.5*u,hx+6*u,hy+9*u);
      cx.quadraticCurveTo(hx+9.5*u,hy+7.5*u,hx+9.2*u,hy+4.6*u);cx.lineTo(hx+5*u,hy+5.2*u);cx.quadraticCurveTo(hx+2*u,hy+4*u,hx-1.5*u,hy+5*u);cx.fill();
      // 目・眉・口
      const blink=(t%4.3)<.13;
      cx.fillStyle='#e8e4dc';cx.fillRect(hx+3.6*u,hy-2.6*u,4*u,1.3*u);
      cx.fillStyle='#24140c';cx.fillRect(hx+4.6*u,hy-.4*u,2.2*u,blink?.6:1.4*u);
      cx.strokeStyle='rgba(70,36,20,.55)';cx.lineWidth=.8;cx.beginPath();cx.moveTo(hx+3.6*u,hy+.4*u);cx.lineTo(hx+2.6*u,hy+1.3*u);cx.moveTo(hx+6*u,hy+2.6*u);cx.quadraticCurveTo(hx+7*u,hy+3.6*u,hx+7.8*u,hy+4.4*u);cx.stroke();
      if(turn){cx.fillStyle='#24140c';cx.fillRect(hx+.6*u,hy-.2*u,1.6*u,blink?.6:1.2*u);}
      const mo=speaking&&((t*8)|0)%2;
      cx.fillStyle='#3a1a14';cx.beginPath();cx.ellipse(hx+7*u,hy+6.4*u,1.8*u,mo?1.2*u:.4*u,0,0,7);cx.fill();
      // キャップ
      cx.fillStyle='#1e2a4a';cx.beginPath();cx.arc(hx+.5*u,hy-.5*u,8.8*u,Math.PI*.98,Math.PI*2.02);cx.fill();
      cx.fillStyle='#16203a';cx.fillRect(hx-8.3*u,hy-1.8*u,17.6*u,2.4*u);
      cx.beginPath();cx.ellipse(hx+(10+turn*2)*u,hy+.2*u,6.8*u,1.9*u,.12,0,7);cx.fill();
      cx.fillStyle='#2a3a62';cx.beginPath();cx.arc(hx+.5*u,hy-9.2*u,1.2*u,0,7);cx.fill();
      cx.fillStyle='#d0c890';cx.fillRect(hx+2.5*u,hy-6*u,3.4*u,2.4*u);
      cx.strokeStyle='rgba(255,190,120,.4)';cx.lineWidth=1;cx.beginPath();cx.arc(hx+.5*u,hy-.5*u,8.6*u,-1.2,-.15);cx.stroke();
      cx.fillStyle='rgba(255,190,120,.18)';cx.beginPath();cx.arc(hx+1*u,hy+1*u,7.6*u,-.6,.6);cx.lineTo(hx+1*u,hy+1*u);cx.fill();
      cx.restore();
      // 手前の腕（ジャンパーの袖・軍手）
      limb(x+7*u,y-43*u,gx,gy,7.5*u,'#34382a');
      cx.strokeStyle='rgba(255,190,120,.25)';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+8*u,y-47*u);cx.quadraticCurveTo(x+13*u,y-46*u,gx,gy-3.5*u);cx.stroke();
      cx.fillStyle='#24271c';cx.beginPath();cx.arc(gx-3*u,gy+.5*u,3.6*u,0,7);cx.fill();
      cx.fillStyle='#d8d4c4';cx.beginPath();cx.ellipse(gx,gy,3.6*u,3.1*u,.4,0,7);cx.fill();
      cx.fillStyle='rgba(0,0,0,.18)';cx.fillRect(gx-1*u,gy-.3*u,3*u,.8);
      // 水筒の湯気
      const th=PROP.thermos;
      for(let i=0;i<3;i++){const f=((t*.35+i/3)%1);cx.strokeStyle=`rgba(230,225,255,${.16*(1-f)})`;cx.lineWidth=2*u;cx.beginPath();
        const yy=th.y-f*26*u;cx.moveTo(th.x+Math.sin(t+i*2+f*5)*3*u,yy);cx.quadraticCurveTo(th.x+Math.sin(t*1.3+i+f*6)*5*u,yy-5*u,th.x+Math.sin(t+i*2+f*5+1)*3*u,yy-10*u);cx.stroke();}
    }

    // ── 更新 ──
    function update(dt){
      clock+=dt;
      rzT+=dt;if(rzT>.5){rzT=0;resize();}
      ambT+=dt;if(ambT>1){ambT=0;SFX.ambSet();}
      if(msgT>0)msgT-=dt;
      if(banner){banner.t+=dt;if(banner.t>banner.dur)banner=null;}
      lhAng+=dt*.85;
      nightLv+=((state==='ending'||state==='fadeout'?.16:timeIdx*.08)-nightLv)*Math.min(1,dt*.6);
      plank.forEach(p=>{p.ph+=dt*p.sp;p.x+=p.vx*dt;if(p.x<-4)p.x=W+4;if(p.x>W+4)p.x=-4;p.b=Math.max(0,p.b-dt*.5);});
      drops.forEach(d=>{d.y+=d.s*dt;d.x-=d.s*dt*.12;if(d.y>H){d.y=rnd(-40,-10);d.x=rnd(0,W*1.1);}});
      if(WEATHER==='rain'&&Math.random()<dt*16){const y=rnd(HZ+6,PY-4);ring(rnd(0,W),y,1,.3,'170,180,230',.8);}
      if(Math.random()<dt*.5)ring(GEN.float.x,GEN.float.y,2,.22,'170,255,190',1.8);
      rings.forEach(r=>{if(r.t>0)r.t-=dt;});
      parts.forEach(p=>{if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;}});
      if(bucketT>0)bucketT=Math.max(0,bucketT-dt*1.4);
      if(genTwitch>0)genTwitch=Math.max(0,genTwitch-dt*1.5);else if(Math.random()<dt*.05)genTwitch=1;
      if(talk.on){const L=talk.lines[talk.i];if(talk.shown<L.text.length){talk.shown=Math.min(L.text.length,talk.shown+dt*36);tkText.textContent=L.text.slice(0,Math.floor(talk.shown));}}
      // カメラ
      const camT=(state==='charge'||state==='fly'||state==='wait'||state==='bite')?-aim*9:state==='reel'?-aim*6:0;
      camX+=(camT-camX)*Math.min(1,dt*2);
      if(paused)return;
      stT+=dt;
      if(state==='black'){camOff=H*.45;fadeA=Math.max(0,1-stT/1.1);if(stT>1.1){setState('title');}}
      else if(state==='title'){camOff=H*.45;fadeA=0;}
      else if(state==='pan'){const f=Math.min(1,stT/1.7);camOff=H*.45*(1-ease(f));if(f>=1){camOff=0;startStory();}}
      else camOff=0;
      // ウキ
      fl.sink+=((state==='bite'?1:0)+fl.sinkT-fl.sink)*Math.min(1,dt*(state==='bite'?10:6));
      fl.sinkT=Math.max(0,fl.sinkT-dt*2.2);
      if(fl.vis&&(state==='wait'||state==='bite')&&Math.random()<dt*.6)ring(fl.x,fl.y,2,.28,'200,230,255',1.8);

      if(state==='charge'){
        power+=powDir*dt*.9;
        if(power>=1){power=1;powDir=-1;}if(power<=0){power=0;powDir=1;}
        if(keys.l||keys.r)aim=clamp(aim+((keys.r?1:0)-(keys.l?1:0))*dt*1.5,-1,1);
      }else if(state==='fly'){
        const f=Math.min(1,stT/.95);
        const e=1-Math.pow(1-f,2);
        fl.x=lerp(fl.sx,fl.tx,e);fl.y=lerp(fl.sy,fl.ty,e)-Math.sin(f*Math.PI)*H*.16*(.5+fl.castP*.6);
        if(f>=1)landed();
      }else if(state==='wait'){
        const s=scaleAt(fl.y);
        if(stT>.8){shadow.on=true;shadow.a=Math.min(1,shadow.a+dt*.8);}
        const f=clamp((stT-.8)/Math.max(.5,waitT-1.3),0,1);
        shadow.dart=Math.max(0,shadow.dart-dt*2.5);
        shadow.r=lerp(80,14,ease(f))*(1-shadow.dart*.8);
        shadow.ang+=dt*(.5+f*.9);
        shadow.x=fl.x+Math.cos(shadow.ang)*shadow.r*s;shadow.y=fl.y+7*s+Math.sin(shadow.ang)*shadow.r*s*.32;
        if(cur&&cur.big&&stT>1.4&&stT-dt<=1.4)showBanner('大物の気配……','影が、でかい','#ff9ab0');
        if(nibbles.length&&stT>=nibbles[0]){nibbles.shift();fl.sinkT=.45;shadow.dart=1;ring(fl.x,fl.y,2,.5,'200,230,255',1.2);SFX.nibble();}
        if(stT>=waitT){
          setState('bite');SFX.plop();se('notif');buzz(60);
          splash(fl.x,fl.y,8,70);ring(fl.x,fl.y,3,.8,'120,255,230',1.5);ring(fl.x,fl.y,1,.6,'255,255,255',.9);
          say('今！ タップ！','#44ee88',1.3);
          if(clock-pressBuf<.28)hook(); // 少し早押しでも拾う
        }
      }else if(state==='bite'){
        if(stT>1.35){
          misses++;shadow.r=60;shadow.dart=0;
          if(misses>=2){escape('……エサだけ取られた。まあ、いいわ。');}
          else{setState('wait');scheduleBite(rnd(2.2,3.6));say('……離れた。また来るかも','#8e80b0',1.8);}
        }
      }else if(state==='reel'){
        const R=reel,c=cur;
        R.grace-=dt;R.fcd-=dt;
        if(R.fcd<=0){
          const b=c.sp.beh;
          if(b==='calm'){R.ft=clamp(R.f+rnd(-.3,.3),.05,.95);R.fcd=rnd(.9,1.8);}
          else if(b==='dart'){R.ft=Math.random()<.35?(R.f<.5?rnd(.75,.98):rnd(.02,.25)):rnd(.05,.95);R.fcd=rnd(.5,1.2);}
          else if(b==='sink'){R.ft=Math.random()<.6?(Math.random()<.5?rnd(.03,.18):rnd(.82,.97)):rnd(.3,.7);R.fcd=rnd(1.1,2);}
          else{R.ft=clamp(R.f+rnd(-.12,.12),.2,.8);R.fcd=rnd(1.4,2.4);}
        }
        const k={calm:3.2,dart:5.2,sink:2.6,item:1.5}[c.sp.beh]*(.8+c.str*.5)*RSPD;
        R.fv+=((R.ft-R.f)*k*k-1.6*k*R.fv)*dt;R.f+=R.fv*dt;
        if(R.f<0){R.f=0;R.fv=Math.abs(R.fv)*.3;}if(R.f>1){R.f=1;R.fv=-Math.abs(R.fv)*.3;}
        R.zv+=(holding?2.8:-2.4)*dt;R.zv=clamp(R.zv,-1.5,1.5);R.z+=R.zv*dt;
        if(R.z<0){R.z=0;R.zv=R.zv<-.4?-R.zv*.3:0;}
        if(R.z>1-R.zw){R.z=1-R.zw;R.zv=R.zv>.4?-R.zv*.3:0;}
        R.inside=R.f>=R.z-.015&&R.f<=R.z+R.zw+.015;
        R.pr+=(R.inside?(c.sp.beh==='item'?.4:.3):(R.grace>0?0:-RDECAY))*dt;
        const off=R.inside?0:Math.min(Math.abs(R.f-R.z),Math.abs(R.f-R.z-R.zw));
        const tt=R.inside?.28+Math.min(.35,Math.abs(R.fv)*.45):.62+Math.min(.38,off*1.6);
        tension+=(tt-tension)*Math.min(1,dt*6);
        R.splT-=dt;
        if(Math.abs(R.fv)>.75&&R.splT<=0){R.splT=.35;splash(fl.x,fl.y,5,95);SFX.splash(false);}
        if(holding){R.clickT-=dt;if(R.clickT<=0){SFX.click();R.clickT=.075;}}
        if(R.pr>=1){caught();}
        else if(R.pr<=0){escape('……ふっと軽くなった。逃げられた。');}
        else{
          const s=scaleAt(fl.y);
          const near={x:W*.64,y:PY-10};
          const sway=(R.f-.5)*30*s+Math.sin(clock*(Math.abs(R.fv)>.6?18:2.2))*2.5*s;
          const pp=clamp(R.pr,0,1)*.88;
          fl.x=lerp(fl.tx,near.x,pp)+sway;fl.y=lerp(fl.ty,near.y,pp);
          if(Math.random()<dt*3)ring(fl.x,fl.y,2,.35,'200,230,255',.9);
        }
      }else if(state==='after'){
        if(stT>1.8)nextOrEnd();
      }else if(state==='ending'){
        const pg=gradeT;gradeT+=dt;
        if(pg<.6&&gradeT>=.6){SFX.stamp();se('rank');buzz(50);if(grade==='S')SFX.chime();}
        if(pg<1.7&&gradeT>=1.7)talkStart(endingLines(),()=>{setState('fadeout');});
      }else if(state==='fadeout'){
        fadeA=Math.min(1,stT/.9);
        if(stT>=1&&!mg._ended){mg.end('done');return;}
      }
      hud();
    }
    function hud(){
      const html=`釣果 <span style="color:var(--tx-b)">${catches.length}</span>　図鑑 <span style="color:var(--cy)">${zCount()}</span>/${SPECIES.length}`+(rareCaught?'　<span style="color:var(--gd)">★</span>':'');
      if(html!==lastHud){lastHud=html;mg.setScore(html);}
      const tm=state==='black'||state==='title'||state==='pan'||state==='story'||state==='howto'?'READY':state==='ending'||state==='fadeout'?'評価 '+grade:`${TIMES[Math.min(2,Math.floor((CASTS-castsLeft-(state==='ready'||state==='charge'?0:1))/2))]}　のこり${castsLeft}投`;
      if(tm!==lastTm){lastTm=tm;mg.setTimer(tm);}
    }

    // ── 描画 ──
    function draw(){
      const t=clock;
      cx.setTransform(dpr,0,0,dpr,0,0);
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
      // 遠景はカメラ位置が変わったときだけ合成し直す
      const key=`${Math.round(camX*2)}|${Math.round(camOff)}|${Math.round(nightLv*200)}|${W}|${H}|${dpr}`;
      if(key!==bgKey){
        bgKey=key;
        if(!bgCache||bgCache.width!==cv.width||bgCache.height!==cv.height){bgCache=document.createElement('canvas');bgCache.width=cv.width;bgCache.height=cv.height;bgG=bgCache.getContext('2d');}
        const g=bgG;g.setTransform(dpr,0,0,dpr,0,0);g.globalAlpha=1;
        g.drawImage(lySky,-M+camX*.15,-lySky._top+camOff*.35,W+M*2,lySky.height/dpr);
        g.drawImage(lyFar,-M+camX*.4,camOff*.8,W+M*2,lyFar.height/dpr);
        g.drawImage(lyWater,-M+camX*.6,HZ+camOff*.9,W+M*2,H-HZ);
        g.drawImage(lyMid,-M+camX*.7,lyMid._y+camOff*.92,W+M*2,lyMid.height/dpr);
        if(nightLv>.005){g.fillStyle=`rgba(3,2,14,${nightLv})`;g.fillRect(0,0,W,H);}
      }
      cx.setTransform(1,0,0,1,0,0);cx.drawImage(bgCache,0,0);cx.setTransform(dpr,0,0,dpr,0,0);
      for(const s of stars){const a=.3+.7*Math.max(0,Math.sin(t*s.sp+s.ph));cx.fillStyle=`rgba(240,236,255,${a*.8})`;cx.fillRect(s.x+camX*.15-.5,s.y+camOff*.35-.5,1.6,1.6);}
      drawRefl(t);
      drawLights(t);
      // 水面の物（ひとまとめに少しだけ視差）
      cx.save();cx.translate(camX*.8,camOff*.95);
      drawGenFloat(t);
      drawRings();
      drawPlankton(t);
      drawShadow(t);
      drawFloat(t);
      drawParts();
      if(state==='charge')drawAim(t);
      cx.restore();
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
      // 手前（岸壁と人物）
      cx.save();cx.translate(camX,camOff);
      cx.drawImage(lyPier,-M,PY,W+M*2,H-PY+2);
      cx.globalCompositeOperation='lighter';
      gl(glow.wm,PROP.lantern.x,PROP.lantern.y,30*U+Math.sin(t*7)*1.5,.55+Math.sin(t*11)*.05);
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      if(bucketT>0){for(let i=0;i<5;i++){const a=-Math.PI/2+(i-2)*.35;const f=1-bucketT;cx.fillStyle=`rgba(170,230,255,${bucketT})`;cx.beginPath();cx.arc(PROP.bucket.x+Math.cos(a)*f*18*U,PROP.bucket.y-4*U+Math.sin(a)*f*20*U+f*f*16*U,1.6*U,0,7);cx.fill();}}
      drawGen();
      const rg=rodGeom();
      drawLine(rg,t);
      const rp=drawHero(rg);
      if(state==='card'&&lastCatch)drawDangle(rp,t);
      cx.restore();
      drawRain();
      cx.globalAlpha=1;
      cx.drawImage(lyVig,0,0,W,H);
      drawUI(t);
      drawBanner();
      if(state==='black'||state==='title'||state==='pan')drawTitle(t);
      if(state==='ending'||state==='fadeout')drawEnding(t);
      if(fadeA>0){cx.fillStyle=`rgba(3,2,8,${fadeA})`;cx.fillRect(0,0,W,H);}
    }
    let rfC=null,rfG=null,rfN=0;
    function drawRefl(t){
      // 映り込みは2フレームに1回だけ描き直して、加算で重ねる
      const rh=Math.max(1,PY-HZ);
      if(!rfC||rfC.width!==Math.round(W*dpr)||rfC.height!==Math.round(rh*dpr)){rfC=document.createElement('canvas');rfC.width=Math.round(W*dpr);rfC.height=Math.round(rh*dpr);rfG=rfC.getContext('2d');rfN=0;}
      if((rfN++)%2===0){
        const sv=cx;cx=rfG;
        cx.setTransform(dpr,0,0,dpr,0,-HZ*dpr);cx.clearRect(0,HZ,W,rh);
        reflBody(t);
        cx=sv;
      }
      cx.globalCompositeOperation='lighter';cx.globalAlpha=1;
      cx.drawImage(rfC,0,HZ+camOff*.9,W,rh);
      cx.globalCompositeOperation='source-over';
    }
    function reflBody(t){
      const m=BR.moon;
      const mAmp=(WEATHER==='rain'?.55:WEATHER==='mist'?.7:1)*(.25+BR.lit*.75);
      const mx=m.x+camX*.15,oy=0;
      for(let y=HZ+1;y<PY;){
        const d=depthAt(y);
        const step=1.2+d*5.5;
        const n=Math.sin(y*.31+t*1.7)*.5+Math.sin(y*.13-t*1.1)*.5;
        const w=(m.r*.5+d*W*.13)*(.35+.65*Math.abs(n));
        const ox=Math.sin(y*.07+t*.9)*(2+d*14)+Math.sin(y*.21-t*1.6)*d*6;
        const a=(.07+.3*(1-d)*(.5+.5*n))*mAmp;
        if(a>.01){cx.fillStyle=`rgba(232,226,255,${a})`;cx.fillRect(mx+ox-w/2,y+oy,w,Math.max(1,step*.45));}
        const sp=Math.sin(t*3+y*1.7);
        if(sp>.75){cx.fillStyle=`rgba(255,255,255,${(sp-.75)*2*mAmp})`;cx.fillRect(mx+ox+w*Math.sin(y)*.45,y+oy,2+d*3,1);}
        y+=step;
      }
      const fx=camX*.4;
      for(const l of BR.lights){
        if(!l.refl)continue;
        for(let i=0;i<4;i++){
          const y=HZ+2+l.ph*.6+i*i*(1.8+l.ph*.12)+i*2+Math.sin(l.ph*7+i)*1.5;const ox=Math.sin(t*2.1+l.ph+i*1.3)*(1+i*.6);
          cx.fillStyle=`rgba(${l.c},${(.24-i*.042)*(.6+.4*Math.sin(t*1.5+l.ph*3+i))})`;cx.fillRect(l.x+fx+ox-.8,y+oy,1.4+i*.35,1.4+i*.6);
        }
      }
      for(const l of townRefl){
        for(let i=0;i<4;i++){const y=HZ+2+l.dy+i*l.len*.35;const ox=Math.sin(t*1.8+l.ph+i*1.7)*(1+i*.5);
          cx.fillStyle=`rgba(${l.c},${l.a*(1-i*.24)})`;cx.fillRect(l.x+fx+ox,y+oy,1.2+i*.2,1.4+i*.4);}
      }
    }
    function drawLights(t){
      cx.globalCompositeOperation='lighter';
      const fx=camX*.4,fy=camOff*.8,mx=camX*.7,my=camOff*.92;
      const blink=(Math.sin(t*2.6)+1)/2;
      [BR.t1,BR.t2].forEach(x=>{gl(glow.rd,x+fx,BR.top-2+fy,7,.5+blink*.5);});
      const rb=(t%4)<.9?1:.12;
      gl(glow.rd,RL.x+mx,RL.top-1+my,rb>.5?14:6,rb);
      if(rb>.5){cx.globalAlpha=1;cx.fillStyle='rgba(255,80,70,.3)';for(let i=0;i<4;i++)cx.fillRect(RL.x+mx-1+Math.sin(t*2+i)*1.5,RL.y+my+2+i*4,2,2);}
      const s=Math.sin(lhAng),c=Math.cos(lhAng);
      const lx=LH.x+mx,ly=LH.lamp+my;
      const ex=lx+s*W*1.1,ey=ly-c*H*.012;
      const facing=Math.max(0,c);
      const beamA=(.12+.1*(1-Math.abs(s)))*(WEATHER==='mist'?1.6:WEATHER==='rain'?1.25:1);
      if(Math.abs(s)>.04){
        const bg=cx.createLinearGradient(lx,ly,ex,ey);
        bg.addColorStop(0,`rgba(255,248,220,${beamA*1.6})`);bg.addColorStop(.35,`rgba(255,248,220,${beamA*.6})`);bg.addColorStop(1,'rgba(255,248,220,0)');
        cx.fillStyle=bg;cx.globalAlpha=1;
        const sp=H*.012+Math.abs(s)*H*.03;
        cx.beginPath();cx.moveTo(lx,ly-1);cx.lineTo(ex,ey-sp);cx.lineTo(ex,ey+sp*.7);cx.lineTo(lx,ly+1);cx.closePath();cx.fill();
      }
      gl(glow.wt,lx,ly,8+facing*facing*facing*38,.55+facing*.45);
      const ra=.18+Math.pow(facing,3)*.5;
      for(let i=0;i<8;i++){const y=LH.y+my+2+i*i*1.6+i*2;const ox=Math.sin(t*2+i*1.4)*(1+i*.7);
        cx.globalAlpha=ra*(1-i/8);cx.fillStyle='rgba(255,248,220,1)';cx.fillRect(lx+ox-1.5-i*.4,y,3+i*.8,1.5+i*.4);}
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
    }
    function drawGenFloat(t){
      const x=GEN.float.x,y=GEN.float.y+Math.sin(t*1.4+1)*1.1,s=scaleAt(y);
      cx.globalCompositeOperation='lighter';
      gl(glow.gn,x,y-24*s,12*s+2,.85);gl(glow.gn,x,y+3*s,10*s,.25);
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      cx.fillStyle='#d8d0e8';cx.fillRect(x-1.2*s,y-22*s,2.4*s,22*s);
      cx.fillStyle='#e9fff0';cx.fillRect(x-1*s,y-26*s,2*s,3*s);
    }
    function drawRings(){
      cx.lineWidth=1;
      for(const r of rings){
        if(r.t<=0)continue;
        const f=1-r.t/r.max;
        const rad=(r.r+f*28)*r.s;
        cx.strokeStyle=`rgba(${r.c},${r.a*(1-f)})`;
        cx.beginPath();cx.ellipse(r.x,r.y,rad,rad*.28,0,0,7);cx.stroke();
      }
    }
    function drawPlankton(t){
      cx.globalCompositeOperation='lighter';
      const boost=1+nightLv*4;
      for(const p of plank){
        const s=scaleAt(p.y);
        const a=(.12+.22*Math.max(0,Math.sin(p.ph)))*(.5+s*.5)*boost+p.b*.8;
        gl(glow.cy,p.x,p.y,(4+p.b*6)*s+2,a);
      }
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
    }
    function drawShadow(t){
      if(!shadow.on||!cur||!(state==='wait'||state==='bite'))return;
      const s=scaleAt(fl.y),sp=cur.sp;
      const len=(sp.beh==='item'?10:clamp(cur.size*.55,7,44))*s*(1+(cur.big?.25:0));
      const a=shadow.a*(state==='bite'?.5:1);
      const x=state==='bite'?fl.x:shadow.x,y=state==='bite'?fl.y+6*s:shadow.y;
      const ang=state==='bite'?Math.PI/2:shadow.ang+Math.PI/2;
      cx.save();cx.translate(x,y);cx.scale(1,.38);cx.rotate(ang);
      if(sp.id==='ika'){cx.globalCompositeOperation='lighter';gl(glow.bl,0,0,len*1.4,.35*a*(.7+.3*Math.sin(t*4)));cx.globalCompositeOperation='source-over';cx.globalAlpha=1;}
      if(sp.id==='suzu'&&Math.sin(t*5)>.6){cx.globalCompositeOperation='lighter';gl(glow.wm,0,0,len,.4*a);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;}
      cx.fillStyle=`rgba(2,2,10,${.5*a})`;
      if(sp.beh==='item'||sp.kind==='crab'){cx.beginPath();cx.arc(0,0,len*.6,0,7);cx.fill();}
      else{
        const w=Math.sin(t*(state==='bite'?14:5))*.35;
        cx.beginPath();cx.ellipse(len*.12,0,len*.5,len*(sp.kind==='ribbon'||sp.kind==='eel'?.09:.2),0,0,7);cx.fill();
        cx.beginPath();cx.moveTo(-len*.3,0);cx.lineTo(-len*.62,-len*.18+w*len*.2);cx.lineTo(-len*.62,len*.18+w*len*.2);cx.closePath();cx.fill();
      }
      cx.restore();cx.globalAlpha=1;
    }
    function drawFloat(t){
      if(!fl.vis)return;
      const s=scaleAt(state==='fly'?lerp(fl.sy,fl.ty,Math.min(1,stT/.95)):fl.y)*1.15;
      const bob=state==='fly'?0:Math.sin(t*1.6)*1.2*s;
      const x=fl.x,y=fl.y+bob;
      const sink=fl.sink;
      const hgt=26*s*(1-sink*.9);
      if(state==='reel'&&cur){
        const ws=s*(12+cur.sf*12);
        cx.fillStyle='rgba(2,2,8,.45)';cx.save();cx.translate(x+Math.sin(t*6)*3*s,y+8*s);cx.rotate(Math.sin(t*(Math.abs(reel.fv)>.6?14:4))*.25);
        cx.beginPath();cx.ellipse(0,0,ws,ws*.28,0,0,7);cx.fill();cx.restore();
      }
      if(state!=='fly'){
        cx.globalCompositeOperation='lighter';
        gl(glow.rd,x,y+2*s,16*s,.35*(1-sink*.6));
        cx.fillStyle=`rgba(255,110,90,${.25*(1-sink*.5)})`;
        for(let i=0;i<4;i++)cx.fillRect(x-2*s+Math.sin(t*2+i)*s,y+3*s+i*3*s,4*s,1.2*s);
        cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
        cx.fillStyle='rgba(180,200,255,.35)';cx.beginPath();cx.ellipse(x,y,5*s,1.5*s,0,0,7);cx.fill();
      }
      const top=y-hgt;
      if(hgt>1){
        cx.fillStyle='#ece4f4';cx.fillRect(x-1.7*s,top+4*s,3.4*s,Math.max(0,hgt-5*s));
        cx.fillStyle='#ff6a3a';cx.fillRect(x-1.7*s,top+4*s,3.4*s,Math.min(hgt*.35,7*s));
        cx.fillStyle='rgba(0,0,0,.25)';cx.fillRect(x+.6*s,top+4*s,1.1*s,Math.max(0,hgt-5*s));
        if(state==='fly'){cx.fillStyle='#d8d0e8';cx.beginPath();cx.ellipse(x,top+hgt+4*s,3.5*s,7*s,0,0,7);cx.fill();}
      }
      cx.globalCompositeOperation='lighter';
      const tipY=state==='fly'?top+2*s:Math.min(top+2*s,y+1);
      const under=state==='bite'&&sink>.6;
      gl(under?glow.cy:glow.rd,x,tipY,(under?20:15)*s+3,under?.55:.95);
      cx.globalAlpha=1;cx.fillStyle=under?'rgba(180,255,240,.7)':'#fff1e6';cx.fillRect(x-1.2*s,tipY-2*s,2.4*s,3*s);
      cx.globalCompositeOperation='source-over';
      if(state==='bite'){
        const a=.6+.4*Math.sin(t*16),sc=1+Math.max(0,.4-stT)*1.5;
        cx.fillStyle=`rgba(68,238,136,${a})`;cx.font=`${Math.round((18*s+8)*sc)}px ${FONT}`;cx.textAlign='center';cx.textBaseline='bottom';
        cx.fillText('！',x,top-6*s);
      }
    }
    function drawParts(){
      cx.globalCompositeOperation='lighter';
      for(const p of parts){if(p.life<=0)continue;const s=scaleAt(p.gy||p.y);gl(p.c==='cy'?glow.cy:glow.wt,p.x,p.y,5*s+1.5,p.life/p.max*.8);}
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
    }
    function drawAim(t){
      // 力と狙いから着水点を予想して弧を描く
      const rg=rodGeom();
      const d=lerp(.8,.08,power);
      const ty=HZ+(PY-HZ)*d,tx=clamp(W*.6+aim*W*.26,W*.32,W*.9);
      const sx=rg.tx-camX*.8,sy=rg.ty;
      const hgt=H*.16*(.5+power*.6);
      cx.fillStyle='rgba(222,204,248,.75)';
      for(let i=1;i<18;i++){const f=i/18;const e=1-Math.pow(1-f,2);const x=lerp(sx,tx,e),y=lerp(sy,ty,e)-Math.sin(f*Math.PI)*hgt;
        const ph=(f*18-t*6)%3;cx.globalAlpha=(ph<1?.85:.35)*(1-f*.3);cx.beginPath();cx.arc(x,y,1.6,0,7);cx.fill();}
      cx.globalAlpha=1;
      const s=scaleAt(ty),z=zoneOf(ty);
      const col=['0,232,200','138,82,212','232,184,48'][z];
      cx.strokeStyle=`rgba(${col},${.6+.3*Math.sin(t*6)})`;cx.lineWidth=1.4;
      cx.beginPath();cx.ellipse(tx,ty,14*s+3,(14*s+3)*.3,0,0,7);cx.stroke();
      cx.beginPath();cx.ellipse(tx,ty,6*s+2,(6*s+2)*.3,0,0,7);cx.stroke();
      cx.font=`11px ${FONT}`;cx.textAlign='center';cx.textBaseline='bottom';cx.fillStyle=`rgba(${col},.95)`;
      cx.fillText(ZONE[z],tx,ty-6*s-4);
    }
    function drawLine(rg,t){
      if(!fl.vis)return;
      const p=rodPath(rg);
      const s=scaleAt(fl.y)*1.15;
      const ox=camX*(.8-1),oy=camOff*(.95-1);
      const fx=fl.x+ox,fy=(state==='fly'?fl.y-26*s:fl.y-26*s*(1-fl.sink*.9)+Math.sin(t*1.6)*1.2*s)+oy;
      const slack=state==='reel'?(1-tension)*30:state==='fly'?10:40;
      cx.strokeStyle='rgba(225,225,245,.36)';cx.lineWidth=.8;
      cx.beginPath();cx.moveTo(p.tx,p.ty);cx.quadraticCurveTo((p.tx+fx)/2,Math.max(p.ty,fy)+slack,fx,fy);cx.stroke();
      if(state==='reel'&&tension>.78){cx.strokeStyle=`rgba(232,48,85,${(tension-.78)*2.2})`;cx.stroke();}
    }
    function drawDangle(rp,t){
      const sw=Math.sin(t*2.4)*.25;
      const L=Math.min(46,36*U);
      cx.strokeStyle='rgba(225,225,245,.4)';cx.lineWidth=.8;
      const ex=rp.tx+Math.sin(sw)*16*U,ey=rp.ty+16*U;
      cx.beginPath();cx.moveTo(rp.tx,rp.ty);cx.lineTo(ex,ey);cx.stroke();
      cx.save();cx.translate(ex,ey+L*.42);cx.rotate(Math.PI/2+sw*.6);
      drawCreature(cx,lastCatch.sp,lastCatch.sp.kind==='ribbon'||lastCatch.sp.kind==='eel'?L*1.6:L,t,false);
      cx.restore();
    }
    function drawRain(){
      if(!drops.length)return;
      cx.strokeStyle='rgba(170,170,230,.22)';cx.lineWidth=.8;cx.beginPath();
      for(const d of drops){cx.moveTo(d.x,d.y);cx.lineTo(d.x+d.l*.12,d.y-d.l);}
      cx.stroke();
    }
    function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();}
    function drawUI(t){
      cx.textAlign='center';cx.textBaseline='middle';
      const gy=PY-H*.1;
      if(state==='charge'){
        const w=Math.min(W*.62,260),x=(W-w)/2;
        cx.fillStyle='rgba(8,6,20,.72)';rr(x-4,gy-9,w+8,18,9);cx.fill();
        const gg=cx.createLinearGradient(x,0,x+w,0);gg.addColorStop(0,'#00e8c8');gg.addColorStop(.55,'#8a52d4');gg.addColorStop(1,'#e8b830');
        cx.fillStyle=gg;rr(x,gy-5,Math.max(4,w*power),10,5);cx.fill();
        cx.fillStyle='rgba(255,255,255,.18)';[.42,.7].forEach(f=>cx.fillRect(x+w*(1-(f-.08)/.72)-.5,gy-7,1,14));
        cx.strokeStyle='rgba(222,204,248,.35)';cx.lineWidth=1;rr(x-4,gy-9,w+8,18,9);cx.stroke();
        cx.font=`11px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText('離して投げる　←なぞって狙い→',W/2,gy+20);
      }
      if(state==='reel'&&cur){
        const R=reel,w=Math.min(W*.8,300),x=(W-w)/2,y=gy-6;
        cx.fillStyle='rgba(6,5,18,.78)';rr(x-8,y-24,w+16,52,12);cx.fill();
        cx.strokeStyle='rgba(138,82,212,.45)';cx.lineWidth=1;rr(x-8,y-24,w+16,52,12);cx.stroke();
        // 溝
        cx.fillStyle='rgba(255,255,255,.06)';rr(x,y-9,w,18,9);cx.fill();
        // 枠（光の枠）
        const zx=x+R.z*w,zw=R.zw*w;
        cx.globalCompositeOperation='lighter';
        cx.fillStyle=R.inside?'rgba(0,232,200,.32)':'rgba(138,82,212,.25)';rr(zx,y-11,zw,22,8);cx.fill();
        if(R.inside){gl(glow.cy,zx+zw/2,y,zw*.6,.25);}
        cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
        cx.strokeStyle=R.inside?'#00e8c8':'rgba(190,160,240,.7)';cx.lineWidth=1.5;rr(zx,y-11,zw,22,8);cx.stroke();
        // 魚アイコン
        const fx=x+R.f*w;
        cx.save();cx.translate(fx,y);if(R.fv<-.05)cx.scale(-1,1);
        const sp=cur.sp,iconL=sp.kind==='ribbon'||sp.kind==='eel'?34:sp.beh==='item'||sp.kind==='crab'?22:24;
        if(Math.abs(R.fv)>.6)cx.rotate(Math.sin(t*30)*.12);
        drawCreature(cx,sp,iconL,t,false);
        cx.restore();
        // 進み具合
        cx.fillStyle='rgba(68,238,136,.15)';rr(x,y+15,w,4,2);cx.fill();
        cx.fillStyle=R.pr>.25?'#44ee88':'#e8b830';rr(x,y+15,Math.max(3,w*clamp(R.pr,0,1)),4,2);cx.fill();
        cx.font=`10px ${FONT}`;cx.textAlign='left';cx.fillStyle='rgba(222,204,248,.8)';cx.fillText(R.inside?'寄ってきてる':'枠からはずれた',x,y-17);
        cx.textAlign='right';cx.fillStyle='#bff6ee';cx.fillText(`のこり ${((1-R.pr)*(14+fl.castP*20)).toFixed(1)}m`,x+w,y-17);
        cx.textAlign='center';
      }
      let m='',mc='#bbaedd',ma=1;
      if(msgT>0){m=msg;mc=msgCol;ma=Math.min(1,msgT*2);}
      else if(state==='ready'){m=castsLeft===CASTS?'長押しでためて、離して投げる':'長押しで、もう一投';ma=.6+.4*Math.sin(t*2.4);}
      else if(state==='wait'){m='……';ma=.5;}
      if(m){
        cx.globalAlpha=ma;cx.font=`13px ${FONT}`;
        const y=state==='reel'?gy-50:gy;
        const tw=cx.measureText(m).width;
        cx.fillStyle='rgba(5,4,14,.6)';rr(W/2-tw/2-12,y-12,tw+24,24,12);cx.fill();
        cx.fillStyle=mc;cx.fillText(m,W/2,y+1);
        cx.globalAlpha=1;
      }
    }
    function drawBanner(){
      if(!banner)return;
      const b=banner,f=b.t/b.dur;
      const a=f<.15?f/.15:f>.75?(1-f)/.25:1;
      const y=H*.24;
      cx.globalAlpha=a;cx.textAlign='center';cx.textBaseline='middle';
      const g=cx.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(5,4,14,0)');g.addColorStop(.5,'rgba(5,4,14,.7)');g.addColorStop(1,'rgba(5,4,14,0)');
      cx.fillStyle=g;cx.fillRect(0,y-26,W,52);
      cx.font=`18px ${FONT}`;cx.fillStyle=b.col;cx.fillText(b.main,W/2,y-6);
      cx.font=`11px ${FONT}`;cx.fillStyle='#bbaedd';cx.fillText(b.sub,W/2,y+14);
      cx.globalAlpha=1;
    }
    function drawTitle(t){
      const a=state==='pan'?Math.max(0,1-stT/.8):1;
      if(a<=0)return;
      const y0=H*.42;
      cx.save();cx.globalAlpha=a;cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`12px ${FONT}`;cx.fillStyle='rgba(191,246,238,.85)';cx.fillText('─ 壇ノ浦・夜の港で ─',W/2,y0-48);
      // ロゴ
      const fs=Math.round(Math.min(58,W*.15));
      cx.font=`${fs}px ${FONT}`;
      cx.shadowColor='rgba(120,200,255,.8)';cx.shadowBlur=18;
      const lg=cx.createLinearGradient(0,y0-fs/2,0,y0+fs/2);lg.addColorStop(0,'#ffffff');lg.addColorStop(.6,'#deccf8');lg.addColorStop(1,'#8fb8ff');
      cx.fillStyle=lg;cx.fillText('夜 釣 り',W/2,y0);
      cx.shadowBlur=0;
      // 水面の反射のようなロゴの影
      cx.globalAlpha=a;
      // ウキの飾り
      const fx=W/2+fs*2.1,fy=y0-fs*.35+Math.sin(t*1.6)*2;
      cx.globalCompositeOperation='lighter';gl(glow.rd,fx,fy-10,16,.9);cx.globalCompositeOperation='source-over';cx.globalAlpha=a;
      cx.fillStyle='#ece4f4';cx.fillRect(fx-2,fy-8,4,20);cx.fillStyle='#ff6a3a';cx.fillRect(fx-2,fy-8,4,6);
      cx.strokeStyle='rgba(225,225,245,.4)';cx.lineWidth=.8;cx.beginPath();cx.moveTo(fx,fy-8);cx.quadraticCurveTo(fx+20,fy-60,fx+50,fy-70);cx.stroke();
      cx.font=`15px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText('〜 頭を空っぽに 〜',W/2,y0+fs*.85);
      cx.font=`11px ${FONT}`;cx.fillStyle='rgba(187,174,221,.8)';
      const b=FD.best;
      cx.fillText(`今夜：${WNAME}・${MOON_NAME}　図鑑 ${zCount()}/${SPECIES.length}`+(b?`　最高評価 ${b.grade}`:''),W/2,y0+fs*.85+26);
      cx.fillStyle=DIFF==='easy'?'#44ee88':DIFF==='normal'?'#e8b830':'#ff6a86';cx.fillText('難しさ：'+MG_DIFF_NAMES[DIFF],W/2,y0-70);
      if(state==='title'){cx.font=`14px ${FONT}`;cx.fillStyle=`rgba(222,204,248,${.45+.45*Math.sin(t*3)})`;cx.fillText('タップではじめる',W/2,H*.6);}
      cx.restore();
    }
    function drawEnding(t){
      const a=Math.min(1,gradeT/.5);
      cx.fillStyle=`rgba(4,3,12,${a*.55})`;cx.fillRect(0,0,W,H);
      const gx=W/2,gy=H*.47;
      const col={S:'232,184,48',A:'0,232,200',B:'138,82,212',C:'160,150,190'}[grade];
      cx.save();cx.globalAlpha=a;cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`12px ${FONT}`;cx.fillStyle='#bbaedd';cx.fillText('今夜の釣り',gx,gy-70);
      if(gradeT>.25){
        const f=clamp((gradeT-.25)/.35,0,1);
        const sc=lerp(2.4,1,ease(f))+(gradeT>.6&&gradeT<.8?Math.sin((gradeT-.6)/.2*Math.PI)*.08:0);
        cx.save();cx.translate(gx,gy);cx.scale(sc,sc);cx.rotate(-.12);cx.globalAlpha=f;
        cx.globalCompositeOperation='lighter';gl(grade==='S'?glow.wm:glow.cy,0,0,70,.35);cx.globalCompositeOperation='source-over';cx.globalAlpha=f;
        cx.strokeStyle=`rgba(${col},.95)`;cx.lineWidth=3;cx.beginPath();cx.arc(0,0,40,0,7);cx.stroke();
        cx.lineWidth=1;cx.beginPath();cx.arc(0,0,34,0,7);cx.stroke();
        cx.font=`50px ${FONT}`;cx.fillStyle=`rgba(${col},1)`;cx.fillText(grade,0,3);
        cx.restore();
      }
      // 釣果の並び
      const n=catches.length;
      if(gradeT>.7){
        cx.globalAlpha=Math.min(1,(gradeT-.7)*2);
        if(n){const cw=Math.min(52,(W-40)/n);
          catches.forEach((c,i)=>{const s=SP[c.id];const x=gx-(n-1)*cw/2+i*cw;cx.save();cx.translate(x,gy+66);
            cx.globalCompositeOperation='lighter';if(s.r===3)gl(glow.wm,0,0,22,.35);cx.globalCompositeOperation='source-over';cx.globalAlpha=Math.min(1,(gradeT-.7)*2);
            const L=s.kind==='ribbon'||s.kind==='eel'?cw*.95:s.beh==='item'||s.kind==='crab'?cw*.5:cw*.78;
            drawCreature(cx,s,L,t,false);cx.restore();
            if(c.isNew){cx.font=`9px ${FONT}`;cx.fillStyle='#44ee88';cx.fillText('NEW',x,gy+90);}});}
        cx.font=`12px ${FONT}`;cx.fillStyle='#deccf8';
        cx.fillText(n?`釣果 ${n}　図鑑 +${newSpecies}　スコア ${score}`:'釣果なし　……それも、夜釣り',gx,gy+112);
      }
      cx.restore();
    }

    // ── 起動 ──
    resize();
    const onResize=()=>{if(!mg._ended)resize();};
    window.addEventListener('resize',onResize);
    if(mg.onEnd)mg.onEnd(()=>{SFX.ambStop();window.removeEventListener('resize',onResize);});
    mg.loop(dt=>{update(dt);if(!mg._ended)draw();});

    return {result(reason){
      window.removeEventListener('resize',onResize);
      SFX.ambStop();
      
      const done=reason==='done';
      const names=catches.map(c=>SP[c.id].name);
      const uniq=[...new Set(names)];
      const fx=done?{mental:6+(rareCaught?1:0),fatigue:-4,hope:2}:{mental:2};
      const rare=[...new Set(catches.filter(c=>SP[c.id].r===3).map(c=>SP[c.id].name))];
      const summary=(done?`今夜の評価 <span class="up">${grade}</span><br>スコア <span class="up">${score}</span><br>`:'')+
        (catches.length?`釣果（${uniq.join('、')}） <span class="up">${catches.length}匹</span>`:'釣果なし。波の音を聞いていた。')+
        (newSpecies?`<br>魚図鑑に新しく登録（${zCount()}/${SPECIES.length}） <span class="up">+${newSpecies}種</span>`:`<br>魚図鑑 ${zCount()}/${SPECIES.length}`)+
        (rare.length?`<br>★ ${rare.join('、')} <span class="up">出会った</span>`:'')+`<br>今夜：${WNAME}・${MOON_NAME}`;
      return {
        title:done?`🎣 夜釣り、おしまい（評価${grade}）`:'🎣 早めに竿をたたんだ',
        summary,fx,time:done?60:20,sp:done&&newSpecies>0?1:0,
        log:done?(rare.length?`壇ノ浦の夜の港で釣りをした。${rare[0]}に出会った、不思議な夜。`:`夜の港で源さんと並んで釣り糸を垂れた。釣果${catches.length}、評価${grade}。`):'夜の港で少しだけ釣りをした。',
        cutin:done?(rare.length?['happy',`……${rare[0]}って。ほんとにいるのね、この海。`]:['happy','……波の音しか聞こえない。頭、空っぽになったわね。']):null,
      };
    }};
  },
});
