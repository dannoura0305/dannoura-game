from lib import *
ref=np.array(Image.open(W/'reference.jpg').convert('RGB'),float)
portrait=np.array(Image.open(W/'straight.jpg').convert('RGB'),float)
def edgefill(rgb,valid,steps=6):
 rgb=rgb.copy();ok=valid.copy()
 for _ in range(steps):
  num=np.zeros_like(rgb);den=np.zeros(ok.shape,np.float32)
  for di in [(0,1),(0,-1),(1,0),(-1,0)]:
   mask=np.roll(ok,di,(0,1));num+=np.roll(rgb,di,(0,1))*mask[...,None];den+=mask
  new=(~ok)&(den>0);rgb[new]=num[new]/den[new,None];ok|=new
 return rgb
def baked(k,mi,size,fn):
 idx,src=getimage(k);f,ok=field_in_uv(mi,k,(size,size));rgb=fn(*f.transpose(2,0,1))
 rgb=edgefill(rgb,ok);arr=np.array(src.resize((size,size))).copy();arr[:,:,:3]=np.uint8(np.clip(rgb,0,255));return Image.fromarray(arr)
def face(x,y,z):
 ax=abs(x);Y=np.interp(y,[1.353,1.363,1.38,1.385,1.405,1.423,1.436,1.465,1.49,1.54],[410,393,350,327,278,236,208,164,125,66])
 X=287+x*np.interp(y,[1.35,1.385,1.405,1.436,1.51],[1780,1830,1700,1590,1600]);photo=sample(portrait,X,Y)
 # Reserve the animated ocular and brow surfaces, including the hair-overlapped temple.
 bare=sample(portrait,308+12*np.sin(X*.03),np.clip(Y,95,151))
 forehead=smooth((192-Y)/29)*smooth((270-X)/46)+smooth((185-Y)/25)*smooth((X-358)/28)
 eyes=np.exp(-((ax-.039)/.025)**4-((y-1.436)/.010)**4)
 brows=np.exp(-((ax-.038)/.036)**4-((y-1.464)/.010)**4)
 mf=np.clip(forehead+eyes+brows,0,1);skin=photo*(1-mf[...,None])+bare*mf[...,None]
 # Keep colour landmarks on the front, fading cleanly onto the ears and scalp.
 base=np.array([174,154,148])+np.zeros_like(skin);weight=smooth((z+.007)/.049)*smooth((.080-ax)/.023)*smooth((y-1.350)/.014)
 return base*(1-weight[...,None])+(skin*.77+[42,32,29])*weight[...,None]
def coat(x,y,z):
 a=abs(x);py=np.interp(y,[.76,.85,1.,1.12,1.24,1.41],[810,699,533,398,284,222])
 phi=np.arctan2(x,z+.033);px=756+np.sin(phi)*np.interp(py,[220,310,510,820],[38,58,72,89])
 c=sample(ref,px,np.clip(py,249,796))
 sleeve=smooth((a-.145)/.065)*smooth((y-1.16)/.07)
 v=np.clip((a-.14)/.4,0,1);sy=259+139*v
 arm=sample(ref,105+5*np.sin(v*8)+np.clip((y-1.29)*135,-12,12),sy)
 c=c*(1-sleeve[...,None])+arm*sleeve[...,None];l=np.clip(c.mean(2),95,211)
 wrinkle=(4*np.sin(58*x+5*y)+2*np.sin(110*x-4*y))*smooth((1.15-y)/.28)
 l=166+(l-166)*.84+wrinkle+1.8*np.sin(1040*y+5*np.sin(x*65))
 trim=sleeve*smooth((a-.522)/.009)
 return np.stack([l+4-19*trim,l+1-26*trim,l-1-10*trim],axis=-1)
def trousers(x,y,z):
 l=sample(ref,np.clip(143+(abs(x)-.08)*296,120,163),np.clip(940-y*155,836,934)).mean(2)
 return np.stack([l*.86+11,l*.86+9,l*.86+10],2)
def shirt(x,y,z):
 l=sample(ref,np.clip(184+x*150,172,197),np.clip(392-(y-1.0)*350,273,385)).mean(2)
 l=np.clip(l,63,149)*.83+15
 return np.stack([l+1,l,l+3],2)
if __name__=='__main__':
 for k,mi,n,fn in [(3,0,1024,face),(8,1,1024,coat),(9,1,768,trousers),(7,1,1024,shirt)]:
  baked(k,mi,n,fn).save(W/f'tex{k}.png')
