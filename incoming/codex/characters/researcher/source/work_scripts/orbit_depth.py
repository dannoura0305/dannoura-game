from eye_contour import *
j,arr=load(root/'natural_face/researcher_natural.glb')
for xx in [.024,.030,.038,.046,.052]:
 print('x',xx)
 for m in [3,4,1,5]:
  p=j['meshes'][0]['primitives'][m];t=arr(p['indices']).reshape(-1,3);q=arr(p['attributes']['POSITION'])[t]
  a=q[:,0];u=q[:,1]-a;v=q[:,2]-a;det=u[:,0]*v[:,1]-v[:,0]*u[:,1];de=np.where(abs(det)>1e-10,det,1)
  zz=[]
  for y in [1.581,1.59,1.595,1.598,1.601,1.604,1.608,1.612,1.618,1.623]:
   dx=xx-a[:,0];dy=y-a[:,1];b=(dx*v[:,1]-dy*v[:,0])/de;c=(u[:,0]*dy-u[:,1]*dx)/de;hits=(b>=0)&(c>=0)&(b+c<=1)&(abs(det)>1e-10)
   z=(a[:,2]+b*u[:,2]+c*v[:,2])[hits]
   zz.append(round(z.max()*1000) if len(z) else None)
  print(m,zz)
