import bpy,sys,json,os,struct,math
import numpy as np
from pathlib import Path
from mathutils import Vector
W=Path(__file__).resolve().parent;OUT=Path(sys.argv[sys.argv.index('--')+1]);sys.path.insert(0,str(W));import studio
bpy.ops.wm.open_mainfile(filepath=str(OUT/'researcher.blend'));sc=bpy.context.scene
for o in list(sc.objects):
    if o.type=='ARMATURE' or (o.type=='MESH' and o.name!='Studio floor'):bpy.data.objects.remove(o,do_unlink=True)
for ac in list(bpy.data.actions):bpy.data.actions.remove(ac)
bpy.ops.import_scene.gltf(filepath=str(OUT/'researcher.glb'));arm=next(o for o in sc.objects if o.type=='ARMATURE');meshes=[o for o in sc.objects if o.type=='MESH' and o.parent==arm]
def pose(n=None,f=0):
    studio.neutral()
    if n:
        ac=bpy.data.actions[n];arm.animation_data.action=ac
        if ac.slots:arm.animation_data.action_slot=ac.slots[0]
    sc.frame_set(f);bpy.context.view_layer.update()
def rend(file,view):studio.render(str(OUT/(file+'.png')),view);print('RENDERED',file,flush=True)
def coords(obs):
    arr=[];dg=bpy.context.evaluated_depsgraph_get()
    for o in obs:
        e=o.evaluated_get(dg);me=e.to_mesh();xyz=np.empty(len(me.vertices)*3,dtype=np.float32);me.vertices.foreach_get('co',xyz);m=np.array(e.matrix_world);arr.append(xyz.reshape(-1,3)@m[:3,:3].T+m[:3,3]);e.to_mesh_clear()
    return np.vstack(arr)
def echo():
    ghosts=[]
    for n,(f,dx,dy) in enumerate([(36,.40,.16),(18,.76,.34)]):
        pose('accident_replay',f);dg=bpy.context.evaluated_depsgraph_get()
        ma=bpy.data.materials.new('Violet temporal echo '+str(n+1));ma.use_nodes=True;bs=ma.node_tree.nodes['Principled BSDF'];bs.inputs['Base Color'].default_value=(.34,.22,.48,1);bs.inputs['Alpha'].default_value=.32 if n==0 else .21;bs.inputs['Emission Color'].default_value=(.37,.16,.62,1);bs.inputs['Emission Strength'].default_value=.45;ma.surface_render_method='DITHERED'
        layer=[]
        for o in meshes:
            ev=o.evaluated_get(dg);me=bpy.data.meshes.new_from_object(ev,depsgraph=dg);me.materials.clear();me.materials.append(ma)
            ob=bpy.data.objects.new('Echo study',me);sc.collection.objects.link(ob);ob.matrix_world=ev.matrix_world.copy();ob.location+=Vector((dx,dy,0));layer.append(ob)
        bpy.ops.object.select_all(action='DESELECT')
        for ob in layer:ob.select_set(True)
        bpy.context.view_layer.objects.active=layer[0];bpy.ops.object.join();g=bpy.context.object;g.name='Afterimage '+str(n+1);ghosts.append(g)
    bpy.ops.object.select_all(action='DESELECT')
    for o in ghosts:o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/'replay_afterimages.glb'),export_format='GLB',use_selection=True,export_animations=False)
    pose('accident_replay',60);rend('replay_study','echo')
    for o in ghosts:bpy.data.objects.remove(o,do_unlink=True)
pose();base=coords(meshes)
raw=(OUT/'researcher.glb').read_bytes();lng,typ=struct.unpack_from('<II',raw,12);g=json.loads(raw[20:20+lng]);names=[a['name'] for a in g['animations']]
assert set(names)=={'idle','record_check','accident_replay','neutralized'}
r={'clips':names,'bones':len(arm.data.bones),'height_m':float(np.ptp(base[:,2])),'embedded_images':len(g['images']),'unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices),'weight_error':max(abs(sum(gr.weight for gr in v.groups)-1) for o in meshes for v in o.data.vertices),'poses':{}}
assert 1.73<r['height_m']<1.81 and r['unweighted_vertices']==0 and r['weight_error']<.001 and all('bufferView' in i for i in g['images'])
rend('hero','hero');rend('face','face')
for name in names:
    pose(name,0);start=coords(meshes);pose(name,120);end=coords(meshes);pose(name,30 if name=='idle' else 60);peak=coords(meshes);assert np.isfinite(peak).all()
    dif=lambda a,b:float(np.linalg.norm(a-b,axis=1).max())
    wrist=max((arm.pose.bones['foreArm'+s].tail-arm.pose.bones['hand'+s].head).length for s in ['R','L'])
    mins=[float(peak[:,2].min())]
    if name=='neutralized':
        for f in range(0,121,5):
            pose(name,f);mins.append(float(coords(meshes)[:,2].min()))
        pose(name,60)
    r['poses'][name]={'loop_error_m':dif(start,end),'start_error_m':dif(start,base),'max_displacement_m':dif(base,peak),'minimum_z_m':min(mins),'wrist_gap_m':wrist}
    assert dif(start,end)<.001 and dif(start,base)<.001 and dif(base,peak)>.001 and wrist<.002
    if name=='accident_replay':rend('replay','replay')
    if name=='neutralized':rend('kneeling','kneel')
    if name=='record_check':rend('record_check','hero')
(OUT/'validation.json').write_text(json.dumps(r,indent=2));print('CHECKED',r,flush=True)
pose()
for v in ['front','side','back','device']:rend(v,v)
echo()
print('VERIFIED',flush=True)
