# The front locks sweep from an off-centre part down towards the temples.
# Each tapered ribbon carries many fine fibres in its own lengthwise UV coordinates.
groom=Geometry();groom_uv=[]
for side,nlocks in ((-1,32),(1,26)):
 for k in range(nlocks):
  t=np.linspace(0,1,32);r=(k+.4)/nlocks
  scatter=rng.uniform(-.003,.003)
  start=np.array([.022+.004*r,1.721+.014*r,.030-.060*r])
  c1=np.array([.022+side*(.023+.029*r),1.734+.004*np.sin(r*5),.074-.041*r])
  c2=np.array([side*(.044+.066*r),1.685+.015*r,.084-.056*r])
  end=np.array([side*(.004+.091*r**.84)+scatter,1.623+.047*(1-r)**2+.009*np.sin(6.8*r)+rng.uniform(-.009,.009),.069-.086*r**1.45])
  if side==1:end[1]+=.016*(1-r);end[0]=.035+.061*r+scatter
  path=(1-t[:,None])**3*start+3*(1-t[:,None])**2*t[:,None]*c1+3*(1-t[:,None])*t[:,None]**2*c2+t[:,None]**3*end
  path[:,2]+=.003*np.sin(t*np.pi*2+r*17)*np.sin(t*np.pi)
  tangent=unit(np.gradient(path,axis=0))
  n=unit(np.column_stack((path[:,0]*7.8,(path[:,1]-1.642)*10,(path[:,2]+.025)*9)))
  width=unit(np.cross(tangent,n))
  ww=(.002+.0047*np.sin(np.pi*t)**.55)*(1-.83*t**4)*rng.uniform(.73,1.23)
  ww*=1-.50*t**2;ww[-1]=.00004;off=len(groom.pos);offset=rng.random()*.8
  for a in range(len(t)):
   for c in range(7):
    f=(c-3)/3
    groom.pos.append(path[a]+width[a]*f*ww[a]+n[a]*(1-f*f)*ww[a]*.34)
    groom_uv.append((offset+.135*c/6,t[a]))
   if a:
    for c in range(6):
     h=off+(a-1)*7+c;groom.tri.extend([(h,h+7,h+1),(h+1,h+7,h+8)])
mat=material('Hair | swept forelocks with salt and pepper fibres',[1,1,1],.78)
h,w=512,1536
uu,vv=np.meshgrid(np.linspace(0,1,w),np.linspace(0,1,h))
phase=uu+.0015*np.sin(10*vv+uu*22)+.0007*np.cos(22*vv+32*uu)
lum=np.interp(phase*w,np.arange(w),rng.normal(0,8,w))+44+4*np.sin(15*uu+6*vv)
lum+=11*np.maximum(0,np.sin(760*uu+np.sin(vv*6)))**11
rgb=np.stack((lum*1.024,lum*.986,lum),axis=-1).clip(14,90).astype('uint8')
f=io.BytesIO();Image.fromarray(rgb).save(f,format='JPEG',quality=94)
j['images'].append({'name':'Brushed salt and pepper fibres','mimeType':'image/jpeg','bufferView':view(f.getvalue())})
j['textures'].append({'source':len(j['images'])-1})
j['materials'][mat]['pbrMetallicRoughness']['baseColorTexture']={'index':len(j['textures'])-1}
pr=groom.primitive(mat,head);pr['attributes']['TEXCOORD_0']=put(groom_uv,'VEC2');body.append(pr)
