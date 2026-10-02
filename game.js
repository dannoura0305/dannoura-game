// ══ ボイス再生 ══
let _voiceAudio = null;
function playVoice(type, idx){
  const list = VOICE_DATA[type];
  if(!list || list.length === 0) return;
  const src = list[idx !== undefined ? idx : Math.floor(Math.random()*list.length)];
  if(!src) return;
  try{
    if(_voiceAudio){
      try{_voiceAudio.pause();}catch(e){}
      _voiceAudio = null;
    }
    const a = new Audio(src);
    a.volume = 1.0;
    _voiceAudio = a;
    a.play().catch(()=>{});
  }catch(e){}
}
const VOICE_DATA={
  normal: ['assets/voice/normal_1.m4a', 'assets/voice/normal_2.m4a', 'assets/voice/normal_3.m4a', 'assets/voice/normal_4.m4a', 'assets/voice/normal_5.m4a'],
  tired: ['assets/voice/tired_1.m4a', 'assets/voice/tired_2.m4a'],
  win: ['assets/voice/win_1.m4a', 'assets/voice/win_2.m4a'],
  collapse: ['assets/voice/collapse_1.m4a'],
  fear: ['assets/voice/fear_1.m4a'],
  whisper: ['assets/voice/whisper_1.m4a']
};
const BGM_DATA={
  night:'assets/bgm/night_main.mp3',
  stream:'assets/bgm/stream_lofi.mp3',
  kaidan:'assets/bgm/kaidan_noise.mp3',
  factory:'assets/bgm/factory_electro.mp3',
  mental:'assets/bgm/mental_break.mp3',
  rebirth:'assets/bgm/ending_rebirth.mp3',
  king:'assets/bgm/ending_king.mp3',
  collapse:'assets/bgm/ending_collapse.mp3'
};

// ══ 音声システム ══
// iOS Safari対応：BGM・ボイスはAudio要素で再生する
// （AudioContextは効果音とBGM読込失敗時の代替音のみに使用）

let audioUnlocked = false;

// 最初に必要なnightだけ先読みし、再生可能になったら開始ボタンを有効化
function preloadNightBGM(){
  const a = new Audio();
  a.preload = 'auto';
  a.addEventListener('canplaythrough', _enableStartBtn, {once:true});
  a.addEventListener('error', _enableStartBtn, {once:true});
  a.src = BGM_DATA.night;
  a.load();
}

function _enableStartBtn(){
  const btn = document.getElementById('btn-start-main');
  if(!btn) return;
  btn.textContent = '▶ はじめる';
  btn.disabled = false;
  btn.style.opacity = '1';
  btn.style.pointerEvents = 'auto';
}
window.addEventListener('load',()=>{
  preloadNightBGM();
  // フォールバック：5秒後にまだ無効なら強制有効化
  setTimeout(()=>{ _enableStartBtn(); }, 5000);
});

function unlockAudio(callback){
  // ★ iOSの核心：タップの瞬間にAudio.play()を呼ぶ
  const url = BGM_DATA['night'];

  if(url){
    // タップ同期内でplay()
    const a = new Audio(url);
    a.loop = true;
    a.volume = 0.12;
    const p = a.play();
    if(p !== undefined){
      p.then(()=>{
        audioUnlocked = true;
        AU._ba = a;
        AU.bgmType = 'night';
        document.getElementById('bgm-ind').textContent = '♪ night';
        const ind = document.getElementById('audio-ind');
        if(ind){ ind.textContent='🔊 音声ON'; ind.style.color='#00e8c8'; ind.style.pointerEvents='none'; }
        if(callback) callback();
      }).catch(e=>{
        _showAudioRetry();
        if(callback) callback();
      });
    } else {
      audioUnlocked = true;
      AU._ba = a; AU.bgmType = 'night';
      if(callback) callback();
    }
  }
}

function _showAudioRetry(){
  const ind = document.getElementById('audio-ind');
  if(!ind) return;
  ind.textContent='🔇 タップで音声ON';
  ind.style.color='#e83055';
  ind.style.pointerEvents='auto';
  ind.style.cursor='pointer';
  ind.onclick=()=>{
    ind.style.pointerEvents='none';
    const url2 = BGM_DATA['night'];
    if(!url2){ return; }
    const a2 = new Audio(url2);
    a2.loop=true; a2.volume = 0.12;
    a2.play().then(()=>{
      audioUnlocked=true; AU._ba=a2; AU.bgmType='night';
      ind.textContent='🔊 音声ON'; ind.style.color='#00e8c8';
    }).catch(e=>{ ind.style.pointerEvents='auto'; });
  };
}

// ══════════════════════════════════════════════════════════
// だんのうら v7 ── 文章品質・バランス・コメント全面修正版
// ══════════════════════════════════════════════════════════

// ──────────────────────────
// AUDIO
// ──────────────────────────
const AU={
  ctx:null,_og:null,_on:null,_ba:null,bgmType:null,
  presets:{night:[{f:110,t:'sine',g:.036},{f:165,t:'sine',g:.02}],stream:[{f:130,t:'triangle',g:.034},{f:196,t:'sine',g:.017}],kaidan:[{f:55,t:'sawtooth',g:.03},{f:82,t:'sine',g:.015}],factory:[{f:80,t:'square',g:.02},{f:120,t:'sawtooth',g:.012}],mental:[{f:40,t:'sawtooth',g:.036},{f:61,t:'sawtooth',g:.017}],rebirth:[{f:220,t:'sine',g:.03},{f:330,t:'sine',g:.017}],king:[{f:174,t:'triangle',g:.03},{f:261,t:'triangle',g:.015}],collapse:[{f:28,t:'sawtooth',g:.036}]},
  init(){if(this.ctx)return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}},
  playBGM(type){
    if(this.bgmType===type)return;
    this.stopBGM();
    this.bgmType=type;
    document.getElementById('bgm-ind').textContent='♪ '+type;
    const url = BGM_DATA[type];
    if(!url){ this._osc(type); return; }
    const a=new Audio(url);
    a.loop=true; a.volume = 0.12;
    const p=a.play();
    if(p!==undefined){
      p.then(()=>{
        this._ba=a;
      }).catch(e=>{
        const ind=document.getElementById('audio-ind');
        if(ind){ind.textContent='🔇 タップで音声ON';ind.style.color='#e83055';ind.style.pointerEvents='auto';ind.style.cursor='pointer';ind.onclick=()=>unlockAudio(()=>AU.playBGM(type));}
        this._osc(type);
      });
    }else{ this._ba=a;; }
  },
  _osc(type){if(!this.ctx)return;try{this._og=this.ctx.createGain();this._og.gain.value=0;this._og.connect(this.ctx.destination);const pr=this.presets[type]||this.presets.night;this._on=pr.map(p=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=p.t;o.frequency.value=p.f;g.gain.value=p.g;o.connect(g);g.connect(this._og);o.start();return o;});this._og.gain.linearRampToValueAtTime(1,this.ctx.currentTime+2);}catch(e){}},
  stopBGM(){if(this._ba){try{this._ba.pause();}catch(e){}this._ba=null;}if(this._burl){try{URL.revokeObjectURL(this._burl);}catch(e){}this._burl=null;}if(this._on){this._on.forEach(o=>{try{o.stop();}catch(e){}});this._on=null;}if(this._og){try{this._og.disconnect();}catch(e){}this._og=null;}this.bgmType=null;document.getElementById('bgm-ind').textContent='♪ --';},
  fadeBGM(type,ms=900){if(this._og)try{this._og.gain.linearRampToValueAtTime(0,this.ctx.currentTime+ms/1000);}catch(e){}if(this._ba){const a=this._ba;const step=()=>{if(a.volume>0.02){a.volume=Math.max(0,a.volume-.03);setTimeout(step,55);}else try{a.pause();}catch(e){}};step();}setTimeout(()=>{this.bgmType=null;this.playBGM(type);},ms);},
  playVoice(type){
    const list=VOICE_DATA[type];
    if(!list||list.length===0) return;
    const src=list[Math.floor(Math.random()*list.length)];
    if(!src) return;
    try{
      if(this._voice){ try{this._voice.pause();}catch(e){} }
      const a=new Audio(src);
      a.volume = 1.0;
      this._voice=a;
      a.play().catch(()=>{});
    }catch(e){}
  },
  momentarySilence(ms=1200){if(this._og){const c=this._og.gain.value;try{this._og.gain.setValueAtTime(0,this.ctx.currentTime);setTimeout(()=>{try{this._og.gain.linearRampToValueAtTime(c,this.ctx.currentTime+.5);}catch(e){}},ms);}catch(e){}}if(this._ba){const v=this._ba.volume;this._ba.volume=0;setTimeout(()=>{if(this._ba)this._ba.volume=v;},ms);}},
  se(type){
    if(!this.ctx)return;
    // iOS Safari: suspendedならresumeしてから鳴らす
    if(this.ctx.state==='suspended'){
      this.ctx.resume().then(()=>this._se(type)).catch(()=>{});
    } else {
      this._se(type);
    }
  },
  _se(type){
    try{const m={btn:{f:420,t:'sine',g:.065,d:.05},decide:{f:640,t:'triangle',g:.085,d:.1},back:{f:320,t:'sine',g:.055,d:.07},rank:{f:860,t:'triangle',g:.1,d:.32},ach:{f:1020,t:'sine',g:.085,d:.28},micOn:{f:195,t:'sine',g:.12,d:.07},live:{f:510,t:'sine',g:.1,d:.18},comment:{f:860,t:'sine',g:.032,d:.035},notif:{f:720,t:'triangle',g:.055,d:.09},tool:{f:175,t:'sawtooth',g:.1,d:.09},machine:{f:98,t:'square',g:.085,d:.14},warn:{f:275,t:'square',g:.12,d:.2},repair:{f:640,t:'sine',g:.085,d:.16},noise:{f:58,t:'sawtooth',g:.085,d:.38},ghost:{f:28,t:'sine',g:.042,d:.75}};const p=m[type]||m.btn;const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.connect(g);g.connect(this.ctx.destination);o.type=p.t;o.frequency.value=p.f;g.gain.setValueAtTime(p.g,this.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.ctx.currentTime+p.d);o.start();o.stop(this.ctx.currentTime+p.d+.01);}catch(e){}},
};

// ──────────────────────────
// RAIN
// ──────────────────────────
const cv=document.getElementById('rain-canvas'),rx=cv.getContext('2d');
let drops=[],rainI=.7,rainR=138,rainG=82,rainB=212;
function initRain(){cv.width=window.innerWidth;cv.height=window.innerHeight;drops=Array.from({length:88},()=>({x:Math.random()*cv.width,y:Math.random()*cv.height,s:1.5+Math.random()*3.2,l:7+Math.random()*17,o:.05+Math.random()*.2}));}
function drawRain(){rx.clearRect(0,0,cv.width,cv.height);drops.forEach(d=>{rx.strokeStyle=`rgba(${rainR},${rainG},${rainB},${d.o*rainI})`;rx.lineWidth=.5;rx.beginPath();rx.moveTo(d.x,d.y);rx.lineTo(d.x-1,d.y+d.l*rainI);rx.stroke();d.y+=d.s*rainI;if(d.y>cv.height){d.y=-d.l;d.x=Math.random()*cv.width;}});requestAnimationFrame(drawRain);}
initRain();drawRain();window.addEventListener('resize',initRain);
function setRain(i,r,g,b){rainI=i;if(r!==undefined){rainR=r;rainG=g;rainB=b;}cv.style.opacity=Math.min(.62,.2+i*.15);}

// ──────────────────────────
// PHASE
// ──────────────────────────
function getPhase(){return gs.day<=7?1:gs.day<=20?2:3;}
function applyPhase(){
  const ph=getPhase();
  document.body.setAttribute('data-phase',ph);
  document.body.classList.toggle('ph3',ph===3);
  document.body.classList.toggle('ph3crit',ph===3&&gs.mental<20);
  if(ph===1)setRain(.65);
  else if(ph===2)setRain(.95);
  else setRain(gs.mental<20?2.1:gs.mental<40?1.55:1.15,gs.mental<20?115:155,gs.mental<20?0:40,gs.mental<20?55:80);
}

// ══════════════════════════════════════════════════════════
// 育成システム
// ══════════════════════════════════════════════════════════
const GROW_TYPE={STREAMER:'streamer',ENGINEER:'engineer',COLLAPSE:'collapse',FATHER:'father'};
const GROW_META={
  streamer:{label:'配信者',   color:'#00e8c8',icon:'📡',desc:'夜に生きる声の人'},
  engineer:{label:'凄腕保全', color:'#e8b830',icon:'⚙', desc:'設備の番人'},
  collapse:{label:'侵食者',   color:'#e83055',icon:'🌊',desc:'壇ノ浦に沈む者'},
  father:  {label:'父親',     color:'#8a52d4',icon:'👶',desc:'子のために生きる'},
};
function initPersonality(){return {kindness:40,willpower:50,loneliness:60,hope:40,dependence:10,empathy:35};}
function calcGrowType(){
  const p=gs.personality,sk=gs.skills;
  const sS=(sk.chatSkill*10+sk.singSkill*5+sk.radioVibe*10+gs.streamPop)*.5+p.empathy*.4+p.hope*.2;
  const sE=(sk.soundDiag*15+sk.emergencyFix*15+sk.wiring*12+sk.plc*12+gs.certKnow)*.5+p.willpower*.4;
  const sC=(100-gs.mental)*.6+gs.anomalyCount*5+gs.fatigue*.3+p.loneliness*.4+p.dependence*.3;
  const sF=(100-gs.childStress)*.5+(sk.bedtime*15+sk.chores*15)*.8+p.kindness*.4+p.hope*.3;
  const scores={[GROW_TYPE.STREAMER]:sS,[GROW_TYPE.ENGINEER]:sE,[GROW_TYPE.COLLAPSE]:sC,[GROW_TYPE.FATHER]:sF};
  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
}
function getCharAppearance(){
  const type=calcGrowType(),m=gs.mental,f=gs.fatigue;
  let face='😐';
  if(type===GROW_TYPE.STREAMER){face=gs.streamPop>60&&m>50?'😊':gs.streamPop>40&&m>30?'🙂':m<30?'😓':'😐';}
  else if(type===GROW_TYPE.ENGINEER){face=gs.jobRep>70&&m>50?'😌':m<30?'😔':'😐';}
  else if(type===GROW_TYPE.COLLAPSE){face=m<15?'🫥':m<30?'😨':'😶';}
  else if(type===GROW_TYPE.FATHER){face=gs.childStress<30&&m>50?'🙂':gs.childStress>70?'😞':'😐';}
  const kumaLevel=f>80?3:f>60?2:f>40?1:0;
  const kumaStr=['','目の下が少し暗い','目の下にクマがある','目のクマが深い'][kumaLevel];
  return {face,kumaStr,type};
}
function getStreamStyle(){
  const sc=gs.streamCount,sp=gs.streamPop,ek=gs.skills.chatSkill;
  if(sc===0) return 'まだ配信を始めていない。';
  if(sc<3)   return '慣れない間が多い。でも、声は優しい。';
  if(sc<8)   return 'コメントを読めるようになってきた。少し自然になった。';
  if(sc<15)  return '常連の名前を覚えている。トークに温度が出てきた。';
  if(sc<25&&ek>=2) return '自分の配信の空気ができてきた。リスナーがついてきている。';
  if(sp>70)  return '声だけで人を引き寄せている。深夜の居場所になった。';
  return '配信が自分のものになってきた。';
}
function updatePersonality(action){
  const p=gs.personality;
  const upd=(key,delta)=>{p[key]=Math.max(0,Math.min(100,p[key]+delta));};
  switch(action){
    case'rest':        upd('hope',2);upd('loneliness',-2);break;
    case'study':       upd('willpower',3);break;
    case'childcare':   upd('kindness',4);upd('empathy',3);upd('loneliness',-3);break;
    case'stream':      upd('dependence',2);upd('empathy',1);break;
    case'stream_long': upd('dependence',5);upd('loneliness',-3);break;
    case'factory':     upd('willpower',3);upd('kindness',-1);break;
    case'rest_skip':   upd('willpower',2);upd('loneliness',3);break;
    case'anomaly':     upd('loneliness',5);upd('dependence',3);upd('hope',-3);break;
    case'buzz':        upd('hope',8);upd('empathy',4);break;
    case'flame':       upd('hope',-6);upd('loneliness',6);break;
    case'payday':      upd('hope',5);upd('willpower',3);break;
    case'childstress': upd('kindness',5);upd('loneliness',4);break;
    case'song_good':   upd('hope',4);upd('empathy',3);break;
  }
}

// ──────────────────────────
// GAME STATE
// ──────────────────────────
const gs={
  mental:72, fatigue:28, sleepHours:5,
  followers:38, debt:840000, monthlyPaid:0,
  flame:0, jobRep:40, streamPop:10, certKnow:15, childStress:20, money:12400,
  day:1, hour:22, min:17,
  sp:0,
  skills:{soundDiag:0,emergencyFix:0,wiring:0,plc:0,chatSkill:0,kaidanSkill:0,singSkill:0,radioVibe:0,stressRes:0,focus:0,sleepEff:0,emoCtrl:0,bedtime:0,chores:0},
  rank:0, rankPts:0, rankThresholds:[0,30,80,160,300,500],
  throatFatigue:0,
  hadBuzz:false, hadFlame:false, hadAnom:false,
  completedAchs:new Set(),
  personality:initPersonality(),
  growHistory:[], growMilestones:[],
  listeners:[
    {name:'夜空の旅人', trust:0,regular:0,danger:0,evo:0,type:'normal'},
    {name:'ひとりぼっち',trust:0,regular:0,danger:0,evo:0,type:'normal'},
    {name:'深夜の常連',  trust:0,regular:0,danger:0,evo:0,type:'normal'},
    {name:'さくら',      trust:0,regular:0,danger:0,evo:0,type:'normal'},
  ],
  factoryNetaAvail:false,factoryNetaType:'',
  streamCount:0,anomalyCount:0,
  _dayDone:false,_c30:false,_c10:false,_endless:false,
};
const RANKS=['E','D','C','B','A'];
function logGrow(text){gs.growHistory.unshift({day:gs.day,text});if(gs.growHistory.length>30)gs.growHistory.pop();}

// ──────────────────────────
// STORY
// ──────────────────────────
const storyLines=[
  {t:'narrator',tx:'夜の22時。子どもが眠った部屋に、静けさが戻ってきた。'},
  {t:'gap'},
  {t:'narrator',tx:'机の上の安物のマイクが、今夜もだんのうらの声を待っている。'},
  {t:'gap'},
  {t:'dialogue',tx:'「借金、残り84万。保育料、今月24日まで。資格試験は来月だ。」'},
  {t:'gap'},
  {t:'dialogue',tx:'「それでも今夜も配信する。誰かが見ていてくれるかもしれないから。」'},
  {t:'gap'},
  {t:'narrator',tx:'だんのうら。本名は言えない。設備保全技術者、シングルファーザー、深夜配信者。'},
  {t:'gap'},
  {t:'chapter',tx:'── 壇ノ浦から這い上がれ ──'},
  {t:'narrator',tx:'昼は工場の設備を守る。夜はネットに居場所を作る。'},
  {t:'gap'},
  {t:'dialogue',tx:'「ここが、俺の壇ノ浦だ。沈むか、這い上がるか。」'},
  {t:'gap'},
  {t:'highlight',tx:'── 30日間のサバイバルが始まる。'},
];
function startStory(){
  // タップの瞬間にunlockAudio（内部でBGMも開始）
  unlockAudio(()=>{
    // BGMがまだ開始されていない場合のフォールバック
    if(!AU._ba){
      AU.playBGM('night');
    }
  });
  document.getElementById('title-screen').classList.add('hidden');
  document.getElementById('story-screen').classList.remove('hidden');
  showSL(0);
}
function showSL(i){
  if(i>=storyLines.length){setTimeout(()=>document.getElementById('story-go').classList.add('show'),600);return;}
  const l=storyLines[i],log=document.getElementById('story-log');
  const el=document.createElement('div');el.className='sl '+l.t;el.textContent=l.tx||'';log.appendChild(el);
  setTimeout(()=>{el.classList.add('show');el.scrollIntoView({behavior:'smooth',block:'end'});},50);
  setTimeout(()=>showSL(i+1),l.t==='gap'?175:(l.tx?.length||0)*23+340);
}
function goToGame(){
  document.getElementById('story-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');
  logGrow('物語が始まった');
  loadMain();
  setTimeout(()=>cutin('normal','ご機嫌よう……きょうもきょうとてよろしくよ。'),600);
}

// ──────────────────────────
// ★ 場面テキスト（全面改稿）
// ──────────────────────────
function getMorningNarrative(){
  // 朝のナレーション（毎日の回復感）
  const ph=getPhase();
  const options_p1=[
    '朝7時。子どもの寝息が聞こえていた。コーヒーを淹れる前に、少しだけ窓を開けた。',
    '外はまだ曇っている。それでも、朝は朝だ。',
    '昨夜の配信を終えてから、少し眠れた。体はまだ重いが、動ける。',
    '子どもが起きてきた。今日も顔を見せてくれた。それだけで、少し前に進める気がした。',
  ];
  const options_p2=[
    '朝が来た。昨夜より少しだけ、雨音が遠くなった気がする。',
    '通知が溜まっていた。常連からのコメントだった。読んでいると、少し気持ちが軽くなった。',
    '今日もまた、同じ時間から始まる。でも昨日と少しだけ違う気がした。',
  ];
  const options_p3=[
    '目が覚めた。疲れは抜けていない。それでも、朝が来たということは、昨日を生き延びたということだ。',
    '時計の針が7時を指している。眠った気がしないが、子どもの声が聞こえる。',
  ];
  const pool=ph===1?options_p1:ph===2?options_p2:options_p3;
  return pool[gs.day%pool.length];
}

function getMainText(){
  const ph=getPhase(),m=gs.mental,f=gs.fatigue;
  const type=calcGrowType();

  // phase3崩壊
  if(ph===3&&m<15) return '頭の中で何かが音を立てている。でも、止まれない。借金がある。子どもがいる。';
  if(ph===3&&m<30) return '体が重い。声も出にくい。それでも、マイクの前に座った。';

  // 疲労高
  if(f>80) return 'まぶたが重い。時計を見る回数が増えた。それでも今夜は、配信がある。';
  if(f>65) return '椅子に座ったまま、少し意識が飛んだ。コーヒーはもう冷めていた。';

  // 育成タイプ別
  if(type===GROW_TYPE.STREAMER&&gs.streamPop>50)
    return `深夜のタイムラインに、見知った名前が並んでいた。今夜も、誰かが待っている。`;
  if(type===GROW_TYPE.ENGINEER&&gs.jobRep>60)
    return `工場の安全灯の色が頭に残っている。今日も設備は止まらなかった。`;
  if(type===GROW_TYPE.FATHER&&gs.childStress<40)
    return `子どもが笑ってくれた。それだけで、今日は十分な気がした。`;

  // 終盤
  if(gs.day>=28) return '30日目が近い。壇ノ浦の底から、少しだけ浮かんできた気がする。';

  // 通常（時間帯別）
  const h=gs.hour;
  if(h>=22) return `夜22時。子どもはもう寝ている。部屋に静けさが戻ってきた。${gs.day}日目。`;
  if(h>=0&&h<3) return `深夜${h}時を過ぎた。外の雨音だけが聞こえる。${gs.day}日目。`;
  if(h>=3) return `夜が明けようとしている。コーヒーの苦味だけが残っている。${gs.day}日目。`;
  return `今夜も${String(h).padStart(2,'0')}時になった。子どもはもう寝ている。${gs.day}日目。`;
}

// 行動後ナレーション
const ACT_NARR={
  rest_light:[
    '目を閉じた。子どもの寝息が聞こえる。少しだけ、人間に戻れた気がした。',
    '横になると、天井が静かだった。15分だけ、何も考えなかった。',
    '体の力が少し抜けた。雨音が遠くなった気がする。',
  ],
  rest_deep:[
    '久しぶりにまとまった眠りについた。夢は見なかった。それでよかった。',
    '目が覚めると、部屋の空気が少し違った。体がわずかに軽い。',
  ],
  study:[
    `「危険物取扱者乙4類……電気工事士……」\n声に出すと少し頭に入る気がした。知識: ${gs.certKnow}/100`,
    `テキストを開いた。工場で使う言葉が並んでいる。少し、自分が頼もしくなった気がした。知識: ${gs.certKnow}/100`,
  ],
  childcare:[
    '「おやすみ。ちゃんと育ててやれてるかな。」\n子どもの寝顔を見ると、少し楽になる。',
    '寝かしつけながら、子どもの寝息を聞いていた。この静けさのために、今日も働いた。',
    '「また明日ね」と言うと、子どもが小さく頷いた。それだけで十分だった。',
  ],
  singpractice:[
    '小声でしか練習できない。でも、声は少しずつ育っている気がする。',
    '深夜の部屋で、声を絞り出すように練習した。隣で子どもが眠っている。',
  ],
  factory_done:[
    '工具箱の匂いがまだ手に残っている。今日も設備は止まらなかった。',
    '工場の振動音が耳から離れない。それでも、仕事を終えた充実感がある。',
    '安全灯だけが暗い通路を照らしていた。今日も誰かの仕事を守った。',
  ],
  stream_end:[
    '画面が暗くなると、部屋は急に静かになった。誰かと話した後の沈黙だけが残る。',
    '配信を終えると、外の雨音が戻ってきた。少しだけ、孤独が薄れた気がした。',
    '最後のコメントを読んで、配信を切った。また明日も来てくれるだろうか。',
  ],
};
function getActNarr(key){const pool=ACT_NARR[key]||[''];return pool[Math.floor(Math.random()*pool.length)];}

const scenes={
  main:{bg:'🌙',lbl:'HOME / LATE NIGHT',sp:'だんのうら',getText:getMainText},
  rest_light:{bg:'🛋️',lbl:'REST',sp:'ナレーター',getText(){return getActNarr('rest_light');}},
  rest_deep: {bg:'🛏️',lbl:'SLEEP',sp:'ナレーター',getText(){return getActNarr('rest_deep');}},
  study:{bg:'📖',lbl:'STUDY / NIGHT',sp:'だんのうら',getText(){return getActNarr('study');}},
  childcare:{bg:'👶',lbl:'CHILDCARE',sp:'だんのうら',getText(){return getActNarr('childcare');}},
  singpractice:{bg:'🎤',lbl:'PRACTICE',sp:'だんのうら',getText(){return getActNarr('singpractice');}},
};

function buildChoices(){
  const ph=getPhase();
  const c=[
    {tx:'📡 配信を始める',ac:'stream'},
    {tx:'🔧 設備点検ミニゲーム',ac:'factory'},
    {tx:'🌡 温度・振動診断',ac:'diag'},
    {tx:'☕ 少し休む（疲労-12 精神+5）',ac:'rest_light'},
    {tx:'🛏 しっかり休む（疲労-25 精神+10 時間大）',ac:'rest_deep'},
    {tx:'📚 資格の勉強（知識+5 疲労+6）',ac:'study'},
    {tx:'👶 子どもの寝かしつけ（育児ストレス-10 精神+3）',ac:'childcare'},
    {tx:'🎤 歌の練習（歌スキル経験 疲労+4）',ac:'singpractice'},
  ];
  if(gs.factoryNetaAvail)c.push({tx:`🗣 工場ネタで配信【${gs.factoryNetaType}】`,ac:'factoryneta',cls:'neta'});
  if(ph>=2&&gs.hour>=2&&gs.hour<=4)c.push({tx:'🌑 深夜2時の限定配信（レアイベント）',ac:'deepnight'});
  return c;
}

function loadMain(){loadScene('main');}

const BG_IMG={
  main:'assets/img/bg_main.webp',
  rest_light:'assets/img/bg_rest_light.webp',
  rest_deep:'assets/img/bg_rest_light.webp',
  study:'assets/img/bg_main.webp',
  childcare:'assets/img/bg_childcare.webp',
  singpractice:'assets/img/bg_main.webp',
  factory:'assets/img/bg_factory.webp'
};
function loadScene(key){
  const s=scenes[key];if(!s)return;
  const sceneBgEl=document.getElementById('scene-bg');
  const bgSrc=BG_IMG[key];
  if(bgSrc){
    sceneBgEl.textContent='';
    sceneBgEl.style.backgroundImage=`url(${bgSrc})`;
    sceneBgEl.style.backgroundSize='cover';
    sceneBgEl.style.backgroundPosition='center';
    sceneBgEl.style.opacity='0.35';
  } else {
    sceneBgEl.style.backgroundImage='none';
    sceneBgEl.style.opacity='0.09';
    sceneBgEl.textContent=s.bg;
  }
  document.getElementById('scene-label').textContent=s.lbl;
  document.getElementById('dlg-speaker').textContent=s.sp;
  typeText('dlg-content',typeof s.getText==='function'?s.getText():s.text||'',()=>{});
  const app=getCharAppearance();
  document.getElementById('scene-extra').textContent=`${app.face}${app.kumaStr?' '+app.kumaStr:''}`;
  updateNavActive('main');updateStats();updateDayInfo();applyPhase();
  const ca=document.getElementById('choices-area');ca.innerHTML='';
  const choices=key==='main'?buildChoices():[{tx:'▶ 続ける',ac:'main'}];
  choices.forEach(c=>{
    const btn=document.createElement('button');
    btn.className='choice-btn'+(c.cls?' '+c.cls:'');
    btn.textContent=c.tx;
    btn.onclick=e=>{addRipple(btn,e);AU.se('btn');setTimeout(()=>handleChoice(c.ac),60);};
    ca.appendChild(btn);
  });
}
function addRipple(el,e){
  const r=el.getBoundingClientRect();const rp=document.createElement('div');rp.className='ripple';
  const sz=Math.max(el.offsetWidth,el.offsetHeight)*2;
  rp.style.cssText=`width:${sz}px;height:${sz}px;left:${e.clientX-r.left-sz/2}px;top:${e.clientY-r.top-sz/2}px;`;
  el.appendChild(rp);setTimeout(()=>rp.remove(),500);
}

// ──────────────────────────
// ★ バランス調整済みhandleChoice
// ──────────────────────────
function handleChoice(ac){
  updatePersonality(ac);
  switch(ac){
    case'stream': openStream(); break;
    case'factory': openFactory('repair'); break;
    case'diag':    openFactory('diag'); break;

    case'rest_light':
      gs.fatigue=Math.max(0,gs.fatigue-12-gs.skills.sleepEff*2);
      gs.mental=Math.min(100,gs.mental+5);
      logGrow('少し休んだ');
      advTime(40); showNotif('☕ 少し休んだ。'); loadScene('rest_light'); updateStats(); break;

    case'rest_deep':
      gs.fatigue=Math.max(0,gs.fatigue-25-gs.skills.sleepEff*4);
      gs.sleepHours=Math.min(10,gs.sleepHours+2);
      gs.mental=Math.min(100,gs.mental+10);
      logGrow('しっかり休んだ');
      advTime(120); showNotif('🛏 しっかり休んだ。体が少し楽になった。'); loadScene('rest_deep'); updateStats(); break;

    case'study':
      gs.fatigue=Math.min(100,gs.fatigue+6);
      gs.certKnow=Math.min(100,gs.certKnow+5+gs.skills.focus);
      // 達成感で微回復
      gs.mental=Math.min(100,gs.mental-2+gs.skills.focus+1);
      gs.sp+=1;
      if(gs.certKnow>=100&&!gs.completedAchs.has('cert')){
        unlockAch('cert','📜 資格知識が満点になった');
        logGrow('資格知識が満点になった');
        showEvPopup('📜 知識が身についた','危険物取扱者の知識が完成した。\n職場での評価も上がった。','仕事評価 +15 | 精神力 +10',()=>{gs.jobRep=Math.min(100,gs.jobRep+15);gs.mental=Math.min(100,gs.mental+10);});
      }
      logGrow('資格の勉強をした');
      advTime(80); showNotif('📚 勉強した。少し頭が働いた。'); loadScene('study'); updateStats(); break;

    case'childcare':
      gs.childStress=Math.max(0,gs.childStress-10-gs.skills.bedtime*3);
      // 子どもとの時間で精神回復
      const childBonus = Math.random()<.2 ? -3 : 3; // 20%の確率でしんどい夜
      gs.mental=Math.min(100,gs.mental+childBonus);
      logGrow('子どもと過ごした');
      advTime(30); showNotif(childBonus>0?'👶 子どもの寝顔を見た。少し楽になった。':'👶 今夜はなかなか寝てくれなかった。'); loadScene('childcare'); updateStats(); break;

    case'singpractice':
      gs.skills.singSkill=Math.min(10,gs.skills.singSkill+.5);
      gs.throatFatigue=Math.min(100,gs.throatFatigue+4);
      gs.fatigue=Math.min(100,gs.fatigue+4);
      logGrow('歌の練習をした');
      advTime(40); showNotif('🎤 静かに練習した。声が少し育ってきた。'); loadScene('singpractice'); updateStats(); break;

    case'factoryneta': gs.factoryNetaAvail=false; openStream('kaidan'); break;
    case'deepnight':   triggerDeepNight(); break;
    case'main':        loadScene('main'); break;
  }
}

// ──────────────────────────
// TIME & DAY
// ──────────────────────────
function advTime(min){
  gs.min+=min;while(gs.min>=60){gs.min-=60;gs.hour=(gs.hour+1)%24;}
  updateStats();
  if(gs.hour>=6&&gs.hour<14&&!gs._dayDone){gs._dayDone=true;setTimeout(nextDay,1200);}
}

// ★ 毎日の自然回復を追加
function nextDay(){
  gs._dayDone=false;gs.day++;gs.hour=7;gs.min=0;

  // 夜間の自然回復（睡眠・スキルで変化）
  const sleepRec=20+gs.skills.sleepEff*5;
  const mentalRec=7+gs.skills.stressRes*3;
  gs.fatigue=Math.max(0,gs.fatigue-sleepRec);
  gs.mental=Math.min(100,gs.mental+mentalRec);
  gs.sleepHours=Math.max(0,gs.sleepHours-1+gs.skills.sleepEff*.5);
  gs.childStress=Math.min(100,gs.childStress+4); // 少し緩めた
  gs.sp+=1;
  gs.throatFatigue=Math.max(0,gs.throatFatigue-12);
  gs.flame=Math.max(0,gs.flame-1);

  // 日次人格変化
  if(gs.fatigue>70)updatePersonality('rest_skip');
  if(gs.childStress>70)updatePersonality('childstress');
  applyPhase();
  checkMilestones();
  checkWeeklyLife();
  checkFixedDayEvents();

  // ★ 朝の小さな回復イベント（希望演出）
  const morningEvents=[
    ()=>{gs.mental=Math.min(100,gs.mental+3);return '子どもが「おはよう」と言ってくれた。';},
    ()=>{gs.mental=Math.min(100,gs.mental+2);return 'コーヒーを一杯、ゆっくり飲んだ。';},
    ()=>{gs.mental=Math.min(100,gs.mental+4);return '常連リスナーからフォロー通知が届いていた。';},
    ()=>{return '今日も一日が始まる。';},
    ()=>{gs.fatigue=Math.max(0,gs.fatigue-5);return '久しぶりに少し早く目が覚めた。';},
  ];
  const ev=morningEvents[gs.day%morningEvents.length];
  const evMsg=ev();

  if(Math.random()<.4)triggerRandomEvent();
  updateStats();updateDayInfo();
  showNotif(`☀️ ${gs.day}日目の朝。${evMsg}`);
  cutin('normal','……今日も、元気にやっていくわよ。');
  loadScene('main');checkGameOver();if(gs.day>30&&!gs._endless)triggerEnding();
  saveGame(true); // 自動セーブ（DAY進行時）
}
function updateDayInfo(){
  document.getElementById('tb-day').textContent = gs.day;
  // ENDLESS中はバーをDAY30基準で最大、超えた分は別表示
  const pct = gs._endless
    ? Math.min(100, (gs.day / 30 * 100))
    : Math.min(100, (gs.day / 30 * 100));
  document.getElementById('day-fill').style.width = pct + '%';
}

// ──────────────────────────
// マイルストーン
// ──────────────────────────
const MILESTONES=[
  {id:'m_stream5',  check:()=>gs.streamCount>=5,   text:'配信5回。声が届き始めた。'},
  {id:'m_stream15', check:()=>gs.streamCount>=15,  text:'配信15回。常連の顔が浮かぶようになった。'},
  {id:'m_follower100',check:()=>gs.followers>=100, text:'フォロワー100人。壇ノ浦から少し上がった。'},
  {id:'m_debt_half',check:()=>gs.debt<=420000,     text:'借金が半分を切った。光が見えてきた。'},
  {id:'m_debt_clear',check:()=>gs.debt<=0,         text:'借金完済。壇ノ浦を出た。'},
  {id:'m_job70',    check:()=>gs.jobRep>=70,       text:'職場の信頼を得た。仕事が少し楽になった。'},
  {id:'m_child_ok', check:()=>gs.childStress<20,   text:'子どもとの時間が安定してきた。'},
  {id:'m_sing_lv5', check:()=>gs.skills.singSkill>=5,text:'歌スキルが育った。声が武器になった。'},
  {id:'m_hope70',   check:()=>gs.personality.hope>=70, text:'希望の光が見えている。'},
  {id:'m_will80',   check:()=>gs.personality.willpower>=80,text:'誰にも折れない意志がある。'},
];
function checkMilestones(){
  MILESTONES.forEach(m=>{
    if(!gs.completedAchs.has(m.id)&&m.check()){
      gs.completedAchs.add(m.id);
      gs.growMilestones.push({day:gs.day,text:m.text});
      logGrow(m.text);
      showNotif('✨ '+m.text);
      AU.se('ach');
    }
  });
}

// ──────────────────────────
// 今日の目標ガイド
// ──────────────────────────
function updateDailyGuide(){
  const el = document.getElementById('daily-guide-text');
  if(!el) return;
  const ph = getPhase();
  const m  = gs.mental;
  const f  = gs.fatigue;
  const d  = gs.day;

  let msg = '';

  // 状態優先（ゲームオーバー直前の警告が最優先）
  const danger = getDangerWarning();
  if(danger)          msg = danger;
  else if(m <= 20)    msg = '⚠️ 精神が限界。まず休む。';
  else if(f >= 80)    msg = '😴 疲労が重い。横になろう。';
  else if(gs.flame >= 5) msg = '🔥 炎上中。無理に配信しない。';
  else if(d >= 28)    msg = '🏁 最終盤。今日を走り切ろう。';
  else if(d === 25)   msg = '💴 今日は給料日。収支を確認。';
  else if(gs.debt > 1500000) msg = '💸 借金が多い。稼いで返済を。';
  else if(gs.childStress >= 70) msg = '👶 育児ストレスが高い。子どもと過ごそう。';
  // 行動提案
  else if(f >= 60)    msg = '☕ 少し休んでから動こう。';
  else if(gs.streamCount === 0) msg = '📡 今日初配信。まず配信してみよう。';
  else if(gs.jobRep < 30)  msg = '🔧 工場で働いて評価を上げよう。';
  else if(gs.certKnow < 30) msg = '📚 資格の勉強を進めよう。';
  else if(ph >= 2 && gs.hour >= 22) msg = '👻 深夜向き。怪談配信も狙える。';
  else if(ph >= 2 && gs.hour >= 2 && gs.hour <= 4) msg = '🌑 深夜2時。限定配信のチャンス。';
  else if(gs.followers < 60) msg = '📡 フォロワーを増やそう。配信が効果的。';
  else if(gs.streamPop < 40) msg = '🎵 歌枠や工場トークで人気UP。';
  else msg = '📡 今日も配信して積み上げよう。';

  el.textContent = msg;
  const box = document.getElementById('daily-guide');
  if(box) box.classList.toggle('danger', !!danger);
}

// ──────────────────────────
// ゲームオーバー前の警告
// ──────────────────────────
// checkGameOver の各条件に近づいたら一度だけ通知する（安全圏に戻ったら再通知可）
const DANGER_WARNINGS=[
  {id:'mental',  check:()=>gs.mental<=15,
   guide:'🚨 精神が0になると崩壊エンド。まず休む。',
   notif:'🚨 精神が危険域。0になると崩壊エンド。休むか子どもと過ごそう。'},
  {id:'exhaust', check:()=>gs.fatigue>=85&&gs.mental<30,
   guide:'🚨 疲労100・精神20未満で倒れる。今すぐ休む。',
   notif:'🚨 疲労が限界に近い。疲労100で精神20未満だと倒れる。'},
  {id:'debt',    check:()=>gs.debt>1700000,
   guide:'🚨 借金200万を超えると生活破綻。稼いで返済を。',
   notif:'🚨 借金が200万に近い。超えると生活破綻エンド。'},
  {id:'flame',   check:()=>gs.flame>=7,
   guide:'🚨 炎上10で配信崩壊。今日は配信を控える。',
   notif:'🚨 炎上が危険域。10に達すると炎上崩壊エンド。'},
];
const _dangerWarned={};
function getDangerWarning(){
  const w=DANGER_WARNINGS.find(d=>d.check());
  return w?w.guide:'';
}
function checkDangerWarnings(){
  DANGER_WARNINGS.forEach(d=>{
    if(d.check()){
      if(!_dangerWarned[d.id]){_dangerWarned[d.id]=true;showNotif(d.notif);}
    }else _dangerWarned[d.id]=false;
  });
}

// ──────────────────────────
// STATS
// ──────────────────────────
function updateStats(){
  document.getElementById('tb-time').textContent=String(gs.hour).padStart(2,'0')+':'+String(gs.min).padStart(2,'0');
  const mv=document.getElementById('tb-mental');
  mv.textContent=gs.mental;
  mv.className='top-val'+(gs.mental<30?' danger':gs.mental>70?' good':'');
  const fv=document.getElementById('tb-fatigue');
  fv.textContent=gs.fatigue+'%';
  fv.className='top-val'+(gs.fatigue>75?' danger':gs.fatigue>50?'':' good');
  document.getElementById('tb-rank').textContent=RANKS[gs.rank]||'A';
  const fthi=gs.fatigue>70;
  document.body.classList.toggle('fatigue-hi',fthi);
  document.documentElement.style.setProperty('--fatigue-drift',fthi?(Math.random()-.5)*2+'px':'0px');
  applyPhase();
  if(getPhase()===3){
    document.body.classList.toggle('ph3crit',gs.mental<20);
    if(gs.mental<=30&&!gs._c30){gs._c30=true;cutin('tired','……まだ、終われない。');AU.playVoice('tired');}
    if(gs.mental<=10&&!gs._c10){gs._c10=true;cutin('collapse','画面の向こうに、誰かがいる気がしたけど');AU.playVoice('collapse');startChaos();}
  }
  if(gs.mental>30)gs._c30=false;if(gs.mental>10)gs._c10=false;
  gs.listeners.forEach(l=>evolveListener(l));
  checkMilestones();
  checkDangerWarnings();
  updateDailyGuide();
}

// ──────────────────────────
// LISTENER
// ──────────────────────────
function evolveListener(l){
  if(l.trust>200&&l.evo<5)l.evo=5;
  else if(l.trust>100&&l.evo<4)l.evo=4;
  else if(l.trust>50&&l.evo<3)l.evo=3;
  else if(l.trust>20&&l.evo<2)l.evo=2;
  else if(l.trust>5&&l.evo<1)l.evo=1;
  if(l.regular>10&&l.danger<5)l.danger=Math.min(5,l.danger+.1);
}
function getListenerComment(l,ph){
  const sets=[
    ['こんばんは','今日も来ました','初見です。フォローしました'],
    ['いつも聴いてます','また来ました','お仕事お疲れさまです'],
    ['最近疲れてませんか','声、落ち着きますね','無理しないでください'],
    ['今日ちょっと疲れてます？','昨日も遅かったですよね','ちゃんと眠れてますか'],
    ['また来てしまいました','あなたの声が好きです','ここが落ち着く'],
    // phase3evo5の違和感コメント（読める違和感）
    ['さっきも同じ話、聞きました','後ろの雨音、変ですね','30日目まで見ています'],
  ];
  const set=sets[Math.min(5,l.evo)];
  if(l.evo>=5&&ph>=3&&Math.random()<.4)return sets[5][Math.floor(Math.random()*3)];
  return set[Math.floor(Math.random()*set.length)];
}
function getListenerCommentType(l){
  if(l.evo>=5&&getPhase()>=3)return 'ghost';
  if(l.evo>=4)return 'worried';
  return 'normal';
}

// ──────────────────────────
// ★ REALITY風コメントプール（ギフト・フォロー表現に統一）
// ──────────────────────────
const streamTypes=[
  {key:'talk',   icon:'🎙️',title:'【深夜雑談】眠れない夜に…'},
  {key:'kaidan', icon:'👻',title:'【怪談】工場で聞いた話'},
  {key:'song',   icon:'🎵',title:'【歌枠】深夜に歌う'},
  {key:'game',   icon:'🎮',title:'【ゲーム実況】深夜のプレイ'},
  {key:'study',  icon:'📚',title:'【資格勉強配信】一緒に勉強しよう'},
  {key:'factory',icon:'🏭',title:'【工場トーク】設備保全の話'},
  {key:'radio',  icon:'📻',title:'【深夜ラジオ】夜だけの話'},
];

function buildCommentPool(key){
  const ph=getPhase();
  const base={
    talk:[
      {u:'夜空の旅人',   tx:'こんばんは',                     tp:'normal'},
      {u:'ひとりぼっち', tx:'私も眠れない夜が続いてます',       tp:'normal'},
      {u:'匿名',         tx:'仕事終わりに聴いてます',           tp:'normal'},
      {u:'さくら',       tx:'声、落ち着きますね',               tp:'normal'},
      {u:'深夜民',       tx:'今夜もきました',                   tp:'normal'},
      {u:'通りすがり',   tx:'偶然流れてきましたがいい声ですね', tp:'normal'},
      {u:'ギフト🎁',    tx:'少しだけ応援します',               tp:'super'},
      {u:'アンチ',       tx:'フォロワー少ないな',               tp:'bad'},
      {u:'常連A',        tx:'また来ました。今日もゆっくりしていきます',tp:'normal'},
    ],
    kaidan:[
      {u:'怪談好き',      tx:'工場の怪談は本当にありますよ',   tp:'normal'},
      {u:'ホラー民',      tx:'続き、気になりすぎる',           tp:'normal'},
      {u:'深夜ラジオ好き',tx:'昔の深夜ラジオみたいで好きです', tp:'normal'},
      {u:'ギフト🎁',     tx:'怪談枠すごく好きです',            tp:'super'},
      {u:'怖がり',        tx:'怖いけど離れられない',            tp:'normal'},
      {u:'初見',          tx:'初見です。怪談枠があるんですね',  tp:'normal'},
    ],
    song:[
      {u:'音楽好き',  tx:'声、深みがありますね',               tp:'normal'},
      {u:'深夜の人',  tx:'泣けてきた',                         tp:'normal'},
      {u:'ギフト🎁', tx:'歌、よかったです',                    tp:'super'},
      {u:'リスナー',  tx:'リクエストしていいですか',            tp:'normal'},
      {u:'通りすがり',tx:'偶然来たんですけど声がいいですね',    tp:'normal'},
      {u:'常連B',     tx:'今夜の歌、優しい声ですね',           tp:'normal'},
    ],
    game:[
      {u:'ゲーマー',  tx:'一緒にやりたいです',     tp:'normal'},
      {u:'深夜勢',    tx:'このゲーム懐かしい',      tp:'normal'},
      {u:'ギフト🎁', tx:'実況、楽しいです',         tp:'super'},
      {u:'リスナー2', tx:'ゆっくりでいいですよ',    tp:'normal'},
    ],
    study:[
      {u:'受験生',    tx:'一緒に頑張ります',               tp:'normal'},
      {u:'社会人',    tx:'資格勉強、助かります',             tp:'normal'},
      {u:'ギフト🎁', tx:'合格祈ってます',                   tp:'super'},
      {u:'夜更かし',  tx:'私も今日から勉強始めます',         tp:'normal'},
      {u:'同志',      tx:'資格勉強しながら聴いてます',       tp:'normal'},
    ],
    factory:[
      {u:'設備屋',    tx:'PLCの話、あるある過ぎる',          tp:'normal'},
      {u:'工場勤務',  tx:'うちの工場も同じ感じです',          tp:'normal'},
      {u:'ギフト🎁', tx:'現場のリアルな話、好きです',         tp:'super'},
      {u:'見習い',    tx:'勉強になります',                    tp:'normal'},
      {u:'先輩',      tx:'その現象、うちでも起きたことある',  tp:'normal'},
    ],
    radio:[
      {u:'深夜民',    tx:'眠れなくてここにきました',          tp:'normal'},
      {u:'孤独な人',  tx:'ここにいると落ち着く',              tp:'normal'},
      {u:'ギフト🎁', tx:'毎晩聴いてます。ありがとう',         tp:'super'},
      {u:'夜型',      tx:'深夜に起きてる人がいるのがわかる',  tp:'normal'},
      {u:'通りすがり',tx:'フォローしました',                  tp:'normal'},
    ],
  };
  const pool=[...(base[key]||base.talk)];

  // リスナー進化コメント
  gs.listeners.forEach(l=>{pool.push({u:l.name,tx:getListenerComment(l,ph),tp:getListenerCommentType(l)});});

  // phase2以降の微妙な変化（怪異ではなく、疲れたコメント・ちょっとした違和感）
  if(ph>=2){
    pool.push({u:'匿名',tx:'また来ました',tp:'normal'});
    if(gs.fatigue>60) pool.push({u:'常連',tx:'今日、声少し変わりましたか',tp:'normal'});
  }
  return pool;
}

// ★ レアギフトコメント（REALITY風）
const rareComments=[
  {u:'（非公開）',   tx:'声、届いてますよ',                 tp:'rare'},
  {u:'元常連',       tx:'久しぶりです。元気にしてましたか',  tp:'rare'},
  {u:'ギフト💎×10', tx:'今まで見てきてよかった。ありがとう',tp:'super'},
];

// ★ 怪異コメント（読める違和感）
const anomalyPool={
  2:[
    {u:'???',       tx:'',                         tp:'ghost'},
    {u:'（削除済み）',tx:'みてた',                 tp:'ghost'},
  ],
  3:[
    {u:'???',           tx:'昨日も同じ時間にここにいた',   tp:'anomaly'},
    {u:'444',           tx:'',                            tp:'ghost'},
    {u:'（削除済み）',   tx:'まだ起きてるんですか',         tp:'ghost'},
    {u:'だんのうら',     tx:'わかった',                    tp:'anomaly'},
    {u:'…',            tx:'寝たら終わりますよ',           tp:'ghost'},
    {u:'存在しないID',   tx:'後ろ、雨の音だけじゃないですよ',tp:'anomaly'},
  ],
};

// ★ バランス調整済みstreamChoices（精神コストを軽減、成功時に回復追加）
const streamChoices={
  talk:[
    {tx:'今日の仕事の話をする（+2👥 疲労+5）',          fl:2,  mt:-2, fat:5},
    {tx:'育児の苦労を話す（+4👥 精神-3）',               fl:4,  mt:-3, fat:6},
    {tx:'借金の現実を正直に話す（+6👥 炎上リスク）',     fl:6,  mt:-5, fat:7, fr:1},
    {tx:'深夜だけの本音を話す（+8👥 精神-6）',           fl:8,  mt:-6, fat:8},
    {tx:'ギフトのお礼を伝えて終わる（精神+5 疲労-3）',  fl:1,  mt:5,  fat:-3, end:true},
  ],
  kaidan:[
    {tx:'工場で見た不思議な現象を話す（+5👥）',          fl:5,  mt:-2, fat:5},
    {tx:'都市伝説を語る（+7👥 炎上リスク）',             fl:7,  mt:-3, fat:6, fr:1},
    {tx:'「続きは次回」として終わる（精神+3）',          fl:3,  mt:3,  end:true},
    {tx:'怪談のクライマックスを語る（+12👥 異変リスク）',fl:12, mt:-5, fat:8, anom:true},
  ],
  song:[
    {tx:'深夜向けの静かな曲を歌う（+8👥 精神-3）',       fl:8,  mt:-3, fat:6},
    {tx:'リクエスト曲を歌う（+5👥）',                    fl:5,  mt:-2, fat:5},
    {tx:'歌枠ミニゲームを始める',                         fl:0,  mt:0,  mini:'song'},
    {tx:'喉が疲れたので今日はここまで（精神+5）',         fl:1,  mt:5,  end:true},
  ],
  game:[
    {tx:'コメントと一緒に楽しむ（+4👥）',                fl:4,  mt:-2, fat:5},
    {tx:'難所を真剣に攻略（+6👥 精神-4）',               fl:6,  mt:-4, fat:6},
    {tx:'今日はここまで（精神+3）',                       fl:1,  mt:3,  end:true},
  ],
  study:[
    {tx:'声に出しながら問題を解く（+3👥 知識+7）',        fl:3,  mt:-1, cert:7, fat:5},
    {tx:'リスナーと一緒に解く（+5👥 精神+2）',            fl:5,  mt:2,  fat:5},
    {tx:'今日はここまで（疲労-4 精神+2）',                fl:1,  mt:2,  fat:-4, end:true},
  ],
  factory:[
    {tx:'ヒヤリハット事例を話す（+4👥）',                 fl:4,  mt:-2, fat:5},
    {tx:'PLC復旧の経験を話す（+6👥 資格+3）',            fl:6,  mt:-2, cert:3, fat:6},
    {tx:'今日はここまで（精神+3）',                        fl:1,  mt:3,  end:true},
  ],
  radio:[
    {tx:'深夜の孤独について話す（+8👥 精神-4）',          fl:8,  mt:-4, fat:6},
    {tx:'リスナーの話を聞く（+5👥 精神+3）',              fl:5,  mt:3,  fat:4},
    {tx:'今日はここまで（精神+5）',                        fl:1,  mt:5,  end:true},
  ],
};

let commentIv=null,anomalyIv=null;

function openStream(forced){
  AU.init();updateNavActive('stream');
  document.getElementById('comment-feed').innerHTML='';
  document.getElementById('streaming-ol').classList.add('active');
  playLiveIntro(()=>{
    const sc=document.getElementById('str-choices');
    if(forced){const t=streamTypes.find(x=>x.key===forced)||streamTypes[0];startSession(t);}
    else{
      sc.innerHTML='<div style="font-family:var(--mono);font-size:.6rem;color:var(--tx-d);padding:3px 0 6px">配信タイプを選んでください：</div>';
      streamTypes.forEach(t=>{
        const btn=document.createElement('button');btn.className='str-type-btn';btn.textContent=t.icon+' '+t.title;
        btn.onclick=e=>{addRipple(btn,e);AU.se('decide');startSession(t);};
        sc.appendChild(btn);
      });
    }
  });
}

function playLiveIntro(cb){
  const intro=document.getElementById('live-intro'),lt=document.getElementById('li-text'),ls=document.getElementById('li-sub');
  intro.classList.add('show');lt.textContent='';ls.textContent='接続中…';AU.se('micOn');
  setTimeout(()=>{ls.textContent='カチッ…';AU.se('machine');},450);
  setTimeout(()=>{lt.textContent='LIVE';lt.classList.add('on');AU.se('live');},1100);
  setTimeout(()=>{ls.textContent='配信開始';},1500);
  setTimeout(()=>{intro.classList.remove('show');lt.classList.remove('on');cutin('normal','ご機嫌よう、だんのうらです。');cb();},2300);
}

function startSession(type){
  gs.streamType=type.key;gs.streamCount++;
  updatePersonality('stream');
  if(gs.streamCount%5===0)updatePersonality('stream_long');
  logGrow(`【${type.title}】配信を行った`);
  document.getElementById('str-title').textContent=type.title;
  document.getElementById('str-icon').textContent=type.icon;
  document.getElementById('viewer-cnt').textContent=2+gs.rank*3+Math.floor(gs.followers/15);
  const bgmMap={talk:'stream',kaidan:'kaidan',song:'stream',game:'stream',study:'stream',factory:'stream',radio:'stream'};
  AU.fadeBGM(bgmMap[type.key]||'stream',650);
  updateStreamStats();
  const pool=buildCommentPool(type.key);let ci=0;
  clearInterval(commentIv);clearInterval(anomalyIv);
  const spd=Math.max(850,2700-gs.rank*260-gs.followers/6);
  commentIv=setInterval(()=>{
    if(Math.random()<.045&&gs.streamCount>3){
      const rc=rareComments[Math.floor(Math.random()*rareComments.length)];
      addComment(rc.u,rc.tx,rc.tp);AU.se('comment');
      // ギフトで精神微回復
      if(rc.tp==='super') gs.mental=Math.min(100,gs.mental+2);
    } else {
      const c=pool[ci%pool.length];ci++;addComment(c.u,c.tx,c.tp);AU.se('comment');
      const li=gs.listeners.find(l=>l.name===c.u);
      if(li){li.trust++;li.regular++;evolveListener(li);}
      // 常連コメントで精神微回復
      if(c.tp==='worried'||c.tp==='rare') gs.mental=Math.min(100,gs.mental+1);
    }
    const vc=parseInt(document.getElementById('viewer-cnt').textContent);
    document.getElementById('viewer-cnt').textContent=Math.max(1,vc+Math.floor((Math.random()-.35)*3));
  },spd);
  const ph=getPhase();
  if(type.key==='kaidan'){
    const prob=ph===1?0:ph===2?.04:.16;
    anomalyIv=setInterval(()=>{if(Math.random()<prob+gs.skills.kaidanSkill*.014)triggerAnomaly();},ph===1?99999:6500);
  }
  loadStreamChoices(type.key);advTime(10);
}

function addComment(u,tx,tp){
  const feed=document.getElementById('comment-feed');
  const el=document.createElement('div');el.className='ci '+(tp||'normal');
  el.innerHTML=`<span class="ci-u">${u}</span><span class="ci-t">${tx}</span>`;
  feed.appendChild(el);if(feed.children.length>80)feed.removeChild(feed.firstChild);
  feed.scrollTop=feed.scrollHeight;
}

function loadStreamChoices(key){
  const sc=document.getElementById('str-choices');sc.innerHTML='';
  (streamChoices[key]||streamChoices.talk).forEach(c=>{
    const btn=document.createElement('button');btn.className='sc';btn.textContent=c.tx;
    btn.onclick=e=>{addRipple(btn,e);AU.se('decide');setTimeout(()=>applyChoice(c),60);};
    sc.appendChild(btn);
  });
}

function applyChoice(c){
  if(c.mini==='song'){clearInterval(commentIv);clearInterval(anomalyIv);document.getElementById('streaming-ol').classList.remove('active');openSong();return;}
  gs.followers+=c.fl||0;
  gs.mental=Math.max(0,Math.min(100,gs.mental+(c.mt||0)));
  gs.fatigue=Math.min(100,gs.fatigue+(c.fat||8));
  gs.flame+=c.fr||0;
  if(c.cert)gs.certKnow=Math.min(100,gs.certKnow+c.cert);
  gs.rankPts+=(c.fl||0)*.5;checkRankUp();
  updateStreamStats();updateStats();
  if(c.anom&&getPhase()>=2)setTimeout(triggerAnomaly,1700);
  const pts=[];
  if((c.fl||0)>0)pts.push('+'+c.fl+'👥');
  if((c.mt||0)<0)pts.push('精神'+c.mt);
  if((c.mt||0)>0)pts.push('精神+'+c.mt);
  showNotif('📡 '+(pts.join(' ')||'配信中'));
  if(c.end){
    clearInterval(commentIv);clearInterval(anomalyIv);
    // ★ 配信収益（ランク・フォロワー・ギフトで変動）
    const baseRev=Math.floor(gs.followers*.8+gs.rank*300+Math.random()*800);
    const giftBonus=Math.floor(gs.streamPop*20);
    const rev=baseRev+giftBonus;
    gs.money+=rev;
    const debtPay=Math.floor(rev*.5);
    gs.debt=Math.max(0,gs.debt-debtPay);
    gs.monthlyPaid+=debtPay;
    advTime(90);AU.fadeBGM('night',850);
    setTimeout(()=>{
      document.getElementById('streaming-ol').classList.remove('active');
      updateNavActive('main');
      showResult('配信終了',
        `フォロワー <span class="up">+${c.fl||0}</span><br>`+
        `精神力 <span class="${(c.mt||0)>=0?'up':'down'}">${(c.mt||0)>=0?'+':''}${c.mt||0}</span><br>`+
        `配信収益 <span class="up">+¥${rev.toLocaleString()}</span><br>`+
        `借金返済 <span class="down">-¥${debtPay.toLocaleString()}</span>`
      );
      // 配信後ナレーション
      const narr=getActNarr('stream_end');
      typeText('dlg-content',narr,()=>{});
      loadScene('main');
      nextDay();
    },750);
  } else loadStreamChoices(gs.streamType);
}

function updateStreamStats(){
  document.getElementById('ss-fl').textContent=gs.followers;
  document.getElementById('ss-sp').textContent=gs.streamPop;
  document.getElementById('ss-fl2').textContent=gs.flame>3?'高⚠':gs.flame>1?'中':'低';
  document.getElementById('ss-mt').textContent=gs.mental;
  document.getElementById('ss-rk').textContent=RANKS[gs.rank]||'A';
}

// ──────────────────────────
// ANOMALY
// ──────────────────────────
function triggerAnomaly(){
  const ph=getPhase();if(ph<2)return;
  gs.anomalyCount++;updatePersonality('anomaly');
  if(!gs.hadAnom){gs.hadAnom=true;unlockAch('firstAnomaly','👻 初めての異変');}
  const e2=[
    ()=>{const p=anomalyPool[2];addComment(p[0].u,p[0].tx,'ghost');},
    ()=>{AU.momentarySilence(1400);showNotif('……');},
    ()=>{const vc=document.getElementById('viewer-cnt');const o=vc.textContent;vc.textContent='...';setTimeout(()=>vc.textContent=o,1600);},
  ];
  const e3=[...e2,
    ()=>{const p=anomalyPool[3];const kc=p[Math.floor(Math.random()*p.length)];addComment(kc.u,kc.tx,kc.tp);AU.se('noise');},
    ()=>{document.getElementById('viewer-cnt').textContent='444';setTimeout(()=>document.getElementById('viewer-cnt').textContent=Math.max(1,gs.rank*3+5),2100);},
    ()=>{const feed=document.getElementById('comment-feed');feed.style.filter='hue-rotate(150deg) invert(.05)';setTimeout(()=>feed.style.filter='',1900);AU.se('ghost');},
    ()=>{const rf=document.getElementById('red-flash');rf.style.opacity='1';setTimeout(()=>rf.style.opacity='0',180);AU.se('noise');},
    ()=>{AU.momentarySilence(1800);setTimeout(()=>addComment('','……','ghost'),750);},
    ()=>{document.body.style.filter='brightness(.07)';setTimeout(()=>document.body.style.filter='',140);AU.se('noise');},
    ()=>{const f=document.getElementById('comment-feed');const items=f.querySelectorAll('.ci-u');if(items.length){const t=items[Math.floor(Math.random()*items.length)];const o=t.textContent;t.style.color='var(--rd)';t.textContent='???';setTimeout(()=>{t.textContent=o;t.style.color='';},1900);}},
  ];
  const pool=ph===2?e2:e3;pool[Math.floor(Math.random()*pool.length)]();
  gs.mental=Math.max(0,gs.mental-(ph===2?2:4));
  if(ph===3)cutin('fear','時計の秒針だけが、妙に大きく聞こえる。');
  updateStats();
}

// ──────────────────────────
// DEEP NIGHT
// ──────────────────────────
function triggerDeepNight(){
  unlockAch('deepNight','🌑 深夜2時の配信者');
  showEvPopup('🌑 深夜2時の限定配信',
    '……誰かいるか？\nコメントが来た。深夜2時に起きているリスナーがいた。\n\n自分だけじゃなかった、ということが少しだけ救いになった。',
    'フォロワー +15 | 精神力 +5 | 配信人気 +10',
    ()=>{gs.followers+=15;gs.mental=Math.min(100,gs.mental+5);gs.streamPop=Math.min(100,gs.streamPop+10);logGrow('深夜2時の限定配信をした');});
}

// ──────────────────────────
// RANK UP
// ──────────────────────────
function checkRankUp(){
  if(gs.rank<RANKS.length-1&&gs.rankPts>=gs.rankThresholds[gs.rank+1]){
    gs.rank++;AU.se('rank');AU.playVoice('win');
    cutin('win',`壇ノ浦から……少し浮かび上がったわ。RANK ${RANKS[gs.rank]}。`);
    showNotif(`🏆 RANK UP → ${RANKS[gs.rank]}`);
    unlockAch('rank'+RANKS[gs.rank],`🏅 RANK ${RANKS[gs.rank]} 到達`);
    logGrow(`RANK ${RANKS[gs.rank]}に到達した`);
    // ランク報酬（収益）
    const reward=[0,5000,15000,30000,60000][gs.rank]||0;
    if(reward>0){gs.money+=reward;gs.debt=Math.max(0,gs.debt-Math.floor(reward*.4));showNotif(`💎 ランク報酬 +¥${reward.toLocaleString()}`);}
  }
}

// ──────────────────────────
// FACTORY
// ──────────────────────────
const EQ=[{e:'⚙️',n:'ギア'},{e:'🔩',n:'ボルト'},{e:'💡',n:'照明'},{e:'🔌',n:'配線'},{e:'🌡️',n:'温度計'},{e:'🔋',n:'電源'},{e:'📡',n:'センサー'},{e:'⛽',n:'燃料'},{e:'🔧',n:'バルブ'},{e:'🛢️',n:'タンク'},{e:'🔆',n:'ランプ'},{e:'💨',n:'換気'}];
let ft=null,ftl=30,ff=0,ftt=0,ps=[];
function openFactory(mode){
  if(mode==='diag'){openDiag();return;}
  AU.fadeBGM('factory',580);updateNavActive('factory');
  document.getElementById('panel-grid').innerHTML='';ps=[];ff=0;
  ftt=Math.floor(3+Math.random()*4+gs.skills.soundDiag);
  const fi=new Set();while(fi.size<ftt)fi.add(Math.floor(Math.random()*12));
  for(let i=0;i<12;i++){
    const fault=fi.has(i);ps.push({fault,fixed:false});const eq=EQ[i];
    const el=document.createElement('div');el.className='panel-item'+(fault?' fault':'');
    el.innerHTML=`${eq.e}<span class="plbl">${eq.n}</span>`;
    if(fault){const lb=document.createElement('div');lb.className='fault-lb';lb.textContent='ERR';el.appendChild(lb);}
    el.onclick=()=>{AU.se('tool');fixPanel(i,el);};
    document.getElementById('panel-grid').appendChild(el);
  }
  document.getElementById('mf-fixed').textContent=ff;document.getElementById('mf-total').textContent=ftt;
  ftl=30+gs.skills.emergencyFix*5;document.getElementById('mf-timer').textContent=ftl;
  clearInterval(ft);ft=setInterval(()=>{ftl--;document.getElementById('mf-timer').textContent=ftl;if(ftl<=0){AU.se('warn');clearInterval(ft);endFactory();}},1000);
  document.getElementById('factory-mini').classList.add('active');
}
function fixPanel(i,el){
  if(!ps[i].fault||ps[i].fixed)return;ps[i].fixed=true;ff++;
  el.classList.remove('fault');el.classList.add('fixed');el.querySelector('.fault-lb')?.remove();
  document.getElementById('mf-fixed').textContent=ff;AU.se('repair');
  if(ff>=ftt){clearInterval(ft);setTimeout(endFactory,320);}
}
function endFactory(){
  clearInterval(ft);document.getElementById('factory-mini').classList.remove('active');AU.fadeBGM('night',800);
  const perfect=ff>=ftt;
  const money=perfect?4500+gs.skills.wiring*700:ff*800;
  // 達成感で精神微回復
  const mentalChg=perfect?3:-3;
  gs.money+=money;gs.debt=Math.max(0,gs.debt-Math.floor(money*.4));
  gs.jobRep=Math.min(100,gs.jobRep+(perfect?10:ff*2));
  gs.mental=Math.min(100,Math.max(0,gs.mental+mentalChg));
  gs.fatigue=Math.min(100,gs.fatigue+10);
  gs.certKnow=Math.min(100,gs.certKnow+(perfect?3:1));gs.sp+=perfect?2:1;
  updatePersonality('factory');
  if(perfect&&Math.random()<.4){gs.factoryNetaAvail=true;gs.factoryNetaType='設備保全の怖い話';}
  logGrow(perfect?'設備点検を完璧にこなした':'設備点検を行った');
  advTime(120);updateStats();updateNavActive('main');

  // 行動後ナレーション
  const narr=getActNarr('factory_done');
  scenes.main.getText=getMainText;
  document.getElementById('dlg-speaker').textContent='ナレーター';
  typeText('dlg-content',narr,()=>{setTimeout(()=>loadScene('main'),1800);});

  if(perfect)cutin('normal','……今日の仕事も悪くなかったわね。');
  showResult(perfect?'⚙ 完璧な修理！':'🔧 修理完了',
    `修理 <span class="up">${ff}/${ftt}</span><br>`+
    `収入 <span class="up">+¥${money.toLocaleString()}</span><br>`+
    `精神力 <span class="${mentalChg>=0?'up':'down'}">${mentalChg>=0?'+':''}${mentalChg}</span>`);
}

// ──────────────────────────
// DIAG
// ──────────────────────────
let dt=null,dtl=25,df=0,dtt=0,dm=[];
function openDiag(){
  AU.fadeBGM('factory',580);updateNavActive('factory');
  df=0;dtt=4+Math.floor(gs.skills.soundDiag*.5);dtl=25;dm=[];
  const names=['ポンプA','モーターB','換気C','配管D','圧力E','温度F'];
  const cont=document.getElementById('diag-meters');cont.innerHTML='';
  for(let i=0;i<dtt;i++){
    const tgt=35+Math.random()*30,sv=Math.random()*100;dm.push({name:names[i%names.length],val:sv,tgt,adj:false});
    const row=document.createElement('div');row.className='meter-row';
    const cls=sv>80||sv<10?'m-danger':Math.abs(sv-tgt)<15?'m-ok':'m-warn';
    row.innerHTML=`<div class="meter-lbl">${names[i%names.length]}</div><div class="meter-bar"><div class="meter-fill ${cls}" id="mf${i}" style="width:${sv}%"></div></div><button style="padding:2px 8px;font-family:var(--mono);font-size:.56rem;background:rgba(0,232,200,.06);border:1px solid var(--cy);color:var(--cy);cursor:pointer;border-radius:2px;margin-left:5px;" onclick="adjustM(${i})">調整</button>`;
    cont.appendChild(row);
  }
  document.getElementById('dm-fixed').textContent=df;document.getElementById('dm-total').textContent=dtt;document.getElementById('dm-timer').textContent=dtl;
  document.getElementById('diag-res').textContent='危険域（赤）に入る前に調整してください';
  clearInterval(dt);dt=setInterval(()=>{dtl--;document.getElementById('dm-timer').textContent=dtl;dm.forEach((m,i)=>{if(m.adj)return;m.val+=(Math.random()-.28)*8;m.val=Math.max(0,Math.min(100,m.val));const f=document.getElementById('mf'+i);if(f){f.style.width=m.val+'%';f.className='meter-fill '+(m.val>80||m.val<10?'m-danger':Math.abs(m.val-m.tgt)<15?'m-ok':'m-warn');}});if(dtl<=0){AU.se('warn');clearInterval(dt);endDiag();}},740);
  document.getElementById('diag-mini').classList.add('active');
}
function adjustM(i){const m=dm[i];if(m.adj)return;m.adj=true;m.val=m.tgt+(Math.random()-.5)*8;df++;const f=document.getElementById('mf'+i);if(f){f.style.width=m.val+'%';f.className='meter-fill m-ok';}document.getElementById('dm-fixed').textContent=df;document.getElementById('diag-res').textContent=m.name+' → 正常範囲に調整完了';AU.se('repair');if(df>=dtt){clearInterval(dt);endDiag();}}
function endDiag(){
  clearInterval(dt);document.getElementById('diag-mini').classList.remove('active');AU.fadeBGM('night',800);
  const perfect=df>=dtt,money=perfect?3800:df*600;
  const mentalChg=perfect?3:-2;
  gs.money+=money;gs.debt=Math.max(0,gs.debt-Math.floor(money*.3));
  gs.jobRep=Math.min(100,gs.jobRep+(perfect?8:df*1.5));
  gs.mental=Math.min(100,Math.max(0,gs.mental+mentalChg));
  gs.fatigue=Math.min(100,gs.fatigue+8);gs.sp+=1;
  logGrow('温度・振動診断を行った');
  advTime(90);updateStats();updateNavActive('main');loadScene('main');
  showResult(perfect?'🌡 完璧な診断！':'📊 診断完了',`調整 <span class="up">${df}/${dtt}</span><br>収入 <span class="up">+¥${money.toLocaleString()}</span><br>精神力 <span class="${mentalChg>=0?'up':'down'}">${mentalChg>=0?'+':''}${mentalChg}</span>`);
}

// ──────────────────────────
// SONG
// ──────────────────────────
let st=null,stl=30,ssc=0,ssp=0,ssg=0,ssm=0,snw=null,an=[];
const LYR=['眠れない夜が','また来た','壇ノ浦から','這い上がれ','声が届くなら','今夜も繋がろう'];
let slri=0,sabiMode=false;
function buildCrowd(){const cw=document.getElementById('crowd-wave');cw.innerHTML='';for(let i=0;i<32;i++){const b=document.createElement('div');b.className='cw-bar';b.style.height=(4+Math.random()*12)+'px';cw.appendChild(b);}cw.classList.remove('show');}
function openSong(){
  ssc=0;ssp=0;ssg=0;ssm=0;an=[];slri=0;sabiMode=false;
  stl=30+Math.floor(gs.skills.singSkill*2);
  ['sg-p','sg-g','sg-m','sg-score'].forEach(id=>document.getElementById(id).textContent=0);
  document.getElementById('sg-timer').textContent=stl;document.getElementById('sg-thr').textContent=gs.throatFatigue;
  document.getElementById('song-lyr').textContent=LYR[0];
  document.getElementById('song-track').querySelectorAll('.falling-note').forEach(n=>n.remove());
  document.getElementById('song-track').classList.remove('sabi');
  buildCrowd();AU.fadeBGM('stream',380);clearInterval(st);clearInterval(snw);
  st=setInterval(()=>{stl--;document.getElementById('sg-timer').textContent=stl;slri=(slri+1)%LYR.length;document.getElementById('song-lyr').textContent=LYR[slri];const prev=sabiMode;sabiMode=stl<20&&stl>8;if(sabiMode!==prev){document.getElementById('song-track').classList.toggle('sabi',sabiMode);document.getElementById('crowd-wave').classList.toggle('show',sabiMode);}an=an.filter(n=>{const track=document.getElementById('song-track');if(parseInt(n.el.style.top)>track.offsetHeight+20){n.el.remove();ssm++;document.getElementById('sg-m').textContent=ssm;showJ('MISS');return false;}return true;});if(stl<=0){clearInterval(st);clearInterval(snw);endSong();}},1000);
  const spr=Math.max(520,1050-gs.skills.singSkill*42-(gs.throatFatigue>60?170:0));
  snw=setInterval(()=>{if(gs.throatFatigue>85&&Math.random()<.42)return;spawnNote(Math.floor(Math.random()*4));},spr);
  document.getElementById('song-mini').classList.add('active');
}
function spawnNote(lane){const track=document.getElementById('song-track'),le=document.getElementById('lane-'+lane);if(!le)return;const n=document.createElement('div');n.className='falling-note n-g';const lr=le.getBoundingClientRect(),tr=track.getBoundingClientRect();const w=45,h=17;n.style.cssText=`width:${w}px;height:${h}px;left:${lr.left-tr.left+(lr.width-w)/2}px;top:-22px;`;n.dataset.lane=lane;track.appendChild(n);const obj={el:n,lane,aiv:null};an.push(obj);let posY=-22;const spd=2.7+gs.skills.singSkill*.2;const aiv=setInterval(()=>{posY+=spd;n.style.top=posY+'px';if(posY>track.offsetHeight+20){clearInterval(aiv);n.remove();an=an.filter(x=>x.el!==n);}},16);obj.aiv=aiv;}
function hitNote(lane){const le=document.getElementById('lane-'+lane);le.classList.add('hit');setTimeout(()=>le.classList.remove('hit'),125);const track=document.getElementById('song-track'),hz=track.offsetHeight-56;let hit=false;for(let i=an.length-1;i>=0;i--){const n=an[i];if(parseInt(n.lane)!==lane)continue;const diff=Math.abs(parseInt(n.el.style.top)-hz+5);if(diff<42){clearInterval(n.aiv);n.el.remove();an.splice(i,1);if(diff<20){ssp++;ssc+=100;document.getElementById('sg-p').textContent=ssp;showJ('PERFECT');AU.se('decide');}else{ssg++;ssc+=50;document.getElementById('sg-g').textContent=ssg;showJ('GOOD');AU.se('btn');}document.getElementById('sg-score').textContent=ssc;hit=true;break;}}if(!hit){ssm++;document.getElementById('sg-m').textContent=ssm;showJ('MISS');}}
function showJ(type){const el=document.getElementById('song-jdg');el.textContent=type;el.style.color=type==='PERFECT'?'var(--cy)':type==='GOOD'?'var(--gd)':'var(--rd)';el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
function endSong(){
  clearInterval(st);clearInterval(snw);document.getElementById('song-mini').classList.remove('active');AU.fadeBGM('night',580);
  const total=ssp+ssg+ssm,acc=total>0?Math.floor((ssp+ssg*.5)/total*100):0;
  const flG=Math.floor(acc/8);
  const mentalChg=acc>70?6:acc>40?2:-2; // 成功時に精神回復
  gs.followers+=flG;gs.mental=Math.max(0,Math.min(100,gs.mental+mentalChg));
  gs.throatFatigue=Math.min(100,gs.throatFatigue+14);gs.skills.singSkill=Math.min(10,gs.skills.singSkill+(acc>60?.5:.1));
  gs.sp+=1;gs.rankPts+=flG*.3;
  if(acc>70)updatePersonality('song_good');
  checkRankUp();updateStats();loadScene('main');
  if(acc>70){cutin('win','ありがとう……今夜の歌は、届いたかな。');AU.playVoice('win');}
  logGrow(`歌枠を行った（精度${acc}%）`);
  showResult(acc>70?'🎵 素晴らしい歌声！':'🎵 歌枠終了',
    `精度 <span class="${acc>60?'up':'down'}">${acc}%</span><br>`+
    `PERFECT <span class="up">${ssp}</span><br>`+
    `フォロワー <span class="up">+${flG}</span><br>`+
    `精神力 <span class="${mentalChg>=0?'up':'down'}">${mentalChg>=0?'+':''}${mentalChg}</span>`);
}

// ──────────────────────────
// CUTIN
// ──────────────────────────
const CHAR_SVG={
  normal:`<defs> <radialGradient id="skin_n" cx="50%" cy="40%" r="60%"> <stop offset="0%" stop-color="#fde8d8"/> <stop offset="100%" stop-color="#f5c8b0"/> </radialGradient> <radialGradient id="eye_pu" cx="35%" cy="30%" r="70%"> <stop offset="0%" stop-color="#c060e0"/> <stop offset="60%" stop-color="#7020b0"/> <stop offset="100%" stop-color="#3a0870"/> </radialGradient> <linearGradient id="hair_pu" x1="0%" y1="0%" x2="100%" y2="100%"> <stop offset="0%" stop-color="#5820a0"/> <stop offset="100%" stop-color="#28086a"/> </linearGradient> <linearGradient id="shirt_stripe" x1="0%" y1="0%" x2="0%" y2="100%"> <stop offset="0%" stop-color="#fce8f0"/> <stop offset="20%" stop-color="#fce8f0"/> <stop offset="20%" stop-color="#f8a8c8"/> <stop offset="40%" stop-color="#f8a8c8"/> <stop offset="40%" stop-color="#fce8f0"/> <stop offset="60%" stop-color="#fce8f0"/> <stop offset="60%" stop-color="#f8a8c8"/> <stop offset="80%" stop-color="#f8a8c8"/> <stop offset="80%" stop-color="#fce8f0"/> <stop offset="100%" stop-color="#fce8f0"/> </linearGradient> </defs> <!-- 体・服 --> <!-- 白シャツ（外） --> <rect x="28" y="104" width="64" height="50" rx="10" fill="#f0e4f8" opacity=".95"/> <!-- ストライプシャツ（内） --> <rect x="36" y="106" width="48" height="46" rx="6" fill="url(#shirt_stripe)"/> <!-- えりもと --> <rect x="50" y="104" width="20" height="10" rx="3" fill="#fce8f0"/> <!-- ズボン --> <rect x="36" y="148" width="20" height="20" rx="6" fill="#6a3050"/> <rect x="64" y="148" width="20" height="20" rx="6" fill="#6a3050"/> <!-- チェック線 --> <line x1="36" y1="155" x2="56" y2="155" stroke="#4a1838" stroke-width=".8" opacity=".6"/> <line x1="36" y1="162" x2="56" y2="162" stroke="#4a1838" stroke-width=".8" opacity=".6"/> <line x1="46" y1="148" x2="46" y2="168" stroke="#4a1838" stroke-width=".8" opacity=".6"/> <line x1="64" y1="155" x2="84" y2="155" stroke="#4a1838" stroke-width=".8" opacity=".6"/> <line x1="64" y1="162" x2="84" y2="162" stroke="#4a1838" stroke-width=".8" opacity=".6"/> <line x1="74" y1="148" x2="74" y2="168" stroke="#4a1838" stroke-width=".8" opacity=".6"/> <!-- 腕 --> <rect x="14" y="106" width="16" height="32" rx="7" fill="#f0e4f8"/> <rect x="90" y="106" width="16" height="32" rx="7" fill="#f0e4f8"/> <!-- 手 --> <ellipse cx="22" cy="140" rx="9" ry="8" fill="url(#skin_n)"/> <ellipse cx="98" cy="140" rx="9" ry="8" fill="url(#skin_n)"/> <!-- 首 --> <rect x="52" y="90" width="16" height="18" rx="7" fill="url(#skin_n)"/> <!-- 顔 --> <ellipse cx="60" cy="66" rx="32" ry="30" fill="url(#skin_n)"/> <!-- 紫髪（後ろ・サイド） --> <ellipse cx="27" cy="64" rx="12" ry="22" fill="url(#hair_pu)"/> <ellipse cx="93" cy="64" rx="12" ry="22" fill="url(#hair_pu)"/> <!-- ロングヘア（右）＋ポニテ --> <path d="M 88 58 Q 108 72 106 96 Q 102 112 92 108 Q 88 100 90 88 Q 92 74 86 62" fill="url(#hair_pu)"/> <!-- 前髪・トップ --> <ellipse cx="60" cy="42" rx="33" ry="20" fill="url(#hair_pu)"/> <!-- 前髪の垂れ --> <path d="M 30 48 Q 28 58 32 65" stroke="#3a1068" stroke-width="5" fill="none" stroke-linecap="round"/> <path d="M 38 38 Q 34 52 36 62" stroke="#3a1068" stroke-width="4" fill="none" stroke-linecap="round"/> <path d="M 90 48 Q 92 58 88 65" stroke="#3a1068" stroke-width="5" fill="none" stroke-linecap="round"/> <!-- お花ヘアピン --> <circle cx="36" cy="56" r="6" fill="#f8b0c8"/> <circle cx="36" cy="56" r="3" fill="#ffe0ec"/> <circle cx="36" cy="50" r="3" fill="#f8b0c8"/> <circle cx="30" cy="56" r="3" fill="#f8b0c8"/> <circle cx="36" cy="62" r="3" fill="#f8b0c8"/> <circle cx="42" cy="56" r="3" fill="#f8b0c8"/> <!-- ピンクミニハット --> <ellipse cx="60" cy="34" rx="26" ry="7" fill="#e888c0"/> <rect x="46" y="14" width="28" height="22" rx="6" fill="#e888c0"/> <rect x="46" y="14" width="28" height="6" rx="3" fill="#cc6098"/> <!-- ハットのリボン --> <rect x="50" y="25" width="20" height="4" rx="2" fill="#cc6098"/> <!-- 耳（肌色） --> <ellipse cx="29" cy="68" rx="5" ry="7" fill="url(#skin_n)"/> <ellipse cx="91" cy="68" rx="5" ry="7" fill="url(#skin_n)"/> <!-- 眼鏡フレーム --> <rect x="35" y="65" width="18" height="13" rx="6" fill="none" stroke="#1a0830" stroke-width="2"/> <rect x="57" y="65" width="18" height="13" rx="6" fill="none" stroke="#1a0830" stroke-width="2"/> <line x1="53" y1="71" x2="57" y2="71" stroke="#1a0830" stroke-width="2"/> <line x1="35" y1="69" x2="29" y2="67" stroke="#1a0830" stroke-width="1.8"/> <line x1="75" y1="69" x2="81" y2="67" stroke="#1a0830" stroke-width="1.8"/> <!-- 目（アニメ風・大きい） --> <!-- 左目白目 --> <ellipse cx="44" cy="71" rx="7" ry="8" fill="white"/> <!-- 左瞳 --> <ellipse cx="44" cy="72" rx="5" ry="6" fill="url(#eye_pu)"/> <!-- 左瞳孔 --> <ellipse cx="44" cy="73" rx="2.5" ry="3" fill="#1a0030"/> <!-- 左目ハイライト --> <ellipse cx="46" cy="69" rx="2" ry="2.5" fill="white" opacity=".9"/> <circle cx="42" cy="74" r="1.2" fill="white" opacity=".6"/> <!-- 左下まつ毛 --> <line x1="38" y1="78" x2="36" y2="80" stroke="#1a0830" stroke-width="1.2"/> <line x1="41" y1="79" x2="40" y2="82" stroke="#1a0830" stroke-width="1.2"/> <line x1="44" y1="79" x2="44" y2="82" stroke="#1a0830" stroke-width="1.2"/> <line x1="47" y1="79" x2="48" y2="81" stroke="#1a0830" stroke-width="1.2"/> <!-- 右目 --> <ellipse cx="76" cy="71" rx="7" ry="8" fill="white"/> <ellipse cx="76" cy="72" rx="5" ry="6" fill="url(#eye_pu)"/> <ellipse cx="76" cy="73" rx="2.5" ry="3" fill="#1a0030"/> <ellipse cx="78" cy="69" rx="2" ry="2.5" fill="white" opacity=".9"/> <circle cx="74" cy="74" r="1.2" fill="white" opacity=".6"/> <line x1="70" y1="78" x2="68" y2="80" stroke="#1a0830" stroke-width="1.2"/> <line x1="73" y1="79" x2="72" y2="82" stroke="#1a0830" stroke-width="1.2"/> <line x1="76" y1="79" x2="76" y2="82" stroke="#1a0830" stroke-width="1.2"/> <line x1="79" y1="79" x2="80" y2="81" stroke="#1a0830" stroke-width="1.2"/> <!-- 眉 --> <path d="M 36 62 Q 44 58 52 62" stroke="#2a0858" stroke-width="2.2" fill="none" stroke-linecap="round"/> <path d="M 68 62 Q 76 58 84 62" stroke="#2a0858" stroke-width="2.2" fill="none" stroke-linecap="round"/> <!-- 口・笑顔 --> <path d="M 52 84 Q 60 92 68 84" stroke="#d86090" stroke-width="2" fill="none" stroke-linecap="round"/> <ellipse cx="60" cy="87" rx="5" ry="3" fill="#fbb0c8" opacity=".4"/> <!-- ほっぺ --> <ellipse cx="36" cy="80" rx="9" ry="5" fill="#ffb8cc" opacity=".35"/> <ellipse cx="84" cy="80" rx="9" ry="5" fill="#ffb8cc" opacity=".35"/>`,
  happy:`<defs> <radialGradient id="skin_h" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#fde8d8"/><stop offset="100%" stop-color="#f5c8b0"/></radialGradient> <radialGradient id="eye_hpu" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#c060e0"/><stop offset="60%" stop-color="#7020b0"/><stop offset="100%" stop-color="#3a0870"/></radialGradient> <linearGradient id="hair_hpu" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5820a0"/><stop offset="100%" stop-color="#28086a"/></linearGradient> </defs> <!-- 体 --> <rect x="28" y="104" width="64" height="50" rx="10" fill="#f0e4f8" opacity=".95"/> <rect x="36" y="106" width="48" height="46" rx="6" fill="#fce8f0"/> <rect x="36" y="106" width="48" height="8" fill="#f8a8c8"/> <rect x="36" y="120" width="48" height="8" fill="#f8a8c8"/> <rect x="36" y="134" width="48" height="8" fill="#f8a8c8"/> <rect x="36" y="148" width="20" height="20" rx="6" fill="#6a3050"/> <rect x="64" y="148" width="20" height="20" rx="6" fill="#6a3050"/> <!-- 片手上げ（振っている） --> <rect x="90" y="106" width="16" height="32" rx="7" fill="#f0e4f8"/> <ellipse cx="98" cy="140" rx="9" ry="8" fill="url(#skin_h)"/> <!-- 上げた腕 --> <rect x="9" y="82" width="16" height="30" rx="7" fill="#f0e4f8" transform="rotate(-30,17,97)"/> <ellipse cx="7" cy="84" rx="9" ry="8" fill="url(#skin_h)"/> <rect x="52" y="90" width="16" height="18" rx="7" fill="url(#skin_h)"/> <!-- 顔 --> <ellipse cx="60" cy="66" rx="32" ry="30" fill="url(#skin_h)"/> <ellipse cx="27" cy="64" rx="12" ry="22" fill="url(#hair_hpu)"/> <ellipse cx="93" cy="64" rx="12" ry="22" fill="url(#hair_hpu)"/> <path d="M 88 58 Q 108 72 106 96 Q 102 112 92 108" fill="url(#hair_hpu)"/> <ellipse cx="60" cy="42" rx="33" ry="20" fill="url(#hair_hpu)"/> <path d="M 30 48 Q 28 58 32 65" stroke="#3a1068" stroke-width="5" fill="none" stroke-linecap="round"/> <path d="M 38 38 Q 34 52 36 62" stroke="#3a1068" stroke-width="4" fill="none" stroke-linecap="round"/> <path d="M 90 48 Q 92 58 88 65" stroke="#3a1068" stroke-width="5" fill="none" stroke-linecap="round"/> <!-- お花 --> <circle cx="36" cy="56" r="6" fill="#f8b0c8"/><circle cx="36" cy="56" r="3" fill="#ffe0ec"/> <circle cx="36" cy="50" r="3" fill="#f8b0c8"/><circle cx="30" cy="56" r="3" fill="#f8b0c8"/> <circle cx="36" cy="62" r="3" fill="#f8b0c8"/><circle cx="42" cy="56" r="3" fill="#f8b0c8"/> <!-- ハット --> <ellipse cx="60" cy="34" rx="26" ry="7" fill="#e888c0"/> <rect x="46" y="14" width="28" height="22" rx="6" fill="#e888c0"/> <rect x="46" y="14" width="28" height="6" rx="3" fill="#cc6098"/> <rect x="50" y="25" width="20" height="4" rx="2" fill="#cc6098"/> <!-- 耳 --> <ellipse cx="29" cy="68" rx="5" ry="7" fill="url(#skin_h)"/> <ellipse cx="91" cy="68" rx="5" ry="7" fill="url(#skin_h)"/> <!-- 眼鏡 --> <rect x="35" y="65" width="18" height="13" rx="6" fill="none" stroke="#1a0830" stroke-width="2"/> <rect x="57" y="65" width="18" height="13" rx="6" fill="none" stroke="#1a0830" stroke-width="2"/> <line x1="53" y1="71" x2="57" y2="71" stroke="#1a0830" stroke-width="2"/> <line x1="35" y1="69" x2="29" y2="67" stroke="#1a0830" stroke-width="1.8"/> <line x1="75" y1="69" x2="81" y2="67" stroke="#1a0830" stroke-width="1.8"/> <!-- 目（笑って細め） --> <path d="M 37 72 Q 44 65 51 72" stroke="#7020b0" stroke-width="3" fill="#d8a0f0" stroke-linecap="round"/> <path d="M 69 72 Q 76 65 83 72" stroke="#7020b0" stroke-width="3" fill="#d8a0f0" stroke-linecap="round"/> <!-- 下まつ毛 --> <line x1="39" y1="74" x2="38" y2="77" stroke="#1a0830" stroke-width="1.2"/> <line x1="44" y1="75" x2="44" y2="78" stroke="#1a0830" stroke-width="1.2"/> <line x1="49" y1="74" x2="50" y2="77" stroke="#1a0830" stroke-width="1.2"/> <line x1="71" y1="74" x2="70" y2="77" stroke="#1a0830" stroke-width="1.2"/> <line x1="76" y1="75" x2="76" y2="78" stroke="#1a0830" stroke-width="1.2"/> <line x1="81" y1="74" x2="82" y2="77" stroke="#1a0830" stroke-width="1.2"/> <!-- ほっぺ赤み強め --> <ellipse cx="34" cy="80" rx="11" ry="6" fill="#ffb8cc" opacity=".5"/> <ellipse cx="86" cy="80" rx="11" ry="6" fill="#ffb8cc" opacity=".5"/> <!-- 眉（嬉しそう上がり） --> <path d="M 36 60 Q 44 55 52 59" stroke="#2a0858" stroke-width="2.2" fill="none" stroke-linecap="round"/> <path d="M 68 59 Q 76 55 84 60" stroke="#2a0858" stroke-width="2.2" fill="none" stroke-linecap="round"/> <!-- 大笑顔 --> <path d="M 50 84 Q 60 96 70 84" stroke="#d86090" stroke-width="2.2" fill="#fbb0c8" stroke-linecap="round"/> <!-- キラキラ --> <text x="6" y="52" font-size="14" fill="#f8c8e8" opacity=".9">✦</text> <text x="96" y="45" font-size="10" fill="#d0a0f0" opacity=".8">✦</text>`,
  win:`<defs> <radialGradient id="skin_w" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#fde8d8"/><stop offset="100%" stop-color="#f5c8b0"/></radialGradient> <radialGradient id="eye_wpu" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#c060e0"/><stop offset="60%" stop-color="#7020b0"/><stop offset="100%" stop-color="#3a0870"/></radialGradient> <linearGradient id="hair_wpu" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#5820a0"/><stop offset="100%" stop-color="#28086a"/></linearGradient> </defs> <rect x="28" y="104" width="64" height="50" rx="10" fill="#f0e4f8" opacity=".95"/> <rect x="36" y="106" width="48" height="46" rx="6" fill="#fce8f0"/> <rect x="36" y="106" width="48" height="8" fill="#f8a8c8"/> <rect x="36" y="120" width="48" height="8" fill="#f8a8c8"/> <rect x="36" y="134" width="48" height="8" fill="#f8a8c8"/> <rect x="36" y="148" width="20" height="20" rx="6" fill="#6a3050"/> <rect x="64" y="148" width="20" height="20" rx="6" fill="#6a3050"/> <!-- 両腕ガッツポーズ --> <rect x="8" y="86" width="16" height="26" rx="7" fill="#f0e4f8" transform="rotate(-35,16,99)"/> <rect x="96" y="86" width="16" height="26" rx="7" fill="#f0e4f8" transform="rotate(35,104,99)"/> <ellipse cx="7" cy="88" rx="9" ry="8" fill="url(#skin_w)"/> <ellipse cx="113" cy="88" rx="9" ry="8" fill="url(#skin_w)"/> <rect x="52" y="90" width="16" height="18" rx="7" fill="url(#skin_w)"/> <ellipse cx="60" cy="66" rx="32" ry="30" fill="url(#skin_w)"/> <ellipse cx="27" cy="64" rx="12" ry="22" fill="url(#hair_wpu)"/> <ellipse cx="93" cy="64" rx="12" ry="22" fill="url(#hair_wpu)"/> <path d="M 88 58 Q 108 72 106 96 Q 102 112 92 108" fill="url(#hair_wpu)"/> <ellipse cx="60" cy="42" rx="33" ry="20" fill="url(#hair_wpu)"/> <path d="M 30 48 Q 28 58 32 65" stroke="#3a1068" stroke-width="5" fill="none" stroke-linecap="round"/> <path d="M 38 38 Q 34 52 36 62" stroke="#3a1068" stroke-width="4" fill="none" stroke-linecap="round"/> <path d="M 90 48 Q 92 58 88 65" stroke="#3a1068" stroke-width="5" fill="none" stroke-linecap="round"/> <circle cx="36" cy="56" r="6" fill="#f8b0c8"/><circle cx="36" cy="56" r="3" fill="#ffe0ec"/> <circle cx="36" cy="50" r="3" fill="#f8b0c8"/><circle cx="30" cy="56" r="3" fill="#f8b0c8"/> <circle cx="36" cy="62" r="3" fill="#f8b0c8"/><circle cx="42" cy="56" r="3" fill="#f8b0c8"/> <ellipse cx="60" cy="34" rx="26" ry="7" fill="#e888c0"/> <rect x="46" y="14" width="28" height="22" rx="6" fill="#e888c0"/> <rect x="46" y="14" width="28" height="6" rx="3" fill="#cc6098"/> <rect x="50" y="25" width="20" height="4" rx="2" fill="#cc6098"/> <ellipse cx="29" cy="68" rx="5" ry="7" fill="url(#skin_w)"/> <ellipse cx="91" cy="68" rx="5" ry="7" fill="url(#skin_w)"/> <rect x="35" y="65" width="18" height="13" rx="6" fill="none" stroke="#1a0830" stroke-width="2"/> <rect x="57" y="65" width="18" height="13" rx="6" fill="none" stroke="#1a0830" stroke-width="2"/> <line x1="53" y1="71" x2="57" y2="71" stroke="#1a0830" stroke-width="2"/> <line x1="35" y1="69" x2="29" y2="67" stroke="#1a0830" stroke-width="1.8"/> <line x1="75" y1="69" x2="81" y2="67" stroke="#1a0830" stroke-width="1.8"/> <!-- 目（キリッ輝き） --> <ellipse cx="44" cy="71" rx="7" ry="8" fill="white"/> <ellipse cx="44" cy="72" rx="5" ry="6" fill="url(#eye_wpu)"/> <ellipse cx="44" cy="73" rx="2.5" ry="3" fill="#1a0030"/> <ellipse cx="46.5" cy="68.5" rx="2.5" ry="3" fill="white" opacity=".95"/> <circle cx="42" cy="74" r="1.2" fill="white" opacity=".6"/> <ellipse cx="76" cy="71" rx="7" ry="8" fill="white"/> <ellipse cx="76" cy="72" rx="5" ry="6" fill="url(#eye_wpu)"/> <ellipse cx="76" cy="73" rx="2.5" ry="3" fill="#1a0030"/> <ellipse cx="78.5" cy="68.5" rx="2.5" ry="3" fill="white" opacity=".95"/> <circle cx="74" cy="74" r="1.2" fill="white" opacity=".6"/> <!-- 下まつ毛 --> <line x1="38" y1="78" x2="36" y2="81" stroke="#1a0830" stroke-width="1.2"/> <line x1="44" y1="79" x2="44" y2="82" stroke="#1a0830" stroke-width="1.2"/> <line x1="50" y1="78" x2="51" y2="81" stroke="#1a0830" stroke-width="1.2"/> <line x1="70" y1="78" x2="68" y2="81" stroke="#1a0830" stroke-width="1.2"/> <line x1="76" y1="79" x2="76" y2="82" stroke="#1a0830" stroke-width="1.2"/> <line x1="82" y1="78" x2="83" y2="81" stroke="#1a0830" stroke-width="1.2"/> <!-- 眉（強く） --> <path d="M 35 60 Q 44 55 52 60" stroke="#2a0858" stroke-width="2.5" fill="none" stroke-linecap="round"/> <path d="M 68 60 Q 76 55 85 60" stroke="#2a0858" stroke-width="2.5" fill="none" stroke-linecap="round"/> <!-- 口（きゅっと笑） --> <path d="M 52 84 Q 60 91 68 84" stroke="#d86090" stroke-width="2" fill="none" stroke-linecap="round"/> <!-- 星 --> <text x="0" y="40" font-size="16" fill="#f8d040" opacity=".92">★</text> <text x="96" y="35" font-size="13" fill="#f0c040" opacity=".85">★</text> <text x="100" y="115" font-size="10" fill="#a0e040" opacity=".7">✦</text>`,
  tired:`<defs> <radialGradient id="skin_t" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#eedfe0"/><stop offset="100%" stop-color="#e0c8c8"/></radialGradient> <radialGradient id="eye_tpu" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#d090e0"/><stop offset="60%" stop-color="#9060c0"/><stop offset="100%" stop-color="#5030a0"/></radialGradient> <linearGradient id="hair_wh" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e8e0f4"/><stop offset="100%" stop-color="#c8c0e0"/></linearGradient> <linearGradient id="hoodie_pk" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f870c0"/><stop offset="100%" stop-color="#e04898"/></linearGradient> </defs> <!-- ズボン（黒） --> <rect x="38" y="148" width="20" height="20" rx="6" fill="#14102a"/> <rect x="62" y="148" width="20" height="20" rx="6" fill="#14102a"/> <!-- パーカー（ピンク） --> <rect x="26" y="100" width="68" height="52" rx="12" fill="url(#hoodie_pk)"/> <!-- パーカー前面ライン --> <line x1="60" y1="102" x2="60" y2="152" stroke="#b83078" stroke-width="2" opacity=".4"/> <!-- フード --> <path d="M 30 100 Q 20 88 28 76 Q 38 66 60 66 Q 82 66 92 76 Q 100 88 90 100" fill="url(#hoodie_pk)"/> <!-- パーカー紐 --> <path d="M 54 102 Q 50 112 52 118" stroke="#b83078" stroke-width="2.5" fill="none" stroke-linecap="round"/> <path d="M 66 102 Q 70 112 68 118" stroke="#b83078" stroke-width="2.5" fill="none" stroke-linecap="round"/> <!-- ポケット --> <rect x="35" y="122" width="16" height="14" rx="4" fill="#b83078" opacity=".4"/> <rect x="69" y="122" width="16" height="14" rx="4" fill="#b83078" opacity=".4"/> <!-- 腕（下がり） --> <rect x="10" y="104" width="18" height="34" rx="8" fill="url(#hoodie_pk)"/> <rect x="92" y="104" width="18" height="34" rx="8" fill="url(#hoodie_pk)"/> <!-- 手 --> <ellipse cx="19" cy="140" rx="10" ry="9" fill="url(#skin_t)"/> <ellipse cx="101" cy="140" rx="10" ry="9" fill="url(#skin_t)"/> <!-- 首 --> <rect x="52" y="88" width="16" height="16" rx="7" fill="url(#skin_t)"/> <!-- 顔 --> <ellipse cx="60" cy="64" rx="32" ry="30" fill="url(#skin_t)"/> <!-- 白髪（後ろ・サイド） --> <ellipse cx="27" cy="62" rx="13" ry="24" fill="url(#hair_wh)"/> <ellipse cx="93" cy="62" rx="13" ry="24" fill="url(#hair_wh)"/> <!-- 白髪（前） --> <ellipse cx="60" cy="40" rx="34" ry="22" fill="url(#hair_wh)"/> <!-- 毛先ハイライト --> <ellipse cx="60" cy="35" rx="28" ry="12" fill="white" opacity=".35"/> <!-- 前髪垂れ --> <path d="M 32 48 Q 30 60 34 66" stroke="#d0c8e0" stroke-width="6" fill="none" stroke-linecap="round"/> <path d="M 40 38 Q 36 54 38 64" stroke="#d0c8e0" stroke-width="5" fill="none" stroke-linecap="round"/> <path d="M 88 48 Q 90 60 86 66" stroke="#d0c8e0" stroke-width="6" fill="none" stroke-linecap="round"/> <!-- 猫耳（大きい） --> <polygon points="26,46 10,8 44,40" fill="url(#hair_wh)"/> <polygon points="28,44 16,14 40,38" fill="#f4a0c0"/> <!-- 耳の内側のふわふわ --> <ellipse cx="27" cy="28" rx="5" ry="8" fill="white" opacity=".5" transform="rotate(-15,27,28)"/> <polygon points="94,46 110,8 76,40" fill="url(#hair_wh)"/> <polygon points="92,44 104,14 80,38" fill="#f4a0c0"/> <ellipse cx="93" cy="28" rx="5" ry="8" fill="white" opacity=".5" transform="rotate(15,93,28)"/> <!-- お花ヘアピン（猫耳モード） --> <circle cx="78" cy="42" r="5" fill="#f8b0c8"/><circle cx="78" cy="42" r="2.5" fill="#ffe0ec"/> <circle cx="78" cy="37" r="2.5" fill="#f8b0c8"/><circle cx="73" cy="42" r="2.5" fill="#f8b0c8"/> <circle cx="78" cy="47" r="2.5" fill="#f8b0c8"/><circle cx="83" cy="42" r="2.5" fill="#f8b0c8"/> <!-- しっぽ（白・ふわふわ） --> <path d="M 88 148 Q 116 132 112 158 Q 108 170 96 164" stroke="url(#hair_wh)" stroke-width="12" fill="none" stroke-linecap="round"/> <ellipse cx="95" cy="164" rx="9" ry="8" fill="url(#hair_wh)"/> <ellipse cx="95" cy="164" rx="7" ry="6" fill="white" opacity=".5"/> <!-- 耳（肌色） --> <ellipse cx="29" cy="68" rx="5" ry="7" fill="url(#skin_t)"/> <ellipse cx="91" cy="68" rx="5" ry="7" fill="url(#skin_t)"/> <!-- 眼鏡 --> <rect x="35" y="65" width="18" height="13" rx="6" fill="none" stroke="#6040a0" stroke-width="1.8"/> <rect x="57" y="65" width="18" height="13" rx="6" fill="none" stroke="#6040a0" stroke-width="1.8"/> <line x1="53" y1="71" x2="57" y2="71" stroke="#6040a0" stroke-width="1.8"/> <line x1="35" y1="69" x2="29" y2="67" stroke="#6040a0" stroke-width="1.5"/> <line x1="75" y1="69" x2="81" y2="67" stroke="#6040a0" stroke-width="1.5"/> <!-- 目（だるそう・半目） --> <ellipse cx="44" cy="71" rx="7" ry="5" fill="white"/> <ellipse cx="44" cy="72" rx="5" ry="3.5" fill="url(#eye_tpu)"/> <ellipse cx="44" cy="73" rx="2.5" ry="2" fill="#2a1050"/> <ellipse cx="46" cy="70" rx="1.8" ry="2" fill="white" opacity=".8"/> <ellipse cx="76" cy="71" rx="7" ry="5" fill="white"/> <ellipse cx="76" cy="72" rx="5" ry="3.5" fill="url(#eye_tpu)"/> <ellipse cx="76" cy="73" rx="2.5" ry="2" fill="#2a1050"/> <ellipse cx="78" cy="70" rx="1.8" ry="2" fill="white" opacity=".8"/> <!-- まつ毛（眠そう） --> <line x1="38" y1="76" x2="37" y2="79" stroke="#6040a0" stroke-width="1.2"/> <line x1="44" y1="77" x2="44" y2="80" stroke="#6040a0" stroke-width="1.2"/> <line x1="50" y1="76" x2="51" y2="79" stroke="#6040a0" stroke-width="1.2"/> <line x1="70" y1="76" x2="69" y2="79" stroke="#6040a0" stroke-width="1.2"/> <line x1="76" y1="77" x2="76" y2="80" stroke="#6040a0" stroke-width="1.2"/> <line x1="82" y1="76" x2="83" y2="79" stroke="#6040a0" stroke-width="1.2"/> <!-- 目のクマ --> <ellipse cx="44" cy="77" rx="9" ry="4" fill="rgba(80,40,100,.3)"/> <ellipse cx="76" cy="77" rx="9" ry="4" fill="rgba(80,40,100,.3)"/> <!-- 眉（下がり） --> <path d="M 37 62 Q 44 65 51 62" stroke="#8060b0" stroke-width="2" fill="none" stroke-linecap="round"/> <path d="M 69 62 Q 76 65 83 62" stroke="#8060b0" stroke-width="2" fill="none" stroke-linecap="round"/> <!-- 口（への字） --> <path d="M 52 83 Q 60 80 68 83" stroke="#b07898" stroke-width="1.8" fill="none" stroke-linecap="round"/> <!-- 青炎 --> <path d="M 14 35 Q 17 22 12 12 Q 17 20 19 10 Q 14 24 22 32" fill="#60c8ff" opacity=".8"/> <path d="M 103 33 Q 106 20 101 10 Q 106 18 108 8 Q 103 22 111 30" fill="#60c8ff" opacity=".8"/>`,
  fear:`<defs> <radialGradient id="skin_f" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#eedfe0"/><stop offset="100%" stop-color="#e0c8c8"/></radialGradient> <radialGradient id="eye_fpu" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#d090e0"/><stop offset="60%" stop-color="#9060c0"/><stop offset="100%" stop-color="#5030a0"/></radialGradient> <linearGradient id="hair_fwh" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e8e0f4"/><stop offset="100%" stop-color="#c8c0e0"/></linearGradient> <linearGradient id="hoodie_fpk" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#f870c0"/><stop offset="100%" stop-color="#e04898"/></linearGradient> </defs> <rect x="38" y="148" width="20" height="20" rx="6" fill="#14102a"/> <rect x="62" y="148" width="20" height="20" rx="6" fill="#14102a"/> <rect x="26" y="100" width="68" height="52" rx="12" fill="url(#hoodie_fpk)"/> <path d="M 30 100 Q 20 88 28 76 Q 38 66 60 66 Q 82 66 92 76 Q 100 88 90 100" fill="url(#hoodie_fpk)"/> <line x1="60" y1="102" x2="60" y2="152" stroke="#b83078" stroke-width="2" opacity=".4"/> <path d="M 54 102 Q 50 112 52 118" stroke="#b83078" stroke-width="2.5" fill="none" stroke-linecap="round"/> <path d="M 66 102 Q 70 112 68 118" stroke="#b83078" stroke-width="2.5" fill="none" stroke-linecap="round"/> <!-- 腕（自分を抱きしめる） --> <path d="M 10 112 Q 22 106 40 116 Q 30 126 18 126" fill="url(#hoodie_fpk)"/> <path d="M 110 112 Q 98 106 80 116 Q 90 126 102 126" fill="url(#hoodie_fpk)"/> <rect x="52" y="88" width="16" height="16" rx="7" fill="url(#skin_f)"/> <!-- 顔 --> <ellipse cx="60" cy="64" rx="32" ry="30" fill="url(#skin_f)"/> <!-- 白髪 --> <ellipse cx="27" cy="62" rx="13" ry="24" fill="url(#hair_fwh)"/> <ellipse cx="93" cy="62" rx="13" ry="24" fill="url(#hair_fwh)"/> <ellipse cx="60" cy="40" rx="34" ry="22" fill="url(#hair_fwh)"/> <ellipse cx="60" cy="35" rx="28" ry="12" fill="white" opacity=".35"/> <path d="M 32 48 Q 30 60 34 66" stroke="#d0c8e0" stroke-width="6" fill="none" stroke-linecap="round"/> <path d="M 40 38 Q 36 54 38 64" stroke="#d0c8e0" stroke-width="5" fill="none" stroke-linecap="round"/> <path d="M 88 48 Q 90 60 86 66" stroke="#d0c8e0" stroke-width="6" fill="none" stroke-linecap="round"/> <!-- 猫耳（逆立ち） --> <polygon points="24,44 8,4 42,38" fill="url(#hair_fwh)"/> <polygon points="26,42 14,10 38,36" fill="#f4a0c0"/> <ellipse cx="24" cy="24" rx="5" ry="9" fill="white" opacity=".5" transform="rotate(-18,24,24)"/> <polygon points="96,44 112,4 78,38" fill="url(#hair_fwh)"/> <polygon points="94,42 106,10 82,36" fill="#f4a0c0"/> <ellipse cx="96" cy="24" rx="5" ry="9" fill="white" opacity=".5" transform="rotate(18,96,24)"/> <!-- しっぽ（逆立ち） --> <path d="M 88 142 Q 116 126 114 106 Q 110 95 102 102" stroke="url(#hair_fwh)" stroke-width="11" fill="none" stroke-linecap="round"/> <!-- お花 --> <circle cx="78" cy="42" r="5" fill="#f8b0c8"/><circle cx="78" cy="42" r="2.5" fill="#ffe0ec"/> <circle cx="78" cy="37" r="2.5" fill="#f8b0c8"/><circle cx="73" cy="42" r="2.5" fill="#f8b0c8"/> <circle cx="78" cy="47" r="2.5" fill="#f8b0c8"/><circle cx="83" cy="42" r="2.5" fill="#f8b0c8"/> <ellipse cx="29" cy="68" rx="5" ry="7" fill="url(#skin_f)"/> <ellipse cx="91" cy="68" rx="5" ry="7" fill="url(#skin_f)"/> <!-- 眼鏡 --> <rect x="35" y="65" width="18" height="13" rx="6" fill="none" stroke="#6040a0" stroke-width="1.8"/> <rect x="57" y="65" width="18" height="13" rx="6" fill="none" stroke="#6040a0" stroke-width="1.8"/> <line x1="53" y1="71" x2="57" y2="71" stroke="#6040a0" stroke-width="1.8"/> <line x1="35" y1="69" x2="29" y2="67" stroke="#6040a0" stroke-width="1.5"/> <line x1="75" y1="69" x2="81" y2="67" stroke="#6040a0" stroke-width="1.5"/> <!-- 目（見開き！） --> <ellipse cx="44" cy="71" rx="8" ry="9" fill="white"/> <ellipse cx="44" cy="72" rx="6" ry="7" fill="url(#eye_fpu)"/> <ellipse cx="44" cy="73" rx="3" ry="3.5" fill="#1a0030"/> <ellipse cx="46.5" cy="68.5" rx="2.5" ry="3" fill="white" opacity=".95"/> <circle cx="41.5" cy="75" r="1.5" fill="white" opacity=".7"/> <ellipse cx="76" cy="71" rx="8" ry="9" fill="white"/> <ellipse cx="76" cy="72" rx="6" ry="7" fill="url(#eye_fpu)"/> <ellipse cx="76" cy="73" rx="3" ry="3.5" fill="#1a0030"/> <ellipse cx="78.5" cy="68.5" rx="2.5" ry="3" fill="white" opacity=".95"/> <circle cx="73.5" cy="75" r="1.5" fill="white" opacity=".7"/> <!-- まつ毛 --> <line x1="37" y1="78" x2="35" y2="82" stroke="#6040a0" stroke-width="1.3"/> <line x1="44" y1="80" x2="44" y2="84" stroke="#6040a0" stroke-width="1.3"/> <line x1="51" y1="78" x2="53" y2="82" stroke="#6040a0" stroke-width="1.3"/> <line x1="69" y1="78" x2="67" y2="82" stroke="#6040a0" stroke-width="1.3"/> <line x1="76" y1="80" x2="76" y2="84" stroke="#6040a0" stroke-width="1.3"/> <line x1="83" y1="78" x2="85" y2="82" stroke="#6040a0" stroke-width="1.3"/> <!-- 眉（吊り上がり） --> <path d="M 36 60 Q 44 55 52 59" stroke="#8060b0" stroke-width="2.3" fill="none" stroke-linecap="round"/> <path d="M 68 59 Q 76 55 84 60" stroke="#8060b0" stroke-width="2.3" fill="none" stroke-linecap="round"/> <!-- 口「あ」 --> <ellipse cx="60" cy="83" rx="6" ry="5" fill="#d05878"/> <!-- 汗 --> <path d="M 20 48 Q 23 40 21 33" stroke="#90d8ff" stroke-width="2.5" fill="none" stroke-linecap="round"/> <!-- 青炎（強め） --> <path d="M 6 38 Q 9 24 5 12 Q 10 22 12 10 Q 7 26 16 34" fill="#60c8ff" opacity=".88"/> <path d="M 110 36 Q 113 22 109 10 Q 114 20 116 8 Q 111 24 120 32" fill="#60c8ff" opacity=".88"/>`,
  collapse:`<defs> <radialGradient id="skin_c" cx="50%" cy="40%" r="60%"><stop offset="0%" stop-color="#e0d0d8"/><stop offset="100%" stop-color="#d0c0c8"/></radialGradient> <radialGradient id="eye_cpu" cx="35%" cy="30%" r="70%"><stop offset="0%" stop-color="#b070c8"/><stop offset="60%" stop-color="#7040a0"/><stop offset="100%" stop-color="#401870"/></radialGradient> <linearGradient id="hair_cwh" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d8d0ec"/><stop offset="100%" stop-color="#b8b0d0"/></linearGradient> <linearGradient id="hoodie_cpk" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#c04888"/><stop offset="100%" stop-color="#903060"/></linearGradient> </defs> <!-- 座り込みポーズ --> <!-- 膝 --> <ellipse cx="40" cy="152" rx="22" ry="14" fill="#14102a" opacity=".88"/> <ellipse cx="80" cy="152" rx="22" ry="14" fill="#14102a" opacity=".88"/> <!-- パーカー（くたびれ） --> <rect x="24" y="102" width="72" height="58" rx="14" fill="url(#hoodie_cpk)" opacity=".85"/> <path d="M 28 102 Q 16 90 24 78 Q 34 68 60 68 Q 86 68 96 78 Q 104 90 92 102" fill="url(#hoodie_cpk)" opacity=".85"/> <line x1="60" y1="104" x2="60" y2="160" stroke="#702048" stroke-width="1.5" opacity=".3"/> <!-- 腕（力なく） --> <path d="M 8 116 Q 22 108 44 120 Q 34 130 16 130" fill="url(#hoodie_cpk)" opacity=".85"/> <path d="M 112 116 Q 98 108 76 120 Q 86 130 104 130" fill="url(#hoodie_cpk)" opacity=".85"/> <ellipse cx="12" cy="130" rx="11" ry="10" fill="url(#skin_c)"/> <ellipse cx="108" cy="130" rx="11" ry="10" fill="url(#skin_c)"/> <rect x="52" y="90" width="16" height="16" rx="7" fill="url(#skin_c)"/> <!-- 顔（うつむき） --> <ellipse cx="60" cy="68" rx="32" ry="30" fill="url(#skin_c)"/> <!-- 白髪（乱れ） --> <ellipse cx="27" cy="66" rx="13" ry="25" fill="url(#hair_cwh)"/> <ellipse cx="93" cy="66" rx="13" ry="25" fill="url(#hair_cwh)"/> <ellipse cx="60" cy="42" rx="34" ry="22" fill="url(#hair_cwh)"/> <ellipse cx="60" cy="36" rx="28" ry="12" fill="white" opacity=".25"/> <!-- 前髪（乱れ） --> <path d="M 32 50 Q 28 64 32 70" stroke="#c8c0e0" stroke-width="7" fill="none" stroke-linecap="round"/> <path d="M 40 38 Q 34 56 36 66" stroke="#c8c0e0" stroke-width="6" fill="none" stroke-linecap="round"/> <path d="M 52 36 Q 50 52 52 60" stroke="#c8c0e0" stroke-width="5" fill="none" stroke-linecap="round"/> <path d="M 88 50 Q 92 64 88 70" stroke="#c8c0e0" stroke-width="7" fill="none" stroke-linecap="round"/> <!-- 猫耳（垂れ下がり） --> <polygon points="26,50 12,22 40,44" fill="url(#hair_cwh)" transform="rotate(20,26,36)"/> <polygon points="28,48 18,26 36,42" fill="#d899b8" transform="rotate(20,27,34)"/> <ellipse cx="24" cy="30" rx="4" ry="8" fill="white" opacity=".3" transform="rotate(20,24,30)"/> <polygon points="94,50 108,22 80,44" fill="url(#hair_cwh)" transform="rotate(-20,94,36)"/> <polygon points="92,48 102,26 84,42" fill="#d899b8" transform="rotate(-20,93,34)"/> <ellipse cx="96" cy="30" rx="4" ry="8" fill="white" opacity=".3" transform="rotate(-20,96,30)"/> <!-- お花（しおれ気味） --> <circle cx="78" cy="44" r="4.5" fill="#d890b0" opacity=".7"/><circle cx="78" cy="44" r="2.2" fill="#ffd8e8" opacity=".7"/> <circle cx="78" cy="39.5" r="2.2" fill="#d890b0" opacity=".7"/><circle cx="73.5" cy="44" r="2.2" fill="#d890b0" opacity=".7"/> <circle cx="78" cy="48.5" r="2.2" fill="#d890b0" opacity=".7"/><circle cx="82.5" cy="44" r="2.2" fill="#d890b0" opacity=".7"/> <!-- しっぽ（だらん） --> <path d="M 90 152 Q 110 158 106 170" stroke="url(#hair_cwh)" stroke-width="13" fill="none" stroke-linecap="round" opacity=".82"/> <ellipse cx="105" cy="170" rx="8" ry="7" fill="url(#hair_cwh)" opacity=".82"/> <ellipse cx="105" cy="170" rx="5" ry="4" fill="white" opacity=".3"/> <!-- 耳 --> <ellipse cx="29" cy="72" rx="5" ry="7" fill="url(#skin_c)"/> <ellipse cx="91" cy="72" rx="5" ry="7" fill="url(#skin_c)"/> <!-- 眼鏡（ずれ気味） --> <rect x="34" y="69" width="18" height="13" rx="6" fill="none" stroke="#806898" stroke-width="1.6" transform="rotate(3,43,75)"/> <rect x="56" y="68" width="18" height="13" rx="6" fill="none" stroke="#806898" stroke-width="1.6" transform="rotate(3,65,74)"/> <line x1="52" y1="74" x2="56" y2="73" stroke="#806898" stroke-width="1.6"/> <!-- 目（虚ろ） --> <ellipse cx="43" cy="75" rx="7" ry="6" fill="white" opacity=".85"/> <ellipse cx="43" cy="76" rx="4.5" ry="4" fill="url(#eye_cpu)" opacity=".8"/> <ellipse cx="43" cy="77" rx="2" ry="2" fill="#2a1050" opacity=".7"/> <ellipse cx="44.5" cy="73.5" rx="1.5" ry="1.8" fill="white" opacity=".5"/> <ellipse cx="75" cy="75" rx="7" ry="6" fill="white" opacity=".85"/> <ellipse cx="75" cy="76" rx="4.5" ry="4" fill="url(#eye_cpu)" opacity=".8"/> <ellipse cx="75" cy="77" rx="2" ry="2" fill="#2a1050" opacity=".7"/> <ellipse cx="76.5" cy="73.5" rx="1.5" ry="1.8" fill="white" opacity=".5"/> <!-- まつ毛（力なし） --> <line x1="37" y1="80" x2="36" y2="83" stroke="#806898" stroke-width="1.1"/> <line x1="43" y1="81" x2="43" y2="84" stroke="#806898" stroke-width="1.1"/> <line x1="49" y1="80" x2="50" y2="83" stroke="#806898" stroke-width="1.1"/> <line x1="69" y1="80" x2="68" y2="83" stroke="#806898" stroke-width="1.1"/> <line x1="75" y1="81" x2="75" y2="84" stroke="#806898" stroke-width="1.1"/> <line x1="81" y1="80" x2="82" y2="83" stroke="#806898" stroke-width="1.1"/> <!-- クマ（深い） --> <ellipse cx="43" cy="81" rx="10" ry="4.5" fill="rgba(60,20,60,.38)"/> <ellipse cx="75" cy="81" rx="10" ry="4.5" fill="rgba(60,20,60,.38)"/> <!-- 眉（ぐったり下がり） --> <path d="M 35 65 Q 43 69 51 66" stroke="#907098" stroke-width="1.8" fill="none" stroke-linecap="round"/> <path d="M 69 66 Q 77 69 85 65" stroke="#907098" stroke-width="1.8" fill="none" stroke-linecap="round"/> <!-- 口（微かに開く） --> <path d="M 52 88 Q 60 85 68 88" stroke="#906878" stroke-width="1.6" fill="none" stroke-linecap="round"/> <ellipse cx="60" cy="89" rx="4" ry="2.5" fill="#c07888" opacity=".3"/> <!-- グリッチ演出 --> <rect x="0" y="60" width="28" height="3" fill="rgba(255,0,120,.15)" opacity=".7"/> <rect x="0" y="85" width="20" height="2" fill="rgba(0,180,255,.12)" opacity=".6"/> <rect x="90" y="72" width="30" height="2" fill="rgba(255,0,120,.13)" opacity=".6"/> <rect x="96" y="92" width="24" height="3" fill="rgba(0,180,255,.1)" opacity=".5"/>`
};
// 育成タイプに応じてSVGを切り替えるマッピング
const TYPE_SVG={streamer:'normal',engineer:'normal',father:'happy',collapse:'collapse'};
const CHAR_IMG={
  normal:'assets/img/char_normal.webp',
  happy:'assets/img/char_happy.webp',
  win:'assets/img/char_win.webp',
  tired:'assets/img/char_tired.webp',
  fear:'assets/img/char_fear.webp',
  collapse:'assets/img/char_collapse.webp'
};
let cTO=null;
function cutin(type,msg){
  const face=document.getElementById('cutin-face');
  if(face){
    let imgKey=type;
    if(type==='normal'){
      const grow=calcGrowType();
      imgKey=TYPE_SVG[grow]||'normal';
    }
    const src=CHAR_IMG[imgKey]||CHAR_IMG['normal'];
    face.innerHTML=`<img src="${src}" style="width:42px;height:42px;object-fit:cover;border-radius:3px;">`;
  }
  // ボイス再生（VOICE_DATAにあるtypeのみ・happy等はスキップ）
  if(typeof VOICE_DATA !== 'undefined' && VOICE_DATA[type] && VOICE_DATA[type].length > 0){
    playVoice(type);
  }
  const box=document.getElementById('cutin-box');
  document.getElementById('cutin-msg').textContent=msg||'……';
  box.classList.add('show');clearTimeout(cTO);cTO=setTimeout(()=>box.classList.remove('show'),3900);
}

// ══════════════════════════════════════════════════════════
// ★ SD CHARACTER ENGINE
// ══════════════════════════════════════════════════════════

// 現在の心情テキスト
function getSdThought(){
  const m=gs.mental, f=gs.fatigue, ph=getPhase();
  const type=calcGrowType();
  if(ph===3&&m<15)  return '……誰か、いるか？';
  if(ph===3&&m<30)  return '時計の音が、やたら大きく聞こえる。';
  if(m<20)          return 'まだ……終われない。';
  if(f>80)          return 'まぶたが重い……';
  if(f>65)          return 'コーヒーが冷めていた。';
  if(type==='streamer'&&gs.streamPop>50) return '配信、楽しかったな。';
  if(type==='engineer'&&gs.jobRep>65)    return '今日も設備は止まらなかった。';
  if(type==='father'&&gs.childStress<30) return '子どものために、もう少し。';
  if(gs.personality.hope>65)   return '少しだけ、光が見えてきた気がする。';
  if(gs.followers>100)          return 'ここに、居場所ができてきた。';
  if(gs.day>=28)                return '30日目が近い。もう少しだ。';
  if(gs.hour>=2&&gs.hour<=4)   return '深夜2時……誰かいるかな。';
  return '今日も一日が終わろうとしている。';
}

// SVGでSDキャラを生成
const SD_IMG={
  normal:'assets/img/sd_normal.webp',
  streamer:'assets/img/sd_streamer.webp',
  engineer:'assets/img/sd_engineer.webp',
  father:'assets/img/sd_normal.webp',
  tired:'assets/img/sd_tired.webp',
  happy:'assets/img/sd_streamer.webp',
  collapse:'assets/img/sd_collapse.webp'
};
function buildSdChar(){
  const svg=document.getElementById('sd-char');
  if(!svg)return;
  const type=calcGrowType();
  const m=gs.mental, f=gs.fatigue, ph=getPhase();
  const p=gs.personality;
  const isCollapse=(type==='collapse'||(ph===3&&m<20));
  const isTired=(f>65||m<35);
  const isHappy=(p.hope>60&&m>50&&!isCollapse);

  // 状態に応じてSDキャラを選択
  // 崩壊・疲労は状態優先、それ以外は育成タイプ優先
  let svgKey;
  if(isCollapse)               svgKey='collapse';
  else if(isTired)             svgKey='tired';
  else if(type==='engineer')   svgKey='engineer';
  else if(type==='father')     svgKey='normal';
  else if(type==='streamer')   svgKey='streamer';
  else if(isHappy)             svgKey='streamer';
  else                         svgKey='normal';

  // SD_IMGから対応する画像を取得
  const sdSrc=SD_IMG[svgKey]||SD_IMG['normal'];
  svg.innerHTML=`<image href="${sdSrc}" x="0" y="0" width="120" height="140" preserveAspectRatio="xMidYMid meet"/>`;

  // バッジ・心情テキスト更新
  const meta=GROW_META[type];
  const badge=document.getElementById('sd-type-badge');
  if(badge){badge.textContent=meta.icon+' '+meta.label+'型';badge.style.color=meta.color;badge.style.borderColor=meta.color;}
  const thought=document.getElementById('sd-thought');
  if(thought)thought.textContent='「'+getSdThought()+'」';
  const kuma=document.getElementById('sd-kuma');
  if(kuma)kuma.textContent=getCharAppearance().kumaStr||'';

  // ネオン背景
  const bgNeon=document.getElementById('sd-bg-neon');
  if(bgNeon){
    if(type==='streamer'){bgNeon.style.opacity='1';bgNeon.style.background='radial-gradient(ellipse at 50% 50%,rgba(0,232,200,.06) 0%,transparent 70%)';}
    else if(isCollapse){bgNeon.style.opacity='1';bgNeon.style.background='radial-gradient(ellipse at 50% 50%,rgba(200,0,60,.06) 0%,transparent 70%)';}
    else{bgNeon.style.opacity='0';}
  }

  // コメント浮遊
  const cmtFx=document.getElementById('sd-comments-fx');
  if(cmtFx){
    cmtFx.innerHTML='';
    if(type==='streamer'&&gs.followers>50){
      const msgs=['💜','また来ます','声いい','応援','💎','いつも聴いてます'];
      const num=Math.min(4,Math.floor(gs.followers/30));
      for(let i=0;i<num;i++){
        const d=document.createElement('div');d.className='sd-cmt';
        d.textContent=msgs[Math.floor(Math.random()*msgs.length)];
        d.style.animationDelay=(i*0.8)+'s';
        d.style.animationDuration=(2.5+Math.random())+'s';
        cmtFx.appendChild(d);
      }
    }
  }

  // 崩壊型：低確率の一瞬異変
  if(isCollapse&&m<15&&Math.random()<0.003){
    svg.style.filter='hue-rotate(120deg) saturate(2)';
    setTimeout(()=>svg.style.filter='',80);
  }
}

// SDキャラの自動更新（開いている間）
let _sdInterval=null;
function startSdAnim(){
  buildSdChar();
  _sdInterval=setInterval(buildSdChar,4000);
}
function stopSdAnim(){
  clearInterval(_sdInterval);_sdInterval=null;
}

// ──────────────────────────
// STATUS
// ──────────────────────────
function openStatus(){
  updateNavActive('status');
  const body=document.getElementById('status-body');body.innerHTML='';
  // ★ SDキャラ描画
  startSdAnim();
  const type=calcGrowType();const meta=GROW_META[type];const p=gs.personality;
  // 育成サマリー
  const growCard=document.createElement('div');growCard.className='sec';
  growCard.innerHTML=`
    <div class="sec-t">🌱 だんのうら育成状態</div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <div style="font-size:2.2rem;">${getCharAppearance().face}</div>
      <div>
        <div style="font-family:var(--dot);font-size:.85rem;color:${meta.color}">${meta.icon} ${meta.label}型</div>
        <div style="font-family:var(--serif);font-size:.65rem;color:var(--tx-d);margin-top:2px">${meta.desc}</div>
        <div style="font-family:var(--mono);font-size:.58rem;color:var(--tx-d);margin-top:3px">${getCharAppearance().kumaStr||'顔色は悪くない'}</div>
      </div>
    </div>
    <div style="font-family:var(--mono);font-size:.6rem;color:var(--tx-d);line-height:1.8;margin-bottom:6px">${getStreamStyle()}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;font-family:var(--mono);font-size:.55rem;color:var(--tx-d);">
      <div>優しさ <span style="color:var(--cy)">${p.kindness}</span></div>
      <div>執念　 <span style="color:var(--gd)">${p.willpower}</span></div>
      <div>孤独　 <span style="color:var(--pu)">${p.loneliness}</span></div>
      <div>希望　 <span style="color:var(--gn)">${p.hope}</span></div>
      <div>依存　 <span style="color:var(--rd)">${p.dependence}</span></div>
      <div>共感力 <span style="color:var(--cy)">${p.empathy}</span></div>
    </div>`;
  body.appendChild(growCard);
  // 人格傾向
  const pCard=document.createElement('div');pCard.className='sec';
  pCard.innerHTML='<div class="sec-t">💭 人格傾向</div>';
  [{l:'優しさ',v:p.kindness,c:'#00e8c8'},{l:'執念',v:p.willpower,c:'#e8b830'},{l:'孤独',v:p.loneliness,c:'#8a52d4'},{l:'希望',v:p.hope,c:'#44ee88'},{l:'依存',v:p.dependence,c:'#e83055'},{l:'共感',v:p.empathy,c:'#00e8c8'}]
    .forEach(s=>{const row=document.createElement('div');row.className='sr';row.innerHTML=`<div class="srl">${s.l}</div><div class="srb"><div class="srf" style="width:${s.v}%;background:${s.c};"></div></div><div class="srv">${Math.floor(s.v)}</div>`;pCard.appendChild(row);});
  body.appendChild(pCard);
  // ★ 借金・収支（分割表示）
  const debtCard=document.createElement('div');debtCard.className='sec';
  const monthlyTarget=Math.floor(gs.debt/12);
  const paidPct=gs.monthlyPaid>0?Math.min(100,Math.floor(gs.monthlyPaid/monthlyTarget*100)):0;
  debtCard.innerHTML=`<div class="sec-t">💴 お金の状況</div>
    <div style="font-family:var(--mono);font-size:.63rem;color:var(--tx-d);line-height:2.2">
    借金残額 <span style="color:var(--rd)">¥${gs.debt.toLocaleString()}</span><br>
    今月の返済 <span style="color:var(--cy)">¥${gs.monthlyPaid.toLocaleString()}</span>
    ${gs.monthlyPaid>0?`<span style="color:var(--gn)">（目標の${paidPct}%）</span>`:''}<br>
    手元のお金 <span style="color:var(--gd)">¥${gs.money.toLocaleString()}</span><br>
    ${gs.debt<=0?'<span style="color:var(--gn)">借金完済！</span>':gs.debt<500000?'<span style="color:var(--gn)">光が見えてきた。</span>':gs.monthlyPaid>0?'<span style="color:var(--cy)">少しずつ前に進んでいる。</span>':'まだ先は長い。'}
    </div>`;
  body.appendChild(debtCard);
  // メインステータス
  [{t:'📊 メインステータス',stats:[{l:'精神力',v:gs.mental,c:'#8a52d4'},{l:'フォロワー',v:Math.min(gs.followers,1000),c:'#00e8c8'},{l:'配信人気',v:gs.streamPop,c:'#8a52d4'},{l:'仕事評価',v:gs.jobRep,c:'#44ee88'}]},
   {t:'😴 コンディション',stats:[{l:'疲労',v:gs.fatigue,c:'#e83055'},{l:'育児余裕',v:100-gs.childStress,c:'#ff9966'},{l:'喉の状態',v:100-gs.throatFatigue,c:'#e83055'}]},
   {t:'🔧 技能',stats:[{l:'資格知識',v:gs.certKnow,c:'#e8b830'},{l:'歌唱力',v:gs.skills.singSkill*10,c:'#00e8c8'},{l:'怪談力',v:gs.skills.kaidanSkill*10,c:'#e83055'}]}]
  .forEach(sec=>{
    const div=document.createElement('div');div.className='sec';div.innerHTML=`<div class="sec-t">${sec.t}</div>`;
    sec.stats.forEach(s=>{const row=document.createElement('div');row.className='sr';row.innerHTML=`<div class="srl">${s.l}</div><div class="srb"><div class="srf" style="width:${Math.min(100,Math.max(0,s.v))}%;background:${s.c};"></div></div><div class="srv">${Math.floor(s.v)}</div>`;div.appendChild(row);});
    body.appendChild(div);
  });
  // リスナー
  const ld=document.createElement('div');ld.className='sec';ld.innerHTML='<div class="sec-t">👥 リスナー詳細</div>';
  gs.listeners.forEach(l=>{
    const evoL=['初期','認識','心配','深い心配','推し化','……'];
    const r=document.createElement('div');r.style.cssText='font-family:var(--mono);font-size:.58rem;color:var(--tx-d);margin-bottom:6px;line-height:1.9;';
    r.innerHTML=`<span style="color:var(--pu)">${l.name}</span> — ${l.type==='mod'?'🛡モデレーター':l.type==='anti'?'🔴アンチ':'💜常連'}<br>信頼${l.trust} Lv.${l.evo}(${evoL[Math.min(5,l.evo)]}) 危険${Math.floor(l.danger*10)/10}`;
    ld.appendChild(r);
  });body.appendChild(ld);
  // 成長履歴
  if(gs.growHistory.length>0){
    const gh=document.createElement('div');gh.className='sec';gh.innerHTML='<div class="sec-t">📖 成長履歴</div>';
    gs.growHistory.slice(0,10).forEach(h=>{
      const r=document.createElement('div');r.style.cssText='font-family:var(--mono);font-size:.55rem;color:var(--tx-d);margin-bottom:4px;line-height:1.7;';
      r.innerHTML=`<span style="color:var(--pu-dim)">Day${h.day}</span> ${h.text}`;gh.appendChild(r);
    });body.appendChild(gh);
  }
  // マイルストーン
  if(gs.growMilestones.length>0){
    const gm=document.createElement('div');gm.className='sec';gm.innerHTML='<div class="sec-t">🏅 到達マイルストーン</div>';
    gs.growMilestones.forEach(m=>{
      const r=document.createElement('div');r.style.cssText='font-family:var(--mono);font-size:.55rem;color:var(--gd);margin-bottom:3px;line-height:1.7;';
      r.innerHTML=`Day${m.day} — ${m.text}`;gm.appendChild(r);
    });body.appendChild(gm);
  }
  // 現在
  const cd=document.createElement('div');cd.className='sec';
  cd.innerHTML=`<div class="sec-t">📅 現在 / Phase${getPhase()}</div>
    <div style="font-family:var(--mono);font-size:.63rem;color:var(--tx-d);line-height:2.1">
    Day ${gs.day}/30 &nbsp; ${String(gs.hour).padStart(2,'0')}:${String(gs.min).padStart(2,'0')}<br>
    RANK ${RANKS[gs.rank]}（${Math.floor(gs.rankPts)}pts） &nbsp; SP ${gs.sp}<br>
    炎上 ${gs.flame>3?'⚠️高':gs.flame>1?'中':'低'} &nbsp; 配信${gs.streamCount}回 &nbsp; 異変${gs.anomalyCount}回
    </div>`;body.appendChild(cd);
  document.getElementById('status-sc').classList.add('active');
}
function closeStatus(){
  stopSdAnim();
  document.getElementById('status-sc').classList.remove('active');
  updateNavActive('main');
}

// ──────────────────────────
// SKILLS
// ──────────────────────────
const SKDEF={soundDiag:{name:'異音診断',cat:'🔧設備',desc:'故障発見+',max:3},emergencyFix:{name:'緊急復旧',cat:'🔧設備',desc:'修理時間+',max:3},wiring:{name:'配線理解',cat:'🔧設備',desc:'収入UP',max:3},plc:{name:'PLC解析',cat:'🔧設備',desc:'仕事評価UP',max:3},chatSkill:{name:'雑談力',cat:'📡配信',desc:'フォロワー獲得率UP',max:3},kaidanSkill:{name:'怪談力',cat:'📡配信',desc:'怪談効果UP',max:5},singSkill:{name:'歌唱力',cat:'📡配信',desc:'歌ミニゲーム精度UP',max:10},radioVibe:{name:'深夜ラジオ感',cat:'📡配信',desc:'精神消耗軽減',max:3},stressRes:{name:'ストレス耐性',cat:'💫精神',desc:'精神消耗軽減',max:3},focus:{name:'集中力',cat:'💫精神',desc:'勉強効率UP',max:3},sleepEff:{name:'睡眠効率',cat:'💫精神',desc:'疲労回復量UP',max:3},emoCtrl:{name:'感情制御',cat:'💫精神',desc:'炎上消耗軽減',max:3},bedtime:{name:'寝かしつけ',cat:'👶育児',desc:'育児ストレス軽減UP',max:3},chores:{name:'家事効率',cat:'👶育児',desc:'時間節約',max:2}};
function openSkill(){
  updateNavActive('skills');document.getElementById('skill-sp').textContent=gs.sp;
  const body=document.getElementById('skill-body');body.innerHTML='';
  const type=calcGrowType();const meta=GROW_META[type];
  const rec=document.createElement('div');rec.style.cssText='font-family:var(--mono);font-size:.58rem;color:var(--tx-d);padding:6px 0 10px;line-height:1.7;';
  const typeRec={streamer:'chatSkill・radioVibe・singSkillを優先',engineer:'soundDiag・emergencyFix・plcを優先',collapse:'stressRes・emoCtrlで精神を守る',father:'bedtime・chores・sleepEffを優先'};
  rec.innerHTML=`現在の傾向: <span style="color:${meta.color}">${meta.icon} ${meta.label}型</span><br>${typeRec[type]||''}`;
  body.appendChild(rec);
  const cats={};Object.entries(SKDEF).forEach(([k,d])=>{if(!cats[d.cat])cats[d.cat]=[];cats[d.cat].push({k,d});});
  Object.entries(cats).forEach(([cat,skills])=>{
    const cd=document.createElement('div');cd.style.marginBottom='12px';
    cd.innerHTML=`<div class="sec-t" style="margin-bottom:5px">${cat}</div>`;
    const grid=document.createElement('div');grid.className='sk-grid';
    skills.forEach(({k,d})=>{
      const lv=Math.floor(gs.skills[k]||0),maxed=lv>=d.max;
      const card=document.createElement('div');card.className='sk-card'+(maxed?' maxed':'');
      card.innerHTML=`<div class="sk-name">${d.name}</div><div class="sk-lv">Lv.${lv}/${d.max}${maxed?' ✓':''}</div><div class="sk-desc">${d.desc}</div>${maxed?'':'<div style="margin-top:2px;font-family:var(--mono);font-size:.5rem;color:var(--gd)">SP1消費 → タップ</div>'}`;
      if(!maxed)card.onclick=e=>{addRipple(card,e);buySkill(k,d);};
      grid.appendChild(card);
    });cd.appendChild(grid);body.appendChild(cd);
  });
  document.getElementById('skill-sc').classList.add('active');
}
function buySkill(key,def){if(gs.sp<1){showNotif('SPが足りません');return;}if(Math.floor(gs.skills[key])>=def.max){showNotif('最大レベルです');return;}gs.sp--;gs.skills[key]=(gs.skills[key]||0)+1;document.getElementById('skill-sp').textContent=gs.sp;AU.se('decide');showNotif(`⭐ ${def.name} Lv.${Math.floor(gs.skills[key])} 習得！`);saveGame(true);openSkill();}
function closeSkill(){document.getElementById('skill-sc').classList.remove('active');updateNavActive('main');}

// ──────────────────────────
// RANDOM EVENTS（文章改善・収入導線追加）
// ──────────────────────────
const REVENTS=[
  {title:'👶 子どもが発熱',
   desc:'夜中に起きると、子どもが熱を出していた。\n38.5度。額に手を当てると、熱い。\n仕事のことが頭をよぎったが、今夜は付き添うことにした。',
   fx:'精神力 -8 | 疲労 +18 | 育児ストレス +15',
   apply(){gs.mental-=8;gs.fatigue=Math.min(100,gs.fatigue+18);gs.childStress=Math.min(100,gs.childStress+15);logGrow('子どもが発熱した。夜通し付き添った。');}},
  {title:'🏭 工場で緊急対応',
   desc:'昼間、設備が緊急停止した。\n残業で対応して、なんとか直した。\n上司が短く「助かった」と言った。',
   fx:'精神力 -5 | 疲労 +12 | 仕事評価 +15 | 収入 +¥12,000',
   apply(){gs.mental-=5;gs.fatigue=Math.min(100,gs.fatigue+12);gs.jobRep=Math.min(100,gs.jobRep+15);gs.money+=12000;gs.debt=Math.max(0,gs.debt-5000);logGrow('工場の緊急対応をした。「助かった」と言ってもらえた。');}},
  {title:'🌟 配信の切り抜きが伸びた',
   desc:'昨夜の配信の一部が切り抜かれて、想像より広まった。\nフォロワーが増えている。\n誰かが声を届けてくれた。',
   fx:'フォロワー +40 | ランクPts +25 | 収入 +¥8,000',
   apply(){gs.followers+=40;gs.rankPts+=25;gs.money+=8000;gs.debt=Math.max(0,gs.debt-3000);checkRankUp();gs.hadBuzz=true;cutin('win','壇ノ浦から……少し浮かび上がったわ。');AU.playVoice('win');updatePersonality('buzz');unlockAch('firstBuzz','🌟 初バズ');logGrow('配信の切り抜きが伸びた');}},
  {title:'🔥 発言が切り取られた',
   desc:'少し踏み込んだ発言が、文脈なしで広まった。\n心無いコメントが増えている。\n深呼吸した。',
   fx:'精神力 -8 | 炎上 +2 | フォロワー -8',
   apply(){gs.mental-=8;gs.flame+=2;gs.followers=Math.max(0,gs.followers-8);gs.hadFlame=true;cutin('tired','……疲れた。でも、止まらない。');AU.playVoice('tired');updatePersonality('flame');logGrow('発言が切り取られた。炎上した。');}},
  {title:'📦 ボーナスが出なかった',
   desc:'今期のボーナスはなし、という通知が来た。\n期待していたわけではないが、\n借金の計算をやり直した。',
   fx:'精神力 -6 | 借金利息 +¥25,000',
   apply(){gs.mental-=6;gs.debt+=25000;logGrow('ボーナスなし。計算をやり直した。');}},
  {title:'💌 リスナーからの言葉',
   desc:'常連のリスナーからメッセージが届いた。\n「あなたの配信が、眠れない夜の支えです」\nしばらく画面を見たまま、動けなかった。',
   fx:'精神力 +12 | 配信人気 +8 | 希望 +5',
   apply(){gs.mental=Math.min(100,gs.mental+12);gs.streamPop=Math.min(100,gs.streamPop+8);gs.personality.hope=Math.min(100,gs.personality.hope+5);cutin('happy','……ありがとう。ちゃんと聞こえてるわよ。');AU.playVoice('whisper');logGrow('リスナーから「支えです」と言ってもらえた');}},
  {title:'⚡ 工場で停電',
   desc:'夜中に工場で停電が発生した。緊急対応を呼ばれた。\n復旧まで2時間かかった。\n疲れたが、知識はまた少し増えた。',
   fx:'精神力 -4 | 疲労 +18 | 資格知識 +10',
   apply(){gs.mental-=4;gs.fatigue=Math.min(100,gs.fatigue+18);gs.certKnow=Math.min(100,gs.certKnow+10);logGrow('工場で深夜の停電対応をした');}},
  // ★ 収入追加イベント
  {title:'💡 改善提案が採用された',
   desc:'先月提出した設備改善の提案が、正式に採用された。\n小さな金一封が出た。',
   fx:'収入 +¥20,000 | 仕事評価 +10 | 精神力 +5',
   apply(){gs.money+=20000;gs.debt=Math.max(0,gs.debt-8000);gs.jobRep=Math.min(100,gs.jobRep+10);gs.mental=Math.min(100,gs.mental+5);logGrow('改善提案が採用された。金一封をもらった。');}},
  {title:'📱 不用品を売った',
   desc:'部屋の隅に眠っていたものを売った。\n大した金額ではないが、少し気持ちが軽くなった。',
   fx:'収入 +¥15,000',
   apply(){gs.money+=15000;gs.debt=Math.max(0,gs.debt-6000);logGrow('不用品を売って少し収入になった。');}},
  // ★ 中盤イベント（cond を満たすときだけ発生）
  {title:'🏫 子どもの参観日',
   cond:()=>gs.day>=8&&gs.day<=20,
   desc:'保育園から参観日のお知らせが来ていた。\n有休を取って、後ろの席から見ていた。\n子どもが何度も振り返って、手を振った。',
   fx:'精神力 +10 | 育児ストレス -15 | 仕事評価 -5',
   apply(){gs.mental=Math.min(100,gs.mental+10);gs.childStress=Math.max(0,gs.childStress-15);gs.jobRep=Math.max(0,gs.jobRep-5);gs.personality.kindness=Math.min(100,gs.personality.kindness+5);logGrow('参観日に行った。子どもが手を振ってくれた。');}},
  {title:'📘 先輩の過去問ノート',
   cond:()=>gs.day>=8&&gs.day<=22&&gs.certKnow<70,
   desc:'定年間近の先輩が、古いノートを渡してくれた。\n「俺が受けたときのだ。今も出るところは変わらん」\n角が擦り切れたページに、赤線がびっしり引いてあった。',
   fx:'資格知識 +12 | 精神力 +3',
   apply(){gs.certKnow=Math.min(100,gs.certKnow+12);gs.mental=Math.min(100,gs.mental+3);logGrow('先輩から過去問ノートをもらった。');}},
  {title:'🎙 コラボ配信の誘い',
   cond:()=>gs.day>=10&&gs.followers>=60,
   desc:'同じ時間帯に配信している人から、コラボの誘いが来た。\n慣れない掛け合いに疲れたが、\n向こうのリスナーが何人か流れてきた。',
   fx:'フォロワー +25 | 配信人気 +6 | 疲労 +8',
   apply(){gs.followers+=25;gs.streamPop=Math.min(100,gs.streamPop+6);gs.fatigue=Math.min(100,gs.fatigue+8);gs.rankPts+=10;checkRankUp();logGrow('コラボ配信をした。新しいリスナーが来た。');}},
  {title:'🔩 設備更新の担当に指名',
   cond:()=>gs.day>=10&&gs.jobRep>=50,
   desc:'老朽化したラインの更新工事を任された。\n責任は重いが、手当が付く。\n図面を広げると、少しだけ胸が高鳴った。',
   fx:'仕事評価 +12 | 疲労 +10 | 収入 +¥10,000',
   apply(){gs.jobRep=Math.min(100,gs.jobRep+12);gs.fatigue=Math.min(100,gs.fatigue+10);gs.money+=10000;gs.debt=Math.max(0,gs.debt-4000);logGrow('設備更新の担当に指名された。');}},
  {title:'🖍 冷蔵庫の絵',
   cond:()=>gs.day>=12,
   desc:'朝、冷蔵庫に一枚の絵が貼ってあった。\nマイクの前に座る、大きな人の絵。\n「パパのおしごと」と書いてあった。',
   fx:'精神力 +8 | 希望 +6',
   apply(){gs.mental=Math.min(100,gs.mental+8);gs.personality.hope=Math.min(100,gs.personality.hope+6);logGrow('子どもが配信している俺の絵を描いてくれた。');}},
  {title:'🌧 雨漏り',
   cond:()=>gs.day>=12,
   desc:'夜中、天井から水が落ちてきた。\nバケツを置いて、配信機材を避難させた。\n大家に連絡したが、修理は来週になるらしい。',
   fx:'精神力 -5 | 疲労 +8 | 出費 -¥8,000',
   apply(){gs.mental-=5;gs.fatigue=Math.min(100,gs.fatigue+8);if(gs.money>=8000)gs.money-=8000;else{gs.debt+=8000-gs.money;gs.money=0;}logGrow('雨漏りした。機材は無事だった。');}},
];

// ★ 固定イベント：DAY25給料、DAY30月末支払い判定
function checkFixedDayEvents(){
  if(gs.day===25){
    showEvPopup('💴 給料日（Day25）',
      '今月の給料が振り込まれた。\n84万の借金に比べれば小さいが、\n少し返せる。小さな前進だ。',
      '収入 +¥195,000 | 借金返済 -¥90,000',
      ()=>{
        gs.money+=195000;
        gs.debt=Math.max(0,gs.debt-90000);
        gs.monthlyPaid+=90000;
        cutin('happy','少しだけ……前に進めたわね。');
        AU.playVoice('win');
        updatePersonality('payday');
        unlockAch('payday','給料日 Day25');
        logGrow('給料日。少し借金を返した。');
      });
  }
  if(gs.day===30){
    // 月末支払い判定
    const target=Math.floor(gs.debt/10+50000);
    const cleared=gs.monthlyPaid>=target||gs.money>=target;
    const payMsg=cleared
      ?'今月の支払いを乗り切った。\n全部じゃない。でも、今月は生き延びた。'
      :'今月の支払いが厳しかった。\nそれでも、ここにいる。\n来月も、続ける。';
    showEvPopup('📅 月末支払い判定（Day30）',payMsg,
      cleared?'借金 -¥50,000 | 精神力 +8':'疲労 +10 | 精神力 -5',
      ()=>{
        if(cleared){gs.debt=Math.max(0,gs.debt-50000);gs.mental=Math.min(100,gs.mental+8);}
        else{gs.fatigue=Math.min(100,gs.fatigue+10);gs.mental=Math.max(0,gs.mental-5);}
        logGrow(cleared?'月末支払いを乗り切った':'月末は苦しかった。それでも続けた。');
      });
  }
}

// ★ 7日ごと生活費チェック
function checkWeeklyLife(){
  if(gs.day%7!==0)return;
  const cost=45000; // 週の生活費概算
  if(gs.money>=cost){
    gs.money-=cost;
    showNotif(`🏠 生活費 -¥${cost.toLocaleString()} （残 ¥${gs.money.toLocaleString()}）`);
  } else {
    gs.debt+=Math.floor(cost-gs.money);
    gs.money=0;
    gs.mental=Math.max(0,gs.mental-5);
    showNotif('⚠️ 生活費が足りず、借金が増えた');
    logGrow(`Day${gs.day}：生活費が不足した`);
  }
}

function showEvPopup(title,desc,fx,cb){
  document.getElementById('ev-title').textContent=title;
  document.getElementById('ev-desc').textContent=desc;
  document.getElementById('ev-fx').textContent=fx;
  gs._pev={apply:cb||null};
  document.getElementById('ev-popup').classList.add('active');
}
// 条件を満たすイベントから選ぶ（直前と同じイベントは避ける）
let _lastRevent=null;
function triggerRandomEvent(){
  let pool=REVENTS.filter(ev=>!ev.cond||ev.cond());
  if(pool.length>1) pool=pool.filter(ev=>ev!==_lastRevent);
  const ev=pool[Math.floor(Math.random()*pool.length)];
  _lastRevent=ev;
  showEvPopup(ev.title,ev.desc,ev.fx,()=>ev.apply());
}
function closeEvent(){document.getElementById('ev-popup').classList.remove('active');if(gs._pev){if(gs._pev.apply)gs._pev.apply();gs._pev=null;updateStats();}}

// ──────────────────────────
// ACH / GAMEOVER
// ──────────────────────────
// 実績はポップアップなし。状態画面の成長履歴に記録するのみ
function unlockAch(id,name){
  if(gs.completedAchs.has(id))return;
  gs.completedAchs.add(id);
  logGrow('🏅 '+name);
  AU.se('ach');
}
function checkGameOver(){
  if(gs.mental<=0){triggerEnding('collapse');return;}
  if(gs.debt>2000000){triggerEnding('bankrupt');return;}
  if(gs.fatigue>=100&&gs.mental<20){triggerEnding('collapse');return;}
  if(gs.flame>=10){triggerEnding('flame');return;}
}
function startChaos(){const iv=setInterval(()=>{if(gs.mental>15){clearInterval(iv);return;}document.querySelectorAll('.choice-btn').forEach(b=>b.style.transform=`translateX(${(Math.random()-.5)*4}px)`);const el=document.getElementById('dlg-content');if(el&&Math.random()<.1){const t=el.textContent,i=Math.floor(Math.random()*t.length),g='█▒░■□▪◆';el.textContent=t.slice(0,i)+g[Math.floor(Math.random()*g.length)]+t.slice(i+1);}},720);}


const ENDING_IMG={
  rebirth:'assets/img/ending_rebirth.webp',
  king:'assets/img/ending_king.webp',
  engineer:'assets/img/ending_engineer.webp',
  father:'assets/img/ending_father.webp',
  debtfree:'assets/img/ending_debtfree.webp',
  normal:'assets/img/ending_normal.webp',
  collapse:'assets/img/ending_collapse.webp',
  bankrupt:'assets/img/ending_collapse.webp',
  flame:'assets/img/ending_flame.webp'
};
// ══════════════════════════════════════════════════════════
// ★ 心理診断システム
// ══════════════════════════════════════════════════════════

const PSYCH_TYPES = {
  yowatari: {
    name: '夜渡り型',
    poem: `眠れない夜を、\nただ通り過ぎることができなかった。\n\n誰もいない時間に、\nあなたは誰かを探していた。`
  },
  tomoshibi: {
    name: '灯火抱え型',
    poem: `自分が消えそうな夜ほど、\n誰かのために灯りをつけた。\n\nその優しさは、\n静かに心を削っていた。`
  },
  amayadori: {
    name: '雨宿り型',
    poem: `戦うより、\n壊れないことを選んだ。\n\nそれは逃げではなく、\n生き残るための知恵だった。`
  },
  shinkai: {
    name: '深海電波型',
    poem: `誰にも届かないと思いながら、\nそれでも夜へ声を流し続けた。\n\nあなたは、\n孤独の海で発信していた。`
  },
  tetsu: {
    name: '鉄屑心臓型',
    poem: `壊れかけた身体で、\n今日も機械を動かしていた。\n\n止まるわけにはいかなかった。`
  },
  zankyou: {
    name: '残響型',
    poem: `あなたが去ったあとも、\n夜には声だけが残っていた。\n\n誰かの記憶の中で、\n配信はまだ続いている。`
  },
};

function calcPsychType(){
  const s = gs;
  const p = gs.personality;

  // スコア計算
  let scores = {
    yowatari:  0,
    tomoshibi: 0,
    amayadori: 0,
    shinkai:   0,
    tetsu:     0,
    zankyou:   0,
  };

  // 夜渡り型：深夜行動・継続・孤独耐性
  scores.yowatari  += s.streamCount * 2;
  scores.yowatari  += p.loneliness * 0.3;
  scores.yowatari  += p.willpower  * 0.3;
  scores.yowatari  += s.day        * 1.5;

  // 灯火抱え型：共感・リスナーケア
  scores.tomoshibi += p.empathy   * 0.8;
  scores.tomoshibi += p.kindness  * 0.7;
  scores.tomoshibi += s.followers * 0.3;
  // リスナーevoが高い人がいる
  s.listeners.forEach(l=>{ scores.tomoshibi += l.trust * 0.5; });

  // 雨宿り型：休息・自己保全
  scores.amayadori += p.hope      * 0.4;
  scores.amayadori += (100 - s.fatigue) * 0.5;
  scores.amayadori += (100 - s.childStress) * 0.3;
  scores.amayadori += s.mental    * 0.4;

  // 深海電波型：配信多・でも人気低め
  scores.shinkai   += s.streamCount * 3;
  scores.shinkai   += p.dependence * 0.5;
  if(s.streamPop < 40) scores.shinkai += 30;

  // 鉄屑心臓型：工場・仕事・返済
  scores.tetsu     += s.jobRep    * 0.8;
  scores.tetsu     += s.certKnow  * 0.5;
  scores.tetsu     += p.willpower * 0.6;
  scores.tetsu     += (840000 - s.debt) / 10000;

  // 残響型：崩壊寸前・精神低下・異変多
  scores.zankyou   += s.anomalyCount * 5;
  scores.zankyou   += p.loneliness   * 0.4;
  scores.zankyou   += (100 - s.mental) * 0.6;
  if(s.mental < 20) scores.zankyou += 40;

  // 最高スコアのタイプを返す
  return Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
}

// ══════════════════════════════════════════════════════════
// ★ SNS共有パネル
// ══════════════════════════════════════════════════════════

let _shareText = '';
let _shareType = '';

function buildShareText(endType, isFinal){
  const psychKey  = calcPsychType();
  const psych     = PSYCH_TYPES[psychKey];
  const endMeta   = { // エンド名マッピング
    rebirth:  '再生エンド ―― 壇ノ浦を、這い上がった',
    king:     '深夜の王エンド ―― コメントが止まらない夜',
    engineer: '凄腕保全マンエンド ―― 設備を守り続けた30日',
    father:   '父親エンド ―― 子どものために踏みとどまった',
    debtfree: '夜明けエンド ―― 雨が、上がった',
    normal:   '深夜の月エンド ―― それでも生き延びた',
    collapse: '崩壊エンド ―― 夜の底に沈んだ',
    bankrupt: '生活破綻エンド ―― いつか、また這い上がる',
    flame:    '炎上崩壊エンド ―― 壊れたのは俺じゃない',
  };
  const endName = endMeta[endType] || '深夜の物語';
  const dayLabel = isFinal ? `DAY${gs.day}` : `DAY${gs.day} 到達`;
  const resultLabel = isFinal ? 'FINAL ENDING' : 'CHAPTER RESULT';
  const extraMsg = isFinal
    ? '「海の底だと思っていた場所は、\n 始まりの岸だった。」'
    : 'ここで終わりではない。\nまだ、夜は続いている。';

  // 共有テキスト
  _shareText =
    `🐾 だんのうら\n${dayLabel}\n\n${resultLabel}：\n『${endName}』\n\n診断結果：\n『${psych.name}』\n\n${psych.poem}\n\nフォロワー：${gs.followers}人  精神：${gs.mental}\n疲労：${gs.fatigue}%  借金：¥${gs.debt.toLocaleString()}\n\n${extraMsg}\n\n#だんのうら`;

  // UI更新
  document.getElementById('share-day').textContent = dayLabel;
  document.getElementById('share-end-label').textContent = resultLabel;
  document.getElementById('share-end-name').textContent = endName;
  document.getElementById('share-diag-name').textContent = '『' + psych.name + '』';
  document.getElementById('share-diag-poem').textContent = psych.poem;
  document.getElementById('share-extra').textContent = extraMsg;

  const statsEl = document.getElementById('share-stats');
  statsEl.innerHTML = [
    ['フォロワー', gs.followers + '人'],
    ['精神力',     gs.mental],
    ['疲労',       gs.fatigue + '%'],
    ['RANK',       ['E','D','C','B','A'][gs.rank] || 'A'],
    ['借金',       '¥' + gs.debt.toLocaleString()],
    ['配信回数',   gs.streamCount + '回'],
  ].map(([l,v])=>`<div class="share-stat">${l} <span>${v}</span></div>`).join('');

  // 継続ボタン表示（BADエンド以外・ENDLESS未開始）
  const isBad = ['collapse','bankrupt','flame'].includes(endType);
  const contBtn = document.getElementById('share-continue-btn');
  contBtn.style.display = (!isBad && !gs._endless) ? 'block' : 'none';

  _shareType = endType;
}

function showSharePanel(endType, isFinal){
  buildShareText(endType, isFinal);
  document.getElementById('share-panel').classList.add('active');
}

function closeSharePanel(){
  document.getElementById('share-panel').classList.remove('active');
}

function copyShareText(){
  const msg = document.getElementById('share-copy-msg');
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(_shareText).then(()=>{
      msg.textContent = '✅ 結果をコピーしました';
      setTimeout(()=>msg.textContent='', 2500);
    }).catch(()=> legacyCopy());
  } else { legacyCopy(); }

  function legacyCopy(){
    const ta = document.createElement('textarea');
    ta.value = _shareText;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    msg.textContent = '✅ 結果をコピーしました';
    setTimeout(()=>msg.textContent='', 2500);
  }
}

function shareToX(){
  const url = 'https://x.com/intent/tweet?text=' + encodeURIComponent(_shareText);
  window.open(url, '_blank');
}

function shareToEndless(){
  closeSharePanel();
  startEndlessMode();
}

// エンディング用インターバル管理（king・collapse共用）
let _endingIv = null;

// ★ エンディング条件
// ──────────────────────────
// エンディング一覧（周回をまたいで記録）
// ──────────────────────────
const ENDING_LIST=[
  {type:'rebirth',  name:'再生エンド',         hint:'心と体を保ちながら、配信に居場所を作る'},
  {type:'king',     name:'深夜の王エンド',     hint:'配信でフォロワーと人気を大きく伸ばす'},
  {type:'engineer', name:'凄腕保全マンエンド', hint:'工場の仕事と資格を極める'},
  {type:'father',   name:'父親エンド',         hint:'子どもとの時間を何より大切にする'},
  {type:'debtfree', name:'夜明けエンド',       hint:'借金をほとんど返し切る'},
  {type:'normal',   name:'深夜の月エンド',     hint:'とにかく30日を生き延びる'},
  {type:'collapse', name:'崩壊エンド',         hint:'心が先に尽きてしまう',          bad:true},
  {type:'bankrupt', name:'生活破綻エンド',     hint:'借金が限界を超えてしまう',      bad:true},
  {type:'flame',    name:'炎上崩壊エンド',     hint:'炎上が止まらなくなる',          bad:true},
];
const ENDINGS_KEY='dannoura_endings';
function loadSeenEndings(){
  try{ return JSON.parse(localStorage.getItem(ENDINGS_KEY)||'{}')||{}; }catch(e){ return {}; }
}
function recordEnding(type,day){
  const seen=loadSeenEndings();
  if(!seen[type]) seen[type]={firstDay:day,firstAt:new Date().toISOString()};
  seen[type].count=(seen[type].count||0)+1;
  try{ localStorage.setItem(ENDINGS_KEY,JSON.stringify(seen)); }catch(e){}
  updateEndingListBtn();
}
function updateEndingListBtn(){
  const btn=document.getElementById('btn-endings');
  if(!btn) return;
  const seen=loadSeenEndings();
  const n=ENDING_LIST.filter(e=>seen[e.type]).length;
  btn.textContent=`📖 エンディング一覧（${n}/${ENDING_LIST.length}）`;
}
function openEndingList(){
  const seen=loadSeenEndings();
  const list=document.getElementById('endlist-items');
  list.innerHTML='';
  ENDING_LIST.forEach(e=>{
    const s=seen[e.type];
    const item=document.createElement('div');
    item.className='endlist-item'+(s?' seen':'')+(e.bad?' bad':'');
    const thumb=document.createElement('div');
    thumb.className='endlist-thumb';
    if(s&&ENDING_IMG[e.type]) thumb.style.backgroundImage=`url(${ENDING_IMG[e.type]})`;
    else thumb.textContent='？';
    const txt=document.createElement('div');
    txt.className='endlist-txt';
    const name=document.createElement('div');
    name.className='endlist-name';
    name.textContent=s?e.name:'？？？';
    const hint=document.createElement('div');
    hint.className='endlist-hint';
    hint.textContent=s?`DAY${s.firstDay}で初到達・${s.count}回`:'ヒント：'+e.hint;
    txt.append(name,hint);
    item.append(thumb,txt);
    list.appendChild(item);
  });
  const n=ENDING_LIST.filter(e=>seen[e.type]).length;
  document.getElementById('endlist-count').textContent=`${n} / ${ENDING_LIST.length}`;
  document.getElementById('endlist-sc').classList.add('active');
}
function closeEndingList(){
  document.getElementById('endlist-sc').classList.remove('active');
}

function triggerEnding(forced){
  clearInterval(commentIv);clearInterval(anomalyIv);clearInterval(ft);clearInterval(dt);
  if(_endingIv){ clearInterval(_endingIv); _endingIv=null; }
  saveGame(true); // エンディング到達時に自動セーブ

  const growType=calcGrowType();
  let type=forced;
  if(!type){
    // ── BAD END（ゲーム中いつでも発動）──
    if(gs.mental<=0||gs.fatigue>=100) type='collapse';
    else if(gs.debt>2000000)          type='bankrupt';
    else if(gs.flame>=10)             type='flame';

    // ── Day30 育成タイプ特化グッドエンド ──
    else if(growType===GROW_TYPE.ENGINEER&&gs.jobRep>=75&&gs.certKnow>=70)
      type='engineer';
    else if(growType===GROW_TYPE.FATHER&&gs.childStress<30&&gs.personality.kindness>=60)
      type='father';

    // ── Day30 新グッドエンド3種 ──
    // 借金完済エンド：借金を大きく減らした
    else if(gs.debt<=100000&&gs.mental>=30)
      type='debtfree';
    // 深夜の王エンド：フォロワー・人気が高水準
    else if(gs.followers>200&&gs.streamPop>50&&gs.mental>=40&&gs.fatigue<80&&gs.personality.hope>=45)
      type='king';
    // 再生エンド：精神・疲労・希望が一定以上
    else if(gs.mental>=40&&gs.fatigue<80&&gs.personality.hope>=45&&gs.followers>60)
      type='rebirth';

    // ── NORMAL END：生き延びた ──
    else if(gs.mental>=20) type='normal';
    else type='collapse';
  }

  const E={
    engineer:{icon:'⚙️',title:'凄腕保全マンエンド',color:'var(--gd)',
      body:'工場の設備は俺が守る。\n30日間、ひとつも見逃さなかった。\n\n上司から昇格の話が来た。\n借金も、少しずつ減っている。\n\n配信は続ける。深夜に、設備の話をしながら。\n\n── 「壇ノ浦を、俺は知っている。」',
      setup(){AU.playBGM('rebirth');setRain(.3);}},

    father:{icon:'👶',title:'父親エンド',color:'#8a52d4',
      body:'子どもが、俺の名前を呼んだ。\n「パパ、昨日の配信見たよ」\n\n……見てたのか。\n\n借金はまだある。仕事もきつい。\nでも、子どもが笑っている。\n\n── 「それだけで、十分だ。」',
      setup(){AU.playBGM('rebirth');setRain(.2);}},

    // ★ 新グッドエンド①：借金完済エンド
    debtfree:{icon:'🌄',title:'夜明けエンド',color:'var(--gn)',
      body:'借金が、ほぼなくなった。\n\nいつの間にか、そうなっていた。\n配信の収益、給料、少しずつの積み重ね。\n\n壇ノ浦から、完全に這い上がったわけじゃない。\nでも、底は脱した。\n\n朝日が、少し違って見える気がした。\n\n── 「ここからが、本当のスタートだ。」',
      setup(){AU.playBGM('rebirth');setRain(0);
        // 雨を止める演出（cvはrain-canvasの参照変数）
        setTimeout(()=>{ if(typeof cv !== 'undefined') cv.style.opacity='0'; },800);
      }},

    king:{icon:'👑',title:'深夜の王エンド',color:'var(--gd)',
      body:'有名になった。コメントが止まらない。\n\nでも……少し疲れている。\n\n画面の向こうに、たくさんの人がいる。\nそれが救いで、それが重い。\n\n── 「それでも、今夜も配信する。」',
      setup(){
        AU.playBGM('king');
        document.getElementById('end-comments').style.display='block';
        const ec=document.getElementById('end-comments');
        const msgs=['また来ます','いつも聴いてます','声、好きです','ありがとう','……'];
        let idx=0;
        _endingIv=setInterval(()=>{
          ec.textContent=msgs[idx%msgs.length]+'　'+msgs[(idx+2)%msgs.length];
          idx++;
        },330);
      }},

    rebirth:{icon:'🌅',title:'再生エンド',color:'var(--cy)',
      body:'30日間、壇ノ浦の底にいた。\n\n借金は全部は返せなかった。\nでも、少し減った。\nフォロワーが増えた。\n配信に、居場所ができた。\n精神はまだある。\n\n明日も、ここにいる。\n\n── 「また、配信しよう。」',
      setup(){AU.playBGM('rebirth');setRain(.25);}},

    normal:{icon:'🌙',title:'深夜の月エンド',color:'var(--pu)',
      body:'完璧ではなかった。\n借金は残った。疲れた日もあった。\n\nでも30日間、子どもがそこにいて、\nリスナーが待っていて、\n設備は止まらなかった。\n\n── 「また明日も、生き延びよう。」',
      setup(){AU.playBGM('night');setRain(.6);}},

    collapse:{icon:'🌊',title:'崩壊エンド',color:'var(--rd)',
      body:'画面がノイズで歪む。声が出ない。\n\n……誰か、いるか？\n\n「だんのうら」という名前が、\n深夜の海の底に沈んでいく。\n\n── 「まだ……見てる？」',
      setup(){
        AU.stopBGM();setRain(3,60,0,30);
        document.body.setAttribute('data-phase','3');
        let b=0;
        _endingIv=setInterval(()=>{
          const rf=document.getElementById('red-flash');
          rf.style.opacity=b%2?'1':'0';
          b++;
          if(b>10){ clearInterval(_endingIv);_endingIv=null; rf.style.opacity='0'; }
        },320);
      }},

    bankrupt:{icon:'💸',title:'生活破綻エンド',color:'var(--rd)',
      body:'借金が限界を超えた。\n配信機材を手放した。\n\nそれでも、30日間戦ったことは\nどこかに残っている。\n\n── 「いつか、また這い上がれる。」',
      setup(){AU.playBGM('collapse');}},

    flame:{icon:'🔥',title:'炎上崩壊エンド',color:'var(--rd)',
      body:'炎上が止まらなかった。\n精神が、先に限界を迎えた。\n\nアカウントを消した。\n深夜の部屋に、静けさが戻った。\n\n── 「壊れたのは、俺じゃない。」',
      setup(){AU.stopBGM();}},
  };

  // フォールバックはcollapse（想定外typeはBAD扱い）
  if(!E[type]) type='collapse';
  const e=E[type];
  // 30日クリア時は日付が31に進んだ後で呼ばれるので、過ごした日数で記録する
  recordEnding(type, forced ? gs.day : gs.day-1);
  document.getElementById('end-icon').textContent=e.icon;
  document.getElementById('end-title').textContent=e.title;
  document.getElementById('end-title').style.color=e.color;
  document.getElementById('end-body').textContent=e.body;
  e.setup();
  // エンディング画像を設定
  const endImg = document.getElementById('end-img');
  const endImgWrap = document.getElementById('end-img-wrap');
  const endImgSrc = ENDING_IMG[type];
  if(endImg && endImgSrc){
    endImg.src = endImgSrc;
    endImgWrap.style.display = 'block';
  } else if(endImgWrap){
    endImgWrap.style.display = 'none';
  }

  const isBad=['collapse','bankrupt','flame'].includes(type);
  document.getElementById('endless-btn').style.display=isBad?'none':'block';

  // エンディング画面表示 → 一定時間後に共有パネルも表示
  setTimeout(()=>{
    document.getElementById('ending-sc').classList.add('active');
    // DAY30到達=CHAPTER RESULT、それ以上=FINAL ENDING
    const isFinal = gs._endless || gs.day > 30;
    // 共有パネルは5秒後に自動表示（ユーザーが読む時間を確保）
    setTimeout(()=> showSharePanel(type, isFinal), 5000);
  }, 1400);
}

// ★ ENDLESS NIGHT MODE（DAY31以降）
function startEndlessMode(){
  // エンディング演出タイマーを止める
  if(_endingIv){ clearInterval(_endingIv); _endingIv=null; }
  document.getElementById('ending-sc').classList.remove('active');
  document.getElementById('end-comments').style.display='none';
  // ② data-phase残留をリセット
  document.body.setAttribute('data-phase', String(getPhase()));
  document.body.classList.remove('ph3','ph3crit');
  document.getElementById('red-flash').style.opacity='0';
  gs._endless=true;
  AU.fadeBGM('night',800);
  setRain(.75);
  showNotif('🌙 まだ夜は続く……');
  logGrow(`Day${gs.day}：夜をまだ続けることにした`);
  loadScene('main');
}

// ENDLESS中はtriggerEndingを再発動しない
function checkEndlessDay(){
  if(gs._endless&&gs.day>30) return; // 継続
}
function showSection(s){AU.se('btn');if(s==='stream'){openStream();return;}if(s==='factory'){openFactory('repair');return;}if(s==='status'){openStatus();return;}if(s==='skills'){openSkill();return;}loadScene('main');updateNavActive(s);}
function updateNavActive(k){['main','factory','stream','status','skills'].forEach(x=>document.getElementById('nav-'+x)?.classList.remove('active'));document.getElementById('nav-'+k)?.classList.add('active');}
// ── typeText：グローバルタイマー管理で文字混線を防止 ──
let _typingTimer = null;
let _typingLock  = false;
function typeText(id, text, cb){
  const el = document.getElementById(id);
  if(!el) return;
  // 前回のタイマーを必ず止める
  if(_typingTimer !== null){ clearInterval(_typingTimer); _typingTimer = null; }
  _typingLock = true;
  el.textContent = '';
  let i = 0;
  _typingTimer = setInterval(()=>{
    if(i < text.length){
      el.textContent += text[i]; i++;
    } else {
      clearInterval(_typingTimer); _typingTimer = null; _typingLock = false;
      if(cb) cb();
    }
  }, 17);
}
function showResult(title,body){document.getElementById('res-title').textContent=title;document.getElementById('res-body').innerHTML=body;document.getElementById('result-sc').classList.add('active');}
function closeResult(){document.getElementById('result-sc').classList.remove('active');}
function showNotif(msg){const el=document.createElement('div');el.className='notif';el.textContent=msg;document.body.appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .65s';},2300);setTimeout(()=>el.remove(),2980);}

// リスナー定期進化
setInterval(()=>{gs.listeners.forEach(l=>{if(l.regular>15&&l.type==='normal'&&Math.random()<.06){l.type='mod';showNotif(`🛡 ${l.name}がモデレーターになった`);}});},35000);

// ══════════════════════════════════════════════════════════
// ★ セーブ・ロードシステム
// ══════════════════════════════════════════════════════════

const SAVE_KEY = 'dannoura_save_v1';
const SAVE_VERSION = 1;

// gs を JSON化可能な形式に変換（Set→配列など）
function gsToSaveData(){
  const data = Object.assign({}, gs);
  // Set → 配列
  data.completedAchs = Array.from(gs.completedAchs);
  // 内部フラグは除外（再起動時に初期値で問題ない）
  delete data._dayDone;
  delete data._c30;
  delete data._c10;
  // personalityは普通のオブジェクトなのでそのままコピー
  data.personality = Object.assign({}, gs.personality);
  // スキルもコピー
  data.skills = Object.assign({}, gs.skills);
  // リスナーは配列そのまま（プリミティブのみ）
  data.listeners = gs.listeners.map(l => Object.assign({}, l));
  // growHistory・growMilestonesもコピー
  data.growHistory    = [...gs.growHistory];
  data.growMilestones = [...gs.growMilestones];
  return data;
}

// セーブデータから gs を復元
function saveDataToGs(saved){
  Object.assign(gs, saved);
  // 配列 → Set
  gs.completedAchs = new Set(saved.completedAchs || []);
  // 内部フラグを初期化
  gs._dayDone = false;
  gs._c30     = false;
  gs._c10     = false;
  // personalityが存在しない古いデータ対策
  if(!gs.personality) gs.personality = initPersonality();
  // growHistory等が存在しない対策
  if(!gs.growHistory)    gs.growHistory    = [];
  if(!gs.growMilestones) gs.growMilestones = [];
  if(!gs.listeners || gs.listeners.length === 0){
    gs.listeners = [
      {name:'夜空の旅人', trust:0,regular:0,danger:0,evo:0,type:'normal'},
      {name:'ひとりぼっち',trust:0,regular:0,danger:0,evo:0,type:'normal'},
      {name:'深夜の常連',  trust:0,regular:0,danger:0,evo:0,type:'normal'},
      {name:'さくら',      trust:0,regular:0,danger:0,evo:0,type:'normal'},
    ];
  }
}

// ── セーブ ──
function saveGame(silent){
  try{
    const saveData = {
      version:  SAVE_VERSION,
      savedAt:  new Date().toISOString(),
      gs:       gsToSaveData(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    if(!silent) showNotif('💾 セーブしました。');
    return true;
  }catch(e){
    const msg = e.name === 'QuotaExceededError'
      ? '💾 保存に失敗しました（ストレージ容量不足）。'
      : '💾 保存に失敗しました。プライベートブラウズではセーブできない場合があります。';
    if(!silent) showNotif(msg);
    return false;
  }
}

// ── ロード ──
function loadGame(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw){ showNotif('セーブデータが見つかりません。'); return false; }

    const saveData = JSON.parse(raw);

    // バージョンチェック
    if(!saveData.version || saveData.version > SAVE_VERSION){
      showNotif('セーブデータのバージョンが対応していません。新規で始めてください。');
      return false;
    }

    saveDataToGs(saveData.gs);

    // 画面を切り替えてゲームを再開
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    // 各UIを現在状態に更新
    updateStats();
    updateDayInfo();
    applyPhase();
    buildCrowd();
    loadScene('main');

    // BGM再生（loadGameはタップイベント内なのでunlockAudio経由）
    unlockAudio(()=>{ AU.playBGM('night'); });

    showNotif('📂 DAY' + gs.day + 'から再開しました。');
    setTimeout(()=> cutin('normal', '……おかえり。続きをやろう。'), 800);
    return true;

  }catch(e){
    showNotif('セーブデータを読み込めませんでした。新規で始めてください。');
    return false;
  }
}

// ── セーブ削除 ──
function deleteSave(){
  if(!confirm('セーブデータを削除しますか？\nこの操作は戻せません。')) return;
  localStorage.removeItem(SAVE_KEY);
  showNotif('🗑 セーブデータを削除しました。');
  checkSaveData(); // ボタン表示を更新
}

// ── 手動セーブ（状態画面から） ──
function manualSave(){
  saveGame(false);
}

// ── セーブデータ確認（タイトル画面のボタン表示用） ──
function checkSaveData(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    const btn  = document.getElementById('btn-continue');
    const wrap = document.getElementById('btn-delete-wrap');
    if(!raw || !btn){ return; }

    const saveData = JSON.parse(raw);
    const d  = saveData.gs.day   || 1;
    const debt = (saveData.gs.debt || 0).toLocaleString();
    const rank = ['E','D','C','B','A'][saveData.gs.rank || 0] || 'E';
    btn.textContent = `▶ つづきから  DAY${d} / 借金¥${debt} / RANK ${rank}`;
    btn.style.display = 'block';
    if(wrap) wrap.style.display = 'block';
  }catch(e){
    // 壊れたデータは無視
    localStorage.removeItem(SAVE_KEY);
  }
}

// ──────────────────────────
// INIT
// ──────────────────────────
updateStats();updateDayInfo();applyPhase();buildCrowd();
checkSaveData(); // タイトル画面のセーブデータ確認
updateEndingListBtn();
setInterval(()=>{if(!document.getElementById('game-screen').classList.contains('hidden'))updateStats();},9000);
