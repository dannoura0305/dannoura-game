// tobinezumi/shared/protocol.js — クライアント⇄サーバーのメッセージ（WebSocket＋JSON）。DOM なし。
// 詳しい説明・例は tobinezumi/docs/PROTOCOL.md。
//
// 1 メッセージ = 1 つの JSON オブジェクト {t:"型", ...}。
// 返事が要る要求には rid（クライアントが付ける連番）を付け、サーバーは同じ rid で {t:"res", rid, ok, ...} を返す。
// サーバーから勝手に来る通知（他人の移動・チャット・採集物の消失など）には rid が無い。

export const PROTOCOL_VERSION = 1;
export const SERVER_TICK_HZ = 20;        // サーバーのシミュレーション
export const SNAPSHOT_HZ = 10;           // 位置のスナップショット配信
export const INPUT_SEND_MS = 50;         // クライアントが入力をまとめて送る間隔
export const INTERP_DELAY_MS = 100;      // 他人は 100ms 遅れで補間表示
export const POS_SAVE_MS = 30000;        // 位置の保存間隔
export const RECONNECT_GRACE_MS = 60000; // これ以内の再接続なら同じ位置へ
export const CHAT_MAX = 80;
export const NAME_MIN = 1, NAME_MAX = 10;
export const USER_MIN = 3, USER_MAX = 16, PASS_MIN = 8;
export const FUR_IDS = ['sand', 'cream', 'rufous', 'graybrown', 'white'];   // assets/manifest.json の fur.order と同じ
export const VISIT_POLICIES = ['private', 'friends', 'list', 'public'];   // friends は Ver.0.2
export const MAX_FRIENDS = 50, MAX_BUILDERS = 10;
export const FRIEND_OPS_PER_MIN = 12;     // フレンド申請・承認・削除の回数（1 分あたり）

// クライアント → サーバー
export const C2S = {
  HELLO: 'hello',             // {v, token?}                         → res {ok, account?, character?}
  REGISTER: 'register',       // {username, password}                → res {ok, token, account}
  LOGIN: 'login',             // {username, password}                → res {ok, token, account, character?}
  LOGOUT: 'logout',           // {}
  CREATE_CHAR: 'create_char', // {name, fur}                          → res {ok, character}
  JOIN_FIELD: 'join_field',   // {}                                   → res {ok, world}（WorldInit）
  INPUT: 'input',             // {inputs:[{seq, mx, my, jump}]}       （返事なし。snapshot の ack で確認）
  PICKUP: 'pickup',           // {resId}                              → res {ok, item?, inv?, reason?}
  DIG_BURROW: 'dig_burrow',   // {x, y}                               → res {ok, entrance?, reason?}
  ENTER_NEST: 'enter_nest',   // {owner}（アカウント id）              → res {ok, nest?, reason?}
  LEAVE_NEST: 'leave_nest',   // {}                                   → res {ok, x, y}
  NEST_OP: 'nest_op',         // {nestId, rev, op}                    → res {ok, rev, data?, inv?, reason?, created?}
  NEST_MOVE: 'nest_move',     // {x, y, facing, anim}                 巣の中の位置（訪問者どうしで見える）
  STORE: 'store',             // {nestId, dir:'deposit'|'withdraw', item, n} → res {ok, inv, storage}
  CHAT: 'chat',               // {text}
  INV_MOVE: 'inv_move',       // {from, to}  持ち物の並べ替え     → res {ok, inv}
  VISIT_POLICY: 'visit_policy', // {policy, list?:[name]}            → res {ok}
  PING: 'ping',               // {ct}                                 → pong {ct, st}
  // ── Ver.0.2「暮らし」──
  EAT: 'eat',                 // {from:'inv'|'pile'}                  → res {ok, life, inv, storage?}
  DRINK: 'drink',             // {resId?}（夜露なら id、無ければ水場） → res {ok, life, src}
  SLEEP: 'sleep',             // {}（巣の寝床の上で）                 → res {ok, life}
  WAKE: 'wake',               // {}                                   → res {ok, life}
  FRIENDS: 'friends',         // {}                                   → res {ok, list:[Friend]}
  FRIEND_REQ: 'friend_req',   // {name}                               → res {ok, state, list}
  FRIEND_OK: 'friend_ok',     // {id}                                 → res {ok, list}
  FRIEND_DEL: 'friend_del',   // {id}（断る・取り消す・やめる）       → res {ok, list}
  SET_BUILDERS: 'set_builders', // {list:[name]}                       → res {ok, list, unknown}
  VISITORS: 'visitors',       // {}                                   → res {ok, list:[{name, at}]}
  // ── Ver.0.3「危険と土地」──
  SURVEY: 'survey',           // {}（いる場所の土地を調べる）          → res {ok, land, here:{canDig, reason?, digCost, digTime, relocateCost, cooldownMs, nests}}
  RELOCATE: 'relocate',       // {}（いる場所へ巣を引っ越す）          → res {ok, entrance, inv, cost, land}
  PLUG: 'plug',               // {on}（巣の中から入口をふさぐ・ひらく）→ res {ok, plugged, inv}
  DEV: 'dev',                 // {weather?, season?, spawn?, age?, wild?, trust?, birth?}  開発用（TOBI_DEV=1 のときだけ）→ res {ok}
  // ── Ver.0.4「いのちをつなぐ」──
  COURT: 'court',             // {wildId}（野生の子に種子をあげる）     → res {ok, trust, befriended, inv, name}
  FAMILY: 'family',           // {}                                   → res {ok, family}
  NAME_PUPS: 'name_pups',     // {list:[{id, name}]}                   → res {ok, family}
  FEED_PUP: 'feed_pup',       // {id}（持ち物の種子を 1 つ）            → res {ok, inv, family}
  MATE_AGAIN: 'mate_again',   // {}（巣の中・つれあいと）               → res {ok, family}
  KIDS_FOLLOW: 'kids_follow', // {on}（若者を地上へ連れて行く）         → res {ok, family}
  LINEAGE: 'lineage',         // {}                                   → res {ok, nodes:[Ind], current}
  SUCCEED: 'succeed',         // {id}（育った自分の子へ世代交代）       → res {ok, character, family, life, inv}
  FAREWELL: 'farewell',       // {}（子がいない年寄りの旅立ち）         → res {ok, character, family, life, inv}
  // ── Ver.0.5「広がり」──（PROTOCOL.md §11）
  TRAVEL: 'travel',           // {to}（地図の端の出口からとなりの土地へ）  → res {ok, world}（行き先の WorldInit）
  ENTER_GATE: 'enter_gate',   // {}（谷の奥の不思議な穴／富山の来た穴）  → res {ok, world}
  COLLECTION: 'collection',   // {}                                   → res {ok, owned:{id: at}, achievements:{id: at}, stats}
  RANKING: 'ranking',         // Ver.0.5 の「豊かな巣」。Ver.0.6 からは NEST_TOUR と同じ返事（前の版のクライアントのための別名）
  RESIDENTS: 'residents',     // {}（共同巣の様子）                     → res {ok, ...ResidentsInfo}
  RESIDENT_INVITE: 'resident_invite', // {name}（フレンドを自分の巣の住人に誘う） → res {ok, ...ResidentsInfo}
  RESIDENT_ANSWER: 'resident_answer', // {nestId, ok}（誘いに答える）     → res {ok, ...ResidentsInfo}
  RESIDENT_LEAVE: 'resident_leave',   // {}（住んでいる巣を出る）         → res {ok, ...ResidentsInfo}
  RESIDENT_REMOVE: 'resident_remove', // {id}（所有者が住人・誘いを外す） → res {ok, ...ResidentsInfo}
  // ── Ver.0.6「くらしの深まり＋公開準備」──（PROTOCOL.md §12）
  NEST_TOUR: 'nest_tour',     // {}（巣めぐり：入れる巣の紹介。順位・点数なし）→ res {ok, list:[{nestId, name, region, desc, rooms, decor, curios, recent, x, y}], count}
  FAMILY_PET: 'family_pet',   // {id}（巣の家族をなでる）               → res {ok, member, life, family, cond}
  // ── Ver.0.7「小さなできごと」──（PROTOCOL.md §13）
  COMPANION: 'companion',     // {id|null}（なかまを地上へ連れて行く・巣で待つ。1 匹だけ）→ res {ok, family, kids}
  TOYAMA_EVENT: 'toyama_event', // {id}（富山の小さな出来事を見た：1 回だけ）→ res {ok, id, first, seen}
};

// サーバー → クライアント
export const S2C = {
  RES: 'res',                 // {rid, ok, ...}
  WELCOME: 'welcome',         // {v, serverTime}
  SNAPSHOT: 'snapshot',       // {st, ack, you:{x,y,z,dir,anim,cd,jump}, players:[PlayerSnap]}
  PLAYER_JOIN: 'player_join', // {player:{id, name, fur, x, y}}
  PLAYER_LEAVE: 'player_leave', // {id}
  CHAT: 'chat',               // {from, name, text, where:'field'|'nest', at}
  RES_GONE: 'res_gone',       // {id, by}
  RES_SPAWN: 'res_spawn',     // {res:{id, kind, x, y}}
  NEST_UPDATE: 'nest_update', // {nestId, rev, op, data}               同じ巣にいる人へ
  NEST_PEERS: 'nest_peers',   // {nestId, peers:[{id,name,fur,x,y,facing,anim}]}
  ENTRANCE: 'entrance',       // {entrance:{owner, name, x, y}}        新しい巣穴
  TOAST: 'toast',             // {text}
  KICK: 'kick',               // {reason}
  PONG: 'pong',               // {ct, st}
  // ── Ver.0.2 ──
  LIFE: 'life',               // {life:{hunger, thirst, cond, sleep}}  自分の暮らしの数値（2 秒ごと・変わったとき）
  CLOCK: 'clock',             // {clock:{scale, origin, base}, st}      世界の時計（接続直後・変わったとき）
  FRIENDS: 'friends',         // {list:[Friend]}                       フレンドの一覧が変わった（申請が来た・承認・オンライン/オフライン）
  VISIT: 'visit',             // {name, nestId, at}                    自分の巣にだれかが入った（所有者がオンラインのとき）
  NEST_ROLE: 'nest_role',     // {nestId, canEdit, role}               いる巣での役割が変わった（共同作業者にされた・外された）
  // ── Ver.0.3 ──（snapshot には preds:[PredSnap] が加わる）
  CAUGHT: 'caught',           // {kind, x, y, life, inv, drops:[{id,n}], until}  捕食者につかまった（本人だけ）
  RAID: 'raid',               // {nestId, kind:'raid'|'blocked', lost, at}       自分の巣がキツネに掘られた（所有者がオンラインのとき）
  // ── Ver.0.4 ──（snapshot には wild:[WildSnap]・wt:{wildId: 信頼} が加わる。PlayerSnap の入口・名札に look・kids）
  FAMILY: 'family',           // {family, events?:[…]}                  家族が変わった（生まれた・育った・おなかがすいた・寿命の目安）
  PLAYER_UPDATE: 'player_update', // {player:{id, name, fur, look, kids}}  世代交代・連れている若者が変わった（地上のみんなへ）
  WILD: 'wild',               // {type:'befriend'|'lost'|'startle', id, name}  野生の子との出来事（本人へ）
  // ── Ver.0.5 ──（snapshot には gate:{x,y}|null（その子に見える不思議な穴）が加わる）
  COLLECT: 'collect',         // {cid, at, total}                       図鑑に加わった（本人へ）
  ACHIEVEMENT: 'achievement', // {id, at, reward?}                      実績をとった（本人へ）
  RESIDENTS: 'residents',     // {...ResidentsInfo, text?}             共同巣の誘い・住人が変わった（本人へ）
};
// Ver.0.6：snapshot の PlayerSnap に k:[[x,y],…]（ついてくる若者の位置：サーバーが足あとから決める）・kh:1（巣へかくれている）
export const MAX_RESIDENTS = 3;      // 共同巣：所有者のほかに住める子（Ver.0.5）
export const TRAVEL_GAP_MS = 1500;   // 旅の間隔
export const PLUG_COST = { pebble: 2 };     // 入口をふさぐ（ひらくと小石 1 つ戻る）
export const SEXES = ['f', 'm'];     // Ver.0.4：個体の性（家系図の父・母）
export const SURVEY_GAP_MS = 1000, PLUG_GAP_MS = 1000;

export const ERR = {
  BAD_REQUEST: 'bad_request', AUTH: 'auth', TAKEN: 'taken', NOT_FOUND: 'not_found',
  TOO_FAR: 'too_far', FULL: 'full', FORBIDDEN: 'forbidden', STALE_REV: 'stale_rev', RATE: 'rate', RULE: 'rule',
};

/** PlayerSnap：{id, x, y, z, dir, anim, jump?:{t,dur,x0,y0,x1,y1}} */
export function encode(msg) { return JSON.stringify(msg); }
export function decode(text) {
  try { const m = JSON.parse(text); return m && typeof m.t === 'string' ? m : null; } catch (e) { return null; }
}

/** チャット本文の整形（長さ・制御文字） */
export function cleanChat(text) {
  return String(text == null ? '' : text).replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, CHAT_MAX);
}
export function validName(name) {
  const n = String(name || '').trim();
  if (n.length < NAME_MIN) return 'なまえを入れてね';
  if (n.length > NAME_MAX) return `なまえは ${NAME_MAX} 文字まで`;
  if (/[\u0000-\u001f<>]/.test(n)) return '使えない文字がある';
  return null;
}
export function validUsername(u) {
  const s = String(u || '');
  if (s.length < USER_MIN || s.length > USER_MAX) return `ユーザー名は ${USER_MIN}〜${USER_MAX} 文字`;
  if (!/^[A-Za-z0-9_\-]+$/.test(s)) return 'ユーザー名は英数字と _ - だけ';
  return null;
}
export function validPassword(p) {
  return String(p || '').length < PASS_MIN ? `パスワードは ${PASS_MIN} 文字以上` : null;
}
