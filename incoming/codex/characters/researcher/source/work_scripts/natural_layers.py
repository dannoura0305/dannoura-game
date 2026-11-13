# Paint colour on the moving brow, iris and eyelid meshes separately.
# Their surfacing follows facial expression and eye-look motion.
for mat in (1,2,4,5,6):
 idx,im=getimage(mat);arr=np.array(im);h,w=arr.shape[:2];yy,xx=np.mgrid[:h,:w]
 if mat==1:
  for left in (0,w//2):
   region=arr[:,left:left+w//2];oy,ox=np.where(region[:,:,3]>90)
   cx=(ox.min()+ox.max())/2;cy=(oy.min()+oy.max())/2
   u=(xx[:,:w//2]-cx)/((ox.max()-ox.min())/2);v=(yy[:,:w//2]-cy)/((oy.max()-oy.min())/2)
   r=np.sqrt(u*u+v*v);t=np.arctan2(v,u)
   fibre=(np.sin(113*t+4*r)+.6*np.sin(187*t-8*r)+.42*np.sin(43*t+3*r))*4.8
   lum=43+14*np.exp(-((r-.54)/.17)**2)+fibre-22*smooth((r-.80)/.19)
   eye=np.stack([lum+10,lum+2,lum-4],axis=-1)
   pupil=smooth((r-.32)/.075)
   eye=eye*pupil[...,None]+np.array([11,10,11])*(1-pupil[...,None])
   glint=.78*np.exp(-((u+.23)/.14)**2-((v+.06)/.11)**2)
   eye=eye*(1-glint[...,None]) + np.array([216,204,192])*glint[...,None]
   region[:,:,:3]=np.clip(eye,0,255)
 if mat==2:
  # One soft corneal glint in the same lighting direction in both eyes.
  arr[:,:,:3]=[231,221,211]
  for l in (0,w//2):
   field=arr[:,l:l+w//2,3];u=xx[:,:w//2];v=yy[:,:w//2]
   field[:]=(75*np.exp(-((u-235)/13.)**2-((v-211)/12.)**2)).astype('uint8')
 if mat==4:
  f,ok=field_in_uv(0,4,(h,w));x,y,z=f.transpose(2,0,1);ax=abs(x)
  side=smooth((abs(ax-.044)-.008)/.014)
  fold=smooth((y-1.612)/.011)
  base=np.array([168,153,145])+np.zeros((h,w,3),np.float32)
  base-=fold[...,None]*[24,25,24];base+=side[...,None]*[3,-8,-8]
  arr[:,:,:3]=np.uint8(np.clip(base,0,255))
 if mat==5:
  # Separate the reference brow hairs from their surrounding skin tone, then
  # register them independently to the two animated brow strips.
  ref=np.array(Image.open(W/'face_ref.jpg').convert('RGB'),dtype=float)
  for l,side in ((0,-1),(w//2,1)):
   u=xx[:,:w//2]/(w//2-1);v=yy[:,:w//2]/(h-1)
   travel=(u-.10)/.81 if side>0 else (.90-u)/.81
   q=np.clip(travel,0,1)
   px=371+80*q if side>0 else 325-80*q
   py=np.interp(q,[0,.2,.46,.7,1],([163,160,157,158,163] if side>0 else [164,161,160,161,166]))
   dy=(v-.51)*83
   brow=sample(ref,px,py+dy).mean(2)
   skin=sample(ref,px,np.maximum(140,py-13)).mean(2)
   taper=smooth(travel/.15)*smooth((1-travel)/.20)
   a=np.clip((skin-brow+1)/78,0,.92)*np.exp(-(dy/(6.5+2.0*np.sin(np.pi*q)))**4)*taper
   grain=.92+.08*np.cos(2*np.pi*(u*154+v*(12+18*q)))**2
   arr[:,l:l+w//2,3]=np.uint8(255*a*grain)
   val=np.clip(brow*.26+15,22,64)
   arr[:,l:l+w//2,:3]=np.stack([val+6,val+2,val],2).astype('uint8')
 if mat==6:
  arr[:,:,:3]=[88,64,59];arr[:,:,3]=np.asarray(arr[:,:,3]*.48,dtype='uint8')
 setimage(idx,Image.fromarray(arr))
 if mat in (1,2,4):j['materials'][mat]['pbrMetallicRoughness']['roughnessFactor']=.51
 if mat==5:j['materials'][mat]['alphaMode']='BLEND'
