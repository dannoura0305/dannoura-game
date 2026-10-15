// 武器の一覧（WEAPON_SYSTEM_SPEC §1）。刀・拳銃・鉄パイプ・火縄銃（第4章から。紫は銃床の打撃・白は妖弾）。
export const WEAPONS = {
  katana: { name: '刀', kind: 'melee', parry: true, weight: 1 },
  handgun: { name: '拳銃', kind: 'gun', parry: false, weight: 1 },
  pipe: { name: '鉄パイプ', kind: 'melee', parry: true, heavy: true, weight: 2 },
  matchlock: { name: '火縄銃', kind: 'melee', parry: false, heavy: true, weight: 3, provisional: true },
};
