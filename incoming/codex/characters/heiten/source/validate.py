import bpy,os,sys,json,math,struct
sys.path.insert(0,os.path.dirname(__file__))
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'heiten.blend'));sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Studio floor'):bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'heiten.glb'));studio.neutral()
arm=next(o for o in sc.objects if o.type=='ARMATURE')
meshes=[o for o in sc.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
report={'reimport_ok':True,'bones':len(arm.data.bones),'actions':[a.name for a in bpy.data.actions],
 'finite_vertices':all(all(math.isfinite(c) for c in v.co) for o in meshes for v in o.data.vertices),
 'unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices),
 'max_weight_sum_error':max(abs(sum(g.weight for g in v.groups)-1) for o in meshes for v in o.data.vertices),
 'cast_engine_tested':False,'door_interaction_implemented':False}
with open(os.path.join(OUT,'heiten.glb'),'rb') as f:
    magic,version,total=struct.unpack('<III',f.read(12));size,kind=struct.unpack('<II',f.read(8));data=json.loads(f.read(size))
assert magic==0x46546c67 and version==2 and total==os.path.getsize(os.path.join(OUT,'heiten.glb'))
report['glb_animations']=[a.get('name') for a in data.get('animations',[])]
report['embedded_images']=all('bufferView' in i for i in data.get('images',[]))
assert all(any(n in a for a in report['glb_animations']) for n in ['idle','closing_gesture'])
assert report['finite_vertices'] and report['unweighted_vertices']==0 and report['max_weight_sum_error']<.001 and report['embedded_images']
report['shutter_closed_displacement_m']=max((p.co-q.co).length for o in meshes if o.data.shape_keys for p,q in zip(o.data.shape_keys.key_blocks['shutter_closed'].data,o.data.shape_keys.key_blocks[0].data))
assert report['shutter_closed_displacement_m']>.01
sc.cycles.samples=24
if '--animations-only' not in sys.argv:
    studio.render(os.path.join(OUT,'glb_preview.png'),'three_quarter')
    studio.render(os.path.join(OUT,'apron.png'),'apron')
def evaluated():
    result=[];dg=bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        ev=o.evaluated_get(dg);me=ev.to_mesh();result.extend([ev.matrix_world@v.co for v in me.vertices]);ev.to_mesh_clear()
    return result
base=evaluated();report['animation_displacement_m']={}
for name in ['idle','closing_gesture']:
    act=next(a for a in bpy.data.actions if a.name==name)
    arm.animation_data.action=act
    if act.slots:arm.animation_data.action_slot=act.slots[0]
    for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0)
    sc.frame_set(30);bpy.context.view_layer.update()
    d=max((a-b).length for a,b in zip(base,evaluated()));report['animation_displacement_m'][name]=d
    assert d>(.001 if name=='idle' else .3)
sc.render.resolution_x=750;sc.render.resolution_y=750;sc.cycles.samples=20
for f in (0,30,90):
    sc.frame_set(f);bpy.context.view_layer.update();studio.render(os.path.join(OUT,'gesture_%02d.png'%f),'gesture')
studio.neutral()
for o in meshes:
    if o.data.shape_keys:o.data.shape_keys.key_blocks['shutter_closed'].value=1
bpy.context.view_layer.update()
if '--animations-only' not in sys.argv:studio.render(os.path.join(OUT,'shutter_closed.png'),'face')
json.dump(report,open(os.path.join(OUT,'validation.json'),'w'),indent=2)
print('VERIFIED',json.dumps(report),flush=True)
