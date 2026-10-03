// ══════════════════════════════════════════════════════════
// カードバトル「配信トークバトル」
// 話題カードで配信を荒らす3体（荒らしアカウント → スパムBot → 過疎の夜）を順に追い払う。
// 敵の次の行動は頭上に表示。勝つたびに新しい話題カードを1枚選んでデッキに加える。
// スキルが高いほどカードが強くなる。全戦あわせて TURNS ターン以内に「過疎の夜」を倒せば勝利。
// ══════════════════════════════════════════════════════════
addMinigameStyle('cards',`
.mg-cards{padding:0;}
.cards-stage{position:absolute;inset:0;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none;font-family:var(--dot);color:var(--tx);background:#05040e;-webkit-tap-highlight-color:transparent;}
.cards-cv{position:absolute;left:0;top:0;display:block;touch-action:none;}
/* ── 敵HUD ── */
.cards-ehud{position:absolute;top:6px;left:8px;right:8px;display:flex;flex-direction:column;gap:5px;pointer-events:none;z-index:5;}
.cards-top{display:flex;align-items:center;justify-content:space-between;gap:6px;}
.cards-route{display:flex;align-items:center;gap:3px;font-size:.56rem;color:var(--tx-d);}
.cards-route i{display:block;width:10px;height:1px;background:rgba(138,82,212,.45);}
.cards-node{padding:1px 6px;border:1px solid rgba(138,82,212,.3);border-radius:9px;background:rgba(10,7,22,.7);white-space:nowrap;}
.cards-node.now{color:var(--tx-b);border-color:var(--rd);box-shadow:0 0 8px rgba(232,48,85,.45);}
.cards-node.done{color:var(--gn);border-color:rgba(68,238,136,.45);}
.cards-node.done::before{content:'✓';margin-right:2px;}
.cards-live{font-family:var(--mono);font-size:.6rem;color:var(--tx-b);display:flex;align-items:center;gap:4px;background:rgba(10,7,22,.75);border:1px solid rgba(232,48,85,.35);border-radius:3px;padding:1px 6px;white-space:nowrap;}
.cards-live b{font-weight:normal;color:var(--rd);min-width:1.4em;text-align:right;}
.cards-dot{width:6px;height:6px;border-radius:50%;background:var(--rd);box-shadow:0 0 6px var(--rd);animation:cards-blink 1.2s steps(2) infinite;}
@keyframes cards-blink{50%{opacity:.25}}
.cards-eplate{display:flex;align-items:center;gap:7px;background:linear-gradient(90deg,rgba(10,7,22,.85),rgba(10,7,22,.55));border:1px solid rgba(232,48,85,.28);border-radius:4px;padding:4px 8px;}
.cards-ename{font-size:.82rem;color:var(--tx-b);white-space:nowrap;text-shadow:0 0 8px rgba(232,48,85,.6);}
.cards-ename small{font-size:.55rem;color:var(--rd);margin-right:4px;letter-spacing:.1em;}
.cards-bar{position:relative;flex:1;height:12px;background:#140f26;border:1px solid rgba(255,255,255,.08);border-radius:6px;overflow:hidden;min-width:60px;}
.cards-bar-ghost,.cards-bar-fill{position:absolute;left:0;top:0;bottom:0;border-radius:6px;}
.cards-bar-ghost{background:rgba(255,255,255,.55);transition:width .7s ease .25s;}
.cards-bar-fill{transition:width .22s ease-out;}
.cards-bar.e .cards-bar-fill{background:linear-gradient(90deg,#7a1838,#e83055 70%,#ff7d98);box-shadow:0 0 8px rgba(232,48,85,.6);}
.cards-bar.p .cards-bar-fill{background:linear-gradient(90deg,#0b6d62,#00e8c8 70%,#9ffff0);box-shadow:0 0 8px rgba(0,232,200,.55);}
.cards-bar.blk{border-color:rgba(130,200,255,.8);box-shadow:0 0 6px rgba(130,200,255,.5);}
.cards-bar-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:.6rem;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000;}
.cards-chips{display:flex;gap:3px;flex-wrap:nowrap;}
.cards-chip{display:flex;align-items:center;gap:1px;font-family:var(--mono);font-size:.62rem;color:#fff;padding:0 4px 0 2px;height:17px;border-radius:9px;background:rgba(10,7,22,.85);border:1px solid var(--k);white-space:nowrap;animation:cards-pop .25s;}
.cards-chip svg{width:14px;height:14px;}
@keyframes cards-pop{from{transform:scale(1.5)}}
/* ── 次の行動 ── */
.cards-intent{position:absolute;left:0;top:0;transform:translate(-50%,0);display:flex;flex-direction:column;align-items:center;pointer-events:none;z-index:6;transition:opacity .25s;}
.cards-intent-b{display:flex;align-items:center;gap:2px;padding:2px 8px 2px 4px;background:rgba(8,5,18,.88);border:1px solid var(--k,#e83055);border-radius:14px;box-shadow:0 0 12px -2px var(--k,#e83055);animation:cards-bob 1.6s ease-in-out infinite;}
.cards-intent-b svg{width:24px;height:24px;}
.cards-intent-n{font-family:var(--mono);font-size:1rem;color:#fff;text-shadow:0 0 6px var(--k,#e83055);}
.cards-intent-lb{margin-top:2px;font-size:.58rem;color:var(--tx-b);background:rgba(5,4,14,.7);padding:0 5px;border-radius:2px;white-space:nowrap;}
@keyframes cards-bob{50%{transform:translateY(-3px)}}
/* ── ログ ── */
.cards-log{position:absolute;left:8px;right:8px;top:0;text-align:center;font-size:.7rem;color:var(--tx-b);pointer-events:none;z-index:6;text-shadow:0 0 4px #000,0 0 8px #000;transition:opacity .4s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
/* ── 自分 ── */
.cards-strip{position:absolute;left:6px;right:6px;top:0;display:flex;flex-direction:column;gap:5px;padding:6px 7px;background:linear-gradient(180deg,rgba(14,10,30,.92),rgba(8,6,18,.94));border:1px solid rgba(0,232,200,.22);border-radius:6px;z-index:4;box-shadow:0 -6px 20px rgba(0,0,0,.5);}
.cards-prow,.cards-crow{display:flex;align-items:center;gap:7px;}
.cards-pname{font-size:.7rem;color:var(--tx-b);white-space:nowrap;}
.cards-energy{display:flex;align-items:center;gap:5px;}
.cards-orbs{display:flex;gap:4px;}
.cards-orb{width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0,#a8fff2 18%,#00e8c8 48%,#03564b 100%);box-shadow:0 0 9px rgba(0,232,200,.85);transition:all .2s;}
.cards-orb.off{background:#0f1a22;box-shadow:inset 0 0 0 1px #1f3a40;}
.cards-orb.x{background:radial-gradient(circle at 35% 30%,#fff 0,#fff2b0 18%,#e8b830 48%,#6a4a05 100%);box-shadow:0 0 9px rgba(232,184,48,.85);}
.cards-en-num{font-family:var(--mono);font-size:.78rem;color:var(--cy);text-shadow:0 0 6px rgba(0,232,200,.7);}
.cards-pile{position:relative;width:26px;height:34px;flex-shrink:0;}
.cards-pile::before,.cards-pile::after{content:'';position:absolute;inset:0;border-radius:3px;border:1px solid rgba(138,82,212,.7);background:repeating-linear-gradient(45deg,#1b1235 0 3px,#130c26 3px 6px);}
.cards-pile::before{transform:translate(2px,-2px);opacity:.6;}
.cards-pile.disc::before,.cards-pile.disc::after{border-color:rgba(94,80,120,.8);background:repeating-linear-gradient(-45deg,#15111f 0 3px,#0e0b16 3px 6px);}
.cards-pile b{position:absolute;z-index:2;inset:0;display:flex;align-items:center;justify-content:center;font-weight:normal;font-family:var(--mono);font-size:.72rem;color:#fff;text-shadow:0 0 3px #000;}
.cards-pile span{position:absolute;z-index:2;left:50%;bottom:-11px;transform:translateX(-50%);font-size:.48rem;color:var(--tx-d);white-space:nowrap;}
.cards-spacer{flex:1;}
.cards-end{position:relative;min-height:38px;padding:0 12px;border-radius:4px;border:1px solid var(--gd);background:linear-gradient(180deg,rgba(232,184,48,.2),rgba(232,184,48,.05));color:var(--gd);font-family:var(--dot);font-size:.78rem;letter-spacing:.06em;cursor:pointer;white-space:nowrap;touch-action:manipulation;}
.cards-end.glow{box-shadow:0 0 14px rgba(232,184,48,.6);animation:cards-endp 1.2s ease-in-out infinite;}
@keyframes cards-endp{50%{box-shadow:0 0 4px rgba(232,184,48,.2)}}
.cards-end:disabled{opacity:.35;cursor:default;animation:none;box-shadow:none;}
/* ── カード ── */
.cards-hl{position:absolute;inset:0;pointer-events:none;z-index:7;}
.cards-card{position:absolute;left:0;top:0;width:var(--cw);height:var(--ch);transform-origin:50% 100%;transition:transform .22s cubic-bezier(.2,.9,.3,1.12);pointer-events:auto;cursor:pointer;touch-action:none;will-change:transform;}
.cards-face{position:absolute;inset:0;border-radius:8px;background:linear-gradient(165deg,var(--c1) 0%,#0d0a1b 58%,#07050f 100%);border:1.5px solid var(--cc);box-shadow:inset 0 0 0 2px rgba(0,0,0,.6),inset 0 0 16px -5px var(--cc),0 6px 14px rgba(0,0,0,.7);overflow:hidden;display:flex;flex-direction:column;align-items:center;padding:calc(var(--cw)*.19) 5px 4px;transition:filter .2s,box-shadow .2s;}
.cards-face::before{content:'';position:absolute;inset:3px;border:1px solid rgba(255,255,255,.08);border-radius:5px;pointer-events:none;}
.cards-face::after{content:'';position:absolute;left:-40%;top:-60%;width:80%;height:120%;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.07) 50%,transparent 70%);transform:rotate(8deg);pointer-events:none;}
.cards-tag{position:absolute;top:4px;right:6px;font-size:calc(var(--cw)*.1);color:var(--cc);letter-spacing:.04em;}
.cards-art{position:relative;width:100%;height:calc(var(--ch)*.36);border-radius:4px;background:radial-gradient(ellipse at 50% 70%,var(--cg),transparent 70%),linear-gradient(180deg,#120d24,#07050f);border:1px solid rgba(255,255,255,.07);flex-shrink:0;overflow:hidden;}
.cards-art svg{width:100%;height:100%;display:block;}
.cards-name{margin-top:4px;font-size:calc(var(--cw)*.135);color:#f4ecff;text-shadow:0 0 6px var(--cg);white-space:nowrap;letter-spacing:.02em;}
.cards-txt{margin-top:2px;font-size:calc(var(--cw)*.112);line-height:1.32;color:var(--tx);text-align:center;}
.cards-txt b{color:#fff;font-weight:normal;font-size:1.18em;}
.cards-txt b.hot{color:var(--gd);text-shadow:0 0 6px rgba(232,184,48,.9);}
.cards-txt em{font-style:normal;color:var(--tx-d);}
.cards-gem{position:absolute;z-index:2;top:-6px;left:-6px;width:calc(var(--cw)*.3);height:calc(var(--cw)*.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:calc(var(--cw)*.18);color:#022;background:radial-gradient(circle at 35% 30%,#fff 0,#a8fff2 20%,#00e8c8 50%,#04665a 100%);box-shadow:0 0 8px rgba(0,232,200,.8),0 0 0 2px #05040e;}
.cards-card.dim .cards-face{filter:brightness(.5) saturate(.45);}
.cards-card.dim .cards-gem{background:radial-gradient(circle at 35% 30%,#bbb,#556 60%,#223);box-shadow:0 0 0 2px #05040e;color:#ccd;}
.cards-card.sel .cards-face,.cards-card.hov .cards-face{box-shadow:inset 0 0 0 2px rgba(0,0,0,.6),inset 0 0 18px -4px var(--cc),0 0 20px var(--cc),0 10px 20px rgba(0,0,0,.7);}
.cards-card.armed .cards-face{box-shadow:0 0 30px var(--cc),0 0 0 2px #fff;}
.cards-card.cat-curse .cards-face{animation:cards-curse 1.1s ease-in-out infinite;}
@keyframes cards-curse{50%{box-shadow:inset 0 0 0 2px rgba(0,0,0,.6),inset 0 0 22px -2px #e83055,0 0 16px rgba(232,48,85,.7);}}
.cards-card.nope .cards-face{animation:cards-nope .32s;}
@keyframes cards-nope{20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}
.cards-card .cards-key{position:absolute;bottom:3px;right:5px;font-family:var(--mono);font-size:.5rem;color:var(--tx-d);}
.cards-card.static{position:relative;transform:none;transition:transform .15s;}
.cards-card.static:hover{transform:translateY(-4px);}
/* ── オーバーレイ ── */
.cards-ov{position:absolute;inset:0;z-index:20;display:none;align-items:center;justify-content:center;flex-direction:column;background:rgba(4,3,10,.78);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);padding:14px;text-align:center;}
.cards-ov.on{display:flex;animation:cards-fade .3s;}
@keyframes cards-fade{from{opacity:0}}
.cards-how{max-width:340px;background:var(--panel);border:1px solid rgba(138,82,212,.5);border-radius:6px;padding:14px 14px 12px;box-shadow:0 0 30px rgba(138,82,212,.25);}
.cards-how-t{font-size:1.05rem;color:var(--tx-b);letter-spacing:.12em;text-shadow:0 0 10px rgba(138,82,212,.8);}
.cards-how-s{font-family:var(--serif);font-size:.66rem;color:var(--tx);margin:5px 0 9px;line-height:1.7;}
.cards-how ul{list-style:none;padding:0;margin:0;text-align:left;display:flex;flex-direction:column;gap:6px;}
.cards-how li{font-size:.66rem;line-height:1.55;color:var(--tx);padding-left:14px;position:relative;}
.cards-how li::before{content:'◆';position:absolute;left:0;color:var(--cy);font-size:.55rem;top:.2em;}
.cards-how li b{font-weight:normal;color:var(--gd);}
.cards-how-go{margin-top:11px;font-size:.66rem;color:var(--cy);animation:cards-blink 1.4s steps(2) infinite;}
.cards-banner{font-size:1.5rem;color:#fff;letter-spacing:.14em;text-shadow:0 0 14px var(--k,#8a52d4),0 0 30px var(--k,#8a52d4);animation:cards-bn .5s cubic-bezier(.2,.9,.3,1.3);}
.cards-banner-s{margin-top:6px;font-size:.72rem;color:var(--tx-b);font-family:var(--serif);animation:cards-fade .8s;}
.cards-banner-k{font-family:var(--mono);font-size:.62rem;color:var(--k,#8a52d4);letter-spacing:.3em;margin-bottom:4px;}
@keyframes cards-bn{from{transform:scale(1.8);opacity:0;letter-spacing:.5em}}
.cards-rw-t{font-size:.95rem;color:var(--tx-b);text-shadow:0 0 10px rgba(0,232,200,.5);}
.cards-rw-s{font-size:.64rem;color:var(--tx);margin:4px 0 12px;font-family:var(--serif);}
.cards-rw-s b{font-weight:normal;color:var(--gn);}
.cards-rw{display:flex;gap:10px;justify-content:center;--cw:96px;--ch:136px;}
.cards-rw .cards-card{animation:cards-deal .45s cubic-bezier(.2,.9,.3,1.2) backwards;}
.cards-rw .cards-card:nth-child(2){animation-delay:.08s}.cards-rw .cards-card:nth-child(3){animation-delay:.16s}
@keyframes cards-deal{from{transform:translateY(40px) rotate(-6deg);opacity:0}}
.cards-skip{margin-top:16px;padding:8px 16px;min-height:40px;background:transparent;border:1px solid rgba(94,80,120,.8);color:var(--tx);font-family:var(--dot);font-size:.68rem;border-radius:3px;cursor:pointer;}
@media (max-width:370px){.cards-rw{--cw:88px;--ch:124px;gap:7px;}}
`);

registerMinigame({
  id:'cards', icon:'🃏', name:'配信トークバトル', genre:'カードバトル', bgm:'stream',
  desc:'話題カードで配信を荒らす3体の「夜」に挑む。勝つたびにカードが増える。スキルが高いほどデッキが強くなる。',
  effect:'フォロワー↑ 配信人気↑ 収入↑ ／ 疲労+8 約80分',
  help:'2回タップ／上スワイプで使用 ・ PC:1-9 Space',
  start(body,mg){
    const TURNS=14, HAND=5, ENERGY=3, MAXHP=40;
    const sk=gs.skills, day=gs.day||1;
    const se=t=>{try{AU.se(t);}catch(e){}};
    const later=(fn,ms)=>setTimeout(()=>{if(!mg._ended)fn();},ms);
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;};
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;

    // ── カテゴリ（枠の色） ──
    const CAT={
      talk:   {label:'トーク',  c:'#b484ff',c1:'#2b1752',g:'rgba(180,132,255,.35)'},
      kaidan: {label:'怪談',    c:'#5ef0c8',c1:'#0b3430',g:'rgba(94,240,200,.3)'},
      song:   {label:'歌',      c:'#ff78b4',c1:'#46122f',g:'rgba(255,120,180,.32)'},
      guard:  {label:'ガード',  c:'#58c8ff',c1:'#0d2a46',g:'rgba(88,200,255,.3)'},
      support:{label:'サポート',c:'#e8b830',c1:'#3a2a08',g:'rgba(232,184,48,.3)'},
      curse:  {label:'呪い',    c:'#e83055',c1:'#3d0814',g:'rgba(232,48,85,.4)'},
    };
    // ── カード定義（盛り上がり＝敵へのダメージ） ──
    const CARD={
      chat:   {name:'雑談',        cat:'talk',   cost:1,dmg:6+sk.chatSkill*2},
      factory:{name:'工場トーク',  cat:'talk',   cost:1,dmg:5+sk.plc,draw:1},
      honne:  {name:'本音トーク',  cat:'talk',   cost:1,dmg:10+sk.radioVibe*2,self:3},
      kaidan: {name:'怪談',        cat:'kaidan', cost:2,dmg:14+sk.kaidanSkill*3},
      song:   {name:'歌',          cat:'song',   cost:2,dmg:9+Math.floor(sk.singSkill*2),heal:4},
      thanks: {name:'ギフトのお礼',cat:'guard',  cost:1,block:5+sk.emoCtrl*2,heat:2},
      mod:    {name:'モデレーター',cat:'guard',  cost:1,block:10},
      breath: {name:'深呼吸',      cat:'support',cost:0,heal:3+sk.stressRes},
      regular:{name:'常連の応援',  cat:'support',cost:1,draw:2,energy:1},
      burn:   {name:'炎上の火種',  cat:'curse',  cost:1,curse:true},
      // 報酬で手に入るカード
      pickup: {name:'コメント拾い',cat:'talk',   cost:1,dmg:4+sk.chatSkill,heat:3},
      jikkyo: {name:'実況トーク',  cat:'talk',   cost:2,dmg:4+sk.chatSkill,hits:3},
      radio:  {name:'深夜ラジオ',  cat:'talk',   cost:2,dmg:10+sk.radioVibe*2,block:5},
      tape:   {name:'呪いの録音',  cat:'kaidan', cost:1,dmg:7+sk.kaidanSkill*2,clearBlock:true},
      hyaku:  {name:'百物語',      cat:'kaidan', cost:3,dmg:22+sk.kaidanSkill*4},
      lullaby:{name:'子守唄',      cat:'song',   cost:1,heal:6+Math.floor(sk.singSkill/2),clearBurn:true},
      request:{name:'歌枠リクエスト',cat:'song', cost:2,dmg:6+sk.singSkill,hits:2,heal:3},
      totsu:  {name:'凸待ち',      cat:'guard',  cost:1,block:8,heat:2},
      aizuchi:{name:'合いの手',    cat:'guard',  cost:0,block:4},
      hype:   {name:'ハイテンション',cat:'support',cost:1,heat:5,draw:1},
      kamikai:{name:'神回の予感',  cat:'support',cost:0,energy:1,draw:1,exhaust:true},
    };
    const REWARDS=['pickup','jikkyo','radio','tape','hyaku','lullaby','request','totsu','aizuchi','hype','kamikai'];

    // ── カードの絵（SVG・viewBox 64×40） ──
    const ART={
      chat:`<path d="M9 7h26a5 5 0 0 1 5 5v9a5 5 0 0 1-5 5H19l-7 6v-6H9a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5z" fill="#2c1b52" stroke="#c9a4ff" stroke-width="1.5"/><circle cx="15" cy="16.5" r="2" fill="#efe4ff"/><circle cx="22" cy="16.5" r="2" fill="#efe4ff"/><circle cx="29" cy="16.5" r="2" fill="#efe4ff"/><path d="M38 15h18a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-2v5l-6-5H38a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4z" fill="#123b44" stroke="#00e8c8" stroke-width="1.3"/><path d="M40 21.5l3 4 3-4 3 4 3-4" fill="none" stroke="#9ffff0" stroke-width="1.4"/>`,
      factory:`<circle cx="24" cy="21" r="11" fill="none" stroke="#8a7fa6" stroke-width="6" stroke-dasharray="4.3 3.3"/><circle cx="24" cy="21" r="9" fill="#2a2440" stroke="#c4b6e6" stroke-width="1.2"/><circle cx="24" cy="21" r="3.5" fill="#0c0919" stroke="#e8b830" stroke-width="1.2"/><path d="M36 33L50 13" stroke="#d9d2ea" stroke-width="4" stroke-linecap="round"/><path d="M47 10a6 6 0 1 0 7 6l-3-1-1-3z" fill="#d9d2ea"/><circle cx="12" cy="8" r="1" fill="#e8b830"/><circle cx="56" cy="31" r="1.2" fill="#e8b830"/>`,
      honne:`<path d="M24 5a13 13 0 1 0 9 22a11 11 0 1 1-9-22z" fill="#f5e6a8" opacity=".95"/><circle cx="13" cy="10" r=".8" fill="#fff"/><circle cx="8" cy="22" r=".7" fill="#fff"/><rect x="42" y="7" width="10" height="17" rx="5" fill="#2c1b52" stroke="#c9a4ff" stroke-width="1.4"/><path d="M42 12h10M42 16h10M42 20h10" stroke="#c9a4ff" stroke-width=".6" opacity=".6"/><path d="M39 19a8 8 0 0 0 16 0M47 27v7M42 34h10" fill="none" stroke="#c9a4ff" stroke-width="1.4"/>`,
      kaidan:`<path d="M22 35V18a11 11 0 0 1 22 0v17l-3.7-3-3.6 3-3.7-3-3.7 3-3.6-3z" fill="#d8fff3" opacity=".88"/><ellipse cx="29" cy="18" rx="2" ry="3" fill="#06261f"/><ellipse cx="37" cy="18" rx="2" ry="3" fill="#06261f"/><ellipse cx="33" cy="25" rx="2.2" ry="1.6" fill="#06261f" opacity=".7"/><rect x="9" y="26" width="5" height="10" fill="#e8dcc0"/><path d="M11.5 18c3 3 2 6 0 7c-2-1-3-4 0-7z" fill="#ffd34d"/><circle cx="11.5" cy="23" r="5" fill="#ffd34d" opacity=".18"/><path d="M50 8c4 2 6 6 5 10" stroke="#5ef0c8" stroke-width="1" fill="none" opacity=".6"/>`,
      song:`<rect x="25" y="5" width="14" height="18" rx="7" fill="#46122f" stroke="#ff9cc8" stroke-width="1.4"/><path d="M25 11h14M25 15h14M25 19h14M32 5v18" stroke="#ff9cc8" stroke-width=".6" opacity=".55"/><path d="M29 23l-1 13h8l-1-13z" fill="#2a1020" stroke="#ff9cc8" stroke-width="1.2"/><path d="M10 26v-12l8-2v12" fill="none" stroke="#ffe08a" stroke-width="1.5"/><ellipse cx="8.5" cy="26" rx="2.6" ry="2" fill="#ffe08a"/><ellipse cx="16.5" cy="24" rx="2.6" ry="2" fill="#ffe08a"/><path d="M50 10v12" stroke="#ff78b4" stroke-width="1.5"/><ellipse cx="48.3" cy="22.3" rx="2.6" ry="2" fill="#ff78b4"/><path d="M50 10l5 3" stroke="#ff78b4" stroke-width="1.5"/>`,
      thanks:`<rect x="18" y="17" width="26" height="18" rx="2" fill="#2a1b52" stroke="#58c8ff" stroke-width="1.4"/><rect x="16" y="12" width="30" height="6" rx="1.5" fill="#3a2a72" stroke="#58c8ff" stroke-width="1.4"/><path d="M31 12v23" stroke="#ff78b4" stroke-width="3"/><path d="M31 12c-6-8-12-3-6 0zM31 12c6-8 12-3 6 0z" fill="#ff78b4"/><path d="M52 10c0-2 3-2 3 0c0-2 3-2 3 0c0 2-3 4-3 5c0-1-3-3-3-5z" fill="#ff78b4"/><path d="M8 26c0-1.5 2-1.5 2 0c0-1.5 2-1.5 2 0c0 1.5-2 3-2 3.5c0-.5-2-2-2-3.5z" fill="#ff9cc8" opacity=".7"/>`,
      mod:`<path d="M32 4l15 6v10c0 9-7 15-15 18c-8-3-15-9-15-18V10z" fill="#0d2a46" stroke="#58c8ff" stroke-width="1.6"/><path d="M32 8l11 4.5v7.5c0 7-5 11.5-11 14z" fill="#58c8ff" opacity=".18"/><path d="M25 20l5 5 9-10" fill="none" stroke="#9fe6ff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`,
      breath:`<path d="M20 18h22v8a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z" fill="#3a2a08" stroke="#e8b830" stroke-width="1.4"/><path d="M42 20h3a4 4 0 0 1 0 8h-3" fill="none" stroke="#e8b830" stroke-width="1.4"/><path d="M15 36h32" stroke="#e8b830" stroke-width="1.4" opacity=".6"/><path d="M26 15c-2-3 2-4 0-8M32 15c-2-3 2-4 0-8M38 15c-2-3 2-4 0-8" fill="none" stroke="#f5e6c8" stroke-width="1.2" opacity=".7"/>`,
      regular:`<circle cx="16" cy="18" r="5" fill="#b484ff"/><path d="M7 35a9 9 0 0 1 18 0z" fill="#b484ff"/><circle cx="48" cy="18" r="5" fill="#00e8c8"/><path d="M39 35a9 9 0 0 1 18 0z" fill="#00e8c8"/><circle cx="32" cy="15" r="6" fill="#e8b830"/><path d="M21 36a11 11 0 0 1 22 0z" fill="#e8b830"/><path d="M29 4c0-2 3-2 3 0c0-2 3-2 3 0c0 2-3 4-3 5c0-1-3-3-3-5z" fill="#ff78b4"/>`,
      burn:`<path d="M32 4c4 7 12 11 12 21a12 12 0 0 1-24 0c0-5 3-8 5-10c0 4 2 6 4 6c-2-6 0-12 3-17z" fill="#e83055"/><path d="M32 16c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6c0 2 1 3 2 3c-1-3 0-6 1-8z" fill="#ff9a3c"/><path d="M32 26c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1.5-3c0 1 .5 1.5 1 1.5c-.5-1.5 0-2.5.5-3.5z" fill="#ffe08a"/><circle cx="14" cy="30" r="1.3" fill="#ff9a3c"/><circle cx="50" cy="12" r="1" fill="#ff9a3c"/><circle cx="47" cy="34" r="1.5" fill="#e83055"/>`,
      pickup:`<path d="M14 6h24a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H22l-6 5v-5h-2a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z" fill="#2c1b52" stroke="#c9a4ff" stroke-width="1.4"/><path d="M26 10v6M26 18.5v.5" stroke="#ffe08a" stroke-width="2" stroke-linecap="round"/><path d="M40 34c0-6 6-8 10-8s8 3 8 3" fill="none" stroke="#e8b830" stroke-width="2.2" stroke-linecap="round"/><path d="M52 12l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z" fill="#ffe08a"/>`,
      jikkyo:`<path d="M16 16h32a8 8 0 0 1 8 8v2a6 6 0 0 1-11 3l-3-4H22l-3 4a6 6 0 0 1-11-3v-2a8 8 0 0 1 8-8z" fill="#2c1b52" stroke="#c9a4ff" stroke-width="1.4"/><path d="M18 20v6M15 23h6" stroke="#efe4ff" stroke-width="1.8"/><circle cx="44" cy="21" r="1.8" fill="#00e8c8"/><circle cx="48" cy="25" r="1.8" fill="#ff78b4"/><path d="M6 8h10M4 12h8M48 8h10M52 12h8" stroke="#b484ff" stroke-width="1.2" opacity=".7"/>`,
      radio:`<rect x="10" y="14" width="44" height="22" rx="3" fill="#2c1b52" stroke="#c9a4ff" stroke-width="1.4"/><path d="M18 14L40 4" stroke="#c9a4ff" stroke-width="1.3"/><circle cx="22" cy="25" r="7" fill="#150d2c" stroke="#c9a4ff" stroke-width="1"/><circle cx="22" cy="25" r="3" fill="none" stroke="#c9a4ff" stroke-width=".7" opacity=".7"/><rect x="34" y="19" width="15" height="6" rx="1" fill="#0b2f2a" stroke="#00e8c8" stroke-width=".8"/><path d="M41 19v6" stroke="#ff5a7a" stroke-width="1"/><circle cx="38" cy="30" r="1.6" fill="#e8b830"/><circle cx="45" cy="30" r="1.6" fill="#e8b830"/>`,
      tape:`<rect x="9" y="9" width="46" height="26" rx="2.5" fill="#0b2a26" stroke="#5ef0c8" stroke-width="1.4"/><rect x="15" y="14" width="34" height="11" rx="5.5" fill="#06120f" stroke="#5ef0c8" stroke-width=".8"/><circle cx="22" cy="19.5" r="3.3" fill="none" stroke="#d8fff3" stroke-width="1.3" stroke-dasharray="2 1.3"/><circle cx="42" cy="19.5" r="3.3" fill="none" stroke="#d8fff3" stroke-width="1.3" stroke-dasharray="2 1.3"/><path d="M18 35l3-6h22l3 6" fill="none" stroke="#5ef0c8" stroke-width="1"/><circle cx="51" cy="12" r="1.5" fill="#e83055"/><path d="M30 28c1 2-1 3 0 5" stroke="#e83055" stroke-width=".9" fill="none"/>`,
      hyaku:`<g fill="#e8dcc0"><rect x="8" y="24" width="4" height="12"/><rect x="18" y="20" width="4" height="16"/><rect x="30" y="18" width="4" height="18"/><rect x="42" y="21" width="4" height="15"/><rect x="52" y="25" width="4" height="11"/></g><g fill="#7fffe0"><path d="M10 17c2 2 2 5 0 6c-2-1-2-4 0-6z"/><path d="M20 13c2 2 2 5 0 6c-2-1-2-4 0-6z"/><path d="M32 11c2 2 2 5 0 6c-2-1-2-4 0-6z"/><path d="M44 14c2 2 2 5 0 6c-2-1-2-4 0-6z"/></g><path d="M54 19c1 1 1 3 0 4" stroke="#7fffe0" stroke-width=".8" opacity=".4"/><circle cx="32" cy="15" r="9" fill="#5ef0c8" opacity=".12"/>`,
      lullaby:`<path d="M26 6a12 12 0 1 0 9 20a10 10 0 1 1-9-20z" fill="#ffd9ec"/><text x="40" y="17" font-size="9" fill="#ff9cc8" font-family="monospace">z</text><text x="47" y="11" font-size="7" fill="#ff9cc8" font-family="monospace">z</text><text x="52" y="6" font-size="5" fill="#ff9cc8" font-family="monospace">z</text><path d="M44 30l1 2.4 2.5.6-2.5.6-1 2.4-1-2.4-2.5-.6 2.5-.6z" fill="#ffe08a"/>`,
      request:`<path d="M14 30V12l12-3v18" fill="none" stroke="#ff9cc8" stroke-width="1.6"/><ellipse cx="12" cy="30" rx="3" ry="2.3" fill="#ff9cc8"/><ellipse cx="24" cy="27" rx="3" ry="2.3" fill="#ff9cc8"/><path d="M14 16l12-3" stroke="#ff9cc8" stroke-width="1.6"/><rect x="34" y="14" width="22" height="15" rx="1.5" fill="#46122f" stroke="#ffe08a" stroke-width="1.2"/><path d="M34 15l11 8 11-8" fill="none" stroke="#ffe08a" stroke-width="1.2"/><path d="M45 7c0-1.6 2.4-1.6 2.4 0c0-1.6 2.4-1.6 2.4 0c0 1.6-2.4 3.2-2.4 4c0-.8-2.4-2.4-2.4-4z" fill="#ff78b4"/>`,
      totsu:`<rect x="23" y="5" width="18" height="31" rx="3" fill="#0d2a46" stroke="#58c8ff" stroke-width="1.4"/><rect x="26" y="9" width="12" height="20" fill="#0a3d5a"/><circle cx="32" cy="32.5" r="1.4" fill="#58c8ff"/><path d="M29 18a4 4 0 0 1 6 0M27 15a7 7 0 0 1 10 0" fill="none" stroke="#9fe6ff" stroke-width="1.2"/><path d="M14 12a12 12 0 0 0 0 16M10 9a17 17 0 0 0 0 22M50 12a12 12 0 0 1 0 16M54 9a17 17 0 0 1 0 22" fill="none" stroke="#58c8ff" stroke-width="1.3" opacity=".7"/>`,
      aizuchi:`<path d="M10 10h18a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H18l-5 4v-4h-3a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z" fill="#0d2a46" stroke="#58c8ff" stroke-width="1.3"/><path d="M36 16h18a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4h-3v4l-5-4H36a4 4 0 0 1-4-4v-6a4 4 0 0 1 4-4z" fill="#123b44" stroke="#9fe6ff" stroke-width="1.3"/><path d="M14 17h10M38 23h14" stroke="#9fe6ff" stroke-width="1.6" stroke-linecap="round"/>`,
      hype:`<rect x="28" y="5" width="8" height="24" rx="4" fill="#3a2a08" stroke="#e8b830" stroke-width="1.3"/><circle cx="32" cy="31" r="6" fill="#e83055" stroke="#e8b830" stroke-width="1.3"/><rect x="30.5" y="13" width="3" height="16" fill="#e83055"/><path d="M14 22l3-6 2 4 3-8M44 14l3 4 3-7 3 5" fill="none" stroke="#ffe08a" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="10" r="1.2" fill="#ff9a3c"/><circle cx="54" cy="28" r="1.4" fill="#ff9a3c"/>`,
      kamikai:`<path d="M32 3l4.5 10.5 11.5 1-8.7 7.6 2.7 11.4-10-6.2-10 6.2 2.7-11.4-8.7-7.6 11.5-1z" fill="#ffe08a" stroke="#e8b830" stroke-width="1.2"/><path d="M32 12l1.8 4.3 4.7.4-3.6 3.1 1.1 4.6-4-2.5-4 2.5 1.1-4.6-3.6-3.1 4.7-.4z" fill="#fff8d0"/><path d="M8 8l4 2M56 8l-4 2M8 32l4-2M56 32l-4-2" stroke="#e8b830" stroke-width="1.3"/>`,
    };
    const ICON={ // ステータス・行動アイコン（viewBox 24）
      atk:`<path d="M12 2l2.2 4.6 5-1.6-1.6 5 4.4 2.4-4.6 2.2 1.4 5-5-1.4L12 22l-2-4-5 1.4 1.4-5L2 12.2l4.4-2.2L5 5l5 1.6z" fill="#e83055"/><path d="M12 7.5v6M12 16v.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
      heavy:`<path d="M2 12c4-6 16-6 20 0c-4 6-16 6-20 0z" fill="#4a0a1c" stroke="#e83055" stroke-width="1.4"/><circle cx="12" cy="12" r="4" fill="#e83055"/><ellipse cx="12" cy="12" rx="1.2" ry="3.2" fill="#100"/>`,
      block:`<path d="M12 2l8 3.2V11c0 5-3.6 8.4-8 10c-4.4-1.6-8-5-8-10V5.2z" fill="#26324a" stroke="#9fb4d8" stroke-width="1.4"/><path d="M8 12h8" stroke="#9fb4d8" stroke-width="1.6" stroke-linecap="round"/>`,
      guard:`<path d="M12 2l8 3.2V11c0 5-3.6 8.4-8 10c-4.4-1.6-8-5-8-10V5.2z" fill="#0d2a46" stroke="#58c8ff" stroke-width="1.6"/>`,
      burn:`<path d="M12 2c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4.5 2.6-5.5c0 2 1 3 2 3c-1-3 0-6 1.4-8.5z" fill="#ff7a3c"/><path d="M12 12c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1.5-2.5c0 1 .5 1.5 1 1.5c-.4-1.4 0-2.8.5-4z" fill="#ffe08a"/>`,
      curse:`<rect x="5" y="3" width="12" height="17" rx="1.5" fill="#3d0814" stroke="#e83055" stroke-width="1.4" transform="rotate(-8 11 11)"/><path d="M14 9c1.5 3 4.5 4 4.5 7.5a4.5 4.5 0 0 1-9 0c0-2 1.5-3 2-3.5c0 1.5.8 2 1.5 2c-.8-2 0-4 1-6z" fill="#ff7a3c"/>`,
      buff:`<path d="M12 3l7 8h-4.5v9h-5v-9H5z" fill="#b484ff" stroke="#e5d4ff" stroke-width="1"/>`,
      chill:`<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" stroke="#9fe6ff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3" fill="#0d2a46" stroke="#9fe6ff" stroke-width="1.2"/>`,
      heat:`<path d="M12 2c2 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4.5 2.6-5.5c0 2 1 3 2 3c-1-3 0-6 1.4-8.5z" fill="#e8b830"/><path d="M12 12c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1.5-2.5c0 1 .5 1.5 1 1.5c-.4-1.4 0-2.8.5-4z" fill="#fff4c0"/>`,
      str:`<path d="M12 3l7 8h-4.5v9h-5v-9H5z" fill="#b484ff"/>`,
    };
    const svg=(vb,inner)=>`<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

    // ── デッキ（スキル・状況で強くなる） ──
    const deck=['chat','chat','chat','factory','kaidan','song','honne','thanks','thanks','breath','regular'];
    if(sk.kaidanSkill>=1)deck.push('kaidan');
    if(sk.singSkill>=3)deck.push('song');
    if((gs.listeners||[]).some(l=>l.type==='mod'))deck.push('mod');
    if(gs.streamPop>=40)deck.push('regular');

    // ── 敵（日が進むほど手強い） ──
    const A=(k,n,label,o)=>Object.assign({k,n,label,times:1},o||{});
    const ENEMIES=[
      {key:'troll',name:'荒らしアカウント',short:'荒らし',hp:28+Math.floor(day*.7),col:'#e83055',
        moves:[A('atk',6,'荒らしコメント'),A('atk',3,'連投',{times:2}),A('burn',3,'晒し上げ'),A('block',7,'冷笑（シラけ）')],
        first:0},
      {key:'bot',name:'スパムBot',short:'スパムBot',hp:34+Math.floor(day*.9),col:'#00e8c8',
        moves:[A('atk',2,'スパム連投',{times:4}),A('curse',2,'URL貼り（火種を混ぜる）'),A('buff',2,'自己増殖',{block:5}),A('atk',8,'ノイズ')],
        first:0},
      {key:'night',name:'過疎の夜',short:'過疎の夜',hp:50+Math.floor(day*1.3),col:'#8a52d4',boss:true,
        moves:[A('atk',7,'静寂'),A('atk',4,'離脱の波',{times:2}),A('block',10,'シラけ'),A('curse',2,'炎上の火種',{burn:2})],
        heavy:A('heavy',14,'深い闇'),chill:A('chill',6,'同接ゼロの予感'),first:0},
    ];

    // ── 状態 ──
    const me={hp:MAXHP,max:MAXHP,block:0,energy:ENERGY,heat:0,burn:0};
    const enemy={def:null,hp:1,max:1,block:0,str:0,intent:null,lastMove:-1,t:0};
    let stageIdx=0,turnsUsed=0,cleared=0,dmgTotal=0,viewers=1;
    let draw=[],discard=[],hand=[];  // hand: {id,el}
    let busy=true,overlay=false,phase='intro';
    let selCard=null,hoverCard=null,drag=null,kbdIdx=-1;

    // ── DOM ──
    body.innerHTML=`
<div class="cards-stage">
  <canvas class="cards-cv"></canvas>
  <div class="cards-ehud">
    <div class="cards-top">
      <div class="cards-route">${ENEMIES.map((e,i)=>`${i?'<i></i>':''}<span class="cards-node" data-i="${i}">${e.short}</span>`).join('')}</div>
      <div class="cards-live"><span class="cards-dot"></span>LIVE 同接<b class="cards-view">1</b></div>
    </div>
    <div class="cards-eplate"><span class="cards-ename"></span><div class="cards-bar e"><div class="cards-bar-ghost"></div><div class="cards-bar-fill"></div><span class="cards-bar-num"></span></div><div class="cards-chips e"></div></div>
  </div>
  <div class="cards-intent"><div class="cards-intent-b"><span class="cards-intent-ic"></span><span class="cards-intent-n"></span></div><span class="cards-intent-lb"></span></div>
  <div class="cards-log"></div>
  <div class="cards-strip">
    <div class="cards-prow"><span class="cards-pname">🎙 だんのうら</span><div class="cards-bar p"><div class="cards-bar-ghost"></div><div class="cards-bar-fill"></div><span class="cards-bar-num"></span></div><div class="cards-chips p"></div></div>
    <div class="cards-crow">
      <div class="cards-pile draw"><b>0</b><span>山札</span></div>
      <div class="cards-energy"><div class="cards-orbs"></div><span class="cards-en-num">3</span></div>
      <div class="cards-spacer"></div>
      <div class="cards-pile disc"><b>0</b><span>捨て札</span></div>
      <button class="cards-end">ターン終了 ▶</button>
    </div>
  </div>
  <div class="cards-hl"></div>
  <div class="cards-ov"></div>
</div>`;
    const Q=s=>body.querySelector(s);
    const stage=Q('.cards-stage'),cv=Q('.cards-cv'),cx=cv.getContext('2d');
    const el={
      nodes:[...body.querySelectorAll('.cards-node')],view:Q('.cards-view'),ename:Q('.cards-ename'),
      ebar:Q('.cards-bar.e'),efill:Q('.cards-bar.e .cards-bar-fill'),eghost:Q('.cards-bar.e .cards-bar-ghost'),enum:Q('.cards-bar.e .cards-bar-num'),echips:Q('.cards-chips.e'),
      intent:Q('.cards-intent'),intentB:Q('.cards-intent-b'),intentIc:Q('.cards-intent-ic'),intentN:Q('.cards-intent-n'),intentLb:Q('.cards-intent-lb'),
      log:Q('.cards-log'),strip:Q('.cards-strip'),
      pbar:Q('.cards-bar.p'),pfill:Q('.cards-bar.p .cards-bar-fill'),pghost:Q('.cards-bar.p .cards-bar-ghost'),pnum:Q('.cards-bar.p .cards-bar-num'),pchips:Q('.cards-chips.p'),
      drawPile:Q('.cards-pile.draw'),discPile:Q('.cards-pile.disc'),orbs:Q('.cards-orbs'),enNum:Q('.cards-en-num'),endBtn:Q('.cards-end'),
      hl:Q('.cards-hl'),ov:Q('.cards-ov'),ehud:Q('.cards-ehud'),
    };

    // ── レイアウト ──
    const dpr=Math.min(2.5,window.devicePixelRatio||1);
    let W=360,H=600,cw=80,ch=112,stripTop=400,stripH=70,handY=500;
    let ex=180,ey=200,R=100,ezTop=90;
    const PX={draw:{x:0,y:0},disc:{x:0,y:0},hp:{x:0,y:0},en:{x:0,y:0}};
    const bg=document.createElement('canvas'),bgx=bg.getContext('2d');
    const off=document.createElement('canvas'),ofx=off.getContext('2d');
    let offS=200;
    let win={x:0,y:0,w:0,h:0};
    function rel(node){const a=node.getBoundingClientRect(),b=stage.getBoundingClientRect();return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};}
    function layout(){
      const r=body.getBoundingClientRect();
      W=Math.max(300,Math.round(r.width));H=Math.max(460,Math.round(r.height));
      cw=Math.round(clamp((W-14)/4.35,64,98));ch=Math.round(cw*1.42);
      stage.style.setProperty('--cw',cw+'px');stage.style.setProperty('--ch',ch+'px');
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      handY=H-ch-18;
      stripH=el.strip.offsetHeight||72;
      stripTop=handY-stripH-8;
      el.strip.style.top=stripTop+'px';
      el.log.style.top=(stripTop-22)+'px';
      ezTop=(el.ehud.offsetHeight||60)+8;
      const zTop=ezTop+40,zBot=stripTop-30;
      ex=W/2;ey=(zTop+zBot)/2;R=Math.max(50,Math.min(W*.3,(zBot-zTop)*.46));
      offS=Math.ceil(R*2.7);off.width=Math.ceil(offS*dpr);off.height=Math.ceil(offS*dpr);
      el.intent.style.left=ex+'px';
      el.intent.style.top=Math.max(ezTop+2,ey-R*1.02-46)+'px';
      PX.draw=rel(el.drawPile);PX.disc=rel(el.discPile);PX.hp=rel(el.pbar);PX.en=rel(el.orbs);
      buildBG();initRain();
      layoutHand();
    }

    // ── 背景（静的部分はキャッシュ） ──
    function buildBG(){
      bg.width=cv.width;bg.height=cv.height;
      const c=bgx;c.setTransform(dpr,0,0,dpr,0,0);
      let g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0b0820');g.addColorStop(1,'#040309');
      c.fillStyle=g;c.fillRect(0,0,W,H);
      // 窓
      win={x:W*.07,y:-6,w:W*.86,h:stripTop-30};
      c.save();c.beginPath();c.rect(win.x,win.y,win.w,win.h);c.clip();
      g=c.createLinearGradient(0,0,0,win.h);g.addColorStop(0,'#0a0b26');g.addColorStop(.7,'#1a0f33');g.addColorStop(1,'#2a1238');
      c.fillStyle=g;c.fillRect(win.x,win.y,win.w,win.h);
      // 遠くの街
      let seed=7;const rr=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
      const base=win.y+win.h;
      for(let layer=0;layer<2;layer++){
        let x=win.x-10;
        while(x<win.x+win.w){
          const bw=14+rr()*30,bh=(layer?40:70)+rr()*(layer?50:90);
          c.fillStyle=layer?'#0a0716':'#120c24';
          c.fillRect(x,base-bh,bw,bh);
          for(let wy=base-bh+6;wy<base-6;wy+=7)for(let wx=x+3;wx<x+bw-3;wx+=6){
            if(rr()<.12){c.fillStyle=rr()<.5?'rgba(232,184,48,.35)':'rgba(0,232,200,.25)';c.fillRect(wx,wy,2,3);}
          }
          x+=bw+2;
        }
      }
      // ネオンのぼけ
      const neon=['rgba(232,48,85,','rgba(0,232,200,','rgba(138,82,212,','rgba(232,184,48,'];
      for(let i=0;i<14;i++){
        const nx=win.x+rr()*win.w,ny=win.y+win.h*(.45+rr()*.5),nr=8+rr()*26,col=neon[i%4];
        g=c.createRadialGradient(nx,ny,0,nx,ny,nr);g.addColorStop(0,col+'.28)');g.addColorStop(1,col+'0)');
        c.fillStyle=g;c.beginPath();c.arc(nx,ny,nr,0,7);c.fill();
      }
      c.restore();
      // 窓枠
      c.strokeStyle='#1a1430';c.lineWidth=6;c.strokeRect(win.x,win.y,win.w,win.h);
      c.strokeStyle='rgba(138,82,212,.18)';c.lineWidth=1;c.strokeRect(win.x+3.5,win.y+3.5,win.w-7,win.h-7);
      c.fillStyle='#120e22';c.fillRect(win.x+win.w*.5-2,win.y,4,win.h);c.fillRect(win.x,win.y+win.h*.42,win.w,3);
      // カーテン
      for(const side of [0,1]){
        const x0=side?W-W*.13:0,w0=W*.13;
        g=c.createLinearGradient(x0,0,x0+w0,0);
        for(let k=0;k<=6;k++)g.addColorStop(k/6,k%2?'#1c1032':'#0d0820');
        c.fillStyle=g;c.fillRect(x0,0,w0,stripTop);
        g=c.createLinearGradient(side?x0:x0+w0,0,side?x0-20:x0+w0+20,0);g.addColorStop(0,'rgba(0,0,0,.5)');g.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=g;c.fillRect(side?x0-20:x0+w0,0,20,stripTop);
      }
      // 机とモニター
      const dy=stripTop-24;
      g=c.createLinearGradient(0,dy,0,H);g.addColorStop(0,'#17112a');g.addColorStop(.05,'#0d0a1a');g.addColorStop(1,'#050409');
      c.fillStyle=g;c.fillRect(0,dy,W,H-dy);
      c.fillStyle='rgba(0,232,200,.18)';c.fillRect(0,dy,W,1);
      const mx=W*.03,mw=Math.min(110,W*.24),mh=mw*.6,my=dy-mh-8;
      c.fillStyle='#08060f';c.fillRect(mx+mw*.45,my+mh,mw*.1,10);c.fillRect(mx+mw*.3,dy-3,mw*.4,3);
      c.fillStyle='#0c0a18';c.fillRect(mx,my,mw,mh);
      g=c.createLinearGradient(mx,my,mx+mw,my+mh);g.addColorStop(0,'#0e4a52');g.addColorStop(1,'#1b1040');
      c.fillStyle=g;c.fillRect(mx+3,my+3,mw-6,mh-6);
      c.fillStyle='rgba(255,255,255,.35)';for(let i=0;i<5;i++)c.fillRect(mx+8,my+8+i*5,(mw-30)*(.4+((i*37)%10)/16),1.5);
      c.fillStyle='#e83055';c.fillRect(mx+mw-16,my+6,8,4);
      // マイクアーム
      const ax=W*.9;
      c.strokeStyle='#0a0814';c.lineWidth=4;c.beginPath();c.moveTo(W+4,dy-60);c.lineTo(ax,dy-40);c.lineTo(ax-14,dy-62);c.stroke();
      c.fillStyle='#0a0814';c.beginPath();c.ellipse(ax-16,dy-70,7,12,-.4,0,7);c.fill();
      c.strokeStyle='rgba(138,82,212,.35)';c.lineWidth=1;c.stroke();
      // 周辺減光
      g=c.createRadialGradient(W/2,H*.38,Math.min(W,H)*.25,W/2,H*.45,Math.max(W,H)*.75);
      g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.6)');c.fillStyle=g;c.fillRect(0,0,W,H);
      // モニター光（動的に明滅させるスプライト）
      glow.width=Math.ceil(mw*3*dpr);glow.height=glow.width;
      const gc=glow.getContext('2d');gc.setTransform(dpr,0,0,dpr,0,0);
      const gs2=mw*1.5;g=gc.createRadialGradient(gs2,gs2,0,gs2,gs2,gs2);
      g.addColorStop(0,'rgba(0,232,200,.22)');g.addColorStop(1,'rgba(0,232,200,0)');gc.fillStyle=g;gc.fillRect(0,0,gs2*2,gs2*2);
      glowPos={x:mx+mw/2-gs2,y:my+mh/2-gs2,s:gs2*2};
    }
    const glow=document.createElement('canvas');let glowPos={x:0,y:0,s:0};

    // 雨
    const RAIN=90,rain=new Float32Array(RAIN*4); // x,y,len,speed
    const DROPS=10,drops=new Float32Array(DROPS*3);
    function initRain(){
      for(let i=0;i<RAIN;i++){rain[i*4]=win.x+Math.random()*(win.w+40);rain[i*4+1]=Math.random()*win.h;rain[i*4+2]=8+Math.random()*16;rain[i*4+3]=380+Math.random()*320;}
      for(let i=0;i<DROPS;i++){drops[i*3]=win.x+Math.random()*win.w;drops[i*3+1]=Math.random()*win.h;drops[i*3+2]=6+Math.random()*24;}
    }

    // ── 演出用の粒子・数字（プール） ──
    const PN=180,P=[];for(let i=0;i<PN;i++)P.push({on:false,x:0,y:0,vx:0,vy:0,l:0,m:1,c:'#fff',s:2});
    function burst(x,y,col,n,sp,up){
      for(let i=0,k=0;i<PN&&k<n;i++){const p=P[i];if(p.on)continue;k++;
        const a=Math.random()*6.283,v=sp*(.3+Math.random());
        p.on=true;p.x=x;p.y=y;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v-(up||0);p.l=p.m=.4+Math.random()*.5;p.c=col;p.s=1.5+Math.random()*2.5;}
    }
    const FN=24,F=[];for(let i=0;i<FN;i++)F.push({on:false,x:0,y:0,t:0,txt:'',c:'#fff',s:20});
    function floatNum(x,y,txt,c,s){
      let f=F.find(q=>!q.on)||F[0];
      f.on=true;f.x=x+(Math.random()-.5)*24;f.y=y;f.t=0;f.txt=txt;f.c=c;f.s=s||22;
    }
    let shake=0,flashP=0,flashE=0,ehit=0,elunge=0,edie=0,ein=0,lightning=0,tm=0,glitchT=0;

    // ── 敵の描画（オフスクリーンに描いてから歪ませて貼る） ──
    function drawTroll(c,R,t){
      const br=1+Math.sin(t*1.7)*.03;c.scale(br,1/br);
      let g=c.createRadialGradient(0,0,R*.2,0,0,R*1.25);g.addColorStop(0,'rgba(232,48,85,.25)');g.addColorStop(1,'rgba(232,48,85,0)');
      c.fillStyle=g;c.beginPath();c.arc(0,0,R*1.25,0,7);c.fill();
      // 煙の体（フード）
      c.beginPath();c.moveTo(-R*.85,R*.9);
      for(let i=1;i<=12;i++){const x=-R*.85+i*(R*1.7/12);c.lineTo(x,R*.9+Math.sin(t*3+i*1.3)*R*.06+(i%2?R*.1:0));}
      c.bezierCurveTo(R*.95,R*.35,R*.78,-R*.2,R*.46,-R*.58);
      c.bezierCurveTo(R*.3,-R*.98,-R*.3,-R*.98,-R*.46,-R*.58);
      c.bezierCurveTo(-R*.78,-R*.2,-R*.95,R*.35,-R*.85,R*.9);c.closePath();
      g=c.createLinearGradient(0,-R,0,R);g.addColorStop(0,'#2a1030');g.addColorStop(.6,'#120a1c');g.addColorStop(1,'#07050c');
      c.fillStyle=g;c.fill();c.strokeStyle='rgba(232,48,85,.5)';c.lineWidth=2;c.stroke();
      // 顔の闇
      c.fillStyle='#030206';c.beginPath();c.ellipse(0,-R*.3,R*.33,R*.37,0,0,7);c.fill();
      // スマホの光
      g=c.createRadialGradient(0,R*.2,0,0,R*.1,R*.55);g.addColorStop(0,'rgba(160,240,255,.35)');g.addColorStop(1,'rgba(160,240,255,0)');
      c.fillStyle=g;c.beginPath();c.arc(0,R*.1,R*.55,0,7);c.fill();
      // 目
      const bl=(t%3.4)<.12?.15:1;
      c.fillStyle='#ff3b5c';c.shadowColor='#ff3b5c';c.shadowBlur=12;
      for(const s of [-1,1]){c.beginPath();c.moveTo(s*R*.06,-R*.38);c.lineTo(s*R*.24,-R*.45-R*.03*bl);c.lineTo(s*R*.22,-R*.36+R*.02*(1-bl));c.closePath();c.fill();}
      // にやけ口
      c.strokeStyle='#ffd0da';c.lineWidth=2;c.beginPath();
      for(let i=0;i<=8;i++){const x=-R*.2+i*R*.05,y=-R*.2+(i%2?R*.04:0)+Math.abs(i-4)*-R*.012;i?c.lineTo(x,y):c.moveTo(x,y);}
      c.stroke();c.shadowBlur=0;
      // スマホ
      c.save();c.translate(0,R*.32);c.rotate(Math.sin(t*2)*.06);
      c.fillStyle='#0d0d14';c.fillRect(-R*.15,-R*.22,R*.3,R*.44);
      g=c.createLinearGradient(0,-R*.2,0,R*.2);g.addColorStop(0,'#bff8ff');g.addColorStop(1,'#4ab8d8');
      c.fillStyle=g;c.fillRect(-R*.12,-R*.18,R*.24,R*.36);
      c.fillStyle='rgba(232,48,85,.8)';for(let i=0;i<5;i++)c.fillRect(-R*.09,-R*.14+i*R*.065,R*(.08+((i*7+Math.floor(t*4))%5)*.025),R*.025);
      c.fillStyle='#120a1c';c.beginPath();c.ellipse(-R*.15,R*.08,R*.07,R*.1,0,0,7);c.ellipse(R*.15,R*.08,R*.07,R*.1,0,0,7);c.fill();
      c.restore();
      // 周回する煽り文字
      c.font=`${Math.round(R*.2)}px "DotGothic16", monospace`;c.textAlign='center';c.textBaseline='middle';
      const G=['w','草','ｗｗ','乙','雑魚','www'];
      for(let i=0;i<6;i++){const a=t*.7+i*1.047,x=Math.cos(a)*R*1.0,y=Math.sin(a)*R*.42-R*.15;
        c.globalAlpha=.35+.35*(Math.sin(a)+1)/2;c.fillStyle=i%2?'#ff5a7a':'#ffb0c0';c.fillText(G[i],x,y);}
      c.globalAlpha=1;
    }
    function drawBot(c,R,t){
      c.translate(0,Math.sin(t*2.2)*R*.05);
      let g=c.createRadialGradient(0,0,R*.2,0,0,R*1.2);g.addColorStop(0,'rgba(0,232,200,.18)');g.addColorStop(1,'rgba(0,232,200,0)');
      c.fillStyle=g;c.beginPath();c.arc(0,0,R*1.2,0,7);c.fill();
      // ケーブル
      c.strokeStyle='#1c2233';c.lineWidth=R*.05;
      for(let i=0;i<3;i++){const x=(i-1)*R*.35;c.beginPath();c.moveTo(x,R*.45);c.bezierCurveTo(x+Math.sin(t*1.5+i)*R*.2,R*.75,x-Math.sin(t*1.2+i)*R*.25,R*.95,x+Math.sin(t+i*2)*R*.15,R*1.15);c.stroke();}
      c.fillStyle='#00e8c8';for(let i=0;i<3;i++){const x=(i-1)*R*.35+Math.sin(t+i*2)*R*.15;c.globalAlpha=.5+.5*Math.sin(t*6+i);c.fillRect(x-2,R*1.13,4,4);}c.globalAlpha=1;
      // アンテナ
      c.strokeStyle='#5a6680';c.lineWidth=3;c.beginPath();c.moveTo(R*.3,-R*.55);c.lineTo(R*.45,-R*.9);c.stroke();
      c.fillStyle=(t%1)<.5?'#ff3b5c':'#5a1020';c.shadowColor='#ff3b5c';c.shadowBlur=(t%1)<.5?14:0;c.beginPath();c.arc(R*.45,-R*.92,R*.06,0,7);c.fill();c.shadowBlur=0;
      // 本体
      const bx=-R*.72,by=-R*.58,bw=R*1.44,bh=R*1.08,rad=R*.14;
      c.beginPath();c.moveTo(bx+rad,by);c.arcTo(bx+bw,by,bx+bw,by+bh,rad);c.arcTo(bx+bw,by+bh,bx,by+bh,rad);c.arcTo(bx,by+bh,bx,by,rad);c.arcTo(bx,by,bx+bw,by,rad);c.closePath();
      g=c.createLinearGradient(0,by,0,by+bh);g.addColorStop(0,'#2a3044');g.addColorStop(1,'#10131d');c.fillStyle=g;c.fill();
      c.strokeStyle='rgba(0,232,200,.55)';c.lineWidth=2;c.stroke();
      // 耳
      c.fillStyle='#1a1f2c';c.fillRect(bx-R*.1,-R*.25,R*.1,R*.4);c.fillRect(bx+bw,-R*.25,R*.1,R*.4);
      // 画面
      const sx=bx+R*.12,sy=by+R*.1,sw=bw-R*.24,sh=bh*.62;
      c.fillStyle='#031410';c.fillRect(sx,sy,sw,sh);
      c.save();c.beginPath();c.rect(sx,sy,sw,sh);c.clip();
      const look=Math.sin(t*.9)*sw*.22+Math.sin(t*3.1)*sw*.03;
      g=c.createRadialGradient(look,sy+sh/2,0,look,sy+sh/2,sh*.48);g.addColorStop(0,'#eafff9');g.addColorStop(.25,'#3effd6');g.addColorStop(.7,'#008a74');g.addColorStop(1,'rgba(0,80,70,0)');
      c.fillStyle=g;c.beginPath();c.arc(look,sy+sh/2,sh*.48,0,7);c.fill();
      c.fillStyle='#021';c.beginPath();c.arc(look,sy+sh/2,sh*.15,0,7);c.fill();
      c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.arc(look-sh*.08,sy+sh*.38,sh*.05,0,7);c.fill();
      c.fillStyle='rgba(0,0,0,.35)';for(let y=sy+((t*30)%4);y<sy+sh;y+=4)c.fillRect(sx,y,sw,1.5);
      c.restore();
      // LED口
      for(let i=0;i<7;i++){c.fillStyle=((i+Math.floor(t*8))%7)<3?'#00e8c8':'#0b3a33';c.fillRect(-R*.42+i*R*.125,by+bh-R*.2,R*.08,R*.07);}
      // スパムタグ
      c.font=`${Math.round(R*.13)}px "DotGothic16", monospace`;c.textAlign='center';c.textBaseline='middle';
      const T=['URL','無料','副業','SALE','✉'];
      for(let i=0;i<5;i++){const a=-t*.6+i*1.2566,x=Math.cos(a)*R*1.08,y=Math.sin(a)*R*.5;
        c.globalAlpha=.4+.4*(Math.sin(a)+1)/2;c.fillStyle='#071c18';c.fillRect(x-R*.17,y-R*.09,R*.34,R*.18);
        c.strokeStyle='#00e8c8';c.lineWidth=1;c.strokeRect(x-R*.17,y-R*.09,R*.34,R*.18);c.fillStyle='#9ffff0';c.fillText(T[i],x,y+1);}
      c.globalAlpha=1;
    }
    const EYES=[[-.55,-.35,.08],[.58,-.4,.07],[-.3,-.62,.06],[.3,-.66,.06],[-.7,.05,.06],[.72,0,.07],[0,-.8,.05],[-.45,.35,.05],[.5,.38,.05]];
    function drawNight(c,R,t,hpRatio){
      // 月の輪
      c.strokeStyle='rgba(200,180,255,.12)';c.lineWidth=R*.08;c.beginPath();c.arc(0,-R*.15,R*1.05,0,7);c.stroke();
      let g=c.createRadialGradient(0,0,R*.3,0,0,R*1.3);g.addColorStop(0,'rgba(138,82,212,.32)');g.addColorStop(1,'rgba(138,82,212,0)');
      c.fillStyle=g;c.beginPath();c.arc(0,0,R*1.3,0,7);c.fill();
      // 触手（雨のように垂れる）
      c.lineWidth=R*.035;
      for(let i=0;i<9;i++){const x=(i-4)*R*.18;c.strokeStyle=`rgba(90,60,150,${.25+.1*(i%3)})`;c.beginPath();c.moveTo(x,R*.4);
        for(let k=1;k<=5;k++)c.lineTo(x+Math.sin(t*1.6+i+k*.9)*R*.06,R*.4+k*R*.15);c.stroke();}
      // 不定形の体
      c.beginPath();
      for(let i=0;i<=32;i++){const a=i/32*6.283;let r=R*(.82+.07*Math.sin(3*a+t*1.3)+.05*Math.sin(5*a-t*1.7));
        const y=Math.sin(a)*r*(Math.sin(a)>0?1.08:.9);const x=Math.cos(a)*r;i?c.lineTo(x,y):c.moveTo(x,y);}
      c.closePath();
      g=c.createRadialGradient(0,-R*.1,R*.1,0,0,R*.95);g.addColorStop(0,'#2b1856');g.addColorStop(.6,'#140b2c');g.addColorStop(1,'#07050f');
      c.fillStyle=g;c.fill();c.strokeStyle='rgba(180,132,255,.45)';c.lineWidth=2;c.stroke();
      // 内側のうねり
      c.strokeStyle='rgba(138,82,212,.25)';c.lineWidth=1.5;
      for(let k=0;k<3;k++){c.beginPath();c.ellipse(Math.sin(t*.7+k)*R*.1,R*(-.1+k*.12),R*(.55-k*.12),R*(.28-k*.05),Math.sin(t*.4+k)*.3,0,7);c.stroke();}
      // 目
      const angry=hpRatio<.5;
      for(let i=0;i<EYES.length;i++){const e=EYES[i];const ph=(t*.6+i*.37)%4;const open=ph<.15?ph/.15:ph<3.7?1:ph<3.85?1-(ph-3.7)/.15:0;
        const x=e[0]*R+Math.sin(t+i)*R*.02,y=e[1]*R,s=e[2]*R;if(open<=.02)continue;
        c.fillStyle=angry?'#ff6b88':'#f2e7a0';c.shadowColor=c.fillStyle;c.shadowBlur=10;
        c.beginPath();c.ellipse(x,y,s*1.4,s*open,0,0,7);c.fill();c.shadowBlur=0;
        c.fillStyle='#0a0510';c.beginPath();c.ellipse(x+Math.sin(t*.8)*s*.3,y,s*.3,s*.85*open,0,0,7);c.fill();}
      // 大きな目
      const ph=(t*.45)%5,open=ph<4.8?1:Math.abs(ph-4.9)*10;
      for(const s of [-1,1]){const x=s*R*.24,y=-R*.12;
        c.fillStyle=angry?'#ff3b5c':'#fff3b8';c.shadowColor=c.fillStyle;c.shadowBlur=18;
        c.beginPath();c.ellipse(x,y,R*.15,R*.075*open,s*.12,0,7);c.fill();c.shadowBlur=0;
        c.fillStyle='#0a0510';c.beginPath();c.ellipse(x+Math.sin(t*.5)*R*.04,y,R*.03,R*.07*open,0,0,7);c.fill();}
      // 三日月の口
      const mo=.6+.4*Math.sin(t*1.1)+elunge*.8;
      c.fillStyle='#020104';c.beginPath();c.moveTo(-R*.38,R*.14);c.quadraticCurveTo(0,R*(.3+.22*mo),R*.38,R*.14);c.quadraticCurveTo(0,R*(.26+.05*mo),-R*.38,R*.14);c.fill();
      c.fillStyle='rgba(242,231,160,.7)';for(let i=1;i<8;i++){const x=-R*.38+i*R*.095,y=R*.14+Math.sin(i/8*3.14)*R*(.12+.02*mo);c.beginPath();c.moveTo(x-R*.02,y);c.lineTo(x,y+R*.05);c.lineTo(x+R*.02,y);c.fill();}
      // 漂う「0」
      c.font=`${Math.round(R*.16)}px "DotGothic16", monospace`;c.textAlign='center';c.textBaseline='middle';
      for(let i=0;i<4;i++){const k=(t*.15+i/4)%1;c.globalAlpha=Math.sin(k*3.14)*.35;c.fillStyle='#cbb8ff';c.fillText(i%2?'同接0':'0',Math.sin(i*2.3+t*.3)*R*.9,R*.6-k*R*1.6);}
      c.globalAlpha=1;
    }

    function drawEnemy(){
      if(!enemy.def)return;
      const a=ein*(1-edie);if(a<=.01)return;
      const c=ofx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,off.width,off.height);
      c.setTransform(dpr,0,0,dpr,offS/2*dpr,offS/2*dpr);
      const r=R*.92;
      if(enemy.def.key==='troll')drawTroll(c,r,tm);else if(enemy.def.key==='bot')drawBot(c,r,tm);else drawNight(c,r,tm,enemy.hp/enemy.max);
      if(ehit>0){c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-atop';c.fillStyle=ehit>.6?'rgba(255,255,255,.7)':'rgba(255,60,110,.45)';c.globalAlpha=Math.min(1,ehit*1.4);c.fillRect(0,0,off.width,off.height);c.globalAlpha=1;c.globalCompositeOperation='source-over';}
      // 貼り付け
      const sc=(.75+.25*ein)*(1+elunge*.12),S=offS*sc,x=ex-S/2,y=ey-S/2+elunge*R*.18;
      let gl=Math.max(ehit,edie*1.5,glitchT>0?.5:0);
      cx.globalAlpha=a;
      if(gl>.02){
        const n=10,sh=off.height/n,dh=S/n;
        for(let i=0;i<n;i++){const o=(Math.random()-.5)*gl*R*.45;cx.drawImage(off,0,i*sh,off.width,sh,x+o,y+i*dh,S,dh+.5);}
        if(gl>.3){cx.globalCompositeOperation='lighter';cx.globalAlpha=a*.25;cx.drawImage(off,x-5*gl,y,S,S);cx.globalCompositeOperation='source-over';}
      }else cx.drawImage(off,x,y,S,S);
      cx.globalAlpha=1;
    }

    // ── 毎フレーム ──
    function frame(dt){
      tm+=dt;
      ehit=Math.max(0,ehit-dt*2.6);elunge=Math.max(0,elunge-dt*3);flashP=Math.max(0,flashP-dt*2.5);flashE=Math.max(0,flashE-dt*3);
      if(edie>0&&edie<1)edie=Math.min(1,edie+dt*1.1);
      if(ein<1&&enemy.def&&edie===0)ein=Math.min(1,ein+dt*1.6);
      glitchT=Math.max(0,glitchT-dt);
      if(enemy.def&&enemy.def.key==='bot'&&Math.random()<dt*.5)glitchT=.12;
      lightning=Math.max(0,lightning-dt*2);if(Math.random()<dt*.05)lightning=1;
      if(edie>0&&edie<1&&Math.random()<.6)burst(ex+(Math.random()-.5)*R*1.4,ey+(Math.random()-.5)*R*1.2,enemy.def.col,2,60,40);

      cx.setTransform(1,0,0,1,0,0);cx.drawImage(bg,0,0);
      cx.setTransform(dpr,0,0,dpr,0,0);
      // 雨
      cx.save();cx.beginPath();cx.rect(win.x,win.y,win.w,win.h);cx.clip();
      if(lightning>0){cx.fillStyle=`rgba(200,190,255,${(lightning>.85?.25:.08)*lightning})`;cx.fillRect(win.x,win.y,win.w,win.h);}
      cx.strokeStyle='rgba(170,180,230,.28)';cx.lineWidth=1;cx.beginPath();
      for(let i=0;i<RAIN;i++){const k=i*4;let y=rain[k+1]+rain[k+3]*dt;let x=rain[k]-rain[k+3]*dt*.18;
        if(y>win.h){y=-rain[k+2];x=win.x+Math.random()*(win.w+40);}rain[k]=x;rain[k+1]=y;
        cx.moveTo(x,y);cx.lineTo(x-rain[k+2]*.18,y+rain[k+2]);}
      cx.stroke();
      cx.fillStyle='rgba(200,210,255,.2)';
      for(let i=0;i<DROPS;i++){const k=i*3;drops[k+1]+=drops[k+2]*dt;if(drops[k+1]>win.h){drops[k+1]=-4;drops[k]=win.x+Math.random()*win.w;}
        cx.beginPath();cx.arc(drops[k],drops[k+1],1.6,0,7);cx.fill();cx.fillRect(drops[k]-.5,drops[k+1]-10,1,10);}
      cx.restore();
      // モニターの光
      cx.globalAlpha=.75+.25*Math.sin(tm*7)*Math.sin(tm*2.3);cx.drawImage(glow,glowPos.x,glowPos.y,glowPos.s,glowPos.s);cx.globalAlpha=1;
      // 敵の足元の影
      if(enemy.def&&edie<1){cx.fillStyle='rgba(0,0,0,.35)';cx.beginPath();cx.ellipse(ex,ey+R*1.02,R*.7*(1-edie),R*.1,0,0,7);cx.fill();}
      drawEnemy();
      // 粒子
      for(let i=0;i<PN;i++){const p=P[i];if(!p.on)continue;p.l-=dt;if(p.l<=0){p.on=false;continue;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=120*dt;cx.globalAlpha=p.l/p.m;cx.fillStyle=p.c;cx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);}
      cx.globalAlpha=1;
      // 浮かぶ数字
      cx.textAlign='center';cx.textBaseline='middle';
      for(let i=0;i<FN;i++){const f=F[i];if(!f.on)continue;f.t+=dt;if(f.t>1.1){f.on=false;continue;}
        const k=f.t,pop=k<.12?1+(.12-k)*4:1;cx.globalAlpha=k>.75?(1.1-k)/.35:1;
        cx.font=`${Math.round(f.s*pop)}px "DotGothic16", monospace`;
        cx.lineWidth=4;cx.strokeStyle='rgba(5,4,14,.9)';cx.strokeText(f.txt,f.x,f.y-k*36);cx.fillStyle=f.c;cx.fillText(f.txt,f.x,f.y-k*36);}
      cx.globalAlpha=1;
      // 被弾フラッシュ
      if(flashP>0){const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(232,48,85,0)');g.addColorStop(1,`rgba(232,48,85,${flashP*.45})`);cx.fillStyle=g;cx.fillRect(0,0,W,H);}
      if(flashE>0){cx.fillStyle=`rgba(255,255,255,${flashE*.08})`;cx.fillRect(0,0,W,H);}
      // 揺れ
      if(shake>.3){shake*=Math.pow(.0009,dt);stage.style.transform=`translate(${(Math.random()-.5)*shake}px,${(Math.random()-.5)*shake}px)`;}
      else if(shake>0){shake=0;stage.style.transform='';}
    }

    // ── カードUI ──
    function cardText(id){
      const d=CARD[id],p=[];
      if(d.curse)return '使うと消える<br><em>手札に残すと</em>心-2';
      if(d.clearBlock)p.push('シラけ解除');
      if(d.dmg){const v=d.dmg+me.heat;p.push(`盛り上がり<b class="${me.heat?'hot':''}">${v}</b>${d.hits?'×'+d.hits:''}`);}
      if(d.block)p.push(`ガード<b>${d.block}</b>`);
      if(d.heal)p.push(`回復<b>${d.heal}</b>`);
      if(d.heat)p.push(`熱気<b>+${d.heat}</b>`);
      if(d.clearBurn)p.push('炎上を消す');
      if(d.self)p.push(`<em>心-${d.self}</em>`);
      if(d.draw)p.push(`<b>${d.draw}</b>枚引く`);
      if(d.energy)p.push(`⚡<b>+${d.energy}</b>`);
      if(d.exhaust)p.push('<em>使うと消える</em>');
      return p.join('<br>');
    }
    function makeCard(id,cls){
      const d=CARD[id],c=CAT[d.cat];
      const e=document.createElement('div');
      e.className='cards-card cat-'+d.cat+(cls?' '+cls:'');
      e.style.setProperty('--cc',c.c);e.style.setProperty('--c1',c.c1);e.style.setProperty('--cg',c.g);
      e.innerHTML=`<div class="cards-face"><span class="cards-tag">${c.label}</span><div class="cards-art">${svg('0 0 64 40',ART[id])}</div><div class="cards-name">${d.name}</div><div class="cards-txt">${cardText(id)}</div><span class="cards-key"></span></div><div class="cards-gem">${d.cost}</div>`;
      return e;
    }
    function refreshCardTexts(){
      for(let i=0;i<hand.length;i++){const h=hand[i],d=CARD[h.id];
        if(d.dmg)h.el.querySelector('.cards-txt').innerHTML=cardText(h.id);
        h.el.classList.toggle('dim',d.cost>me.energy);
        const k=h.el.querySelector('.cards-key');if(k)k.textContent=i<9?String(i+1):'';}
    }
    function slot(i,n){
      const mid=(n-1)/2,o=i-mid;
      const sp=n>1?Math.min(cw*.88,(W-46-cw)/(n-1)):0;
      return {x:W/2-cw/2+o*sp,y:handY+o*o*1.8,a:o*Math.min(4.5,20/n)};
    }
    function tf(x,y,a,s){return `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${a.toFixed(2)}deg) scale(${s})`;}
    function layoutHand(){
      const n=hand.length;
      for(let i=0;i<n;i++){
        const h=hand[i];if(drag&&drag.moved&&drag.card===h)continue;
        const s=slot(i,n);const up=h===selCard||h===hoverCard;
        h.el.classList.toggle('sel',h===selCard);h.el.classList.toggle('hov',h===hoverCard&&h!==selCard);
        h.el.style.zIndex=up?60:10+i;
        if(up){const sc=h===selCard?1.28:1.14;const x=clamp(s.x,cw*(sc-1)/2+4,W-cw*(sc+1)/2-4);h.el.style.transform=tf(x,handY-(h===selCard?18:10),0,sc);}
        else h.el.style.transform=tf(s.x,s.y,s.a,1);
      }
    }

    function drawCards(k,stagger,done){
      let i=0;
      const one=()=>{
        if(i>=k){if(done)done();return;}
        i++;
        if(!draw.length){
          if(!discard.length){if(done)done();return;}
          draw=shuffle(discard);discard=[];say('捨て札をシャッフルして山札へ');
        }
        const id=draw.pop();
        const e=makeCard(id);e.style.transition='none';
        e.style.transform=tf(PX.draw.x-cw/2,PX.draw.y-ch/2,-20,.25);
        el.hl.appendChild(e);
        const h={id,el:e};hand.push(h);bindCard(h);
        void e.offsetWidth;e.style.transition='';
        layoutHand();refreshCardTexts();renderPiles();se('btn');
        if(stagger)later(one,stagger);else one();
      };
      one();
    }

    function bindCard(h){
      const e=h.el;let rect=null;
      e.addEventListener('pointerdown',ev=>{
        ev.stopPropagation();ev.preventDefault();
        if(busy||overlay||!hand.includes(h))return;
        try{e.setPointerCapture(ev.pointerId);}catch(_){}
        rect=stage.getBoundingClientRect();
        drag={card:h,id:ev.pointerId,sx:ev.clientX,sy:ev.clientY,moved:false,type:ev.pointerType,armed:false};
      });
      e.addEventListener('pointermove',ev=>{
        if(!drag||drag.card!==h||ev.pointerId!==drag.id)return;
        const dx=ev.clientX-drag.sx,dy=ev.clientY-drag.sy;
        if(!drag.moved&&dx*dx+dy*dy>144){drag.moved=true;selCard=h;e.style.transition='none';e.style.zIndex=70;e.classList.add('sel');}
        if(drag.moved){
          const px=ev.clientX-rect.left,py=ev.clientY-rect.top;
          e.style.transform=tf(px-cw/2,py-ch*.75,dx*.03,1.12);
          drag.armed=py<stripTop+stripH*.4;e.classList.toggle('armed',drag.armed);
        }
      });
      const up=ev=>{
        if(!drag||drag.card!==h)return;
        const d=drag;drag=null;e.style.transition='';e.classList.remove('armed');
        if(ev.type==='pointercancel'){layoutHand();return;}
        if(d.moved){if(d.armed)playCard(h);else{selCard=null;layoutHand();}}
        else if(d.type==='mouse'||selCard===h)playCard(h);
        else{selCard=h;kbdIdx=hand.indexOf(h);layoutHand();se('btn');showTip(h.id);}
      };
      e.addEventListener('pointerup',up);e.addEventListener('pointercancel',up);
      e.addEventListener('pointerenter',ev=>{if(ev.pointerType==='mouse'&&!drag&&!busy){hoverCard=h;layoutHand();}});
      e.addEventListener('pointerleave',ev=>{if(ev.pointerType==='mouse'&&hoverCard===h){hoverCard=null;layoutHand();}});
    }
    stage.addEventListener('pointerdown',()=>{if(selCard&&!drag){selCard=null;layoutHand();}});

    function showTip(id){const d=CARD[id];say(`${d.name}：${cardText(id).replace(/<br>/g,'・').replace(/<[^>]+>/g,'')}　もう一度タップで使う`,true);}
    let logTimer=0;
    function say(t,keep){el.log.textContent=t;el.log.style.opacity=1;logTimer=keep?6:3.2;}

    // ── HUD ──
    let chipKeyE='',chipKeyP='';
    function chip(icon,n,col,title){return `<span class="cards-chip" style="--k:${col}" title="${title}">${svg('0 0 24 24',ICON[icon])}${n}</span>`;}
    function renderPiles(){el.drawPile.querySelector('b').textContent=draw.length;el.discPile.querySelector('b').textContent=discard.length;}
    function renderHUD(){
      if(enemy.def){
        const er=Math.max(0,enemy.hp)/enemy.max*100;
        el.efill.style.width=er+'%';el.eghost.style.width=er+'%';
        el.enum.textContent=`${Math.max(0,enemy.hp)} / ${enemy.max}`;
        el.ebar.classList.toggle('blk',enemy.block>0);
        const ke=enemy.block+'|'+enemy.str;
        if(ke!==chipKeyE){chipKeyE=ke;el.echips.innerHTML=(enemy.block?chip('block',enemy.block,'#9fb4d8','シラけ：盛り上がりを防ぐ'):'')+(enemy.str?chip('str',enemy.str,'#b484ff','勢い：攻撃+'):'');}
      }
      const pr=Math.max(0,me.hp)/me.max*100;
      el.pfill.style.width=pr+'%';el.pghost.style.width=pr+'%';
      el.pnum.textContent=`心 ${Math.max(0,me.hp)} / ${me.max}`;
      el.pbar.classList.toggle('blk',me.block>0);
      const kp=me.block+'|'+me.heat+'|'+me.burn;
      if(kp!==chipKeyP){chipKeyP=kp;el.pchips.innerHTML=(me.block?chip('guard',me.block,'#58c8ff','ガード'):'')+(me.heat?chip('heat',me.heat,'#e8b830','熱気：次の盛り上がりに上乗せ'):'')+(me.burn?chip('burn',me.burn,'#ff7a3c','炎上：ターン終了時に心が減る'):'');}
      let o='';const tot=Math.max(ENERGY,me.energy);
      for(let i=0;i<tot;i++)o+=`<div class="cards-orb${i>=me.energy?' off':i>=ENERGY?' x':''}"></div>`;
      el.orbs.innerHTML=o;el.enNum.textContent=me.energy;
      renderPiles();
      el.view.textContent=viewers;
      el.endBtn.disabled=busy||overlay;
      el.endBtn.classList.toggle('glow',!busy&&!overlay&&!hand.some(h=>CARD[h.id].cost<=me.energy&&!CARD[h.id].curse));
      el.nodes.forEach((n,i)=>{n.classList.toggle('now',i===stageIdx&&cleared<=i);n.classList.toggle('done',i<cleared);});
      mg.setScore(`第${Math.min(stageIdx+1,3)}/3戦 ・ 盛り上がり ${dmgTotal}`);
      mg.setTimer(`残り${Math.max(0,TURNS-turnsUsed)}ターン`);
      refreshCardTexts();
    }
    function intentDisplay(){
      const it=enemy.intent;if(!it){el.intent.style.opacity=0;return;}
      el.intent.style.opacity=1;
      let icon=it.k,n='',col='#e83055';
      if(it.k==='atk'||it.k==='heavy'||it.k==='chill'){n=String(it.n+enemy.str)+(it.times>1?'×'+it.times:'');}
      if(it.k==='block'){n=it.n;col='#9fb4d8';}
      if(it.k==='burn'){n='+'+it.n;col='#ff7a3c';}
      if(it.k==='curse'){n='×'+it.n;col='#e83055';}
      if(it.k==='buff'){n='+'+it.n;col='#b484ff';}
      if(it.k==='chill')col='#9fe6ff';
      el.intentB.style.setProperty('--k',col);
      el.intentIc.innerHTML=svg('0 0 24 24',ICON[icon]);el.intentN.textContent=n;el.intentLb.textContent='次：'+it.label;
    }

    // ── 戦闘処理 ──
    function damageEnemy(v){
      const b=Math.min(enemy.block,v);enemy.block-=b;const d=v-b;
      if(b)floatNum(ex+R*.4,ey-R*.5,'シラけ-'+b,'#9fb4d8',16);
      if(d>0){enemy.hp-=d;dmgTotal+=d;viewers+=Math.max(1,Math.round(d/3));
        floatNum(ex,ey-R*.3,String(d),'#fff',d>=15?32:26);ehit=1;shake=Math.max(shake,d>=15?11:6);
        burst(ex,ey,'#fff',8,180);burst(ex,ey,enemy.def.col,10,140);}
      else{ehit=.3;}
    }
    function hurtMe(v,silent){
      const b=Math.min(me.block,v);me.block-=b;const d=v-b;
      if(b)floatNum(PX.hp.x+40,PX.hp.y-14,'ガード-'+b,'#58c8ff',16);
      if(d>0){me.hp-=d;floatNum(PX.hp.x,PX.hp.y-10,'-'+d,'#ff4d6d',24);flashP=1;shake=Math.max(shake,d>=10?12:7);if(!silent)se('noise');}
      else if(!silent)se('repair');
    }
    function healMe(v){const before=me.hp;me.hp=Math.min(me.max,me.hp+v);const d=me.hp-before;floatNum(PX.hp.x,PX.hp.y-10,'+'+d,'#44ee88',22);burst(PX.hp.x,PX.hp.y,'#44ee88',8,80,60);}

    function playCard(h){
      if(busy||overlay||mg._ended)return;
      const d=CARD[h.id];
      if(d.cost>me.energy){
        h.el.classList.remove('nope');void h.el.offsetWidth;h.el.classList.add('nope');
        say('⚡が足りない。ターン終了で回復する');se('back');selCard=null;layoutHand();return;
      }
      busy=true;me.energy-=d.cost;
      hand.splice(hand.indexOf(h),1);selCard=null;hoverCard=null;kbdIdx=-1;
      const e=h.el,from=e.style.transform;e.style.transition='none';e.style.zIndex=90;e.classList.remove('sel','hov','dim');
      const atk=!!(d.dmg||d.clearBlock),tx=atk?ex-cw/2:W/2-cw/2,ty=atk?ey-ch*.55:stripTop-ch-6;
      const mid=tf(tx,ty,0,1.08);
      const gone=d.exhaust||d.curse;
      const end=gone?tf(tx,ty-30,0,1.35):tf(PX.disc.x-cw/2,PX.disc.y-ch/2,24,.22);
      const an=e.animate([{transform:from},{transform:mid,offset:.4},{transform:mid,offset:.55,filter:'brightness(1.6)'},{transform:end,opacity:gone?0:.3,filter:gone?'brightness(3) blur(2px)':'none'}],{duration:gone?620:700,easing:'cubic-bezier(.35,.7,.3,1)'});
      an.onfinish=()=>e.remove();
      e.style.transform=end;e.style.opacity='0';
      layoutHand();renderHUD();se(d.curse?'warn':'decide');
      later(()=>{
        const extra=resolveCard(h.id);
        if(!gone)discard.push(h.id);
        renderHUD();
        if(extra)later(after,extra+60);else after();
      },290);
      function after(){
        renderHUD();
        if(enemy.hp<=0){enemyDefeated();return;}
        if(me.hp<=0){defeat();return;}
        if(d.draw)drawCards(d.draw,90,()=>{busy=false;renderHUD();});
        else{busy=false;renderHUD();}
      }
    }
    function resolveCard(id){
      const d=CARD[id],msg=[];let extra=0;
      if(d.curse){say('🔥 火種を処理した。');burst(W/2,stripTop-ch*.4,'#ff7a3c',14,120,40);return 0;}
      if(d.clearBlock&&enemy.block){floatNum(ex,ey-R*.6,'シラけ解除','#5ef0c8',18);enemy.block=0;msg.push('シラけを消した');}
      if(d.dmg){
        const per=d.dmg+me.heat,n=d.hits||1;const heatUsed=me.heat;me.heat=0;
        damageEnemy(per);
        for(let i=1;i<n;i++)later(()=>{if(enemy.hp>0){damageEnemy(per);renderHUD();}},i*150);
        extra=(n-1)*150;
        msg.push(`盛り上がり${per}${n>1?'×'+n:''}`+(heatUsed?`（熱気+${heatUsed}）`:''));
        se(d.cat==='kaidan'?'ghost':d.cat==='song'?'live':'comment');
      }
      if(d.block){me.block+=d.block;floatNum(PX.hp.x+40,PX.hp.y-14,'ガード+'+d.block,'#58c8ff',18);msg.push('ガード'+d.block);if(!d.dmg)se('tool');}
      if(d.heal){healMe(d.heal);msg.push('回復'+d.heal);if(!d.dmg)se('notif');}
      if(d.heat){me.heat+=d.heat;floatNum(PX.hp.x-60,PX.hp.y-14,'熱気+'+d.heat,'#e8b830',18);msg.push('熱気+'+d.heat);}
      if(d.clearBurn&&me.burn){me.burn=0;msg.push('炎上が鎮まった');}
      if(d.self){me.hp-=d.self;floatNum(PX.hp.x,PX.hp.y-10,'-'+d.self,'#ff4d6d',20);msg.push('心-'+d.self);}
      if(d.energy){me.energy+=d.energy;burst(PX.en.x,PX.en.y,'#e8b830',10,90,30);msg.push('⚡+'+d.energy);}
      if(d.draw)msg.push(d.draw+'枚引く');
      say(`${d.name}：${msg.join('・')}`);
      return extra;
    }
    let busy2=false;

    function endTurn(){
      if(busy||overlay||mg._ended)return;
      busy=true;selCard=null;hoverCard=null;kbdIdx=-1;se('decide');
      let burns=0;
      hand.forEach((h,i)=>{
        const e=h.el,from=e.style.transform;e.style.transition='none';
        if(h.id==='burn'){burns++;const a=e.animate([{transform:from},{transform:from.replace(/scale\([^)]*\)/,'scale(1.3)'),opacity:0,filter:'brightness(3)'}],{duration:450,easing:'ease-out'});a.onfinish=()=>e.remove();e.style.opacity=0;}
        else{discard.push(h.id);const end=tf(PX.disc.x-cw/2,PX.disc.y-ch/2,30,.22);const a=e.animate([{transform:from},{transform:end,opacity:.2}],{duration:380,delay:i*40,easing:'ease-in'});a.onfinish=()=>e.remove();e.style.transform=end;e.style.opacity=0;}
      });
      hand=[];
      let msg='';
      if(burns){hurtMe(burns*2);msg+=`火種が燃えた 心-${burns*2}　`;}
      if(me.burn>0){const b=me.burn;me.hp-=b;floatNum(PX.hp.x-30,PX.hp.y-10,'炎上-'+b,'#ff7a3c',20);burst(PX.hp.x,PX.hp.y,'#ff7a3c',10,70,50);me.burn--;msg+=`炎上で心-${b}`;flashP=.6;}
      if(msg)say(msg);
      renderHUD();
      if(me.hp<=0){later(defeat,500);return;}
      later(enemyTurn,msg?650:350);
    }
    function enemyTurn(){
      const it=enemy.intent;enemy.block=0;elunge=1;
      el.intent.style.opacity=0;
      say(`${enemy.def.name}：${it.label}`);
      let wait=500;
      const str=enemy.str;
      if(it.k==='atk'||it.k==='heavy'||it.k==='chill'){
        if(it.k==='chill'&&me.heat){me.heat=0;floatNum(PX.hp.x-60,PX.hp.y-14,'熱気が冷めた','#9fe6ff',16);}
        for(let i=0;i<it.times;i++)later(()=>{elunge=1;hurtMe(it.n+str);renderHUD();},i*240);
        wait=it.times*240+420;
        if(it.k==='heavy'){shake=16;se('warn');}
      }else if(it.k==='block'){enemy.block+=it.n;floatNum(ex,ey-R*.6,'シラけ+'+it.n,'#9fb4d8',20);se('machine');}
      else if(it.k==='burn'){me.burn+=it.n;floatNum(PX.hp.x-30,PX.hp.y-14,'炎上+'+it.n,'#ff7a3c',22);burst(PX.hp.x,PX.hp.y,'#ff7a3c',14,90,40);se('warn');}
      else if(it.k==='buff'){enemy.str+=it.n;enemy.block+=it.block||0;floatNum(ex,ey-R*.6,'勢い+'+it.n,'#b484ff',20);burst(ex,ey,'#b484ff',14,120);se('machine');}
      else if(it.k==='curse'){
        for(let i=0;i<it.n;i++)later(()=>{
          const e=makeCard('burn');e.style.transition='none';el.hl.appendChild(e);
          const a=e.animate([{transform:tf(ex-cw/2,ey-ch/2,0,.4),opacity:0},{transform:tf(ex-cw/2+(i?30:-30),ey,i?10:-10,.8),opacity:1,offset:.35},{transform:tf(PX.disc.x-cw/2,PX.disc.y-ch/2,40,.22),opacity:.4}],{duration:700,easing:'ease-in-out'});
          e.style.opacity=0;a.onfinish=()=>{e.remove();discard.push('burn');renderPiles();};
        },i*160);
        if(it.burn){me.burn+=it.burn;floatNum(PX.hp.x-30,PX.hp.y-14,'炎上+'+it.burn,'#ff7a3c',20);}
        se('warn');wait=900;
      }
      renderHUD();
      later(()=>{
        renderHUD();
        if(me.hp<=0){defeat();return;}
        turnsUsed++;
        if(turnsUsed>=TURNS){timeUp();return;}
        beginTurn();
      },wait);
    }
    function pickIntent(){
      const d=enemy.def;enemy.t++;
      if(d.boss&&enemy.t%4===0){enemy.intent=d.heavy;return;}
      if(d.boss&&enemy.hp<enemy.max*.5&&Math.random()<.3&&enemy.lastMove!==99){enemy.intent=d.chill;enemy.lastMove=99;return;}
      let i;
      if(enemy.t===1)i=d.first;
      else{do{i=Math.floor(Math.random()*d.moves.length);}while(i===enemy.lastMove);}
      enemy.lastMove=i;enemy.intent=d.moves[i];
    }
    function beginTurn(){
      me.block=0;me.energy=ENERGY;
      pickIntent();intentDisplay();
      renderHUD();
      drawCards(HAND,110,()=>{busy=false;renderHUD();if(turnsUsed===TURNS-1)say('⏰ 配信枠ラストターン！');});
    }

    function startEncounter(i){
      stageIdx=i;const d=ENEMIES[i];
      enemy.def=d;enemy.max=enemy.hp=d.hp;enemy.block=0;enemy.str=0;enemy.t=0;enemy.lastMove=-1;enemy.intent=null;
      ein=0;edie=0;chipKeyE='x';
      el.ename.innerHTML=(d.boss?'<small>BOSS</small>':'')+d.name;
      draw=shuffle(deck.slice());discard=[];me.block=0;me.heat=0;
      intentDisplay();renderHUD();
      banner(d.boss?'FINAL':'ROUND '+(i+1),d.name,d.boss?'静かすぎる夜が、配信ごと飲み込もうとしている。':i===0?'コメント欄に、嫌な気配。':'同じ文面が、画面を埋め尽くしていく。',d.col,1500,()=>{beginTurn();});
      se(d.boss?'ghost':'warn');
    }
    function banner(k,t,s,col,ms,done){
      overlay=true;phase='banner';
      el.ov.innerHTML=`<div style="--k:${col}"><div class="cards-banner-k">${k}</div><div class="cards-banner">${t}</div><div class="cards-banner-s">${s}</div></div>`;
      el.ov.classList.add('on');el.ov.style.background='rgba(4,3,10,.45)';
      later(()=>{el.ov.classList.remove('on');el.ov.style.background='';overlay=false;phase='play';if(done)done();},ms);
    }
    function enemyDefeated(){
      if(busy2)return;busy2=true;busy=true;
      edie=.01;el.intent.style.opacity=0;enemy.intent=null;cleared=stageIdx+1;
      shake=14;flashE=1;se('rank');
      burst(ex,ey,enemy.def.col,40,240);burst(ex,ey,'#fff',20,200);
      say(`${enemy.def.name}を追い払った！`);
      // 手札は捨て札へ
      hand.forEach(h=>{const e=h.el;const a=e.animate([{transform:e.style.transform},{transform:tf(PX.disc.x-cw/2,PX.disc.y-ch/2,30,.22),opacity:.2}],{duration:380,easing:'ease-in'});a.onfinish=()=>e.remove();e.style.opacity=0;});
      hand=[];renderHUD();
      if(enemy.def.boss){
        later(()=>{banner('CLEAR','配信大成功！','コメントが止まらない。夜が明けていく。','#e8b830',1700,()=>mg.end('win'));se('ach');},1100);
        return;
      }
      later(showReward,1200);
    }
    function showReward(){
      overlay=true;phase='reward';
      const healAmt=Math.min(8,me.max-me.hp);me.hp+=healAmt;me.burn=0;
      const pool=shuffle(REWARDS.slice()).slice(0,3);
      el.ov.innerHTML=`<div class="cards-rw-t">コメント欄が温まってきた</div><div class="cards-rw-s">ひと息ついた：心<b>+${healAmt}</b>・炎上リセット<br>新しい話題をひとつ、デッキに加える</div><div class="cards-rw"></div><button class="cards-skip">選ばずに水を飲む（心+5）</button>`;
      const box=el.ov.querySelector('.cards-rw');
      pool.forEach((id,i)=>{const c=makeCard(id,'static');c.querySelector('.cards-key').textContent=i+1;c.addEventListener('click',()=>pickReward(id,c));box.appendChild(c);});
      el.ov.querySelector('.cards-skip').addEventListener('click',()=>pickReward(null));
      el.ov.classList.add('on');renderHUD();se('notif');
      rewardPool=pool;
    }
    let rewardPool=null;
    function pickReward(id,node){
      if(phase!=='reward')return;phase='picked';rewardPool=null;
      if(id){deck.push(id);se('ach');if(node){node.style.transition='transform .35s,opacity .35s';node.style.transform='translateY(-20px) scale(1.12)';node.style.boxShadow='0 0 30px var(--cc)';}say(`「${CARD[id].name}」をデッキに加えた`);}
      else{const v=Math.min(5,me.max-me.hp);me.hp+=v;se('btn');say(`水を飲んだ。心+${v}`);}
      later(()=>{el.ov.classList.remove('on');overlay=false;busy2=false;renderHUD();startEncounter(stageIdx+1);},id?500:200);
    }
    function defeat(){
      if(phase==='end')return;busy=true;phase='end';
      se('warn');shake=10;
      banner('LOST','心が折れた…','言葉が、もう出てこない。','#e83055',1500,()=>mg.end('lose'));
    }
    function timeUp(){
      if(phase==='end')return;busy=true;phase='end';
      banner('TIME UP','配信枠終了','まだ夜は、静かなままだ。','#e8b830',1500,()=>mg.end('timeup'));
    }

    // ── 遊び方 ──
    function howTo(){
      overlay=true;phase='how';
      el.ov.innerHTML=`<div class="cards-how"><div class="cards-how-t">配信トークバトル</div>
<div class="cards-how-s">今夜の配信に、3つの「夜」がやってくる。<br>話題カードで盛り上げて、追い払え。</div>
<ul><li>カードを<b>タップ→もう一度タップ</b>（上へスワイプでも可）で使う</li>
<li>左上の宝石が必要な<b>⚡</b>。毎ターン3つ回復する</li>
<li>敵の頭上は<b>次の行動</b>。攻撃が来るならガードを</li>
<li><b>熱気</b>は次の盛り上がりに上乗せ。<b>炎上</b>はターン毎に心が減る</li>
<li>全部で${TURNS}ターン。勝つたびに新しいカードを1枚選べる</li></ul>
<div class="cards-how-go">タップで配信開始</div></div>`;
      el.ov.classList.add('on');
      const go=()=>{if(phase!=='how')return;phase='play';el.ov.classList.remove('on');overlay=false;se('micOn');startEncounter(0);};
      el.ov.addEventListener('pointerdown',function f(){el.ov.removeEventListener('pointerdown',f);go();});
      later(go,6000);
      howGo=go;
    }
    let howGo=null;

    // ── 入力 ──
    el.endBtn.addEventListener('click',e=>{e.stopPropagation();endTurn();});
    el.endBtn.addEventListener('pointerdown',e=>e.stopPropagation());
    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      const k=e.key;
      if(phase==='how'&&(k===' '||k==='Enter')){e.preventDefault();howGo&&howGo();return;}
      if(phase==='reward'&&rewardPool){
        if(k>='1'&&k<='3'){const i=+k-1;pickReward(rewardPool[i],el.ov.querySelectorAll('.cards-rw .cards-card')[i]);}
        else if(k==='s'||k==='S'||k==='0')pickReward(null);
        return;
      }
      if(busy||overlay)return;
      if(k>='1'&&k<='9'){const h=hand[+k-1];if(h)playCard(h);return;}
      if(k==='ArrowLeft'||k==='ArrowRight'){e.preventDefault();if(!hand.length)return;kbdIdx=kbdIdx<0?0:(kbdIdx+(k==='ArrowLeft'?-1:1)+hand.length)%hand.length;selCard=hand[kbdIdx];layoutHand();showTip(selCard.id);return;}
      if((k==='ArrowUp'||k==='Enter')&&selCard){e.preventDefault();playCard(selCard);return;}
      if(k===' '||k==='e'||k==='E'||k==='Enter'){e.preventDefault();endTurn();}
    });

    // ── 起動 ──
    let ro=null;
    if(window.ResizeObserver){ro=new ResizeObserver(()=>{if(mg._ended){ro.disconnect();return;}layout();});ro.observe(body);}
    layout();renderHUD();
    mg.loop(dt=>{
      frame(dt);
      if(logTimer>0){logTimer-=dt;if(logTimer<=0)el.log.style.opacity=0;}
    });
    say('配信開始。コメント欄はまだ静かだ。');
    howTo();

    return {result(reason){
      if(ro)ro.disconnect();
      const win=reason==='win',lose=reason==='lose',quit=reason==='quit';
      const left=Math.max(0,TURNS-turnsUsed);
      let fx,time=80;
      if(win)fx={followers:15+left*2,streamPop:8,money:6000,mental:5,fatigue:8};
      else if(lose)fx={mental:-8,flame:1,fatigue:10,followers:cleared*3};
      else if(dmgTotal>0)fx={followers:Math.min(12,Math.floor(dmgTotal/10)),streamPop:Math.min(3,1+cleared),money:Math.min(3000,1000+cleared*1000),fatigue:8};
      else{fx={fatigue:3};time=20;}
      if(quit&&!win)time=Math.min(80,20+turnsUsed*6);
      const names=['—','荒らしアカウント','スパムBot','過疎の夜'];
      return {
        title:win?'🃏 配信大成功！':lose?'🃏 心が折れた':quit?'🃏 配信を切り上げた':'🃏 なんとか配信を終えた',
        summary:`撃退 <span class="${cleared?'up':'down'}">${cleared}/3</span>（${cleared?names[cleared]+'まで':'なし'}）　使ったターン ${turnsUsed}/${TURNS}　盛り上がり合計 <span class="up">${dmgTotal}</span>`,
        fx,time,sp:win?2:cleared>=2?1:0,
        after(){if(win){gs.rankPts+=10;checkRankUp();}},
        log:win?'トークバトルで過疎の夜を盛り上げた。':cleared?`トークバトルで${names[cleared]}まで撃退した。`:'静かな夜に配信を続けた。',
        cutin:win?['win','……今夜は、みんながいたわね。']:lose?['tired','……今日は、言葉が出てこない。']:null,
      };
    }};
  },
});
