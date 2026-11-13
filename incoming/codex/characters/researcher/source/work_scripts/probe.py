import importlib.util
print({k:bool(importlib.util.find_spec(k)) for k in ['scipy','cv2','skimage','trimesh','matplotlib']})
from vrm_read import *
for mesh in j['meshes']:
 pr=mesh['primitives'][0];print(mesh['name'],'targets:',len(pr.get('targets',[])),pr.get('targets',[])[:2])
for i in [0,1]:
 print(j['skins'][i]['joints'][:12],j['extensions']['VRMC_vrm']['humanoid']['humanBones']['head'])
pr=j['meshes'][0]['primitives'][3];a=pr['attributes'];xyz=acc(a['POSITION']);ix=np.unique(acc(pr['indices']));xyz=xyz[ix]
for y in np.arange(1.504,1.694,.006):
 a=xyz[(abs(xyz[:,1]-y)<.004)&(abs(xyz[:,0])<.02)];print(round(y,3),a[np.argmax(a[:,2])].round(3) if len(a) else '')
