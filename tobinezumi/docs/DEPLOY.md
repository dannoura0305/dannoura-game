# DEPLOY — トビネズミMMO（仮称）を インターネットに公開する手順（Ver.0.6「公開準備」）

> 状態：**準備だけ済み（まだ公開していない）**。設定ファイルは `tobinezumi/deploy/`、サーバーの守りは `tobinezumi/server/security.js`。
> 公開そのもの（アカウント作成・支払いの登録・デプロイ）は **あなた（リポジトリの持ち主）が行う作業**です。下の「あなたがすること」を順に。

## 0. しくみ（どこで何が動くか）

```
 遊ぶ人のブラウザ
   │  ① ゲームの画面（HTML・JS・絵）           ② 遊ぶための通信（WebSocket・wss://）
   ▼                                              ▼
 GitHub Pages（いまのまま・無料）           Fly.io（または Render）の小さなサーバー 1 台
 https://<ユーザー名>.github.io/<リポジトリ>/   https://tobinezumi-xxxx.fly.dev/  … /ws・/healthz
   └ tobi-server.json に ② の場所を書く          └ SQLite（/data の ボリューム）＋ 1 時間ごとのバックアップ
```

- ① 画面は今までどおり GitHub Pages から配る（サーバーも同じ画面を配れるので、サーバーの URL を開いても遊べる）。
- ② サーバーは **Node 22 の 1 プロセス＋SQLite 1 ファイル**。データは `/data`（ボリューム）に置くので、作り直しても消えない。
- サーバーが見つからない・つながらないときは、今までどおり **オフライン（ひとりで遊ぶ）** に戻る。

## 1. 費用のめやす（2026 年 10 月時点の公開価格。必ず公式の料金ページで確かめてください）

| 置き場所 | 構成 | 月額のめやす | メモ |
|---|---|---|---|
| **Fly.io（おすすめ）** | shared-cpu-1x・メモリ 256MB を 1 台（東京 nrt）＋ボリューム 1GB | 約 2〜3 ドル（300〜500 円）＋通信量 | 小さな使い方なら請求額は少ない。止めない設定（WebSocket のため）。専用 IPv4 は不要（共有で足りる） |
| Render | Starter（512MB）＋ディスク 1GB | 約 7.25 ドル（1,100 円前後） | 無料プランはディスクが無く、止まるとデータが消えるので使えない |
| GitHub Pages | 画面（静的ファイル） | 0 円 | 今のまま |

- 20 人くらいまでなら 256MB で足りる見込み（ボット 12 体で 1 体あたり受信 約 14KB/秒、サーバーのメモリは数十 MB）。
- 通信量：1 人が 1 時間遊ぶと 約 50MB（スナップショット 10 回/秒）。Fly.io・Render とも、小さな規模なら無料の枠の中か数十円。

## 2. あなたがすること（はじめての公開）

### 2-1. Fly.io で動かす（おすすめ）
1. https://fly.io でアカウントを作り、支払い方法（クレジットカード）を登録する。
2. 手元の PC に `flyctl` を入れる（公式の手順：`curl -L https://fly.io/install.sh | sh` など）→ `fly auth login`。
3. `tobinezumi/deploy/fly.toml` を開いて、2 か所を書きかえる：
   - `app = "tobinezumi-CHANGE-ME"` → 好きな名前（世界でひとつ。例：`tobinezumi-dannoura`）
   - `TOBI_ORIGIN = "https://CHANGE-ME.github.io"` → あなたの GitHub Pages の **オリジン**（`https://<ユーザー名>.github.io`。末尾の `/リポジトリ名` は付けない）
4. リポジトリのルート（`index.html` のある所）で：
   ```sh
   fly launch --no-deploy --copy-config --config tobinezumi/deploy/fly.toml --dockerfile tobinezumi/server/Dockerfile
   fly volumes create tobi_data --size 1 --region nrt --config tobinezumi/deploy/fly.toml
   fly secrets set TOBI_STATS_TOKEN=$(openssl rand -hex 16) --config tobinezumi/deploy/fly.toml   # /statsz を見るための合言葉（任意）
   fly deploy --config tobinezumi/deploy/fly.toml --dockerfile tobinezumi/server/Dockerfile .
   ```
5. 確かめる：`https://<app名>.fly.dev/healthz` が `{"ok":true,"v":"0.6",...}`、`https://<app名>.fly.dev/tobinezumi.html` で遊べる（この URL ならサーバー自身の画面なので、そのままオンライン）。

### 2-2. GitHub Pages の画面からつなぐ
1. `tobinezumi/deploy/tobi-server.example.json` を **リポジトリのルート** に `tobi-server.json` という名前で写し、`ws` を書きかえる：
   ```json
   { "ws": "wss://<app名>.fly.dev/ws" }
   ```
2. コミットして GitHub Pages に出す。`https://<ユーザー名>.github.io/<リポジトリ>/tobinezumi.html` を開くと、タイトルに「オンライン：wss://…」と出る。
   - Pages は https なので、**必ず `wss://`**（`ws://` は ブラウザが止める）。
   - つながらないときは自動でオフラインに戻る（タイトルに「サーバーにつながらなかったので、ひとりで遊びます」）。
   - 一時的に試すだけなら、ファイルを置かずに `tobinezumi.html?server=wss://<app名>.fly.dev/ws` でも同じ。`?offline=1` でいつでもオフライン。
3. `tobi-server.json` をルートに置くと、手元の `python3 -m http.server` で開いたときも公開サーバーへつなぎに行く（許可リストに無い Origin なので断られ、オフラインに戻る）。手元で試すときは `?offline=1` か `?server=ws://localhost:8080/ws`。

### 2-3. Render を使う場合（Fly.io の代わり）
1. https://render.com でアカウントを作り、GitHub と連携する。支払い方法を登録する（ディスクのため Starter 以上）。
2. `tobinezumi/deploy/render.yaml` の `TOBI_ORIGIN` を書きかえ、ファイルをリポジトリのルートに `render.yaml` として写す（または Render の「New → Blueprint」でパスに `tobinezumi/deploy/render.yaml` を指定）。
3. Blueprint から作る → デプロイ。URL は `https://tobinezumi-xxxx.onrender.com`。`tobi-server.json` の `ws` は `wss://tobinezumi-xxxx.onrender.com/ws`。

## 3. 環境変数（サーバー：`tobinezumi/server/index.js`）

| 変数 | 既定 | 説明 |
|---|---|---|
| `TOBI_PORT`（または `PORT`） | 8080 | 待ち受けるポート（Render は `PORT`） |
| `TOBI_DATA_DIR`（または `TOBI_DATA`） | `./data`（Docker は `/data`） | SQLite（`game.db`）の置き場所。**ボリュームに**する |
| `TOBI_BACKUPS` | `<データ>/backups` | バックアップの置き場所（同じボリュームの中） |
| `TOBI_BACKUP_HOURS` / `TOBI_BACKUP_KEEP` | 1 / 48 | 何時間ごとに・何世代残すか（`VACUUM INTO`）。止めるときにも 1 つ取る（本番） |
| `TOBI_ORIGIN` | 空（だれでも） | **WebSocket をつないでよいページ**（カンマ区切り）。例 `https://you.github.io`。`https://*.example.org` のように 1 段のワイルドカードも可。サーバー自身が配るページ（同じホスト）はいつでも通す |
| `TOBI_ORIGIN_STRICT` | 0 | 1 にすると Origin の無い接続（ボット・道具）も断る |
| `TOBI_TRUST_PROXY` | 0（Docker は 1） | 1 のとき `Fly-Client-IP` / `X-Forwarded-For` を接続元の IP として使う（Fly.io・Render の後ろでは 1） |
| `TOBI_MAX_CONN_PER_IP` | 本番 6・手元 0（なし） | 接続元ごとの同時接続 |
| `TOBI_CONN_PER_MIN` | 本番 30・手元 0 | 接続元ごとの 1 分あたりの新しい接続 |
| `TOBI_MSG_PER_IP` | 本番 300・手元 0 | 接続元ごとの 1 秒あたりのメッセージ（すべての接続の合計。1 接続ごとの 150/秒は前から） |
| `TOBI_MAX_PAYLOAD` | 16384 | 1 メッセージの最大の大きさ（バイト） |
| `TOBI_STATS_TOKEN` | 空 | `/statsz`（CPU・メモリ・通信量・断った接続）を `Authorization: Bearer <合言葉>` で見られる。空なら 404 |
| `TOBI_PUBLIC_WS` | `/ws` | `/tobi-server.json` で教える接続先 |
| `NODE_ENV=production`（または `TOBI_PUBLIC=1`） | Docker は production | 本番の印：上限が既定で入る・止めるときにバックアップ・**`TOBI_DEV=1` なら起動しない** |
| `TOBI_RESTORE_FROM` | 空 | 起動の前に このバックアップから 1 回だけ復元（§6） |
| `TOBI_DEV` | 0 | **公開サーバーでは入れない**（開発用の `dev` コマンド・時計の早回し）。本番の印があると起動を拒む |
| `TOBI_PREDATORS` / `TOBI_RAIDS` / `TOBI_REGISTER_MAX` / `TOBI_STATS_SEC` | normal / 1 / 20 / 60 | 前からの設定（捕食者の強さ・巣の襲撃・登録の上限・ログの間隔） |

## 4. 守り（実装したこと・チェックリスト）

- [x] **Origin の確認**（`security.js` の `checkOrigin`）：許可リストの外のページからの WebSocket は 403。`null` Origin も 403。サーバー自身のページは通す。
- [x] **接続元ごとの上限**（`IpLimiter`）：同時接続・接続の速さ（429）・送信の速さ（`kick` → 1008 で切る）。プロキシの後ろでは `TOBI_TRUST_PROXY=1`。
- [x] **1 メッセージの大きさ**：16KB（`ws` の `maxPayload`。超えると切る）。1 接続 150 通/秒（前から）。
- [x] **パスワード**：scrypt で保存（前から）。ログインの失敗回数・登録の回数に上限（前から）。
- [x] **トークン**：ログインの印は ブラウザの `localStorage`（`tobi_token`）に入れ、サーバーには SHA-256 だけを保存（DB が漏れても乗っ取れない）。クッキーは使わない → CSRF の心配はなく、かわりに Origin の確認で「よそのページからつなぐ」を防ぐ。https（wss）だけで公開すること（Fly.io は `force_https = true`）。
- [x] **静的ファイル**：配る所を限る（サーバーのコード・DB・`.git` は 404）・`x-content-type-options: nosniff`・`x-frame-options: SAMEORIGIN`・`referrer-policy`。
- [x] **死活確認** `/healthz`（人数とどれだけ動いているかだけ）・止めている途中は 503。くわしい数字は `/statsz`（合言葉）。
- [x] **止めるとき**（SIGTERM）：遊んでいる子に「再起動します」→ 位置・家族を保存 → 1012 で切る（クライアントは自動でつながりなおす）→ バックアップ → 10 秒たっても終わらなければ強制終了。
- [x] **バックアップ**：1 時間ごと 48 世代を `/data/backups`（同じボリューム）。**ボリュームごと消えたときのために**、ときどき手元へ写すとよい：`fly ssh sftp get /data/backups/game-YYYYMMDD-HH.db --config tobinezumi/deploy/fly.toml`。Fly.io のボリュームのスナップショット（自動・数日分）も使える。
- [x] **コンテナ**：root で起動して `/data` を node（uid 1000）の持ち物にしてから権限を落とす（`server/docker-entry.mjs`）。`HEALTHCHECK` つき。
- [ ] （公開後）`TOBI_ORIGIN` が自分の Pages だけになっているか、`/healthz` が 200 か、`fly logs` に `[ws] 断った（origin）` が多すぎないかを見る。
- [ ] （公開後）利用規約・連絡先（チャットのある遊びなので、困ったときの連絡先を README に書く）はあなたが決める。

## 5. 動作の確かめ（このリポジトリで行ったこと・2026-10-14）

- `docker build -f tobinezumi/server/Dockerfile .` → `docker run -v tobi-data:/data -e TOBI_ORIGIN=https://example.github.io`：`/healthz` 200、画面 200、見出し（SAMEORIGIN・nosniff）、プロセスは uid 1000、`/data` に DB とバックアップ、よその Origin の WebSocket は 403・許可した Origin と Origin なしはつながる、`docker stop` で「SIGTERM：位置を保存して止めます」→ `/data/backups/game-*.db` ができる、`TOBI_DEV=1` では「起動しません」。
  - ※ この作業環境では npm の取得にプロキシの証明書が要ったので、確かめの時だけ証明書を足した写しの Dockerfile を使った（リポジトリの Dockerfile はそのまま）。
- `npm test` の `deploy.test.mjs`（本物の WebSocket）：Origin・IP ごとの同時接続 429・送信の速さで kick・`/healthz` と `/statsz`・止める途中の 503 と 1012。
- Playwright：`TOBI_ORIGIN=http://localhost:8790` のサーバーに、`http://localhost:8790/tobinezumi.html?server=ws://localhost:8080/ws`（許可）→ オンライン、`http://127.0.0.1:8790/…`（許可リストの外）→ 403 でオフラインに戻る。

## 6. 更新・もしものとき

- 更新：コードを直してから `fly deploy --config tobinezumi/deploy/fly.toml --dockerfile tobinezumi/server/Dockerfile .`（DB はボリュームにあるので残る。起動時に `migrations/` の新しい分だけ当たる）。画面を変えたら本編と同じく `sw.js` の VERSION を上げる。
- 復元：`fly ssh console -C "ls /data/backups"` で選んで → `fly secrets set TOBI_RESTORE_FROM=/data/backups/game-YYYYMMDD-HH.db --config …`（マシンが再起動し、**起動の前に 1 回だけ**差し替える。今の DB は `pre-restore-*.db` に退避）→ ログで「復元した」を見たら `fly secrets unset TOBI_RESTORE_FROM --config …`。手元のサーバーは今までどおり 止めてから `npm run restore -- <file>`。
- 止める：`fly scale count 0 --config …`（データは残る）。やめる：`fly apps destroy <app名>`（**ボリュームも消える**。先にバックアップを手元へ）。
