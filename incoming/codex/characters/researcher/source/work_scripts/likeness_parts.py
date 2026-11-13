def material(name,colour,rough=.7,metal=0,emission=None):
 pbr={'baseColorFactor':[*colour,1],'roughnessFactor':rough,'metallicFactor':metal}
 m={'name':name,'pbrMetallicRoughness':pbr,'doubleSided':True}
 if emission:m['emissiveFactor']=emission
 j['materials'].append(m);return len(j['materials'])-1
def unit(v):
 return v/np.maximum(1.e-12,np.linalg.norm(v,axis=-1,keepdims=True))
class Geometry:
 def __init__(self):self.pos=[];self.tri=[]
 def tube(self,path,radius,steps=8,close=False):
  path=np.asarray(path);n=len(path);off=len(self.pos);prev=None
  for i,c in enumerate(path):
   d=unit(path[(i+1)%n if close else min(i+1,n-1)]-path[(i-1)%n if close else max(0,i-1)])
   a=unit(np.cross(d,[0,0,1] if abs(d[2])<.90 else [0,1,0])) if prev is None else unit(prev-d*np.dot(prev,d));prev=a;b=np.cross(d,a)
   rad=radius if np.isscalar(radius) else radius[i]
   for h in range(steps):
    angle=h*math.tau/steps;self.pos.append(c+rad*(a*math.cos(angle)+b*math.sin(angle)))
  for i in range(n if close else n-1):
   for h in range(steps):
    a=off+i*steps+h;b=off+i*steps+(h+1)%steps;c=off+((i+1)%n)*steps+(h+1)%steps;d=off+((i+1)%n)*steps+h
    self.tri.extend([(a,b,c),(a,c,d)])
 def primitive(self,mat,bone,mapper=None):
  pos=np.array(self.pos);pos=mapper(pos) if mapper else pos;tr=np.array(self.tri)
  ns=normals(pos,[tr],np.zeros_like(pos));joints=np.zeros((len(pos),4),dtype='uint16');joints[:,0]=j['skins'][1]['joints'].index(bone)
  weights=np.zeros((len(pos),4));weights[:,0]=1
  return {'attributes':{'POSITION':put(pos,bounds=True),'NORMAL':put(ns),'JOINTS_0':put(joints,'VEC4',5123),'WEIGHTS_0':put(weights,'VEC4')},'indices':put(tr,'SCALAR',5123 if len(pos)<65535 else 5125,34963),'material':mat,'mode':4}
head=j['extensions']['VRMC_vrm']['humanoid']['humanBones']['head']['node']
body=meshes[1]['primitives'];body[:]=[pr for pr in body if pr['material'] not in (10,11)]
wire=Geometry();lens=Geometry();hardware=material('Brushed graphite | optical frame',[.050,.044,.046],.33,.62)
for s in [-1,1]:
 path=[]
 for t in np.linspace(0,math.tau,80,endpoint=False):
  c=np.cos(t);sn=np.sin(t);x=.041+.0335*np.sign(c)*abs(c)**.72
  y=1.615+.0173*np.sign(sn)*abs(sn)**.78+.055*(x-.041)
  z=.0845-.021*(x/.083)**2;path.append([s*x,y,z])
 wire.tube(path,.00094,8,True)
 wire.tube([[s*.073,1.623,.067],[s*.081,1.623,.060],[s*.087,1.623,.025],[s*.093,1.621,-.013],[s*.091,1.608,-.045]],.00115)
 o=len(lens.pos);lens.pos.append([s*.041,1.615,.078]);lens.pos.extend(path);lens.tri.extend([(o,o+i+1,o+((i+1)%len(path))+1) for i in range(len(path))])
wire.tube([[-.0087,1.6210,.0842],[-.005,1.621,.089],[0,1.622,.091],[.005,1.621,.089],[.0087,1.6210,.0842]],.00105)
body.append(wire.primitive(hardware,head,sculpt))
lm=material('Clear optical lenses',[.77,.84,.85],.12);j['materials'][lm]['pbrMetallicRoughness']['baseColorFactor'][3]=.012;j['materials'][lm]['alphaMode']='BLEND'
body.append(lens.primitive(lm,head,sculpt))
# Add a side part and loose clumps anchored to the actual VRoid hair silhouette.
hp=acc(meshes[2]['primitives'][0]['attributes']['POSITION'])
origin=sculpt(np.array([[0.,1.66,-.033]]))[0];vec=hp-origin
directions=unit(vec);lengths=np.linalg.norm(vec,axis=1)
# A binned radial envelope avoids following internal card vertices.
nx,ny=144,88;az=np.arctan2(directions[:,0],directions[:,2]);el=np.arcsin(directions[:,1])
def cell(az,el):return ((az+np.pi)/(2*np.pi)*nx).astype(int)%nx,np.clip(((el+np.pi/2)/np.pi*ny).astype(int),0,ny-1)
ix,iy=cell(az,el);grid=np.zeros((ny,nx));np.maximum.at(grid,(iy,ix),lengths)
for _ in range(10):
 filled=grid>0;total=np.zeros_like(grid);count=np.zeros_like(grid)
 for dy,dx in [(-1,0),(1,0),(0,1),(0,-1),(-1,-1),(1,1)]:
  total+=np.roll(grid,(dy,dx),(0,1));count+=np.roll(filled,(dy,dx),(0,1))
 grid=np.where(filled,grid,total/np.maximum(count,1))
grid=np.where(grid>.03,grid,.10)
grid=np.asarray(Image.fromarray(grid.astype('float32')).resize((nx,ny)))
def envelope(n):
 az=np.arctan2(n[:,0],n[:,2]);el=np.arcsin(np.clip(n[:,1],-1,1));x=(az+np.pi)/(2*np.pi)*nx-.5;y=np.clip((el+np.pi/2)/np.pi*ny-.5,0,ny-1.01);i=np.floor(x).astype(int);k=y.astype(int);a=x-i;b=y-k
 return (grid[k,i%nx]*(1-a)+grid[k,(i+1)%nx]*a)*(1-b)+(grid[k+1,i%nx]*(1-a)+grid[k+1,(i+1)%nx]*a)*b
haircols=[[.025,.023,.024],[.033,.030,.031],[.046,.043,.045],[.061,.058,.061],[.091,.088,.092],[.103,.101,.105]]
hm=[material('Pepper hair | '+str(i+1),(np.asarray(v)*.54).tolist(),.88) for i,v in enumerate(haircols)]
groups=[Geometry() for _ in hm]
for side in [-1,1]:
 for i in range(140):
  t=np.linspace(0,1,19);r=(i+.5+rng.uniform(-.4,.4))/140
  phi=side*(.09+3.02*r)+.19
  endEl=.57*np.exp(-((phi-.22)/.98)**2)+.10-.82*(1-np.cos(phi))/2+rng.uniform(-.12,.08)
  end=unit(np.array([np.sin(phi)*np.cos(endEl),np.sin(endEl),np.cos(phi)*np.cos(endEl)]))
  sag=.98+1.57*r+rng.uniform(-.16,.16)
  start=unit(np.array([.15+rng.uniform(-.07,.07),np.sin(sag),np.cos(sag)]))
  mid=unit(start+end+[side*.83,.16,-.15]);n=unit((1-t[:,None])**2*start+2*(1-t[:,None])*t[:,None]*mid+t[:,None]**2*end)
  # Smooth small steps between neighbouring hair cards along each lock.
  dist=envelope(n)
  dist=np.convolve(np.pad(dist,(3,3),mode='edge'),[.04,.10,.20,.32,.20,.10,.04],mode='valid')
  lift=.0014+.0028*np.sin(np.pi*t)+rng.uniform(0,.0016)
  curve=origin+n*(dist+lift)[:,None];curve[:,1]-=.009*t**6
  tangent=unit(np.gradient(curve,axis=0));across=unit(np.cross(tangent,n))
  w=rng.uniform(.00055,.0025)*np.maximum(.025,np.sin(np.pi*t)**.54)
  slot=int(rng.choice([0,1,1,2,2,3,4] if .24<r<.70 else [0,1,1,2,2,3]))
  g=groups[slot];off=len(g.pos)
  for k in range(len(t)):
   g.pos.extend([curve[k]-across[k]*w[k],curve[k]+n[k]*w[k]*.35,curve[k]+across[k]*w[k]])
   if k:
    h=off+3*(k-1);g.tri.extend([(h,h+3,h+1),(h+1,h+3,h+4),(h+1,h+4,h+2),(h+2,h+4,h+5)])
  if i%3==0 or (.29<r<.54 and i%2==0):
   g=groups[5 if .28<r<.58 and i%4==0 else 3];g.tube(curve+n*(w*.39+.00009)[:,None]+across*(w*.18)[:,None],.00018*np.maximum(.17,np.sin(np.pi*t)**.48),4)
for g,ma in zip(groups,hm):
 if len(g.pos):body.append(g.primitive(ma,head))
exec(compile((W/'parted_fringe.py').read_text('utf8'),str(W/'parted_fringe.py'),'exec'))
# Folded shirt collar, fitted to the front neck opening of the VRoid coat.
chest=j['extensions']['VRMC_vrm']['humanoid']['humanBones']['chest']['node']
collar=Geometry()
for sign in (-1,1):
 rows=[[(.009,1.449,.039),(.019,1.443,.045),(.036,1.412,.065)],[(.031,1.480,.019),(.042,1.466,.025),(.052,1.437,.047)],[(.045,1.497,-.011),(.053,1.485,-.009),(.062,1.464,.008)],[(.041,1.502,-.053),(.052,1.489,-.056),(.063,1.476,-.055)],[(.000,1.499,-.086),(.000,1.489,-.094),(.000,1.476,-.096)]]
 off=len(collar.pos)
 for row in rows:collar.pos.extend([[sign*x,y,z] for x,y,z in row])
 for r in range(4):
  for c in range(2):
   a=off+3*r+c;collar.tri.extend([(a,a+1,a+3),(a+1,a+4,a+3)])
body.append(collar.primitive(material('Shirt | folded charcoal collar',[.054,.047,.052],.92),chest))
# Add the recorder as solid hardware on the left coat opening. It follows the pelvis.
pelvis=j['extensions']['VRMC_vrm']['humanoid']['humanBones']['hips']['node']
dev=Geometry();case=material('Recorder | graphite shell',[.032,.031,.038],.55,.34)
# Locate the center from the actual painted patch in the original garment UV.
pr=next(p for p in body if p['material']==8);uv=acc(pr['attributes']['TEXCOORD_0'])*512
def coatpoint(x,y):
 for tri in acc(pr['indices']).reshape(-1,3):
  q=uv[tri];mat=(q[1:]-q[0]).T
  if abs(np.linalg.det(mat))<1e-7:continue
  a,b=np.linalg.solve(mat,np.array([x,y])-q[0])
  if min(a,b,1-a-b)>=-.001:return (rest[1][tri]*np.array([1-a-b,a,b])[:,None]).sum(0)
 raise RuntimeError('coat UV not found')
center=coatpoint(281.6,253.0);u=unit(coatpoint(282.6,253)-center);v=unit(coatpoint(281.6,252)-center);normal=unit(np.cross(u,v));normal*=np.sign(normal[2]);v=unit(v-np.dot(v,u)*u)
def panelpoint(x,y,z):return center+x*u+y*v+z*normal
for z,scale in [(-.002,.92),(.001,1),(.007,1),(.009,.93)]:
 for x,y in [(-.018,-.026),(-.014,-.030),(.014,-.030),(.018,-.026),(.018,.026),(.014,.030),(-.014,.030),(-.018,.026)]:dev.pos.append(panelpoint(x*scale,y*scale,z))
for k in range(3):
 for i in range(8):
  a=k*8+i;b=k*8+(i+1)%8;dev.tri.extend([(a,b,b+8),(a,b+8,a+8)])
for i in range(1,7):dev.tri.extend([(0,i+1,i),(24,24+i,24+i+1)])
body.append(dev.primitive(case,pelvis))
light=Geometry();light.tube([panelpoint(.0072*np.cos(t),.005+.0072*np.sin(t),.0095) for t in np.linspace(0,math.tau,52,endpoint=False)],.00105,8,True)
body.append(light.primitive(material('Recorder | violet status light',[.44,.18,.78],.38,0,[.50,.15,.92]),pelvis))
def savegltf(path,doc):
 binary.extend(b'\0'*(-len(binary)%4));doc['buffers'][0]['byteLength']=len(binary);js=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*(-len(js)%4);path.write_bytes(struct.pack('<4sIII4s',b'glTF',2,28+len(js)+len(binary),len(js),b'JSON')+js+struct.pack('<I4s',len(binary),b'BIN\0')+binary)
j['extensions']['VRMC_vrm']['meta']['name']='研究者 | Blender造形版';j['extensions']['VRMC_vrm']['meta']['version']='2.0'
savegltf(OUT/'researcher_refined.vrm',j)
# A physically lit glTF companion serves as the Blender editing source.
plain=copy.deepcopy(j)
for mat_idx,m in enumerate(plain['materials']):
 m.pop('extensions',None)
 if mat_idx in (2,5,6):m['alphaMode']='BLEND'
 elif m.get('alphaMode')=='BLEND' and m['name']!='Clear optical lenses':m['alphaMode']='MASK';m['alphaCutoff']=.20
plain.pop('extensions',None);plain['extensionsUsed']=['KHR_texture_transform'];plain.pop('extensionsRequired',None)
savegltf(OUT/'researcher_refined.glb',plain)
print('REFINED',len(body),len(binary),flush=True)
