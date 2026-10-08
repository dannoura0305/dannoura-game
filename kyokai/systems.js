/* ══════════════════════════════════════════════════════════════════════
   境界事象  探索・世界切替・危険度・存在安定度・装備/消耗品・シロ同期・追跡（kyokai/systems.js・担当A）
   契約：docs/kyokai/README.md「探索」。engine.js の冒頭に契約の解釈・追加をまとめてある。
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const KY = root.KY;
  if (!KY || !KY._G) { console.error('[KY] engine.js が先に必要です'); return; }
  const G = KY._G, clamp = KY._clamp, HAS_DOM = KY.HAS_DOM;
  const S = () => KY.state;
  const pend = KY._pend;
  const hud = () => KY._hud();

  /* ───────── 消耗品・装備 ───────── */
  const ITEMS = KY.ITEMS = {
    battery: { name: '携帯端末電力', drift: '端末残量（旧式）', max: 12, desc: '境界世界（観測層B・C）では行動1回で1減る。0 だと撮影・スキャンができない。' },
    light: { name: '懐中電灯の電池', drift: '携行灯の燃料', max: 6, desc: '懐中電灯で境界生物を追い払うときに1使う。' },
    med: { name: '医療用品', drift: '医療用具一式', use: 10, desc: '使うと存在安定度 +10。' },
    stab: { name: '境界安定剤', drift: '境界安定材', use: 25, desc: '使うと存在安定度 +25。' },
  };
  const EQUIP = KY.EQUIP = {
    phone: { name: 'スマートフォン', drift: '対策局支給端末', tier: 0, desc: '撮影・録音ができる。' },
    flashlight: { name: '懐中電灯', drift: '携行灯', tier: 0, desc: '暗い場所を照らす。境界生物を光で追い払える（電池を使う）。' },
    magnet: { name: '簡易磁場計', drift: '簡易地場計', tier: 0, desc: 'スキャンで磁場・温度・位置を測る。' },
    boundary_meter: { name: '境界測定端末', drift: '境界側定端末', tier: 1, desc: 'スキャンに「境界指数」が出る。地図に各地点の危険度が出る。' },
    hq_recorder: { name: '高感度録音機', drift: '高感度記録機', tier: 1, desc: '録音が鮮明になり、ノイズの底のかすかな声も拾う。' },
    wave_scanner: { name: '異常波スキャナー', drift: '異常派スキャナー', tier: 1, desc: 'スキャンに境界反応の波形が出る。別の層に何かがある地点が分かる。' },
    portable_observer: { name: '携帯型境界観測器', drift: '携帯型境界観察器', tier: 2, desc: '切り替える前に、別の層の様子と危険度を確かめられる。観測だけの同期でもスキャンできる。' },
    anchor: { name: '存在固定装置', drift: '存在固定装置（？）', tier: 2, desc: '存在安定度の減り方が半分になる。' },
    shiro_link: { name: 'シロ同期装置', drift: 'シロ同調装置', tier: 2, desc: '境界観測で安定度が減らない。シロが気にしている場所に白い点が出る。' },
  };
  KY.hasEquip = id => S().equip.indexOf(id) >= 0;
  KY.itemName = id => { const d = ITEMS[id]; if (!d) return id; return S().stability < 30 ? d.drift : d.name; };
  KY.equipName = id => { const d = EQUIP[id]; if (!d) return id; return S().stability < 30 ? d.drift : d.name; };
  KY.item = function (id, n) {
    const it = S().items;
    if (n == null) return it[id] | 0;
    const before = it[id] | 0;
    it[id] = Math.max(0, before + (+n || 0));
    if (n > 0 && HAS_DOM) KY.toast(`${KY.itemName(id)} +${n}`, 'item');
    hud();
    return it[id];
  };
  KY.equip = function (id) {
    const s = S();
    if (s.equip.indexOf(id) >= 0) return false;
    s.equip.push(id);
    const d = EQUIP[id];
    if (HAS_DOM && G.running) KY.toast('装備を入手：' + KY.equipName(id) + (d ? '\n' + d.desc : ''), 'item');
    hud();
    return true;
  };
  KY.useItem = function (id) {
    const d = ITEMS[id]; if (!d || !d.use) return false;
    if ((S().items[id] | 0) <= 0) return false;
    S().items[id]--;
    KY.stab(d.use);
    KY.se('beep');
    hud();
    return true;
  };

  /* ───────── 存在安定度 ───────── */
  const DRAIN = KY.DRAIN = [0, 0.5, 1, 2, 3, 5];
  const DANGER_TXT = KY.DANGER_TXT = ['通常', '小規模ノイズ', '風景変化', '人物入れ替わり', '強制転移の恐れ', '境界崩壊'];
  KY.drainFor = d => DRAIN[clamp(d | 0, 0, 5)] * (KY.hasEquip('anchor') ? 0.5 : 1);
  KY.stabLevel = v => { v = v == null ? S().stability : v; return v < 10 ? 4 : v < 30 ? 3 : v < 50 ? 2 : v < 70 ? 1 : 0; };
  const DRIFT_LINES = {
    1: ['#fx glitch', 'n:首から下げた職員証に、目が留まった。', 'n:「境界事象対策局　月代分室　主任観測員」', 'p:……私は、こんな部署にいた……？'],
    2: ['#fx noise', 'n:遠くで誰かが、私を「主任」と呼んだ。', 'n:そう呼ばれるのが、少しも不自然に聞こえなかった。'],
    3: ['n:ポケットの中の物の名前が、すぐに出てこない。', 'n:手に馴染んでいるのに、知らない道具のような気がする。'],
    4: ['#fx glitch', 'n:手帳を開く。見覚えのない言葉が、私の字で並んでいる。', 'n:地図の地名も、どこか違う。', 'p:……戻らないと。'],
  };
  const DRIFT_TOAST = { 1: '職員証の所属が、また違って見える', 2: '呼び方が、ずれている', 3: '持ち物の名前が、ずれている', 4: '手帳と地図の文字が、ずれている' };
  function queueDrift(L) {
    const k = '__drift' + L;
    if (!S().flags[k]) { S().flags[k] = true; KY._queue(K => KY.say(DRIFT_LINES[L])); }
    else if (HAS_DOM) KY.toast('存在安定度 低下\n' + DRIFT_TOAST[L], 'warn');
  }
  KY.homeArea = function () {
    if (KY.HOME_AREA && KY.AREAS[KY.HOME_AREA]) return KY.HOME_AREA;
    const ids = Object.keys(KY.AREAS);
    return ids.find(id => /^center/.test(id) && id !== 'center_basement') || ids.find(id => { const a = KY.AREAS[id]; return a && a.worlds && a.worlds.A && /^center_/.test(a.worlds.A.scene || ''); }) || null;
  };
  function slip() {
    const s = S();
    s.stability = 30;
    KY.inc('slipped');
    s.world = 'A'; s.baseWorld = 'A'; G.switchLeft = 0;
    G.slipNow = true;
    G.q = G.q.filter(f => !f.drift);
    const home = KY.homeArea(), scene = home && KY.AREAS[home].worlds.A ? KY.AREAS[home].worlds.A.scene : 'center_office';
    KY._queue(K => KY.say(['#fx blackout', 'n:――――', 'n:視界の端から、色が抜けていく。', 'n:誰かに、呼ばれた気がした。', '#scene ' + scene + ' A', '#se clock',
      'n:気がつくと、分室の床に座り込んでいた。', 'n:時計の音。いつもの、こちら側の音。', 'n:（境界から押し戻された。存在安定度は 30 まで戻った）']));
  }
  KY.stab = function (n) {
    const s = S(), prev = s.stability;
    const v = clamp(prev + (+n || 0), 0, 100);
    s.stability = Math.round(v * 10) / 10;
    if (s.stability <= 0 && (+n || 0) < 0) { slip(); hud(); return s.stability; }
    const lp = KY.stabLevel(prev), ln = KY.stabLevel(s.stability);
    if (ln > lp) for (let L = lp + 1; L <= ln; L++) queueDrift(L);
    hud();
    return s.stability;
  };

  /* ───────── シロ同期・世界 ───────── */
  const SYNC_TXT = KY.SYNC_TXT = ['未同期', '異常地点を感じ取る', '別の世界を見る', '短時間だけ切り替えて行動できる', '物を世界の間で運べる', '自分ごと世界を移動できる'];
  KY.sync = function (n) {
    const s = S();
    const v = clamp(n | 0, 0, 5);
    const up = v > s.sync;
    s.sync = v;
    if (up && HAS_DOM && G.running) KY.toast(`シロ同期 Lv${v}\n${SYNC_TXT[v]}`, 'sync');
    hud();
    return v;
  };
  KY.setWorld = function (w) {
    w = String(w || 'A').toUpperCase();
    if (['A', 'B', 'C'].indexOf(w) < 0) return S().world;
    const from = S().world;
    S().world = w; S().baseWorld = w; G.switchLeft = 0;
    if (from !== w) { KY.stageFlicker && KY.stageFlicker(from, 260); if (EX && EX.area) EXUI.refresh && EXUI.refresh(); }
    hud();
    return w;
  };
  const getArea = KY.getArea = function (id) {
    const a = KY.AREAS[id];
    if (!a) return null;
    const pend = PEND[id];
    if (pend && pend.length) { PEND[id] = []; pend.forEach(p => extend(a, p.world, p.spots)); }
    a.worlds = a.worlds || {};
    a.danger = a.danger || {};
    return a;
  };
  const PEND = {};
  function extend(a, world, spots) {
    a.worlds = a.worlds || {};
    if (!a.worlds[world]) { const base = a.worlds.A || a.worlds[Object.keys(a.worlds)[0]] || {}; a.worlds[world] = { scene: base.scene || null, spots: [] }; }
    const W = a.worlds[world]; W.spots = W.spots || [];
    (spots || []).forEach(sp => { const i = W.spots.findIndex(x => x.id === sp.id); if (i >= 0) W.spots[i] = sp; else W.spots.push(sp); });
  }
  KY.extendArea = function (id, world, spots) {
    world = String(world || 'A').toUpperCase();
    const a = KY.AREAS[id];
    if (!a) { (PEND[id] = PEND[id] || []).push({ world, spots }); return; }
    extend(a, world, spots);
  };
  KY.unlock = function (id) {
    const u = S().areas.unlocked;
    if (u.indexOf(id) >= 0) return false;
    u.push(id);
    const a = KY.AREAS[id];
    if (HAS_DOM && G.running) KY.toast('新しい調査地点\n' + (a ? KY.areaName(id) : id), 'map');
    return true;
  };
  KY.lockArea = function (id) { const u = S().areas.unlocked, i = u.indexOf(id); if (i >= 0) u.splice(i, 1); };
  const MAP_DRIFT = [['月代', '月白'], ['商店街', '商店通り'], ['小学校', '国民学校'], ['神社', '社'], ['住宅街', '新町'], ['河川敷', '川原'], ['分室', '支局'], ['観測センター', '対策局']];
  KY.areaName = function (id) {
    const a = KY.AREAS[id]; let n = a ? (a.name || id) : id;
    if (S().stability < 10) MAP_DRIFT.forEach(([x, y]) => { n = n.split(x).join(y); });
    return n;
  };
  KY.dangerOf = (id, w) => { const a = getArea(id); if (!a) return 0; const d = a.danger && a.danger[w || S().world]; return clamp(d == null ? ({ A: 0, B: 1, C: 3 }[w || S().world] || 0) : d | 0, 0, 5); };
  const worldsOf = KY.worldsOf = id => { const a = getArea(id); return a ? ['A', 'B', 'C'].filter(w => a.worlds[w]) : []; };
  const usable = (id, K) => { const a = getArea(id); if (!a) return false; if (a.cond) { try { if (!a.cond(K || G.K || KY)) return false; } catch (e) { return false; } } return true; };
  KY.areaOpen = (id, K) => S().areas.unlocked.indexOf(id) >= 0 && usable(id, K);
  // 境界観測（世界切替）：同期Lv2 見るだけ／Lv3 短時間行動／Lv4 物を運ぶ／Lv5 自分ごと移動
  KY.canSwitch = function (areaId, to) {
    const s = S();
    to = String(to || '').toUpperCase();
    if (s.sync < 2) return { ok: false, reason: 'まだ境界を観測できない。' };
    const ws = worldsOf(areaId);
    if (ws.length < 2) return { ok: false, reason: 'この場所には、ほかの層が見えない。' };
    if (ws.indexOf(to) < 0) return { ok: false, reason: 'その層は、この場所では観測できない。' };
    if (to === s.world) return { ok: false, reason: 'すでにその層を見ている。' };
    return { ok: true, mode: s.sync >= 5 ? 'travel' : s.sync >= 3 ? 'act' : 'look' };
  };
  KY.switchWorld = function (areaId, to) {
    const c = KY.canSwitch(areaId, to);
    if (!c.ok) return c;
    const s = S(), from = s.world;
    to = String(to).toUpperCase();
    s.world = to;
    if (c.mode === 'travel') { s.baseWorld = to; G.switchLeft = 0; }
    else G.switchLeft = to === s.baseWorld ? 0 : (s.sync >= 4 ? 6 : 3);
    if (!KY.hasEquip('shiro_link')) KY.stab(-KY.drainFor(KY.dangerOf(areaId, to)));
    KY.inc('__switches');
    if (KY.stageFlicker) KY.stageFlicker(from, KY.reduced() ? 80 : 300);
    KY.se('switch');
    hud();
    return c;
  };
  KY.carry = function (item) {
    const s = S();
    if (s.sync < 4) { if (HAS_DOM && G.running) KY.toast('まだ物を世界の間で運べない（シロ同期 Lv4 から）', 'warn'); return false; }
    s.flags['carry_' + item] = s.world;
    if (HAS_DOM && G.running) KY.toast('境界越しに持ち込んだ：' + item, 'item');
    return true;
  };

  /* ───────── 行動 ───────── */
  const ACTS = KY.ACTS = [
    { id: 'look', label: '調べる', key: '1', icon: 'look' },
    { id: 'photo', label: '撮影', key: '2', icon: 'photo' },
    { id: 'record', label: '録音', key: '3', icon: 'record' },
    { id: 'scan', label: 'スキャン', key: '4', icon: 'scan' },
    { id: 'talk', label: '聞き込み', key: '5', icon: 'talk' },
  ];
  // その行動ができるか（できないときは理由）
  KY.actState = function (areaId, spot, act) {
    const s = S();
    const acts = spot ? (spot.acts || ['look']) : ['look', 'photo', 'record', 'scan'];
    if (acts.indexOf(act) < 0) return { ok: false, reason: spot ? 'ここでは、それはできない。' : '話を聞ける相手がいない。', hide: true };
    const lookOnly = s.world !== s.baseWorld && s.sync < 3;
    if (lookOnly && act !== 'look' && act !== 'photo' && !(act === 'scan' && KY.hasEquip('portable_observer'))) return { ok: false, reason: '今の同期では、向こう側を「見る」ことしかできない。' };
    if (act === 'photo' && !KY.hasEquip('phone')) return { ok: false, reason: '撮影する機材がない。' };
    if (act === 'record' && !KY.hasEquip('phone') && !KY.hasEquip('hq_recorder')) return { ok: false, reason: '録音する機材がない。' };
    if (act === 'scan' && !KY.hasEquip('magnet') && !KY.hasEquip('boundary_meter') && !KY.hasEquip('wave_scanner')) return { ok: false, reason: '計測する機材がない。' };
    if ((act === 'photo' || act === 'scan') && s.world !== 'A' && (s.items.battery | 0) <= 0) return { ok: false, reason: '端末の電力が足りない。研究所で充電しよう。' };
    return { ok: true };
  };
  function hash(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
  function rnd(seed) { let x = seed || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  KY.scanData = function (areaId, spot, w) {
    const r = rnd(hash(areaId + '/' + (spot ? spot.id : '*') + '/' + w));
    const d = KY.dangerOf(areaId, w), o = (spot && spot.scan) || {};
    const v = {
      mag: o.mag != null ? o.mag : +(0.03 + r() * 0.3 + d * 0.35).toFixed(2),
      temp: o.temp != null ? o.temp : +(14 + r() * 8 - (w === 'C' ? 7 : 0) - d * 0.6).toFixed(1),
      pos: w === 'A' ? `N35.${(6000 + (r() * 999 | 0))} E137.${(2000 + (r() * 999 | 0))}` : `N35.${(6000 + (r() * 999 | 0))} E137.${(2000 + (r() * 999 | 0))}（二重 ±${(3 + r() * 20) | 0}m）`,
      bnd: o.bnd != null ? o.bnd : +(d * 0.17 + r() * 0.08 + (w !== 'A' ? 0.12 : 0)).toFixed(2),
      text: o.text || '',
      showBnd: KY.hasEquip('boundary_meter') || KY.hasEquip('wave_scanner'),
      wave: KY.hasEquip('wave_scanner'),
      other: false,
    };
    // 別の層に何かある地点
    const a = getArea(areaId);
    if (a) Object.keys(a.worlds).forEach(ow => { if (ow !== w && (a.worlds[ow].spots || []).some(sp => sp.on && (!spot || Math.abs(sp.x - spot.x) < 0.12 && Math.abs(sp.y - spot.y) < 0.15))) v.other = true; });
    v.comment = o.text || (v.showBnd && v.bnd >= 0.6 ? '境界指数が高い。ここは、向こう側に近い。' : v.wave && v.other ? '波形に、もう一つの層の反応が重なっている。' : v.mag > 1.2 ? '磁場がやや強い。' : '数値に目立った異常はない。');
    return v;
  };
  const DEF_LINES = {
    look: ['特に変わったところはない。', '目を凝らしても、おかしなところは見つからない。', '……普通だ。普通に見える。'],
    photo: ['シャッターを切った。特に何も写らない。', '撮影した。見たままのものが写っている。'],
    record: { A: '数秒録音した。空調と、遠くの車の音だけ。', B: '録音した。知らない町の雑音――聞き慣れない店の呼び込みが混じる。', C: '録音した。風の音しか入っていない。' },
    talk: '話を聞ける相手がいない。',
  };
  function defLine(act, areaId, spot) {
    const s = S(), w = s.world;
    if (act === 'look') { let l = DEF_LINES.look[hash(areaId + (spot ? spot.id : '') + s.evidence.length) % 3]; if (w === 'C' && !KY.hasEquip('flashlight')) l = '暗い。' + l; return l; }
    if (act === 'photo') return DEF_LINES.photo[hash(areaId + (spot ? spot.id : '')) % 2];
    if (act === 'record') { let l = DEF_LINES.record[w] || DEF_LINES.record.A; if (KY.hasEquip('hq_recorder') && KY.dangerOf(areaId, w) >= 2) l += '\nノイズの底に、かすかな声のようなものがある気もする。'; return l; }
    return DEF_LINES.talk;
  }
  KY._defLine = defLine;
  function spotsOf(areaId, w, K) {
    const a = getArea(areaId); if (!a || !a.worlds[w]) return [];
    return (a.worlds[w].spots || []).filter(sp => { if (!sp || !sp.cond) return !!sp; try { return !!sp.cond(K || G.K || KY); } catch (e) { return false; } });
  }
  KY.spotsOf = spotsOf;
  // 行動を一回行う（DOM でもテストでも同じ流れ）
  KY._doAction = async function (areaId, spot, act) {
    const s = S(), K = G.K || KY;
    const a = getArea(areaId); if (!a) return false;
    const st = KY.actState(areaId, spot, act);
    if (!st.ok) { KY.se('error'); await KY.say(['n:' + st.reason]); return false; }
    const w = s.world, W = a.worlds[w] || {};
    if (w !== 'A' && (s.items.battery | 0) > 0) s.items.battery--;
    const handler = spot ? (spot.on && spot.on[act]) : (W.on && W.on[act]);
    const evId = spot && spot.ev && spot.ev[act];
    G.lastAct = { area: areaId, spot: spot ? spot.id : null, act, world: w };
    if (act === 'photo') {
      KY._photoCtx = { scene: W.scene || a.id, world: w, rect: spot ? { x: spot.x, y: spot.y, w: spot.w, h: spot.h } : null };
      await UI().photoFx(spot);
    }
    let scanned = false;
    if (act === 'scan') { const d = KY.scanData(areaId, spot, w); await UI().scanFx(d, !!handler); scanned = !handler; }
    if (act === 'record') await UI().recFx(evId);
    s.seen[areaId + '/' + w + '/' + (spot ? spot.id : '*') + '/' + act] = 1;
    try {
      if (handler) await handler(K, spot);
      else if (!scanned) await KY.say(defLine(act, areaId, spot).split('\n').map(x => 'n:' + x));
      if (evId) KY.gain(evId);
    } finally { KY._photoCtx = null; }
    KY.stab(-KY.drainFor(KY.dangerOf(areaId, w)));
    // 短時間の切替は数回の行動で元の層に戻る
    if (s.world !== s.baseWorld && G.switchLeft > 0 && !G.slipNow) {
      G.switchLeft--;
      if (G.switchLeft <= 0) {
        const from = s.world; s.world = s.baseWorld;
        KY.stageFlicker && KY.stageFlicker(from, 300);
        KY._queue(K2 => KY.say(['#se switch', 'n:シロとの同期が途切れた。見えていた景色が、元の層に戻る。']));
      }
    }
    hud();
    return true;
  };
  function refill() {
    const it = S().items; let got = false;
    if ((it.battery | 0) < ITEMS.battery.max && KY.hasEquip('phone')) { it.battery = ITEMS.battery.max; got = true; }
    if ((it.light | 0) < ITEMS.light.max && KY.hasEquip('flashlight')) { it.light = ITEMS.light.max; got = true; }
    if (S().sync >= 2 || S().stability < 100) { if ((it.med | 0) < 1) { it.med = 1; got = true; } if ((it.stab | 0) < 1 && S().sync >= 2) { it.stab = 1; got = true; } }
    if (got && HAS_DOM) KY.toast('研究所で補給した\n電力・電池を満タンにした', 'item');
    hud();
  }
  KY._refill = refill;
  function dangerLayer(d) {
    const L = [];
    if (d >= 2) L.push('wire');
    if (d >= 3) L.push('radio');
    if (d >= 4) L.push('whistle_far');
    if (d >= 5) L.push('voices');
    KY._ambLayer(L);
  }

  /* ───────── 探索ループ ───────── */
  let EX = null;
  const UI = () => KY.UI;
  KY.explore = async function (opts) {
    opts = opts || {};
    const K = G.K || KY;
    const goal = () => { try { return opts.goal ? !!opts.goal(K) : false; } catch (e) { console.error('[KY] explore goal', e); return false; } };
    await KY._flush();
    if (goal()) return true;
    // 対象の場所はまだ解放されていなければ解放する（地図に何も出ない事故を防ぐ）
    if (Array.isArray(opts.areas)) opts.areas.forEach(id => { if (KY.AREAS[id] && S().areas.unlocked.indexOf(id) < 0) S().areas.unlocked.push(id); });
    const prevEX = EX;
    EX = { opts, goal, area: null };
    let next = opts.start && KY.AREAS[opts.start] ? opts.start : null;
    try {
      for (;;) {
        await KY._flush();
        if (goal()) break;
        if (G.slipNow) { G.slipNow = false; const h = KY.homeArea(); next = h && (!opts.areas || opts.areas.indexOf(h) >= 0) ? h : null; }
        const list = KY.exploreAreas(opts);
        const id = next || (list.length === 1 && !opts.mapAlways && !EX.wasIn ? list[0] : await UI().exMap(opts, list));
        next = null;
        if (!id || !KY.AREAS[id]) continue;
        const r = await areaLoop(id, opts, goal);
        EX.wasIn = true;
        if (r === 'goal') break;
      }
    } finally {
      EX = prevEX;
      KY._ambLayer([]);
      KY._hudExtra.loc = '';
      UI().exClose();
      hud();
    }
    return true;
  };
  KY.exploreAreas = function (opts) {
    const K = G.K || KY;
    const ids = Array.isArray(opts && opts.areas) ? opts.areas : Object.keys(KY.AREAS);
    return ids.filter(id => KY.AREAS[id] && KY.areaOpen(id, K));
  };
  KY.inExplore = () => !!EX;
  async function areaLoop(id, opts, goal) {
    const s = S(), a = getArea(id);
    const ws = worldsOf(id);
    if (ws.indexOf(s.baseWorld) >= 0) s.world = s.baseWorld; else if (ws.indexOf(s.world) < 0) s.world = ws[0] || 'A';
    EX.area = id;
    if (s.areas.visited.indexOf(id) < 0) s.areas.visited.push(id);
    KY._hudExtra.loc = KY.areaName(id);
    if (/^center/.test(id) || id === KY.HOME_AREA) refill();
    KY.autosave();
    try {
      for (;;) {
        dangerLayer(KY.dangerOf(id, s.world));
        const W = a.worlds[s.world] || {};
        KY.stageOpts({});
        KY.scene(W.scene || id, s.world);
        await KY._flush();
        if (G.slipNow) return 'slip';
        if (goal()) return 'goal';
        const it = await UI().exArea(id, opts);
        if (!it) continue;
        if (it.nav === 'map') return 'map';
        if (it.nav === 'switch') {
          const r = KY.switchWorld(id, it.to);
          if (!r.ok) { KY.se('error'); await KY.say(['n:' + r.reason]); }
          else if (r.mode === 'look' && !S().flags.__lookTip) { S().flags.__lookTip = true; await KY.say(['n:（同期Lv2：向こう側は「調べる」「撮影」で見ることしかできない。数回で元の層に戻る）']); }
        } else if (it.nav === 'item') {
          if (KY.useItem(it.id)) await KY.say(['n:' + KY.itemName(it.id) + 'を使った。存在安定度 ' + Math.round(S().stability) + '。']);
        } else if (it.act) {
          const sp = it.spot ? spotsOf(id, s.world).find(x => x.id === it.spot) : null;
          await KY._doAction(id, sp || null, it.act);
        }
        if (G.slipNow) return 'slip';
        if (goal()) return 'goal';
      }
    } finally {
      if (s.world !== s.baseWorld) { s.world = s.baseWorld; G.switchLeft = 0; }
      EX.area = null;
    }
  }

  /* ───────── 追跡（逃げる・隠れる・追い払う） ───────── */
  const CH_ACT = KY.CHASE_ACTS = [{ id: 'run', label: '走る' }, { id: 'hide', label: '隠れる' }, { id: 'repel', label: '光で追い払う' }];
  KY._chaseJudge = function (round, act) {
    const ok = round && round.ok ? (Array.isArray(round.ok) ? round.ok : [round.ok]) : ['run', 'hide', 'repel'];
    if (act === 'repel') {
      if (!KY.hasEquip('flashlight') || (S().items.light | 0) <= 0) return { ok: false, why: '懐中電灯の電池がない。' };
      S().items.light--;
    }
    if (!act) return { ok: false, why: '迷っているうちに、距離を詰められた。' };
    return { ok: ok.indexOf(act) >= 0, why: '' };
  };
  const CH_DEF_ROUNDS = [
    { text: '背後で、何かが地面を擦る音。まだ距離はある。', ok: ['run'] },
    { text: '道の先が行き止まりだ。脇に、崩れかけた物置の陰がある。', ok: ['hide'] },
    { text: '白くない「何か」が、物陰を覗き込もうとしている。', ok: ['repel', 'run'] },
  ];
  KY.chase = async function (def) {
    def = def || {};
    await KY._flush();
    if (def.intro) await KY.say(def.intro);
    const rounds = Array.isArray(def.rounds) && def.rounds.length ? def.rounds : CH_DEF_ROUNDS;
    let clean = true;
    KY.se('heart');
    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      const act = await UI().chaseRound(def, r, i, rounds.length);
      const j = KY._chaseJudge(r, act);
      if (j.ok) { await UI().chaseResult(true, r.good || (act === 'hide' ? '息を殺す。気配が、すぐそばを通り過ぎていった。' : act === 'repel' ? '光を向けると、それは輪郭ごと揺らいで退いた。' : '走った。足音が少しずつ遠ざかる。')); }
      else {
        clean = false;
        KY.stab(-(def.damage || 6));
        KY.fx('shake');
        await UI().chaseResult(false, (j.why ? j.why + '\n' : '') + (r.bad || '冷たいものが肩に触れた。自分の輪郭が、一瞬ぼやける。'));
      }
    }
    UI().chaseEnd();
    if (def.id) KY.flag('chase_' + def.id, clean ? 'clean' : 'hurt');
    if (def.outro) await KY.say(def.outro);
    return clean;
  };

  /* ═════════════════════════ DOM ═════════════════════════ */
  const EXUI = KY._EXUI = { sel: {}, res: null, area: null };
  const AUTO = KY._auto;
  AUTO.explore = AUTO.explore || [];
  AUTO.chase = AUTO.chase || [];
  const HEADLESS = {
    exMap(opts, list) {
      while (AUTO.explore.length) { const it = AUTO.explore.shift(); if (it && it.area) return Promise.resolve(it.area); }
      return Promise.reject(new Error('KY test: explore の台本が尽きた（地図）'));
    },
    exArea() {
      if (!AUTO.explore.length) return Promise.reject(new Error('KY test: explore の台本が尽きた（場所）'));
      return Promise.resolve(AUTO.explore.shift());
    },
    exClose() {},
    photoFx() { return Promise.resolve(); }, scanFx() { return Promise.resolve(); }, recFx() { return Promise.resolve(); },
    chaseRound() { return Promise.resolve(AUTO.chase.length ? AUTO.chase.shift() : null); },
    chaseResult() { return Promise.resolve(); }, chaseEnd() {},
  };
  if (!HAS_DOM) { Object.assign(KY.UI, HEADLESS); return finishMenus(); }

  const $ = KY._el, button = KY._button, D = KY._D;
  function icon(name) {
    const A = root.KY_ART;
    let has = !!(A && typeof A.icon === 'function');
    if (has && typeof A.ids === 'function') { try { has = (A.ids('icon') || []).indexOf(name) >= 0; } catch (e) {} }
    if (has) {
      try {
        const r = A.icon(name);
        if (r && r.nodeType === 1) { const c = r.cloneNode ? (r.tagName === 'CANVAS' ? cloneCanvas(r) : r.cloneNode(true)) : r; c.classList.add('ic'); c.setAttribute('aria-hidden', 'true'); return c; }
        if (typeof r === 'string' && /^(data:|.*\.(svg|png|webp))/.test(r)) { const im = $('img', 'ic'); im.src = r; im.alt = ''; return im; }
      } catch (e) {}
    }
    const g = { look: '◎', photo: '▣', record: '●', scan: '≋', talk: '❝', map: '⌖', switch: '⟁', item: '▤', run: '»', hide: '▥', repel: '✦' }[name] || '・';
    const sp = $('span', 'ic glyph', g); sp.setAttribute('aria-hidden', 'true');
    return sp;
  }
  function cloneCanvas(c) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; try { n.getContext('2d').drawImage(c, 0, 0); } catch (e) {} return n; }
  KY._icon = icon;
  // 場面の 0..1 座標 → 場面キャンバス上の % （KY_ART の cover 配置に合わせる。16:9 の画面では等倍）
  function toPct(x, y) {
    const A = root.KY_ART, cv = D.stage;
    if (A && typeof A.toCanvas === 'function' && cv && cv.width > 0) {
      try { const p = A.toCanvas(x, y, cv.width, cv.height); return [p.x / cv.width * 100, p.y / cv.height * 100]; } catch (e) {}
    }
    return [x * 100, y * 100];
  }
  KY._toPct = toPct;
  // 地図：章の場所 id → KY_ART.MAP_AREAS の地点（絵の地点アイコンにピンを重ねる）
  function artKey(id) {
    const M = root.KY_ART && root.KY_ART.MAP_AREAS; if (!M) return null;
    if (M[id]) return id;
    const a = KY.AREAS[id], sc = a && a.worlds && (a.worlds.A || a.worlds[Object.keys(a.worlds)[0]] || {}).scene;
    if (/^center/.test(id) || /^center_/.test(sc || '')) return M.center ? 'center' : null;
    return Object.keys(M).find(k => M[k].scene && M[k].scene === sc) || null;
  }
  KY._artKey = artKey;
  KY.mapOpts = function (current) {
    const s = S(), K = G.K || KY;
    const un = [], vis = [];
    Object.keys(KY.AREAS).forEach(id => { const k = artKey(id); if (!k) return; if (KY.areaOpen(id, K) && un.indexOf(k) < 0) un.push(k); if (s.areas.visited.indexOf(id) >= 0 && vis.indexOf(k) < 0) vis.push(k); });
    return { unlocked: un, visited: vis, current: current ? artKey(current) : null };
  };
  function clearSpots() { D.spots.innerHTML = ''; D.spots.className = 'ky-spots'; }
  function showPanel() { KY._hideDlg(); D.ex.hidden = false; }

  /* ── 地図 ── */
  function exMap(opts, list) {
    return KY._pend(done => {
      const s = S();
      KY._hudExtra.loc = '月代町';
      hud();
      KY.stageOpts(KY.mapOpts(EX && EX.lastArea));
      KY.scene('town_map', s.baseWorld);
      KY._ambLayer([]);
      clearSpots();
      const M = root.KY_ART && root.KY_ART.MAP_AREAS, groups = {};
      list.forEach(id => { const k = artKey(id); if (k) (groups[k] = groups[k] || []).push(id); });
      D.spots.classList.add('map');
      const pick = id => { clearSpots(); D.ex.hidden = true; KY.se('beep'); if (EX) EX.lastArea = id; KY.stageOpts({}); done(id); };
      const bm = KY.hasEquip('boundary_meter');
      list.forEach(id => {
        const a = KY.AREAS[id]; let m = a.map || { x: 0.5, y: 0.5 };
        const k = artKey(id), g = k ? groups[k] : null;
        let onArt = false;
        if (k && M && M[k]) { const i = g.indexOf(id); m = { x: M[k].x + (g.length > 1 ? (i - (g.length - 1) / 2) * 0.1 : 0), y: M[k].y + (g.length > 1 ? 0.1 : 0) }; onArt = g.length === 1; }
        const okW = worldsOf(id).indexOf(s.baseWorld) >= 0 || s.baseWorld === 'A';
        const b = button('', () => pick(id), 'pin' + (onArt ? ' on-art' : ''));
        const [px, py] = toPct(clamp(m.x, 0.04, 0.96), clamp(m.y, 0.05, 0.95));
        b.style.left = px + '%'; b.style.top = py + '%';
        b.appendChild($('span', 'pin-dot'));
        if (!onArt) b.appendChild($('span', 'pin-l', KY.areaName(id)));
        if (s.areas.visited.indexOf(id) < 0) b.appendChild($('span', 'pin-new', 'NEW'));
        if (bm) { const d = KY.dangerOf(id, s.baseWorld); b.dataset.d = d; }
        if (!okW) b.disabled = true;
        b.setAttribute('aria-label', KY.areaName(id) + 'へ行く');
        D.spots.appendChild(b);
      });
      showPanel();
      D.ex.innerHTML = '';
      D.ex.dataset.mode = 'map';
      const top = $('div', 'ex-top');
      top.append($('span', 'ex-tag', 'MAP ▍月代町'), $('span', 'ex-goal', opts.hint ? '目的：' + opts.hint : '調べる場所を選ぶ'));
      const grid = $('div', 'ex-areas');
      list.forEach(id => {
        const b = button('', () => pick(id), 'area-btn');
        b.appendChild($('span', 'ab-n', KY.areaName(id)));
        const sub = [];
        if (s.areas.visited.indexOf(id) < 0) sub.push('未調査');
        if (bm) sub.push('危険度 ' + KY.dangerOf(id, s.baseWorld));
        if (sub.length) b.appendChild($('span', 'ab-s', sub.join('・')));
        if (worldsOf(id).indexOf(s.baseWorld) < 0 && s.baseWorld !== 'A') { b.disabled = true; b.appendChild($('span', 'ab-s', 'この層では到達できない')); }
        grid.appendChild(b);
      });
      const nav = $('div', 'ex-nav');
      nav.append(navBtn('観測ボード', 'board', () => KY.openMenu('board')), navBtn('手帳', 'item', () => KY.openMenu('notebook')), navBtn('持ち物', 'item', () => KY.openMenu('items')));
      D.ex.append(top, grid, nav);
      KY._focusFirst(grid);
    });
  }
  function navBtn(label, ic, fn, cls) { const b = button('', fn, 'nav-btn ' + (cls || '')); b.append(icon(ic), $('span', '', label)); return b; }

  /* ── 場所 ── */
  function exArea(id, opts) {
    return KY._pend(done => {
      EXUI.res = done; EXUI.area = id; EXUI.opts = opts;
      renderArea();
    });
  }
  function emit(it) { const d = EXUI.res; if (!d) return; EXUI.res = null; D.ex.hidden = true; d(it); }
  function renderArea() {
    const id = EXUI.area, opts = EXUI.opts || {}, s = S(), a = getArea(id);
    if (!a || !EXUI.res) return;
    const w = s.world, spots = spotsOf(id, w);
    let sel = EXUI.sel[id + '/' + w];
    if (sel && !spots.find(x => x.id === sel)) sel = null;
    const selSpot = sel ? spots.find(x => x.id === sel) : null;
    KY._hudExtra.loc = KY.areaName(id); hud();
    // ホットスポット
    clearSpots();
    const shiro = KY.hasEquip('shiro_link');
    spots.forEach((sp, i) => {
      const b = button('', () => {
        if (EXUI.sel[id + '/' + w] === sp.id) { const first = (sp.acts || ['look'])[0]; act(first, sp); return; }
        EXUI.sel[id + '/' + w] = sp.id; renderArea();
      }, 'hs' + (sp.id === sel ? ' sel' : ''));
      const [x0, y0] = toPct(sp.x, sp.y), [x1, y1] = toPct(sp.x + sp.w, sp.y + sp.h);
      b.style.left = x0 + '%'; b.style.top = y0 + '%'; b.style.width = (x1 - x0) + '%'; b.style.height = (y1 - y0) + '%';
      if (sp.y < 0.1) b.classList.add('top');
      b.setAttribute('aria-label', sp.label || sp.id);
      b.append($('i', 'c1'), $('i', 'c2'), $('i', 'c3'), $('i', 'c4'));
      if (sp.id === sel) b.appendChild($('span', 'hs-l', sp.label || ''));
      const seen = Object.keys(s.seen).some(k => k.indexOf(id + '/' + w + '/' + sp.id + '/') === 0);
      if (seen) b.classList.add('seen');
      if (shiro && !seen && sp.on) b.appendChild($('span', 'hs-shiro'));
      D.spots.appendChild(b);
    });
    // パネル
    showPanel();
    D.ex.innerHTML = ''; D.ex.dataset.mode = 'area';
    const top = $('div', 'ex-top');
    const d = KY.dangerOf(id, w);
    const dz = $('span', 'ex-danger', '危険度 ' + d + '｜' + DANGER_TXT[d]); dz.dataset.d = d;
    top.append($('span', 'ex-tag', KY.areaName(id)));
    if (s.sync >= 2 || w !== 'A') { const wc = $('span', 'ex-world', KY.WORLD_LABEL[w]); wc.dataset.w = w; top.appendChild(wc); }
    top.appendChild(dz);
    if (opts.hint) top.appendChild($('span', 'ex-goal', '目的：' + opts.hint));
    // 境界反応（同期Lv1以上）
    if (s.sync >= 1 && worldsOf(id).length > 1) {
      const other = worldsOf(id).filter(x => x !== w).some(x => spotsOf(id, x).some(sp => sp.on));
      if (other) top.appendChild($('span', 'ex-sense', s.sync >= 2 ? '境界反応あり' : 'シロが耳を立てている'));
    }
    if (s.world !== s.baseWorld) top.appendChild($('span', 'ex-sense warn', s.sync >= 3 ? `切替中（あと${G.switchLeft}回）` : `観測のみ（あと${G.switchLeft}回）`));
    // 対象の一覧（ホットスポットをボタンでも選べる）
    const tg = $('div', 'ex-targets');
    const allB = button('場所全体', () => { EXUI.sel[id + '/' + w] = null; renderArea(); }, 'tg' + (!selSpot ? ' on' : ''));
    tg.appendChild(allB);
    spots.forEach(sp => { const b = button(sp.label || sp.id, () => { EXUI.sel[id + '/' + w] = sp.id; renderArea(); }, 'tg' + (sp.id === sel ? ' on' : '')); tg.appendChild(b); });
    // 行動
    const ab = $('div', 'ex-acts');
    ACTS.forEach(A => {
      const st = KY.actState(id, selSpot, A.id);
      const b = button('', () => act(A.id, selSpot), 'act-btn');
      b.append(icon(A.icon), $('span', 'act-l', A.label), $('span', 'act-k', A.key));
      if (!st.ok) { b.classList.add('off'); if (st.hide) b.disabled = true; b.title = st.reason; }
      ab.appendChild(b);
    });
    // 移動・境界観測
    const nav = $('div', 'ex-nav');
    nav.appendChild(navBtn('地図へ', 'map', () => emit({ nav: 'map' })));
    const ws = worldsOf(id);
    if (s.sync >= 2 && ws.length > 1) {
      const sb = navBtn('境界観測', 'switch', () => openSwitch(id), 'switch');
      nav.appendChild(sb);
    }
    nav.appendChild(navBtn('持ち物', 'item', () => openItems()));
    nav.appendChild(navBtn('ボード', 'board', () => KY.openMenu('board')));
    const hist = $('div', 'ex-hist'); KY._renderHist(hist, 3, 0);
    D.ex.append(top, tg, hist, ab, nav);
    const selB = tg.querySelector('.on'); if (selB) try { selB.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
  }
  EXUI.refresh = () => { if (EXUI.res) renderArea(); };
  function act(a, sp) { emit({ act: a, spot: sp ? sp.id : null }); }
  function openSwitch(id) {
    const s = S(), ws = worldsOf(id).filter(w => w !== s.world);
    const h = KY._openOv('ov-choice', { label: '境界観測' });
    const box = $('div', 'ky-win choice-box');
    box.appendChild($('div', 'choice-q', '境界観測：どの層を見る？'));
    box.appendChild($('div', 'choice-s', `シロ同期 Lv${s.sync}｜${SYNC_TXT[s.sync]}`));
    const po = KY.hasEquip('portable_observer');
    ws.forEach(w => {
      const b = button('', () => { h.close(); emit({ nav: 'switch', to: w }); }, 'choice-btn sw-btn');
      if (po) { const c = $('canvas', 'sw-prev'); c.width = 224; c.height = 126; const W = getArea(id).worlds[w]; KY.drawScene(c.getContext('2d'), W.scene, w, 0, { w: 224, h: 126, thumb: true }); b.appendChild(c); }
      b.appendChild($('span', 'choice-t', KY.WORLD_LABEL[w] + (w === s.baseWorld ? '（元の層へ戻る）' : '')));
      b.appendChild($('span', 'choice-s', (po ? '危険度 ' + KY.dangerOf(id, w) + '｜' + DANGER_TXT[KY.dangerOf(id, w)] : '') + (KY.hasEquip('shiro_link') ? '' : (po ? '・' : '') + '切替で安定度が少し減る')));
      box.appendChild(b);
    });
    box.appendChild(button('やめる', () => h.close(), 'ghost'));
    h.el.appendChild(box); h.esc = () => h.close();
    h.key = e => { const n = +e.key; if (n >= 1 && n <= ws.length) { e.preventDefault(); h.close(); emit({ nav: 'switch', to: ws[n - 1] }); return true; } return false; };
    KY._focusFirst(box);
  }
  function openItems() {
    const s = S();
    const h = KY._openOv('ov-choice', { label: '持ち物' });
    const box = $('div', 'ky-win choice-box');
    box.appendChild($('div', 'choice-q', `持ち物｜存在安定度 ${Math.round(s.stability)}`));
    ['med', 'stab'].forEach(id => {
      const n = s.items[id] | 0;
      const b = button('', () => { h.close(); emit({ nav: 'item', id }); }, 'choice-btn');
      b.append($('span', 'choice-t', `${KY.itemName(id)} ×${n}`), $('span', 'choice-s', ITEMS[id].desc));
      b.disabled = n <= 0 || s.stability >= 100;
      box.appendChild(b);
    });
    box.appendChild($('div', 'choice-s', `${KY.itemName('battery')} ${s.items.battery | 0}／${ITEMS.battery.max}　${KY.itemName('light')} ${s.items.light | 0}／${ITEMS.light.max}`));
    box.appendChild(button('閉じる', () => h.close(), 'ghost'));
    h.el.appendChild(box); h.esc = () => h.close();
    KY._focusFirst(box);
  }
  function exClose() { clearSpots(); if (D.ex) { D.ex.hidden = true; D.ex.innerHTML = ''; } EXUI.res = null; }
  KY._keyhook.push(e => {
    if (!EXUI.res || !EXUI.area) return false;
    const A = ACTS.find(x => x.key === e.key);
    if (A) { const btns = D.ex.querySelectorAll('.act-btn'); const b = btns[ACTS.indexOf(A)]; if (b && !b.disabled) { e.preventDefault(); b.click(); return true; } }
    if (e.key === 'm' || e.key === 'M') { e.preventDefault(); emit({ nav: 'map' }); return true; }
    if ((e.key === 'b' || e.key === 'B') && D.ex.querySelector('.switch')) { e.preventDefault(); D.ex.querySelector('.switch').click(); return true; }
    return false;
  });

  /* ── 撮影・スキャン・録音の演出 ── */
  function photoFx(spot) {
    return KY._pend(done => {
      KY.se('shutter');
      const L = D.stageWrap;
      const fl = $('div', 'shot-flash'); L.appendChild(fl);
      const cv = D.stage;
      const card = $('div', 'shot-card');
      const pc = $('canvas'); const W = 320, H = 180; pc.width = W; pc.height = H;
      try {
        const r = spot ? { x: clamp(spot.x - 0.06, 0, 1), y: clamp(spot.y - 0.06, 0, 1), w: clamp(spot.w + 0.12, 0.2, 1), h: clamp(spot.h + 0.12, 0.2, 1) } : { x: 0, y: 0, w: 1, h: 1 };
        pc.getContext('2d').drawImage(cv, r.x * cv.width, r.y * cv.height, Math.min(r.w, 1 - r.x) * cv.width, Math.min(r.h, 1 - r.y) * cv.height, 0, 0, W, H);
      } catch (e) {}
      const d = new Date(); const st = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}  ${S().world}`;
      card.append(pc, $('div', 'shot-cap', st));
      L.appendChild(card);
      setTimeout(() => fl.remove(), 400);
      setTimeout(() => card.classList.add('out'), KY.reduced() ? 700 : 1000);
      setTimeout(() => { card.remove(); done(); }, KY.reduced() ? 900 : 1350);
    });
  }
  function scanFx(v, quick) {
    return KY._pend(done => {
      KY.se('scan');
      const L = D.stageWrap;
      const p = $('div', 'scan-panel');
      p.setAttribute('role', 'status');
      const head = $('div', 'scan-h', 'SCAN ▍' + (KY.hasEquip('wave_scanner') ? '異常波スキャナー' : KY.hasEquip('boundary_meter') ? '境界測定端末' : '簡易磁場計'));
      const wv = $('canvas', 'scan-wave'); wv.width = 480; wv.height = 90;
      const vals = $('div', 'scan-vals');
      p.append(head, wv, vals);
      L.appendChild(p);
      const t0 = performance.now(); let raf = 0, shown = false;
      const draw = () => {
        const t = (performance.now() - t0) / 1000, c = wv.getContext('2d'), W = wv.width, H = wv.height;
        c.fillStyle = 'rgba(4,10,24,.9)'; c.fillRect(0, 0, W, H);
        c.strokeStyle = 'rgba(95,214,230,.18)'; c.lineWidth = 1;
        for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
        c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();
        const prog = Math.min(1, t / 1.0);
        c.strokeStyle = '#5fd6e6'; c.lineWidth = 2; c.beginPath();
        for (let x = 0; x < W * prog; x++) {
          const u = x / W; let y = Math.sin(u * 24 + t * 6) * 8 * (0.4 + v.mag) + Math.sin(u * 71 + t * 3) * 3;
          if (v.wave && v.other) y += Math.exp(-Math.pow((u - 0.62) * 18, 2)) * 30 * Math.sin(u * 140 + t * 10);
          if (v.showBnd) y += (Math.random() - 0.5) * v.bnd * 22;
          x ? c.lineTo(x, H / 2 + y) : c.moveTo(x, H / 2 + y);
        }
        c.stroke();
        if (v.wave) { c.strokeStyle = 'rgba(217,180,90,.8)'; c.beginPath(); for (let x = 0; x < W * prog; x++) { const u = x / W; const y = Math.sin(u * 13 - t * 4) * 10 * v.bnd + (v.other ? Math.sin(u * 50) * 6 : 0); x ? c.lineTo(x, H / 2 + y) : c.moveTo(x, H / 2 + y); } c.stroke(); }
        if (prog >= 1 && !shown) { shown = true; fill(); }
        raf = requestAnimationFrame(draw);
      };
      const fill = () => {
        if (quick) { vals.appendChild($('div', 'sv', '計測完了')); setTimeout(close, 300); return; }
        const rows = [['磁場', v.mag + ' μT'], ['温度', v.temp + ' ℃'], ['位置', v.pos]];
        if (v.showBnd) rows.push(['境界指数', v.bnd.toFixed(2)]);
        if (v.wave) rows.push(['境界反応', v.other ? '重複波形あり' : 'なし']);
        rows.forEach(([k, x]) => { const r = $('div', 'sv'); r.append($('span', 'sk', k), $('span', 'sx', x)); vals.appendChild(r); });
        vals.appendChild($('div', 'sc', v.comment));
        const b = button('閉じる', close, 'scan-ok'); vals.appendChild(b); try { b.focus({ preventScroll: true }); } catch (e) {}
        p.addEventListener('click', close);
        const h = KY._openOv('ov-pass', { label: 'スキャン結果' }); h.key = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); close(); } return true; }; p._ov = h;
      };
      let closed = false;
      const close = () => { if (closed) return; closed = true; cancelAnimationFrame(raf); if (p._ov) p._ov.close(); p.remove(); done(); };
      raf = requestAnimationFrame(draw);
    });
  }
  function recFx(evId) {
    return KY._pend(done => {
      KY.se('rec');
      const p = $('div', 'rec-panel');
      p.innerHTML = '<span class="rec-dot"></span><span class="rec-l">REC</span><i class="rec-m"><b></b></i><span class="rec-t">00:00</span>';
      D.stageWrap.appendChild(p);
      const b = p.querySelector('b'), tt = p.querySelector('.rec-t'), t0 = performance.now();
      const iv = setInterval(() => { const t = (performance.now() - t0) / 1000; b.style.width = (20 + Math.random() * 70) + '%'; tt.textContent = '00:0' + Math.min(9, Math.floor(t * 3)); }, 90);
      if (evId) setTimeout(() => KY.playClip(evId), 200);
      setTimeout(() => { clearInterval(iv); p.classList.add('out'); }, 1300);
      setTimeout(() => { p.remove(); done(); }, 1600);
    });
  }

  /* ── 追跡 ── */
  let CH = null;
  function chaseRound(def, r, i, n) {
    return KY._pend(done => {
      KY._hideDlg();
      if (!CH) {
        const h = KY._openOv('ov-chase', { label: '追跡' });
        const box = $('div', 'chase-box');
        CH = { h, box };
        h.el.appendChild(box);
        h.esc = () => {};
      }
      const box = CH.box; box.innerHTML = '';
      box.appendChild($('div', 'chase-h', (def.title || '境界生物が近づいている') + `　${i + 1}/${n}`));
      const dist = $('div', 'chase-dist'); dist.innerHTML = '<span>距離</span><i><b></b></i>';
      dist.querySelector('b').style.width = Math.max(10, 90 - i * 25) + '%';
      box.appendChild(dist);
      box.appendChild($('div', 'chase-t', r.text || '何かが来る。'));
      const tm = $('div', 'chase-timer'); const tb = $('b'); tm.appendChild(tb); box.appendChild(tm);
      const row = $('div', 'chase-acts');
      const sec = (def.time || 6) * (KY.reduced() ? 1.6 : 1);
      let fin = false;
      const pick = a => { if (fin) return; fin = true; clearInterval(iv); done(a); };
      const bs = CH_ACT.map((A, k) => {
        const b = button('', () => pick(A.id), 'chase-btn');
        b.append(icon(A.id), $('span', '', A.id === 'repel' ? '追い払う' : A.label), $('span', 'act-k', String(k + 1)));
        if (A.id === 'repel') b.appendChild($('span', 'chase-sub', '光・電池 ' + (S().items.light | 0)));
        if (A.id === 'repel' && (!KY.hasEquip('flashlight') || (S().items.light | 0) <= 0)) b.classList.add('off');
        row.appendChild(b); return b;
      });
      box.appendChild(row);
      CH.h.key = e => { const k = +e.key; if (k >= 1 && k <= 3) { e.preventDefault(); bs[k - 1].click(); } return true; };
      const t0 = performance.now();
      const iv = setInterval(() => { const p = 1 - (performance.now() - t0) / (sec * 1000); tb.style.width = Math.max(0, p * 100) + '%'; if (p <= 0) pick(null); }, 50);
      KY._focusFirst(row);
    });
  }
  function chaseResult(ok, text) {
    return KY._pend(done => {
      if (!CH) return done();
      const box = CH.box; box.innerHTML = '';
      box.appendChild($('div', 'chase-h ' + (ok ? 'ok' : 'ng'), ok ? '回避' : '接触'));
      String(text).split('\n').forEach(t => box.appendChild($('div', 'chase-t', t)));
      const b = button('次へ', () => done(), 'primary'); box.appendChild(b);
      CH.h.key = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } return true; };
      KY._focusFirst(box);
    });
  }
  function chaseEnd() { if (CH) { CH.h.close(); CH = null; } }
  KY._reset.push(() => { CH = null; exClose(); });

  Object.assign(KY.UI, { exMap, exArea, exClose, photoFx, scanFx, recFx, chaseRound, chaseResult, chaseEnd });
  finishMenus();

  /* ═════════════════════════ メニューのタブ ═════════════════════════ */
  function finishMenus() {
    if (!HAS_DOM) return;
    const $ = KY._el, button = KY._button;
    // マップ
    KY.addMenu('map', 'マップ', 10, el => {
      const s = S();
      const wrap = $('div', 'mm-map');
      const c = $('canvas', 'mm-cv'); c.width = 640; c.height = 360;
      KY.drawScene(c.getContext('2d'), 'town_map', s.baseWorld, performance.now() / 1000, Object.assign({ w: 640, h: 360, thumb: true }, KY.mapOpts(null)));
      wrap.appendChild(c);
      const ids = Object.keys(KY.AREAS).filter(id => KY.areaOpen(id));
      const M = root.KY_ART && root.KY_ART.MAP_AREAS;
      ids.filter(id => !(M && artKey(id))).forEach(id => { const a = KY.AREAS[id], m = a.map || { x: .5, y: .5 }; const p = $('span', 'mm-pin' + (s.areas.visited.indexOf(id) >= 0 ? ' v' : ''), KY.areaName(id)); p.style.left = m.x * 100 + '%'; p.style.top = m.y * 100 + '%'; wrap.appendChild(p); });
      el.appendChild(wrap);
      el.appendChild($('div', 'set-note', ids.length ? ids.map(id => KY.areaName(id)).join('・') + '\n' + `調査地点 ${ids.length}か所（訪れた場所 ${s.areas.visited.length}）。探索中は地図から場所を選んで移動します。` : 'まだ調査地点はない。'));
    });
    // 境界危険度
    KY.addMenu('danger', '境界危険度', 70, el => {
      const s = S();
      const st = $('div', 'stab-big');
      st.innerHTML = `<div class="sb-h">存在安定度</div><div class="sb-v">${Math.round(s.stability)}</div><i class="sb-bar"><b style="width:${s.stability}%"></b></i>`;
      el.appendChild(st);
      el.appendChild($('div', 'set-note', '境界世界に長くいるほど下がる。70・50・30・10 を下回ると、自分と世界の「ずれ」が始まる。0 になっても死なないが、研究所へ押し戻される' + ((+s.flags.slipped || 0) ? `（これまで ${s.flags.slipped} 回）` : '') + '。'));
      const tbl = $('div', 'dg-table');
      const hd = $('div', 'dg-row dg-head'); hd.append($('span', '', '場所'), $('span', '', 'A'), $('span', '', 'B'), $('span', '', 'C')); tbl.appendChild(hd);
      const known = w => w === 'A' || s.sync >= 2 || KY.hasEquip('boundary_meter');
      Object.keys(KY.AREAS).filter(id => KY.areaOpen(id)).forEach(id => {
        const r = $('div', 'dg-row'); r.appendChild($('span', 'dg-n', KY.areaName(id)));
        ['A', 'B', 'C'].forEach(w => { const has = worldsOf(id).indexOf(w) >= 0; const d = KY.dangerOf(id, w); const c = $('span', 'dg-c', has ? (known(w) ? String(d) : '？') : '―'); if (has && known(w)) c.dataset.d = d; r.appendChild(c); });
        tbl.appendChild(r);
      });
      el.appendChild(tbl);
      const lg = $('div', 'dg-legend'); DANGER_TXT.forEach((t, i) => { const x = $('span', 'dg-c', i + ' ' + t); x.dataset.d = i; lg.appendChild(x); }); el.appendChild(lg);
    });
    // シロ同期
    KY.addMenu('sync', 'シロ同期', 75, el => {
      const s = S();
      const top = $('div', 'sync-top');
      const c = $('canvas', 'sync-face'); c.width = 160; c.height = 160;
      KY.drawPortrait(c.getContext('2d'), s.sync > 0 ? 'shiro' : null, 'normal', 160, 160, s.sync > 0 ? 'シロ' : '？');
      top.append(c, $('div', 'sync-lv', s.sync > 0 ? `同期 Lv${s.sync}` : '未同期'));
      el.appendChild(top);
      const list = $('div', 'sync-list');
      for (let i = 1; i <= 5; i++) { const r = $('div', 'sync-row' + (i <= s.sync ? ' on' : '')); r.append($('span', 'sr-l', 'Lv' + i), $('span', 'sr-t', i <= s.sync + 1 || s.sync >= 1 ? SYNC_TXT[i] : '？')); list.appendChild(r); }
      el.appendChild(list);
      el.appendChild($('div', 'set-note', s.sync >= 2 ? '探索中、ほかの層がある場所では「境界観測」で層を切り替えられる。' : '同期が進むと、同じ場所の別の層を観測できるようになる。'));
    });
    // 持ち物（職員証・消耗品・装備）
    KY.addMenu('items', '持ち物', 80, el => {
      const s = S(), lv = KY.stabLevel();
      const card = $('div', 'idcard' + (lv >= 1 ? ' drift' : ''));
      const ph = $('canvas', 'id-photo'); ph.width = 120; ph.height = 150;
      const g = ph.getContext('2d'); g.fillStyle = '#c9d6e3'; g.fillRect(0, 0, 120, 150);
      const fig = (x, a) => { g.fillStyle = `rgba(40,56,80,${a})`; g.beginPath(); g.arc(x, 58, 24, 0, 7); g.fill(); g.beginPath(); g.ellipse(x, 150, 46, 50, 0, Math.PI, 0); g.fill(); };
      fig(60, 1); if (lv >= 1) fig(92, 0.35); if (lv >= 3) { g.fillStyle = 'rgba(201,214,227,.5)'; g.fillRect(0, 50 + (Date.now() % 40), 120, 6); }
      const info = $('div', 'id-info');
      info.append($('div', 'id-org', lv >= 1 ? '境界事象対策局 月代分室' : '特殊現象観測センター 月代分室'), $('div', 'id-role', lv >= 1 ? '主任観測員' : '新人観測員'), $('div', 'id-name', s.name), $('div', 'id-no', 'No. ' + (lv >= 2 ? '0444-' : '0030-') + String(s.name.length * 7 + 112).padStart(4, '0')));
      card.append(ph, info);
      el.appendChild(card);
      const sec = t => el.appendChild($('div', 'set-h', t));
      sec('消耗品');
      Object.keys(ITEMS).forEach(id => {
        const r = $('div', 'it-row'); const d = ITEMS[id];
        r.append($('span', 'it-n', KY.itemName(id)), $('span', 'it-c', (s.items[id] | 0) + (d.max ? '／' + d.max : '')), $('span', 'it-d', d.desc));
        if (d.use) { const b = button('使う', () => { if (KY.useItem(id)) { KY.toast(KY.itemName(id) + 'を使った（安定度 ' + Math.round(S().stability) + '）'); el.innerHTML = ''; KY.MENU.find(m => m.id === 'items').render(el); } }, 'mini'); b.disabled = (s.items[id] | 0) <= 0 || s.stability >= 100; r.appendChild(b); }
        el.appendChild(r);
      });
      sec('装備');
      const tiers = ['初期', '中盤', '後半'];
      const owned = Object.keys(EQUIP).filter(id => KY.hasEquip(id));
      if (!owned.length) el.appendChild($('div', 'empty', 'まだ何も持っていない。'));
      owned.forEach(id => { const d = EQUIP[id]; const r = $('div', 'it-row eq'); r.append($('span', 'it-n', KY.equipName(id)), $('span', 'it-c', tiers[d.tier]), $('span', 'it-d', d.desc)); el.appendChild(r); });
      const carried = Object.keys(s.flags).filter(k => k.indexOf('carry_') === 0);
      if (carried.length) { sec('境界を越えて持ち込んだ物'); carried.forEach(k => el.appendChild($('div', 'it-row', k.slice(6) + '（観測層' + s.flags[k] + 'から）'))); }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
