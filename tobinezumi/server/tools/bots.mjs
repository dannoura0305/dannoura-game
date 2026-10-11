// tobinezumi/server/tools/bots.mjs — 頭の無いボットを N 体つないで負荷を見る（PROTOCOL.md どおりに話す）
//
//   npm run bots -- 10                       … 10 体（http://localhost:8080 のサーバーへ）
//   npm run bots -- 20 --url ws://host:8080/ws --secs 120 --prefix bot
//
// 各ボット：登録（あればログイン）→ キャラ作成 → 地上へ → うろうろ跳ねる・ときどき大ジャンプ・チャット・
// 近くの採集物を拾いに行く・公開の巣があれば入って少し歩いて出る。終わると 1 体ずつの統計を出す。
import { ProtoClient, fieldMap } from './proto-client.mjs';
import { FUR_IDS } from '../../shared/protocol.js';
import { CELL } from '../../shared/nest-rules.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const N = parseInt(args.find(a => /^\d+$/.test(a)) || opt('n', '10'), 10);
const URL_ = opt('url', 'ws://localhost:8080/ws');
const SECS = parseFloat(opt('secs', '60'));
const PREFIX = opt('prefix', 'bot');
const PASS = opt('pass', 'bot-password-1');
const QUIET = args.includes('--quiet');
const LINES = ['ぴょん', 'こんにちは', '種あった！', 'いい風', 'だれか巣を見せて〜', 'ここ砂がやわらかい', 'じゃんぷ！'];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);

async function runBot(i, stats) {
  const c = new ProtoClient(URL_);
  const s = { name: PREFIX + i, picks: 0, pickFail: 0, chats: 0, jumps: 0, nests: 0, errors: 0, snaps: 0, maxGapMs: 0, corrections: 0, resGone: 0 };
  stats.push(s);
  await c.connect();
  const world = await c.enter(`${PREFIX}${i}`, PASS, { name: `ボット${i}`, fur: FUR_IDS[i % FUR_IDS.length] });
  const res = new Map(world.resources.map(r => [r.id, r]));
  const entrances = new Map(world.entrances.map(e => [e.owner, e]));
  c.on('res_gone', m => { res.delete(m.id); s.resGone++; });
  c.on('res_spawn', m => res.set(m.res.id, m.res));
  c.on('entrance', m => entrances.set(m.entrance.owner, { ...m.entrance, policy: String(m.entrance.name).startsWith('ボット') ? 'public' : m.entrance.policy }));
  let lastSnapAt = 0;
  c.on('snapshot', m => {
    const t = Date.now();
    if (lastSnapAt) s.maxGapMs = Math.max(s.maxGapMs, t - lastSnapAt);
    lastSnapAt = t; s.snaps++;
    // 予測との差（同じ入力を当てているので、ack 時点では一致するはず）
    if (m.ack === c.seq && Math.hypot(m.you.x - c.st.x, m.you.y - c.st.y) > 0.01) { s.corrections++; c.st = { ...m.you }; }
  });
  c.on('close', () => { if (!c.stopping) s.errors++; });

  const end = Date.now() + SECS * 1000;
  let mx = 0, my = 0, until = 0, target = null, chatAt = Date.now() + rnd(3000, 15000), nestAt = Date.now() + rnd(12000, 30000);
  // 3 体に 1 体は自分の巣穴を掘って公開する（ほかのボットが訪ねてくる）
  let hasNest = !!world.you.nest, digAt = i % 3 === 1 ? Date.now() + rnd(2000, 6000) : Infinity;
  while (Date.now() < end && !c.closed) {
    const t = Date.now();
    // 3 フレームぶん（50ms）の入力をまとめて送る
    if (target) {
      const dx = target.x - c.st.x, dy = target.y - c.st.y;
      mx = Math.abs(dx) > 3 ? Math.sign(dx) : 0; my = Math.abs(dy) > 3 ? Math.sign(dy) : 0;
      if (Math.hypot(dx, dy) < 14 || t > until) {
        if (Math.hypot(dx, dy) < 26 && target.id && res.has(target.id)) {
          const r = await c.req('pickup', { resId: target.id });
          if (r.ok) s.picks++; else s.pickFail++;
        }
        target = null; until = t + rnd(500, 1500);
      }
    } else if (t > until) {
      until = t + rnd(400, 2000);
      if (Math.random() < 0.35) {      // 近くの採集物へ
        let best = null, bd = 160;
        for (const r of res.values()) { const d = Math.hypot(r.x - c.st.x, r.y - c.st.y); if (d < bd) { bd = d; best = r; } }
        if (best) { target = best; until = t + 6000; }
      }
      if (!target) { mx = Math.floor(Math.random() * 3) - 1; my = Math.floor(Math.random() * 3) - 1; }
    }
    const jump = Math.random() < 0.02;
    if (jump) s.jumps++;
    c.inputs([{ mx, my, jump }, { mx, my }, { mx, my }]);
    if (!hasNest && t > digAt) {
      digAt = t + 2500;
      const d = await c.req('dig_burrow', { x: c.st.x, y: c.st.y });
      if (d.ok) { hasNest = true; s.dug = 1; entrances.set(d.entrance.owner, { ...d.entrance, policy: 'public' }); await c.req('visit_policy', { policy: 'public' }); }
    }
    if (t > chatAt) { chatAt = t + rnd(8000, 25000); c.send({ t: 'chat', text: LINES[Math.floor(Math.random() * LINES.length)] }); s.chats++; }
    if (t > nestAt) {
      nestAt = t + rnd(20000, 45000);
      const pub = [...entrances.values()].filter(e => e.policy === 'public' || e.own).sort((a, b) => Math.hypot(a.x - c.st.x, a.y - c.st.y) - Math.hypot(b.x - c.st.x, b.y - c.st.y))[0];
      if (pub) {
        // 入口まで歩く
        const go = Date.now() + 9000;
        while (Date.now() < go && Math.hypot(pub.x - c.st.x, pub.y - c.st.y) > 20) {
          const dx = pub.x - c.st.x, dy = pub.y - c.st.y;
          c.inputs(new Array(3).fill({ mx: Math.abs(dx) > 3 ? Math.sign(dx) : 0, my: Math.abs(dy) > 3 ? Math.sign(dy) : 0 }));
          await sleep(50);
        }
        const e = await c.req('enter_nest', { owner: pub.owner });
        if (!e.ok) s.nestFail = (s.nestFail || 0) + 1;
        if (e.ok) {
          s.nests++;
          const d = e.nest.data;
          for (let k = 0; k < 20; k++) { c.send({ t: 'nest_move', x: (d.entrance.x + Math.sin(k / 3) * 3) * CELL, y: (d.surfaceY + 7) * CELL, facing: k % 2 ? 1 : -1, anim: 'walk' }); await sleep(100); }
          if (Math.random() < 0.5) c.send({ t: 'chat', text: 'おじゃまします' });
          const l = await c.req('leave_nest');
          if (l.ok) { c.st = { ...c.st, x: l.x, y: l.y, jump: null }; await c.join(); }
          lastSnapAt = 0;   // 巣の中ではスナップショットが来ないので、間隔の計測をやり直す
        }
      }
    }
    await sleep(50);
  }
  s.snaps = c.snaps; s.kbIn = Math.round(c.bytesIn / 1024);
  c.stopping = true; c.close();
}

const stats = [];
const t0 = Date.now();
if (!QUIET) console.log(`[bots] ${N} 体 → ${URL_}（${SECS} 秒）`);
const all = [];
for (let i = 1; i <= N; i++) { all.push(runBot(i, stats).catch(e => { console.error(`[bots] ${PREFIX}${i}: ${e.message}`); const s = stats.find(x => x.name === PREFIX + i); if (s) s.errors++; })); await sleep(100); }
await Promise.all(all);
const sec = (Date.now() - t0) / 1000;
const sum = k => stats.reduce((a, s) => a + (s[k] || 0), 0);
const out = { bots: N, secs: Math.round(sec), picks: sum('picks'), pickFail: sum('pickFail'), chats: sum('chats'), jumps: sum('jumps'), burrows: sum('dug'), nestVisits: sum('nests'), nestRefused: sum('nestFail'),
  errors: sum('errors'), corrections: sum('corrections'), snapshotsPerBotPerSec: +(sum('snaps') / N / sec).toFixed(2), maxSnapshotGapMs: Math.max(0, ...stats.map(s => s.maxGapMs)), kbInPerBotPerSec: +(sum('kbIn') / N / sec).toFixed(2) };
console.log(JSON.stringify(out));
process.exit(out.errors ? 1 : 0);
void fieldMap;
