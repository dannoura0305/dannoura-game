from pathlib import Path
import json,struct,numpy as np
p=Path('outputs/researcher')
raw=next(p.glob('*.vrm')).read_bytes()
jlen=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+jlen]);buf=raw[28+jlen:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];typ={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']];dim={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 return np.frombuffer(buf,dtype=typ,count=a['count']*dim,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,dim)
if __name__=='__main__':
 for pr in j['meshes'][1]['primitives']:
  if pr['material']!=8:continue
  pos=acc(pr['attributes']['POSITION']);uv=acc(pr['attributes']['TEXCOORD_0'])*512
  ix=acc(pr['indices']).ravel(); print(pos[ix].min(0),pos[ix].max(0))
  for x,y in [(210,150),(300,160),(286,200),(300,300),(320,300),(339,300),(110,280),(275,265),(60,54),(445,55)]:
   k=ix[((uv[ix]-[x,y])**2).sum(1).argmin()];print((x,y),uv[k],pos[k])
