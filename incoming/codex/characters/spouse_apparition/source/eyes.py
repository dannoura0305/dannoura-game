inner=np.array([.0232,.025,.028,.031,.035,.039,.043,.047,.0505,.0535,.0553])
top=np.array([1.4344,1.4400,1.4434,1.4450,1.4463,1.4461,1.4455,1.4438,1.4417,1.4394,1.4357])
bottom=np.array([1.4344,1.4296,1.4273,1.4260,1.4249,1.4241,1.4241,1.4254,1.4274,1.4314,1.4357])
def ocular(raw,buf,neutral):
 for part in meshes[0]['primitives']:
  k=part['material'];ids=np.unique(acc(part['indices']));x,y,z=raw[ids].T;a=abs(x)
  if k==5:
   buf[ids,1]-=.009+.0018*smooth((a-.043)/.016);continue
  if k==0:continue
  lo=np.interp(a,inner,bottom);hi=np.interp(a,inner,top);t=np.clip((a-inner[0])/(inner[-1]-inner[0]),0,1)
  bell=np.sin(np.pi*t)**.84
  mid=1.4349-.0008*t
  newlo=mid-.0042*bell;newhi=mid+.0052*bell
  # Express the new rim in the working coordinates of the deformed face.
  xyzlo=deform(np.column_stack((x,lo,z)))[:,1];xyzhi=deform(np.column_stack((x,hi,z)))[:,1]
  edge=np.clip((y-lo)/np.maximum(.0002,hi-lo),0,1)
  fade=np.exp(-(np.maximum(np.maximum(lo-y,y-hi),0)/.011)**2)*smooth((a-.014)/.007)*smooth((.067-a)/.009)*smooth((z-.010)/.023)
  shift=((1-edge)*(newlo+.048-(lo-1.368)*.035-xyzlo)+edge*(newhi+.048-(hi-1.368)*.035-xyzhi))*fade
  if k in (3,6):buf[ids,1]+=shift
  if k in (1,2,4):
   if k in (1,2):buf[ids,0]+=.0015*np.sign(x);buf[ids,1]+=.0007+.18*(y-1.436)
   ax=abs(buf[ids,0]);ny=buf[ids,1]
   rim=np.interp(ax,[.009,.019,.025,.031,.036,.042,.049,.055],[.036,.038,.038,.037,.034,.030,.023,.016])
   u=(ax-.0328)/.011;v=(ny-1.4806)/.0079
   b=rim+.0022*np.exp(-u*u-.75*v*v)-.0017*np.minimum(v*v,2)
   for sign in (-1,1):
    r=rest[0];mark=(r[:,0]*sign>.027)&(r[:,0]*sign<.045)&(r[:,1]>1.440)&(r[:,1]<1.447)
    b-=.0035*(sign*x>0)*smooth(np.max(r[mark,1]-raw[mark,1])/.011)
   buf[ids,2]=b+{1:.0003,2:.0005,4:0}[k]
 return buf
