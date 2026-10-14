# GAME_INTEGRATION_SPEC — 技術選定と作品への組み込み（STEP 3）

状態：**提案**（開発者の承認待ち）。確定事項は「確定」と書いたものだけ。

## 1. 前提（確定）
- 一つの作品『だんのうら30日間サバイバル』の中に、本編・『境界事象』・『トビネズミMMO』・新作『境界侵食』（仮題）を並べる。
- **硬い依存を作らない**：『境界侵食』の本筋は他の3作を遊ばなくても最後まで遊べる。
- 他作品のストーリー・人物・結末・仕組みを承認なしに変えない。他作品のセーブは**読むだけ**（既存の `kyokai/link.js`・`main/day31.js` と同じ原則）。
- 既存のコード・データを消さない。

## 2. エンジン比較

評価軸：①既存（ブラウザ・ビルドなし・GitHub Pages・PWA）との相性 ②スマホ性能 ③配布サイズ ④物理 ⑤スキンアニメ・リターゲット ⑥アセット経路 ⑦AI エージェント＋利用者の体制で作れるか ⑧**この環境で自動テストできるか** ⑨ライセンス。

| 候補 | ①相性 | ②スマホ | ③サイズ（目安・未計測） | ④物理 | ⑤アニメ | ⑦体制 | ⑧ここで検証 | ⑨ライセンス | 総合 |
|---|---|---|---|---|---|---|---|---|---|
| **Three.js（ES Module 版を固定して同梱）** | ◎ 既に使用・ビルド不要（importmap） | ○ 自前で軽くできる | ◎ 本体約0.7MB（min）＋アドオン | △ 自前（キャラコントローラ＋BVH）／必要なら rapier | ○ AnimationMixer・glTF スキン。リターゲットは Blender 側で | ◎ コードだけで完結。既存2本の実績 | ◎ Playwright＋SwiftShader で WebGL2 を確認済み | MIT | **推奨** |
| Babylon.js | ○ CDN/ES、ビルドなしも可 | ○ | △ 数MB | ◎ Havok（WASM） | ◎ | ○ | ○ | Apache-2.0（Havok は別条件・要確認） | 次点 |
| PlayCanvas | △ エディタがクラウド中心。エンジン単体は可 | ○ | ○ | ○ ammo.js | ○ | △ エディタ前提の作業が AI エージェントに不向き | ○ | MIT（エディタはサービス） | 見送り |
| Godot 4 Web 書き出し（別ページで埋め込み） | △ 書き出し物を置くだけだが**ビルドに Godot が要る** | △ wasm が重く起動が遅い。スレッド版は COOP/COEP ヘッダが要り GitHub Pages では難（単スレッド版は可） | ✕ 数十MB | ◎ | ◎ | △ | **✕ この環境で Godot を動かせない**（`godot/README.md` の通り試作も未実行） | MIT | 見送り |
| Unity WebGL | ✕ ビルドに Unity エディタ・アカウントが要る | △ | ✕ 大 | ◎ | ◎ | ✕ AI エージェントがここでビルドできない | ✕ | Unity の利用規約（要確認） | 見送り |
| Unreal（ピクセルストリーミング） | ✕ 常時サーバー（GPU）が要る | – | – | ◎ | ◎ | ✕ | ✕ | EULA | 不可 |

**推奨：Three.js（ES Module 版）**
理由：(1) 既にリポジトリにあり、3D ミニゲーム2本で描画・入力・後片付け・DPR 調整の知見がある。(2) ビルドなし・静的配信・PWA の方針をそのまま守れる。(3) **この環境で Playwright による自動プレイと画面確認ができる唯一の現実的な選択肢**。(4) MIT。
弱点と対策：物理・アニメ・エディタが無い → キャラクターは「カプセル＋静的コリジョン（BVH）」の自前コントローラで十分（アクションゲームは剛体物理より手触りの調整が大事）。レベルは Blender で作った glTF を読み、当たり判定は専用の低ポリ網（`col_` 接頭辞のノード）で持つ。
**次点：Babylon.js**（Three.js で性能・アニメ周りが行き詰まったときの退避先。フェーズ2の終わりで判断）。

### 2.1 three.js の版
- 既存 `vendor/three.min.js`（r158 UMD）は**触らない**（既存ミニゲームのため）。
- 本作用に `vendor/three-esm/<版>/`（`three.module.min.js`＋`examples/jsm` から必要なアドオンだけ：GLTFLoader、DRACOLoader または meshopt デコーダ、SkeletonUtils、BufferGeometryUtils）を**版を固定して**同梱する【新規提案】。版はフェーズ1で決め、ライセンス文を同じフォルダに置く。
- 当たり判定：`three-mesh-bvh`（MIT）を同梱する案。物理エンジン（rapier・cannon-es）は**最初は入れない**。ラグドール・瓦礫など必要が出た時点で rapier（Apache-2.0、WASM）を検討。

## 3. 組み込みの形【提案】

```
shinshoku.html                 入口（kyokai.html・tobinezumi.html と同じ並び。本編と同じオリジン）
shinshoku/
  main.js                      起動（importmap で three を解決）
  core/   loop.js time.js input.js(キーボード・マウス・タッチ・ゲームパッド) audio.js rng.js
  render/ renderer.js(DPR自動・品質段階) post.js(軽いポスト：ビネット・粒子は CSS) camera.js
  world/  level.js(読み込み・区画) collide.js(BVH・カプセル) nav.js(敵の移動：格子 or ナビメッシュ) triggers.js
  actor/  player.js forms/(purple.js white.js giant.js) enemy.js ai/(各敵) anim.js
  combat/ hitbox.js weapons.js timing.js(見切り・パリィ・一閃) damage.js
  story/  dsl.js(台本) chapters/ch00..chN.js cutscene.js routes.js(分岐の状態と記録)
  ui/     hud.js menu.js inventory.js docs.js(資料) map.js safe.js(金庫) touch-ui.js
  save/   save.js(本作セーブ) migrate.js
  data/   *.json または *.js（敵・武器・技・地図・資料・解放表。データ駆動）
  link/   progress.js（共通進行ストア wakaba_progress_v1） adapters/(main.js kyokai.js tobi.js 読み取り専用)
assets/shinshoku/  models/*.glb anim/*.glb tex/ audio/ manifest.json（仮素材は provisional:true）
docs/shinshoku/    本書類
tests/shinshoku-*.test.mjs   DOM なしロジック（node:vm / ES Modules）
tools/shinshoku_*.mjs        Playwright の通しプレイ・画面撮影・性能計測
```
- **本編への変更は最小**：タイトルメニューに「境界侵食」ボタンを1つ（`index.html`・`main/day31.js` の既存ボタン並びに倣う）。これはフェーズ9まで行わず、その時点で担当と調整する。開発中は `shinshoku.html` を直接開く。
- `sw.js`：本作のファイルは**実行時キャッシュ**（precache しない。本編の起動を重くしない）。変更は sw.js の担当と調整してから。
- グローバル汚染なし（ES Modules）。デバッグ用に `window.__sh`（自動プレイ API。トビネズミの `__tobi`、境界事象の `KY_WORLD.walkTo*` と同じ考え方）。

## 4. 共通進行ストア `wakaba_progress_v1`【新規提案】
名前の由来：トビネズミの設計書にある「わかばプロジェクト」（`tobinezumi/docs/GAME_DESIGN.md` §3）。名前は Q15 で確認。

- 置き場所：`localStorage['wakaba_progress_v1']`（1キー・JSON）。
- **書けるのは各作品が「自分の欄」だけ**（`games.shinshoku` は本作だけが書く）。既存3作は今は書かない（書かせるかどうかは各作品の改修時に承認を得て決める）。それまでは本作が**読み取り専用アダプタ**で既存キーから毎回組み立てる（キャッシュを保存しない＝既存データとずれない）。
- API（`shinshoku/link/progress.js`、DOM なしで node から読める UMD/ESM 両対応）：
  ```js
  WP.read()                         // → 全体（既存作品の欄はアダプタで毎回生成・読み取り専用）
  WP.get(game, path)                // 例 WP.get('main', 'endings.father')
  WP.write('shinshoku', patch)      // 自分の欄だけ。他の欄を渡すと例外
  WP.unlocked(id)                   // 解放表（data/unlocks）に照らして真偽
  WP.migrate(raw)                   // 版の移行（SAVE_DATA_SPEC §5）
  ```
- 詳細は SAVE_DATA_SPEC.md・CROSS_GAME_LINK_SPEC.md。

## 5. 仮素材の方針【提案】
1. **段階0（フェーズ1〜3）**：プリミティブ（箱・カプセル・円柱）を色分け。だんのうら＝紫のカプセル＋めがねの線、白い姿＝白、敵＝種類ごとの色とシルエット。**見た目は仮でも当たり判定・アニメのタイミングは本番値**で作る。
2. **段階1**：低ポリの仮 glTF（Blender で作る or 生成 AI〔Meshy・Tripo・Hunyuan3D など：**外部・未検証。利用規約・商用可否・学習元を必ず確認**〕）。全部 `manifest.json` に `provisional:true, source, license, author` を書く。
3. **段階2**：本番素材（購入 or 依頼 or 自作）。購入素材はライセンス文を `assets/shinshoku/LICENSES/` に保存。
4. モーション：Mixamo などの外部モーションは**規約を確認してから**（未確認）。最初はプログラムで動かす簡易アニメ（骨2〜3本＋補間）で手触りを決める。
5. 画風：未決定（Q11：リアル寄り／低ポリ＋トゥーン／ドット風3D）。仮素材の段階では決めずに進められる設計にする（マテリアルを `materials.js` に集約）。

## 6. 性能目標【提案】
| 項目 | PC（中級ノート・内蔵GPU） | スマホ（目安：発売3〜4年以内の中級機） |
|---|---|---|
| フレーム | 60fps（下限 50） | 30fps 固定（下限 28）、横向き |
| 解像度 | DPR 上限 1.5 | DPR 0.75〜1.25 を自動調整（race.js 方式） |
| 画面内の描画呼び出し | 300以下 | 120以下 |
| 画面内三角形 | 50万以下 | 15万以下 |
| テクスチャ | 2048まで | 1024まで（KTX2 は段階2で検討） |
| 1区画の読み込み | 8MB 以下 | 同左（区画ごとに分ける） |
| 最初の遊べる切片 | 合計 5MB 以下 | 同左 |
**注意**：この環境の Chromium は SwiftShader（ソフト描画）なので**速度の数値は実機の目安にならない**。速度は利用者の実機で `?perf=1`（画面に fps・draw calls・三角形数）を見て記録する。

## 7. リスク
| リスク | 影響 | 対策 |
|---|---|---|
| 3D 素材の量（キャラ3形態＋巨大猫又＋敵8種＋12区画） | 最大 | 仮素材で全部遊べる状態を先に作る。区画の使い回し（商店街の3状態） |
| スマホ性能 | 大 | 区画分割・霧・LOD・影は1灯のみ・DPR 自動 |
| 手触り（一閃・見切り） | 大 | 数値を data に出して調整画面（`?tune=1`） |
| three.js の版上げで壊れる | 中 | 版を固定して同梱。上げるときは本作だけ |
| 並行作業の衝突 | 中 | 本作は新しいフォルダだけを触る。共有ファイル（index.html, sw.js）はフェーズ9で調整 |
| 生成 AI 素材の権利 | 中 | 出典・規約・生成日を manifest に記録。未確認は provisional のまま公開しない |
