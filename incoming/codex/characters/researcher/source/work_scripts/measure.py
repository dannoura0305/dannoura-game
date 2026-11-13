from vrm_read import *
for k in [7,8,12]:
 pr=next(p for p in j['meshes'][1]['primitives'] if p['material']==k);i=acc(pr['indices']).ravel();xyz=acc(pr['attributes']['POSITION'])[i]
 for y in [1.50,1.47,1.44,1.40,1.36,1.32,1.25,1.12]:
  print(k,y,[(x,round(float(np.max(sub[:,2])),3) if len(sub) else None) for x in [.0,.03,.05,.07,.09] for sub in [xyz[(abs(xyz[:,1]-y)<.013)&(abs(xyz[:,0]-x)<.012)]]])
