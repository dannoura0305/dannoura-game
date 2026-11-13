from lib import *
q=rest[0]
p=meshes[0]['primitives'][3];tr=acc(p['indices']).reshape(-1,3)
e,n=np.unique(np.sort(np.vstack([tr[:,[0,1]],tr[:,[1,2]],tr[:,[2,0]]]),axis=1),axis=0,return_counts=True)
r=q[np.unique(e[n==1])]
s=r[(r[:,0]>.005)&(r[:,2]>.014)&(r[:,1]>1.412)&(r[:,1]<1.457)]
print(s[np.argsort(s[:,0])].round(4))
for k in [3,7,8,9,10]:
 m=j['materials'][k];print(k,m['pbrMetallicRoughness']['baseColorFactor'])
