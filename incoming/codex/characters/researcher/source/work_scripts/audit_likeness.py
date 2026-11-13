import sys,bpy
from pathlib import Path
folder=Path(sys.argv[sys.argv.index('--')+1])/'blender_refined'
bpy.ops.wm.open_mainfile(filepath=str(folder/'researcher_refined.blend'))
sc=bpy.context.scene
rig=next(o for o in sc.objects if o.type=='ARMATURE')
meshes=[o for o in sc.objects if o.type=='MESH' and o.find_armature()==rig]
assert len(meshes)==3 and len(rig.data.bones)>=54
face=next(o for o in meshes if o.data.shape_keys)
keys=face.data.shape_keys.key_blocks
assert len(keys)==58 and keys['Fcl_EYE_Close'].value==0 if 'Fcl_EYE_Close' in keys else len(keys)==58
for im in bpy.data.images:
 if im.source=='FILE' and im.users:assert im.packed_file,im.name
print('SAVED SCENE',len(meshes),'skinned meshes',len(rig.data.bones),'bones',len(keys)-1,'shapes',sum(bool(im.packed_file) for im in bpy.data.images),'packed images',sc.camera.name)
