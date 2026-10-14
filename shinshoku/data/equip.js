// 装備（WEAPON_SYSTEM_SPEC §6・§7 の考えを、拾える小物にした仮の版）。名前・効果は【仮】。枠は 2 つ。
// mods は COMBAT（data/combat.js）への足し算。combat/equip.js が COMBAT の写しに当てる（元は変えない）。
export const EQUIP_SLOTS = 2;
export const EQUIP = {
  holster: { name: '小型銃用ホルスター', provisional: true, desc: '刀⇄銃の持ち替え 9f→6f、切替撃ちの 1 発目 4f→3f', mods: { 'swap.katanaToGun': -3, 'swap.gunToKatana': -3, 'swap.quickShot': -1 } },
  battou: { name: '抜刀補助（鍔止めの紐）', provisional: true, desc: '居合の構えまで 36f→24f', mods: { 'issen.iai.hold': -12 } },
  mikiri: { name: '見切り補助（古い鈴）', provisional: true, desc: 'ジャスト回避の窓 +2f（どの難しさでも）', mods: { 'difficulty.easy.just': 2, 'difficulty.normal.just': 2, 'difficulty.hard.just': 2 } },
};
