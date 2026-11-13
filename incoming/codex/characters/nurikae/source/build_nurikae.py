import bpy,sys,os,math,json,random
from mathutils import Vector,Matrix,Quaternion
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);random.seed(19);SK={};CABLES={}

def steel(name,col):
    ma=mat(name,col,.63,True,.13);p=ma.node_tree.nodes['Principled BSDF'];p.inputs['Metallic'].default_value=.72
    im=next(n.image for n in ma.node_tree.nodes if n.type=='TEX_IMAGE');size=im.size[0];px=np.array(im.pixels[:],dtype=np.float32).reshape(size,size,4)
    y,x=np.mgrid[0:size,0:size]/size
    field=np.sin(math.tau*(9*x+2*np.sin(8*y)))+np.cos(math.tau*(13*y+2*x))+.7*np.sin(math.tau*(37*x+27*y))
    mask=np.clip((field-1.67)*2,0,1)*.85
    px[:,:,:3]=px[:,:,:3]*(1-mask[:,:,None])+np.array([.24,.105,.043])[None,None,:]*mask[:,:,None]
    scratches=(np.sin(x*math.tau*380+2*np.sin(y*30))>.997)*.12
    px[:,:,:3]*=(1-scratches[:,:,None]);im.pixels.foreach_set(px.ravel());im.pack()
    surface_normal(ma,'cloth',.14);return ma
STEEL=steel('Aged galvanized shutter steel',(.47,.465,.45))
STEEL2=steel('Darker overlapping shutter plates',(.36,.35,.335))
FRAME=steel('Transformer and structural metal',(.275,.265,.25))
RUST=mat('Oxidized seams and bolts',(.225,.11,.055),.87)
EDGE=mat('Worn raised steel edges',(.43,.42,.40),.49);EDGE.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.80
RUBBER=mat('Black violet power cable sheath',(.029,.023,.036),.59,True,.09)
PORCELAIN=mat('Pale ceramic insulators',(.52,.49,.53),.31)
DARK=mat('Dark interior machinery',(.018,.015,.023),.80)
GLOW=mat('Purple boundary discharge',(.38,.018,.68),.28)
p=GLOW.node_tree.nodes['Principled BSDF'];p.inputs['Emission Color'].default_value=(.57,.035,1,1);p.inputs['Emission Strength'].default_value=4

def bone(n,h,t,parent=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':parent}
def box(name,c,size,ma,bones,bevel=.012):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
    if bevel:
        mo=o.modifiers.new('Worn bevel','BEVEL');mo.width=bevel;mo.segments=2;activate(o);bpy.ops.object.modifier_apply(modifier=mo.name)
        mo=o.modifiers.new('Weighted steel normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mo.name)
    o['bones']=','.join(bones);ASSETS.append(o);return o
def cyl(name,a,b,r,ma,bones,sides=20):return tube(name,[a,b],[(0,r),(1,r)],ma,bones,n=2,sides=sides)
def bolt(p,normal,bones,r=.012):
    p=Vector(p);no=Vector(normal).normalized();cyl('Rust bolt washer',p-no*.002,p+no*.003,r*1.5,RUST,bones,12);return cyl('Hexagonal fastening bolt',p+no*.003,p+no*.014,r,EDGE,bones,6)
def ring(name,c,d,ro,ri,depth,ma,bones):
    c=Vector(c);d=Vector(d).normalized();a=d.orthogonal().normalized();b=d.cross(a);vs=[];fs=[];uv=[];N=48
    for i in range(N):
        th=math.tau*i/N
        for r,z in [(ro,-depth/2),(ro,depth/2),(ri,depth/2),(ri,-depth/2)]:vs.append(c+r*(a*math.cos(th)+b*math.sin(th))+d*z);uv.append((i/N,r))
    for i in range(N):
        for j in range(4):fs.append((4*i+j,4*((i+1)%N)+j,4*((i+1)%N)+(j+1)%4,4*i+(j+1)%4))
    return mesh(name,vs,fs,ma,bones,uv)

# Corrugated armour is real geometry, with slim ribs across each curved sheet.
def shutter(name,h,t,r0,r1,bn,ma=STEEL,start=0,arc=math.tau-.08,twist=.2):
    h=Vector(h);t=Vector(t);d=(t-h).normalized();a=Vector((1,0,0));a=(a-d*a.dot(d)).normalized();b=d.cross(a);length=(t-h).length
    rows=max(32,int(length*140));cols=56;vs=[];fs=[];uv=[];slats=max(7,int(length/.036))
    def pt(u,v):
        ang=start+arc*v+twist*u;r=r0*(1-u)+r1*u+.0042*math.cos(math.tau*slats*u)+.0015*math.sin(7*ang+8*u)
        return h+(t-h)*u+r*(a*math.cos(ang)+b*math.sin(ang))
    for i in range(rows+1):
        for j in range(cols+1):vs.append(pt(i/rows,j/cols));uv.append((j/cols*2,i/rows*2))
    for i in range(rows):
        for j in range(cols):q=i*(cols+1)+j;fs.append((q,q+1,q+cols+2,q+cols+1))
    ob=mesh(name,vs,fs,ma,[bn],uv);solid(ob,.014)
    for u in [.01,.99]:line('Shutter end binding',[pt(u,j/64) for j in range(65)],.009,EDGE,[bn])
    for v in [.03,.97]:
        line('Shutter side rail',[pt(i/24,v) for i in range(25)],.010,STEEL2,[bn])
        for u in [.10,.32,.54,.76,.93]:p=pt(u,v);n=(p-h-d*(p-h).dot(d)).normalized();bolt(p,n,[bn],.009)
    return ob
def ribbon(name,path,width,bn,ma=STEEL):
    pts=cat(path,55);normal=Vector((0,-1,0));vs=[];fs=[];uv=[];N=32
    for i,c in enumerate(pts):
        d=(pts[min(i+1,54)]-pts[max(0,i-1)]).normalized();across=normal.cross(d).normalized()
        for j in range(N+1):
            u=j/N*2-1;r=.0042*math.cos(math.pi*u*10);p=c+across*width*u+normal*(r+.012*(1-u*u));vs.append(p);uv.append((i/54*2,j/N))
    for i in range(54):
        for j in range(N):q=i*(N+1)+j;fs.append((q,q+1,q+N+2,q+N+1))
    ob=mesh(name,vs,fs,ma,[bn],uv);solid(ob,.018)
    for j in [0,N]:
        line('Armour panel folded edge',[vs[i*(N+1)+j] for i in range(55)],.009,STEEL2,[bn])
        for i in [4,18,32,47]:bolt(vs[i*(N+1)+j]+normal*.008,normal,[bn],.009)
    return ob

bone('root',(0,0,0),(0,0,.20));bone('pelvis',(0,.08,1.25),(0,.08,1.56),'root');bone('spine',(0,.08,1.56),(0,.08,1.92),'pelvis');bone('chest',(0,.08,1.92),(0,.08,2.62),'spine')
bone('core',(0,-.34,2.03),(0,-.34,2.40),'chest')
box('Dark central steel chassis',(0,.12,2.05),(.72,.50,1.12),DARK,['chest'],.07)
box('Pelvic structural block',(0,.12,1.39),(.69,.44,.32),FRAME,['pelvis'],.05)
for sign in [-1,1]:
    cyl('Vertical torso frame',(sign*.33,-.17,1.59),(sign*.38,-.13,2.62),.045,FRAME,['chest'])
    cyl('Visible abdominal hydraulic ram',(sign*.23,-.19,1.40),(sign*.25,-.20,1.76),.032,EDGE,['spine'])
    ribbon('Upper diagonal crossing shutter',[(sign*.69,-.01,2.65),(sign*.40,-.34,2.61),(sign*.04,-.43,2.49)],.115,'chest',STEEL if sign<0 else STEEL2)
    ribbon('Side chest wrapped shutter',[(sign*.62,.03,2.44),(sign*.48,-.30,2.28),(sign*.43,-.34,2.05)],.105,'chest')
    ribbon('Lower V shaped torso armour',[(sign*.48,-.29,1.96),(sign*.30,-.35,1.75),(0,-.36,1.57)],.145,'spine',STEEL2 if sign<0 else STEEL)
    ribbon('Flared hip shutter',[(sign*.13,-.18,1.53),(sign*.39,-.15,1.43),(sign*.51,-.055,1.32)],.10,'pelvis')

# Transformer: casing, vertical cooling ribs, three ceramic bushings and luminous lower slot.
box('Transformer tank',(0,-.30,2.19),(.46,.30,.52),FRAME,['chest'],.025)
for x in [-.235,.235]:
    box('Transformer vertical frame rail',(x,-.49,2.18),(.025,.045,.57),EDGE,['chest'],.003)
    for z in [1.92,2.44]:bolt((x,-.515,z),(0,-1,0),['chest'],.011)
for z in [1.92,2.46]:box('Transformer header rail',(0,-.49,z),(.51,.04,.035),STEEL,['chest'],.004)
for j in range(13):
    x=-.208+j*.0347;cyl('Vertical transformer cooling fin',(x,-.486,1.96),(x,-.486,2.43),.0075,STEEL2,['chest'],12)
box('Recessed boundary core aperture',(0,-.516,2.025),(.33,.045,.115),DARK,['chest'],.009)
box('Violet transformer core',(0,-.544,2.025),(.275,.012,.073),GLOW,['core'],.003)
for z in [1.969,2.081]:box('Core slot steel frame',(0,-.553,z),(.34,.023,.015),STEEL,['chest'],.003)
for j in range(3):
    x=(j-1)*.125;cyl('Insulator post',(x,-.29,2.44),(x,-.29,2.65),.018,FRAME,['chest'])
    for k in range(5):ell('Ceramic bushing disc',(x,-.29,2.48+k*.031),(.039,.039,.010),PORCELAIN,['chest'])
    cyl('Insulator upper terminal',(x,-.29,2.64),(x,-.29,2.69),.015,EDGE,['chest'])
    line('Transformer upper wiring',[(x,-.29,2.68),(x,-.26,2.78),(x+.08,-.05,2.84),(x+.12,.25,2.58),(x+.13,.30,2.24)],.018,RUBBER,['chest'])

# Rear corrugated plates with an exposed vertical wiring channel.
for z,r in [(2.55,.47),(2.22,.46),(1.84,.39)]:
    shutter('Layered rear shutter shell',(0,.11,z-.19),(0,.11,z+.18),r,r*.98,'chest' if z>2 else 'spine',STEEL2,start=0,arc=math.pi*1.12,twist=-.10)
for j in range(7):
    x=(j-3)*.047
    line('Exposed bundled back power cable',[(x-.04,.27,2.76),(x+.05,.52,2.61),(x,.63,2.35),(x-.05,.59,2.10),(x-.03,.55,1.84),(x+.02,.35,1.51)],.017,RUBBER,['chest','spine','pelvis'])
for z in [2.50,2.08,1.75]:
    box('Rear cable clamp',(0,.635 if z>2 else .56,z),(.39,.025,.055),STEEL,['chest' if z>2 else 'spine'],.006)
    for x in [-.17,.17]:bolt((x,.66 if z>2 else .585,z),(0,1,0),['chest' if z>2 else 'spine'],.010)

# Heavy strut legs with overlapping sections of roller shutter armour.
for sign,s in [(-1,'R'),(1,'L')]:
    h=Vector((sign*.30,.08,1.40));k=Vector((sign*.45,-.01,.78));ank=Vector((sign*.55,.035,.20));foot=ank+Vector((0,-.24,-.10))
    bone('thigh'+s,h,k,'pelvis');bone('shin'+s,k,ank,'thigh'+s);bone('foot'+s,ank,foot,'shin'+s)
    cyl('Thigh heavy pipe '+s,h,k,.10,FRAME,['thigh'+s]);cyl('Shin heavy pipe '+s,k,ank,.10,FRAME,['shin'+s])
    for bn,a,b in [('thigh'+s,h,k),('shin'+s,k,ank)]:
        d=(b-a).normalized();side=Vector((0,.11,0))
        for off in [-1,1]:cyl('Exposed piston rod',a+side*off,b+side*off,.025,EDGE,[bn])
        shutter('Upper overlapping leg shutter',a.lerp(b,.07),a.lerp(b,.56),.21,.19,bn,STEEL,start=.3,arc=math.tau-.35,twist=.30*sign)
        shutter('Lower overlapping leg shutter',a.lerp(b,.57),a.lerp(b,.92),.175,.22,bn,STEEL2,start=-.4,arc=math.tau-.25,twist=-.20*sign)
    ell('Knee mechanical joint '+s,k,(.17,.17,.14),FRAME,['shin'+s])
    for off in [-1,1]:bolt(k+Vector((off*.18,0,0)),(off,0,0),['shin'+s],.035)
    box('Broad industrial foot '+s,(sign*.55,-.10,.105),(.47,.60,.20),FRAME,['foot'+s],.035)
    for j in range(8):
        z=.042+j*.019;box('Foot shutter tread '+s,(sign*.55,-.22+j*.011,z),(.48-j*.009,.38,.014),STEEL,['foot'+s],.004)
    for x in [-.17,.17]:bolt((sign*.55+x,-.405,.085),(0,-1,0),['foot'+s],.016)
    vs=[];fs=[];uv=[];rows=48;cols=24
    for i in range(rows+1):
        t=i/rows
        for j in range(cols+1):
            q=j/cols*2-1;vs.append((sign*.55+q*.24,.17-.56*t,.25-.155*t+.018*(1-q*q)+.004*math.exp(-math.sin(math.pi*t*12)**2/.055)));uv.append((q,t))
    for i in range(rows):
        for j in range(cols):a=i*(cols+1)+j;fs.append((a,a+1,a+cols+2,a+cols+1))
    ob=mesh('Sloped shutter foot armour '+s,vs,fs,STEEL,['foot'+s],uv);solid(ob,.018)


ARMS={'R':(Vector((-.68,.03,2.57)),Vector((-.99,-.03,2.04)),Vector((-1.22,-.13,1.42))),
      'L':(Vector((.67,.03,2.53)),Vector((.91,-.04,2.07)),Vector((1.02,-.12,1.72)))}
for s,(h,e,w) in ARMS.items():
    bone('upperArm'+s,h,e,'chest');bone('foreArm'+s,e,w,'upperArm'+s);bone('hand'+s,w,w+Vector((-.05 if s=='R' else 0,0,-.16)),'foreArm'+s)
    ell('Shoulder machine joint '+s,h,(.23,.23,.24),DARK,['upperArm'+s]);ell('Rounded shoulder steel cap '+s,h+Vector((0,0,.105)),(.265,.245,.17),STEEL,['upperArm'+s]);cyl('Arm support structure '+s,h,w,.10,FRAME,['upperArm'+s,'foreArm'+s])
    shutter('Overlapping shoulder pauldron '+s,h+Vector((0,0,.19)),h.lerp(e,.33),.27,.29,'upperArm'+s,STEEL,start=0,arc=math.tau-.50,twist=.25)
    for bn,a,b in [('upperArm'+s,h.lerp(e,.23),e),('foreArm'+s,e,w)]:
        if s=='L' and bn.startswith('fore'):continue
        shutter('Rolled corrugated arm armour '+bn,a,b,.23 if bn.startswith('upper') else .19,.19 if bn.startswith('upper') else .155,bn,STEEL,start=.2,arc=math.tau-.16,twist=.35)
        # A second short overlapping cuff reinforces the spiral construction.
        shutter('Spiral overlapping arm cuff '+bn,a.lerp(b,.58),a.lerp(b,.88),.24 if bn.startswith('upper') else .20,.22 if bn.startswith('upper') else .18,bn,STEEL2,start=-.2,arc=math.tau-.45,twist=-.35)
    ell('Exposed elbow joint '+s,e,(.16,.16,.15),FRAME,['foreArm'+s])
    for zoff in [-.06,.06]:bolt(e+Vector((0,-.17,zoff)),(0,-1,0),['foreArm'+s],.015)
    if s=='L':
        c=e.lerp(w,.56);box('Box transformer forearm',c,(.36,.36,.38),STEEL2,['foreArmL'],.022)
        for x in [-.13,0,.13]:
            box('Forearm reinforcing flange',(c.x+x,c.y-.19,c.z),(.025,.025,.35),EDGE,['foreArmL'],.003)
            for z in [-.14,.14]:bolt((c.x+x,c.y-.21,c.z+z),(0,-1,0),['foreArmL'],.009)
        for j in range(2):
            cc=c+Vector(((j-.5)*.15,0,.20));cyl('Forearm bushing core',cc,cc+Vector((0,0,.14)),.015,FRAME,['foreArmL'])
            for k2 in range(4):ell('Forearm porcelain disc',cc+Vector((0,0,.025+k2*.029)),(.032,.032,.008),PORCELAIN,['foreArmL'])
        box('Industrial claw palm',w+Vector((0,-.015,-.10)),(.25,.23,.22),FRAME,['handL'],.020)
        for j,(dx,dy) in enumerate([(-.095,-.07),(.095,-.07),(0,.10)]):
            p0=w+Vector((dx,dy,-.17));p1=p0+Vector((dx*.50,dy*.3,-.17));p2=p1+Vector((-dx*.7,-dy*.5,-.12))
            bn='claw'+str(j);bone(bn,p0,p1,'handL');bone(bn+'tip',p1,p2,bn)
            for name,aa,bb in [(bn,p0,p1),(bn+'tip',p1,p2)]:
                ob=box('Segmented steel pincer '+name,(aa+bb)/2,(.095,.10,(bb-aa).length+.015),STEEL2,[name],.012);ob.rotation_euler=(bb-aa).to_track_quat('Z','Y').to_euler()
            cyl('Claw hinge pin',p1+Vector((0,-.066,0)),p1+Vector((0,.066,0)),.023,EDGE,[bn])

# Right wrist is an open roll with five hanging continuous cable loops.
w=ARMS['R'][2];direction=(w-ARMS['R'][1]).normalized()
ring('Open rolled shutter wrist mouth',w,direction,.172,.125,.045,EDGE,['handR'])
for j in range(5):
    dx=(j-2)*.038;dy=(j-2)*.040;length=.69+.046*j
    points=[w+Vector((dx,dy,0)),w+Vector((dx-.10,dy-.04,-.25)),w+Vector((dx-.22,dy-.08,-length*.78)),w+Vector((dx-.12,dy-.01,-length)),w+Vector((dx+.11,dy+.06,-length*.75)),w+Vector((dx+.10,dy+.075,-.25)),w+Vector((dx+.035,dy+.06,-.025))]
    points=cat(points,13);names=[]
    for k in range(12):bn='cable'+str(j)+'_'+str(k);bone(bn,points[k],points[k+1],'handR');names.append(bn)
    ob=tube('Long looped electric cable '+str(j),points,[(0,.024),(1,.021)],RUBBER,names,n=97,sides=14);ob['cable_chain']=','.join(names);ob['cable_sides']=14;ob['cable_rows']=97;CABLES[j]={'points':points,'bones':names}
    # Cable collars are weighted to the same loop and follow its movement.
    for k in [2,4,8,10]:
        d=(points[k+1]-points[k]).normalized();cyl('Electric cable splice collar',points[k]-d*.023,points[k]+d*.023,.029,STEEL2,[names[k]])

# Three curved streetlamps replace the head.
LAMPS=[[(0,.08,2.62),(-.05,.08,2.95),(-.08,.03,3.32),(.04,-.06,3.54),(.30,-.15,3.61)],
       [(-.22,.10,2.62),(-.29,.12,2.92),(-.40,.05,3.16),(-.56,-.03,3.23)],
       [(.28,.12,2.59),(.40,.12,2.88),(.59,.03,3.08),(.79,-.04,3.12)]]
for j,path in enumerate(LAMPS):
    bone('lamp'+str(j),path[0],path[-1],'chest');bn='lamp'+str(j)
    tube('Curved streetlamp mast '+str(j),path,[(0,.042),(1,.025)],FRAME,[bn],n=64,sides=22)
    cp=cat(path,64)
    for k in [4,19,36,52]:
        d=(cp[k+1]-cp[k-1]).normalized();cyl('Lamp pole repair coupling',cp[k]-d*.024,cp[k]+d*.024,.047 if k<20 else .035,STEEL2,[bn])
    tip=Vector(path[-1]);size=(.19,.115,.05) if j==0 else (.105,.075,.033)
    ell('Oval streetlamp steel housing '+str(j),tip,size,STEEL,[bn]);ell('Purple streetlamp lens '+str(j),tip+Vector((0,-.006,-size[2]*.75)),(size[0]*.82,size[1]*.79,size[2]*.32),GLOW,[bn])
    line('Streetlamp underside rim '+str(j),[tip+Vector((size[0]*.9*math.cos(math.tau*k/60),size[1]*.9*math.sin(math.tau*k/60),-size[2]*.55)) for k in range(61)],.006,EDGE,[bn])
    line('Lamp power feed '+str(j),[Vector(p)+Vector((.028,.027,0)) for p in path],.009,RUBBER,[bn])

# Normalize the full height (including streetlamps) to the reference's proposed 20 metres.
bpy.context.view_layer.update();worldverts=[o.matrix_world@v.co for o in ASSETS for v in o.data.vertices];lo=min(p.z for p in worldverts);hi=max(p.z for p in worldverts);SCALE=20/(hi-lo)
def scaled(p):p=Vector(p);return Vector((p.x*SCALE,p.y*SCALE,(p.z-lo)*SCALE))
for d in SK.values():d['head']=scaled(d['head']);d['tail']=scaled(d['tail'])
for item in CABLES.values():item['points']=[scaled(p) for p in item['points']]
ad=bpy.data.armatures.new('Nurikae mechanical skeleton');arm=bpy.data.objects.new('Nurikae rig',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=scaled(world@v.co);v.co=p
        if 'cable_chain' in o:
            t=(v.index//o['cable_sides'])/(o['cable_rows']-1)*len(names);i=min(len(names)-1,int(t));u=t-i
            if u<.22 and i>0:pair=[(names[i-1],(.22-u)/.44),(names[i],1-(.22-u)/.44)]
            elif u>.78 and i<len(names)-1:pair=[(names[i+1],(u-.78)/.44),(names[i],1-(u-.78)/.44)]
            else:pair=[(names[i],1)]
            for n,wgt in pair:groups[n].add([v.index],wgt,'REPLACE')
        else:
            near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:2];ws=[math.exp(-(d-near[0][0])*35/SCALE) for d,n in near];total=sum(ws)
            for (d,n),wg in zip(near,ws):groups[n].add([v.index],wg/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mo=o.modifiers.new('Mechanical rig','ARMATURE');mo.object=arm;o.data.validate();o.data.update()
def setworld(n,h,t,stretch=False):
    r=ad.bones[n];ma=r.matrix_local.copy();ma.translation=Vector((0,0,0));ma=(r.tail_local-r.head_local).rotation_difference(Vector(t)-Vector(h)).to_matrix().to_4x4()@ma
    if stretch:ma=ma@Matrix.Diagonal((1,(Vector(t)-Vector(h)).length/r.length,1,1))
    ma.translation=Vector(h);arm.pose.bones[n].matrix=ma;bpy.context.view_layer.update()
def ik(up,low,end,target,pole,direction):
    h=arm.pose.bones[up].head.copy();l1=(SK[low]['head']-SK[up]['head']).length;l2=(SK[end]['head']-SK[low]['head']).length;d=Vector(target)-h;length=max(abs(l1-l2)+.0001,min(d.length,l1+l2-.0001));d.normalize();target=h+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector(pole);pole-=d*pole.dot(d)
    if pole.length<.001:pole=d.orthogonal()
    joint=h+d*along+pole.normalized()*height;setworld(up,h,joint);setworld(low,joint,target);setworld(end,target,target+Vector(direction))
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','cable_sweep','repaint','core_pulse']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        a=math.sin(math.pi*f/120)**2;wave=math.sin(math.tau*f/120)
        def rotate(n,axis,deg):arm.pose.bones[n].rotation_quaternion=Quaternion(Vector(axis),math.radians(deg))
        if name=='idle':rotate('chest',(0,0,1),.40*wave);rotate('lamp0',(1,0,0),.8*wave)
        elif name=='core_pulse':arm.pose.bones['core'].scale=(1+.16*a,1,1+.16*a)
        else:
            if name=='repaint':
                off=Vector((0,-.06,-.18))*SCALE*a;setworld('pelvis',SK['pelvis']['head']+off,SK['pelvis']['tail']+off);rotate('chest',(1,0,0),18*a)
                for j in range(3):rotate('lamp'+str(j),(1,0,0),12*a)
            else:rotate('chest',(0,1,0),-8*a)
            bpy.context.view_layer.update()
            for sign,s in [(-1,'R'),(1,'L')]:
                legpole=(SK['shin'+s]['head']-SK['thigh'+s]['head']).lerp(Vector((0,-1,0))*SCALE,a)
                ik('thigh'+s,'shin'+s,'foot'+s,SK['foot'+s]['head'],legpole,SK['foot'+s]['tail']-SK['foot'+s]['head'])
                if name=='cable_sweep':goal=scaled((-1.85,-.14,2.38)) if s=='R' else scaled((1.03,-.12,1.85))
                else:goal=scaled((-1.33,-.18,1.10)) if s=='R' else scaled((1.14,-.30,1.66))
                wtarget=SK['hand'+s]['head'].lerp(goal,a);pole=(SK['foreArm'+s]['head']-SK['upperArm'+s]['head']).lerp(Vector((sign*.5,0,.1))*SCALE,a)
                handdir=SK['hand'+s]['tail']-SK['hand'+s]['head']
                if name=='cable_sweep' and s=='R':handdir=handdir.lerp(Vector((-.16,0,-.025))*SCALE,a)
                ik('upperArm'+s,'foreArm'+s,'hand'+s,wtarget,pole,handdir)
            if name=='cable_sweep':
                matrix=arm.pose.bones['handR'].matrix@ad.bones['handR'].matrix_local.inverted();wrist=arm.pose.bones['handR'].head.copy()
                for j,item in CABLES.items():
                    rest=[matrix@p for p in item['points']];dy=(j-2)*.06;dx=(j-2)*.03
                    offsets=[(dx,dy,0),(-.65+dx,dy-.03,-.02),(-1.40+dx,dy-.10,-.16),(-1.85+dx,dy-.03,-.40),(-1.40+dx,dy+.07,-.61),(-.55+dx,dy+.07,-.37),(.03+dx,dy+.06,-.03)]
                    goal=cat([wrist+Vector(p)*SCALE for p in offsets],13);points=[p.lerp(q,a) for p,q in zip(rest,goal)]
                    for k,bn in enumerate(item['bones']):setworld(bn,points[k],points[k+1],True)
            if name=='repaint':
                for j in range(3):rotate('claw'+str(j),(1,0,0),-15*a)
        for p in arm.pose.bones:p.keyframe_insert('rotation_quaternion',frame=f);p.keyframe_insert('location',frame=f);p.keyframe_insert('scale',frame=f)
    tr=arm.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,act);tr.mute=True
arm.animation_data.action=None;studio.neutral()
for ma in list(bpy.data.materials):
    obs=[o for o in sc.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==ma]
    if len(obs)>1:
        activate(obs[0])
        for o in obs:o.select_set(True)
        bpy.ops.object.join();bpy.context.object.name=ma.name
models=[o for o in sc.objects if o.type in ['MESH','ARMATURE']];activate(arm)
for o in models:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'nurikae.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
verts=[v.co for o in models if o.type=='MESH' for v in o.data.vertices]
stats={'bones':len(ad.bones),'vertices':len(verts),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'nurikae.glb')),'height_m':max(p.z for p in verts)-min(p.z for p in verts),'width_m':max(p.x for p in verts)-min(p.x for p in verts),'scale_factor':SCALE,'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2);studio.setup();studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'nurikae.blend'))
if '--skip-stills' not in sys.argv:
    for k in ['front','side','back','three_quarter','core','cable','lamps']:studio.render(os.path.join(OUT,k+'.png'),k)
print('DONE',stats,flush=True)
