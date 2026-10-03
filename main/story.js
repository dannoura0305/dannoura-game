// ══════════════════════════════════════════════════════════
// main/story.js ― 本編ストーリーイベント（30夜の物語）
//
// 毎晩22時、行動を選ぶ前に短い会話シーンが一つ入る（入らない夜もある）。
// SFC時代の物語ゲーム風のメッセージウィンドウ（顔グラ・名前札・一文字ずつ表示・
// タップ/Enterで送り・0〜2択）で、四幕の物語を進める。
//
//   第一幕「沈む夜」   DAY 1〜7   登場人物と借金・子ども・夜の生活
//   第二幕「波の下」   DAY 8〜20  さくらの正体、夜鷹、三号ライン、発表会の約束
//   第三幕「底」       DAY 21〜26 さくらの沈黙となりすまし、限界、夜鷹の失踪、前夜
//   終幕「夜明け」     DAY 27〜30 約束の朝、模試、さくらの帰還、最後の夜
//
// 状態はすべて gs.story（JSONにできる素のオブジェクト）に入る。セーブ/ロードは
// game.js の gsToSaveData / saveDataToGs がそのまま運ぶ。
// エンディング側から参照できるよう window.storyFlags() で要約を返す。
//
// game.js の関数は「包む」だけで書き換えない（他の拡張も同じ関数を包むので、
// 必ず元の関数を呼ぶ）:
//   nextDay          … その夜のシーンを予約
//   goToGame         … 1日目のシーンを予約
//   saveDataToGs     … 古いセーブ（storyなし）の補正
//   handleChoice     … 行動回数の記録
//   buildCommentPool … 配信コメントに物語の流れ（さくらの沈黙・なりすまし等）を反映
//   startSession     … 節目の夜に、物語に沿ったコメントを1つ流す
// ══════════════════════════════════════════════════════════
(function(){
'use strict';
if(typeof gs==='undefined')return;

// バランスシミュレーター（tools/simulator.html）の中では演出を出さない
const SIM=(()=>{try{return !!(window.frameElement&&/simulator/.test(window.parent.location.pathname));}catch(e){return false;}})();

// ──────────────────────────
// 状態
// ──────────────────────────
function S(){
  let s=gs.story;
  if(!s||typeof s!=='object'){
    s=gs.story={v:1,lastNight:0,queue:[],seen:{},flags:{},bond:{},choices:{},counts:{},log:[],actShown:0};
  }
  if(!s.seen)s.seen={};if(!s.flags)s.flags={};if(!s.bond)s.bond={};
  if(!s.choices)s.choices={};if(!s.counts)s.counts={};if(!Array.isArray(s.log))s.log=[];
  if(!Array.isArray(s.queue))s.queue=[];if(!s.pins)s.pins={};if(typeof s.lastNight!=='number')s.lastNight=0;
  if(typeof s.actShown!=='number')s.actShown=0;
  return s;
}
const F=()=>S().flags;
const B=k=>S().bond[k]||0;
function actOf(d){return d<=7?1:d<=20?2:d<=26?3:4;}
const ACTS={
  1:{no:'第一幕',name:'沈む夜'},
  2:{no:'第二幕',name:'波の下'},
  3:{no:'第三幕',name:'底'},
  4:{no:'終幕',  name:'夜明け'},
};

// ──────────────────────────
// 台本の部品
// ──────────────────────────
const N =t=>({w:'n',t});                 // ナレーション
const D =(f,t)=>({w:'self',f,t});        // だんのうら（f=表情）
const L =(w,t,o)=>Object.assign({w,t},o||{});
const K =(t,f)=>L('kid',t,{f});          // 子ども
const H =t=>L('hancho',t);               // 班長
const T =t=>L('sensei',t);               // 保育園の先生
const CH=t=>L('chiyo',t);                // お隣の千代さん
const P =t=>L('phone',t);                // 督促の電話
const Y =t=>L('yodaka',t);               // 夜鷹
const SA=t=>L('sakura',t);               // さくら
const TB=t=>L('tabibito',t);             // 夜空の旅人
const HI=t=>L('hitori',t);               // ひとりぼっち
const JO=t=>L('joren',t);                // 深夜の常連
const FK=t=>L('fake',t);                 // さくら（なりすまし）
const GH=(t,nm)=>L('ghost',t,{nm});      // 正体のないコメント
const SEA=t=>L('sea',t);                 // 海の声
const C =(...opts)=>({choice:opts});     // 選択肢 {k,t,fx,set,add,then}
const FX=(fx,set,add)=>({fx,set,add});   // 選択肢なしの効果
const SFX=k=>({sfx:k});
const BG=k=>({bg:k});
const when=(c,...ls)=>c?ls:[];

// ──────────────────────────
// 登場人物（名前札・顔グラ）
// ──────────────────────────
let _pid=0;
function svgWrap(bg1,bg2,body,round){
  const id='stp'+(++_pid);
  return `<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><radialGradient id="${id}" cx=".5" cy=".38" r=".78"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></radialGradient></defs>`+
    (round?`<circle cx="48" cy="48" r="48" fill="url(#${id})"/>`:`<rect width="96" height="96" fill="url(#${id})"/>`)+body.replace(/\$ID/g,id)+`</svg>`;
}
const PORTRAIT={
  kid(f){
    const eyes=f==='sleepy'
      ?`<path d="M37 50 q4 3 8 0 M51 50 q4 3 8 0" stroke="#2a1a14" stroke-width="2" fill="none" stroke-linecap="round"/>`
      :`<ellipse cx="41" cy="50" rx="2.6" ry="3.3" fill="#2a1a14"/><ellipse cx="55" cy="50" rx="2.6" ry="3.3" fill="#2a1a14"/><circle cx="42" cy="48.8" r=".9" fill="#fff"/><circle cx="56" cy="48.8" r=".9" fill="#fff"/>`;
    const mouth=f==='sad'
      ?`<path d="M44.5 60 Q48 57.5 51.5 60" stroke="#a0504a" stroke-width="1.7" fill="none" stroke-linecap="round"/>`
      :f==='sleepy'?`<ellipse cx="48" cy="59" rx="1.6" ry="1.2" fill="#a0504a"/>`
      :`<path d="M44.5 57.5 Q48 61 51.5 57.5" stroke="#a0504a" stroke-width="1.7" fill="none" stroke-linecap="round"/>`;
    const tears=f==='sad'?`<path d="M38.5 54 q-1 3 0 4.5 q1.2-1.6 0-4.5Z M57.5 54 q-1 3 0 4.5 q1.2-1.6 0-4.5Z" fill="#9fd8ff" opacity=".9"/>`:'';
    return svgWrap('#4a3470','#120b24',
      `<circle cx="16" cy="16" r="1.2" fill="#ffe9a8" opacity=".8"/><circle cx="80" cy="22" r="1" fill="#ffe9a8" opacity=".6"/><circle cx="72" cy="10" r=".8" fill="#fff" opacity=".5"/>`+
      `<path d="M16 96 C18 76 32 70 48 70 C64 70 78 76 80 96Z" fill="#f2df9a"/>`+
      `<path d="M40 70 L48 79 L56 70" fill="none" stroke="#cfae52" stroke-width="2"/>`+
      `<circle cx="30" cy="86" r="1.6" fill="#d9a83a"/><circle cx="66" cy="84" r="1.6" fill="#d9a83a"/><circle cx="54" cy="91" r="1.3" fill="#d9a83a"/>`+
      `<rect x="43" y="62" width="10" height="10" fill="#efc3a4"/>`+
      `<ellipse cx="48" cy="47" rx="19" ry="19.5" fill="#f8d9c2"/>`+
      `<path d="M28.5 52 C25 28 37 23 48 23 C59 23 71 28 67.5 52 C67 44 64 37.5 60 35 C56 39 50 38.5 46 35.5 C42 39.5 36 39 32.5 37 C30.5 41 29.3 46 28.5 52Z" fill="#4b3226"/>`+
      `<path d="M28.5 50 C27.5 57 28.6 61 31 63.5 L32 47Z M67.5 50 C68.5 57 67.4 61 65 63.5 L64 47Z" fill="#4b3226"/>`+
      eyes+tears+
      `<ellipse cx="36.5" cy="56" rx="3.6" ry="2.1" fill="#f49a9a" opacity=".55"/><ellipse cx="59.5" cy="56" rx="3.6" ry="2.1" fill="#f49a9a" opacity=".55"/>`+mouth);
  },
  hancho(){
    return svgWrap('#2c4462','#0b121c',
      `<path d="M10 96 C12 74 30 68 48 68 C66 68 84 74 86 96Z" fill="#3b4656"/>`+
      `<path d="M36 68 L48 84 L60 68" fill="#2a323e"/>`+
      `<path d="M30 70 C38 76 58 76 66 70 L64 77 C56 81 40 81 32 77Z" fill="#eceae2"/>`+
      `<rect x="56" y="80" width="12" height="7" rx="1" fill="#c9d2dc"/><rect x="58" y="82" width="8" height="1.2" fill="#55606e"/>`+
      `<ellipse cx="48" cy="49" rx="20" ry="21" fill="#dcab86"/>`+
      `<path d="M28 50 L28 58 L31 58 L31 49Z M68 50 L68 58 L65 58 L65 49Z" fill="#8a8a8a"/>`+
      `<path d="M25 42 C25 21 37 15 48 15 C59 15 71 21 71 42Z" fill="#f2c230"/>`+
      `<path d="M48 15 L48 42" stroke="#d9a820" stroke-width="3"/>`+
      `<ellipse cx="48" cy="42.5" rx="27" ry="4.2" fill="#d9a820"/>`+
      `<circle cx="38" cy="30" r="4.3" fill="#fff"/><path d="M38 27.2 v5.6 M35.2 30 h5.6" stroke="#2c9a4a" stroke-width="2"/>`+
      `<path d="M33 47.5 L44 49.5 M52 49.5 L63 47.5" stroke="#3a2a1e" stroke-width="3.2" stroke-linecap="round"/>`+
      `<path d="M36 53.5 h6 M54 53.5 h6" stroke="#2a1a14" stroke-width="2.2" stroke-linecap="round"/>`+
      `<path d="M42 64 h12" stroke="#7a4a3a" stroke-width="2" stroke-linecap="round"/>`+
      `<g fill="#6a5a50" opacity=".55"><circle cx="38" cy="65" r=".8"/><circle cx="41" cy="68" r=".8"/><circle cx="45" cy="69" r=".8"/><circle cx="51" cy="69" r=".8"/><circle cx="55" cy="68" r=".8"/><circle cx="58" cy="65" r=".8"/><circle cx="48" cy="70" r=".8"/></g>`+
      `<path d="M40 41 h16" stroke="#b07a5a" stroke-width="1" opacity=".6"/>`);
  },
  sensei(){
    return svgWrap('#5a3446','#1a0e16',
      `<path d="M14 96 C16 76 32 70 48 70 C64 70 80 76 82 96Z" fill="#f4e8d8"/>`+
      `<path d="M30 96 L33 76 L63 76 L66 96Z" fill="#9fd3a8"/><path d="M33 76 L38 70 M63 76 L58 70" stroke="#9fd3a8" stroke-width="4"/>`+
      `<circle cx="56" cy="84" r="3.6" fill="#f6a6b8"/><path d="M56 87.6 v4" stroke="#5aa86a" stroke-width="1.4"/>`+
      `<rect x="43" y="62" width="10" height="10" fill="#efc7aa"/>`+
      `<ellipse cx="48" cy="47" rx="18" ry="20" fill="#f6dac6"/>`+
      `<path d="M29 50 C26 26 38 21 49 21 C61 21 71 28 67 50 C66 40 62 33 56 31 C50 36 40 37 33 36 C31 40 30 45 29 50Z" fill="#7a4a2e"/>`+
      `<path d="M66 34 C78 36 80 50 74 62 C72 52 70 44 66 40Z" fill="#7a4a2e"/><circle cx="68" cy="35" r="3" fill="#f6a6b8"/>`+
      `<path d="M37 51 q4 -3.2 8 0 M51 51 q4 -3.2 8 0" stroke="#3a2418" stroke-width="2" fill="none" stroke-linecap="round"/>`+
      `<ellipse cx="37" cy="57" rx="3.2" ry="1.8" fill="#f49a9a" opacity=".45"/><ellipse cx="59" cy="57" rx="3.2" ry="1.8" fill="#f49a9a" opacity=".45"/>`+
      `<path d="M44 59.5 Q48 63 52 59.5" stroke="#b05a50" stroke-width="1.7" fill="none" stroke-linecap="round"/>`);
  },
  chiyo(){
    return svgWrap('#5a4024','#170e06',
      `<path d="M12 96 C14 76 30 70 48 70 C66 70 82 76 84 96Z" fill="#76466a"/>`+
      `<path d="M40 70 L48 82 L56 70Z" fill="#f2e6cc"/>`+
      `<circle cx="48" cy="86" r="1.6" fill="#e8d8a8"/><circle cx="48" cy="92" r="1.6" fill="#e8d8a8"/>`+
      `<rect x="43" y="62" width="10" height="10" fill="#e9c4a6"/>`+
      `<ellipse cx="48" cy="48" rx="18" ry="19.5" fill="#f0cdb0"/>`+
      `<path d="M30 50 C28 30 38 25 48 25 C58 25 68 30 66 50 C64 40 58 34 48 34 C38 34 32 40 30 50Z" fill="#cfcad3"/>`+
      `<circle cx="48" cy="22" r="8" fill="#cfcad3"/><path d="M42 21 q6 -4 12 0" stroke="#a9a3b0" stroke-width="1.2" fill="none"/>`+
      `<rect x="44" y="13" width="8" height="2" rx="1" fill="#a85a48" transform="rotate(-18 48 14)"/>`+
      `<circle cx="40.5" cy="50" r="5.2" fill="none" stroke="#c9a24a" stroke-width="1.3"/><circle cx="55.5" cy="50" r="5.2" fill="none" stroke="#c9a24a" stroke-width="1.3"/><path d="M45.7 50 h4.6" stroke="#c9a24a" stroke-width="1.3"/>`+
      `<path d="M38 50.5 q2.5 -2 5 0 M53 50.5 q2.5 -2 5 0" stroke="#3a2418" stroke-width="1.8" fill="none" stroke-linecap="round"/>`+
      `<path d="M33.5 55 q2 2.5 1 5 M62.5 55 q-2 2.5 -1 5" stroke="#c99a82" stroke-width="1" fill="none"/>`+
      `<path d="M43.5 60 Q48 64 52.5 60" stroke="#a05a4a" stroke-width="1.7" fill="none" stroke-linecap="round"/>`);
  },
  phone(){
    return svgWrap('#16243a','#04070d',
      `<g stroke="#5fa8d8" stroke-width="2" fill="none" opacity=".75" stroke-linecap="round"><path d="M22 38 q-6 10 0 20"/><path d="M15 33 q-10 15 0 30" opacity=".6"/><path d="M74 38 q6 10 0 20"/><path d="M81 33 q10 15 0 30" opacity=".6"/></g>`+
      `<rect x="31" y="16" width="34" height="64" rx="6" fill="#0c1220" stroke="#8fb8d8" stroke-width="2"/>`+
      `<rect x="35" y="23" width="26" height="46" rx="2" fill="#1a3a5a"/>`+
      `<path d="M41 41 c0-3 3-4 4-3 l2 4 c.5 1-1 2-1.5 2.5 c1 2.5 3 4.5 5.5 5.5 c.5-.5 1.5-2 2.5-1.5 l4 2 c1 1 0 4-3 4 c-8 0-13.5-5.5-13.5-13.5Z" fill="#cfe6f6"/>`+
      `<rect x="40" y="27" width="16" height="2" rx="1" fill="#8fb8d8" opacity=".7"/>`+
      `<rect x="44" y="73" width="8" height="2" rx="1" fill="#8fb8d8"/>`+
      `<g fill="#fff" opacity=".18"><rect x="0" y="30" width="96" height="1"/><rect x="0" y="62" width="96" height="1"/></g>`);
  },
  yodaka(){
    return svgWrap('#3a0812','#060104',
      `<path d="M8 96 C10 72 28 64 48 64 C68 64 86 72 88 96Z" fill="#1c1a24"/>`+
      `<path d="M40 64 L48 74 L56 64" fill="none" stroke="#0e0c12" stroke-width="3"/>`+
      `<path d="M21 66 C15 36 30 14 48 14 C66 14 81 36 75 66 C70 58 66 50 64 44 L32 44 C30 50 26 58 21 66Z" fill="#26222e"/>`+
      `<rect x="43" y="60" width="10" height="8" fill="#c9b2a8"/>`+
      `<ellipse cx="48" cy="48" rx="15" ry="17.5" fill="#dcc6bc"/>`+
      `<path d="M32 50 C30 32 38 26 48 26 C58 26 66 32 64 50 L61 44 L58 52 L55 43 L51 53 L47 43 L43 52 L40 44 L36 52 L34 45Z" fill="#17141c"/>`+
      `<path d="M37 53.5 h8 M51 53.5 h8" stroke="#ff3050" stroke-width="1.4" opacity=".8"/>`+
      `<path d="M37 53.5 h8 M51 53.5 h8" stroke="#ff3050" stroke-width="4" opacity=".18"/>`+
      `<path d="M44 59.5 Q48 58.5 52 59.5" stroke="#7a5450" stroke-width="1.5" fill="none" stroke-linecap="round"/>`+
      `<path d="M28 44 C28 22 68 22 68 44" stroke="#55505e" stroke-width="3.5" fill="none"/>`+
      `<rect x="24" y="40" width="9" height="15" rx="3" fill="#3a3644"/><rect x="63" y="40" width="9" height="15" rx="3" fill="#3a3644"/>`+
      `<path d="M29 54 Q31 64 41 62" stroke="#55505e" stroke-width="2" fill="none"/><circle cx="42" cy="62" r="2" fill="#ff3050"/>`+
      `<path d="M21 66 C15 36 30 14 48 14 C66 14 81 36 75 66" stroke="#ff3050" stroke-width="1" fill="none" opacity=".5"/>`);
  },
  sakura(f){
    const fake=f==='fake';
    const petals=[0,72,144,216,288].filter((a,i)=>!(fake&&i===2))
      .map(a=>`<ellipse cx="48" cy="31" rx="10" ry="15" fill="${fake?'#b8a0a8':'#f6b6c8'}" transform="rotate(${a} 48 48)"/>`).join('');
    const ghost=fake?`<g transform="translate(2 0)" opacity=".35">${[0,72,216,288].map(a=>`<ellipse cx="48" cy="31" rx="10" ry="15" fill="#ff2050" transform="rotate(${a} 48 48)"/>`).join('')}</g>`:'';
    return svgWrap(fake?'#2a1820':'#4a2038',fake?'#050204':'#12060e',
      ghost+petals+`<circle cx="48" cy="48" r="6" fill="${fake?'#6a4a52':'#e07a98'}"/>`+
      [0,72,144,216,288].map(a=>`<circle cx="48" cy="40" r="1.3" fill="${fake?'#3a2a2e':'#ffe2a8'}" transform="rotate(${a} 48 48)"/>`).join('')+
      (fake?`<g fill="#fff" opacity=".22"><rect x="6" y="20" width="84" height="1.4"/><rect x="10" y="58" width="76" height="1"/><rect x="4" y="71" width="40" height="1"/></g>`:''),true);
  },
  tabibito(){
    return svgWrap('#1a2450','#05070f',
      `<circle cx="70" cy="22" r="2" fill="#fff6c8"/><circle cx="28" cy="16" r="1" fill="#fff" opacity=".6"/><circle cx="52" cy="12" r="1" fill="#fff" opacity=".5"/>`+
      `<path d="M0 60 L96 60 L96 96 L0 96Z" fill="#0a0c16"/>`+
      `<path d="M38 60 L58 60 L84 96 L12 96Z" fill="#20222c"/>`+
      `<path d="M48 64 v5 M48 74 v7 M48 86 v9" stroke="#e8d070" stroke-width="2"/>`+
      `<ellipse cx="34" cy="78" rx="10" ry="6" fill="#fff4c0" opacity=".25"/><ellipse cx="62" cy="78" rx="10" ry="6" fill="#fff4c0" opacity=".25"/>`+
      `<circle cx="34" cy="78" r="3" fill="#fff8d8"/><circle cx="62" cy="78" r="3" fill="#fff8d8"/>`+
      `<path d="M0 60 Q20 54 40 60 Q60 54 96 59" stroke="#2a3a6a" stroke-width="1.5" fill="none"/>`,true);
  },
  hitori(){
    return svgWrap('#1e1a40','#05040e',
      `<circle cx="48" cy="40" r="14" fill="#fff8d0" opacity=".12"/>`+
      `<path d="M48 28 L51.5 37 L61 37.5 L53.5 43.5 L56 53 L48 47.5 L40 53 L42.5 43.5 L35 37.5 L44.5 37Z" fill="#fff2b0"/>`+
      `<path d="M0 74 Q48 62 96 74 L96 96 L0 96Z" fill="#0c0a1c"/>`+
      `<path d="M46 74 c0-4 4-4 4 0 v8 h-4Z" fill="#2a2648"/><circle cx="48" cy="70" r="2.6" fill="#2a2648"/>`,true);
  },
  joren(){
    return svgWrap('#162a36','#03080c',
      `<path d="M58 16 a16 16 0 1 0 14 26 a13 13 0 1 1 -14 -26Z" fill="#f0e6c0"/>`+
      `<path d="M30 58 h28 v14 a10 10 0 0 1 -10 10 h-8 a10 10 0 0 1 -10 -10Z" fill="#cfd8e0"/>`+
      `<path d="M58 62 a6 6 0 0 1 0 12" stroke="#cfd8e0" stroke-width="3" fill="none"/>`+
      `<path d="M38 52 q-3 -5 0 -9 M46 52 q-3 -5 0 -9" stroke="#cfd8e0" stroke-width="1.6" fill="none" opacity=".6" stroke-linecap="round"/>`,true);
  },
  ghost(){
    return svgWrap('#120a12','#000',
      `<g fill="#fff" opacity=".12"><rect x="0" y="18" width="96" height="1"/><rect x="0" y="41" width="96" height="2"/><rect x="0" y="66" width="96" height="1"/><rect x="0" y="80" width="96" height="1"/></g>`+
      `<ellipse cx="38" cy="46" rx="4" ry="2" fill="#e83055" opacity=".55"/><ellipse cx="58" cy="46" rx="4" ry="2" fill="#e83055" opacity=".55"/>`+
      `<text x="48" y="74" text-anchor="middle" font-size="14" fill="#6a5a6a" font-family="monospace">…</text>`,true);
  },
  sea(){
    return svgWrap('#0c2a40','#01060c',
      `<circle cx="48" cy="58" r="10" fill="#ffd27a" opacity=".12"/><circle cx="48" cy="58" r="3" fill="#ffe2a0" opacity=".85"/>`+
      `<g stroke="#4fa6c8" fill="none" stroke-width="1.6" opacity=".7"><path d="M6 36 q7 -5 14 0 t14 0 t14 0 t14 0 t14 0 t14 0"/><path d="M0 46 q7 -5 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0" opacity=".6"/><path d="M6 76 q7 -5 14 0 t14 0 t14 0 t14 0 t14 0 t14 0" opacity=".5"/></g>`+
      `<path d="M36 70 L40 60 L44 70 M52 70 L56 60 L60 70" stroke="#2a5068" stroke-width="1.4" fill="none" opacity=".6"/>`);
  },
};
const CAST={
  self:    {nm:'だんのうら',  cls:'self'},
  kid:     {nm:'子ども',      cls:'kid'},
  hancho:  {nm:'班長',        cls:'hancho'},
  sensei:  {nm:'保育園の先生',cls:'sensei'},
  chiyo:   {nm:'千代さん',    cls:'chiyo'},
  phone:   {nm:'電話の声',    cls:'phone'},
  yodaka:  {nm:'夜鷹',        cls:'yodaka', chat:true},
  sakura:  {nm:'さくら',      cls:'listener', chat:true},
  tabibito:{nm:'夜空の旅人',  cls:'listener', chat:true},
  hitori:  {nm:'ひとりぼっち',cls:'listener', chat:true},
  joren:   {nm:'深夜の常連',  cls:'listener', chat:true},
  fake:    {nm:'さくら',      cls:'fake', chat:true, por:'sakura', pf:'fake'},
  ghost:   {nm:'（削除済み）',cls:'ghost', chat:true},
  sea:     {nm:'？？？',      cls:'sea'},
};
const SELF_IMG=f=>{
  const k=['normal','happy','win','tired','fear','collapse'].includes(f)?f:'normal';
  return (typeof CHAR_IMG!=='undefined'&&CHAR_IMG[k])||('assets/img/char_'+k+'.webp');
};
function portraitHTML(w,f){
  if(w==='self')return `<img src="${SELF_IMG(f)}" alt="">`;
  const c=CAST[w];if(!c)return '';
  const fn=PORTRAIT[c.por||w];
  return fn?fn(c.pf||f):'';
}

// ──────────────────────────
// 効果（どれも小さく）
// ──────────────────────────
const FX_LABEL={mental:'精神',fatigue:'疲労',childStress:'育児ストレス',money:'所持金',debt:'借金',jobRep:'仕事評価',
  certKnow:'資格知識',followers:'フォロワー',streamPop:'配信人気',flame:'炎上',hope:'希望',kindness:'やさしさ',willpower:'意志',loneliness:'孤独'};
const FX_GOOD_DOWN={fatigue:1,childStress:1,debt:1,flame:1,loneliness:1};
function applyFx(fx){
  if(!fx)return [];
  const out=[];const cl=v=>Math.max(0,Math.min(100,Math.round(v)));
  Object.keys(fx).forEach(k=>{
    const v=fx[k];if(!v)return;
    if(['mental','fatigue','childStress','jobRep','certKnow','streamPop'].includes(k))gs[k]=cl((gs[k]||0)+v);
    else if(k==='followers')gs.followers=Math.max(0,gs.followers+v);
    else if(k==='flame')gs.flame=Math.max(0,gs.flame+v);
    else if(k==='debt')gs.debt=Math.max(0,gs.debt+v);
    else if(k==='money'){
      if(v>=0)gs.money+=v;
      else if(gs.money>=-v)gs.money+=v;
      else{gs.debt+=(-v-gs.money);gs.money=0;}
    }
    else if(gs.personality&&k in gs.personality)gs.personality[k]=cl(gs.personality[k]+v);
    else return;
    const good=FX_GOOD_DOWN[k]?v<0:v>0;
    const val=(k==='money'||k==='debt')?(v>0?'+':'-')+'¥'+Math.abs(v).toLocaleString():(v>0?'+':'')+v;
    out.push({t:(FX_LABEL[k]||k)+' '+val,good});
  });
  try{updateStats();}catch(e){}
  return out;
}
function applySet(set,add){
  const s=S();
  if(set)Object.keys(set).forEach(k=>{s.flags[k]=set[k];});
  if(add)Object.keys(add).forEach(k=>{s.bond[k]=(s.bond[k]||0)+add[k];});
}

// ══════════════════════════════════════════════════════════
// シーン一覧（30夜）
//   from/to: 出せる夜の範囲   prio: 10=固定の夜 / 7=状態への反応 / 5=幅のある本筋 / 3=余白
//   cond(f,s): 出す条件   lines(f,s): 台本（シーン開始時に組み立てる）
// ══════════════════════════════════════════════════════════
const SCENES=[
// ── 第一幕 沈む夜 ─────────────────────────
{id:'d01_room',title:'22時の部屋',from:1,to:1,prio:10,bg:'main',
 lines:()=>[
  N('夜の22時。洗い物を終えて、ようやく椅子に座った。'),
  N('マイクの電源を入れようとしたとき、襖が、すこしだけ開いた。'),
  K('……パパ、まだねないの？','sleepy'),
  D('normal','ん。パパはもうちょっとだけ、お仕事。'),
  K('よるの、おしごと？'),
  K('じゃあ……えほん、いっこだけ。'),
  N('小さな手が差し出したのは、角の擦り切れた絵本だった。\n『うみのそこの　おしろ』。'),
  C({k:'read',t:'「一冊だけな」と、隣に座る',fx:{childStress:-5,mental:2,fatigue:2},set:{d1_story:true},then:[
      N('読み終わる前に、寝息が聞こえてきた。'),
      K('……うみのそこにも、おうち、あるの……','sleepy'),
      D('happy','あるよ。……たぶんな。'),
      N('開いたままのページには、暗い海の底で灯りをともす、小さなお城が描かれていた。')]},
    {k:'later',t:'「先に寝てて。すぐ行くから」',fx:{childStress:3},set:{d1_later:true},then:[
      K('……うん。すぐね。','sleepy'),
      N('襖が閉まる。絵本は、廊下に置かれたままだった。'),
      D('tired','……すぐ、な。')]}),
  N('借金、84万。保育料の引き落とし。来月の試験。'),
  D('normal','さて。……沈むか、這い上がるか、だ。'),
 ]},

{id:'d02_hancho',title:'班長',from:2,to:2,prio:10,bg:'factory',
 lines:()=>[
  N('——昼。工場の休憩所。自販機の唸りだけが響いていた。'),
  H('おう。……ひでえ顔だな。'),
  D('tired','夜、ちょっと用事がありまして。'),
  H('用事、ねえ。'),
  H('まあいい。月末の28日、社内で乙4の模試をやる。危険物のな。お前の名前も書いといた。'),
  D('fear','勝手に……。'),
  H('受からんでいい。受けろ。紙の上で一回燃やしとけば、本番で燃えん。'),
  H('それとな。三号ラインの機嫌が悪い。音、聞いといてくれ。'),
  C({k:'yes',t:'「受けます」',fx:{certKnow:2,jobRep:1},set:{mock_yes:true},then:[
      H('おう。')]},
    {k:'maybe',t:'「……考えときます」',set:{mock_maybe:true},then:[
      H('考えるのはタダだ。答えは28日に聞く。')]}),
  N('班長は缶コーヒーを二本買って、一本を黙って机に置いていった。'),
 ]},

{id:'d03_call',title:'■■様',from:3,to:3,prio:10,bg:'main',
 lines:()=>[
  SFX('phone'),
  N('22時を少し過ぎたころ。スマホが震えた。知らない番号。'),
  D('fear','……はい。'),
  P('夜分に失礼いたします。■■■■様の携帯電話で、お間違いないでしょうか。'),
  N('久しぶりに、自分の本当の名前を聞いた。\n配信では、決して口にしない名前だ。'),
  P('ご返済が、二か月分確認できておりません。本日はそのご確認でお電話いたしました。'),
  P('お支払いのご予定を、お聞かせいただけますでしょうか。'),
  N('襖の向こうで、子どもが寝返りを打つ音がした。'),
  C({k:'honest',t:'「……正直に言います。今は、払えません」',fx:{mental:-2},set:{debt_honest:true},then:[
      P('……承知いたしました。お話しいただけて、助かります。'),
      P('来週、改めてご相談のお電話を差し上げます。ご返済計画は、見直せる場合もございますので。'),
      D('tired','……はい。')]},
    {k:'dodge',t:'何も言わずに、通話を切る',fx:{mental:-4},set:{debt_dodge:true},then:[
      N('画面の通話時間が、0:47で止まった。'),
      N('名前を呼ばれた耳の奥が、いつまでも熱かった。')]}),
 ]},

{id:'d04_chiyo',title:'お隣の千代さん',from:4,to:4,prio:10,bg:'rest',
 lines:()=>[
  N('ゴミ出しから戻ると、隣の部屋の戸が開いていた。'),
  CH('あんた、夜遅うまで起きとるねえ。壁が薄いけえ、声がね、ちょっとだけ。'),
  D('fear','す、すみません。うるさかったですか。'),
  CH('ええんよ。年寄りは夜が長いけえ。ラジオ聞いとるみたいで、よう眠れる。'),
  CH('うちは下関の生まれでね。海の近うで育ったけえ、夜の声には慣れとるんよ。'),
  CH('……あの子、夜中にたまに起きて泣いとるじゃろ。あんたが忙しい晩は、うちに声かけんさい。'),
  C({k:'trust',t:'「……お願いするかもしれません」',fx:{mental:3},set:{chiyo_trust:true},add:{chiyo:1},then:[
      CH('ほうね。ほいじゃ、戸を叩いてくれりゃええけえ。'),
      N('千代さんは、それだけ言って笑った。目尻のしわが、深くなった。')]},
    {k:'decline',t:'「大丈夫です。なんとかなってますから」',fx:{mental:1},set:{chiyo_decline:true},then:[
      CH('……ほうね。なんとかなっとる人の顔には、見えんけどねえ。'),
      N('千代さんはそう言って、みかんを二つ、手に乗せていった。')]}),
 ]},

{id:'d05_whisper',title:'小さな声で',from:5,to:6,prio:5,bg:'main',
 lines:()=>[
  gs.streamCount>0
   ?N('昨夜の配信のアーカイブに、遅れてコメントがついていた。')
   :N('配信の告知に、ひとつだけ返信がついていた。'),
  SA('こんばんは。いつも、音を小さくして聞いています。'),
  SA('もしよかったら、もう少しだけ小さい声で話してもらえますか。\n……隣で、寝ているので。'),
  D('normal','隣で、寝てる……？'),
  N('誰が、とは書いていなかった。'),
  C({k:'whisper',t:'今夜は、ささやき声でやってみる',fx:{followers:2,streamPop:1},set:{whisper:true},add:{sakura:1},then:[
      N('マイクのゲインを、少しだけ下げた。'),
      D('happy','……深夜ラジオっぽくて、悪くないかもな。')]},
    {k:'usual',t:'気にせず、いつも通りやる',set:{no_whisper:true},then:[
      N('返事はしなかった。'),
      N('でも、その夜の声は、自分でも気づかないうちに少しだけ低くなっていた。')]}),
 ]},

{id:'d06_yodaka',title:'夜鷹',from:6,to:8,prio:5,bg:'main',
 lines:()=>[
  N('DMの通知。差出人は「夜鷹」。\n同じ時間帯に配信している、登録者三千人の配信者だった。'),
  Y('どうも。だんのうらさん、ですよね。同接、毎晩ひとケタっすね。'),
  Y('借金84万、子持ち、工場勤務。……ネタの宝庫じゃないすか。なんで使わないんすか。'),
  Y('泣ける話は伸びますよ。盛ったらもっと伸びる。俺はそうやって三千いきました。'),
  D('tired','…………。'),
  C({k:'reply',t:'「俺は俺のやり方でやる」と返す',fx:{mental:2},set:{yodaka_reply:true},add:{yodaka:1},then:[
      Y('へえ。……そのやり方で、いつまで持つんすかね。'),
      N('既読がついて、それきりだった。')]},
    {k:'ignore',t:'既読だけつけて、閉じる',set:{yodaka_ignore:true},then:[
      N('画面を伏せた。'),
      N('夜鷹のアイコンは、目のところだけが赤く光る、鳥の絵だった。')]}),
  N('夜鷹の配信は、まだ続いていた。\n配信時間：31時間。'),
 ]},

{id:'d07_drawing',title:'くらいうみの絵',from:7,to:7,prio:10,bg:'child',
 lines:()=>[
  N('——夕方、保育園のお迎え。先生に呼び止められた。'),
  T('お父さん、少しだけいいですか。'),
  T('今日、お絵かきの時間にこれを描いたんです。……海、だそうです。'),
  N('画用紙いっぱいの、黒に近い青。\nその真ん中に、黄色いクレヨンの点がひとつだけあった。'),
  T('この点はなあに？って聞いたら、「パパのひかり」って。'),
  T('それと……お昼寝のとき、「しずかにして、パパがしゃべってる」って言うことがあって。'),
  T('夜、遅くまで起きてるのかなって。……責めてるんじゃないんです。心配で。'),
  C({k:'honest',t:'「夜、仕事で声を出していて……気をつけます」',fx:{childStress:-3},set:{teacher_honest:true},add:{sensei:1},then:[
      T('話してくださって、ありがとうございます。園でも、気にかけておきますね。')]},
    {k:'vague',t:'「……すみません、気をつけます」',set:{teacher_vague:true},then:[
      T('はい。……無理、しないでくださいね。お父さんも。')]}),
  N('帰り道、子どもは絵を大事そうに抱えていた。「パパにあげる」と言って。'),
  FX({mental:2}),
 ]},

// ── 第二幕 波の下 ─────────────────────────
{id:'d08_gokigen',title:'ごきげんよう',from:8,to:9,prio:5,bg:'rest',
 lines:()=>[
  N('——朝。トーストを焦がしかけたとき、背中で小さな声がした。'),
  K('ごきげんよう。'),
  D('fear','……え。'),
  K('ごきげんよう、だんのうらです。'),
  N('首をかしげて、得意げに笑っている。\n画面の中の、紫の髪の女の子の——あの挨拶だった。'),
  K('パパのパソコンのなかの、おねえさん。よる、しゃべってるでしょ。'),
  C({k:'tell',t:'「あれはね、パパなんだよ。夜は声のお仕事をしてるんだ」',fx:{childStress:-3,mental:2},set:{told_child:true},add:{child:1},then:[
      K('パパが、おねえさんなの？'),
      D('happy','そう。……変か？'),
      K('へんじゃない。かわいい。'),
      N('笑ってしまった。焦げたトーストまで、少し甘く感じた。')]},
    {k:'hide',t:'「夢でも見たんじゃないか」',fx:{childStress:3},set:{hid_child:true},then:[
      K('……ゆめじゃないもん。','sad'),
      N('子どもは少しだけ口をとがらせて、それ以上は何も言わなかった。')]}),
 ]},

{id:'d09_line3',title:'三号ライン',from:9,to:11,prio:5,bg:'factory',
 lines:()=>[
  N('——工場。三号ライン。昭和の終わりに据えられた、いちばん古い搬送ラインだ。'),
  N('耳を当てると、モーターの奥で、キィ……と細い音が鳴った。'),
  H('聞こえるか。'),
  D('normal','ベアリング……ですかね。まだ小さいけど。'),
  H('夜勤のやつらは「三号が夜に鳴く」って言ってな。気味悪がって近寄らん。'),
  H('止まったら、工場ぜんぶが止まる。……誰かが、ちゃんと見てなきゃならん。'),
  C({k:'own',t:'「点検表、俺が作ります」',fx:{jobRep:3,fatigue:3},set:{line3_owner:true},add:{hancho:1},then:[
      H('……おう。頼んだ。'),
      N('班長はそれだけ言って背中を向けた。でも、少し声が軽かった。')]},
    {k:'watch',t:'「了解です。気にかけておきます」',set:{line3_watch:true},then:[
      H('おう。')]}),
  N('帰り際、もう一度だけ振り返った。三号ラインは、まだ小さく鳴いていた。'),
 ]},

{id:'d10_sakura',title:'うちの子が',from:10,to:10,prio:10,bg:'main',
 lines:()=>[
  N('昨夜のアーカイブに、さくらからの長いコメントが残っていた。'),
  SA('いつもありがとうございます。実は、うちの子、夜泣きがひどくて。'),
  SA('三時ごろに起きて、抱っこしてないと泣きやまないんです。その間、ずっとイヤホンで聞いてます。'),
  SA('昨日、だんのうらさんの声を小さく流してたら、腕の中で寝ました。はじめて、朝まで。'),
  N('——隣で寝ている、というのは、そういうことだったのか。'),
  D('normal','……そっか。'),
  SA('すみません、長々と。誰かに言いたかったんです。'),
  C({k:'night',t:'「こちらこそ。おやすみなさい、って言わせてください」',fx:{mental:3},set:{sakura_goodnight:true},add:{sakura:1},then:[
      SA('……はい。おやすみなさい。'),
      N('画面の向こうの、知らない誰かの夜を思った。')]},
    {k:'care',t:'「無理しないでくださいね」と返す',fx:{mental:2},add:{sakura:1},then:[
      SA('だんのうらさんこそ。'),
      N('返された言葉が、思っていたより深く刺さった。')]}),
  FX(null,{sakura_parent:true}),
 ]},

{id:'d11_call2',title:'二度目の電話',from:11,to:12,prio:5,bg:'main',
 lines:f=>f.debt_honest?[
  SFX('phone'),
  N('約束どおり、あの番号から電話が来た。'),
  P('先日はありがとうございました。■■■■様のご状況を、社内で確認いたしました。'),
  P('毎月のご返済額を減らして、期間を延ばすご提案ができます。遅延の損害金も、一部ご相談可能です。'),
  D('fear','……そんなこと、できるんですか。'),
  P('お話しいただけた方には、できることがあります。……私どもも、取り立てたいわけではありませんので。'),
  N('事務的な声だった。でも、それは確かに、人の声だった。'),
  C({k:'plan',t:'「お願いします」',fx:{debt:-10000,mental:3},set:{debt_plan:true},then:[
      P('承知いたしました。書類をお送りいたします。')]},
    {k:'wait',t:'「少し、考えさせてください」',fx:{mental:1},set:{debt_plan_wait:true},then:[
      P('もちろんです。いつでもお電話ください。')]}),
 ]:[
  SFX('phone'),
  N('また、あの番号だった。今度は、出るまで切れなかった。'),
  P('■■■■様。先日はお電話が途中で切れてしまったようで。'),
  P('このままですと、ご自宅に書面でのご通知をお送りすることになります。……一括でのご請求を含めて、です。'),
  N('喉の奥が、乾いて張りついた。'),
  C({k:'confess',t:'「……払えません。本当は、払えないんです」',fx:{mental:-1},set:{late_honest:true,debt_honest:true},then:[
      P('……ありがとうございます。そう言っていただければ、ご相談の余地がございます。'),
      N('たった一言で、電話の向こうの温度が変わった気がした。')]},
    {k:'dodge',t:'「すみません、今、手が離せなくて」',fx:{mental:-4},set:{debt_dodge2:true},then:[
      P('……かしこまりました。書面にてご連絡いたします。'),
      N('通話の切れた音が、やけに長く耳に残った。')]}),
 ]},

{id:'d13_dream',title:'海の夢',from:13,to:13,prio:10,bg:'sea',
 lines:()=>[
  N('気がつくと、机に突っ伏していた。配信の待機画面が、青白く光っている。'),
  N('……いや。光っているのは、画面じゃない。'),
  N('足元が、冷たい。水だ。'),
  N('暗い水の底に、瓦屋根が並んでいた。\n灯籠が、ひとつ、ふたつ、ゆらゆらと揺れている。'),
  SEA('…………。'),
  N('誰かが、呼んでいる。配信の名前じゃない。もっと古い、本当の名前で。'),
  N('でも水が声を丸めてしまって、うまく聞き取れない。'),
  D('fear','……誰だ。'),
  BG('main'),SFX('thud'),
  N('——ゴン、と額が机にぶつかった。'),
  N('時計は22時41分。待機画面のコメント欄に、一行だけ残っていた。'),
  GH('おかえりなさい'),
  D('tired','……寝てたのか、俺。'),
  FX({fatigue:-4,mental:-2},{dream1:true}),
 ]},

{id:'d14_miyako',title:'波の下の都',from:14,to:15,prio:5,bg:'rest',
 lines:f=>[
  f.chiyo_trust
   ?N('今夜は、千代さんの部屋で子どもが寝ている。\n迎えに行くと、千代さんはお茶を淹れて待っていた。')
   :N('千代さんが、煮物の鍋を持って戸を叩いた。\n「作りすぎてねえ」と言って、上がり框に腰を下ろした。'),
  f.told_child
   ?CH('あんたの配信の名前……「だんのうら」いうんじゃろ。あの子が「ごきげんよう」言うて、教えてくれたんよ。')
   :CH('あんたの配信の名前……「だんのうら」いうんじゃろ。壁越しに、聞こえたけえ。'),
  CH('壇ノ浦はね、うちの生まれたところのすぐ先よ。平家が、最後に沈んだ海。'),
  CH('幼い帝さまがおってね。お祖母さまが抱いて、海に入ったんよ。'),
  CH('怖がる帝さまに、こう言うたんじゃと。——「浪の下にも、都の候ぞ」。'),
  CH('波の下にも都がありますよ、って。……子どもを寝かしつける言葉みたいでねえ。うちは昔から、あそこが一番悲しかった。'),
  D('normal','……その子は、眠れたんでしょうか。'),
  CH('さあねえ。……でもね、あんた。'),
  CH('沈むときの言葉より、起こすときの言葉のほうが、子どもには要るんよ。「おはよう」とかね。'),
  C({k:'morning',t:'「……『おはよう』を、毎朝ちゃんと言います」',fx:{childStress:-2,mental:2},set:{promise_morning:true},add:{chiyo:1},then:[
      CH('ほうね。それでええんよ。')]},
    {k:'sink',t:'「……沈むのも、楽そうですけどね」',fx:{mental:-2},set:{tempted_sea:true},then:[
      CH('冗談でも、それは言いなさんな。'),
      N('千代さんの声が、はじめて少しだけ硬くなった。')]}),
  FX(null,{heard_miyako:true}),
 ]},

{id:'d16_recital',title:'発表会のおしらせ',from:16,to:16,prio:10,bg:'child',
 lines:f=>[
  N('連絡帳に、一枚のプリントが挟まっていた。\n『生活発表会のおしらせ　27日（土）』'),
  T('お父さん。劇の役、決まったんですよ。'),
  T('『うみのそこの　おしろ』っていうお話で……自分から「あかりのやく、やる」って。'),
  ...when(f.d1_story,N('——一日目の夜に読んだ、あの絵本だ。')),
  K('くらいところでね、あかりをもって、みんなをおうちにかえすの。'),
  K('パパ、みにきてくれる？'),
  N('27日、土曜日。……三号ラインの、定期点検の週だった。'),
  C({k:'promise',t:'「必ず行く。約束だ」',fx:{childStress:-4,mental:2},set:{promise_recital:true},add:{child:1},then:[
      K('やくそく！'),
      N('小指が、ぎゅっと絡んできた。思っていたより、ずっと強い力だった。')]},
    {k:'maybe',t:'「行けたら、行くよ」',fx:{childStress:2},set:{maybe_recital:true},then:[
      K('……いけたら？','sad'),
      N('子どもは、その言葉の意味を、もう知っている顔をしていた。')]}),
 ]},

{id:'d15_collab',title:'夜鷹の誘い',from:15,to:18,prio:5,bg:'main',
 lines:()=>[
  N('また、夜鷹からDMが来た。'),
  Y('コラボしません？　企画名「借金84万完済まで寝ない耐久」。'),
  Y('俺のとこのリスナーも流します。切り抜きも俺が作る。……ちょっと盛ってもらいますけど。'),
  Y('マジで言うと、俺もう一人じゃ数字持たないんすよ。新しい燃料が要る。'),
  N('夜鷹の配信時間の表示は、今夜で52時間になっていた。'),
  C({k:'collab',t:'「やる」',fx:{followers:10,money:8000,flame:1,fatigue:5},set:{yodaka_collab:true},add:{yodaka:1},then:[
      Y('話が早い。じゃ、明日の夜。……寝ないでくださいよ。'),
      N('画面の向こうで笑ったような気がした。その笑いは、どこか乾いていた。')]},
    {k:'refuse',t:'「やらない。……お前も、少し寝ろ」',fx:{mental:2},set:{yodaka_refuse:true},add:{yodaka:1},then:[
      Y('……は？　説教とか、いらないんで。'),
      N('既読がついた。数分後、もう一度だけ通知が鳴った。'),
      Y('寝方、忘れたんすよ。')]}),
 ]},

{id:'d17_goodnight',title:'誰が、おやすみを',from:17,to:17,prio:10,bg:'main',
 lines:()=>[
  N('昨夜の配信の終わり際、さくらのコメントが流れた。'),
  SA('だんのうらさんって、毎晩みんなに「おやすみ」って言ってくれますよね。'),
  SA('じゃあ、だんのうらさんには、誰が「おやすみ」って言うんですか。'),
  N('キーボードの上で、指が止まった。'),
  N('子どもを寝かせて、配信を切って、明け方の部屋で一人。\n……最後に誰かに言われたのは、いつだったろう。'),
  C({k:'child',t:'「子どもが言ってくれますよ」と返す',fx:{mental:2},set:{sakura_answer_child:true},add:{sakura:1},then:[
      SA('よかった。……ちゃんと、聞いてあげてくださいね。言ってもらう側も。')]},
    {k:'confide',t:'「……誰も」と、正直に返す',fx:{mental:1,loneliness:-3},set:{sakura_confide:true},add:{sakura:2},then:[
      SA('じゃあ、私が言います。'),
      SA('おやすみなさい、だんのうらさん。'),
      N('画面の文字に向かって、小さく「おやすみ」と返した。誰にも聞こえない声で。')]}),
 ]},

{id:'d18_hitori',title:'ひとりぼっち',from:18,to:20,prio:5,bg:'main',
 lines:()=>[
  N('勉強配信の常連、「ひとりぼっち」からDMが来た。'),
  HI('あの、急にすみません。私、高校、ずっと行けてなくて。'),
  HI('でも、だんのうらさんの勉強配信を聞きながら、乙4の勉強してたんです。高校生でも受けられるって知って。'),
  HI('教室には入れないけど……試験会場なら、行ける気がして。'),
  D('normal','……そうか。'),
  C({k:'together',t:'「じゃあ一緒に受けよう。来月、試験会場で」',fx:{certKnow:3,mental:2},set:{hitori_promise:true},add:{hitori:1},then:[
      HI('……はい。約束です。'),
      HI('名前、ひとりぼっちなのに。ひとりじゃなくなっちゃいました。')]},
    {k:'gentle',t:'「無理すんなよ。行ける日に、行けばいい」',fx:{mental:2},set:{hitori_gentle:true},add:{hitori:1},then:[
      HI('……はい。行ける日に、行きます。')]}),
 ]},

{id:'x_pa',title:'壇之浦パーキング',from:9,to:20,prio:3,bg:'sea',
 lines:()=>[
  N('配信の待機中、「夜空の旅人」からコメントが届いた。\n長距離トラックの運転手だと、前に言っていた。'),
  TB('今、関門橋を渡って、壇之浦パーキングで休憩中です。'),
  TB('だんのうらさんの名前の場所だなあと思って。海、真っ暗ですよ。'),
  TB('……でも、沖のほうに一個だけ、灯りが見えます。船かな。ずっと動かないんですけど。'),
  D('normal','……動かない灯り、か。'),
  TB('じゃ、もうひと走りしてきます。九州の朝、見てきますね。'),
  N('地図アプリで調べた。壇之浦パーキングエリア。本当に、ある場所だった。'),
  FX({mental:2},{saw_pa:true}),
 ]},

// ── 状態への反応（空いている夜に一度ずつ） ──
{id:'r_limit',title:'限界',from:8,to:29,prio:7,bg:'main',cond:()=>gs.mental<=30,
 lines:f=>[
  N('椅子から立ち上がろうとして、膝が抜けた。床が、思ったより近かった。'),
  ...(f.chiyo_trust?[
    SFX('knock'),
    N('戸を叩く音。'),
    CH('物音がしたけえ。……あんた、顔が真っ白じゃないね。'),
    CH('今夜はもう寝んさい。あの子は、うちが見とるけえ。'),
    D('tired','……ありがとうございます。'),
    FX({mental:5,fatigue:-6})
  ]:[
    N('襖が開いた。子どもが、自分の毛布を引きずってきた。'),
    K('パパ、さむいの？'),
    K('これ、かしてあげる。'),
    D('tired','……ありがとう。'),
    FX({mental:5,fatigue:-3})
  ]),
  N('床に座ったまま、しばらく動けなかった。でも、ひとりではなかった。'),
  FX(null,{hit_bottom:true}),
 ]},

{id:'r_flame',title:'火の粉',from:6,to:29,prio:7,bg:'main',cond:()=>gs.flame>=3,
 lines:()=>[
  N('昨夜の配信から、知らないアカウントのコメントが止まらない。\n『借金で同情集め』『子どもをネタにするな』'),
  N('反論を打ちかけて、消した。もう一度打って、また消した。'),
  JO('荒らしは消しておきました。だんのうらさんは、いつも通りでいてください。'),
  TB('ここ、俺たちの居場所なんで。'),
  C({k:'calm',t:'反論せず、いつも通り配信する',fx:{flame:-1,mental:2},set:{flame_calm:true},then:[
      N('深呼吸をひとつ。いつもの挨拶を、いつもの声で言った。')]},
    {k:'reply',t:'一言だけ、言い返す',fx:{flame:1,mental:1},set:{flame_reply:true},then:[
      N('送信したあとで、手のひらが汗で濡れているのに気づいた。')]}),
 ]},

{id:'r_child',title:'パパ、きょうも？',from:5,to:29,prio:7,bg:'child',cond:()=>gs.childStress>=60,
 lines:()=>[
  N('寝かしつけの途中で、子どもが服の裾をつかんだ。'),
  K('パパ、きょうも、よるのおしごと？','sad'),
  K('……いかないで。','sad'),
  C({k:'stay',t:'「今夜は、ずっとここにいるよ」',fx:{childStress:-5,mental:2,fatigue:-2},set:{stayed_child:true},add:{child:1},then:[
      N('子どもの手から、少しずつ力が抜けていった。'),
      K('……ずっと、ね。','sleepy')]},
    {k:'leave',t:'「ごめん。少しだけ、な」',fx:{childStress:2},set:{left_child:true},then:[
      K('……すこしだけ、ね。','sad'),
      N('襖を閉める手が、少しだけ重かった。')]}),
 ]},

{id:'r_reach',title:'声が届いた',from:5,to:29,prio:7,bg:'main',cond:()=>gs.followers>=100||gs.hadBuzz,
 lines:()=>[
  N('通知が鳴りやまない。フォロワーが、三桁を超えていた。'),
  JO('おめでとうございます。古参ヅラしていいですか。'),
  TB('最初の夜から聞いてました。ここ、広くなりましたね。'),
  ...when(gs.day<18,SA('おめでとうございます。……ちょっと寂しいけど、うれしい。')),
  D('happy','……みんなのおかげ、だな。'),
  FX({mental:3,streamPop:2},{reached:true}),
 ]},

{id:'r_hum',title:'鼻歌',from:8,to:29,prio:7,bg:'child',cond:()=>gs.skills&&gs.skills.singSkill>=2,
 lines:()=>[
  N('洗濯物を畳んでいると、隣から鼻歌が聞こえてきた。'),
  N('夜中に、小声で練習していたあの曲だった。'),
  K('〜♪　……これ、パパのうた。'),
  K('よるにね、ちっちゃくきこえるの。おふとんのなかで、いっしょにうたってる。'),
  D('happy','……下手だろ。'),
  K('じょうず。'),
  FX({mental:3,childStress:-2},{child_hums:true}),
 ]},

// ── 第三幕 底 ─────────────────────────
{id:'d21_fake',title:'さくら、が',from:21,to:21,prio:10,bg:'eerie',
 lines:()=>[
  N('ここ三日、さくらのコメントがない。'),
  N('夜泣きが落ち着いたなら、いい。そう思うことにしていた。'),
  N('待機画面に、コメントがひとつ流れた。'),
  FK('こんばんは'),
  FK('30日目まで見ています'),
  D('fear','……さくら、さん？'),
  N('アイコンが違う。桜の花びらが、一枚だけ足りない。'),
  FK('さっきも同じ話、聞きました'),
  C({k:'block',t:'なりすましを、ブロックする',fx:{mental:-2},set:{blocked_fake:true},then:[
      N('指が震えて、二度押し損ねた。ブロック完了。'),
      N('……ログには、何も残っていなかった。最初から、何もなかったみたいに。')]},
    {k:'ignore',t:'……見なかったことにする',fx:{mental:-4},set:{ignored_fake:true},then:[
      N('画面を伏せた。'),
      N('伏せた画面の向こうで、通知だけが、いつまでも小さく光っていた。')]}),
 ]},

{id:'d22_sea',title:'よるのうみ',from:22,to:22,prio:10,bg:'child',
 lines:f=>[
  N('深夜2時。泣き声で目が覚めた。'),
  K('パパ……。','sad'),
  K('パパがね、くらいうみに、はいっていくゆめみた。','sad'),
  K('うみのなかで、だれかがパパのこと、よんでた。パパじゃない、なまえで。'),
  ...when(f.dream1,N('背中に、冷たいものが流れた。あの夢の、水の音。')),
  K('……パパの、ほんとのなまえ、なに？'),
  C({k:'tell',t:'本当の名前を、教える',fx:{mental:3,childStress:-4},set:{told_name:true},add:{child:1},then:[
      N('耳元で、小さく名前を告げた。\n配信でも、電話でも、ずっと口にしなかった名前。'),
      N('子どもが、たどたどしく、その名前を繰り返した。'),
      K('こんど、うみのひとがよんだら……こっちのほうが、おっきいこえでよぶね。'),
      D('happy','……ああ。頼む。')]},
    {k:'keep',t:'「パパは、パパだよ」',fx:{childStress:-2},set:{kept_name:true},then:[
      K('……うん。パパ。','sleepy'),
      N('子どもは胸に顔をうずめて、また眠った。名前のことは、それきりだった。')]}),
 ]},

{id:'d23_loop',title:'寝たら終わりますよ',from:23,to:23,prio:10,bg:'eerie',
 lines:()=>[
  N('——昨夜。午前3時。配信、5時間目。'),
  N('話すことがなくなって、何を話したかも、もう覚えていなかった。'),
  JO('だんのうらさん、その話、さっきもしてましたよ。'),
  N('——え？'),
  GH('さっきも同じ話、聞きました','…'),
  GH('さっきも同じ話、聞きました','…'),
  SFX('wave'),
  N('耳の奥で、波の音がする。換気扇の音じゃない。'),
  GH('寝たら終わりますよ','…'),
  D('collapse','……終わる？　何が。'),
  N('襖の隙間から、子どもの寝息が聞こえていた。かすかに、でも確かに。'),
  C({k:'sleep',t:'配信を切って、横になる',fx:{fatigue:-8,mental:4,followers:-2},set:{slept_d23:true},then:[
      N('「……今日は、ここまで。おやすみ」\n言い終える前に、指が配信終了を押していた。'),
      N('布団に倒れ込む。子どもの体温が、すぐ隣にあった。'),
      N('波の音は、もう聞こえなかった。')]},
    {k:'push',t:'「まだ終われない」と、話し続ける',fx:{mental:-5,fatigue:6,followers:4},set:{pushed_d23:true},then:[
      D('collapse','……まだ、終われない。'),
      N('自分の声が、ひどく遠くに聞こえた。'),
      GH('そうですよ','…'),
      GH('まだ、見ています','…')]}),
  N('——22時。今夜もまた、マイクの前にいる。'),
 ]},

{id:'d24_yodaka',title:'夜鷹、落ちる',from:24,to:24,prio:10,bg:'main',
 lines:f=>[
  N('夜鷹の配信が、止まっていた。'),
  N('最後の配信時間、71時間12分。チャンネルは非公開。\nSNSに、一行だけ。'),
  Y('ちょっと寝ます'),
  N('投稿は、二日前の朝だった。その後、何もない。'),
  ...when(f.yodaka_collab,N('コラボの夜、夜鷹は一度もカメラの前を離れなかった。\n「寝たら数字が落ちるんで」と、笑いながら。')),
  ...when(f.yodaka_refuse,N('「寝方、忘れたんすよ」。あのDMが、まだ一番上に残っている。')),
  D('tired','……あいつ。'),
  C({k:'reach',t:'DMを送る。「生きてるか」',fx:{mental:1},set:{yodaka_reached:true},add:{yodaka:1},then:[
      N('送信。既読は、つかない。'),
      D('normal','……寝てるなら、それでいい。')]},
    {k:'silent',t:'……何も送れない',fx:{mental:-2},set:{yodaka_silent:true},then:[
      N('入力欄に「生きてるか」と打って、消した。'),
      N('自分が誰かに言えた言葉じゃない気がした。')]}),
 ]},

{id:'d25_coffee',title:'給料日の缶コーヒー',from:25,to:25,prio:10,bg:'factory',
 lines:f=>[
  N('——給料日の昼。工場の裏の喫煙所。といっても、班長はもう吸っていない。'),
  H('ほれ。'),
  N('缶コーヒーが飛んできた。'),
  H('……保育園の迎えで、お前を見かけた。一人で見とるんだな、子ども。'),
  H('俺もな、昔、娘を一人で育てた。夜勤明けに弁当作って、運動会で寝落ちして。'),
  H('娘はもう二十八だ。こないだ「あの頃のお父さん、毎日死にそうな顔してた」って笑われた。'),
  H('……笑い話にするにはな、生き残らにゃならん。'),
  ...when(f.line3_owner,H('三号の点検表、使わせてもらってる。あれは、いい表だ。'),FX({jobRep:2})),
  C({k:'ask',t:'「班長。……頼っても、いいですか」',fx:{mental:3},set:{asked_help:true},add:{hancho:1},then:[
      H('最初からそう言え、バカタレ。'),
      N('班長は空き缶をゴミ箱に投げた。外れた。二人で、少し笑った。')]},
    {k:'fine',t:'「大丈夫です。まだ、やれます」',set:{refused_help:true},then:[
      H('……そうか。'),
      H('大丈夫じゃない奴ほど、そう言うんだがな。')]}),
 ]},

{id:'d26_eve',title:'前夜',from:26,to:26,prio:10,bg:'main',
 lines:f=>{
  const covered=f.asked_help&&(f.line3_owner||gs.jobRep>=60);
  return [
  N('明日は、発表会。'),
  f.promise_recital
   ?N('冷蔵庫に、子どもが貼った紙。\n『あした　パパ　くる』')
   :N('子どもは、明日のことを口にしなかった。それが、かえって胸に刺さった。'),
  N('衣装の、段ボールで作った灯籠が、玄関に置いてある。'),
  SFX('phone'),
  N('スマホが鳴った。班長だった。'),
  H('夜分にすまん。三号が止まった。ベアリングが焼けた。'),
  H('明日の朝イチで直さんと、月曜の出荷に間に合わん。……来れるか。'),
  ...(covered?[
    H('……いや、待て。言い方が悪かった。'),
    H((f.line3_owner?'お前の作った点検表がある。':'手順は俺が覚えとる。')+'部品も揃っとる。俺と若いのでやる。'),
    H('お前は、明日は子どもの方だ。……それが、今のお前の仕事だろうが。'),
    C({k:'thanks',t:'「……ありがとうございます」',fx:{mental:4},set:{chose_recital:true,hancho_covered:true},add:{hancho:1},then:[
        H('礼は月曜に、缶コーヒーでいい。')]},
      {k:'go',t:'「それでも、行きます。朝だけ」',fx:{jobRep:2},set:{chose_factory:true,rush_after:true},then:[
        H('……バカタレ。昼までに終わらせて、走れ。')]})
  ]:[
    C({k:'recital',t:'「すみません。明日は、子どもの発表会なんです」',fx:{jobRep:-4},set:{chose_recital:true},then:[
        H('…………。'),
        H('……わかった。なんとかする。'),
        N('電話が切れた。怒っているのか、そうでないのか、わからなかった。')]},
      {k:'factory',t:'「行きます。朝イチで」',fx:{childStress:4,money:10000},set:{chose_factory:true},then:[
        N('電話を切って、振り返る。玄関の灯籠が、暗がりの中でこっちを見ていた。'),
        ...when(f.chiyo_trust,
          N('隣の戸を叩いた。千代さんは、何も聞かずに頷いた。'),
          CH('ビデオ、撮っとくけえね。'),
          FX(null,{chiyo_recital:true}))]})
  ])];
 }},

// ── 終幕 夜明け ─────────────────────────
{id:'d27_morning',title:'約束の朝',from:27,to:27,prio:10,bg:'child',
 lines:f=>{
  if(f.chose_recital)return [
    N('——保育園の、小さなホール。パイプ椅子の、いちばん後ろの席。'),
    N('暗くした舞台の上に、段ボールの灯籠を持った子どもが出てきた。'),
    K('……くらいうみでも、あかりがあれば、かえれるよ。'),
    N('セリフを言い終えると、子どもは客席を探して——見つけて、灯籠を大きく振った。'),
    N('劇の途中なのに。先生が、舞台袖で笑いをこらえていた。'),
    ...when(f.hancho_covered,N('スマホに、班長から写真が一枚。直った三号ラインと、ピースする若手。\n「こっちは片付いた」')),
    T('お父さん。……来てくださって、よかったです。'),
    D('happy','……はい。'),
    FX({childStress:-6,mental:5},{kept_promise:true}),
  ];
  return [
    N('——朝6時。三号ラインの下に潜り込んで、焼けたベアリングを抜いた。'),
    f.line3_owner
     ?N('手順は、自分が作った点検表のとおり。')
     :N('手順を一つずつ、班長と声に出して確かめた。'),
    H('……回せ。'),
    N('モーターが唸る。キィ、という音は、もうしなかった。'),
    ...(f.rush_after?[
      N('時計は11時40分。工具を置いて、走った。'),
      N('ホールに着いたとき、ちょうど最後の挨拶だった。\n子どもが、舞台の上から灯籠を振った。'),
      D('happy','……間に合った、のか。これ。'),
      FX({jobRep:4,childStress:-2,mental:2},{kept_promise:true,late_recital:true}),
    ]:f.chiyo_recital?[
      N('夜。千代さんが、スマホの動画を見せてくれた。'),
      N('灯籠を持った子どもが、客席の後ろを、何度も振り返っている。'),
      CH('ずっと、あんたを探しとったよ。'),
      D('tired','……ごめんな。'),
      FX({jobRep:5,childStress:2},{missed_recital:true,broke_promise:!!f.promise_recital}),
    ]:[
      N('夜、家に帰ると、子どもはもう眠っていた。'),
      N('テーブルの上に、小さな段ボールの灯籠がひとつ。\n『パパのぶん』と書いてあった。'),
      D('tired','……ごめんな。'),
      FX({jobRep:5,childStress:3},{missed_recital:true,broke_promise:!!f.promise_recital}),
    ]),
  ];
 }},

{id:'d28_mock',title:'模試',from:28,to:28,prio:10,bg:'factory',
 lines:f=>{
  const ck=gs.certKnow;
  return [
  N('——社内の会議室。危険物取扱者乙種第4類、模擬試験。'),
  ...when(!f.mock_yes,N('「考えときます」と言ったはずなのに、机の上には自分の名前の答案用紙があった。')),
  ...(ck>=70?[
    H('……八十二点。合格ラインだ。'),
    H('本番もこれでいけ。……いや、いける。'),
    D('win','……ありがとうございます。'),
    FX({jobRep:3,mental:4},{mock_pass:true}),
  ]:ck>=40?[
    H('五十八点。……惜しいな。'),
    H('だがな、一か月前のお前なら、名前書いて寝とった。'),
    D('normal','来月までに、あと二十点。'),
    FX({mental:2,certKnow:2},{mock_close:true}),
  ]:[
    H('三十一点。'),
    H('……寝てないやつの点だ。勉強の前に、寝ろ。'),
    D('tired','……はい。'),
    FX({fatigue:-3},{mock_low:true}),
  ]),
  ...(f.hitori_promise?[
    N('帰りの電車で、ひとりぼっちからDMが来た。'),
    HI('模試、自分でやってみました。67点でした。……来月、会場で会えますか。'),
    D('happy','ああ。会場で。'),
  ]:f.hitori_gentle?[
    N('帰りの電車で、ひとりぼっちからDMが来た。'),
    HI('今日、少しだけ、学校の保健室に行けました。'),
    D('happy','……すごいじゃないか。'),
  ]:[]),
 ];}},

{id:'d29_return',title:'さくら',from:29,to:29,prio:10,bg:'main',
 lines:f=>{
  const eerie=gs.anomalyCount>=3||gs.mental<30||f.pushed_d23||f.ignored_fake;
  return [
  N('十日ぶりに、その名前が流れた。'),
  N('桜の花びらは、ちゃんと五枚あった。'),
  SA('お久しぶりです。ずっと来られなくて、ごめんなさい。'),
  SA('子どもが、RSウイルスで入院してて。昨日、退院しました。'),
  SA('病院の夜、付き添いのベッドで、アーカイブずっと聞いてました。……あの声がなかったら、たぶん、折れてました。'),
  ...when(f.blocked_fake||f.ignored_fake,SA('それと……私の名前で、変なコメントがあったって、常連さんから聞きました。怖い思いをさせてたら、ごめんなさい。')),
  ...(eerie?[
    GH('寝たら終わりますよ','…'),
    N('その一行が、さくらのコメントの間に割り込んだ。'),
    SA('終わりませんよ。'),
    SA('寝ても、終わりません。朝が来るだけです。'),
  ]:[]),
  SA('だから、だんのうらさんも、寝てください。……今度は、私が言う番です。'),
  C({k:'welcome',t:'「おかえりなさい」と返す',fx:{mental:4},set:{sakura_return:true},add:{sakura:1},then:[
      SA('ただいま。……おやすみなさい。')]},
    {k:'thanks',t:'「ありがとう。……おやすみなさい」と返す',fx:{mental:3,fatigue:-3},set:{sakura_return:true},add:{sakura:1},then:[
      SA('はい。おやすみなさい。'),
      N('今夜は、少しだけ早く配信を切ろうと思った。')]}),
 ];}},

{id:'d30_last',title:'最後の夜',from:30,to:30,prio:10,bg:'main',
 lines:f=>{
  const dark=gs.mental<30||(f.pushed_d23&&!f.sakura_return)||darkScore()>=4;
  const debtMan=(gs.debt/10000).toFixed(1);
  const opts=[
    {k:'sleep',t:'「おやすみ」と言って、今夜は早めに切る',fx:{fatigue:-5,mental:3},set:{final_words:'sleep'},then:[
      D('happy','ご機嫌よう、だんのうらです。……今夜は、短めにね。みんな、おやすみ。'),
      N('配信を切る。襖の向こうで、寝ぼけた声がした。'),
      K('……おやすみ、パパ。','sleepy'),
      N('おやすみ、と言ってもらえる側に、少しだけ戻れた気がした。')]},
    {k:'tomorrow',t:'「また明日」と言う。夜は、まだ続く',fx:{followers:3,mental:1},set:{final_words:'tomorrow'},then:[
      D('win','ご機嫌よう、だんのうらです。……三十日、来てくれてありがとう。また明日も、ここで。'),
      N('沈むか、這い上がるか。答えはまだ出ていない。'),
      N('でも、明日もここにいる。それだけは、決めた。')]},
  ];
  if(dark)opts.push({k:'sink',t:'「……まだ、見てる？」と、呟く',fx:{mental:-3},set:{final_words:'sink'},then:[
      N('コメント欄が、一瞬だけ止まった。'),
      GH('見ています','…'),
      N('波の音がした。……ずっと、遠くで。')]});
  return [
  N('30日目の夜。22時。'),
  N('子どもが眠った部屋に、静けさが戻ってきた。——一日目と、同じように。'),
  ...when(f.d1_story||f.kept_promise,N('枕元には、あの絵本'+(f.kept_promise||f.missed_recital?'と、段ボールの灯籠。':'。'))),
  gs.debt<840000
   ?N('借金、残り'+debtMan+'万。……減ってはいる。')
   :N('借金は、減っていない。それでも、まだここにいる。'),
  ...(f.yodaka_reached?[
    N('DMの通知。差出人は、夜鷹。'),
    Y('生きてます。……寝てました。三日くらい。'),
    Y('お前も寝ろよ、だんのうら。'),
    D('happy','……お前に言われたくない。'),
  ]:(f.yodaka_reply||f.yodaka_ignore||f.yodaka_collab||f.yodaka_refuse)?[
    N('夜鷹のチャンネルは、非公開のままだった。'),
  ]:[]),
  N('配信開始のボタンに、指を置く。'),
  JO('今夜も来ました。'),
  TB('九州の朝、きれいでしたよ。'),
  ...when(f.sakura_return,SA('今夜は、子どもと一緒に聞いてます。')),
  ...when(f.hitori_promise||f.hitori_gentle,HI('こんばんは。今日も、一緒に。')),
  ...when(dark,GH('30日目まで見ていました','…'),GH('……寝たら、終わりますよ','…')),
  D(dark?'tired':'normal','……ここが、俺の壇ノ浦だ。'),
  C(...opts),
 ];}},
];
const SCENE_BY_ID={};SCENES.forEach((sc,i)=>{sc._i=i;SCENE_BY_ID[sc.id]=sc;});

// 物語上の「光」と「闇」の選択の数（エンディング側の参考用）
function lightScore(){const f=F();return ['d1_story','debt_honest','chiyo_trust','told_child','line3_owner','promise_morning','promise_recital','sakura_confide','told_name','slept_d23','yodaka_reached','asked_help','kept_promise','sakura_return','stayed_child','flame_calm'].filter(k=>f[k]).length;}
function darkScore(){const f=F();return ['debt_dodge2','tempted_sea','ignored_fake','pushed_d23','yodaka_silent','refused_help','broke_promise','hid_child','left_child','flame_reply'].filter(k=>f[k]).length+(f.final_words==='sink'?2:0);}

// ──────────────────────────
// その夜のシーンを選ぶ
// ──────────────────────────
function pickScene(d){
  const s=S(),f=s.flags;
  const list=SCENES.filter(sc=>!s.seen[sc.id]&&d>=sc.from&&d<=sc.to&&(!sc.cond||sc.cond(f,s)));
  if(!list.length)return null;
  const score=sc=>sc.prio+(sc.prio<10&&sc.prio>=5&&sc.to===d?4:0);
  list.sort((a,b)=>score(b)-score(a)||a.to-b.to||a._i-b._i);
  return list[0];
}

// ══════════════════════════════════════════════════════════
// 見た目（CSSは st- 接頭辞で注入）
// ══════════════════════════════════════════════════════════
const CSS=`
#st-root{position:fixed;inset:0;z-index:235;display:flex;justify-content:center;background:rgba(2,1,8,.0);opacity:0;pointer-events:none;transition:opacity .45s ease,background .45s ease;font-family:var(--serif,'Noto Serif JP',serif);-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none;}
#st-root.st-on{opacity:1;pointer-events:auto;background:rgba(2,1,8,.86);}
.st-col{position:relative;width:100%;max-width:620px;height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 0 0 1px rgba(138,82,212,.18),0 0 80px rgba(0,0,0,.85);}
.st-stage{position:relative;flex:1 1 auto;min-height:150px;overflow:hidden;}
.st-bg,.st-bg2{position:absolute;inset:0;background-size:cover;background-position:center;transition:opacity .8s ease;}
.st-bg{filter:blur(2px) brightness(.5) saturate(1.1);transform:scale(1.08);}
.st-roofs{position:absolute;left:0;right:0;bottom:12%;width:100%;height:30%;opacity:0;transition:opacity 1.2s ease;filter:blur(.6px);}
.st-amb.sea~.st-roofs{opacity:.85;}
.st-vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 46%,transparent 30%,rgba(2,1,8,.82) 100%),linear-gradient(transparent 62%,rgba(2,1,8,.95));pointer-events:none;}
.st-amb{position:absolute;inset:0;pointer-events:none;opacity:.5;}
.st-amb.rain{background:repeating-linear-gradient(103deg,transparent 0 22px,rgba(160,140,255,.14) 22px 23px,transparent 23px 47px);background-size:200% 200%;animation:stRain .6s linear infinite;}
.st-amb.lamp{background:radial-gradient(circle at 82% 22%,rgba(255,160,40,.35),transparent 30%);animation:stLamp 2.4s ease-in-out infinite;}
.st-amb.warm{background:radial-gradient(circle at 30% 60%,rgba(255,200,120,.18),transparent 45%);}
.st-amb.sea{opacity:.9;background:linear-gradient(180deg,rgba(4,30,52,.2),rgba(2,10,24,.85));}
.st-amb.sea::before,.st-amb.sea::after{content:'';position:absolute;left:-50%;right:-50%;height:40px;background:repeating-radial-gradient(ellipse at 50% 100%,transparent 0 14px,rgba(90,180,220,.18) 14px 15px,transparent 15px 30px);animation:stWave 7s linear infinite;}
.st-amb.sea::before{top:30%;}
.st-amb.sea::after{top:58%;animation-duration:11s;animation-direction:reverse;opacity:.6;}
.st-amb.eerie{opacity:.75;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px),radial-gradient(ellipse at 50% 50%,transparent 35%,rgba(120,0,30,.4));animation:stFlick 3.2s steps(1) infinite;}
.st-bg.sea{background:radial-gradient(ellipse at 50% 80%,#0d3a58 0%,#04121f 60%,#01050b 100%);filter:none;transform:none;}
.st-lantern{position:absolute;width:7px;height:10px;border-radius:3px;background:#ffd98a;box-shadow:0 0 14px 6px rgba(255,200,110,.35);opacity:.0;animation:stBob 5s ease-in-out infinite;}
.st-amb.sea~.st-lantern{opacity:.75;}
.st-cap{position:absolute;left:14px;top:12px;font-family:var(--mono,monospace);font-size:.62rem;letter-spacing:.18em;color:rgba(0,232,200,.75);text-shadow:0 0 6px rgba(0,0,0,.9);}
.st-cap b{display:block;font-family:var(--dot,'DotGothic16',monospace);font-weight:normal;font-size:.8rem;letter-spacing:.14em;color:#e9e2ff;margin-top:3px;}
.st-skip{position:absolute;right:10px;top:9px;z-index:3;font-family:var(--mono,monospace);font-size:.6rem;letter-spacing:.14em;color:rgba(233,226,255,.55);background:rgba(10,8,30,.55);border:1px solid rgba(233,226,255,.25);border-radius:3px;padding:5px 9px;cursor:pointer;}
.st-skip:hover{color:#fff;border-color:rgba(233,226,255,.6);}
.st-fig{position:absolute;left:50%;bottom:8%;width:clamp(112px,min(40vw,27vh),230px);aspect-ratio:1;transform:translate(-50%,10px) scale(.94);opacity:0;transition:opacity .45s ease,transform .45s ease,filter .45s ease;border-radius:12px;overflow:hidden;box-shadow:0 0 0 2px rgba(230,224,255,.75),0 0 0 4px rgba(18,12,52,.9),0 0 34px rgba(138,82,212,.45),0 14px 30px rgba(0,0,0,.6);background:#0b0a1e;}
.st-fig.round{border-radius:50%;}
.st-fig.show{opacity:1;transform:translate(-50%,0) scale(1);}
.st-fig.dim{filter:brightness(.45) saturate(.6);transform:translate(-50%,4px) scale(.96);}
.st-fig svg,.st-fig img{display:block;width:100%;height:100%;object-fit:cover;}
.st-fig.fake{animation:stJit 2.2s steps(1) infinite;}
.st-low{flex:none;position:relative;padding:0 10px max(12px,env(safe-area-inset-bottom));}
.st-fx{position:absolute;left:14px;right:14px;top:-34px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;pointer-events:none;}
.st-fx span{font-family:var(--mono,monospace);font-size:.66rem;letter-spacing:.06em;padding:3px 8px;border-radius:3px;background:rgba(8,6,26,.9);border:1px solid rgba(232,184,48,.55);color:#ffe7a8;animation:stFx 2.8s ease forwards;}
.st-fx span.bad{border-color:rgba(232,48,85,.6);color:#ffb4c2;}
.st-choices{display:flex;flex-direction:column;gap:6px;margin:0 2px 10px;padding:9px 10px;}
.st-choices:empty{display:none;}
.st-win,.st-choices{background:linear-gradient(180deg,rgba(28,24,84,.96) 0%,rgba(14,11,48,.97) 55%,rgba(7,6,26,.98) 100%);border:2px solid #e6e0ff;border-radius:7px;box-shadow:0 0 0 2px #120c34,inset 0 0 0 2px rgba(138,82,212,.75),inset 0 0 22px rgba(0,232,200,.07),0 8px 22px rgba(0,0,0,.6);}
.st-choices{animation:stUp .22s ease;}
.st-ch{position:relative;display:block;width:100%;text-align:left;padding:9px 10px 9px 26px;font-family:var(--serif,'Noto Serif JP',serif);font-size:.86rem;line-height:1.5;color:#f2eeff;background:transparent;border:1px solid transparent;border-radius:4px;cursor:pointer;}
.st-ch::before{content:'▶';position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:.62rem;color:#00e8c8;opacity:0;}
.st-ch.sel{background:rgba(138,82,212,.22);border-color:rgba(230,224,255,.35);}
.st-ch.sel::before{opacity:1;animation:stBlink .9s step-end infinite;}
.st-ch.dark{color:#ffb4c2;}
.st-win{position:relative;min-height:132px;display:flex;gap:11px;padding:18px 12px 20px;cursor:pointer;margin-top:14px;}
.st-plate{position:absolute;left:12px;top:-15px;padding:3px 12px 2px;font-family:var(--dot,'DotGothic16',monospace);font-size:.74rem;letter-spacing:.14em;color:#fff;background:linear-gradient(180deg,#3a2c8a,#1c1450);border:2px solid #e6e0ff;border-radius:4px;box-shadow:0 0 0 2px #120c34;white-space:nowrap;}
.st-plate:empty{display:none;}
.st-por{flex:none;width:72px;height:72px;border-radius:4px;overflow:hidden;border:2px solid #cfc6f5;box-shadow:0 0 0 1px #120c34,0 0 12px rgba(138,82,212,.35);background:#0b0a1e;}
.st-por.round{border-radius:50%;}
.st-por svg,.st-por img{display:block;width:100%;height:100%;object-fit:cover;}
.st-por:empty{display:none;}
.st-tx{flex:1;min-width:0;}
.st-text{font-size:.92rem;line-height:1.85;color:#f2eeff;white-space:pre-wrap;word-break:break-word;min-height:3.7em;text-shadow:1px 1px 0 #0a0620;}
.st-next{position:absolute;right:14px;bottom:7px;font-size:.7rem;color:#00e8c8;opacity:0;}
.st-next.on{opacity:1;animation:stNext .8s ease-in-out infinite;}
.st-win.n .st-text{color:#cfc6ee;text-align:left;}
.st-win.n{padding-left:16px;}
.st-win.kid .st-plate{background:linear-gradient(180deg,#8a6a14,#4a3606);color:#fff3c8;}
.st-win.kid .st-text{font-size:.98rem;letter-spacing:.04em;}
.st-win.hancho .st-plate{background:linear-gradient(180deg,#3c566e,#16242f);color:#ffe28a;}
.st-win.sensei .st-plate{background:linear-gradient(180deg,#3e7a50,#173822);color:#e2ffe8;}
.st-win.chiyo .st-plate{background:linear-gradient(180deg,#7a4a6a,#3a1c30);color:#ffe6f2;}
.st-win.phone .st-plate{background:linear-gradient(180deg,#24384e,#0c1622);color:#bfe2ff;}
.st-win.phone .st-text{color:#cfe6f6;letter-spacing:.02em;}
.st-win.yodaka .st-plate{background:linear-gradient(180deg,#5a0e1e,#22040a);color:#ffc8d2;}
.st-win.listener .st-plate,.st-win.yodaka .st-plate,.st-win.fake .st-plate,.st-win.ghost .st-plate{font-family:var(--mono,monospace);}
.st-win.listener .st-plate{background:linear-gradient(180deg,#5a4a10,#2a2006);color:#ffe7a8;}
.st-win.chat .st-plate::before{content:'💬 ';}
.st-win.chat .st-text{font-family:var(--mono,'Share Tech Mono',monospace),var(--serif,serif);font-size:.88rem;color:#e2d8ff;}
.st-win.fake .st-plate{background:linear-gradient(180deg,#3a0614,#100006);color:#ffb4c2;animation:stJit 1.8s steps(1) infinite;}
.st-win.fake .st-text,.st-win.ghost .st-text{color:#ff9fb4;text-shadow:0 0 6px rgba(232,48,85,.7),1px 0 0 rgba(0,232,200,.35);}
.st-win.ghost .st-plate{background:linear-gradient(180deg,#1a0a10,#000);color:#a08890;}
.st-win.sea .st-plate{background:linear-gradient(180deg,#126a7a,#08343e);color:#cffcff;}
.st-win.sea .st-text{color:#bfefff;font-style:italic;}
.st-win.shake{animation:stShake .5s ease;}
#st-root.st-eerie .st-text{text-shadow:1px 1px 0 #0a0620,-1px 0 0 rgba(232,48,85,.25);}
.st-card{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:radial-gradient(ellipse at 50% 50%,rgba(20,14,50,.96),rgba(2,1,8,.99));opacity:0;pointer-events:none;transition:opacity .5s ease;cursor:pointer;}
.st-card.on{opacity:1;pointer-events:auto;}
.st-card .st-act{font-family:var(--mono,monospace);font-size:.68rem;letter-spacing:.42em;color:rgba(0,232,200,.75);}
.st-card .st-actn{font-family:var(--dot,'DotGothic16',monospace);font-size:1.7rem;letter-spacing:.3em;color:#efe8ff;text-shadow:0 0 18px rgba(138,82,212,.8);padding-left:.3em;}
.st-card .st-line{width:120px;height:1px;background:linear-gradient(90deg,transparent,#8a52d4,transparent);}
.st-card .st-day{font-family:var(--mono,monospace);font-size:.66rem;letter-spacing:.24em;color:#9c94c4;}
.st-card .st-ttl{font-family:var(--serif,serif);font-size:1rem;letter-spacing:.2em;color:#e6e0ff;}
.st-card.small .st-actn,.st-card.small .st-act{display:none;}
@keyframes stUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes stNext{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}
@keyframes stBlink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes stFx{0%{opacity:0;transform:translateY(6px)}12%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0;transform:translateY(-6px)}}
@keyframes stShake{0%,100%{transform:none}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
@keyframes stRain{from{background-position:0 0}to{background-position:-40px 120px}}
@keyframes stLamp{0%,100%{opacity:.25}50%{opacity:.6}}
@keyframes stWave{from{transform:translateX(0)}to{transform:translateX(30px)}}
@keyframes stBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes stFlick{0%{opacity:.75}47%{opacity:.75}48%{opacity:.3}49%{opacity:.85}83%{opacity:.7}84%{opacity:.95}}
@keyframes stJit{0%{transform:none}91%{transform:none}92%{transform:translateX(2px)}94%{transform:translateX(-2px)}96%{transform:none}}
#st-root .st-fig.show.fake{transform:translate(-50%,0);}
@media (max-height:640px){.st-text{font-size:.86rem;line-height:1.7}.st-win{min-height:112px}.st-por{width:60px;height:60px}}
@media (min-width:700px){.st-text{font-size:.98rem}.st-por{width:84px;height:84px}.st-win{min-height:146px;padding:20px 16px 22px}}
@media (prefers-reduced-motion:reduce){.st-amb,.st-lantern,.st-fig.fake,.st-win.fake .st-plate{animation:none!important}}
`;

let root=null,el={};
function build(){
  if(root)return;
  const st=document.createElement('style');st.id='st-style';st.textContent=CSS;document.head.appendChild(st);
  root=document.createElement('div');root.id='st-root';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.innerHTML=`<div class="st-col">
    <div class="st-stage">
      <div class="st-bg"></div><div class="st-amb"></div><svg class="st-roofs" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120 L0 92 L18 92 L30 80 L54 80 L66 92 L84 92 L84 86 L104 70 L140 70 L160 86 L160 96 L186 96 L200 84 L232 84 L246 96 L262 96 L262 78 L282 62 L318 62 L338 78 L338 92 L356 92 L370 82 L400 82 L400 120Z" fill="#06182a"/><path d="M110 70 L110 56 L134 56 L134 70 M290 62 L290 46 L310 46 L310 62" fill="#06182a"/></svg>
      <div class="st-lantern" style="left:22%;top:44%"></div><div class="st-lantern" style="left:71%;top:38%;animation-delay:-2s"></div><div class="st-lantern" style="left:58%;top:60%;animation-delay:-3.4s"></div>
      <div class="st-vig"></div>
      <div class="st-fig"></div>
      <div class="st-cap"></div>
      <button class="st-skip" type="button" aria-label="スキップ">SKIP ▸▸</button>
    </div>
    <div class="st-low">
      <div class="st-fx"></div>
      <div class="st-choices" role="listbox"></div>
      <div class="st-win" aria-live="polite"><div class="st-plate"></div><div class="st-por"></div><div class="st-tx"><div class="st-text"></div></div><div class="st-next">▼</div></div>
    </div>
    <div class="st-card"><div class="st-act"></div><div class="st-actn"></div><div class="st-line"></div><div class="st-day"></div><div class="st-ttl"></div></div>
  </div>`;
  document.body.appendChild(root);
  ['bg','amb','fig','cap','skip','fx','choices','win','plate','por','text','next','card'].forEach(k=>{el[k]=root.querySelector('.st-'+k);});
  el.win.addEventListener('click',e=>{e.stopPropagation();advance();});
  el.card.addEventListener('click',e=>{e.stopPropagation();cardDone&&cardDone();});
  el.skip.addEventListener('click',e=>{e.stopPropagation();skipAhead();});
  el.stage=root.querySelector('.st-stage');
  el.stage.addEventListener('click',()=>{if(!el.choices.children.length)advance();});
}

const BG_SRC={main:'assets/img/bg_main.webp',factory:'assets/img/bg_factory.webp',child:'assets/img/bg_childcare.webp',rest:'assets/img/bg_rest_light.webp',eerie:'assets/img/bg_main.webp'};
const BG_AMB={main:'rain',factory:'lamp',child:'warm',rest:'warm',sea:'sea',eerie:'eerie'};
function setBg(k){
  const src=BG_SRC[k];
  el.bg.className='st-bg'+(k==='sea'?' sea':'');
  el.bg.style.backgroundImage=src?`url(${src})`:'';
  el.amb.className='st-amb '+(BG_AMB[k]||'');
  root.classList.toggle('st-eerie',k==='eerie'||(gs.day>=21&&k!=='child'));
  if(k==='eerie')el.bg.style.filter='blur(2px) brightness(.38) saturate(.5) hue-rotate(-30deg)';
  else el.bg.style.filter='';
}

// ──────────────────────────
// 再生
// ──────────────────────────
let cur=null;          // {sc, q:[lines], i, typing, full, choice:[], sel, day}
let typer=null,cardDone=null;
function playing(){return !!cur;}

function play(sc,day){
  build();
  const s=S();
  const f=s.flags;
  let lines;
  try{lines=sc.lines(f,s).filter(Boolean);}catch(e){console.warn('[story]',sc.id,e);lines=[];}
  s.seen[sc.id]=day;
  cur={sc,q:lines,i:-1,day,typing:false,lastOther:null};
  setBg(sc.bg||'main');
  el.cap.innerHTML=`DAY ${day} ・ 22:00<b>${esc(sc.title)}</b>`;
  el.fig.className='st-fig';el.fig.innerHTML='';
  el.choices.innerHTML='';el.fx.innerHTML='';
  el.text.textContent='';el.plate.textContent='';el.por.innerHTML='';el.win.className='st-win n';
  root.classList.add('st-on');
  document.body.classList.add('st-open');
  const act=actOf(day);
  const big=act>s.actShown;
  if(big)s.actShown=act;
  showCard(big?act:0,day,sc.title,()=>next());
}

function showCard(act,day,title,cb){
  const c=el.card;
  c.classList.toggle('small',!act);
  c.querySelector('.st-act').textContent=act?ACTS[act].no:'';
  c.querySelector('.st-actn').textContent=act?ACTS[act].name:'';
  c.querySelector('.st-day').textContent=`DAY ${day} / 30`;
  c.querySelector('.st-ttl').textContent=title;
  c.classList.add('on');
  try{AU.se(act?'ach':'notif');}catch(e){}
  let done=false;
  const t=setTimeout(()=>finish(),act?2600:1400);
  function finish(){if(done)return;done=true;clearTimeout(t);cardDone=null;c.classList.remove('on');setTimeout(cb,260);}
  showCard._cancel=()=>{done=true;clearTimeout(t);};
  cardDone=finish;
}

function next(){
  if(!cur)return;
  cur.i++;
  if(cur.i>=cur.q.length){end();return;}
  const ln=cur.q[cur.i];
  if(ln.bg){setBg(ln.bg);return next();}
  if(ln.sfx){doSfx(ln.sfx);return next();}
  if(ln.choice){showChoices(ln.choice);return;}
  if(!ln.t&&(ln.fx||ln.set||ln.add)){
    applySet(ln.set,ln.add);showFx(applyFx(ln.fx));return next();
  }
  show(ln);
}

function show(ln){
  const w=ln.w;
  const c=w==='n'?null:w==='self'?CAST.self:CAST[w];
  el.win.className='st-win '+(w==='n'?'n':(c.cls+(c.chat?' chat':'')));
  el.plate.textContent=w==='n'?'':(ln.nm||c.nm);
  const round=c&&(c.cls==='listener'||c.cls==='fake'||c.cls==='ghost');
  el.por.className='st-por'+(round?' round':'');
  el.por.innerHTML=w==='n'?'':portraitHTML(w,ln.f);
  // 舞台の人物：話し相手を大きく。自分が話すときは相手を少し暗く
  if(w!=='n'&&w!=='self'){
    const key=w+'|'+(ln.f||'');
    if(cur.lastOther!==key){el.fig.innerHTML=portraitHTML(w,ln.f);cur.lastOther=key;}
    el.fig.className='st-fig show'+(round?' round':'')+(c.cls==='fake'?' fake':'');
  }else if(w==='self'&&cur.lastOther){
    el.fig.classList.add('dim');
  }else if(w==='n'&&cur.lastOther){
    el.fig.classList.add('dim');
  }
  if(c&&c.cls==='phone')el.win.classList.add('shake');
  if(c&&(c.cls==='fake'||c.cls==='ghost')){try{AU.se('ghost');}catch(e){}}
  type(ln.t||'');
}

function type(text){
  clearTimeout(typer);
  cur.typing=true;cur.full=text;
  el.next.classList.remove('on');
  el.text.textContent='';
  let i=0;
  const step=()=>{
    if(!cur)return;
    if(i>=text.length){cur.typing=false;el.next.classList.add('on');return;}
    const ch=text[i++];
    el.text.textContent+=ch;
    if(i%2===0&&!/\s/.test(ch))blip();
    const pause='。！？'.includes(ch)?200:'、…'.includes(ch)?80:'\n'===ch?160:0;
    typer=setTimeout(step,30+pause);
  };
  step();
}

function advance(){
  if(!cur)return;
  if(cardDone){cardDone();return;}
  if(el.choices.children.length)return;
  if(cur.typing){clearTimeout(typer);cur.typing=false;el.text.textContent=cur.full;el.next.classList.add('on');return;}
  try{AU.se('btn');}catch(e){}
  next();
}

// 次の選択肢か終わりまで飛ばす（効果は通常どおり適用する）
function skipAhead(){
  if(!cur)return;
  const go=()=>{
    if(!cur)return;
    clearTimeout(typer);cur.typing=false;
    let last=null,guard=0;
    while(cur&&guard++<400){
      const ln=cur.q[cur.i+1];
      if(!ln){end();return;}
      if(ln.choice){
        if(last){show(last);clearTimeout(typer);cur.typing=false;el.text.textContent=cur.full;}
        next();return;
      }
      cur.i++;
      if(ln.bg)setBg(ln.bg);
      else if(!ln.t&&(ln.fx||ln.set||ln.add)){applySet(ln.set,ln.add);showFx(applyFx(ln.fx));}
      else if(ln.t)last=ln;
    }
  };
  if(cardDone){showCard._cancel&&showCard._cancel();cardDone=null;el.card.classList.remove('on');setTimeout(go,280);return;}
  go();
}

function showChoices(opts){
  el.next.classList.remove('on');
  el.choices.innerHTML='';
  cur.sel=0;
  opts.forEach((o,idx)=>{
    const b=document.createElement('button');
    b.type='button';b.className='st-ch'+(idx===0?' sel':'')+(o.k==='sink'?' dark':'');
    b.textContent=o.t;b.setAttribute('role','option');
    b.addEventListener('mouseenter',()=>selChoice(idx));
    b.addEventListener('click',e=>{e.stopPropagation();pick(idx);});
    el.choices.appendChild(b);
  });
  cur.opts=opts;
}
function selChoice(i){
  if(!cur||!cur.opts)return;
  cur.sel=(i+cur.opts.length)%cur.opts.length;
  [...el.choices.children].forEach((b,j)=>b.classList.toggle('sel',j===cur.sel));
}
function pick(i){
  if(!cur||!cur.opts)return;
  const o=cur.opts[i];if(!o)return;
  try{AU.se('decide');}catch(e){}
  const s=S();
  s.choices[cur.sc.id]=o.k||String(i);
  applySet(o.set,o.add);
  showFx(applyFx(o.fx));
  el.choices.innerHTML='';cur.opts=null;
  // 選んだ後の台詞を差し込む
  cur.q.splice(cur.i+1,0,...(o.then||[]));
  next();
}

function showFx(list){
  if(!list||!list.length)return;
  el.fx.innerHTML='';
  list.forEach(x=>{const sp=document.createElement('span');sp.textContent=x.t;if(!x.good)sp.className='bad';el.fx.appendChild(sp);});
  clearTimeout(showFx._t);showFx._t=setTimeout(()=>{el.fx.innerHTML='';},2900);
}

function doSfx(k){
  try{
    if(k==='phone'){AU.se('warn');setTimeout(()=>{try{AU.se('warn');}catch(e){}},260);el.win.classList.remove('shake');void el.win.offsetWidth;el.win.classList.add('shake');}
    else if(k==='wave'||k==='ghost')AU.se('ghost');
    else if(k==='thud'){AU.se('machine');el.win.classList.remove('shake');void el.win.offsetWidth;el.win.classList.add('shake');}
    else if(k==='knock'){AU.se('tool');setTimeout(()=>{try{AU.se('tool');}catch(e){}},180);}
  }catch(e){}
}

function end(){
  const sc=cur.sc,day=cur.day;
  const s=S();
  s.log.push({d:day,id:sc.id,t:sc.title,c:s.choices[sc.id]||null});
  if(s.log.length>60)s.log.shift();
  cur=null;clearTimeout(typer);
  root.classList.remove('st-on');
  document.body.classList.remove('st-open');
  try{if(typeof logGrow==='function')logGrow('📖 '+sc.title);}catch(e){}
  try{updateStats();}catch(e){}
  try{saveGame(true);}catch(e){}
  try{checkGameOver();}catch(e){}
  idleSince=0;
  window.dispatchEvent(new CustomEvent('story:end',{detail:{id:sc.id,day}}));
}

function esc(t){return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

// 文字送りの小さな音（効果音の音量に従う）
let _blipT=0;
function blip(){
  try{
    if(typeof AU==='undefined'||!AU.ctx||typeof AUDIO_SET==='undefined'||AUDIO_SET.se<=0)return;
    const now=performance.now();if(now-_blipT<55)return;_blipT=now;
    const ctx=AU.ctx;if(ctx.state!=='running')return;
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type='square';o.frequency.value=cur&&cur.q[cur.i]&&cur.q[cur.i].w==='kid'?1180:cur&&cur.q[cur.i]&&cur.q[cur.i].w==='n'?620:880;
    g.gain.setValueAtTime(.012*AUDIO_SET.se,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0008,ctx.currentTime+.04);
    o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.05);
  }catch(e){}
}

// キー操作：Enter/Space/Z で送り・決定、↑↓ で選択、1〜3 で直接選択、Esc/S でスキップ
window.addEventListener('keydown',e=>{
  if(!cur)return;
  const k=e.key;
  let used=true;
  if(cur.opts&&el.choices.children.length){
    if(k==='ArrowUp'||k==='w')selChoice(cur.sel-1);
    else if(k==='ArrowDown'||k==='s')selChoice(cur.sel+1);
    else if(k==='Enter'||k===' '||k==='z'||k==='Z')pick(cur.sel);
    else if(/^[1-3]$/.test(k))pick(+k-1);
    else used=false;
  }else{
    if(k==='Enter'||k===' '||k==='z'||k==='Z'||k==='ArrowDown')advance();
    else if(k==='Escape')skipAhead();
    else used=false;
  }
  if(used){e.preventDefault();e.stopPropagation();}
},true);

// ══════════════════════════════════════════════════════════
// いつ出すか：画面がひと段落した（ポップアップ・結果・配信・ミニゲーム等が閉じた）とき
// ══════════════════════════════════════════════════════════
const BLOCKERS=['ev-popup','result-sc','ending-sc','streaming-ol','factory-mini','diag-mini','song-mini','status-sc','skill-sc',
  'mg-picker','mg-screen','settings-sc','tutorial-sc','endlist-sc','share-panel'];
function visibleModal(x){
  if(!x)return false;
  if(x.classList.contains('active'))return true;
  const cs=getComputedStyle(x);
  return cs.display!=='none'&&cs.visibility!=='hidden'&&parseFloat(cs.opacity)>.05&&cs.pointerEvents!=='none';
}
function busy(){
  if(window.storyHold)return true;
  const gsEl=document.getElementById('game-screen');
  if(!gsEl||gsEl.classList.contains('hidden'))return true;
  const ss=document.getElementById('story-screen');
  if(ss&&!ss.classList.contains('hidden'))return true;
  for(const id of BLOCKERS){if(visibleModal(document.getElementById(id)))return true;}
  // 他の拡張が作った全画面のモーダル（画面の半分以上を覆う、操作を受け付ける固定要素）
  const vw=innerWidth,vh=innerHeight;
  for(const x of document.body.children){
    if(x===root||x.id==='game-screen'||x.id==='title-screen'||x.id==='story-screen'||x.tagName==='SCRIPT'||x.tagName==='STYLE'||x.tagName==='CANVAS')continue;
    if(BLOCKERS.includes(x.id))continue;
    const cs=getComputedStyle(x);
    if(cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden'||cs.pointerEvents==='none'||parseFloat(cs.opacity)<.05)continue;
    if((parseInt(cs.zIndex)||0)<40)continue;
    const r=x.getBoundingClientRect();
    if(r.width*r.height>vw*vh*.5)return true;
  }
  return false;
}
let idleSince=0;
function tick(){
  if(cur)return;
  if(gs._endless||gs.day>30){idleSince=0;return;}
  if(busy()){idleSince=0;return;}
  const now=Date.now();
  if(!idleSince){idleSince=now;return;}
  if(now-idleSince<650)return;
  const s=S();
  if(!s.queue.length&&s.lastNight<gs.day)s.queue.push(gs.day);
  while(s.queue.length){
    const d=s.queue.shift();
    if(d<=s.lastNight)continue;
    s.lastNight=Math.max(s.lastNight,d);
    if(d>30)continue;
    const sc=pickScene(d);
    if(sc){play(sc,d);return;}
  }
}

// ══════════════════════════════════════════════════════════
// 配信コメントへの反映
// ══════════════════════════════════════════════════════════
const ZW='​';
function sakuraAbsent(){return gs.day>=18&&gs.day<=28;}
function storyComments(){
  const f=F(),d=gs.day,out=[];
  if(d>=5&&d<=9&&(f.whisper||f.no_whisper))out.push({u:'さくら',tx:'小さめの声、ありがとうございます',tp:'normal'});
  if(f.sakura_parent&&d>=10&&d<=17){
    out.push({u:'さくら',tx:'今夜も、腕の中で聞いてます',tp:'worried'});
    out.push({u:'さくら',tx:'三時の抱っこ、おともします',tp:'normal'});
  }
  if(d>=21&&d<=28&&!f.blocked_fake){
    out.push({u:'さくら'+ZW,tx:'30日目まで見ています',tp:'ghost'});
    out.push({u:'さくら'+ZW,tx:'さっきも同じ話、聞きました',tp:'ghost'});
  }
  if(f.sakura_return&&d>=29){
    out.push({u:'さくら',tx:'ただいま。今夜は早めに寝てくださいね',tp:'worried'});
  }
  if((f.hitori_promise||f.hitori_gentle)&&d>=18)out.push({u:'ひとりぼっち',tx:f.hitori_promise?'今夜も一緒に勉強してます。会場で会いましょう':'今日も、行ける分だけ',tp:'normal'});
  if(f.saw_pa)out.push({u:'夜空の旅人',tx:'今夜は名古屋の手前です。聞いてますよ',tp:'normal'});
  if(f.yodaka_reached&&d>=30)out.push({u:'夜鷹',tx:'おつ。寝ろ',tp:'rare'});
  if(f.told_child&&d>=8&&d<=20&&Math.random()<.5)out.push({u:'深夜の常連',tx:'ごきげんよう、だんのうらさん',tp:'normal'});
  return out;
}
// その夜いちばん大事な一言（配信開始から少しして流す）
function pinnedComment(){
  const f=F(),d=gs.day,s=S();
  if(s.pins[d])return null;
  if(d===5&&!s.seen.d05_whisper)return null;
  if(d>=5&&d<=6&&f.whisper)return {u:'さくら',tx:'ありがとうございます。……寝ました',tp:'worried'};
  if(d===10)return {u:'さくら',tx:'今夜も、隣で寝てます',tp:'worried'};
  if(d===13&&f.dream1)return {u:'（削除済み）',tx:'おかえりなさい',tp:'ghost'};
  if(d===17&&f.sakura_confide)return {u:'さくら',tx:'おやすみなさい、だんのうらさん',tp:'worried'};
  if(d===21&&!f.blocked_fake)return {u:'さくら'+ZW,tx:'30日目まで見ています',tp:'ghost'};
  if(d===23&&f.pushed_d23)return {u:'…',tx:'寝たら終わりますよ',tp:'ghost'};
  if(d===29&&f.sakura_return)return {u:'さくら',tx:'ただいま',tp:'worried'};
  if(d===30)return {u:'深夜の常連',tx:'30日、おつかれさまでした',tp:'rare'};
  return null;
}

// ══════════════════════════════════════════════════════════
// game.js の関数を包む（必ず元の関数を呼ぶ）
// ══════════════════════════════════════════════════════════
function wrap(name,fn){
  const prev=window[name];
  if(typeof prev!=='function')return;
  window[name]=fn(prev);
}

window.storyFlags=function(){
  const s=S(),f=s.flags;
  const keep=f.kept_promise?'kept':f.broke_promise?'broken':f.missed_recital?'missed':null;
  const light=lightScore(),dark=darkScore();
  return {
    act:actOf(Math.min(30,gs.day)),
    scenesSeen:Object.keys(s.seen).length,
    seen:Object.assign({},s.seen),
    light,dark,
    route:light-dark>=4?'dawn':dark-light>=2?'sink':'drift',
    finalWords:f.final_words||null,          // 'sleep' | 'tomorrow' | 'sink' | null
    recital:keep,                            // 'kept' | 'broken' | 'missed' | null
    promisedRecital:!!f.promise_recital,
    toldName:!!f.told_name,
    toldChildAboutStream:!!f.told_child,
    sleptAtLowPoint:!!f.slept_d23,
    pushedAtLowPoint:!!f.pushed_d23,
    debtHonest:!!f.debt_honest,
    debtPlan:!!f.debt_plan,
    sakuraBond:s.bond.sakura||0,
    sakuraReturned:!!f.sakura_return,
    sakuraIsParent:!!f.sakura_parent,
    hanchoTrust:(s.bond.hancho||0)+(f.asked_help?1:0),
    askedForHelp:!!f.asked_help,
    chiyoTrust:!!f.chiyo_trust,
    yodaka:f.yodaka_reached?'reached':f.yodaka_silent?'silent':f.yodaka_collab?'collab':f.yodaka_refuse?'refused':null,
    hitori:f.hitori_promise?'promise':f.hitori_gentle?'gentle':null,
    mock:f.mock_pass?'pass':f.mock_close?'close':f.mock_low?'low':null,
    dreamedOfSea:!!f.dream1,
    heardMiyako:!!f.heard_miyako,
    temptedBySea:!!f.tempted_sea,
    flags:Object.assign({},f),
    bond:Object.assign({},s.bond),
    counts:Object.assign({},s.counts),
  };
};

// テスト・デバッグ用
window.Story={
  scenes:()=>SCENES.map(sc=>({id:sc.id,title:sc.title,from:sc.from,to:sc.to,prio:sc.prio})),
  play:(id,day)=>{const sc=SCENE_BY_ID[id];if(sc&&!cur)play(sc,day||gs.day);},
  pick:d=>{const sc=pickScene(d==null?gs.day:d);return sc&&sc.id;},
  playing,
  busy,
  state:S,
  advance,pick_:pick,skip:skipAhead,
  current:()=>cur?{id:cur.sc.id,i:cur.i,choices:cur.opts?cur.opts.map(o=>o.k):null,typing:cur.typing,text:cur.full}:null,
};

if(SIM)return;   // シミュレーターの中では、包まずに要約だけ公開する

wrap('nextDay',prev=>function(){
  const r=prev.apply(this,arguments);
  try{const s=S();if(!s.queue.includes(gs.day))s.queue.push(gs.day);idleSince=0;}catch(e){}
  return r;
});
wrap('goToGame',prev=>function(){
  const r=prev.apply(this,arguments);
  try{const s=S();if(s.lastNight<gs.day&&!s.queue.includes(gs.day))s.queue.push(gs.day);}catch(e){}
  return r;
});
wrap('saveDataToGs',prev=>function(saved){
  const r=prev.apply(this,arguments);
  try{
    if(!saved||!saved.story||typeof saved.story!=='object'){
      // story を持たない古いセーブ：今夜のシーンから始める
      delete gs.story;const s=S();s.lastNight=Math.max(0,(gs.day||1)-1);
      s.actShown=actOf(Math.max(1,(gs.day||1)-1));
    }else{
      gs.story=JSON.parse(JSON.stringify(saved.story));S();
    }
  }catch(e){}
  return r;
});
wrap('handleChoice',prev=>function(ac){
  try{const c=S().counts;c[ac]=(c[ac]||0)+1;}catch(e){}
  return prev.apply(this,arguments);
});
wrap('buildCommentPool',prev=>function(key){
  let pool=prev.apply(this,arguments);
  try{
    if(Array.isArray(pool)){
      if(sakuraAbsent())pool=pool.filter(c=>c.u!=='さくら');
      pool=pool.concat(storyComments());
    }
  }catch(e){}
  return pool;
});
wrap('startSession',prev=>function(type){
  const r=prev.apply(this,arguments);
  try{
    const pc=pinnedComment();
    if(pc){
      S().pins[gs.day]=1;
      setTimeout(()=>{
        const ol=document.getElementById('streaming-ol');
        if(ol&&ol.classList.contains('active')&&typeof addComment==='function'){addComment(pc.u,pc.tx,pc.tp);try{AU.se(pc.tp==='ghost'?'ghost':'comment');}catch(e){}}
      },3200);
    }
  }catch(e){}
  return r;
});

setInterval(tick,300);
})();
