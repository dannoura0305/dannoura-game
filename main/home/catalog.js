// ═══════════════════════════════════════════════════════════
// 家・庭づくり：定義（アイテム・素材・レシピ・広さ・バランス）
//   HOME.CATALOG[itemId]  … 名前・大きさ・回転・レイヤー・置ける場所・使い方
//   HOME.MATERIALS[id]    … 素材の名前
//   HOME.RECIPES[id]      … クラフトの材料と完成品
//   HOME.AREAS[area]      … 部屋（12×8→拡張後14×9）・庭（16×12→拡張後20×14）の広さと出入口（今のセーブに合わせて HOME.syncAreas が書き換える）
//   HOME.AREA_SIZES       … 拡張前／拡張後の広さと出入口（フェーズ3）
//   HOME.EXTERIOR / WALLPAPERS / FLOORS … 外観・内装の選択肢（フェーズ3）
//   HOME.BAL              … 時間・疲労・精神の上限
// 設計：docs/home-story-design.md
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};

// use: front=正面の隣 / side=長辺の横 / self=自分のマス / near=隣のどこか / wall=壁の下の床 / none=使わない
// verb: 「使う」ボタンの文言
const R4=[0,90,180,270],R2=[0,90],R1=[0];
const it=(name,w,h,rots,layer,solid,areas,use,verb,desc,extra)=>Object.assign({name,w,h,rots,layer,solid,areas,use,verb,desc},extra||{});
HOME.CATALOG={
  'furniture.desk_small':    it('小さな木の机',2,1,R2,'furniture',true,['room'],'front','作業する','ちいさな机。夜はここで勉強したり、繕いものをしたり。'),
  'furniture.wood_chair':    it('木の椅子',1,1,R4,'furniture',true,['room','garden'],'front','座る','座面が少しすり減った木の椅子。'),
  'furniture.repaired_shelf':it('修理した棚',2,1,R4,'furniture',true,['room'],'front','調べる','ガタついていた棚を、端材と金具で直したもの。'),
  'furniture.bookshelf':     it('本棚',2,1,R4,'furniture',true,['room'],'front','本を読む','絵本と資格の参考書が、同じ段に並んでいる。'),
  'furniture.futon':         it('布団',2,3,R2,'furniture',true,['room'],'side','寝かしつける','娘といっしょに眠る布団。'),
  'furniture.cushion':       it('クッション',1,1,R1,'furniture',false,['room','garden'],'self','座る','ふかふかのクッション。上に乗れる。'),
  'furniture.low_table':     it('低い食卓',2,2,R2,'furniture',true,['room'],'near','一緒に食べる','ふたりで囲む、ちゃぶ台。'),
  'light.desk_lamp':         it('卓上ランプ',1,1,R1,'furniture',true,['room'],'near','灯りを点ける','オレンジ色の小さな灯り。',{light:true}),
  'light.shell_lantern':     it('貝殻ランタン',1,1,R1,'furniture',true,['room','garden'],'near','灯りを点ける','夢で見た灯りを、浜の貝殻で作ったランタン。',{light:true}),
  'memento.child_drawing':   it('娘の絵の額',1,1,R1,'wall',false,['room'],'wall','眺める','クレヨンで描いた「パパとわたし」。壁にだけ掛けられる。',{wallOnly:true}),
  'memento.bear':            it('クマのぬいぐるみ（娘のクマ）',1,1,R1,'furniture',false,['room'],'near','眺める','娘のいちばんのともだち。置くと、そこにちょこんと座る。'),
  'memento.flower_tag':      it('花の名札',1,1,R1,'furniture',false,['garden','room'],'near','名前を読む','娘が書いた、花の名前の札。'),
  'garden.pot':              it('鉢植え',1,1,R1,'furniture',true,['garden','room'],'near','眺める','花を育てる鉢。',{variants:['red','blue','yellow'],plantable:true}),
  'garden.flowerbed':        it('花壇',2,1,R2,'furniture',true,['garden'],'near','眺める','木枠で囲った小さな花壇。'),
  'garden.bench':            it('木のベンチ',2,1,R4,'furniture',true,['garden'],'front','座る','ふたりで並んで座れるベンチ。'),
  'garden.fence':            it('木の柵',1,1,R2,'furniture',true,['garden'],'none','','低い木の柵。'),
  'garden.stepping_stone':   it('飛び石',1,1,R1,'path',false,['garden'],'none','','庭に並べる平たい石。上に物も置ける。'),
  'garden.small_tree':       it('小さな木',1,1,R1,'furniture',true,['garden'],'near','眺める','引っ越したときに植えた若い木。'),
  'deco.rug':                it('ラグ',3,2,R2,'rug',false,['room'],'none','','やわらかいラグ。上に家具を置ける。'),
  'deco.sea_glass':          it('漂着ガラスの飾り',1,1,R1,'furniture',true,['room','garden'],'near','眺める','浜で拾った、角の丸いガラス。'),
  // ── フェーズ2 ──
  'furniture.toy_box':       it('おもちゃ箱',1,1,R1,'furniture',true,['room'],'near','遊ぶ','ふたの閉まりきらない、木のおもちゃ箱。',{kidUse:'play'}),
  'furniture.kid_desk':      it('娘の小さな机',1,1,R4,'furniture',true,['room'],'front','お絵かきを見る','娘の背丈に合わせた、ひくい机。クレヨンの跡がある。',{kidUse:'draw'}),
  'furniture.old_radio':     it('千代さんの古いラジオ',1,1,R1,'furniture',true,['room'],'near','ラジオを聴く','千代さんがゆずってくれた、木の箱のラジオ。「夜が長いけえ」',{kidUse:'radio'}),
  'memento.toolbox':         it('班長の古い工具箱',1,1,R1,'furniture',true,['room','garden'],'near','開けてみる','角のへこんだ赤い工具箱。取っ手に、手のあとがついている。'),
  'memento.recital_photo':   it('発表会の写真',1,1,R1,'wall',false,['room'],'wall','眺める','おゆうぎかいの舞台の写真。壁にだけ掛けられる。',{wallOnly:true}),
  'deco.wind_chime':         it('風鈴',1,1,R1,'wall',false,['room'],'wall','鳴らす','ガラスの風鈴。夢の海の色をしている。壁にだけ掛けられる。',{wallOnly:true}),
  'deco.sea_mobile':         it('海のモビール',1,1,R1,'wall',false,['room'],'wall','眺める','流木に、布の魚と貝を吊るしたモビール。壁にだけ掛けられる。',{wallOnly:true,kidUse:'mobile'}),
  'garden.nameplate':        it('家の表札',1,1,R1,'furniture',true,['garden'],'near','眺める','「だんのうら」と彫った小さな表札。'),
  'garden.clothesline':      it('物干し',3,1,R2,'furniture',true,['garden'],'side','洗濯物を干す','二本の柱に渡した物干し。ふたり分の洗濯物が揺れる。'),
  'light.string_lights':     it('庭の豆電球',2,1,R2,'furniture',false,['garden'],'self','灯りを点ける','二本の柱に渡した、小さな電球の列。下を通れる。',{light:true}),
  'garden.planter':          it('プランター',2,1,R2,'furniture',true,['garden'],'near','眺める','横長の木のプランター。種をひとつ植えられる。',{plantable:true}),
  'garden.watering_can':     it('じょうろ',1,1,R1,'furniture',false,['garden','room'],'near','水やりをする','ブリキのじょうろ。近くの鉢やプランターにまとめて水をあげられる。'),
  // ── 種（消費アイテム：置けない。空の鉢・プランターに植える） ──
  'seed.morning_glory':      it('あさがおの種',1,1,R1,'none',false,[],'none','','千代さんにもらった、あさがおの種。',{kind:'seed',species:'morning_glory'}),
  'seed.sunflower':          it('ひまわりの種',1,1,R1,'none',false,[],'none','','しましまの、ひまわりの種。',{kind:'seed',species:'sunflower'}),
  'seed.herb':               it('ハーブの種',1,1,R1,'none',false,[],'none','','いい匂いのする、ハーブの種。',{kind:'seed',species:'herb'}),
};
HOME.CATALOG['garden.pot'].plantable=true;
HOME.CATALOG['furniture.cushion'].kidUse='cushion';
HOME.CATALOG['furniture.bookshelf'].kidUse='read';
HOME.CATALOG['garden.pot'].kidUse='plants';
HOME.CATALOG['garden.planter'].kidUse='plants';
Object.keys(HOME.CATALOG).forEach(id=>{HOME.CATALOG[id].id=id;});

HOME.TILES={'floor.wood':{name:'木の床'},'floor.tatami':{name:'畳'},'floor.dark':{name:'濃い木の床'},'ground.grass':{name:'草地'}};

HOME.MATERIALS={
  wood: {name:'木材',  icon:'🪵'},
  cloth:{name:'布',    icon:'🧵'},
  metal:{name:'金具',  icon:'🔩'},
  sea:  {name:'海のかけら',icon:'🐚'},
};

// 並び順＝クラフト画面の表示順
HOME.RECIPES={
  repaired_shelf:{name:'棚を直す',        out:'furniture.repaired_shelf',n:1,mats:{wood:2,metal:1},note:'ガタついた棚を端材と金具で直す'},
  cushion:       {name:'クッションを縫う',out:'furniture.cushion',       n:1,mats:{cloth:2},note:'余り布でクッションを縫う'},
  flowerbed:     {name:'花壇を組む',      out:'garden.flowerbed',        n:1,mats:{wood:2},note:'板を組んで花壇の枠を作る'},
  fence:         {name:'柵を作る',        out:'garden.fence',            n:1,mats:{wood:1},note:'庭の柵を1本ふやす'},
  sea_glass:     {name:'ガラスの飾り',    out:'deco.sea_glass',          n:1,mats:{sea:1,metal:1},note:'拾ったガラスを金具で吊るす'},
  shell_lantern: {name:'貝殻ランタン',    out:'light.shell_lantern',     n:1,mats:{sea:2,metal:1},note:'夢で見た灯りを、現実の材料で'},
  // ── フェーズ2 ──（kid_desk/clothesline/string_lights/planter は最初から。ほかは RPG の章クリアで解放）
  kid_desk:      {name:'娘の机を作る',    out:'furniture.kid_desk',      n:1,mats:{wood:3},note:'娘の背丈に合わせた、ひくい机'},
  planter:       {name:'プランターを組む',out:'garden.planter',          n:1,mats:{wood:2},note:'横長の箱。種をひとつ植えられる'},
  clothesline:   {name:'物干しを立てる',  out:'garden.clothesline',      n:1,mats:{wood:2,cloth:1},note:'柱を二本立てて、ロープを渡す'},
  string_lights: {name:'豆電球をつなぐ',  out:'light.string_lights',     n:1,mats:{metal:2,sea:1},note:'庭に小さな灯りの列を'},
  wind_chime:    {name:'風鈴を吊るす',    out:'deco.wind_chime',         n:1,mats:{metal:1,sea:1},note:'夢の海の色をした、ガラスの風鈴'},
  sea_mobile:    {name:'海のモビール',    out:'deco.sea_mobile',         n:1,mats:{sea:2,cloth:1},note:'流木に、布の魚と貝を吊るす'},
  nameplate:     {name:'表札を彫る',      out:'garden.nameplate',        n:1,mats:{wood:1,metal:1},note:'「だんのうら」と彫った、家の表札'},
};
Object.keys(HOME.RECIPES).forEach(id=>{HOME.RECIPES[id].id=id;});

HOME.AREAS={
  room:  {name:'部屋',w:12,h:8, base:'floor.wood',  door:{x:6,y:7},exits:[{x:6,y:7}]},
  garden:{name:'庭',  w:16,h:12,base:'ground.grass',door:{x:7,y:0},gate:{x:0,y:6},exits:[{x:7,y:0},{x:0,y:6}]},
};
// フェーズ3：一回きりの拡張。広がるのは右と下だけ（既存の配置の座標はそのまま有効）。
//   部屋の出入口は新しい下端の行へ移る（旧出入口 (6,7) の真下の行とつながるので、到達できる範囲は減らない）
//   庭の戸口・門は同じ位置のまま
HOME.AREA_SIZES={
  room:  {base:{w:12,h:8, door:{x:6,y:7}},             expanded:{w:14,h:9, door:{x:7,y:8}}},
  garden:{base:{w:16,h:12,door:{x:7,y:0},gate:{x:0,y:6}},expanded:{w:20,h:14,door:{x:7,y:0},gate:{x:0,y:6}}},
};
// 外観（庭の上端の家の正面）・内装。時間も素材も使わない。並び順＝選択肢の表示順、先頭が初期値
HOME.EXTERIOR={
  roof:{label:'屋根',opts:{navy:'紺',red:'赤',green:'緑',brown:'こげ茶'}},
  wall:{label:'外壁',opts:{cream:'クリーム',white:'白',wood:'板張り'}},
  door:{label:'戸',  opts:{wood:'木',blue:'青'}},
};
HOME.WALLPAPERS={lavender:'藤色',mint:'ミント',cream:'クリーム',night:'夜空'};
HOME.FLOORS={'floor.wood':'木の床','floor.tatami':'畳','floor.dark':'濃い木の床'};

HOME.BAL={
  craftMin:30,          // クラフト1回の時間（分）
  craftFatigue:2,       // クラフト1回の疲労
  dailyMentalCap:4,     // 家で過ごす効果の精神+（1日の上限）
  talkMental:1,         // 娘と話す
  waterMental:1,        // 水やり
  growPerStage:2,       // 何日分の成長で1段階
  waterGraceDays:2,     // 水やりから何日以内なら育つ
  maxStage:4,
  // フェーズ3：部屋・庭を広げる（一回きり）。借金の返済と競合しすぎない額
  expand:{
    room:  {money:15000,mats:{wood:5,metal:2}},
    garden:{money:8000, mats:{wood:4,cloth:1}},
  },
  // 季節ごとの育ち：1＝毎日、2＝2日に1回（冬はゆっくり。枯れない）
  seasonGrowEvery:{summer:1,autumn:1,winter:2,spring:1},
  particleMax:60,       // 天候・季節のパーティクルの上限
};

HOME.ROT_DIR={0:'down',90:'left',180:'up',270:'right'};
// 娘が布団で寝ている時間（23時〜翌5時台）。hour が数でなければ起きている扱い
HOME.isKidSleepHour=function(hour){const h=Math.floor(+hour);if(!Number.isFinite(h))return false;const n=((h%24)+24)%24;return n>=23||n<6;};
HOME.STAGE_NAMES=['種','芽','つぼみの準備','つぼみ','花'];
HOME.POT_COLORS={red:'赤',blue:'青',yellow:'黄'};
// 植物の種類（plants[id].species）。seed＝フェーズ1の「娘の花」（種アイテムは無い）
HOME.PLANT_SPECIES={
  seed:         {name:'花',      seedId:null,                 defName:'ひなた',  color:'pink'},
  morning_glory:{name:'あさがお',seedId:'seed.morning_glory', defName:'あさがお',color:'blue',  bloom:['summer','autumn']},  // 夏〜初秋に咲く
  sunflower:    {name:'ひまわり',seedId:'seed.sunflower',     defName:'ひまわり',color:'yellow',bloom:['summer']},
  herb:         {name:'ハーブ',  seedId:'seed.herb',          defName:'ハーブ',  color:'white'},
};
HOME.isSeed=id=>{const c=HOME.CATALOG[id];return !!(c&&c.kind==='seed');};
HOME.isPlantable=id=>{const c=HOME.CATALOG[id];return !!(c&&c.plantable);};
})();
