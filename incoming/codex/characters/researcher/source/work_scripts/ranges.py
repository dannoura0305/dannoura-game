from vrm_read import *
for mi, mats in [(1,[7,8,12,13]),(0,[1,5])]:
 for mat in mats:
  pr=next(p for p in j['meshes'][mi]['primitives'] if p['material']==mat)
  a=acc(pr['attributes']['POSITION'])[acc(pr['indices']).ravel()]
  print(mat,a.min(0),a.max(0))
  if mat==8:
   for x in [.22,.27,.34,.44,.56,.62,.65]:
    s=a[abs(a[:,0]-x)<.02];print(x,s.min(0),s.max(0))
