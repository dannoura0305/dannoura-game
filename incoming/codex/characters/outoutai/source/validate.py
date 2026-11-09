import bpy,sys,os,math,json,struct
sys.path.insert(0,os.path.dirname(__file__));import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'outoutai.blend'));sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Studio floor'):bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'outoutai.glb'));studio.neutral()
arm=next(o for o in sc.objects if o.type=='ARMATURE');meshes=[o for o in sc.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
report={'reimport_ok':True,'bones':len(arm.data.bones),'finite_vertices':all(all(math.isfinite(c) for c in v.co) for o in meshes for v in o.data.vertices),'unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices),'max_weight_sum_error':max(abs(sum(g.weight for g in v.groups)-1) for o in meshes for v in o.data.vertices),'cast_engine_tested':False,'root_motion':False,'terminal_interaction_implemented':False,'light_state_driven':False}
with open(os.path.join(OUT,'outoutai.glb'),'rb') as f:
    magic,version,total=struct.unpack('<III',f.read(12));size,kind=struct.unpack('<II',f.read(8));data=json.loads(f.read(size))
assert magic==0x46546c67 and version==2 and total==os.path.getsize(os.path.join(OUT,'outoutai.glb'))
report['glb_animations']=[a['name'] for a in data['animations']]
report['transparent_materials']=[m['name'] for m in data['materials'] if m.get('alphaMode')=='BLEND']
report['transmission_materials']=[m['name'] for m in data['materials'] if m.get('extensions',{}).get('KHR_materials_transmission',{}).get('transmissionFactor',0)>0]
report['emissive_materials']=[m['name'] for m in data['materials'] if max(m.get('emissiveFactor',[0]))>0]
assert report['finite_vertices'] and report['unweighted_vertices']==0 and report['max_weight_sum_error']<.001
assert report['transparent_materials'] and report['transmission_materials'] and report['emissive_materials']
assert set(report['glb_animations'])=={'idle','standby','respond','acknowledge'}
def evaluated():
    result=[];dg=bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        ev=o.evaluated_get(dg);me=ev.to_mesh();result.extend([ev.matrix_world@v.co for v in me.vertices]);ev.to_mesh_clear()
    return result
base=evaluated();sc.cycles.samples=24
if '--animations-only' not in sys.argv:studio.render(os.path.join(OUT,'glb_preview.png'),'three_quarter')
sc.render.resolution_x=900;sc.render.resolution_y=900;sc.cycles.samples=24;report['animation_displacement_m']={}
for name in ['idle','standby','respond','acknowledge']:
    studio.neutral();act=bpy.data.actions.get(name);assert act;arm.animation_data.action=act
    if act.slots:arm.animation_data.action_slot=act.slots[0]
    sc.frame_set(30 if name=='idle' else 60);bpy.context.view_layer.update();vertices=evaluated();d=max((p-q).length for p,q in zip(base,vertices));report['animation_displacement_m'][name]=d
    assert d>(.001 if name=='idle' else .025)
    if name=='respond':
        wrist=arm.matrix_world@arm.pose.bones['handR'].head;report['respond_wrist_m']=list(wrist);assert wrist.y<-.45 and wrist.z>1.3
    studio.render(os.path.join(OUT,name+'.png'),'gesture')
studio.neutral();json.dump(report,open(os.path.join(OUT,'validation.json'),'w'),indent=2);print('VERIFIED',json.dumps(report),flush=True)
