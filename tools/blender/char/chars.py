# -*- coding: utf-8 -*-
"""キャラクターごとの設定：色・作る順（髪・服・小物）・材質（MToon）・揺れ物の当たり・VRM の meta。"""
import numpy as np

META_BASE = {
    'version': '1.0', 'authors': ['dannoura-game project（tools/blender/char で生成）'],
    'copyrightInformation': '© dannoura-game project. リポジトリの道具 tools/blender/char/build_char.py で作った自作のモデル（外の素材なし）',
    'contactInformation': '', 'references': [],
    'licenseUrl': 'https://vrm.dev/licenses/1.0/', 'avatarPermission': 'onlyAuthor', 'allowExcessivelyViolentUsage': False, 'allowExcessivelySexualUsage': False,
    'commercialUsage': 'corporation', 'allowPoliticalOrReligiousUsage': False, 'allowAntisocialOrHateUsage': False, 'creditNotation': 'unnecessary',
    'allowRedistribution': False, 'modification': 'allowModification',
}

LOOK_DANNOURA = {
    'skin': '#ffe6da', 'blush': 0.22, 'blushColor': '#ffa6b4', 'noseColor': '#e9b3a4', 'crease': '#c98f86', 'lash': '#2a1830', 'lashLow': '#5a3a52',
    'eyeWhite': '#fcf9ff', 'eyeShade': '#cbbfe0', 'irisTop': '#3c1d72', 'irisLow': '#9a62e6', 'irisRing': '#c9a4ff', 'irisGlow': '#d6b8ff', 'irisEdge': '#22103e', 'pupil': '#1a0c30',
    'iris': (0.0068, 0.0083),
    'mouthIn': '#7c2738', 'tongue': '#d9727e', 'teeth': '#fbf7f6', 'mouthLine': '#5a1e2c', 'brow': '#4b2a78',
    'hair': '#6a3fa0', 'hairDark': '#3d2066', 'hairLight': '#9a72d0', 'hairRing': '#c9b2f0',
}
LOOK_WHITE = dict(LOOK_DANNOURA, hair='#f4f1fb', hairDark='#d8d1ec', hairLight='#ffffff', hairRing='#ffffff', brow='#b8aed4', hairShadeTint=(0.80, 0.76, 0.94))
LOOK_COMPANION = dict(LOOK_DANNOURA, skin='#ffe4d4', blush=0.32, irisTop='#3a2414', irisLow='#a8703c', irisRing='#e0b080', irisGlow='#f0c890', irisEdge='#24140a', pupil='#1a0e06',
                      eyeShade='#d6c8c0', lash='#24160e', lashLow='#5a4234', brow='#5a3a26', hair='#5a3826', hairDark='#3a2216', hairLight='#8a5a3c', hairRing='#d8b090', iris=(0.0062, 0.0078))

LOOK_DAUGHTER = dict(LOOK_COMPANION, skin='#ffe8dc', blush=0.42, blushColor='#ff9ab4', irisTop='#3a2414', irisLow='#b07a48', irisRing='#f0c898', irisGlow='#f8d8a8', irisEdge='#24140a',
                     pupil='#1a0e06', lash='#2a1810', lashLow='#6a4a3a', brow='#4a3226', hair='#3a2a22', hairDark='#241812', hairLight='#6a4e3e', hairRing='#c8a088', iris=(0.0078, 0.0094),
                     hairShadeTint=(0.66, 0.6, 0.8))

CHARS = {
    'dannoura': dict(body='male_slim', face='male', look=LOOK_DANNOURA, height=1.64, headScale=1.055,
                     meta=dict(META_BASE, name='だんのうら（Dannoura）', version='1.0'),
                     steps=[dict(kind='hair', module='styles', fn='hair_dannoura'), dict(kind='outfit', module='outfits', fn='outfit_dannoura'), dict(kind='acc', module='props', fn='acc_dannoura')]),
    'dannoura_white': dict(body='male_slim', face='male', look=LOOK_WHITE, height=1.64, headScale=1.055, lowRatio=0.32,
                           meta=dict(META_BASE, name='だんのうら・白い姿（Dannoura, true form）', version='1.0'),
                           steps=[dict(kind='hair', module='styles', fn='hair_white'), dict(kind='outfit', module='outfits', fn='outfit_white'), dict(kind='acc', module='props', fn='acc_white')]),
    'companion': dict(body='female', face='female', look=LOOK_COMPANION, height=1.58, headScale=1.08,
                      meta=dict(META_BASE, name='相棒（Companion・仮）', version='1.0'),
                      steps=[dict(kind='hair', module='styles', fn='hair_bob'), dict(kind='outfit', module='outfits', fn='outfit_companion'), dict(kind='acc', module='props', fn='acc_companion')]),
    # P17：娘（4 歳・結末の家の場面だけ。危ない場面には出さない）。大人の寸法（female）で作って全体を scale 倍・頭を headScale 倍（子どもの頭身）
    'daughter': dict(body='female', face='female', look=LOOK_DAUGHTER, height=1.0, headScale=1.62, scale=0.585, lowRatio=0.45,
                     meta=dict(META_BASE, name='娘（Daughter・4 歳）', version='1.0'),
                     steps=[dict(kind='hair', module='styles', fn='hair_pigtails'), dict(kind='outfit', module='outfits', fn='outfit_daughter'), dict(kind='acc', module='props', fn='acc_daughter')]),
}


def mtoon(shade, shift=0.0, toony=0.92, outline=0.0, ocolor=(0.2, 0.12, 0.2), rim=(0.0, 0.0, 0.0), rim_lift=0.0, gi=0.9):
    m = dict(shadeColorFactor=list(shade), shadingShiftFactor=shift, shadingToonyFactor=toony, giEqualizationFactor=gi,
             parametricRimColorFactor=list(rim), parametricRimFresnelPowerFactor=4.0, parametricRimLiftFactor=rim_lift, rimLightingMixFactor=1.0)
    if outline > 0:
        m.update(outlineWidthMode='worldCoordinates', outlineWidthFactor=outline, outlineColorFactor=list(ocolor), outlineLightingMixFactor=1.0)
    return m


def materials(C, tex):
    """材質の表（名前で部品から引く）"""
    M = []
    M.append(dict(name='FACE_SKIN', texture=tex['face'], alphaMode='MASK', alphaCutoff=0.5, emissive=[0.16, 0.14, 0.15],
                  mtoon=mtoon((0.96, 0.80, 0.82), shift=-0.12, toony=0.9, outline=0.0011, ocolor=(0.38, 0.2, 0.22), rim=(0.18, 0.12, 0.16))))
    M.append(dict(name='FACE_PARTS', texture=tex['face'], alphaMode='MASK', alphaCutoff=0.5, doubleSided=True, emissive=[0.22, 0.22, 0.24],
                  mtoon=mtoon((0.94, 0.9, 0.96), shift=0.35, toony=0.85)))
    if 'hair' in tex:
        M.append(dict(name='HAIR', texture=tex['hair'], shadeTexture=tex.get('hair_shade'), emissive=[0.08, 0.08, 0.09],
                      mtoon=mtoon((1, 1, 1), shift=-0.05, toony=0.88, outline=0.0009, ocolor=C.get('hairOutline', (0.2, 0.1, 0.3)), rim=(0.25, 0.2, 0.35))))
    if 'cloth' in tex:
        M.append(dict(name='CLOTH', texture=tex['cloth'], shadeTexture=tex.get('cloth_shade'), emissive=[0.07, 0.07, 0.08],
                      mtoon=mtoon((1, 1, 1), shift=-0.05, toony=0.9, outline=0.0018, ocolor=(0.14, 0.1, 0.18), rim=(0.18, 0.15, 0.25))))
    if 'acc' in tex:
        M.append(dict(name='ACC', texture=tex['acc'], shadeTexture=tex.get('acc_shade'), emissive=[0.07, 0.07, 0.08],
                      mtoon=mtoon((1, 1, 1), shift=-0.05, toony=0.9, outline=0.0014, ocolor=(0.14, 0.1, 0.18), rim=(0.2, 0.15, 0.25))))
    return [m for m in M if all(v is not None for v in (m.get('texture'),))]


def spring_bones(C, Sk, B, ext, extra=(), hs=1.0, gs=1.0):
    """揺れ物の鎖（ext：髪・服・小物が返した鎖）と体の当たり"""
    J = B['joints']
    head = np.asarray(J['head'], float)                           # 頭の骨（頭の大きさの拡大の中心＝動かない）。全体の縮尺の前の値（gs で掛ける）
    col = []

    def sphere(bone, off, r, k=None):
        k = gs if k is None else k                                 # P17：全体の縮尺（娘）。extra は縮尺ずみ（k=1）
        col.append({'bone': bone, 'sphere': {'offset': [float(x) * k for x in off], 'radius': float(r) * k}})
        return len(col) - 1

    def capsule(bone, off, tail, r, k=None, kt=None):
        k = gs if k is None else k
        kt = k if kt is None else kt
        col.append({'bone': bone, 'capsule': {'offset': [float(x) * k for x in off], 'radius': float(r) * k, 'tail': [float(x) * kt for x in tail]}})
        return len(col) - 1
    ey = J['leftEye'][1]
    g_head = [sphere('head', (0, (ey - head[1] + 0.03) * hs, -0.012 * hs), 0.092 * hs), sphere('head', (0, (ey - head[1] - 0.04) * hs, 0.0), 0.07 * hs)]
    g_neck = [capsule('neck', (0, 0, 0), (0, 0.06, 0), 0.055)]
    uc = Sk.P('upperChest')
    g_body = [capsule('upperChest', (0.07, 0.06, -0.03), (-0.07, 0.06, -0.03), 0.10), capsule('chest', (0, -0.02, -0.02), (0, 0.08, -0.02), 0.115),
              capsule('spine', (0, -0.04, -0.01), (0, 0.06, -0.01), 0.11), sphere('hips', (0, -0.02, -0.02), 0.13)]
    g_arm = []
    for s in ('left', 'right'):
        a, e = Sk.P(s + 'UpperArm'), Sk.P(s + 'LowerArm')
        g_arm.append(capsule(s + 'UpperArm', (0, 0, 0), e - a, 0.05, kt=1.0))
    g_leg = []
    for s in ('left', 'right'):
        a, k = Sk.P(s + 'UpperLeg'), Sk.P(s + 'LowerLeg')
        g_leg.append(capsule(s + 'UpperLeg', (0, 0, 0), k - a, 0.075, kt=1.0))
    groups = [{'name': 'head', 'colliders': g_head}, {'name': 'neck', 'colliders': g_neck}, {'name': 'body', 'colliders': g_body}, {'name': 'arms', 'colliders': g_arm}, {'name': 'legs', 'colliders': g_leg}]
    for e in extra:
        i = capsule(e['bone'], e['capsule']['offset'], e['capsule']['tail'], e['capsule']['radius'], k=1.0) if 'capsule' in e else sphere(e['bone'], e['sphere']['offset'], e['sphere']['radius'], k=1.0)
        g = next((g for g in groups if g['name'] == e['group']), None)
        if g is None:
            g = {'name': e['group'], 'colliders': []}
            groups.append(g)
        g['colliders'].append(i)
    gi = {g['name']: i for i, g in enumerate(groups)}
    springs = []
    for e in ext:
        js = []
        for k, b in enumerate(e['bones']):
            js.append({'bone': b, 'hitRadius': e.get('radius', 0.02) * gs, 'stiffness': e.get('stiffness', 1.0), 'gravityPower': e.get('gravity', 0.2),
                       'gravityDir': [0, -1, 0], 'dragForce': e.get('drag', 0.4)})
        springs.append({'name': e['name'], 'joints': js, 'colliderGroups': [gi[g] for g in e.get('colliders', ['head', 'neck', 'body']) if g in gi]})
    return {'colliders': col, 'colliderGroups': groups, 'springs': springs}
