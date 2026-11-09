import bpy,os,math
from mathutils import Vector

def prepare_edit_view():
    target=Vector((0,-.025,1.31));loc=Vector((3,-6,2.50));rotation=(target-loc).to_track_quat('-Z','Y')
    sc=bpy.context.scene
    if sc.camera:sc.camera.location=loc;sc.camera.rotation_euler=rotation.to_euler();sc.camera.data.ortho_scale=3.0
    bpy.ops.object.select_all(action='DESELECT')
    for o in sc.objects:
        if o.type in ['CAMERA','LIGHT'] or o.name=='Studio floor':o.hide_set(True)
        if o.type=='ARMATURE':o.select_set(True);bpy.context.view_layer.objects.active=o
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                area.spaces.active.region_3d.view_location=target
                area.spaces.active.region_3d.view_distance=4.3
                area.spaces.active.region_3d.view_rotation=rotation

def neutral():
    for o in bpy.context.scene.objects:
        if o.type=='ARMATURE':
            if o.animation_data:
                o.animation_data.action=None
                for tr in o.animation_data.nla_tracks:tr.mute=True
            for p in o.pose.bones:
                p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        if o.type=='MESH' and o.data.shape_keys:
            for k in o.data.shape_keys.key_blocks:k.value=0
    bpy.context.view_layer.update()

def setup(res=1000,samples=32):
    sc=bpy.context.scene
    world=bpy.data.worlds.new('Slate studio');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.26,.32,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.4;sc.world=world
    for name,loc,power,size,col in [('Key',(-3,-4,5),400,4,(1,.94,.88)),('Fill',(3,-2,3),260,3,(.80,.87,1)),('Rim',(1,3,4),500,3,(.87,.91,1))]:
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col
        o=bpy.data.objects.new(name,d);sc.collection.objects.link(o);o.location=loc
        o.rotation_euler=(Vector((0,0,1.2))-o.location).to_track_quat('-Z','Y').to_euler()
    bottom=min((o.matrix_world@v.co).z for o in sc.objects if o.type=='MESH' for v in o.data.vertices)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,bottom-.001));floor=bpy.context.object;floor.name='Studio floor'
    m=bpy.data.materials.new('Slate ground');m.diffuse_color=(.16,.17,.21,1);m.use_nodes=True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.16,.17,.21,1)
    m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;floor.data.materials.append(m)
    d=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',d);sc.collection.objects.link(cam);sc.camera=cam
    d.type='ORTHO';d.clip_end=300
    sc.render.engine='CYCLES';sc.cycles.samples=samples;sc.cycles.use_denoising=True
    sc.render.resolution_x=res;sc.render.resolution_y=res;sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG';sc.view_settings.view_transform='AgX'

def render(path,kind):
    views={'front':((0,-7,1.65),(0,0,1.31),3.0),'side':((7,0,1.65),(0,0,1.31),3.0),
      'back':((0,7,1.65),(0,0,1.31),3.0),'three_quarter':((3,-6,2.50),(0,-.025,1.31),3.05),
      'face':((.5,-5,2.85),(0,-.04,2.32),.78),'detail':((1.8,-5,2.4),(.08,-.015,1.94),.76),
      'hand':((.9,-4,1.40),(.41,-.03,.98),.52),'gesture':((3,-6,2.50),(0,-.10,1.31),3.05)}
    loc,target,scale=views[kind];sc=bpy.context.scene;cam=sc.camera
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
    sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
