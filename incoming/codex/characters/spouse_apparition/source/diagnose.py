import bpy
from pathlib import Path
p=Path(__file__).resolve().parents[2]/'outputs/spouse_apparition/spouse_apparition.blend';bpy.ops.wm.open_mainfile(filepath=str(p))
r=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
print('RIG',r.matrix_world)
for name in ['J_Bip_L_UpperArm','J_Bip_R_UpperArm','J_Bip_L_LowerArm','J_Bip_R_LowerArm','J_Bip_L_Hand','J_Bip_R_Hand']:
 b=r.pose.bones[name];print(name,'rest head',list(b.bone.head_local),'rest tail',list(b.bone.tail_local),'head',list(b.head),'world',list(r.matrix_world@b.head))
