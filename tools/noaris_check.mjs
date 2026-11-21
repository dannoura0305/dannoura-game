// 境界ノアリス（試作）を本物のブラウザで遊び通して確かめる。
// 使い方：静的サーバーを立てて  node tools/noaris_check.mjs [--base http://localhost:8000] [--shots <フォルダ>]
// タイトル → はじめから → 名前 → 回廊（扉 5 つ・4 つは準備中）→ 白薔薇 → 選択 → セーブ → 外へ（GAME OVER）→ ループ → ロード → GOOD END
// → エンディング一覧・ギャラリー → 既読スキップ → 縦長の画面。ページのエラーが出ない・ほかの作品の保存に触らない
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'http://localhost:8000', SHOTS = arg('--shots');
let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log('✓ ' + name + (info ? '  ' + info : '')); } else { fail++; console.log('✗ ' + name + (info ? '  ' + info : '')); } };
const b = await chromium.launch();

for (const [label, vw, vh] of [['横長', 1280, 720], ['縦長', 420, 820]]) {
  const p = await b.newPage({ viewport: { width: vw, height: vh } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__NA_TEST__ = {}; });
  await p.goto(BASE + '/noaris.html'); await p.waitForTimeout(800);
  await p.evaluate(() => { localStorage.setItem('dannoura_save_v1', '"keep"'); });
  const S = () => p.evaluate(() => window.__NA_TEST__.s);
  await p.evaluate(() => { window.__NA_TEST__.settings.speed = 0; window.__NA_TEST__.settings.auto = 400; });
  const shot = async n => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/na_${vw}x${vh}_${n}.png` }); };
  // 文を送る：pred が真になるまで（選択肢・名前・扉・結末では止まる）
  const until = async (pred, max = 200) => { for (let i = 0; i < max; i++) { const s = await S(); if (pred(s)) return s; if (s.overlay || s.kind !== 'say') { await p.waitForTimeout(120); continue; } await p.click('.na-msg', { timeout: 800 }).catch(() => {}); await p.waitForTimeout(60); } return null; };

  ok(`${label}：タイトル（境界ノアリス・はじめから）`, (await S()).screen === 'title' && await p.isVisible('#na-new'));
  await shot('title');
  await p.click('#na-new'); await p.waitForTimeout(300);
  const nm = await until(s => s.overlay === 'name'); ok(`${label}：はじめから → 序章 → 名前の入力`, !!nm);
  await p.fill('#na-name-in', 'ノア'); await p.click('#na-name-ok'); await p.waitForTimeout(300);
  const ar = await until(s => s.overlay === 'areas'); ok(`${label}：回廊 → 扉の選択`, !!ar);
  const doors = await p.$$eval('.na-door', ds => ds.map(d => ({ id: d.dataset.area, locked: d.classList.contains('locked') })));
  ok(`${label}：扉は 5 つ・開くのは白薔薇の宮殿だけ（4 つは準備中）`, doors.length === 5 && doors.filter(d => !d.locked).map(d => d.id).join() === 'rose', JSON.stringify(doors));
  await shot('areas');
  await p.click('.na-door.locked'); await p.waitForTimeout(150); ok(`${label}：準備中の扉は開かない`, (await S()).overlay === 'areas');
  await p.click('[data-area=rose]'); await p.waitForTimeout(400);
  const s1 = await S(); ok(`${label}：白薔薇の宮殿へ（名前が入る）`, s1.scene === 'rose_00' && s1.player === 'ノア', JSON.stringify({ scene: s1.scene, player: s1.player }));
  await shot('rose');
  // 選択肢を文で選ぶ（次の選択肢まで送ってから）
  const pick = async (re, what) => { const c = await until(s => s.choices.length > 0); const i = c ? c.choices.findIndex(t => re.test(t)) : -1; if (i < 0) { ok(`${label}：選択肢「${what}」`, false, JSON.stringify(c && c.choices)); return null; } await p.click(`.na-choices button >> nth=${i}`); await p.waitForTimeout(250); return c; };
  const c1 = await until(s => s.choices.length > 0); ok(`${label}：選択肢 1（門で手を差し出される・3 つ）`, !!c1 && c1.choices.length === 3, JSON.stringify(c1 && c1.choices));
  await shot('choice');
  await pick(/手を取る/, '手を取る'); ok(`${label}：手を取る → 愛情 +2`, (await S()).vars.rose_love === 2);
  await pick(/どうして/, '掟の理由を聞く');
  await pick(/喜んで/, '明日も踊る');
  await pick(/数を数える/, '鐘を数える（第一夜）');
  await pick(/打ち明ける/, '同じ夜だと打ち明ける');
  await pick(/見送る/, '黒猫を見送る');
  const bell2 = await until(s => s.choices.length > 0); ok(`${label}：第二夜の零時の鐘（外へ出る選択がある）`, !!bell2 && bell2.choices.some(t => /外へ出て/.test(t)), JSON.stringify(bell2 && bell2.choices));
  // セーブ（1 番）
  await p.click('.na-quick [data-k=save]'); await p.waitForTimeout(200); await p.click('.na-slot[data-slot="0"]'); await p.waitForTimeout(200);
  const sv = (await S()).saves; ok(`${label}：セーブ 1 番（選択の前）`, !!sv.slots[0] && sv.slots[0].snap.pending && sv.slots[0].snap.pending.type === 'choice');
  await p.click('.na-close'); await p.waitForTimeout(150);
  // 外へ → GAME OVER（零時の鐘）→ ループ
  await pick(/外へ出て/, '外へ出る');
  const go = await until(s => s.overlay === 'gameover', 60); ok(`${label}：鐘の音の方へ出る → GAME OVER（零時の鐘）`, !!go && go.endings.includes('rose_go1') && go.loop === 1, JSON.stringify(go && { e: go.endings, l: go.loop }));
  await shot('gameover');
  await p.click('#na-end'); await p.waitForTimeout(1700);
  const lp = await until(s => s.text === '――また、ここから。', 10); ok(`${label}：ループ（幕間「――また、ここから。」）`, !!lp);
  await shot('loop');
  const ar2 = await until(s => s.overlay === 'areas'); ok(`${label}：ループ → 回廊にもどる（名前の入力は無い）`, !!ar2 && ar2.player === 'ノア');
  await p.click('[data-area=rose]'); await p.waitForTimeout(300);
  const back = await until(s => s.text === '――おかえり。', 12); ok(`${label}：二周目の第一声は「おかえり」`, !!back);
  // ロード → 西の塔 → GAME OVER（塔の花嫁）
  await p.click('.na-quick [data-k=load]'); await p.waitForTimeout(200); await p.click('.na-slot[data-slot="0"]'); await p.waitForTimeout(400);
  const ld = await S(); ok(`${label}：ロード → 第二夜の鐘から（愛情 5・意思 2）`, ld.choices.length >= 2 && ld.vars.rose_love === 5 && ld.vars.rose_will === 2, JSON.stringify({ c: ld.choices, v: ld.vars }));
  await pick(/数を数える/, '鐘を数える（第二夜）');
  await pick(/西の塔へ/, '西の塔へ');
  const go2 = await until(s => s.overlay === 'gameover', 60); ok(`${label}：西の塔 → GAME OVER（塔の花嫁・肖像画）`, !!go2 && go2.endings.includes('rose_go2') && go2.cgs.includes('rose_portraits') && go2.loop === 2, JSON.stringify(go2 && { e: go2.endings, l: go2.loop }));
  await shot('go2');
  await p.click('#na-end'); await p.waitForTimeout(1700);
  await until(s => s.overlay === 'areas'); await p.click('[data-area=rose]'); await p.waitForTimeout(300);
  // ロード → GOOD END
  await p.click('.na-quick [data-k=load]'); await p.waitForTimeout(200); await p.click('.na-slot[data-slot="0"]'); await p.waitForTimeout(400);
  await pick(/数を数える/, '鐘を数える（第二夜）');
  const tw = await until(s => s.choices.length > 0); ok(`${label}：塔を見た後は「もう一度、塔へ」に変わる`, !!tw && tw.choices.some(t => /もう一度、塔へ/.test(t)), JSON.stringify(tw && tw.choices));
  await pick(/尋ねる/, '塔のことを尋ねる');
  await pick(/触れずに/, '手袋に触れない');
  await pick(/数を数える/, '鐘を数える（第三夜）');
  ok(`${label}：手袋に触れない → 主が名を教える`, (await S()).vars.rose_name === 1);
  await pick(/失いたくない/, '失いたくない');
  await pick(/明日が見たい/, '明日が見たい');
  await pick(/数を数える/, '鐘を数える（第四夜）');
  await pick(/会いに来ます/, '明日も会いに来ます');
  const gd = await until(s => s.overlay === 'end', 60); ok(`${label}：「明日も、きっと会いに来ます」→ GOOD END（白薔薇の誓い）`, !!gd && gd.endings.includes('rose_good') && gd.cgs.includes('rose_vow'), JSON.stringify(gd && { e: gd.endings, v: gd.vars }));
  await shot('good');
  await p.click('#na-end'); await p.waitForTimeout(400);
  ok(`${label}：結末 → タイトル`, (await S()).screen === 'title');
  // エンディング一覧・ギャラリー
  await p.click('text=エンディング'); await p.waitForTimeout(200);
  const ends = await p.$$eval('.na-row', rs => rs.map(r => r.textContent));
  ok(`${label}：エンディング一覧（見た物は題・見ていない物は ？？？・正式とトゥルーの枠）`, ends.some(t => /白薔薇の誓い/.test(t)) && ends.some(t => /零時の鐘/.test(t)) && ends.some(t => /塔の花嫁/.test(t)) && ends.some(t => /トゥルーエンド.*？？？/.test(t)), JSON.stringify(ends));
  await shot('endings');
  await p.click('.na-close'); await p.waitForTimeout(150);
  await p.click('text=ギャラリー'); await p.waitForTimeout(200);
  ok(`${label}：ギャラリー（見た CG が開ける）`, await p.isVisible('text=夜明けの誓い（仮）'));
  await p.click('.na-close'); await p.waitForTimeout(150);
  // 既読スキップ：二周目の序章は既読 → スキップで名前の入力まで一気に進む
  await p.click('#na-new'); await p.waitForTimeout(300);
  await p.click('.na-quick [data-k=skip]'); const sk = await until(s => s.overlay === 'name', 20); ok(`${label}：既読スキップで名前の入力まで進む`, !!sk);
  await p.fill('#na-name-in', ''); await p.click('#na-name-ok'); await p.waitForTimeout(300);
  await p.click('.na-quick [data-k=skip]'); await p.waitForTimeout(100);   // スキップを止める
  await until(s => s.overlay === 'areas', 30); await p.click('[data-area=rose]'); await p.waitForTimeout(300);
  const dn = await until(s => s.kind === 'say' && s.name === '主人公', 30);
  ok(`${label}：名前が空なら「主人公」と呼ばれる（主人公の台詞の名札）`, !!dn && dn.player === '', JSON.stringify(dn && dn.text));
  await p.click('.na-quick [data-k=log]'); await p.waitForTimeout(200); ok(`${label}：ログが開く`, (await S()).overlay === 'log' && (await p.$$('#na-log div')).length > 3);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  ok(`${label}：ほかの作品の保存に触らない`, await p.evaluate(() => localStorage.getItem('dannoura_save_v1') === '"keep"'));
  ok(`${label}：ページのエラーが出ない`, errs.length === 0, JSON.stringify(errs.slice(0, 3)));
  await p.close();
}
await b.close();
console.log(`\n${pass}/${pass + fail} 合格`);
process.exit(fail ? 1 : 0);
