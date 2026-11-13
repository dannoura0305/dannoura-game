exec(open('work/researcher/survey_face.py').read().split('for pr')[0])
pr=j['meshes'][0]['primitives'][3]
tr=acc(pr['indices']).reshape(-1,3);edges=np.sort(np.vstack((tr[:,[0,1]],tr[:,[1,2]],tr[:,[2,0]])),axis=1);e,n=np.unique(edges,axis=0,return_counts=True)
r=q[np.unique(e[n==1])];m=(abs(r[:,0])<.033)&(r[:,1]>1.525)&(r[:,1]<1.565)&(r[:,2]>.038);print(np.round(r[m][::2],4))
for x in [.0,.012,.026]:
 rr=q[(abs(q[:,0]-x)<.005)&(abs(q[:,1]-1.545)<.016)&(q[:,2]>.065)];print(x, np.round(rr[np.argsort(rr[:,1])][::4],4))
