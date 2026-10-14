// 異形のデータ（ENEMY_AI_SPEC §1・§2・§4）。数値は初期案。時間は秒（世界の時間＝スローの影響を受ける）。
export const ENEMIES = {
  kiro: {
    name: '帰路', hp: 40,
    speed: { walk: 1.4, angry: 3.5, search: 2.0 },
    cause: { body: 0.3, memory: 0.8, env: 0.5 },
    senses: { fov: 100, sight: 12, sightDark: 7, hear: { gun: 25, run: 6, walk: 2 }, memory: 8 },
    assess: [0.5, 1.5],
    loop: { kind: 'path', actions: ['walk', 'knock', 'wait'], knock: 3.2, wait: 1.6 },
    misread: { when: 'opened_own_door', as: 'family', effect: 'follow' },
    protect: { target: 'own_path', reaction: 'shove', block: 1.6 },
    attacks: {
      shove: { windup: 0.62, active: 0.12, recover: 0.7, dmg: 12, range: 1.7, arc: 90, parryable: true, sound: 'kiro_shove' },
      grab: { windup: 0.95, active: 0.16, recover: 1.1, dmg: 22, range: 1.9, arc: 70, parryable: false, grab: true, sound: 'kiro_grab' },
    },
    pattern: ['shove', 'shove', 'grab'],
    cooldown: 0.9,
    stagger: { parried: 0.9, hit: 0.25 },
    resolve: { rescue: 'unlock_home_door', neutralize: 'barricade_path', escape: true, kill: true },
    weak: { part: 'head', mul: 2.5 },
    poise: 30,
  },
  heiten: {
    name: '閉店', hp: 140,
    speed: { walk: 1.1, angry: 2.6 },
    cause: { body: 0.5, memory: 0.9, env: 0.6 },
    senses: { fov: 120, sight: 10, sightDark: 8, hear: { gun: 25, run: 5, walk: 2 }, memory: 6 },
    assess: [0.6, 1.0],
    // 閉店の手順（輪）。順番どおりに手伝うと「救う」
    loop: { kind: 'routine', steps: [
      { id: 'lights', label: '明かりを消す', dur: 4.0 },
      { id: 'register', label: 'レジを締める', dur: 4.5 },
      { id: 'shutter', label: 'シャッターを下ろす', dur: 5.0, closing: true },
      { id: 'bow', label: '「本日は閉店しました」', dur: 3.0, closing: true },
    ] },
    help: ['lights', 'register', 'sign'],
    misread: { when: 'inside_shop', as: 'customer', effect: 'evict_after_closing' },
    protect: { target: 'shop', reaction: 'evict' },
    attacks: {
      jab: { windup: 0.5, active: 0.12, recover: 0.6, dmg: 14, range: 2.2, arc: 80, parryable: true, sound: 'heiten_jab' },
      shelf: { windup: 0.75, active: 0.16, recover: 0.9, dmg: 18, range: 2.6, arc: 110, parryable: true, sound: 'heiten_shelf' },
      shutter: { windup: 1.1, active: 0.2, recover: 1.3, dmg: 28, range: 3.4, arc: 140, parryable: false, sound: 'heiten_shutter' },
    },
    pattern: ['jab', 'shelf', 'jab', 'shutter'],
    cooldown: 0.8,
    stagger: { parried: 0.9, hit: 0.12 },
    calm: 4.0,
    resolve: { rescue: 'help_closing', neutralize: 'cut_shutter_power', escape: true, kill: true },
    weak: { part: 'register', mul: 2.5 },
    poise: 60,
  },
  // 収容者（避難所の個体）【仮】：ENEMY_AI_SPEC §2.5 の収容者を第2章の避難所に置いた版（本来は第5章・旧研究棟）。
  // 輪：点呼（番号を呼び、ベッドへ戻そうとする）。守る：収容の規則。救う：本人の名前を点呼で呼ぶ（名簿の照合で分かる）。
  // 無力化：突進を器具庫へ誘い、シャッターを下ろす。倒す：体力 0。段階：照明が落ちる（6 割）・必死（2.5 割）。
  shuuyou: {
    name: '収容者', hp: 640, provisional: true,
    speed: { walk: 1.1, angry: 2.1, charge: 8.5 },
    cause: { body: 0.9, memory: 0.6, env: 0.7 },
    senses: { fov: 140, sight: 22, sightDark: 14, hear: { gun: 30, run: 14, walk: 6 }, memory: 30 },
    assess: [0.6, 0.9],
    attacks: {
      sweep: { windup: 0.8, active: 0.16, recover: 0.9, dmg: 18, range: 3.6, arc: 150, parryable: true },
      slam: { windup: 1.15, active: 0.2, recover: 1.4, dmg: 30, range: 3.2, arc: 360, parryable: false, aoe: { r: 2.5, ahead: 1.5 } },
      charge: { windup: 1.0, active: 1.15, recover: 1.7, dmg: 26, range: 9, arc: 40, parryable: false, dash: true },
      blanket: { windup: 0.95, active: 0.2, recover: 0.8, dmg: 12, range: 11, arc: 60, parryable: false, ranged: true, aoe: { r: 1.9, delay: 0.9 } },
      grab: { windup: 1.0, active: 0.2, recover: 1.1, dmg: 22, range: 2.4, arc: 70, parryable: false, grab: true },
    },
    phases: [
      { at: 1.0, pattern: ['sweep', 'sweep', 'slam', 'charge'], cooldown: 1.25 },
      { at: 0.6, pattern: ['sweep', 'blanket', 'charge', 'slam', 'sweep'], cooldown: 0.95 },
      { at: 0.25, pattern: ['slam', 'sweep', 'charge', 'sweep', 'grab'], cooldown: 0.7 },
    ],
    pattern: ['sweep', 'sweep', 'slam', 'charge'],
    cooldown: 1.25,
    rollcall: { every: 20, dur: 6.5, first: 6 },
    stagger: { parried: 1.0, hit: 0.15, broken: 3.0 },
    downState: 'down',
    poise: 200, poiseMul: 0.5,
    stuck: 5.0,
    resolve: { rescue: 'call_name_at_rollcall', neutralize: 'shut_in_storage', escape: false, kill: true },
    weak: { part: 'speaker', mul: 2.5 },
  },
  // ── 第3章【仮】──────────────────────────────────────────────
  // 記録のない患者（病院の異形・静養の仲間）：カルテに名前の無い患者。点滴の柱を引きずり、自分の記録を探して受付と病室を往復する。
  // 輪：病室 ⇄ 受付。取り違え：白衣の名札を着けた者を「看護の人」とみなす（攻めない・声をかけると病室へ戻って眠る＝救う）。
  // 無力化：病棟の照明を落とす（眠る）。攻め：点滴の管（白・弾ける）・すがりつき（赤・つかみ）。
  kanja: {
    name: '記録のない患者', hp: 46, provisional: true,
    speed: { walk: 0.9, angry: 2.9 },
    cause: { body: 0.4, memory: 0.6, env: 0.8 },
    senses: { fov: 110, sight: 9, sightDark: 4.5, hear: { gun: 22, run: 7, walk: 2 }, memory: 7 },
    assess: [0.7, 1.4],
    attacks: {
      tube: { windup: 0.7, active: 0.14, recover: 0.75, dmg: 12, range: 2.2, arc: 100, parryable: true },
      clutch: { windup: 1.0, active: 0.16, recover: 1.0, dmg: 18, range: 1.7, arc: 70, parryable: false, grab: true },
    },
    pattern: ['tube', 'tube', 'clutch'],
    cooldown: 1.0,
    stagger: { parried: 1.0, hit: 0.3 },
    resolve: { rescue: 'nurse_call_out', neutralize: 'ward_lights_off', escape: true, kill: true },
    weak: { part: 'drip', mul: 2.5 },
    poise: 26,
  },
  // 模倣する影（模倣者・ミミック）：人の真似をする影。見舞い客や（相棒）に化けて呼ぶ。近づくと崩れて影になる（0.9 秒の予兆）。
  // 攻めは「だんのうらの直前の動き」を写す（mimicPlan）：斬り続けると連撃・避け続けると突き・撃つと影の弾・弾くとつかみ。
  // 見分け方（公平の約束）：足元に影が無い・瞬きしない・懐中電灯を当てると目が紫に光る・ミニマップの本物の（相棒）の点は別の所。
  mimic: {
    name: '模倣する影', hp: 54, provisional: true,
    speed: { walk: 1.2, angry: 3.6 },
    cause: { body: 0.5, memory: 0.7, env: 0.3 },
    senses: { fov: 140, sight: 13, sightDark: 9, hear: { gun: 25, run: 8, walk: 3 }, memory: 10 },
    revealDist: 3.0, revealT: 0.9, leash: 16,
    attacks: {
      mslash: { windup: 0.55, active: 0.12, recover: 0.45, dmg: 10, range: 2.0, arc: 110, parryable: true, next: 0.34 },
      mlunge: { windup: 0.8, active: 0.5, recover: 0.9, dmg: 16, range: 6.5, arc: 40, parryable: false, dash: true },
      mshot: { windup: 0.75, active: 0.1, recover: 0.7, dmg: 12, range: 13, arc: 30, parryable: false, ranged: true, aoe: { r: 1.3, delay: 0.45 } },
      mgrab: { windup: 1.0, active: 0.16, recover: 1.0, dmg: 16, range: 1.8, arc: 70, parryable: false, grab: true },
    },
    pattern: ['mslash'],
    cooldown: 0.9,
    stagger: { parried: 0.9, hit: 0.25, broken: 1.6 },
    speedDash: 9.0,
    resolve: { rescue: 'play_original_voice', neutralize: false, escape: true, kill: true },
    poise: 34,
  },
  // 写し身（第3章のボス・模倣する影の大きな個体）【仮】：地下通路の分かれ道に溜まった影。だんのうらの姿を写し、動きを写す。
  // 段階：①写す（体力 100%〜60%）→ 転機（無敵：ゲーム側で構えを選ぶ）→ ②写す＋影の波・「呼び声」（子どもの母の声を真似て止まる）。
  // 救う：呼び声の間に「本当の声」（子ども用の携帯の留守電・任意の手掛かり）を聞かせる。倒す。
  utsushimi: {
    name: '写し身', hp: 760, provisional: true,
    speed: { walk: 1.4, angry: 2.6 },
    cause: { body: 0.6, memory: 0.9, env: 0.6 },
    senses: { fov: 360, sight: 30, sightDark: 30, hear: { gun: 40, run: 30, walk: 30 }, memory: 60 },
    revealDist: 0, revealT: 0,
    attacks: {
      mslash: { windup: 0.6, active: 0.14, recover: 0.55, dmg: 14, range: 3.0, arc: 140, parryable: true, next: 0.36 },
      mlunge: { windup: 0.9, active: 0.6, recover: 1.1, dmg: 20, range: 9, arc: 40, parryable: false, dash: true },
      mshot: { windup: 0.8, active: 0.1, recover: 0.8, dmg: 14, range: 16, arc: 40, parryable: false, ranged: true, aoe: { r: 1.6, delay: 0.5 }, volley: 3 },
      mgrab: { windup: 1.05, active: 0.2, recover: 1.1, dmg: 20, range: 2.6, arc: 80, parryable: false, grab: true },
      mwave: { windup: 1.2, active: 0.2, recover: 1.3, dmg: 22, range: 3.6, arc: 360, parryable: false, aoe: { r: 3.6, ahead: 0 } },
    },
    pattern: ['mslash'],
    cooldown: 1.15,
    phases: [{ at: 1.0, cooldown: 1.15, every: 0 }, { at: 0.6, cooldown: 0.9, every: 3 }],
    tenkiAt: 0.6,
    voice: { every: 16, dur: 5.0, first: 7, dmgMul: 1.5 },
    stagger: { parried: 1.0, hit: 0.12, broken: 2.6 },
    downState: 'down',
    speedDash: 10.5,
    poise: 180, poiseMul: 0.55,
    assist: { hpCut: 0.25, slow: 1.25 },
    resolve: { rescue: 'play_memo_at_voice', neutralize: false, escape: false, kill: true },
  },
  // 守り手（病室の大きな「記録のない患者」）【仮】：子どものベッドの前から動かない。近づくと押し返す（弱い・白）。
  // 本当は外の模倣する影から子どもを守っていた（第3章の山場：見た目だけで決めつけない）。攻め続けると倒れる（結果が変わる）。
  mamori: {
    name: '守り手', hp: 300, provisional: true,
    speed: { walk: 0.6, angry: 1.2 },
    cause: { body: 0.7, memory: 0.9, env: 0.6 },
    senses: { fov: 200, sight: 9, sightDark: 9, hear: { gun: 20, run: 8, walk: 4 }, memory: 10 },
    attacks: {
      push: { windup: 0.85, active: 0.14, recover: 0.9, dmg: 7, range: 2.3, arc: 120, parryable: true },
      guard: { windup: 0.5, active: 0.3, recover: 0.6, dmg: 26, range: 3.2, arc: 160, parryable: false },
    },
    pattern: ['push'], cooldown: 1.6,
    keep: 1.9,
    stagger: { parried: 0.8, hit: 0.1 },
    poise: 400, poiseMul: 0.3,
    resolve: { rescue: 'protect_child_then_rest', neutralize: false, escape: false, kill: true },
  },
};
