'use strict';
// 万象堂：手相の計算（DOM を使わない。node でも試験できる）。
// ・線は「本人がなぞって確かめた物」だけを使う。写真から線を言い切らない（しわの候補は目安として見せるだけ）。
// ・なぞっていない線は「鑑定しない」。本人が「見当たらない」と決めた線だけ「無い」として読む。
// ・手の向き・大きさの違いは、本人が置く 3 点（手首のしわの中央・人差し指の付け根・小指の付け根）で揃える。
//   手のひらの座標：u＝小指の付け根 0 → 人差し指の付け根 1（親指側が 1 より大きい）、v＝手首 0 → 指の付け根の線 1。
// ・生命線の長さは寿命を表さない。年齢は「簡易な流年」（占い上の目安）としてだけ出す。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./bansho-core.js'));
  else root.BanshoPalm = factory(root.Bansho);
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function (B) {
  const LINES = {
    life: { n: '生命線', color: '#e0604c' },
    head: { n: '知能線', color: '#e0b24c' },
    heart: { n: '感情線', color: '#d86fb0' },
    fate: { n: '運命線', color: '#5aa7e0' },
    sun: { n: '太陽線', color: '#f0d060' },
    money: { n: '財運線', color: '#6cc48a' },
    marriage: { n: '結婚線', color: '#c79cf0' },
    sublife: { n: '副生命線', color: '#e08a7a' },
    other: { n: 'その他の線', color: '#bbbbbb' }
  };
  const ORDER = ['life', 'head', 'heart', 'fate', 'sun', 'money', 'marriage', 'sublife', 'other'];
  const AGE_SPAN = 80; // 簡易な流年：生命線の始まり 0 歳 → 手首側の端 80 歳（長さで割り振る）

  const sub = function (a, b) { return [a[0] - b[0], a[1] - b[1]]; };
  const dot = function (a, b) { return a[0] * b[0] + a[1] * b[1]; };
  const len = function (a) { return Math.hypot(a[0], a[1]); };

  // 3 点から手のひらの座標を作る。点は [x, y]（ピクセル。y は下向き）
  function frame(lm) {
    if (!lm || !lm.wrist || !lm.index || !lm.pinky) return null;
    const mid = [(lm.index[0] + lm.pinky[0]) / 2, (lm.index[1] + lm.pinky[1]) / 2];
    const vAx = sub(mid, lm.wrist), uAx = sub(lm.index, lm.pinky);
    const L = len(vAx), W = len(uAx);
    if (L < 1e-6 || W < 1e-6) return null;
    // 2 本の軸がほぼ平行なら、3 点の置き方がおかしい
    const sin = Math.abs(vAx[0] * uAx[1] - vAx[1] * uAx[0]) / (L * W);
    if (sin < 0.5) return null;
    // 左右の推定：自分の手のひらを見る向き（指が上）だと、右手は親指（人差し指）側が右に来る
    const cross = vAx[0] * uAx[1] - vAx[1] * uAx[0];
    const guess = cross > 0 ? 'R' : 'L';
    // 斜交座標：p = wrist + v * vAx + (u * uAx を小指の付け根から) を解く
    const det = uAx[0] * vAx[1] - uAx[1] * vAx[0];
    function toPalm(p) {
      // p - (pinky + wrist - mid) … 原点を「手首の高さの小指側」にした斜交座標
      const o = [lm.pinky[0] - vAx[0], lm.pinky[1] - vAx[1]];
      const d = sub(p, o);
      const u = (d[0] * vAx[1] - d[1] * vAx[0]) / det;
      const v = (uAx[0] * d[1] - uAx[1] * d[0]) / det;
      return [u, v];
    }
    return { toPalm: toPalm, palmLen: L, palmW: W, guess: guess };
  }

  function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += len(sub(pts[i], pts[i - 1])); return s; }
  // 線（1 本以上の区切り）の特徴。座標は手のひらの座標と、手のひらの長さで割った長さ
  function feat(segs, F) {
    const ps = segs.filter(function (s) { return s && s.length >= 2; });
    if (!ps.length) return null;
    const pal = ps.map(function (s) { return s.map(F.toPalm); });
    const lens = ps.map(function (s) { return polyLen(s) / F.palmLen; });
    const all = pal.reduce(function (a, s) { return a.concat(s); }, []);
    const us = all.map(function (p) { return p[0]; }), vs = all.map(function (p) { return p[1]; });
    return { n: ps.length, segs: pal, len: lens.reduce(function (a, x) { return a + x; }, 0), lens: lens, uMin: Math.min.apply(null, us), uMax: Math.max.apply(null, us), vMin: Math.min.apply(null, vs), vMax: Math.max.apply(null, vs), first: pal[0][0], last: pal[pal.length - 1][pal[pal.length - 1].length - 1] };
  }
  // 端の向きを揃える：生命線・知能線・感情線・運命線は決まった側から始まる物として並べ直す
  function orient(f, startFn) {
    if (!f) return f;
    const segs = f.segs.map(function (s) { return s.slice(); });
    const a = segs[0][0], b = segs[segs.length - 1][segs[segs.length - 1].length - 1];
    if (startFn(b) < startFn(a)) { segs.reverse(); segs.forEach(function (s) { s.reverse(); }); }
    return Object.assign({}, f, { segs: segs, first: segs[0][0], last: segs[segs.length - 1][segs[segs.length - 1].length - 1] });
  }
  const r2 = function (x) { return Math.round(x * 100) / 100; };

  // 一つの手の鑑定。hand = { side:'L'|'R', dominant:'L'|'R'|null, w, h, landmarks:{wrist,index,pinky}（0〜1）, lines:{type:{segs:[[[x,y],…],…], absent:bool}} }
  function analyze(hand) {
    const w = hand.w || 1, h = hand.h || 1;
    const px = function (p) { return [p[0] * w, p[1] * h]; };
    const lm = hand.landmarks && { wrist: px(hand.landmarks.wrist), index: px(hand.landmarks.index), pinky: px(hand.landmarks.pinky) };
    const F = frame(lm);
    if (!F) return { ok: false, error: 'landmarks' };
    const L = hand.lines || {};
    const segsOf = function (k) { return ((L[k] && L[k].segs) || []).map(function (s) { return s.map(px); }); };
    const f = {};
    ORDER.forEach(function (k) { f[k] = feat(segsOf(k), F); });
    // 向き：生命線は指側（v が大きい側）から、知能線は親指側（u が大きい側）から、感情線は小指側から、運命線は手首側から
    f.life = orient(f.life, function (p) { return -p[1]; });
    f.head = orient(f.head, function (p) { return -p[0]; });
    f.heart = orient(f.heart, function (p) { return p[0]; });
    f.fate = orient(f.fate, function (p) { return p[1]; });
    const absent = function (k) { return !f[k] && !!(L[k] && L[k].absent); };
    const items = [], themes = [], notes = [], facts = { side: hand.side, guess: F.guess, lines: {} };
    const add = function (k, h2, t, th, w2, label) { items.push({ h: LINES[k].n + '：' + h2, t: t, line: k }); (th || []).forEach(function (tg) { themes.push({ tag: tg, w: w2 || 0.8, src: '手相・' + LINES[k].n + '（' + label + '）' }); }); };
    const ageAt = function (frac) { return Math.round(frac * AGE_SPAN); };

    // 生命線
    if (f.life) {
      const x = f.life; facts.lines.life = { len: r2(x.len), uMin: r2(x.uMin), start: r2(x.first[1]), n: x.n };
      if (x.len >= 0.95) add('life', '長くはっきり', '力を少しずつ長く使う、持久型の活力として読みます。', ['patience', 'stability'], 0.8, '長い');
      else if (x.len < 0.6) add('life', '短め', '力を一気に注ぎ込む、集中型の活力として読みます。', ['challenge'], 0.6, '短め');
      else add('life', '標準の長さ', '活力の出し方に偏りが少ない形です。', ['stability'], 0.4, '標準');
      if (x.uMin < 0.72) add('life', '弧が大きく張り出す', '行動の範囲が広く、外へ向かう力が強い形です。', ['challenge', 'freedom'], 0.7, '張り出しが大きい');
      else if (x.uMin > 0.9) add('life', '弧が親指側に寄る', '力を内に蓄え、慎重に使う形です。', ['patience', 'introspect'], 0.6, '弧が小さい');
      if (x.first[1] > 0.78) add('life', '始まりが高い', '人差し指寄りから始まる生命線は、向上心の強さとして読みます。', ['lead'], 0.5, '始まりが高い');
      if (x.n > 1) {
        // 途切れの位置（簡易な流年）：線全体の長さの中で、区切りがどこに来るか
        let acc = 0; const ages = [];
        for (let i = 0; i < x.lens.length - 1; i++) { acc += x.lens[i]; ages.push(ageAt(acc / x.len)); }
        add('life', '途切れ・重なりがある', '線が区切れて見える所は、暮らしや考え方が切り替わる節目として読みます（簡易な流年で ' + ages.map(function (a) { return a + ' 歳ごろ'; }).join('・') + '）。', ['change'], 0.6, '区切れ');
        facts.lines.life.breaks = ages;
      }
      notes.push('生命線の長さは寿命を表すものではありません。');
    }
    // 知能線
    if (f.head) {
      const x = f.head; const drop = x.first[1] - x.last[1];
      facts.lines.head = { len: r2(x.len), drop: r2(drop), endU: r2(x.last[0]) };
      if (x.last[0] < 0.25) add('head', '小指側まで長く伸びる', '一つの考えを最後まで詰めていく、粘り強い思考として読みます。', ['intellect', 'patience'], 0.8, '長い');
      else if (x.len < 0.55) add('head', '短め', '考えるより先に決める、直感の速さとして読みます。', ['challenge'], 0.6, '短め');
      if (drop > 0.18) add('head', '手首の方へ下がる', '想像力や感性を生かした考え方として読みます。', ['creativity', 'express'], 0.8, '下がる');
      else if (drop < 0.07) add('head', 'まっすぐ横へ伸びる', '現実的で、筋道を立てる考え方として読みます。', ['work', 'intellect'], 0.8, 'まっすぐ');
      else add('head', 'ゆるやかに下がる', '現実と想像のつり合いが取れた考え方として読みます。', ['harmony'], 0.5, 'ゆるやか');
      if (f.life) {
        const dd = sub(x.first, f.life.first), gap = Math.hypot(dd[0] * F.palmW, dd[1] * F.palmLen) / F.palmLen;
        facts.lines.head.gapLife = r2(gap);
        if (gap > 0.12) add('head', '生命線から離れて始まる', '人に頼らず自分で決める、独立心と大胆さとして読みます。', ['freedom', 'challenge'], 0.6, '離れて始まる');
        else if (gap < 0.06) add('head', '生命線と同じ所から始まる', '動く前によく確かめる、慎重さとして読みます。', ['patience'], 0.5, '生命線と同じ起点');
      }
    }
    // 感情線
    if (f.heart) {
      const x = f.heart; const rise = x.last[1] - x.first[1];
      facts.lines.heart = { len: r2(x.len), endU: r2(x.last[0]), rise: r2(rise) };
      if (x.last[0] >= 0.85) add('heart', '人差し指の下まで届く', '人の世話を焼き、深く想う愛情として読みます。', ['care', 'love'], 0.8, '人差し指の下まで');
      else if (x.last[0] >= 0.55) add('heart', '中指の下あたりで終わる', '思ったことをまっすぐ伝える、率直な情として読みます。', ['express', 'love'], 0.7, '中指の下まで');
      else add('heart', '短め', 'さっぱりとした、距離を大切にする付き合い方として読みます。', ['freedom'], 0.6, '短め');
      if (rise > 0.08) add('heart', '指の方へ上がる', '気持ちを表に出しやすい形です。', ['express'], 0.5, '上がる');
      else if (rise < 0.02) add('heart', 'まっすぐ', '気持ちを内に秘め、落ち着いて扱う形です。', ['introspect'], 0.5, 'まっすぐ');
    }
    // 運命線
    if (f.fate) {
      const x = f.fate; facts.lines.fate = { len: r2(x.len), startU: r2(x.first[0]), startV: r2(x.first[1]) };
      if (x.first[1] < 0.15) add('fate', '手首の近くから始まる', '早いうちから自分の道を意識する形として読みます。', ['work', 'lead'], 0.7, '手首から');
      else if (x.first[0] > 0.85) add('fate', '生命線の側から始まる', '身近な人の支えから道が開ける形として読みます。', ['relations', 'care'], 0.6, '生命線側から');
      else if (x.first[0] < 0.3) add('fate', '小指側から始まる', '人との縁に引き上げられて道が開ける形として読みます。', ['relations'], 0.7, '小指側から');
      if (x.len >= 0.6) add('fate', '長く伸びる', '一つのことを長く続ける力として読みます。', ['stability', 'work'], 0.7, '長い');
    } else if (absent('fate')) add('fate', '見当たらない', '決まった型に縛られず、その時々で自分の道を選ぶ形として読みます。運命線が無いことは悪い意味ではありません。', ['freedom'], 0.6, '無し');
    // 太陽線・財運線
    if (f.sun) add('sun', f.sun.len >= 0.35 ? 'はっきり伸びる' : 'ある', '表現する喜び、人に認められる力として読みます。', ['express', 'creativity'], f.sun.len >= 0.35 ? 0.8 : 0.5, 'ある');
    else if (absent('sun')) add('sun', '見当たらない', '人目より、自分の納得を大切にする形として読みます。', ['introspect'], 0.3, '無し');
    if (f.money) add('money', 'ある', 'お金や物を巡らせる感覚、商いの勘として読みます。', ['wealth'], 0.8, 'ある');
    else if (absent('money')) add('money', '見当たらない', 'お金の巡りより、手元を堅実に守る形として読みます。', ['stability'], 0.3, '無し');
    // 結婚線（区切りの数＝本数）
    if (f.marriage) {
      const k = f.marriage.n, longest = Math.max.apply(null, f.marriage.lens);
      facts.lines.marriage = { count: k, longest: r2(longest) };
      if (k === 1) add('marriage', '1 本', '一つの縁を深く育てる形として読みます（占い上の結婚・パートナーの縁）。', ['love', 'stability'], 0.6, '1本');
      else add('marriage', k + ' 本', '縁の数が多い、または一つの縁の中に節目がある形として読みます（占い上の結婚・再婚の縁）。', ['relations', 'change'], 0.6, k + '本');
    } else if (absent('marriage')) add('marriage', '見当たらない', '縁の形にこだわらず、自然な出会いを待つ形として読みます。', ['freedom'], 0.3, '無し');
    if (f.sublife) add('sublife', 'ある', '支えてくれる人や、立ち直る力があるしるしとして読みます。', ['care', 'stability'], 0.6, 'ある');
    if (f.other) items.push({ h: LINES.other.n + '：' + f.other.n + ' 本', t: 'その他の線は、記録として残します（鑑定には使いません）。', line: 'other' });

    const traced = ORDER.filter(function (k) { return f[k]; });
    const skipped = ['life', 'head', 'heart', 'fate', 'sun', 'money', 'marriage'].filter(function (k) { return !f[k] && !absent(k); });
    if (skipped.length) notes.push('なぞっていない線（' + skipped.map(function (k) { return LINES[k].n; }).join('・') + '）は鑑定していません。');
    notes.push('写真の角度・光・手の開き方で、線の見え方は変わります。');
    facts.traced = traced; facts.skipped = skipped;
    const sideName = hand.side === 'L' ? '左手' : '右手';
    let role = '';
    if (hand.dominant === 'L' || hand.dominant === 'R') role = hand.side === hand.dominant ? '利き手：今の傾向・これから' : '利き手でない手：生まれ持った性質';
    return { ok: true, facts: facts, items: items, themes: themes, notes: notes, title: sideName + (role ? '（' + role + '）' : '') };
  }

  // 左右の比べ：見出しの違い（同じ線で、読みが違う所）を出す
  function labels(res) { const m = {}; res.items.forEach(function (it) { if (!it.line) return; (m[it.line] = m[it.line] || []).push(it.h.split('：')[1]); }); return m; }
  function compareHands(left, right, dominant) {
    if (!left || !right || !left.ok || !right.ok) return [];
    const a = labels(left), b = labels(right), out = [];
    const born = dominant === 'L' ? 'R' : 'L';
    ORDER.forEach(function (k) {
      if (k === 'other' || (!a[k] && !b[k])) return;
      const la = (a[k] || ['なぞっていない']).join('・'), lb = (b[k] || ['なぞっていない']).join('・');
      if (la === lb) out.push({ h: LINES[k].n + '：左右とも同じ読み', t: la });
      else out.push({ h: LINES[k].n + '：左右で違う', t: '左手は「' + la + '」、右手は「' + lb + '」。' + (dominant ? (born === 'L' ? '生まれ持った性質（左手）から、今の傾向（右手）へ変わってきている所として読めます。' : '生まれ持った性質（右手）から、今の傾向（左手）へ変わってきている所として読めます。') : '利き手を入れると、どちらが「生まれ持った」側かを読み分けられます。') });
    });
    return out;
  }
  // 時期の比べ（同じ側の手の、前と今）
  function compareTime(prev, cur) {
    if (!prev || !cur || !prev.ok || !cur.ok) return [];
    const out = [];
    ['life', 'head', 'heart', 'fate'].forEach(function (k) {
      const p = prev.facts.lines[k], c = cur.facts.lines[k];
      if (!p || !c || p.len == null || c.len == null) return;
      const d = c.len - p.len;
      if (Math.abs(d) >= 0.08) out.push({ h: LINES[k].n + (d > 0 ? '：前より長く見える' : '：前より短く見える'), t: '長さ ' + p.len + ' → ' + c.len + '（手のひらの長さを 1 とした値）。写真の撮り方の違いでも変わるので、目安として見てください。' });
      else out.push({ h: LINES[k].n + '：大きな変化なし', t: '長さ ' + p.len + ' → ' + c.len });
    });
    const pa = (prev.facts.lines.marriage || {}).count, ca = (cur.facts.lines.marriage || {}).count;
    if (pa != null && ca != null && pa !== ca) out.push({ h: '結婚線：' + pa + ' 本 → ' + ca + ' 本', t: '細い線は時期によって見え方が変わりやすい線です。' });
    return out;
  }

  // しわの候補：周りより暗い細い筋を拾う（目安。線の種類は決めない）。gray は 0〜255 の配列
  function creaseMap(gray, w, h, opts) {
    opts = opts || {};
    const r = opts.radius || Math.max(3, Math.round(Math.min(w, h) / 40));
    const I = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) { let s = 0; for (let x = 0; x < w; x++) { s += gray[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + s; } }
    const diff = new Float32Array(w * h); let max = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      const sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
      const mean = sum / ((x1 - x0) * (y1 - y0));
      const d = Math.max(0, mean - gray[y * w + x]); diff[y * w + x] = d; if (d > max) max = d;
    }
    // 上位の暗さだけ残す（はっきりした筋）
    // 全体の上位 keep（既定 8%）より暗く、しかも一番暗い筋の 35% 以上の物
    const sorted = Array.from(diff).sort(function (a, b) { return a - b; });
    const th = Math.max(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * (1 - (opts.keep || 0.08))))], max * 0.35);
    const out = new Uint8ClampedArray(w * h);
    for (let i = 0; i < diff.length; i++) if (diff[i] >= th && diff[i] > 4) out[i] = Math.min(255, Math.round(diff[i] / (max || 1) * 255));
    return out;
  }
  // 手のひらの中だけを見るための印（3 点の座標で、手のひらの少し外側まで）。背景のように暗すぎる所も外す
  function palmMask(gray, w, h, lm) {
    const F = frame(lm); const m = new Uint8Array(w * h); if (!F) return m.fill(1);
    const inside = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const q = F.toPalm([x, y]); if (q[0] > -0.12 && q[0] < 1.22 && q[1] > 0.02 && q[1] < 1.02) { m[y * w + x] = 1; inside.push(gray[y * w + x]); } }
    if (!inside.length) return m;
    inside.sort(function (a, b) { return a - b; });
    const med = inside[inside.length >> 1];
    for (let i = 0; i < m.length; i++) if (m[i] && gray[i] < med * 0.55) m[i] = 0;
    // 暗い所（背景）のすぐ隣も外す（手の輪郭を拾わない）
    const r = Math.max(2, Math.round(Math.min(w, h) / 60)), m2 = new Uint8Array(m);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      let ok = true;
      for (let dy = -r; dy <= r && ok; dy += r) for (let dx = -r; dx <= r && ok; dx += r) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < w && yy < h && gray[yy * w + xx] < med * 0.55) ok = false; }
      if (!ok) m2[y * w + x] = 0;
    }
    return m2;
  }

  // 占術として登録（group 'palm' は総合鑑定に入る）。入力は opts.palm（hand）
  if (B && B.methods && !B.methods.get('palm')) {
    B.methods.register({ id: 'palm', name: '手相', group: 'palm', family: 'palm', needs: [], compute: function (c) {
      const r = analyze(c.palm || {});
      if (!r.ok) return { ok: false, missing: ['palm.landmarks'] };
      return { facts: r.facts, items: r.items, themes: r.themes, notes: r.notes, title: r.title };
    } });
  }
  return { LINES: LINES, ORDER: ORDER, AGE_SPAN: AGE_SPAN, frame: frame, analyze: analyze, compareHands: compareHands, compareTime: compareTime, creaseMap: creaseMap, palmMask: palmMask };
});
