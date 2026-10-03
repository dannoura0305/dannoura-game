// ══════════════════════════════════════════════════════════
// 脱出・謎解き「閉じ込められた夜勤明け」
// 落雷で停電した工場に閉じ込められた。朝7時までに息子を迎えに行かないと。
// 4部屋（更衣室・制御室・部品倉庫・非常口）を行き来し、
// 懐中電灯＋電池 → ロッカー暗証（勤務表＋エアタンク残圧）→ 盤キーで分電盤
// → 単線結線図どおりにブレーカー投入 → ドライバーでPLC盤 → ラダー図で出力パターン
// → 圧力計で正しい系統のバルブ → 非常口を開ける。
// 暗証番号・投入順・ラダー・圧力は毎回ランダム（解から逆算して作るので必ず解ける）。
// 部屋はCanvas 2Dで描画（懐中電灯の光・埃・雨・稲光・点滅灯）、拡大図はDOM/SVG。
// ══════════════════════════════════════════════════════════
addMinigameStyle('escape',`
.mg-escape{padding:0;}
.esc-root{position:relative;flex:1;min-height:0;width:100%;display:flex;flex-direction:column;user-select:none;-webkit-user-select:none;}
.esc-nav{display:flex;align-items:stretch;gap:4px;padding:4px 6px;background:rgba(6,4,18,.96);border-bottom:1px solid rgba(138,82,212,.28);}
.esc-nb{min-width:92px;min-height:44px;background:rgba(138,82,212,.08);border:1px solid rgba(138,82,212,.35);border-radius:4px;color:var(--tx);font-family:var(--dot);font-size:.7rem;cursor:pointer;-webkit-tap-highlight-color:transparent;padding:0 6px;}
.esc-nb:active{background:rgba(0,232,200,.15);}
.esc-nb[disabled]{opacity:.18;cursor:default;}
.esc-nb.r{text-align:right;}
.esc-cur{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--dot);color:var(--tx-b);font-size:.84rem;letter-spacing:.12em;}
.esc-cur small{font-family:var(--mono);font-size:.52rem;color:var(--tx-d);letter-spacing:.2em;}
.esc-map{display:flex;gap:4px;margin-top:2px;}
.esc-map i{width:14px;height:4px;border-radius:2px;background:rgba(138,82,212,.3);}
.esc-map i.on{background:var(--cy);box-shadow:0 0 6px var(--cy);}
.esc-stage{position:relative;flex:1;min-height:0;overflow:hidden;background:#05040e;}
.esc-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:crosshair;-webkit-tap-highlight-color:transparent;}
.esc-msg{position:absolute;left:8px;right:8px;bottom:8px;padding:9px 12px;background:rgba(8,6,20,.9);border:1px solid rgba(138,82,212,.45);border-left:3px solid var(--cy);border-radius:3px;color:var(--tx-b);font-family:var(--serif);font-size:.76rem;line-height:1.65;pointer-events:none;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s;}
.esc-msg.on{opacity:1;transform:none;}
.esc-msg b{color:var(--gd);font-weight:normal;}
.esc-inv{display:flex;gap:5px;padding:6px 8px;align-items:center;background:linear-gradient(#0c0920,#07051a);border-top:1px solid rgba(138,82,212,.35);}
.esc-slot{position:relative;width:46px;height:46px;flex:0 0 46px;border:1px solid rgba(138,82,212,.35);background:radial-gradient(circle at 50% 40%,rgba(138,82,212,.14),rgba(5,4,14,.9));border-radius:4px;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.esc-slot svg{width:100%;height:100%;display:block;}
.esc-slot.sel{border-color:var(--gd);box-shadow:0 0 10px rgba(232,184,48,.55),inset 0 0 8px rgba(232,184,48,.3);}
.esc-slot.new{animation:esc-pop .6s ease-out;}
.esc-slot:empty{cursor:default;opacity:.55;}
@keyframes esc-pop{0%{transform:scale(.3);box-shadow:0 0 24px var(--cy);}60%{transform:scale(1.18);}100%{transform:scale(1);}}
.esc-hint{margin-left:auto;min-width:58px;height:46px;border:1px solid rgba(232,184,48,.45);background:rgba(232,184,48,.07);color:var(--gd);border-radius:4px;font-family:var(--dot);font-size:.68rem;line-height:1.25;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.esc-hint[disabled]{opacity:.3;cursor:default;}
.esc-zoom{position:absolute;inset:0;background:rgba(3,2,10,.84);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .22s;z-index:5;}
.esc-zoom.on{opacity:1;pointer-events:auto;}
.esc-zbox{position:relative;width:94%;max-width:440px;max-height:96%;overflow:auto;background:var(--panel);border:1px solid var(--pu);border-radius:5px;box-shadow:0 0 30px rgba(138,82,212,.3);transform:scale(.92);transition:transform .25s cubic-bezier(.2,1.4,.4,1);}
.esc-zoom.on .esc-zbox{transform:scale(1);}
.esc-zh{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 12px;border-bottom:1px solid rgba(138,82,212,.3);font-family:var(--dot);color:var(--cy);font-size:.8rem;letter-spacing:.06em;}
.esc-x{margin-left:auto;width:44px;height:40px;border:1px solid rgba(138,82,212,.4);background:transparent;color:var(--tx);border-radius:4px;font-size:1rem;cursor:pointer;}
.esc-zc{padding:10px 12px 14px;color:var(--tx);font-family:var(--serif);font-size:.74rem;line-height:1.6;}
.esc-zc .mono{font-family:var(--mono);}
.esc-sub{font-family:var(--mono);font-size:.62rem;color:var(--tx-d);margin:2px 0 6px;}
.esc-paper{background:linear-gradient(#e9e3cf,#d6cdb2);color:#2a2236;border-radius:3px;padding:10px 12px;box-shadow:inset 0 0 18px rgba(80,60,20,.35);font-family:var(--dot);}
.esc-note{background:linear-gradient(160deg,#f3df6a,#d9bf3c);color:#2c2410;padding:12px 14px;border-radius:2px;transform:rotate(-1.5deg);box-shadow:3px 4px 0 rgba(0,0,0,.4);font-family:var(--dot);font-size:.8rem;line-height:1.9;}
.esc-roster{width:100%;border-collapse:collapse;font-family:var(--dot);font-size:.72rem;margin-bottom:8px;table-layout:fixed;}
.esc-roster th,.esc-roster td{border:1px solid rgba(60,50,80,.35);text-align:center;padding:3px 0;}
.esc-roster th{font-weight:normal;color:#5a4c70;font-size:.6rem;}
.esc-roster td.nm{text-align:left;padding-left:4px;width:74px;color:#2a2236;font-size:.66rem;}
.esc-roster td.d{color:#2a6aa8;}.esc-roster td.n{color:#fff;background:#4b2e7d;}.esc-roster td.o{color:#9a90a8;}
.esc-roster tr.me td.nm{color:#a0203c;}
.esc-brk{display:flex;flex-direction:column;align-items:center;gap:10px;background:linear-gradient(#2b2a33,#1b1a22);border:2px solid #44424e;border-radius:4px;padding:12px 8px;}
.esc-brow{display:flex;gap:6px;justify-content:center;flex-wrap:nowrap;}
.esc-b{width:56px;min-height:96px;background:linear-gradient(#e6e3dc,#bdb8ad);border-radius:3px;border:1px solid #777;display:flex;flex-direction:column;align-items:center;padding:4px 0;cursor:pointer;-webkit-tap-highlight-color:transparent;position:relative;}
.esc-b.main{width:84px;}
.esc-b .lb{font-family:var(--mono);font-size:.62rem;color:#222;}
.esc-b .slot{width:22px;height:52px;margin-top:4px;background:#2a2a2a;border-radius:3px;position:relative;box-shadow:inset 0 2px 4px #000;}
.esc-b .lev{position:absolute;left:2px;right:2px;height:24px;top:26px;background:linear-gradient(#444,#111);border-radius:2px;transition:top .18s cubic-bezier(.3,1.6,.5,1),background .2s;}
.esc-b.on .lev{top:2px;background:linear-gradient(#3fe08a,#12804a);}
.esc-b .st{font-family:var(--mono);font-size:.55rem;color:#555;margin-top:3px;}
.esc-b.on .st{color:#0a7a3e;}
.esc-brk.trip{animation:esc-trip .5s;}
@keyframes esc-trip{0%,100%{transform:none;box-shadow:none;}20%{transform:translateX(-6px);box-shadow:0 0 30px #e83055;}40%{transform:translateX(5px);}60%{transform:translateX(-3px);}}
.esc-plc{display:flex;flex-direction:column;gap:8px;}
.esc-ladder{background:#0a1210;border:1px solid #1c3a32;border-radius:3px;}
.esc-io{display:flex;gap:6px;justify-content:space-between;}
.esc-sw{flex:1;min-height:52px;border:1px solid #3b5a52;background:#0d1a17;color:#7fa;border-radius:4px;font-family:var(--mono);font-size:.7rem;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;-webkit-tap-highlight-color:transparent;}
.esc-sw i{width:12px;height:12px;border-radius:50%;background:#253;}
.esc-sw.on{background:#123a2c;border-color:var(--gn);}
.esc-sw.on i{background:var(--gn);box-shadow:0 0 8px var(--gn);}
.esc-lamp{flex:1;text-align:center;font-family:var(--mono);font-size:.66rem;color:var(--tx-d);}
.esc-lamp i{display:block;margin:0 auto 3px;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#553,#221);border:1px solid #443;}
.esc-lamp.on i{background:radial-gradient(circle at 40% 35%,#fff6b0,#e8b830 60%,#a07010);box-shadow:0 0 14px #e8b830;}
.esc-dial{display:flex;gap:8px;justify-content:center;margin:6px 0 10px;}
.esc-wh{display:flex;flex-direction:column;align-items:center;gap:4px;}
.esc-wh button{width:52px;height:44px;border:1px solid rgba(138,82,212,.5);background:rgba(138,82,212,.1);color:var(--tx-b);border-radius:4px;font-size:.9rem;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.esc-wh .dg{width:52px;height:58px;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:1.9rem;color:#ddd;background:linear-gradient(#111,#333 45%,#2a2a2a 55%,#111);border:2px solid #666;border-radius:5px;box-shadow:inset 0 0 10px #000;transition:color .2s;}
.esc-dial.ok .dg{color:var(--gn);text-shadow:0 0 10px var(--gn);border-color:var(--gn);}
.esc-dial.ng{animation:esc-trip .4s;}
.esc-go{display:block;width:100%;min-height:46px;border:1px solid var(--cy);background:rgba(0,232,200,.08);color:var(--cy);font-family:var(--dot);font-size:.84rem;border-radius:4px;cursor:pointer;letter-spacing:.1em;}
.esc-valves{display:flex;gap:8px;justify-content:space-between;}
.esc-vl{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;background:rgba(255,255,255,.03);border:1px solid rgba(138,82,212,.25);border-radius:4px;padding:6px 2px;}
.esc-vl .nm{font-family:var(--mono);color:var(--tx-b);font-size:.72rem;}
.esc-vbtn{width:64px;height:64px;border-radius:50%;border:none;background:none;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent;}
.esc-vbtn svg{transition:transform 1.2s cubic-bezier(.3,.8,.3,1);}
.esc-vbtn.open svg{transform:rotate(-540deg);}
.esc-vbtn[disabled]{cursor:default;opacity:.6;}
.esc-needle{transform-origin:50px 50px;animation:esc-wob 1.7s ease-in-out infinite alternate;}
@keyframes esc-wob{from{transform:rotate(-.7deg);}to{transform:rotate(.7deg);}}
.esc-intro{position:absolute;inset:0;z-index:8;background:radial-gradient(ellipse at 50% 30%,rgba(40,20,70,.85),rgba(3,2,10,.97));display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;text-align:center;transition:opacity .4s;}
.esc-intro.off{opacity:0;pointer-events:none;}
.esc-intro h3{font-family:var(--dot);color:var(--tx-b);font-weight:normal;font-size:1.05rem;letter-spacing:.12em;margin:0;}
.esc-intro p{font-family:var(--serif);color:var(--tx);font-size:.76rem;line-height:1.9;margin:0;max-width:320px;}
.esc-intro ul{list-style:none;padding:0;margin:0;font-family:var(--dot);font-size:.68rem;color:var(--cy);line-height:2;}
.esc-intro button{min-width:180px;min-height:48px;}
.esc-flash{position:absolute;inset:0;pointer-events:none;background:#fff;opacity:0;z-index:4;}
`);

(()=>{
const FONT='"DotGothic16", monospace';
const ROOMS=['locker','ctrl','store','exit'];
const RNAME={locker:'更衣室',ctrl:'制御室',store:'部品倉庫',exit:'非常口'};
const RSUB={locker:'LOCKER ROOM',ctrl:'CONTROL ROOM',store:'PARTS STORAGE',exit:'EMERGENCY EXIT'};
const TIME=270;
const FLOOR=.72;
const NAMES=['佐伯','宮下','だんのうら','黒川'];

const ITEMS={
  torch0:{name:'懐中電灯（電池なし）',desc:'スイッチを入れても点かない。電池が空っぽだ。'},
  batt:{name:'単三電池×2',desc:'部品倉庫の箱にあった新品の単三電池。'},
  torch:{name:'懐中電灯',desc:'電池を入れた。これで暗い所も読める。'},
  driver:{name:'プラスドライバー',desc:'#2のプラスドライバー。盤のカバー外しに。'},
  key:{name:'盤キー',desc:'分電盤の扉を開ける三角キー。'},
};
// アイテムのアイコン（SVG）
function iconSVG(id){
  const v='<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">';
  if(id==='torch0'||id==='torch'){
    const on=id==='torch';
    return v+`<defs><linearGradient id="et${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a96a8"/><stop offset=".5" stop-color="#4a4658"/><stop offset="1" stop-color="#25222e"/></linearGradient>
      <radialGradient id="eb${id}"><stop offset="0" stop-color="#fff4c0" stop-opacity=".95"/><stop offset="1" stop-color="#e8b830" stop-opacity="0"/></radialGradient></defs>
      ${on?`<path d="M36 18 L48 6 L48 42 L36 30Z" fill="url(#eb${id})" opacity=".7"/>`:''}
      <g transform="rotate(-8 24 24)"><rect x="6" y="19" width="22" height="10" rx="2" fill="url(#et${id})" stroke="#111" stroke-width=".8"/>
      <rect x="10" y="20" width="2" height="8" fill="#2a2732"/><rect x="14" y="20" width="2" height="8" fill="#2a2732"/><rect x="18" y="20" width="2" height="8" fill="#2a2732"/>
      <rect x="20" y="17.5" width="5" height="3" rx="1" fill="${on?'#e83055':'#5a2030'}"/>
      <path d="M28 18 L36 15 L36 33 L28 30Z" fill="url(#et${id})" stroke="#111" stroke-width=".8"/>
      <ellipse cx="36" cy="24" rx="2.2" ry="9" fill="${on?'#fff6c8':'#3a3a4a'}" stroke="#111" stroke-width=".6"/></g></svg>`;
  }
  if(id==='batt'){
    const b=(x,y,r)=>`<g transform="rotate(${r} ${x+5} ${y+15})"><rect x="${x}" y="${y}" width="10" height="27" rx="2" fill="#18202a" stroke="#000" stroke-width=".6"/><rect x="${x}" y="${y}" width="10" height="9" rx="2" fill="#00c8b0"/><rect x="${x+3}" y="${y-2.5}" width="4" height="3" rx="1" fill="#ccc"/><rect x="${x+1.5}" y="${y+2}" width="1.6" height="22" fill="#fff" opacity=".25"/><text x="${x+5}" y="${y+22}" font-size="5" text-anchor="middle" fill="#00e8c8" font-family="monospace">AA</text></g>`;
    return v+b(11,11,-12)+b(25,10,10)+'</svg>';
  }
  if(id==='driver'){
    return v+`<g transform="rotate(-40 24 24)"><rect x="19" y="4" width="10" height="17" rx="4" fill="#e8b830" stroke="#5a4000" stroke-width=".8"/><rect x="19" y="12" width="10" height="9" rx="2" fill="#e83055"/>
      <rect x="21" y="6" width="1.6" height="13" fill="#fff" opacity=".35"/><rect x="22.6" y="21" width="2.8" height="19" fill="#c8c8d0" stroke="#555" stroke-width=".5"/><path d="M22.6 40 L24 45 L25.4 40Z" fill="#999"/></g></svg>`;
  }
  if(id==='key'){
    return v+`<circle cx="15" cy="17" r="9" fill="none" stroke="#e8b830" stroke-width="4"/><circle cx="15" cy="17" r="9" fill="none" stroke="#fff3b0" stroke-width="1" opacity=".5"/>
      <path d="M21 23 L38 40" stroke="#e8b830" stroke-width="5" stroke-linecap="round"/><path d="M36 38 L41 33 L43 35 L38 40Z" fill="#c09020"/><path d="M33 35 L36 32" stroke="#c09020" stroke-width="3"/>
      <path d="M11 13 L19 13 L15 20Z" fill="#7a5a10"/></svg>`;
  }
  return v+'</svg>';
}

// ── パズルの生成（純関数・必ず解ける） ──
function makePuzzle(rnd){
  rnd=rnd||Math.random;
  const ri=k=>Math.floor(rnd()*k);
  const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=ri(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
  // 勤務表：2週間 × 4人。だんのうらの「夜」の数（週ごと）が暗証の①②
  const roster=[],nights=[];
  NAMES.forEach((nm,pi)=>{
    const row=[];
    for(let w=0;w<2;w++){
      const days=Array(7).fill('日');
      const k=pi===2?1+ri(5):ri(5);
      const idx=shuf([0,1,2,3,4,5,6]);
      for(let i=0;i<k;i++)days[idx[i]]='夜';
      const offs=1+ri(Math.min(2,7-k));
      for(let i=k;i<k+offs&&i<7;i++)days[idx[i]]='休';
      if(pi===2)nights.push(k);
      row.push(...days);
    }
    roster.push(row);
  });
  // エアタンク残圧（0.20〜0.95MPa、0.05刻み）→ 暗証の③④
  const tank=(4+ri(16))*5;           // 20..95（×0.01MPa）
  const code=''+nights[0]+nights[1]+String(tank).padStart(2,'0');
  // ブレーカー：主幹 → 2系統 → 3負荷。上流から、同じ段は容量の小さい順
  const l2=shuf([15,20,30,40,50,75]).slice(0,2);
  const l3=shuf([2,3,5,7.5,10,15]).slice(0,3);
  const codes=shuf(['CB-1','CB-2','CB-3','CB-4','CB-5']);
  const litParent=ri(2)?'動力':'制御';
  const brk=[
    {code:'MCCB',name:'主幹',lvl:1,kva:null,parent:null},
    {code:codes[0],name:'動力',lvl:2,kva:l2[0],parent:'主幹'},
    {code:codes[1],name:'制御',lvl:2,kva:l2[1],parent:'主幹'},
    {code:codes[2],name:'コンプレッサー',lvl:3,kva:l3[0],parent:'動力'},
    {code:codes[3],name:'照明',lvl:3,kva:l3[1],parent:litParent},
    {code:codes[4],name:'PLC・電気錠',lvl:3,kva:l3[2],parent:'制御'},
  ];
  const order=[...brk].sort((a,b)=>a.lvl-b.lvl||(a.kva||0)-(b.kva||0)).map(b=>b.code);
  // PLC：入力X0〜X3、出力Y0〜Y3のラダー。秘密の入力から目標パターンを作る
  const ev=(r,x)=>r.t==='A'?x[r.a]:r.t==='N'?!x[r.a]:r.t==='AND'?(x[r.a]&&(r.nb?!x[r.b]:x[r.b])):(x[r.a]||x[r.b]);
  let rungs,target,secret;
  for(let g=0;g<500;g++){
    rungs=[0,1,2,3].map(()=>{
      const t=['A','N','AND','AND','OR'][ri(5)];
      const a=ri(4);let b=ri(3);if(b>=a)b++;
      return {t,a,b,nb:t==='AND'&&ri(2)===1};
    });
    secret=[0,1,2,3].map(()=>ri(2)===1);
    if(!secret.some(Boolean))continue;
    target=rungs.map(r=>!!ev(r,secret));
    const zero=rungs.map(r=>!!ev(r,[false,false,false,false]));
    if(target.join()===zero.join())continue;
    const lit=target.filter(Boolean).length;
    if(lit<2||lit>3)continue;
    // 全部の入力が意味を持つように（どれか1つは使っている）
    break;
  }
  // バルブ：3系統の圧力（すべて別の値）、シャッターの札と一致する系統が正解
  const pool=shuf([30,35,40,45,50,55,60,65,70]);
  const valves=pool.slice(0,3),vOk=ri(3);
  return {roster,nights,tank,code,brk,order,rungs,target,secret,valves,vOk,ev};
}

registerMinigame({
  id:'escape', icon:'🔐', name:'閉じ込められた夜勤明け', genre:'脱出・謎解き', bgm:'kaidan',
  desc:'夜勤明け、落雷の停電で工場に閉じ込められた。朝までに息子を迎えに行かないと。設備保全の知識で4つの部屋の仕掛けを解き、非常口から脱出しよう。',
  effect:'資格知識+5 仕事評価+6 精神力+4（ヒント1回ごと−1）／ 疲労+6 約60分',
  help:'タップで調べる・持ち物を選んで使う',
  start(body,mg){
    const P=makePuzzle();
    const S={
      room:'ctrl',inv:[],sel:null,left:TIME,started:false,hints:0,
      drawer:false,gotBatt:false,torch:false,gotDriver:false,locker:false,gotKey:false,
      panel:false,bOn:[],power:false,plcCover:false,x:[false,false,false,false],plcOk:false,
      valve:-1,air:false,door:false,seen:{},
      anim:{drawer:0,locker:0,panel:0,plcCover:0,shutter:0,door:0,lights:0},
      powerT:-1,clearT:-1,
    };
    let W=0,H=0,dpr=1,T=0,lastSec=-1,warned=false;
    let lx=.5,ly=.45,tlx=.5,tly=.45;             // 光の位置（正規化）
    let flash=0,nextBolt=4+Math.random()*6,trans=null,ripple=null,zoomId=null,msgT=0;

    body.innerHTML=`<div class="esc-root">
      <div class="esc-nav"><button class="esc-nb l" data-nav="-1"></button><div class="esc-cur"><span class="esc-rn"></span><small class="esc-rs"></small><div class="esc-map">${ROOMS.map(()=>'<i></i>').join('')}</div></div><button class="esc-nb r" data-nav="1"></button></div>
      <div class="esc-stage"><canvas class="esc-cv"></canvas><div class="esc-flash"></div><div class="esc-msg"></div>
        <div class="esc-zoom"><div class="esc-zbox"><div class="esc-zh"><span class="esc-zt"></span><button class="esc-x" aria-label="閉じる">✕</button></div><div class="esc-zc"></div></div></div>
        <div class="esc-intro"><h3>🔐 閉じ込められた夜勤明け</h3>
          <p>午前4時半。夜勤明けの帰り支度の最中、落雷で工場が停電した。電気錠もシャッターも閉じたまま――。<br>7時にはお隣さんへ息子を迎えに行く約束だ。</p>
          <ul><li>タップ：調べる／光を向ける</li><li>持ち物を選んで → 場所をタップで使う</li><li>持ち物どうしをタップで組み合わせ</li></ul>
          <button class="ev-btn esc-start">脱出開始（制限 4:30）</button></div>
      </div>
      <div class="esc-inv">${[0,1,2,3,4].map(i=>`<button class="esc-slot" data-slot="${i}"></button>`).join('')}<button class="esc-hint">ヒント<br>残3</button></div>
    </div>`;
    const $=s=>body.querySelector(s);
    const stage=$('.esc-stage'),cv=$('.esc-cv'),cx=cv.getContext('2d');
    const msgEl=$('.esc-msg'),zoomEl=$('.esc-zoom'),zt=$('.esc-zt'),zc=$('.esc-zc'),flashEl=$('.esc-flash');
    const dark=document.createElement('canvas'),dx=dark.getContext('2d');

    // ── 背景の固定ランダム（雨・街明かり・埃・汚れ） ──
    const R0=(()=>{let s=12345;return ()=>((s=(s*16807)%2147483647)/2147483647);})();
    const rain=Array.from({length:70},()=>({x:R0(),y:R0(),l:.04+R0()*.08,v:.9+R0()*.9}));
    const drips=Array.from({length:14},()=>({x:R0(),y:R0(),v:.02+R0()*.05,r:.6+R0()*1.2}));
    const city=Array.from({length:26},()=>({x:R0(),y:.55+R0()*.45,c:['#e83055','#00e8c8','#e8b830','#8a52d4','#8af'][Math.floor(R0()*5)],b:R0()}));
    const dust=Array.from({length:60},()=>({x:R0(),y:R0(),vx:(R0()-.5)*.012,vy:(R0()-.3)*.01,s:.5+R0()*1.6,p:R0()*6}));
    const stains=Array.from({length:8},()=>({x:R0(),y:R0()*.6,r:.05+R0()*.12}));

    // ── 当たり判定（正規化座標） ──
    const HS={
      ctrl:[
        {id:'window',x:.05,y:.07,w:.38,h:.21,nm:'窓'},
        {id:'diagram',x:.48,y:.07,w:.25,h:.19,nm:'単線結線図'},
        {id:'panel',x:.76,y:.07,w:.21,h:.56,nm:'分電盤'},
        {id:'roster',x:.05,y:.33,w:.38,h:.19,nm:'勤務表'},
        {id:'plc',x:.48,y:.32,w:.24,h:.22,nm:'PLC盤'},
        {id:'desk',x:.04,y:.60,w:.50,h:.25,nm:'机'},
      ],
      store:[
        {id:'shelf',x:.04,y:.08,w:.38,h:.62,nm:'部品棚'},
        {id:'board',x:.48,y:.07,w:.48,h:.20,nm:'工具板'},
        {id:'tank',x:.49,y:.31,w:.21,h:.46,nm:'エアタンク'},
        {id:'valves',x:.73,y:.31,w:.24,h:.40,nm:'バルブ'},
        {id:'pallet',x:.06,y:.76,w:.36,h:.14,nm:'パレット'},
      ],
      locker:[
        {id:'lk0',x:.03,y:.10,w:.155,h:.60,nm:'ロッカー'},
        {id:'lk1',x:.19,y:.10,w:.155,h:.60,nm:'ロッカー'},
        {id:'own',x:.35,y:.10,w:.155,h:.60,nm:'自分のロッカー'},
        {id:'lk3',x:.51,y:.10,w:.155,h:.60,nm:'ロッカー'},
        {id:'note',x:.71,y:.09,w:.25,h:.25,nm:'鏡'},
        {id:'lwin',x:.71,y:.40,w:.25,h:.15,nm:'窓'},
        {id:'bench',x:.08,y:.76,w:.60,h:.11,nm:'ベンチ'},
      ],
      exit:[
        {id:'sign',x:.33,y:.04,w:.34,h:.08,nm:'誘導灯'},
        {id:'door',x:.24,y:.15,w:.52,h:.57,nm:'非常口'},
        {id:'lockpanel',x:.80,y:.32,w:.16,h:.16,nm:'電気錠'},
        {id:'tag',x:.04,y:.28,w:.16,h:.36,nm:'エアシリンダー'},
      ],
    };
    const hsById=(room,id)=>HS[room].find(h=>h.id===id);

    // ── レイアウト ──
    function layout(){
      const r=stage.getBoundingClientRect();
      dpr=Math.min(2.5,window.devicePixelRatio||1);
      W=Math.max(1,Math.round(r.width));H=Math.max(1,Math.round(r.height));
      cv.width=W*dpr;cv.height=H*dpr;dark.width=W*dpr;dark.height=H*dpr;
    }

    // ── UI ──
    function say(html,sec){msgEl.innerHTML=html;msgEl.classList.add('on');msgT=sec||4.2;}
    function updNav(){
      const i=ROOMS.indexOf(S.room);
      const l=$('[data-nav="-1"]'),r=$('[data-nav="1"]');
      l.disabled=i===0;r.disabled=i===ROOMS.length-1;
      l.textContent=i>0?'◀ '+RNAME[ROOMS[i-1]]:'';
      r.textContent=i<ROOMS.length-1?RNAME[ROOMS[i+1]]+' ▶':'';
      $('.esc-rn').textContent=RNAME[S.room];$('.esc-rs').textContent=RSUB[S.room];
      body.querySelectorAll('.esc-map i').forEach((e,k)=>e.classList.toggle('on',k===i));
    }
    function progress(){return [S.torch,S.locker,S.power,S.plcOk,S.air].filter(Boolean).length;}
    function updScore(){mg.setScore(`進捗 <span style="color:var(--cy)">${progress()}/5</span>　ヒント ${S.hints}/3`);}
    function renderInv(newId){
      body.querySelectorAll('.esc-slot').forEach((b,i)=>{
        const id=S.inv[i];
        b.innerHTML=id?iconSVG(id):'';
        b.dataset.item=id||'';
        b.title=id?ITEMS[id].name:'';
        b.classList.toggle('sel',!!id&&S.sel===id);
        b.classList.remove('new');
        if(id&&id===newId){void b.offsetWidth;b.classList.add('new');}
      });
      const h=$('.esc-hint');h.innerHTML=`ヒント<br>残${3-S.hints}`;h.disabled=S.hints>=3||!S.started||S.door;
      updScore();
    }
    function addItem(id,text){S.inv.push(id);S.sel=null;AU.se('tool');renderInv(id);if(text)say(text);}
    function removeItem(id){S.inv=S.inv.filter(x=>x!==id);if(S.sel===id)S.sel=null;renderInv();}
    function tapItem(id){
      if(!id||!S.started||S.door)return;
      if(S.sel&&S.sel!==id){
        const pair=[S.sel,id].sort().join('+');
        if(pair==='batt+torch0'){
          S.inv=S.inv.filter(x=>x!=='batt'&&x!=='torch0');S.inv.push('torch');S.sel=null;S.torch=true;
          AU.se('repair');renderInv('torch');
          say('電池を入れて……カチッ。<b>懐中電灯</b>が点いた！ 光の輪が大きくなった。');
          return;
        }
        AU.se('back');say(`${ITEMS[S.sel].name}と${ITEMS[id].name}は組み合わせられない。`);S.sel=null;renderInv();return;
      }
      if(S.sel===id){S.sel=null;AU.se('back');renderInv();return;}
      S.sel=id;AU.se('btn');renderInv();
      say(`<b>${ITEMS[id].name}</b>：${ITEMS[id].desc}<br><span style="color:var(--tx-d);font-size:.66rem">場所をタップで使う／持ち物をタップで組み合わせ</span>`,3.5);
    }
    function goRoom(d){
      if(trans||!S.started||S.door)return;
      const i=ROOMS.indexOf(S.room)+d;
      if(i<0||i>=ROOMS.length)return;
      closeZoom(true);
      trans={to:ROOMS[i],d,t:0,sw:false};AU.se('btn');
    }

    // ── ヒント ──
    function hintText(){
      if(!S.drawer)return '制御室の<b>机の引き出し</b>を調べてみよう。';
      if(!S.gotBatt&&!S.torch)return '<b>部品倉庫の棚</b>に電池の箱がありそうだ。';
      if(!S.torch)return '持ち物の<b>懐中電灯を選んでから電池をタップ</b>すると組み合わせられる。';
      if(!S.locker)return `更衣室の<b>鏡のメモ</b>が暗証のヒント。①② 勤務表の「だんのうら」の<b>夜</b>を第1週・第2週で数える。③④ 部品倉庫の<b>エアタンクの残圧</b>（0.${'xx'}MPaの xx）。`;
      if(!S.panel)return '<b>盤キーを選んで</b>、制御室の<b>分電盤</b>をタップ。';
      if(!S.power)return '<b>単線結線図</b>を見る。主幹→分岐→負荷と<b>上流から</b>。同じ段では<b>容量(kVA)の小さい順</b>に投入。';
      if(!S.plcCover)return S.gotDriver?'<b>ドライバーを選んで</b>、制御室の<b>PLC盤</b>をタップ。':'懐中電灯があれば、部品倉庫の<b>工具板</b>でドライバーが見つかる。';
      if(!S.plcOk)return '非常口の<b>電気錠のステッカー</b>の出力パターンをPLCで作る。┤├ は入力ONで通電、┤/├ は入力OFFで通電。';
      if(!S.air)return '非常口の<b>シャッターの札</b>の供給圧と同じ値を指す圧力計の系統のバルブを開ける（部品倉庫）。';
      return '<b>非常口の扉</b>を開けよう！';
    }
    function useHint(){
      if(S.hints>=3||!S.started||S.door)return;
      S.hints++;AU.se('notif');say('💡 '+hintText(),7);renderInv();
    }

    // ── 拡大図 ──
    function openZoom(id){
      zoomId=id;AU.se('btn');renderZoom();zoomEl.classList.add('on');S.seen[id]=true;
    }
    function closeZoom(silent){
      if(!zoomId)return;zoomId=null;zoomEl.classList.remove('on');if(!silent)AU.se('back');
    }
    function gaugeSVG(val,size,label,live){
      // val: 0..1 MPa。135°→405°の270°スケール
      const a=v=>(135+270*v)*Math.PI/180;
      let t='';
      for(let i=0;i<=20;i++){
        const v=i/20,an=a(v),maj=i%4===0,mid=i%2===0;
        const r1=40,r2=maj?31:mid?34:36;
        t+=`<line x1="${50+r1*Math.cos(an)}" y1="${50+r1*Math.sin(an)}" x2="${50+r2*Math.cos(an)}" y2="${50+r2*Math.sin(an)}" stroke="#222" stroke-width="${maj?1.6:mid?1.1:.7}"/>`;
        if(maj)t+=`<text x="${50+24*Math.cos(an)}" y="${50+24*Math.sin(an)+2.4}" font-size="6.5" text-anchor="middle" fill="#222" font-family="monospace">${(v).toFixed(1)}</text>`;
      }
      // 緑ゾーン
      const z=(v0,v1,c)=>{const p0=a(v0),p1=a(v1);return `<path d="M${50+41*Math.cos(p0)} ${50+41*Math.sin(p0)} A41 41 0 0 1 ${50+41*Math.cos(p1)} ${50+41*Math.sin(p1)}" stroke="${c}" stroke-width="2.4" fill="none"/>`;};
      const na=135+270*Math.max(0,Math.min(1,val));
      return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs><radialGradient id="egf"><stop offset="0" stop-color="#fbf8ee"/><stop offset="1" stop-color="#d8d1bc"/></radialGradient><linearGradient id="egr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eee"/><stop offset=".5" stop-color="#777"/><stop offset="1" stop-color="#ccc"/></linearGradient></defs>
        <circle cx="50" cy="50" r="48" fill="url(#egr)"/><circle cx="50" cy="50" r="44" fill="url(#egf)"/>
        ${z(.8,1,'#c03030')}${t}
        <text x="50" y="66" font-size="6" text-anchor="middle" fill="#333" font-family="monospace">MPa</text>
        <text x="50" y="76" font-size="5" text-anchor="middle" fill="#555">${label||''}</text>
        <g class="${live?'esc-needle':''}"><g transform="rotate(${na} 50 50)"><path d="M50 48.4 L88 50 L50 51.6 L44 50Z" fill="#b01828"/></g></g>
        <circle cx="50" cy="50" r="4" fill="#333"/><circle cx="49" cy="49" r="1.3" fill="#999"/>
        <path d="M14 30 A40 40 0 0 1 50 8" stroke="#fff" stroke-width="3" fill="none" opacity=".35"/></svg>`;
    }
    function ladderSVG(){
      const RH=46,w=300,h=14+RH*4;
      const on=P.rungs.map(r=>!!P.ev(r,S.x));
      const pw=S.power;
      const col=(c)=>pw&&c?'#44ee88':'#4a6a62';
      let s=`<svg class="esc-ladder" viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="monospace">`;
      s+=`<line x1="10" y1="4" x2="10" y2="${h-4}" stroke="${pw?'#44ee88':'#4a6a62'}" stroke-width="2.5"/><line x1="${w-10}" y1="4" x2="${w-10}" y2="${h-4}" stroke="#4a6a62" stroke-width="2.5"/>`;
      const contact=(x,y,a,nc)=>{
        const cond=nc?!S.x[a]:S.x[a];const c=col(cond);
        return `<line x1="${x-7}" y1="${y-9}" x2="${x-7}" y2="${y+9}" stroke="${c}" stroke-width="2.4"/><line x1="${x+7}" y1="${y-9}" x2="${x+7}" y2="${y+9}" stroke="${c}" stroke-width="2.4"/>`+
          (nc?`<line x1="${x-8}" y1="${y+9}" x2="${x+8}" y2="${y-9}" stroke="${c}" stroke-width="1.8"/>`:'')+
          `<text x="${x}" y="${y-12}" font-size="10" text-anchor="middle" fill="#9ce">X${a}</text>`;
      };
      P.rungs.forEach((r,i)=>{
        const y=18+i*RH,wc='#4a6a62';
        s+=`<text x="16" y="${y-11}" font-size="8" fill="#3c5c54">${i}</text>`;
        if(r.t==='A'||r.t==='N'){
          s+=`<line x1="10" y1="${y}" x2="113" y2="${y}" stroke="${wc}" stroke-width="1.6"/><line x1="127" y1="${y}" x2="232" y2="${y}" stroke="${wc}" stroke-width="1.6"/>`+contact(120,y,r.a,r.t==='N');
        }else if(r.t==='AND'){
          s+=`<line x1="10" y1="${y}" x2="73" y2="${y}" stroke="${wc}" stroke-width="1.6"/><line x1="87" y1="${y}" x2="153" y2="${y}" stroke="${wc}" stroke-width="1.6"/><line x1="167" y1="${y}" x2="232" y2="${y}" stroke="${wc}" stroke-width="1.6"/>`+contact(80,y,r.a,false)+contact(160,y,r.b,r.nb);
        }else{
          const y2=y+20;
          s+=`<line x1="10" y1="${y}" x2="93" y2="${y}" stroke="${wc}" stroke-width="1.6"/><line x1="107" y1="${y}" x2="232" y2="${y}" stroke="${wc}" stroke-width="1.6"/>`+
            `<polyline points="50,${y} 50,${y2} 93,${y2}" fill="none" stroke="${wc}" stroke-width="1.6"/><polyline points="107,${y2} 150,${y2} 150,${y}" fill="none" stroke="${wc}" stroke-width="1.6"/>`+
            contact(100,y,r.a,false)+contact(100,y2+2,r.b,false).replace(/y="(\d+(\.\d+)?)" font-size="10"/,(m,n)=>`y="${+n+30}" font-size="10"`);
        }
        const cc=col(on[i]);
        s+=`<path d="M238 ${y-10} Q232 ${y} 238 ${y+10}" stroke="${cc}" stroke-width="2.2" fill="none"/><path d="M252 ${y-10} Q258 ${y} 252 ${y+10}" stroke="${cc}" stroke-width="2.2" fill="none"/>`+
          `<line x1="258" y1="${y}" x2="${w-10}" y2="${y}" stroke="${wc}" stroke-width="1.6"/><text x="245" y="${y-13}" font-size="10" text-anchor="middle" fill="#e8b830">Y${i}</text>`;
      });
      return s+'</svg>';
    }
    function diagramSVG(){
      const L1=P.brk.filter(b=>b.lvl===2),L3=P.brk.filter(b=>b.lvl===3);
      const w=300,h=230;
      const box=(x,y,b,wd)=>`<rect x="${x-wd/2}" y="${y-15}" width="${wd}" height="30" rx="2" fill="#f2ecd8" stroke="#2a2236" stroke-width="1.2"/>`+
        `<text x="${x}" y="${y-2}" font-size="9.5" text-anchor="middle" fill="#a0203c" font-family="monospace">${b.code}</text>`+
        `<text x="${x}" y="${y+10}" font-size="8.5" text-anchor="middle" fill="#2a2236">${b.name}${b.kva!=null?' '+b.kva+'kVA':''}</text>`;
      let s=`<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family='"DotGothic16",monospace'>`;
      s+=`<text x="6" y="14" font-size="9" fill="#2a2236">受電(非常用発電機)</text><line x1="150" y1="8" x2="150" y2="30" stroke="#2a2236" stroke-width="1.5"/><path d="M146 22 L150 30 L154 22" fill="none" stroke="#2a2236"/>`;
      s+=box(150,45,P.brk[0],90);
      const x2={};L1.forEach((b,i)=>{x2[b.name]=i?225:75;});
      s+=`<line x1="150" y1="60" x2="150" y2="72" stroke="#2a2236" stroke-width="1.5"/><line x1="75" y1="72" x2="225" y2="72" stroke="#2a2236" stroke-width="1.5"/>`;
      L1.forEach(b=>{s+=`<line x1="${x2[b.name]}" y1="72" x2="${x2[b.name]}" y2="90" stroke="#2a2236" stroke-width="1.5"/>`+box(x2[b.name],105,b,110);});
      // 負荷
      const kids={動力:L3.filter(b=>b.parent==='動力'),制御:L3.filter(b=>b.parent==='制御')};
      const xs=[];
      ['動力','制御'].forEach(p=>{const n=kids[p].length;const base=p==='動力'?75:225;kids[p].forEach((b,i)=>xs.push([b,p,n===1?base:base+(i-(n-1)/2)*96]));});
      // 横並びが重ならないよう整列
      xs.sort((a,b)=>a[2]-b[2]);
      const pos=[52,150,248];xs.forEach((e,i)=>e[2]=pos[i]);
      xs.forEach(([b,p,x])=>{
        const px=x2[p];
        s+=`<polyline points="${px},120 ${px},140 ${x},140 ${x},160" fill="none" stroke="#2a2236" stroke-width="1.5"/>`+box(x,175,b,94);
      });
      s+=`<text x="6" y="${h-22}" font-size="8.6" fill="#a0203c">※復電時の投入順序</text><text x="6" y="${h-9}" font-size="8.6" fill="#2a2236">　上流から順に。同じ段は容量の小さい順。</text>`;
      return s+'</svg>';
    }
    function renderZoom(){
      const id=zoomId;if(!id)return;
      let t='',h='';
      if(id==='roster'){
        t='勤務表（ホワイトボード）';
        const wk=w=>`<table class="esc-roster"><tr><th class="nm">第${w+1}週</th>${['月','火','水','木','金','土','日'].map(d=>`<th>${d}</th>`).join('')}</tr>`+
          NAMES.map((n,pi)=>`<tr class="${pi===2?'me':''}"><td class="nm">${n}</td>${P.roster[pi].slice(w*7,w*7+7).map(c=>`<td class="${c==='日'?'d':c==='夜'?'n':'o'}">${c}</td>`).join('')}</tr>`).join('')+'</table>';
        h=`<div class="esc-paper">${wk(0)}${wk(1)}<div style="font-size:.6rem;color:#5a4c70">日＝日勤　夜＝夜勤　休＝公休　／　交代時は申し送り徹底！</div></div>`;
      }else if(id==='diagram'){
        t='単線結線図　LP-1（非常用系）';
        h=`<div class="esc-paper" style="padding:6px">${diagramSVG()}</div>`;
      }else if(id==='note'){
        t='鏡に貼ったメモ';
        h=`<div class="esc-note">ロッカー暗証（忘れ防止）<br>①② 勤務表の<u>オレ</u>の「夜」の数<br>　　（第1週・第2週）<br>③④ エアタンク残圧の<br>　　小数点以下2ケタ<br><span style="font-size:.66rem">……メモを鏡に貼るのは防犯的にどうなんだ俺。</span></div>`;
      }else if(id==='tank'){
        t='エアタンク　残圧計';
        h=`<div style="display:flex;justify-content:center">${gaugeSVG(P.tank/100,250,'AIR TANK',true)}</div><div class="esc-sub" style="text-align:center">コンプレッサー停止中でも、タンクに圧が残っている。</div>`;
      }else if(id==='tag'){
        t='エアシリンダーの札';
        h=`<div class="esc-paper" style="text-align:center;line-height:2">非常口シャッター<br>エアシリンダー駆動<br><span style="font-size:1.25rem;color:#a0203c">供給圧 0.${P.valves[P.vOk]} MPa</span><br><span style="font-size:.62rem">供給元：部品倉庫 分岐バルブ（A/B/C）</span></div>`;
      }else if(id==='lockpanel'){
        t='非常口　電気錠';
        const pat=P.target.map((v,i)=>`<div class="esc-lamp ${v?'on':''}"><i></i>Y${i}</div>`).join('');
        h=`<div class="esc-sub">ステッカー：</div><div class="esc-paper" style="text-align:center">電気錠 解錠条件<br><span style="font-size:.64rem">PLC 出力 Y0〜Y3 が下記のとき解錠</span><div class="esc-io" style="margin-top:6px;background:#1a1626;padding:8px 4px;border-radius:3px">${pat}</div></div>`+
          `<div style="margin-top:10px;font-family:var(--mono);font-size:.7rem;color:${S.plcOk?'var(--gn)':'var(--rd)'}">● ${S.plcOk?'解錠':(S.power?'施錠中（PLC待ち）':'施錠中（電源なし）')}</div>`;
      }else if(id==='breakers'){
        t='分電盤 LP-1';
        const sub=P.brk.slice(1).sort((a,b)=>a.code.localeCompare(b.code));
        const bt=b=>{const on=S.bOn.includes(b.code);return `<div class="esc-b ${b.lvl===1?'main':''} ${on?'on':''}" data-brk="${b.code}"><span class="lb">${b.code}</span><div class="slot"><div class="lev"></div></div><span class="st">${on?'ON':'OFF'}</span></div>`;};
        h=`<div class="esc-brk">${bt(P.brk[0])}<div class="esc-brow">${sub.map(bt).join('')}</div></div><div class="esc-sub" style="margin-top:6px">${S.power?'<span style="color:var(--gn)">全回路 復電</span>':'レバーをタップで投入。順番を間違えるとトリップする。'}</div>`;
      }else if(id==='plc'){
        t='PLC盤（シーケンサ）';
        const outs=P.rungs.map(r=>S.power&&!!P.ev(r,S.x));
        h=`<div class="esc-plc"><div class="esc-sub">${S.power?'<span style="color:var(--gn)">● RUN</span>　テスト入力スイッチ X0〜X3':'<span style="color:var(--rd)">● 電源なし</span>　（分電盤から給電が必要）'}</div>${ladderSVG()}
          <div class="esc-io">${outs.map((o,i)=>`<div class="esc-lamp ${o?'on':''}"><i></i>Y${i}</div>`).join('')}</div>
          <div class="esc-io">${S.x.map((v,i)=>`<button class="esc-sw ${v?'on':''}" data-sw="${i}"><i></i>X${i} ${v?'ON':'OFF'}</button>`).join('')}</div>
          ${S.plcOk?'<div style="color:var(--gn);font-family:var(--dot);text-align:center">電気錠 解錠信号 出力中</div>':''}</div>`;
      }else if(id==='valves'){
        t='エア分岐バルブ';
        h=`<div class="esc-valves">${P.valves.map((v,i)=>{
          const val=S.power?v/100:0;const op=S.valve===i;
          return `<div class="esc-vl"><span class="nm">系統 ${'ABC'[i]}</span>${gaugeSVG(val,92,'',S.power)}
            <button class="esc-vbtn ${op?'open':''}" data-valve="${i}" ${(!S.power||S.air)?'disabled':''} aria-label="バルブ${'ABC'[i]}"><svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="26" fill="none" stroke="#c02838" stroke-width="6"/>${[0,60,120].map(r=>`<line x1="32" y1="32" x2="${32+26*Math.cos(r*Math.PI/180)}" y2="${32+26*Math.sin(r*Math.PI/180)}" stroke="#a01828" stroke-width="5" transform="rotate(${r*0} 32 32)"/><line x1="32" y1="32" x2="${32-26*Math.cos(r*Math.PI/180)}" y2="${32-26*Math.sin(r*Math.PI/180)}" stroke="#a01828" stroke-width="5"/>`).join('')}<circle cx="32" cy="32" r="7" fill="#777" stroke="#333"/></svg></button>
            <span class="esc-sub" style="margin:0">${op?'<span style="color:var(--gn)">開</span>':'閉'}</span></div>`;}).join('')}</div>
          <div class="esc-sub" style="margin-top:8px">${S.power?(S.air?'<span style="color:var(--gn)">シャッター系統に給気中</span>':'ハンドルをタップで開く。違う系統は圧が抜けて時間をロスする。'):'<span style="color:var(--rd)">コンプレッサー停止中。圧が来ていない。</span>'}</div>`;
      }else if(id==='dial'){
        t='ロッカー　ダイヤル錠';
        const d=S.dial||(S.dial=[0,0,0,0]);
        h=`<div class="esc-sub" style="text-align:center">名札：だんのうら</div><div class="esc-dial">${d.map((v,i)=>`<div class="esc-wh"><button data-dial="${i}" data-d="1">▲</button><div class="dg">${v}</div><button data-dial="${i}" data-d="-1">▼</button></div>`).join('')}</div><button class="esc-go" data-open="1">開ける</button>`;
      }
      zt.textContent=t;zc.innerHTML=h;
    }
    zoomEl.addEventListener('click',e=>{
      if(e.target===zoomEl){closeZoom();return;}
      if(e.target.closest('.esc-x')){closeZoom();return;}
      const b=e.target.closest('[data-brk]');if(b){tapBreaker(b.dataset.brk);return;}
      const sw=e.target.closest('[data-sw]');if(sw){tapSwitch(+sw.dataset.sw);return;}
      const vl=e.target.closest('[data-valve]');if(vl&&!vl.disabled){tapValve(+vl.dataset.valve);return;}
      const dl=e.target.closest('[data-dial]');if(dl){const i=+dl.dataset.dial;S.dial[i]=(S.dial[i]+(+dl.dataset.d)+10)%10;AU.se('btn');dl.parentNode.querySelector('.dg').textContent=S.dial[i];return;}
      if(e.target.closest('[data-open]'))tryDial();
    });

    // ── 仕掛け ──
    function tryDial(){
      const box=zc.querySelector('.esc-dial');
      if(S.dial.join('')===P.code){
        box.classList.add('ok');AU.se('decide');
        setTimeout(()=>{if(mg._ended)return;closeZoom(true);S.locker=true;
          addItem('key','ガチャッ。ロッカーが開いた。<b>盤キー</b>を手に入れた。……扉の裏に、息子と撮った写真。');S.gotKey=true;updScore();},700);
      }else{
        box.classList.remove('ng');void box.offsetWidth;box.classList.add('ng');AU.se('warn');
        say('……開かない。番号が違う。');
      }
    }
    function tapBreaker(code){
      if(S.power||S.bOn.includes(code))return;
      const need=P.order[S.bOn.length];
      if(code===need){
        S.bOn.push(code);AU.se('tool');renderZoom();
        if(S.bOn.length===P.order.length){
          S.power=true;S.powerT=T;AU.se('machine');updScore();
          say('ウゥゥン……非常用発電機から給電。<b>照明が点いた！</b> コンプレッサーも回りだした。',5);
          setTimeout(()=>{if(!mg._ended&&zoomId==='breakers')closeZoom(true);},1100);
        }
      }else{
        const box=zc.querySelector('.esc-brk');
        S.bOn.push(code);renderZoom();
        AU.se('warn');flash=.6;
        setTimeout(()=>{if(mg._ended)return;S.bOn=[];renderZoom();const bx=zc.querySelector('.esc-brk');if(bx){bx.classList.add('trip');}AU.se('noise');
          say('<b>バチン！</b> トリップして全部落ちた。投入順が違う……結線図を見直そう。');},180);
      }
    }
    function tapSwitch(i){
      if(!S.power){AU.se('back');say('PLCに電源が来ていない。先に分電盤だ。');return;}
      if(S.plcOk)return;
      S.x[i]=!S.x[i];AU.se('btn');
      const outs=P.rungs.map(r=>!!P.ev(r,S.x));
      if(outs.join()===P.target.map(Boolean).join()){
        S.plcOk=true;AU.se('decide');updScore();
        say('出力パターン一致。……遠くで<b>ガチャン</b>。非常口の電気錠が外れた音だ。',5);
      }
      renderZoom();
    }
    function tapValve(i){
      if(!S.power||S.air)return;
      if(i===P.vOk){
        S.valve=i;S.air=true;AU.se('repair');renderZoom();updScore();
        say('シューッ……系統'+'ABC'[i]+'を開いた。非常口のほうで<b>シャッターが上がる音</b>がする。',5);
      }else{
        S.valve=i;renderZoom();AU.se('noise');S.left=Math.max(1,S.left-10);
        say('<b>プシューッ！</b> 違う系統だ、圧が抜ける……慌てて閉めた。（残り時間−10秒）');
        setTimeout(()=>{if(mg._ended)return;if(S.valve===i&&!S.air){S.valve=-1;renderZoom();}},1300);
      }
    }
    function tapHotspot(h){
      const it=S.sel;
      const used=()=>{S.sel=null;renderInv();};
      const no=()=>{AU.se('back');say(`${ITEMS[it].name}はここでは使えない。`);};
      AU.se('btn');
      switch(S.room+'/'+h.id){
        case 'ctrl/window':return say('雨が窓を叩いている。駐車場の水たまりにネオンが滲む。……7時にはお隣へ迎えに行く約束だ。');
        case 'ctrl/diagram':if(it)return no();return openZoom('diagram');
        case 'ctrl/roster':if(it)return no();return openZoom('roster');
        case 'ctrl/panel':
          if(S.panel)return openZoom('breakers');
          if(it==='key'){removeItem('key');S.panel=true;AU.se('decide');say('盤キーで分電盤の扉を開けた。');setTimeout(()=>{if(!mg._ended&&S.room==='ctrl')openZoom('breakers');},600);return;}
          if(it)return no();
          return say('分電盤 LP-1。扉は<b>施錠</b>されている。三角の<b>盤キー</b>が要る。……鍵はたしか自分のロッカーに。');
        case 'ctrl/plc':
          if(S.plcCover)return openZoom('plc');
          if(it==='driver'){removeItem('driver');S.plcCover=true;AU.se('repair');say('ネジを4本外して、PLC盤のカバーを開けた。');setTimeout(()=>{if(!mg._ended&&S.room==='ctrl')openZoom('plc');},600);return;}
          if(it)return no();
          return say('PLC盤。電気錠の制御はここだ。カバーが<b>ネジ止め</b>されている。');
        case 'ctrl/desk':
          if(it)return no();
          if(!S.drawer){S.drawer=true;addItem('torch0','引き出しに<b>懐中電灯</b>。……スイッチを入れても点かない。電池が空だ。');return;}
          return say('机には息子が描いた「パパのこうじょう」の絵が貼ってある。煙突から虹が出ている。');
        case 'store/shelf':
          if(it)return no();
          if(!S.gotBatt){S.gotBatt=true;addItem('batt','部品箱に新品の<b>単三電池</b>があった。');return;}
          return say('ベアリング、Vベルト、近接センサの予備……在庫表と数が合わないのはいつものことだ。');
        case 'store/board':
          if(it)return no();
          if(!S.torch)return say('工具板だ。でも暗くてどれが何だか……<b>スマホの明かりじゃ心もとない</b>。');
          if(!S.gotDriver){S.gotDriver=true;addItem('driver','<b>プラスドライバー</b>を手に入れた。');return;}
          return say('スパナ、モンキー、ウォーターポンププライヤー。定位置管理は大事。');
        case 'store/tank':
          if(it)return no();
          if(!S.torch)return say('エアタンクの圧力計……<b>スマホの光じゃ針が読めない</b>。');
          return openZoom('tank');
        case 'store/valves':if(it)return no();return openZoom('valves');
        case 'store/pallet':return say('出荷待ちのパレット。フォークリフトのキーは……事務所の金庫だ。');
        case 'locker/lk0':case 'locker/lk1':case 'locker/lk3':
          if(it)return no();
          return say(`${NAMES[+h.id[2]]}さんのロッカー。他人のは開けられない。`);
        case 'locker/own':
          if(it)return no();
          if(!S.locker)return openZoom('dial');
          return say('扉の裏に息子と撮った写真。「パパ　はやくかえってきてね」……ああ、帰るよ。');
        case 'locker/note':if(it)return no();return openZoom('note');
        case 'locker/lwin':return say('小さな窓。稲光で、向かいの倉庫の屋根が白く浮かぶ。');
        case 'locker/bench':return say('ベンチに作業着が脱ぎっぱなし。……俺のじゃない、たぶん。');
        case 'exit/sign':return say('誘導灯だけが内蔵バッテリーで緑に光っている。');
        case 'exit/lockpanel':if(it)return no();return openZoom('lockpanel');
        case 'exit/tag':if(it)return no();return openZoom('tag');
        case 'exit/door':
          if(it)return no();
          if(!S.air)return say('<b>シャッター</b>が下りている。エアシリンダーで上げる仕組みだ。……横に札が下がっている。');
          if(!S.plcOk)return say('シャッターは上がった。でも扉の<b>電気錠</b>が掛かったままだ。');
          return openDoor();
      }
    }
    function openDoor(){
      if(S.door)return;
      S.door=true;S.clearT=T;AU.se('ach');renderInv();updScore();
      say('扉を押し開ける。冷たい朝の空気。雨はもう上がりかけている。',4);
    }

    // ── 入力 ──
    function toNorm(e){const r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];}
    function hitAt(nx,ny){
      const minW=44/W,minH=44/H;
      for(const h of HS[S.room]){
        const ex=Math.max(0,(minW-h.w)/2),ey=Math.max(0,(minH-h.h)/2);
        if(nx>=h.x-ex&&nx<=h.x+h.w+ex&&ny>=h.y-ey&&ny<=h.y+h.h+ey)return h;
      }
      return null;
    }
    cv.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){const [x,y]=toNorm(e);tlx=x;tly=y;}});
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();
      const [x,y]=toNorm(e);tlx=x;tly=y;
      if(!S.started||trans||S.door)return;
      ripple={x,y,t:0};
      const h=hitAt(x,y);
      if(h)tapHotspot(h);
      else if(S.sel){S.sel=null;renderInv();}
    });
    body.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>goRoom(+b.dataset.nav)));
    body.querySelectorAll('.esc-slot').forEach(b=>b.addEventListener('click',()=>tapItem(b.dataset.item)));
    $('.esc-hint').addEventListener('click',useHint);
    $('.esc-start').addEventListener('click',()=>{
      if(S.started)return;S.started=true;AU.se('decide');$('.esc-intro').classList.add('off');renderInv();
      say('真っ暗だ。スマホのライトだけが頼り。……まずは明かりを探そう。');
    });
    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      if(!S.started){if(e.key==='Enter'||e.key===' '){$('.esc-start').click();e.preventDefault();}return;}
      if(e.key==='Escape'){closeZoom();e.preventDefault();}
      else if(e.key==='ArrowLeft'&&!zoomId)goRoom(-1);
      else if(e.key==='ArrowRight'&&!zoomId)goRoom(1);
      else if(e.key==='h'||e.key==='H')useHint();
      else if(/^[1-5]$/.test(e.key))tapItem(S.inv[+e.key-1]);
    });

    // ══ 描画 ══
    const X=v=>v*W,Y=v=>v*H;
    const rr=(x,y,w,h,r)=>{cx.beginPath();cx.roundRect?cx.roundRect(x,y,w,h,r):cx.rect(x,y,w,h);};
    const RX=h=>[X(h.x),Y(h.y),X(h.w),Y(h.h)];
    function grad(y0,y1,a,b){const g=cx.createLinearGradient(0,y0,0,y1);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
    function room(top,bot,floorA,floorB){
      const fy=Y(FLOOR);
      cx.fillStyle=grad(0,fy,top,bot);cx.fillRect(0,0,W,fy);
      // 壁パネルの継ぎ目・汚れ
      cx.strokeStyle='rgba(0,0,0,.35)';cx.lineWidth=1;
      for(let i=1;i<5;i++){cx.beginPath();cx.moveTo(X(i*.2),Y(.035));cx.lineTo(X(i*.2),fy);cx.stroke();}
      stains.forEach(s=>{const g=cx.createRadialGradient(X(s.x),Y(s.y),0,X(s.x),Y(s.y),X(s.r));g.addColorStop(0,'rgba(0,0,0,.22)');g.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g;cx.fillRect(0,0,W,fy);});
      // 天井の配管
      cx.fillStyle='#0a0814';cx.fillRect(0,0,W,Y(.035));
      cx.fillStyle=grad(Y(.012),Y(.03),'#3a3548','#16131f');cx.fillRect(0,Y(.012),W,Y(.018));
      for(let i=0;i<6;i++){cx.fillStyle='#24202f';cx.fillRect(X(i*.2+.05),Y(.008),X(.02),Y(.03));}
      // 床（パースのついたタイル）
      cx.fillStyle=grad(fy,H,floorA,floorB);cx.fillRect(0,fy,W,H-fy);
      cx.strokeStyle='rgba(130,110,180,.11)';
      const vx=W/2,vy=fy-H*.6;
      for(let i=-9;i<=9;i++){const x0=W/2+i*W*.13;const t=(fy-H)/(vy-H);cx.beginPath();cx.moveTo(x0+(vx-x0)*t,fy);cx.lineTo(x0,H);cx.stroke();}
      for(let k=1;k<8;k++){const y=fy+(H-fy)*Math.pow(k/8,1.7);cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);cx.stroke();}
      cx.fillStyle='#08060f';cx.fillRect(0,fy-3,W,5);
      // 床の濡れた反射
      const g=cx.createLinearGradient(0,fy,0,H);g.addColorStop(0,'rgba(140,120,200,.06)');g.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g;cx.fillRect(0,fy,W,H-fy);
    }
    function shadow(x,y,w){const g=cx.createRadialGradient(x,y,0,x,y,w);g.addColorStop(0,'rgba(0,0,0,.55)');g.addColorStop(1,'rgba(0,0,0,0)');cx.save();cx.scale(1,.25);cx.fillStyle=g;cx.fillRect(x-w,(y-w)*4,w*2,w*8);cx.restore();}
    function screws(x,y,w,h,c){cx.fillStyle=c||'#8a8794';const s=Math.max(1.4,W*.004);[[x+s*2,y+s*2],[x+w-s*2,y+s*2],[x+s*2,y+h-s*2],[x+w-s*2,y+h-s*2]].forEach(([a,b])=>{cx.beginPath();cx.arc(a,b,s,0,7);cx.fill();});}
    function txt(s,x,y,size,col,align){cx.font=`${Math.round(size)}px ${FONT}`;cx.fillStyle=col;cx.textAlign=align||'center';cx.textBaseline='middle';cx.fillText(s,x,y);}

    // 窓（外は emissive パスで描く）
    function windowFrame(h,mul){
      const [x,y,w,hh]=RX(h);
      cx.fillStyle='#05050c';cx.fillRect(x,y,w,hh);
      cx.strokeStyle='#3a3648';cx.lineWidth=Math.max(3,W*.012);cx.strokeRect(x,y,w,hh);
      cx.lineWidth=Math.max(2,W*.006);cx.beginPath();cx.moveTo(x+w/2,y);cx.lineTo(x+w/2,y+hh);cx.moveTo(x,y+hh*.5);cx.lineTo(x+w,y+hh*.5);cx.stroke();
      cx.fillStyle='#2a2636';cx.fillRect(x-W*.01,y+hh,w+W*.02,Y(.012));
    }
    function windowOutside(h,a){
      const [x,y,w,hh]=RX(h);
      cx.save();cx.beginPath();cx.rect(x,y,w,hh);cx.clip();
      const g=cx.createLinearGradient(0,y,0,y+hh);g.addColorStop(0,`rgba(${20+flash*200},${18+flash*200},${44+flash*200},${a})`);g.addColorStop(1,`rgba(40,20,60,${a})`);
      cx.fillStyle=g;cx.fillRect(x,y,w,hh);
      // 街の灯り
      city.forEach(c=>{cx.globalAlpha=a*(.4+.6*Math.abs(Math.sin(T*.7+c.b*9)));cx.fillStyle=c.c;cx.fillRect(x+c.x*w,y+c.y*hh,Math.max(1.5,w*.02),Math.max(1.5,hh*.03));});
      cx.globalAlpha=a*.5;cx.fillStyle='#0a0814';cx.fillRect(x,y+hh*.78,w,hh*.22);
      for(let i=0;i<6;i++){cx.fillRect(x+w*(i*.18),y+hh*(.55+((i*37)%5)*.04),w*.12,hh);}
      // 雨
      cx.globalAlpha=a*.55;cx.strokeStyle='#9fb4ff';cx.lineWidth=1;cx.beginPath();
      rain.forEach(r=>{const ry=(r.y+T*r.v)%1.2-.1;cx.moveTo(x+r.x*w,y+ry*hh);cx.lineTo(x+r.x*w-w*.02,y+(ry+r.l)*hh);});cx.stroke();
      // ガラスを伝う雫
      cx.globalAlpha=a*.6;cx.fillStyle='#c8d4ff';
      drips.forEach(d=>{const dy=(d.y+T*d.v)%1;cx.beginPath();cx.arc(x+d.x*w,y+dy*hh,d.r*W*.004+1,0,7);cx.fill();cx.globalAlpha=a*.2;cx.fillRect(x+d.x*w-.5,y+(dy-.15)*hh,1,hh*.15);cx.globalAlpha=a*.6;});
      cx.restore();cx.globalAlpha=1;
      // 枠をもう一度（emissiveで上書きしたので）
      cx.strokeStyle='rgba(40,36,56,.9)';cx.lineWidth=Math.max(3,W*.012);cx.strokeRect(x,y,w,hh);
      cx.lineWidth=Math.max(2,W*.006);cx.beginPath();cx.moveTo(x+w/2,y);cx.lineTo(x+w/2,y+hh);cx.moveTo(x,y+hh*.5);cx.lineTo(x+w,y+hh*.5);cx.stroke();
    }
    function tubes(){
      if(!S.power)return;
      const k=lightLevel();
      [.2,.62].forEach(px=>{
        cx.fillStyle=`rgba(230,240,255,${.25+.75*k})`;cx.fillRect(X(px),Y(.036),X(.18),Y(.008));
        const g=cx.createRadialGradient(X(px+.09),Y(.04),0,X(px+.09),Y(.04),X(.3));g.addColorStop(0,`rgba(200,220,255,${.18*k})`);g.addColorStop(1,'rgba(200,220,255,0)');
        cx.fillStyle=g;cx.fillRect(X(px-.25),0,X(.7),Y(.35));
      });
    }

    // ── 制御室 ──
    function drawCtrl(){
      room('#1b1730','#100d1e','#0e0c17','#1b1727');
      const hw=hsById('ctrl','window');windowFrame(hw);
      // 単線結線図ポスター
      let [x,y,w,h]=RX(hsById('ctrl','diagram'));
      cx.fillStyle='#bdb59c';cx.fillRect(x,y,w,h);cx.fillStyle='#d6cfb6';cx.fillRect(x+3,y+3,w-6,h-6);
      cx.strokeStyle='#3a3046';cx.lineWidth=1.2;cx.beginPath();
      cx.moveTo(x+w/2,y+h*.12);cx.lineTo(x+w/2,y+h*.35);cx.moveTo(x+w*.25,y+h*.42);cx.lineTo(x+w*.75,y+h*.42);
      [.25,.75].forEach(a=>{cx.moveTo(x+w*a,y+h*.42);cx.lineTo(x+w*a,y+h*.62);});
      [.15,.5,.85].forEach(a=>{cx.moveTo(x+w*a,y+h*.7);cx.lineTo(x+w*a,y+h*.86);});cx.stroke();
      cx.fillStyle='#3a3046';[[.5,.32],[.25,.56],[.75,.56],[.15,.82],[.5,.82],[.85,.82]].forEach(([a,b])=>cx.fillRect(x+w*a-w*.06,y+h*b-h*.04,w*.12,h*.08));
      txt('単線結線図',x+w/2,y+h*.06+4,Math.max(8,W*.022),'#7a2030');
      cx.fillStyle='rgba(232,48,85,.6)';cx.fillRect(x+w*.86,y-2,w*.1,h*.12);
      // 勤務表ホワイトボード
      [x,y,w,h]=RX(hsById('ctrl','roster'));
      cx.fillStyle='#5a5866';cx.fillRect(x-3,y-3,w+6,h+6);cx.fillStyle=grad(y,y+h,'#dcdce4','#b8b8c4');cx.fillRect(x,y,w,h);
      cx.strokeStyle='rgba(40,60,120,.5)';cx.lineWidth=1;
      for(let i=0;i<6;i++){cx.beginPath();cx.moveTo(x+w*.04,y+h*(.2+i*.13));cx.lineTo(x+w*.96,y+h*(.2+i*.13));cx.stroke();}
      for(let i=0;i<8;i++){cx.beginPath();cx.moveTo(x+w*(.28+i*.095),y+h*.12);cx.lineTo(x+w*(.28+i*.095),y+h*.86);cx.stroke();}
      txt('勤務表',x+w*.14,y+h*.1,Math.max(8,W*.022),'#1d3a7a');
      for(let r=0;r<4;r++)for(let c=0;c<7;c++){const v=P.roster[r][c];cx.fillStyle=v==='夜'?'#5a2e8d':v==='休'?'#999':'#2a6aa8';cx.fillRect(x+w*(.3+c*.095),y+h*(.36+r*.13),w*.05,h*.06);}
      cx.fillStyle='#e83055';cx.beginPath();cx.arc(x+w*.93,y+h*.12,W*.008,0,7);cx.fill();
      cx.fillStyle='#2a2636';cx.fillRect(x,y+h,w,Y(.01));cx.fillStyle='#e83055';cx.fillRect(x+w*.7,y+h-1,w*.12,Y(.008));
      // PLC盤
      [x,y,w,h]=RX(hsById('ctrl','plc'));
      cx.fillStyle=grad(y,y+h,'#7d8090','#4a4c58');rr(x,y,w,h,3);cx.fill();
      cx.strokeStyle='#22232a';cx.lineWidth=1.5;cx.stroke();
      const a=S.anim.plcCover;
      cx.fillStyle='#1b1d22';cx.fillRect(x+w*.08,y+h*.1,w*.84,h*.8);
      // 中身（PLCユニット）
      cx.fillStyle='#d8d6cc';cx.fillRect(x+w*.12,y+h*.18,w*.3,h*.5);cx.fillStyle='#c8c4b6';cx.fillRect(x+w*.45,y+h*.18,w*.18,h*.5);cx.fillRect(x+w*.66,y+h*.18,w*.18,h*.5);
      cx.fillStyle='#333';for(let i=0;i<6;i++)cx.fillRect(x+w*(.47+(i%2)*.2),y+h*(.24+(i>>1)*.13),w*.12,h*.05);
      cx.fillStyle='#4a6a8a';cx.fillRect(x+w*.12,y+h*.74,w*.72,h*.1);
      // カバー（ネジ止め→外れて下に）
      if(a<1){
        cx.save();cx.translate(0,a*h*.9);cx.globalAlpha=1-a;
        cx.fillStyle=grad(y,y+h,'#9da0b0','#6a6c78');rr(x+w*.05,y+h*.06,w*.9,h*.88,2);cx.fill();
        cx.strokeStyle='#3a3b44';cx.stroke();screws(x+w*.05,y+h*.06,w*.9,h*.88,'#ddd');
        cx.fillStyle='#e8b830';cx.fillRect(x+w*.3,y+h*.4,w*.4,h*.18);txt('PLC',x+w*.5,y+h*.49,Math.max(8,W*.024),'#222');
        cx.restore();cx.globalAlpha=1;
      }
      // 分電盤（キャビネット）
      [x,y,w,h]=RX(hsById('ctrl','panel'));
      shadow(x+w/2,y+h,w*.7);
      cx.fillStyle=grad(y,y+h,'#8a8c98','#50525e');cx.fillRect(x,y,w,h);
      cx.fillStyle='#2a2b33';cx.fillRect(x+w*.06,y+h*.03,w*.88,h*.94);
      // 中のブレーカー列
      for(let r=0;r<3;r++)for(let c=0;c<(r?3:1);c++){
        const bx=r?x+w*(.14+c*.25):x+w*.36,by=y+h*(.1+r*.17),bw=r?w*.2:w*.28;
        cx.fillStyle='#d8d4c8';cx.fillRect(bx,by,bw,h*.12);cx.fillStyle='#222';cx.fillRect(bx+bw*.35,by+h*.03,bw*.3,h*.06);
        const code=r===0?'MCCB':'CB-'+(r===1?c+1:c+4);const on=S.bOn.includes(code)||S.power;
        if(r===2&&c===2)continue;
        cx.fillStyle=on?'#22aa66':'#555';cx.fillRect(bx+bw*.38,by+h*(on?.035:.06),bw*.24,h*.03);
      }
      // 扉
      const pa=S.anim.panel;
      if(pa<1){
        const dw=w*(1-pa*.85);
        cx.fillStyle=grad(y,y+h,'#9a9caa','#5a5c68');cx.beginPath();
        cx.moveTo(x,y);cx.lineTo(x+dw,y+h*.03*pa);cx.lineTo(x+dw,y+h-h*.03*pa);cx.lineTo(x,y+h);cx.closePath();cx.fill();
        cx.strokeStyle='#33343c';cx.lineWidth=1.5;cx.stroke();
        if(pa<.4){
          cx.fillStyle='#e8b830';cx.fillRect(x+w*.2,y+h*.08,w*.6,h*.06);txt('分電盤 LP-1',x+w*.5,y+h*.11,Math.max(7,W*.02),'#222');
          cx.fillStyle='#e8b830';cx.beginPath();cx.moveTo(x+w*.5,y+h*.2);cx.lineTo(x+w*.62,y+h*.28);cx.lineTo(x+w*.38,y+h*.28);cx.closePath();cx.fill();txt('⚡',x+w*.5,y+h*.255,Math.max(7,W*.02),'#222');
          cx.fillStyle='#222';rr(x+w*.78,y+h*.45,w*.1,h*.12,2);cx.fill();cx.fillStyle='#aaa';cx.beginPath();cx.arc(x+w*.83,y+h*.49,w*.025,0,7);cx.fill();
          for(let i=0;i<5;i++){cx.fillStyle='#3a3b44';cx.fillRect(x+w*.2,y+h*(.7+i*.04),w*.5,h*.012);}
        }
      }
      // 机
      [x,y,w,h]=RX(hsById('ctrl','desk'));
      shadow(x+w/2,y+h,w*.6);
      cx.fillStyle='#24202e';cx.fillRect(x+w*.04,y+h*.3,w*.04,h*.7);cx.fillRect(x+w*.92,y+h*.3,w*.04,h*.7);
      cx.fillStyle=grad(y+h*.24,y+h*.32,'#5a4c3c','#3a3028');cx.fillRect(x,y+h*.24,w,h*.08);
      // 引き出し
      const da=S.anim.drawer;
      cx.fillStyle='#3a3340';cx.fillRect(x+w*.5,y+h*.32,w*.4,h*.5);
      cx.fillStyle=grad(y+h*.36,y+h*.56,'#585060','#3c3644');cx.fillRect(x+w*.52,y+h*.36+da*h*.12,w*.36,h*.2);
      cx.fillStyle='#aaa';cx.fillRect(x+w*.65,y+h*.44+da*h*.12,w*.1,h*.025);
      cx.fillStyle=grad(y+h*.6,y+h*.78,'#585060','#3c3644');cx.fillRect(x+w*.52,y+h*.6,w*.36,h*.18);cx.fillStyle='#aaa';cx.fillRect(x+w*.65,y+h*.68,w*.1,h*.025);
      // モニター・キーボード・マグ・絵
      cx.fillStyle='#16141c';cx.fillRect(x+w*.1,y-h*.12,w*.36,h*.32);cx.fillStyle=S.power?'#0c2c3a':'#0a0a10';cx.fillRect(x+w*.12,y-h*.1,w*.32,h*.26);
      cx.fillStyle='#24202e';cx.fillRect(x+w*.25,y+h*.18,w*.06,h*.07);
      cx.fillStyle='#2e2a38';cx.fillRect(x+w*.12,y+h*.2,w*.3,h*.04);
      cx.fillStyle='#d8d0c4';rr(x+w*.62,y+h*.08,w*.08,h*.15,2);cx.fill();cx.strokeStyle='#d8d0c4';cx.lineWidth=2;cx.beginPath();cx.arc(x+w*.71,y+h*.15,h*.04,-1.4,1.4);cx.stroke();
      cx.fillStyle='#f4f0e2';cx.save();cx.translate(x+w*.78,y-h*.22);cx.rotate(.08);cx.fillRect(0,0,w*.16,h*.22);
      cx.fillStyle='#e83055';cx.fillRect(w*.03,h*.1,w*.1,h*.08);cx.fillStyle='#555';cx.fillRect(w*.08,h*.03,w*.025,h*.08);
      cx.strokeStyle='#e8b830';cx.lineWidth=1.5;cx.beginPath();cx.arc(w*.09,h*.06,w*.05,3.4,6);cx.stroke();cx.restore();
      // 椅子
      cx.fillStyle='#1e1a28';cx.fillRect(x+w*.2,y+h*.45,w*.22,h*.07);cx.fillRect(x+w*.29,y+h*.52,w*.04,h*.32);cx.fillRect(x+w*.18,y+h*.84,w*.26,h*.03);
      cx.fillStyle='#2a2438';cx.fillRect(x+w*.18,y+h*.05,w*.06,h*.42);
      // 配線ダクト
      cx.fillStyle='#2c2838';cx.fillRect(X(.73),Y(.04),X(.02),Y(.68));
    }
    function emisCtrl(){
      windowOutside(hsById('ctrl','window'),.85);
      const [x,y,w,h]=RX(hsById('ctrl','panel'));
      // 盤の表示灯
      const on=S.power;
      cx.fillStyle=on?'#44ee88':(Math.sin(T*4)>0?'#e83055':'#401018');
      cx.beginPath();cx.arc(x+w*.83,y+h*.38,Math.max(2,W*.007),0,7);cx.fill();
      glow(x+w*.83,y+h*.38,W*.03,on?'68,238,136':'232,48,85',.5);
      if(S.power){
        const [px,py,pw,ph]=RX(hsById('ctrl','plc'));
        if(S.plcCover){
          for(let i=0;i<8;i++){const lit=i===0||(i<4?S.x[i]:P.rungs[i-4]&&P.ev(P.rungs[i-4],S.x));cx.fillStyle=lit?(i===0?'#44ee88':'#e8b830'):'#332';cx.fillRect(px+pw*(.15+(i%4)*.06),py+ph*(.25+(i>>2)*.1),pw*.035,ph*.05);}
        }
        cx.fillStyle='#44ee88';cx.fillRect(px+pw*.86,py+ph*.04,pw*.04,ph*.04);
        const [dx_,dy_,dw,dh]=RX(hsById('ctrl','desk'));
        cx.fillStyle='rgba(0,232,200,.5)';cx.font=`${Math.max(7,W*.018)}px ${FONT}`;cx.textAlign='left';
        cx.fillText('POWER RESTORED',dx_+dw*.13,dy_-dh*.02);
        glow(dx_+dw*.28,dy_+dh*.03,dw*.3,'0,232,200',.15);
      }
    }
    // ── 部品倉庫 ──
    function drawStore(){
      room('#1a1824','#0f0e18','#0d0c14','#1c1a24');
      let [x,y,w,h]=RX(hsById('store','shelf'));
      shadow(x+w/2,y+h,w*.6);
      cx.fillStyle='#2b4a6a';cx.fillRect(x,y,w*.05,h);cx.fillRect(x+w*.95,y,w*.05,h);
      for(let s=0;s<4;s++){
        const sy=y+h*(.04+s*.25);
        cx.fillStyle='#d8822a';cx.fillRect(x,sy+h*.2,w,h*.025);
        // 箱
        for(let b=0;b<3;b++){
          const bx=x+w*(.08+b*.3),bw=w*(.24-((b+s)%2)*.04),bh=h*(.12+((b*3+s)%3)*.025);
          cx.fillStyle=['#8a6a44','#6a5a4a','#4a5a6a'][(b+s)%3];cx.fillRect(bx,sy+h*.2-bh,bw,bh);
          cx.fillStyle='rgba(255,255,255,.12)';cx.fillRect(bx,sy+h*.2-bh,bw,h*.01);
          cx.fillStyle='#e8e0cc';cx.fillRect(bx+bw*.2,sy+h*.2-bh*.6,bw*.6,bh*.25);
        }
      }
      // 電池箱（目印）
      if(!S.gotBatt){cx.fillStyle='#1e6a8a';cx.fillRect(x+w*.38,y+h*.415,w*.24,h*.08);cx.fillStyle='#00e8c8';cx.fillRect(x+w*.4,y+h*.43,w*.2,h*.025);txt('電池',x+w*.5,y+h*.47,Math.max(7,W*.02),'#fff');}
      // 工具板
      [x,y,w,h]=RX(hsById('store','board'));
      cx.fillStyle='#6a5a44';cx.fillRect(x,y,w,h);cx.fillStyle='#4c3e2c';
      for(let i=0;i<12;i++)for(let j=0;j<5;j++){cx.beginPath();cx.arc(x+w*(.04+i*.083),y+h*(.1+j*.2),1.1,0,7);cx.fill();}
      cx.strokeStyle='#ddd';cx.fillStyle='#bbb';cx.lineWidth=Math.max(2,W*.008);
      // スパナ・ハンマー・ペンチの影
      cx.fillStyle='#9aa';cx.fillRect(x+w*.08,y+h*.15,w*.04,h*.7);cx.beginPath();cx.arc(x+w*.1,y+h*.15,w*.04,0,7);cx.fill();
      cx.fillStyle='#753';cx.fillRect(x+w*.24,y+h*.3,w*.03,h*.6);cx.fillStyle='#888';cx.fillRect(x+w*.19,y+h*.15,w*.13,h*.18);
      cx.fillStyle='#c33';cx.fillRect(x+w*.42,y+h*.45,w*.025,h*.45);cx.fillRect(x+w*.47,y+h*.45,w*.025,h*.45);cx.fillStyle='#999';cx.fillRect(x+w*.425,y+h*.12,w*.07,h*.35);
      // ドライバー
      cx.strokeStyle='#e8e0cc';cx.lineWidth=1;cx.setLineDash([3,3]);cx.strokeRect(x+w*.62,y+h*.08,w*.08,h*.84);cx.setLineDash([]);
      if(!S.gotDriver){cx.fillStyle='#e8b830';cx.fillRect(x+w*.635,y+h*.12,w*.05,h*.32);cx.fillStyle='#e83055';cx.fillRect(x+w*.635,y+h*.3,w*.05,h*.14);cx.fillStyle='#ccc';cx.fillRect(x+w*.655,y+h*.44,w*.012,h*.42);}
      cx.fillStyle='#4a6a8a';cx.fillRect(x+w*.78,y+h*.15,w*.12,h*.7);cx.fillStyle='#c0c0c8';cx.fillRect(x+w*.8,y+h*.2,w*.08,h*.08);
      // エアタンク
      [x,y,w,h]=RX(hsById('store','tank'));
      shadow(x+w/2,y+h,w*.8);
      const tg=cx.createLinearGradient(x,0,x+w,0);tg.addColorStop(0,'#2a4a5a');tg.addColorStop(.35,'#6a9ab0');tg.addColorStop(.6,'#3a6a80');tg.addColorStop(1,'#1a2a38');
      cx.fillStyle=tg;rr(x+w*.1,y+h*.16,w*.8,h*.8,w*.35);cx.fill();
      cx.fillStyle='#e8e0cc';cx.fillRect(x+w*.2,y+h*.55,w*.6,h*.1);txt('AIR',x+w*.5,y+h*.6,Math.max(7,W*.022),'#235');
      cx.fillStyle='#555';cx.fillRect(x+w*.44,y+h*.05,w*.12,h*.12);
      // 圧力計
      const gx=x+w*.5,gy=y+h*.08,gr=Math.min(w*.32,h*.1);
      cx.fillStyle='#999';cx.beginPath();cx.arc(gx,gy,gr,0,7);cx.fill();cx.fillStyle='#e8e2cc';cx.beginPath();cx.arc(gx,gy,gr*.84,0,7);cx.fill();
      const na=(135+270*P.tank/100)*Math.PI/180;cx.strokeStyle='#b01828';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(gx,gy);cx.lineTo(gx+Math.cos(na)*gr*.75,gy+Math.sin(na)*gr*.75);cx.stroke();
      // バルブ群
      [x,y,w,h]=RX(hsById('store','valves'));
      cx.fillStyle=grad(y,y+h*.08,'#7a8a96','#3a4a56');cx.fillRect(x-W*.02,y+h*.05,w+W*.04,h*.07);
      cx.fillStyle='#4a5a66';cx.fillRect(x+w*.92,y-h*.8,w*.06,h*.9);
      for(let i=0;i<3;i++){
        const vx=x+w*(.18+i*.32);
        cx.fillStyle='#4a5a66';cx.fillRect(vx-w*.04,y+h*.12,w*.08,h*.88);
        cx.fillStyle='#ddd';cx.beginPath();cx.arc(vx,y+h*.3,w*.1,0,7);cx.fill();cx.fillStyle='#f4efe0';cx.beginPath();cx.arc(vx,y+h*.3,w*.08,0,7);cx.fill();
        const v=S.power?P.valves[i]/100:0,an=(135+270*v)*Math.PI/180;cx.strokeStyle='#b01828';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(vx,y+h*.3);cx.lineTo(vx+Math.cos(an)*w*.07,y+h*.3+Math.sin(an)*w*.07);cx.stroke();
        const rot=(S.valve===i?T*3:0);
        cx.save();cx.translate(vx,y+h*.6);cx.rotate(rot);cx.strokeStyle='#c02838';cx.lineWidth=Math.max(2,W*.008);cx.beginPath();cx.arc(0,0,w*.11,0,7);cx.stroke();
        cx.beginPath();cx.moveTo(-w*.11,0);cx.lineTo(w*.11,0);cx.moveTo(0,-w*.11);cx.lineTo(0,w*.11);cx.stroke();cx.restore();
        txt('ABC'[i],vx,y+h*.82,Math.max(8,W*.024),'#e8e0cc');
      }
      // パレット
      [x,y,w,h]=RX(hsById('store','pallet'));
      shadow(x+w/2,y+h,w*.6);
      cx.fillStyle='#6a4a2a';cx.fillRect(x,y+h*.8,w,h*.2);cx.fillStyle='#3a2a1a';for(let i=0;i<4;i++)cx.fillRect(x+w*(.05+i*.3),y+h*.85,w*.1,h*.15);
      cx.fillStyle='#8a6a44';cx.fillRect(x+w*.05,y+h*.1,w*.42,h*.7);cx.fillStyle='#7a5a3a';cx.fillRect(x+w*.5,y+h*.3,w*.42,h*.5);
      cx.fillStyle='rgba(200,220,255,.15)';cx.fillRect(x+w*.05,y+h*.1,w*.87,h*.06);
      // 誘導矢印
      cx.fillStyle='#1a3a2a';cx.fillRect(X(.82),Y(.76),X(.14),Y(.05));
    }
    function emisStore(){
      txt('非常口 →',X(.89),Y(.785),Math.max(8,W*.022),'#44ee88');glow(X(.89),Y(.785),X(.1),'68,238,136',.2);
      const [x,y,w,h]=RX(hsById('store','tank'));
      cx.fillStyle=S.power?'#44ee88':'#401018';cx.beginPath();cx.arc(x+w*.8,y+h*.22,Math.max(2,W*.006),0,7);cx.fill();
      if(S.power)glow(x+w*.8,y+h*.22,W*.03,'68,238,136',.4);
      // 天窓の稲光
      if(flash>0){cx.fillStyle=`rgba(200,210,255,${flash*.25})`;cx.fillRect(X(.5),0,X(.4),Y(.04));}
    }
    // ── 更衣室 ──
    function drawLocker(){
      room('#16202a','#0d1219','#0c0e14','#191c24');
      for(let i=0;i<4;i++){
        const h=HS.locker[i];let [x,y,w,hh]=RX(h);
        const own=i===2;
        cx.fillStyle=grad(y,y+hh,'#5a6a70','#34404a');cx.fillRect(x,y,w,hh);
        cx.strokeStyle='#1c2228';cx.lineWidth=1.5;cx.strokeRect(x,y,w,hh);
        if(own&&S.anim.locker>0){
          // 中身
          cx.fillStyle='#14181c';cx.fillRect(x+w*.06,y+hh*.02,w*.88,hh*.96);
          cx.fillStyle='#3a4a6a';cx.beginPath();cx.moveTo(x+w*.3,y+hh*.1);cx.lineTo(x+w*.7,y+hh*.1);cx.lineTo(x+w*.8,y+hh*.55);cx.lineTo(x+w*.2,y+hh*.55);cx.closePath();cx.fill();
          cx.fillStyle='#888';cx.fillRect(x+w*.45,y+hh*.06,w*.1,hh*.05);
          cx.fillStyle='#2a2a30';cx.fillRect(x+w*.2,y+hh*.75,w*.6,hh*.2);
          const a=S.anim.locker,dw=w*(1-a*.8);
          cx.fillStyle=grad(y,y+hh,'#6a7a80','#3a464e');cx.beginPath();cx.moveTo(x,y);cx.lineTo(x-dw*.15*a+dw*(1-a*.3),y-hh*.03*a);cx.lineTo(x-dw*.15*a+dw*(1-a*.3),y+hh+hh*.03*a);cx.lineTo(x,y+hh);cx.closePath();cx.fill();
          // 扉の裏の写真
          if(a>.5){cx.fillStyle='#f4f0e6';cx.fillRect(x+w*.02,y+hh*.3,w*.1,hh*.1);cx.fillStyle='#e8b830';cx.fillRect(x+w*.03,y+hh*.32,w*.08,hh*.06);}
          continue;
        }
        for(let k=0;k<5;k++){cx.fillStyle='#1e262c';cx.fillRect(x+w*.25,y+hh*(.06+k*.025),w*.5,hh*.01);}
        cx.fillStyle='#e8e0cc';cx.fillRect(x+w*.2,y+hh*.2,w*.6,hh*.06);
        txt(NAMES[i],x+w*.5,y+hh*.23,Math.max(7,Math.min(W*.024,w*.18)),own?'#a0203c':'#333');
        cx.fillStyle='#22282e';cx.fillRect(x+w*.78,y+hh*.42,w*.08,hh*.14);
        if(own){cx.fillStyle='#222';cx.beginPath();cx.arc(x+w*.55,y+hh*.5,w*.15,0,7);cx.fill();cx.fillStyle='#bbb';cx.beginPath();cx.arc(x+w*.55,y+hh*.5,w*.11,0,7);cx.fill();
          cx.strokeStyle='#333';cx.lineWidth=1;for(let k=0;k<10;k++){const an=k*.628+T*.0;cx.beginPath();cx.moveTo(x+w*.55+Math.cos(an)*w*.07,y+hh*.5+Math.sin(an)*w*.07);cx.lineTo(x+w*.55+Math.cos(an)*w*.11,y+hh*.5+Math.sin(an)*w*.11);cx.stroke();}}
        cx.fillStyle='rgba(255,255,255,.07)';cx.fillRect(x+w*.05,y,w*.06,hh);
      }
      // 鏡＋メモ
      let [x,y,w,h]=RX(hsById('locker','note'));
      cx.fillStyle='#7a7a88';cx.fillRect(x-3,y-3,w+6,h+6);
      const mg_=cx.createLinearGradient(x,y,x+w,y+h);mg_.addColorStop(0,'#2a3448');mg_.addColorStop(.5,'#46546a');mg_.addColorStop(1,'#1a2234');cx.fillStyle=mg_;cx.fillRect(x,y,w,h);
      cx.strokeStyle='rgba(255,255,255,.18)';cx.lineWidth=2;cx.beginPath();cx.moveTo(x+w*.15,y+h*.9);cx.lineTo(x+w*.5,y+h*.1);cx.moveTo(x+w*.3,y+h*.95);cx.lineTo(x+w*.65,y+h*.15);cx.stroke();
      cx.save();cx.translate(x+w*.62,y+h*.52);cx.rotate(.12);cx.fillStyle='#e8d050';cx.fillRect(0,0,w*.32,h*.36);cx.fillStyle='#5a4a10';for(let k=0;k<3;k++)cx.fillRect(w*.04,h*(.08+k*.09),w*.22,h*.025);cx.restore();
      cx.fillStyle='#d0d0d8';cx.fillRect(x-W*.01,y+h+Y(.02),w+W*.02,Y(.04));cx.fillStyle='#aaa';cx.fillRect(x+w*.45,y+h+Y(.005),w*.08,Y(.02));
      windowFrame(hsById('locker','lwin'));
      // ベンチ
      [x,y,w,h]=RX(hsById('locker','bench'));
      shadow(x+w/2,y+h,w*.6);
      cx.fillStyle='#6a4a30';cx.fillRect(x,y,w,h*.3);cx.fillStyle='#3a2a1c';cx.fillRect(x+w*.05,y+h*.3,w*.04,h*.7);cx.fillRect(x+w*.91,y+h*.3,w*.04,h*.7);
      cx.fillStyle='#2a3a5a';cx.beginPath();cx.moveTo(x+w*.55,y);cx.lineTo(x+w*.85,y-h*.1);cx.lineTo(x+w*.9,y+h*.25);cx.lineTo(x+w*.6,y+h*.3);cx.closePath();cx.fill();
      cx.fillStyle='#e8b830';cx.fillRect(x+w*.62,y+h*.04,w*.06,h*.06);
    }
    function emisLocker(){windowOutside(hsById('locker','lwin'),.8);}
    // ── 非常口 ──
    function drawExit(){
      room('#191a22','#0e0e15','#0d0d12','#1a1a20');
      let [x,y,w,h]=RX(hsById('exit','door'));
      // 床の黄黒ハザード
      cx.save();cx.beginPath();cx.rect(x-W*.03,Y(FLOOR),w+W*.06,Y(.04));cx.clip();
      for(let i=-4;i<30;i++){cx.fillStyle=i%2?'#1a1a1a':'#b89020';cx.beginPath();const sx=x-W*.03+i*W*.03;cx.moveTo(sx,Y(FLOOR));cx.lineTo(sx+W*.03,Y(FLOOR));cx.lineTo(sx+W*.0,Y(FLOOR+.04));cx.lineTo(sx-W*.03,Y(FLOOR+.04));cx.fill();}
      cx.restore();
      // 枠
      cx.fillStyle='#3a3a44';cx.fillRect(x-W*.025,y-W*.025,w+W*.05,h+W*.025);
      // 扉（外の光は emissive で）
      const da=S.anim.door;
      cx.fillStyle='#0b0b10';cx.fillRect(x,y,w,h);
      const lw=w/2*(1-da*.85);
      cx.fillStyle=grad(y,y+h,'#5a6270','#353a44');cx.fillRect(x,y,lw,h);cx.fillRect(x+w-lw,y,lw,h);
      cx.fillStyle='rgba(0,0,0,.35)';cx.fillRect(x+lw-2,y,2,h);cx.fillRect(x+w-lw,y,2,h);
      if(da<.3){cx.fillStyle='#aab';cx.fillRect(x+w*.1,y+h*.5,w*.8,h*.03);cx.fillStyle='#d8d0b0';cx.fillRect(x+w*.38,y+h*.18,w*.24,h*.14);txt('EXIT',x+w*.5,y+h*.25,Math.max(8,W*.024),'#2a6a3a');}
      // シャッター
      const sh=1-S.anim.shutter;
      if(sh>0){
        const shH=(h+W*.02)*sh;
        cx.fillStyle=grad(y-W*.03,y+shH,'#8a8c94','#5a5c64');cx.fillRect(x-W*.02,y-W*.03,w+W*.04,shH);
        cx.fillStyle='rgba(0,0,0,.3)';for(let k=0;k<shH/(H*.022);k++)cx.fillRect(x-W*.02,y-W*.03+k*H*.022,w+W*.04,1.5);
        cx.fillStyle='#3a3c44';cx.fillRect(x-W*.02,y-W*.03+shH-H*.012,w+W*.04,H*.012);
      }
      cx.fillStyle='#2e2e38';cx.fillRect(x-W*.04,y-W*.06,w+W*.08,W*.04);
      // 電気錠パネル
      [x,y,w,h]=RX(hsById('exit','lockpanel'));
      cx.fillStyle=grad(y,y+h,'#4a4c58','#2a2b34');rr(x,y,w,h,3);cx.fill();cx.strokeStyle='#15151a';cx.stroke();
      cx.fillStyle='#e8e0cc';cx.fillRect(x+w*.12,y+h*.55,w*.76,h*.3);
      for(let i=0;i<4;i++){cx.fillStyle=P.target[i]?'#c08010':'#444';cx.beginPath();cx.arc(x+w*(.22+i*.19),y+h*.7,w*.06,0,7);cx.fill();}
      cx.fillStyle='#111';cx.fillRect(x+w*.2,y+h*.12,w*.6,h*.3);
      // エアシリンダー＋札
      [x,y,w,h]=RX(hsById('exit','tag'));
      cx.fillStyle=grad(y,y+h,'#8090a0','#40505c');cx.fillRect(x+w*.35,y,w*.3,h*.85);
      cx.fillStyle='#c0c8d0';cx.fillRect(x+w*.45,y-h*.1,w*.1,h*.12);
      cx.fillStyle='#4a5a66';cx.fillRect(x+w*.35,y+h*.85,w*.3,h*.05);
      cx.strokeStyle='#222';cx.lineWidth=1;cx.beginPath();cx.moveTo(x+w*.5,y+h*.3);cx.lineTo(x+w*.5,y+h*.4);cx.stroke();
      cx.save();cx.translate(x+w*.5,y+h*.4);cx.rotate(Math.sin(T*1.2)*.06);cx.fillStyle='#e8e0b0';cx.fillRect(-w*.32,0,w*.64,h*.2);cx.fillStyle='#a0203c';cx.fillRect(-w*.24,h*.05,w*.48,h*.03);cx.fillStyle='#333';cx.fillRect(-w*.24,h*.11,w*.4,h*.025);cx.restore();
      // ホース
      cx.strokeStyle='#1a3a5a';cx.lineWidth=Math.max(2,W*.008);cx.beginPath();cx.moveTo(x+w*.5,y+h*.9);cx.quadraticCurveTo(x+w*.5,Y(FLOOR+.02),X(.0),Y(FLOOR-.02));cx.stroke();
      // 水たまり
      cx.fillStyle='rgba(60,80,110,.25)';cx.beginPath();cx.ellipse(X(.62),Y(.86),X(.2),Y(.03),0,0,7);cx.fill();
    }
    function emisExit(){
      let [x,y,w,h]=RX(hsById('exit','sign'));
      const fl=.85+.15*Math.sin(T*23)*Math.sin(T*3.1);
      glow(x+w/2,y+h/2,w*.9,'68,238,136',.35*fl);
      cx.fillStyle=`rgba(40,200,110,${fl})`;rr(x,y,w,h,2);cx.fill();
      cx.fillStyle='#e8fff0';cx.fillRect(x+w*.04,y+h*.12,w*.3,h*.76);
      // 走る人のピクト
      cx.fillStyle='#1a9a50';const px=x+w*.19,py=y+h*.5,s=h*.3;
      cx.beginPath();cx.arc(px+s*.3,py-s*.9,s*.25,0,7);cx.fill();
      cx.lineWidth=s*.28;cx.strokeStyle='#1a9a50';cx.lineCap='round';cx.beginPath();cx.moveTo(px+s*.2,py-s*.55);cx.lineTo(px-s*.1,py+s*.2);cx.lineTo(px+s*.4,py+s*.9);cx.moveTo(px-s*.1,py+s*.2);cx.lineTo(px-s*.6,py+s*.8);cx.moveTo(px+s*.1,py-s*.3);cx.lineTo(px+s*.6,py);cx.moveTo(px+s*.1,py-s*.3);cx.lineTo(px-s*.4,py-s*.1);cx.stroke();cx.lineCap='butt';
      txt('非常口',x+w*.66,y+h*.52,Math.min(h*.6,W*.04),'#e8fff0');
      // 水たまりの反射
      cx.fillStyle=`rgba(68,238,136,${.12*fl})`;cx.beginPath();cx.ellipse(X(.5),Y(.86),X(.12),Y(.012),0,0,7);cx.fill();
      // 電気錠LED
      [x,y,w,h]=RX(hsById('exit','lockpanel'));
      const c=S.plcOk?'68,238,136':S.power?'232,184,48':'232,48,85';
      cx.fillStyle=`rgb(${c})`;cx.beginPath();cx.arc(x+w*.5,y+h*.27,w*.08,0,7);cx.fill();glow(x+w*.5,y+h*.27,w*.4,c,.5);
      // 扉が開いたら朝の光
      const da=S.anim.door;
      if(da>0){
        [x,y,w,h]=RX(hsById('exit','door'));
        const lw=w/2*(1-da*.85),ox=x+lw,ow=w-lw*2;
        const g=cx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,`rgba(255,200,150,${da})`);g.addColorStop(.6,`rgba(255,236,200,${da})`);g.addColorStop(1,`rgba(200,220,255,${da})`);
        cx.fillStyle=g;cx.fillRect(ox,y,ow,h);
        cx.globalCompositeOperation='lighter';
        const lg=cx.createRadialGradient(x+w/2,y+h*.6,0,x+w/2,y+h*.6,W*(.4+da));lg.addColorStop(0,`rgba(255,220,170,${.5*da})`);lg.addColorStop(1,'rgba(255,220,170,0)');
        cx.fillStyle=lg;cx.fillRect(0,0,W,H);
        // 床に伸びる光
        cx.fillStyle=`rgba(255,230,190,${.25*da})`;cx.beginPath();cx.moveTo(ox,y+h);cx.lineTo(ox+ow,y+h);cx.lineTo(W*(.5+.5*da),H);cx.lineTo(W*(.5-.5*da),H);cx.closePath();cx.fill();
        cx.globalCompositeOperation='source-over';
      }
    }
    function glow(x,y,r,rgb,a){const g=cx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);cx.fillStyle=g;cx.fillRect(x-r,y-r,r*2,r*2);}
    const DRAW={ctrl:[drawCtrl,emisCtrl],store:[drawStore,emisStore],locker:[drawLocker,emisLocker],exit:[drawExit,emisExit]};

    // 照明の明るさ（復電直後はチカチカ）
    function lightLevel(){
      if(!S.power)return 0;
      const t=T-S.powerT;
      if(t<1.6)return (Math.sin(t*40)>.2||Math.random()<.2)?Math.min(1,t/1.2):.05;
      return .85+.15*(Math.random()<.015?0:1);
    }
    function drawScene(){
      const [draw,emis]=DRAW[S.room];
      cx.save();
      if(trans){const k=trans.sw?(1-trans.t)*2:0;cx.translate(trans.d*k*W*.08*(trans.sw?1:0),0);}
      draw();
      // ── 暗闇＋懐中電灯 ──
      const lit=lightLevel();
      let amb=S.power?.92-.5*lit:.95;
      amb=Math.max(.15,amb-flash*.55);
      if(S.door)amb*=Math.max(0,1-S.anim.door*.7);
      const L=lx*W,Lc=ly*H;
      const R=(S.torch?.52:.27)*Math.min(W*1.15,H*.9)*(S.torch?1:(.96+.04*Math.sin(T*9)));
      dx.setTransform(dpr,0,0,dpr,0,0);
      dx.globalCompositeOperation='source-over';dx.clearRect(0,0,W,H);
      dx.fillStyle=`rgba(3,2,10,${amb})`;dx.fillRect(0,0,W,H);
      dx.globalCompositeOperation='destination-out';
      // ビーム
      const ox=W*.5,oy=H*1.05,ang=Math.atan2(Lc-oy,L-ox),pa=ang+Math.PI/2;
      const bg=dx.createLinearGradient(ox,oy,L,Lc);bg.addColorStop(0,'rgba(0,0,0,0)');bg.addColorStop(1,`rgba(0,0,0,${S.torch?.45:.25})`);
      dx.fillStyle=bg;dx.beginPath();dx.moveTo(ox+Math.cos(pa)*W*.03,oy+Math.sin(pa)*W*.03);dx.lineTo(L+Math.cos(pa)*R*.7,Lc+Math.sin(pa)*R*.7);dx.lineTo(L-Math.cos(pa)*R*.7,Lc-Math.sin(pa)*R*.7);dx.lineTo(ox-Math.cos(pa)*W*.03,oy-Math.sin(pa)*W*.03);dx.closePath();dx.fill();
      const rg=dx.createRadialGradient(L,Lc,0,L,Lc,R);rg.addColorStop(0,'rgba(0,0,0,1)');rg.addColorStop(.5,'rgba(0,0,0,.9)');rg.addColorStop(.8,'rgba(0,0,0,.4)');rg.addColorStop(1,'rgba(0,0,0,0)');
      dx.fillStyle=rg;dx.beginPath();dx.arc(L,Lc,R,0,7);dx.fill();
      cx.drawImage(dark,0,0,W,H);
      // 光の色味
      cx.globalCompositeOperation='lighter';
      const tg=cx.createRadialGradient(L,Lc,0,L,Lc,R*.9);tg.addColorStop(0,S.torch?'rgba(255,214,150,.13)':'rgba(170,200,255,.09)');tg.addColorStop(1,'rgba(0,0,0,0)');
      cx.fillStyle=tg;cx.fillRect(0,0,W,H);
      // 埃
      dust.forEach(d=>{
        const px=d.x*W,py=d.y*H,dd=Math.hypot(px-L,py-Lc);
        if(dd>R)return;
        const a=(1-dd/R)*(.35+.3*Math.sin(T*2+d.p));
        cx.fillStyle=`rgba(255,240,210,${a})`;cx.beginPath();cx.arc(px,py,d.s*(W/400),0,7);cx.fill();
      });
      cx.globalCompositeOperation='source-over';
      tubes();
      emis();
      // 調べられる場所のマーカー（光の中だけ）
      if(S.started&&!S.door){
        HS[S.room].forEach(h=>{
          const [x,y,w,hh]=RX(h),cxp=x+w/2,cyp=y+hh/2;
          const dd=Math.hypot(cxp-L,cyp-Lc);
          const a=Math.max(0,1-dd/(R*1.05))*(.45+.25*Math.sin(T*3+h.x*9));
          if(a<=.02)return;
          const c=Math.min(w,hh)*.18+4;
          cx.strokeStyle=S.sel?`rgba(232,184,48,${a})`:`rgba(0,232,200,${a})`;cx.lineWidth=1.5;cx.beginPath();
          cx.moveTo(x,y+c);cx.lineTo(x,y);cx.lineTo(x+c,y);cx.moveTo(x+w-c,y);cx.lineTo(x+w,y);cx.lineTo(x+w,y+c);
          cx.moveTo(x+w,y+hh-c);cx.lineTo(x+w,y+hh);cx.lineTo(x+w-c,y+hh);cx.moveTo(x+c,y+hh);cx.lineTo(x,y+hh);cx.lineTo(x,y+hh-c);cx.stroke();
          if(dd<R*.45){txt(h.nm,cxp,y-7>Y(.04)?y-7:y+hh+8,Math.max(9,W*.026),`rgba(222,204,248,${Math.min(1,a*1.6)})`);}
        });
      }
      // タップの波紋
      if(ripple){const k=ripple.t;cx.strokeStyle=`rgba(0,232,200,${1-k})`;cx.lineWidth=2;cx.beginPath();cx.arc(ripple.x*W,ripple.y*H,6+k*26,0,7);cx.stroke();}
      cx.restore();
      // 雨音を感じるビネット
      const vg=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.55)');cx.fillStyle=vg;cx.fillRect(0,0,W,H);
      // 部屋移動の暗転
      if(trans){const k=trans.t<.5?trans.t*2:(1-trans.t)*2;cx.fillStyle=`rgba(3,2,10,${Math.min(1,k*1.1)})`;cx.fillRect(0,0,W,H);}
      // 脱出演出
      if(S.door&&S.anim.door>.6){
        const k=(S.anim.door-.6)/.4;cx.fillStyle=`rgba(255,244,225,${k*.85})`;cx.fillRect(0,0,W,H);
        txt('脱出成功',W/2,H*.45,W*.09,`rgba(80,40,30,${k})`);txt('午前6時42分　雨上がり',W/2,H*.53,W*.04,`rgba(120,80,60,${k})`);
      }
      // 残り時間が少ないと赤く脈打つ
      if(S.started&&!S.door&&S.left<30){const a=(.5+.5*Math.sin(T*6))*.18;cx.strokeStyle=`rgba(232,48,85,${a})`;cx.lineWidth=10;cx.strokeRect(0,0,W,H);}
    }

    // ── メインループ ──
    let ro=null;
    if(window.ResizeObserver){ro=new ResizeObserver(()=>{if(!mg._ended)layout();});ro.observe(stage);}
    else window.addEventListener('resize',layout);
    const cleanup=()=>{if(ro)ro.disconnect();else window.removeEventListener('resize',layout);};
    layout();updNav();renderInv();mg.setTimer('4:30');

    const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
    const appr=(k,on,dt,sp)=>{S.anim[k]=on?Math.min(1,S.anim[k]+dt*sp):S.anim[k];};
    mg.loop(dt=>{
      T+=dt;
      if(W<2||H<2)layout();
      lx+=(tlx-lx)*Math.min(1,dt*9);ly+=(tly-ly)*Math.min(1,dt*9);
      if(msgT>0){msgT-=dt;if(msgT<=0)msgEl.classList.remove('on');}
      if(ripple){ripple.t+=dt*2.2;if(ripple.t>=1)ripple=null;}
      flash=Math.max(0,flash-dt*3);
      nextBolt-=dt;
      if(nextBolt<=0){flash=1;nextBolt=7+Math.random()*12;flashEl.style.transition='none';flashEl.style.opacity='.18';requestAnimationFrame(()=>{flashEl.style.transition='opacity .6s';flashEl.style.opacity='0';});setTimeout(()=>{if(!mg._ended)AU.se('noise');},300+Math.random()*700);}
      dust.forEach(d=>{d.x=(d.x+d.vx*dt+1)%1;d.y=(d.y+d.vy*dt+1)%1;});
      appr('drawer',S.drawer,dt,3);appr('locker',S.locker,dt,1.6);appr('panel',S.panel,dt,1.8);appr('plcCover',S.plcCover,dt,1.5);
      appr('shutter',S.air,dt,.35);appr('door',S.door,dt,.42);
      if(trans){
        trans.t+=dt/.55;
        if(!trans.sw&&trans.t>=.5){trans.sw=true;S.room=trans.to;updNav();AU.se('btn');}
        if(trans.t>=1)trans=null;
      }
      if(S.started&&!S.door){
        S.left-=dt;
        const s=Math.ceil(Math.max(0,S.left));
        if(s!==lastSec){lastSec=s;mg.setTimer(fmt(S.left));}
        if(S.left<=30&&!warned){warned=true;AU.se('warn');say('……もう空が白んできた。急がないと！');}
        if(S.left<=0){mg.end('timeup');return;}
      }
      if(S.door&&T-S.clearT>3.4){mg.end('clear');return;}
      cx.setTransform(dpr,0,0,dpr,0,0);
      drawScene();
    });

    // テスト用フック（ゲームには影響しない）
    body._esc={P,S,
      hs:(id)=>{const h=HS[S.room].find(q=>q.id===id);const r=cv.getBoundingClientRect();return [r.left+(h.x+h.w/2)*r.width,r.top+(h.y+h.h/2)*r.height];},
      busy:()=>!!trans,zoom:()=>zoomId,setLeft:v=>{S.left=v;}};

    return {result(reason){
      cleanup();
      const left=fmt(S.left);
      if(reason==='clear'){
        const m=Math.max(0,4-S.hints);
        return {
          title:'🔐 脱出成功！',
          summary:`残り時間 <span class="up">${left}</span>　ヒント <span class="${S.hints?'down':'up'}">${S.hints}回</span><br>雨上がりの朝。お隣さんちの玄関で、息子が手を振っていた。`,
          fx:{certKnow:5,jobRep:6,mental:m,fatigue:6},time:60,sp:2,
          log:S.hints?'停電の工場から、設備の知識で脱出した。':'停電の工場から、ヒントなしで脱出した。',
          cutin:['win','……間に合った。迎えに行こう。'],
        };
      }
      if(reason==='timeup'){
        return {
          title:'🔐 夜明けまで閉じ込められた',
          summary:`進捗 ${progress()}/5。朝になって電力が復旧し、ようやく外に出られた。<br>お隣さんに平謝り……。`,
          fx:{mental:-4,fatigue:7},time:60,sp:0,
          log:'停電の工場に朝まで閉じ込められた。',
          cutin:['tired','……ごめんな、遅くなって。'],
        };
      }
      return {
        title:'🔐 脱出をあきらめた',
        summary:'守衛さんに電話して、開けてもらうのを待った。',
        fx:{fatigue:2},time:20,sp:0,log:null,cutin:null,
      };
    }};
  },
});
})();
