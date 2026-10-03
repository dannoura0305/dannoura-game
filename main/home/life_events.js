// ═══════════════════════════════════════════════════════════
// 暮らしの生活イベント（HOME.life_events）：千代さん・班長・発表会
//   千代さん ①庭で垣根越しにあいさつ、あさがおの種（6日目〜・庭）
//            ②古いラジオをゆずってくれる（①の3日後〜・9日目〜）
//            ③ベンチがあれば、娘と並んで座る（②の2日後〜・14日目〜・庭にベンチ）
//   班長     ①工場の仕事を何度かこなした後、休みの日に古い工具箱（10日目〜）
//            ②物干しを一緒に立てる？（頼る／ひとりでやる）→ bonds の「頼る」（①の4日後〜）
//   発表会   行けた → 発表会の写真 ／ 行けなかった → 後日、娘と話し合う（bonds の「話し合い」）
// 各イベントは任意・一度きり。状態は gs.homeData.events['life.*']、贈り物は grantOnce、思い出は固定 id。
// 家を開いたときに出るのは「窓辺の小さな約束」が何もしなかったときだけ・一回の開閉で一つまで・一日一つまで。
// フック：onOpen / talkKid / useItem は前の処理（events.js）を先に呼ぶ。talkVisitor は新規。
// 設計：docs/home-story-design.md「生活イベント」
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
HOME.hooks=HOME.hooks||{};
const SIM=(()=>{try{return !!(root.frameElement&&/simulator/.test(root.parent.location.pathname));}catch(e){return false;}})();

function G(){try{return typeof gs!=='undefined'?gs:null;}catch(e){return null;}}
function day(){const g=G();return g&&Number.isFinite(+g.day)?+g.day:1;}
function hour(){const g=G();return g&&Number.isFinite(+g.hour)?+g.hour:22;}
function hd(){
  try{if(typeof HOME.ensure==='function')return HOME.ensure();}catch(e){}
  const g=G();return g&&g.homeData&&typeof g.homeData==='object'?g.homeData:null;
}
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
function F(){const g=G();return g&&g.story&&isObj(g.story.flags)?g.story.flags:{};}
function st(id){
  const h=hd();if(!h)return null;
  if(!isObj(h.events))h.events={};
  const k='life.'+id;
  if(!isObj(h.events[k]))h.events[k]={};
  return h.events[k];
}
function peek(id){const h=hd();const e=h&&isObj(h.events)?h.events['life.'+id]:null;return isObj(e)?e:{};}

// ── 配置の補助 ──
function placementsOf(h,area){const A=h&&h[area];return A&&Array.isArray(A.placements)?A.placements:[];}
function placedIn(h,area,itemId){return placementsOf(h,area).filter(p=>p&&p.itemId===itemId);}
function isPlaced(h,itemId){return placedIn(h,'room',itemId).length+placedIn(h,'garden',itemId).length>0;}
function layerOf(itemId){const c=HOME.CATALOG&&HOME.CATALOG[itemId];return (c&&c.layer)||'furniture';}
function known(itemId){return !!(HOME.CATALOG&&HOME.CATALOG[itemId]);}
// 贈り物を置ける場所に置く（出入口・通路・既存の家具の使用位置をふさがない）。置けなければ収納のまま
function placeGift(itemId,area,target){
  const h=hd();if(!h||!known(itemId))return null;
  const c=HOME.CATALOG[itemId];
  if(c.areas&&c.areas.indexOf(area)<0)area=c.areas[0];
  let spot=null;
  try{spot=HOME.events&&HOME.events._findSpot?HOME.events._findSpot(h,area,itemId,'default',target):null;}catch(e){spot=null;}
  if(!spot)return null;
  let id=null;try{id=HOME.newInstanceId?HOME.newInstanceId():null;}catch(e){}
  if(!id){if(!Number.isFinite(+h.seq))h.seq=1;id='p'+(h.seq++);}
  const P={instanceId:id,itemId,x:spot.x,y:spot.y,rotation:0,variant:'default',layer:layerOf(itemId)};
  placementsOf(h,area).push(P);
  try{HOME.emit&&HOME.emit('placed',{area,placement:P,by:'event'});}catch(e){}
  return {area,P};
}
function give(rewardId,itemId,n){
  const f=()=>{try{HOME.addItem&&HOME.addItem(itemId,n||1);}catch(e){}};
  if(typeof HOME.grantOnce==='function')return !!HOME.grantOnce(rewardId,f);
  const s=st('meta');s.given=s.given||{};if(s.given[rewardId])return false;s.given[rewardId]=day();f();return true;
}
function giveSeed(rewardId,species,n){
  const f=()=>{
    let ok=false;
    try{if(typeof HOME.giveSeed==='function')ok=HOME.giveSeed(species,n)!==false;}catch(e){ok=false;}
    if(!ok){try{HOME.addItem&&HOME.addItem('seed.'+species,n);}catch(e){}}
  };
  if(typeof HOME.grantOnce==='function')return !!HOME.grantOnce(rewardId,f);
  f();return true;
}

// ── 会話の部品 ──
const NAME={chiyo:'千代さん',hancho:'班長',dan:'だんのうら',kid:'娘'};
// 会話UIが千代さん・班長の名札に対応していなければ、ナレーションに「名前「…」」で出す
function named(who){
  try{
    const u=HOME.ui||{};
    if(u.names&&u.names[who])return true;
    if(u.speakers&&u.speakers[who])return true;
    if(typeof u.knows==='function'&&u.knows(who))return true;
    if(HOME.WHO_NAME&&HOME.WHO_NAME[who])return true;
  }catch(e){}
  return false;
}
function fmt(L){
  if(L&&(L.who==='chiyo'||L.who==='hancho')&&!named(L.who))return {who:'',face:'',text:`${NAME[L.who]}「${L.text}」`};
  return L;
}
const say=lines=>{try{return HOME.ui&&HOME.ui.say?Promise.resolve(HOME.ui.say(lines.filter(Boolean).map(fmt))):Promise.resolve();}catch(e){return Promise.resolve();}};
const alive=()=>{try{return typeof HOME.isOpen!=='function'||!!HOME.isOpen();}catch(e){return true;}};
const choice=(q,opts)=>{try{return HOME.ui&&HOME.ui.choice?Promise.resolve(HOME.ui.choice(q,opts)).then(i=>alive()?i:-1):Promise.resolve(-1);}catch(e){return Promise.resolve(-1);}};
const toast=t=>{try{HOME.ui&&HOME.ui.toast&&HOME.ui.toast(t);}catch(e){}};
const D=(text,face)=>({who:'dan',face:face||'',text});
const K=(text,face)=>({who:'kid',face:face||'',text});
const C=text=>({who:'chiyo',face:'',text,name:NAME.chiyo});
const H=text=>({who:'hancho',face:'',text,name:NAME.hancho});
const N=text=>({who:'',face:'',text});
const when=(c,...a)=>c?a:[];

function memo(id,what,text,who,opt){
  try{
    if(!HOME.memories||typeof HOME.memories.add!=='function')return false;
    return HOME.memories.add(Object.assign({id,day:day(),who,what,text,items:[],snapshot:null},opt||{}));
  }catch(e){return false;}
}
function snapOf(area){try{return HOME.memories&&HOME.memories.snapshotOf?HOME.memories.snapshotOf(area):null;}catch(e){return null;}}
function save(){try{HOME.save&&HOME.save();}catch(e){}}
function bond(kind,key){try{return HOME.bonds&&HOME.bonds.note?HOME.bonds.note(kind,key):false;}catch(e){return false;}}
function mental(){
  try{
    if(typeof HOME.addHomeMental!=='function')return 0;
    const g=+HOME.addHomeMental((HOME.BAL&&HOME.BAL.talkMental)||1)||0;
    if(g>0){toast(`🙂 心が少し軽くなった（精神+${g}）`);try{typeof updateStats==='function'&&updateStats();}catch(e){}}
    return g;
  }catch(e){return 0;}
}

// ── 訪問者（画面に出すだけ・保存しない） ──
let visitorOn=null;
function curArea(fallback){try{const S=HOME._screen;if(S&&S.area)return S.area;}catch(e){}return fallback||'room';}
function doorOf(area){
  const A=HOME.AREAS&&HOME.AREAS[area];
  if(area==='garden')return Object.assign({dir:'right'},(A&&A.gate)||{x:0,y:6});
  return Object.assign({dir:'up'},(A&&A.door)||{x:6,y:7});
}
function visit(who,area,pos){
  const p=pos||doorOf(area);
  try{if(typeof HOME.setVisitor==='function'){HOME.setVisitor({who,area,x:p.x,y:p.y,dir:p.dir||'down',pose:p.pose||'stand'});visitorOn=who;}}catch(e){}
}
function leave(){visitorOn=null;try{HOME.clearVisitor&&HOME.clearVisitor();}catch(e){}}
// ベンチに座る位置（ベンチの使用マス）
function benchSeat(h){
  const b=placedIn(h,'garden','garden.bench')[0];if(!b)return null;
  let c=null;try{c=HOME.useCell?HOME.useCell('garden',placementsOf(h,'garden'),b):null;}catch(e){c=null;}
  const dir={0:'down',90:'left',180:'up',270:'right'}[b.rotation|0]||'down';
  return c?{x:c.x,y:c.y,dir,pose:'sit'}:{x:b.x,y:b.y,dir,pose:'sit'};
}

// ═══════════ 各イベント ═══════════
// 千代さん ① あさがおの種（庭）
async function chiyoSeed(area){
  const f=F();
  visit('chiyo','garden');
  await say([
    N('垣根の向こうから、白いお団子頭がひょいとのぞいた。かんざしが、月の光で小さく光る。'),
    C('おや、あんた。庭におるの、はじめて見たねえ。'),
    D('あら、千代さん。こんばんは。……夜の庭って、案外落ち着くんですよ'),
    K('ちよさん、こんばんは！'),
    C('はい、こんばんは。……ちゃんとあいさつができて、ええ子じゃねえ。'),
    ...when(f.chiyo_trust,C('この子、うちで寝るときもね、「パパ、おしごと？」って一回だけ聞いて、あとはよう寝よるんよ。')),
    C('これ、あさがおの種。去年うちで咲いたのを、とっといたんよ。おすそわけ。'),
    C('あさがおはね、朝にしか咲かんのよ。……朝が来るのが、ちょっとだけ楽しみになるけえ。'),
    ...(f.promise_morning
      ?[C('「おはよう」、ちゃんと言いよるかね。'),D('……はい。毎朝。寝ぼけた声ですけど'),C('ほうね。それでええんよ。')]
      :[D('朝、ですか。……そうですね。朝が来るのは、悪いことじゃないですね')]),
    K('あさがお、なにいろ？'),
    C('咲いてからのお楽しみ。……それがええんよ。'),
    D('きのどくなぁ……あ、いえ。ありがとうございます'),
    C('きのどく？　……ああ、「ありがとう」いう意味かね。ふふ、ええ言葉じゃねえ。'),
  ]);
  if(!alive())return true;
  const s=st('chiyo_seed');if(s.done)return true;
  s.done=day();
  const got=giveSeed('life.chiyo.seed','morning_glory',2);
  memo('life.chiyo.1','あさがおの種','垣根越しに、千代さんがあさがおの種をくれた。「朝が来るのが、ちょっとだけ楽しみになるけえ」',['dan','kid','chiyo']);
  if(got)toast('🌱 あさがおの種をもらった（空いている鉢・プランターに植えられます）');
  save();
  return true;
}
// 千代さん ② 古いラジオ
async function chiyoRadio(area){
  visit('chiyo',area);
  await say([
    N('戸を叩く音。千代さんが、古いラジオを両手で抱えて立っていた。'),
    C('夜分にごめんね。これ、もらってくれんかね。'),
    C('うちの古いラジオ。孫が新しいのを送ってくれてねえ。……捨てるのも、かわいそうで。'),
    D('いいんですか？　こんな大事そうなもの'),
    C('ええんよ。年寄りは夜が長いけえ、ずうっとこれ聞いて過ごしてきたんよ。'),
    C('でもこの頃はね、壁の向こうの声のほうを、よう聞きよる。'),
    D('……やだ、まだ聞こえてます？'),
    C('ちょっとだけね。ラジオみたいで、よう眠れるんよ。前にも言うたじゃろ。'),
    K('らじお！　パパのこえ、でる？'),
    C('ふふ。パパの声は、壁のほうから聞こえるけえね。'),
  ]);
  if(!alive())return true;
  const c=await choice('どうする？',[
    {t:'「……ありがたく、いただきます」',s:'千代さんの厚意に甘える'},
    {t:'「せめて、お茶でも飲んでいってください」',s:'少しだけ、一緒に座る'},
  ]);
  if(c<0&&!alive())return true;
  if(c===1){
    await say([
      C('ほいじゃ、一杯だけ。……あんたも座りんさい。立ちっぱなしは、ようないけえ。'),
      N('湯のみがふたつと、麦茶のコップがひとつ。ちゃぶ台を三人で囲んだ。'),
      N('ラジオから、遠い町の天気予報が、小さく流れていた。'),
    ]);
  }else{
    await say([
      D('……じゃあ、ありがたく。大事にします'),
      C('うん。夜が長いときは、つけてやりんさい。'),
    ]);
  }
  const s=st('chiyo_radio');if(s.done)return true;
  s.done=day();s.tea=c===1;
  bond(c===1?'rest':'help',c===1?'home.chiyo_tea':'home.chiyo_radio');
  let placed=null;
  if(give('life.chiyo.radio','furniture.old_radio',1))placed=placeGift('furniture.old_radio','room',{x:2,y:0});
  memo('life.chiyo.2','千代さんのラジオ',`千代さんが、古いラジオをゆずってくれた。「年寄りは夜が長いけえ」${c===1?'\n三人で、麦茶を一杯だけ飲んだ。':''}`,['dan','kid','chiyo'],
    {items:['furniture.old_radio'],snapshot:placed?snapOf('room'):null});
  if(known('furniture.old_radio'))toast(placed?'📻 千代さんのラジオを部屋に置きました':'📻 千代さんのラジオを収納に入れました');
  save();
  return true;
}
// 千代さん ③ ベンチ（庭）
async function chiyoBench(area){
  const f=F();const h=hd();
  visit('chiyo','garden',benchSeat(h));
  const recitalSoon=(f.promise_recital||f.maybe_recital)&&day()<=27&&!f.kept_promise&&!f.missed_recital;
  await say([
    N('ベンチに、千代さんとあの子が並んで座っていた。垣根の戸が、少しだけ開いている。'),
    K('パパ、ちよさんと、おつきさま みてたの。'),
    C('この子がね、「ちよさんのおうちからも、おつきさま みえる？」って聞くけえ。見えるよ、言うたんよ。'),
    C('下関の海の上の月も、ここの月も、おんなじ月じゃけえね。'),
    K('ちよさんの うみ、くらい？'),
    C('夜はくらいよ。……でもね、灯りがひとつあれば、ちゃんと帰れるんよ。'),
    ...(recitalSoon
      ?[K('しってる！　はっぴょうかいで、それ いうの。'),K('……くらいうみでも、あかりがあれば、かえれるよ。'),C('まあ。上手じゃねえ。')]
      :[K('うん。パパの こえも、あかりみたいだよね。'),C('ほうじゃねえ。壁越しでも、ちゃんと届きよるよ。')]),
    C('あんたも座りんさい。三人なら、ちょうどええ。'),
  ]);
  if(!alive())return true;
  const c=await choice('どうする？',[
    {t:'隣に座る',s:'少しだけ、休んでいく'},
    {t:'「洗いものが残ってて……」',s:'また今度'},
  ]);
  if(c<0&&!alive())return true;
  if(c===0){
    await say([
      N('ベンチの端に腰を下ろした。木が、ぎし、と鳴った。'),
      N('しばらく、だれも何も言わなかった。……それで、よかった。'),
      C('……ええ顔になったね、あんた。'),
      D('そうですか？　……そうかもしれないわね'),
    ]);
  }else{
    await say([
      C('ほうね。ほいじゃ、また今度ね。……無理しなさんなよ。'),
      K('パパ、つぎは いっしょね。'),
    ]);
  }
  const s=st('chiyo_bench');if(s.done)return true;
  s.done=day();s.sat=c===0;
  if(c===0)bond('rest','home.bench');
  memo('life.chiyo.3',c===0?'ベンチの三人':'ベンチのふたり',
    c===0?'千代さんとあの子と、三人で並んで月を見た。「灯りがひとつあれば、ちゃんと帰れるんよ」'
         :'千代さんとあの子が、ベンチで月を見ていた。「灯りがひとつあれば、ちゃんと帰れるんよ」',
    ['dan','kid','chiyo'],{items:['garden.bench'],snapshot:snapOf('garden')});
  save();
  return true;
}
// 班長 ① 古い工具箱
async function hanchoToolbox(area){
  const h=hd();
  const shelf=!!((h&&h.flags&&h.flags.repairedShelf)||isPlaced(h,'furniture.repaired_shelf'));
  visit('hancho',area);
  await say([
    N('戸を叩く音。紺の作業着に黄色いヘルメットのまま、班長が立っていた。手に、錆の浮いた古い工具箱。'),
    H('おう。休みの日に悪いな。近く通ったもんでな。'),
    H('これ、俺が若い頃から使うとった工具箱や。新しいのが支給されてな、置き場がないねん。'),
    H('お前、最近ちゃんと手ぇ動かしとるやろ。……持っとけ。'),
    D('いいんですか、こんな大事なもの'),
    ...(shelf
      ?[N('班長の目が、部屋の隅の棚で止まった。'),H('……この棚、お前が直したんか。'),K('わたしも てつだったの！　ねじ、もってたの。'),H('そうか。……ねじの締め具合、ええ仕事や。ええ助手もおるしな。')]
      :[H('家のもんも、直せるもんは直したったらええ。直したら、ちょっとは好きになるもんや。')]),
    K('はんちょうさん、ヘルメット きいろ！'),
    H('おう。目立つやろ。暗いとこでも、見つけてもらえるようにな。'),
    D('……ありがとうございます。大事に使います'),
    H('使い倒せ。道具は、しまっとくもんやない。'),
    N('それだけ言って、班長は帰りかけて——戸口で一度だけ振り返った。'),
    H('……寝ろよ。'),
  ]);
  if(!alive())return true;
  const s=st('hancho_toolbox');if(s.done)return true;
  s.done=day();
  let placed=null;
  if(give('life.hancho.toolbox','memento.toolbox',1))placed=placeGift('memento.toolbox',area==='garden'?'garden':'room',area==='garden'?{x:9,y:1}:{x:10,y:1});
  memo('life.hancho.1','班長の工具箱',`班長が、若い頃から使っていた工具箱を持ってきてくれた。${shelf?'「ええ仕事や」と、直した棚を見て言った。':'「道具は、しまっとくもんやない」'}`,['dan','kid','hancho'],
    {items:['memento.toolbox'],snapshot:placed?snapOf(placed.area):null});
  if(known('memento.toolbox'))toast(placed?'🧰 班長の工具箱を置きました':'🧰 班長の工具箱を収納に入れました');
  save();
  return true;
}
// 班長 ② 物干しを立てる（頼る／ひとりで）
async function hanchoLine(area){
  const f=F();
  visit('hancho',area);
  await say([
    N('物干しの支柱を立てようとしていた。片手で柱を押さえて、片手で金具を締める。……手が、足りない。'),
    N('「おう」と、戸口から声がした。工具箱の鍵を届けに来た班長だった。'),
    H('鍵、渡し忘れとった。……なにしとんねん、それ。'),
    D('物干しです。……ひとりで立てようとしてて'),
    H('…………。'),
  ]);
  if(!alive())return true;
  const c=await choice('どうする？',[
    {t:'「班長。手を貸してもらえますか」',s:'頼る'},
    {t:'「大丈夫です。ひとりでやれます」',s:'ひとりで立てる'},
  ]);
  if(c<0&&!alive())return true;
  const rely=c===0;
  if(rely){
    await say([
      f.asked_help?H('……前にも言うたやろ。頼れって。ほれ、そっち持て。'):H('おう。こういうのは、二人でやるもんや。'),
      N('班長が柱を押さえ、だんのうらが金具を締める。五分で終わった。'),
      H('俺もな、娘が小さい頃、ひとりで物干し立てようとして、指はさんでな。'),
      H('あいつ、泣いとる俺見て、ばんそうこう貼ってくれたわ。……二十八になっても、まだそれ言われる。'),
      K('パパ、ゆび、だいじょうぶ？'),
      D('大丈夫よ。今日は、ふたりだったから'),
    ]);
  }else{
    await say([
      H('……そうか。'),
      ...when(f.refused_help,H('大丈夫じゃない奴ほど、そう言うんやけどな。')),
      H('ほな、鍵だけ置いとく。……指、はさむなよ。'),
      N('柱は、少しだけ傾いて立った。時間は、思ったよりかかった。'),
      K('パパ、ひとりで たてたの？　……すごいね。でも、ちょっと ななめ。'),
      D('……そうね。次は、誰かに押さえてもらおうかしら'),
    ]);
  }
  const s=st('hancho_line');if(s.done)return true;
  s.done=day();s.relied=rely;
  if(rely)bond('help','home.hancho_line');
  bond('acted','home.clothesline');
  let placed=null;
  if(give('life.hancho.clothesline','garden.clothesline',1))placed=placeGift('garden.clothesline','garden',{x:3,y:9});
  memo('life.hancho.2',rely?'ふたりで立てた物干し':'ひとりで立てた物干し',
    rely?'班長と、物干しを立てた。五分で終わった。「こういうのは、二人でやるもんや」'
        :'ひとりで物干しを立てた。少しだけ、ななめ。「次は、誰かに押さえてもらおうかしら」',
    ['dan','kid','hancho'],{items:['garden.clothesline'],snapshot:placed?snapOf('garden'):null});
  if(known('garden.clothesline'))toast(placed?'🧺 物干しを庭に立てました':'🧺 物干しを収納に入れました');
  save();
  return true;
}
// 発表会：行けた → 写真
async function recitalPhoto(area){
  const f=F();
  await say([
    K('パパ、これ！　せんせいが くれたの。'),
    N('一枚の写真。暗くした舞台の上で、段ボールの灯籠を持ったあの子が、客席に向かって大きく手を振っている。'),
    f.late_recital?N('……最後の挨拶の写真だった。ぎりぎりで間に合った、あの日の。'):N('劇の途中なのに。……振っている先は、いちばん後ろの席だ。'),
    K('これ、パパを みつけたとこ。'),
    D('……飾りましょ。いちばん目につくところに'),
    ...when(f.hancho_covered,D('班長にも、見せてあげなくちゃね。あの日、三号を引き受けてくれたんだから')),
    K('うん！'),
  ]);
  if(!alive())return true;
  const s=st('recital');if(s.photo)return true;
  s.photo=day();
  let placed=null;
  if(give('life.recital.photo','memento.recital_photo',1))placed=placeGift('memento.recital_photo','room',{x:4,y:0});
  memo('life.recital.photo','発表会の写真',`舞台の上で、灯籠を振るあの子。「これ、パパを みつけたとこ」${f.late_recital?'\n最後の挨拶に、ぎりぎり間に合った日。':''}`,['dan','kid'],
    {items:['memento.recital_photo'],snapshot:placed?snapOf('room'):null});
  if(known('memento.recital_photo'))toast(placed?'🖼 発表会の写真を壁に飾りました':'🖼 発表会の写真を収納に入れました');
  save();
  return true;
}
// 発表会：行けなかった → 話し合う（話さなければ、別の日にまた）
async function recitalTalk(area){
  const f=F();const promised=!!f.promise_recital;
  await say([
    N('あの日から、あの子は発表会のことを口にしない。'),
    f.chiyo_recital?K('……ちよさんの ビデオ、みた。','sad'):N('棚の上に、『パパのぶん』と書いた段ボールの灯籠が、まだ置いてある。'),
  ]);
  if(!alive())return true;
  const c=await choice('どうする？',[
    {t:'「ちゃんと、話しましょ」',s:'あの日のことを話す'},
    {t:'……今夜は、まだ言葉が出ない',s:'また、別の日に'},
  ]);
  if(c<0&&!alive())return true;
  const s=st('recital');
  if(c!==0){
    await say([N('言葉が、喉の奥でつかえた。'),K('……パパ、おやすみ。'),D('……おやすみ')]);
    s.deferred=day();save();
    return true;
  }
  await say([
    D(promised?'約束、守れなかったわね。……ごめんね':'行けなくて、ごめんね。……ほんとは、見たかったのよ'),
    K('……さみしかった。','sad'),
    K('いちばんうしろの せき、ずっと みてたの。'),
    D('……うん'),
    D('ねえ。いまここで、パパにだけ、やってみせてくれない？'),
    K('……いいよ。'),
    N('あの子は灯籠を持って、ちゃぶ台の前に立った。'),
    K('……くらいうみでも、あかりがあれば、かえれるよ。'),
    N('観客は、ひとり。拍手も、ひとり分。……それでも、あの子はちゃんとお辞儀をした。'),
    K('パパ、つぎは、きてね。'),
    D('……ええ。それから、行けないときは、ちゃんと先に言うわ。約束の、約束ね'),
    K('やくそくの、やくそく。……へんなの。','smile'),
  ]);
  if(!alive())return true;
  if(s.talked)return true;
  s.talked=day();
  bond('talk','recital');
  memo('life.recital.talk','ひとり分の客席','行けなかった発表会のことを、あの子と話した。ちゃぶ台の前で、台詞をひとつ聞かせてくれた。「くらいうみでも、あかりがあれば、かえれるよ」',['dan','kid']);
  save();
  return true;
}

// ═══════════ どれを出すか（純ロジック） ═══════════
const RUN={chiyo_seed:chiyoSeed,chiyo_radio:chiyoRadio,chiyo_bench:chiyoBench,hancho_toolbox:hanchoToolbox,hancho_line:hanchoLine,recital_photo:recitalPhoto,recital_talk:recitalTalk};
const restDay=d=>d%7===6||d%7===0;   // 27日が土曜日
function workReady(){
  let n=0;try{n=HOME.bonds&&HOME.bonds.workDays?HOME.bonds.workDays():0;}catch(e){}
  const g=G();
  return n>=4||(g&&+g.jobRep>=60);
}
function flowerBusy(){
  try{
    const s=HOME.events&&HOME.events.state?HOME.events.state():null;
    return !!(s&&+s.step===1);          // 植える途中（色・場所・名前を決めている途中）
  }catch(e){return false;}
}
function pending(area,o){
  o=o||{};
  const h=hd();if(!h)return null;
  const d=day(),f=F();
  const meta=peek('meta');
  if(!o.ignoreDaily&&meta.lastDay===d)return null;      // 一日一つまで
  if(flowerBusy())return null;
  const rec=peek('recital');
  if(f.kept_promise&&!rec.photo)return 'recital_photo';
  if(f.missed_recital&&!f.kept_promise&&!rec.talked&&rec.deferred!==d)return 'recital_talk';
  if(o.kidOnly)return null;
  const seed=peek('chiyo_seed'),radio=peek('chiyo_radio'),bench=peek('chiyo_bench'),tb=peek('hancho_toolbox'),line=peek('hancho_line');
  if(!seed.done&&area==='garden'&&d>=6)return 'chiyo_seed';
  if(seed.done&&!radio.done&&d>=seed.done+3&&d>=9)return 'chiyo_radio';
  if(!tb.done&&d>=10&&workReady()){
    const el=peek('hancho_toolbox').elig;
    if(restDay(d)||(el&&d>=el+3))return 'hancho_toolbox';
  }
  if(radio.done&&!bench.done&&area==='garden'&&d>=14&&d>=radio.done+2&&placedIn(h,'garden','garden.bench').length)return 'chiyo_bench';
  if(tb.done&&!line.done&&d>=tb.done+4)return 'hancho_line';
  return null;
}

let busy=false;
async function runEvent(id,area){
  if(busy||!RUN[id])return false;
  busy=true;
  try{
    const r=await RUN[id](area);
    const m=st('meta');if(m)m.lastDay=day();
    return !!r;
  }catch(e){try{console.warn('[home/life]',id,e);}catch(_){}return false;}
  finally{busy=false;}
}
function tryRun(area,o){
  const id=pending(area,o);
  if(!id)return Promise.resolve(false);
  return runEvent(id,area);
}

// ═══════════ 娘のいつもの会話（過ごし方・植えた種類・もらった物で変わる） ═══════════
function activity(){
  try{
    if(typeof HOME.kidActivity!=='function')return '';
    const a=HOME.kidActivity();
    if(!a)return '';
    if(typeof a==='string')return a;
    return String(a.kind||a.type||a.activity||a.id||a.itemId||'');
  }catch(e){return '';}
}
function asleep(act){return /sleep|nap|寝/.test(act||'');}
const ACT_LINES=[
  [/read|book|本/,[K('パパ、これ よんで。……さいごの ページだけで いいから。'),D('最後だけ？　……いいわよ。最後だけ、ゆっくりね')]],
  [/draw|desk|kid_desk|絵/,[K('いま、パパ かいてるの。かみのけ、むらさき。'),D('あら、似てるじゃない。もうちょっと美人にしてちょうだい')]],
  [/toy|play|遊/,[K('くまさんと、おみせやさんごっこ。パパ、なに かいますか？'),D('じゃあ……「おやすみ」を、ひとつくださいな')]],
  [/radio/,[K('ラジオ、ざーって いってる。うみの おとみたい。'),D('千代さんちの、夜のお供だったのよ。それ')]],
  [/mobile|chime|look_up|見上/,[K('おさかな、くるくるしてる。……ねむくなっちゃう。','sleepy'),D('なっちゃいなさい。パパ、ここにいるから')]],
  [/plant|pot|planter|flower|garden|water|植/,[K('はっぱに、おみず ついてる。きらきら。'),D('朝になったら、もっと光るわよ')]],
  [/cushion|sit|座/,[K('ここ、わたしの せき。パパは となりね。'),D('はいはい。お隣、失礼するわね')]],
];
const SPECIES_LINES={
  morning_glory:[K('あさがお、あさに さくんだって。ちよさんが いってた。パパ、あさ、おきれる？'),D('……起きるわよ。目覚ましより先に、アンタが起こしてくれるもの')],
  sunflower:[K('ひまわり、わたしより おおきく なるかな。'),D('なるかもね。そしたら、毎日見上げなくちゃ')],
  herb:[K('このはっぱ、いいにおい。パパの ごはんに いれる？'),D('いいわね。ちょっとだけ、おしゃれな夕ごはんにしましょ')],
};
function kidVariety(h){
  const pool=[];
  const act=activity();
  for(const [re,lines] of ACT_LINES)if(re.test(act)){pool.push(lines);break;}
  try{
    const sp=new Set(Object.values(h.plants||{}).map(p=>p&&p.species).filter(Boolean));
    sp.forEach(k=>{if(SPECIES_LINES[k])pool.push(SPECIES_LINES[k]);});
  }catch(e){}
  if(isPlaced(h,'furniture.old_radio'))pool.push([K('ちよさんの ラジオ、パパの こえ、でないね。'),D('出ないわよ。……パパの声は、壁の向こうの千代さん専用なの')]);
  if(isPlaced(h,'memento.toolbox'))pool.push([K('はんちょうさんの はこ、おもたいね。なにが はいってるの？'),D('ねじと、スパナと……班長の、若い頃の時間ね')]);
  if(isPlaced(h,'memento.recital_photo'))pool.push([K('しゃしんの わたし、あかり もってる！'),D('そうよ。いちばん明るかったわよ')]);
  if(isPlaced(h,'garden.clothesline'))pool.push([K('ものほし、パパの シャツと わたしの くつした、ならんでる。'),D('風が強い日は、くつしたが先に飛んでいくのよね')]);
  if(isPlaced(h,'deco.wind_chime'))pool.push([K('ふうりん、ちりんって いった。だれか きたの？'),D('風よ。……夢の中で聞いた音に、ちょっと似てるの')]);
  if(isPlaced(h,'garden.nameplate'))pool.push([K('ひょうさつ、パパと わたしの いえ、って かいてあるの？'),D('そうよ。ちゃんと、ふたりの家')]);
  const radio=peek('chiyo_radio'),bench=peek('chiyo_bench');
  if(radio.done&&!bench.done&&!placedIn(h,'garden','garden.bench').length)pool.push([K('ちよさんと、おにわで すわって おはなし したいな。ベンチ、ある？'),D('しまってあるのがあったわね。出してあげましょうか')]);
  return pool;
}
let talkN=0;
function sleepLines(){
  return [N('布団の中で、小さな寝息。……起こさないように、そっと見るだけにした。'),N(['寝顔は、昼間より少しだけ幼い。','口が、ちょっとだけ動いた。夢の中でも、なにか話しているみたい。','クマの耳を、ぎゅっと握ったまま眠っている。'][day()%3])];
}
function flowerPending(){
  try{
    const ev=HOME.events;if(!ev||typeof ev.state!=='function')return false;
    const s=ev.state(),h=hd();if(!s||!h)return false;
    if(+s.step===0&&day()>=5)return true;
    if(+s.step===1)return true;
    return typeof ev._nextAction==='function'&&!!ev._nextAction(s,h);
  }catch(e){return false;}
}
async function talkKidMine(){
  const h=hd();if(!h)return false;
  const act=activity();
  if(asleep(act)){await say(sleepLines());return true;}
  // 発表会の話（娘から）。花を植える途中（step 1）なら、そちらが先
  const id=pending(curArea(),{kidOnly:true,ignoreDaily:true});
  if(id){await runEvent(id,curArea());return true;}
  if(flowerPending())return null;                 // 花の続きは events.js に
  talkN++;
  if(talkN%2===1){
    const pool=kidVariety(h);
    if(pool.length){
      await say(pool[(day()+talkN)%pool.length]);
      mental();save();
      return true;
    }
  }
  return null;
}

// ═══════════ 訪問者と話す ═══════════
async function talkVisitor(who){
  if(busy)return true;
  busy=true;
  try{
    if(who==='chiyo'){
      await say([C(['夜風が気持ちええね。……あんたも、早よ寝んさいよ。','この子、また背が伸びたんじゃないかね。','あさがお、蔓が伸びたら棒を立ててやりんさいね。'][day()%3]),D('はい。……おやすみなさい、千代さん'),N('千代さんは、垣根の戸をそっと閉めて帰っていった。')]);
    }else if(who==='hancho'){
      await say([H(['ほな、帰るわ。……月曜、遅れんなよ。','その工具箱、錆びさせたら承知せんぞ。','嬢ちゃん、パパのこと頼んだで。'][day()%3]),D('はい。おつかれさまです'),N('ヘルメットの黄色が、夜道を遠ざかっていった。')]);
    }else return false;
    leave();
    return true;
  }catch(e){return false;}
  finally{busy=false;}
}

// ═══════════ 日送り（UIなし） ═══════════
function tick(){
  try{
    const d=day();
    const tb=st('hancho_toolbox');
    if(tb&&!tb.done&&!tb.elig&&d>=10&&workReady())tb.elig=d;
  }catch(e){}
}

// ═══════════ 庭に出たとき（画面の切り替えにはフックが無いので、開いている間だけ様子を見る） ═══════════
let pollIv=0,lastArea=null,openN=0,firedKey='';
function dialogActive(){try{const el=typeof document!=='undefined'&&document.getElementById('home-dlg');return !!(el&&el.classList.contains('on'));}catch(e){return false;}}
function poll(){
  try{
    if(!HOME.isOpen||!HOME.isOpen()){stopPoll();return;}
    const S=HOME._screen||{};
    const area=S.area||'room';
    if(area!=='garden'){lastArea=area;return;}
    if(lastArea==='garden')return;
    if(busy||S.busy||S.mode==='edit'||dialogActive())return;   // 会話中・模様替え中は待つ（次の見回りで）
    lastArea='garden';
    const key=openN+':'+day();
    if(firedKey===key)return;                                    // この開閉・この日に、もう何か起きた
    if(!pending('garden'))return;
    firedKey=key;
    S.busy=true;
    tryRun('garden').finally(()=>{try{if(HOME._screen===S&&S.open)S.busy=false;}catch(e){}});
  }catch(e){}
}
function startPoll(area){
  stopPoll();openN++;lastArea=area||'room';
  if(SIM||typeof setInterval!=='function')return;
  pollIv=setInterval(poll,600);
}
function stopPoll(){if(pollIv){clearInterval(pollIv);pollIv=0;}}
if(typeof HOME.on==='function'){
  try{
    HOME.on('open',e=>startPoll(e&&e.area));
    HOME.on('close',()=>{stopPoll();visitorOn=null;});
    HOME.on('area',e=>{if(e&&e.area==='garden'){lastArea=null;}});
  }catch(e){}
}

// ═══════════ フック（前の処理＝窓辺の小さな約束を先に） ═══════════
function onOpen(area){
  lastArea=area;
  return tryRun(area||'room');
}
function useItem(P){
  if(!P||busy)return Promise.resolve(!!busy);
  const h=hd();
  const looks={
    'furniture.old_radio':()=>[N('つまみを回すと、ざあ、という音の奥から、遠い町の天気予報が聞こえた。'),N('千代さんの家で、何十年も夜を越してきたラジオ。')],
    'memento.toolbox':()=>[N('ふたの裏に、マジックで「岩切」。……その下に、もっと古い字で小さく「パパの」と書いてある。')],
    'memento.recital_photo':()=>[N('灯籠を振るあの子。ピントは少しだけ甘い。……それが、いい。')],
  };
  if(!looks[P.itemId])return Promise.resolve(false);
  busy=true;
  return say(looks[P.itemId]()).then(()=>true,()=>false).finally(()=>{busy=false;});
}

HOME.life_events={tick,pending,run:runEvent,tryRun,talkVisitor,kidVariety,state:st,peek,
  _restDay:restDay,_flowerBusy:flowerBusy,_placeGift:placeGift,_named:named,_poll:poll,IDS:Object.keys(RUN)};

const prev={onOpen:HOME.hooks.onOpen,talkKid:HOME.hooks.talkKid,useItem:HOME.hooks.useItem,talkVisitor:HOME.hooks.talkVisitor};
const callPrev=(fn,self,a)=>{if(typeof fn!=='function')return Promise.resolve(false);try{return Promise.resolve(fn.apply(self,a)).then(x=>!!x,()=>false);}catch(e){return Promise.resolve(false);}};
HOME.hooks.onOpen=function(...a){
  return callPrev(prev.onOpen,this,a).then(done=>done?true:onOpen(...a).then(x=>!!x,()=>false)).then(done=>{if(done)firedKey=openN+':'+day();return done;});
};
HOME.hooks.useItem=function(...a){
  return callPrev(prev.useItem,this,a).then(done=>done?true:useItem(...a));
};
HOME.hooks.talkKid=function(...a){
  if(busy)return Promise.resolve(true);
  return Promise.resolve().then(talkKidMine).then(r=>r===true?true:callPrev(prev.talkKid,this,a),()=>callPrev(prev.talkKid,this,a));
};
HOME.hooks.talkVisitor=function(...a){
  return talkVisitor(...a).then(done=>done?true:callPrev(prev.talkVisitor,this,a));
};
})();
