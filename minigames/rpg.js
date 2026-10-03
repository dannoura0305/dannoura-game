// ══════════════════════════════════════════════════════════
// ストーリーRPG「壇ノ浦夢譚」
// 配信を終えて眠ったあと、だんのうらは夜の壇ノ浦の海の底──沈んだ都の夢を見る。
// 少女の霊「ミナモ」に導かれ、現実で失いかけている五つの灯
// （声・手・約束・眠り・名前）を、一晩に一章ずつ取り戻していく。
//
// 遊び方は16ビット時代の見下ろし型アドベンチャー：
//   ・各章は2〜3枚の手作りマップ。だんのうらとミナモが隊列で歩き、調べ、宝箱を開け、灯籠で休む。
//   ・敵はマップ上に見えている（ランダム遭遇なし）。触れるとその場で戦闘になる。
//   ・戦闘はアクティブタイム制。ゲージが満ちた仲間から行動し、二人とも満ちていれば連携技も使える。
//
// 進行は gs.rpg に保存する（JSON化できる素のオブジェクト）。
//   {v:2, cleared(クリア済み章数), lastDay(最後にクリアした日), lv, exp,
//    items:{shell,ramune,pearl}, flags:{選択の記録}, endings:{見たエンド}, ending(正史のエンド),
//    ranks:{章:評価}, rating, rec:{wins,losses}, opt:{speed, atb('wait'|'active'|null=難しさに合わせる)}}
//   v1（旧・紙芝居版）のデータはそのまま読み込める（足りない項目を補うだけ）。
// 章Nは、章N-1をクリアした翌日以降に遊べる。全章クリア後は報酬なしで見返せる。
// ══════════════════════════════════════════════════════════
addMinigameStyle('rpg',`
.mg-rpg{padding:0;}
.rpg-root{position:absolute;inset:0;overflow:hidden;background:#02040b;color:var(--tx-b);font-family:var(--serif);-webkit-tap-highlight-color:transparent;touch-action:none;user-select:none;-webkit-user-select:none;}
.rpg-cv{position:absolute;left:0;top:0;display:block;image-rendering:pixelated;}
.rpg-ui{position:absolute;inset:0;pointer-events:none;}
.rpg-ui>*{pointer-events:auto;}
.rpg-ui>.rpg-pass{pointer-events:none;}
.rpg-hide{display:none!important;}
@keyframes rpgUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes rpgBlink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes rpgGlow{0%,100%{text-shadow:0 0 14px rgba(0,232,200,.55),0 0 36px rgba(138,82,212,.45)}50%{text-shadow:0 0 22px rgba(0,232,200,.85),0 0 50px rgba(138,82,212,.7)}}
@keyframes rpgNudge{0%,100%{margin-left:0}50%{margin-left:3px}}
@keyframes rpgLoc{0%{opacity:0;transform:translateX(-12px)}12%,80%{opacity:1;transform:none}100%{opacity:0}}
/* SFC風ウィンドウ：二重線の枠＋深い夜色のグラデーション */
.rpg-win,.rpg-box,.rpg-bwin,.rpg-bcmd,.rpg-bmsg,.rpg-fwin{background:linear-gradient(180deg,rgba(28,24,84,.95) 0%,rgba(14,11,48,.96) 55%,rgba(7,6,26,.97) 100%);border:2px solid #e6e0ff;border-radius:6px;box-shadow:0 0 0 2px #120c34,inset 0 0 0 2px rgba(138,82,212,.75),0 6px 18px rgba(0,0,0,.55);}
.rpg-box{position:absolute;left:8px;right:8px;bottom:8px;min-height:120px;display:flex;gap:10px;padding:15px 12px 16px;cursor:pointer;animation:rpgUp .18s ease;}
.rpg-box.top{bottom:auto;top:8px;}
.rpg-plate{position:absolute;left:12px;top:-15px;padding:3px 12px 2px;font-family:var(--dot);font-size:.74rem;letter-spacing:.14em;color:#fff;background:linear-gradient(180deg,#3a2c8a,#1c1450);border:2px solid #e6e0ff;border-radius:4px;box-shadow:0 0 0 2px #120c34;white-space:nowrap;}
.rpg-por{flex:none;width:76px;height:76px;border-radius:4px;overflow:hidden;border:2px solid #cfc6f5;box-shadow:0 0 0 1px #120c34,0 0 12px rgba(138,82,212,.35);background:#0b0a1e;}
.rpg-por canvas{display:block;width:100%;height:100%;}
.rpg-tx{flex:1;min-width:0;}
.rpg-text{font-size:.9rem;line-height:1.8;color:#f2eeff;white-space:pre-wrap;word-break:break-word;min-height:3.6em;text-shadow:1px 1px 0 #0a0620;}
.rpg-box.nar .rpg-text{color:#cfc6ee;}
.rpg-box.mina .rpg-plate{background:linear-gradient(180deg,#126a7a,#08343e);color:#cffcff;}
.rpg-box.kid .rpg-plate{background:linear-gradient(180deg,#8a6a14,#4a3606);color:#fff3c8;}
.rpg-box.npc .rpg-plate{background:linear-gradient(180deg,#2c4a6a,#10203a);color:#d8ecff;}
.rpg-box.sea .rpg-plate,.rpg-box.foe .rpg-plate{background:linear-gradient(180deg,#8a1630,#40061a);color:#ffd8e0;}
.rpg-box.sea .rpg-text{color:#ffc4d2;font-style:italic;}
.rpg-box.com .rpg-text{font-family:var(--mono);font-size:.88rem;color:#d8ccff;}
.rpg-box.com .rpg-plate{font-family:var(--mono);background:linear-gradient(180deg,#5a4a10,#2a2006);color:#ffe7a8;}
.rpg-box.com .rpg-plate::before{content:'💬 ';}
.rpg-box.ghost .rpg-text{color:#ff9fb4;text-shadow:0 0 6px rgba(232,48,85,.7);}
.rpg-box.ghost .rpg-plate{background:linear-gradient(180deg,#3a0614,#100006);color:#ff9fb4;}
.rpg-next{position:absolute;right:12px;bottom:4px;font-size:.72rem;color:#fff;animation:rpgBlink .9s infinite;}
/* 選択肢 */
.rpg-choices{position:absolute;left:12px;right:12px;bottom:150px;display:flex;flex-direction:column;gap:8px;animation:rpgUp .25s ease;}
.rpg-ch{position:relative;min-height:50px;padding:8px 14px 8px 30px;text-align:left;background:linear-gradient(180deg,rgba(28,24,84,.96),rgba(9,7,30,.97));border:2px solid #cfc6f5;box-shadow:0 0 0 2px #120c34,inset 0 0 0 1px rgba(138,82,212,.7);border-radius:6px;color:var(--tx-b);font-family:var(--serif);font-size:.86rem;line-height:1.5;cursor:pointer;touch-action:manipulation;}
.rpg-ch small{display:block;font-size:.66rem;color:var(--tx-d);margin-top:2px;}
.rpg-ch.sel,.rpg-ch:hover{border-color:var(--cy);box-shadow:0 0 14px rgba(0,232,200,.28);}
.rpg-ch.sel::before{content:'▶';position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#fff;animation:rpgNudge .6s ease-in-out infinite;}
/* 場所の名前 */
.rpg-loc{position:absolute;left:10px;top:10px;padding:5px 14px 4px;font-family:var(--dot);font-size:.78rem;letter-spacing:.16em;color:#fff;background:linear-gradient(90deg,rgba(14,11,48,.92),rgba(14,11,48,0));border-left:3px solid var(--cy);animation:rpgLoc 3.2s ease forwards;pointer-events:none;white-space:nowrap;}
/* 仮想パッド */
.rpg-pad{position:absolute;left:10px;bottom:12px;width:132px;height:132px;border-radius:50%;background:radial-gradient(circle,rgba(40,34,110,.35) 0,rgba(14,11,48,.55) 70%);border:2px solid rgba(230,224,255,.35);touch-action:none;}
.rpg-pad::before{content:'';position:absolute;inset:16px;border-radius:50%;border:1px dashed rgba(230,224,255,.18);}
.rpg-knob{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#6a5ad8,#2a2070 70%);border:2px solid #e6e0ff;box-shadow:0 0 0 2px #120c34,0 4px 10px rgba(0,0,0,.5);pointer-events:none;}
.rpg-abtn{position:absolute;width:64px;height:64px;border-radius:50%;font-family:var(--dot);font-size:1.15rem;color:#fff;background:radial-gradient(circle at 40% 35%,#7a5ae0,#2a1a78 72%);border:2px solid #e6e0ff;box-shadow:0 0 0 2px #120c34,0 4px 10px rgba(0,0,0,.5);touch-action:none;display:flex;align-items:center;justify-content:center;flex-direction:column;line-height:1;}
.rpg-abtn small{font-size:.5rem;letter-spacing:.05em;margin-top:2px;color:#d8d0ff;}
.rpg-abtn.on{transform:scale(.92);filter:brightness(1.3);}
.rpg-abtn.a{right:14px;bottom:52px;}
.rpg-abtn.b{right:86px;bottom:14px;width:54px;height:54px;font-size:1rem;background:radial-gradient(circle at 40% 35%,#5a4a8a,#1c1446 72%);}
.rpg-menubtn{position:absolute;right:8px;top:8px;width:44px;height:40px;border-radius:6px;font-family:var(--dot);font-size:.7rem;color:#fff;background:linear-gradient(180deg,rgba(28,24,84,.9),rgba(9,7,30,.92));border:2px solid #cfc6f5;box-shadow:0 0 0 2px #120c34;}
.rpg-keyhint{position:absolute;right:58px;top:12px;font-family:var(--mono);font-size:.56rem;color:rgba(230,224,255,.6);letter-spacing:.04em;pointer-events:none;text-align:right;line-height:1.5;}
/* フィールドメニュー */
.rpg-fwin{position:absolute;right:8px;top:54px;width:230px;padding:10px;display:flex;flex-direction:column;gap:6px;animation:rpgUp .18s ease;}
.rpg-fwin .ttl{font-family:var(--dot);font-size:.72rem;color:#cfc6f5;letter-spacing:.12em;}
.rpg-fwin .st{font-family:var(--mono);font-size:.64rem;color:var(--tx);line-height:1.6;}
.rpg-fb{position:relative;min-height:40px;padding:6px 10px 6px 22px;text-align:left;background:rgba(10,8,34,.6);border:1px solid rgba(207,198,245,.45);border-radius:4px;color:var(--tx-b);font-family:var(--dot);font-size:.78rem;cursor:pointer;}
.rpg-fb small{display:block;font-size:.58rem;color:var(--tx-d);}
.rpg-fb.sel{border-color:#fff;box-shadow:0 0 10px rgba(0,232,200,.35);}
.rpg-fb.sel::before{content:'▶';position:absolute;left:6px;top:50%;transform:translateY(-50%);font-size:.6rem;color:#fff;}
.rpg-fb:disabled{opacity:.35;}
/* 戦闘 */
.rpg-bwin{position:absolute;left:6px;right:6px;bottom:6px;padding:7px 8px 6px;display:flex;flex-direction:column;gap:4px;}
.rpg-prow{display:grid;grid-template-columns:5.6em 1fr 1fr 1.25fr;gap:6px;align-items:center;font-family:var(--dot);font-size:.74rem;color:#f2eeff;padding:2px 4px;border-radius:3px;}
.rpg-prow.act{background:rgba(0,232,200,.13);box-shadow:inset 0 0 0 1px rgba(0,232,200,.5);}
.rpg-prow.ko{color:#8a7aa8;}
.rpg-prow .nm{white-space:nowrap;overflow:hidden;}
.rpg-prow .v{font-family:var(--mono);font-size:.66rem;white-space:nowrap;}
.rpg-prow .v b{font-weight:normal;color:#fff;font-size:.74rem;}
.rpg-prow .v.low b{color:#ff8098;}
.rpg-prow .st{font-size:.56rem;color:var(--gd);}
.rpg-atb{height:8px;background:#120e2a;border:1px solid #6a5ab0;border-radius:2px;overflow:hidden;}
.rpg-atb>div{height:100%;width:0;background:linear-gradient(90deg,#3a66d8,#8ab0ff);}
.rpg-atb.full>div{background:linear-gradient(90deg,#e8b830,#fff2a0);animation:rpgBlink .7s infinite;}
.rpg-bcmd{position:absolute;right:6px;width:min(300px,78%);padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;animation:rpgUp .14s ease;max-height:60%;overflow-y:auto;}
.rpg-bcmd .hd{grid-column:1/-1;font-family:var(--dot);font-size:.66rem;color:#7affe6;letter-spacing:.1em;padding:0 4px;}
.rpg-bc{position:relative;min-height:36px;padding:3px 6px 3px 20px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:0;line-height:1.25;text-align:left;background:rgba(10,8,34,.55);border:1px solid rgba(207,198,245,.4);border-radius:4px;color:#f2eeff;font-family:var(--dot);font-size:.8rem;cursor:pointer;touch-action:manipulation;}
.rpg-bc small{font-family:var(--mono);font-size:.58rem;color:#b6acd8;white-space:nowrap;}
.rpg-bc.dual{border-color:#e8b830;color:#ffe7a8;background:rgba(60,40,10,.45);}
.rpg-bc.sel{border-color:#fff;box-shadow:0 0 10px rgba(0,232,200,.4),inset 0 0 8px rgba(0,232,200,.15);}
.rpg-bc.sel::before{content:'▶';position:absolute;left:6px;top:50%;transform:translateY(-50%);font-size:.6rem;color:#fff;animation:rpgNudge .6s ease-in-out infinite;}
.rpg-bc:disabled{opacity:.33;cursor:default;}
.rpg-bmsg{position:absolute;left:50%;top:8px;transform:translateX(-50%);max-width:94%;padding:5px 14px;font-family:var(--dot);font-size:.8rem;color:#fff;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;}
.rpg-bmsg.desc{font-family:var(--serif);font-size:.72rem;color:#d8d0ff;white-space:normal;text-align:center;}
.rpg-bmsg b{color:#ffe066;font-weight:normal;}
.rpg-bmsg b.dm{color:#ff8098;}
.rpg-bmode{position:absolute;right:10px;top:12px;font-family:var(--mono);font-size:.56rem;color:rgba(230,224,255,.55);pointer-events:none;letter-spacing:.06em;}
/* タイトル・章カード・エンド */
.rpg-menu{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:11px;padding:18px 18px 22px;text-align:center;overflow-y:auto;}
.rpg-logo{font-family:var(--serif);font-weight:700;font-size:2.15rem;letter-spacing:.32em;padding-left:.32em;color:#eefcff;animation:rpgGlow 4s ease-in-out infinite;}
.rpg-sub{font-size:.72rem;letter-spacing:.18em;color:var(--tx);}
.rpg-eye{font-family:var(--mono);font-size:.58rem;letter-spacing:.4em;color:var(--cy);opacity:.7;}
.rpg-lights{display:flex;gap:12px;margin:6px 0 2px;}
.rpg-lt{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;font-family:var(--dot);font-size:.6rem;color:var(--tx-d);}
.rpg-lt b{width:22px;height:22px;border-radius:50%;background:#16122a;border:1px solid #3a2f5a;}
.rpg-lt.on{color:#ffe7a8;}
.rpg-lt.on b{background:radial-gradient(circle,#fff 0,#ffd66a 38%,rgba(232,184,48,.25) 72%);border-color:rgba(232,184,48,.8);box-shadow:0 0 14px rgba(232,184,48,.75);}
.rpg-lt em{position:absolute;top:-6px;right:-9px;font-style:normal;font-family:var(--mono);font-size:.55rem;color:#fff;background:#8a52d4;border-radius:3px;padding:0 3px;}
.rpg-info{font-family:var(--mono);font-size:.64rem;color:var(--tx);letter-spacing:.05em;line-height:1.7;}
.rpg-note{font-size:.7rem;color:#b6acd8;line-height:1.7;max-width:320px;}
.rpg-btns{display:flex;flex-direction:column;gap:8px;width:100%;max-width:310px;margin-top:4px;}
.rpg-btn{position:relative;min-height:48px;padding:8px 14px 8px 24px;background:linear-gradient(180deg,rgba(28,24,84,.95),rgba(9,7,30,.96));border:2px solid #cfc6f5;box-shadow:0 0 0 2px #120c34,inset 0 0 0 1px rgba(138,82,212,.7);border-radius:6px;color:var(--tx-b);font-family:var(--dot);font-size:.84rem;letter-spacing:.08em;cursor:pointer;touch-action:manipulation;}
.rpg-btn small{display:block;font-family:var(--serif);font-size:.62rem;color:var(--tx-d);letter-spacing:.02em;margin-top:2px;}
.rpg-btn.main{border-color:var(--cy);color:#dffffa;box-shadow:0 0 16px rgba(0,232,200,.18);}
.rpg-btn.sel{border-color:#fff;box-shadow:0 0 0 2px #120c34,0 0 16px rgba(0,232,200,.4);}
.rpg-btn.sel::before{content:'▶';position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:.7rem;color:#fff;animation:rpgNudge .6s ease-in-out infinite;}
.rpg-btn:disabled{opacity:.4;cursor:default;}
.rpg-btn.mini{min-height:42px;font-size:.74rem;}
.rpg-grid2{display:grid;grid-template-columns:1fr 1fr;gap:7px;}
.rpg-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px;text-align:center;background:radial-gradient(ellipse at center,rgba(8,14,34,.9),rgba(1,2,8,.97));opacity:0;transition:opacity .8s ease;pointer-events:none;}
.rpg-card.on{opacity:1;pointer-events:auto;}
.rpg-card .c1{font-family:var(--dot);font-size:.8rem;letter-spacing:.55em;padding-left:.55em;color:var(--cy);}
.rpg-card .c2{font-family:var(--serif);font-weight:700;font-size:2rem;letter-spacing:.32em;padding-left:.32em;color:#f4fbff;text-shadow:0 0 18px rgba(0,232,200,.55),0 0 42px rgba(138,82,212,.5);}
.rpg-card .c3{font-size:.74rem;letter-spacing:.2em;color:var(--tx);line-height:1.8;}
.rpg-card .ln{height:1px;width:0;background:linear-gradient(90deg,transparent,var(--cy),transparent);transition:width 1.6s ease .2s;}
.rpg-card.on .ln{width:72%;}
.rpg-card.gold .c1{color:var(--gd);}
.rpg-card.gold .c2{text-shadow:0 0 18px rgba(232,184,48,.7),0 0 42px rgba(232,140,48,.4);}
.rpg-card.red .c1{color:var(--rd);}
.rpg-card.red .c2{color:#ffd8e0;text-shadow:0 0 18px rgba(232,48,85,.7);}
.rpg-card .rpg-btns{max-width:280px;}
.rpg-tap{font-family:var(--mono);font-size:.62rem;color:var(--tx-d);letter-spacing:.2em;margin-top:10px;animation:rpgBlink 1.6s infinite;}
.rpg-end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px 22px;text-align:center;background:radial-gradient(ellipse at 50% 40%,rgba(10,16,38,.5),rgba(1,2,8,.88));animation:rpgUp .8s ease;cursor:pointer;}
.rpg-end:not(.dark){background:radial-gradient(ellipse at 50% 50%,rgba(6,10,28,.86) 0%,rgba(6,10,28,.72) 55%,rgba(255,236,190,.05) 100%);}
.rpg-end .e3,.rpg-end .e4,.rpg-end .e2{text-shadow:0 1px 3px rgba(0,0,20,.9),0 0 14px rgba(0,0,20,.6);}
.rpg-end .e1{font-family:var(--dot);font-size:.74rem;letter-spacing:.4em;color:var(--gd);}
.rpg-end .e2{font-family:var(--serif);font-weight:700;font-size:1.7rem;letter-spacing:.25em;color:#fff;text-shadow:0 0 18px rgba(232,184,48,.6);}
.rpg-end.dark .e1{color:var(--rd);}
.rpg-end.dark .e2{text-shadow:0 0 18px rgba(232,48,85,.7);color:#ffd8e0;}
.rpg-end .e3{font-size:.8rem;line-height:2;color:var(--tx-b);white-space:pre-wrap;max-width:330px;}
.rpg-end .e4{font-family:var(--serif);font-size:.86rem;color:#ffe7a8;letter-spacing:.06em;margin-top:6px;line-height:1.9;}
.rpg-end.dark .e4{color:#ffb8c6;}
.rpg-fade{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .45s ease;pointer-events:none;}
.rpg-fade.on{opacity:1;pointer-events:auto;}
.rpg-fade.wipe{opacity:1;background:linear-gradient(90deg,#000 0,#000 94%,rgba(0,0,0,0));clip-path:inset(0 100% 0 0);transition:clip-path .5s cubic-bezier(.65,0,.35,1);}
.rpg-fade.wipe.go{clip-path:inset(0 0 0 0);pointer-events:auto;}
.rpg-fade.wipe.go.out{clip-path:inset(0 0 0 100%);}
.rpg-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .35s ease;}
.rpg-gain{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-family:var(--serif);font-weight:700;font-size:1.25rem;letter-spacing:.2em;color:#fff6d8;text-shadow:0 0 16px rgba(232,184,48,.9),0 0 34px rgba(232,140,48,.6);white-space:nowrap;pointer-events:none;animation:rpgUp .6s ease;}
.rpg-rank{font-family:var(--dot);font-size:.9rem;letter-spacing:.2em;color:var(--tx-b);}
.rpg-rank b{font-family:var(--serif);font-size:2.2rem;margin-left:6px;vertical-align:middle;color:#fff;text-shadow:0 0 16px rgba(232,184,48,.9);}
.rpg-rank.rS b{color:#ffe066;}.rpg-rank.rA b{color:#7affe6;}.rpg-rank.rC b{color:#b6acd8;text-shadow:none;}
@media (min-width:420px){.rpg-text{font-size:.92rem;}}
`);

(function(){
'use strict';

// ── 章データ ──
const RPG_CH=[null,
  {no:1,kan:'第一章',title:'声の灯',  light:'声',  place:'沈んだ配信部屋'},
  {no:2,kan:'第二章',title:'手の灯',  light:'手',  place:'海底の工場'},
  {no:3,kan:'第三章',title:'約束の灯',light:'約束',place:'珊瑚の保育園'},
  {no:4,kan:'第四章',title:'眠りの灯',light:'眠り',place:'眠らない灯籠の回廊'},
  {no:5,kan:'第五章',title:'名前の灯',light:'名前',place:'名前を呑む渦'},
];
// 朝へつなぎとめる選択（錨）。三つ以上で真の目覚めへ
const ANCHORS=['ch1_call','ch2_share','ch3_promise','ch4_rest','ch5_papa'];
const ITEMS={
  shell: {name:'さくら貝',  desc:'ひとりのHPを40回復',tgt:'ally'},
  ramune:{name:'夜光ラムネ',desc:'ひとりの息を15回復・状態異常を治す',tgt:'ally'},
  pearl: {name:'星の真珠',  desc:'二人のHPを50回復・倒れた仲間も起こす',tgt:'all'},
};
const ITEM_KEYS=['shell','ramune','pearl'];

// ── 保存データ（gs.rpg） ──
function rpgDefaults(){return {v:2,cleared:0,lastDay:-1,lv:1,exp:0,items:{shell:1,ramune:1,pearl:0},flags:{},endings:{},ending:null,ranks:{},rating:null,rec:{wins:0,losses:0},opt:{speed:1,atb:null}};}
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
// 旧データ（v1・項目の欠け・壊れた値）を v2 の形にそろえる。gs には書き戻さない
function rpgNormalize(raw){
  raw=isObj(raw)?raw:{};
  const R=Object.assign(rpgDefaults(),raw);
  R.v=2;
  const it=isObj(raw.items)?raw.items:{shell:1,ramune:1};
  R.items={};ITEM_KEYS.forEach(k=>{R.items[k]=Math.max(0,Math.min(99,Math.floor(+it[k]||0)));});
  R.flags=Object.assign({},isObj(raw.flags)?raw.flags:{});
  R.endings=Object.assign({},isObj(raw.endings)?raw.endings:{});
  R.ranks=Object.assign({},isObj(raw.ranks)?raw.ranks:{});
  R.rec=Object.assign({wins:0,losses:0},isObj(raw.rec)?raw.rec:{});
  R.opt=Object.assign({speed:1,atb:null},isObj(raw.opt)?raw.opt:{});
  if(!(R.opt.speed>=0&&R.opt.speed<=3))R.opt.speed=1;
  if(R.opt.atb!=='wait'&&R.opt.atb!=='active')R.opt.atb=null;
  R.cleared=Math.max(0,Math.min(5,Math.floor(+R.cleared||0)));
  R.lastDay=Number.isFinite(+R.lastDay)?Math.floor(+R.lastDay):-1;
  R.lv=Math.max(1,Math.min(99,Math.floor(+R.lv||1)));R.exp=Math.max(0,+R.exp||0);
  if(R.ending!=null&&!['true','wake','sink'].includes(R.ending))R.ending=null;
  return R;
}
function rpgPeek(){return rpgNormalize((typeof gs!=='undefined'&&gs)?gs.rpg:null);}
function rpgState(){const R=rpgNormalize(gs.rpg);gs.rpg=R;return R;}
const lockedToday=R=>R.cleared>0&&R.cleared<5&&R.lastDay===gs.day;
const expNeed=lv=>15+lv*12;
const atbMode=R=>R.opt.atb||mgDiff('wait','wait','active');

// ── 画像（白背景を抜いたポートレート） ──
const IMG={};
function keyWhite(im){
  const w=im.naturalWidth,h=im.naturalHeight;
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d');x.drawImage(im,0,0);
  const d=x.getImageData(0,0,w,h),p=d.data;
  const bg=i=>{const r=p[i],g=p[i+1],b=p[i+2];return Math.min(r,g,b)>232&&Math.max(r,g,b)-Math.min(r,g,b)<22;};
  const seen=new Uint8Array(w*h),st=[];
  for(let i=0;i<w;i++){st.push(i,(h-1)*w+i);}for(let j=0;j<h;j++){st.push(j*w,j*w+w-1);}
  while(st.length){
    const k=st.pop();if(seen[k])continue;
    if(!bg(k*4))continue;
    seen[k]=1;p[k*4+3]=0;
    const px=k%w,py=(k/w)|0;
    if(px>0)st.push(k-1);if(px<w-1)st.push(k+1);if(py>0)st.push(k-w);if(py<h-1)st.push(k+w);
  }
  // 輪郭をなめらかに
  for(let k=0;k<w*h;k++){
    if(seen[k])continue;
    const px=k%w,py=(k/w)|0;
    if((px>0&&seen[k-1])||(px<w-1&&seen[k+1])||(py>0&&seen[k-w])||(py<h-1&&seen[k+w])){
      const i=k*4,br=(p[i]+p[i+1]+p[i+2])/3;
      if(br>170)p[i+3]=Math.max(40,Math.min(255,(255-br)*3.2));
    }
  }
  x.putImageData(d,0,0);
  return c;
}
function img(name,key){
  const id=name+(key?'#k':'');
  if(IMG[id])return IMG[id];
  const o={ok:false,src:null};IMG[id]=o;
  const im=new Image();
  im.onload=()=>{try{o.src=key?keyWhite(im):im;}catch(e){o.src=im;}o.ok=true;};
  im.src='assets/img/'+name+'.webp';
  return o;
}

// ── 乱数（装飾の配置用に固定シード） ──
function srand(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return()=>(s=s*16807%2147483647)/2147483647;}
const R1=srand(1185);
const SNOW=Array.from({length:70},()=>({x:R1(),y:R1(),s:.6+R1()*1.8,v:.2+R1()*.8,ph:R1()*6.28,a:.15+R1()*.45}));
const BUBS=Array.from({length:22},()=>({x:R1(),o:R1(),r:1.5+R1()*4.5,v:.5+R1()*1.1,ph:R1()*6.28}));
const WEED=Array.from({length:14},()=>({x:R1(),h:.12+R1()*.2,w:3+R1()*5,ph:R1()*6.28,c:R1()}));
const GLITCH=Array.from({length:26},()=>({x:R1()*2-1,y:R1()*2-1,w:.15+R1()*.5,h:.04+R1()*.12,c:R1(),ph:R1()*6.28}));
// 娘の顔（CHILD_IMG の SVG）。読めなければ、ドット絵の顔で代わりに描く
const KIDIMG={};
function kidImg(expr){
  if(typeof CHILD_IMG==='undefined'||!CHILD_IMG)return {ok:false,bad:true};
  const k=CHILD_IMG[expr]?expr:'normal';
  if(KIDIMG[k])return KIDIMG[k];
  const o={ok:false,bad:false,src:null};KIDIMG[k]=o;
  const im=new Image();
  im.onload=()=>{o.src=im;o.ok=im.naturalWidth>0;if(!o.ok)o.bad=true;};
  im.onerror=()=>{o.bad=true;};
  try{im.src=CHILD_IMG[k];}catch(e){o.bad=true;}
  return o;
}

// ══════════════════════════════════════════════════════════
// 一枚絵の背景（タイトル・目覚め・沈眠）
// ══════════════════════════════════════════════════════════
function sand(x,W,H,t,y0,col,seed=7){
  const r=srand(seed);
  x.save();x.strokeStyle=col;x.lineWidth=1;
  for(let i=0;i<9;i++){const y=y0+(H-y0)*(i+.5)/9,a=.08+.1*(i/9);x.globalAlpha=a;x.beginPath();
    for(let px=-10;px<=W+10;px+=12){const yy=y+Math.sin(px*.03+i*1.7)*3*(1+i/5);px<0?x.moveTo(px,yy):x.lineTo(px,yy);}x.stroke();}
  x.globalAlpha=1;
  for(let i=0;i<16;i++){const px=r()*W,py=y0+(H-y0)*(.1+r()*.85),s=1.5+r()*4*(py/H);
    x.fillStyle=r()<.3?'rgba(255,200,220,.35)':'rgba(140,130,190,.28)';x.beginPath();x.ellipse(px,py,s*1.6,s,0,0,6.283);x.fill();}
  x.globalCompositeOperation='lighter';
  for(let i=0;i<5;i++){const px=W*(.1+i*.2)+Math.sin(t*.6+i)*W*.05,py=y0+(H-y0)*(.35+.1*Math.sin(t*.8+i*2));
    const g=x.createRadialGradient(px,py,0,px,py,W*.12);g.addColorStop(0,'rgba(160,220,255,.06)');g.addColorStop(1,'rgba(160,220,255,0)');x.fillStyle=g;x.fillRect(px-W*.12,py-W*.12,W*.24,W*.24);}
  x.restore();
}
function vgrad(x,W,H,stops){const g=x.createLinearGradient(0,0,0,H);stops.forEach(([o,c])=>g.addColorStop(o,c));x.fillStyle=g;x.fillRect(0,0,W,H);}
function glow(x,cx,cy,r,col,a){
  const g=x.createRadialGradient(cx,cy,0,cx,cy,r);
  g.addColorStop(0,col.replace('A',a));g.addColorStop(1,col.replace('A',0));
  x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
}
function rays(x,W,H,t,col,n,a){
  x.save();x.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){
    const cx=W*(i+.5)/n+Math.sin(t*.18+i*1.7)*W*.06,sk=Math.sin(t*.11+i)*W*.08;
    const wt=W*.03+i%2*W*.015,wb=W*.16+(i%3)*W*.04,len=H*(.62+.2*((i*37)%5)/5);
    const g=x.createLinearGradient(0,0,0,len);
    const al=a*(.6+.4*Math.sin(t*.7+i*2.3));
    g.addColorStop(0,col.replace('A',al));g.addColorStop(1,col.replace('A',0));
    x.fillStyle=g;x.beginPath();x.moveTo(cx-wt,0);x.lineTo(cx+wt,0);x.lineTo(cx+wb+sk,len);x.lineTo(cx-wb+sk,len);x.closePath();x.fill();
  }
  x.restore();
}
function surface(x,W,H,t,a){
  x.save();x.strokeStyle=`rgba(190,235,255,${a})`;x.lineWidth=1;
  for(let k=0;k<3;k++){x.beginPath();for(let px=0;px<=W;px+=8){const y=H*.025+k*7+Math.sin(px*.025+t*1.4+k*2)*3;px?x.lineTo(px,y):x.moveTo(px,y);}x.stroke();}
  x.restore();
}
function snow(x,W,H,t,col){
  x.fillStyle=col;
  SNOW.forEach(p=>{
    const y=((p.y*H+t*p.v*14)%H+H)%H,px=p.x*W+Math.sin(t*.5+p.ph)*9;
    x.globalAlpha=p.a;x.fillRect(px,y,p.s,p.s);
  });
  x.globalAlpha=1;
}
function bubbles(x,W,H,t,a=1){
  x.save();x.lineWidth=1;
  BUBS.forEach(b=>{
    const span=H*1.25,y=H+20-((b.o*span+t*b.v*38)%span),px=b.x*W+Math.sin(t*1.3+b.ph)*7;
    x.strokeStyle=`rgba(200,240,255,${.35*a})`;x.beginPath();x.arc(px,y,b.r,0,6.283);x.stroke();
    x.fillStyle=`rgba(255,255,255,${.4*a})`;x.fillRect(px-b.r*.4,y-b.r*.5,1.2,1.2);
  });
  x.restore();
}
function seaweed(x,W,H,t,col,base=1){
  x.save();x.lineCap='round';
  WEED.forEach(b=>{
    const h=b.h*H,x0=b.x*W;let px=x0,py=H*base;
    x.strokeStyle=col[b.c<.5?0:1];
    for(let i=1;i<=10;i++){
      const nx=x0+Math.sin(t*1.1+b.ph+i*.42)*i*1.9,ny=H*base-h*i/10;
      x.lineWidth=Math.max(.6,b.w*(1-i/11));x.beginPath();x.moveTo(px,py);x.lineTo(nx,ny);x.stroke();px=nx;py=ny;
    }
  });
  x.restore();
}
function vignette(x,W,H,a,col='0,0,0'){
  const g=x.createRadialGradient(W/2,H*.45,Math.min(W,H)*.25,W/2,H*.45,Math.max(W,H)*.75);
  g.addColorStop(0,`rgba(${col},0)`);g.addColorStop(1,`rgba(${col},${a})`);x.fillStyle=g;x.fillRect(0,0,W,H);
}
function floor(x,W,H,y0,c0,c1){const g=x.createLinearGradient(0,y0,0,H);g.addColorStop(0,c0);g.addColorStop(1,c1);x.fillStyle=g;x.beginPath();x.moveTo(0,y0+6);x.quadraticCurveTo(W/2,y0-10,W,y0+4);x.lineTo(W,H);x.lineTo(0,H);x.fill();}
function torii(x,cx,by,s,col,tilt=0){
  x.save();x.translate(cx,by);x.rotate(tilt);x.fillStyle=col;
  const h=s,w=s*1.1;
  x.fillRect(-w*.36,-h,w*.07,h);x.fillRect(w*.29,-h,w*.07,h);
  x.fillRect(-w*.46,-h*.78,w*.92,h*.06);
  x.beginPath();x.moveTo(-w*.6,-h*.96);x.quadraticCurveTo(0,-h*.88,w*.6,-h*.96);x.lineTo(w*.56,-h*1.04);x.quadraticCurveTo(0,-h*.96,-w*.56,-h*1.04);x.fill();
  x.fillRect(-w*.5,-h*.92,w,h*.05);
  x.restore();
}
function roof(x,cx,by,w,h,col,tilt=0,win){
  x.save();x.translate(cx,by);x.rotate(tilt);x.fillStyle=col;
  x.fillRect(-w*.4,-h*.32,w*.8,h*.32);
  x.beginPath();x.moveTo(-w*.64,-h*.38);x.quadraticCurveTo(-w*.42,-h*.3,-w*.3,-h*.8);x.lineTo(w*.3,-h*.8);x.quadraticCurveTo(w*.42,-h*.3,w*.64,-h*.38);x.lineTo(w*.52,-h*.28);x.lineTo(-w*.52,-h*.28);x.closePath();x.fill();
  x.fillRect(-w*.34,-h*.86,w*.68,h*.07);
  x.beginPath();x.arc(-w*.34,-h*.86,h*.07,Math.PI,0);x.arc(w*.34,-h*.86,h*.07,Math.PI,0);x.fill();
  if(win){x.fillStyle=win;for(let i=-2;i<=2;i++)x.fillRect(i*w*.15-w*.04,-h*.24,w*.07,h*.13);}
  x.restore();
}
// ── 人物 ──
// ミナモ：寝間着の少女。半透明で、髪が水に流れている
function drawMinamo(x,cx,fy,s,t,a,expr){
  if(a<=0)return;
  x.save();x.globalAlpha=a*(.82+.08*Math.sin(t*2.3));
  const h=150*s,hy=fy-h*.78,hr=h*.11,bob=Math.sin(t*1.2)*4*s;
  x.translate(cx,bob);
  x.globalCompositeOperation='lighter';
  glow(x,0,fy-h*.45,h*.75,'rgba(80,220,255,A)',.22);
  x.globalCompositeOperation='source-over';
  // 後ろ髪
  x.lineCap='round';
  for(let i=0;i<9;i++){
    const ang=-Math.PI*.5+(i-4)*.2,len=h*(.42+(i%3)*.07);
    const ox=Math.cos(ang)*hr*.6,oy=hy+Math.sin(ang)*hr*.3;
    x.strokeStyle=`rgba(${40+i*6},${120+i*8},${170+i*6},.55)`;x.lineWidth=hr*.42;
    x.beginPath();x.moveTo(ox,oy);
    const sw=Math.sin(t*1.4+i*.7)*hr*1.2;
    x.bezierCurveTo(ox+(i-4)*hr*.35+sw*.3,oy+len*.35,ox+(i-4)*hr*.6-sw,oy+len*.7,ox+(i-4)*hr*.5+sw*1.3,oy+len);x.stroke();
  }
  // 体（寝間着）
  const dg=x.createLinearGradient(0,hy+hr,0,fy+8*s);
  dg.addColorStop(0,'rgba(225,250,255,.92)');dg.addColorStop(.7,'rgba(160,220,245,.55)');dg.addColorStop(1,'rgba(120,200,240,0)');
  x.fillStyle=dg;x.beginPath();
  x.moveTo(-hr*.55,hy+hr*.95);x.quadraticCurveTo(-hr*1.6,hy+h*.35,-hr*2.1,fy);
  for(let k=0;k<=6;k++){const px=-hr*2.1+k*hr*4.2/6;x.lineTo(px,fy+Math.sin(t*2+k*1.3)*5*s+(k%2)*6*s);}
  x.quadraticCurveTo(hr*1.6,hy+h*.35,hr*.55,hy+hr*.95);x.closePath();x.fill();
  // 腕
  x.strokeStyle='rgba(225,248,255,.8)';x.lineWidth=hr*.32;
  const sw2=Math.sin(t*1.1)*hr*.3;
  x.beginPath();x.moveTo(-hr*.8,hy+hr*1.4);x.quadraticCurveTo(-hr*1.5,hy+h*.28,-hr*1.2+sw2,hy+h*.4);x.stroke();
  x.beginPath();x.moveTo(hr*.8,hy+hr*1.4);x.quadraticCurveTo(hr*1.5,hy+h*.28,hr*1.2-sw2,hy+h*.4);x.stroke();
  // 襟
  x.strokeStyle='rgba(120,190,230,.7)';x.lineWidth=1.4*s;x.beginPath();x.moveTo(-hr*.5,hy+hr*1.05);x.lineTo(0,hy+hr*1.5);x.lineTo(hr*.5,hy+hr*1.05);x.stroke();
  // 顔
  const fg=x.createRadialGradient(-hr*.2,hy-hr*.2,1,0,hy,hr);fg.addColorStop(0,'#f4fdff');fg.addColorStop(1,'#bfe6f5');
  x.fillStyle=fg;x.beginPath();x.arc(0,hy,hr,0,6.283);x.fill();
  // 前髪
  x.fillStyle='rgba(50,130,180,.88)';x.beginPath();
  x.moveTo(-hr*1.1,hy+hr*.3);x.quadraticCurveTo(-hr*1.2,hy-hr*1.3,0,hy-hr*1.15);x.quadraticCurveTo(hr*1.2,hy-hr*1.3,hr*1.1,hy+hr*.3);
  x.quadraticCurveTo(hr*.7,hy-hr*.35,hr*.3,hy-hr*.2);x.quadraticCurveTo(0,hy-hr*.55,-hr*.3,hy-hr*.2);x.quadraticCurveTo(-hr*.7,hy-hr*.35,-hr*1.1,hy+hr*.3);x.fill();
  // 髪飾り（貝）
  x.fillStyle='#ffd0dc';x.beginPath();x.arc(hr*.75,hy-hr*.6,hr*.2,0,6.283);x.fill();
  // 目
  x.strokeStyle='#1d4a68';x.fillStyle='#1d4a68';x.lineWidth=Math.max(1,hr*.1);
  const ey=hy+hr*.12,ex=hr*.38;
  if(expr==='closed'||expr==='smile'){
    [-1,1].forEach(d=>{x.beginPath();x.arc(d*ex,ey+(expr==='smile'?hr*.06:-hr*.04),hr*.17,expr==='smile'?Math.PI*1.1:Math.PI*.1,expr==='smile'?Math.PI*1.9:Math.PI*.9);x.stroke();});
  }else{
    const blink=(t%4.2)<.12;
    [-1,1].forEach(d=>{
      if(blink){x.beginPath();x.moveTo(d*ex-hr*.15,ey);x.lineTo(d*ex+hr*.15,ey);x.stroke();return;}
      x.beginPath();x.ellipse(d*ex,ey,hr*.13,hr*(expr==='surprise'?.22:.18),0,0,6.283);x.fill();
      x.fillStyle='#c8f6ff';x.fillRect(d*ex-hr*.05,ey-hr*.1,hr*.07,hr*.07);x.fillStyle='#1d4a68';
    });
    if(expr==='sad'){x.beginPath();x.moveTo(-ex-hr*.2,ey-hr*.3);x.lineTo(-ex+hr*.12,ey-hr*.36);x.moveTo(ex+hr*.2,ey-hr*.3);x.lineTo(ex-hr*.12,ey-hr*.36);x.stroke();}
  }
  // 口・頬
  x.strokeStyle='#5a7c94';x.lineWidth=Math.max(.8,hr*.07);x.beginPath();
  if(expr==='smile')x.arc(0,hy+hr*.45,hr*.14,.2,Math.PI-.2);
  else if(expr==='surprise')x.arc(0,hy+hr*.5,hr*.08,0,6.283);
  else if(expr==='sad')x.arc(0,hy+hr*.62,hr*.12,Math.PI+.4,-.4);
  else{x.moveTo(-hr*.1,hy+hr*.52);x.lineTo(hr*.1,hy+hr*.52);}
  x.stroke();
  x.fillStyle='rgba(255,170,200,.35)';x.beginPath();x.arc(-hr*.55,hy+hr*.35,hr*.14,0,6.283);x.arc(hr*.55,hy+hr*.35,hr*.14,0,6.283);x.fill();
  x.restore();
}
const SCENES={
  menu(x,W,H,t){
    vgrad(x,W,H,[[0,'#0d2244'],[.45,'#071630'],[1,'#010309']]);
    rays(x,W,H,t,'rgba(120,220,255,A)',5,.07);surface(x,W,H,t,.18);
    roof(x,W*.18,H*.74,W*.5,H*.2,"#06102a",-.06);roof(x,W*.86,H*.7,W*.42,H*.17,"#071230",.08);
    torii(x,W*.52,H*.72,H*.26,'#3a1422',.04);
    floor(x,W,H,H*.73,'#081226','#020409');sand(x,W,H,t,H*.75,'#5a6aa8',3);
    seaweed(x,W,H,t,['#0d3a3a','#123048'],1);
    snow(x,W,H,t,'#cfe9ff');bubbles(x,W,H,t);vignette(x,W,H,.7);
  },
  // 目覚めの水面
  dawn(x,W,H,t){
    vgrad(x,W,H,[[0,'#ffe6a8'],[.25,'#9fd0e8'],[.6,'#2b5a8c'],[1,'#0b1a38']]);
    rays(x,W,H,t,'rgba(255,250,220,A)',6,.22);surface(x,W,H,t,.6);
    x.globalCompositeOperation='lighter';glow(x,W*.5,-H*.05,W*.9,'rgba(255,240,200,A)',.45);x.globalCompositeOperation='source-over';
    roof(x,W*.2,H*1.02,W*.5,H*.2,'rgba(20,40,80,.6)',-.05);torii(x,W*.78,H*1.0,H*.24,'rgba(90,40,60,.5)',.04);
    snow(x,W,H,t,'#fff');bubbles(x,W,H,t,1.4);
  },
  // 沈眠の都
  abyss(x,W,H,t){
    vgrad(x,W,H,[[0,'#1a0612'],[.5,'#0a0208'],[1,'#000']]);
    rays(x,W,H,t,'rgba(255,90,90,A)',3,.03);
    for(let i=0;i<7;i++){roof(x,W*(i/6),H*(.82+(i%2)*.06),W*.32,H*.13,'#0c0408',(i-3)*.03,`rgba(255,${120+i*10},70,${.35+.15*Math.sin(t*1.5+i)})`);}
    x.globalCompositeOperation='lighter';glow(x,W*.5,H*.9,W*.7,'rgba(255,90,50,A)',.22);x.globalCompositeOperation='source-over';
    snow(x,W,H,t,'#ffb0a0');vignette(x,W,H,.85);
  },
};

// ══════════════════════════════════════════════════════════
// 海の亡者（敵）の絵。原点中心・大きさ s で描く。低解像度に描いて拡大するので、自然とドット絵になる
// ══════════════════════════════════════════════════════════
const FOES={
  noise(x,s,t,e){
    const tint=e.tint||'0';
    GLITCH.forEach((g,i)=>{
      const j=Math.sin(t*13+g.ph)>.6?(Math.random()-.5)*s*.25:0;
      const px=g.x*s*.42+Math.sin(t*1.5+g.ph)*s*.06+j,py=g.y*s*.36+Math.cos(t*1.2+g.ph)*s*.05;
      const c=tint==='o'?['rgba(255,160,80,.75)','rgba(255,90,60,.7)','rgba(255,230,180,.65)']:['rgba(220,240,255,.75)','rgba(0,232,200,.65)','rgba(255,60,160,.65)'];
      x.fillStyle=c[Math.floor(g.c*3)];x.fillRect(px-g.w*s*.16,py,g.w*s*.32,g.h*s*.35);
    });
    x.globalCompositeOperation='lighter';glow(x,0,0,s*.55,tint==='o'?'rgba(255,120,40,A)':'rgba(120,80,255,A)',.25);x.globalCompositeOperation='source-over';
    x.fillStyle='rgba(0,0,0,.35)';for(let y=-s*.45;y<s*.45;y+=4)x.fillRect(-s*.55,y,s*1.1,1);
    x.fillStyle='#fff';const ey=Math.sin(t*2)*s*.04;
    x.fillRect(-s*.16,-s*.08+ey,s*.08,s*.05);x.fillRect(s*.08,-s*.08+ey,s*.08,s*.05);
  },
  bubble(x,s,t,e){
    const r=s*.42*(1+.04*Math.sin(t*2.4))*(e.charge?1.25+.04*Math.sin(t*14):1);
    for(let i=0;i<7;i++){const a=t*.8+i*.9,rr=r*(1.15+.12*Math.sin(t+i));x.strokeStyle='rgba(255,170,150,.5)';x.lineWidth=1.2;x.beginPath();x.arc(Math.cos(a)*rr,Math.sin(a)*rr*.85,s*(.03+(i%3)*.02),0,6.283);x.stroke();}
    x.globalCompositeOperation='lighter';glow(x,0,0,r*1.8,'rgba(255,60,60,A)',e.charge?.5:.28);x.globalCompositeOperation='source-over';
    const g=x.createRadialGradient(-r*.3,-r*.3,r*.1,0,0,r);
    g.addColorStop(0,'rgba(255,220,180,.5)');g.addColorStop(.55,'rgba(255,80,60,.42)');g.addColorStop(1,'rgba(140,10,40,.75)');
    x.fillStyle=g;x.beginPath();x.arc(0,0,r,0,6.283);x.fill();
    x.strokeStyle='rgba(255,220,220,.7)';x.lineWidth=2;x.beginPath();x.arc(0,0,r,0,6.283);x.stroke();
    x.fillStyle='rgba(255,255,255,.55)';x.beginPath();x.ellipse(-r*.42,-r*.45,r*.16,r*.08,-.7,0,6.283);x.fill();
    x.font=`${Math.round(s*.085)}px "DotGothic16",monospace`;x.textAlign='center';
    ['炎上','辞めろ','つまらん','#晒し'].forEach((w,i)=>{const a=t*.6+i*1.57;x.fillStyle=`rgba(255,240,200,${.6+.3*Math.sin(t*3+i)})`;x.fillText(w,Math.cos(a)*r*.48,Math.sin(a)*r*.42+s*.03);});
    x.fillStyle='#200008';x.beginPath();x.ellipse(-r*.22,-r*.02,r*.07,r*.12,0,0,6.283);x.ellipse(r*.22,-r*.02,r*.07,r*.12,0,0,6.283);x.fill();
  },
  crab(x,s,t,e){
    const sn=Math.max(0,Math.sin(t*4))*.35;
    x.strokeStyle='#8a3a20';x.lineWidth=s*.035;x.lineCap='round';
    for(let i=0;i<3;i++)[-1,1].forEach(d=>{x.beginPath();x.moveTo(d*s*.2,s*.05);x.lineTo(d*s*(.38+i*.06),s*(.12+Math.sin(t*5+i)*.02));x.lineTo(d*s*(.44+i*.07),s*.28);x.stroke();});
    const bg=x.createRadialGradient(0,-s*.05,s*.05,0,0,s*.35);bg.addColorStop(0,'#c86a3a');bg.addColorStop(1,'#5a2010');
    x.fillStyle=bg;x.beginPath();x.ellipse(0,0,s*.34,s*.2,0,0,6.283);x.fill();
    x.fillStyle='rgba(60,40,30,.6)';for(let i=0;i<6;i++){x.beginPath();x.arc(Math.cos(i)*s*.2,Math.sin(i*2)*s*.08,s*.025,0,6.283);x.fill();}
    [-1,1].forEach(d=>{
      x.save();x.translate(d*s*.42,-s*.18);x.rotate(d*(-.3));
      x.fillStyle='#b05a30';x.beginPath();x.ellipse(0,0,s*.14,s*.1,0,0,6.283);x.fill();
      x.fillStyle='#02040b';x.beginPath();x.moveTo(d*s*.02,0);x.lineTo(d*s*.16,-s*.04-sn*s*.08);x.lineTo(d*s*.16,s*.04+sn*s*.08);x.fill();x.restore();
    });
    x.strokeStyle='#8a3a20';x.lineWidth=s*.02;[-1,1].forEach(d=>{x.beginPath();x.moveTo(d*s*.08,-s*.15);x.lineTo(d*s*.1,-s*.27);x.stroke();x.fillStyle='#ffe060';x.beginPath();x.arc(d*s*.1,-s*.28,s*.03,0,6.283);x.fill();});
  },
  rust(x,s,t,e){
    const sway=Math.sin(t*1.1)*s*.02;
    x.strokeStyle='#4a3a30';x.lineWidth=s*.07;x.lineCap='round';
    [-1,1].forEach(d=>{const a=Math.sin(t*1.3+d)*.15;x.beginPath();x.moveTo(d*s*.26,-s*.1);x.lineTo(d*s*(.45+a*.2),s*.12);x.lineTo(d*s*.4,s*.32);x.stroke();
      x.fillStyle='#5a4030';x.fillRect(d*s*.4-s*.06,s*.3,s*.12,s*.08);});
    const bg=x.createLinearGradient(-s*.3,0,s*.3,0);bg.addColorStop(0,'#5a3424');bg.addColorStop(.5,'#8a5a3a');bg.addColorStop(1,'#4a2a1c');
    x.fillStyle=bg;x.fillRect(-s*.28+sway,-s*.2,s*.56,s*.5);
    x.fillStyle='#c08050';for(let i=0;i<4;i++){x.beginPath();x.arc(-s*.22+sway+i*s*.146,-s*.15,s*.015,0,6.283);x.arc(-s*.22+sway+i*s*.146,s*.25,s*.015,0,6.283);x.fill();}
    x.fillStyle='#d8a020';for(let i=0;i<5;i++)x.fillRect(-s*.26+sway+i*s*.11,s*.05,s*.05,s*.04);
    // 歯車の頭
    x.save();x.translate(sway,-s*.36);x.rotate(t*(e.armor?.5:1.4));
    x.fillStyle='#6a4a34';
    for(let i=0;i<10;i++){x.save();x.rotate(i*.628);x.fillRect(-s*.03,-s*.2,s*.06,s*.06);x.restore();}
    x.beginPath();x.arc(0,0,s*.16,0,6.283);x.fill();x.restore();
    x.globalCompositeOperation='lighter';glow(x,sway,-s*.36,s*.2,'rgba(255,40,40,A)',.6+.3*Math.sin(t*5));x.globalCompositeOperation='source-over';
    x.fillStyle='#ff3040';x.beginPath();x.arc(sway,-s*.36,s*.05,0,6.283);x.fill();
    if(e.armor){
      const al=.45+.25*Math.sin(t*4);x.save();x.translate(sway,-s*.05);
      x.beginPath();x.ellipse(0,0,s*.46,s*.52,0,0,6.283);x.fillStyle=`rgba(110,170,240,${al*.25})`;x.fill();
      x.strokeStyle=`rgba(170,215,255,${al+.2})`;x.lineWidth=2;x.stroke();x.clip();
      x.strokeStyle=`rgba(170,215,255,${al*.5})`;x.lineWidth=1;const hs=s*.09;
      for(let r=-6;r<=6;r++)for(let c=-4;c<=4;c++){const hx2=c*hs*1.75+(r%2)*hs*.87,hy=r*hs*1.5;x.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;x.lineTo(hx2+Math.cos(a)*hs,hy+Math.sin(a)*hs);}x.closePath();x.stroke();}
      const sy=((t*.6)%1)*s*1.04-s*.52;const g=x.createLinearGradient(0,sy-s*.06,0,sy+s*.06);g.addColorStop(0,'rgba(200,235,255,0)');g.addColorStop(.5,`rgba(200,235,255,${al*.6})`);g.addColorStop(1,'rgba(200,235,255,0)');x.fillStyle=g;x.fillRect(-s*.5,sy-s*.06,s,s*.12);
      x.restore();}
  },
  letters(x,s,t,e){
    for(let i=0;i<7;i++){
      const a=t*.9+i*.9,r=s*(.2+.14*Math.sin(t*.7+i)),px=Math.cos(a)*r*1.4,py=Math.sin(a)*r;
      x.save();x.translate(px,py);x.rotate(Math.sin(t*3+i)*.4);x.scale(1,.6+.4*Math.abs(Math.sin(t*6+i)));
      x.fillStyle='#e8e0d0';x.fillRect(-s*.12,-s*.08,s*.24,s*.16);
      x.strokeStyle='#a09080';x.lineWidth=1;x.beginPath();x.moveTo(-s*.12,-s*.08);x.lineTo(0,s*.01);x.lineTo(s*.12,-s*.08);x.stroke();
      x.fillStyle='#d02030';x.font=`${Math.round(s*.05)}px "DotGothic16",monospace`;x.textAlign='center';x.fillText('督促',s*.05,s*.06);
      x.restore();
    }
  },
  debt(x,s,t,e){
    const g=1+(e.grow||0)*.06,sw=Math.sin(t*.9)*s*.03;
    x.save();x.scale(g,g);
    for(let k=3;k>=0;k--){
      x.fillStyle=`rgba(${8+k*6},${4+k*3},${20+k*8},${k?.25:.95})`;const o=k*s*.025;
      x.beginPath();x.moveTo(-s*.08+sw,-s*.42-o);x.quadraticCurveTo(-s*.32-o,s*.1,-s*.34-o+sw,s*.5);
      for(let i=0;i<=6;i++)x.lineTo(-s*.34+i*s*.113,s*.5+Math.sin(t*2+i)*s*.03+o);
      x.quadraticCurveTo(s*.32+o,s*.1,s*.08+sw,-s*.42-o);x.fill();
    }
    x.fillStyle='#07040f';x.beginPath();x.arc(sw,-s*.48,s*.1,0,6.283);x.fill();
    x.fillRect(-s*.18+sw,-s*.56,s*.36,s*.03);x.fillRect(-s*.1+sw,-s*.66,s*.2,s*.11);
    x.fillStyle='#fff';const bl=(t%3.3)<.1?.2:1;
    x.beginPath();x.ellipse(-s*.04+sw,-s*.48,s*.025,s*.012*bl,-.2,0,6.283);x.ellipse(s*.04+sw,-s*.48,s*.025,s*.012*bl,.2,0,6.283);x.fill();
    x.strokeStyle='#100a20';x.lineWidth=s*.05;x.lineCap='round';
    x.beginPath();x.moveTo(-s*.2,-s*.25);x.quadraticCurveTo(-s*.44,s*.05,-s*.4+Math.sin(t*1.3)*s*.05,s*.32);x.stroke();
    x.beginPath();x.moveTo(s*.2,-s*.25);x.quadraticCurveTo(s*.42,-s*.05,s*.3,s*.12);x.stroke();
    x.fillStyle='#e8e0d0';x.save();x.translate(s*.3,s*.12);x.rotate(-.2);x.fillRect(-s*.1,-s*.07,s*.2,s*.14);
    x.fillStyle='#d02030';x.font=`${Math.round(s*.042)}px "Share Tech Mono",monospace`;x.textAlign='center';x.fillText('¥840,000',0,s*.01);x.fillText('残高',0,-s*.03);x.restore();
    x.restore();
  },
  sheep(x,s,t,e){
    const c=e.clones||0;
    for(let k=c;k>=0;k--){
      x.save();
      if(k){x.translate((k%2?-1:1)*s*(.3+k*.08),-s*.12-k*s*.04);x.scale(.55,.55);x.globalAlpha=.6;}
      const b=Math.sin(t*2+k)*s*.02;
      x.fillStyle='#1a1630';x.fillRect(-s*.2,s*.1,s*.05,s*.2);x.fillRect(s*.15,s*.1,s*.05,s*.2);
      const wool=['#5a5280','#4a4470','#6a6290'];
      for(let i=0;i<10;i++){const a=i*.628;x.fillStyle=wool[i%3];x.beginPath();x.arc(Math.cos(a)*s*.24,Math.sin(a)*s*.14+b,s*.12,0,6.283);x.fill();}
      x.fillStyle='#6a6290';x.beginPath();x.ellipse(0,b,s*.26,s*.16,0,0,6.283);x.fill();
      x.fillStyle='#14102a';x.beginPath();x.ellipse(s*.3,-s*.08+b,s*.11,s*.13,.3,0,6.283);x.fill();
      x.fillStyle='#ff4060';x.beginPath();x.arc(s*.28,-s*.1+b,s*.03,0,6.283);x.arc(s*.35,-s*.09+b,s*.03,0,6.283);x.fill();
      x.fillStyle='#fff';x.beginPath();x.arc(s*.28,-s*.1+b,s*.012,0,6.283);x.arc(s*.35,-s*.09+b,s*.012,0,6.283);x.fill();
      x.restore();
    }
    x.font=`${Math.round(s*.07)}px "DotGothic16",monospace`;x.textAlign='center';
    for(let i=0;i<3+c;i++){const a=t*.5+i*2.1;x.fillStyle=`rgba(200,190,255,${.3+.2*Math.sin(t+i)})`;x.fillText(`${i+1}匹`,Math.cos(a)*s*.55,Math.sin(a)*s*.4-s*.1);}
  },
  watcher(x,s,t,e){
    // 配信枠
    x.strokeStyle='rgba(200,180,255,.35)';x.lineWidth=2;x.strokeRect(-s*.62,-s*.42,s*1.24,s*.84);
    x.fillStyle='#e83055';x.fillRect(-s*.6,-s*.4,s*.16,s*.07);x.fillStyle='#fff';x.font=`${Math.round(s*.05)}px "Share Tech Mono",monospace`;x.textAlign='center';x.fillText('LIVE',-s*.52,-s*.345);
    x.fillStyle='rgba(255,255,255,.6)';x.fillText('👁 '+(e.count||'∞'),s*.48,-s*.345);
    // 小さな目
    for(let i=0;i<9;i++){const a=i*.7+t*.3,r=s*(.42+.05*Math.sin(t+i)),px=Math.cos(a)*r,py=Math.sin(a)*r*.62;
      const op=Math.sin(t*1.7+i*2)>-.3;x.fillStyle='#e8e0f0';x.beginPath();x.ellipse(px,py,s*.04,op?s*.022:s*.004,0,0,6.283);x.fill();
      if(op){x.fillStyle='#601030';x.beginPath();x.arc(px,py,s*.014,0,6.283);x.fill();}}
    // 大きな目
    const open=e.charge?1.15:.85+.15*Math.sin(t*.8);
    x.globalCompositeOperation='lighter';glow(x,0,0,s*.6,'rgba(200,40,120,A)',e.charge?.55:.3);x.globalCompositeOperation='source-over';
    x.fillStyle='#ddd4ea';x.beginPath();x.moveTo(-s*.34,0);x.quadraticCurveTo(0,-s*.3*open,s*.34,0);x.quadraticCurveTo(0,s*.3*open,-s*.34,0);x.fill();
    x.save();x.beginPath();x.moveTo(-s*.34,0);x.quadraticCurveTo(0,-s*.3*open,s*.34,0);x.quadraticCurveTo(0,s*.3*open,-s*.34,0);x.clip();
    const lx=Math.sin(t*.7)*s*.06,ly=Math.cos(t*.5)*s*.03;
    const ig=x.createRadialGradient(lx,ly,s*.02,lx,ly,s*.13);ig.addColorStop(0,'#ff6090');ig.addColorStop(.6,'#801040');ig.addColorStop(1,'#30041a');
    x.fillStyle=ig;x.beginPath();x.arc(lx,ly,s*.13,0,6.283);x.fill();
    x.fillStyle='#000';x.beginPath();x.arc(lx,ly,s*(e.charge?.03:.055),0,6.283);x.fill();
    x.fillStyle='#fff';x.fillRect(lx-s*.05,ly-s*.06,s*.025,s*.025);x.restore();
    x.strokeStyle='#2a0a1a';x.lineWidth=2;x.beginPath();x.moveTo(-s*.34,0);x.quadraticCurveTo(0,-s*.3*open,s*.34,0);x.stroke();
    // 周りを回るコメント
    x.font=`${Math.round(s*.048)}px "DotGothic16",monospace`;
    ['さっきも同じ話、聞きました','30日目まで見ています','寝たら終わりますよ','後ろ、雨の音だけじゃないですよ'].forEach((w,i)=>{
      const a=t*.35+i*1.57,r=s*.62;x.fillStyle=`rgba(255,160,190,${.45+.3*Math.sin(t*2+i)})`;x.fillText(w,Math.cos(a)*r*.75,Math.sin(a)*r*.6+s*.02);
    });
  },
};
FOES.echo=(x,s,t,e)=>FOES.noise(x,s,t,Object.assign({},e,{tint:'o'}));
FOES.lamb=(x,s,t,e)=>FOES.sheep(x,s,t,{clones:0});
FOES.spark=(x,s,t,e)=>FOES.bubble(x,s,t,{charge:e.charge});
// 名前を呑む影：フードの影に赤い目
FOES.shade=(x,s,t,e)=>{
  const sw=Math.sin(t*1.6)*s*.04;
  x.globalCompositeOperation='lighter';glow(x,0,0,s*.6,'rgba(150,40,200,A)',.25);x.globalCompositeOperation='source-over';
  x.fillStyle='#120820';x.beginPath();x.moveTo(-s*.08+sw,-s*.46);x.quadraticCurveTo(-s*.36,-s*.1,-s*.32,s*.42);
  for(let i=0;i<=5;i++)x.lineTo(-s*.32+i*s*.128,s*.42+Math.sin(t*3+i)*s*.05);
  x.quadraticCurveTo(s*.36,-s*.1,s*.08+sw,-s*.46);x.fill();
  x.fillStyle='#2a1440';x.beginPath();x.ellipse(sw,-s*.22,s*.17,s*.15,0,0,6.283);x.fill();
  x.fillStyle='#000';x.beginPath();x.ellipse(sw,-s*.2,s*.12,s*.1,0,0,6.283);x.fill();
  x.fillStyle='#ff3a5a';const bl=(t%3.1)<.12?.3:1;x.fillRect(sw-s*.08,-s*.22,s*.05,s*.04*bl);x.fillRect(sw+s*.03,-s*.22,s*.05,s*.04*bl);
  x.font=`${Math.round(s*.13)}px "DotGothic16",monospace`;x.textAlign='center';x.fillStyle=`rgba(220,190,255,${.35+.25*Math.sin(t*2)})`;
  x.fillText('■■',sw,s*.18);
};
// 観測者のまわりの小さな目
FOES.eye=(x,s,t,e)=>{
  const open=.6+.4*Math.abs(Math.sin(t*.9+(e.ph||0)));
  x.globalCompositeOperation='lighter';glow(x,0,0,s*.6,'rgba(220,40,120,A)',.3);x.globalCompositeOperation='source-over';
  x.fillStyle='#e0d6ee';x.beginPath();x.moveTo(-s*.4,0);x.quadraticCurveTo(0,-s*.36*open,s*.4,0);x.quadraticCurveTo(0,s*.36*open,-s*.4,0);x.fill();
  x.fillStyle='#801040';x.beginPath();x.arc(Math.sin(t*.8)*s*.06,0,s*.15*open,0,6.283);x.fill();
  x.fillStyle='#000';x.beginPath();x.arc(Math.sin(t*.8)*s*.06,0,s*.06*open,0,6.283);x.fill();
  x.strokeStyle='#2a0a1a';x.lineWidth=Math.max(1,s*.05);x.beginPath();x.moveTo(-s*.4,0);x.quadraticCurveTo(0,-s*.36*open,s*.4,0);x.stroke();
};

// ── 効果音：AU.se に加えて、Web Audio で短い音を合成（AU.ctx がある時だけ） ──
function sfx(type){
  try{
    const vol=(typeof AUDIO_SET!=='undefined'&&AUDIO_SET)?+AUDIO_SET.se:1;
    if(!vol||typeof AU==='undefined')return;
    if(!AU.ctx&&AU.init)AU.init();
    const c=AU.ctx;if(!c)return;
    if(c.state==='suspended'){c.resume().catch(()=>{});return;}
    const now=c.currentTime;
    const tone=(f,d,tp='sine',g=.05,at=0,f2)=>{const o=c.createOscillator(),gn=c.createGain();o.type=tp;o.frequency.setValueAtTime(f,now+at);if(f2)o.frequency.exponentialRampToValueAtTime(f2,now+at+d);gn.gain.setValueAtTime(.0001,now+at);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,g*vol),now+at+.008);gn.gain.exponentialRampToValueAtTime(.0001,now+at+d);o.connect(gn);gn.connect(c.destination);o.start(now+at);o.stop(now+at+d+.02);};
    const noise=(d,g=.08,at=0,fq=1200)=>{const n=Math.floor(c.sampleRate*d),b=c.createBuffer(1,n,c.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource();s.buffer=b;const f=c.createBiquadFilter();f.type='bandpass';f.frequency.value=fq;const gn=c.createGain();gn.gain.value=g*vol;s.connect(f);f.connect(gn);gn.connect(c.destination);s.start(now+at);};
    switch(type){
      case 'blip':tone(760+Math.random()*80,.025,'square',.01);break;
      case 'hit':noise(.12,.2,0,900);tone(200,.12,'square',.04,0,60);break;
      case 'crit':noise(.2,.25,0,1500);tone(1500,.1,'square',.035,0,300);tone(110,.22,'sawtooth',.05,.02,40);break;
      case 'hurt':noise(.22,.22,0,420);tone(150,.26,'sawtooth',.05,0,45);break;
      case 'heal':[660,880,1100,1320].forEach((f,i)=>tone(f,.2,'sine',.04,i*.06));break;
      case 'guard':tone(300,.18,'triangle',.06,0,620);noise(.08,.05,0,3200);break;
      case 'counter':tone(220,.08,'square',.05,0,880);noise(.15,.2,.06,1800);break;
      case 'talk':tone(420,.05,'square',.025);tone(540,.05,'square',.025,.07);tone(470,.06,'square',.025,.14);break;
      case 'sing':[523,659,784,1047].forEach((f,i)=>tone(f,.18,'triangle',.04,i*.08));break;
      case 'fix':noise(.05,.15,0,4200);noise(.05,.15,.1,4200);tone(1900,.06,'square',.025,.2);break;
      case 'pray':[392,494,587,784].forEach((f,i)=>tone(f,.55,'sine',.032,i*.12));break;
      case 'light':[523,659,784,1047,1319,1568].forEach((f,i)=>tone(f,.45,'triangle',.04,i*.07));break;
      case 'lvup':[523,659,784,1047].forEach((f,i)=>tone(f,.14,'square',.03,i*.08));tone(1047,.45,'square',.03,.34);break;
      case 'enc':for(let i=0;i<7;i++)tone(180+i*110,.07,'sawtooth',.035,i*.045);noise(.35,.07,.3,700);break;
      case 'win':[784,784,784,1047].forEach((f,i)=>tone(f,i<3?.1:.5,'square',.03,i*.12));tone(523,.6,'triangle',.03,.36);break;
      case 'lose':[392,370,349,311].forEach((f,i)=>tone(f,.4,'triangle',.045,i*.26));break;
      case 'item':tone(988,.07,'square',.03);tone(1319,.16,'square',.03,.08);break;
      case 'down':noise(.6,.16,0,300);tone(220,.7,'sawtooth',.045,0,40);break;
      case 'wipe':noise(.45,.05,0,700);break;
      case 'bubble':tone(380,.09,'sine',.04,0,1000);break;
      case 'enemy':tone(130,.16,'sawtooth',.045,0,90);noise(.1,.08,0,500);break;
      case 'swoosh':noise(.28,.12,0,2400);tone(300,.22,'sine',.03,0,900);break;
      case 'ready':tone(1175,.06,'square',.022);tone(1568,.1,'square',.022,.06);break;
      case 'chest':tone(523,.08,'square',.03);tone(784,.08,'square',.03,.08);tone(1047,.22,'square',.03,.16);break;
      case 'save':[784,988,1175,1568].forEach((f,i)=>tone(f,.4,'sine',.035,i*.1));break;
      case 'cursor':tone(880,.03,'square',.016);break;
      case 'bump':tone(110,.06,'square',.03);break;
      case 'miss':tone(500,.1,'sine',.03,0,250);break;
      case 'dual':[392,523,659,784,1047,1319].forEach((f,i)=>tone(f,.3,'square',.026,i*.05));noise(.4,.08,.2,2600);break;
      case 'spot':tone(988,.06,'square',.035);tone(1319,.12,'square',.035,.07);break;
      case 'door':noise(.25,.06,0,500);tone(160,.2,'triangle',.03,0,120);break;
    }
  }catch(e){}
}

// ══════════════════════════════════════════════════════════
// ドット絵の人物（24×32のセルに1ドットずつ塗り、最後に黒い縁取りを自動でつける）
//   向き d=下 u=上 r=右（l は r の左右反転）／ fr 0..3 歩きの4コマ／ pose cast・win・hurt
// ══════════════════════════════════════════════════════════
const SW=24,SH=32,FEET=28;
const PAL={
  // いつもの姿：紫の髪・ピンクの小さなシルクハット・花のヘアピン・眼鏡・ラベンダーの上着にピンクのシャツ
  dan:{hair:'#5a22a8',hairD:'#3c147c',hairL:'#8c58dc',skin:'#fde4d4',eye:'#7a2ab8',top:'#d6c2f0',topD:'#a48cc8',inner:'#f8b2cc',innerD:'#e07ca8',
    bottom:'#6c2a56',bottomD:'#4a1a3c',shoe:'#f4f0fa',shoeD:'#b8b0c8',hat:'top',hatC:'#e676a6',hatD:'#7a2850',glasses:'#2a1a3a',flower:'#ff9ac8',long:true},
  // 疲れ切った夜の姿：白い髪・猫の耳と尻尾・マゼンタのパーカー（同じ人）
  danT:{hair:'#ece6f8',hairD:'#bcb2dc',hairL:'#ffffff',skin:'#fde4d4',eye:'#8a3a9a',top:'#c8306e',topD:'#8e1e4c',inner:'#f4e8f4',innerD:'#d8c8e0',
    bottom:'#2a2438',bottomD:'#1a1626',shoe:'#e8e0f0',shoeD:'#a8a0b8',ears:'#ffa0c0',tail:true,glasses:'#2a1a3a',flower:'#ff9ac8',hood:true,long:true},
  // ミナモ：水色の長い髪、白い寝間着、貝の髪飾り（半透明で、少し浮いている）
  mina:{hair:'#5ab4dc',hairD:'#2f7cae',hairL:'#bff0ff',skin:'#f2fcff',eye:'#1d4a68',gown:'#e2f8ff',gownD:'#9fd2ea',shell:'#ffc0d4'},
  // 娘（4歳）：紫がかった黒髪のボブ・小さなツインテール・ピンクの花のヘアゴム・紫の大きな瞳・クマのぬいぐるみ
  kidOut:{hair:'#2c1a40',hairD:'#1c1030',hairL:'#5a3c80',skin:'#ffe8dc',eye:'#8a3ad0',top:'#8ccaf2',topD:'#5aa0d0',collar:'#ffffff',
    leg:'#ffe8dc',boot:'#f8d030',bootD:'#c89a10',hat:'#f8d434',hatD:'#d8a818',flower:'#ff7ab4',bear:'#8a5a30',bearL:'#b8885a'},
  kidHome:{hair:'#2c1a40',hairD:'#1c1030',hairL:'#5a3c80',skin:'#ffe8dc',eye:'#8a3ad0',top:'#a8e8c8',topD:'#78c4a0',collar:'#c8f4dc',stars:'#ffe050',
    leg:'#a8e8c8',boot:'#ffe8dc',bootD:'#e8c0b0',flower:'#ff7ab4',bear:'#8a5a30',bearL:'#b8885a'},
  // 夢の住人（半透明の亡者たち）
  miyako:{hair:'#1a1a2a',hairD:'#101018',hairL:'#3a3a5a',skin:'#e8f0ff',eye:'#24304a',top:'#c4d4f0',topD:'#8ea2c8',inner:'#e8f0ff',innerD:'#b8c8e4',
    bottom:'#7a8ac0',bottomD:'#5a6a9a',shoe:'#2a2a3a',shoeD:'#1a1a24',hat:'eboshi'},
  worker:{hair:'#3a3020',hairD:'#2a2014',hairL:'#5a4a30',skin:'#e8f0f0',eye:'#203030',top:'#6a8aa0',topD:'#4a6a80',inner:'#8aa8bc',innerD:'#6a8aa0',
    bottom:'#4a6a80',bottomD:'#344e60',shoe:'#2a2a2a',shoeD:'#1a1a1a',hat:'helmet',hatC:'#f0c430',hatD:'#b08a10'},
  teacher:{hair:'#6a4028',hairD:'#4a2a18',hairL:'#8a5a38',skin:'#fff0ec',eye:'#4a2a20',top:'#f0d8e8',topD:'#d0b0c8',inner:'#ff9ab8',innerD:'#e07898',
    bottom:'#5a6a9a',bottomD:'#40507a',shoe:'#f0f0f0',shoeD:'#b0b0b8',hat:'bun',apron:'#ff9ab8',long:false},
  sleeper:{hair:'#4a4058',hairD:'#30283c',hairL:'#6a607a',skin:'#eef0ff',eye:'#30284a',top:'#9ab0e0',topD:'#7088c0',inner:'#b8c8f0',innerD:'#9ab0e0',
    bottom:'#7088c0',bottomD:'#5068a0',shoe:'#d8d8f0',shoeD:'#a8a8c8',long:false,messy:true},
};
const SPR={};
function outline(c){
  const g=c.getContext('2d'),w=c.width,h=c.height,d=g.getImageData(0,0,w,h),p=d.data;
  const a=new Uint8Array(w*h);for(let i=0;i<w*h;i++)a[i]=p[i*4+3]>40?1:0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(a[i])continue;
    if((x>0&&a[i-1])||(x<w-1&&a[i+1])||(y>0&&a[i-w])||(y<h-1&&a[i+w])){p[i*4]=20;p[i*4+1]=10;p[i*4+2]=36;p[i*4+3]=255;}}
  g.putImageData(d,0,0);
}
function sprite(key,dir,fr,pose,ex){
  const k=key+dir+fr+(pose||'')+(ex||'');
  if(SPR[k])return SPR[k];
  const c=document.createElement('canvas');c.width=SW;c.height=SH;const g=c.getContext('2d');
  if(dir==='l'){g.translate(SW,0);g.scale(-1,1);}
  const P=PAL[key];const d=dir==='l'?'r':dir;
  if(key==='mina')paintGown(g,P,d,fr,pose,ex);
  else if(key==='kidOut'||key==='kidHome')paintKid(g,P,d,fr,pose,ex);
  else paintHuman(g,P,d,fr,pose,ex);
  outline(c);
  SPR[k]=c;return c;
}
function painter(g){return (x,y,w,h,c)=>{if(!c||w<=0||h<=0)return;g.fillStyle=c;g.fillRect(x,y,w,h);};}
function paintHuman(g,P,dir,fr,pose,ex){
  const r=painter(g);
  const st=fr===1?1:fr===3?-1:0, by=st?-1:0;
  const gl=P.glasses;
  const legs=()=>{
    if(dir==='r'){
      if(!st){r(10,22,4,4,P.bottom);r(10,26,5,2,P.shoe);r(10,27,5,1,P.shoeD);}
      else{r(8,22,3,3,P.bottomD);r(7,25,3,2,P.shoeD);r(12,22,3,4,P.bottom);r(12,26,4,2,P.shoe);r(12,27,4,1,P.shoeD);}
      return;
    }
    const lf=26+(st===1?1:st===-1?-1:0),rf=26+(st===-1?1:st===1?-1:0);
    r(9,22,3,lf-22,P.bottom);r(12,22,3,rf-22,P.bottomD);
    r(9,lf,3,2,P.shoe);r(9,lf+1,3,1,P.shoeD);r(12,rf,3,2,P.shoe);r(12,rf+1,3,1,P.shoeD);
  };
  const cast=pose==='cast',win=pose==='win';
  if(dir==='d'){
    if(P.tail){r(17,18+by,2,3,P.hair);r(18,16+by,2,2,P.hair);}
    if(P.long)r(6,8+by,12,10,P.hairD);
    legs();
    r(8,15+by,8,7,P.top);r(10,15+by,4,7,P.inner);
    if(P.hood){r(11,15+by,2,7,P.innerD);}
    else{r(10,16+by,4,1,P.innerD);r(10,18+by,4,1,P.innerD);r(10,20+by,4,1,P.innerD);}
    r(8,15+by,1,7,P.topD);r(15,15+by,1,7,P.topD);
    if(P.apron){r(9,17+by,6,6,P.apron);r(10,16+by,4,1,P.apron);}
    if(P.hood)r(8,14+by,8,1,P.topD);
    const aL=st===1?-1:st===-1?1:0;
    if(cast){r(6,10+by,2,6,P.top);r(6,9+by,2,1,P.skin);r(16,10+by,2,6,P.top);r(16,9+by,2,1,P.skin);}
    else{
      r(6,15+by,2,5,P.top);r(6,20+by+aL,2,1,P.skin);
      if(win){r(16,9+by,2,6,P.top);r(16,8+by,2,1,P.skin);}
      else{r(16,15+by,2,5,P.top);r(16,20+by-aL,2,1,P.skin);}
    }
    // 頭
    r(8,7+by,8,7,P.skin);r(9,14+by,6,1,P.skin);
    r(8,4+by,8,1,P.hair);r(7,5+by,10,3,P.hair);r(7,8+by,1,6,P.hair);r(16,8+by,1,6,P.hair);
    r(9,8+by,1,1,P.hair);r(12,8+by,1,1,P.hair);r(14,8+by,1,1,P.hair);r(9,5+by,4,1,P.hairL);
    if(P.messy){r(6,4+by,2,2,P.hair);r(15,3+by,2,2,P.hair);}
    if(ex==='closed'||ex==='hurt'){r(9,11+by,2,1,P.eye);r(13,11+by,2,1,P.eye);if(ex==='hurt'){r(9,10+by,1,1,P.eye);r(14,10+by,1,1,P.eye);}}
    else if(ex==='happy'||win){r(9,11+by,2,1,P.eye);r(13,11+by,2,1,P.eye);r(9,12+by,1,1,P.skin);}
    else{r(9,11+by,2,2,P.eye);r(13,11+by,2,2,P.eye);r(9,11+by,1,1,'#ffffff');r(13,11+by,1,1,'#ffffff');}
    if(gl){r(8,10+by,3,1,gl);r(13,10+by,3,1,gl);r(11,10+by,2,1,gl);}
    r(11,13+by,2,1,'#d07890');r(8,12+by,1,1,'#f8a8b8');r(15,12+by,1,1,'#f8a8b8');
    if(P.ears){r(7,2+by,3,3,P.hair);r(8,3+by,1,2,P.ears);r(14,2+by,3,3,P.hair);r(15,3+by,1,2,P.ears);}
    if(P.flower){r(6,8+by,2,2,P.flower);r(6,8+by,1,1,'#fff0f8');}
    hat(r,P,'d',by);
  }else if(dir==='u'){
    legs();
    r(8,15+by,8,7,P.top);r(8,15+by,1,7,P.topD);r(15,15+by,1,7,P.topD);
    if(P.hood)r(9,15+by,6,3,P.topD);
    if(P.tail){r(11,21+by,2,4,P.hair);r(13,24+by,2,2,P.hair);}
    const aL=st===1?1:st===-1?-1:0;
    if(cast){r(6,10+by,2,6,P.top);r(6,9+by,2,1,P.skin);r(16,10+by,2,6,P.top);r(16,9+by,2,1,P.skin);}
    else if(pose==='atk'){r(6,15+by,2,5,P.top);r(16,10+by,2,6,P.top);r(16,9+by,2,1,P.skin);}
    else{r(6,15+by,2,5,P.top);r(6,20+by+aL,2,1,P.skin);r(16,15+by,2,5,P.top);r(16,20+by-aL,2,1,P.skin);}
    r(8,4+by,8,1,P.hair);r(7,5+by,10,9,P.hair);
    if(P.long){r(6,8+by,12,10,P.hair);r(11,9+by,1,8,P.hairD);r(8,12+by,1,5,P.hairD);r(15,12+by,1,5,P.hairD);}
    else r(8,14+by,8,1,P.hairD);
    r(9,5+by,4,1,P.hairL);
    if(P.messy){r(6,4+by,2,2,P.hair);r(15,3+by,2,2,P.hair);}
    if(P.ears){r(7,2+by,3,3,P.hair);r(14,2+by,3,3,P.hair);}
    if(P.flower){r(16,8+by,2,2,P.flower);}
    hat(r,P,'u',by);
  }else{
    if(P.tail){r(5,18+by,2,2,P.hair);r(3,16+by,2,3,P.hair);r(2,14+by,2,2,P.hair);}
    if(P.long)r(6,9+by,5,9,P.hairD);
    legs();
    r(9,15+by,6,7,P.top);r(14,15+by,1,7,P.inner);r(9,15+by,1,7,P.topD);
    if(P.apron)r(13,17+by,2,6,P.apron);
    if(P.hood)r(8,14+by,4,3,P.topD);
    const sw=st;
    if(cast){r(12,9+by,2,7,P.topD);r(12,8+by,2,1,P.skin);}
    else if(win){r(13,9+by,2,6,P.topD);r(13,8+by,2,1,P.skin);}
    else{r(11+sw,15+by,2,5,P.topD);r(11+sw,20+by,2,1,P.skin);}
    r(10,7+by,6,7,P.skin);r(16,10+by,1,1,P.skin);r(11,14+by,4,1,P.skin);
    r(6,5+by,7,9,P.hair);r(9,4+by,7,1,P.hair);r(9,5+by,8,3,P.hair);r(15,8+by,1,1,P.hair);r(10,5+by,4,1,P.hairL);
    if(P.messy){r(7,3+by,2,2,P.hair);}
    if(ex==='closed'||ex==='hurt'||ex==='happy')r(14,11+by,2,1,P.eye);
    else{r(14,11+by,1,2,P.eye);}
    if(gl){r(13,10+by,3,1,gl);r(10,10+by,3,1,gl);r(16,10+by,1,2,gl);}
    r(15,13+by,1,1,'#d07890');r(13,12+by,1,1,'#f8a8b8');
    if(P.ears){r(8,2+by,3,3,P.hair);r(9,3+by,1,2,P.ears);r(12,2+by,3,3,P.hair);r(13,3+by,1,2,P.ears);}
    if(P.flower){r(8,8+by,2,2,P.flower);r(8,8+by,1,1,'#fff0f8');}
    hat(r,P,'r',by);
  }
}
function hat(r,P,dir,by){
  if(P.hat==='top'){
    if(dir==='u'){r(9,0+by,4,3,P.hatC);r(9,2+by,4,1,P.hatD);r(8,3+by,7,1,P.hatC);}
    else if(dir==='r'){r(10,0+by,4,3,P.hatC);r(10,2+by,4,1,P.hatD);r(8,3+by,8,1,P.hatC);}
    else{r(12,0+by,4,3,P.hatC);r(12,2+by,4,1,P.hatD);r(10,3+by,7,1,P.hatC);r(13,0+by,1,1,'#ffb8d4');}
  }else if(P.hat==='eboshi'){
    r(9,-1+by+1,6,5,'#16161e');r(10,0+by,4,1,'#2a2a3a');r(dir==='r'?13:dir==='u'?9:14,-1+by+1,2,2,'#16161e');
  }else if(P.hat==='helmet'){
    r(7,3+by,10,4,P.hatC);r(7,6+by,10,1,P.hatD);r(6,7+by,12,1,P.hatD);r(9,3+by,3,1,'#fff0a0');
  }else if(P.hat==='bun'){
    r(10,1+by,4,3,P.hair);r(11,1+by,2,1,P.hairL);
  }
}
function paintGown(g,P,dir,fr,pose,ex){
  const r=painter(g);
  const wv=fr%2;
  if(dir==='d'){
    r(5,7,14,14,P.hairD);for(let i=0;i<7;i++)r(5+i*2,21,1,1+((i+wv)%2),P.hairD);
    r(8,15,8,6,P.gown);r(7,19,10,4,P.gown);r(6,22,12,4,P.gown);
    for(let i=0;i<6;i++)r(6+i*2+wv,26,1,1,P.gown);
    r(8,15,1,7,P.gownD);r(15,15,1,7,P.gownD);r(10,15,4,1,P.gownD);r(11,16,2,1,P.gownD);r(7,23,1,3,P.gownD);r(16,23,1,3,P.gownD);
    if(pose==='cast'){r(6,9,2,7,P.gown);r(6,8,2,1,P.skin);r(16,9,2,7,P.gown);r(16,8,2,1,P.skin);}
    else{r(6,15,2,6,P.gown);r(6,21,2,1,P.skin);r(16,15,2,6,P.gown);r(16,21,2,1,P.skin);}
    r(8,7,8,7,P.skin);r(9,14,6,1,P.skin);
    r(8,4,8,1,P.hair);r(7,5,10,3,P.hair);r(7,8,1,8,P.hair);r(16,8,1,8,P.hair);r(10,8,1,1,P.hair);r(13,8,1,1,P.hair);r(9,5,3,1,P.hairL);
    if(ex==='closed'||ex==='hurt'){r(9,11,2,1,P.eye);r(13,11,2,1,P.eye);}
    else if(ex==='happy'||pose==='win'){r(9,11,2,1,P.eye);r(13,11,2,1,P.eye);}
    else{r(9,10,2,2,P.eye);r(13,10,2,2,P.eye);r(9,10,1,1,'#e0ffff');r(13,10,1,1,'#e0ffff');}
    r(11,13,2,1,'#88aac0');r(8,12,1,1,'#ffc0d8');r(15,12,1,1,'#ffc0d8');
    r(14,5,2,2,P.shell);r(14,5,1,1,'#ffffff');
  }else if(dir==='u'){
    r(8,15,8,6,P.gown);r(7,19,10,4,P.gown);r(6,22,12,4,P.gown);for(let i=0;i<6;i++)r(6+i*2+wv,26,1,1,P.gown);
    r(6,15,2,6,P.gown);r(16,15,2,6,P.gown);
    if(pose==='cast'){r(6,9,2,7,P.gown);r(16,9,2,7,P.gown);}
    r(8,4,8,1,P.hair);r(6,5,12,15,P.hair);for(let i=0;i<6;i++)r(6+i*2,20,1,1+((i+wv)%2),P.hair);
    r(9,6,1,12,P.hairD);r(13,6,1,13,P.hairD);r(10,5,3,1,P.hairL);r(16,7,1,10,P.hairL);
    r(8,5,2,2,P.shell);
  }else{
    r(3,8,8,12,P.hairD);for(let i=0;i<4;i++)r(2+i*2,19+((i+wv)%2),2,1,P.hairD);r(1,10,2,6,P.hairD);
    r(8,15,7,6,P.gown);r(7,19,9,4,P.gown);r(6,22,11,4,P.gown);for(let i=0;i<5;i++)r(6+i*2+wv,26,1,1,P.gown);
    r(14,15,1,7,P.gownD);
    if(pose==='cast'){r(12,9,2,7,P.gown);r(12,8,2,1,P.skin);}else{r(11,15,2,6,P.gownD);r(11,21,2,1,P.skin);}
    r(10,7,6,7,P.skin);r(16,10,1,1,P.skin);r(11,14,4,1,P.skin);
    r(6,5,7,9,P.hair);r(9,4,7,1,P.hair);r(9,5,8,3,P.hair);r(15,8,1,1,P.hair);r(10,5,3,1,P.hairL);
    if(ex==='closed'||ex==='hurt'||ex==='happy')r(14,11,2,1,P.eye);else{r(14,10,1,2,P.eye);}
    r(15,13,1,1,'#88aac0');r(8,6,2,2,P.shell);
  }
}
function paintKid(g,P,dir,fr,pose,ex){
  const r=painter(g);
  const st=fr===1?1:fr===3?-1:0,by=st?-1:0;
  const hatOn=!!P.hat;
  if(dir==='r'){
    const f1=st?1:0;
    r(10-f1,24,2,2,P.leg);r(13+f1,24,2,2,P.leg);r(10-f1,26,3,2,P.boot);r(13+f1,26,3,2,P.boot);r(10-f1,27,3,1,P.bootD);r(13+f1,27,3,1,P.bootD);
    r(9,19+by,7,5,P.top);r(8,22+by,8,2,P.top);r(9,19+by,1,5,P.topD);
    if(P.stars){r(10,20+by,1,1,P.stars);r(12,22+by,1,1,P.stars);r(11,25,1,1,P.stars);}
    r(15,18+by,4,5,P.bear);r(15,16+by,4,3,P.bear);r(18,15+by,1,1,P.bear);r(15,15+by,1,1,P.bearL);r(18,17+by,1,1,'#d8a878');r(17,16+by,1,1,'#1a0a0a');
    r(13,20+by,2,2,P.skin);
    r(6,8+by,8,10,P.hair);r(11,11+by,6,7,P.skin);r(17,14+by,1,1,P.skin);r(8,9+by,9,3,P.hair);r(15,12+by,1,1,P.hair);
    r(9,9+by,3,1,P.hairL);
    r(5,12+by,2,3,P.hair);r(6,11+by,2,2,P.flower);r(6,11+by,1,1,'#ffe0f0');
    if(ex==='closed')r(15,15+by,2,1,P.eye);else{r(15,14+by,2,3,P.eye);r(15,14+by,1,1,'#ffffff');}
    r(14,16+by,1,1,'#ff9ab0');r(16,17+by,1,1,'#d06070');
    if(hatOn){r(7,5+by,9,4,P.hat);r(7,8+by,9,1,P.hatD);r(6,9+by,12,1,P.hatD);r(9,5+by,2,1,'#fff4a0');}
    return;
  }
  const lf=26+(st===1?1:st===-1?-1:0),rf=26+(st===-1?1:st===1?-1:0);
  r(9,24,2,lf-24,P.leg);r(13,24,2,rf-24,P.leg);
  r(9,lf,2,2,P.boot);r(9,lf+1,2,1,P.bootD);r(13,rf,2,2,P.boot);r(13,rf+1,2,1,P.bootD);
  r(8,19+by,8,5,P.top);r(7,22+by,10,2,P.top);r(8,19+by,1,4,P.topD);r(15,19+by,1,4,P.topD);
  if(P.stars){r(9,22+by,1,1,P.stars);r(14,20+by,1,1,P.stars);r(13,23+by,1,1,P.stars);r(10,25,1,1,P.stars);}
  if(dir==='d'){
    r(10,19+by,4,1,P.collar);
    r(6,19+by,2,4,P.top);r(16,19+by,2,4,P.top);
    // クマ（左耳がほつれている）
    r(9,20+by,6,3,P.bear);r(9,16+by,6,4,P.bear);r(14,15+by,1,1,P.bear);r(9,15+by,1,1,P.bearL);r(8,14+by,1,1,P.bearL);
    r(10,17+by,1,1,'#1a0a0a');r(13,17+by,1,1,'#1a0a0a');r(11,18+by,2,1,'#d8a878');r(11,18+by,1,1,'#3a1a10');
    r(8,21+by,1,1,P.skin);r(15,21+by,1,1,P.skin);
    // 頭（ぱっつん前髪のボブ）
    r(7,8+by,10,3,P.hair);r(6,10+by,2,7,P.hair);r(16,10+by,2,7,P.hair);
    r(8,11+by,8,6,P.skin);r(9,17+by,6,1,P.skin);
    r(8,11+by,8,2,P.hair);r(9,9+by,3,1,P.hairL);
    r(4,11+by,2,3,P.hair);r(18,11+by,2,3,P.hair);r(4,10+by,2,2,P.flower);r(18,10+by,2,2,P.flower);r(4,10+by,1,1,'#ffe0f0');r(18,10+by,1,1,'#ffe0f0');
    if(ex==='closed'){r(9,14+by,2,1,P.eye);r(13,14+by,2,1,P.eye);}
    else if(ex==='happy'){r(9,14+by,2,1,P.eye);r(13,14+by,2,1,P.eye);r(9,13+by,1,1,P.eye);r(14,13+by,1,1,P.eye);}
    else{r(9,13+by,2,3,P.eye);r(13,13+by,2,3,P.eye);r(9,13+by,1,1,'#ffffff');r(13,13+by,1,1,'#ffffff');}
    r(8,15+by,1,1,'#ff9ab0');r(15,15+by,1,1,'#ff9ab0');r(11,16+by,2,1,'#d06070');
    if(hatOn){r(7,5+by,10,4,P.hat);r(7,8+by,10,1,P.hatD);r(6,9+by,12,1,P.hatD);r(9,5+by,3,1,'#fff4a0');}
  }else{
    r(6,19+by,2,4,P.top);r(16,19+by,2,4,P.top);r(6,23+by,2,1,P.skin);r(16,23+by,2,1,P.skin);
    r(7,8+by,10,3,P.hair);r(6,10+by,12,8,P.hair);r(11,11+by,1,6,P.hairD);r(9,9+by,3,1,P.hairL);
    r(4,11+by,2,3,P.hair);r(18,11+by,2,3,P.hair);r(4,10+by,2,2,P.flower);r(18,10+by,2,2,P.flower);
    if(hatOn){r(7,5+by,10,4,P.hat);r(7,8+by,10,1,P.hatD);r(6,9+by,12,1,P.hatD);}
  }
}

// ══════════════════════════════════════════════════════════
// タイル（16×16）。マップごとに一度だけ下絵のキャンバスへ描いておき、毎フレームはそれを貼るだけ
//   '#' 壁（下が床なら壁面、それ以外は天井）  '.' 床  ',' 道・敷物  ':' 床＋飾り  '_' 板張り
//   '~' 水・渦（通れない）  ' ' 底なしの闇  '=' コンベア（通れない）  'w' 低い柵（通れない）
// ══════════════════════════════════════════════════════════
const TS=16;
const SOLID_T={'#':1,'~':1,' ':1,'=':1,'w':1};
const THEMES={
  home:   {bg:'#07060e',fl:['#3c3654','#35304c','#2f2a44'],alt:['#4e4a6c','#46425f'],top:'#0b0916',face:['#2e2846','#26203c','#1c182e'],style:'paper',snow:null,ray:null},
  ruins:  {bg:'#02040e',fl:['#1f2b5c','#1a2550','#243262'],alt:['#3a3c76','#30326a'],top:'#060918',face:['#2c3672','#222c60','#161e48'],style:'rock',deco:'weed',water:['#030818','#0c1c44'],snow:'#cfe2ff',ray:'140,180,255'},
  room:   {bg:'#040312',fl:['#30244e','#2a1f46','#352858'],alt:['#5c2252','#4c1c46'],top:'#090716',face:['#2e285e','#262050','#1a163c'],style:'paper',deco:'weed',water:['#030818','#0c1c44'],snow:'#d8d0ff',ray:'160,140,255'},
  factory:{bg:'#010606',fl:['#1d3537','#182e30','#223c3e'],alt:['#3e3c20','#302e18'],top:'#030c0e',face:['#1c3c3e','#143032','#0c2022'],style:'metal',deco:'bolt',water:['#020c0c','#0a2424'],snow:'#e8b080',ray:'150,255,210'},
  coral:  {bg:'#08031a',fl:['#3b2e62','#352958','#41336c'],alt:['#6c5a7a','#605070'],top:'#10051a',face:['#8e3656','#722a48','#561e36'],style:'coral',deco:'coral',water:['#080420','#1a1242'],snow:'#ffd8ea',ray:'255,180,215'},
  lantern:{bg:'#03020a',fl:['#1e1a36','#1a1630','#231e3e'],alt:['#6c1e2a','#581824'],top:'#05030c',face:['#30202e','#261826','#1a0e1c'],style:'wood',water:['#04061a','#0c1236'],snow:'#ffd0a0',ray:'255,170,110',dark:.5},
  vortex: {bg:'#020004',fl:['#201434','#1a0f2c','#26183e'],alt:['#3e2658','#341e4c'],top:'#07020c',face:['#2e1842','#241236','#1a0a28'],style:'palace',deco:'names',water:['#0c0018','#2a0c48'],snow:'#e0c0ff',ray:'200,120,255',dark:.3},
  abyss:  {bg:'#060104',fl:['#2a0c18','#220a14','#30101e'],alt:['#4a1420','#3c101a'],top:'#0a0206',face:['#3a1018','#2c0c14','#1e080e'],style:'palace',deco:'names',water:['#100206','#3a0c14'],snow:'#ffb0a0',ray:'255,90,90',dark:.2},
};
const tAt=(m,x,y)=>(x<0||y<0||x>=m.w||y>=m.h)?'#':m.t[y][x];
function paintFloor(r,g,m,x,y,th,rn,px,py){
  const st=th.style;
  if(st==='paper'&&m.theme==='home'){
    // 畳
    r(px,py,16,16,th.fl[0]);for(let i=1;i<16;i+=2)r(px,py+i,16,1,th.fl[1]);
    if((x+y)%2===0)r(px,py,1,16,'#1e1a2c');if(y%2===0)r(px,py,16,1,'#1e1a2c');
  }else if(st==='paper'){
    // 板の間
    for(let i=0;i<4;i++){r(px,py+i*4,16,4,i%2?th.fl[0]:th.fl[2]);r(px,py+i*4+3,16,1,th.fl[1]);const j=((x*5+y*3+i*7)%4)*4;r(px+j,py+i*4,1,3,th.fl[1]);}
  }else if(st==='metal'){
    r(px,py,16,16,th.fl[0]);r(px+15,py,1,16,th.fl[1]);r(px,py+15,16,1,th.fl[1]);r(px,py,16,1,th.fl[2]);r(px,py,1,16,th.fl[2]);
    r(px+2,py+2,1,1,'#4a6c6e');r(px+13,py+2,1,1,'#4a6c6e');r(px+2,py+13,1,1,'#4a6c6e');r(px+13,py+13,1,1,'#4a6c6e');
    if(rn()<.25){r(px+4+(rn()*6|0),py+5+(rn()*6|0),3,1,'#10262a');}
  }else if(st==='wood'){
    // 石畳
    r(px,py,16,16,th.fl[0]);r(px,py,16,1,th.fl[1]);r(px,py,1,16,th.fl[1]);r(px+8*((y%2)),py+8,1,8,th.fl[1]);r(px,py+8,16,1,th.fl[1]);
    for(let i=0;i<4;i++)r(px+(rn()*15|0),py+(rn()*15|0),1,1,th.fl[2]);
  }else{
    r(px,py,16,16,th.fl[0]);
    for(let i=0;i<7;i++)r(px+(rn()*16|0),py+(rn()*16|0),1,1,rn()<.5?th.fl[1]:th.fl[2]);
    if(rn()<.35){const yy=py+3+(rn()*10|0),xx=px+(rn()*6|0);r(xx,yy,5+(rn()*5|0),1,th.fl[2]);}
    if(st==='coral'&&rn()<.3)r(px+(rn()*14|0),py+(rn()*14|0),2,1,'#7a4a7a');
    if(st==='palace'&&rn()<.2){r(px+(rn()*12|0),py+(rn()*12|0),3,1,'#3a2456');}
  }
}
function paintTile(g,m,x,y){
  const th=THEMES[m.theme],c=m.t[y][x],px=x*TS,py=y*TS,r=painter(g);
  const rn=srand(((x+1)*7919+(y+1)*104729+(m.seed||1)*31)%2147483646+1);
  const up=tAt(m,x,y-1),dn=tAt(m,x,y+1),lf=tAt(m,x-1,y),rt=tAt(m,x+1,y);
  if(c==='#'){
    if(dn!=='#'&&dn!==' '&&dn!=='~'){paintFace(r,m,x,y,th,rn,px,py);return;}
    r(px,py,16,16,th.top);
    for(let i=0;i<3;i++)r(px+(rn()*16|0),py+(rn()*16|0),1,1,th.face[2]);
    if(lf!=='#')r(px,py,1,16,th.face[0]);if(rt!=='#')r(px+15,py,1,16,th.face[0]);if(up!=='#'&&up!==undefined&&y>0)r(px,py,16,1,th.face[0]);
    if(dn==='~'||dn===' ')r(px,py+15,16,1,th.face[0]);
    return;
  }
  if(c===' '||c==='~'){
    const wc=th.water||['#000','#000'];
    r(px,py,16,16,c===' '?th.bg:wc[0]);
    if(c==='~'){for(let i=0;i<3;i++)r(px+(rn()*13|0),py+(rn()*15|0),3,1,wc[1]);}
    if(up!==' '&&up!=='~'&&up!=='#'){r(px,py,16,4,th.face[1]);r(px,py+4,16,1,th.face[2]);for(let i=0;i<16;i+=4)r(px+i,py,1,4,th.face[2]);}
    return;
  }
  paintFloor(r,g,m,x,y,th,rn,px,py);
  if(c===','){
    const a=th.alt;
    if(m.theme==='room'||m.theme==='lantern'){
      r(px,py,16,16,a[0]);for(let i=2;i<16;i+=4)for(let j=2;j<16;j+=4)r(px+i,py+j,1,1,a[1]);
      const gold=m.theme==='room'?'#c89a3a':'#d8a838';
      if(up!==',')r(px,py+1,16,1,gold);if(dn!==',')r(px,py+14,16,1,gold);if(lf!==',')r(px+1,py,1,16,gold);if(rt!==',')r(px+14,py,1,16,gold);
    }else if(m.theme==='factory'){
      r(px,py,16,16,a[0]);for(let i=0;i<16;i+=2)r(px+i,py+(i%4?7:8),1,1,a[1]);
      if(up!==',')for(let i=0;i<16;i+=4){r(px+i,py,2,2,'#d8b020');r(px+i+2,py,2,2,'#1a1a10');}
      if(dn!==',')for(let i=0;i<16;i+=4){r(px+i,py+14,2,2,'#d8b020');r(px+i+2,py+14,2,2,'#1a1a10');}
    }else{
      // 石の道
      r(px,py,16,16,th.fl[1]);
      [[1,1,6,6],[9,1,6,6],[1,9,6,6],[9,9,6,6]].forEach(([a1,b1,w,h],i)=>{const o=(y%2&&i%2)?1:0;r(px+a1+o,py+b1,w,h,i%3?a[0]:a[1]);r(px+a1+o,py+b1,w,1,'rgba(255,255,255,.08)');});
    }
  }else if(c==='_'){
    for(let i=0;i<4;i++){r(px+i*4,py,4,16,i%2?'#4a3428':'#553c2e');r(px+i*4+3,py,1,16,'#33241a');}
    r(px+((x*3+y)%4)*4,py+((y*5)%14),3,1,'#33241a');
  }else if(c===':'){
    const d=th.deco;
    if(d==='weed'){for(let k=0;k<3;k++){const bx=px+2+(rn()*12|0),h=4+(rn()*6|0);for(let i=0;i<h;i++)r(bx+((i/3|0)%2),py+14-i,1,1,i<h-2?'#1c6a5a':'#3aa080');}}
    else if(d==='coral'){const bx=px+3+(rn()*8|0);r(bx,py+8,1,6,'#e0607a');r(bx-2,py+8,2,1,'#e0607a');r(bx-2,py+5,1,3,'#e0607a');r(bx+1,py+6,3,1,'#ff8aa0');r(bx+3,py+3,1,3,'#ff8aa0');r(bx+6,py+11,2,2,'#ffb070');}
    else if(d==='bolt'){r(px+4,py+6,8,5,'#0e2022');r(px+5,py+7,5,2,'#162c2e');r(px+11,py+3,2,2,'#5a7a7c');}
    else if(d==='names'){for(let k=0;k<3;k++)r(px+(rn()*14|0),py+(rn()*14|0),2,1,'#6a4a9a');}
    else{r(px+5,py+6,6,4,th.fl[2]);}
  }else if(c==='='){
    r(px,py,16,16,'#283a3c');r(px,py+1,16,2,'#5a7a7c');r(px,py+13,16,2,'#5a7a7c');r(px,py+3,16,10,'#33474a');
    for(let i=0;i<16;i+=4)r(px+i,py+3,1,10,'#203234');
  }else if(c==='w'){
    const st=th.style;
    if(st==='coral'){r(px,py+4,16,2,'#e8e0f0');for(let i=1;i<16;i+=5){r(px+i,py+1,2,12,'#f4eefc');r(px+i,py+1,2,1,'#ffffff');}r(px,py+10,16,2,'#d0c4e0');r(px,py+13,16,2,'rgba(0,0,0,.35)');}
    else if(st==='metal'){r(px,py+3,16,2,'#e8b830');r(px,py+9,16,2,'#e8b830');for(let i=0;i<16;i+=8)r(px+i,py+3,2,11,'#8a6a18');}
    else if(st==='wood'||st==='palace'){r(px,py+4,16,3,'#6a1c24');r(px,py+4,16,1,'#a83a40');for(let i=2;i<16;i+=7)r(px+i,py+4,2,10,'#4a1018');r(px,py+13,16,2,'rgba(0,0,0,.35)');}
    else{[[0,7,7,7],[6,4,6,9],[11,8,5,6]].forEach(([a1,b1,w,h])=>{r(px+a1,py+b1,w,h,th.face[1]);r(px+a1,py+b1,w,1,th.face[0]);});}
  }
  // 壁ぎわの影
  if(up==='#')r(px,py,16,3,'rgba(0,0,10,.38)');
}
function paintFace(r,m,x,y,th,rn,px,py){
  const f=th.face,st=th.style;
  if(st==='rock'){
    r(px,py,16,16,f[1]);
    const rows=[[0,5],[5,6],[11,5]];
    rows.forEach(([yy,hh],i)=>{let xx=-((x*7+i*5)%9);while(xx<16){const w=6+(((xx+i*3+x)*13)%5);r(px+Math.max(0,xx),py+yy,Math.min(w-1,16-Math.max(0,xx)),hh-1,f[(i+xx)%2?1:0]);r(px+Math.max(0,xx),py+yy+hh-1,Math.min(w,16-Math.max(0,xx)),1,f[2]);xx+=w;}});
    r(px,py,16,1,f[0]);
  }else if(st==='paper'){
    for(let i=0;i<16;i+=4){r(px+i,py,2,11,f[0]);r(px+i+2,py,2,11,f[1]);}
    r(px,py+11,16,5,m.theme==='home'?'#3a2a2a':'#2a1c2e');r(px,py+11,16,1,'#5a4a5e');r(px,py+15,16,1,'#140e1a');
  }else if(st==='metal'){
    r(px,py,16,16,f[1]);r(px+(x%2?0:15),py,1,16,f[2]);r(px,py+3,16,4,'#2a5a5c');r(px,py+3,16,1,'#5a8a8a');r(px,py+6,16,1,'#163a3c');
    if(x%3===0){r(px+6,py+2,4,6,'#3a6a6c');}
    r(px+3,py+11,1,1,'#4a6c6e');r(px+12,py+11,1,1,'#4a6c6e');r(px,py+15,16,1,f[2]);
  }else if(st==='coral'){
    r(px,py,16,16,f[1]);
    for(let i=0;i<6;i++){const a1=rn()*14|0,b1=rn()*12|0;r(px+a1,py+b1,3,3,f[0]);r(px+a1,py+b1,1,1,'#ff9ab4');}
    for(let i=0;i<3;i++)r(px+(rn()*15|0),py+(rn()*15|0),1,1,'#ffd0a0');r(px,py+15,16,1,f[2]);
  }else if(st==='wood'){
    r(px,py,16,16,f[1]);for(let i=0;i<16;i+=4)r(px+i,py,1,16,f[2]);
    if(x%3===0){r(px+5,py,6,16,'#7a1c26');r(px+5,py,1,16,'#a83a40');r(px+10,py,1,16,'#4a1018');}
    r(px,py,16,2,'#140a14');
  }else{
    r(px,py,16,16,f[1]);r(px,py,16,1,f[0]);
    for(let i=1;i<16;i+=5)r(px+i,py+2,1,10,f[2]);for(let j=2;j<13;j+=5)r(px,py+j,16,1,f[2]);
    r(px+1,py+3,14,8,'rgba(150,110,200,.12)');if(rn()<.4)r(px+3+(rn()*8|0),py+4,3,4,f[2]);
    r(px,py+13,16,3,'#140a1e');
  }
}

// ── 小物（マップに置く家具や柱）。x,y はタイル左上のドット座標 ──
//   w,h: タイル数  solid:[dx,dy,w,h] 通れない範囲  glow: 光源（暗いマップで明かりになる）
const PROPS={
  roof:{w:3,h:2,solid:[0,0,3,2],draw(g,x,y){const r=painter(g);
    // 沈んだ瓦屋根（棟と、反りのある軒）
    r(x+1,y+12,46,18,'#151b44');
    for(let i=0;i<6;i++){const yy=y+12+i*3;r(x+2,yy,44,2,i%2?'#2a3474':'#323e86');for(let k=0;k<44;k+=4)r(x+2+k+(i%2)*2,yy,1,2,'#141a40');}
    r(x+0,y+28,48,3,'#10143a');r(x-2,y+26,4,3,'#2a3474');r(x+46,y+26,4,3,'#2a3474');
    r(x+6,y+4,36,8,'#222a62');for(let k=0;k<36;k+=4)r(x+6+k,y+4,1,8,'#141a40');
    r(x+4,y+2,40,3,'#3a4a9a');r(x+4,y+2,40,1,'#5a6ac0');r(x+2,y+1,4,3,'#3a4a9a');r(x+42,y+1,4,3,'#3a4a9a');
    r(x+20,y+0,8,2,'#5a6ac0');r(x+26,y+16,8,4,'#0a0e24');
    r(x+3,y+24,2,6,'#1c6a5a');r(x+4,y+21,1,3,'#2a8a6a');r(x+40,y+20,2,10,'#2a8a6a');r(x+41,y+17,1,3,'#4ac090');}},
  torii:{w:3,h:3,solid:[[0,2,1,1],[2,2,1,1]],draw(g,x,y){const r=painter(g);
    r(x+4,y+10,5,38,'#8a2a34');r(x+4,y+10,1,38,'#b04a50');r(x+39,y+10,5,38,'#8a2a34');r(x+39,y+10,1,38,'#b04a50');
    r(x-2,y+3,52,5,'#7a2430');r(x-2,y+3,52,1,'#b04a50');r(x-4,y+1,6,3,'#7a2430');r(x+46,y+1,6,3,'#7a2430');
    r(x+2,y+8,44,3,'#2a1018');r(x+0,y+16,48,3,'#8a2a34');r(x+0,y+16,48,1,'#b04a50');r(x+21,y+8,6,8,'#5a1a24');
    r(x+3,y+46,7,2,'#2a1018');r(x+38,y+46,7,2,'#2a1018');}},
  kelp:{w:1,h:2,anim:1,draw(g,x,y,t,o){const r=painter(g),ph=(o.x*0.7+o.y*1.3);
    for(let s=0;s<3;s++){const bx=x+3+s*4;const hh=18+((s*7+o.x)%3)*5;for(let i=0;i<hh;i++){const sw=Math.round(Math.sin(t*1.6+ph+s+i*.18)*(i/10));r(bx+sw,y+31-i,2,1,i>hh-4?'#4ac090':s%2?'#1c6a5a':'#2a8a6a');}}}},
  rock:{w:1,h:1,solid:[0,0,1,1],draw(g,x,y,t,o){const r=painter(g),th=THEMES[o.m.theme];r(x+1,y+15,14,2,'rgba(0,0,0,.35)');r(x+1,y+6,14,9,th.face[1]);r(x+3,y+3,10,4,th.face[0]);r(x+2,y+5,3,2,th.face[0]);r(x+4,y+3,4,1,'#5a6ac0');r(x+1,y+13,14,2,th.face[2]);r(x+9,y+8,3,3,th.face[2]);r(x+11,y+4,2,2,'#2a8a6a');}},
  chest:{w:1,h:1,solid:[0,0,1,1],draw(g,x,y,t,o){const r=painter(g),op=o.open;
    r(x+1,y+6,14,9,'#6a3a20');r(x+1,y+6,14,1,'#9a5a30');r(x+1,y+10,14,1,'#e8b830');r(x+7,y+9,2,3,'#ffe070');r(x+1,y+14,14,1,'#3a1a0c');
    if(op){r(x+1,y+1,14,4,'#4a2614');r(x+2,y+5,12,2,'#1a0a04');const s=(t*4|0)%4;r(x+7,y+1-s,1,1,'#fff6c0');}
    else{r(x+1,y+2,14,5,'#7a4426');r(x+1,y+2,14,1,'#b06a3a');r(x+1,y+5,14,1,'#e8b830');r(x+1,y+2,1,5,'#e8b830');r(x+14,y+2,1,5,'#e8b830');}}},
  save:{w:1,h:2,solid:[0,1,1,1],anim:1,glow:[8,10,56,'150,230,255'],draw(g,x,y,t){const r=painter(g);
    r(x+3,y+28,10,3,'#3a4a6a');r(x+6,y+18,4,10,'#4a5a7a');r(x+2,y+14,12,3,'#3a4a6a');r(x+4,y+6,8,8,'#5a6a8a');r(x+1,y+3,14,3,'#3a4a6a');r(x+5,y+0,6,3,'#3a4a6a');
    const f=.5+.5*Math.sin(t*4);r(x+5,y+8,6,5,f>.5?'#e8ffff':'#a8f0ff');r(x+6,y+9,4,3,'#ffffff');
    r(x+7,y-3-(t*6|0)%5,1,1,'#bff8ff');r(x+3+((t*3|0)%9),y+2-((t*5|0)%7),1,1,'#7ae8ff');}},
  toro:{w:1,h:2,solid:[0,1,1,1],anim:1,glow:[8,10,40,'255,170,90'],draw(g,x,y,t,o){const r=painter(g),lit=!o.m.v.dim;
    r(x+3,y+28,10,3,'#2a2a3e');r(x+6,y+18,4,10,'#34344c');r(x+2,y+14,12,3,'#2a2a3e');r(x+4,y+6,8,8,'#34344c');r(x+1,y+3,14,3,'#24243a');r(x+5,y+0,6,3,'#24243a');
    const f=Math.sin(t*9+o.x*2)>0;r(x+6,y+8,4,5,lit?(f?'#ffd070':'#ffb040'):'#1a1420');if(lit)r(x+7,y+9,2,2,'#fff4c0');}},
  desk:{w:4,h:2,solid:[0,1,4,1],anim:1,glow:[32,8,46,'0,232,200'],draw(g,x,y,t,o){const r=painter(g);
    r(x+2,y+16,60,4,'#3a2c5a');r(x+2,y+16,60,1,'#5a4a8a');r(x+4,y+20,3,11,'#241c3c');r(x+57,y+20,3,11,'#241c3c');r(x+2,y+30,60,2,'rgba(0,0,0,.3)');
    r(x+18,y+0,28,15,'#0a0918');r(x+20,y+2,24,11,'#0a3a4a');
    for(let i=0;i<4;i++){const w=6+((i*7+(t*1.5|0))%5)*3;r(x+21,y+3+i*2.5|0,w,1,'rgba(180,255,240,.75)');}
    r(x+30,y+15,4,1,'#1a1830');
    r(x+8,y+9,2,7,'#2a2450');r(x+6,y+5,3,5,'#4a3e7a');r(x+7,y+6,1,1,'#ff4060');
    r(x+48,y+12,8,4,'#1c1838');r(x+50,y+13,4,2,'#2a2650');
    if(o.m.theme==='room'){r(x+0,y+31,64,1,'rgba(0,0,0,0)');}}},
  window:{w:2,h:1,anim:1,draw(g,x,y,t,o){const r=painter(g),morn=o.m.v.morning;
    r(x+3,y+1,26,12,'#1a1430');r(x+4,y+2,24,10,morn?'#ffe2a0':'#0c1838');
    if(morn){r(x+4,y+2,24,4,'#fff0c8');r(x+4,y+9,24,3,'#a8d8f0');}
    else{for(let i=0;i<6;i++){const rx=(i*5+(t*30|0))%24,ry=((i*7+(t*90|0))%12);r(x+4+rx,y+2+ry%9,1,3,'#6a7ab8');}r(x+6,y+8,4,3,'rgba(255,60,160,.35)');}
    r(x+15,y+2,2,10,'#2a2048');r(x+4,y+6,24,1,'#2a2048');}},
  boxes:{w:2,h:1,solid:[0,0,2,1],draw(g,x,y){const r=painter(g);r(x+1,y+4,14,11,'#8a6a40');r(x+1,y+4,14,2,'#a88a58');r(x+7,y+4,2,11,'#c8a870');r(x+15,y+1,15,14,'#7a5a34');r(x+15,y+1,15,2,'#9a7a4a');r(x+21,y+1,3,14,'#b89a62');}},
  chair:{w:1,h:1,solid:[0,0,1,1],draw(g,x,y){const r=painter(g);r(x+3,y-6,10,10,'#2a2050');r(x+3,y+4,10,4,'#3a2e66');r(x+7,y+8,2,5,'#1a1630');r(x+3,y+13,10,2,'#1a1630');}},
  bubbles:{w:1,h:1,solid:[0,0,1,1],anim:1,draw(g,x,y,t){const r=painter(g);
    for(let i=0;i<6;i++){const a=t*2+i*1.1,bx=x+8+Math.cos(a)*5|0,by=y+8+Math.sin(a*1.3)*4-(i%3)*3|0;r(bx-2,by-2,4,4,i%2?'#a8a8c0':'#d8d8e8');r(bx-1,by-1,1,1,'#ffffff');}
    if((t*8|0)%3===0)r(x+(t*37%14|0),y+(t*53%14|0),2,1,'#ff60a0');}},
  futon:{w:3,h:2,high:-1,draw(g,x,y,t,o){const r=painter(g);
    r(x+1,y+2,46,28,'#d8d4e8');r(x+1,y+2,46,2,'#ffffff');r(x+1,y+29,46,2,'#8a86a0');
    r(x+3,y+3,10,8,'#f4f0ff');r(x+35,y+3,10,8,'#f4f0ff');
    r(x+2,y+12,44,17,o.m.v.morning?'#e88aa8':'#a85a7a');r(x+2,y+12,44,2,o.m.v.morning?'#ffb0c8':'#c87a98');
    for(let i=0;i<5;i++)r(x+6+i*8,y+18+(i%2)*4,2,2,'#ffe080');}},
  tank:{w:2,h:3,solid:[0,1,2,2],draw(g,x,y){const r=painter(g);
    r(x+2,y+6,28,40,'#1e4648');r(x+2,y+6,4,40,'#2e6264');r(x+26,y+6,4,40,'#123234');r(x+4,y+2,24,5,'#2a5658');r(x+2,y+16,28,2,'#0e2a2c');r(x+2,y+34,28,2,'#0e2a2c');
    r(x+12,y+22,8,6,'#0a1a1a');r(x+13,y+23,6,2,'#d8a020');r(x+2,y+45,28,2,'rgba(0,0,0,.35)');}},
  crate:{w:1,h:1,solid:[0,0,1,1],draw(g,x,y){const r=painter(g);r(x+1,y+2,14,13,'#5a4228');r(x+1,y+2,14,1,'#7a5a38');r(x+1,y+2,1,13,'#7a5a38');r(x+2,y+3,12,1,'#3a2a18');r(x+2,y+8,12,1,'#3a2a18');r(x+4,y+3,1,12,'#3a2a18');r(x+11,y+3,1,12,'#3a2a18');}},
  locker:{w:3,h:2,solid:[0,1,3,1],draw(g,x,y){const r=painter(g);
    for(let i=0;i<3;i++){const lx=x+i*16;r(lx+1,y+2,14,29,'#2a4a50');r(lx+1,y+2,14,1,'#4a6a70');r(lx+14,y+2,1,29,'#16282c');r(lx+4,y+6,8,1,'#16282c');r(lx+4,y+8,8,1,'#16282c');r(lx+4,y+10,8,1,'#16282c');r(lx+12,y+17,2,4,'#a0b8b8');}
    r(x+17,y+20,12,8,'#ffe8b0');r(x+19,y+22,2,3,'#e83055');r(x+23,y+21,4,5,'#4a7ad8');}},
  panel:{w:2,h:2,solid:[0,1,2,1],anim:1,glow:[16,12,30,'255,80,100'],draw(g,x,y,t,o){const r=painter(g),ok=o.m.v.fixed;
    r(x+2,y+2,28,28,'#1c3034');r(x+2,y+2,28,1,'#3a5a5e');r(x+29,y+2,1,28,'#0c1a1c');
    for(let a=0;a<3;a++)for(let b=0;b<3;b++){const on=Math.sin(t*(2+a+b)+a*3+b)>0;r(x+6+b*5,y+6+a*4,3,2,on?(ok?'#44ee88':['#e8b830','#44ee88','#e83055'][(a+b)%3]):'#203034');}
    r(x+6,y+20,20,6,ok?'#0a3a20':'#3a0a14');r(x+8,y+22,ok?8:14,2,ok?'#44ee88':'#ff5070');}},
  press:{w:4,h:3,solid:[0,1,4,2],anim:1,glow:[32,6,40,'255,170,40'],draw(g,x,y,t,o){const r=painter(g),ram=o.m.v.stopped?0:Math.round((Math.sin(t*2.2)+1)*4);
    r(x+2,y+0,60,8,'#2a4446');r(x+2,y+0,60,1,'#4a6a6c');r(x+4,y+8,6,38,'#22383a');r(x+54,y+8,6,38,'#22383a');
    r(x+14,y+10+ram,36,10,'#3a5658');r(x+14,y+10+ram,36,1,'#5a7a7c');r(x+20,y+8,4,3+ram,'#5a7a7c');r(x+40,y+8,4,3+ram,'#5a7a7c');
    r(x+10,y+34,44,10,'#1c3032');for(let i=0;i<6;i++)r(x+10+i*8,y+44,4,2,'#d8a020');
    const bl=(t*3|0)%2;r(x+30,y+2,4,4,bl?'#ffb030':'#7a4a10');}},
  coral:{w:1,h:2,solid:[0,1,1,1],anim:1,draw(g,x,y,t,o){const r=painter(g),c=['#ff6e8a','#ff9a60','#e06ac8'][(o.x+o.y)%3];
    const sw=Math.round(Math.sin(t+o.x)*1);
    r(x+7,y+14,2,17,c);r(x+3+sw,y+8,2,8,c);r(x+3+sw,y+14,5,2,c);r(x+11-sw,y+4,2,10,c);r(x+9,y+12,4,2,c);r(x+1+sw,y+5,2,4,c);r(x+13-sw,y+1,2,4,c);
    r(x+3+sw,y+7,2,1,'#ffd0dc');r(x+11-sw,y+3,2,1,'#ffd0dc');r(x+5,y+30,7,2,'rgba(0,0,0,.3)');}},
  jelly:{w:1,h:1,anim:1,high:1,glow:[8,4,24,'255,170,230'],draw(g,x,y,t,o){const r=painter(g),by=y-18+Math.round(Math.sin(t*1.2+o.x)*3),c=o.x%2?'#ffb0e0':'#a8e0ff';
    r(x+3,by,10,5,c);r(x+4,by-1,8,1,c);r(x+5,by+1,2,1,'#ffffff');for(let i=0;i<4;i++){const l=4+((t*3+i)|0)%3;r(x+4+i*2,by+5,1,l,c);}}},
  nursery:{w:8,h:4,solid:[0,1,8,3],anim:1,glow:[64,30,70,'255,190,120'],draw(g,x,y,t,o){const r=painter(g),lit=o.m.v.lit;
    r(x+4,y+20,120,44,'#2c2650');r(x+4,y+20,120,2,'#4a427a');
    for(let k=0;k<12;k++)r(x+64-k*5-2,y+2+k*1.6|0,k*10+4,2,'#7a2c48');
    r(x+0,y+19,128,3,'#5a1e36');r(x+60,y+2,8,2,'#a84a68');
    r(x+56,y+8,16,16,'#e8e0f8');r(x+57,y+9,14,14,'#f8f4ff');r(x+63,y+11,2,6,'#2a2244');r(x+64,y+16,5,1,'#2a2244');
    const wc=lit?'#ffd890':'#8a6a50';r(x+14,y+32,22,14,wc);r(x+92,y+32,22,14,wc);r(x+24,y+32,2,14,'#2c2650');r(x+102,y+32,2,14,'#2c2650');r(x+14,y+38,22,1,'#2c2650');r(x+92,y+38,22,1,'#2c2650');
    r(x+54,y+40,20,24,'#1a1638');r(x+56,y+42,16,22,'#241e48');r(x+68,y+52,2,2,'#e8b830');
    r(x+38,y+26,14,8,'#f8f0d0');r(x+40,y+28,2,2,'#ff7090');r(x+44,y+28,2,2,'#40a0ff');r(x+48,y+28,2,2,'#ffd040');
    r(x+4,y+62,120,2,'rgba(0,0,0,.35)');}},
  shoes:{w:2,h:2,solid:[0,1,2,1],draw(g,x,y,t,o){const r=painter(g);
    r(x+1,y+4,30,27,'#7a5a3a');r(x+1,y+4,30,1,'#9a7a54');for(let a=0;a<3;a++)for(let b=0;b<3;b++)r(x+3+b*9,y+7+a*8,8,6,'#3a2818');
    r(x+13,y+16,3,2,'#ff8ab0');r(x+16,y+16,3,2,'#ff8ab0');r(x+13,y+17,6,1,'#fff');}},
  swing:{w:3,h:2,solid:[[0,1,1,1],[2,1,1,1]],anim:1,draw(g,x,y,t){const r=painter(g);
    r(x+4,y+2,3,29,'#4a3a6a');r(x+41,y+2,3,29,'#4a3a6a');r(x+2,y+1,44,3,'#5a4a7a');
    const sw=Math.round(Math.sin(t*1.3)*5);r(x+17+sw,y+4,1,18,'#8a7aa8');r(x+30+sw,y+4,1,18,'#8a7aa8');r(x+15+sw,y+22,18,3,'#e8b830');}},
  slide:{w:3,h:2,solid:[0,1,3,1],draw(g,x,y){const r=painter(g);
    r(x+4,y+4,3,27,'#5a3a6a');r(x+11,y+4,3,27,'#5a3a6a');for(let i=0;i<5;i++)r(x+4,y+8+i*5,10,1,'#7a5a8a');
    for(let i=0;i<30;i++)r(x+12+i,y+4+Math.round(i*.85),3,3,'#d0607a');r(x+4,y+3,10,2,'#d0607a');}},
  mailbox:{w:1,h:2,solid:[0,1,1,1],anim:1,draw(g,x,y,t,o){const r=painter(g);
    r(x+3,y+6,10,12,'#c83040');r(x+3,y+6,10,2,'#e85060');r(x+4,y+10,8,2,'#2a0a10');r(x+7,y+18,2,13,'#5a5a6a');
    if(!o.done){for(let i=0;i<3;i++){const f=Math.sin(t*3+i)*2|0;r(x+2+i*4,y+1+f,6,4,'#f0e8d8');r(x+4+i*4,y+2+f,2,2,'#d02030');}}}},
  tulips:{w:2,h:1,high:-1,draw(g,x,y){const r=painter(g);['#ff7090','#ffd060','#ff9a50','#d070ff'].forEach((c,i)=>{const bx=x+2+i*8;r(bx+1,y+8,1,7,'#2a8a4a');r(bx,y+4,4,4,c);r(bx,y+3,1,1,c);r(bx+3,y+3,1,1,c);r(bx+3,y+10,2,1,'#3aa05a');});}},
  pillar:{w:1,h:2,solid:[0,1,1,1],draw(g,x,y){const r=painter(g);r(x+4,y+0,8,31,'#7a1c26');r(x+4,y+0,2,31,'#a83a40');r(x+11,y+0,1,31,'#4a1018');r(x+3,y+28,10,3,'#2a1018');r(x+3,y+0,10,2,'#2a1018');}},
  biglantern:{w:2,h:3,solid:[0,2,2,1],anim:1,glow:[16,14,90,'255,200,120'],draw(g,x,y,t,o){const r=painter(g),on=!o.done;
    r(x+6,y+42,20,5,'#3a3048');r(x+12,y+28,8,14,'#4a405a');r(x+4,y+24,24,4,'#3a3048');r(x+7,y+8,18,16,'#4a405a');r(x+2,y+4,28,4,'#2e2640');r(x+10,y+0,12,4,'#2e2640');
    const f=.6+.4*Math.sin(t*7);r(x+10,y+11,12,10,on?(f>.7?'#fffbe0':'#ffe090'):'#14101c');if(on){r(x+13,y+13,6,6,'#ffffff');}}},
  lone:{w:1,h:2,solid:[0,1,1,1],anim:1,glow:[8,12,26,'170,220,255'],draw(g,x,y,t){const r=painter(g);
    r(x+4,y+28,8,3,'#2a2a3e');r(x+7,y+20,2,8,'#34344c');r(x+3,y+12,10,8,'#34344c');r(x+2,y+10,12,2,'#24243a');r(x+6,y+8,4,2,'#24243a');
    const f=Math.sin(t*5)>0;r(x+5,y+14,6,4,f?'#d8f0ff':'#a8d8ff');}},
  palace:{w:6,h:3,solid:[0,1,6,2],anim:1,draw(g,x,y,t){const r=painter(g);
    r(x+6,y+22,84,26,'#1c1030');r(x+6,y+22,84,1,'#3a2456');
    for(let k=0;k<10;k++)r(x+48-k*5-4,y+3+k*2,k*10+8,2,'#2a1840');
    r(x+0,y+21,96,3,'#3a1e50');r(x+42,y+1,12,3,'#b08a30');r(x+38,y+2,4,2,'#d8b040');r(x+54,y+2,4,2,'#d8b040');
    for(let i=0;i<5;i++){r(x+12+i*16,y+24,3,24,'#5a1a2a');}
    r(x+40,y+30,16,18,'#06020c');const f=.5+.5*Math.sin(t*2);r(x+46,y+34,4,3,`rgba(255,${150+f*60|0},90,.8)`);
    r(x+8,y+46,80,2,'rgba(0,0,0,.4)');}},
  throne:{w:2,h:2,solid:[0,1,2,1],draw(g,x,y){const r=painter(g);r(x+4,y+4,24,6,'#6a1c2a');r(x+4,y+4,24,1,'#a84a48');r(x+6,y+10,20,14,'#4a1420');r(x+4,y+20,24,6,'#6a1c2a');r(x+8,y+12,16,8,'#2a0a14');r(x+14,y+0,4,4,'#d8b040');r(x+4,y+26,4,5,'#3a0e18');r(x+24,y+26,4,5,'#3a0e18');}},
  vortex:{w:7,h:5,anim:1,high:-1,glow:[56,40,80,'200,80,255'],draw(g,x,y,t,o){const cx=x+56,cy=y+40,calm=o.m.v.calm;
    g.save();for(let i=0;i<46;i++){const rr=4+i*1.25,a=i*.36-t*(calm?.2:.9)*(1.4-i/60);g.strokeStyle=i%3?`rgba(150,70,220,${(1-i/46)*.75})`:`rgba(255,70,110,${(1-i/46)*.7})`;g.lineWidth=1+(i>30?1:0);g.beginPath();g.ellipse(cx,cy,rr,rr*.62,0,a,a+.9);g.stroke();}
    g.fillStyle='#000';g.beginPath();g.ellipse(cx,cy,5,3,0,0,6.283);g.fill();g.restore();}},
  sign:{w:1,h:1,solid:[0,0,1,1],draw(g,x,y){const r=painter(g);r(x+7,y+8,2,8,'#4a3a2a');r(x+1,y+2,14,7,'#7a5a3a');r(x+1,y+2,14,1,'#9a7a54');r(x+3,y+4,10,1,'#3a2a18');r(x+3,y+6,7,1,'#3a2a18');}},
  shelf:{w:2,h:2,solid:[0,1,2,1],draw(g,x,y){const r=painter(g);
    r(x+2,y+2,28,29,'#4a3428');r(x+2,y+2,28,1,'#6a4a38');r(x+4,y+4,24,25,'#2a1c16');
    const cols=['#e86a8a','#5a9ae8','#f8d050','#7ad0a0','#c87ae8','#ff9a50'];
    for(let s=0;s<3;s++){let bx=x+5;for(let i=0;i<6;i++){const w=2+((i+s)%2);r(bx,y+5+s*8+((i*3+s)%2),w,7-((i*3+s)%2),cols[(i+s*2)%6]);bx+=w+1;}r(x+4,y+12+s*8,24,1,'#4a3428');}}},
  toybox:{w:2,h:1,solid:[0,0,2,1],draw(g,x,y,t,o){const r=painter(g);
    r(x+1,y+4,30,11,'#f0a0b8');r(x+1,y+4,30,2,'#ffc8d8');r(x+1,y+14,30,1,'#a86078');r(x+12,y+8,8,3,'#ffffff');r(x+15,y+7,2,5,'#ff7ab4');
    // 絵本『うみのそこの おしろ』
    r(x+4,y-1,14,6,'#2a4a9a');r(x+4,y-1,14,1,'#5a7ad8');r(x+9,y+1,4,3,'#f8d050');r(x+10,y+0,2,1,'#f8d050');r(x+15,y+2,1,2,'#ffe8a0');
    r(x+21,y+1,7,3,'#e83055');r(x+22,y,5,1,'#ff6a80');}},
  bear:{w:1,h:1,draw(g,x,y){const r=painter(g);r(x+5,y+8,6,6,'#8a5a30');r(x+5,y+4,6,5,'#8a5a30');r(x+5,y+3,1,1,'#b8885a');r(x+4,y+2,1,1,'#b8885a');r(x+10,y+3,1,1,'#8a5a30');r(x+6,y+6,1,1,'#1a0a0a');r(x+9,y+6,1,1,'#1a0a0a');r(x+7,y+7,2,1,'#d8a878');}},
};

// ══════════════════════════════════════════════════════════
// 海の亡者のデータ。pat は行動の順番（くり返す）
//   k: hit=単体攻撃 all=二人とも st=状態異常 swell=膨張 armor=装甲 grow=利息 summon=仲間を呼ぶ same=反復をとがめる
//   m: 攻撃倍率  big: 大技（頭上に⚠。「守る」で軽減）  counter: 「守る」ではね返せる
//   s: 絵の大きさ（ドット）  weak: 弱点の属性（talk sing fix pray light）  phase: 体力が減った時の変化
// ══════════════════════════════════════════════════════════
const EN={
  noise:{name:'ノイズの群れ',hp:24,atk:5,spd:8,exp:6,s:22,weak:[],
    pat:[{k:'hit',n:'ザザッ…という雑音',m:1},{k:'hit',n:'耳を刺すハウリング',m:1.2},{k:'st',st:'noise',n:'砂嵐',m:.4}]},
  spark:{name:'罵声の泡',hp:18,atk:5,spd:9,exp:3,s:18,weak:['talk'],
    pat:[{k:'hit',n:'罵声',m:1},{k:'st',st:'burn',n:'飛び火',m:.5}]},
  bubble:{name:'炎上の泡',hp:120,atk:8,spd:6,exp:40,s:58,weak:['talk'],boss:1,
    hint:'怒鳴り返したら膨らむだけ。「語る」──攻撃が一番効きます。膨らんだら、破裂する前に「守る」。',
    pat:[{k:'hit',n:'罵声の泡',m:1},{k:'st',st:'burn',n:'飛び火',m:.5},{k:'swell',n:'ぶくぶくと膨らむ'},{k:'all',n:'破裂する罵声',m:1.9,big:1}],
    phase:[{at:.5,summon:['spark','spark'],msg:'罵声がちぎれて、小さな泡になった！'}]},
  crab:{name:'錆びた蟹',hp:34,atk:7,spd:8,exp:9,s:24,weak:['fix'],
    pat:[{k:'hit',n:'はさみ',m:1},{k:'hit',n:'泡を吹く',m:.8},{k:'hit',n:'大ばさみ',m:1.7,big:1}]},
  rust:{name:'鉄錆の番人',hp:170,atk:10,spd:6,exp:46,s:66,weak:['fix'],armor:1,boss:1,
    hint:'装甲があるうちは、ほとんど通りません。「直す」か連携技で継ぎ目を見抜いて。装甲は締め直されるから、そのたびに。',
    pat:[{k:'hit',n:'鉄の腕',m:1.1},{k:'st',st:'noise',n:'鉄粉の嵐',m:.5},{k:'all',n:'「ライン停止ハ許サレナイ」',m:1.8,big:1},{k:'armor',n:'装甲を締め直す'}],
    phase:[{at:.5,summon:['crab','crab'],msg:'配管の奥から、錆びた蟹が這い出してきた！'}]},
  letters:{name:'督促状',hp:26,atk:7,spd:9,exp:7,s:22,weak:['sing'],
    pat:[{k:'hit',n:'督促状の雨',m:1},{k:'st',st:'fear',n:'赤い「至急」の判',m:.6},{k:'hit',n:'紙の刃',m:1.25}]},
  debt:{name:'借金取りの影',hp:200,atk:10,spd:6,exp:56,s:70,weak:['guard'],boss:1,
    hint:'あの「取り立て」から逃げないで。「守る」で正面から受け止めれば、はね返せます。利息で強くなる前に。',
    pat:[{k:'hit',n:'督促',m:1},{k:'grow',n:'利息が膨らむ'},{k:'hit',n:'取り立て',m:2.0,big:1,counter:1},{k:'st',st:'fear',n:'「払えるのか？」',m:.6,all:1},{k:'hit',n:'督促',m:1},{k:'hit',n:'取り立て',m:2.0,big:1,counter:1}],
    phase:[{at:.5,summon:['letters','letters'],msg:'帳簿から、督促状が舞い上がった！'}]},
  echo:{name:'残響のノイズ',hp:40,atk:9,spd:8,exp:11,s:26,weak:['pray','light'],
    pat:[{k:'hit',n:'残響',m:1},{k:'st',st:'sleepy',n:'低いうなり',m:.4},{k:'st',st:'noise',n:'耳鳴り',m:.5},{k:'hit',n:'残響の波',m:1.3}]},
  lamb:{name:'眠れぬ子羊',hp:26,atk:7,spd:8,exp:4,s:20,weak:['sing'],
    pat:[{k:'hit',n:'頭突き',m:1},{k:'st',st:'sleepy',n:'「いっぴき……」',m:.3}]},
  sheep:{name:'眠れぬ羊',hp:220,atk:12,spd:6,exp:64,s:64,weak:['sing'],boss:1,
    hint:'子守唄です。「歌う」や「子守歌の灯」で、増えた羊ごと寝かしつけて。突進は守って。',
    pat:[{k:'st',st:'sleepy',n:'「いっぴき、にひき……」',m:.3,all:1},{k:'summon',kind:'lamb',n:'羊が増える'},{k:'hit',n:'頭突き',m:1},{k:'summon',kind:'lamb',n:'羊が増える'},{k:'all',n:'群れの突進',m:1.5,big:1}]},
  shade:{name:'名前を呑む影',hp:44,atk:10,spd:8,exp:12,s:26,weak:['light'],
    pat:[{k:'hit',n:'影の手',m:1},{k:'st',st:'fear',n:'「名前、なんだっけ？」',m:.5},{k:'hit',n:'呑みこむ',m:1.4}]},
  eye:{name:'見ている目',hp:40,atk:9,spd:9,exp:0,s:20,weak:['light'],
    pat:[{k:'hit',n:'凝視',m:1},{k:'st',st:'fear',n:'まばたきしない目',m:.5}]},
  watcher:{name:'名無しの観測者',hp:380,atk:14,spd:6,exp:0,s:80,weak:['pray'],boss:1,
    hint:'「祈る」が届きます。同じ行動を続けると、あれは数えて、そのぶん強く刺してくる。⚠の時は、必ず守って。',
    pat:[{k:'same',n:'「さっきも同じ話、聞きました」',m:.8},{k:'swell',n:'「30日目まで見ています」'},{k:'st',st:'fear',n:'「後ろ、雨の音だけじゃないですよ」',m:.9,all:1},{k:'st',st:'sleepy',n:'「寝たら終わりますよ」',m:.5},{k:'all',n:'「──見ています」',m:2.1,big:1}],
    phase:[{at:.5,half:1},{at:.3,summon:['eye','eye'],msg:'渦の壁に、無数の目がひらいた！'}]},
};
const ST_LABEL={noise:'ノイズ',burn:'やけど',sleepy:'眠気',fear:'怯え',barrier:'指切り'};
const ST_SEC={noise:9,burn:9,sleepy:7,fear:9};
const ELN={talk:'語',sing:'歌',fix:'直',pray:'祈',light:'灯'};
const AREA_N={one:'単',line:'列',circle:'円',all:'全',party:'味',ally:'味',self:'自'};
// だんのうらの技（gs.skills の 語る/歌う/直す/守る/祈る/灯す で強くなる）とミナモの技
const TECH={
  sing:{who:'dan',n:'歌う',mp:4,area:'line',el:'sing',d:'列に並んだ敵に歌声。自分も少し回復する。'},
  fix:{who:'dan',n:'直す',mp:5,area:'one',el:'fix',d:'継ぎ目を見抜く。装甲を外し、しばらく亀裂（受けるダメージ増）。'},
  guard:{who:'dan',n:'守る',mp:0,area:'self',d:'次の番まで二人を守る。息+5。正面から受け止めて、はね返せる技もある。'},
  pray:{who:'dan',n:'祈る',mp:7,area:'party',el:'pray',d:'二人を回復し、状態異常を治す。倒れたミナモも起こせる。'},
  l1:{who:'dan',n:'届く声',light:1,area:'line',el:'talk',d:'声の灯：列を貫く大きな声（装甲無視・一戦に一度）。'},
  l2:{who:'dan',n:'確かな手',light:2,area:'all',el:'fix',d:'手の灯：敵すべての装甲を外し、長い亀裂（一戦に一度）。'},
  l3:{who:'dan',n:'指切り',light:3,area:'party',d:'約束の灯：二人を大きく回復し、しばらく被ダメージ半減（一戦に一度）。'},
  l4:{who:'dan',n:'おやすみ',light:4,area:'all',d:'眠りの灯：敵すべてをしばらく眠らせる（一戦に一度）。'},
  heal:{who:'mina',n:'泡の癒し',mp:4,area:'ally',d:'泡で包んで、ひとりのHPを回復する。'},
  glow:{who:'mina',n:'灯り',mp:5,area:'circle',el:'light',d:'ねらった敵のまわりごと、淡い灯りで照らす。'},
  mirror:{who:'mina',n:'水鏡',mp:6,area:'party',ch:3,d:'二人の状態異常を治し、少し回復する。'},
  watch:{who:'mina',n:'見守る',mp:6,area:'all',need:'watch',d:'見ているだけじゃなく、隣に立つ。敵すべての力を削ぐ。'},
};
const TECH_ORDER={dan:['sing','fix','guard','pray','l1','l2','l3','l4'],mina:['heal','glow','mirror','watch']};
// 連携技：二人のゲージが満ちている時だけ選べる
const DUAL={
  koe:{n:'声と灯',a:'語る＋灯り',ch:1,mp:{dan:2,mina:4},area:'line',el:'talk',d:'声に灯りを乗せて、列ごと貫く（装甲無視）。'},
  shuri:{n:'修理と祈り',a:'直す＋泡の癒し',ch:2,mp:{dan:5,mina:4},area:'all',el:'fix',d:'敵すべての装甲を外して亀裂を入れ、二人を回復する。'},
  yubi:{n:'指切りの盾',a:'守る＋水鏡',ch:3,mp:{dan:0,mina:6},area:'party',d:'しばらく二人の受けるダメージ半減。状態異常も治す。'},
  komori:{n:'子守歌の灯',a:'歌う＋灯り',ch:4,mp:{dan:4,mina:5},area:'circle',el:'sing',d:'灯りの輪の中の敵を、歌で眠らせる。'},
  namae:{n:'名前を呼ぶ',a:'語る＋見守る',ch:5,need:'watch',mp:{dan:6,mina:6},area:'one',el:'talk',d:'本当の名前で呼びかける。とても大きな一撃と、回復。'},
};
const FLAVOR={
  talk:['「聞こえてるわよ。ちゃんと」','「今日ね、工場でね──」','「ご機嫌よう。……少し、お話ししましょ」','「大丈夫。ここにいるわよ」','「アンタの話も、聞かせてちょうだい」'],
  sing:['かすれた声で、いつもの曲を口ずさむ。','小さく、子守唄みたいに歌う。','深呼吸して、サビだけ歌う。'],
  fix:['音を聴く。……ここね。','止めて、確かめて、直す。','手が覚えている。'],
  pray:['……朝が来ますように。','あの子の寝顔を思い出す。','誰かの「おやすみ」を思い出す。'],
};
const PAR={noise:3,spark:1,bubble:7,crab:3,rust:9,letters:2,debt:9,echo:3,lamb:1,sheep:10,shade:3,eye:1,watcher:15};
const RANK_V={S:4,A:3,B:2,C:1};
const SPEEDS=[24,42,90,9999],SPEED_N=['ゆっくり','ふつう','はやい','瞬間'];
const LIGHT_COL=['','255,90,110','255,170,60','255,215,110','150,200,255','240,250,255'];

// ══════════════════════════════════════════════════════════
// マップ。rows の1文字が1タイル。legend の文字は物を置く（下のタイルは tile で指定・既定は床）
//   p:小物  chest:宝箱の中身  npc:夢の住人  foe:見えている敵（その場で戦闘）  spot:調べる場所
//   exit:行き先マップ（to:出てくる場所 need:先に済ませる出来事）  trig:踏むと始まる出来事  start:出てくる場所
// ══════════════════════════════════════════════════════════
const LEG0={'@':{start:'start'},S:{p:'save'},K:{p:'kelp'},O:{p:'rock'},L:{p:'toro'},C:{p:'coral'},J:{p:'jelly'},X:{p:'crate'}};
const MAPS={
  home:{name:'夜の部屋',theme:'home',rows:[
    '############',
    '##D###W##H##',
    '#..........#',
    '#..........#',
    '#.F......T.#',
    '#..........#',
    '#..........#',
    '#.....@....#',
    '############'],
    legend:{D:{p:'desk',tile:'#'},W:{p:'window',tile:'#'},H:{p:'shelf',tile:'#'},F:{p:'futon'},T:{p:'toybox'}}},
  c1_ruins:{name:'海底の廃墟',theme:'ruins',rows:[
    '########################',
    '#########..^^..#########',
    '########...,,...########',
    '####K......N,......K####',
    '###::.....,,,,.....::###',
    '###:..R...,,,,...1..:###',
    '##.........,,.........##',
    '##........~,,~........##',
    '#...a....~~,,~~........#',
    '#.......~~~,,~~~...O...#',
    '#::......~~,,~~......::#',
    '#::.......~,,~.......::#',
    '##.......,,..,,.......##',
    '##..T...,,....,,..T...##',
    '###....,,..n...,,....###',
    '###::..,........,..::###',
    '####.2.,,......,,...####',
    '####....,,....,,....####',
    '#####....,,,,,,....#####',
    '#####::...,,,,...::#####',
    '######.....,,.....######',
    '#######....,@,...#######',
    '########...,,,..########',
    '########################'],
    legend:{R:{p:'roof'},T:{p:'torii'},a:{chest:'shell',id:'c1a'},n:{npc:'fish',id:'c1fish',ev:'c1fish'},
      1:{foe:['noise','noise'],form:'row',id:'c1f1'},2:{foe:['noise','noise','noise'],form:'tri',id:'c1f2'},
      '^':{exit:'c1_room',to:'s'},N:{start:'n',tile:',',dir:'d'}}},
  c1_room:{name:'沈んだ配信部屋',theme:'room',rows:[
    '##################',
    '##W#####D###W##^##',
    '#.......m.o......#',
    '#................#',
    '#................#',
    '#...,,,,,,,,,,...#',
    '#...,,,,,,,,,,..S#',
    '#.b.,,,,,,,,,,...#',
    '#...,,,,,,,,,,...#',
    '#...,,,,,,,,,,...#',
    '#.a..............#',
    '#.........C......#',
    '#....X......K....#',
    '#........s.......#',
    '########vv########',
    '##################'],
    legend:{W:{p:'window',tile:'#'},D:{p:'desk',tile:'#'},m:{spot:'mic',solid:1},o:{spot:'mon',solid:1},b:{p:'bubbles',ev:'bub',hideIf:'bub'},
      a:{chest:'ramune',id:'c1b'},C:{p:'chair'},X:{p:'boxes'},s:{start:'s',dir:'u'},'^':{exit:'c1_deep',to:'s',need:['mic','mon','bub'],msg:'m:「この部屋、まだ見てないところがありますよ」'},
      v:{exit:'c1_ruins',to:'n'}}},
  c1_deep:{name:'部屋の奥',theme:'room',rows:[
    '##############',
    '##############',
    '###........###',
    '##..........##',
    '#............#',
    '#............#',
    '#............#',
    '#............#',
    '#.:........:.#',
    '#..K......K..#',
    '##tttttttttt##',
    '###........###',
    '####......####',
    '#####..s.#####',
    '##############'],
    legend:{t:{trig:'c1boss'},s:{start:'s',dir:'u'},B:{mark:'boss'}}},
  c2_pipes:{name:'配管の通路',theme:'factory',rows:[
    '##########################',
    '#####T##########T#########',
    '#........................#',
    '#..a.......X.............#',
    '#@.....====.......2......#',
    '#.,,,,,,,,,,,,,,,,,,,,,,,>',
    '#.....n......====........#',
    '#..1.....................#',
    '#.......X.......T........#',
    '#..:.....................#',
    '#.......b.............c..#',
    '#..::............3.......#',
    '#........................#',
    '##########################'],
    legend:{T:{p:'tank',tile:'#'},a:{chest:'shell',id:'c2a'},b:{chest:'pearl',id:'c2b'},c:{chest:'ramune',id:'c2c'},
      n:{npc:'worker',id:'c2work',ev:'c2work',dir:'u'},'@':{start:'start',dir:'r'},e:{start:'e',dir:'l'},
      1:{foe:['crab'],id:'c2f1'},2:{foe:['crab','crab'],form:'row',id:'c2f2'},3:{foe:['crab','noise','crab'],form:'col',id:'c2f3'},
      '>':{exit:'c2_line',to:'s'}}},
  c2_line:{name:'止まったライン',theme:'factory',rows:[
    '####################',
    '#L####^^####P#######',
    '#.l.........p....S.#',
    '#..................#',
    '#..................#',
    '#...:..........:...#',
    '#=========c====....#',
    '#..................#',
    '#..a...............#',
    '#.......2..........#',
    '#....:.........:...#',
    '#..........n.......#',
    '#..................#',
    '#........s.........#',
    '########vv##########',
    '####################'],
    legend:{L:{p:'locker',tile:'#'},P:{p:'panel',tile:'#'},l:{spot:'locker',solid:1},p:{spot:'panel',solid:1},
      c:{foe:['crab'],id:'conv',ev:'conv',fixed:1,tile:'='},a:{chest:'ramune',id:'c2d'},2:{foe:['crab','noise'],form:'row',id:'c2f4'},
      n:{npc:'worker',id:'c2rookie',ev:'c2rookie',dir:'l'},s:{start:'s',dir:'u'},
      '^':{exit:'c2_press',to:'s',need:['conv','panel','locker'],msg:'m:「その前に、ラインを見ていきませんか。止まったままです」'},
      v:{exit:'c2_pipes',to:'e'}}},
  c2_press:{name:'プレス機の前',theme:'factory',rows:[
    '################',
    '######P#########',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..............#',
    '#..:........:..#',
    '#..............#',
    '##tttttttttttt##',
    '#..............#',
    '#..............#',
    '#......s.......#',
    '################'],
    legend:{P:{p:'press',tile:'#'},t:{trig:'c2boss'},s:{start:'s',dir:'u'}}},
  c3_forest:{name:'珊瑚の森',theme:'coral',rows:[
    '######################',
    '#########^^###########',
    '########.N,.##########',
    '###C....,,,,....C#####',
    '##......,,,,.......###',
    '##..:..,,..,,..1...###',
    '#..J...,,...,,.....:##',
    '#..C...,.....,..C...##',
    '#......,..a..,......##',
    '##.....,.....,..J..###',
    '###....,,...,,....####',
    '####....,,.,,....#####',
    '###..:...,,,...:..####',
    '##..C....,,,...C...###',
    '##.......,,,.......###',
    '#...2....,,,....n...##',
    '#..:.....,,,.....:..##',
    '##.......,,,.......###',
    '###......,@,......####',
    '####.....,,,.....#####',
    '#####....,,,....######',
    '######################'],
    legend:{a:{chest:'shell',id:'c3a'},n:{npc:'fish',id:'c3fish',ev:'c3fish'},'@':{start:'start',tile:','},
      1:{foe:['letters','letters','letters'],form:'col',id:'c3f1'},2:{foe:['letters','letters'],form:'row',id:'c3f2'},
      '^':{exit:'c3_nurs',to:'s'},N:{start:'n',tile:',',dir:'d'}}},
  c3_nurs:{name:'珊瑚の保育園',theme:'coral',rows:[
    '######################',
    '#######N##############',
    '#.G..................#',
    '#....................#',
    '#....................#',
    '#..t.............M..S#',
    '#...........n........#',
    '#.....,,,,,,,,,,....e>',
    '#.Y..,,,,,,,,,,,,.Z..#',
    '#....,,,,,,,,,,,,....#',
    '#.....,,,,,,,,,,.....#',
    '#..t........t........#',
    '#wwwwwwww..wwwwwwwwww#',
    '#........s...........#',
    '#........vv..........#',
    '######################'],
    legend:{N:{p:'nursery',tile:'#'},G:{p:'shoes',ev:'shoe'},t:{p:'tulips'},M:{p:'mailbox',ev:'post'},Y:{p:'swing',ev:'swing'},Z:{p:'slide'},
      n:{npc:'teacher',id:'c3teacher',ev:'c3teacher'},s:{start:'s',dir:'u'},e:{start:'e',dir:'l'},
      '>':{exit:'c3_yard',to:'s',need:['shoe','swing','post'],msg:'m:「あの子の場所、もう少し見ていきませんか。……きっと、待ってます」'},
      v:{exit:'c3_forest',to:'n'}}},
  c3_yard:{name:'園庭',theme:'coral',rows:[
    '################',
    '################',
    '#..C........C..#',
    '#.J............#',
    '#....,,,,,,....#',
    '#...,,,,,,,,...#',
    '#...,,,,,,,,..J#',
    '#....,,,,,,....#',
    '#..............#',
    '#tttttttttttttt#',
    '#..............#',
    '#......s.......#',
    '#wwwwwwvvwwwwww#',
    '################'],
    legend:{t:{trig:'c3boss'},s:{start:'s',dir:'u'},v:{exit:'c3_nurs',to:'e'}}},
  c4_hall:{name:'眠らない灯籠の回廊',theme:'lantern',rows:[
    '##############',
    '######^^######',
    '##~...,N...~##',
    '##~.L.,,.L.~##',
    '##~...,,...~##',
    '##~...,,...~##',
    '##~...,,...~##',
    '##~.L.,,.L.~##',
    '##~...,E...~##',
    '##~...,,...~##',
    '##~...,,...~##',
    '##~.L.,,.L.~##',
    '##~...,,...~##',
    '##~...,,.n.~##',
    '##~...,,...~##',
    '##~.L.,,.Q.~##',
    '##~...,,...~##',
    '##~...,,1..~##',
    '##~...,,...~##',
    '##~.L.,,.L.~##',
    '##~a..,,...~##',
    '##~...,,...~##',
    '##~...,,...~##',
    '##~.L.,,.L.~##',
    '##~...,,...~##',
    '##~.m.,,...~##',
    '##~...,,...~##',
    '##~.P.,,.L.~##',
    '##~...,,...~##',
    '##~...,,2..~##',
    '##~...,,...~##',
    '##~.L.,,.S.~##',
    '##~...,,...~##',
    '##~...,,..b~##',
    '##~...,,...~##',
    '##~.L.,,.L.~##',
    '##~...,,...~##',
    '##~...,@...~##',
    '##~...,,...~##',
    '##############'],
    legend:{E:{foe:['echo'],id:'echo',ev:'echo',fixed:1,tile:','},n:{npc:'sleeper',id:'c4s1',ev:'c4s1',dir:'l'},m:{npc:'sleeper',id:'c4s2',ev:'c4s2',dir:'r'},
      Q:{p:'lone',ev:'lone'},P:{p:'toro',ev:'words'},a:{chest:'pearl',id:'c4a'},b:{chest:'shell',id:'c4b'},
      1:{foe:['echo'],id:'c4f1'},2:{foe:['echo','noise'],form:'col',id:'c4f2'},'@':{start:'start',tile:','},N:{start:'n',tile:',',dir:'d'},
      '^':{exit:'c4_end',to:'s',need:['words','lone','echo'],msg:'m:「……回廊の灯籠、まだ話したいことがあるみたいです」'}}},
  c4_end:{name:'回廊の果て',theme:'lantern',rows:[
    '##############',
    '##############',
    '##~........~##',
    '##~...B....~##',
    '##~.L....L.~##',
    '##~........~##',
    '##~...,,...~##',
    '##~...,,...~##',
    '##~...,,...~##',
    '##~tttttttt~##',
    '##~...,,...~##',
    '##~...,s...~##',
    '##~...vv...~##',
    '##############'],
    legend:{B:{p:'biglantern',id:'big',hideIf:'bigtaken'},t:{trig:'c4boss'},s:{start:'s',dir:'u',tile:','},v:{exit:'c4_hall',to:'n',tile:','}}},
  c5_palace:{name:'沈んだ御所',theme:'vortex',names:1,rows:[
    '########################',
    '###P#############^^#####',
    '#................N.....#',
    '#..........~~~.........#',
    '#....,,,,,,~~~,,,,..1..#',
    '#..,,....~~~~~~...,,...#',
    '#..,..L..~~~~~~..L..,..#',
    '#..,.....~~~~~~.....,..#',
    '#..,,.....~~~~.....,,..#',
    '#...,,,..........,,,...#',
    '#..2...,,,,,,,,,,.....a#',
    '#..........,,..........#',
    '#.:....n...,,......:...#',
    '#..........,,..........#',
    '#.......L..,,..L.......#',
    '#..........,@,.........#',
    '########################'],
    legend:{P:{p:'palace',ev:'palace',tile:'#'},n:{npc:'miyako',id:'c5miya',ev:'c5miya'},a:{chest:'pearl',id:'c5a'},
      1:{foe:['shade','shade'],form:'row',id:'c5f1'},2:{foe:['shade','echo','shade'],form:'tri',id:'c5f2'},
      '@':{start:'start',tile:','},N:{start:'n',dir:'d'},'^':{exit:'c5_rim',to:'s'}}},
  c5_rim:{name:'渦の縁',theme:'vortex',names:1,rows:[
    '####################',
    '########^^##########',
    '#.......,,.........#',
    '#..~~~..,,...~~~...#',
    '#..~~~..,,...~~~...#',
    '#.......,,.........#',
    '#..q....,,......r..#',
    '#.......,,.........#',
    '#..~~...,,....~~.S.#',
    '#..~~...,,....~~...#',
    '#.......,,..1......#',
    '#..b....,,.........#',
    '#.......,,.........#',
    '#.......s,.........#',
    '#.......vv.........#',
    '####################'],
    legend:{q:{spot:'names'},r:{spot:'list'},b:{chest:'ramune',id:'c5b'},1:{foe:['shade','shade','shade'],form:'col',id:'c5f3'},
      s:{start:'s',dir:'u'},v:{exit:'c5_palace',to:'n',tile:','},
      '^':{exit:'c5_core',to:'s',need:['names','list'],msg:'m:「渦の縁に、まだ……名前が漂ってます」'}}},
  c5_core:{name:'渦の中心',theme:'vortex',names:1,rows:[
    '################',
    '################',
    '#..............#',
    '#....~~~~~~....#',
    '#...~~~~~~~~...#',
    '#...~~~~~~~~...#',
    '#....~~~~~~....#',
    '#..............#',
    '#..............#',
    '#tttttttttttttt#',
    '#..............#',
    '#......s.......#',
    '################'],
    legend:{V:{p:'vortex'},t:{trig:'c5boss'},s:{start:'s',dir:'u'}},
    props:[{k:'vortex',x:4.5,y:2.5}]},
};

// ══════════════════════════════════════════════════════════
// 物語。G は進行用の関数群（start() の中で作る）
//   行の書式  'n:地の文' 'd.表情:だんのうら' 'm.表情:ミナモ' 'c.表情:あの子' 's:海の声'
//            'k.名前:コメント' 'e.名前:亡者' 'p.名前:夢の住人' 'mq:？？？（ミナモ）'
//   演出      '#show 誰 x y [向き]' '#hide 誰' '#walk 誰 x y'（着くまで待つ） '#walk& 誰 x y'（待たない）
//            '#face 誰 向き' '#emo 誰 記号' '#pose 誰 sleep|down|win|cast|（空で戻す）' '#jump 誰'
//            '#form tired|normal' '#follow on|off' '#cam x y|off' '#foe 名 種類 x y' '#foeoff 名'
//            '#var キー 値' '#kid kidOut|kidHome' '#se 音' '#bgm 曲' '#shake 強さ' '#flash' '#wait ms' '#float 文字'
//   誰 = dan / mina / kid / 夢の住人のid    x,y はタイル座標（小数可）
// ══════════════════════════════════════════════════════════
const STORY={},EV={};
// ── 第一章 ──
STORY[1]=async G=>{
  await G.intro(['#show dan 3.5 3 u','#show kid 2.6 4.7 d','#pose kid sleep',
    'n:午前三時。配信終了のボタンを押した。',
    'n:最後のコメントは「おつ」だった気がする。誰のものだったかは、もう思い出せない。',
    'd.tired:「……同接、ゼロね」',
    '#walk dan 4.4 4.6','#pose dan sleep',
    'n:布団に倒れ込む。隣で、あの子の寝息。窓の外で、雨の音。',
    'n:──雨の音だけ、のはずだった。',
    '#se ghost','#float 後ろ、雨の音だけじゃないですよ',
    'n:耳の奥で、ざあ、と波が鳴った。']);
  await G.card(1);
  await G.enter('c1_ruins','start',{alone:1});
  await G.say(['#pose dan down',
    'n:気がつくと、水の中にいた。',
    '#pose dan','#jump dan',
    'n:息はできる。冷たくもない。ただ、耳が痛いほど静かだ。',
    '#walk dan 12 18',
    'n:見上げれば、はるか上で水面が揺れている。瓦屋根がいくつも沈んでいた。朱の剥げた鳥居。崩れた欄干。',
    'n:廃墟の奥に、見覚えのある青い光が見える。……モニターの光だ。',
    'd.fear:「……壇ノ浦、ね。名前負けにもほどがあるわよ」',
    '#show mina 16 14 l','#se notif','#emo dan !','#face dan r',
    'mq.smile:「こんばんは。……ここだと、『おはよう』のほうが近いのかな」',
    '#walk mina 13.4 17.4',
    'd.fear:「──誰？」',
    'm:「ミナモ、って呼んでください。水面（みなも）のミナモ。本当の名前は、ずっと前にこの海に沈めちゃったので」',
    'm:「ここは、眠れない人がたどり着く海の底。八百年前に沈んだ都です」',
    'm.sad:「『波の下にも都の候ふぞ』──そう言われて、沈んでいった小さな帝がいたんですって」',
    'd:「縁起でもない話、初対面でしないでちょうだい」',
    'm:「だんのうらさん。あなた、少しずつ落としてきてますよね。大事なもの」',
    'm:「声。手。約束。眠り。……それから、名前」',
    'm:「五つの灯（ともしび）です。全部、この海のどこかに沈んでる。拾いに行かないと──あなたも、この都の人になっちゃう」',
    'd:「待って。なんでアタシの名前を知ってるの」',
    '#emo mina …','m.closed:「……さあ。どうしてでしょうね」',
    'm.smile:「一緒に行きます。あの青い光のほう──あなたの部屋です」',
    'm:「海の亡者が、ふらふらしてます。ぶつかると戦いになるので、気をつけて。灯籠を見つけたら、休めますよ」',
    '#follow on']);
  await G.roam();
  await G.say(['#cam 7 5','#foe boss bubble 7 5','#bgm kaidan','#shake 6',
    'n:部屋の奥で、巨大な泡がふくらんでいた。',
    'n:半透明の膜の中で、赤い文字が渦を巻いている。どれも、どこかで見た言葉だ。',
    'e.炎上の泡:「ツマラン」「辞メロ」「オマエノ声ナンカ、誰モ聞イテナイ」',
    'd.fear:「……炎上の泡、ね。あの夜のやつよ」',
    'm:「あなたが一番怖がってる声です。でも見て──泡の真ん中」',
    'n:罵声の渦の中心で、小さな赤い灯が、マイクのランプみたいに点滅していた。',
    'd:「怒鳴り返せば、割れるかしら？」',
    'm:「逆です。怒鳴ったら、もっと膨らむ。……いつもみたいに、ちゃんと『語って』あげてください」',
    'm:「それと、膨らんだら気をつけて。破裂する前に、守って」','#cam off']);
  await G.battle(['bubble'],{boss:1,ent:'boss'});
  await G.say(['#flash','#bgm night',
    'n:ぱちん、と泡が弾けた。罵声はただの水になって、ほどけて消えた。',
    'n:中から、小さな灯がゆっくり降りてくる。赤くて、頼りない光。配信中のランプと同じ色。']);
  await G.light(1);
  await G.say([
    'd:「……あー、あー。聞こえとるけ？」',
    'n:今度は、泡にならなかった。自分の声が、ちゃんと水を震わせた。',
    '#face mina u','m.smile:「聞こえます。……ずっと、聞こえてました」',
    'd:「ずっと？」',
    'm.closed:「次の夜も、来てください。灯は、あと四つあります」',
    ...(G.f.ch1_call?['n:壁の向こうから、もう一行だけコメントが聞こえた。','k.ひとりぼっち:おやすみなさい','n:ミナモは、それを聞かないふりをした。']:[]),
    'n:はるか上の水面が、白く光る。',
    'n:──目覚ましより少しだけ早く、目が覚めた。喉が、すこし軽い。']);
  await G.finish(1);
};
EV.c1fish=G=>G.say(['n:小さな光る魚が、ぼんやりと泳いでいる。だんのうらの周りを、くるりと回った。',
  'p.魚の子:「……こえ、ないの？　ここだと、みんな、こえがあわになるよ」',
  'p.魚の子:「でもね、ずっとまえから、うえのほうから、こえがきこえてた。よなかに、ひとりでしゃべってるこえ」',
  'd:「……アタシの配信？ それ」','m.smile:「この子たちも、聞いてたんですよ」']);
EV.mic=G=>G.say(['n:アームの先で、安物のマイクが揺れている。今夜も、俺の声を待っていたはずのもの。',
  'd:「……ご機嫌よう、だんのうらです」',
  'n:声は、ぽこぽこと泡になって、上へ逃げていった。音にならない。',
  '#emo dan !','d.fear:「声が……出ない？」',
  'm.sad:「ここでは、灯のない声は届かないんです。毎晩あんなに喋ってるのに、あなたの声、だいぶ前から空っぽでした」',
  'd.tired:「……言ってくれるわね」']);
EV.mon=async G=>{
  await G.say(['n:モニターの中で、今夜のコメント欄が流れ続けている。',
    'k.夜空の旅人:こんばんは〜','k.深夜の常連:今日も来ました','k.さくら:声、落ち着きますね',
    '#se ghost','k.???:さっきも同じ話、聞きました',
    'd.fear:「……また、このコメント。最近、たまに出るのよ」',
    '#emo mina …','m.sad:「…………」','n:ミナモは、なぜか目を逸らした。',
    'n:画面の隅で、文字が点滅している。《配信を終了しますか？》──視聴者数は、ゼロ。']);
  const c=await G.choice('どうする？',[{t:'「……まだ、誰かいるかしら？」と呼びかける',s:'届くかどうかは、わからない'},{t:'配信を終了する',s:'もう、誰もいないのだから'}]);
  if(c===0){G.f.ch1_call=1;await G.say(['d:「……まだ、誰かいるかしら？」',
    'n:泡になった声が、モニターに吸い込まれていく。しばらくして、たった一行。',
    'k.ひとりぼっち:いますよ','d.happy:「……物好きね」','#emo mina ♪','m.smile:「物好きですね」','n:なぜかミナモが、少しだけ笑った。']);}
  else{G.f.ch1_end=1;await G.say(['n:終了ボタンを押す。画面が暗くなり、部屋に静けさが戻ってくる。',
    'n:その静けさは、思っていたより優しかった。','m:「……おつかれさまでした」','n:暗くなったモニターの裏に、小さな瓶が転がっていた。']);
    await G.item('ramune',1);}
};
EV.bub=async G=>{
  await G.say(['n:床のあたりで、灰色の泡がざわざわと騒いでいる。近づくと、砂嵐の音がした。',
    '#emo mina !','m.surprise:「ノイズの群れ……！　この海の亡者です。疲れた心に寄ってくるの」',
    'm:「戦い方、教えますね。下のゲージが満ちた人から動けます。『攻撃』で話しかけて、『技』で歌ったり、灯りをともしたり」',
    'm:「二人ともゲージが満ちていたら、『技』に連携技が出ます。それと──頭の上に⚠が出たら、だんのうらさんの『守る』」',
    'm:「……大丈夫、隣にいますから」']);
  G.markDone('bub');
  await G.battle(['noise','noise'],{tutorial:1,at:'bub',form:'row'});
  await G.say(['n:ノイズが散って、ただの水に戻った。','m.smile:「上手です。……配信のときと同じ。ちゃんと、一人ずつに話しかけるんです」']);
};
EV.c1boss=G=>G.leave('boss');

// ── 第二章 ──
STORY[2]=async G=>{
  await G.intro(['#show dan 3.5 3 u','#show kid 2.6 4.7 d','#pose kid sleep',
    'n:夜勤明けの体で配信をして、あの子を寝かしつけて、そのまま床で眠った。',
    '#walk dan 5.5 5','#pose dan sleep',
    'n:手のひらに、まだ工具の感触が残っている。……いや、残っていない。何も、感じない。']);
  await G.card(2);
  await G.enter('c2_pipes','start');
  await G.say(['#face dan r',
    'n:今夜の海は、機械油の匂いがした。',
    'n:錆びた配管が頭上を這い、止まったコンベアが海底を横切っている。……見覚えがある。俺の職場だ。夢でまで。',
    '#emo dan !','d.fear:「……手が」',
    'n:両手が、水に溶けたように透けていた。指を握っても、感触がない。',
    'm:「手の灯です。毎日あんなに使ってるのに、あなたは自分の手を信じてない」',
    'm.smile:「先週の配信で言ってましたよね。『ベアリングの音で、だいたい分かる』って。あれ、かっこよかったです」',
    'd:「……聞いてたの、あんな話」','m:「聞いてました。雑談の中で、一番好きでした」','d:「物好きね、ほんとに」',
    'm:「錆びた蟹がうろついてます。装甲の硬い相手には『直す』──それか、二人で『修理と祈り』です」']);
  await G.roam();
  await G.say(['#cam 7.5 4.6','#foe boss rust 7.5 5','#bgm kaidan','#shake 6',
    'n:奥のプレス機が、誰もいないのに動き続けている。',
    'n:錆びた鉄の巨体。歯車の頭の真ん中で、赤いランプがひとつ、こちらを睨んでいた。',
    'e.鉄錆の番人:「ライン停止ハ、許サレナイ。止マッタラ、オマエノ価値ハ、ナイ」',
    'd.tired:「……どこかで聞いたわね、それ」',
    'm:「あの機械、あなたの手の灯を燃料にして動いてます。止めないと」',
    'm:「装甲が硬いです。まず『直す』で継ぎ目を見つけて。大きく振りかぶったら、守って」',
    ...(G.f.ch2_share?['m.smile:「……今度は、私も工具、持ちますから」']:[]),'#cam off']);
  await G.battle(['rust'],{boss:1,ent:'boss'});
  await G.say(['#var stopped 1','#flash','#bgm night',
    'n:番人が、軋みながら膝をついた。歯車がゆっくり止まる。',
    'd:「止まった機械は、壊れたんじゃないの。……休んでるだけよ」',
    'n:鉄の胸が開き、中から灯がひとつ浮かび上がった。油に濡れたような、琥珀色の光。']);
  await G.light(2);
  await G.say(['n:透けていた両手に、輪郭が戻ってくる。握る。……ちゃんと、握れる。',
    'm:「さっきの言葉、自分にも言ってあげてください。止まっても、休んでるだけだって」',
    'd:「……善処するわ」',
    '#se ghost','#float 30日目まで見ています',
    'n:プレス機の計器に、一行だけ文字が流れた。',
    'k.存在しないID:30日目まで見ています',
    'd.fear:「……この海、配信と繋がってるのね」',
    'm.sad:「見てる人が、敵だとは限りませんよ」',
    '#face mina u','n:ミナモはそれだけ言って、水面のほうを見上げた。',
    'n:──起きると、指先に、かすかに油の匂いが残っている気がした。']);
  await G.finish(2);
};
EV.c2work=G=>G.say(['n:透けた作業着の男が、止まったラインをじっと見つめている。',
  'p.夜勤の亡者:「ライン、止めたら怒られる……止めたら怒られる……」',
  'd:「止めなきゃ直せないでしょ。止めて、確かめて、直す。それが仕事なのよ」',
  'p.夜勤の亡者:「……そうか。そうだったな。……休憩、行ってくるわ」',
  'n:男は小さく会釈して、ヘルメットを脱いだ。']);
EV.c2rookie=G=>G.say(['p.新人の亡者:「班長……ここ、どうやって直すんすか。何回やっても止まるんす」',
  'd:「焦らないの。まず音を聴かれ。ベアリングの音で、だいたい分かるわ」',
  '#emo mina ♪','m.smile:「出た、ベアリングの話」',
  'p.新人の亡者:「……音。……あ、ほんとだ。ここ、鳴いてる」','d.happy:「でしょ」']);
EV.conv=async G=>{
  await G.say(['n:コンベアのローラーに、何かが挟まっている。',
    'n:……錆だらけの蟹だ。はさみをカチカチ鳴らして、ラインを止めている。','#emo mina !','m.surprise:「来ます！」']);
  await G.battle(['crab'],{ent:'conv'});
  await G.say(['#var conveyor 1','n:蟹が逃げていくと、コンベアがゆっくり回りはじめた。','d:「……動いたわ」','m.smile:「ね。直せるじゃないですか」']);
};
EV.panel=async G=>{
  await G.say(['n:制御盤のランプが、赤く点滅している。小さな画面に《ERR 404》。',
    'd:「インターロックが噛んでるわね。……ラダー図、どこかしら」',
    'n:扉を開けると、配線が海藻のように揺れていた。透けた指では、ドライバーがうまく掴めない。',
    'm:「……私に、何かできますか？」']);
  const c=await G.choice('どうする？',[{t:'ミナモに工具を渡して、手伝ってもらう',s:'一人で抱えなくていいのかもしれない'},{t:'一人で直す。いつもそうしてきた',s:'自分の手で、確かめたい'}]);
  if(c===0){G.f.ch2_share=1;await G.say(['d:「これ、持っててちょうだい。ここを照らしてくれればいいの」',
    'm.surprise:「え、私？　工具なんて触ったこと……」','d:「持ってるだけでいいのよ。一人だと、手が足りないの」',
    'n:ミナモの淡い光が、配線の奥を照らす。絡まった一本が見えた。',
    '#var fixed 1','#se repair','n:ぱちん。ランプが緑に変わる。',
    'm.smile:「……誰かと一緒に何かを直すの、初めてです」','d:「現場じゃ当たり前のことよ。……アタシが、忘れてただけ」',
    'n:（以後、連携技「修理と祈り」が強くなる）']);}
  else{G.f.ch2_alone=1;await G.say(['d:「いいの。慣れてるわ」',
    'n:感覚のない指で、何度も、何度も、配線をたどる。',
    '#var fixed 1','#se repair','n:……あった。ぱちん。ランプが緑に変わる。',
    'd:「よし、と」','m.sad:「……そうですね。あなたは、いつも一人で直す」','n:その声は、少しだけ寂しそうだった。',
    'n:透けていた指先に、ほんの少し感覚が戻った。（以後「直す」が強くなる）']);}
};
EV.locker=async G=>{
  await G.say(['n:自分のロッカーを開ける。作業着の内側に、一枚の絵が貼ってあった。',
    'n:クレヨンで描かれた、ヘルメットの男。《パパのおしごと》。',
    'd.happy:「……実物より、だいぶ強そうね」','m.smile:「きっと、そう見えてるんですよ。あの子には」',
    'n:絵の裏に、桜色の貝がひとつ挟まっていた。']);
  await G.item('shell',1);
};
EV.c2boss=G=>G.leave('boss');

// ── 第三章 ──
STORY[3]=async G=>{
  await G.intro(['#show dan 3.5 3 u','#show kid 2.6 4.7 d','#pose kid sleep',
    'n:保育園の連絡帳に、先生の字。',
    'n:《最近、お迎えの時間が遅くなっていて、お子さんが少し寂しそうです》',
    'n:返事を書こうとして、ペンが止まったまま、眠ってしまった。','#pose dan sleep']);
  await G.card(3);
  await G.enter('c3_forest','start');
  await G.say(['#kid kidOut',
    'n:珊瑚の森の奥に、小さな園舎の屋根が見えた。',
    'n:止まった時計。窓の灯り。……あの子の保育園に、よく似ている。',
    '#show kid 10 13 u','#se notif','c.happy:「パパ！」',
    '#emo dan !','d.fear:「──ちょっと！」',
    'n:黄色い帽子の小さな影が、クマのぬいぐるみを抱えたまま、笑いながら珊瑚の向こうへ駆けていく。',
    '#walk kid 10 4 1.6','#hide kid',
    'm:「約束の灯は、あの子が持ってます。……あの子も、あなたを探してるみたい」',
    'm:「督促状が飛んでます。紙は湿らせればふやける──『歌う』で、列ごとまとめて」']);
  await G.roam();
  await G.say(['#var lit 1','#kid kidOut','#show kid 7.5 5.4 d','#cam 7.5 6',
    'n:園庭の真ん中に、あの子が立っていた。クマを片手に、もう片方の腕で、小さな灯を抱えている。',
    '#walk dan 7 7.4','#walk& mina 9 7.8','#face dan u',
    'c:「パパ、おそい」',
    'd.happy:「……ごめんね」',
    'c:「あのね。こんどのえんそく、パパもくる？」',
    'n:来月の遠足。保護者参加。平日。……シフトは、まだ出ていない。']);
  const c=await G.choice('あの子に、なんと答える？',[{t:'「行くわ。約束する」',s:'約束は、守るためにある'},{t:'「……行けるか、まだ分からないの。ごめんね」',s:'嘘は、つきたくない'}]);
  if(c===0){G.f.ch3_promise=1;await G.say(['d:「行くわ。約束する」','#jump kid','c.happy:「ほんと？　ゆびきり！」',
    'n:小さな小指が、透けた俺の小指に絡む。冷たい海の中で、そこだけが温かい。',
    'm:「……約束は、守るために起きなきゃいけないんですよ」','d:「分かってるわよ」']);}
  else{G.f.ch3_honest=1;await G.say(['d:「……行けるか、まだ分からないの。ごめんね」','c.sad:「…………うん。しってた」',
    'n:あの子は、笑った。慣れた笑い方だった。それが、一番こたえた。',
    'm.sad:「正直なのは、悪いことじゃないです。……でも」','d:「分かってる。分かってるのよ」',
    'n:嘘をつかなかった声は、少しだけ強くなった気がした。（以後「語る」が強くなる）']);}
  await G.say(['#se ghost','#shake 8','#foe boss debt 7.5 3.4','#bgm kaidan',
    'n:そのとき、園庭に長い影が差した。',
    'n:帽子をかぶった、背の高い影。長すぎる腕の先に、分厚い帳簿をぶら下げている。',
    'e.借金取りの影:「八十四万。利息を入れれば、もっとだ」',
    'e.借金取りの影:「遠足？　保育料も払えるかどうかの男が。……その灯は、担保にもらっていく」',
    '#hide kid','n:あの子の姿が、ふっと消えた。灯だけが、影の帳簿に吸い込まれていく。',
    'd.fear:「──返して！」',
    'm:「落ち着いて！　あの影の『取り立て』は重い。でも正面から『守れ』ば、はね返せます」',
    'm:「逃げないで。受け止めて、押し返すんです」','#cam off']);
  await G.battle(['debt'],{boss:1,ent:'boss'});
  await G.say(['#flash','#bgm night',
    'n:影がしぼんで、一枚の紙きれになった。《残高　￥840,000》。',
    'd:「……減らすわよ。少しずつね。それしかないもの」',
    'n:紙が破れて、灯がこぼれ落ちる。','#show kid 7.5 5.4 d','#walk kid 7.5 6.4',
    'c:「パパ、これ」',
    'n:あの子が、拾った灯を両手で差し出してくる。日だまりみたいな、金色の光。']);
  await G.light(3);
  await G.say(['c.happy:「あのね。おゆうぎかいで、あかりのやく、やるの。『うみのそこの　おしろ』のおはなし。……パパのぶんも、ひかるからね」',
    ...(G.f.ch3_promise?['c.happy:「えんそく、やくそくだよ」','d.happy:「ええ。約束よ」']:['c:「パパ、むりしないでね」','d.tired:「……それ、パパのセリフなんだけどね」']),
    '#hide kid','n:あの子が、泡になって水面へ昇っていく。',
    '#face mina u','m.closed:「……いいなあ」','d:「なにがよ」',
    'm:「私ね、ずっと、夜はひとりでした。誰も帰ってこない部屋で、眠れなくて」',
    'm:「それで、あなたの配信をつけっぱなしにして、目を閉じてたんです」',
    '#emo dan !','d.fear:「……リスナー、なの？ アンタ」',
    'm.smile:「次の夜に、ちゃんと話します。……今夜は、あの子の夢を見てあげてください」',
    'n:──目が覚めると、あの子が俺の小指を握ったまま眠っていた。']);
  await G.finish(3);
};
EV.c3fish=G=>G.say(['p.魚の子:「きいろいぼうしのこ、あっちにはしってったよ。くまさん、だっこして」',
  'd:「……あの子、夢でもあのクマ持ってるのね」','m.smile:「左耳、ほつれてましたね」','d.happy:「そうなのよ。何回縫っても、そこだけほつれるの」']);
EV.c3teacher=G=>G.say(['p.珊瑚の先生:「お迎えですか？　……あの子なら、園庭で待ってますよ。灯りを抱えて」',
  'p.珊瑚の先生:「あの子、いつも最後まで、門のほうを見てるんです。来るって、知ってるから」',
  'd.tired:「……いつも遅くて、すみません」','p.珊瑚の先生:「謝る相手は、私じゃないですよ」']);
EV.shoe=async G=>{
  await G.say(['n:小さな靴が一足だけ残っている。ピンクの花のついた、あの子の靴。名札の字が、水に滲んで読めない。',
    'd:「……アタシが書いた字よ。油性ペンで書けって言われてたのに」','m:「読めなくても、ちゃんとあの子の靴だって分かるんですね」',
    'n:靴の中に、光る小瓶が入っていた。']);
  await G.item('ramune',1);
};
EV.swing=G=>G.say(['n:誰も乗っていないブランコが、ゆっくり揺れている。','n:きい、きい、という音にまじって、声が聞こえた。',
  'c:「パパ、おむかえ、いちばんにきてね」','d.tired:「……一番は、無理だったわね。いつも最後よ」',
  'm:「最後でも、来てくれる人がいるのは……」','n:ミナモは、そこで言葉を切った。',
  'm.sad:「……なんでもないです。待ってる側は、待ってるあいだ、ずっとひとりぼっちなんです。それだけ」']);
EV.post=async G=>{
  await G.say(['n:園の郵便受けから、封筒があふれ出している。赤い判子。《督促》《至急》《最終通知》。',
    'd.fear:「……なんで、ここにまで」','#shake 5','n:封筒が、羽ばたくように一斉に舞い上がった。']);
  G.markDone('post');
  await G.battle(['letters','letters','letters'],{at:'post',form:'col'});
  await G.say(['n:紙の群れはふやけて、珊瑚のあいだに沈んでいった。','m:「大丈夫ですか」','d.tired:「なーん、慣れてるわ。……慣れたくはないけどね」']);
};
EV.c3boss=G=>G.leave('boss');

// ── 第四章 ──
STORY[4]=async G=>{
  await G.intro(['#show dan 5.5 4.6 l','#show kid 2.6 4.7 d','#pose kid sleep',
    'n:何日、まともに寝ていないんだろう。三日か、四日か。',
    'n:目を閉じても、まぶたの裏で通知が光る。工場のアラームが鳴る。コメントが流れる。',
    'd.tired:「……眠るのが、怖いの」','#pose dan sleep',
    'n:眠ったら、何かが終わってしまう気がする。']);
  await G.card(4);
  await G.enter('c4_hall','start');
  await G.say(['#form tired',
    'n:果てのない回廊に、石灯籠が並んでいた。',
    '#emo dan !','n:水路に映った自分の姿が、知らない色をしていた。白い髪。……眠れない夜の、もうひとつの俺だ。',
    'n:灯籠のひとつひとつに火が入っている。消えることなく、ずっと。',
    'm:「眠らない灯籠。眠れなかった夜の数だけ、ここに灯がともるんです」',
    'd.tired:「……ずいぶん、たくさんあるのね」','m.sad:「ほとんど、あなたのです。……少しだけ、私のも」']);
  await G.roam();
  await G.say(['#cam 7 4.5',
    'n:回廊の果てに、ひときわ明るい灯籠が浮かんでいた。',
    's:「これを持っていきなさい」','n:どこからともなく、水そのものが喋るような声。',
    's:「眠らない灯籠。これがあれば、もう眠らなくていい。配信も、工場も、子育ても、借金も。ぜんぶ、ぜんぶ、できる」',
    '#emo mina !','m.surprise:「だんのうらさん……！」']);
  const c=await G.choice('眠らない灯籠を……',[{t:'受け取る',s:'眠らずに済むなら、もっと戦える'},{t:'吹き消す',s:'眠るのは、負けじゃない'}]);
  if(c===0){G.f.ch4_lantern=1;G.markDone('bigtaken');await G.say(['#flash',
    'n:灯籠を掴む。熱い。体の奥から、力がみなぎってくる。眠気が、きれいに消える。（以後、戦闘で力と息が増す）',
    'd:「……これで、いいの。これで、まだやれるわ」','n:水路に映る髪は、白いままだった。',
    'm.sad:「…………」','n:ミナモは何も言わなかった。ただ、回廊の灯籠が、ひとつ増えた。']);}
  else{G.f.ch4_rest=1;G.markDone('big');await G.say(['d:「いらないわ」','n:息を吹きかける。灯籠の火が、ふっと消えた。',
    '#var dim 1','n:回廊の灯籠が、ひとつ、またひとつ、静かに消えていく。暗くなるのに、不思議と怖くない。',
    '#form normal','d:「眠るのは、負けじゃないのよ。……あの子に教えてることだもの。アタシが守らなくてどうするの」',
    'n:水路に映る髪の色が、いつもの色に戻っていた。','m.smile:「……はい」',
    'n:（以後、戦いのあと、いつも万全の体力に戻る）']);}
  await G.say(['#foe boss sheep 7 6','#se ghost','#bgm kaidan','#cam 7 6.5',
    'n:暗がりから、もこもこした影が這い出してきた。',
    'e.眠れぬ羊:「いっぴき……にひき……さんびき……」',
    'n:数えても数えても眠れない、赤い目の羊。数えるたびに、群れが増えていく。',
    'm:「眠れぬ羊……！　あれ、数えるほど増えます」',
    'm:「だんのうらさん、子守唄、歌えますか。あの子に歌ってる、あれ」','d:「……下手よ？」',
    'm.smile:「知ってます。でも、あれがいいんです。……私の灯りと、一緒に」','#cam off']);
  await G.battle(['sheep'],{boss:1,ent:'boss'});
  await G.say(['#flash','#bgm night',
    'n:ねんねん、ころりよ。かすれた声で歌い終えると、羊たちは一匹ずつ丸くなって、寝息を立てはじめた。',
    'n:最後の一匹の毛の中から、青白い灯が転がり出る。月明かりみたいな、静かな光。']);
  await G.light(4);
  await G.say(['#pose mina sleep','n:ふと見ると、ミナモも灯籠にもたれて、うとうとしていた。',
    'n:その輪郭が、少しだけ、薄くなっている。','#emo dan !','d.fear:「ちょっと、ミナモ」',
    '#pose mina','m.closed:「……ん。久しぶりに、眠くなりました。あなたの歌のせい」',
    'm:「次が、最後です。名前の灯は、渦の底。……あそこには、私の名前も沈んでる」',
    'm.sad:「だんのうらさん。最後の夜、たぶん海は、本気であなたを引き止めます」',
    'n:──目が覚めた。久しぶりに、夢の途中で飛び起きなかった。']);
  await G.finish(4);
};
EV.words=G=>G.say(['n:灯籠の火袋に、文字が浮かんでいる。見覚えのある言葉。',
  '#se ghost','k.…:寝たら終わりますよ',
  'd.fear:「……配信に出てた、気味の悪いコメントよ」',
  'm.sad:「それ、書いたの、私です」','#emo dan !','d.fear:「──はぁ？」',
  'm:「この海の浅いところから、ずっと見てたんです。あなたが、毎晩少しずつ沈んでいくのを」',
  'm:「『寝たら終わりますよ』は、『ここで眠ったら、もう戻れない』って意味でした」',
  'm:「『後ろ、雨の音だけじゃないですよ』は──あなたの後ろに、もう海が来てたから」',
  'm.sad:「言葉って、海を通ると、あんなふうに歪んじゃうんです。……怖がらせて、ごめんなさい」',
  'd.tired:「……心臓に悪いのよ、あれ」','m.smile:「ですよね」']);
EV.lone=G=>G.say(['n:回廊の端に、ひとつだけ小さな灯籠がある。火袋に、ハンドルネームが刻まれていた。',
  'n:《ひとりぼっち》',
  'd:「……いつも『こんばんは』の一言だけ書いて、最後までいる人よね。勉強配信の、常連の」',
  'm.closed:「はい。……それしか、言えなかったから」',
  'm:「眠れない夜に、あなたの声だけが、ちゃんと人間の声でした。工場の話も、子どもの話も、くだらない雑談も」',
  'm:「私、死んでなんかいませんよ。どこかの部屋で、眠れないまま、眠ってるだけ」',
  'm.sad:「でも、あんまり長くここにいたから……浮かび方を、忘れちゃいました」',
  'd:「……ミナモ」','m.smile:「そう呼んでくれるの、けっこう好きです」']);
EV.echo=async G=>{
  await G.say(['n:回廊の奥の闇が、低くうなっている。眠りかけた頭に響く、あの耳鳴りの音。','#emo mina !']);
  await G.battle(['echo','echo'],{ent:'echo',form:'row'});
  await G.say(['n:残響が消えると、回廊は少しだけ静かになった。']);
};
EV.c4s1=G=>G.say(['p.眠れない人:「眠ったら、明日が来るだろ。明日が来るのが、怖いんだ」','d.tired:「……分かるわ」','m.sad:「この回廊にいる人は、みんな、そうなんです」']);
EV.c4s2=G=>G.say(['p.眠れない人:「あんた、子守唄うたえる？　……昔、母さんがうたってくれたやつ、思い出せなくて」','d:「下手よ？」',
  'n:かすれた声で、少しだけ歌う。眠れない人は、目を閉じて、灯籠にもたれた。','p.眠れない人:「……ああ。それだ」']);
EV.c4boss=G=>G.leave('boss');

// ── 第五章 ──
STORY[5]=async G=>{
  await G.intro(['#show dan 3.5 3 u','#show kid 2.6 4.7 d','#pose kid sleep',
    'n:配信のタイトルを打ちかけて、手が止まった。',
    'n:《ご機嫌よう、■■■■です》──自分の名前が、出てこない。',
    'n:だんのうら。……本名は。本名は、なんだったか。','#walk dan 4.4 4.6','#pose dan sleep',
    'n:考えているうちに、雨の音が、波の音に変わった。']);
  await G.card(5);
  await G.enter('c5_palace','start');
  await G.say([
    'n:沈んだ都の、そのまた底。',
    'n:御所の屋根も、鳥居も、すべてが巨大な渦に向かって傾いていた。渦のまわりを、無数の文字が回っている。',
    'n:名前だ。誰かの名前。誰かが、誰かを呼んだ声。',
    '#form tired','#emo dan …','d.fear:「……アタシの名前、なんだったかしら」',
    'n:指先から、色が抜けていく。髪が白く、ほどけていく。',
    'm.sad:「だから、ここは怖いんです。名前を忘れたら、もう誰にも呼ばれない」',
    'm:「呼ばれない人は、浮かび上がれない。……私みたいに」']);
  await G.roam();
  await G.say(['#cam 8 4.6','#foe boss watcher 8 4.4','#se ghost','#shake 10','#bgm mental',
    'n:渦の中心が、ゆっくりと開いた。',
    'n:目だった。配信画面の枠に囲まれた、巨大な目。そのまわりを、見覚えのあるコメントが回っている。',
    'e.名無しの観測者:「さっきも同じ話、聞きました」','e.名無しの観測者:「30日目まで、見ています」',
    'd.fear:「……アンタは、誰？」',
    'e.名無しの観測者:「誰デモナイ。オマエガ『見ラレテイル』ト思ッタ、スベテノ目ダ」',
    'e.名無しの観測者:「失望スル目。笑ウ目。数エル目。……眠レ。ココデハ、誰モオマエヲ評価シナイ」',
    'm:「あれは、この海そのものです。あなたが怖がってきた、全部の目の形をしてる」',
    'm:「『祈る』が届きます。それと──同じことばかり繰り返さないで。あれは、それを数えてる」','#cam off']);
  await G.battle(['watcher'],{boss:1,final:1,ent:'boss',half:()=>G.say([
    '#se ghost','e.名無しの観測者:「寝タラ、終ワリマスヨ」',
    'n:観測者が、ミナモの声で喋った。',
    '#emo mina !','m.surprise:「……違う！」',
    'm:「それは、私の言葉です！　『ここで眠ったら戻れない』って、そういう意味で……！　勝手に使わないで！」',
    'n:ミナモが、だんのうらの前に出た。半透明の体が、目の光を受けて揺れる。',
    'm:「だんのうらさん。私、浮かび方を忘れてたんです。でも、あなたの声がずっと上から聞こえてたから、ここにいられた」',
    'm.smile:「今度は、私の番です。……見てるだけじゃなくて、隣にいます」',
    'n:（ミナモは「見守る」を覚えた。連携技「名前を呼ぶ」が使えるようになった）'])});
  await G.say(['#var calm 1','#flash',
    'n:巨大な目が、ゆっくりと閉じていく。',
    'n:まわりを回っていたコメントが、ひとつずつほどけて、ただの文字に戻った。《こんばんは》《おつ》《また来ます》。',
    'n:渦の底から、最後の灯が浮かび上がる。白い、まっさらな光。']);
  await G.light(5);
  await G.retheme('abyss');
  await G.say(['#bgm night','#face dan d','#face mina d',
    'n:五つの灯が、胸の中で静かに燃えている。',
    'n:けれど、足もとの都に、温かい灯りがともりはじめた。',
    's:「波の下にも、都はあるよ」',
    's:「ここには借金もない。目覚ましもない。締め切りも、評価も、炎上もない」',
    ...(G.f.ch4_lantern?['s:「眠らない灯籠を、まだ持っているね。……ほら、もう朝なんて来なくていい。ずっと、ここで起きていればいい」']:[]),
    's:「その子と一緒に、ずっとここにいればいい」',
    '#face mina l','m.sad:「……私、いいですよ。ここで。だんのうらさんが一緒なら」',
    'n:ミナモが、ほんの少しだけ、そう言った。本心かどうかは、分からなかった。']);
  const c=await G.choice('沈むか、這い上がるか。',[{t:'朝を選ぶ',s:'水面へ。あの子が待つ朝へ'},{t:'ここで眠る',s:'もう、何も失わなくていい'}]);
  if(c===1)return G.ending('sink');
  return G.ending(G.anchors()>=3?'true':'wake');
};
EV.palace=G=>G.say(['n:傾いた御所の奥に、小さな玉座のようなものが沈んでいる。',
  'm:「八百年前、八歳の帝が、ここに沈みました。抱いて飛び込んだおばあさんが言ったんです」',
  'm:「『波の下にも、都の候ふぞ』──海の底にも都がありますよ、って」',
  'm.sad:「……優しい嘘だったんだと思います。怖くないように」',
  'd:「……あの子の絵本にも、そんな話があったわね。『うみのそこの　おしろ』」',
  'd:「暗い海の底で、灯りをもって、みんなをおうちに帰すの。……あの子、発表会でその灯りの役をやるのよ」',
  'd:「……アタシは、あの子にそういう嘘はつかないわ」','d:「怖いものは怖い。でも、朝は来る。そう言ってあげたいの」',
  'm.smile:「それ、すごく、父親っぽいです」']);
EV.c5miya=G=>G.say(['n:烏帽子をかぶった、透けた人影が、渦を見つめている。',
  'p.都の人:「名を、お持ちか」','d.fear:「……持ってる、はずなんだけどね」',
  'p.都の人:「ここでは、名を呼ばれぬ者から沈んでゆく。わたしの名も、もう、どこにもない」',
  'm.sad:「…………」','p.都の人:「呼んでくれる者がいるなら、帰りなされ。……波の下の都は、待つ者のための場所ではない」']);
EV.names=async G=>{
  await G.say(['n:渦の縁を、三つの名前が漂っている。どれも、俺の名前だ。',
    'n:《だんのうら》。《■■ ■■》──滲んで読めない本名。それから、クレヨンみたいな字の《パパ》。',
    'm:「急いで。全部は無理です。……ひとつ、先に掴んで」']);
  const c=await G.choice('どの名前を掴む？',[{t:'《だんのうら》',s:'夜に居場所をくれた名前'},{t:'《■■ ■■》',s:'言えない、けれど本当の名前'},{t:'《パパ》',s:'毎朝、あの子が呼ぶ名前'}]);
  if(c===0){G.f.ch5_handle=1;await G.say(['n:《だんのうら》を掴む。マイクの前の、少しだけ強い自分。','d:「ご機嫌よう、だんのうらです。……ええ、これは覚えてるわ」','n:（最終戦で「攻撃」「歌う」が強くなる）']);}
  else if(c===1){G.f.ch5_true=1;await G.say(['n:滲んだ名前を掴む。読めない。……でも、知っている。','d:「本名は、言えないわ。でも、アタシは知ってる。親がつけた、アタシの名前よ」','n:（最終戦で最大HPが増える）']);}
  else{G.f.ch5_papa=1;await G.say(['n:《パパ》を掴む。ぎざぎざの、クレヨンの字。','d.happy:「……一番よく呼ばれてる名前ね」','m.smile:「一番、強い名前です」','n:（最終戦の始めに、体も息も満ちる）']);}
  await G.say(G.f.ch4_lantern?['n:名前は掴んだ。けれど髪は、白いままだった。眠らない灯籠の熱が、まだ胸に残っている。']:['#form normal','n:名前を握った手に、色が戻ってくる。']);
};
EV.list=async G=>{
  await G.say(['n:渦の外側を、見覚えのある名前たちが回っている。','n:《夜空の旅人》《深夜の常連》《さくら》《ひとりぼっち》。',
    'd:「……みんな、名前を持って来てくれてたのね。毎晩」','m:「呼ばれた名前は、沈まないんです。……だから、私はまだ、ここにいられた」',
    'n:「さくら」の字のそばに、桜色の貝が光っていた。']);
  await G.item('shell',1);
};
EV.c5boss=G=>G.leave('boss');

// ── エンディング ──
//   scene: 夢の底での場面  wake: 目覚めた朝の部屋（演出のみ）  body/last: 結びの文
const ENDS={
  true:{name:'目覚め ── 二人の朝',bgm:'rebirth',
    scene:['#form normal','#face dan r','#face mina l',
      'd:「……朝を選ぶわ」','m.sad:「そうですよね。……じゃあ、ここでお別れ──」',
      'd:「なに言ってるの。アンタも来るのよ」','#emo mina !','m.surprise:「え」',
      'd:「リスナー置いて、先に寝落ちする配信者がいるもんですか。……行くちゃ、ミナモ」',
      '#walk dan 7.6 10.6','n:透けた手を、掴む。今度は、ちゃんと掴めた。',
      'n:そのとき、はるか上から、声が降ってきた。','c.happy:「パパ！　あさだよ！」',
      'n:《パパ》。その名前が、錨を引き上げるみたいに、二人を水面へ引っぱっていく。',
      '#emo mina ♥','m.smile:「……あったかい」','n:光。泡。雨上がりの匂い。'],
    wake:['#show dan 4.4 4.6 l','#pose dan sleep','#kid kidHome','#show kid 3.6 4.4 r','#wait 500','#jump kid','#wait 400','#pose dan','#emo kid ♪','#jump kid','#wait 900'],
    body:'目を開けると、あの子が胸の上に乗っていた。\n「パパ、おきた！」\n\n雨は止んでいた。\nスマホに、通知がひとつ。\n\n《ひとりぼっち：おはようございます。\n久しぶりに、朝に起きました。\n本当の名前は──今夜、配信で言います》',
    last:'「ここが、俺の壇ノ浦だ。沈むか、這い上がるか。\n──今日は、這い上がる。」'},
  wake:{name:'目覚め',bgm:'rebirth',
    scene:['#form normal','#face dan r','#face mina l',
      'd:「……朝を選ぶわ。ミナモ、いらっしゃい」','#walk dan 7.6 10.6','n:手を伸ばす。指先が触れる。……すり抜けた。',
      'm.smile:「先に行ってください。私は、もう少しだけ、ここで──見てます」',
      'm:「30日目まで。ちゃんと、見てますから」','d:「……ええ。見ててちょうだい」',
      '#hide mina','n:水面が近づく。目覚ましの音が、まっすぐに聞こえる。'],
    wake:['#show dan 4.4 4.6 l','#pose dan sleep','#kid kidHome','#show kid 2.6 4.7 d','#pose kid sleep','#wait 700','#pose dan','#emo dan …','#wait 900'],
    body:'目覚ましが鳴っている。\n朝だ。ちゃんと、朝だ。\n\nあの子の寝顔を見て、少しだけ泣いた。\n\nその夜、配信のコメント欄に一行。\n《30日目まで見ています》\n\n──もう、怖くはなかった。',
    last:'「ここが、俺の壇ノ浦だ。沈むか、這い上がるか。\n──とりあえず今日は、這い上がった。」',
    hint:'朝へつなぎとめる選択が、もう少し多ければ──ミナモの手も、掴めたかもしれない。'},
  sink:{name:'沈眠',bgm:'collapse',dark:true,
    scene:['#form tired','#pose dan down','d.tired:「……少しだけ、眠らせてちょうだい」',
      '#emo mina !','m.surprise:「だめ……！　だんのうらさん！」',
      'n:都の灯りが、やさしく近づいてくる。体が温かい。もう、何も考えなくていい。',
      's:「おかえり」','n:遠くで、目覚ましが鳴っている。十回。二十回。',
      'c.sad:「……パパ？　パパ、おきて」','n:その声も、水の向こうで、少しずつ遠く──'],
    body:'目が覚めたのは、九時四十分だった。\n\n保育園に電話をかける。\n工場に電話をかける。\nあの子は、黙って朝ごはんを待っていた。\n\n夜。配信をつけると、コメントがひとつ。\n《存在しないID：おかえりなさい。また今夜》',
    last:'「ここが、俺の壇ノ浦だ。沈むか、這い上がるか。\n──今夜も、少しだけ沈んだ。」'},
};
// 再プレイ（全章クリア後の見返し）だけで聞ける、ミナモの追加のセリフ
const REPLAY_EXTRA={
  1:['m.smile:「……また来てくれたんですね。二度目の夢は、少しだけ優しいですよ」','m:「この頃の私、まだ名前も言えなかったんです。ずるいですよね」'],
  2:['m:「この夜のこと、覚えてます。工具の重さ、初めて知った夜」','m.smile:「ベアリングの話、もう一回してくれてもいいですよ」'],
  3:['m.sad:「ここは、何度来ても少しだけ苦しいです。待ってる子の気持ち、知ってるから」','m.smile:「でも今は、迎えに来る人がいるって知ってる」'],
  4:['m:「あのコメントの意味、もう分かってますよね。……この回廊、前より少し暗いです。いいことです」'],
  5:['m:「最後の夜をもう一度、ですか」','m.smile:「何度見ても、選ぶのはあなたです。……私はちゃんと、隣にいますから」'],
};

const NAMES_FLOAT=['だんのうら','パパ','■■ ■■','夜空の旅人','ひとりぼっち','深夜の常連','さくら','おかえり','こんばんは'];
const DIRV={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]};
// 吹き出しの記号（5×5ドット）
const GLYPH={'!':['..#..','..#..','..#..','.....','..#..'],'?':['.###.','...#.','..#..','.....','..#..'],'…':['.....','.....','.....','.....','#.#.#'],
  '♪':['..##.','..#.#','..#..','###..','##...'],'♥':['.#.#.','#####','#####','.###.','..#..'],'z':['####.','..#..','.#...','####.','.....'],'💧':['..#..','.###.','.###.','#####','.###.']};
const GLYPH_C={'!':'#e83055','?':'#3a5ad8','…':'#5a4a7a','♪':'#d84a9a','♥':'#ff5a8a','z':'#5a7ad8','💧':'#3a9ae8'};

registerMinigame({
  id:'rpg', icon:'🌊', name:'壇ノ浦夢譚', genre:'ストーリーRPG', bgm:'night',
  get desc(){
    try{
      const R=rpgPeek();
      if(R.cleared>=5)return `五つの灯は、すべて戻った。${R.ending==='sink'?'……けれど、まだ海の音がする。':''}章を選んで見返せる（報酬なし・評価は記録される）。`;
      const c=RPG_CH[R.cleared+1];
      if(lockedToday(R))return `夢の続き──${c.kan}「${c.title}」は、明日の夜に。見返しはできる（報酬なし）。`;
      if(R.cleared===0)return '眠りの底、沈んだ都を歩く見下ろし型のRPG。少女ミナモと、失くした五つの灯を探す。今夜は第一章「声の灯」。';
      return `夢の続き──${c.kan}「${c.title}」（${c.place}）。灯 ${R.cleared}/5・Lv${R.lv}`;
    }catch(e){return '眠りの底、沈んだ都で五つの灯を探す夢のRPG。';}
  },
  get effect(){
    try{const R=rpgPeek();if(R.cleared>=5||lockedToday(R))return '見返し：報酬なし ／ 約60分';}catch(e){}
    return '章クリアで 疲労-10 精神↑ 希望↑ SP+1 ／ 約120分（負けると悪夢）';
  },
  help:'移動 十字キー/WASD・A(Enter) 調べる/決定・B(Esc) メニュー/戻る',
  start(body,mg){
    const R=rpgState();
    const sk=Object.assign({},gs.skills||{});
    const S=k=>+sk[k]||0;
    const ABORT={rpgAbort:true};
    let phase='menu',chNo=0,isReplay=false,endKey=null,run=null;
    const DF={eAtb:mgDiff(.5,.8,1.05),eDmg:mgDiff(.45,.85,1.1),eHp:mgDiff(.65,.95,1.15),heal:mgDiff(1,.25,0),
      sight:mgDiff(36,54,72),chase:mgDiff(28,40,54),runOk:mgDiff(1,.75,.5),retry:mgDifficulty()!=='hard'};
    // 負けてやり直すたびに受けるダメージが減る（やさしい・ふつうのみ、最大3回分）
    let retryEase=0;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const rnd=(a,b)=>a+Math.random()*(b-a);

    // ── DOM ──
    const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
    const root=el('div','rpg-root');body.appendChild(root);
    const cv=el('canvas','rpg-cv');root.appendChild(cv);const X=cv.getContext('2d');
    const ui=el('div','rpg-ui');root.appendChild(ui);
    const flashEl=el('div','rpg-flash');root.appendChild(flashEl);
    const fadeEl=el('div','rpg-fade');root.appendChild(fadeEl);
    const lo=document.createElement('canvas'),L=lo.getContext('2d');
    const lc=document.createElement('canvas'),LC=lc.getContext('2d');
    const tc=document.createElement('canvas');tc.width=SW;tc.height=SH;const TX=tc.getContext('2d');
    let W=360,H=640,dpr=1,SC=3,VW=120,VH=213;
    function resize(){
      const r=root.getBoundingClientRect();
      W=Math.max(240,r.width);H=Math.max(360,r.height);dpr=Math.min(3,window.devicePixelRatio||1);
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      SC=Math.max(2,Math.floor(Math.min(cv.width,cv.height)/228));
      VW=Math.ceil(cv.width/SC);VH=Math.ceil(cv.height/SC);
      lo.width=VW;lo.height=VH;lc.width=VW;lc.height=VH;
      if(BT)layoutBattle();
    }
    const ro=window.ResizeObserver?new ResizeObserver(()=>resize()):null;
    if(ro)ro.observe(root);
    window.addEventListener('resize',resize);
    let cleaned=false;
    function cleanup(){if(cleaned)return;cleaned=true;try{ro&&ro.disconnect();}catch(e){}window.removeEventListener('resize',resize);window.removeEventListener('keydown',capKey,true);window.removeEventListener('keyup',capKey,true);window.removeEventListener('blur',clearKeys);}
    if(typeof mg.onEnd==='function')mg.onEnd(cleanup);

    // テキストウィンドウ
    const box=el('div','rpg-box rpg-hide');
    box.innerHTML='<div class="rpg-plate"></div><div class="rpg-por"><canvas width="152" height="152"></canvas></div><div class="rpg-tx"><div class="rpg-text"></div></div><div class="rpg-next">▼</div>';
    ui.appendChild(box);
    const plate=box.querySelector('.rpg-plate'),porBox=box.querySelector('.rpg-por'),pc=porBox.querySelector('canvas'),txt=box.querySelector('.rpg-text'),nextEl=box.querySelector('.rpg-next');
    const hideBox=()=>box.classList.add('rpg-hide');

    // 仮想パッド（スティック＋A/B）とフィールドのメニューボタン
    const pad=el('div','rpg-pad rpg-hide'),knob=el('div','rpg-knob');pad.appendChild(knob);
    const btnA=el('button','rpg-abtn a rpg-hide','A<small>調べる</small>'),btnB=el('button','rpg-abtn b rpg-hide','B<small>メニュー</small>');
    const menuBtn=el('button','rpg-menubtn rpg-hide','≡<br>MENU');
    const keyHint=el('div','rpg-keyhint rpg-pass rpg-hide','十字/WASD 移動<br>Enter 調べる　Esc メニュー');
    ui.append(pad,btnA,btnB,menuBtn,keyHint);
    const fine=(()=>{try{return matchMedia('(pointer:fine)').matches&&!('ontouchstart' in window);}catch(e){return false;}})();
    function showPad(on){[pad,btnA,btnB].forEach(e=>e.classList.toggle('rpg-hide',!on||fine));menuBtn.classList.toggle('rpg-hide',!on);keyHint.classList.toggle('rpg-hide',!(on&&fine));if(!on){stick.x=stick.y=0;stick.id=null;knob.style.transform='';}}
    const stick={x:0,y:0,id:null};
    const stickMove=e=>{const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const mx=r.width*.36,l=Math.hypot(dx,dy);if(l>mx){dx*=mx/l;dy*=mx/l;}
      knob.style.transform=`translate(${dx}px,${dy}px)`;const nx=dx/mx,ny=dy/mx,nl=Math.hypot(nx,ny);if(nl<.25){stick.x=stick.y=0;}else{stick.x=nx;stick.y=ny;}};
    pad.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
    pad.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();stick.id=e.pointerId;try{pad.setPointerCapture(e.pointerId);}catch(_){}stickMove(e);});
    pad.addEventListener('pointermove',e=>{if(stick.id===e.pointerId)stickMove(e);});
    const stickEnd=e=>{if(stick.id!==e.pointerId)return;stick.id=null;stick.x=stick.y=0;knob.style.transform='';};
    pad.addEventListener('pointerup',stickEnd);pad.addEventListener('pointercancel',stickEnd);
    let noClickUntil=0;
    const tapBtn=(b,fn)=>{b.addEventListener('touchstart',e=>{e.preventDefault();},{passive:false});b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();b.classList.add('on');noClickUntil=performance.now()+450;fn();});['pointerup','pointercancel','pointerleave'].forEach(t=>b.addEventListener(t,()=>b.classList.remove('on')));b.addEventListener('click',e=>e.stopPropagation());};
    tapBtn(btnA,()=>pressA());tapBtn(btnB,()=>pressB());tapBtn(menuBtn,()=>pressB());
    [pad].forEach(e=>e.addEventListener('click',ev=>ev.stopPropagation()));

    // ── 状態 ──
    const mkActor=(id)=>({id,x:0,y:0,dir:'d',fr:0,at:0,moving:false,on:false,a:0,pose:'',ex:'',z:0,jump:0,walk:null,flash:0,lunge:null});
    const V={mode:'scene',bg:'menu',t:0,stop:0,shake:0,hurt:0,map:null,cam:{x:0,y:0,lock:null},follow:true,trail:[],
      A:{dan:mkActor('dan'),mina:mkActor('mina'),kid:mkActor('kid')},ents:[],tw:[],fx:[],pops:[],floats:[],parts:[],emos:[],light:null,
      roam:null,leaveVal:undefined,lastTile:-1,form:'normal',kidKey:'kidHome',porFoe:'noise',fmenu:null,target:null,camX:0,camY:0,porNpc:'miyako',watch:false};
    ['normal','happy','tired','fear','win','collapse'].forEach(e=>img('char_'+e));
    ['normal','happy','sad','sleep'].forEach(e=>kidImg(e));

    const sleep=ms=>new Promise((res,rej)=>setTimeout(()=>mg._ended?rej(ABORT):res(),ms));
    function tween(o,k,to,ms,ease){
      return new Promise((res,rej)=>{V.tw=V.tw.filter(t=>!(t.o===o&&t.k===k));V.tw.push({o,k,from:o[k],to,dur:Math.max(.001,ms/1000),t:0,ease,res,rej});});
    }
    const moveTo=(o,x,y,ms)=>Promise.all([tween(o,'x',x,ms),tween(o,'y',y,ms)]);
    function flash(a=.8){flashEl.style.transition='none';flashEl.style.opacity=a;void flashEl.offsetWidth;flashEl.style.transition='opacity .45s ease';flashEl.style.opacity=0;}
    function pop(wx,wy,t2,col,big){V.pops.push({x:wx,y:wy,txt:t2,col,t:0,big});}
    function burst(wx,wy,col,n=12,sp=60,sz=1){for(let i=0;i<n;i++){const a=Math.random()*6.283,v=sp*(.3+Math.random()*.7);V.parts.push({x:wx,y:wy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-10,life:.45+Math.random()*.4,t:0,col,sz:sz+(Math.random()<.3?1:0)});}}
    function bgm(t){if(mg._ended||typeof AU==='undefined')return;if(AU.bgmType!==t)AU.fadeBGM(t,500);}
    const done=id=>!!(run&&run.ev[id]);

    // ── 入力 ──
    let mode='none',focus={list:[],i:0,cols:1,back:null},kbBuf=null,tapRes=null,onFocusDesc=null;
    const KEY={u:0,d:0,l:0,r:0};
    const KMAP={ArrowUp:'u',ArrowDown:'d',ArrowLeft:'l',ArrowRight:'r',w:'u',W:'u',s:'d',S:'d',a:'l',A:'l',d:'r',D:'r'};
    const NAVK={w:'ArrowUp',W:'ArrowUp',s:'ArrowDown',S:'ArrowDown',a:'ArrowLeft',A:'ArrowLeft',d:'ArrowRight',D:'ArrowRight'};
    const isA=k=>k==='Enter'||k===' '||k==='z'||k==='Z';
    const isB=k=>k==='Escape'||k==='x'||k==='X';
    function clearKeys(){KEY.u=KEY.d=KEY.l=KEY.r=0;}
    window.addEventListener('blur',clearKeys);
    function btn(cls,html,fn){
      const b=el('button',cls,html);b.type='button';b.tabIndex=-1;
      b.addEventListener('mousedown',e=>e.preventDefault());
      b.addEventListener('click',e=>{e.stopPropagation();if(b.disabled||mg._ended)return;fn(e);});
      return b;
    }
    function setFocus(list,cols=1,back=null,start=0){
      focus={list,i:0,cols,back};
      let s=Math.min(start,list.length-1);while(s<list.length-1&&list[s]&&list[s].disabled)s++;focus.i=Math.max(0,s);
      list.forEach((b,i)=>b.addEventListener('pointerenter',()=>{if(focus.list===list&&!b.disabled&&focus.i!==i){focus.i=i;paintFocus();}}));
      paintFocus();
      if(kbBuf&&performance.now()-kbBuf.t<400){const k=kbBuf.k;kbBuf=null;navKey(k);}
    }
    function clearFocus(){focus={list:[],i:0,cols:1,back:null};}
    function paintFocus(){focus.list.forEach((b,i)=>b.classList.toggle('sel',i===focus.i));const b=focus.list[focus.i];if(b&&onFocusDesc)onFocusDesc(b.dataset.desc||'',b);}
    function navKey(k){
      const Ls=focus.list;if(!Ls.length)return;
      if(isA(k)){const b=Ls[focus.i];if(b&&!b.disabled)b.click();return;}
      if(isB(k)){if(focus.back&&!focus.back.disabled)focus.back.click();return;}
      k=NAVK[k]||k;
      const n=Ls.length,c=focus.cols;let d=0;
      if(k==='ArrowRight')d=1;else if(k==='ArrowLeft')d=-1;else if(k==='ArrowDown')d=c;else if(k==='ArrowUp')d=-c;else return;
      let j=focus.i;for(let s=0;s<n;s++){j=(j+d+n*4)%n;if(!Ls[j].disabled)break;}
      if(j!==focus.i){focus.i=j;paintFocus();sfx('cursor');}
    }
    // 画面全体のキー操作（main/ui.js 等）と二重に動かないよう、遊んでいる間は捕捉段階で受け取って止める
    const OWN_KEYS=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter','Escape','z','Z','x','X','w','W','a','A','s','S','d','D'];
    const capKey=e=>{
      if(mg._ended||!MG.def||MG.def.id!=='rpg'||!root.isConnected)return;
      if(!OWN_KEYS.includes(e.key))return;
      e.stopImmediatePropagation();
      onKeyEv(e);
    };
    window.addEventListener('keydown',capKey,true);window.addEventListener('keyup',capKey,true);
    mg.onKey(e=>onKeyEv(e));
    function onKeyEv(e){
      const k=e.key;
      if(e.cancelable)e.preventDefault();
      if(KMAP[k])KEY[KMAP[k]]=e.type==='keydown'?1:0;
      if(e.type!=='keydown')return;
      if(mode==='text'||mode==='tap'){if(isA(k)){if(e.repeat&&mode==='tap')return;onTap();}return;}
      if(focus.list.length){navKey(k);return;}
      if(mode==='target'){targetKey(k);return;}
      if(V.mode==='field'&&!e.repeat){if(isA(k))pressA();else if(isB(k))pressB();return;}
      kbBuf={k,t:performance.now()};
    }
    root.addEventListener('click',e=>{if(performance.now()<noClickUntil)return;if(mode==='target'){targetTap(e);return;}onTap();});
    function onTap(){
      if(mode==='text')advance();
      else if(mode==='tap'&&tapRes){const r=tapRes;tapRes=null;r();}
    }
    function pressA(){
      if(mode==='text'||mode==='tap'){onTap();return;}
      if(focus.list.length){navKey('Enter');return;}
      if(mode==='target'){targetKey('Enter');return;}
      if(V.mode==='field')interact();
    }
    function pressB(){
      if(focus.list.length){navKey('Escape');return;}
      if(mode==='target'){targetKey('Escape');return;}
      if(V.mode==='field')openFieldMenu();
    }
    function waitTap(ms,min=250){
      return new Promise((res,rej)=>{
        const t0=performance.now();let fin0=false,timer=null;
        const fin=()=>{if(fin0)return;fin0=true;clearTimeout(timer);if(mode==='tap'){mode='none';tapRes=null;}mg._ended?rej(ABORT):res();};
        const arm=()=>{mode='tap';tapRes=()=>{if(performance.now()-t0<min){arm();return;}fin();};};
        arm();if(ms>0)timer=setTimeout(fin,ms);
      });
    }

    // ── 文章 ──
    let tw=null;
    const SPK={n:{cls:'nar'},d:{name:'だんのうら',por:'dan'},m:{name:'ミナモ',cls:'mina',por:'mina'},mq:{name:'？？？',cls:'mina',por:'mina'},
      c:{name:'あの子',cls:'kid',por:'kid'},s:{name:'海の声',cls:'sea',por:'sea'},k:{cls:'com'},e:{cls:'foe',por:'foe'},p:{cls:'npc',por:'npc'}};
    const NPC_POR={'魚の子':'fish','夜勤の亡者':'worker','新人の亡者':'worker','珊瑚の先生':'teacher','眠れない人':'sleeper','都の人':'miyako'};
    const por={kind:null,expr:'normal'};
    function setBox(code,arg){
      const sp=SPK[code]||SPK.n;
      box.className='rpg-box '+(sp.cls||'');
      if(code==='k'&&['???','存在しないID','…'].includes(arg))box.classList.add('ghost');
      const name=(code==='k'||code==='e'||code==='p')?arg:sp.name;
      plate.textContent=name||'';plate.style.display=name?'':'none';
      por.kind=sp.por||null;
      por.expr=code==='d'?(['normal','happy','win','tired','fear','collapse'].includes(arg)?arg:'normal'):(arg||'normal');
      if(code==='d'&&V.form==='tired'&&['normal','happy','win'].includes(por.expr))por.expr='tired';
      if(code==='p')V.porNpc=NPC_POR[arg]||'miyako';
      porBox.style.display=por.kind?'':'none';
    }
    function showLine(text){
      return new Promise(res=>{
        box.classList.remove('rpg-hide');
        txt.textContent='';nextEl.style.visibility='hidden';
        tw={full:text,n:0,shown:0,done:false,res};mode='text';
        if(SPEEDS[R.opt.speed]>=9999)finishTw();
      });
    }
    function finishTw(){if(!tw)return;tw.n=tw.full.length;tw.done=true;txt.textContent=tw.full;nextEl.style.visibility='visible';}
    function advance(){if(!tw)return;if(!tw.done){finishTw();return;}const r=tw.res;tw=null;mode='none';AU.se('btn');r();}
    function typeStep(dt){
      if(!tw||tw.done)return;
      tw.n+=dt*SPEEDS[R.opt.speed];
      const n=Math.min(tw.full.length,Math.floor(tw.n));
      if(n!==tw.shown){
        if(Math.floor(n/2)!==Math.floor(tw.shown/2)&&/\S/.test(tw.full[n-1]||''))sfx('blip');
        tw.shown=n;txt.textContent=tw.full.slice(0,n);
      }
      if(n>=tw.full.length)finishTw();
    }
    async function play(lines){
      for(const Ln of lines){
        if(mg._ended)throw ABORT;
        if(Ln[0]==='#'){await directive(Ln.slice(1));continue;}
        const ci=Ln.indexOf(':');const head=Ln.slice(0,ci),text=Ln.slice(ci+1);
        const dot=head.indexOf('.');const code=dot<0?head:head.slice(0,dot),arg=dot<0?'':head.slice(dot+1);
        setBox(code,arg);
        await showLine(text);
      }
    }
    const who=w=>V.A[w]||V.ents.find(e=>e.id===w);
    const tx2=v=>(+v)*TS+8,ty2=v=>(+v)*TS+13;
    async function directive(s){
      const p=s.split(' '),cmd=p[0],a=p[1],b=p[2],c=p[3];
      const A=who(a);
      switch(cmd){
        case 'show':if(A){A.x=tx2(b);A.y=ty2(c);if(p[4])A.dir=p[4];A.on=true;A.hidden=false;if(A.a===undefined||A.a<.05)A.a=0;A.pose='';if(A===V.A.mina)V.follow=false;}break;
        case 'hide':if(A){A.on=false;if(A.npc)A.hidden=true;}break;
        case 'walk':case 'walk&':if(A){if(A===V.A.mina)V.follow=false;const pr=walkTo(A,tx2(b),ty2(c),+p[4]||1);if(cmd==='walk')await pr;}break;
        case 'face':if(A)A.dir=b;break;
        case 'emo':if(A)V.emos.push({a:A,sym:b,t:0});if(b==='!')sfx('spot');break;
        case 'pose':if(A){A.pose=b||'';}break;
        case 'jump':if(A){A.jump=.001;sfx('bubble');}break;
        case 'form':if(V.form!==a){V.form=a;const D=V.A.dan;burst(D.x,D.y-12,a==='tired'?'#ffffff':'#c8a0ff',16,50);sfx(a==='tired'?'down':'light');}break;
        case 'follow':V.follow=a==='on';if(V.follow){V.A.mina.on=true;seedTrail(V.A.mina);}break;
        case 'cam':V.cam.lock=a==='off'?null:{x:tx2(a),y:ty2(b)-6};break;
        case 'foe':{V.ents=V.ents.filter(e=>e.id!==a);const kind=b;V.ents.push({id:a,foe:true,disp:true,fixed:true,kinds:[kind],x:tx2(c),y:ty2(p[4]),a:0,on:true,alive:true});V.porFoe=kind;sfx('enemy');break;}
        case 'foeoff':{const E=V.ents.find(e=>e.id===a);if(E)E.on=false;break;}
        case 'var':if(V.map)V.map.v[a]=+b;break;
        case 'kid':V.kidKey=a;break;
        case 'se':AU.se(a);break;
        case 'bgm':bgm(a);break;
        case 'shake':V.shake=+a||6;sfx('enemy');break;
        case 'flash':flash(.85);sfx('light');break;
        case 'wait':hideBox();await sleep(+a||500);break;
        case 'float':V.floats.push({txt:s.slice(6),x:.2+Math.random()*.5,y:.22+Math.random()*.2,t:0});break;
      }
    }
    function walkTo(A,x,y,spd=1){
      return new Promise((res,rej)=>{A.on=true;A.walk={x,y,spd:52*spd,res,rej};});
    }

    // ── 場面転換 ──
    async function trans(type,mid){
      hideBox();
      if(type==='wipe'){
        sfx('wipe');
        fadeEl.className='rpg-fade wipe';void fadeEl.offsetWidth;fadeEl.classList.add('go');
        await sleep(520);mid&&mid();await sleep(120);
        fadeEl.classList.add('out');await sleep(540);fadeEl.className='rpg-fade';return;
      }
      fadeEl.className='rpg-fade on';await sleep(470);mid&&mid();await sleep(60);fadeEl.className='rpg-fade';await sleep(380);
    }

    // ══ マップ ══
    const TERR={'#':1,'.':1,',':1,':':1,'_':1,'~':1,' ':1,'=':1,'w':1};
    function loadMap(id){
      const D=MAPS[id];const rows=D.rows,h=rows.length,w=Math.max(...rows.map(r=>r.length));
      const leg=Object.assign({},LEG0,D.legend||{});
      let seed=7;for(const ch of id)seed=(seed*31+ch.charCodeAt(0))%100000;
      const m={id,D,theme:D.theme,w,h,t:[],block:new Uint8Array(w*h),hb:new Array(w*h).fill(null),at:new Array(w*h).fill(null),
        exitAt:{},trigAt:{},starts:{},marks:{},props:[],spots:[],anims:[],seed,cache:null};
      if(!run.mapv[id])run.mapv[id]={};m.v=run.mapv[id];
      V.ents=[];
      const pend=[];
      for(let y=0;y<h;y++){m.t.push([]);for(let x=0;x<w;x++){
        const ch=rows[y][x]||'#',Lg=leg[ch];
        if(Lg){m.t[y].push(Lg.tile||'.');pend.push([Lg,x,y]);}
        else m.t[y].push(TERR[ch]?ch:'.');
      }}
      (D.props||[]).forEach(o=>pend.push([{p:o.k},o.x,o.y]));
      pend.forEach(([Lg,x,y])=>{
        const k=y*w+x;
        if(Lg.p||Lg.chest){
          const kind=Lg.chest?'chest':Lg.p;const P=PROPS[kind];
          const o={k:kind,P,x,y,id:Lg.id||(kind+x+'_'+y),ev:Lg.ev||(kind==='save'?'save':null),hideIf:Lg.hideIf||null,chest:Lg.chest||null,m};
          m.props.push(o);
          const sol=P.solid?(Array.isArray(P.solid[0])?P.solid:[P.solid]):[];
          sol.forEach(([dx,dy,sw,sh])=>{for(let j=0;j<sh;j++)for(let i=0;i<sw;i++){const xx=Math.floor(x)+dx+i,yy=Math.floor(y)+dy+j;if(xx<0||yy<0||xx>=w||yy>=h)continue;const kk=yy*w+xx;
            if(o.hideIf)m.hb[kk]=o.hideIf;else m.block[kk]=1;if(o.ev||o.chest)m.at[kk]=o;}});
          if((o.ev||o.chest)&&!sol.length)m.at[k]=o;
        }
        if(Lg.npc)V.ents.push({id:Lg.id,npc:true,kind:Lg.npc,ev:Lg.ev,x:x*TS+8,y:y*TS+13,dir:Lg.dir||'d',fr:0,at:0,a:1,on:true,alive:true,ph:Math.random()*6});
        if(Lg.foe&&!run.dead[Lg.id])V.ents.push({id:Lg.id,foe:true,kinds:Lg.foe,form:Lg.form,ev:Lg.ev,fixed:!!Lg.fixed,x:x*TS+8,y:y*TS+13,hx:x*TS+8,hy:y*TS+13,a:1,on:true,alive:true,st:'wander',wt:Math.random()*2,tx:x*TS+8,ty:y*TS+13,stun:0,ph:Math.random()*6});
        if(Lg.spot){const o={spot:true,ev:Lg.spot,id:Lg.spot,x,y};m.at[k]=o;m.spots.push(o);if(Lg.solid)m.block[k]=1;}
        if(Lg.exit)m.exitAt[k]={to:Lg.exit,spawn:Lg.to||'start',need:Lg.need||null,msg:Lg.msg||null};
        if(Lg.trig)m.trigAt[k]=Lg.trig;
        if(Lg.start)m.starts[Lg.start]={x,y,dir:Lg.dir||null};
        if(Lg.mark)m.marks[Lg.mark]={x,y};
      });
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=m.t[y][x];if(c==='~'||c==='=')m.anims.push([x,y,c]);}
      paintMap(m);
      V.map=m;V.lastTile=-1;
      return m;
    }
    function paintMap(m){
      const c=m.cache||document.createElement('canvas');c.width=m.w*TS;c.height=m.h*TS;const g=c.getContext('2d');
      for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++)paintTile(g,m,x,y);
      m.cache=c;
    }
    const tileOf=(px,py)=>{const m=V.map;const tx=Math.floor(px/TS),ty=Math.floor(py/TS);return (tx<0||ty<0||tx>=m.w||ty>=m.h)?-1:ty*m.w+tx;};
    function solidAt(px,py){
      const m=V.map;const tx=Math.floor(px/TS),ty=Math.floor(py/TS);
      if(tx<0||ty<0||tx>=m.w||ty>=m.h)return true;
      if(SOLID_T[m.t[ty][tx]])return true;
      const k=ty*m.w+tx;if(m.block[k])return true;
      if(m.hb[k]&&!done(m.hb[k]))return true;
      return false;
    }
    function boxFree(x,y,self){
      if(solidAt(x-5,y-5)||solidAt(x+4,y-5)||solidAt(x-5,y-1)||solidAt(x+4,y-1))return false;
      for(const e of V.ents){if(e===self||!e.npc||!e.on||e.hidden)continue;if(Math.abs(e.x-x)<10&&Math.abs(e.y-y)<7)return false;}
      return true;
    }
    function tryMove(a,dx,dy){
      let moved=false;
      if(dx){if(boxFree(a.x+dx,a.y,a)){a.x+=dx;moved=true;}
        else if(!dy){for(const n of [-1,1]){let ok=false;for(let k=1;k<=7;k++){if(boxFree(a.x+dx,a.y+n*k,a)){ok=true;break;}if(!boxFree(a.x,a.y+n*k,a))break;}if(ok&&boxFree(a.x,a.y+n,a)){a.y+=n*Math.min(1,Math.abs(dx));moved=true;break;}}}}
      if(dy){if(boxFree(a.x,a.y+dy,a)){a.y+=dy;moved=true;}
        else if(!dx){for(const n of [-1,1]){let ok=false;for(let k=1;k<=7;k++){if(boxFree(a.x+n*k,a.y+dy,a)){ok=true;break;}if(!boxFree(a.x+n*k,a.y,a))break;}if(ok&&boxFree(a.x+n,a.y,a)){a.x+=n*Math.min(1,Math.abs(dy));moved=true;break;}}}}
      return moved;
    }
    function seedTrail(f){
      const D=V.A.dan;V.trail=[];
      const sx=f&&f.on?f.x:D.x-DIRV[D.dir][0]*16,sy=f&&f.on?f.y:D.y-DIRV[D.dir][1]*16;
      for(let i=0;i<=30;i++){const k=i/30;V.trail.push({x:sx+(D.x-sx)*k,y:sy+(D.y-sy)*k,dir:D.dir});}
    }
    function trailAt(dist){
      const T=V.trail;let acc=0;
      for(let i=T.length-1;i>0;i--){const a=T[i],b=T[i-1];const d=Math.hypot(a.x-b.x,a.y-b.y);if(acc+d>=dist){const k=(dist-acc)/(d||1);return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,dir:b.dir};}acc+=d;}
      return T[0]||{x:V.A.dan.x,y:V.A.dan.y,dir:V.A.dan.dir};
    }
    function placeParty(spawn,dir){
      const m=V.map,s=m.starts[spawn]||m.starts.start||{x:1,y:1};
      const D=V.A.dan;D.x=s.x*TS+8;D.y=s.y*TS+13;D.dir=dir||s.dir||'u';D.pose='';D.walk=null;D.on=true;D.a=1;
      const M=V.A.mina;const bx=D.x-DIRV[D.dir][0]*14,by=D.y-DIRV[D.dir][1]*14;
      M.x=boxFree(bx,by)?bx:D.x;M.y=boxFree(bx,by)?by:D.y;M.dir=D.dir;M.pose='';M.walk=null;
      seedTrail(M);
      V.cam.lock=null;V.cam.x=D.x;V.cam.y=D.y;V.lastTile=tileOf(D.x,D.y-3);
    }
    let locEl=null;
    function showLoc(name){if(locEl)locEl.remove();locEl=el('div','rpg-loc rpg-pass',name);ui.appendChild(locEl);setTimeout(()=>{if(locEl&&locEl.textContent===name){locEl.remove();locEl=null;}},3300);}
    async function enter(id,spawn='start',opt={}){
      await trans('fade',()=>{
        loadMap(id);V.mode=V.mode==='field'?'cut':V.mode==='scene'?'cut':V.mode;
        placeParty(spawn,opt.dir);
        const M=V.A.mina;M.on=!opt.alone&&id!=='home';M.a=M.on?1:0;V.follow=M.on;
        V.A.kid.on=false;V.A.kid.a=0;V.A.kid.pose='';V.emos=[];V.fx=[];V.parts=[];
        if(id==='home'){V.A.mina.on=false;V.A.mina.a=0;}
        mg.setScore&&score();
      });
      if(id!=='home')showLoc(MAPS[id].name);
    }

    // ══ フィールドの1フレーム ══
    const SPEED=80;
    function animActor(a,dt,moving,spd=1){
      if(moving){a.at+=dt*spd*7.5;a.fr=Math.floor(a.at)%4;a.moving=true;}else{a.moving=false;a.at=0;a.fr=0;}
    }
    function dirOf(dx,dy,prev){if(Math.abs(dx)>Math.abs(dy)*1.15)return dx>0?'r':'l';if(Math.abs(dy)>Math.abs(dx)*1.15)return dy>0?'d':'u';
      if((prev==='l'||prev==='r')&&Math.sign(dx)===(prev==='r'?1:-1))return prev;if((prev==='u'||prev==='d')&&Math.sign(dy)===(prev==='d'?1:-1))return prev;return Math.abs(dx)>=Math.abs(dy)?(dx>0?'r':'l'):(dy>0?'d':'u');}
    function updField(dt){
      const m=V.map;if(!m)return;
      const D=V.A.dan,M=V.A.mina;
      [D,M,V.A.kid,...V.ents].forEach(a=>{
        if(a.walk){const w=a.walk,dx=w.x-a.x,dy=w.y-a.y,l=Math.hypot(dx,dy),st=w.spd*dt;
          if(l<=st+.01){a.x=w.x;a.y=w.y;a.walk=null;animActor(a,dt,false);w.res();}
          else{a.x+=dx/l*st;a.y+=dy/l*st;a.dir=dirOf(dx,dy,a.dir);animActor(a,dt,true,w.spd/52);}
          if(a===D)pushTrail();
        }
        if(a.jump>0){a.jump+=dt;a.z=-Math.sin(Math.min(1,a.jump/.36)*Math.PI)*7;if(a.jump>.36){a.jump=0;a.z=0;}}
        if(a.flash>0)a.flash=Math.max(0,a.flash-dt*3);
        const tgt=a.on?1:0;if(a.a===undefined)a.a=1;a.a+=(tgt-a.a)*Math.min(1,dt*5);
      });
      if(V.mode==='field'&&!V.fmenu){
        let ix=KEY.r-KEY.l+stick.x,iy=KEY.d-KEY.u+stick.y;const l=Math.hypot(ix,iy);
        if(l>.2){if(l>1){ix/=l;iy/=l;}
          const sp=SPEED*dt;const mv=tryMove(D,ix*sp,iy*sp);
          D.dir=dirOf(ix,iy,D.dir);animActor(D,dt,true);
          if(mv)pushTrail();else animActor(D,dt,true,.5);
          const tk=tileOf(D.x,D.y-3);if(tk!==V.lastTile){V.lastTile=tk;stepTile(tk);}
        }else animActor(D,dt,false);
        updFoes(dt);
        V.target=findInteract();
      }else V.target=null;
      if(V.follow&&M.on&&!M.walk&&!(BT&&BT.on)){
        const p=trailAt(16);const dx=p.x-M.x,dy=p.y-M.y,mv=Math.hypot(dx,dy);
        if(mv>90){M.x=p.x;M.y=p.y;}else if(mv>.15){const st=Math.min(mv,Math.max(SPEED*1.6,mv*8)*dt);M.x+=dx/mv*st;M.y+=dy/mv*st;}
        if(mv>.15){M.dir=dirOf(dx,dy,M.dir);animActor(M,dt,true);}else animActor(M,dt,false);
      }
      V.ents.forEach(e=>{if(e.npc&&!e.walk){e.ph+=dt;}});
      // カメラ
      const f=V.cam.lock||(BT&&BT.on?BT.camAt:{x:D.x,y:D.y-8});
      const bottom=(BT&&BT.on?190:V.mode==='field'?60:72)*dpr/SC;
      const ty=f.y+bottom*.5;
      V.cam.x+=(f.x-V.cam.x)*Math.min(1,dt*7);V.cam.y+=(ty-V.cam.y)*Math.min(1,dt*7);
    }
    function pushTrail(){const D=V.A.dan,T=V.trail,l=T[T.length-1];if(!l||Math.hypot(l.x-D.x,l.y-D.y)>=1){T.push({x:D.x,y:D.y,dir:D.dir});if(T.length>120)T.shift();}}
    function camView(){
      const m=V.map;let cx=V.cam.x,cy=V.cam.y;const mw=m.w*TS,mh=m.h*TS;
      cx=mw<=VW?mw/2:clamp(cx,VW/2,mw-VW/2);cy=mh<=VH?mh/2:clamp(cy,VH/2,mh-VH/2);
      let sx=0,sy=0;if(V.shake>0){sx=(Math.random()-.5)*V.shake*.5;sy=(Math.random()-.5)*V.shake*.5;}
      V.camX=Math.round(cx-VW/2+sx);V.camY=Math.round(cy-VH/2+sy);
    }
    function stepTile(k){
      const m=V.map;if(k<0)return;
      const ex=m.exitAt[k];
      if(ex){
        if(ex.need&&!ex.need.every(done)){
          const D=V.A.dan;const dv=DIRV[D.dir];D.x-=dv[0]*8;D.y-=dv[1]*8;V.lastTile=tileOf(D.x,D.y-3);sfx('bump');
          runEvent(()=>play([ex.msg||'n:……まだ、ここで済ませることがある気がする。']));return;
        }
        sfx('door');runEvent(()=>enter(ex.to,ex.spawn));return;
      }
      const tg=m.trigAt[k];
      if(tg&&!done(tg)){runEvent(async()=>{run.ev[tg]=1;await EV[tg](G);});}
    }
    function findInteract(){
      const D=V.A.dan,dv=DIRV[D.dir],m=V.map;
      for(const dist of [9,15]){
        const px=D.x+dv[0]*dist,py=D.y-4+dv[1]*dist;
        for(const e of V.ents){if(!e.on||e.hidden||!e.alive)continue;if(!(e.npc||(e.foe&&e.ev)))continue;if(Math.abs(e.x-px)<10&&Math.abs(e.y-5-py)<11)return e;}
        const k=tileOf(px,py);if(k>=0&&m.at[k]){const o=m.at[k];if(o.hideIf&&done(o.hideIf))continue;return o;}
      }
      return null;
    }
    function interact(){
      const o=V.target||findInteract();if(!o)return;
      const D=V.A.dan;
      if(o.npc){runEvent(async()=>{const dx=D.x-o.x,dy=D.y-o.y;const od=o.dir;o.dir=dirOf(dx,dy,o.dir);await EV[o.ev](G);o.dir=od;run.ev[o.ev]=1;});return;}
      if(o.foe){runEvent(async()=>{await EV[o.ev](G);run.ev[o.ev]=1;});return;}
      if(o.chest){
        if(run.chest[o.id]){runEvent(()=>play(['n:宝箱は、もう空っぽだ。']));return;}
        runEvent(async()=>{run.chest[o.id]=1;o.open=1;sfx('chest');burst(o.x*TS+8,o.y*TS+4,'#ffe070',10,40);await giveItem(o.chest,1,true);});return;
      }
      if(o.ev==='save'){runEvent(saveLantern);return;}
      if(o.ev&&EV[o.ev]){
        if(done(o.ev)){runEvent(()=>play(['n:……もう、ここには何もない。']));return;}
        runEvent(async()=>{await EV[o.ev](G);run.ev[o.ev]=1;});
      }
    }
    async function saveLantern(){
      sfx('save');AU.se('repair');flash(.35);
      const P=run.party;P.dan.hp=pMax('dan');P.dan.mp=pMpMax('dan');P.mina.hp=pMax('mina');P.mina.mp=pMpMax('mina');
      [V.A.dan,V.A.mina].forEach(a=>addFx('heal',{a,dur:1}));
      await play(['n:灯籠の青い光が、体の芯まで温める。……HPと息が、すっかり戻った。']);
    }
    function updFoes(dt){
      const D=V.A.dan;
      for(const f of V.ents){
        if(!f.foe||f.fixed||!f.alive||!f.on)continue;
        f.ph+=dt;
        if(f.stun>0){f.stun-=dt;continue;}
        const dx=D.x-f.x,dy=D.y-f.y,d=Math.hypot(dx,dy);
        if(f.st==='wander'){
          f.wt-=dt;
          if(f.wt<=0){f.wt=1.4+Math.random()*2;const a=Math.random()*6.283;f.tx=f.hx+Math.cos(a)*22;f.ty=f.hy+Math.sin(a)*16;}
          const ddx=f.tx-f.x,ddy=f.ty-f.y,l=Math.hypot(ddx,ddy);
          if(l>1){const st=Math.min(l,16*dt);tryMove(f,ddx/l*st,ddy/l*st);}
          if(d<DF.sight){f.st='chase';V.emos.push({a:f,sym:'!',t:0});sfx('spot');}
        }else{
          if(d>DF.sight*2.2){f.st='wander';f.wt=0;}
          else if(d>1){const st=DF.chase*dt;tryMove(f,dx/d*st,dy/d*st);}
        }
        if(d<12){f.st='wander';foeBattle(f);return;}
      }
    }
    function foeBattle(f){
      runEvent(async()=>{
        const r=await battle(f.kinds,{fieldEnt:f,form:f.form});
        if(r==='run'){f.stun=3.5;f.st='wander';}
      });
    }
    async function runEvent(fn){
      if(V.mode!=='field')return;
      V.mode='cut';showPad(false);closeFieldMenu();
      try{await fn();}
      catch(e){
        if(e===ABORT){if(V.roam){const r=V.roam;V.roam=null;r.rej(ABORT);}return;}
        console.error(e);
      }
      hideBox();
      if(V.leaveVal!==undefined){const v=V.leaveVal;V.leaveVal=undefined;const r=V.roam;V.roam=null;if(r)r.res(v);return;}
      if(!mg._ended&&V.roam){V.mode='field';showPad(true);}
    }
    function roam(){hideBox();const M=V.A.mina;if(M.on&&!V.follow){V.follow=true;M.walk=null;V.trail=[{x:V.A.dan.x,y:V.A.dan.y,dir:V.A.dan.dir}];}
      return new Promise((res,rej)=>{V.roam={res,rej};V.mode='field';V.cam.lock=null;showPad(true);});}

    // ══ 描画 ══
    function drawSpr(c,sx,sy,alpha,flashC){
      if(flashC){TX.clearRect(0,0,SW,SH);TX.globalCompositeOperation='source-over';TX.drawImage(c,0,0);TX.globalCompositeOperation='source-atop';TX.fillStyle=flashC;TX.fillRect(0,0,SW,SH);TX.globalCompositeOperation='source-over';c=tc;}
      L.globalAlpha=alpha;L.drawImage(c,sx,sy);L.globalAlpha=1;
    }
    function actorKey(a){
      if(a.id==='dan'){const tired=V.form==='tired'||(BT&&BT.on&&BT.pa&&BT.pa[0].hp<BT.pa[0].max*.35);return tired?'danT':'dan';}
      if(a.id==='mina')return 'mina';if(a.id==='kid')return V.kidKey;return a.kind;
    }
    function drawActor(a){
      if(a.a<=.02||a.hidden)return;
      const key=actorKey(a);
      const sx=Math.round(a.x-V.camX),sy=Math.round(a.y-V.camY);
      if(sx<-30||sx>VW+30||sy<-10||sy>VH+40)return;
      const isM=a.id==='mina';
      const bob=isM&&!a.pose?Math.round(Math.sin(V.t*2.4)*1.5-2):0;
      L.globalAlpha=a.a*.35;L.fillStyle='#000';L.fillRect(sx-5,sy-1,10,2);L.fillRect(sx-4,sy-2,8,4);L.globalAlpha=1;
      if(isM){L.globalCompositeOperation='lighter';const g=L.createRadialGradient(sx,sy-12,1,sx,sy-12,20);g.addColorStop(0,`rgba(90,220,255,${.22*a.a})`);g.addColorStop(1,'rgba(90,220,255,0)');L.fillStyle=g;L.fillRect(sx-20,sy-32,40,40);L.globalCompositeOperation='source-over';}
      if(key==='fish'){drawFish(sx,sy+Math.round(Math.sin(a.ph*2)*2)-8,a.dir,a.a);return;}
      const fl=a.flash>0?`rgba(255,${a.flashW?255:60},${a.flashW?255:90},${a.flash})`:null;
      const alpha=a.a*(isM?.86:a.npc?.72:1)*(a.ko?.45:1);
      if(a.pose==='sleep'||a.pose==='down'){
        const c=sprite(key,'d',0,'',a.pose==='sleep'||a.pose==='down'?'closed':'');
        L.save();L.translate(sx,sy-5);L.rotate((a.dir==='r'?1:-1)*Math.PI/2);L.globalAlpha=alpha;L.drawImage(c,-SW/2,-16);L.restore();L.globalAlpha=1;
        if(a.pose==='sleep'&&Math.floor(V.t*1.2)%2===0)glyph('z',sx+8,sy-18-Math.round((V.t*6)%4),'#a8c0ff');
        return;
      }
      let pose=a.pose,dir=a.dir,ex=a.ex;
      if(pose==='win'||pose==='hurt'){dir='d';if(pose==='hurt')ex='hurt';}
      const c=sprite(key,dir,a.moving?a.fr:0,pose==='hurt'?'':pose,ex);
      drawSpr(c,sx-12,sy-FEET+bob+Math.round(a.z||0),alpha,fl);
    }
    function drawFish(sx,sy,dir,al){
      const r=painter(L),f=dir==='l'?-1:1;L.globalAlpha=al*.9;
      const xx=v=>sx+v*f-(f<0?1:0);
      r(Math.min(xx(-5),xx(4)),sy-2,9,5,'#8af0e0');r(Math.min(xx(-4),xx(3)),sy-3,7,1,'#c0fff4');r(Math.min(xx(-8),xx(-6)),sy-3,3,7,'#5ad0c8');r(xx(2),sy-1,1,1,'#14303a');
      L.globalAlpha=1;
    }
    function drawFoeEnt(e,s,alpha){
      const sx=Math.round(e.x-V.camX),sy=Math.round(e.y-V.camY);
      if(sx<-s||sx>VW+s||sy<-s*1.2||sy>VH+s)return;
      const bob=Math.round(Math.sin(V.t*2+(e.ph||0))*1.5);
      L.globalAlpha=.3*alpha;L.fillStyle='#000';L.beginPath();L.ellipse(sx,sy,s*.32,s*.08+1,0,0,6.283);L.fill();L.globalAlpha=1;
      L.save();L.globalAlpha=alpha;L.translate(sx+(e.sh?Math.round((Math.random()-.5)*e.sh):0),sy-s*.5+bob-(e.lift||0));
      if(e.dead)L.scale(1+e.dead*.3,1-e.dead*.7);
      FOES[e.kind||e.kinds[0]](L,s,V.t+(e.ph||0),e.fx||{});
      L.restore();
      if(e.hit>0){/* 白く光らせる：上から加算で重ねる */L.save();L.globalCompositeOperation='lighter';L.globalAlpha=e.hit*.8*alpha;L.fillStyle='#fff';L.beginPath();L.ellipse(sx,sy-s*.5+bob,s*.38,s*.38,0,0,6.283);L.fill();L.restore();}
    }
    function glyph(sym,x,y,col){const G0=GLYPH[sym];if(!G0)return;L.fillStyle=col||GLYPH_C[sym]||'#fff';for(let j=0;j<5;j++)for(let i=0;i<5;i++)if(G0[j][i]==='#')L.fillRect(x+i-2,y+j-2,1,1);}
    function balloon(x,y,sym){
      x=Math.round(x);y=Math.round(y);
      L.fillStyle='#140a24';L.fillRect(x-6,y-6,13,12);L.fillRect(x-5,y-7,11,14);
      L.fillStyle='#fff';L.fillRect(x-5,y-5,11,10);L.fillRect(x-4,y-6,9,12);L.fillRect(x-1,y+6,3,2);L.fillRect(x,y+8,1,1);
      glyph(sym,x,y);
    }
    function drawProp(o){
      if(o.hideIf&&done(o.hideIf))return;
      const px=Math.round(o.x*TS-V.camX),py=Math.round(o.y*TS-V.camY);
      if(px>VW+8||py>VH+8||px+o.P.w*TS<-8||py+o.P.h*TS<-20)return;
      if(o.k==='chest')o.open=!!run.chest[o.id];
      o.done=o.ev?done(o.ev)||(o.k==='biglantern'&&done('big')):false;
      if(o.k==='biglantern')o.done=done('big');
      o.P.draw(L,px,py,V.t,o);
    }
    function render(){
      const W2=cv.width,H2=cv.height;
      X.setTransform(1,0,0,1,0,0);
      if(V.mode==='scene'||!V.map){
        X.setTransform(dpr,0,0,dpr,0,0);(SCENES[V.bg]||SCENES.menu)(X,W,H,V.t);
        drawFloats();return;
      }
      const m=V.map,th=THEMES[m.theme];
      camView();
      const cx=V.camX,cy=V.camY;
      L.globalAlpha=1;L.globalCompositeOperation='source-over';
      L.fillStyle=th.bg;L.fillRect(0,0,VW,VH);
      L.drawImage(m.cache,-cx,-cy);
      // 動くタイル
      const wc=th.water||['#000','#888'];
      for(const [x,y,c] of m.anims){
        const px=x*TS-cx,py=y*TS-cy;if(px<-16||py<-16||px>VW||py>VH)continue;
        if(c==='~'){
          if(m.theme==='vortex'||m.theme==='abyss'){const a=(V.t*1.5+x*.7+y*.9)%6.283;L.fillStyle=m.theme==='abyss'?'rgba(255,120,80,.35)':'rgba(170,90,255,.4)';L.fillRect(px+8+Math.round(Math.cos(a)*5),py+8+Math.round(Math.sin(a)*4),2,1);}
          else{const o=Math.floor((V.t*7+y*5+x*3)%16);L.fillStyle=wc[1];L.fillRect(px+o,py+5+(x%2)*5,4,1);L.fillStyle='rgba(200,230,255,.25)';L.fillRect(px+((o+8)%16),py+11,2,1);}
        }else if(c==='='&&m.v.conveyor){const o=Math.floor((V.t*18)%4);L.fillStyle='#1a2a2c';for(let i=0;i<16;i+=4)L.fillRect(px+i+o,py+3,1,10);}
      }
      // 奥から順に
      const list=[];
      m.props.forEach(o=>list.push({y:o.P.high===-1?-1e9:(o.y+o.P.h)*TS+(o.P.high?40:0),f:()=>drawProp(o)}));
      V.ents.forEach(e=>{if(!e.on&&e.a<.02)return;if(e.hidden)return;
        if(e.npc)list.push({y:e.y,f:()=>drawActor(e)});
        else if(e.foe&&e.alive)list.push({y:e.y,f:()=>{const al=e.a*(e.stun>0?(Math.floor(V.t*10)%2?.35:.8):1);
          if(!e.disp)for(let i=e.kinds.length-1;i>=1;i--){const o={x:e.x+(i%2?9:-9)*Math.ceil(i/2),y:e.y-4-2*i,kind:e.kinds[i],ph:(e.ph||0)+i*1.7,fx:{}};drawFoeEnt(o,EN[o.kind].s*.7,al*.9);}
          drawFoeEnt(e,EN[e.kinds[0]].s*(e.disp?1:.86),al);}});});
      if(BT&&BT.en)BT.en.forEach(e=>{if(e.a>.02)list.push({y:e.y,f:()=>drawFoeEnt(e,e.s,e.a)});});
      [V.A.kid,V.A.mina,V.A.dan].forEach(a=>{if(a.a>.02)list.push({y:a.y+(a===V.A.dan?.1:0),f:()=>drawActor(a)});});
      list.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
      // 調べられる場所のきらめき
      const tw2=Math.floor(V.t*3)%3;
      m.spots.forEach(o=>{if(done(o.ev))return;const px=o.x*TS+8-cx,py=o.y*TS+6-cy;sparkle(px,py,tw2);});
      m.props.forEach(o=>{if(!o.ev||o.ev==='save'||done(o.ev)||(o.hideIf&&done(o.hideIf)))return;const px=o.x*TS+o.P.w*8-cx,py=o.y*TS-2-cy;sparkle(px,py,tw2);});
      drawFxLo();
      // 海の気配：光の筋とマリンスノー
      if(th.ray&&!(m.id==='home')){
        L.globalCompositeOperation='lighter';
        for(let i=0;i<4;i++){const x0=((i*97-cx*.3+Math.sin(V.t*.2+i)*30)%(VW+80)+VW+80)%(VW+80)-40,w=10+i%2*8,al=.045+.02*Math.sin(V.t*.7+i*2);
          L.fillStyle=`rgba(${th.ray},${al})`;L.beginPath();L.moveTo(x0,0);L.lineTo(x0+w,0);L.lineTo(x0+w+50,VH);L.lineTo(x0+20,VH);L.fill();}
        L.globalCompositeOperation='source-over';
      }
      if(th.snow){L.fillStyle=th.snow;for(let i=0;i<46;i++){const sx2=((SNOW[i%70].x*VW*1.3-cx*.4+Math.sin(V.t*.5+i)*4)%VW+VW)%VW,sy2=((SNOW[i%70].y*VH+V.t*(4+i%5*2)-cy*.4)%VH+VH)%VH;L.globalAlpha=SNOW[i%70].a;L.fillRect(sx2|0,sy2|0,1,1);}L.globalAlpha=1;}
      // 明るさ
      const dark=m.id==='home'?(m.v.morning?0:.42):(th.dark||0)*(m.v.dim?1.25:1);
      if(dark>0){
        LC.globalCompositeOperation='source-over';LC.clearRect(0,0,VW,VH);LC.fillStyle=`rgba(2,0,12,${Math.min(.85,dark)})`;LC.fillRect(0,0,VW,VH);
        LC.globalCompositeOperation='destination-out';
        const hole=(x,y,r,a=1)=>{const g=LC.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');LC.fillStyle=g;LC.fillRect(x-r,y-r,r*2,r*2);};
        hole(V.A.dan.x-cx,V.A.dan.y-10-cy,46);if(V.A.mina.a>.1)hole(V.A.mina.x-cx,V.A.mina.y-12-cy,34,.8);
        m.props.forEach(o=>{const gl=o.P.glow;if(!gl||(o.hideIf&&done(o.hideIf)))return;if(o.k==='toro'&&m.v.dim)return;if(o.k==='biglantern'&&done('big'))return;
          hole(o.x*TS+gl[0]-cx,o.y*TS+gl[1]-cy,gl[2]*(1+.06*Math.sin(V.t*6+o.x)),.95);});
        if(BT&&BT.on)BT.en.forEach(e=>{if(e.alive)hole(e.x-cx,e.y-e.s*.5-cy,e.s*.9,.7);});
        L.drawImage(lc,0,0);
        // 灯の色をのせる
        L.globalCompositeOperation='lighter';
        m.props.forEach(o=>{const gl=o.P.glow;if(!gl||(o.hideIf&&done(o.hideIf)))return;if(o.k==='toro'&&m.v.dim)return;if(o.k==='biglantern'&&done('big'))return;
          const x=o.x*TS+gl[0]-cx,y=o.y*TS+gl[1]-cy,r=gl[2]*.7;if(x<-r||x>VW+r||y<-r||y>VH+r)return;const g=L.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${gl[3]},.16)`);g.addColorStop(1,`rgba(${gl[3]},0)`);L.fillStyle=g;L.fillRect(x-r,y-r,r*2,r*2);});
        L.globalCompositeOperation='source-over';
      }
      if(m.id==='home'&&m.v.morning){L.fillStyle='rgba(255,226,170,.13)';L.fillRect(0,0,VW,VH);L.globalCompositeOperation='lighter';L.fillStyle='rgba(255,240,200,.08)';L.beginPath();L.moveTo(96-cx,30-cy);L.lineTo(128-cx,30-cy);L.lineTo(150-cx,120-cy);L.lineTo(80-cx,120-cy);L.fill();L.globalCompositeOperation='source-over';}
      if(m.theme==='abyss'){L.fillStyle='rgba(255,90,60,.07)';L.fillRect(0,0,VW,VH);}
      // 吹き出し・調べる印
      V.emos.forEach(e=>{const a=e.a;const k=Math.min(1,e.t/.12);const yy=a.y-V.camY-(a.foe?(EN[a.kinds?a.kinds[0]:a.kind]||{s:24}).s+4:30)-(1-k)*4+(a.z||0);balloon(a.x-V.camX,yy,e.sym);});
      if(V.mode==='field'&&V.target){
        const o=V.target;let x,y;
        if(o.npc||o.foe){x=o.x;y=o.y-(o.foe?28:30);}else if(o.P){x=o.x*TS+o.P.w*8;y=o.y*TS-4;}else{x=o.x*TS+8;y=o.y*TS-2;}
        const b=Math.round(Math.sin(V.t*6)*1.5);
        L.fillStyle='#140a24';L.fillRect(x-cx-3,y-cy-6+b,7,7);L.fillStyle='#ffe066';L.fillRect(x-cx-2,y-cy-5+b,5,5);L.fillStyle='#140a24';L.fillRect(x-cx,y-cy-4+b,1,2);L.fillRect(x-cx,y-cy-1+b,1,1);
      }
      if(BT&&BT.on)drawBattleLo();
      if(V.hurt>0){L.fillStyle=`rgba(200,20,50,${V.hurt*.25})`;L.fillRect(0,0,VW,VH);}
      // 拡大して貼る
      X.imageSmoothingEnabled=false;X.drawImage(lo,0,0,VW*SC,VH*SC);
      // 高解像度で重ねる：名前の渦・ダメージの数字・浮かぶコメント
      if(m.D.names&&!(BT&&BT.on)){
        X.save();X.font=`${Math.round(11*dpr)}px "DotGothic16",monospace`;X.textAlign='center';
        const ccx=(m.w*TS/2-cx)*SC,ccy=(5*TS-cy)*SC;
        NAMES_FLOAT.forEach((n,i)=>{const sp=m.v.calm?.05:.18;const a=i*.7+V.t*sp*(1+i%3*.3),r=(60+((i*29)%40))*SC;
          X.fillStyle=n==='パパ'?`rgba(255,220,140,${.5+.3*Math.sin(V.t*2+i)})`:`rgba(220,200,255,${.22+.15*Math.sin(V.t*1.3+i)})`;X.fillText(n,ccx+Math.cos(a)*r,ccy+Math.sin(a)*r*.55);});
        X.restore();
      }
      drawFxHi();
      V.pops.forEach(p=>{
        const k=p.t/1.0;X.globalAlpha=Math.max(0,1-k*k);
        X.font=`${Math.round((p.big?17:14)*dpr)}px "DotGothic16",monospace`;X.textAlign='center';
        const yy=(p.y-cy)*SC-p.t*26*dpr-(p.t<.15?Math.sin(p.t/.15*Math.PI)*8*dpr:0),xx=(p.x-cx)*SC;
        X.lineWidth=4*dpr;X.strokeStyle='rgba(10,4,24,.95)';X.strokeText(p.txt,xx,yy);X.fillStyle=p.col;X.fillText(p.txt,xx,yy);
      });
      X.globalAlpha=1;
      drawFloats();
    }
    function sparkle(x,y,ph){x=Math.round(x);y=Math.round(y);L.fillStyle=ph===0?'#ffffff':'#ffe9a0';
      if(ph===1){L.fillRect(x-2,y,5,1);L.fillRect(x,y-2,1,5);}else{L.fillRect(x,y,1,1);L.fillRect(x-1,y-1,1,1);L.fillRect(x+1,y+1,1,1);}}
    function drawFloats(){
      X.setTransform(1,0,0,1,0,0);
      V.floats.forEach(f=>{
        const a=Math.min(1,f.t/.8)*Math.max(0,1-(f.t-3)/1.5);
        X.globalAlpha=Math.max(0,a)*.9;X.font=`${Math.round(Math.min(W*.045,18)*dpr)}px "DotGothic16",monospace`;X.textAlign='center';
        X.fillStyle='#ff9fb4';X.shadowColor='#e83055';X.shadowBlur=10*dpr;
        X.fillText(f.txt,f.x*W*dpr+Math.sin(f.t*7)*1.5,(f.y*H-f.t*8)*dpr);X.shadowBlur=0;
      });
      X.globalAlpha=1;
      if(V.light){
        const Lt=V.light,k=Math.min(1,Lt.t/1.3),cx2=W/2*dpr,cy2=H*(-.05+.43*(1-Math.pow(1-k,3)))*dpr,r=W*.05*dpr*(1+.15*Math.sin(V.t*5))*(1+Lt.t*.08);
        X.globalCompositeOperation='lighter';
        glow(X,cx2,cy2,r*7,`rgba(${LIGHT_COL[Lt.n]},A)`,.55);glow(X,cx2,cy2,r*2.2,'rgba(255,255,255,A)',.9);
        for(let i=0;i<10;i++){const a=V.t*1.4+i*.628,rr=r*(2.6+Math.sin(V.t*3+i)*.6);X.fillStyle=`rgba(${LIGHT_COL[Lt.n]},.8)`;X.fillRect(cx2+Math.cos(a)*rr,cy2+Math.sin(a)*rr,3*dpr,3*dpr);}
        X.globalCompositeOperation='source-over';
      }
    }
    // ── 演出（低解像度で描くもの） ──
    function addFx(type,o={}){V.fx.push(Object.assign({type,t:0,dur:.8},o));}
    function drawFxLo(){
      const cx=V.camX,cy=V.camY;
      V.fx.forEach(f=>{
        const k=f.t/f.dur;if(k>1||f.hi)return;
        const ax=f.a?f.a.x-cx:(f.x||0)-cx,ay=f.a?f.a.y-cy:(f.y||0)-cy;
        L.save();
        switch(f.type){
          case 'heal':for(let i=0;i<9;i++){L.fillStyle=i%2?'#a8ffd0':'#ffffff';L.globalAlpha=1-k;L.fillRect(Math.round(ax+Math.sin(i*1.9)*9),Math.round(ay-6-k*22-i*2),1,i%3?1:2);}break;
          case 'slash':{L.strokeStyle=`rgba(255,255,255,${1-k})`;L.lineWidth=1;for(let i=0;i<3;i++){const o=(i-1)*4,kk=Math.min(1,k*3);L.beginPath();L.moveTo(ax-8+o,ay-10);L.lineTo(ax-8+o+16*kk,ay-10+14*kk);L.stroke();}break;}
          case 'ring':{L.strokeStyle=`rgba(${f.col},${1-k})`;L.lineWidth=k<.5?2:1;L.beginPath();L.ellipse(ax,ay,(f.r||30)*(.15+k),(f.r||30)*(.15+k)*.62,0,0,6.283);L.stroke();break;}
          case 'beam':{const bx=f.x2-cx,by=f.y2-cy;L.globalCompositeOperation='lighter';L.strokeStyle=`rgba(${f.col},${(1-k)*.9})`;L.lineWidth=5*(1-k)+1;L.beginPath();L.moveTo(ax,ay);L.lineTo(bx,by);L.stroke();L.strokeStyle=`rgba(255,255,255,${1-k})`;L.lineWidth=1;L.stroke();break;}
          case 'notes':{for(let i=0;i<5;i++){const kk=clamp(k*1.4-i*.1,0,1);if(kk<=0||kk>=1)continue;const x=ax+(f.x2-cx-ax)*kk+Math.sin(kk*9+i)*5,y=ay-14+(f.y2-cy-(ay-14))*kk-Math.sin(kk*Math.PI)*16;glyph('♪',Math.round(x),Math.round(y),i%2?'#ffd8f0':'#9ff5ff');}break;}
          case 'spark':{L.fillStyle=`rgba(255,230,120,${1-k})`;for(let i=0;i<10;i++){const a=i*.63+(f.seed||0),r=4+k*16;L.fillRect(Math.round(ax+Math.cos(a)*r),Math.round(ay+Math.sin(a)*r*.8),2,1);}break;}
          case 'shield':{L.strokeStyle=`rgba(122,255,230,${(1-k)*.9})`;L.lineWidth=1;L.beginPath();for(let i=0;i<=6;i++){const a=i*Math.PI/3+Math.PI/6;L.lineTo(ax+Math.cos(a)*22,ay-12+Math.sin(a)*16);}L.stroke();L.fillStyle=`rgba(0,232,200,${(1-k)*.12})`;L.fill();break;}
          case 'zz':glyph('z',Math.round(ax+6+k*6),Math.round(ay-8-k*14),'#a8c0ff');glyph('z',Math.round(ax+11+k*4),Math.round(ay-14-k*16),'#c8d8ff');break;
          case 'shock':{L.strokeStyle=`rgba(255,90,120,${1-k})`;L.lineWidth=2;L.beginPath();L.ellipse(ax,ay,8+k*70,(8+k*70)*.5,0,0,6.283);L.stroke();break;}
          case 'pillar':{L.globalCompositeOperation='lighter';L.fillStyle=`rgba(255,240,180,${(1-k)*.35})`;L.fillRect(Math.round(ax-6),0,12,Math.max(0,ay));for(let i=0;i<6;i++){L.fillStyle=`rgba(255,255,220,${1-k})`;L.fillRect(Math.round(ax+Math.sin(i*2.1+V.t*3)*7),Math.round(ay-((k*60+i*10)%Math.max(1,ay))),1,1);}break;}
          case 'link':{const bx=f.x2-cx,by=f.y2-cy;L.globalCompositeOperation='lighter';for(let i=0;i<12;i++){const kk=(i/12+V.t*2)%1;L.fillStyle=`rgba(255,230,140,${1-k})`;L.fillRect(Math.round(ax+(bx-ax)*kk),Math.round(ay+(by-ay)*kk-Math.sin(kk*Math.PI)*10),2,2);}break;}
        }
        L.restore();
      });
      V.parts.forEach(p=>{const a=1-p.t/p.life;if(a<=0)return;L.globalAlpha=a;L.fillStyle=p.col;L.fillRect(Math.round(p.x-cx),Math.round(p.y-cy),p.sz,p.sz);});
      L.globalAlpha=1;
    }
    function drawFxHi(){
      const cx=V.camX,cy=V.camY;
      V.fx.forEach(f=>{
        if(!f.hi)return;const k=f.t/f.dur;if(k>1)return;
        if(f.type==='words'){X.font=`${Math.round(13*dpr)}px "DotGothic16",monospace`;X.textAlign='center';
          [...(f.txt||'聞こえるよ')].forEach((ch,i)=>{const kk=clamp(k*1.6-i*.12,0,1);if(kk<=0||kk>=1)return;
            const x=(f.x-cx+(f.x2-f.x)*kk)*SC,y=(f.y-cy+(f.y2-f.y)*kk)*SC-Math.sin(kk*Math.PI)*30*dpr;
            X.globalAlpha=1-kk*.3;X.fillStyle='#bff8ff';X.shadowColor='#00e8c8';X.shadowBlur=8*dpr;X.fillText(ch,x,y);});
          X.shadowBlur=0;X.globalAlpha=1;}
      });
    }
    // 顔ウィンドウ
    function drawPor(c,kind,expr){
      const Xp=c.getContext('2d'),Z=c.width;Xp.setTransform(1,0,0,1,0,0);Xp.clearRect(0,0,Z,Z);Xp.globalAlpha=1;
      const bgc={dan:['#2a2460','#0c0a22'],mina:['#0e4a5c','#04121c'],kid:['#6a5014','#1a1006'],foe:['#4a0c22','#0c0208'],sea:['#3a0614','#000'],npc:['#1c3a5a','#06101c']}[kind]||['#222','#000'];
      const g=Xp.createRadialGradient(Z/2,Z*.4,2,Z/2,Z/2,Z*.75);g.addColorStop(0,bgc[0]);g.addColorStop(1,bgc[1]);Xp.fillStyle=g;Xp.fillRect(0,0,Z,Z);
      Xp.imageSmoothingEnabled=true;
      if(kind==='dan'){
        const im=img('char_'+(expr||'normal'));
        if(im.ok){Xp.drawImage(im.src,0,0,Z,Z);Xp.globalCompositeOperation='multiply';Xp.fillStyle='#c4ccf4';Xp.fillRect(0,0,Z,Z);Xp.globalCompositeOperation='source-over';}
        else{Xp.imageSmoothingEnabled=false;Xp.drawImage(sprite(V.form==='tired'||expr==='tired'||expr==='fear'?'danT':'dan','d',0,'',''),4,0,16,16,0,0,Z,Z);}
      }else if(kind==='mina'&&typeof mobImage==='function'&&(()=>{const mi=mobImage('minamo',expr);return mi&&mi.complete&&mi.naturalWidth;})()){
        // ミナモの顔グラ（main/mobs.js の SVG）。半透明にゆらめかせる
        const mi=mobImage('minamo',expr),zz=Z*1.16,bob=Math.sin(V.t*1.2)*Z*.012;
        Xp.globalAlpha=.9+.06*Math.sin(V.t*2.3);Xp.drawImage(mi,(Z-zz)/2,Z*.0+bob,zz,zz);Xp.globalAlpha=1;
        Xp.globalCompositeOperation='lighter';const gw=Xp.createLinearGradient(0,Z*.6,0,Z);gw.addColorStop(0,'rgba(80,200,255,0)');gw.addColorStop(1,'rgba(80,200,255,.22)');Xp.fillStyle=gw;Xp.fillRect(0,0,Z,Z);Xp.globalCompositeOperation='source-over';
      }else if(kind==='mina'){const h=Z*2.3,s=h/150;drawMinamo(Xp,Z/2,Z*.44+h*.78-Math.sin(V.t*1.2)*4*s,s,V.t,1.15,expr);}
      else if(kind==='kid'){
        const e2=expr==='happy'?'happy':expr==='sad'?'sad':expr==='sleep'?'sleep':'normal';const im=kidImg(e2);
        if(im.ok){const iw=im.src.naturalWidth||im.src.width,ih=im.src.naturalHeight||im.src.height,sc2=Math.max(Z/iw,Z/ih)*1.05;Xp.drawImage(im.src,(Z-iw*sc2)/2,Z*.02,iw*sc2,ih*sc2);}
        else{Xp.imageSmoothingEnabled=false;Xp.drawImage(sprite(V.kidKey,'d',0,'',e2==='happy'?'happy':e2==='sleep'?'closed':''),3,5,18,18,0,0,Z,Z);}
      }
      else if(kind==='foe'){Xp.save();Xp.translate(Z/2,Z*.52);FOES[V.porFoe||'noise'](Xp,Z*.92,V.t,{});Xp.restore();}
      else if(kind==='npc'){Xp.imageSmoothingEnabled=false;if(V.porNpc==='fish'){Xp.fillStyle='#8af0e0';Xp.fillRect(Z*.25,Z*.4,Z*.45,Z*.24);Xp.fillStyle='#5ad0c8';Xp.fillRect(Z*.12,Z*.34,Z*.14,Z*.36);Xp.fillStyle='#14303a';Xp.fillRect(Z*.58,Z*.46,Z*.06,Z*.06);}
        else{Xp.globalAlpha=.85;Xp.drawImage(sprite(V.porNpc,'d',0,'',''),4,0,16,16,0,0,Z,Z);Xp.globalAlpha=1;}}
      else if(kind==='sea'){Xp.strokeStyle='rgba(255,120,140,.5)';Xp.lineWidth=2;for(let i=0;i<5;i++){Xp.beginPath();for(let px=0;px<=Z;px+=6){const y=Z*(.25+i*.13)+Math.sin(px*.06+V.t*2+i)*5;px?Xp.lineTo(px,y):Xp.moveTo(px,y);}Xp.stroke();}
        Xp.fillStyle='rgba(255,200,210,.85)';Xp.beginPath();Xp.moveTo(Z*.3,Z*.5);Xp.quadraticCurveTo(Z*.5,Z*.6,Z*.7,Z*.5);Xp.quadraticCurveTo(Z*.5,Z*.54,Z*.3,Z*.5);Xp.fill();}
      const v=Xp.createRadialGradient(Z/2,Z/2,Z*.35,Z/2,Z/2,Z*.75);v.addColorStop(0,'rgba(0,0,10,0)');v.addColorStop(1,'rgba(0,0,10,.55)');Xp.fillStyle=v;Xp.fillRect(0,0,Z,Z);
    }

    // ── 毎フレーム ──
    mg.loop(dt=>{
      if(V.stop>0){V.stop-=dt;}else V.t+=dt;
      const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
      V.tw=V.tw.filter(t=>{t.t+=dt;const k=Math.min(1,t.t/t.dur);t.o[t.k]=t.from+(t.to-t.from)*(t.ease===false?k:ease(k));if(k>=1){t.res();return false;}return true;});
      if(V.map&&V.mode!=='scene')updField(dt);
      if(BT&&BT.on)btUpdate(dt);
      V.ents.forEach(e=>{if(e.foe&&e.disp){e.a+=((e.on?1:0)-e.a)*Math.min(1,dt*4);}});
      V.ents=V.ents.filter(e=>!(e.disp&&!e.on&&e.a<.03));
      if(V.shake>0){V.shake*=Math.pow(.02,dt);if(V.shake<.4)V.shake=0;}
      if(V.hurt>0)V.hurt=Math.max(0,V.hurt-dt*1.6);
      V.pops=V.pops.filter(p=>(p.t+=dt)<1.0);
      V.floats=V.floats.filter(f=>(f.t+=dt)<4.5);
      V.fx=V.fx.filter(f=>(f.t+=dt)<f.dur);
      V.emos=V.emos.filter(e=>(e.t+=dt)<1.3);
      V.parts=V.parts.filter(p=>{p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.92;p.vy=p.vy*.92+30*dt;return p.t<p.life;});
      if(BT&&BT.en)BT.en.forEach(e=>{if(e.hit>0)e.hit=Math.max(0,e.hit-dt*5);if(e.sh>0)e.sh=Math.max(0,e.sh-dt*30);});
      if(V.light)V.light.t+=dt;
      typeStep(dt);
      render();
      if(por.kind&&!box.classList.contains('rpg-hide'))drawPor(pc,por.kind,por.expr);
    });

    // ══════════════════════════════════════════════════════════
    // 戦闘（アクティブタイムバトル）。マップの上で、その場で始まる
    // ══════════════════════════════════════════════════════════
    let BT=null;
    function pMax(id){const lv=run.lv;return id==='dan'?44+(lv-1)*9+S('stressRes')*4:30+chNo*6+lv*4;}
    function pMpMax(id){const lv=run.lv;return id==='dan'?18+(lv-1)*2+S('sleepEff')*2+(run.f.ch4_lantern?6:0):16+chNo*2+lv;}
    function mkP(id,opt){
      const P=run.party[id];
      const o={id,a:V.A[id],name:id==='dan'?'だんのうら':'ミナモ',max:pMax(id),mpMax:pMpMax(id),hp:P.hp,mp:P.mp,st:{},g:.35+Math.random()*.4,queued:false,ko:P.hp<=0};
      if(id==='dan'){o.pow=7+run.lv*2;o.pm=(.8+clamp(+gs.mental||0,0,100)/250)*(run.f.ch4_lantern?1.12:1);o.spd=10+Math.min(4,S('focus')*.5);
        if(opt.final&&run.f.ch5_true){o.max+=20;o.hp+=20;}
        if(opt.final&&run.f.ch5_papa){o.hp=o.max;o.mp=o.mpMax;o.st.barrier=10;}}
      else{o.pow=5+run.lv*1.5+chNo;o.pm=1;o.spd=9;if(opt.final&&run.f.ch5_papa){o.hp=o.max;o.mp=o.mpMax;o.st.barrier=10;}}
      if(o.ko){o.hp=0;o.g=0;}
      return o;
    }
    function mkE(kind,x,y){
      const D=EN[kind];const hp=Math.round(D.hp*DF.eHp);
      return {kind,D,name:D.name,max:hp,hp,atk:D.atk-(kind==='debt'&&run.f.ch3_honest?2:0),spd:D.spd,s:D.s,x,y,g:Math.random()*.3,queued:false,alive:true,a:1,hit:0,sh:0,dead:0,
        armor:!!D.armor,crack:0,sleep:0,grow:0,charge:false,pi:0,fx:{armor:!!D.armor},ph:Math.random()*6,phDone:{},lift:0};
    }
    function findArena(px,py){
      let best=null;
      for(let dy=-3;dy<=2;dy++)for(let dx=-3;dx<=3;dx++){
        const cx=px+dx*TS,cy=py+dy*TS;let sc=0;
        for(let j=-4;j<=3;j++)for(let i=-3;i<=3;i++)if(!solidAt(cx+i*TS,cy+j*TS))sc++;
        sc-=(Math.abs(dx)+Math.abs(dy))*1.6;
        if(!best||sc>best.sc)best={x:cx,y:cy,sc};
      }
      return best;
    }
    function formation(kinds,form,boss){
      if(boss)return [[0,-36]];
      const n=kinds.length;
      if(n===1)return [[0,-26]];
      if(form==='col')return kinds.map((_,i)=>[-4+i*5,-14-i*20]);
      if(form==='tri'&&n===3)return [[0,-18],[-26,-40],[26,-40]];
      return kinds.map((_,i)=>[(i-(n-1)/2)*26,-24-(i%2)*6]);
    }
    const SLOTS=[[-42,-14],[42,-14],[-46,-48],[46,-48],[0,-2]];
    // ── 戦闘のウィンドウ ──
    function buildBattleUI(){
      const B=BT;
      const win=el('div','rpg-bwin');
      B.rows=B.pa.map(p=>{const r=el('div','rpg-prow',`<div class="nm">${p.name}<br><span class="st"></span></div><div class="v hp">HP <b></b></div><div class="v mp">息 <b></b></div><div class="rpg-atb"><div></div></div>`);
        r.addEventListener('click',e=>{e.stopPropagation();if(BT&&BT.menu&&BT.menu.p!==p&&!p.ko&&p.g>=1&&!p.queued){closeCmd();openCmd(p);}});
        win.appendChild(r);return {r,nm:r.querySelector('.st'),hp:r.querySelector('.hp b'),hpV:r.querySelector('.hp'),mp:r.querySelector('.mp b'),atb:r.querySelector('.rpg-atb'),bar:r.querySelector('.rpg-atb>div'),last:''};});
      const msg=el('div','rpg-bmsg rpg-hide');const md=el('div','rpg-bmode rpg-pass');
      ui.append(win,msg,md);B.win=win;B.msg=msg;B.md=md;
      md.textContent=B.mode==='wait'?'WAIT':'ACTIVE';
      updBattleUI();
    }
    function layoutBattle(){if(BT&&BT.cmdEl&&BT.win)BT.cmdEl.style.bottom=(BT.win.offsetHeight+12)+'px';}
    function updBattleUI(){
      const B=BT;if(!B||!B.rows)return;
      B.pa.forEach((p,i)=>{const R0=B.rows[i];
        const sts=Object.keys(p.st).filter(k=>p.st[k]>B.clock).map(k=>ST_LABEL[k]).join('・');
        const key=`${Math.ceil(p.hp)}|${p.max}|${Math.floor(p.mp)}|${sts}|${p.ko}|${B.menu&&B.menu.p===p}`;
        if(key!==R0.last){R0.last=key;R0.hp.textContent=`${Math.max(0,Math.ceil(p.hp))}/${p.max}`;R0.mp.textContent=`${Math.floor(p.mp)}`;R0.nm.textContent=p.ko?'戦闘不能':sts;
          R0.hpV.classList.toggle('low',p.hp<p.max*.3);R0.r.classList.toggle('ko',p.ko);R0.r.classList.toggle('act',!!(B.menu&&B.menu.p===p));}
        R0.bar.style.width=(p.ko?0:p.g*100)+'%';R0.atb.classList.toggle('full',!p.ko&&p.g>=1);
      });
    }
    let msgTO=null;
    function bmsg(html,ms=0){
      if(!BT||!BT.msg)return Promise.resolve();
      BT.msg.className='rpg-bmsg';BT.msg.innerHTML=html;clearTimeout(msgTO);
      if(ms>0)msgTO=setTimeout(()=>{if(BT&&BT.msg&&BT.msg.innerHTML===html)BT.msg.classList.add('rpg-hide');},ms+400);
      return ms?sleep(ms):Promise.resolve();
    }
    function bdesc(t){if(!BT||!BT.msg)return;BT.msg.className='rpg-bmsg desc';BT.msg.innerHTML=t;}
    // ── コマンド ──
    const lightUsable=(n)=>run.lights>=n&&!BT.usedL[n];
    function techOk(id,p){const T=TECH[id];if(T.ch&&chNo<T.ch)return false;if(T.need==='watch'&&!V.watch)return false;if(T.light&&run.lights<T.light)return false;return true;}
    function dualPartner(p){const o=BT.pa.find(q=>q!==p);return o&&!o.ko&&o.g>=1&&!o.queued?o:null;}
    function dualOk(id){const D=DUAL[id];if(chNo<D.ch&&!(isReplay&&R.cleared>=D.ch))return false;if(D.need==='watch'&&!V.watch)return false;return true;}
    function openCmd(p){
      const B=BT;if(!B||B.over)return;
      B.menu={p};sfx('ready');
      const w=el('div','rpg-bcmd');B.cmdEl=w;ui.appendChild(w);layoutBattle();
      onFocusDesc=d=>{if(d)bdesc(d);};
      const other=()=>{const o=B.pa.find(q=>q!==p);return o&&!o.ko&&o.g>=1&&!o.queued?o:null;};
      const fin=a=>{clearFocus();onFocusDesc=null;closeCmd();a.p.queued=true;if(a.p2)a.p2.queued=true;B.queue.push(a);if(BT&&BT.msg)BT.msg.classList.add('rpg-hide');};
      const back=fn=>{const b=btn('rpg-bc','もどる<small>B</small>',()=>{AU.se('back');fn();});b.dataset.desc='ひとつ前に戻る。';return b;};
      const top=()=>{
        B.menu.sub=false;
        w.innerHTML=`<div class="hd">▶ ${p.name}${other()?'　<small style="color:#b6acd8">B:交代</small>':''}</div>`;
        const dualAvail=!!dualPartner(p)&&Object.keys(DUAL).some(dualOk);
        const L0=[
          ['攻撃',p.id==='dan'?'語りかける。息を使わない、いつもの行動。':'水の泡をぶつける。',()=>target('one',p).then(t=>{if(t)fin({type:'atk',p,tgt:t});else top();})],
          ['技'+(dualAvail?'<small style="color:#ffe066">★連携できる</small>':''),'覚えた技・連携技。',()=>techMenu()],
          ['道具','道具を使う。',()=>itemMenu()],
          ['逃げる',B.boss?'この相手からは、逃げられない。':'戦いから離れる。',()=>fin({type:'run',p})],
        ];
        const list=L0.map(([l,d,f])=>{const b=btn('rpg-bc',l,()=>{AU.se('decide');f();});b.dataset.desc=d;w.appendChild(b);return b;});
        if(B.boss)list[3].disabled=true;
        if(!ITEM_KEYS.some(k=>run.items[k]>0))list[2].disabled=true;
        let sw=null;const o=other();if(o){sw=el('button','rpg-hide');sw.addEventListener('click',()=>{closeCmd();openCmd(o);});w.appendChild(sw);}
        setFocus(list,2,sw,B.lastTop||0);layoutBattle();
        list.forEach((b,i)=>b.addEventListener('click',()=>{B.lastTop=i;}));
      };
      const techMenu=()=>{
        B.menu.sub=true;
        w.innerHTML=`<div class="hd">${p.name}の技</div>`;const list=[];
        TECH_ORDER[p.id].filter(id=>techOk(id,p)).forEach(id=>{const T=TECH[id];
          const cost=T.light?(BT.usedL[T.light]?'使用済':'一戦一度'):T.mp?`息${T.mp}`:'';
          const b=btn('rpg-bc',`${T.n}<small>${AREA_N[T.area]}・${cost||'―'}</small>`,()=>{AU.se('decide');
            target(T.area,p).then(t=>{if(t)fin({type:'tech',p,tech:id,tgt:t===true?null:t});else techMenu();});});
          b.dataset.desc=T.d;if((T.mp&&p.mp<T.mp)||(T.light&&!lightUsable(T.light)))b.disabled=true;w.appendChild(b);list.push(b);});
        const q=dualPartner(p);
        Object.keys(DUAL).filter(dualOk).forEach(id=>{const D=DUAL[id];
          const b=btn('rpg-bc dual',`★${D.n}<small>${D.a}</small>`,()=>{AU.se('decide');const dq=dualPartner(p);if(!dq)return techMenu();
            target(D.area,p).then(t=>{if(t)fin({type:'dual',p:B.pa[0],p2:B.pa[1],dual:id,tgt:t===true?null:t});else techMenu();});});
          b.dataset.desc=`連携技（${AREA_N[D.area]}）：${D.d}　息 だんのうら${D.mp.dan}・ミナモ${D.mp.mina}${q?'':'　※二人のゲージが満ちている時だけ'}`;
          if(!q||B.pa[0].mp<D.mp.dan||B.pa[1].mp<D.mp.mina)b.disabled=true;w.appendChild(b);list.push(b);});
        const bk=back(top);w.appendChild(bk);list.push(bk);setFocus(list,2,bk);layoutBattle();
      };
      const itemMenu=()=>{
        B.menu.sub=true;
        w.innerHTML=`<div class="hd">道具</div>`;const list=[];
        ITEM_KEYS.forEach(k=>{const I=ITEMS[k];const b=btn('rpg-bc',`${I.name}<small>×${run.items[k]||0}</small>`,()=>{AU.se('decide');
          target(I.tgt==='all'?'party':'ally',p,k).then(t=>{if(t)fin({type:'item',p,item:k,tgt:t===true?null:t});else itemMenu();});});
          b.dataset.desc=I.desc;if(!(run.items[k]>0))b.disabled=true;w.appendChild(b);list.push(b);});
        const bk=back(top);w.appendChild(bk);list.push(bk);setFocus(list,2,bk);layoutBattle();
      };
      top();
    }
    function closeCmd(){if(!BT)return;if(BT.cmdEl){BT.cmdEl.remove();BT.cmdEl=null;}BT.menu=null;clearFocus();onFocusDesc=null;}
    // ── ねらいを決める ──
    function target(area,p,item){
      return new Promise(res=>{
        if(area==='all'||area==='party'||area==='self'){res(true);return;}
        let list;
        if(area==='ally')list=BT.pa.filter(q=>item==='pearl'||!q.ko);
        else list=BT.en.filter(e=>e.alive).sort((a,b)=>a.x-b.x);
        if(!list.length){res(null);return;}
        let i=Math.max(0,list.indexOf(area==='ally'?(p.hp/p.max<.6?p:list.reduce((a,b)=>a.hp/a.max<b.hp/b.max?a:b)):BT.lastTgt));
        clearFocus();BT.tgt={list,i,area,p,res};mode='target';sfx('cursor');tgtName();
        const cb=el('div','rpg-bcmd');cb.style.width='auto';cb.style.gridTemplateColumns='1fr 1fr';
        const ok=btn('rpg-bc','決定<small>A</small>',()=>targetKey('Enter'));const ng=btn('rpg-bc','もどる<small>B</small>',()=>targetKey('Escape'));
        cb.append(ok,ng);ui.appendChild(cb);BT.tgtEl=cb;if(BT.cmdEl)BT.cmdEl.style.visibility='hidden';if(BT.win)cb.style.bottom=(BT.win.offsetHeight+12)+'px';
      });
    }
    function tgtName(){const T=BT.tgt;if(!T)return;const t=T.list[T.i];const aff=affected(T.area,T.p,t);
      bdesc(`<b>${t.name}</b>${t.D?`　HP ${Math.ceil(t.hp)}/${t.max}`:`　HP ${Math.ceil(t.hp)}/${t.max}`}${aff.length>1?`　（${aff.length}体に届く）`:''}<br><small>←→ 選ぶ　A 決定　B もどる／敵をタップ</small>`);}
    function endTarget(v){const T=BT&&BT.tgt;if(!T)return;BT.tgt=null;mode='none';if(BT.tgtEl){BT.tgtEl.remove();BT.tgtEl=null;}if(BT.cmdEl)BT.cmdEl.style.visibility='';if(v&&v.D)BT.lastTgt=v;T.res(v);}
    function targetKey(k){
      const T=BT&&BT.tgt;if(!T)return;
      if(isA(k)){sfx('cursor');endTarget(T.list[T.i]);return;}
      if(isB(k)){AU.se('back');endTarget(null);return;}
      k=NAVK[k]||k;const d=(k==='ArrowRight'||k==='ArrowDown')?1:(k==='ArrowLeft'||k==='ArrowUp')?-1:0;
      if(d){T.i=(T.i+d+T.list.length)%T.list.length;sfx('cursor');tgtName();}
    }
    function targetTap(e){
      const T=BT&&BT.tgt;if(!T)return;
      const r=cv.getBoundingClientRect();const wx=(e.clientX-r.left)*dpr/SC+V.camX,wy=(e.clientY-r.top)*dpr/SC+V.camY;
      let best=null,bd=1e9;T.list.forEach((t,i)=>{const c=center(t);const d=Math.hypot(c.x-wx,c.y-wy);if(d<bd){bd=d;best=i;}});
      if(best!=null&&bd<36){T.i=best;sfx('cursor');endTarget(T.list[best]);}
    }
    const center=t=>t.D?{x:t.x,y:t.y-t.s*.45}:{x:t.a.x,y:t.a.y-12};
    function affected(area,p,t){
      const B=BT;const al=B.en.filter(e=>e.alive);
      if(area==='all')return al;
      if(area==='party')return B.pa.filter(q=>!q.ko);
      if(!t)return [];
      if(area==='one'||area==='ally')return [t];
      const tc=center(t);
      if(area==='circle')return al.filter(e=>{const c=center(e);return Math.hypot(c.x-tc.x,c.y-tc.y)<36;});
      if(area==='line'){const o={x:B.pa[0].a.x,y:B.pa[0].a.y-12};let dx=tc.x-o.x,dy=tc.y-o.y;const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
        return al.filter(e=>{if(e===t)return true;const c=center(e);const px=c.x-o.x,py=c.y-o.y;const s=px*dx+py*dy;if(s<0)return false;return Math.abs(px*dy-py*dx)<15;});}
      return [t];
    }
    // ── 低解像度の戦闘表示（HPの細いバー・⚠・眠り・カーソル） ──
    function drawBattleLo(){
      const B=BT,cx=V.camX,cy=V.camY;
      B.en.forEach(e=>{
        if(!e.alive||e.a<.3)return;
        const x=Math.round(e.x-cx),y=Math.round(e.y-cy);
        const w=Math.max(14,Math.min(36,e.s*.6|0));
        L.fillStyle='#140a24';L.fillRect(x-w/2-1|0,y+2,w+2,4);L.fillStyle='#3a1020';L.fillRect(x-w/2|0,y+3,w,2);
        L.fillStyle=e.hp<e.max*.3?'#ff8098':'#ff4a6a';L.fillRect(x-w/2|0,y+3,Math.max(0,Math.round(w*e.hp/e.max)),2);
        const atb=Math.min(1,e.g);L.fillStyle='#5a6ad8';L.fillRect(x-w/2|0,y+6,Math.round(w*atb),1);
        const nx=e.D.pat[e.pi%e.D.pat.length];
        if(nx&&nx.big&&e.g>.4&&!(e.sleep>B.clock)&&Math.floor(V.t*4)%2===0)balloon(x,y-e.s-6,'!');
        if(e.sleep>B.clock&&Math.floor(V.t*2)%2===0)glyph('z',x+e.s*.3|0,y-e.s*.9|0,'#a8c0ff');
        if(e.crack>B.clock){L.fillStyle='#ffe066';L.fillRect(x-4,y-(e.s*.5|0),1,3);L.fillRect(x-3,y-(e.s*.5|0)+3,1,2);L.fillRect(x+3,y-(e.s*.6|0),1,3);}
      });
      if(B.tgt){
        const T=B.tgt,t=T.list[T.i];const aff=affected(T.area,T.p,t);const bl=Math.floor(V.t*6)%2;
        aff.forEach(a=>{const c=center(a);const x=Math.round(c.x-cx),y=Math.round(c.y-cy-(a.D?a.s*.55:18));
          L.fillStyle=a===t?'#ffffff':'#ffe066';const o=a===t?bl:0;L.fillRect(x-3,y-4-o,7,1);L.fillRect(x-2,y-3-o,5,1);L.fillRect(x-1,y-2-o,3,1);L.fillRect(x,y-1-o,1,1);});
        if(T.area==='circle'){const c=center(t);L.strokeStyle='rgba(255,230,120,.5)';L.beginPath();L.ellipse(c.x-cx,c.y-cy,36,24,0,0,6.283);L.stroke();}
        if(T.area==='line'){const o={x:B.pa[0].a.x,y:B.pa[0].a.y-12},c=center(t);let dx=c.x-o.x,dy=c.y-o.y;const l=Math.hypot(dx,dy)||1;
          L.strokeStyle='rgba(255,230,120,.35)';L.setLineDash([2,3]);L.beginPath();L.moveTo(o.x-cx,o.y-cy);L.lineTo(o.x-cx+dx/l*220,o.y-cy+dy/l*220);L.stroke();L.setLineDash([]);}
      }
      if(B.menu){const a=B.menu.p.a;const x=Math.round(a.x-cx),y=Math.round(a.y-cy-34+Math.sin(V.t*6)*1.5);L.fillStyle='#ffe066';L.fillRect(x-2,y,5,1);L.fillRect(x-1,y+1,3,1);L.fillRect(x,y+2,1,1);}
    }
    // ── 毎フレームの時間の流れ ──
    function btUpdate(dt){
      const B=BT;if(!B||B.over||!B.live)return;
      const hold=B.mode==='wait'&&((B.menu&&B.menu.sub)||B.tgt);
      const paused=B.evt||hold;
      if(!paused){
        B.clock+=dt;
        B.pa.forEach(p=>{if(p.ko)return;if(p.g<1){p.g=Math.min(1,p.g+dt*p.spd/10/2.5*((p.st.sleepy||0)>B.clock?.55:1));if(p.g>=1&&p.id!=='x')sfx('ready');}
          if((p.st.burn||0)>B.clock&&B.clock>=(p.burnAt||0)){p.burnAt=B.clock+3;if(p.burnAt-3>0){const d=2;p.hp=Math.max(1,p.hp-d);pop(p.a.x,p.a.y-26,String(d),'#ff9a50');}}});
        B.en.forEach(e=>{if(!e.alive||e.queued||e.sleep>B.clock)return;e.g+=dt*e.spd/10/3.5*DF.eAtb;if(e.g>=1){e.g=1;e.queued=true;B.queue.push({type:'enemy',e});}});
      }
      if(B.menu&&(B.menu.p.ko||B.menu.p.queued||B.menu.p.g<1)&&!B.tgt)closeCmd();
      if(!B.menu&&!B.tgt&&!B.evt&&!B.over){const p=B.pa.find(q=>!q.ko&&q.g>=1&&!q.queued);if(p)openCmd(p);}
      if(!B.busy&&!B.evt&&B.queue.length&&!(hold&&B.queue[0].type==='enemy')){
        const act=B.queue.shift();B.busy=true;
        execAct(act).then(()=>afterAct()).catch(e=>{if(e!==ABORT)console.error(e);}).finally(()=>{if(BT===B)B.busy=false;});
      }
      if(B.menu&&!B.menu.sub&&B.menu.dualMark!==!!dualPartner(B.menu.p)){B.menu.dualMark=!!dualPartner(B.menu.p);const tb=B.cmdEl&&B.cmdEl.querySelectorAll('.rpg-bc')[1];if(tb)tb.innerHTML='技'+(B.menu.dualMark&&Object.keys(DUAL).some(dualOk)?'<small style="color:#ffe066">★連携できる</small>':'');}
      updBattleUI();
    }
    // ── 行動 ──
    function calc(e,p,base,el,o={}){
      let d=base*rnd(.88,1.12);
      const weak=!!el&&e.D.weak.includes(el);if(weak)d*=1.6;
      if(e.crack>BT.clock)d*=1.4;
      if(e.armor&&!o.pierce)d*=.5;
      if(p&&(p.st.fear||0)>BT.clock)d*=.8;
      const crit=!o.nocrit&&Math.random()<.08;if(crit)d*=1.5;
      return {d:Math.max(1,Math.round(d)),weak,crit};
    }
    function dmgFoe(e,r,col){
      if(!e.alive)return;
      e.hp=Math.max(0,e.hp-r.d);e.hit=1;e.sh=r.crit?8:5;V.stop=r.crit?.12:.05;V.shake=Math.max(V.shake,r.crit?8:4);
      const c=center(e);pop(c.x+(Math.random()-.5)*8,c.y-e.s*.2,String(r.d),r.weak?'#ffe066':r.crit?'#ff9a50':'#ffffff',r.crit||r.weak);
      burst(c.x,c.y,col||'#fff',r.crit?16:9,r.crit?70:50);sfx(r.crit?'crit':'hit');
      if(r.weak&&!BT.weakShown){BT.weakShown=1;}
      if(e.hp<=0)killFoe(e);
      else if(e.D.phase)e.D.phase.forEach((ph,i)=>{if(!e.phDone[i]&&e.hp<=e.max*ph.at){e.phDone[i]=1;BT.phaseQ.push({e,ph});}});
    }
    function killFoe(e){
      e.alive=false;e.queued=false;BT.queue=BT.queue.filter(q=>q.e!==e);sfx('down');const c=center(e);burst(c.x,c.y,'#ffffff',22,80,2);
      tween(e,'dead',1,520).then(()=>{e.a=0;});tween(e,'a',0,560);
    }
    function healP(p,n,revive){
      if(p.ko&&!revive)return 0;
      if(p.ko){p.ko=false;p.hp=0;p.g=.3;p.a.pose='';}
      const b=p.hp;p.hp=Math.min(p.max,p.hp+n);const h=Math.round(p.hp-b);
      pop(p.a.x,p.a.y-26,'+'+h,'#7affb0');addFx('heal',{a:p.a,dur:.9});return h;
    }
    function cure(p){['noise','burn','sleepy','fear'].forEach(k=>delete p.st[k]);}
    async function lunge(a,t,dist=.55){const ox=a.x,oy=a.y,c=center(t);a.dir=dirOf(c.x-ox,c.y-oy,a.dir);await moveTo(a,ox+(c.x-ox)*dist,oy+(c.y+10-oy)*dist,140);return ()=>moveTo(a,ox,oy,200).then(()=>{a.dir='u';});}
    async function cast(a,ms=380){a.pose='cast';sfx('blip');await sleep(ms);}
    const fl=k=>FLAVOR[k][Math.floor(Math.random()*FLAVOR[k].length)];
    function talkBase(p){return (p.pow+S('chatSkill')*2+S('radioVibe')*1.5)*p.pm*(((p.st.noise||0)>BT.clock)?.6:1)*(run.f.ch3_honest?1.1:1)*(BT.final&&run.f.ch5_handle?1.2:1);}
    function singBase(p){return (p.pow*.8+S('singSkill')*2.5)*p.pm*(((p.st.noise||0)>BT.clock)?.6:1)*(BT.final&&run.f.ch5_handle?1.2:1);}
    function fixBase(p){return (p.pow*.7+(S('wiring')+S('plc')+S('emergencyFix'))*1.5)*p.pm*(run.f.ch2_alone?1.3:1);}
    async function execAct(A){
      const B=BT;
      if(A.type==='enemy')return enemyAct(A.e);
      const p=A.p,q=A.p2||null;
      p.g=0;p.queued=false;if(q){q.g=0;q.queued=false;}
      if(p.ko&&A.type!=='dual')return;
      if(q&&(p.ko||q.ko))return;
      if(p.id==='dan')B.guard=false;
      if(A.tgt&&A.tgt.D&&!A.tgt.alive){const alt=B.en.find(e=>e.alive);if(!alt)return;A.tgt=alt;}
      run.stat.turns++;
      if(p.id==='dan'&&A.type!=='dual'){const key=A.type==='tech'?A.tech:A.type;B.rep=key===B.lastKey?B.rep+1:0;B.lastKey=key;}
      const D=p.a;
      switch(A.type){
        case 'atk':{
          const t=A.tgt;
          if(p.id==='dan'){await bmsg(`だんのうら：語りかける── ${fl('talk')}`);sfx('talk');AU.se('micOn');const c=center(t);
            addFx('words',{hi:1,x:D.x,y:D.y-20,x2:c.x,y2:c.y,dur:.7,txt:'聞こえるよ'});const back=await lunge(D,t,.2);await sleep(420);
            dmgFoe(t,calc(t,p,talkBase(p),'talk'),'#9ff5ff');addFx('slash',{x:c.x,y:c.y,dur:.3});await back();}
          else{await bmsg('ミナモ：水の泡');const back=await lunge(D,t,.6);const c=center(t);sfx('bubble');burst(c.x,c.y,'#bff0ff',10,40);
            dmgFoe(t,calc(t,p,p.pow*.95,null),'#bff0ff');await back();}
          await sleep(160);break;}
        case 'tech':await doTech(A,p);break;
        case 'dual':await doDual(A);break;
        case 'item':{
          run.items[A.item]--;run.stat.items++;sfx('item');AU.se('decide');const I=ITEMS[A.item];
          await bmsg(`${p.name}：${I.name}`);
          if(A.item==='shell'){healP(A.tgt,40);}
          else if(A.item==='ramune'){const t=A.tgt;t.mp=Math.min(t.mpMax,t.mp+15);cure(t);addFx('heal',{a:t.a,dur:.9});sfx('bubble');pop(t.a.x,t.a.y-26,'息+15','#9fd8ff');}
          else{B.pa.forEach(t=>healP(t,50,true));}
          await sleep(500);break;}
        case 'run':{
          if(B.boss){await bmsg('この相手からは、逃げられない！',800);break;}
          if(Math.random()<DF.runOk){sfx('swoosh');await bmsg('うまく逃げきった！',700);B.result='run';B.over=true;}
          else{sfx('miss');await bmsg('逃げられなかった！',800);}
          break;}
      }
      D.pose='';if(q)q.a.pose='';
      if(!p.ko)p.mp=Math.min(p.mpMax,p.mp+(run.f.ch4_lantern?3:2));
    }
    async function doTech(A,p){
      const B=BT,T=TECH[A.tech],D=p.a;
      if(T.mp)p.mp-=T.mp;
      if(T.light)B.usedL[T.light]=1;
      const lt=T.light?`<b style="color:rgb(${LIGHT_COL[T.light]})">${RPG_CH[T.light].light}の灯「${T.n}」</b>`:`${p.name}：${T.n}`;
      await bmsg(lt);
      const aff=affected(T.area,p,A.tgt);
      switch(A.tech){
        case 'sing':{await cast(D);sfx('sing');const c=center(A.tgt);addFx('notes',{a:D,x2:c.x,y2:c.y,dur:1});await sleep(650);
          let ex='';aff.forEach(e=>{dmgFoe(e,calc(e,p,singBase(p),'sing'),'#ffd8f0');});
          healP(p,5+S('singSkill')*1.5+run.lv);await sleep(300);break;}
        case 'fix':{const back=await lunge(D,A.tgt,.55);sfx('fix');AU.se('tool');const t=A.tgt,c=center(t);addFx('spark',{x:c.x,y:c.y,dur:.6,seed:Math.random()*6});
          const had=t.armor;t.armor=false;t.fx.armor=false;t.crack=B.clock+8;dmgFoe(t,calc(t,p,fixBase(p),'fix',{pierce:true}),'#ffe680');
          await bmsg(had?`${t.name}の<b>装甲が外れた！</b>`:'継ぎ目に亀裂が走った。');await back();await sleep(300);break;}
        case 'guard':{B.guard=true;p.mp=Math.min(p.mpMax,p.mp+5+S('emoCtrl'));sfx('guard');addFx('shield',{x:(B.pa[0].a.x+B.pa[1].a.x)/2,y:B.pa[0].a.y+4,dur:1.4});
          await bmsg('だんのうらは、身を固めて二人の前に立った。（次の番まで被ダメージ大幅減・息+5）',900);break;}
        case 'pray':{await cast(D,300);sfx('pray');addFx('pillar',{a:D,dur:1.2});await sleep(500);
          const n=12+S('stressRes')*4+S('bedtime')*2+run.lv*1.5;B.pa.forEach(q=>{healP(q,n,true);cure(q);});
          const w=B.en.filter(e=>e.alive&&e.D.weak.includes('pray'));
          if(w.length){await sleep(300);w.forEach(e=>dmgFoe(e,calc(e,p,p.pow*1.05+S('bedtime'),'pray'),'#fff6c8'));await bmsg('祈りが届いた！',600);}
          await sleep(300);break;}
        case 'l1':{await cast(D,300);sfx('light');AU.se('ach');flash(.4);const c=center(A.tgt);const o={x:D.x,y:D.y-12};const dx=c.x-o.x,dy=c.y-o.y,l=Math.hypot(dx,dy)||1;
          addFx('beam',{x:o.x,y:o.y,x2:o.x+dx/l*240,y2:o.y+dy/l*240,col:LIGHT_COL[1],dur:.7});await sleep(250);
          aff.forEach(e=>dmgFoe(e,calc(e,p,(p.pow*2+S('chatSkill')*2+S('singSkill')*2)*p.pm,'talk',{pierce:true}),'#ff8a9a'));await sleep(400);break;}
        case 'l2':{await cast(D,300);sfx('light');sfx('fix');flash(.4);aff.forEach(e=>{e.armor=false;e.fx.armor=false;e.crack=B.clock+12;const c=center(e);addFx('spark',{x:c.x,y:c.y,dur:.7,seed:1});dmgFoe(e,calc(e,p,p.pow*1.2*p.pm,'fix',{pierce:true}),'#ffc060');});
          await bmsg('確かな手が、継ぎ目を割った。（装甲なし・長い亀裂）',800);break;}
        case 'l3':{await cast(D,300);sfx('light');flash(.4);B.pa.forEach(q=>{healP(q,Math.round(q.max*.45),true);q.st.barrier=B.clock+12;});addFx('shield',{x:(B.pa[0].a.x+B.pa[1].a.x)/2,y:B.pa[0].a.y+4,dur:2});
          await bmsg('小指が温かい。しばらく、受けるダメージが半分になる。',900);break;}
        case 'l4':{await cast(D,300);sfx('light');flash(.4);aff.forEach(e=>{e.sleep=B.clock+(e.D.boss?4:7);e.g=0;addFx('zz',{x:e.x,y:e.y-e.s*.6,dur:1.6});});healP(p,10);
          await bmsg('敵は、まどろみに落ちた。',800);break;}
        case 'heal':{await cast(D);sfx('heal');const t=A.tgt;addFx('ring',{x:t.a.x,y:t.a.y-4,col:'150,240,255',r:16,dur:.6});healP(t,14+run.lv*2+chNo*2);await sleep(450);break;}
        case 'glow':{await cast(D);sfx('light');const c=center(A.tgt);addFx('ring',{x:c.x,y:c.y,col:'200,240,255',r:40,dur:.8});await sleep(300);
          aff.forEach(e=>dmgFoe(e,calc(e,p,p.pow*1.15+chNo*1.5,'light'),'#e8fbff'));await sleep(350);break;}
        case 'mirror':{await cast(D);sfx('heal');B.pa.forEach(q=>{cure(q);healP(q,8+run.lv);});await bmsg('水鏡が、二人の心を映して澄ませた。',700);break;}
        case 'watch':{await cast(D);sfx('pray');aff.forEach(e=>{e.atk=Math.max(Math.round(e.D.atk*.6),Math.round(e.atk*.85));addFx('ring',{x:e.x,y:e.y-e.s*.4,col:'150,230,255',r:24,dur:.8});});
          await bmsg('ミナモが、まっすぐに見つめ返した。敵の力が少し落ちた。',900);break;}
      }
    }
    async function doDual(A){
      const B=BT,Dl=DUAL[A.dual],pd=B.pa[0],pm2=B.pa[1];
      pd.mp-=Dl.mp.dan;pm2.mp-=Dl.mp.mina;
      run.stat.turns++;
      sfx('dual');AU.se('ach');flash(.55);V.stop=.15;
      await bmsg(`<b>連携技「${Dl.n}」</b>　${Dl.a}`);
      pd.a.pose='cast';pm2.a.pose='cast';addFx('link',{x:pd.a.x,y:pd.a.y-12,x2:pm2.a.x,y2:pm2.a.y-12,dur:.9});await sleep(600);
      const aff=affected(Dl.area,pd,A.tgt);
      switch(A.dual){
        case 'koe':{const c=center(A.tgt),o={x:pd.a.x,y:pd.a.y-12};const dx=c.x-o.x,dy=c.y-o.y,l=Math.hypot(dx,dy)||1;
          addFx('words',{hi:1,x:o.x,y:o.y,x2:c.x,y2:c.y,dur:.6,txt:'とどけ'});addFx('beam',{x:o.x,y:o.y,x2:o.x+dx/l*240,y2:o.y+dy/l*240,col:'160,240,255',dur:.7});await sleep(350);
          aff.forEach(e=>dmgFoe(e,calc(e,pd,(talkBase(pd)+pm2.pow*1.2)*1.25,'talk',{pierce:true}),'#bff8ff'));break;}
        case 'shuri':{const k=run.f.ch2_share?1.3:1;aff.forEach(e=>{e.armor=false;e.fx.armor=false;e.crack=B.clock+10;const c=center(e);addFx('spark',{x:c.x,y:c.y,dur:.7,seed:2});dmgFoe(e,calc(e,pd,(pd.pow*.6+(S('wiring')+S('plc')+S('emergencyFix')))*pd.pm*k,'fix',{pierce:true}),'#ffe680');});
          await sleep(300);B.pa.forEach(q=>healP(q,Math.round(q.max*.3*k)));await bmsg(`装甲が外れ、二人の傷がふさがった。${run.f.ch2_share?'（一緒に直すのは、慣れてきた）':''}`,800);break;}
        case 'yubi':{B.pa.forEach(q=>{q.st.barrier=B.clock+14;cure(q);if(run.f.ch3_promise)healP(q,Math.round(q.max*.2));});addFx('shield',{x:(pd.a.x+pm2.a.x)/2,y:pd.a.y+4,dur:2});sfx('guard');
          await bmsg('小指を結ぶ。しばらく、二人の受けるダメージが半分になる。',900);break;}
        case 'komori':{const c=center(A.tgt);addFx('ring',{x:c.x,y:c.y,col:'200,220,255',r:40,dur:1});addFx('notes',{a:pd.a,x2:c.x,y2:c.y,dur:1});sfx('sing');await sleep(600);
          aff.forEach(e=>{dmgFoe(e,calc(e,pd,singBase(pd)*.9+pm2.pow*.7,'sing'),'#d8e0ff');if(e.alive){e.sleep=B.clock+(e.D.boss?3.5:6);e.g=0;addFx('zz',{x:e.x,y:e.y-e.s*.6,dur:1.5});}});
          await bmsg('ねんねん、ころりよ。灯りの輪の中で、敵がまどろむ。',900);break;}
        case 'namae':{const t=A.tgt,c=center(t);addFx('words',{hi:1,x:pd.a.x,y:pd.a.y-20,x2:c.x,y2:c.y,dur:.8,txt:'ここにいる'});addFx('pillar',{x:c.x,y:c.y+20,dur:1.2});await sleep(450);
          dmgFoe(t,calc(t,pd,talkBase(pd)*2.6+pm2.pow*2,'talk',{pierce:true}),'#fff2c0');await sleep(200);B.pa.forEach(q=>healP(q,Math.round(q.max*.25)));break;}
      }
      await sleep(350);pd.a.pose='';pm2.a.pose='';
    }
    function pickP(){const al=BT.pa.filter(q=>!q.ko);if(al.length<2)return al[0];return Math.random()<.6?al[0]:al[1];}
    function hitP(p,mult,e){
      const B=BT;if(p.ko)return 0;
      let d=e.atk*mult*rnd(.9,1.1)*DF.eDmg*(e.charge?1.35:1)*(1-.2*Math.min(3,retryEase));
      if(B.guard)d*=p.id==='dan'?.35:.5;
      if((p.st.barrier||0)>B.clock)d*=.5;
      d=Math.max(1,Math.round(d));
      p.hp-=d;run.stat.dmg+=d;p.a.flash=1;p.a.flashW=0;V.hurt=Math.max(V.hurt,.6);V.shake=Math.max(V.shake,6);V.stop=.05;
      pop(p.a.x,p.a.y-26,String(d),'#ff6080',d>=15);sfx('hurt');AU.se('noise');addFx('slash',{x:p.a.x,y:p.a.y-8,dur:.3});
      if(p.hp<=0){
        if(p.id==='dan'&&run.f.ch3_promise&&chNo>=3&&!B.guts){B.guts=1;p.hp=1;B.gutsNow=1;}
        else{p.hp=0;p.ko=true;p.g=0;p.queued=false;B.queue=B.queue.filter(a=>a.p!==p&&a.p2!==p);if(B.menu&&B.menu.p===p)closeCmd();if(B.tgt&&B.tgt.p===p)endTarget(null);p.a.pose='down';sfx('down');}
      }
      return d;
    }
    async function enemyAct(e){
      const B=BT;e.g=0;e.queued=false;
      if(!e.alive||B.over)return;
      if(e.sleep>B.clock)return;
      const m=e.D.pat[e.pi%e.D.pat.length];e.pi++;
      if(!B.pa.some(q=>!q.ko))return;
      const strike=async(t,mult)=>{const ox=e.x,oy=e.y;const tc={x:t.a.x,y:t.a.y};await moveTo(e,ox+(tc.x-ox)*.45,oy+(tc.y-oy)*.45-4,130);sfx('enemy');hitP(t,mult,e);await moveTo(e,ox,oy,200);};
      await bmsg(`${e.name}「${m.n}」${m.big?'　<b class="dm">⚠</b>':''}`);await sleep(260);
      switch(m.k){
        case 'hit':{const t=pickP();
          if(m.counter&&B.guard){const ox=e.x,oy=e.y;await moveTo(e,ox+(t.a.x-ox)*.4,oy+(t.a.y-oy)*.4,130);sfx('counter');AU.se('repair');addFx('shield',{x:B.pa[0].a.x,y:B.pa[0].a.y,dur:1});V.shake=10;V.stop=.15;flash(.45);
            const cd=Math.max(1,Math.round((e.atk*2+B.pa[0].pow)*rnd(.95,1.1)));await moveTo(e,ox,oy,200);dmgFoe(e,{d:cd,weak:true,crit:false},'#7affe6');
            await bmsg(`正面から受け止めて──<b>押し返した！</b>`,900);e.charge=false;e.fx.charge=false;break;}
          await strike(t,m.m);if(e.charge){e.charge=false;e.fx.charge=false;}break;}
        case 'all':{const ox=e.x,oy=e.y;await moveTo(e,ox,oy+6,140);addFx('shock',{x:e.x,y:e.y,dur:.6});sfx('enemy');flash(.25);B.pa.forEach(q=>hitP(q,m.m,e));await moveTo(e,ox,oy,200);
          if(B.guard)await bmsg('身を固めていたので、大きく防いだ。',600);e.charge=false;e.fx.charge=false;break;}
        case 'st':{const ts=m.all?B.pa.filter(q=>!q.ko):[pickP()];
          if(m.m){if(m.all){addFx('shock',{x:e.x,y:e.y,dur:.6});ts.forEach(q=>hitP(q,m.m,e));}else await strike(ts[0],m.m);}
          if(B.guard){await bmsg('身を固めていたので、心は乱されなかった。',600);}
          else{ts.forEach(q=>{if(!q.ko)q.st[m.st]=B.clock+ST_SEC[m.st];});await bmsg(`${ts.filter(q=>!q.ko).map(q=>q.name).join('と')}は ${ST_LABEL[m.st]} になった。`,700);}
          break;}
        case 'swell':{e.charge=true;e.fx.charge=true;sfx('bubble');e.hp=Math.min(e.max,e.hp+6);await bmsg(`${e.name}は、ぶくぶくと膨らんでいく……！　<b class="dm">次の一撃が重い。</b>`,900);break;}
        case 'armor':{if(e.armor){await strike(pickP(),1);}else{e.armor=true;e.fx.armor=true;AU.se('machine');await bmsg(`${e.name}は装甲を締め直した。（受けるダメージ大幅減）`,900);}break;}
        case 'grow':{e.atk+=2;e.grow++;e.fx.grow=e.grow;AU.se('warn');await bmsg(`利息が膨らむ。${e.name}の攻撃力が上がった。`,850);break;}
        case 'summon':{const n=B.en.filter(x=>x.alive&&x.kind===m.kind).length;if(n>=3){await strike(pickP(),1.1);break;}summon(e,[m.kind]);await bmsg(`${EN[m.kind].name}が増えた！`,700);break;}
        case 'same':{const t=B.pa[0].ko?B.pa[1]:B.pa[0];await strike(t,m.m*(1+.6*B.rep));if(B.rep)await bmsg(`同じ行動が${B.rep+1}回続いている──数えられている。`,700);break;}
      }
      if(B.gutsNow){B.gutsNow=0;const d=B.pa[0];healP(d,Math.round(d.max*.4));flash(.6);AU.se('ach');await bmsg('「パパ、がんばれ」──小さな声が聞こえた。<b>踏みとどまった！</b>',1300);}
    }
    function summon(boss,kinds,msg){
      const B=BT;
      kinds.forEach(k=>{
        const used=B.en.filter(x=>x.alive).map(x=>x.slot);let si=SLOTS.findIndex((_,i)=>!used.includes(i));if(si<0)si=0;
        const e=mkE(k,boss.x,boss.y);e.slot=si;e.g=0;B.en.push(e);B.expSum+=EN[k].exp;run.stat.par+=PAR[k]||1;
        moveTo(e,B.C.x+SLOTS[si][0],B.C.y+SLOTS[si][1],380);
      });
      sfx('swoosh');
    }
    async function afterAct(){
      const B=BT;if(!B)return;
      if(B.over){if(B.done)B.done();return;}
      while(B.phaseQ.length){const {e,ph}=B.phaseQ.shift();if(!e.alive&&!ph.half)continue;
        if(ph.summon){summon(e,ph.summon);await bmsg(ph.msg,1100);}
        if(ph.half&&B.half){B.evt=true;closeCmd();if(B.tgt)endTarget(null);showBattleUI(false);
          await B.half();V.watch=true;hideBox();showBattleUI(true);B.evt=false;}}
      if(!B.en.some(e=>e.alive)){B.over=true;B.result='win';}
      else if(B.pa[0].ko||B.pa.every(q=>q.ko)){B.over=true;B.result='lose';}
      if(B.over&&B.done)B.done();
    }
    function showBattleUI(on){if(!BT)return;[BT.win,BT.md].forEach(e=>e&&e.classList.toggle('rpg-hide',!on));if(BT.msg)BT.msg.classList.add('rpg-hide');}
    // ── 戦闘の流れ ──
    async function battle(group,opt={}){
      const snap=JSON.stringify({p:run.party,items:run.items});
      retryEase=0;
      try{
        while(true){
          const r=await battleOnce(group,opt);
          if(r!=='retry')return r;
          const s=JSON.parse(snap);run.party=s.p;run.items=s.items;
          retryEase++;
          if(retryEase<=3&&typeof showNotif==="function")showNotif(`灯が少し強くなった（受けるダメージ −${Math.min(3,retryEase)*20}%）`);
        }
      }finally{retryEase=0;}
    }
    async function battleOnce(group,opt){
      const kinds=group.slice();
      const D=V.A.dan,M=V.A.mina;
      const boss=!!(opt.boss||kinds.some(k=>EN[k].boss));
      showPad(false);closeFieldMenu();hideBox();V.cam.lock=null;
      sfx('enc');AU.se('warn');V.shake=5;
      const src=opt.ent?V.ents.find(e=>e.id===opt.ent):opt.fieldEnt||null;
      // ボスはその場から動かず、こちらが向かい合う位置に並ぶ
      const C=boss&&src?{x:src.x,y:src.y+36}:findArena(D.x,D.y-28);
      let sx=C.x,sy=C.y-60;
      if(src){sx=src.x;sy=src.y;}
      else if(opt.at){const o=V.map.props.find(p=>p.ev===opt.at);if(o){sx=o.x*TS+o.P.w*8;sy=o.y*TS+o.P.h*TS-2;}}
      if(src){src.hidden=true;}
      const form=formation(kinds,opt.form||(src&&src.form),boss);
      BT={on:true,live:false,C,camAt:{x:C.x,y:C.y-4},boss,final:!!opt.final,half:opt.half||null,mode:atbMode(R),clock:0,queue:[],phaseQ:[],usedL:{},rep:0,lastKey:null,
        guard:false,guts:0,busy:false,evt:false,over:false,result:null,menu:null,tgt:null,expSum:0,
        pa:[mkP('dan',opt),mkP('mina',opt)],en:[]};
      const B=BT;
      kinds.forEach((k,i)=>{const e=mkE(k,sx+(i-(kinds.length-1)/2)*6,sy);e.slot=-1;B.en.push(e);B.expSum+=EN[k].exp;run.stat.par+=PAR[k]||3;});
      V.porFoe=kinds[0];
      run.stat.maxsum+=B.pa[0].max+B.pa[1].max;
      // その場で陣形をとる
      M.on=true;M.walk=null;D.walk=null;D.pose='';M.pose='';
      sfx('swoosh');
      const mv=[moveTo(D,C.x-16,C.y+34,360),moveTo(M,C.x+16,C.y+40,360)];
      B.en.forEach((e,i)=>mv.push(moveTo(e,C.x+form[i][0],C.y+form[i][1],380)));
      B.pa.forEach(p=>{p.a.dir='u';if(p.ko)p.a.pose='down';});
      bgm(boss?(opt.final?'mental':'kaidan'):'kaidan');
      await Promise.all(mv);
      D.dir='u';M.dir='u';
      buildBattleUI();
      await bmsg(`${B.en.map(e=>e.name).filter((n,i,a)=>a.indexOf(n)===i).join('・')} が あらわれた！`,900);
      if(opt.tutorial){bdesc('ゲージが満ちた人のコマンドが開きます。<b>攻撃</b>で話しかけ、<b>技</b>で歌やミナモの灯り。二人とも満ちていれば<b>★連携技</b>。敵の頭に⚠が出たら「守る」。');await sleep(3200);}
      else if(boss&&EN[kinds[0]].hint){bdesc(EN[kinds[0]].hint);await sleep(2200);}
      B.live=true;
      await new Promise(res=>{B.done=res;if(B.over)res();});
      // 終わり
      closeCmd();if(B.tgt)endTarget(null);mode='none';
      await sleep(250);
      let ret=B.result;
      if(B.result==='win')await victory(B,src,opt);
      else if(B.result==='lose'){ret=await defeat(B);}
      else await endBattle(B,src);
      return ret;
    }
    async function endBattle(B,src){
      B.pa.forEach(p=>{run.party[p.id]={hp:Math.max(0,Math.min(pMax(p.id),Math.round(p.hp))),mp:Math.max(0,Math.min(pMpMax(p.id),Math.round(p.mp)))};});
      if(B.win)B.win.remove();if(B.msg)B.msg.remove();if(B.md)B.md.remove();
      B.on=false;BT=null;onFocusDesc=null;
      [V.A.dan,V.A.mina].forEach(a=>{a.pose='';a.flash=0;});
      if(src){src.hidden=false;}
      seedTrail(V.A.mina);
      bgm('night');
    }
    async function victory(B,src,opt){
      bgm('night');sfx('win');
      [V.A.dan,V.A.mina].forEach((a,i)=>{if(!B.pa[i].ko){a.pose='win';a.dir='d';}});
      R.rec.wins=(R.rec.wins||0)+1;
      let m=`<b>勝利！</b>`;if(B.expSum){run.exp+=B.expSum;m+=`　経験 +${B.expSum}`;}
      await bmsg(m,1100);
      while(run.exp>=expNeed(run.lv)){run.exp-=expNeed(run.lv);run.lv++;sfx('lvup');AU.se('rank');score();
        const d=B.pa[0];const nm=pMax('dan');d.hp+=nm-d.max+(B.final&&run.f.ch5_true?0:0);d.max=nm;d.mpMax=pMpMax('dan');B.pa[1].max=pMax('mina');B.pa[1].mpMax=pMpMax('mina');
        await bmsg(`<b>レベルが上がった！ Lv${run.lv}</b>　HP・息・力が上がった。`,1300);}
      // 戦いのあとの回復（やさしいほど多い）
      const hf=run.f.ch4_rest?1:DF.heal;
      B.pa.forEach(p=>{if(p.ko){p.ko=false;p.hp=Math.max(1,Math.round(p.max*Math.max(.3,hf)));}else p.hp=Math.min(p.max,p.hp+(p.max-p.hp)*hf);p.mp=Math.min(p.mpMax,p.mp+(p.mpMax-p.mp)*hf*.5);});
      if(hf>0)await bmsg(run.f.ch4_rest?'ひと息つく。……体は、すっかり軽い。':'ひと息ついて、少し回復した。',700);
      if(src){src.alive=false;src.on=false;if(src.id)run.dead[src.id]=1;}
      await endBattle(B,null);
    }
    async function defeat(B){
      sfx('lose');AU.se('noise');V.stop=.3;
      V.A.dan.pose='down';V.A.mina.pose='down';
      await bmsg('だんのうらは、暗い水の底へ沈んでいく……',1400);
      R.rec.losses=(R.rec.losses||0)+1;
      if(B.win)B.win.remove();if(B.msg)B.msg.remove();if(B.md)B.md.remove();
      B.on=false;BT=null;
      if(DF.retry){
        const c=el('div','rpg-card red',`<div class="c1">悪夢</div><div class="c2">沈みかけた</div><div class="ln"></div><div class="c3">……まだ、水面の光が見える。</div>`);
        const bw=el('div','rpg-btns');c.appendChild(bw);ui.appendChild(c);void c.offsetWidth;c.classList.add('on');
        const pick=await new Promise(res=>{
          const b1=btn('rpg-btn main','もう一度、立ち上がる<small>この戦いを、始めからやり直す</small>',()=>{AU.se('decide');res(0);});
          const b2=btn('rpg-btn','目を覚ます<small>今夜の夢はここまで（悪夢）</small>',()=>{AU.se('back');res(1);});
          bw.append(b1,b2);setFocus([b1,b2],1,null);
        });
        clearFocus();c.classList.remove('on');await sleep(500);c.remove();
        if(pick===0){V.A.dan.pose='';V.A.mina.pose='';flash(.5);sfx('save');return 'retry';}
      }
      V.hurt=1;
      await play(['n:冷たい水が、肺の奥まで流れ込んでくる。','m.sad:「だんのうらさん……！　だめ、まだ──」','n:灯が遠ざかる。水面が、遠ざかる。']);
      hideBox();
      const c=el('div','rpg-card red',`<div class="c1">悪夢</div><div class="c2">目が覚めた</div><div class="ln"></div><div class="c3">シーツが汗で濡れている。<br>この章は、明日の夜にやり直せる。</div><div class="rpg-tap">TAP</div>`);
      ui.appendChild(c);void c.offsetWidth;c.classList.add('on');
      await waitTap(0,1200);
      endGame('lost');
    }

    // ── 選択肢 ──
    function choice(prompt,opts){
      return new Promise(res=>{
        setBox('n','');plate.style.display='none';box.classList.remove('rpg-hide');
        txt.textContent=prompt;nextEl.style.visibility='hidden';mode='choice';
        const wrap=el('div','rpg-choices');
        const list=opts.map((o,i)=>btn('rpg-ch',`${o.t}${o.s?`<small>${o.s}</small>`:''}`,()=>{
          AU.se('decide');sfx('item');clearFocus();wrap.remove();mode='none';res(i);
        }));
        list.forEach(b=>wrap.appendChild(b));ui.appendChild(wrap);
        wrap.style.bottom=(box.offsetHeight+18)+'px';
        setFocus(list,1);
      });
    }

    // ── フィールドのメニュー（道具・設定） ──
    function closeFieldMenu(){if(V.fmenu){V.fmenu.remove();V.fmenu=null;clearFocus();}}
    function openFieldMenu(){
      if(V.fmenu){closeFieldMenu();return;}
      if(V.mode!=='field')return;
      AU.se('decide');
      const w=el('div','rpg-fwin');V.fmenu=w;ui.appendChild(w);
      const build=()=>{
        const P=run.party;
        w.innerHTML=`<div class="ttl">${RPG_CH[chNo].kan}「${RPG_CH[chNo].title}」</div><div class="st">だんのうら Lv${run.lv}　HP ${Math.ceil(P.dan.hp)}/${pMax('dan')}　息 ${Math.floor(P.dan.mp)}/${pMpMax('dan')}<br>ミナモ　　　　HP ${Math.ceil(P.mina.hp)}/${pMax('mina')}　息 ${Math.floor(P.mina.mp)}/${pMpMax('mina')}<br>灯 ${'●'.repeat(run.lights)}${'○'.repeat(5-run.lights)}　経験 ${run.exp}/${expNeed(run.lv)}</div>`;
        const list=[];
        ITEM_KEYS.forEach(k=>{const I=ITEMS[k];const b=btn('rpg-fb',`${I.name} ×${run.items[k]||0}<small>${I.desc}</small>`,()=>{useFieldItem(k);build();});if(!(run.items[k]>0))b.disabled=true;w.appendChild(b);list.push(b);});
        const md=btn('rpg-fb',`戦闘：${atbMode(R)==='wait'?'ウェイト':'アクティブ'}<small>${atbMode(R)==='wait'?'コマンドを選ぶ間は時間が止まる':'選んでいる間も敵は動く'}</small>`,()=>{R.opt.atb=atbMode(R)==='wait'?'active':'wait';AU.se('btn');build();});
        const sp=btn('rpg-fb',`文字の速さ：${SPEED_N[R.opt.speed]}`,()=>{R.opt.speed=(R.opt.speed+1)%SPEEDS.length;AU.se('btn');build();});
        const cl=btn('rpg-fb','とじる<small>B / Esc</small>',()=>{AU.se('back');closeFieldMenu();});
        [md,sp,cl].forEach(b=>{w.appendChild(b);list.push(b);});
        setFocus(list,1,cl,Math.min(focus.i||0,list.length-1));
      };
      build();
    }
    function useFieldItem(k){
      const P=run.party;if(!(run.items[k]>0))return;
      const ratio=id=>P[id].hp/pMax(id);
      if(k==='shell'){const id=ratio('dan')<=ratio('mina')?'dan':'mina';P[id].hp=Math.min(pMax(id),P[id].hp+40);addFx('heal',{a:V.A[id],dur:1});}
      else if(k==='ramune'){const id=P.dan.mp/pMpMax('dan')<=P.mina.mp/pMpMax('mina')?'dan':'mina';P[id].mp=Math.min(pMpMax(id),P[id].mp+15);addFx('heal',{a:V.A[id],dur:1});}
      else{['dan','mina'].forEach(id=>{P[id].hp=Math.min(pMax(id),Math.max(1,P[id].hp)+50);addFx('heal',{a:V.A[id],dur:1});});}
      run.items[k]--;run.stat.items++;sfx('heal');
    }

    // ── カード・灯・道具 ──
    async function intro(lines){
      await trans('fade',()=>{
        loadMap('home');V.mode='cut';placeParty('start');V.map.v.morning=0;
        V.A.mina.on=false;V.A.mina.a=0;V.follow=false;V.A.kid.on=false;V.A.kid.a=0;V.kidKey='kidHome';V.form='normal';
      });
      bgm('night');
      await play(lines);
    }
    async function card(n){
      const c=RPG_CH[n];
      hideBox();
      const mk=(a,b,cc,cls)=>{const e=el('div','rpg-card '+(cls||''),`<div class="c1">${a}</div><div class="c2">${b}</div><div class="ln"></div><div class="c3">${cc}</div>`);ui.appendChild(e);return e;};
      const show=async(e,ms)=>{void e.offsetWidth;e.classList.add('on');AU.se('ghost');await sleep(900);V.floats=[];await waitTap(ms,600);e.classList.remove('on');await sleep(700);e.remove();};
      if(n===1&&!isReplay&&R.cleared===0)await show(mk('DANNOURA DREAM TALE','壇ノ浦夢譚','── 波の下にも、都はあるか ──'),2600);
      const e2=mk(c.kan,c.title,`── ${c.place} ──`);
      void e2.offsetWidth;e2.classList.add('on');AU.se('ghost');await sleep(900);V.floats=[];
      V.mode='scene';V.bg='menu';V.map=null;
      await waitTap(2800,600);
      if(isReplay&&R.cleared>=5&&REPLAY_EXTRA[n]){await play(REPLAY_EXTRA[n]);hideBox();}
      e2.classList.remove('on');await sleep(300);e2.remove();
    }
    async function gainLight(n){
      hideBox();V.light={t:0,n};sfx('light');AU.se('ach');
      await sleep(1500);flash(.9);
      const g=el('div','rpg-gain',`${RPG_CH[n].light}の灯を取り戻した`);g.style.color=`rgb(${LIGHT_COL[n]})`;ui.appendChild(g);
      run.lights=Math.max(run.lights,n);score();
      await waitTap(2600,800);g.remove();V.light=null;
    }
    async function giveItem(k,n){
      run.items[k]=(run.items[k]||0)+n;sfx('item');AU.se('ach');
      setBox('n','');await showLine(`《${ITEMS[k].name}》を手に入れた。（${ITEMS[k].desc}）`);
    }
    function score(){
      if(!run){mg.setScore('');return;}
      const l=run.lights||0;
      mg.setScore(`Lv${run.lv}　灯 <span style="color:var(--gd)">${'●'.repeat(l)}</span>${'○'.repeat(5-l)}`);
    }
    async function retheme(th){
      await trans('fade',()=>{if(V.map){V.map.theme=th;paintMap(V.map);}});
    }

    // ── 章の終わり・エンディング ──
    function calcRank(){
      const s=run.stat;
      let sc=100-48*(s.dmg/Math.max(1,s.maxsum))-1.5*Math.max(0,s.turns-s.par*2)-5*s.items;
      return sc>=86?'S':sc>=70?'A':sc>=50?'B':'C';
    }
    function keepRank(n,r){const old=R.ranks[n];if(!old||RANK_V[r]>RANK_V[old])R.ranks[n]=r;}
    async function finishChapter(n){
      const rank=calcRank();run.rank=rank;
      hideBox();await trans('fade',()=>{V.mode='scene';V.bg='menu';V.map=null;showPad(false);});
      sfx('win');AU.se('rank');
      const next=n<5?`次は ${RPG_CH[n+1].kan}「${RPG_CH[n+1].title}」── 明日の夜に`:'';
      const c=el('div','rpg-card gold',`<div class="c1">${RPG_CH[n].kan}　了</div><div class="c2">${RPG_CH[n].title}</div><div class="ln"></div><div class="c3">灯 ${'●'.repeat(run.lights)}${'○'.repeat(5-run.lights)}　Lv${run.lv}</div><div class="rpg-rank r${rank}">評価 <b>${rank}</b></div><div class="c3">${isReplay?'見返し（報酬なし）':next}</div><div class="rpg-tap">TAP</div>`);
      ui.appendChild(c);void c.offsetWidth;c.classList.add('on');
      await waitTap(0,1200);
      endGame(isReplay?'replay':'clear');
    }
    async function playEnding(key,epi){
      const E=ENDS[key];endKey=key;
      if(!epi){run.rank=calcRank();await play(E.scene);}
      if(E.dark){
        bgm('collapse');
        await trans('fade',()=>{V.mode='scene';V.bg='abyss';V.map=null;showPad(false);});
      }else{
        bgm(E.bgm);if(!epi)flash(.9);
        await trans('fade',()=>{loadMap('home');V.mode='cut';V.map.v.morning=1;placeParty('start');V.A.mina.on=false;V.A.mina.a=0;V.follow=false;V.A.kid.on=false;V.A.kid.a=0;V.form='normal';});
        await play(E.wake);
      }
      hideBox();
      const ranks=Object.assign({},R.ranks);if(!epi&&run.rank&&(!ranks[5]||RANK_V[run.rank]>RANK_V[ranks[5]]))ranks[5]=run.rank;
      const vals=[1,2,3,4,5].map(i=>RANK_V[ranks[i]]||1);
      const avg=vals.reduce((a,b)=>a+b,0)/5+(key==='true'?.5:key==='sink'?-.5:0);
      const total=avg>=3.6?'S':avg>=2.8?'A':avg>=2?'B':'C';
      if(!epi)run.total=total;
      const e=el('div','rpg-end'+(E.dark?' dark':''),`<div class="e1">ENDING</div><div class="e2">${E.name}</div><div class="e3">${E.body}</div><div class="e4">${E.last.replace('\n','<br>')}</div>${E.hint&&!epi?`<div class="rpg-note">${E.hint}</div>`:''}<div class="rpg-info">各章の評価 ${[1,2,3,4,5].map(i=>ranks[i]||'-').join(' ')}　総合評価 <b style="color:var(--gd)">${total}</b></div><div class="rpg-tap">TAP</div>`);
      ui.appendChild(e);
      AU.se(E.dark?'ghost':'ach');
      await waitTap(0,2200);
      endGame(epi?'replay':(isReplay?'replay':'clear'));
    }
    function endGame(reason){mg.end(reason);throw ABORT;}

    // ── 物語に渡す関数群 ──
    const G={
      say:play,choice,battle,card,intro,enter,roam,retheme,light:gainLight,item:giveItem,finish:finishChapter,ending:k=>playEnding(k,false),
      leave:v=>{V.leaveVal=v;return Promise.resolve();},markDone:id=>{run.ev[id]=1;},done,
      get f(){return run.f;},get replay(){return isReplay;},
      anchors:()=>ANCHORS.filter(k=>run.f[k]).length,
    };

    // ── タイトル画面 ──
    let menuEl=null;
    function showMenu(){
      phase='menu';mode='menu';V.mode='scene';V.bg='menu';V.map=null;hideBox();showPad(false);
      mg.setTimer('夢譚');
      const lit=R.cleared;
      const m=el('div','rpg-menu');menuEl=m;
      const ends=['true','wake','sink'].filter(k=>R.endings[k]).length;
      m.innerHTML=`<div class="rpg-eye">DANNOURA DREAM TALE</div><div class="rpg-logo">壇ノ浦夢譚</div><div class="rpg-sub">── 波の下にも、都はあるか ──</div>
        <div class="rpg-lights">${RPG_CH.slice(1).map((c,i)=>`<div class="rpg-lt${i<lit?' on':''}"><b></b>${c.light}${R.ranks[i+1]?`<em>${R.ranks[i+1]}</em>`:''}</div>`).join('')}</div>
        <div class="rpg-info">Lv${R.lv}　さくら貝×${R.items.shell||0}　夜光ラムネ×${R.items.ramune||0}　星の真珠×${R.items.pearl||0}<br>勝利 ${R.rec.wins||0}　悪夢 ${R.rec.losses||0}　エンド ${ends}/3　難しさ：${MG_DIFF_NAMES[mgDifficulty()]}</div>`;
      const bw=el('div','rpg-btns');m.appendChild(bw);
      const list=[];
      const add=b=>{bw.appendChild(b);list.push(b);return b;};
      const n=R.cleared+1;
      if(R.cleared<5){
        const c=RPG_CH[n];
        if(lockedToday(R)){const b=add(btn('rpg-btn',`${c.kan}「${c.title}」<small>続きは明日の夜に。今夜はもう夢を見た。</small>`,()=>{}));b.disabled=true;}
        else add(btn('rpg-btn main',`${R.cleared?'つづきから':'はじめから'}　${c.kan}「${c.title}」<small>${c.place}</small>`,()=>go(n,false)));
      }else{
        const E=ENDS[R.ending]||ENDS.wake;
        add(btn('rpg-btn main',`エピローグ「${E.name}」<small>もう一度、あの朝を（報酬なし）</small>`,()=>epilogue()));
      }
      if(R.cleared>=5||lockedToday(R)){
        const g=el('div','rpg-grid2');bw.appendChild(g);
        for(let i=1;i<=R.cleared;i++){const c=RPG_CH[i];const b=btn('rpg-btn mini',`${c.kan}を見返す<small>${c.title}${R.ranks[i]?'・評価'+R.ranks[i]:''}</small>`,()=>go(i,true));g.appendChild(b);list.push(b);}
      }
      const atbB=add(btn('rpg-btn mini','',e=>{R.opt.atb=atbMode(R)==='wait'?'active':'wait';setAtbLabel();AU.se('btn');}));
      const setAtbLabel=()=>{atbB.innerHTML=`戦闘：${atbMode(R)==='wait'?'ウェイト':'アクティブ'}<small>${atbMode(R)==='wait'?'コマンドを選ぶ間は時間が止まる':'選んでいる間も敵は動く'}</small>`;};setAtbLabel();
      add(btn('rpg-btn mini',`文字の速さ：${SPEED_N[R.opt.speed]}`,e=>{R.opt.speed=(R.opt.speed+1)%SPEEDS.length;e.currentTarget.textContent=`文字の速さ：${SPEED_N[R.opt.speed]}`;AU.se('btn');sfx('blip');}));
      const back=add(btn('rpg-btn mini',`眠らずに戻る<small>今夜の夢はここまで</small>`,()=>{AU.se('back');mg.end('quit');}));
      ui.appendChild(m);
      setFocus(list,1,back);
    }
    function newRun(n,lights){
      run={lv:R.lv,exp:R.exp,items:Object.assign({},R.items),f:Object.assign({},R.flags),lights,stat:{turns:0,par:0,dmg:0,maxsum:0,items:0},
        ev:{},chest:{},dead:{},mapv:{},party:null};
      const startFull=run.f.ch4_rest&&n>4;
      run.party={dan:{hp:0,mp:pMpMax('dan')},mina:{hp:pMax('mina'),mp:pMpMax('mina')}};
      run.party.dan.hp=startFull?pMax('dan'):Math.round(pMax('dan')*Math.max(.72,Math.min(1,1-(+gs.fatigue||0)/300)));
      V.form='normal';V.watch=false;V.kidKey='kidHome';
    }
    async function go(n,replay){
      if(phase!=='menu')return;
      AU.se('decide');sfx('light');clearFocus();
      chNo=n;isReplay=replay;phase='play';mode='none';
      newRun(n,n-1);
      mg.setTimer(RPG_CH[n].kan+(replay?'（見返し）':''));score();
      await trans('fade',()=>{if(menuEl){menuEl.remove();menuEl=null;}});
      try{await STORY[n](G);}catch(err){if(err!==ABORT)console.error(err);}
    }
    async function epilogue(){
      if(phase!=='menu')return;
      AU.se('decide');clearFocus();phase='epi';isReplay=true;mode='none';chNo=5;
      newRun(5,5);
      await trans('fade',()=>{if(menuEl){menuEl.remove();menuEl=null;}});
      try{await playEnding(R.ending||'wake',true);}catch(err){if(err!==ABORT)console.error(err);}
    }
    resize();
    showMenu();
    bgm('night');

    // ── 結果 ──
    const CLEAR_FX={1:{fatigue:-10,mental:3,hope:3},2:{fatigue:-10,mental:4,hope:4},3:{fatigue:-10,mental:5,hope:4},4:{fatigue:-10,mental:6,hope:5}};
    const END_FX={true:{fatigue:-12,mental:8,hope:8,childStress:-5},wake:{fatigue:-10,mental:6,hope:6},sink:{fatigue:-14,mental:2,childStress:6}};
    return {
      result(reason){
        cleanup();
        const ch=RPG_CH[chNo]||{};
        if(reason==='quit'){
          if(phase==='menu')return {title:'🌊 壇ノ浦夢譚',summary:'夢の入口で引き返した。今夜の眠りは浅かった。',fx:{},time:10};
          return {title:'🌊 夢から覚めた',summary:`${ch.kan}「${ch.title}」の途中で目が覚めた。<br>${isReplay?'（見返し中だった）':'この章の進み具合は失われた。次の夜に、はじめからやり直せる。'}`,
            fx:isReplay?{}:{fatigue:-3},time:60};
        }
        if(reason==='lost'){
          return {title:'🌊 悪夢',summary:`海の亡者に呑まれ、汗だくで目が覚めた。<br>${isReplay?'（見返し中だった）':`${ch.kan}「${ch.title}」は、明日の夜にやり直せる。<br>夢の中で得た経験（Lv${run.lv}）は残っている。`}`,
            fx:isReplay?{}:{fatigue:-5,mental:-4},time:90,cutin:['fear','……海の音が、まだ耳に残ってるわ。'],
            log:isReplay?null:'夢の海で亡者に呑まれ、うなされて目が覚めた',
            after(){if(!isReplay){R.lv=run.lv;R.exp=run.exp;}}};
        }
        if(reason==='replay'){
          return {title:'🌊 壇ノ浦夢譚（見返し）',summary:phase==='epi'?`もう一度、あの朝の夢を見た。<br>「${(ENDS[R.ending]||ENDS.wake).name}」`:`${ch.kan}「${ch.title}」を見返した。${run&&run.rank?`評価 ${run.rank}`:''}${endKey?`<br>エンド「${ENDS[endKey].name}」`:''}<br>（見返しのため報酬なし）`,
            fx:{},time:phase==='epi'?30:60,
            after(){if(phase!=='epi'&&run&&run.rank)keepRank(chNo,run.rank);if(endKey)R.endings[endKey]=1;}};
        }
        // 章クリア
        const fx=chNo===5?END_FX[endKey]||END_FX.wake:CLEAR_FX[chNo];
        const last=chNo===5;
        const E=last?ENDS[endKey]:null;
        return {
          title:last?`🌊 ${E.name}`:`🌊 ${ch.kan}「${ch.title}」クリア`,
          summary:last
            ?`五つの灯をすべて取り戻した。<br>エンド「${E.name}」　評価 ${run.rank}・総合 ${run.total}`
            :`夢の中で「${ch.light}の灯」を取り戻した。（灯 ${chNo}/5・Lv${run.lv}・評価 ${run.rank}）<br>次の章は、明日の夜に。`,
          fx,time:last&&endKey==='sink'?150:120,sp:1,
          log:last?(endKey==='sink'?'夢の都で眠ろうとした。朝、起きられなかった':'夢の底から、朝を選んで這い上がった'):`夢の海で「${ch.light}の灯」を取り戻した`,
          cutin:last?(endKey==='sink'?['collapse','……波の下にも、都はあるんだって。']:['win','おはよう。……ちゃんと、朝よ。']):['happy',`……${ch.light}の灯が、戻ってきた。`],
          after(){
            R.cleared=Math.max(R.cleared,chNo);R.lastDay=gs.day;
            R.lv=run.lv;R.exp=run.exp;R.items=Object.assign({},run.items);
            Object.assign(R.flags,run.f);keepRank(chNo,run.rank);
            if(last){R.ending=endKey;R.endings[endKey]=1;R.rating=run.total;}
          },
        };
      },
    };
  },
});
})();
