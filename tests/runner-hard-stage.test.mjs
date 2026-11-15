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

// ── 雷殻の怪異の面「高架下・都市送電区」（RunnerHardStages.koka）と、面の仕掛け（gimmicks.js） ──
{
  const K = ctx.RunnerHardStages.koka, KR = K.rows(), KH = KR.length, GD = K.gimmicks(), KA = K.arena();
  const kfind = ch => { for (let r = 0; r < KH; r++) { const c = KR[r].indexOf(ch); if (c >= 0) return { c, x: c * T + T / 2, y: (KH - 1 - r) * T }; } return null; };
  const kmap = () => RA.makeMap(KR.map(r => r.replace(/[SCG]/g, '.')));
  const KS = kfind('S'), KG = kfind('G');
  t('高架下：14 行で幅がそろう・始まりと戸・ボスの表の面と部屋のボスがつながる（雷殻の怪異）', () => {
    assert.equal(KR.length, 14); assert.ok(KR.every(r => r.length === KR[0].length)); assert.ok(KS && KG && KG.x > (KA.c1 + 1) * T);
    const d = ctx.RunnerBosses.BOSSES.find(b => b.id === KA.boss); assert.ok(d && d.stage === 'koka' && ctx.RunnerHardStages[d.stage] === K);
    for (const b of ctx.RunnerBosses.visible()) assert.ok(ctx.RunnerHardStages[b.stage] && ctx.RunnerHardStages[b.stage].arena().boss === b.id, 'どのボスにも面がある ' + b.id);
  });
  // 自動操作：帯電する床は止んでいる間に渡る（箱で待つ）・壊れる足場は止まらずに跳び移る・柱は壁蹴り・広い穴はダッシュジャンプ・ダクトはスライド
  function kbot(G, b, f, mem) {
    const c = b.x / T, inp = { r: true }, ground = ['stand', 'walk', 'walk_start', 'land'].includes(b.state), [s1, s2] = G.strips;
    if (b.state === 'jump') inp.j = true;
    if (c > 15 && c < 15.6 && ground && (G.live(s1) || G.left(s1) < 62)) inp.r = false;
    if (c > 19.7 && c < 20.6 && b.y <= 80.5 && ground) inp.j = true;
    if (c > 21 && c < 22.7 && b.y >= 119 && ground && (G.live(s2) || G.left(s2) < 64)) inp.r = false;
    for (const e of [33.2, 38.2, 42.2, 46.2]) if (c > e && c < e + 0.6 && ground) inp.j = true;
    if (c > 56 && c < 60.5 && b.y < 320) { if (ground) inp.j = true; else if (b.state === 'wall_slide') inp.j = (f % 2 === 0); else if (b.state === 'wall_kick' || b.state === 'jump') inp.j = true; }
    if (c > 66 && c < 71.6 && b.y >= 79 && b.y < 81) { inp.d = b.state === 'dash' || !mem.prevD; if (c > 70.4) inp.j = true; }
    if ((b.state === 'jump' || b.state === 'fall') && b.dashJump) { inp.d = true; inp.j = true; }
    if (c > 83 && c < 97) inp.dn = (f % 40 < 2);
    if (mem.prevJ && inp.j && ground) inp.j = false;
    mem.prevJ = !!inp.j; mem.prevD = !!inp.d; return inp;
  }
  t('高架下：通れる（自動操作で、始まりからボスの部屋まで。電気にも とげにも当たらずに）', () => {
    const map = kmap(), G = ctx.RunnerGimmicks.make(map, GD), A = RA.make({ map }), b = A.body(KS.x, KS.y, 1), mem = {}; let hurt = 0, f = 0, ok = false;
    for (; f < 60 * 90; f++) { A.step(b, kbot(G, b, f, mem)); G.step(b, A.box(b)); if (G.shock(A.box(b)) || b.state === 'hurt') hurt++; if (b.y < -40) break; if (b.x > (KA.c0 + 2) * T && b.y === 80) { ok = true; break; } }
    assert.ok(ok, `届かなかった：${(b.x / T).toFixed(1)} マス・${b.state}`); assert.equal(hurt, 0); assert.ok(f / 60 < 45, `${(f / 60).toFixed(1)} 秒`);
  });
  t('仕掛けの意味：帯電する床は、流れている間に歩いて渡ると やられ（流れる前にちらつく）', () => {
    const map = kmap(), G = ctx.RunnerGimmicks.make(map, GD), A = RA.make({ map }), b = A.body(15 * T, 80, 1); let shocked = false, warned = false;
    for (let f = 0; f < 300 && !shocked; f++) { A.step(b, { r: true }); G.step(b, A.box(b)); warned = warned || G.warn(G.strips[0]); if (G.shock(A.box(b))) shocked = true; }
    assert.ok(shocked); assert.ok(warned || G.live(G.strips[0]));
  });
  t('仕掛けの意味：壊れる足場は乗ると揺れて落ちる → しばらくして戻る。看板（stable）は乗っても落ちず、踏みつけで壊れる', () => {
    const map = kmap(), G = ctx.RunnerGimmicks.make(map, GD), A = RA.make({ map }), c0 = G.crumbles[0], b = A.body((c0.c0 + 1) * T, (c0.cy + 1) * T, 1);
    let fell = false; for (let f = 0; f < 120; f++) { A.step(b, {}); G.step(b, A.box(b)); if (c0.st === 'gone') fell = true; }
    assert.ok(fell && b.y < 80, '落ちる'); for (let f = 0; f < 400; f++) G.step(null, null); assert.equal(c0.st, 'solid', '戻る'); assert.ok(map.solid(c0.c0, c0.cy));
    const sign = G.crumbles.find(c => c.arena), s = A.body((sign.c0 + 1) * T, (sign.cy + 1) * T, 1);
    for (let f = 0; f < 200; f++) { A.step(s, {}); G.step(s, A.box(s)); } assert.equal(sign.st, 'solid'); assert.equal(s.y, (sign.cy + 1) * T, '看板は乗っても落ちない');
    G.breakArena(); assert.equal(sign.st, 'gone'); assert.ok(!map.solid(sign.c0, sign.cy));
    G.charge(true); for (let f = 0; f < 400; f++) G.step(null, null); assert.equal(sign.st, 'solid'); assert.ok(G.shock({ x0: sign.c0 * T + 5, x1: sign.c0 * T + 19, y0: (sign.cy + 1) * T, y1: (sign.cy + 1) * T + 48 }), '帯電した看板に触れると やられ');
  });
  t('高架下のボスの部屋：平らな床・1 画面ほどの幅（13〜16 マス）・その先にコンビニの戸まで歩いて行ける', () => {
    const map = kmap(); for (let c = KA.c0 - 1; c <= KA.c1 + 1; c++) { assert.ok(map.solid(c, 1), `床 ${c}`); assert.ok(!map.solid(c, 2) && !map.solid(c, 3), `空き ${c}`); }
    assert.ok(KA.c1 - KA.c0 + 1 >= 13 && KA.c1 - KA.c0 + 1 <= 16); assert.ok(KA.bossC > KA.c0 && KA.bossC < KA.c1);
    const A = RA.make({ map }), b = A.body((KA.c1 - 1) * T, 80, 1); for (let f = 0; f < 600 && Math.abs(b.x - KG.x) >= 26; f++) A.step(b, { r: true });
    assert.ok(Math.abs(b.x - KG.x) < 26, `戸に届かない x=${(b.x / T).toFixed(1)}`);
  });
  t('仕掛けの意味：高架の柱（240px）はふつうのジャンプでは届かない・看板には床からジャンプで届く', () => {
    const map = kmap(), A = RA.make({ map }), b = A.body(58 * T, 80, 1); for (let f = 0; f < 120; f++) A.step(b, { r: true, j: true }); assert.ok(b.y < 320);
    const sign = GD.crumbles.find(c => c.arena), G = ctx.RunnerGimmicks.make(map, GD), s = A.body((sign.c0 - 1) * T, 80, 1);
    for (let f = 0; f < 120; f++) { A.step(s, { r: f > 6, j: f < 40 }); G.step(s, A.box(s)); if (s.y === (sign.cy + 1) * T) break; }
    assert.equal(s.y, (sign.cy + 1) * T, '看板に乗れる');
  });
}

// ── 風斬の怪異の面「雨のビルの屋上」・濁流の怪異の面「排水路・増水した市街地」（突風・増水） ──
{
function runStage(id, bot, limit=60*120, log=false) {
  const ST=ctx.RunnerHardStages[id], ROWS=ST.rows(), Hh=ROWS.length;
  let S=null; ROWS.forEach((r,ri)=>{ const c=r.indexOf('S'); if(c>=0) S={x:c*T+T/2,y:(Hh-1-ri)*T}; });
  const map=RA.makeMap(ROWS.map(r=>r.replace(/[SCG]/g,'.'))); const G=ctx.RunnerGimmicks.make(map, ST.gimmicks());
  while (S.y>0 && !map.solid(Math.floor(S.x/T), Math.floor((S.y-1)/T))) S.y-=T;
  const A=RA.make({map}); const b=A.body(S.x,S.y,1), mem={}, AR=ST.arena(); let hurt=0,f=0;
  for(;f<limit;f++){ const inp=bot(G,b,f,mem); A.step(b,inp); G.step(b,A.box(b)); const sh=G.shock(A.box(b)); if((sh||b.state==='hurt')&&!mem.h){hurt++; if(log) console.log('hurt',id,(b.x/T).toFixed(1),b.y.toFixed(0),b.state,f, sh?'shock':'');} mem.h=sh||b.state==='hurt';
    if (b.y < 10 && b.y>=0 && b.state!=='hurt' && log && !mem.low) { console.log('low', (b.x/T).toFixed(1)); mem.low=1; }
    if (b.y < 30) { if (log) console.log('fell', (b.x/T).toFixed(1)); return {ok:false,f,hurt,b,x:(b.x/T).toFixed(1),y:'fell'}; }
    if (b.x>(AR.c0+2)*T && Math.abs(b.y-80)<0.5) return {ok:true,f,hurt,b};
  }
  return {ok:false,f,hurt,b,x:(b.x/T).toFixed(1),y:b.y.toFixed(0)};
}
const ground=b=>['stand','walk','walk_start','land'].includes(b.state);
function okujoBot(G,b,f,mem){
  const c=b.x/T, inp={r:true}, w0=G.winds[0];
  if (b.state==='jump') inp.j=true;
  for (const e of [15.3, 18.2]) if (c>e&&c<e+0.6&&ground(b)) inp.j=true;
  // 5 マスのすき間：向かい風が止んでいる間にダッシュジャンプ
  if (c>27 && c<30.7 && Math.abs(b.y-160)<0.5) { if (c<27.6 && ground(b) && (G.live(w0) || G.left(w0)<70)) inp.r=false; else if (c>=27.6) { inp.d = b.state==='dash' || !mem.prevD; if (c>29.9) inp.j=true; } }
  if ((b.state==='jump'||b.state==='fall') && b.dashJump) { inp.d=true; inp.j=true; }
  if (c>46 && c<51.2 && b.y<360) { if (ground(b)) inp.j=true; else if (b.state==='wall_slide') inp.j=(f%2===0); else if (b.state==='wall_kick'||b.state==='jump') inp.j=true; }
  for (const e of [56.2, 75.4]) if (c>e&&c<e+0.6&&ground(b)) inp.j=true;
  if (c>63 && c<73.5) inp.dn=(f%40<2);
  if (c>90 && c<92.7 && Math.abs(b.y-120)<0.5) { inp.d = b.state==='dash' || !mem.prevD; if (c>92.0) inp.j=true; }
  if (mem.prevJ && inp.j && ground(b)) inp.j=false;
  mem.prevJ=!!inp.j; mem.prevD=!!inp.d; return inp;
}
function haisuiBot(G,b,f,mem){
  const c=b.x/T, inp={r:true}, [f1,f2]=G.floods;
  if (b.state==='jump') inp.j=true;
  // 増水：水が上がる前に高い足場へ・水が引いたら次へ
  const plats=[[17,19],[24,26],[31,33],[88,90],[95,97]];
  const fl = c<40 ? f1 : f2, inZone = (c>13.5&&c<37)||(c>84.5&&c<101);
  const onPlat = Math.abs(b.y-160)<0.5;
  if (inZone || (c>12 && c<14) || (c>83 && c<85)) {
    const safeLeft = G.live(fl) ? 0 : G.left(fl);
    if (onPlat) { if (G.live(fl) || safeLeft < 110) inp.r=false; else { const p=plats.find(p=>c>=p[0]&&c<=p[1]+1); if (p && c>p[1]+0.3 ) inp.j=true; } }
    else if (b.y<=80.5 && ground(b)) {
      const next=plats.find(p=>p[0]-c>-0.5 && p[0]-c<6); 
      if (!inZone && (G.live(fl) || safeLeft<125)) inp.r=false;
      else if (next && next[0]-c<1.6) inp.j=true;
    }
  }
  if (c>42 && c<46.5 && b.y<320) { if (ground(b)) inp.j=true; else if (b.state==='wall_slide') inp.j=(f%2===0); else if (b.state==='wall_kick'||b.state==='jump') inp.j=true; }
  if (c>50 && c<55.6 && b.y>=79 && b.y<81) { inp.d = b.state==='dash' || !mem.prevD; if (c>54.4) inp.j=true; }
  if ((b.state==='jump'||b.state==='fall') && b.dashJump) { inp.d=true; inp.j=true; }
  if (c>67 && c<81) inp.dn=(f%40<2);
  if (mem.prevJ && inp.j && (ground(b)||onPlat)) inp.j=false;
  mem.prevJ=!!inp.j; mem.prevD=!!inp.d; return inp;
}

  for (const [id, bot, boss, sec] of [['okujo', okujoBot, 'kazegiri', 40], ['haisui', haisuiBot, 'dakuryu', 60]]) {
    const K = ctx.RunnerHardStages[id], KR = K.rows();
    t(`${K.name}：14 行で幅がそろう・始まりと戸・ボスの表とつながる・ボスの部屋は平らで 1 画面ほど`, () => {
      assert.equal(KR.length, 14); assert.ok(KR.every(r => r.length === KR[0].length)); assert.ok(KR.some(r => r.includes('S')) && KR.some(r => r.includes('G')));
      const A = K.arena(), d = ctx.RunnerBosses.BOSSES.find(b => b.id === A.boss); assert.ok(d && ctx.RunnerHardStages[d.stage] === K && d.id === boss);
      const map = RA.makeMap(KR.map(r => r.replace(/[SCG]/g, '.'))); for (let c = A.c0; c <= A.c1; c++) { assert.ok(map.solid(c, 1) && !map.solid(c, 2) && !map.solid(c, 3), `床 ${c}`); }
      assert.ok(A.c1 - A.c0 + 1 >= 13 && A.c1 - A.c0 + 1 <= 16);
    });
    t(`${K.name}：通れる（自動操作で、始まりからボスの部屋まで。仕掛けにも とげにも当たらずに）`, () => {
      const r = runStage(id, bot, 60 * 120); assert.ok(r.ok, `届かなかった：${r.x} ${r.y}`); assert.equal(r.hurt, 0); assert.ok(r.f / 60 < sec, `${(r.f / 60).toFixed(1)} 秒`);
    });
  }
  t('仕掛けの意味：向かい風の間は、屋上の広いすき間をダッシュジャンプでも越えられない（止むのを待つ）', () => {
    const K = ctx.RunnerHardStages.okujo, map = RA.makeMap(K.rows().map(r => r.replace(/[SCG]/g, '.'))), G = ctx.RunnerGimmicks.make(map, K.gimmicks()), A = RA.make({ map });
    const w = G.winds[0]; assert.ok(G.live(w)); const b = A.body(27.6 * T, 160, 1), mem = {};
    for (let f = 0; f < 200; f++) { const c = b.x / T, inp = { r: true, d: b.state === 'dash' || !mem.d }; if (c > 29.9 || b.state === 'jump' || b.state === 'fall') { inp.j = true; inp.d = true; } mem.d = inp.d; A.step(b, inp); G.step(b, A.box(b)); if (b.y < 120) break; }
    assert.ok(b.y < 120, '向かい風でも届いてしまう');
  });
  t('仕掛けの意味：増水の間は通りに立っていると やられ・高い足場（160）には水が届かない', () => {
    const K = ctx.RunnerHardStages.haisui, map = RA.makeMap(K.rows().map(r => r.replace(/[SCG]/g, '.'))), G = ctx.RunnerGimmicks.make(map, K.gimmicks());
    const fl = G.floods[0]; for (let f = 0; f < 80; f++) G.step(null, null); assert.ok(G.live(fl) && G.level(fl) > 50);
    assert.ok(G.shock({ x0: 20 * T, x1: 20 * T + 14, y0: 80, y1: 128 }), '通りは浸かる'); assert.ok(!G.shock({ x0: 18 * T, x1: 18 * T + 14, y0: 160, y1: 208 }), '足場は浸からない');
    for (let f = 0; f < 200; f++) G.step(null, null); assert.ok(!G.live(fl)); assert.ok(!G.shock({ x0: 20 * T, x1: 20 * T + 14, y0: 80, y1: 128 }), '引くと立てる');
  });
}

console.log(`runner-hard-stage: ${n} ok`);
