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
.esc-logo{position:relative;text-align:center;line-height:1.05;}
.esc-logo .k{display:block;font-family:var(--dot);font-size:.78rem;letter-spacing:.5em;color:var(--tx-d);margin-bottom:8px;}
.esc-logo .t1,.esc-logo .t2{display:block;font-family:var(--dot);font-size:1.75rem;letter-spacing:.08em;color:#e8fff6;text-shadow:0 0 6px var(--cy),0 0 18px var(--cy),0 0 40px rgba(0,232,200,.5);}
.esc-logo .t2{font-size:2.3rem;color:#ffe8f0;text-shadow:0 0 6px var(--rd),0 0 18px var(--rd),0 0 44px rgba(232,48,85,.55);animation:esc-neon 4.2s infinite;}
.esc-logo .t2 em{font-style:normal;animation:esc-neon2 2.7s infinite;}
.esc-logo .en{display:block;font-family:var(--mono);font-size:.62rem;letter-spacing:.42em;color:var(--gd);margin-top:10px;}
.esc-logo:before{content:'';position:absolute;left:50%;top:50%;width:150%;height:140%;transform:translate(-50%,-50%);background:radial-gradient(ellipse,rgba(138,82,212,.28),transparent 65%);z-index:-1;}
@keyframes esc-neon{0%,18%,22%,62%,64%,100%{opacity:1;}20%,63%{opacity:.35;}}
@keyframes esc-neon2{0%,40%,44%,100%{opacity:1;}42%{opacity:.2;}}
.esc-rec{font-family:var(--mono);font-size:.62rem;color:var(--tx-d);letter-spacing:.06em;}
.esc-rec b{color:var(--gd);font-weight:normal;}
.esc-tw{font-family:var(--dot);font-size:.7rem;color:var(--rd);border:1px solid rgba(232,48,85,.5);padding:4px 10px;border-radius:3px;background:rgba(232,48,85,.08);}
.esc-tap{font-family:var(--dot);font-size:.72rem;color:var(--tx);animation:esc-blink 1.4s infinite;}
@keyframes esc-blink{50%{opacity:.25;}}
.esc-dlg{position:absolute;inset:0;z-index:9;display:flex;flex-direction:column;justify-content:flex-end;background:linear-gradient(rgba(3,2,10,.15),rgba(3,2,10,.85) 55%);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .35s;}
.esc-dlg.off{opacity:0;pointer-events:none;}
.esc-dlg.lite{background:linear-gradient(transparent 50%,rgba(3,2,10,.5));}
.esc-dlg .pt{position:relative;align-self:flex-start;margin:0 0 -14px 14px;width:118px;height:118px;border-radius:6px;border:2px solid var(--pu);overflow:hidden;box-shadow:0 0 22px rgba(138,82,212,.5);background:#120c22;z-index:1;transition:filter .3s;}
.esc-dlg .pt img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.8) brightness(.92);}
.esc-dlg .pt:after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 60%,rgba(20,8,40,.55)),repeating-linear-gradient(transparent 0 2px,rgba(0,0,0,.12) 2px 3px);}
.esc-dlg .pt.hide{opacity:0;}
.esc-dlg .bx{margin:0 8px 10px;padding:18px 14px 12px;min-height:118px;background:rgba(8,6,22,.96);border:1px solid var(--pu);border-radius:5px;box-shadow:inset 0 0 20px rgba(138,82,212,.2);}
.esc-dlg .nm{font-family:var(--dot);font-size:.7rem;color:var(--cy);letter-spacing:.1em;margin-bottom:4px;}
.esc-dlg .tx{font-family:var(--serif);font-size:.86rem;line-height:1.85;color:var(--tx-b);min-height:3.4em;}
.esc-dlg .nx{text-align:right;font-family:var(--mono);font-size:.62rem;color:var(--tx-d);animation:esc-blink 1s infinite;}
.esc-grade{display:flex;align-items:center;gap:12px;justify-content:center;margin:6px 0 2px;}
.esc-grade .g{font-family:var(--dot);font-size:3.2rem;line-height:1;width:76px;height:76px;display:flex;align-items:center;justify-content:center;border:3px solid currentColor;border-radius:50%;transform:rotate(-12deg) scale(2.4);opacity:0;animation:esc-stamp .5s .25s cubic-bezier(.2,1.4,.4,1) forwards;}
.esc-grade .i{font-family:var(--mono);font-size:.68rem;line-height:1.8;color:var(--tx);text-align:left;}
@keyframes esc-stamp{to{transform:rotate(-12deg) scale(1);opacity:1;}}
.esc-dlg .btns{display:flex;justify-content:flex-end;margin-top:6px;}
.esc-dlg .btns button{min-width:140px;min-height:46px;}
.esc-slot.tut,.esc-tutp{animation:esc-tut 1.1s infinite;}
@keyframes esc-tut{0%,100%{box-shadow:0 0 0 0 rgba(0,232,200,.8);}70%{box-shadow:0 0 0 9px rgba(0,232,200,0);}}
.esc-wh .dg.roll{animation:esc-roll .16s ease-out;}
@keyframes esc-roll{from{transform:translateY(-10px);opacity:.3;}to{transform:none;opacity:1;}}
.esc-gen{display:flex;flex-direction:column;gap:8px;}
.esc-gb{display:flex;gap:6px;}
.esc-gb button{flex:1;min-height:56px;border:1px solid #6a5a2a;background:linear-gradient(#2a2416,#16120a);color:var(--gd);border-radius:4px;font-family:var(--dot);font-size:.68rem;cursor:pointer;-webkit-tap-highlight-color:transparent;}
.esc-gb button.done{border-color:var(--gn);color:var(--gn);background:#10241a;}
.esc-gb button[disabled]{opacity:.45;cursor:default;}
.esc-fuel{height:14px;border:1px solid #555;border-radius:3px;background:#111;overflow:hidden;}
.esc-fuel i{display:block;height:100%;background:linear-gradient(90deg,#e83055,#e8b830);transition:width 1.2s;}
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
  fuel:{name:'軽油の携行缶',desc:'発電機用の軽油。ずしりと重い。'},
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
  if(id==='fuel'){
    return v+`<path d="M12 14 L30 14 L38 22 L38 42 L12 42Z" fill="#c02838" stroke="#4a0a14" stroke-width="1"/><path d="M14 16 L29 16 L36 23 L36 40 L14 40Z" fill="#e03848"/>
      <rect x="15" y="8" width="12" height="7" rx="2" fill="none" stroke="#c02838" stroke-width="3"/><rect x="31" y="9" width="5" height="9" rx="1" fill="#e8b830" transform="rotate(35 33 13)"/>
      <rect x="17" y="24" width="15" height="10" fill="#e8b830"/><text x="24.5" y="31.5" font-size="6" text-anchor="middle" fill="#222" font-family="monospace">軽油</text><rect x="15" y="17" width="2" height="22" fill="#fff" opacity=".25"/></svg>`;
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
  // 2夜目以降：発電機の始動手順（銘板の順に。最後はセル）
  const genSteps=shuf(['燃料コック','非常停止解除','グロー予熱']).concat(['セル始動']);
  const genBtns=shuf([0,1,2,3]);           // ボタンの並び（表示順）
  return {roster,nights,tank,code,brk,order,rungs,target,secret,valves,vOk,ev,genSteps,genBtns};
}

registerMinigame({
  id:'escape', icon:'🔐', name:'閉じ込められた夜勤明け', genre:'脱出・謎解き', bgm:'kaidan',
  desc:'夜勤明け、落雷の停電で工場に閉じ込められた。朝までに息子を迎えに行かないと。設備保全の知識で4つの部屋の仕掛けを解き、非常口から脱出しよう。',
  effect:'資格知識+5 仕事評価+6 精神力+4（ヒント1回ごと−1）／ 疲労+6 約60分',
  help:'タップで調べる・持ち物を選んで使う',
  start(body,mg){
    const P=makePuzzle();
    const REC=(gs.escapeData=Object.assign({plays:0,clears:0,bestLeft:0,bestGrade:'',grades:{}},gs.escapeData||{}));
    const TWIST=REC.clears>0;                        // 一度クリアすると「二夜目」：発電機の始動が加わる
    const S={
      room:'ctrl',inv:[],sel:null,left:TIME+(TWIST?30:0),started:false,hints:0,
      drawer:false,gotBatt:false,torch:false,gotDriver:false,locker:false,gotKey:false,
      panel:false,bOn:[],power:false,plcCover:false,x:[false,false,false,false],plcOk:false,
      valve:-1,air:false,door:false,seen:{},
      gotFuel:false,fueled:false,gen:!TWIST,genStep:0,
      anim:{drawer:0,locker:0,panel:0,plcCover:0,shutter:0,door:0,lights:0,gen:0},
      powerT:-1,clearT:-1,over:null,tut:0,recorded:false,
    };
    let W=0,H=0,dpr=1,T=0,lastSec=-1,warned=false;
    let lx=.5,ly=.45,tlx=.5,tly=.45;             // 光の位置（正規化）
    let flash=0,nextBolt=4+Math.random()*6,trans=null,ripple=null,zoomId=null,msgT=0;
    const fmt=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
    const GRADE_COL={S:'#e8b830',A:'#00e8c8',B:'#8a52d4',C:'#bbaedd'};
    const recLine=REC.plays?`挑戦 <b>${REC.plays}</b>　脱出 <b>${REC.clears}</b>`+(REC.bestGrade?`　最高評価 <b>${REC.bestGrade}</b>　最速 残り<b>${fmt(REC.bestLeft)}</b>`:''):'はじめての挑戦';

    body.innerHTML=`<div class="esc-root">
      <div class="esc-nav"><button class="esc-nb l" data-nav="-1"></button><div class="esc-cur"><span class="esc-rn"></span><small class="esc-rs"></small><div class="esc-map">${ROOMS.map(()=>'<i></i>').join('')}</div></div><button class="esc-nb r" data-nav="1"></button></div>
      <div class="esc-stage"><canvas class="esc-cv"></canvas><div class="esc-flash"></div><div class="esc-msg"></div>
        <div class="esc-zoom"><div class="esc-zbox"><div class="esc-zh"><span class="esc-zt"></span><button class="esc-x" aria-label="閉じる">✕</button></div><div class="esc-zc"></div></div></div>
        <div class="esc-dlg off"><div class="pt"><img alt=""></div><div class="bx"><div class="nm"></div><div class="tx"></div><div class="nx">▼ タップ</div></div></div>
        <div class="esc-intro">
          <div class="esc-logo"><span class="k">夜 勤 脱 出</span><span class="t1">閉じ込められた</span><span class="t2">夜<em>勤</em>明け</span><span class="en">LOCKED IN AFTER THE NIGHT SHIFT</span></div>
          ${TWIST?'<div class="esc-tw">二夜目 ― 非常用発電機が止まっている</div>':''}
          <div class="esc-rec">${recLine}</div>
          <button class="ev-btn esc-start">はじめる</button>
          <div class="esc-rec">制限時間 ${TWIST?"5:00":"4:30"} ／ ヒント3回まで</div>
        </div>
      </div>
      <div class="esc-inv">${[0,1,2,3,4].map(i=>`<button class="esc-slot" data-slot="${i}"></button>`).join('')}<button class="esc-hint">ヒント<br>残3</button></div>
    </div>`;
    const $=s=>body.querySelector(s);
    const stage=$('.esc-stage'),cv=$('.esc-cv'),mainCx=cv.getContext('2d');
    let cx=mainCx;
    const bgCache={};
    const msgEl=$('.esc-msg'),zoomEl=$('.esc-zoom'),zt=$('.esc-zt'),zc=$('.esc-zc'),flashEl=$('.esc-flash');
    const dark=document.createElement('canvas'),dx=dark.getContext('2d');
    const dlgEl=$('.esc-dlg');

    // ── 効果音（Web Audioで合成。AU.ctxがあり、SE音量>0のときだけ） ──
    let _nb=null,rainSrc=null;
    const seVol=()=>typeof AUDIO_SET!=='undefined'?+AUDIO_SET.se||0:1;
    function actx(){try{if(seVol()<=0)return null;if(!AU.ctx&&AU.init)AU.init();const c=AU.ctx;if(!c)return null;if(c.state==='suspended')c.resume().catch(()=>{});return c;}catch(e){return null;}}
    function noiseBuf(c){if(_nb&&_nb.sampleRate===c.sampleRate)return _nb;const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return _nb=b;}
    function sfx(kind){
      if(mg._ended)return;
      const c=actx();if(!c)return;
      try{
        const t0=c.currentTime,out=c.createGain();out.gain.value=seVol();out.connect(c.destination);
        const noise=(dur,type,f,q,g,att,dl)=>{const t=t0+(dl||0),s=c.createBufferSource();s.buffer=noiseBuf(c);s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||1;const gg=c.createGain();gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(g,t+(att||.005));gg.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(fl);fl.connect(gg);gg.connect(out);s.start(t);s.stop(t+dur+.05);return fl;};
        const tone=(f,type,g,dur,dl,f2)=>{const t=t0+(dl||0),o=c.createOscillator(),gg=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);gg.gain.setValueAtTime(0,t);gg.gain.linearRampToValueAtTime(g,t+.006);gg.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(gg);gg.connect(out);o.start(t);o.stop(t+dur+.05);};
        switch(kind){
          case 'thunder':{const f=noise(2.6,'lowpass',500,.7,.55,.02);f.frequency.exponentialRampToValueAtTime(70,t0+2.3);noise(.3,'highpass',1800,.5,.12);break;}
          case 'clunk':tone(110,'square',.1,.12,0,45);noise(.07,'bandpass',2400,3,.25);break;
          case 'trip':noise(.35,'highpass',3000,.5,.32);tone(70,'sawtooth',.16,.35,0,30);noise(.08,'bandpass',1500,2,.3,.005,.05);break;
          case 'click':noise(.03,'bandpass',3600,4,.3);break;
          case 'unlock':noise(.05,'bandpass',2600,3,.35);noise(.06,'bandpass',1500,3,.35,.005,.09);tone(880,'triangle',.07,.3,.16);tone(1320,'triangle',.06,.5,.27);break;
          case 'creak':tone(150,'sawtooth',.045,.8,0,90);noise(.7,'bandpass',800,7,.06,.1);break;
          case 'hiss':noise(1.1,'highpass',2600,.6,.2,.02);break;
          case 'rumble':noise(2.8,'lowpass',260,.8,.32,.3);tone(46,'sawtooth',.05,2.8,0,38);noise(.08,'bandpass',900,2,.25,.005,2.7);break;
          case 'power':tone(50,'sawtooth',.09,2,0,120);tone(100,'sine',.08,2,0,240);noise(.5,'bandpass',4200,9,.07,.01,.3);break;
          case 'pick':tone(660,'triangle',.07,.12);tone(990,'triangle',.07,.2,.08);break;
          case 'engine':tone(28,'sawtooth',.2,2.6,0,52);noise(2.6,'lowpass',180,1,.28,.5);noise(.4,'bandpass',600,2,.2);break;
          case 'door':tone(70,'sawtooth',.07,1.4,0,50);noise(1.5,'lowpass',600,.5,.14,.3);tone(523,'sine',.05,1.8,.9);tone(659,'sine',.05,1.8,1.1);tone(784,'sine',.05,2.2,1.3);break;
          case 'drip':tone(1400,'sine',.03,.09,0,500);break;
          case 'type':noise(.015,'bandpass',2800,3,.05);break;
        }
      }catch(e){}
    }
    function rainStart(){
      const c=actx();if(!c||rainSrc)return;
      try{const s=c.createBufferSource();s.buffer=noiseBuf(c);s.loop=true;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=1100;f.Q.value=.4;const g=c.createGain();g.gain.value=0;g.gain.linearRampToValueAtTime(.035*seVol(),c.currentTime+2);s.connect(f);f.connect(g);g.connect(c.destination);s.start();rainSrc={s,g};}catch(e){}
    }
    function rainStop(){if(!rainSrc)return;try{const c=AU.ctx;rainSrc.g.gain.linearRampToValueAtTime(0,c.currentTime+.6);const s=rainSrc.s;setTimeout(()=>{try{s.stop();}catch(e){}},700);}catch(e){}rainSrc=null;}

    // ── 会話シーン（顔グラ＋1文字ずつ） ──
    let dlgQ=null,dlgDone=null,typing=null,curLine=null;
    function dialog(lines,done){dlgQ=lines.slice();dlgDone=done;dlgEl.classList.remove('off');nextLine();}
    function nextLine(){
      if(!dlgQ)return;
      if(typing){typing.finish();return;}
      const l=dlgQ.shift();curLine=l;
      if(!l){dlgEl.classList.add('off');const d=dlgDone;dlgQ=null;dlgDone=null;if(d)d();return;}
      const pt=dlgEl.querySelector('.pt');
      if(l.img){pt.classList.remove('hide');pt.querySelector('img').src='assets/img/'+l.img+'.webp';}else pt.classList.add('hide');
      dlgEl.querySelector('.nm').textContent=l.who||'';
      const tx=dlgEl.querySelector('.tx');
      dlgEl.querySelector('.nx').style.display=l.btn?'none':'';
      if(l.fx)l.fx();else AU.se('btn');
      const fin=()=>{tx.innerHTML=l.text+(l.btn?`<div class="btns"><button class="ev-btn esc-res">${l.btn}</button></div>`:'');typing=null;
        if(l.btn)tx.querySelector('.esc-res').addEventListener('click',ev=>{ev.stopPropagation();AU.se('decide');l.onBtn();});};
      if(/</.test(l.text)){fin();return;}
      let i=0;tx.textContent='';
      const iv=setInterval(()=>{if(mg._ended){clearInterval(iv);return;}i++;tx.textContent=l.text.slice(0,i);if(i%3===0)sfx('type');if(i>=l.text.length){clearInterval(iv);fin();}},34);
      typing={finish(){clearInterval(iv);fin();}};
    }
    dlgEl.addEventListener('click',e=>{if(e.target.closest('button'))return;if(dlgQ){if(curLine&&curLine.btn&&!typing)return;nextLine();}});

    // ── 背景の固定ランダム（雨・街明かり・埃・汚れ） ──
    const R0=(()=>{let s=12345;return ()=>((s=(s*16807)%2147483647)/2147483647);})();
    const rain=Array.from({length:70},()=>({x:R0(),y:R0(),l:.04+R0()*.08,v:.9+R0()*.9}));
    const drips=Array.from({length:14},()=>({x:R0(),y:R0(),v:.02+R0()*.05,r:.6+R0()*1.2}));
    const city=Array.from({length:26},()=>({x:R0(),y:.55+R0()*.45,c:['#e83055','#00e8c8','#e8b830','#8a52d4','#8af'][Math.floor(R0()*5)],b:R0()}));
    const dust=Array.from({length:60},()=>({x:R0(),y:R0(),vx:(R0()-.5)*.012,vy:(R0()-.3)*.01,s:.5+R0()*1.6,p:R0()*6}));
    const stains=Array.from({length:8},()=>({x:R0(),y:R0()*.6,r:.05+R0()*.12}));
    const rusts=Array.from({length:7},()=>({x:R0(),y:.05+R0()*.3,l:.08+R0()*.25,w:.006+R0()*.014}));
    // 壁と床のざらつき（ノイズのパターン）
    const grain=document.createElement('canvas');grain.width=grain.height=96;
    {const g=grain.getContext('2d'),id=g.createImageData(96,96);for(let i=0;i<id.data.length;i+=4){const v=R0()*255;id.data[i]=id.data[i+1]=id.data[i+2]=v;id.data[i+3]=16;}g.putImageData(id,0,0);
     g.fillStyle='rgba(0,0,0,.25)';for(let k=0;k<40;k++)g.fillRect(R0()*96,R0()*96,1+R0()*3,1);}
    let grainPat=null;
    // 粒子（入手・解錠の演出）と天井からの雫
    const parts=[];
    function burstAt(room,id,rgb,n){
      let x=lx,y=ly;
      if(id){const h=hsById(room,id);if(h){x=h.x+h.w/2;y=h.y+h.h/2;}}
      for(let i=0;i<n;i++){const a=Math.random()*6.28,v=.08+Math.random()*.3;parts.push({room,x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-.1,l:.6+Math.random()*.7,rgb,s:1+Math.random()*2.2});}
    }
    const DRIP={ctrl:.66,store:.45,locker:.69,exit:.6};
    let drip={y:-1,t:1.5,sp:0},splash=null;

    // ── 当たり判定（正規化座標） ──
    const HS={
      ctrl:[
        {id:'window',x:.05,y:.07,w:.38,h:.21,nm:'窓'},
        {id:'diagram',x:.48,y:.07,w:.25,h:.19,nm:'単線結線図'},
        {id:'panel',x:.76,y:.07,w:.21,h:.56,nm:'分電盤'},
        {id:'roster',x:.05,y:.33,w:.38,h:.19,nm:'勤務表'},
        {id:'plc',x:.48,y:.32,w:.24,h:.22,nm:'PLC盤'},
        {id:'desk',x:.04,y:.60,w:.50,h:.25,nm:'机'},
        {id:'memo',x:.57,y:.57,w:.16,h:.13,nm:'申し送り'},
      ],
      store:[
        {id:'shelf',x:.04,y:.08,w:.38,h:.62,nm:'部品棚'},
        {id:'board',x:.48,y:.07,w:.48,h:.20,nm:'工具板'},
        {id:'tank',x:.49,y:.31,w:.21,h:.46,nm:'エアタンク'},
        {id:'valves',x:.73,y:.31,w:.24,h:.40,nm:'バルブ'},
        {id:'pallet',x:.06,y:.76,w:.36,h:.14,nm:'パレット'},
        {id:'oldmemo',x:.46,y:.80,w:.22,h:.10,nm:'古い手帳'},
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
        {id:'gen',x:.77,y:.57,w:.21,h:.27,nm:'発電機'},
      ],
    };
    if(!TWIST)HS.exit=HS.exit.filter(h=>h.id!=='gen');
    const hsById=(room,id)=>HS[room].find(h=>h.id===id);

    // ── レイアウト ──
    function layout(){
      const r=stage.getBoundingClientRect();
      dpr=Math.min(2.5,window.devicePixelRatio||1);
      W=Math.max(1,Math.round(r.width));H=Math.max(1,Math.round(r.height));
      cv.width=W*dpr;cv.height=H*dpr;dark.width=W*dpr;dark.height=H*dpr;
      for(const k in bgCache)delete bgCache[k];
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
    const PMAX=TWIST?6:5;
    function progress(){return [S.torch,S.locker,S.power,S.plcOk,S.air].filter(Boolean).length+(TWIST&&S.gen?1:0);}
    function updScore(){mg.setScore(`進捗 <span style="color:var(--cy)">${progress()}/${PMAX}</span>　ヒント ${S.hints}/3`);}
    function renderInv(newId){
      body.querySelectorAll('.esc-slot').forEach((b,i)=>{
        const id=S.inv[i];
        b.innerHTML=id?iconSVG(id):'';
        b.dataset.item=id||'';
        b.title=id?ITEMS[id].name:'';
        b.classList.toggle('sel',!!id&&S.sel===id);
        b.classList.remove('new');b.classList.toggle('tut',S.tut===2&&i===0&&!!id);
        if(id&&id===newId){void b.offsetWidth;b.classList.add('new');}
      });
      const h=$('.esc-hint');h.innerHTML=`ヒント<br>残${3-S.hints}`;h.disabled=S.hints>=3||!S.started||S.door;
      updScore();
    }
    function addItem(id,text,h){
      const tut=S.tut===1&&id==='torch0';if(tut){S.tut=2;S.tutT=9;}
      S.inv.push(id);S.sel=null;AU.se('tool');sfx('pick');renderInv(id);if(text)say(text);if(h)burstAt(S.room,h.id,'0,232,200',16);
      if(tut)setTimeout(()=>{if(!mg._ended&&S.tut===2)say('拾った物は下の<b>持ち物</b>に入る。<b>タップで選んで</b>→場所をタップで使う。持ち物どうしは<b>組み合わせ</b>られる。',6);},3200);
    }
    function removeItem(id){S.inv=S.inv.filter(x=>x!==id);if(S.sel===id)S.sel=null;renderInv();}
    function tapItem(id){
      if(!id||!S.started||S.door||S.over)return;
      if(S.sel&&S.sel!==id){
        const pair=[S.sel,id].sort().join('+');
        if(pair==='batt+torch0'){
          S.inv=S.inv.filter(x=>x!=='batt'&&x!=='torch0');S.inv.push('torch');S.sel=null;S.torch=true;
          AU.se('repair');sfx('click');renderInv('torch');burstAt(S.room,null,'255,214,150',18);
          say('電池を入れて……カチッ。<b>懐中電灯</b>が点いた！ 光の輪が大きくなった。');
          return;
        }
        AU.se('back');say(`${ITEMS[S.sel].name}と${ITEMS[id].name}は組み合わせられない。`);S.sel=null;renderInv();return;
      }
      if(S.tut===2)S.tut=0;
      if(S.sel===id){S.sel=null;AU.se('back');renderInv();return;}
      S.sel=id;AU.se('btn');renderInv();
      say(`<b>${ITEMS[id].name}</b>：${ITEMS[id].desc}<br><span style="color:var(--tx-d);font-size:.66rem">場所をタップで使う／持ち物をタップで組み合わせ</span>`,3.5);
    }
    function goRoom(d){
      if(trans||!S.started||S.door||S.over)return;
      const i=ROOMS.indexOf(S.room)+d;
      if(i<0||i>=ROOMS.length)return;
      closeZoom(true);
      trans={to:ROOMS[i],d,t:0,sw:false,t0:performance.now()};AU.se('btn');
    }

    // ── ヒント ──
    function hintText(){
      if(!S.drawer)return '制御室の<b>机の引き出し</b>を調べてみよう。';
      if(!S.gotBatt&&!S.torch)return '<b>部品倉庫の棚</b>に電池の箱がありそうだ。';
      if(!S.torch)return '持ち物の<b>懐中電灯を選んでから電池をタップ</b>すると組み合わせられる。';
      if(!S.locker)return `更衣室の<b>鏡のメモ</b>が暗証のヒント。①② 勤務表の「だんのうら」の<b>夜</b>を第1週・第2週で数える。③④ 部品倉庫の<b>エアタンクの残圧</b>（0.${'xx'}MPaの xx）。`;
      if(!S.panel)return '<b>盤キーを選んで</b>、制御室の<b>分電盤</b>をタップ。';
      if(!S.gen){
        if(!S.fueled)return S.gotFuel?'<b>携行缶を選んで</b>、非常口の<b>発電機</b>をタップして給油。':'発電機は燃料切れ。<b>部品倉庫のパレット</b>に軽油の携行缶がある。';
        return '非常口の<b>発電機の銘板</b>に始動手順が書いてある。その順にボタンを押す。';
      }
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
      const RH=50,w=300,h=26+RH*4;
      const on=P.rungs.map(r=>!!P.ev(r,S.x));
      const pw=S.power;
      const col=(c)=>pw&&c?'#44ee88':'#4a6a62';
      let s=`<svg class="esc-ladder" viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="monospace">`;
      s+=`<line x1="10" y1="4" x2="10" y2="${h-4}" stroke="${pw?'#44ee88':'#4a6a62'}" stroke-width="2.5"/><line x1="${w-10}" y1="4" x2="${w-10}" y2="${h-4}" stroke="#4a6a62" stroke-width="2.5"/>`;
      const contact=(x,y,a,nc,below)=>{
        const cond=nc?!S.x[a]:S.x[a];const c=col(cond);
        return `<line x1="${x-7}" y1="${y-9}" x2="${x-7}" y2="${y+9}" stroke="${c}" stroke-width="2.4"/><line x1="${x+7}" y1="${y-9}" x2="${x+7}" y2="${y+9}" stroke="${c}" stroke-width="2.4"/>`+
          (nc?`<line x1="${x-8}" y1="${y+9}" x2="${x+8}" y2="${y-9}" stroke="${c}" stroke-width="1.8"/>`:'')+
          `<text x="${x}" y="${below?y+21:y-12}" font-size="10" text-anchor="middle" fill="#9ce">X${a}</text>`;
      };
      P.rungs.forEach((r,i)=>{
        const y=24+i*RH,wc='#4a6a62';
        s+=`<text x="16" y="${y-11}" font-size="8" fill="#3c5c54">${i}</text>`;
        if(r.t==='A'||r.t==='N'){
          s+=`<line x1="10" y1="${y}" x2="113" y2="${y}" stroke="${wc}" stroke-width="1.6"/><line x1="127" y1="${y}" x2="232" y2="${y}" stroke="${wc}" stroke-width="1.6"/>`+contact(120,y,r.a,r.t==='N');
        }else if(r.t==='AND'){
          s+=`<line x1="10" y1="${y}" x2="73" y2="${y}" stroke="${wc}" stroke-width="1.6"/><line x1="87" y1="${y}" x2="153" y2="${y}" stroke="${wc}" stroke-width="1.6"/><line x1="167" y1="${y}" x2="232" y2="${y}" stroke="${wc}" stroke-width="1.6"/>`+contact(80,y,r.a,false)+contact(160,y,r.b,r.nb);
        }else{
          const y2=y+19;
          s+=`<line x1="10" y1="${y}" x2="93" y2="${y}" stroke="${wc}" stroke-width="1.6"/><line x1="107" y1="${y}" x2="232" y2="${y}" stroke="${wc}" stroke-width="1.6"/>`+
            `<polyline points="50,${y} 50,${y2} 93,${y2}" fill="none" stroke="${wc}" stroke-width="1.6"/><polyline points="107,${y2} 150,${y2} 150,${y}" fill="none" stroke="${wc}" stroke-width="1.6"/>`+
            contact(100,y,r.a,false)+contact(100,y2,r.b,false,true);
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
      }else if(id==='memo'){
        t='申し送りノート';
        h=`<div class="esc-paper" style="line-height:1.9;font-size:.74rem">申し送り（夜勤 → 日勤）<br>・3号ライン コンプレッサー異音。要点検。<br>・非常口シャッターはエア駆動に改造済。<br>　<u>供給圧は現場の札を見ること</u>。<br>・電気錠はPLCのテストSWで動作確認可。<br>　カバーはネジ止め（ドライバー要）。<br>・落雷注意報。……だんのうらさん、お子さんの熱は下がりました？　<span style="color:#a0203c">宮下</span></div>`;
      }else if(id==='oldmemo'){
        t='古い手帳';
        h=`<div class="esc-paper" style="line-height:2;font-size:.76rem;background:linear-gradient(#d8ccaa,#c2b48c)">設備保全 心得　<span style="font-size:.62rem">― 岩城</span><br>一、ブレーカーは上から入れろ。<br>　　同じ段なら<u>軽い負荷から</u>だ。<br>一、圧は嘘をつかん。針を読め。<br>一、子どもの運動会は休め。<br>　　仕事は誰かが代われる。親は代われん。</div><div class="esc-sub" style="margin-top:6px">三年前に定年した岩城さんの手帳だ。……まだこんな所に。</div>`;
      }else if(id==='gen'){
        t='非常用発電機 EG-1';
        const pos=S.fueled?(S.gen?100:72):4;
        h=`<div class="esc-gen"><div class="esc-paper" style="font-size:.72rem;line-height:1.9">銘板：始動手順<br>${P.genSteps.map((x,i)=>`${'①②③④'[i]} ${x}`).join('　')}</div>
          <div class="esc-sub">燃料 ${S.fueled?'<span style="color:var(--gn)">軽油</span>':'<span style="color:var(--rd)">EMPTY</span>'}</div><div class="esc-fuel"><i style="width:${pos}%"></i></div>
          <div class="esc-gb">${P.genBtns.map(k=>{const nm=P.genSteps[k];const done=S.gen||P.genSteps.indexOf(nm)<S.genStep;return `<button data-gen="${k}" class="${done?'done':''}" ${S.gen?'disabled':''}>${nm}</button>`;}).join('')}</div>
          <div class="esc-sub">${S.gen?'<span style="color:var(--gn)">運転中　出力 400V 正常</span>':S.fueled?'銘板の順にボタンを押す。':'燃料が空。軽油を入れないと回らない。'}</div></div>`;
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
      const gb=e.target.closest('[data-gen]');if(gb&&!gb.disabled){tapGen(+gb.dataset.gen);return;}
      const vl=e.target.closest('[data-valve]');if(vl&&!vl.disabled){tapValve(+vl.dataset.valve);return;}
      const dl=e.target.closest('[data-dial]');if(dl){const i=+dl.dataset.dial;S.dial[i]=(S.dial[i]+(+dl.dataset.d)+10)%10;AU.se('btn');sfx('click');const dg=dl.parentNode.querySelector('.dg');dg.textContent=S.dial[i];dg.classList.remove('roll');void dg.offsetWidth;dg.classList.add('roll');return;}
      if(e.target.closest('[data-open]'))tryDial();
    });

    // ── 仕掛け ──
    function tryDial(){
      const box=zc.querySelector('.esc-dial');
      if(S.dial.join('')===P.code){
        box.classList.add('ok');AU.se('decide');sfx('unlock');
        setTimeout(()=>{if(mg._ended)return;closeZoom(true);S.locker=true;sfx('creak');
          addItem('key','ガチャッ。ロッカーが開いた。<b>盤キー</b>を手に入れた。……扉の裏に、息子と撮った写真。',hsById('locker','own'));S.gotKey=true;updScore();},700);
      }else{
        box.classList.remove('ng');void box.offsetWidth;box.classList.add('ng');AU.se('warn');sfx('clunk');
        say('……開かない。番号が違う。');
      }
    }
    function tapGen(k){
      if(S.gen)return;
      if(!S.fueled){AU.se('back');sfx('click');say('燃料計はEMPTY。先に<b>軽油</b>を入れないと。');return;}
      const nm=P.genSteps[k];
      if(nm===P.genSteps[S.genStep]){
        S.genStep++;AU.se('tool');sfx('clunk');
        if(S.genStep>=P.genSteps.length){
          S.gen=true;AU.se('machine');sfx('engine');burstAt('exit','gen','255,200,120',26);
          say('キュルル……ドドドド！ <b>発電機が始動</b>した。これで分電盤に電圧が来る。',5);updScore();
        }
      }else{
        S.genStep=0;AU.se('warn');sfx('trip');
        say('プスン……止まった。<b>手順が違う</b>。銘板を見て最初から。');
      }
      renderZoom();
    }
    function tapBreaker(code){
      if(S.power||S.bOn.includes(code))return;
      if(!S.gen){AU.se('back');sfx('clunk');say('レバーは入るが……電圧計がゼロ。<b>発電機が止まっている</b>。');return;}
      const need=P.order[S.bOn.length];
      if(code===need){
        S.bOn.push(code);AU.se('tool');sfx('clunk');renderZoom();
        if(S.bOn.length===P.order.length){
          S.power=true;S.powerT=T;AU.se('machine');sfx('power');burstAt('ctrl','panel','255,230,150',30);updScore();
          say('ウゥゥン……非常用発電機から給電。<b>照明が点いた！</b> コンプレッサーも回りだした。',5);
          setTimeout(()=>{if(!mg._ended&&zoomId==='breakers')closeZoom(true);},1100);
        }
      }else{
        const box=zc.querySelector('.esc-brk');
        S.bOn.push(code);renderZoom();
        AU.se('warn');flash=.6;
        setTimeout(()=>{if(mg._ended)return;S.bOn=[];renderZoom();const bx=zc.querySelector('.esc-brk');if(bx){bx.classList.add('trip');}AU.se('noise');sfx('trip');
          say('<b>バチン！</b> トリップして全部落ちた。投入順が違う……結線図を見直そう。');},180);
      }
    }
    function tapSwitch(i){
      if(!S.power){AU.se('back');say('PLCに電源が来ていない。先に分電盤だ。');return;}
      if(S.plcOk)return;
      S.x[i]=!S.x[i];AU.se('btn');sfx('click');
      const outs=P.rungs.map(r=>!!P.ev(r,S.x));
      if(outs.join()===P.target.map(Boolean).join()){
        S.plcOk=true;AU.se('decide');sfx('unlock');updScore();
        say('出力パターン一致。……遠くで<b>ガチャン</b>。非常口の電気錠が外れた音だ。',5);
      }
      renderZoom();
    }
    function tapValve(i){
      if(!S.power||S.air)return;
      if(i===P.vOk){
        S.valve=i;S.air=true;AU.se('repair');sfx('hiss');setTimeout(()=>sfx('rumble'),500);renderZoom();updScore();
        say('シューッ……系統'+'ABC'[i]+'を開いた。非常口のほうで<b>シャッターが上がる音</b>がする。',5);
      }else{
        S.valve=i;renderZoom();AU.se('noise');sfx('hiss');S.left=Math.max(1,S.left-10);
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
          if(it==='key'){removeItem('key');S.panel=true;AU.se('decide');sfx('unlock');setTimeout(()=>sfx('creak'),250);say('盤キーで分電盤の扉を開けた。');setTimeout(()=>{if(!mg._ended&&S.room==='ctrl')openZoom('breakers');},600);return;}
          if(it)return no();
          return say('分電盤 LP-1。扉は<b>施錠</b>されている。三角の<b>盤キー</b>が要る。……鍵はたしか自分のロッカーに。');
        case 'ctrl/plc':
          if(S.plcCover)return openZoom('plc');
          if(it==='driver'){removeItem('driver');S.plcCover=true;AU.se('repair');sfx('click');setTimeout(()=>sfx('clunk'),400);say('ネジを4本外して、PLC盤のカバーを開けた。');setTimeout(()=>{if(!mg._ended&&S.room==='ctrl')openZoom('plc');},600);return;}
          if(it)return no();
          return say('PLC盤。電気錠の制御はここだ。カバーが<b>ネジ止め</b>されている。');
        case 'ctrl/desk':
          if(it)return no();
          if(!S.drawer){S.drawer=true;sfx('creak');addItem('torch0','引き出しに<b>懐中電灯</b>。……スイッチを入れても点かない。電池が空だ。',h);return;}
          return say('机には息子が描いた「パパのこうじょう」の絵が貼ってある。煙突から虹が出ている。');
        case 'store/shelf':
          if(it)return no();
          if(!S.gotBatt){S.gotBatt=true;addItem('batt','部品箱に新品の<b>単三電池</b>があった。',h);return;}
          return say('ベアリング、Vベルト、近接センサの予備……在庫表と数が合わないのはいつものことだ。');
        case 'store/board':
          if(it)return no();
          if(!S.torch)return say('工具板だ。でも暗くてどれが何だか……<b>スマホの明かりじゃ心もとない</b>。');
          if(!S.gotDriver){S.gotDriver=true;addItem('driver','<b>プラスドライバー</b>を手に入れた。',h);return;}
          return say('スパナ、モンキー、ウォーターポンププライヤー。定位置管理は大事。');
        case 'store/tank':
          if(it)return no();
          if(!S.torch)return say('エアタンクの圧力計……<b>スマホの光じゃ針が読めない</b>。');
          return openZoom('tank');
        case 'store/valves':if(it)return no();return openZoom('valves');
        case 'store/pallet':
          if(it)return no();
          if(TWIST&&!S.gotFuel){S.gotFuel=true;addItem('fuel','パレットの陰に<b>軽油の携行缶</b>。発電機に使える。',h);return;}
          return say('出荷待ちのパレット。フォークリフトのキーは……事務所の金庫だ。');
        case 'store/oldmemo':if(it)return no();return openZoom('oldmemo');
        case 'ctrl/memo':if(it)return no();return openZoom('memo');
        case 'exit/gen':
          if(!S.fueled){
            if(it==='fuel'){removeItem('fuel');S.fueled=true;AU.se('repair');sfx('hiss');say('トクトクトク……<b>軽油を給油</b>した。');setTimeout(()=>{if(!mg._ended&&S.room==='exit')openZoom('gen');},700);return;}
            if(it)return no();
          }else if(it)return no();
          return openZoom('gen');
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
      S.door=true;S.clearT=T;AU.se('ach');sfx('door');renderInv();updScore();closeZoom(true);
      say('扉を押し開ける。冷たい朝の空気。雨はもう上がりかけている。',4);
    }
    // ゲーム内の時刻（4:30開始→制限時間いっぱいで7:00）
    function clock(){const tot=TIME+(TWIST?30:0),m=270+Math.floor((tot-Math.max(0,S.left))/tot*150);return `午前${Math.floor(m/60)}時${String(m%60).padStart(2,'0')}分`;}
    // ── 評価と記録 ──
    function grade(){const l=S.left,h=S.hints;if(h===0&&l>=100)return 'S';if(h<=1&&l>=60)return 'A';if(h<=2&&l>=20)return 'B';return 'C';}
    let prevBest=REC.bestLeft,prevGrade=REC.bestGrade;
    function record(outcome){
      if(S.recorded)return;S.recorded=true;
      REC.plays++;
      if(outcome==='clear'){
        const g=grade();REC.clears++;REC.grades[g]=(REC.grades[g]||0)+1;REC.last=g;
        if(S.left>REC.bestLeft)REC.bestLeft=Math.ceil(S.left);
        if(!REC.bestGrade||'SABC'.indexOf(g)<'SABC'.indexOf(REC.bestGrade))REC.bestGrade=g;
      }else REC.last=outcome;
      gs.escapeData=REC;
    }
    function endingClear(){
      if(S.over)return;S.over='clear';closeZoom(true);rainStop();
      const g=grade(),nb=Math.ceil(S.left)>prevBest;
      const cm={S:'完璧な段取り。ベテランの仕事だ。',A:'手際よし。設備屋の面目躍如。',B:'無事に脱出。次はもっと速く。',C:'ぎりぎり間に合った……。'}[g];
      record('clear');dlgEl.classList.add('lite');
      dialog([
        {text:'雨上がりの朝。駐車場の水たまりに、うすい青空が映っている。'},
        {who:'だんのうら',img:S.hints?'char_happy':'char_win',text:S.hints?'……間に合った。さあ、迎えに行こう。':'……ヒントなしで抜けた。岩城さん、見てたかな。'},
        {who:'',text:'お隣さんの玄関で、息子が眠そうに手を振っていた。「パパ、おかえり」'},
        {who:'RESULT',text:`<div class="esc-grade"><div class="g" style="color:${GRADE_COL[g]}">${g}</div><div class="i">残り時間 ${fmt(S.left)}<br>ヒント ${S.hints}回${TWIST?'<br>二夜目（発電機）':''}<br>${nb?'<span style="color:var(--gd)">★ 自己ベスト更新</span>':'自己ベスト 残り'+fmt(prevBest)}</div></div><div style="text-align:center;font-family:var(--dot);font-size:.74rem;color:var(--tx-b)">${cm}</div>`,
          fx:()=>{AU.se('rank');setTimeout(()=>sfx('clunk'),420);},btn:'リザルトへ',onBtn:()=>mg.end('clear')},
      ]);
    }
    function endingTimeup(){
      if(S.over)return;S.over='timeup';closeZoom(true);rainStop();record('timeup');
      dialog([
        {text:'窓の外が白み……やがて、照明が一斉に戻った。',fx:()=>{flash=1;AU.se('machine');sfx('power');}},
        {who:'だんのうら',img:'char_tired',text:'……結局、朝まで出られなかったか。'},
        {who:'だんのうら',img:'char_tired',text:'お隣さんに電話しないと。……ごめんな、パパ遅くなる。'},
        {who:'RESULT',text:`<div class="esc-grade"><div class="g" style="color:var(--rd);font-size:1.6rem">失敗</div><div class="i">進捗 ${progress()}/${PMAX}<br>ヒント ${S.hints}回</div></div><div style="text-align:center;font-family:var(--dot);font-size:.72rem;color:var(--tx)">配置は毎回変わる。次の夜にまた挑もう。</div>`,
          fx:()=>AU.se('warn'),btn:'リザルトへ',onBtn:()=>mg.end('timeup')},
      ]);
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
      if(!S.started||(trans&&!trans.sw)||S.door||S.over)return;
      ripple={x,y,t:0};
      const h=hitAt(x,y);
      if(h)tapHotspot(h);
      else if(S.sel){S.sel=null;renderInv();}
    });
    body.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>goRoom(+b.dataset.nav)));
    body.querySelectorAll('.esc-slot').forEach(b=>b.addEventListener('click',()=>tapItem(b.dataset.item)));
    $('.esc-hint').addEventListener('click',useHint);
    let introGo=false;
    $('.esc-start').addEventListener('click',()=>{
      if(introGo)return;introGo=true;AU.se('decide');$('.esc-intro').classList.add('off');
      const lines=[
        {text:'午前4時半。夜勤明け。制御室で日報を書き終えた、そのとき――'},
        {text:'ドォン!!　落雷。工場じゅうの明かりが一斉に消えた。',fx:()=>{flash=1;flashEl.style.transition='none';flashEl.style.opacity='.7';requestAnimationFrame(()=>{flashEl.style.transition='opacity 1.2s';flashEl.style.opacity='0';});AU.se('noise');sfx('thunder');}},
        {who:'だんのうら',img:'char_fear',text:'……停電!? 電気錠もシャッターも、閉じたまま止まってる……'},
      ];
      if(TWIST)lines.push({who:'だんのうら',img:'char_tired',text:'また雷か……。しかも今夜は、非常用発電機まで止まってる。'});
      lines.push({who:'だんのうら',img:'char_normal',text:'7時には、お隣さんに息子を迎えに行く約束だ。……設備屋の意地、見せてやる。'});
      dialog(lines,()=>{
        S.started=true;S.tut=1;renderInv();rainStart();
        say('暗闇だ。光の中で<b>枠が出る場所をタップで調べる</b>。まずは足もとの<b>机</b>から。',6);
      });
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
      const key=top+'|'+W+'x'+H+'@'+dpr;
      let c=bgCache[key];
      if(!c){
        c=document.createElement('canvas');c.width=W*dpr;c.height=H*dpr;
        const keep=cx;cx=c.getContext('2d');cx.setTransform(dpr,0,0,dpr,0,0);
        try{roomBG(top,bot,floorA,floorB);}finally{cx=keep;}
        bgCache[key]=c;
      }
      cx.drawImage(c,0,0,W,H);
    }
    function roomBG(top,bot,floorA,floorB){
      const fy=Y(FLOOR);
      cx.fillStyle=grad(0,fy,top,bot);cx.fillRect(0,0,W,fy);
      // 壁パネルの継ぎ目・汚れ
      cx.strokeStyle='rgba(0,0,0,.35)';cx.lineWidth=1;
      for(let i=1;i<5;i++){cx.beginPath();cx.moveTo(X(i*.2),Y(.035));cx.lineTo(X(i*.2),fy);cx.stroke();}
      stains.forEach(s=>{const g=cx.createRadialGradient(X(s.x),Y(s.y),0,X(s.x),Y(s.y),X(s.r));g.addColorStop(0,'rgba(0,0,0,.22)');g.addColorStop(1,'rgba(0,0,0,0)');cx.fillStyle=g;cx.fillRect(0,0,W,fy);});
      // 錆の垂れ
      rusts.forEach(r=>{const g=cx.createLinearGradient(0,Y(r.y),0,Y(r.y+r.l));g.addColorStop(0,'rgba(140,70,30,.38)');g.addColorStop(1,'rgba(120,60,30,0)');cx.fillStyle=g;cx.fillRect(X(r.x),Y(r.y),X(r.w),Y(r.l));cx.fillStyle='rgba(90,50,30,.6)';cx.beginPath();cx.arc(X(r.x+r.w/2),Y(r.y),Math.max(1.5,X(.005)),0,7);cx.fill();});
      // 腰壁ライン
      cx.fillStyle='rgba(0,0,0,.22)';cx.fillRect(0,Y(.58),W,fy-Y(.58));cx.fillStyle='rgba(255,255,255,.04)';cx.fillRect(0,Y(.58),W,1.5);
      // たるんだケーブル
      cx.strokeStyle='#0c0a12';cx.lineWidth=Math.max(2,W*.007);cx.beginPath();cx.moveTo(0,Y(.05));cx.quadraticCurveTo(X(.25),Y(.11),X(.5),Y(.05));cx.stroke();
      cx.strokeStyle='#2a1a1a';cx.lineWidth=Math.max(1.5,W*.004);cx.beginPath();cx.moveTo(X(.45),Y(.04));cx.quadraticCurveTo(X(.75),Y(.09),W,Y(.045));cx.stroke();
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
      cx.fillStyle=cx.createPattern(grain,'repeat');cx.fillRect(0,0,W,H);
      // 床のひび・油じみ
      cx.strokeStyle='rgba(0,0,0,.45)';cx.lineWidth=1;cx.beginPath();cx.moveTo(X(.12),Y(.9));cx.lineTo(X(.2),Y(.87));cx.lineTo(X(.23),Y(.93));cx.moveTo(X(.8),Y(.95));cx.lineTo(X(.86),Y(.9));cx.stroke();
      cx.fillStyle='rgba(20,14,30,.6)';cx.beginPath();cx.ellipse(X(.3),Y(.95),X(.08),Y(.012),0,0,7);cx.fill();
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
      drips.forEach(d=>{const dy=(d.y+T*d.v)%1,px=x+d.x*w,py=y+dy*hh,r=d.r*W*.003+.8;
        cx.globalAlpha=a*.12;cx.fillRect(px-.4,py-hh*.12,.8,hh*.12);
        cx.globalAlpha=a*.45;cx.fillStyle='#8090c0';cx.beginPath();cx.ellipse(px,py,r,r*1.3,0,0,7);cx.fill();
        cx.globalAlpha=a*.8;cx.fillStyle='#e8f0ff';cx.fillRect(px-r*.4,py-r*.6,Math.max(.8,r*.5),Math.max(.8,r*.5));});
      // ガラスの曇り
      cx.globalAlpha=1;const fg=cx.createLinearGradient(0,y+hh*.6,0,y+hh);fg.addColorStop(0,'rgba(120,130,170,0)');fg.addColorStop(1,`rgba(120,130,170,${a*.18})`);cx.fillStyle=fg;cx.fillRect(x,y,w,hh);
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
      for(let r=0;r<3;r++)for(let c=0;c<(r===0?1:r===1?3:2);c++){
        const bx=r?x+w*(.14+c*.25):x+w*.36,by=y+h*(.1+r*.17),bw=r?w*.2:w*.28;
        cx.fillStyle='#d8d4c8';cx.fillRect(bx,by,bw,h*.12);cx.fillStyle='#222';cx.fillRect(bx+bw*.35,by+h*.03,bw*.3,h*.06);
        const code=r===0?'MCCB':'CB-'+(r===1?c+1:c+4);const on=S.bOn.includes(code)||S.power;
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
      // 息子のクレヨン画「パパのこうじょう」
      const pw_=w*.16,ph_=h*.22;
      cx.fillStyle='#8a8a9a';cx.fillRect(pw_*.45,-2,pw_*.1,4);
      cx.fillStyle='#e8b830';cx.beginPath();cx.arc(pw_*.18,ph_*.2,pw_*.1,0,7);cx.fill();
      cx.fillStyle='#4a6ab0';cx.fillRect(pw_*.3,ph_*.45,pw_*.55,ph_*.4);cx.fillStyle='#e83055';cx.beginPath();cx.moveTo(pw_*.25,ph_*.47);cx.lineTo(pw_*.57,ph_*.22);cx.lineTo(pw_*.9,ph_*.47);cx.fill();
      cx.fillStyle='#666';cx.fillRect(pw_*.72,ph_*.12,pw_*.08,ph_*.2);
      cx.strokeStyle='#e83055';cx.lineWidth=1.2;cx.beginPath();cx.arc(pw_*.76,ph_*.12,pw_*.12,3.3,6.1);cx.stroke();cx.strokeStyle='#44bb66';cx.beginPath();cx.arc(pw_*.76,ph_*.12,pw_*.08,3.3,6.1);cx.stroke();
      cx.strokeStyle='#222';cx.lineWidth=1;cx.beginPath();[[.12,.62],[.2,.7]].forEach(([u,v])=>{cx.moveTo(pw_*u,ph_*v);cx.lineTo(pw_*u,ph_*(v+.2));});cx.stroke();
      cx.restore();
      // 椅子
      cx.fillStyle='#1e1a28';cx.fillRect(x+w*.2,y+h*.45,w*.22,h*.07);cx.fillRect(x+w*.29,y+h*.52,w*.04,h*.32);cx.fillRect(x+w*.18,y+h*.84,w*.26,h*.03);
      cx.fillStyle='#2a2438';cx.fillRect(x+w*.18,y+h*.05,w*.06,h*.42);
      // 配線ダクト
      cx.fillStyle='#2c2838';cx.fillRect(X(.73),Y(.04),X(.02),Y(.68));
      for(let k=0;k<6;k++){cx.fillStyle='#1c1a26';cx.fillRect(X(.725),Y(.08+k*.11),X(.03),Y(.008));}
      // 申し送りのクリップボード
      [x,y,w,h]=RX(hsById('ctrl','memo'));
      cx.fillStyle='#222';cx.beginPath();cx.arc(x+w/2,y-2,2,0,7);cx.fill();
      cx.save();cx.translate(x+w/2,y);cx.rotate(-.05+Math.sin(T*.8)*.012);
      cx.fillStyle='#6a4a2c';rr(-w*.42,0,w*.84,h*.95,2);cx.fill();cx.fillStyle='#ece6d4';cx.fillRect(-w*.36,h*.12,w*.72,h*.78);
      cx.fillStyle='#9a9aa6';rr(-w*.18,-h*.03,w*.36,h*.12,2);cx.fill();
      cx.fillStyle='#3a3046';for(let k=0;k<5;k++)cx.fillRect(-w*.3,h*(.24+k*.12),w*(.5-(k%2)*.15),1.4);
      cx.fillStyle='#a0203c';cx.fillRect(-w*.3,h*.78,w*.18,1.6);cx.restore();
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
      // 床に落ちた古い手帳
      [x,y,w,h]=RX(hsById('store','oldmemo'));
      cx.save();cx.translate(x+w/2,y+h*.55);cx.rotate(-.18);
      cx.fillStyle='rgba(0,0,0,.4)';cx.fillRect(-w*.32,-h*.2,w*.66,h*.5);
      cx.fillStyle='#4a2a1c';cx.fillRect(-w*.34,-h*.3,w*.62,h*.5);cx.fillStyle='#d8ccaa';cx.fillRect(-w*.3,-h*.26,w*.27,h*.42);cx.fillRect(-w*.01,-h*.26,w*.27,h*.42);
      cx.fillStyle='#5a4a3a';for(let k=0;k<3;k++){cx.fillRect(-w*.26,-h*(.16-k*.1),w*.2,1);cx.fillRect(w*.03,-h*(.16-k*.1),w*.2,1);}
      cx.restore();
      if(TWIST&&!S.gotFuel){
        [x,y,w,h]=RX(hsById('store','pallet'));
        cx.fillStyle='#b02030';cx.fillRect(x+w*.62,y-h*.05,w*.22,h*.35);cx.fillStyle='#e03848';cx.fillRect(x+w*.64,y-h*.02,w*.18,h*.3);
        cx.strokeStyle='#b02030';cx.lineWidth=2;cx.strokeRect(x+w*.66,y-h*.16,w*.08,h*.1);cx.fillStyle='#e8b830';cx.fillRect(x+w*.66,y+h*.08,w*.14,h*.1);
      }
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
          // 中の写真（奥の壁）
          cx.fillStyle='#f4f0e6';cx.fillRect(x+w*.3,y+hh*.6,w*.4,hh*.1);cx.fillStyle='#c89060';cx.fillRect(x+w*.33,y+hh*.615,w*.34,hh*.07);
          cx.fillStyle='#ffd8a8';cx.beginPath();cx.arc(x+w*.42,y+hh*.64,w*.05,0,7);cx.arc(x+w*.56,y+hh*.65,w*.035,0,7);cx.fill();
          // 開いた扉（左ヒンジ・手前に開く）
          const a=S.anim.locker,ex=x-w*.55*a+w*(1-a),sk=hh*.04*a;
          cx.fillStyle=grad(y,y+hh,a>.5?'#4a565c':'#5a6a70',a>.5?'#283036':'#34404a');
          cx.beginPath();cx.moveTo(x,y);cx.lineTo(ex,y-sk);cx.lineTo(ex,y+hh+sk);cx.lineTo(x,y+hh);cx.closePath();cx.fill();
          cx.strokeStyle='#14181c';cx.lineWidth=1.5;cx.stroke();
          if(a>.6){const iw=x-ex;cx.fillStyle='rgba(255,255,255,.08)';cx.fillRect(ex+iw*.15,y+hh*.1,iw*.7,hh*.02);
            // 扉の裏の鏡と写真
            cx.fillStyle='#8a98a8';cx.fillRect(ex+iw*.2,y+hh*.14,iw*.6,hh*.12);
            cx.save();cx.translate(ex+iw*.5,y+hh*.36);cx.rotate(-.06);cx.fillStyle='#f4f0e6';cx.fillRect(-iw*.32,0,iw*.64,hh*.12);cx.fillStyle='#e8a050';cx.fillRect(-iw*.27,hh*.012,iw*.54,hh*.08);
            cx.fillStyle='#ffd8a8';cx.beginPath();cx.arc(-iw*.08,hh*.045,iw*.09,0,7);cx.fill();cx.beginPath();cx.arc(iw*.12,hh*.06,iw*.06,0,7);cx.fill();cx.restore();}
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
      // 消火器
      cx.fillStyle='#c02030';rr(X(.06),Y(.74),X(.06),Y(.11),4);cx.fill();cx.fillStyle='#222';cx.fillRect(X(.075),Y(.72),X(.03),Y(.025));cx.fillStyle='#eee';cx.fillRect(X(.065),Y(.78),X(.04),Y(.03));
      if(TWIST){
        [x,y,w,h]=RX(hsById('exit','gen'));
        const vib=S.gen?Math.sin(T*60)*.8:0;
        shadow(x+w/2,y+h,w*.7);
        cx.save();cx.translate(vib,0);
        cx.fillStyle=grad(y+h*.15,y+h,'#c8a020','#7a5a10');rr(x,y+h*.15,w,h*.8,3);cx.fill();
        cx.strokeStyle='#3a2a08';cx.lineWidth=1.5;cx.stroke();
        cx.fillStyle='#2a2208';for(let k=0;k<6;k++)cx.fillRect(x+w*.08,y+h*(.3+k*.07),w*.45,h*.025);
        cx.fillStyle='#222';rr(x+w*.6,y+h*.28,w*.32,h*.36,2);cx.fill();
        cx.fillStyle='#ddd';cx.beginPath();cx.arc(x+w*.76,y+h*.4,w*.09,0,7);cx.fill();
        const fv=S.fueled?(S.gen?.9:.7):.03,fa=(135+270*fv)*Math.PI/180;cx.strokeStyle='#b01828';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(x+w*.76,y+h*.4);cx.lineTo(x+w*.76+Math.cos(fa)*w*.07,y+h*.4+Math.sin(fa)*w*.07);cx.stroke();
        cx.fillStyle='#e8e0cc';cx.fillRect(x+w*.08,y+h*.78,w*.5,h*.1);
        cx.fillStyle='#444';cx.fillRect(x+w*.15,y+h*.05,w*.1,h*.12);
        cx.restore();
        if(S.gen){for(let k=0;k<3;k++){const ph=(T*.6+k/3)%1;cx.fillStyle=`rgba(120,120,130,${.25*(1-ph)})`;cx.beginPath();cx.arc(x+w*.2+ph*w*.1,y+h*.05-ph*h*.5,w*(.05+ph*.12),0,7);cx.fill();}}
      }
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
      if(TWIST){const g_=RX(hsById('exit','gen'));const c_=S.gen?'68,238,136':S.fueled?'232,184,48':'232,48,85';cx.fillStyle=`rgb(${c_})`;cx.beginPath();cx.arc(g_[0]+g_[2]*.66,g_[1]+g_[3]*.56,Math.max(2,W*.006),0,7);cx.fill();glow(g_[0]+g_[2]*.66,g_[1]+g_[3]*.56,W*.03,c_,.5);}
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
    // 脱出後：夜明けの工場の外
    let endT0=-1;
    function drawOutside(a){
      if(a<=0)return;
      if(endT0<0)endT0=T;const t=T-endT0;
      cx.save();cx.globalAlpha=a;
      const sky=cx.createLinearGradient(0,0,0,H*.62);sky.addColorStop(0,'#2a2a5a');sky.addColorStop(.45,'#8a5a8a');sky.addColorStop(.8,'#e89870');sky.addColorStop(1,'#ffd8a0');
      cx.fillStyle=sky;cx.fillRect(0,0,W,H*.62);
      const sun=cx.createRadialGradient(W*.68,H*.6,0,W*.68,H*.6,W*.5);sun.addColorStop(0,'rgba(255,240,200,.95)');sun.addColorStop(.15,'rgba(255,210,150,.6)');sun.addColorStop(1,'rgba(255,200,150,0)');
      cx.fillStyle=sun;cx.fillRect(0,0,W,H*.62);
      // 雲
      cx.fillStyle='rgba(60,40,80,.35)';[[.2,.18,.3],[.7,.12,.25],[.45,.3,.35]].forEach(([u,v,r])=>{cx.beginPath();cx.ellipse(W*(u+(t*.004)),H*v,W*r,H*.025,0,0,7);cx.fill();});
      // 工場のシルエット
      cx.fillStyle='#1c1428';
      cx.beginPath();cx.moveTo(0,H*.62);cx.lineTo(0,H*.46);cx.lineTo(W*.12,H*.46);cx.lineTo(W*.12,H*.4);cx.lineTo(W*.3,H*.4);
      for(let i=0;i<4;i++){cx.lineTo(W*(.3+i*.08),H*.36);cx.lineTo(W*(.38+i*.08),H*.4);}
      cx.lineTo(W*.62,H*.4);cx.lineTo(W*.62,H*.5);cx.lineTo(W*.82,H*.5);cx.lineTo(W*.82,H*.44);cx.lineTo(W,H*.44);cx.lineTo(W,H*.62);cx.fill();
      cx.fillRect(W*.2,H*.2,W*.035,H*.22);cx.fillRect(W*.86,H*.28,W*.025,H*.16);
      for(let i=0;i<4;i++){const ph=(t*.25+i/4)%1;cx.fillStyle=`rgba(230,200,220,${.3*(1-ph)})`;cx.beginPath();cx.arc(W*.218+ph*W*.08,H*.2-ph*H*.12,W*(.02+ph*.05),0,7);cx.fill();}
      cx.fillStyle='rgba(255,220,150,.8)';for(let i=0;i<7;i++)cx.fillRect(W*(.34+i*.04),H*.45,W*.015,H*.012);
      // 濡れたアスファルトと反射
      const gr=cx.createLinearGradient(0,H*.62,0,H);gr.addColorStop(0,'#3a2a3a');gr.addColorStop(1,'#141020');cx.fillStyle=gr;cx.fillRect(0,H*.62,W,H*.38);
      cx.fillStyle='rgba(255,210,160,.35)';cx.beginPath();cx.ellipse(W*.68,H*.68,W*.25,H*.02,0,0,7);cx.fill();
      for(let i=0;i<6;i++){cx.fillStyle=`rgba(255,220,180,${.12+.06*Math.sin(t*2+i)})`;cx.fillRect(W*(.55+Math.sin(i*2.1)*.12),H*(.7+i*.04),W*(.2-i*.02),1.5);}
      cx.strokeStyle='rgba(255,255,255,.25)';cx.lineWidth=2;cx.setLineDash([W*.06,W*.05]);cx.beginPath();cx.moveTo(0,H*.84);cx.lineTo(W,H*.8);cx.stroke();cx.setLineDash([]);
      // 鳥
      cx.strokeStyle='#2a1a30';cx.lineWidth=1.5;for(let i=0;i<3;i++){const bx=(W*(.1+i*.07)+t*W*.05)%W,by=H*(.15+i*.03),f=Math.sin(t*8+i)*3;cx.beginPath();cx.moveTo(bx-6,by-f);cx.lineTo(bx,by);cx.lineTo(bx+6,by-f);cx.stroke();}
      cx.globalAlpha=a;
      txt('脱出成功',W/2,H*.13,W*.1,'#fff4e0');
      txt(clock()+'　雨上がり',W/2,H*.2,W*.04,'rgba(255,240,220,.9)');
      cx.restore();
    }
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
      if(S.over==='timeup')amb=.22;
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
      // 天井からの雫
      if(drip.y>=0){const dx_=X(DRIP[S.room]);cx.fillStyle='rgba(180,200,255,.75)';cx.beginPath();cx.ellipse(dx_,Y(drip.y),1.6,2.6,0,0,7);cx.fill();}
      else{const dx_=X(DRIP[S.room]);const k=Math.max(0,1-drip.t/1.2);cx.fillStyle=`rgba(180,200,255,${.6*(1-k)})`;cx.beginPath();cx.ellipse(dx_,Y(.037)+2,1.4*(1-k)+.5,2*(1-k)+.5,0,0,7);cx.fill();}
      if(splash){const k=splash.t;cx.strokeStyle=`rgba(170,190,255,${.5*(1-k)})`;cx.lineWidth=1;cx.beginPath();cx.ellipse(X(DRIP[S.room]),Y(.9),4+k*18,(4+k*18)*.25,0,0,7);cx.stroke();}
      // 粒子
      cx.globalCompositeOperation='lighter';
      parts.forEach(p=>{if(p.room!==S.room)return;const a=Math.min(1,p.l*1.6);cx.fillStyle=`rgba(${p.rgb},${a})`;cx.beginPath();cx.arc(X(p.x),Y(p.y),p.s*(W/380),0,7);cx.fill();});
      cx.globalCompositeOperation='source-over';
      // チュートリアルの指差し
      if(S.tut===1&&S.room==='ctrl'&&!zoomId){
        const h=hsById('ctrl','desk'),px=X(h.x+h.w*.7),py=Y(h.y+h.h*.42),k=(T*1.2)%1;
        cx.strokeStyle=`rgba(0,232,200,${1-k})`;cx.lineWidth=2.5;cx.beginPath();cx.arc(px,py,8+k*26,0,7);cx.stroke();
        const bob=Math.sin(T*5)*4;cx.save();cx.translate(px+14,py+16+bob);cx.rotate(-.5);
        cx.fillStyle='#deccf8';cx.strokeStyle='#05040e';cx.lineWidth=1.5;cx.beginPath();cx.roundRect?cx.roundRect(-5,-2,10,20,4):cx.rect(-5,-2,10,20);cx.fill();cx.stroke();
        cx.beginPath();cx.roundRect?cx.roundRect(-9,12,18,16,5):cx.rect(-9,12,18,16);cx.fill();cx.stroke();cx.restore();
        txt('タップ',px,py+48,Math.max(11,W*.03),'rgba(0,232,200,.95)');
      }
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
        const k=(S.anim.door-.6)/.4;
        cx.fillStyle=`rgba(255,244,225,${Math.min(1,k*2)*(1-Math.max(0,(T-S.clearT-2.4))*1.5)})`;
        drawOutside(Math.min(1,Math.max(0,(T-S.clearT-2.2)/1.2)));
        cx.fillRect(0,0,W,H);
      }
      // 残り時間が少ないと赤く脈打つ
      if(S.started&&!S.door&&S.left<30){const a=(.5+.5*Math.sin(T*6))*.18;cx.strokeStyle=`rgba(232,48,85,${a})`;cx.lineWidth=10;cx.strokeRect(0,0,W,H);}
    }

    // ── メインループ ──
    let ro=null;
    if(window.ResizeObserver){ro=new ResizeObserver(()=>{if(!mg._ended)layout();});ro.observe(stage);}
    else window.addEventListener('resize',layout);
    const cleanup=()=>{if(ro)ro.disconnect();else window.removeEventListener('resize',layout);};
    layout();updNav();renderInv();mg.setTimer(fmt(S.left));

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
      for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.35*dt;p.vx*=.97;if(p.l<=0)parts.splice(i,1);}
      if(drip.y<0){drip.t+=dt;if(drip.t>2.2+Math.random()*.02){drip.y=.04;drip.sp=0;}}
      else{drip.sp+=1.6*dt;drip.y+=drip.sp*dt;if(drip.y>=.9){drip.y=-1;drip.t=0;splash={t:0};if(S.started&&!S.over&&Math.random()<.5)sfx('drip');}}
      if(splash){splash.t+=dt*1.8;if(splash.t>=1)splash=null;}
      appr('drawer',S.drawer,dt,3);appr('locker',S.locker,dt,1.6);appr('panel',S.panel,dt,1.8);appr('plcCover',S.plcCover,dt,1.5);
      appr('shutter',S.air,dt,.35);appr('door',S.door,dt,.42);
      if(trans){
        trans.t=(performance.now()-trans.t0)/550;
        if(!trans.sw&&trans.t>=.5){trans.sw=true;S.room=trans.to;updNav();AU.se('btn');}
        if(trans.t>=1)trans=null;
      }
      if(S.started&&!S.door&&!S.over){
        S.left-=dt;
        const s=Math.ceil(Math.max(0,S.left));
        if(s!==lastSec){lastSec=s;mg.setTimer(fmt(S.left));}
        if(S.left<=30&&!warned){warned=true;AU.se('warn');say('……もう空が白んできた。急がないと！');}
        if(S.left<=0){S.left=0;mg.setTimer('0:00');endingTimeup();}
      }
      if(S.door&&!S.over&&T-S.clearT>4.2)endingClear();
      if(S.tut===2){S.tutT-=dt;if(S.tutT<=0){S.tut=0;renderInv();}}
      cx.setTransform(dpr,0,0,dpr,0,0);
      drawScene();
    });

    // テスト用フック（ゲームには影響しない）
    body._esc={P,S,
      hs:(id)=>{const h=HS[S.room].find(q=>q.id===id);const r=cv.getBoundingClientRect();return [r.left+(h.x+h.w/2)*r.width,r.top+(h.y+h.h/2)*r.height];},
      busy:()=>!!trans,zoom:()=>zoomId,setLeft:v=>{S.left=v;}};

    return {result(reason){
      cleanup();rainStop();
      const out=S.over||reason;
      record(out);
      if(out==='clear'){
        const m=Math.max(0,4-S.hints),g=grade();
        return {
          title:`🔐 脱出成功！　評価 ${g}`,
          summary:`残り時間 <span class="up">${fmt(S.left)}</span>　ヒント <span class="${S.hints?'down':'up'}">${S.hints}回</span>${TWIST?'（二夜目）':''}<br>雨上がりの朝。お隣さんの玄関で、息子が手を振っていた。`,
          fx:{certKnow:5,jobRep:6,mental:m,fatigue:6},time:60,sp:2,
          log:S.hints?'停電の工場から、設備の知識で脱出した。':'停電の工場から、ヒントなしで脱出した。',
          cutin:g==='S'?['win','……段取り八分。迎えに行こう。']:['happy','……間に合った。迎えに行こう。'],
        };
      }
      if(out==='timeup'){
        return {
          title:'🔐 夜明けまで閉じ込められた',
          summary:`進捗 ${progress()}/${PMAX}。朝になって電力が復旧し、ようやく外に出られた。<br>お隣さんに平謝り……。`,
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
