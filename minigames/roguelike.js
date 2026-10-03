// ══════════════════════════════════════════════════════════
// ローグライク「深夜の工場巡回」
// 毎回自動生成される3フロアの工場を懐中電灯ひとつで探索する。ターン制。
// ・異常箇所（制御盤）を点検し、非常口から下の階へ。
// ・霊は体当たりで追い払う。影は光を当て続けると消える（目を離すと迫る）。
// ・漏電した床は照らしたときだけ見える。3拍子に1度だけ止まる。
// ・B3Fには大きな怨霊がいて、壁をすり抜けて追ってくる。
// 描画はCanvas。照明は「タイルごとの明るさ→低解像度→拡大補間」で柔らかく作る。
// ══════════════════════════════════════════════════════════
addMinigameStyle('rogue',`
.mg-rogue{padding:6px 8px 8px;gap:6px;}
.rg-hud{width:100%;display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:.7rem;color:var(--tx);flex-shrink:0;}
.rg-fl{font-family:var(--dot);font-size:.95rem;color:var(--cy);letter-spacing:.08em;text-shadow:0 0 8px rgba(0,232,200,.45);}
.rg-fl small{font-size:.62rem;color:var(--tx-d);margin-left:2px;}
.rg-bat{display:flex;align-items:center;gap:3px;padding:2px 3px 2px 4px;border:1px solid rgba(68,238,136,.45);border-radius:3px;position:relative;margin-right:4px;}
.rg-bat::after{content:"";position:absolute;right:-5px;top:50%;width:3px;height:7px;margin-top:-3.5px;background:rgba(68,238,136,.5);border-radius:0 2px 2px 0;}
.rg-bat i{display:block;width:9px;height:11px;border-radius:1px;background:rgba(94,80,120,.25);}
.rg-bat i.on{background:var(--gn);box-shadow:0 0 6px rgba(68,238,136,.6);}
.rg-bat.low{border-color:rgba(232,48,85,.6);}
.rg-bat.low i.on{background:var(--rd);box-shadow:0 0 6px rgba(232,48,85,.7);animation:rgBlink .8s steps(2) infinite;}
@keyframes rgBlink{50%{opacity:.35}}
.rg-ins{margin-left:auto;color:var(--gd);font-family:var(--dot);font-size:.78rem;}
.rg-ins b{font-weight:normal;color:var(--tx-b);}
.rg-wrap{flex:1;min-height:0;width:100%;position:relative;display:flex;align-items:center;justify-content:center;}
.rg-cv{display:block;touch-action:none;border-radius:4px;box-shadow:0 0 0 1px rgba(138,82,212,.35),0 0 22px rgba(138,82,212,.18);background:#05040e;cursor:pointer;-webkit-user-select:none;user-select:none;}
.rg-intro{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,4,14,.78);transition:opacity .4s;z-index:2;touch-action:none;}
.rg-intro.hide{opacity:0;pointer-events:none;}
.rg-card{width:min(88%,330px);background:var(--panel);border:1px solid rgba(0,232,200,.35);border-radius:5px;padding:12px 14px;box-shadow:0 0 24px rgba(0,232,200,.12);}
.rg-card h3{margin:0 0 8px;font-family:var(--dot);font-weight:normal;font-size:.95rem;color:var(--cy);letter-spacing:.08em;}
.rg-card ul{list-style:none;margin:0;padding:0;font-size:.7rem;line-height:1.65;color:var(--tx-b);}
.rg-card li{display:flex;gap:8px;align-items:baseline;margin:3px 0;}
.rg-card li span{flex-shrink:0;width:1.6em;text-align:center;font-family:var(--dot);}
.rg-card .k1{color:var(--gd);}.rg-card .k2{color:#cfe0ff;}.rg-card .k3{color:var(--rd);}.rg-card .k4{color:#9fd8ff;}.rg-card .k5{color:var(--gn);}
.rg-card p{margin:8px 0 0;font-family:var(--mono);font-size:.6rem;color:var(--tx-d);text-align:center;}
.rg-log{width:100%;min-height:3.3em;font-size:.68rem;line-height:1.55;color:var(--tx-b);text-align:center;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 4px;}
.rg-old{color:var(--tx-d);font-size:.62rem;}.rg-cur{animation:rgIn .25s ease-out;}
@keyframes rgIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.rg-pad{display:grid;grid-template-columns:repeat(3,66px);grid-template-rows:repeat(2,50px);gap:7px;flex-shrink:0;}
.rg-pad button{background:rgba(0,232,200,.06);border:1px solid rgba(0,232,200,.38);color:var(--cy);font-size:1rem;border-radius:5px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:none;-webkit-user-select:none;user-select:none;}
.rg-pad button.on,.rg-pad button:active{background:rgba(0,232,200,.22);}
.rg-pad .rg-wait{grid-column:3;grid-row:1;font-family:var(--dot);font-size:.7rem;color:var(--tx);border-color:rgba(138,82,212,.45);background:rgba(138,82,212,.08);}
.rg-up{grid-column:2;grid-row:1;}.rg-left{grid-column:1;grid-row:2;}.rg-down{grid-column:2;grid-row:2;}.rg-right{grid-column:3;grid-row:2;}
/* タイトル・会話・エンディング */
.rg-ov{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;transition:opacity .4s;-webkit-user-select:none;user-select:none;}
.rg-ov.hide{opacity:0;pointer-events:none;}
.rg-title{background:radial-gradient(ellipse at 50% 42%,rgba(34,22,66,.6),rgba(5,4,14,.96) 72%);overflow:hidden;cursor:pointer;}
.rg-beam{position:absolute;left:50%;top:-6%;width:180%;height:120%;margin-left:-90%;transform-origin:50% 0;background:conic-gradient(from 166deg at 50% 0,transparent 0deg,rgba(255,236,180,.17) 12deg,rgba(255,236,180,.06) 22deg,transparent 28deg);animation:rgSweep 3.4s ease-in-out infinite alternate;pointer-events:none;}
@keyframes rgSweep{from{transform:rotate(-16deg)}to{transform:rotate(16deg)}}
.rg-scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px);pointer-events:none;}
.rg-logo-en{position:relative;font-family:var(--mono);font-size:.6rem;letter-spacing:.42em;color:var(--cy);opacity:.85;}
.rg-logo{position:relative;font-family:var(--dot);font-size:2.4rem;line-height:1.12;text-align:center;color:#f6efff;letter-spacing:.06em;margin:8px 0 6px;text-shadow:0 0 1px #fff,0 0 16px rgba(0,232,200,.55),3px 3px 0 #2a1a48,4px 4px 0 #120a22;animation:rgFlick 4s infinite;}
.rg-logo b{font-weight:normal;color:var(--gd);text-shadow:0 0 14px rgba(232,184,48,.75),3px 3px 0 #2a1a48,4px 4px 0 #120a22;}
@keyframes rgFlick{0%,91%,95%,100%{opacity:1}93%{opacity:.35}}
.rg-sub{position:relative;font-family:var(--serif);font-size:.7rem;color:var(--tx);letter-spacing:.05em;}
.rg-lap{position:relative;margin-top:14px;font-family:var(--dot);font-size:.72rem;color:var(--gd);border:1px solid rgba(232,184,48,.5);padding:2px 12px;border-radius:2px;background:rgba(232,184,48,.07);}
.rg-best{position:relative;margin-top:6px;font-family:var(--mono);font-size:.6rem;color:var(--tx-d);}
.rg-tap{position:relative;margin-top:20px;font-family:var(--mono);font-size:.66rem;color:var(--tx-b);letter-spacing:.24em;animation:rgBlink 1.1s steps(2) infinite;}
.rg-talk{justify-content:flex-end;padding:10px;background:linear-gradient(rgba(5,4,14,0) 35%,rgba(5,4,14,.88));cursor:pointer;}
.rg-box{width:100%;display:flex;gap:10px;align-items:stretch;background:linear-gradient(180deg,rgba(24,16,44,.97),rgba(10,7,22,.97));border:1px solid rgba(138,82,212,.7);border-radius:5px;padding:8px;box-shadow:0 0 0 2px rgba(5,4,14,.9),0 0 0 3px rgba(138,82,212,.25),0 0 20px rgba(138,82,212,.25);text-align:left;}
.rg-face{width:78px;height:78px;flex-shrink:0;border-radius:4px;border:1px solid rgba(0,232,200,.5);background:#d8d0e8 center/cover no-repeat;box-shadow:inset 0 0 12px rgba(5,4,14,.45);}
.rg-say{flex:1;min-width:0;display:flex;flex-direction:column;}
.rg-name{font-family:var(--dot);font-size:.72rem;color:var(--cy);margin-bottom:3px;letter-spacing:.1em;}
.rg-txt{font-family:var(--serif);font-size:.76rem;line-height:1.75;color:var(--tx-b);min-height:3.5em;}
.rg-next{align-self:flex-end;font-size:.62rem;color:var(--cy);animation:rgBlink 1s steps(2) infinite;}
.rg-skip{position:absolute;top:8px;right:8px;background:rgba(5,4,14,.7);border:1px solid rgba(138,82,212,.5);color:var(--tx);font-family:var(--dot);font-size:.62rem;padding:4px 10px;border-radius:3px;cursor:pointer;}
.rg-end{background:radial-gradient(ellipse at 50% 30%,rgba(26,18,52,.97),rgba(5,4,14,.99) 70%);padding:12px;gap:7px;}
.rg-gl{font-family:var(--mono);font-size:.58rem;color:var(--tx-d);letter-spacing:.4em;}
.rg-grade{width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--dot);font-size:3.5rem;border:3px double currentColor;box-shadow:0 0 24px currentColor,inset 0 0 18px currentColor;text-shadow:0 0 12px currentColor;opacity:0;transform:scale(2.6) rotate(-24deg);transition:transform .38s cubic-bezier(.2,1.7,.4,1),opacity .18s;}
.rg-grade.in{opacity:1;transform:scale(1) rotate(-8deg);}
.rg-etitle{font-family:var(--dot);font-size:1rem;color:var(--tx-b);letter-spacing:.1em;}
.rg-stats{display:flex;gap:12px;font-family:var(--dot);font-size:.72rem;color:var(--tx);}
.rg-stats b{font-weight:normal;color:var(--gd);}
.rg-new{font-family:var(--dot);color:var(--gd);font-size:.72rem;animation:rgBlink .8s steps(2) infinite;}
.rg-end .rg-box{max-width:360px;opacity:0;transform:translateY(10px);transition:opacity .5s .5s,transform .5s .5s;}
.rg-end.show .rg-box{opacity:1;transform:none;}
.rg-go{margin-top:4px;background:rgba(0,232,200,.1);border:1px solid var(--cy);color:var(--cy);font-family:var(--dot);font-size:.88rem;padding:10px 30px;border-radius:4px;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.rg-go:active{background:rgba(0,232,200,.25);}
@media (max-height:640px){.rg-pad{grid-template-rows:repeat(2,42px);}.rg-face{width:62px;height:62px;}.rg-log{min-height:2.4em;font-size:.66rem;}}
`);

registerMinigame({
  id:'rogue', icon:'🔦', name:'深夜の工場巡回', genre:'ローグライク', bgm:'kaidan',
  desc:'毎回形が変わる夜の工場を3フロア巡回。懐中電灯で照らし、異常箇所を点検し、怪異をかわして出口へ。',
  effect:'仕事評価↑ 資格知識↑ 収入↑ 怪談ネタ ／ 疲労+10 約90分',
  help:'スワイプ・十字・矢印で移動',
  start(body,mg){
    const W=9,H=11,N=W*H,FLOORS=3,MAX_HP=5;
    const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
    const ANG=[-Math.PI/2,0,Math.PI/2,Math.PI];
    const TAU=Math.PI*2;
    let floor=1,hp=MAX_HP,inspected=0,memos=0,banished=0,met=0,bossDown=false,turn=0,busy=false;
    let floorFaults=0,floorFaultsDone=0,dying=false,lightMul=1,flickDip=0,hurtT=0,shake=0,time=0;
    let trans=null,clearing=0,introOn=true,heldDir=null,holdT=0,nextRep=0,lastSay='';
    let scene='title',buffered=null,hitStop=0,endReason=null,gradeInfo=null,sceneTok=0;
    let talkI=0,talkPos=0,talkLines=[],fading=[];
    // 記録（gs.rogueData）と周回による変化
    const REC=(gs.rogueData=gs.rogueData||{plays:0,clears:0,bestScore:0,bestGrade:'',bossDowns:0});
    const LAP=Math.min(3,(REC.clears||0)+1);
    let totalFaults=0;
    const map=new Uint8Array(N),seen=new Uint8Array(N),losA=new Uint8Array(N),cone=new Uint8Array(N);
    const litL=new Float32Array(N),losD=new Float32Array(N),lightD=new Float32Array(N),lightR=new Float32Array(N);
    const bfs=new Int16Array(N),q=new Int16Array(N);
    const player={x:4,y:9,face:0,rx:4,ry:9,ra:-Math.PI/2,walk:0,step:0};
    let enemies=[],items=[],leaks=[],lamps=[],exit={x:0,y:0};
    let eid=0;

    body.innerHTML=`
      <div class="rg-hud"><span class="rg-fl" id="rg-fl">B1F<small>/3</small></span>
        <span class="rg-bat" id="rg-bat">${'<i></i>'.repeat(MAX_HP)}</span>
        <span class="rg-ins" id="rg-ins"></span></div>
      <div class="rg-wrap" id="rg-wrap"><canvas class="rg-cv" id="rg-cv"></canvas>
        <div class="rg-ov rg-title" id="rg-title"><div class="rg-beam"></div><div class="rg-scan"></div>
          <div class="rg-logo-en">FACTORY NIGHT PATROL</div>
          <div class="rg-logo">深夜の<br><b>工場</b>巡回</div>
          <div class="rg-sub">― 懐中電灯ひとつで、地下三階まで ―</div>
          <div class="rg-lap">${LAP>1?`巡回 ${LAP}周目 ― 怪異が増えている`:'今夜の巡回 B1F〜B3F'}</div>
          <div class="rg-best">${REC.bestGrade?`ベスト評価 ${REC.bestGrade}　巡回完了 ${REC.clears}回`:'記録なし'}</div>
          <div class="rg-tap">TAP TO START</div></div>
        <div class="rg-ov rg-talk hide" id="rg-talk"><button class="rg-skip" id="rg-skip">スキップ ▶▶</button>
          <div class="rg-box"><div class="rg-face" id="rg-face"></div><div class="rg-say"><div class="rg-name">だんのうら</div><div class="rg-txt" id="rg-txt"></div><div class="rg-next">▼</div></div></div></div>
        <div class="rg-ov rg-end hide" id="rg-end"></div>
        <div class="rg-intro hide" id="rg-intro"><div class="rg-card">
          <h3>🔦 深夜の工場巡回</h3>
          <ul>
            <li><span class="k1">⚠</span>赤く光る制御盤を踏んで<b>点検</b>する</li>
            <li><span class="k2">霊</span>白い霊は<b>体当たり</b>で追い払う</li>
            <li><span class="k3">影</span>黒い影は<b>照らし続けると</b>消える。目を離すと迫る</li>
            <li><span class="k4">⚡</span>漏電床は照らすと見える。<b>3拍子に1度</b>止まる</li>
            <li><span class="k5">非</span>緑の<b>非常口</b>から下の階へ（全3フロア）</li>
            <li><span class="k5">▮</span>電池は命綱。減るほど<b>光が短く</b>なる</li>
          </ul>
          <p>スワイプ／タップ／十字／矢印・WASD　待機：中央タップ・Space</p>
        </div></div>
      </div>
      <div class="rg-log" id="rg-log">懐中電灯を点けた。巡回を始める。</div>
      <div class="rg-pad">
        <button data-d="0" class="rg-up">▲</button>
        <button data-d="-1" class="rg-wait">待機</button>
        <button data-d="3" class="rg-left">◀</button>
        <button data-d="2" class="rg-down">▼</button>
        <button data-d="1" class="rg-right">▶</button>
      </div>`;
    const $=id=>body.querySelector('#'+id);
    const cv=$('rg-cv'),ctx=cv.getContext('2d'),wrap=$('rg-wrap'),logEl=$('rg-log'),introEl=$('rg-intro');
    const flEl=$('rg-fl'),batEl=$('rg-bat'),insEl=$('rg-ins');
    const titleEl=$('rg-title'),talkEl=$('rg-talk'),txtEl=$('rg-txt'),faceEl=$('rg-face'),endEl=$('rg-end');
    const batCells=batEl.querySelectorAll('i');
    const mapCv=document.createElement('canvas'),mctx=mapCv.getContext('2d');
    const lowCv=document.createElement('canvas');lowCv.width=W;lowCv.height=H;
    const lctx=lowCv.getContext('2d');const lowImg=lctx.createImageData(W,H);
    let T=36,dpr=1;

    const rnd=n=>Math.floor(Math.random()*n);
    const clamp01=v=>v<0?0:v>1?1:v;
    const idx=(x,y)=>y*W+x;
    const inside=(x,y)=>x>0&&y>0&&x<W-1&&y<H-1;
    const isFloor=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&map[y*W+x]===1;
    const enemyAt=(x,y)=>{for(let i=0;i<enemies.length;i++){const e=enemies[i];if(e.x===x&&e.y===y)return e;}return null;};
    const itemAt=(x,y)=>{for(let i=0;i<items.length;i++){const it=items[i];if(it.x===x&&it.y===y)return it;}return null;};
    const leakAt=(x,y)=>{for(let i=0;i<leaks.length;i++){const l=leaks[i];if(l.x===x&&l.y===y)return l;}return null;};
    const leakOn=l=>(turn+l.ph)%3!==0;
    const hash=(x,y)=>(((x+11)*73856093)^((y+7)*19349663)^(floor*83492791))>>>0;
    const say=t=>{if(t===lastSay)return;const prev=lastSay;lastSay=t;logEl.innerHTML=(prev?`<span class="rg-old">${prev}</span>`:'')+`<span class="rg-cur">${t}</span>`;};
    const pick=a=>a[rnd(a.length)];

    // ── 入力 ──
    const KEYMAP={ArrowUp:0,w:0,ArrowRight:1,d:1,ArrowDown:2,s:2,ArrowLeft:3,a:3,' ':-1,'.':-1,z:-1};
    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      if(e.key==='Enter'){e.preventDefault();if(scene==='end')finishEnd();else if(scene!=='play')advance();return;}
      const d=KEYMAP[e.key.length===1?e.key.toLowerCase():e.key];
      if(d!==undefined){e.preventDefault();if(scene==='end'){if(d===-1)finishEnd();return;}act(d);}
    });
    body.querySelectorAll('.rg-pad button').forEach(b=>{
      const d=+b.dataset.d;
      const up=()=>{b.classList.remove('on');if(heldDir===d)heldDir=null;};
      b.addEventListener('pointerdown',e=>{e.preventDefault();b.classList.add('on');heldDir=d;holdT=0;nextRep=.32;act(d);});
      ['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,up));
      b.addEventListener('contextmenu',e=>e.preventDefault());
    });
    let pd=null;
    cv.addEventListener('pointerdown',e=>{e.preventDefault();pd={x:e.clientX,y:e.clientY};try{cv.setPointerCapture(e.pointerId);}catch(_){}});
    cv.addEventListener('pointerup',e=>{
      if(!pd)return;
      const dx=e.clientX-pd.x,dy=e.clientY-pd.y;pd=null;
      if(Math.hypot(dx,dy)>22){act(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0));return;}
      // タップ：タップしたマスの方向へ1歩（自分のマスなら待機）
      const r=cv.getBoundingClientRect();
      const tx=(e.clientX-r.left)/T-(player.x+.5),ty=(e.clientY-r.top)/T-(player.y+.5);
      if(Math.abs(tx)<.5&&Math.abs(ty)<.5){act(-1);return;}
      act(Math.abs(tx)>Math.abs(ty)?(tx>0?1:3):(ty>0?2:0));
    });
    cv.addEventListener('pointercancel',()=>{pd=null;});
    introEl.addEventListener('pointerdown',e=>{e.preventDefault();hideIntro();});
    function hideIntro(){if(introOn){introOn=false;introEl.classList.add('hide');}if(scene==='tut')scene='play';}
    titleEl.addEventListener('pointerdown',e=>{e.preventDefault();advance();});
    talkEl.addEventListener('pointerdown',e=>{e.preventDefault();advance();});
    $('rg-skip').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();AU.se('back');talkI=talkLines.length;showTut();});

    // ── 導入：タイトル → 会話 → 遊び方 ──
    const FACE='assets/img/char_';
    talkLines=LAP>1?[
      ['tired','また臨時の夜間巡回だ。……前より、空気が重い気がする。'],
      ['normal','子どもは実家に預けてきた。朝には迎えに行く約束だ。'],
      ['fear','地下の噂、配信で話したら妙に伸びた。……今夜も、いるんだろうな。'],
    ]:[
      ['tired',`${gs.day}日目、23時。臨時の夜間巡回。手当が出るなら、断る理由はない。`],
      ['normal','子どもは実家に預けてきた。朝には迎えに行く約束だ。'],
      ['fear','地下で“何か”を見たって噂がある。……配信のネタになるなら、それも悪くない。'],
    ];
    function setTimer(fn,ms){const tok=sceneTok;setTimeout(()=>{if(!mg._ended&&tok===sceneTok)fn();},ms);}
    function advance(){
      if(mg._ended)return;
      if(scene==='title'){AU.se('decide');sfx('shutter');showTalk(0);}
      else if(scene==='talk'){
        const full=talkLines[talkI][1];
        if(talkPos<full.length){talkPos=full.length;txtEl.textContent=full;return;}
        AU.se('btn');showTalk(talkI+1);
      }else if(scene==='tut')hideIntro();
    }
    function showTalk(i){
      sceneTok++;
      titleEl.classList.add('hide');
      if(i>=talkLines.length){showTut();return;}
      scene='talk';talkI=i;talkPos=0;txtEl.textContent='';
      talkEl.classList.remove('hide');
      faceEl.style.backgroundImage=`url(${FACE}${talkLines[i][0]}.webp)`;
      setTimer(()=>{if(scene==='talk'&&talkI===i)showTalk(i+1);},3600);
    }
    function showTut(){
      sceneTok++;titleEl.classList.add('hide');talkEl.classList.add('hide');
      scene='tut';introEl.classList.remove('hide');introOn=true;
      say('懐中電灯を点けた。巡回を始める。');
      setTimer(()=>{if(scene==='tut')hideIntro();},4500);
    }
    setTimer(()=>{if(scene==='title')advance();},2600);
    // 画像の先読み
    ['tired','normal','fear','win','happy','collapse'].forEach(n=>{const im=new Image();im.src=FACE+n+'.webp';});

    // ── 効果音（Web Audioで短く合成。AU.ctxがあるときだけ） ──
    let noiseBuf=null;
    function sfx(kind){
      try{
        if(!window.AU||typeof AUDIO_SET==='undefined'||AUDIO_SET.se<=0)return;
        AU.init();const c=AU.ctx;if(!c)return;
        if(c.state==='suspended')c.resume().catch(()=>{});
        const now=c.currentTime,G=AUDIO_SET.se;
        if(!noiseBuf){noiseBuf=c.createBuffer(1,c.sampleRate*.6|0,c.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
        const env=(g,a,dur)=>{g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(Math.max(.0002,a*G),now+.008);g.gain.exponentialRampToValueAtTime(.0001,now+dur);};
        const noise=(dur,freq,q,a,type)=>{const n=c.createBufferSource();n.buffer=noiseBuf;const f=c.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=freq;f.Q.value=q;const g=c.createGain();env(g,a,dur);n.connect(f);f.connect(g);g.connect(c.destination);n.start(now);n.stop(now+dur+.02);return f;};
        const tone=(type,f0,f1,dur,a)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f0,now);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),now+dur);env(g,a,dur);o.connect(g);g.connect(c.destination);o.start(now);o.stop(now+dur+.02);};
        if(kind==='step')noise(.06,player.step%2?700:900,2.5,.09);
        else if(kind==='turn')tone('sine',190,150,.05,.05);
        else if(kind==='wait')tone('triangle',120,110,.12,.04);
        else if(kind==='hit'){noise(.08,1800,1.2,.12);tone('square',220,90,.09,.05);}
        else if(kind==='banish'){tone('sine',880,180,.45,.08);noise(.4,2400,.7,.05,'highpass');}
        else if(kind==='zap'){tone('sawtooth',70,1400,.16,.06);noise(.18,3000,.8,.1);}
        else if(kind==='hurt'){tone('square',170,55,.28,.07);noise(.2,400,1,.06);}
        else if(kind==='shutter'){const f=noise(.55,300,.6,.14,'lowpass');f.frequency.exponentialRampToValueAtTime(900,now+.5);}
        else if(kind==='stamp'){tone('sine',110,50,.3,.16);tone('triangle',660,660,.5,.05);tone('triangle',990,990,.6,.035);}
        else if(kind==='pick')tone('triangle',660,1320,.12,.05);
      }catch(_){}
    }

    // ── 演出用プール ──
    const parts=[];for(let i=0;i<110;i++)parts.push({l:0,m:1,x:0,y:0,vx:0,vy:0,s:1,c:'#fff'});
    function burst(x,y,n,col,spd,size){
      for(let i=0,k=0;i<parts.length&&k<n;i++){const p=parts[i];if(p.l>0)continue;k++;
        const a=Math.random()*TAU,v=spd*(.35+Math.random()*.65);
        p.x=x;p.y=y;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v-spd*.3;p.l=p.m=.5+Math.random()*.6;p.s=size*(.5+Math.random()*.7);p.c=col;}
    }
    const texts=[];for(let i=0;i<8;i++)texts.push({l:0,x:0,y:0,t:'',c:'#fff'});
    function floatText(x,y,t,c){for(const f of texts)if(f.l<=0){f.l=1.1;f.x=x;f.y=y;f.t=t;f.c=c;return;}}
    const fogCv=document.createElement('canvas');fogCv.width=fogCv.height=64;
    {const g=fogCv.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(160,130,220,1)');gr.addColorStop(1,'rgba(160,130,220,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);}
    const fogs=[];for(let i=0;i<6;i++)fogs.push({x:Math.random()*W,y:1+Math.random()*(H+1),r:3+Math.random()*3,v:.08+Math.random()*.12});
    const motes=[];for(let i=0;i<26;i++)motes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.12,vy:(Math.random()-.5)*.1-.03,p:Math.random()*TAU});

    // ── フロア生成：ランダムウォークで掘り、最も遠い床を出口にする ──
    function bfsFrom(sx,sy){
      bfs.fill(-1);let h=0,t=0;q[t++]=idx(sx,sy);bfs[idx(sx,sy)]=0;
      while(h<t){const c=q[h++],cx=c%W,cy=(c/W)|0;
        for(let d=0;d<4;d++){const nx=cx+DIRS[d][0],ny=cy+DIRS[d][1];
          if(isFloor(nx,ny)&&bfs[idx(nx,ny)]<0){bfs[idx(nx,ny)]=bfs[c]+1;q[t++]=idx(nx,ny);}}}
      return t;
    }
    function genFloor(){
      map.fill(0);seen.fill(0);losD.fill(0);
      let x=4,y=H-2,carved=1;map[idx(x,y)]=1;
      const target=Math.floor((W-2)*(H-2)*.54);
      while(carved<target){const [dx,dy]=DIRS[rnd(4)];
        if(inside(x+dx,y+dy)){x+=dx;y+=dy;if(!map[idx(x,y)]){map[idx(x,y)]=1;carved++;}}}
      player.x=player.rx=4;player.y=player.ry=H-2;player.face=0;player.ra=ANG[0];
      const cnt=bfsFrom(player.x,player.y);
      const cells=[];for(let i=0;i<cnt;i++)cells.push(q[i]);
      const dist=bfs.slice();
      cells.sort((a,b)=>dist[b]-dist[a]);
      exit={x:cells[0]%W,y:(cells[0]/W)|0};
      const used=new Set([idx(player.x,player.y),cells[0]]);
      const take=(minD,pref)=>{
        let pool=cells.filter(c=>!used.has(c)&&dist[c]>=minD);
        if(pref){const p2=pool.filter(pref);if(p2.length)pool=p2;}
        if(!pool.length)return null;
        const c=pool[rnd(pool.length)];used.add(c);return {x:c%W,y:(c/W)|0};
      };
      items=[];
      const put=(type,n,minD)=>{for(let i=0;i<n;i++){const p=take(minD);if(p)items.push({x:p.x,y:p.y,type,done:false,ph:Math.random()*TAU});}};
      floorFaults=2+(floor>1?1:0);
      put('fault',floorFaults,2);
      floorFaults=items.length;floorFaultsDone=0;totalFaults+=floorFaults;
      put('battery',floor===3?2:1,2);
      if(Math.random()<.7)put('memo',1,2);
      // 漏電床：通路（左右or上下だけ床）を優先
      leaks=[];
      const corridor=c=>{const cx=c%W,cy=(c/W)|0;let n=0;for(const [dx,dy] of DIRS)if(isFloor(cx+dx,cy+dy))n++;return n===2;};
      for(let i=0;i<(floor===1?1:2)+(LAP>=2?1:0);i++){const p=take(2,corridor);if(p)leaks.push({x:p.x,y:p.y,ph:rnd(3)});}
      // 怪異
      enemies=[];
      const spawn=(kind,minD,hpv)=>{const p=take(minD);if(p)enemies.push({x:p.x,y:p.y,rx:p.x,ry:p.y,kind,hp:hpv,max:hpv,cd:0,stun:0,tick:0,hitT:0,lunge:0,lx:0,ly:0,fade:1,frozen:false,id:eid++});};
      // 難しさの段階：B1F 霊だけ → B2F 影が加わる → B3F 怨霊。周回を重ねると増える
      if(floor===1){spawn('g',4,1);spawn('g',4,1);if(LAP>=2)spawn('g',5,1);if(LAP>=3)spawn('k',6,3);}
      else if(floor===2){spawn('g',4,1);spawn('g',4,1);spawn('k',5,3);if(LAP>=2)spawn('g',5,1);}
      else{spawn('g',4,1);spawn('g',4,1);spawn('k',5,3);spawn('b',6,LAP>=3?4:3);}
      buildStatic();
      computeLight();
      updateHud();
    }

    // ── 光：懐中電灯（前方の円錐）＋手元の明かり ──
    let lastCone=0;
    function lightFn(tx,ty,px,py,ang,R){
      const dx=tx-px,dy=ty-py,d=Math.sqrt(dx*dx+dy*dy);
      const amb=clamp01(1-(d-.6)/1.55)*.86;
      let c=0;
      if(d>.05&&d<R){
        let df=Math.atan2(dy,dx)-ang;df=Math.abs(((df+Math.PI)%TAU+TAU)%TAU-Math.PI);
        const af=clamp01((.66-df)/.34);
        c=af*clamp01(1-(d-1.2)/(R-1.2));
      }else if(d<=.05)c=1;
      lastCone=c;
      return c>amb?c:amb;
    }
    const coneR=()=>2.5+.42*Math.max(hp,0);
    function los(x0,y0,x1,y1){
      const dx=x1-x0,dy=y1-y0,n=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))*3);
      for(let s=1;s<n;s++){const tx=Math.round(x0+dx*s/n),ty=Math.round(y0+dy*s/n);
        if(tx===x1&&ty===y1)continue;if(!isFloor(tx,ty))return false;}
      return true;
    }
    function computeLight(){
      const R=coneR(),a=ANG[player.face];
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        const i=idx(x,y);
        const near=Math.abs(x-player.x)<=5&&Math.abs(y-player.y)<=5;
        const l=near?lightFn(x,y,player.x,player.y,a,R):0;
        const c=lastCone;
        losA[i]=near&&l>.05&&los(player.x,player.y,x,y)?1:0;
        litL[i]=losA[i]?l:0;
        cone[i]=losA[i]&&near&&c>.3?1:0;
        if(litL[i]>.3)seen[i]=1;
      }
    }

    // ── 静的な床・壁を一度だけ描いておく ──
    function buildStatic(){
      mapCv.width=Math.round(W*T*dpr);mapCv.height=Math.round(H*T*dpr);
      const c=mctx;c.setTransform(dpr,0,0,dpr,0,0);
      c.fillStyle='#07060f';c.fillRect(0,0,W*T,H*T);
      lamps=[];
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(map[idx(x,y)])drawFloorTile(c,x,y);else drawWallTile(c,x,y);}
      // 2x2ディザで質感を足す
      const dc=document.createElement('canvas');dc.width=dc.height=2;const dg=dc.getContext('2d');
      dg.fillStyle='rgba(0,0,0,.2)';dg.fillRect(0,0,1,1);dg.fillRect(1,1,1,1);
      c.fillStyle=c.createPattern(dc,'repeat');c.fillRect(0,0,W*T,H*T);
    }
    function drawFloorTile(c,x,y){
      const X=x*T,Y=y*T,h=hash(x,y);
      c.fillStyle='#2e283e';c.fillRect(X,Y,T,T);
      c.fillStyle='#423a5a';c.fillRect(X+1,Y+1,T-2,T-2);
      if(h%5===0){ // 縞鋼板
        c.fillStyle='#4a4264';
        for(let j=0;j<4;j++)for(let i=0;i<4;i++){
          const cx=X+T*(.16+i*.23),cy=Y+T*(.16+j*.23);
          c.save();c.translate(cx,cy);c.rotate((i+j)%2?.7:-.7);c.fillRect(-T*.07,-T*.018,T*.14,T*.036);c.restore();}
      }else{ // グレーチング
        c.fillStyle='#1d1829';
        for(let i=0;i<5;i++)c.fillRect(X+T*.12,Y+T*(.13+i*.155),T*.76,T*.075);
        c.fillStyle='rgba(120,105,160,.22)';
        for(let i=0;i<5;i++)c.fillRect(X+T*.12,Y+T*(.205+i*.155),T*.76,1);
      }
      c.fillStyle='#55497a';
      const b=T*.055;[[.08,.08],[.92,.08],[.08,.92],[.92,.92]].forEach(([u,v])=>{c.beginPath();c.arc(X+T*u,Y+T*v,b,0,TAU);c.fill();});
      if(h%7===3){c.fillStyle='rgba(8,4,16,.35)';c.beginPath();c.ellipse(X+T*.6,Y+T*.55,T*.28,T*.16,.4,0,TAU);c.fill();}
      if(h%11===5){c.fillStyle='rgba(232,184,48,.55)';c.fillRect(X+T*.04,Y,T*.06,T);}
      // 上が壁なら影
      if(!isFloor(x,y-1)){const g=c.createLinearGradient(0,Y,0,Y+T*.42);g.addColorStop(0,'rgba(4,2,10,.65)');g.addColorStop(1,'rgba(4,2,10,0)');c.fillStyle=g;c.fillRect(X,Y,T,T*.42);}
      if(!isFloor(x-1,y)){c.fillStyle='rgba(4,2,10,.35)';c.fillRect(X,Y,T*.08,T);}
      if(!isFloor(x+1,y)){c.fillStyle='rgba(4,2,10,.35)';c.fillRect(X+T*.92,Y,T*.08,T);}
    }
    function drawWallTile(c,x,y){
      const X=x*T,Y=y*T,h=hash(x,y);
      const front=isFloor(x,y+1);
      c.fillStyle='#1b1530';c.fillRect(X,Y,T,T);
      c.strokeStyle='rgba(90,72,140,.22)';c.lineWidth=1;
      c.beginPath();c.moveTo(X,Y+T*.5+.5);c.lineTo(X+T,Y+T*.5+.5);c.moveTo(X+T*(h%2?.3:.7)+.5,Y);c.lineTo(X+T*(h%2?.3:.7)+.5,Y+T*.5);c.stroke();
      c.fillStyle='#4a3d70';
      if(isFloor(x-1,y))c.fillRect(X,Y,2,front?T*.36:T);
      if(isFloor(x+1,y))c.fillRect(X+T-2,Y,2,front?T*.36:T);
      if(isFloor(x,y-1))c.fillRect(X,Y,T,2);
      if(!front)return;
      // 手前の壁面
      const fy=Y+T*.34,fh=T*.66;
      const g=c.createLinearGradient(0,fy,0,Y+T);g.addColorStop(0,'#4b3e70');g.addColorStop(1,'#2a2244');
      c.fillStyle=g;c.fillRect(X,fy,T,fh);
      c.fillStyle='#6a5a98';c.fillRect(X,fy,T,1.5);
      const v=(((x>>1)*31+y*17+floor*7)>>>0)%4;
      if(v===1){ // 配管
        for(let k=0;k<2;k++){
          const py=fy+fh*(.28+k*.38),pr=T*.075;
          const pg=c.createLinearGradient(0,py-pr,0,py+pr);pg.addColorStop(0,'#9a8cc4');pg.addColorStop(.45,'#5d5088');pg.addColorStop(1,'#2a2246');
          c.fillStyle=pg;c.fillRect(X,py-pr,T,pr*2);
          c.fillStyle='#3a3060';c.fillRect(X+T*(k?.25:.7),py-pr*1.35,T*.07,pr*2.7);
        }
        if(h%3===0){c.fillStyle='#c0303a';c.beginPath();c.arc(X+T*.5,fy+fh*.28,T*.06,0,TAU);c.fill();}
      }else if(v===2){ // 機械
        c.fillStyle='#1e2436';c.fillRect(X+T*.12,fy+fh*.12,T*.76,fh*.72);
        c.strokeStyle='#5a6888';c.lineWidth=1;c.strokeRect(X+T*.12+.5,fy+fh*.12+.5,T*.76-1,fh*.72-1);
        c.fillStyle='#3a4560';for(let i=0;i<3;i++)c.fillRect(X+T*.2,fy+fh*(.25+i*.16),T*.38,fh*.06);
        lamps.push({x:X+T*.74,y:fy+fh*.3,ph:(h%100)/16,col:h%2?'#44ee88':'#e8b830',tx:x,ty:y});
      }else if(v===3){ // 注意の縞
        c.save();c.beginPath();c.rect(X,Y+T*.8,T,T*.2);c.clip();
        c.fillStyle='#d4a82a';c.fillRect(X,Y+T*.8,T,T*.2);c.fillStyle='#16101e';
        for(let i=-2;i<6;i++){c.beginPath();const sx=X+i*T*.22+(x*T*.0)%1;c.moveTo(sx,Y+T);c.lineTo(sx+T*.11,Y+T);c.lineTo(sx+T*.31,Y+T*.8);c.lineTo(sx+T*.2,Y+T*.8);c.closePath();c.fill();}
        c.restore();
        c.fillStyle='#5a4c84';c.fillRect(X+T*.5-.5,fy+3,1,fh*.4);
      }else{ // パネル
        c.strokeStyle='rgba(20,14,36,.8)';c.lineWidth=1;
        c.beginPath();c.moveTo(X+T*.5+.5,fy+2);c.lineTo(X+T*.5+.5,Y+T);c.stroke();
        c.fillStyle='#7a6aa8';[[.18,.2],[.82,.2],[.18,.82],[.82,.82]].forEach(([u,w])=>{c.fillRect(X+T*u-1,fy+fh*w-1,2,2);});
      }
      c.fillStyle='rgba(0,0,0,.45)';c.fillRect(X,Y+T-2,T,2);
    }

    // ── HUD ──
    function updateHud(){
      flEl.innerHTML=`B${floor}F<small>/${FLOORS}</small>`;
      batCells.forEach((el,i)=>el.classList.toggle('on',i<hp));
      batEl.classList.toggle('low',hp<=2);
      insEl.innerHTML=`点検 <b>${floorFaultsDone}/${floorFaults}</b>`;
      mg.setScore(`点検 ${inspected}　追い払い ${banished}`);
      mg.setTimer(`${turn}手`);
    }

    // ── 1ターン ──
    function act(d){
      if(mg._ended||scene==='end')return;
      if(scene==='title'||scene==='talk'){advance();return;}
      if(trans&&!dying){buffered=d;return;} // 階段の途中の入力は覚えておく
      if(busy)return;
      hideIntro();
      if(d>=0){
        player.face=d;
        const nx=player.x+DIRS[d][0],ny=player.y+DIRS[d][1];
        const en=enemyAt(nx,ny);
        if(en){hitEnemy(en,d);}
        else if(isFloor(nx,ny)){
          player.x=nx;player.y=ny;player.walk=1;player.step++;sfx('step');
          const lk=leakAt(nx,ny);
          if(lk&&leakOn(lk)){
            hurt(false);AU.se('noise');sfx('zap');say('⚡ 漏電！ 足元に青い火花が走った。');
            burst(nx+.5,ny+.6,14,'#bfefff',3.2,.07);
          }
          const it=itemAt(nx,ny);
          if(it&&!it.done)pickItem(it);
          if(nx===exit.x&&ny===exit.y){
            computeLight();turn++;updateHud();
            if(floor>=FLOORS){busy=true;clearing=.001;AU.se('rank');say('🚪 最後の扉を抜けた。夜明け前の空気だ。');
              setTimeout(()=>{if(!mg._ended)showEnding('clear');},1400);}
            else{trans={t:0,swapped:false,opened:false};AU.se('decide');sfx('shutter');}
            return;
          }
        }else{computeLight();sfx('turn');return;} // 壁：向きだけ変える（ターンは消費しない）
      }else{
        sfx('wait');AU.se('btn');
        if(Math.random()<.4)say(pick(['息を殺して、耳を澄ます……','懐中電灯の光を、じっと据える。','どこかで配管が鳴った。']));
      }
      endTurn();
    }
    function endTurn(){
      turn++;
      computeLight();
      // 影は照らされ続けると焼ける
      for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];
        if(e.kind==='k'&&cone[idx(e.x,e.y)]){e.hp--;e.hitT=.6;burst(e.x+.5,e.y+.45,5,'#b48cff',1.6,.05);
          if(e.hp<=0)banish(e);else if(e.hp===e.max-1)say('影が光の中で凍りついた。そのまま照らし続ける……');}
      }
      enemyTurn();
      computeLight();
      updateHud();
      if(hp<=0&&!dying)die();
    }
    function pickItem(it){
      const px=it.x+.5,py=it.y+.4;
      if(it.type==='fault'){
        it.done=true;inspected++;floorFaultsDone++;AU.se('repair');sfx('pick');
        say('⚠ 異常箇所を点検した。'+pick(['ボルトの緩みを締め直した。','ベアリングの異音。グリスを差した。','端子台に焦げ跡。応急処置をした。','圧力計の針が震えている。記録した。']));
        floatText(px,py,'点検✓','#44ee88');burst(px,py,10,'#e8b830',2,.05);
        if(floorFaultsDone===floorFaults)setTimeout(()=>{if(!mg._ended&&!trans)say('このフロアの点検は全部終わった。非常口へ。');},900);
      }else if(it.type==='battery'){
        items.splice(items.indexOf(it),1);hp=Math.min(MAX_HP,hp+2);AU.se('ach');
        say('🔋 予備バッテリーを見つけた。明かりが強くなった。');floatText(px,py,'+2','#44ee88');burst(px,py,12,'#44ee88',2.2,.05);
      }else if(it.type==='memo'){
        items.splice(items.indexOf(it),1);memos++;AU.se('notif');
        say('📄 先輩の点検メモだ。'+pick(['「この配管、夜になると鳴る」','「影は、見ている間は動かない」','「漏電箇所は三拍子で止まる」','「B3の奥には一人で行くな」',`「${gs.day}日目の記録：異常なし……のはずだった」`]));
        floatText(px,py,'メモ','#deccf8');
      }
    }
    function hitEnemy(en,d){
      en.hp--;en.hitT=1;AU.se('tool');sfx('hit');hitStop=.07;shake=Math.max(shake,.35);
      burst(en.x+.5,en.y+.45,8,en.kind==='k'?'#b48cff':en.kind==='b'?'#ff7090':'#cfe8ff',2.4,.05);
      if(en.hp<=0){banish(en);}
      else if(en.kind==='b'){
        // ノックバック（壁もすり抜ける）
        const nx=en.x+DIRS[d][0],ny=en.y+DIRS[d][1];
        if(inside(nx,ny)&&!enemyAt(nx,ny)&&!(nx===exit.x&&ny===exit.y)){en.x=nx;en.y=ny;}
        en.stun=2;shake=.5;
        say(`怨霊がよろめいた。（あと${en.hp}）`);
      }else if(en.kind==='k')say('影が揺らいだ。光の中なら、消せる。');
      else say('👻 光にひるんだが、まだそこにいる……');
    }
    function banish(en){
      enemies.splice(enemies.indexOf(en),1);banished++;sfx('banish');hitStop=.12;
      fading.push({x:en.x,y:en.y,rx:en.rx,ry:en.ry,kind:en.kind,hp:0,max:en.max,id:en.id,frozen:false,hitT:1,lunge:0,lx:0,ly:0,fade:1,t:0,sc:1,sy:1});
      const x=en.x+.5,y=en.y+.4;
      if(en.kind==='b'){bossDown=true;AU.se('ach');burst(x,y,40,'#ff9ab0',3.6,.08);burst(x,y,20,'#ffffff',2.6,.06);floatText(x,y-.3,'退散','#ff9ab0');shake=.8;
        say('怨霊は長い悲鳴を残して、光の中へほどけていった。');}
      else{AU.se('ghost');burst(x,y,22,en.kind==='k'?'#9a6cff':'#dff0ff',2.8,.06);floatText(x,y-.2,'退散',en.kind==='k'?'#b48cff':'#cfe8ff');
        say(en.kind==='k'?'影は光に焼かれ、床の染みになって消えた。':'👻 光を当てると、影は霧のように消えた。');}
    }
    function hurt(byGhost){
      hp--;hurtT=1;shake=1;hitStop=.1;sfx('hurt');if(byGhost)met++;
      if(byGhost)AU.se('warn');
      floatText(player.x+.5,player.y+.1,'-1🔋','#ff5070');
      if(hp>0&&hp<=2)flickDip=.6;
    }
    function die(){
      dying=true;busy=true;say('……懐中電灯が消えた。');AU.se('noise');hitStop=.25;
      setTimeout(()=>{if(!mg._ended)showEnding('down');},1700);
    }
    function enemyTurn(){
      bfsFrom(player.x,player.y);
      for(let ei=0;ei<enemies.length;ei++){
        const en=enemies[ei];
        const man=Math.abs(en.x-player.x)+Math.abs(en.y-player.y);
        if(en.kind==='g'){
          if(en.cd>0)en.cd--;
          if(man===1&&en.cd===0){
            hurt(true);en.cd=2;en.lunge=1;en.lx=player.x-en.x;en.ly=player.y-en.y;
            say(pick(['👻 背後で何かが囁いた。バッテリーが減っていく……','👻 冷たい指が首筋を撫でた。','👻 耳元で、名前を呼ばれた。']));
            continue;
          }
          const best=stepOpt(en,(en.cd>0?-1:1));
          const chase=en.cd===0&&bfs[idx(en.x,en.y)]>=0&&bfs[idx(en.x,en.y)]<=5;
          if(best&&(chase?Math.random()<.8:en.cd>0?Math.random()<.6:false)){en.x=best.x;en.y=best.y;
            // 闇から飛びかかる（照らされていないときだけ）
            if(chase&&!cone[idx(en.x,en.y)]&&Math.abs(en.x-player.x)+Math.abs(en.y-player.y)===1&&Math.random()<.25){
              hurt(true);en.cd=2;en.lunge=1;en.lx=player.x-en.x;en.ly=player.y-en.y;say('👻 闇の中から、白い手が伸びてきた！');}}
          else if(Math.random()<.45){const r=randOpt(en);if(r){en.x=r.x;en.y=r.y;}}
        }else if(en.kind==='k'){
          if(cone[idx(en.x,en.y)]){en.frozen=true;continue;}
          en.frozen=false;
          if(man===1){
            hurt(true);en.lunge=1;en.lx=player.x-en.x;en.ly=player.y-en.y;
            say('背中に、ぞっとする重さ。……振り向くと、もういない。');
            // 闇の奥へ逃げる
            let far=null;for(let i=0;i<N;i++){if(bfs[i]>=5&&!litL[i]&&!enemyAt(i%W,(i/W)|0)&&!(i%W===exit.x&&((i/W)|0)===exit.y)){if(!far||Math.random()<.35)far=i;}}
            if(far!==null){en.x=far%W;en.y=(far/W)|0;en.fade=0;}
            continue;
          }
          const best=stepOpt(en,1);if(best){en.x=best.x;en.y=best.y;}
        }else if(en.kind==='b'){
          if(en.stun>0){en.stun--;continue;}
          en.tick^=1;if(en.tick)continue;
          if(man===1){
            hurt(true);en.lunge=1;en.lx=player.x-en.x;en.ly=player.y-en.y;AU.se('ghost');
            say('怨霊の髪が、懐中電灯に絡みついた……！');
            // 少し離れる
            for(let k=0;k<2;k++){const dx=Math.sign(en.x-player.x),dy=Math.sign(en.y-player.y);
              const nx=en.x+(dx||0),ny=en.y+(dx?0:dy||1);if(inside(nx,ny)&&!enemyAt(nx,ny)&&!(nx===exit.x&&ny===exit.y)){en.x=nx;en.y=ny;}}
            en.stun=1;continue;
          }
          const dx=player.x-en.x,dy=player.y-en.y;
          const tries=Math.abs(dx)>=Math.abs(dy)?[[Math.sign(dx),0],[0,Math.sign(dy)]]:[[0,Math.sign(dy)],[Math.sign(dx),0]];
          for(const [mx,my] of tries){if(!mx&&!my)continue;const nx=en.x+mx,ny=en.y+my;
            if(inside(nx,ny)&&!enemyAt(nx,ny)&&!(nx===player.x&&ny===player.y)&&!(nx===exit.x&&ny===exit.y)){en.x=nx;en.y=ny;break;}}
        }
      }
    }
    function canStep(en,nx,ny){return isFloor(nx,ny)&&!enemyAt(nx,ny)&&!(nx===player.x&&ny===player.y)&&!(nx===exit.x&&ny===exit.y);}
    function stepOpt(en,sign){
      let best=null,bv=1e9;
      for(let d=0;d<4;d++){const nx=en.x+DIRS[d][0],ny=en.y+DIRS[d][1];if(!canStep(en,nx,ny))continue;
        const v=bfs[idx(nx,ny)]*sign;if(bfs[idx(nx,ny)]>=0&&v<bv){bv=v;best={x:nx,y:ny};}}
      return best;
    }
    function randOpt(en){
      const o=[];for(let d=0;d<4;d++){const nx=en.x+DIRS[d][0],ny=en.y+DIRS[d][1];if(canStep(en,nx,ny))o.push(d);}
      if(!o.length)return null;const d=o[rnd(o.length)];return {x:en.x+DIRS[d][0],y:en.y+DIRS[d][1]};
    }

    // ── 描画 ──
    function resize(){
      const r=wrap.getBoundingClientRect();
      const t=Math.max(14,Math.floor(Math.min(r.width/W,r.height/H)));
      const nd=Math.min(window.devicePixelRatio||1,2.5);
      if(t===T&&nd===dpr&&cv.width)return;
      T=t;dpr=nd;
      cv.width=Math.round(W*T*dpr);cv.height=Math.round(H*T*dpr);
      cv.style.width=W*T+'px';cv.style.height=H*T+'px';
      buildStatic();
    }
    let ro=null;
    if(window.ResizeObserver){ro=new ResizeObserver(()=>{if(mg._ended){ro.disconnect();return;}resize();});ro.observe(wrap);}
    else window.addEventListener('resize',resize);

    function ghostPath(c,x,y,r,t,taper){
      c.beginPath();
      c.moveTo(x-r,y);
      c.arc(x,y,r,Math.PI,0);
      c.quadraticCurveTo(x+r*1.02,y+r*.7,x+r*taper,y+r*1.05);
      const n=3,w=2*r*taper/n;
      for(let i=0;i<n;i++){
        const x0=x+r*taper-i*w,wob=Math.sin(t*4.2+i*1.9)*r*.16;
        c.quadraticCurveTo(x0-w*.5,y+r*1.5+wob,x0-w,y+r*1.05+Math.sin(t*3+i)*r*.05);
      }
      c.quadraticCurveTo(x-r*1.02,y+r*.7,x-r,y);
      c.closePath();
    }
    function drawGhost(en,t){
      const s=T,bob=Math.sin(t*2.1+en.id*1.7)*s*.05;
      const lo=en.lunge*en.lunge*.35;
      let x=(en.rx+.5+en.lx*lo)*s,y=(en.ry+.38+en.ly*lo)*s+bob;
      const hit=en.hitT>0;
      if(en.kind==='k'&&en.frozen){x+=Math.sin(t*60)*s*.02;}
      const vis=clamp01((lightR[idx(en.x,en.y)]-.12)/.3);
      const a=en.fade*(en.kind==='b'?Math.max(.22,vis):vis);
      if(a<=.01)return;
      // 移動中は進行方向に伸び、被弾でつぶれ、退散で膨らんで消える
      const mvx=Math.min(1,Math.abs(en.x-en.rx)),mvy=Math.min(1,Math.abs(en.y-en.ry));
      let gx=1+mvx*.35-mvy*.12,gy=1+mvy*.35-mvx*.12;
      if(en.hitT>0){gx*=1+en.hitT*.25;gy*=1-en.hitT*.2;}
      if(en.sc){gx*=en.sc;gy*=en.sc*en.sy;}
      ctx.save();ctx.translate(x,y);ctx.scale(gx,gy);ctx.translate(-x,-y);
      ctx.globalAlpha=a;
      if(en.kind==='g'){
        const r=s*.34;
        const g=ctx.createRadialGradient(x,y-r*.2,r*.1,x,y+r*.3,r*1.7);
        g.addColorStop(0,hit?'rgba(255,255,255,.95)':'rgba(232,242,255,.9)');g.addColorStop(.55,'rgba(170,195,255,.55)');g.addColorStop(1,'rgba(120,140,255,0)');
        ctx.fillStyle=g;ghostPath(ctx,x,y,r,t+en.id,.82);ctx.fill();
        ctx.fillStyle='#0b0718';
        ctx.beginPath();ctx.ellipse(x-r*.36,y-r*.05,r*.15,r*.24,0,0,TAU);ctx.ellipse(x+r*.36,y-r*.05,r*.15,r*.24,0,0,TAU);ctx.fill();
        ctx.beginPath();ctx.ellipse(x,y+r*.42,r*.1,r*.15+Math.sin(t*2+en.id)*r*.04,0,0,TAU);ctx.fill();
      }else if(en.kind==='k'){
        const r=s*.32;
        const g=ctx.createRadialGradient(x,y,r*.1,x,y+r*.3,r*1.7);
        g.addColorStop(0,hit?'rgba(120,70,190,.95)':'rgba(16,6,26,.96)');g.addColorStop(.6,'rgba(40,14,64,.8)');g.addColorStop(1,'rgba(60,20,90,0)');
        ctx.fillStyle=g;ghostPath(ctx,x,y,r,t*.7+en.id,1);ctx.fill();
        ctx.strokeStyle='rgba(160,100,240,.45)';ctx.lineWidth=1;ghostPath(ctx,x,y,r,t*.7+en.id,1);ctx.stroke();
        // 長い腕
        ctx.strokeStyle='rgba(20,6,32,.85)';ctx.lineWidth=s*.05;ctx.lineCap='round';
        const reach=en.frozen?.1:.25+Math.sin(t*3+en.id)*.08;
        ctx.beginPath();ctx.moveTo(x-r*.8,y+r*.2);ctx.quadraticCurveTo(x-r*1.2,y+r*.5,x-r*(1.1+reach),y+r*1.1);
        ctx.moveTo(x+r*.8,y+r*.2);ctx.quadraticCurveTo(x+r*1.2,y+r*.5,x+r*(1.1+reach),y+r*1.1);ctx.stroke();
        // 赤い目（凍っているときは細い）
        const eh=en.frozen?r*.06:r*.13;
        ctx.fillStyle='rgba(255,40,72,.35)';ctx.beginPath();ctx.arc(x-r*.34,y-r*.05,r*.24,0,TAU);ctx.arc(x+r*.34,y-r*.05,r*.24,0,TAU);ctx.fill();
        ctx.fillStyle='#ff3050';ctx.beginPath();ctx.ellipse(x-r*.34,y-r*.05,r*.11,eh,-.25,0,TAU);ctx.ellipse(x+r*.34,y-r*.05,r*.11,eh,.25,0,TAU);ctx.fill();
        ctx.fillStyle='#ffe0e6';ctx.beginPath();ctx.arc(x-r*.34,y-r*.05,r*.035,0,TAU);ctx.arc(x+r*.34,y-r*.05,r*.035,0,TAU);ctx.fill();
        // 光で焼けているひび
        if(en.hp<en.max){ctx.strokeStyle='rgba(255,220,255,.7)';ctx.lineWidth=1.2;ctx.beginPath();
          ctx.moveTo(x-r*.5,y-r*.6);ctx.lineTo(x-r*.1,y-r*.1);ctx.lineTo(x-r*.3,y+r*.4);
          if(en.hp<en.max-1){ctx.moveTo(x+r*.5,y-r*.5);ctx.lineTo(x+r*.15,y+r*.05);ctx.lineTo(x+r*.4,y+r*.6);}ctx.stroke();}
      }else{
        const r=s*.46,ph=en.rx!==Math.round(en.rx)||en.ry!==Math.round(en.ry)?0:0;void ph;
        const inWall=!isFloor(en.x,en.y);
        ctx.globalAlpha=a*(inWall?.55:1);
        // 髪
        ctx.strokeStyle='rgba(12,4,16,.9)';ctx.lineWidth=s*.05;ctx.lineCap='round';
        for(let i=0;i<7;i++){const hx=x-r*.8+i*r*.27;ctx.beginPath();ctx.moveTo(hx,y-r*.7);
          ctx.quadraticCurveTo(hx+Math.sin(t*2+i)*r*.35,y+r*.6,hx+Math.sin(t*1.6+i*1.3)*r*.5,y+r*1.5+Math.sin(t*3+i)*r*.1);ctx.stroke();}
        const g=ctx.createRadialGradient(x,y-r*.2,r*.1,x,y+r*.3,r*1.7);
        g.addColorStop(0,hit?'rgba(255,255,255,.95)':'rgba(255,225,232,.88)');g.addColorStop(.5,'rgba(232,60,100,.5)');g.addColorStop(1,'rgba(150,20,60,0)');
        ctx.fillStyle=g;ghostPath(ctx,x,y,r,t*.8,.9);ctx.fill();
        ctx.fillStyle='rgba(12,4,16,.95)';ctx.beginPath();ctx.ellipse(x,y-r*.62,r*.82,r*.42,0,Math.PI,0);ctx.fill();
        ctx.fillStyle='#0b0410';ctx.beginPath();ctx.ellipse(x-r*.3,y,r*.14,r*.2,0,0,TAU);ctx.ellipse(x+r*.3,y,r*.14,r*.2,0,0,TAU);ctx.fill();
        ctx.fillStyle='#ff2848';ctx.beginPath();ctx.arc(x-r*.3,y+r*.04,r*.05,0,TAU);ctx.arc(x+r*.3,y+r*.04,r*.05,0,TAU);ctx.fill();
        ctx.fillStyle='#0b0410';ctx.beginPath();ctx.ellipse(x,y+r*.45,r*.13,r*.2+Math.sin(t*2.4)*r*.06,0,0,TAU);ctx.fill();
        // 体力
        ctx.globalAlpha=a;
        for(let i=0;i<en.max;i++){ctx.fillStyle=i<en.hp?'#ff3860':'rgba(255,56,96,.2)';ctx.fillRect(x-s*.24+i*s*.17,y-r*1.25,s*.13,s*.06);}
      }
      ctx.restore();
      ctx.globalAlpha=1;
    }
    function drawEyesInDark(en,t){
      const i=idx(en.x,en.y);const L=lightR[i];
      if(L>.45)return;
      const d=Math.abs(en.x-player.x)+Math.abs(en.y-player.y);
      if(en.kind==='g'&&d>3)return;
      if(d>6)return;
      const s=T,x=(en.rx+.5)*s,y=(en.ry+.38)*s+Math.sin(t*2.1+en.id*1.7)*s*.05;
      const blink=(Math.sin(t*1.3+en.id*2)>.96)?.1:1;
      const a=(1-L/.45)*(en.kind==='g'?.45:.85)*blink*en.fade;
      const col=en.kind==='g'?'200,230,255':'255,40,72';
      const r=s*(en.kind==='b'?.46:.31),ex=r*(en.kind==='b'?.3:.36);
      ctx.globalCompositeOperation='lighter';
      ctx.fillStyle=`rgba(${col},${a*.25})`;ctx.beginPath();ctx.arc(x-ex,y,s*.09,0,TAU);ctx.arc(x+ex,y,s*.09,0,TAU);ctx.fill();
      ctx.fillStyle=`rgba(${col},${a})`;ctx.beginPath();ctx.ellipse(x-ex,y,s*.035,s*.05*blink+.5,0,0,TAU);ctx.ellipse(x+ex,y,s*.035,s*.05*blink+.5,0,0,TAU);ctx.fill();
      ctx.globalCompositeOperation='source-over';
    }
    function drawPlayer(t){
      const s=T,x=(player.rx+.5)*s,by=(player.ry+.5)*s;
      const f=player.face;
      const bob=player.walk>0?Math.abs(Math.sin(player.walk*Math.PI))*s*.06:0;
      const y=by-bob;
      const flash=hurtT>.4&&Math.sin(t*50)>0;
      ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.ellipse(x,by+s*.33,s*.24,s*.08,0,0,TAU);ctx.fill();
      ctx.save();ctx.translate(x,y);
      if(dying){const k=1-lightMul;ctx.translate(0,s*.3);ctx.rotate(-k*1.4);ctx.translate(0,-s*.3);} // 倒れる
      else{
        if(hurtT>0)ctx.rotate(Math.sin(t*38)*.2*hurtT); // のけぞる
        if(player.walk<=0){const br=1+Math.sin(t*2.6)*.03;ctx.translate(0,s*.3);ctx.scale(1,br);ctx.translate(0,-s*.3);} // 呼吸
      }
      if(f===3)ctx.scale(-1,1);
      const navy=flash?'#ff6080':'#2c3d72',dark='#1b2647';
      // 脚
      ctx.fillStyle=dark;const lg=player.walk>0?Math.sin(player.walk*Math.PI*2)*s*.04:0;
      ctx.fillRect(-s*.13,s*.18+lg,s*.1,s*.13);ctx.fillRect(s*.03,s*.18-lg,s*.1,s*.13);
      // 胴（つなぎ）
      ctx.fillStyle=navy;ctx.beginPath();ctx.roundRect?ctx.roundRect(-s*.19,-s*.04,s*.38,s*.26,s*.07):ctx.rect(-s*.19,-s*.04,s*.38,s*.26);ctx.fill();
      ctx.fillStyle='#c8d84a';ctx.fillRect(-s*.19,s*.1,s*.38,s*.035);
      // 懐中電灯
      if(f!==0){ctx.fillStyle='#d8d0c0';
        if(f===2){ctx.fillRect(s*.12,s*.06,s*.07,s*.14);ctx.fillStyle='#fff3c0';ctx.fillRect(s*.11,s*.19,s*.09,s*.03);}
        else{ctx.fillRect(s*.16,s*.04,s*.15,s*.07);ctx.fillStyle='#fff3c0';ctx.fillRect(s*.3,s*.03,s*.03,s*.09);}}
      // 頭
      const hy=-s*.2;
      ctx.fillStyle='#4a2a78';ctx.beginPath();ctx.arc(0,hy,s*.19,0,TAU);ctx.fill(); // 髪
      if(f===0){ // 後ろ姿：ポニーテール
        ctx.beginPath();ctx.ellipse(s*.02,hy+s*.17,s*.06,s*.11,.2+Math.sin(t*3)*.08,0,TAU);ctx.fill();
      }else{
        ctx.fillStyle='#f3d6c0';ctx.beginPath();
        if(f===2)ctx.ellipse(0,hy+s*.04,s*.15,s*.13,0,0,TAU);else ctx.ellipse(s*.06,hy+s*.04,s*.12,s*.13,0,0,TAU);ctx.fill();
        ctx.fillStyle='#4a2a78';ctx.beginPath();ctx.ellipse(f===2?0:s*.03,hy-s*.06,s*.17,s*.08,0,0,TAU);ctx.fill();
        if(f===2){ctx.fillStyle='#4a2a78';ctx.beginPath();ctx.ellipse(s*.15,hy+s*.12,s*.05,s*.1,-.3,0,TAU);ctx.fill();}
        ctx.strokeStyle='#2a1838';ctx.lineWidth=Math.max(1,s*.025);
        if(f===2){ctx.strokeRect(-s*.11,hy+s*.02,s*.08,s*.055);ctx.strokeRect(s*.03,hy+s*.02,s*.08,s*.055);}
        else{ctx.strokeRect(s*.08,hy+s*.02,s*.08,s*.055);}
      }
      // 帽子
      ctx.fillStyle='#22305e';ctx.beginPath();ctx.ellipse(0,hy-s*.08,s*.19,s*.11,0,Math.PI,0);ctx.fill();
      ctx.fillRect(-s*.19,hy-s*.09,s*.38,s*.04);
      if(f===2){ctx.fillStyle='#1a2448';ctx.fillRect(-s*.15,hy-s*.06,s*.3,s*.05);}
      else if(f!==0){ctx.fillStyle='#1a2448';ctx.fillRect(s*.06,hy-s*.06,s*.2,s*.045);}
      ctx.fillStyle='#e8b830';ctx.fillRect(-s*.03,hy-s*.16,s*.06,s*.04);
      ctx.restore();
    }
    function drawItems(t){
      const s=T;
      for(const it of items){
        if(!seen[idx(it.x,it.y)])continue;
        const X=it.x*s,Y=it.y*s;
        if(it.type==='fault'){
          ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(X+s*.2,Y+s*.78,s*.6,s*.08);
          ctx.fillStyle='#4c566e';ctx.fillRect(X+s*.2,Y+s*.18,s*.6,s*.64);
          ctx.fillStyle='#363e54';ctx.fillRect(X+s*.24,Y+s*.22,s*.52,s*.56);
          ctx.fillStyle='#7d88a6';ctx.fillRect(X+s*.2,Y+s*.18,s*.6,s*.04);
          // 黄色い三角
          ctx.fillStyle=it.done?'#4a5a50':'#e8b830';ctx.beginPath();ctx.moveTo(X+s*.5,Y+s*.28);ctx.lineTo(X+s*.68,Y+s*.58);ctx.lineTo(X+s*.32,Y+s*.58);ctx.closePath();ctx.fill();
          ctx.fillStyle='#16101e';ctx.fillRect(X+s*.485,Y+s*.37,s*.03,s*.12);ctx.fillRect(X+s*.485,Y+s*.515,s*.03,s*.03);
          const on=it.done?1:(Math.sin(t*6+it.ph)>0?1:.25);
          ctx.fillStyle=it.done?'#44ee88':`rgba(255,48,72,${on})`;ctx.beginPath();ctx.arc(X+s*.35,Y+s*.7,s*.045,0,TAU);ctx.arc(X+s*.65,Y+s*.7,s*.045,0,TAU);ctx.fill();
        }else if(it.type==='battery'){
          const b=Math.sin(t*3+it.ph)*s*.04;
          ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(X+s*.5,Y+s*.8,s*.18,s*.05,0,0,TAU);ctx.fill();
          ctx.save();ctx.translate(X+s*.5,Y+s*.5+b);ctx.rotate(-.35);
          ctx.fillStyle='#202a22';ctx.fillRect(-s*.13,-s*.24,s*.26,s*.48);
          ctx.fillStyle='#44ee88';ctx.fillRect(-s*.13,-s*.04,s*.26,s*.28);
          ctx.fillStyle='#b8c0b8';ctx.fillRect(-s*.06,-s*.3,s*.12,s*.07);
          ctx.fillStyle='#0c1a10';ctx.fillRect(-s*.07,s*.08,s*.14,s*.03);ctx.fillRect(-s*.015,s*.025,s*.03,s*.14);
          ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(-s*.1,-s*.22,s*.04,s*.44);
          ctx.restore();
        }else{
          ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(X+s*.26,Y+s*.3,s*.5,s*.56);
          ctx.save();ctx.translate(X+s*.5,Y+s*.52);ctx.rotate(.18);
          ctx.fillStyle='#e8dfc8';ctx.fillRect(-s*.22,-s*.27,s*.44,s*.54);
          ctx.fillStyle='#9a8fb4';for(let i=0;i<4;i++)ctx.fillRect(-s*.15,-s*.13+i*s*.1,s*.3*(i===3?.6:1),Math.max(1,s*.025));
          ctx.fillStyle='#c03040';ctx.fillRect(-s*.03,-s*.31,s*.06,s*.1);
          ctx.restore();
        }
      }
    }
    function drawExit(t){
      const s=T,X=exit.x*s,Y=exit.y*s;
      ctx.fillStyle='#04110c';ctx.fillRect(X+s*.1,Y+s*.06,s*.8,s*.88);
      for(let i=0;i<5;i++){ctx.fillStyle=`rgba(68,238,136,${.32-i*.06})`;ctx.fillRect(X+s*.14,Y+s*(.3+i*.13),s*.72,s*.035);}
      ctx.strokeStyle='#6a7a90';ctx.lineWidth=Math.max(1.5,s*.05);ctx.strokeRect(X+s*.1,Y+s*.06,s*.8,s*.88);
    }
    function drawExitSign(t){
      const s=T,cx=(exit.x+.5)*s,cy=(exit.y+.17)*s;
      const pulse=.85+.15*Math.sin(t*2.2);
      ctx.globalCompositeOperation='lighter';
      const g=ctx.createRadialGradient(cx,cy+s*.3,0,cx,cy+s*.3,s*1.5);
      g.addColorStop(0,`rgba(68,238,136,${.32*pulse})`);g.addColorStop(1,'rgba(68,238,136,0)');
      ctx.fillStyle=g;ctx.fillRect(cx-s*1.5,cy-s*1.2,s*3,s*3);
      ctx.globalCompositeOperation='source-over';
      ctx.fillStyle='#2ad870';ctx.fillRect(cx-s*.3,cy-s*.11,s*.6,s*.22);
      ctx.fillStyle='#eafff2';ctx.fillRect(cx+s*.08,cy-s*.08,s*.17,s*.16);
      ctx.fillStyle='#2ad870';ctx.fillRect(cx+s*.12,cy-s*.05,s*.09,s*.13);
      // 走る人
      ctx.fillStyle='#eafff2';ctx.beginPath();ctx.arc(cx-s*.1,cy-s*.05,s*.03,0,TAU);ctx.fill();
      ctx.strokeStyle='#eafff2';ctx.lineWidth=Math.max(1,s*.03);ctx.lineCap='round';ctx.beginPath();
      ctx.moveTo(cx-s*.12,cy-s*.01);ctx.lineTo(cx-s*.06,cy+s*.04);ctx.lineTo(cx-s*.01,cy+s*.08);
      ctx.moveTo(cx-s*.06,cy+s*.04);ctx.lineTo(cx-s*.13,cy+s*.08);
      ctx.moveTo(cx-s*.2,cy+s*.0);ctx.lineTo(cx-s*.1,cy+s*.01);ctx.lineTo(cx-s*.03,cy-s*.04);ctx.stroke();
    }
    function drawLeaks(t){
      const s=T;
      for(const l of leaks){
        const L=lightD[idx(l.x,l.y)]*losD[idx(l.x,l.y)];
        if(L<.18)continue;
        const a=clamp01((L-.18)*2.2);const X=l.x*s,Y=l.y*s,on=leakOn(l);
        ctx.globalAlpha=a;
        ctx.fillStyle='rgba(60,120,200,.35)';ctx.beginPath();ctx.ellipse(X+s*.5,Y+s*.6,s*.36,s*.2,.2,0,TAU);ctx.fill();
        ctx.strokeStyle='#14101c';ctx.lineWidth=s*.08;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(X+s*.02,Y+s*.3);ctx.bezierCurveTo(X+s*.4,Y+s*.2,X+s*.3,Y+s*.7,X+s*.55,Y+s*.6);ctx.stroke();
        ctx.strokeStyle='#e8b830';ctx.lineWidth=s*.025;ctx.stroke();
        ctx.fillStyle='#d8e8ff';ctx.fillRect(X+s*.52,Y+s*.56,s*.08,s*.08);
        ctx.globalCompositeOperation='lighter';
        if(on){
          const g=ctx.createRadialGradient(X+s*.56,Y+s*.6,0,X+s*.56,Y+s*.6,s*.6);
          g.addColorStop(0,`rgba(140,210,255,${.55*a})`);g.addColorStop(1,'rgba(140,210,255,0)');ctx.fillStyle=g;ctx.fillRect(X-s*.1,Y,s*1.2,s*1.2);
          ctx.strokeStyle=`rgba(225,245,255,${.9*a})`;ctx.lineWidth=Math.max(1,s*.03);
          for(let k=0;k<3;k++){ctx.beginPath();let px=X+s*.56,py=Y+s*.6;ctx.moveTo(px,py);
            const ang=Math.random()*TAU;for(let j=0;j<3;j++){px+=Math.cos(ang+(Math.random()-.5)*1.6)*s*.12;py+=Math.sin(ang+(Math.random()-.5)*1.6)*s*.12;ctx.lineTo(px,py);}ctx.stroke();}
        }else{
          ctx.fillStyle=`rgba(140,210,255,${(.15+.1*Math.sin(t*8))*a})`;ctx.beginPath();ctx.arc(X+s*.56,Y+s*.6,s*.12,0,TAU);ctx.fill();
        }
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      }
    }

    function frame(dt){
      if(hitStop>0){hitStop-=dt;dt*=.08;} // ヒットストップ
      time+=dt;const t=time;
      for(let i=fading.length-1;i>=0;i--){const f=fading[i];f.t+=dt;f.fade=Math.max(0,1-f.t/.7);f.sc=1+f.t*.9;f.sy=1+f.t*.5;f.ry-=dt*.9;f.hitT=Math.max(0,1-f.t*3);if(f.t>=.7)fading.splice(i,1);}
      // 補間
      const k=1-Math.exp(-dt*16);
      player.rx+=(player.x-player.rx)*k;player.ry+=(player.y-player.ry)*k;
      let da=ANG[player.face]-player.ra;da=((da+Math.PI)%TAU+TAU)%TAU-Math.PI;player.ra+=da*(1-Math.exp(-dt*14));
      if(player.walk>0)player.walk=Math.max(0,player.walk-dt*5.5);
      for(const e of enemies){
        const ke=1-Math.exp(-dt*(e.kind==='b'?6:10));
        if(e.fade<1){e.rx=e.x;e.ry=e.y;e.fade=Math.min(1,e.fade+dt*1.2);}
        e.rx+=(e.x-e.rx)*ke;e.ry+=(e.y-e.ry)*ke;
        if(e.hitT>0)e.hitT=Math.max(0,e.hitT-dt*4);
        if(e.lunge>0)e.lunge=Math.max(0,e.lunge-dt*3);
      }
      hurtT=Math.max(0,hurtT-dt*1.4);shake=Math.max(0,shake-dt*3);
      if(flickDip>0)flickDip=Math.max(0,flickDip-dt*2.5);
      if(hp<=2&&!dying&&Math.random()<dt*.8)flickDip=.55;
      if(dying)lightMul=Math.max(0,lightMul-dt*1.1);
      // 押しっぱなしで連続移動
      if(heldDir!==null){holdT+=dt;if(holdT>=nextRep){nextRep+=.17;act(heldDir);}}
      // 遷移
      if(trans){
        trans.t+=dt;
        if(!trans.swapped&&trans.t>=.5){trans.swapped=true;floor++;genFloor();
          say(floor===2?'🚪 階段を下りた。B2F。空気が冷たい。':'🚪 B3F。……奥に、大きな“何か”がいる。');}
        if(!trans.opened&&trans.t>=1.35){trans.opened=true;sfx('shutter');AU.se('machine');}
        if(trans.t>=1.9){trans=null;if(buffered!==null){const b=buffered;buffered=null;act(b);}}
      }
      if(clearing>0)clearing+=dt;
      if(scene==='talk'){const full=talkLines[talkI][1];if(talkPos<full.length){const p0=talkPos|0;talkPos=Math.min(full.length,talkPos+dt*30);
        if((talkPos|0)!==p0){txtEl.textContent=full.slice(0,talkPos|0);if((talkPos|0)%3===0)sfx('turn');}}}

      // 明るさ（連続位置で計算 → 低解像度 → 拡大）
      const flick=(.94+.035*Math.sin(t*13.1)+.025*Math.sin(t*31.7))*(1-flickDip)*lightMul;
      const R=coneR()*(dying?lightMul:1);
      const kl=1-Math.exp(-dt*12);
      const data=lowImg.data;
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        const i=idx(x,y);
        losD[i]+=(losA[i]-losD[i])*kl;
        let L=lightFn(x,y,player.rx,player.ry,player.ra,R)*losD[i]*flick;
        const ed=Math.abs(x-exit.x)+Math.abs(y-exit.y);
        if(ed<=1)L=Math.max(L,ed?.2:.42);
        lightR[i]=L;
        if(seen[i]&&L<.17)L=.17;
        lightD[i]=L;
        const al=1-clamp01(L*1.32);
        const o=i*4;data[o]=5;data[o+1]=4;data[o+2]=14;data[o+3]=al*255;
      }
      lctx.putImageData(lowImg,0,0);

      const s=T,MW=W*s,MH=H*s;
      const sx=shake>0?(Math.random()-.5)*shake*s*.12:0,sy=shake>0?(Math.random()-.5)*shake*s*.12:0;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.fillStyle='#05040e';ctx.fillRect(0,0,MW,MH);
      ctx.setTransform(dpr,0,0,dpr,sx*dpr,sy*dpr);
      ctx.drawImage(mapCv,0,0,MW,MH);
      for(const lp of lamps){const on=Math.sin(t*2.5+lp.ph)>-.2;ctx.fillStyle=on?lp.col:'#2a2a2a';ctx.fillRect(lp.x-s*.04,lp.y-s*.04,s*.08,s*.08);}
      drawExit(t);
      drawItems(t);
      // 奥の行から順に（重なり）
      for(const e of enemies)if(e.kind!=='b'&&e.ry<player.ry)drawGhost(e,t);
      drawPlayer(t);
      for(const e of enemies)if(e.kind!=='b'&&e.ry>=player.ry)drawGhost(e,t);
      for(const f of fading)if(f.kind!=='b')drawGhost(f,t);
      // 懐中電灯のあたたかい光
      ctx.globalCompositeOperation='lighter';
      const px=(player.rx+.5)*s,py=(player.ry+.5)*s;
      const g1=ctx.createRadialGradient(px,py,0,px,py,s*1.8);
      g1.addColorStop(0,`rgba(255,210,140,${.16*flick})`);g1.addColorStop(1,'rgba(255,210,140,0)');
      ctx.fillStyle=g1;ctx.fillRect(px-s*1.8,py-s*1.8,s*3.6,s*3.6);
      if(R>.5){
        const g2=ctx.createRadialGradient(px,py,s*.3,px,py,s*R);
        g2.addColorStop(0,`rgba(255,236,180,${.07*flick})`);g2.addColorStop(1,'rgba(255,236,180,0)');
        ctx.fillStyle=g2;
        for(let k=0;k<3;k++){const w=.22+k*.16;ctx.beginPath();ctx.moveTo(px,py);ctx.arc(px,py,s*R,player.ra-w,player.ra+w);ctx.closePath();ctx.fill();}
      }
      ctx.globalCompositeOperation='source-over';
      // 闇
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(lowCv,0,0,MW,MH);
      for(const e of enemies)if(e.kind==='b')drawGhost(e,t); // 怨霊は闇の上に滲む
      for(const f of fading)if(f.kind==='b')drawGhost(f,t);
      // 漂う靄（視差：主人公と逆向きにゆっくりずれる）
      ctx.globalAlpha=.07;
      for(const f of fogs){
        const span=W+6;let fx=((f.x+time*f.v-player.rx*.35)%span+span)%span-3,fy=f.y-player.ry*.2;
        ctx.drawImage(fogCv,(fx-f.r/2)*s,(fy-f.r/2)*s,f.r*s,f.r*s);
      }
      ctx.globalAlpha=1;
      drawExitSign(t);
      drawLeaks(t);
      for(const e of enemies)drawEyesInDark(e,t);
      // 光の中の埃
      ctx.fillStyle='#fff4d8';
      for(const m of motes){
        m.x+=m.vx*dt;m.y+=m.vy*dt;m.p+=dt;
        if(m.x<0)m.x+=W;if(m.x>=W)m.x-=W;if(m.y<0)m.y+=H;if(m.y>=H)m.y-=H;
        const L=lightD[idx(m.x|0,m.y|0)];if(L<.35)continue;
        ctx.globalAlpha=(L-.35)*.7*(.5+.5*Math.sin(m.p*2));ctx.fillRect(m.x*s,m.y*s,1.5,1.5);
      }
      ctx.globalAlpha=1;
      // 粒子
      ctx.globalCompositeOperation='lighter';
      for(const p of parts){if(p.l<=0)continue;p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy=p.vy*.94-dt*.4;
        ctx.globalAlpha=clamp01(p.l/p.m);ctx.fillStyle=p.c;const z=p.s*s;ctx.fillRect(p.x*s-z/2,p.y*s-z/2,z,z);}
      ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${Math.round(s*.34)}px "DotGothic16", monospace`;
      for(const f of texts){if(f.l<=0)continue;f.l-=dt;f.y-=dt*.7;ctx.globalAlpha=clamp01(f.l*1.6);
        ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillText(f.t,f.x*s+1,f.y*s+1);ctx.fillStyle=f.c;ctx.fillText(f.t,f.x*s,f.y*s);}
      ctx.globalAlpha=1;
      // 枠の暗がり・被弾の赤
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const vg=ctx.createRadialGradient(MW/2,MH/2,Math.min(MW,MH)*.35,MW/2,MH/2,Math.max(MW,MH)*.72);
      vg.addColorStop(0,'rgba(5,4,14,0)');vg.addColorStop(1,'rgba(5,4,14,.75)');ctx.fillStyle=vg;ctx.fillRect(0,0,MW,MH);
      const red=Math.max(hurtT*.6,hp===1&&!dying?.18+.1*Math.sin(t*4):0);
      if(red>0){const rg=ctx.createRadialGradient(MW/2,MH/2,Math.min(MW,MH)*.25,MW/2,MH/2,Math.max(MW,MH)*.7);
        rg.addColorStop(0,'rgba(232,48,85,0)');rg.addColorStop(1,`rgba(232,48,85,${red})`);ctx.fillStyle=rg;ctx.fillRect(0,0,MW,MH);}
      if(hurtT>.75){ctx.fillStyle=`rgba(255,60,90,${(hurtT-.75)*.6})`;ctx.fillRect(0,0,MW,MH);}
      // フロア遷移・クリア
      let ov=0,label='',sub='';
      if(trans){
        const tt=trans.t,eo=v=>1-Math.pow(1-v,3);
        const h=tt<.5?eo(tt/.5):tt<1.35?1:1-eo(Math.min(1,(tt-1.35)/.55));
        const ta=clamp01(Math.min((tt-.35)/.25,(1.4-tt)/.2));
        const n=trans.swapped?floor:floor+1;
        drawShutter(h*MH,MW,MH,s,`B${n}F`,n===3?'最下層　立入注意':'下の階へ',ta);
      }
      if(clearing>0){ov=Math.min(1,clearing/.7);label='巡回完了';sub='おつかれさま';}
      if(ov>0){
        ctx.fillStyle=`rgba(3,2,8,${ov})`;ctx.fillRect(0,0,MW,MH);
        const ta=trans?clamp01(Math.min((trans.t-.2)/.3,(1.6-trans.t)/.3)):clamp01((clearing-.3)/.4);
        if(ta>0){ctx.globalAlpha=ta;ctx.font=`${Math.round(s*1.1)}px "DotGothic16", monospace`;
          ctx.shadowColor=clearing>0?'#44ee88':'#00e8c8';ctx.shadowBlur=s*.5;ctx.fillStyle=clearing>0?'#c8ffe0':'#bffff4';ctx.fillText(label,MW/2,MH/2-s*.2);ctx.shadowBlur=0;
          ctx.font=`${Math.round(s*.36)}px "DotGothic16", monospace`;ctx.fillStyle='#bbaedd';ctx.fillText(sub,MW/2,MH/2+s*.7);
          ctx.fillStyle='rgba(0,232,200,.5)';ctx.fillRect(MW/2-s*1.6,MH/2+s*.35,s*3.2,1);ctx.globalAlpha=1;}
      }
    }

    // 階段のシャッター（金属の板が下りてきて、階数が描いてある）
    function drawShutter(h,MW,MH,s,label,sub,ta){
      if(h<=1)return;
      ctx.save();ctx.beginPath();ctx.rect(0,0,MW,h);ctx.clip();
      const sl=Math.max(8,Math.round(s*.34)),bh=s*.3,by=h-bh;
      for(let y=by;y>-sl;y-=sl){
        ctx.fillStyle='#3d3656';ctx.fillRect(0,y-sl,MW,sl);
        ctx.fillStyle='#625a84';ctx.fillRect(0,y-sl,MW,Math.max(1,sl*.2));
        ctx.fillStyle='#2a2440';ctx.fillRect(0,y-sl*.32,MW,sl*.32);
        ctx.fillStyle='#120e1c';ctx.fillRect(0,y-1,MW,1);
      }
      const sg=ctx.createLinearGradient(0,0,MW,0);sg.addColorStop(0,'rgba(5,4,14,.55)');sg.addColorStop(.5,'rgba(5,4,14,0)');sg.addColorStop(1,'rgba(5,4,14,.55)');
      ctx.fillStyle=sg;ctx.fillRect(0,0,MW,h);
      ctx.fillStyle='#d4a82a';ctx.fillRect(0,by,MW,bh);
      ctx.fillStyle='#16101e';
      for(let x=-s;x<MW+s;x+=s*.5){ctx.beginPath();ctx.moveTo(x,by+bh);ctx.lineTo(x+s*.2,by+bh);ctx.lineTo(x+s*.4,by);ctx.lineTo(x+s*.2,by);ctx.closePath();ctx.fill();}
      ctx.fillStyle='#9a96b0';ctx.fillRect(MW/2-s*.45,by-s*.13,s*.9,s*.09);
      if(ta>0){
        ctx.globalAlpha=ta;ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.font=`${Math.round(s*1.25)}px "DotGothic16", monospace`;
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillText(label,MW/2+3,MH/2-s*.3+3);
        ctx.fillStyle='#e8b830';ctx.fillText(label,MW/2,MH/2-s*.3);
        ctx.font=`${Math.round(s*.36)}px "DotGothic16", monospace`;ctx.fillStyle='#f0e6ff';ctx.fillText(sub,MW/2,MH/2+s*.65);
        ctx.globalAlpha=1;
      }
      ctx.restore();
    }

    // ── 評価とエンディング ──
    function computeGrade(reason){
      const clear=reason==='clear';
      const score=inspected*100+(clear?500:0)+(bossDown?300:0)+Math.max(0,hp)*40+banished*20+floor*50;
      let g='C';
      if(clear&&inspected>=totalFaults&&bossDown&&hp>=3)g='S';
      else if(clear&&inspected>=totalFaults-1)g='A';
      else if(clear||(floor>=3&&inspected>=5))g='B';
      return {g,score};
    }
    function showEnding(reason){
      if(scene==='end'||mg._ended)return;
      endReason=reason;scene='end';busy=true;heldDir=null;sceneTok++;
      hideIntro();scene='end';
      gradeInfo=computeGrade(reason);
      const clear=reason==='clear',g=gradeInfo.g;
      const isNew=gradeInfo.g!=='C'&&gradeInfo.score>(REC.bestScore||0);
      let face,lines;
      if(clear&&(g==='S'||g==='A')){face='win';lines=['点検、全部終わり。夜明けの光が配管に反射してる。','手当で今月の返済、少し楽になる。……さあ、迎えに行こう。'];}
      else if(clear){face='happy';lines=['なんとか朝まで持った。見落としは、明日の俺に任せる。','眠い。でも、あの子の顔を見たら起きていられる。'];}
      else{face='collapse';lines=['気がつくと、守衛室のソファにいた。懐中電灯は空っぽだった。','……朝、ちゃんと笑えるかな。あの子の前では。'];}
      if(bossDown)lines.push('あの怨霊……誰かを待ってたのかもな。今夜の配信で、話してみよう。');
      const col={S:'#e8b830',A:'#00e8c8',B:'#b48cff',C:'#e83055'}[g];
      endEl.innerHTML=`<div class="rg-gl">PATROL RESULT</div><div class="rg-grade" id="rg-grade" style="color:${col}">${g}</div>
        <div class="rg-etitle">${clear?'巡回完了':'巡回失敗'}${LAP>1?`<small style="font-size:.6rem;color:var(--tx-d)">　${LAP}周目</small>`:''}</div>
        <div class="rg-stats"><span>点検 <b>${inspected}/${totalFaults}</b></span><span>退散 <b>${banished}</b></span><span>到達 <b>B${floor}F</b></span><span><b>${turn}</b>手</span></div>
        ${isNew?'<div class="rg-new">★ 自己ベスト更新</div>':''}
        <div class="rg-box"><div class="rg-face" style="background-image:url(${FACE}${face}.webp)"></div><div class="rg-say"><div class="rg-name">だんのうら</div><div class="rg-txt">${lines.map(l=>'「'+l+'」').join('<br>')}</div></div></div>
        <button class="rg-go" id="rg-go">結果へ ▶</button>`;
      endEl.classList.remove('hide');
      endEl.querySelector('#rg-go').addEventListener('click',finishEnd);
      setTimer(()=>{endEl.querySelector('#rg-grade').classList.add('in');endEl.classList.add('show');},250);
      setTimer(()=>{sfx('stamp');AU.se(clear?'ach':'ghost');},450);
    }
    function finishEnd(){if(scene!=='end'||mg._ended)return;AU.se('decide');mg.end(endReason);}

    genFloor();
    resize();
    mg.loop(frame);
    return {result(reason){
      if(ro)ro.disconnect();else window.removeEventListener('resize',resize);
      const R=endReason||reason;
      const clear=R==='clear', down=R==='down';
      // 記録
      REC.plays=(REC.plays||0)+1;
      if(clear)REC.clears=(REC.clears||0)+1;
      if(bossDown)REC.bossDowns=(REC.bossDowns||0)+1;
      const gi=gradeInfo||(R!=='quit'?computeGrade(R):null);
      if(gi&&gi.score>(REC.bestScore||0)){REC.bestScore=gi.score;REC.bestGrade=gi.g;}
      const fx={
        jobRep:inspected*3+(clear?5:0),
        certKnow:memos*4+(clear?2:0),
        money:inspected*1500+(clear?3000:0),
        mental:clear?4:down?-8:0,
        hope:bossDown?2:0,
        fatigue:10,
      };
      const gotNeta=met+banished>=2;
      return {
        title:clear?'🔦 巡回完了':down?'🌑 闇に飲まれた':'🔦 巡回を切り上げた',
        summary:(gi?`評価 <span class="up">${gi.g}</span>　`:'')+`到達 <span class="up">B${floor}F</span>　点検 <span class="up">${inspected}</span>　追い払い <span class="up">${banished}</span>`+
          (bossDown?'<br>👁 B3Fの怨霊を鎮めた':'')+
          (gotNeta?'<br>📝 怪談ネタを手に入れた':''),
        fx, time:90, sp:clear?2:inspected>0?1:0,
        after(){if(gotNeta){gs.factoryNetaAvail=true;gs.factoryNetaType=bossDown?'地下の怨霊':'深夜巡回の怪異';}},
        log:clear?(bossDown?'深夜の工場を最後まで巡回した。地下の怨霊を鎮めた。':'深夜の工場を最後まで巡回した。'):'深夜の工場を巡回した。何かがいた気がする。',
        cutin:down?['fear','……今の、なに？']:clear&&bossDown?['win','……成仏、してくれたかな。']:null,
      };
    }};
  },
});
