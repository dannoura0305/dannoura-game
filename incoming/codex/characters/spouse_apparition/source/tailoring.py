def gridprim(name,fn,nu,nv,mat,weightfn):
 uv=np.stack(np.meshgrid(np.linspace(0,1,nu+1),np.linspace(0,1,nv+1)),axis=-1).reshape(-1,2);u,v=uv.T
 q=fn(u,v);strip=np.arange((nv+1)*(nu+1)).reshape(nv+1,nu+1);a=strip[:-1,:-1].ravel();b=a+1;c=a+nu+1;d=c+1
 tri=np.vstack((np.stack((a,b,c),1),np.stack((b,d,c),1)))
 nr=normals(q,[tri],np.zeros_like(q))
 weights=weightfn(q);ja=np.zeros((len(q),4),'uint16');wa=np.zeros((len(q),4))
 names=list(weights);table=np.array([np.broadcast_to(weights[n],(len(q),)) for n in names]).T
 order=np.argsort(-table,axis=1)[:,:4];co=np.take_along_axis(table,order,1);co/=np.maximum(1e-9,co.sum(1,keepdims=True))
 for i in range(order.shape[1]):
  ja[:,i]=np.array([j['skins'][1]['joints'].index(bones[n]['node']) for n in names])[order[:,i]];wa[:,i]=co[:,i]
 prim={'attributes':{'POSITION':put(q,bounds=True),'NORMAL':put(nr),'TEXCOORD_0':put(uv,'VEC2'),'JOINTS_0':put(ja,'VEC4',5123),'WEIGHTS_0':put(wa,'VEC4')},'indices':put(tri,'SCALAR',5123,34963),'material':mat,'mode':4}
 body.append(prim);return prim
def clothweights(q):
 x,y,z=q.T;leg=.78*smooth((.87-y)/.40);left=smooth((x+.064)/.128);rib=smooth((y-.97)/.23)
 return {'hips':(1-rib)*(1-leg),'chest':rib*(1-leg),'leftUpperLeg':leg*left,'rightUpperLeg':leg*(1-left)}
def cloth_image():
 h,w=1024,1024;v,u=np.mgrid[0:h,0:w];u=u/w;v=v/h
 sx=753+76*np.sin((u-.5)*np.pi*2);sy=266+v*341
 lum=sample(ref,sx,sy).mean(2);lum=167+.76*(np.clip(lum,95,211)-157)+rng.normal(0,1.7,(h,w))
 weave=1.8*np.sin(v*h*2)+1.1*np.cos(u*w*2.5)
 col=np.stack([lum+6+weave,lum+2+weave,lum+weave],-1)
 stitch=(v>.980)&(v<.983);col[stitch]-=12;return Image.fromarray(np.uint8(np.clip(col,0,255)))
cloth=mattex('Pearl grey | washed linen',cloth_image())
trim=material('Dusty lilac | boundary piping',[.274,.205,.292],.88)
def coat_shape(u,v,tier=0):
 # The two shorter floating panels share the fitted waist, each with its own sloping hem.
 top=[1.321,1.00,.964][tier];hem=[.274,.372,.469][tier]
 t=.29+.135*np.sin(np.pi*v)-.09*smooth((v-.45)/.34)
 phi=t+u*(2*np.pi-2*t);co=np.cos(phi);si=np.sin(phi)
 bottom=hem+.029*np.sin(phi+.6+tier*.43)+.015*np.cos(2*phi+.4*tier)
 y=top+(bottom-top)*v
 ys=[.23,.41,.67,.88,1.01,1.12,1.19,1.257,1.288,1.311,1.322]
 rx=np.interp(y,ys,[.196,.194,.171,.143,.122,.128,.142,.150,.139,.078,.053])
 rz=np.interp(y,ys,[.142,.14,.126,.111,.089,.105,.116,.091,.079,.058,.047])
 z0=np.interp(y,ys,[-.019,-.021,-.023,-.016,.005,.020,.014,-.016,-.027,-.028,-.028])
 folds=(.0046*np.sin(11*phi+3*v)+.0029*np.cos(19*phi-2*v)+.0017*np.sin(28*phi+v))*smooth((1.18-y)/.39)
 r=tier*(.0023+.0058*v)+folds
 return np.stack([(rx+r+.009)*np.sign(si)*abs(si)**.82,y,z0+(rz+r+.012)*np.sign(co)*abs(co)**.77],1)
for tier in range(3):gridprim('Overlapping skirt',lambda u,v,k=tier:coat_shape(u,v,k),86,54,cloth,clothweights)
# Folded lapels and patch pockets are separate surfaces with a stitched free edge.
for side in (-1,1):
 def lapel(u,v):
  t=v
  # Lay the lapel along the front opening with a raised roll and a notched tip.
  width=np.interp(t,[0,.17,.24,.27,.39,.71,1],[.014,.058,.034,.063,.067,.033,.001])
  along=.006+.29*t
  torso=coat_shape(np.zeros_like(t),along)
  x0=torso[:,0];x=x0+width*(1-u)-.006*u
  near=coat_shape(.076*(1-u)*width/.060,along)
  return np.stack((side*x,torso[:,1]+.006*(1-u)*np.sin(np.pi*t),near[:,2]+.005+.004*np.sin(np.pi*u)),1)
 gridprim('Notched lapel',lapel,6,32,cloth,clothweights)
 def pocket(u,v):
  t=(.028+u*.088) if side>0 else (1-.028-u*.088)
  q=coat_shape(t,.18+v*.25,2);normal=unit(np.stack((q[:,0],np.zeros(len(q)),q[:,2]+.022),1))
  return q+(.007+.002*np.sin(np.pi*u))[:,None]*normal
 gridprim('Applied pocket',pocket,16,8,cloth,clothweights)
 def sw(q,side=side):
  a=abs(q[:,0]);chest=1-smooth((a-.083)/.074);fore=smooth((a-.289)/.077);hand=.12*smooth((a-.51)/.034);prefix='left' if side>0 else 'right'
  return {'chest':chest,prefix+'UpperArm':(1-chest)*(1-fore),prefix+'LowerArm':fore*(1-hand),prefix+'Hand':fore*hand}
 def sleeve(u,v,band=False):
  p=2*np.pi*u;t=.966+.024*v if band else v
  x=.095+.437*t;y=1.275-.002*t;z=-.026
  rad=np.interp(t,[0,.13,.45,.66,1],[.051,.068,.054,.060,.043])+.0028*np.sin(31*t+2*p)*np.sin(np.pi*t)+(.0008 if band else 0)
  return np.stack((side*x,y+rad*np.sin(p),z+rad*np.cos(p)),1)
 gridprim('Sleeve',sleeve,36,28,cloth,sw)
 gridprim('Violet cuff',lambda u,v:sleeve(u,v,True),36,3,trim,sw)
# Watch sits on the exposed left wrist, with glass, a face, hour marks and hands.
leftbone=bones['leftHand']['node'];metal=material('Watch | brushed silver',[.37,.33,.29],.27,.71);dial=material('Watch | ivory enamel',[.76,.72,.61],.32);ink=material('Watch | hands and indices',[.055,.043,.037],.45);leather=material('Watch | leather',[.075,.054,.046],.79)
cx=.548;cy=1.275;cz=-.026
band=Geometry()
for xoff in np.linspace(-.006,.006,4):band.tube([[cx+xoff,cy+.023*np.cos(a),cz+.030*np.sin(a)] for a in np.linspace(0,math.tau,40,endpoint=False)],.0025,8,True)
body.append(band.primitive(leather,leftbone))
# Face on the dorsal side of the wrist, facing up in the VRoid rest pose.
def disk(rad,y,mat):
 g=Geometry();g.pos=[[cx,y,cz]]+[[cx+rad*np.cos(a),y,cz+rad*np.sin(a)] for a in np.linspace(0,math.tau,64,endpoint=False)]
 g.tri=[(0,1+(i+1)%64,1+i) for i in range(64)];body.append(g.primitive(mat,leftbone))
g=Geometry();g.tube([[cx+.017*np.cos(a),cy+.025,cz+.017*np.sin(a)] for a in np.linspace(0,math.tau,62,endpoint=False)],.0021,10,True);body.append(g.primitive(metal,leftbone));disk(.0167,cy+.0257,dial)
g=Geometry()
for i in range(12):
 a=i*math.tau/12;g.tube([[cx+r*np.sin(a),cy+.026,cz+r*np.cos(a)] for r in (.012,.0145)],.00043,6)
for angle,radius in [(2.1,.009),(5.6,.013)]:g.tube([[cx,cy+.0266,cz],[cx+radius*np.sin(angle),cy+.0266,cz+radius*np.cos(angle)]],.00067,8)
body.append(g.primitive(ink,leftbone))
