// ══════════════════════════════════════════════════════════
// 経営シミュレーション「チャンネル運営会議」
// 来週の配信スケジュール（月〜日）に企画カードを並べ、時間帯を決めて「放送開始」。
// 1週間を夜ごとにシミュレーションし、最後に通信簿（S〜D）を出す。
// 隠しルール（遊ぶと「気づき」としてメモに残る）:
//   ・客層との相性（スキル・資格知識・仕事評価＋セーブごとの隠し嗜好）
//   ・同じ企画の繰り返しで新鮮さ低下 ／ 連続配信で疲労が加速（休みでリセット）
//   ・シナジー（告知→コラボ/歌枠、怪談→ラジオ、工場↔資格、休み→歌枠/コラボ）
//   ・時間帯（怪談・ラジオは2時、歌枠・ゲームは22時、0時は全体に少し強い）
//   ・今週のトレンド企画は×1.5
// 過去の通信簿と気づきは gs.managerData に保存する。
// ══════════════════════════════════════════════════════════
addMinigameStyle('manager',`
.mg-manager{padding:0;}
.mgr-root{position:relative;flex:1;min-height:0;width:100%;display:flex;flex-direction:column;font-family:var(--dot);color:var(--tx);user-select:none;-webkit-user-select:none;
  background:radial-gradient(120% 60% at 50% 0%,rgba(138,82,212,.13),transparent 60%),linear-gradient(180deg,#07051a,#05040e);}
.mgr-root button{font-family:var(--dot);-webkit-tap-highlight-color:transparent;cursor:pointer;}
.mgr-plan,.mgr-sim{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;padding:7px 9px 8px;}
.mgr-top{display:flex;gap:6px;align-items:stretch;}
.mgr-trend{flex:1;display:flex;align-items:center;gap:7px;padding:5px 9px;border:1px solid rgba(232,184,48,.4);border-radius:4px;background:linear-gradient(90deg,rgba(232,184,48,.13),rgba(232,184,48,.02));min-width:0;}
.mgr-trend small{font-family:var(--mono);font-size:.56rem;color:var(--gd);letter-spacing:.08em;display:block;line-height:1.1;}
.mgr-trend b{font-weight:normal;color:var(--tx-b);font-size:.8rem;white-space:nowrap;}
.mgr-trend .fire{font-size:1.1rem;animation:mgrFlick 1.4s ease-in-out infinite;}
@keyframes mgrFlick{0%,100%{transform:scale(1);filter:drop-shadow(0 0 3px #e8b830)}50%{transform:scale(1.12);filter:drop-shadow(0 0 8px #e83055)}}
.mgr-memo-btn{min-width:48px;min-height:44px;border:1px solid rgba(138,82,212,.5);background:rgba(138,82,212,.1);color:var(--tx-b);border-radius:4px;font-size:.66rem;line-height:1.2;padding:2px 6px;}
.mgr-kpis{display:flex;gap:5px;}
.mgr-kpi{flex:1;border:1px solid rgba(0,232,200,.16);background:rgba(0,232,200,.035);border-radius:4px;padding:3px 7px;min-width:0;}
.mgr-kpi small{display:block;font-family:var(--mono);font-size:.53rem;color:var(--tx-d);letter-spacing:.05em;white-space:nowrap;}
.mgr-kpi b{font-weight:normal;font-family:var(--mono);font-size:.78rem;color:var(--tx-b);}
.mgr-kpi .bar{height:4px;border-radius:2px;background:rgba(255,255,255,.06);margin-top:2px;overflow:hidden;}
.mgr-kpi .bar i{display:block;height:100%;border-radius:2px;background:var(--gn);transition:width .3s,background .3s;}
.mgr-board{display:flex;flex-direction:column;gap:4px;flex:1;min-height:0;}
.mgr-row{display:flex;gap:5px;align-items:stretch;flex:1;min-height:44px;max-height:58px;}
.mgr-day{width:30px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:4px;background:rgba(255,255,255,.03);font-size:.8rem;color:var(--tx-b);line-height:1;}
.mgr-day small{font-family:var(--mono);font-size:.5rem;color:var(--tx-d);margin-top:3px;}
.mgr-day.we{color:#ff8fb0;}
.mgr-slot{position:relative;flex:1;min-width:0;border:1px dashed rgba(138,82,212,.42);border-radius:5px;display:flex;align-items:center;gap:8px;padding:0 9px;background:rgba(138,82,212,.04);transition:border-color .15s,background .15s,transform .15s;touch-action:none;overflow:hidden;}
.mgr-slot .ph{font-size:.62rem;color:var(--tx-d);letter-spacing:.05em;}
.mgr-slot.hot{border-color:var(--cy);border-style:solid;background:rgba(0,232,200,.1);transform:scale(1.015);}
.mgr-slot.armed{border-color:rgba(0,232,200,.6);}
.mgr-slot.full{border-style:solid;border-color:var(--c);background:linear-gradient(90deg,color-mix(in srgb,var(--c) 26%,transparent),rgba(10,7,22,.6) 75%);box-shadow:inset 3px 0 0 var(--c);}
.mgr-slot .ic{font-size:1.15rem;filter:drop-shadow(0 0 5px var(--c));}
.mgr-slot .nm{font-size:.76rem;color:var(--tx-b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.mgr-slot .ft{position:absolute;left:0;bottom:0;height:2px;background:var(--gn);opacity:.85;transition:width .3s,background .3s;}
.mgr-slot.pop{animation:mgrPop .28s ease-out;}
@keyframes mgrPop{0%{transform:scale(.94)}60%{transform:scale(1.03)}100%{transform:scale(1)}}
.mgr-slot.shake{animation:mgrShake .3s;}
@keyframes mgrShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
.mgr-band{width:50px;border:1px solid rgba(0,232,200,.3);background:rgba(0,232,200,.05);color:var(--cy);border-radius:5px;font-family:var(--mono)!important;font-size:.74rem;line-height:1.05;padding:0;}
.mgr-band small{display:block;font-size:.5rem;color:var(--tx-d);}
.mgr-band:disabled{opacity:.25;cursor:default;}
.mgr-band.b2{color:#9fa8ff;border-color:rgba(130,140,255,.45);background:rgba(90,100,255,.07);}
.mgr-band.b0{color:var(--gd);border-color:rgba(232,184,48,.4);background:rgba(232,184,48,.06);}
.mgr-tray{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;}
.mgr-card{position:relative;min-height:50px;border:1px solid color-mix(in srgb,var(--c) 60%,transparent);border-radius:6px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 22%,#0b0820),#0a0716 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:3px 1px;touch-action:none;transition:transform .12s,box-shadow .12s;color:var(--tx-b);}
.mgr-card .ic{font-size:1.1rem;line-height:1.1;}
.mgr-card .nm{font-size:.54rem;letter-spacing:-.02em;white-space:nowrap;}
.mgr-card .lim{position:absolute;top:-5px;right:-4px;font-family:var(--mono);font-size:.55rem;background:var(--c);color:#05040e;border-radius:8px;padding:0 5px;line-height:1.45;}
.mgr-card.sel{transform:translateY(-3px);box-shadow:0 0 0 2px var(--cy),0 0 14px rgba(0,232,200,.45);}
.mgr-card.out{opacity:.3;filter:grayscale(.7);}
.mgr-card:hover{box-shadow:0 0 10px color-mix(in srgb,var(--c) 50%,transparent);}
.mgr-ghost{position:fixed;z-index:9999;pointer-events:none;width:70px;min-height:50px;transform:translate(-50%,-60%) rotate(-4deg) scale(1.08);box-shadow:0 8px 22px rgba(0,0,0,.6),0 0 16px color-mix(in srgb,var(--c) 60%,transparent);opacity:.95;}
.mgr-go{min-height:50px;border-radius:6px;border:1px solid var(--rd);background:linear-gradient(90deg,rgba(232,48,85,.32),rgba(138,82,212,.32));color:#fff;font-size:.95rem;letter-spacing:.15em;box-shadow:0 0 18px rgba(232,48,85,.35);display:flex;align-items:center;justify-content:center;gap:8px;}
.mgr-go:disabled{opacity:.4;box-shadow:none;cursor:default;}
.mgr-go .dot{width:9px;height:9px;border-radius:50%;background:#ff3b5c;box-shadow:0 0 8px #ff3b5c;animation:mgrBlink 1s steps(2) infinite;}
@keyframes mgrBlink{50%{opacity:.2}}
.mgr-hint{font-size:.58rem;color:var(--tx-d);text-align:center;min-height:1em;}
.mgr-hint.warn{color:var(--rd);}
/* overlay */
.mgr-ov{position:absolute;inset:0;z-index:20;background:rgba(5,4,14,.86);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:12px;animation:mgrFade .25s;}
@keyframes mgrFade{from{opacity:0}to{opacity:1}}
.mgr-box{width:100%;max-width:400px;max-height:100%;overflow-y:auto;background:var(--panel);border:1px solid var(--pu);border-radius:8px;padding:14px 14px 12px;box-shadow:0 0 30px rgba(138,82,212,.3);}
.mgr-box h3{margin:0 0 8px;font-weight:normal;font-size:1rem;color:var(--tx-b);letter-spacing:.08em;}
.mgr-box .sub{font-family:var(--mono);font-size:.58rem;color:var(--cy);letter-spacing:.15em;}
.mgr-box ul{margin:6px 0;padding-left:1.1em;font-size:.7rem;line-height:1.75;font-family:var(--serif);}
.mgr-box li b{color:var(--tx-b);font-weight:normal;font-family:var(--dot);}
.mgr-note{font-size:.66rem;line-height:1.7;border-left:2px solid var(--gd);padding:3px 8px;margin:8px 0;background:rgba(232,184,48,.05);font-family:var(--serif);}
.mgr-note b{color:var(--gd);font-weight:normal;font-family:var(--dot);}
.mgr-btn{display:block;width:100%;min-height:48px;margin-top:10px;border-radius:6px;border:1px solid var(--cy);background:rgba(0,232,200,.1);color:var(--cy);font-size:.88rem;letter-spacing:.1em;}
.mgr-btn.ghost{border-color:rgba(138,82,212,.5);background:rgba(138,82,212,.08);color:var(--tx);font-size:.74rem;min-height:44px;margin-top:6px;}
.mgr-found{font-size:.66rem;line-height:1.6;padding:4px 0;border-bottom:1px dashed rgba(138,82,212,.2);font-family:var(--serif);}
.mgr-found.new{color:var(--tx-b);}
.mgr-found .nw{font-family:var(--mono);font-size:.52rem;background:var(--gd);color:#05040e;border-radius:2px;padding:0 4px;margin-left:4px;}
.mgr-past{width:100%;border-collapse:collapse;font-size:.64rem;margin-top:4px;}
.mgr-past td,.mgr-past th{padding:4px 3px;border-bottom:1px solid rgba(138,82,212,.15);text-align:left;font-weight:normal;}
.mgr-past th{font-family:var(--mono);font-size:.54rem;color:var(--tx-d);}
.mgr-past .pl{letter-spacing:-.05em;}
.mgr-g{font-family:var(--mono);font-size:.8rem;}
.mgr-gS{color:var(--gd);text-shadow:0 0 6px rgba(232,184,48,.6);} .mgr-gA{color:var(--cy);} .mgr-gB{color:#b48cf0;} .mgr-gC{color:var(--tx);} .mgr-gD{color:var(--rd);}
/* sim */
.mgr-mon{position:relative;flex:0 0 auto;height:clamp(190px,36vh,290px);border-radius:7px;overflow:hidden;border:1px solid rgba(138,82,212,.35);box-shadow:0 0 20px rgba(138,82,212,.18);}
.mgr-mon canvas,.mgr-chart canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
.mgr-chat{position:absolute;right:6px;bottom:6px;width:52%;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none;}
.mgr-bub{max-width:100%;background:rgba(8,6,20,.82);border:1px solid rgba(138,82,212,.45);border-radius:9px 9px 2px 9px;padding:3px 8px;font-size:.6rem;line-height:1.45;color:var(--tx-b);animation:mgrBub .3s ease-out;transition:opacity .4s,transform .4s;}
.mgr-bub i{font-style:normal;color:var(--tx-d);font-size:.52rem;display:block;}
.mgr-bub.sc{border-color:var(--gd);background:rgba(60,44,8,.85);}
@keyframes mgrBub{from{opacity:0;transform:translateY(10px) scale(.9)}to{opacity:1;transform:none}}
.mgr-evt{position:absolute;left:50%;top:38%;transform:translate(-50%,-50%);z-index:3;padding:6px 12px;border-radius:5px;font-size:.74rem;white-space:nowrap;background:rgba(5,4,14,.9);border:1px solid var(--c,#e8b830);color:var(--tx-b);box-shadow:0 0 16px color-mix(in srgb,var(--c,#e8b830) 50%,transparent);animation:mgrEvt 1.9s ease-out forwards;pointer-events:none;}
@keyframes mgrEvt{0%{opacity:0;transform:translate(-50%,-30%) scale(.8)}12%{opacity:1;transform:translate(-50%,-50%) scale(1.04)}20%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-80%)}}
.mgr-week{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
.mgr-wd{border:1px solid rgba(138,82,212,.25);border-radius:4px;padding:2px 0 3px;text-align:center;background:rgba(255,255,255,.02);transition:all .25s;min-height:46px;}
.mgr-wd .d{font-size:.56rem;color:var(--tx-d);}
.mgr-wd .i{font-size:.95rem;line-height:1.2;}
.mgr-wd .r{font-family:var(--mono);font-size:.56rem;color:var(--tx-d);min-height:.9em;}
.mgr-wd.now{border-color:var(--cy);background:rgba(0,232,200,.08);box-shadow:0 0 10px rgba(0,232,200,.25);transform:translateY(-2px);}
.mgr-wd.done .r{color:var(--gn);}
.mgr-wd.done.bad .r{color:var(--rd);}
.mgr-chart{position:relative;flex:1;min-height:150px;border-radius:7px;border:1px solid rgba(0,232,200,.12);background:rgba(4,3,12,.6);touch-action:none;}
.mgr-ctrl{display:flex;gap:6px;}
.mgr-ctrl button{flex:1;min-height:44px;border-radius:5px;border:1px solid rgba(0,232,200,.35);background:rgba(0,232,200,.06);color:var(--cy);font-size:.72rem;}
.mgr-ctrl button.on{background:rgba(0,232,200,.2);}
/* report */
.mgr-rep{border-color:var(--gc,#8a52d4);box-shadow:0 0 34px color-mix(in srgb,var(--gc,#8a52d4) 35%,transparent);}
.mgr-rep-hd{display:flex;align-items:center;gap:12px;}
.mgr-stamp{width:78px;height:78px;flex:0 0 78px;border-radius:50%;border:3px solid var(--gc);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:2.6rem;color:var(--gc);text-shadow:0 0 14px var(--gc);box-shadow:0 0 18px color-mix(in srgb,var(--gc) 45%,transparent),inset 0 0 14px color-mix(in srgb,var(--gc) 30%,transparent);transform:rotate(-10deg);animation:mgrStamp .55s cubic-bezier(.2,1.6,.4,1) both .15s;}
@keyframes mgrStamp{from{opacity:0;transform:rotate(-30deg) scale(2.6)}to{opacity:1;transform:rotate(-10deg) scale(1)}}
.mgr-rep-hd p{margin:3px 0 0;font-size:.68rem;line-height:1.6;font-family:var(--serif);}
.mgr-stats{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:10px 0 6px;}
.mgr-stat{border:1px solid rgba(138,82,212,.25);border-radius:5px;padding:5px 8px;background:rgba(138,82,212,.05);}
.mgr-stat small{display:block;font-size:.56rem;color:var(--tx-d);font-family:var(--mono);}
.mgr-stat b{font-weight:normal;font-family:var(--mono);font-size:1.05rem;color:var(--tx-b);}
.mgr-sec{font-family:var(--mono);font-size:.56rem;color:var(--cy);letter-spacing:.14em;margin-top:9px;}
`);

(()=>{
const FONT='"DotGothic16", monospace';
const MONO='"Share Tech Mono", monospace';
const DAYS=['月','火','水','木','金','土','日'];
const BANDS=['22時','0時','2時'];
const T={
  zatsu:  {n:'深夜雑談',     s:'雑談',  ic:'💬',c:'#a77ef0',fat:9},
  kaidan: {n:'怪談',         s:'怪談',  ic:'👻',c:'#6fa8ff',fat:10},
  uta:    {n:'歌枠',         s:'歌枠',  ic:'🎤',c:'#ff6fa8',fat:12},
  game:   {n:'ゲーム実況',   s:'ゲーム',ic:'🎮',c:'#44ee88',fat:11},
  study:  {n:'資格勉強配信', s:'資格',  ic:'📘',c:'#e8b830',fat:8},
  factory:{n:'工場トーク',   s:'工場',  ic:'🏭',c:'#ff9a3c',fat:9},
  radio:  {n:'深夜ラジオ',   s:'ラジオ',ic:'📻',c:'#00e8c8',fat:8},
  collab: {n:'コラボ',       s:'コラボ',ic:'🤝',c:'#e83055',fat:15,lim:1},
  short:  {n:'告知ショート動画',s:'告知',ic:'📣',c:'#deccf8',fat:4,lim:2},
  rest:   {n:'休み',         s:'休み',  ic:'💤',c:'#5e5078',fat:-28},
};
const KEYS=Object.keys(T);
const STREAMS=['zatsu','kaidan','uta','game','study','factory','radio'];
const isStream=t=>t&&t!=='short'&&t!=='rest';
const FOUND={
  trend:      '🔥 今週のトレンド企画は大きく伸びる（×1.5）',
  short_big:  '📣 告知の翌日のコラボ・歌枠はぐっと伸びる',
  short:      '📣 告知ショートの翌日は、配信が少し伸びる',
  repeat:     '🔁 同じ企画を繰り返すと新鮮さが落ちる（連日だとさらに）',
  streak:     '😪 連続配信が続くほど疲れがたまる。休みでリセット',
  sleep:      '💤 疲労が限界に近いと、配信中に寝落ちする',
  tired:      '🥱 疲労が55を超えると配信の質が落ちていく',
  kaidan_radio:'👻→📻 怪談の翌日のラジオは「余韻」で伸びる',
  work:       '🏭↔📘 工場トークと資格勉強は続けると相性がいい',
  rest_fresh: '💤→🎤 休みの翌日の歌枠・コラボは調子がいい',
  late:       '🌙 怪談と深夜ラジオは2時が刺さる',
  early:      '🕙 歌枠とゲーム実況は22時のほうが見られる',
  midnight:   '🕛 0時はリスナーが一番多い時間帯（少し疲れる）',
  late_bad:   '🌑 2時の配信は人が少なく、疲れも大きい',
};
const CHAT={
  zatsu:['こんばんは〜','今日もおつかれさま','わかるｗ','その話もっと聞きたい','寝る前に寄った'],
  kaidan:['こわ…','後ろ振り向けない','ひえっ','電気つけたわ','今日の話やばい'],
  uta:['声きれい','888888','鳥肌たった','もう一曲！','泣いた'],
  game:['そこ右！','うますぎ','ｗｗｗ','今のは惜しい','ナイス！'],
  study:['一緒に勉強してます','電験わかる','ノート取った','がんばれ〜','その公式忘れてた'],
  factory:['設備保全あるある','うちの工場も','ベアリングの話好き','現場の人だ','異音の話こわい'],
  radio:['この時間落ち着く','作業BGMにしてる','ラジオネームで投稿した','声が眠気に効く','ふつおた読んで'],
  collab:['コラボ助かる','相方さんから来ました','てぇてぇ','掛け合い最高','初見です！'],
};
const NAMES=['夜空の旅人','ひとりぼっち','深夜の常連','さくら','ななし','初見さん'];
const TIRED_CHAT=['眠そう？','無理しないでね','今日は早めに寝て','声かすれてない？'];
const GRADE_C={S:'#e8b830',A:'#00e8c8',B:'#a77ef0',C:'#bbaedd',D:'#e83055'};
const REWARD={
  S:{followers:15,streamPop:6,mental:2,fatigue:4},
  A:{followers:10,streamPop:4,fatigue:4},
  B:{followers:6,streamPop:2,fatigue:4},
  C:{followers:2,mental:-2,fatigue:4},
  D:{followers:2,mental:-2,fatigue:4},
};
const gradeOf=s=>s>=8.6?'S':s>=7.3?'A':s>=5.8?'B':s>=3.6?'C':'D';

// ── 客層との相性（gs から計算）──
function affinity(g,taste){
  const sk=(g.skills)||{};
  const base={
    zatsu:.95+(sk.chatSkill||0)*.05,
    kaidan:.85+(sk.kaidanSkill||0)*.065,
    uta:.8+(sk.singSkill||0)*.07-((g.throatFatigue||0)>60?.2:0),
    game:1.0,
    study:.75+(g.certKnow||0)*.006,
    factory:.75+(g.jobRep||0)*.006,
    radio:.85+(sk.radioVibe||0)*.06,
    collab:1.25,
  };
  const a={};
  Object.keys(base).forEach(k=>{a[k]=Math.max(.55,Math.min(1.6,base[k]+((taste&&taste[k])||0)));});
  return a;
}

// ── 1週間のシミュレーション（純関数・乱数は rnd）──
// plan: [{t,b}]×7  env: {aff,trend,startFat,base,fix,flame,rnd}
function simulate(plan,env){
  const rnd=env.rnd||Math.random;
  let F=env.startFat,streak=0,score=0;
  const nights=[],found=new Set(),cnt={};
  for(let i=0;i<7;i++){
    const {t,b}=plan[i];const prev=i?plan[i-1].t:null;
    const n={i,t,b,q:0,mult:[],evt:null,fat0:F,peak:0,views:0};
    if(t==='rest'){
      F=Math.max(0,F-28);streak=0;
      if(rnd()<.35){n.evt={txt:'子どもと一緒に早寝した 🌙',c:'#44ee88',good:true};F=Math.max(0,F-6);}
      n.fat=F;nights.push(n);continue;
    }
    if(t==='short'){
      F=Math.min(100,F+T.short.fat);
      n.q=.3;score+=.3;n.fat=F;n.views=Math.round(env.base*(4+rnd()*3));
      nights.push(n);continue;
    }
    // 配信の夜
    let q=env.aff[t];
    n.mult.push(['客層との相性',env.aff[t]]);
    let bm=b===1?1.12:b===2?.8:1;
    if(b===2&&(t==='kaidan'||t==='radio')){bm=1.35;found.add('late');}
    else if(b===0&&(t==='uta'||t==='game')){bm=1.15;found.add('early');}
    else if(b===1)found.add('midnight');
    else if(b===2)found.add('late_bad');
    if(bm!==1)n.mult.push([BANDS[b]+'の時間帯',bm]);
    q*=bm;
    const c=cnt[t]||0;cnt[t]=c+1;
    if(c>0){let nv=Math.max(.45,1-.2*c);if(prev===t)nv*=.9;q*=nv;n.mult.push(['新鮮さ低下',nv]);found.add('repeat');}
    let sy=1,syl='';
    if(prev==='short'){if(t==='collab'||t==='uta'){sy=1.45;found.add('short_big');}else{sy=1.15;found.add('short');}syl='告知の効果';}
    else if(prev==='kaidan'&&t==='radio'){sy=1.2;found.add('kaidan_radio');syl='怪談の余韻';}
    else if((prev==='study'&&t==='factory')||(prev==='factory'&&t==='study')){sy=1.15;found.add('work');syl='仕事つながり';}
    else if(prev==='rest'&&(t==='collab'||t==='uta')){sy=1.1;found.add('rest_fresh');syl='休み明けで絶好調';}
    if(sy!==1){q*=sy;n.mult.push([syl,sy]);}
    if(t===env.trend){q*=1.5;n.mult.push(['トレンド一致',1.5]);found.add('trend');}
    // 疲労
    const add=T[t].fat+streak*3+[0,3,7][b];
    if(streak>=3)found.add('streak');
    streak++;
    const Fmid=Math.min(100,F+add*.5);
    F=Math.min(100,F+add);
    if(Fmid>55){const fm=Math.max(.45,1-(Fmid-55)/70);q*=fm;n.mult.push(['疲れ',fm]);found.add('tired');}
    // イベント
    if(Fmid>=86){q*=.5;n.evt={txt:'途中で寝落ちしてしまった…',c:'#e83055',m:.5};found.add('sleep');}
    else{
      const r=rnd();
      if(r<.05){n.evt={txt:'切り抜きがバズった！',c:'#e8b830',m:1.35,good:true};}
      else if(r<.11){n.evt={txt:'さくらからスパチャ ¥500',c:'#e8b830',m:1.1,good:true,sc:'さくら'};}
      else if(r<.17){n.evt={txt:'深夜の常連が友達を連れてきた',c:'#44ee88',m:1.15,good:true};}
      else if(r<.21){n.evt={txt:'夜空の旅人が初見さんを案内',c:'#44ee88',m:1.12,good:true};}
      else if(r<.21+(b===0?.08:.03)){n.evt={txt:'子どもが起きてきた…中断',c:'#e83055',m:.85};}
      else if(r<.27+(b===0?.05:0)){
        const fx=env.fix>=3;n.evt={txt:fx?'回線落ち→設備保全の腕で即復旧':'回線が落ちた…',c:fx?'#e8b830':'#e83055',m:fx?.93:.8};
      }
      else if(r<.30+(b===0?.05:0)+Math.min(.08,(env.flame||0)*.002)){n.evt={txt:'荒らしが来た…',c:'#e83055',m:.85};}
      if(n.evt)q*=n.evt.m;
    }
    if(n.evt)n.mult.push([n.evt.good?'ハプニング（良）':'ハプニング',n.evt.m]);
    n.q=q;n.fat=F;
    n.peak=Math.max(1,Math.round(env.base*q*(.9+rnd()*.2)*(t==='collab'?1.25:1)));
    score+=q;
    nights.push(n);
  }
  let pen=0;
  if(F>70){pen=(F-70)*.04;}
  score=Math.max(0,score-pen);
  const grade=gradeOf(score);
  // 新規フォロワーを夜ごとに配分（合計＝評価の報酬）
  const total=REWARD[grade].followers;
  const w=nights.map(n=>n.q*(n.t==='collab'?1.3:1));
  const ws=w.reduce((a,b)=>a+b,0)||1;
  const raw=w.map(x=>x/ws*total),fl=raw.map(Math.floor);
  let left=total-fl.reduce((a,b)=>a+b,0);
  raw.map((x,i)=>[x-fl[i],i]).sort((a,b)=>b[0]-a[0]).forEach(([,i])=>{if(left>0&&w[i]>0){fl[i]++;left--;}});
  nights.forEach((n,i)=>n.gain=fl[i]);
  return {nights,score,pen,grade,found:[...found],endFat:F,peak:Math.max(0,...nights.map(n=>n.peak))};
}

function fatPreview(plan,start){
  let F=start,streak=0;const out=[];
  plan.forEach(p=>{
    if(!p.t){out.push(null);return;}
    if(p.t==='rest'){F=Math.max(0,F-28);streak=0;}
    else if(p.t==='short')F=Math.min(100,F+4);
    else{F=Math.min(100,F+T[p.t].fat+streak*3+[0,3,7][p.b]);streak++;}
    out.push(F);
  });
  return out;
}
const fatCol=f=>f>=80?'#e83055':f>=55?'#e8b830':'#44ee88';

registerMinigame({
  id:'manager',icon:'📈',name:'チャンネル運営会議',genre:'経営シミュレーション',
  desc:'来週7日分の配信企画をスケジュール表に並べて、1週間を早送りで見届ける。客層・トレンド・相性・疲れを読んで高評価を狙え。',
  effect:'フォロワー↑ 配信人気↑ 精神±（評価しだい） ／ 疲労+4 約50分',
  help:'カードをドラッグ／タップ→枠をタップ',
  bgm:'stream',
  _sim:simulate,_aff:affinity,
  start(body,mg){
    // ── 永続データ ──
    const md=gs.managerData=gs.managerData||{};
    if(!md.taste){
      md.taste={};
      Object.keys(T).filter(isStream).forEach(k=>{md.taste[k]=Math.round((Math.random()*.3-.15)*20)/20;});
    }
    md.reports=md.reports||[];md.found=md.found||[];
    const aff=affinity(gs,md.taste);
    const trend=STREAMS[Math.floor(Math.random()*STREAMS.length)];
    const startFat=Math.round(Math.max(0,Math.min(60,(gs.fatigue||0)*.45)));
    const base=6+(gs.followers||0)*.15+(gs.streamPop||0)*.45;
    const favs=STREAMS.slice().sort((a,b)=>aff[b]-aff[a]);
    const plan=DAYS.map(()=>({t:null,b:1}));
    let phase='intro',sel=null,planLeft=120,res=null,simDone=false,speed=1,saved=false;

    const root=document.createElement('div');root.className='mgr-root';body.appendChild(root);
    const imgs={};['sd_streamer','sd_tired','sd_normal'].forEach(k=>{const im=new Image();im.src='assets/img/'+k+'.webp';imgs[k]=im;});
    const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
    const used=(t,except)=>plan.filter((p,i)=>p.t===t&&i!==except).length;

    // ═════ 企画会議（プランニング画面）═════
    const pl=el('div','mgr-plan');root.appendChild(pl);
    const top=el('div','mgr-top');pl.appendChild(top);
    top.appendChild(el('div','mgr-trend',`<span class="fire">🔥</span><div><small>WEEKLY TREND</small><b>今週のトレンド：${T[trend].n}</b></div>`));
    const memoBtn=el('button','mgr-memo-btn','📝<br>メモ');top.appendChild(memoBtn);
    const kp=el('div','mgr-kpis');pl.appendChild(kp);
    kp.innerHTML=`<div class="mgr-kpi"><small>FOLLOWERS</small><b>${(gs.followers||0).toLocaleString()}</b></div>`+
      `<div class="mgr-kpi"><small>コラボ / 告知 残り</small><b class="k-bud"></b></div>`+
      `<div class="mgr-kpi"><small>週末の疲労 見込み</small><b class="k-fat"></b><div class="bar"><i class="k-fbar"></i></div></div>`;
    const board=el('div','mgr-board');pl.appendChild(board);
    const rows=DAYS.map((d,i)=>{
      const r=el('div','mgr-row');
      r.appendChild(el('div','mgr-day'+(i>=5?' we':''),`${d}<small>${['MON','TUE','WED','THU','FRI','SAT','SUN'][i]}</small>`));
      const s=el('div','mgr-slot');s.dataset.i=i;r.appendChild(s);
      const bb=el('button','mgr-band');r.appendChild(bb);
      bb.onclick=()=>{if(!isStream(plan[i].t))return;plan[i].b=(plan[i].b+1)%3;AU.se('tool');renderBoard();};
      board.appendChild(r);
      return {r,s,bb};
    });
    const tray=el('div','mgr-tray');pl.appendChild(tray);
    const cards={};
    KEYS.forEach(k=>{
      const c=el('div','mgr-card',`<span class="ic">${T[k].ic}</span><span class="nm">${T[k].s}</span>`+(T[k].lim?`<span class="lim"></span>`:''));
      c.style.setProperty('--c',T[k].c);c.dataset.k=k;tray.appendChild(c);cards[k]=c;
    });
    const hint=el('div','mgr-hint','');pl.appendChild(hint);
    const goBtn=el('button','mgr-go','<span class="dot"></span>放送開始');pl.appendChild(goBtn);

    let hintTo=null;
    function say(txt,warn){hint.textContent=txt;hint.classList.toggle('warn',!!warn);clearTimeout(hintTo);hintTo=setTimeout(()=>{if(!mg._ended)defaultHint();},2600);}
    function defaultHint(){
      const empty=plan.filter(p=>!p.t).length;
      hint.classList.remove('warn');
      hint.textContent=sel?`「${T[sel].n}」を置く曜日をタップ`:empty?`あと${empty}日ぶん企画を入れよう（タップした枠は空に戻る）`:'準備OK。時間帯ボタンで 22時/0時/2時 を切替';
    }
    function canPlace(k,i){return !T[k].lim||used(k,i)<T[k].lim;}
    function place(k,i,from){
      if(!canPlace(k,i)&&from==null){rows[i].s.classList.remove('shake');void rows[i].s.offsetWidth;rows[i].s.classList.add('shake');AU.se('warn');say(`${T[k].n}は今週${T[k].lim}回まで`,true);return false;}
      if(from!=null&&from!==i){const tmp=plan[i].t;plan[i].t=k;plan[from].t=tmp;}
      else plan[i].t=k;
      AU.se('decide');
      rows[i].s.classList.remove('pop');void rows[i].s.offsetWidth;rows[i].s.classList.add('pop');
      renderBoard();return true;
    }
    function renderBoard(){
      const fp=fatPreview(plan,startFat);
      rows.forEach(({s,bb},i)=>{
        const p=plan[i];
        s.classList.toggle('full',!!p.t);
        s.classList.toggle('armed',!!sel&&!p.t);
        if(p.t){
          s.style.setProperty('--c',T[p.t].c);
          s.innerHTML=`<span class="ic">${T[p.t].ic}</span><span class="nm">${T[p.t].n}${p.t===trend?' <span style="color:var(--gd);font-size:.62rem">🔥</span>':''}</span><span class="ft" style="width:${fp[i]}%;background:${fatCol(fp[i])}"></span>`;
        }else s.innerHTML='<span class="ph">＋ 企画カードをここへ</span>';
        const st=isStream(p.t);bb.disabled=!st;
        bb.className='mgr-band'+(st?' b'+p.b:'');
        bb.innerHTML=st?`${BANDS[p.b]}<small>${['宵','深夜','丑三つ'][p.b]}</small>`:'—';
      });
      KEYS.forEach(k=>{
        const c=cards[k];c.classList.toggle('sel',sel===k);
        if(T[k].lim){const l=T[k].lim-used(k);c.querySelector('.lim').textContent='×'+l;c.classList.toggle('out',l<=0);}
      });
      const last=fp.filter(v=>v!=null).pop();
      const fv=last==null?startFat:last;
      kp.querySelector('.k-bud').innerHTML=`🤝${T.collab.lim-used('collab')} 📣${T.short.lim-used('short')}`;
      kp.querySelector('.k-fat').textContent=fv;
      const fb=kp.querySelector('.k-fbar');fb.style.width=fv+'%';fb.style.background=fatCol(fv);
      goBtn.disabled=plan.some(p=>!p.t);
      mg.setScore(`企画 ${plan.filter(p=>p.t).length}/7 ・ トレンド ${T[trend].ic}${T[trend].s}`);
      defaultHint();
    }

    // ── ドラッグ＆タップ ──
    let drag=null;
    function slotAt(x,y){const e=document.elementFromPoint(x,y);return e&&e.closest?e.closest('.mgr-slot'):null;}
    function clearHot(){rows.forEach(r=>r.s.classList.remove('hot'));}
    function onDown(e){
      if(phase!=='plan')return;
      const card=e.target.closest('.mgr-card'),slot=e.target.closest('.mgr-slot');
      if(!card&&!slot)return;
      let k,from=null;
      if(card){k=card.dataset.k;if(card.classList.contains('out')&&sel!==k){AU.se('warn');say(`${T[k].n}は今週もう使い切った`,true);return;}}
      else{from=+slot.dataset.i;k=plan[from].t;}
      drag={k,from,x0:e.clientX,y0:e.clientY,moved:false,ghost:null,id:e.pointerId,src:card||slot};
      try{(card||slot).setPointerCapture(e.pointerId);}catch(_){}
      e.preventDefault();
    }
    function onMove(e){
      if(!drag||e.pointerId!==drag.id)return;
      if(!drag.moved&&drag.k&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>8){
        drag.moved=true;
        const g=el('div','mgr-card mgr-ghost',`<span class="ic">${T[drag.k].ic}</span><span class="nm">${T[drag.k].s}</span>`);
        g.style.setProperty('--c',T[drag.k].c);document.body.appendChild(g);drag.ghost=g;
        if(drag.from!=null)rows[drag.from].s.style.opacity=.4;
      }
      if(drag.moved){
        drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';
        clearHot();const s=slotAt(e.clientX,e.clientY);if(s)s.classList.add('hot');
      }
    }
    function onUp(e){
      if(!drag||e.pointerId!==drag.id)return;
      const d=drag;drag=null;
      if(d.ghost)d.ghost.remove();clearHot();
      if(d.from!=null)rows[d.from].s.style.opacity='';
      if(phase!=='plan')return;
      if(d.moved){
        const s=slotAt(e.clientX,e.clientY);
        if(s){place(d.k,+s.dataset.i,d.from);}
        else if(d.from!=null){plan[d.from].t=null;AU.se('back');renderBoard();}
        return;
      }
      // タップ
      if(d.from==null){sel=sel===d.k?null:d.k;AU.se('tool');renderBoard();return;}
      const i=d.from;
      if(sel){if(place(sel,i))sel=canPlace(sel,-1)?sel:null;renderBoard();}
      else if(plan[i].t){plan[i].t=null;AU.se('back');renderBoard();}
    }
    // 空き枠タップ（slotの k が null のとき）
    pl.addEventListener('pointerdown',e=>{
      const slot=e.target.closest('.mgr-slot');
      if(slot&&!plan[+slot.dataset.i].t){
        if(phase!=='plan')return;
        if(sel){place(sel,+slot.dataset.i);if(!canPlace(sel,-1))sel=null;renderBoard();}
        else{AU.se('back');say('下の企画カードを選ぶか、ドラッグして置こう');}
        e.preventDefault();return;
      }
      onDown(e);
    });
    pl.addEventListener('pointermove',onMove);
    pl.addEventListener('pointerup',onUp);
    pl.addEventListener('pointercancel',e=>{if(drag&&drag.ghost)drag.ghost.remove();if(drag&&drag.from!=null)rows[drag.from].s.style.opacity='';drag=null;clearHot();});
    goBtn.onclick=()=>{if(phase==='plan'&&!goBtn.disabled)startSim();};

    // ── メモ（気づき・過去の通信簿）──
    function memoHtml(){
      const f=md.found.length?md.found.map(id=>`<div class="mgr-found">${FOUND[id]}</div>`).join(''):'<div class="mgr-found" style="color:var(--tx-d)">まだ気づきはない。まずは1週間やってみよう。</div>';
      const p=md.reports.length?`<table class="mgr-past"><tr><th>日</th><th>評価</th><th>トレンド</th><th>計画</th><th>疲労</th></tr>`+
        md.reports.slice(-5).reverse().map(r=>`<tr><td>${r.day}日目</td><td class="mgr-g mgr-g${r.grade}">${r.grade}</td><td>${T[r.trend].ic}</td><td class="pl">${r.plan.map(t=>T[t].ic).join('')}</td><td>${r.fat}</td></tr>`).join('')+'</table>':'';
      return `<div class="mgr-sec">NOTES ／ これまでの気づき</div>${f}`+(p?`<div class="mgr-sec">PAST REPORTS ／ 過去の通信簿</div>${p}`:'');
    }
    function audienceNote(){
      return `<div class="mgr-note"><b>客層メモ</b>：最近のリスナーは「${T[favs[0]].n}」の反応がいい気がする。「${T[favs[6]].n}」はいまいち…？</div>`;
    }
    memoBtn.onclick=()=>{
      if(phase!=='plan')return;AU.se('decide');
      const ov=el('div','mgr-ov');const bx=el('div','mgr-box',`<div class="sub">MEETING MEMO</div><h3>📝 運営メモ</h3>${audienceNote()}${memoHtml()}`);
      const b=el('button','mgr-btn','閉じる');b.onclick=()=>{AU.se('back');ov.remove();};bx.appendChild(b);ov.appendChild(bx);root.appendChild(ov);
    };

    // ── 説明 ──
    {
      const ov=el('div','mgr-ov');
      const last=md.reports[md.reports.length-1];
      const bx=el('div','mgr-box',`<div class="sub">CHANNEL STRATEGY MEETING</div><h3>📈 来週の配信、どうする？</h3>
        <ul>
          <li><b>企画カード</b>を<b>月〜日</b>の枠へドラッグ（タップ→枠タップでもOK）</li>
          <li>右の<b>時間帯ボタン</b>で 22時 / 0時 / 2時 を切替</li>
          <li>🤝コラボは週1回・📣告知は週2回まで。💤休みで疲れが抜ける</li>
          <li>全部埋めたら<b>「放送開始」</b>。1週間を見届けて S〜D で評価</li>
        </ul>
        <div class="mgr-note"><b>🔥 今週のトレンド：${T[trend].n}</b><br>企画の並び順・時間帯・連続配信にも、まだ知らない法則がある。結果は「メモ」に残る。</div>
        ${audienceNote()}
        ${last?`<div class="mgr-note" style="border-color:var(--cy)"><b style="color:var(--cy)">前回</b>：${last.day}日目の計画は <span class="mgr-g mgr-g${last.grade}">${last.grade}</span> 評価。気づき ${md.found.length}/${Object.keys(FOUND).length}</div>`:''}`);
      const b=el('button','mgr-btn','会議をはじめる');
      b.onclick=()=>{AU.se('decide');ov.remove();phase='plan';renderBoard();};
      bx.appendChild(b);ov.appendChild(bx);root.appendChild(ov);
    }
    renderBoard();mg.setTimer('会議 2:00');

    // 会議の残り時間（切れたら空き枠は休みにして放送開始）
    mg.every(()=>{
      if(phase!=='plan')return;
      planLeft--;
      mg.setTimer(`会議 ${Math.floor(Math.max(0,planLeft)/60)}:${String(Math.max(0,planLeft)%60).padStart(2,'0')}`);
      if(planLeft===15){AU.se('warn');say('会議の残り時間わずか！空き枠は休みになる',true);}
      if(planLeft<=0){plan.forEach(p=>{if(!p.t)p.t='rest';});renderBoard();startSim();}
    },1000);

    // ═════ 放送（シミュレーション画面）═════
    let sim,mon,mcv,mctx,chat,week,chart,ccv,cctx,ctrl,tip=null;
    let night=0,nt=0,evtShown=false,chatT=0,viewers=0,repShown=false,endT=0;
    const dur=n=>n.t==='rest'||n.t==='short'?2.3:3.6;

    function startSim(){
      if(phase!=='plan')return;
      phase='sim';sel=null;AU.se('live');
      res=simulate(plan,{aff,trend,startFat,base,fix:(gs.skills&&gs.skills.emergencyFix)||0,flame:gs.flame||0});
      pl.remove();
      sim=el('div','mgr-sim');root.appendChild(sim);
      mon=el('div','mgr-mon');sim.appendChild(mon);
      mcv=el('canvas');mon.appendChild(mcv);mctx=mcv.getContext('2d');
      chat=el('div','mgr-chat');mon.appendChild(chat);
      week=el('div','mgr-week');sim.appendChild(week);
      plan.forEach((p,i)=>week.appendChild(el('div','mgr-wd',`<div class="d">${DAYS[i]}${isStream(p.t)?' '+BANDS[p.b]:''}</div><div class="i">${T[p.t].ic}</div><div class="r"></div>`)));
      chart=el('div','mgr-chart');sim.appendChild(chart);
      ccv=el('canvas');chart.appendChild(ccv);cctx=ccv.getContext('2d');
      const tipAt=e=>{const r=ccv.getBoundingClientRect();tip={x:e.clientX-r.left,y:e.clientY-r.top};};
      chart.addEventListener('pointerdown',tipAt);chart.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)tipAt(e);});
      chart.addEventListener('pointerleave',()=>{tip=null;});
      ctrl=el('div','mgr-ctrl');sim.appendChild(ctrl);
      const bSp=el('button','','▶▶ 早送り');const bSk=el('button','','⏭ 結果まで飛ばす');
      bSp.onclick=()=>{speed=speed===1?2.5:1;bSp.classList.toggle('on',speed>1);AU.se('tool');};
      bSk.onclick=()=>{if(simDone)return;AU.se('decide');night=7;nt=0;finishSim();};
      ctrl.appendChild(bSp);ctrl.appendChild(bSk);
      night=0;nt=0;beginNight();
    }
    function beginNight(){
      evtShown=false;chatT=.3;viewers=0;chat.innerHTML='';
      [...week.children].forEach((w,i)=>w.classList.toggle('now',i===night));
      const n=res.nights[night];
      if(n.t==='rest')AU.se('notif');else if(n.t==='short')AU.se('notif');else AU.se('micOn');
      mg.setTimer(`放送 ${night+1}/7 ${DAYS[night]}曜`);
    }
    function endNight(){
      const n=res.nights[night],w=week.children[night];
      w.classList.remove('now');w.classList.add('done');
      const r=w.querySelector('.r');
      if(n.t==='rest'){r.textContent='OFF';r.style.color='var(--tx-d)';}
      else if(n.t==='short')r.textContent=`+${n.gain}`;
      else{r.textContent=`+${n.gain}`;if(n.q<.8)w.classList.add('bad');}
      if(n.gain>0)AU.se('comment');
    }
    function finishSim(){
      if(simDone)return;simDone=true;
      [...week.children].forEach((w,i)=>{if(!w.classList.contains('done')){night=i;endNight();}});
      night=7;
      // 記録
      md.reports.push({day:gs.day,grade:res.grade,trend,plan:plan.map(p=>p.t),fat:res.endFat,score:Math.round(res.score*10)/10});
      if(md.reports.length>8)md.reports.shift();
      res.newFound=res.found.filter(f=>!md.found.includes(f));
      // 「好きな企画」に気づく
      md.found.push(...res.newFound);saved=true;
      mg.setTimer('放送終了');
      endT=0;phase='end';
    }
    function bubble(n){
      if(n.t==='rest'||n.t==='short')return;
      const tired=n.fat>60&&Math.random()<.35;
      let txt=tired?TIRED_CHAT[(Math.random()*TIRED_CHAT.length)|0]:CHAT[n.t][(Math.random()*CHAT[n.t].length)|0];
      if(!tired&&n.t===trend&&Math.random()<.2)txt='トレンドから来ました！';
      const nm=NAMES[(Math.random()*NAMES.length)|0];
      const b=el('div','mgr-bub',`<i>${nm}</i>${txt}`);chat.appendChild(b);
      while(chat.children.length>4)chat.firstChild.remove();
      [...chat.children].forEach((c,i,a)=>{c.style.opacity=i<a.length-3?.35:1;});
    }
    function showEvt(n){
      if(!n.evt)return;
      const e=el('div','mgr-evt',n.evt.txt);e.style.setProperty('--c',n.evt.c);mon.appendChild(e);
      setTimeout(()=>e.remove(),2000);
      AU.se(n.evt.good?'rank':'noise');
      if(n.evt.sc){const b=el('div','mgr-bub sc',`<i>${n.evt.sc}</i>¥500　今日もおつかれさま！`);chat.appendChild(b);}
    }

    // ── 描画 ──
    function fit(cv){
      const dpr=Math.min(2,window.devicePixelRatio||1);
      const w=cv.clientWidth,h=cv.clientHeight;
      if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);}
      return [w,h,dpr];
    }
    let clock=0;
    const stars=Array.from({length:40},()=>[Math.random(),Math.random()*.55,Math.random()]);
    const city=Array.from({length:22},(_,i)=>[i/22,.25+Math.random()*.5,Math.random()]);
    function drawMon(){
      const [W,H,dpr]=fit(mcv);const c=mctx;c.setTransform(dpr,0,0,dpr,0,0);
      const n=res.nights[Math.min(night,6)];
      const off=n.t==='rest'||phase==='end';
      const col=off?'#5e5078':T[n.t].c;
      const p=Math.min(1,nt/dur(n));
      // 部屋
      const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0c0924');g.addColorStop(1,'#05040e');c.fillStyle=g;c.fillRect(0,0,W,H);
      // 窓
      const wx=W*.05,wy=H*.1,ww=W*.36,wh=H*.48;
      c.save();c.beginPath();c.rect(wx,wy,ww,wh);c.clip();
      const sky=c.createLinearGradient(0,wy,0,wy+wh);sky.addColorStop(0,'#0a0b2e');sky.addColorStop(1,'#1b1240');c.fillStyle=sky;c.fillRect(wx,wy,ww,wh);
      stars.forEach(([sx,sy,ph])=>{c.globalAlpha=.4+.6*Math.abs(Math.sin(clock*1.5+ph*9));c.fillStyle='#deccf8';c.fillRect(wx+sx*ww,wy+sy*wh,1.2,1.2);});
      c.globalAlpha=1;
      // 月（夜が進むと傾く）
      const mx=wx+ww*(.25+.5*((night+p)/7)),my=wy+wh*.25;
      c.fillStyle='#fff6d8';c.shadowColor='#fff0b0';c.shadowBlur=14;c.beginPath();c.arc(mx,my,Math.min(ww,wh)*.1,0,7);c.fill();c.shadowBlur=0;
      c.fillStyle='#0a0b2e';c.beginPath();c.arc(mx+Math.min(ww,wh)*.04,my-2,Math.min(ww,wh)*.09,0,7);c.fill();
      city.forEach(([cx,ch,ph],i)=>{const bx=wx+cx*ww,bh=wh*ch*.6;c.fillStyle='#07061a';c.fillRect(bx,wy+wh-bh,ww/22+1,bh);
        if(Math.sin(clock*.7+ph*20)>.2){c.fillStyle=i%3?'#e8b83088':'#00e8c866';c.fillRect(bx+2,wy+wh-bh+4+ph*8,2,2);}});
      c.restore();
      c.strokeStyle='#2a2050';c.lineWidth=3;c.strokeRect(wx,wy,ww,wh);c.beginPath();c.moveTo(wx+ww/2,wy);c.lineTo(wx+ww/2,wy+wh);c.stroke();
      // 部屋の光（企画カラー）
      if(!off){const rg=c.createRadialGradient(W*.62,H*.6,10,W*.62,H*.6,W*.6);rg.addColorStop(0,col+'40');rg.addColorStop(1,'transparent');c.fillStyle=rg;c.fillRect(0,0,W,H);}
      // 机
      c.fillStyle='#140f2c';c.fillRect(0,H*.82,W,H*.18);c.fillStyle='#2a1f52';c.fillRect(0,H*.82,W,2);
      // モニター
      const mw=W*.24,mh=H*.2,mxx=W*.05,myy=H*.62;
      c.fillStyle='#0a0716';c.fillRect(mxx,myy,mw,mh);c.strokeStyle=off?'#2a2050':col;c.lineWidth=1.5;c.strokeRect(mxx,myy,mw,mh);
      if(!off){
        c.fillStyle=col+'30';c.fillRect(mxx+2,myy+2,mw-4,mh-4);
        c.font=`${Math.round(mh*.42)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';
        c.fillText(T[n.t].ic,mxx+mw/2,myy+mh/2);
        if(n.t==='short'){c.fillStyle='#ffffff22';c.fillRect(mxx+6,myy+mh-8,mw-12,3);c.fillStyle=col;c.fillRect(mxx+6,myy+mh-8,(mw-12)*p,3);}
      }
      c.fillStyle='#140f2c';c.fillRect(mxx+mw/2-3,myy+mh,6,H*.82-myy-mh);
      // 演出パーティクル
      if(!off&&n.t!=='short'){
        for(let k=0;k<6;k++){
          const ph=(clock*.35+k/6)%1;const px=W*(.48+.3*Math.sin(k*2.3+clock*.4)),py=H*(.78-.6*ph);
          c.globalAlpha=Math.sin(ph*Math.PI)*.7;c.fillStyle=col;c.font=`${Math.round(H*.06)}px ${FONT}`;
          c.fillText(n.t==='uta'?'♪':n.t==='kaidan'?'✦':n.t==='radio'?'〜':n.t==='game'?'▶':'・',px,py);
        }
        c.globalAlpha=1;
      }
      // だんのうら
      const fatNow=n.fat0+(n.fat-n.fat0)*p;
      const im=off?imgs.sd_tired:(fatNow>65?imgs.sd_tired:(n.t==='short'?imgs.sd_normal:imgs.sd_streamer));
      if(im.complete&&im.naturalWidth){
        const ih=H*.74,iw=ih*im.naturalWidth/im.naturalHeight;
        const bob=off?0:Math.sin(clock*(n.t==='uta'?7:4))*H*.01;
        c.globalAlpha=off?.45:1;
        c.drawImage(im,W*.58-iw/2,H*.92-ih+bob,iw,ih);c.globalAlpha=1;
      }
      if(off&&phase!=='end'){c.fillStyle='#deccf8';c.font=`${Math.round(H*.07)}px ${FONT}`;c.textAlign='left';
        for(let k=0;k<3;k++){const ph=(clock*.5+k/3)%1;c.globalAlpha=Math.sin(ph*Math.PI);c.fillText('z',W*.66+ph*W*.08+k*6,H*(.32-ph*.18));}c.globalAlpha=1;
        c.fillStyle='#00000055';c.fillRect(0,0,W,H);}
      // HUD
      c.textBaseline='middle';c.textAlign='left';
      const live=!off&&n.t!=='short';
      const bx=8,by=8;
      c.fillStyle=live?'#e83055':n.t==='short'?'#8a52d4':'#2a2050';
      roundRect(c,bx,by,live?62:72,20,4);c.fill();
      c.fillStyle='#fff';c.font=`11px ${MONO}`;
      if(live){c.globalAlpha=Math.sin(clock*6)>0?1:.3;c.beginPath();c.arc(bx+10,by+10,3.5,0,7);c.fill();c.globalAlpha=1;}
      c.fillText(phase==='end'?'END':live?'LIVE':n.t==='short'?'EDITING':'OFFLINE',bx+(live?18:8),by+10.5);
      // 曜日・企画
      c.font=`${Math.round(Math.min(15,H*.075))}px ${FONT}`;c.fillStyle='#deccf8';
      const ttl=phase==='end'?'1週間おつかれさま':`${DAYS[night]}曜 ${isStream(n.t)?BANDS[n.b]+' ':''}${T[n.t].n}`;
      c.fillText(ttl,bx,by+36);
      if(isStream(n.t)&&n.t===trend&&phase!=='end'){c.fillStyle='#e8b830';c.font=`10px ${FONT}`;c.fillText('🔥 トレンド企画',bx,by+54);}
      // 同接
      if(live){
        viewers=Math.round(n.peak*Math.min(1,p/.55)*(p>.85?1-(p-.85)*.8:1));
        const t=`👁 ${viewers}`;c.font=`12px ${MONO}`;const tw=c.measureText(t).width+14;
        c.fillStyle='rgba(5,4,14,.75)';roundRect(c,W-tw-8,by,tw,20,4);c.fill();
        c.fillStyle='#deccf8';c.textAlign='left';c.fillText(t,W-tw-1,by+10.5);
      }else if(n.t==='short'&&phase!=='end'){
        const t=`▶ ${Math.round(n.views*p)}回再生`;c.font=`12px ${MONO}`;const tw=c.measureText(t).width+14;
        c.fillStyle='rgba(5,4,14,.75)';roundRect(c,W-tw-8,by,tw,20,4);c.fill();c.fillStyle='#deccf8';c.fillText(t,W-tw-1,by+10.5);
      }
      // 疲労ゲージ
      const fw=Math.min(110,W*.3),fx=W-fw-8,fy=by+28;
      c.fillStyle='rgba(5,4,14,.75)';roundRect(c,fx-4,fy-4,fw+8,22,4);c.fill();
      c.fillStyle='#bbaedd';c.font=`9px ${FONT}`;c.fillText('疲労',fx,fy+3);
      c.fillStyle='#ffffff14';c.fillRect(fx+26,fy,fw-26,6);
      const fv=phase==='end'?res.endFat:fatNow;
      c.fillStyle=fatCol(fv);c.fillRect(fx+26,fy,(fw-26)*fv/100,6);
      c.fillStyle='#bbaedd';c.font=`9px ${MONO}`;c.textAlign='right';c.fillText(Math.round(fv),fx+fw,fy+12);
    }
    function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}

    function drawChart(){
      const [W,H,dpr]=fit(ccv);const c=cctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);
      const prog=phase==='end'?7:night+Math.min(1,nt/dur(res.nights[night]));
      // 系列：フォロワー累計 と 疲労（別パネル・それぞれ1軸）
      const cum=[0];res.nights.forEach(n=>cum.push(cum[cum.length-1]+n.gain));
      const fat=[startFat];res.nights.forEach(n=>fat.push(n.fat));
      const L=30,R=W-34,gap=12,ph=(H-16-gap-18)/2;
      const panels=[
        {name:'新規フォロワー（今週の累計）',y0:14,data:cum,max:Math.max(4,Math.ceil(cum[7]/4)*4),col:'#00e8c8',unit:'人'},
        {name:'疲労',y0:14+ph+gap,data:fat,max:100,col:'#e8b830',unit:'',danger:70},
      ];
      const X=i=>L+(R-L)*i/7;
      let tipInfo=null;
      panels.forEach(P=>{
        const Y=v=>P.y0+ph-(ph-12)*v/P.max;
        // タイトル
        c.font=`10px ${FONT}`;c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#bbaedd';c.fillText(P.name,L,P.y0+6);
        // グリッド
        c.strokeStyle='rgba(187,174,221,.08)';c.lineWidth=1;c.font=`9px ${MONO}`;c.fillStyle='#5e5078';c.textAlign='right';c.textBaseline='middle';
        [0,.5,1].forEach(f=>{const v=Math.round(P.max*f),y=Y(v);c.beginPath();c.moveTo(L,y);c.lineTo(R,y);c.stroke();c.fillText(v,L-5,y);});
        if(P.danger){const y=Y(P.danger);c.setLineDash([3,3]);c.strokeStyle='rgba(232,48,85,.35)';c.beginPath();c.moveTo(L,y);c.lineTo(R,y);c.stroke();c.setLineDash([]);
          c.fillStyle='#5e5078';c.textAlign='left';c.fillText('危険',R+4,y);}
        // 線（進捗まで）
        const pts=[];
        for(let i=0;i<=7;i++){
          if(i<=Math.floor(prog))pts.push([X(i),Y(P.data[i]),i]);
          else{const f=prog-Math.floor(prog);if(f>0){const a=P.data[i-1],b=P.data[i];pts.push([X(i-1+f),Y(a+(b-a)*f),-1]);}break;}
        }
        c.strokeStyle=P.col;c.lineWidth=1.6;c.lineJoin='round';c.beginPath();pts.forEach(([x,y],k)=>k?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
        // 面
        if(pts.length>1){c.lineTo(pts[pts.length-1][0],P.y0+ph);c.lineTo(pts[0][0],P.y0+ph);c.closePath();const ag=c.createLinearGradient(0,P.y0,0,P.y0+ph);ag.addColorStop(0,P.col+'2a');ag.addColorStop(1,P.col+'00');c.fillStyle=ag;c.fill();}
        pts.forEach(([x,y,i])=>{if(i<0)return;c.fillStyle='#05040e';c.strokeStyle=P.col;c.lineWidth=1.4;c.beginPath();c.arc(x,y,2.6,0,7);c.fill();c.stroke();
          if(tip&&Math.abs(tip.x-x)<(R-L)/14&&tip.y>P.y0-4&&tip.y<P.y0+ph+6)tipInfo={x,y,i,P};});
        // 直接ラベル（最新値）
        const lp=pts[pts.length-1];
        if(lp){const iv=lp[2]>=0?P.data[lp[2]]:null;const v=iv!=null?iv:Math.round(P.data[Math.floor(prog)]+(P.data[Math.min(7,Math.floor(prog)+1)]-P.data[Math.floor(prog)])*(prog%1));
          c.fillStyle='#deccf8';c.font=`10px ${MONO}`;c.textAlign='left';c.fillText((P.unit?'+':'')+Math.round(v)+P.unit,Math.min(lp[0]+5,R+2),lp[1]-7);}
      });
      // x軸ラベル
      c.fillStyle='#5e5078';c.font=`9px ${FONT}`;c.textAlign='center';c.textBaseline='alphabetic';
      ['開始',...DAYS].forEach((d,i)=>c.fillText(d,X(i),H-4));
      // ツールチップ
      if(tipInfo){
        const {x,y,i,P}=tipInfo;const n=i>0?res.nights[i-1]:null;
        const l1=i===0?'開始時点':`${DAYS[i-1]}曜 ${T[n.t].n}`;
        const l2=P.unit?`累計 +${P.data[i]}人`+(n?`（この夜 +${n.gain}）`:''):`疲労 ${P.data[i]}`;
        const l3=n&&isStream(n.t)?`最高同接 ${n.peak}人`:'';
        c.font=`10px ${FONT}`;const tw=Math.max(...[l1,l2,l3].map(s=>c.measureText(s).width))+14;const th=l3?46:32;
        let tx=x+8,ty=y-th-6;if(tx+tw>W-2)tx=x-tw-8;if(ty<2)ty=y+8;
        c.fillStyle='rgba(10,7,22,.95)';c.strokeStyle='rgba(222,204,248,.35)';c.lineWidth=1;roundRect(c,tx,ty,tw,th,4);c.fill();c.stroke();
        c.fillStyle='#deccf8';c.textAlign='left';c.textBaseline='top';c.fillText(l1,tx+7,ty+5);c.fillStyle='#bbaedd';c.fillText(l2,tx+7,ty+19);if(l3)c.fillText(l3,tx+7,ty+33);
        c.strokeStyle='rgba(222,204,248,.25)';c.setLineDash([2,3]);c.beginPath();c.moveTo(x,P.y0);c.lineTo(x,P.y0+ph);c.stroke();c.setLineDash([]);
      }
    }

    // ═════ 通信簿 ═════
    function showReport(){
      if(repShown)return;repShown=true;AU.se(res.grade==='S'||res.grade==='A'?'ach':'rank');
      const g=res.grade,gc=GRADE_C[g];
      const streams=res.nights.filter(n=>isStream(n.t));
      const best=streams.slice().sort((a,b)=>b.q-a.q)[0],worst=streams.slice().sort((a,b)=>a.q-b.q)[0];
      const cmt={S:'完璧な1週間。数字にも、コメント欄の温度にも手ごたえがある。',A:'いい流れ。常連も新しい人も、ちゃんと戻ってきた。',B:'悪くない週。並べ方しだいでもっと伸びそう。',C:'空回りの夜が多かった。客層と並び順を見直そう。',D:'体も数字もボロボロ…。休みと組み合わせを考え直そう。'}[g];
      const nightLine=n=>`${DAYS[n.i]}曜 ${T[n.t].ic}${T[n.t].n}（${n.mult.filter(m=>m[1]!==1).map(m=>`${m[0]}×${m[1].toFixed(2)}`).join('・')}）`;
      const ov=el('div','mgr-ov');
      const bx=el('div','mgr-box mgr-rep');bx.style.setProperty('--gc',gc);
      bx.innerHTML=`<div class="sub">WEEKLY REPORT ／ ${gs.day}日目の会議</div>
        <div class="mgr-rep-hd"><div class="mgr-stamp">${g}</div><div><h3 style="margin:0">週間通信簿</h3><p>${cmt}</p></div></div>
        <div class="mgr-stats">
          <div class="mgr-stat"><small>新規フォロワー</small><b style="color:var(--cy)">+${REWARD[g].followers}</b></div>
          <div class="mgr-stat"><small>最高同接</small><b>${res.peak}人</b></div>
          <div class="mgr-stat"><small>週末の疲労</small><b style="color:${fatCol(res.endFat)}">${res.endFat}</b></div>
          <div class="mgr-stat"><small>週間スコア</small><b>${res.score.toFixed(1)}</b></div>
        </div>
        ${best?`<div class="mgr-note" style="border-color:var(--gn)"><b style="color:var(--gn)">ベストの夜</b>：${nightLine(best)}</div>`:''}
        ${worst&&worst!==best?`<div class="mgr-note" style="border-color:var(--rd)"><b style="color:var(--rd)">ワーストの夜</b>：${nightLine(worst)}</div>`:''}
        ${res.pen>0?`<div class="mgr-note" style="border-color:var(--rd)"><b style="color:var(--rd)">疲労ペナルティ</b>：週末の疲労が70超え（−${res.pen.toFixed(1)}）</div>`:''}
        <div class="mgr-sec">INSIGHTS ／ 今週の気づき</div>
        ${res.found.length?res.found.map(f=>`<div class="mgr-found${res.newFound.includes(f)?' new':''}">${FOUND[f]}${res.newFound.includes(f)?'<span class="nw">NEW</span>':''}</div>`).join(''):'<div class="mgr-found">特になし</div>'}
        ${md.reports.length>1?`<div class="mgr-sec">PAST REPORTS ／ 過去の通信簿</div><table class="mgr-past"><tr><th>日</th><th>評価</th><th>トレンド</th><th>計画</th><th>疲労</th></tr>`+
          md.reports.slice(-4).reverse().map((r,k)=>`<tr${k===0?' style="color:var(--tx-b)"':''}><td>${r.day}日目${k===0?'★':''}</td><td class="mgr-g mgr-g${r.grade}">${r.grade}</td><td>${T[r.trend].ic}</td><td class="pl">${r.plan.map(t=>T[t].ic).join('')}</td><td>${r.fat}</td></tr>`).join('')+'</table>':''}`;
      const b=el('button','mgr-btn','会議を終える');b.style.borderColor=gc;b.style.color=gc;
      b.onclick=()=>{AU.se('decide');mg.end('done');};
      bx.appendChild(b);ov.appendChild(bx);root.appendChild(ov);
      mg.setScore(`評価 <span style="color:${gc}">${g}</span> ・ スコア ${res.score.toFixed(1)}`);
    }

    // ═════ ループ ═════
    mg.loop(dt=>{
      clock+=dt;
      if(phase==='sim'){
        const n=res.nights[night];
        nt+=dt*speed;
        const D=dur(n);
        if(!evtShown&&nt>D*.45){evtShown=true;showEvt(n);}
        chatT-=dt*speed;
        if(chatT<=0){chatT=.45+Math.random()*.4;bubble(n);}
        if(nt>=D){
          endNight();night++;nt=0;
          if(night>=7){night=6;nt=dur(res.nights[6]);finishSim();}
          else beginNight();
        }
        mg.setScore(`放送中 ${DAYS[Math.min(night,6)]}曜 ・ 今週 +${res.nights.slice(0,night).reduce((a,n)=>a+n.gain,0)}人`);
      }
      if(phase==='end'){endT+=dt;if(endT>1.1)showReport();}
      if(sim){drawMon();drawChart();}
    });

    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      if(e.key==='Enter'||e.key===' '){
        if(phase==='plan'&&!goBtn.disabled){e.preventDefault();startSim();}
        else if(phase==='end'&&repShown){e.preventDefault();mg.end('done');}
      }
    });

    // テスト用フック
    body._mgr={plan,get phase(){return phase;},get res(){return res;},trend,aff,
      fill(arr){arr.forEach((p,i)=>{plan[i].t=p[0];plan[i].b=p[1]==null?1:p[1];});if(phase==='intro'){phase='plan';const o=root.querySelector('.mgr-ov');if(o)o.remove();}renderBoard();},
      go:()=>startSim(),skip:()=>{night=7;finishSim();}};

    function cleanup(){
      if(drag&&drag.ghost)drag.ghost.remove();
      document.querySelectorAll('.mgr-ghost').forEach(g=>g.remove());
      clearTimeout(hintTo);
    }

    return {result(reason){
      cleanup();
      if(reason==='quit'&&simDone)reason='done';   // 放送済みなら通信簿どおりに精算
      if(reason!=='done'||!res){
        return {title:'📈 会議を途中で切り上げた',summary:'来週の計画は白紙のまま。なんとなく配信することにした。',
          fx:{fatigue:1},time:15,log:null,cutin:null};
      }
      const g=res.grade,fx=Object.assign({},REWARD[g]);
      if(!saved){finishSim();}
      return {
        title:`📈 週間通信簿：${g}評価`,
        summary:`計画 <span class="up">${plan.map(p=>T[p.t].ic).join('')}</span><br>トレンド ${T[trend].ic}${T[trend].n} ・ 最高同接 <span class="up">${res.peak}人</span> ・ 週末の疲労 <span class="${res.endFat>70?'down':'up'}">${res.endFat}</span>`+
          (res.newFound&&res.newFound.length?`<br>新しい気づき <span class="up">${res.newFound.length}件</span>（メモに記録）`:''),
        fx,time:50,sp:g==='S'?1:0,
        log:`来週の配信計画を立てた（${g}評価）。`,
        cutin:g==='S'?['win','……数字は正直ね。届いた夜が、ちゃんとあった。']:g==='A'?['happy','……いい並びだったわ。来週もこの調子で。']:(g==='C'||g==='D')?['tired','……詰め込みすぎたかも。休むのも、運営のうちね。']:null,
      };
    }};
  },
});
})();
