/* ══════════════════════════════════════════════════════════
   境界ノアリス ― 表（人物・背景・エリア・エンディング・CG・解放の条件）  noaris/config.js
   ・企画書で決まっていない物は「（仮）」「未確定」と書く。名前・条件は企画者と決めてから差し替える
   ・『だんのうら』『境界事象』『境界侵食』と同じ世界（企画者が確定・2026-11-20）。つながりの中身は未確定
   ══════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const NA = root.NA = root.NA || {};
  NA.TITLE = '境界ノアリス';
  NA.START = 'prologue';
  NA.SCRIPT_VER = 21;   // 台本の版。台本の行が増減したら上げる（古いセーブは場面の頭から・既読は付け直す）
  NA.LOOP_SCENE = 'loop';
  NA.DEFAULT_NAME = '主人公';
  // 台本の中の {w:キー} に入る言葉。未確定の名前はここだけ差し替える（docs/noaris/route-rose.md §12）
  NA.WORDS = {
    rose_true: 'ルシアン',   // 白薔薇の主の本名（仮：§2-1 の候補 1。企画者の決定待ち）
  };   // 主人公の名前は未確定：プレイヤーが入力する（空なら この呼び名）

  // 話者：id → 表示名・名前の色・立ち絵（art：ui.js のシルエットの形）。'n' は地の文、'me' は主人公（名前は入力した物）
  NA.CHARS = {
    rose: { name: '白薔薇の主', color: '#f3e9f7', art: 'noble', tint: '#e8dcef' },   // 名を名乗るまでは「白薔薇の主」（本名は NA.WORDS.rose_true）
    forest: { name: '森の幼なじみ（仮）', color: '#bfe8b0', art: 'youth', tint: '#9bd38a' },
    war: { name: '戦場の護衛（仮）', color: '#d9c7a0', art: 'knight', tint: '#c8b48a' },
    library: { name: '図書館の学者（仮）', color: '#b9c8f0', art: 'scholar', tint: '#9fb2e6' },
    park: { name: '遊園地の青年（仮）', color: '#f0b9d8', art: 'youth', tint: '#e49ac4' },
    cat: { name: '黒猫', color: '#cfc4e8', art: 'cat', tint: '#1a1424' },
    voice: { name: '？？？', color: '#cfc4e8', art: null },
    maid: { name: '侍女', color: '#f0d8e4', art: 'maid', tint: '#e8c8d8' },   // 名前は未確定（docs/noaris/route-rose.md §2-2）
  };
  // 背景：今は CSS で描く仮の背景（noaris/style.css の .na-bg-<id>）。絵が届いたら差し替え
  NA.BGS = {
    void: { name: '暗闇' }, title: { name: '月夜' }, corridor: { name: '境界の回廊' },
    rose_gate: { name: '白薔薇の宮殿・門' }, rose_hall: { name: '白薔薇の宮殿・舞踏の間' }, rose_garden: { name: '白薔薇の宮殿・夜の庭' },
    rose_cage: { name: '白薔薇の宮殿・塔の部屋' }, rose_dawn: { name: '白薔薇の宮殿・夜明けのバルコニー' },
    rose_room: { name: '白薔薇の宮殿・客室' }, rose_inner: { name: '白薔薇の宮殿・回廊' }, rose_tower: { name: '白薔薇の宮殿・西の塔' },
    forest_path: { name: '忘れられた森・一本道' }, forest_spring: { name: '忘れられた森・泉' },
    war_field: { name: '終わらない戦場・城壁' }, war_camp: { name: '終わらない戦場・崩れた礼拝堂' },
    library_hall: { name: '終わりのない図書館・大閲覧室' }, library_stack: { name: '終わりのない図書館・書架の間' },
    park_gate: { name: '月の沈む遊園地・回転木馬' }, park_wheel: { name: '月の沈む遊園地・観覧車' },
  };
  // 五つのエリア（選択画面の扉）。open：今入れるか。五つとも開いている（白薔薇は本編の長さ・ほかの四つは試作の短い物語。2026-11-22 企画者）
  NA.AREAS = [
    { id: 'rose', name: '白薔薇の宮殿', scene: 'rose_00', open: true, color: '#f1e6f5', motif: '薔薇・舞踏会・掟', who: 'rose' },
    { id: 'forest', name: '忘れられた森', scene: 'forest_00', open: true, color: '#8fd08a', motif: '記憶・約束', who: 'forest' },
    { id: 'war', name: '終わらない戦場', scene: 'war_00', open: true, color: '#d6b97a', motif: '犠牲・忠誠', who: 'war' },
    { id: 'library', name: '終わりのない図書館', scene: 'library_00', open: true, color: '#93a8e8', motif: '真実・禁忌', who: 'library' },
    { id: 'park', name: '月の沈む遊園地', scene: 'park_00', open: true, color: '#e48fc0', motif: '再会・既視感', who: 'park' },
  ];
  // エンディング：kind good / bad / normal / gameover / official（正式）/ true（トゥルー）
  NA.ENDINGS = {
    rose_good: { kind: 'good', route: 'rose', title: '白薔薇の誓い（仮）' },
    rose_normal: { kind: 'normal', route: 'rose', title: '夢の舞踏会（仮）' },
    rose_bad: { kind: 'bad', route: 'rose', title: '永遠の鳥籠（仮）' },
    rose_go1: { kind: 'gameover', route: 'rose', title: '零時の鐘（仮）' },
    rose_go2: { kind: 'gameover', route: 'rose', title: '塔の花嫁（仮）' },
    rose_go3: { kind: 'gameover', route: 'rose', title: '手袋の下（仮）' },
    forest_good: { kind: 'good', route: 'forest', title: '約束の木（仮）' },
    forest_normal: { kind: 'normal', route: 'forest', title: '草笛（仮）' },
    forest_bad: { kind: 'bad', route: 'forest', title: '忘れの実（仮）' },
    forest_go1: { kind: 'gameover', route: 'forest', title: '森の奥（仮）' },
    war_good: { kind: 'good', route: 'war', title: '静かな朝（仮）' },
    war_normal: { kind: 'normal', route: 'war', title: '灰色の朝（仮）' },
    war_bad: { kind: 'bad', route: 'war', title: '最後の盾（仮）' },
    war_go1: { kind: 'gameover', route: 'war', title: '閉じた目（仮）' },
    library_good: { kind: 'good', route: 'library', title: '白紙のページ（仮）' },
    library_normal: { kind: 'normal', route: 'library', title: 'しおり（仮）' },
    library_bad: { kind: 'bad', route: 'library', title: '読まれない本（仮）' },
    library_go1: { kind: 'gameover', route: 'library', title: '最後のページ（仮）' },
    park_good: { kind: 'good', route: 'park', title: '朝の観覧車（仮）' },
    park_normal: { kind: 'normal', route: 'park', title: '閉園の鐘（仮）' },
    park_bad: { kind: 'bad', route: 'park', title: '何度目かの初めまして（仮）' },
    park_go1: { kind: 'gameover', route: 'park', title: '高すぎる空（仮）' },
    official: { kind: 'official', route: 'cat', title: '明日を生きる', todo: true },          // 正式エンド（企画書で確定。未実装）
    true: { kind: 'true', route: 'cat', title: '次は、私が守る番', todo: true },              // トゥルーエンド（企画書で確定。未実装。最後の台詞と黒猫の余韻は変えない）
  };
  NA.CGS = {
    rose_meet: { title: '白薔薇の門（仮）' },
    rose_dance: { title: '月下の円舞（仮）' },
    rose_cat: { title: '庭の黒猫（仮）' },
    rose_portraits: { title: '塔の肖像画（仮）' },
    rose_vow: { title: '夜明けの誓い（仮）' },
    rose_cage: { title: '白い鳥籠（仮）' },
    forest_promise: { title: '新しい線（仮）' },
    war_shield: { title: '城壁の朝（仮）' },
    library_diary: { title: '白紙の二行（仮）' },
    park_wheel: { title: '朝の観覧車（仮）' },
  };
  // 想いの段（6 つの境目）。会話の画面の「想い」で、白い薔薇の花びら 6 枚のうち何枚が開いたかで見せる
  // ・最後の境目＝GOOD の条件の愛情（rose_n5_02 の rose_love>=9）。最初の境目 0＝出会えば 1 枚
  // ・白薔薇で集められる愛情の最大は 10（GOOD に着く道筋。tests で確かめる）。取りこぼしの余裕は 1
  // ・意思（rose_will）は見せない（主人公の気持ちなので、数で示さない）
  NA.FEELINGS = {
    rose: { var: 'rose_love', area: 'rose', steps: [0, 2, 4, 6, 8, 9] },
    // ほかの四人（試作の短い物語）：最大 6・GOOD 5（取りこぼしの余裕 1）
    forest: { var: 'forest_love', area: 'forest', steps: [0, 1, 2, 3, 4, 5] },
    war: { var: 'war_love', area: 'war', steps: [0, 1, 2, 3, 4, 5] },
    library: { var: 'library_love', area: 'library', steps: [0, 1, 2, 3, 4, 5] },
    park: { var: 'park_love', area: 'park', steps: [0, 1, 2, 3, 4, 5] },
  };
  // 章（タイトルの「思い出」で、見た章をその頭から読み返せる。想い・エンディング・ループ回数は記録しない）
  NA.CHAPTERS = [
    { id: 'rose_gate', route: 'rose', title: '白薔薇の門', scene: 'rose_00' },
    { id: 'rose_waltz', route: 'rose', title: '月下の円舞', scene: 'rose_n1_01' },
    { id: 'rose_tilt', route: 'rose', title: '傾いた薔薇', scene: 'rose_n2_01' },
    { id: 'rose_tower', route: 'rose', title: '西の塔の噂', scene: 'rose_n3_01' },
    { id: 'rose_watch', route: 'rose', title: '止めた懐中時計', scene: 'rose_n4_01' },
    { id: 'rose_last', route: 'rose', title: '最後の舞踏会', scene: 'rose_n5_01' },
    { id: 'forest_all', route: 'forest', title: '忘れられた森', scene: 'forest_00' },
    { id: 'war_all', route: 'war', title: '終わらない戦場', scene: 'war_00' },
    { id: 'library_all', route: 'library', title: '終わりのない図書館', scene: 'library_00' },
    { id: 'park_all', route: 'park', title: '月の沈む遊園地', scene: 'park_00' },
  ];
  // 解放の条件（未確定。企画者と決めてから差し替える）
  NA.UNLOCK = {
    hidden: meta => false,   // 隠しルート（化け猫）：五人のルートを経た後（条件は未確定）
  };
})(typeof window !== 'undefined' ? window : globalThis);
