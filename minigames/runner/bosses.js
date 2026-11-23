// ══════════════════════════════════════════════════════════
// 買い出しダッシュ　高難易度版：ボス
// ・ボスはデータの表（BOSSES）。選択画面は表から並べる（ボスを選ぶ＝そのボスの面へ行く。1 面・2 面という順番は無い）
// ・通常ボス A「風斬の怪異」・B「濁流の怪異」・C「雷殻の怪異」（どれも利用者の設定画・ドット絵 2026-11-15）
// ・隠しボス（風邪菌）は cold.js。表には枠だけ置く（hidden）
// ・DOM を使わない（node で試験する：tests/runner-hard-boss.test.mjs）。ふつうのスクリプトとして読むと RunnerBosses が生える
// ・座標は act.js と同じ（x 右が＋・y 上が＋・足もと）。1 こま＝1/60 秒
// ・数値はどれも仮（表で変えられる）
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const BOSSES = [
    { id: 'kazegiri', name: '風斬の怪異', kana: 'かぜぎりのかいい', stage: 'okujo', teaches: 'kazebashiri', weak: 'raitotsu', special: '風断連嵐', hidden: false, order: 'A',
      reason: '風を纏い、街の空を裂く、孤高の斬鬼。高速移動と近接斬撃の技能戦' },
    { id: 'dakuryu', name: '濁流の怪異', kana: 'だくりゅうのかいい', stage: 'haisui', teaches: 'mizukiri', weak: 'kazeha', special: '豪雨濁流・都市氾濫', hidden: false, order: 'B',
      reason: '雨と増水に潜む、都市を呑み込む水の怪異。雨が強まるほど肥大する' },
    { id: 'raikaku', name: '雷殻の怪異', kana: 'らいかくのかいい', stage: 'koka', teaches: 'raitotsu', weak: 'mizukiri', special: '雷雲招来', hidden: false, order: 'C',
      reason: '都市の雷を纏う、インフラ守護の異形。重装甲と雷で戦うパワー型' },
    // 隠しボス：通常ボスを全員倒した後にコンビニへ着くと、看病の場面から始まる。一度戦うと選択画面からも戦える
    { id: 'cold', name: '風邪菌', kana: 'かぜきん', stage: 'home', teaches: null, hidden: true, unlock: 'after_all', reason: '人の風邪を司るウイルスの化身。子どもは元気になってきたのに、今度は看病していた自分が…' },
  ];
  // 弱点：あるボスで覚えた技が、別のボスに大きく効く（仕組みは「覚えた技で次のボスを崩す」順番の遊び。名前・中身はこのゲームの物）
  //   風斬の怪異 → 雷突き（速さを雷で止める）・濁流の怪異 → 風刃（風が濁流を散らす）・雷殻の怪異 → 水切り（水で殻がショートする）
  //   弱点の技は：体力を WEAK.mul 倍削る・ガードを通す・今の動き（必殺技も）を止めて WEAK.stun こま よろける
  const WEAK = { mul: 2, stun: 46 };
  const G = { gravity: 0.25 * 2.5, fallCap: 5.75 * 2.5, deadF: 80 };
  // 風斬の怪異：待機（構え）・高速ダッシュ（残像・フェイント）・斬撃（地上の 3 連）・斬撃（空中から斜めに）・突き・風断連嵐（体力半分から）・被弾（立て直して反撃）・撃破
  const KAZEGIRI = {
    hp: 28, w: 14, h: 62, walk: 1.6, scale: 1.0,
    dash: { tele: 18, speed: 13, f: 40, feint: 3 },                  // 3 回に 1 回は手前で止まってすぐ斬る（フェイント）
    slash: { tele: 14, n: 3, gap: 13, active: 6, reach: 64, step: 9 }, // 地上の 3 連。最後の後に少し硬直（弱点）
    air: { tele: 12, jump: 15.5, dive: 9.5 },
    thrust: { tele: 22, speed: 11, f: 14, reach: 96 },
    storm: { tele: 50, dur: 210, every: 34, blade: 6.5, ring: 92, cd: 3 },
    rest: 30, recover: 34, flinch: 8, counterHits: 3,
  };
  // 濁流の怪異：移動（地を這う）・スプラッシュラッシュ・飛沫弾（レインショット）・捕縛・押し潰し・大波（水位が上がる＝高い足場へ）・豪雨濁流・都市氾濫（体力半分から）・被弾・撃破
  const DAKURYU = {
    hp: 34, w: 44, h: 92, walk: 0.9, scale: 1.45,
    rush: { tele: 30, speed: 8, puddle: 10 },
    shot: { tele: 24, n: 3, speed: 5.2 },
    grab: { range: 130, tele: 26, f: 16, reach: 70 },
    wave: { tele: 40, rise: 30, hold: 130, fall: 30, level: 104 },    // 水位：床から 104px（部屋の足場は 120px より上）
    flood: { tele: 50, dur: 280, every: 56, speed: 6.2, h: 64, cd: 3 },
    rest: 44, recover: 34, flinch: 10,
  };
  // 雷殻の怪異：設定画の 8 つの動き（待機・ストンプ・放電・ガード・突進・雷雲招来・被弾・撃破）
  const RAIKAKU = {
    hp: 32, w: 30, h: 112, rushH: 80, walk: 0.7, scale: 1.3, touch: 1,
    stomp: { tele: 34, hitF: 14, wave: 5, waveLife: 90 },
    discharge: { tele: 40, n: 8, nFast: 12, speed: 4.2, life: 120, f: 26 },
    guard: { dur: 110, blocks: 2, counterTele: 10 },
    counter: { r: 100, f: 16 },
    rush: { tele: 30, speed: 9.5 },
    storm: { tele: 50, dur: 270, every: 44, strikeTele: 38, strikeF: 14, w: 24, cd: 3 },
    rest: 46, recover: 32, flinch: 10, deadF: G.deadF,
  };
  const SPEC = { kazegiri: KAZEGIRI, dakuryu: DAKURYU, raikaku: RAIKAKU };

  function make(map) {
    const T = map.tile, solid = (x, y) => map.solid(Math.floor(x / T), Math.floor(y / T));
    const shots = [];
    const S = e => SPEC[e.id] || RAIKAKU;
    function spawn(id, x, y, arena) {
      const s = SPEC[id] || RAIKAKU;
      return { id, kind: 'boss', x, y, vx: 0, vy: 0, face: -1, hp: s.hp, hpMax: s.hp, state: 'wait', f: 0, hitT: 0, dead: false, deadF: 0, arena, seq: 0, blocks: 0, stormCd: 0, charged: false, ev: [], k: 0, hitsRecent: 0, grounded: true };
    }
    const tall = e => (e.id === 'raikaku' && e.state === 'rush' ? RAIKAKU.rushH : e.id === 'dakuryu' && (e.state === 'rush' || e.state === 'flood') ? DAKURYU.h * 0.7 : S(e).h);
    const box = e => ({ x0: e.x - S(e).w, x1: e.x + S(e).w, y0: e.y, y1: e.y + tall(e) });
    const onGround = e => solid(e.x, e.y - 0.5);
    function phys(e) {
      e.grounded = onGround(e) && e.vy <= 0;
      if (!e.grounded) {
        if (e.vy < -G.fallCap) e.vy = -G.fallCap; e.vy -= G.gravity;
        let ny = e.y + e.vy; if (e.vy < 0 && solid(e.x, ny)) { ny = (Math.floor(ny / T) + 1) * T; e.vy = 0; e.landed = true; } e.y = ny;
      }
      const w = S(e).w, lo = e.arena.x0 + w, hi = e.arena.x1 - w; e.x = Math.max(lo, Math.min(hi, e.x + e.vx));
      return e.x <= lo || e.x >= hi;
    }
    const fast = e => e.hp <= e.hpMax / 2, K = e => (fast(e) ? 1.3 : 1);
    function go(e, st) { e.state = st; e.f = 0; }
    const floorY = e => (e.arena.floor != null ? e.arena.floor : e.y);
    // 近接の当たり（前にだけ・短い間）
    const melee = (e, reach, h, life, y = 0) => shots.push({ kind: 'melee', owner: e, x: e.x + e.face * (S(e).w + reach / 2), y: e.y + y, w: reach / 2, h, life });

    // ── 風斬の怪異 ──
    function stepKazegiri(e, p, k, dx, toward) {
      const Z = KAZEGIRI;
      switch (e.state) {
        case 'walk': e.face = toward; e.vx = Math.abs(dx) > 90 ? e.face * Z.walk * k : 0;
          if (e.f > Z.rest / k) { e.vx = 0;
            if (fast(e) && e.stormCd <= 0) { e.stormCd = Z.storm.cd; go(e, 'storm_tele'); break; }
            e.stormCd--; const o = ['dash_tele', 'slash_tele', 'air_tele', 'thrust_tele'], n = Math.abs(dx) < 110 ? 'slash_tele' : o[e.seq++ % o.length]; go(e, n); }
          break;
        case 'dash_tele': e.vx = 0; e.face = toward; if (e.f >= Z.dash.tele / k) { e.feint = (++e.k % Z.dash.feint) === 0; e.vx = e.face * Z.dash.speed * k; e.ev.push('dash'); go(e, 'dash'); } break;
        case 'dash':
          if (e.feint && Math.abs(dx) < 80) { e.vx = 0; e.face = toward; go(e, 'slash_tele'); e.f = Math.floor(Z.slash.tele * .6); break; }   // フェイント：手前で止まってすぐ斬る
          if (e.f >= Z.dash.f || dx * e.face < -110) { e.vx = 0; go(e, 'recover'); }   // 自機を駆け抜けて止まる
          break;
        case 'slash_tele': e.vx = 0; e.face = toward; if (e.f >= Z.slash.tele / k) { e.hitN = 0; go(e, 'slash'); } break;
        case 'slash': {
          const g = Math.round(Z.slash.gap / k);
          if (e.f % g === 1) { if (e.hitN >= Z.slash.n) { go(e, 'recover'); e.f = -10; break; } e.hitN++; e.vx = e.face * Z.slash.step; melee(e, Z.slash.reach, 56, Z.slash.active, 4); e.ev.push('slash'); }
          else e.vx *= 0.5;
          break; }
        case 'air_tele': e.vx = 0; e.face = toward; if (e.f >= Z.air.tele / k) { e.vy = Z.air.jump; e.vx = Math.max(-5, Math.min(5, dx / 40)); go(e, 'air_up'); } break;
        case 'air_up': if (e.vy <= 2) { e.face = toward; const ddx = (p ? p.x : e.x) - e.x, ddy = (p ? p.y + 20 : floorY(e)) - e.y, d = Math.hypot(ddx, ddy) || 1; e.vx = ddx / d * Z.air.dive * k; e.vy = ddy / d * Z.air.dive * k; go(e, 'air_dive'); e.ev.push('slash'); } break;
        case 'air_dive': e.vy = Math.min(e.vy, -2); if (e.f % 4 === 1) melee(e, 30, 60, 5, -6); if (e.landed || (e.grounded && e.f > 2)) { e.vx = 0; e.vy = 0; go(e, 'recover'); } break;
        case 'thrust_tele': e.vx = 0; e.face = toward; if (e.f >= Z.thrust.tele / k) { e.vx = e.face * Z.thrust.speed * k; go(e, 'thrust'); e.ev.push('slash'); } break;
        case 'thrust': if (e.f % 3 === 1) melee(e, Z.thrust.reach, 30, 4, 22); if (e.f >= Z.thrust.f) { e.vx = 0; go(e, 'recover'); } break;
        case 'storm_tele': e.vx = 0; if (e.f >= Z.storm.tele) { e.ev.push('special'); go(e, 'storm'); } break;
        case 'storm':   // 風断連嵐：周りを風の刃が回る（近い所は当たる）＋ 左右へ風の刃を飛ばす（低い刃は跳ぶ・高い刃はしゃがまず立って）
          e.vx = 0; e.face = toward;
          if (e.f % 8 === 1) shots.push({ kind: 'ring', x: e.x, y: e.y + 34, r: Z.storm.ring, life: 8 });
          if (e.f % Math.round(Z.storm.every / k) === 1) { const hi = (e.f / Math.round(Z.storm.every / k)) % 2 > 1; for (const d of [-1, 1]) shots.push({ kind: 'blade', x: e.x + d * 40, y: e.y + (hi ? 70 : 10), vx: d * Z.storm.blade, vy: 0, w: 16, h: 14, life: 140 }); }
          if (e.f >= Z.storm.dur) go(e, 'recover');
          break;
        case 'recover': e.vx = 0; if (e.f >= Z.recover / k) { e.hitsRecent = 0; go(e, 'walk'); } break;
      }
    }
    // ── 濁流の怪異 ──
    function stepDakuryu(e, p, k, dx, toward) {
      const Z = DAKURYU;
      switch (e.state) {
        case 'walk': e.face = toward; e.vx = e.face * Z.walk * k;
          if (e.f > Z.rest / k) { e.vx = 0;
            if (fast(e) && e.stormCd <= 0) { e.stormCd = Z.flood.cd; go(e, 'flood_tele'); break; }
            e.stormCd--; if (Math.abs(dx) < Z.grab.range && p && p.y < e.y + 60) { go(e, 'grab_tele'); break; }
            const o = ['shot_tele', 'rush_tele', 'shot_tele', 'wave_tele']; go(e, o[e.seq++ % o.length]); }
          break;
        case 'rush_tele': e.vx = 0; e.face = toward; if (e.f >= Z.rush.tele / k) { e.vx = e.face * Z.rush.speed * k; go(e, 'rush'); } break;
        case 'rush': if (e.f % Z.rush.puddle === 0) shots.push({ kind: 'splash', x: e.x - e.face * Z.w, y: floorY(e), w: 16, h: 22, life: 26 }); break;
        case 'shot_tele': e.vx = 0; e.face = toward; if (e.f >= Z.shot.tele / k) {
          for (let i = 0; i < Z.shot.n; i++) { const tx = (p ? p.x : e.x) + (i - 1) * 70, t = 46 + i * 6, vx = (tx - e.x) / t; shots.push({ kind: 'drop', x: e.x + e.face * 30, y: e.y + 80, vx: Math.max(-9, Math.min(9, vx)), vy: 7.5, g: 0.3, w: 9, h: 9, life: 200 }); }
          e.ev.push('shot'); go(e, 'shot'); } break;
        case 'shot': if (e.f >= 24) go(e, 'recover'); break;
        case 'grab_tele': e.vx = 0; e.face = toward; if (e.f >= Z.grab.tele / k) { go(e, 'grab'); e.ev.push('grab'); } break;
        case 'grab': if (e.f % 3 === 1) melee(e, Z.grab.reach, 80, 4, 0); if (e.f >= Z.grab.f) go(e, 'recover'); break;
        case 'wave_tele': e.vx = 0; if (e.f >= Z.wave.tele / k) { shots.push({ kind: 'flood', x: (e.arena.x0 + e.arena.x1) / 2, x0: e.arena.x0, x1: e.arena.x1, y: floorY(e), level: 0, max: Z.wave.level, f: 0, rise: Z.wave.rise, hold: Z.wave.hold, fall: Z.wave.fall, life: Z.wave.rise + Z.wave.hold + Z.wave.fall }); e.ev.push('wave'); go(e, 'wave'); } break;
        case 'wave': if (e.f >= Z.wave.rise + Z.wave.hold) go(e, 'recover'); break;
        case 'flood_tele': e.vx = 0; if (e.f >= Z.flood.tele) { e.ev.push('special'); go(e, 'flood'); } break;
        case 'flood':   // 豪雨濁流・都市氾濫：巨大な渦になり、左右から濁流が断続的に押し寄せる（跳んで越える・足場へ）
          e.vx = 0;
          if (e.f % Math.round(Z.flood.every / k) === 1) { const d = (e.k++ % 2) ? 1 : -1, x = d > 0 ? e.arena.x0 + 10 : e.arena.x1 - 10; shots.push({ kind: 'surge', x, y: floorY(e), vx: d * Z.flood.speed * k, vy: 0, w: 26, h: Z.flood.h, life: 260 }); }
          if (e.f >= Z.flood.dur) go(e, 'recover');
          break;
        case 'recover': e.vx = 0; if (e.f >= Z.recover / k) go(e, 'walk'); break;
      }
    }
    // ── 雷殻の怪異 ──
    const ORDER_R = ['stomp_tele', 'discharge_tele', 'rush_tele', 'guard'];
    function stepRaikaku(e, p, k, dx, toward) {
      const R = RAIKAKU;
      switch (e.state) {
        case 'walk': e.face = toward; e.vx = e.face * R.walk * k; if (e.f > R.rest / k) { e.vx = 0;
          if (fast(e) && e.stormCd <= 0) { e.stormCd = R.storm.cd; go(e, 'storm_tele'); break; }
          e.stormCd--; go(e, ORDER_R[e.seq++ % ORDER_R.length]); if (e.state === 'guard') e.blocks = 0; } break;
        case 'stomp_tele': e.vx = 0; e.face = toward; if (e.f >= R.stomp.tele / k) {
          for (const d of [-1, 1]) shots.push({ kind: 'wave', x: e.x + d * R.w, y: e.y, vx: d * R.stomp.wave * k, vy: 0, w: 14, h: 26, life: R.stomp.waveLife });
          e.ev.push('stomp'); go(e, 'stomp'); } break;
        case 'stomp': if (e.f >= R.stomp.hitF) go(e, 'recover'); break;
        case 'discharge_tele': e.vx = 0; if (e.f >= R.discharge.tele / k) {
          const n = fast(e) ? R.discharge.nFast : R.discharge.n;
          for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (e.seq % 2 ? Math.PI / n : 0); shots.push({ kind: 'spark', x: e.x, y: e.y + 66, vx: Math.cos(a) * R.discharge.speed, vy: Math.sin(a) * R.discharge.speed, w: 9, h: 9, life: R.discharge.life }); }
          e.ev.push('discharge'); go(e, 'discharge'); } break;
        case 'discharge': if (e.f >= R.discharge.f) go(e, 'recover'); break;
        case 'guard': e.vx = 0; e.face = toward;
          if (e.blocks >= R.guard.blocks) { go(e, 'counter_tele'); break; }
          if (e.f >= R.guard.dur) go(e, 'recover'); break;
        case 'counter_tele': if (e.f >= R.guard.counterTele) { shots.push({ kind: 'burst', x: e.x, y: e.y + 56, r: 10, rMax: R.counter.r, life: R.counter.f, f: 0 }); e.ev.push('counter'); go(e, 'recover'); } break;
        case 'rush_tele': e.vx = 0; e.face = toward; if (e.f >= R.rush.tele / k) { e.vx = e.face * R.rush.speed * k; go(e, 'rush'); } break;
        case 'rush': break;
        case 'storm_tele': e.vx = 0; if (e.f >= R.storm.tele) { e.charged = true; e.ev.push('storm', 'special'); go(e, 'storm'); } break;
        case 'storm':
          e.vx = 0; e.face = toward;
          if (e.f % Math.round(R.storm.every / k) === 1 && p) { const x = Math.max(e.arena.x0 + 20, Math.min(e.arena.x1 - 20, p.x)); shots.push({ kind: 'bolt', x, y: floorY(e), tele: R.storm.strikeTele, f: 0, w: R.storm.w, life: R.storm.strikeTele + R.storm.strikeF }); }
          if (e.f >= R.storm.dur) { e.charged = false; go(e, 'recover'); }
          break;
        case 'recover': e.vx = 0; if (e.f >= R.recover / k) go(e, 'walk'); break;
      }
    }
    const STEP = { kazegiri: stepKazegiri, dakuryu: stepDakuryu, raikaku: stepRaikaku };
    function step(e, p) {
      e.f++; e.ev = []; e.landed = false; if (e.weakT > 0) e.weakT--;
      if (e.dead) { e.deadF++; e.vx = 0; phys(e); return; }
      if (e.hitT > 0) e.hitT--;
      const k = K(e), dx = p ? p.x - e.x : 0, toward = dx < 0 ? -1 : 1;
      if (e.state !== 'wait') (STEP[e.id] || stepRaikaku)(e, p, k, dx, toward); else e.vx = 0;
      const atWall = phys(e);
      if (e.state === 'rush' && (atWall || e.f > 200)) { e.vx = 0; e.ev.push('rushwall'); go(e, 'recover'); }
      if (e.state === 'dash' && atWall) { e.vx = 0; go(e, 'recover'); }
    }
    function stepShots() {
      for (const s of shots) {
        s.life--;
        if (s.kind === 'wave' || s.kind === 'surge') { s.x += s.vx; if (solid(s.x + Math.sign(s.vx) * s.w, s.y + 6)) s.life = 0; }
        else if (s.kind === 'spark' || s.kind === 'blade') { s.x += s.vx; s.y += s.vy; if (solid(s.x, s.y) || s.y < 0) s.life = 0; }
        else if (s.kind === 'drop') { s.x += s.vx; s.y += s.vy; s.vy -= s.g; if (solid(s.x, s.y - s.h) || s.y < 0) { s.life = 0; shots.push({ kind: 'splash', x: s.x, y: Math.ceil((s.y - s.h) / T) * T, w: 26, h: 20, life: 22 }); } }
        else if (s.kind === 'melee') { if (s.owner) { s.x += s.owner.vx; } }
        else if (s.kind === 'burst') { s.f++; s.r = 10 + (s.rMax - 10) * Math.min(1, s.f / 6); }
        else if (s.kind === 'bolt') { s.f++; }
        else if (s.kind === 'flood') { s.f++; s.level = s.f < s.rise ? s.max * s.f / s.rise : s.f < s.rise + s.hold ? s.max : s.max * Math.max(0, 1 - (s.f - s.rise - s.hold) / s.fall); }
      }
      for (let i = shots.length - 1; i >= 0; i--) if (shots[i].life <= 0) shots.splice(i, 1);
    }
    // 当たりの箱（害の無い間＝落雷の予兆・水位が低い間は null）
    function shotBox(s) {
      if (s.kind === 'bolt') return s.f > s.tele ? { x0: s.x - s.w, x1: s.x + s.w, y0: s.y, y1: s.y + 600 } : null;
      if (s.kind === 'burst' || s.kind === 'ring') { const r = s.r * 0.75; return { x0: s.x - r, x1: s.x + r, y0: s.y - r, y1: s.y + r }; }
      if (s.kind === 'flood') return s.level > 8 ? { x0: s.x0, x1: s.x1, y0: s.y - 10, y1: s.y + s.level } : null;
      if (s.kind === 'wave' || s.kind === 'surge' || s.kind === 'splash' || s.kind === 'melee') return { x0: s.x - s.w, x1: s.x + s.w, y0: s.y, y1: s.y + s.h };
      return { x0: s.x - s.w, x1: s.x + s.w, y0: s.y - s.h, y1: s.y + s.h };
    }
    // 攻撃を受ける。fromX：攻撃した自機の x（ガードの向き）。move：技の名前（弱点を見る）
    // 戻り値：'weak' 弱点で当たった・true 当たった・'block' 防いだ・false 当たらない
    function hurt(e, dmg, fromX, move) {
      if (e.dead || e.state === 'wait') return false;
      const def = BOSSES.find(b => b.id === e.id);
      if (move && def && def.weak === move) {                          // 弱点：ガードも必殺技も止めて、よろける
        e.hp -= dmg * WEAK.mul; e.hitT = WEAK.stun; e.charged = false; e.vx = 0; e.hitsRecent = 0; e.blocks = 0;
        for (let i = shots.length - 1; i >= 0; i--) if (shots[i].owner === e || shots[i].kind === 'flood' || shots[i].kind === 'surge' || shots[i].kind === 'bolt') shots.splice(i, 1);
        go(e, 'recover'); e.f = -WEAK.stun; e.weakT = WEAK.stun;
        if (e.hp <= 0) { e.hp = 0; e.dead = true; e.deadF = 0; shots.length = 0; }
        return 'weak';
      }
      if (e.id === 'raikaku') {
        const front = fromX == null || (fromX - e.x) * e.face >= 0;
        if ((e.state === 'guard' || e.state === 'counter_tele') && front) { if (e.state === 'guard') e.blocks++; return 'block'; }
        if (e.state === 'guard') go(e, 'recover');                     // 後ろから当てるとガードが崩れる
      }
      e.hp -= dmg; e.hitT = S(e).flinch;
      if (e.id === 'kazegiri' && e.state === 'recover' && ++e.hitsRecent >= KAZEGIRI.counterHits && e.hp > 0) { e.hitsRecent = 0; go(e, 'dash_tele'); e.f = Math.floor(KAZEGIRI.dash.tele * .5); }   // 立て直して反撃
      if (e.hp <= 0) { e.hp = 0; e.dead = true; e.deadF = 0; e.charged = false; shots.length = 0; }
      return true;
    }
    const wake = e => { if (e.state === 'wait') go(e, 'walk'); };
    const telegraph = e => /_tele$/.test(e.state) || e.state === 'guard';
    // ドット絵のコマ（assets/runner/<id>.json の 行_列）。絵はどれも左向き
    function frame(e) {
      const f = e.f, cyc = (row, ks, sp) => row + '_' + ks[Math.floor(Math.max(0, f) / sp) % ks.length], prog = (row, ks, n) => row + '_' + ks[Math.max(0, Math.min(ks.length - 1, Math.floor(f / Math.max(1, n) * ks.length)))];
      if (e.dead) return '7_' + Math.min(7, 3 + Math.floor(e.deadF / 14));
      const busy = ['guard', 'rush', 'storm', 'counter_tele', 'dash', 'flood', 'air_dive', 'thrust'];
      if (e.hitT > 0 && !busy.includes(e.state)) return '7_' + Math.min(2, Math.floor((S(e).flinch - e.hitT) / 4));
      if (e.id === 'kazegiri') {
        const Z = KAZEGIRI;
        switch (e.state) {
          case 'walk': return Math.abs(e.vx) > 0.1 ? cyc(1, [0, 1, 6, 7], 7) : cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
          case 'dash_tele': return prog(2, [0, 1, 2], Z.dash.tele);
          case 'dash': return cyc(2, [3, 4, 5], 4);
          case 'slash_tele': return prog(3, [0, 1], Z.slash.tele);
          case 'slash': { const n = e.hitN || 1; return n === 1 ? '3_' + (f % Z.slash.gap < 5 ? 2 : 3) : n === 2 ? '3_' + (f % Z.slash.gap < 5 ? 4 : 5) : '3_6'; }
          case 'air_tele': return '4_0';
          case 'air_up': return cyc(4, [1, 2], 6);
          case 'air_dive': return cyc(4, [3, 4, 5], 4);
          case 'thrust_tele': return prog(5, [1, 2, 3], Z.thrust.tele);
          case 'thrust': return cyc(5, [4, 5, 6], 5);
          case 'storm_tele': return prog(6, [0, 1, 2], Z.storm.tele);
          case 'storm': return cyc(6, [3, 4, 5], 5);
          case 'recover': return f < 10 ? '6_6' : cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
        }
        return cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
      }
      if (e.id === 'dakuryu') {
        const Z = DAKURYU;
        switch (e.state) {
          case 'walk': return cyc(1, [0, 1, 2, 3, 4, 5, 6, 7], 7);
          case 'rush_tele': return prog(2, [0, 1, 2], Z.rush.tele);
          case 'rush': return cyc(2, [3, 4, 5], 5);
          case 'shot_tele': return prog(3, [0, 1], Z.shot.tele);
          case 'shot': return prog(3, [2, 3, 4, 5, 6], 24);
          case 'grab_tele': return prog(4, [0, 1, 2], Z.grab.tele);
          case 'grab': return prog(4, [3, 4, 5, 6], Z.grab.f);
          case 'wave_tele': return prog(5, [0, 1, 2], Z.wave.tele);
          case 'wave': return cyc(5, [3, 4, 5], 8);
          case 'flood_tele': return prog(6, [0, 1, 2], Z.flood.tele);
          case 'flood': return cyc(6, [3, 4], 8);
          case 'recover': return f < 10 ? '2_6' : cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
        }
        return cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
      }
      const R = RAIKAKU;
      switch (e.state) {
        case 'walk': return cyc(1, [0, 1, 2, 3, 4, 5, 6, 7], 7);
        case 'stomp_tele': return prog(2, [0, 1, 2, 3], R.stomp.tele);
        case 'stomp': return prog(2, [4, 5, 6, 7], R.stomp.hitF);
        case 'discharge_tele': return prog(3, [0, 1, 2, 3], R.discharge.tele);
        case 'discharge': return cyc(3, [4, 5, 6], 5);
        case 'guard': return f < 8 ? '4_1' : f < 14 ? '4_2' : cyc(4, [3, 5], 9);
        case 'counter_tele': return '4_4';
        case 'rush_tele': return prog(5, [0, 1], R.rush.tele);
        case 'rush': return cyc(5, [2, 3, 4, 5], 4);
        case 'storm_tele': return prog(6, [0, 1, 2, 3], R.storm.tele);
        case 'storm': return cyc(6, [4, 5, 6], 6);
        case 'recover': return f < 10 ? '0_7' : cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
      }
      return cyc(0, [0, 1, 2, 3, 4, 5, 6, 7], 8);
    }
    return { spawn, step, stepShots, shots, box, shotBox, hurt, wake, telegraph, frame, spec: S };
  }
  const visible = () => BOSSES.filter(b => !b.hidden);
  // 隠しボスに会える（倒したボスの id の並び beaten が、隠しでないボスを全員ふくむ）
  const coldUnlocked = beaten => visible().every(b => (beaten || []).includes(b.id));
  const API = { BOSSES, KAZEGIRI, DAKURYU, RAIKAKU, SPEC, G, WEAK, make, visible, coldUnlocked };
  root.RunnerBosses = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
