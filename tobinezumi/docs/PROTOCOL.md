# PROTOCOL — クライアント⇄サーバーの通信（Ver.0.1〜0.6）

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
| `visit_policy` | `{policy, list?:[キャラ名]}` | `{ok, policy, list?, unknown:[見つからない名前]}` | `policy ∈ private/friends/list/public`（friends は Ver.0.2）。list は 30 人まで、キャラ名 → アカウントに直して `nest_access` に保存（同じ名前は全員） |
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
| `welcome` | `{v, serverTime, clock}`（接続直後。clock は §8） |
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
WorldInit  = {serverTime, clock, life, friends:[Friend], visitors:[{name, at}], you:{id(=アカウント id), name, fur, x, y, dir, inv:[Slot|null ×8], nest:{id,x,y}|null},
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

## 8. Ver.0.2「暮らし」（追加分。PROTOCOL_VERSION は 1 のまま＝足しただけ）

### 8.1 C2S
| t | 中身 | 返事 | サーバーの検証 |
|---|---|---|---|
| `eat` | `{from:'inv'\|'pile'}` | `{ok, life, inv, storage?, left?, src}` | 地上か巣の中・眠っていない・満腹でない（`canEat`）・0.4 秒あける（`rate`）。inv：持ち物に種子（無ければ `rule`）。pile：自分の巣の中・「種の山」の近く（`nest_move` の位置）・倉庫に種子 |
| `drink` | `{resId?}` | `{ok, life, src:'water'\|'dew'}` | 地上・跳んでいない・水分が満タンでない。resId あり＝夜露（`kind:'dew'`）が 28px 以内（飲むと消えて `res_gone`）。無し＝確定位置から 20px 以内に水のタイル（`nearWater`）。夜露は `pickup` できない（`rule`） |
| `sleep` | `{}` | `{ok, life}` | 巣の中・所有者／共同作業者／所有者のフレンド・`nest_move` の位置が寝床（`nestbed`）の上（左右 12px・床 12px の余裕）。中の人の `nest_peers` で anim が `sleep` になる |
| `wake` | `{}` | `{ok, life}` | いつでも。`sleep` 以外の anim の `nest_move` でも起きる。体調が 100 になると自然に起きる（`life` が sleep:false で届く） |
| `friends` | `{}` | `{ok, list:[Friend]}` | |
| `friend_req` | `{name}` | `{ok, state:'outgoing'\|'friend', list}` | キャラ名 → 1 アカウント（見つからない `not_found`・同名が複数 `rule`・自分 `rule`）。もうフレンド／申請済みは `rule`。向こうからの申請があればそのまま friend。50 匹まで（`full`）。相手がいれば `toast`＋`friends` |
| `friend_ok` | `{id}` | `{ok, list}` | id（アカウント）からの申請があるとき |
| `friend_del` | `{id}` | `{ok, list}` | 断る・取り消す・やめる（どれも行を消す）。フレンド操作 3 つは 1 分 12 回まで（`rate`） |
| `set_builders` | `{list:[キャラ名]}` | `{ok, list, unknown}` | 自分の巣の所有者だけ（巣が無ければ `not_found`）。10 匹まで（`bad_request`）。`nest_access` の role=builder を全部入れ替え。加わった／外れた人がオンラインなら `toast`、その巣の中にいれば `nest_role` |
| `visitors` | `{}` | `{ok, list:[{name, at}]}` | 自分の巣の最近の訪問者 20 件 |

- `nest_op`：所有者か共同作業者（role=builder）。素材は**操作した本人**の持ち物から。`store`・`visit_policy`・`set_builders` は所有者だけ。
- `enter_nest`：所有者・共同作業者はいつでも、`friends` は所有者のフレンドだけ。`NestRecord` に `role:'owner'|'builder'|'visitor'`、所有者には `builders:[名前]` も。
- 地上の移動（`input`）：体調 25 未満（`isTired`）なら `stepField(..., {tired:true})`（速さ ×0.7・大ジャンプなし）。クライアントの予測も `game.life` で同じ補正をかける（境目のずれは通常の補正で吸収）。

### 8.2 S2C
| t | 中身 |
|---|---|
| `life` | `{life:{hunger, thirst, cond, sleep}}`：2 秒ごと（地上・巣の中にいる間だけ減る）＋食べた・飲んだ・眠った・起きたとき |
| `clock` | `{clock}`（今は送らない。時計を変えたときのための予約） |
| `friends` | `{list:[Friend]}`：申請が来た・受けてもらえた・やめられた・フレンドがログイン／ログアウトした |
| `visit` | `{name, nestId, at}`：自分の巣にだれかが入った（所有者がオンラインのとき。同じ子の 2 分以内の出入りは 1 回） |
| `nest_role` | `{nestId, canEdit, role}`：いる巣で共同作業者にされた・外された |

```
Friend = {id(アカウント), name, fur, state:'friend'|'incoming'|'outgoing', online, where:'field'|'nest'|null, nest:{x,y}|null, at}
clock  = {scale, origin, base}   世界の経過 ms = base + (t - origin) × scale、1 日 = 24 分（shared/daynight.js の dayPhase）
life   = {hunger, thirst, cond, sleep}   0〜100（shared/life.js）
```
- 時計：ふだんは `{scale:1, origin:0, base:0}`＝サーバーの Unix 時刻そのまま。クライアントは `pong` で合わせた `serverTime()` から時刻を出すので、全員の昼夜がそろう。`TOBI_DEV=1 TOBI_TIMESCALE=n TOBI_START_HOUR=h` のときだけ scale・base が変わる（暮らしの減り・採集物の戻り・夜の物も n 倍速）。
- 夜（19〜5 時）：6 秒（世界の時間）ごとに夜露（id `d…`・上限 20）と夜の種子（id `n…`・上限 16・拾っても戻らない）が `res_spawn`。昼（7〜17 時）になると夜露は `res_gone {by:0}`。拾った物の再出現待ちは 2〜5 分 × 夜 0.45／朝夕 0.75／昼 1.4。
- 保存：`individuals.status.life`（`json_set`）を位置の保存と同じとき（30 秒ごと・切断・ログアウト・停止）に。ログアウト中は減らない（再接続したときの値から続ける）。眠りは保存しない（入り直すと起きている）。
- DB：`migrations/003_life_social.js`＝`friends(a, b, state)`（a が申請した側）、`nest_visits(nest_id, visitor_id, visitor_name, at, seen)`、`nest_access` の主キーを `(nest_id, account_id, role)` に、既存の個体に life の初期値。
- オフライン版（`OfflineBackend`）も同じ API：フレンドは NPC（ナッツ・モカ・リコ）、`setBuilders` は「オンラインで使えます」、NPC のフレンドが訪ねてくる。保存 `tobi_save_v1` の中身は版 2：`player.life`・`friends`・`visits`・`lastPlayed`（v1 は読み込み時に移行）。

## 9. Ver.0.3「危険と土地」（追加分。PROTOCOL_VERSION は 1 のまま＝足しただけ）

### 9.1 C2S
| t | 中身 | 返事 | サーバーの検証 |
|---|---|---|---|
| `survey` | `{}` | `{ok, land:Land+{here:{weather, season, sheltered}}, here:{canDig, reason, digCost, digTime, relocateCost, nests, hasNest, cooldownMs, canMove, moveReason?, x, y}}` | 地上にいる・1 秒あける（`rate`）。確定位置の区画（`shared/lands.js` の `landAt`） |
| `relocate` | `{}` | `{ok, entrance, inv, cost, land, from:{x,y}}` | 自分の巣がある（`not_found`）・跳んでいない・前の引っ越しから 10 分（`rate`＋`cooldownMs`）・`canDigBurrow`（自分の入口は除く）・今の入口から 8 タイル以上・費用 `relocateCost(land)` を持ち物から（`rule`）。持ち物と `lands` の追加・`nests.land_id`・`plugged=0`・`relocated_at` を 1 トランザクション。ほかの子へ `entrance {moved:true, from}`、フレンドへ `friends` |
| `plug` | `{on}` | `{ok, plugged, inv}` | 巣の中・所有者か共同作業者・1 秒あける・ふさぐのは小石 ×2（`PLUG_COST`）、ひらくと小石 1 つ戻る・同じ状態なら `rule`。地上の子へ `entrance`（`plugged`）、中の子へ `toast` |
| `dev` | `{weather?, season?, spawn?:'owl'\|'fox'\|'snake', dx?, dy?, clear?}` | `{ok, clock, spawned}` | **`TOBI_DEV=1` のときだけ**（それ以外は `forbidden`）。天気・季節を固定（`null` で外す）→ 全員へ `clock`。捕食者を自分の確定位置＋(dx,dy) に出す |
- `dig_burrow` の返事に `inv, cost, land, digTime`。硬い土（地質 4〜5）は素材がいる（`rule`「土が硬い。素材が足りない」）。巣は掘った区画の土地（`lands.plot`・`lands.info`）を持つ。
- `eat` に `item:'rare_seed'`（珍しい種：空腹 +40・体調 +10）。
- `drink` の `resId` は夜露（`d…`）か水たまり（`w…`・`kind:'puddle'`・水分 +20）。返事の `src` は `dew`／`puddle`／`water`。
- `pickup`：落とし物（`x…`）は `n` 個まとめて（持ち物に入りきらなければ `full`）、返事に `n`。落とし物・希少資源（`g…`）・水たまり・夜露・夜の種子は再出現待ちに積まない。水たまりは拾えない（`rule`）。
- `enter_nest`：入口がふさがれていれば所有者と共同作業者だけ（訪問者は `forbidden`「入口がふさがれている」）。
- `visitors` の返事に `events`（最近の巣の出来事）。

### 9.2 S2C
| t | 中身 |
|---|---|
| `snapshot` | `preds:[PredSnap]` が加わる（10Hz・地上の全員に同じもの） |
| `caught` | `{kind, name, at:{x,y}, x, y, life, inv, drops:[{id, kind, n}], until}`：自分がつかまった。`(x,y)` は戻された所（自分の巣の入口の下か出発点）、`until` までは狙われない（サーバー時刻）。落とし物はみんなに `res_spawn`、ほかの子には `toast`「○○ が キツネ につかまった！」 |
| `raid` | `{nestId, kind:'raid'\|'blocked', lost, at}`：自分の巣の入口をキツネが掘った（所有者がオンラインのとき。留守なら `join_field` の `world.raids` に 1 回だけ） |
| `clock` | `{clock, st}`：dev で天気・季節を変えたとき（clock に `weather`・`season` が入ると固定） |
| `life` | `env:[文字列]`（砂嵐・寒い夜で体調が減っている理由）・`rest:'aestivation'\|'hibernation'`（休眠中）が加わることがある |
| `entrance` | `{entrance:{…, plugged}, moved?, from?}`：引っ越し（`moved`）・ふさいだ／ひらいた（`plugged`） |

```
PredSnap = {id:'p…', kind:'owl'|'fox'|'snake', x, y, z, dir:'left'|'right', state, t, target:アカウント id|null, sx?, sy?, sr?}
  state：fox = roam / alert / chase / lost / toNest / dig / leave、owl = circle / stalk / dive / rise / leave、snake = lurk / rattle / lunge / recover / leave
  sx, sy, sr：フクロウが狙っている地面の影（stalk・dive のとき）。alert / chase / stalk / dive / rattle / lunge で target が自分なら「！」と画面の赤
Land     = {id:'L列-行', name, region, food, danger, hardness, scenery, climate:'mild'|'dry'|'hot'|'cool', rare:'rare_seed'|'pretty_stone'|null}
WorldInit に：raids:[{kind, lost, at}]（留守中の襲撃）、danger:{predators:'normal'|'easy'|'off', env, relocateCooldownMs}、you.nest に land・plugged・relocatedAt
NestRecord に：plugged、land、（所有者に）relocatedAt・relocateCooldownMs
Resource に：n（落とし物の数）、exp（消える時刻）
```
- 天気・季節は時計から計算（`shared/season.js` の `weatherAt`・`seasonOf`）。送るのは時計だけなので、全員の天気がそろう。砂嵐の跳ねる速さ ×0.8 はクライアントの予測（`fieldMods`）とサーバー（`FieldRoom.drain`）で同じ。
- 捕食者はサーバーの `FieldRoom.predTick`（20Hz・1/20 秒）で動き、「つかまった」もサーバーが決める。クライアントは `preds` を 100ms 遅れで補間して描くだけ。
- DB：`migrations/004_danger_land.js`＝`lands.plot`（と `info` に性能）、`nests.plugged / relocated_at / raided_at`、`nest_events(nest_id, kind, data, at, seen)`、`world_resources.qty / expires_at`。今ある巣の土地にも区画と性能を入れる。
- オフライン版（`OfflineBackend`）も同じ API・同じ AI（`net.preds` が `PredatorWorld`）。保存 `tobi_save_v1` の版 3：巣に `plugged`・`land`・`relocatedAt`・`raidedAt`、`events`（襲撃）、落とし物・水たまり・希少資源は `world.resources` に（v2 は読み込み時に移行）。捕食者の強さはメニュー（`tobi_settings.danger`）。

## 10. Ver.0.4「いのちをつなぐ」（追加分。PROTOCOL_VERSION は 1 のまま＝足しただけ）

### 10.1 C2S
| t | 中身 | 返事 | サーバーの検証 |
|---|---|---|---|
| `create_char` | `{name, fur, sex?:'f'\|'m'}` | `{ok, character}` | sex が無い・変なら種から決める。1 代目は若者（3 日）・選んだ毛色を 2 つ持つ遺伝子・体つきはふつう（`founderInd`） |
| `court` | `{wildId}` | `{ok, trust, befriended, name, inv}` | 地上・その野生の子がいる（無ければ `not_found`）・**おとなで体調がよく冬でない**（`courtBlock`。だめなら `rule`＋`shy:true`）・持ち物に種子・30px 以内・同じ子へは 1.2 秒あける。種子 1 つで信頼 +25。100 で `wild {type:'befriend'}` |
| `family` | `{}` | `{ok, family}` | |
| `name_pups` | `{list:[{id, name}]}` | `{ok, family}` | 16 匹まで・名前は `validName`・自分の家の巣にいる子（pup/kin）だけ |
| `feed_pup` | `{id}` | `{ok, inv, member, family}` | 自分の巣の中・持ち物に種子・その子が子ども／若者・満腹でない。0.4 秒あける |
| `mate_again` | `{}` | `{ok, family}` | 自分の巣の中・つれあいがいる・`breedBlock`（下）。`litters` に予定を足す |
| `kids_follow` | `{on}` | `{ok, family, kids}` | 若者（3 匹まで）を地上へ連れて行くか。変わると地上のみんなへ `player_update` |
| `lineage` | `{}` | `{ok, nodes:[Ind], current}` | その家（アカウント）の個体すべて（ご先祖・つれあい・巣立った子も） |
| `succeed` | `{id}` | `{ok, character, family, life, inv, look, kids, retired, left}` | **自分の子（father_id か mother_id がいまの個体）で、若者以上、巣にいる（pup/kin）**だけ（それ以外は `rule`）。古い `characters` を active=0、新しい行（持ち物を写す・位置はそのまま）、前の子とつれあいは role `ancestor`、おとなのきょうだいは `left`、小さいきょうだいは `kin`、もうすぐのお産は取り消し |
| `farewell` | `{}` | `succeed` と同じ | 年寄り（24 日）で育った子がいないときだけ。親せきの若者（`kinOf`）があとをつぐ |
| `dev` | `{age?, wild?, fur?, pied?, ear?, leg?, tail?, size?, trust?, birth?, give?, store?}` | | `TOBI_DEV=1` のときだけ。age＝日を進める、wild＝近くに出す（形質を指定できる）、give／store＝持ち物・倉庫へ足す |

- **巣へ迎える**：`enter_nest` で自分の巣へ入るとき、ついてきている野生の子（90px 以内）がいれば `breedBlock`（おとな・体調 50／空腹 35／水分 35 以上・冬でない・寝床の部屋・倉庫の種子 10 以上・前のお産から 2 日・小さい子 10 匹未満・家族 16 匹未満）を確かめる。返事に `invite:{ok, name, mate?|reason?}`。だめなら野生の子は外で待つ。前のつれあいがいれば `left`（旅に出た）。
- **お産**：`litters` の行（`due_play`＝親の ageMs で世界の半日後）。親が遊んでいる間の `lifeTick` で年齢が `due_play` をこえ、冬でなければ、`makeLitter`（種＝両親の id・何回目か・アカウント）で 2〜6 匹（春 3〜6・夏 2〜5・秋 2〜4）。冬は春まで待つ（`family` に `{type:'wait'}`）。子は `individuals`（role `pup`・nest_id・father_id・mother_id・generation）。
- **年齢**：`individuals.status.ageMs`（遊んだ世界の ms）。地上か巣の中にいる間だけ進む（ログアウト中・タイトルでは進まない）。家族も同じ。30 秒ごと・切断・ログアウト・交代のときに保存。
- **移動**：形質の倍率（`traitMoveMods`：脚 → 跳ねる速さ・大ジャンプの距離、尾 → 大ジャンプの待ち。どれも ±10% まで）を `stepField` の mods へ。クライアントの予測も `family.me.traits` で同じ。

### 10.2 S2C
| t | 中身 |
|---|---|
| `snapshot` | `wild:[WildSnap]`（全員同じ）・`wt:{wildId: 信頼}`（その子から見た 0〜100） |
| `family` | `{family, events:[…]}`：4 秒ごと＋変わったとき。events = `born {pups:[Ind], mother, father, seed, season}`・`stage {id, name, stage}`・`hungry {id, name}`・`me {crossed:'adult'\|'elder'\|'lifespan'}`・`lifespan`（30 日をすぎて世界の 1 日に 1 回）・`wait`・`mate {name}` |
| `player_update` | `{player:{id, name, fur, look, kids}}`：世代交代・連れている若者が変わった（地上のみんなへ） |
| `wild` | `{type:'befriend'\|'lost'\|'startle', id, name}`（本人へ） |

```
Ind       = {id, name, sex, generation, father_id, mother_id, traits, role, ageMs, stage:'pup'|'young'|'adult'|'elder', fed, named, retiredAt?, kinOf?}
Family    = {me:Ind, members:[Ind]（つれあい・子・きょうだい）, pending:{mateId, dueIn, wait}|null, litters, follow, heirs:[id], cooldown}
WildSnap  = {id, name, x, y, z, dir, anim, jump?, look, fol（ついていく相手のアカウント id）, mood:'wander'|'curious'|'flee'|'follow'}
look      = {fur, tint, pied, tuft, ear, leg, tail, size（−2〜2 の整数）, pup?, young?, ps（斑の模様の種）}
```
- `join_field` の world に `family`、`you`・`players[]` に `look`・`kids:[{id, name, look}]`。`enter_nest` の NestRecord に `family:[Ind]`（訪問者にも。所有者が留守なら DB から）。`nest_peers` に `look`。
- DB：`migrations/005_family.js`＝`individuals.account_id / role / nest_id`、`litters(account_id, nest_id, mother_id, father_id, nth, seed, season, conceived_at, due_play, born_at, size)`、既存の個体は 1 代目のおとな（4 日）に。
- オフライン版も同じ API（野生の子はブラウザの中の `WildWorld`）。保存 `tobi_save_v1` は版 4：`house`（Household）・`lineage`（ご先祖・巣立った子）・`nextInd`。v3 は読み込み時に移行。

## 11. Ver.0.5「広がり」（追加分。PROTOCOL_VERSION は 1 のまま＝足しただけ）

### 11.1 C2S
| t | 中身 | 返事 | サーバーの検証 |
|---|---|---|---|
| `travel` | `{to}` | `{ok, world}`（行き先の WorldInit） | 地上にいる・`to` が開いた土地（plains/rocks/dunes/canyon）で、**いる土地のその方向の出口の中**（足元が出口の帯に入っている）・前の旅から 1.5 秒。富山へは `travel` では行けない（`rule`） |
| `enter_gate` | `{}` | `{ok, world}` | 谷にいて穴が開いている（`gateOpen`：夜。まだたどり着いていない子は さらに冬・雪・しるし 3 つ）・穴から 20px 以内。富山では「来た穴」から谷の奥へ |
| `collection` | `{}` | `{ok, owned:{cid: at}, achievements:{id: at}, stats:{regions, seasons, visited}}` | |
| `ranking` | `{}` | Ver.0.6 からは `nest_tour` と同じ返事（§12） | Ver.0.5 では豊かな巣の上位 10。Ver.0.6 で順位・点数をやめた（前の版のクライアントのための別名） |
| `residents` | `{}` | `{ok, ...ResidentsInfo}` | |
| `resident_invite` | `{name}` | 同上 | 自分の巣がある・相手はフレンド・住人＋誘い中が 3 未満 |
| `resident_answer` | `{nestId, ok}` | 同上 | 誘われている。住むならほかの巣に住んでいない |
| `resident_leave` | `{}` | 同上 | |
| `resident_remove` | `{id}` | 同上 | 所有者だけ |
| `dev` | `{gate?, region?, x?, y?, curio?, collect?, achieve?}` | | `TOBI_DEV=1` のときだけ |

- `pick` は収集品（kind `curio`）にも使う。持ち物は使わず `account_collectibles` へ（先着 1 人。もう持っている子は `rule`）。
- 巣の `op {op:'place', type:'curio', item}`：図鑑にある品だけ・同じ巣に 1 つ。ごほうびの家具は実績が要る（`ctx.unlocks`）。
- 住人（role `resident`）は `enter_nest`（非公開・ふさいでいても）・`op`・`store`・`eat`・`sleep`・`plug` ができる。

### 11.2 S2C
| t | 中身 |
|---|---|
| `snapshot` | `gate:{x, y, back?}\|null`（その子に開いている穴。本人にだけ） |
| `player_leave` | `why:'travel'`（ほかの土地へ旅立った） |
| `collect` | `{cid, at, total}`（図鑑に加わった・本人へ） |
| `achievement` | `{id, at, reward?}`（本人へ） |
| `residents` | `{...ResidentsInfo, text?}`（誘われた・住人が変わった） |

```
WorldInit += {region, regions:[{id, name}], visited:[region]}   // 地図は region と種から両側で作る（送らない）
Resource  += {kind:'curio', cid}                                 // 収集品
NestRecord += {region, home, residents:[{id, name}]}
ResidentsInfo = {mine:{nestId, residents:[{id,name}], invites:[{id,name}]}|null,
                 home:{nestId, owner, ownerName, region, x, y, others:[{id,name}]}|null,
                 invites:[{nestId, owner, ownerName, region}], max:3}
```
- 部屋は土地ごと（`FieldRoom`）。スナップショット・チャット・入口・採集物・捕食者・野生の子はいる土地の部屋のものだけ。
- DB：`migrations/006_regions_collect.js`＝`lands.field_id`・`world_resources.field_id`・`characters.region`・`achievements(account_id, key, got_at)`・`regions` の行・`collectibles` の行（`syncCollectibles`）。
- オフライン版も同じ API（共同巣は「オンラインで使えます」→ Ver.0.6 で NPC の住人。ランキングは Ver.0.6 で巣めぐりに）。保存は版 5：`region`・`collection`・`achievements`・`flags`。v4 は読み込み時に移行。

## 12. Ver.0.6「くらしの深まり＋公開準備」（追加分。PROTOCOL_VERSION は 1 のまま＝足しただけ）

### 12.1 C2S
| t | 中身 | 返事 | サーバーの検証 |
|---|---|---|---|
| `family_pet` | `{id}` | `{ok, member, life, family, cond}` | 自分の家の巣（自分の巣・住んでいる共同巣）の中・眠っていない・id は整数・その家の巣にいる家族（つれあい・子・きょうだい・なかま）・1 匹ごとに 90 秒あける（`rate`）。体調 +4（100 まで）。なでた時刻は `individuals.status.pettedAt` |
| `nest_tour` | `{}` | `{ok, tour:true, list:[{nestId, name, region, desc, rooms, decor, curios, recent, policy, friend, x, y}], count}` | **巣めぐり**：その子が入れる巣（`canVisit`：公開・フレンドだけ公開でフレンド・許可リスト。ふさいだ入口は出ない）から、最近 24 時間に手を入れた巣を 2 つまで＋残りを「その子 × 10 分の枠」の種で混ぜて 6 つまで。自分の巣・住んでいる共同巣は出ない。**順位・点数は返さない** |
| `ranking` | `{}` | `nest_tour` と同じ | 前の版（0.5）のクライアントのための別名 |
| `dev` | `+= {family:{mate, pups, young, friend}, species:'longear'}` | | `TOBI_DEV=1` のときだけ。家族をすぐに作る・`{wild:1, species:'longear'}` でミミナガトビネズミを出す |

- `court`（種子をあげる）：相手がミミナガトビネズミ（`sp:'longear'`）なら、つれあいの条件（`courtBlock`）ではなく **なかまの条件**（`friendBlock`：子どもでない・なかまが 2 匹未満）で信頼が増える（0.75 倍）。
- `enter_nest`（自分の巣へ）の `invite`：なかよしがほかの種なら `{ok, friend:true, species, mate:Ind, note}`（つれあい・お産の予定は作らない＝種の壁）。

### 12.2 S2C
| t | 中身 |
|---|---|
| `snapshot` | `players[]` の行に `k:[[x, y], …]`（その子についてくる若者の位置：サーバーが確定位置の足あとから決める・`shared/follow.js`）・`kh:1`（捕食者が 150px 以内で巣へかくれている）。若者がいない子の行には無い。本人の `you` には入れない（自分の画面は予測の位置で同じ計算） |
| `family` | `events` に `{type:'friend', name, species}`（なかまが巣に住むことになった） |
| `wild` | スナップショットの `wild[]` に `sp:'longear'`（近縁種のときだけ） |

```
Ind += {species?:'longear', pettedAt?, wild?}      // role に 'friend'（ほかの種のなかま：巣に住む・家系図には入らない）
NestRecord.family[] は Ind + {acct}                // 巣の家族（所有者と住人の家族）。しぐさ（shared/family-life.js）の入力
```

- **家族のしぐさ・ひとことは通信しない**：巣の id ＋ サーバーの時計（`serverTime`）＋ 個体の id ＋ 巣データの部屋 ＋ 家族の一覧（`enter_nest` で届く）＋ 親の位置（`nest_peers`）から、どの画面でも同じに決まる（`familyScene` / `familyBubble`）。部屋を移るときだけ「ひょっこり」現れる。
- **地上の若者**：オンラインでは、ほかの子の若者を `k` のとおりに（Interp で補間して）描く。オフライン・自分の若者は同じ `kidSpots` を手元で。
- オフライン版も同じ API：`petFamily(id)`・`nestTour()`（NPC の巣：モカ・フレンドならリコ）。共同巣は **NPC の住人**（`residentInvite('ナッツ')` など：フレンド・自分の巣・3 匹まで。すぐに返事。`residentRemove('npc_nuts')`）。住人の NPC は夜に倉庫へ種子を持ってくる（通知 `npc_gift {id, name, n, storage, nestId}` と `toast`）。保存は版 6：`npcResidents`・家族の `species` / `pettedAt`。v5 は読み込み時に移行。

### 12.3 HTTP・WebSocket の入口（公開準備）
| 道 | 返事 |
|---|---|
| `GET /healthz` | `{ok, v:'0.6', uptime, players, sessions}`（止めている途中は 503・`ok:false`）。許可リストの Origin には CORS |
| `GET /statsz` | `Authorization: Bearer <TOBI_STATS_TOKEN>` のときだけ：くわしい数字＋`limiter`・`rejected`。ほかは 404 |
| `GET /tobi-server.json` | `{ws: TOBI_PUBLIC_WS || '/ws', name, v}`（許可リストの Origin には CORS） |
| `GET /ws`（Upgrade） | Origin が許可リストの外・`null` → **403**／接続元の同時接続・接続の速さを超える → **429**／止めている途中 → 503。つないだあと接続元のメッセージの速さを超えると `kick` → 1008 |

- 止めるとき（SIGTERM）：全員に `toast`「サーバーを再起動します」→ 保存 → 1012 で切る（クライアントは自動でつながりなおす）。
- 環境変数と手順は DEPLOY.md。

## 13. Ver.0.7「小さなできごと」（追加分。PROTOCOL_VERSION は 1 のまま＝足しただけ）

### 13.1 C2S
| t | 中身 | 返事 | サーバーの検証 |
|---|---|---|---|
| `companion` | `{id}`（`null` で巣で待つ） | `{ok, family, kids, swapped}` | id は整数か null・その家の role `friend`（なかま）だけ。**1 匹だけ**（別の子なら入れかわり、前の子の id を `swapped`）。家の印 `individuals.status.house.companion` に保存し、地上のみんなへ `player_update`（`kids` に入る） |
| `toyama_event` | `{id}`（`board` / `train` / `footprints` / `white_near`） | `{ok, id, first, seen:{id: 時刻}}` | 地上・富山の部屋・`toyamaEventBlock`（shared/toyama.js）：`board` 夏・夜・光る板から 40px／`train` 世界の時刻 4:44〜4:58／`footprints` 冬・途切れた所から 26px／`white_near` 夜・図鑑に crossover 6 つ。見たことがあれば `{ok:true, first:false}`（二度は起きない）。記録は `account_flags` の `tev:<id>`（`INSERT OR IGNORE`） |
| `dev` | `+= {hour, tevReset}` | | `TOBI_DEV=1` のときだけ。時計をその時刻へ（全員）・富山の出来事の記録を消す |

### 13.2 S2C・データの形
| t | 中身 |
|---|---|
| `snapshot` | 行の `k`・`kh` は「若者（3 匹まで）→ なかま（1 匹）」の順の位置（Ver.0.6 と同じ計算・同じ形） |
| `player_join` / `player_update` / `you` | `kids[]` に なかまの行 `{id, name, comp:1, sp:'longear', look}`（若者は `{id, name, look}`） |
| `join_field` などの `world.collection` | `+= {tev:{id: 時刻}}`（見た富山の出来事） |
| `enter_nest` の `nest` | `+= {tales:{toyama, companion}}`：所有者が富山へ行ったことがあるか・地上へ連れて行く なかまの id。**家族のやりとりの文脈**（訪問者にも同じものを送る） |

```
Family（out）+= {companion: id|null}
NestRecord  += {tales: {toyama: bool, companion: id|null}}
```

- **家族どうしの短いやりとりは通信しない**：巣の id ＋ サーバーの時計 ＋ 個体の id ＋ 巣の部屋 ＋ 家族の一覧 ＋ 巣の倉庫 ＋ `tales` から、どの画面でも同じに決まる（`talkInSlot` / `familyTalk`。親の位置は使わない）。
- オフライン版も同じ API：`setCompanion(id)`・`toyamaEvent(id)`。保存は版 7：`toyamaEvents`・`house.companion`。v6 は読み込み時に移行。
- `/healthz` の `v` は `'0.7'`。

## 14. Ver.0.8「季節のたのしみ」（追加分。PROTOCOL_VERSION は 1 のまま＝足しただけ）

### 14.1 C2S
| t | 中身 | 返事 | サーバーの検証 |
|---|---|---|---|
| `fest_act` | `{act}`（`plant` / `gaze` / `offer` / `lantern`） | `{ok, mark, inv, reward, fest:{id, occ}}` | 地上・0.8 秒に 1 回（`rate`）。入力を当ててから確定位置で `festActBlock`（shared/festival.js）：行事の夜（世界の時計）・いまの行事の act・富山でない・場所（巣のそば 10〜56px／広場 80px・オアシスの南 40px・丘で `stillT` 2 秒以上）・費用（種子 1／草 1）。1 回の行事に 1 回（`fest_marks` の UNIQUE）。印をその土地のみんなへ `fest`、はじめての行事なら図鑑の品（`account_collectibles`・`collect` の通知） |
| `dev` | `+= {fest:'on'\|'off'\|null, festReset}` | | `TOBI_DEV=1` のときだけ。時計に `fest`（いつでも行事の夜／無し：全員へ `clock`）・自分の印と行事の品を消す |

### 14.2 S2C・データの形
| t | 中身 |
|---|---|
| `fest` | `{mark}`（その土地の子へ：だれかが参加した） |
| `join_field` などの world | `+= {fest:{marks:[Mark]}}`（その土地の いまの回の印） |
| `enter_nest` の `nest.tales` | `+= {fest: bool}`（所有者が この季節の行事に参加した：家族のやりとりの文脈・訪問者にも同じ） |
| `clock` | `+= {fest?}`（開発用） |

```
Mark = {kind:'plant'|'gaze'|'offer'|'lantern', fest:'hana'|'hoshi'|'tsuki'|'akari', occ, region, x, y, owner, name, v(0..3), at}
```
- **行事の日程は送らない**：世界の時計（`clock`）から `festivalAt` で どの画面でも同じに決まる。印はその季節（同じ `occ`）のあいだだけ描く。流れ星・きらきら・月の明るさ・富山の小さな物も 時計と位置から決まる（通信なし）。
- **順位・点数・数は送らない**（月見の山も印の数から大きさ 1〜4 で描くだけ）。
- オフライン版も同じ API：`festAct(act)`・通知 `fest`（NPC の印も）。保存は版 8：`fest.marks`。v7 は読み込み時に移行。
- DB：`migrations/008_festival.js`（`fest_marks`）。`/healthz` の `v` は `'0.8'`。
