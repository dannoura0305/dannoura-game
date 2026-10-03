// ═══════════════════════════════════════════════════════════
// きずなの記録（HOME.bonds）：約束・行動・話し合い・頼る・休む
//   gs.homeData.bonds = { promises:[{id,day,kept:null|true|false,talked:false}],
//                         acted:{[key]:day}, askedHelp:n, rested:n,
//                         help:{[key]:day}, rest:{[key]:day}, work:{[day]:1}, care:{[day]:1}, log:[...] }
//   ・本編（gs.story.flags）・RPG（gs.rpg.flags）・家（gs.homeData.events）からは、毎回「導き直す」（sync）。
//     キーで記録するので、何度読み込んでも・何度呼んでも数は増えない。
//   ・ゲームの行動（休む・子育て・工場）は integrations.js のラップから note() で1日1キー。
//   ・evaluate() → {score, traits:['kept','talked','relied','rested','acted'], summary, lines, counts}
//   ・endingLine(type) … エンディング「その後」に足す一言（悪い結末には何も足さない）。結末の種類は変えない。
// 設計：docs/home-story-design.md「bonds」
// ═══════════════════════════════════════════════════════════
(function(){
'use strict';
const root=typeof window!=='undefined'?window:globalThis;
const HOME=root.HOME=root.HOME||{};
const BAD=['collapse','bankrupt','flame'];
const LOG_MAX=40;

function G(){try{return typeof gs!=='undefined'?gs:null;}catch(e){return null;}}
function day(){const g=G();return g&&Number.isFinite(+g.day)?+g.day:1;}
function hd(){
  try{if(typeof HOME.ensure==='function')return HOME.ensure();}catch(e){}
  const g=G();return g&&g.homeData&&typeof g.homeData==='object'?g.homeData:null;
}
const isObj=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
function storyFlags(){const g=G();const s=g&&g.story;return s&&isObj(s.flags)?s.flags:{};}
function rpgFlags(){const g=G();const r=g&&g.rpg;return r&&isObj(r.flags)?r.flags:{};}
function homeEvent(h,id){return h&&isObj(h.events)&&isObj(h.events[id])?h.events[id]:null;}

// ── 入れ物（壊れていても直す） ──
function B(h){
  h=h||hd();if(!h)return null;
  let b=h.bonds;
  if(!isObj(b))b=h.bonds={};
  if(!Array.isArray(b.promises))b.promises=[];
  b.promises=b.promises.filter(p=>isObj(p)&&typeof p.id==='string');
  ['acted','help','rest','work','care'].forEach(k=>{if(!isObj(b[k]))b[k]={};});
  if(!Array.isArray(b.log))b.log=[];
  b.askedHelp=Object.keys(b.help).length;
  b.rested=Object.keys(b.rest).length;
  return b;
}
function log(b,k,t){
  b.log.push({d:day(),k,t:String(t||'').slice(0,40)});
  while(b.log.length>LOG_MAX)b.log.shift();
}
function setKey(b,map,key,label){
  if(!key)return false;
  if(Object.prototype.hasOwnProperty.call(b[map],key))return false;
  b[map][key]=day();
  log(b,map,label||key);
  return true;
}
function upsertPromise(b,id,o){
  let p=b.promises.find(q=>q.id===id);
  if(!p){p={id,day:Number.isFinite(+o.day)?+o.day:day(),kept:null,talked:false};b.promises.push(p);log(b,'promise',id);}
  // kept は「分かった値」で上書き（null で消さない）、talked は false→true にだけ進む
  if(o.kept===true||o.kept===false)p.kept=o.kept;
  if(o.talked)p.talked=true;
  return p;
}

// ── 外から記録する（ゲームの行動・家の出来事） ──
//   note('rest',key) / note('help',key) / note('acted',key) / note('work') / note('care') / note('talk',promiseId)
//   note('promise',id,{kept,day})
function note(kind,key,o){
  try{
    const b=B();if(!b)return false;
    switch(kind){
      case 'rest':  {const r=setKey(b,'rest',key||('act.d'+day()));b.rested=Object.keys(b.rest).length;return r;}
      case 'help':  {const r=setKey(b,'help',key);b.askedHelp=Object.keys(b.help).length;return r;}
      case 'acted': return setKey(b,'acted',key);
      case 'work':  return setKey(b,'work',String(key||day()));
      case 'care':  return setKey(b,'care',String(key||day()));
      case 'talk':  {const p=b.promises.find(q=>q.id===key);if(p&&!p.talked){p.talked=true;log(b,'talk',key);return true;}
        if(!p){upsertPromise(b,key,{talked:true});return true;}return false;}
      case 'promise': upsertPromise(b,key,o||{});return true;
    }
  }catch(e){}
  return false;
}
function workDays(){const b=B();return b?Object.keys(b.work).length:0;}

// ── 本編・RPG・家の状態から導き直す（何度呼んでも同じ） ──
function sync(){
  const h=hd();const b=B(h);if(!b)return null;
  const f=storyFlags(),r=rpgFlags();
  const recitalKept=f.kept_promise?true:(f.broke_promise||(f.missed_recital&&f.promise_recital))?false:null;
  const rec=homeEvent(h,'life.recital');
  // 約束
  if(f.promise_recital)upsertPromise(b,'recital',{day:16,kept:recitalKept,talked:!!(rec&&rec.talked)});
  if(r.ch3_promise)upsertPromise(b,'rpg.ch3',{kept:f.promise_recital?recitalKept:null});
  if(f.promise_morning)upsertPromise(b,'morning',{day:14});
  const wp=homeEvent(h,'window_promise');
  if(wp&&+wp.step>=1)upsertPromise(b,'flower',{day:+wp.acceptedDay||day(),kept:+wp.step>=2?true:null});
  // 行動した
  if(wp&&+wp.step>=2)setKey(b,'acted','flower.plant','花を植えた');
  try{
    const pl=wp&&wp.potId&&h.plants&&h.plants[wp.potId];
    if(pl&&+pl.stage>=2)setKey(b,'acted','flower.care','花の世話を続けた');
  }catch(e){}
  if(f.kept_promise)setKey(b,'acted','recital','発表会に行った');
  if(h.flags&&h.flags.repairedShelf)setKey(b,'acted','repair','棚を直した');
  if(f.line3_owner)setKey(b,'acted','line3','点検表を作った');
  if(Object.keys(b.care).length>=3)setKey(b,'acted','childcare','寝かしつけを続けた');
  // 頼った
  if(f.asked_help)setKey(b,'help','story.asked_help','班長に頼った');
  if(f.hancho_covered)setKey(b,'help','story.hancho_covered','班長に任せた');
  if(f.chiyo_trust)setKey(b,'help','story.chiyo_trust','千代さんに頼った');
  if(r.ch2_share)setKey(b,'help','rpg.ch2_share','ミナモに頼った');
  // 休んだ
  if(f.white_rest)setKey(b,'rest','story.white_rest','早く休んだ');
  if(f.slept_d23)setKey(b,'rest','story.slept_d23','配信を切って眠った');
  if(r.ch4_rest)setKey(b,'rest','rpg.ch4_rest','眠らない灯籠を吹き消した');
  b.askedHelp=Object.keys(b.help).length;
  b.rested=Object.keys(b.rest).length;
  return b;
}

// ── 評価 ──
const TRAIT_JP={kept:'約束を守った',talked:'話し合えた',relied:'頼れた',rested:'休めた',acted:'手を動かした'};
function evaluate(){
  const b=sync();
  const empty={score:0,traits:[],summary:'',lines:[],counts:{kept:0,broken:0,brokenTalked:0,promises:0,relied:0,rested:0,acted:0}};
  if(!b)return empty;
  const f=storyFlags(),r=rpgFlags();
  const ps=b.promises;
  const kept=ps.filter(p=>p.kept===true).length;
  const broken=ps.filter(p=>p.kept===false);
  const brokenTalked=broken.filter(p=>p.talked).length;
  const relied=b.askedHelp|0,rested=b.rested|0,acted=Object.keys(b.acted).length;
  const honest=!!(f.told_child||r.ch3_honest);
  const traits=[];
  if(kept>0)traits.push('kept');
  if(brokenTalked>0||honest)traits.push('talked');
  if(relied>=1)traits.push('relied');
  if(rested>=2)traits.push('rested');
  if(acted>=2)traits.push('acted');
  let score=0;
  score+=Math.min(2,kept)*15;
  score+=brokenTalked>0?15:honest?8:0;
  score+=relied>=3?20:relied>=1?14:0;
  score+=rested>=5?20:rested>=2?14:rested>=1?6:0;
  score+=Math.min(5,acted)*5;
  score=Math.max(0,Math.min(100,score));
  // まとめ（思い出帳「この30日」）
  const lines=[];
  if(kept>0)lines.push(f.kept_promise?'約束を守れた。小指の力を、まだ覚えている。':'交わした約束を、ひとつ形にできた。');
  if(brokenTalked>0)lines.push('守れなかった約束もあった。でも、逃げずに話した。あの子は、台詞をひとつ聞かせてくれた。');
  else if(broken.length)lines.push('守れなかった約束が、まだ胸の奥に残っている。……話せる日は、きっとまだ来る。');
  else if(honest&&!kept)lines.push('できないことを、できないと正直に言えた。');
  if(relied>=1)lines.push(relied>=3?'ひとりで抱えずに、何度か誰かの手を借りた。':'ひとりで抱えずに、誰かに頼れた夜があった。');
  if(rested>=2)lines.push('休むことを、自分に許せた夜があった。');
  else if(rested===1)lines.push('一度だけ、ちゃんと休めた夜があった。');
  if(acted>=2)lines.push('言葉だけじゃなく、手を動かした。'+actedPhrase(b));
  if(!lines.length)lines.push('まだ、形になったものは少ない。……でも、毎晩ちゃんと、ここに帰ってきた。');
  return {score,traits,traitNames:traits.map(t=>TRAIT_JP[t]),summary:lines.join('\n'),lines,
    counts:{kept,broken:broken.length,brokenTalked,promises:ps.length,relied,rested,acted}};
}
function actedPhrase(b){
  const a=b.acted;const out=[];
  if(a['flower.plant']||a['flower.care'])out.push('花の水');
  if(a.repair)out.push('直した棚');
  if(a['home.clothesline'])out.push('物干し');
  if(a.recital)out.push('発表会の客席');
  if(a.line3)out.push('三号の点検表');
  if(a.childcare&&out.length<3)out.push('毎晩の寝かしつけ');
  return out.length?out.slice(0,3).join('、')+'。':'';
}

// ── エンディング「その後」の一言（悪い結末には足さない／結末の種類は変えない） ──
function endingLine(type){
  if(!type||BAD.indexOf(type)>=0)return null;
  let ev;try{ev=evaluate();}catch(e){return null;}
  const t=ev.traits;
  const has=k=>t.indexOf(k)>=0;
  // 守れなかった約束があるなら「守れた」とは言わない（話し合えていれば、その一言）
  if(ev.counts.broken>0){
    if(ev.counts.brokenTalked>0)return '守れなかった約束のことは、ちゃんと話した。だから、次の約束ができる。';
  }else{
    if(has('kept')&&has('relied'))return '約束を守れたのは、ひとりで抱えなかったからだ。';
    if(has('kept'))return '守れた約束は、小さな灯りみたいに、まだ部屋に残っている。';
  }
  if(has('relied')&&has('rested'))return '頼ることも、眠ることも、もう負けだとは思わない。';
  if(has('relied'))return '頼ってもいいのだと、ようやく覚えた。';
  if(has('rested'))return '眠ることを、もう負けだとは思わない。';
  if(has('acted'))return '手を動かした分だけ、家は少しずつ、ふたりの形になった。';
  if(has('talked'))return '本当のことを、少しずつ話せるようになった。';
  return null;
}

HOME.bonds={data:()=>B(),sync,note,evaluate,endingLine,workDays,TRAIT_JP,BAD};
})();
