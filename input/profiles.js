// ══════════════════════════════════════════════════════════
// 操作の型（プロファイル）：画面・ミニゲームごとに「論理ボタン → 何をするか」を決める表
//
//  書き方（PAD_PROFILES[id]）
//   name   見出し（操作方法の画面に出す）
//   move   左スティック・十字キーの使い方
//           'arrows' … 押している間、矢印キーを押したままにする（アクション向け）
//           'tap'    … 押した瞬間に矢印キーを 1 回。押し続けると繰り返す（メニュー・マス目向け）
//           'none'   … 送らない（ゲームが INPUT.stick() を自分で読む）
//   keys   { 論理ボタン: キー | [キー,…] }  押している間そのキーを押したまま（離すと離す）
//           特別な値：'@click' 仮想カーソルの位置を押す（押したままで引きずる）
//   pointer true なら右スティックで仮想カーソルを動かせる（タップ・ドラッグが要る画面）
//   native  true なら橋渡しをしない（ゲームが INPUT を直接読む）
//   help   [[ボタン（'A' や 'LS' など。'/' で並べる）, 説明], …]  操作方法の画面・ヘルプ用
//
//  START（一時停止メニュー）と SELECT（操作方法）は、どのプロファイルでも共通（pad-ui.js が受け持つ）。
//  ミニゲームの定義（registerMinigame）に pad: {...} があれば、そちらを優先する。
//  tests/input-profiles.test.mjs で「目録の全ミニゲームに型がある」「キー名が正しい」を確かめる。
// ══════════════════════════════════════════════════════════
(function (root) {
  'use strict';
  const P = {};
  // ── 本編（DOM の画面）：既存のキー操作（main/ui.js のゆびカーソル・会話・タイトル）へ渡す ──
  P.ui = {
    name: '本編・メニュー', move: 'tap',
    keys: { A: 'Enter', B: 'Escape' },
    help: [['LS/DPAD', '項目を選ぶ'], ['A', '決定・会話を送る'], ['B', 'キャンセル・閉じる'], ['Y', 'ステータス'], ['LB/RB', 'メニュー切替（メイン・工場・配信・状態・スキル）'],
      ['RT', '会話の早送り（押している間）'], ['RS', '画面のスクロール'], ['R3', '仮想カーソルの出し入れ（どこでも押せる）'], ['START', '一時停止メニュー（セーブ・ロード・設定）'], ['SELECT', '操作方法']],
  };
  // ── 家・庭（暮らし・模様替え）：ボタンは焦点移動、マス目は仮想カーソル ──
  P.home = {
    name: '家・庭', move: 'tap', pointer: true,
    keys: { A: 'Enter', B: 'Escape', Y: 'e', RT: '@click', R3: '@click' },
    help: [['LS/DPAD', 'ボタンを選ぶ（模様替えでは置き場所を動かす）'], ['A', '決定・置く'], ['B', '戻る・閉じる'], ['Y', '模様替えを始める'],
      ['RS', '仮想カーソルを動かす'], ['RT', 'カーソルの位置を調べる・タップ（押したままでドラッグ）'], ['START', '一時停止メニュー'], ['SELECT', '操作方法']],
  };
  // ── 歌（本編の音楽ゲーム）：4 レーンをボタンで叩く。十字キーと顔のボタンは左右の並びどおり ──
  P.song = {
    name: '歌（音楽ゲーム）', move: 'none',
    keys: { LEFT: 'd', X: 'd', DOWN: 'f', A: 'f', UP: 'j', Y: 'j', RIGHT: 'k', B: 'k' },
    help: [['DPAD←/X', '1 番目のレーン'], ['DPAD↓/A', '2 番目のレーン'], ['DPAD↑/Y', '3 番目のレーン'], ['DPAD→/B', '4 番目のレーン'], ['START', '一時停止メニュー']],
  };
  // ── 文字入力（ゲーム内キーボード）は input/vkeyboard.js が直接受ける（ここは操作方法の表示用） ──
  P.vkbd = {
    name: '文字入力', move: 'none', keys: {},
    help: [['LS/DPAD', '文字を選ぶ'], ['A', '文字を入れる'], ['B', '1 文字消す'], ['X', 'ひらがな・カタカナ・英数の切替'], ['Y', '゛゜小（濁点・半濁点・小さい字）'], ['LB/RB', 'カーソルを左右へ'], ['START', '決定'], ['SELECT', 'やめる']],
  };

  // ── ミニゲーム（minigames/*.js の onKey が受けるキーへ） ──
  P.shooter = {
    name: '炎上コメント撃退', move: 'arrows',
    keys: { A: ['j', 'Enter'], RT: 'j', B: 'z', X: 'v', Y: 'b', LB: 'Shift', LT: 'Shift', RB: 'u' },
    help: [['LS/DPAD', '移動'], ['A/RT', '撃つ（押している間）・決定'], ['B', '声の色を切替'], ['X', '反論（追う声）'], ['Y', 'モデ召喚'], ['LB/LT', '精密移動（押している間）'], ['RB', '強化ショップ（タイトル・結果画面）']],
  };
  P.runner = {
    name: '深夜の買い出しダッシュ', move: 'arrows',
    keys: { A: 'z', B: 'ArrowDown', RT: 'z', X: 'Enter' },
    help: [['A/RT', 'ジャンプ（長押しで高く）・決定'], ['B/DPAD↓', 'スライド'], ['X', '次へ']],
  };
  P.runner_hard = {
    name: '買い出しダッシュ（高難易度版）', native: true, move: 'none', keys: {},
    help: [['LS/DPAD', '移動・選ぶ'], ['A', 'ジャンプ・決定'], ['X/Y', '攻撃'], ['B/RB/RT', 'ダッシュ'], ['DPAD↓', 'スライド']],
  };
  P.stealth = {
    name: '起こさないで家事', move: 'arrows',
    keys: { A: ' ', B: 'Shift', RB: 'Shift', RT: 'Shift' },
    help: [['LS/DPAD', '移動（ゆっくり＝静か）'], ['A', '家事（押している間）・決定'], ['B/RB/RT', '早足（押している間）']],
  };
  P.defense = {
    name: '荒らしディフェンス', move: 'none', pointer: true,
    keys: { A: 'Enter', B: 'Escape', X: 'x', Y: 'u', LB: 's', UP: '1', RIGHT: '2', DOWN: '3', LEFT: '4', RT: '@click', R3: '@click' },
    help: [['RS', '仮想カーソルで枠を選ぶ'], ['RT', 'カーソルの位置をタップ'], ['DPAD↑→↓←', '選んだ枠に 1〜4 番の対策を置く'], ['Y', '強化'], ['LB', '売る'], ['A', '波を始める・会話を送る'], ['X', '速さ切替'], ['B', '閉じる・会話を飛ばす']],
  };
  P.cards = {
    name: '配信トークバトル', move: 'tap', pointer: true,
    keys: { A: 'Enter', B: 'Escape', Y: 'e', X: 's', LB: '1', LT: '2', RB: '3', RT: '@click', R3: '@click' },
    help: [['DPAD←→', 'カードを選ぶ'], ['A/DPAD↑', '使う・決定'], ['Y', 'ターン終了'], ['B', '演出を飛ばす'], ['LB/LT/RB', '報酬の 1〜3 枚目'], ['X', '報酬を受け取らない'], ['RS+RT', '仮想カーソルでタップ']],
  };
  P.manager = {
    name: 'チャンネル運営会議', move: 'none', pointer: true,
    keys: { A: 'Enter', Y: 'z', RT: '@click', R3: '@click', X: '@click' },
    help: [['RS', '仮想カーソルを動かす'], ['RT/X', 'カードをつかむ・置く（押したままでドラッグ）'], ['A', '放送開始・会話を送る'], ['Y', '一つ戻す']],
  };
  P.rpg = {
    name: '壇ノ浦夢譚', move: 'arrows',
    keys: { A: 'Enter', B: 'Escape' },
    help: [['LS/DPAD', '移動・選ぶ'], ['A', '調べる・決定・会話を送る'], ['B', 'メニュー・戻る']],
  };
  P.horror = {
    name: '怪談配信・実録編', move: 'tap',
    keys: { A: 'Enter', B: 'Escape', X: 'l', Y: 'a', RB: 's' },
    help: [['A', '読み進める・決定'], ['DPAD↑↓', '選択肢を選ぶ'], ['B', '閉じる'], ['X', 'ログ'], ['Y', 'オート'], ['RB', 'スキップ']],
  };
  P.cooking = {
    name: '深夜の夜食づくり', move: 'none', pointer: true,
    keys: { A: ' ', LEFT: '1', UP: '2', RIGHT: '3', RT: '@click', R3: '@click', X: '@click' },
    help: [['A', '金色ゾーンで押す（長押しの所もある）・決定'], ['DPAD←↑→', 'ウインナーの 1〜3 本目'], ['RS', '仮想カーソル（盛り付け）'], ['RT/X', 'つかむ・置く（押したままでドラッグ）']],
  };
  P.fishing = {
    name: '夜釣りで頭を空っぽに', move: 'arrows',
    keys: { A: ' ', RT: ' ', Y: 'z' },
    help: [['A/RT', '長押し→離して投げる・ウキが沈んだら押す・決定'], ['LS/DPAD←→', '竿の向き・枠を動かす'], ['Y', '図鑑']],
  };
  P.puzzle = {
    name: '配線復旧パズル', move: 'tap',
    keys: { A: 'Enter' },
    help: [['LS/DPAD', 'マスを選ぶ'], ['A', '回す・決定']],
  };
  P.blocks = {
    name: '部品組み立てライン', move: 'arrows',
    keys: { A: 'x', B: 'z', Y: ' ', X: 'Enter', LB: 'c', RB: 'c' },
    help: [['LS/DPAD←→', '移動'], ['DPAD↓', 'ゆっくり落とす'], ['A/DPAD↑', '右に回す・決定'], ['B', '左に回す'], ['Y', '一気に落とす'], ['LB/RB', 'ホールド']],
  };
  P.rogue = {
    name: '深夜の工場巡回', move: 'tap',
    keys: { A: 'Enter', X: ' ' },
    help: [['LS/DPAD', '1 マス進む（押し続けると続けて）'], ['A', '決定・次へ'], ['X', 'その場で待つ']],
  };
  P.quiz = {
    name: '危険物取扱者 一問一答', move: 'none',
    keys: { UP: '1', RIGHT: '2', DOWN: '3', LEFT: '4', A: 'Enter', Y: 'h', LB: '1', RB: '2' },
    help: [['DPAD↑→↓←', '1〜4 番の答え'], ['A', '決定・次へ'], ['Y', 'ヒント'], ['LB/RB', 'タイトルでモード 1／2']],
  };
  P.race = {
    name: '原付で夜勤へ', move: 'arrows',
    keys: { A: 'Enter', B: 'ArrowDown', LT: 'ArrowDown' },
    help: [['LS/DPAD←→', 'ハンドル'], ['B/LT/DPAD↓', 'ブレーキ'], ['A', '決定・スタート']],
  };
  P.escape = {
    name: '閉じ込められた夜勤明け', move: 'none', pointer: true,
    keys: { A: 'Enter', B: 'Escape', Y: 'h', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight', LB: 'ArrowLeft', RB: 'ArrowRight', RT: '@click', R3: '@click', X: '@click' },
    help: [['RS', '仮想カーソルで調べる場所を指す'], ['RT/X', '調べる・持ち物を使う（タップ）'], ['DPAD←→/LB/RB', '隣の場所へ'], ['B', '近くで見るのをやめる'], ['Y', 'ヒント'], ['A', 'はじめる']],
  };
  P.factory3d = {
    name: '夜勤の第三工場', move: 'none',
    keys: { A: 'e', RT: 'e', B: 'Escape', UP: 'w', DOWN: 's', LEFT: 'a', RIGHT: 'd' },
    help: [['LS', '移動'], ['RS', '視点'], ['A/RT', '点検・集光（長押し）・決定'], ['B', '会話を飛ばす']],
  };

  // ── 外部ページ（境界事象・境界ノアリス・トビネズミ）の簡易対応：矢印・決定・戻る ──
  P.page = {
    name: 'おまけのゲーム（簡易対応）', move: 'arrows',
    keys: { A: 'Enter', B: 'Escape', X: 'x', Y: 'z', LB: 'Shift' },
    help: [['LS/DPAD', '移動・選ぶ（矢印キー）'], ['A', '決定（Enter）'], ['B', '戻る（Esc）'], ['X', 'X キー'], ['Y', 'Z キー'], ['LB', 'Shift'], ['R3', '仮想カーソル']],
  };

  /** そのミニゲームの型（定義の pad が優先。無ければ ui） */
  function profileFor(id, def) {
    if (def && def.pad && typeof def.pad === 'object') return Object.assign({ name: def.name || id, move: 'arrows', keys: {} }, def.pad);
    return P[id] || null;
  }
  root.PAD_PROFILES = P;
  root.padProfileFor = profileFor;
})(typeof window !== 'undefined' ? window : globalThis);
