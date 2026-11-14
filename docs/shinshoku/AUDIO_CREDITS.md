# 『境界侵食』音の素材：規約・出典・使い方（2026-11-13）

方針（決定）：素材は**無料素材サイト**から。怖さは**じわじわ型**（静かな不安・環境音・間・暗さ・気配。驚かしは要所だけ）。進める順は**効果音 → BGM**。

## 状態（正直な現状）

- **素材ファイルはまだ 1 つもリポジトリに入っていない**（`shinshoku/data/sound_files.js` は空）。
  2026-11-13 の作業環境から素材サイトの mp3 を取得できなかった：効果音ラボ・魔王魂とも、mp3 の直接取得は 403（直リンク防止）。
  サイトのページから取る方法（ブラウザでダウンロードボタンを押す・リンク元を付ける）は、作業環境の自動判定で「ボットチェックの回避」として止められたため行っていない。
- そのため今のゲームでは、すべての音が `core/audio.js` の**合成音**（フォールバック）で鳴る。BGM は鳴らない（曲が無い）。
- 仕組み（対応表・後から読む・BGM の制御・設定・表記の出し分け・変換の道具）は入れてあり、素材を置けばそのまま使われる。

### 素材を入れる手順

1. 下の「使う素材」の各ページ（効果音ラボはカテゴリのページ、魔王魂は曲のページ）から、人の手で mp3 をダウンロードし、1 つのフォルダに置く（ファイル名はサイトのまま）。
2. `node tools/sound/prepare.mjs <そのフォルダ> --sample <リポジトリの外>/sample.mp3`
   - モノラル・大きさを揃えて `shinshoku/assets/sound/` に置き、置いた物の表 `shinshoku/data/sound_files.js` を作り直す。足りない物は飛ばす（その音は合成音のまま）。
   - `--sample`：主な効果音・環境音・各曲の冒頭を並べた聞き比べ用の mp3（リポジトリには入れない）。
3. `node tests/run.mjs`（`tests/shinshoku-audio.test.mjs` が表・大きさ・表記を確かめる）。
4. 表記はファイルの表から自動で出る（下の「クレジット」）。この文書の「状態」の列を「入れた」に直す。

## 規約（実際に読んだ物）

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

## クレジット（使った物だけ・自動）

- スタッフロール：`shinshoku/game/ch7.js` が `withAudioCredits(CREDITS.lines, SOUND_FILES)`（`shinshoku/data/sound.js`）で、「使わせてもらったもの」の前に「音楽・効果音（無料素材）」の段を足す。
  曲（魔王魂）を置いていれば「音楽：魔王魂」、効果音ラボの物があれば「効果音：効果音ラボ」、魔王魂の効果音があれば「効果音：魔王魂」と、サイトの URL。
- タイトルの注記：`shinshoku.html` の `#tt-audio-credit`（VOICEVOX の表記の続き）に同じ文を出す。素材が無い時は出さない（今は出ていない）。

## どの場面で何が鳴るか（設計）

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

## 大きさ

- 置く時の形式：mp3・モノラル。効果音・足音 44.1kHz 64kbps、環境音 32kHz 48kbps（40 秒までの繰り返し）、曲 44.1kHz 48kbps（3 分 30 秒まで）。
- 見込み：効果音・足音 約 1.5MB、環境音 約 2.5MB、曲 約 12MB（10 曲）。起動時の読み込みには入らない（後読み）。
- 実際の合計は、素材を置いた後に `prepare.mjs` が出す（今は 0）。

## 使う素材（選んだ物）

出典の URL は素材の元の場所（記録用）。ダウンロードは各サイトのページから。「状態」は 2026-11-13 時点。

| キー（ファイル名） | サイト | 素材 | 出典 | 使う所（音の名前・環境の種類） | 状態 |
|---|---|---|---|---|---|
| step_asphalt | 効果音ラボ | アスファルトの上を歩く1 | https://soundeffect-lab.info/sound/various/mp3/walk-asphalt1.mp3 | 足音 asphalt（歩き） | 未取得 |
| step_asphalt_run | 効果音ラボ | アスファルトの上を走る1 | https://soundeffect-lab.info/sound/various/mp3/dash-asphalt1.mp3 | 足音 asphalt（走り） | 未取得 |
| step_wet | 効果音ラボ | 雨で濡れた道路を歩く | https://soundeffect-lab.info/sound/various/mp3/walk-wet1.mp3 | 足音 wet（歩き） | 未取得 |
| step_wet_run | 効果音ラボ | 雨で濡れた道路を走る | https://soundeffect-lab.info/sound/various/mp3/dash-wet1.mp3 | 足音 wet（走り） | 未取得 |
| step_tile | 効果音ラボ | 革靴で歩く | https://soundeffect-lab.info/sound/various/mp3/walk-leather-shoes1.mp3 | 足音 tile（歩き） | 未取得 |
| step_tile_run | 効果音ラボ | 革靴で走る | https://soundeffect-lab.info/sound/various/mp3/dash-leather-shoes1.mp3 | 足音 tile（走り） | 未取得 |
| step_wood | 効果音ラボ | 学校の廊下を歩く | https://soundeffect-lab.info/sound/various/mp3/walk-school1.mp3 | 足音 wood（歩き） | 未取得 |
| step_wood_run | 効果音ラボ | 学校の廊下を走る | https://soundeffect-lab.info/sound/various/mp3/dash-school1.mp3 | 足音 wood（走り） | 未取得 |
| step_gym | 効果音ラボ | 体育館で歩く | https://soundeffect-lab.info/sound/various/mp3/walk-gymnasium1.mp3 | 足音 gym（歩き） | 未取得 |
| step_gym_run | 効果音ラボ | 体育館で走る | https://soundeffect-lab.info/sound/various/mp3/dash-gymnasium1.mp3 | 足音 gym（走り） | 未取得 |
| amb_rain | 効果音ラボ | 雨が降る2（街の小雨） | https://soundeffect-lab.info/sound/environment/mp3/rain2.mp3 | street_normal・street・home・alley・plaza・gym・office | 未取得 |
| amb_wind | 効果音ラボ | 風が吹く3（不気味な音を立てる） | https://soundeffect-lab.info/sound/environment/mp3/wind3.mp3 | street・alley・plaza・oldwing・oldwing_dark・atrium・ruins・abyss | 未取得 |
| amb_wind_open | 効果音ラボ | 風が吹く1 | https://soundeffect-lab.info/sound/environment/mp3/wind1.mp3 | yard・abyss | 未取得 |
| amb_vent | 効果音ラボ | エアコン | https://soundeffect-lab.info/sound/machine/mp3/airconditioning1.mp3 | gym・hospital・tunnel・office・lab・oldwing・atrium・admin・admin_machine | 未取得 |
| amb_machine | 効果音ラボ | 工業地帯 | https://soundeffect-lab.info/sound/environment/mp3/industrialzone1.mp3 | lab・admin_machine | 未取得 |
| amb_sewer | 効果音ラボ | 下水道 | https://soundeffect-lab.info/sound/environment/mp3/sewer1.mp3 | tunnel | 未取得 |
| amb_room | 効果音ラボ | シーンと静まり返る教室 | https://soundeffect-lab.info/sound/environment/mp3/class-room-quiet1.mp3 | home・gym・hospital・office・oldwing・oldwing_dark・admin・kiroku | 未取得 |
| amb_town | 効果音ラボ | 閑静な住宅街1 | https://soundeffect-lab.info/sound/environment/mp3/quiet-residential-area1.mp3 | street_normal | 未取得 |
| amb_morning | 効果音ラボ | スズメが鳴く朝 | https://soundeffect-lab.info/sound/environment/mp3/sparrow-morning1.mp3 | epi_day | 未取得 |
| amb_dusk | 効果音ラボ | カラスが鳴く夕方 | https://soundeffect-lab.info/sound/environment/mp3/evening-crow1.mp3 | epi_dusk | 未取得 |
| amb_night | 効果音ラボ | 夏の田舎の夜 | https://soundeffect-lab.info/sound/environment/mp3/summer-night-country1.mp3 | epi_home | 未取得 |
| p_creak | 効果音ラボ | 古びたドアを開ける | https://soundeffect-lab.info/sound/various/mp3/door-old-open1.mp3 | p_creak | 未取得 |
| p_knock | 効果音ラボ | 木のドアをノック1 | https://soundeffect-lab.info/sound/various/mp3/door-wood-knock1.mp3 | p_knock | 未取得 |
| p_iron_knock | 効果音ラボ | 鉄のドアをノック1 | https://soundeffect-lab.info/sound/various/mp3/door-iron-knock1.mp3 | p_iron_knock | 未取得 |
| p_window | 効果音ラボ | 窓をノック1 | https://soundeffect-lab.info/sound/various/mp3/wind-knock1.mp3 | p_window | 未取得 |
| p_metal | 効果音ラボ | 鉄の棒を落とす | https://soundeffect-lab.info/sound/various/mp3/iron-stick1.mp3 | p_metal | 未取得 |
| p_breath | 効果音ラボ | ゾンビの息遣い | https://soundeffect-lab.info/sound/battle/mp3/zombie-breath1.mp3 | p_breath | 未取得 |
| p_drip | 効果音ラボ | 水滴がポタポタ | https://soundeffect-lab.info/sound/various/mp3/water-drop-potapota1.mp3 | p_drip | 未取得 |
| p_drag | 魔王魂 | 何かを引きづる音（sound07） | https://maou.audio/sound/se/maou_se_sound07.mp3 | p_drag | 未取得 |
| se_katana_swing1 | 効果音ラボ | 刀の素振り1 | https://soundeffect-lab.info/sound/battle/mp3/katana-gesture1.mp3 | swing | 未取得 |
| se_katana_swing2 | 効果音ラボ | 刀の素振り2 | https://soundeffect-lab.info/sound/battle/mp3/katana-gesture2.mp3 | swing | 未取得 |
| se_sword_swing | 効果音ラボ | 剣の素振り1 | https://soundeffect-lab.info/sound/battle/mp3/sword-gesture1.mp3 | swing_heavy | 未取得 |
| se_heavy_swing | 効果音ラボ | キックの素振り1 | https://soundeffect-lab.info/sound/battle/mp3/kick-real-swing1.mp3 | swing_pipe | 未取得 |
| se_claw_swing | 効果音ラボ | パンチの素振り3 | https://soundeffect-lab.info/sound/battle/mp3/punch-real-swing3.mp3 | claw | 未取得 |
| se_katana_slash1 | 効果音ラボ | 刀で斬る1 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash1.mp3 | hit | 未取得 |
| se_katana_slash2 | 効果音ラボ | 刀で斬る2 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash2.mp3 | hit_heavy | 未取得 |
| se_katana_slash3 | 効果音ラボ | 刀で斬る3 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash3.mp3 | hit | 未取得 |
| se_katana_slash4 | 効果音ラボ | 刀で斬る4 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash4.mp3 | blade | 未取得 |
| se_katana_slash5 | 効果音ラボ | 刀で斬る5 | https://soundeffect-lab.info/sound/battle/mp3/katana-slash5.mp3 | chain | 未取得 |
| se_iainuki | 効果音ラボ | 居合抜き1 | https://soundeffect-lab.info/sound/battle/mp3/iainuki1.mp3 | issen | 未取得 |
| se_knife_slash | 効果音ラボ | ナイフで切る | https://soundeffect-lab.info/sound/battle/mp3/knife-slash-1.mp3 | claw_hit | 未取得 |
| se_blow1 | 効果音ラボ | 打撃1 | https://soundeffect-lab.info/sound/battle/mp3/blow1.mp3 | hurt | 未取得 |
| se_blow2 | 効果音ラボ | 打撃2 | https://soundeffect-lab.info/sound/battle/mp3/blow2.mp3 | hit_pipe | 未取得 |
| se_blow6 | 効果音ラボ | 打撃6 | https://soundeffect-lab.info/sound/battle/mp3/blow6.mp3 | stock | 未取得 |
| se_katana_clash1 | 効果音ラボ | 刀で打ち合う1 | https://soundeffect-lab.info/sound/battle/mp3/katana-clash1.mp3 | parry | 未取得 |
| se_katana_clash2 | 効果音ラボ | 刀で打ち合う2 | https://soundeffect-lab.info/sound/battle/mp3/katana-clash2.mp3 | guard | 未取得 |
| se_katana_hold | 効果音ラボ | 刀を構える | https://soundeffect-lab.info/sound/battle/mp3/katana-hold1.mp3 | tel_parry | 未取得 |
| se_growl | 効果音ラボ | ライオンの鳴き声3（唸り声） | https://soundeffect-lab.info/sound/battle/mp3/lion-cry3.mp3 | tel_red | 未取得 |
| se_handgun | 効果音ラボ | 拳銃を撃つ | https://soundeffect-lab.info/sound/battle/mp3/handgun-firing1.mp3 | shot・yodan | 未取得 |
| se_handgun_empty | 効果音ラボ | 拳銃の弾切れ | https://soundeffect-lab.info/sound/battle/mp3/handgun-out-bullets1.mp3 | dry | 未取得 |
| se_handgun_ready | 効果音ラボ | 拳銃をチャッと構える | https://soundeffect-lab.info/sound/battle/mp3/handgun-ready1.mp3 | reload | 未取得 |
| se_cloth | 効果音ラボ | キックの衣擦れ1 | https://soundeffect-lab.info/sound/battle/mp3/rubbing-clothes-kick1.mp3 | dodge | 未取得 |
| se_down | 効果音ラボ | 倒れる | https://soundeffect-lab.info/sound/battle/mp3/real-down1.mp3 | die | 未取得 |
| se_large_slash | 効果音ラボ | 大剣で斬る | https://soundeffect-lab.info/sound/battle/mp3/large-sword-slash1.mp3 | giant_claw | 未取得 |
| se_zombie1 | 効果音ラボ | ゾンビの声1 | https://soundeffect-lab.info/sound/battle/mp3/zombie-voice1.mp3 | heiten_voice・tsugi_voice | 未取得 |
| se_zombie2 | 効果音ラボ | ゾンビの声2 | https://soundeffect-lab.info/sound/battle/mp3/zombie-voice2.mp3 | kiro_voice | 未取得 |
| se_zombie3 | 効果音ラボ | ゾンビの声3 | https://soundeffect-lab.info/sound/battle/mp3/zombie-voice3.mp3 | kanja_voice・shuusha_voice | 未取得 |
| se_ghost | 魔王魂 | 幽霊的な（voice_monster03） | https://maou.audio/sound/se/maou_se_voice_monster03.mp3 | mimic_voice・outou_voice | 未取得 |
| se_dragon | 効果音ラボ | ドラゴンの鳴き声1 | https://soundeffect-lab.info/sound/battle/mp3/dragon-cry1.mp3 | giant_roar・boss_roar | 未取得 |
| se_monster_step | 効果音ラボ | 怪獣の足音 | https://soundeffect-lab.info/sound/battle/mp3/monster-footstep1.mp3 | giant_step | 未取得 |
| se_tremor | 効果音ラボ | 地響き | https://soundeffect-lab.info/sound/battle/mp3/earth-tremor1.mp3 | rumble | 未取得 |
| se_quake | 効果音ラボ | 地震魔法1 | https://soundeffect-lab.info/sound/battle/mp3/magic-quake1.mp3 | wave・land | 未取得 |
| se_tentacle | 効果音ラボ | うごめく触手 | https://soundeffect-lab.info/sound/battle/mp3/tentacle1.mp3 | relay_regrow | 未取得 |
| se_electron | 効果音ラボ | 雷魔法1 | https://soundeffect-lab.info/sound/battle/mp3/magic-electron1.mp3 | beam | 未取得 |
| se_approach | 効果音ラボ | 迫り来る恐怖 | https://soundeffect-lab.info/sound/anime/mp3/approaching-fear1.mp3 | boss_rise | 未取得 |
| se_dissonance | 効果音ラボ | 恐怖の不協和音 | https://soundeffect-lab.info/sound/anime/mp3/dissonance1.mp3 | mimic_reveal | 未取得 |
| se_heart | 効果音ラボ | 心臓の鼓動1 | https://soundeffect-lab.info/sound/anime/mp3/heart1.mp3 | heartbeat・rampage_pulse | 未取得 |
| se_door_old | 効果音ラボ | 古びたドアを開ける | https://soundeffect-lab.info/sound/various/mp3/door-old-open1.mp3 | door | 未取得 |
| se_door_open | 効果音ラボ | ドアを開ける3 | https://soundeffect-lab.info/sound/various/mp3/door-open3.mp3 | door | 未取得 |
| se_knock_wood | 効果音ラボ | 木のドアをノック1 | https://soundeffect-lab.info/sound/various/mp3/door-wood-knock1.mp3 | knock | 未取得 |
| se_iron_door_close | 効果音ラボ | 鉄の扉を閉める | https://soundeffect-lab.info/sound/various/mp3/iron-door-close1.mp3 | slam | 未取得 |
| se_glass | 効果音ラボ | ガラスが割れる2 | https://soundeffect-lab.info/sound/various/mp3/glass-break2.mp3 | glass_break | 未取得 |
| se_collapse_little | 効果音ラボ | 建物が少し崩れる2 | https://soundeffect-lab.info/sound/battle/mp3/building-collapse-little2.mp3 | crash | 未取得 |
| se_wall_break | 効果音ラボ | パンチで壁を破壊 | https://soundeffect-lab.info/sound/battle/mp3/wall-destruction1.mp3 | prop_break | 未取得 |
| se_gas | 効果音ラボ | ガスが噴き出す | https://soundeffect-lab.info/sound/various/mp3/gas1.mp3 | steam | 未取得 |
| se_evaporate | 効果音ラボ | 水がジューッと蒸発 | https://soundeffect-lab.info/sound/various/mp3/water-evaporation1.mp3 | fire_hit | 未取得 |
| se_iron_plate | 効果音ラボ | 鉄板を叩く1 | https://soundeffect-lab.info/sound/various/mp3/iron-plate1.mp3 | water_hammer | 未取得 |
| se_switch | 効果音ラボ | 電気のスイッチを入れる | https://soundeffect-lab.info/sound/various/mp3/electricity-switch1.mp3 | breaker | 未取得 |
| se_spark | 効果音ラボ | 電気バチバチ | https://soundeffect-lab.info/sound/various/mp3/electricity1.mp3 | flicker | 未取得 |
| se_drop | 効果音ラボ | 水滴1 | https://soundeffect-lab.info/sound/various/mp3/water-drop1.mp3 | drip_stand | 未取得 |
| se_alert | 効果音ラボ | 警報が鳴る | https://soundeffect-lab.info/sound/anime/mp3/emergency-alert1.mp3 | alarm | 未取得 |
| se_black_phone | 効果音ラボ | 黒電話のベルが鳴る | https://soundeffect-lab.info/sound/machine/mp3/phone-black-ringtone1.mp3 | phone_ring | 未取得 |
| se_phone_cut | 効果音ラボ | 電話が切れる2 | https://soundeffect-lab.info/sound/machine/mp3/phone-cut2.mp3 | pa_cut | 未取得 |
| se_pa_start | 効果音ラボ | 放送開始チャイム | https://soundeffect-lab.info/sound/anime/mp3/broadcasting-start1.mp3 | pa_chime | 未取得 |
| se_radio_noise | 効果音ラボ | トランシーバーのノイズ | https://soundeffect-lab.info/sound/machine/mp3/snow-noise1.mp3 | tv_blip | 未取得 |
| maoudamashii_cyber19 | 魔王魂 | サイバー19（廃墟を探索しているかのような） | https://maou.audio/sound/bgm/maou_bgm_cyber19.mp3 | shotengai・ruins | 未取得 |
| maoudamashii_fantasy09 | 魔王魂 | ファンタジー09（現代的でややホラーな探索） | https://maou.audio/sound/bgm/maou_bgm_fantasy09.mp3 | alley・plaza | 未取得 |
| maoudamashii_piano22 | 魔王魂 | ピアノ22（暗いピアノ） | https://maou.audio/sound/bgm/maou_bgm_piano22.mp3 | shelter・office | 未取得 |
| maoudamashii_cyber45 | 魔王魂 | サイバー45（主張が低い） | https://maou.audio/sound/bgm/maou_bgm_cyber45.mp3 | hospital・atrium・admin | 未取得 |
| maoudamashii_cyber34 | 魔王魂 | サイバー34（地下探索） | https://maou.audio/sound/bgm/maou_bgm_cyber34.mp3 | tunnel・lab | 未取得 |
| maoudamashii_neorock67 | 魔王魂 | ネオロック67（不気味なゆったり） | https://maou.audio/sound/bgm/maou_bgm_neorock67.mp3 | oldwing | 未取得 |
| maoudamashii_orchestra21 | 魔王魂 | オーケストラ21（緊迫感） | https://maou.audio/sound/bgm/maou_bgm_orchestra21.mp3 | 戦い（全区画） | 未取得 |
| maoudamashii_orchestra12 | 魔王魂 | オーケストラ12（ボス・通常戦） | https://maou.audio/sound/bgm/maou_bgm_orchestra12.mp3 | ボス戦（下記以外） | 未取得 |
| maoudamashii_orchestra17 | 魔王魂 | オーケストラ17（怪物映画風） | https://maou.audio/sound/bgm/maou_bgm_orchestra17.mp3 | yard（ボス）・town（ボス）・avenue（ボス）・abyss（ボス） | 未取得 |
| maoudamashii_orchestra26 | 魔王魂 | オーケストラ26（戦いが終わった後の静かな朝日） | https://maou.audio/sound/bgm/maou_bgm_orchestra26.mp3 | epilogue（スタッフロール） | 未取得 |

作者：効果音ラボの素材は効果音ラボ（管理者）、魔王魂の曲・効果音は森田交一（魔王魂）。

## 選ばなかった物と理由

- **DOVA-SYNDROME・OtoLogic**：規約が読めない（上の表）ので使わない。
- **効果音ラボの声素材**（悲鳴・うめき等）：相棒の声（VOICEVOX）と混ざると別人に聞こえる。声優の尊厳への配慮の条件もあるため、人の声は使わない。
- **驚かし向けの強い音**（ショック・バイオリン恐怖音・ホラータイトル表示音 等）：連発しない方針のため、要所の 2 つ（不協和音・迫り来る恐怖）だけにした。
- **UI の音・一閃の準備・回復・救出・終わりの合図・変身・時の巻き戻し**：遊びの合図として今の合成音が分かりやすく、ホラーの雰囲気を壊さないので合成のまま。
- **遠いサイレン・蛍光灯のうなり・店内放送の名残**：今の合成（こもった遠い音）で足りるので合成のまま。
- **魔王魂の明るい曲・激しいロック**：じわじわ型に合わない。

## 作り直し・差し替え

- 素材の選び直し：`shinshoku/data/sound.js` の `MATERIALS`（出典）・`SE_MAP`（音の名前との対応）・`AMB_MIX`・`PRESENCE`・`BGM_TRACKS`／`BGM_AREAS` を直し、`prepare.mjs` を流し直す。
- 確かめる：`node tests/run.mjs`（表の整合・ファイルの大きさ・表記）、Playwright で区画に入って `__sh.game.sound.log`（読んだ物）・`__sh.game.music.state()`（曲の状態）・`__sh.game.sfx.presenceLog`（気配）を見る。
