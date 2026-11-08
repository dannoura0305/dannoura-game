// フル画面（スマホでブラウザの枠を消して遊ぶ）。
// ・Fullscreen API（webkit 接頭辞も）で document.documentElement をフル画面に。入れたら横向きの固定も試す（できない端末は黙って無視）。
// ・iPhone の Safari は要素のフル画面に対応していないので、ボタンの代わりに「ホーム画面に追加」の案内を出す
//   （shinshoku.webmanifest：display fullscreen・横向き。iOS ではホーム画面から開くとブラウザの枠なしで開く）。
// ・ホーム画面から開いた時（display-mode: fullscreen／standalone、navigator.standalone）はボタンも案内も出さない。
const D = document;

export const FS_HINT = 'iPhone では、Safari の「共有」→「ホーム画面に追加」で置いたアイコンから開くと、全画面で遊べます。';

export function fsElement() { return D.fullscreenElement || D.webkitFullscreenElement || null; }
export function fsSupported() {
  const e = D.documentElement;
  return !!((D.fullscreenEnabled || D.webkitFullscreenEnabled) && (e.requestFullscreen || e.webkitRequestFullscreen));
}
export function isIPhone(ua = navigator.userAgent) { return /iPhone|iPod/.test(ua); }
export function isIOS(ua = navigator.userAgent) {
  return isIPhone(ua) || /iPad/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
}
// ホーム画面から開いたか（読み込みの時に一度だけ判定：Fullscreen API のフル画面中も display-mode: fullscreen が当たるブラウザがあるので）
function calcStandalone() {
  try {
    if (navigator.standalone === true) return true;
    const mm = q => !!(window.matchMedia && matchMedia(q).matches);
    return mm('(display-mode: standalone)') || (mm('(display-mode: fullscreen)') && !fsElement());
  } catch (e) { return false; }
}
const STANDALONE = calcStandalone();
export function isStandalone() { return STANDALONE; }

/** 'button'＝フル画面ボタン／'hint'＝ホーム画面に追加の案内／'none'＝出さない */
export function fsMode() {
  if (STANDALONE) return 'none';
  if (isIPhone()) return 'hint';               // iPhone は API があっても動画だけ（要素は不可）
  if (fsSupported()) return 'button';
  return isIOS() ? 'hint' : 'none';
}
export function fsLabel() { return fsElement() ? 'フル画面を終える' : 'フル画面にする'; }

export function enterFs() {
  const e = D.documentElement;
  let p;
  try {
    if (e.requestFullscreen) p = e.requestFullscreen({ navigationUI: 'hide' });
    else if (e.webkitRequestFullscreen) p = e.webkitRequestFullscreen();
  } catch (err) { return Promise.resolve(false); }
  return Promise.resolve(p).then(() => {
    try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (err) { /* 横向きの固定はできない端末も多い */ }
    return true;
  }, () => false);
}
export function exitFs() {
  try { const o = screen.orientation; if (o && o.unlock) o.unlock(); } catch (err) { /* */ }
  try {
    if (!fsElement()) return Promise.resolve();
    const p = D.exitFullscreen ? D.exitFullscreen() : D.webkitExitFullscreen && D.webkitExitFullscreen();
    return Promise.resolve(p).catch(() => {});
  } catch (err) { return Promise.resolve(); }
}
export function toggleFs() { return fsElement() ? exitFs() : enterFs(); }

/** フル画面の出入りで呼ぶ（Esc・戻る操作で抜けた時も） */
export function onFsChange(cb) {
  D.addEventListener('fullscreenchange', cb);
  D.addEventListener('webkitfullscreenchange', cb);
}
/** 画面にある .sh-fsbtn の文字をいまの状態に合わせる */
export function syncFsButtons(root = D) {
  const on = !!fsElement();
  root.querySelectorAll('.sh-fsbtn').forEach(b => { b.textContent = fsLabel(); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
}
/** メニュー用：ボタンか案内の HTML（出さない時は空） */
export function fsMenuHTML() {
  const m = fsMode();
  if (m === 'button') return `<div class="sh-sbtn sh-fsrow"><button class="sh-fsbtn" data-fs="1" aria-pressed="${fsElement() ? 'true' : 'false'}">${fsLabel()}</button></div>`;
  if (m === 'hint') return `<p class="sh-note sh-fshint">${FS_HINT}</p>`;
  return '';
}
