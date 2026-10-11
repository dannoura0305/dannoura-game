# PROTOCOL — クライアント⇄サーバーの通信（Ver.0.1）

> 状態：**実装済み（Ver.0.1）**。サーバー＝`tobinezumi/server`（Node.js 22＋`ws`＋`node:sqlite`）、クライアント＝`client/net.js` の `OnlineBackend`。2 ブラウザ＋ボット 10 体で受け入れ確認済み。
> この文書と `tobinezumi/shared/protocol.js` が「約束」。サーバー担当はここに合わせ、ずれたら両方を直す。
> クライアントの実装：`tobinezumi/client/net.js`（`OfflineBackend` が同じ API をローカルで実装した「動く仕様書」、`OnlineBackend` がこの文書どおりの WebSocket 版）。サーバーの入口は `server/game.js`（振り分け）・`server/rooms/field.js`・`server/rooms/nest.js`。

## 0. 接続先の決め方（クライアント）

| 条件 | 動き |
|---|---|
| `tobinezumi.html?offline=1` | 必ずオフライン（localStorage） |
| `tobinezumi.html?server=ws://localhost:8080/ws` | その URL へ接続。つながらなければオフラインに戻る（タイトルに表示） |
| どちらも無い | 同じ場所の `tobi-server.json` を 1.2 秒だけ探す。`{"ws": "/ws"}` のように返れば接続（`/` で始まれば同じホストの ws/wss に読み替え）。GitHub Pages には無いのでオフライン |

→ **サーバーは `npm start` で静的ファイル（リポジトリのルート）を配り、`GET /tobi-server.json` に `{"ws":"/ws"}` を返し、`/ws` で WebSocket を受ける**と、`http://localhost:8080/tobinezumi.html` を開くだけでオンラインになる。

## 1. 形

- WebSocket・テキストフレーム・1 メッセージ = 1 JSON：`{"t": "型", ...}`（`shared/protocol.js` の `encode/decode`）。
- 返事が要る要求はクライアントが `rid`（接続ごとの連番）を付ける。サーバーは **必ず** `{"t":"res","rid":同じ,"ok":true|false, ...}` を 1 回返す。失敗は `ok:false, reason:"日本語の短い理由", code:"ERR の値"`。
- 返事の無い通知（他人の移動・チャットなど）は `rid` なし。
- クライアントは 8 秒返事が無ければ `{ok:false, reason:'返事が無い'}` として扱う。
- 1 メッセージ 16KB まで。1 接続 150 通／秒を超えると `kick` して切る。返事の要る要求は接続ごとに受け取った順に処理する。

`ERR`：`bad_request / auth / taken / not_found / too_far / full / forbidden / stale_rev / rate / rule`

## 2. クライアント → サーバー（`C2S`）

| t | 中身 | 返事（res） | サーバーの検証 |
|---|---|---|---|
| `hello` | `{v:1, token?}` | `{ok, account?:{id,username}, character?:Character, expired?}` | token が有効ならログイン済みに（同じアカウントの古い接続には `kick`）。無効・期限切れは `expired:true`（クライアントは token を消す）。v が違えば `ok:false` |
| `register` | `{username, password}` | `{ok, token, account}` | ユーザー名 3〜16（英数 `_-`・大文字小文字は同じ扱い）、パスワード 8 以上、scrypt。重複は `taken`。接続元ごとに 10 分 20 件まで（`rate`） |
| `login` | `{username, password}` | `{ok, token, account, character?}` | 失敗はユーザー名ごと 5 回／5 分・接続元ごと 20 回／5 分で `rate`。token は 30 日（DB には SHA-256 だけ） |
| `logout` | `{}` | `{ok}` | token 失効、位置を保存 |
| `create_char` | `{name, fur}` | `{ok, character}` | 名前 1〜10（`validName`）、`fur ∈ FUR_IDS`。1 アカウント 1 個体（DB は複数可の形） |
| `join_field` | `{}` | `{ok, world: WorldInit}` | ログアウト・サーバー停止・同じ接続の続きなら保存位置。切断（`disconnect`）からの再接続は 60 秒以内なら同じ位置、それ以外は巣の入口の 12px 下（無ければ出発点）。保存位置が壁の中なら入口へ |
| `input` | `{inputs:[{seq, mx, my, jump}]}` | なし（snapshot の `ack`） | `shared/move.js` の `stepField` を **同じ順・同じ dt（1/60）** で当てる（20Hz のティックでまとめて）。seq は単調増加（古い seq は捨てる）。1 回 30 個まで。**速度上限**：1 秒 60 入力（貯め 90）を超えた入力は当てずに捨てる（ack は進む＝クライアントは巻き戻される）。mx/my は ±1 に丸める |
| `pickup` | `{resId}` | `{ok, item, inv}` / `{ok:false, reason}` | 存在・未取得・距離 ≤ 28px（サーバーの確定位置）・持ち物の空き。**1 プロセス内で逐次処理**（同時に 2 人 → 先着 1 人だけ） |
| `dig_burrow` | `{x, y}` | `{ok, entrance}` | まだ巣が無い・`canDigBurrow(map, 確定位置, 入口一覧)`。巣は `createNest({seed})` |
| `enter_nest` | `{owner, resume?}` | `{ok, nest: NestRecord}` | 入口から 34px 以内。他人の巣は訪問設定（private/public/list）を見る。`resume:true` は再接続用：切断前に同じ巣の中にいて 60 秒以内なら距離を見ない |
| `leave_nest` | `{}` | `{ok, x, y}` | 入口の 12px 下に出す |
| `nest_op` | `{nestId, rev, op}` | `{ok, rev, data, inv, created?, cost, refund}` | 所有者（Ver.0.2 から builder も）。`rev` が今と違えば `stale_rev`（最新の `rev, data` を付けて返す）。`tryOp(data, op, inv)` → 素材を払う・返す → `rev+1` → 保存 → 同じ巣にいる人へ `nest_update` |
| `store` | `{nestId, dir:'deposit'\|'withdraw', item, n}` | `{ok, moved, inv, storage}` | 自分の巣の中にいる・倉庫の部屋がある・個数。持ち物と倉庫を 1 トランザクションで保存 |
| `inv_move` | `{from, to}` | `{ok, inv}` | `swapSlots`（同じ物はまとめる） |
| `nest_move` | `{x, y, facing, anim}` | なし | 巣の中の位置（訪問者どうしの表示用）。10Hz まで |
| `chat` | `{text}` | なし（同じ場所の全員へ `chat`） | `cleanChat`（80 文字・制御文字除去）、連投制限（10 秒に 5 回・0.4 秒あける。超えると本人へ `toast`）。地上は地上の全員、巣の中は同じ巣の中の人だけ |
| `visit_policy` | `{policy, list?:[キャラ名]}` | `{ok, policy, list?, unknown:[見つからない名前]}` | `policy ∈ private/public/list`。list は 30 人まで、キャラ名 → アカウントに直して `nest_access` に保存（同じ名前は全員） |
| `ping` | `{ct}` | `pong {ct, st}` | 時計合わせ＋生存確認（クライアントは 2 秒ごと） |

### op（`nest_op` の中身・`shared/nest-rules.js`）
```
{op:'dig', x, y}                    {op:'fill', x, y}
{op:'tunnel', x, y, len, dir:'h'|'v'|'slope', s?:1|-1}
{op:'room', x, y, w, h, kind?:'plain'|'bed'|'store'}
{op:'room-resize', id, x, y, w, h}
{op:'set-kind', id, kind}
{op:'place', type, x, y, rot?:0|1}
{op:'remove', id}
```
- 取り消し（Ctrl+Z）はクライアントが `inverseOps` で作った**逆操作を普通の op として送る**（サーバーに特別な処理は不要）。
- id はデータの `seq` から決まる（`'r'+seq`, `'t'+seq`, `'o'+seq`）ので、サーバーとクライアントで同じ。

## 3. サーバー → クライアント（`S2C`）

| t | 中身 |
|---|---|
| `welcome` | `{v, serverTime}`（接続直後。任意） |
| `snapshot` | `{st, ack, you, players:[PlayerSnap]}` を **10Hz**。`st`=サーバー時刻(ms)、`ack`=処理済みの最後の入力 seq、`you`=自分の確定状態（`stepField` の state そのもの：`{x,y,z,fx,fy,dir,anim,hop,cd,jump,seq}`） |
| `player_join` | `{player:{id, name, fur, x, y, dir}, why:'join'\|'nest'}`（`nest`＝巣から出てきた：クライアントは通知を出さない） |
| `player_leave` | `{id, why:'leave'\|'logout'\|'nest'}`（`nest`＝巣に入った） |
| `chat` | `{from, name, text, where:'field'\|'nest', at}`（自分の発言も返す。クライアントはこれを表示する＝エコー） |
| `res_gone` | `{id, by}`（拾われた） |
| `res_spawn` | `{res:{id, kind, x, y}}`（2〜5 分後、`pickRespawnPoint` で別の場所） |
| `entrance` | `{entrance: Entrance}`（新しい巣穴） |
| `nest_update` | `{nestId, rev, op, data}`（操作した本人以外の、同じ巣の中の人へ） |
| `nest_peers` | `{nestId, peers:[{id,name,fur,x,y,facing,anim}]}`（巣の中の全員。自分も入る。出入りのたび＋`nest_move` があれば 10Hz） |
| `toast` | `{text}`（「ナッツ が やってきた」など） |
| `kick` | `{reason}`（同じアカウントが別の場所でログインした・送信が多すぎる。クライアントは再接続せずタイトルへ） |
| `pong` | `{ct, st}` |

## 4. データの形

```
Character  = {id, name, fur, createdAt, individual:{species:'jerboa', sex, generation, father_id, mother_id, genes:{fur}, traits:{}, status:{}}}
WorldInit  = {serverTime, you:{id(=アカウント id), name, fur, x, y, dir, inv:[Slot|null ×8], nest:{id,x,y}|null},
              resources:[{id, kind:'seed'|'grass'|'pebble', x, y}], players:[{id,name,fur,x,y,dir}], entrances:[Entrance]}
Slot       = {id:'seed'|'grass'|'pebble', n:1..99}
Entrance   = {owner(アカウント id), name(キャラ名), nestId, x, y, own:boolean(受け手から見て), policy}
PlayerSnap = {id, x, y, z, dir:'down'|'up'|'left'|'right', anim:'idle'|'hop'|'jump', jump:{t,dur,x0,y0,x1,y1}|null}
NestRecord = {id, owner, ownerName, rev, data:(巣データ v1・ARCHITECTURE §6), storage:[Slot|null ×24], policy, canEdit, own, list?:[許可リストのキャラ名]（所有者だけ）, hostFur:null}
```
- 地図は送らない。両方が `buildFieldMap(FIELD_SEED)` で同じ地図を作る（seed を変えるときは両方を更新）。
- 座標はすべてピクセル（1 タイル 16px）。巣の中はセル（16px）。

## 5. 予測と補間（クライアントの約束）

- クライアントは 60Hz で `stepField` を回し、入力ごとに `seq` を付けて即時に自分へ当てる（`Predictor`）。入力は 50ms ごとにまとめて `input` で送る。
- `snapshot.ack` 以前の入力は捨て、`snapshot.you` から残りを当て直す。24px 未満のずれは 0.1 秒で見た目だけ寄せる。
- 他人は `snapshot` を `st` 付きでためて **100ms 遅れ**で線形補間（`Interp`）。`jump` があればその軌道（放物線）を再生。
- サーバーは入力を**受け取った順**に当てる（入力の dt はクライアントでも固定 1/60）。速度上限・クールダウン・地形はすべて `stepField` の中にあるので、正しい入力列なら必ず同じ結果になる。改造クライアントが位置を直接送ることはできない（位置を送る口が無い）。

## 6. 再接続

- 切れたらクライアントは 0.5 → 1 → 2 → … → 30 秒の間隔で再接続し、`hello`（token）→ 地上にいたなら `join_field`、巣の中にいたなら `enter_nest {resume:true}`（だめなら `join_field`）を自動で送る。サーバーは 60 秒以内なら同じ位置に戻す。token が切れていたらタイトルへ。
- 「切れた」の判定：ソケットの close に加えて、**6 秒なにも届かない**（地上は 10Hz の snapshot、巣の中・タイトルは 2 秒ごとの pong）。ネットが黙って切れても気づける。サーバー側は 10 秒ごとの WebSocket ping に応答しない接続を切る（切断時に位置を保存）。
- 再接続中は画面を暗くし「つながりなおしています…」、地上の自分は動かさない（入力はためない）。
- 拾う・掘る・入るなどの要求を送る直前に、ためている入力を先に送る（サーバーの確定位置が追いつく）。
- サーバーを止めるとき（SIGINT/SIGTERM）は全員の位置を保存してから close 1012。クライアントは自動で再接続し、止まっていた時間に関係なく停止時の位置から続く。

## 7. オフライン版（参考：同じ API・localStorage）

- 保存は `tobi_save_v1`（1 つの JSON）と `tobi_settings`（拡大率）、オンラインの token は `tobi_token`。**`tobi_` 以外の鍵には触れない**（本編 `dannoura_*`・境界事象 `kyokai_*`）。
- `tobi_save_v1 = {v:1, account, character, player:{x,y,dir,inv,nestId,place}, nests:{[id]:NestRecord の中身}, entrances:[...], world:{resources, respawns:[{kind, at}], nextId}}`。読み込み時に巣データは `migrateNest` で最新版へ。
- オフラインの「ほかのトビネズミ」（ナッツ・モカ・リコ）は `snapshot.players` に入る NPC。モカの巣は公開（見学できる）、ほかは非公開。サーバー版では本物のプレイヤーに置き換わる。
