import bpy,sys
from pathlib import Path
out=Path(sys.argv[sys.argv.index('--')+1])/'natural_face'
bpy.ops.wm.open_mainfile(filepath=str(out/'researcher_natural.blend'))
from mathutils import Vector
sc=bpy.context.scene;cam=sc.camera;cam.location=(0,-4.5,1.62);cam.rotation_euler=(Vector((0,-.005,1.607))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.36;sc.render.resolution_x=780;sc.render.resolution_y=830
for m in bpy.data.materials:
 if any(k in m.name for k in ('FaceBrow','EyeHighlight','FaceEyeline')):
  v=m.node_tree.nodes.get('Principled BSDF').inputs['Alpha']
  for l in list(v.links):m.node_tree.links.remove(l)
  v.default_value=0
bpy.data.objects['Studio floor'].hide_render=True
sc.render.filepath=str(Path(__file__).resolve().parent/'no_overlays.png');bpy.ops.render.render(write_still=True)
