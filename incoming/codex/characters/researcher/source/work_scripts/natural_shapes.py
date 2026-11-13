def organic_face(points, result, mesh, material_ids):
 """Work in neutral VRoid coordinates so that lid and lip contacts agree in every morph."""
 x,y,z=points.T
 a=abs(x)
 front=smooth((z+.015)/.055)
 # Shape the eyelid opening with a shallow arch and level outer canthus.
 shift=lid_warp(x,y,z)
 result[:,1]+=shift
 # Support the lower lid and fill the abrupt hollow between the cheek and muzzle.
 result[:,2]+=front*(.0045*ga((a-.046)/.018,(y-1.600)/.010)
                      +.0035*ga((a-.047)/.031,(y-1.562)/.028)
                      -.0035*ga(x/.012,(y-1.580)/.020))
 # Broader lower jaw, fuller chin and a gentle downward turn at the lip commissures.
 lower=ga((a-.047)/.031,(y-1.534)/.027)
 result[:,0]+=np.sign(x)*.0018*lower*front
 result[:,2]+=.0025*ga(x/.031,(y-1.529)/.017)*front
 mouth=ga(x/.034,(y-1.545)/.012)*front
 result[:,1]+=mouth*(.0006-.00065*smooth((a-.005)/.016)+.00055*np.tanh(x/.010))
 result[:,2]+=front*(.0017*ga(x/.019,(y-1.542)/.0035)+.0012*ga((a-.007)/.007,(y-1.548)/.0032))
 if mesh!=0:return result
 # Retain circular irises as the surrounding lids change. Bring each pupil towards
 # the centre of its own aperture; both eyes then address the same distant point.
 for mat in (1,2):
  ids=material_ids[mat];xx,yy,zz=points[ids].T
  result[ids,1]-=shift[ids]
  result[ids,0]+=np.sign(xx)*.0035+.12*(xx-np.sign(xx)*.042)
  result[ids,1]+=.0002+.21*(yy-1.6155)
 # Relax the outer brows while retaining a little natural asymmetry.
 ids=material_ids[5];xx,yy,zz=points[ids].T
 result[ids,1]-=.0027+.001*np.tanh(xx*65)+.001*smooth((abs(xx)-.042)/.016)
 # The VRoid white has a recessed pocket underneath the original iris card.
 # Form one continuous convex corneal surface across that pocket. Fade into
 # the eyelid margin and keep its perimeter behind the skin during a blink.
 for mat,offset in ((4,0),(1,.00022),(2,.00042)):
  ids=material_ids[mat]
  xx,yy=result[ids,:2].T;ax=abs(xx);u=(ax-.0383)/.0123;v=(yy-1.602)/.0082
  rim=np.interp(ax,[.008,.018,.024,.030,.038,.046,.052,.060,.068],
                    [.044,.049,.0495,.0505,.0478,.0405,.0345,.025,.016])
  cap=np.exp(-.87*u*u-.78*v*v)
  result[ids,2]=rim+.0022*cap-.0016*np.minimum(2.5,v*v)+offset
  # Preserve lid contact during both unilateral and bilateral closing.
  for sign in (-1,1):
   rp=rest[0];moving=(rp[:,0]*sign>.034)&(rp[:,0]*sign<.054)&(rp[:,1]>1.619)&(rp[:,1]<1.626)&(rp[:,2]>.044)
   closing=max(0.,float(np.max(rp[moving,1]-points[moving,1])))
   result[ids,2]-=(np.sign(xx)==sign)*.0030*smooth(closing/.012)
 # Roll the lid over the eye surface. It must stay in front when either lid
 # crosses the iris in a blink or squint.
 ids=material_ids[3];xx,yy,zz=result[ids].T;ax=abs(xx)
 rim=np.interp(ax,[.008,.018,.024,.030,.038,.046,.052,.060,.068],[.044,.049,.0495,.0505,.0478,.0405,.0345,.025,.016])
 u=(ax-.0383)/.0123;v=(yy-1.602)/.0082
 cover=rim+.0022*np.exp(-.87*u*u-.78*v*v)-.0016*np.minimum(2.5,v*v)+.0018
 weight=smooth((ax-.019)/.005)*smooth((.057-ax)/.006)*smooth((points[ids,2]-.022)/.014)*np.exp(-((yy-1.602)/.018)**4)
 result[ids,2]+=weight*np.maximum(0,cover-zz)
 # A small inward shift of the whole orbital region keeps the pupil and both
 # corners together. The nasal bridge and temple stay in place.
 shift_x=.0025*np.sign(x)*smooth((a-.011)/.012)*smooth((.079-a)/.015)*np.exp(-((y-1.615)/.026)**4)*front
 result[:,0]-=shift_x
 ids=material_ids[5];uv=acc(me['primitives'][0]['attributes']['TEXCOORD_0'])[ids];delta=points[ids]-rest[0][ids]
 sign=np.sign(rest[0][ids,0]);t=np.where(sign>0,(uv[:,0]-.55)/.365,(.45-uv[:,0])/.365)
 result[ids,0]=sign*(.0145+.042*t)+.86*delta[:,0]
 result[ids,1]=1.6177+.0030*np.sin(np.pi*t)-.0006*t+(.51-uv[:,1])*.023+.90*delta[:,1]+sign*.00045
 project_surface(ids,orbital_surfaces[3],result,.00135)
 return result
