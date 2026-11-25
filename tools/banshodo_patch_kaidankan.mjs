// 万象堂を『怪談館』（だんのうらの町 kaidankan_ver*.html）に足す道具。
// 使い方: node tools/banshodo_patch_kaidankan.mjs <怪談館の html> [出力先]
//   出力先を省くと <元の名前>.bansho.html に書く（元のファイルは書き換えない）。
//   足すのは 3 か所だけ：<head> の CSS 1 行・館内案内（nav）の「占いの間」ボタン 1 つ・</body> の前の script。
//   既存の展示・保存（kaidankan_v15_state）・会話・操作には触れない。2 回かけても同じ結果になる。
//   町のサイトには、このリポジトリの banshodo/ フォルダを、怪談館の html と同じ場所へそのまま置くこと。
import { readFileSync, writeFileSync } from 'node:fs';

const [src, outArg] = process.argv.slice(2);
if (!src) { console.error('使い方: node tools/banshodo_patch_kaidankan.mjs <怪談館の html> [出力先]'); process.exit(2); }
let html = readFileSync(src, 'utf8');
const MARK = '<!-- 万象堂 -->';
if (html.includes(MARK)) {
  // 前の版の差し込み（手相の無い物）なら、手相の 2 行だけを足す
  if (!html.includes('bansho-palm-ui.js') && html.includes('<script src="banshodo/bansho-ui.js"></script>')) {
    html = html.replace('<script src="banshodo/bansho-ui.js"></script>', '<script src="banshodo/bansho-palm.js"></script>\n<script src="banshodo/bansho-ui.js"></script>\n<script src="banshodo/bansho-palm-ui.js"></script>');
    const out0 = outArg || (/\.bansho\.html?$/.test(src) ? src : src.replace(/\.html?$/, '') + '.bansho.html');
    writeFileSync(out0, html); console.log('手相の部品を足しました: ' + out0); process.exit(0);
  }
  console.log('すでに万象堂が入っています: ' + src); process.exit(0);
}

const css = `${MARK}\n<link rel="stylesheet" href="banshodo/bansho.css">\n`;
const navBtn = `\n      <button type="button" id="banshoNav">占いの間</button>`;
const scripts = `${MARK}
<script src="banshodo/vendor/astronomy.browser.min.js"></script>
<script src="banshodo/bansho-texts.js"></script>
<script src="banshodo/bansho-core.js"></script>
<script src="banshodo/bansho-palm.js"></script>
<script src="banshodo/bansho-ui.js"></script>
<script src="banshodo/bansho-palm-ui.js"></script>
<script src="banshodo/shops/kaidan.js"></script>
<script>
  // 占いの間：万象堂の重ね画面を開くだけ。閉じると、そのまま館内へ戻る
  (function () {
    var b = document.getElementById('banshoNav');
    if (b && window.BanshoUI) b.addEventListener('click', function () { BanshoUI.open(BANSHO_SHOPS.kaidan); });
    else if (b) b.hidden = true;
  })();
</script>
`;
const steps = [
  ['</head>', (s) => s.replace('</head>', css + '</head>')],
  ['館内案内の最後のボタン', (s) => s.replace(/(<nav class="nav" id="mainNav"[\s\S]*?)(\n\s*<\/nav>)/, (m, a, b) => a + navBtn + b)],
  ['</body>', (s) => s.replace(/<\/body>(?![\s\S]*<\/body>)/, scripts + '</body>')]
];
for (const [name, fn] of steps) {
  const next = fn(html);
  if (next === html) { console.error('差し込む場所が見つかりません: ' + name + '（怪談館の版が変わった可能性があります。手で足してください）'); process.exit(1); }
  html = next;
}
const out = outArg || src.replace(/\.html?$/, '') + '.bansho.html';
writeFileSync(out, html);
console.log('書き出しました: ' + out);
