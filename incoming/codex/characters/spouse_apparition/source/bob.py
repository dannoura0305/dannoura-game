old=meshes[2]['primitives'][0];ha=old['attributes']
orig=rest[2];uniq=np.unique(np.round(orig/.009),axis=0,return_index=True)[1]
samples=orig[uniq];hj=acc(ha['JOINTS_0'])[uniq];hw=acc(ha['WEIGHTS_0'])[uniq]
def hairpos(r,t,side,outer=0):
 p=np.pi*r;n=len(t);rear=(1-r**4);front=np.cos(p)
 def row(x,y,z):return np.stack((np.broadcast_to(x,(n,)),np.broadcast_to(y,(n,)),np.broadcast_to(z,(n,))),1)
 edge=.005*np.sin(47*r+side)+.0035*np.sin(83*r)+.004*np.cos(23*r)
 root=row(.020*(1-r)**1.5,1.536+.073*np.sin(p)**.8-.054*r,.060-.198*r)
 c1=row(root[:,0]+side*(.035+.024*np.sin(p))*rear,1.537+.059*np.sin(p)-.060*r,.079-.227*r)
 c2=row(side*(.057+.043*np.sin(.36+p*.81))*rear,1.479+.031*np.sin(p)-.045*r,.073-.225*r)
 c3=row(side*(.080+.021*np.sin(p))*rear,1.416+.009*np.sin(p)-.038*r,.051-.210*r)
 end=row(side*(.071+.018*np.sin(p))*rear,1.345+.010*r+.013*max(0,side)*(1-r)+edge,.022-.156*r)
 if side==-1:
  c1[:,0]+=.010*(1-r)**4;c2[:,0]+=.043*(1-r)**4;c2[:,1]-=.022*(1-r)**3;c3[:,0]+=.019*(1-r)**4
 # Keep the front of the part round and overlap the two fine hairlines.
 root[:,0]-=side*.00015*np.exp(-r*6)
 knots=np.stack((root,c1,c2,c3,end));i=np.clip(np.floor(t*4).astype(int),0,3);f=(t*4-i)[:,None];ix=np.arange(n)
 p0=knots[np.maximum(i-1,0),ix];p1=knots[i,ix];p2=knots[i+1,ix];p3=knots[np.minimum(i+2,4),ix]
 pos=.5*((2*p1)+(-p0+p2)*f+(2*p0-5*p1+4*p2-p3)*f**2+(-p0+3*p1-3*p2+p3)*f**3)
 normal=unit(np.column_stack((pos[:,0],(pos[:,1]-1.47)*.65,pos[:,2]+.033)))
 wave=.0021*np.sin(73*r+6*t+1.1*np.sin(t*6))*np.sin(np.pi*t)
 pos[:,0]+=side*.006*np.sin(t*7.4+r*6)*smooth((t-.37)/.55)
 pos[:,2]+=.004*np.sin(r*20+t*5)*t**2
 pos+=normal*(wave+outer)[:,None];pos[:,1]+=.048;return pos
def hairmap(side):
 h,w=780,1024;v,u=np.mgrid[0:h,0:w];v=v/h;u=u/w
 phase=u+.007*np.sin(3*v+8*u)+.006*np.sin(8*v+4*u)+.001*np.sin(15*v+52*u)
 fibres=np.interp(phase*w,np.arange(-35,w+35),rng.normal(0,6.8,w+70))
 streak=(56*np.exp(-((phase-.091)/.061)**2)+21*np.exp(-((phase-.175)/.009)**2))*(1-.38*v)*(.33+.67*smooth(v/.075)) if side==-1 else 0
 lum=43+fibres+6*np.sin(48*phase)+3.2*np.sin(540*phase+v*4)+streak
 return Image.fromarray(np.uint8(np.clip(np.stack((lum+6,lum+1,lum+.5),-1),14,170)))
def hairprim(pos,uv,tri,ma):
 tri=np.array(tri);pos=np.array(pos);uv=np.array(uv);query=pos-[0,.048,0]
 near=np.concatenate([np.argmin(((block[:,None,:]-samples[None,:,:])**2).sum(2),1) for block in np.array_split(query,max(1,len(query)//240))])
 p={'attributes':{'POSITION':put(pos,bounds=True),'NORMAL':put(normals(pos,[tri],np.zeros_like(pos))),'TEXCOORD_0':put(uv,'VEC2'),'JOINTS_0':put(hj[near],'VEC4',5123),'WEIGHTS_0':put(hw[near],'VEC4')},'indices':put(tri,'SCALAR',5123,34963),'material':ma,'mode':4};return p
groom=[]
for side in (-1,1):
 ma=mattex('Chestnut bob | silver part' if side==-1 else 'Chestnut bob | shaded side',hairmap(side),.81)
 def addgrid(pos,uv,tri,r,t,extr):
  nv,nu=r.shape;off=len(pos);computed=hairpos(r.ravel(),t.ravel(),side,np.broadcast_to(extr,r.shape).ravel())
  pos.extend(computed);uv.extend(np.column_stack((r.ravel(),t.ravel())))
  for iy in range(nv-1):
   for ix in range(nu-1):
    a=off+iy*nu+ix;b=a+1;c=a+nu;d=c+1
    tri.extend([(a,c,b),(b,c,d)] if side==-1 else [(a,b,c),(b,d,c)])
 pos=[];uv=[];tri=[];r,t=np.meshgrid(np.linspace(0,1,87),np.linspace(0,1,40));addgrid(pos,uv,tri,r,t,0)
 for k in range(105):
  center=(k+.5)/106;start=rng.uniform(.03,.43);length=rng.uniform(.95,1.13);v=np.linspace(0,1,25)
  mid=center+rng.uniform(-.014,.014)*np.sin(v*np.pi)+.013*np.sin(4*v+center*35)*v
  width=rng.uniform(.0013,.0047)*np.maximum(.035,np.sin(np.pi*v)**.6)
  rr=np.clip(mid[:,None]+width[:,None]*np.array([-1,0,1]),0,1)
  tt=np.tile((start+(length-start)*v)[:,None],(1,3))
  lift=(.001+.0015*np.sin(v*2.7))[:,None]+width[:,None]*np.array([0,.25,0])
  addgrid(pos,uv,tri,rr,tt,lift)
 groom.append(hairprim(pos,uv,tri,ma))
meshes[2]['primitives']=groom
