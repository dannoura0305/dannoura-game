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
.mg-shooter .shooter-bomb i{display:block;font-style:normal;font-family:var(--mono);font-size:.6rem;color:#7fffe8;letter-spacing:.12em;}
.mg-shooter .shooter-pause{position:absolute;right:8px;top:64px;z-index:4;width:40px;height:40px;border-radius:8px;border:1px solid rgba(187,174,221,.45);
  background:rgba(10,7,22,.72);color:#deccf8;font-family:var(--mono);font-size:.8rem;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;}
.mg-shooter .shooter-pause.hide{display:none;}
.mg-shooter .shooter-sw,.mg-shooter .shooter-rel{position:absolute;z-index:3;touch-action:none;cursor:pointer;-webkit-tap-highlight-color:transparent;
  font-family:var(--dot);text-align:center;line-height:1.2;border-radius:10px;transition:opacity .3s,transform .08s,border-color .15s,box-shadow .15s;}
.mg-shooter .shooter-sw{left:8px;bottom:8px;min-width:96px;min-height:54px;padding:5px 10px;font-size:.62rem;color:#fff;border:2px solid var(--swc,#ff4a5a);
  background:linear-gradient(180deg,var(--swb,rgba(90,10,26,.92)),rgba(10,6,20,.95));box-shadow:0 0 12px var(--swg,rgba(255,74,90,.4)),inset 0 1px 0 rgba(255,255,255,.25);}
.mg-shooter .shooter-sw b{display:block;font-size:.8rem;font-weight:normal;letter-spacing:.06em;}
.mg-shooter .shooter-sw small{display:block;font-family:var(--mono);font-size:.54rem;color:rgba(255,255,255,.6);}
.mg-shooter .shooter-sw.cold{--swc:#3fd8ff;--swb:rgba(6,50,66,.92);--swg:rgba(63,216,255,.4);}
.mg-shooter .shooter-sw.spin{transform:scale(.92) rotate(-6deg);}
.mg-shooter .shooter-rel{right:8px;bottom:70px;min-width:96px;min-height:44px;padding:4px 8px 6px;font-size:.6rem;color:#deccf8;border:2px solid rgba(222,204,248,.35);
  background:linear-gradient(180deg,rgba(30,20,56,.92),rgba(8,5,20,.95));}
.mg-shooter .shooter-rel b{display:block;font-size:.72rem;font-weight:normal;}
.mg-shooter .shooter-rel i{display:flex;gap:1px;margin-top:3px;height:5px;}
.mg-shooter .shooter-rel i u{flex:1;background:rgba(255,255,255,.12);text-decoration:none;border-radius:1px;}
.mg-shooter .shooter-rel i u.on{background:#fff6c0;box-shadow:0 0 4px rgba(255,246,192,.8);}
.mg-shooter .shooter-rel.ready{border-color:#fff6c0;color:#fff6c0;box-shadow:0 0 12px rgba(255,246,192,.45);}
.mg-shooter .shooter-rel:active,.mg-shooter .shooter-sw:active{transform:scale(.94);}
.mg-shooter .shooter-sw.hide,.mg-shooter .shooter-rel.hide{opacity:0;pointer-events:none;}
.mg-shooter .shooter-shopbtn{position:absolute;left:8px;top:64px;z-index:6;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,158,192,.6);
  background:rgba(40,10,30,.85);color:#ffd6e6;font-family:var(--dot);font-size:.66rem;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;}
.mg-shooter .shooter-shopbtn.hide{display:none;}
.mg-shooter .shooter-shopbtn.low{top:auto;bottom:10px;}
.mg-shooter .shooter-shop{position:absolute;inset:60px 8px 8px;z-index:8;display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:10px;overflow:auto;
  border:2px solid #ff9ec0;background:linear-gradient(180deg,rgba(26,10,30,.98),rgba(8,5,18,.98));box-shadow:0 10px 30px rgba(0,0,0,.7);font-family:var(--dot);color:#deccf8;}
.mg-shooter .shooter-shop.off{display:none;}
.mg-shooter .shooter-shop h3{margin:0;font-size:.86rem;font-weight:normal;color:#ffd6e6;display:flex;justify-content:space-between;align-items:center;}
.mg-shooter .shooter-shop .sub{font-size:.6rem;color:#8a7aa8;line-height:1.4;}
.mg-shooter .shooter-shop .row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(222,204,248,.12);}
.mg-shooter .shooter-shop .row .nm{flex:1;min-width:0;font-size:.72rem;}
.mg-shooter .shooter-shop .row .nm small{display:block;font-size:.56rem;color:#8a7aa8;}
.mg-shooter .shooter-shop .pips{display:flex;gap:2px;margin-top:3px;}
.mg-shooter .shooter-shop .pips u{width:12px;height:5px;border-radius:1px;background:rgba(255,255,255,.12);text-decoration:none;}
.mg-shooter .shooter-shop .pips u.on{background:#ff9ec0;box-shadow:0 0 4px rgba(255,158,192,.7);}
.mg-shooter .shooter-shop .pips u.lock{background:repeating-linear-gradient(45deg,rgba(255,255,255,.08) 0 2px,transparent 2px 4px);}
.mg-shooter .shooter-shop button.buy{min-width:74px;min-height:40px;border-radius:8px;border:1px solid #ff9ec0;background:rgba(80,16,50,.9);color:#fff;font-family:var(--dot);font-size:.66rem;cursor:pointer;touch-action:none;}
.mg-shooter .shooter-shop button.buy:disabled{opacity:.4;cursor:default;}
.mg-shooter .shooter-shop button.close{min-height:40px;border-radius:8px;border:1px solid rgba(222,204,248,.5);background:rgba(30,20,56,.9);color:#deccf8;font-family:var(--dot);font-size:.72rem;cursor:pointer;touch-action:none;}
@media (orientation:landscape) and (max-height:500px){
  .mg-shooter .shooter-bomb{min-width:80px;min-height:44px;font-size:.56rem;}
  .mg-shooter .shooter-sw{min-width:70px;min-height:38px;padding:3px 6px;}
  .mg-shooter .shooter-sw small{display:none;}
  .mg-shooter .shooter-rel{bottom:50px;min-width:72px;min-height:30px;padding:2px 6px 4px;}
  .mg-shooter .shooter-rel span{display:none;}
  .mg-shooter .shooter-dlg{left:auto;width:min(560px,96%);right:2%;}
  .mg-shooter .shooter-face{width:56px;height:56px;}
  .mg-shooter .shooter-text{min-height:3em;font-size:.76rem;}
}
`);

// ══════════════════════════════════════════════════════════
// 純粋なロジック（DOM なし。tests/minigame-shooter.test.mjs が node:vm で読む）
//   ・難しさの表（diffTable）・ウェーブの台本（buildTimeline：シードで決まる）
//   ・弾の形（aimed / ring / spiral / laserCols）・当たり判定・スコア／コンボ・評価・報酬
// 報酬（rewardFx）は以前の計算式のまま（炎上・精神・フォロワー・疲労・希望・SP・時間）。
// ══════════════════════════════════════════════════════════
var ShooterLogic=(function(){
  const TAU=Math.PI*2;
  // 再現できる乱数（mulberry32）
  function rng(seed){
    let a=(seed>>>0)||1;
    return function(){a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296;};
  }
  // 難しさ（設定画面で選ぶ。むずかしい＝以前の調整）。emoLv＝感情制御のレベル
  const DIFF={
    easy:  {absR:17,shield:8,spd:.74,iv:1.45,bossHp:.6, fire:1.55,eb:.72,inv:1.9, hb:.62,good:.75,ffShield:false,ffPass:true, goodHp:3,bombs:2,density:.7, grazeR:26,laserWarn:1.15},
    normal:{absR:14,shield:6,spd:.88,iv:1.18,bossHp:.8, fire:1.22,eb:.86,inv:1.55,hb:.72,good:.9, ffShield:false,ffPass:false,goodHp:4,bombs:1,density:.85,grazeR:23,laserWarn:.95},
    hard:  {absR:12,shield:5,spd:1,  iv:1,   bossHp:1,  fire:1,   eb:1,  inv:1.3, hb:.8, good:1,  ffShield:true, ffPass:false,goodHp:3,bombs:1,density:1,  grazeR:20,laserWarn:.8},
  };
  function diffTable(diff,emoLv){
    const b=Object.assign({},DIFF[diff]||DIFF.easy);
    const L=Math.max(0,Math.min(3,Math.floor(+emoLv||0)));
    b.shield+=L;b.inv+=.15*L;   // 感情制御：こころ +1/Lv・被弾後の無敵 +0.15秒/Lv
    return b;
  }
  // 台本：ステージ時間（中ボス中は止まる）で並ぶ
  const WAVES=[
    {t:0, name:'WAVE 1',sub:'荒らし、接近',     iv:.95,w:{basic:.72,zig:.28}},
    {t:20,name:'WAVE 2',sub:'切り抜き勢、襲来', iv:.82,w:{basic:.36,zig:.24,armor:.2,shooter:.2}},
    {t:40,name:'WAVE 3',sub:'スパムBOT、出現',  iv:.74,w:{basic:.26,zig:.2,armor:.14,split:.2,bot:.2}},
    {t:60,name:'WAVE 4',sub:'深夜の大炎上',     iv:.64,w:{basic:.2,zig:.2,armor:.14,split:.16,shooter:.14,bot:.16}},
  ];
  const MID_T=58, BOSS_T=86;
  function pickW(w,r){let acc=0;for(const k in w){acc+=w[k];if(r<acc)return k;}return 'basic';}
  // 出現の台本。[{t,kind:'wave'|'spawn'|'form'|'elite'|'mid'|'boss', ...}]（t 昇順）
  function buildTimeline(seed,opt){
    opt=opt||{};
    const R=rng(seed),ivm=(opt.iv||1)*(opt.remix?.88:1),ev=[];
    for(let i=0;i<WAVES.length;i++){
      const W0=WAVES[i],end=i+1<WAVES.length?WAVES[i+1].t:BOSS_T;
      ev.push({t:W0.t,kind:'wave',idx:i});
      let t=W0.t+(i===0?1.2:.6);
      const stop=i===2?MID_T-1:end-1.2;
      while(t<stop){ev.push({t:+t.toFixed(3),kind:'spawn',type:pickW(W0.w,R()),x:+(.08+R()*.84).toFixed(4)});t+=W0.iv*ivm*(.7+R()*.6);}
      // 編隊（各ウェーブ2回ずつ。1回目は少し遅らせる）
      const forms=i===0?['vee','wall']:i===1?['zigpair','vee']:i===2?['wall','zigpair']:['vee','wall','zigpair'];
      forms.forEach((f,k)=>{const ft=W0.t+5+k*((end-W0.t-8)/forms.length)+R()*2;if(ft<stop)ev.push({t:+ft.toFixed(3),kind:'form',form:f,x:+(.25+R()*.5).toFixed(4),gap:(R()*4)|0});});
      if(i===3){for(let et=W0.t+3+R()*2;et<end-4;et+=opt.remix?7:9)ev.push({t:+et.toFixed(3),kind:'elite',x:+(.2+R()*.6).toFixed(4)});}
    }
    ev.push({t:MID_T,kind:'mid'});
    ev.push({t:BOSS_T,kind:'boss'});
    const ord={wave:0,mid:1,boss:2,form:3,elite:4,spawn:5};
    ev.sort((a,b)=>a.t-b.t||ord[a.kind]-ord[b.kind]);
    // 色（0＝怒り・1＝冷笑）。同じ色が 3 体（ときどき 6 体）続いてから変わる＝連鎖を狙える並び
    const tones=toneSeq(seed,ev.length);let k=0;
    for(const e of ev)if(e.kind==='spawn'||e.kind==='form'||e.kind==='elite')e.pol=tones[k++];
    return ev;
  }
  // 色の並び：3 体か 6 体ずつのまとまりで、まとまりの境目で 75% の確率で色が変わる（台本とは別の乱数）
  function toneSeq(seed,n){
    const R=rng((seed^0x5bd1e995)>>>0),out=[];let tone=R()<.5?0:1;
    while(out.length<n){const run=R()<.3?6:3;for(let i=0;i<run&&out.length<n;i++)out.push(tone);if(R()<.75)tone=1-tone;}
    return out;
  }
  // ── 二つの色（0＝怒り・赤／1＝冷笑・青） ──
  // 撃つ側と受ける側の色が違えば 2 倍効く（同じ色は 1 倍）。色の無いもの（-1）は 1 倍
  function dmgMul(atk,def){return (atk===0||atk===1)&&(def===0||def===1)&&atk!==def?2:1;}
  // 連鎖：同じ色を 3 体続けて倒すと 1 チェイン。組の途中で違う色を倒すとチェインは 0 に戻る
  function chainNew(){return {n:0,tone:-1,chain:0,max:0};}
  function chainBonus(c){return 100*Math.pow(2,Math.min(9,Math.max(1,c|0))-1);}
  function chainStep(st,tone){
    if(tone!==0&&tone!==1)return {done:false,bonus:0,broke:false};
    let broke=false;
    if(st.n===0||st.n>=3){st.n=1;st.tone=tone;}
    else if(st.tone===tone)st.n++;
    else{broke=st.chain>0||st.n>0;st.chain=0;st.n=1;st.tone=tone;}
    if(st.n===3){st.chain++;st.max=Math.max(st.max,st.chain);return {done:true,bonus:chainBonus(st.chain),broke};}
    return {done:false,bonus:0,broke};
  }
  // 吸収と反論：同じ色の言葉を吸うとゲージ＋（上限 120＝12 本）。ゲージ 10 ごとに追いかける反論を 1 本（最大 12 本）
  const GAUGE_MAX=120,GAUGE_PER=10,RELEASE_MAX=12;
  function absorbGauge(g,unit){return Math.max(0,Math.min(GAUGE_MAX,(g|0)+(unit|0)));}
  function releaseCount(g){return Math.max(0,Math.min(RELEASE_MAX,Math.floor((g|0)/GAUGE_PER)));}
  // ボスを早く倒したときの残り秒ボーナス（1 秒 1,000 点）
  function timeBonus(left,per){return Math.max(0,Math.floor(+left||0))*(per||1000);}
  // 色の切り替え：押してから 7 コマ（1 コマ 1/60 秒）で色が変わり、14 コマで回り終わる
  const SWITCH_FLIP=7/60,SWITCH_END=14/60;
  // ── 連続撃退：倒した数が段に届くたびに点。悪意を 1 つでも倒さずに逃がすと 0 に戻る ──
  const STREAK=[10,30,60,100,150,210,270,340,440,1000];
  const STREAK_PTS=[100,500,1000,2000,5000,10000,20000,40000,80000,160000];
  // prev→now に増えたときに越えた段の点の合計と、越えた段（無ければ -1）
  function streakBonus(prev,now){let pts=0,tier=-1;for(let i=0;i<STREAK.length;i++)if(prev<STREAK[i]&&now>=STREAK[i]){pts+=STREAK_PTS[i];tier=i;}return {pts,tier};}
  // ── 任務：毎夜 4 つ。クリアしたときだけ判定。難しさごとにメダルとして残る ──
  const MISSIONS=[
    {id:'kill70',name:'悪意を 70% 撃退'},
    {id:'kill100',name:'悪意を 100% 撃退'},
    {id:'goods',name:'応援をすべて受け止める'},
    {id:'nodmg',name:'こころを一度も削られない'},
  ];
  // st={reason,spawned,kills,goodsSpawned,caught,friendlyFire,hits}
  function missionCheck(st){
    const clear=st.reason==='clear',pct=st.spawned>0?Math.floor((st.kills|0)/st.spawned*100):0;
    return [clear&&pct>=70,clear&&pct>=100,clear&&(st.goodsSpawned|0)>0&&(st.caught|0)>=(st.goodsSpawned|0)&&!(st.friendlyFire|0),clear&&!(st.hits|0)];
  }
  function killPct(spawned,kills){return spawned>0?Math.min(100,Math.floor((kills|0)/spawned*100)):0;}
  // メダルの数（難しさ 3 × 任務 4 ＝ 最大 12）
  function medalCount(m){let n=0;for(const k in (m||{}))if(Array.isArray(m[k]))n+=m[k].filter(Boolean).length;return n;}
  // ── いいね：倒した悪意が落とす（難しいほど多い）。集めて夜をまたいで声を強化する ──
  const LIKE_DROP={small:0,basic:1,zig:1,split:1,armor:2,shooter:3,bot:3,elite:8,guard:3,mid:15,boss:30};
  const LIKE_MUL={easy:1,normal:1.5,hard:2};
  function likeDrop(type,diff){return Math.floor((LIKE_DROP[type]||0)*(LIKE_MUL[diff]||1));}
  // ── 声の強化（段 0〜5）：値は段 0 と段 5 の間を直線でつなぐ。値段は段ごとの表。段 4・5 はメダルで開く ──
  const UPG={
    rate:{name:'連射',      desc:'声の間隔',          v0:.12, v5:.085,unit:'秒',price:[30,60,100,160,240]},
    pow: {name:'声の強さ',  desc:'1 発で削る量',      v0:1,   v5:2,   unit:'',  price:[40,80,130,200,300]},
    heart:{name:'こころの数',desc:'こころの最大',      v0:0,   v5:5,   unit:'',  price:[50,100,160,240,350],int:true},
    mag: {name:'吸い寄せ',  desc:'いいねを引き寄せる距離',v0:40,v5:110,unit:'px',price:[20,40,70,110,160]},
    rel: {name:'反論の威力',desc:'追う声 1 本の威力', v0:3,   v5:6,   unit:'',  price:[40,80,130,200,300]},
  };
  const UPG_MAX=5;
  function upgValue(key,lv){const u=UPG[key];if(!u)return 0;const f=Math.max(0,Math.min(UPG_MAX,lv|0))/UPG_MAX,v=u.v0+(u.v5-u.v0)*f;return u.int?Math.floor(v+1e-9):v;}
  function upgPrice(key,lv){const u=UPG[key];return u&&lv>=0&&lv<UPG_MAX?u.price[lv]:Infinity;}   // lv→lv+1 の値段
  function upgMaxLv(medals){return 3+((medals|0)>=4?1:0)+((medals|0)>=8?1:0);}
  // ── ボスの取り巻き：段階ごとの組（数・体力）。取り巻きが残っている間、渦の芯には 1/4 しか効かない ──
  function guardsFor(phase){return phase>=3?{n:4,hp:10}:phase===2?{n:3,hp:8}:{n:2,hp:6};}
  const GUARD_SHIELD=.25;
  // 編隊の位置（画面幅 W・中央 x の割合）→ [{type,x,dy,vx}]
  function formation(form,cx,W,gap){
    const out=[];
    if(form==='vee'){for(let k=-2;k<=2;k++)out.push({type:'basic',x:cx*W+k*Math.min(56,W*.14),dy:-Math.abs(k)*26,vx:0});}
    else if(form==='wall'){const n=5;for(let k=0;k<n;k++){if(k===gap%n)continue;out.push({type:k%2?'armor':'basic',x:W*(k+.5)/n,dy:0,vx:0});}}
    else if(form==='zigpair'){out.push({type:'zig',x:cx*W-40,dy:0,vx:0});out.push({type:'zig',x:cx*W+40,dy:-30,vx:0});out.push({type:'zig',x:cx*W,dy:-60,vx:0});}
    for(const o of out)o.x=Math.max(30,Math.min(W-30,o.x));
    return out;
  }
  // ── 弾の形（どれも {x,y,vx,vy} の配列） ──
  function aimed(ox,oy,tx,ty,speed,n,spread){
    const a=Math.atan2(ty-oy,tx-ox),out=[];
    for(let i=0;i<n;i++){const aa=a+(i-(n-1)/2)*(spread||0);out.push({x:ox,y:oy,vx:Math.cos(aa)*speed,vy:Math.sin(aa)*speed});}
    return out;
  }
  function ring(ox,oy,n,speed,off,gapAt,gapW){
    const out=[];
    for(let i=0;i<n;i++){
      if(gapW>0){const d=((i-gapAt)%n+n)%n;if(d<gapW)continue;}
      const a=(i+(off||0))/n*TAU;out.push({x:ox,y:oy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed});
    }
    return out;
  }
  function spiral(ox,oy,t,arms,speed,rate,r0){
    const out=[];
    for(let k=0;k<arms;k++){const a=t*rate+k*TAU/arms;out.push({x:ox+Math.cos(a)*(r0||0),y:oy+Math.sin(a)*(r0||0),vx:Math.cos(a)*speed,vy:Math.sin(a)*speed});}
    return out;
  }
  // 縦レーザーの列（自機のいる列を必ず1本は避けられるよう、間隔を空ける）
  function laserCols(W,n,R,minGap){
    const xs=[],g=minGap||70;let guard=0;
    while(xs.length<n&&guard++<200){const x=30+R()*(W-60);if(xs.every(v=>Math.abs(v-x)>=g))xs.push(Math.round(x));}
    return xs.sort((a,b)=>a-b);
  }
  // ── 当たり判定 ──
  function circleHit(ax,ay,ar,bx,by,br){const dx=ax-bx,dy=ay-by,r=ar+br;return dx*dx+dy*dy<r*r;}
  function rectCircle(rx,ry,hw,hh,cx,cy,cr){const dx=Math.max(Math.abs(cx-rx)-hw,0),dy=Math.max(Math.abs(cy-ry)-hh,0);return dx*dx+dy*dy<cr*cr;}
  // かすり：当たらず、かすり半径の内側
  function graze(bx,by,br,px,py,coreR,grazeR){const dx=bx-px,dy=by-py,d2=dx*dx+dy*dy;return d2>=(br+coreR)*(br+coreR)&&d2<(br+grazeR)*(br+grazeR);}
  function laserHit(lx,halfW,px,coreR){return Math.abs(px-lx)<halfW+coreR;}
  // ── スコア ──
  const SCORE={basic:100,zig:150,armor:250,split:150,small:50,shooter:220,bot:260,elite:800,guard:300};
  function mult(combo){return 1+Math.min(3,Math.floor(Math.max(0,combo)/5)*.5);}
  function killScore(type,combo,quick){return Math.round((SCORE[type]||100)*mult(combo)*(quick?1.5:1));}
  function grazeScore(combo){return Math.round(20*mult(combo));}
  function grade(s){
    if(s.reason==='down')return 'C';
    if(s.bossBeaten)return (s.shield>=3&&s.friendlyFire<=1&&(s.maxCombo>=20||(s.maxChain|0)>=4))?'S':'A';
    return s.shield>=4?'A':'B';
  }
  // 報酬（以前の式のまま）。s={reason,kills,caught,shield,friendlyFire,bossBeaten}, flame＝今の炎上
  function rewardFx(s,flame){
    const clear=s.reason==='clear',down=s.reason==='down',kills=s.kills|0,bb=!!s.bossBeaten;
    const flameDown=clear?Math.min(5,2+Math.floor(kills/20))+(bb?1:0):Math.floor(kills/25);
    const fx={
      flame:-Math.min(flame,flameDown),
      mental:clear?2+Math.max(0,Math.min(5,s.shield))+(bb?1:0):down?-6:0,
      followers:clear?Math.min(10,Math.floor(kills/10))+Math.min(6,s.caught|0)+(bb?3:0):0,
      fatigue:down?8:6,
    };
    if(s.friendlyFire>=3)fx.followers=(fx.followers||0)-s.friendlyFire;
    if(clear&&bb)fx.hope=1;
    return {fx,sp:clear?1:0,time:40};
  }
  return {rng,DIFF,diffTable,WAVES,MID_T,BOSS_T,buildTimeline,toneSeq,dmgMul,chainNew,chainBonus,chainStep,GAUGE_MAX,GAUGE_PER,RELEASE_MAX,absorbGauge,releaseCount,timeBonus,SWITCH_FLIP,SWITCH_END,STREAK,STREAK_PTS,streakBonus,MISSIONS,missionCheck,killPct,medalCount,LIKE_DROP,LIKE_MUL,likeDrop,UPG,UPG_MAX,upgValue,upgPrice,upgMaxLv,guardsFor,GUARD_SHIELD,formation,aimed,ring,spiral,laserCols,circleHit,rectCircle,graze,laserHit,SCORE,mult,killScore,grazeScore,grade,rewardFx};
})();

registerMinigame({
  id:'shooter', icon:'🔥', name:'炎上コメント撃退', genre:'シューティング', bgm:'stream',
  desc:'降ってくる悪意のコメントを撃ち落とす。言葉は「怒り」と「冷笑」の二色。声の色を合わせれば同じ色の言葉を吸い込んで力にでき、違う色には2倍効く。応援コメントは撃たずに受け止めよう。中ボス「まとめ管理人」のあと、最後に「炎上の渦」が来る。',
  effect:'炎上↓ 精神↑ フォロワー↑ ／ 疲労+6 約40分',
  help:'ドラッグ／矢印で移動・自動射撃・Z／切替で声の色・V／反論で追う声・Shiftで精密・Bでモデ召喚・Pで一時停止',
  start(body,mg){
    const L=ShooterLogic;
    // ── 記録（遅延初期化。以前のセーブの形のまま、足りない項目だけ足す） ──
    if(!gs.shooterData||typeof gs.shooterData!=='object')gs.shooterData={};
    const SD=gs.shooterData;
    SD.plays=SD.plays||0;SD.clears=SD.clears||0;SD.bossKills=SD.bossKills||0;
    SD.best=SD.best||{score:0,grade:'',combo:0};
    // いいね（夜をまたいで貯まる）・声の強化の段・任務のメダル（難しさごと）。無い項目だけ足す
    SD.likes=Math.max(0,SD.likes|0);SD.likesTotal=Math.max(0,SD.likesTotal|0);
    if(!SD.upg||typeof SD.upg!=='object')SD.upg={};
    for(const k in L.UPG)SD.upg[k]=Math.max(0,Math.min(L.UPG_MAX,SD.upg[k]|0));
    if(!SD.medals||typeof SD.medals!=='object')SD.medals={};
    for(const k of ['easy','normal','hard'])if(!Array.isArray(SD.medals[k]))SD.medals[k]=[false,false,false,false];
    if(!SD.tips||typeof SD.tips!=='object')SD.tips={};
    const remix=SD.clears>=1;
    const phaseNo=(typeof getPhase==='function')?getPhase():1;

    // ── 難しさ（設定画面で選ぶ。むずかしい＝以前の調整）＋感情制御（スキル） ──
    const DIFF=mgDifficulty();
    const emoLv=mgSkill('emoCtrl',3);
    const DF=L.diffTable(DIFF,emoLv);
    addMinigameStyle('diffbadge','.mg-diffb{display:inline-block;margin-left:7px;padding:1px 5px;border:1px solid currentColor;border-radius:3px;font-size:.58rem;letter-spacing:0;vertical-align:1px;}.mg-diffb-easy{color:#44ee88;}.mg-diffb-normal{color:#e8b830;}.mg-diffb-hard{color:#ff6a86;}');
    {const tt=mg.el('mg-title');if(tt&&!tt.querySelector('.mg-diffb'))tt.insertAdjacentHTML('beforeend',`<span class="mg-diffb mg-diffb-${DIFF}">${MG_DIFF_NAMES[DIFF]}</span>`);}
    // 動きを減らす設定（OS）：画面の揺れ・フラッシュを弱める
    const RMO=(()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}})();

    // ── 定数 ──
    const HUD_H=56;
    // 声の強化の今の値（遊び始めるときに読み直す。強化の画面で買えるので）
    const UP={};
    function applyUpg(){for(const k in L.UPG)UP[k]=L.upgValue(k,SD.upg[k]);MAX_SHIELD=DF.shield+UP.heart;}
    let MAX_SHIELD=DF.shield;applyUpg();
    const BOSS_HP=Math.round((remix?400:360)*DF.bossHp), MID_HP=Math.round((remix?145:130)*DF.bossHp);
    const BOSS_LIMIT=60, MID_LIMIT=24;   // ボス・中ボスの持ち時間（過ぎると去る＝夜明けまで耐えた扱い）
    const SPD=(remix?1.12:1)*DF.spd, IVM=(remix?.88:1)*DF.iv;
    const SEED=((gs.day|0)*7919+(SD.plays|0)*104729+(DIFF==='hard'?3:DIFF==='normal'?2:1))>>>0;
    const TL=L.buildTimeline(SEED,{iv:DF.iv,remix});
    const R=L.rng(SEED^0x9e3779b9);
    const FONT='"DotGothic16", monospace';
    const C={pu:'#8a52d4',cy:'#00e8c8',rd:'#e83055',gd:'#e8b830',gn:'#44ee88',tx:'#bbaedd',txb:'#deccf8'};
    const WAVES=L.WAVES;
    const TXT={
      basic:['つまらん','辞めろ','誰得','オワコン','低評価','荒らし','は？','ブーメラン','声きもい'],
      zig:['w','草','乙w','ｗｗｗ','煽り','晒し','雑魚'],
      armor:['#炎上中','謝罪しろ','特定した','垢消せ','説明責任'],
      split:['拡散希望','切り抜くわ','まとめた','魚拓とった'],
      small:['草','w','RT','拡散','？'],
      shooter:['ソース出せ','論破','長文失礼','通報した'],
      bot:['BOT','宣伝','定型文','連投','コピペ'],
      elite:['100万人が見てる','インフルエンサー','引用で晒す'],
      guard:['拡散垢','引用RT','便乗','まとめ垢','切り抜き垢'],
      good:['がんばれ','好き','おつ','応援してる','ありがとう','声いいね','また来た','無理すんな','寝てね','救われた'],
    };
    // 日が進むと、言葉の種類も変わっていく
    if(phaseNo>=2){TXT.basic.push('借金配信者','父親失格');TXT.armor.push('職場どこ？');TXT.good.push('いつもの声','待ってた');}
    if(phaseNo>=3){TXT.basic.push('もう終わり','見苦しい');TXT.good.push('生きてて','味方だよ');}
    if(remix){TXT.shooter.push('前も燃えてた');TXT.split.push('再燃');}
    const EB_CH=['黙','消','叩','晒','嘘','炎'];
    const EB_CH_COLD=['草','笑','乙','痛','寒','謎'];   // 冷笑の弾の字
    const POW={
      spread:{ch:'拡',col:'#e8b830',label:'拡散ショット',dur:8},
      barrier:{ch:'護',col:'#00e8c8',label:'バリア',dur:12},
      slow:{ch:'緩',col:'#9b8cff',label:'スロー',dur:5},
      heal:{ch:'♥',col:'#ff7aa8',label:'心が回復',dur:0},
      laser:{ch:'貫',col:'#7fd8ff',label:'貫通ボイス',dur:7},
      bomb:{ch:'モ',col:'#44ee88',label:'モデレーター＋1',dur:0},
    };
    const GLOW_OF={spread:'gd',slow:'pu',heal:'pk',barrier:'cy',laser:'bl',bomb:'gn'};
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
    // 一発の音の部品。o:{t:波形,f:周波数,f2:終わりの周波数,fd:動く長さ,d:長さ,g:大きさ,a:立ち上がり,h:保持,dl:遅れ,j:音程の揺らぎ,ft/ff/q:フィルタ}
    //   大きさには効果音の音量（AUDIO_SET.se）を掛ける。0 なら actx() が null で鳴らない。
    function envG(p,t0,g,a,h,d){p.value=.0001;p.setValueAtTime(.0001,t0);p.linearRampToValueAtTime(Math.max(.0002,g),t0+a);if(h)p.setValueAtTime(Math.max(.0002,g),t0+a+h);p.exponentialRampToValueAtTime(.0001,t0+d);}
    function osc(o){
      const c=actx();if(!c)return false;
      try{const t0=c.currentTime+(o.dl||0),d=o.d,j=o.j?1+(Math.random()*2-1)*o.j:1,x=c.createOscillator(),g=c.createGain();
        x.type=o.t||'sine';x.frequency.setValueAtTime(o.f*j,t0);if(o.f2)x.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2*j),t0+(o.fd||d));
        envG(g.gain,t0,o.g*vol()*sfxLv,o.a||.003,o.h||0,d);
        let n=x;if(o.ft){const fl=c.createBiquadFilter();fl.type=o.ft;fl.frequency.value=o.ff;if(o.q)fl.Q.value=o.q;x.connect(fl);n=fl;}
        n.connect(g);g.connect(c.destination);x.start(t0);x.stop(t0+d+.03);}catch(_){}
      return true;
    }
    function nz(o){
      const c=actx();if(!c)return false;
      try{
        if(!noiseBuf){noiseBuf=c.createBuffer(1,c.sampleRate*.5,c.sampleRate);const dd=noiseBuf.getChannelData(0);for(let i=0;i<dd.length;i++)dd[i]=Math.random()*2-1;}
        const t0=c.currentTime+(o.dl||0),d=o.d,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();
        s.buffer=noiseBuf;s.loop=true;fl.type=o.ft||'bandpass';fl.frequency.setValueAtTime(o.f,t0);if(o.f2)fl.frequency.exponentialRampToValueAtTime(o.f2,t0+(o.fd||d));if(o.q)fl.Q.value=o.q;
        envG(g.gain,t0,o.g*vol()*sfxLv,o.a||.002,o.h||0,d);
        s.connect(fl);fl.connect(g);g.connect(c.destination);s.start(t0,Math.random()*.4);s.stop(t0+d+.03);}catch(_){}
      return true;
    }
    let shotN=0,sfxLv=1;
    // 音ごとの大きさの倍率（se=1 で測って揃えた。ショット・命中など頻繁な音 -38 前後、操作 -32〜-28、被弾・爆発・ボム -28〜-25 LUFS）
    const SFX_LV={shot:1.5,hit:3.6,clink:1.9,kill:1.2,catch:1.9,power:2.6,hurt:1.15,ff:1.7,bomb:.68,boom:.57,warn:1.4,wave:2.4,stamp:1.3,blip:4.5,
      decide:3.2,title:2.2,graze:3.4,charge:2,beam:.87,phase:2.4,convert:3.2,pause:3.3,
      switch:4.4,absorb:2.75,chain:3.8,release:2.2,ready:2.5,like:2.7,streak:3.5};
    // 効果音（シューターらしく：撃つ音は短い破裂＋低い芯で手応え、倒すと弾ける、被弾は歪んだ衝撃）
    const SFX={
      // 自動ショット（0.12 秒ごと）：ノイズの破裂＋音程が落ちる矩形波＋低い芯。1 発おきに少し弱く（タタッという刻み）。レーザー中は細い光線の音
      shot(){const k=(shotN++)%2?.6:1;
        if(laserT>0){osc({t:'sawtooth',f:2400,f2:1300,d:.06,g:.02*k,ft:'bandpass',ff:2200,q:3,j:.03});nz({ft:'highpass',f:5000,d:.03,g:.03*k});return;}
        nz({ft:'bandpass',f:3200,q:.9,d:.03,g:.11*k});osc({t:'square',f:900,f2:330,d:.055,g:.028*k,ft:'lowpass',ff:3200,j:.04});osc({f:190,f2:85,d:.05,g:.09*k});
        if(spreadT>0)osc({t:'triangle',f:1800,f2:1400,d:.04,g:.015*k,j:.05});},
      // 当たった（まだ倒れない）：コツッ
      hit(){nz({ft:'bandpass',f:4200,q:2,d:.03,g:.1});osc({t:'triangle',f:1300,f2:800,d:.035,g:.045,j:.08});},
      // 硬い敵・バリアで弾いた：キン（金属の倍音）
      clink(){osc({t:'square',f:2350,d:.09,g:.022,ft:'highpass',ff:1500,j:.03});osc({t:'sine',f:3170,d:.12,g:.05,j:.03});nz({ft:'highpass',f:6000,d:.03,g:.1});},
      // 倒した：パンッと弾けて落ちる。コンボが続くと少しずつ音程が上がる
      kill(){const up=1+Math.min(combo,12)*.025;
        nz({ft:'bandpass',f:2600*up,f2:500,q:.8,d:.14,g:.2});osc({t:'square',f:700*up,f2:170,d:.11,g:.04,ft:'lowpass',ff:2400,j:.04});osc({f:150,f2:55,d:.12,g:.18});},
      // アイテムを取った：明るい 3 音
      catch(){[1046,1319,1568].forEach((f,i)=>osc({t:'triangle',f,d:i===2?.16:.07,g:.09,dl:i*.05}));},
      // 被弾：歪んだ衝撃（ノイズ＋落ちるのこぎり波＋低音）
      hurt(){nz({ft:'lowpass',f:2600,f2:300,d:.35,g:.28});osc({t:'sawtooth',f:330,f2:60,d:.32,g:.08,ft:'lowpass',ff:1800});osc({f:120,f2:40,d:.3,g:.22});},
      // 誤射（応援コメントを撃った）：がっかりの下がる 2 音
      ff(){osc({t:'triangle',f:587,f2:550,d:.14,g:.11});osc({t:'triangle',f:440,f2:392,d:.28,g:.11,dl:.13});nz({ft:'lowpass',f:900,d:.12,g:.08});},
      // ボム：溜めて上がる→大きな破裂→残響のきらめき
      bomb(){osc({t:'sawtooth',f:200,f2:1400,d:.35,g:.035,ft:'lowpass',ff:3000});nz({ft:'lowpass',f:4000,f2:300,d:.9,g:.32,dl:.25});osc({f:90,f2:30,d:.7,g:.3,dl:.25});osc({t:'triangle',f:1568,d:.4,g:.05,dl:.45});},
      // 警告（ボス接近）：2 音のサイレン
      warn(){[0,.22,.44,.66].forEach((dl,i)=>osc({t:'square',f:i%2?349:466,d:.2,g:.05,h:.08,dl,ft:'lowpass',ff:1800}));},
      // ウェーブ開始：上がる 2 音＋スネア
      wave(){nz({ft:'bandpass',f:1800,q:.7,d:.1,g:.12});osc({t:'triangle',f:523,d:.1,g:.09});osc({t:'triangle',f:784,d:.2,g:.09,dl:.09});},
      // 大きな爆発（大物・ボス撃破・自機が落ちた）
      boom(){nz({ft:'lowpass',f:2400,f2:180,d:1,g:.4});osc({f:110,f2:32,d:.8,g:.32});nz({ft:'bandpass',f:5000,q:1,d:.15,g:.12});},
      // 評価のハンコ：どすん＋きらっ
      stamp(){nz({ft:'lowpass',f:700,d:.16,g:.3});osc({f:95,f2:45,d:.22,g:.3});osc({t:'triangle',f:1568,d:.3,g:.06,dl:.12});},
      // 台詞の文字送り
      blip(){osc({t:'square',f:1200,d:.032,g:.016,ft:'lowpass',ff:3000,j:.03});},
      decide(){osc({t:'triangle',f:880,f2:1320,d:.09,g:.1});},
      title(){[392,523,784].forEach((f,i)=>osc({t:'triangle',f,d:i===2?.32:.12,g:.09,dl:i*.12}));},
      // かすり：シュッ（高いノイズ）
      graze(){nz({ft:'highpass',f:5500,d:.035,g:.045});osc({f:2600,f2:2200,d:.03,g:.015});},
      // パワーアップの効果：上がるきらめき
      power(){[523,784,1046].forEach((f,i)=>osc({t:'square',f,f2:f*2,d:.14,g:.025,dl:i*.07,ft:'lowpass',ff:4000}));osc({t:'sine',f:2093,d:.3,g:.04,dl:.2});},
      // レーザーの予告：低くうなりながら上がる
      charge(){osc({t:'sawtooth',f:150,f2:700,d:.7,g:.04,a:.25,ft:'lowpass',ff:1800});osc({f:300,f2:1400,d:.7,g:.03,a:.3});},
      // レーザー発射：ビーッ（太い）
      beam(){nz({ft:'bandpass',f:3200,q:.8,d:.45,g:.12,a:.01,h:.2});osc({t:'sawtooth',f:140,f2:100,d:.45,g:.07,h:.2,ft:'lowpass',ff:1500});},
      // ボスの形態変化：沈む音＋衝撃＋上がる 2 音
      phase(){osc({t:'sawtooth',f:220,f2:80,d:.5,g:.07,ft:'lowpass',ff:1500});nz({ft:'lowpass',f:1600,f2:200,d:.6,g:.25});osc({t:'square',f:660,d:.12,g:.04,dl:.45,ft:'lowpass',ff:3000});osc({t:'square',f:880,d:.22,g:.04,dl:.58,ft:'lowpass',ff:3000});},
      // 敵の弾をスコアに変えた
      convert(){osc({t:'triangle',f:1320,f2:1760,d:.09,g:.07,j:.03});osc({t:'sine',f:2640,d:.08,g:.02,dl:.03});},
      pause(){osc({t:'triangle',f:660,f2:440,d:.09,g:.08});},
      // 声の色の切り替え：くるっと回る風切り＋行き先の色の音（怒り＝低め・冷笑＝高め）
      switch(){const up=vpol?.8:1.25;nz({ft:'bandpass',f:900,f2:3200,q:1.2,d:.16,g:.09});osc({t:'triangle',f:520*up,f2:780*up,d:.12,g:.06,dl:.05});},
      // 同じ色の言葉を吸った：小さく吸い込む「ふっ」（頻繁なのでごく控えめ。色で高さが違う）
      absorb(){const f=vpol?1700:1150;osc({t:'sine',f,f2:f*1.5,d:.05,g:.035,j:.06});nz({ft:'highpass',f:4500,d:.025,g:.02});},
      // 論破チェイン：上がる 3 音。チェインが進むほど高く
      chain(){const up=Math.pow(2,Math.min(8,chainS.chain-1)/12);[784,988,1175].forEach((f,i)=>osc({t:'square',f:f*up,d:i===2?.14:.06,g:.03,dl:i*.045,ft:'lowpass',ff:4200}));osc({t:'sine',f:2349*up,d:.2,g:.03,dl:.13});},
      // 反論：力を放つ。ためた空気が抜ける音＋上がるうなり＋本数ぶんの小さな粒
      release(){nz({ft:'bandpass',f:600,f2:4000,q:.9,d:.3,g:.14});osc({t:'sawtooth',f:180,f2:720,d:.28,g:.04,ft:'lowpass',ff:2600});osc({f:110,f2:60,d:.25,g:.16});},
      // いいねを拾った：小さな鈴（頻繁なのでごく控えめ。少しずつ高さが揺れる）
      like(){osc({t:'sine',f:1975,d:.06,g:.03,j:.05});osc({t:'sine',f:2637,d:.05,g:.012,dl:.03});},
      // 連続撃退の段：明るい上がり 4 音
      streak(){[659,880,1047,1319].forEach((f,i)=>osc({t:'triangle',f,d:i===3?.2:.07,g:.06,dl:i*.06}));nz({ft:'highpass',f:6000,d:.08,g:.03,dl:.18});},
      // 反論のゲージが満タン
      ready(){osc({t:'triangle',f:1319,d:.08,g:.06});osc({t:'triangle',f:1976,d:.18,g:.06,dl:.07});},
    };
    const SFX_FB={clink:'tool',kill:'comment',catch:'ach',hurt:'noise',ff:'back',bomb:'rank',warn:'warn',wave:'live',boom:'machine',stamp:'decide',decide:'decide',title:'decide',power:'ach'};
    // ── ボス戦だけ足す軽いリズム（音程のない打楽器なので本編BGMとぶつからない。音量はBGM設定） ──
    let beatT=0,beatN=0;
    function musicStep(dt,on,fast){
      if(!on){beatT=0;return;}
      const bv=typeof AUDIO_SET!=='undefined'?AUDIO_SET.bgm:1;if(bv<=0)return;
      beatT-=dt;if(beatT>0)return;
      beatT+=fast?.22:.28;beatN++;
      const c=actx();if(!c)return;
      const s=Math.min(1,bv)/Math.max(.01,vol());   // tone/noise は効果音の音量を掛けるので、BGMの音量に読み替える
      if(beatN%4===1||(fast&&beatN%4===3))tone(110,40,.18,'sine',.09*s);
      if(beatN%2===0)noise(.04,.025*s,7000);
    }
    let seCd=0;
    let grzCd=0;
    const seCds={};   // 連打される音の間引き（種類ごと）
    const SE_GAP={hit:.05,clink:.05,kill:.035,graze:.06,convert:.04,absorb:.045,chain:.08,like:.05};
    const sfx=k=>{
      if(typeof AUDIO_SET!=='undefined'&&AUDIO_SET.se<=0)return;
      const now=performance.now()/1000,gap=SE_GAP[k];if(gap){if((seCds[k]||0)>now)return;seCds[k]=now+gap;}
      if(k==='hit'&&(seCds.kill||0)>now+.01)return;   // 倒した音の直後のコツッは省く
      if(!actx()){if(SFX_FB[k])try{AU.se(SFX_FB[k]);}catch(_){}return;}
      sfxLv=SFX_LV[k]||1;try{SFX[k]();}catch(_){}sfxLv=1;
    };
    if(mg&&mg.exposeSfx)mg.exposeSfx(Object.keys(SFX),k=>sfx(k));

    // ── DOM ──
    const cv=document.createElement('canvas');cv.className='shooter-cv';body.appendChild(cv);
    const cx=cv.getContext('2d');
    const bombBtn=document.createElement('button');
    bombBtn.className='shooter-bomb hide';
    body.appendChild(bombBtn);
    const shopBtn=document.createElement('button');shopBtn.className='shooter-shopbtn hide';body.appendChild(shopBtn);
    const shopEl=document.createElement('div');shopEl.className='shooter-shop off';body.appendChild(shopEl);
    const swBtn=document.createElement('button');swBtn.className='shooter-sw hide';swBtn.setAttribute('aria-label','声の色を切り替える');body.appendChild(swBtn);
    const relBtn=document.createElement('button');relBtn.className='shooter-rel hide';relBtn.setAttribute('aria-label','反論を放つ');body.appendChild(relBtn);
    const pauseBtn=document.createElement('button');pauseBtn.className='shooter-pause hide';pauseBtn.textContent='❚❚';pauseBtn.setAttribute('aria-label','一時停止');
    body.appendChild(pauseBtn);
    const dlg=document.createElement('div');dlg.className='shooter-dlg off';
    dlg.innerHTML='<div class="shooter-face"></div><div class="shooter-dlg-main"><div class="shooter-name"></div><div class="shooter-text"></div></div><div class="shooter-next">▼</div>';
    body.appendChild(dlg);
    const dFace=dlg.querySelector('.shooter-face'),dName=dlg.querySelector('.shooter-name'),dText=dlg.querySelector('.shooter-text'),dNext=dlg.querySelector('.shooter-next');
    const skipBtn=document.createElement('button');skipBtn.className='shooter-skip off';skipBtn.textContent='SKIP ▶▶';body.appendChild(skipBtn);

    // ── 画面サイズ・事前描画 ──
    let W=0,H=0,dpr=1,vScale=1;   // vScale：背の低い画面（スマホ横持ち）では落ちる速さを落とす
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
      const nd=Math.min(2,window.devicePixelRatio||1);   // 3倍密度の端末でも2倍で描く（重さ対策）
      if(w===W&&h===H&&nd===dpr)return;
      const first=!W;
      W=w;H=h;dpr=nd;vScale=Math.max(.6,Math.min(1,(H-HUD_H)/560));
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      if(!glow.cy){
        glow.cy=makeGlow('rgba(0,232,200,.9)',40);glow.rd=makeGlow('rgba(232,48,85,.85)',40);
        glow.gd=makeGlow('rgba(232,184,48,.9)',40);glow.pk=makeGlow('rgba(255,122,168,.85)',40);
        glow.pu=makeGlow('rgba(155,140,255,.85)',40);glow.or=makeGlow('rgba(255,120,30,.9)',40);
        glow.wt=makeGlow('rgba(255,255,255,.9)',40);
        glow.bl=makeGlow('rgba(127,216,255,.9)',40);glow.gn=makeGlow('rgba(68,238,136,.85)',40);
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
    let enemies=[],goods=[],pb=[],eb=[],corpses=[],amb=[],lasers=[];
    // 弾は使い回す（毎フレームのごみを出さない）。pb＝自分の声、eb＝敵の言葉
    const pbFree=[],ebFree=[];
    const EB_MAX=420,PB_MAX=120;
    function addPB(x,y,vx,vy,kind){if(pb.length>=PB_MAX)return null;const b=pbFree.pop()||{};b.x=x;b.y=y;b.vx=vx;b.vy=vy;b.dead=false;b.gold=kind==='gold';b.pierce=kind==='laser';b.homing=kind==='homing';b.tgt=null;b.dmg=b.homing?UP.rel:UP.pow;b.tone=vpol;b.last=-1;b.age=0;pb.push(b);return b;}
    // style：'rd'＝狙い弾（大・漢字）'or'＝ボス弾（大・漢字）'pu'＝ばらまき（小粒）'gd'＝中ボス（小粒）。大きさと字は style、色は tn（0＝怒り・赤丸／1＝冷笑・青いひし形）
    function addEB(x,y,vx,vy,style,ch,tn){if(eb.length>=EB_MAX)return null;const b=ebFree.pop()||{};b.x=x;b.y=y;b.vx=vx;b.vy=vy;b.dead=false;b.style=style||'rd';b.ch=ch||'';b.tone=tn===1?1:0;b.r=(style==='pu'||style==='gd')?5:8;b.grazed=false;b.age=0;eb.push(b);return b;}
    // tn：色（数か、何番目かを受け取って色を返す関数）
    function addPattern(arr,style,ch,spdMul,tn){let i=0;for(const o of arr){const tt=typeof tn==='function'?tn(i):tn;i++;addEB(o.x,o.y,o.vx*(spdMul||1),o.vy*(spdMul||1),style,ch||(style==='rd'||style==='or'?pick(tt===1?EB_CH_COLD:EB_CH):''),tt);}}
    const parts=[];for(let i=0;i<420;i++)parts.push({x:0,y:0,vx:0,vy:0,life:0,max:1,sz:2,col:'#fff'});
    let pi=0;
    const pops=[];for(let i=0;i<28;i++)pops.push({x:0,y:0,t:0,text:'',col:'#fff',big:false});
    let popi=0;
    const rings=[];for(let i=0;i<20;i++)rings.push({x:0,y:0,t:0,max:1,r:40,col:'#fff'});
    let ri=0;
    let scene='title', sceneT=0;
    let t=0, st=0, tli=0, clock=0, shield=MAX_SHIELD, score=0, kills=0, caught=0, friendlyFire=0, grazes=0;
    let combo=0, comboT=0, maxCombo=0, fireCd=0, goodCd=2.2, waveIdx=-1, uid=0;
    let inv=0, shake=0, hurtFlash=0, whiteFlash=0, slowT=0, spreadT=0, barrierT=0, laserT=0, stop=0, muzzle=0;
    let bombs=DF.bombs, bombT=0, bombBuf=0, banner=null, dying=0, boss=null, mid=null, midDone=false, bossBeaten=false, winT=0;
    // 二つの色：vpol＝自分の声の色（0＝怒り・赤／1＝冷笑・青）。switchT＝切り替えの回転の残り。gauge＝吸った力（反論のもと）
    // 連続撃退・任務の数え・いいね
    let streak=0,maxStreak=0,spawned=0,goodsSpawned=0,hits=0,likesRun=0,missions=null,newMedals=0,medalLikes=0,streakPts=0;
    const likes=[];
    let vpol=0,switchT=0,switchFlip=false,gauge=0,absorbs=0,chainS=L.chainNew(),bossBonus=0,midBonus=0,remainBonus=0,absCd=0,chainShow=0;
    let tapBuf=false,finalReason=null, grade=null, newRecord=false, trans=null, endCalled=false, paused=false, focus=false;
    // 振動（設定の「振動」がオフ・非対応端末では何もしない。判定には使わない）
    const buzz=p=>{try{if(mg.buzz)mg.buzz(p);}catch(_){}};
    let lastScoreHtml='', lastTimer='', glowPulse=0, glowCol='cy', forcePow=null, firstGood=true, touchedOnce=false;
    let hint=null; const hintQ=[];
    // ── 声の強化（いいねで買う。夜をまたいで残る）。タイトル・遊び方・結果の画面で開ける ──
    let shopOpen=false,shopShown='';
    function updateShopBtn(){
      const show=!shopOpen&&(scene==='title'||scene==='howto'||(scene==='grade'&&sceneT>1.2))&&!trans;
      const k=(show?1:0)+'|'+SD.likes+'|'+scene;if(k===shopShown)return;shopShown=k;
      shopBtn.classList.toggle('hide',!show);shopBtn.classList.toggle('low',scene==='grade');shopBtn.textContent='声の強化　♥'+SD.likes;
    }
    function renderShop(){
      const md=L.medalCount(SD.medals),maxLv=L.upgMaxLv(md);
      let h=`<h3><span>声の強化</span><span>♥ ${SD.likes}</span></h3><div class="sub">倒した悪意が落とす いいね で強化する（夜をまたいで残る）。段 4・5 は任務のメダル（4 個・8 個）で開く。メダル ${md} / 12</div>`;
      for(const k in L.UPG){
        const u=L.UPG[k],lv=SD.upg[k],price=L.upgPrice(k,lv),cur=L.upgValue(k,lv),nxt=L.upgValue(k,lv+1);
        const fmt=v=>k==='rate'?v.toFixed(3)+'秒':k==='heart'?'＋'+v:k==='mag'?Math.round(v)+'px':(+v.toFixed(2))+'';
        let pips='';for(let i=0;i<L.UPG_MAX;i++)pips+=`<u class="${i<lv?'on':i>=maxLv?'lock':''}"></u>`;
        const atMax=lv>=L.UPG_MAX,locked=!atMax&&lv>=maxLv,canBuy=!atMax&&!locked&&SD.likes>=price;
        const btn=atMax?'最大':locked?`メダル${lv>=4?8:4}で開く`:`♥${price}`;
        h+=`<div class="row"><div class="nm">${u.name}<small>${u.desc}：${fmt(cur)}${atMax?'':' → '+fmt(nxt)}</small><div class="pips">${pips}</div></div><button class="buy" data-k="${k}" ${canBuy?'':'disabled'}>${btn}</button></div>`;
      }
      h+=`<button class="close">閉じる</button>`;
      shopEl.innerHTML=h;
    }
    function openShop(){if(shopOpen||trans)return;shopOpen=true;renderShop();shopEl.classList.remove('off');sfx('decide');updateShopBtn();}
    function closeShop(){if(!shopOpen)return;shopOpen=false;shopEl.classList.add('off');sfx('pause');if(scene==='howto')sceneT=Math.min(sceneT,HOWTO_SEC-4);updateShopBtn();}
    shopBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();openShop();});
    shopEl.addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      const b=e.target.closest('button');if(!b)return;
      if(b.classList.contains('close')){closeShop();return;}
      const k=b.dataset.k;if(!k||b.disabled)return;
      const lv=SD.upg[k],price=L.upgPrice(k,lv);
      if(lv>=L.upgMaxLv(L.medalCount(SD.medals))||SD.likes<price)return;
      SD.likes-=price;SD.upg[k]=lv+1;sfx('power');buzz(20);renderShop();
      try{if(typeof saveGame==='function')saveGame(true);}catch(_){}
    });
    // 切り替えボタン：いまの声の色と、押すと何色になるか
    let swShown=-1,relShown=-1;
    function updateSwBtn(){
      const k=vpol*2+(switchT>0?1:0);if(k===swShown)return;swShown=k;
      swBtn.classList.toggle('cold',vpol===1);swBtn.classList.toggle('spin',switchT>0);
      swBtn.innerHTML=`<b>${vpol?'◆ 冷笑':'● 怒り'}</b><small>切替 → ${vpol?'怒り':'冷笑'}（Z）</small>`;
    }
    // 反論ボタン：撃てる本数と、ゲージ（12 本ぶん）
    function updateRelBtn(){
      const n=L.releaseCount(gauge),k=gauge;if(k===relShown)return;relShown=k;
      relBtn.classList.toggle('ready',n>0);
      let segs='';for(let i=0;i<L.RELEASE_MAX;i++)segs+=`<u class="${i<n?'on':''}"></u>`;
      relBtn.innerHTML=`<b>反論 ×${n}</b><span style="font-family:var(--mono);font-size:.5rem;opacity:.7">（V）</span><i>${segs}</i>`;
    }
    function updateBombBtn(){
      bombBtn.innerHTML='<b>モデレーター召喚</b><i>'+'◆'.repeat(Math.max(0,bombs))+'◇'.repeat(Math.max(0,DF.bombs-bombs))+'</i><small>[B]／ここをタップ</small>';
      bombBtn.classList.toggle('used',bombs<=0);bombBtn.classList.toggle('ready',bombs>0);
    }
    updateBombBtn();
    // 一度だけの手ほどき（以前に見たものは出さない。SD.tips に記録）
    function tip(key,text){if(SD.tips[key])return;SD.tips[key]=1;hintQ.push(text);}

    resize();
    const onResize=()=>{if(!mg._ended)resize();};
    window.addEventListener('resize',onResize);
    if(typeof mg.onEnd==='function')mg.onEnd(()=>window.removeEventListener('resize',onResize));

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
      if(SD.clears>0)L.push(['dan','normal','……また荒れてるわね。\nでも前の夜も、ちゃんと越えられたじゃない。']);
      else L.push(['dan','normal','あの子は、やっと寝たわ。\n工場の夜勤まで、あと二時間ね。']);
      if(phaseNo>=3)L.push(['dan','tired','正直、もう心ががんこすり減っとるわ。\nそれでも――待ってくれてる人がいるのよ。']);
      else L.push(['dan','tired','切り抜きで、言葉が一人歩きしてるのよ。\n……でも、黙って待ってくれてる人もいるわ。']);
      L.push(['dan','normal','怒りの言葉と、冷めた笑いの言葉。\n同じ温度で受け止めれば、刺さらずに力になるのよ。']);
      L.push(['dan',remix?'win':'normal',remix?'今夜は前より荒れてるわね。気を引き締めていくわよ。\n――マイク、入れる。':'借金も、配信も、逃げたら終わりながやちゃ。\n――マイク、入れるわよ。']);
      return L;
    }
    function endingLines(){
      if(finalReason==='down')return [
        ['dan','tired','……ごめんなさいね。今夜はここで配信切るわ。'],
        ['dan','tired','画面を閉じたら、隣の部屋から\n子どもの寝息だけが聞こえた。'],
        ['dan','normal','明日も工場よ。……この音を守るために、\nまた立てばいいのよ。'],
      ];
      if(bossBeaten)return [
        ['dan','win','……渦が、消えた。\nコメント欄に「おつ」が並んでるわ。'],
        ['cm',null,'「今日も声聞けてよかった」\n「おやすみ、だんのうらさん」'],
        ['dan','happy','始業まであと三時間。\nあの子のお弁当、卵焼き入れてあげようかしら。'],
      ];
      return [
        ['dan','happy','全部は消せなかったわ。\nでも、朝まで声は折れなかったのよ。'],
        ['dan','normal','借金の明細は減らないわね。\nでも、味方の数はちゃんと増えてるのよ。'],
        ['dan','happy','……寝顔、見てから寝ようかしら。'],
      ];
    }

    // ── 入力 ──
    let drag=null;
    const keys={l:false,r:false,u:false,d:false};
    function tapAnywhere(){
      if(shopOpen)return true;
      if(scene==='title'){goStory();return true;}
      if(scene==='story'||scene==='ending'){advance();return true;}
      // 早すぎるタップは捨てずに覚えておく（入力バッファ）
      if(scene==='howto'){tapBuf=true;return true;}
      if(scene==='grade'){if(sceneT>1.4)goEnding();else if(sceneT>.9)tapBuf=true;return true;}
      if(scene==='play'&&paused){setPause(false);return true;}
      return false;
    }
    // 一時停止（ボタン・P／Esc・タブを離れたとき）。再開はタップかキー
    function setPause(on){
      if(scene!=='play'||finalReason||paused===on)return;
      paused=on;drag=null;keys.l=keys.r=keys.u=keys.d=false;focus=false;
      pauseBtn.textContent=on?'▶':'❚❚';sfx('pause');
    }
    const onVis=()=>{if(document.hidden)setPause(true);};
    const onBlur=()=>setPause(true);
    document.addEventListener('visibilitychange',onVis);window.addEventListener('blur',onBlur);
    if(typeof mg.onEnd==='function')mg.onEnd(()=>{document.removeEventListener('visibilitychange',onVis);window.removeEventListener('blur',onBlur);});
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
    bombBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(paused){setPause(false);return;}bombBuf=.35;});
    swBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(paused){setPause(false);return;}switchVoice();});
    relBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(paused){setPause(false);return;}release();});
    pauseBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();setPause(!paused);});
    mg.onKey(e=>{
      const k=e.key, dn=e.type==='keydown';
      const map={ArrowLeft:'l',a:'l',A:'l',ArrowRight:'r',d:'r',D:'r',ArrowUp:'u',w:'u',W:'u',ArrowDown:'d',s:'d',S:'d'};
      if(map[k]){e.preventDefault();if(paused)return;keys[map[k]]=dn;if(dn)touchedOnce=true;return;}
      if(k==='Shift'){focus=dn&&!paused;return;}
      if(!dn||e.repeat)return;
      if(shopOpen){if(k==='Escape'||k==='Enter'||k===' '){e.preventDefault();closeShop();}return;}
      if((k==='u'||k==='U')&&(scene==='title'||scene==='howto'||scene==='grade')){e.preventDefault();openShop();return;}
      if(scene==='play'&&(k==='p'||k==='P'||k==='Escape')){e.preventDefault();setPause(!paused);return;}
      if(scene==='play'&&paused){if(k==='Enter'||k===' '||k==='z'||k==='Z'){e.preventDefault();setPause(false);}return;}
      if(k==='Enter'||k===' '||k==='z'||k==='Z'){
        if(scene!=='play'){e.preventDefault();tapAnywhere();return;}
      }
      if(k==='Escape'&&scene==='story'){skipDialog();return;}
      if(scene==='play'&&(k==='z'||k==='Z'||k==='c'||k==='C')){e.preventDefault();switchVoice();return;}
      if(scene==='play'&&(k==='v'||k==='V')){e.preventDefault();release();return;}
      if(scene==='play'&&(k==='b'||k==='B'||k==='x'||k==='X'||k===' ')){e.preventDefault();bombBuf=.35;}
    });

    // ── 場面の流れ ──
    function goStory(){if(scene!=='title'||trans)return;sfx('decide');transition(()=>{scene='story';sceneT=0;startDialog(introLines(),goHowto);});}
    function goHowto(){transition(()=>{scene='howto';sceneT=0;tapBuf=false;});}
    function beginPlay(){
      if(scene!=='howto'||trans)return;sfx('decide');
      transition(()=>{applyUpg();shield=MAX_SHIELD;scene='play';sceneT=0;t=0;st=0;tli=0;bombBtn.classList.remove('hide');pauseBtn.classList.remove('hide');swBtn.classList.remove('hide');relBtn.classList.remove('hide');updateBombBtn();updateSwBtn();updateRelBtn();
        if(remix)showBanner('REMIX','第二夜：前より荒れている','#ff9a3c',1.6);},.5);
    }
    function computeGrade(){
      return L.grade({reason:finalReason,bossBeaten,shield,friendlyFire,maxCombo,maxChain:chainS.max});
    }
    function finishPlay(reason){
      if(finalReason)return;
      finalReason=reason;
      if(reason==='clear'){remainBonus=Math.max(0,shield)*2000;score+=remainBonus;}
      grade=computeGrade();
      bombBtn.classList.add('hide');pauseBtn.classList.add('hide');swBtn.classList.add('hide');relBtn.classList.add('hide');paused=false;
      if(reason==='clear')SD.clears++;
      if(grazes>(SD.best.graze||0))SD.best.graze=grazes;
      if(bossBeaten)SD.bossKills++;
      if(score>SD.best.score){SD.best.score=score;newRecord=true;}
      if(GRADE_RANK[grade]>GRADE_RANK[SD.best.grade||''])SD.best.grade=grade;
      if(maxCombo>SD.best.combo)SD.best.combo=maxCombo;
      if(chainS.max>(SD.best.chain||0))SD.best.chain=chainS.max;
      // 任務（クリアしたときだけ達成になる）。はじめて取ったメダルは 1 つにつき いいね ＋20
      missions=L.missionCheck({reason,spawned,kills,goodsSpawned,caught,friendlyFire,hits});
      const md=SD.medals[DIFF];newMedals=0;
      missions.forEach((ok,i)=>{if(ok&&!md[i]){md[i]=true;newMedals++;}});
      medalLikes=newMedals*20;
      SD.likes+=likesRun+medalLikes;SD.likesTotal+=likesRun+medalLikes;
      if(maxStreak>(SD.best.streak||0))SD.best.streak=maxStreak;
      transition(()=>{scene='grade';sceneT=0;tapBuf=false;stampDone=false;enemies.length=0;goods.length=0;likes.length=0;for(const b of eb)ebFree.push(b);for(const b of pb)pbFree.push(b);eb.length=0;pb.length=0;lasers.length=0;corpses.length=0;},.8);
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
    const mult=()=>L.mult(combo);

    // ── 生成 ──
    function measure(text,px){cx.font=`${px}px ${FONT}`;return cx.measureText(text).width;}
    function makeEnemy(type,x,y,pol){
      const e={tone:pol===0||pol===1?pol:(Math.random()<.5?0:1),type,good:false,dead:false,flash:0,hitT:0,age:0,face:(Math.random()*3)|0,small:type==='small',fireCd:rnd(.8,1.4),vx:0,vy:0,hp:1,maxHp:1,text:'',tw:0,w:0,h:0,x:0,y:0,bx:0,amp:0,ph:Math.random()*6,stay:0,blink:rnd(1,3)};
      e.text=pick(TXT[type]);
      e.tw=measure(e.text,e.small?11:13);
      e.w=e.small?e.tw+18:e.tw+40;e.h=e.small?20:(type==='armor'?30:26);
      e.x=x!==undefined?Math.max(e.w/2+6,Math.min(W-e.w/2-6,x)):rnd(e.w/2+6,W-e.w/2-6);e.y=y!==undefined?y:HUD_H-e.h;
      const wv=Math.max(0,waveIdx);
      if(type==='basic'){e.vy=(rnd(66,92)+wv*9)*SPD;}
      else if(type==='zig'){e.vy=(rnd(120,155)+wv*8)*SPD;e.amp=rnd(30,Math.min(70,W*.14));e.bx=Math.max(e.amp+e.w/2,Math.min(W-e.amp-e.w/2,e.x));}
      else if(type==='armor'){e.vy=rnd(42,54)*SPD;e.hp=e.maxHp=wv>=3||remix?4:3;}
      else if(type==='split'){e.vy=rnd(56,70)*SPD;e.hp=e.maxHp=2;}
      else if(type==='shooter'){e.vy=110;e.hp=e.maxHp=3;e.stay=HUD_H+H*rnd(.05,.2);e.bx=e.x;}
      else if(type==='small'){e.vy=rnd(85,110)*SPD;}
      if(type==='basic'||type==='zig'||type==='armor'||type==='split'||type==='small')e.vy*=vScale;
      else if(type==='bot'){e.vy=120;e.hp=e.maxHp=4;e.stay=HUD_H+H*rnd(.08,.24);e.bx=e.x;e.fireCd=rnd(.9,1.3);}
      else if(type==='elite'){e.vy=90;e.hp=e.maxHp=Math.round((remix?16:13)*(.75+.25*DF.bossHp));e.stay=HUD_H+H*rnd(.1,.18);e.bx=e.x;e.fireCd=1.4;e.shots=0;e.h=32;e.w+=14;}
      e.uid=++uid;
      return e;
    }
    const spawnEnemy=(type,x,y,pol)=>{const e=makeEnemy(type,x,y,pol);enemies.push(e);if(scene==='play')spawned++;return e;};
    function spawnGood(){
      let kind;
      const r=Math.random();
      if(forcePow){kind=forcePow;forcePow=null;}
      else if(shield<=2&&r<.45)kind='heal';
      else kind=r<.22?'spread':r<.4?'barrier':r<.52?'slow':r<.7?'laser':r<.82&&bombs<3?'bomb':'heal';
      const text=pick(TXT.good);
      const tw=measure(text,13),w=tw+42;
      const g={good:true,dead:false,hp:DF.goodHp,flash:0,warned:false,pow:kind,text,tw,w,h:28,x:rnd(w/2+8,W-w/2-8),y:HUD_H-14,vy:rnd(52,64)*vScale,age:0,hint:firstGood,shim:0};
      if(firstGood){g.x=Math.max(w/2+8,Math.min(W-w/2-8,player.x+(player.x<W/2?90:-90)));firstGood=false;}
      goods.push(g);goodsSpawned++;
    }
    function countType(tp){let n=0;for(const e of enemies)if(!e.dead&&e.type===tp)n++;return n;}
    function runEvent(ev){
      if(ev.kind==='wave'){
        waveIdx=ev.idx;
        if(ev.idx>0||!remix)showBanner(WAVES[ev.idx].name,WAVES[ev.idx].sub,'#deccf8');
        sfx('wave');
        if(ev.idx===0){tip('move',touchedOnce?'声（ショット）は自動。悪意の吹き出しを撃ち落とせ':'ドラッグ（矢印キー）で移動。声は自動で出る');
          tip('tone','赤い丸＝怒り、青いひし形＝冷笑。切替（Z／左下）で声の色を合わせると、同じ色の言葉は吸い込める');}
        if(ev.idx===2)tip('bot','スパムBOTは紫の小粒をばらまく。すき間を抜けよう');
      }else if(ev.kind==='spawn'){
        let tp=ev.type;
        if(tp==='shooter'&&countType('shooter')>=(remix?3:2))tp='basic';
        if(tp==='bot'&&countType('bot')>=(remix?2:1))tp='zig';
        spawnEnemy(tp,ev.x*W,undefined,ev.pol);
      }else if(ev.kind==='form'){
        for(const o of L.formation(ev.form,ev.x,W,ev.gap)){const e=spawnEnemy(o.type,o.x,HUD_H-26+o.dy,ev.pol);e.vx=o.vx;}
      }else if(ev.kind==='elite'){
        if(countType('elite')<1){spawnEnemy('elite',ev.x*W,undefined,ev.pol);showBanner('ELITE','インフルエンサーが引用した','#ffcc55',1.4);}
      }else if(ev.kind==='mid')startMid();
      else if(ev.kind==='boss')startBoss();
    }
    function startMid(){
      const w=Math.min(W*.66,250);
      mid={x:W/2,y:HUD_H-70,w,h:66,hp:MID_HP,max:MID_HP,t:0,fire:.8,pat:0,patT:-.9,flash:0,dead:false,dieT:0,leave:false,ang:0,tone:0};
      showBanner('CAUTION','まとめ管理人 が現れた','#ffcc55',2.2);
      sfx('warn');shake=Math.max(shake,5);goodCd=Math.max(goodCd,3);
    }
    function startBoss(){
      const R=Math.max(46,Math.min(78,W*.17));
      boss={x:W/2,y:HUD_H-R*1.6,R,hp:BOSS_HP,max:BOSS_HP,t:0,pat:0,patT:-.9,fire:0,ang:0,flash:0,dead:false,dieT:0,phase:1,inv:0,leave:false,rate:0,tone:0};
      forcePow='spread';goodCd=2.2;
      showBanner('WARNING','炎上の渦が近づいてくる','#e83055',2.4);
      sfx('warn');shake=Math.max(shake,6);
    }
    // 画面の敵弾を点に変える（ボム・フェーズ転換・中ボス撃破）
    function convertBullets(label){
      let n=0;
      for(const b of eb){if(b.dead)continue;b.dead=true;n++;const p=parts[pi];pi=(pi+1)%parts.length;p.x=b.x;p.y=b.y;p.vx=(player.x-b.x)*1.6;p.vy=(player.y-b.y)*1.6;p.max=p.life=.5;p.sz=3;p.col=b.style==='pu'?'#c9b8ff':'#bfffd8';}
      for(const lz of lasers)lz.dead=true;
      if(n){const pts=n*10;score+=pts;pop(player.x,player.y-60,(label||'変換')+' +'+pts,'#7fffb0');sfx('convert');}
      return n;
    }

    // 悪意を倒さずに逃がした（下へ落ちた・上へ去った）：連続撃退が 0 に戻る
    function escaped(e){
      if(scene!=='play'||finalReason)return;
      if(streak>=5){pop(Math.max(60,Math.min(W-60,e.x)),Math.max(HUD_H+30,Math.min(H-80,e.y)),'連続撃退 '+streak+' が途切れた','#8a7aa8');sfx('pause');}
      streak=0;
      if(!e.small)tip('streak','悪意を1つでも逃がすと「連続撃退」が0に戻る（下に落とす・上に去られる）');
    }
    // いいね：ふわっと散って落ち、自機の近く（吸い寄せの距離）に来ると引き寄せられる
    function dropLikes(x,y,n){
      for(let i=0;i<n&&likes.length<160;i++){const a=rnd(-2.6,-.5),v=rnd(40,110);likes.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,age:0,dead:false,pull:false});}
    }
    function stepLikes(dt){
      const mr=UP.mag,px=player.x,py=player.y-6;
      for(const l of likes){
        if(l.dead)continue;l.age+=dt;
        const dx=px-l.x,dy=py-l.y,d=Math.max(.001,Math.hypot(dx,dy));
        if(dying<=0&&(l.pull||d<mr)){l.pull=true;const sp=260+l.age*120;l.vx+=(dx/d*sp-l.vx)*Math.min(1,dt*9);l.vy+=(dy/d*sp-l.vy)*Math.min(1,dt*9);}
        else{l.vx*=Math.pow(.2,dt);l.vy+=(70-l.vy)*Math.min(1,dt*2);}
        l.x+=l.vx*dt;l.y+=l.vy*dt;
        if(d<18&&dying<=0){l.dead=true;likesRun++;score+=50;sfx('like');if(likesRun===1)tip('like','いいねを集めると、タイトルと結果の画面で「声の強化」ができる');continue;}
        if(l.y>H+20||l.age>9)l.dead=true;
      }
      compact(likes);
    }
    // 同じ色の言葉を吸った：ゲージ＋1（ボスの大きな弾は＋2）・点 20×単位。ゲージが 10 たまるごとに知らせる
    function absorbBullet(b,hx,hy){
      b.dead=true;
      const unit=b.style==='or'?2:1,before=L.releaseCount(gauge);
      gauge=L.absorbGauge(gauge,unit);absorbs++;score+=20*unit;
      const p=parts[pi];pi=(pi+1)%parts.length;p.x=b.x;p.y=b.y;p.vx=(hx-b.x)*6;p.vy=(hy-b.y)*6;p.max=p.life=.16;p.sz=3;p.col=b.tone?'#bff4ff':'#ffd0d8';
      if(absCd<=0){absCd=.05;glowCol=b.tone?'bl':'rd';glowPulse=Math.max(glowPulse,.18);}
      sfx('absorb');
      const after=L.releaseCount(gauge);
      if(after>before){updateRelBtn();if(after===1)tip('release','力がたまった！ 反論（V／左下のボタン）で、追いかける声を放てる');
        if(after===L.RELEASE_MAX){pop(hx,hy-40,'反論 MAX','#fff6c0');sfx('ready');}}
      tip('absorb','同じ色の言葉は当たらない。吸い込むと力（反論のゲージ）になる');
    }

    // ── ダメージ・取得 ──
    function loseShield(x,y,msg,kind){
      shield--;hits++;inv=DF.inv;shake=Math.max(shake,9);hurtFlash=.5;combo=0;stop=Math.max(stop,.09);player.hitT=.4;buzz(shield<=0?[90,50,180]:45);
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
    // echo：同じ色の声で倒した（2 倍でなく 1 倍で倒した）とき、言葉の欠片が 2 つ自分へ返ってくる（吸えば力。色を変えていれば危ない）
    function killEnemy(e,echo){
      e.dead=true;kills++;combo++;comboT=2.6;maxCombo=Math.max(maxCombo,combo);
      const m=mult(),quick=!e.small&&e.type!=='elite'&&e.y<HUD_H+(H-HUD_H)*.3,pts=L.killScore(e.type,combo,quick);
      score+=pts;
      const cols=e.type==='zig'?['#d04ce8','#f3c8ff','#fff']:e.type==='split'?['#ff8a2a','#ffd08a','#fff']:e.type==='armor'?['#9aa0b8','#e8b830','#fff']:e.type==='bot'?['#9b8cff','#d8d0ff','#fff']:e.type==='elite'?['#ffcc55','#fff6c0','#ff7a1e','#fff']:['#e83055','#ffb0be','#e8b830'];
      const big=e.type==='elite';
      burst(e.x,e.y,e.small?8:big?40:16,cols,e.small?140:big?320:200,big?.9:.55,e.small?2:big?4:3);
      ring(e.x,e.y,e.small?22:big?70:34,cols[0],big?.6:.35);
      if(!e.small)burst(e.x,e.y,6,['#ffffff'],380,.18,2);   // 火花
      pop(e.x,e.y-6,(quick?'速攻 ':'')+'+'+pts+(m>1?' ×'+m.toFixed(1):''),quick?'#7fffe8':m>=2?'#e8b830':'#ffe8b0',big);
      e.dieT=0;corpses.push(e);
      if(e.type==='armor'||e.type==='shooter'||e.type==='bot'){stop=Math.max(stop,.045);shake=Math.max(shake,3);}
      if(big){stop=Math.max(stop,.12);shake=Math.max(shake,8);forcePow='laser';goodCd=Math.min(goodCd,.4);for(const lz of lasers)if(lz.src===e.uid)lz.dead=true;sfx('boom');}
      if(echo&&!e.small&&dying<=0&&!finalReason&&e.y<player.y-60){addPattern(L.aimed(e.x,e.y,player.x,player.y-6,88,2,.42),'pu',null,1,e.tone);tip('echo','同じ色で倒すと、言葉の欠片が返ってくる。吸い込めば力になる');}
      if(e.type==='split'){spawnEnemy('small',e.x-10,e.y,e.tone).vx=-75;spawnEnemy('small',e.x+10,e.y,e.tone).vx=75;}
      sfx('kill');
      // 論破チェイン：同じ色を 3 体続けて倒すと 1 チェイン（100×2^(n−1)、9 以上は 25,600）
      const prevChain=chainS.chain,cr=L.chainStep(chainS,e.tone);
      if(cr.done){score+=cr.bonus;chainShow=1.6;
        pop(e.x,e.y-26,'論破チェイン '+chainS.chain+(chainS.chain>=9?' MAX':'')+'  +'+cr.bonus,chainS.chain>=5?'#fff6c0':e.tone?'#9fefff':'#ffb0b8',true);
        ring(e.x,e.y,46,e.tone?'#3fd8ff':'#ff4a5a',.5);sfx('chain');}
      else if(cr.broke&&prevChain>0){pop(e.x,e.y-26,'論破チェイン '+prevChain+' で切れた','#8a7aa8');sfx('pause');}
      // 連続撃退：段（10・30・60・100・150…）に届くたびに点
      streak++;maxStreak=Math.max(maxStreak,streak);
      const sb=L.streakBonus(streak-1,streak);
      if(sb.pts){score+=sb.pts;streakPts+=sb.pts;showBanner('連続撃退 '+streak,'+'+sb.pts.toLocaleString()+'　一つも逃がさずに','#7fffb0',1.5);sfx('streak');}
      // いいね（難しいほど多く落ちる）
      dropLikes(e.x,e.y,L.likeDrop(e.type,DIFF));
    }
    function catchGood(g){
      g.dead=true;caught++;
      const p=POW[g.pow];
      if(shield<MAX_SHIELD)shield++;
      if(g.pow==='spread')spreadT=p.dur;
      else if(g.pow==='barrier')barrierT=p.dur;
      else if(g.pow==='slow')slowT=p.dur;
      else if(g.pow==='laser')laserT=p.dur;
      else if(g.pow==='bomb'){bombs=Math.min(3,bombs+1);updateBombBtn();}
      score+=150;
      glowCol=GLOW_OF[g.pow]||'cy';glowPulse=.45;
      burst(g.x,g.y,18,[p.col,'#ffffff','#bff8ee'],160,.7,3);ring(player.x,player.y,50,p.col,.5);
      pop(player.x,player.y-46,p.label+'！',p.col,true);
      g.dieT=0;g.absorb=true;corpses.push(g);
      sfx('catch');sfx('power');
    }
    // 声の色を切り替える：押して 7 コマで色が変わり、14 コマで回り終わる。回っている間にもう一度押しても受け付けない
    function switchVoice(){
      if(scene!=='play'||dying>0||finalReason||switchT>0)return;
      switchT=L.SWITCH_END;switchFlip=false;sfx('switch');touchedOnce=true;
    }
    // 反論：ゲージ 10 ごとに、敵を追いかける声を 1 本（最大 12 本）。放ったあと 0.25 秒は撃てない
    function release(){
      if(scene!=='play'||dying>0||finalReason)return;
      const n=L.releaseCount(gauge);
      if(n<=0){pop(player.x,player.y-40,'力が足りない（同じ色の言葉を吸おう）','#8a7aa8');return;}
      gauge-=n*L.GAUGE_PER;updateRelBtn();
      for(let i=0;i<n;i++){
        const a=-Math.PI/2+(i-(n-1)/2)*(Math.PI*1.1/Math.max(1,n)),v=260;
        const b=addPB(player.x,player.y-14,Math.cos(a)*v,Math.sin(a)*v,'homing');
        if(b)b.age=-i*.025;
      }
      fireCd=Math.max(fireCd,15/60);
      glowCol=vpol?'bl':'rd';glowPulse=.5;ring(player.x,player.y,40,vpol?'#3fd8ff':'#ff4a5a',.45);
      pop(player.x,player.y-48,'反論 ×'+n,vpol?'#9fefff':'#ffb0b8',true);
      sfx('release');buzz(25);
    }
    // 追いかける先：いちばん近い敵（中ボス・ボスも含む）
    function homingTarget(x,y){
      let best=null,bd=1e9;
      for(const e of enemies){if(e.dead||e.y<HUD_H)continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<bd){bd=d;best=e;}}
      if(mid&&!midDone&&!mid.dead&&!mid.leave&&mid.t>1.2){const d=(mid.x-x)**2+(mid.y-y)**2;if(d<bd){bd=d;best=mid;}}
      if(boss&&!boss.dead&&!boss.leave&&boss.t>1.2){const d=(boss.x-x)**2+(boss.y-y)**2;if(d<bd){bd=d;best=boss;}}
      return best;
    }
    function bomb(){
      if(bombs<=0){pop(player.x,player.y-40,'モデレーターは手が離せない','#8a7aa8');return;}
      bombs--;updateBombBtn();
      bombT=1.4;whiteFlash=.6;shake=Math.max(shake,12);stop=.14;inv=Math.max(inv,1.2);buzz(60);
      for(const e of enemies){if(e.dead)continue;if(e.type==='elite'){e.hp-=8;e.flash=.2;if(e.hp<=0)killEnemy(e);}else killEnemy(e);}
      convertBullets('非表示');
      if(mid&&!mid.dead&&mid.t>1){mid.hp-=Math.round(MID_HP*.25);mid.flash=.3;score+=300;}
      if(boss&&!boss.dead&&boss.t>1&&boss.inv<=0){boss.hp-=Math.round(BOSS_HP*.1);boss.flash=.3;score+=500;}
      ring(player.x,player.y,Math.max(W,H),C.cy,1.1);
      showBanner('モデレーター召喚','不適切なコメントを非表示にしました','#00e8c8',2);
      sfx('bomb');
    }

    // 待機画面用に漂うコメント
    for(let i=0;i<6;i++){const e=makeEnemy(pick(['basic','zig','armor','split']),undefined,rnd(HUD_H,H*.6));e.vy=rnd(14,26);amb.push(e);}
    sfx('title');

    // ── 更新 ──
    function compact(a,free){let j=0;for(let i=0;i<a.length;i++){const o=a[i];if(!o.dead)a[j++]=o;else if(free)free.push(o);}a.length=j;}
    let resizeChk=0;
    const HOWTO_SEC=11;   // 遊び方の画面の自動開始（読む量が増えたので 7 → 11 秒）
    // 経過時間は core.js の MG.loop の dt（実時間・上限 0.05 秒・タブ復帰直後は 0）をそのまま使う。
    // 以前は MG.loop の dt が 0.05 秒に張り付く不具合があったため自前で測っていたが、core 側で直した
    mg.loop(dt=>{
      if(!(dt>0))dt=0;
      clock+=dt;seCd-=dt;grzCd-=dt;
      resizeChk-=dt;if(resizeChk<=0){resizeChk=.5;resize();}
      if(paused&&scene==='play'){draw();hud();return;}
      sceneT+=dt;
      if(trans){trans.t+=dt;if(!trans.done&&trans.t>=trans.dur/2){trans.done=true;trans.mid&&trans.mid();}if(trans&&trans.t>=trans.dur)trans=null;}
      for(const d of rain){d.y+=d.s*dt*(d.n?.7:1);d.x+=d.s*dt*.12;if(d.y>H){d.y=-d.l;d.x=Math.random()*W*1.1-W*.1;}}
      if(shake>0)shake=Math.max(0,shake-dt*30);
      if(whiteFlash>0)whiteFlash-=dt;
      if(shopOpen&&(scene==='title'||scene==='howto'||scene==='grade'))sceneT=Math.max(0,sceneT-dt);   // 強化の画面を開いている間は時間を止める
      updateShopBtn();
      if(scene==='title'&&sceneT>2.6&&!trans&&!shopOpen)goStory();
      if(scene==='story'||scene==='ending')updateDialog(dt);
      if(scene==='howto'&&(sceneT>HOWTO_SEC||(tapBuf&&sceneT>.35))&&!trans){tapBuf=false;beginPlay();}
      if(scene==='grade'&&tapBuf&&sceneT>1.4&&!trans){tapBuf=false;goEnding();}
      if(scene==='grade'&&!stampDone&&sceneT>.9){stampDone=true;sfx('stamp');shake=10;}
      musicStep(dt,scene==='play'&&!!boss&&!boss.dead&&!finalReason,!!boss&&boss.phase>=3);
      if(scene!=='play'){
        for(const e of amb){e.age+=dt;e.y+=e.vy*dt;if(e.y>H+30){e.y=HUD_H-20;e.x=rnd(e.w/2+6,W-e.w/2-6);}}
        stepFx(dt);
        player.x+=(W/2-player.x)*Math.min(1,dt*4);player.y+=(H-90-player.y)*Math.min(1,dt*4);
        emitThruster(dt);
        draw();hud();
        return;
      }
      playStep(dt);
      updateSwBtn();updateRelBtn();
      draw();hud();
    });
    function emitThruster(){
      const p=parts[pi];pi=(pi+1)%parts.length;
      p.x=player.x+rnd(-3,3);p.y=player.y+32;p.vx=rnd(-20,20)-player.vx*.1;p.vy=rnd(90,150);p.max=p.life=rnd(.25,.4);p.sz=rnd(2,3.5);p.col=Math.random()<.5?(vpol?'#3fd8ff':'#ff4a5a'):'#8a52d4';
    }
    function stepFx(dt){
      for(const p of parts){if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;}}
      for(const o of pops)if(o.t>0){o.t-=dt;o.y-=(o.big?26:38)*dt;}
      for(const o of rings)if(o.t>0)o.t-=dt;
      for(const c of corpses)c.dieT+=dt;
      let j=0;for(const c of corpses)if(c.dieT<.4)corpses[j++]=c;corpses.length=j;
      if(banner){banner.t+=dt;if(banner.t>banner.dur)banner=null;}
      if(hurtFlash>0)hurtFlash-=dt;if(glowPulse>0)glowPulse-=dt;if(bombT>0)bombT-=dt;if(muzzle>0)muzzle-=dt;
      if(hint){hint.t+=dt;if(hint.t>3.4)hint=null;}
      if(!hint&&hintQ.length&&scene==='play')hint={text:hintQ.shift(),t:0};
    }
    const CORE_R=3.5;
    function playStep(dt){
      if(bombBuf>0)bombBuf-=dt;
      // ヒットストップ中は時間を止める（演出だけ進める）
      if(stop>0){stop-=dt;stepFx(dt*.25);return;}
      const ts=slowT>0?.42:1, edt=dt*ts;
      const live=dying<=0&&winT<=0&&!finalReason;
      if(live)t+=dt;
      if(live&&bombBuf>0){bombBuf=0;bomb();}

      // 台本を進める（中ボスがいる間はステージの時計が止まる）
      const midActive=mid&&!midDone;
      if(live&&!midActive&&!boss){st+=dt;while(tli<TL.length&&TL[tli].t<=st){const ev=TL[tli++];runEvent(ev);if(ev.kind==='mid')break;}}

      // プレイヤー移動（なめらかに追従・Shift で精密）
      if(dying<=0){
        const ks=(focus?150:340)*dt;
        if(keys.l)player.tx-=ks;if(keys.r)player.tx+=ks;if(keys.u)player.ty-=ks;if(keys.d)player.ty+=ks;
        if(keys.l||keys.r||keys.u||keys.d)tip('focus','PC：Shift を押している間は精密移動（当たり判定が見える）');
        player.tx=Math.max(16,Math.min(W-16,player.tx));player.ty=Math.max(H*.42,Math.min(H-50,player.ty));
        const ox=player.x,k=Math.min(1,dt*(focus?24:18));
        player.x+=(player.tx-player.x)*k;player.y+=(player.ty-player.y)*k;
        player.vx=(player.x-ox)/Math.max(dt,.001);
      }else{player.y+=60*dt;player.vx=0;}
      player.tilt+=(Math.max(-.35,Math.min(.35,player.vx*.0016))-player.tilt)*Math.min(1,dt*10);
      if(player.recoil>0)player.recoil-=dt;if(player.hitT>0)player.hitT-=dt;

      if(switchT>0){switchT-=dt;
        if(!switchFlip&&switchT<=L.SWITCH_END-L.SWITCH_FLIP){switchFlip=true;vpol=1-vpol;ring(player.x,player.y-6,26,vpol?'#3fd8ff':'#ff4a5a',.3);
          tip('chain','同じ色を3体続けて倒すと「論破チェイン」。違う色をはさむと切れる');}
        if(switchT<0)switchT=0;}
      if(absCd>0)absCd-=dt;if(chainShow>0)chainShow-=dt;
      if(inv>0)inv-=dt;if(slowT>0)slowT-=dt;if(spreadT>0)spreadT-=dt;if(barrierT>0)barrierT-=dt;if(laserT>0)laserT-=dt;
      if(comboT>0){comboT-=dt;if(comboT<=0)combo=0;}
      stepFx(dt);
      if(dying<=0)emitThruster();

      if(live){
        fireCd-=dt;
        if(fireCd<=0){
          player.recoil=.05;muzzle=.06;
          const sx=player.x,sy=player.y-24;
          if(laserT>0){fireCd=.085;addPB(sx,sy,0,-900,'laser');}
          else{fireCd=UP.rate;addPB(sx,sy,0,-560);}
          if(spreadT>0){const a=focus?60:150;addPB(sx-6,sy+4,-a,-540,'gold');addPB(sx+6,sy+4,a,-540,'gold');}
          sfx('shot');
        }
        goodCd-=dt;
        if(boss&&!boss.dead){
          if(goodCd<=0){spawnGood();goodCd=rnd(3,4)*DF.good;}
          boss.spawnCd=(boss.spawnCd||1.5)-dt;
          if(boss.spawnCd<=0){spawnEnemy(Math.random()<.5?'zig':'basic');boss.spawnCd=rnd(2.2,3.2)*IVM;}
        }else if(midActive){
          if(goodCd<=0){spawnGood();goodCd=rnd(4.5,6)*DF.good;}
        }else if(!boss){
          if(goodCd<=0){spawnGood();goodCd=rnd(4,6)*DF.good;}
        }
      }

      for(const b of pb){
        b.age+=dt;
        if(b.homing){
          if(b.age<0)continue;   // 少しずつ時間をずらして放つ
          if(!b.tgt||b.tgt.dead||b.tgt.leave||(b.tgt===mid&&midDone))b.tgt=homingTarget(b.x,b.y);
          const sp=Math.min(880,260+b.age*1500);
          let a=Math.atan2(b.vy,b.vx);
          if(b.tgt){const want=Math.atan2(b.tgt.y-b.y,b.tgt.x-b.x);let d=want-a;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;a+=Math.max(-1,Math.min(1,d))*Math.min(1,dt*(6+b.age*14));}
          b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp;
          if(b.age>2.4)b.dead=true;
          if(Math.random()<.6){const p=parts[pi];pi=(pi+1)%parts.length;p.x=b.x;p.y=b.y;p.vx=-b.vx*.05;p.vy=-b.vy*.05;p.max=p.life=.25;p.sz=2.2;p.col=b.tone?'#9fefff':'#ffb0b8';}
        }
        b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<HUD_H-10||b.y>H+20||b.x<-20||b.x>W+20)b.dead=true;
      }

      // 敵
      const hx=player.x,hy=player.y-6;
      for(const e of enemies){
        if(e.dead)continue;
        e.age+=edt;if(e.flash>0)e.flash-=dt;if(e.hitT>0)e.hitT-=dt;
        if(e.type==='zig'){e.y+=e.vy*edt;e.x=e.bx+Math.sin(e.age*4.2+e.ph)*e.amp;}
        else if(e.type==='shooter'){
          if(e.age<7){e.y+=(e.stay-e.y)*Math.min(1,edt*2.2);e.x=e.bx+Math.sin(e.age*.9+e.ph)*Math.min(60,W*.15);
            e.fireCd-=edt;
            if(e.fireCd<=0&&live){e.fireCd=rnd(1.4,1.9)/(remix?1.15:1)*DF.fire;
              addPattern(L.aimed(e.x,e.y+e.h/2,hx,hy,120,1,0),'rd',null,1,e.tone);
              ring(e.x,e.y+e.h/2,16,C.rd,.25);
            }
          }else{e.y-=150*edt;if(e.y<HUD_H-40){e.dead=true;escaped(e);}}
        }else if(e.type==='bot'){
          if(e.age<7.5){e.y+=(e.stay-e.y)*Math.min(1,edt*2);e.x=e.bx+Math.sin(e.age*1.3+e.ph)*Math.min(90,W*.22);e.x=Math.max(e.w/2,Math.min(W-e.w/2,e.x));
            e.fireCd-=edt;
            if(e.fireCd<=0&&live&&e.age>.8){e.fireCd=1.7*DF.fire;
              const n=DF.density<.8?3:5;addPattern(L.aimed(e.x,e.y+e.h/2,hx,hy,105,n,.24),'pu',null,1,e.tone);
              ring(e.x,e.y+e.h/2,18,'#9b8cff',.25);
            }
          }else{e.y-=170*edt;if(e.y<HUD_H-40){e.dead=true;escaped(e);}}
        }else if(e.type==='guard'){
          if(!boss||boss.dead||boss.leave){e.dead=true;continue;}
          e.app=Math.min(1,(e.app||0)+edt*1.5);
          const a=boss.ang*.45+e.gi*6.283/e.gn,r=boss.R*(1.55+.25*Math.sin(boss.t*1.3+e.gi))*e.app;
          e.x=boss.x+Math.cos(a)*r;e.y=Math.max(HUD_H+e.h/2+2,boss.y+Math.sin(a)*r*.72);
          e.fireCd-=edt;
          if(e.fireCd<=0&&live&&e.app>=1){e.fireCd=rnd(1.6,2.2)*DF.fire;addPattern(L.aimed(e.x,e.y+e.h/2,hx,hy,125,1,0),'rd',null,1,e.tone);}
        }else if(e.type==='elite'){
          e.y+=(e.stay-e.y)*Math.min(1,edt*1.6);e.x=e.bx+Math.sin(e.age*.6+e.ph)*Math.min(70,W*.18);e.x=Math.max(e.w/2,Math.min(W-e.w/2,e.x));
          if(e.shots<3){
            e.fireCd-=edt;
            if(e.fireCd<=0&&live){e.fireCd=2.6*DF.fire;e.shots++;
              lasers.push({x:Math.round(hx),w:13,warn:DF.laserWarn+.2,max:DF.laserWarn+.2,on:0,dur:.6,y0:e.y+e.h/2,src:e.uid,dead:false});
              sfx('charge');tip('laser','細い線はレーザーの予告。線から離れて！');
              if(DF.density>=.85)addPattern(L.aimed(e.x,e.y+e.h/2,hx,hy,130,3,.3),'rd',null,1,e.tone);
            }
          }else if(e.fireCd<-1.2){e.y-=120*edt;e.stay=-200;if(e.y<HUD_H-50){e.dead=true;escaped(e);}}
          else e.fireCd-=edt;
        }else{e.y+=e.vy*edt;e.x+=e.vx*edt;if(e.x<e.w/2||e.x>W-e.w/2){e.vx*=-1;e.x=Math.max(e.w/2,Math.min(W-e.w/2,e.x));}}
        const hw=e.w/2,hh=e.h/2;
        for(const b of pb){
          if(b.dead||b.last===e.uid||b.age<0)continue;
          if(b.x>e.x-hw-3&&b.x<e.x+hw+3&&b.y>e.y-hh-2&&b.y<e.y+hh+8){
            if(b.pierce)b.last=e.uid;else b.dead=true;
            const dmul=L.dmgMul(b.tone,e.tone);
            e.hp-=b.dmg*dmul;e.flash=.07;e.hitT=.16;
            burst(b.x,b.y,dmul>1?5:3,['#fff',b.tone?'#3fd8ff':'#ff4a5a'],dmul>1?140:90,.25,2);
            if(e.hp<=0){killEnemy(e,dmul===1&&!b.homing);break;}
            else{score+=10;sfx(e.type==='armor'||e.type==='elite'?'clink':'hit');}
          }
        }
        if(e.dead)continue;
        // 当たり判定は見た目より小さめ（やさしめ）
        if(e.type!=='elite'&&e.type!=='guard'&&Math.abs(e.x-hx)<hw*DF.hb+5&&Math.abs(e.y-hy)<hh*(DF.hb-.1)+9){e.dead=true;burst(e.x,e.y,12,['#e83055','#ffd0d8'],160,.5,3);hurt(hx,hy,'「'+e.text+'」');continue;}
        if(e.y-hh>H){e.dead=true;combo=0;escaped(e);if(!e.small)hurt(e.x,H-30,'「'+e.text+'」が刺さった');}
      }
      compact(enemies);

      // 応援コメント
      for(const g of goods){
        if(g.dead)continue;
        g.age+=dt;g.y+=g.vy*dt;if(g.flash>0)g.flash-=dt;if(g.shim>0)g.shim-=dt;
        const gx=g.x+Math.sin(g.age*2)*6;
        for(const b of pb){
          if(b.dead||b.homing)continue;   // 反論は敵だけを追う（応援には当たらない）
          if(Math.abs(b.x-gx)<g.w/2&&Math.abs(b.y-g.y)<g.h/2+4){
            // やさしい：声は応援をすり抜ける（光るだけ）
            if(DF.ffPass){g.shim=.15;continue;}
            b.dead=true;g.hp--;g.flash=.12;
            if(g.hp>0){if(!g.warned){g.warned=true;pop(gx,g.y-18,'撃たないで！','#ff9ec0');sfx('hit');}break;}
            g.dead=true;friendlyFire++;
            burst(gx,g.y,14,['#ff7aa8','#bff8ee','#fff'],150,.6,3);
            g.x=gx;g.dieT=0;g.absorb=false;corpses.push(g);
            if(live&&inv<=0&&DF.ffShield)loseShield(gx,g.y+10,'誤射… 応援を消した','ff');
            else{pop(gx,g.y-14,'誤射…','#ff7aa8');combo=0;}
            break;
          }
        }
        if(g.dead)continue;
        // 受け止め判定は広め
        if(Math.abs(gx-player.x)<g.w/2+16&&Math.abs(g.y-player.y)<g.h/2+28&&dying<=0){g.x=gx;catchGood(g);continue;}
        if(g.y>H+30)g.dead=true;
      }
      compact(goods);

      stepLikes(dt);
      // 敵弾（当たり・かすり）
      const ebs=DF.eb,coreR=focus?CORE_R-.5:CORE_R;
      for(const b of eb){
        if(b.dead)continue;
        b.age+=edt;b.x+=b.vx*edt*ebs;b.y+=b.vy*edt*ebs;
        if(b.y>H+20||b.y<HUD_H-40||b.x<-20||b.x>W+20){b.dead=true;continue;}
        if(!live)continue;
        const br=b.r*.75;
        // 同じ色の言葉は当たらない。声のそば（absR）まで来たら吸い込んで力に変える
        if(b.tone===vpol){
          if(dying<=0&&L.circleHit(b.x,b.y,br,hx,hy,DF.absR))absorbBullet(b,hx,hy);
          continue;
        }
        if(L.circleHit(b.x,b.y,barrierT>0?br+20:br,hx,hy,coreR)){b.dead=true;hurt(b.x,b.y,b.ch?'「'+b.ch+'」':'被弾');continue;}
        if(!b.grazed&&inv<=0&&L.graze(b.x,b.y,br,hx,hy,coreR,DF.grazeR)){
          b.grazed=true;grazes++;const gp=L.grazeScore(combo);score+=gp;if(combo>0)comboT=Math.max(comboT,1.4);
          burst((b.x+hx)/2,(b.y+hy)/2,3,['#ffffff','#bff8ee'],160,.2,2);sfx('graze');
          if(grazes%10===0)pop(hx,hy-30,'かすり ×'+grazes,'#bff8ee');
          tip('graze','弾のそばをかすめるとボーナス（かすり）');
        }
      }
      compact(eb,ebFree);
      if(live&&eb.length>40&&bombs>0)tip('bomb','弾が多い！モデレーター召喚（B／右下のボタン）で一掃');

      // レーザー
      for(const lz of lasers){
        if(lz.dead)continue;
        if(lz.warn>0){lz.warn-=edt;if(lz.warn<=0){lz.on=lz.dur;sfx('beam');shake=Math.max(shake,4);}continue;}
        lz.on-=edt;if(lz.on<=0){lz.dead=true;continue;}
        if(live&&hy>lz.y0&&L.laserHit(lz.x,lz.w*(barrierT>0?1.4:1),hx,coreR))hurt(hx,hy,'レーザーに焼かれた');
      }
      compact(lasers);

      if(mid&&!midDone)midStep(dt,edt,hx,hy,live);
      if(boss)bossStep(dt,edt,hx,hy,live);
      compact(pb,pbFree);

      if(dying>0){dying-=dt;if(dying<=0)finishPlay('down');}
      if(winT>0){winT-=dt;if(winT<=0)finishPlay('clear');}
    }
    // 中ボス「まとめ管理人」：狙い3way と 金の回転弾を交互に
    function midStep(dt,edt,hx,hy,live){
      const m=mid;
      m.t+=edt;if(m.flash>0)m.flash-=dt;
      if(m.dead){m.dieT+=dt;if(Math.random()<dt*12)burst(m.x+rnd(-m.w/2,m.w/2),m.y+rnd(-m.h/2,m.h/2),10,['#ffcc55','#fff','#ff7a1e'],200,.6,3);if(m.dieT>1.4)midDone=true;return;}
      if(m.leave){m.y-=140*dt;if(m.y<HUD_H-m.h){midDone=true;}return;}
      const ty=HUD_H+Math.max(70,H*.16);
      m.y+=(ty-m.y)*Math.min(1,dt*1.5);
      m.x=W/2+Math.sin(m.t*.7)*(W/2-m.w/2-10);
      m.ang+=edt*2;
      if(m.t>1.6&&live){
        m.patT+=edt;if(m.patT>4){m.patT=-.8;m.pat=(m.pat+1)%2;m.tone=m.pat;}   // 攻撃が変わると色も変わる（狙い撃ち＝怒り・回転弾＝冷笑）
        m.fire-=edt;
        if(m.patT>=0&&m.fire<=0){
          if(m.pat===0){m.fire=1.05*DF.fire;addPattern(L.aimed(m.x,m.y+m.h/2,hx,hy,140,DF.density<.8?3:5,.22),'rd',null,1,m.tone);ring(m.x,m.y+m.h/2,22,'#ffcc55',.3);}
          else{m.fire=.16*DF.fire;addPattern(L.spiral(m.x,m.y,m.t,DF.density<.8?2:3,95,2.1,10),'gd',null,1,m.tone);}
        }
      }
      for(const b of pb){
        if(b.dead||b.last===-2||b.age<0)continue;
        if(Math.abs(b.x-m.x)<m.w/2&&Math.abs(b.y-m.y)<m.h/2){
          if(b.pierce)b.last=-2;else b.dead=true;
          if(m.t>1.2){m.hp-=b.dmg*L.dmgMul(b.tone,m.tone);m.flash=.06;score+=10;burst(b.x,b.y,3,['#ffcc55','#fff'],120,.3,2);sfx('hit');}
        }
      }
      if(live&&L.rectCircle(m.x,m.y,m.w/2*.8,m.h/2*.7,hx,hy,CORE_R))hurt(hx,hy,'まとめに載せられた');
      if(m.hp<=0){
        m.dead=true;m.hp=0;m.dieT=0;score+=2500;dropLikes(m.x,m.y,L.likeDrop('mid',DIFF));midBonus=L.timeBonus(MID_LIMIT-m.t,500);score+=midBonus;if(midBonus)pop(m.x,m.y+30,'早く倒した +'+midBonus,'#fff6c0');stop=.22;shake=Math.max(shake,12);whiteFlash=.35;buzz([50,40,70]);
        convertBullets('記事削除');kills++;
        showBanner('記事削除','まとめ管理人を撃退した','#ffcc55',1.8);
        burst(m.x,m.y,50,['#ffcc55','#fff6c0','#ff7a1e','#fff'],320,.9,4);ring(m.x,m.y,90,'#ffcc55',.7);
        pop(m.x,m.y,'+2500','#ffcc55',true);forcePow=bombs<3?'bomb':'laser';goodCd=.6;sfx('boom');
      }else if(m.t>MID_LIMIT){
        m.leave=true;showBanner('まとめ管理人','飽きて去っていった','#bbaedd',1.6);
      }
    }
    // 渦の取り巻き（拡散アカウント）：段階ごとの組。渦のまわりを回り、狙って撃つ。残っている間、渦の芯には 1/4 しか効かない
    function spawnGuards(ph){
      const g=L.guardsFor(ph),hp=Math.max(2,Math.round(g.hp*(remix?1.2:1)*(.75+.25*DF.bossHp)));
      for(let i=0;i<g.n;i++){
        const e=spawnEnemy('guard',boss.x,boss.y,(i+ph)%2);
        e.gi=i;e.gn=g.n;e.hp=e.maxHp=hp;e.fireCd=rnd(1,2)+i*.3;e.vy=0;e.app=0;
      }
      boss.guardsUp=true;
      showBanner('取り巻き','拡散アカウントが渦を守っている','#ff8a2a',1.5);
      tip('guard','渦のまわりの取り巻きを全部倒すと、渦の芯に声がよく効く');
    }
    // ボス「炎上の渦」：体力で3段階。各段階の攻撃を予告つきで順番に
    const BOSS_PATS={1:['spiral','aimed'],2:['ring','lasers','aimed'],3:['spiral3','rain','lasers','ring']};
    const PAT_NAME={spiral:'渦巻き',aimed:'狙い撃ち',ring:'包囲網',lasers:'晒しレーザー',spiral3:'大炎上',rain:'言葉の雨'};
    function bossStep(dt,edt,hx,hy,live){
      const bs=boss;
      bs.t+=edt;if(bs.flash>0)bs.flash-=dt;if(bs.inv>0)bs.inv-=dt;
      if(!bs.dead&&!bs.leave){
        const ty=Math.max(bs.R+HUD_H+30,H*.24);
        bs.y+=(ty-bs.y)*Math.min(1,dt*1.2);
        bs.x=W/2+Math.sin(bs.t*.55)*(W/2-bs.R-14);
        bs.ang+=edt*(bs.phase>=3?3.6:bs.phase===2?2.8:2.2);
        // 段階の切り替え
        const f=bs.hp/bs.max,ph=f>.66?1:f>.33?2:3;
        if(ph>bs.phase){
          bs.phase=ph;bs.inv=1.4;bs.pat=0;bs.patT=-1.3;bs.fire=.3;bs.tone=ph===2?1:0;   // 段階 1＝怒り・2＝冷笑・3＝攻撃ごとに入れ替わる
          convertBullets('鎮火');
          showBanner('PHASE '+ph,ph===2?'渦が晒しを始めた':'渦が暴れ出した','#ff7a1e',1.6);
          stop=Math.max(stop,.15);shake=Math.max(shake,10);whiteFlash=.25;sfx('phase');
          ring(bs.x,bs.y,bs.R*2.2,'#ff7a1e',.7);
          for(const e of enemies)if(e.type==='guard'&&!e.dead){e.dead=true;e.dieT=0;corpses.push(e);}
          spawnGuards(ph);
        }
        if(!bs.g1&&bs.t>1.6){bs.g1=true;spawnGuards(1);}
        const gAlive=countType('guard');
        if(bs.guardsUp&&gAlive===0){bs.guardsUp=false;const gb=1000*bs.phase;score+=gb;showBanner('取り巻き撃破','渦の芯がむき出しになった　+'+gb,'#ffcc55',1.5);ring(bs.x,bs.y,bs.R*1.8,'#ffcc55',.6);sfx('convert');}
        bs.gAlive=gAlive;
        const pats=BOSS_PATS[bs.phase];
        const remixPats=remix&&bs.phase===1?pats.concat(['rain']):pats;
        if(bs.t>2&&live){
          bs.patT+=edt;if(bs.patT>3.6){bs.patT=-.9;bs.pat=(bs.pat+1)%remixPats.length;if(bs.phase>=3)bs.tone=1-bs.tone;}
          bs.fire-=edt;
          const P=remixPats[bs.pat];
          if(bs.patT>=0&&bs.fire<=0){
            const den=DF.density,F=DF.fire*(remix?.9:1);
            const T0=bs.tone,T1=1-bs.tone;
            if(P==='spiral'){bs.fire=.19*F;addPattern(L.spiral(bs.x,bs.y,bs.t,2,105,2.4,bs.R*.6),'or',T0?'冷':'炎',1,T0);}
            else if(P==='spiral3'){bs.fire=.17*F;addPattern(L.spiral(bs.x,bs.y,bs.t,den<.8?2:3,120,-2.9,bs.R*.6),'or','',1,i=>i%2?T1:T0);if(Math.random()<.18)addPattern(L.aimed(bs.x,bs.y+bs.R*.5,hx,hy,160,1,0),'rd',null,1,T0);}
            else if(P==='aimed'){bs.fire=.85*F;addPattern(L.aimed(bs.x,bs.y+bs.R*.5,hx,hy,150,den<.8?3:5,.2),'rd',null,1,T0);ring(bs.x,bs.y+bs.R*.5,26,'#ff7a1e',.3);}
            else if(P==='ring'){bs.fire=1.3*F;const n=Math.round(14+6*den);addPattern(L.ring(bs.x,bs.y,n,100,Math.random(),(Math.random()*n)|0,2+(den<.8?1:0)),'or','',1,i=>(i>>1)&1?T1:T0);if(bs.phase>=2)addPattern(L.ring(bs.x,bs.y,8,70,Math.random(),0,0),'pu',null,1,T1);}
            else if(P==='rain'){bs.fire=.28*F/(den<.8?.8:1);const rt=Math.random()<.5?0:1;addEB(rnd(20,W-20),HUD_H,0,130,'rd',pick(rt?EB_CH_COLD:EB_CH),rt);}
            else if(P==='lasers'){
              bs.fire=1.8*F;
              const n=bs.phase>=3?3:2;
              for(const x of L.laserCols(W,n,Math.random,Math.max(80,W*.22)))lasers.push({x,w:14,warn:DF.laserWarn,max:DF.laserWarn,on:0,dur:.6,y0:bs.y,src:'boss',dead:false});
              sfx('charge');tip('laser','細い線はレーザーの予告。線から離れて！');
            }
          }
        }
        for(const b of pb){
          if(b.dead||b.last===-3||b.age<0)continue;
          const dx=b.x-bs.x,dy=b.y-bs.y;
          if(dx*dx+dy*dy<bs.R*bs.R){if(b.pierce)b.last=-3;else b.dead=true;
            if(bs.t>1.2&&bs.inv<=0){bs.hp-=b.dmg*L.dmgMul(b.tone,bs.tone)*(bs.gAlive>0?L.GUARD_SHIELD:1);bs.flash=.06;score+=10;burst(b.x,b.y,3,['#ffcc55','#fff'],120,.3,2);sfx('hit');}
            else if(bs.inv>0)burst(b.x,b.y,2,['#8a7aa8'],80,.2,2);}
        }
        if(live){const dx=hx-bs.x,dy=hy-bs.y;if(dx*dx+dy*dy<(bs.R*.75)*(bs.R*.75))hurt(hx,hy,'渦に呑まれた');}
        if(bs.hp<=0){
          bs.dead=true;bs.hp=0;bossBeaten=true;winT=2.6;score+=3000;stop=.35;dropLikes(bs.x,bs.y,L.likeDrop('boss',DIFF));
          bossBonus=L.timeBonus(BOSS_LIMIT-bs.t,1000);score+=bossBonus;if(bossBonus)pop(bs.x,bs.y+bs.R,'早く鎮火 +'+bossBonus,'#fff6c0',true);
          for(const b of eb)b.dead=true;for(const lz of lasers)lz.dead=true;
          for(const e of enemies)if(!e.dead){e.dead=true;e.dieT=0;corpses.push(e);burst(e.x,e.y,10,['#ffcc55','#fff'],150,.5,3);}
          showBanner('鎮火','炎上の渦が消えていく','#e8b830',2.4);
          whiteFlash=.6;shake=16;sfx('boom');buzz([80,50,80,50,160]);
        }else if(bs.t>BOSS_LIMIT&&live){
          // 時間切れ：渦は遠ざかる（夜明けまで耐えた＝クリア。撃破ではない）
          bs.leave=true;winT=2.4;for(const e of enemies)if(e.type==='guard')e.dead=true;convertBullets('夜明け');for(const lz of lasers)lz.dead=true;
          showBanner('夜明け','渦は遠ざかっていった','#bbaedd',2.2);
        }
      }else if(bs.leave){
        bs.y-=90*dt;bs.dieT+=dt*.5;
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
      // 生成画像（main/artpack.js の mg.shooter.<種類>：コマ0＝ふだん・コマ1＝被弾）があればそれを顔にする
      const gid='mg.shooter.'+e.type;
      if(window.ARTPACK&&ARTPACK.has(gid)){ARTPACK.draw(cx,gid,x-r*1.3,y-r*1.3,r*2.6,r*2.6,{frame:e.hitT>0?1:0});return;}
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
      if(e.type==='bot'){ // 四角いモニターの顔
        cx.fillStyle='#0c0a22';cx.fillRect(x-r*.8,y-r*.6,r*1.6,r*1.1);
        cx.fillStyle=pain?'#fff':'#c9c0ff';const on=((e.age*4)|0)%2;
        cx.fillRect(x-r*.5,y-r*.3,r*.3,r*.3);cx.fillRect(x+r*.2,y-r*.3,r*.3,r*.3);
        cx.fillRect(x-r*.4,y+r*.2,r*.8,on?r*.12:r*.06);
        cx.strokeStyle='#c9c0ff';cx.beginPath();cx.moveTo(x,y-r);cx.lineTo(x,y-r*1.4);cx.stroke();
        cx.fillStyle=on?'#ff5050':'#5a1020';cx.fillRect(x-1.5,y-r*1.6,3,3);return;
      }
      if(e.type==='elite'){ // 王冠のついた顔（フォロワー自慢）
        cx.fillStyle='#ffcc55';cx.beginPath();cx.moveTo(x-r*.8,y-r*.7);cx.lineTo(x-r*.5,y-r*1.3);cx.lineTo(x-r*.15,y-r*.85);cx.lineTo(x,y-r*1.4);cx.lineTo(x+r*.15,y-r*.85);cx.lineTo(x+r*.5,y-r*1.3);cx.lineTo(x+r*.8,y-r*.7);cx.closePath();cx.fill();
        cx.fillStyle='#1a0510';cx.fillRect(x-r*.6,y-r*.2,r*.4,r*.18);cx.fillRect(x+r*.2,y-r*.2,r*.4,r*.18);
        cx.strokeStyle='#1a0510';cx.beginPath();cx.moveTo(x-r*.4,y+r*.4);cx.quadraticCurveTo(x,y+r*(pain?.2:.7),x+r*.45,y+r*.35);cx.stroke();return;
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
      bot:{fill:'#1a1640',top:'#2c2768',st:'#9b8cff',tx:'#e0dbff',face:'#9b8cff',gl:'pu'},
      elite:{fill:'#3a2606',top:'#6a4a10',st:'#ffcc55',tx:'#fff3c8',face:'#ffcc55',gl:'gd'},
      guard:{fill:'#2a0a2a',top:'#4a1440',st:'#ff8a2a',tx:'#ffe0c0',face:'#ffa24c',gl:'or'},
    };
    // 色ごとの吹き出し（種類の違いは形・飾りで見せ、色は二つの色だけ）
    const TONE_STY=[
      {fill:'#3a0a1c',top:'#5a1430',st:'#ff4a5a',tx:'#ffd6de',face:'#ff6b81',gl:'rd'},
      {fill:'#06283a',top:'#0c3f56',st:'#3fd8ff',tx:'#d8f7ff',face:'#6be0ff',gl:'bl'},
    ];
    const styCache={};
    function enemySty(e){
      const tn=e.tone===1?1:0,key=e.type+tn;if(styCache[key])return styCache[key];
      const b=ESTY[e.type]||ESTY.basic,t=TONE_STY[tn],o=Object.assign({},b,t);
      if(e.type==='armor'){o.fill=tn?'#1c2a36':'#2a2030';o.top=tn?'#30495c':'#4a3448';}
      if(e.type==='elite'){o.tx=tn?'#e8fbff':'#fff3c8';}
      return styCache[key]=o;
    }
    // 色の印（色が分かりにくくても形で分かる）：怒り＝丸、冷笑＝ひし形
    function toneMark(x,y,tn,r){
      cx.fillStyle=tn?'#3fd8ff':'#ff4a5a';cx.strokeStyle='rgba(5,4,14,.9)';cx.lineWidth=1.2;cx.beginPath();
      if(tn){cx.moveTo(x,y-r*1.25);cx.lineTo(x+r*1.25,y);cx.lineTo(x,y+r*1.25);cx.lineTo(x-r*1.25,y);cx.closePath();}
      else cx.arc(x,y,r,0,6.283);
      cx.stroke();cx.fill();
    }
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
      const s=enemySty(e);
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
      // 取り巻き：渦とつながる細い線
      if(e.type==='guard'&&boss&&!boss.dead){cx.globalAlpha=.35;cx.strokeStyle='#ff8a2a';cx.lineWidth=1;cx.setLineDash([3,5]);cx.beginPath();cx.moveTo(boss.x,boss.y);cx.lineTo(e.x,e.y);cx.stroke();cx.setLineDash([]);cx.globalAlpha=1;}
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
      }else if(e.type==='elite'){
        cx.strokeStyle='rgba(255,220,120,'+(.45+Math.sin(clock*8)*.25)+')';cx.lineWidth=1.5;rr(x-4,y-4,w+8,h+8,h/2.4+4);cx.stroke();
        const f=Math.max(0,e.hp/e.maxHp);cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(x+6,y-8,w-12,4);cx.fillStyle='#ffcc55';cx.fillRect(x+6,y-8,(w-12)*f,4);
        cx.font=`9px ${FONT}`;cx.textAlign='right';cx.fillStyle='#ffcc55';cx.fillText('ELITE',x+w-4,y+h+7);
      }else if(e.type==='bot'){
        for(let i=0;i<e.maxHp;i++){cx.fillStyle=i<e.hp?'#9b8cff':'rgba(255,255,255,.15)';cx.fillRect(x+w/2-e.maxHp*4+i*8,y-7,6,3);}
        if(e.fireCd<.35&&e.age>.8&&e.age<7.5){cx.strokeStyle='rgba(200,190,255,.8)';cx.lineWidth=1.5;cx.beginPath();cx.arc(e.x,y+h+4,6+(.35-e.fireCd)*20,0,6.283);cx.stroke();}
      }else if(e.type==='guard'){
        for(let i=0;i<e.maxHp;i++){if(i>=12)break;cx.fillStyle=i<Math.ceil(e.hp)?'#ff8a2a':'rgba(255,255,255,.15)';cx.fillRect(x+w/2-Math.min(12,e.maxHp)*3+i*6,y-7,4,3);}
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
      if(!flash)toneMark(x+w-1,y+1,e.tone,e.small?3:4);
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
    // 敵弾は種類ごとに一度だけ描いて使い回す（文字の描画を毎フレームしない）
    // 縁は暗く・外周は明るい色・芯は白：どの背景でも読める
    const EB_COL={rd:['#ff3355','#ffd0d8','#5a0618'],or:['#ff6a2a','#ffe3b0','#5a1404'],pu:['#ff5a6e','#ffffff','#4a0616'],gd:['#ff7a6a','#ffffff','#4a1004']};
    // 冷笑（青）の弾。形はひし形
    const EB_COL1={rd:['#22c8ff','#d8f7ff','#04304a'],or:['#3a9cff','#d8ecff','#06204a'],pu:['#5fe0ff','#ffffff','#043040'],gd:['#7fd8ff','#ffffff','#06304a']};
    const ebSprite={};
    function ebSpr(style,ch,tn){
      const key=style+ch+(tn?1:0);let c=ebSprite[key];if(c&&c._d===dpr)return c;
      const big=style==='rd'||style==='or',R=big?8:5,S=big?44:30,col=(tn?EB_COL1:EB_COL)[style];
      let g;[c,g]=mkCanvas(S,S);const m=S/2;
      const gr=g.createRadialGradient(m,m,0,m,m,m);gr.addColorStop(0,col[0]+'aa');gr.addColorStop(.45,col[0]+'44');gr.addColorStop(1,col[0]+'00');
      g.fillStyle=gr;g.fillRect(0,0,S,S);
      // 怒り＝丸、冷笑＝ひし形（同じ大きさの当たり。形でも見分けられるように）
      const shape=r=>{g.beginPath();if(tn){const q=r*1.22;g.moveTo(m,m-q);g.lineTo(m+q,m);g.lineTo(m,m+q);g.lineTo(m-q,m);g.closePath();}else g.arc(m,m,r,0,6.283);};
      g.fillStyle=col[2];shape(R+1.6);g.fill();
      g.fillStyle=col[0];shape(R);g.fill();
      g.fillStyle=col[1];shape(R*(big?.72:.55));g.fill();
      if(big&&ch){g.fillStyle=col[2];g.font=`11px ${FONT}`;g.textAlign='center';g.textBaseline='middle';g.fillText(ch,m,m+1);}
      c._s=S;c._d=dpr;ebSprite[key]=c;return c;
    }
    function drawEB(b){
      const c=ebSpr(b.style,b.ch,b.tone),S=c._s;
      // 出たばかりの弾は少し大きく（どこから来たか分かるように）
      const k=b.age<.12?1.5-b.age/.12*.5:1;
      cx.drawImage(c,b.x-S/2*k,b.y-S/2*k,S*k,S*k);
    }
    function drawLasers(){
      for(const lz of lasers){
        if(lz.dead)continue;
        if(lz.warn>0){
          const f=1-lz.warn/lz.max,bl=((clock*(10+f*20))|0)%2;
          cx.fillStyle=`rgba(255,60,90,${.1+f*.15})`;cx.fillRect(lz.x-lz.w,lz.y0,lz.w*2,H-lz.y0);
          cx.strokeStyle=bl?'rgba(255,220,230,.9)':'rgba(255,60,90,.8)';cx.lineWidth=1.5;cx.setLineDash([8,6]);cx.lineDashOffset=-clock*60;
          cx.beginPath();cx.moveTo(lz.x,lz.y0);cx.lineTo(lz.x,H);cx.stroke();cx.setLineDash([]);
          cx.fillStyle='#ff5a78';cx.font=`10px ${FONT}`;cx.textAlign='center';cx.fillText('！',lz.x,Math.max(HUD_H+12,lz.y0+12));
        }else{
          const f=lz.on/lz.dur,w=lz.w*(f>.8?(1-f)*5:Math.min(1,f*3+.3));
          cx.globalCompositeOperation='lighter';
          cx.fillStyle='rgba(255,60,90,.45)';cx.fillRect(lz.x-w*1.8,lz.y0,w*3.6,H-lz.y0);
          cx.fillStyle='rgba(255,170,190,.85)';cx.fillRect(lz.x-w,lz.y0,w*2,H-lz.y0);
          cx.fillStyle='rgba(255,255,255,.95)';cx.fillRect(lz.x-w*.4,lz.y0,w*.8,H-lz.y0);
          cx.globalCompositeOperation='source-over';
        }
      }
    }
    function drawMid(){
      const m=mid;if(!m||midDone)return;
      const fade=m.dead?Math.max(0,1-m.dieT/1.4):1;if(fade<=0)return;
      const x=m.x+(m.flash>0?rnd(-2,2):0),y=m.y,w=m.w,h=m.h;
      gl(glow.gd,x,y,w*.75,.4*fade);gl(m.tone?glow.bl:glow.rd,x,y,w*.7,.5*fade);cx.globalAlpha=fade;
      // まとめサイトの記事パネル
      cx.fillStyle='rgba(0,0,0,.4)';rr(x-w/2+3,y-h/2+4,w,h,6);cx.fill();
      cx.fillStyle=m.flash>0?'#4a3a18':'#1c1406';rr(x-w/2,y-h/2,w,h,6);cx.fill();
      {
        cx.fillStyle='#4a3204';cx.fillRect(x-w/2+2,y-h/2+2,w-4,16);
        cx.fillStyle='#ffcc55';cx.font=`11px ${FONT}`;cx.textAlign='left';cx.fillText('【悲報】配信者さん、また',x-w/2+8,y-h/2+10);
        cx.fillStyle='rgba(255,220,140,.25)';for(let i=0;i<3;i++)cx.fillRect(x-w/2+44,y-h/2+26+i*10,w-56-i*18,4);
        cx.fillStyle='#2a1c06';cx.fillRect(x-w/2+8,y-h/2+24,30,30);
        // 管理人の顔（目が光る）
        cx.fillStyle=m.patT<0&&m.t>1.6?'#fff':'#ffcc55';cx.fillRect(x-w/2+14,y-h/2+34,6,4);cx.fillRect(x-w/2+26,y-h/2+34,6,4);
        cx.strokeStyle='#ffcc55';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(x-w/2+14,y-h/2+46);cx.lineTo(x-w/2+32,y-h/2+44);cx.stroke();
      }
      cx.strokeStyle='#ffcc55';cx.lineWidth=2;rr(x-w/2,y-h/2,w,h,6);cx.stroke();
      cx.strokeStyle=m.tone?'#3fd8ff':'#ff4a5a';cx.lineWidth=1.5;rr(x-w/2-3,y-h/2-3,w+6,h+6,8);cx.stroke();
      if(!m.dead){toneMark(x+w/2-2,y-h/2-2,m.tone,5);cx.font=`9px ${FONT}`;cx.textAlign='right';cx.fillStyle=m.tone?'#9fefff':'#ffb0b8';cx.fillText(m.tone?'冷笑':'怒り',x+w/2-10,y-h/2-8);}
      // 体力
      const f=Math.max(0,m.hp/m.max);
      cx.fillStyle='rgba(0,0,0,.7)';cx.fillRect(x-w/2,y+h/2+4,w,5);cx.fillStyle='#ffcc55';cx.fillRect(x-w/2,y+h/2+4,w*f,5);
      if(!m.dead&&!m.leave){const left=Math.max(0,Math.ceil(MID_LIMIT-m.t));cx.fillStyle='#bbaedd';cx.font=`9px ${FONT}`;cx.textAlign='right';cx.fillText('残り'+left+'秒',x+w/2,y+h/2+16);}
      if(m.patT<0&&m.t>1.6&&!m.dead){cx.globalAlpha=fade*(.4+.5*(((clock*10)|0)%2));cx.fillStyle='#ffcc55';cx.font=`12px ${FONT}`;cx.textAlign='center';cx.fillText('▼ '+(m.pat===0?'狙い撃ち':'まとめ拡散'),x,y+h/2+28);}
      cx.globalAlpha=1;
    }
    function drawPlayer(){
      let x=player.x,y=player.y+(player.recoil>0?2:0)+Math.sin(clock*3)*1.5;
      const dead=dying>0;
      if(dead&&dying<.9)return;
      const blink=inv>0&&!dead&&((clock*14)|0)%2===0;
      const tg=vpol?glow.bl:glow.rd;
      gl(tg,x,y,48,.45+(glowPulse>0?glowPulse:0));
      if(glowPulse>0)gl(glow[glowCol],x,y,70,glowPulse*1.5);
      cx.globalAlpha=blink?.35:1;
      if(player.hitT>0){x+=Math.sin(clock*90)*3;}
      // 色の切り替え中はくるっと一回転（色によって向きが逆）
      const spin=switchT>0&&!dead?(1-switchT/L.SWITCH_END)*6.283*(vpol?1:-1):0;
      cx.save();cx.translate(x,y);cx.rotate(dead?(1.6-dying)*4:player.tilt+spin);cx.scale(1.2,1.2);
      if(!dead){
        const fl=10+Math.sin(clock*40)*3+Math.random()*3+(Math.abs(player.vx)>40?4:0);
        cx.globalCompositeOperation='lighter';
        cx.fillStyle=vpol?'rgba(63,216,255,.55)':'rgba(255,74,90,.55)';cx.beginPath();cx.moveTo(-5,22);cx.lineTo(0,22+fl*1.6);cx.lineTo(5,22);cx.fill();
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
      cx.strokeStyle=vpol?'rgba(63,216,255,.8)':'rgba(255,74,90,.8)';cx.lineWidth=1.4;cx.beginPath();cx.arc(0,-10,13.5,-2.6,-.55);cx.stroke();
      // 声の色の印（頭の上）
      if(!dead){cx.save();cx.translate(0,-10);toneMark(0,0,vpol,3.2);cx.restore();}
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
      // 発射の光（マズルフラッシュ）
      if(muzzle>0&&!dead&&scene==='play'){
        cx.globalCompositeOperation='lighter';cx.globalAlpha=muzzle/.06;
        gl(laserT>0?glow.bl:spreadT>0?glow.gd:tg,x,y-30,16,.9);
        cx.fillStyle='#ffffff';cx.beginPath();cx.moveTo(x-4,y-26);cx.lineTo(x,y-40);cx.lineTo(x+4,y-26);cx.fill();
        cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      }
      // 当たり判定の芯（ここに当たらなければ大丈夫）
      if(scene==='play'&&!dead){
        const hy=player.y-6;
        if(focus){cx.strokeStyle='rgba(255,255,255,.35)';cx.lineWidth=1;cx.beginPath();cx.arc(player.x,hy,DF.grazeR,0,6.283);cx.stroke();
          cx.strokeStyle='rgba(0,232,200,.6)';cx.beginPath();cx.arc(player.x,hy,10,clock*4,clock*4+4);cx.stroke();}
        // 吸い込める範囲（同じ色の言葉がこの輪に触れると吸う）
        cx.strokeStyle=vpol?'rgba(63,216,255,.28)':'rgba(255,74,90,.28)';cx.lineWidth=1;cx.setLineDash([3,3]);cx.beginPath();cx.arc(player.x,hy,DF.absR,clock*1.5,clock*1.5+6.283);cx.stroke();cx.setLineDash([]);
        cx.fillStyle='rgba(5,4,14,.8)';cx.beginPath();cx.arc(player.x,hy,4.5,0,6.283);cx.fill();
        cx.fillStyle='#ffffff';cx.beginPath();cx.arc(player.x,hy,2.6,0,6.283);cx.fill();
        cx.strokeStyle='rgba(255,90,120,.9)';cx.lineWidth=1;cx.beginPath();cx.arc(player.x,hy,4.5,0,6.283);cx.stroke();
      }
    }
    function drawBoss(){
      const b=boss;if(!b)return;
      const fade=b.dead||b.leave?Math.max(0,1-b.dieT/1.6):1;if(fade<=0)return;
      const enr=b.phase>=3&&!b.dead;
      const x=b.x+(b.flash>0?rnd(-2,2):0),y=b.y,R=b.R*(b.dead?1+b.dieT*.4:1+Math.sin(clock*4)*.03);
      gl(glow.or,x,y,R*2.4,.55*fade);gl(b.tone?glow.bl:glow.rd,x,y,R*1.8,(enr?.85:.6)*fade);
      if(b.inv>0&&!b.dead){cx.globalAlpha=.5+.3*Math.sin(clock*30);cx.strokeStyle='#deccf8';cx.lineWidth=2;cx.beginPath();cx.arc(x,y,R*1.15,0,6.283);cx.stroke();}
      cx.globalAlpha=fade;
      cx.globalCompositeOperation='lighter';
      for(let arm=0;arm<(b.phase>=2?6:5);arm++){
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
      if(!b.dead&&!b.leave&&b.patT<0&&b.t>2){
        const k=Math.max(0,1+b.patT/.9), blinkA=.35+.45*(((clock*10)|0)%2);
        const pl=BOSS_PATS[b.phase],pk=(remix&&b.phase===1?pl.concat(['rain']):pl)[b.pat]||'spiral';
        const nm=PAT_NAME[pk];
        cx.globalAlpha=fade*blinkA;cx.strokeStyle='#ffcc55';cx.lineWidth=1.5;
        if(pk==='aimed'){const a=Math.atan2(player.y-6-y,player.x-x);cx.setLineDash([6,6]);for(let s=-2;s<=2;s++){cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+Math.cos(a+s*.2)*H,y+Math.sin(a+s*.2)*H);cx.stroke();}cx.setLineDash([]);}
        else{cx.beginPath();cx.arc(x,y,R*(1.2+k*.8),0,6.283);cx.stroke();}
        cx.globalAlpha=fade;cx.font=`12px ${FONT}`;cx.textAlign='center';cx.fillStyle='#05040e';cx.fillText('▼ '+nm,x+1,y+R*1.25+1);cx.fillStyle='#ffcc55';cx.fillText('▼ '+nm,x,y+R*1.25);
      }
      cx.font=`${Math.round(R*.24)}px ${FONT}`;cx.textAlign='center';
      const words=['晒','叩','拡散','炎上','特定','謝罪'];
      for(let i=0;i<words.length;i++){
        const a=-b.ang*.6+i*1.047;cx.fillStyle=b.tone?(i%2?'#bfefff':'#7fd8ff'):(i%2?'#ffd0a0':'#ff8a8a');
        cx.fillText(words[i],x+Math.cos(a)*R*1.05,y+Math.sin(a)*R*.86);
      }
      // いまの色（攻撃の色。違う色の声が 2 倍効く）
      if(!b.dead&&!b.leave){
        cx.strokeStyle=b.tone?'rgba(63,216,255,.75)':'rgba(255,74,90,.75)';cx.lineWidth=2;cx.setLineDash([10,6]);cx.beginPath();cx.arc(x,y,R*1.32,b.ang*.3,b.ang*.3+6.283);cx.stroke();cx.setLineDash([]);
        toneMark(x+R*.95,y-R*.95,b.tone,6);
        if(b.gAlive>0){cx.strokeStyle='rgba(255,138,42,'+(.45+.25*Math.sin(clock*6))+')';cx.lineWidth=3;cx.beginPath();cx.arc(x,y,R*1.08,0,6.283);cx.stroke();
          cx.font=`10px ${FONT}`;cx.textAlign='center';cx.fillStyle='#ffb070';cx.fillText('取り巻きが守っている',x,y+R*1.5);}
        cx.font=`10px ${FONT}`;cx.textAlign='left';cx.fillStyle=b.tone?'#9fefff':'#ffb0b8';cx.fillText(b.tone?'冷笑':'怒り',x+R*.95+9,y-R*.95);
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
    let hudGrad=null;
    function drawHud(){
      // 固定のHUD帯（ゲーム世界はこの下だけ）
      if(!hudGrad){hudGrad=cx.createLinearGradient(0,0,0,HUD_H);hudGrad.addColorStop(0,'#0b0820');hudGrad.addColorStop(1,'#07051a');}
      cx.fillStyle=hudGrad;cx.fillRect(0,0,W,HUD_H);
      cx.fillStyle='rgba(138,82,212,.55)';cx.fillRect(0,HUD_H-2,W,1);
      cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(0,HUD_H-1,W,1);
      cx.fillStyle='rgba(222,204,248,.06)';cx.fillRect(0,0,W,1);
      cx.textBaseline='middle';
      cx.font=`10px ${FONT}`;cx.textAlign='left';cx.fillStyle='#bbaedd';cx.fillText('こころ',10,16);
      const hurtShake=player.hitT>0?Math.sin(clock*80)*2:0;
      const sgap=MAX_SHIELD>6?13:15;
      for(let i=0;i<MAX_SHIELD;i++)shieldIcon(52+i*sgap+(i===shield?hurtShake:0),16,i<shield);
      cx.textAlign='right';
      cx.font=`15px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText(String(score).padStart(6,'0'),W-10,16);
      cx.font=`9px ${FONT}`;cx.fillStyle='#5e5078';cx.fillText('BEST '+String(Math.max(SD.best.score,0)).padStart(6,'0'),W-10,31);
      {// 2段目：REMIX・ボムの数・かすり・効いているスキル
        cx.textAlign='left';cx.font=`9px ${FONT}`;let lx=10;
        const seg=(tx,col)=>{cx.fillStyle=col;cx.fillText(tx,lx,31);lx+=cx.measureText(tx).width+8;};
        if(remix)seg('REMIX','#ff9a3c');
        seg('ボム '+'◆'.repeat(Math.max(0,bombs))+(bombs?'':'なし'),bombs?'#44ee88':'#5e5078');
        seg('♥'+likesRun,'#ff9ec0');
        if(scene==='play'&&streak>=5)seg('連続'+streak,'#7fffb0');
        seg('かすり '+grazes,'#bff8ee');
        if(emoLv>0&&W>=360)seg('★感情制御Lv'+emoLv,'#e8b830');
      }
      if(boss&&!boss.leave&&(!boss.dead||boss.dieT<1)){
        const bx=remix?50:10,bw=W-bx-112;
        cx.textAlign='left';cx.font=`10px ${FONT}`;cx.fillStyle='#ff9a6a';cx.fillText('炎上の渦',bx,44);
        const x0=bx+50,w0=bw-50;
        cx.fillStyle='#000';cx.fillRect(x0-1,39,w0+2,9);
        cx.fillStyle='#2a0a08';cx.fillRect(x0,40,w0,7);
        const f=Math.max(0,boss.hp/boss.max);
        cx.fillStyle=f<.4?'#ff3b3b':'#ff7a1e';cx.fillRect(x0,40,w0*f,7);
        cx.fillStyle='rgba(255,255,255,.4)';cx.fillRect(x0,40,w0*f,2);
        cx.fillStyle='rgba(0,0,0,.3)';for(let i=1;i<10;i++)cx.fillRect(x0+w0*i/10,40,1,7);
        // 段階の区切り（3段階）
        cx.fillStyle='#fff6c0';cx.fillRect(x0+w0*.33,37,2,13);cx.fillRect(x0+w0*.66,37,2,13);
        cx.font=`9px ${FONT}`;cx.textAlign='right';cx.fillStyle='#ff9a6a';cx.fillText('PHASE '+boss.phase,W-10,44);
      }else if(scene==='play'){
        const wv=waveIdx>=0?WAVES[waveIdx]:null;
        cx.textAlign='left';cx.font=`9px ${FONT}`;cx.fillStyle='#8a7aa8';
        if(mid&&!midDone)cx.fillText('中ボス　まとめ管理人',10,44);
        else if(wv)cx.fillText(wv.name+'　'+wv.sub,10,44);
        // 進行バー（中ボス◆・ボス▼の位置つき）
        const px0=Math.max(W*.5,150),pw=W-10-px0;
        if(pw>40){
          cx.fillStyle='rgba(255,255,255,.1)';cx.fillRect(px0,42,pw,3);
          cx.fillStyle='#8a52d4';cx.fillRect(px0,42,pw*Math.min(1,st/L.BOSS_T),3);
          const mx=px0+pw*L.MID_T/L.BOSS_T;cx.fillStyle=midDone?'#5e5078':'#ffcc55';cx.beginPath();cx.moveTo(mx,38);cx.lineTo(mx+4,43.5);cx.lineTo(mx,49);cx.lineTo(mx-4,43.5);cx.fill();
          cx.fillStyle='#e83055';cx.fillRect(px0+pw-2,38,3,11);
        }
      }
      if(scene!=='play')return;
      // 効果中のパワーアップ（帯の下）
      let yy=HUD_H+14;
      const bars=[[spreadT,POW.spread],[barrierT,POW.barrier],[slowT,POW.slow],[laserT,POW.laser]];
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
        // 中央上：コンボと倍率（倍率が上がるほど暖色・大きく）
        cx.textAlign='center';
        cx.font=`${Math.round((13+Math.min(5,(m-1)*2))*pul)}px ${FONT}`;
        const ct=combo+' COMBO ×'+m.toFixed(1);
        cx.fillStyle='rgba(5,4,14,.8)';cx.fillText(ct,W/2+1,HUD_H+15);
        cx.fillStyle=m>=3?'#ff6a3c':m>=2?'#ff9a3c':m>=1.5?'#e8b830':'#00e8c8';
        cx.fillText(ct,W/2,HUD_H+14);
        cx.fillStyle='rgba(255,255,255,.15)';cx.fillRect(W/2-40,HUD_H+25,80,2);
        cx.fillStyle='#e8b830';cx.fillRect(W/2-40,HUD_H+25,80*Math.max(0,comboT/2.6),2);
      }
      // 論破チェイン（中央、コンボの下）：いまの組（3 つの印）とチェインの数
      if(chainS.n>0||chainS.chain>0){
        const yy0=HUD_H+(combo>=2?40:16),big=chainShow>0;
        cx.textAlign='right';cx.font=`${big?14:11}px ${FONT}`;
        const tx=chainS.chain>0?'論破チェイン '+chainS.chain+(chainS.chain>=9?' MAX':''):'チェイン';
        const xr=W/2+12;
        cx.fillStyle='rgba(5,4,14,.8)';cx.fillText(tx,xr+1,yy0+1);
        cx.fillStyle=chainS.chain>=5?'#fff6c0':chainS.tone?'#9fefff':'#ffb0b8';cx.fillText(tx,xr,yy0);
        for(let i=0;i<3;i++){cx.globalAlpha=i<chainS.n?1:.25;toneMark(xr+12+i*13,yy0,chainS.tone,4);}
        cx.globalAlpha=1;
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
      const night='第'+(SD.plays+1)+'夜'+(remix?'　REMIX':'')+'　難しさ：'+MG_DIFF_NAMES[DIFF];
      cx.fillStyle=remix?'#ff9a3c':'#bbaedd';cx.fillText(night,W/2,H*.36+90);
      if(SD.best.score>0){cx.fillStyle='#5e5078';cx.font=`10px ${FONT}`;cx.fillText('BEST '+SD.best.score+'　'+(SD.best.grade?'RANK '+SD.best.grade:''),W/2,H*.36+110);}
      cx.fillStyle='#ff9ec0';cx.font=`10px ${FONT}`;cx.fillText('メダル '+L.medalCount(SD.medals)+' / 12　♥ '+SD.likes+'（声の強化：U）',W/2,H*.36+126);
      if(sceneT>.8){cx.globalAlpha=.5+Math.sin(clock*5)*.4;cx.fillStyle='#deccf8';cx.font=`12px ${FONT}`;cx.fillText('TAP / ENTER',W/2,H*.7);cx.globalAlpha=1;}
    }
    function drawHowto(){
      const a=Math.min(1,sceneT/.3);
      cx.globalAlpha=a;
      cx.fillStyle='rgba(5,4,14,.55)';cx.fillRect(0,0,W,H);
      const pw=Math.min(W-20,350),ph=Math.min(H-HUD_H-12,372),px=(W-pw)/2,py=Math.max(HUD_H+4,H*.45-ph/2);
      cx.fillStyle='rgba(10,7,22,.96)';rr(px,py,pw,ph,8);cx.fill();
      cx.fillStyle=dith;rr(px,py,pw,ph,8);cx.fill();
      cx.strokeStyle='#8a52d4';cx.lineWidth=2;rr(px,py,pw,ph,8);cx.stroke();
      cx.strokeStyle='rgba(222,204,248,.2)';cx.lineWidth=1;rr(px+4,py+4,pw-8,ph-8,6);cx.stroke();
      cx.textAlign='center';cx.font=`15px ${FONT}`;cx.fillStyle='#e8b830';
      cx.fillText('― 遊び方 ―',W/2,py+20);
      const lx=px+16,sc=Math.min(1,(ph-40)/330);
      let yy=py+44;
      const line=(text,col,size)=>{cx.textAlign='left';cx.font=`${size||12}px ${FONT}`;cx.fillStyle=col||'#deccf8';cx.fillText(text,lx+18,yy);};
      const sub=(text)=>{yy+=15*sc;line(text,'#8a7aa8',10);};
      const next=g=>{yy+=(g||24)*sc;};
      cx.fillStyle='#00e8c8';cx.font=`12px ${FONT}`;cx.textAlign='left';cx.fillText('◆',lx,yy);line('どこでもドラッグ／矢印で動く・声は自動');
      next();
      // 二つの色
      toneMark(lx+4,yy-1,0,4.5);toneMark(lx+13,yy-1,1,4.5);
      cx.textAlign='left';cx.font=`12px ${FONT}`;cx.fillStyle='#ffb0b8';cx.fillText('怒り',lx+22,yy);cx.fillStyle='#deccf8';cx.fillText('と',lx+48,yy);cx.fillStyle='#9fefff';cx.fillText('冷笑',lx+62,yy);cx.fillStyle='#deccf8';cx.fillText('、二つの色の言葉',lx+88,yy);
      sub('同じ色の言葉は当たらない。吸い込むと力になる');
      sub('違う色の相手には、声が 2 倍効く');
      next();
      cx.fillStyle='#fff6c0';cx.font=`12px ${FONT}`;cx.textAlign='left';cx.fillText('◆',lx,yy);line('切替（Z）で声の色を変える');
      sub('反論（V）：力 10 で追いかける声 1 本（最大 12 本）');
      next();
      cx.fillStyle='#ffcc55';cx.font=`12px ${FONT}`;cx.textAlign='left';cx.fillText('◆',lx,yy);line('同じ色を 3 体続けて倒すと 論破チェイン');
      sub('続けるほど点が倍に。違う色をはさむと切れる');
      next();
      gl(glow.cy,lx+8,yy-1,14,.5*a);cx.globalAlpha=a;
      cx.fillStyle='#0a3034';rr(lx,yy-7,18,12,6);cx.fill();cx.strokeStyle='#a0fff0';cx.lineWidth=1;cx.stroke();
      line('光る応援は撃たずに受け止める');
      sub('拡散・バリア・スロー・貫通・回復・モデ'+(DF.ffPass?'（声はすり抜ける）':''));
      next();
      cx.fillStyle='#44ee88';cx.font=`12px ${FONT}`;cx.textAlign='left';cx.fillText('◆',lx,yy);line('ピンチはモデレーター（B・'+DF.bombs+'回＋拾う）');
      sub('当たるのは白い芯だけ。赤い点線はレーザー予告');
      next();
      cx.fillStyle='#ff9ec0';cx.font=`12px ${FONT}`;cx.textAlign='left';cx.fillText('♥',lx,yy);line('倒すと いいね。集めて「声の強化」（左上・U）');
      sub('悪意を逃がさず倒すと連続撃退。夜ごとに任務 4 つ');
      cx.textAlign='center';cx.font=`12px ${FONT}`;cx.fillStyle='rgba(222,204,248,'+(.5+Math.sin(clock*5)*.3)+')';
      cx.fillText('タップで開始',W/2,py+ph-16);
      // 自動開始までのゲージ
      cx.fillStyle='rgba(255,255,255,.1)';cx.fillRect(px+20,py+ph-6,pw-40,2);
      cx.fillStyle='#8a52d4';cx.fillRect(px+20,py+ph-6,(pw-40)*Math.min(1,sceneT/HOWTO_SEC),2);
      cx.globalAlpha=1;
    }
    function drawGrade(){
      cx.fillStyle='rgba(5,4,14,.7)';cx.fillRect(0,0,W,H);
      const pw=Math.min(W-24,350),ph=Math.min(H-HUD_H-14,486),px=(W-pw)/2,py=Math.max(HUD_H+8,H*.47-ph/2);
      const op=Math.min(1,sceneT/.3);
      cx.globalAlpha=op;
      cx.fillStyle='rgba(10,7,22,.97)';rr(px,py,pw,ph,8);cx.fill();
      cx.fillStyle=dith;rr(px,py,pw,ph,8);cx.fill();
      cx.strokeStyle=finalReason==='down'?'#e83055':'#e8b830';cx.lineWidth=2;rr(px,py,pw,ph,8);cx.stroke();
      cx.strokeStyle='rgba(222,204,248,.2)';cx.lineWidth=1;rr(px+4,py+4,pw-8,ph-8,6);cx.stroke();
      cx.textAlign='center';cx.font=`16px ${FONT}`;
      cx.fillStyle=finalReason==='down'?'#ff7a90':'#e8b830';
      cx.fillText(finalReason==='down'?'― 心が、折れた ―':bossBeaten?'― 鎮火 ―':'― 夜明けまで耐えた ―',W/2,py+24);
      const pct=L.killPct(spawned,kills);
      const rows=[['SCORE',score]];
      if(remainBonus)rows.push(['こころボーナス',remainBonus]);
      if(bossBonus||midBonus)rows.push(['早期撃破ボーナス',bossBonus+midBonus]);
      if(streakPts)rows.push(['連続撃退ボーナス',streakPts]);
      rows.push(['撃退',kills+'（'+pct+'%）'],['最大 論破チェイン',chainS.max],['最大 連続撃退',maxStreak],['最大コンボ',maxCombo],['吸った言葉',absorbs],
        ['受け止めた応援',caught+' / '+goodsSpawned],['いいね','♥'+likesRun+(medalLikes?'＋'+medalLikes:'')],['誤射',friendlyFire],['のこった こころ',Math.max(0,shield)+' / '+MAX_SHIELD]);
      const rowH=Math.max(12,Math.min(17,(ph-212)/rows.length));
      cx.font=`${rowH<15?11:12}px ${FONT}`;
      for(let i=0;i<rows.length;i++){
        const appear=sceneT-.25-i*.06;if(appear<0)continue;
        const yy=py+46+i*rowH;
        cx.globalAlpha=op*Math.min(1,appear*5);
        cx.textAlign='left';cx.fillStyle='#bbaedd';cx.fillText(rows[i][0],px+20,yy);
        cx.textAlign='right';cx.fillStyle='#deccf8';
        const v=rows[i][1];
        cx.fillText(typeof v==='number'?Math.round(v*Math.min(1,appear*2.5)):v,px+pw*.62,yy);
      }
      // 任務とメダル（クリアしたときだけ達成）
      {const my=py+46+rows.length*rowH+8,mh=Math.max(12,Math.min(15,rowH));
        const appear=sceneT-.4-rows.length*.06;
        if(appear>0&&missions){
          cx.globalAlpha=op*Math.min(1,appear*4);
          cx.fillStyle='rgba(255,255,255,.08)';cx.fillRect(px+16,my-8,pw-32,1);
          cx.textAlign='left';cx.font=`11px ${FONT}`;cx.fillStyle='#e8b830';
          cx.fillText('任務（'+MG_DIFF_NAMES[DIFF]+'）　メダル '+L.medalCount(SD.medals)+' / 12',px+20,my+3);
          for(let i=0;i<4;i++){
            const ok=missions[i],had=SD.medals[DIFF][i],yy=my+3+(i+1)*mh;
            cx.fillStyle=ok?'#7fffb0':had?'#5e8a70':'#5e5078';cx.fillText((ok?'✔ ':had?'◇ ':'・ ')+L.MISSIONS[i].name,px+24,yy);
          }
          if(newMedals){cx.textAlign='right';cx.fillStyle=((clock*4)|0)%2?'#ffcc55':'#ff9a3c';cx.fillText('NEW メダル ×'+newMedals+'（♥＋'+medalLikes+'）',px+pw-20,my+3);}
          if(finalReason!=='clear'){cx.textAlign='right';cx.fillStyle='#5e5078';cx.fillText('クリアで判定',px+pw-20,my+3);}
        }
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
      if(shake>0&&!paused){const k=RMO?.15:1;cx.translate((Math.random()-.5)*shake*k,(Math.random()-.5)*shake*k);}
      drawBg();
      // ゲーム世界はHUD帯の下だけに描く
      cx.save();cx.beginPath();cx.rect(-20,HUD_H,W+40,H);cx.clip();
      if(scene!=='play'){cx.globalAlpha=.55;for(const e of amb)drawEnemy(e);cx.globalAlpha=1;}
      drawBoss();drawMid();
      cx.textBaseline='middle';
      drawLasers();
      for(const g of goods)drawGood(g);
      for(const e of enemies)drawEnemy(e);
      for(const c of corpses)drawCorpse(c);
      if(scene==='play'&&likes.length){
        cx.font=`12px ${FONT}`;cx.textAlign='center';
        for(const l of likes){const k=l.pull?1.15:1+Math.sin(l.age*8)*.08;gl(glow.pk,l.x,l.y,10*k,.6);cx.globalAlpha=1;cx.fillStyle='#ffd6e6';cx.fillText('♥',l.x,l.y+1);}
      }
      cx.globalCompositeOperation='lighter';
      cx.lineWidth=2.2;cx.lineCap='round';
      for(const b of pb){
        if(b.pierce){ // 貫通ボイス：細長い光の筋
          gl(glow.bl,b.x,b.y,12,.7);cx.globalAlpha=1;
          cx.strokeStyle='#bfeaff';cx.lineWidth=3;cx.beginPath();cx.moveTo(b.x,b.y);cx.lineTo(b.x,b.y+30);cx.stroke();
          cx.strokeStyle='#ffffff';cx.lineWidth=1.2;cx.beginPath();cx.moveTo(b.x,b.y);cx.lineTo(b.x,b.y+18);cx.stroke();cx.lineWidth=2.2;
          continue;
        }
        if(b.homing){ // 反論：追いかける光の玉
          if(b.age<0)continue;
          gl(b.tone?glow.bl:glow.rd,b.x,b.y,18,.9);cx.globalAlpha=1;
          cx.fillStyle='#ffffff';cx.beginPath();cx.arc(b.x,b.y,3.2,0,6.283);cx.fill();
          cx.strokeStyle=b.tone?'#9fefff':'#ffb0b8';cx.lineWidth=2;const an=Math.atan2(b.vy,b.vx);
          cx.beginPath();cx.moveTo(b.x,b.y);cx.lineTo(b.x-Math.cos(an)*16,b.y-Math.sin(an)*16);cx.stroke();cx.lineWidth=2.2;
          continue;
        }
        gl(b.gold?glow.gd:b.tone?glow.bl:glow.rd,b.x,b.y,14,.75);
        cx.globalAlpha=1;cx.strokeStyle=b.gold?'#ffe9a8':b.tone?'#c8f4ff':'#ffd0d8';
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
      if(hurtFlash>0){cx.fillStyle=`rgba(232,48,85,${hurtFlash*(RMO?.2:.45)})`;cx.fillRect(-20,-20,W+40,H+40);}
      if(whiteFlash>0){cx.fillStyle=`rgba(220,255,250,${whiteFlash*(RMO?.2:.6)})`;cx.fillRect(-20,-20,W+40,H+40);}
      if(bombT>0){
        const f=1-bombT/1.4;
        cx.globalCompositeOperation='lighter';cx.globalAlpha=(1-f)*.5;
        cx.drawImage(glow.cy,-W*.2,H*(1-f*1.3)-60,W*1.4,120);
        cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      }
      cx.setTransform(dpr,0,0,dpr,0,0);
      drawHud();
      if(scene==='play'){drawBanner();drawHint();if(paused)drawPause();}
      if(dying>0&&scene==='play'){cx.fillStyle=`rgba(5,4,14,${Math.min(.6,(1.6-dying)*.5)})`;cx.fillRect(0,HUD_H,W,H);
        cx.globalAlpha=Math.min(1,(1.6-dying)*2);cx.textAlign='center';cx.font=`18px ${FONT}`;cx.fillStyle='#ff7a90';cx.fillText('……心が、もたない',W/2,H*.45);cx.globalAlpha=1;}
      if(scene==='title')drawTitle();
      else if(scene==='howto')drawHowto();
      else if(scene==='grade')drawGrade();
      else if(scene==='story'||scene==='ending'){cx.fillStyle='rgba(5,4,14,.35)';cx.fillRect(0,HUD_H,W,H);
        if(scene==='story')drawLogo(W/2,H*.3,.62,.5);}
      drawTrans();
    }
    function drawHint(){
      if(!hint)return;
      const a=Math.min(1,hint.t*4,(3.4-hint.t)*3);if(a<=0)return;
      cx.globalAlpha=a;cx.font=`12px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';
      const tw=Math.min(W-24,cx.measureText(hint.text).width+28),y=HUD_H+52;
      cx.fillStyle='rgba(10,7,22,.88)';rr(W/2-tw/2,y-14,tw,28,8);cx.fill();
      cx.strokeStyle='#00e8c8';cx.lineWidth=1;rr(W/2-tw/2,y-14,tw,28,8);cx.stroke();
      cx.fillStyle='#deccf8';cx.fillText(hint.text,W/2,y+1,W-36);
      cx.globalAlpha=1;
    }
    function drawPause(){
      cx.fillStyle='rgba(5,4,14,.72)';cx.fillRect(0,HUD_H,W,H-HUD_H);
      cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`22px ${FONT}`;cx.fillStyle='#e8b830';cx.fillText('一時停止',W/2,H*.4);
      cx.font=`12px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText('タップ／P／Enter で再開',W/2,H*.4+30);
      cx.fillStyle='#8a7aa8';cx.font=`10px ${FONT}`;
      cx.fillText('移動：ドラッグ・矢印／WASD　精密：Shift',W/2,H*.4+58);
      cx.fillText('モデレーター召喚：B・X・右下のボタン',W/2,H*.4+74);
    }
    function hud(){
      const html=`SCORE <span style="color:var(--tx-b)">${score}</span>　撃退 ${kills}　🛡${Math.max(0,shield)}/${MAX_SHIELD}`;
      if(html!==lastScoreHtml){lastScoreHtml=html;mg.setScore(html);}
      const tm=scene!=='play'?(scene==='grade'||scene==='ending'?'RESULT':'READY'):paused?'PAUSE':boss&&!boss.dead&&!boss.leave?'渦 '+Math.max(0,Math.ceil(BOSS_LIMIT-boss.t)):mid&&!midDone?'中ボス':String(Math.max(0,Math.ceil(L.BOSS_T-st)));
      if(tm!==lastTimer){lastTimer=tm;mg.setTimer(tm);}
    }

    return {
      // テスト・自動プレイ用の読み取り専用の状態（ゲームには影響しない）
      state(){
        let aim=null,best=1e9;
        for(const e of enemies){if(e.dead||e.y<HUD_H)continue;const d=Math.abs(e.x-player.x)+(H-e.y)*.3;if(d<best){best=d;aim=e.x;}}
        if(boss&&!boss.dead&&aim==null)aim=boss.x;if(mid&&!midDone&&!mid.dead&&aim==null)aim=mid.x;
        let danger=0;for(const b of eb)if(!b.dead&&Math.abs(b.x-player.x)<26&&b.y<player.y&&player.y-b.y<140)danger+=b.x<player.x?1:-1;
        let lz=null;for(const l of lasers)if(!l.dead&&Math.abs(l.x-player.x)<50)lz=l.x;
        return {scene,paused,st,t,px:player.x,py:player.y,W,H,aimX:aim,danger,laserX:lz,eb:eb.length,pb:pb.length,enemies:enemies.length,parts:parts.filter(p=>p.life>0).length,
          boss:boss?{hp:boss.hp,max:boss.max,phase:boss.phase,t:boss.t}:null,mid:mid?{hp:mid.hp,done:midDone}:null,shield,score,kills,grazes,combo,maxCombo,bombs,finalReason};
      },
      result(reason){
      window.removeEventListener('resize',onResize);
      // 評価・結末の途中で終了ボタンが押されても、決まった結果を使う
      if(finalReason)reason=finalReason;
      SD.plays++;SD.lastDay=gs.day;
      const clear=reason==='clear', down=reason==='down';
      const rw=L.rewardFx({reason,kills,caught,shield,friendlyFire,bossBeaten},gs.flame);
      const fx=rw.fx;
      const title=clear?(bossBeaten?'🔥 炎上の渦を鎮めた':'🔥 炎上を耐えきった'):down?'💔 心が削られた':'🔥 撃退を中断した';
      return {
        title,
        summary:(grade?`ランク <span class="up">${grade}</span>　`:'')+`スコア <span class="up">${score}</span>　撃退 <span class="up">${kills}</span>　最大コンボ <span class="up">${maxCombo}</span>`+
          `<br>受け止めた応援 <span class="up">${caught}</span>`+(friendlyFire?`　誤射 <span class="down">${friendlyFire}</span>`:'')+
          (clear?(bossBeaten?'<br>「炎上の渦」を撃破した。':'<br>渦は消えきらなかったが、朝まで耐えた。'):''),
        fx, time:rw.time, sp:rw.sp,
        log:clear?(bossBeaten?'炎上の渦を鎮めた。届いた応援の声が、まだ耳に残っている。':'炎上コメントを撃退した。少し静かな夜になった。'):down?'荒れたコメント欄に心を削られた。子どもの寝息に救われた。':'荒れたコメント欄と向き合った。',
        cutin:clear?(bossBeaten?['win','……燃えてたのは画面の中だけよ。ちゃんと届く声だけ拾うわね。']:['happy','……もう大丈夫。ちゃんと届く声だけ拾うわ。']):down?['tired','……今夜はもう、コメント欄見られないわ。']:null,
      };
    }};
  },
});
