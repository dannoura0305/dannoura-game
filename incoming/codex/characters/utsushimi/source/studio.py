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
    sc=bpy.context.scene;world=bpy.data.worlds.new('Neutral character studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.33,.37,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5;sc.world=world
    for name,loc,power,size,col in [('Key',(-3,-4,6),600,4,(1,.94,.94)),('Fill',(3,-2,4),400,3,(.86,.90,1)),('Rim',(1,3,5),700,3,(.94,.87,1))]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col;o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.6))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001));o=bpy.context.object;o.name='Studio floor';ma=bpy.data.materials.new('Studio grey');ma.use_nodes=True;ma.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.23,.23,.26,1);ma.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.85;o.data.materials.append(ma)
    d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(cam);sc.camera=cam;d.type='ORTHO';d.clip_end=300
    sc.render.engine='CYCLES';sc.cycles.samples=28;sc.cycles.use_denoising=True;sc.render.resolution_percentage=100;sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='AgX'
def render(path,kind):
    views={'front':((0,-8,1.9),(0,0,1.60),3.65,(900,1200)),'side':((8,0,1.9),(0,0,1.60),3.65,(900,1200)),'back':((0,8,1.9),(0,0,1.60),3.65,(900,1200)),
    'three_quarter':((3,-7,2.65),(0,0,1.61),3.65,(1000,1200)),'face':((.38,-5,3.20),(0,-.015,2.99),.87,(1100,1100)),
    'hand':((1,-4,1.60),(.52,-.04,1.23),.86,(1000,1100)),'torso':((1.5,-5,2.7),(0,0,2.09),1.28,(1000,1100)),
    'gesture':((3,-7,2.7),(0,-.15,1.52),3.8,(1200,1100))}
    loc,target,scale,res=views[kind];sc=bpy.context.scene;cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x=res[0];sc.render.resolution_y=res[1];sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
def prepare_edit_view():
    sc=bpy.context.scene;target=Vector((0,0,1.60));loc=Vector((3,-7,2.65));rot=(target-loc).to_track_quat('-Z','Y');sc.camera.location=loc;sc.camera.rotation_euler=rot.to_euler();sc.camera.data.ortho_scale=3.65;bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ['CAMERA','LIGHT'] or o.name=='Studio floor':o.hide_set(True)
        if o.type=='ARMATURE':o.select_set(True);bpy.context.view_layer.objects.active=o
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':area.spaces.active.region_3d.view_location=target;area.spaces.active.region_3d.view_distance=4.5;area.spaces.active.region_3d.view_rotation=rot
