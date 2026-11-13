from lib import *
def local(n):
 x,y,z,w=n.get('rotation',[0,0,0,1]);r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
 m=np.eye(4);m[:3,:3]=r@np.diag(n.get('scale',[1]*3));m[:3,3]=n.get('translation',[0]*3);return m
parent={kid:k for k,n in enumerate(j['nodes']) for kid in n.get('children',[])}
def globalmat(i):
 return globalmat(parent[i])@local(j['nodes'][i]) if i in parent else local(j['nodes'][i])
world={i:globalmat(i) for i in range(len(j['nodes']))}
bones=j['extensions']['VRMC_vrm']['humanoid']['humanBones']
if __name__=='__main__':
 for k in ['hips','chest','neck','head','leftEye','leftUpperArm','leftLowerArm','leftHand','leftUpperLeg','leftLowerLeg']:print(k,np.round(world[bones[k]['node']][:3,3],4))
 for p in meshes[1]['primitives']:
  if p['material'] not in [7,8,9]:continue
  q=rest[1][np.unique(acc(p['indices']))]
  for y in [.82,1.01,1.17,1.25,1.29,1.32,1.36]:
   ss=q[(abs(q[:,1]-y)<.015)&(abs(q[:,0])<.19)]
   if len(ss):print(p['material'],y,ss.min(0).round(3),ss.max(0).round(3))
