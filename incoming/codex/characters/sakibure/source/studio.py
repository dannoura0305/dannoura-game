import bpy,os
from mathutils import Vector
def neutral():
    for o in bpy.context.scene.objects:
        if o.type=='ARMATURE':
            if o.animation_data:
                o.animation_data.action=None
                for tr in o.animation_data.nla_tracks:tr.mute=True
            for p in o.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
    bpy.context.view_layer.update()
def setup():
    sc=bpy.context.scene;world=bpy.data.worlds.new('Neutral boss studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.27,.28,.33,1);world.node_tree.nodes['Background'].inputs[1].default_value=.55;sc.world=world
    for name,loc,power,size,col in [('Key',(-25,-35,45),26000,28,(1,.93,.94)),('Fill',(30,-22,30),20000,24,(.81,.86,1)),('Rim',(8,26,36),35000,24,(.93,.86,1))]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col;o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,9))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=600,location=(0,0,-.025));floor=bpy.context.object;floor.name='Studio floor';m=bpy.data.materials.new('Slate ground');m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.18,.19,.22,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85;floor.data.materials.append(m)
    d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(cam);sc.camera=cam;d.type='ORTHO';d.clip_end=1000
    sc.render.engine='CYCLES';sc.cycles.samples=28;sc.cycles.use_denoising=True;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='AgX'
def render(path,kind):
    views={'front':((0,-100,19),(0,0,9),62,(1400,700)),'back':((0,100,19),(0,0,9),62,(1400,700)),
    'side':((100,0,19),(0,0,9),52,(1400,800)),'three_quarter':((49,-80,35),(0,0,8.5),68,(1400,850)),
    'core':((5,-60,16),(0,-10.5,9.5),16,(1000,1000)),'shell':((38,-35,27),(10,-2,11),28,(1100,900)),
    'claw':((18,-42,16),(4,-10,5),17,(1000,1000)),'gesture':((49,-80,35),(0,0,8.5),72,(1400,850))}
    loc,target,scale,res=views[kind];sc=bpy.context.scene;cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x=res[0];sc.render.resolution_y=res[1];sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
def prepare_edit_view():
    sc=bpy.context.scene;target=Vector((0,0,9));loc=Vector((49,-80,35));rotation=(target-loc).to_track_quat('-Z','Y');sc.camera.location=loc;sc.camera.rotation_euler=rotation.to_euler();sc.camera.data.ortho_scale=68
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ['CAMERA','LIGHT'] or o.name=='Studio floor':o.hide_set(True)
        if o.type=='ARMATURE':o.select_set(True);bpy.context.view_layer.objects.active=o
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=target;area.spaces.active.region_3d.view_distance=78;area.spaces.active.region_3d.view_rotation=rotation
