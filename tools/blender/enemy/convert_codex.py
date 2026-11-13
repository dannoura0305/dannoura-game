# -*- coding: utf-8 -*-
"""
境界侵食 P19：利用者が PC の Codex で作った異形の 3D モデル（glb・骨と動き入り・1 体 23 万〜54 万三角形）を、ゲームの異形の包み
（wakaba-enemypack/2：shinshoku/assets/enemies/codex/<kind>.pack.json と <kind>_low.pack.json）へ軽くして写す。

  元の置き場：ブランチ origin/models-from-pc の incoming/codex/characters/（main には入れない）。作業用に取り出してから使う：
    git archive origin/models-from-pc incoming/codex | tar -x -C <作業の場所>
    python tools/blender/enemy/convert_codex.py --src <作業の場所>/incoming/codex/characters [--only heiten] [--out shinshoku/assets/enemies/codex]
  （bpy＝Blender を python のモジュールとして。pip install bpy）

やること（形は変えない＝届いたモデルを尊重し、軽くするだけ）：
  1. glb を読み、動きを外して休みの姿勢に戻す（撮影用の床・照明・骨の飾りの網は捨てる）
  2. 色：材質の基本色（画像は 64×64 へ平均して縮めた低い周波数の色）を角ごとの頂点色へ焼く（画像は持ち出さない＝テクスチャ 0 枚）
  3. 人型：腕と脚の骨を「まっすぐ下」へ回した姿勢を休みの姿勢にする（ゲームのコードの動き＝actor/anim*.js は腕と脚が下がった休みが前提）。
     背骨・首・頭の曲がり（待人の長い首・模倣者の前かがみ）は意匠なのでそのまま
  4. 1 つの網へまとめて間引く（Blender の Decimate・左右対称）：PC と スマホ（_low）の 2 段
  5. 骨：glb の骨 → コードの異形の骨の名前（手の指は手・あごは頭・首の 4 節は首…）。重みは同じ骨へ足して上位 4 本・合計 1
     休みの位置（rest）は glb の関節の位置（縮めた後）。ゲームはコードの骨をこの位置へ動かしてから網を差し替える（enemypack.js）
  6. 大きさ：今の異形の高さ（当たりの大きさ）へ一様に縮める。目・弱点・核の位置（anchors）は材質から測って書く
  7. 包み：位置 int16・法線 int8・色 sRGB uint8・骨 uint8・重み uint8（v1 の約 1/3 の大きさ）
座標：glTF（Y 上・+Z 前・+X がキャラクターの左・m）。Blender は Z 上・-Y 前。
出どころ：モデルは Codex が Blender のスクリプトで一から作った物（外の素材なし・自作）。参照の原画は利用者が ChatGPT で作った画像。
"""
import argparse
import base64
import json
import math
import os
import re
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))

# ───────────────────────── 骨の対応（glb の骨の名前 → コードの骨の名前）
HUMAN = [
    (r'^root$', 'hips'), (r'^pelvis$', 'hips'), (r'^spine\d*$', 'spine'), (r'^chest$', 'chest'), (r'^neck\d*$', 'neck'),
    (r'^(head|jaw|halo)$', 'head'),
    (r'^upperArmL$', 'leftUpperArm'), (r'^foreArmL$', 'leftLowerArm'), (r'^(handL|finger\dL|thumbL|bag)$', 'leftHand'),
    (r'^upperArmR$', 'rightUpperArm'), (r'^foreArmR$', 'rightLowerArm'), (r'^(handR|finger\dR|thumbR)$', 'rightHand'),
    (r'^thighL$', 'leftUpperLeg'), (r'^shinL$', 'leftLowerLeg'), (r'^footL$', 'leftFoot'),
    (r'^thighR$', 'rightUpperLeg'), (r'^shinR$', 'rightLowerLeg'), (r'^footR$', 'rightFoot'),
]
# 休みの位置を取る骨（コードの骨 → glb の骨）
HUMAN_REST = {'hips': 'pelvis', 'spine': ['spine', 'spine1'], 'chest': 'chest', 'neck': ['neck', 'neck1'], 'head': 'head',
              'leftUpperArm': 'upperArmL', 'leftLowerArm': 'foreArmL', 'leftHand': 'handL', 'rightUpperArm': 'upperArmR', 'rightLowerArm': 'foreArmR', 'rightHand': 'handR',
              'leftUpperLeg': 'thighL', 'leftLowerLeg': 'shinL', 'leftFoot': 'footL', 'rightUpperLeg': 'thighR', 'rightLowerLeg': 'shinR', 'rightFoot': 'footR'}
# 継接：コードの継接の骨（tHip・tBody・tChest・tHeadA・右腕 tR*・左腕 tL*・鞄 tBag・脚 tLegA*／tLegB*）。左右・脚の組は anim5.js の TsugiAnimator
TSUGI = [
    (r'^root$', 'tRoot'), (r'^pelvis$', 'tHip'), (r'^spine$', 'tBody'), (r'^chest$', 'tChest'), (r'^(neck|head)$', 'tHeadA'),
    (r'^upperArmR$', 'tR0'), (r'^foreArmR$', 'tR1'), (r'^(handR|finger\dR|thumbR)$', 'tR2'),
    (r'^upperArmL$', 'tL0'), (r'^foreArmL$', 'tL1'), (r'^(handL|finger\dL|thumbL)$', 'tL2'), (r'^bag$', 'tBag'),
    (r'^thighL$', 'tLegA0'), (r'^shinL$', 'tLegA1'), (r'^footL$', 'tLegA2'),
    (r'^thighR$', 'tLegB0'), (r'^shinR$', 'tLegB1'), (r'^footR$', 'tLegB2'),
]
TSUGI_REST = {'tHip': 'pelvis', 'tBody': 'spine', 'tChest': 'chest', 'tHeadA': 'head', 'tR0': 'upperArmR', 'tR1': 'foreArmR', 'tR2': 'handR',
              'tL0': 'upperArmL', 'tL1': 'foreArmL', 'tL2': 'handL', 'tBag': 'bag', 'tLegs': 'pelvis',
              'tLegA0': 'thighL', 'tLegA1': 'shinL', 'tLegA2': 'footL', 'tLegB0': 'thighR', 'tLegB1': 'shinR', 'tLegB2': 'footR'}
# 境界の先触れ：前の 2 本の脚＝薙ぎの腕（sArmL/R：コードの薙ぎ）・内の鉤爪＝翼の鎖 0／1（雨で上がる）・殻と核＝胸（sChest）・後ろ脚は動かない根（sBase）
SAKI = [
    (r'^root$', 'sBase'), (r'^(body|core)$', 'sChest'),
    (r'^upper_frontL$', 'sArmL_0'), (r'^lower_frontL$', 'sArmL_1'), (r'^foot_frontL$', 'sArmL_2'),
    (r'^upper_frontR$', 'sArmR_0'), (r'^lower_frontR$', 'sArmR_1'), (r'^foot_frontR$', 'sArmR_2'),
    (r'^claw_upperL$', 'sWing0_0'), (r'^claw_foreL$', 'sWing0_1'), (r'^(inner_)?talonL$', 'sWing0_2'),
    (r'^claw_upperR$', 'sWing1_0'), (r'^claw_foreR$', 'sWing1_1'), (r'^(inner_)?talonR$', 'sWing1_2'),
    (r'^(upper|lower|foot)_rear[LR]$', 'sBase'),
]
SAKI_REST = {'sChest': 'body', 'sArmL_0': 'upper_frontL', 'sArmL_1': 'lower_frontL', 'sArmL_2': 'foot_frontL', 'sArmR_0': 'upper_frontR', 'sArmR_1': 'lower_frontR', 'sArmR_2': 'foot_frontR',
             'sWing0_0': 'claw_upperL', 'sWing0_1': 'claw_foreL', 'sWing0_2': 'talonL', 'sWing1_0': 'claw_upperR', 'sWing1_1': 'claw_foreR', 'sWing1_2': 'talonR'}
# 巨大猫又：コードの四つ足の骨（anim5.js の GiantAnimator：gBody・gChest・gNeck・gHead・gJaw・前脚 gFL*・後ろ脚 gHL*・二本の尾 gTailL*／gTailR*）
NEKO = [
    (r'^root$', 'gBody'), (r'^pelvis$', 'gBody'), (r'^spine1$', 'gBody'), (r'^spine2$', 'gChest'), (r'^chest$', 'gChest'), (r'^neck\d$', 'gNeck'), (r'^head$', 'gHead'), (r'^jaw$', 'gJaw'),
    (r'^foreLegL$', 'gFLuL'), (r'^foreArmL$', 'gFLlL'), (r'^forePawL$', 'gFLpL'), (r'^foreLegR$', 'gFLuR'), (r'^foreArmR$', 'gFLlR'), (r'^forePawR$', 'gFLpR'),
    (r'^hindLegL$', 'gHLuL'), (r'^hindShinL$', 'gHLlL'), (r'^hindFootL$', 'gHLhL'), (r'^hindLegR$', 'gHLuR'), (r'^hindShinR$', 'gHLlR'), (r'^hindFootR$', 'gHLhR'),
] + [(r'^tail%d$' % (i + 1), 'gTailL%d' % i) for i in range(6)] + [(r'^tailB%d$' % (i + 1), 'gTailR%d' % i) for i in range(6)]
NEKO_REST = dict([('gBody', 'pelvis'), ('gChest', 'chest'), ('gNeck', 'neck1'), ('gHead', 'head'), ('gJaw', 'jaw'),
                  ('gFLuL', 'foreLegL'), ('gFLlL', 'foreArmL'), ('gFLpL', 'forePawL'), ('gFLuR', 'foreLegR'), ('gFLlR', 'foreArmR'), ('gFLpR', 'forePawR'),
                  ('gHLuL', 'hindLegL'), ('gHLlL', 'hindShinL'), ('gHLhL', 'hindFootL'), ('gHLuR', 'hindLegR'), ('gHLlR', 'hindShinR'), ('gHLhR', 'hindFootR')]
                 + [('gTailL%d' % i, 'tail%d' % (i + 1)) for i in range(6)] + [('gTailR%d' % i, 'tailB%d' % (i + 1)) for i in range(6)])

# P20：人型の追加の骨（守り手の頭巾・記録のない患者の点滴台と記録の板・当直の作業灯と針と点検表と弁・研究者の白衣の裾・写し身の後ろ髪）。
# 対応の無い骨は親の骨へ（点滴台＝root → 腰）。記録の板（folder）は右手で胸に抱えているので右手へ
HUMAN_X = [(r'^hood$', 'head'), (r'^folder$', 'rightHand'), (r'^(lamp|needle)$', 'head'), (r'^clipboard$', 'leftLowerArm'), (r'^valve$', 'spine'),
           (r'^tail\d$', 'head')] + HUMAN
# VRoid（配偶者に似た異形）：J_Bip_* の骨の名前 → Codex の人型の名前（動きを写した後に名前を変える）。肩・つま先・目・髪は親の骨へ
VROID = {'Root': 'root', 'J_Bip_C_Hips': 'pelvis', 'J_Bip_C_Spine': 'spine', 'J_Bip_C_Chest': 'spine1', 'J_Bip_C_UpperChest': 'chest', 'J_Bip_C_Neck': 'neck', 'J_Bip_C_Head': 'head'}
for _s, _k in (('L', 'L'), ('R', 'R')):
    VROID.update({'J_Bip_%s_UpperArm' % _s: 'upperArm' + _k, 'J_Bip_%s_LowerArm' % _s: 'foreArm' + _k, 'J_Bip_%s_Hand' % _s: 'hand' + _k,
                  'J_Bip_%s_UpperLeg' % _s: 'thigh' + _k, 'J_Bip_%s_LowerLeg' % _s: 'shin' + _k, 'J_Bip_%s_Foot' % _s: 'foot' + _k})
# 塗替：コードの骨（anim6.js の NurikaeAnimator：nHip・nBody・nChest・nHead・脚 nLeg{L|R}0..2・腕 nArm{L|R}0..4・尾 nTail*）。
# 街灯 3 本＝冠（nHead）・胸の核＝nChest・左腕の箱と 3 本の爪＝nArmL2..4・右腕の 5 本の電線の輪＝nArmR3（根もと半分）と nArmR4（先の半分）
NURI = [
    (r'^root$', 'nRoot'), (r'^pelvis$', 'nHip'), (r'^spine$', 'nBody'), (r'^(chest|core)$', 'nChest'), (r'^lamp\d$', 'nHead'),
    (r'^upperArmL$', 'nArmL0'), (r'^foreArmL$', 'nArmL1'), (r'^handL$', 'nArmL2'), (r'^claw\d$', 'nArmL3'), (r'^claw\dtip$', 'nArmL4'),
    (r'^upperArmR$', 'nArmR0'), (r'^foreArmR$', 'nArmR1'), (r'^handR$', 'nArmR2'), (r'^cable\d_[0-5]$', 'nArmR3'), (r'^cable\d_\d+$', 'nArmR4'),
    (r'^thighL$', 'nLegL0'), (r'^shinL$', 'nLegL1'), (r'^footL$', 'nLegL2'), (r'^thighR$', 'nLegR0'), (r'^shinR$', 'nLegR1'), (r'^footR$', 'nLegR2'),
]
NURI_REST = {'nHip': 'pelvis', 'nBody': 'spine', 'nChest': 'chest', 'nHead': 'lamp0',
             'nArmL0': 'upperArmL', 'nArmL1': 'foreArmL', 'nArmL2': 'handL', 'nArmL3': 'claw2', 'nArmL4': 'claw2tip',
             'nArmR0': 'upperArmR', 'nArmR1': 'foreArmR', 'nArmR2': 'handR', 'nArmR3': 'cable2_0', 'nArmR4': 'cable2_6',
             'nLegL0': 'thighL', 'nLegL1': 'shinL', 'nLegL2': 'footL', 'nLegR0': 'thighR', 'nLegR1': 'shinR', 'nLegR2': 'footR'}
# 境界を喰らうもの：コードの骨（anim7.js の KuramonoAnimator：kBody・kChest・kCrown・翼 kW{L|R}{0..2}_0..3・根 kT{0..5}_0..3）。
# 翼 6 枚（上・中・下）＝kW*_0..2・根の脚 4 本＝根 kT0..3（前左・前右・後左・後右）・胸の淵の目＝kChest。時計の冠（kCrown）は届いたモデルに無い
KURA = [(r'^root$', 'kRoot'), (r'^(pelvis|spine)$', 'kBody'), (r'^(chest|core|pupil)$', 'kChest')]
KURA_REST = {'kBody': 'pelvis', 'kChest': 'chest'}
for _s in 'LR':
    for _i in range(3):
        for _j, _p in enumerate(('wingRoot', 'wingMid', 'wingTip')):
            KURA.append((r'^%s%s%d$' % (_p, _s, _i), 'kW%s%d_%d' % (_s, _i, _j)))
            KURA_REST['kW%s%d_%d' % (_s, _i, _j)] = '%s%s%d' % (_p, _s, _i)
for _t, _l in enumerate(('FL', 'FR', 'BL', 'BR')):
    for _j, _p in enumerate(('thigh', 'shin', 'foot')):
        KURA.append((r'^%s%s$' % (_p, _l), 'kT%d_%d' % (_t, _j)))
        KURA_REST['kT%d_%d' % (_t, _j)] = _p + _l

# ───────────────────────── 材質 → 種類（charkit/shader/toon2.js の cloth／skin／metal／acc／glow／fur）・輪郭線の太さ
def cls_of(mat, cfg):
    n = mat['name'].lower()
    for rx, c in cfg.get('cls', []):
        if re.search(rx, n):
            return c
    if mat['emit'] > 0.05:
        return 'glow'
    if re.search(r'eye|cavit|socket|sensor|gap|recess|pupil|iris|mouth crease|fold shadow', n):
        return 'acc'
    if re.search(r'skin|hand|nail|face|pallid', n):
        return 'skin'
    if mat['metal'] >= 0.5 or re.search(r'metal|brass|silver|galvan|steel|fitting', n):
        return 'metal'
    if re.search(r'pencil|key|button|fastener|buckle|watch|clock|label|identifier|band|terminal|display|casing|strap|leather', n):
        return 'acc'
    return 'cloth'


# 種類ごとの輪郭線の太さ（oth）：小さな物・発光・穴は細く
OTH = {'cloth': 1.0, 'skin': 0.9, 'fur': 0.9, 'metal': 0.7, 'acc': 0.5, 'glow': 0.0}

KINDS = {
    # kind: 届いた物（フォルダ・glb）・骨の対応・人型（腕と脚をまっすぐ下へ）・高さ（コードの異形の網の上端＝当たりの高さに合わせる）・三角形の目標
    'heiten': dict(dir='heiten', glb='heiten.glb', map=HUMAN, rest=HUMAN_REST, straight=True, top=2.08, tris=(12000, 6000),
                   anchors={'weak': dict(mat=r'terminal|keys|display'), 'eyeGlow': dict(mat=r'eye and mouth', eyes=2, top=0.5)}),
    'shuuyou': dict(dir='shuyosha_v2', glb='shuyosha.glb', map=HUMAN, rest=HUMAN_REST, straight=True, top=2.37, tris=(13000, 6500),
                    anchors={'weak': dict(mat=r'eye recess'), 'eyeGlow': dict(mat=r'eye recess', eyes=2)}),
    'shuusha': dict(dir='inmate_standard', glb='inmate_standard.glb', map=HUMAN, rest=HUMAN_REST, straight=True, top=1.80, tris=(10000, 5000),
                    anchors={'eyeGlow': dict(mat=r'recessed eyes', eyes=2)}),
    'mimic': dict(dir='mohosha', glb='mohosha.glb', map=HUMAN, rest=HUMAN_REST, straight=True, top=1.72, tris=(10000, 5000),
                  anchors={'weak': dict(mat=r'facial cavit'), 'eyeGlow': dict(mat=r'facial cavit', eyes=2, top=0.45)}),
    'outou': dict(dir='outoutai', glb='outoutai.glb', map=HUMAN, rest=HUMAN_REST, straight=True, top=1.95, tris=(11000, 5500),
                  skip=r'translucent', anchors={'weak': dict(mat=r'response light', top=0.3), 'eyeGlow': dict(mat=r'recessed sensors', eyes=1, top=0.3)}),
    'machibito': dict(dir='machibito', glb='machibito.glb', map=HUMAN, rest=HUMAN_REST, straight=True, top=1.86, tris=(10000, 5000),
                      anchors={'eyeGlow': dict(mat=r'eye and mouth', eyes=2, top=0.5)}),
    'tsugihagi': dict(dir='tsugihagi', glb='tsugihagi.glb', map=TSUGI, rest=TSUGI_REST, straight=False, top=3.18, tris=(24000, 12000),
                      anchors={'weak': dict(mat=r'stitching', bone='tChest'), 'eyeGlow': dict(mat=r'eye sockets', eyes=2), 'eyes': dict(mat=r'eye sockets', eyes=2)}),
    'sakibure': dict(dir='sakibure', glb='sakibure.glb', map=SAKI, rest=SAKI_REST, straight=False, top=1.62, tris=(30000, 15000),
                     anchors={'core': dict(mat=r'fissure', bone='sChest'), 'eyes': dict(mat=r'fissure', eyes=4, bone='sChest')}),
    'nekomata': dict(dir='nekomata', glb='nekomata_light.glb', map=NEKO, rest=NEKO_REST, straight=False, top=1.80, tris=(36000, 18000),
                     cls=[(r'sculpted fur', 'fur:0'), (r'coat', 'fur')], strands=(r'sculpted fur', 1100, 500), anchors={'eyes': dict(mat=r'lavender iris', eyes=2, bone='gHead')}),
    # P20（2026-11-13 に届いた 7 体＋写し身の完成版）
    'mamori': dict(dir='mamorite', glb='mamorite.glb', map=HUMAN_X, rest=HUMAN_REST, straight=True, top=2.2, tris=(12000, 6000),
                   anchors={'eyeGlow': dict(mat=r'pale weathered skin', gb=r'^head$', front=0.2, eyes=2)}),
    'kanja': dict(dir='unrecorded_patient', glb='unrecorded_patient.glb', map=HUMAN_X, rest=HUMAN_REST, straight=True, keep=('upperArmR', 'foreArmR', 'handR'), top=2.13, tris=(11000, 5500),
                  skip=r'clear infusion', anchors={'weak': dict(mat=r'infusion liquid'), 'eyeGlow': dict(mat=r'ash pale skin', gb=r'^head$', front=0.2, eyes=2)}),
    'utsushimi': dict(dir='utsushimi', glb='utsushimi.glb', map=HUMAN_X, rest=HUMAN_REST, straight=True, top=2.8, tris=(16000, 8000),
                      cls=[(r'hair', 'hair')], anchors={'eyeGlow': dict(mat=r'eye glints', eyes=2), 'weak': dict(mat=r'recessed smile')}),
    'touchoku': dict(dir='tochoku', glb='tochoku.glb', map=HUMAN_X, rest=HUMAN_REST, straight=True, top=2.25, tris=(18000, 9000),
                     cls=[(r'forearm', 'skin')], anchors={'eyeGlow': dict(mat=r'worklamp', eyes=1), 'weak': dict(mat=r'red valve', bone='chest')}),
    'kenkyusha': dict(dir='researcher', glb='researcher.glb', map=HUMAN_X, rest=HUMAN_REST, straight=True, top=None, tris=(18000, 9000),
                      cls=[(r'hair', 'hair'), (r'^neck$', 'skin')]),
    'spouse_like': dict(dir='spouse_apparition', glb='spouse_animated.glb', rename=VROID, map=HUMAN_X, rest=HUMAN_REST, straight=True, top=None, tris=(9000, 4500),
                        cls=[(r'hair|chestnut', 'hair')]),
    'nurikae': dict(dir='nurikae', glb='nurikae.glb', map=NURI, rest=NURI_REST, straight=False, top=2.45, tris=(32000, 16000), hide=['glow'],
                    anchors={'core': dict(mat=r'boundary discharge', gb=r'^(core|chest)$', bone='nChest'), 'eyes': dict(mat=r'boundary discharge', gb=r'^lamp', eyes=3, bone='nHead')}),
    'kuramono': dict(dir='boundary_eater', glb='boundary_eater.glb', map=KURA, rest=KURA_REST, straight=False, top=2.68, tris=(36000, 18000), hide=['glow'],
                     anchors={'core': dict(mat=r'abyss pupil', gb=r'^(core|pupil)$', bone='kChest'), 'eyes': dict(mat=r'wing eyes', eyes=10, perBone=True)}),
}


def b64(a, dt):
    return base64.b64encode(np.ascontiguousarray(np.asarray(a).astype(dt)).tobytes()).decode('ascii')


def srgb2lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin2srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


# ───────────────────────── Blender の中の作業
def load(path):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
    if arm.animation_data:
        arm.animation_data.action = None
        for t in list(arm.animation_data.nla_tracks):
            arm.animation_data.nla_tracks.remove(t)
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    meshes = [o for o in bpy.data.objects if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers)]
    for o in [o for o in bpy.data.objects if o.type == 'MESH' and o not in meshes]:
        bpy.data.objects.remove(o)
    bpy.context.view_layer.update()
    return arm, meshes


def mat_info(m):
    out = {'name': m.name, 'col': np.array([0.8, 0.8, 0.8]), 'img': None, 'emit': 0.0, 'emitCol': np.zeros(3), 'metal': 0.0, 'alpha': 1.0}
    if not m.use_nodes:
        return out
    b = [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED']
    if not b:
        return out
    b = b[0]
    bc = b.inputs['Base Color']
    out['col'] = np.array(bc.default_value[:3])
    out['metal'] = b.inputs['Metallic'].default_value
    out['alpha'] = b.inputs['Alpha'].default_value
    es = b.inputs['Emission Strength'].default_value
    ec = np.array(b.inputs['Emission Color'].default_value[:3])
    out['emit'] = float(es * ec.max())
    out['emitCol'] = ec
    if bc.is_linked:
        n = bc.links[0].from_node
        while n and n.type != 'TEX_IMAGE':                       # 間の節（色の掛け算など）をたどる
            ins = [i for i in n.inputs if i.is_linked]
            n = ins[0].links[0].from_node if ins else None
        if n and n.image:
            out['img'] = n.image
    return out


IMG_CACHE = {}


def small_img(img, size=64):
    """画像 → 低い周波数の色（size×size の平均・線形の色）"""
    if img.name in IMG_CACHE:
        return IMG_CACHE[img.name]
    w, h = img.size
    px = np.empty(w * h * 4, np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)[:, :, :3]
    if img.colorspace_settings.name.lower().startswith('srgb') and not img.is_float:
        px = srgb2lin(px)
    k = max(1, w // size)
    px = px[:h // k * k, :w // k * k].reshape(h // k, k, w // k, k, 3).mean(axis=(1, 3))
    IMG_CACHE[img.name] = px
    return px


def bake_colors(o, mats):
    """角ごとの頂点色（属性 'pkcol'：線形）。画像の色 × 基本色。発光は色を明るく"""
    me = o.data
    nl = len(me.loops)
    col = np.zeros((nl, 4), np.float32)
    col[:, 3] = 1
    if not me.polygons:
        return
    mi = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get('material_index', mi)
    ls = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get('loop_start', ls)
    lt = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get('loop_total', lt)
    lp = np.repeat(np.arange(len(me.polygons)), lt)            # 角 → 面
    uv = np.zeros(nl * 2, np.float32)
    if me.uv_layers:
        me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    for si, slot in enumerate(o.material_slots):
        m = slot.material
        if not m:
            continue
        info = mats[m.name]
        sel = mi[lp] == si
        if not sel.any():
            continue
        if info['img'] is not None:
            px = small_img(info['img'])
            hh, ww = px.shape[:2]
            u = np.mod(uv[sel, 0], 1.0)
            v = np.mod(uv[sel, 1], 1.0)
            c = px[np.clip((v * hh).astype(int), 0, hh - 1), np.clip((u * ww).astype(int), 0, ww - 1)]
        else:
            c = np.tile(info['col'], (sel.sum(), 1))
        if info['emit'] > 0.05:
            c = np.maximum(c, info['emitCol'] * 0.9)
        col[sel, :3] = c
    a = me.color_attributes.new('pkcol', 'FLOAT_COLOR', 'CORNER')
    a.data.foreach_set('color', col.ravel())


def rename_bones(arm, meshes, ren, raw):
    """骨（と同じ名前の頂点の組・写した動きのこま）の名前を変える"""
    for b in arm.data.bones:
        if b.name in ren:
            old = b.name
            b.name = ren[old]
            for o in meshes:
                g = o.vertex_groups.get(old)
                if g is not None:
                    g.name = ren[old]
    for clip in raw.values():
        clip['frames'] = [{ren.get(k, k): v for k, v in fr.items()} for fr in clip['frames']]


def chain_dirs(arm, name_a, name_b):
    import bpy  # noqa
    pa, pb = arm.pose.bones.get(name_a), arm.pose.bones.get(name_b)
    return pa, pb


def straighten(arm, side_max=0.16, keep=()):
    """腕と脚：骨の向き（この関節 → 次の関節）を前後の成分を消した「まっすぐ下」へ（外への開きは side_max ラジアンまで残す）"""
    import bpy
    from mathutils import Matrix, Vector
    P = arm.pose.bones

    def fingers_head(hand):
        ks = [c for c in P[hand].children if re.match(r'finger\d', c.name)]
        if not ks:
            return None
        return sum((c.head for c in ks), Vector()) / len(ks)
    chains = []
    for s in 'LR':
        chains += [('upperArm' + s, 'foreArm' + s, side_max), ('foreArm' + s, 'hand' + s, side_max), ('hand' + s, None, side_max),
                   ('thigh' + s, 'shin' + s, 0.07), ('shin' + s, 'foot' + s, 0.07)]
    for a, b, lim in chains:
        if a not in P or a in keep:                            # keep：届いた姿のまま残す腕（記録のない患者の右腕＝胸に記録の板を抱える）
            continue
        bpy.context.view_layer.update()
        h = P[a].head.copy()
        c = P[b].head.copy() if b else fingers_head(a)
        if c is None:
            continue
        d = (c - h)
        if d.length < 1e-5:
            continue
        d.normalize()
        sx = 1 if a.endswith('L') else -1
        ang = math.atan2(d.x * sx, -d.z)                       # 外への開き（Blender：Z 上）
        ang = max(0.0, min(lim, ang))
        t = Vector((sx * math.sin(ang), 0.0, -math.cos(ang)))
        R = d.rotation_difference(t).to_matrix().to_4x4()
        P[a].matrix = Matrix.Translation(h) @ R @ Matrix.Translation(-h) @ P[a].matrix
    bpy.context.view_layer.update()


HUMAN_PARENT = {'spine': 'hips', 'chest': 'spine', 'neck': 'chest', 'head': 'neck', 'leftUpperArm': 'chest', 'leftLowerArm': 'leftUpperArm', 'leftHand': 'leftLowerArm',
                'rightUpperArm': 'chest', 'rightLowerArm': 'rightUpperArm', 'rightHand': 'rightLowerArm', 'leftUpperLeg': 'hips', 'leftLowerLeg': 'leftUpperLeg', 'leftFoot': 'leftLowerLeg',
                'rightUpperLeg': 'hips', 'rightLowerLeg': 'rightUpperLeg', 'rightFoot': 'rightLowerLeg'}
CB = np.array([[1, 0, 0], [0, 0, 1], [0, -1, 0]], float)        # Blender（Z 上・-Y 前）→ glTF（Y 上・+Z 前）


def rot3(pb):
    m = np.array(pb.matrix.to_3x3())
    u, _, vt = np.linalg.svd(m)                                  # 大きさを外した回転
    return u @ vt


def sample_clips(arm, fps=10):
    """glb の動き（action）を 1 秒 fps こまで：骨ごとの回転（骨組みの空間）。休みの姿勢に戻す前に呼ぶ"""
    import bpy
    out = {}
    sc = bpy.context.scene
    for act in bpy.data.actions:
        f0, f1 = act.frame_range
        src_fps = sc.render.fps / sc.render.fps_base
        n = max(2, int(round((f1 - f0) / src_fps * fps)) + 1)
        arm.animation_data_create()
        arm.animation_data.action = act
        if hasattr(arm.animation_data, 'action_slot') and act.slots:
            arm.animation_data.action_slot = act.slots[0]
        frames = []
        for i in range(n):
            f = f0 + (f1 - f0) * i / (n - 1)
            sc.frame_set(int(math.floor(f)), subframe=f - math.floor(f))
            frames.append({pb.name: rot3(pb) for pb in arm.pose.bones})
        out[act.name] = {'fps': fps, 'frames': frames, 'dur': (f1 - f0) / src_fps}
    arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.matrix_basis.identity()
    bpy.context.view_layer.update()
    return out


def euler_yxz(m):
    """three.js の Euler 'YXZ'（Poser と同じ）"""
    m23 = max(-1.0, min(1.0, m[1, 2]))
    x = math.asin(-m23)
    if abs(m23) < 0.9999999:
        y = math.atan2(m[0, 2], m[2, 2])
        z = math.atan2(m[1, 0], m[1, 1])
    else:
        y = math.atan2(-m[2, 0], m[0, 0])
        z = 0.0
    return x, y, z


def code_clips(raw, straight_rot, rest_map, parent):
    """glb の動き → コードの骨の局所の回転（休みの姿勢＝腕と脚を下ろした形からの回転・Euler YXZ）"""
    out = {}
    names = [c for c in rest_map if c in parent or c == 'hips']
    prim = {}
    for c in names:
        g = rest_map[c]
        for gg in ([g] if isinstance(g, str) else g):
            if gg in straight_rot:
                prim[c] = gg
                break
    names = [c for c in names if c in prim]
    for an, clip in raw.items():
        tr = []
        for fr in clip['frames']:
            D = {c: CB @ (fr[prim[c]] @ straight_rot[prim[c]].T) @ CB.T for c in names}
            row = []
            for c in names:
                L = D[c] if c == 'hips' or parent.get(c) not in D else D[parent[c]].T @ D[c]
                row += [round(v, 3) for v in euler_yxz(L)]
            tr.append(row)
        out[an] = {'fps': clip['fps'], 'dur': round(clip['dur'], 3), 'bones': names, 'r': tr}
    return out


def bake_pose_and_join(arm, meshes):
    import bpy
    for o in meshes:
        if o.data.shape_keys:
            o.shape_key_add(name='tmp', from_mix=False)
            o.active_shape_key_index = 0
            bpy.context.view_layer.objects.active = o
            o.select_set(True)
            bpy.ops.object.shape_key_remove(all=True, apply_mix=False)
            o.select_set(False)
    # 姿勢を網へ焼く（腕と脚の骨を回した時だけ形が変わる）
    for o in meshes:
        bpy.context.view_layer.objects.active = o
        for md in o.modifiers:
            if md.type == 'ARMATURE':
                md.object = arm
                bpy.ops.object.modifier_apply(modifier=md.name)
                break
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return o


def decimate(o, target):
    import bpy
    me = o.data
    tri = sum(len(p.vertices) - 2 for p in me.polygons)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    md = o.modifiers.new('dec', 'DECIMATE')
    md.decimate_type = 'COLLAPSE'
    md.ratio = min(1.0, target / max(1, tri))
    md.use_collapse_triangulate = True
    md.use_symmetry = True
    md.symmetry_axis = 'X'
    bpy.ops.object.modifier_apply(modifier=md.name)


def thin_strands(o, mat_rx, keep):
    """細い毛の房（材質 mat_rx のばらばらの小さな網：猫又の毛は 1 万 4 千本）を、大きい（長い）順に keep 本だけ残す。間引きでは減らない形なので"""
    import bmesh
    me = o.data
    slots = [i for i, sl in enumerate(o.material_slots) if sl.material and re.search(mat_rx, sl.material.name.lower())]
    if not slots:
        return
    mi = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get('material_index', mi)
    fur = set()
    for pi in np.where(np.isin(mi, slots))[0]:
        fur.update(me.polygons[int(pi)].vertices)
    fur = np.array(sorted(fur))
    n = len(me.vertices)
    e = np.zeros(len(me.edges) * 2, np.int32)
    me.edges.foreach_get('vertices', e)
    e = e.reshape(-1, 2)
    infur = np.zeros(n, bool)
    infur[fur] = True
    e = e[infur[e[:, 0]] & infur[e[:, 1]]]
    lab = np.arange(n)
    for _ in range(400):
        m = np.minimum(lab[e[:, 0]], lab[e[:, 1]])
        old = lab.copy()
        np.minimum.at(lab, e[:, 0], m)
        np.minimum.at(lab, e[:, 1], m)
        lab = lab[lab]
        if (lab == old).all():
            break
    co = np.zeros(n * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    L = lab[fur]
    comps, inv = np.unique(L, return_inverse=True)
    lo = np.full((len(comps), 3), np.inf)
    hi = np.full((len(comps), 3), -np.inf)
    np.minimum.at(lo, inv, co[fur])
    np.maximum.at(hi, inv, co[fur])
    size = np.linalg.norm(hi - lo, axis=1)
    if len(comps) <= keep:
        return
    drop = set(comps[np.argsort(-size)[keep:]].tolist())
    kill = fur[np.isin(L, list(drop))]
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[int(i)] for i in kill], context='VERTS')
    bm.to_mesh(me)
    bm.free()
    print('  毛の房 %d → %d 本' % (len(comps), keep))


def extract(o, cfg, mats, s, bone_map, groups):
    """網 → 部品（種類ごと）の配列。座標は glTF・縮めた後"""
    me = o.data
    me.calc_loop_triangles()
    nv = len(me.vertices)
    co = np.zeros(nv * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    P = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1) * s
    nrm = np.zeros(nv * 3, np.float32)
    me.vertices.foreach_get('normal', nrm)
    nrm = nrm.reshape(-1, 3)
    N = np.stack([nrm[:, 0], nrm[:, 2], -nrm[:, 1]], 1)
    lt = me.loop_triangles
    nt = len(lt)
    tv = np.zeros(nt * 3, np.int32)
    lt.foreach_get('vertices', tv)
    tv = tv.reshape(-1, 3)
    tl = np.zeros(nt * 3, np.int32)
    lt.foreach_get('loops', tl)
    tl = tl.reshape(-1, 3)
    tm = np.zeros(nt, np.int32)
    lt.foreach_get('material_index', tm)
    cl = np.zeros(len(me.loops) * 4, np.float32)
    me.color_attributes['pkcol'].data.foreach_get('color', cl)
    cl = cl.reshape(-1, 4)[:, :3]
    # 重み（glb の骨 → コードの骨：同じ骨は足す）
    names = sorted(set(bone_map.values()))
    bidx = {n: i for i, n in enumerate(names)}
    Wfull = np.zeros((nv, len(names)), np.float32)
    gname = {g.index: g.name for g in o.vertex_groups}
    for v in me.vertices:
        for g in v.groups:
            gn = gname.get(g.group)
            if gn in bone_map and g.weight > 0:
                Wfull[v.index, bidx[bone_map[gn]]] += g.weight
    bad = Wfull.sum(1) <= 1e-6
    if bad.any():                                               # 重みの無い点（ほぼ無い）は一番近い重みのある点の骨
        good = np.where(~bad)[0]
        for i in np.where(bad)[0]:
            j = good[np.argmin(((P[good] - P[i]) ** 2).sum(1))]
            Wfull[i] = Wfull[j]
    order = np.argsort(-Wfull, 1)[:, :4]
    J = order.astype(np.int32)
    W = np.take_along_axis(Wfull, order, 1)
    W = W / W.sum(1, keepdims=True)
    # 種類ごとの部品
    slot_cls = []
    for sl in o.material_slots:
        info = mats.get(sl.material.name) if sl.material else None
        slot_cls.append(cls_of(info, cfg) if info else 'cloth')
    parts = []
    tri_cls = np.array([slot_cls[i] if i < len(slot_cls) else 'cloth' for i in tm])
    for c in sorted(set(tri_cls)):
        sel = tri_cls == c
        T = tv[sel]
        L = tl[sel]
        uniq, inv = np.unique(T.ravel(), return_inverse=True)
        # 頂点色：この種類の角の色の平均
        csum = np.zeros((len(uniq), 3))
        np.add.at(csum, inv, cl[L.ravel()])
        cnt = np.bincount(inv, minlength=len(uniq))[:, None]
        C = csum / np.maximum(1, cnt)
        mat, _, oth = c.partition(':')                          # 'fur:0' ＝ 種類 fur・輪郭線 0（細い毛の房：輪郭線で黒くならない）
        parts.append({'name': c.replace(':', '_'), 'mat': mat, 'oth': float(oth) if oth else OTH.get(mat, 1.0), 'P': P[uniq], 'N': N[uniq], 'C': C, 'J': J[uniq], 'W': W[uniq], 'I': inv.reshape(-1, 3)})
    return parts, names


def kmeans(Q, n, it=30):
    """点を n 個のかたまりへ（翼の目・街灯）。始めは遠い点から選ぶ"""
    C = [Q[np.argmax(Q[:, 1])]]
    for _ in range(1, n):
        d = np.min([((Q - c) ** 2).sum(1) for c in C], axis=0)
        C.append(Q[np.argmax(d)])
    C = np.array(C)
    for _ in range(it):
        lab = np.argmin(((Q[:, None, :] - C[None]) ** 2).sum(2), 1)
        C = np.array([Q[lab == k].mean(0) if (lab == k).any() else C[k] for k in range(n)])
    return C, lab


def anchors_of(o_full, cfg, mats, s, bone_map, rest):
    """目・弱点・核の位置（材質の点の真ん中・目は左右に分ける）。glb の全部の点（間引く前）で測る。
    P20：gb（glb の骨の名前：その骨の重みの多い点だけ）・front（前の割合だけ＝顔）・eyes が 3 以上（4 以外）は点を n 個のかたまりへ・
    perBone（かたまりごとに骨を書く＝翼ごとの目）"""
    me = o_full.data
    out = {}
    co = np.zeros(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    P = np.stack([co[:, 0], co[:, 2], -co[:, 1]], 1) * s
    mi = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get('material_index', mi)
    slot_names = [sl.material.name.lower() if sl.material else '' for sl in o_full.material_slots]
    gname = {g.index: g.name for g in o_full.vertex_groups}

    def dom_bone(vs):
        acc = {}
        for vi in vs[::max(1, len(vs) // 400)]:
            for g in me.vertices[int(vi)].groups:
                gn = gname.get(g.group)
                if gn in bone_map:
                    acc[bone_map[gn]] = acc.get(bone_map[gn], 0) + g.weight
        return max(acc, key=acc.get) if acc else None
    for key, a in cfg.get('anchors', {}).items():
        slots = [i for i, n in enumerate(slot_names) if re.search(a['mat'], n)]
        polys = np.where(np.isin(mi, slots))[0]
        if not len(polys):
            print('  anchor', key, 'の材質が見つからない', a['mat'])
            continue
        vs = set()
        for pi in polys:
            vs.update(me.polygons[pi].vertices)
        vs = np.array(sorted(vs))
        if a.get('gb'):                                        # その骨（glb の名前）の重みが多い点だけ
            gi = {g.index for g in o_full.vertex_groups if re.search(a['gb'], g.name)}
            k = np.array([sum(g.weight for g in me.vertices[int(v)].groups if g.group in gi) >= 0.4 for v in vs], bool)
            if k.any():
                vs = vs[k]
            else:
                print('  anchor', key, 'の骨の点が無い', a['gb'])
        Q = P[vs]
        if a.get('top'):                                       # 上の方（目と口が同じ材質の時：上の割合だけ）
            y0, y1 = Q[:, 1].min(), Q[:, 1].max()
            k = Q[:, 1] >= y1 - (y1 - y0) * a['top']
            vs, Q = vs[k], Q[k]
        if a.get('front'):                                     # 前の方（顔：+Z の割合だけ）
            z0, z1 = Q[:, 2].min(), Q[:, 2].max()
            k = Q[:, 2] >= z1 - (z1 - z0) * a['front']
            vs, Q = vs[k], Q[k]
        # 骨：指定が無ければ点の重みが一番多い骨
        bone = a.get('bone') or dom_bone(vs)
        bones = None
        n = a.get('eyes', 0)
        if n == 2:
            cx = Q[:, 0].mean() if a.get('front') else 0.0      # 顔（front）：傾いた頭（記録のない患者）は点の真ん中で左右に分ける
            L = Q[Q[:, 0] > cx + 0.01]
            R = Q[Q[:, 0] < cx - 0.01]
            pts = [L.mean(0) if len(L) else Q.mean(0), R.mean(0) if len(R) else Q.mean(0)]
        elif n == 4:                                           # 輪の上下左右（先触れの縁の輪）
            c = Q.mean(0)
            r = np.percentile(np.abs(Q[:, 0] - c[0]), 90)
            pts = [c + np.array([r * 0.8, 0, 0]), c - np.array([r * 0.8, 0, 0]), c + np.array([0, r * 0.8, 0]), c - np.array([0, r * 0.8, 0])]
        elif n >= 3:
            C, lab = kmeans(Q, n)
            pts = list(C)
            if a.get('perBone'):
                bones = [dom_bone(vs[lab == k]) or bone for k in range(n)]
        else:
            pts = [Q.mean(0)]
        out[key] = {'bone': bone, 'p': [[round(float(x), 4) for x in p] for p in pts]}
        if bones:
            out[key]['bones'] = bones
    return out


def convert(kind, src, out, lods=('pc', 'low')):
    import bpy
    cfg = KINDS[kind]
    t0 = time.time()
    path = os.path.join(src, cfg['dir'], cfg['glb'])
    arm, meshes = load(path)
    mats = {m.name: mat_info(m) for m in bpy.data.materials}
    if cfg.get('skip'):                                        # 透ける覆い（頂点色では透けない）は外す
        keep = []
        for o in meshes:
            if any(sl.material and re.search(cfg['skip'], sl.material.name.lower()) for sl in o.material_slots):
                bpy.data.objects.remove(o)
            else:
                keep.append(o)
        meshes = keep
    src_tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    for o in meshes:
        bake_colors(o, mats)
    raw = sample_clips(arm) if cfg['straight'] else {}
    if cfg.get('rename'):                                      # VRoid の骨の名前 → Codex の人型の名前（動きは元の名前で写した後）
        rename_bones(arm, meshes, cfg['rename'], raw)
    if cfg['straight']:
        straighten(arm, keep=cfg.get('keep', ()))
    straight_rot = {pb.name: rot3(pb) for pb in arm.pose.bones}
    clips = code_clips(raw, straight_rot, cfg['rest'], HUMAN_PARENT) if raw else {}
    # 骨の対応
    bone_map = {}
    for b in arm.data.bones:
        for rx, cn in cfg['map']:
            if re.match(rx, b.name):
                bone_map[b.name] = cn
                break
    miss = [b.name for b in arm.data.bones if b.name not in bone_map]
    if miss:
        print('  対応の無い骨（重みは親の骨へ）', miss)
        for n in miss:
            p = arm.data.bones[n].parent
            while p is not None and p.name not in bone_map:
                p = p.parent
            bone_map[n] = bone_map[p.name] if p is not None else cfg['map'][0][1]
    # 休みの位置（姿勢を焼いた後の関節＝ポーズの頭）
    bpy.context.view_layer.update()
    head = {pb.name: arm.matrix_world @ pb.head for pb in arm.pose.bones}
    o = bake_pose_and_join(arm, meshes)
    # 大きさ：網の上端（glTF の y）を今の異形の高さへ。足もとは 0 のまま
    me = o.data
    co = np.zeros(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    top, bottom = co[:, 2].max(), co[:, 2].min()
    if bottom < -0.01 * top:                                    # 曲がった脚をまっすぐにして足が床の下へ出た時（守り手）：全体を上げて足もとを 0 へ
        from mathutils import Matrix
        me.transform(Matrix.Translation((0, 0, -bottom)))
        me.update()
        for k in head:
            head[k].z -= bottom
        top, bottom = top - bottom, 0.0
    s = cfg['top'] / top if cfg.get('top') else 1.0             # top が無い時は届いた大きさ（m）のまま（人の大きさの研究者・配偶者に似た異形）
    rest = {}
    for cn, gn in cfg['rest'].items():
        for g in ([gn] if isinstance(gn, str) else gn):
            if g in head:
                h = head[g]
                rest[cn] = [round(float(h.x * s), 5), round(float(h.z * s), 5), round(float(-h.y * s), 5)]
                break
    anchors = anchors_of(o, cfg, mats, s, bone_map, rest)
    full = o.copy()
    full.data = o.data.copy()
    bpy.context.collection.objects.link(full)
    results = {}
    for lod, target in zip(('pc', 'low'), cfg['tris']):
        if lod not in lods:
            continue
        w = full.copy()
        w.data = full.data.copy()
        bpy.context.collection.objects.link(w)
        if cfg.get('strands'):
            thin_strands(w, cfg['strands'][0], cfg['strands'][1 if lod == 'pc' else 2])
        decimate(w, target)
        parts, names = extract(w, cfg, mats, s, bone_map, None)
        pk = write_pack(kind, lod, parts, names, rest, anchors, cfg, out, src_tris, s, bottom, clips)
        results[lod] = pk
        bpy.data.objects.remove(w)
    print('%s：%.1f 秒' % (kind, time.time() - t0), flush=True)
    return results


def write_pack(kind, lod, parts, names, rest, anchors, cfg, out, src_tris, s, bottom, clips=None):
    allP = np.concatenate([p['P'] for p in parts])
    lo, hi = allP.min(0), allP.max(0)
    span = np.maximum(hi - lo, 1e-6)
    prims = []
    tri = 0
    for p in parts:
        q = np.round((p['P'] - lo) / span * 65535 - 32768).astype(np.int16)
        n = p['N'] / np.maximum(1e-6, np.linalg.norm(p['N'], axis=1, keepdims=True))
        Wq = np.floor(p['W'] * 255 + 0.5).astype(np.int32)
        Wq[:, 0] += 255 - Wq.sum(1)                             # 合計をちょうど 255 に
        I = p['I'].ravel()
        it = 'u16' if len(p['P']) < 65536 else 'u32'
        prims.append({'name': p['name'], 'mat': p['mat'], 'oth': p['oth'], 'tint': False, 'count': int(len(p['P'])), 'tris': int(len(I) // 3),
                      'position': b64(q, '<i2'), 'normal': b64(np.round(n * 127), '<i1'), 'color': b64(np.round(lin2srgb(p['C']) * 255), 'u1'),
                      'joints': b64(p['J'], 'u1'), 'weights': b64(np.clip(Wq, 0, 255), 'u1'), 'index': b64(I, '<u2' if it == 'u16' else '<u4'), 'indexType': it})
        tri += len(I) // 3
    pack = {'spec': 'wakaba-enemypack/2', 'kind': kind, 'lod': lod, 'generator': 'tools/blender/enemy/convert_codex.py',
            'license': 'own（自作・商用可）',
            'source': {'model': 'incoming/codex/characters/%s/%s' % (cfg['dir'], cfg['glb']), 'branch': 'models-from-pc', 'made_by': 'Codex（利用者の PC・Blender のスクリプトで一から作成）',
                       'reference': '利用者が ChatGPT で作った原画（リポジトリには入れていない）', 'tris': int(src_tris)},
            'scale': round(float(s), 5), 'bones': names, 'classes': sorted({p['mat'] for p in prims}), 'tris': int(tri),
            'q': {'min': [round(float(x), 5) for x in lo], 'max': [round(float(x), 5) for x in hi]},
            'rest': rest, 'anchors': anchors, 'hide': ['face'] + list(cfg.get('hide', [])), 'clips': clips or {}, 'parts': prims}
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, kind + ('' if lod == 'pc' else '_low') + '.pack.json')
    json.dump(pack, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    print('%s %s：%d → %d 三角形・%d 部品・%.0f KB' % (kind, lod, src_tris, tri, len(prims), os.path.getsize(path) / 1024), flush=True)
    return pack


def update_manifest(out):
    """manifest.json の entries を、置き場にある包み（KINDS の順・通常と _low）から作り直す（ほかの項目はそのまま）"""
    path = os.path.join(out, 'manifest.json')
    man = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {'spec': 'wakaba-enemypack-manifest/1'}
    ent = []
    for k in sorted(KINDS):
        for lod in ('pc', 'low'):
            f = k + ('' if lod == 'pc' else '_low') + '.pack.json'
            fp = os.path.join(out, f)
            if not os.path.exists(fp):
                continue
            pk = json.load(open(fp, encoding='utf-8'))
            ent.append({'file': f, 'kind': k, 'lod': lod, 'tris': pk['tris'], 'bytes': os.path.getsize(fp), 'sourceModel': pk['source']['model'],
                        'sourceTris': pk['source']['tris'], 'clips': sorted(pk.get('clips', {}).keys())})
    man['entries'] = ent
    json.dump(man, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('manifest：%d 件' % len(ent))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True, help='incoming/codex/characters を取り出したフォルダ')
    ap.add_argument('--out', default=os.path.join(ROOT, 'shinshoku', 'assets', 'enemies', 'codex'))
    ap.add_argument('--only', default=None)
    ap.add_argument('--lod', default='pc,low')
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    for k in KINDS:
        if a.only and k not in a.only.split(','):
            continue
        convert(k, a.src, a.out, tuple(a.lod.split(',')))
    update_manifest(a.out)


if __name__ == '__main__':
    main()
