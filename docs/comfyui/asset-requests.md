# ComfyUI 素材リクエスト一覧

機械可読版：`asset-requests.csv`（Excel 可・UTF-8 BOM付き）／`prompt-pack.json`（一括投入用）。3つとも同じ生成元から作ったもので、**id で対応**します。
使い方・検品手順は `README.md`。状態は全件 `requested`（まだ1枚も生成していません）。検品に通ったら `done` に書き換えてください。

## 件数

| 優先度 | 内訳 | 計 |
|---|---|---|
| P1 | 立ち絵・SD 41、家・庭アイテム／植物 36、タイル・壁 4、家のキャラ（スプライトシート） 6 | **87** |
| P2 | ミニゲーム キーアート 17、シーン背景 4、立ち絵・SD 6、UI部品 4、UIアイコン 40 | **71** |
| P3 | イベントCG・エンディング 22 | **22** |
| 合計 | | **180** |

## 共通ブロック（プロンプトの部品）

各アセットの positive は `品質タグ + スタイルブロック + キャラブロック + 個別の内容` の順に組み立ててあります。キャラの見た目を変えたいときは **ブロックだけ直して** 全件を作り直してください（`prompt-pack.json` の `character_blocks`）。

### キャラクター・タグブロック

| ブロック | 内容 |
|---|---|
| `DAN` | adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt |
| `DAN_CAT` | adult, androgynous young man, fluffy messy white hair with lavender tint, white cat ears with pink inner ear, purple eyes, black rectangular glasses, pink five-petal flower hair ornaments, magenta pink hooded jacket with white fur-lined hood, black inner shirt with round pendant |
| `DAN_SD` | chibi, adult androgynous young man, long dark purple hair, side ponytail on the right, black glasses, pink flower hair ornaments, open lavender shirt over pink striped shirt, plum purple trousers, white sneakers |
| `KID` | 1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern |
| `KID_OUT` | 1girl, small child, 4 years old, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails with pink flower hair ties, big round purple eyes, pink cheeks, round yellow hat, sky-blue kindergarten smock, yellow rain boots |
| `BEAR` | small brown teddy bear with a frayed torn left ear |
| `CAT` | calico cat, white fur with orange and black patches, green-gold eyes, plump, short legs, cute |
| `HANCHO` | middle-aged man, factory team leader, yellow hard hat with a green cross emblem, short dark hair, light stubble, firm eyebrows, navy work uniform jacket with name tag |
| `SENSEI` | young woman, kindergarten teacher, warm brown long hair in a low side ponytail with pink hair tie, gentle brown eyes, pastel apron over light blouse |
| `CHIYO` | elderly woman, kind neighbor, silver-white hair in a bun with a red hairpin, round gold-rimmed glasses, gentle wrinkles, deep crimson cardigan, slightly bent posture |
| `GEN` | elderly fisherman, navy cap with anchor emblem, white beard and white mustache, tanned skin, olive fishing vest over navy and white striped shirt |
| `MINAMO` | girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles |
| `SAKURA` | young woman, long pink hair, pink flower hair clip, pink eyes, soft cardigan |
| `JOREN` | young man, late-night viewer, dark navy hood up, teal glowing gaming headphones, thin rectangular glasses, pale tired face |
| `MIDORI` | young woman, streamer, long mint green hair, white headphones with cat-ear shapes and mint accents, small headset microphone, amber eyes, black t-shirt with mint trim |
| `SENPAI` | elderly man, senior factory worker near retirement, bald top with short gray hair on sides, thin wire glasses, calm smile lines, gray work jacket |
| `YODAKA` | mysterious dark night bird avatar, black feathers, ear tufts, glowing red eyes, circular dark crimson background, round icon |

### スタイルブロック

| ブロック | 内容 |
|---|---|
| `S_PORTRAIT` | pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background |
| `S_PORTRAIT_BG` | pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, plain pale lavender background |
| `S_SPRITE` | pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy |
| `S_CHARSHEET` | pixel art, game character sprite sheet, chibi, top-down three-quarter view, character turnaround, front view, back view, left view, right view, evenly spaced, plain white background, dark purple 1px outline, flat colors |
| `S_TILE` | pixel art, seamless tileable texture, top-down view, flat colors, no outline, game tile |
| `S_SCENE` | pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting |
| `S_UI` | pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline |
| `S_UIFRAME` | pixel art game ui element, dark navy blue panel, thin gold trim border, rounded corners, flat, clean, front view, no text |
| `S_CG` | pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow |

### ネガティブブロック

| ブロック | 内容 |
|---|---|
| `N_BASE` | lowres, blurry, jpeg artifacts, watermark, signature, logo, text, letters, username, frame, border, cropped, out of frame, worst quality, low quality, photorealistic, 3d render |
| `N_PORTRAIT` | lowres, blurry, jpeg artifacts, watermark, signature, logo, text, cropped head, extra fingers, bad hands, deformed face, asymmetrical eyes, extra arms, nsfw, photorealistic, 3d render, anti-aliasing, gradient background, multiple people |
| `N_KID` | lowres, blurry, jpeg artifacts, watermark, signature, logo, text, cropped head, extra fingers, bad hands, deformed face, nsfw, adult body, mature, makeup, revealing clothes, photorealistic, 3d render, multiple people |
| `N_SPRITE` | lowres, blurry, jpeg artifacts, watermark, text, logo, multiple objects, cluttered, background scenery, floor texture, perspective distortion, isometric grid lines, photorealistic, 3d render, anti-aliasing, soft gradient, painterly, black outline |
| `N_TILE` | lowres, blurry, watermark, text, logo, visible seams, border, vignette, perspective, objects, characters, photorealistic, 3d render |
| `N_SCENE` | lowres, blurry, jpeg artifacts, watermark, signature, logo, text, letters, ui, buttons, hud, frame, border, photorealistic, 3d render, oversaturated, horror gore |
| `N_UI` | lowres, blurry, jpeg artifacts, watermark, signature, text, letters, numbers, multiple icons, photorealistic, 3d render, busy background, gradient banding |

### シード（キャラごとに固定）

| グループ | seed |
|---|---|
| DAN | 110101 |
| KID | 120101 |
| CAT | 130101 |
| HOME | 200101 |
| SCENE | 300101 |
| UI | 400101 |
| CHIYO | 140301 |
| HANCHO | 140101 |
| MOB_HANCHO | 140101 |
| MOB_SENSEI | 140201 |
| MOB_CHIYO | 140301 |
| MOB_GEN | 140401 |
| MOB_MINAMO | 140501 |
| MOB_SAKURA | 140601 |
| MOB_JOREN | 140701 |
| MOB_MIDORI | 140801 |
| MOB_SENPAI | 140901 |
| MOB_YODAKA | 141001 |

### 参考画像の呼び名

- look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）
- look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）
- look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）
- 参考画像の主人公（「ハル」表記）は**仮置き**です。だんのうらの見た目は `assets/img/char_*.webp` が正。参考画像は雰囲気（光・色・UI）にだけ使い、顔・髪型は写さないこと。

## P1 — 立ち絵・表情／家・庭の家具と植物（最優先）

### 立ち絵・SD

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `portrait.dan.normal` | だんのうら 立ち絵 ふつう | `assets/img/char_normal.webp` | 256x256 | no | bust-up | 1 | assets/img/char_normal.webp（IPAdapter 0.6〜0.8） | lineart または openpose：assets/img/char_normal.webp から抽出（構図を固定） | requested |
| `portrait.dan.happy` | だんのうら 立ち絵 笑顔 | `assets/img/char_happy.webp` | 256x256 | no | bust-up | 1 | assets/img/char_happy.webp（IPAdapter 0.6〜0.8）＋ assets/img/char_normal.webp（顔の基準） | lineart または openpose：assets/img/char_happy.webp から抽出（構図を固定） | requested |
| `portrait.dan.win` | だんのうら 立ち絵 勝ち・決め | `assets/img/char_win.webp` | 256x256 | no | bust-up | 1 | assets/img/char_win.webp（IPAdapter 0.6〜0.8）＋ assets/img/char_normal.webp（顔の基準） | lineart または openpose：assets/img/char_win.webp から抽出（構図を固定） | requested |
| `portrait.dan.tired` | だんのうら 立ち絵 疲れ（猫耳化） | `assets/img/char_tired.webp` | 256x256 | no | bust-up | 1 | assets/img/char_tired.webp（IPAdapter 0.6〜0.8）＋ assets/img/char_normal.webp（顔の基準） | lineart または openpose：assets/img/char_tired.webp から抽出（構図を固定） | requested |
| `portrait.dan.fear` | だんのうら 立ち絵 おびえ（猫耳化） | `assets/img/char_fear.webp` | 256x256 | no | bust-up | 1 | assets/img/char_fear.webp（IPAdapter 0.6〜0.8）＋ assets/img/char_normal.webp（顔の基準） | lineart または openpose：assets/img/char_fear.webp から抽出（構図を固定） | requested |
| `portrait.dan.collapse` | だんのうら 立ち絵 限界（猫耳化） | `assets/img/char_collapse.webp` | 256x256 | no | bust-up | 1 | assets/img/char_collapse.webp（IPAdapter 0.6〜0.8）＋ assets/img/char_normal.webp（顔の基準） | lineart または openpose：assets/img/char_collapse.webp から抽出（構図を固定） | requested |
| `portrait.kid.normal` | 娘 立ち絵 ふつう | `assets/img/child_normal.webp` | 256x256 | yes | bust-up | 1 | assets/img/child_normal.svg をPNG化（IPAdapter 0.7） | lineart：child_normal.svg のPNGから | requested |
| `portrait.kid.happy` | 娘 立ち絵 笑顔 | `assets/img/child_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/child_happy.svg をPNG化（IPAdapter 0.7） | lineart：child_happy.svg のPNGから | requested |
| `portrait.kid.sleep` | 娘 立ち絵 寝顔 | `assets/img/child_sleep.webp` | 256x256 | yes | bust-up | 1 | assets/img/child_sleep.svg をPNG化（IPAdapter 0.7） | lineart：child_sleep.svg のPNGから | requested |
| `portrait.kid.sad` | 娘 立ち絵 泣き顔 | `assets/img/child_sad.webp` | 256x256 | yes | bust-up | 1 | assets/img/child_sad.svg をPNG化（IPAdapter 0.7） | lineart：child_sad.svg のPNGから | requested |
| `portrait.kid.fever` | 娘 立ち絵 お熱 | `assets/img/child_fever.webp` | 256x256 | yes | bust-up | 1 | assets/img/child_fever.svg をPNG化（IPAdapter 0.7） | lineart：child_fever.svg のPNGから | requested |
| `portrait.cat.normal` | 飼い猫（三毛）ふつう | `assets/img/mob_cat.webp` | 256x256 | yes | bust-up | 1 | portrait.cat.normal の採用画像（2枚目以降はIPAdapter 0.8） | なし（2枚目以降は lineart で輪郭固定も可） | requested |
| `portrait.cat.happy` | 飼い猫（三毛）ごきげん | `assets/img/mob_cat_happy.webp` | 256x256 | yes | bust-up | 1 | portrait.cat.normal の採用画像（2枚目以降はIPAdapter 0.8） | なし（2枚目以降は lineart で輪郭固定も可） | requested |
| `portrait.cat.closed` | 飼い猫（三毛）寝顔 | `assets/img/mob_cat_closed.webp` | 256x256 | yes | bust-up | 1 | portrait.cat.normal の採用画像（2枚目以降はIPAdapter 0.8） | なし（2枚目以降は lineart で輪郭固定も可） | requested |
| `portrait.hancho.normal` | 班長・岩切 normal | `assets/img/mob_hancho.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_hancho.svg をPNG化（IPAdapter 0.6） | lineart：mob_hancho.svg のPNGから | requested |
| `portrait.hancho.happy` | 班長・岩切 happy | `assets/img/mob_hancho_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_hancho_happy.svg をPNG化（IPAdapter 0.6）＋ mob_hancho.svg（顔の基準） | lineart：mob_hancho_happy.svg のPNGから | requested |
| `portrait.hancho.worry` | 班長・岩切 worry | `assets/img/mob_hancho_worry.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_hancho_worry.svg をPNG化（IPAdapter 0.6）＋ mob_hancho.svg（顔の基準） | lineart：mob_hancho_worry.svg のPNGから | requested |
| `portrait.hancho.shout` | 班長・岩切 shout | `assets/img/mob_hancho_shout.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_hancho_shout.svg をPNG化（IPAdapter 0.6）＋ mob_hancho.svg（顔の基準） | lineart：mob_hancho_shout.svg のPNGから | requested |
| `portrait.sensei.normal` | 保育園の先生 normal | `assets/img/mob_sensei.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_sensei.svg をPNG化（IPAdapter 0.6） | lineart：mob_sensei.svg のPNGから | requested |
| `portrait.sensei.happy` | 保育園の先生 happy | `assets/img/mob_sensei_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_sensei_happy.svg をPNG化（IPAdapter 0.6）＋ mob_sensei.svg（顔の基準） | lineart：mob_sensei_happy.svg のPNGから | requested |
| `portrait.sensei.worry` | 保育園の先生 worry | `assets/img/mob_sensei_worry.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_sensei_worry.svg をPNG化（IPAdapter 0.6）＋ mob_sensei.svg（顔の基準） | lineart：mob_sensei_worry.svg のPNGから | requested |
| `portrait.chiyo.normal` | 千代さん normal | `assets/img/mob_chiyo.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_chiyo.svg をPNG化（IPAdapter 0.6） | lineart：mob_chiyo.svg のPNGから | requested |
| `portrait.chiyo.happy` | 千代さん happy | `assets/img/mob_chiyo_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_chiyo_happy.svg をPNG化（IPAdapter 0.6）＋ mob_chiyo.svg（顔の基準） | lineart：mob_chiyo_happy.svg のPNGから | requested |
| `portrait.chiyo.worry` | 千代さん worry | `assets/img/mob_chiyo_worry.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_chiyo_worry.svg をPNG化（IPAdapter 0.6）＋ mob_chiyo.svg（顔の基準） | lineart：mob_chiyo_worry.svg のPNGから | requested |
| `portrait.gen.normal` | 源さん normal | `assets/img/mob_gen.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_gen.svg をPNG化（IPAdapter 0.6） | lineart：mob_gen.svg のPNGから | requested |
| `portrait.gen.happy` | 源さん happy | `assets/img/mob_gen_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_gen_happy.svg をPNG化（IPAdapter 0.6）＋ mob_gen.svg（顔の基準） | lineart：mob_gen_happy.svg のPNGから | requested |
| `portrait.minamo.normal` | ミナモ normal | `assets/img/mob_minamo.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_minamo.svg をPNG化（IPAdapter 0.6） | lineart：mob_minamo.svg のPNGから | requested |
| `portrait.minamo.smile` | ミナモ smile | `assets/img/mob_minamo_smile.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_minamo_smile.svg をPNG化（IPAdapter 0.6）＋ mob_minamo.svg（顔の基準） | lineart：mob_minamo_smile.svg のPNGから | requested |
| `portrait.minamo.closed` | ミナモ closed | `assets/img/mob_minamo_closed.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_minamo_closed.svg をPNG化（IPAdapter 0.6）＋ mob_minamo.svg（顔の基準） | lineart：mob_minamo_closed.svg のPNGから | requested |
| `portrait.minamo.sad` | ミナモ sad | `assets/img/mob_minamo_sad.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_minamo_sad.svg をPNG化（IPAdapter 0.6）＋ mob_minamo.svg（顔の基準） | lineart：mob_minamo_sad.svg のPNGから | requested |
| `portrait.minamo.surprise` | ミナモ surprise | `assets/img/mob_minamo_surprise.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_minamo_surprise.svg をPNG化（IPAdapter 0.6）＋ mob_minamo.svg（顔の基準） | lineart：mob_minamo_surprise.svg のPNGから | requested |
| `portrait.sakura.normal` | さくら（リスナー） normal | `assets/img/mob_sakura.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_sakura.svg をPNG化（IPAdapter 0.6） | lineart：mob_sakura.svg のPNGから | requested |
| `portrait.sakura.happy` | さくら（リスナー） happy | `assets/img/mob_sakura_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_sakura_happy.svg をPNG化（IPAdapter 0.6）＋ mob_sakura.svg（顔の基準） | lineart：mob_sakura_happy.svg のPNGから | requested |
| `portrait.sakura.sad` | さくら（リスナー） sad | `assets/img/mob_sakura_sad.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_sakura_sad.svg をPNG化（IPAdapter 0.6）＋ mob_sakura.svg（顔の基準） | lineart：mob_sakura_sad.svg のPNGから | requested |
| `portrait.joren.normal` | 深夜の常連（リスナー） normal | `assets/img/mob_joren.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_joren.svg をPNG化（IPAdapter 0.6） | lineart：mob_joren.svg のPNGから | requested |
| `portrait.joren.happy` | 深夜の常連（リスナー） happy | `assets/img/mob_joren_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_joren_happy.svg をPNG化（IPAdapter 0.6）＋ mob_joren.svg（顔の基準） | lineart：mob_joren_happy.svg のPNGから | requested |
| `portrait.midori.normal` | ミドリ（配信者） normal | `assets/img/mob_midori.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_midori.svg をPNG化（IPAdapter 0.6） | lineart：mob_midori.svg のPNGから | requested |
| `portrait.midori.happy` | ミドリ（配信者） happy | `assets/img/mob_midori_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_midori_happy.svg をPNG化（IPAdapter 0.6）＋ mob_midori.svg（顔の基準） | lineart：mob_midori_happy.svg のPNGから | requested |
| `portrait.senpai.normal` | 定年間近の先輩 normal | `assets/img/mob_senpai.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_senpai.svg をPNG化（IPAdapter 0.6） | lineart：mob_senpai.svg のPNGから | requested |
| `portrait.senpai.happy` | 定年間近の先輩 happy | `assets/img/mob_senpai_happy.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_senpai_happy.svg をPNG化（IPAdapter 0.6）＋ mob_senpai.svg（顔の基準） | lineart：mob_senpai_happy.svg のPNGから | requested |
| `portrait.yodaka.normal` | 夜鷹 normal | `assets/img/mob_yodaka.webp` | 256x256 | yes | bust-up | 1 | assets/img/mob_yodaka.svg をPNG化（IPAdapter 0.6） | lineart：mob_yodaka.svg のPNGから | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`portrait.dan.normal`** — だんのうら・ふつう。既存 char_normal.webp と髪型・めがね・髪飾りを一致させる  
生成 1024x1024 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js CHAR_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, plain pale lavender background, adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt, gentle closed-mouth smile, calm eyes, small blue flame wisp floating at lower left
```
**`portrait.dan.happy`** — だんのうら・笑顔。既存 char_happy.webp と髪型・めがね・髪飾りを一致させる  
生成 1024x1024 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js CHAR_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, plain pale lavender background, adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt, big happy open-mouth smile, eyes closed in joy, light blush
```
**`portrait.dan.win`** — だんのうら・勝ち・決め。既存 char_win.webp と髪型・めがね・髪飾りを一致させる  
生成 1024x1024 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js CHAR_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, plain pale lavender background, adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt, confident smile, one hand adjusting glasses, playful look
```
**`portrait.dan.tired`** — だんのうら・疲れ（猫耳化）（白髪・猫耳・ピンクのパーカーは疲労時の変身＝設定どおり）。既存 char_tired.webp と髪型・めがね・髪飾りを一致させる  
生成 1024x1024 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js CHAR_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, plain pale lavender background, adult, androgynous young man, fluffy messy white hair with lavender tint, white cat ears with pink inner ear, purple eyes, black rectangular glasses, pink five-petal flower hair ornaments, magenta pink hooded jacket with white fur-lined hood, black inner shirt with round pendant, tired soft smile, half-lidded eyes, slightly droopy cat ears
```
**`portrait.dan.fear`** — だんのうら・おびえ（猫耳化）（白髪・猫耳・ピンクのパーカーは疲労時の変身＝設定どおり）。既存 char_fear.webp と髪型・めがね・髪飾りを一致させる  
生成 1024x1024 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js CHAR_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, plain pale lavender background, adult, androgynous young man, fluffy messy white hair with lavender tint, white cat ears with pink inner ear, purple eyes, black rectangular glasses, pink five-petal flower hair ornaments, magenta pink hooded jacket with white fur-lined hood, black inner shirt with round pendant, startled scared expression, open mouth, sweat drops, cat ears standing up
```
**`portrait.dan.collapse`** — だんのうら・限界（猫耳化）（白髪・猫耳・ピンクのパーカーは疲労時の変身＝設定どおり）。既存 char_collapse.webp と髪型・めがね・髪飾りを一致させる  
生成 1024x1024 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js CHAR_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, plain pale lavender background, adult, androgynous young man, fluffy messy white hair with lavender tint, white cat ears with pink inner ear, purple eyes, black rectangular glasses, pink five-petal flower hair ornaments, magenta pink hooded jacket with white fur-lined hood, black inner shirt with round pendant, exhausted blank half-closed eyes, faint smile, sweat drops, ears drooping, small blue flame wisps
```
**`portrait.kid.normal`** — 娘（4歳）・ふつう。家ではミントのパジャマ。クマは「左耳（画面では右）がほつれ」  
生成 1024x1024 ／ seed 120101 ／ negative `N_KID` ／ 登録先：game.js CHILD_IMG の該当キーを .svg → .webp に書き換え
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, 1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern, innocent curious face, small smile, holding brown teddy bear with frayed left ear, small brown teddy bear with a frayed torn left ear
```
**`portrait.kid.happy`** — 娘（4歳）・笑顔。家ではミントのパジャマ。クマは「左耳（画面では右）がほつれ」  
生成 1024x1024 ／ seed 120101 ／ negative `N_KID` ／ 登録先：game.js CHILD_IMG の該当キーを .svg → .webp に書き換え
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, 1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern, beaming open-mouth smile, eyes closed happily, sparkles around
```
**`portrait.kid.sleep`** — 娘（4歳）・寝顔。家ではミントのパジャマ。クマは「左耳（画面では右）がほつれ」  
生成 1024x1024 ／ seed 120101 ／ negative `N_KID` ／ 登録先：game.js CHILD_IMG の該当キーを .svg → .webp に書き換え
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, 1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern, sleeping peacefully, eyes closed, tiny drool, head tilted on pillow, small zzz bubble shape without letters
```
**`portrait.kid.sad`** — 娘（4歳）・泣き顔。家ではミントのパジャマ。クマは「左耳（画面では右）がほつれ」  
生成 1024x1024 ／ seed 120101 ／ negative `N_KID` ／ 登録先：game.js CHILD_IMG の該当キーを .svg → .webp に書き換え
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, 1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern, teary eyes, trembling lips, tears on cheeks, hugging teddy bear, small brown teddy bear with a frayed torn left ear
```
**`portrait.kid.fever`** — 娘（4歳）・お熱。家ではミントのパジャマ。クマは「左耳（画面では右）がほつれ」  
生成 1024x1024 ／ seed 120101 ／ negative `N_KID` ／ 登録先：game.js CHILD_IMG の該当キーを .svg → .webp に書き換え
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, 1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern, flushed red cheeks, sweaty forehead, cooling gel sheet on forehead, droopy tired eyes
```
**`portrait.cat.normal`** — 三毛猫（白地に茶と黒のぶち）・ふつう。ぶちの位置は1枚目で決めて以後固定  
生成 1024x1024 ／ seed 130101 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js MOB_FACES に cat:['normal','happy','closed'] を追加（新規キャラ）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, calico cat, white fur with orange and black patches, green-gold eyes, plump, short legs, cute, sitting upright, looking at viewer, calm
```
**`portrait.cat.happy`** — 三毛猫（白地に茶と黒のぶち）・ごきげん。ぶちの位置は1枚目で決めて以後固定  
生成 1024x1024 ／ seed 130101 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js MOB_FACES に cat:['normal','happy','closed'] を追加（新規キャラ）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, calico cat, white fur with orange and black patches, green-gold eyes, plump, short legs, cute, eyes closed happily, purring, tail curled
```
**`portrait.cat.closed`** — 三毛猫（白地に茶と黒のぶち）・寝顔。ぶちの位置は1枚目で決めて以後固定  
生成 1024x1024 ／ seed 130101 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js MOB_FACES に cat:['normal','happy','closed'] を追加（新規キャラ）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, calico cat, white fur with orange and black patches, green-gold eyes, plump, short legs, cute, curled up sleeping, eyes closed
```
**`portrait.hancho.normal`** — 班長・岩切・表情 normal。既存 mob_hancho.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140101 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, middle-aged man, factory team leader, yellow hard hat with a green cross emblem, short dark hair, light stubble, firm eyebrows, navy work uniform jacket with name tag, stern neutral face
```
**`portrait.hancho.happy`** — 班長・岩切・表情 happy。既存 mob_hancho_happy.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140101 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, middle-aged man, factory team leader, yellow hard hat with a green cross emblem, short dark hair, light stubble, firm eyebrows, navy work uniform jacket with name tag, proud grin
```
**`portrait.hancho.worry`** — 班長・岩切・表情 worry。既存 mob_hancho_worry.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140101 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, middle-aged man, factory team leader, yellow hard hat with a green cross emblem, short dark hair, light stubble, firm eyebrows, navy work uniform jacket with name tag, worried frown, hand on back of neck
```
**`portrait.hancho.shout`** — 班長・岩切・表情 shout。既存 mob_hancho_shout.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140101 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, middle-aged man, factory team leader, yellow hard hat with a green cross emblem, short dark hair, light stubble, firm eyebrows, navy work uniform jacket with name tag, shouting with open mouth, angry eyebrows
```
**`portrait.sensei.normal`** — 保育園の先生・表情 normal。既存 mob_sensei.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140201 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young woman, kindergarten teacher, warm brown long hair in a low side ponytail with pink hair tie, gentle brown eyes, pastel apron over light blouse, gentle smile
```
**`portrait.sensei.happy`** — 保育園の先生・表情 happy。既存 mob_sensei_happy.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140201 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young woman, kindergarten teacher, warm brown long hair in a low side ponytail with pink hair tie, gentle brown eyes, pastel apron over light blouse, bright cheerful smile
```
**`portrait.sensei.worry`** — 保育園の先生・表情 worry。既存 mob_sensei_worry.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140201 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young woman, kindergarten teacher, warm brown long hair in a low side ponytail with pink hair tie, gentle brown eyes, pastel apron over light blouse, concerned eyebrows, hand near mouth
```
**`portrait.chiyo.normal`** — 千代さん・表情 normal。既存 mob_chiyo.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140301 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, elderly woman, kind neighbor, silver-white hair in a bun with a red hairpin, round gold-rimmed glasses, gentle wrinkles, deep crimson cardigan, slightly bent posture, warm calm smile, eyes narrowed kindly
```
**`portrait.chiyo.happy`** — 千代さん・表情 happy。既存 mob_chiyo_happy.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140301 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, elderly woman, kind neighbor, silver-white hair in a bun with a red hairpin, round gold-rimmed glasses, gentle wrinkles, deep crimson cardigan, slightly bent posture, laughing happily
```
**`portrait.chiyo.worry`** — 千代さん・表情 worry。既存 mob_chiyo_worry.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140301 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, elderly woman, kind neighbor, silver-white hair in a bun with a red hairpin, round gold-rimmed glasses, gentle wrinkles, deep crimson cardigan, slightly bent posture, worried look, hand on cheek
```
**`portrait.gen.normal`** — 源さん・表情 normal。既存 mob_gen.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140401 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, elderly fisherman, navy cap with anchor emblem, white beard and white mustache, tanned skin, olive fishing vest over navy and white striped shirt, calm weathered face
```
**`portrait.gen.happy`** — 源さん・表情 happy。既存 mob_gen_happy.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140401 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, elderly fisherman, navy cap with anchor emblem, white beard and white mustache, tanned skin, olive fishing vest over navy and white striped shirt, hearty laugh
```
**`portrait.minamo.normal`** — ミナモ・表情 normal。既存 mob_minamo.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140501 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles, quiet neutral face
```
**`portrait.minamo.smile`** — ミナモ・表情 smile。既存 mob_minamo_smile.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140501 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles, soft smile
```
**`portrait.minamo.closed`** — ミナモ・表情 closed。既存 mob_minamo_closed.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140501 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles, eyes closed peacefully
```
**`portrait.minamo.sad`** — ミナモ・表情 sad。既存 mob_minamo_sad.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140501 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles, sad downcast eyes
```
**`portrait.minamo.surprise`** — ミナモ・表情 surprise。既存 mob_minamo_surprise.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140501 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles, surprised wide eyes
```
**`portrait.sakura.normal`** — さくら（リスナー）・表情 normal。既存 mob_sakura.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140601 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young woman, long pink hair, pink flower hair clip, pink eyes, soft cardigan, friendly smile
```
**`portrait.sakura.happy`** — さくら（リスナー）・表情 happy。既存 mob_sakura_happy.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140601 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young woman, long pink hair, pink flower hair clip, pink eyes, soft cardigan, excited happy smile
```
**`portrait.sakura.sad`** — さくら（リスナー）・表情 sad。既存 mob_sakura_sad.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140601 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young woman, long pink hair, pink flower hair clip, pink eyes, soft cardigan, sad teary eyes
```
**`portrait.joren.normal`** — 深夜の常連（リスナー）・表情 normal。既存 mob_joren.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140701 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young man, late-night viewer, dark navy hood up, teal glowing gaming headphones, thin rectangular glasses, pale tired face, quiet neutral face
```
**`portrait.joren.happy`** — 深夜の常連（リスナー）・表情 happy。既存 mob_joren_happy.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140701 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young man, late-night viewer, dark navy hood up, teal glowing gaming headphones, thin rectangular glasses, pale tired face, shy small smile
```
**`portrait.midori.normal`** — ミドリ（配信者）・表情 normal。既存 mob_midori.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140801 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young woman, streamer, long mint green hair, white headphones with cat-ear shapes and mint accents, small headset microphone, amber eyes, black t-shirt with mint trim, confident smile
```
**`portrait.midori.happy`** — ミドリ（配信者）・表情 happy。既存 mob_midori_happy.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140801 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, young woman, streamer, long mint green hair, white headphones with cat-ear shapes and mint accents, small headset microphone, amber eyes, black t-shirt with mint trim, winking cheerful grin
```
**`portrait.senpai.normal`** — 定年間近の先輩・表情 normal。既存 mob_senpai.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140901 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, elderly man, senior factory worker near retirement, bald top with short gray hair on sides, thin wire glasses, calm smile lines, gray work jacket, calm neutral face
```
**`portrait.senpai.happy`** — 定年間近の先輩・表情 happy。既存 mob_senpai_happy.svg の服・髪色を維持  
生成 1024x1024 ／ seed 140901 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, elderly man, senior factory worker near retirement, bald top with short gray hair on sides, thin wire glasses, calm smile lines, gray work jacket, warm smile
```
**`portrait.yodaka.normal`** — 夜鷹・表情 normal。既存 mob_yodaka.svg の服・髪色を維持。円形アイコン（円の外は透過）  
生成 1024x1024 ／ seed 141001 ／ negative `N_PORTRAIT` ／ 登録先：main/mobs.js 25行目の '.svg' を '.webp' に（全表情そろってから一括）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, mysterious dark night bird avatar, black feathers, ear tufts, glowing red eyes, circular dark crimson background, round icon, staring menacingly
```
</details>

### 家・庭アイテム／植物

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `home.furniture.desk_small` | 小さな木の机（2×1マス） | `assets/img/home/furniture.desk_small_r0_default.png ／ godot/assets/sprites/items/furniture.desk_small_r0_default.png` | r0: 40x50 / r90: 24x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.wood_chair` | 木の椅子（1×1マス） | `assets/img/home/furniture.wood_chair_r0_default.png ／ godot/assets/sprites/items/furniture.wood_chair_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90,180,270 ／ variant: natural, white ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.repaired_shelf` | 修理した棚（2×1マス） | `assets/img/home/furniture.repaired_shelf_r0_default.png ／ godot/assets/sprites/items/furniture.repaired_shelf_r0_default.png` | r0: 40x50 / r90: 24x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90,180,270 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.bookshelf` | 本棚（2×1マス） | `assets/img/home/furniture.bookshelf_r0_default.png ／ godot/assets/sprites/items/furniture.bookshelf_r0_default.png` | r0: 40x50 / r90: 24x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90,180,270 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.futon` | 布団（2×3マス） | `assets/img/home/furniture.futon_r0_default.png ／ godot/assets/sprites/items/furniture.futon_r0_default.png` | r0: 40x82 / r90: 56x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×3の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.cushion` | クッション（1×1マス） | `assets/img/home/furniture.cushion_r0_default.png ／ godot/assets/sprites/items/furniture.cushion_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.low_table` | 低い食卓（2×2マス） | `assets/img/home/furniture.low_table_r0_default.png ／ godot/assets/sprites/items/furniture.low_table_r0_default.png` | r0: 40x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×2の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.light.desk_lamp` | 卓上ランプ（1×1マス） | `assets/img/home/light.desk_lamp_r0_default.png ／ godot/assets/sprites/items/light.desk_lamp_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ variant: off, lit ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.light.shell_lantern` | 貝殻ランタン（1×1マス） | `assets/img/home/light.shell_lantern_r0_default.png ／ godot/assets/sprites/items/light.shell_lantern_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ variant: off, lit ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.memento.child_drawing` | 娘の絵の額（1×1マス） | `assets/img/home/memento.child_drawing_r0_default.png ／ godot/assets/sprites/items/memento.child_drawing_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0（壁） ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.memento.bear` | クマのぬいぐるみ（1×1マス） | `assets/img/home/memento.bear_r0_default.png ／ godot/assets/sprites/items/memento.bear_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.memento.flower_tag` | 花の名札（1×1マス） | `assets/img/home/memento.flower_tag_r0_default.png ／ godot/assets/sprites/items/memento.flower_tag_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.pot` | 鉢植え（鉢のみ）（1×1マス） | `assets/img/home/garden.pot_r0_default.png ／ godot/assets/sprites/items/garden.pot_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ variant: default(terracotta), red, blue, yellow ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.flowerbed` | 花壇（2×1マス） | `assets/img/home/garden.flowerbed_r0_default.png ／ godot/assets/sprites/items/garden.flowerbed_r0_default.png` | r0: 40x50 / r90: 24x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ anim: sway 2 frames ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.bench` | 木のベンチ（2×1マス） | `assets/img/home/garden.bench_r0_default.png ／ godot/assets/sprites/items/garden.bench_r0_default.png` | r0: 40x50 / r90: 24x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90,180,270 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.fence` | 木の柵（1×1マス） | `assets/img/home/garden.fence_r0_default.png ／ godot/assets/sprites/items/garden.fence_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ tileable horizontally ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.stepping_stone` | 飛び石（1×1マス） | `assets/img/home/garden.stepping_stone_r0_default.png ／ godot/assets/sprites/items/garden.stepping_stone_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0（path） ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.small_tree` | 小さな木（1×1マス） | `assets/img/home/garden.small_tree_r0_default.png ／ godot/assets/sprites/items/garden.small_tree_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ anim: sway 2 frames ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.deco.rug` | ラグ（3×2マス） | `assets/img/home/deco.rug_r0_default.png ／ godot/assets/sprites/items/deco.rug_r0_default.png` | r0: 56x66 / r90: 40x82（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に3×2の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.deco.sea_glass` | 漂着ガラスの飾り（1×1マス） | `assets/img/home/deco.sea_glass_r0_default.png ／ godot/assets/sprites/items/deco.sea_glass_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ anim: sparkle 2 frames ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.toy_box` | おもちゃ箱（1×1マス）［フェーズ2］ | `assets/img/home/furniture.toy_box_r0_default.png ／ godot/assets/sprites/items/furniture.toy_box_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.kid_desk` | 娘の小さな机（1×1マス）［フェーズ2］ | `assets/img/home/furniture.kid_desk_r0_default.png ／ godot/assets/sprites/items/furniture.kid_desk_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90,180,270 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.furniture.old_radio` | 千代さんの古いラジオ（1×1マス）［フェーズ2］ | `assets/img/home/furniture.old_radio_r0_default.png ／ godot/assets/sprites/items/furniture.old_radio_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.memento.toolbox` | 班長の古い工具箱（1×1マス）［フェーズ2］ | `assets/img/home/memento.toolbox_r0_default.png ／ godot/assets/sprites/items/memento.toolbox_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.memento.recital_photo` | 発表会の写真（1×1マス）［フェーズ2］ | `assets/img/home/memento.recital_photo_r0_default.png ／ godot/assets/sprites/items/memento.recital_photo_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0（壁） ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.deco.wind_chime` | 風鈴（1×1マス）［フェーズ2］ | `assets/img/home/deco.wind_chime_r0_default.png ／ godot/assets/sprites/items/deco.wind_chime_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0（壁） ／ anim: sway 2 frames ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.deco.sea_mobile` | 海のモビール（1×1マス）［フェーズ2］ | `assets/img/home/deco.sea_mobile_r0_default.png ／ godot/assets/sprites/items/deco.sea_mobile_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0（壁） ／ anim: sway 2 frames ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.nameplate` | 家の表札（1×1マス）［フェーズ2］ | `assets/img/home/garden.nameplate_r0_default.png ／ godot/assets/sprites/items/garden.nameplate_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.clothesline` | 物干し（3×1マス）［フェーズ2］ | `assets/img/home/garden.clothesline_r0_default.png ／ godot/assets/sprites/items/garden.clothesline_r0_default.png` | r0: 56x50 / r90: 24x82（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に3×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.light.string_lights` | 庭の豆電球（2×1マス）［フェーズ2］ | `assets/img/home/light.string_lights_r0_default.png ／ godot/assets/sprites/items/light.string_lights_r0_default.png` | r0: 40x50 / r90: 24x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ variant: off, lit / anim: twinkle 2 frames ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.planter` | プランター（2×1マス）［フェーズ2］ | `assets/img/home/garden.planter_r0_default.png ／ godot/assets/sprites/items/garden.planter_r0_default.png` | r0: 40x50 / r90: 24x66（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0,90 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に2×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.garden.watering_can` | じょうろ（1×1マス）［フェーズ2］ | `assets/img/home/garden.watering_can_r0_default.png ／ godot/assets/sprites/items/garden.watering_can_r0_default.png` | r0: 24x50（原寸ドット・1ドット=1px） | yes | top-down 3/4 | 回転 0 ／ 1回転×1variant＝1ファイル（_r0_default, _r90_default, _r0_lit …） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）＋現行のコード描画をスクショ（家・庭画面） | depth または lineart：16pxグリッド上に1×1の足元と高さを箱で描いた下絵（回転ごとに作る） | requested |
| `home.plant.seed` | 植物 娘の花（成長0〜4） | `assets/img/home/plant.seed.png ／ godot/assets/sprites/items/plant.seed.png（新規）` | 16x32 ×5コマ横並び（80x32） | yes | top-down 3/4 | 5（stage 0..4） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（庭づくり） | lineart：5段階の高さだけ描いたラフ | requested |
| `home.plant.morning_glory` | 植物 あさがお（成長0〜4） | `assets/img/home/plant.morning_glory.png ／ godot/assets/sprites/items/plant.morning_glory.png（新規）` | 16x32 ×5コマ横並び（80x32） | yes | top-down 3/4 | 5（stage 0..4） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（庭づくり） | lineart：5段階の高さだけ描いたラフ | requested |
| `home.plant.sunflower` | 植物 ひまわり（成長0〜4） | `assets/img/home/plant.sunflower.png ／ godot/assets/sprites/items/plant.sunflower.png（新規）` | 16x32 ×5コマ横並び（80x32） | yes | top-down 3/4 | 5（stage 0..4） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（庭づくり） | lineart：5段階の高さだけ描いたラフ | requested |
| `home.plant.herb` | 植物 ハーブ（成長0〜4） | `assets/img/home/plant.herb.png ／ godot/assets/sprites/items/plant.herb.png（新規）` | 16x32 ×5コマ横並び（80x32） | yes | top-down 3/4 | 5（stage 0..4） | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（庭づくり） | lineart：5段階の高さだけ描いたラフ | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`home.furniture.desk_small`** — 小さな木の机。占有2×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small wooden writing desk, open notebook, pencil, mug on top
```
**`home.furniture.wood_chair`** — 木の椅子。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, simple wooden chair with backrest
```
**`home.furniture.repaired_shelf`** — 修理した棚。占有2×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, low wooden shelf repaired with new pale wood planks and L-shaped metal brackets, cross brace on back
```
**`home.furniture.bookshelf`** — 本棚。占有2×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, tall wooden bookshelf full of colorful books and picture books
```
**`home.furniture.futon`** — 布団。占有2×3マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, japanese futon bedding on floor, blue-violet comforter with small yellow stars, white pillow
```
**`home.furniture.cushion`** — クッション。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, square pink floor cushion with yellow corner tassels
```
**`home.furniture.low_table`** — 低い食卓。占有2×2マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, low japanese wooden dining table, two tea cups and a mandarin orange on top
```
**`home.light.desk_lamp`** — 卓上ランプ。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small desk lamp with cream shade, warm amber glow when lit
```
**`home.light.shell_lantern`** — 貝殻ランタン。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small lantern made of a scallop seashell with a pearl, soft teal glow when lit
```
**`home.memento.child_drawing`** — 娘の絵の額。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, wall-hung wooden picture frame with a child's crayon drawing of a father and a little girl
```
**`home.memento.bear`** — クマのぬいぐるみ。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small brown teddy bear sitting, frayed torn ear on the right side of the image
```
**`home.memento.flower_tag`** — 花の名札。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small wooden stake name tag stuck in ground, crayon scribble marks without readable letters
```
**`home.garden.pot`** — 鉢植え（鉢のみ）。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, empty round flower pot with soil
```
**`home.garden.flowerbed`** — 花壇。占有2×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small raised wooden flowerbed with colorful small flowers
```
**`home.garden.bench`** — 木のベンチ。占有2×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small wooden garden bench with backrest
```
**`home.garden.fence`** — 木の柵。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, short wooden picket fence segment, connects seamlessly left and right
```
**`home.garden.stepping_stone`** — 飛び石。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, flat round gray stepping stone set in grass, top-down
```
**`home.garden.small_tree`** — 小さな木。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small round leafy tree with short trunk
```
**`home.deco.rug`** — ラグ。占有3×2マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, flat woven rug with soft purple and cream pattern, lying on floor
```
**`home.deco.sea_glass`** — 漂着ガラスの飾り。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small ornament of collected sea glass pieces in teal and blue on a little stand, sparkle
```
**`home.furniture.toy_box`** — おもちゃ箱。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, child's wooden toy box with toys peeking out, blocks and a ball
```
**`home.furniture.kid_desk`** — 娘の小さな机。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, tiny child's wooden desk with crayons and drawing paper
```
**`home.furniture.old_radio`** — 千代さんの古いラジオ。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, old wooden tabletop radio with round speaker grill and dials, retro
```
**`home.memento.toolbox`** — 班長の古い工具箱。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, old worn metal toolbox, faded red paint, handle on top
```
**`home.memento.recital_photo`** — 発表会の写真。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, wall-hung small photo frame showing a tiny figure on a kindergarten stage, no faces detailed
```
**`home.deco.wind_chime`** — 風鈴。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, japanese glass wind chime hanging, round clear glass bell with blue wave pattern, paper strip
```
**`home.deco.sea_mobile`** — 海のモビール。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, hanging mobile with small fish and seashell shapes in teal and pearl colors
```
**`home.garden.nameplate`** — 家の表札。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small wooden house nameplate on a short post, blank carved board without letters
```
**`home.garden.clothesline`** — 物干し。占有3×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, outdoor clothesline with two wooden poles, small towels and a tiny dress hanging
```
**`home.light.string_lights`** — 庭の豆電球。占有2×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, string of small warm light bulbs on two short wooden posts
```
**`home.garden.planter`** — プランター。占有2×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, long rectangular wooden planter box with soil
```
**`home.garden.watering_can`** — じょうろ。占有1×1マス（1マス16ドット）。足元の左右下に4ドット、上に最大30ドットの余白。光源左上・外周線 #1b1226  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART はコード描画（sprites.js）→ 画像ローダ追加が必要（別作業）。Godot：同名で上書き＋ godot/data/sprites.json の w/h/ox/oy を合わせる（×2・余白トリム）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, small tin watering can, pale blue
```
**`home.plant.seed`** — 娘の花。鉢・プランターの上に重ねる（鉢は描かない）。0=芽 → 4=満開  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：HOME_ART.drawItem opts.plant（コード描画）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, plant growth stages sprite sheet, five stages from sprout to full bloom, left to right, small cheerful flowers, pink and yellow petals, no pot
```
**`home.plant.morning_glory`** — あさがお。鉢・プランターの上に重ねる（鉢は描かない）。0=芽 → 4=満開  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：HOME_ART.drawItem opts.plant（コード描画）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, plant growth stages sprite sheet, five stages from sprout to full bloom, left to right, morning glory vine climbing a small stick, purple-blue trumpet flowers, no pot
```
**`home.plant.sunflower`** — ひまわり。鉢・プランターの上に重ねる（鉢は描かない）。0=芽 → 4=満開  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：HOME_ART.drawItem opts.plant（コード描画）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, plant growth stages sprite sheet, five stages from sprout to full bloom, left to right, sunflower, tall stem, big yellow flower head, no pot
```
**`home.plant.herb`** — ハーブ。鉢・プランターの上に重ねる（鉢は描かない）。0=芽 → 4=満開  
生成 1024x1024 ／ seed 200101 ／ negative `N_SPRITE` ／ 登録先：HOME_ART.drawItem opts.plant（コード描画）
```text
best quality, high detail, pixel art, game sprite, top-down three-quarter view, single object, centered, isolated, plain white background, dark purple 1px outline, flat colors, light from top-left, small drop shadow to bottom-right, cozy, plant growth stages sprite sheet, five stages from sprout to full bloom, left to right, leafy green herb plant, small basil-like leaves, no pot
```
</details>

### タイル・壁

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `home.floor.wood` | 床（木） | `assets/img/home/floor.wood.png ／ godot/assets/sprites/tiles/floor.wood_atlas.png` | 16x16 ×4バリエーション | no | top-down | 16x16 ×4バリエーション | docs/asset-style-guide.md パレット | なし（タイル化は ComfyUI の「Seamless/Circular padding」系ノード推奨） | requested |
| `home.ground.grass` | 地面（芝） | `assets/img/home/ground.grass.png ／ godot/assets/sprites/tiles/ground.grass_atlas.png` | 16x16 ×4バリエーション | no | top-down | 16x16 ×4バリエーション | docs/asset-style-guide.md パレット | なし（タイル化は ComfyUI の「Seamless/Circular padding」系ノード推奨） | requested |
| `home.ground.path` | 小道 | `assets/img/home/ground.path.png ／ godot/assets/sprites/tiles/ground.path_atlas.png` | 16x16 ×2バリエーション | no | top-down | 16x16 ×2バリエーション | docs/asset-style-guide.md パレット | なし（タイル化は ComfyUI の「Seamless/Circular padding」系ノード推奨） | requested |
| `home.wall.room` | 部屋の壁帯 | `assets/img/home/wall.room.png ／ godot/assets/sprites/bg/wall_room_night.png` | 64x24（4マス分・高さ1.5マス）＋窓あり版 | no | front | 64x24（4マス分・高さ1.5マス）＋窓あり版 | docs/asset-style-guide.md パレット | なし（タイル化は ComfyUI の「Seamless/Circular padding」系ノード推奨） | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`home.floor.wood`** — 床（木）。上下左右でつながること（シームレス）。パレットはスタイルガイドの床/庭の緑/壁紙  
生成 1024x1024 ／ seed 200101 ／ negative `N_TILE` ／ 登録先：ブラウザ：HOME_ART.drawTile / drawWall（コード描画）→ 画像化は別作業。Godot：tiles/*_atlas.png（バリエーション横並び・×2）を上書き
```text
best quality, high detail, pixel art, seamless tileable texture, top-down view, flat colors, no outline, game tile, wooden floorboards, warm brown planks, subtle wood grain
```
**`home.ground.grass`** — 地面（芝）。上下左右でつながること（シームレス）。パレットはスタイルガイドの床/庭の緑/壁紙  
生成 1024x1024 ／ seed 200101 ／ negative `N_TILE` ／ 登録先：ブラウザ：HOME_ART.drawTile / drawWall（コード描画）→ 画像化は別作業。Godot：tiles/*_atlas.png（バリエーション横並び・×2）を上書き
```text
best quality, high detail, pixel art, seamless tileable texture, top-down view, flat colors, no outline, game tile, soft green grass with tiny flowers and tufts
```
**`home.ground.path`** — 小道。上下左右でつながること（シームレス）。パレットはスタイルガイドの床/庭の緑/壁紙  
生成 1024x1024 ／ seed 200101 ／ negative `N_TILE` ／ 登録先：ブラウザ：HOME_ART.drawTile / drawWall（コード描画）→ 画像化は別作業。Godot：tiles/*_atlas.png（バリエーション横並び・×2）を上書き
```text
best quality, high detail, pixel art, seamless tileable texture, top-down view, flat colors, no outline, game tile, packed dirt garden path with small pebbles
```
**`home.wall.room`** — 部屋の壁帯。上下左右でつながること（シームレス）。パレットはスタイルガイドの床/庭の緑/壁紙  
生成 1024x1024 ／ seed 200101 ／ negative `N_TILE` ／ 登録先：ブラウザ：HOME_ART.drawTile / drawWall（コード描画）→ 画像化は別作業。Godot：tiles/*_atlas.png（バリエーション横並び・×2）を上書き
```text
best quality, high detail, pixel art, seamless tileable texture, top-down view, flat colors, no outline, game tile, interior wall strip, muted purple striped wallpaper, wooden baseboard, small window showing night sky, curtain, wall lamp
```
</details>

### 家のキャラ（スプライトシート）

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `home.char.dan` | 家のキャラ だんのうら | `assets/img/home/char.dan.png（シート）／ godot/assets/sprites/chars/dan_<dir>_<pose>_<n>.png（1コマ1ファイル）` | 16x24 /コマ | yes | top-down 3/4 | 4方向×(stand, walk×4, sit, hold, work) | assets/img/sd_normal.webp（IPAdapter 0.7） | openpose：4方向の棒人形（正面・背面・左・右）を並べた画像 | requested |
| `home.char.dan_cat` | 家のキャラ だんのうら（猫耳化・疲労時） | `assets/img/home/char.dan_cat.png（シート）／ godot/assets/sprites/chars/dan_cat_<dir>_<pose>_<n>.png（1コマ1ファイル）` | 16x24 /コマ | yes | top-down 3/4 | 4方向×(stand, walk×4, sit) | assets/img/sd_tired.webp（IPAdapter 0.7） | openpose：4方向の棒人形（正面・背面・左・右）を並べた画像 | requested |
| `home.char.kid` | 家のキャラ 娘 | `assets/img/home/char.kid.png（シート）／ godot/assets/sprites/chars/kid_<dir>_<pose>_<n>.png（1コマ1ファイル）` | 16x19 /コマ | yes | top-down 3/4 | 4方向×(stand, walk×4, sit) ＋ sleep（布団）＋ read（絵本） | assets/img/child_normal.svg（PNG化）（IPAdapter 0.7） | openpose：4方向の棒人形（正面・背面・左・右）を並べた画像 | requested |
| `home.char.chiyo` | 家のキャラ 千代さん（訪問者） | `assets/img/home/char.chiyo.png（シート）／ godot/assets/sprites/chars/chiyo_<dir>_<pose>_<n>.png（1コマ1ファイル）` | 16x24 /コマ | yes | top-down 3/4 | 4方向×(stand, walk×4, sit) | assets/img/mob_chiyo.svg（PNG化）（IPAdapter 0.7） | openpose：4方向の棒人形（正面・背面・左・右）を並べた画像 | requested |
| `home.char.hancho` | 家のキャラ 班長（訪問者） | `assets/img/home/char.hancho.png（シート）／ godot/assets/sprites/chars/hancho_<dir>_<pose>_<n>.png（1コマ1ファイル）` | 16x24 /コマ | yes | top-down 3/4 | 4方向×(stand, walk×4, sit) | assets/img/mob_hancho.svg（PNG化）（IPAdapter 0.7） | openpose：4方向の棒人形（正面・背面・左・右）を並べた画像 | requested |
| `home.char.cat` | 家のキャラ 三毛猫 | `assets/img/home/char.cat.png（シート）／ godot/assets/sprites/chars/cat_<dir>_<pose>_<n>.png（1コマ1ファイル）` | 16x16 /コマ | yes | top-down 3/4 | 4方向×(stand, walk×2) ＋ sit ＋ sleep（丸まる） | portrait.cat.normal 採用画像（IPAdapter 0.7） | openpose：4方向の棒人形（正面・背面・左・右）を並べた画像 | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`home.char.dan`** — だんのうら。生成は「4方向の立ちポーズ参考」まで。歩きコマは生成画像を下絵に手で打つ（ドット修正前提）。左向き＝右向きの反転  
生成 1536x640 ／ seed 110101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART.drawChar（コード描画）→ 画像化は別作業。Godot：chars/ のコマを同名で上書き（dir=down/up/left/right）
```text
best quality, high detail, pixel art, game character sprite sheet, chibi, top-down three-quarter view, character turnaround, front view, back view, left view, right view, evenly spaced, plain white background, dark purple 1px outline, flat colors, chibi, adult androgynous young man, long dark purple hair, side ponytail on the right, black glasses, pink flower hair ornaments, open lavender shirt over pink striped shirt, plum purple trousers, white sneakers, walking pose and standing pose
```
**`home.char.dan_cat`** — だんのうら（猫耳化・疲労時）。生成は「4方向の立ちポーズ参考」まで。歩きコマは生成画像を下絵に手で打つ（ドット修正前提）。左向き＝右向きの反転  
生成 1536x640 ／ seed 110101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART.drawChar（コード描画）→ 画像化は別作業。Godot：chars/ のコマを同名で上書き（dir=down/up/left/right）
```text
best quality, high detail, pixel art, game character sprite sheet, chibi, top-down three-quarter view, character turnaround, front view, back view, left view, right view, evenly spaced, plain white background, dark purple 1px outline, flat colors, adult, androgynous young man, fluffy messy white hair with lavender tint, white cat ears with pink inner ear, purple eyes, black rectangular glasses, pink five-petal flower hair ornaments, magenta pink hooded jacket with white fur-lined hood, black inner shirt with round pendant, cat tail, standing pose
```
**`home.char.kid`** — 娘。生成は「4方向の立ちポーズ参考」まで。歩きコマは生成画像を下絵に手で打つ（ドット修正前提）。左向き＝右向きの反転  
生成 1536x640 ／ seed 120101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART.drawChar（コード描画）→ 画像化は別作業。Godot：chars/ のコマを同名で上書き（dir=down/up/left/right）
```text
best quality, high detail, pixel art, game character sprite sheet, chibi, top-down three-quarter view, character turnaround, front view, back view, left view, right view, evenly spaced, plain white background, dark purple 1px outline, flat colors, 1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern, standing pose
```
**`home.char.chiyo`** — 千代さん（訪問者）。生成は「4方向の立ちポーズ参考」まで。歩きコマは生成画像を下絵に手で打つ（ドット修正前提）。左向き＝右向きの反転  
生成 1536x640 ／ seed 140301 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART.drawChar（コード描画）→ 画像化は別作業。Godot：chars/ のコマを同名で上書き（dir=down/up/left/right）
```text
best quality, high detail, pixel art, game character sprite sheet, chibi, top-down three-quarter view, character turnaround, front view, back view, left view, right view, evenly spaced, plain white background, dark purple 1px outline, flat colors, elderly woman, kind neighbor, silver-white hair in a bun with a red hairpin, round gold-rimmed glasses, gentle wrinkles, deep crimson cardigan, slightly bent posture, standing pose, slightly bent
```
**`home.char.hancho`** — 班長（訪問者）。生成は「4方向の立ちポーズ参考」まで。歩きコマは生成画像を下絵に手で打つ（ドット修正前提）。左向き＝右向きの反転  
生成 1536x640 ／ seed 140101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART.drawChar（コード描画）→ 画像化は別作業。Godot：chars/ のコマを同名で上書き（dir=down/up/left/right）
```text
best quality, high detail, pixel art, game character sprite sheet, chibi, top-down three-quarter view, character turnaround, front view, back view, left view, right view, evenly spaced, plain white background, dark purple 1px outline, flat colors, middle-aged man, factory team leader, yellow hard hat with a green cross emblem, short dark hair, light stubble, firm eyebrows, navy work uniform jacket with name tag, standing pose
```
**`home.char.cat`** — 三毛猫。生成は「4方向の立ちポーズ参考」まで。歩きコマは生成画像を下絵に手で打つ（ドット修正前提）。左向き＝右向きの反転  
生成 1536x640 ／ seed 130101 ／ negative `N_SPRITE` ／ 登録先：ブラウザ：HOME_ART.drawChar（コード描画）→ 画像化は別作業。Godot：chars/ のコマを同名で上書き（dir=down/up/left/right）
```text
best quality, high detail, pixel art, game character sprite sheet, chibi, top-down three-quarter view, character turnaround, front view, back view, left view, right view, evenly spaced, plain white background, dark purple 1px outline, flat colors, calico cat, white fur with orange and black patches, green-gold eyes, plump, short legs, cute, four-legged
```
</details>

## P2 — ミニゲームのキーアート・背景・UI

### ミニゲーム キーアート

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `keyart.shooter` | ミニゲーム キーアート「炎上コメント撃退」 | `assets/img/mg/shooter_key.webp ／ godot/assets/sprites/bg/mg_shooter_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.runner` | ミニゲーム キーアート「深夜の買い出しダッシュ」 | `assets/img/mg/runner_key.webp ／ godot/assets/sprites/bg/mg_runner_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.factory3d` | ミニゲーム キーアート「夜勤の第三工場」 | `assets/img/mg/factory3d_key.webp ／ godot/assets/sprites/bg/mg_factory3d_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.race` | ミニゲーム キーアート「原付で夜勤へ」 | `assets/img/mg/race_key.webp ／ godot/assets/sprites/bg/mg_race_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.stealth` | ミニゲーム キーアート「起こさないで家事」 | `assets/img/mg/stealth_key.webp ／ godot/assets/sprites/bg/mg_stealth_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.puzzle` | ミニゲーム キーアート「配線復旧パズル」 | `assets/img/mg/puzzle_key.webp ／ godot/assets/sprites/bg/mg_puzzle_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.blocks` | ミニゲーム キーアート「部品組み立てライン」 | `assets/img/mg/blocks_key.webp ／ godot/assets/sprites/bg/mg_blocks_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.quiz` | ミニゲーム キーアート「危険物取扱者 一問一答」 | `assets/img/mg/quiz_key.webp ／ godot/assets/sprites/bg/mg_quiz_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.escape` | ミニゲーム キーアート「閉じ込められた夜勤明け」 | `assets/img/mg/escape_key.webp ／ godot/assets/sprites/bg/mg_escape_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.defense` | ミニゲーム キーアート「荒らしディフェンス」 | `assets/img/mg/defense_key.webp ／ godot/assets/sprites/bg/mg_defense_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.cards` | ミニゲーム キーアート「配信トークバトル」 | `assets/img/mg/cards_key.webp ／ godot/assets/sprites/bg/mg_cards_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.manager` | ミニゲーム キーアート「チャンネル運営会議」 | `assets/img/mg/manager_key.webp ／ godot/assets/sprites/bg/mg_manager_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.rpg` | ミニゲーム キーアート「壇ノ浦夢譚」 | `assets/img/mg/rpg_key.webp ／ godot/assets/sprites/bg/mg_rpg_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.horror` | ミニゲーム キーアート「怪談配信・実録編」 | `assets/img/mg/horror_key.webp ／ godot/assets/sprites/bg/mg_horror_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.rogue` | ミニゲーム キーアート「深夜の工場巡回」 | `assets/img/mg/rogue_key.webp ／ godot/assets/sprites/bg/mg_rogue_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.cooking` | ミニゲーム キーアート「深夜の夜食づくり」 | `assets/img/mg/cooking_key.webp ／ godot/assets/sprites/bg/mg_cooking_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |
| `keyart.fishing` | ミニゲーム キーアート「夜釣りで頭を空っぽに」 | `assets/img/mg/fishing_key.webp ／ godot/assets/sprites/bg/mg_fishing_key.webp` | 540x960 | no | side / scene（縦9:16） | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（IPAdapter スタイルのみ 0.3〜0.5。主人公の顔は写さない） | depth：参考パネルから構図だけ（任意） | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`keyart.shooter`** — 「炎上コメント撃退」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/shooter.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, night seaside town far below, glowing red angry speech bubble shapes raining from the sky, small hero with cat-face backpack defending, blue energy shots
```
**`keyart.runner`** — 「深夜の買い出しダッシュ」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/runner.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, rainy night shopping street, glowing vegetable shop and fish shop awnings, wet reflective pavement, traffic cone, side view running lane
```
**`keyart.factory3d`** — 「夜勤の第三工場」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/factory3d.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, top-down night factory corridor, yellow-black hazard stripes, steam pipes, glowing valve wheel, warm work lights
```
**`keyart.race`** — 「原付で夜勤へ」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/race.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, rear view of a small scooter on a wet coastal night road, guardrail, streetlights, lighthouse and town lights across the bay, motion blur streaks
```
**`keyart.stealth`** — 「起こさないで家事」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/stealth.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, top-down cozy apartment at night, small child sleeping in futon with teddy bear, calico cat sleeping on cushion, laundry basket, dim lamp
```
**`keyart.puzzle`** — 「配線復旧パズル」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/puzzle.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, close-up of an open electrical panel at night, colorful cables, glowing terminals, flashlight beam
```
**`keyart.blocks`** — 「部品組み立てライン」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/blocks.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, night factory assembly line, conveyor belt with metal parts and gears, warm overhead lamps
```
**`keyart.quiz`** — 「危険物取扱者 一問一答」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/quiz.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, cozy night study desk, open textbook, notebook, warm desk lamp, mug, window with night sea view
```
**`keyart.escape`** — 「閉じ込められた夜勤明け」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/escape.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, locked factory locker room at dawn, steel door, lockers, dim emergency light, mysterious clues
```
**`keyart.defense`** — 「荒らしディフェンス」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/defense.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, stylized streaming channel castle on a hill at night, glowing shield barrier, small red troll creatures approaching
```
**`keyart.cards`** — 「配信トークバトル」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/cards.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, streaming desk with microphone and monitor, floating glowing talk cards, cozy night room
```
**`keyart.manager`** — 「チャンネル運営会議」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/manager.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, cozy night home office, whiteboard with sticky notes, monitor showing rising bar chart without numbers, microphone, guitar
```
**`keyart.rpg`** — 「壇ノ浦夢譚」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/rpg.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, sunken dream town under a glowing teal sea, ruined torii gates, jellyfish, lanterns along a path, ghostly light-blue haired girl in white dress
```
**`keyart.horror`** — 「怪談配信・実録編」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/horror.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, dark abandoned seaside warehouse at night, broken windows, moon, faint shadowy figure far away on the pier, camera on tripod
```
**`keyart.rogue`** — 「深夜の工場巡回」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/rogue.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, top-down dark factory maze at night, flashlight cone, pipes, crates, shadowy cat silhouette with glowing eyes
```
**`keyart.cooking`** — 「深夜の夜食づくり」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/cooking.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, small night kitchen, pot of noodle soup steaming on blue gas flame, eggs and green onions on counter, warm lights
```
**`keyart.fishing`** — 「夜釣りで頭を空っぽに」のタイトル・選択カード用背景。UI・文字は入れない（あとでゲーム側で重ねる）。下1/3は暗めでボタンが乗る余白  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（新規）。minigames/fishing.js の選択カード・導入画面で使う場合は登録処理の追加が必要
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, quiet night pier, full moon, calm sea with moon reflection, lighthouse, lantern and fishing rod, calico cat sitting nearby
```
</details>

### シーン背景

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `bg.main` | シーン背景 夜の部屋（メイン） | `assets/img/bg_main.webp` | 1200x200（現行600x100の2倍・横長帯） | no | side / scene（横帯） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（夜の暮らし） | なし | requested |
| `bg.childcare` | シーン背景 育児 | `assets/img/bg_childcare.webp` | 1200x200（現行600x100の2倍・横長帯） | no | side / scene（横帯） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（夜の暮らし） | なし | requested |
| `bg.factory` | シーン背景 工場 | `assets/img/bg_factory.webp` | 1200x200（現行600x100の2倍・横長帯） | no | side / scene（横帯） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（夜の暮らし） | なし | requested |
| `bg.rest_light` | シーン背景 休息 | `assets/img/bg_rest_light.webp` | 1200x200（現行600x100の2倍・横長帯） | no | side / scene（横帯） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（夜の暮らし） | なし | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`bg.main`** — 夜の部屋（メイン）の横長帯背景。1536x640で生成→中央を帯に切り出し  
生成 1536x640 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js BG_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, cozy small apartment room at night, streaming desk with monitor and microphone, window with town lights and sea, wide panoramic strip
```
**`bg.childcare`** — 育児の横長帯背景。1536x640で生成→中央を帯に切り出し  
生成 1536x640 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js BG_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, cozy room with toys, picture books, futon, warm lamp, night window, wide panoramic strip
```
**`bg.factory`** — 工場の横長帯背景。1536x640で生成→中央を帯に切り出し  
生成 1536x640 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js BG_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, night factory floor, pipes, machines, warm work lights, wide panoramic strip
```
**`bg.rest_light`** — 休息の横長帯背景。1536x640で生成→中央を帯に切り出し  
生成 1536x640 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js BG_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, highly detailed scene, night, blue-violet night sky, warm amber lantern light, glowing teal sea, cozy, vertical composition, mobile game background, cinematic lighting, quiet room with dim lamp, tea cup, window with moonlight, wide panoramic strip
```
</details>

### 立ち絵・SD

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `sd.dan.normal` | だんのうら SD normal | `assets/img/sd_normal.webp` | 240x280（現行120x140の2倍） | yes | full body chibi | 1 | assets/img/sd_normal.webp（IPAdapter 0.7） | openpose：sd_normal.webp から | requested |
| `sd.dan.streamer` | だんのうら SD streamer | `assets/img/sd_streamer.webp` | 240x280（現行120x140の2倍） | yes | full body chibi | 1 | assets/img/sd_streamer.webp（IPAdapter 0.7） | openpose：sd_streamer.webp から | requested |
| `sd.dan.engineer` | だんのうら SD engineer | `assets/img/sd_engineer.webp` | 240x280（現行120x140の2倍） | yes | full body chibi | 1 | assets/img/sd_engineer.webp（IPAdapter 0.7） | openpose：sd_engineer.webp から | requested |
| `sd.dan.tired` | だんのうら SD tired | `assets/img/sd_tired.webp` | 240x280（現行120x140の2倍） | yes | full body chibi | 1 | assets/img/sd_tired.webp（IPAdapter 0.7） | openpose：sd_tired.webp から | requested |
| `sd.dan.collapse` | だんのうら SD collapse | `assets/img/sd_collapse.webp` | 240x280（現行120x140の2倍） | yes | full body chibi | 1 | assets/img/sd_collapse.webp（IPAdapter 0.7） | openpose：sd_collapse.webp から | requested |
| `portrait.kid.outside` | 娘 立ち絵 お出かけ（園服） | `assets/img/child_outside.webp` | 256x256 | yes | bust-up | 1 | portrait.kid.normal 採用画像（IPAdapter 0.7） | lineart：child_normal.svg のPNG | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`sd.dan.normal`** — SDイラスト normal。既存 sd_normal.webp の服装を維持  
生成 896x1152 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js SD_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, chibi, adult androgynous young man, long dark purple hair, side ponytail on the right, black glasses, pink flower hair ornaments, open lavender shirt over pink striped shirt, plum purple trousers, white sneakers, full body, chibi proportions, standing, small smile
```
**`sd.dan.streamer`** — SDイラスト streamer。既存 sd_streamer.webp の服装を維持  
生成 896x1152 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js SD_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, chibi, adult androgynous young man, long dark purple hair, side ponytail on the right, black glasses, pink flower hair ornaments, open lavender shirt over pink striped shirt, plum purple trousers, white sneakers, full body, chibi proportions, holding a microphone, happy open smile
```
**`sd.dan.engineer`** — SDイラスト engineer。既存 sd_engineer.webp の服装を維持  
生成 896x1152 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js SD_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, chibi, adult androgynous young man, long dark purple hair, side ponytail on the right, black glasses, pink flower hair ornaments, open lavender shirt over pink striped shirt, plum purple trousers, white sneakers, full body, chibi proportions, navy work cap and navy overalls instead of shirt, holding a wrench, confident
```
**`sd.dan.tired`** — SDイラスト tired。既存 sd_tired.webp の服装を維持  
生成 896x1152 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js SD_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, adult, androgynous young man, fluffy messy white hair with lavender tint, white cat ears with pink inner ear, purple eyes, black rectangular glasses, pink five-petal flower hair ornaments, magenta pink hooded jacket with white fur-lined hood, black inner shirt with round pendant, full body, chibi proportions, chibi, fluffy white cat tail, standing tiredly, black trousers
```
**`sd.dan.collapse`** — SDイラスト collapse。既存 sd_collapse.webp の服装を維持  
生成 896x1152 ／ seed 110101 ／ negative `N_PORTRAIT` ／ 登録先：game.js SD_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, adult, androgynous young man, fluffy messy white hair with lavender tint, white cat ears with pink inner ear, purple eyes, black rectangular glasses, pink five-petal flower hair ornaments, magenta pink hooded jacket with white fur-lined hood, black inner shirt with round pendant, full body, chibi proportions, chibi, sitting slumped on floor hugging knees, cat tail, faint blue flame wisps
```
**`portrait.kid.outside`** — 外出時：黄色い帽子・水色スモック・黄色い長靴  
生成 1024x1024 ／ seed 120101 ／ negative `N_KID` ／ 登録先：game.js CHILD_IMG に outside キーを追加（使う場面の実装は別作業）
```text
best quality, high detail, pixel art, anime style, bust-up portrait, upper body, facing viewer, slight three-quarter view, clean dark outline, limited palette, cel shading, soft warm amber rim light, centered, simple plain background, 1girl, small child, 4 years old, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails with pink flower hair ties, big round purple eyes, pink cheeks, round yellow hat, sky-blue kindergarten smock, yellow rain boots, happy smile, ready to go out
```
</details>

### UI部品

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `ui.panel` | UIパネル枠（9スライス） | `assets/img/ui/panel_9slice.png ／ godot/assets/sprites/ui/panel_9slice.png` | 96x96（角32px・9スライス） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（下部パネル） | lineart：角丸矩形の下絵 | requested |
| `ui.button_primary` | 主ボタン（金） | `assets/img/ui/button_primary_9slice.png ／ godot/assets/sprites/ui/button_primary_9slice.png` | 96x48（左右端16px・9スライス） | yes | front | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.button_secondary` | 副ボタン（紺） | `assets/img/ui/button_secondary_9slice.png ／ godot/assets/sprites/ui/button_secondary_9slice.png` | 96x48（左右端16px・9スライス） | yes | front | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.vpad` | 仮想パッド（十字＋スティック） | `assets/img/ui/vpad.png ／ godot/assets/sprites/ui/vpad.png` | 192x192 ×2（十字・スティック台座） | yes | front | 1 | look_ref_3（参考画像3：コメント撃退/買い出しダッシュ/夜勤の第三工場/原付で夜勤へ/起こさないで家事/深夜の工場巡回） | なし | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`ui.panel`** — 紺地＋金縁のパネル。中央は無地（伸ばすため）。角は32px以内に収める  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：style.css / style-home.css の border-image（追加は別作業）。Godot は StyleBoxTexture
```text
best quality, high detail, pixel art game ui element, dark navy blue panel, thin gold trim border, rounded corners, flat, clean, front view, no text, empty rectangular panel, dark navy fill, thin double gold border, small corner ornaments
```
**`ui.button_primary`** — 「ここに置く」「つづける」などの金色ボタン。文字は入れない  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：CSS border-image / Godot StyleBoxTexture
```text
best quality, high detail, pixel art game ui element, dark navy blue panel, thin gold trim border, rounded corners, flat, clean, front view, no text, wide rounded button, warm golden yellow fill, cream highlight on top, darker gold outline, empty center
```
**`ui.button_secondary`** — 「お話を聞く」などの紺ボタン。文字なし  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：CSS border-image / Godot StyleBoxTexture
```text
best quality, high detail, pixel art game ui element, dark navy blue panel, thin gold trim border, rounded corners, flat, clean, front view, no text, wide rounded button, dark navy fill, thin gold outline, empty center
```
**`ui.vpad`** — 参考画像の青いパッド  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：minigames/core.js のタッチ操作（画像化は別作業）
```text
best quality, high detail, pixel art game ui element, dark navy blue panel, thin gold trim border, rounded corners, flat, clean, front view, no text, circular virtual joystick base with four direction arrows, translucent dark navy with glowing blue rim
```
</details>

### UIアイコン

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `ui.icon.heart` | アイコン ハート（精神） | `assets/img/ui/icon_heart.png ／ godot/assets/sprites/ui/icon_heart.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.bulb` | アイコン 電球（ひらめき） | `assets/img/ui/icon_bulb.png ／ godot/assets/sprites/ui/icon_bulb.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.gem` | アイコン 青い宝石 | `assets/img/ui/icon_gem.png ／ godot/assets/sprites/ui/icon_gem.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.mat_wood` | アイコン 素材：木材 | `assets/img/ui/icon_mat_wood.png ／ godot/assets/sprites/ui/icon_mat_wood.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.mat_cloth` | アイコン 素材：布 | `assets/img/ui/icon_mat_cloth.png ／ godot/assets/sprites/ui/icon_mat_cloth.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.mat_metal` | アイコン 素材：金具 | `assets/img/ui/icon_mat_metal.png ／ godot/assets/sprites/ui/icon_mat_metal.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.mat_sea` | アイコン 素材：海のかけら | `assets/img/ui/icon_mat_sea.png ／ godot/assets/sprites/ui/icon_mat_sea.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.home` | アイコン 家 | `assets/img/ui/icon_home.png ／ godot/assets/sprites/ui/icon_home.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.minigame` | アイコン ミニゲーム | `assets/img/ui/icon_minigame.png ／ godot/assets/sprites/ui/icon_minigame.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.save` | アイコン セーブ | `assets/img/ui/icon_save.png ／ godot/assets/sprites/ui/icon_save.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.memories` | アイコン 思い出帳 | `assets/img/ui/icon_memories.png ／ godot/assets/sprites/ui/icon_memories.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.settings` | アイコン 設定 | `assets/img/ui/icon_settings.png ／ godot/assets/sprites/ui/icon_settings.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.bag` | アイコン もちもの | `assets/img/ui/icon_bag.png ／ godot/assets/sprites/ui/icon_bag.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.back` | アイコン 戻る | `assets/img/ui/icon_back.png ／ godot/assets/sprites/ui/icon_back.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.pause` | アイコン 一時停止 | `assets/img/ui/icon_pause.png ／ godot/assets/sprites/ui/icon_pause.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.check` | アイコン 決定 | `assets/img/ui/icon_check.png ／ godot/assets/sprites/ui/icon_check.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.talk` | アイコン 語る・話す | `assets/img/ui/icon_talk.png ／ godot/assets/sprites/ui/icon_talk.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.repair` | アイコン 直す | `assets/img/ui/icon_repair.png ／ godot/assets/sprites/ui/icon_repair.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.guard` | アイコン 守る | `assets/img/ui/icon_guard.png ／ godot/assets/sprites/ui/icon_guard.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.sing` | アイコン 歌う | `assets/img/ui/icon_sing.png ／ godot/assets/sprites/ui/icon_sing.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.rotate` | アイコン 回転 | `assets/img/ui/icon_rotate.png ／ godot/assets/sprites/ui/icon_rotate.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.store` | アイコン しまう | `assets/img/ui/icon_store.png ／ godot/assets/sprites/ui/icon_store.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.place` | アイコン 置く | `assets/img/ui/icon_place.png ／ godot/assets/sprites/ui/icon_place.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.water` | アイコン 水やり | `assets/img/ui/icon_water.png ／ godot/assets/sprites/ui/icon_water.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.craft` | アイコン クラフト | `assets/img/ui/icon_craft.png ／ godot/assets/sprites/ui/icon_craft.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.interact` | アイコン 調べる（手） | `assets/img/ui/icon_interact.png ／ godot/assets/sprites/ui/icon_interact.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.search` | アイコン 調べる（虫めがね） | `assets/img/ui/icon_search.png ／ godot/assets/sprites/ui/icon_search.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.run` | アイコン 走る | `assets/img/ui/icon_run.png ／ godot/assets/sprites/ui/icon_run.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.jump` | アイコン ジャンプ | `assets/img/ui/icon_jump.png ／ godot/assets/sprites/ui/icon_jump.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.brake` | アイコン ブレーキ | `assets/img/ui/icon_brake.png ／ godot/assets/sprites/ui/icon_brake.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.flashlight` | アイコン 懐中電灯 | `assets/img/ui/icon_flashlight.png ／ godot/assets/sprites/ui/icon_flashlight.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.idcard` | アイコン 社員証 | `assets/img/ui/icon_idcard.png ／ godot/assets/sprites/ui/icon_idcard.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.eye` | アイコン 振り返る | `assets/img/ui/icon_eye.png ／ godot/assets/sprites/ui/icon_eye.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.ear` | アイコン 耳を澄ます | `assets/img/ui/icon_ear.png ／ godot/assets/sprites/ui/icon_ear.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.photo` | アイコン 思い出を見る | `assets/img/ui/icon_photo.png ／ godot/assets/sprites/ui/icon_photo.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.calendar` | アイコン 予定 | `assets/img/ui/icon_calendar.png ／ godot/assets/sprites/ui/icon_calendar.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.catshield` | アイコン まもる（猫の盾） | `assets/img/ui/icon_catshield.png ／ godot/assets/sprites/ui/icon_catshield.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.icon.bait` | アイコン エサ | `assets/img/ui/icon_bait.png ／ godot/assets/sprites/ui/icon_bait.png` | 64x64（論理32ドット×2） | yes | front | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）／look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所） | なし | requested |
| `ui.home_icons` | 家・庭UIアイコン一式（13） | `assets/img/home/ui_icons.png ／ godot/assets/sprites/ui/<name>.png（1つ1ファイル）` | 32x32 ×13 横並び（416x32） | yes | front | 13（place,rotate,store,undo,redo,craft,memories,close,edit,room,garden,water,talk） | 現行 uiIcon のスクショ | なし | requested |
| `ui.seed_icons` | 種アイコン（あさがお・ひまわり・ハーブ） | `assets/img/home/seed.<種>_default.png ／ godot/assets/sprites/icons/seed.<種>_default.png` | 48x48 ×3 | yes | front | 3 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り） | なし | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`ui.icon.heart`** — ハート（精神）（ステータス）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（ステータスの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, red heart
```
**`ui.icon.bulb`** — 電球（ひらめき）（ステータス）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（ステータスの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, yellow light bulb
```
**`ui.icon.gem`** — 青い宝石（ステータス）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（ステータスの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, blue faceted gem
```
**`ui.icon.mat_wood`** — 素材：木材（素材（main/integrations.js 🪵））。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（素材（main/integrations.js 🪵）の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, stack of wooden planks
```
**`ui.icon.mat_cloth`** — 素材：布（素材（🧵））。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（素材（🧵）の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, folded pastel cloth
```
**`ui.icon.mat_metal`** — 素材：金具（素材（🔩））。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（素材（🔩）の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, metal bolt and L bracket
```
**`ui.icon.mat_sea`** — 素材：海のかけら（素材（🐚））。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（素材（🐚）の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, teal sea glass shard and small seashell
```
**`ui.icon.home`** — 家（メニュー 🏠）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（メニュー 🏠の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, small cozy house
```
**`ui.icon.minigame`** — ミニゲーム（メニュー 🎮）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（メニュー 🎮の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, game controller
```
**`ui.icon.save`** — セーブ（メニュー 💾）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（メニュー 💾の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, floppy-like save card
```
**`ui.icon.memories`** — 思い出帳（メニュー 📖）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（メニュー 📖の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, closed memory book with a flower
```
**`ui.icon.settings`** — 設定（メニュー）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（メニューの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, gear
```
**`ui.icon.bag`** — もちもの（メニュー）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（メニューの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, small leather backpack
```
**`ui.icon.back`** — 戻る（共通）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（共通の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, left chevron arrow
```
**`ui.icon.pause`** — 一時停止（共通）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（共通の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, pause symbol two bars
```
**`ui.icon.check`** — 決定（共通）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（共通の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, check mark in circle
```
**`ui.icon.talk`** — 語る・話す（RPG/家）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（RPG/家の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, speech bubble with three dots
```
**`ui.icon.repair`** — 直す（RPG/家）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（RPG/家の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, wrench
```
**`ui.icon.guard`** — 守る（RPG）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（RPGの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, blue shield
```
**`ui.icon.sing`** — 歌う（RPG）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（RPGの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, pink music note
```
**`ui.icon.rotate`** — 回転（模様替え）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（模様替えの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, circular rotate arrows
```
**`ui.icon.store`** — しまう（模様替え）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（模様替えの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, open cardboard box
```
**`ui.icon.place`** — 置く（模様替え）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（模様替えの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, down arrow onto tile
```
**`ui.icon.water`** — 水やり（家）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（家の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, watering can with droplets
```
**`ui.icon.craft`** — クラフト（家）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（家の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, hammer and saw
```
**`ui.icon.interact`** — 調べる（手）（探索）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（探索の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, open hand
```
**`ui.icon.search`** — 調べる（虫めがね）（探索）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（探索の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, magnifying glass
```
**`ui.icon.run`** — 走る（工場）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（工場の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, running figure silhouette
```
**`ui.icon.jump`** — ジャンプ（ダッシュ）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（ダッシュの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, jumping figure silhouette with arc
```
**`ui.icon.brake`** — ブレーキ（レース）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（レースの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, red brake disc
```
**`ui.icon.flashlight`** — 懐中電灯（巡回）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（巡回の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, flashlight
```
**`ui.icon.idcard`** — 社員証（巡回）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（巡回の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, id card
```
**`ui.icon.eye`** — 振り返る（怪談）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（怪談の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, eye
```
**`ui.icon.ear`** — 耳を澄ます（怪談）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（怪談の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, ear
```
**`ui.icon.photo`** — 思い出を見る（エンディング）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（エンディングの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, picture frame with mountain
```
**`ui.icon.calendar`** — 予定（運営会議）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（運営会議の絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, calendar
```
**`ui.icon.catshield`** — まもる（猫の盾）（シューティング）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（シューティングの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, shield with cat face emblem
```
**`ui.icon.bait`** — エサ（釣り）。32×32に縮めても形が読めること  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：未登録（釣りの絵文字置き換え候補。差し替えは別作業）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, small shrimp
```
**`ui.home_icons`** — 順番：place / rotate / store / undo / redo / craft / memories / close / edit / room / garden / water / talk。1つずつ生成して並べてもよい  
生成 1536x640 ／ seed 400101 ／ negative `N_UI` ／ 登録先：HOME_ART.uiIcon（コード描画）→ 画像化は別作業
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, icon set in a row, down arrow onto tile, circular arrows, open box, curved arrow left, curved arrow right, hammer and saw, memory book, x mark, pencil and ruler, house interior with window, sprout in soil, watering can, speech bubble
```
**`ui.seed_icons`** — 種の小袋。文字は入れず花の絵で区別  
生成 1024x1024 ／ seed 400101 ／ negative `N_UI` ／ 登録先：HOME_ART.icon（コード描画）
```text
best quality, high detail, pixel art game ui icon, centered simple symbol, bold readable silhouette, gold and cream symbol, dark navy background plate, flat colors, clean dark outline, small paper seed packet with picture of a flower, three variants: morning glory, sunflower, herb
```
</details>

## P3 — イベントCG・エンディング絵

### イベントCG・エンディング

| id | 名前 | 置き場所 | サイズ | 透過 | 視点 | コマ・向き | 参考画像 | ControlNet | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| `cg.home_return` | イベントCG 「帰る場所」エンディング | `assets/img/cg/home_return.webp ／ godot/assets/sprites/bg/cg_home_return.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.parent_talk` | イベントCG 親子の会話 | `assets/img/cg/parent_talk.webp ／ godot/assets/sprites/bg/cg_parent_talk.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.rpg_ch1` | イベントCG 第一章 声の灯 | `assets/img/cg/rpg_ch1.webp ／ godot/assets/sprites/bg/cg_rpg_ch1.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.rpg_ch2` | イベントCG 第二章 手の灯 | `assets/img/cg/rpg_ch2.webp ／ godot/assets/sprites/bg/cg_rpg_ch2.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.rpg_ch3` | イベントCG 第三章 約束の灯 | `assets/img/cg/rpg_ch3.webp ／ godot/assets/sprites/bg/cg_rpg_ch3.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.rpg_ch4` | イベントCG 第四章 眠りの灯 | `assets/img/cg/rpg_ch4.webp ／ godot/assets/sprites/bg/cg_rpg_ch4.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.rpg_ch5` | イベントCG 第五章 名前の灯 | `assets/img/cg/rpg_ch5.webp ／ godot/assets/sprites/bg/cg_rpg_ch5.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.promise_plant` | イベントCG 約束：一緒に植える | `assets/img/cg/promise_plant.webp ／ godot/assets/sprites/bg/cg_promise_plant.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.promise_tag` | イベントCG 約束：名札をもらう | `assets/img/cg/promise_tag.webp ／ godot/assets/sprites/bg/cg_promise_tag.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.promise_reason` | イベントCG 約束：見えるところに | `assets/img/cg/promise_reason.webp ／ godot/assets/sprites/bg/cg_promise_reason.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.chiyo_radio` | イベントCG 千代さんのラジオ | `assets/img/cg/chiyo_radio.webp ／ godot/assets/sprites/bg/cg_chiyo_radio.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.hancho_toolbox` | イベントCG 班長の工具箱 | `assets/img/cg/hancho_toolbox.webp ／ godot/assets/sprites/bg/cg_hancho_toolbox.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_1（参考画像1：家づくり/庭づくり/海底の探索/灯を守る戦闘/夜食づくり/夜釣り）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.recital_photo` | イベントCG 発表会 | `assets/img/cg/recital_photo.webp ／ godot/assets/sprites/bg/cg_recital_photo.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `cg.life_mode` | イベントCG 暮らしを続ける | `assets/img/cg/life_mode.webp ／ godot/assets/sprites/bg/cg_life_mode.webp` | 540x960 | no | scene（縦9:16） | 1 | look_ref_2（参考画像2：夜の暮らし/親子の会話/運営会議/壇ノ浦夢譚/怪談配信/帰る場所）（スタイル 0.4）＋各キャラの採用立ち絵（IPAdapter FaceID/regional 推奨） | openpose：人物の配置を棒人形で（2人以上なら必須） | requested |
| `ending.rebirth` | エンディング絵 再起 | `assets/img/ending_rebirth.webp` | 640x960（現行320x480の2倍） | no | scene（縦2:3） | 1 | assets/img/ending_rebirth.webp（構図）＋ char_*.webp | depth：ending_rebirth.webp から | requested |
| `ending.king` | エンディング絵 配信王 | `assets/img/ending_king.webp` | 640x960（現行320x480の2倍） | no | scene（縦2:3） | 1 | assets/img/ending_king.webp（構図）＋ char_*.webp | depth：ending_king.webp から | requested |
| `ending.engineer` | エンディング絵 技術者 | `assets/img/ending_engineer.webp` | 640x960（現行320x480の2倍） | no | scene（縦2:3） | 1 | assets/img/ending_engineer.webp（構図）＋ char_*.webp | depth：ending_engineer.webp から | requested |
| `ending.father` | エンディング絵 父として | `assets/img/ending_father.webp` | 640x960（現行320x480の2倍） | no | scene（縦2:3） | 1 | assets/img/ending_father.webp（構図）＋ char_*.webp | depth：ending_father.webp から | requested |
| `ending.debtfree` | エンディング絵 完済 | `assets/img/ending_debtfree.webp` | 640x960（現行320x480の2倍） | no | scene（縦2:3） | 1 | assets/img/ending_debtfree.webp（構図）＋ char_*.webp | depth：ending_debtfree.webp から | requested |
| `ending.normal` | エンディング絵 ふつう | `assets/img/ending_normal.webp` | 640x960（現行320x480の2倍） | no | scene（縦2:3） | 1 | assets/img/ending_normal.webp（構図）＋ char_*.webp | depth：ending_normal.webp から | requested |
| `ending.collapse` | エンディング絵 倒れる | `assets/img/ending_collapse.webp` | 640x960（現行320x480の2倍） | no | scene（縦2:3） | 1 | assets/img/ending_collapse.webp（構図）＋ char_*.webp | depth：ending_collapse.webp から | requested |
| `ending.flame` | エンディング絵 炎上 | `assets/img/ending_flame.webp` | 640x960（現行320x480の2倍） | no | scene（縦2:3） | 1 | assets/img/ending_flame.webp（構図）＋ char_*.webp | depth：ending_flame.webp から | requested |

<details><summary>プロンプト（positive / negative ブロック・メモ）</summary>

**`cg.home_return`** — 「帰る場所」エンディング。ending 良い結末・暮らしを続ける画面。登場：DAN | KID（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（ending 良い結末・暮らしを続ける画面）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), sunset over the bay seen from a flower-filled garden, father and small daughter sitting together on a wooden bench from behind, calico cat beside them, teddy bear with frayed left ear, small wooden garden sign, lanterns, flowers, lighthouse
```
**`cg.parent_talk`** — 親子の会話。窓辺の小さな約束・会話イベント。登場：DAN | KID（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（窓辺の小さな約束・会話イベント）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), small daughter smiling widely holding up a hand-made wooden flower sign decorated with purple flowers, father leaning in smiling gently, warm lantern, night sea in background
```
**`cg.rpg_ch1`** — 第一章 声の灯。RPG 章タイトルカード。登場：MINAMO（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（RPG 章タイトルカード）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles), sunken dream shrine under glowing teal sea, a single lantern holding a faint voice-like ripple of light, jellyfish, ruins
```
**`cg.rpg_ch2`** — 第二章 手の灯。RPG 第2章「手の灯／海底の工場」章カード。登場：MINAMO | DAN（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（RPG 第2章「手の灯／海底の工場」章カード）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles), (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), underwater ruined factory town, rusted chains and gears, a warm lantern held in two hands glowing, torii gate silhouette, ghostly girl helping a man repair a broken lamp
```
**`cg.rpg_ch3`** — 第三章 約束の灯。RPG 章カード（約束＝おゆうぎかい）。登場：MINAMO（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（RPG 章カード（約束＝おゆうぎかい））。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles), underwater kindergarten stage with tiny paper decorations, a lantern tied with a pink ribbon, pinky promise silhouette of a parent and child
```
**`cg.rpg_ch4`** — 第四章 眠りの灯。RPG 章カード。登場：MINAMO（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（RPG 章カード）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles), quiet sunken bedroom in the dream sea, futon with star pattern, sleeping lantern dimly glowing, floating fish, soft calm
```
**`cg.rpg_ch5`** — 第五章 名前の灯。RPG 章カード。登場：MINAMO（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（RPG 章カード）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (girl, dream-sea spirit, long straight light-blue hair, pink seashell hair ornament, pale skin, blue eyes, white dress with lace collar, translucent glowing edges, floating bubbles), dream sea opening toward dawn, a path of lanterns leading upward, a wooden house nameplate glowing, ghostly girl waving goodbye
```
**`cg.promise_plant`** — 約束：一緒に植える。窓辺の小さな約束 2。登場：DAN | KID（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（窓辺の小さな約束 2）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), father and small daughter planting a flower in a pot together at a window at night, warm lamp light
```
**`cg.promise_tag`** — 約束：名札をもらう。窓辺の小さな約束 3。登場：DAN | KID（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（窓辺の小さな約束 3）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), small daughter proudly handing a wooden flower name tag to her father, garden at dusk
```
**`cg.promise_reason`** — 約束：見えるところに。窓辺の小さな約束 5（「パパが帰ってきたとき、見えるところにしたかったの」）。登場：KID（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（窓辺の小さな約束 5（「パパが帰ってきたとき、見えるところにしたかったの」））。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), small daughter at a window beside a blooming flower pot, looking outside waiting, father coming home in the distance under streetlight
```
**`cg.chiyo_radio`** — 千代さんのラジオ。千代さんイベント。登場：CHIYO | KID（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（千代さんイベント）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (elderly woman, kind neighbor, silver-white hair in a bun with a red hairpin, round gold-rimmed glasses, gentle wrinkles, deep crimson cardigan, slightly bent posture), (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), elderly neighbor woman handing an old wooden radio over a hedge, small daughter peeking, evening garden
```
**`cg.hancho_toolbox`** — 班長の工具箱。班長イベント。登場：HANCHO | DAN（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（班長イベント）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (middle-aged man, factory team leader, yellow hard hat with a green cross emblem, short dark hair, light stubble, firm eyebrows, navy work uniform jacket with name tag), (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), factory team leader in yellow hard hat giving an old red toolbox, father beside a repaired shelf, day off at home
```
**`cg.recital_photo`** — 発表会。本編 27日 発表会（写真の元絵にも）。登場：KID | DAN（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（本編 27日 発表会（写真の元絵にも））。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), small daughter on a kindergarten stage in a simple flower costume, father clapping in the audience
```
**`cg.life_mode`** — 暮らしを続ける。クリア後の暮らしモード。登場：DAN | KID（各キャラのタグブロックを1人ずつ短く足す）。文字・UIは入れない  
生成 768x1344 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：未登録（クリア後の暮らしモード）。表示処理の追加は別作業
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), morning garden full of flowers, string lights, clothesline with small dress, family of father, daughter and calico cat in soft morning light
```
**`ending.rebirth`** — エンディング「再起」の差し替え。既存 ending_rebirth.webp の内容・雰囲気を引き継ぐ  
生成 832x1216 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js ENDING_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), man standing at dawn by the sea, new start, sunrise
```
**`ending.king`** — エンディング「配信王」の差し替え。既存 ending_king.webp の内容・雰囲気を引き継ぐ  
生成 832x1216 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js ENDING_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), triumphant streamer at a glowing desk with confetti-like light particles
```
**`ending.engineer`** — エンディング「技術者」の差し替え。既存 ending_engineer.webp の内容・雰囲気を引き継ぐ  
生成 832x1216 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js ENDING_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), proud factory engineer in navy overalls holding a certificate, factory at sunrise
```
**`ending.father`** — エンディング「父として」の差し替え。既存 ending_father.webp の内容・雰囲気を引き継ぐ  
生成 832x1216 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js ENDING_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), father carrying sleepy daughter on his back walking home under lanterns
```
**`ending.debtfree`** — エンディング「完済」の差し替え。既存 ending_debtfree.webp の内容・雰囲気を引き継ぐ  
生成 832x1216 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js ENDING_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), relieved man stretching arms by an open window, bright morning
```
**`ending.normal`** — エンディング「ふつう」の差し替え。既存 ending_normal.webp の内容・雰囲気を引き継ぐ  
生成 832x1216 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js ENDING_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (1girl, small child, 4 years old, round face, purple-black chin-length bob hair, straight blunt bangs, two tiny twin tails tied with pink flower hair ties, big round purple eyes with white highlights, pink cheeks, mint green pajamas with small yellow star pattern), (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), quiet ordinary evening at home, daughter drawing, tea
```
**`ending.collapse`** — エンディング「倒れる」の差し替え。既存 ending_collapse.webp の内容・雰囲気を引き継ぐ  
生成 832x1216 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js ENDING_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, adult, androgynous young man, fluffy messy white hair with lavender tint, white cat ears with pink inner ear, purple eyes, black rectangular glasses, pink five-petal flower hair ornaments, magenta pink hooded jacket with white fur-lined hood, black inner shirt with round pendant, exhausted cat-eared white-haired man slumped against a wall in a dark room, blue flame wisps, melancholic
```
**`ending.flame`** — エンディング「炎上」の差し替え。既存 ending_flame.webp の内容・雰囲気を引き継ぐ  
生成 832x1216 ／ seed 300101 ／ negative `N_SCENE` ／ 登録先：game.js ENDING_IMG（同名で上書きなら変更不要）
```text
best quality, high detail, pixel art, anime style, event illustration, highly detailed, cinematic composition, warm amber lantern light, blue-violet night tones, emotional, soft glow, (adult, androgynous young man, long dark purple hair, loose side ponytail on the right, purple eyes, black rectangular glasses, small pink top hat tilted on head, pink five-petal flower hair ornaments, lavender collared shirt), dark room lit by a monitor full of red angry speech bubble shapes, man hiding under a hood
```
</details>

