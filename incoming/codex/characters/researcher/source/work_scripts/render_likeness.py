import bpy,sys,math,json
from pathlib import Path
from mathutils import Vector,Quaternion
W=Path(__file__).resolve().parent;sys.path.insert(0,str(W));import studio
out=Path(sys.argv[sys.argv.index('--')+1])/'blender_refined'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(out/'researcher_refined.glb'))
sc=bpy.context.scene
arm=next(o for o in sc.objects if o.type=='ARMATURE')
meshes=[o for o in sc.objects if o.type=='MESH' and o.find_armature()]
print('BONES',[p.name for p in arm.pose.bones if 'Arm' in p.name],flush=True)
print('MESHES',[(o.name,len(o.data.vertices),len(o.data.shape_keys.key_blocks) if o.data.shape_keys else 0) for o in meshes],flush=True)
for o in meshes:
 if o.data.shape_keys and len(o.data.shape_keys.key_blocks)>10:face=o
def pose():
 for side,sign in [('L',1),('R',-1)]:
  upper=next(b for b in arm.pose.bones if ('_'+side+'_UpperArm').lower() in b.name.lower())
  if upper.head.x<0:sign=-1
  else:sign=1
  for bone,ax,angle in [(upper,(0,1,0),sign*75)]:
   axis=bone.bone.matrix_local.to_3x3().inverted()@Vector(ax);bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion(axis,math.radians(angle))
  hand=next((b for b in arm.pose.bones if b.name=='J_Bip_'+side+'_Hand'),None)
  if hand:
   hand.rotation_mode='QUATERNION';hand.rotation_quaternion=Quaternion((0,1,0),math.radians(sign*19))
 bpy.context.view_layer.update()
pose()
studio.setup()
# Soft, lit grey backdrop and grounded full-body shadow.
world=sc.world.node_tree.nodes['Background'];world.inputs[0].default_value=(.50,.50,.52,1);world.inputs[1].default_value=.65
sc.view_settings.view_transform='AgX';sc.cycles.samples=16;sc.cycles.use_denoising=True
def config(loc,target,scale,size):
 cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x,sc.render.resolution_y=size;sc.render.resolution_percentage=100
def render(name,loc,target,scale,size):
 bpy.data.objects['Studio floor'].hide_render=name!='full';config(loc,target,scale,size);sc.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True);print('RENDERED',name,flush=True)
def shape_close():
 keys=face.data.shape_keys.key_blocks
 ns=[k for k in keys if 'close' in k.name.lower()];print('EYES',[(k.name) for k in ns],flush=True)
 return next((k for k in ns if k.name.lower().endswith('_close')),None)
sc.render.film_transparent=False;studio.prepare_edit_view()
config((.87,-4.2,1.57),(0,0,1.58),.45,(800,810))
for scr in bpy.data.screens:
 for ar in scr.areas:
  if ar.type=='VIEW_3D':
   v=ar.spaces.active;v.region_3d.view_location=(0,0,1.15);v.region_3d.view_distance=2.65;v.region_3d.view_rotation=sc.camera.rotation_euler.to_quaternion()
   v.overlay.show_overlays=False;v.shading.type='MATERIAL'
bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(out/'researcher_refined.blend'))
render('portrait',(0,-4.5,1.62),(0,-.005,1.607),.36,(780,830))
render('three_quarter',(.95,-1.7,1.63),(0,-.005,1.604),.36,(730,810))
render('profile',(4,-.012,1.61),(0,0,1.60),.36,(730,810))
render('full',(.42,-4,1.11),(0,0,.88),1.95,(680,940))
k=shape_close()
if k:
 k.value=1.;bpy.context.view_layer.update();render('blink',(0,-4,1.62),(0,0,1.601),.32,(500,510));k.value=0
print('DONE',flush=True)
