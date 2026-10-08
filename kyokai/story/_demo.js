/* kyokai/story/_demo.js — エンジン動作確認用の章（担当A専用）。kyokai.html?demo=1 のときだけ読まれる。本編の章ではない。 */
(function () {
  'use strict';
  const KY = window.KY;
  Object.assign(KY.EVIDENCE, {
    demo_photo: { title: 'デモ：壁時計の写真', type: 'photo', world: 'A', art: 'center_office', ch: 0, desc: '分室の壁時計。文字盤の下に小さくメーカー名。' },
    demo_tes: { title: 'デモ：ユウの証言', type: 'testimony', world: 'A', art: null, ch: 0, desc: '「時計の音が一回だけ、二重に聞こえた」' },
    demo_audio: { title: 'デモ：汽笛の録音', type: 'audio', world: 'A', art: 'station_ruin', ch: 0, sound: 'whistle', desc: '廃駅で録れた、遠い汽笛。' },
    demo_log: { title: 'デモ：電力ログ', type: 'log', world: 'A', art: null, ch: 0, desc: '電力は正常。' },
    demo_b: { title: 'デモ：別の層の時計', type: 'photo', world: 'B', art: 'center_office', ch: 0, desc: '文字盤のメーカー名が違う。' },
  });
  KY.AREAS.demo_office = {
    name: '観測センター 分室（デモ）', map: { x: 0.22, y: 0.42 }, danger: { A: 0, B: 2 },
    worlds: {
      A: { scene: 'center_office', spots: [
        { id: 'clock', x: 0.45, y: 0.08, w: 0.1, h: 0.16, label: '壁時計', acts: ['look', 'photo', 'scan'], ev: { photo: 'demo_photo' },
          on: { look: async K => K.say(['n:丸い壁時計。秒針の音が部屋を測っている。']) } },
        { id: 'yuu', x: 0.2, y: 0.42, w: 0.14, h: 0.4, label: '如月ユウ', acts: ['talk', 'record'],
          on: { talk: async K => { await K.say(['y:……何だ、{name}。', 'y:時計の音が一回だけ、二重に聞こえた。気のせいだろうがな。']); K.gain('demo_tes'); } } },
      ] },
      B: { scene: 'center_office', spots: [
        { id: 'clock_b', x: 0.45, y: 0.08, w: 0.1, h: 0.16, label: '壁時計', acts: ['look', 'photo'],
          on: { look: async K => { await K.say(['n:同じ形の時計。文字盤の下の名前だけが違う。']); K.gain('demo_b'); K.note('diff', 'demo_clock', { title: '時計のメーカー', text: '観測層Aでは常盤時計、観測層Bでは月代時計。' }); } } },
      ] },
    },
  };
  KY.AREAS.demo_station = {
    name: '月代駅（デモ）', map: { x: 0.36, y: 0.16 }, danger: { A: 2, B: 3, C: 5 },
    worlds: {
      A: { scene: 'station_ruin', spots: [
        { id: 'sign', x: 0.4, y: 0.3, w: 0.2, h: 0.2, label: '駅名標', acts: ['look', 'photo', 'record', 'scan'], ev: { record: 'demo_audio' },
          on: { look: async K => K.say(['n:割れた駅名標。「つきしろ」。']) } },
      ] },
      B: { scene: 'station_live', spots: [] },
      C: { scene: 'station_ruin', spots: [] },
    },
  };
  KY_STORY.register('demo', async K => {
    await K.step('d1', async () => {
      await K.title('デモ', 'エンジン動作確認');
      await K.say(['#scene center_office A', '#amb clock', 'n:地の文。月代町の夜は静かだった。', 'p:{name}です。よろしくお願いします。', 'y:如月ユウ。……以上。', 'm:室長の御堂だ。',
        '#face g happy', 'g:ナギだよ。', 'k:九条シン。', 's:……きゅ。', 'd:……ーん、今夜も……来てくれたん……',
        'c:深夜の常連|今日仕事だった？', 'c:――|後ろ誰？', 't:受信中――発信元：不明', 't:形式：ライブ配信', 't:接続時刻 02:44:44', 'x:坂口@resident_1|あんたも、私がボケたと思う？', '#se whistle', '#fx glitch', 'n:遠くで、汽笛が鳴った。']);
    });
    const v = await K.step('d2', () => K.choice('御堂「どうする？」', [{ t: '調べに行く', v: 'go', s: '好奇心' }, { t: 'もう少し待つ', v: 'wait' }, { t: '……辞令が出たので', v: 'duty', s: '正直に' }]));
    K.flag('d_choice', v);
    await K.step('d3', async () => {
      const w = await K.input('合言葉を入力してください', 'つきしろ', 6);
      K.flag('d_word', w);
      K.note('person', 'yuu', { title: '如月ユウ', text: '先輩観測員。口数が少ない。私のことは「新人」と呼ぶ。' });
      K.note('case', 'demo', { title: 'デモ事件', text: 'まだ何も分かっていない。' });
      K.note('b30', 'day04', { title: 'DAY 04', text: '睡眠不足' });
      ['phone', 'flashlight', 'magnet', 'boundary_meter', 'wave_scanner'].forEach(e => K.equip(e));
      K.item('battery', 6); K.item('light', 3); K.item('med', 1); K.item('stab', 1);
      K.sync(2);
      K.gain('demo_log');
      K.unlock('demo_office'); K.unlock('demo_station');
    });
    await K.step('d4', () => K.explore({ goal: K => K.got('demo_photo') && K.got('demo_tes') && K.got('demo_audio'), hint: '時計を撮影し、ユウに話を聞き、駅で録音する', areas: ['demo_office', 'demo_station'] }));
    await K.step('d5', () => K.deduce({ id: 'demo_q', q: 'デモ：あの夜、何が聞こえたのか？', link: 2,
      options: [
        { id: 'a', text: 'ただの機器の故障', need: ['demo_log'], refute: ['demo_audio'] },
        { id: 'b', text: '別の層から、汽笛と時計の音が漏れてきた', need: ['demo_audio', 'demo_tes'] },
        { id: 'c', text: '全員の聞き間違い', need: ['demo_tes'], refute: ['demo_photo'] },
      ], answer: 'b', hint: { a: 'その仮説だと「汽笛の録音」が説明できない。' } }));
    await K.step('d6', () => K.spot({ id: 'demo_spot', a: 'center_office', b: 'center_office', aw: 'A', bw: 'B', la: '昨日の記録', lb: '今日の分室', need: 2,
      spots: [{ x: 0.5, y: 0.16, r: 0.06, label: '時計のメーカー' }, { x: 0.3, y: 0.3, r: 0.06, label: '職員写真が一枚多い' }] }));
    await K.step('d7', () => K.chase({ intro: ['n:背後で、何かが地面を擦る音がした。'], rounds: [{ text: '足音が近い。まだ距離はある。', ok: 'run' }, { text: '行き止まり。脇に物置の陰がある。', ok: 'hide' }], time: 8 }));
    await K.step('d8', async () => {
      await K.say(['n:端末を閉じようとした、そのとき。', '#fx mainui', 'p:……何だ、今の？', '#fx noise']);
      K.stab(-45);
      await K.say(['n:ふらつく。']);
    });
    await K.ending('TRUE');
  });
})();
