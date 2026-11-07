# -*- coding: utf-8 -*-
"""VRM の人型の骨にポーズを付ける・関節の位置を読む（高精度 3D 制作 Phase 4・シルエット比較）

  ポーズ（pose.json の "bones"）は {VRM の人型の骨の名前: [x, y, z]（度）}。
  回す軸はモデル全体の軸（X＝モデルの左、Y＝後ろ、Z＝上）を、その骨の休みの姿勢の位置へ持っていったもの。
  例: right_upper_arm の y を -60 にすると、T ポーズの右腕が下へ 60 度さがる。
  骨の名前は VRM アドオンの人型の割り当てから引く（無ければ VRoid の J_Bip_* の名前）。
  vrm_pose_fit.py（原画の関節へ合わせる）と vrm_compare_render.py（ポーズを付けて撮る）が使う。
"""
from mathutils import Euler, Matrix

VROID = {
    'hips': 'J_Bip_C_Hips', 'spine': 'J_Bip_C_Spine', 'chest': 'J_Bip_C_Chest', 'upper_chest': 'J_Bip_C_UpperChest',
    'neck': 'J_Bip_C_Neck', 'head': 'J_Bip_C_Head', 'left_eye': 'J_Adj_L_FaceEye', 'right_eye': 'J_Adj_R_FaceEye',
}
for _s, _c in (('left', 'L'), ('right', 'R')):
    for _k, _b in (('shoulder', 'Shoulder'), ('upper_arm', 'UpperArm'), ('lower_arm', 'LowerArm'), ('hand', 'Hand'),
                   ('upper_leg', 'UpperLeg'), ('lower_leg', 'LowerLeg'), ('foot', 'Foot')):
        VROID['%s_%s' % (_s, _k)] = 'J_Bip_%s_%s' % (_c, _b)

# 原画の関節（OpenPose の名前）→ モデルの骨の付け根。neck は左右の肩の真ん中（OpenPose の首は肩の線の上にある）
JOINTS = {
    'R_shoulder': 'right_upper_arm', 'R_elbow': 'right_lower_arm', 'R_wrist': 'right_hand',
    'L_shoulder': 'left_upper_arm', 'L_elbow': 'left_lower_arm', 'L_wrist': 'left_hand',
    'R_hip': 'right_upper_leg', 'R_knee': 'right_lower_leg', 'R_ankle': 'right_foot',
    'L_hip': 'left_upper_leg', 'L_knee': 'left_lower_leg', 'L_ankle': 'left_foot',
    'R_eye': 'right_eye', 'L_eye': 'left_eye',
}


def armature(scene_objects):
    arms = [o for o in scene_objects if o.type == 'ARMATURE']
    if not arms:
        raise RuntimeError('骨（Armature）が無い')
    return max(arms, key=lambda o: len(o.data.bones))


def humanoid(arm):
    """VRM の人型の骨の名前 → Blender の骨の名前"""
    out = {}
    try:
        hb = arm.data.vrm_addon_extension.vrm1.humanoid.human_bones
        for k in VROID:
            b = getattr(hb, k, None)
            if b is not None and b.node.bone_name in arm.data.bones:
                out[k] = b.node.bone_name
    except AttributeError:
        pass
    for k, v in VROID.items():
        if k not in out and v in arm.data.bones:
            out[k] = v
    return out


def basis(bone, deg):
    """全体の軸で表した回転 → その骨の matrix_basis（骨の休みの向きへ移した回転）"""
    r = bone.matrix_local.to_3x3()
    d = Euler([v * 0.017453292519943295 for v in deg], 'XYZ').to_matrix()
    return (r.inverted() @ d @ r).to_4x4()


def apply_pose(arm, pose_bones_deg, hmap=None):
    hmap = hmap or humanoid(arm)
    clear_pose(arm)
    for k, deg in pose_bones_deg.items():
        if k not in hmap:
            continue
        pb = arm.pose.bones[hmap[k]]
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = basis(pb.bone, deg).to_quaternion()
    import bpy
    bpy.context.view_layer.update()


def clear_pose(arm):
    for pb in arm.pose.bones:
        pb.matrix_basis = Matrix.Identity(4)
    import bpy
    bpy.context.view_layer.update()


def joints_world(arm, hmap=None):
    """いまのポーズでの関節の位置（世界座標）。neck は左右の肩の真ん中"""
    hmap = hmap or humanoid(arm)
    mw = arm.matrix_world
    out = {}
    for j, k in JOINTS.items():
        if k in hmap:
            out[j] = mw @ arm.pose.bones[hmap[k]].head
    if 'R_shoulder' in out and 'L_shoulder' in out:
        out['neck'] = (out['R_shoulder'] + out['L_shoulder']) / 2
    return out
