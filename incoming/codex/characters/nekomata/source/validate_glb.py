import bpy,sys,os,json,math
from mathutils import Vector
out=os.path.abspath(sys.argv[sys.argv.index('--')+1]);path=os.path.join(out,'nekomata_sculpt.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)
arm=[o for o in bpy.context.scene.objects if o.type=='ARMATURE'][0]
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
names=set(arm.data.bones.keys());expected={'head','jaw','neck1','neck2','neck3','root'}
morphs=set()
for o in meshes:
    if o.data.shape_keys:morphs.update(o.data.shape_keys.key_blocks.keys())
expr={'blink','calm','gentle_smile','thinking','serious','quiet_sorrow','guarding_eyes','awkward'}
report={'reimport_ok':True,'bones':len(names),'required_bones_present':expected<=names,'morph_names_present':expr<=morphs,
        'actions':[a.name for a in bpy.data.actions],'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),
        'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes),'bytes':os.path.getsize(path),
        'finite_vertices':all(all(math.isfinite(c) for c in v.co) for o in meshes for v in o.data.vertices),
        'unweighted_vertices':sum(not v.groups for o in meshes for v in o.data.vertices)}
json.dump(report,open(os.path.join(out,'validation.json'),'w'),indent=2)
print('VALIDATION',json.dumps(report),flush=True)
assert report['required_bones_present'] and report['morph_names_present'] and report['finite_vertices']
assert report['unweighted_vertices']==0
