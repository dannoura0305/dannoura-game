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
    bpy.ops.mesh.primitive_plane_add(size=4000,location=(0,0,-.025));floor=bpy.context.object;floor.name='Studio floor';m=bpy.data.materials.new('Slate ground');m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.18,.19,.22,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85;floor.data.materials.append(m)
    d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(cam);sc.camera=cam;d.type='ORTHO';d.clip_end=1000
    sc.render.engine='CYCLES';sc.cycles.samples=24;sc.cycles.use_denoising=True;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='AgX'
def render(path,kind):
    views={'front':((0,-70,12),(0,0,10),24,(1100,1250)),
    'back':((0,70,12),(0,0,10),24,(1100,1250)),
    'side':((70,0,12),(0,0,10),24,(1100,1250)),
    'three_quarter':((33,-65,25),(0,0,10),25,(1200,1250)),
    'core':((4,-40,15),(0,-1.3,12),8,(1100,1000)),
    'cable':((-21,-35,12),(-6,0,7),12,(1000,1100)),
    'lamps':((11,-35,22),(0,0,17),12,(1100,1000)),
    'gesture':((25,-70,27),(-3,-1,9.7),36,(1500,1050))}
    loc,target,scale,res=views[kind];sc=bpy.context.scene;cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x=res[0];sc.render.resolution_y=res[1];sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
def prepare_edit_view():
    sc=bpy.context.scene;target=Vector((0,0,9));loc=Vector((49,-80,35));rotation=(target-loc).to_track_quat('-Z','Y');sc.camera.location=loc;sc.camera.rotation_euler=rotation.to_euler();sc.camera.data.ortho_scale=25
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ['CAMERA','LIGHT'] or o.name=='Studio floor':o.hide_set(True)
        if o.type=='ARMATURE':o.select_set(True);bpy.context.view_layer.objects.active=o
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=target;area.spaces.active.region_3d.view_distance=36;area.spaces.active.region_3d.view_rotation=rotation
