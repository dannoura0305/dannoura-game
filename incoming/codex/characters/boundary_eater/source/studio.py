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
    sc=bpy.context.scene;world=bpy.data.worlds.new('Ash grey studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.30,.34,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65;sc.world=world
    for name,loc,power,size,col in [('Key',(-18,-26,26),18000,20,(1,.94,.91)),('Fill',(22,-18,18),14000,18,(.85,.87,1)),('Rim',(3,20,24),22000,16,(.94,.87,1))]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col;o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,6))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=1200,location=(0,0,-.015));floor=bpy.context.object;floor.name='Studio floor';m=bpy.data.materials.new('Neutral grey floor');m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.235,.225,.245,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;floor.data.materials.append(m)
    d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(cam);sc.camera=cam;d.type='ORTHO';d.clip_end=1500
    sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=True;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='AgX'
def render(path,kind):
    views={'front':((0,-55,8),(0,0,6),23,(1500,1050)),
    'back':((0,55,8),(0,0,6),23,(1500,1050)),
    'side':((55,0,8),(0,0,6),15,(1000,1200)),
    'three_quarter':((20,-55,18),(0,0,6),23,(1500,1100)),
    'core':((1.6,-35,12),(0,-1,8.4),4.4,(1100,1150)),
    'wing':((7,-35,14),(5,-.25,8.7),7.3,(1200,1000)),
    'roots':((13,-25,10),(0,0,2.2),9.5,(1100,1000)),
    'gesture':((20,-55,20),(0,-1,6),24,(1500,1100))}
    loc,target,scale,res=views[kind];sc=bpy.context.scene;cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x=res[0];sc.render.resolution_y=res[1];sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
def prepare_edit_view():
    sc=bpy.context.scene;target=Vector((0,0,6));loc=Vector((20,-55,18));rotation=(target-loc).to_track_quat('-Z','Y');sc.camera.location=loc;sc.camera.rotation_euler=rotation.to_euler();sc.camera.data.ortho_scale=23
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ['CAMERA','LIGHT'] or o.name=='Studio floor':o.hide_set(True)
        if o.type=='ARMATURE':o.select_set(True);bpy.context.view_layer.objects.active=o
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=target;area.spaces.active.region_3d.view_distance=29;area.spaces.active.region_3d.view_rotation=rotation
