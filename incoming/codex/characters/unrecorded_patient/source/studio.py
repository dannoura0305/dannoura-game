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
    sc=bpy.context.scene;world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.33,.36,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;sc.world=world
    for name,loc,power,size,col in [('Key',(-3,-4,5),420,4,(1,.95,.88)),('Fill',(3,-2,3),240,3,(.86,.91,1)),('Rim',(1,3,4),480,3,(1,.98,.94))]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col;o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.002));o=bpy.context.object;o.name='Studio floor';ma=bpy.data.materials.new('Studio grey');ma.use_nodes=True;ma.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.24,.24,.26,1);ma.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85;o.data.materials.append(ma)
    d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(cam);sc.camera=cam;d.type='ORTHO';d.clip_end=300
    sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=True;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='AgX'
def render(path,kind):
    views={'front':((.1,-7,1.4),(.1,0,1.22),2.85,(1050,1250)),
    'side':((7,0,1.4),(.1,0,1.22),2.85,(1050,1250)),
    'back':((.1,7,1.4),(.1,0,1.22),2.85,(1050,1250)),
    'three_quarter':((3,-7,2.9),(.1,0,1.22),2.85,(1100,1250)),
    'face':((.35,-5,2.3),(-.12,-.05,2.13),.80,(1100,1000)),
    'hand':((.15,-5,1.8),(-.06,-.20,1.59),.69,(1000,1000)),
    'equipment':((2,-4,2),(.53,.075,1.95),1.18,(900,1200)),
    'gesture':((2.8,-6,2.8),(.1,-.1,1.22),2.9,(1100,1250))}
    loc,target,scale,res=views[kind];sc=bpy.context.scene;cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x=res[0];sc.render.resolution_y=res[1];sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
def prepare_edit_view():
    sc=bpy.context.scene;target=Vector((.1,0,1.22));loc=Vector((3,-6,2.7));rot=(target-loc).to_track_quat('-Z','Y');sc.camera.location=loc;sc.camera.rotation_euler=rot.to_euler();sc.camera.data.ortho_scale=2.85;bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ['CAMERA','LIGHT'] or o.name=='Studio floor':o.hide_set(True)
        if o.type=='ARMATURE':o.select_set(True);bpy.context.view_layer.objects.active=o
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=target;area.spaces.active.region_3d.view_distance=3.5;area.spaces.active.region_3d.view_rotation=rot
