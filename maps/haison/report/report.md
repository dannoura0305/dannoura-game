# 検証レポート：haison

- 種：`haison-001`／作成：2026-10-17T00:48:33.329Z（claude-code）／仕様：`sha256:f2e1365e4629…`

## 自動の検査

| 項目 | 結果 | 中身 |
|---|---|---|
| deterministic | ✅ 合格 | {"hash":"fp:0b78e3719c3b08","terrain":"950cb13f"} |
| keepOut | ✅ 合格 | {"violations":[],"checked":{"objects":687,"small":18073,"buildings":5,"shapes":225}} |
| float | ✅ 合格 | {"items":[],"counts":{"float":0,"penetrate":0}} |
| overlap | ✅ 合格 | {"items":[],"count":0} |
| reach | ✅ 合格 | {"goals":{"h1.door":134.45,"h2.door":148.74,"h4.door":136.29,"h1.center":141.07,"shrine.front":204.71},"unreachable":[],"ratio":{"h1.door":1.03,"h2.door":1.05," |
| interiors | ✅ 合格 | {"rooms":[{"id":"h1.doma","reach":139.16,"ceiling":2.52,"pass":true},{"id":"h1.washitsu_6","reach":141.07,"ceiling":2.17,"pass":true},{"id":"h1.daidokoro","reac |
| license | ✅ 合格 | {"blocked":[],"note":"目録の素材は使っていない（全部が仮の形＝コードで作る灰色の箱）。実素材はフェーズ 3 で門に通す"} |
| budget | ✅ 合格 | {"preset":"low","drawCalls":21,"tris":87628,"texMB":1,"source":"measured（play_map.mjs・スマホ 844×390）"} |
| perf | （参考） | {"device":"swiftshader","fps":null,"note":"fps は実機で測る（mapkit.html?perf=1）。PC high：描画 41・三角形 297646"} |
| entrances | ✅ 合格 | {"violations":[]} |
| slope | ✅ 合格 | {"items":[],"buildings":[{"id":"h1","slope":0.25},{"id":"h2","slope":0.08},{"id":"h3","slope":0.02},{"id":"h4","slope":0.02},{"id":"shrine","slope":0.71}]} |
| fall | ✅ 合格 | {"edgeCells":10,"guard":"坂 40° を超える所・段差 0.4m を超える所は操作（mapkit/runtime/controller.js）が壁として止める＝落ちない（boundary: invisible_wall_on_cliff）"} |

## 条件

| 条件 | 確かめ方 | 結果 | 根拠 |
|---|---|---|---|
| 霧がある | 自動 | ✅ 合格 | atmosphere.fog.density=0.035 |
| 夕暮れ（仕様の値） | 自動 | ✅ 合格 | atmosphere.time=dusk・sunElevDeg=4 |
| 入れる家が 2 軒以上（中の全部屋に届く） | 自動 | ✅ 合格 | h1,h2,h4・部屋 7 |
| 家の入口 3 つ以上へ歩いて届く（坂 35° 以下・段差 0.4m 以下） | 自動 | ✅ 合格 | h1.door 134.45m・h2.door 148.74m・h4.door 136.29m |
| 祠へ歩いて届く | 自動 | ✅ 合格 | shrine.front 204.71m（石段 5 段） |
| 崖がある（傾き 45° 超の升目） | 自動 | ✅ 合格 | 17813 升目 |
| 森（木 300 本以上） | 自動 | ✅ 合格 | 木 605・岩 50・下草 18073 |
| 入口の前・道・目的地に物が 0 個 | 自動 | ✅ 合格 | 違反 0＋0 |
| 浮き・めり込み・重なりが 0 件 | 自動 | ✅ 合格 | 浮き 0・めり込み 0・重なり 0 |
| 同じ種で同じ配置 | 自動 | ✅ 合格 | fp:0b78e3719c3b08 |
| 夕暮れと霧の雰囲気が出ている | 人が見る | ⏳ 未判定 | play_map の画面撮影（village・shrine） |
| 山の廃村に見える（灰色の箱の段階として） | 人が見る | ⏳ 未判定 | aerial・village・interior の撮影 |
| 森の密度・木の並びが自然 | 人が見る | ⏳ 未判定 | forest の撮影・report/map.svg |
| 歩いて探索できる（迷わない・引っかからない） | 人が見る | ⏳ 未判定 | 利用者が mapkit.html?map=haison を歩く |
| Playwright で実際に歩いて全ての目的地に着く（PC・スマホ） | 自動 | ✅ 合格 | report/play.json：20/20 |

## 足りない素材（計画のみ・承認待ち）

- `prop.barrel`：仮の形（樽）で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `prop.beam`：仮の形（落ちた梁）で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `prop.crate`：仮の形（木箱）で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `prop.debris`：仮の形（瓦礫）で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `prop.kamado`：仮の形（かまど）で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `prop.planks`：仮の形（板の山）で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `prop.tansu`：仮の形（箪笥）で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `rock.boulder`：仮の形（岩（仮の形））で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `veg.grass`：仮の形（下草（仮の形））で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `veg.tree.broadleaf`：仮の形（広葉樹（仮の形））で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `veg.tree.sugi`：仮の形（杉（仮の形））で置いた。実素材（glTF・ライセンス門を通った物）を目録に足す：Blender で作る／CC0 を探す（フェーズ 3）（proposed）
- `bld.jp_house_abandoned`：建物「h1」は灰色の箱の部品で組んだ。07 §4.4 の規格の部品（bld.jp_house.*）を Blender で作る（フェーズ 3）（proposed）
- `bld.jp_house_abandoned`：建物「h2」は灰色の箱の部品で組んだ。07 §4.4 の規格の部品（bld.jp_house.*）を Blender で作る（フェーズ 3）（proposed）
- `bld.jp_house_collapsed`：建物「h3」は灰色の箱の部品で組んだ。07 §4.4 の規格の部品（bld.jp_house.*）を Blender で作る（フェーズ 3）（proposed）
- `bld.jp_house_abandoned`：建物「h4」は灰色の箱の部品で組んだ。07 §4.4 の規格の部品（bld.jp_house.*）を Blender で作る（フェーズ 3）（proposed）
- `bld.hokora_small`：建物「shrine」は灰色の箱の部品で組んだ。07 §4.4 の規格の部品（bld.jp_house.*）を Blender で作る（フェーズ 3）（proposed）
