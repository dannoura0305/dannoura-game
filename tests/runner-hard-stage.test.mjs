// 買い出しダッシュ　高難易度版（試作）：試しの 1 面（minigames/runner_hard.js の RunnerHardStage）が、自機の動き（act.js）で最後まで通れるか。
// 簡単な自動操作（右へ進み、決まった所で跳ぶ・壁蹴り・ダッシュジャンプ・スライド）で、始まりからコンビニの戸まで行く。
// また、各区間が「その技でないと越えられない」作りになっていること（ふつうのジャンプでは塀に届かない・歩きジャンプでは広い穴を越えられない・立ったままでは低い天井を通れない）も確かめる。
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const defs = [];
const ctx = { console, Math, Object, Array, Number, JSON, Set, registerMinigame: d => defs.push(d), addMinigameStyle() {} };
vm.createContext(ctx);
vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/act.js'), 'utf8'), ctx, { filename: 'act.js' });
vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/gimmicks.js'), 'utf8'), ctx, { filename: 'gimmicks.js' });
vm.runInContext(readFileSync(join(ROOT, 'minigames/runner/bosses.js'), 'utf8'), ctx, { filename: 'bosses.js' });
vm.runInContext(readFileSync(join(ROOT, 'minigames/runner_hard.js'), 'utf8'), ctx, { filename: 'runner_hard.js' });
const RA = ctx.RunnerAct, ST = ctx.RunnerHardStage;
let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };

const ROWS = ST.rows(), T = RA.TILE, Hh = ROWS.length;
const find = ch => { for (let r = 0; r < Hh; r++) { const c = ROWS[r].indexOf(ch); if (c >= 0) return { c, x: c * T + T / 2, y: (Hh - 1 - r) * T }; } return null; };
const map = RA.makeMap(ROWS.map(r => r.replace(/[SCG]/g, '.')));
const S = find('S'), G = find('G'), AR = ST.arena();

t('登録：runner_hard が 1 本・面は 14 行で幅がそろう・始まりと戸がある', () => {
  assert.equal(defs.length, 1); assert.equal(defs[0].id, 'runner_hard'); assert.equal(typeof defs[0].start, 'function');
  assert.equal(ROWS.length, 14); assert.ok(ROWS.every(r => r.length === ROWS[0].length));
  assert.ok(S && G && G.x > S.x);
});

// 自動操作：x の位置で何をするかを決める（区間は RunnerHardStage.rows() の寸法）
function bot(b, f, mem) {
  const c = b.x / T, inp = { r: true };
  if (b.state === 'jump') inp.j = true;                                                                // 上がっている間は押したまま（いちばん高く）
  if (c > 11.5 && c < 13.5 && b.state !== 'jump' && b.state !== 'fall') inp.j = true;                 // 箱
  if (c > 21.2 && c < 21.75 && b.y >= 79) inp.j = true;                                                 // 穴（3 マス）
  if (c > 44 && c < 48.5 && b.y < 280) {                                                                // 高い塀：壁蹴りで登る（壁ずりになったら押し直す）
    if (b.state === 'stand' || b.state === 'walk' || b.state === 'walk_start' || b.state === 'land') inp.j = true;
    else if (b.state === 'wall_slide') inp.j = (f % 2 === 0);
    else if (b.state === 'wall_kick' || b.state === 'jump') inp.j = true;
  }
  if (c > 64 && c < 69.6 && b.y >= 79) { inp.d = b.state === 'dash' || !mem.prevD; if (c > 68.4) inp.j = true; }   // 広い穴：地上でダッシュを押し直す → 端で跳ぶ
  if ((b.state === 'jump' || b.state === 'fall') && b.dashJump) { inp.d = true; inp.j = true; }
  if (c > 81 && c < 95) inp.dn = (f % 40 < 2);                                                          // 低い天井：スライド
  if (mem.prevJ && inp.j && (b.state === 'stand' || b.state === 'walk' || b.state === 'land' || b.state === 'walk_start')) inp.j = false;   // 地上では押し直す
  mem.prevJ = !!inp.j; mem.prevD = !!inp.d;
  return inp;
}
function runBot(limit = 60 * 90) {
  const A = RA.make({ map }), b = A.body(S.x, S.y, 1), mem = {}; let hurt = 0, maxX = 0, f = 0;
  for (; f < limit; f++) { A.step(b, bot(b, f, mem)); if (b.state === 'hurt') hurt++; maxX = Math.max(maxX, b.x); if (b.x > (AR.c0 + 2) * T && b.y === 80) return { ok: true, f, hurt, b }; }
  return { ok: false, f, hurt, maxX: Math.round(maxX / T), b };
}

t('通れる：自動操作で、始まりからボスの部屋まで行ける（とげに当たらずに）', () => {
  const r = runBot();
  assert.ok(r.ok, `届かなかった：いちばん右 ${r.maxX} マス・最後 ${r.b.state} (${(r.b.x / T).toFixed(1)}, ${(r.b.y / T).toFixed(1)})`);
  assert.equal(r.hurt, 0, 'とげに当たった');
  assert.ok(r.f / 60 < 60, `${(r.f / 60).toFixed(1)} 秒`);
});

t('区間の意味：ふつうのジャンプでは高い塀（200px）に届かない', () => {
  const A = RA.make({ map }), b = A.body(46 * T, 80, 1);
  for (let f = 0; f < 120; f++) A.step(b, { r: true, j: true });
  assert.ok(b.y < 280, '塀の上に乗れてしまう');
});

t('区間の意味：歩きながらのジャンプでは広い穴（240px）を越えられない', () => {
  const A = RA.make({ map }), b = A.body(68.5 * T, 80, 1); let f = 0;
  for (; f < 200; f++) { A.step(b, { r: true, j: f < 40 }); if (b.state === 'land' || b.state === 'hurt') break; }
  assert.ok(b.x < 76 * T, `越えてしまう x=${(b.x / T).toFixed(1)}`);
});

t('区間の意味：立ったまま（歩き）では低い天井の下を通れない', () => {
  const A = RA.make({ map }), b = A.body(80 * T, 80, 1);
  for (let f = 0; f < 200; f++) A.step(b, { r: true });
  assert.ok(b.x < 84 * T, `通れてしまう x=${(b.x / T).toFixed(1)}`);
});

t('ボスの部屋：平らな床（列 c0〜c1）・その先にコンビニの戸・部屋から戸まで歩いて行ける', () => {
  for (let c = AR.c0 - 1; c <= AR.c1 + 1; c++) { assert.ok(map.solid(c, 1), `床 ${c}`); assert.ok(!map.solid(c, 2) && !map.solid(c, 3), `空き ${c}`); }
  assert.ok(G.c > AR.c1 + 1);
  const A = RA.make({ map }), b = A.body((AR.c1 - 1) * T, 80, 1); let f = 0;
  for (; f < 600; f++) { A.step(b, { r: true }); if (Math.abs(b.x - G.x) < 26) break; }
  assert.ok(Math.abs(b.x - G.x) < 26, `戸に届かない x=${(b.x / T).toFixed(1)}`);
  map.extra.add((AR.c1 + 1) + ',2'); map.extra.add((AR.c1 + 1) + ',3');
  const c = A.body((AR.c1 - 1) * T, 80, 1); for (let i = 0; i < 200; i++) A.step(c, { r: true }); assert.ok(c.x < (AR.c1 + 1) * T, '柵が閉まっていれば通れない');
  map.extra.clear();
});

// ── 背景の絵で作った 3 つの面：雷殻「高架下・都市送電区」・風斬「雨のビルの屋上」・濁流「排水路・増水した市街地」（帯電する床・突風・増水） ──
{
function runStage(id, bot, limit=60*120, log=false) {
  const ST=ctx.RunnerHardStages[id], ROWS=ST.rows(), Hh=ROWS.length;
  let S=null; ROWS.forEach((r,ri)=>{ const c=r.indexOf('S'); if(c>=0) S={x:c*T+T/2,y:(Hh-1-ri)*T}; });
  const map=RA.makeMap(ROWS.map(r=>r.replace(/[SCG]/g,'.'))); if (ST.ledges) for (const L of ST.ledges()) map.ledges.push(L); const G=ctx.RunnerGimmicks.make(map, ST.gimmicks());
  { const y0=S.y; while (S.y>0 && !map.solid(Math.floor(S.x/T), Math.floor((S.y-1)/T))) S.y-=T; for (const L of map.ledges) if (L.y<=y0+0.01 && L.y>S.y && S.x>L.x0 && S.x<L.x1) S.y=L.y; }
  const A=RA.make({map}); const b=A.body(S.x,S.y,1), mem={}, AR=ST.arena(), FL=(AR.floorCy||2)*T, FY=ST.fallY!=null?ST.fallY:-120; let hurt=0,f=0;
  for(;f<limit;f++){ const inp=bot(G,b,f,mem); A.step(b,inp); G.step(b,A.box(b)); const sh=G.shock(A.box(b)); if((sh||b.state==='hurt')&&!mem.h){hurt++; if(log) console.log('hurt',id,(b.x/T).toFixed(1),b.y.toFixed(0),b.state,f, sh?'shock':'');} mem.h=sh||b.state==='hurt';
    if (b.y < 10 && b.y>=0 && b.state!=='hurt' && log && !mem.low) { console.log('low', (b.x/T).toFixed(1)); mem.low=1; }
    if (b.y < (ST.fallY!=null?ST.fallY:30)) { if (log) console.log('fell', (b.x/T).toFixed(1)); return {ok:false,f,hurt,b,x:(b.x/T).toFixed(1),y:'fell'}; }
    if (b.x>(AR.c0+2)*T && Math.abs(b.y-FL)<0.5) return {ok:true,f,hurt,b};
  }
  return {ok:false,f,hurt,b,x:(b.x/T).toFixed(1),y:b.y.toFixed(0)};
}
const ground=b=>['stand','walk','walk_start','land'].includes(b.state);
function kokaBot(G,b,f,mem){
  const x=b.x, y=b.y, inp={r:true}, gr=['stand','walk','walk_start','land'].includes(b.state), on=h=>gr&&Math.abs(y-h)<1, S=G.strips;
  if (b.state==='jump') inp.j=true;
  if (on(180) && x>300) inp.j=true;                                                   // → 鉄の足場（216）
  if (on(216) && x>450) inp.j=true;                                                   // → 足場（285）
  if (on(285) && x>730) inp.j=true;                                                   // → 高い足場（358）
  for (const [i,a] of [[0,1080],[1,1480],[2,3310]]) if (on(160) && x>a && x<a+30 && (G.live(S[i])||G.left(S[i])<70)) inp.r=false;   // 帯電する床：止むのを待つ
  if (on(160) && x>2440 && x<2460) inp.j=true;                                       // → 足場（153）
  if (on(153) && x>2675) inp.j=true;                                                  // → 足場（200）
  if (on(200) && x>2915) inp.j=true;                                                  // → 足場（243）
  if (mem.prevJ && inp.j && gr) inp.j=false;
  mem.prevJ=!!inp.j; mem.prevD=!!inp.d; return inp;
}
function okujoBot(G,b,f,mem){
  const x=b.x, y=b.y, inp={r:true}, gr=['stand','walk','walk_start','land'].includes(b.state), air=b.state==='jump'||b.state==='fall', on=h=>gr&&Math.abs(y-h)<1, w0=G.winds[0];
  if (b.state==='jump') inp.j=true;
  if (on(160) && x>380 && x<420 && (G.live(w0)||G.left(w0)<60)) inp.r=false;        // 向かい風：止むのを待つ
  if (on(160) && x>440 && x<460) inp.j=true;                                         // → 給水塔のビル（198）
  if (on(198) && x>865 && x<915) inp.j=true;                                         // 渡り廊下 → 塔（275）
  if (on(275) && x>1100) inp.j=true;                                                  // 塔 → 隣のビル（195）
  if (on(160) && x>2550 && x<2600) inp.j=true;                                                  // → 張り出し（174）
  if (on(174) && x>2654) inp.j=true;                                                  // → 張り出し（252）
  if (air && y>256 && y<320 && x>2730 && x<2785 && b.vy<0) inp.r=false;            // 張り出し（252）に降りる
  if (on(252) && x>2735) inp.j=true;                                                  // → 塔の上（313）
  if (air && y>318 && x>2700 && x<2780 && b.vy<0) inp.r=false;                       // 塔の上に降りる
  if (on(313) && x>2700 && x<2745 && (G.live(G.winds[1])||G.left(G.winds[1])<50)) inp.r=false;   // 2 つめの向かい風：止むのを待つ
  if (on(313) && x>2740 && x<2775) { inp.d=b.state==='dash'||!mem.prevD; if (x>2755) inp.j=true; }   // ダッシュジャンプで隣の塔の張り出し（230）へ
  if (air && b.dashJump) { inp.d=true; inp.j=b.state==='jump'; }
  if (air && y>235 && x>2930 && x<2990 && b.vy<0) { inp.r=false; inp.d=false; }      // 張り出し（230）に降りる
  if (on(230) && x>2985) inp.j=true;                                                  // → まん中のビル（195）
  if (mem.prevJ && inp.j && gr) inp.j=false;
  mem.prevJ=!!inp.j; mem.prevD=!!inp.d; return inp;
}
function haisuiBot(G,b,f,mem){
  const x=b.x, inp={r:true}, [f1,f2]=G.floods, gr=['stand','walk','walk_start','land'].includes(b.state);
  const wait=(fl,need)=>G.live(fl)||G.left(fl)<need;
  if (b.state==='jump') inp.j=true;
  // 1 枚目：左の岸壁の端で、水が引くのを待ってダッシュジャンプ → 柱を 4 本 → 右の岸壁
  if (x>300 && x<334 && gr && Math.abs(b.y-160)<1) { if (wait(f1,150)) inp.r=false; else { inp.d=true; mem.go1=f; } }
  if (mem.go1 && f-mem.go1<30 && x<360 && (b.state==='dash'||gr)) { inp.d=b.state==='dash'||!mem.prevD; if (x>326) inp.j=true; }
  if ((b.state==='jump'||b.state==='fall') && b.dashJump) { inp.d=true; inp.j=true; }
  if (gr && Math.abs(b.y-137)<1 && x>730) inp.j=true;
  if (gr && Math.abs(b.y-110)<1 && x>935) inp.j=true;
  if (gr && Math.abs(b.y-165)<1 && x>1160) inp.j=true;
  if (gr && Math.abs(b.y-203)<1 && x>1428) inp.j=true;
  // 2 枚目：左の床の端で待つ → 柱 → 作業台（安全）→ 待つ → 柱 → 張り出し（安全）→ 柱 → 右の岸壁
  if (gr && Math.abs(b.y-200)<1 && x>2280 && x<2320 && wait(f2,90)) inp.r=false;
  if (gr && Math.abs(b.y-175)<1 && x>2440) inp.j=true;
  if (gr && Math.abs(b.y-240)<1 && x>2840 && x<2870 && wait(f2,110)) inp.r=false;
  if (gr && Math.abs(b.y-170)<1 && x>3040) inp.j=true;
  if (gr && Math.abs(b.y-177)<1 && x>3380) inp.j=true;
  if (mem.prevJ && inp.j && gr) inp.j=false;
  mem.prevJ=!!inp.j; mem.prevD=!!inp.d; return inp;
}
  for (const [id, bot, boss, sec] of [['koka', kokaBot, 'raikaku', 40], ['okujo', okujoBot, 'kazegiri', 40], ['haisui', haisuiBot, 'dakuryu', 60]]) {
    const K = ctx.RunnerHardStages[id], KR = K.rows();
    t(`${K.name}：14 行で幅がそろう・始まりと戸・ボスの表とつながる・ボスの部屋は平らで 1 画面ほど`, () => {
      assert.equal(KR.length, 14); assert.ok(KR.every(r => r.length === KR[0].length)); assert.ok(KR.some(r => r.includes('S')) && KR.some(r => r.includes('G')));
      const A = K.arena(), d = ctx.RunnerBosses.BOSSES.find(b => b.id === A.boss); assert.ok(d && ctx.RunnerHardStages[d.stage] === K && d.id === boss);
      const map = RA.makeMap(KR.map(r => r.replace(/[SCG]/g, '.'))), fc = A.floorCy || 2; for (let c = A.c0; c <= A.c1; c++) { assert.ok(map.solid(c, fc - 1) && !map.solid(c, fc) && !map.solid(c, fc + 1), `床 ${c}`); }
      assert.ok(A.c1 - A.c0 + 1 >= 13 && A.c1 - A.c0 + 1 <= 16);
    });
    t(`${K.name}：通れる（自動操作で、始まりからボスの部屋まで。仕掛けにも とげにも当たらずに）`, () => {
      const r = runStage(id, bot, 60 * 120); assert.ok(r.ok, `届かなかった：${r.x} ${r.y}`); assert.equal(r.hurt, 0); assert.ok(r.f / 60 < sec, `${(r.f / 60).toFixed(1)} 秒`);
    });
  }
  const kmap = () => { const K = ctx.RunnerHardStages.koka, map = RA.makeMap(K.rows().map(r => r.replace(/[SCG]/g, '.'))); for (const L of K.ledges()) map.ledges.push(L); return { K, map }; };
  t('高架下：帯電する床は、流れている間に歩いて渡ると やられ（流れる前にちらつく）', () => {
    const { K, map } = kmap(), G = ctx.RunnerGimmicks.make(map, K.gimmicks()), A = RA.make({ map }), s0 = G.strips[0], b = A.body(s0.c0 * 40 - 30, 160, 1); let shocked = false, warned = false;
    for (let f = 0; f < 300 && !shocked; f++) { A.step(b, { r: true }); G.step(b, A.box(b)); warned = warned || G.warn(s0); if (G.shock(A.box(b))) shocked = true; }
    assert.ok(shocked); assert.ok(warned || G.live(s0));
  });
  t('高架下：ボスの部屋の看板は乗っても落ちない・踏みつけで壊れて戻る・雷雲招来の間は帯電・床からジャンプで届く', () => {
    const { K, map } = kmap(), G = ctx.RunnerGimmicks.make(map, K.gimmicks()), A = RA.make({ map }), sign = G.crumbles.find(c => c.arena), top = (sign.cy + 1) * 40;
    const s = A.body((sign.c0 + 1) * 40, top, 1); for (let f = 0; f < 200; f++) { A.step(s, {}); G.step(s, A.box(s)); } assert.equal(sign.st, 'solid'); assert.equal(s.y, top);
    G.breakArena(); assert.equal(sign.st, 'gone'); assert.ok(!map.solid(sign.c0, sign.cy));
    G.charge(true); for (let f = 0; f < 400; f++) G.step(null, null); assert.equal(sign.st, 'solid'); assert.ok(G.shock({ x0: sign.c0 * 40 + 5, x1: sign.c0 * 40 + 19, y0: top, y1: top + 48 }));
    const j = A.body((sign.c0 - 1) * 40, 160, 1); for (let f = 0; f < 120; f++) { A.step(j, { r: f > 6, j: f < 40 }); G.step(j, A.box(j)); if (j.y === top) break; } assert.equal(j.y, top, '看板に乗れる');
  });
  t('高架下：足場は背景の絵に合わせた高さ・稲妻の穴へ落ちたら途中の印から（穴と同じ）', () => {
    const { K, map } = kmap(); assert.ok(K.art.length === 3 && K.W * 40 === K.art.length * 2000, '絵 3 枚＝面の幅');
    const A = RA.make({ map }), b = A.body(400, 400, 1); for (let f = 0; f < 120; f++) A.step(b, {}); assert.equal(b.y, 216, '鉄の足場の上に立つ');
    const c = A.body(505, 400, 1); for (let f = 0; f < 120; f++) A.step(c, {}); assert.ok(c.y < K.fallY, '足場の間（稲妻の穴）は落ちる');
  });
  t('仕掛けの意味：向かい風の間は、屋上を歩いても押し戻されて すき間の手前まで進めない（止むのを待つ）', () => {
    const K = ctx.RunnerHardStages.okujo, map = RA.makeMap(K.rows().map(r => r.replace(/[SCG]/g, '.'))); for (const L of K.ledges()) map.ledges.push(L);
    const walk = live => { const G = ctx.RunnerGimmicks.make(map, K.gimmicks()); if (!live) for (let f = 0; f < 110; f++) G.step(null, null); assert.equal(G.live(G.winds[0]), live); const A = RA.make({ map }), b = A.body(450, 160, 1); for (let f = 0; f < 40; f++) { A.step(b, { r: true }); G.step(b, A.box(b)); } return b.x; };
    assert.ok(walk(true) < 450, '向かい風で押し戻される'); assert.ok(walk(false) > 520, '止むと進める');
  });
  t('雨のビルの屋上：足場は背景の絵に合わせた高さ・塔の上はジャンプ 1 回では届かない（張り出しを伝う）', () => {
    const K = ctx.RunnerHardStages.okujo, map = RA.makeMap(K.rows().map(r => r.replace(/[SCG]/g, '.'))); for (const L of K.ledges()) map.ledges.push(L);
    assert.ok(K.art.length === 3 && K.W * 40 === K.art.length * 2000, '絵 3 枚＝面の幅');
    const A = RA.make({ map }), b = A.body(2450, 160, 1); let top = 0; for (let f = 0; f < 80; f++) { A.step(b, { j: true }); top = Math.max(top, b.y); } assert.ok(top < 313, `塔（313）に届いてしまう ${top}`);
    const c = A.body(2690, 300, 1); for (let f = 0; f < 120; f++) A.step(c, {}); assert.equal(c.y, 174, '張り出しの上に立つ');
  });
  t('仕掛けの意味：増水の間は水の中の低い柱に立っていると やられ・高い足場（203）には水が届かない', () => {
    const K = ctx.RunnerHardStages.haisui, map = RA.makeMap(K.rows().map(r => r.replace(/[SCG]/g, '.'))), G = ctx.RunnerGimmicks.make(map, K.gimmicks());
    const fl = G.floods[0]; for (let f = 0; f < 80; f++) G.step(null, null); assert.ok(G.live(fl) && G.level(fl) > 80);
    assert.ok(G.shock({ x0: 650, x1: 664, y0: 137, y1: 185 }), '低い柱（137）は浸かる'); assert.ok(!G.shock({ x0: 1350, x1: 1364, y0: 203, y1: 251 }), '高い柱（203）は浸からない');
    for (let f = 0; f < 200; f++) G.step(null, null); assert.ok(!G.live(fl)); assert.ok(!G.shock({ x0: 650, x1: 664, y0: 137, y1: 185 }), '引くと立てる');
  });
  t('排水路：足場は背景の絵に合わせた好きな高さ（ledges）にも乗れる・水より下へ落ちたら穴と同じ', () => {
    const K = ctx.RunnerHardStages.haisui, map = RA.makeMap(K.rows().map(r => r.replace(/[SCG]/g, '.'))); for (const L of K.ledges()) map.ledges.push(L);
    const A = RA.make({ map }), b = A.body(670, 300, 1); for (let f = 0; f < 120; f++) A.step(b, {}); assert.equal(b.y, 137, '柱の上に立つ');
    const c = A.body(780, 300, 1); for (let f = 0; f < 120; f++) A.step(c, {}); assert.ok(c.y < K.fallY, '柱の間は水へ落ちる');
    assert.ok(K.art.length === 3 && K.W * 40 === K.art.length * 2000, '絵 3 枚＝面の幅');
  });
}

console.log(`runner-hard-stage: ${n} ok`);
