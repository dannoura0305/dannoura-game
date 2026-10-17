// 『境界侵食』フェーズ11：建物の出入り口（玄関・店の戸・シャッター・自動ドア）の点検。
// どの建物の区画（家・店・ビル・集合住宅・コンビニ・町家・百貨店・駅舎・自宅）にも出入り口が 1 つ以上あり、出入り口の前が歩ける道（塞ぐ物が無い）。
// 家は門（塀の切れ目）と玄関が同じ位置・玄関は建物の表の面の上。奥の家並み（fill・fillB）は道に面した升目に戸があり、何も描かない見えない壁が無い。
// 区画の id が重ならない。町家の戸口は壁の外（以前は壁の中に埋まって見えなかった）・自宅の戸口に戸（開けた引き戸）・裏路地に裏口。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOWN, BUILDING_KINDS, lotEntrances, fillEntrances, fillCells, houseDoor, houseFoot, isWalkable, blockedAt, lotFrame } from '../shinshoku/data/town.js';

let n = 0; const t = (name, fn) => { fn(); n++; console.log('  ✓ ' + name); };
const src = p => readFileSync(new URL('../shinshoku/' + p, import.meta.url), 'utf8');
const buildings = TOWN.lots.filter(L => BUILDING_KINDS.includes(L.kind));

/** 出入り口の前（区画の縁から 0.6m 外）で、幅の中に歩けて塞がれていない所があるか */
function frontFree(e) {
  const tan = [Math.abs(e.out[1]), Math.abs(e.out[0])], span = Math.max(0, (e.w || 0.9) - 0.9), k = Math.max(1, Math.ceil(span / 0.4));
  for (let i = 0; i <= k; i++) {
    const o = span ? (i / k - 0.5) * span : 0, x = e.gate[0] + e.out[0] * 0.6 + tan[0] * o, z = e.gate[1] + e.out[1] * 0.6 + tan[1] * o;
    if (isWalkable(x, z) && !blockedAt(x, z)) return true;
  }
  return false;
}

t('区画の id が重ならない', () => {
  const ids = TOWN.lots.map(L => L.id), dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dup, []);
});
t('建物の区画（家・店・ビル・集合住宅・コンビニ・町家・百貨店・駅舎・自宅）には出入り口が 1 つ以上', () => {
  assert.ok(buildings.length >= 35, '建物の数 ' + buildings.length);
  for (const L of buildings) assert.ok(lotEntrances(L).length >= 1, L.id + '（' + L.kind + '）に出入り口が無い');
});
t('出入り口の前は歩ける道（区画の外・電柱や自販機・車・バス停で塞がれていない）', () => {
  for (const L of buildings) for (const e of lotEntrances(L)) assert.ok(frontFree(e), `${L.id} の ${e.kind}（${e.gate.map(v => v.toFixed(1))}）の前が道でない／塞がれている`);
});
t('出入り口は区画の表の縁にあり、外を向く（表の向き＝道の側）', () => {
  for (const L of buildings) for (const e of lotEntrances(L)) {
    const [x0, z0, x1, z1] = L.rect, [gx, gz] = e.gate, eps = 0.01;
    const onEdge = Math.abs(gx - x0) < eps || Math.abs(gx - x1) < eps || Math.abs(gz - z0) < eps || Math.abs(gz - z1) < eps;
    assert.ok(onEdge, L.id + ' の出入り口が区画の縁に無い');
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    assert.ok((gx - cx) * e.out[0] + (gz - cz) * e.out[1] > 0, L.id + ' の出入り口が内を向く');
  }
});
t('家：玄関は建物の表の面の上・門の切れ目と同じ位置（塀の中に玄関が隠れない）', () => {
  for (const L of buildings.filter(L => L.kind === 'house')) {
    const [e] = lotEntrances(L), f = houseFoot(L), d = houseDoor(L), F = lotFrame(L);
    const [dx, dz] = e.door, eps = 0.01;
    assert.ok(dx > f[0] - eps && dx < f[2] + eps && dz > f[1] - eps && dz < f[3] + eps, L.id + ' の玄関が建物の外');
    const onFace = F.f === 'N' ? Math.abs(dz - f[1]) < eps : F.f === 'S' ? Math.abs(dz - f[3]) < eps : F.f === 'E' ? Math.abs(dx - f[2]) < eps : Math.abs(dx - f[0]) < eps;
    assert.ok(onFace, L.id + ' の玄関が表の面に無い');
    assert.ok(d.u - d.gate / 2 > 0.3 && d.u + d.gate / 2 < F.W - 0.3, L.id + ' の門が区画の端にかかる');
    const along = F.alongX ? Math.abs(e.gate[0] - dx) : Math.abs(e.gate[1] - dz);
    assert.ok(along < 0.01, L.id + ' の門と玄関の位置がずれる');
  }
});
t('用水路に面した家（石井）は自宅の小さな橋から入る（橋の範囲は歩ける・用水路の柵が空く）', () => {
  const L = TOWN.lots.find(q => q.id === 'cw1'), [e] = lotEntrances(L);
  const g = TOWN.channel.gaps.find(([a, b]) => e.gate[1] > a + 0.4 && e.gate[1] < b - 0.4);
  assert.ok(g, '橋（柵の切れ目）が玄関の前に無い');
  assert.ok(isWalkable(6.9, e.gate[1]) && isWalkable(e.gate[0] + 0.6, e.gate[1]));
});
t('奥の家並み・ビル：見えない壁が無い（どの区画も升目がある）・道に面した升目に戸', () => {
  for (const L of TOWN.lots.filter(L => L.kind === 'fill' || L.kind === 'fillB')) {
    assert.ok(fillCells(L).length >= 1, L.id + ' は何も描かない（見えない壁）');
    for (const e of fillEntrances(L)) {
      assert.ok(isWalkable(e.gate[0] + e.out[0] * 0.8, e.gate[1] + e.out[1] * 0.8), L.id + ' の戸の前が道でない');
      assert.ok(!blockedAt(e.gate[0] + e.out[0] * 0.8, e.gate[1] + e.out[1] * 0.8), L.id + ' の戸の前が塞がれている');
    }
  }
  for (const id of ['f_e2', 'f_e3', 'w5', 'f_sw']) assert.ok(fillEntrances(TOWN.lots.find(L => L.id === id)).length >= 1, id + ' の道に面した建物に戸が無い');
});
t('町家の戸口は壁の外（格子戸・枠）・自宅の玄関は開き戸（閉じていて近づくと開く：P14）・裏路地に裏口・集合住宅の入口', () => {
  const t2 = src('world/town2.js'), t1 = src('world/town.js');
  assert.ok(/machiyaDoors\(L\)/.test(t2) && /doorFrame\(F, doorU, -0\.02/.test(t2), '町家の戸口');
  assert.ok(!/F\.box\(lit \? 'glow' : 'prop', doorU, 0\.35/.test(t2), '町家の戸が壁の中に戻っている');
  assert.ok(/玄関の戸（開き戸/.test(t1) && /homeDoorTick/.test(src('world/level.js')) && /genkan\(F, doorU, v0/.test(t1) && /インターホン/.test(t1), '自宅・家の玄関');
  assert.ok(/glassDoor\(F, eu, set/.test(t1), '集合住宅の入口');
  assert.ok((src('world/areas.js').match(/backDoor\(/g) || []).length >= 3, '裏路地の裏口');
});
t('コンビニの自動ドアの前に自販機を置かない・家の門の前にごみ置き場を置かない', () => {
  const k = TOWN.lots.find(L => L.id === 'konbini'), [e] = lotEntrances(k);
  for (const p of TOWN.props.filter(p => p.kind === 'vending')) assert.ok(Math.hypot(p.x - e.gate[0], p.z - e.gate[1]) > 1.6, '自販機が自動ドアの前');
  for (const L of buildings.filter(L => L.kind === 'house')) for (const p of TOWN.props.filter(p => p.kind === 'garbage')) assert.ok(Math.abs(p.x - lotEntrances(L)[0].gate[0]) > 1.6 || Math.abs(p.z - lotEntrances(L)[0].gate[1]) > 1.5, L.id + ' の門の前にごみ置き場');
});
console.log(`shinshoku-p11: ${n} passed`);
