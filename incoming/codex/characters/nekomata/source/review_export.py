import bpy,os,sys,json,math
from mathutils import Vector
out=os.path.abspath(sys.argv[sys.argv.index('--')+1]);S=5.7
bpy.ops.wm.open_mainfile(filepath=os.path.join(out,'nekomata_sculpt.blend'))
sc=bpy.context.scene;cam=sc.camera
def camera(loc,target,scale):
    cam.location=Vector(loc)*S;cam.rotation_euler=(Vector(target)*S-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale*S
if '--face-revision' in sys.argv:
    camera((0,-5,1.385),(0,-.65,1.385),.72)
    sc.render.filepath=os.path.join(out,'face_front.png');bpy.ops.render.render(write_still=True)
    camera((5,-.65,1.385),(0,-.65,1.385),.80)
    sc.render.filepath=os.path.join(out,'face_profile.png');bpy.ops.render.render(write_still=True)
camera((4,-6,2.30),(0,0,1.11),2.80)
for o in list(sc.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)):bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(out,'nekomata_light.glb'))
arm=next(o for o in sc.objects if o.type=='ARMATURE')
if arm.animation_data:
    arm.animation_data.action=None
    for tr in arm.animation_data.nla_tracks:tr.mute=True
for p in arm.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
meshes=[o for o in sc.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
bpy.context.view_layer.update()
sc.render.filepath=os.path.join(out,'light_reimport.png');bpy.ops.render.render(write_still=True)
camera((1.8,-5,1.8),(0,-.65,1.36),.94)
def eval_sample():
    dg=bpy.context.evaluated_depsgraph_get();result=[]
    for o in meshes:
        ev=o.evaluated_get(dg);me=ev.to_mesh()
        result.append([ev.matrix_world@v.co for v in me.vertices]);ev.to_mesh_clear()
    return result
neutral=eval_sample()
for o in meshes:
    if o.data.shape_keys and 'blink' in o.data.shape_keys.key_blocks:o.data.shape_keys.key_blocks['blink'].value=1
bpy.context.view_layer.update();blink=eval_sample()
blink_change=max((p-q).length for a,b in zip(neutral,blink) for p,q in zip(a,b))
sc.render.filepath=os.path.join(out,'blink_check.png');bpy.ops.render.render(write_still=True)
for o in meshes:
    if o.data.shape_keys:
        for kb in o.data.shape_keys.key_blocks:kb.value=0
arm.pose.bones['jaw'].rotation_euler.x=math.radians(15)
bpy.context.view_layer.update();jaw=eval_sample()
jaw_change=max((p-q).length for a,b in zip(neutral,jaw) for p,q in zip(a,b))
sc.render.filepath=os.path.join(out,'jaw_check.png');bpy.ops.render.render(write_still=True)
report={'light_reimport_ok':True,'blink_max_vertex_change_m':blink_change,'jaw_max_vertex_change_m':jaw_change,
        'light_vertices':sum(len(o.data.vertices) for o in meshes),'light_unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices),
        'cast_engine_tested':False}
assert blink_change>.001 and jaw_change>.001 and report['light_unweighted_vertices']==0
json.dump(report,open(os.path.join(out,'deformation_validation.json'),'w'),indent=2)
print('DEFORMATION_VALIDATED',json.dumps(report),flush=True)
