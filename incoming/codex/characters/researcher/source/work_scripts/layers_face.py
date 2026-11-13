from vrm_read import *
import io
from PIL import Image
for pr in j['meshes'][0]['primitives']:
 k=pr['material'];m=j['materials'][k];t=m['pbrMetallicRoughness']['baseColorTexture']['index'];v=j['bufferViews'][j['images'][j['textures'][t]['source']]['bufferView']]
 img=Image.open(io.BytesIO(buf[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGBA')
 a=np.array(img);yy,xx=np.where(a[:,:a.shape[1]//2,3]>100);print(k,img.size,m['alphaMode'],m.get('emissiveFactor'),(xx.min(),xx.max(),yy.min(),yy.max()) if len(xx) else '')
 if k==1 or k==5:
  q=acc(pr['attributes']['POSITION']);uv=acc(pr['attributes']['TEXCOORD_0']);ids=np.unique(acc(pr['indices']));ids=ids[q[ids,0]>0]
  print(np.round(np.column_stack((q[ids,:2],uv[ids]))[::max(len(ids)//8,1)],4))
