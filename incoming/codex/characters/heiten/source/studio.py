import bpy,os,math
from mathutils import Vector

def neutral():
    for o in bpy.context.scene.objects:
        if o.type=='ARMATURE':
            if o.animation_data:
                o.animation_data.action=None
                for tr in o.animation_data.nla_tracks:tr.mute=True
            for p in o.pose.bones:
                p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
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
    views={'front':((0,-7,1.06),(0,0,1.06),2.35),'side':((7,0,1.06),(0,0,1.06),2.35),
      'back':((0,7,1.06),(0,0,1.06),2.35),'three_quarter':((3,-6,2.25),(0,0,1.06),2.42),
      'face':((1.2,-5,2.05),(0,-.08,1.87),.67),'face_front':((0,-5,1.87),(0,-.08,1.87),.67),
      'back_detail':((1.7,5,2.2),(0,.14,1.80),.95),
      'gesture':((2,-7,2.0),(0,0,1.55),3.6),
      'apron':((1.1,-5,1.5),(0,-.1,1.28),.8)}
    loc,target,scale=views[kind];sc=bpy.context.scene;cam=sc.camera
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
    sc.render.filepath=os.path.abspath(path);bpy.ops.render.render(write_still=True)
