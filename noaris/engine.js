/* ══════════════════════════════════════════════════════════
   境界ノアリス ― 物語の進行（エンジン）  noaris/engine.js
   ・DOM を使わない（node で試験する：tests/noaris-engine.test.mjs）。画面は noaris/ui.js
   ・台本は NA.scene(id, 行の配列) で登録する（noaris/story/*.js）。書き方は docs/noaris/README.md
   ・状態は 2 層：
       run  … 1 周の中だけ（今の場面と行・好感度やフラグ vars・見えている背景と人物 view・主人公の名前）。セーブに入る
       meta … 周回をまたいで残る（ループ回数・既読・見たエンディング・CG）。localStorage に別に置く（UI が保存する）
   ・advance() を呼ぶたびに、次に「画面が待つもの」を 1 つ返す：
       {type:'say', who, name, text, read, fx}   台詞・地の文（タップで次）
       {type:'choice', options:[{text, i}], fx}   選択肢（choose(i) で進む）
       {type:'name', fx}                           名前の入力（setName(n) の後 advance）
       {type:'areas', fx}                          エリアの選択（goArea(id)）
       {type:'end', kind, id, fx}                  エンディング（GOOD/BAD/NORMAL）。meta.endings に記録
       {type:'gameover', id, fx}                   ゲームオーバー。meta.loop を 1 増やし、ループの場面から次の周を始める
       {type:'title', fx}                          タイトルへ
     fx：その間に起きた演出の並び（[名前, 引数…]。bg・chara・face・cg・bgm・se・fx・wait）。UI が順に反映する
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const NA = root.NA = root.NA || {};
  NA.SCENES = NA.SCENES || {};
  NA.CHARS = NA.CHARS || {};       // 話者 id → { name, color, art }（noaris/config.js）
  NA.BGS = NA.BGS || {};           // 背景 id → { name }
  NA.ENDINGS = NA.ENDINGS || {};   // エンディング id → { kind, title, route }
  NA.CGS = NA.CGS || {};           // CG id → { title }
  NA.AREAS = NA.AREAS || [];       // エリア（選択画面に並ぶ順）
  NA.LOOP_SCENE = NA.LOOP_SCENE || 'loop';
  const CMDS = ['bg', 'chara', 'face', 'cg', 'bgm', 'se', 'fx', 'wait', 'set', 'add', 'jump', 'if', 'end', 'gameover', 'title', 'select', 'name', 'unlock', 'choice'];

  // ── 台本を読む ──
  // 行：「?条件 」を前に付けると、条件が成り立つ時だけ。#命令 引数…／話者|本文／本文だけ（地の文）
  // 選択肢：#choice の後に「- 文 => 場面 [+名前 数] [=名前] [?条件]」を並べる
  function parse(id, lines) {
    const ops = [];
    for (let i = 0; i < lines.length; i++) {
      let s = String(lines[i]).trim(); if (!s || s.startsWith('//')) continue;
      let cond = null; const m0 = s.match(/^\?(\S+)\s+([\s\S]*)$/); if (m0) { cond = m0[1]; s = m0[2]; }
      if (s.startsWith('#')) {
        const [cmd, ...args] = s.slice(1).trim().split(/\s+/);
        if (!CMDS.includes(cmd)) throw new Error(`${id}:${i + 1} 知らない命令 #${cmd}`);
        if (cmd === 'choice') {
          const opts = [];
          while (i + 1 < lines.length && /^\s*(\?\S+\s+)?-\s/.test(lines[i + 1])) {
            i++; let t = String(lines[i]).trim(), oc = null; const mc = t.match(/^\?(\S+)\s+([\s\S]*)$/); if (mc) { oc = mc[1]; t = mc[2]; }
            const m = t.match(/^-\s+(.+?)\s*=>\s*(\S+)((?:\s+\S+)*)\s*$/); if (!m) throw new Error(`${id}:${i + 1} 選択肢の書き方：- 文 => 場面`);
            const opt = { text: m[1], to: m[2], add: [], set: [], cond: oc };
            const rest = m[3].trim().split(/\s+/).filter(Boolean);
            for (let k = 0; k < rest.length; k++) {
              const r = rest[k];
              if (r[0] === '+') { opt.add.push([r.slice(1), Number(rest[k + 1]) || 0]); k++; }
              else if (r[0] === '=') opt.set.push(r.slice(1));
              else if (r[0] === '?') opt.cond = r.slice(1);
              else throw new Error(`${id}:${i + 1} 選択肢の後ろの書き方：+名前 数 ／ =名前 ／ ?条件`);
            }
            opts.push(opt);
          }
          if (!opts.length) throw new Error(`${id}:${i + 1} #choice の後に選択肢が無い`);
          ops.push({ t: 'choice', opts, cond, line: i + 1 });
        } else if (cmd === 'if') {
          const j = args.indexOf('=>'); if (j !== 1 || !args[2]) throw new Error(`${id}:${i + 1} #if 条件 => 場面`);
          ops.push({ t: 'cmd', name: 'if', args: [args[0], args[2]], cond, line: i + 1 });
        } else ops.push({ t: 'cmd', name: cmd, args, cond, line: i + 1 });
      } else {
        const k = s.indexOf('|'); let who = 'n', text = s;
        if (k >= 0 && k < 24) { who = s.slice(0, k).trim() || 'n'; text = s.slice(k + 1); }
        ops.push({ t: 'say', who, text, cond, line: i + 1 });
      }
    }
    return ops;
  }
  NA.scene = function (id, lines, info = {}) { NA.SCENES[id] = Object.assign({ id, ops: parse(id, lines) }, info); };
  NA.parse = parse;

  // ── 条件：名前>=数・名前<=数・名前==数・名前!=数・名前>数・名前<数・名前・!名前 を & でつなぐ ──
  // 名前：loop（ループ回数）・end_<id>（そのエンディングを見た）・それ以外は run.vars
  function valueOf(name, run, meta) {
    if (name === 'loop') return meta.loop | 0;
    if (name.startsWith('end_')) return meta.endings[name.slice(4)] ? 1 : 0;
    const v = run.vars[name]; return v === undefined ? 0 : v;
  }
  function test(cond, run, meta) {
    if (!cond) return true;
    return cond.split('&').every(c => {
      const m = c.match(/^(!?)([\w.]+)(?:(>=|<=|==|!=|>|<)(-?\d+))?$/); if (!m) throw new Error('条件の書き方：' + c);
      const v = valueOf(m[2], run, meta); let r;
      if (!m[3]) r = !!v; else { const n = Number(m[4]); r = { '>=': v >= n, '<=': v <= n, '==': v == n, '!=': v != n, '>': v > n, '<': v < n }[m[3]]; }
      return m[1] ? !r : r;
    });
  }
  NA.test = test;

  const newMeta = () => ({ v: 1, loop: 0, read: {}, endings: {}, cgs: {}, unlocked: {} });
  const newRun = name => ({ v: 1, scene: null, ip: 0, vars: {}, name: name || '', view: { bg: null, chara: null, face: null, cg: null, bgm: null }, pending: null });
  NA.newMeta = newMeta;

  // ── 進行役 ──
  NA.make = function (opts = {}) {
    const meta = opts.meta || newMeta(); for (const [k, v] of Object.entries(newMeta())) if (meta[k] === undefined) meta[k] = v;   // 渡された記録をそのまま使う（ループ回数も画面側の記録に残る）
    let run = newRun();
    const T = {};
    // {name}＝主人公の名前・{w:キー}＝表の言葉（NA.WORDS。未確定の名前などを 1 か所で差し替える）
    const fill = s => String(s).replace(/\{name\}/g, run.name || NA.DEFAULT_NAME || '主人公').replace(/\{w:(\w+)\}/g, (m, k) => (NA.WORDS && NA.WORDS[k] != null ? NA.WORDS[k] : m));
    function goto(scene) { if (!NA.SCENES[scene]) throw new Error('場面が無い：' + scene); run.scene = scene; run.ip = 0; }
    function readKey() { return run.scene + ':' + run.ip; }
    T.meta = meta;
    Object.defineProperty(T, 'run', { get: () => run });
    T.newGame = function (scene, name) { run = newRun(name); goto(scene || NA.START || 'prologue'); return T; };
    T.setName = n => { run.name = String(n || '').trim().slice(0, 10); run.vars.named = 1; };
    T.goArea = id => { const a = NA.AREAS.find(x => x.id === id); if (!a || !T.areaOpen(a)) return false; run.vars['area_' + id] = 1; goto(a.scene); return true; };
    T.areaOpen = a => (typeof a.open === 'function' ? !!a.open(meta, run) : !!a.open);
    T.test = c => test(c, run, meta);
    T.isRead = (scene, ip) => !!meta.read[(scene || run.scene) + ':' + (ip == null ? run.ip : ip)];
    // 次の待ちまで進める
    T.advance = function () {
      const fx = [];
      if (run.pending) { const p = run.pending; return Object.assign({ fx: p.fx || [] }, p); }   // 選択肢・名前・エリアの待ちは同じ物を返す
      for (let guard = 0; guard < 5000; guard++) {
        const sc = NA.SCENES[run.scene]; if (!sc) throw new Error('場面が無い：' + run.scene);
        if (run.ip >= sc.ops.length) throw new Error(`場面 ${run.scene} の終わりに #jump・#end・#gameover・#title・#select が無い`);
        const op = sc.ops[run.ip];
        if (op.cond && !test(op.cond, run, meta)) { run.ip++; continue; }
        if (op.t === 'say') {
          const key = readKey(), read = !!meta.read[key]; meta.read[key] = 1; run.ip++;
          const ch = NA.CHARS[op.who] || null;
          const name = op.who === 'n' ? '' : op.who === 'me' ? fill('{name}') : ch ? fill(ch.name) : fill(op.who);
          return { type: 'say', who: op.who, name, text: fill(op.text), read, fx };
        }
        if (op.t === 'choice') {
          const options = op.opts.map((o, i) => ({ text: fill(o.text), i, ok: test(o.cond, run, meta) })).filter(o => o.ok).map(({ text, i }) => ({ text, i }));
          run.pending = { type: 'choice', options, ip: run.ip }; return { type: 'choice', options, fx };
        }
        const a = op.args; run.ip++;
        switch (op.name) {
          case 'bg': run.view.bg = a[0]; run.view.cg = null; fx.push(['bg', a[0]]); break;
          case 'chara': if (a[0] === 'off') { run.view.chara = null; run.view.face = null; } else { run.view.chara = a[0]; run.view.face = a[1] || 'normal'; } fx.push(['chara', run.view.chara, run.view.face]); break;
          case 'face': run.view.face = a[0]; fx.push(['face', a[0]]); break;
          case 'cg': if (a[0] === 'off') run.view.cg = null; else { run.view.cg = a[0]; meta.cgs[a[0]] = 1; } fx.push(['cg', run.view.cg]); break;
          case 'bgm': run.view.bgm = a[0] === 'off' ? null : a[0]; fx.push(['bgm', run.view.bgm]); break;
          case 'se': fx.push(['se', a[0]]); break;
          case 'fx': fx.push(['fx', a[0], a[1]]); break;
          case 'wait': fx.push(['wait', Number(a[0]) || 500]); break;
          case 'set': run.vars[a[0]] = a[1] === undefined ? 1 : (isNaN(+a[1]) ? a[1] : +a[1]); break;
          case 'add': run.vars[a[0]] = (Number(run.vars[a[0]]) || 0) + (Number(a[1]) || 0); break;
          case 'unlock': meta.unlocked[a[0]] = 1; break;
          case 'jump': goto(a[0]); break;
          case 'if': if (test(a[0], run, meta)) goto(a[1]); break;
          case 'name': if (!run.vars.named) { run.pending = { type: 'name' }; return { type: 'name', fx }; } break;
          case 'select': run.pending = { type: 'areas' }; return { type: 'areas', fx };
          case 'title': return { type: 'title', fx };
          case 'end': { const id = a[1] || a[0]; meta.endings[id] = 1; return { type: 'end', kind: a[0], id, fx }; }
          case 'gameover': {
            const id = a[0]; meta.endings[id] = 1; meta.loop = (meta.loop | 0) + 1;
            const keep = run.name, named = run.vars.named; run = newRun(keep); if (named) run.vars.named = 1; goto(NA.LOOP_SCENE);   // 次の周：1 周の中の状態は消える（名前は残る）
            return { type: 'gameover', id, loop: meta.loop, fx };
          }
        }
      }
      throw new Error('進まない（命令が 5000 個続いた）：' + run.scene);
    };
    T.choose = function (i) {
      const p = run.pending; if (!p || p.type !== 'choice') return false;
      const sc = NA.SCENES[run.scene], op = sc.ops[p.ip], o = op.opts[i]; if (!o || !test(o.cond, run, meta)) return false;
      run.pending = null; meta.read[run.scene + ':' + p.ip + ':' + i] = 1;
      for (const [k, n] of o.add) run.vars[k] = (Number(run.vars[k]) || 0) + n;
      for (const k of o.set) run.vars[k] = 1;
      goto(o.to); return true;
    };
    T.choiceRead = i => !!meta.read[run.scene + ':' + (run.pending ? run.pending.ip : run.ip) + ':' + i];
    T.resolveName = function (n) { if (!run.pending || run.pending.type !== 'name') return false; T.setName(n); run.pending = null; return true; };
    T.pickArea = function (id) { if (!run.pending || run.pending.type !== 'areas') return false; if (!T.goArea(id)) return false; run.pending = null; return true; };
    // セーブ：1 周の状態をそのまま（JSON）。label は UI が付ける
    T.snapshot = () => JSON.parse(JSON.stringify(run));
    T.restore = snap => { const r = JSON.parse(JSON.stringify(snap)); if (!r || !NA.SCENES[r.scene]) return false; run = Object.assign(newRun(), r); return true; };
    T.view = () => Object.assign({}, run.view);
    return T;
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = NA;
})(typeof window !== 'undefined' ? window : globalThis);
