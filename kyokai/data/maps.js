/* ══════════════════════════════════════════════════════════════════════
   境界事象  歩いて回る月代町の地図データ（kyokai/data/maps.js・global KY_MAPS）
   overworld.js が描く。DOM を使わない純粋なデータと関数だけ（tests/kyokai-overworld.test.mjs が node で読む）。

   ■ マス（16×16 ドット）の文字
     歩ける : .床 ,草 :土の道 -敷石 =車道 n境界ノイズ（B/C で危険度>0 のときだけ有効。地面はその地図の ground）
              D戸口・入口（上が壁なら扉、そうでなければ玄関マット） o階段 B橋 Uトンネルの暗い地面 z踏切・線路の上
              O駅のホームの縁 Z境界の裂け目（町から境界側の場所へ入る）
     壁・物 : #屋内の壁 w窓 j黒板/ホワイトボード c壁の時計 I額・写真・掲示 a貼り紙・札 M大きなモニター e分電盤
              F冷水器/ストーブ/ロッカー d机 m机の端末・操作卓 k棚 K機械ラック g観測装置 p鉢植え b長椅子 s立て札
              v自動販売機（B は丸ポスト） L街灯/カーブミラー P電柱 E鉄塔/火の見やぐら/塔 T木 t茂み ~水 f柵
              x瓦礫 X岩 h屋根 W外壁 H閉じた玄関 S店先 Y鳥居の柱 Q社殿 q灯籠 G像（地蔵・狛犬・狐・銅像） C木箱
              R線路 [列車 V虚空 J重い扉 i柱 u停留所 l街頭の時計 y破片（混ざる世界）
   ■ 地図 = { ground, rows:[文字列], warps:[[x,y,行き先]], spawn:[x,y,向き], anchors:{名前:[x,y]}, patch:{A|B|C:[[x,y,文字]]},
              proj:[x0,y0,x1,y1]（場面の 0..1 をマスに写す範囲・表に無い調べ物の置き場所）, noExit }
     行き先は 'town'（町）か場所 id（その場所の地図の、こちらへ戻る出入口の前に出る）。
   ■ SPOTS[場所][調べ物id] = 'アンカー名' | 'アンカー名@人物' | 'アンカー名@人物:向き(u/d/l/r)' | [x,y,'人物?']
     人物が付いたものは歩ける床に立つ人・生き物、付かないものは壁や家具そのもの（床の上なら小物の絵を置く）。
     表に無い調べ物は proj から近い空きマスに「？」として置く（overworld.js がコンソールに記録する）。
   ══════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  const M = root.KY_MAPS = root.KY_MAPS || {};

  /* ───────── マスの性質 ───────── */
  const WALK = new Set(['.', ',', ':', '-', '=', 'n', 'D', 'o', 'B', 'U', 'z', 'Z', 'O']);
  const WALLISH = new Set(['#', 'w', 'j', 'c', 'I', 'a', 'M', 'e', 'W', 'H', 'S', 'h']);   // 壁に付く物（壁の地を先に描く）
  const ALL = '.,:-=nDoBUzZO#wjcIaMeFdmkKgpbsvLPETt~fxXhWHSYQqGCR[VJiuly';
  M.WALK = WALK; M.WALLISH = WALLISH; M.CHARS = ALL;
  M.walkable = ch => WALK.has(ch);
  M.DIRS = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] };

  /* ───────── 場所の地図 ───────── */
  const MAPS = M.MAPS = {};

  MAPS.center_office = {
    ground: '.', indoor: true,
    rows: [
      '##############',
      '#wwDjjcIIaa#D#',
      '#F...........#',
      '#..mm........#',
      '#s.dd....dd..#',
      '#............#',
      '#...n.....n.o#',
      '#.dddddddd...#',
      '#............#',
      '######DD######',
    ],
    warps: [[6, 9, 'town'], [7, 9, 'town'], [3, 1, 'center_server'], [12, 1, 'center_lab'], [12, 6, 'center_basement']],
    spawn: [6, 8, 'u'],
    anchors: { clock: [6, 1], window: [2, 1], board: [5, 1], photos: [7, 1], plate: [9, 1], calendar: [10, 1], cooler: [1, 2],
      term: [3, 3], mapstand: [1, 4], yuu: [2, 3], mido: [9, 3], nagi: [6, 5], saeki: [11, 4], entrance: [8, 8], paper: [2, 5], selfdesk: [8, 7] },
    patch: { C: [[10, 2, 'x'], [1, 8, 'x'], [4, 8, 'x'], [11, 5, 'x']] },
    proj: [1, 2, 12, 8],
  };

  MAPS.center_server = {
    ground: '.', indoor: true,
    rows: [
      '##########',
      '#aa#ee####',
      '#K.K..mm.#',
      '#K.K.....#',
      '#K.K...KK#',
      '#...n....#',
      '#K.K..KK.#',
      '#........#',
      '####DD####',
    ],
    warps: [[4, 8, 'center_office'], [5, 8, 'center_office']],
    spawn: [4, 7, 'u'],
    anchors: { rack: [1, 3], notice: [1, 1], logterm: [6, 2], sync: [7, 4], archive: [6, 6], panel: [4, 1] },
    patch: { C: [[3, 2, 'x'], [3, 3, 'x'], [8, 7, 'x']] },
    proj: [1, 2, 8, 7],
  };

  MAPS.center_lab = {
    ground: '.', indoor: true,
    rows: [
      '############',
      '#ee#MMMM#ee#',
      '#....mm....#',
      '#k.......gg#',
      '#k..n......#',
      '#....gg..kk#',
      '#..........#',
      '#m.......n.#',
      '#..........#',
      '#####DD#####',
    ],
    warps: [[5, 9, 'center_office'], [6, 9, 'center_office']],
    spawn: [5, 8, 'u'],
    anchors: { monitor: [7, 1], console: [5, 2], antenna: [9, 3], drawer: [10, 5], oldterm: [1, 7], mido: [7, 4], apparatus: [5, 5], apparatus2: [6, 5], shiro: [3, 6] },
    patch: { C: [[10, 7, 'x'], [2, 2, 'x'], [8, 8, 'x']] },
    proj: [1, 1, 10, 8],
  };

  MAPS.center_basement = {
    ground: '.', indoor: true,
    rows: [
      '##############',
      '#e##e###Ja####',
      '#..#.........#',
      '#..#.........#',
      '#..#....n....#',
      '#.......n....#',
      '#..#.........#',
      '#..#.........#',
      '###########o##',
    ],
    warps: [[11, 8, 'center_office']],
    spawn: [11, 7, 'u'],
    anchors: { door: [8, 1], keypad: [9, 1], panel: [4, 1], wall: [3, 3], main: [1, 1], backwall: [2, 1], rubble: [6, 7] },
    patch: { C: [[3, 3, 'x'], [6, 7, 'x'], [7, 7, 'x'], [12, 2, 'x']] },
    proj: [1, 1, 12, 7],
  };

  MAPS.shotengai = {
    ground: '-',
    rows: [
      'hhhhhhhhhhhhhhhhhhhhhhhh',
      'WSSWSSWSSWSSWSSWSSWSSWSW',
      '------------------------',
      '---------i--------------',
      '-----n------v-----n-----',
      '--n-----------n------n--',
      '--s---------------------',
      'ttttfttttttfttttttfttttt',
    ],
    warps: [[0, 3, 'town'], [0, 4, 'town'], [0, 5, 'town'], [0, 6, 'town'], [23, 3, 'town'], [23, 4, 'town'], [23, 5, 'town'], [23, 6, 'town']],
    spawn: [1, 4, 'r'],
    anchors: { shop1: [1, 1], meat: [4, 1], dagashi: [7, 1], book: [10, 1], conv: [13, 1], tabako: [16, 1], laundry: [19, 1], shop8: [22, 1],
      pillar: [9, 3], vend: [12, 4], sign: [2, 6], sakaguchi: [2, 2], clockman: [1, 2], matsui: [8, 2], kashiwagi: [11, 2], kashiwagi2: [10, 3],
      kashihon: [14, 2], takano: [19, 4], cat: [5, 6], phone: [22, 2] },
    patch: { C: [[6, 3, 'x'], [15, 5, 'x'], [20, 3, 'x'], [3, 4, 'x'], [17, 6, 'x']] },
    proj: [1, 1, 22, 6],
  };

  MAPS.residential = {
    ground: ',',
    rows: [
      'hhhhh,,hhhhhh,,hhhhh',
      'hhhhh,,hhhhhh,,hhhhh',
      'WHWWW,,WWHWWW,,WWHWW',
      'ff-ff,,ff-fff,,ff-ff',
      '--------------------',
      '====================',
      '====================',
      '-P-----v-------P----',
      ',,,,,,,fffffffffffff',
      ',,s,,,,hhhhhhhhhhhhh',
      ',,,,n,,hhhhhhhhhhhhh',
      ',n,,,,,WWHWWWWWWHWWW',
      ',,,,,,,,,,,,,,n,,,,,',
    ],
    warps: [[0, 4, 'town'], [0, 5, 'town'], [0, 6, 'town'], [0, 7, 'town'], [19, 4, 'town'], [19, 5, 'town'], [19, 6, 'town'], [19, 7, 'town']],
    spawn: [1, 5, 'r'],
    anchors: { pole: [1, 7], pole2: [15, 7], vend: [7, 7], hayase: [14, 4], miura: [11, 7], lot: [2, 9], dog: [17, 7], house1: [1, 2],
      nagihouse: [9, 2], house5: [17, 2], window: [2, 2], tower: [5, 0], alley: [6, 1] },
    patch: { B: [[5, 0, 'E']], C: [[9, 2, 'x'], [10, 2, 'x'], [12, 5, 'x'], [4, 6, 'x'], [16, 12, 'x']] },
    proj: [0, 1, 19, 11],
  };

  MAPS.school = {
    ground: ':',
    rows: [
      'hhhhhhhhhhhhhhhhhhhh',
      'hhhhhhhhhhhhhhhhhhhh',
      'WwWwWwWWWWWWWwWwWwWW',
      'WwWwWwWcWHHWawWwWwWW',
      '::::::::::::::::::::',
      'T,,::::::::::::::,,T',
      'T,,::::::::::::::,,T',
      'T:::::::::::::G::::T',
      'T:::n:::::::::::n::T',
      'T::::::::::::::::::T',
      'T::::::::n:::::::::T',
      'T::::::::::::::::::T',
      'TTTTTTTTf::fTTTTTTTT',
      'TTTTTTTTf::fTTTTTTTT',
    ],
    warps: [[9, 13, 'town'], [10, 13, 'town']],
    spawn: [9, 12, 'u'],
    anchors: { clock: [7, 3], banner: [12, 3], door: [9, 3], door2: [10, 3], night: [1, 3], board: [5, 3], infirm: [15, 3],
      terada: [4, 7], terada2: [2, 4], twins: [13, 8], statue: [14, 7], drawing: [2, 10] },
    patch: { C: [[6, 8, 'x'], [11, 6, 'x'], [16, 10, 'x'], [12, 11, 'x']] },
    proj: [1, 3, 18, 11],
  };

  MAPS.shrine = {
    ground: ',',
    rows: [
      'TTTTTQQQQQQTTTTT',
      'TTTTTQQQQQQTTTTT',
      'TT,,,QQQQQQ,,,TT',
      'T,,q,,,::,,,q,,T',
      'T,,,,,,::,,,,,,T',
      'T,,,,,,::,,,k,,T',
      'T,,,,,,::,,,k,,T',
      'T,,,G,,::,,G,,,T',
      'T,,,,,,::,,,,,,T',
      'T,,,,,Y::Y,,,,,T',
      'T,,n,,,::,,,,n,T',
      'T,,,,,,::,,,,,,T',
      'TTTTTTT::TTTTTTT',
      'TTTTTTTooTTTTTTT',
    ],
    warps: [[7, 13, 'town'], [8, 13, 'town']],
    spawn: [7, 12, 'u'],
    anchors: { hall: [7, 2], under: [8, 2], ema: [12, 5], ema2: [12, 6], priest: [13, 3], priest2: [11, 8], priest3: [9, 4], torii: [6, 9], fox: [4, 7], lantern: [3, 3] },
    patch: { C: [[10, 4, 'x'], [4, 10, 'x'], [13, 9, 'x']] },
    proj: [1, 2, 14, 11],
  };

  MAPS.riverbank = {
    ground: ',',
    rows: [
      'TTTTTTTT::::TTTTTTTT',
      ',,,,,,,,::::,,,,,,,,',
      '::::::::::::::::::::',
      ',,,,,,,,,,,,,,,s,,,,',
      ',,b,,,,n,,,,,,,,,n,,',
      ',,,,,,,,,,,,,,,,,,,,',
      ',,,,,,,,::::,,,,,,,,',
      '~~~~~~~~BBBB~~~~~~~~',
      '~~~~~~~~BBBB~~~~~~~~',
      '~~~~~~~~~~~~~~~~~~~~',
      '~~~~~~~~BBBB~~~~~~~~',
      '~~~~~~~~BBBB~~~~~~~~',
    ],
    warps: [[8, 0, 'town'], [9, 0, 'town'], [10, 0, 'town'], [11, 0, 'town']],
    spawn: [9, 1, 'd'],
    anchors: { gap: [9, 9], bridge: [9, 7], fisher: [1, 6], angler: [4, 6], mud: [6, 6], sign: [15, 3], bench: [2, 4] },
    patch: {
      B: [[8, 7, 'R'], [9, 7, 'R'], [10, 7, 'R'], [11, 7, 'R'], [8, 8, 'R'], [9, 8, 'R'], [10, 8, 'R'], [11, 8, 'R'], [8, 9, 'R'], [9, 9, 'R'], [10, 9, 'R'], [11, 9, 'R']],
      C: [[8, 7, 'x'], [9, 7, 'x'], [10, 7, 'x'], [11, 7, 'x'], [8, 8, '~'], [9, 8, '~'], [10, 8, '~'], [11, 8, '~'], [13, 4, 'x']],
    },
    proj: [0, 2, 19, 8],
  };

  MAPS.mountain_road = {
    ground: ':',
    rows: [
      'TTTTT::::TTTTT',
      'TTTTT::::TTTTT',
      'TTTT::::::TTTT',
      'TTT:::::L::TTT',
      'TTT::::::::TTT',
      'TTTT::::::::tT',
      'TTTT::::::::tT',
      'TTG::::::::TTT',
      'TT,,:::::::TTT',
      'TT,n,::::,,TTT',
      'TTT,,:::::,TTT',
      'TTT,,::::n,TTT',
      'TTTT,::::,TTTT',
      'TTTT,::::,TTTT',
      'TTTTT::::TTTTT',
      'TTTTT::::TTTTT',
    ],
    warps: [[5, 15, 'town'], [6, 15, 'town'], [7, 15, 'town'], [8, 15, 'town'], [5, 0, 'station'], [6, 0, 'station'], [7, 0, 'station'], [8, 0, 'station']],
    spawn: [6, 14, 'u'],
    anchors: { jizo: [2, 7], branch: [12, 5], branch2: [12, 6], mirror: [8, 3], tools: [3, 8], busstop: [10, 9] },
    patch: { B: [[3, 8, 'C'], [10, 9, 'u']], C: [[6, 6, 'x'], [9, 11, 'x'], [4, 3, 'x']] },
    proj: [2, 2, 12, 13],
  };

  MAPS.tunnel = {
    ground: 'U',
    rows: [
      'XXXXXVVXXXXX',
      'XXXXUUUUXXXX',
      'XXXUUUUUUXXX',
      'XXXUUUUUUXXX',
      'XXUUUUUUUUXX',
      'XXUUUnUUUUXX',
      'XXUUUUUUUUXX',
      'XXUUUUUUUUXX',
      'XXUUUUUUnUXX',
      'XXUUUUUUUCXX',
      'XCUUUUUUUUXX',
      'XXUUUUUUUUaX',
      'XXUUUUUUUUXX',
      'XXffUUUUffXX',
      ',,,,::::,,,,',
      'TTTT::::TTTT',
    ],
    warps: [[4, 15, 'town'], [5, 15, 'town'], [6, 15, 'town'], [7, 15, 'town']],
    spawn: [5, 14, 'u'],
    anchors: { deep: [5, 0], crack: [6, 0], shiro: [5, 4], wall: [1, 6], cache: [9, 9], shelf: [1, 10], plate: [10, 11] },
    patch: {
      B: [[5, 2, 'z'], [6, 2, 'z'], [5, 3, 'z'], [6, 3, 'z'], [5, 4, 'z'], [6, 4, 'z'], [5, 5, 'z'], [6, 5, 'z'], [5, 6, 'z'], [6, 6, 'z'], [5, 7, 'z'], [6, 7, 'z'],
        [5, 8, 'z'], [6, 8, 'z'], [5, 9, 'z'], [6, 9, 'z'], [5, 10, 'z'], [6, 10, 'z'], [5, 11, 'z'], [6, 11, 'z'], [5, 12, 'z'], [6, 12, 'z'], [5, 13, 'z'], [6, 13, 'z'], [3, 5, 'L'], [8, 10, 'L']],
      C: [[1, 6, 'x'], [7, 3, 'x'], [3, 12, 'x']],
    },
    proj: [2, 0, 9, 13],
  };

  MAPS.station = {
    ground: '-',
    rows: [
      'RRRRRRRRRRRRRRRRRRRR',
      'RRRRRRRRRRRRRRRRRRRR',
      'OOOOOOOOOOOOOOOOOOOO',
      'hh--------s---------',
      'hh---b---------b----',
      'WH--n-------l----n--',
      '--------------------',
      'WWWIWWWWW---WWWIWWWW',
      'hhhhhhhhh---hhhhhhhh',
      'hhhhhhhhh---hhhhhhhh',
      'WWWWWWWWW---WWWWWWWW',
      ',,,,,,,,,---,,,,,,,,',
    ],
    warps: [[9, 11, 'town'], [10, 11, 'town'], [11, 11, 'town'], [19, 3, 'mountain_road'], [19, 4, 'mountain_road'], [19, 5, 'mountain_road'], [19, 6, 'mountain_road']],
    spawn: [10, 10, 'u'],
    anchors: { edge: [9, 2], sign: [10, 3], waiting: [1, 5], train: [8, 1], staff: [6, 5], passengers: [11, 4], bench: [5, 4], ad: [15, 7], board: [3, 7], gate: [9, 8], clock: [12, 5] },
    patch: {
      A: [[9, 2, 'x'], [10, 2, 'x'], [14, 2, 'x']],
      B: [[4, 1, '['], [5, 1, '['], [6, 1, '['], [7, 1, '['], [8, 1, '['], [9, 1, '['], [10, 1, '['], [11, 1, '['], [12, 1, '['], [13, 1, '['], [14, 1, '['], [15, 1, '[']],
      C: [[9, 2, 'x'], [10, 2, 'x'], [8, 2, 'x'], [3, 6, 'x'], [16, 3, 'x']],
    },
    proj: [0, 1, 19, 7],
  };

  MAPS.old_lab = {
    ground: '.', indoor: true,
    rows: [
      '##############',
      '#k#jjjj#kk#ee#',
      '#............#',
      '#.mm.....gg..#',
      '#........gg..#',
      '#............#',
      '#..n....dd...#',
      '#..........n.#',
      '#............#',
      '######DD######',
    ],
    warps: [[6, 9, 'town'], [7, 9, 'town']],
    spawn: [6, 8, 'u'],
    anchors: { board: [4, 1], corner: [6, 1], shelf: [9, 1], pc: [2, 3], desk: [8, 6], tank: [9, 3], panel: [11, 1] },
    patch: { C: [[5, 5, 'x'], [12, 2, 'x'], [1, 8, 'x']] },
    proj: [1, 1, 12, 8],
  };

  MAPS.empty_town = {
    ground: '-',
    rows: [
      ',,,,,,,,,,,,,EE,,,',
      'hhhhhhhhhh,,,EE,,,',
      'WSSWWSSWWW,,,,,,,,',
      '-l--------ffffffff',
      '==================',
      '==================',
      '-------u----------',
      '--n--------n------',
      'hhhhhhh---hhhhhhhh',
      'WWSWWWW---WWWSWWWW',
      ',,,,,,,---,,,,,,,,',
    ],
    warps: [[0, 4, 'town'], [0, 5, 'town'], [17, 4, 'town'], [17, 5, 'town'], [7, 10, 'town'], [8, 10, 'town'], [9, 10, 'town']],
    spawn: [1, 5, 'r'],
    anchors: { clock: [1, 3], tower: [13, 3], busstop: [7, 6], shop: [2, 2] },
    patch: { C: [[12, 6, 'x'], [4, 7, 'x'], [15, 4, 'x']] },
    proj: [0, 1, 17, 7],
  };

  MAPS.bureau = {
    ground: '.', indoor: true,
    rows: [
      '##############',
      '#a###MMM###kk#',
      '#...........k#',
      '#..mmm.......#',
      '#..ddd....n..#',
      '#............#',
      '#..n.....FF..#',
      '#............#',
      '#............#',
      '######DD######',
    ],
    warps: [[6, 9, 'town'], [7, 9, 'town']],
    spawn: [6, 8, 'u'],
    anchors: { plate: [1, 1], cctv: [6, 1], panel: [7, 1], locker: [12, 2], term: [4, 3], term2: [3, 3] },
    patch: { C: [[12, 7, 'x']] },
    proj: [1, 1, 12, 8],
  };

  MAPS.collapse = {
    ground: ',', mixed: true, noExit: true,
    rows: [
      'VVVVVVVVVVVVVVVVVV',
      'VVVVVVV,EEE,VVVVVV',
      'Vs--VVV,,,,,VVVVVV',
      'V----VVV,,VVVVKKVV',
      'V--,,,,,L,,,,,KKVV',
      'VVV,,y,,,,,y,,,,VV',
      'VVV,,,,,,,,,,,,,VV',
      'VVVV,,,,,J,,,,VVVV',
      'V~~~,,,,,,,,,,,yVV',
      'V~~~~,,n,,,,n,,,VV',
      'V~~~~,,,,,,,,,,,VV',
      'VVV,,,,,,::,,,,,VV',
      'VVVVVVVVV::VVVVVVV',
      'VVVVVVVVV::VVVVVVV',
    ],
    warps: [],
    spawn: [9, 12, 'u'],
    anchors: { station: [1, 2], sea: [4, 9], sky: [9, 1], factory: [14, 4], camera: [8, 4], door: [9, 7] },
    proj: [1, 1, 16, 11],
  };

  /* ───────── 調べ物の置き場所（場所ごと・調べ物 id → アンカー） ───────── */
  M.SPOTS = {
    center_office: {
      clock: 'clock', clock_b: 'clock', clock_c: 'clock', window: 'window', p_overview: 'entrance', p_staffphotos: 'photos', p_plate: 'plate',
      p_desk_mido: 'mido@mido', p_yuu: 'yuu@yuu', c1_map: 'mapstand', c1_mido: 'mido@mido', c2_retake: 'entrance', c2_staffphotos: 'photos',
      c2_mido: 'mido@mido', c3_nagi: 'nagi@nagi', c3_saeki: 'saeki@saeki', c4_nagi: 'nagi@nagi', c4_mido: 'mido@mido', d12_nagi: 'nagi@nagi',
      sd_paper: 'paper@paper', c6_selfdesk: 'selfdesk', w6_office_c: 'board',
    },
    center_server: {
      racks: 'rack', racks_c: 'rack', p_powerlog: 'logterm', c2_hashcheck: 'logterm', d7_term: 'logterm', d7_rack: 'sync', d9_copy: 'logterm',
      d11_archive: 'archive', d12_conn: 'logterm',
    },
    center_lab: {
      monitor: 'monitor', c2_drawer: 'drawer', c3_oldterm: 'oldterm', c5_monitor: 'monitor', c5_mido: 'mido@mido', d7_monitor: 'console',
      d7_antenna: 'antenna', d8_return: 'apparatus', d11_frames: 'console', d12_shiro: 'shiro@shiro',
    },
    center_basement: {
      c6_doorA: 'door', c6_keypadA: 'keypad', c6_panelA: 'panel', c6_wallA: 'wall', c6_mainA: 'main', c6_backA: 'backwall',
      c6_doorB: 'door', c6_panelB: 'panel', c6_diagramB: 'main', c6_hole: 'wall', c6_doorC: 'door', c6_backC: 'wall', c6_rubbleC: 'rubble', c6_roomC: 'main',
    },
    shotengai: {
      arcade: 'sign', arcade_b: 'sign', arcade_c: 'sign', c6_shoA: 'sign', c6_shoB: 'sign', c6_shoC: 'sign',
      notice: 'meat', cat: 'cat@cat', p_sakaguchi: 'sakaguchi@shopkeeper', p_takano: 'takano@youth', p_kissa: 'kashiwagi@oldwoman',
      c1_matsui: 'matsui@oldwoman2', c4_dagashi: 'matsui@oldwoman2', c4_kashiwagi: 'kashiwagi@oldwoman', c4_matsui: 'matsui@oldwoman2',
      d10_sakaguchi: 'clockman@shopkeeper', d10_rumor: 'kashiwagi2@oldwoman', diner_b: 'meat', w6_poster_b: 'pillar', w6_phone_b: 'phone@phone',
      w6_kashihon_b: 'kashihon@oldman', d10_shop_b: 'shop1', c6_mic: 'book', d8_conv: 'conv', d8_term444: 'vend',
    },
    residential: {
      wires: 'pole', p_hayase: 'hayase@woman', p_miura: 'miura@woman2', p_lot: 'lot', c3_lot: 'lot', d10_hayase: 'hayase@woman', d10_miura: 'miura@woman2',
      sd_vending: 'vend', sd_dog: 'dog@dog', sd_house: 'house5', c6_book: 'window', w6_tower_b: 'tower', w6_tsukimi_b: 'vend', w6_dog_b: 'dog@dog2',
      d12_nagihome: 'nagihouse', w6_house_c: 'nagihouse', d8_alley: 'alley@mark', d8_lot: 'pole',
    },
    school: {
      c2_terada: 'terada@janitor', c2_gate: 'door', c3_classphotos: 'door2', c3_terada: 'terada@janitor', d10_terada: 'terada2@janitor',
      sd_twins: 'twins@child', w6_statue_b: 'statue', w6_banner_b: 'banner', c6_drawing: 'drawing@paper', w6_clock_c: 'clock', d8_board: 'board', d8_infirm: 'infirm',
    },
    shrine: {
      c1_shiramine: 'priest@priest', c1_ema: 'ema', c1_shrine_scan: 'hall', c5_under: 'under', c5_shiramine: 'priest2@priest', d9_shiramine: 'priest3@priest',
      sd_emaA: 'ema2', w6_plaque_b: 'torii', w6_fox_b: 'fox', sd_emaB: 'ema2', d8_ema: 'ema',
    },
    riverbank: {
      c4_bridge: 'gap', c4_gen: 'fisher@fisher', c5_mud: 'mud@mark', w6_bridge_b: 'bridge', w6_angler_b: 'angler@fisher2', w6_sign_b: 'sign', w6_bridge_c: 'bridge',
    },
    mountain_road: {
      c1_jizo: 'jizo', c1_branch: 'branch', c1_post: 'mirror', c2_branch: 'branch2', c6_tools: 'tools', w6_busstop_b: 'busstop',
    },
    tunnel: {
      c4_echo: 'deep', c4_shelf: 'shelf', c5_refollow: 'deep', w6_plate_b: 'plate', c5_shiro_c: 'shiro@shiro', c5_wall: 'wall', c5_cache: 'cache', c5_air: 'crack',
    },
    station: {
      c1_platform: 'edge', c1_sign: 'sign', c1_waiting: 'waiting', c1_rewait: 'waiting', c4_rewait: 'waiting', c1_train: 'train', c1_staff: 'staff@staff',
      c1_passengers: 'passengers@passenger', c1_bench: 'bench', c1_adboard: 'ad', c4_board: 'board', c4_kiosk: 'waiting', d9_gate: 'gate@staff2', d8_platform: 'edge',
    },
    old_lab: { d9_plate: 'board', d9_desk: 'desk', d13_frame: 'desk', d12_notes: 'shelf', d13_term: 'pc', d13_black: 'corner' },
    empty_town: { d8_clocks: 'clock', d8_sign: 'tower', d8_radio: 'busstop' },
    bureau: { d8_plate: 'plate', d8_locker: 'locker', d8_cctv: 'cctv', d8_archive: 'term', d12_reg: 'panel' },
    collapse: { d14_station: 'station', d14_sea: 'sea', d14_sky: 'sky', d14_factory: 'factory', d14_cam: 'camera', d14_door: 'door' },
  };

  // 調べ物ではない、町の人（話しかけると一言。世界ごと）
  M.AMBIENT = {
    station: { B: [[14, 5, 'passenger', '乗客|急行、今夜は少し遅れてるみたいですよ。'], [3, 4, 'child', '子供|れっしゃ、ぴかぴか！'], [16, 6, 'oldwoman', '年配の女性|月代線は、昔からこの時間がいちばん静かでねえ。']] },
    shotengai: { A: [[15, 5, 'woman2', '買い物客|この商店街も、シャッターが増えたわねえ。']], B: [[6, 4, 'passenger', '通行人|月代劇場、今夜は「月の汽車」だってさ。'], [17, 3, 'child', '子供|ライスカレー、食べたいなあ。']] },
    residential: { B: [[6, 5, 'woman2', '買い物帰りの女性|火の見やぐらの鐘、今夜はまだ鳴らないわね。']] },
    old_lab: { B: [[4, 5, 'researcher', '白衣の研究員|周期は三十。……失礼、どちらの所属で？'], [11, 6, 'researcher', '白衣の研究員|観測槽には触らないでください。']] },
    town: { A: [[24, 18, 'woman2', '町の人|夜の散歩ですか？　このへん、街灯が少なくて。']], B: [[26, 17, 'passenger', '通行人|月代駅前まで、まっすぐですよ。'], [16, 18, 'child', '子供|せんろのむこう、いっちゃだめなんだって。']] },
  };

  // 場面の絵を大写しで見せる調べ物（調べる・撮影の間、絵の opts に足す）
  M.CUT_OPTS = { c1_adboard: { adCloseup: true } };

  /* ───────── 町（フィールド） ───────── */
  // 町の入口：場所 id → [x,y]（入口のマス）。'@center' は探索で使える分室の部屋（分室→サーバー室→観測装置室→地下の順）。
  M.FIELD_W = 44; M.FIELD_H = 36;
  M.ENTRANCES = {
    '@center': [8, 22], station: [19, 6], station2: [20, 6], mountain_road: [8, 9], school: [27, 12], shrine: [36, 10], tunnel: [38, 17],
    shotengai: [26, 21], residential: [14, 29], riverbank: [29, 31], old_lab: [37, 26], bureau: [12, 21], empty_town: [23, 25], collapse: [17, 13],
  };
  M.ENTRANCE_ALIAS = { station2: 'station' };
  M.RIFTS = { bureau: 1, empty_town: 1, collapse: 1 };
  M.FIELD_LABELS = { '@center': '観測センター 月代分室', station: '月代駅', mountain_road: '山道', school: '月代小学校', shrine: '月代神社', tunnel: '廃トンネル',
    shotengai: '月代商店街', residential: '住宅街', riverbank: '河川敷', old_lab: '旧研究施設' };

  function grid(w, h, ch) { const g = []; for (let y = 0; y < h; y++) { g.push(new Array(w).fill(ch)); } return g; }
  function stamp(g, x, y, rows) { rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = r[i]; if (c !== ' ' && g[y + j] && g[y + j][x + i] != null) g[y + j][x + i] = c; } }); }
  function rect(g, x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y] && g[y][x] != null) g[y][x] = ch; }
  function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s | 0) * 2147483647) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0; }
  M.hash2 = hash2;

  function buildField(world) {
    const W = M.FIELD_W, H = M.FIELD_H, g = grid(W, H, ',');
    // 外周の森
    rect(g, 0, 0, W - 1, 1, 'T'); rect(g, 0, H - 2, W - 1, H - 1, 'T'); rect(g, 0, 0, 1, H - 1, 'T'); rect(g, W - 2, 0, W - 1, H - 1, 'T');
    // 線路（駅の裏。B は月代線が生きている）
    rect(g, 2, 2, W - 3, 3, 'R');
    // 北西の山（山道）と北東の神社の森
    rect(g, 2, 4, 12, 15, 'T');
    rect(g, 31, 4, 41, 10, 'T');
    // 東の岩山（廃トンネル）
    rect(g, 38, 12, 41, 22, 'X');
    // 川（南）
    rect(g, 2, 31, 41, 33, '~');
    // 道（車道 2 本幅）
    rect(g, 2, 17, 37, 18, '=');       // 東西の大通り
    rect(g, 20, 7, 21, 30, '=');       // 南北の通り
    rect(g, 19, 7, 20, 8, '=');        // 駅前
    rect(g, 8, 10, 8, 16, ':');        // 山道への小道
    rect(g, 27, 13, 27, 16, '-');      // 学校への道
    rect(g, 36, 11, 36, 16, ':');      // 神社の参道
    rect(g, 13, 19, 13, 23, '-'); rect(g, 8, 23, 13, 23, '-');   // 分室への道
    rect(g, 22, 22, 26, 22, '-');      // 商店街への道
    rect(g, 14, 30, 19, 30, '-');      // 住宅街への道
    rect(g, 22, 30, 37, 30, '-');      // 川沿いの道
    rect(g, 37, 28, 37, 29, '-');      // 旧研究施設への道
    rect(g, 22, 24, 25, 26, '-');      // 広場
    // 建物・目印
    stamp(g, 16, 4, ['hhhhhhhh', 'hhhhhhhh', 'WWWDDWWW']);                       // 月代駅
    stamp(g, 7, 8, ['TTT', 'T:T']);                                              // 山道の入口
    g[9][8] = ':';
    stamp(g, 23, 10, ['hhhhhhhhh', 'hhhhhhhhh', 'WwWwDwWwW']);                  // 小学校
    stamp(g, 34, 9, ['TT TT', 'TqoqT']); g[10][35] = 'q'; g[10][37] = 'q';      // 神社の石段
    g[11][35] = 'Y'; g[11][37] = 'Y';
    g[17][38] = 'U';                                                             // トンネルの口
    stamp(g, 5, 20, ['hhhhhhh', 'hhhhhhh', 'WwWDWwW']);                         // 観測センター
    g[24][9] = 's';
    stamp(g, 24, 20, ['hhhhh', 'iiDii']);                                        // 商店街のアーケード
    stamp(g, 23, 19, ['h', 'S']); stamp(g, 29, 19, ['h', 'S']);
    stamp(g, 11, 27, ['hhh,hhh', 'WHW,WHW', 'ff,D,ff']);                        // 住宅街
    g[29][13] = 'f'; g[29][15] = 'f';
    g[31][29] = 'o'; g[29][30] = 's';                                            // 河川敷へ下りる石段
    stamp(g, 35, 25, ['hhhhh', 'WwDwW']); g[26][37] = 'D';                      // 旧研究施設
    g[27][35] = 'f'; g[27][36] = 'f'; g[27][38] = 'f'; g[27][39] = 'f';
    g[21][12] = 'Z'; g[25][23] = 'Z'; g[13][17] = 'Z';                          // 境界の裂け目
    g[24][22] = 'l';                                                             // 広場の時計
    // 道ばたの物
    [[3, 16, 'P'], [15, 16, 'L'], [24, 16, 'P'], [32, 16, 'L'], [19, 19, 'v'], [22, 28, 'b'], [30, 29, 'L'], [17, 8, 's'], [10, 19, 'P']].forEach(([x, y, c]) => { if (g[y][x] === ',') g[y][x] = c; });
    // 境界ノイズ（草むら代わり。道から少し外れた所）
    [[5, 19], [6, 19], [16, 25], [17, 25], [16, 26], [30, 13], [31, 13], [30, 14], [33, 22], [34, 22], [33, 23], [4, 27], [5, 27], [27, 27], [28, 27]].forEach(([x, y]) => { if (g[y][x] === ',') g[y][x] = 'n'; });
    // 町の家（2×2。草地で、まわり 1 マスに道・入口が無いところだけ）
    const ROADISH = new Set(['=', '-', ':', 'D', 'o', 'U', 'Z', 'n', 'l', 's', 'v', 'b']);
    [[27, 5], [14, 11], [16, 13], [23, 14], [3, 20], [3, 24], [6, 26], [16, 21], [27, 24], [30, 26], [39, 24], [33, 19], [36, 19], [31, 23]].forEach(([x, y]) => {
      for (let j = -1; j <= 2; j++) for (let i = -1; i <= 2; i++) { const c = g[y + j] && g[y + j][x + i]; if (c == null) return; if (i >= 0 && i <= 1 && j >= 0 && j <= 1 && c !== ',') return; if (ROADISH.has(c)) return; }
      g[y][x] = 'h'; g[y][x + 1] = 'h'; g[y + 1][x] = 'W'; g[y + 1][x + 1] = 'H';
    });
    // 飾りの木と家（道・入口・建物から 2 マス離れた草地だけ）
    const busy = (x, y) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const c = g[y + j] && g[y + j][x + i]; if (c && c !== ',' && c !== 'T' && c !== 'X' && c !== '~' && c !== 'R') return true; } return false; };
    const deco = [];
    for (let y = 4; y < H - 4; y++) for (let x = 3; x < W - 3; x++) {
      if (g[y][x] !== ',' || busy(x, y)) continue;
      const r = hash2(x, y, 7) % 100;
      if (r < 20) deco.push([x, y, "T"]); else if (r < 24) deco.push([x, y, 't']);
    }
    deco.forEach(([x, y, c]) => { g[y][x] = c; });
    // 世界ごと
    if (world === 'C') {
      [[10, 18, 'x'], [28, 17, 'x'], [21, 12, 'x'], [33, 30, 'x'], [16, 30, 'x'], [24, 23, 'x']].forEach(([x, y, c]) => { g[y][x] = c; });
    }
    if (world === 'B') {
      [[25, 9, 'L'], [12, 16, 'L'], [30, 21, 'L']].forEach(([x, y, c]) => { if (g[y][x] === ',') g[y][x] = c; });   // ガス灯
    }
    return g;
  }

  /* ───────── 地図を組み立てる ───────── */
  const CACHE = {};
  // 場所の地図（無い場所は小さな部屋を作る）
  M.has = id => !!MAPS[id];
  M.compile = function (id, world) {
    world = String(world || 'A').toUpperCase();
    const key = id + '/' + world;
    if (CACHE[key]) return CACHE[key];
    let out;
    if (id === 'town') {
      const g = buildField(world);
      const warps = [];
      Object.keys(M.ENTRANCES).forEach(k => { const [x, y] = M.ENTRANCES[k]; warps.push({ x, y, to: M.ENTRANCE_ALIAS[k] || k, rift: !!M.RIFTS[k] }); });
      out = { id: 'town', world, w: M.FIELD_W, h: M.FIELD_H, g, ground: ',', warps, spawn: [13, 24, 'd'], anchors: {}, def: { ground: ',' }, field: true };
    } else {
      const def = MAPS[id] || fallbackDef(id);
      const g = def.rows.map(r => r.split(''));
      ((def.patch && def.patch[world]) || []).forEach(([x, y, c]) => { if (g[y] && g[y][x] != null) g[y][x] = c; });
      const warps = (def.warps || []).map(([x, y, to]) => ({ x, y, to }));
      out = { id, world, w: g[0].length, h: g.length, g, ground: def.ground || '.', warps, spawn: def.spawn || [1, 1, 'd'], anchors: def.anchors || {}, def, generic: !MAPS[id] };
    }
    CACHE[key] = out;
    return out;
  };
  M.clearCache = () => { Object.keys(CACHE).forEach(k => delete CACHE[k]); };
  function fallbackDef(id) {
    return {
      ground: '.', indoor: true, generic: true,
      rows: ['############', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '#..........#', '#####DD#####'],
      warps: [[5, 7, 'town'], [6, 7, 'town']], spawn: [5, 6, 'u'], anchors: {}, proj: [1, 1, 10, 6],
    };
  }
  M.at = (m, x, y) => (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 'V' : m.g[y][x];
  M.solidAt = (m, x, y) => !WALK.has(M.at(m, x, y));
  M.warpAt = (m, x, y) => m.warps.find(w => w.x === x && w.y === y) || null;

  // 出入口の前のマス：行き先のワープの隣で、歩けてワープでないマス
  M.entryFor = function (m, w) {
    let order = [['d', 0, 1], ['u', 0, -1], ['r', 1, 0], ['l', -1, 0]];
    // 地図の端の出入口は内側を先に
    const first = w.x === 0 ? 'r' : w.x === m.w - 1 ? 'l' : w.y === 0 ? 'd' : w.y === m.h - 1 ? 'u' : null;
    if (first) order = order.filter(o => o[0] === first).concat(order.filter(o => o[0] !== first));
    for (const [d, dx, dy] of order) {
      const x = w.x + dx, y = w.y + dy;
      if (!M.solidAt(m, x, y) && !M.warpAt(m, x, y)) return [x, y, d];
    }
    return null;
  };
  // fromId から来たときに出るマス
  M.arrival = function (m, fromId) {
    const w = m.warps.find(v => v.to === fromId) || (fromId === 'town' ? null : null);
    if (w) { const e = M.entryFor(m, w); if (e) return e; }
    return m.spawn.slice();
  };

  // 調べ物の表を読む
  M.parseSpot = function (val) {
    if (Array.isArray(val)) return { at: [val[0], val[1]], sprite: val[2] || null, dir: val[3] || 'd' };
    const s = String(val || '');
    const [a, rest] = s.split('@');
    let sprite = null, dir = 'd';
    if (rest) { const [sp, d] = rest.split(':'); sprite = sp || null; if (d) dir = d; }
    return { anchor: a, sprite, dir };
  };
  M.spotEntry = function (areaId, spotId) {
    const T = M.SPOTS[areaId];
    return T && Object.prototype.hasOwnProperty.call(T, spotId) ? T[spotId] : undefined;
  };
  // 歩ける範囲（blocked：追加で通れないマスの集合 'x,y'）
  M.bfs = function (m, sx, sy, blocked) {
    const seen = new Set(), q = [[sx, sy]];
    const k = (x, y) => x + ',' + y;
    if (M.solidAt(m, sx, sy)) return seen;
    seen.add(k(sx, sy));
    while (q.length) {
      const [x, y] = q.shift();
      for (const d of ['u', 'd', 'l', 'r']) {
        const [dx, dy] = M.DIRS[d]; const nx = x + dx, ny = y + dy, kk = k(nx, ny);
        if (seen.has(kk) || M.solidAt(m, nx, ny) || (blocked && blocked.has(kk))) continue;
        // ワープのマスには入れるが、その先へは進まない（入った時点で移動する）
        seen.add(kk);
        if (!M.warpAt(m, nx, ny)) q.push([nx, ny]);
      }
    }
    return seen;
  };
  // 経路（向きの配列）。goal(x,y) が true のマスまで
  M.path = function (m, sx, sy, goal, blocked, maxN) {
    const k = (x, y) => x + ',' + y;
    const prev = new Map(); prev.set(k(sx, sy), null);
    const q = [[sx, sy]]; let n = 0;
    while (q.length && n++ < (maxN || 5000)) {
      const [x, y] = q.shift();
      if (goal(x, y) && !(x === sx && y === sy && !goal.allowStart)) {
        const out = []; let cur = k(x, y);
        while (prev.get(cur)) { const p = prev.get(cur); out.unshift(p.d); cur = p.from; }
        return out;
      }
      if (goal.allowStart && x === sx && y === sy && goal(x, y)) return [];
      for (const d of ['u', 'd', 'l', 'r']) {
        const [dx, dy] = M.DIRS[d]; const nx = x + dx, ny = y + dy, kk = k(nx, ny);
        if (prev.has(kk) || M.solidAt(m, nx, ny) || (blocked && blocked.has(kk))) continue;
        const wp = M.warpAt(m, nx, ny);
        if (wp && !goal(nx, ny)) continue;   // 目的地でないワープは踏まない
        prev.set(kk, { from: k(x, y), d });
        q.push([nx, ny]);
      }
    }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
