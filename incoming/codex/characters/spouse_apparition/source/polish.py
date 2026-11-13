from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'render.py';s=p.read_text('utf8').replace('def setdir(bone,vec):','def setdir(bone,child,vec):').replace('(bone.tail-bone.head).normalized()','(child.head-bone.head).normalized()').replace('setdir(up,elbow-shoulder);setdir(lo,wrist-elbow)','setdir(up,lo,elbow-shoulder);setdir(lo,hand,wrist-elbow)')
p.write_text(s,'utf8')
p=w/'build.py';s=p.read_text('utf8').replace('q[:,0]-=np.sign(x)*.0045*jaw','q[:,0]+=np.sign(x)*.0015*jaw; q[:,1]+=.0047*ga(a/.034,(y-1.359)/.012)')
s=s.replace(' if mi==1:\n',''' if mi==0:
  def detail(raw,buf):
   for part in me['primitives']:
    mat=part['material'];ids=np.unique(acc(part['indices']));xx,yy,zz=raw[ids].T
    if mat==5:buf[ids,1]-=.009+.002*smooth((abs(xx)-.034)/.020)
    if mat in (1,2,4):
     ax=abs(xx);radius=np.exp(-((ax-.038)/.014)**2-((yy-1.436)/.014)**2)
     # Bridge the recessed socket below the moving iris.
     depth=np.interp(ax,[.015,.023,.030,.038,.045,.052,.059,.067],[.047,.046,.045,.042,.039,.034,.029,.025])
     blink_ids=(rest[0][:,0]>.027)&(rest[0][:,0]<.043)&(rest[0][:,1]>1.441)&(rest[0][:,1]<1.447)
     closed=np.clip(np.max(rest[0][blink_ids,1]-raw[blink_ids,1])/.012,0,1)
     buf[ids,2]=depth+.0018*radius-.0035*closed+{1:.00035,2:.00055,4:0}[mat]
    if mat in (1,2):
     buf[ids,0]+=.0016*np.sign(xx)-.09*(xx-np.sign(xx)*.036)
   return buf
  base=detail(q,base)
 if mi==1:
''').replace('put(deform(q+d)-base,i=target', 'put(detail(q+d,deform(q+d))-base,i=target')
s=s.replace('   if k==8:', '''   if k in (7,8):
    inside=smooth((1.31-y)/.085)*smooth((.23-abs(x))/.065)
    base[ids,2]-=(base[ids,2]+.018)*.28*inside
    base[ids,0]*=1-.13*inside
   if k==8:
    base[ids,1]-=neckrise(q[ids])*.84''')
s=s.replace('amp=smooth((.73-y)/.35);','inside=smooth((y-.49)/.19);base[ids,0]*=1-.15*inside;base[ids,2]*=1-.23*inside; amp=smooth((.73-y)/.35);')
s=s.replace("body=meshes[1]['primitives']","body=meshes[1]['primitives'];body[:]=[p for p in body if p['material']!=10]")
s=s.replace("elif k==1:a[:,:,:3]=np.stack((lum*.45+17,lum*.36+13,lum*.33+11),2).clip(0,255)","""elif k==1:
  for l in (0,a.shape[1]//2):
   side=a[:,l:l+a.shape[1]//2];iy,ix=np.where(side[:,:,3]>130);v,u=np.mgrid[:side.shape[0],:side.shape[1]];u=(u-(ix.max()+ix.min())/2)/(ix.ptp()/2) if hasattr(ix,'ptp') and False else (u-(ix.max()+ix.min())/2)/(np.ptp(ix)/2);v=(v-(iy.max()+iy.min())/2)/(np.ptp(iy)/2)
   rr=np.hypot(u,v);tone=60+6*np.sin(78*np.arctan2(v,u)+rr*4)-26*smooth((rr-.85)/.15);tone=17+(tone-17)*smooth((rr-.30)/.13)
   c=np.stack([tone+9,tone+3,tone],2);shine=np.exp(-((u+.28)/.12)**2-((v+.16)/.14)**2);side[:,:,:3]=np.uint8(c*(1-shine[...,None])+182*shine[...,None])""")
p.write_text(s,'utf8')
p=w/'tailoring.py';s=p.read_text('utf8').replace('sy=260+v*534','sy=266+v*341')
s=s.replace('return np.stack([(rx+r)*si,y,z0+(rz+r)*co],1)','return np.stack([(rx+r+.009)*np.sign(si)*abs(si)**.82,y,z0+(rz+r+.012)*np.sign(co)*abs(co)**.77],1)')
p.write_text(s,'utf8')
p=w/'bob.py';s=p.read_text('utf8').replace('1.525+.051','1.534+.058').replace('1.526+.037','1.535+.046').replace('1.471+.027','1.479+.031').replace('1.353+.010','1.345+.010').replace('end=row(side*(.064+.018','end=row(side*(.071+.018').replace('60*np.exp','60*np.exp')
s=s.replace('*(1-.61*v) if side==-1','*(1-.61*v)*smooth(v/.055) if side==-1')
p.write_text(s,'utf8')
