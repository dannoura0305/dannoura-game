"""Asymmetric Tsugihagi miniboss. Metres, Z up, front -Y."""
import bpy,sys,os,math,json
from mathutils import Vector,Matrix
from mathutils.noise import noise
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
SK={};EYES=[]
NAVY=mat('Faded blue work jacket',(.145,.155,.185),.94,True,.18)
KNIT=mat('Grey brown knitted cardigan',(.265,.245,.22),.96,True,.13)
PANTS=mat('Dark mismatched trousers',(.135,.13,.125),.96,True,.18)
SKIN=mat('Ash grey skin',(.43,.41,.395),.91,True,.10)
LEATHER=mat('Worn brown satchel leather',(.18,.125,.085),.83,True,.17)
EDGE=mat('Leather edge and straps',(.235,.175,.12),.86,True,.13)
BOOT=mat('Scuffed dark boots',(.115,.105,.095),.91,True,.15)
SOLE=mat('Rubber soles',(.015,.013,.012),.94)
THREAD=mat('Faded warm stitching',(.070,.060,.045),.96)
CREASE=mat('Skin fold shadow',(.025,.022,.020),.96)
DARK=mat('Deep eye sockets',(.012,.011,.010),.97)
METAL=mat('Dull brass buckles',(.28,.22,.13),.68)
METAL.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.65
for m,kind,s in [(NAVY,'cloth',.24),(KNIT,'knit',.7),(PANTS,'cloth',.22),(SKIN,'skin',.35),(LEATHER,'skin',.20)]:surface_normal(m,kind,s)

def bone(n,a,b,parent=None):SK[n]={'head':a,'tail':b,'parent':parent}
def cube(n,c,size,ma,bones,bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=n;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(ma);o['bones']=','.join(bones);ASSETS.append(o)
    if bevel:
        mod=o.modifiers.new('Soft worn edge','BEVEL');mod.width=bevel;mod.segments=3;activate(o);bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def patch(n,points,ma,bones,thick=.004):
    o=mesh(n,points,[tuple(range(len(points)))],ma,bones,[(p[0]*3,p[2]*3) for p in points]);solid(o,thick);return o
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)

bone('root',(0,0,0),(0,0,.18))
bone('pelvis',(0,.04,1.24),(0,.04,1.48),'root')
bone('spine',(0,.04,1.48),(-.02,.05,1.86),'pelvis')
bone('chest',(-.02,.05,1.86),(-.08,.04,2.35),'spine')
bone('neck',(-.08,.04,2.35),(.08,-.08,2.38),'chest')
bone('head',(.08,-.08,2.38),(.11,-.20,2.34),'neck')
bone('upperArmR',(-.30,.055,2.39),(-.415,.025,1.83),'chest')
bone('foreArmR',(-.415,.025,1.83),(-.475,-.005,1.21),'upperArmR')
bone('handR',(-.475,-.005,1.21),(-.48,-.015,1.04),'foreArmR')
bone('upperArmL',(.29,.045,2.17),(.45,-.015,1.77),'chest')
bone('foreArmL',(.45,-.015,1.77),(.225,-.39,1.74),'upperArmL')
bone('handL',(.225,-.39,1.74),(.115,-.40,1.81),'foreArmL')
bone('bag',(.24,-.26,1.83),(.24,-.26,2.0),'foreArmL')
for s,hip,knee,ankle in [('R',(-.16,.05,1.35),(-.23,-.07,.79),(-.26,.02,.17)),('L',(.155,.04,1.30),(.285,-.065,.72),(.255,.025,.17))]:
    bone('thigh'+s,hip,knee,'pelvis');bone('shin'+s,knee,ankle,'thigh'+s)
    bone('foot'+s,ankle,(ankle[0],-.16,.075),'shin'+s)

# Two complementary closed cloth panels share a deliberately jagged boundary.
zig=[(0,.07),(.10,.13),(.22,-.13),(.34,.065),(.46,-.11),(.59,.11),(.72,.025),(.82,.13),(1,.015)]
def torso(t,a):
    rx=prof(t,[(0,.245),(.24,.265),(.5,.285),(.76,.305),(1,.305)])
    ry=prof(t,[(0,.175),(.25,.20),(.6,.21),(.76,.19),(1,.19)])
    if t>.76:
        cap=math.sqrt(max(.00004,1-((t-.76)/.24)**2));rx*=cap;ry*=cap
    rx+=.11*max(0,math.sin(a))*(1-t)**3
    cx=-.018-.065*t;cy=.025+.045*t
    z=1.27+1.33*t-.19*max(0,math.sin(a))*smooth((t-.55)/.30)*(1-smooth((t-.88)/.12))
    z+=.018*math.sin(3*a+1)*(1-t)**3
    fold=(.009*math.sin(9*a+4*t)+.006*math.sin(17*a-11*t))*math.sin(math.pi*t)**.5
    fold+=.008*math.sin(32*t+4*a)*math.sin(math.pi*t)
    return Vector((cx+(rx+fold)*math.sin(a),cy-(ry+fold)*math.cos(a),z))
def boundary(t):
    rx=prof(t,[(0,.245),(.24,.265),(.5,.285),(.72,.305),(.86,.28),(.94,.20),(1,.025)])
    return math.asin(max(-.80,min(.80,(prof(t,zig)+.018+.065*t)/rx)))
for side,ma in [('left',KNIT),('right',NAVY)]:
    vs=[];fs=[];uv=[];N=44;R=104
    for i in range(R+1):
        t=i/R;b=boundary(t)
        for j in range(N+1):
            a=b+(math.pi-2*b)*j/N if side=='left' else math.pi-b+(math.pi+2*b)*j/N
            vs.append(torso(t,a));uv.append((a/math.tau*2,t*2))
    for i in range(R):
        for j in range(N):k=i*(N+1)+j;fs.append((k,k+1,k+N+2,k+N+1))
    o=mesh('Joined torso '+side,vs,fs,ma,['pelvis','spine','chest'],uv)
    if side=='left':
        o.data.materials.append(NAVY)
        for poly in o.data.polygons:
            if poly.index//N>88:poly.material_index=1
    solid(o,.008)
for back in [False,True]:
    pts=[]
    for i in range(141):
        t=i/140;a=math.pi-boundary(t) if back else boundary(t);p=torso(t,a);p.y+=.006 if back else -.006;pts.append(p)
    line('Closed jagged joining seam',pts,.0018,THREAD,['pelvis','spine','chest'])
    # Short cross stitches follow the closed border, without opening the body.
    for i in range(2,99,3):
        t=i/100;b=boundary(t);a=math.pi-b if back else b
        p=torso(t,a-.014);q=torso(t,a+.014);offset=Vector((0,.009 if back else -.009,0))
        line('Boundary stitch',[p+offset,q+offset],.001,THREAD,['spine','chest'])
for side,ma in [('L',KNIT),('R',NAVY)]:
    b=boundary(.02);angles=[b+(math.pi-2*b)*j/80 if side=='L' else math.pi-b+(math.pi+2*b)*j/80 for j in range(81)]
    for t in (.012,.025):line('Uneven jacket hem',[torso(t,a)+Vector((0,0,.002)) for a in angles],.0015,THREAD,['pelvis'])

# Raised lapels reinforce the closed zigzag seam near the throat.
patch('Blue folded collar',[(-.16,-.105,2.50),(.02,-.16,2.46),(.015,-.235,2.32),(-.09,-.235,2.37)],NAVY,['chest'])
patch('Grey folded lapel',[(.17,-.16,2.38),(.23,-.18,2.23),(.12,-.24,2.18),(.18,-.24,2.12),(.02,-.23,2.18),(.095,-.25,2.31)],KNIT,['chest'])
line('Collar edge',[(-.16,-.111,2.50),(.02,-.166,2.46),(.015,-.242,2.32)],.002,THREAD,['chest'])

# Pocket on the tall blue half, fitted to the front cloth surface.
def front_at(x,z):
    t=(z-1.27)/1.33
    a=math.asin(max(-.9,min(.9,(x+.018+.065*t)/.29)))
    for _ in range(8):
        p=torso(t,a);t+=(z-p.z)/1.33;a+=(x-p.x)/.30
    return p+Vector((0,-.012,0))
pocketpts=[front_at(x,z) for x,z in [(-.28,2.21),(-.10,2.21),(-.10,2.07),(-.19,2.045),(-.28,2.07)]]
patch('Blue chest pocket',pocketpts,NAVY,['chest'])
line('Pocket sewn edge',pocketpts+[pocketpts[0]],.0013,THREAD,['chest'])
flap=[front_at(x,z)+Vector((0,-.008,0)) for x,z in [(-.28,2.205),(-.10,2.205),(-.10,2.16),(-.19,2.135),(-.28,2.16)]]
patch('Pocket flap',flap,NAVY,['chest']);line('Pocket flap stitch',flap+[flap[0]],.0012,THREAD,['chest'])
ell('Pocket button',front_at(-.19,2.16)+Vector((0,-.017,0)),(.008,.003,.008),METAL,['chest'])
for x,z in [(-.03,2.24),(-.025,2.15),(-.025,2.04),(.06,1.89)]:
    ell('Mismatched coat button',front_at(x,z)+Vector((0,-.003,0)),(.008,.004,.008),METAL,['chest'])

# A small, bowed head sinks between the unequal shoulders.
head=ell('Bowed small head',(.11,-.165,2.35),(.118,.132,.145),SKIN,['head'])
activate(head);mod=head.modifiers.new('Smooth head surface','SUBSURF');mod.levels=2;bpy.ops.object.modifier_apply(modifier=mod.name)
for v in head.data.vertices:
    p=v.co;p.x+=.035*(p.z/.145);p.y-=.025*max(0,-p.z/.145)
    p+=p.normalized()*(.0028*math.sin(43*p.z+2*math.atan2(p.y,p.x))+.002*noise(p*90))
activate(head);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
for x,z in [(.065,2.36),(.173,2.355)]:
    hit,p,n,idx=head.ray_cast(Vector((x,-2,z)),Vector((0,1,0)))
    if not hit:raise RuntimeError('Eye point outside head')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=14,location=p+n*.001);c=bpy.context.object;c.scale=(.018,.018,.018)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    activate(head);mod=head.modifiers.new('Recessed eye hollow','BOOLEAN');mod.object=c;mod.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(c,do_unlink=True)
    eye=ell('Dark recessed eye',p-n*.011,(.010,.004,.011),DARK,['head']);EYES.append(eye)
pts=[]
for i in range(35):
    x=.027+.132*i/34;z=2.263+.018*math.sin(math.pi*i/34)
    hit,p,n,index=head.ray_cast(Vector((x,-2,z)),Vector((0,1,0)))
    if hit:pts.append(p+n*.0008)
line('Downturned mouth crease',pts,.0016,CREASE,['head'])

# Long striking arm and short cradling arm.
tube('Long blue right sleeve',[(-.19,.05,2.39),(-.32,.045,2.31),(-.37,.045,2.12),(-.415,.025,1.84),(-.45,.01,1.50),(-.475,-.005,1.22)],[(0,.055),(.14,.135),(.52,.105),(.80,.087),(1,.097)],NAVY,['upperArmR','foreArmR'],n=95,sides=48,fold=.010,cap=True)
cu=tube('Blue wrist cuff',[(-.474,-.005,1.205),(-.473,-.002,1.29)],[(0,.119),(.5,.123),(1,.119)],NAVY,['foreArmR'],n=15,sides=44,fold=.001,cap=False);solid(cu,.006)
line('Blue cuff stitching',[(-.474+.120*math.cos(a),-.005+.120*math.sin(a),1.222) for a in [math.tau*j/60 for j in range(61)]],.0014,THREAD,['foreArmR'])
tube('Short grey upper sleeve',[(.17,.04,2.20),(.30,.04,2.12),(.38,.035,1.98),(.45,-.015,1.77)],[(0,.055),(.28,.13),(.85,.105),(1,.100)],KNIT,['upperArmL'],n=48,sides=48,fold=.008)
tube('Cradling grey fore sleeve',[(.45,-.015,1.77),(.40,-.18,1.73),(.225,-.39,1.74)],[(0,.105),(.45,.098),(1,.070)],KNIT,['foreArmL'],n=48,sides=48,fold=.007)
cu=tube('Ribbed cardigan cuff',[(.265,-.347,1.737),(.218,-.399,1.742)],[(0,.091),(1,.088)],KNIT,['foreArmL'],n=15,sides=44,fold=.001,cap=False);solid(cu,.005)

# Fused oversized striking fist with four broad curled fingers.
parts=[tube('Right wrist',[(-.475,-.005,1.25),(-.48,-.01,1.12)],[(0,.069),(1,.073)],SKIN,['handR'],n=22),ell('Right palm',(-.48,-.005,1.10),(.105,.077,.115),SKIN,['handR'])]
for k,x in enumerate([-.555,-.505,-.455,-.405]):
    bn='finger'+str(k+1)+'R';bone(bn,(x,-.035,1.09),(x,.025,1.04),'handR')
    parts.append(tube('Curled striking finger',[(x,-.035,1.11),(x,-.077,1.02),(x,-.035,.975),(x,.025,1.04)],[(0,.029),(.38,.032),(.70,.029),(1,.023)],SKIN,[bn],n=27,sides=24))
    parts.append(ell('Broad striking knuckle',(x,-.072,1.025),(.033,.039,.040),SKIN,[bn]))
bone('thumbR',(-.39,-.0,1.13),(-.405,-.085,1.06),'handR')
parts.append(tube('Folded fist thumb',[(-.39,.005,1.15),(-.365,-.045,1.11),(-.405,-.091,1.055)],[(0,.033),(.5,.035),(1,.027)],SKIN,['thumbR'],n=28))
fist=union('Thick continuous striking fist',parts,['handR']+['finger'+str(i)+'R' for i in range(1,5)]+['thumbR'])
for k,x in enumerate([-.555,-.505,-.455,-.405]):
    pts=[]
    for j in range(15):
        xx=x-.018+.036*j/14;z=1.036+.003*math.sin(math.pi*j/14);hit,p,n,index=fist.ray_cast(Vector((xx,-2,z)),Vector((0,1,0)))
        if hit:pts.append(p+n*.0003)
    line('Broad knuckle crease',pts,.0005,CREASE,['handR'])

# Satchel: closed flap, gussets, twin buckled straps, stitched edges.
cube('Satchel main pouch',(.245,-.255,1.835),(.355,.19,.365),LEATHER,['bag'],.040)
cube('Satchel rounded flap',(.245,-.365,1.968),(.375,.033,.170),EDGE,['bag'],.025)
for x in [.125,.365]:
    cube('Vertical satchel strap',(x,-.390,1.885),(.027,.013,.235),LEATHER,['bag'],.004)
    for dx in [-.021,.021]:cube('Brass buckle side',(x+dx,-.406,1.865),(.006,.008,.048),METAL,['bag'],.002)
    for z in [1.843,1.887]:cube('Brass buckle crossbar',(x,-.406,z),(.048,.008,.006),METAL,['bag'],.002)
    line('Buckle tongue',[(x,-.414,1.842),(x,-.414,1.882)],.002,METAL,['bag'])
    for z in [1.925,1.944,1.962]:ell('Strap hole',(x,-.398,z),(.002,.001,.003),DARK,['bag'])
for x in [.077,.413]:
    line('Leather side gusset',[(x,-.32,1.69),(x,-.34,1.83),(x,-.32,1.99)],.003,EDGE,['bag'])
flapedge=[(.075,-.384,2.035),(.075,-.386,1.904),(.245,-.386,1.892),(.415,-.386,1.904),(.415,-.384,2.035)]
line('Satchel flap sewn edge',flapedge,.0014,THREAD,['bag'])
line('Satchel carry handle',[(.17,-.23,2.015),(.17,-.23,2.07),(.31,-.23,2.07),(.31,-.23,2.015)],.012,LEATHER,['bag'])

# Smaller left hand presses against the front of the bag.
parts=[ell('Cradling left palm',(.18,-.413,1.79),(.077,.035,.057),SKIN,['handL'])]
for k,z in enumerate([1.750,1.774,1.798,1.822]):
    bn='finger'+str(k+1)+'L';bone(bn,(.17,-.413,z),(.087,-.385,z+.011),'handL')
    parts.append(tube('Cradling finger',[(.19,-.417,z),(.12,-.424,z+.004),(.086,-.389,z+.011)],[(0,.014),(.65,.015),(1,.009)],SKIN,[bn],n=22,sides=20))
bone('thumbL',(.205,-.413,1.82),(.14,-.414,1.862),'handL')
parts.append(tube('Cradling thumb',[(.205,-.416,1.815),(.183,-.437,1.852),(.140,-.414,1.862)],[(0,.019),(.5,.018),(1,.012)],SKIN,['thumbL'],n=22))
union('Continuous cradling hand',parts,['handL']+['finger'+str(i)+'L' for i in range(1,5)]+['thumbL'])

# Unequal legs and different footwear.
for s in ['R','L']:
    hip,knee,ankle=[SK[n+s]['head'] for n in ['thigh','shin','foot']]
    x=ankle[0]
    path=[hip,((hip[0]+knee[0])/2,-.025,1.05),knee,(x,.02,.36),ankle]
    radii=[(0,.095),(.3,.085),(.58,.067),(.90,.064),(1,.067)] if s=='R' else [(0,.110),(.25,.163),(.58,.147),(.80,.13),(.93,.115),(1,.105)]
    trouser=tube('Thin right trouser' if s=='R' else 'Baggy left trouser',path,radii,PANTS,['thigh'+s,'shin'+s],n=90,sides=48,fold=.0055 if s=='R' else .014)
    centers=cat(path,90)
    for v in trouser.data.vertices:
        i,j=divmod(v.index,48);t=i/89;a=math.tau*j/48
        fold=(.006 if s=='R' else .019)*math.sin(36*t+3*math.sin(a))*math.exp(-((t-.56)/.28)**2)
        fold+=(.003 if s=='R' else .008)*math.sin(62*t+4*a)*math.sin(math.pi*t)**2
        v.co+=(v.co-centers[i]).normalized()*fold
    w=.095 if s=='R' else .116;length=.165 if s=='R' else .19
    ell('Boot rubber sole '+s,(x,-.070,.030),(w+.008,length,.030),SOLE,['foot'+s])
    ell('Boot toe '+s,(x,-.081,.081),(w,length-.006,.060),BOOT,['foot'+s])
    tube('Boot ankle '+s,[(x,.025,.09),(x,.024,.16 if s=='R' else .30)],[(0,w*.90),(1,w*.82)],BOOT,['foot'+s],n=25,sides=40,flat=.9,fold=.002)
    cube('Boot heel '+s,(x,.036,.035),(w*1.65,.11,.057),SOLE,['foot'+s],.012)
    line('Boot sole welt '+s,[(x+(w+.005)*math.cos(a),-.070+length*math.sin(a),.047) for a in [math.tau*j/60 for j in range(61)]],.002,THREAD,['foot'+s])
    count=4 if s=='R' else 7
    for j in range(count):
        z=.11+j*(.010 if s=='R' else .021);y=-.10+j*.009
        for sd in [-1,1]:ell('Boot lace eyelet',(x+sd*.035,y,z),(.004,.002,.004),METAL,['foot'+s])
        line('Crossed boot lace',[(x-.035,y-.003,z),(x+.035,y+.005,z+.012)],.0018,THREAD,['foot'+s])
        line('Crossed boot lace',[(x+.035,y-.003,z),(x-.035,y+.005,z+.012)],.0018,THREAD,['foot'+s])

# Apply the bowed head and hunched posture consistently to skin and skeleton.
def bow_head(p):
    c=Vector((.11,-.165,2.35));r=Matrix.Rotation(math.radians(25),3,'X')@Matrix.Rotation(math.radians(-38),3,'Z')
    return c+r@(Vector(p)-c)
def hunch(p):
    p=Vector(p);s=smooth((p.z-1.45)/1.15);p.y-=.12*s;p.z-=.03*s;return p
for n,d in SK.items():
    for key in ['head','tail']:d[key]=hunch(bow_head(d[key]) if n=='head' else d[key])
# Deformation rig. Each piece is bound only to its anatomical chain.
ad=bpy.data.armatures.new('Tsugihagi skeleton');arm=bpy.data.objects.new('Tsugihagi rig',ad);bpy.context.collection.objects.link(arm)
activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    a,b=Vector(a),Vector(b);ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    bones=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in bones};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=world@v.co;p=hunch(bow_head(p) if bones==['head'] else p);v.co=p;near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in bones)[:3]
        weights=[math.exp(-(d-near[0][0])*42) for d,n in near];total=sum(weights)
        for (d,n),w in zip(near,weights):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mod=o.modifiers.new('Character skin','ARMATURE');mod.object=arm;o.data.validate();o.data.update()
for o in EYES:
    o.shape_key_add(name='Basis');key=o.shape_key_add(name='blink');cz=sum(v.co.z for v in key.data)/len(key.data)
    for v in key.data:v.co.z=cz+(v.co.z-cz)*.1;v.co.y+=.008

def set_world_bone(name,head,tail=None):
    rest=ad.bones[name];m=rest.matrix_local.copy();m.translation=Vector((0,0,0))
    if tail is not None:
        q=(rest.tail_local-rest.head_local).rotation_difference(Vector(tail)-Vector(head));m=q.to_matrix().to_4x4()@m
    m.translation=Vector(head);arm.pose.bones[name].matrix=m;bpy.context.view_layer.update()
def walk_leg(s,phase):
    hip=Vector(SK['thigh'+s]['head']);knee0=Vector(SK['shin'+s]['head']);foot0=Vector(SK['foot'+s]['head'])
    target=foot0+Vector((0,.135*math.cos(phase),.055*max(0,math.sin(phase))))
    l1=(knee0-hip).length;l2=(foot0-knee0).length;d=target-hip;length=min(d.length,(l1+l2)*.999);d.normalize();target=hip+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along))
    pole=Vector((0,-1,0));pole=(pole-d*pole.dot(d)).normalized();knee=hip+d*along+pole*height
    set_world_bone('thigh'+s,hip,knee);set_world_bone('shin'+s,knee,target);set_world_bone('foot'+s,target)
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','knock','walk_in_place','protect_bag']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0)
        a=math.sin(math.pi*f/120)**2
        def rotate(n,axis,deg):
            from mathutils import Quaternion
            arm.pose.bones[n].rotation_quaternion=Quaternion(Vector(axis),math.radians(deg))
        if name=='idle':rotate('chest',(1,0,0),.65*math.sin(math.tau*f/120))
        elif name=='knock':
            rotate('upperArmR',(1,0,0),-68*a);rotate('foreArmR',(1,0,0),(-26+8*math.sin(math.tau*f/30))*a);rotate('handR',(1,0,0),9*a)
            rotate('chest',(0,1,0),-3*a)
        elif name=='protect_bag':
            rotate('chest',(1,0,0),7*a);rotate('foreArmL',(1,0,0),-5*a);rotate('head',(0,1,0),-5*a)
        else:
            bpy.context.view_layer.update();walk_leg('R',math.tau*f/120);walk_leg('L',math.tau*f/120+math.pi)
            rotate('upperArmR',(1,0,0),-9*math.cos(math.tau*f/120))
        for p in arm.pose.bones:p.keyframe_insert('rotation_quaternion',frame=f);p.keyframe_insert('location',frame=f)
    tr=arm.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,act);tr.mute=True
arm.animation_data.action=None;studio.neutral()
for ma in list(bpy.data.materials):
    obs=[o for o in sc.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==ma and not o.data.shape_keys]
    if len(obs)>1:
        activate(obs[0])
        for o in obs:o.select_set(True)
        bpy.ops.object.join();bpy.context.object.name=ma.name
models=[o for o in sc.objects if o.type in ['MESH','ARMATURE']]
activate(arm)
for o in models:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'tsugihagi.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True,export_morph=True,export_morph_normal=False)
stats={'bones':len(ad.bones),'vertices':sum(len(o.data.vertices) for o in models if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'tsugihagi.glb')),'height_m':max(v.co.z for o in models if o.type=='MESH' for v in o.data.vertices)-min(v.co.z for o in models if o.type=='MESH' for v in o.data.vertices),'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup(1000,28)
for k in ['front','side','back','three_quarter','face','hand','bag']:studio.render(os.path.join(OUT,k+'.png'),k)
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'tsugihagi.blend'))
print('DONE',stats,flush=True)
