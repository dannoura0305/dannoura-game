# Transfer cloth variation from the supplied frontal and rear design, using the original VRoid UVs.
ref=np.asarray(Image.open(W/'reference.jpg').convert('RGB'),dtype=np.float32)
for mat in (8,12):
 idx,im=getimage(mat);orig=np.array(im);hh,ww=orig.shape[:2]
 field,valid=field_in_uv(1,mat,(880,880))
 xx,yy,zz=field.transpose(2,0,1);ax=abs(xx)
 if mat==8:
  py=np.interp(yy,[.62,.78,1.04,1.23,1.43,1.53],[718,641,462,367,275,247])
  angle=np.arctan2(xx,(zz+.035)*1.28)
  # Take uninterrupted cloth from the broad back panels and elbow folds from the sleeve.
  back=sample(ref,752+np.sin(angle)*np.interp(py,[248,350,500,720],[42,59,57,91]),py).mean(2)
  v=np.clip((ax-.165)/.484,0,1);ay=268+254*v
  cx=np.interp(ay,[268,330,410,472,522],[108,90,73,64,61])
  xarm=cx+np.clip((yy-1.42)*290,-13,13)
  arm=sample(ref,xarm,ay).mean(2);armweight=smooth((ax-.18)/.065)*smooth((yy-1.33)/.038)
  cloth=back*(1-armweight)+arm*armweight
  folds=(np.clip(cloth,100,207)-167)*.78
  # Draw narrow overlapping turns of fabric at the left front hem.
  left=smooth((xx-.017)/.05)*smooth((zz+.028)/.06)
  hem=.627+.022*np.sin(12*xx+.7)+.08*xx
  for edge in (.025,.055):
   folds+=left*(-16*np.exp(-((yy-hem-edge)/.0028)**2)+9*np.exp(-((yy-hem-edge-.004)/.004)**2))
  folds+=(-5*np.cos(67*xx+5*yy)+2*np.cos(125*xx+4*yy))*smooth((1.09-yy)/.23)
 else:
  py=np.interp(yy,[.067,.22,.47,.66,1.12],[926,855,727,650,469]);side=np.sign(xx)
  cx=180+side*np.interp(py,[469,700,850,926],[29,51,56,66])
  samplex=cx+np.clip((ax-.095)*240,-16,16)
  cloth=sample(ref,samplex,np.maximum(py,734)).mean(2)
  folds=(np.clip(cloth,40,118)-72)*.63+3*np.sin(74*xx+6*yy)
 # Extend by a few texels to prevent bright seams on UV boundaries.
 folds=np.where(valid,folds,0);done=valid.copy()
 for _ in range(4):
  den=np.zeros_like(folds);total=np.zeros_like(folds)
  for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
   count=np.roll(done,(dy,dx),(0,1));den+=count;total+=np.roll(folds,(dy,dx),(0,1))*count
  grow=(~done)&(den>0);folds[grow]=total[grow]/den[grow];done|=grow
 fold=np.asarray(Image.fromarray(folds.astype('float32')).resize((ww,hh),Image.Resampling.BILINEAR))
 rgb=orig[:,:,:3].astype(np.float32);strength=smooth((rgb.mean(2)-(82 if mat==8 else 20))/(65 if mat==8 else 36))
 grain=rng.normal(0,2.0 if mat==8 else 1.3,(hh,ww))
 orig[:,:,:3]=np.clip(rgb+((fold+grain)*strength)[...,None],0,255);setimage(idx,Image.fromarray(orig))
