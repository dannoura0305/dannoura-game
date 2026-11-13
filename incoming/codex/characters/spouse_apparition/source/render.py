import bpy,sys,math
from mathutils import Vector,Quaternion,Matrix
from pathlib import Path
W=Path(__file__).resolve().parent;OUT=W.parents[1]/'outputs/spouse_apparition'
sys.path.insert(0,str(W.parent/'researcher'));import studio
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/'spouse_apparition.glb'))
sc=bpy.context.scene;rig=next(o for o in sc.objects if o.type=='ARMATURE');update=bpy.context.view_layer.update
face=next(o for o in sc.objects if o.type=='MESH' and o.data.shape_keys)
pb=rig.pose.bones
def setdir(bone,child,vec):
 update();m=bone.matrix.copy();current=(child.head-bone.head).normalized()
 rot=current.rotation_difference(Vector(vec).normalized());m3=rot.to_matrix()@m.to_3x3()
 n=m3.to_4x4();n.translation=m.translation;bone.matrix=n;update()
def orient_world(bone,axis,angle):
 m=bone.matrix.copy();n=(Quaternion(axis,math.radians(angle)).to_matrix()@m.to_3x3()).to_4x4();n.translation=m.translation;bone.matrix=n;update()
def neutral():
 for b in pb:b.matrix_basis=Matrix.Identity(4)
 update()
def pose(turn=0,breath=0):
 neutral()
 for sign,side in ((1,'L'),(-1,'R')):
  pre='J_Bip_'+side+'_';up,lo,hand=[pb[pre+k] for k in ('UpperArm','LowerArm','Hand')]
  shoulder=up.head.copy();l1=(lo.head-up.head).length;l2=(hand.head-lo.head).length
  wrist=Vector((.066 if sign>0 else -.022,-.147 if sign>0 else -.182,.951 if sign>0 else .970))
  line=wrist-shoulder;dist=line.length;direction=line.normalized();pole=Vector((sign*.28,-.064,1.04))-shoulder;pole=(pole-direction*pole.dot(direction)).normalized()
  along=(l1*l1-l2*l2+dist*dist)/(2*dist);elbow=shoulder+direction*along+pole*math.sqrt(max(0,l1*l1-along*along))
  setdir(up,lo,elbow-shoulder);setdir(lo,hand,wrist-elbow)
  xd=Vector((-.26,-.13,-.96) if sign>0 else (.86,.18,-.48)).normalized()*sign
  front=Vector((0,-.94,.28));zd=(front-xd*front.dot(xd)).normalized();yd=zd.cross(xd)
  world_rot=Matrix((xd,yd,zd)).transposed()
  final=(world_rot@hand.bone.matrix_local.to_3x3()).to_4x4();final.translation=hand.head;hand.matrix=final;update()
  for digit in ('Index','Middle','Ring','Little'):
   for i in (1,2,3):
    b=pb.get(pre+digit+str(i))
    if b:
     axis=b.bone.matrix_local.to_3x3().inverted()@Vector((0,sign,0))
     b.rotation_quaternion=Quaternion(axis,math.radians(9 if i==1 else 13))
 orient_world(pb['J_Bip_C_Neck'],(0,1,0),13.5)
 orient_world(pb['J_Bip_C_Head'],(0,1,0),-23)
 orient_world(pb['J_Bip_C_Head'],(1,0,0),3.5+breath)
 orient_world(pb['J_Bip_C_Neck'],(0,0,1),turn*.30)
 orient_world(pb['J_Bip_C_Head'],(0,0,1),turn*.70)
 update()
animated=[b for b in pb if any(key in b.name for key in ('_Head','_Neck','_UpperArm','_LowerArm','_Hand','_Index','_Middle','_Ring','_Little'))]
rig.animation_data_create()
for name,frames in [('Wait',[(1,0,0),(32,0,.9),(65,0,0)]),('Look_back',[(1,0,0),(15,-12,-1),(37,-63,-5),(64,-63,-5),(92,0,0)])]:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for frame,turn,breath in frames:
  sc.frame_set(frame);pose(turn,breath)
  for b in animated:
   b.rotation_mode='QUATERNION';b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name)
 action.use_fake_user=True
 rig.animation_data.action=None
sc.frame_start=1;sc.frame_end=65;sc.render.fps=24;rig.animation_data.action=bpy.data.actions['Wait'];sc.frame_set(1);pose()
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in sc.objects:
 if o.type=='MESH':o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(OUT/'spouse_animated.glb'),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_morph=True)
studio.setup();studio.prepare_edit_view();sc.view_settings.view_transform='AgX';sc.cycles.samples=16;sc.cycles.use_denoising=True
world=sc.world.node_tree.nodes['Background'];world.inputs[0].default_value=(.56,.54,.56,1);world.inputs[1].default_value=.70
def camera(loc,target,scale,size):
 cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x,sc.render.resolution_y=size;sc.render.resolution_percentage=100
def shot(name,loc,target,scale,size,floor=False):
 bpy.data.objects['Studio floor'].hide_render=not floor;camera(loc,target,scale,size)
 sc.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True);print('VIEW',name,flush=True)
camera((.32,-4,1.01),(0,0,.81),1.79,(660,900))
for scr in bpy.data.screens:
 for ar in scr.areas:
  if ar.type=='VIEW_3D':
   space=ar.spaces.active;space.region_3d.view_location=(0,0,.85);space.region_3d.view_distance=2.45;space.region_3d.view_rotation=sc.camera.rotation_euler.to_quaternion();space.overlay.show_overlays=False;space.shading.type='MATERIAL'
sc.render.film_transparent=False;bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'spouse_apparition.blend'))
shot('front',(0,-4,1.00),(0,0,.81),1.77,(600,875),True)
shot('face',(.24,-3,1.50),(.007,0,1.482),.355,(690,775))
shot('side',(3.5,-.06,.92),(0,0,.81),1.77,(600,875),True)
shot('back',(.01,4,.98),(0,0,.81),1.77,(600,875),True)
shot('watch',(.18,-2.4,1.35),(.04,-.16,.953),.25,(620,480))
rig.animation_data.action=bpy.data.actions['Look_back'];sc.frame_set(38)
shot('turn',(.30,-3,1.3),(0,0,1.30),.81,(550,660))
print('DONE')
