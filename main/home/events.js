// ═══════════════════════════════════════════════════════════
// 暮らしのイベント「窓辺の小さな約束」（HOME.events）
//   1 開始     5日目以降に家を開くと、娘が「おはなをそだてたい」。断っても後日また話せる
//   2 植える   鉢の色・置き場所（庭／部屋の窓辺）・花の名前（最大8文字、空欄なら「ひなた」）
//   3 名札     植えて3日後以降に家を開くと、娘が名札をくれる
//   4 育つ     水やりで育つ（枯れない・責めない）。葉が増えたら娘が気づく
//   5 振り返り つぼみ（stage≥3）かつ23日目以降に、娘が理由を話す
//   6 結末     良い結末で、花のある庭／部屋の絵（integrations.js がエンディングに出す）
// 進行は gs.homeData.events.window_promise に保存。各段階の思い出は固定 id で一度だけ。
// フック：HOME.hooks.onOpen(area) / talkKid() / useItem(P) → Promise<boolean>
// 設計：docs/home-story-design.md
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
HOME.hooks=HOME.hooks||{};
const EID='window_promise';
const DEFAULT_NAME='ひなた';
const NAME_MAX=8;
const COLORS=['red','blue','yellow'];
const START_DAY=5,TAG_AFTER=3,REASON_DAY=23;
// 鉢を置く場所の目安（そこに近い空きマスを探す）
//   庭：戸口(7,0)のすぐ横（帰ってきて最初に目に入る）。部屋：奥の壁の窓（x=7〜8）の下
const SPOTS={garden:{x:8,y:1},room:{x:8,y:1}};

function G(){try{return typeof gs!=='undefined'?gs:null;}catch(e){return null;}}
function day(){const g=G();return g&&Number.isFinite(+g.day)?+g.day:1;}
function hd(){
  try{
    if(typeof HOME.ensure==='function')return HOME.ensure();
    const g=G();if(!g)return null;
    return g.homeData||null;
  }catch(e){return null;}
}
function state(id){
  const h=hd();if(!h)return null;
  if(!h.events||typeof h.events!=='object')h.events={};
  id=id||EID;
  let s=h.events[id];
  if(!s||typeof s!=='object')s=h.events[id]={step:0};
  if(!Number.isFinite(+s.step))s.step=0;
  return s;
}

// ── 花の名前：前後の空白を除き、制御文字・山かっこを落とし、最大8文字。空なら「ひなた」 ──
function sanitizeName(v){
  let s=typeof v==='string'?v:'';
  s=s.normalize?s.normalize('NFC'):s;
  s=s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g,'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim();
  const cps=Array.from(s).slice(0,NAME_MAX);
  // 保存側（state.js）は UTF-16 で8文字に切るので、絵文字が途中で割れないよう合わせる
  while(cps.length&&cps.join('').length>NAME_MAX)cps.pop();
  s=cps.join('').trim();
  return s||DEFAULT_NAME;
}

// ── 配置の補助 ──
const AREAS=['room','garden'];
function placementsOf(h,area){const A=h&&h[area];return A&&Array.isArray(A.placements)?A.placements:[];}
function findPlaced(h,instanceId){
  if(!h||!instanceId)return null;
  for(const a of AREAS){const p=placementsOf(h,a).find(q=>q&&q.instanceId===instanceId);if(p)return {area:a,p};}
  return null;
}
function placedItems(h,itemId){
  const out=[];if(!h)return out;
  AREAS.forEach(a=>placementsOf(h,a).forEach(p=>{if(p&&p.itemId===itemId)out.push({area:a,p});}));
  return out;
}
function isPlaced(h,itemId){return placedItems(h,itemId).length>0;}
function layerOf(itemId){const c=HOME.CATALOG&&HOME.CATALOG[itemId];return (c&&c.layer)||'furniture';}
function newInstanceId(h){
  if(typeof HOME.newInstanceId==='function'){try{const id=HOME.newInstanceId();if(id)return id;}catch(e){}}
  if(!Number.isFinite(+h.seq)||+h.seq<1)h.seq=1;
  let id;do{id='p'+(h.seq++);}while(findPlaced(h,id)||(h.plants&&h.plants[id]));
  return id;
}
// 目安の位置に近い順に、置けて出入口もふさがないマスを探す。見つからなければ null
function findSpot(h,area,itemId,variant,target){
  if(typeof HOME.canPlace!=='function')return null;
  const A=h&&h[area];if(!A)return null;
  const W=A.width||(HOME.AREAS&&HOME.AREAS[area]&&HOME.AREAS[area].w)||12;
  const Hh=A.height||(HOME.AREAS&&HOME.AREAS[area]&&HOME.AREAS[area].h)||8;
  const t=target||SPOTS[area]||{x:0,y:0};
  const cells=[];
  for(let y=0;y<Hh;y++)for(let x=0;x<W;x++)cells.push({x,y,d:Math.abs(x-t.x)+Math.abs(y-t.y)*1.2+(x<t.x?.1:0)});
  cells.sort((a,b)=>a.d-b.d);
  const pl=placementsOf(h,area);
  for(const c of cells){
    const cand={instanceId:'__probe',itemId,x:c.x,y:c.y,rotation:0,variant:variant||'default',layer:layerOf(itemId)};
    let r=null;try{r=HOME.canPlace(area,pl,cand,{});}catch(e){r=null;}
    if(!r||!r.ok)continue;
    if(typeof HOME.reachable==='function'){
      let rr=null;try{rr=HOME.reachable(area,pl.concat([cand]));}catch(e){rr=null;}
      if(rr&&rr.ok===false)continue;
    }
    // 今まで使えていた家具（机の前・椅子の正面など）を使えなくしない
    if(typeof HOME.canUse==='function'){
      const next=pl.concat([cand]);
      let blocks=false;
      for(const q of pl){
        try{if(HOME.canUse(area,pl,q).ok&&!HOME.canUse(area,next,q).ok){blocks=true;break;}}catch(e){}
      }
      if(blocks)continue;
    }
    return {x:c.x,y:c.y};
  }
  return null;
}
function placeNew(h,area,itemId,variant,target,instanceId){
  const spot=findSpot(h,area,itemId,variant,target);
  if(!spot)return null;
  const P={instanceId:instanceId||newInstanceId(h),itemId,x:spot.x,y:spot.y,rotation:0,variant:variant||'default',layer:layerOf(itemId)};
  placementsOf(h,area).push(P);
  try{HOME.emit&&HOME.emit('placed',{area,placement:P,by:'event'});}catch(e){}
  return P;
}

// ── 植物 ──
function plantOf(h,s){return h&&h.plants&&s&&s.potId?h.plants[s.potId]||null:null;}
function stageOf(h,s){const p=plantOf(h,s);return p?Math.max(0,Math.min(4,+p.stage||0)):0;}
function ensurePlant(h,s){
  if(!s.potId)return null;
  let p=plantOf(h,s);
  if(!p){
    try{HOME.plant&&HOME.plant(s.potId,{name:s.name,color:s.color});}catch(e){}
    p=plantOf(h,s);
    if(!p){
      if(!h.plants||typeof h.plants!=='object')h.plants={};
      p=h.plants[s.potId]={name:s.name,color:s.color,stage:0,growth:0,plantedDay:day(),lastWateredDay:day()};
    }
  }
  return p;
}
function wateredToday(h,s){const p=plantOf(h,s);return !!p&&+p.lastWateredDay===day();}
function water(h,s){
  if(!s.potId)return false;
  let ok=false;
  try{if(typeof HOME.water==='function')ok=HOME.water(s.potId)!==false;}catch(e){ok=false;}
  const p=plantOf(h,s);
  if(p&&+p.lastWateredDay!==day()){p.lastWateredDay=day();ok=true;}
  if(ok)homeMental('water');
  return ok;
}
// 家で過ごす効果（精神+）は state.js 側の上限つき関数があるときだけ
function homeMental(kind){
  for(const k of ['gainMental','homeMental','addHomeMental']){
    if(typeof HOME[k]==='function'){try{HOME[k](kind==='water'?(HOME.BAL&&HOME.BAL.waterMental)||1:(HOME.BAL&&HOME.BAL.talkMental)||1,kind);}catch(e){}return;}
  }
}
// 鉢が収納→再配置で別の instanceId になったら、植物の記録をつなぎ直す
function relinkPot(h,s){
  if(!s||!s.potId||s.step<2)return;
  if(findPlaced(h,s.potId))return;
  const cand=placedItems(h,'garden.pot').filter(o=>!(h.plants&&h.plants[o.p.instanceId]));
  const hit=cand.find(o=>o.p.variant===s.color)||null;
  if(!hit)return;
  const old=s.potId;
  if(!h.plants)h.plants={};
  if(h.plants[old]){h.plants[hit.p.instanceId]=h.plants[old];delete h.plants[old];}
  s.potId=hit.p.instanceId;
}

// ── 会話の部品 ──
const say=lines=>{try{return HOME.ui&&HOME.ui.say?Promise.resolve(HOME.ui.say(lines)):Promise.resolve();}catch(e){return Promise.resolve();}};
const choice=(q,opts)=>{try{return HOME.ui&&HOME.ui.choice?Promise.resolve(HOME.ui.choice(q,opts)):Promise.resolve(-1);}catch(e){return Promise.resolve(-1);}};
const promptName=(label,def,max)=>{try{return HOME.ui&&HOME.ui.prompt?Promise.resolve(HOME.ui.prompt(label,def,max)):Promise.resolve(def);}catch(e){return Promise.resolve(def);}};
const toast=t=>{try{HOME.ui&&HOME.ui.toast&&HOME.ui.toast(t);}catch(e){}};
const D=(text,face)=>({who:'dan',face:face||'',text});
const K=(text,face)=>({who:'kid',face:face||'',text});
const N=text=>({who:'',face:'',text});
const AREA_JP={garden:'庭',room:'部屋の窓辺'};
const COLOR_JP={red:'あかい',blue:'あおい',yellow:'きいろい'};

function memo(id,what,text,opt){
  try{
    if(!HOME.memories||typeof HOME.memories.add!=='function')return false;
    return HOME.memories.add(Object.assign({id,day:day(),who:['dan','kid'],what,text,items:[],snapshot:null},opt||{}));
  }catch(e){return false;}
}
function snapOf(area){try{return HOME.memories&&HOME.memories.snapshotOf?HOME.memories.snapshotOf(area):null;}catch(e){return null;}}
function save(){try{HOME.save&&HOME.save();}catch(e){}}

let busy=false;
async function run(fn){
  if(busy)return true;           // 進行中の会話があれば重ねない（処理済み扱い）
  busy=true;
  try{return !!(await fn());}catch(e){try{console.warn('[home/events]',e);}catch(_){}return false;}
  finally{busy=false;}
}

// ── 1 開始 ──
async function stepStart(s,again){
  s.askedDay=day();
  await say(again?[
    K('パパ、あのね。ほいくえんでもらった、おはなのたね……まだ、とってあるよ。'),
    K('きょうは、うえる？'),
  ]:[
    K('パパ、あのね。'),
    K('ほいくえんでね、おはなのたね、もらったの。'),
    K('……おうちでも、おはな、そだてたい。'),
    D('あら、いいじゃない。なんのお花かしら'),
    K('わかんない。さいたら、わかるって。せんせいが。'),
  ]);
  const c=await choice('どうする？',[
    {t:'「一緒に植えましょ」',s:'鉢の色と置き場所、花の名前を決める'},
    {t:'「今夜はもう遅いから、また今度ね」',s:'あとで、また話せる'},
  ]);
  if(c!==0){
    s.declinedDay=day();
    await say([
      D('ごめんね、今夜はもう遅いから。また今度、一緒にやりましょ'),
      K('うん。たね、なくさないように、しまっとくね。'),
    ]);
    save();
    return true;
  }
  s.step=1;s.acceptedDay=day();
  memo('wp.1.start','おはなのたね','保育園でもらった種を、あの子と一緒に植えることにした。「さいたら、なんのおはなか、わかるって」');
  await say([D('いいわよ。パパも手伝うわ'),K('やったあ！')]);
  return stepPlant(s,false);
}

// ── 2 植える ──
async function stepPlant(s,resume){
  const h=hd();if(!h)return false;
  if(resume)await say([K('パパ、たね、うえよ？　じょうろも、あるよ。')]);
  const ci=await choice('はちは、どのいろにする？',[
    {t:'あかい鉢',s:'いちごの色'},{t:'あおい鉢',s:'海の色'},{t:'きいろい鉢',s:'帽子とおんなじ色'},
  ]);
  if(!(ci>=0&&ci<3)){save();return true;}       // 途中でやめても、次に話せば続きから
  const color=COLORS[ci];
  await say([[K('あか！　いちごのいろ。'),K('あお。うみのいろだね。'),K('きいろ！　ほいくえんの、ぼうしとおんなじ。')][ci]]);
  const ai=await choice('どこに置く？',[
    {t:'庭',s:'戸口のそば。お日さまがよく当たる'},
    {t:'部屋の窓辺',s:'窓のそば。夜も目に入る'},
  ]);
  if(!(ai===0||ai===1)){save();return true;}
  const area=ai===0?'garden':'room';
  await say([
    K('うん。そこがいい。'),
    N('あの子は、なぜか一度だけ、玄関のほうを振り返った。'),
    D('お名前、つけてあげましょうか'),
    K('……「ひなた」は？　あったかいから。パパがきめても、いいよ。'),
  ]);
  const raw=await promptName('花の名前（8文字まで）',DEFAULT_NAME,NAME_MAX);
  const name=sanitizeName(raw==null?'':raw);
  // 鉢を用意して置く（置けなければ収納へ）
  s.color=color;s.area=area;s.name=name;
  try{HOME.addItem&&HOME.addItem('garden.pot',1,color);}catch(e){}
  const potId=newInstanceId(h);
  const P=placeNew(h,area,'garden.pot',color,SPOTS[area],potId);
  s.potId=potId;
  s.stored=!P;
  ensurePlant(h,s);
  s.step=2;s.plantedDay=day();
  const lines=[
    N('小さな手で土をかぶせて、ふたりで、じょうろの水をそっとかけた。'),
    D(`「${name}」ね。いい名前じゃない`),
    K(`${name}、おおきくなってね。`),
  ];
  if(!P)lines.push(
    D('あら……いまは置ける場所が空いてないみたい。いったん大事にしまっておくわね。模様替えで、場所を作ってあげましょ'),
    K(`うん。${name}、ちょっとまっててね。`),
  );
  await say(lines);
  memo('wp.2.plant',`「${name}」を植えた`,`${COLOR_JP[color]}鉢に種を植えて、「${name}」と名前をつけた。置き場所は${AREA_JP[area]}。${P?'':'（いまは収納の中で、場所が空くのを待っている）'}`,
    {items:['garden.pot'],snapshot:P?snapOf(area):null});
  if(!P)toast('鉢植えは収納に入れました。模様替えで置けます');
  save();
  return true;
}

// ── 3 名札 ──
async function stepTag(s){
  const h=hd();if(!h)return false;
  const name=s.name||DEFAULT_NAME;
  let placed=null;
  const given=typeof HOME.grantOnce==='function'
    ?HOME.grantOnce('wp.flower_tag',()=>{try{HOME.addItem&&HOME.addItem('memento.flower_tag',1);}catch(e){}})
    :!s.tagGiven;
  if(given&&typeof HOME.grantOnce!=='function'){try{HOME.addItem&&HOME.addItem('memento.flower_tag',1);}catch(e){}}
  if(given){
    const pot=findPlaced(h,s.potId);
    if(pot)placed=placeNew(h,pot.area,'memento.flower_tag','default',{x:pot.p.x+1,y:pot.p.y});
  }
  s.tagGiven=true;s.step=3;s.tagDay=day();
  await say([
    K('パパ、これ。'),
    N(`画用紙を切った、小さな名札。クレヨンで「${name}」と書いてある。字がひとつだけ、鏡に映したみたいに反対を向いていた。`),
    D('あら、上手じゃない。……ちゃんと読めるわよ'),
    K(`${name}が、じぶんのなまえ、わすれないように。`),
    D(placed?'そうね。鉢のそばに立てておきましょ':'そうね。大事にしまっておいて、鉢のそばに立ててあげましょ'),
  ]);
  memo('wp.3.tag','花の名札',`あの子が、画用紙で名札を作ってくれた。「${name}が、じぶんのなまえ、わすれないように」`,{items:['memento.flower_tag']});
  if(given)toast(placed?'花の名札を鉢のそばに置きました':'花の名札を収納に入れました');
  save();
  return true;
}

// ── 4 育つ ──
async function stepGrow(s){
  const name=s.name||DEFAULT_NAME;
  s.step=4;s.grewDay=day();
  await say([
    K('パパ！　はっぱ、ふえてる！'),
    N(`${name}の芽が、きのうより少しだけ背をのばしていた。`),
    D('ほんとね。毎日ちょっとずつ……がんこ頑張っとるわね、この子'),
    K('パパも、まいにち、ちょっとずつ、がんばってる？'),
    D('……そうね。ちょっとずつ、ね'),
  ]);
  const h=hd();const pot=h&&findPlaced(h,s.potId);
  memo('wp.4.grow',`${name}の葉っぱ`,`${name}の葉が増えた。「パパも、まいにち、ちょっとずつ、がんばってる？」と聞かれて、少しだけ考えた。`,{snapshot:pot?snapOf(pot.area):null});
  save();
  return true;
}

// ── 5 振り返り ──
async function stepReason(s){
  const name=s.name||DEFAULT_NAME;
  const h=hd();const pot=h&&findPlaced(h,s.potId);
  const where=pot?(pot.area==='garden'?'戸口のそば':'窓辺'):'あそこ';
  s.step=5;s.reasonDay=day();
  await say([
    N(`${name}に、つぼみがひとつ、ふくらんでいた。`),
    D(`ねえ。最初のとき、どうして${where}がよかったの？　玄関のほう、見てたでしょ`),
    K('……あのね。'),
    K('パパが帰ってきたとき、見えるところにしたかったの。'),
    K('パパ、よる、つかれたかおで、かえってくるでしょ。……おはながあったら、ちょっとだけ、わらうかなって。'),
    N('言葉が、すぐには出てこなかった。'),
    D('……笑うわよ。毎晩、ちゃんと見てたもの'),
    D('きのどくなぁ。……ありがとね'),
    K('えへへ。'),
  ]);
  memo('wp.5.reason','見えるところに',`「パパが帰ってきたとき、見えるところにしたかったの」\n${name}の場所は、あの子が決めていた。`,{snapshot:pot?snapOf(pot.area):null});
  save();
  return true;
}

// ── 家を開いたとき：いまの段階で出来ることがあれば一つだけ ──
function nextAction(s,h){
  const d=day();
  if(s.step===0)return d>=START_DAY&&s.askedDay!==d?'start':null;
  if(s.step===1)return s.askedDay!==d?'plant':null;
  relinkPot(h,s);
  if(s.step===2)return d>=(+s.plantedDay||d)+TAG_AFTER?'tag':null;
  if(s.step===3)return stageOf(h,s)>=2?'grow':null;
  if(s.step===4)return stageOf(h,s)>=3&&d>=REASON_DAY?'reason':null;
  return null;
}
function onOpen(area){
  return run(async()=>{
    const s=state(),h=hd();if(!s||!h)return false;
    const a=nextAction(s,h);
    if(a==='start'){return stepStart(s,!!s.declinedDay);}
    if(a==='plant'){s.askedDay=day();return stepPlant(s,true);}
    if(a==='tag')return stepTag(s);
    if(a==='grow')return stepGrow(s);
    if(a==='reason')return stepReason(s);
    return false;
  });
}

// ── 娘と話す（いつもの会話は、進み具合と家具で変わる） ──
function litLantern(h){
  return placedItems(h,'light.shell_lantern').some(o=>o.p.lit===true||(h.flags&&h.flags.lit&&h.flags.lit[o.p.instanceId]));
}
function kidLines(s,h){
  const name=s.name||DEFAULT_NAME;
  const st=stageOf(h,s);
  const pool=[];
  if(s.step>=2){
    if(st>=4)pool.push([K(`${name}、さいたね。パパ、みた？`),D('見たわよ。帰ってきて、いちばんに')]);
    else if(st>=3)pool.push([K(`${name}のつぼみ、あしたには、ひらくかな。`),D('どうかしら。急がなくていいのよ')]);
    else pool.push([K(`${name}、きょうは、なにしてるかな。`),D('きっと、土の中で背伸びしてるわ')]);
    if(s.stored&&!findPlaced(h,s.potId))pool.push([K(`${name}、みえるとこに、おいてあげてね。`),D('そうね。場所、作ってあげましょ')]);
    if(isPlaced(h,'memento.flower_tag'))pool.push([K('なふだ、ちゃんとたってる。'),D('風で倒れないように、ちょっと深く刺しといたわ')]);
  }
  if(isPlaced(h,'memento.bear'))pool.push([K('くまさん、あそこで、おるすばんしてるの。'),D('あら、えらいわね。お留守番、頼りになるわ')]);
  else pool.push([K('くまさんも、パパとおはなし、したいって。'),D('じゃあ、くまさんにも、こんばんは')]);
  if(isPlaced(h,'memento.child_drawing'))pool.push([K('わたしのえ、かざってくれたの？　……えへへ。'),D('いちばん目につくところにね')]);
  if(isPlaced(h,'furniture.repaired_shelf')||(h.flags&&h.flags.repairedShelf))pool.push([K('このたな、もうぐらぐらしないね。パパとなおしたもん。'),D('そうよ。ふたりで直したんだから、丈夫なのよ')]);
  if(isPlaced(h,'light.shell_lantern'))pool.push(litLantern(h)
    ?[K('かいがらのランタン、ついてると、こわくないね。'),D('夜の海の色、ね')]
    :[K('かいがらのランタン、つけて？　うみのいろ、みたい。'),D('いいわよ。ちょっとだけね')]);
  pool.push([K('……まだ、ねむくないもん。','sleepy'),D('はいはい。じゃあ、あと少しだけね')]);
  pool.push([K('ほいくえんでね、だんごむし、みつけたの。まるくなるの。'),D('あら、パパも疲れたら丸くなろうかしら')]);
  s.talkN=(+s.talkN||0)+1;
  return pool[(day()+s.talkN)%pool.length];
}
function talkKid(){
  return run(async()=>{
    const s=state(),h=hd();if(!s||!h)return false;
    const d=day();
    // まだ始まっていない／途中で止まっているなら、その続きから（何度でも話せる）
    if(s.step===0&&d>=START_DAY)return stepStart(s,!!s.declinedDay);
    if(s.step===1)return stepPlant(s,true);
    const a=nextAction(s,h);
    if(a==='tag')return stepTag(s);
    if(a==='grow')return stepGrow(s);
    if(a==='reason')return stepReason(s);
    await say(kidLines(s,h));
    homeMental('talk');
    if(s.step>=2&&s.potId&&!wateredToday(h,s)){
      const c=await choice(`${s.name||DEFAULT_NAME}に、おみず、あげる？`,[{t:'一緒に水をあげる'},{t:'あとでね'}]);
      if(c===0){water(h,s);await say([N('じょうろの水が、土にしみこんでいく。'),K('おいしいって。')]);}
    }
    save();
    return true;
  });
}

// ── 調べる・使う（鉢植え／花の名札） ──
function useItem(P){
  if(!P||typeof P!=='object')return Promise.resolve(false);
  const s=state(),h=hd();if(!s||!h)return Promise.resolve(false);
  relinkPot(h,s);
  if(P.itemId==='garden.pot'){
    const mine=s.step>=2&&P.instanceId===s.potId;
    const pl=h.plants&&h.plants[P.instanceId];
    if(!mine&&!pl)return Promise.resolve(false);
    return run(async()=>{
      const name=(pl&&pl.name)||s.name||DEFAULT_NAME;
      const st=Math.max(0,Math.min(4,+(pl&&pl.stage)||0));
      const look=[
        `${name}の鉢。土の中で、まだ眠っているみたい。`,
        `${name}の小さな芽が、二枚の葉をひろげている。`,
        `${name}の葉が、少しずつ増えてきた。`,
        `${name}に、つぼみがひとつ、ふくらんでいる。`,
        `${name}が、咲いていた。小さくて、あったかい色の花。`,
      ][st];
      const done=pl&&+pl.lastWateredDay===day();
      const c=await choice(look,[{t:done?'水やり（今日はもうあげた）':'水をあげる'},{t:'ながめる'}]);
      if(c===0){
        if(done)await say([N('土は、まだしっとりしている。今日は、これで十分。')]);
        else{
          let ok=false;
          if(mine)ok=water(h,s);
          else{try{ok=typeof HOME.water==='function'&&HOME.water(P.instanceId)!==false;}catch(e){}if(ok)homeMental('water');}
          await say([N(ok?'じょうろの水が、ゆっくり土にしみこんでいく。':'土は、まだしっとりしている。')]);
        }
      }else if(c===1){
        await say([N(st>=4?'花びらが、夜風にすこしだけ揺れた。':'急がなくていい。……ゆっくりでいいのよ、と声をかけた。')]);
      }
      save();
      return true;
    });
  }
  if(P.itemId==='memento.flower_tag'){
    return run(async()=>{
      const name=s.name||DEFAULT_NAME;
      await say(s.step>=2
        ?[N(`クレヨンの字で「${name}」。字がひとつだけ、鏡に映したみたいに反対を向いている。`)]
        :[N('まだ、なにも書かれていない名札。')]);
      return true;
    });
  }
  return Promise.resolve(false);
}

// ── 日送り（UIは出さない。収納→再配置のつなぎ直しだけ） ──
function tick(){
  try{
    const s=state(),h=hd();if(!s||!h)return;
    relinkPot(h,s);
    if(s.step===0&&day()>=START_DAY&&!s.hinted){
      s.hinted=day();
      try{if(typeof showNotif==='function'&&!(root.frameElement&&/simulator/.test(root.parent.location.pathname)))showNotif('🏠 家で、あの子が何か話したそうにしている。');}catch(e){}
    }
  }catch(e){}
}

// ── エンディングの振り返り（どの絵と言葉を出すか。描画は integrations.js） ──
const BAD=['collapse','bankrupt','flame'];
function decorated(h){
  if(!h)return false;
  if(h.flags&&(h.flags.repairedShelf||h.flags.decorated))return true;
  return isPlaced(h,'furniture.repaired_shelf')||isPlaced(h,'light.shell_lantern')||isPlaced(h,'memento.child_drawing');
}
function reflection(type){
  if(!type||BAD.includes(type))return null;
  const s=state(),h=hd();if(!s||!h)return null;
  relinkPot(h,s);
  if(s.step>=2){
    const name=s.name||DEFAULT_NAME;
    const pot=findPlaced(h,s.potId);
    const st=stageOf(h,s);
    const kid=st>=4?`${name}、さいたよ。パパがかえってくるの、まってたの。`
      :s.step>=5?`${name}、パパがかえってくるとき、みえるとこにいるよ。`
      :`${name}、まいにち、ちょっとずつ、おおきくなってるよ。`;
    if(pot)return {kind:'flower',source:'current',area:pot.area,name,stage:st,
      head:'― 窓辺の小さな約束 ―',
      lines:[`${pot.area==='garden'?'庭の戸口のそば':'部屋の窓辺'}で、「${name}」が${st>=4?'咲いている':st>=3?'つぼみをふくらませている':'葉をのばしている'}。`,`娘「${kid}」`]};
    // 収納中：いちばん新しい「絵のある思い出」を使う
    const ms=(HOME.memories&&HOME.memories.list?HOME.memories.list():[]).filter(m=>/^wp\./.test(m.id)&&m.snapshot);
    const m=ms[ms.length-1];
    if(m)return {kind:'flower',source:'memory',memoryId:m.id,area:m.snapshot.area,snapshot:m.snapshot,name,stage:st,
      head:'― 窓辺の小さな約束 ―',
      lines:[`思い出帳の一枚。「${name}」を、ふたりで置いた日の${m.snapshot.area==='garden'?'庭':'部屋'}。`,`娘「${name}のこと、おぼえてる？　……わたしは、おぼえてるよ。」`]};
    return {kind:'flower',source:'none',name,stage:st,head:'― 窓辺の小さな約束 ―',area:null,
      lines:[`しまってある鉢の「${name}」は、いまも土の中で、次の場所を待っている。`,`娘「${name}、またみえるとこに、おいてあげようね。」`]};
  }
  if(decorated(h)){
    const shelf=isPlaced(h,'furniture.repaired_shelf')||(h.flags&&h.flags.repairedShelf);
    return {kind:'home',source:'current',area:'room',head:'― 暮らしの部屋 ―',
      lines:[shelf?'ふたりで直した棚は、今日も絵本を支えている。':'並べ直した部屋の家具は、今日もちゃんと使われている。',
        shelf?'娘「このたな、まだぐらぐらしないよ。」':'娘「パパ、おへや、すき。」']};
  }
  return null;
}

HOME.events=Object.assign(HOME.events||{},{
  ID:EID,state,tick,reflection,sanitizeName,onOpen,talkKid,useItem,
  _nextAction:nextAction,_findSpot:findSpot,_relinkPot:relinkPot,
});

// フック登録（既に別の処理が登録されていれば、扱わなかったときにそちらへ回す）
const prev={onOpen:HOME.hooks.onOpen,talkKid:HOME.hooks.talkKid,useItem:HOME.hooks.useItem};
const chain=(mine,old)=>function(...a){
  return Promise.resolve(mine.apply(this,a)).then(done=>{
    if(done||typeof old!=='function')return !!done;
    try{return Promise.resolve(old.apply(this,a)).then(x=>!!x);}catch(e){return false;}
  });
};
HOME.hooks.onOpen=chain(onOpen,prev.onOpen);
HOME.hooks.talkKid=chain(talkKid,prev.talkKid);
HOME.hooks.useItem=chain(useItem,prev.useItem);
})();
