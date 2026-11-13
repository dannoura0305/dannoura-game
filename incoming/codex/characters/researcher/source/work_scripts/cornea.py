from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'natural_shapes.py';s=p.read_text('utf8');a=s.index(' for mat,offset in ((1,');b=s.index(' ids=material_ids[5];uv',a)
s=s[:a]+''' # The VRoid white has a recessed pocket underneath the original iris card.
 # Form one continuous convex corneal surface across that pocket. Fade into
 # the eyelid margin and keep its perimeter behind the skin during a blink.
 for mat,offset in ((4,0),(1,.00022),(2,.00042)):
  ids=material_ids[mat]
  xx,yy=result[ids,:2].T;ax=abs(xx);u=(ax-.0383)/.0123;v=(yy-1.602)/.0082
  rim=np.interp(ax,[.008,.018,.024,.030,.038,.046,.052,.060,.068],
                    [.044,.049,.0495,.0505,.0478,.0405,.0345,.025,.016])
  cap=np.exp(-.87*u*u-.78*v*v)
  result[ids,2]=rim+.005*cap-.0016*np.minimum(2.5,v*v)+offset
 # A small inward shift of the whole orbital region keeps the pupil and both
 # corners together. The nasal bridge and temple stay in place.
 shift_x=.0025*np.sign(x)*smooth((a-.011)/.012)*smooth((.079-a)/.015)*np.exp(-((y-1.615)/.026)**4)*front
 result[:,0]-=shift_x
'''+s[b:]
p.write_text(s,'utf8')
p=w/'orbit_detail.py';s=p.read_text('utf8')
s+="""
idx,im=getimage(0);arr=np.array(im)
rgb=arr[:,:,:3].astype(float);red=smooth((rgb[:,:,0]-rgb[:,:,2]-10)/55)
rgb=rgb*(1-red[...,None])+(rgb*[.58,.57,.64]+[11,6,9])*red[...,None]
arr[:,:,:3]=np.uint8(np.clip(rgb,0,255));setimage(idx,Image.fromarray(arr))
"""
p.write_text(s,'utf8')
