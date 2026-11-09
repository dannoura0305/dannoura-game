# Codex で作った 3D モデル（PC から持ち込み）

自宅 PC の `C:\Users\user\Documents\Codex\2026-11-07\ver6-0-docx-chatgpt-library-file\outputs\` にある 3D モデルを、2026-11-09 にこのフォルダへ写したものです。
境界侵食などに出てくる異形と、巨大猫又です。ゲームへの組み込みはまだしていません（置き場所として入れただけ）。

- **ルーン（`outputs/rune`）は入れていません**。2026-11-07 に「このリポジトリには関係ない」という指示があったためです（`incoming/hq3d` から外したときと同じ扱い）。
- **写し（utsushimi）は作りかけ**です。元のフォルダに README がなく、2026-11-09 19:58 にも更新されていました。作り方のスクリプトは `work/utsushimi/` から写しています。

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
| `utsushimi/` | 写し（うつしみ）※作りかけ | `utsushimi.glb` | `utsushimi.blend` | ChatGPT 画像 2026-11-08 13_36_42 |
| `nekomata/` | 巨大猫又（形と毛並みの修正版） | `nekomata_sculpt.glb`（詳細）・`nekomata_light.glb`（軽量） | `nekomata_sculpt.blend` | 参考デザインと既存の v10 |

各フォルダの中身：

- `*.glb` … 完成モデル（骨・動き・埋め込みの画像入り。撮影用の床や照明は入っていない）
- `*.blend` … Blender の編集用ファイル（撮影用の照明・床も入っている）
- `source/*.py` … モデルを作り直すための Blender スクリプト（`build_*.py` が本体）
- `README.md` … Codex が書いた、そのモデルの説明（各キャラのフォルダの中）
- `validation.json`・`build_stats.json` … 書き出したあとの自動検査の結果
- `preview.png`・`three_views.png` … 確認画像（全体・三面図）

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
| 写し ※作りかけ | glTF 2.0 | 自作の骨格（尾 3 節つき） | 31 | 22,366 | 19,681 | idle・head_tilt・mimic_pose・reaching_lunge | なし | 約 3.33m | 7.9MB |
| 巨大猫又（詳細） | glTF 2.0 | 自作の四つ足骨格（`incoming/hq3d` の猫又と同じ骨の名前） | 34 | 1,275,182 | 771,184 | idle | 13（まばたき＋表情 12） | — | 46.5MB |
| 巨大猫又（軽量） | glTF 2.0 | 同上 | 34 | 543,380 | 318,092 | idle | 13 | — | 19.0MB |

- どれも VRM ではありません（VRM の設定・利用条件の書き込みはなし）。Cast Engine やゲームの中で動くかどうかは確かめていません。
- ほとんどが 20 万〜120 万ポリゴンです。ゲームでそのまま使うには重く、軽い版（LOD・作り直し）は作っていません。

## ライセンス

| 素材 | 出どころ | 条件 |
|---|---|---|
| モデル本体（形・骨・動き・色） | Codex が Blender のスクリプト（`source/`）で一から作ったもの。スクリプトは外の画像・モデル・素材集を読み込んでいない | 自作 |
| 参照した原画 | ご本人が ChatGPT で作った画像（このリポジトリには入れていない） | ChatGPT（OpenAI）の利用規約に従う。出力の権利は利用者に属する |
| 埋め込みの画像 | スクリプトの中で描いたもの | 自作 |

- モデルに利用条件の書き込みはありません。
- このリポジトリは公開されているので、このモデルは誰でも見たり取得したりできます。

## 入れなかったもの

**100MB を超えるファイル：なし**（元のフォルダ全体 325 ファイル・742MB を調べて、いちばん大きいのは `nekomata_sculpt.glb` の 46.5MB でした）。

次は入れていません（PC 側には残っています）：

| 入れなかったもの | 理由 |
|---|---|
| `rune/`（約 91MB） | このリポジトリには関係ないという指示があったため |
| 確認用の画像のうち `preview.png`・`three_views.png` 以外（顔・手・動きごとの画像など） | 大きさを抑えるため。各 README にはその画像の説明が残っています |
| `utsushimi.blend1` | Blender が自動で作る、1 つ前の保存の控え |
