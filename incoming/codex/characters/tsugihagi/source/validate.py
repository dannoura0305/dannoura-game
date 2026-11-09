import bpy,os,sys,json,math,struct
sys.path.insert(0,os.path.dirname(__file__));import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'tsugihagi.blend'));sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Studio floor'):bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'tsugihagi.glb'));studio.neutral()
arm=next(o for o in sc.objects if o.type=='ARMATURE')
meshes=[o for o in sc.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
report={'reimport_ok':True,'bones':len(arm.data.bones),'actions':[a.name for a in bpy.data.actions],
 'finite_vertices':all(all(math.isfinite(c) for c in v.co) for o in meshes for v in o.data.vertices),
 'unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices),
 'max_weight_sum_error':max(abs(sum(g.weight for g in v.groups)-1) for o in meshes for v in o.data.vertices),
 'cast_engine_tested':False,'root_motion':False,'physical_grabbing':False}
with open(os.path.join(OUT,'tsugihagi.glb'),'rb') as f:
    magic,version,total=struct.unpack('<III',f.read(12));size,kind=struct.unpack('<II',f.read(8));data=json.loads(f.read(size))
assert magic==0x46546c67 and version==2 and total==os.path.getsize(os.path.join(OUT,'tsugihagi.glb'))
report['glb_animations']=[a.get('name') for a in data.get('animations',[])]
report['embedded_images']=all('bufferView' in i for i in data.get('images',[]))
report['normal_mapped_materials']=sum('normalTexture' in m for m in data.get('materials',[]))
assert report['normal_mapped_materials']>=3
assert all(any(n==a for a in report['glb_animations']) for n in ['idle','knock','walk_in_place','protect_bag'])
assert report['finite_vertices'] and report['unweighted_vertices']==0 and report['max_weight_sum_error']<.001 and report['embedded_images']
report['blink_displacement_m']=max((p.co-q.co).length for o in meshes if o.data.shape_keys for p,q in zip(o.data.shape_keys.key_blocks['blink'].data,o.data.shape_keys.key_blocks[0].data))
assert report['blink_displacement_m']>.003
sc.cycles.samples=24
if '--animations-only' not in sys.argv:studio.render(os.path.join(OUT,'glb_preview.png'),'three_quarter')
def evaluated():
    result=[];dg=bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        ev=o.evaluated_get(dg);me=ev.to_mesh();result.extend([ev.matrix_world@v.co for v in me.vertices]);ev.to_mesh_clear()
    return result
base=evaluated();report['animation_displacement_m']={}
sc.render.resolution_x=800;sc.render.resolution_y=800;sc.cycles.samples=20
for name in ['idle','knock','walk_in_place','protect_bag']:
    act=next(a for a in bpy.data.actions if a.name==name);arm.animation_data.action=act
    if act.slots:arm.animation_data.action_slot=act.slots[0]
    for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0)
    sc.frame_set(15 if name=='walk_in_place' else 30 if name=='idle' else 60);bpy.context.view_layer.update()
    d=max((a-b).length for a,b in zip(base,evaluated()));report['animation_displacement_m'][name]=d
    assert d>(.001 if name=='idle' else .04)
    studio.render(os.path.join(OUT,name+'.png'),'gesture')
studio.neutral()
walk=next(a for a in bpy.data.actions if a.name=='walk_in_place');arm.animation_data.action=walk
if walk.slots:arm.animation_data.action_slot=walk.slots[0]
foot_minima=[]
for frame in range(0,121,15):
    sc.frame_set(frame);bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();zs=[]
    for o in meshes:
        ids=[v.index for v in o.data.vertices if any(o.vertex_groups[g.group].name.startswith('foot') and g.weight>.99 for g in v.groups)]
        if not ids:continue
        ev=o.evaluated_get(dg);me=ev.to_mesh();zs.extend((ev.matrix_world@me.vertices[i].co).z for i in ids);ev.to_mesh_clear()
    foot_minima.append(min(zs))
report['walk_min_foot_z_m']=min(foot_minima)
assert report['walk_min_foot_z_m']>-.015
studio.neutral()
for o in meshes:
    if o.data.shape_keys:o.data.shape_keys.key_blocks['blink'].value=1
bpy.context.view_layer.update()
if '--animations-only' not in sys.argv:studio.render(os.path.join(OUT,'blink.png'),'face')
json.dump(report,open(os.path.join(OUT,'validation.json'),'w'),indent=2)
print('VERIFIED',json.dumps(report),flush=True)
