// ══════════════════════════════════════════════════════════
// 3Dレース「原付で夜勤へ」
// 配信を延長しすぎた夜。雨の町を原付で抜けて、22:00の夜勤打刻に間に合わせる。
// 住宅街 → 商店街 → 工業道路 の約2.2km。three.js（vendor/three.min.js）で描画。
// 道路・建物・街灯などは「チャンク」単位のリングバッファ/インスタンス窓で使い回す。
// ══════════════════════════════════════════════════════════
addMinigameStyle('race',`
.mg-race{background:#05040e;}
.mg-race .race-wrap{position:absolute;inset:0;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;background:#05040e;}
.mg-race .race-wrap canvas{position:absolute;left:0;top:0;display:block;}
.race-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 90% 80% at 50% 50%,rgba(5,4,14,0) 58%,rgba(5,4,14,.72) 100%);}
.race-flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:#fff;}
.race-hit{position:absolute;inset:0;pointer-events:none;opacity:0;box-shadow:inset 0 0 70px 20px rgba(232,48,85,.85);}
.race-hud{position:absolute;inset:0;pointer-events:none;color:var(--tx-b);font-family:var(--mono);transition:opacity .4s;}
.race-hud.off{opacity:0;}
.race-gauge{position:absolute;left:8px;top:8px;width:86px;height:86px;}
.race-gauge .ring{position:absolute;inset:0;border-radius:50%;background:conic-gradient(from 225deg,#00e8c8 0deg,#e8b830 calc(var(--p,0)*200deg),#e83055 calc(var(--p,0)*270deg),rgba(255,255,255,.07) 0 270deg,transparent 0);-webkit-mask:radial-gradient(circle,transparent 60%,#000 62%,#000 70%,transparent 72%);mask:radial-gradient(circle,transparent 60%,#000 62%,#000 70%,transparent 72%);filter:drop-shadow(0 0 4px rgba(0,232,200,.6));}
.race-gauge .bg{position:absolute;inset:6px;border-radius:50%;background:radial-gradient(circle,rgba(10,7,22,.78) 60%,rgba(10,7,22,0) 72%);}
.race-gauge b{position:absolute;left:0;right:0;top:24px;text-align:center;font-weight:normal;font-size:28px;line-height:1;color:#eafffb;text-shadow:0 0 10px rgba(0,232,200,.85);}
.race-gauge small{position:absolute;left:0;right:0;top:54px;text-align:center;font-size:9px;color:var(--cy);letter-spacing:.1em;}
.race-tm{position:absolute;right:10px;top:6px;text-align:right;}
.race-tm small{display:block;font-family:var(--dot);font-size:10px;color:var(--tx);letter-spacing:.12em;}
.race-tm b{display:block;font-size:31px;font-weight:normal;color:var(--gd);text-shadow:0 0 10px rgba(232,184,48,.65);line-height:1.05;}
.race-tm em{display:block;font-style:normal;font-size:10px;color:var(--tx-d);}
.race-tm.hurry b{color:#ff5070;text-shadow:0 0 12px rgba(232,48,85,.9);animation:racePulse .45s ease-in-out infinite alternate;}
.race-tm.late b{color:var(--rd);text-shadow:0 0 12px rgba(232,48,85,.9);}
.race-tm.late small{color:var(--rd);}
@keyframes racePulse{to{opacity:.5;}}
.race-prog{position:absolute;left:100px;right:96px;top:62px;height:16px;}
.race-prog .tr{position:absolute;left:0;right:0;top:7px;height:3px;background:rgba(187,174,221,.2);border-radius:2px;}
.race-prog .fl{position:absolute;left:0;top:7px;height:3px;width:0;background:linear-gradient(90deg,var(--pu),var(--cy));border-radius:2px;box-shadow:0 0 6px rgba(0,232,200,.6);}
.race-prog .mk{position:absolute;top:3px;width:2px;height:11px;margin-left:-1px;border-radius:1px;}
.race-prog .mk.cp{background:var(--cy);box-shadow:0 0 5px var(--cy);}
.race-prog .mk.sg{background:var(--rd);height:7px;top:5px;}
.race-prog .zn{position:absolute;top:-9px;font-family:var(--dot);font-size:8px;color:var(--tx-d);transform:translateX(-50%);white-space:nowrap;}
.race-prog .me{position:absolute;top:-2px;margin-left:-8px;font-size:13px;line-height:1;transform:scaleX(-1);}
.race-prog .gl{position:absolute;right:-8px;top:-1px;font-size:12px;line-height:1;}
.race-dmg{position:absolute;right:10px;top:84px;font-size:10px;color:var(--tx);display:flex;align-items:center;gap:5px;font-family:var(--dot);}
.race-dmg .bar{width:58px;height:5px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;}
.race-dmg .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--gd),var(--rd));transition:width .25s;}
.race-dmg .cr{font-family:var(--mono);letter-spacing:2px;color:var(--rd);}
.race-dmg .cr u{text-decoration:none;color:rgba(187,174,221,.25);}
.race-nav{position:absolute;left:50%;top:6px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:0;font-family:var(--dot);font-size:10px;color:var(--tx);text-shadow:0 1px 2px #000;}
.race-nav i{font-style:normal;font-size:24px;line-height:1;color:var(--gd);text-shadow:0 0 10px rgba(232,184,48,.9);display:block;transition:transform .15s linear;}
.race-curve{position:absolute;left:50%;top:132px;transform:translateX(-50%);font-family:var(--mono);font-size:20px;letter-spacing:-2px;color:var(--gd);text-shadow:0 0 8px rgba(232,184,48,.9);opacity:0;transition:opacity .25s;white-space:nowrap;}
.race-curve.on{opacity:1;animation:racePulse .4s ease-in-out infinite alternate;}
.race-curve small{font-family:var(--dot);font-size:11px;letter-spacing:.05em;margin:0 5px;}
.race-sig{position:absolute;left:50%;top:98px;transform:translateX(-50%);display:none;align-items:center;gap:7px;padding:4px 9px;background:rgba(10,7,22,.8);border:1px solid rgba(138,82,212,.45);border-radius:4px;font-size:11px;font-family:var(--dot);white-space:nowrap;}
.race-sig.on{display:flex;}
.race-sig .lt{display:flex;gap:3px;padding:3px 4px;background:#0c0c10;border-radius:3px;}
.race-sig .lt i{width:9px;height:9px;border-radius:50%;background:#26262e;}
.race-sig .lt i.g.on{background:#3dffb0;box-shadow:0 0 6px #3dffb0;}
.race-sig .lt i.y.on{background:#ffc030;box-shadow:0 0 6px #ffc030;}
.race-sig .lt i.r.on{background:#ff3050;box-shadow:0 0 8px #ff3050;}
.race-sig.red{border-color:var(--rd);color:#ff8ea0;animation:racePulse .35s ease-in-out infinite alternate;}
.race-msgs{position:absolute;left:0;right:0;top:31%;display:flex;flex-direction:column;align-items:center;gap:4px;}
.race-m{font-family:var(--dot);font-size:22px;letter-spacing:.08em;color:#fff;text-shadow:0 0 10px currentColor,0 2px 0 #000;animation:raceMsg 1.4s ease-out forwards;white-space:nowrap;}
.race-m.cy{color:#7ffff0;}.race-m.rd{color:#ff6080;}.race-m.gd{color:#ffd860;}.race-m.gn{color:#80ffb0;}.race-m.sm{font-size:15px;}
@keyframes raceMsg{0%{transform:scale(1.7);opacity:0;}12%{transform:scale(1);opacity:1;}75%{opacity:1;}100%{transform:translateY(-14px);opacity:0;}}
.race-hint{position:absolute;bottom:34px;font-size:20px;color:rgba(222,204,248,.22);font-family:var(--mono);transition:color .1s;}
.race-hint.l{left:20px;}.race-hint.r{right:20px;}
.race-hint.on{color:rgba(0,232,200,.75);text-shadow:0 0 10px rgba(0,232,200,.8);}
.race-brake{position:absolute;left:50%;bottom:14px;width:76px;height:76px;margin-left:-38px;border-radius:50%;border:2px solid rgba(232,48,85,.75);background:radial-gradient(circle at 50% 40%,rgba(232,48,85,.38),rgba(50,8,22,.7));color:#ffd0d8;font-family:var(--dot);font-size:12px;letter-spacing:.05em;pointer-events:auto;touch-action:none;-webkit-tap-highlight-color:transparent;box-shadow:0 0 14px rgba(232,48,85,.35);display:none;}
.race-brake.show{display:block;}
.race-brake.on{background:rgba(232,48,85,.8);color:#fff;transform:scale(.93);box-shadow:0 0 24px rgba(232,48,85,.8);}
.race-ov{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;pointer-events:none;}
.race-ov.dim{background:rgba(5,4,14,.88);pointer-events:auto;}
.race-load{font-family:var(--dot);color:var(--tx);font-size:14px;letter-spacing:.2em;animation:racePulse .7s ease-in-out infinite alternate;}
.race-err{font-family:var(--dot);color:var(--tx);font-size:13px;line-height:1.9;padding:0 20px;}
.race-err button{margin-top:10px;font-family:var(--dot);background:rgba(138,82,212,.2);border:1px solid var(--pu);color:var(--tx-b);padding:7px 22px;border-radius:3px;cursor:pointer;}
.race-cd{font-family:var(--mono);font-size:86px;line-height:1;color:#fff;text-shadow:0 0 26px var(--cy),0 0 6px #fff;animation:raceCd .9s ease-out forwards;}
.race-cd.go{color:#7fffd8;font-size:72px;}
.race-cd.rdy{font-family:var(--dot);font-size:30px;letter-spacing:.2em;animation:none;color:var(--tx-b);text-shadow:0 0 14px var(--pu);}
@keyframes raceCd{0%{transform:scale(2.2);opacity:0;}20%{transform:scale(1);opacity:1;}100%{transform:scale(.85);opacity:.15;}}
.race-how{background:rgba(10,7,22,.86);border:1px solid rgba(138,82,212,.55);border-radius:6px;padding:9px 14px;font-family:var(--dot);font-size:11.5px;line-height:1.85;color:var(--tx);text-align:left;max-width:310px;box-shadow:0 0 22px rgba(138,82,212,.25);}
.race-how b{color:var(--cy);font-weight:normal;}
.race-how .rd{color:#ff7c94;}
.race-title{display:flex;flex-direction:column;align-items:center;gap:6px;}
.race-logo{font-family:var(--dot);font-size:40px;line-height:1.1;color:#fff;letter-spacing:.06em;text-shadow:0 0 6px #fff,0 0 18px var(--cy),0 0 36px var(--pu);transform:skewX(-8deg);animation:raceLogo 1.1s cubic-bezier(.2,1.4,.4,1) both;}
.race-logo span{color:#ffd860;text-shadow:0 0 6px #fff,0 0 18px var(--gd),0 0 36px var(--rd);}
.race-sub{font-family:var(--mono);font-size:12px;letter-spacing:.55em;color:var(--cy);margin-left:.55em;animation:raceFadeIn .8s .5s both;}
.race-var{margin-top:10px;font-family:var(--dot);font-size:12px;color:var(--tx);border:1px solid rgba(232,184,48,.45);padding:3px 12px;border-radius:3px;background:rgba(10,7,22,.7);animation:raceFadeIn .8s .8s both;}
.race-best{font-family:var(--mono);font-size:11px;color:var(--tx-d);animation:raceFadeIn .8s .9s both;}
.race-tap{margin-top:22px;font-family:var(--dot);font-size:13px;color:var(--tx-b);letter-spacing:.2em;animation:racePulse .8s ease-in-out infinite alternate;}
@keyframes raceLogo{0%{transform:skewX(-8deg) translateX(-120%);opacity:0;filter:blur(6px);}100%{transform:skewX(-8deg);opacity:1;filter:none;}}
@keyframes raceFadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.race-tbar{position:absolute;left:0;right:0;height:13%;background:#000;transition:transform .6s ease;pointer-events:none;}
.race-tbar.t{top:0;transform:translateY(-100%);}.race-tbar.b{bottom:0;transform:translateY(100%);}
.race-tbar.on{transform:none;}
.race-fade{position:absolute;inset:0;background:#05040e;opacity:0;pointer-events:none;transition:opacity .45s;}
.race-fade.on{opacity:1;}
.race-wipe{display:none;position:absolute;top:-10%;bottom:-10%;width:160%;left:-170%;pointer-events:none;background:repeating-linear-gradient(100deg,rgba(0,232,200,.95) 0 14px,rgba(138,82,212,.95) 14px 30px,#05040e 30px 70px);transform:skewX(-18deg);}
.race-wipe.go{display:block;animation:raceWipe .75s cubic-bezier(.6,0,.4,1) forwards;}
@keyframes raceWipe{from{left:-170%;}to{left:120%;}}
.race-dlg{position:absolute;left:8px;right:8px;bottom:12px;display:flex;gap:10px;align-items:flex-start;background:var(--panel);border:1px solid var(--pu);border-radius:5px;padding:9px 10px 12px;box-shadow:0 0 24px rgba(138,82,212,.35);pointer-events:auto;cursor:pointer;animation:raceFadeIn .35s both;}
.race-dlg img{width:68px;height:68px;border-radius:4px;border:1px solid rgba(0,232,200,.5);object-fit:cover;flex-shrink:0;background:#120c24;}
.race-dlg .tx{flex:1;min-width:0;}
.race-dlg .nm{font-family:var(--dot);font-size:10px;color:var(--cy);letter-spacing:.15em;margin-bottom:3px;}
.race-dlg .ln{font-family:var(--dot);font-size:13px;line-height:1.75;color:var(--tx-b);min-height:3.4em;}
.race-dlg .nx{position:absolute;right:10px;bottom:4px;font-size:10px;color:var(--cy);animation:racePulse .6s ease-in-out infinite alternate;}
.race-dlg.nar img{display:none;}
.race-dlg.nar .ln{color:var(--tx);}
.race-grade{position:absolute;left:0;right:0;top:15%;display:flex;flex-direction:column;align-items:center;gap:4px;pointer-events:none;}
.race-grade b{font-family:var(--mono);font-size:84px;line-height:1;font-weight:normal;animation:raceCd 1.2s ease-out forwards;animation-name:raceGrade;}
@keyframes raceGrade{0%{transform:scale(3) rotate(-12deg);opacity:0;}30%{transform:scale(1) rotate(0);opacity:1;}100%{transform:scale(1);opacity:1;}}
.race-grade small{font-family:var(--dot);font-size:12px;color:var(--tx);letter-spacing:.2em;}
.race-grade em{font-style:normal;font-family:var(--mono);font-size:13px;color:var(--tx-b);background:rgba(10,7,22,.75);padding:3px 10px;border-radius:3px;}
.race-grade.S b{color:#ffe070;text-shadow:0 0 22px #e8b830,0 0 4px #fff;}
.race-grade.A b{color:#7ffff0;text-shadow:0 0 22px #00e8c8;}
.race-grade.B b{color:#c8a8ff;text-shadow:0 0 22px #8a52d4;}
.race-grade.C b{color:#ff8ea0;text-shadow:0 0 22px #e83055;}
`);

registerMinigame({
  id:'race', icon:'🛵', name:'原付で夜勤へ', genre:'3Dレース', bgm:'factory',
  desc:'配信を延長しすぎた。雨の住宅街・商店街・工業道路を原付で抜けて、22:00の夜勤打刻に間に合わせる本格3Dレース。',
  effect:'仕事評価↑ 精神↑ ／ 疲労+6 約30分',
  help:'←→/画面左右長押しで操作・↓/ブレーキ',
  start(body,mg){
    // ══ 定数 ══
    const W=3.8, SW=3.2, CURB=.15, GOAL=2200, LT=2640, OFF=110;
    const VMAX=30, KMH=2.1;
    const RCH=20, NCH=16, RROWS=11, RV=10;           // 道路チャンク：20m×16個のリングバッファ
    const TAU=Math.PI*2;
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;
    const rnd=(a,b)=>a+Math.random()*(b-a);
    let seed=20261003;
    const rr=(a=0,b=1)=>{seed=(seed*16807)%2147483647;return a+(seed-1)/2147483646*(b-a);};
    const se=t=>{try{if(typeof AU!=='undefined')AU.se(t);}catch(e){}};
    const fmtT=t=>{const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(1);};

    // ── 永続データと今夜のバリエーション ──
    const RD=(()=>{try{if(!gs.raceData||typeof gs.raceData!=='object')gs.raceData={};}catch(e){return {};}return gs.raceData;})();
    RD.best=typeof RD.best==='number'?RD.best:null;RD.plays=RD.plays|0;RD.ontime=RD.ontime|0;
    const VARS={
      normal:{key:'normal',name:'小雨の夜',rain:1,fogN:24,fogF:215,pud:1,traffic:1,thunder:32,sig2:.6,tadd:0,line:'工場まで2.2キロ。信号は守る。でも、全開でいくわよ。'},
      storm:{key:'storm',name:'ゲリラ豪雨',rain:1.9,fogN:16,fogF:170,pud:1.7,traffic:.9,thunder:9,sig2:.6,tadd:3,line:'今夜は土砂降り……水たまりで滑らないようにしないと。'},
      fog:{key:'fog',name:'濃霧注意報',rain:.55,fogN:8,fogF:118,pud:.8,traffic:1,thunder:999,sig2:.6,tadd:2,line:'霧で先が見えない。対向車のライトだけが頼りね。'},
      rush:{key:'rush',name:'深夜の配送ラッシュ',rain:1,fogN:24,fogF:215,pud:1,traffic:1.7,thunder:30,sig2:1,tadd:2,line:'トラックが多い時間帯……追い越しは慎重に。'},
    };
    let VAR=VARS.normal;
    if(RD.ontime>0){const ks=['normal','storm','fog','rush'].filter(k=>k!==RD.lastVar);VAR=VARS[ks[Math.floor(Math.random()*ks.length)]];}
    const START_T=36+VAR.tadd;
    const SIGS=[{s:900,use:true},{s:1660,use:Math.random()<VAR.sig2}];
    SIGS.forEach(g=>{g.state='green';g.t=0;g.red=0;g.wait=0;g.trig=false;g.ran=false;g.spawnT=0;g.stop=g.s-6.5;});
    const CPS=[{s:540,add:26,done:false},{s:1200,add:22,done:false},{s:1770,add:16,done:false}];
    const SHOP0=1040, SHOP1=1320, IND0=1790;
    const zoneAt=s=>s>=SHOP0&&s<SHOP1?'shop':s>=IND0?'ind':'town';
    const intOverlap=(a,b,pad)=>SIGS.some(g=>b>g.s-6-pad&&a<g.s+14+pad);
    const inCross=s=>SIGS.some(g=>s>=g.s-1&&s<=g.s+9);

    // ══ コース（曲率→方位→座標を1m刻みで前計算） ══
    const SECT=[[180,420,1/190],[580,800,-1/170],[1340,1460,1/150],[1460,1580,-1/150],[1800,2030,1/260]];
    const NS=OFF+LT+2;
    const KR=new Float32Array(NS), K=new Float32Array(NS), TH=new Float64Array(NS), TX=new Float64Array(NS), TZ=new Float64Array(NS);
    for(let i=0;i<NS;i++){const s=i-OFF;for(const [a,b,k] of SECT)if(s>=a&&s<b)KR[i]=k;}
    for(let i=0;i<NS;i++){let sum=0,n=0;for(let j=i-22;j<=i+22;j++)if(j>=0&&j<NS){sum+=KR[j];n++;}K[i]=sum/n;}
    for(let i=OFF+1;i<NS;i++){TH[i]=TH[i-1]+K[i-1];const m=(TH[i]+TH[i-1])/2;TX[i]=TX[i-1]+Math.sin(m);TZ[i]=TZ[i-1]-Math.cos(m);}
    for(let i=OFF-1;i>=0;i--){TH[i]=TH[i+1]-K[i];const m=(TH[i]+TH[i+1])/2;TX[i]=TX[i+1]-Math.sin(m);TZ[i]=TZ[i+1]+Math.cos(m);}
    const fidx=s=>{let f=s+OFF;return f<0?0:f>NS-2.001?NS-2.001:f;};
    // 前方 = (sin h, 0, -cos h)、右 = (cos h, 0, sin h)
    function trackAt(s,d,o){
      const f=fidx(s),i=f|0,t=f-i;
      const h=TH[i]+(TH[i+1]-TH[i])*t;
      o.x=TX[i]+(TX[i+1]-TX[i])*t+Math.cos(h)*d;
      o.z=TZ[i]+(TZ[i+1]-TZ[i])*t+Math.sin(h)*d;
      o.h=h;return o;
    }
    const curvAt=s=>K[fidx(s)|0];

    // ══ プレイヤー/進行状態 ══
    const P={s:18,d:-1.8,v:0,latV:0,drift:0,steer:0,slip:0,slipDir:1,inv:0,dmg:0,crashes:0,reds:0,curbCd:0,tumble:0,bumpCd:0,contacts:0,slips:0,lean:0,yawRel:0};
    let phase='loading', phT=0, rem=START_T, late=false, lateT=0, et=0, finishT=0, endReason=null, grade=null, lightningT=VAR.thunder*.5;
    let shake=0, fovKick=0, hitFlash=0, flashA=0, msgs=[], chunkIdx=-999, hudT=0, scoreT=0, time=0;
    const input={l:false,r:false,b:false}, touch={l:0,r:0,b:false}, tapHold={l:0,r:0};
    let dlg=null;
    let cleaned=false, built=false;

    // ══ DOM ══
    const wrap=document.createElement('div');wrap.className='race-wrap';
    const zoneLbl=[[0,'住宅街'],[SHOP0,'商店街'],[IND0,'工業道路']];
    wrap.innerHTML=`<div class="race-vig"></div><div class="race-hit"></div><div class="race-flash"></div>
<div class="race-hud off">
 <div class="race-gauge"><div class="bg"></div><div class="ring"></div><b>0</b><small>km/h</small></div>
 <div class="race-tm"><small>打刻まで</small><b>--.-</b><em>${VAR.name}</em></div>
 <div class="race-prog"><div class="tr"></div><div class="fl"></div>${zoneLbl.map(z=>`<span class="zn" style="left:${z[0]/GOAL*100+ (z[0]?0:6)}%">${z[1]}</span>`).join('')}${CPS.map(c=>`<span class="mk cp" style="left:${c.s/GOAL*100}%"></span>`).join('')}${SIGS.map(g=>`<span class="mk sg" style="left:${g.s/GOAL*100}%"></span>`).join('')}<span class="gl">🏭</span><span class="me">🛵</span></div>
 <div class="race-dmg">車体<div class="bar"><i></i></div><span class="cr"></span></div>
 <div class="race-nav"><i>➤</i><span>工場まで 2.2km</span></div>
 <div class="race-curve"></div>
 <div class="race-sig"><div class="lt"><i class="g"></i><i class="y"></i><i class="r"></i></div><span></span></div>
 <div class="race-msgs"></div>
 <div class="race-hint l">◀</div><div class="race-hint r">▶</div>
</div>
<button class="race-brake">ブレーキ</button>
<div class="race-tbar t"></div><div class="race-tbar b"></div>
<div class="race-ov race-main dim"><div class="race-load">読み込み中…</div></div>
<div class="race-fade"></div><div class="race-wipe"></div>`;
    body.appendChild(wrap);
    const $=q=>wrap.querySelector(q);
    const el={hud:$('.race-hud'),gauge:$('.race-gauge'),spd:$('.race-gauge b'),tm:$('.race-tm'),tmL:$('.race-tm small'),tmB:$('.race-tm b'),tmE:$('.race-tm em'),
      fl:$('.race-prog .fl'),me:$('.race-prog .me'),dmg:$('.race-dmg .bar i'),cr:$('.race-dmg .cr'),sig:$('.race-sig'),sigTx:$('.race-sig span'),
      nav:$('.race-nav i'),navT:$('.race-nav span'),curve:$('.race-curve'),sigL:[...wrap.querySelectorAll('.race-sig .lt i')],msgs:$('.race-msgs'),hl:$('.race-hint.l'),hr:$('.race-hint.r'),brake:$('.race-brake'),
      ov:$('.race-main'),fade:$('.race-fade'),wipe:$('.race-wipe'),flash:$('.race-flash'),hit:$('.race-hit'),tbT:$('.race-tbar.t'),tbB:$('.race-tbar.b')};

    function msg(text,cls='',dur=1.4){
      if(msgs.length>=3){const o=msgs.shift();o.e.remove();}
      const e=document.createElement('div');e.className='race-m '+cls;e.textContent=text;el.msgs.appendChild(e);msgs.push({e,t:dur});
    }
    function wipe(){el.wipe.classList.remove('go');void el.wipe.offsetWidth;el.wipe.classList.add('go');}
    function letterbox(on){el.tbT.classList.toggle('on',on);el.tbB.classList.toggle('on',on);}

    // ── 入力 ──
    const pointers=new Map();
    function recalcTouch(){
      let l=0,r=0;pointers.forEach(side=>{if(side<0)l++;else r++;});
      if(l&&!touch.l)tapHold.l=.14;if(r&&!touch.r)tapHold.r=.14;   // 短いタップでも最低0.14秒はハンドルを切る（入力バッファ）
      touch.l=l;touch.r=r;
    }
    function sideOf(e){const b=wrap.getBoundingClientRect();return (e.clientX-b.left)<b.width/2?-1:1;}
    function advance(){
      if(phase==='title'){se('decide');audioStart();toIntro();return true;}
      if(dlg){dlgTap();return true;}
      return false;
    }
    wrap.addEventListener('pointerdown',e=>{
      if(e.target.closest('.race-err'))return;
      if(advance())return;
      if(phase!=='play'&&phase!=='count')return;
      pointers.set(e.pointerId,sideOf(e));recalcTouch();
      try{wrap.setPointerCapture(e.pointerId);}catch(_){}
    });
    wrap.addEventListener('pointermove',e=>{if(pointers.has(e.pointerId)){pointers.set(e.pointerId,sideOf(e));recalcTouch();}});
    const pUp=e=>{if(pointers.delete(e.pointerId))recalcTouch();};
    wrap.addEventListener('pointerup',pUp);wrap.addEventListener('pointercancel',pUp);wrap.addEventListener('lostpointercapture',pUp);
    wrap.addEventListener('contextmenu',e=>e.preventDefault());
    el.brake.addEventListener('pointerdown',e=>{e.stopPropagation();e.preventDefault();touch.b=true;el.brake.classList.add('on');try{el.brake.setPointerCapture(e.pointerId);}catch(_){}});
    const bUp=e=>{e.stopPropagation();touch.b=false;el.brake.classList.remove('on');};
    el.brake.addEventListener('pointerup',bUp);el.brake.addEventListener('pointercancel',bUp);el.brake.addEventListener('lostpointercapture',bUp);
    mg.onKey(e=>{
      const down=e.type==='keydown', k=e.key;
      let hit=true;
      if(k==='ArrowLeft'||k==='a'||k==='A'){if(down&&!input.l)tapHold.l=.14;input.l=down;}
      else if(k==='ArrowRight'||k==='d'||k==='D'){if(down&&!input.r)tapHold.r=.14;input.r=down;}
      else if(k==='ArrowDown'||k==='s'||k==='S'){input.b=down;}
      else if(k===' '||k==='Enter'){if(down&&!e.repeat)advance();}
      else hit=false;
      if(hit&&k!=='Enter')e.preventDefault();
    });
    const onBlur=()=>{input.l=input.r=input.b=false;pointers.clear();recalcTouch();touch.b=false;};
    window.addEventListener('blur',onBlur);
    if(mg.onEnd)mg.onEnd(()=>cleanup());

    // ══ サウンド（Web Audio：エンジン音・雨音・クラクション） ══
    let SND=null;
    const seVol=()=>{try{return typeof AUDIO_SET!=='undefined'?Math.max(0,+AUDIO_SET.se||0):1;}catch(e){return 1;}};
    function audioStart(){
      if(SND||cleaned)return;
      try{
        if(typeof AU==='undefined')return;
        if(AU.init)AU.init();
        const ctx=AU.ctx;if(!ctx)return;
        if(ctx.state==='suspended')ctx.resume().catch(()=>{});
        const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
        const eg=ctx.createGain();eg.gain.value=.0;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;
        const o1=ctx.createOscillator();o1.type='sawtooth';o1.frequency.value=60;
        const o2=ctx.createOscillator();o2.type='square';o2.frequency.value=121;
        const g2=ctx.createGain();g2.gain.value=.35;
        o1.connect(lp);o2.connect(g2);g2.connect(lp);lp.connect(eg);eg.connect(master);
        // 雨：ホワイトノイズ
        const len=ctx.sampleRate*2|0,buf=ctx.createBuffer(1,len,ctx.sampleRate),ch=buf.getChannelData(0);
        for(let i=0;i<len;i++)ch[i]=Math.random()*2-1;
        const ns=ctx.createBufferSource();ns.buffer=buf;ns.loop=true;
        const hp=ctx.createBiquadFilter();hp.type='bandpass';hp.frequency.value=2600;hp.Q.value=.6;
        const rg=ctx.createGain();rg.gain.value=0;ns.connect(hp);hp.connect(rg);rg.connect(master);
        o1.start();o2.start();ns.start();
        SND={ctx,master,eg,lp,o1,o2,rg,ns,buf};
      }catch(e){SND=null;}
    }
    function audioUpdate(){
      if(!SND)return;
      try{
        const c=SND.ctx,t=c.currentTime,vol=seVol();
        SND.master.gain.setTargetAtTime(vol>0&&!cleaned?vol:0,t,.05);
        const run=phase==='play'||phase==='count'||phase==='goal'||phase==='crashed';
        const f=48+P.v*4.2+(input.b||touch.b?-8:0);
        SND.o1.frequency.setTargetAtTime(f,t,.08);SND.o2.frequency.setTargetAtTime(f*2.02,t,.08);
        SND.lp.frequency.setTargetAtTime(380+P.v*38,t,.1);
        SND.eg.gain.setTargetAtTime(run&&phase!=='crashed'?.045+P.v*.0016:0.012,t,.15);
        SND.rg.gain.setTargetAtTime(.022*VAR.rain*(1+P.v/40),t,.3);
      }catch(e){}
    }
    function horn(){
      if(!SND||seVol()<=0)return;
      try{
        const c=SND.ctx,t=c.currentTime,g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.02);g.gain.setValueAtTime(.05,t+.42);g.gain.exponentialRampToValueAtTime(.0001,t+.5);
        g.connect(SND.master);
        [370,466].forEach(fq=>{const o=c.createOscillator();o.type='square';o.frequency.value=fq;o.connect(g);o.start(t);o.stop(t+.52);});
      }catch(e){}
    }
    function thud(){
      if(!SND||seVol()<=0)return;
      try{const c=SND.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(140,t);o.frequency.exponentialRampToValueAtTime(40,t+.25);
        g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.0001,t+.3);o.connect(g);g.connect(SND.master);o.start(t);o.stop(t+.32);}catch(e){}
    }
    function audioStop(){
      if(!SND)return;
      try{SND.o1.stop();SND.o2.stop();SND.ns.stop();}catch(e){}
      try{SND.master.disconnect();}catch(e){}
      SND=null;
    }

    // ══ three.js 本体 ══
    let T, renderer, scene, camera, envRT=null, ro=null, pr=1;
    const texList=[];
    let layers=[], wireL=null, roadGeo=null, slotChunk=new Int32Array(NCH).fill(-99999);
    let bike, bikeLean, wheelF, wheelR, headSpot, beam, bikeTail, carsI=null, cars=[], lightPool=[], lightSrc=[], lightS=null;
    let rain, rainPos, rainN, speedL, speedPos, spray, sprayData, puddles=[], manholes=[], sigObjs=[], gateBar=null, aviation=[], signMats=[], hemi, moon, ground, sky, camPos, camLook, clouds;
    const tp={x:0,z:0,h:0}, tp2={x:0,z:0,h:0};

    function showError(err){
      if(cleaned||mg._ended)return;
      el.ov.className='race-ov race-main dim';
      el.ov.innerHTML=`<div class="race-err">3D表示の準備ができなかった。<br><small>${String(err&&err.message||err).replace(/</g,'&lt;')}</small><br><button>戻る</button></div>`;
      el.ov.querySelector('button').onclick=()=>mg.end('quit');
      phase='error';
    }

    const fontReady=(document.fonts&&document.fonts.load)?Promise.race([document.fonts.load('20px "DotGothic16"').catch(()=>{}),new Promise(r=>setTimeout(r,900))]):Promise.resolve();
    Promise.all([loadThree(),fontReady]).then(([TH3])=>{
      if(cleaned||mg._ended)return;
      try{build(TH3);}catch(e){console.error(e);cleanupGL();showError(e);}
    }).catch(e=>showError(e));

    // ──────────────────────────────────────────────
    function build(THREE){
      T=THREE;
      renderer=new T.WebGLRenderer({antialias:(window.devicePixelRatio||1)<2,powerPreference:'high-performance',stencil:false});
      pr=Math.min(1.5,window.devicePixelRatio||1);
      renderer.setPixelRatio(pr);
      renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
      renderer.domElement.style.touchAction='none';
      wrap.insertBefore(renderer.domElement,wrap.firstChild);
      const maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());

      scene=new T.Scene();
      const FOGC=VAR.key==='fog'?0x2a2440:0x1b1230;
      scene.fog=new T.Fog(FOGC,VAR.fogN,VAR.fogF);
      camera=new T.PerspectiveCamera(60,1,.3,640);
      scene.add(camera);

      // ── テクスチャ生成ヘルパ ──
      const cvs=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];};
      const mkTex=(c,o={})=>{const t=new T.CanvasTexture(c);if(o.srgb!==false)t.colorSpace=T.SRGBColorSpace;if(o.rep){t.wrapS=t.wrapT=T.RepeatWrapping;}if(o.aniso)t.anisotropy=maxAniso;texList.push(t);return t;};
      const FONT='"DotGothic16","Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif';

      // 空（背景）
      {const [c,g]=cvs(4,256);const gr=g.createLinearGradient(0,0,0,256);
        const top=VAR.key==='fog'?'#141024':'#04030c';
        gr.addColorStop(0,top);gr.addColorStop(.35,'#0d0820');gr.addColorStop(.5,VAR.key==='fog'?'#2a2440':'#1b1230');gr.addColorStop(.62,VAR.key==='fog'?'#2a2440':'#21143a');gr.addColorStop(1,'#0a0714');
        g.fillStyle=gr;g.fillRect(0,0,4,256);scene.background=mkTex(c);}

      // 光のテクスチャ（放射グロー・縦ストリーク・円形の柔らかい影）
      const glowTex=(()=>{const [c,g]=cvs(64,64);const gr=g.createRadialGradient(32,32,0,32,32,32);
        gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.18,'rgba(255,255,255,.55)');gr.addColorStop(.45,'rgba(255,255,255,.14)');gr.addColorStop(1,'rgba(255,255,255,0)');
        g.fillStyle=gr;g.fillRect(0,0,64,64);return mkTex(c);})();
      const streakTex=(()=>{const [c,g]=cvs(32,128);const gr=g.createLinearGradient(0,0,0,128);
        gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.25,'rgba(255,255,255,.55)');gr.addColorStop(.55,'rgba(255,255,255,.8)');gr.addColorStop(1,'rgba(255,255,255,0)');
        g.fillStyle=gr;g.fillRect(0,0,32,128);
        const h=g.createLinearGradient(0,0,32,0);h.addColorStop(0,'rgba(0,0,0,1)');h.addColorStop(.5,'rgba(0,0,0,0)');h.addColorStop(1,'rgba(0,0,0,1)');
        g.globalCompositeOperation='destination-out';g.fillStyle=h;g.fillRect(0,0,32,128);
        // 雨粒で乱れた反射っぽく
        g.globalCompositeOperation='destination-out';for(let i=0;i<60;i++){g.fillStyle=`rgba(0,0,0,${Math.random()*.6})`;g.fillRect(Math.random()*32,Math.random()*128,2+Math.random()*10,1+Math.random()*3);}
        return mkTex(c);})();
      const shadowTex=(()=>{const [c,g]=cvs(64,64);const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(.6,'rgba(0,0,0,.35)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return mkTex(c);})();

      // ── 道路アトラス（歩道|縁石|車道|縁石|歩道|無地アスファルト）。1枚=幅方向全体×進行方向16m ──
      const U={sl0:0,sl1:.15,cl:.17,cr:.83,sr0:.85,sr1:.98,plain:.99};
      const uOf=d=>U.cl+(d+W)/(2*W)*(U.cr-U.cl);
      const [rc,rg]=cvs(1024,1024), [hc,hg]=cvs(512,512);   // 色 / 粗さ
      {
        const px=u=>u*1024, PM=64;   // 縦 64px/m
        // 歩道：タイル＋点字ブロック
        const side=(u0,u1)=>{
          rg.fillStyle='#38343f';rg.fillRect(px(u0),0,px(u1-u0),1024);
          for(let y=0;y<1024;y+=32)for(let x=px(u0);x<px(u1);x+=24){const v=46+Math.random()*16|0;rg.fillStyle=`rgb(${v},${v-4},${v+8})`;rg.fillRect(x+1,y+1,22,30);}
          const tx=px((u0+u1)/2)-7;rg.fillStyle='#8a7a2a';rg.fillRect(tx,0,14,1024);
          rg.fillStyle='#a8963a';for(let y=0;y<1024;y+=8)rg.fillRect(tx+1,y+2,12,3);
          for(let i=0;i<40;i++){rg.fillStyle=`rgba(10,8,16,${Math.random()*.35})`;rg.beginPath();rg.ellipse(px(u0)+Math.random()*px(u1-u0),Math.random()*1024,4+Math.random()*16,6+Math.random()*30,0,0,TAU);rg.fill();}
        };
        side(U.sl0,U.sl1);side(U.sr0,U.sr1);
        rg.fillStyle='#6d6876';rg.fillRect(px(U.sl1),0,px(U.cl-U.sl1),1024);rg.fillRect(px(U.cr),0,px(U.sr0-U.cr),1024);
        for(let y=0;y<1024;y+=48){rg.fillStyle='#4a4652';rg.fillRect(px(U.sl1),y,px(U.cl-U.sl1),2);rg.fillRect(px(U.cr),y,px(U.sr0-U.cr),2);}
        // 車道：アスファルトの粒
        const a0=px(U.cl),a1=px(U.cr);
        rg.fillStyle='#1a1820';rg.fillRect(a0,0,a1-a0,1024);rg.fillRect(px(U.sr1),0,1024-px(U.sr1),1024);
        for(let i=0;i<26000;i++){const v=Math.random();rg.fillStyle=v<.5?`rgba(0,0,0,${.2+Math.random()*.3})`:`rgba(120,112,140,${Math.random()*.16})`;const x=a0+Math.random()*(a1-a0);rg.fillRect(x,Math.random()*1024,1+Math.random()*2,1+Math.random()*2);}
        // ひび割れと補修跡
        rg.strokeStyle='rgba(5,4,8,.6)';rg.lineWidth=1.2;
        for(let i=0;i<14;i++){let x=a0+Math.random()*(a1-a0),y=Math.random()*1024;rg.beginPath();rg.moveTo(x,y);for(let j=0;j<8;j++){x+=rnd(-14,14);y+=rnd(-4,26);rg.lineTo(x,y);}rg.stroke();}
        for(let i=0;i<3;i++){rg.fillStyle='rgba(30,28,36,.9)';rg.fillRect(a0+Math.random()*(a1-a0-120),Math.random()*900,60+Math.random()*80,40+Math.random()*120);}
        // 濡れて黒く光る帯（轍）
        const tracks=[-2.6,-1.0,1.0,2.6];
        tracks.forEach(d=>{const x=px(uOf(d));const g2=rg.createLinearGradient(x-26,0,x+26,0);g2.addColorStop(0,'rgba(0,0,0,0)');g2.addColorStop(.5,'rgba(4,3,8,.55)');g2.addColorStop(1,'rgba(0,0,0,0)');rg.fillStyle=g2;rg.fillRect(x-26,0,52,1024);});
        // 区画線
        const line=(d,wm,dash)=>{const x=px(uOf(d)),w=wm*(a1-a0)/(2*W);rg.fillStyle='#d8d4e0';
          if(dash){for(let y=0;y<1024;y+=512){rg.fillRect(x-w/2,y,w,256);}}else rg.fillRect(x-w/2,0,w,1024);
          // 塗装の剥げ
          for(let i=0;i<220;i++){rg.fillStyle='rgba(26,24,32,.8)';rg.fillRect(x-w/2+Math.random()*w,Math.random()*1024,1+Math.random()*3,1+Math.random()*3);}};
        line(-W+.3,.15,false);line(W-.3,.15,false);line(0,.15,true);
        // 粗さマップ（G=粗さ。濡れた所ほど低い＝よく光る）
        const hpx=u=>u*512;
        hg.fillStyle='rgb(150,150,150)';hg.fillRect(0,0,512,512);
        hg.fillStyle='rgb(92,92,92)';hg.fillRect(hpx(U.cl),0,hpx(U.cr-U.cl),512);hg.fillRect(hpx(U.sr1),0,512-hpx(U.sr1),512);
        tracks.forEach(d=>{const x=hpx(uOf(d));const g2=hg.createLinearGradient(x-14,0,x+14,0);g2.addColorStop(0,'rgba(30,30,30,0)');g2.addColorStop(.5,'rgba(30,30,30,1)');g2.addColorStop(1,'rgba(30,30,30,0)');hg.fillStyle=g2;hg.fillRect(x-14,0,28,512);});
        for(let i=0;i<30;i++){const x=hpx(U.cl)+Math.random()*hpx(U.cr-U.cl),y=Math.random()*512;const g2=hg.createRadialGradient(x,y,0,x,y,10+Math.random()*30);g2.addColorStop(0,'rgba(18,18,18,1)');g2.addColorStop(1,'rgba(18,18,18,0)');hg.fillStyle=g2;hg.fillRect(x-40,y-40,80,80);}
        [-W+.3,W-.3,0].forEach(d=>{const x=hpx(uOf(d));hg.fillStyle='rgb(120,120,120)';hg.fillRect(x-2,0,4,512);});
        hg.fillStyle='rgb(110,110,110)';hg.fillRect(0,0,hpx(U.sl1),512);hg.fillRect(hpx(U.sr0),0,hpx(U.sr1-U.sr0),512);
      }
      const roadTex=mkTex(rc,{rep:true,aniso:true}), roughTex=mkTex(hc,{rep:true,srgb:false,aniso:true});

      // ── 環境マップ（濡れた路面・車体に映る、街明かりの地平線） ──
      {
        const [c,g]=cvs(512,256);
        const gr=g.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#040308');gr.addColorStop(.42,'#140c26');gr.addColorStop(.5,'#3a2350');gr.addColorStop(.56,'#120a1c');gr.addColorStop(1,'#050408');
        g.fillStyle=gr;g.fillRect(0,0,512,256);
        const cols=['#ff7a40','#ff4f9a','#40e8ff','#ffd070','#b070ff','#ffb060'];
        for(let i=0;i<70;i++){const x=Math.random()*512,y=112+Math.random()*24,r=3+Math.random()*12;const gg=g.createRadialGradient(x,y,0,x,y,r);gg.addColorStop(0,cols[i%cols.length]);gg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gg;g.fillRect(x-r,y-r,r*2,r*2);}
        for(let i=0;i<40;i++){g.fillStyle=`rgba(255,220,170,${.2+Math.random()*.5})`;g.fillRect(Math.random()*512,118+Math.random()*12,1+Math.random()*3,1);}
        const et=mkTex(c);et.mapping=T.EquirectangularReflectionMapping;
        const pm=new T.PMREMGenerator(renderer);envRT=pm.fromEquirectangular(et);pm.dispose();
        scene.environment=envRT.texture;
      }

      // ── ライティング ──
      hemi=new T.HemisphereLight(0x6a58b8,0x120c1c,.9);scene.add(hemi);
      moon=new T.DirectionalLight(0x8a7ad8,.55);moon.position.set(-40,60,30);scene.add(moon);scene.add(moon.target);
      // 近くの街灯・ネオンに追従する点光源プール（数は固定＝シェーダ再コンパイルなし）
      for(let i=0;i<3;i++){const L=new T.PointLight(0xffb36b,0,22,1.6);scene.add(L);lightPool.push(L);}

      // ── 地面（道路の外側のすき間用） ──
      ground=new T.Mesh(new T.PlaneGeometry(900,900),new T.MeshLambertMaterial({color:0x0c0a12}));
      ground.rotation.x=-Math.PI/2;ground.position.y=-.03;scene.add(ground);

      // ── 遠景のビル群（カメラに追従する円筒） ──
      {
        const [c,g]=cvs(2048,256);g.clearRect(0,0,2048,256);
        let x=0;while(x<2048){const w=20+Math.random()*70,h=50+Math.random()*170;
          g.fillStyle=VAR.key==='fog'?'#231d36':'#0d0a1a';g.fillRect(x,256-h,w,h);
          for(let wy=256-h+6;wy<250;wy+=7)for(let wx=x+3;wx<x+w-3;wx+=6)if(Math.random()<.22){g.fillStyle=Math.random()<.7?'rgba(255,200,130,.55)':'rgba(140,200,255,.5)';g.fillRect(wx,wy,3,3);}
          if(Math.random()<.18){g.fillStyle='#ff2a40';g.fillRect(x+w/2-1,256-h-3,3,3);}
          x+=w+Math.random()*8;}
        const t=mkTex(c);t.wrapS=T.RepeatWrapping;t.repeat.set(3,1);
        sky=new T.Mesh(new T.CylinderGeometry(520,520,190,48,1,true),new T.MeshBasicMaterial({map:t,side:T.BackSide,transparent:true,fog:false,depthWrite:false,opacity:VAR.key==='fog'?.35:.85}));
        sky.position.y=82;sky.renderOrder=-2;scene.add(sky);
        // 雲の底（街明かりで紫に光る）
        const [c2,g2]=cvs(256,256);for(let i=0;i<60;i++){const xx=Math.random()*256,yy=Math.random()*256,r=20+Math.random()*50;const gg=g2.createRadialGradient(xx,yy,0,xx,yy,r);gg.addColorStop(0,'rgba(70,45,110,.35)');gg.addColorStop(1,'rgba(70,45,110,0)');g2.fillStyle=gg;g2.fillRect(0,0,256,256);}
        const ct=mkTex(c2,{rep:true});ct.repeat.set(4,4);
        clouds=new T.Mesh(new T.PlaneGeometry(1200,1200),new T.MeshBasicMaterial({map:ct,transparent:true,fog:false,depthWrite:false,opacity:.9}));
        clouds.rotation.x=Math.PI/2;clouds.position.y=120;clouds.renderOrder=-1;scene.add(clouds);
      }

      // ══ 道路：リングバッファ（20mチャンク×16） ══
      {
        const nV=NCH*RROWS*RV;
        roadGeo=new T.BufferGeometry();
        roadGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(nV*3),3).setUsage(T.DynamicDrawUsage));
        roadGeo.setAttribute('normal',new T.BufferAttribute(new Float32Array(nV*3),3).setUsage(T.DynamicDrawUsage));
        roadGeo.setAttribute('uv',new T.BufferAttribute(new Float32Array(nV*2),2).setUsage(T.DynamicDrawUsage));
        const idx=[];
        for(let c=0;c<NCH;c++)for(let r=0;r<RROWS-1;r++)for(let q=0;q<5;q++){
          const a=(c*RROWS+r)*RV+q*2,b=a+1,cc=a+RV,dd=cc+1;idx.push(a,b,cc,b,dd,cc);}
        roadGeo.setIndex(idx);
        const roadMat=new T.MeshStandardMaterial({map:roadTex,roughnessMap:roughTex,roughness:1,metalness:.08,envMapIntensity:1.35,color:0xc8c0d8});
        const road=new T.Mesh(roadGeo,roadMat);road.frustumCulled=false;scene.add(road);
      }
      function fillChunk(slot,c){
        const pos=roadGeo.attributes.position.array,nor=roadGeo.attributes.normal.array,uv=roadGeo.attributes.uv.array;
        for(let r=0;r<RROWS;r++){
          const s=c*RCH+r*2;trackAt(s,0,tp);
          const ch=Math.cos(tp.h),sh=Math.sin(tp.h),flat=inCross(s)||(s>GOAL+2&&s<GOAL+14);
          const cb=flat?0:CURB, v=s/16;
          const pts=flat
            ?[[-W-SW,0,U.plain,0],[-W,0,U.plain,0],[-W,0,U.cl,0],[-W,0,U.cl,0],[-W,0,U.cl,0],[W,0,U.cr,0],[W,0,U.cr,0],[W,0,U.cr,0],[W,0,U.plain,0],[W+SW,0,U.plain,0]]
            :[[-W-SW,cb,U.sl0,0],[-W,cb,U.sl1,0],[-W,cb,U.sl1,1],[-W,0,U.cl,1],[-W,0,U.cl,0],[W,0,U.cr,0],[W,0,U.cr,-1],[W,cb,U.sr0,-1],[W,cb,U.sr0,0],[W+SW,cb,U.sr1,0]];
          const base=(slot*RROWS+r)*RV;
          for(let k=0;k<RV;k++){
            const [d,y,u,nr]=pts[k],i=base+k;
            pos[i*3]=tp.x+ch*d;pos[i*3+1]=y;pos[i*3+2]=tp.z+sh*d;
            if(nr===0){nor[i*3]=0;nor[i*3+1]=1;nor[i*3+2]=0;}else{nor[i*3]=ch*nr;nor[i*3+1]=0;nor[i*3+2]=sh*nr;}
            uv[i*2]=u;uv[i*2+1]=v;
          }
        }
      }

      // ══ インスタンス・レイヤー（コース全体の配置を前計算→窓だけGPUへ） ══
      const _m=new T.Matrix4(),_q=new T.Quaternion(),_e=new T.Euler(),_p=new T.Vector3(),_sc=new T.Vector3(),_c=new T.Color();
      function pm(s,d,y,rotY,sx,sy,sz,rx){trackAt(s,d,tp);_e.set(rx||0,-tp.h+(rotY||0),0,'YXZ');_q.setFromEuler(_e);_p.set(tp.x,y,tp.z);_sc.set(sx,sy,sz);return _m.compose(_p,_q,_sc);}
      class Layer{
        constructor(geo,mat,colored){this.geo=geo;this.mat=mat;this.colored=colored;this.items=[];}
        add(s,m,col){this.items.push({s,e:m.elements.slice(),c:col!=null?_c.set(col).toArray():null});}
        fin(){
          const it=this.items.sort((a,b)=>a.s-b.s),n=it.length;
          this.S=new Float32Array(n);this.M=new Float32Array(n*16);this.C=this.colored?new Float32Array(n*3):null;
          it.forEach((o,i)=>{this.S[i]=o.s;this.M.set(o.e,i*16);if(this.C)this.C.set(o.c||[1,1,1],i*3);});
          let cap=1;for(let c=-6;c<LT/RCH+2;c++){const k=this.lb((c+NCH-2)*RCH)-this.lb((c-2)*RCH);if(k>cap)cap=k;}
          this.cap=cap;this.mesh=new T.InstancedMesh(this.geo,this.mat,cap);this.mesh.count=0;this.mesh.frustumCulled=false;
          this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
          if(this.colored)this.mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(cap*3),3).setUsage(T.DynamicDrawUsage);
          scene.add(this.mesh);this.items=null;return this;
        }
        lb(v){let lo=0,hi=this.S.length;while(lo<hi){const m=(lo+hi)>>1;if(this.S[m]<v)lo=m+1;else hi=m;}return lo;}
        update(lo,hi){
          const i0=this.lb(lo),n=Math.min(this.lb(hi)-i0,this.cap);
          this.mesh.instanceMatrix.array.set(this.M.subarray(i0*16,(i0+n)*16));this.mesh.instanceMatrix.needsUpdate=true;
          if(this.C){this.mesh.instanceColor.array.set(this.C.subarray(i0*3,(i0+n)*3));this.mesh.instanceColor.needsUpdate=true;}
          this.mesh.count=n;
        }
      }
      const L=(geo,mat,colored)=>{const l=new Layer(geo,mat,colored);layers.push(l);return l;};
      const addMat=(o={})=>new T.MeshBasicMaterial(Object.assign({map:glowTex,transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false},o));
      const flatPlane=(w,h)=>new T.PlaneGeometry(w,h).rotateX(-Math.PI/2);

      const lGlow=L(new T.PlaneGeometry(1,1),addMat(),true);
      const lPool=L(flatPlane(1,1),addMat({opacity:.55}),true);
      const lStreak=L(flatPlane(1,1),addMat({map:streakTex,opacity:.7}),true);

      // ── 建物テクスチャ（色＋発光窓） ──
      function facade(w,h,floors,cols,kind){
        const [c,g]=cvs(w,h),[e,ge]=cvs(w,h);
        ge.fillStyle='#000';ge.fillRect(0,0,w,h);
        const base=kind==='wh'?'#2c2b33':kind==='shop'?'#2d2636':'#2a2534';
        g.fillStyle=base;g.fillRect(0,0,w,h);
        for(let i=0;i<300;i++){g.fillStyle=`rgba(${Math.random()<.5?0:90},${Math.random()<.5?0:80},${Math.random()<.5?0:110},${Math.random()*.08})`;g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*20,2+Math.random()*40);}
        // 雨だれの縦すじ
        for(let i=0;i<40;i++){g.fillStyle='rgba(0,0,0,.18)';g.fillRect(Math.random()*w,Math.random()*h*.5,1+Math.random()*2,h*.3+Math.random()*h*.5);}
        if(kind==='wh'){
          for(let x=0;x<w;x+=6){g.fillStyle=x%12?'rgba(255,255,255,.05)':'rgba(0,0,0,.25)';g.fillRect(x,0,3,h);}
          for(let i=0;i<3;i++){const x=20+i*(w-40)/2-14,y=h*.25;g.fillStyle='#101018';g.fillRect(x,y,28,14);if(Math.random()<.7){ge.fillStyle='#ffd8a0';ge.fillRect(x+2,y+2,24,10);}}
          g.fillStyle='#1a1a22';g.fillRect(w*.3,h*.55,w*.4,h*.45);
          for(let y=h*.55;y<h;y+=5){g.fillStyle='rgba(255,255,255,.06)';g.fillRect(w*.3,y,w*.4,1);}
          ge.fillStyle='rgba(255,180,90,.9)';ge.fillRect(w*.3,h*.52,w*.4,3);
          return [c,e];
        }
        const fh=h/floors, shopF=kind==='shop'?1:0;
        for(let f=shopF;f<floors;f++){
          const y0=h-(f+1)*fh;
          g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y0+fh-3,w,3);
          for(let i=0;i<cols;i++){
            const cw=w/cols,x=i*cw+cw*.16,y=y0+fh*.18,ww=cw*.68,wh=fh*.56;
            g.fillStyle='#0b0a12';g.fillRect(x,y,ww,wh);g.fillStyle='rgba(120,110,160,.25)';g.fillRect(x,y,ww,2);
            const r=Math.random();
            if(r<.36){
              const col=r<.22?['#ffcf8a','#ffb860']:r<.3?['#a8d8ff','#7ab0ff']:['#ff9ac0','#c070ff'];
              const gr=ge.createLinearGradient(0,y,0,y+wh);gr.addColorStop(0,col[0]);gr.addColorStop(1,col[1]);
              ge.fillStyle=gr;ge.fillRect(x,y,ww,wh);
              ge.fillStyle='rgba(0,0,0,.55)';if(Math.random()<.6)ge.fillRect(x+ww*(.3+Math.random()*.4),y,ww*.12,wh); // 窓枠・人影
              if(Math.random()<.4){ge.fillStyle='rgba(0,0,0,.4)';ge.fillRect(x,y,ww*.35,wh);}  // カーテン
            }
            if(kind==='apt'){g.fillStyle='rgba(150,140,170,.22)';g.fillRect(i*cw+2,y0+fh*.72,cw-4,2);g.fillRect(i*cw+2,y0+fh*.86,cw-4,1);}
          }
        }
        if(kind==='shop'){
          const y0=h-fh;
          const pal=[['#ffe2b0','#ff9a40'],['#d8f4ff','#80c8ff'],['#ffd0e8','#ff70b0'],['#e8ffd8','#80e0a0']];
          for(let k=0;k<2;k++){
            const x0=k*w/2+4,ww=w/2-8,p=pal[(Math.random()*pal.length)|0];
            g.fillStyle='#14121a';g.fillRect(x0,y0+4,ww,fh-4);
            if(Math.random()<.78){
              const gr=ge.createLinearGradient(0,y0+fh*.3,0,y0+fh);gr.addColorStop(0,p[0]);gr.addColorStop(1,p[1]);
              ge.fillStyle=gr;ge.fillRect(x0+2,y0+fh*.32,ww-4,fh*.66);
              ge.fillStyle='rgba(0,0,0,.45)';for(let j=0;j<5;j++)ge.fillRect(x0+4+j*(ww/5),y0+fh*.55+Math.random()*fh*.2,ww/8,fh*.3); // 棚
              ge.fillStyle='rgba(0,0,0,.6)';ge.fillRect(x0+ww*.42,y0+fh*.32,2,fh*.66);
              ge.fillStyle=p[1];ge.fillRect(x0,y0+fh*.08,ww,fh*.18); // 横看板
              ge.fillStyle='rgba(0,0,0,.65)';ge.font=`${fh*.14|0}px ${FONT}`;ge.textAlign='center';ge.textBaseline='middle';
              ge.fillText(['営業中','やきとり','クリーニング','たばこ','食堂','酒','本'][(Math.random()*7)|0],x0+ww/2,y0+fh*.17);
            }else{for(let y=y0+fh*.3;y<y0+fh;y+=4){g.fillStyle=y%8?'#3a3644':'#26232e';g.fillRect(x0+2,y,ww-4,3);}} // シャッター
          }
        }
        return [c,e];
      }
      const bMat=(kind,w,h,fl,cols)=>{const [c,e]=facade(w,h,fl,cols,kind);return new T.MeshLambertMaterial({map:mkTex(c),emissiveMap:mkTex(e),emissive:0xffffff,emissiveIntensity:1.1});};
      const boxUp=new T.BoxGeometry(1,1,1).translate(0,.5,0);
      const lAptL=L(boxUp,bMat('apt',256,256,4,4),true);
      const lAptH=L(boxUp,bMat('apt',256,512,9,5),true);
      const lShop=L(boxUp,bMat('shop',256,256,3,3),true);
      const lWh=L(boxUp,bMat('wh',256,128,1,1),true);

      // ── ネオン看板（縦） ──
      const SIGNS=[['ラーメン','#ff3a5c'],['居酒屋','#ffb030'],['カラオケ','#30e8ff'],['スナック','#ff5ad8'],['くすり','#50ff98'],['BAR','#b07aff']];
      const lSign=SIGNS.map(([txt,col],vi)=>{
        const [c,g]=cvs(64,256);
        g.fillStyle='#0e0814';g.fillRect(0,0,64,256);
        g.strokeStyle=col;g.lineWidth=4;g.shadowColor=col;g.shadowBlur=10;g.strokeRect(5,5,54,246);
        g.font=`${txt.length>3?38:44}px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
        const n=txt.length,step=Math.min(56,232/n);
        for(let i=0;i<n;i++){const y=128+(i-(n-1)/2)*step;g.shadowBlur=14;g.fillStyle=col;g.fillText(txt[i],32,y);g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.75)';g.fillText(txt[i],32,y);}
        const m=new T.MeshBasicMaterial({map:mkTex(c),side:T.DoubleSide,toneMapped:false});m.userData.vi=vi;signMats.push(m);
        return L(new T.PlaneGeometry(.8,2.6),m,false);
      });
      const lAwn=L(new T.BoxGeometry(1,1,1),new T.MeshLambertMaterial({color:0xffffff}),true);
      // 自販機
      const lVend=(()=>{const [c,g]=cvs(64,128);g.fillStyle='#d8e4f0';g.fillRect(0,0,64,128);g.fillStyle='#1050c0';g.fillRect(0,0,64,14);
        g.fillStyle='#fffbe8';g.fillRect(5,18,54,62);
        const dc=['#e83030','#30a0ff','#f0c020','#30c060','#ff7020','#a050e0'];
        for(let r=0;r<3;r++)for(let i=0;i<6;i++){g.fillStyle=dc[(r*2+i)%6];g.fillRect(7+i*9,22+r*20,6,13);g.fillStyle='#40ff60';g.fillRect(8+i*9,37+r*20,4,2);}
        g.fillStyle='#222';g.fillRect(8,94,48,16);g.fillStyle='#1050c0';g.fillRect(44,84,10,6);
        const t=mkTex(c);return L(new T.BoxGeometry(1,1,1).translate(0,.5,0),new T.MeshBasicMaterial({map:t,color:0xd8d8d8}),false);})();
      // 街灯（柱+腕を1ジオメトリに結合）・灯具
      function merge(parts){
        let n=0;const gs2=parts.map(([g,m])=>{const q=g.index?g.toNonIndexed():g.clone();q.applyMatrix4(m);n+=q.attributes.position.count;return q;});
        const pos=new Float32Array(n*3),nor=new Float32Array(n*3),uv=new Float32Array(n*2);let o=0;
        gs2.forEach(q=>{pos.set(q.attributes.position.array,o*3);nor.set(q.attributes.normal.array,o*3);uv.set(q.attributes.uv.array,o*2);o+=q.attributes.position.count;q.dispose();});
        parts.forEach(([g])=>g.dispose());
        const out=new T.BufferGeometry();out.setAttribute('position',new T.BufferAttribute(pos,3));out.setAttribute('normal',new T.BufferAttribute(nor,3));out.setAttribute('uv',new T.BufferAttribute(uv,2));
        return out;
      }
      const M4=(x,y,z,rx,ry,rz,sx,sy,sz)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx||0,ry||0,rz||0)),new T.Vector3(sx||1,sy||1,sz||1));
      const metal=new T.MeshStandardMaterial({color:0x4a4858,metalness:.7,roughness:.4});
      const lLamp=L(merge([[new T.CylinderGeometry(.07,.11,6.5,8),M4(0,3.25,0)],[new T.BoxGeometry(1.7,.09,.12),M4(-.8,6.35,0)],[new T.BoxGeometry(.6,.12,.3),M4(-1.55,6.3,0)]]),metal,false);
      const lLampHead=L(new T.BoxGeometry(.5,.05,.24),new T.MeshBasicMaterial({color:0xfff0d0,toneMapped:false}),false);
      const lPole=L(merge([[new T.CylinderGeometry(.13,.18,10,8),M4(0,5,0)],[new T.BoxGeometry(1.8,.12,.12),M4(0,9.1,0)],[new T.BoxGeometry(1.2,.1,.1),M4(0,8.5,0)],[new T.CylinderGeometry(.25,.25,.7,8),M4(.35,7.6,0)]]),new T.MeshLambertMaterial({color:0x5a5662}),false);
      const lRail=L(merge([[new T.BoxGeometry(.05,.3,4),M4(0,.85,0)],[new T.CylinderGeometry(.05,.05,.85,6),M4(0,.42,-1.6)]]),new T.MeshStandardMaterial({color:0xb8bcc8,metalness:.8,roughness:.3}),false);
      const lFence=(()=>{const [c,g]=cvs(64,64);g.clearRect(0,0,64,64);g.strokeStyle='rgba(170,175,190,1)';g.lineWidth=2;
        for(let i=-64;i<128;i+=12){g.beginPath();g.moveTo(i,0);g.lineTo(i+64,64);g.stroke();g.beginPath();g.moveTo(i,64);g.lineTo(i+64,0);g.stroke();}
        const t=mkTex(c,{rep:true});t.repeat.set(6,2);
        return L(new T.PlaneGeometry(6,2.2).translate(0,1.1,0).rotateY(Math.PI/2),new T.MeshLambertMaterial({map:t,alphaTest:.4,side:T.DoubleSide,color:0x8a8a9a}),false);})();
      const lLantern=L(new T.SphereGeometry(.2,8,6).scale(1,1.35,1),new T.MeshBasicMaterial({color:0xffffff,toneMapped:false}),true);
      // 水たまり（鏡面）・マンホール
      const lPud=L(new T.CircleGeometry(1,22).rotateX(-Math.PI/2),new T.MeshStandardMaterial({color:0x06050c,roughness:.03,metalness:.9,envMapIntensity:2.2}),false);
      const lMan=(()=>{const [c,g]=cvs(128,128);g.fillStyle='#2a2830';g.beginPath();g.arc(64,64,62,0,TAU);g.fill();
        g.strokeStyle='#4a4652';g.lineWidth=5;g.beginPath();g.arc(64,64,56,0,TAU);g.stroke();
        g.strokeStyle='#3c3944';g.lineWidth=3;for(let r=12;r<52;r+=10){g.beginPath();g.arc(64,64,r,0,TAU);g.stroke();}
        for(let a=0;a<12;a++){g.beginPath();g.moveTo(64,64);g.lineTo(64+Math.cos(a/12*TAU)*52,64+Math.sin(a/12*TAU)*52);g.stroke();}
        g.fillStyle='#55505e';g.font='bold 16px sans-serif';g.textAlign='center';g.fillText('下水',64,70);
        return L(new T.CircleGeometry(.62,20).rotateX(-Math.PI/2),new T.MeshStandardMaterial({map:mkTex(c),metalness:.75,roughness:.28,transparent:false}),false);})();

      // ── 配置 ──
      const reserved=[];  // [side, a, b]
      const isRes=(side,a,b)=>reserved.some(r=>r[0]===side&&b>r[1]&&a<r[2]);
      reserved.push([-1,286,312]);  // コンビニ
      const lampCols={town:0xffb36b,shop:0xffd8a8,ind:0xd8f0ff};
      function addLamp(s,side,sc,col){
        if(intOverlap(s,s,-2))return;
        lLamp.add(s,pm(s,side*(W+.35),0,side<0?Math.PI:0,sc,sc,sc));
        const hd=side*(W+.35-1.55*sc), hy=6.25*sc;
        lLampHead.add(s,pm(s,hd,hy,0,sc,1,sc));
        lGlow.add(s,pm(s,hd,hy-.1,0,3.2*sc,3.2*sc,1),col);
        lPool.add(s,pm(s,hd*.8,.04,0,10*sc,1,12*sc),col);
        lStreak.add(s-6,pm(s-6,hd*.85,.05,0,1.4,1,14),col);
        lightSrc.push({s,d:hd,y:hy-.6,col,int:28});
      }
      // 建物
      for(const side of [-1,1]){
        let s=-90;
        while(s<GOAL-24){
          const z=zoneAt(s);let len,dep,hgt,lay,set=0;
          if(z==='shop'){len=rr(6.5,10);dep=rr(8,11);hgt=rr(6.5,10);lay=lShop;}
          else if(z==='ind'){len=rr(24,40);dep=rr(16,24);hgt=rr(7,12);set=rr(3,8);lay=lWh;}
          else{len=rr(9,17);dep=rr(9,14);const r=rr();if(r<.22){hgt=rr(6.5,9);lay=lShop;}else if(r<.6){hgt=rr(7,12);lay=lAptL;}else{hgt=rr(14,26);lay=lAptH;}}
          if(intOverlap(s,s+len,4)){const g=SIGS.find(g=>s+len>g.s-10&&s<g.s+18);s=g.s+18;continue;}
          if(isRes(side,s,s+len)){s+=4;continue;}
          const sc=s+len/2, dc=side*(W+SW+.4+set+dep/2);
          const tint=lay===lWh?[0x8890a0,0xa09080,0x7a8a90][(rr()*3)|0]:[0xb0a0c8,0xa8a8b8,0xc0b0a8,0x9890b0,0xb8a0a0][(rr()*5)|0];
          lay.add(sc,pm(sc,dc,0,0,dep,hgt,len),tint);
          if(lay===lShop){
            // 庇と縦看板
            lAwn.add(sc,pm(sc,side*(W+SW+.4-.5),hgt/3.1,0,1.0,.1,len*.9),[0x9a2030,0x1f6a50,0x2a3a8a,0x8a6a20][(rr()*4)|0]);
            if(rr()<(z==='shop'?.9:.6)){
              const vi=(rr()*SIGNS.length)|0, ss=sc+rr(-len/3,len/3), sd=side*(W+SW+.4-.55), sy=Math.min(hgt-1.5,rr(4.2,5.6));
              lSign[vi].add(ss,pm(ss,sd,sy,0,1,1,1));
              const col=SIGNS[vi][1];
              lGlow.add(ss+.05,pm(ss+.05,sd,sy,0,2.6,4.2,1),col);
              lStreak.add(ss-5,pm(ss-5,side*(W-.7),.05,0,1.1,1,11),col);
              lPool.add(ss,pm(ss,side*(W+SW*.4),.18,0,5,1,6),col);
              if(z==='shop')lightSrc.push({s:ss,d:sd,y:sy,col,int:18});
            }
          }
          if(lay===lWh&&rr()<.5){lFence.add(sc,pm(sc,side*(W+SW-.1),CURB,0,1,1,1));}
          s+=len+(z==='shop'?.25:z==='ind'?rr(5,14):rr(.6,4));
        }
      }
      // 街灯・電柱・自販機・ガードレール・提灯
      for(let s=10,i=0;s<GOAL-10;s+=zoneAt(s)==='ind'?36:zoneAt(s)==='shop'?22:30,i++){
        const z=zoneAt(s);addLamp(s,i%2?1:-1,z==='ind'?1.25:z==='shop'?.85:1,lampCols[z]);
        if(z==='shop')addLamp(s+11,i%2?-1:1,.85,lampCols.shop);
      }
      const poles=[];
      for(let s=4;s<GOAL-20;s+=38){if(zoneAt(s)==='shop'||intOverlap(s,s,0))continue;lPole.add(s,pm(s,-(W+SW-.45),CURB,0,1,1,1));poles.push(s);}
      for(let s=60;s<SHOP0-10;s+=rr(80,140)){const side=rr()<.5?-1:1;if(intOverlap(s,s+2,2)||isRes(side,s-2,s+3))continue;const d=side*(W+SW-.5);
        lVend.add(s,pm(s,d,CURB,0,.75,1.85,.95));if(rr()<.5)lVend.add(s+1,pm(s+1,d,CURB,0,.75,1.85,.95));
        lPool.add(s,pm(s,side*(W+SW*.55),.19,0,4,1,4),0xc8e8ff);lGlow.add(s,pm(s,d-side*.4,1.1,0,2.4,2.4,1),0xa8d0ff);}
      for(let s=IND0;s<GOAL-6;s+=4)for(const side of [-1,1])lRail.add(s,pm(s,side*(W+.25),CURB,0,1,1,1));
      for(let s=SHOP0+8;s<SHOP1-4;s+=10){
        const cols=[0xff3040,0xff8a30,0xff4fa0];
        for(let k=-3;k<=3;k++){const d=k*1.05,y=5.6-Math.cos(k/3*1.2)*.0-(1-Math.abs(k)/3)*.35;lLantern.add(s,pm(s,d,y,0,1,1,1),cols[(k+3+((s/10)|0))%3]);lGlow.add(s,pm(s,d,y,0,1.3,1.3,1),cols[(k+3+((s/10)|0))%3]);}
      }
      // 水たまり・マンホール
      for(let s=70;s<GOAL-40;s+=rr(46,92)/VAR.pud){
        if(intOverlap(s-3,s+3,2)||CPS.some(c=>Math.abs(c.s-s)<6))continue;
        const d=rr()<.65?rr(-W+.9,-.5):rr(.4,W-.9), a=rr(1.4,2.6), b=rr(.8,1.35);
        lPud.add(s,pm(s,d,.035,0,b,1,a));puddles.push({s,d,a,b,hit:false});
      }
      for(let s=40;s<GOAL-20;s+=rr(55,85)){if(intOverlap(s,s,0))continue;const d=rr()<.5?-1.8:rr(-.6,.6);lMan.add(s,pm(s,d,.03,0,1,1,1));manholes.push({s,d,hit:false});}
      // 電線（窓付き線分レイヤー）
      {
        const segs=[];
        const wire=(s0,d0,y0,s1,d1,y1,sag)=>{const pts=[];for(let k=0;k<=4;k++){const t=k/4;trackAt(s0+(s1-s0)*t,d0+(d1-d0)*t,tp);pts.push([tp.x,y0+(y1-y0)*t-Math.sin(t*Math.PI)*sag,tp.z]);}
          for(let k=0;k<4;k++)segs.push({s:s0,v:[...pts[k],...pts[k+1]]});};
        for(let i=0;i<poles.length-1;i++){const a=poles[i],b=poles[i+1];if(b-a>60)continue;for(const [dd,yy] of [[-.8,9.1],[0,9.1],[.8,9.1],[-.5,8.5],[.5,8.5]])wire(a,-(W+SW-.45)+dd,yy,b,-(W+SW-.45)+dd,yy,.55);
          if(i%3===1)wire(a,-(W+SW-.45),8.5,a+6,W+SW-.5,7.8,.6);}
        for(let s=SHOP0+8;s<SHOP1-4;s+=10)wire(s,-W-1,5.7,s,W+1,5.7,0);
        segs.sort((a,b)=>a.s-b.s);
        const n=segs.length,S=new Float32Array(n),V=new Float32Array(n*6);segs.forEach((o,i)=>{S[i]=o.s;V.set(o.v,i*6);});
        let cap=1;const lb=v=>{let lo=0,hi=n;while(lo<hi){const m=(lo+hi)>>1;if(S[m]<v)lo=m+1;else hi=m;}return lo;};
        for(let c=-6;c<LT/RCH+2;c++)cap=Math.max(cap,lb((c+NCH-2)*RCH)-lb((c-4)*RCH));
        const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(cap*6),3).setUsage(T.DynamicDrawUsage));
        const line=new T.LineSegments(g,new T.LineBasicMaterial({color:0x080610}));line.frustumCulled=false;scene.add(line);
        wireL={update(lo,hi){const i0=lb(lo-40),k=Math.min(lb(hi)-i0,cap);g.attributes.position.array.set(V.subarray(i0*6,(i0+k)*6));g.attributes.position.needsUpdate=true;g.setDrawRange(0,k*2);}};
      }
      lightSrc.sort((a,b)=>a.s-b.s);
      lightS=new Float32Array(lightSrc.map(o=>o.s));
      layers.forEach(l=>l.fin());

      // ══ 個別オブジェクト：コンビニ・信号・チェックポイント・工場正門 ══
      const lam=(c)=>new T.MeshLambertMaterial({color:c});
      const basic=(c,o)=>new T.MeshBasicMaterial(Object.assign({color:c,toneMapped:false},o||{}));
      function place(o,s,d,y,rot){trackAt(s,d,tp);o.position.set(tp.x,y,tp.z);o.rotation.y=-tp.h+(rot||0);scene.add(o);return o;}
      function textTex(w,h,draw){const [c,g]=cvs(w,h);draw(g,w,h);return mkTex(c);}
      // コンビニ
      {
        const grp=new T.Group();
        const t=textTex(256,128,(g,w,h)=>{g.fillStyle='#f4f8ff';g.fillRect(0,0,w,h);g.fillStyle='#1aa860';g.fillRect(0,0,w,14);g.fillStyle='#2060d0';g.fillRect(0,14,w,8);g.fillStyle='#e83040';g.fillRect(0,22,w,5);
          g.fillStyle='#dfe8f2';for(let i=0;i<6;i++)g.fillRect(10+i*40,44,30,70);g.fillStyle='#ffd040';g.fillRect(12,60,26,6);g.fillStyle='#ff8050';g.fillRect(52,60,26,6);
          g.fillStyle='#1a5ab0';g.font=`22px ${FONT}`;g.textAlign='center';g.fillText('24H ナイトマート',w/2,40);});
        const box=new T.Mesh(new T.BoxGeometry(9,4.2,20).translate(0,2.1,0),[lam(0x404050),new T.MeshBasicMaterial({map:t,toneMapped:false}),lam(0x303040),lam(0x303040),lam(0x404050),lam(0x404050)]);
        box.position.x=-(W+SW+.4+4.5);grp.add(box);
        const roof=new T.Mesh(new T.BoxGeometry(10,.35,21),lam(0x2a2a34));roof.position.set(box.position.x,4.3,0);grp.add(roof);
        const gl=new T.Mesh(new T.PlaneGeometry(14,8),addMat({color:0xd8f0ff,opacity:.55}));gl.position.set(-(W+SW),2.4,.1);gl.rotation.y=Math.PI/2;grp.add(gl);
        const pool=new T.Mesh(flatPlane(9,22),addMat({color:0xc8e8ff,opacity:.55}));pool.position.set(-(W+1.6),.2,0);grp.add(pool);
        const st=new T.Mesh(flatPlane(2,18),addMat({map:streakTex,color:0xc8f0ff,opacity:.8}));st.position.set(-(W-1),.05,4);grp.add(st);
        place(grp,299,0,0);
        lightSrc.push({s:299,d:-(W+2),y:3,col:0xd8f0ff,int:40});lightSrc.sort((a,b)=>a.s-b.s);lightS=new Float32Array(lightSrc.map(o=>o.s));
      }
      // 交差点：横断歩道・停止線・横道・信号機
      SIGS.forEach(g=>{
        const grp=new T.Group();
        const white=new T.MeshStandardMaterial({color:0xd8d4e4,roughness:.45,metalness:.05});
        const parts=[];
        for(const z0 of [-3,11])for(let d=-W+.5;d<W-.3;d+=.9)parts.push([new T.PlaneGeometry(.45,3.6).rotateX(-Math.PI/2),M4(d,.02,-z0-0)]);
        parts.push([new T.PlaneGeometry(W,.45).rotateX(-Math.PI/2),M4(-W/2,.02,6.5)]);
        const marks=new T.Mesh(merge(parts),white);grp.add(marks);
        const asp=new T.MeshStandardMaterial({color:0x1c1a22,roughness:.35,metalness:.1,envMapIntensity:1.2});
        for(const sd of [-1,1]){const cr=new T.Mesh(flatPlane(80,10),asp);cr.position.set(sd*(W+40),.004,-4);grp.add(cr);
          const sw=new T.Mesh(new T.BoxGeometry(80,CURB,3).translate(0,CURB/2,0),lam(0x3a3644));
          for(const zz of [-10.5,2.5]){const m=sw.clone();m.position.set(sd*(W+SW+40),0,zz);grp.add(m);}
          // 横道の街灯
          const gl=new T.Mesh(new T.PlaneGeometry(4,4),addMat({color:0xffb070}));gl.position.set(sd*(W+16),6,-9);grp.add(gl);
          const pl=new T.Mesh(flatPlane(12,12),addMat({color:0xffb070,opacity:.45}));pl.position.set(sd*(W+16),.02,-6);grp.add(pl);}
        // 信号機（奥の左角）
        const poleM=lam(0x55525e);
        const pole=new T.Mesh(new T.CylinderGeometry(.1,.13,6,8).translate(0,3,0),poleM);pole.position.set(-(W+.5),0,-10.5);grp.add(pole);
        const arm=new T.Mesh(new T.BoxGeometry(3.4,.12,.12),poleM);arm.position.set(-(W+.5)+1.7,5.7,-10.5);grp.add(arm);
        const head=new T.Group();head.position.set(-1.3,5.7,-10.5);grp.add(head);
        head.add(new T.Mesh(new T.BoxGeometry(1.45,.48,.3),lam(0x3a3e48)));
        const cols=[0x30ffb0,0xffc030,0xff2a40], lamps=[];
        cols.forEach((c,i)=>{
          const hood=new T.Mesh(new T.CylinderGeometry(.19,.19,.22,10,1,true,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2),new T.MeshLambertMaterial({color:0x2a2e36,side:T.DoubleSide}));hood.position.set((i-1)*.45,.06,.25);head.add(hood);
          const m=new T.Mesh(new T.CircleGeometry(.15,14),basic(0x1a1a20));m.position.set((i-1)*.45,0,.16);head.add(m);lamps.push(m);});
        const glow=new T.Mesh(new T.PlaneGeometry(3.4,3.4),addMat({color:0x30ffb0}));glow.position.set(0,0,.3);head.add(glow);
        const streak=new T.Mesh(flatPlane(1.3,16),addMat({map:streakTex,color:0x30ffb0,opacity:.85}));streak.position.set(-1.3,.06,-1);grp.add(streak);
        // 対向側の信号（背面）
        const pole2=pole.clone();pole2.position.set(W+.5,0,1.5);grp.add(pole2);
        const arm2=arm.clone();arm2.position.set(W+.5-1.7,5.7,1.5);grp.add(arm2);
        const hb=new T.Mesh(new T.BoxGeometry(1.45,.48,.3),lam(0x3a3e48));hb.position.set(1.3,5.7,1.5);grp.add(hb);
        place(grp,g.s+4,0,0);
        g.lamps=lamps;g.glow=glow;g.streak=streak;g.cols=cols;
        sigObjs.push(g);setSig(g,'green');
      });
      // チェックポイントのゲート
      CPS.forEach((cp,i)=>{
        const grp=new T.Group();
        const t=textTex(512,96,(g,w,h)=>{g.fillStyle='#08121a';g.fillRect(0,0,w,h);g.strokeStyle='#00e8c8';g.lineWidth=4;g.shadowColor='#00e8c8';g.shadowBlur=12;g.strokeRect(6,6,w-12,h-12);
          g.font=`40px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#7ffff0';g.fillText(`CHECK ${i+1}  +${cp.add}秒`,w/2,h/2+2);g.shadowBlur=0;g.fillStyle='rgba(255,255,255,.8)';g.fillText(`CHECK ${i+1}  +${cp.add}秒`,w/2,h/2+2);});
        const ban=new T.Mesh(new T.PlaneGeometry(2*W+.8,1.1),new T.MeshBasicMaterial({map:t,toneMapped:false,side:T.DoubleSide}));ban.position.y=5.4;grp.add(ban);
        const tube=basic(0x00e8c8);
        for(const sd of [-1,1]){const p=new T.Mesh(new T.BoxGeometry(.22,5.9,.22).translate(0,2.95,0),lam(0x2a2834));p.position.x=sd*(W+.35);grp.add(p);
          const nt=new T.Mesh(new T.BoxGeometry(.05,5.2,.05).translate(0,2.6,0),tube);nt.position.set(sd*(W+.35)-sd*.13,.3,.12);grp.add(nt);}
        const gl=new T.Mesh(new T.PlaneGeometry(2*W+5,4),addMat({color:0x00e8c8,opacity:.6}));gl.position.set(0,5.4,-.1);grp.add(gl);
        const st=new T.Mesh(flatPlane(2*W,14),addMat({map:streakTex,color:0x00e8c8,opacity:.5}));st.position.set(0,.06,6);grp.add(st);
        place(grp,cp.s,0,0);cp.grp=grp;
      });
      // 商店街アーチ
      {
        const grp=new T.Group();
        const t=textTex(512,96,(g,w,h)=>{g.fillStyle='#1a0818';g.fillRect(0,0,w,h);g.font=`46px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
          g.shadowColor='#ff4fa0';g.shadowBlur=16;g.fillStyle='#ff7ac0';g.fillText('ネオン横丁 商店街',w/2,h/2);g.shadowBlur=0;g.fillStyle='rgba(255,240,250,.85)';g.fillText('ネオン横丁 商店街',w/2,h/2);
          g.fillStyle='#ffd040';for(let x=12;x<w;x+=24){g.beginPath();g.arc(x,8,3,0,TAU);g.fill();g.beginPath();g.arc(x,h-8,3,0,TAU);g.fill();}});
        const ban=new T.Mesh(new T.BoxGeometry(2*W+4,1.6,.3),[lam(0x302030),lam(0x302030),lam(0x302030),lam(0x302030),new T.MeshBasicMaterial({map:t,toneMapped:false}),new T.MeshBasicMaterial({map:t,toneMapped:false})]);ban.position.y=6.6;grp.add(ban);
        for(const sd of [-1,1]){const p=new T.Mesh(new T.BoxGeometry(.4,7.4,.4).translate(0,3.7,0),lam(0x3a2a3a));p.position.x=sd*(W+1.6);grp.add(p);}
        const gl=new T.Mesh(new T.PlaneGeometry(2*W+10,5),addMat({color:0xff4fa0,opacity:.55}));gl.position.set(0,6.6,.3);grp.add(gl);
        place(grp,SHOP0,0,0);
      }
      // 工場正門（ゴール）
      {
        const grp=new T.Group();
        const conc=lam(0x8a8694);
        for(const sd of [-1,1]){const p=new T.Mesh(new T.BoxGeometry(1.1,3.4,1.1).translate(0,1.7,0),conc);p.position.x=sd*(W+.9);grp.add(p);
          const cap=new T.Mesh(new T.BoxGeometry(1.3,.2,1.3),lam(0x6a6674));cap.position.set(sd*(W+.9),3.5,0);grp.add(cap);
          const lt=new T.Mesh(new T.SphereGeometry(.18,10,8),basic(0xfff0d0));lt.position.set(sd*(W+.9),3.8,0);grp.add(lt);
          const gl=new T.Mesh(new T.PlaneGeometry(3,3),addMat({color:0xffe0b0}));gl.position.set(sd*(W+.9),3.8,.3);grp.add(gl);}
        const plate=textTex(256,64,(g,w,h)=>{g.fillStyle='#d8d4cc';g.fillRect(0,0,w,h);g.fillStyle='#202028';g.font=`26px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText('海峡精機 第二工場',w/2,h/2+2);});
        const pl=new T.Mesh(new T.PlaneGeometry(1.0,.26),new T.MeshBasicMaterial({map:plate,color:0xb0b0b0}));pl.position.set(-(W+.9),2.4,.56);grp.add(pl);
        const gt=textTex(512,96,(g,w,h)=>{g.fillStyle='#0a0a12';g.fillRect(0,0,w,h);g.font=`44px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.shadowColor='#ffd860';g.shadowBlur=16;g.fillStyle='#ffe090';g.fillText('第二工場 正門',w/2,h/2);g.shadowBlur=0;g.fillStyle='#fff';g.fillText('第二工場 正門',w/2,h/2);});
        const ban=new T.Mesh(new T.PlaneGeometry(2*W+2.4,1.2),new T.MeshBasicMaterial({map:gt,toneMapped:false,side:T.DoubleSide}));ban.position.y=5.2;grp.add(ban);
        const gl=new T.Mesh(new T.PlaneGeometry(2*W+8,4.5),addMat({color:0xffc860,opacity:.55}));gl.position.set(0,5.2,-.1);grp.add(gl);
        for(const sd of [-1,1]){const p=new T.Mesh(new T.BoxGeometry(.2,5.8,.2).translate(0,2.9,0),lam(0x2a2834));p.position.x=sd*(W+.25);grp.add(p);}
        // 市松のゴールライン
        const ck=textTex(256,32,(g,w,h)=>{for(let x=0;x<16;x++)for(let y=0;y<2;y++){g.fillStyle=(x+y)%2?'#e8e4f0':'#16141c';g.fillRect(x*16,y*16,16,16);}});
        const gline=new T.Mesh(flatPlane(2*W,1),new T.MeshStandardMaterial({map:ck,roughness:.4}));gline.position.y=.025;grp.add(gline);
        // 遮断機
        gateBar=new T.Group();gateBar.position.set(W+.4,1.05,-1.2);
        const bt=textTex(64,8,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#e8e8f0':'#d02030';g.fillRect(i*8,0,8,8);}});
        const bar=new T.Mesh(new T.BoxGeometry(2*W-.4,.1,.1).translate(-(W-.2),0,0),new T.MeshBasicMaterial({map:bt,color:0xc8c8c8}));gateBar.add(bar);grp.add(gateBar);
        // 守衛所
        const booth=new T.Mesh(new T.BoxGeometry(2.2,2.6,2.6).translate(0,1.3,0),lam(0x9a96a2));booth.position.set(W+3,CURB,-5);grp.add(booth);
        const bw=new T.Mesh(new T.PlaneGeometry(1.6,.9),basic(0xffe8b8));bw.position.set(W+1.88,1.8,-5);bw.rotation.y=-Math.PI/2;grp.add(bw);
        const bg2=new T.Mesh(new T.PlaneGeometry(3,2.2),addMat({color:0xffd8a0,opacity:.6}));bg2.position.set(W+1.7,1.8,-5);bg2.rotation.y=-Math.PI/2;grp.add(bg2);
        // 工場の建屋と煙突
        const [fc,fe]=facade(512,128,1,1,'wh');
        const fm=new T.MeshLambertMaterial({map:mkTex(fc),emissiveMap:mkTex(fe),emissive:0xffffff,emissiveIntensity:1.2,color:0x9aa0b0});
        const hall=new T.Mesh(new T.BoxGeometry(70,16,40).translate(0,8,0),fm);hall.position.set(0,0,-62);grp.add(hall);
        const roofT=new T.Mesh(new T.BoxGeometry(72,1.2,42),lam(0x3a3a46));roofT.position.set(0,16.4,-62);grp.add(roofT);
        const sign=textTex(512,80,(g,w,h)=>{g.fillStyle='#0c1020';g.fillRect(0,0,w,h);g.font=`40px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.shadowColor='#60c8ff';g.shadowBlur=14;g.fillStyle='#a8e0ff';g.fillText('KAIKYO SEIKI',w/2,h/2);});
        const sg=new T.Mesh(new T.PlaneGeometry(22,3.4),new T.MeshBasicMaterial({map:sign,toneMapped:false}));sg.position.set(0,13,-41.9);grp.add(sg);
        const sgg=new T.Mesh(new T.PlaneGeometry(30,8),addMat({color:0x60c8ff,opacity:.5}));sgg.position.set(0,13,-41.7);grp.add(sgg);
        for(const [x,h] of [[-22,42],[14,34],[26,38]]){
          const ch=new T.Mesh(new T.CylinderGeometry(1,1.4,h,12).translate(0,h/2,0),lam(0x6a6674));ch.position.set(x,0,-75);grp.add(ch);
          for(let k=0;k<3;k++){const st=new T.Mesh(new T.CylinderGeometry(1.05,1.05,1.2,12,1,true),lam(k%2?0xd02030:0xe8e8f0));st.position.set(x,h-2-k*1.2,-75);grp.add(st);}
          const av=new T.Mesh(new T.SphereGeometry(.4,8,6),basic(0xff2030));av.position.set(x,h+.4,-75);grp.add(av);
          const ag=new T.Mesh(new T.PlaneGeometry(6,6),addMat({color:0xff2030,fog:false}));ag.position.set(x,h+.4,-74);grp.add(ag);aviation.push(av,ag);
          // 煙
          const sm=new T.Mesh(new T.PlaneGeometry(14,22),new T.MeshBasicMaterial({map:glowTex,color:0x6a5a80,transparent:true,opacity:.35,depthWrite:false}));sm.position.set(x+3,h+9,-75);grp.add(sm);
        }
        for(const sd of [-1,1]){const fp=new T.Mesh(new T.CylinderGeometry(.18,.22,12,8).translate(0,6,0),poleM());fp.position.set(sd*(W+5),0,-12);grp.add(fp);
          const fg=new T.Mesh(new T.PlaneGeometry(7,7),addMat({color:0xf0f4ff}));fg.position.set(sd*(W+5),12,-11.6);grp.add(fg);
          const fpool=new T.Mesh(flatPlane(16,22),addMat({color:0xe8f0ff,opacity:.5}));fpool.position.set(sd*(W+1),.03,-14);grp.add(fpool);}
        // 構内の地面
        const yard=new T.Mesh(flatPlane(90,50),new T.MeshStandardMaterial({color:0x1e1c24,roughness:.3,metalness:.1}));yard.position.set(0,.002,-20);grp.add(yard);
        place(grp,GOAL,0,0);
        lightSrc.push({s:GOAL-12,d:-(W+5),y:11,col:0xe8f0ff,int:90});lightSrc.sort((a,b)=>a.s-b.s);lightS=new Float32Array(lightSrc.map(o=>o.s));
        function poleM(){return lam(0x55525e);}
      }

      // ══ 原付＋ライダー ══
      {
        bike=new T.Group();bikeLean=new T.Group();bike.add(bikeLean);
        const paint=new T.MeshStandardMaterial({color:0x2fb0a0,metalness:.45,roughness:.28,envMapIntensity:1.4});
        const cream=new T.MeshStandardMaterial({color:0xe8e2d0,metalness:.2,roughness:.4});
        const dark=new T.MeshStandardMaterial({color:0x16141c,metalness:.3,roughness:.6});
        const chrome=new T.MeshStandardMaterial({color:0xd0d4e0,metalness:1,roughness:.18,envMapIntensity:1.6});
        const seat=new T.MeshStandardMaterial({color:0x2a1c18,metalness:.1,roughness:.35});
        const hood=new T.MeshStandardMaterial({color:0xc0306a,metalness:.05,roughness:.75});
        const fur=new T.MeshStandardMaterial({color:0xf0ecf4,roughness:.95});
        const pants=new T.MeshStandardMaterial({color:0x2a2a3a,roughness:.8});
        const helm=new T.MeshStandardMaterial({color:0xf4f2fa,metalness:.2,roughness:.18,envMapIntensity:1.5});
        const visor=new T.MeshStandardMaterial({color:0x0a0a18,metalness:.9,roughness:.05,envMapIntensity:2});
        const hair=new T.MeshStandardMaterial({color:0xd8c8f0,roughness:.6});
        const refl=new T.MeshBasicMaterial({color:0xd8e8a0,toneMapped:false});
        const sets=new Map();
        const put=(mat,geo,m)=>{if(!sets.has(mat))sets.set(mat,[]);sets.get(mat).push([geo,m]);};
        const V3=(x,y,z)=>new T.Vector3(x,y,z);
        const limb=(mat,a,b,r)=>{const dir=b.clone().sub(a),len=dir.length();const q=new T.Quaternion().setFromUnitVectors(V3(0,1,0),dir.normalize());
          put(mat,new T.CapsuleGeometry(r,len,4,8),new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,V3(1,1,1)));};
        // 車体
        put(paint,new T.SphereGeometry(1,16,12),M4(0,.56,.42,0,0,0,.24,.23,.5));            // 後部カウル
        put(paint,new T.SphereGeometry(1,16,12),M4(0,.66,-.44,-.15,0,0,.22,.36,.16));       // レッグシールド
        put(paint,new T.BoxGeometry(.4,.5,.08),M4(0,.62,-.36,-.22,0,0));
        put(paint,new T.SphereGeometry(1,12,10),M4(0,1.02,-.6,0,0,0,.17,.08,.13));          // ハンドルカバー
        put(paint,new T.CylinderGeometry(.27,.27,.13,14,1,true,0,Math.PI),M4(0,.27,-.64,0,Math.PI/2,Math.PI/2)); // 前フェンダー
        put(cream,new T.BoxGeometry(.32,.06,.62),M4(0,.31,-.04));                            // ステップ
        put(cream,new T.SphereGeometry(1,12,8),M4(0,.52,.42,0,0,0,.245,.06,.5));             // 帯
        put(seat,new T.CapsuleGeometry(.13,.42,4,10),M4(0,.82,.34,Math.PI/2,0,0,1.15,1,.55));
        put(dark,new T.BoxGeometry(.38,.3,.36),M4(0,1.0,.8));                                // リアボックス
        put(dark,new T.BoxGeometry(.36,.04,.3),M4(0,.82,.78));
        put(chrome,new T.CylinderGeometry(.028,.028,.62,8),M4(0,.72,-.6,-.32,0,0));          // フロントフォーク
        put(chrome,new T.CylinderGeometry(.018,.018,.72,6),M4(0,1.03,-.62,0,0,Math.PI/2));   // ハンドル
        put(dark,new T.CylinderGeometry(.026,.026,.12,8),M4(.34,1.03,-.62,0,0,Math.PI/2));
        put(dark,new T.CylinderGeometry(.026,.026,.12,8),M4(-.34,1.03,-.62,0,0,Math.PI/2));
        for(const sd of [-1,1]){put(chrome,new T.CylinderGeometry(.008,.008,.26,5),M4(sd*.27,1.16,-.58,0,0,sd*.3));put(chrome,new T.SphereGeometry(1,8,6),M4(sd*.31,1.29,-.58,0,0,0,.05,.035,.015));}
        put(chrome,new T.CylinderGeometry(.05,.05,.5,8),M4(.15,.3,.6,Math.PI/2+.15,0,0));    // マフラー
        put(dark,new T.BoxGeometry(.14,.18,.5),M4(-.12,.36,.5));                             // エンジン
        put(new T.MeshBasicMaterial({color:0xf0f0f0}),new T.PlaneGeometry(.18,.11),M4(0,.6,.93,-.2,0,0)); // ナンバー
        // ライダー
        const hip=V3(0,.94,.3);
        limb(hood,V3(0,1.0,.3),V3(0,1.42,.1),.17);                                          // 胴（パーカー）
        put(fur,new T.TorusGeometry(.14,.05,6,14),M4(0,1.55,.06,Math.PI/2-.4,0,0));          // フード周りのファー
        put(hood,new T.SphereGeometry(1,10,8),M4(0,1.5,.2,0,0,0,.15,.12,.1));                // 背中のフード
        put(refl,new T.BoxGeometry(.36,.035,.02),M4(0,1.22,.38,-.4,0,0));                    // 反射テープ
        for(const sd of [-1,1]){
          const sh=V3(sd*.2,1.44,.1),el2=V3(sd*.27,1.18,-.24),gr=V3(sd*.32,1.06,-.58);
          limb(hood,sh,el2,.06);limb(hood,el2,gr,.052);
          put(dark,new T.SphereGeometry(.055,8,6),M4(gr.x,gr.y,gr.z));
          const kn=V3(sd*.17,.98,-.2),ft=V3(sd*.14,.4,-.12);
          limb(pants,V3(sd*.11,hip.y,hip.z),kn,.085);limb(pants,kn,ft,.07);
          put(dark,new T.BoxGeometry(.11,.08,.24),M4(ft.x,.37,ft.z-.06));
        }
        put(helm,new T.SphereGeometry(.165,16,12),M4(0,1.74,.02));
        put(visor,new T.SphereGeometry(.168,16,10,-Math.PI*.78,Math.PI*.56,Math.PI*.33,Math.PI*.3),M4(0,1.74,.02));
        put(hair,new T.CapsuleGeometry(.07,.22,3,8),M4(0,1.55,.18,.5,0,0));                   // 束ねた髪
        put(hair,new T.ConeGeometry(.05,.12,6),M4(.09,1.62,.16,.6,0,.4));put(hair,new T.ConeGeometry(.05,.12,6),M4(-.09,1.62,.16,.6,0,-.4));
        sets.forEach((list,mat)=>{const m=new T.Mesh(merge(list),mat);bikeLean.add(m);});
        // タイヤ（回転）
        const tire=new T.MeshStandardMaterial({color:0x101014,roughness:.7});
        const mkWheel=z=>{const g=new T.Group();g.position.set(0,.26,z);
          g.add(new T.Mesh(new T.TorusGeometry(.2,.065,8,18).rotateY(Math.PI/2),tire));
          const hub=new T.Mesh(new T.CylinderGeometry(.13,.13,.1,10).rotateZ(Math.PI/2),chrome);g.add(hub);
          const sp=new T.Mesh(new T.BoxGeometry(.11,.24,.03),dark);g.add(sp);bikeLean.add(g);return g;};
        wheelF=mkWheel(-.64);wheelR=mkWheel(.6);
        // ライト類
        const hl=new T.Mesh(new T.CircleGeometry(.075,14),basic(0xfff6e0));hl.position.set(0,1.0,-.735);hl.rotation.y=Math.PI;bikeLean.add(hl);
        const hlg=new T.Mesh(new T.PlaneGeometry(1.3,1.3),addMat({color:0xfff0d0}));hlg.position.set(0,1.0,-.76);hlg.rotation.y=Math.PI;bikeLean.add(hlg);
        const tl=new T.Mesh(new T.BoxGeometry(.2,.06,.03),basic(0xff2040));tl.position.set(0,.98,.99);bikeLean.add(tl);
        bikeTail=new T.Mesh(new T.PlaneGeometry(.9,.9),addMat({color:0xff2040,opacity:.8}));bikeTail.position.set(0,.98,1.02);bikeLean.add(bikeTail);
        for(const sd of [-1,1]){const w=new T.Mesh(new T.BoxGeometry(.05,.035,.03),basic(0xffa020));w.position.set(sd*.2,.98,.99);bikeLean.add(w);}
        // ヘッドライト（SpotLight＋光の円錐＋路面の光だまり）
        headSpot=new T.SpotLight(0xfff0d8,900,70,.42,.55,1.6);headSpot.position.set(0,1.0,-.75);bike.add(headSpot);
        const tgt=new T.Object3D();tgt.position.set(0,0,-16);bike.add(tgt);headSpot.target=tgt;
        const bt=(()=>{const [c,g]=cvs(8,128);const gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(.3,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,8,128);return mkTex(c);})();
        beam=new T.Mesh(new T.ConeGeometry(3.4,20,24,1,true).translate(0,-10,0).rotateX(Math.PI/2),new T.MeshBasicMaterial({map:bt,color:0xfff0d0,transparent:true,opacity:.075,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false}));
        beam.position.set(0,1.0,-.78);beam.rotation.x=-.07;bike.add(beam);
        const hp=new T.Mesh(flatPlane(4.2,11),addMat({color:0xfff0d0,opacity:.33}));hp.position.set(0,.05,-8.5);bike.add(hp);
        const sh=new T.Mesh(flatPlane(1.1,2.4),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));sh.position.y=.04;bike.add(sh);
        scene.add(bike);
      }

      // ══ 車（インスタンス：車体・キャビン・タイヤ・ライト・ワイパー） ══
      {
        const NC=14;
        const bodyG=merge([[new T.BoxGeometry(1.78,.52,4.3),M4(0,.6,0)],[new T.BoxGeometry(1.7,.18,4.36),M4(0,.38,0)]]);
        const cabG=new T.CylinderGeometry(.71,1,1,4,1).rotateY(Math.PI/4).scale(1.6/1.414,.56,2.3/1.414).translate(0,1.14,.25);
        const mkI=(geo,mat,n,col)=>{const m=new T.InstancedMesh(geo,mat,n);m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);if(col)m.instanceColor=new T.InstancedBufferAttribute(new Float32Array(n*3),3);scene.add(m);return m;};
        carsI={
          body:mkI(bodyG,new T.MeshStandardMaterial({color:0xffffff,metalness:.55,roughness:.3,envMapIntensity:1.3}),NC,true),
          cab:mkI(cabG,new T.MeshStandardMaterial({color:0x0c0e16,metalness:.7,roughness:.12,flatShading:true,envMapIntensity:1.8}),NC),
          wheel:mkI(new T.CylinderGeometry(.33,.33,.24,10).rotateZ(Math.PI/2),new T.MeshLambertMaterial({color:0x0a0a0e}),NC*4),
          hq:mkI(new T.PlaneGeometry(.36,.14),new T.MeshBasicMaterial({color:0xfff8e8,toneMapped:false}),NC*2),
          hg:mkI(new T.PlaneGeometry(1.5,1.5),addMat({color:0xfff0d8}),NC*2),
          tq:mkI(new T.PlaneGeometry(.34,.13),new T.MeshBasicMaterial({color:0xff2038,toneMapped:false}),NC*2),
          tg:mkI(new T.PlaneGeometry(1,1),addMat({color:0xff2038}),NC*2),
          beam:mkI(flatPlane(3.4,12),addMat({color:0xfff0d0,opacity:.32}),NC),
          wip:mkI(new T.BoxGeometry(.025,.5,.025).translate(0,.25,0),new T.MeshBasicMaterial({color:0x050508}),NC*2),
        };
        const LM=(x,y,z,ry,rx,rz)=>M4(x,y,z,rx||0,ry||0,rz||0);
        carsI.loc={
          wheel:[LM(.8,.33,-1.35),LM(-.8,.33,-1.35),LM(.8,.33,1.35),LM(-.8,.33,1.35)],
          hq:[LM(.6,.66,-2.19,Math.PI),LM(-.6,.66,-2.19,Math.PI)],
          hg:[LM(.6,.66,-2.3,Math.PI),LM(-.6,.66,-2.3,Math.PI)],
          tq:[LM(.64,.74,2.19),LM(-.64,.74,2.19)],
          tg:[LM(.64,.74,2.28),LM(-.64,.74,2.28)],
          beam:[LM(0,.045,-8.4)],
        };
        for(let i=0;i<NC;i++)cars.push({on:false});
      }

      // ══ 雨（カメラ座標系の線分）・スピード線・水しぶき ══
      {
        rainN=Math.round(700*VAR.rain);
        const g=new T.BufferGeometry();rainPos=new Float32Array(rainN*6);g.setAttribute('position',new T.BufferAttribute(rainPos,3).setUsage(T.DynamicDrawUsage));
        rain=new T.LineSegments(g,new T.LineBasicMaterial({color:0xa8b4f0,transparent:true,opacity:.34,depthWrite:false,fog:false}));
        rain.frustumCulled=false;rain.userData.d=new Float32Array(rainN*3);
        for(let i=0;i<rainN;i++){rain.userData.d[i*3]=rnd(-13,13);rain.userData.d[i*3+1]=rnd(-5,9);rain.userData.d[i*3+2]=rnd(-38,1);}
        camera.add(rain);
        const NL=60,g2=new T.BufferGeometry();speedPos=new Float32Array(NL*6);g2.setAttribute('position',new T.BufferAttribute(speedPos,3).setUsage(T.DynamicDrawUsage));
        speedL=new T.LineSegments(g2,new T.LineBasicMaterial({color:0xd8f8ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,fog:false}));
        speedL.frustumCulled=false;speedL.userData.d=[];
        for(let i=0;i<NL;i++){const a=Math.random()*TAU,r=rnd(1.6,3.6);speedL.userData.d.push({x:Math.cos(a)*r,y:Math.sin(a)*r*.75,z:rnd(-30,-2)});}
        camera.add(speedL);
        const NP=180,g3=new T.BufferGeometry();
        g3.setAttribute('position',new T.BufferAttribute(new Float32Array(NP*3),3).setUsage(T.DynamicDrawUsage));
        g3.setAttribute('color',new T.BufferAttribute(new Float32Array(NP*3),3).setUsage(T.DynamicDrawUsage));
        spray=new T.Points(g3,new T.PointsMaterial({size:.32,map:glowTex,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
        spray.frustumCulled=false;scene.add(spray);
        sprayData={n:NP,i:0,p:new Float32Array(NP*3),v:new Float32Array(NP*3),life:new Float32Array(NP),max:new Float32Array(NP).fill(1)};
      }

      camPos=new T.Vector3();camLook=new T.Vector3();
      fillChunkRef=fillChunk;
      // 初期チャンク
      updateWorld(true);
      trackAt(P.s-6,0,tp);camPos.set(tp.x,2.4,tp.z);
      ro=new ResizeObserver(resize);ro.observe(wrap);resize();
      built=true;
      // タイトルへ
      el.ov.className='race-ov race-main';el.ov.innerHTML='';
      toTitle();
      mg.loop(frame);
    }

    function cleanupGL(){
      try{if(ro)ro.disconnect();}catch(e){}
      ro=null;
      if(!renderer)return;
      try{
        scene.traverse(o=>{
          if(o.isInstancedMesh&&o.dispose)o.dispose();
          if(o.geometry)o.geometry.dispose();
          if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{for(const k in m){const v=m[k];if(v&&v.isTexture)v.dispose();}m.dispose();});
        });
      }catch(e){}
      texList.forEach(t=>{try{t.dispose();}catch(e){}});texList.length=0;
      try{if(envRT)envRT.dispose();}catch(e){}
      try{renderer.dispose();renderer.forceContextLoss();}catch(e){}
      try{renderer.domElement.remove();}catch(e){}
      renderer=null;scene=null;
    }
    function cleanup(){
      if(cleaned)return;cleaned=true;
      window.removeEventListener('blur',onBlur);
      audioStop();
      cleanupGL();
    }

    function resize(){
      if(!renderer)return;
      const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);
      renderer.setSize(w,h);camera.aspect=w/h;
      // 縦長画面では横の視野が狭くなるので少し引いた画角に
      camera.userData.baseFov=w/h<.75?66:58;
      camera.updateProjectionMatrix();
    }

    // ── 信号 ──
    function setSig(g,st){
      g.state=st;if(!g.lamps)return;
      const idx=st==='green'?0:st==='yellow'?1:2;
      g.lamps.forEach((m,i)=>m.material.color.setHex(i===idx?g.cols[i]:0x1a1a20));
      g.glow.position.x=(idx-1)*.45;g.glow.material.color.setHex(g.cols[idx]);g.streak.material.color.setHex(g.cols[idx]);
    }
    function sigFor(s){return SIGS.find(g=>s<g.stop+1&&g.stop-s<200);}

    // ── 窓の更新（チャンク境界をまたいだ時だけ） ──
    function updateWorld(force){
      const ci=Math.floor(P.s/RCH);
      if(ci===chunkIdx&&!force)return;
      chunkIdx=ci;
      let dirty=false;
      for(let c=ci-2;c<ci-2+NCH;c++){const slot=((c%NCH)+NCH)%NCH;if(slotChunk[slot]!==c){slotChunk[slot]=c;fillChunkRef(slot,c);dirty=true;}}
      if(dirty){const a=roadGeo.attributes;a.position.needsUpdate=a.normal.needsUpdate=a.uv.needsUpdate=true;}
      const lo=(ci-2)*RCH,hi=(ci-2+NCH)*RCH;
      layers.forEach(l=>l.update(lo,hi));wireL.update(lo,hi);
    }
    let fillChunkRef=null;

    // ── 車 ──
    let spawnOn=1.5, spawnSame=3, honkCd=0;
    const CAR_COLS=[0xe0e4ec,0x15161c,0x9098a4,0x7a1824,0x1c2c50,0xc8c0a8,0x2a4a3a];
    function spawnCar(kind,s,d,v,big){
      const c=cars.find(c=>!c.on);if(!c)return null;
      Object.assign(c,{on:true,kind,s,d,v,cv:Math.abs(v),sx:big?1.15:1,sy:big?1.75:1,sz:big?1.5:1,col:CAR_COLS[(Math.random()*CAR_COLS.length)|0],brake:false,honk:false,lane:0,x:0,dir:1,wp:Math.random()*TAU});
      if(big)c.col=[0xd8d8e0,0x3060a0,0xc0c8d0][(Math.random()*3)|0];
      return c;
    }
    function laneClear(s,d,r){return !cars.some(c=>c.on&&c.kind!=='cross'&&Math.abs(c.s-s)<r&&Math.abs(c.d-d)<1.5);}
    function updateCars(dt){
      if(phase==='play'){
        const tr=VAR.traffic*(zoneAt(P.s+200)==='shop'?.45:1);
        spawnOn-=dt*tr;spawnSame-=dt*tr;
        if(spawnOn<=0){spawnOn=rnd(1.9,3.6);const s=P.s+rnd(190,235);
          if(s<GOAL-15&&laneClear(s,1.8,18)){const big=zoneAt(s)==='ind'&&Math.random()<.5||VAR.key==='rush'&&Math.random()<.4;spawnCar('onc',s,rnd(1.6,2.0),-(zoneAt(s)==='shop'?rnd(8,11):rnd(13,19)),big);}}
        if(spawnSame<=0){spawnSame=rnd(3.8,6.8);const s=P.s+rnd(140,190);
          if(s<GOAL-30&&laneClear(s,-1.7,22)){const big=zoneAt(s)==='ind'&&Math.random()<.5||VAR.key==='rush'&&Math.random()<.4;spawnCar('same',s,rnd(-1.85,-1.5),rnd(10,15),big);}}
      }
      for(const g of SIGS){
        if(g.state==='red'&&g.red>.8){g.spawnT-=dt;if(g.spawnT<=0){g.spawnT=rnd(1.4,2.4);const dir=Math.random()<.5?1:-1;const c=spawnCar('cross',0,0,0,false);if(c){c.dir=dir;c.lane=g.s+4+(dir>0?2.3:-2.3);c.x=-dir*70;c.cv=rnd(13,17);c.v=c.cv;}}}
      }
      honkCd-=dt;
      for(const c of cars){
        if(!c.on)continue;
        if(c.kind==='cross'){c.x+=c.dir*c.v*dt;if(Math.abs(c.x)>75)c.on=false;continue;}
        // 信号で止まる
        let tv=c.cv;
        const g=SIGS.find(g=>g.state!=='green'&&(c.v>0?(g.stop-c.s>-.5&&g.stop-c.s<40):(c.s-(g.s+17)>-.5&&c.s-(g.s+17)<40)));
        if(g){const dist=c.v>0?g.stop-1-c.s:c.s-(g.s+18);tv=Math.min(tv,Math.max(0,Math.sqrt(Math.max(0,2*7*dist))));}
        // 前の車・プレイヤーに追従
        const dir=c.v>=0?1:-1;
        for(const o of cars){if(o===c||!o.on||o.kind==='cross'||Math.sign(o.v||1)!==dir)continue;const gap=(o.s-c.s)*dir;if(gap>0&&gap<11)tv=Math.min(tv,Math.abs(o.v));}
        if(dir>0&&phase!=='crashed'){const gap=P.s-c.s;if(gap>0&&gap<10&&Math.abs(P.d-c.d)<1.4)tv=Math.min(tv,P.v*.9);}
        const sp=Math.abs(c.v);const ns=sp<tv?Math.min(tv,sp+5*dt):Math.max(tv,sp-9*dt);
        c.brake=ns<sp-.01||ns<.5;
        c.v=ns*dir;c.s+=c.v*dt;
        if(c.s<P.s-30||c.s>P.s+320||c.s>GOAL+5&&dir>0)c.on=false;
        // 対向車がこちらの車線に来たらクラクション
        if(c.kind==='onc'&&!c.honk&&honkCd<=0&&phase==='play'&&Math.abs(P.d-c.d)<1.3&&c.s-P.s<55&&c.s-P.s>12){c.honk=true;honkCd=1.5;horn();}
      }
    }
    const _cm={};
    function renderCars(){
      const I=carsI;let n=0,nw=0,nh=0,nt=0,nb=0,nwp=0;
      if(!_cm.w){_cm.w=new T.Matrix4();_cm.one=new T.Vector3(1,1,1);_cm.t=new T.Matrix4();}
      const m=_cm.m||(_cm.m=new T.Matrix4()),pm2=_cm.p||(_cm.p=new T.Matrix4()),q=_cm.q||(_cm.q=new T.Quaternion()),e=_cm.e||(_cm.e=new T.Euler()),v=_cm.v||(_cm.v=new T.Vector3()),sc=_cm.s||(_cm.s=new T.Vector3()),col=_cm.c||(_cm.c=new T.Color());
      for(const c of cars){
        if(!c.on)continue;
        let yaw;
        if(c.kind==='cross'){trackAt(c.lane,c.x,tp);yaw=-(tp.h+(c.dir>0?Math.PI/2:-Math.PI/2));}
        else{trackAt(c.s,c.d,tp);yaw=-tp.h+(c.v<0?Math.PI:0);}
        e.set(0,yaw,0);q.setFromEuler(e);v.set(tp.x,0,tp.z);sc.set(c.sx,c.sy,c.sz);m.compose(v,q,sc);
        I.body.setMatrixAt(n,m);I.cab.setMatrixAt(n,m);I.body.setColorAt(n,col.setHex(c.col));
        for(const L of I.loc.wheel){pm2.multiplyMatrices(m,L);I.wheel.setMatrixAt(nw++,pm2);}
        for(let k=0;k<2;k++){pm2.multiplyMatrices(m,I.loc.hq[k]);I.hq.setMatrixAt(nh,pm2);pm2.multiplyMatrices(m,I.loc.hg[k]);I.hg.setMatrixAt(nh,pm2);nh++;}
        const bs=c.brake?1.7:1;
        for(let k=0;k<2;k++){pm2.multiplyMatrices(m,I.loc.tq[k]);I.tq.setMatrixAt(nt,pm2);pm2.multiplyMatrices(m,I.loc.tg[k]);_cm.t.makeScale(bs,bs,1);pm2.multiply(_cm.t);I.tg.setMatrixAt(nt,pm2);nt++;}
        pm2.multiplyMatrices(m,I.loc.beam[0]);I.beam.setMatrixAt(nb++,pm2);
        // ワイパー（左右対称に往復）
        c.wp+=.1;const a=Math.sin(c.wp)*.9;
        for(const sd of [-1,1]){e.set(-.95,0,sd*(.25+Math.abs(a)*.9),'XYZ');q.setFromEuler(e);v.set(sd*.4,.9,-.6);_cm.w.compose(v,q,_cm.one);pm2.multiplyMatrices(m,_cm.w);I.wip.setMatrixAt(nwp++,pm2);}
        n++;
      }
      I.body.count=I.cab.count=n;I.wheel.count=nw;I.hq.count=I.hg.count=nh;I.tq.count=I.tg.count=nt;I.beam.count=nb;I.wip.count=nwp;
      for(const k of ['body','cab','wheel','hq','hg','tq','tg','beam','wip'])I[k].instanceMatrix.needsUpdate=true;
      if(I.body.instanceColor)I.body.instanceColor.needsUpdate=true;
    }

    // ── 水しぶき ──
    function emit(x,y,z,vx,vy,vz,life){
      const S=sprayData,i=S.i;S.i=(S.i+1)%S.n;
      S.p[i*3]=x;S.p[i*3+1]=y;S.p[i*3+2]=z;S.v[i*3]=vx;S.v[i*3+1]=vy;S.v[i*3+2]=vz;S.life[i]=life;S.max[i]=life;
    }
    function updateSpray(dt){
      const S=sprayData,pa=spray.geometry.attributes.position.array,ca=spray.geometry.attributes.color.array;
      for(let i=0;i<S.n;i++){
        if(S.life[i]>0){S.life[i]-=dt;S.v[i*3+1]-=7*dt;S.p[i*3]+=S.v[i*3]*dt;S.p[i*3+1]+=S.v[i*3+1]*dt;S.p[i*3+2]+=S.v[i*3+2]*dt;if(S.p[i*3+1]<.02){S.p[i*3+1]=.02;S.v[i*3+1]*=-.2;}}
        const a=Math.max(0,S.life[i]/S.max[i])*.42;
        pa[i*3]=S.p[i*3];pa[i*3+1]=S.p[i*3+1];pa[i*3+2]=S.p[i*3+2];ca[i*3]=a*.75;ca[i*3+1]=a*.8;ca[i*3+2]=a;
      }
      spray.geometry.attributes.position.needsUpdate=true;spray.geometry.attributes.color.needsUpdate=true;
    }
    function splash(n,power){
      trackAt(P.s,P.d,tp);const fx=Math.sin(tp.h),fz=-Math.cos(tp.h);
      for(let k=0;k<n;k++)emit(tp.x+rnd(-.4,.4),.15,tp.z+rnd(-.4,.4),rnd(-3,3)*power+fx*P.v*.4,rnd(1.5,4)*power,rnd(-3,3)*power+fz*P.v*.4,rnd(.4,.8));
    }

    // ══ 演出フェーズ：タイトル→会話→カウントダウン ══
    function setOv(html,cls){el.ov.className='race-ov race-main'+(cls?' '+cls:'');el.ov.innerHTML=html;}
    function toTitle(){
      phase='title';phT=0;letterbox(true);
      setOv(`<div class="race-title"><div class="race-logo">原付で<span>夜勤へ</span></div><div class="race-sub">NIGHT SHIFT RIDER</div>
        <div class="race-var">今夜：${VAR.name}</div><div class="race-best">${RD.best!=null?'BEST '+fmtT(RD.best)+'　':''}出勤 ${RD.ontime}/${RD.plays}</div><div class="race-tap">タップでスタート</div></div>`);
    }
    function toIntro(){
      wipe();phase='intro';phT=0;setOv('');
      const lines=[
        {nm:'',img:null,tx:'21:57。雨。配信を、少し延長しすぎた。'},
        {nm:'だんのうら',img:'tired',tx:'……やってしまったわ。子どもは寝かしつけた。お隣さんにも声はかけた。'},
        {nm:'だんのうら',img:'normal',tx:'夜勤の打刻は22:00。工場まで2.2キロ。'},
        {nm:'だんのうら',img:'fear',tx:VAR.line},
      ];
      if(RD.ontime===0&&RD.plays>0)lines[3]={nm:'だんのうら',img:'fear',tx:'今夜こそは、遅刻しない。信号は守る。でも、全開でいくわよ。'};
      showDlg(lines,()=>{toCount();});
    }
    function showDlg(lines,done){
      let i=-1;const box=document.createElement('div');box.className='race-dlg';
      box.innerHTML='<img alt=""><div class="tx"><div class="nm"></div><div class="ln"></div></div><div class="nx">▼</div>';
      wrap.appendChild(box);
      const img=box.querySelector('img'),nm=box.querySelector('.nm'),ln=box.querySelector('.ln');
      dlg={box,lines,done,full:'',shown:0,next(){
        i++;if(i>=lines.length){box.remove();dlg=null;done();return;}
        const L=lines[i];box.classList.toggle('nar',!L.img);if(L.img)img.src='assets/img/char_'+L.img+'.webp';
        nm.textContent=L.nm||'';this.full=L.tx;this.shown=0;ln.textContent='';se('comment');
      },ln};
      dlg.next();
    }
    function dlgTap(){
      if(!dlg)return;
      if(dlg.shown<dlg.full.length){dlg.shown=dlg.full.length;dlg.ln.textContent=dlg.full;return;}
      se('btn');dlg.next();
    }
    function toCount(){
      phase='count';phT=0;letterbox(false);el.hud.classList.remove('off');el.brake.classList.add('show');
      setOv(`<div class="race-cd rdy">READY</div><div class="race-how"><b>◀ ▶</b> 画面の左右を長押し／←→キーでハンドル<br><b>ブレーキ</b>ボタン／↓キー（アクセルは自動）<br><span class="rd">赤信号</span>は停止線の手前で止まる（信号無視 −6秒）<br>車にぶつかると転倒。<span class="rd">3回で修理送り</span><br>水たまりはスリップ注意。<b>CHECK</b>で時間が延びる</div>`);
    }
    let cdShown=-1;
    function updateCount(dt){
      phT+=dt;
      const n=phT<1.4?-1:phT<2.4?3:phT<3.4?2:phT<4.4?1:0;
      if(n!==cdShown){
        cdShown=n;
        if(n>0){setOv(`<div class="race-cd">${n}</div><div class="race-how"><b>◀ ▶</b> 左右でハンドル　<b>ブレーキ</b>で減速<br><span class="rd">赤信号は止まる</span>／水たまり・車に注意</div>`);se('btn');}
        else if(n===0){setOv('<div class="race-cd go">GO!</div>');se('decide');phase='play';wipe();fovKick=10;msg('住宅街','sm',1.6);}
      }
    }

    // ══ プレイ ══
    function hitCurb(sign){
      P.latV=-sign*2.2;
      if(P.v>10&&P.curbCd<=0){P.dmg=Math.min(100,P.dmg+4);P.v*=.8;shake=Math.max(shake,.5);P.curbCd=.8;msg('縁石！','gd sm',.9);se('tool');thud();}
    }
    function crash(c){
      P.crashes++;P.dmg=Math.min(100,P.dmg+25);phase='crashed';P.tumble=0;P.tumbleDir=Math.random()<.5?-1:1;
      shake=1.3;hitFlash=1;se('warn');thud();msg('転倒！','rd');splash(26,1.4);
      if(c&&c.kind!=='cross')c.v*=.3;
    }
    function updatePlay(dt){
      et+=dt;
      // 入力（短いタップは最低0.14秒保持）
      tapHold.l=Math.max(0,tapHold.l-dt);tapHold.r=Math.max(0,tapHold.r-dt);
      const L=input.l||touch.l>0||tapHold.l>0, R=input.r||touch.r>0||tapHold.r>0;
      const steerIn=(R?1:0)-(L?1:0), brake=input.b||touch.b;
      P.steer+=(steerIn-P.steer)*Math.min(1,dt*(steerIn?7:9));
      const vmax=VMAX*(1-P.dmg*.0015);
      if(brake)P.v=Math.max(0,P.v-24*dt);else P.v+=Math.max(0,9*(1-(P.v/vmax)**2))*dt;
      if(P.v>vmax)P.v-=4*dt;
      P.slip=Math.max(0,P.slip-dt);P.inv=Math.max(0,P.inv-dt);P.curbCd-=dt;P.bumpCd-=dt;
      const ctrl=P.slip>0?.3:1, grip=P.slip>0?1.4:9;
      const target=P.steer*ctrl*Math.min(1,P.v/5)*(3+P.v*.17);
      P.latV+=(target-P.latV)*Math.min(1,dt*grip);
      if(P.slip>0)P.latV+=P.slipDir*Math.sin(P.slip*14)*6*dt;
      const k=curvAt(P.s);P.drift=-k*P.v*P.v*.33;
      P.d+=(P.latV+P.drift)*dt;P.s+=P.v*dt;
      const lim=W-.42;
      if(P.d>lim){P.d=lim;hitCurb(1);}else if(P.d<-lim){P.d=-lim;hitCurb(-1);}
      // 水たまり
      for(const p of puddles){
        if(p.hit||p.s<P.s-4)continue;if(p.s>P.s+4)break;
        const a=(P.s-p.s)/p.a,b=(P.d-p.d)/(p.b+.2);
        if(a*a+b*b<1){p.hit=true;
          if(P.v>12&&P.inv<=0){P.slip=.95;P.slipDir=Math.random()<.5?-1:1;P.latV+=P.slipDir*rnd(3.5,5.5);P.v*=.82;P.dmg=Math.min(100,P.dmg+5);P.slips++;
            shake=Math.max(shake,.45);fovKick=-4;msg('スリップ！','cy');se('noise');splash(30,1.2);}
          else splash(10,.6);}
      }
      for(const m of manholes){if(m.hit||m.s<P.s-2)continue;if(m.s>P.s+2)break;if(Math.abs(P.s-m.s)<.7&&Math.abs(P.d-m.d)<.8){m.hit=true;shake=Math.max(shake,.22+P.v*.008);se('machine');}}
      if(P.bumpCd<=0&&P.v>8){P.bumpCd=rnd(.9,2.4);shake=Math.max(shake,.08+P.v*.003);}
      // 車との当たり判定（横からのかすりは「接触」で弾かれるだけ）
      if(P.inv<=0)for(const c of cars){
        if(!c.on)continue;
        let ds,dd,ha,hc;
        if(c.kind==='cross'){ds=c.lane-P.s;dd=c.x-P.d;ha=.88*c.sx;hc=2.15*c.sz;}
        else{ds=c.s-P.s;dd=c.d-P.d;ha=2.15*c.sz;hc=.88*c.sx;}
        const ova=ha+.85-Math.abs(ds), ovc=hc+.3-Math.abs(dd);
        if(ova>0&&ovc>0){
          if(ovc<.42&&c.kind!=='cross'){ // かすった
            const sg=dd>0?-1:1;P.d+=sg*(ovc+.05);P.latV=sg*4.5;P.v*=.86;P.dmg=Math.min(100,P.dmg+6);P.contacts++;P.inv=.5;
            shake=Math.max(shake,.6);hitFlash=.45;msg('接触！','gd');se('tool');thud();splash(8,.8);
          }else{crash(c);return;}
        }
      }
      // チェックポイント
      for(const cp of CPS)if(!cp.done&&P.s>=cp.s){cp.done=true;
        if(!late){rem+=cp.add;msg(`CHECK ${CPS.indexOf(cp)+1}  +${cp.add}秒`,'cy');se('repair');fovKick=8;}else msg('CHECK（遅刻中）','sm');
      }
      // ゾーン表示
      if(!P.zoneShop&&P.s>SHOP0){P.zoneShop=true;msg('商店街','sm',1.6);}
      if(!P.zoneInd&&P.s>IND0){P.zoneInd=true;msg('工業道路','sm',1.6);}
      // 信号
      for(const g of SIGS){
        if(!g.passed&&P.s>=g.stop){
          g.passed=true;
          if(g.state==='red'){P.reds++;g.ran=true;if(!late)rem-=6;else lateT+=6;msg('信号無視！ −6秒','rd');se('warn');hitFlash=.5;}
        }
      }
      // 時間
      if(!late){rem-=dt;if(rem<=0){rem=0;late=true;msg('22:00…遅刻だ','rd',2);se('warn');}}
      else{lateT+=dt;if(lateT>45&&phase==='play'){phase='ending';P.v=0;endScene('late',true);return;}}
      // ゴール
      if(P.s>=GOAL){phase='goal';phT=0;finishT=et;se('ach');msg('打刻！','gd',2);fovKick=12;}
      // しぶき
      if(P.v>6&&Math.random()<P.v*.06){trackAt(P.s+.9,P.d,tp);emit(tp.x,.2,tp.z,rnd(-.6,.6),rnd(.8,2),rnd(-.6,.6),rnd(.3,.55));}
    }
    function updateSignals(dt){
      for(const g of SIGS){
        const dist=g.stop-P.s;
        if(g.use&&!g.trig&&phase==='play'&&dist<rnd(88,104)&&dist>0){g.trig=true;g.t=1.7;setSig(g,'yellow');se('notif');}
        if(g.state==='yellow'){g.t-=dt;if(g.t<=0){setSig(g,'red');g.red=0;g.spawnT=.6;}}
        else if(g.state==='red'){
          g.red+=dt;
          if(P.v<.8&&dist>-.5&&dist<30&&phase==='play')g.wait+=dt;
          const doneWait=g.wait>2.4, timeout=g.red>(g.ran?7:9);
          if(doneWait||timeout){setSig(g,'green');if(doneWait&&!g.ran&&dist>-1){msg('青！','gn');se('decide');}}
        }
      }
    }
    function updateCrash(dt){
      et+=dt;P.tumble+=dt;
      P.v=Math.max(0,P.v-16*dt);P.s+=P.v*dt;P.d+=P.tumbleDir*P.v*.12*dt;P.d=clamp(P.d,-W+.4,W-.4);
      if(!late){rem-=dt;if(rem<=0){rem=0;late=true;}}else lateT+=dt;
      if(P.tumble>1.8){
        if(P.crashes>=3||P.dmg>=100){phase='ending';endScene('crash',false);return;}
        phase='play';P.v=0;P.d=-1.8;P.latV=0;P.slip=0;P.inv=2.2;P.steer=0;
        cars.forEach(c=>{if(c.on&&c.kind!=='cross'&&Math.abs(c.s-P.s)<20)c.on=false;});
        msg(`再スタート（残り${3-P.crashes}回）`,'sm');se('repair');
      }
    }
    function updateGoal(dt){
      phT+=dt;P.v=Math.max(0,P.v-14*dt);P.s+=P.v*dt;P.d+=(-1.2-P.d)*Math.min(1,dt*2);P.latV=0;P.steer*=.9;
      if(phT>1.8&&phase==='goal'){phase='ending';endScene(late?'late':'ontime',true);}
    }

    // ── グレード ──
    function calcGrade(){
      if(endReason==='late')return 'C';
      const sc=rem+(100-P.dmg)/10-P.reds*5-P.crashes*6-P.contacts*1.5;
      return sc>=16?'S':sc>=9?'A':sc>=3?'B':'C';
    }
    function endScene(reason,atGate){
      endReason=reason;
      el.brake.classList.remove('show');el.hud.classList.add('off');letterbox(true);
      pointers.clear();recalcTouch();touch.b=false;
      const clockMin=late?Math.min(59,Math.ceil(lateT/60*6)):59;   // 演出上の打刻時刻
      const stamp=late?`22:${String(Math.max(1,Math.round(lateT/8))).padStart(2,'0')}`:'21:59';
      let lines;
      if(reason==='ontime'){
        grade=calcGrade();
        lines=grade==='S'?[{nm:'',img:null,tx:`ピッ。打刻 ${stamp}。タイム ${fmtT(finishT)}。`},{nm:'だんのうら',img:'win',tx:'……完璧ね。濡れた作業着のまま、胸を張って入れるわ。'},{nm:'だんのうら',img:'happy',tx:'今夜も設備は止めない。配信のネタも、ひとつ増えたわね。'}]
          :grade==='C'?[{nm:'',img:null,tx:`ピッ。打刻 ${stamp}。ぎりぎり間に合った。`},{nm:'だんのうら',img:'tired',tx:'……原付、傷だらけ。帰りにちゃんと見てあげないと。'}]
          :[{nm:'',img:null,tx:`ピッ。打刻 ${stamp}。守衛さんが「おつかれさん」と手を上げた。`},{nm:'だんのうら',img:'happy',tx:'……間に合った。作業着はロッカーで乾かしましょう。'}];
      }else if(reason==='late'){
        grade='C';
        lines=atGate&&P.s>=GOAL?[{nm:'',img:null,tx:`ピッ。打刻 ${stamp}。正門の前で、班長が腕を組んで待っていた。`},{nm:'だんのうら',img:'tired',tx:'「次は気をつけろよ」……はい。すみません。'},{nm:'だんのうら',img:'normal',tx:'……遅れた分は、仕事で取り返すわ。'}]
          :[{nm:'',img:null,tx:'22:00を大きく過ぎた。スマホに班長からの着信が3件。'},{nm:'だんのうら',img:'tired',tx:'……ごめんなさい。今から向かいます。'}];
      }else{
        grade=null;
        lines=[{nm:'',img:null,tx:'エンジンがかからない。雨の中、原付を押して路肩に寄せた。'},{nm:'だんのうら',img:'collapse',tx:'……体は無事。でも、この子はもう走れない。'},{nm:'だんのうら',img:'tired',tx:'工場に電話して、遅れると伝えた。修理代……また借金ね。'}];
      }
      const gradeDelay=reason==='crash'?.2:1.1;
      if(grade){
        const gd=document.createElement('div');gd.className='race-grade '+grade;
        gd.innerHTML=`<small>${reason==='ontime'?'ON TIME':'LATE'}</small><b>${grade}</b><em>${reason==='ontime'?'TIME '+fmtT(finishT)+(RD.best==null||finishT<RD.best?'　NEW BEST!':''):'遅刻 +'+lateT.toFixed(1)+'秒'}</em>`;
        wrap.appendChild(gd);se(grade==='S'?'rank':'ach');
      }
      phase='ending';phT=0;
      setTimeout(()=>{if(mg._ended||cleaned)return;showDlg(lines,()=>{el.fade.classList.add('on');setTimeout(()=>{if(!mg._ended)mg.end(reason);},480);});},gradeDelay*1000);
    }

    // ══ カメラ・見た目 ══
    function updateVisuals(dt){
      // 原付
      trackAt(P.s,P.d,tp);
      bike.position.set(tp.x,0,tp.z);
      const k=curvAt(P.s);
      let yawRel=Math.atan2(P.latV+P.drift*.6,Math.max(5,P.v))*.85;
      if(P.slip>0)yawRel+=Math.sin(P.slip*16)*.32*P.slip;
      P.yawRel+=(yawRel-P.yawRel)*Math.min(1,dt*10);
      bike.rotation.y=-(tp.h+P.yawRel);
      let lean=-clamp(P.latV*.06+k*P.v*P.v*.045,-.55,.55);
      if(phase==='crashed'){lean=P.tumbleDir*Math.min(1.45,P.tumble*3.5);bike.rotation.y+=P.tumbleDir*Math.min(1.2,P.tumble*1.6);}
      P.lean+=(lean-P.lean)*Math.min(1,dt*(phase==='crashed'?14:8));
      bikeLean.rotation.z=P.lean;
      bikeLean.position.y=phase==='crashed'?0:Math.sin(time*25)*.004*P.v/30;
      bikeLean.rotation.x=(input.b||touch.b)&&P.v>2&&phase==='play'?.035:0;
      wheelF.rotation.x-=P.v/.26*dt;wheelR.rotation.x-=P.v/.26*dt;
      bike.visible=!(P.inv>0&&phase==='play'&&Math.floor(time*12)%2===0);
      bikeTail.scale.setScalar((input.b||touch.b)?1.8:1);
      // 点光源プール：前方の近い光源へ
      let i0=0,lo=0,hi=lightS.length;const sq=P.s-6;while(lo<hi){const m=(lo+hi)>>1;if(lightS[m]<sq)lo=m+1;else hi=m;}i0=lo;
      for(let i=0;i<lightPool.length;i++){const L=lightPool[i],o=lightSrc[i0+i];if(o&&o.s<P.s+90){trackAt(o.s,o.d,tp2);L.position.set(tp2.x,o.y,tp2.z);L.color.setHex(o.col);L.intensity=o.int;}else L.intensity=0;}
      // 信号の点滅など
      for(const g of SIGS){if(g.state==='yellow'){g.glow.visible=Math.floor(time*6)%2===0;}else g.glow.visible=true;}
      aviation.forEach((a,i)=>a.visible=Math.sin(time*3+i)>-.2);
      signMats.forEach(m=>{const vi=m.userData.vi;let b=1;if(vi===3){const f=Math.sin(time*23)+Math.sin(time*7.3);b=f>1.4?.15:1;}else if(vi===1)b=.85+.15*Math.sin(time*2);else if(vi===5)b=Math.floor(time*1.5)%4===0?.35:1;m.color.setScalar(b);});
      if(gateBar){const open=P.s>GOAL-45;gateBar.rotation.z+=((open?1.45:0)-gateBar.rotation.z)*Math.min(1,dt*3);}
      // 雷
      lightningT-=dt;
      if(lightningT<=0){lightningT=rnd(VAR.thunder,VAR.thunder*1.8);flashA=1;setTimeout(()=>{if(!cleaned&&!mg._ended)se('noise');},rnd(300,1200));}
      flashA=Math.max(0,flashA-dt*3.2);
      const fl=flashA>0?(Math.sin(flashA*30)>0?flashA:flashA*.3):0;
      hemi.intensity=.9+fl*5;el.flash.style.opacity=(fl*.35).toFixed(3);
      hitFlash=Math.max(0,hitFlash-dt*2.2);el.hit.style.opacity=hitFlash.toFixed(3);
      // カメラ
      const cineT=phase==='title'||phase==='intro'?time*.18:null;
      let cx,cz,cy,lx,lz,ly;
      if(cineT!==null){
        trackAt(P.s,P.d,tp);const a=cineT+.8,r=4.4;
        const fx=Math.sin(tp.h),fz=-Math.cos(tp.h),rx=Math.cos(tp.h),rz=Math.sin(tp.h);
        cx=tp.x+(fx*Math.cos(a)+rx*Math.sin(a))*r;cz=tp.z+(fz*Math.cos(a)+rz*Math.sin(a))*r;cy=1.3+Math.sin(time*.3)*.3;
        lx=tp.x;lz=tp.z;ly=1.0;
      }else if(phase==='count'){
        const t=clamp(phT/4.2,0,1),e=t*t*(3-2*t);
        trackAt(P.s,P.d,tp);const a=(1-e)*2.3,r=4.4+e*1.0;
        const fx=Math.sin(tp.h),fz=-Math.cos(tp.h),rx=Math.cos(tp.h),rz=Math.sin(tp.h);
        cx=tp.x+(-fx*Math.cos(a)+rx*Math.sin(a))*r;cz=tp.z+(-fz*Math.cos(a)+rz*Math.sin(a))*r;cy=1.3+e*1.05;
        trackAt(P.s+e*10,P.d*.6,tp2);lx=tp2.x;lz=tp2.z;ly=1.0;
      }else if(phase==='ending'||phase==='goal'&&phT>.6){
        trackAt(P.s,P.d,tp);const a=1.1+Math.min(1,phT*.4)*.5+time*.05,r=5.2;
        const fx=Math.sin(tp.h),fz=-Math.cos(tp.h),rx=Math.cos(tp.h),rz=Math.sin(tp.h);
        cx=tp.x+(fx*Math.cos(a)+rx*Math.sin(a))*r;cz=tp.z+(fz*Math.cos(a)+rz*Math.sin(a))*r;cy=1.6;
        lx=tp.x;lz=tp.z;ly=1.1;
      }else{
        const back=5.0+P.v*.035;
        trackAt(P.s-back,P.d*.78,tp);cx=tp.x;cz=tp.z;cy=2.15+P.v*.01;
        trackAt(P.s+11,P.d*.55+P.drift*.2,tp2);lx=tp2.x;lz=tp2.z;ly=1.0;
      }
      const a=1-Math.exp(-dt*(phase==='play'||phase==='crashed'?7.5:3.2));
      camPos.x+=(cx-camPos.x)*a;camPos.y+=(cy-camPos.y)*a;camPos.z+=(cz-camPos.z)*a;
      camLook.x+=(lx-camLook.x)*Math.min(1,a*1.4);camLook.y+=(ly-camLook.y)*Math.min(1,a*1.4);camLook.z+=(lz-camLook.z)*Math.min(1,a*1.4);
      shake=Math.max(0,shake-dt*2.6);
      const sh=shake*shake*.35+(phase==='play'?P.v*.0007:0);
      camera.position.set(camPos.x+(Math.random()-.5)*sh,camPos.y+(Math.random()-.5)*sh,camPos.z+(Math.random()-.5)*sh);
      camera.lookAt(camLook);
      if(phase==='play')camera.rotateZ(-P.steer*.035-P.latV*.004);
      fovKick*=Math.exp(-dt*2.2);
      const fov=(camera.userData.baseFov||58)+16*(P.v/VMAX)**2+fovKick;
      if(Math.abs(fov-camera.fov)>.05){camera.fov=fov;camera.updateProjectionMatrix();}
      // 追従物
      ground.position.set(camera.position.x,-.03,camera.position.z);
      sky.position.x=camera.position.x;sky.position.z=camera.position.z;clouds.position.x=camera.position.x;clouds.position.z=camera.position.z;
      clouds.material.map.offset.x+=dt*.002;
      // 雨（カメラに向かって流れる）
      const R=rain.userData.d,vz=P.v*.9+2,vy=-17,vx=1.2,sl=.03;
      for(let i=0;i<rainN;i++){
        let x=R[i*3]+vx*dt,y=R[i*3+1]+vy*dt,z=R[i*3+2]+vz*dt;
        if(y<-5){y+=14;x=rnd(-13,13);}if(z>1){z-=39;x=rnd(-13,13);}if(x>13)x-=26;
        R[i*3]=x;R[i*3+1]=y;R[i*3+2]=z;
        rainPos[i*6]=x;rainPos[i*6+1]=y;rainPos[i*6+2]=z;rainPos[i*6+3]=x-vx*sl;rainPos[i*6+4]=y-vy*sl;rainPos[i*6+5]=z-vz*sl*1.4;
      }
      rain.geometry.attributes.position.needsUpdate=true;
      // スピード線
      const so=clamp((P.v-20)/10,0,1)*.42+clamp(fovKick/12,0,1)*.3;
      speedL.material.opacity=so;speedL.visible=so>.01;
      if(speedL.visible){const D=speedL.userData.d,ln=.8+P.v*.08;
        D.forEach((o,i)=>{o.z+=P.v*2.2*dt;if(o.z>-1){o.z=rnd(-32,-18);const an=Math.random()*TAU,r=rnd(1.6,3.6);o.x=Math.cos(an)*r;o.y=Math.sin(an)*r*.75;}
          speedPos[i*6]=o.x;speedPos[i*6+1]=o.y;speedPos[i*6+2]=o.z;speedPos[i*6+3]=o.x*1.03;speedPos[i*6+4]=o.y*1.03;speedPos[i*6+5]=o.z-ln;});
        speedL.geometry.attributes.position.needsUpdate=true;}
    }

    function updateHud(dt){
      hudT-=dt;
      if(hudT>0)return;hudT=.06;
      const kmh=Math.round(P.v*KMH);
      el.spd.textContent=kmh;el.gauge.style.setProperty('--p',(P.v/VMAX).toFixed(3));
      if(!late){el.tmB.textContent=rem.toFixed(1);el.tm.classList.toggle('hurry',rem<10);el.tm.classList.remove('late');el.tmL.textContent='打刻まで';}
      else{el.tmB.textContent='+'+lateT.toFixed(1);el.tm.classList.add('late');el.tm.classList.remove('hurry');el.tmL.textContent='遅刻';}
      const pr2=clamp(P.s/GOAL,0,1)*100;el.fl.style.width=pr2+'%';el.me.style.left=pr2+'%';
      el.dmg.style.width=P.dmg+'%';
      el.cr.innerHTML='✕'.repeat(P.crashes)+'<u>'+'✕'.repeat(Math.max(0,3-P.crashes))+'</u>';
      const g=SIGS.find(g=>g.stop-P.s>-2&&g.stop-P.s<170&&(g.trig||g.state!=='green'));
      if(g&&phase==='play'){
        el.sig.classList.add('on');el.sig.classList.toggle('red',g.state==='red'&&g.stop-P.s>0);
        el.sigL[0].classList.toggle('on',g.state==='green');el.sigL[1].classList.toggle('on',g.state==='yellow');el.sigL[2].classList.toggle('on',g.state==='red');
        const dd=Math.max(0,Math.round(g.stop-P.s));
        el.sigTx.textContent=g.state==='red'?(dd>0?`止まれ ${dd}m`:'待機…'):g.state==='yellow'?`黄信号 ${dd}m`:'青 進め';
      }else el.sig.classList.remove('on');
      {trackAt(GOAL+40,0,tp2);trackAt(P.s,P.d,tp);const dx=tp2.x-tp.x,dz=tp2.z-tp.z;const ang=Math.atan2(dx,-dz)-(tp.h+P.yawRel);
        el.nav.style.transform=`rotate(${(ang-Math.PI/2).toFixed(3)}rad)`;const rest=Math.max(0,GOAL-P.s);el.navT.textContent=rest>950?`工場まで ${(rest/1000).toFixed(1)}km`:`工場まで ${Math.round(rest)}m`;
        let kk=0;for(let a=25;a<=85;a+=15)kk+=curvAt(P.s+a);kk/=5;
        const on=Math.abs(kk)>.0025&&phase==='play';el.curve.classList.toggle('on',on);
        if(on){const n=Math.abs(kk)>.0045?3:2;el.curve.innerHTML=kk>0?`<small>右カーブ</small>${'&gt;'.repeat(n)}`:`${'&lt;'.repeat(n)}<small>左カーブ</small>`;}}
      el.hl.classList.toggle('on',input.l||touch.l>0);el.hr.classList.toggle('on',input.r||touch.r>0);
      scoreT-=.06;
      if(scoreT<=0){scoreT=.25;
        mg.setScore(`${Math.round(Math.min(P.s,GOAL))}m / ${GOAL}m　💥${P.crashes}/3`);
        mg.setTimer(late?`遅刻 +${lateT.toFixed(0)}s`:phase==='play'||phase==='crashed'?`残り ${Math.ceil(rem)}s`:'');
      }
    }
    function updateMsgs(dt){for(let i=msgs.length-1;i>=0;i--){msgs[i].t-=dt;if(msgs[i].t<=0){msgs[i].e.remove();msgs.splice(i,1);}}}

    // 動的解像度：重い端末では描画解像度を下げる（自動テスト時は固定）
    let perfAcc=0,perfN=0;
    function adapt(dt){
      if(navigator.webdriver)return;
      perfAcc+=dt;perfN++;
      if(perfAcc>2){const avg=perfAcc/perfN;perfAcc=0;perfN=0;
        if(avg>.024&&pr>.75){pr=Math.max(.75,pr-.25);renderer.setPixelRatio(pr);resize();}}
    }

    function frame(dt){
      if(mg._ended||cleaned){cleanup();return;}
      if(!renderer)return;
      dt=dt>0?dt:0;   // 初回フレームはrAFの時刻が開始時より前になることがある
      time+=dt;
      if(dlg&&dlg.shown<dlg.full.length){dlg.shown=Math.min(dlg.full.length,dlg.shown+dt*38);dlg.ln.textContent=dlg.full.slice(0,Math.floor(dlg.shown));}
      if(phase==='count')updateCount(dt);
      else if(phase==='play')updatePlay(dt);
      else if(phase==='crashed')updateCrash(dt);
      else if(phase==='goal')updateGoal(dt);
      else if(phase==='ending'){phT+=dt;P.v=Math.max(0,P.v-10*dt);P.s+=P.v*dt;}
      if(cleaned||!renderer)return;
      updateSignals(dt);updateCars(dt);
      updateWorld(false);
      renderCars();updateSpray(dt);updateVisuals(dt);updateHud(dt);updateMsgs(dt);audioUpdate();adapt(dt);
      renderer.render(scene,camera);
    }


    return {
      result(reason){
        const r=reason||'quit';
        cleanup();
        RD.plays=(RD.plays|0)+1;
        let newBest=false;
        if(r==='ontime'){RD.ontime=(RD.ontime|0)+1;if(RD.best==null||finishT<RD.best){RD.best=Math.round(finishT*10)/10;newBest=true;}RD.lastVar=VAR.key;}
        else if(r==='late')RD.lastVar=VAR.key;
        if(grade)RD.lastGrade=grade;
        const stats=`車体ダメージ <span class="${P.dmg>40?'down':'up'}">${Math.round(P.dmg)}%</span>　信号無視 <span class="${P.reds?'down':'up'}">${P.reds}</span>　転倒 <span class="${P.crashes?'down':'up'}">${P.crashes}</span>`;
        if(r==='ontime')return {
          title:`🛵 打刻成功！ 評価 ${grade||'B'}`,
          summary:`${VAR.name}の夜道を走りきった。<br>タイム <span class="up">${fmtT(finishT)}</span>${newBest?' <span class="up">NEW BEST!</span>':`（ベスト ${fmtT(RD.best)}）`}　余裕 <span class="up">${rem.toFixed(1)}秒</span><br>${stats}`,
          fx:{jobRep:6,mental:3,fatigue:6},time:30,sp:1,
          log:`雨の夜、原付で夜勤に滑り込んだ（評価${grade||'B'}・${fmtT(finishT)}）。`,
          cutin:['happy','……間に合ったわ。今夜も設備は止めないわよ。'],
        };
        if(r==='late')return {
          title:'🛵 遅刻……',
          summary:`工場に着いたのは22:00を過ぎてから。遅刻 <span class="down">+${lateT.toFixed(1)}秒</span><br>${stats}`,
          fx:{jobRep:-3,mental:-2,fatigue:6},time:30,sp:0,
          log:'夜勤に遅刻した。班長に頭を下げた。',
          cutin:['tired','……遅刻。次は配信を早めに切り上げるわ。'],
        };
        if(r==='crash')return {
          title:'🛵 転倒……修理送り',
          summary:`雨の路面で3度目の転倒。原付は修理に出すことに。<br>走行 <span class="down">${Math.round(Math.min(P.s,GOAL))}m</span> / ${GOAL}m<br>${stats}`,
          fx:{jobRep:-2,mental:-5,fatigue:8,money:-3000},time:40,sp:0,
          log:'原付で転倒し、夜勤に遅れた。修理代がかかった。',
          cutin:['tired','……体は無事。でも修理代が痛いわね。'],
        };
        return {
          title:'🛵 引き返した',
          summary:'今夜はタクシーを呼んだ。……財布が痛い、けど安全第一。',
          fx:{fatigue:2},time:15,sp:0,
          log:'原付で出るのをやめた。',cutin:null,
        };
      },
      // 自動テスト用の内部状態参照（ゲーム進行には使わない）
      _dbg:{get P(){return P;},get phase(){return phase;},get rem(){return rem;},get late(){return late;},get cars(){return cars;},SIGS,CPS,get puddles(){return puddles;},GOAL,
        get info(){return renderer?renderer.info.render:null;},get scene(){return scene;},get camera(){return camera;},input,touch,advance:()=>advance(),skip:()=>{if(phase==='count')phT=4.39;else if(phase==='goal')phT=1.79;},get VAR(){return VAR;}},
    };
  },
});
