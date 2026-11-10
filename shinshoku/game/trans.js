// 場面の継ぎ目（遷移）をゲームにつなぐ：前の画を写して重ねる（ui/transition.js）・覆っている間は演出の時計と遊びを止める・
// 音を沈める・章の札を黒の上に出す。Game（main.js）のメソッドとして組み込む。
// 試験の起動（?autostart=1・?test=1）では遷移しない（通しプレイの時間を変えない）。?trans=1 で試験の起動でも遷移する。
import { transPlan } from '../ui/transition.js';
import { CHAPTERS } from '../story/chapters.js';

const QS = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export const transMethods = {
  transOn() { return !!this.trans && (QS.get('trans') === '1' || (!this.isTest() && QS.get('trans') !== '0')); },
  /** 今の画を（最後に描いた姿勢のまま）同じ処理の中で描き直し、そのキャンバスを返す（preserveDrawingBuffer なしでも読める） */
  snapFrame() { try { this.drawScene(); return this.renderer.domElement; } catch (e) { console.warn('snap', e); return null; } },
  /**
   * 遷移を始める。kind：'cut'|'dissolve'|'seep'|'black'|'white'|'area'、opt：{ dur, hold, out, in }、why：記録用（intro|outro|cut|area|card）、label：{ title, tip }
   * 覆っている最中（黒・前の画）に頼まれた時は始め直さない（今の幕が継ぎ目を隠す）。覆う間を延ばすだけ。戻り値：遷移を使ったか
   */
  startTrans(kind, opt = {}, why = '', label = null) {
    if (!this.transOn() || !kind || kind === 'cut') return false;
    const T = this.trans;
    if (T.active && T.covering()) {
      if (opt.hold) T.extendHold(opt.hold);
      if (label && T.plan.kind === 'area') T.label = label;
      this.transLog(kind, why, 'merged'); return true;
    }
    const plan = transPlan(kind, opt);
    T.start(plan, this.snapFrame(), label);
    if (plan.out + plan.hold > 0) this.sfx.dip(plan.out, plan.hold, plan.in, kind === 'area' ? 0.12 : 0.3);
    this.transLog(kind, why, 'start');
    return true;
  },
  transLog(kind, why, how) { const m = this.metrics.trans || (this.metrics.trans = []); m.push({ kind, why, how, step: this.story.step }); if (m.length > 60) m.shift(); },
  /** 覆っている間（演出の時計・遊びを止める） */
  transCovering() { return !!this.trans && this.trans.active && this.trans.covering(); },
  /**
   * 章の札。遷移が使える時は黒の上に出す（黒へ落ちる → 札 → 明ける）。区画の移動の暗転の最中なら、その黒を延ばして札を出す。
   * 同じ札を続けて出さない（区画の移動で先に出した札を、演出の始まりの出来事でもう一度出さない）
   */
  chapterCard(title, dur = 3.2) {
    const now = performance.now();
    if (this.lastCard && this.lastCard.title === title && now - this.lastCard.at < 20000) return;
    this.lastCard = { title, at: now };
    if (this.transOn()) {
      const T = this.trans;
      if (T.active && T.covering()) T.extendHold(dur - 0.4);
      else this.startTrans('black', { out: 0.7, hold: dur - 0.5, in: 1.1 }, 'card');
    }
    this.ui.chapterCard(title, dur); this.sfx.play('notify');
  },
  /** 演出の始まりにある章の札（t ≤ 0.5）は、演出の前に出す（区画の移動の黒の上・遊び→演出の暗転の上）。出来事の方は同じ札なので出さない */
  earlyChapterCard(cs) {
    const e = (cs.events || []).find(x => x.do === 'chapterCard' && x.t <= 0.5);
    if (e && CHAPTERS[e.arg]) this.chapterCard(CHAPTERS[e.arg].title);
  },
};
