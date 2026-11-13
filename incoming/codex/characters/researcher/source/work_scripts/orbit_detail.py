# Register skin just outside the lids to the corresponding edge on the design.
# Pixels occupied by the iris and sclera are confined to their moving meshes.
idx,im=getimage(3);arr=np.array(im);h,w=arr.shape[:2]
f,valid=field_in_uv(0,3,(h,w));x,y,z=f.transpose(2,0,1);a=abs(x)
t=np.clip((a-source_x[0])/(source_x[-1]-source_x[0]),0,1)
lo=np.interp(a,source_x,lower);hi=np.interp(a,source_x,upper)
axis=np.array([0,.12,.27,.45,.63,.82,1.])
px=np.where(x<0,317-62*t,378+63*t)
photo_top=np.where(x<0,np.interp(t,axis,[201,197,192,190,190,194,202]),np.interp(t,axis,[200,195,190,188,189,193,199]))
photo_bot=np.where(x<0,np.interp(t,axis,[201,203,204,205,205,205,202]),np.interp(t,axis,[200,201,203,203,203,202,199]))
up=y>(lo+hi)/2
dist=np.where(up,np.maximum(0,y-hi),np.maximum(0,lo-y))
py=np.where(up,photo_top-1.6-dist*1300,photo_bot+1.2+dist*1350)
ref=np.array(Image.open(W/'face_ref.jpg').convert('RGB'),dtype=float)
photo=sample(ref,px,np.clip(py,177,223))*.74+[44,34,28]
mask=np.exp(-(dist/.0081)**2)*smooth((a-.026)/.003)*smooth((.066-a)/.004)*smooth((z-.025)/.022)*valid
arr[:,:,:3]=np.clip(arr[:,:,:3]*(1-mask[...,None])+photo*mask[...,None],0,255)
# Align the coloured lip edge with the rigged mouth seam, including both corners.
u=np.minimum(a/.023,1)
cx=350+np.sign(x)*np.minimum(57,a*2200)
line=326+7*u**2+1.3*np.sin(u*4)
yy=line-(y-1.54435)*1770
lips=sample(ref,cx,yy)*.68+[53,39,33]
mask=np.exp(-((y-1.545)/.012)**4)*smooth((.034-a)/.009)*smooth((z-.030)/.022)*valid
arr[:,:,:3]=np.clip(arr[:,:,:3]*(1-mask[...,None])+lips*mask[...,None],0,255);setimage(idx,Image.fromarray(arr))
# Fine tapered hairs on an animated brow surface, feathered at the inner corner.
idx,im=getimage(5);Wb,Hb=im.size;canvas=Image.new('RGBA',(Wb,Hb));rr=np.random.default_rng(187)
for side in (0,1):
 def pt(t,v):return ((.55+.365*t if side else .45-.365*t)*Wb,(.51+v)*Hb)
 for layer,count in [(0,650),(1,430)]:
  for i in range(count):
   t=rr.uniform(.01,.97);shape=np.sin(np.pi*t)**.6
   v=rr.uniform(-.084,.087)*shape*(1-.43*t)
   length=rr.uniform(.017,.065)*(.7+.4*t)
   lift=rr.uniform(.011,.053)*(1.1-.71*t);tone=int(rr.uniform(30,68))+(10 if layer else 0)
   points=[pt(t,v),pt(t+length*.47,v-lift*.68),pt(t+length,v-lift)]
   ImageDraw.Draw(canvas).line(points,fill=(tone+5,tone+1,tone,int(rr.uniform(104,192)*min(1,t*10,(1-t)*10))),width=3 if layer==0 else 1)
# Blur the alpha independently so partially covered texels carry the same hair colour.
aa=canvas.getchannel('A').filter(ImageFilter.GaussianBlur(1.1))
rgb=np.array(canvas);rgb[:,:,:3]=[54,48,45];rgb[:,:,3]=np.array(aa);setimage(idx,Image.fromarray(rgb))
for k,amount in [(1,.14),(4,.075)]:
 mat=j['materials'][k];mat['emissiveTexture']=copy.deepcopy(mat['pbrMetallicRoughness']['baseColorTexture']);mat['emissiveFactor']=[amount]*3
 if k==4:mat['alphaMode']='OPAQUE';mat['doubleSided']=True

idx,im=getimage(0);arr=np.array(im)
rgb=arr[:,:,:3].astype(float);red=smooth((rgb[:,:,0]-rgb[:,:,2]-10)/55)
rgb=rgb*(1-red[...,None])+(rgb*[.58,.57,.64]+[11,6,9])*red[...,None]
arr[:,:,:3]=np.uint8(np.clip(rgb,0,255));setimage(idx,Image.fromarray(arr))

# Warm, fine lash roots and the lower wet margin, registered to the eye aperture.
idx,im=getimage(3);arr=np.array(im)
ew=smooth((a-.026)/.003)*smooth((.065-a)/.004)*smooth((z-.023)/.021)*valid
upper_rim=ew*np.exp(-((y-hi-.00048)/.00125)**2)*.62
lower_rim=ew*np.exp(-((y-lo+.00052)/.00095)**2)*.37
rgb=arr[:,:,:3].astype(float)
rgb=rgb*(1-upper_rim[...,None])+np.array([86,60,53])*upper_rim[...,None]
rgb=rgb*(1-lower_rim[...,None])+np.array([159,108,98])*lower_rim[...,None]
arr[:,:,:3]=np.uint8(np.clip(rgb,0,255));setimage(idx,Image.fromarray(arr))
