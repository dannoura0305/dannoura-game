// 終章（A 崩れた町／B 記録の間）・結末（A 見舞い／B 信頼）・クリア後のデータ【すべて仮・provisional】。DOM なし（node のテストから読む）。
// 区画：reveal → abyss（崩れた町と境界の淵・巨大用：境界を喰らうもの）→ epilogue（病院の個室・自宅・商店街）。
//       secret → kiroku（記録の間・人の大きさ：研究者）→ epilogue。
// 研究者は名前を出さない（九条とは別人・関係は伏せる）。配偶者に似た異形は戦わない・本人かは決めない（STORY_BIBLE §5・§9）。
// 娘は結末の家の場面でだけ姿を見せる（安全な所で再会。危ない所には出てこない）。名前・数値・台詞はすべて仮。

// ───────────────────────── 終章A（reveal）：崩れた町と境界の淵 ─────────────────────────
export const ABYSS = {
  provisional: true,
  humanStart: [0, 46, Math.PI],            // 人の大きさ（白い姿）で南から入る
  phone: [7.4, 38.0],                      // 公衆電話（最終戦の前のセーブ地点・道の右わき）
  edge: [0, 16.0],                         // 淵を見下ろす坂の上：ここで「巨大猫又になる」
  giantStart: [0, 22, Math.PI],
  boss: { id: 'kuramono', pos: [0, -30] },
  pit: { x: 0, z: -34, r: 22 },             // 境界の淵（底が見えない）
  /** 避難の灯（人が残っている所）：「喰らう」はここを狙う。線の間に立つか、咆哮で止める */
  refuges: [
    { id: 'S', name: '小学校の体育館（仮）', pos: [-36, 6], hp: 100 },
    { id: 'H', name: '病院の屋上（仮）', pos: [34, 22], hp: 100 },
    { id: 'M', name: '商店街の南口（仮）', pos: [-24, 40], hp: 100 },
  ],
  /** 町の人と（相棒）の支え（体力 66% の演出）の後：「喰らう」の当たりが半分（灯りが守る） */
  supportFeedMul: 0.5,
};
/** 「喰らう」の先：まだ残っている灯のうち、順番に（決まった並び。同じ戦いなら同じ順） */
export function refugeTarget(hp, turn, list = ABYSS.refuges) {
  const alive = list.filter(r => (hp[r.id] ?? r.hp) > 10);
  const L = alive.length ? alive : list;
  return L[turn % L.length];
}

// ───────────────────────── 終章B（secret）：記録の間 ─────────────────────────
export const KIROKU = {
  provisional: true,
  spawn: [0, 11.0, Math.PI],               // 中央管理棟の制御室の奥の通路から
  phone: [1.7, 9.6],                       // 内線電話（最終戦の前のセーブ地点）
  enter: 3.6,                              // z がこれより奥で、研究者との場面
  boss: { id: 'kenkyusha', pos: [0, -4.6] },
  companionAt: [-2.2, 4.4],                // （相棒）は入口の操作卓の陰
  center: [0, -7], r: 12.5,
  /** 記録装置（オープンリール）3 台。書き込み中（赤）に電源を落とすと記録が壊れる → 待機（緑）の時に止める（保全の手順） */
  decks: [
    { id: 'D1', name: '記録装置 1（西）', pos: [-9.6, -7.0], off: 0.0 },
    { id: 'D2', name: '記録装置 2（北）', pos: [0, -18.4], off: 2.3 },
    { id: 'D3', name: '記録装置 3（東）', pos: [9.6, -7.0], off: 4.6 },
  ],
  cycle: { write: 4.0, idle: 3.0 },        // 秒：書き込み中 → 待機 のくり返し
  floor: 0.25,                             // 記録装置が 1 台でも動いている間は、体力がここより減らない（巻き戻される）
  shieldMul: 0.6,                          // 動いている間の傷の通り（記録が傷を巻き戻す）
  spouseAt: [2.8, -15.0],                  // 配偶者に似た異形（記録の中の人影）。戦わない
};
/** 記録装置の灯：t 秒のとき 'write'（書き込み中・赤）か 'idle'（待機・緑） */
export function deckLamp(t, deck, C = KIROKU.cycle) {
  const T = C.write + C.idle, k = (((t + (deck.off || 0)) % T) + T) % T;
  return k < C.write ? 'write' : 'idle';
}
/** 記録装置を止められるか。戻り { ok, why:''|'writing'|'done' } */
export function stopDeck(stopped, deck, t) {
  if (stopped.includes(deck.id)) return { ok: false, why: 'done' };
  if (deckLamp(t, deck) === 'write') return { ok: false, why: 'writing' };
  return { ok: true, why: '' };
}

// ───────────────────────── 資料（任意） ─────────────────────────
export const DOCS7 = {
  spouse7a: { id: 'doc_spouse_a', title: '淵の縁の名札（仮）', text: '焼けた名札。研究所の職員証。名前の所だけが、紫の光で読めない。裏に手書きで「延期しましょう。急ぐ理由は、私たちの側にしかない」。' },
  spouse7b: { id: 'doc_spouse_b', title: '記録の間の最後の一コマ（仮）', text: '再生の止まった画面。ガラスの向こうの人影が、こちらを——研究者の方を見ている。誰なのかは、記録には残っていない。' },
  reel7: { id: 'doc_reel', title: '記録装置の札（仮）', text: '「書き込み中は電源を切らないこと（記録が壊れます）。止める時は待機の灯（緑）を確かめてから」。' },
};

// ───────────────────────── 結末・エピローグ ─────────────────────────
export const EPILOGUE = {
  provisional: true,
  // 区画 epilogue の中の 4 つの場面（離して置く）。x の中心
  hospital: { x: -40, bed: [-41.6, -1.0], dan: [-40.0, -0.2], window: [-40, -3.4] },
  home: { x: 0, door: [0, 3.2], dan: [0, 1.6], child: [0, -1.6], chiyo: [-1.4, 2.6] },
  street: { x: 40, dan: [39.5, 6.0], companion: [40.7, 6.2] },
  refugeRoof: { id: 'H', pos: [33.9, 22.0], y: 24.1 },      // 終章A：（相棒）は病院の屋上（灯りを持った人たちと）
  corridor: { x: 80 },
};
/** 結末の ID（ROUTE_BRANCH_SPEC §6）。本編の 9 種とは別（本編の一覧に足さない） */
export const ENDINGS = {
  end_reveal: { id: 'end_reveal', route: 'reveal', title: '結末A　見舞い', gallery: 'g_end_reveal' },
  end_secret: { id: 'end_secret', route: 'secret', title: '結末B　信頼', gallery: 'g_end_secret' },
};
export function endingOf(route) { return route === 'reveal' ? 'end_reveal' : route === 'secret' ? 'end_secret' : null; }
/** ギャラリー（本作の中だけ・自分のセーブだけ）。both：両方の結末を見たあとの対比の場面 */
export const GALLERY = [
  { id: 'g_end_reveal', title: '結末A　見舞い', need: ['end_reveal'] },
  { id: 'g_end_secret', title: '結末B　信頼', need: ['end_secret'] },
  { id: 'g_both_routes', title: '対比（同じ廊下）', need: ['end_reveal', 'end_secret'] },
];
export function galleryUnlocked(endings) { const seen = Object.keys(endings || {}).filter(k => endings[k]); return GALLERY.filter(g => g.need.every(n => seen.includes(n))).map(g => g.id); }

/** 章選択（クリア後）：タイトルの「章選択」。step は飛び先の段。route があるものは分岐の後 */
export const CHAPTER_SELECT = [
  { id: 'prologue', title: '序章　閉店時間', step: null },
  { id: 'ch1', title: '第1章　帰路', step: 'ch1_katana' },
  { id: 'ch2', title: '第2章　静養', step: 'ch2_shelter' },
  { id: 'ch3', title: '第3章　見た目', step: 'ch3_lobby' },
  { id: 'ch4', title: '第4章　境界の夜（分岐）', step: 'ch4_office' },
  { id: 'ch5a', title: '第5章A　侵食', step: 'ch5_r_enter', route: 'reveal' },
  { id: 'ch6a', title: '第6章A　巨躯', step: 'ch6a_rampage', route: 'reveal' },
  { id: 'ch7a', title: '終章A　崩れた町', step: 'ch7a_edge', route: 'reveal' },
  { id: 'ch5b', title: '第5章B　秘匿', step: 'ch5_s_enter', route: 'secret' },
  { id: 'ch6b', title: '第6章B　制御', step: 'ch6_s_enter', route: 'secret' },
  { id: 'ch7b', title: '終章B　記録の間', step: 'ch7b_enter', route: 'secret' },
];
/** 章選択で選べる章：結末を 1 つでも見たら全部。それまでは記録にある章（chaptersCleared）と序章 */
export function selectableChapters(own) {
  const ends = Object.keys((own && own.endings) || {}).filter(k => own.endings[k]);
  if (ends.length) return CHAPTER_SELECT.map(c => c.id);
  const done = ((own && own.chaptersCleared) || []).map(s => String(s).replace(/_slice$/, ''));
  return CHAPTER_SELECT.filter(c => c.id === 'prologue' || done.includes(c.id)).map(c => c.id);
}

/** 引き継ぎ（New Game+・仮）：装備・回復の道具・弾。武器・形態は物語で手に入れ直す（分岐の決まりを壊さない） */
export function carryFrom(slot) {
  const pl = (slot && slot.player) || {};
  return {
    equip: ((pl.equip || {}).owned || []).slice(),
    items: (pl.items || []).filter(it => ['medkit_s', 'medkit_l', 'coffee'].includes(it.id)).map(it => ({ id: it.id, n: Math.min(9, it.n) })),
    ammo: Math.min(120, ((pl.ammo || {}).handgun) || 0),
  };
}

/** スタッフロール（すべて仮。名前の決まっていない人物は「名前未定」） */
export const CREDITS = {
  provisional: true,
  lines: [
    ['h', '境界侵食（仮題）'],
    ['s', '出演（字幕のみ・声なし）'],
    ['p', 'だんのうら'], ['p', '（相棒）　名前未定'], ['p', '研究者　名前未定'], ['p', 'だんのうらの娘'], ['p', '千代さん（お隣）'], ['p', 'あけぼの通り商店街のみなさん（仮）'],
    ['s', '異形'],
    ['p', '帰路・閉店・収容者・記録のない患者・模倣する影・写し身・応答体・継接・待人・当直・塗替・境界の先触れ・境界を喰らうもの（名前はすべて仮）'],
    ['s', '原案'], ['p', '『だんのうら』本編'],
    ['s', '制作（仮）'], ['p', '企画・物語・設定　だんのうら制作チーム（仮）'], ['p', 'プログラム・3D・演出・音　だんのうら制作チーム（仮）'],
    ['s', '使わせてもらったもの'], ['p', 'three.js（MIT License）'], ['p', 'three-vrm（MIT License）'],
    ['s', ''], ['p', '名前・表記はすべて仮です。'], ['p', '本編・境界事象・トビネズミを遊ばなくても、この物語は終わります。'],
    ['h', 'おしまい'],
  ],
  sec: 34,                                  // 流れる時間（長押し・ボタンで飛ばせる）
};
