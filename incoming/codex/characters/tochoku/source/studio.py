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
    sc=bpy.context.scene;world=bpy.data.worlds.new('Neutral industrial studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.30,.31,.34,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;sc.world=world
    for name,loc,power,size,col in [('Key',(-3,-4.5,5.5),480,4,(1,.93,.85)),('Fill',(4,-2.5,3.5),310,3,(.84,.88,1)),('Rim',(1,3,4.5),540,3,(.92,.93,1))]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col;o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));floor=bpy.context.object;floor.name='Studio floor';m=bpy.data.materials.new('Warm grey ground');m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.23,.235,.25,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;floor.data.materials.append(m)
    d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(cam);sc.camera=cam;d.type='ORTHO';d.clip_end=300
    sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=True;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='AgX'
def render(path,kind):
    views={'front':((0,-9,1.55),(0,0,1.29),3.00,(1050,1250)),
    'back':((0,9,1.6),(0,0,1.30),3.00,(1050,1250)),
    'side':((9,0,1.6),(0,0,1.30),3.00,(1050,1250)),
    'three_quarter':((3.4,-8,3.2),(0,0,1.30),3.05,(1150,1250)),
    'face':((.7,-5,2.8),(0,-.10,2.16),.95,(1100,1000)),
    'wrench':((-1.7,-5,1.8),(-.56,-.09,1.16),1.10,(1000,1100)),
    'pipes':((2.5,5,3.15),(0,.30,1.90),1.70,(1100,1100)),
    'gesture':((3.4,-8,3.1),(0,-.1,1.27),3.25,(1250,1200))}
    loc,target,scale,res=views[kind];sc=bpy.context.scene;cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x=res[0];sc.render.resolution_y=res[1];sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
def prepare_edit_view():
    sc=bpy.context.scene;target=Vector((0,0,1.3));loc=Vector((3.4,-8,3.2));rotation=(target-loc).to_track_quat('-Z','Y');sc.camera.location=loc;sc.camera.rotation_euler=rotation.to_euler();sc.camera.data.ortho_scale=3.05
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ['CAMERA','LIGHT'] or o.name=='Studio floor':o.hide_set(True)
        if o.type=='ARMATURE':o.select_set(True);bpy.context.view_layer.objects.active=o
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=target;area.spaces.active.region_3d.view_distance=4.5;area.spaces.active.region_3d.view_rotation=rotation
