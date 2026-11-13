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
    views={'front':((0,-6,.99),(0,0,.90),2.02,(680,940)),'back':((0,6,.99),(0,0,.90),2.02,(680,940)),'side':((6,0,.99),(0,0,.90),2.02,(680,940)),'hero':((1.38,-6.2,1.30),(0,0,.90),2.02,(820,1020)),'face':((.16,-3.8,1.69),(0,-.04,1.65),.39,(800,830)),'device':((.75,-3,1.27),(.09,-.063,1.057),.285,(760,760)),'replay':((1.1,-5.7,1.70),(-.12,0,.96),2.18,(1020,940)),'kneel':((2.4,-5.8,1.15),(0,0,.62),1.52,(970,960)),'echo':((1.40,-5.8,1.6),(.15,0,.90),2.68,(1210,920))}
    loc,target,scale,res=views[kind];sc=bpy.context.scene;cam=sc.camera;cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.resolution_x,sc.render.resolution_y=res;sc.cycles.samples=12;sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
def prepare_edit_view():
    sc=bpy.context.scene;cam=sc.camera;t=Vector((0,0,.90));cam.location=(1.38,-6.2,1.30);q=(t-cam.location).to_track_quat('-Z','Y');cam.rotation_euler=q.to_euler();cam.data.ortho_scale=2.02
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ['LIGHT','CAMERA'] or o.name=='Studio floor':o.hide_set(True)
        if o.type=='ARMATURE':o.select_set(True);bpy.context.view_layer.objects.active=o;o.show_in_front=False
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                v=area.spaces.active;v.region_3d.view_location=t;v.region_3d.view_distance=3;v.region_3d.view_rotation=q;v.shading.color_type='TEXTURE'
