from vrm_read import *
q=acc(j['meshes'][0]['primitives'][0]['attributes']['POSITION'])
for pr in j['meshes'][0]['primitives']:
 mat=pr['material'];tr=acc(pr['indices']).reshape(-1,3);ids=np.unique(tr);p=q[ids]
 print('mat',mat,'bnd',p.min(0),p.max(0))
 if mat==3:
  edges=np.sort(np.concatenate((tr[:,[0,1]],tr[:,[1,2]],tr[:,[2,0]])),axis=1);e,n=np.unique(edges,axis=0,return_counts=True);rim=q[np.unique(e[n==1])]
  r=rim[(rim[:,0]>.003)&(rim[:,0]<.09)&(rim[:,1]>1.585)&(rim[:,1]<1.646)&(rim[:,2]>.015)]
  print(np.round(r[np.argsort(r[:,0])][::1],4))
 if mat==5:
  print('brow',np.round(p[p[:,0]>0][::max(1,len(p)//50)],4))
