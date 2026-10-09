/* ══════════════════════════════════════════════════════════════════════
   境界事象  ターン制バトル（kyokai/battle.js）
   読み込み順：engine.js → systems.js → battle.js →（overworld.js）→ board.js …

   【外から使う API】
   - KY_BATTLE.encounter({area, world, danger, chapter}) → 敵 id | null
       シロと出会う前（フラグ shiro_met なし）・研究所（center_*）・シロが倒れている・戦闘直後の数歩は null。
       観測層 B/C は危険度に応じて 3〜13%（1 歩ごと）、A は危険度 2 以上でまれに。
   - KY_BATTLE.start(enemyId, {area, world, boss?, canRun?, lv?, pal?}) → Promise<{result:'win'|'lose'|'run', lv, exp}>
       負け（シロが倒れる）：ゲームオーバーなし。存在安定度 −20（野生戦で 0 になれば systems.js の押し戻し＝slip。ボス戦は 1 で止める）。
       野生戦の負けは研究所へ退く（G.slipNow を立てる＝探索ループが研究所へ戻す。戻り値 retreat:true, home）。
       ボスは逃げられない。
   - 章スクリプト：await K.battle(enemyId, {intro:[lines], outro:[lines], world, pal, lv})
       ボス戦（逃げられない）。負けたら安定度 −20 → シロが回復して何度でも再挑戦（負けるたびにユウの支援で少し強くなる）。
   - KY_BATTLE.rest()：シロの HP・技の残り回数を全快（研究所 center_* の場面に入ると自動で呼ばれる）。
   - KY_BATTLE.shiro()：シロの記録（S.flags.bt に保存＝kyokai_save_v1 に入る）。
   本編のセーブ（dannoura_*）には触れない。だんのうらは戦闘に出てこない。
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KY = root.KY;
  if (!KY || !KY._G) { console.error('[KY] battle.js：engine.js が先に必要です'); return; }
  const G = KY._G, HAS_DOM = KY.HAS_DOM;
  const clamp = KY._clamp || ((v, a, b) => Math.max(a, Math.min(b, v)));
  const S = () => KY.state;

  /* ═════════════════════════ 属性（三すくみ） ═════════════════════════ */
  // 揺らぎ ＞ 空白 ＞ 残響 ＞ 揺らぎ。「観測」はどれにも等倍。
  const TYPES = { echo: '残響', flux: '揺らぎ', void: '空白', none: '観測' };
  const BEATS = { flux: 'void', void: 'echo', echo: 'flux' };
  function typeMul(a, d) {
    if (!BEATS[a] || !BEATS[d]) return 1;
    if (BEATS[a] === d) return 1.5;
    if (BEATS[d] === a) return 0.67;
    return 1;
  }

  /* ═════════════════════════ 技 ═════════════════════════ */
  const MOVES = {
    // ── シロ ──
    kansoku: { name: '観測光', type: 'none', pow: 40, pp: 35, acc: 100, desc: 'じっと見つめる光で、相手の輪郭を照らす。' },
    isou: { name: '位相ずらし', type: 'flux', pow: 50, pp: 20, acc: 95, desc: '自分の位相をずらし、すり抜けざまに打つ。' },
    zankyo: { name: '残響返し', type: 'echo', pow: 50, pp: 20, acc: 95, desc: '相手の立てた音を、そのまま返す。' },
    tomoshi: { name: '同期の灯', type: 'none', pow: 0, pp: 8, acc: 100, eff: 'heal', amt: 0.45, desc: '観測員との同期で輪郭を整える。HP 回復（同期 Lv が高いほど多い）。' },
    yohaku: { name: '余白つつき', type: 'void', pow: 55, pp: 20, acc: 95, desc: '世界の余白を突いて、相手の足場を消す。' },
    kotei: { name: '境界固定', type: 'none', pow: 0, pp: 10, acc: 100, eff: 'atkdown2', desc: '相手の輪郭をその場に縫い止める。相手の攻撃が大きく下がる。' },
    sanso: { name: '三層観測', type: 'none', pow: 80, pp: 10, acc: 90, desc: 'A・B・C 三つの層から同時に見る。' },
    kyomei: { name: '共鳴の環', type: 'echo', pow: 85, pp: 10, acc: 90, desc: '汽笛と時計と電線の音を重ねてぶつける。' },
    hanten: { name: '位相反転', type: 'flux', pow: 85, pp: 10, acc: 90, desc: '相手の位相を裏返す。' },
    ippun: { name: '一分間の空白', type: 'void', pow: 100, pp: 5, acc: 85, desc: '午前2時17分の、あの一分間を叩きつける。' },
    furete: { name: 'ふれる', type: 'none', pow: 20, pp: 0, acc: 100, desc: '技が尽きたとき。' },
    // ── 境界生物 ──
    zawa: { name: 'ざわめき', type: 'flux', pow: 35, acc: 100 },
    noise: { name: 'ノイズ噛み', type: 'flux', pow: 45, acc: 95 },
    kodama: { name: 'こだま打ち', type: 'echo', pow: 40, acc: 100 },
    sakagoe: { name: '逆さ声', type: 'echo', pow: 55, acc: 90 },
    kage: { name: '影のばし', type: 'void', pow: 40, acc: 100 },
    nomi: { name: 'のみこみ', type: 'void', pow: 60, acc: 85 },
    gyoshi: { name: '凝視', type: 'none', pow: 0, acc: 100, eff: 'defdown' },
    kiri: { name: '淀み霧', type: 'none', pow: 0, acc: 100, eff: 'atkdown' },
    kizami: { name: '刻み喰い', type: 'echo', pow: 50, acc: 95 },
    unari: { name: 'うなり', type: 'flux', pow: 50, acc: 95 },
    zure: { name: 'ずれ込み', type: 'flux', pow: 45, acc: 100 },
    kippu: { name: '切符切り', type: 'echo', pow: 45, acc: 100 },
    hakushi: { name: '白紙化', type: 'void', pow: 50, acc: 95 },
    utsushi: { name: '写し取り', type: 'flux', pow: 55, acc: 90 },
    ushiro: { name: 'うしろに立つ', type: 'void', pow: 65, acc: 90 },
    kiteki: { name: '逆さ汽笛', type: 'echo', pow: 65, acc: 90 },
    karami: { name: 'からみつき', type: 'flux', pow: 55, acc: 95 },
    // ── ボス ──
    nigori: { name: '濁流', type: 'void', pow: 70, acc: 90 },
    shosha: { name: '観測照射', type: 'flux', pow: 65, acc: 95 },
    shisen: { name: '固定視線', type: 'none', pow: 0, acc: 100, eff: 'defdown' },
    saikan: { name: '再観測', type: 'none', pow: 0, acc: 100, eff: 'selfheal', amt: 0.18 },
    shime: { name: '結び締め', type: 'echo', pow: 70, acc: 90 },
    hodoki: { name: 'ほどけ波', type: 'flux', pow: 70, acc: 90 },
  };
  // シロが覚える技（Lv: 技）
  const LEARN = [[1, 'kansoku'], [1, 'isou'], [4, 'zankyo'], [7, 'tomoshi'], [10, 'yohaku'], [14, 'kotei'], [18, 'sanso'], [21, 'kyomei'], [24, 'hanten'], [27, 'ippun']];

  /* ═════════════════════════ 境界生物 ═════════════════════════ */
  // base: hp/atk/def/spd（種族の値）。worlds：出る観測層。ch：出る章の範囲。areas：出やすい場所（無ければどこでも）。
  const ENEMIES = {
    noise_mushi: { name: 'ノイズ虫', type: 'flux', base: [35, 42, 35, 55], exp: 40, moves: ['zawa', 'noise'], worlds: 'BC', ch: [5, 10], w: 5,
      desc: '電波の切れ目に湧く小さな虫。鳴き声は砂嵐そのもの。' },
    kodama: { name: 'こだまの抜け殻', type: 'echo', base: [45, 40, 48, 35], exp: 45, moves: ['kodama', 'sakagoe'], worlds: 'BC', ch: [5, 11], areas: ['tunnel', 'station', 'mountain_road', 'old_lab'], w: 4,
      desc: '誰かの声だけが抜け落ちて殻になったもの。中は空洞。' },
    otokage: { name: '落とし影', type: 'void', base: [40, 48, 36, 50], exp: 45, moves: ['kage', 'gyoshi'], worlds: 'BC', ch: [5, 11], areas: ['residential', 'shrine', 'shotengai'], w: 4,
      desc: '持ち主のいない影。地面から起き上がって、こちらを見る。' },
    shizuku: { name: 'ヨドミの雫', type: 'void', base: [42, 44, 40, 40], exp: 42, moves: ['kage', 'kiri'], worlds: 'C', ch: [5, 14], w: 4,
      desc: 'ヨドミから垂れた一滴。小さいが、逆回しの声で鳴く。' },
    tokeikui: { name: '時計喰い', type: 'echo', base: [50, 50, 50, 30], exp: 55, moves: ['kizami', 'kodama'], worlds: 'BC', ch: [6, 12], areas: ['school', 'shotengai', 'station', 'empty_town'], w: 3,
      desc: '秒針の音を食べる。食べられた時計は 2時17分で止まる。' },
    densen: { name: '電線鳴き', type: 'flux', base: [40, 55, 35, 62], exp: 50, moves: ['unari', 'noise'], worlds: 'BC', ch: [6, 12], areas: ['riverbank', 'mountain_road', 'residential'], w: 3,
      desc: '電線にとまる鳥のかたち。ハム音で鳴き交わす。' },
    kanban: { name: '看板ずれ', type: 'flux', base: [50, 46, 52, 38], exp: 50, moves: ['zure', 'gyoshi'], worlds: 'B', ch: [6, 13], areas: ['shotengai', 'station'], w: 3,
      desc: '店の名前が一文字ずつずれていく看板。読むと目が回る。' },
    kaisatsu: { name: '改札ぼうし', type: 'echo', base: [55, 50, 56, 34], exp: 55, moves: ['kippu', 'kodama'], worlds: 'B', ch: [6, 13], areas: ['station'], w: 3,
      desc: '駅員の帽子だけが改札に立っている。切符を拝見。' },
    hakushi: { name: '白紙の子', type: 'void', base: [50, 55, 45, 56], exp: 60, moves: ['hakushi', 'gyoshi'], worlds: 'C', ch: [8, 14], areas: ['school', 'empty_town', 'residential'], w: 3,
      desc: '顔の描かれていない紙の子ども。名前を書いてほしがる。' },
    utsuri: { name: '写り込み', type: 'flux', base: [45, 60, 40, 66], exp: 60, moves: ['utsushi', 'zawa'], worlds: 'BC', ch: [8, 14], w: 3,
      desc: '写真の隅に写る、撮ったときにはいなかった誰か。' },
    ushirogami: { name: 'ウシロガミ', type: 'void', base: [55, 64, 46, 60], exp: 70, moves: ['ushiro', 'kage'], worlds: 'C', ch: [10, 14], w: 2,
      desc: '振り返る直前まで、そこにいる。髪のような影しか見えない。' },
    sakasa: { name: '逆さ汽笛', type: 'echo', base: [60, 64, 55, 50], exp: 75, moves: ['kiteki', 'sakagoe'], worlds: 'C', ch: [11, 14], areas: ['station', 'empty_town', 'collapse', 'mountain_road'], w: 2,
      desc: '存在しない駅の汽笛が、裏返って歩き出したもの。' },
    musubikuzu: { name: '結び目くず', type: 'flux', base: [60, 60, 60, 55], exp: 80, moves: ['karami', 'kiri'], worlds: 'ABC', ch: [14, 14], areas: ['collapse'], w: 4,
      desc: '混ざった世界の糸くず。どの世界の物か、本人にも分からない。' },
    // ── ボス ──
    yodomi: { name: 'ヨドミ', type: 'void', base: [45, 40, 40, 30], exp: 60, moves: ['kage', 'kiri'], boss: true, hpMul: 1.3, atkMul: 0.55, big: true,
      desc: '崩壊した世界に滲む黒いもや。シロを追ってきた。' },
    yodomi_nigori: { name: 'ヨドミ・濁', type: 'void', base: [60, 58, 52, 42], exp: 80, moves: ['nigori', 'kage', 'kiri'], boss: true, hpMul: 1.8, atkMul: 0.82, big: true,
      desc: '誰もいない町の路地に溜まった、濃いヨドミ。逆回しの声で町の名前を呼ぶ。' },
    kikou9: { name: '観測機構〈九〉', type: 'flux', base: [65, 62, 62, 55], exp: 100, moves: ['shosha', 'shisen', 'saikan'], boss: true, hpMul: 1.9, atkMul: 0.82, big: true,
      desc: '九条が旧研究施設に残した観測装置。見たものを「標本」として固定する。' },
    musubi_ban: { name: '結び目の番', type: 'echo', base: [70, 66, 64, 58], exp: 120, moves: ['shime', 'kiteki', 'saikan'], boss: true, hpMul: 2.1, atkMul: 0.82, big: true, phase2: { type: 'flux', moves: ['hodoki', 'karami', 'shisen'] },
      desc: '境界核のまわりを巡る、ほどけかけた糸の塊。半分ほどけると位相が変わる。' },
  };

  /* ═════════════════════════ 数値 ═════════════════════════ */
  const CAP = 30;
  const SHIRO_BASE = [50, 55, 50, 60];
  // 章ごと：シロの下限 Lv（遊んでいなくても物語の節目で追いつく）・野生の Lv の目安
  const FLOOR = { 5: 1, 6: 3, 7: 5, 8: 7, 9: 9, 10: 11, 11: 13, 12: 15, 13: 17, 14: 20 };
  const WILD = { 5: 2, 6: 4, 7: 6, 8: 8, 9: 10, 10: 12, 11: 14, 12: 16, 13: 18, 14: 21 };
  const stat = (b, L) => Math.floor(2 * b * L / 100) + 5;
  const hpStat = (b, L) => Math.floor(2 * b * L / 100) + L + 10;
  const expAt = L => L <= 1 ? 0 : Math.floor(0.9 * L * L * L);
  function stats(base, L) { return { hp: hpStat(base[0], L), atk: stat(base[1], L), def: stat(base[2], L), spd: stat(base[3], L) }; }
  const shiroStats = L => stats(SHIRO_BASE, L);
  const stageMul = s => s >= 0 ? 1 + 0.25 * s : 1 / (1 - 0.25 * s);
  const chNum = c => { const m = /(\d+)/.exec(String(c == null ? (S() && S().chapter) || '' : c)); return m ? +m[1] : 0; };
  const floorFor = ch => { let v = 1; for (const k in FLOOR) if (ch >= +k) v = Math.max(v, FLOOR[k]); return v; };
  const wildFor = ch => { let v = 2; for (const k in WILD) if (ch >= +k) v = Math.max(v, WILD[k]); return v; };

  const API = root.KY_BATTLE = {
    TYPES, BEATS, MOVES, LEARN, ENEMIES, FLOOR, WILD, CAP, SHIRO_BASE,
    typeMul, stats, shiroStats, expAt, floorFor, wildFor, chNum,
    rng: Math.random,
  };
  const rnd = () => API.rng();

  // ダメージ：GB の怪物 RPG の式に近い簡単なもの。
  // att = {lv, atk, stage?, type?, bonus?}  def = {def, stage?, type?}  o = {crit?:bool, roll?:0.85..1, weak?:bool}
  function damage(att, def, move, o) {
    o = o || {};
    if (!move || !move.pow) return { dmg: 0, mul: 1, crit: false };
    const A = att.atk * stageMul(att.stage || 0), D = Math.max(1, def.def * stageMul(def.stage || 0));
    let d = Math.floor(Math.floor((2 * att.lv / 5 + 2) * move.pow * A / D) / 50) + 2;
    const mul = typeMul(move.type, def.type);
    const stab = att.type && att.type !== 'none' && att.type === move.type ? 1.2 : 1;
    const crit = !!o.crit;
    const roll = o.roll == null ? 1 : o.roll;
    d = d * mul * stab * (crit ? 1.5 : 1) * roll * (att.bonus || 1) * (o.weak ? 1.5 : 1);
    return { dmg: Math.max(1, Math.floor(d)), mul, crit };
  }
  API.damage = damage;

  /* ═════════════════════════ シロの記録（セーブ） ═════════════════════════ */
  // S.flags.bt に置く（flags はセーブの検証をそのまま通る）。
  function fresh() {
    const st = shiroStats(1);
    return { lv: 1, exp: 0, hp: st.hp, moves: [{ id: 'kansoku', pp: MOVES.kansoku.pp }, { id: 'isou', pp: MOVES.isou.pp }], seen: {}, wins: 0, losses: 0, runs: 0, cool: 0, rested: 0 };
  }
  function data() {
    const f = S().flags;
    let d = f.bt;
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = f.bt = fresh();
    // 壊れた値を直す（古いセーブ・手で書き換えたセーブ）
    d.lv = clamp(d.lv | 0 || 1, 1, CAP);
    d.exp = Math.max(expAt(d.lv), +d.exp || 0);
    if (!Array.isArray(d.moves)) d.moves = fresh().moves;
    d.moves = d.moves.filter(m => m && MOVES[m.id] && MOVES[m.id].pp).slice(0, 4).map(m => ({ id: m.id, pp: clamp(m.pp | 0, 0, MOVES[m.id].pp) }));
    if (!d.moves.length) d.moves = fresh().moves;
    const mx = shiroStats(d.lv).hp;
    d.hp = clamp(d.hp == null ? mx : d.hp | 0, 0, mx);
    if (!d.seen || typeof d.seen !== 'object') d.seen = {};
    ['wins', 'losses', 'runs', 'cool', 'rested'].forEach(k => { d[k] = Math.max(0, d[k] | 0); });
    return d;
  }
  const dirty = () => { try { KY.autosaveSoon && KY.autosaveSoon(); } catch (e) {} };
  API.shiro = data;
  API.maxHp = () => shiroStats(data().lv).hp;
  API.rest = function (quiet) {
    if (!KY.has('shiro_met')) return false;
    const d = data(), mx = shiroStats(d.lv).hp;
    const need = d.hp < mx || d.moves.some(m => m.pp < MOVES[m.id].pp);
    d.hp = mx; d.moves.forEach(m => { m.pp = MOVES[m.id].pp; });
    if (need) {
      dirty();
      if (!quiet && HAS_DOM && G.running && KY.toast) {
        d.rested++;
        KY.toast(d.rested === 1 ? 'シロが研究所で休んだ（HP・技 全快）\nユウ「装置の横が落ち着くみたいだな。休ませとけ」' : 'シロが研究所で休んだ\nHP・技の残りが全快した', 'sync');
      }
    }
    return need;
  };
  // シロの Lv が章の下限より低ければ追いつかせる（物語の節目で「向こう側で育っていた」）
  function catchUp(ch) {
    const d = data(), f = floorFor(ch == null ? chNum() : ch);
    if (d.lv >= f) return null;
    const from = d.lv;
    const mx0 = shiroStats(d.lv).hp;
    d.lv = f; d.exp = expAt(f);
    const mx = shiroStats(d.lv).hp;
    d.hp = clamp(d.hp + (mx - mx0), 1, mx);
    const learned = [];
    LEARN.forEach(([L, id]) => {
      if (L > from && L <= f && !d.moves.some(m => m.id === id)) {
        if (d.moves.length < 4) d.moves.push({ id, pp: MOVES[id].pp });
        else { // いちばん弱い攻撃技と入れ替える（回復・補助は残す）
          let wi = -1, wp = 1e9;
          d.moves.forEach((m, i) => { const mv = MOVES[m.id]; if (mv.pow && mv.pow < wp) { wp = mv.pow; wi = i; } });
          if (wi >= 0 && (MOVES[id].pow === 0 || MOVES[id].pow > wp)) d.moves[wi] = { id, pp: MOVES[id].pp };
        }
        learned.push(id);
      }
    });
    dirty();
    return { from, to: f, learned };
  }
  API.catchUp = catchUp;

  // 経験値。戻り値：[{lv, gains:{hp,atk,def,spd}, learn:[ids]}]（新しい技はここではまだ覚えない）
  function gainExp(n) {
    const d = data(), ups = [];
    if (d.lv >= CAP) return ups;
    d.exp += Math.max(0, n | 0);
    while (d.lv < CAP && d.exp >= expAt(d.lv + 1)) {
      const a = shiroStats(d.lv), b = shiroStats(d.lv + 1);
      d.lv++;
      d.hp = clamp(d.hp + (b.hp - a.hp), 0, b.hp);
      ups.push({ lv: d.lv, gains: { hp: b.hp - a.hp, atk: b.atk - a.atk, def: b.def - a.def, spd: b.spd - a.spd }, learn: LEARN.filter(x => x[0] === d.lv).map(x => x[1]) });
    }
    if (d.lv >= CAP) d.exp = expAt(CAP);
    dirty();
    return ups;
  }
  API.gainExp = gainExp;
  API.expYield = (eid, lv, boss) => { const e = ENEMIES[eid]; return e ? Math.floor(e.exp * lv / 6 * (boss ? 1.6 : 1)) : 0; };
  API.syncBonus = () => { const s = (S() && S().sync) | 0; return { dmg: 1 + 0.06 * s, def: 1 + 0.04 * s, crit: 1 / 16 + s * 0.01, heal: 1 + 0.1 * s }; };

  /* ═════════════════════════ 出現 ═════════════════════════ */
  const RATE_BC = [0.03, 0.05, 0.07, 0.09, 0.11, 0.13];
  API.rate = function (ctx) {
    ctx = ctx || {};
    const w = String(ctx.world || (S() && S().world) || 'A').toUpperCase();
    const area = ctx.area || '';
    let d = ctx.danger;
    if (d == null) { try { d = KY.dangerOf ? KY.dangerOf(area, w) : 0; } catch (e) { d = 0; } }
    d = clamp(d | 0, 0, 5);
    if (/^center/.test(area)) return 0;
    if (w === 'A') return d >= 2 ? 0.01 * d : 0;
    return RATE_BC[d];
  };
  API.table = function (ctx) {
    ctx = ctx || {};
    const w = String(ctx.world || (S() && S().world) || 'A').toUpperCase();
    const ch = chNum(ctx.chapter);
    const area = ctx.area || '';
    return Object.keys(ENEMIES).filter(id => {
      const e = ENEMIES[id];
      if (e.boss) return false;
      if (e.worlds.indexOf(w === 'A' ? 'B' : w) < 0 && e.worlds.indexOf(w) < 0) return false;
      if (ch && (ch < e.ch[0] || ch > e.ch[1])) return false;
      if (id === 'musubikuzu' && area !== 'collapse') return false;
      return true;
    }).map(id => ({ id, w: (ENEMIES[id].w || 1) * (ENEMIES[id].areas && ENEMIES[id].areas.indexOf(area) >= 0 ? 3 : 1) }));
  };
  API.encounter = function (ctx) {
    ctx = ctx || {};
    if (!KY.has('shiro_met')) return null;
    const d = data();
    if (d.hp <= 0) return null;
    if (d.cool > 0) { d.cool--; return null; }
    const r = API.rate(ctx);
    if (!r || rnd() >= r) return null;
    const tb = API.table(ctx);
    if (!tb.length) return null;
    let sum = tb.reduce((a, x) => a + x.w, 0), k = rnd() * sum;
    for (const x of tb) { k -= x.w; if (k < 0) return x.id; }
    return tb[tb.length - 1].id;
  };
  API.wildLevel = function (ctx) {
    ctx = ctx || {};
    const ch = chNum(ctx.chapter) || 5;
    let d = ctx.danger;
    if (d == null) { try { d = KY.dangerOf ? KY.dangerOf(ctx.area || '', ctx.world || S().world) : 2; } catch (e) { d = 2; } }
    return clamp(wildFor(ch) + Math.floor(rnd() * 3) - 1 + ((d | 0) >= 4 ? 1 : 0), 1, CAP);
  };

  /* ═════════════════════════ 戦闘の進行（DOM／ヘッドレス共通） ═════════════════════════ */
  function makeEnemy(id, lv) {
    const e = ENEMIES[id];
    const st = stats(e.base, lv);
    const hp = Math.max(4, Math.floor(st.hp * (e.hpMul || 1)));
    return { id, name: e.name, type: e.type, lv, max: hp, hp, atk: Math.max(3, Math.floor(st.atk * (e.atkMul || 1))), def: st.def, spd: st.spd, stage: { atk: 0, def: 0 }, blind: 0, boss: !!e.boss, moves: e.moves.slice(), healed: 0, phase: 1, big: !!e.big };
  }
  function makeMe(assist) {
    const d = data(), st = shiroStats(d.lv), sb = API.syncBonus();
    const a = 1 + 0.25 * Math.min(6, assist | 0);
    return { name: 'シロ', lv: d.lv, max: st.hp, get hp() { return data().hp; }, set hp(v) { data().hp = clamp(Math.round(v), 0, st.hp); },
      atk: Math.round(st.atk * a), def: Math.round(st.def * sb.def * a), spd: st.spd, stage: { atk: 0, def: 0 }, type: 'none', bonus: sb.dmg, critRate: sb.crit };
  }
  const T = s => String(s).replace(/\{name\}/g, (S() && S().name) || '朝霧');
  const EFF_TXT = m => m > 1 ? 'こうかは ばつぐんだ！' : m < 1 ? 'こうかは いまひとつのようだ……' : '';
  let CUR = null;   // 戦闘中の状態（自動プレイ・テスト用に読み取りだけ公開）
  Object.defineProperty(API, 'current', { get: () => CUR, configurable: true });

  async function useMove(B, ui, who, mid) {
    const me = who === 'me', a = me ? B.me : B.en, d = me ? B.en : B.me;
    const mv = MOVES[mid] || MOVES.furete;
    await ui.msg(me ? `シロの ${mv.name}！` : `${B.en.name}の ${mv.name}！`);
    ui.se(me ? 'bt_atk' : 'bt_eatk');
    // 命中（ライトで目がくらんでいる敵は外しやすい）
    let acc = (mv.acc || 100) / 100;
    if (!me && B.en.blind > 0) acc *= 0.55;
    if (mv.pow && rnd() >= acc) { await ui.msg(me ? 'しかし シロの技は 外れた！' : `しかし ${B.en.name}の技は 外れた！`); return; }
    if (mv.eff === 'heal') {
      const sb = API.syncBonus();
      const amt = Math.max(4, Math.floor(B.me.max * mv.amt * sb.heal));
      const before = B.me.hp; B.me.hp = before + amt;
      ui.se('bt_heal');
      await ui.hp('me', before, B.me.hp);
      await ui.msg(B.me.hp > before ? `シロの輪郭が 整った！（HP +${B.me.hp - before}）` : 'しかし シロは もう元気いっぱいだ。');
      return;
    }
    if (mv.eff === 'selfheal') {
      if (B.en.healed >= 2 || B.en.hp >= B.en.max) { await ui.msg('しかし 何も起きなかった。'); return; }
      B.en.healed++;
      const before = B.en.hp; B.en.hp = Math.min(B.en.max, before + Math.floor(B.en.max * mv.amt));
      ui.se('bt_heal');
      await ui.hp('en', before, B.en.hp);
      await ui.msg(`${B.en.name}は 自分を 観測しなおした！`);
      return;
    }
    if (mv.eff === 'atkdown' || mv.eff === 'atkdown2' || mv.eff === 'defdown') {
      const k = mv.eff === 'defdown' ? 'def' : 'atk', n = mv.eff === 'atkdown2' ? 2 : 1;
      const tgt = d;
      if (tgt.stage[k] <= -3) { await ui.msg('しかし これ以上は 下がらない！'); return; }
      tgt.stage[k] = Math.max(-3, tgt.stage[k] - n);
      ui.se('bt_down');
      await ui.fx(me ? 'en' : 'me', 'down');
      const nm = me ? B.en.name : 'シロ';
      await ui.msg(`${nm}の ${k === 'atk' ? 'こうげき' : 'ぼうぎょ'}が ${n > 1 ? 'がくっと ' : ''}さがった！`);
      return;
    }
    // 攻撃
    const crit = rnd() < (me ? B.me.critRate : 1 / 24);
    const roll = 0.85 + rnd() * 0.15;
    const weak = me && B.weak;
    const r = damage({ lv: a.lv, atk: a.atk, stage: a.stage.atk, type: me ? 'none' : B.en.type, bonus: me ? B.me.bonus : 1 },
      { def: d.def, stage: d.stage.def, type: me ? B.en.type : 'none' }, mv, { crit, roll, weak });
    if (weak) B.weak = false;
    const before = d.hp;
    d.hp = Math.max(0, before - r.dmg);
    ui.se(r.mul > 1 ? 'bt_hit2' : r.mul < 1 ? 'bt_hit0' : 'bt_hit');
    await ui.hit(me ? 'en' : 'me', r.mul);
    await ui.hp(me ? 'en' : 'me', before, d.hp);
    if (crit) await ui.msg('きゅうしょに あたった！');
    if (weak) await ui.msg('観測した 弱いところに 当たった！');
    const et = EFF_TXT(r.mul); if (et) await ui.msg(et);
    // 結び目の番：半分ほどけると位相が変わる
    if (!me || B.en.phase !== 1) return;
    const e = ENEMIES[B.en.id];
    if (e.phase2 && B.en.hp > 0 && B.en.hp <= B.en.max / 2) {
      B.en.phase = 2; B.en.type = e.phase2.type; B.en.moves = e.phase2.moves.slice();
      ui.se('bt_phase');
      await ui.fx('en', 'phase');
      await ui.msg(`${B.en.name}の 糸が 半分ほどけた！`);
      await ui.msg(`位相が「${TYPES[B.en.type]}」に かわった！`);
      if (data().seen[B.en.id]) ui.refresh();
    }
  }

  function enemyPick(B) {
    const ms = B.en.moves.filter(id => {
      const m = MOVES[id];
      if (m.eff === 'selfheal') return B.en.hp < B.en.max * 0.45 && B.en.healed < 2;
      if (m.eff === 'defdown') return B.me.stage.def > -2;
      if (m.eff === 'atkdown') return B.me.stage.atk > -2;
      return true;
    });
    const list = ms.length ? ms : B.en.moves.filter(id => MOVES[id].pow);
    // 攻撃技を少し多めに
    const w = list.map(id => MOVES[id].eff === 'selfheal' ? 3 : MOVES[id].pow ? 3 : 1);
    let k = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { k -= w[i]; if (k < 0) return list[i]; }
    return list[0];
  }

  async function enemyTurn(B, ui) {
    if (B.en.hp <= 0 || B.me.hp <= 0) return;
    await useMove(B, ui, 'en', enemyPick(B));
    if (B.en.blind > 0) { B.en.blind--; if (!B.en.blind) await ui.msg(`${B.en.name}の 目が 慣れてきた。`); }
  }

  async function useItem(B, ui, id) {
    const it = S().items, nm = (KY.itemName ? KY.itemName(id) : id);
    if ((it[id] | 0) <= 0) { await ui.msg(`${nm}が ない！`); return false; }
    if (id === 'med') {
      if (B.me.hp >= B.me.max) { await ui.msg('シロは どこも 痛くないようだ。'); return false; }
      it.med--; const before = B.me.hp; B.me.hp = before + Math.max(15, Math.ceil(B.me.max * 0.5));
      ui.se('bt_heal'); KY._hud && KY._hud();
      await ui.msg(T(`{name}は ${nm}を 使った！`));
      await ui.hp('me', before, B.me.hp);
      await ui.msg(`シロの HPが ${B.me.hp - before} 回復した！`);
      return true;
    }
    if (id === 'stab') {
      it.stab--; const before = B.me.hp; B.me.hp = B.me.max; B.me.stage.atk = Math.max(0, B.me.stage.atk); B.me.stage.def = Math.max(0, B.me.stage.def);
      ui.se('bt_heal'); KY._hud && KY._hud();
      await ui.msg(T(`{name}は ${nm}を シロに 与えた！`));
      await ui.hp('me', before, B.me.hp);
      await ui.msg('シロの 輪郭が くっきりした！ HPが 全快した！');
      return true;
    }
    if (id === 'light') {
      if (KY.hasEquip && !KY.hasEquip('flashlight')) { await ui.msg('懐中電灯を 持っていない。'); return false; }
      it.light--; B.en.blind = 3;
      ui.se('bt_light'); KY._hud && KY._hud();
      await ui.fx('en', 'flash');
      await ui.msg(T(`{name}は 懐中電灯を 向けた！`));
      await ui.msg(`${B.en.name}は 光に 目が くらんでいる！`);
      return true;
    }
    if (id === 'battery') {
      if (KY.hasEquip && !KY.hasEquip('phone')) { await ui.msg('端末を 持っていない。'); return false; }
      it.battery--; B.weak = true;
      const sd = data(); sd.seen[B.en.id] = 2; dirty();
      ui.se('bt_scan'); KY._hud && KY._hud();
      await ui.fx('en', 'scan');
      await ui.msg(T(`{name}は 端末で ${B.en.name}を スキャンした！`));
      const weakTo = Object.keys(BEATS).find(k => BEATS[k] === B.en.type);
      await ui.msg(`属性：${TYPES[B.en.type]}。${weakTo ? `「${TYPES[weakTo]}」の技に 弱い。` : ''}次の シロの攻撃が 弱点を 突く！`);
      ui.refresh();
      return true;
    }
    return false;
  }

  async function learnFlow(ui, id) {
    const d = data();
    if (d.moves.some(m => m.id === id)) return;
    const mv = MOVES[id];
    if (d.moves.length < 4) { d.moves.push({ id, pp: mv.pp }); ui.se('bt_learn'); await ui.msg(`シロは 新しく ${mv.name}を おぼえた！`); dirty(); return; }
    await ui.msg(`シロは ${mv.name}を おぼえたがっている……`);
    await ui.msg('しかし 技は 4つまでしか 持てない。');
    const k = await ui.learn(id);
    if (k == null || k < 0 || k >= d.moves.length) { await ui.msg(`シロは ${mv.name}を おぼえずに おわった。`); return; }
    const old = MOVES[d.moves[k].id].name;
    d.moves[k] = { id, pp: mv.pp };
    dirty();
    ui.se('bt_learn');
    await ui.msg(`シロは ${old}を わすれて ${mv.name}を おぼえた！`);
  }

  async function runBattle(B, ui) {
    const e = ENEMIES[B.en.id], sd = data();
    await ui.open(B);
    if (B.catch) await ui.msg(`シロは 境界の向こうで 少し育っていたようだ。（Lv${B.catch.from} → Lv${B.catch.to}）`);
    await ui.msg(B.boss ? `${B.en.name}が 立ちはだかった！` : `境界の向こうから ${B.en.name}が あらわれた！`);
    await ui.msg(T(B.assist ? `ユウ「（無線）シロの同期を補強した。もう一回だ！」` : '{name}「シロ、おねがい！」'));
    ui.showMe();
    let turns = 0;
    for (;;) {
      if (++turns > 120) return 'run';
      const c = await ui.command(B);
      if (!c) continue;
      if (c.cmd === 'look') {
        const first = !sd.seen[B.en.id];
        sd.seen[B.en.id] = Math.max(1, sd.seen[B.en.id] | 0); dirty();
        await ui.msg(`${B.en.name}　Lv${B.en.lv}　属性：${TYPES[B.en.type]}`);
        await ui.msg(e.desc);
        if (first) { ui.refresh(); }
        await ui.msg(`シロ　HP ${B.me.hp}／${B.me.max}　同期Lv${S().sync | 0}（技の威力 ×${API.syncBonus().dmg.toFixed(2)}）`);
        continue;
      }
      if (c.cmd === 'run') {
        if (!B.canRun) { await ui.msg('境界に 縫い止められている！ 逃げられない！'); continue; }
        B.runTries++;
        const p = clamp(0.5 + 0.08 * (B.me.lv - B.en.lv) + (B.me.spd - B.en.spd) / Math.max(10, B.en.spd * 4) + 0.2 * (B.runTries - 1), 0.25, 0.97);
        if (rnd() < p) { ui.se('bt_run'); await ui.msg(T('{name}は シロを抱えて うまく 逃げきった！')); return 'run'; }
        await ui.msg('しかし 回りこまれてしまった！');
        await enemyTurn(B, ui);
      } else if (c.cmd === 'item') {
        const used = await useItem(B, ui, c.id);
        if (!used) continue;
        await enemyTurn(B, ui);
      } else if (c.cmd === 'fight') {
        const d = data();
        let slot = d.moves[c.move | 0];
        if (!slot || slot.pp <= 0) slot = d.moves.find(m => m.pp > 0) || null;
        const mid = slot ? slot.id : 'furete';
        if (slot) { slot.pp--; dirty(); }
        else await ui.msg('シロの 技が 尽きている！');
        const meFirst = B.me.spd * stageMul(0) >= B.en.spd || (B.me.spd === B.en.spd && rnd() < 0.5) || MOVES[mid].eff === 'heal';
        if (meFirst) { await useMove(B, ui, 'me', mid); if (B.en.hp > 0) await enemyTurn(B, ui); }
        else { await enemyTurn(B, ui); if (B.me.hp > 0) await useMove(B, ui, 'me', mid); }
      }
      if (B.en.hp <= 0) return 'win';
      if (B.me.hp <= 0) return 'lose';
    }
  }

  async function afterWin(B, ui) {
    ui.se('bt_faint');
    await ui.faint('en');
    await ui.msg(B.boss ? `${B.en.name}の 輪郭が ほどけて 消えた！` : `${B.en.name}は 境界の向こうへ 消えた！`);
    ui.music(B.boss ? 'win_boss' : 'win');
    const sd = data();
    sd.wins++; sd.seen[B.en.id] = Math.max(1, sd.seen[B.en.id] | 0);
    const ex = Math.floor(API.expYield(B.en.id, B.en.lv, B.boss) * (sd.lv < B.en.lv ? 1 + 0.15 * Math.min(4, B.en.lv - sd.lv) : 1));
    if (sd.lv >= CAP) { await ui.msg('シロは もう じゅうぶんに 育っている。'); return; }
    const from = sd.exp, lv0 = sd.lv;
    await ui.msg(`シロは ${ex} の 観測値を 得た！`);
    const ups = gainExp(ex);
    await ui.exp(from, lv0, ups);
    for (const u of ups) {
      ui.se('bt_lvup');
      await ui.lvup(u);
      await ui.msg(`シロは Lv${u.lv}に あがった！`);
      await ui.msg(`HP +${u.gains.hp}　こうげき +${u.gains.atk}　ぼうぎょ +${u.gains.def}　すばやさ +${u.gains.spd}`);
      for (const id of u.learn) await learnFlow(ui, id);
    }
  }

  async function afterLose(B, ui) {
    ui.se('bt_lose');
    await ui.faint('me');
    await ui.msg('シロは 倒れてしまった……');
    const sd = data(); sd.losses++;
    ui.music(null);
    if (B.boss) {
      await ui.msg(T('{name}は シロを抱えて いったん 物陰へ 退いた。'));
    } else {
      await ui.msg(T('{name}は シロを抱えて 研究所へ 逃げ帰った……'));
    }
    await ui.msg('（存在安定度 −20）');
  }

  let BUSY = false;
  API.start = async function (enemyId, opts) {
    opts = opts || {};
    const e = ENEMIES[enemyId];
    if (!e) { console.warn('[KY] battle: 未定義の敵', enemyId); return { result: 'run' }; }
    if (BUSY) return { result: 'run' };
    BUSY = true;
    const ui = HAS_DOM ? DOM_UI : HEADLESS_UI;
    const boss = opts.boss != null ? !!opts.boss : !!e.boss;
    const canRun = boss ? false : opts.canRun !== false;
    const catchInfo = catchUp(opts.chapter != null ? chNum(opts.chapter) : chNum());
    if (boss) API.rest(true);   // ボスの前に一息つく
    const lv = clamp(opts.lv | 0 || (boss ? Math.max(2, floorFor(chNum()) + 2) : API.wildLevel(opts)), 1, CAP);
    const world = String(opts.world || (S() && S().world) || 'A').toUpperCase();
    let pal = opts.pal;
    if (!pal) { try { pal = KY.palOf ? KY.palOf(opts.scene || '', world) : world; } catch (er) { pal = world; } }
    const B = CUR = { en: makeEnemy(enemyId, lv), me: makeMe(opts.assist), boss, canRun, runTries: 0, weak: false, pal: pal || 'A', world, assist: opts.assist | 0, catch: catchInfo, area: opts.area || '' };
    let result = 'run';
    try {
      if (data().hp <= 0) data().hp = 1;
      result = await runBattle(B, ui);
      if (result === 'win') await afterWin(B, ui);
      else if (result === 'lose') await afterLose(B, ui);
    } finally {
      CUR = null; BUSY = false;
      try { await ui.close(result); } catch (er) { if (er === KY.ABORT) throw er; }
    }
    const sd = data();
    sd.cool = 6;
    const out = { result, lv: sd.lv, exp: sd.exp };
    if (result === 'run') sd.runs++;
    if (result === 'lose') {
      if (!boss) {
        // 研究所へ退く：シロは研究所で休む。探索ループは G.slipNow を見て研究所へ戻す
        API.rest(true);
        out.retreat = true; out.home = KY.homeArea ? KY.homeArea() : null;
        try { const s = S(); s.world = 'A'; s.baseWorld = 'A'; G.switchLeft = 0; G.slipNow = true; } catch (er) {}
      }
      // ボス戦の負けで押し戻し（slip）は起こさない：slipped は END B の条件に数えられるため。野生戦は 0 になれば押し戻し
      if (boss) KY.stab(-Math.max(0, Math.min(20, (S().stability || 0) - 1)));
      else KY.stab(-20);
    }
    dirty();
    return out;
  };

  // 章スクリプト用：ボス戦（逃げられない・負けても再挑戦）
  KY.battle = async function (enemyId, opts) {
    opts = Object.assign({}, opts || {});
    if (KY._flush) await KY._flush();
    if (opts.intro) await KY.say(opts.intro);
    let tries = 0;
    for (;;) {
      const r = await API.start(enemyId, Object.assign({}, opts, { boss: opts.boss !== false, assist: tries }));
      if (r.result === 'win' || (opts.boss === false && r.result !== 'lose')) break;
      tries++;
      if (opts.boss === false) break;
      await KY.say(['y:（無線）……大丈夫か。焦るな。', tries === 1 ? 'y:弱点を突け。「ようす」で属性を見て、三すくみで有利な技を選ぶんだ。' : 'y:持ち物も使え。医療用品と安定剤でシロを回復できる。ライトで目をくらませるのも手だ。', 's:……きゅ。', 'n:シロが、もう一度前に出た。']);
    }
    if (opts.flag) KY.flag(opts.flag, true);
    if (opts.outro) await KY.say(opts.outro);
    return { result: 'win', tries };
  };

  /* ═════════════════════════ 研究所で休む（場面 center_* に入ったとき） ═════════════════════════ */
  const origScene = KY.scene;
  if (typeof origScene === 'function' && !origScene.__bt) {
    const wrapped = function (id, world) {
      const r = origScene.apply(this, arguments);
      try { if (/^center_/.test(String(id || '')) && (world || S().world) === 'A' && G.running && KY.has('shiro_met')) API.rest(); } catch (e) {}
      return r;
    };
    wrapped.__bt = true;
    KY.scene = wrapped;
  }

  /* ═════════════════════════ ヘッドレス（テスト用） ═════════════════════════ */
  const AUTO = KY._auto || (KY._auto = {});
  AUTO.battle = AUTO.battle || [];
  AUTO.battleLog = AUTO.battleLog || [];
  const HEADLESS_UI = {
    open() { return Promise.resolve(); }, close() { return Promise.resolve(); },
    msg(t) { AUTO.battleLog.push(t); return Promise.resolve(); },
    command() {
      let c = AUTO.battle.length ? AUTO.battle.shift() : { cmd: 'fight', move: 0 };
      if (typeof c === 'string') c = c === 'fight' ? { cmd: 'fight', move: 0 } : { cmd: c };
      if (typeof c === 'number') c = { cmd: 'fight', move: c };
      if (c.item && !c.cmd) c = { cmd: 'item', id: c.item };
      if (c.move != null && !c.cmd) c.cmd = 'fight';
      return Promise.resolve(c);
    },
    learn() { return Promise.resolve(AUTO.learn != null ? AUTO.learn : 0); },
    hp() { return Promise.resolve(); }, hit() { return Promise.resolve(); }, faint() { return Promise.resolve(); }, fx() { return Promise.resolve(); },
    exp() { return Promise.resolve(); }, lvup() { return Promise.resolve(); },
    se() {}, music() {}, refresh() {}, showMe() {},
  };

  /* ═════════════════════════ 音（矩形波・ノイズ。engine の AudioContext を借りる） ═════════════════════════ */
  const AU = () => KY._au;
  const PW = {};
  function pwave(duty) {
    const c = AU().ctx; const k = duty + '';
    if (PW[k] && PW[k].ctx === c) return PW[k].w;
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    const w = c.createPeriodicWave(re, im); PW[k] = { ctx: c, w }; return w;
  }
  function tone(f, t, dur, o) {
    o = o || {};
    const a = AU(); if (!a || !a.ok) return;
    const c = a.ctx, os = c.createOscillator(), g = c.createGain();
    try { os.setPeriodicWave(pwave(o.duty || 0.5)); } catch (e) { os.type = 'square'; }
    os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.linearRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? 0.035 : o.vol;
    g.gain.setValueAtTime(v, t); g.gain.setValueAtTime(v, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    os.connect(g); g.connect(o.dest || a.out); os.start(t); os.stop(t + dur + 0.03);
  }
  function noise(t, dur, o) {
    o = o || {};
    const a = AU(); if (!a || !a.ok || !a.noise) return;
    const c = a.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = a.noise; f.type = o.type || 'highpass'; f.frequency.value = o.f || 1500;
    const v = o.vol == null ? 0.08 : o.vol, st = 5;
    g.gain.setValueAtTime(v, t); for (let i = 1; i <= st; i++) g.gain.setValueAtTime(v * (1 - i / st) + 0.0001, t + dur * i / st);
    s.connect(f); f.connect(g); g.connect(o.dest || a.out); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const seq = (notes, t, len, o) => notes.forEach((f, i) => { if (f) tone(f, t + i * len, len * 0.92, o); });
  const BSE = {
    bt_start: t => { for (let i = 0; i < 6; i++) tone(1568 - i * 180, t + i * 0.05, 0.05, { duty: 0.25, vol: 0.03 }); noise(t + 0.3, 0.35, { f: 600, vol: 0.06 }); },
    bt_atk: t => { tone(660, t, 0.06, { duty: 0.125, vol: 0.03, to: 1320 }); },
    bt_eatk: t => { tone(330, t, 0.08, { duty: 0.5, vol: 0.03, to: 165 }); },
    bt_hit: t => { noise(t, 0.14, { f: 900, vol: 0.12 }); tone(110, t, 0.08, { duty: 0.5, vol: 0.03 }); },
    bt_hit2: t => { noise(t, 0.22, { f: 500, vol: 0.16 }); tone(98, t, 0.14, { duty: 0.5, vol: 0.04, to: 55 }); noise(t + 0.1, 0.12, { f: 2600, vol: 0.06 }); },
    bt_hit0: t => { noise(t, 0.08, { f: 2400, vol: 0.06 }); },
    bt_down: t => { tone(880, t, 0.25, { duty: 0.25, vol: 0.03, to: 220 }); },
    bt_heal: t => { seq([523, 659, 784, 659, 784, 1047], t, 0.06, { duty: 0.25, vol: 0.03 }); },
    bt_light: t => { tone(2093, t, 0.18, { duty: 0.125, vol: 0.025, to: 3136 }); noise(t, 0.2, { f: 4000, vol: 0.05 }); },
    bt_scan: t => { tone(600, t, 0.5, { duty: 0.125, vol: 0.022, to: 1800 }); tone(1800, t + 0.52, 0.08, { duty: 0.25, vol: 0.03 }); },
    bt_faint: t => { tone(523, t, 0.5, { duty: 0.5, vol: 0.035, to: 65 }); noise(t + 0.25, 0.35, { f: 400, vol: 0.06 }); },
    bt_lose: t => { seq([392, 349, 311, 262], t, 0.16, { duty: 0.5, vol: 0.03 }); },
    bt_run: t => { seq([262, 330, 392, 523], t, 0.045, { duty: 0.25, vol: 0.03 }); noise(t, 0.2, { f: 3000, vol: 0.03 }); },
    // 経験値・Lv アップ・技を覚える（オリジナルの短い音型）
    bt_exp: t => { for (let i = 0; i < 8; i++) tone(988 + i * 60, t + i * 0.035, 0.03, { duty: 0.125, vol: 0.02 }); },
    bt_lvup: t => { seq([587, 740, 880, 0, 740, 880, 1175], t, 0.085, { duty: 0.25, vol: 0.035 }); seq([294, 0, 440, 0, 370, 0, 587], t, 0.085, { duty: 0.5, vol: 0.02 }); },
    bt_learn: t => { seq([784, 988, 1175, 1568], t, 0.07, { duty: 0.25, vol: 0.03 }); },
    bt_phase: t => { tone(220, t, 0.4, { duty: 0.5, vol: 0.035, to: 880 }); noise(t, 0.4, { f: 1200, vol: 0.06 }); },
    bt_sel: t => { tone(1175, t, 0.03, { duty: 0.25, vol: 0.022 }); },
  };
  function se(name) {
    const a = AU(); if (!a || !a.ok) return;
    try { BSE[name] && BSE[name](a.ctx.currentTime + 0.01); } catch (e) {}
  }
  API.se = se;
  // 戦闘の曲（短いループ。オリジナル）：低音のパルス＋上の分散和音
  const MUS = { iv: 0, next: 0, step: 0, kind: null };
  const SONGS = {
    wild: { bpm: 168, bass: [110, 0, 110, 131, 0, 110, 147, 0, 98, 0, 98, 117, 0, 98, 131, 0], lead: [440, 523, 659, 523, 494, 587, 698, 587, 392, 494, 587, 494, 440, 523, 659, 784] },
    boss: { bpm: 176, bass: [82, 82, 0, 82, 98, 0, 87, 0, 82, 82, 0, 82, 110, 0, 104, 0], lead: [330, 0, 311, 330, 392, 0, 370, 349, 330, 0, 311, 330, 440, 415, 392, 370] },
    win: { bpm: 150, once: true, bass: [196, 0, 247, 0, 294, 0, 392, 0], lead: [784, 988, 1175, 988, 1175, 1568, 0, 1568] },
    win_boss: { bpm: 140, once: true, bass: [131, 0, 165, 0, 196, 0, 262, 0, 196, 262, 0, 0], lead: [523, 659, 784, 1047, 0, 988, 1047, 0, 1319, 0, 1568, 0] },
  };
  function musicStop() { if (MUS.iv) { clearInterval(MUS.iv); MUS.iv = 0; } MUS.kind = null; }
  function music(kind) {
    musicStop();
    const a = AU(); if (!kind || !a || !a.ok || !SONGS[kind]) return;
    const sg = SONGS[kind], len = 60 / sg.bpm / 2;
    MUS.kind = kind; MUS.step = 0; MUS.next = a.ctx.currentTime + 0.05;
    const tickM = () => {
      const c = AU().ctx; if (!c) return;
      while (MUS.next < c.currentTime + 0.25) {
        const i = MUS.step;
        if (sg.once && i >= sg.lead.length) { musicStop(); return; }
        const k = i % sg.lead.length;
        if (sg.bass[k % sg.bass.length]) tone(sg.bass[k % sg.bass.length], MUS.next, len * 0.9, { duty: 0.5, vol: 0.022 });
        if (sg.lead[k]) tone(sg.lead[k], MUS.next, len * 0.7, { duty: 0.25, vol: 0.014 });
        MUS.next += len; MUS.step++;
      }
    };
    tickM();
    MUS.iv = setInterval(tickM, 90);
  }
  API.music = music;
  if (KY._reset) KY._reset.push(() => { musicStop(); BUSY = false; CUR = null; if (BT && BT.h) { try { BT.h.close(); } catch (e) {} } BT = null; });

  /* ═════════════════════════ ドット絵（境界生物・シロの後ろ姿） ═════════════════════════ */
  // 40×40 の格子に 4 階調（0 いちばん濃い〜3 いちばん明るい、-1 透明）で描き、最後に輪郭（0）を自動で付ける。
  const N = 40;
  function grid() {
    const g = new Int8Array(N * N).fill(-1);
    const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= N || y >= N) return; g[y * N + x] = c; };
    const get = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? -1 : g[y * N + x];
    const o = {
      g, set, get,
      px: set,
      rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); },
      ell(cx, cy, rx, ry, c) {
        for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, r = dx * dx + dy * dy;
          if (r <= 1) set(x, y, typeof c === 'function' ? c(dx, dy, x, y, r) : c);
        }
      },
      // 立体：明るい面・影・ハイライト
      blob(cx, cy, rx, ry, lit, dark, hi) {
        o.ell(cx, cy, rx, ry, (dx, dy, x, y) => {
          if (hi != null && (dx + 0.45) * (dx + 0.45) + (dy + 0.5) * (dy + 0.5) < 0.07) return hi;
          const s = dx * 0.55 + dy * 0.85;
          if (s > 0.62) return dark;
          if (s > 0.42) return ((x + y) & 1) ? dark : lit;
          return lit;
        });
      },
      line(x0, y0, x1, y1, c) {
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
        for (let k = 0; k < 200; k++) { set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
      },
      poly(pts, c) {
        let y0 = 1e9, y1 = -1e9; for (let i = 1; i < pts.length; i += 2) { y0 = Math.min(y0, pts[i]); y1 = Math.max(y1, pts[i]); }
        for (let y = Math.floor(y0); y <= y1; y++) {
          const xs = []; const yy = y + 0.5;
          for (let i = 0; i < pts.length; i += 2) { const ax = pts[i], ay = pts[i + 1], bx = pts[(i + 2) % pts.length], by = pts[(i + 3) % pts.length]; if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + (yy - ay) * (bx - ax) / (by - ay)); }
          xs.sort((a, b) => a - b);
          for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) set(x, y, typeof c === 'function' ? c(x, y) : c);
        }
      },
      dith(x, y, w, h, c, ph) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((x + i + y + j + (ph | 0)) & 1) === 0 && get(x + i, y + j) >= 0) set(x + i, y + j, c); },
      outline(c) {
        c = c == null ? 0 : c;
        const add = [];
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          if (g[y * N + x] >= 0) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const v = get(x + dx, y + dy); if (v > 0) { add.push(y * N + x); break; } }
        }
        add.forEach(i => { g[i] = c; });
      },
    };
    return o;
  }
  // 決まった乱数（絵がちらつかないように）
  function srnd(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  const DRAW = {
    noise_mushi(s, f) {
      s.blob(13, 26, 6, 5, 2, 1); s.blob(20, 24, 6, 6, 2, 1); s.blob(27, 21, 6, 6, 2, 1, 3);
      s.line(16, 21, 16, 30, 1); s.line(23, 19, 23, 29, 1);
      s.px(28, 20, 0); s.px(31, 20, 0); s.px(28, 19, 3); s.px(31, 19, 3);
      s.line(28, 16, 25 - f, 9, 0); s.line(31, 16, 35 + f, 9, 0); s.px(25 - f, 8, 1); s.px(35 + f, 8, 1);
      for (let i = 0; i < 4; i++) { s.line(11 + i * 5, 30, 9 + i * 5, 34, 0); }
      const r = srnd(7 + f * 13); for (let i = 0; i < 14; i++) s.px(4 + r() * 32, 4 + r() * 32, r() < 0.5 ? 1 : 2);
    },
    kodama(s, f) {
      // 巻き貝のような空洞の殻
      s.blob(20, 23, 12, 10, 2, 1, 3);
      s.ell(17, 23, 6, 6, 3); s.ell(17, 23, 3.5, 3.5, 0);
      for (let a = 0; a < 6.2; a += 0.35) s.px(17 + Math.cos(a) * (6 + a * 0.9), 23 + Math.sin(a) * (6 + a * 0.75), 1);
      s.px(28, 18, 0); s.px(28, 17, 3);
      // こだまの輪
      for (let k = 0; k < 2; k++) { const r = 4 + k * 3 + f; for (let a = -0.9; a < 0.9; a += 0.25) s.px(34 + Math.cos(a) * r - 4, 16 + Math.sin(a) * r, 1); }
    },
    otokage(s, f) {
      s.ell(20, 33, 14, 4, 1); s.dith(6, 30, 28, 7, 0, f);
      s.poly([15, 33, 17, 12, 20, 7, 23, 12, 25, 33], 1);
      s.dith(15, 8, 11, 25, 0, 1);
      s.rect(17, 13, 2, 2, 3); s.rect(22, 13, 2, 2, 3);
      s.line(17, 18, 11 - f, 24, 1); s.line(23, 18, 29 + f, 24, 1);
    },
    shizuku(s, f) {
      s.poly([20, 6 + f, 29, 24, 20, 33, 11, 24], 1);
      s.blob(20, 25, 9, 8, 1, 0);
      s.dith(12, 20, 16, 12, 0, f);
      s.rect(16, 24, 2, 3, 3); s.rect(23, 24, 2, 3, 3);
      s.line(18, 30, 22, 30, 3);
      s.px(13, 35 + f, 1); s.px(27, 36 - f, 1);
    },
    tokeikui(s, f) {
      s.ell(20, 18, 12, 12, 0); s.blob(20, 18, 11, 11, 3, 2);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s.px(20 + Math.cos(a) * 9, 18 + Math.sin(a) * 9, 1); }
      s.line(20, 18, 20, 11, 0); s.line(20, 18, 25 + f, 21, 0);
      // 歯の並んだ口
      s.rect(10, 28, 20, 5, 0); for (let i = 0; i < 5; i++) { s.poly([11 + i * 4, 28, 14 + i * 4, 28, 12.5 + i * 4, 31], 3); }
      s.line(13, 33, 11, 37, 0); s.line(27, 33, 29, 37, 0);
    },
    densen(s, f) {
      s.line(0, 30, 39, 28, 0); s.line(0, 31, 39, 29, 1);
      s.blob(20, 22, 8, 6, 2, 1, 3); s.blob(27, 17, 4, 4, 2, 1);
      s.poly([30, 16, 36, 17, 30, 19], 0);
      s.px(27, 16, 0);
      s.poly([12, 20, 6, 17 + f, 13, 24], 1);
      s.line(18, 28, 18, 29, 0); s.line(22, 28, 22, 29, 0);
      for (let k = 0; k < 3; k++) for (let x = 0; x < 8; x++) s.px(31 + x, 8 + k * 3 + Math.round(Math.sin((x + f * 2) * 1.2) * 1), 1);
    },
    kanban(s, f) {
      s.rect(9 + f, 7, 22, 14, 1); s.rect(7, 9, 22, 14, 2); s.rect(9, 11, 18, 10, 3);
      s.rect(11, 13, 4, 6, 0); s.rect(17, 13, 3, 6, 1); s.rect(22, 14, 3, 5, 0);
      s.rect(11, 23, 2, 13, 1); s.rect(24, 23, 2, 13, 1);
      s.px(13, 16, 3); s.px(23, 16, 3);
    },
    kaisatsu(s, f) {
      s.ell(20, 12, 11, 7, 1); s.blob(20, 12, 10, 6, 1, 0); s.rect(8, 15, 24, 3, 0); s.rect(6, 17, 28, 2, 1);
      s.rect(17, 8, 6, 3, 2);
      s.rect(10, 19, 20, 14, 0); s.dith(10, 19, 20, 14, 1, f);
      s.rect(14, 23, 3, 2, 3); s.rect(23, 23, 3, 2, 3);
      s.rect(15, 28, 10, 2, 3); s.rect(16, 28, 8, 1, 2);
      s.rect(9, 33, 22, 3, 2);
    },
    hakushi(s, f) {
      s.ell(20, 12, 7, 8, 3); s.poly([12, 20, 28, 20, 31, 36, 9, 36], 3);
      s.poly([27, 30, 31, 36, 27, 36], 2);
      s.line(13, 22, 7, 28 + f, 3); s.line(27, 22, 33, 28 - f, 3);
      s.px(17, 12, 1); s.px(23, 12, 1);
      s.dith(10, 31, 20, 5, 2, 1);
    },
    utsuri(s, f) {
      s.rect(7, 6, 26, 30, 3); s.rect(9, 8, 22, 22, 1); s.dith(9, 8, 22, 22, 2, f);
      s.ell(20 + f, 16, 4, 5, 0); s.poly([13 + f, 30, 15 + f, 22, 25 + f, 22, 27 + f, 30], 0);
      s.ell(22 - f, 15, 4, 5, 1);
      s.px(19 + f, 15, 3); s.px(22 + f, 15, 3);
    },
    ushirogami(s, f) {
      s.ell(20, 12, 10, 9, 0);
      s.poly([10, 12, 30, 12, 33, 36, 7, 36], 0);
      for (let i = 0; i < 9; i++) s.line(11 + i * 2.4, 12, 9 + i * 2.8 + ((i + f) % 2), 36, 1);
      s.dith(12, 6, 16, 6, 1, 0);
      s.px(14, 37, 0); s.px(20, 38, 0); s.px(26, 37, 0);
    },
    sakasa(s, f) {
      // 逆さの汽笛（ベルが下向き）、湯気が下へ
      s.rect(17, 4, 6, 6, 1); s.rect(15, 9, 10, 3, 0);
      s.poly([14, 12, 26, 12, 30, 28, 10, 28], 2); s.dith(14, 12, 16, 16, 1, 0);
      s.rect(9, 27, 22, 3, 1); s.rect(14, 18, 2, 2, 3); s.rect(24, 18, 2, 2, 3);
      for (let k = 0; k < 3; k++) s.blob(13 + k * 7, 33 + ((k + f) % 2), 3, 2.5, 3, 2);
    },
    musubikuzu(s, f) {
      const r = srnd(31);
      for (let k = 0; k < 6; k++) { let a = r() * 6.3; let x = 20, y = 20; for (let i = 0; i < 26; i++) { a += (r() - 0.5) * 1.3; x += Math.cos(a) * 1.1; y += Math.sin(a) * 1.1; s.px(x, y, k % 2 ? 1 : 2); } }
      s.blob(20, 20, 5, 5, 1, 0); s.px(19 + f, 19, 3); s.px(21, 21 - f, 3);
    },
    yodomi(s, f) {
      s.blob(20, 22, 15, 12, 1, 0);
      s.ell(10, 15, 6, 6, 1); s.ell(29, 14, 7, 6, 1); s.ell(20, 11, 8, 6, 1);
      s.dith(5, 8, 30, 26, 0, f);
      [[13, 19], [26, 18], [19, 24], [30, 25], [10, 26]].forEach(([x, y], i) => { s.rect(x, y, 2, i === 2 ? 3 : 2, 3); });
      for (let i = 0; i < 5; i++) s.line(9 + i * 6, 32, 9 + i * 6 + ((i + f) % 2), 36 + (i % 2) * 2, 1);
    },
    yodomi_nigori(s, f) {
      s.blob(20, 21, 17, 15, 1, 0);
      s.ell(8, 12, 6, 7, 0); s.ell(32, 11, 6, 7, 0); s.ell(20, 7, 8, 5, 1);
      s.dith(3, 4, 34, 32, 0, f);
      s.poly([11, 22, 29, 22, 26, 27, 14, 27], 0); for (let i = 0; i < 6; i++) s.px(13 + i * 3, 23 + (i % 2), 3);
      [[13, 15], [26, 15], [20, 12]].forEach(([x, y]) => { s.rect(x, y, 3, 2, 3); s.px(x + 1, y + 1, 0); });
      for (let i = 0; i < 6; i++) s.line(5 + i * 6, 33, 3 + i * 6 + ((i + f) % 3), 39, 1);
    },
    kikou9(s, f) {
      // 三脚に載った大きなレンズ
      s.line(20, 26, 8, 39, 0); s.line(20, 26, 32, 39, 0); s.line(20, 26, 20, 39, 1);
      s.ell(20, 16, 14, 14, 0); s.blob(20, 16, 13, 13, 2, 1);
      s.ell(20, 16, 9, 9, 1); s.ell(20, 16, 6.5, 6.5, 3); s.ell(20 + f, 16, 3.5, 3.5, 0); s.px(19 + f, 15, 3);
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; s.px(20 + Math.cos(a) * 11.5, 16 + Math.sin(a) * 11.5, 3); }
      s.line(31, 22, 37, 30, 1); s.line(9, 22, 3, 31, 1);
    },
    musubi_ban(s, f, o) {
      const r = srnd(91 + (o && o.phase === 2 ? 5 : 0));
      for (let k = 0; k < 12; k++) { const a0 = k / 12 * 6.283 + f * 0.1; let x = 20, y = 20; let a = a0; for (let i = 0; i < 22; i++) { a += (r() - 0.5) * 0.6; x += Math.cos(a) * 0.9; y += Math.sin(a) * 0.9; s.px(x, y, k % 3 === 0 ? 3 : k % 3 === 1 ? 2 : 1); } }
      s.blob(20, 20, 9, 9, o && o.phase === 2 ? 2 : 1, 0, 3);
      s.ell(20, 20, 4, 4, 0); s.ell(20, 20, 2, 2, o && o.phase === 2 ? 3 : 2);
    },
    // シロ（後ろ姿）
    shiro_back(s, f) {
      // 丸い白いからだ（輪郭がわずかに波打つ）＋小さな丸い耳
      s.ell(13, 17 - f, 3.2, 4.2, 3); s.ell(27, 17 + f, 3.2, 4.2, 3);
      for (let y = 14; y < 40; y++) for (let x = 2; x < 38; x++) {
        const dx = (x + 0.5 - 20) / 14, dy = (y + 0.5 - 27) / 11.5;
        const a = Math.atan2(dy, dx), rr = 1 + 0.05 * Math.sin(a * 5 + f * 1.7) + 0.04 * Math.sin(a * 3 - f);
        if (dx * dx + dy * dy <= rr * rr) s.px(x, y, (dx * 0.35 + dy * 0.9 > 0.62) ? (((x + y) & 1) ? 2 : 3) : 3);
      }
      // 輪郭のゆらぎ（白い点）
      const r = srnd(17 + f * 3); for (let i = 0; i < 9; i++) { const a = -r() * 3.1; s.px(20 + Math.cos(a) * (16 + r() * 2), 27 + Math.sin(a) * (13 + r() * 2), 3); }
    },
  };
  const SPR = {};
  function sprite(id, frame, opt) {
    const k = id + ':' + frame + ':' + (opt && opt.phase || 1);
    if (SPR[k]) return SPR[k];
    const s = grid();
    try { (DRAW[id] || DRAW.shizuku)(s, frame, opt || {}); } catch (e) { console.warn('[KY] battle sprite', id, e); }
    s.outline(0);
    return (SPR[k] = s.g);
  }
  API.sprite = sprite;
  const PAL_DEF = { A: ['#0f380f', '#306230', '#8bac0f', '#cadc9f'], B: ['#2a1a0c', '#6e4a26', '#c09058', '#f2e2bc'], C: ['#0c1219', '#384a5c', '#8a9cac', '#dfe7ec'], S: ['#1b0f2e', '#4e3478', '#a688d4', '#ece2fa'], X: ['#04201e', '#17605a', '#5fc4b4', '#e2fbf4'], R: ['#240608', '#7a1a28', '#e0606e', '#fbe0e0'] };
  const palColors = k => { try { if (root.KY_ART && KY_ART.gb && KY_ART.gb.PAL[k]) return KY_ART.gb.PAL[k]; } catch (e) {} return PAL_DEF[k] || PAL_DEF.A; };
  function paint(cv, g, pal, invert) {
    const ctx = cv.getContext('2d');
    const P = palColors(pal).map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    const im = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const v = g[i]; if (v < 0) continue;
      const c = P[invert ? 3 - v : v];
      im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = 255;
    }
    ctx.clearRect(0, 0, N, N); ctx.putImageData(im, 0, 0);
  }
  API.paint = paint;

  /* ═════════════════════════ 画面（DOM） ═════════════════════════ */
  let BT = null;
  const DOM_UI = {};
  if (HAS_DOM) {
    const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const pend = KY._pend;
    const R = () => KY.reduced();
    const sleep = ms => pend(done => setTimeout(done, R() ? Math.min(ms, 60) : ms));
    const SPEED = { slow: 22, normal: 40, fast: 85, instant: 0 };

    function hpBar(cls) {
      const w = $('div', 'bt-hp ' + (cls || ''));
      w.innerHTML = '<span class="bt-hpl">HP</span><i class="bt-hpbar"><b></b></i>';
      return w;
    }
    function setHp(el, v, max) { const b = el.querySelector('b'); const r = max ? v / max : 0; b.style.width = (r * 100).toFixed(1) + '%'; el.dataset.lv = r <= 0.2 ? '2' : r <= 0.5 ? '1' : '0'; }

    function build(B) {
      const h = KY._openOv('ov-battle', { label: '境界生物との戦闘' });
      h.el.dataset.bpal = B.pal;
      h.el.dataset.boss = B.boss ? '1' : '';
      const scr = $('div', 'bt-screen');
      const field = $('div', 'bt-field');
      // 敵
      const ebox = $('div', 'bt-box bt-ebox');
      const en = $('div', 'bt-name'); en.append($('span', 'bt-nm', B.en.name), $('span', 'bt-lv', ':L' + B.en.lv));
      const et = $('div', 'bt-type');
      const ehp = hpBar('en');
      ebox.append(en, et, ehp);
      const eslot = $('div', 'bt-slot bt-eslot'); const ecv = $('canvas', 'bt-spr bt-espr'); ecv.width = N; ecv.height = N; ecv.setAttribute('aria-hidden', 'true');
      const eplat = $('i', 'bt-plat'); eslot.append(eplat, ecv);
      // シロ
      const pslot = $('div', 'bt-slot bt-pslot'); const pcv = $('canvas', 'bt-spr bt-pspr'); pcv.width = N; pcv.height = N; pcv.setAttribute('aria-hidden', 'true');
      const pplat = $('i', 'bt-plat'); pslot.append(pplat, pcv);
      const pbox = $('div', 'bt-box bt-pbox');
      const pn = $('div', 'bt-name'); pn.append($('span', 'bt-nm', 'シロ'), $('span', 'bt-lv', ':L' + B.me.lv));
      const php = hpBar('me');
      const pnum = $('div', 'bt-num');
      const pexp = $('div', 'bt-exp'); pexp.innerHTML = '<span class="bt-hpl">EXP</span><i class="bt-expbar"><b></b></i>';
      pbox.append(pn, php, pnum, pexp);
      field.append(ebox, eslot, pslot, pbox);
      // 下：メッセージ＋コマンド
      const bottom = $('div', 'bt-bottom');
      const msg = $('div', 'bt-msg'); msg.setAttribute('role', 'log'); msg.setAttribute('aria-live', 'polite');
      const mt = $('div', 'bt-mt'); const mn = $('span', 'bt-next', '▼'); msg.append(mt, mn);
      const menu = $('div', 'bt-menu'); menu.hidden = true;
      bottom.append(msg, menu);
      const wipe = $('div', 'bt-wipe');
      scr.append(field, bottom);
      h.el.append(scr, wipe);
      h.esc = () => {};
      BT = { h, B, scr, field, ebox, et, ehp, ecv, eslot, pcv, pslot, pbox, php, pnum, pexp, msg, mt, mn, menu, wipe, adv: null, mode: 'msg', frame: 0, hidden: { en: false, me: true }, raf: 0 };
      h.key = onKey;
      msg.addEventListener('click', e => { e.stopPropagation(); if (BT && BT.adv) BT.adv(); });
      field.addEventListener('click', () => { if (BT && BT.adv) BT.adv(); });
      refresh();
      setHp(ehp, B.en.hp, B.en.max);
      paintMe(); updMe(B.me.hp);
      // 待機中の小さな揺れ（2 コマ）
      let last = 0;
      const loop = ts => {
        if (!BT) return;
        BT.raf = requestAnimationFrame(loop);
        if (ts - last < (R() ? 900 : 450)) return;
        last = ts; BT.frame ^= 1; drawSprites();
      };
      BT.raf = requestAnimationFrame(loop);
      drawSprites();
      return BT;
    }
    function drawSprites() {
      if (!BT) return;
      const B = BT.B;
      paint(BT.ecv, sprite(B.en.id, BT.frame, { phase: B.en.phase }), B.pal, BT.inv === 'en');
      paint(BT.pcv, sprite('shiro_back', BT.frame), B.pal, BT.inv === 'me');
    }
    function paintMe() { drawSprites(); }
    function updMe(v) {
      if (!BT) return;
      const B = BT.B;
      setHp(BT.php, v, B.me.max);
      BT.pnum.textContent = `${Math.max(0, Math.round(v))}／${B.me.max}`;
      const d = data();
      const a = expAt(d.lv), b = expAt(Math.min(CAP, d.lv + 1));
      BT.pexp.querySelector('b').style.width = (d.lv >= CAP ? 100 : clamp((d.exp - a) / Math.max(1, b - a), 0, 1) * 100).toFixed(1) + '%';
    }
    function refresh() {
      if (!BT) return;
      const B = BT.B, seen = data().seen[B.en.id];
      BT.et.textContent = seen ? '属性／' + TYPES[B.en.type] : '属性／？';
      BT.et.dataset.t = seen ? B.en.type : '';
    }

    function onKey(e) {
      if (!BT) return true;
      const k = e.key;
      if (BT.mode === 'msg') {
        if (k === 'Enter' || k === ' ' || k === 'z' || k === 'Z' || k === 'x' || k === 'X') { e.preventDefault(); BT.adv && BT.adv(); }
        return true;
      }
      const bs = [...BT.menu.querySelectorAll('button:not([disabled])')];
      const i = bs.indexOf(document.activeElement);
      const cols = BT.menu.dataset.cols ? +BT.menu.dataset.cols : 2;
      const mv = d => { e.preventDefault(); const n = i < 0 ? 0 : clamp(i + d, 0, bs.length - 1); bs[n] && bs[n].focus(); se('bt_sel'); };
      if (k === 'ArrowRight') mv(1); else if (k === 'ArrowLeft') mv(-1);
      else if (k === 'ArrowDown') mv(cols); else if (k === 'ArrowUp') mv(-cols);
      else if (k === 'Enter' || k === ' ' || k === 'z' || k === 'Z') { e.preventDefault(); (bs[i] || bs[0]) && (bs[i] || bs[0]).click(); }
      else if (k === 'Escape' || k === 'x' || k === 'X' || k === 'Backspace') { e.preventDefault(); BT.back && BT.back(); }
      else if (/^[1-9]$/.test(k) && bs[+k - 1]) { e.preventDefault(); bs[+k - 1].click(); }
      return true;
    }

    function typeText(el, text) {
      const cps = SPEED[KY.settings.speed] == null ? 40 : SPEED[KY.settings.speed];
      const chars = Array.from(text);
      if (!cps || R() && cps < 40 || chars.length < 2) { el.textContent = text; return { skip() {}, done: Promise.resolve() }; }
      let n = 0, fin = false, iv = 0, res;
      const done = new Promise(r => { res = r; });
      iv = setInterval(() => { n += Math.max(1, Math.round(cps / 30)); if (n >= chars.length) { clearInterval(iv); el.textContent = text; fin = true; res(); return; } el.textContent = chars.slice(0, n).join(''); }, 1000 / 30);
      return { skip() { if (fin) return; clearInterval(iv); el.textContent = text; fin = true; res(); }, done };
    }

    Object.assign(DOM_UI, {
      async open(B) {
        if (KY._hideDlg) KY._hideDlg();
        build(B);
        BT.mt.textContent = '';
        se('bt_start');
        music(B.boss ? 'boss' : 'wild');
        // 入り：画面が横縞で閉じて開く（GB 風）→ 敵が左から、シロが右から滑り込む
        BT.scr.classList.add('enter');
        BT.wipe.classList.add('on');
        await sleep(620);
        BT.wipe.classList.remove('on'); BT.wipe.classList.add('off');
        BT.scr.classList.add('slide');
        await sleep(560);
        BT.scr.classList.remove('enter', 'slide');
        BT.wipe.remove();
      },
      showMe() { if (BT) { BT.pslot.classList.add('in'); BT.pbox.classList.add('in'); } },
      msg(text) {
        return pend(done => {
          if (!BT) return done();
          BT.mode = 'msg'; BT.menu.hidden = true; BT.msg.classList.remove('menuon');
          BT.mn.hidden = true;
          const tt = typeText(BT.mt, T(text));
          let typing = true;
          tt.done.then(() => { typing = false; if (BT) BT.mn.hidden = false; });
          BT.msg.dataset.wait = '1';
          BT.adv = () => { if (typing) { tt.skip(); return; } BT.adv = null; BT.msg.dataset.wait = ''; KY.se && KY.se('tap'); done(); };
        });
      },
      command(B) {
        return pend(done => {
          if (!BT) return done(null);
          const d = data();
          const fin = v => { BT.back = null; BT.menu.hidden = true; BT.msg.classList.remove('menuon'); done(v); };
          const showTop = () => {
            BT.mode = 'menu'; BT.back = null;
            BT.mt.textContent = 'シロは どうする？'; BT.mn.hidden = true; BT.msg.dataset.wait = '';
            BT.msg.classList.add('menuon');
            const m = BT.menu; m.innerHTML = ''; m.hidden = false; m.dataset.cols = 2; m.dataset.kind = 'top';
            [['fight', 'たたかう'], ['item', 'もちもの'], ['look', 'ようす'], ['run', 'にげる']].forEach(([id, lb]) => {
              const b = KY._button(lb, () => { if (id === 'fight') showMoves(); else if (id === 'item') showItems(); else fin({ cmd: id }); }, 'bt-cmd');
              b.dataset.cmd = id; m.appendChild(b);
            });
            setTimeout(() => { try { m.querySelector('button').focus({ preventScroll: true }); } catch (e) {} }, 20);
          };
          const showMoves = () => {
            BT.back = showTop;
            const m = BT.menu; m.innerHTML = ''; m.dataset.cols = 2; m.dataset.kind = 'moves';
            const info = $('div', 'bt-minfo');
            const grid = $('div', 'bt-mgrid');
            const known = data().seen[B.en.id];
            d.moves.forEach((sl, i) => {
              const mv = MOVES[sl.id];
              const b = KY._button('', () => fin({ cmd: 'fight', move: i }), 'bt-move');
              b.append($('span', 'bt-mn', mv.name), $('span', 'bt-mpp', sl.pp + '／' + mv.pp));
              b.dataset.type = mv.type;
              if (known && mv.pow) { const x = typeMul(mv.type, B.en.type); if (x !== 1) b.appendChild($('span', 'bt-meff', x > 1 ? '◎' : '△')); }
              if (sl.pp <= 0) b.disabled = true;
              const show = () => { info.textContent = `属性／${TYPES[mv.type]}　${mv.pow ? '威力 ' + mv.pow : '補助'}　のこり ${sl.pp}／${mv.pp}\n${T(mv.desc || '')}`; };
              b.addEventListener('focus', show); b.addEventListener('mouseenter', show);
              grid.appendChild(b);
            });
            if (d.moves.every(sl => sl.pp <= 0)) { const b = KY._button('ふれる（技が尽きた）', () => fin({ cmd: 'fight', move: 0 }), 'bt-move'); grid.appendChild(b); }
            const back = KY._button('もどる', showTop, 'bt-back');
            m.append(grid, info, back);
            info.textContent = '技を えらぶ　（◎ 弱点／△ いまひとつ）';
            setTimeout(() => { try { const f = grid.querySelector('button:not([disabled])'); f && f.focus({ preventScroll: true }); } catch (e) {} }, 20);
          };
          const showItems = () => {
            BT.back = showTop;
            const m = BT.menu; m.innerHTML = ''; m.dataset.cols = 1; m.dataset.kind = 'items';
            const it = S().items;
            const L = [
              ['med', '医療用品', 'シロの HP を半分ほど回復', true],
              ['stab', '境界安定剤', 'シロの HP 全快・下がった力を戻す', true],
              ['light', '懐中電灯', '光で目をくらませる（3 ターン 当たりにくい）', !KY.hasEquip || KY.hasEquip('flashlight')],
              ['battery', '端末スキャン', '電力 1：属性と弱点を見抜き、次の攻撃が弱点を突く', !KY.hasEquip || KY.hasEquip('phone')],
            ];
            const list = $('div', 'bt-ilist');
            L.forEach(([id, nm, ds, ok]) => {
              const n = it[id] | 0;
              const b = KY._button('', () => fin({ cmd: 'item', id }), 'bt-item');
              b.append($('span', 'bt-in', (KY.itemName && id !== 'battery' && id !== 'light' ? KY.itemName(id) : nm)), $('span', 'bt-ic', '×' + n), $('span', 'bt-id', ds));
              b.dataset.item = id;
              if (!ok || n <= 0) b.disabled = true;
              list.appendChild(b);
            });
            m.append(list, KY._button('もどる', showTop, 'bt-back'));
            setTimeout(() => { try { const f = list.querySelector('button:not([disabled])') || m.querySelector('.bt-back'); f && f.focus({ preventScroll: true }); } catch (e) {} }, 20);
          };
          showTop();
        });
      },
      learn(id) {
        return pend(done => {
          if (!BT) return done(-1);
          const d = data();
          BT.mode = 'menu'; BT.mt.textContent = `${MOVES[id].name}を おぼえる？　わすれる技を えらぶ`; BT.mn.hidden = true; BT.msg.classList.add('menuon');
          const m = BT.menu; m.innerHTML = ''; m.hidden = false; m.dataset.cols = 2; m.dataset.kind = 'learn';
          const grid = $('div', 'bt-mgrid');
          const fin = v => { BT.back = null; m.hidden = true; BT.msg.classList.remove('menuon'); done(v); };
          d.moves.forEach((sl, i) => { const mv = MOVES[sl.id]; const b = KY._button('', () => fin(i), 'bt-move'); b.append($('span', 'bt-mn', mv.name), $('span', 'bt-mpp', TYPES[mv.type] + (mv.pow ? ' ' + mv.pow : ''))); grid.appendChild(b); });
          const nv = MOVES[id];
          const info = $('div', 'bt-minfo', `新しい技：${nv.name}　属性／${TYPES[nv.type]}　${nv.pow ? '威力 ' + nv.pow : '補助'}\n${T(nv.desc || '')}`);
          const no = KY._button('おぼえない', () => fin(-1), 'bt-back');
          BT.back = () => fin(-1);
          m.append(grid, info, no);
          setTimeout(() => { try { grid.querySelector('button').focus({ preventScroll: true }); } catch (e) {} }, 20);
        });
      },
      hp(side, from, to) {
        if (!BT) return Promise.resolve();
        const B = BT.B, max = side === 'me' ? B.me.max : B.en.max, el = side === 'me' ? BT.php : BT.ehp;
        const steps = Math.max(1, Math.min(40, Math.abs(Math.round(from - to))));
        const dur = R() ? 80 : Math.min(1100, 250 + Math.abs(from - to) / max * 900);
        return pend(done => {
          let i = 0;
          const iv = setInterval(() => {
            if (!BT) { clearInterval(iv); return done(); }
            i++;
            const v = from + (to - from) * Math.min(1, i / steps);
            setHp(el, v, max);
            if (side === 'me') updMe(v);
            if (i >= steps) { clearInterval(iv); done(); }
          }, dur / steps);
        });
      },
      async hit(side, mul) {
        if (!BT) return;
        const cv = side === 'me' ? BT.pcv : BT.ecv;
        if (mul > 1 && !R()) { BT.scr.classList.remove('shake'); void BT.scr.offsetWidth; BT.scr.classList.add('shake'); }
        for (let i = 0; i < (R() ? 1 : 4); i++) { cv.style.visibility = 'hidden'; await sleep(70); cv.style.visibility = ''; await sleep(70); }
        BT.scr.classList.remove('shake');
      },
      async fx(side, kind) {
        if (!BT) return;
        if (kind === 'flash' || kind === 'scan' || kind === 'phase') {
          BT.inv = side; drawSprites();
          const fl = $('div', 'bt-flash ' + kind); BT.field.appendChild(fl);
          await sleep(kind === 'scan' ? 520 : 300);
          fl.remove(); BT.inv = null; drawSprites();
          if (kind === 'phase') drawSprites();
          return;
        }
        if (kind === 'down') { const cv = side === 'me' ? BT.pcv : BT.ecv; cv.classList.add('bt-down'); await sleep(420); cv.classList.remove('bt-down'); }
      },
      async faint(side) {
        if (!BT) return;
        const slot = side === 'me' ? BT.pslot : BT.eslot;
        slot.classList.add('faint');
        await sleep(R() ? 120 : 700);
        slot.classList.add('gone');
      },
      async exp(from, lv0, ups) {
        if (!BT) return;
        se('bt_exp');
        const d = data();
        const bar = BT.pexp.querySelector('b');
        const segs = [];
        let lv = lv0, cur = from;
        const target = d.exp;
        for (let k = 0; k <= ups.length; k++) {
          const a = expAt(lv), b = expAt(Math.min(CAP, lv + 1));
          const end = k < ups.length ? b : target;
          segs.push([lv, (cur - a) / Math.max(1, b - a), (end - a) / Math.max(1, b - a)]);
          cur = end; lv++;
        }
        for (const [L, p0, p1] of segs) {
          BT.pbox.querySelector('.bt-lv').textContent = ':L' + L;
          const n = R() ? 1 : 12;
          for (let i = 1; i <= n; i++) { bar.style.width = (clamp(p0 + (p1 - p0) * i / n, 0, 1) * 100).toFixed(1) + '%'; await sleep(35); }
          if (p1 >= 1) { bar.style.width = '0%'; }
        }
        updMe(BT.B.me.hp);
        BT.pbox.querySelector('.bt-lv').textContent = ':L' + d.lv;
      },
      async lvup(u) {
        if (!BT) return;
        const B = BT.B, st = shiroStats(u.lv);
        B.me.max = st.hp; B.me.lv = u.lv;
        BT.pbox.querySelector('.bt-lv').textContent = ':L' + u.lv;
        updMe(B.me.hp);
        const box = $('div', 'bt-box bt-stat');
        box.innerHTML = `<div class="bt-st-h">Lv${u.lv}！</div><div>HP<b>${st.hp}</b><em>+${u.gains.hp}</em></div><div>こうげき<b>${st.atk}</b><em>+${u.gains.atk}</em></div><div>ぼうぎょ<b>${st.def}</b><em>+${u.gains.def}</em></div><div>すばやさ<b>${st.spd}</b><em>+${u.gains.spd}</em></div>`;
        BT.field.appendChild(box);
        BT.pslot.classList.add('lvup');
        await sleep(R() ? 100 : 900);
        BT.pslot.classList.remove('lvup');
        setTimeout(() => box.remove(), R() ? 400 : 2600);
      },
      se, music,
      refresh,
      async close(result) {
        if (!BT) { musicStop(); return; }
        const b = BT;
        if (MUS.kind && !/^win/.test(MUS.kind)) musicStop();
        cancelAnimationFrame(b.raf);
        b.h.el.classList.add('out');
        await new Promise(r => setTimeout(r, R() ? 30 : 320));
        try { b.h.close(); } catch (e) {}
        if (BT === b) BT = null;
        if (KY._hud) KY._hud();
      },
    });
  }

  /* ═════════════════════════ メニュー「シロのようす」 ═════════════════════════ */
  function statusPanel(el) {
    const $ = KY._el;
    const d = data(), st = shiroStats(d.lv), sb = API.syncBonus();
    const top = $('div', 'bts-top');
    const c = $('canvas', 'bts-face'); c.width = 160; c.height = 160;
    try { KY.drawPortrait(c.getContext('2d'), 'shiro', d.hp <= 0 ? 'worry' : 'normal', 160, 160, 'シロ'); } catch (e) {}
    const info = $('div', 'bts-info');
    const a = expAt(d.lv), b = expAt(Math.min(CAP, d.lv + 1));
    info.innerHTML = `<div class="bts-name">シロ<span>境界生物</span></div><div class="bts-lv">Lv ${d.lv}${d.lv >= CAP ? '（最大）' : ''}</div>`;
    const hp = $('div', 'bt-hp me'); hp.innerHTML = '<span class="bt-hpl">HP</span><i class="bt-hpbar"><b></b></i>';
    const r = d.hp / st.hp; hp.querySelector('b').style.width = (r * 100) + '%'; hp.dataset.lv = r <= 0.2 ? '2' : r <= 0.5 ? '1' : '0';
    info.appendChild(hp);
    info.appendChild($('div', 'bts-num', `${d.hp}／${st.hp}`));
    const ex = $('div', 'bt-exp'); ex.innerHTML = '<span class="bt-hpl">EXP</span><i class="bt-expbar"><b></b></i>';
    ex.querySelector('b').style.width = (d.lv >= CAP ? 100 : clamp((d.exp - a) / Math.max(1, b - a), 0, 1) * 100) + '%';
    info.appendChild(ex);
    info.appendChild($('div', 'bts-num', d.lv >= CAP ? '観測値 MAX' : `次の Lv まで ${b - d.exp}`));
    top.append(c, info);
    el.appendChild(top);
    const tbl = $('div', 'bts-stats');
    [['こうげき', st.atk], ['ぼうぎょ', st.def], ['すばやさ', st.spd]].forEach(([k, v]) => { const r2 = $('div', 'bts-row'); r2.append($('span', '', k), $('b', '', String(v))); tbl.appendChild(r2); });
    const sy = $('div', 'bts-row'); sy.append($('span', '', `同期 Lv${(S().sync | 0)}`), $('b', '', `威力×${sb.dmg.toFixed(2)}`)); tbl.appendChild(sy);
    el.appendChild(tbl);
    el.appendChild($('div', 'set-h', '技'));
    d.moves.forEach(sl => {
      const mv = MOVES[sl.id]; const r3 = $('div', 'it-row bts-move');
      r3.append($('span', 'it-n', mv.name), $('span', 'it-c', `${TYPES[mv.type]}　${sl.pp}／${mv.pp}`), $('span', 'it-d', (mv.pow ? '威力 ' + mv.pow + '。' : '') + T(mv.desc || '')));
      el.appendChild(r3);
    });
    const nx = LEARN.find(x => x[0] > d.lv);
    if (nx) el.appendChild($('div', 'set-note', `Lv${nx[0]}で 新しい技を おぼえそうだ。`));
    el.appendChild($('div', 'set-h', '属性の三すくみ'));
    el.appendChild($('div', 'set-note', '揺らぎ → 空白 → 残響 → 揺らぎ（矢印の先に強い。強いと 1.5 倍、逆は 0.67 倍）。「観測」はどれにも等倍。\n戦闘の「ようす」で相手の属性が分かる。端末スキャン（電力 1）で弱点を突ける。\n研究所（分室・観測装置室など）に入ると、シロは休んで全快する。'));
    const seen = Object.keys(d.seen).filter(k => ENEMIES[k]);
    el.appendChild($('div', 'set-note', `観測した境界生物 ${seen.length}／${Object.keys(ENEMIES).length}　勝ち ${d.wins}・負け ${d.losses}・逃げ ${d.runs}`));
  }
  API._statusPanel = statusPanel;
  if (HAS_DOM && KY.addMenu) {
    KY.addMenu('shiro_bt', 'シロのようす', 76, statusPanel);
    const m = KY.MENU.find(x => x.id === 'shiro_bt'); if (m) m.when = () => KY.has('shiro_met');
  }
})(typeof window !== 'undefined' ? window : globalThis);
