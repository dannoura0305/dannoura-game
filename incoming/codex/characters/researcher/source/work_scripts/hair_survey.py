from pathlib import Path
import json,struct,numpy as np
p=Path('outputs/researcher/blender_refined/researcher_refined.glb')
r=p.read_bytes();k=struct.unpack_from('<I',r,12)[0];j=json.loads(r[20:20+k]);b=r[28+k:]
def arr(a):
 v=j['accessors'][a];bv=j['bufferViews'][v['bufferView']];return np.frombuffer(b,'<f4',count=v['count']*3,offset=bv['byteOffset']).reshape(-1,3)
q=arr(j['meshes'][2]['primitives'][0]['attributes']['POSITION'])
print(q.min(0),q.max(0))
for y in [1.55,1.58,1.6,1.62,1.64,1.66,1.68,1.70,1.72,1.73,1.74]:
 v=q[abs(q[:,1]-y)<.005]
 if len(v):print(y,np.round(v.min(0),3),np.round(v.max(0),3),[[x,np.round(s[:,2].max(),3)] for x in [-.06,-.03,0,.03,.06] for s in [v[abs(v[:,0]-x)<.014]] if len(s)])
