from lib import *
from skeleton import world,parent,bones
from texture import ref
def filepart(name):exec(compile((W/name).read_text('utf8'),str(W/name),'exec'),globals())
def newimg(name,im):
 f=io.BytesIO();im.save(f,format='PNG');j['images'].append({'name':name,'bufferView':view(f.getvalue()),'mimeType':'image/png'})
 j['textures'].append({'source':len(j['images'])-1});return len(j['textures'])-1
def mattex(name,im,rough=.88):
 k=material(name,[1.,1.,1.],rough);j['materials'][k]['pbrMetallicRoughness']['baseColorTexture']={'index':newimg(name,im)};return k
def neckrise(p):
 x,y,z=p.T
 return .048*smooth((y-1.307)/.059)*smooth((.131-abs(x))/.043)
def deform(p,face=False):
 x,y,z=p.T;a=abs(x);q=p.copy();front=smooth((z+.012)/.054)
 # Vertices and socket parts share the same continuous transformation, in every expression.
 eye=np.exp(-((y-1.436)/.024)**4)*smooth((.080-a)/.012)*smooth((a-.010)/.013)*front
 q[:,0]-=.23*(x-np.sign(x)*.037)*eye
 q[:,1]-=.43*(y-1.435)*eye+.0046*smooth((a-.040)/.017)*eye
 jaw=ga((y-1.380)/.027,(a-.046)/.028);q[:,0]+=np.sign(x)*.0015*jaw; q[:,1]+=.0055*ga(a/.032,(y-1.359)/.021)
 q[:,2]+=front*(.009*ga(x/.013,(y-1.421)/.018)+.005*ga((a-.009)/.008,(y-1.405)/.009)+.003*ga(a/.025,(y-1.384)/.013)-.004*ga((a-.054)/.026,(y-1.392)/.026))
 head=smooth((y-1.337)/.031)*smooth((.138-a)/.046)
 q[:,0]*=1-.137*head;q[:,1]-=(y-1.368)*.035*head;q[:,2]-=.085*(z+.022)*head
 q[:,1]+=neckrise(p);return q
filepart('eyes.py')
for mi,me in enumerate(meshes):
 pr=me['primitives'][0];attrs=pr['attributes'];q=rest[mi];base=deform(q)
 if mi==0:
  def detail(raw,buf):return ocular(raw,buf,q)
  base=detail(q,base)
 if mi==1:
  for part in me['primitives']:
   k=part['material'];ids=np.unique(acc(part['indices']));x,y,z=q[ids].T
   if k in (7,8):
    inside=smooth((1.31-y)/.085)*smooth((.23-abs(x))/.065)
    base[ids,2]-=(base[ids,2]+.018)*.28*inside
    base[ids,0]*=1-.13*inside
   if k==8:
    base[ids,1]-=neckrise(q[ids])*.84
    # Tuck the shirt into the trousers and clear the watch at both cuffs.
    a=abs(x);below=smooth((1.03-y)/.20)
    base[ids,0]*=1-.19*below;base[ids,2]*=1-.26*below
    base[ids,1]+=.115*below
    base[ids,0]-=np.sign(x)*.038*smooth((a-.41)/.14)
   if k==9:
    inside=smooth((y-.49)/.19);base[ids,0]*=1-.15*inside;base[ids,2]*=1-.23*inside; amp=smooth((.73-y)/.35);base[ids,0]+=.18*amp*(x-np.sign(x)*.077)
 put(base,i=attrs['POSITION'],bounds=True);tris=[acc(p['indices']).reshape(-1,3) for p in me['primitives']]
 nrm=normals(base,tris,acc(attrs['NORMAL']))
 if mi==0:
  ids=np.unique(acc(me['primitives'][3]['indices']));_,inv=np.unique(np.round(base[ids],5),axis=0,return_inverse=True);grp=np.zeros((inv.max()+1,3));np.add.at(grp,inv,nrm[ids]);nrm[ids]=unit(grp[inv])
 put(nrm,i=attrs['NORMAL'])
 if mi==0:
  for target in pr['targets']:
   d=acc(target['POSITION']);put(detail(q+d,deform(q+d))-base,i=target['POSITION'],bounds=True)
# Move the neutral head joint up with the longer neck; preserve inverse-bind transforms.
offsets={i:np.array([0.,.048,0.]) if (i==bones['head']['node'] or 'Hair' in n.get('name','') and i in parent or n.get('name','').startswith('J_Adj_') and 'Eye' in n.get('name','')) else np.zeros(3) for i,n in enumerate(j['nodes'])}
def in_head(i):return i==bones['head']['node'] or i in parent and in_head(parent[i])
for i in world:offsets[i]=np.array([0.,.048,0.]) if in_head(i) else np.zeros(3)
for i,pa in parent.items():
 delta=offsets[i]-offsets[pa]
 if np.any(delta):
  n=j['nodes'][i];n['translation']=(np.array(n.get('translation',[0]*3))+np.linalg.solve(world[pa][:3,:3],delta)).tolist()
for sk in j['skins']:
 idx=sk['inverseBindMatrices'];ib=acc(idx)
 for k,i in enumerate(sk['joints']):
  m=ib[k].reshape(4,4).T;m[:3,3]-=m[:3,:3]@offsets[i]
 put(ib,'MAT4',target=None,i=idx)
for k in range(13):
 m=j['materials'][k];mt=m['extensions']['VRMC_materials_mtoon'];mt.update(outlineWidthMode='none',parametricRimColorFactor=[0,0,0],matcapFactor=[0,0,0],shadingToonyFactor=.30,shadeColorFactor=[.82,.80,.80]);m['emissiveFactor']=[0,0,0];m['pbrMetallicRoughness']['roughnessFactor']=.84
 idx,im=getimage(k);a=np.array(im);rgb=a[:,:,:3].astype(float);lum=rgb.mean(2)
 if k==3:a=np.array(Image.open(W/'tex3.png'))
 elif k==9:a=np.array(Image.open(W/'tex9.png'))
 elif k==7:
  skin=smooth((rgb[:,:,0]-rgb[:,:,2]-3)/22)*smooth((lum-105)/45)
  rgb=rgb*(1-skin[...,None])+(np.array([175,156,149])+(lum-209)[...,None]*.30)*skin[...,None];a[:,:,:3]=rgb.clip(0,255)
 elif k==8:a[:,:,:3]=np.stack((lum*.54+24,lum*.52+23,lum*.53+25),2).clip(0,255)
 elif k==11:a[:,:,:3]=np.stack((lum*.32+17,lum*.30+16,lum*.30+16),2).clip(0,255)
 elif k==1:
  for l in (0,a.shape[1]//2):
   side=a[:,l:l+a.shape[1]//2];iy,ix=np.where(side[:,:,3]>130);v,u=np.mgrid[:side.shape[0],:side.shape[1]];u=(u-(ix.max()+ix.min())/2)/(ix.ptp()/2) if hasattr(ix,'ptp') and False else (u-(ix.max()+ix.min())/2)/(np.ptp(ix)/2);v=(v-(iy.max()+iy.min())/2)/(np.ptp(iy)/2)
   rr=np.hypot(u,v);tone=60+6*np.sin(78*np.arctan2(v,u)+rr*4)-26*smooth((rr-.85)/.15);tone=17+(tone-17)*smooth((rr-.30)/.13)
   c=np.stack([tone+9,tone+3,tone],2);shine=np.exp(-((u+.28)/.12)**2-((v+.16)/.14)**2);side[:,:,:3]=np.uint8(c*(1-shine[...,None])+182*shine[...,None])
 elif k==2:a[:,:,3]=np.uint8(a[:,:,3]*.26)
 elif k==4:a[:,:,:3]=(rgb*.61+[19,13,12]).clip(0,255);m['alphaMode']='OPAQUE'
 elif k==5:a[:,:,:3]=[71,55,49];a[:,:,3]=np.uint8(a[:,:,3]*.63)
 elif k==6:a[:,:,:3]=[80,55,46];a[:,:,3]=np.uint8(a[:,:,3]*.28)
 elif k==10:a[:,:,:3]=[44,36,35]
 setimage(idx,Image.fromarray(a))
 if k in (1,4):
  m['emissiveTexture']=copy.deepcopy(m['pbrMetallicRoughness']['baseColorTexture']);m['emissiveFactor']=[.105 if k==1 else .065]*3
 if k==3:m.pop('normalTexture',None)
 if k in (3,7):m['pbrMetallicRoughness']['baseColorFactor']=[1.,1.,1.,1.]
body=meshes[1]['primitives'];body[:]=[p for p in body if p['material']!=10]
filepart('tailoring.py')
filepart('bob.py')
meta=j['extensions']['VRMC_vrm']['meta'];meta.update(name='配偶者に似た異形',version='1.0')
savegltf(OUT/'spouse_apparition.vrm',j)
plain=copy.deepcopy(j)
for k,m in enumerate(plain['materials']):
 m.pop('extensions',None)
 if k in (2,5,6):m['alphaMode']='BLEND'
 elif m.get('alphaMode')=='BLEND':m['alphaMode']='MASK';m['alphaCutoff']=.25
plain.pop('extensions',None);plain['extensionsUsed']=['KHR_texture_transform'];plain.pop('extensionsRequired',None)
savegltf(OUT/'spouse_apparition.glb',plain)
print('BUILT',len(body),len(meta['name']),len(binary))
