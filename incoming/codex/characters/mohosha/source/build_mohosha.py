"""Mohosha / true form: continuous twisted charcoal figure, not human disguise."""
import bpy,sys,os,math,json
from mathutils import Vector,Matrix,Quaternion
from mathutils.noise import noise
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
SK={};FACE=[]
BODY=mat('Charcoal flowing body',(.265,.25,.265),.91,True,.075)
FOLD=mat('Raised graphite folds',(.30,.28,.295),.91,True,.065)
COAT=mat('Fused charcoal coat',(.285,.27,.285),.94,True,.08)
DARK=mat('Deep facial cavities',(.009,.008,.010),.98)
SEAM=mat('Subtle folded edges',(.045,.039,.047),.95)
for ma in [BODY,FOLD,COAT]:surface_normal(ma,'skin',.20)
def bone(n,a,b,parent=None):SK[n]={'head':a,'tail':b,'parent':parent}
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def patch(name,vs,ma,bones,thick=.003):
    o=mesh(name,vs,[tuple(range(len(vs)))],ma,bones,[(p[0]*2,p[2]*2) for p in vs]);solid(o,thick);return o
def flow(name,path,radii,ma,bones,n=60,sides=48,twist=5,ridge=.009,flat=1):
    pts=cat(path,n);vs=[];fs=[];uv=[];prev=Vector((1,0,0))
    for i,c in enumerate(pts):
        t=i/(n-1);d=(pts[min(i+1,n-1)]-pts[max(0,i-1)]).normalized();a=prev-d*prev.dot(d)
        if a.length<.01:a=d.orthogonal()
        a.normalize();b=d.cross(a).normalized();prev=a;r=prof(t,radii)
        for j in range(sides):
            th=math.tau*j/sides;f=3*th+twist*t
            rr=r*(1+.10*math.sin(f))+ridge*max(0,math.cos(f))**5*math.sin(math.pi*t)**.6
            vs.append(c+rr*(a*math.cos(th)+b*math.sin(th)*flat));uv.append((j/sides,t))
    for i in range(n-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(reversed(range(sides))),tuple((n-1)*sides+j for j in range(sides))])
    return mesh(name,vs,fs,ma,bones,uv)

bone('root',(0,0,0),(0,0,.15))
bone('pelvis',(0,.025,1.08),(0,.025,1.28),'root')
bone('spine',(0,.025,1.28),(0,.025,1.60),'pelvis')
bone('chest',(0,.025,1.60),(0,.025,1.91),'spine')
bone('neck',(0,.025,1.91),(-.015,-.005,2.085),'chest')
bone('head',(-.015,-.005,2.085),(-.015,-.01,2.23),'neck')

# Narrow torso, S-curved waist and three rotating raised surface crests.
def body(t,a,offset=0):
    rx=prof(t,[(0,.135),(.16,.155),(.38,.104),(.55,.100),(.78,.175),(.90,.195),(1,.075)])
    ry=prof(t,[(0,.075),(.2,.088),(.43,.057),(.7,.085),(.88,.090),(1,.055)])
    ridge=.013*max(0,math.cos(3*a+6*t))**5*math.sin(math.pi*t)
    cx=.019*math.sin(math.tau*t);cy=.020+.012*math.sin(math.pi*t)
    return Vector((cx+(rx+ridge+offset)*math.sin(a),cy-(ry+ridge+offset)*math.cos(a),1.08+.87*t))
vs=[];fs=[];uv=[];N=112;R=90
for i in range(R+1):
    for j in range(N):vs.append(body(i/R,math.tau*j/N));uv.append((j/N,i/R))
for i in range(R):
    for j in range(N):k=i*N+j;l=i*N+(j+1)%N;fs.append((k,l,l+N,k+N))
fs.extend([tuple(reversed(range(N))),tuple(R*N+j for j in range(N))])
mesh('Continuous twisted torso',vs,fs,BODY,['pelvis','spine','chest'],uv)

# Broad cloth-like ribbons share the torso surface at their edges.
def ribbon(name,t0,t1,a0,a1,width,back=False):
    vs=[];fs=[];uv=[];N=20;R=65
    for i in range(R+1):
        u=i/R;t=t0+(t1-t0)*u;center=a0+(a1-a0)*smooth(u)+(math.pi if back else 0)
        w=width*(.035+.965*math.sin(math.pi*u)**.45)
        for j in range(N+1):
            v=j/N;a=center+(v-.5)*w
            offset=.002+.022*math.sin(math.pi*v)**1.5*math.sin(math.pi*u)
            p=body(t,a,offset);p.z+=.024*math.sin(math.pi*u)*(2*v-1)
            vs.append(p);uv.append((v,u))
    for i in range(R):
        for j in range(N):k=i*(N+1)+j;fs.append((k,k+1,k+N+2,k+N+1))
    o=mesh(name,vs,fs,FOLD,['pelvis','spine','chest'],uv);solid(o,.003)
for back in [False,True]:
    ribbon('Sweeping waist fold',.04,.80,-1.0,.85,1.1,back)
    ribbon('Crossing chest fold',.33,.97,.85,-.8,1.15,back)
    ribbon('Lower spiral fold',0,.44,.95,-1.0,1.0,back)

# Angular collar and lapels, with pointed coat skirts and two integrated pockets.
patch('Left collar',[(.035,-.012,1.97),(.13,-.012,1.99),(.20,-.047,1.91),(.10,-.112,1.82)],COAT,['chest','neck'])
patch('Right collar',[(-.045,-.008,1.96),(-.12,-.005,1.985),(-.20,-.047,1.90),(-.09,-.106,1.83)],COAT,['chest','neck'])
patch('Left sweeping lapel',[(.13,-.074,1.91),(.10,-.135,1.81),(.16,-.125,1.72),(.01,-.115,1.65),(.045,-.095,1.81)],FOLD,['chest'])
patch('Right long lapel',[(-.14,-.072,1.90),(-.085,-.126,1.79),(-.12,-.114,1.72),(-.028,-.102,1.51),(-.035,-.105,1.74)],COAT,['spine','chest'])
for sd,s in [(1,'L'),(-1,'R')]:
    m=lambda x,y,z:(sd*x,y,z)
    patch('Pointed coat skirt '+s,[m(.035,-.08,1.48),m(.125,-.062,1.46),m(.175,-.045,1.16),m(.12,-.095,1.045),m(.055,-.11,1.14),m(.015,-.11,1.07)],COAT,['pelvis','spine'])
    patch('Integrated pocket '+s,[m(.09,-.105,1.365),m(.177,-.083,1.355),m(.183,-.078,1.225),m(.11,-.105,1.21)],COAT,['pelvis','spine'])
    flap=[m(.085,-.111,1.37),m(.178,-.09,1.36),m(.178,-.093,1.321),m(.092,-.116,1.33)]
    patch('Pocket flap '+s,flap,FOLD,['pelvis','spine'])
    line('Pocket flap lower seam '+s,[flap[3],flap[2]],.0011,SEAM,['pelvis','spine'])
flow('Flowing exposed neck',[(0,.025,1.87),(-.007,.004,1.99),(-.015,-.005,2.105)],[(0,.061),(.5,.042),(1,.058)],BODY,['neck','head'],n=60,twist=5,ridge=.009)

# Smooth folded mask, with genuinely carved empty eye sockets and a crescent mouth.
parts=[]
head=ell('Mask head',(-.015,-.005,2.16),(.099,.088,.139),BODY,['head'])
activate(head);mod=head.modifiers.new('Smooth mask','SUBSURF');mod.levels=2;bpy.ops.object.modifier_apply(modifier=mod.name)
for v in head.data.vertices:
    p=v.co;th=math.atan2(p.y,p.x);p+=p.normalized()*(.0025*math.sin(5*th+28*p.z)+.0008*noise(p*95))
    if p.z<0:p.x*=.90+.10*(p.z+.139)/.139
parts.append(head);parts.append(ell('Continuous nose bridge',(-.015,-.080,2.14),(.013,.018,.041),BODY,['head']))
head=union('Hollow smiling mask',parts,['head'])
def head_surface(x,z):
    hit,p,n,index=head.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
    if not hit:raise RuntimeError('Outside mask '+str((x,z)))
    return p,n
def cut(c):
    if c in ASSETS:ASSETS.remove(c)
    activate(head);mod=head.modifiers.new('Carved face cavity','BOOLEAN');mod.operation='DIFFERENCE';mod.object=c;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(c,do_unlink=True)
for sd in [-1,1]:
    x=-.015+sd*.044;z=2.182+sd*.003;p,n=head_surface(x,z)
    c=ell('Socket cutter',(x,p.y-.003,z),(.032,.045,.040),BODY,['head'])
    for v in c.data.vertices:v.co.x*=.75+.42*(v.co.z/.040)
    c.rotation_euler.y=math.radians(sd*-24);cut(c)
    liner=ell('Empty eye socket darkness',(x,p.y+.033,z),(.026,.002,.034),DARK,['head'])
    for v in liner.data.vertices:v.co.x*=.75+.42*(v.co.z/.034)
    liner.rotation_euler.y=math.radians(sd*-24)
mouth=[]
for i in range(49):
    u=i/48;x=-.015-.066+.132*u;z=2.078+.035*abs(2*u-1)**1.7;p,n=head_surface(x,z);mouth.append(p)
c=tube('Crescent mouth cutter',[p+Vector((0,-.002,0)) for p in mouth],[(0,.003),(.18,.008),(.5,.010),(.82,.008),(1,.003)],BODY,['head'],n=100,sides=20);cut(c)
tube('Dark smiling mouth',[p+Vector((0,.010,0)) for p in mouth],[(0,.0015),(.18,.006),(.5,.008),(.82,.006),(1,.0015)],DARK,['head'],n=100,sides=16)
# Flowing scalp strips converge at the forehead and carry the body's twist upward.
for sd in [-1,1]:
    pts=[(-.015+sd*.025,.008,2.292),(-.015+sd*.066,-.035,2.255),(-.015+sd*.080,-.057,2.205),(-.015+sd*.069,-.041,2.125)]
    flow('Scalp and cheek fold',pts,[(0,.001),(.25,.006),(.65,.008),(1,.001)],FOLD,['head'],n=48,sides=16,twist=2,ridge=.001,flat=.4)
FACE=[o for o in ASSETS if o['bones']=='head']

# Tapering limbs: the three ridges rotate continuously along each segment.
for sd,s in [(1,'L'),(-1,'R')]:
    m=lambda x,y,z:(sd*x,y,z)
    shoulder=m(.18,.025,1.885);elbow=m(.285,-.008,1.49);wrist=m(.405,-.035,1.105)
    bone('upperArm'+s,shoulder,elbow,'chest');bone('foreArm'+s,elbow,wrist,'upperArm'+s)
    bone('hand'+s,wrist,m(.423,-.055,.995),'foreArm'+s)
    upper=flow('Spiral upper arm '+s,[m(.14,.025,1.89),m(.23,.012,1.78),elbow],[(0,.045),(.3,.055),(.75,.039),(1,.034)],BODY,['upperArm'+s],n=68,twist=6*sd,ridge=.011)
    lower=flow('Blade like forearm '+s,[elbow,m(.345,-.024,1.29),wrist],[(0,.034),(.32,.044),(.75,.027),(1,.023)],BODY,['foreArm'+s],n=70,twist=-5*sd,ridge=.011)
    joint=ell('Continuous elbow bridge '+s,elbow,(.036,.036,.051),BODY,['upperArm'+s,'foreArm'+s])
    union('Continuous flowing arm '+s,[upper,lower,joint],['upperArm'+s,'foreArm'+s])
    hp=[tube('Thin wrist '+s,[m(.398,-.033,1.13),m(.421,-.045,1.035)],[(0,.024),(1,.025)],BODY,['hand'+s],n=20),ell('Long palm '+s,m(.426,-.044,1.008),(.044,.025,.072),BODY,['hand'+s])]
    fingers=[]
    for k,(dx,endz) in enumerate([(-.026,.795),(-.008,.760),(.012,.775),(.032,.820)]):
        base=m(.426+dx,-.051,.978);mid=m(.440+dx*1.65,-.070,.88+(endz-.77)*.45);end=m(.420+dx*1.45,-.119,endz)
        bn='finger'+str(k+1)+s;bone(bn,base,end,'hand'+s);fingers.append(bn)
        hp.append(tube('Long hooked finger '+bn,[base,mid,end,m(.405+dx*1.40,-.13,endz+.007)],[(0,.0105),(.35,.010),(.72,.007),(1,.0015)],BODY,[bn],n=40,sides=20))
    bn='thumb'+s;bone(bn,m(.396,-.042,1.025),m(.35,-.085,.945),'hand'+s);fingers.append(bn)
    hp.append(tube('Hooked thumb '+s,[m(.396,-.042,1.025),m(.353,-.058,.995),m(.344,-.077,.953),m(.359,-.092,.937)],[(0,.014),(.45,.012),(.8,.008),(1,.0015)],BODY,[bn],n=35,sides=20))
    union('Continuous long hand '+s,hp,['hand'+s]+fingers)
    hip=m(.085,.025,1.135);knee=m(.098,-.018,.625);ankle=m(.103,.015,.095)
    bone('thigh'+s,hip,knee,'pelvis');bone('shin'+s,knee,ankle,'thigh'+s);bone('foot'+s,ankle,m(.103,-.115,.040),'shin'+s)
    upper=flow('Twisted upper leg '+s,[hip,m(.09,.022,.93),knee],[(0,.065),(.30,.069),(.70,.046),(1,.038)],BODY,['thigh'+s],n=75,twist=-7*sd,ridge=.013)
    lower=flow('Twisted lower leg '+s,[knee,m(.10,.03,.41),ankle],[(0,.037),(.25,.049),(.60,.034),(1,.022)],BODY,['shin'+s],n=76,twist=7*sd,ridge=.012)
    joint=ell('Continuous knee bridge '+s,knee,(.041,.040,.055),BODY,['thigh'+s,'shin'+s])
    union('Continuous twisted leg '+s,[upper,lower,joint],['thigh'+s,'shin'+s])
    fp=[ell('Bare foot '+s,m(.103,-.046,.040),(.052,.091,.039),BODY,['foot'+s]),tube('Ankle '+s,[m(.103,.015,.13),m(.103,-.005,.048)],[(0,.023),(1,.035)],BODY,['foot'+s],n=24)]
    for j in range(5):
        x=.067+j*.018;length=.048-.006*j
        fp.append(tube('Bare toe '+s,[m(x,-.095,.027),m(x,-.118-length*.5,.023),m(x,-.105-length,.020)],[(0,.0105 if j==0 else .0085),(.6,.009 if j==0 else .007),(1,.003)],BODY,['foot'+s],n=18,sides=16))
    union('Continuous bare foot '+s,fp,['foot'+s])

# A slight permanent tilt is part of the reference silhouette.
def tilt_head(p):
    c=Vector((-.015,-.005,2.085));r=Matrix.Rotation(math.radians(-22),3,'Y')@Matrix.Rotation(math.radians(12),3,'X');return c+r@(Vector(p)-c)
def posture(p):
    p=Vector(p);s=smooth((p.z-1.85)/.38);p.y-=.045*s;p.z-=.045*s;return p
for key in ['head','tail']:SK['head'][key]=tilt_head(SK['head'][key])
for d in SK.values():
    for key in ['head','tail']:d[key]=posture(d[key])
ad=bpy.data.armatures.new('Mohosha skeleton');arm=bpy.data.objects.new('Mohosha rig',ad);bpy.context.collection.objects.link(arm)
activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    a,b=Vector(a),Vector(b);ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
def smile_delta(p):
    x=p.x+.015;z=p.z;weight=math.exp(-((z-(2.078+.035*min(1,abs(x)/.066)**1.7))/.028)**2)*max(0,1-(abs(x)/.10)**6)
    return Vector((x*.05*weight,0,(.012*(min(1,abs(x)/.066))**1.5-.005)*weight))
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy();original=[]
    for v in o.data.vertices:
        raw=world@v.co;original.append(raw.copy());p=posture(tilt_head(raw) if o in FACE else raw);v.co=p
        nearest=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:3];weights=[math.exp(-(d-nearest[0][0])*45) for d,n in nearest];total=sum(weights)
        for (d,n),w in zip(nearest,weights):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mod=o.modifiers.new('Character skin','ARMATURE');mod.object=arm;o.data.validate();o.data.update()
    if o in FACE:
        o.shape_key_add(name='Basis');key=o.shape_key_add(name='smile')
        for v,p in zip(key.data,original):v.co=posture(tilt_head(p+smile_delta(p)))

def set_world_bone(name,head,tail=None):
    rest=ad.bones[name];m=rest.matrix_local.copy();m.translation=Vector((0,0,0))
    if tail is not None:m=(rest.tail_local-rest.head_local).rotation_difference(Vector(tail)-Vector(head)).to_matrix().to_4x4()@m
    m.translation=Vector(head);arm.pose.bones[name].matrix=m;bpy.context.view_layer.update()
def reach_arm(s,a):
    shoulder=Vector(SK['upperArm'+s]['head']);elbow0=Vector(SK['foreArm'+s]['head']);wrist0=Vector(SK['hand'+s]['head'])
    sign=1 if shoulder.x>0 else -1
    target=wrist0.lerp(Vector((sign*.32,-.67,1.50)),a)
    l1=(elbow0-shoulder).length;l2=(wrist0-elbow0).length;d=target-shoulder;length=min(d.length,(l1+l2)*.999);d.normalize();target=shoulder+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along))
    pole=(elbow0-shoulder).lerp(Vector((sign*.35,0,-.35)),a);pole=(pole-d*pole.dot(d)).normalized();elbow=shoulder+d*along+pole*height
    set_world_bone('upperArm'+s,shoulder,elbow);set_world_bone('foreArm'+s,elbow,target)
    hand_dir=(Vector(SK['hand'+s]['tail'])-wrist0).lerp(Vector((0,-.11,-.015)),a)
    set_world_bone('hand'+s,target,target+hand_dir)

def walk_leg(s,phase):
    hip=Vector(SK['thigh'+s]['head']);knee0=Vector(SK['shin'+s]['head']);foot0=Vector(SK['foot'+s]['head'])
    target=foot0+Vector((0,.095*math.cos(phase),.037*max(0,math.sin(phase))))
    l1=(knee0-hip).length;l2=(foot0-knee0).length;d=target-hip;length=min(d.length,(l1+l2)*.999);d.normalize();target=hip+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector((0,-1,0));pole=(pole-d*pole.dot(d)).normalized();knee=hip+d*along+pole*height
    set_world_bone('thigh'+s,hip,knee);set_world_bone('shin'+s,knee,target);set_world_bone('foot'+s,target)
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','head_tilt','reach','walk_in_place']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0)
        a=math.sin(math.pi*f/120)**2
        def rotate(n,axis,deg):arm.pose.bones[n].rotation_quaternion=Quaternion(Vector(axis),math.radians(deg))
        if name=='idle':rotate('chest',(1,0,0),.8*math.sin(math.tau*f/120))
        elif name=='head_tilt':rotate('head',(0,1,0),22*a);rotate('neck',(0,0,1),-8*a)
        elif name=='reach':
            bpy.context.view_layer.update()
            for s in ['L','R']:reach_arm(s,a)
        else:
            bpy.context.view_layer.update();walk_leg('R',math.tau*f/120);walk_leg('L',math.tau*f/120+math.pi)
            for s,sign in [('L',1),('R',-1)]:rotate('upperArm'+s,(1,0,0),sign*7*math.cos(math.tau*f/120))
        for p in arm.pose.bones:p.keyframe_insert('rotation_quaternion',frame=f);p.keyframe_insert('location',frame=f)
    tr=arm.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,act);tr.mute=True
arm.animation_data.action=None;studio.neutral()
for ma in list(bpy.data.materials):
    obs=[o for o in sc.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==ma and not o.data.shape_keys]
    if len(obs)>1:
        activate(obs[0])
        for o in obs:o.select_set(True)
        bpy.ops.object.join();bpy.context.object.name=ma.name
models=[o for o in sc.objects if o.type in ['MESH','ARMATURE']];activate(arm)
for o in models:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'mohosha.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True,export_morph=True,export_morph_normal=False)
stats={'bones':len(ad.bones),'vertices':sum(len(o.data.vertices) for o in models if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'mohosha.glb')),'height_m':max(v.co.z for o in models if o.type=='MESH' for v in o.data.vertices)-min(v.co.z for o in models if o.type=='MESH' for v in o.data.vertices),'cast_engine_tested':False,'human_disguise_included':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup(1000,28)
for k in ['front','side','back','three_quarter','face','hand','torso']:studio.render(os.path.join(OUT,k+'.png'),k)
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'mohosha.blend'))
print('DONE',stats,flush=True)
