# 検証レポート：haison

- 種：`haison-001`／作成：2026-10-17T12:25:36.955Z（claude-code）／仕様：`sha256:60dfd3eedfd9…`

## 自動の検査

| 項目 | 結果 | 中身 |
|---|---|---|
| deterministic | ✅ 合格 | {"hash":"fp:0f052e74a447ff","terrain":"950cb13f"} |
| keepOut | ✅ 合格 | {"violations":[],"checked":{"objects":958,"small":18073,"buildings":5,"shapes":225}} |
| float | ✅ 合格 | {"items":[],"counts":{"float":0,"penetrate":0}} |
| overlap | ✅ 合格 | {"items":[],"count":0} |
| reach | ✅ 合格 | {"goals":{"h1.door":135.62,"h2.door":148.74,"h4.door":136.29,"h1.center":142.24,"shrine.front":205.88},"unreachable":[],"ratio":{"h1.door":1.03,"h2.door":1.05," |
| interiors | ✅ 合格 | {"rooms":[{"id":"h1.doma","reach":140.33,"ceiling":2.52,"pass":true},{"id":"h1.washitsu_6","reach":142.24,"ceiling":2.17,"pass":true},{"id":"h1.daidokoro","reac |
| license | ✅ 合格 | {"blocked":[],"note":"物の種類 23 のうち 23 が目録の素材（web の門 pass・自作＝license own・verifiedBy は人の確認待ち）・仮の形 0。材質と建物の部品も目録（node tools/mapkit/catalog.mjs）"} |
| budget | ✅ 合格 | {"preset":"low","drawCalls":102,"tris":55994,"texMB":31.2,"source":"measured（play_map.mjs・スマホ 844×390・テクスチャは辺×4B×4/3 の見積もり）"} |
| perf | （参考） | {"device":"swiftshader","fps":null,"note":"fps は実機で測る（mapkit.html?perf=1）。起動（操作できるまで）PC high 9809ms・スマホ low 17292ms（ソフト描画）。PC high：描画 236・三角形 524452。段ごと（村の視点）：u |
| entrances | ✅ 合格 | {"violations":[]} |
| slope | ✅ 合格 | {"items":[],"buildings":[{"id":"h1","slope":0.25},{"id":"h2","slope":0.08},{"id":"h3","slope":0.02},{"id":"h4","slope":0.02},{"id":"shrine","slope":0.71}]} |
| fall | ✅ 合格 | {"edgeCells":10,"guard":"坂 40° を超える所・段差 0.4m を超える所は操作（mapkit/runtime/controller.js）が壁として止める＝落ちない（boundary: invisible_wall_on_cliff）"} |
| gameplay | ✅ 合格 | {"doors":[{"id":"h1.door","kind":"sliding","initial":"closed","sides":[135.83,137.12]},{"id":"h2.door","kind":"sliding","initial":"open","sides":[148.74,149.74] |

## 条件

| 条件 | 確かめ方 | 結果 | 根拠 |
|---|---|---|---|
| 霧がある | 自動 | ✅ 合格 | atmosphere.fog.density=0.035 |
| 夕暮れ（仕様の値） | 自動 | ✅ 合格 | atmosphere.time=dusk・sunElevDeg=4 |
| 入れる家が 2 軒以上（中の全部屋に届く） | 自動 | ✅ 合格 | h1,h2,h4・部屋 7 |
| 家の入口 3 つ以上へ歩いて届く（坂 35° 以下・段差 0.4m 以下） | 自動 | ✅ 合格 | h1.door 135.62m・h2.door 148.74m・h4.door 136.29m |
| 祠へ歩いて届く | 自動 | ✅ 合格 | shrine.front 205.88m（石段 5 段） |
| 崖がある（傾き 45° 超の升目） | 自動 | ✅ 合格 | 17813 升目 |
| 森（木 300 本以上） | 自動 | ✅ 合格 | 木 865・岩 39・下草 18073 |
| 入口の前・道・目的地に物が 0 個 | 自動 | ✅ 合格 | 違反 0＋0 |
| 浮き・めり込み・重なりが 0 件 | 自動 | ✅ 合格 | 浮き 0・めり込み 0・重なり 0 |
| 同じ種で同じ配置 | 自動 | ✅ 合格 | fp:0f052e74a447ff |
| 戸・門が開け閉めでき、開いた形で両側に届く（フェーズ 4） | 自動 | ✅ 合格 | 戸 8（sliding・shoji・fusuma・hinged） |
| 敵の出る所・巡回の点が立入禁止の外で届く・チェックポイントに届く（フェーズ 4） | 自動 | ✅ 合格 | 敵 1（巡回の点 6）・チェックポイント 3 |
| 夕暮れと霧の雰囲気が出ている | 人が見る | ⏳ 未判定 | play_map の画面撮影（village・shrine） |
| 山の廃村に見える（フェーズ 3：写実寄りの材質・部品・光） | 人が見る | ⏳ 未判定 | play_map の撮影（village・house・interior・forest）と before_after.png |
| 自作の素材（目録の license own）の中身を人が確かめた（meta.json の verifiedBy を書く） | 人が見る | ⏳ 未判定 | wakaba-assets/entries/*/*/meta.json・docs/wakaba-mapkit/11 |
| 森の密度・木の並びが自然 | 人が見る | ⏳ 未判定 | forest の撮影・report/map.svg |
| 歩いて探索できる（迷わない・引っかからない） | 人が見る | ⏳ 未判定 | 利用者が mapkit.html?map=haison を歩く |
| ゲームとして探索できる（戸・敵・チェックポイント・音。10 分遊んで判断） | 人が見る | ⏳ 未判定 | 利用者が mapkit.html?map=haison&perf=1 を実機で |
| Playwright で実際に歩いて全ての目的地に着く（PC・スマホ） | 自動 | ✅ 合格 | report/play.json：49/49 |

## 足りない素材（計画のみ・承認待ち）

- `prop.barrel`：目録の素材 prop.barrel（樽）で描く（ブラウザ版）。当たり・置き場所は仮の形（樽）の大きさのまま（done）
- `prop.beam`：目録の素材 prop.beam（落ちた梁）で描く（ブラウザ版）。当たり・置き場所は仮の形（落ちた梁）の大きさのまま（done）
- `prop.bicycle`：目録の素材 prop.bicycle（錆びた自転車（横倒し））で描く（ブラウザ版）。当たり・置き場所は仮の形（錆びた自転車（横倒し））の大きさのまま（done）
- `prop.crate`：目録の素材 prop.crate（木箱）で描く（ブラウザ版）。当たり・置き場所は仮の形（木箱）の大きさのまま（done）
- `prop.debris`：目録の素材 prop.debris（瓦礫（土壁・瓦・小舞））で描く（ブラウザ版）。当たり・置き場所は仮の形（瓦礫）の大きさのまま（done）
- `prop.door_fallen`：目録の素材 prop.door_fallen（倒れた障子）で描く（ブラウザ版）。当たり・置き場所は仮の形（倒れた障子）の大きさのまま（done）
- `prop.fence`：目録の素材 prop.fence（壊れかけの木の柵（2m））で描く（ブラウザ版）。当たり・置き場所は仮の形（壊れかけの木の柵）の大きさのまま（done）
- `prop.futon`：目録の素材 prop.futon（朽ちた布団）で描く（ブラウザ版）。当たり・置き場所は仮の形（朽ちた布団）の大きさのまま（done）
- `prop.irori`：目録の素材 prop.irori（囲炉裏（鉄瓶と五徳））で描く（ブラウザ版）。当たり・置き場所は仮の形（囲炉裏）の大きさのまま（done）
- `prop.ishigaki`：目録の素材 prop.ishigaki（石垣（2m））で描く（ブラウザ版）。当たり・置き場所は仮の形（石垣（2m））の大きさのまま（done）
- `prop.kamado`：目録の素材 prop.kamado（かまど）で描く（ブラウザ版）。当たり・置き場所は仮の形（かまど）の大きさのまま（done）
- `prop.komainu`：目録の素材 prop.komainu（狛犬（オリジナルの簡単な石像））で描く（ブラウザ版）。当たり・置き場所は仮の形（狛犬）の大きさのまま（done）
- `prop.planks`：目録の素材 prop.planks（板の山）で描く（ブラウザ版）。当たり・置き場所は仮の形（板の山）の大きさのまま（done）
- `prop.shelf_fallen`：目録の素材 prop.shelf_fallen（倒れた棚）で描く（ブラウザ版）。当たり・置き場所は仮の形（倒れた棚）の大きさのまま（done）
- `prop.sign`：目録の素材 prop.sign（色あせた立て札）で描く（ブラウザ版）。当たり・置き場所は仮の形（色あせた立て札）の大きさのまま（done）
- `prop.stone_lantern`：目録の素材 prop.stone_lantern（石灯籠（春日型））で描く（ブラウザ版）。当たり・置き場所は仮の形（石灯籠）の大きさのまま（done）
- `prop.tansu`：目録の素材 prop.tansu（箪笥（引き出しが出ている））で描く（ブラウザ版）。当たり・置き場所は仮の形（箪笥）の大きさのまま（done）
- `prop.utility_pole`：目録の素材 prop.utility_pole（古い木の電柱）で描く（ブラウザ版）。当たり・置き場所は仮の形（古い木の電柱）の大きさのまま（done）
- `prop.well`：目録の素材 prop.well（井戸）で描く（ブラウザ版）。当たり・置き場所は仮の形（井戸）の大きさのまま（done）
- `rock.boulder`：目録の素材 rock.boulder（岩（安山岩・3 種））で描く（ブラウザ版）。当たり・置き場所は仮の形（岩（仮の形））の大きさのまま（done）
- `veg.grass`：目録の素材 veg.grass（草の株（3 枚のカード））で描く（ブラウザ版）。当たり・置き場所は仮の形（下草（仮の形））の大きさのまま（done）
- `veg.tree.broadleaf`：目録の素材 veg.tree.broadleaf（広葉樹（カードの葉・LOD・遠景の板））で描く（ブラウザ版）。当たり・置き場所は仮の形（広葉樹（仮の形））の大きさのまま（done）
- `veg.tree.sugi`：目録の素材 veg.tree.sugi（杉（カードの葉・LOD・遠景の板））で描く（ブラウザ版）。当たり・置き場所は仮の形（杉（仮の形））の大きさのまま（done）
- `bld.jp_house_abandoned`：建物「h1」は部品の箱（当たり・床）のまま、見た目を目録の部品（bld.jp_house.wall_panel・bld.jp_house.post・bld.jp_house.roof_ridge）と材質で組む（mapkit/render/buildings.js）。UE5 版で 1 つの網にまとめるのは未着手（done）
- `bld.jp_house_abandoned`：建物「h2」は部品の箱（当たり・床）のまま、見た目を目録の部品（bld.jp_house.wall_panel・bld.jp_house.post・bld.jp_house.roof_ridge）と材質で組む（mapkit/render/buildings.js）。UE5 版で 1 つの網にまとめるのは未着手（done）
- `bld.jp_house_collapsed`：建物「h3」は部品の箱（当たり・床）のまま、見た目を目録の部品（bld.jp_house.wall_panel・bld.jp_house.post・bld.jp_house.roof_ridge）と材質で組む（mapkit/render/buildings.js）。UE5 版で 1 つの網にまとめるのは未着手（done）
- `bld.jp_house_abandoned`：建物「h4」は部品の箱（当たり・床）のまま、見た目を目録の部品（bld.jp_house.wall_panel・bld.jp_house.post・bld.jp_house.roof_ridge）と材質で組む（mapkit/render/buildings.js）。UE5 版で 1 つの網にまとめるのは未着手（done）
- `bld.hokora_small`：建物「shrine」は部品の箱（当たり・床）のまま、見た目を目録の部品（bld.shrine.honden・bld.shrine.torii）と材質で組む（mapkit/render/buildings.js）。UE5 版で 1 つの網にまとめるのは未着手（done）
- `web.compression`：テクスチャは WebP・glb は圧縮なし（KTX2・Meshopt の符号器がクラウドで使えないため）。利用者の PC か CI で KTX2（toktx/basisu）・gltfpack（Meshopt）にすると、読み込み ≈40% 減の見込み（docs/wakaba-mapkit/11 §6）（proposed）
- `license.verifiedBy`：自作の素材（tools/mapkit/matgen・tools/blender/kit で生成）は門で注意（UNVERIFIED_GENERATED）。人が中身を見て meta.json の verifiedBy を書く（AI は書かない）（proposed）
- `ue5.kit`：同じ部品の FBX（source/・Git の外）と ue5/import.json の雛形は作った。UE5 の画面での取り込み・Nanite・材質の組み直しは未検証（利用者の PC）（proposed）
