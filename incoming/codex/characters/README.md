# Codex で作った 3D モデル（PC から持ち込み）

自宅 PC の `C:\Users\user\Documents\Codex\2026-11-07\ver6-0-docx-chatgpt-library-file\outputs\` にある 3D モデルを、このフォルダへ写したものです（2026-11-09 に 11 体、2026-11-13 に 7 体を追加し、写し身を完成版に差し替え）。
境界侵食などに出てくる異形と、巨大猫又です。ゲームへの組み込みはまだしていません（置き場所として入れただけ）。

- **ルーン（`outputs/rune`）は入れていません**。2026-11-07 に「このリポジトリには関係ない」という指示があったためです（`incoming/hq3d` から外したときと同じ扱い）。
- **配偶者に似た異形（spouse_apparition）は作りかけの可能性があります**。元のフォルダに README がなく、2026-11-13 19:26 にも更新されていました。作り方のスクリプトは `work/spouse_apparition/` から写しています。

## 入れたもの

| フォルダ | キャラ | 完成モデル | 編集用 | 参照した原画 |
|---|---|---|---|---|
| `inmate_standard/` | 収容者（旧研究棟）・通常個体 | `inmate_standard.glb` | `inmate_standard.blend` | ChatGPT 画像 2026-11-07 22_00_08 |
| `shuyosha/` | 収容者・肩に扉を持つ通常個体 | `shuyosha.glb` | `shuyosha.blend` | ChatGPT 画像 2026-11-08 13_32_52 |
| `shuyosha_v2/` | 同上の改訂版 | `shuyosha.glb` | `shuyosha.blend` | 同上 |
| `heiten/` | 閉店（へいてん）・通常個体 | `heiten.glb` | `heiten.blend` | ChatGPT 画像 2026-11-08 06_35_31 |
| `tsugihagi/` | 継接（つぎはぎ）・中ボス | `tsugihagi.glb` | `tsugihagi.blend` | ChatGPT 画像 2026-11-08 13_35_27 |
| `mohosha/` | 模倣者（もほうしゃ） | `mohosha.glb` | `mohosha.blend` | ChatGPT 画像 2026-11-08 13_35_46 |
| `machibito/` | 待人（まちびと）・通常個体 | `machibito.glb` | `machibito.blend` | ChatGPT 画像 2026-11-08 13_36_04 |
| `outoutai/` | 応答体（おうとうたい）・通常個体 | `outoutai.glb` | `outoutai.blend` | ChatGPT 画像 2026-11-08 13_36_18 |
| `sakibure/` | 境界の先触れ・巨大ボス | `sakibure.glb` | `sakibure.blend` | ChatGPT 画像 2026-11-08 13_36_33 |
| `utsushimi/` | 写し身（うつしみ）・ボス（2026-11-10 の完成版） | `utsushimi.glb` | `utsushimi.blend` | ChatGPT 画像 2026-11-08 13_36_42 |
| `mamorite/` | 守り手（まもりて） | `mamorite.glb` | `mamorite.blend` | ChatGPT 画像 2026-11-08 13_36_53 |
| `unrecorded_patient/` | 記録のない患者 | `unrecorded_patient.glb` | `unrecorded_patient.blend` | ChatGPT 画像 2026-11-08 13_37_05 |
| `nurikae/` | 塗替（ぬりかえ）・巨大ボス | `nurikae.glb` | `nurikae.blend` | ChatGPT 画像 2026-11-08 13_37_23 |
| `tochoku/` | 当直（とうちょく）・中ボス | `tochoku.glb` | `tochoku.blend` | ChatGPT 画像 2026-11-08 13_37_36 |
| `boundary_eater/` | 境界を喰らうもの・最終ボス | `boundary_eater.glb` | `boundary_eater.blend` | ChatGPT 画像 2026-11-08 13_39_06 |
| `researcher/` | 研究者・人間大の最終ボス | `researcher.glb`（Blender 版・動き 4 本）、`replay_afterimages.glb`（残像 2 体）、VRM 4 種（下の表） | `researcher.blend`、`*.vroid`、各版の `.blend` | ご本人が添えた正面・側面・背面・頭部の資料（縮小版が `source/reference.jpg`） |
| `spouse_apparition/` | 配偶者に似た異形 ※作りかけかも | `spouse_apparition.vrm`、`spouse_apparition.glb`、`spouse_animated.glb`（動き 2 本） | `spouse_apparition.blend`、`spouse_studio.vroid` | 元の資料はリポジトリに入れていない |
| `nekomata/` | 巨大猫又（形と毛並みの修正版） | `nekomata_sculpt.glb`（詳細）・`nekomata_light.glb`（軽量） | `nekomata_sculpt.blend` | 参考デザインと既存の v10 |

各フォルダの中身：

- `*.glb` … 完成モデル（骨・動き・埋め込みの画像入り。撮影用の床や照明は入っていない）
- `*.blend` … Blender の編集用ファイル（撮影用の照明・床も入っている）
- `source/*.py` … モデルを作り直すための Blender スクリプト（`build_*.py` が本体）
- `README.md` … Codex が書いた、そのモデルの説明（各キャラのフォルダの中）
- `validation.json`・`build_stats.json` … 書き出したあとの自動検査の結果
- `*.png`・`*.jpg` … 確認画像（全体・三面図・顔・手・動きごとの画像など。`outputs/` にあったものは全部入れています）

作り直すとき（各フォルダで）：

```
blender -b --factory-startup -P source/build_<名前>.py -- 出力先フォルダー
```

使った道具：Blender 5.2（Khronos glTF Blender I/O v5.2.39）。

## 各モデルのまとめ

ポリゴン数は三角形の数です。骨の数はスキンに使われている骨の数です。全高は制作時の仮の値で、原画に数値の指定はありません。

| キャラ | 形式 | 骨の種類 | 骨の数 | ポリゴン数 | 頂点数 | 動き | シェイプキー | 全高 | 大きさ |
|---|---|---|---|---|---|---|---|---|---|
| 収容者（旧研究棟） | glTF 2.0（.glb） | 自作の人型骨格（指は 1 本ずつ） | 29 | 281,054 | 147,536 | idle・walk | 2 | 約 2.0m | 15.7MB |
| 収容者・肩に扉 | glTF 2.0 | 同上 | 28 | 543,268 | 494,116 | idle・charge_ready・reach_pull | 2 | 約 2.08m | 37.3MB |
| 収容者・肩に扉 v2 | glTF 2.0 | 同上 | 28 | 526,334 | 485,604 | 同上 | 2 | 約 2.00m | 38.3MB |
| 閉店 | glTF 2.0 | 同上 | 28 | 522,612 | 281,362 | idle・closing_gesture | 1（目のシャッター） | 約 2.15m | 27.1MB |
| 継接 | glTF 2.0 | 同上＋背負った袋の骨 | 29 | 231,042 | 127,245 | idle・knock・protect_bag・walk_in_place | 2 | 2.57m | 17.0MB |
| 模倣者 | glTF 2.0 | 同上 | 28 | 337,694 | 170,650 | idle・head_tilt・reach・walk_in_place | 6 | 2.24m | 17.8MB |
| 待人 | glTF 2.0 | 同上（首は 4 節） | 31 | 307,902 | 162,738 | idle・check_watch・look_around・wait | なし | 2.57m | 22.0MB |
| 応答体 | glTF 2.0 | 同上＋頭上の輪の骨 | 29 | 448,864 | 229,937 | idle・acknowledge・respond・standby | なし | 2.55m（輪を含む） | 16.0MB |
| 境界の先触れ | glTF 2.0 | 自作の巨大ボス骨格（爪・鉤爪） | 23 | 408,500 | 211,918 | idle・core_pulse・devour・sweep | なし | 18.0m（幅 52.3m） | 23.3MB |
| 写し身 | glTF 2.0 | 自作の骨格（尾 3 節つき） | 31 | 23,544 | 20,208 | idle・head_tilt・mimic_pose・reaching_lunge | なし | 約 3.33m | 7.9MB |
| 守り手 | glTF 2.0 | 自作の人型骨格 | 29 | 354,500 | 184,696 | idle・protect_ground・push_back・recoil | なし | 1.94m | 19.6MB |
| 記録のない患者 | glTF 2.0 | 自作の人型骨格＋点滴台 | 34 | 422,364 | 220,238 | idle・hold_record・search_record・walk_in_place | なし | 2.41m（点滴台込み） | 22.9MB |
| 塗替 | glTF 2.0 | 自作の巨大ボス骨格（電線・爪） | 86 | 518,320 | 279,666 | idle・cable_sweep・core_pulse・repaint | なし | 20m（原画の「約 20m」） | 23.9MB |
| 当直 | glTF 2.0 | 自作の人型骨格（圧力計の針つき） | 26 | 450,799 | 259,780 | idle・patrol・restart・steam_brace | なし | 2.485m | 26.8MB |
| 境界を喰らうもの | glTF 2.0 | 自作の骨格（翼 6 枚・根の脚 4 本） | 36 | 813,668 | 433,448 | idle・abyss_gaze・devour・wing_sweep | なし | 12m | 35.1MB |
| 研究者（Blender 版） | glTF 2.0 | 自作の人型骨格 | 32 | 183,576 | 98,351 | idle・record_check・accident_replay・neutralized | なし | 1.78m | 6.7MB |
| 研究者（残像） | glTF 2.0 | なし（止まった姿 2 体） | 0 | 367,152 | 196,900 | なし | なし | — | 8.1MB |
| 研究者（`研究者.vrm`・`研究者_調整版.vrm`） | VRM 1.0 | VRoid 人型骨格（Humanoid 54 本）＋揺れもの | 119（80） | 38,536 | 27,282 | なし | 57 | — | 13.8／17.6MB |
| 研究者（`blender_refined`・`natural_face` の .vrm／.glb） | VRM 1.0／glTF 2.0 | 同上 | 119（80） | 99,694 | 67,090 | なし | 57 | — | 29.8〜32.2MB |
| 配偶者に似た異形 | VRM 1.0（.vrm）／glTF 2.0（.glb） | VRoid 人型骨格（Humanoid 54 本）＋揺れもの | 112（78） | 91,195 | 55,220 | `spouse_animated.glb` に Look_back・Wait | 57 | — | 25.1MB（.vrm） |
| 巨大猫又（詳細） | glTF 2.0 | 自作の四つ足骨格（`incoming/hq3d` の猫又と同じ骨の名前） | 34 | 1,275,182 | 771,184 | idle | 13（まばたき＋表情 12） | — | 46.5MB |
| 巨大猫又（軽量） | glTF 2.0 | 同上 | 34 | 543,380 | 318,092 | idle | 13 | — | 19.0MB |

- 研究者と配偶者に似た異形には VRM があります（VRoid Studio 2.3.0 で作った体を元にしたもの）。ほかは VRM ではありません。Cast Engine やゲームの中で動くかどうかは、どれも確かめていません。
- ほとんどが 20 万〜120 万ポリゴンです。ゲームでそのまま使うには重く、軽い版（LOD・作り直し）は作っていません。
- 研究者の `blender_refined`・`natural_face` を作ったスクリプトは `researcher/source/work_scripts/` に入っています（PC 側の `work/researcher/` から写した作業用のもの）。

## ライセンス

| 素材 | 出どころ | 条件 |
|---|---|---|
| モデル本体（形・骨・動き・色） | Codex が Blender のスクリプト（`source/`）で一から作ったもの。スクリプトは外の画像・モデル・素材集を読み込んでいない | 自作 |
| 参照した原画 | ご本人が ChatGPT で作った画像（このリポジトリには入れていない） | ChatGPT（OpenAI）の利用規約に従う。出力の権利は利用者に属する |
| 埋め込みの画像 | スクリプトの中で描いたもの。研究者だけは、ご本人の資料（`source/reference.jpg`）から切り出して貼った画像（`source/textures/*.jpg`） | 自作／ご本人の資料 |
| 研究者・配偶者に似た異形の体の元 | VRoid Studio 2.3.0 の標準パーツ | VRoid Studio の利用規約に従う（作った人がモデルを利用・商用利用できる） |

- .glb には利用条件の書き込みはありません。
- VRM（研究者 4 種・配偶者に似た異形）には **VRM Public License 1.0** が書き込まれています。条件は「作者のみ・個人の非営利のみ・再配布不可・改変不可」です。作者名は、研究者が「境界侵食 制作」、配偶者に似た異形が「WAKABA Project」です。商用で使う前に書き換えが必要です。
- このリポジトリは公開されているので、このモデルは誰でも見たり取得したりできます。

## 入れなかったもの

**100MB を超えるファイル：なし**（2026-11-13 に元のフォルダ全体を調べ直しました。いちばん大きいのは `nekomata_sculpt.glb` の 46.5MB です）。

2026-11-13 に、ルーン以外の `outputs/` の中身（確認画像を含む）はすべて入れました。入れていないのは次だけです（PC 側には残っています）：

| 入れなかったもの | 理由 |
|---|---|
| `rune/`（約 91MB） | このリポジトリには関係ないという指示があったため |
| `*.blend1` | Blender が自動で作る、1 つ前の保存の控え |
| 配偶者に似た異形の作業用の画像（`work/spouse_apparition/*.jpg`・`tex*.png`）と `studio_export.vrm` | 作業の途中のもの。完成品は `outputs/` から入れています |
