# トビネズミ 音の素材：出典・ライセンス・使い方（2026-11-14）

方針：素材は **CC0（パブリックドメイン）** の物だけ。サイトは **OpenGameArt.org**。合成音（WebAudio）はすべて残し、素材が読めるまで・読めない時のフォールバックにする。

## 確かめ方

- 素材のページを 1 件ずつ開き、「License(s)」の欄が **CC0 だけ** であることを確かめた物だけを使った（CC-BY・OGA-BY・GPL などと並べて出している物は使わない。例：Digging Underground は CC0 のほかに CC-BY・GPL も並んでいたので使っていない）。作者は各ページの「Author」（投稿者）。
- JRPG Pack 4 Calm は、zip に同梱の INFO.txt にも「released under CC0」とある。
- Kenney（kenney.nl）はこの作業環境からのアクセスにサイトが 403 を返した（ボット対策と思われる）。回避はせず、Kenney の素材は使っていない。
- ダウンロードは各ページのファイルのリンク（ログイン不要の公開の経路）。サイトのボット対策・直リンク防止・ログインの回避はしていない。
- ダウンロードした物は作業用の別フォルダに置き、zip は展開して音のファイルだけを ffmpeg で読んだ（展開した中のスクリプトは実行していない）。

## ライセンス

- CC0 1.0 Universal（https://creativecommons.org/publicdomain/zero/1.0/ ）：作者が権利を放棄している。改変・再配布・商用も自由で、表記は不要。
- それでも感謝として作者名を載せる：ゲームのメニュー →「設定」の下（`main.js` の `.tb-audio-credit`。`sound-data.js` の `audioCreditText` が置いた物の作者だけを出す）と、この文書。
- リポジトリに置くのは変換済みの物だけ（モノラル・大きさを揃えた mp3：`tobinezumi/assets/sound/`）。元の素材と聞き比べの mp3 は置かない。

## どこで何が鳴るか

- 曲（`sound-data.js` の `bgmPick`・`client/music.js`）：タイトル＝A Place I Call Home、巣の中＝Happy Lullaby、野原の昼＝土地ごと（はじまりの原は Peaceful Days と Meadow Thoughts を交互・岩場 Peaceful Days・砂丘 Sand Castles・渓谷 Forest Whisper）、朝夕＝Meadow Thoughts（ハープ）、夜と雨＝Innocence、冬と雪＝Through the Snow、行事の間＝Summer Memories（星見の夜は夜の曲）。**富山と砂嵐の間は流さない**。野原では 1 曲（短い曲は 2 分半まで繰り返す）流したら 70〜160 秒休む。捕食者に狙われている間は 0.3 倍に下げる。
- 環境音（`ambMix`・`client/ambient.js`）：小鳥（明け方がいちばん）・夜の虫（夏がいちばん）・川（渓谷・富山の水のそば）・風（岩場・砂丘・砂嵐で強く）・雨。素材が鳴る層は同じ役の合成の層を弱める。
- 効果音（`SE_MAP`）：掘る・拾う・飲む・置く・行事（鈴）・着地（砂）。ほかの音は合成音（柔らかい音色に作り直した。`client/sfx.js`）。
- 起動時には読まない：最初の操作から 1.5 秒後に読み始め、今の場面の曲・環境音、続いて効果音を 1 つずつ（同時に 2 本まで）。`sw.js` の先読みには入れていない（`tobinezumi/assets/` は再生時の保存 'media' の扱い）。

## 変換（`tobinezumi/tools/sound_prepare.mjs`）

1. 下の「素材のページ」から各ファイルをダウンロードし、`<フォルダ>/<パックのキー>/` に置く（zip は `<パックのキー>/x/` に展開）。
2. `node tobinezumi/tools/sound_prepare.mjs <フォルダ> --sample <リポジトリの外>/sample.mp3`
   - モノラル。効果音 44.1kHz 64kbps（一瞬の大きさ＝400ms の窓の最大 -16 LUFS。短く鋭い音は「最大値の余裕＋3dB」まで）、環境音 32kHz 48kbps（平均 -30 LUFS・40 秒まで・終わりを頭に 2 秒重ねてつなぎ目なし）、曲 44.1kHz 48kbps（平均 -22 LUFS・150 秒まで）。
   - ゲームでは、効果音を `SFX_TARGET`（音ごとの目標の大きさ）に合わせて鳴らす（測った大きさ `sound-files.js` の `lu`・`pk` から、頭打ちしない倍率）。
3. 合成音の大きさ：`node tobinezumi/tools/sfx_measure.mjs`（Chromium の OfflineAudioContext で鳴らして測り、`client/sfx-levels.js` に書く。`--after` で合わせた後の大きさを確かめる）。
4. `node tests/run.mjs`（`tests/tobinezumi-audio.test.mjs`）。

## 大きさと長さ（変換後に測った値）

| 種類 | 件数 | 大きさ | 目標 |
|---|---|---|---|
| 曲 | 9 | 3.57MB | 平均 -22 LUFS（-22.5〜-22.4） |
| 環境音 | 5 | 0.74MB | 平均 -30 LUFS（-30.4〜-30.1） |
| 効果音 | 12 | 0.05MB | 一瞬の大きさ -16（短い音は頭打ちの手前まで。鳴らす時に音ごとの目標へ下げる） |
| 合計 | 26 | 4.36MB | 目安 6MB 以下 |

## 素材のページ（パック）

| パック | ページ（CC0 を確認） | 作者 | ダウンロードした物 |
|---|---|---|---|
| m_jrpg4 | https://opengameart.org/content/jrpg-pack-4-calm | SubspaceAudio（Juhani Junkala） | https://opengameart.org/sites/default/files/JRPG%20Music%20Pack%20%234%20%5BCalm%5D%20by%20Juhani%20Junkala_0.zip |
| m_meadow | https://opengameart.org/content/meadow-thoughts | Écrivain | https://opengameart.org/sites/default/files/Meadow%20Thoughts.ogg |
| m_forest | https://opengameart.org/content/forest-whisper-theme | CleytonKauffman | https://opengameart.org/sites/default/files/forest_whisper_theme.zip |
| m_snow | https://opengameart.org/content/snow-theme | CleytonKauffman | https://opengameart.org/sites/default/files/snow_theme_1.zip |
| m_lullaby | https://opengameart.org/content/happy-lullaby-song17 | cynicmusic | https://opengameart.org/sites/default/files/song17.mp3 |
| a_birds | https://opengameart.org/content/ambient-bird-sounds | isaiah658 | https://opengameart.org/sites/default/files/birds-isaiah658_0.ogg |
| a_crickets | https://opengameart.org/content/crickets-ambient-noise-loopable | Wolfgang_ | https://opengameart.org/sites/default/files/crickets_1.mp3 |
| a_park | https://opengameart.org/content/park-ambiences | Thimras | https://opengameart.org/sites/default/files/park_ambience_river.wav |
| a_wind | https://opengameart.org/content/wind | IgnasD | https://opengameart.org/sites/default/files/wind.zip |
| a_rain | https://opengameart.org/content/rain-loopable | Ylmir | https://opengameart.org/sites/default/files/Rain%20OGG.zip |
| s_shovel | https://opengameart.org/content/shovel-sound | themightyglider | https://opengameart.org/sites/default/files/shovel_0.ogg |
| s_pops | https://opengameart.org/content/3-pop-sounds | wubitog | https://opengameart.org/sites/default/files/3pops.zip |
| s_100sfx | https://opengameart.org/content/100-cc0-sfx | rubberduck | https://opengameart.org/sites/default/files/100-CC0-SFX_0.zip |
| s_100sfx2 | https://opengameart.org/content/100-cc0-sfx-2 | rubberduck | https://opengameart.org/sites/default/files/sfx_100_v2.zip |
| s_bell | https://opengameart.org/content/bell-dingschimes | PWL | https://opengameart.org/sites/default/files/bell_ding1.wav<br>https://opengameart.org/sites/default/files/bell_ding3.wav |
| s_sandsteps | https://opengameart.org/content/water-splash-and-sand-footsteps | Peludo | https://opengameart.org/sites/default/files/sand_footsteps_0.mp3 |

## 使う素材

| キー | 種類 | 素材 | 元のファイル | 作者 | 出典 | 使う所 | 長さ | 大きさ（LUFS） | KB |
|---|---|---|---|---|---|---|---|---|---|
| bgm_home | 曲 | A Place I Call Home（タイトル） | JRPG Pack 4 Calm：`Calm1 - A Place I Call Home.ogg` | SubspaceAudio（Juhani Junkala） | https://opengameart.org/content/jrpg-pack-4-calm | 曲（bgmPick） | 46.5 秒 | -22.4 | 273 |
| bgm_days | 曲 | Peaceful Days（昼の原・岩場） | JRPG Pack 4 Calm：`Calm3 - Peaceful Days.ogg` | SubspaceAudio（Juhani Junkala） | https://opengameart.org/content/jrpg-pack-4-calm | 曲（bgmPick） | 64.03 秒 | -22.5 | 375 |
| bgm_sand | 曲 | Sand Castles（砂丘の昼） | JRPG Pack 4 Calm：`Calm4 - Sand Castles.ogg` | SubspaceAudio（Juhani Junkala） | https://opengameart.org/content/jrpg-pack-4-calm | 曲（bgmPick） | 71.16 秒 | -22.5 | 417 |
| bgm_fest | 曲 | Summer Memories（行事の間） | JRPG Pack 4 Calm：`Calm5 - Summer Memories.ogg` | SubspaceAudio（Juhani Junkala） | https://opengameart.org/content/jrpg-pack-4-calm | 曲（bgmPick） | 65.49 秒 | -22.5 | 384 |
| bgm_night | 曲 | Innocence（夜・雨） | JRPG Pack 4 Calm：`Calm6 - Innocence.ogg` | SubspaceAudio（Juhani Junkala） | https://opengameart.org/content/jrpg-pack-4-calm | 曲（bgmPick） | 71.16 秒 | -22.4 | 417 |
| bgm_meadow | 曲 | Meadow Thoughts（ハープ独奏：朝夕・はじまりの原） | Meadow Thoughts：`Meadow Thoughts.ogg` | Écrivain | https://opengameart.org/content/meadow-thoughts | 曲（bgmPick） | 149.79 秒 | -22.4 | 878 |
| bgm_canyon | 曲 | Forest Whisper（渓谷） | Forest Whisper Theme：`Forest Whisper Theme/Forest Whisper.ogg` | CleytonKauffman | https://opengameart.org/content/forest-whisper-theme | 曲（bgmPick） | 82.31 秒 | -22.4 | 483 |
| bgm_snow | 曲 | Through the Snow（ゆっくり版：冬） | Snow Theme：`Snow Theme/BGM_Snow_Theme_Slowed_Loop.ogg` | CleytonKauffman | https://opengameart.org/content/snow-theme | 曲（bgmPick） | 34.32 秒 | -22.4 | 201 |
| bgm_nest | 曲 | Happy Lullaby（巣の中） | Happy Lullaby (song17)：`song17.mp3` | cynicmusic | https://opengameart.org/content/happy-lullaby-song17 | 曲（bgmPick） | 39.55 秒 | -22.5 | 232 |
| amb_birds | 環境音 | 昼の小鳥 | Ambient Bird Sounds：`birds-isaiah658_0.ogg` | isaiah658 | https://opengameart.org/content/ambient-bird-sounds | 環境音の層 birds | 28.26 秒 | -30.3 | 166 |
| amb_crickets | 環境音 | 夜の虫 | Crickets Ambient Noise - loopable：`crickets_1.mp3` | Wolfgang_ | https://opengameart.org/content/crickets-ambient-noise-loopable | 環境音の層 insects | 11.52 秒 | -30.4 | 68 |
| amb_river | 環境音 | 小さな川（せせらぎ・遠くの鳥と蛙）（60 秒から 42 秒） | Park ambiences：`park_ambience_river.wav` | Thimras | https://opengameart.org/content/park-ambiences | 環境音の層 river | 39.56 秒 | -30.4 | 232 |
| amb_wind | 環境音 | 吹きわたる風 | Wind：`wind/Wind.ogg` `wind/Wind2.ogg` | IgnasD | https://opengameart.org/content/wind | 環境音の層 wind | 9.83 秒 | -30.1 | 58 |
| amb_rain | 環境音 | 雨 | Rain (loopable)：`3.ogg` | Ylmir | https://opengameart.org/content/rain-loopable | 環境音の層 rain | 40.07 秒 | -30.4 | 235 |
| se_dig | 効果音 | 土をすくう | Shovel Sound：`shovel_0.ogg` | themightyglider | https://opengameart.org/content/shovel-sound | 効果音 dig | 0.94 秒 | -17.8 | 8 |
| se_pop1 | 効果音 | ぽっ 1 | 3 Pop Sounds：`3pops/pop1.ogg` | wubitog | https://opengameart.org/content/3-pop-sounds | 効果音 pick | 0.21 秒 | -22.8 | 2 |
| se_pop2 | 効果音 | ぽっ 2 | 3 Pop Sounds：`3pops/pop2.ogg` | wubitog | https://opengameart.org/content/3-pop-sounds | 効果音 pick | 0.18 秒 | -26.1 | 2 |
| se_pop3 | 効果音 | ぽっ 3 | 3 Pop Sounds：`3pops/pop3.ogg` | wubitog | https://opengameart.org/content/3-pop-sounds | 効果音 pick | 0.18 秒 | -26.1 | 2 |
| se_plop1 | 効果音 | 水のぽちゃ 1 | 100 CC0 SFX：`plop_01.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx | 効果音 drink | 0.16 秒 | -30.3 | 1 |
| se_plop2 | 効果音 | 水のぽちゃ 2 | 100 CC0 SFX：`plop_02.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx | 効果音 drink | 0.21 秒 | -24.3 | 2 |
| se_stone1 | 効果音 | 小石を置く 1 | 100 CC0 SFX #2：`sfx100v2_stones_01.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 | 効果音 place | 0.39 秒 | -26.4 | 3 |
| se_stone2 | 効果音 | 小石を置く 2 | 100 CC0 SFX #2：`sfx100v2_stones_02.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 | 効果音 place | 0.37 秒 | -22.9 | 3 |
| se_bell1 | 効果音 | 小さな鈴 1 | Bell dings/chimes：`bell_ding1.wav` | PWL | https://opengameart.org/content/bell-dingschimes | 効果音 fest | 0.99 秒 | -24.7 | 8 |
| se_bell3 | 効果音 | 小さな鈴 2 | Bell dings/chimes：`bell_ding3.wav` | PWL | https://opengameart.org/content/bell-dingschimes | 効果音 fest | 1.38 秒 | -16.7 | 11 |
| se_sand1 | 効果音 | 砂に降りる 1（2.62 秒から 0.48 秒） | Water Splash and sand footsteps：`sand_footsteps_0.mp3` | Peludo | https://opengameart.org/content/water-splash-and-sand-footsteps | 効果音 land | 0.5 秒 | -16.9 | 4 |
| se_sand2 | 効果音 | 砂に降りる 2（3.21 秒から 0.52 秒） | Water Splash and sand footsteps：`sand_footsteps_0.mp3` | Peludo | https://opengameart.org/content/water-splash-and-sand-footsteps | 効果音 land | 0.5 秒 | -16.7 | 4 |
