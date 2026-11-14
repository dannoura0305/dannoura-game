# 本編『だんのうら』音の素材：出典・ライセンス（2026-11-14）

方針：足した素材は **CC0（パブリックドメイン）の物だけ**。サイトは **OpenGameArt.org**。
素材のページを 1 件ずつ開き、「License(s)」の欄が **CC0 だけ** であることを確かめた物だけを使った（CC0 と CC-BY・OGA-BY を並べて出している物は使っていない）。
サイトのボット対策・直リンク防止・ログインの回避はしていない（どれもページに載っている公開のファイルを普通にダウンロードした）。
Kenney（kenney.nl）は、この作業環境からは 403 で開けなかったため使っていない。

- CC0 1.0 Universal（https://creativecommons.org/publicdomain/zero/1.0/ ）：表記は不要だが、作ってくれた人への感謝として作者名を載せる（この文書・エンディングのスタッフロール）。
- `assets/bgm/` の 8 曲と `assets/voice/` はユーザーの素材で、**このリストには入らない**（変えていない）。

## 足した物（`assets/bgm_cc0/`・ミニゲームの BGM）

- 2026-11-14 追加：RPG の戦闘曲（mg_rpg_battle.mp3）。

| ファイル | 使う場面 | 曲名 | 作者 | 素材のページ（ライセンスの欄で CC0 を確認） | ダウンロードした物 |
|---|---|---|---|---|---|
| mg_race.mp3 | 原付で夜勤へ（3D レース） | Midnight Cruiser | Zane Little Music | https://opengameart.org/content/midnight-cruiser | https://opengameart.org/sites/default/files/midnight_cruiser_0.mp3 |
| mg_runner.mp3 | 深夜の買い出しダッシュ（アクション） | The Rush | tebruno99（Thomas Bruno） | https://opengameart.org/content/the-rush | https://opengameart.org/sites/default/files/The%20Rush_2.mp3 |
| mg_defense.mp3 | 荒らしディフェンス（タワーディフェンス） | Tower Defense Theme | DST（Deceased Superior Technician） | https://opengameart.org/content/tower-defense-theme | https://opengameart.org/sites/default/files/DST-TowerDefenseTheme_1.mp3 |
| mg_cards.mp3 | 配信トークバトル（カードバトル） | Jazzy Battle Theme | MintoDog | https://opengameart.org/content/jazzy-battle-theme | https://opengameart.org/sites/default/files/jazzy_battle_theme_bpm130_0.ogg |
| mg_quiz.mp3 | 危険物取扱者 一問一答（クイズ） | Taken Lightly | Pro Sensory | https://opengameart.org/content/taken-lightly | https://opengameart.org/sites/default/files/TakenLightly_0.mp3 |
| mg_cooking.mp3 | 深夜の夜食づくり（料理） | Apple Cider | Zane Little Music | https://opengameart.org/content/apple-cider | https://opengameart.org/sites/default/files/apple_cider.ogg |
| mg_stealth.mp3 | 起こさないで家事（ステルス） | Covert Operations | artisticdude | https://opengameart.org/content/covert-operations | https://opengameart.org/sites/default/files/covert_operations.mp3 |
| mg_rpg_battle.mp3 | 壇ノ浦夢譚（RPG）のふつうの戦闘（ボスは今まで通り kaidan・最後は mental） | Battle Theme A | cynicmusic | https://opengameart.org/content/battle-theme-a | https://opengameart.org/sites/default/files/battleThemeA.mp3 |

- The Rush のページには「id3 タグをできれば残して」とあるので、元のタグ（題名・作者・アルバム・URL）を残した（変換で古くなった iTunSMPB/iTunNORM だけ外した）。他の曲にも題名・作者・素材のページをタグで書いた。

## 変換

- 元のファイルはリポジトリに置かない（作業用のフォルダに置き、展開した物のスクリプト等は実行していない）。
- モノラル・44.1kHz・48kbps の mp3。全体を一定のゲインで上下して平均の大きさを約 -17 LUFS に、頭打ちだけリミッター（-3dBFS）。曲の途中を切ったりはしていない（長さはそのまま）。
- 残りの差（-17.4〜-19.1 LUFS。元がとても大きく作られた曲はリミッターで少し下がる）と、既存の 8 曲の差（-13.6〜-16.9 LUFS）は、ゲームの中の補正（`game.js` の `BGM_LUFS`・`bgmTrim()`）で -17 LUFS 相当に揃える。

| ファイル | 長さ | 大きさ（変換後） | サイズ |
|---|---|---|---|
| mg_race.mp3 | 2:24 | -17.4 LUFS | 0.87MB |
| mg_runner.mp3 | 2:20 | -18.1 LUFS | 0.84MB |
| mg_defense.mp3 | 3:19 | -17.9 LUFS | 1.20MB |
| mg_cards.mp3 | 1:21 | -18.0 LUFS | 0.49MB |
| mg_quiz.mp3 | 2:25 | -18.3 LUFS | 0.87MB |
| mg_cooking.mp3 | 3:20 | -18.1 LUFS | 1.20MB |
| mg_stealth.mp3 | 1:40 | -18.7 LUFS | 0.60MB |
| mg_rpg_battle.mp3 | 1:36 | -19.1 LUFS | 0.58MB |
| 合計 | | | 6.64MB（目安 8MB 以下） |

## 読み込み

- 起動時には読まない。ミニゲームを始めた時に `AU.playBGM()` が初めて `new Audio()` で読む（後読み）。`sw.js` の先読みにも入れていない（`sw.js` は変えていない）。
- 読めない時（通信が無い・ファイルが無い）は、これまでどおり合成音の代わりの BGM（`AU.presets`）になる。

## クレジットの表示

- エンディングのスタッフロール（`main/presentation.js` の `creditsHTML()`）の「音楽・効果音」の下に「ミニゲームの音楽（CC0・OpenGameArt.org）」と作者名を足した。
