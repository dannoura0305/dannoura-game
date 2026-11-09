import bpy,sys,os,math,json,struct
sys.path.insert(0,os.path.dirname(__file__));import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'sakibure.blend'));sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Studio floor'):bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'sakibure.glb'));studio.neutral()
arm=next(o for o in sc.objects if o.type=='ARMATURE');meshes=[o for o in sc.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
report={'reimport_ok':True,'bones':len(arm.data.bones),'finite_vertices':all(all(math.isfinite(c) for c in v.co) for o in meshes for v in o.data.vertices),'unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices),'max_weight_sum_error':max(abs(sum(g.weight for g in v.groups)-1) for o in meshes for v in o.data.vertices),'cast_engine_tested':False,'combat_logic_implemented':False,'root_motion':False}
with open(os.path.join(OUT,'sakibure.glb'),'rb') as f:
    magic,version,total=struct.unpack('<III',f.read(12));size,kind=struct.unpack('<II',f.read(8));data=json.loads(f.read(size))
assert magic==0x46546c67 and version==2 and total==os.path.getsize(os.path.join(OUT,'sakibure.glb'))
report['glb_animations']=[a['name'] for a in data['animations']]
report['emissive_materials']=[m['name'] for m in data['materials'] if max(m.get('emissiveFactor',[0]))>0]
report['normal_mapped_materials']=[m['name'] for m in data['materials'] if 'normalTexture' in m]
report['embedded_images']=len(data.get('images',[]));assert all('bufferView' in i for i in data['images'])
assert report['finite_vertices'] and report['unweighted_vertices']==0 and report['max_weight_sum_error']<.001
assert report['emissive_materials'] and len(report['normal_mapped_materials'])==5
assert set(report['glb_animations'])=={'idle','sweep','devour','core_pulse'} and report['bones']==23
def evaluated():
    result=[];dg=bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        ev=o.evaluated_get(dg);me=ev.to_mesh();result.extend([ev.matrix_world@v.co for v in me.vertices]);ev.to_mesh_clear()
    return result
base=evaluated();report['height_m']=max(p.z for p in base)-min(p.z for p in base);assert abs(report['height_m']-18)<.01
report['ground_clearance_m']=min(p.z for p in base);assert abs(report['ground_clearance_m'])<.01
feet={n:(arm.matrix_world@arm.pose.bones[n].head).copy() for n in ['foot_frontL','foot_frontR','foot_rearL','foot_rearR']}
sc.cycles.samples=24;studio.render(os.path.join(OUT,'glb_preview.png'),'three_quarter');report['animation_displacement_m']={};report['loop_error_m']={}
for name in ['idle','sweep','devour','core_pulse']:
    studio.neutral();act=bpy.data.actions.get(name);assert act;arm.animation_data.action=act
    if act.slots:arm.animation_data.action_slot=act.slots[0]
    sc.frame_set(30 if name=='idle' else 60);bpy.context.view_layer.update();vertices=evaluated();d=max((p-q).length for p,q in zip(base,vertices));report['animation_displacement_m'][name]=d
    assert d>(.01 if name=='idle' else .1)
    assert all(all(math.isfinite(v) for v in p) for p in vertices)
    if name=='sweep':
        raised=arm.matrix_world@arm.pose.bones['foot_frontR'].head;report['sweep_foot_raise_m']=raised.z-feet['foot_frontR'].z;assert report['sweep_foot_raise_m']>1
        report['support_foot_drift_m']=max(((arm.matrix_world@arm.pose.bones[n].head)-p).length for n,p in feet.items() if n!='foot_frontR');assert report['support_foot_drift_m']<.01
    if name=='devour':
        report['talon_joint_gap_m']=max((arm.pose.bones['talon'+s].head-arm.pose.bones['inner_talon'+s].head).length for s in ['L','R']);assert report['talon_joint_gap_m']<.01
    studio.render(os.path.join(OUT,name+'.png'),'gesture')
    sc.frame_set(0);start=evaluated();sc.frame_set(120);end=evaluated();report['loop_error_m'][name]=max((a-b).length for a,b in zip(start,end));assert report['loop_error_m'][name]<.001
studio.neutral();json.dump(report,open(os.path.join(OUT,'validation.json'),'w'),indent=2);print('VERIFIED',json.dumps(report),flush=True)
