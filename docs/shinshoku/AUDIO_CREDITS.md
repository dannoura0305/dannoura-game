# 『境界侵食』音の素材：出典・ライセンス・使い方（2026-11-14）

方針（決定）：素材は **CC0（パブリックドメイン）** の物だけ。サイトは **OpenGameArt.org** と **Kenney**。怖さは**じわじわ型**（静かな不安・環境音・間・暗さ・気配。驚かしは要所だけ）。

## 経緯

- 2026-11-13：無料素材サイト（効果音ラボ・魔王魂）の 95 件を候補に選んだが、作業環境から mp3 を取得できなかった（直リンク防止で 403。ページのボタンを押す方法は、ボットチェックの回避に当たるため行っていない）。その時の候補と規約の記録は、この文書の末尾「（記録）2026-11-13 の候補」に残す。
- 2026-11-14：ユーザーの判断で CC0 の素材に切り替えた。素材のページを 1 件ずつ開き、ライセンスの欄が **CC0** であることを確かめた物だけを使う（CC-BY・OGA-BY・GPL などは使わない。CC0 と他のライセンスを並べて出している物も、迷いを避けるため使わない）。
  - OpenGameArt.org：各ページの「License(s)」の欄が CC0 だけの物。作者は各ページの「Author」。
  - Kenney：各パックのページの「License」が Creative Commons CC0（パックに同梱の License.txt も CC0）。作者は Kenney。ダウンロードは各ページの「Download」ボタンと同じ公開の経路（ログイン不要）。
  - サイトのボット対策・直リンク防止・ログインの回避はしていない。どれも普通に公開されているファイルのダウンロード。

## ライセンス

- CC0 1.0 Universal（https://creativecommons.org/publicdomain/zero/1.0/ ）：作者が権利を放棄している。改変・再配布・商用も自由で、表記は不要。
- それでも、作ってくれた人への感謝として**作者名を載せる**（スタッフロール・タイトルの注記・この文書）。
- リポジトリに置くのは**変換済みの物だけ**（モノラル・大きさを揃えた mp3）。元の素材（zip・wav 等）と聞き比べの mp3 は置かない。

## クレジット（使った物だけ・自動）

- スタッフロール：`shinshoku/game/ch7.js` が `withAudioCredits(CREDITS.lines, SOUND_FILES)`（`shinshoku/data/sound.js`）で、「使わせてもらったもの」の前に「音楽・効果音（CC0 の素材）」の段を足す。
  「音楽」の作者・「効果音・環境音」の作者（Kenney を先頭に名前の順）・サイトの名前と URL。置いた物の表（`sound_files.js`）にある素材の作者だけが出る。
- タイトルの注記：`shinshoku.html` の `#tt-audio-credit`（VOICEVOX の表記の続き）に「音の素材：Kenney・OpenGameArt.org の作者のみなさん（CC0）」。素材が無い時は出さない。

## 人の声について

- 悲鳴・台詞・笑い声などの**人の声の素材は使わない**（相棒の悲鳴は合成のまま）。
- 異形の声・気配の息は、作者が口で作った唸り・うめき・息を録った物（ページに書いてある：16 Monster Growls・Undead Moans・Zombie moans・Ghost breath）。言葉は無く、ゲームでは低く・遅く再生し（`SE_MAP` の `r`）、遠くで小さく鳴らす。

## どの場面で何が鳴るか（設計は 2026-11-13 のまま）

- **起動時には読まない**。遊びが始まり、起動の後読み（`bootMs.lateAt`）を過ぎてから、区画に入った時にその区画の環境音・曲を、続いて効果音・足音を 1 つずつ（2 本まで並行）読む（`core/soundbank.js`）。読めるまでの間・読めない時は合成音（`core/audio.js`。合成音は消していない）。
- **環境音**（`AMB_MIX`）：区画ごとの層。雨（商店街・路地・広場）、不気味な風（路地・吹き抜け・崩れた商店街）、換気のうなり（体育館・病院・研究区画・管理棟）、地下の水滴（地下通路）、静かな部屋の空気（自宅・病院・分室・記録の間）、機械室の機械。序章のふだんの町は夕方の屋外、結末は朝の鳥・夕方のカラス・夜の虫。素材がある時は同じ役の合成の層を弱める。
- **気配**（`PRESENCE`）：静かな時だけ、20〜80 秒に一度、聞き手の後ろ寄り 9〜22m で遠い物音（木のきしみ・ノック・鉄の扉を叩く音・窓を叩く音・鉄の物が落ちる音・息・水滴・引きずる音・誰かの足音）。
- **予兆**：弾ける攻撃＝高い金属の「チャキッ」、弾けない攻撃＝低い唸り（区別を残す）。
- **驚かし**は要所だけ：模倣する影の正体（`mimic_reveal`＝ホラーの一撃）・ボスの起き上がり（`boss_rise`＝持ち上がる不穏な音）。
- **BGM**（`BGM_AREAS`・`bgmPlan`・`core/bgm.js`）：探索の曲は区画に入ってしばらくしてから小さく一度だけ流し、長く休む。家・記録の間・結末の場面・序章のふだんの町は鳴らさない。戦い・ボス・巨大戦・スタッフロールの曲はつなぎ目なしで繰り返す。
- **UI の音・一閃の準備・回復・変身・電話のベル**などは合成音のまま（遊びの合図として分かりやすい・合う素材が無かった）。

## 変換（`tools/sound/prepare.mjs`）

1. 下の「素材のページ」から、各パックをダウンロードして `<フォルダ>/<パックのキー>/` に置く（zip は展開する。中のスクリプト等は実行しない）。
2. `node tools/sound/prepare.mjs <フォルダ> --sample <リポジトリの外>/sample.mp3`
   - モノラル。効果音・足音 44.1kHz 64kbps、環境音 32kHz 48kbps（40 秒まで）、曲 44.1kHz 48kbps（3 分 30 秒まで）。
   - 大きさ：効果音は一瞬の大きさ（400ms の窓の最大）で -16 LUFS、足音は 1 歩ずつの中央で -20、環境音は平均 -30、曲は平均 -22。短く鋭い音は上げ幅を「最大値の余裕＋3dB」までにする（頭打ちで潰しすぎない）。
   - 効果音は前後の無音を削り、切り口に短いフェード。足音は 1 歩ずつの録音を並べて 1 本にし、1 歩ずつの位置（slices）を探す。
   - 繰り返す物：環境音は終わりを頭に 2 秒、曲は 3 秒重ねてつなぎ目なしに（元からつなぎ目なしの物はそのまま）。ゲームでは読んだ時に、端の無音を測って外し（mp3 の詰め物が残るブラウザ向け）、終わりの 80ms に頭の 80ms を溶かし込んで、繰り返す区間を「頭の 80ms の後〜終わり」にする（`core/soundbank.js` の `edgeTrim`・`loopFade`・`SoundBank.loop`）。mp3 の境目が数サンプルずれても継ぎ目で音が切れない（Chromium で 15 本の継ぎ目の段差を測り、ふだんの隣り合うサンプルの差の範囲に収まることを確かめた）。
3. `node tests/run.mjs`（`tests/shinshoku-audio.test.mjs` が表・大きさ・長さ・表記・出典を確かめる）。

## 大きさと長さ（変換後に測った値）

| 種類 | 件数 | 大きさ | 大きさ（LUFS）の幅・中央 | 目標 |
|---|---|---|---|---|
| 環境音 | 11 | 1.19MB | -31.3〜-30.1・-30.5 | 平均 -30 |
| 曲 | 10 | 7.16MB | -22.5〜-21.6・-22.5 | 平均 -22 |
| 効果音 | 64 | 0.64MB | -28.1〜-16.1・-17.8 | 一瞬の大きさ（400ms の最大）-16（短く鋭い音は頭打ちの手前まで） |
| 足音 | 10 | 0.26MB | -29.7〜-19.8・-23.1 | 1 歩の一瞬の大きさ -20（同上） |
| 合計 | 95 | 9.26MB | | 目安 16MB 以下 |

- 効果音・足音の中で低めの物（-20 より下）は、短く鋭い音（打撃・素振り・ノック・足音の 1 歩）。一瞬の大きさの測り方では低く出るが、最大値は -2dBFS 付近まで上げてあり、聞こえ方は揃う。アスファルトの足音は 1 歩がとくに短いので、`STEPS.asphalt.g` を 0.75 にして補う。
- 起動時の読み込みには入らない（後読み）。`sw.js` の先読みにも入れていない。

## 素材のページ（パック）

| パック（フォルダ名） | サイト | ページ（ライセンスの欄で CC0 を確認） | 作者 | ダウンロードした物 |
|---|---|---|---|---|
| kenney_impact | Kenney | https://kenney.nl/assets/impact-sounds | Kenney | ページの「Download」ボタン（ライセンス：同梱の License.txt も CC0） |
| kenney_rpg | Kenney | https://kenney.nl/assets/rpg-audio | Kenney | ページの「Download」ボタン（ライセンス：同梱の License.txt も CC0） |
| kenney_scifi | Kenney | https://kenney.nl/assets/sci-fi-sounds | Kenney | ページの「Download」ボタン（ライセンス：同梱の License.txt も CC0） |
| rd_100sfx2 | OpenGameArt.org | https://opengameart.org/content/100-cc0-sfx-2 | rubberduck | https://opengameart.org/sites/default/files/sfx_100_v2.zip |
| rd_metalwood | OpenGameArt.org | https://opengameart.org/content/100-cc0-metal-and-wood-sfx | rubberduck | https://opengameart.org/sites/default/files/100-CC0-wood-metal-SFX.zip |
| rd_creature2 | OpenGameArt.org | https://opengameart.org/content/80-cc0-creture-sfx-2 | rubberduck | https://opengameart.org/sites/default/files/80-CC0-creature-sfx-2.zip |
| rd_breaking | OpenGameArt.org | https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx | rubberduck | https://opengameart.org/sites/default/files/sfx_breaking_and_falling.zip |
| rd_loops | OpenGameArt.org | https://opengameart.org/content/30-cc0-sfx-loops | rubberduck | https://opengameart.org/sites/default/files/sfx_loops.zip |
| sn_sword | OpenGameArt.org | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | StarNinjas | https://opengameart.org/sites/default/files/sword_-_starninjas_1.zip |
| sn_clash | OpenGameArt.org | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | StarNinjas | https://opengameart.org/sites/default/files/sword_clash_-_starninjas_0.zip |
| sn_monster | OpenGameArt.org | https://opengameart.org/content/16-monster-growls | StarNinjas | https://opengameart.org/sites/default/files/monster_-_starninjas.zip |
| ad_swish | OpenGameArt.org | https://opengameart.org/content/swishes-sound-pack | artisticdude | https://opengameart.org/sites/default/files/swishes.zip |
| ad_undead | OpenGameArt.org | https://opengameart.org/content/undead-moans | AntumDeluge | https://opengameart.org/sites/default/files/undead-moans.zip |
| ad_scrapes | OpenGameArt.org | https://opengameart.org/content/scrapes | AntumDeluge | https://opengameart.org/sites/default/files/scrapes.zip |
| da_zmoans | OpenGameArt.org | https://opengameart.org/content/zombie-moans | Darsycho | https://opengameart.org/sites/default/files/darsycho__zombie-moans_0.ogg |
| kurt_pistol | OpenGameArt.org | https://opengameart.org/content/gunshots | kurt | https://opengameart.org/sites/default/files/22%20Pistol.wav |
| zs_reload | OpenGameArt.org | https://opengameart.org/content/handgun-reload-sound-effect | zer0_sol | https://opengameart.org/sites/default/files/reload.wav |
| bart_heart | OpenGameArt.org | https://opengameart.org/content/heartbeat-sounds | bart | https://opengameart.org/sites/default/files/heartbeat_slow_0.wav |
| bart_steam | OpenGameArt.org | https://opengameart.org/content/steam-release-sounds | bart | https://opengameart.org/sites/default/files/steam_hisses.zip |
| tz_roar | OpenGameArt.org | https://opengameart.org/content/cc0-deep-monster-roar | trazzz123 | https://opengameart.org/sites/default/files/monster_roar.wav |
| mu_rumble | OpenGameArt.org | https://opengameart.org/content/low-rumbling | Musheran | https://opengameart.org/sites/default/files/low-rumbling-176033.mp3 |
| mk_shake | OpenGameArt.org | https://opengameart.org/content/earthquake-and-open-sesame | mieki256 | https://opengameart.org/sites/default/files/shake.flac |
| qb_ghostbreath | OpenGameArt.org | https://opengameart.org/content/ghost-breath | qubodup | https://opengameart.org/sites/default/files/ghostbreath.flac |
| tw_horror | OpenGameArt.org | https://opengameart.org/content/horror-sfx | TinyWorlds | https://opengameart.org/sites/default/files/horror_sfx.zip |
| ps_horrorhit | OpenGameArt.org | https://opengameart.org/content/horror-hit-soundpack-1 | psychhead_ | https://opengameart.org/sites/default/files/horror_hit_soundpack_1.zip |
| tb_glass | OpenGameArt.org | https://opengameart.org/content/glass-break | Till Behrend | https://opengameart.org/sites/default/files/glass_breaking.wav |
| tg_buzz | OpenGameArt.org | https://opengameart.org/content/electric-buzz | themightyglider | https://opengameart.org/sites/default/files/buzz_0.ogg |
| ck_breaker | OpenGameArt.org | https://opengameart.org/content/sfx-circuit-breaker | CleytonKauffman | https://opengameart.org/sites/default/files/Circuit%20Breaker.zip |
| ez_alarm | OpenGameArt.org | https://opengameart.org/content/alarm-1 | EZduzziteh | https://opengameart.org/sites/default/files/alarm_2.ogg |
| pwl_bell | OpenGameArt.org | https://opengameart.org/content/bell-dingschimes | PWL | https://opengameart.org/sites/default/files/bell_ding2.wav |
| kr_radio | OpenGameArt.org | https://opengameart.org/content/radio-noise-1 | Kresiek The Furry | https://opengameart.org/sites/default/files/radio_noise_loop.wav |
| kr_rain | OpenGameArt.org | https://opengameart.org/content/amb-rain-loop-1 | Kresiek The Furry | https://opengameart.org/sites/default/files/amb_rain_loop_1.ogg |
| kr_outside | OpenGameArt.org | https://opengameart.org/content/amb-outside-1 | Kresiek The Furry | https://opengameart.org/sites/default/files/amb_outdoor1_loop.ogg |
| sw_windy | OpenGameArt.org | https://opengameart.org/content/windy-ambient-noise | Some Weirdo | https://opengameart.org/sites/default/files/windy_ambiance_0.ogg |
| ig_wind | OpenGameArt.org | https://opengameart.org/content/wind | IgnasD | https://opengameart.org/sites/default/files/wind.zip |
| ig_crows | OpenGameArt.org | https://opengameart.org/content/crows-singing | IgnasD | https://opengameart.org/sites/default/files/Crows.ogg |
| in_drip | OpenGameArt.org | https://opengameart.org/content/dripping-water-loop | Independent.nu | https://opengameart.org/sites/default/files/atmosbasement.mp3_.flac |
| is_birds | OpenGameArt.org | https://opengameart.org/content/ambient-bird-sounds | isaiah658 | https://opengameart.org/sites/default/files/birds-isaiah658_0.ogg |
| wf_crickets | OpenGameArt.org | https://opengameart.org/content/crickets-ambient-noise-loopable | Wolfgang_ | https://opengameart.org/sites/default/files/crickets_1.mp3 |
| m_emptycity | OpenGameArt.org | https://opengameart.org/content/emptycity-background-music | yd | https://opengameart.org/sites/default/files/EmptyCity.ogg |
| m_corridors | OpenGameArt.org | https://opengameart.org/content/narrow-corridors | TinyWorlds | https://opengameart.org/sites/default/files/narrow_corridors_short.ogg |
| m_hauntpiano | OpenGameArt.org | https://opengameart.org/content/haunting-piano | Emma_MA | https://opengameart.org/sites/default/files/haunting%20piano_0.mp3 |
| m_lost | OpenGameArt.org | https://opengameart.org/content/lost-in-a-bad-place-horror-ambience-loop | congusbongus | https://opengameart.org/sites/default/files/lost_2.ogg |
| m_humidity | OpenGameArt.org | https://opengameart.org/content/deep-humidity | TinyWorlds | https://opengameart.org/sites/default/files/deep-humidity.ogg |
| m_horroratmo | OpenGameArt.org | https://opengameart.org/content/horror-atmosphere | SubspaceAudio（Juhani Junkala） | https://opengameart.org/sites/default/files/Juhani%20Junkala%20-%20Post%20Apocalyptic%20Wastelands%20%5BLoop%20Ready%5D.ogg |
| m_tension | OpenGameArt.org | https://opengameart.org/content/tension-and-distress | allen yatsura | https://opengameart.org/sites/default/files/aflicao.wav |
| m_evilapproach | OpenGameArt.org | https://opengameart.org/content/evil-approach | nene | https://opengameart.org/sites/default/files/Evil%20Approach.wav |
| m_bossbattle | OpenGameArt.org | https://opengameart.org/content/boss-battle-music | SubspaceAudio（Juhani Junkala） | https://opengameart.org/sites/default/files/Juhani%20Junkala%20-%20Epic%20Boss%20Battle%20%5BSeamlessly%20Looping%5D.wav |
| m_firstlight | OpenGameArt.org | https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track | Yoiyami | https://opengameart.org/sites/default/files/first_light_particles_0.wav |

## 使う素材（選んだ物）

「大きさ」は LUFS（効果音・足音は一瞬の大きさ、環境音・曲は平均）。

| キー（ファイル名） | 種類 | 素材（加工） | 元のファイル | 作者 | 出典（CC0 を確かめたページ） | 使う所（音の名前・環境の種類） | 長さ | 大きさ |
|---|---|---|---|---|---|---|---|---|
| step_asphalt | 足音 | コンクリートの足音（5 歩）（5 本を間 0.5 秒でつなぐ） | Impact Sounds：`footstep_concrete_000.ogg` `footstep_concrete_001.ogg` `footstep_concrete_002.ogg` `footstep_concrete_003.ogg` `footstep_concrete_004.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | 足音 asphalt（歩き） | 3.08 秒 | -29.7 |
| step_asphalt_run | 足音 | コンクリートの足音（走り）（5 本を間 0.32 秒でつなぐ） | Impact Sounds：`footstep_concrete_000.ogg` `footstep_concrete_001.ogg` `footstep_concrete_002.ogg` `footstep_concrete_003.ogg` `footstep_concrete_004.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | 足音 asphalt（走り） | 2.17 秒 | -29.6 |
| step_wet | 足音 | 濡れた地面の足音（3 本を間 0.5 秒でつなぐ） | 100 CC0 SFX #2：`sfx100v2_footstep_wet_01.ogg` `sfx100v2_footstep_wet_02.ogg` `sfx100v2_footstep_wet_03.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 | 足音 wet（歩き） | 2.61 秒 | -19.9 |
| step_wet_run | 足音 | 濡れた地面の足音（走り）（3 本を間 0.32 秒でつなぐ） | 100 CC0 SFX #2：`sfx100v2_footstep_wet_01.ogg` `sfx100v2_footstep_wet_02.ogg` `sfx100v2_footstep_wet_03.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 | 足音 wet（走り） | 2.06 秒 | -19.8 |
| step_tile | 足音 | 硬い床の足音（靴）（8 本を間 0.45 秒でつなぐ） | RPG Audio：`footstep00.ogg` `footstep02.ogg` `footstep04.ogg` `footstep06.ogg` `footstep08.ogg` `footstep01.ogg` `footstep03.ogg` `footstep05.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | 足音 tile（歩き） | 5.77 秒 | -22.1 |
| step_tile_run | 足音 | 硬い床の足音（走り）（8 本を間 0.3 秒でつなぐ） | RPG Audio：`footstep00.ogg` `footstep02.ogg` `footstep04.ogg` `footstep06.ogg` `footstep08.ogg` `footstep01.ogg` `footstep03.ogg` `footstep05.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | 足音 tile（走り） | 4.57 秒 | -22 |
| step_wood | 足音 | 木の床の足音（4 本を間 0.5 秒でつなぐ） | 100 CC0 SFX #2：`sfx100v2_footstep_wood_01.ogg` `sfx100v2_footstep_wood_02.ogg` `sfx100v2_footstep_wood_03.ogg` `sfx100v2_footstep_wood_04.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 | 足音 wood（歩き） | 3.19 秒 | -23.4 |
| step_wood_run | 足音 | 木の床の足音（走り）（5 本を間 0.3 秒でつなぐ） | Impact Sounds：`footstep_wood_000.ogg` `footstep_wood_001.ogg` `footstep_wood_002.ogg` `footstep_wood_003.ogg` `footstep_wood_004.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | 足音 wood（走り） | 2.8 秒 | -25 |
| step_gym | 足音 | 体育館の床の足音（響きを足す）（5 本を間 0.55 秒でつなぐ・加工 `aecho=0.8:0.6:70|150:0.35|0.18`） | Impact Sounds：`footstep_wood_000.ogg` `footstep_wood_001.ogg` `footstep_wood_002.ogg` `footstep_wood_003.ogg` `footstep_wood_004.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | 足音 gym（歩き） | 4.21 秒 | -23.1 |
| step_gym_run | 足音 | 体育館の床の足音（走り・響きを足す）（5 本を間 0.36 秒でつなぐ・加工 `aecho=0.8:0.6:70|150:0.35|0.18`） | Impact Sounds：`footstep_wood_000.ogg` `footstep_wood_001.ogg` `footstep_wood_002.ogg` `footstep_wood_003.ogg` `footstep_wood_004.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | 足音 gym（走り） | 3.24 秒 | -23.1 |
| amb_rain | 環境音 | 雨（つなぎ目なしの録音）（つなぎ目なしの繰り返し（2 秒重ね）） | AMB Rain Loop 1：`amb_rain_loop_1.ogg` | Kresiek The Furry | https://opengameart.org/content/amb-rain-loop-1 | 環境 street_normal・環境 street・環境 home・環境 alley・環境 plaza・環境 gym・環境 office | 40.07 秒 | -30.5 |
| amb_wind | 環境音 | 不気味な風（音程のない響きを含む）（20 秒から 44 秒を切り出す・つなぎ目なしの繰り返し（2 秒重ね）） | windy ambient noise：`windy_ambiance_0.ogg` | Some Weirdo | https://opengameart.org/content/windy-ambient-noise | 環境 street・環境 alley・環境 plaza・環境 oldwing・環境 oldwing_dark・環境 atrium・環境 ruins・環境 abyss | 40.07 秒 | -30.5 |
| amb_wind_open | 環境音 | 吹きさらしの風（2 本を重ねてつなぐ・つなぎ目なしの繰り返し（2 秒重ね）） | Wind：`wind/Wind.ogg` `wind/Wind2.ogg` | IgnasD | https://opengameart.org/content/wind | 環境 yard・環境 abyss | 9.83 秒 | -30.1 |
| amb_vent | 環境音 | 換気の低いうなり（機械の繰り返し）（加工 `lowpass=f=1800`・元からつなぎ目なし） | 100 CC0 SFX #2：`sfx100v2_loop_machine_01.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 | 環境 gym・環境 hospital・環境 tunnel・環境 office・環境 lab・環境 oldwing・環境 atrium・環境 admin・環境 admin_machine | 7.6 秒 | -30.5 |
| amb_machine | 環境音 | 機械室の機械（機械の繰り返し）（元からつなぎ目なし） | 100 CC0 SFX #2：`sfx100v2_loop_machine_02.ogg` | rubberduck | https://opengameart.org/content/100-cc0-sfx-2 | 環境 lab・環境 admin_machine | 10.69 秒 | -30.3 |
| amb_sewer | 環境音 | 地下の水滴（地下室の響き）（つなぎ目なしの繰り返し（2 秒重ね）） | Dripping water loop：`atmosbasement.mp3_.flac` | Independent.nu | https://opengameart.org/content/dripping-water-loop | 環境 tunnel | 17.6 秒 | -31.3 |
| amb_room | 環境音 | 静かな部屋の空気（低い環境の繰り返し）（元からつなぎ目なし） | 30 CC0 SFX loops：`ambient_01.ogg` | rubberduck | https://opengameart.org/content/30-cc0-sfx-loops | 環境 home・環境 gym・環境 hospital・環境 office・環境 oldwing・環境 oldwing_dark・環境 admin・環境 kiroku | 8.28 秒 | -30.5 |
| amb_town | 環境音 | 夕方の屋外（静かな町）（つなぎ目なしの繰り返し（2 秒重ね）） | AMB Outside 1：`amb_outdoor1_loop.ogg` | Kresiek The Furry | https://opengameart.org/content/amb-outside-1 | 環境 street_normal | 27.43 秒 | -30.4 |
| amb_morning | 環境音 | 朝の鳥（つなぎ目なしの繰り返し（2 秒重ね）） | Ambient Bird Sounds：`birds-isaiah658_0.ogg` | isaiah658 | https://opengameart.org/content/ambient-bird-sounds | 環境 epi_day | 28.26 秒 | -30.3 |
| amb_dusk | 環境音 | 夕方のカラス（つなぎ目なしの繰り返し（2 秒重ね）） | Crows singing：`Crows.ogg` | IgnasD | https://opengameart.org/content/crows-singing | 環境 epi_dusk | 6.91 秒 | -30.9 |
| amb_night | 環境音 | 夜の虫（元からつなぎ目なし） | Crickets Ambient Noise - loopable：`crickets_1.mp3` | Wolfgang_ | https://opengameart.org/content/crickets-ambient-noise-loopable | 環境 epi_home | 11.52 秒 | -30.4 |
| p_creak | 効果音 | 木のきしみ | RPG Audio：`creak1.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | p_creak | 0.6 秒 | -16.5 |
| p_knock | 効果音 | 木を叩く音（3 回）（3 本を間 0.22 秒でつなぐ） | Impact Sounds：`impactWood_light_000.ogg` `impactWood_light_002.ogg` `impactWood_light_001.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | p_knock | 1.25 秒 | -25.8 |
| p_iron_knock | 効果音 | 鉄の扉を叩く音（2 回）（2 本を間 0.55 秒でつなぐ） | Impact Sounds：`impactMetal_heavy_000.ogg` `impactMetal_heavy_002.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | p_iron_knock | 0.86 秒 | -27.4 |
| p_window | 効果音 | 窓を叩く音（2 本を間 0.3 秒でつなぐ） | Impact Sounds：`impactGlass_light_000.ogg` `impactGlass_light_001.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | p_window | 0.76 秒 | -22.8 |
| p_metal | 効果音 | 鉄の物が落ちる音 | 100 CC0 metal and wood SFX：`metal_falling_01.ogg` | rubberduck | https://opengameart.org/content/100-cc0-metal-and-wood-sfx | p_metal | 1.49 秒 | -16.1 |
| p_breath | 効果音 | 遅くした息遣い（幽霊の息） | Ghost breath：`ghostbreath.flac` | qubodup | https://opengameart.org/content/ghost-breath | p_breath | 3.21 秒 | -16.4 |
| p_drip | 効果音 | 水滴（8.3 秒から 1 秒を切り出す） | Dripping water loop：`atmosbasement.mp3_.flac` | Independent.nu | https://opengameart.org/content/dripping-water-loop | p_drip | 0.94 秒 | -24.4 |
| p_drag | 効果音 | 何かを引きずる音 | Scrapes：`scrape-1.ogg` | AntumDeluge | https://opengameart.org/content/scrapes | p_drag | 1.18 秒 | -16.3 |
| p_steps | 効果音 | 誰かの足音（4 歩）（4 本を間 0.5 秒でつなぐ） | Impact Sounds：`footstep_wood_000.ogg` `footstep_wood_002.ogg` `footstep_wood_001.ogg` `footstep_wood_003.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | p_steps | 2.56 秒 | -25 |
| se_katana_swing1 | 効果音 | 素振りの風切り1 | Swishes Sound Pack：`swishes/swish-1.wav` | artisticdude | https://opengameart.org/content/swishes-sound-pack | swing | 0.13 秒 | -21.7 |
| se_katana_swing2 | 効果音 | 素振りの風切り2 | Swishes Sound Pack：`swishes/swish-2.wav` | artisticdude | https://opengameart.org/content/swishes-sound-pack | swing | 0.1 秒 | -22.6 |
| se_sword_swing | 効果音 | 重い素振り | Swishes Sound Pack：`swishes/swish-10.wav` | artisticdude | https://opengameart.org/content/swishes-sound-pack | swing_heavy | 0.13 秒 | -23 |
| se_heavy_swing | 効果音 | 鉄パイプの素振り | Swishes Sound Pack：`swishes/swish-13.wav` | artisticdude | https://opengameart.org/content/swishes-sound-pack | swing_pipe | 0.1 秒 | -22.8 |
| se_claw_swing | 効果音 | 爪の振り | Swishes Sound Pack：`swishes/swish-5.wav` | artisticdude | https://opengameart.org/content/swishes-sound-pack | claw | 0.13 秒 | -21.1 |
| se_katana_slash1 | 効果音 | 刃で斬る1 | 20 Sword Sound Effects (Attacks and Clashes)：`sword - StarNinjas/sword.1.ogg` | StarNinjas | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | hit | 0.91 秒 | -16.2 |
| se_katana_slash2 | 効果音 | 刃で斬る2（強） | 20 Sword Sound Effects (Attacks and Clashes)：`sword - StarNinjas/sword.2.ogg` | StarNinjas | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | hit_heavy | 1.12 秒 | -16.3 |
| se_katana_slash3 | 効果音 | 刃で斬る3 | 20 Sword Sound Effects (Attacks and Clashes)：`sword - StarNinjas/sword.3.ogg` | StarNinjas | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | hit | 0.65 秒 | -17.5 |
| se_katana_slash4 | 効果音 | 刃で斬る4 | 20 Sword Sound Effects (Attacks and Clashes)：`sword - StarNinjas/sword.4.ogg` | StarNinjas | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | blade | 0.57 秒 | -16.5 |
| se_katana_slash5 | 効果音 | 刃で斬る5 | 20 Sword Sound Effects (Attacks and Clashes)：`sword - StarNinjas/sword.5.ogg` | StarNinjas | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | chain | 0.89 秒 | -16.2 |
| se_iainuki | 効果音 | 刃を抜いて斬る（居合）（2 本を間 0.05 秒でつなぐ） | RPG Audio：`drawKnife2.ogg` `knifeSlice2.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | issen | 0.97 秒 | -16.2 |
| se_knife_slash | 効果音 | 刃物で切る | RPG Audio：`knifeSlice.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | claw_hit | 0.39 秒 | -16.3 |
| se_blow1 | 効果音 | 打撃1 | Impact Sounds：`impactPunch_heavy_000.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | hurt | 0.57 秒 | -18.2 |
| se_blow2 | 効果音 | 打撃2 | Impact Sounds：`impactPunch_medium_000.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | hit_pipe | 0.31 秒 | -19.5 |
| se_blow6 | 効果音 | 打撃3（銃床） | Impact Sounds：`impactPunch_heavy_002.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | stock | 0.42 秒 | -18.5 |
| se_katana_clash1 | 効果音 | 刃の打ち合い1 | 20 Sword Sound Effects (Attacks and Clashes)：`sword_clash.1.ogg` | StarNinjas | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | parry | 0.91 秒 | -16.3 |
| se_katana_clash2 | 効果音 | 刃の打ち合い2 | 20 Sword Sound Effects (Attacks and Clashes)：`sword_clash.2.ogg` | StarNinjas | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | guard | 0.84 秒 | -16.4 |
| se_katana_hold | 効果音 | 刀を構える「チャキッ」（金属のカチッ） | RPG Audio：`metalClick.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | tel_parry | 0.39 秒 | -23.9 |
| se_growl | 効果音 | 怪物の唸り声 | 16 Monster Growls：`monster.2.ogg` | StarNinjas | https://opengameart.org/content/16-monster-growls | tel_red | 0.78 秒 | -16.2 |
| se_handgun | 効果音 | 拳銃（.22）を撃つ | Gunshots：`22 Pistol.wav` | kurt | https://opengameart.org/content/gunshots | shot・yodan | 2.04 秒 | -28.1 |
| se_handgun_empty | 効果音 | 弾切れの空撃ち（金属のカチッ） | RPG Audio：`metalLatch.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | dry | 0.24 秒 | -22.6 |
| se_handgun_ready | 効果音 | 拳銃の装填 | Handgun Reload Sound Effect：`reload.wav` | zer0_sol | https://opengameart.org/content/handgun-reload-sound-effect | reload | 1.31 秒 | -16.4 |
| se_cloth | 効果音 | 衣擦れ | RPG Audio：`cloth1.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | dodge | 0.57 秒 | -22.5 |
| se_down | 効果音 | 倒れる（鈍い音） | Impact Sounds：`impactSoft_heavy_000.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | die | 0.55 秒 | -18.3 |
| se_large_slash | 効果音 | 大きく斬る | 20 Sword Sound Effects (Attacks and Clashes)：`sword - StarNinjas/sword.8.ogg` | StarNinjas | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | giant_claw | 0.99 秒 | -17.8 |
| se_zombie1 | 効果音 | ゾンビのうめき1（0.2 秒から 3 秒を切り出す） | Zombie moans：`darsycho__zombie-moans_0.ogg` | Darsycho | https://opengameart.org/content/zombie-moans | heiten_voice・tsugi_voice | 2.98 秒 | -16.5 |
| se_zombie2 | 効果音 | ゾンビのうめき2（小さい） | Undead Moans：`undead-2.ogg` | AntumDeluge | https://opengameart.org/content/undead-moans | kiro_voice | 1.91 秒 | -16.5 |
| se_zombie3 | 効果音 | ゾンビのうめき3 | Undead Moans：`undead-4.ogg` | AntumDeluge | https://opengameart.org/content/undead-moans | kanja_voice・shuusha_voice | 1.46 秒 | -16.4 |
| se_ghost | 効果音 | 幽霊的な声（加工された生き物の声） | 80 CC0 creture SFX #2：`weird_06.ogg` | rubberduck | https://opengameart.org/content/80-cc0-creture-sfx-2 | mimic_voice・outou_voice | 0.68 秒 | -16.9 |
| se_dragon | 効果音 | 巨大な怪物の咆哮 | CC0 Deep Monster Roar：`monster_roar.wav` | trazzz123 | https://opengameart.org/content/cc0-deep-monster-roar | giant_roar・boss_roar | 6.19 秒 | -16.4 |
| se_monster_step | 効果音 | 巨大な足音 | 80 CC0 creture SFX #2：`stomp_01.ogg` | rubberduck | https://opengameart.org/content/80-cc0-creture-sfx-2 | giant_step | 0.42 秒 | -17.6 |
| se_tremor | 効果音 | 地響き（0 秒から 4.5 秒を切り出す） | Low Rumbling：`low-rumbling-176033.mp3` | Musheran | https://opengameart.org/content/low-rumbling | rumble | 4.49 秒 | -16.6 |
| se_quake | 効果音 | 揺れ・崩れ | Earthquake and Open sesame：`shake.flac` | mieki256 | https://opengameart.org/content/earthquake-and-open-sesame | wave・land | 5.02 秒 | -16.5 |
| se_tentacle | 効果音 | うごめく音（粘る） | 80 CC0 creture SFX #2：`slime_01.ogg` | rubberduck | https://opengameart.org/content/80-cc0-creture-sfx-2 | relay_regrow | 0.39 秒 | -22.7 |
| se_electron | 効果音 | 電気の唸り | Sci-fi Sounds：`forceField_001.ogg` | Kenney | https://kenney.nl/assets/sci-fi-sounds | beam | 0.81 秒 | -16.4 |
| se_approach | 効果音 | 迫り来る恐怖（持ち上がる不穏な音）（0 秒から 7 秒を切り出す） | Horror SFX：`horror_effect1.wav` | TinyWorlds | https://opengameart.org/content/horror-sfx | boss_rise | 7.03 秒 | -16.4 |
| se_dissonance | 効果音 | 恐怖の不協和音（ホラーの一撃）（0 秒から 4 秒を切り出す） | Horror Hit Soundpack 1：`Horror Hit Soundpack 1/Sound/Pitches/Mid/Mid 1.wav` | psychhead_ | https://opengameart.org/content/horror-hit-soundpack-1 | mimic_reveal | 3.63 秒 | -16.5 |
| se_heart | 効果音 | 心臓の鼓動 | Heartbeat sounds：`heartbeat_slow_0.wav` | bart | https://opengameart.org/content/heartbeat-sounds | heartbeat・rampage_pulse | 1.44 秒 | -17.8 |
| se_door_old | 効果音 | 古いドアを開ける | RPG Audio：`doorOpen_2.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | door | 1.41 秒 | -19.5 |
| se_door_open | 効果音 | ドアを開ける | RPG Audio：`doorOpen_1.ogg` | Kenney | https://kenney.nl/assets/rpg-audio | door | 0.94 秒 | -18.6 |
| se_knock_wood | 効果音 | 木のドアをノック（3 本を間 0.2 秒でつなぐ） | Impact Sounds：`impactWood_medium_000.ogg` `impactWood_medium_001.ogg` `impactWood_medium_002.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | knock | 1.44 秒 | -24.9 |
| se_iron_door_close | 効果音 | 鉄の扉を閉める | 100 CC0 metal and wood SFX：`metal_slam_01.ogg` | rubberduck | https://opengameart.org/content/100-cc0-metal-and-wood-sfx | slam | 0.39 秒 | -21.3 |
| se_glass | 効果音 | ガラスが割れる | Glass Break：`glass_breaking.wav` | Till Behrend | https://opengameart.org/content/glass-break | glass_break | 1.18 秒 | -17.3 |
| se_collapse_little | 効果音 | 少し崩れる | 75 CC0 breaking / falling / hit sfx：`bfh1_breaking_01.ogg` | rubberduck | https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx | crash | 0.89 秒 | -20.5 |
| se_wall_break | 効果音 | 物が壊れる（木が割れる） | 100 CC0 metal and wood SFX：`wood_breaking_01.ogg` | rubberduck | https://opengameart.org/content/100-cc0-metal-and-wood-sfx | prop_break | 0.42 秒 | -17.8 |
| se_gas | 効果音 | ガスが噴き出す | Steam release sounds：`steam hisses - Marker #1.wav` | bart | https://opengameart.org/content/steam-release-sounds | steam | 0.84 秒 | -17.8 |
| se_evaporate | 効果音 | 蒸気がジューッ | Steam release sounds：`steam hisses - Marker #3.wav` | bart | https://opengameart.org/content/steam-release-sounds | fire_hit | 0.84 秒 | -18.4 |
| se_iron_plate | 効果音 | 鉄板を叩く | Impact Sounds：`impactPlate_heavy_000.ogg` | Kenney | https://kenney.nl/assets/impact-sounds | water_hammer | 0.52 秒 | -23.8 |
| se_switch | 効果音 | ブレーカーを入れる | SFX - Circuit breaker：`switch on.wav` | CleytonKauffman | https://opengameart.org/content/sfx-circuit-breaker | breaker | 0.81 秒 | -25.3 |
| se_spark | 効果音 | 電気のバチバチ | Electric Buzz：`buzz_0.ogg` | themightyglider | https://opengameart.org/content/electric-buzz | flicker | 1.1 秒 | -19 |
| se_drop | 効果音 | 水滴（点滴の台）（19.1 秒から 0.9 秒を切り出す） | Dripping water loop：`atmosbasement.mp3_.flac` | Independent.nu | https://opengameart.org/content/dripping-water-loop | drip_stand | 0.78 秒 | -20.6 |
| se_alert | 効果音 | 警報 | Alarm：`alarm_2.ogg` | EZduzziteh | https://opengameart.org/content/alarm-1 | alarm | 1.88 秒 | -16.4 |
| se_pa_start | 効果音 | 放送のチャイム（鐘の一打） | Bell dings/chimes：`bell_ding2.wav` | PWL | https://opengameart.org/content/bell-dingschimes | pa_chime | 1.33 秒 | -17.9 |
| se_pa_cut | 効果音 | 放送が切れる（スイッチ） | SFX - Circuit breaker：`switch off.wav` | CleytonKauffman | https://opengameart.org/content/sfx-circuit-breaker | pa_cut | 0.71 秒 | -24.7 |
| se_radio_noise | 効果音 | 無線のノイズ（3 秒から 1.2 秒を切り出す） | Radio Noise 1：`radio_noise_loop.wav` | Kresiek The Furry | https://opengameart.org/content/radio-noise-1 | tv_blip | 1.23 秒 | -17.1 |
| bgm_emptycity | 曲 | 荒れた町の探索（EmptyCity） | EmptyCity: Background Music：`EmptyCity.ogg` | yd | https://opengameart.org/content/emptycity-background-music | 曲 ruin（shotengai・ruins） | 100.05 秒 | -22.5 |
| bgm_corridors | 曲 | 狭い通路（Narrow Corridors） | Narrow Corridors：`narrow_corridors_short.ogg` | TinyWorlds | https://opengameart.org/content/narrow-corridors | 曲 alley（alley・plaza） | 181.42 秒 | -22.5 |
| bgm_hauntpiano | 曲 | 暗いピアノ（Haunting piano） | Haunting piano：`haunting piano_0.mp3` | Emma_MA | https://opengameart.org/content/haunting-piano | 曲 piano（shelter・office） | 58.49 秒 | -22.4 |
| bgm_lost | 曲 | 低い弦の持続（Lost in a bad place） | Lost in a bad place (horror ambience loop)：`lost_2.ogg` | congusbongus | https://opengameart.org/content/lost-in-a-bad-place-horror-ambience-loop | 曲 low（hospital・atrium・admin） | 134.77 秒 | -22.5 |
| bgm_humidity | 曲 | 地下の探索（Deep Humidity） | Deep Humidity：`deep-humidity.ogg` | TinyWorlds | https://opengameart.org/content/deep-humidity | 曲 under（tunnel・lab） | 131.13 秒 | -22.5 |
| bgm_horroratmo | 曲 | 旧棟の気配（Horror Atmosphere） | Horror Atmosphere：`Juhani Junkala - Post Apocalyptic Wastelands [Loop Ready].ogg` | SubspaceAudio（Juhani Junkala） | https://opengameart.org/content/horror-atmosphere | 曲 oldwing（oldwing） | 210.05 秒 | -21.6 |
| bgm_tension | 曲 | 戦い（tension and distress）（つなぎ目なしの繰り返し（3 秒重ね）） | tension and distress：`aflicao.wav` | allen yatsura | https://opengameart.org/content/tension-and-distress | 曲 battle（敵対が近い時・どの区画も） | 118.52 秒 | -22.5 |
| bgm_evilapproach | 曲 | ボス戦（Evil Approach）（つなぎ目なしの繰り返し（3 秒重ね）） | Evil Approach：`Evil Approach.wav` | nene | https://opengameart.org/content/evil-approach | 曲 boss（ボス戦・巨大戦以外） | 64.89 秒 | -22.5 |
| bgm_bossbattle | 曲 | 巨大戦（Boss Battle Music）（つなぎ目なしの繰り返し（3 秒重ね）・元からつなぎ目なし） | Boss Battle Music：`Juhani Junkala - Epic Boss Battle [Seamlessly Looping].wav` | SubspaceAudio（Juhani Junkala） | https://opengameart.org/content/boss-battle-music | 曲 giant（yard・town・avenue・abyss） | 123.48 秒 | -22.4 |
| bgm_firstlight | 曲 | 終わりの朝（First Light Particles）（つなぎ目なしの繰り返し（3 秒重ね）） | First Light Particles：`first_light_particles_0.wav` | Yoiyami | https://opengameart.org/content/first-light-particles-%E2%80%93-cc0-atmospheric-pianoambient-track | 曲 ending（epilogue） | 128.76 秒 | -22.5 |

## 選ばなかった物と理由（2026-11-14）

- CC0 と CC-BY／OGA-BY を並べて出している物（例：Rain on Window Loop・Rat Sewer・Running from something）：CC0 だけの物で足りたので使わない。
- 人の声・悲鳴・台詞の素材（Horror scream・Female high-pitched scream・"I see you" Voice 等）：人の声は使わない。
- 映画の着信音の素材（Crank movie telephone ringtone）：ページの注記に別の作曲者の名前があり、権利がはっきりしないので使わない（電話のベルは合成のまま）。
- 作者の欄がメールアドレスになっている物（Creaky Door Hinge Spooky）：個人の連絡先を記録に残さないため使わない（きしみは Kenney の物）。
- Dark Cavern Ambient：ほかの素材（声の物を含む）を混ぜて作った物なので使わない。
- 明るい曲・8bit の曲・激しいロック：じわじわ型に合わない。

## 確かめられなかった事

- **耳で聞いての確認はしていない**（作業環境に音を聞く手段が無い）。選び方は、ページの説明・ファイル名・測った値（長さ・大きさ・明るさ・拍の密度）による。差し替えたい物があれば `MATERIALS` を直して `prepare.mjs` を流し直す。
- 繰り返しの継ぎ目は数値（サンプルの段差・前後 50ms の大きさ）で確かめたが、耳では確かめていない。
- Safari・Firefox では確かめていない（Chromium だけ）。mp3 の詰め物の扱いの違いは、読んだ時の処理（上の「変換」）で吸収するつもりで作ってある。

## 作り直し・差し替え

- 素材の選び直し：`shinshoku/data/sound.js` の `PACKS`（ページ）・`MATERIALS`（ファイルと加工）・`SE_MAP`（音の名前との対応）・`AMB_MIX`・`PRESENCE`・`BGM_TRACKS`／`BGM_AREAS` を直し、`prepare.mjs` を流し直す。この文書の表も直す。
- 確かめる：`node tests/run.mjs`、ブラウザで区画に入って `__sh.game.sound.log`（読んだ物）・`__sh.game.music.state()`（曲の状態）・`__sh.game.sfx.presenceLog`（気配）を見る。

---

## （記録）2026-11-13 の候補：効果音ラボ・魔王魂（使っていない）

以下は 2026-11-13 の時点の文書をそのまま残した物（取得できず、使っていない）。

方針（決定）：素材は**無料素材サイト**から。怖さは**じわじわ型**（静かな不安・環境音・間・暗さ・気配。驚かしは要所だけ）。進める順は**効果音 → BGM**。

### 状態（正直な現状）

- **素材ファイルはまだ 1 つもリポジトリに入っていない**（`shinshoku/data/sound_files.js` は空）。
  2026-11-13 の作業環境から素材サイトの mp3 を取得できなかった：効果音ラボ・魔王魂とも、mp3 の直接取得は 403（直リンク防止）。
  サイトのページから取る方法（ブラウザでダウンロードボタンを押す・リンク元を付ける）は、作業環境の自動判定で「ボットチェックの回避」として止められたため行っていない。
- そのため今のゲームでは、すべての音が `core/audio.js` の**合成音**（フォールバック）で鳴る。BGM は鳴らない（曲が無い）。
- 仕組み（対応表・後から読む・BGM の制御・設定・表記の出し分け・変換の道具）は入れてあり、素材を置けばそのまま使われる。

#### 素材を入れる手順

1. 下の「使う素材」の各ページ（効果音ラボはカテゴリのページ、魔王魂は曲のページ）から、人の手で mp3 をダウンロードし、1 つのフォルダに置く（ファイル名はサイトのまま）。
2. `node tools/sound/prepare.mjs <そのフォルダ> --sample <リポジトリの外>/sample.mp3`
   - モノラル・大きさを揃えて `shinshoku/assets/sound/` に置き、置いた物の表 `shinshoku/data/sound_files.js` を作り直す。足りない物は飛ばす（その音は合成音のまま）。
   - `--sample`：主な効果音・環境音・各曲の冒頭を並べた聞き比べ用の mp3（リポジトリには入れない）。
3. `node tests/run.mjs`（`tests/shinshoku-audio.test.mjs` が表・大きさ・表記を確かめる）。
4. 表記はファイルの表から自動で出る（下の「クレジット」）。この文書の「状態」の列を「入れた」に直す。

### 規約（実際に読んだ物）

| サイト | 読めたか | ゲームに組み込んで公開 | クレジット | 加工 | ホラーでの利用 | 再配布（リポジトリに置く） | 使う |
|---|---|---|---|---|---|---|---|
| 効果音ラボ https://soundeffect-lab.info/ （規約 /agreement/・FAQ /faq/） | 読めた（2026-11-13） | 可（商用も無料。使用例に RPG ツクール作品・アプリの操作音） | 不要（任意）。書く時は「効果音ラボ」（英語は Sound Effect Lab） | 可（ピッチ・カット・ミックス・形式の変換も可）。**改変した物の配布・販売は禁止** | 可（FAQ：グロテスク・ホラー以外で年齢制限のかかる作品は不可＝ホラーは可。アダルトは不可） | FAQ「効果音を入れたアプリを GitHub で公開する際、音源ファイルむき出しでも良いですか？」→「問題ございません（できる限り隠す措置を。技術的に難しければ不要）。このケースを再配布とみなさない」。ただし効果音集のような「効果音が重要な役割を果たすコンテンツ」は再配布扱い | 効果音・足音・環境音 |
| 魔王魂 https://maou.audio/ （/rule/） | 読めた（2026-11-13） | 可（個人・商用・ジャンル問わず。性的描写等を含む全てのコンテンツで可） | **必要**（「音楽：魔王魂」等。『音楽』は『BGM』『効果音』でも可）。運営会社名での表記は不可 | 可（ビットレート・ピッチ・尺・音量等すべて） | 可（コンテンツの制限なし） | 曲単品の再配布は不可。二次配布する時は著作表記＋魔王魂へのリンク（URL）＋ファイル名に `maoudamashii` を含める。CC BY 4.0 でも提供（暗号化禁止だがゲーム制作用途の暗号化は許可） | BGM・一部の効果音 |
| DOVA-SYNDROME https://dova-s.jp/ | **読めない**（作業環境の通信の設定で接続が拒否：CONNECT 403） | — | — | — | — | — | 使わない |
| OtoLogic https://otologic.jp/ | **読めない**（Cloudflare の確認ページが出る。回避はしない） | — | — | — | — | — | 使わない |

このリポジトリの扱い：
- 置くのは**ゲームに組み込む変換済みの物だけ**（モノラル・大きさを揃えた mp3）。元の素材・素材を並べただけの物（聞き比べの mp3 など）は置かない（効果音ラボの「再配布」に当たらないように）。
- 魔王魂の曲のファイル名は `maoudamashii_…`（二次配布のルール）。表記はスタッフロールとタイトルに出し、URL も載せる。
- 素材は音として鳴らすだけ。素材を選んで鳴らせる機能（ポン出し）や、素材の一覧として聞ける画面は作らない。
- AI の学習に使わない（両サイトとも禁止）。

### クレジット（使った物だけ・自動）

- スタッフロール：`shinshoku/game/ch7.js` が `withAudioCredits(CREDITS.lines, SOUND_FILES)`（`shinshoku/data/sound.js`）で、「使わせてもらったもの」の前に「音楽・効果音（無料素材）」の段を足す。
  曲（魔王魂）を置いていれば「音楽：魔王魂」、効果音ラボの物があれば「効果音：効果音ラボ」、魔王魂の効果音があれば「効果音：魔王魂」と、サイトの URL。
- タイトルの注記：`shinshoku.html` の `#tt-audio-credit`（VOICEVOX の表記の続き）に同じ文を出す。素材が無い時は出さない（今は出ていない）。

### どの場面で何が鳴るか（設計）

- **起動時には読まない**。遊びが始まり、起動の後読み（`bootMs.lateAt`）を過ぎてから、区画に入った時にその区画の環境音・曲を、続いて効果音・足音を 1 つずつ（2 本まで並行）読む（`core/soundbank.js`）。読めるまでの間・読めない時は合成音。
- **環境音**（`AMB_MIX`）：区画ごとの層。雨（商店街・路地・広場）、不気味な風（路地・吹き抜け・崩れた商店街）、換気（体育館・病院・研究区画・管理棟）、下水の水音（地下通路）、部屋の静けさ（自宅・病院・分室・記録の間）、工場の機械（機械室）。
  素材がある時は同じ役の合成の層を弱める（合成のうなり・蛍光灯の音・遠いサイレン・しずく・店内放送の名残は残す）。序章のふだんの町は住宅街の音、結末は朝のスズメ・夕方のカラス・夜の虫。
- **気配**（`PRESENCE`）：静かな時だけ（戦い・演出の間は鳴らさない）、20〜80 秒に一度、聞き手の**後ろ寄り 9〜22m** で遠い物音（古い扉のきしみ・ノック・鉄の扉を叩く音・窓を叩く音・鉄の棒が落ちる音・息遣い・水滴・何かを引きずる音・誰かの足音）。距離で小さく・こもり、左右に振れる。家・結末・ふだんの町・巨大戦の区画では鳴らさない。素材が無い時は合成の気配が鳴る（これは今も鳴っている）。
- **異形の声・予兆**：弾ける攻撃の予兆＝高い金属の「チャキッ」（刀を構える音・少し高く）、弾けない攻撃＝低い唸り（唸り声・低く）。声はゾンビの声・息遣い・幽霊的な声を、異形ごとに高さと大きさを変えて（帰路は小さく荒くしない）。
- **驚かし**は要所だけ：模倣する影の正体（`mimic_reveal`＝恐怖の不協和音）・ボスの起き上がり（`boss_rise`＝迫り来る恐怖）。悲鳴の素材（声優の声）は使わない（相棒の悲鳴は合成のまま）。
- **BGM**（`BGM_AREAS`・`bgmPlan`・`core/bgm.js`）：
  - 探索の曲は、区画に入ってしばらく（15〜30 秒）してから小さく一度だけ流し、終わったら 80〜180 秒休む（無音＝環境音だけの時間の方が長い）。
  - 鳴らさない所：序章のふだんの町・自宅・記録の間・結末の場面・巨大戦の区画の探索（巨大戦の間だけ曲）。
  - 戦い：敵対の異形が近い（緊張 0.5 以上）と戦いの曲。離れて 6 秒で引く。戦いで切れた探索の曲は 45 秒は流し直さない。
  - ボス戦（ボスの体力の表示が出ている間）：ボスの曲（巨大戦は怪物映画風の曲）。
  - 演出中：新しく始めない。戦いの曲は演出に入ると引く（間を作る）。探索の曲は下げて続ける。台詞の声が鳴る間はさらに下げる。
  - 出口は全体の音量の後ろ（`Sfx.master`）なので、場面の継ぎ目の沈み（dip）・演出の無音の間（silence）・スロー（muffle）がそのまま掛かる。台詞の声は別の出口（voiceBus）のまま。
  - スタッフロール：終わりの曲（読めていれば、合成の短い旋律の代わり）。
- **設定**：「BGM の音量」（既定 50%・全体の音量に掛かる）。

### 大きさ

- 置く時の形式：mp3・モノラル。効果音・足音 44.1kHz 64kbps、環境音 32kHz 48kbps（40 秒までの繰り返し）、曲 44.1kHz 48kbps（3 分 30 秒まで）。
- 見込み：効果音・足音 約 1.5MB、環境音 約 2.5MB、曲 約 12MB（10 曲）。起動時の読み込みには入らない（後読み）。
- 実際の合計は、素材を置いた後に `prepare.mjs` が出す（今は 0）。

### 使う素材（選んだ物）

出典の URL は素材の元の場所（記録用）。ダウンロードは各サイトのページから。「状態」は 2026-11-13 時点。

| キー（ファイル名） | サイト | 素材 | 出典 | 使う所（音の名前・環境の種類） | 状態 |
|---|---|---|---|---|---|
| 旧:step_asphalt | 効果音ラボ | アスファルトの上を歩く1 | https://soundeffect-lab.info/sound/various/mp3/walk-asphalt1.mp3 | 足音 asphalt（歩き） | 未取得 |
| 旧:step_asphalt_run | 効果音ラボ | アスファルトの上を走る1 | https://soundeffect-lab.info/sound/various/mp3/dash-asphalt1.mp3 | 足音 asphalt（走り） | 未取得 |
| 旧:step_wet | 効果音ラボ | 雨で濡れた道路を歩く | https://soundeffect-lab.info/sound/various/mp3/walk-wet1.mp3 | 足音 wet（歩き） | 未取得 |
| 旧:step_wet_run | 効果音ラボ | 雨で濡れた道路を走る | https://soundeffect-lab.info/sound/various/mp3/dash-wet1.mp3 | 足音 wet（走り） | 未取得 |
| 旧:step_tile | 効果音ラボ | 革靴で歩く | https://soundeffect-lab.info/sound/various/mp3/walk-leather-shoes1.mp3 | 足音 tile（歩き） | 未取得 |
| 旧:step_tile_run | 効果音ラボ | 革靴で走る | https://soundeffect-lab.info/sound/various/mp3/dash-leather-shoes1.mp3 | 足音 tile（走り） | 未取得 |
| 旧:step_wood | 効果音ラボ | 学校の廊下を歩く | https://soundeffect-lab.info/sound/various/mp3/walk-school1.mp3 | 足音 wood（歩き） | 未取得 |
| 旧:step_wood_run | 効果音ラボ | 学校の廊下を走る | https://soundeffect-lab.info/sound/various/mp3/dash-school1.mp3 | 足音 wood（走り） | 未取得 |
| 旧:step_gym | 効果音ラボ | 体育館で歩く | https://soundeffect-lab.info/sound/various/mp3/walk-gymnasium1.mp3 | 足音 gym（歩き） | 未取得 |
| 旧:step_gym_run | 効果音ラボ | 体育館で走る | https://soundeffect-lab.info/sound/various/mp3/dash-gymnasium1.mp3 | 足音 gym（走り） | 未取得 |
| 旧:amb_rain | 効果音ラボ | 雨が降る2（街の小雨） | https://soundeffect-lab.info/sound/environment/mp3/rain2.mp3 | street_normal・street・home・alley・plaza・gym・office | 未取得 |
| 旧:amb_wind | 効果音ラボ | 風が吹く3（不気味な音を立てる） | https://soundeffect-lab.info/sound/environment/mp3/wind3.mp3 | street・alley・plaza・oldwing・oldwing_dark・atrium・ruins・abyss | 未取得 |
| 旧:amb_wind_open | 効果音ラボ | 風が吹く1 | https://soundeffect-lab.info/sound/environment/mp3/wind1.mp3 | yard・abyss | 未取得 |
| 旧:amb_vent | 効果音ラボ | エアコン | https://soundeffect-lab.info/sound/machine/mp3/airconditioning1.mp3 | gym・hospital・tunnel・office・lab・oldwing・atrium・admin・admin_machine | 未取得 |
| 旧:amb_machine | 効果音ラボ | 工業地帯 | https://soundeffect-lab.info/sound/environment/mp3/industrialzone1.mp3 | lab・admin_machine | 未取得 |
| 旧:amb_sewer | 効果音ラボ | 下水道 | https://soundeffect-lab.info/sound/environment/mp3/sewer1.mp3 | tunnel | 未取得 |
| 旧:amb_room | 効果音ラボ | シーンと静まり返る教室 | https://soundeffect-lab.info/sound/environment/mp3/class-room-quiet1.mp3 | home・gym・hospital・office・oldwing・oldwing_dark・admin・kiroku | 未取得 |
| 旧:amb_town | 効果音ラボ | 閑静な住宅街1 | https://soundeffect-lab.info/sound/environment/mp3/quiet-residential-area1.mp3 | street_normal | 未取得 |
| 旧:amb_morning | 効果音ラボ | スズメが鳴く朝 | https://soundeffect-lab.info/sound/environment/mp3/sparrow-morning1.mp3 | epi_day | 未取得 |
| 旧:amb_dusk | 効果音ラボ | カラスが鳴く夕方 | https://soundeffect-lab.info/sound/environment/mp3/evening-crow1.mp3 | epi_dusk | 未取得 |
| 旧:amb_night | 効果音ラボ | 夏の田舎の夜 | https://soundeffect-lab.info/sound/environment/mp3/summer-night-country1.mp3 | epi_home | 未取得 |
| 旧:p_creak | 効果音ラボ | 古びたドアを開ける | https://soundeffect-lab.info/sound/various/mp3/door-old-open1.mp3 | p_creak | 未取得 |
| 旧:p_knock | 効果音ラボ | 木のドアをノック1 | https://soundeffect-lab.info/sound/various/mp3/door-wood-knock1.mp3 | p_knock | 未取得 |
| 旧:p_iron_knock | 効果音ラボ | 鉄のドアをノック1 | https://soundeffect-lab.info/sound/various/mp3/door-iron-knock1.mp3 | p_iron_knock | 未取得 |
| 旧:p_window | 効果音ラボ | 窓をノック1 | https://soundeffect-lab.info/sound/various/mp3/wind-knock1.mp3 | p_window | 未取得 |
| 旧:p_metal | 効果音ラボ | 鉄の棒を落とす | https://soundeffect-lab.info/sound/various/mp3/iron-stick1.mp3 | p_metal | 未取得 |
| 旧:p_breath | 効果音ラボ | ゾンビの息遣い | https://soundeffect-lab.info/sound/battle/mp3/zombie-breath1.mp3 | p_breath | 未取得 |
| 旧:p_drip | 効果音ラボ | 水滴がポタポタ | https://soundeffect-lab.info/sound/various/mp3/water-drop-potapota1.mp3 | p_drip | 未取得 |
| 旧:p_drag | 魔王魂 | 何かを引きづる音（sound07） | https://maou.audio/sound/se/maou_se_sound07.mp3 | p_drag | 未取得 |
| 旧:se_katana_swing1 | 効果音ラボ | 刀の素振り1 | https://soundeffect-lab.info/sound/battle/mp3/katana-gesture1.mp3 | swing | 未取得 |
| 旧:se_katana_swing2 | 効果音ラボ | 刀の素振り2 | https://soundeffect-lab.info/sound/battle/mp3/katana-gesture2.mp3 | swing | 未取得 |
| 旧:se_sword_swing | 効果音ラボ | 剣の素振り1 | https://soundeffect-lab.info/sound/battle/mp3/sword-gesture1.mp3 | swing_heavy | 未取得 |
| 旧:se_heavy_swing | 効果音ラボ | キックの素振り1 | https://soundeffect-lab.info/sound/battle/mp3/kick-real-swing1.mp3 | swing_pipe | 未取得 |
| 旧:se_claw_swing | 効果音ラボ | パンチの素振り3 | https://soundeffect-lab.info/sound/battle/mp3/punch-real-swing3.mp3 | claw | 未取得 |
| 旧:se_katana_slash1 | 効果音ラボ | 刀で斬る1 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash1.mp3 | hit | 未取得 |
| 旧:se_katana_slash2 | 効果音ラボ | 刀で斬る2 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash2.mp3 | hit_heavy | 未取得 |
| 旧:se_katana_slash3 | 効果音ラボ | 刀で斬る3 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash3.mp3 | hit | 未取得 |
| 旧:se_katana_slash4 | 効果音ラボ | 刀で斬る4 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash4.mp3 | blade | 未取得 |
| 旧:se_katana_slash5 | 効果音ラボ | 刀で斬る5 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash5.mp3 | chain | 未取得 |
| 旧:se_iainuki | 効果音ラボ | 居合抜き1 | https://soundeffect-lab.info/sound/battle/mp3/iainuki1.mp3 | issen | 未取得 |
| 旧:se_knife_slash | 効果音ラボ | ナイフで切る | https://soundeffect-lab.info/sound/battle/mp3/knife-slash-1.mp3 | claw_hit | 未取得 |
| 旧:se_blow1 | 効果音ラボ | 打撃1 | https://soundeffect-lab.info/sound/battle/mp3/blow1.mp3 | hurt | 未取得 |
| 旧:se_blow2 | 効果音ラボ | 打撃2 | https://soundeffect-lab.info/sound/battle/mp3/blow2.mp3 | hit_pipe | 未取得 |
| 旧:se_blow6 | 効果音ラボ | 打撃6 | https://soundeffect-lab.info/sound/battle/mp3/blow6.mp3 | stock | 未取得 |
| 旧:se_katana_clash1 | 効果音ラボ | 刀で打ち合う1 | https://soundeffect-lab.info/sound/battle/mp3/katana-clash1.mp3 | parry | 未取得 |
| 旧:se_katana_clash2 | 効果音ラボ | 刀で打ち合う2 | https://soundeffect-lab.info/sound/battle/mp3/katana-clash2.mp3 | guard | 未取得 |
| 旧:se_katana_hold | 効果音ラボ | 刀を構える | https://soundeffect-lab.info/sound/battle/mp3/katana-hold1.mp3 | tel_parry | 未取得 |
| 旧:se_growl | 効果音ラボ | ライオンの鳴き声3（唸り声） | https://soundeffect-lab.info/sound/battle/mp3/lion-cry3.mp3 | tel_red | 未取得 |
| 旧:se_handgun | 効果音ラボ | 拳銃を撃つ | https://soundeffect-lab.info/sound/battle/mp3/handgun-firing1.mp3 | shot・yodan | 未取得 |
| 旧:se_handgun_empty | 効果音ラボ | 拳銃の弾切れ | https://soundeffect-lab.info/sound/battle/mp3/handgun-out-bullets1.mp3 | dry | 未取得 |
| 旧:se_handgun_ready | 効果音ラボ | 拳銃をチャッと構える | https://soundeffect-lab.info/sound/battle/mp3/handgun-ready1.mp3 | reload | 未取得 |
| 旧:se_cloth | 効果音ラボ | キックの衣擦れ1 | https://soundeffect-lab.info/sound/battle/mp3/rubbing-clothes-kick1.mp3 | dodge | 未取得 |
| 旧:se_down | 効果音ラボ | 倒れる | https://soundeffect-lab.info/sound/battle/mp3/real-down1.mp3 | die | 未取得 |
| 旧:se_large_slash | 効果音ラボ | 大剣で斬る | https://soundeffect-lab.info/sound/battle/mp3/large-sword-slash1.mp3 | giant_claw | 未取得 |
| 旧:se_zombie1 | 効果音ラボ | ゾンビの声1 | https://soundeffect-lab.info/sound/battle/mp3/zombie-voice1.mp3 | heiten_voice・tsugi_voice | 未取得 |
| 旧:se_zombie2 | 効果音ラボ | ゾンビの声2 | https://soundeffect-lab.info/sound/battle/mp3/zombie-voice2.mp3 | kiro_voice | 未取得 |
| 旧:se_zombie3 | 効果音ラボ | ゾンビの声3 | https://soundeffect-lab.info/sound/battle/mp3/zombie-voice3.mp3 | kanja_voice・shuusha_voice | 未取得 |
| 旧:se_ghost | 魔王魂 | 幽霊的な（voice_monster03） | https://maou.audio/sound/se/maou_se_voice_monster03.mp3 | mimic_voice・outou_voice | 未取得 |
| 旧:se_dragon | 効果音ラボ | ドラゴンの鳴き声1 | https://soundeffect-lab.info/sound/battle/mp3/dragon-cry1.mp3 | giant_roar・boss_roar | 未取得 |
| 旧:se_monster_step | 効果音ラボ | 怪獣の足音 | https://soundeffect-lab.info/sound/battle/mp3/monster-footstep1.mp3 | giant_step | 未取得 |
| 旧:se_tremor | 効果音ラボ | 地響き | https://soundeffect-lab.info/sound/battle/mp3/earth-tremor1.mp3 | rumble | 未取得 |
| 旧:se_quake | 効果音ラボ | 地震魔法1 | https://soundeffect-lab.info/sound/battle/mp3/magic-quake1.mp3 | wave・land | 未取得 |
| 旧:se_tentacle | 効果音ラボ | うごめく触手 | https://soundeffect-lab.info/sound/battle/mp3/tentacle1.mp3 | relay_regrow | 未取得 |
| 旧:se_electron | 効果音ラボ | 雷魔法1 | https://soundeffect-lab.info/sound/battle/mp3/magic-electron1.mp3 | beam | 未取得 |
| 旧:se_approach | 効果音ラボ | 迫り来る恐怖 | https://soundeffect-lab.info/sound/anime/mp3/approaching-fear1.mp3 | boss_rise | 未取得 |
| 旧:se_dissonance | 効果音ラボ | 恐怖の不協和音 | https://soundeffect-lab.info/sound/anime/mp3/dissonance1.mp3 | mimic_reveal | 未取得 |
| 旧:se_heart | 効果音ラボ | 心臓の鼓動1 | https://soundeffect-lab.info/sound/anime/mp3/heart1.mp3 | heartbeat・rampage_pulse | 未取得 |
| 旧:se_door_old | 効果音ラボ | 古びたドアを開ける | https://soundeffect-lab.info/sound/various/mp3/door-old-open1.mp3 | door | 未取得 |
| 旧:se_door_open | 効果音ラボ | ドアを開ける3 | https://soundeffect-lab.info/sound/various/mp3/door-open3.mp3 | door | 未取得 |
| 旧:se_knock_wood | 効果音ラボ | 木のドアをノック1 | https://soundeffect-lab.info/sound/various/mp3/door-wood-knock1.mp3 | knock | 未取得 |
| 旧:se_iron_door_close | 効果音ラボ | 鉄の扉を閉める | https://soundeffect-lab.info/sound/various/mp3/iron-door-close1.mp3 | slam | 未取得 |
| 旧:se_glass | 効果音ラボ | ガラスが割れる2 | https://soundeffect-lab.info/sound/various/mp3/glass-break2.mp3 | glass_break | 未取得 |
| 旧:se_collapse_little | 効果音ラボ | 建物が少し崩れる2 | https://soundeffect-lab.info/sound/battle/mp3/building-collapse-little2.mp3 | crash | 未取得 |
| 旧:se_wall_break | 効果音ラボ | パンチで壁を破壊 | https://soundeffect-lab.info/sound/battle/mp3/wall-destruction1.mp3 | prop_break | 未取得 |
| 旧:se_gas | 効果音ラボ | ガスが噴き出す | https://soundeffect-lab.info/sound/various/mp3/gas1.mp3 | steam | 未取得 |
| 旧:se_evaporate | 効果音ラボ | 水がジューッと蒸発 | https://soundeffect-lab.info/sound/various/mp3/water-evaporation1.mp3 | fire_hit | 未取得 |
| 旧:se_iron_plate | 効果音ラボ | 鉄板を叩く1 | https://soundeffect-lab.info/sound/various/mp3/iron-plate1.mp3 | water_hammer | 未取得 |
| 旧:se_switch | 効果音ラボ | 電気のスイッチを入れる | https://soundeffect-lab.info/sound/various/mp3/electricity-switch1.mp3 | breaker | 未取得 |
| 旧:se_spark | 効果音ラボ | 電気バチバチ | https://soundeffect-lab.info/sound/various/mp3/electricity1.mp3 | flicker | 未取得 |
| 旧:se_drop | 効果音ラボ | 水滴1 | https://soundeffect-lab.info/sound/various/mp3/water-drop1.mp3 | drip_stand | 未取得 |
| 旧:se_alert | 効果音ラボ | 警報が鳴る | https://soundeffect-lab.info/sound/anime/mp3/emergency-alert1.mp3 | alarm | 未取得 |
| 旧:se_black_phone | 効果音ラボ | 黒電話のベルが鳴る | https://soundeffect-lab.info/sound/machine/mp3/phone-black-ringtone1.mp3 | phone_ring | 未取得 |
| 旧:se_phone_cut | 効果音ラボ | 電話が切れる2 | https://soundeffect-lab.info/sound/machine/mp3/phone-cut2.mp3 | pa_cut | 未取得 |
| 旧:se_pa_start | 効果音ラボ | 放送開始チャイム | https://soundeffect-lab.info/sound/anime/mp3/broadcasting-start1.mp3 | pa_chime | 未取得 |
| 旧:se_radio_noise | 効果音ラボ | トランシーバーのノイズ | https://soundeffect-lab.info/sound/machine/mp3/snow-noise1.mp3 | tv_blip | 未取得 |
| 旧:maoudamashii_cyber19 | 魔王魂 | サイバー19（廃墟を探索しているかのような） | https://maou.audio/sound/bgm/maou_bgm_cyber19.mp3 | shotengai・ruins | 未取得 |
| 旧:maoudamashii_fantasy09 | 魔王魂 | ファンタジー09（現代的でややホラーな探索） | https://maou.audio/sound/bgm/maou_bgm_fantasy09.mp3 | alley・plaza | 未取得 |
| 旧:maoudamashii_piano22 | 魔王魂 | ピアノ22（暗いピアノ） | https://maou.audio/sound/bgm/maou_bgm_piano22.mp3 | shelter・office | 未取得 |
| 旧:maoudamashii_cyber45 | 魔王魂 | サイバー45（主張が低い） | https://maou.audio/sound/bgm/maou_bgm_cyber45.mp3 | hospital・atrium・admin | 未取得 |
| 旧:maoudamashii_cyber34 | 魔王魂 | サイバー34（地下探索） | https://maou.audio/sound/bgm/maou_bgm_cyber34.mp3 | tunnel・lab | 未取得 |
| 旧:maoudamashii_neorock67 | 魔王魂 | ネオロック67（不気味なゆったり） | https://maou.audio/sound/bgm/maou_bgm_neorock67.mp3 | oldwing | 未取得 |
| 旧:maoudamashii_orchestra21 | 魔王魂 | オーケストラ21（緊迫感） | https://maou.audio/sound/bgm/maou_bgm_orchestra21.mp3 | 戦い（全区画） | 未取得 |
| 旧:maoudamashii_orchestra12 | 魔王魂 | オーケストラ12（ボス・通常戦） | https://maou.audio/sound/bgm/maou_bgm_orchestra12.mp3 | ボス戦（下記以外） | 未取得 |
| 旧:maoudamashii_orchestra17 | 魔王魂 | オーケストラ17（怪物映画風） | https://maou.audio/sound/bgm/maou_bgm_orchestra17.mp3 | yard（ボス）・town（ボス）・avenue（ボス）・abyss（ボス） | 未取得 |
| 旧:maoudamashii_orchestra26 | 魔王魂 | オーケストラ26（戦いが終わった後の静かな朝日） | https://maou.audio/sound/bgm/maou_bgm_orchestra26.mp3 | epilogue（スタッフロール） | 未取得 |

作者：効果音ラボの素材は効果音ラボ（管理者）、魔王魂の曲・効果音は森田交一（魔王魂）。

### 選ばなかった物と理由

- **DOVA-SYNDROME・OtoLogic**：規約が読めない（上の表）ので使わない。
- **効果音ラボの声素材**（悲鳴・うめき等）：相棒の声（VOICEVOX）と混ざると別人に聞こえる。声優の尊厳への配慮の条件もあるため、人の声は使わない。
- **驚かし向けの強い音**（ショック・バイオリン恐怖音・ホラータイトル表示音 等）：連発しない方針のため、要所の 2 つ（不協和音・迫り来る恐怖）だけにした。
- **UI の音・一閃の準備・回復・救出・終わりの合図・変身・時の巻き戻し**：遊びの合図として今の合成音が分かりやすく、ホラーの雰囲気を壊さないので合成のまま。
- **遠いサイレン・蛍光灯のうなり・店内放送の名残**：今の合成（こもった遠い音）で足りるので合成のまま。
- **魔王魂の明るい曲・激しいロック**：じわじわ型に合わない。

### 作り直し・差し替え

- 素材の選び直し：`shinshoku/data/sound.js` の `MATERIALS`（出典）・`SE_MAP`（音の名前との対応）・`AMB_MIX`・`PRESENCE`・`BGM_TRACKS`／`BGM_AREAS` を直し、`prepare.mjs` を流し直す。
- 確かめる：`node tests/run.mjs`（表の整合・ファイルの大きさ・表記）、Playwright で区画に入って `__sh.game.sound.log`（読んだ物）・`__sh.game.music.state()`（曲の状態）・`__sh.game.sfx.presenceLog`（気配）を見る。
