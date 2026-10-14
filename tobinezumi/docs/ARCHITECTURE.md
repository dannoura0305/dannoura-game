# ARCHITECTURE — トビネズミMMO（仮称）クライアント・サーバー構成

> 状態：**承認済み・Ver.0.1 実装済み**（Node.js 22＋`ws`＋SQLite `node:sqlite`、ローカル運用）。実装と違った所はこの文書を直してある。

## 0. 環境調査の結果（2026-10-10 時点）

| 項目 | 状況 | 本作への影響 |
|---|---|---|
| Node.js | v22.22（npm 10.9）。`node:sqlite`（組み込み SQLite）・組み込み `WebSocket`（クライアント側）あり | 追加インストールほぼ無しでサーバーが書ける |
| npm レジストリ | 到達可（`ws` 8.22、`colyseus` 0.18 を確認） | 必要なら定番ライブラリを使える |
| DB | SQLite（`node:sqlite`）、PostgreSQL クライアント、Redis サーバーがインストール済み | 初期は SQLite 1 ファイルで十分。将来 PostgreSQL へ移行可能 |
| Docker | あり | 配布・本番起動の手段として使える |
| ブラウザ検証 | Chromium＋Playwright | **複数クライアントの自動接続試験**をこの環境内で回せる |
| Godot | `godot/`（だんのうら家づくり試作、Godot 4.7 想定）があるが**この環境に Godot 本体は無い** | Godot を主エンジンにすると、ここでは実行・自動試験ができない |
| 既存の制作資産（わかばプロジェクト＝このリポジトリ） | ①素の HTML/Canvas/JS・ビルド無しの作り方（本編・境界事象）②タイル見下ろし移動エンジン（`kyokai/overworld.js`：グリッド移動・カメラ・当たり判定・十字キー）③グリッド配置・撤去ロジック（`main/home/*`：家具配置・ドラッグ・撤去・保存）④生成画像の取り込み・正規化パイプライン（Pillow でセル切り出し・アウトライン・マニフェスト `assets/*/manifest.json`）⑤Playwright 自動プレイ・`node tests/run.mjs` 方式のテスト ⑥PWA | ②③④⑤は**考え方とコードの一部を移植**して再利用。ただし直接 import はせず、独立したゲームとしてコピー・改造する |
| 公開先 | 現在は GitHub Pages（静的のみ） | クライアントは Pages に置けるが、**サーバーは別に動かす場所が必要** |

## 1. 全体構成（推奨案）

```
┌──────────── ブラウザ（PC） ────────────┐        ┌──────── ゲームサーバー（Node.js 1 プロセス） ────────┐
│ client/  素の JS（ES Modules）+ Canvas2D │  WSS   │ server/                                              │
│  ・入力 → 自分の移動は即時に予測描画     │◀──────▶│  ・認証（scrypt＋セッショントークン）                 │
│  ・他人は 100ms 遅れで補間表示           │  JSON  │  ・Field ルーム（共有地上：20Hz シミュレーション）    │
│  ・巣：全体モード／閲覧モード            │        │  ・Nest インスタンス（巣ごと：所有者＋許可訪問者）    │
│  ・素材：assets/ + manifest.json         │        │  ・採集・建築・所有権の検証（サーバーが正）           │
└─────────────────────────────────────────┘        │  ・SQLite（data/game.db）＋定期バックアップ           │
        静的配信：同じサーバー or GitHub Pages      └──────────────────────────────────────────────────────┘
```

- **1 プロセス・1 DB ファイル**から始める（分散構成は作らない）。目標 10 人、余裕を見て 50 人程度まで。
- 地上フィールド（共有）と巣（インスタンス）は**別の「部屋」**として管理。プレイヤーは常にどちらか 1 つに所属。

## 2. 技術選定の比較

### 2.1 クライアント（ゲームエンジン）

| 案 | 長所 | 短所 | 評価 |
|---|---|---|---|
| **A. 素の JS＋Canvas2D（推奨）** | 既存プロジェクトと同じ作り方・同じテスト方法。ビルド不要。`kyokai/overworld.js` のタイル移動・`main/home` の配置ロジックを移植できる。ドット絵の最近傍拡大が簡単。Playwright で多人数試験が自動化できる | 物理・UI 部品は自作（本作の規模なら少量） | ◎ |
| B. Phaser 3（CDN） | スプライト・アニメ・入力・カメラが揃う | 既存コードと流儀が違う。巣の断面ビルド UI は結局自作 | ○ |
| C. Godot 4（Web 書き出し） | エディタで作りやすい。`godot/` の配置試作がある | この環境で実行・自動試験不可。Web 書き出しが重い（数十MB）。サーバーは別言語 | △（将来のネイティブ版候補） |
| D. Unity / その他 | 多機能 | 過剰。費用・ビルド時間 | × |

### 2.2 サーバー方式・通信

| 案 | 長所 | 短所 | 評価 |
|---|---|---|---|
| **A. Node.js＋`ws`＋自前の小さなルーム管理（推奨）** | 依存 1 つ。クライアントと同じ言語で**判定コード（当たり判定・建築ルール）を共有**できる。仕組みが全部見える | ルーム・再接続・差分送信を自分で書く（数百行） | ◎ |
| B. Node.js＋Colyseus | ルーム・状態同期・再接続が揃う | 0.x で破壊的変更が多い。独自の状態スキーマに縛られる | ○（人数が増えたら移行候補） |
| C. Firebase / Supabase Realtime | サーバー運用不要 | 権威サーバーにならず、不正・重複取得の防止が難しい。従量課金 | △ |
| D. WebRTC P2P | サーバー費ほぼ 0 | 権威が無い。NAT 越え | × |

- 通信は **WebSocket（WSS）＋JSON**。1 メッセージ `{t:"型", ...}`。人数が増えたら移動だけ固定長バイナリに変える余地を残す。
- サーバーティック 20Hz。位置のスナップショットは 10Hz で配信（10 人なら 1 人あたり数 KB/秒）。

### 2.3 データベース

| 案 | 長所 | 短所 | 評価 |
|---|---|---|---|
| **A. SQLite（`node:sqlite`、無ければ `better-sqlite3`）（推奨）** | ファイル 1 つ。バックアップ＝ファイルコピー（`VACUUM INTO`）。導入費 0 | 書き込みは 1 プロセスから | ◎ |
| B. PostgreSQL | 同時書き込み・運用に強い | サーバーをもう 1 つ管理 | ○（将来） |
| C. JSON ファイル | 最も簡単 | 壊れやすい・同時書き込みに弱い | × |

- テーブルは「よく検索する列＋JSON 列」の組み合わせ。巣の構造は JSON（`schema_version` 付き）で保存し、**起動時マイグレーション**で古い版を新しい版へ変換する（セーブを失わない）。

### 2.4 グラフィック制作

| 案 | 内容 |
|---|---|
| **推奨：画像生成 → 正規化パイプライン** | 添付イメージのような精細ドット絵を画像生成で下描き → `tools/` の Pillow スクリプト（境界事象・RPG で使った方式を移植）で**決まったセルサイズ・パレット・アウトライン・アニメ枚数**に切り揃え、`assets/manifest.json` に登録 |
| 補完：コード描画のプレースホルダ | 素材が無い間もゲームが動くよう、全素材に「コードで描く仮の絵」を用意（境界事象の art.js と同じ考え方）。manifest に画像があれば差し替え |
| 代替：手描き（Aseprite 等） | 最終品質を詰める段階で併用 |

## 3. 遅延対策（トビネズミの跳躍を気持ちよく）

- **自分の移動はクライアント予測**：入力（連番付き）を即時に自分の画面へ反映し、サーバーへ送信。サーバーは同じ移動ルール（共有コード `shared/move.js`）で検証し、確定位置と「どの入力まで処理したか」を返す。ずれたら未確認の入力を再適用して補正（小さなずれは滑らかに寄せる）。
- **跳躍は「イベント」として送る**：小跳躍（連続）・大ジャンプは開始時刻・方向・距離を 1 メッセージで送り、受け手は同じ軌道を再生。高さ（z）は見た目だけ、当たり判定は着地点。
- **他プレイヤーは 100ms 遅らせて補間表示**（スナップショット 2 つの間を線形補間、跳躍中は放物線で補間）。
- 採集は「拾う予約」→サーバー確定で消える。確定前は半透明表示にして、失敗時（他人が先に取った）は元に戻す。

## 4. サーバーの権威と不正対策

| 操作 | サーバー側の検証 |
|---|---|
| 移動 | 速度上限・跳躍のクールダウン・地形の通行可否・ワープ禁止 |
| 採集 | 対象が存在し未取得か（行ロックの代わりに 1 プロセス内で逐次処理）、距離、持ち物の上限。取得はトランザクションで「資源を消す＋持ち物を増やす」を同時に |
| 建築 | 巣の所有者か、許可された共同作業者か。グリッド範囲・重なり・通路接続・素材の消費。操作ごとに `nest.rev` を +1、古い rev からの操作は拒否 |
| 訪問 | 所有者の訪問設定（非公開／フレンド／許可リスト／公開）。訪問者は閲覧モードのみ・建築不可 |
| チャット | 長さ制限・連投制限・制御文字除去 |

## 5. データ構造（将来拡張を見越して先に分ける）

実装：`server/migrations/001_init.js`・`002_world_containers.js`・`003_life_social.js`（Ver.0.2：friends・nest_visits・nest_access の主キー）・`004_danger_land.js`（Ver.0.3：lands.plot・nests.plugged/relocated_at/raided_at・nest_events・world_resources.qty/expires_at）・`005_family.js`（Ver.0.4：individuals.account_id/role/nest_id・litters）・`006_regions_collect.js`（Ver.0.5：lands.field_id・world_resources.field_id・characters.region・achievements）（起動時に未適用分を番号順に当て、`schema_migrations` に記録）。

```
schema_migrations(version, name, applied_at)                         -- どこまで当てたか
accounts(id, username UNIQUE COLLATE NOCASE, pass_hash, created_at, last_login)
sessions(token_hash PK, account_id, created_at, expires_at)            -- token は SHA-256 だけ保存（30 日）
characters(id, account_id, individual_id, name, fur, active INTEGER, created_at,
           pos_x, pos_y, dir, place('field'|'nest:<id>'), exit_kind('new'|'live'|'logout'|'disconnect'|'shutdown'), saved_at)
                                                                      -- いま操作している個体＋位置の保存（再接続 60 秒の判定に exit_kind/saved_at）
individuals(id, species, name, sex, born_at, generation,
            father_id NULL, mother_id NULL,                           -- 家系図（Ver.0.4 で使う）
            genes JSON, traits JSON, status JSON,                     -- 遺伝子（shared/genetics.js）・表の形質／status：life・ageMs・fed・named・retiredAt・wild・kinOf・house
            account_id, role, nest_id)                                -- Ver.0.4：どの家か・'player'|'pup'|'kin'|'mate'|'ancestor'|'left'|'pending'・巣にいる家族
litters(id, account_id, nest_id, mother_id, father_id, nth, seed, season,
        conceived_at, due_play, born_at NULL, size)                   -- Ver.0.4：お産（born_at NULL＝もうすぐ。due_play＝親の ageMs）
inventories(owner_kind 'char'|'nest', owner_id, slot, item_id, qty)   -- 持ち物 8 枠 / 巣の倉庫 24 枠（枠の並びも保存）
lands(id, region_id, x, y, info JSON, plot)                           -- 土地（巣穴の入口の場所）。plot＝区画 'L列-行'、info＝区画の性能（食料・危険・地質・景観・気候・希少：Ver.0.3）
nests(id, owner_account_id UNIQUE, land_id, schema_version, rev,
      data JSON, visit_policy, created_at, updated_at,
      plugged, relocated_at, raided_at)                               -- 巣は土地と分離 → 引っ越し＝新しい lands を足して land_id を付け替え（Ver.0.3）
nest_events(id, nest_id, kind 'raid'|'blocked', data JSON, at, seen)  -- Ver.0.3：キツネの襲撃（seen=0 は留守中 → 次のログインで）
nest_access(nest_id, account_id, role, name)  PK(nest_id, account_id, role) -- visitor（許可リスト）/ builder（共同作業者・Ver.0.2）
friends(a, b, state 'pending'|'friend', created_at, updated_at)       -- Ver.0.2：a が申請した側
nest_visits(id, nest_id, visitor_id, visitor_name, at, seen)          -- Ver.0.2：訪問の記録（seen=0 は留守中の訪問）
world_resources(id, region_id, kind, x, y, respawn_at, qty, expires_at) -- 採集物。respawn_at NULL＝地上にある、値あり＝再出現待ち。qty・expires_at は落とし物（Ver.0.3）
meta(key, value)                                                      -- 採集物の初期化済み・次の id
regions(id, name, kind, hidden INTEGER, data JSON)                    -- 砂漠・草原・オアシス・丘・富山（hidden=1）
collectibles(id, kind, data JSON)  /  account_collectibles(account_id, collectible_id, got_at, data)   -- 収集品の器
events(id, key, data JSON) / account_flags(account_id, key, value)    -- 物語・隠し演出の器
```

- 巣データ（`nests.data`）の版が古ければ、起動時に `shared/nest-rules.js` の `migrateNest` で最新へ（`schema_version` も更新）。
- 書き込みは同期 API（`DatabaseSync`）＋`BEGIN IMMEDIATE` のトランザクション。採集は「資源を消す＋持ち物を書く＋再出現待ちを積む」、建築は「`rev` が一致したときだけ巣を書く＋持ち物」、倉庫は「持ち物＋倉庫」を 1 トランザクションで。
- 「アカウント」と「操作個体」を分けておくことで、**世代交代＝操作個体の切り替え**になる（Ver.0.4 で実装：古い `characters` を active=0、あとをつぐ子の行を足して持ち物を写す。巣・倉庫・フレンド・収集品はアカウントにつくのでそのまま）。
- 巣は土地 ID を参照するだけなので、**引っ越し＝land_id の付け替え**で済む（Ver.0.3 で実装。古い土地の行は履歴として残す）。
- Ver.0.5：地上の部屋は土地ごと（`Game.fields`：plains・rocks・dunes・canyon・toyama の 5 部屋）。地図は `shared/world.js` が土地と種から決まった形で作り、サーバーとクライアントの予測が同じ地図で `stepField` を回す（段差・さらさら砂も共有ルール）。旅＝部屋を出て入るだけ（`Game.travel`/`enterGate`）。収集品は部屋ごとに `curioTick` が出し、拾うと `account_collectibles`（先着 1 人を 1 トランザクション）。実績は `achievements`、進み具合は `account_flags`。共同巣は `nest_access` の role `invite`/`resident`。
- Ver.0.3：捕食者は `FieldRoom.predTick`（20Hz・`shared/predators.js` の `PredatorWorld`）がサーバーで動かし、スナップショットに `preds` を入れる。オフラインは `OfflineBackend` が同じクラスを 1/20 秒刻みで回す。天気・季節は時計から計算するので送らない。

## 6. 巣データ（全体モードと閲覧モードの共通データ）

```js
nest.data = {
  v: 1,                        // schema_version
  w: 48, h: 24,                // グリッド（1 セル = 16px の断面）
  surfaceY: 2,                 // 地表の行
  cells: "...",                // 各セル：0=土 1=掘った空間 2=岩(掘れない)… を RLE 文字列で保存
  rooms: [{id, kind:"bed"|"store"|"plain", x, y, w, h}],
  tunnels: [{id, x, y, len, dir:"h"|"v"|"slope"}],
  objects: [{id, type:"bed"|"shelf"|"lamp"|…, x, y, roomId}],
  entrance: {x, y}
}
```

- **全体モード**は `cells / rooms / tunnels / objects` をグリッドとして俯瞰描画し、マウスで編集。
- **閲覧モード**は同じデータから「横スクロールの断面」を生成：掘った空間＝歩ける床と天井、縦通路＝はしご／坂、部屋の家具＝同じグリッド座標に同じスプライト。カメラが寄るだけで、**変換表を持たない**（同じ座標系）。
- 編集はすべて「操作（op）」として送る：`{op:"dig",x,y}` `{op:"room",kind,x,y,w,h}` `{op:"place",type,x,y}` `{op:"remove",id}`。サーバーとクライアントが**同じ `shared/nest-rules.js`** で妥当性を判定し、サーバー確定後に全閲覧者へ配信。

## 7. フォルダ構成（『だんのうら』リポジトリの中の「おまけゲーム」として）

> 決定（2026-10-10）：本作は**このリポジトリ内のおまけゲーム**として作る。本編タイトルメニューの「おまけ：トビネズミ」（`index.html` の `#btn-tobinezumi` → `tobinezumi.html`）から入り、ゲーム内の「本編に戻る」で戻る。
> 本編・境界事象のコードは import しない（考え方だけ移植）。保存は `tobi_` で始まる localStorage の鍵だけ。

```
tobinezumi.html          入口（リポジトリのルート。GitHub Pages でそのまま開ける）
tobinezumi/
  client/      main.js（起動・ループ）, gfx.js（480×270＋UI 層）, input.js, ui.js（DOM の UI）,
               net.js（OfflineBackend / OnlineBackend / Predictor / Interp）,
               scene-title.js, scene-field.js, scene-nest-build.js, scene-nest-walk.js,
               nest-view.js（断面の描画：両モード共通）, nest-layout.js（配置：両モード共通・DOM なし）,
               sprites.js（manifest の読み込み・毛色の置き換え）, art.js（コード描画のプレースホルダ）, sfx.js（WebAudio の効果音）, style.css
  shared/      move.js, nest-rules.js, items.js, regions.js, protocol.js, rng.js, life.js（暮らしの数値）, daynight.js（昼夜の時計）,
               predators.js（捕食者の AI・Ver.0.3）, season.js（季節・天気・影響）, lands.js（土地の区画と性能）（ブラウザと Node の両方で import する ES Modules・DOM なし）
  server/      index.js（静的配信・/tobi-server.json・/healthz・WebSocket /ws）, game.js（接続・認証・振り分け。ws に依存しない）,
               rooms/field.js（地上 20Hz・スナップショット 10Hz・採集・巣穴）, rooms/nest.js（巣のインスタンス・建築・倉庫・訪問設定）,
               db.js, auth.js, backup.js, migrations/NNN_*.js, tools/（bots.mjs, backup.mjs, restore.mjs, proto-client.mjs）,
               test/（core：ws 不要 / e2e：本物の WebSocket）, package.json（依存は ws だけ）, Dockerfile（任意）
  assets/      manifest.json と画像（tools/make_assets.py が生成。ASSET_LIST.md §8）
  tools/       make_assets.py, normalize_sprites.py, preview.py（素材づくり。サーバーの道具は server/tools/）
  docs/        本書・PROTOCOL.md ほか
tests/tobinezumi-*.test.mjs   リポジトリ共通の `node tests/run.mjs` で回る（移動・建築ルール・移行・オフライン保存・予測・再接続、サーバーの core/e2e）
```

## 8. 動かし方・公開・費用

| 段階 | 置き場所 | 遊び方 | 月額目安 |
|---|---|---|---|
| **いま（Ver.0.1・段階 1〜2）** | GitHub Pages（静的） | **オフライン 1 人プレイ**：サーバーが見つからなければ自動で localStorage 版（`OfflineBackend`）。採集・巣作り・閲覧モード・保存まで遊べる。NPC のトビネズミ 3 匹（うち 1 匹の巣は見学可） | 0 円 |
| Ver.0.1 の完成（段階 3〜6・**完了**） | **ローカル**：`cd tobinezumi/server && npm install && npm start` → `http://localhost:8080/tobinezumi.html` | **オンライン**：サーバーがリポジトリのルートの必要な所（`tobinezumi.html`・`tobinezumi/client・shared・assets`・フォント・本編）を配り、`/tobi-server.json` に `{"ws":"/ws"}` を返すので自動で接続。Pages 版からでも `?server=ws://localhost:8080/ws` で同じサーバーへ | 0 円 |
| 少人数公開（〜20 人・未定） | 小さな VPS／PaaS 1 台（クラウドへの公開は Ver.0.1 ではしない） | Pages のクライアント＋`?server=wss://…`、またはサーバーから配信 | 0〜800 円程度 |
| 拡大時 | DB を PostgreSQL へ、地域ごとに Field プロセスを分割 | | 規模次第 |

- 接続先の決め方・メッセージの形は **PROTOCOL.md**。オフライン版とオンライン版は同じ API なので、画面側のコードは変えない。
- `?offline=1` で常にオフライン。オンラインにつながらなかったときもオフラインに戻り、タイトルにその旨を出す。
- 本編の PWA（`sw.js`）は `tobinezumi/` を先読みしない（通信は素通し）。本作を更新したら本編と同じく `sw.js` の VERSION を上げる。
- バックアップ：サーバー（`npm start`）が 1 時間ごとに `VACUUM INTO backups/game-YYYYMMDD-HH.db`（48 世代）。今すぐは `npm run backup`、復元は停止 → `npm run restore -- <file>`（今の DB を `pre-restore-*.db` に退避して差し替え）→ 起動。手順は `tobinezumi/README.md`。

## 9. 評価まとめ

| 観点 | 推奨構成の評価 |
|---|---|
| 既存システムとの互換性 | 高：同じ言語・同じ作り方・同じテスト方法。コードは移植して独立させる |
| 実装難易度 | 中：ネットワーク同期と巣の 2 モードが山場。どちらも共有コード化で抑える |
| 運用費用 | 低：1 プロセス＋SQLite。開発中は 0 円 |
| 将来の拡張性 | 個体・家系・土地・地域・収集品・イベントの器を最初から分離。巣データに版番号とマイグレーション |
