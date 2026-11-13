from pathlib import Path
import struct,json
from vrm_read import acc,j
for k in [1,3,6,7,9,10,14]:print(k,{s:d for s,d in j['materials'][k].items() if s not in ['extensions','pbrMetallicRoughness']})
pr=j['meshes'][0]['primitives'][5];ix=acc(pr['indices']).ravel();q=acc(pr['attributes']['POSITION'])[ix];print('brow',q[q[:,0]>0][::4].round(3))
