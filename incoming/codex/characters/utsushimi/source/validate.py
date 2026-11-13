import bpy,sys,os,math,json,struct
sys.path.insert(0,os.path.dirname(__file__));import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'utsushimi.blend'));sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Studio floor'):bpy.data.objects.remove(o,do_unlink=True)
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'utsushimi.glb'));studio.neutral()
arm=next(o for o in sc.objects if o.type=='ARMATURE');meshes=[o for o in sc.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
report={'reimport_ok':True,'bones':len(arm.data.bones),'finite_vertices':all(all(math.isfinite(c) for c in v.co) for o in meshes for v in o.data.vertices),'unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices),'max_weight_sum_error':max(abs(sum(g.weight for g in v.groups)-1) for o in meshes for v in o.data.vertices),'cast_engine_tested':False,'combat_logic_implemented':False,'human_form_included':False,'root_motion':False}
with open(os.path.join(OUT,'utsushimi.glb'),'rb') as f:
    magic,version,total=struct.unpack('<III',f.read(12));size,kind=struct.unpack('<II',f.read(8));data=json.loads(f.read(size))
assert magic==0x46546c67 and version==2 and total==os.path.getsize(os.path.join(OUT,'utsushimi.glb'))
report['glb_animations']=[a['name'] for a in data['animations']];report['embedded_images']=len(data.get('images',[]));assert all('bufferView' in i for i in data['images'])
report['patterned_materials']=[m['name'] for m in data['materials'] if any(w in m['name'] for w in ['stripes','trousers']) and 'baseColorTexture' in m.get('pbrMetallicRoughness',{})]
assert report['finite_vertices'] and report['unweighted_vertices']==0 and report['max_weight_sum_error']<.001
assert len(report['patterned_materials'])==2 and report['bones']==31
assert set(report['glb_animations'])=={'idle','mimic_pose','reaching_lunge','head_tilt'}
def evaluated():
    result=[];dg=bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        ev=o.evaluated_get(dg);me=ev.to_mesh();result.extend([ev.matrix_world@v.co for v in me.vertices]);ev.to_mesh_clear()
    return result
base=evaluated();report['height_m']=max(p.z for p in base)-min(p.z for p in base);report['ground_clearance_m']=min(p.z for p in base)
assert 3.1<report['height_m']<3.4 and abs(report['ground_clearance_m'])<.005
sc.cycles.samples=24;studio.render(os.path.join(OUT,'glb_preview.png'),'three_quarter');studio.render(os.path.join(OUT,'glb_face.png'),'face');report['animation_displacement_m']={};report['loop_error_m']={};report['rest_start_error_m']={}
for name in ['idle','mimic_pose','reaching_lunge','head_tilt']:
    studio.neutral();act=bpy.data.actions.get(name);assert act;arm.animation_data.action=act
    if act.slots:arm.animation_data.action_slot=act.slots[0]
    sc.frame_set(30 if name=='idle' else 60);bpy.context.view_layer.update();vertices=evaluated();d=max((p-q).length for p,q in zip(base,vertices));report['animation_displacement_m'][name]=d
    assert d>(.001 if name=='idle' else .02)
    assert all(all(math.isfinite(v) for v in p) for p in vertices)
    if name in ['mimic_pose','reaching_lunge']:
        gap=max((arm.pose.bones['upperArm'+s].tail-arm.pose.bones['foreArm'+s].head).length for s in ['L','R']);assert gap<.001
        report[name+'_hand_joint_gap_m']=max((arm.pose.bones['foreArm'+s].tail-arm.pose.bones['hand'+s].head).length for s in ['L','R']);assert report[name+'_hand_joint_gap_m']<.001
        report[name+'_minimum_z']=min(p.z for p in vertices);assert min(p.z for p in vertices)>-.015
    studio.render(os.path.join(OUT,name+'.png'),'gesture')
    sc.frame_set(0);start=evaluated();sc.frame_set(120);end=evaluated();report['loop_error_m'][name]=max((a-b).length for a,b in zip(start,end));report['rest_start_error_m'][name]=max((a-b).length for a,b in zip(base,start));assert report['loop_error_m'][name]<.001
studio.neutral();json.dump(report,open(os.path.join(OUT,'validation.json'),'w'),indent=2);print('VERIFIED',json.dumps(report),flush=True)
