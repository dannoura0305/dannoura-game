// ══════════════════════════════════════════════════════════
// 夜のミニゲームの目録（選択画面に出す文言だけ。ゲーム本体は遊ぶときに読み込む）
//
// ・選択画面・残り数・シミュレーターはこの目録だけで動く。
// ・MG.open(id) を呼ぶと minigames/<file>.js を読み込み、registerMinigame() で
//   本物の定義に差し替えてから始める（minigames/core.js の MG.load）。
// ・文言は各ゲームの registerMinigame({...}) と完全に同じにすること。
//   ずれると tests/minigame-registry.test.mjs が失敗する。
// ・並び順は以前の <script> の順（シミュレーターの乱数の結果を変えないため）。
// ・ミニゲームを増やすときは、ここに1行足すだけでよい（index.html は触らない）。
// ══════════════════════════════════════════════════════════
const MG_RPG_CH=[null,
  {kan:'第一章',title:'声の灯',  place:'沈んだ配信部屋'},
  {kan:'第二章',title:'手の灯',  place:'海底の工場'},
  {kan:'第三章',title:'約束の灯',place:'珊瑚の保育園'},
  {kan:'第四章',title:'眠りの灯',place:'眠らない灯籠の回廊'},
  {kan:'第五章',title:'名前の灯',place:'名前を呑む渦'},
];
// rpg.js の rpgPeek()/lockedToday と同じ判定（gs.rpg を読むだけで書き換えない）
function _mgRpgPeek(){
  const raw=(typeof gs!=='undefined'&&gs&&gs.rpg&&typeof gs.rpg==='object'&&!Array.isArray(gs.rpg))?gs.rpg:{};
  const lastDay=Number.isFinite(+raw.lastDay)?Math.floor(+raw.lastDay):-1;
  return {
    cleared:Math.max(0,Math.min(5,Math.floor(+raw.cleared||0))),
    lastDay,
    lv:Math.max(1,Math.min(99,Math.floor(+raw.lv||1))),
    ending:['true','wake','sink'].includes(raw.ending)?raw.ending:null,
  };
}
function _mgRpgLocked(R){return R.cleared>0&&R.cleared<5&&R.lastDay===gs.day;}
// ── 工場タブに置くミニゲーム（夜の🎮選択画面には出さない） ──
// 下部ナビ「🔧 工場」と行動「🔧 工場で働く」から開く（minigames/core.js openMinigamePicker('factory')）。
// 仕事・資格・通勤に関わるものだけ。1日1回・難しさ・報酬はほかのミニゲームと同じ。
const MG_FACTORY_IDS=['rogue','puzzle','blocks','factory3d','quiz','escape','race'];
function mgPlaceOf(id){return MG_FACTORY_IDS.includes(id)?'factory':'night';}

// ── スキルがミニゲームで効くところ（スキル画面の「ミニゲームでの効果」と、遊び始めの表示に使う） ──
// 数値は各ゲーム本体（minigames/<file>.js）の mgSkill() の使い方と同じにすること。
// '_factory' は工場タブのミニゲーム全部に効くもの（minigames/core.js MG.finish）。
const MG_SKILL_FX={
  _factory:[['wiring','工場ミニゲームの収入 +5%/Lv'],['plc','工場ミニゲームの仕事評価 +1/Lv']],
  rogue:    [['soundDiag','懐中電灯の届く距離 +0.35マス/Lv・闇から飛びかかられる確率 -20%/Lv']],
  puzzle:   [['wiring','制限時間 +10秒/Lv・★2になる手数の余裕 +1/Lv']],
  blocks:   [['plc','部品の落ちる速さ -7%/Lv・置くまでの猶予 +0.08秒/Lv・制限時間 +8秒/Lv']],
  factory3d:[['emergencyFix','計器の点検に必要な長押し -8%/Lv・電池の減り -5%/Lv'],['soundDiag','「影」の動き -5%/Lv（足音で先に気づく）'],['stressRes','影に触れられた時の電池ダメージ -3%/Lv']],
  quiz:     [['examTech','1問の制限時間 +3秒/Lv・50:50（2択に絞る） +1回/Lv']],
  escape:   [['focus','制限時間 +20秒/Lv・光の外でも調べられる場所が見えやすくなる'],['emergencyFix','ヒント +1回/Lv']],
  race:     [['riding','車体ダメージ -10%/Lv・水たまりで滑りにくい・持ち時間 +3秒/Lv']],
  shooter:  [['emoCtrl','こころ +1/Lv・被弾後の無敵 +0.15秒/Lv']],
  cards:    [['chatSkill','雑談・コメント拾い・実況トークの威力↑'],['kaidanSkill','怪談の威力 +3/Lv'],['singSkill','歌の威力↑'],['radioVibe','本音トーク・深夜ラジオの威力↑'],['emoCtrl','ギフトのお礼のガード +2/Lv'],['stressRes','深呼吸の回復 +1/Lv'],['plc','工場トークの威力 +1/Lv']],
  runner:   [['chores','子どもが起きるまでの時間 +6%/Lv・Lv2で傘の耐久 +1']],
  defense:  [['chatSkill','開始資金 +¥20/Lv・ウェーブクリアのボーナス +¥5/Lv']],
  rpg:      [['wiring','「直す」の威力↑（PLC解析・緊急復旧も）'],['stressRes','「祈る」の回復↑（寝かしつけも）'],['focus','だんのうらの素早さ↑'],['sleepEff','だんのうらのMP +2/Lv']],
  stealth:  [['bedtime','物音への敏感さ -4%/Lv'],['chores','家事にかかる時間 -5%/Lv']],
  horror:   [['kaidanSkill','配信開始時の盛り上がり Lv2で+1・Lv4で+2（神回に届きやすい）']],
  cooking:  [['chores','金色ゾーンの幅 +8%/Lv']],
  manager:  [['radioVibe','深夜ラジオ企画の評価 +6%/Lv'],['chatSkill','雑談・凸待ち企画の評価↑'],['kaidanSkill','怪談企画の評価↑'],['singSkill','歌枠企画の評価↑'],['emergencyFix','Lv3で配信中の回線落ちをすぐ復旧']],
  fishing:  [['stressRes','引き寄せゾーンの幅 +6%/Lv・ゾーンを外れても糸が切れるまでの猶予 +0.15秒/Lv']],
};
const MG_META=[
  {id:'shooter', file:'shooter', icon:'🔥', name:'炎上コメント撃退', genre:'シューティング', bgm:'stream',
    desc:'降ってくる悪意のコメントを撃ち落とす。応援コメントは撃たずに受け止めよう。中ボス「まとめ管理人」のあと、最後に「炎上の渦」が来る。',
    effect:'炎上↓ 精神↑ フォロワー↑ ／ 疲労+6 約40分',
    help:'ドラッグ／矢印で移動・自動射撃・Shiftで精密・Bでモデ召喚・Pで一時停止'},
  {id:'rogue', file:'roguelike', icon:'🔦', name:'深夜の工場巡回', genre:'ローグライク', bgm:'kaidan',
    desc:'毎回形が変わる夜の工場を3フロア巡回。懐中電灯で照らし、異常箇所を点検し、怪異をかわして出口へ。',
    effect:'仕事評価↑ 資格知識↑ 収入↑ 怪談ネタ ／ 疲労+10 約90分',
    help:'スワイプ・十字・矢印で移動'},
  {id:'puzzle', file:'puzzle', icon:'⚡', name:'配線復旧パズル', genre:'パズル', bgm:'factory',
    desc:'停電したラインの配電盤を復旧する。タイルを回して全部のランプに電気を通そう。少ない手数ほど高評価。',
    effect:'資格知識↑ 仕事評価↑ 収入↑ ／ 疲労+6 約60分',
    help:'タップで回転・全ランプ点灯'},
  {id:'cards', file:'cardbattle', icon:'🃏', name:'配信トークバトル', genre:'カードバトル', bgm:'stream',
    desc:'話題カードで配信を荒らす3体の「夜」に挑む。勝つたびにカードが増える。スキルが高いほどデッキが強くなる。',
    effect:'フォロワー↑ 配信人気↑ 収入↑ ／ 疲労+8 約80分',
    help:'タップ2回で使用・PC:1-9/Space'},
  {id:'runner', file:'runner', icon:'🏃', name:'深夜の買い出しダッシュ', genre:'アクション', bgm:'stream',
    desc:'子どもが熱を出した。目を覚ます前に、雨の町を走って24時間コンビニへ。冷却シートと、好きなプリンを買いに。',
    effect:'育児ストレス↓ 精神↑ 収入↑ ／ 疲労+8 約40分',
    help:'タップ:ジャンプ／↓スワイプ:スライド'},
  {id:'defense', file:'defense', icon:'🛡', name:'荒らしディフェンス', genre:'タワーディフェンス', bgm:'stream',
    desc:'荒らしの大群がコメント欄に押し寄せる。流れに沿って防衛を置き、配信の「心」を最後まで守り抜け。',
    effect:'炎上↓ フォロワー↑ 配信人気↑ 精神↑ ／ 疲労+8 約60分',
    help:'空き枠に配置・タップで強化'},
  {id:'rpg', file:'rpg', icon:'🌊', name:'壇ノ浦夢譚', genre:'ストーリーRPG', bgm:'night',
    // 説明・効果は進み具合で変わる（minigames/rpg.js の desc/effect と同じ文言。章名は RPG_CH と同じ）
    get desc(){
      try{
        const R=_mgRpgPeek();
        if(R.cleared>=5)return `五つの灯は、すべて戻った。${R.ending==='sink'?'……けれど、まだ海の音がする。':''}章を選んで見返せる（報酬なし・評価は記録される）。`;
        const c=MG_RPG_CH[R.cleared+1];
        if(_mgRpgLocked(R))return `夢の続き──${c.kan}「${c.title}」は、明日の夜に。見返しはできる（報酬なし）。`;
        if(R.cleared===0)return '眠りの底、沈んだ都を歩く見下ろし型のRPG。少女ミナモと、失くした五つの灯を探す。今夜は第一章「声の灯」。';
        return `夢の続き──${c.kan}「${c.title}」（${c.place}）。灯 ${R.cleared}/5・Lv${R.lv}`;
      }catch(e){return '眠りの底、沈んだ都で五つの灯を探す夢のRPG。';}
    },
    get effect(){
      try{const R=_mgRpgPeek();if(R.cleared>=5||_mgRpgLocked(R))return '見返し：報酬なし ／ 約60分';}catch(e){}
      return '章クリアで 疲労-10 精神↑ 希望↑ SP+1 ／ 約120分（負けると悪夢）';
    },
    help:'移動 十字キー/WASD・A(Enter) 調べる/決定・B(Esc) メニュー/戻る'},
  {id:'stealth', file:'stealth', icon:'🤫', name:'起こさないで家事', genre:'ステルス', bgm:'night',
    desc:'やっと寝た子の横で、0時までに家事を4つ。足音、床のきしみ、踏んだおもちゃ……物音を立てたら起きてしまう。',
    effect:'育児ストレス↓ 精神↑ 希望↑ ／ 疲労+4 約45分',
    help:'ドラッグで移動（ゆっくり＝静か）・長押しで家事／WASD+Space（Shiftで早足）'},
  {id:'quiz', file:'quiz', icon:'📝', name:'危険物取扱者 一問一答', genre:'クイズ', bgm:'factory',
    desc:'来月は乙4の試験。深夜の机で4択を10問。連続正解でコンボ倍率、間違えた問題はまた出る。好成績で模擬試験モード解放。',
    effect:'資格知識↑ 仕事評価↑ 精神± ／ 疲労+5 約50分',
    help:'タップ/1-4キーで解答'},
  {id:'horror', file:'horror', icon:'👻', name:'怪談配信・実録編', genre:'ホラーノベル', bgm:'kaidan',
    desc:'リスナーから届いた「実録怪談」を生配信で朗読するサウンドノベル。読み方の選び方で、コメント欄の盛り上がりと……部屋の様子が変わっていく。',
    effect:'配信人気↑ フォロワー↑ 精神↓リスク ／ 疲労+6〜8 約60分',
    help:'タップで読み進める・1〜3で選択'},
  {id:'factory3d', file:'factory3d', icon:'🏭', name:'夜勤の第三工場', genre:'3Dアクション', bgm:'kaidan',
    desc:'落雷で停電した夜の第三工場。懐中電灯だけを頼りに計器5か所を点検し、非常口へ。闇の中を「影」がうろついている。',
    effect:'仕事評価↑ 資格知識↑ 収入↑ ／ 疲労+8 約70分',
    help:'左:移動 右:視点 ボタン長押し:点検/集光 ／ WASD・ドラッグ・E'},
  {id:'cooking', file:'cooking', icon:'🍳', name:'深夜の夜食づくり', genre:'タイミング（料理）', bgm:'night',
    desc:'あの子が寝たあとの小さな台所。卵焼き・ウインナー・焼きおにぎりを作って、明日のお弁当に詰める。端っこは自分の夜食。',
    effect:'育児ストレス↓ 精神↑ 希望↑ ／ 疲労+5 食材費-¥300 約45分',
    help:'金色ゾーンでタップ/Space・盛り付けはドラッグ'},
  {id:'escape', file:'escape', icon:'🔐', name:'閉じ込められた夜勤明け', genre:'脱出・謎解き', bgm:'kaidan',
    desc:'夜勤明け、落雷の停電で工場に閉じ込められた。朝までに娘を迎えに行かないと。設備保全の知識で4つの部屋の仕掛けを解き、非常口から脱出しよう。',
    effect:'資格知識+5 仕事評価+6 精神力+4（ヒント1回ごと−1）／ 疲労+6 約60分',
    help:'タップで調べる・持ち物を選んで使う'},
  {id:'blocks', file:'blocks', icon:'🧱', name:'部品組み立てライン', genre:'落ち物パズル', bgm:'factory',
    desc:'2個1組で流れてくる部品を積み、同じ部品を3つつなげると1段上に組み立て。ネジ→ナット→ギア→モーター→アーム→ロボット完成でフォークリフトが出荷！ 連鎖組立で高得点。',
    effect:'収入↑ 仕事評価↑ 精神↑ ／ 疲労+6 約45分',
    help:'ドラッグで移動・タップで回転／下に払って落下'},
  {id:'manager', file:'manager', icon:'📈', name:'チャンネル運営会議', genre:'経営シミュレーション', bgm:'stream',
    desc:'来週7日分の配信企画をスケジュール表に並べて、1週間を早送りで見届ける。客層・トレンド・並び順・疲れを読んで高評価を狙え。遊ぶほど新企画が解禁。',
    effect:'フォロワー↑ 配信人気↑ 精神±（評価しだい） ／ 疲労+4 約50分',
    help:'カードをドラッグ／タップ→曜日をタップ'},
  {id:'fishing', file:'fishing', icon:'🎣', name:'夜釣りで頭を空っぽに', genre:'釣り（癒し系）', bgm:'night',
    desc:'壇ノ浦の夜の港で、常連の源さんの隣に6投だけ糸を垂らす。関門橋の灯りと波の音。釣れたものは魚図鑑に残っていく。',
    effect:'精神↑ 疲労↓ 希望↑ 魚図鑑 ／ 疲労-4 約60分',
    help:'長押し→離して投げる／ウキが沈んだらタップ／長押しで枠を右へ'},
  {id:'race', file:'race', icon:'🛵', name:'原付で夜勤へ', genre:'3Dレース', bgm:'factory',
    desc:'配信を延長しすぎた。雨の住宅街・商店街・工業道路を原付で抜けて、22:00の夜勤打刻に間に合わせる本格3Dレース。',
    effect:'仕事評価↑ 精神↑ ／ 疲労+6 約30分',
    help:'←→/画面左右長押しで操作・↓/ブレーキ'},
];
