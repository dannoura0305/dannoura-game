// main/icons.js — 操作アイコン（コードで描く独自ドット絵）
// 公開：window.ICONS のみ。
//   ICONS.canvas(name, px=24) → canvas（表示サイズ px の CSS ピクセル、整数倍で拡大済み）
//   ICONS.url(name, px)       → dataURL（キャッシュ）
//   ICONS.html(name, px, label) → <img class="ic" alt="label">（label なし＝装飾扱い aria-hidden）
//   ICONS.names()             → 定義済みの名前
//   ICONS.fromEmoji(e) / ICONS.lead(text) / ICONS.deco(text, px) → 先頭の絵文字をアイコンへ
// 原寸 16×16（中身は 13×13 ＋外周線＋右下の落ち影）。外周線 #1b1226、光源は左上。
// 差し替え：assets/original/icons/index.json に名前を書き、assets/original/icons/<name>.png を置くとそちらを使う。
(function(){
'use strict';
const U=16,OL='#1b1226';
// docs/asset-style-guide.md のパレット（main/home/sprites.js と同じ色）
const P={
  k:OL, K:'#2a1c36',
  a:'#fff4cc', b:'#ffd98a', c:'#ffb85a', d:'#e08a34', D:'#a8601e',
  w:'#fffaf0', W:'#ddd2c0', Y:'#b8a890',
  s:'#d6d2de', S:'#aeaabe', t:'#87839c', T:'#625e78',
  p:'#ffd0e0', P:'#f59aae', q:'#d9708e', Q:'#a54a70',
  v:'#c6b2ee', V:'#8c5fcc', u:'#5a3590', U:'#3a2066',
  g:'#a8d88a', G:'#7fbf6e', h:'#5f9e5c', H:'#43784a',
  e:'#9ff0e0', E:'#4fc8bc', f:'#2a8f96', F:'#1f5f70',
  i:'#a8c0f0', j:'#7f9ad8', I:'#5f78b8', J:'#465a96',
  n:'#4a4a8e', N:'#33306a',
  o:'#f2cf98', O:'#d9a066', x:'#b97c45', X:'#8a5530', Z:'#5e3820',
  m:'#e4e8f0', M:'#a8b0c0', z:'#6e7488',
  r:'#e05a6a', R:'#a83a4a', l:'#ff9a9a', y:'#ffe066',
  1:'#ffe4d0', 2:'#f4bca4', 3:'#3a2440', 4:'#6a4a7a', 5:'#ffffff'
};
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
// 描画ヘルパ（16×16 の原寸キャンバス）
function G(x){
  const col=c=>P[c]||c;
  const g={
    r(c,X,Y,W,H){x.fillStyle=col(c);x.fillRect(X,Y,W==null?1:W,H==null?1:H);return g;},
    x(X,Y,W,H){x.clearRect(X,Y,W==null?1:W,H==null?1:H);return g;},
    d(c,cx,cy,r){x.fillStyle=col(c);for(let j=0;j<U;j++)for(let i=0;i<U;i++){const dx=i+.5-cx,dy=j+.5-cy;if(dx*dx+dy*dy<=r*r)x.fillRect(i,j,1,1);}return g;},
    ring(c,cx,cy,r0,r1){x.fillStyle=col(c);for(let j=0;j<U;j++)for(let i=0;i<U;i++){const dx=i+.5-cx,dy=j+.5-cy,q=dx*dx+dy*dy;if(q<=r1*r1&&q>r0*r0)x.fillRect(i,j,1,1);}return g;},
    xd(cx,cy,r){for(let j=0;j<U;j++)for(let i=0;i<U;i++){const dx=i+.5-cx,dy=j+.5-cy;if(dx*dx+dy*dy<=r*r)x.clearRect(i,j,1,1);}return g;},
    // 立体の円：暗→明（左上が明るい）
    ball(cx,cy,r,lo,base,hi){g.d(lo,cx,cy,r);g.d(base,cx-.5,cy-.5,r-.8);if(hi)g.d(hi,cx-r*.38,cy-r*.38,Math.max(.8,r*.3));return g;},
    l(c,x0,y0,x1,y1,w){x.fillStyle=col(c);w=w||1;const o=(w-1)>>1;let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,e=dx+dy;for(let n=0;n<64;n++){x.fillRect(x0-o,y0-o,w,w);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}return g;},
    m(rows,ox,oy){for(let r=0;r<rows.length;r++){const row=rows[r];for(let i=0;i<row.length;i++){const ch=row[i];if(ch==='.'||ch===' ')continue;if(ch==='_'){x.clearRect(ox+i,oy+r,1,1);continue;}const c=P[ch];if(!c)continue;x.fillStyle=c;x.fillRect(ox+i,oy+r,1,1);}}return g;},
    // 13×13 の枠の中央に置く
    mc(rows){const w=Math.max(...rows.map(s=>s.length)),h=rows.length;return g.m(rows,1+((13-w)>>1),1+((13-h)>>1));},
    gear(cx,cy,ro,ri,rh,n,hi,base,lo,rot){
      for(let j=0;j<U;j++)for(let i=0;i<U;i++){
        const dx=i+.5-cx,dy=j+.5-cy,q=Math.hypot(dx,dy);if(q<=rh||q>ro)continue;
        let a=Math.atan2(dy,dx)+(rot||0);a=((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
        const t=(a/(Math.PI*2)*n)%1;
        if(q>ri&&!(t>.22&&t<.78))continue;
        x.fillStyle=col(dx+dy<-1.5?hi:dx+dy>2?lo:base);x.fillRect(i,j,1,1);
      }
      return g;
    }
  };
  return g;
}

// ───────── アイコン定義 ─────────
// それぞれ g（上のヘルパ）で 1..13 の範囲に描く。外周線と影はあとで自動。
const D={
  // ── 行動 ──
  stream:g=>g.mc([
    "....mmmmm....",
    "...mMmMmMz...",
    "...mmmmmmz...",
    "..c.MmMmMz.c.",
    "..c.mmmmmz.c.",
    "..cb.zzzz.dc.",
    "...cb....dc..",
    "....ccddcc...",
    "......d......",
    "......d......",
    "....bcccd....",
    "...dddddddd.."]),
  work:g=>{g.m([
    "........mm.m.",
    "........mM.mz",
    "........mMMMz",
    ".......mMMMz.",
    "......mMzz...",
    ".....mMz.....",
    "....mMz......",
    "...mMz.......",
    "..mMz........",
    ".mMz.........",
    ".mz.........."],1,1);g.gear(10.5,10.5,3.6,2.5,1,6,'b','c','d',.3);},
  study:g=>g.mc([
    ".wwww...wwww.",
    "wwWWww.wwWWww",
    "wwwwwwkwwwwww",
    "wWWWwwkwwWWWw",
    "wwwwwwkwwwwwW",
    "wWWWwwkwwWWWW",
    "wwwwwwkwwwwWW",
    "WWWWWwkwWWWWW",
    "uVVVVVkVVVVVu",
    ".uuuuukuuuuu."]),
  child:g=>g.mc([
    "....3333..pP.",
    "..3334433pPPq",
    ".33344333.pq.",
    ".33333333333.",
    ".33111111133.",
    ".31k11111k13.",
    ".315111115.3.",
    ".3P1111111P3.",
    ".331111q1113.",
    "..3111111133.",
    "..33.111.33..",
    "...3.....3..."]),
  rest:g=>g.mc([
    "......aabb...",
    ".....abbb....",
    ".....bbb.....",
    ".....bbbc....",
    "......cccd...",
    ".......dd....",
    ".............",
    "..iiiiiiiii..",
    ".iwwiiiiiiij.",
    ".iwiiiiiiijj.",
    ".jiiiiiiijjI.",
    "..IIIIIIIII.."]),
  tea:g=>g.mc([
    "...b..b......",
    "....b..b.....",
    "...b..b......",
    ".............",
    ".wwwwwwww....",
    ".WXXXXXXWwww.",
    ".wwwwwwwwW.w.",
    ".wwwwwwwwW.w.",
    ".wwwwwwwwWww.",
    "..WwwwwwW....",
    "...WWWWW.....",
    "YYYYYYYYYYY.."]),
  sleep:g=>{g.mc([
    "........vvv..",
    ".........v...",
    "....vv..vvv..",
    ".....v.......",
    "x...vv.......",
    "xo...........",
    "xowwW........",
    "xowwWjjjjjjjj",
    "xojjjjjjyjjjj",
    "xoIIIIIIIIIII",
    "xxxxxxxxxxxxx",
    "X...........X"]);},
  home:g=>g.mc([
    "......u......",
    ".....uVu.....",
    "....uVvVu....",
    "...uVvVVVu...",
    "..uVvVVVVVu..",
    ".uVVVVVVVVVu.",
    "uuuuuuuuuuuuu",
    ".WwwwwwwwwwW.",
    ".WwabwwOOwwW.",
    ".WwbcwwOxwwW.",
    ".WwwwwwOxwwW.",
    ".WWWWWWOxWWW."]),
  minigame:g=>g.mc([
    "..VVVVVVVVV..",
    ".VvvvvvvvvvV.",
    "VvvkvvvvvrvvV",
    "VvkkkvvvrvyvV",
    "VvvkvvvvvyvvV",
    "VvvvvVVVvvvvV",
    "VuuuV...Vuuu.",
    ".uuu.....uuu."]),
  // ── メニュー・画面 ──
  stats:g=>g.mc([
    "..........cc.",
    "..........cd.",
    "......EE..cd.",
    "......Ef..cd.",
    "..VV..Ef..cd.",
    "..Vu..Ef..cd.",
    "..Vu..Ef..cd.",
    "..Vu..Ef..cd.",
    "TTTTTTTTTTTTT"]),
  skills:g=>g.mc([
    "......a......",
    ".....aab.....",
    ".....abb.....",
    "....abbbc....",
    "aabbbbbbbbccd",
    ".abbbbbbbbcd.",
    "..bbbbbbbcd..",
    "...bbbbbccd..",
    "...bbbcbccd..",
    "..bbbc.dccd..",
    "..bbc...ddd..",
    ".bcd.....dd.."]),
  settings:g=>g.gear(7.5,7.5,6.3,4.6,1.8,8,'m','M','z',0),
  save:g=>g.mc([
    "jjjjjjjjjjj..",
    "jjmmmmmTmjjj.",
    "jjmmmmmTmjjI.",
    "jjmmmmmmmjjI.",
    "jjjjjjjjjjjI.",
    "jjwwwwwwwwjI.",
    "jjwSSSSSSwjI.",
    "jjwwwwwwwwjI.",
    "jjwSSSSSSwjI.",
    "jjwwwwwwwwjI.",
    "IIIIIIIIIIII."]),
  load:g=>g.mc([
    "cccc.........",
    "cbbbc........",
    "cbbbbccccccc.",
    "cbaaaaaaaaabc",
    "cbbbbbbbbbbbc",
    "cbbbbbbbbbbbc",
    "cbbbbbbbbbbdc",
    "cbbbbbbbbbbdc",
    "cdddddddddddc",
    ".DDDDDDDDDDD."]),
  close:g=>g.mc([
    "mm.......mm",
    "mmm.....mmM",
    ".mmm...mmM.",
    "..mmm.mmM..",
    "...mmmmM...",
    "....mmM....",
    "...mmmMM...",
    "..mmM.MMM..",
    ".mmM...MMM.",
    "mmM.....MMM",
    "MM.......MM"]),
  back:g=>g.mc([
    "....b.......",
    "...bb.......",
    "..bab.......",
    ".baabbbbbbbb",
    "baaaaaaaaaac",
    ".dcccccccccd",
    "..dcd.......",
    "...dd.......",
    "....d......."]),
  next:g=>g.mc([
    ".......b....",
    ".......bb...",
    ".......bab..",
    "bbbbbbbbaab.",
    "baaaaaaaaaab",
    "dcccccccccd.",
    ".......dcd..",
    ".......dd...",
    ".......d...."]),
  play:g=>g.mc([
    "bb.......",
    "babb.....",
    "baabbb...",
    "baaaabbb.",
    "baaaaaacd",
    "baacccdd.",
    "bcccdd...",
    "bcdd.....",
    "dd......."]),
  help:g=>g.mc([
    "..iiiiiii....",
    ".iwwwwwwwi...",
    "iwwJJJJwwwj..",
    "iwJJwwJJwwj..",
    "iwwwwwJJwwj..",
    "iwwwwJJwwwj..",
    "iwwwJJwwwwj..",
    "iwwwwwwwwwj..",
    ".jwwJJwwwj...",
    "..jjjjjjjj...",
    "....jj.......",
    "....j........"]),
  music:g=>g.mc([
    ".....VVVVVVV.",
    ".....VuuuuuV.",
    ".....V.....V.",
    ".....V.....V.",
    ".....V.....V.",
    ".....V.....V.",
    ".....V...vvV.",
    "...vvV..vVVu.",
    "..vVVu..vVuu.",
    "..vVuu...uu..",
    "...uu........"]),
  voice:g=>g.mc([
    "..wwwwwwwww..",
    ".wwwwwwwwwwW.",
    "wwwVwwVwwVwwW",
    "wwwVwwVwwVwwW",
    ".wwwwwwwwwwW.",
    "..WWwwWWWWW..",
    "...Www.......",
    "...WW........",
    "...W........."]),
  se:g=>g.mc([
    "......d......",
    ".....bbc.....",
    "....baacd....",
    "...babbccd...",
    "...babbccd...",
    "...bbbbccd...",
    "..bbbbbcccd..",
    "..bbbbbcccd..",
    ".dddddddddDD.",
    ".....DDD.....",
    "......D......"]),
  sound:g=>g.mc([
    "....mm.......",
    "...mmM...V...",
    "..mmmM....V..",
    "mmmmmM.V..V..",
    "mmmmmM..V..V.",
    "mmmmmM..V..V.",
    "MMMMMM.V..V..",
    "..MMMz....V..",
    "...MMz...V...",
    "....zz......."]),
  mute:g=>g.mc([
    "....mm.......",
    "...mmM.......",
    "..mmmM.......",
    "mmmmmM.r...r.",
    "mmmmmM..r.r..",
    "mmmmmM...r...",
    "MMMMMM..r.r..",
    "..MMMz.r...r.",
    "...MMz.......",
    "....zz......."]),
  target:g=>{g.d('R',7.5,7.5,6.3);g.d('w',7.5,7.5,5);g.d('r',7.5,7.5,3.6);g.d('w',7.5,7.5,2.2);g.d('r',7.5,7.5,1.1);g.r('l',4,4).r('l',3,5);},
  thermo:g=>g.mc([
    ".....mmm.....",
    "....mwwwM....",
    "....mwwwM.k..",
    "....mwrwM....",
    "....mwrwM.k..",
    "....mwrwM....",
    "....mwrwM.k..",
    "....mwrwM....",
    "...mlrrrRM...",
    "...mlrrrRM...",
    "...MrrrRRM...",
    "....MMMMM...."]),
  eye:g=>g.mc([
    "....wwwww....",
    "..wwwWWWww...",
    ".wwwVVVwwWw..",
    "wwwVukVVwwWw.",
    "wwwVkkuVwwWW.",
    ".wwwVVVwwWW..",
    "..WWWWWWWW...",
    "....WWWWW...."]),
  check:g=>g.mc([
    "..........gG",
    ".........gGH",
    "........gGH.",
    "Gg.....gGH..",
    "GGg...gGH...",
    ".HGg.gGH....",
    "..HGgGH.....",
    "...HGH......",
    "....H......."]),
  trash:g=>g.mc([
    "....SSSS.....",
    ".sssssssssst.",
    ".SSSSSSSSSST.",
    "..sStStStSt..",
    "..sStStStSt..",
    "..sStStStSt..",
    "..sStStStSt..",
    "..sStStStSt..",
    "..sStStStSt..",
    "...TTTTTTT..."]),
  copy:g=>g.mc([
    "....SSSS.....",
    ".xxxsmmsxxx..",
    ".xowwwwwwwX..",
    ".xowSSSSwwX..",
    ".xowwwwwwwX..",
    ".xowSSSSSwX..",
    ".xowwwwwwwX..",
    ".xowSSSwwwX..",
    ".xowwwwwwwX..",
    ".XXXXXXXXXX.."]),
  share:g=>g.mc([
    "......b......",
    ".....bac.....",
    "....baacd....",
    "...dddcdDD...",
    "......c......",
    "..Ww..c..wW..",
    "..Ww..c..wW..",
    "..Ww..d..wW..",
    "..WwwwwwwwW..",
    "..YYYYYYYYY.."]),
  calendar:g=>g.mc([
    "..k.....k....",
    "rrkrrrrrkrrr.",
    "rlrrrrrrrrrR.",
    "RRRRRRRRRRRR.",
    "wwwwwwwwwwwW.",
    "wSwSwSwSwSwW.",
    "wwwwwwwwwwwW.",
    "wSwSwrwSwSwW.",
    "wwwwwwwwwwwW.",
    "WWWWWWWWWWWW."]),
  growth:g=>g.mc([
    "........gG...",
    ".GG....gGGh..",
    "GgGG..gGGh...",
    ".GgGh.Gh.....",
    "..hhhGh......",
    ".....h.......",
    ".....h.......",
    "...xxxxxx....",
    "...OOOOOx....",
    "....OOOx.....",
    "....xxxx....."]),
  thought:g=>g.mc([
    "...wwwwwww...",
    ".wwwwwwwwwww.",
    "wwwwwwwwwwwwW",
    "wwVwwVwwVwwwW",
    "wwwwwwwwwwwWW",
    ".WwwwwwwwwWW.",
    "...WWWWWWW...",
    "..ww.........",
    "..WW.........",
    "w............"]),
  medal:g=>{g.m([
    "..rr...jj....",
    "...rr.jj.....",
    "....rrj......",
    ".....R......."],1,1);g.ball(6.5,9,4.6,'d','c','a');g.r('D',6,7,1,4).r('D',5,8,3,1);},
  trophy:g=>g.mc([
    "bbbbbbbbbbb..",
    "bbaabbbbbcd..",
    "babbbbbbcdcd.",
    "bbabbbbbcdcd.",
    ".bbbbbbcccd..",
    "..bbbbbccd...",
    "...dbbcdd....",
    ".....cd......",
    ".....cd......",
    "...XXXXXX....",
    "..XOOOOOOX...",
    "..XXXXXXXX..."]),
  gift:g=>g.mc([
    "...qq...qq...",
    "..q..q.q..q..",
    "...qq.q.qq...",
    "PPPPPPqPPPPPP",
    "pPPPPPqPPPPPq",
    "QQQQQQqQQQQQQ",
    ".VVVVVqVVVVV.",
    ".vVVVVqVVVVu.",
    ".VVVVVqVVVVu.",
    ".VVVVVqVVVVu.",
    ".uuuuuquuuuu."]),
  paw:g=>g.mc([
    "...ww...ww...",
    "..wwW..wwwW..",
    "..wWW..wWW...",
    "ww..........w",
    "wWW..www..wwW",
    "wW..wwwww..W.",
    "...wwwwwwW...",
    "..wwwwwwwwW..",
    "..WwwwwwwWW..",
    "...WW..WW...."]),
  ghost:g=>g.mc([
    "....wwwww....",
    "..wwwwwwwww..",
    ".wwwwwwwwwwW.",
    ".wwkkwwkkwwW.",
    ".wwkkwwkkwwW.",
    ".wwwwwwwwwwW.",
    ".wwwwPPwwwwW.",
    ".wwwwwwwwwWW.",
    ".wwwwwwwwWWW.",
    ".wWwwWwwWWWW.",
    ".W..WW..WW.W."]),
  radio:g=>g.mc([
    "..........k..",
    ".........k...",
    "........k....",
    "xxxxxxxxxxxx.",
    "xoooooooooox.",
    "xoTTTTo.bbOX.",
    "xoTtTto.bdOX.",
    "xoTTTTo.ddOX.",
    "xoTtTto....X.",
    "xOOOOOOOOOOX.",
    "XXXXXXXXXXXX."]),
  factory:g=>g.mc([
    ".SS..........",
    ".St..........",
    ".St..........",
    ".St...t...t..",
    ".St..tt..tt..",
    ".St.tTt.tTt..",
    ".SttTTttTTtt.",
    ".SSSSSSSSSSt.",
    ".SbbSbbSbbSt.",
    ".SbcSbcSbcSt.",
    ".SSSSSSSSSSt.",
    ".TTTTTTTTTTT."]),
  // ── 値・ステータス ──
  money:g=>{g.ball(7.5,7.5,6.2,'d','c','a');g.ring('b',7.5,7.5,4.2,5);g.mc([
    ".............",
    ".............",
    ".............",
    "....D...D....",
    ".....D.D.....",
    "....DDDDD....",
    "......D......",
    "....DDDDD....",
    "......D......",
    "......D......"]);},
  debt:g=>{g.ball(5.5,6.5,4.6,'d','c','a');g.r('D',4,4,3,1).r('D',5,5,1,4).r('D',4,6,3,1);g.m([
    "..rr.",
    "..rr.",
    "..rR.",
    "rrrRR",
    ".rRR.",
    "..R.."],9,6);},
  mental:g=>g.mc([
    ".PPP...PPP.",
    "PppPP.PPPPq",
    "PpPPPPPPPqq",
    "PPPPPPPPPqq",
    "PPPPPPPPqqq",
    ".PPPPPPqqq.",
    "..PPPPqqq..",
    "...PPqqq...",
    "....qqq....",
    ".....q....."]),
  fatigue:g=>g.mc([
    ".............",
    "mmmmmmmmmmm..",
    "mzzzzzzzzzm..",
    "mzrrGGGGGzmmm",
    "mzrrGGGGGzmzm",
    "mzRRHHHHHzmzm",
    "mzzzzzzzzzmmm",
    "mmmmmmmmmmm..",
    "MMMMMMMMMMM.."]),
  flame:g=>g.mc([
    ".....c.......",
    ".....cc......",
    "....ccc......",
    "....cccc..c..",
    "...ccbcc.cc..",
    "...cbbbcccc..",
    "..ccbbbbccd..",
    ".ccbbabbbcd..",
    ".cbbaaabbcd..",
    ".cbaaaaabcd..",
    ".dcbaaabcdd..",
    "..ddcccddd..."]),
  followers:g=>g.mc([
    "........vv...",
    "..ee...vvVV..",
    ".eeEE..vVVV..",
    ".eEEE..vVVu..",
    ".eEEf...VV...",
    "..EE...vvvVV.",
    ".eeeEEvVVVVu.",
    "eeEEEEfVVVVu.",
    "eEEEEEfuuuuu.",
    "EEEEEEf......"]),
  rank:g=>g.mc([
    "b.....b.....b",
    "bb...bab...bd",
    "bab.bbabb.bdd",
    "baabbbbbbbbdd",
    "baarbbebbrbdd",
    "baabbbbbbbbdd",
    "cccccccccccdd",
    "DDDDDDDDDDDDD"]),
  night:g=>g.mc([
    "....aabbb....",
    "...abbb......",
    "..abbb.......",
    ".abbb........",
    ".bbbb........",
    ".bbbb........",
    ".bbbbc.......",
    ".bbbbcc......",
    "..bccccc...d.",
    "..dcccccddd..",
    "...ddddddd...",
    ".....ddd....."]),
  time:g=>{g.ball(7.5,7.5,6.2,'S','w','5');g.ring('j',7.5,7.5,5,6.2);g.r('k',7,3,1,5).r('k',8,7,3,1).r('r',7,7,1,1);g.r('t',7,2).r('t',12,7).r('t',7,12).r('t',2,7);},
  sp:g=>g.mc([
    "......v......",
    ".....vvV.....",
    "....vvVVV....",
    "...vvvVVVu...",
    "..vvvvVVVVu..",
    ".vvvvvVVVVVu.",
    "..VVVVVuuuu..",
    "...VVVVuuu...",
    "....VVVuu....",
    ".....VVu.....",
    "......u......"]),
  hope:g=>g.mc([
    "......a......",
    "......a......",
    ".....aba.....",
    ".....aba.....",
    "....abbbc....",
    "aaabbbbbbbccd",
    "....bbbcd....",
    ".....bcd.....",
    ".....bcd.....",
    "......c......",
    "......d......"]),
  // ── 記録 ──
  endings:g=>g.mc([
    ".uuuuuuuuuu..",
    "uVVVVVVVVVVw.",
    "uVVVbVVVVVVw.",
    "uVVbabVVVVVw.",
    "uVVVbVVVVVVw.",
    "uVVVVVVVVVVw.",
    "uVVVVVVVVVVw.",
    "uVVVVVVVVVVw.",
    "uVVVVVVVVVVw.",
    "uUUUUUUUUUUw.",
    "uwwwwwwwwwww.",
    ".UUUUUUUUUU.."]),
  memories:g=>g.mc([
    "xxxxxxxxxxxxx",
    "xoooooooooooX",
    "xonnnnnnaaboX",
    "xonnnnnnbboaX",
    "xonnnnnnnnnoX",
    "xonnnGnnnnnoX",
    "xonnGGhnnGnoX",
    "xonGGhhhGGhoX",
    "xohhhhhhhhhoX",
    "xoooooooooooX",
    "XXXXXXXXXXXXX"]),
  // ── 通知の種類 ──
  info:g=>{g.ball(7.5,7.5,6.2,'J','j','i');g.r('w',7,4,2,2).r('w',7,7,2,5).r('w',6,7);},
  warn:g=>g.mc([
    "......b......",
    ".....bbc.....",
    ".....bbc.....",
    "....bbkcc....",
    "....bbkcc....",
    "...bbbkccd...",
    "...bbbkccd...",
    "..bbbbcccdd..",
    "..bbbbkcccd..",
    ".bbbbbccccdd.",
    "bcccccccccddd",
    "DDDDDDDDDDDDD"]),
  good:g=>{g.ball(7.5,7.5,6.2,'H','G','g');g.l('w',4,8,6,10,2);g.l('w',6,10,11,5,2);},
  bad:g=>{g.ball(7.5,7.5,6.2,'R','r','l');g.l('w',5,5,10,10,2);g.l('w',10,5,5,10,2);},
  // ── ミニゲーム（ジャンル） ──
  shooter:g=>g.mc([
    "......b......",
    "......b......",
    ".............",
    "......v......",
    ".....vvV.....",
    ".....vEV.....",
    "....vvEVV....",
    "...vvvVVVu...",
    "..vvVvVVuVu..",
    "..vV.VVV.Vu..",
    "..u..cbc..u..",
    "......c......"]),
  roguelike:g=>g.mc([
    ".........b...",
    "........bab..",
    "...TTTTbaaab.",
    "..TtttTbaaab.",
    "TTtSStTbaaab.",
    "TttttTTbaaab.",
    "..TTTT.Tbab..",
    "........b...."]),
  puzzle:g=>g.mc([
    "....d........",
    "...dcd..b....",
    "..dcd..ba....",
    "..dd..bab....",
    "..SS.baab....",
    "..SS.bbabb...",
    "..SS...bab...",
    ".SSSS..ba....",
    ".SttS..b.....",
    ".SttS........",
    "..tt.........",
    "..tt........."]),
  cardbattle:g=>g.mc([
    ".wwwwww......",
    ".wrwwww.vvvv.",
    ".wwwwrwvwwwwv",
    ".wwrrrwvwVwwv",
    ".wwwrwwvVVVwv",
    ".wwwwwwvwVwwv",
    ".wwwwrwvwwwVv",
    ".WWWWWWvwwwwv",
    ".......vwwwwv",
    ".......vvvvvv"]),
  runner:g=>g.mc([
    ".............",
    "......rrr....",
    ".....rrrrr...",
    "....rwrwrrr..",
    "...rrrrrrrrR.",
    "..rrlllrrrrR.",
    ".rrrrrrrrrrR.",
    "wwwwwwwwwwwW.",
    "WSWSWSWSWSWW.",
    "............."]),
  defense:g=>g.mc([
    "jjjjjjjjjjj",
    "jiiiiiIIIIJ",
    "jiwbbbbbIIJ",
    "jiibaabbIIJ",
    "jiibaabIIIJ",
    "jiiibbbIIIJ",
    ".jiiibIIIJ.",
    ".jiiiIIIIJ.",
    "..jiiIIIJ..",
    "...jiIIJ...",
    "....jJJ....",
    ".....J....."]),
  rpg:g=>g.mc([
    "......X......",
    ".....X.X.....",
    "....XXXXX....",
    "...XOOOOOX...",
    "..XxaabbcxX..",
    "..XxaabbcxX..",
    "..XxabbbcxX..",
    "..XxbbccdxX..",
    "..XxbccddxX..",
    "...XOOOOOX...",
    "....XXXXX...."]),
  stealth:g=>g.mc([
    "w.........w..",
    "ww.......WW..",
    "wpw.....WpW..",
    "wwwwwwwwwwW..",
    "wwwwwwwwwwW..",
    "wkkwwwwkkwW..",
    "wwwwwPwwwwW..",
    "wwwwkwkwwwW..",
    ".wwwwwwwwW...",
    "..WWWWWWW...."]),
  quiz:g=>g.mc([
    "..ccccccc....",
    ".cbbbbbbbc...",
    "cbbDDDDbbbd..",
    "cbDDbbDDbbd..",
    "cbbbbbDDbbd..",
    "cbbbbDDbbbd..",
    "cbbbDDbbbbd..",
    "cbbbbbbbbbd..",
    ".dbbDDbbbd...",
    "..ddddddd....",
    "....dd.......",
    "....d........"]),
  horror:g=>D.ghost(g),
  factory3d:g=>D.factory(g),
  cooking:g=>g.mc([
    "....b..b.....",
    ".....b..b....",
    "....b..b.....",
    ".............",
    ".zzzzzzzz....",
    "zmwwwwwwmz...",
    "zMwwwbbwwMz..",
    "zMwwbccwwMzXX",
    "zMwwwbbwwMzXx",
    "zzMwwwwwMzz..",
    ".zzzzzzzzz..."]),
  escape:g=>g.mc([
    "....bbbbb....",
    "...bd...cd...",
    "...b.....d...",
    "...b.....d...",
    ".ccccccccccd.",
    ".cbbbbbbbbbd.",
    ".cbbbkkbbbcd.",
    ".cbbbkkbbbcd.",
    ".cbbbbkbbbcd.",
    ".cbbbbkbbccd.",
    ".cbbbbbbcccd.",
    ".ddddddddddd."]),
  blocks:g=>g.mc([
    "....VVVv.....",
    "....VvVu.....",
    "....VVuu.....",
    "EEEeVVVvbbb..",
    "EeEfVvVubab..",
    "EEff.uu.bbd..",
    "rrrlbbbcbbdd.",
    "rlrRbabdcd...",
    "rrRRbbddd....",
    "............."]),
  manager:g=>g.mc([
    "........bbbb.",
    ".........abb.",
    "........bb.b.",
    "...g...bb..d.",
    "..gGh.bb.....",
    ".gG.Gbb......",
    "gG...b.......",
    ".............",
    "TTTTTTTTTTTTT"]),
  fishing:g=>g.mc([
    "...........M.",
    "...........M.",
    "...eEEE....M.",
    "..eeEEEf..zM.",
    ".eewkEEEf.e..",
    "eeEEEEEEEff..",
    ".EEEEEEEf.F..",
    "..EffffF.....",
    "...fFFF......"]),
  race:g=>g.mc([
    "S............",
    "Sw5kk55kk55..",
    "Sw5kk55kk55..",
    "Swkk55kk55kk.",
    "Swkk55kk55kk.",
    "Sw5kk55kk55..",
    "Sw5kk55kk55..",
    "S............",
    "S............",
    "S............",
    "t............",
    "t............"]),
  // ── ミニゲームのカテゴリ ──
  all:g=>g.mc([
    "vvvvv.vvvvv",
    "vVVVu.vVVVu",
    "vVVVu.vVVVu",
    "vVVVu.vVVVu",
    "uuuuu.uuuuu",
    "...........",
    "vvvvv.vvvvv",
    "vVVVu.vVVVu",
    "vVVVu.vVVVu",
    "vVVVu.vVVVu",
    "uuuuu.uuuuu"]),
  action:g=>g.mc([
    ".......bbbb.",
    "......bab...",
    ".....bab....",
    "....baab....",
    "...baaabbbb.",
    "..baaaaaacd.",
    ".dcbbbacd...",
    "....bacd....",
    "...bcd......",
    "..bcd.......",
    ".bd........."]),
  brain:g=>g.mc([
    "....aaaaa....",
    "...aaabbbb...",
    "..aa5abbbbc..",
    "..aa5bbbbbc..",
    "..abbbbbbcc..",
    "...bbbbbcc...",
    "....bdbdc....",
    "....mmmmm....",
    "....MzMzM....",
    "....mmmmm....",
    ".....zzz....."]),
  story:g=>g.mc([
    "..OOOOOOOOO..",
    ".xowwwwwwwwO.",
    ".xOwwwwwwwwO.",
    "..XwSSSSSwW..",
    "...wwwwwwwW..",
    "...wSSSSwwW..",
    "...wwwwwwwW..",
    "...wSSSSSwW..",
    "..OwwwwwwwwO.",
    ".xoOOOOOOOOx.",
    "..XXXXXXXXX.."]),
  life:g=>g.mc([
    ".........GGG.",
    ".......GGgGh.",
    ".....GGggGhh.",
    "....GggGGhh..",
    "...GgGGhhH...",
    "...GGhhhH....",
    "..hHhHHH.....",
    ".hH..........",
    "h............"]),
  // その他
  lock:g=>g.mc([
    "...SSSSS...",
    "..St...tS..",
    "..S.....T..",
    "..S.....T..",
    "bbbbbbbbbbb",
    "baaabbbbbcd",
    "bbbbkkbbbcd",
    "bbbbkkbbbcd",
    "bbbbbkbbbcd",
    "bcccccccccd",
    "ddddddddddd"]),
  unknown:g=>g.mc([
    "...SSSSS...",
    "..SmmmmmS..",
    ".Smmkkkmmt.",
    ".Smkmmmkmt.",
    ".Smmmmmkmt.",
    ".Smmmmkmmt.",
    ".Smmmkmmmt.",
    ".Smmmmmmmt.",
    "..tmmkmmt..",
    "...ttttt..."])
};
// 別名（ミニゲームの id など）
const ALIAS={rogue:'roguelike',cards:'cardbattle',factoryneta:'radio',deepnight:'night',diag:'thermo',factory_mini:'work',
  rest_light:'tea',rest_deep:'sleep',childcare:'child',singpractice:'music',minigames:'minigame',
  sing:'music',kaidan:'ghost',kuma:'paw',question:'help'};
// 絵文字 → アイコン名（操作の記号として出てくるもの）
const EMOJI={
  '📡':'stream','🎙':'stream','🎤':'music','🔧':'work','🛠':'work','⚙':'settings','🔩':'work',
  '📚':'study','📘':'help','📖':'endings','📜':'study','📝':'quiz',
  '👶':'child','☕':'tea','🛋':'rest','🛏':'sleep','😴':'fatigue','🏠':'home','🏡':'home',
  '🎮':'minigame','📊':'stats','📈':'manager','⭐':'skills','🌟':'skills','✨':'sp','💾':'save','📂':'load','🗑':'trash',
  '💴':'money','💰':'money','💎':'money','💸':'debt','💜':'sp','💫':'mental','❤':'mental','🔥':'flame','👥':'followers',
  '🏆':'trophy','🏅':'medal','👑':'rank','🌙':'night','🌑':'night','🕐':'time','⏰':'time',
  '🎵':'music','🎶':'music','🗣':'voice','🔔':'se','🔇':'mute','🔊':'sound','🎯':'target','🌡':'thermo','👁':'eye',
  '✅':'check','✓':'check','📋':'copy','📤':'share','📅':'calendar','🌱':'growth','💭':'thought','🎁':'gift','🐾':'paw',
  '👻':'ghost','📻':'radio','🏭':'factory','⚠':'warn','🚨':'warn','🏁':'race','ℹ':'info','❌':'bad','✖':'close',
  '◀':'back','▶':'play','←':'back','🛡':'defense','🃏':'cardbattle','🍳':'cooking','🔐':'escape','🧱':'blocks',
  '🎣':'fishing','🛵':'race','🔦':'roguelike','⚡':'puzzle','🏃':'runner','🤫':'stealth','🌊':'rpg','📷':'memories','📸':'memories'
};
const NAMES=Object.keys(D);
function resolve(n){n=String(n||'');if(D[n])return n;if(ALIAS[n]&&D[ALIAS[n]])return ALIAS[n];return 'unknown';}

// ───────── 原寸の生成（外周線＋落ち影）・キャッシュ ─────────
const base=new Map(),urls=new Map(),over={};
function outline(src){
  const c=mk(U,U),x=c.getContext('2d'),d=src.getContext('2d').getImageData(0,0,U,U).data;
  const op=(i,j)=>i>=0&&j>=0&&i<U&&j<U&&d[(j*U+i)*4+3]>40;
  x.fillStyle=OL;
  for(let j=0;j<U;j++)for(let i=0;i<U;i++)if(!op(i,j)&&(op(i-1,j)||op(i+1,j)||op(i,j-1)||op(i,j+1)))x.fillRect(i,j,1,1);
  x.drawImage(src,0,0);return c;
}
function art(name){
  const n=resolve(name);let c=base.get(n);if(c)return c;
  c=mk(U,U);
  try{
    const a=mk(U,U),ax=a.getContext('2d');D[n](G(ax));
    const o=outline(a);
    const x=c.getContext('2d');
    // 右下へ1ドットの落ち影
    const sh=mk(U,U),sx=sh.getContext('2d');sx.drawImage(o,1,1);sx.globalCompositeOperation='source-in';sx.fillStyle='rgba(27,18,38,0.45)';sx.fillRect(0,0,U,U);
    x.drawImage(sh,0,0);x.drawImage(o,0,0);
  }catch(e){}
  base.set(n,c);return c;
}
function dpr(){return Math.max(1,Math.min(4,window.devicePixelRatio||1));}
function canvas(name,px){
  px=px||24;const n=resolve(name);
  const k=Math.max(1,Math.round(px*dpr()/U));            // 整数倍
  const c=mk(U*k,U*k),x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const ov=over[n]||over[String(name)];
  if(ov){x.imageSmoothingEnabled=true;x.drawImage(ov,0,0,c.width,c.height);}
  else x.drawImage(art(n),0,0,c.width,c.height);
  c.className='ic';c.style.width=c.style.height=px+'px';
  return c;
}
function url(name,px){
  px=px||24;const n=resolve(name);
  const k=Math.max(1,Math.round(px*dpr()/U));
  const key=n+'|'+k+(over[n]?'|o':'');
  let u=urls.get(key);if(u)return u;
  try{u=canvas(n,px).toDataURL('image/png');}catch(e){u='';}
  urls.set(key,u);return u;
}
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function html(name,px,label){
  px=px||24;const n=resolve(name);
  const a=label?` alt="${esc(label)}"`:' alt="" aria-hidden="true"';
  return `<img class="ic ic-${n}" data-ic="${n}" data-px="${px}" src="${url(n,px)}" width="${px}" height="${px}"${a} draggable="false">`;
}
// 先頭の絵文字（記号）を調べる
const EMO_RE=/^(?:[←-⇿⌀-⏿①-➿⬀-⯿ℹ™]|\ud83c[\udc00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff])[︎️]?(?:‍(?:\ud83c[\udc00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff]|[☀-➿])[️]?)*/;
function fromEmoji(e){if(!e)return null;const k=String(e).replace(/[︎️]/g,'');return EMOJI[k]||null;}
function lead(text){
  const s=String(text==null?'':text);const m=s.match(EMO_RE);
  if(!m)return {name:null,emoji:'',rest:s};
  const n=fromEmoji(m[0]);
  return {name:n,emoji:m[0],rest:n?s.slice(m[0].length).replace(/^[\s　]+/,''):s};
}
// 「📡 配信」→ アイコン＋文字（HTML、文字はエスケープ）。対応しない絵文字はそのまま
function deco(text,px){
  const l=lead(text);
  if(!l.name)return esc(text);
  return html(l.name,px||18)+'<span class="ic-t">'+esc(l.rest)+'</span>';
}
// 既に置いた <img data-ic> を差し替え後の画像で描き直す
function refreshDom(){
  try{document.querySelectorAll('img.ic[data-ic]').forEach(im=>{const u=url(im.dataset.ic,+im.dataset.px||24);if(u&&im.src!==u)im.src=u;});}catch(e){}
}
// 生成画像の受け口：assets/original/icons/index.json（["stream","work",...]）に載った名前だけ読む
function preload(){
  if(typeof fetch!=='function'||location.protocol==='file:')return;
  fetch('assets/original/icons/index.json',{cache:'no-cache'}).then(r=>r.ok?r.json():[]).then(list=>{
    if(!Array.isArray(list))return;
    list.forEach(n=>{
      if(typeof n!=='string'||!/^[a-z0-9_]+$/.test(n))return;
      const im=new Image();
      im.onload=()=>{if(!im.naturalWidth)return;over[n]=im;urls.clear();refreshDom();try{window.dispatchEvent(new CustomEvent('icons:override',{detail:{name:n}}));}catch(e){}};
      im.src='assets/original/icons/'+n+'.png';
    });
  }).catch(()=>{});
}

window.ICONS={
  SIZE:U, palette:P,
  canvas, url, html, deco, lead, fromEmoji,
  names(){return NAMES.slice();},
  has(n){return !!D[n]||!!ALIAS[n];},
  resolve, refresh:refreshDom,
  overridden(){return Object.keys(over);},
  clearCache(){base.clear();urls.clear();}
};
preload();
})();
