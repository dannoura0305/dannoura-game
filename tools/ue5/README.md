# UE5 の高性能 PC 版（B 線）：利用者の PC での準備と取り込み

**この手順とスクリプトは、UE の中で一度も動かしていません（未検証）。** クラウドには UE も GPU も無いためです。
座標の式だけは素の python3 で自己試験しています（`python3 tools/ue5/import_layout.py --selftest`）。うまくいかない所は、画面の文字・Output Log の赤い行をそのまま貼ってください。
全体の考え方は `docs/wakaba-mapkit/10_方式C_共有素材ライブラリとUE5連携.md`。

PC：Core i7-9700（8 コア 8 スレッド）・RTX 3060 Ti 8GB・メモリ 16GB・SSD 512GB（利用者が確認）。

## 導入状況（2026-10-17 更新）
- **利用者の PC に UE 5.8.3 が入りました**（利用者の報告）。下の「1. プロジェクトを作る」から進めます。スクリプトは 5.8.3 でもまだ一度も動かしていません（未検証）。

## UE 5.8.3 で気をつけること（2026-10-17 フェーズ 4 で直した・**まだ UE の中では動かしていない＝未検証**）
UE の Python の API を Epic の公開の文書（5.1〜5.5 の Python API・Interchange の説明・不具合の報告）で調べて、スクリプトを 5.x の書き方にそろえました。5.8 の画面で一度も動かしていないので、赤い行が出たらそのまま貼ってください。
| 所 | 5.8 での扱い | スクリプト |
|---|---|---|
| 物を置く・消す | `unreal.EditorActorSubsystem`（5.0 から）。`EditorLevelLibrary` の同じ関数は 5.x で非推奨 | `import_layout.py` は Subsystem を使う（無い古い版だけ旧い方） |
| FBX の取り込み | **UE 5.5 以降は FBX も Interchange（新しい取り込みの仕組み）で読む設定が多い**。Interchange では取り込みの設定が `AssetImportTask.options` に入れる **`InterchangeGenericAssetsPipeline`**（`mesh_pipeline.build_nanite`・`common_meshes_properties.force_all_mesh_as_type` など）になり、古い `FbxImportUI` の値は効かない。`destination_name`（名前）も効かない | `--import-kit` は Interchange が使えれば Interchange、だめなら `FbxImportUI`（`--legacy-fbx` で古い方を強制）。取り込んだ後に `SM_<id>` へ名前を変える。版で名前が違う属性は止まらずに「設定できなかった名前」を Output Log に出す |
| Interchange のオン・オフ | 出力ログ（Cmd）で `Interchange.FeatureFlags.Import.FBX 1`（オン）／`0`（古い取り込み）。プロジェクト設定 → Interchange でも見られる | スクリプトはこの値を読んで選ぶ |
| Landscape | Python で高さマップを取り込む公開の関数は版で違う＝**手作業**（§2）。5.8 の画面は「ランドスケープ」モード →「管理」→「新規」→「ファイルからインポート」 | 値を表示するだけ |
| Nanite | 岩・建物はオン。木・草の Nanite（Nanite Foliage）は版で扱いが変わるので最初はオフ（`ue5/import.json` の `nanite`） | `import.json` の値を使う |
| 不具合（参考） | 5.5 で「PIE（▶）の最中に取り込んだ静的メッシュが Nanite にならない」報告がある（UE-255448）。**取り込みは ▶ を止めてから** | – |

### 素材（FBX）をまとめて取り込む（新しい・未検証）
```
py "C:/Users/<名前>/dannoura-game/tools/ue5/import_layout.py" --import-kit --dry-run        ← 何を取り込むかだけ表示（UE なしでも動く）
py "C:/Users/<名前>/dannoura-game/tools/ue5/import_layout.py" --import-kit --only rock.boulder   ← まず 1 つで試す
py "C:/Users/<名前>/dannoura-game/tools/ue5/import_layout.py" --import-kit                  ← 全部（31 個・FBX は wakaba-assets/entries/*/*/source/。Git の外なので Blender の build_kit.py で作る）
```
- うまくいかない時：`--legacy-fbx`（古い取り込み）で試す。Output Log の `わかば：設定できなかった名前` の行を貼ってください。
- 取り込んだら `node tools/mapkit/catalog.mjs --ue5-map ue5_asset_map.json` → §3 を `--asset-map` つきで流すと本物の部品に替わります。
- 遊びの印（フェーズ 4）：§3 を流すと、戸・門（タグ `wakaba_door:sliding` など）・チェックポイント（`wakaba_checkpoint`）・敵の出る所と巡回の点（`wakaba_enemy_route:ikei`・`wakaba_route_index:0`…）も TargetPoint で置かれます。UE の敵の AI（Behavior Tree）・戸のブループリントは**まだ作っていません**（次の段）。
- UE なしの自己試験：`python3 tools/ue5/import_layout.py --selftest`（座標の式・偽の `unreal` で置く・消す・取り込みの呼び順。UE の本当の挙動は確かめられない）。

## （参考）UE 未導入だった時のメモ（2026-10-17 の時点：Epic Games Launcher のライブラリに UE の表示なし）
- **今は何もしなくて大丈夫です。** ブラウザ版（A 線）と素材置き場（C）は UE なしで進みます。この README の手順（B 線＝UE5 の PC 版）は **UE を入れるまで待ち**です。
- 入れるかどうかは利用者が決めます（任意）。入れる時の手順（はじめての人向け）は **`docs/wakaba-mapkit/10_方式C_共有素材ライブラリとUE5連携.md` §7.1**：
  1. Epic Games Launcher を入れてサインイン → 左の「Unreal Engine」→「ライブラリ」→「エンジンのバージョン」の「＋」→ **5.8.x** を選んで「インストール」。
  2. 「オプション」で**エンジンのソースコード・デバッグ用シンボル・Windows 以外のプラットフォームを外す**（大きく減る）。
  3. **ディスクは本体だけで約 40〜60GB、プロジェクトやキャッシュ込みで 60〜100GB 以上**を見込む。SSD 512GB なので、C: の空きが 150GB 未満なら D: などに入れるか見送る。
  4. RTX 3060 Ti 8GB・メモリ 16GB は UE の推奨の下限〜半分：動くが重い場面ではもたつく前提。UE を開く時は Blender・ブラウザを閉じる。
- 入れたら版の番号（例 5.8.1）を教えてください。そのあと下の「0. 入っているか確かめる」から進みます。**本作の UE 用スクリプト（`import_layout.py`）は、どの版の UE でも一度も動かしていません（未検証）**。
- 地形は Gaea でなく、リポジトリの手続きの地形（`maps/haison/build/ue/heightmap_505.png`）を使います（利用者の PC に Gaea なし）。

---

## 0. 入っているか確かめる
- Epic Games Launcher → 左の「Unreal Engine」→ 上の「ライブラリ」→「エンジンのバージョン」に 5.x があるか。版（例 5.6.1）を教えてください。
- 無ければ、急がなくて大丈夫です（ブラウザ版は UE なしで進みます）。入れるなら最新の 5.x（約 40〜60GB・SSD の空きに注意。「オプション」でターゲットのプラットフォームを Windows だけにすると小さくなる）。

## 1. プロジェクトを作る（最初の 1 回・30 分〜）
1. Launcher で「起動」→「ゲーム」→「空のプロジェクト（Blank）」。
   - ブループリント・**スターターコンテンツなし**・品質のプリセット「最大」・レイトレーシング **オフ**。
   - 置き場所：SSD の空きが少ないなら D: などへ。名前の例 `WakabaPC`。リポジトリ（dannoura-game）の**外**に作る（UE のプロジェクトは大きいので Git に入れない。バックアップは `07` §9）。
2. 初めて開く時、シェーダーの準備に**数十分〜1 時間以上**かかることがあります（i7-9700）。その間は他のアプリを閉じる。
3. **Python を有効に**：編集 → プラグイン →「Python Editor Script Plugin」（と「Editor Scripting Utilities」）にチェック → 再起動。
4. 出力ログ：ウィンドウ → 出力ログ（Output Log）。下の入力欄の左を「Cmd」から「**Python**」に切り替えられれば準備完了。

### RTX 3060 Ti 8GB・メモリ 16GB の設定の出発点（実測で直す前提）
| どこ | 設定 | 理由 |
|---|---|---|
| プロジェクト設定 → レンダリング → Global Illumination | Lumen（ソフトウェア）。ハードウェアレイトレースは **オフ** | 8GB では重い |
| 同 → Reflections | Lumen（品質は低め） | – |
| 同 → Shadows | Virtual Shadow Maps | Nanite と相性が良い |
| 同 → Anti-Aliasing | TSR（画面の割合 67〜77%） | 1080p で 60fps を狙う |
| Nanite | 岩・建物は **オン**（`ue5/import.json` の `nanite`）。木・草の Nanite は版によって実験的なので最初はオフ | – |
| エンジンの拡張性（画面右上の「設定」→「エンジンの拡張性の設定」） | 作業中は「高」、確認の時だけ「最高（Epic）」 | エディタを軽く |
| テクスチャのストリーミングのプール | `r.Streaming.PoolSize 3000`（出力ログの Cmd で）から | VRAM 8GB |
| メモリ 16GB | UE を開く時は Blender・ブラウザ・Gaea を閉じる。派生データ（DDC）は D: などへ（`09` D5） | エディタの推奨は 32GB |
- fps の見方：出力ログ（Cmd）で `stat fps`・`stat unit`・`stat gpu`。1080p で数値を貼ってください（`07` §6.2 を直します）。

## 2. 山の廃村を入れる（地形）
リポジトリを最新にする（`git pull`）。使うのは `maps/haison/build/ue/heightmap_505.png` と `landscape.json`（作り済み。作り直す時は `node tools/mapkit/export_ue_heightmap.mjs maps/haison`）。

1. 新しいレベル：ファイル → 新規レベル →「空のレベル（Empty Level）」→ 保存（例 `/Game/Wakaba/Maps/Haison`）。
2. 光を足す：ウィンドウ → 環境ライトミキサー（Env. Light Mixer）で Sky Light・Atmospheric Light（Directional）・Sky Atmosphere・Volumetric Cloud・Height Fog を作る。
3. **Landscape**：モード（左上）→「ランドスケープ」→「管理」→「新規」→「**ファイルからインポート**」→ `heightmap_505.png` を選ぶ。`landscape.json` の `landscape` の値を入れる：

| 項目（画面の名前は版で少し違う） | 値（山の廃村） |
|---|---|
| Location | X 0・Y 0・Z **3512.88857** |
| Rotation | 0・0・0 |
| Scale | X **50.793651**・Y **50.793651**・Z **9.520302** |
| Section Size（区画の中の四角形） | **63×63 Quads** |
| Sections Per Component | **2×2 Sections** |
| Number of Components | **4×4**（合計 16） |
| Overall Resolution | **505×505** |
4. 「インポート」。地図は X 0〜25,600cm・Y 0〜25,600cm（256m 四方）に広がります。
- **確認 1（大事）**：`import_layout.py` で置いた家（次の §3）が、地面に埋まらず・浮かずに建っているか。祠（X 約 16,000・Y 約 17,100）が北東の高い所にあるか。ずれていたら画面の写真を貼ってください（向き・高さの式を直します）。

## 3. 山の廃村を入れる（家・木・岩・印）
出力ログを「Python」にして（パスは各自の物に。`\` でなく `/` を使う）：
```
py "C:/Users/<名前>/dannoura-game/tools/ue5/import_layout.py" --layout "C:/Users/<名前>/dannoura-game/maps/haison/build/layout.json"
```
- 置く物：建物の部品 125（灰色の箱・円柱）・木と岩と小物 958・目的地と印・遊びの印（戸 8・チェックポイント 3・敵の巡回 7）・スタート（PlayerStart）。アウトライナーのフォルダ `Wakaba/haison/…` にまとまります。
- 何度流しても同じ（前に置いた物＝タグ `wakaba:haison` を消してから置く）。1 回分は Ctrl+Z で戻せます。
- `--dry-run`：置かずに数だけ・`--no-objects`：家だけ・`--asset-map <file>`：本物の素材に差し替え（§4）。
- 下草（約 1.8 万点）は 1 つずつ置きません。`node tools/mapkit/export_ue_heightmap.mjs maps/haison --points` の `pcg_points.csv` を、コンテンツブラウザにドラッグして**データテーブル**（行の型：Name・Kind・Layer・X・Y・Z・Yaw・Scale の構造体）として読み込み、PCG のグラフや Foliage で散らす（手作業・未検証）。
- 遊んでみる：上の ▶（PIE）。灰色の箱の段階なので、まずは「歩けるか・家に入れるか」だけ。キャラクターの操作は UE の Third Person テンプレートの物を足すのが早い（コンテンツの追加 → 機能またはコンテンツパック → Third Person）。

## 4. 素材を入れる（Blender → UE5）
1. Blender で部品を作り、`tools/blender/export_kit.py` で書き出す（`docs/wakaba-mapkit/10` §3）。FBX は `wakaba-assets/entries/<category>/<id>/source/<id>.fbx`（Git に入れない）。
2. UE のコンテンツブラウザで `ue5/import.json` の `gamePath` のフォルダ（例 `/Game/Wakaba/Rock/`）を作り、FBX をドラッグ。取り込みの設定：
   - **Convert Scene：オン**・Force Front XAxis：オフ・Import Uniform Scale：1.0（Blender で単位の倍率を適用して書き出しているので cm に直っている）
   - Build Nanite：`import.nanite` の値・Collision：`import.collision`（simple_box など）・Generate Lightmap UVs：オフ（Lumen なので）
   - 名前を `SM_<id の . を _ に>` にする（例 `SM_rock_test_boulder_small`）。
   - **確認 2**：1m の箱が UE で 100cm になっているか（詳細パネルの大きさ）。100 倍・1/100 になっていたら教えてください（書き出しの設定を直します）。
3. 表を作る：`node tools/mapkit/catalog.mjs --ue5-map ue5_asset_map.json`（ue5 の門が pass の物だけ入る）
4. もう一度 §3 を `--asset-map "C:/…/ue5_asset_map.json"` つきで流すと、その id の物が本物に替わります（原点＝底の中心として置く）。

## 5. UE5 → ブラウザ版（戻す時）
- UE の中で直した配置は、**地図仕様（`maps/<id>/map.spec.json`）か Blender の正本を直す**のが原則です（UE のレベルは書き出しの先で、正本にしない）。
- 形・材質を Web に出す時は Blender から glb（`export_kit.py`）。UE の材質・Lumen の光はそのままブラウザへは出せません（`docs/wakaba-mapkit/08` §6）。
- Fab・Megascans の素材は UE5 版だけで使えます（Web には出さない：ライセンス門の `KNOWN_NO_WEB`）。作品は商用なので、Fab の Standard License の条件と UE の規約（製品の生涯の総収入 100 万ドルを超えた分に 5%）がかかります。

## 6. 困った時に貼ってほしい物
- UE の版（ヘルプ → Unreal Editor について）・出力ログの赤い行・`import_layout.py` の最後の行（`わかば：haison を置いた（…）`）
- 画面の写真（地形と家がずれている時は、上から見た図：ビューポート左上 →「トップ」）
