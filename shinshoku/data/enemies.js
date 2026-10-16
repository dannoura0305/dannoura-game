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
  // ── 第4章【仮】────────────────────────────────────────────
  // 応答体（研究施設の異形・境界応答の産物）：試験槽から出てきた被験者の「応答」だけが残った姿。白い体に配線と槽のガラスが食い込み、
  // 頭の上に応答灯（輪）が浮かぶ。習慣の輪：試験端末の呼び出しの音が鳴ると端末まで歩いて「応答」し、槽へ戻る（手順のくり返し）。
  // 共鳴：1 体が傷つくと近くの個体が同時に目を覚まし、予兆をそろえて攻めてくる（＝見切り→連鎖一閃の機会）。
  // 解決：救う＝試験端末で「試験終了の合図」を流す（手順書の手掛かり）／無力化＝鎮静の蒸気（弁）・鎮静の電源（配電盤）／倒す。
  outou: {
    name: '応答体', hp: 72, provisional: true,
    speed: { walk: 1.0, angry: 3.2 },
    cause: { body: 0.8, memory: 0.5, env: 0.9 },
    senses: { fov: 120, sight: 12, sightDark: 6, hear: { gun: 25, run: 9, walk: 3 }, memory: 9 },
    assess: [0.4, 0.9],
    attacks: {
      strike: { windup: 0.6, active: 0.14, recover: 0.6, dmg: 13, range: 2.3, arc: 110, parryable: true },
      cry: { windup: 1.1, active: 0.2, recover: 0.9, dmg: 16, range: 3.4, arc: 360, parryable: false, aoe: { r: 3.0, ahead: 0 } },
      pull: { windup: 0.95, active: 0.16, recover: 1.0, dmg: 18, range: 2.0, arc: 70, parryable: false, grab: true },
    },
    pattern: ['strike', 'strike', 'cry', 'strike', 'pull'],
    cooldown: 0.95,
    stagger: { parried: 1.0, hit: 0.25, broken: 1.8 },
    poise: 40,
    resonance: { r: 7.5 },
    sedate: { dur: 999 },
    resolve: { rescue: 'end_of_test_signal', neutralize: 'sedation_steam_or_power', escape: true, kill: true },
    weak: { part: 'ring', mul: 2.5 },
  },
  // 境界の先触れ（第4章 reveal のボス・仮名）：「境界を喰らうもの」の先に来るもの（本体＝ラスボス級は後の章）。研究施設の地下から
  // 町の縁を喰らいながら伸びてくる黒い膜と触腕の塊。胸に桃色の「縁の輪」（核）。巨大猫又で戦う（人の大きさでは戦わない）。
  // 守る：「喰らう」（feed）は避難した（相棒）の詰所を狙う。間に立つ（体で受ける）か、咆哮で止めると守れる。
  sakibure: {
    name: '境界の先触れ', hp: 2400, provisional: true, giant: true,
    speed: { walk: 1.6, angry: 2.2 },
    senses: { fov: 360, sight: 200, sightDark: 200, hear: { gun: 200, run: 200, walk: 200 }, memory: 999 },
    attacks: {
      sweep: { windup: 1.1, active: 0.3, recover: 1.0, dmg: 14, range: 32, arc: 150, parryable: true },
      beam: { windup: 1.5, active: 0.6, recover: 1.1, dmg: 20, range: 80, arc: 14, parryable: false, line: { w: 7 } },
      rain: { windup: 1.7, active: 0.3, recover: 1.2, dmg: 12, range: 70, parryable: false, aoe: { r: 7, n: 5 } },
      feed: { windup: 2.4, active: 0.8, recover: 1.4, dmg: 18, range: 110, parryable: true, line: { w: 9 }, target: 'shelter' },
    },
    phases: [
      { at: 1.0, pattern: ['sweep', 'beam', 'sweep', 'rain'], cooldown: 1.6 },
      { at: 0.6, pattern: ['sweep', 'feed', 'beam', 'rain', 'sweep'], cooldown: 1.25 },
      { at: 0.3, pattern: ['rain', 'sweep', 'feed', 'beam', 'sweep', 'beam'], cooldown: 0.95 },
    ],
    pattern: ['sweep'], cooldown: 1.6,
    stagger: { parried: 2.4, hit: 0.0, broken: 4.0, roar: 2.4 },
    downState: 'down',
    poise: 260, poiseMul: 0.6, coreMul: 2.0,
    resolve: { rescue: false, neutralize: false, escape: false, kill: true },
  },
  // 収容者（旧研究棟の被験者・第5章）【仮】：自分の部屋の前を往復する。点呼の鐘で戸口に立つ（収容の古い順）。
  // 救う＝点呼卓で在棟の人を正しい順に呼ぶ（部屋へ戻って休む）／倒す。白い予兆＝押しのけ、赤＝つかむ。
  shuusha: {
    name: '収容者', hp: 96, provisional: true,
    speed: { walk: 0.9, angry: 2.9 },
    senses: { fov: 110, sight: 9, sightDark: 4, hear: { gun: 20, run: 7, walk: 2.5 }, memory: 8 },
    assess: [0.6, 1.2],
    attacks: {
      shove: { windup: 0.62, active: 0.14, recover: 0.6, dmg: 14, range: 2.2, arc: 100, parryable: true },
      grab: { windup: 1.0, active: 0.18, recover: 1.0, dmg: 18, range: 1.9, arc: 70, parryable: false, grab: true },
    },
    pattern: ['shove', 'shove', 'grab'],
    cooldown: 1.0,
    stagger: { parried: 1.0, hit: 0.3, broken: 1.8 },
    poise: 46,
    resolve: { rescue: 'rollcall_in_order', neutralize: false, escape: true, kill: true },
  },
  // 継接（つぎはぎ・第5章のボス）【仮】：いくつもの可能性の体がつながった中ボス。部分ごとに輪と攻めが違い、壊すと行動が変わる。
  // 右腕：戸を叩く（白・弾ける）→ 壊すと暴れる（赤・周り）。左腕：鞄を抱く・抱き寄せる（赤・つかむ）→ 崩れる／壊すと鞄を落とす。
  // 脚：帰り道を歩く・踏みつけ（赤・円）→ 壊すと動けない（無力化）。救う＝落とした鞄を持ち主の机へ返す。逃げるは不可。
  tsugihagi: {
    name: '継接', hp: 900, provisional: true, boss: true,
    speed: { walk: 0.8, angry: 1.9 },
    senses: { fov: 360, sight: 30, sightDark: 30, hear: { gun: 40, run: 30, walk: 30 }, memory: 99 },
    parts: { right: 110, left: 90, legs: 120 },
    whiteResist: 0.55,                                        // 白い姿の傷は浅い（縫い目が妖力を吸う・仮）。紫の刀はそのまま
    attacks: {
      knock: { windup: 0.85, active: 0.16, recover: 0.75, dmg: 18, range: 3.6, arc: 100, parryable: true, part: 'right' },
      embrace: { windup: 1.05, active: 0.2, recover: 1.0, dmg: 16, range: 3.3, arc: 80, parryable: false, grab: true, part: 'left' },
      stomp: { windup: 1.15, active: 0.2, recover: 0.9, dmg: 20, range: 9, arc: 360, parryable: false, aoe: { r: 2.4, ahead: 0 }, ranged: true, part: 'legs' },
      thrash: { windup: 0.9, active: 0.25, recover: 1.0, dmg: 17, range: 3.6, arc: 360, parryable: false, aoe: { r: 3.8, ahead: 0 } },
      cry: { windup: 1.3, active: 0.25, recover: 1.1, dmg: 12, range: 4.6, arc: 360, parryable: false, aoe: { r: 4.5, ahead: 0 } },
    },
    phases: [{ at: 1.0, cooldown: 1.15 }, { at: 0.6, cooldown: 0.95 }, { at: 0.3, cooldown: 0.75 }],
    pattern: ['knock', 'stomp', 'knock', 'embrace'],
    cooldown: 1.15,
    stagger: { parried: 1.4, hit: 0.0, broken: 2.0 },
    downState: 'down',
    poise: 200, poiseMul: 0.8,
    resolve: { rescue: 'return_the_bag', neutralize: 'break_the_legs', escape: false, kill: true },
  },
  // ── フェーズ7（第6章）【仮】 ──
  // 塗替（ぬりかえ・第6章A のボス・仮名）：町の夜の物（巻き上げたシャッター・街灯・電線・変圧器）が寄り集まった巨体。灯りを紫に「塗り替える」。
  // 薙ぎ（電線の鞭・白＝咆哮で止める）／灯の光線（赤・線）／塗料の雨（赤・円）／塗り替え（白・人の残る棟への線：間に立つか咆哮で守る）。
  nurikae: {
    name: '塗替', hp: 3200, provisional: true, giant: true,
    speed: { walk: 1.8, angry: 2.4 },
    senses: { fov: 360, sight: 200, sightDark: 200, hear: { gun: 200, run: 200, walk: 200 }, memory: 999 },
    attacks: {
      sweep: { windup: 1.05, active: 0.3, recover: 1.0, dmg: 14, range: 30, arc: 140, parryable: true },
      beam: { windup: 1.4, active: 0.6, recover: 1.0, dmg: 18, range: 80, arc: 14, parryable: false, line: { w: 6 } },
      rain: { windup: 1.6, active: 0.3, recover: 1.1, dmg: 12, range: 70, parryable: false, aoe: { r: 6.5, n: 5 } },
      feed: { windup: 2.3, active: 0.8, recover: 1.3, dmg: 16, range: 110, parryable: true, line: { w: 9 }, target: 'block' },
    },
    phases: [
      { at: 1.0, pattern: ['sweep', 'feed', 'beam', 'sweep'], cooldown: 1.5 },
      { at: 0.6, pattern: ['sweep', 'rain', 'feed', 'beam', 'sweep'], cooldown: 1.2 },
      { at: 0.3, pattern: ['feed', 'sweep', 'rain', 'beam', 'feed', 'sweep'], cooldown: 0.95 },
    ],
    pattern: ['sweep'], cooldown: 1.5,
    stagger: { parried: 2.4, hit: 0.0, broken: 4.0, roar: 2.6 },
    downState: 'down',
    poise: 280, poiseMul: 0.6, coreMul: 2.0,
    resolve: { rescue: false, neutralize: false, escape: false, kill: true },
  },
  // 待人（まちびと・ENEMY_AI_SPEC §2.8）【仮】：待ち合わせの場所（バス停・受付）で時計を見続ける。近づく者を「待っていた人」と取り違えてついてくる。
  // 違うと分かると悲しげに戻る（攻撃しない）。何度も近づく・攻撃すると怒る：時計の針を止める（遅くなる場・赤い円）／押しのけ（白）。
  // 救う＝待っていた人の物（忘れ物）を届ける／無力化＝場所の時計を止める（眠る）／倒す。
  machibito: {
    name: '待人', hp: 70, provisional: true,
    speed: { walk: 1.0, angry: 2.6 },
    cause: { body: 0.3, memory: 0.9, env: 0.8 },
    senses: { fov: 120, sight: 8, sightDark: 5, hear: { gun: 20, run: 6, walk: 2 }, memory: 8 },
    attacks: {
      push: { windup: 0.6, active: 0.14, recover: 0.6, dmg: 10, range: 2.0, arc: 100, parryable: true },
      stopclock: { windup: 1.1, active: 0.3, recover: 1.2, dmg: 8, range: 8, arc: 360, parryable: false, ranged: true, aoe: { r: 2.6, slow: 3.0 } },
    },
    pattern: ['push', 'stopclock', 'push'],
    cooldown: 1.0,
    stagger: { parried: 1.0, hit: 0.3, broken: 1.8 },
    poise: 50,
    misreadMax: 3,                                            // 取り違えでついてくる回数（越えると怒る）
    resolve: { rescue: 'deliver_the_item', neutralize: 'stop_the_clock', escape: true, kill: true },
  },
  // 当直（とうちょく・第6章B のボス・仮名）：中央管理棟の夜勤の保全員が、巡回の手順ごと置き換わった姿。レンチと一体の右腕・点検表と一体の左手・
  // 計器の顔・頭の作業灯（一つ目）・背の配管（蒸気）。止めた P-2 を「巡回」で入れ直そうとする（弁へ歩く・間に合うと少し回復＋蒸気）。
  // 攻め：レンチ（白）／蒸気の噴き（赤・扇）／配管の叩きつけ（赤・円）。蒸気弁の線の中で崩れる。救う＝崩れた時に点検表（引き継ぎ）を渡す／
  // 無力化＝崩れた時にレンチを配管に施錠（ロックアウト）／倒す。逃げるは不可（中ボス戦）。
  touchoku: {
    name: '当直', hp: 1100, provisional: true, boss: true,
    speed: { walk: 1.2, angry: 2.5 },
    senses: { fov: 360, sight: 30, sightDark: 30, hear: { gun: 40, run: 30, walk: 30 }, memory: 99 },
    attacks: {
      wrench: { windup: 0.75, active: 0.16, recover: 0.7, dmg: 16, range: 2.8, arc: 110, parryable: true },
      steam: { windup: 1.0, active: 0.5, recover: 0.9, dmg: 14, range: 5.0, arc: 70, parryable: false },
      slam: { windup: 1.15, active: 0.2, recover: 1.0, dmg: 18, range: 9, arc: 360, parryable: false, aoe: { r: 2.8, ahead: 0 }, ranged: true },
    },
    phases: [{ at: 1.0, cooldown: 1.1 }, { at: 0.6, cooldown: 0.9 }, { at: 0.3, cooldown: 0.75 }],
    pattern: ['wrench', 'steam', 'wrench', 'slam'],
    cooldown: 1.1,
    roundEvery: 14, roundTime: 4.0, roundHeal: 0.08,         // 巡回：14 秒ごとに弁へ。4 秒いじると回復（8%）
    stagger: { parried: 1.4, hit: 0.0, broken: 3.2, steam: 3.6 },
    downState: 'down',
    poise: 170, poiseMul: 0.85, coreMul: 1.5,
    resolve: { rescue: 'hand_over_the_checklist', neutralize: 'lock_out_the_wrench', escape: false, kill: true },
  },
  // ── フェーズ8（終章）【仮】 ──
  // 境界を喰らうもの（終章A のボス・巨大な最終形態）：研究者が境界応答を集めすぎて膨れた姿。記録の帯が重なった翼（6 枚・目が並ぶ）と、
  // 胸の「淵の目」（黒い瞳と時計の目盛りの輪＝核）。薙ぎ（翼・白＝咆哮で止める）／淵の光線（赤・線）／欠片の雨（赤・円）／
  // 喰らう（白・避難の灯への線：間に立つか咆哮で守る）。体力 66%・33% で演出（町の人と（相棒）の支え／配偶者に似た異形）。
  kuramono: {
    name: '境界を喰らうもの', hp: 4200, provisional: true, giant: true,
    speed: { walk: 1.2, angry: 1.6 },
    senses: { fov: 360, sight: 240, sightDark: 240, hear: { gun: 240, run: 240, walk: 240 }, memory: 999 },
    attacks: {
      sweep: { windup: 1.1, active: 0.3, recover: 1.0, dmg: 15, range: 34, arc: 150, parryable: true },
      beam: { windup: 1.5, active: 0.7, recover: 1.0, dmg: 20, range: 90, arc: 14, parryable: false, line: { w: 7 } },
      rain: { windup: 1.6, active: 0.3, recover: 1.1, dmg: 13, range: 80, parryable: false, aoe: { r: 7, n: 6 } },
      feed: { windup: 2.4, active: 0.8, recover: 1.3, dmg: 16, range: 120, parryable: true, line: { w: 10 }, target: 'refuge' },
    },
    phases: [
      { at: 1.0, pattern: ['sweep', 'feed', 'beam', 'sweep'], cooldown: 1.5 },
      { at: 0.66, pattern: ['sweep', 'rain', 'feed', 'beam', 'sweep'], cooldown: 1.25 },
      { at: 0.33, pattern: ['feed', 'sweep', 'rain', 'beam', 'feed', 'sweep'], cooldown: 1.0 },
    ],
    pattern: ['sweep'], cooldown: 1.5,
    stagger: { parried: 2.4, hit: 0.0, broken: 4.0, roar: 2.6 },
    downState: 'down',
    poise: 320, poiseMul: 0.6, coreMul: 2.0,
    resolve: { rescue: 'pull_out_the_researcher', neutralize: false, escape: false, kill: false },
  },
  // 研究者（終章B のボス・人間大の特別な最終戦）：境界応答の紫の光をまとった姿。記録の中の「事故の瞬間」を武器にする。
  // 打つ（白）／巻き戻し（赤・円：数秒前にいた所）／残像（赤・線：過去の自分が同じ道を走る）／事故の瞬間（白・（相棒）への線：間に立って受ける）。
  // 記録装置が動いている間は傷が浅く、体力が 25% より減らない（巻き戻される）。待機の時に止める。体力 0 で膝をつく（無力化。倒さない）。
  kenkyusha: {
    name: '研究者', hp: 1400, provisional: true, boss: true,
    speed: { walk: 1.3, angry: 2.6 },
    senses: { fov: 360, sight: 40, sightDark: 40, hear: { gun: 40, run: 40, walk: 40 }, memory: 99 },
    attacks: {
      strike: { windup: 0.7, active: 0.16, recover: 0.7, dmg: 15, range: 2.8, arc: 110, parryable: true },
      rewind: { windup: 1.25, active: 0.3, recover: 0.9, dmg: 18, range: 30, arc: 360, parryable: false, aoe: { r: 2.3, ahead: 0 }, ranged: true, past: 2.0 },
      echo: { windup: 1.0, active: 0.4, recover: 1.0, dmg: 16, range: 14, arc: 20, parryable: false, line: { w: 1.8 }, ranged: true },
      accident: { windup: 1.6, active: 0.4, recover: 1.1, dmg: 14, range: 30, arc: 20, parryable: true, line: { w: 2.2 }, ranged: true, target: 'companion' },
    },
    phases: [
      { at: 1.0, pattern: ['strike', 'rewind', 'strike', 'echo'], cooldown: 1.1 },
      { at: 0.66, pattern: ['strike', 'accident', 'rewind', 'echo', 'strike'], cooldown: 0.95 },
      { at: 0.33, pattern: ['accident', 'strike', 'rewind', 'echo', 'strike', 'rewind'], cooldown: 0.8 },
    ],
    pattern: ['strike'], cooldown: 1.1,
    stagger: { parried: 1.4, hit: 0.0, broken: 2.6, deck: 2.4 },
    downState: 'down',
    poise: 180, poiseMul: 0.85, coreMul: 1.5,
    resolve: { rescue: false, neutralize: 'kneel', escape: false, kill: false },
  },
};
