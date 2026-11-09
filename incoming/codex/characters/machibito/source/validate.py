import bpy,sys,os,math,json,struct
sys.path.insert(0,os.path.dirname(__file__));import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);sc=bpy.context.scene
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'machibito.blend'));sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Studio floor'):bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'machibito.glb'));studio.neutral()
arm=next(o for o in sc.objects if o.type=='ARMATURE');meshes=[o for o in sc.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
report={'reimport_ok':True,'bones':len(arm.data.bones),'finite_vertices':all(all(math.isfinite(c) for c in v.co) for o in meshes for v in o.data.vertices),'unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices),'max_weight_sum_error':max(abs(sum(g.weight for g in v.groups)-1) for o in meshes for v in o.data.vertices),'cast_engine_tested':False,'root_motion':False,'clock_time_driven':False}
with open(os.path.join(OUT,'machibito.glb'),'rb') as f:
    magic,version,total=struct.unpack('<III',f.read(12));size,kind=struct.unpack('<II',f.read(8));data=json.loads(f.read(size))
assert magic==0x46546c67 and version==2 and total==os.path.getsize(os.path.join(OUT,'machibito.glb'))
report['glb_animations']=[a['name'] for a in data['animations']];report['embedded_images']=all('bufferView' in i for i in data.get('images',[]));report['normal_mapped_materials']=sum('normalTexture' in m for m in data['materials'])
assert report['finite_vertices'] and report['unweighted_vertices']==0 and report['max_weight_sum_error']<.001 and report['embedded_images'] and report['normal_mapped_materials']>=5
assert set(report['glb_animations'])=={'idle','wait','check_watch','look_around'}
def evaluated():
    result=[];dg=bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        ev=o.evaluated_get(dg);me=ev.to_mesh();result.extend([ev.matrix_world@v.co for v in me.vertices]);ev.to_mesh_clear()
    return result
base=evaluated();sc.cycles.samples=24
if '--watch-only' not in sys.argv:studio.render(os.path.join(OUT,'glb_preview.png'),'three_quarter')
sc.render.resolution_x=900;sc.render.resolution_y=900;sc.cycles.samples=24;report['animation_displacement_m']={};report['minimum_vertex_z_m']={}
for name in ['idle','wait','check_watch','look_around']:
    studio.neutral();act=bpy.data.actions.get(name);assert act;arm.animation_data.action=act
    if act.slots:arm.animation_data.action_slot=act.slots[0]
    sc.frame_set(30 if name=='idle' else 60);bpy.context.view_layer.update();vertices=evaluated();d=max((p-q).length for p,q in zip(base,vertices));report['animation_displacement_m'][name]=d
    assert d>(.001 if name=='idle' else .06);report['minimum_vertex_z_m'][name]=min(p.z for p in vertices);assert report['minimum_vertex_z_m'][name]>-.01
    if '--watch-only' not in sys.argv or name=='check_watch':studio.render(os.path.join(OUT,name+'.png'),'gesture')
    if name=='check_watch':studio.render(os.path.join(OUT,'watch_pose_detail.png'),'face')
studio.neutral();json.dump(report,open(os.path.join(OUT,'validation.json'),'w'),indent=2);print('VERIFIED',json.dumps(report),flush=True)
