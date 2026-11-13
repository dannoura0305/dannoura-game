import sys,struct,json,bpy
from pathlib import Path
W=Path(__file__).resolve().parent
sys.path.insert(0,str(W))
from mathutils import Vector
import studio
folder=Path(sys.argv[sys.argv.index('--')+1])
raw=(folder/'研究者_調整版.vrm').read_bytes()
n=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+n])
for m in doc['materials']:
 m.pop('extensions',None)
 if m.get('alphaMode')=='BLEND':m['alphaMode']='MASK';m['alphaCutoff']=.20
doc.pop('extensions',None);doc.pop('extensionsRequired',None);doc['extensionsUsed']=['KHR_texture_transform']
js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*(-len(js)%4);tail=raw[20+n:]
path=W/'original_lit.glb'
path.write_bytes(struct.pack('<4sIII4s',b'glTF',2,20+len(js)+len(tail),len(js),b'JSON')+js+tail)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path))
studio.setup()
sc=bpy.context.scene
world=sc.world.node_tree.nodes['Background'];world.inputs[0].default_value=(.50,.50,.52,1);world.inputs[1].default_value=.65
sc.cycles.samples=16;sc.cycles.use_denoising=True
cam=sc.camera;cam.location=(0,-4.5,1.635);cam.rotation_euler=(Vector((0,-.005,1.62))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.ortho_scale=.385;sc.render.resolution_x=780;sc.render.resolution_y=830
bpy.data.objects['Studio floor'].hide_render=True;sc.render.filepath=str(W/'before_lit.png');bpy.ops.render.render(write_still=True)
print('DONE')
