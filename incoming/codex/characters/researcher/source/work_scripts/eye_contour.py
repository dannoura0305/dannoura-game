import json,struct,sys
from pathlib import Path
import numpy as np
from PIL import Image
w=Path(__file__).resolve().parent;root=w.parents[1]/'outputs/researcher'
def load(p):
 raw=p.read_bytes();l=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+l]);buf=raw[28+l:]
 def arr(k):
  a=j['accessors'][k];v=j['bufferViews'][a['bufferView']];d={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']];return np.frombuffer(buf,{5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']],count=a['count']*d,offset=v.get('byteOffset',0)).reshape(-1,d)
 return j,arr
def eye_edges(j,arr):
 # Depth test the skin, sclera and iris to measure the visible lid opening.
 scale=6000;x0=.005;y0=1.58;H,W=400,460
 zbuf=np.full((H,W),-.1);label=np.zeros((H,W))
 for p in j['meshes'][0]['primitives']:
  mat=p['material']
  if mat not in (3,4,1):continue
  coords=arr(p['attributes']['POSITION'])
  for tri in arr(p['indices']).reshape(-1,3):
   xyz=coords[tri]
   if xyz[:,2].max()<0:continue
   xy=(xyz[:,:2]-[x0,y0])*scale;lo=np.maximum(0,np.floor(xy.min(0)).astype(int));hi=np.minimum([W-1,H-1],np.ceil(xy.max(0)).astype(int))
   if (lo>hi).any():continue
   x,y=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1))
   (a,b),(c,d)=xy[1:]-xy[0];det=a*d-b*c
   if abs(det)<1e-9:continue
   dx=x-xy[0,0];dy=y-xy[0,1];u=(d*dx-c*dy)/det;v=(a*dy-b*dx)/det
   z=xyz[0,2]+u*(xyz[1,2]-xyz[0,2])+v*(xyz[2,2]-xyz[0,2])
   valid=(u>=0)&(v>=0)&(u+v<=1)&(z>zbuf[y,x]);zbuf[y[valid],x[valid]]=z[valid];label[y[valid],x[valid]]=mat
 a=(label==4)|(label==1)
 ix=np.where(a.any(0))[0]
 kept=ix[np.r_[True,np.diff(ix)>0]]
 print([(round(1000*(x0+i/scale),2),round(1000*(y0+np.where(a[:,i])[0].min()/scale),2),round(1000*(y0+np.where(a[:,i])[0].max()/scale),2)) for i in np.unique(np.linspace(kept.min(),kept.max(),17).astype(int)) if a[:,i].any()])
 return a
if __name__=='__main__':
 for f in [root/'研究者_調整版.vrm',root/'blender_refined/researcher_refined.glb',root/'natural_face/researcher_natural.glb']:
  j,arr=load(f);eye_edges(j,arr)
