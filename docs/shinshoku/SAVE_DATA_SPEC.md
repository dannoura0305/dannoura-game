# SAVE_DATA_SPEC — セーブの形・版・移行

状態：**提案**。既存のキー（`dannoura_*`・`kyokai_*`・`tobi_*`）には**書かない**（PROJECT_AUDIT §7）。

## 1. 本作のキー
| キー | 中身 |
|---|---|
| `shinshoku_save_v1` | 本作のセーブ（下記。枠：auto・slot1〜3・branch） |
| `shinshoku_settings` | 設定（音量・難しさ・一閃の手助け・入力の割り当て・画質・字幕の大きさ） |
| `wakaba_progress_v1` | 作品をまたぐ共通の進行（本作は `games.shinshoku` だけを書く） |
- 1キーに枠をまとめる（`dannoura_save_slot1..3` のように分けない）理由：枠の一覧表示で1回読むだけで済む・移行を1か所で行える。大きさが心配なら枠ごとに分ける（`shinshoku_save_v1:slot1`）案に切り替えられるよう、読み書きは `save.js` に閉じ込める。
- 1枠の目安：30KB 以下（資料は ID だけ持つ。本文はデータ側）。

## 2. 本作のセーブ（`shinshoku_save_v1`）
```json
{
  "ver": 1,
  "gameVer": "0.1.0",
  "slots": {
    "auto":   { "...": "下の slot と同じ形" },
    "slot1":  null,
    "slot2":  null,
    "slot3":  null,
    "branch": { "...": "第4章の分岐前（上書き不可。ROUTE_BRANCH_SPEC §1）" }
  }
}
```
1つの枠（slot）：
```json
{
  "savedAt": "2026-10-14T12:00:00.000Z",
  "playSec": 5421,
  "place": { "area": "shotengai", "state": "outbreak", "spawn": "save_sento", "pos": [12.3, 0, -4.1], "yaw": 1.57 },
  "difficulty": "normal",
  "story": {
    "chapter": "ch02", "step": "hospital_records",
    "route": null, "routeLock": null,
    "reveal": { "companionKnows": false, "firstWhiteAt": null },
    "forms": { "whiteFree": false, "giantSeen": false },
    "flags": { "cs00_lights": true, "safe_opened": true },
    "trust": { "companion": 58 },
    "resolutions": { "kiro": { "rescue": 2, "neutralize": 0, "escape": 1, "kill": 3 } },
    "docs": ["doc_cctv_0217", "doc_shelter_roster"],
    "subquests": { "sq_vending": "done", "sq_missing42": { "found": 17 } },
    "bosses": { "tsugihagi": { "tries": 2, "won": false, "bestSec": null } },
    "yokaiLog": [],
    "branchLog": []
  },
  "player": {
    "hp": 82, "hpMax": 100, "yoki": 0,
    "weapons": { "pipe": { "lv": 1 }, "katana": { "lv": 2 }, "handgun": { "lv": 1, "mag": 9 }, "matchlock": null },
    "ammo": { "handgun": 61 },
    "equipSlot": ["katana", "handgun"],
    "items": [{ "id": "medkit_s", "n": 2 }, { "id": "key_er", "n": 1 }],
    "storage": { "home": [{ "id": "ammo_box", "n": 1 }], "office": [] },
    "skills": ["mikiri_1"], "skillPts": 1
  },
  "world": {
    "areas": { "shotengai": { "visited": true, "state": "outbreak", "opened": ["door_alley"], "picked": ["it_ammo_03"] } },
    "enemies": { "shotengai": { "kiro_02": "rescued", "kiro_03": "dead" } }
  },
  "seed": 918273
}
```
- `weapons` の `matchlock` は金庫の奥から出るまで null（WEAPON_SYSTEM_SPEC §1）。
- `world.enemies` は区画ごとに「その個体の決着」を持つ（再び出るかどうか）。
- 本作の結末の記録は `wakaba_progress_v1.games.shinshoku.endings`（下記）に置き、枠を消しても残る（本編の `dannoura_endings` と同じ考え）。

## 3. 共通の進行（`wakaba_progress_v1`）
```json
{
  "ver": 1,
  "updatedAt": "2026-10-14T12:00:00.000Z",
  "games": {
    "shinshoku": {
      "ver": 1,
      "endings": { "end_reveal": { "firstAt": "…", "count": 1 }, "end_secret": null },
      "chaptersCleared": ["ch00", "ch01", "ch02", "ch03", "ch04", "ch05A"],
      "routesCleared": ["reveal"],
      "achievements": { "first_issen": "…", "rescue_all_heiten": "…" },
      "gallery": ["g_opening", "g_both_routes"],
      "openingsSeen": ["op_default"],
      "bestiary": { "kiro": { "seen": true, "rescued": 4, "killed": 2 } },
      "bossLog": { "tsugihagi": { "won": true, "bestSec": 212, "noHit": false } },
      "docsRead": 41
    }
  }
}
```
- **既存3作の欄（`main`・`kyokai`・`tobi`）は保存しない**。`WP.read()` が呼ばれるたびにアダプタ（CROSS_GAME_LINK_SPEC §2）で作って足す＝**読み取り専用**の見かけ：
```json
"games": {
  "main":  { "readonly": true, "endings": ["father", "normal"], "whiteSeen": true, "cleared": true },
  "kyokai": { "readonly": true, "endings": ["A", "TRUE"], "trueEnd": true, "flags": { "b30_read": true } },
  "tobi":  { "readonly": true, "offline": true, "toyama": false, "crossover": [] }
}
```
- 将来、他作品が自分の欄を書くようになったら（承認後）、`readonly` を外し、アダプタは「欄があればそれ、無ければ既存キーから」の順で読む。

## 4. 共通の仕組みの一覧（企画書の項目 → 置き場所）
| 項目 | 置き場所 |
|---|---|
| 進行・章 | slot.story.chapter/step、progress.chaptersCleared |
| ルート・正体の状態 | slot.story.route/routeLock/reveal |
| 妖力の使用記録 | slot.story.yokaiLog |
| 持ち物・保管箱 | slot.player.items/storage |
| 武器・技 | slot.player.weapons/skills |
| 信頼 | slot.story.trust |
| 寄り道 | slot.story.subquests |
| ボスの記録 | slot.story.bosses（その周）、progress.bossLog（全体） |
| 資料 | slot.story.docs、progress.docsRead |
| 本編の結末の印 | アダプタ `main.endings()`（保存しない） |
| 他作品の実績 | アダプタ（保存しない） |
| オープニング・ギャラリーの解放 | progress.openingsSeen/gallery ＋ 解放表（data/unlocks.js）で毎回判定 |
| セーブの版と移行 | 下記 §5 |

## 5. 版と移行
- どのオブジェクトにも `ver`。読み込み時に `migrate.js` が `ver` を1つずつ上げる関数を順に通す：
```js
const STEPS = {
  1: s => s,                                   // 初版
  // 2: s => { s.slots.auto.player.yoki ??= 0; return s; },  // 例：項目を足す
};
export function migrate(raw) {
  let s = JSON.parse(raw);
  while (s.ver < CURRENT) { s = STEPS[s.ver + 1](s); s.ver++; }
  return s;
}
```
- 移行の決まり（既存の `dannoura_save_v1` → スロットへの移行と同じ考え）：
  1. 移行後に**書けたことを確かめてから**古い形を消す（古いキー名を変える場合）。
  2. 壊れた JSON は読み込まない。元の文字列を `shinshoku_save_v1.broken.<日時>` に退避して、新しく始める案内を出す（黙って消さない）。
  3. 知らない項目は残す（新しい版で書かれたセーブを古い版で読んでも消さない）。
  4. 新しい版のセーブを古いゲームで読んだら「新しい版のセーブです」と出して読まない。
- テスト：版ごとの見本セーブ（`tests/fixtures/shinshoku_save_v*.json`）を置き、最新まで移行できることを検査。

## 6. 書き込みの安全
- 書く前に JSON にして大きさを確認、`try/catch`（容量超過・プライベートブラウズ）。失敗は画面に出す（黙って失わない）。
- 自動セーブ：区画の移動・章の区切り・分岐の前後・ボスの前。戦闘中は書かない。
- 書くのは本作の2キーと `wakaba_progress_v1` の自分の欄だけ。テストで他のキーが変わらないことを確認（CROSS_GAME_LINK_SPEC §7）。
