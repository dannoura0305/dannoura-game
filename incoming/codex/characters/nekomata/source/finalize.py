import bpy,bmesh,sys,os,json
out=os.path.abspath(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=os.path.join(out,'nekomata_sculpt.blend'))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)]
fixed=[]
for o in objects:
    if o.data.validate(verbose=True,clean_customdata=True):fixed.append(o.name)
    o.data.update()
def select_model():
    bpy.ops.object.select_all(action='DESELECT');arm.select_set(True)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=arm
def export(name):
    select_model()
    bpy.ops.export_scene.gltf(filepath=os.path.join(out,name),export_format='GLB',use_selection=True,export_animations=True,export_morph=True,export_skins=True,export_morph_normal=False,export_yup=True)
def stats():
    return {'vertices':sum(len(o.data.vertices) for o in objects),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in objects)}
export('nekomata_sculpt.glb');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'nekomata_sculpt.blend'))
full=stats();full['bytes']=os.path.getsize(os.path.join(out,'nekomata_sculpt.glb'))
fur=bpy.data.objects['Nekomata sculpted fur locks']
bm=bmesh.new();bm.from_mesh(fur.data);seen=set();remove=[];hair_count=0
for v in bm.verts:
    if v in seen:continue
    stack=[v];seen.add(v);component=[]
    while stack:
        w=stack.pop();component.append(w)
        for e in w.link_edges:
            q=e.other_vert(w)
            if q not in seen:seen.add(q);stack.append(q)
    if len(component)==12:
        hair_count+=1
        if hair_count%3:remove.extend(component)
bmesh.ops.delete(bm,geom=remove,context='VERTS');bm.to_mesh(fur.data);bm.free();fur.data.update()
for o in objects:
    if o==fur or o.data.shape_keys or 'face' in o.name.lower() or len(o.data.vertices)<5000:continue
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('Review mesh reduction','DECIMATE');m.ratio=.42
    bpy.ops.object.modifier_move_up(modifier=m.name)
    bpy.ops.object.modifier_apply(modifier=m.name)
    o.data.validate(clean_customdata=True);o.data.update()
    bpy.ops.object.vertex_group_limit_total(limit=4)
    bpy.ops.object.vertex_group_normalize_all(lock_active=False)
export('nekomata_light.glb')
lite=stats();lite['bytes']=os.path.getsize(os.path.join(out,'nekomata_light.glb'))
json.dump({'full':full,'light':lite,'bones':len(arm.data.bones),'removed_strand_vertices':len(remove),'mesh_cleanup':fixed},open(os.path.join(out,'build_stats.json'),'w'),indent=2)
bpy.context.scene.render.filepath=os.path.join(out,'light_face.png');bpy.ops.render.render(write_still=True)
print('FINALIZED',json.dumps({'full':full,'light':lite,'cleanup':fixed}),flush=True)
