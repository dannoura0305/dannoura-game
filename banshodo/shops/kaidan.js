'use strict';
// 万象堂・怪談館の出張所（だんのうらの町『怪談館』の中の占いコーナー）。
// 色は怪談館の --bg・--panel・--ink・--muted・--gold・--line に合わせた。店員の名前と台詞は仮（制作者の確認待ち）。
(function (global) {
  global.BANSHO_SHOPS = global.BANSHO_SHOPS || {};
  global.BANSHO_SHOPS.kaidan = {
    id: 'kaidan-corner', game: 'dannoura-town', brand: '万象堂', name: '怪談館出張所・占いの間',
    theme: { bg: '#0c0b0e', panel: '#141117', ink: '#e8e2d8', muted: '#9a9188', accent: '#b08a48', line: 'rgba(230,220,200,.13)', font: '"Yu Mincho","Hiragino Mincho ProN",serif' },
    menu: ['today', 'palm', 'birth', 'tarot', 'east', 'west', 'synth', 'book', 'history', 'profile'],
    npc: {
      name: '占い師（仮）', icon: '🕯', leaveLabel: '展示室へ戻る',
      lines: {
        greet: ['……灯りに気づかれましたか。\nここは万象堂の出張所。怪談の合間に、あなたの「しるし」を読ませてもらいます。'],
        greetNight: ['夜の館へようこそ。\nこの時間は、札の声がよく聞こえます。'],
        menu: '何を読みましょう。',
        profile: '生まれた日を教えてください。\n分からないところは、空けたままで構いません。',
        result: ['……出ました。', '読めたところだけ、お伝えします。'],
        tarot: '問いをひとつ、心に浮かべて。',
        synth: 'いくつもの占いを重ねて、同じ所を指す糸を探します。\nただし、糸が重なることと、それが本当であることは別の話です。',
        book: 'あなたの運命の書です。\n書いてあるのは「占い上のテーマ」だけ。行き先を決めるのは、あなたです。',
        today: '今日の星を読みます。',
        palm: '手のひらを、灯りの下へ。\n線は、あなたの目で確かめながら辿りましょう。見えない線を、無理に読むことはしません。'
      }
    }
  };
})(typeof window !== 'undefined' ? window : this);
