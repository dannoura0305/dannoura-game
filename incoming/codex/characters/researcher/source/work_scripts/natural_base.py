"""Refine the exported VRoid avatar while retaining humanoid, face morphs and spring bones."""
import copy, io, json, math, struct
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
W=Path(__file__).resolve().parent
OUT=W.parents[1]/'outputs'/'researcher'/'natural_face'
OUT.mkdir(parents=True,exist_ok=True)
src=OUT.parent/'研究者_調整版.vrm'
raw=src.read_bytes(); jl=struct.unpack_from('<I',raw,12)[0]
j=json.loads(raw[20:20+jl]); binary=bytearray(raw[28+jl:]);rng=np.random.default_rng(301)
types={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}
dims={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']]
 return np.frombuffer(binary,types[a['componentType']],count=a['count']*dims[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],-1).copy()
def view(data,target=None):
 binary.extend(b'\0'*(-len(binary)%4));o=len(binary);binary.extend(data);v={'buffer':0,'byteOffset':o,'byteLength':len(data)}
 if target:v['target']=target
 j['bufferViews'].append(v);return len(j['bufferViews'])-1
def put(arr,typ='VEC3',ct=5126,target=34962,i=None,bounds=False):
 a=np.asarray(arr,dtype=types[ct]).reshape(-1,dims[typ]);v={'bufferView':view(a.tobytes(),target),'componentType':ct,'count':len(a),'type':typ}
 if bounds:v.update(min=a.min(0).tolist(),max=a.max(0).tolist())
 if i is None:j['accessors'].append(v);return len(j['accessors'])-1
 j['accessors'][i]=v;return i
def smooth(x):x=np.clip(x,0,1);return x*x*(3-2*x)
def ga(a,b):return np.exp(-np.minimum(80,a*a+b*b))
def sculpt(pos,hair=False):
 x,y,z=pos.T;a=abs(x);q=pos.copy();front=smooth((z+.045)/.086)
 eye=np.exp(-((a-.04)/.038)**4-((y-1.616)/.028)**4)*front
 q[:,0]+=-np.sign(x)*(a-.040)*.28*eye
 q[:,1]-=(y-1.615)*.33*eye
 jaw=ga((y-1.528)/.030,(a-.038)/.033)*front
 q[:,0]+=np.sign(x)*.0048*jaw
 q[:,1]-=.0045*ga(a/.055,(y-1.524)/.032)*front
 q[:,2]+=front*(.013*ga(x/.012,(y-1.594)/.027)+.002*ga(x/.019,(y-1.572)/.013)+.006*ga((a-.012)/.006,(y-1.570)/.008)+.005*ga(a/.029,(y-1.524)/.020)+.004*ga((a-.051)/.022,(y-1.594)/.015)-.006*ga((a-.056)/.027,(y-1.556)/.028))
 q[:,0]+=x*.11*ga(x/.034,(y-1.549)/.012)*front
 q[:,2]+=.003*ga((a-.036)/.026,(y-1.633)/.012)*front
 q[:,2]-=.0075*ga(x/.014,(y-1.573)/.010)*front
 q[:,0]+=np.sign(x)*.0028*ga((a-.048)/.026,(y-1.534)/.021)*front
 if hair:
  q[:,1]-=.016*smooth((y-1.676)/.060)
  q[:,2]+=.012*smooth((-z-.065)/.055)
  f=smooth((z+.008)/.074)*smooth((y-1.58)/.055)
  q[:,1]+=.053*f*ga((x-.007)/.068,(y-1.659)/.065)
  q[:,0]+=.026*f*ga((x+.013)/.078,(y-1.675)/.069)*np.tanh((x-.018)/.018)
  q[:,1]-=.008*ga((a-.087)/.035,(y-1.587)/.050)
 # Gradual transition at the neck; clothing, arms and hands remain at their authored scale.
 blend=smooth((y-1.47)/.06)*smooth((.16-a)/.045)
 q[:,0]*=1-.14*blend;q[:,1]-=(q[:,1]-1.49)*.095*blend;q[:,2]-=(q[:,2]+.015)*.105*blend
 return q
def normals(q,tri,old):
 n=np.zeros_like(q)
 for ix in tri:
  aa,bb,cc=ix.T;fn=np.cross(q[bb]-q[aa],q[cc]-q[aa])
  for col in ix.T:np.add.at(n,col,fn)
 length=np.linalg.norm(n,axis=1,keepdims=True);return np.where(length>1e-9,n/np.maximum(length,1e-12),old)
exec(compile((W/'orbital_fit.py').read_text('utf8'),str(W/'orbital_fit.py'),'exec'))
exec(compile((W/'natural_shapes.py').read_text('utf8'),str(W/'natural_shapes.py'),'exec'))
meshes=j['meshes'];rest={}
for mi,me in enumerate(meshes):
 pr=me['primitives'][0];a=pr['attributes'];ip=a['POSITION'];q=acc(ip);rest[mi]=q.copy()
 material_ids={p['material']:np.unique(acc(p['indices'])) for p in me['primitives']}
 orbital_surfaces={p['material']:acc(p['indices']).reshape(-1,3) for p in me['primitives']}
 def deform(points):
  result=sculpt(points,mi==2)
  if mi==0:
   for pr2 in me['primitives']:
    mat=pr2['material']
    if mat not in (1,2,5):continue
    ix=np.unique(acc(pr2['indices']));x,y,z=points[ix].T
    if mat==5:
     result[ix,1]+=.002-.18*(abs(x)-.036)-.0052*smooth((abs(x)-.045)/.019)
    else:
     result[ix,0]-=.20*(x-np.sign(x)*.039)
     result[ix,1]-=.09*(y-1.615)
  if mi==1:
   for layer in me['primitives']:
    mat=layer['material']
    if mat not in (8,12):continue
    ids=np.unique(acc(layer['indices']));xx,yy,zz=points[ids].T;ax=abs(xx)
    if mat==8:
     hem=smooth((1.06-yy)/.33)*smooth((.37-ax)/.12)
     result[ids,0]-=xx*.062*hem
     result[ids,1]+=hem*(.008*np.sin(17*xx+2)+.006*np.sin(31*xx-1))
     wave=.0045*hem*np.cos(48*xx+8*yy)
    else:
     wave=.0035*(ga((yy-.49)/.09,(ax-.092)/.12)+ga((yy-.17)/.08,(ax-.10)/.11))*np.sin(67*yy+20*xx+3*np.sin(8*xx))
    result[ids,2]+=wave*np.tanh((zz+.025)/.025)
  return organic_face(points,result,mi,material_ids) if mi!=2 else result
 new=deform(q);put(new,i=ip,bounds=True)
 tris=[acc(t['indices']).reshape(-1,3) for t in me['primitives']]
 nr=normals(new,tris,acc(a['NORMAL']));put(nr,i=a['NORMAL'])
 if mi==0:
  for target in pr.get('targets',[]):
   k=target['POSITION'];d=acc(k)
   put(deform(q+d)-new,i=k,bounds=True)
def getimage(k):
 m=j['materials'][k];t=m['pbrMetallicRoughness']['baseColorTexture']['index'];idx=j['textures'][t]['source'];v=j['bufferViews'][j['images'][idx]['bufferView']];im=Image.open(io.BytesIO(binary[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGBA')
 return idx,im
def setimage(idx,im):
 o=io.BytesIO();im.save(o,format='PNG');j['images'][idx].update(bufferView=view(o.getvalue()),mimeType='image/png')
def field_in_uv(mi,k,shape):
 pr=next(p for p in meshes[mi]['primitives'] if p['material']==k);uv=acc(pr['attributes']['TEXCOORD_0'])*[shape[1]-1,shape[0]-1];pts=rest[mi]
 field=np.zeros((*shape,3),np.float32);ok=np.zeros(shape,bool)
 for tri in acc(pr['indices']).reshape(-1,3):
  t=uv[tri];lo=np.maximum(0,np.floor(t.min(0)).astype(int));hi=np.minimum([shape[1]-1,shape[0]-1],np.ceil(t.max(0)).astype(int))
  if np.any(hi<lo):continue
  x0,y0=lo;x1,y1=hi+1;yy,xx=np.ogrid[y0:y1,x0:x1];u,v=t[1]-t[0];s,r=t[2]-t[0];det=u*r-v*s
  if abs(det)<1e-8:continue
  dx=xx-t[0,0];dy=yy-t[0,1];b=(r*dx-s*dy)/det;c=(u*dy-v*dx)/det;a=1-b-c;inside=(a>=-.018)&(b>=-.018)&(c>=-.018)
  out=field[y0:y1,x0:x1];out[inside]=(a[...,None]*pts[tri[0]]+b[...,None]*pts[tri[1]]+c[...,None]*pts[tri[2]])[inside];ok[y0:y1,x0:x1]|=inside
 return field,ok
def sample(img,x,y):
 h,w=img.shape[:2];x=np.clip(x,0,w-1.01);y=np.clip(y,0,h-1.01);i=x.astype(int);l=y.astype(int);a=(x-i)[...,None];b=(y-l)[...,None]
 return (1-b)*((1-a)*img[l,i]+a*img[l,i+1])+b*((1-a)*img[l+1,i]+a*img[l+1,i+1])
def cleaned_portrait():
 ref=Image.open(W/'face_ref.jpg').convert('RGB');mask=Image.new('L',ref.size);d=ImageDraw.Draw(mask)
 left=[(213,200),(231,190),(234,182),(256,176),(290,173),(315,177),(331,184),(333,202),(328,224),(317,240),(298,245),(264,245),(244,240),(236,226),(231,190)]
 right=[(367,187),(378,177),(409,172),(442,173),(459,179),(465,187),(461,215),(454,232),(438,241),(408,243),(387,239),(375,229),(367,210),(367,187)]
 for path in [left,right,[(330,188),(339,185),(351,186),(367,188)],[(462,183),(480,192),(496,204)],[(210,201),(194,217)]]:d.line(path,fill=255,width=10,joint='curve')
 # Omit the eyes and brows painted onto the source. These are moving parts on the avatar.
 for box in [(245,182,323,216),(375,180,447,216),(237,150,326,175),(373,146,452,174)]:
  d.ellipse(box,fill=255)
 refarr=np.array(ref).astype(float);m=np.asarray(mask)>0
 # Nearest boundary expansion with isotropic diffusion inside the small occluded regions.
 a=refarr.copy();done=~m
 for _ in range(60):
  num=np.zeros_like(a);den=np.zeros(done.shape,float)
  for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
   valid=np.roll(done,(dy,dx),(0,1));num+=np.roll(a,(dy,dx),(0,1))*valid[...,None];den+=valid
  fill=(~done)&(den>0)
  if not fill.any():break
  a[fill]=num[fill]/den[fill,None];done|=fill
 for _ in range(36):
  avg=sum(np.roll(a,(dy,dx),(0,1)) for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)])*.25;a[m]=avg[m]
 return a

def facecolor():
 idx,im=getimage(3);arr=np.asarray(im).copy();h,w=arr.shape[:2];f,ok=field_in_uv(0,3,(h,w));x,y,z=f.transpose(2,0,1);ax=abs(x)
 # Register the neutral facial planes to the eye line, nose tip, lips and chin of the portrait.
 anchor=[1.500,1.512,1.529,1.5445,1.560,1.572,1.588,1.615,1.635,1.660,1.700,1.735,1.76]
 Y=np.interp(y,anchor,[414,397,365,326,295,274,250,197,161,122,64,33,19])
 X=349+x*np.interp(y,[1.50,1.53,1.55,1.572,1.615,1.65,1.72],[1670,1630,1730,1680,1530,1580,1600])
 ref=Image.open(W/'face_ref.jpg').convert('RGB')
 # Rebuild repeatable skin underneath the physical glasses; preserve the rigged eyes and brows.
 cleanref=cleaned_portrait()
 photo=sample(cleanref,X,Y)
 # Register the forehead to bare skin where the reference fringe covers the left temple.
 bare=sample(cleanref,351+26*np.sin((X-320)*.014)+.12*(X-325),np.clip(Y,66,164))
 fringe=smooth((320-X)/44)*smooth((176-Y)/24)+smooth((X-425)/45)*smooth((176-Y)/32)
 fringe=np.clip(fringe,0,1)
 photo=photo*(1-fringe[...,None])+bare*fringe[...,None]
 fallback=np.array([171,146,137])+np.zeros_like(photo)
 broad=sample(np.array(ref.filter(ImageFilter.GaussianBlur(8))),X,Y)
 mod=ga((ax-.041)/.03,(y-1.601)/.012)*10+ga((ax-.019)/.007,(y-1.581)/.018)*7
 clean=fallback-mod[...,None]+.28*(broad-[162,142,135])
 protect=smooth((y-1.582)/.012)*smooth((1.649-y)/.012)*smooth((.10-ax)/.021)
 protect=np.maximum(protect,smooth((y-1.645)/.026)*smooth((ax-.015)/.024))
 protect*=.17
 photo=photo*(1-protect[...,None])+clean*protect[...,None]
 lidline=1.598+.005*np.minimum(1,((ax-.040)/.023)**2)+.0008*np.sin(ax*110)
 crease=np.exp(-((y-lidline)/.0012)**2-((ax-.041)/.022)**4);bag=ga((ax-.040)/.020,(y-1.599)/.0055)
 photo-=(4*bag+4*crease)[...,None]
 # The narrow ridge just above the upper lid, and its shallow supratarsal fold.
 aa=[.019,.027,.033,.041,.050,.057,.065,.072]
 ridge=np.interp(ax,aa,[1.611,1.615,1.622,1.626,1.627,1.626,1.624,1.620])
 ew=smooth((ax-.018)/.010)*smooth((.071-ax)/.011)
 fold=ew*np.exp(-((y-ridge-.0023)/.0017)**2)
 lift=ew*np.exp(-((y-ridge)/.0020)**2)
 photo+=(-9*fold+5*lift)[...,None]
 # Remove strong frontal lighting from the albedo while retaining pores, adult
 # folds and lip colour. The studio or game lighting supplies the directional shade.
 neutral=np.array([160,136,125])
 coarse=sample(np.array(Image.fromarray(np.uint8(cleanref)).filter(ImageFilter.GaussianBlur(15))),X,Y)
 feature=smooth((ax-.019)/.020)*smooth((1.594-y)/.03)
 photo-=feature[...,None]*.31*(coarse-neutral)
 photo+=ga((ax-.052)/.030,(y-1.57)/.028)[...,None]*[3,-1,-2]
 edge=smooth((z+.001)/.048)*smooth((.088-ax)/.016)*smooth((1.709-y)/.03)*smooth((y-1.499)/.016)*ok
 skin=np.array([189,159,146])+np.clip((arr[:,:,:3].astype(float)-[250,235,219])*.36,-23,12)
 shade=ga((ax-.051)/.025,(y-1.602)/.01)*7+ga((ax-.059)/.019,(y-1.551)/.026)*4
 skin-=shade[...,None];mapped=np.clip(photo*.72+[48,35,27],52,235)
 # Ease the transition onto the sides of the head and ears.
 ear=smooth((ax-.076)/.026)*ga((y-1.597)/.046,(z+.015)/.062)
 skin+=ear[...,None]*[-8,-14,-14]
 col=skin*(1-edge[...,None])+mapped*edge[...,None];col+=rng.normal(0,.9,(h,w,1))
 arr[:,:,:3]=np.clip(col,0,255);setimage(idx,Image.fromarray(arr))
facecolor()
# Muted sclera, graphite hair, finer brow and lash colour, and matching neck and hands.
for k in [0,1,2,4,5,6,7,9,14]:
 idx,im=getimage(k);a=np.array(im);rgb=a[:,:,:3].astype(float);lum=rgb.mean(2);h,w=lum.shape;y,x=np.ogrid[:h,:w]
 if k==1:rgb=np.stack([lum*.66+8,lum*.57+9,lum*.50+10],-1)
 if k in (9,14):j['materials'][k]['emissiveFactor']=[0,0,0]
 if k==2:a[:,:,3]=(a[:,:,3].astype(float)*.22).astype('uint8')
 if k==4:rgb=rgb*.79+[12,9,7]
 if k==5:rgb=rgb*.58+[9,8,8];a[:,:,3]=(a[:,:,3]*(.71+.23*np.sin(x*.94+y*.27)**2)).astype('uint8')
 if k==6:rgb=rgb*.45+[32,22,20];a[:,:,3]=(a[:,:,3]*.40).astype('uint8')
 if k==7:
  mask=smooth((rgb[:,:,0]-rgb[:,:,2]-10)/16)*smooth((rgb[:,:,0]-126)/80)
  rgb=rgb*(1-mask[...,None])+(rgb*[.76,.73,.72]+[1,0,1])*mask[...,None]
  field,valid=field_in_uv(1,7,(512,512))
  hand=smooth((abs(field[:,:,0])-.647)/.026)*valid
  hand=np.asarray(Image.fromarray((255*hand).astype('uint8')).filter(ImageFilter.MaxFilter(5)).resize((w,h),Image.Resampling.BILINEAR))/255.
  paint=hand*smooth((158-rgb.mean(2))/50)
  warm=np.array([183,153,140])+np.clip((rgb.mean(2)-70)*.11,-7,5)[...,None]
  rgb=rgb*(1-paint[...,None])+warm*paint[...,None]
  # Blend colour and fine anatomical shading from the reference neck.
  fx,fy,fz=field.transpose(2,0,1);nm=smooth((1.535-fy)/.024)*smooth((fy-1.433)/.026)*smooth((.082-abs(fx))/.022)*valid
  neck=sample(np.array(Image.open(W/'face_ref.jpg').convert('RGB')),np.clip(349+fx*1300,283,424),np.clip(423+(1.512-fy)*1420,423,537))
  target=neck*.61+[63,48,42]
  weight=np.asarray(Image.fromarray(nm.astype('float32')).resize((w,h),Image.Resampling.BILINEAR))*mask
  target=np.array(Image.fromarray(np.uint8(np.clip(target,0,255))).resize((w,h),Image.Resampling.BILINEAR))
  rgb=rgb*(1-weight[...,None])+target*weight[...,None]
 if k in (9,14):
  u=x/w;v=y/h;wave=2*np.sin(2*np.pi*(u*96+1.2*np.sin(3*v+4*u)))+1.4*np.cos(2*np.pi*(u*167+.9*v));g=lum*.41+wave+3
  rgb=np.stack([g*1.02,g*.98,g],-1)
 a[:,:,:3]=np.clip(rgb,0,255);setimage(idx,Image.fromarray(a))
for k in [0,1,2,3,4,5,6,7,8,9,12,13,14]:
 m=j['materials'][k];mt=m['extensions']['VRMC_materials_mtoon'];mt.update(outlineWidthMode='none',matcapFactor=[0,0,0],parametricRimColorFactor=[0,0,0],shadingToonyFactor=.28,shadingShiftFactor=.02,shadeColorFactor=[.76,.73,.74])
 m['pbrMetallicRoughness']['roughnessFactor']=.81 if k not in (1,2,4,13) else .49
