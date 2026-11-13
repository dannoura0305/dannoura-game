from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'natural_shapes.py';s=p.read_text('utf8')
s=s.replace("result[ids,2]=rim+.005*cap-.0016*np.minimum(2.5,v*v)+offset","""result[ids,2]=rim+.0022*cap-.0016*np.minimum(2.5,v*v)+offset
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
 result[ids,2]+=weight*np.maximum(0,cover-zz)""")
p.write_text(s,'utf8')
p=w/'orbital_fit.py';s=p.read_text('utf8').replace('mid+.0062*shape','mid+.0045*shape').replace('mid-.0031*shape','mid-.0033*shape');p.write_text(s,'utf8')
p=w/'orbit_detail.py';s=p.read_text('utf8').replace('[(1,.38),(4,.17)]','[(1,.14),(4,.075)]').replace('width=2 if layer==0 else 1','width=3 if layer==0 else 1')
s+="""
# Warm, fine lash roots and the lower wet margin, registered to the eye aperture.
idx,im=getimage(3);arr=np.array(im)
ew=smooth((a-.026)/.003)*smooth((.065-a)/.004)*smooth((z-.023)/.021)*valid
upper_rim=ew*np.exp(-((y-hi-.00048)/.00125)**2)*.62
lower_rim=ew*np.exp(-((y-lo+.00052)/.00095)**2)*.37
rgb=arr[:,:,:3].astype(float)
rgb=rgb*(1-upper_rim[...,None])+np.array([86,60,53])*upper_rim[...,None]
rgb=rgb*(1-lower_rim[...,None])+np.array([159,108,98])*lower_rim[...,None]
arr[:,:,:3]=np.uint8(np.clip(rgb,0,255));setimage(idx,Image.fromarray(arr))
"""
p.write_text(s,'utf8')
p=w/'natural_layers.py';s=p.read_text('utf8').replace('57+16*np.exp','43+14*np.exp').replace('[189,177,168]','[168,153,145]').replace('glint=np.exp','glint=.78*np.exp');p.write_text(s,'utf8')
