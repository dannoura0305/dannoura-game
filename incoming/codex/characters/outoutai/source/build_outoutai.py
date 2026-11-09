"""Outoutai: porcelain response entity, glass petals, wired limbs, segmented halo."""
import bpy,sys,os,math,json
from mathutils import Vector,Matrix,Quaternion
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
SK={}
WHITE=mat('Warm white porcelain shell',(.76,.77,.755),.42)
INSET=mat('Recessed porcelain',(.62,.65,.64),.48)
JOINT=mat('Pearl joint surface',(.68,.70,.69),.45)
DARK=mat('Black recessed sensors',(.006,.009,.011),.29)
CABLE=mat('Graphite cable insulation',(.023,.027,.029),.48)
METAL=mat('Brushed silver fittings',(.43,.48,.49),.30);METAL.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.75
GLASS=mat('Pale blue translucent covers',(.43,.62,.68),.18)
p=GLASS.node_tree.nodes['Principled BSDF'];p.inputs['Alpha'].default_value=.22;p.inputs['Transmission Weight'].default_value=.55;p.inputs['IOR'].default_value=1.45;GLASS.diffuse_color=(.43,.62,.68,.22)
if hasattr(GLASS,'surface_render_method'):GLASS.surface_render_method='DITHERED'
RIM=mat('Fine glass edges',(.40,.60,.67),.26);RIM.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.35
LIGHT=mat('Cyan response light',(.36,.83,.95),.22)
p=LIGHT.node_tree.nodes['Principled BSDF'];p.inputs['Emission Color'].default_value=(.12,.75,1,1);p.inputs['Emission Strength'].default_value=2.0

def bone(n,h,t,parent=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':parent}
def prof(t,pairs):
    if t<=pairs[0][0]:return pairs[0][1]
    if t>=pairs[-1][0]:return pairs[-1][1]
    for i in range(len(pairs)-1):
        a,x=pairs[i];b,y=pairs[i+1]
        if t<=b:
            m0=(pairs[i+1][1]-pairs[max(0,i-1)][1])/(pairs[i+1][0]-pairs[max(0,i-1)][0])
            m1=(pairs[min(len(pairs)-1,i+2)][1]-pairs[i][1])/(pairs[min(len(pairs)-1,i+2)][0]-pairs[i][0])
            u=(t-a)/(b-a);v=(2*u**3-3*u*u+1)*x+(u**3-2*u*u+u)*(b-a)*m0+(-2*u**3+3*u*u)*y+(u**3-u*u)*(b-a)*m1
            return max(min(x,y),min(max(x,y),v))
import geometry
geometry.prof=prof
def panel(name,vs,fs,ma,bones,uv=None,thickness=.002):
    o=mesh(name,vs,fs,ma,bones,uv);solid(o,thickness);return o
def cube(name,c,scale,ma,bones,bevel=.003):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
    activate(o);m=o.modifiers.new('Rounded fitting','BEVEL');m.width=bevel;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name)
    o['bones']=','.join(bones);ASSETS.append(o);return o
bone('root',(0,0,0),(0,0,.2));bone('pelvis',(0,0,1.20),(0,0,1.42),'root')
bone('spine',(0,0,1.42),(0,.015,1.75),'pelvis');bone('chest',(0,.015,1.75),(0,.025,2.04),'spine')
bone('neck',(0,.025,2.04),(0,.01,2.30),'chest');bone('head',(0,.01,2.30),(0,-.075,2.50),'neck')
bone('halo',(0,-.06,2.62),(0,-.06,2.68),'head')
for s,sign in [('L',1),('R',-1)]:
    bone('upperArm'+s,(sign*.185,.012,1.98),(sign*.30,-.012,1.56),'chest')
    bone('foreArm'+s,(sign*.30,-.012,1.56),(sign*.405,-.012,1.08),'upperArm'+s)
    bone('hand'+s,(sign*.405,-.012,1.08),(sign*.417,-.025,.968),'foreArm'+s)
    bone('thigh'+s,(sign*.082,.012,1.28),(sign*.090,-.022,.69),'pelvis')
    bone('shin'+s,(sign*.090,-.022,.69),(sign*.09,.010,.105),'thigh'+s)
    bone('foot'+s,(sign*.09,.010,.105),(sign*.09,-.14,.040),'shin'+s)

# Chest-to-waist silhouette with bilateral sculpted arches.
vs=[];fs=[];uv=[];rows=95;cols=96
for i in range(rows):
    t=i/(rows-1);z=1.22+.87*t
    rx=prof(t,[(0,.12),(.15,.137),(.35,.075),(.52,.064),(.70,.118),(.87,.205),(.94,.19),(1,.052)])
    ry=prof(t,[(0,.080),(.18,.089),(.39,.055),(.60,.055),(.83,.089),(.94,.076),(1,.050)])
    cy=.018+.025*math.exp(-((t-.84)/.21)**2)
    for j in range(cols):
        a=math.tau*j/cols;x=rx*math.sin(a);y=cy-ry*math.cos(a)
        if math.cos(a)>0:
            archz=1.72+.22*(abs(x)/.18)**.65
            y+=.021*math.exp(-((z-archz)/.028)**2)*min(1,abs(x)/.035)*math.cos(a)**2
            y-=.009*math.exp(-(x/.026)**2)*math.exp(-((z-1.84)/.22)**2)
        vs.append((x,y,z));uv.append((j/cols,t))
for i in range(rows-1):
    for j in range(cols):a=i*cols+j;b=i*cols+(j+1)%cols;fs.append((a,b,b+cols,a+cols))
fs.extend([tuple(reversed(range(cols))),tuple((rows-1)*cols+j for j in range(cols))])
body=mesh('Sculpted torso',vs,fs,WHITE,['pelvis','spine','chest'],uv)
neck=tube('Swept neck',[(0,.025,2.02),(0,.030,2.16),(0,.005,2.30),(0,-.075,2.44)],[(0,.055),(.30,.044),(.65,.047),(1,.043)],WHITE,['chest','neck','head'],n=70,sides=48)
# Tapered, petal-like head with a pointed lower face.
vs=[];fs=[];uv=[];rows=80;cols=80
for i in range(rows):
    t=i/(rows-1);z=2.225+.31*t
    rx=prof(t,[(0,.005),(.18,.026),(.43,.060),(.67,.082),(.84,.074),(.96,.038),(1,.004)])
    ry=prof(t,[(0,.008),(.2,.030),(.5,.063),(.75,.072),(.94,.040),(1,.004)])
    cy=-.190+.115*math.sin(t*math.pi/2)
    for j in range(cols):
        a=math.tau*j/cols;ridge=.007*math.cos(5*a)*math.sin(math.pi*t)**.6
        vs.append(((rx+ridge)*math.sin(a),cy-(ry+ridge)*math.cos(a),z));uv.append((j/cols,t))
for i in range(rows-1):
    for j in range(cols):a=i*cols+j;b=i*cols+(j+1)%cols;fs.append((a,b,b+cols,a+cols))
fs.extend([tuple(reversed(range(cols))),tuple((rows-1)*cols+j for j in range(cols))])
head=mesh('Pointed fluted head',vs,fs,WHITE,['head'],uv)
body=union('Continuous torso neck and head',[body,neck,head],['pelvis','spine','chest','neck','head'])
def front(x,z):
    hit,p,_,_=body.ray_cast(Vector((x,-2,z)),Vector((0,1,0)));return p if hit else Vector((x,-.19,z))
for sign in [-1,1]:
    x=sign*.029;z=2.337;p=front(x,z)
    cutter=ell('Sensor opening tool',(x,p.y+.002,z),(.0065,.020,.012),DARK,['head'])
    activate(body);m=body.modifiers.new('Recessed eye opening','BOOLEAN');m.operation='DIFFERENCE';m.object=cutter;bpy.ops.object.modifier_apply(modifier=m.name);ASSETS.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
    ell('Dark inset sensor',(x,p.y+.014,z),(.0055,.002,.010),DARK,['head'])

# Pelvis shell is a rounded shield, with a fine seam at its upper edge.
vs=[];fs=[];uv=[];rows=30;cols=40
for i in range(rows):
    t=i/(rows-1);w=.115*(1-t)+.020*t;z=1.38-.23*t
    for j in range(cols):
        u=j/(cols-1)*2-1;x=w*u;y=-.082-.025*math.sqrt(max(0,1-u*u))+.015*t
        vs.append((x,y,z+.025*u*u));uv.append((j/(cols-1),t))
for i in range(rows-1):
    for j in range(cols-1):a=i*cols+j;fs.append((a,a+1,a+1+cols,a+cols))
panel('Pelvis front shield',vs,fs,WHITE,['pelvis'],uv,.005)
line('Pelvis inset seam',vs[:cols],.0013,JOINT,['pelvis'])

# White limbs and elongated five-finger hands.
ARM_PARTS=[]
for s,sign in [('L',1),('R',-1)]:
    shoulder=SK['upperArm'+s]['head'];elbow=SK['foreArm'+s]['head'];wrist=SK['hand'+s]['head'];tail=SK['hand'+s]['tail']
    upper=tube('Slender upper arm '+s,[shoulder+Vector((-sign*.04,0,.01)),shoulder.lerp(elbow,.45),elbow],[(0,.055),(.25,.057),(.6,.046),(1,.032)],WHITE,['upperArm'+s,'foreArm'+s],n=50,sides=40)
    fore=tube('Tapered forearm '+s,[elbow,elbow.lerp(wrist,.44),wrist,tail],[(0,.032),(.3,.043),(.7,.027),(1,.027)],WHITE,['foreArm'+s,'hand'+s],n=60,sides=40)
    bridge=ell('Elbow connection',elbow,(.033,.033,.046),WHITE,['upperArm'+s,'foreArm'+s])
    palm=ell('Palm '+s,wrist.lerp(tail,.70)+Vector((0,0,-.015)),(.045,.022,.075),WHITE,['hand'+s]);round_shoulder=ell('Rounded shoulder',shoulder,(.063,.062,.067),WHITE,['chest','upperArm'+s]);parts=[upper,fore,bridge,palm,round_shoulder]
    for k,(dx,length) in enumerate([(-.039,.111),(-.013,.140),(.013,.133),(.039,.107)]):
        p=tail+Vector((sign*dx,0,-.003));p1=p+Vector((sign*.008,-.012,-length*.48));p2=p+Vector((sign*.016,-.040,-length));end=p2+Vector((-sign*.003,-.012,.002))
        bn='finger'+str(k+1)+s;bone(bn,p,p2,'hand'+s)
        parts.append(tube('Long finger '+s+str(k),[p,p1,p2,end],[(0,.0073),(.45,.0075),(1,.0044)],WHITE,[bn],n=25,sides=16))
    start=wrist+Vector((-sign*.025,-.003,-.035));p1=start+Vector((-sign*.032,-.012,-.032));p2=p1+Vector((sign*.003,-.025,-.050))
    bone('thumb'+s,start,p2,'hand'+s);parts.append(tube('Thumb '+s,[start,p1,p2],[(0,.013),(.55,.011),(1,.006)],WHITE,['thumb'+s],n=25,sides=20))
    ARM_PARTS.append(union('Continuous arm and hand '+s,parts,['upperArm'+s,'foreArm'+s,'hand'+s]+['finger'+str(k+1)+s for k in range(4)]+['thumb'+s]))
    hip=SK['thigh'+s]['head'];knee=SK['shin'+s]['head'];ankle=SK['foot'+s]['head'];x=ankle.x
    thigh=tube('Long thigh '+s,[hip,hip.lerp(knee,.4),knee+Vector((0,0,.014))],[(0,.069),(.35,.074),(.7,.050),(1,.038)],WHITE,['thigh'+s],n=65,sides=48)
    cap=ell('Rounded hip connection',hip,(.070,.069,.081),WHITE,['pelvis','thigh'+s]);union('Rounded thigh shell '+s,[thigh,cap],['pelvis','thigh'+s])
    ell('Visible white knee '+s,knee,(.036,.034,.036),JOINT,['thigh'+s,'shin'+s])
    tube('Sculpted shin '+s,[knee-Vector((0,0,.012)),(x,.014,.49),(x,.020,.28),ankle],[(0,.037),(.30,.052),(.7,.037),(1,.022)],WHITE,['shin'+s],n=65,sides=48)
    footparts=[ell('Bare foot '+s,(x,-.055,.036),(.049,.099,.035),WHITE,['foot'+s]),tube('Ankle '+s,[(x,.010,.126),(x,-.012,.056)],[(0,.023),(1,.039)],WHITE,['shin'+s,'foot'+s],n=25,sides=32)]
    for k in range(5):
        xx=x+sign*(-.034+k*.017);length=.053-.006*k
        footparts.append(tube('Toe '+s+str(k),[(xx,-.113,.027),(xx,-.132,.025),(xx,-.115-length,.019)],[(0,.011 if k==0 else .0085),(.5,.010 if k==0 else .008),(1,.005)],WHITE,['foot'+s],n=22,sides=16))
    union('Bare foot and toes '+s,footparts,['shin'+s,'foot'+s])

# Four pairs of thin translucent petals, standing clear of the skin.
upper_bones=['pelvis','spine','chest','neck','head']
for s in ['L','R']:upper_bones+=['upperArm'+s,'foreArm'+s,'hand'+s]+['finger'+str(k+1)+s for k in range(4)]+['thumb'+s]
body=union('Seamless torso shoulders arms and head',[body]+ARM_PARTS,upper_bones)
def petal(name,sign,back,kind):
    if kind=='shoulder':
        path=[(sign*.123,.02,2.155),(sign*.235,.02,2.08),(sign*.294,.018,1.94),(sign*.300,.015,1.805)];widths=[(0,.005),(.30,.110),(.65,.112),(1,.004)];bones=['chest','upperArm'+('L' if sign>0 else 'R')]
    else:
        path=[(sign*.115,.015,1.475),(sign*.194,.02,1.365),(sign*.216,.015,1.22),(sign*.173,.01,1.095)];widths=[(0,.004),(.3,.083),(.65,.084),(1,.004)];bones=['pelvis']
    centers=cat(path,55);vs=[];fs=[];uv=[];cols=22
    for i,c in enumerate(centers):
        t=i/54;w=prof(t,widths)
        for j in range(cols):
            q=j/(cols-1);p=c+Vector((sign*(-.060+.085*q+.025*math.sin(math.pi*q))*math.sin(math.pi*t),back*(.010+w*q),.014*math.sin(math.pi*q)*math.sin(math.pi*t)))
            vs.append(p);uv.append((q,t))
    for i in range(54):
        for j in range(cols-1):a=i*cols+j;fs.append((a,a+1,a+1+cols,a+cols))
    panel(name,vs,fs,GLASS,bones,uv,.0016)
    for index in [0,cols-1]:line(name+' rim',[vs[i*cols+index] for i in range(55)],.0018,RIM,bones)
for sign in [-1,1]:
    for back in [-1,1]:
        petal('Shoulder glass petal',sign,back,'shoulder');petal('Hip glass petal',sign,back,'hip')

# Routed paired cable on the character's left side, with silver clamps.
cablepath=[(0,.078,2.20),(.075,.115,2.15),(.151,.077,2.09),(.196,-.034,2.015),(.215,-.071,1.91),(.248,-.071,1.76),(.293,-.060,1.59),(.337,-.059,1.40),(.386,-.042,1.18)]
for dx in [-.007,.007]:tube('Paired left signal cable',[(x+dx,y,z) for x,y,z in cablepath],[(0,.0055),(1,.0055)],CABLE,['chest','neck','upperArmL','foreArmL'],n=140,sides=12)
for center,bn in [((.196,-.039,2.015),'upperArmL'),((.285,-.064,1.62),'upperArmL'),((.373,-.048,1.235),'foreArmL')]:
    o=cube('Cable retaining clip',center,(.038,.014,.024),METAL,[bn]);o.rotation_euler.y=-.22
backpath=[(0,.080,2.195),(.040,.105,2.09),(.065,.112,1.99),(.101,.120,1.87),(.16,.101,1.835)]
for dx in [-.007,.007]:tube('Paired back cable',[(x+dx,y,z) for x,y,z in backpath],[(0,.0055),(1,.0055)],CABLE,['neck','chest'],n=80,sides=12)
cube('Back cable clip',(.069,.118,1.978),(.037,.016,.025),METAL,['chest'])
short=[(-.338,-.052,1.435),(-.356,-.052,1.35),(-.385,-.040,1.20),(-.400,-.033,1.13)]
tube('Right forearm signal cable',short,[(0,.0045),(1,.0045)],CABLE,['foreArmR'],n=65,sides=12)
for p in [short[0],short[2]]:cube('Right cable clip',p,(.018,.012,.021),METAL,['foreArmR'],.002)

# Three interrupted ring arcs. Cyan strips are actual emissive geometry.
def arcband(name,start,end,radius,z,width,height,ma):
    vs=[];fs=[];N=85
    for i in range(N):
        t=start+(end-start)*i/(N-1)
        for rr,zz in [(radius-width/2,z-height/2),(radius+width/2,z-height/2),(radius+width/2,z+height/2),(radius-width/2,z+height/2)]:vs.append((rr*math.sin(t),-.06-rr*math.cos(t),zz))
    for i in range(N-1):
        for j in range(4):a=i*4+j;b=i*4+(j+1)%4;fs.append((a,b,b+4,a+4))
    fs.extend([(3,2,1,0),tuple((N-1)*4+j for j in range(4))]);o=mesh(name,vs,fs,ma,['halo']);return o
for k in range(3):
    start=math.tau*k/3+.075;end=math.tau*(k+1)/3-.075
    arcband('Silver interrupted halo',start,end,.174,2.62,.010,.009,METAL)
    arcband('Cyan halo response segment',start+.025,end-.025,.180,2.621,.0025,.0055,LIGHT)

# Skin weights. Accessories are weighted only to their local chain.
def proportion(p):
    p=Vector(p)
    if p.z<2.09:p.z+=.08*math.sin(math.pi*max(0,p.z)/2.09)
    else:p.z-=.07*min(1,(p.z-2.09)/.46)
    return p
for d in SK.values():
    for key in ['head','tail']:d[key]=proportion(d[key])
ad=bpy.data.armatures.new('Outoutai skeleton');arm=bpy.data.objects.new('Outoutai rig',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=proportion(world@v.co);v.co=p;near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:3];weights=[math.exp(-(d-near[0][0])*55) for d,n in near];total=sum(weights)
        for (d,n),w in zip(near,weights):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;m=o.modifiers.new('Character skin','ARMATURE');m.object=arm;o.data.validate();o.data.update()

def set_world_bone(name,h,t):
    rest=ad.bones[name];m=rest.matrix_local.copy();m.translation=Vector((0,0,0));m=(rest.tail_local-rest.head_local).rotation_difference(Vector(t)-Vector(h)).to_matrix().to_4x4()@m;m.translation=Vector(h);arm.pose.bones[name].matrix=m;bpy.context.view_layer.update()
def reach_right(a):
    shoulder=SK['upperArmR']['head'];elbow0=SK['foreArmR']['head'];wrist0=SK['handR']['head'];target=wrist0.lerp(Vector((-.23,-.54,1.43)),a)
    l1=(elbow0-shoulder).length;l2=(wrist0-elbow0).length;d=target-shoulder;length=min(d.length,(l1+l2)*.999);d.normalize();target=shoulder+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along));pole=(elbow0-shoulder).lerp(Vector((-.25,0,-.40)),a);pole=(pole-d*pole.dot(d)).normalized();elbow=shoulder+d*along+pole*height
    set_world_bone('upperArmR',shoulder,elbow);set_world_bone('foreArmR',elbow,target)
    direction=(SK['handR']['tail']-wrist0).lerp(Vector((0,-.11,-.015)),a);set_world_bone('handR',target,target+direction)
def nod(a,degrees):
    rest=ad.bones['head'];q=Quaternion(Vector((1,0,0)),math.radians(degrees*a));direction=q@(rest.tail_local-rest.head_local);set_world_bone('head',rest.head_local,rest.head_local+direction)
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','standby','respond','acknowledge']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        bpy.context.view_layer.update();a=math.sin(math.pi*f/120)**2
        if name=='idle':arm.pose.bones['chest'].rotation_quaternion=Quaternion(Vector((1,0,0)),math.radians(.45*math.sin(math.tau*f/120)))
        elif name=='standby':nod(a,14)
        elif name=='respond':reach_right(a);nod(a,13)
        else:nod(a,9);arm.pose.bones['halo'].scale=(1+.025*a,1+.025*a,1)
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
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'outoutai.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
stats={'bones':len(ad.bones),'vertices':sum(len(o.data.vertices) for o in models if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'outoutai.glb')),'height_m':max(v.co.z for o in models if o.type=='MESH' for v in o.data.vertices)-min(v.co.z for o in models if o.type=='MESH' for v in o.data.vertices),'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup(1000,32)
for k in ['front','side','back','three_quarter','face','detail','hand']:studio.render(os.path.join(OUT,k+'.png'),k)
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'outoutai.blend'));print('DONE',stats,flush=True)
