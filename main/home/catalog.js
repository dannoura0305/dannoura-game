// ═══════════════════════════════════════════════════════════
// 家・庭づくり：定義（アイテム・素材・レシピ・広さ・バランス）
//   HOME.CATALOG[itemId]  … 名前・大きさ・回転・レイヤー・置ける場所・使い方
//   HOME.MATERIALS[id]    … 素材の名前
//   HOME.RECIPES[id]      … クラフトの材料と完成品
//   HOME.AREAS[area]      … 部屋（12×8）・庭（16×12）の広さと出入口
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
};
Object.keys(HOME.CATALOG).forEach(id=>{HOME.CATALOG[id].id=id;});

HOME.TILES={'floor.wood':{name:'木の床'},'ground.grass':{name:'草地'}};

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
};
Object.keys(HOME.RECIPES).forEach(id=>{HOME.RECIPES[id].id=id;});

HOME.AREAS={
  room:  {name:'部屋',w:12,h:8, base:'floor.wood',  door:{x:6,y:7},exits:[{x:6,y:7}]},
  garden:{name:'庭',  w:16,h:12,base:'ground.grass',door:{x:7,y:0},gate:{x:0,y:6},exits:[{x:7,y:0},{x:0,y:6}]},
};

HOME.BAL={
  craftMin:30,          // クラフト1回の時間（分）
  craftFatigue:2,       // クラフト1回の疲労
  dailyMentalCap:4,     // 家で過ごす効果の精神+（1日の上限）
  talkMental:1,         // 娘と話す
  waterMental:1,        // 水やり
  growPerStage:2,       // 何日分の成長で1段階
  waterGraceDays:2,     // 水やりから何日以内なら育つ
  maxStage:4,
};

HOME.ROT_DIR={0:'down',90:'left',180:'up',270:'right'};
HOME.STAGE_NAMES=['種','芽','つぼみの準備','つぼみ','花'];
HOME.POT_COLORS={red:'赤',blue:'青',yellow:'黄'};
})();
