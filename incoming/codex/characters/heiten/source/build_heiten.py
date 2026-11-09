"""Heiten / closing-time character. Blender 5.2, metres, front=-Y."""
import bpy,math,os,sys,json
from mathutils import Vector,Matrix
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
SK={};MASK=[]
SHIRT=mat('Faded charcoal work shirt',(.205,.218,.235),tex=True,contrast=.13)
PANTS=mat('Dark work trousers',(.17,.172,.175),tex=True,contrast=.15)
APRON=mat('Weathered greige canvas',(.43,.415,.385),tex=True,contrast=.21)
FOLD=mat('Pleated grey collar',(.385,.377,.355),tex=True,contrast=.12)
SKIN=mat('Ash grey hands',(.47,.46,.435),.82,True,.09)
METAL=mat('Worn galvanized shutter',(.44,.437,.418),.66,True,.19)
METAL.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.48
MASKMAT=mat('Pale face shutter',(.53,.52,.49),.75,True,.06)
RUST=mat('Dark oxidized fasteners',(.12,.105,.085),.81)
EDGE=mat('Shutter rolled edges',(.235,.23,.215),.65)
DARK=mat('Unlit eye and mouth gaps',(.007,.007,.006),.95)
STITCH=mat('Canvas seams',(.15,.14,.12),.9)
NAIL=mat('Muted grey nails',(.17,.16,.14),.75)
SHOE=mat('Worn black work shoes',(.18,.18,.175),.78,True,.12)
SOLE=mat('Rubber outsole',(.065,.063,.058),.9)
CASING=mat('Old counter terminal casing',(.105,.11,.115),.65)
SCREEN=mat('Blank grey display',(.36,.365,.35),.6)
BUTTON=mat('Worn square keys',(.30,.30,.28),.72)
PENCIL=mat('Ochre pencil paint',(.42,.245,.065),.8)
WOOD=mat('Pencil wood',(.40,.29,.16),.9)

def bone(n,a,b,parent=None):SK[n]={'head':a,'tail':b,'parent':parent}
def cube(n,c,size,ma,bones,bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=n;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma);o['bones']=','.join(bones);ASSETS.append(o)
    if bevel:
        m=o.modifiers.new('Soft manufactured edges','BEVEL');m.width=bevel;m.segments=3;activate(o);bpy.ops.object.modifier_apply(modifier=m.name)
    return o
def ribbon(n,path,width,ma,bones):
    pts=cat(path,80);vs=[];uv=[];fs=[]
    for i,p in enumerate(pts):
        for j in (0,1):vs.append(p+Vector(((j-.5)*width,0,0)));uv.append((j,i/79))
    for i in range(79):fs.append((2*i,2*i+1,2*i+3,2*i+2))
    o=mesh(n,vs,fs,ma,bones,uv);solid(o,.003);return o

bone('root',(0,0,0),(0,0,.18))
bone('pelvis',(0,.025,1.02),(0,.025,1.20),'root')
bone('spine',(0,.025,1.20),(0,.065,1.59),'pelvis')
bone('chest',(0,.065,1.59),(0,.075,1.96),'spine')
bone('neck',(0,.075,1.96),(0,-.15,1.91),'chest')
bone('head',(0,-.15,1.91),(0,-.22,2.01),'neck')
torso=tube('Loose work shirt torso',[(0,.018,1.04),(0,.026,1.28),(0,.06,1.62),(0,.08,1.90),(0,.04,1.985)],[(0,.245),(.25,.23),(.62,.28),(.86,.30),(1,.12)],SHIRT,['pelvis','spine','chest'],n=85,sides=72,flat=.66,fold=.009)
# Button placket and small chest pockets, partially covered by the apron.
line('Shirt placket',[(0,-.151,1.25),(0,-.137,1.45),(0,-.139,1.63),(0,-.135,1.72)],.004,SHIRT,['spine','chest'])
for z in [1.53,1.60,1.67]:ell('Shirt button',(0,-.149,z),(.006,.003,.006),RUST,['chest'])
for sd in (-1,1):
    ribbon('Chest patch pocket',[(sd*.18,-.099,1.52),(sd*.18,-.110,1.64)],.072,SHIRT,['chest'])
    line('Chest pocket lip',[(sd*.14,-.115,1.64),(sd*.21,-.087,1.64)],.0018,STITCH,['chest'])

# Radially pleated fabric opening surrounding the shutter face.
vs=[];fs=[];uv=[];nr=14;ns=240
for i in range(nr+1):
    r=i/nr
    for j in range(ns):
        a=math.tau*j/ns;rx=.102+(.225-.102)*r;rz=.139+(.252-.139)*r
        uneven=1+r*(.035*math.sin(3*a)+.018*math.sin(11*a))
        pleat=math.cos(20*a)*(.004+.021*r)
        vs.append((rx*math.sin(a)*uneven,-.210+.075*r+.028*r*math.cos(a)+pleat,1.868+rz*math.cos(a)*uneven))
        uv.append((j/ns,r))
for i in range(nr):
    for j in range(ns):a=i*ns+j;b=i*ns+(j+1)%ns;fs.append((a,a+ns,b+ns,b))
ruff=mesh('Twenty-fold fabric ruff',vs,fs,FOLD,['head'],uv);solid(ruff,.0035)
# The pleated front joins a cloth cowl; the side view is a volume, not a disc.
vs=[];fs=[];uv=[]
for i in range(17):
    t=i/16;s=t*t*(3-2*t)
    for j in range(ns):
        a=math.tau*j/ns;uneven=1+.035*math.sin(3*a)+.018*math.sin(11*a)
        front=Vector((.225*math.sin(a)*uneven,-.135+.028*math.cos(a)+.025*math.cos(20*a),1.868+.252*math.cos(a)*uneven))
        rear=Vector((.19*math.sin(a),.035+.03*math.cos(a),1.89+.17*math.cos(a)))
        p=front*(1-s)+rear*s;p.y+=.005*math.sin(20*a)*math.sin(math.pi*t)
        vs.append(p);uv.append((j/ns,t))
for i in range(16):
    for j in range(ns):a=i*ns+j;b=i*ns+(j+1)%ns;fs.append((a,b,b+ns,a+ns))
o=mesh('Fabric cowl joining collar to shoulders',vs,fs,FOLD,['head','chest'],uv);solid(o,.003)

# Overlapping horizontal mask pieces over a dark inner volume.
ell('Dark interior behind face',(0,-.180,1.864),(.077,.053,.123),DARK,['head'])
def face_width(z):return prof(z,[(1.732,.027),(1.775,.058),(1.825,.079),(1.88,.096),(1.94,.096),(1.99,.081)])
bands=[(1.734,1.773),(1.781,1.817),(1.820,1.858),(1.871,1.910),(1.913,1.952),(1.955,1.99)]
for idx,(lo,hi) in enumerate(bands):
    vs=[];fs=[];uv=[];n=48;rows=9
    for k in range(rows+1):
        t=k/rows;z=lo+(hi-lo)*t
        for j in range(n+1):
            a=-math.pi/2+math.pi*j/n;w=face_width(z)
            y=-.195-(.067+.006*math.sin(t*math.pi))*math.cos(a)
            vs.append((w*math.sin(a),y,z));uv.append((j/n,t))
    for k in range(rows):
        for j in range(n):a=k*(n+1)+j;fs.append((a,a+1,a+n+2,a+n+1))
    o=mesh('Face shutter band %02d'%idx,vs,fs,MASKMAT,['head'],uv);solid(o,.003);MASK.append(o)
    line('Mask edge '+str(idx),[(face_width(lo)*math.sin(a),-.195-.067*math.cos(a)-.001,lo) for a in [-math.pi/2+math.pi*j/40 for j in range(41)]],.0011,MASKMAT,['head'])

# Back shell: ten individual metal slats following the hunched back.
def shell(t,u):
    y=prof(t,[(0,-.10),(.16,.015),(.32,.205),(.48,.285),(1,.255)])
    z=prof(t,[(0,2.015),(.16,2.10),(.32,2.07),(.50,1.94),(1,1.50)])
    w=prof(t,[(0,.325),(.2,.345),(.5,.335),(1,.265)])
    y+=.050*min(1,t/.25)
    return Vector((w*u,y-.07*abs(u)**1.55,z+.028-.070*abs(u)**1.5))
for row in range(10):
    t0=row/10;t1=(row+1)/10+.008
    vs=[];uv=[];fs=[];nc=30;nr=5
    for i in range(nr+1):
        t=t0+(t1-t0)*i/nr
        for j in range(nc+1):
            p=shell(t,-1+2*j/nc);p.y+=.003*math.sin(math.pi*i/nr)
            vs.append(p);uv.append((j/nc,i/nr))
    for i in range(nr):
        for j in range(nc):a=i*(nc+1)+j;fs.append((a,a+1,a+nc+2,a+nc+1))
    o=mesh('Back shutter slat %02d'%row,vs,fs,METAL,['chest'],uv);solid(o,.006)
    for t in (t0,t1):line('Rolled slat horizontal edge',[shell(t,-1+2*j/40)+Vector((0,.004,0)) for j in range(41)],.0028,EDGE,['chest'])
    for sd in (-1,1):
        line('Slat side flange',[shell(t,sd)+Vector((0,.003,0)) for t in (t0,(t0+t1)/2,t1)],.0028,EDGE,['chest'])
        for t in (t0+.020,t1-.020):
            p=shell(t,sd*.93)+Vector((0,.006,0));ell('Small steel rivet',p,(.0037,.0037,.0037),EDGE,['chest'])
            # Subtle oxide trace alongside some fasteners.
            if row%2==0:ell('Rivet oxidation',p+Vector((.004,.0005,-.003)),(.003,.001,.004),RUST,['chest'])

# Four shorter slats wrap around the front of each shoulder.
for sd in (-1,1):
    for row in range(4):
        vs=[];fs=[];uv=[]
        for i in range(3):
            for j in range(17):
                u=j/16;x=.19+.165*u;y=-.095-.017*row+.018*u*u
                z=2.023-.057*row-.07*u-.057*i/2
                vs.append((sd*x,y,z));uv.append((u,i/2))
        for i in range(2):
            for j in range(16):a=i*17+j;fs.append((a,a+1,a+18,a+17))
        o=mesh('Front shoulder shutter',vs,fs,METAL,['chest'],uv);solid(o,.005)
        for i in (0,2):line('Shoulder slat rim',[Vector(vs[i*17+j])+Vector((0,-.003,0)) for j in range(17)],.0025,EDGE,['chest'])
        for j in (2,14):ell('Shoulder rivet',Vector(vs[17+j])+Vector((0,-.004,0)),(.0035,.0035,.0035),EDGE,['chest'])

for sd,s in [(1,'L'),(-1,'R')]:
    m=lambda x,y,z:(sd*x,y,z)
    bone('upperArm'+s,m(.276,.04,1.91),m(.34,.005,1.43),'chest')
    bone('foreArm'+s,m(.34,.005,1.43),m(.328,-.055,.925),'upperArm'+s)
    bone('hand'+s,m(.328,-.055,.925),m(.33,-.07,.75),'foreArm'+s)
    bone('thigh'+s,m(.12,.025,1.08),m(.125,.015,.55),'pelvis')
    bone('shin'+s,m(.125,.015,.55),m(.125,.015,.115),'thigh'+s)
    bone('foot'+s,m(.125,.015,.115),m(.125,-.15,.05),'shin'+s)
    sleeve=tube('Wrinkled rolled sleeve '+s,[m(.265,.055,1.95),m(.31,.025,1.79),m(.34,.010,1.59),m(.34,-.005,1.43)],[(0,.045),(.15,.107),(.48,.085),(.8,.091),(1,.064)],SHIRT,['upperArm'+s,'foreArm'+s],n=70,sides=48,fold=.011,cap=False);solid(sleeve,.004)
    cuff=tube('Folded shirt cuff '+s,[m(.34,-.005,1.42),m(.34,-.001,1.47)],[(0,.068),(.5,.075),(1,.071)],SHIRT,['upperArm'+s,'foreArm'+s],n=10,sides=48,fold=.002,cap=False);solid(cuff,.005)
    skin=[tube('Long lean forearm '+s,[m(.34,.0,1.46),m(.338,-.022,1.27),m(.328,-.049,1.02),m(.328,-.064,.85)],[(0,.044),(.34,.041),(.70,.029),(1,.022)],SKIN,['foreArm'+s],n=48)]
    skin.append(ell('Palm '+s,m(.328,-.064,.829),(.043,.027,.110),SKIN,['hand'+s]))
    digits=[]
    for k,(dx,endz) in enumerate([(-.029,.626),(-.009,.590),(.013,.600),(.033,.645)]):
        base=m(.328+dx,-.069,.777);mid=m(.328+dx+.005,-.090,(.777+endz)/2);end=m(.328+dx+.012,-.060,endz)
        bn='finger'+str(k+1)+s;bone(bn,base,end,'hand'+s);digits.append(bn)
        skin.append(tube('Long finger '+bn,[base,mid,end],[(0,.010),(.5,.009),(.94,.0075),(1,.003)],SKIN,[bn],n=25,sides=18))
        skin.append(ell('Finger knuckle '+bn,mid,(.010,.010,.013),SKIN,[bn]))
        ell('Grey nail '+bn,(end[0],end[1]-.015,end[2]+.016),(.0055,.0014,.010),NAIL,[bn])
    bn='thumb'+s;bone(bn,m(.295,-.065,.85),m(.266,-.10,.733),'hand'+s);digits.append(bn)
    skin.append(tube('Thumb '+s,[m(.298,-.062,.86),m(.27,-.071,.81),m(.263,-.085,.758),m(.273,-.1,.733)],[(0,.016),(.55,.013),(1,.008)],SKIN,[bn],n=25,sides=20))
    ell('Thumb nail '+s,m(.271,-.11,.748),(.007,.0014,.011),NAIL,[bn])
    union('Continuous arm and fingers '+s,skin,['foreArm'+s,'hand'+s]+digits)
    tube('Loose trousers '+s,[m(.12,.024,1.14),m(.125,.024,.84),m(.127,.02,.56),m(.125,.015,.28),m(.125,.005,.105)],[(0,.103),(.36,.092),(.68,.082),(.90,.085),(1,.068)],PANTS,['thigh'+s,'shin'+s],n=80,sides=48,fold=.008)
    ell('Work shoe outsole '+s,m(.125,-.062,.025),(.083,.150,.025),SOLE,['foot'+s])
    ell('Work shoe upper '+s,m(.125,-.054,.066),(.078,.140,.058),SHOE,['foot'+s])
    line('Shoe welt '+s,[m(.125+.079*math.cos(a),-.062+.144*math.sin(a),.036) for a in [math.tau*j/64 for j in range(65)]],.0024,EDGE,['foot'+s])

# Canvas apron with a curved skirt and narrower chest bib.
def apron_point(u,z):
    w=prof(z,[(.53,.242),(.95,.234),(1.25,.225),(1.34,.20),(1.52,.137)])
    rx=prof(z,[(.53,.265),(1.2,.25),(1.52,.28)])
    ry=prof(z,[(.53,.18),(1.25,.18),(1.52,.193)])
    cy=prof(z,[(.53,.02),(1.25,.026),(1.52,.052)])
    y=cy-ry*math.sqrt(max(.01,1-(u*w/rx)**2))+.002*math.sin(12*u+9*z)+.001*math.sin(38*z+u)
    return Vector((u*w,y,z+.004*math.sin(5*u)*(1.52-z)))
vs=[];uv=[];fs=[];nc=64;nr=70
for i in range(nr+1):
    z=.53+.99*i/nr
    for j in range(nc+1):vs.append(apron_point(-1+2*j/nc,z));uv.append((j/nc,i/nr))
for i in range(nr):
    for j in range(nc):a=i*(nc+1)+j;fs.append((a,a+1,a+nc+2,a+nc+1))
apron=mesh('Long canvas apron',vs,fs,APRON,['pelvis','spine','chest'],uv);solid(apron,.004)
for z in (.544,1.505):line('Apron hem',[apron_point(-1+2*j/60,z)+Vector((0,-.002,0)) for j in range(61)],.0012,STITCH,['pelvis','spine'])
for u in (-.98,.98):line('Apron edge seam',[apron_point(u,.54+i*.97/70)+Vector((0,-.002,0)) for i in range(71)],.0012,STITCH,['pelvis','spine','chest'])
for sd in (-1,1):
    ribbon('Apron shoulder strap',[(sd*.116,-.129,1.51),(sd*.155,-.120,1.70),(sd*.18,-.08,1.94),(sd*.185,.12,1.98),(sd*.16,.231,1.63),(sd*.17,.20,1.29)],.025,APRON,['spine','chest'])
    cube('Strap buckle',(sd*.116,-.135,1.525),(.031,.006,.034),EDGE,['spine','chest'])
    cube('Buckle inset',(sd*.116,-.140,1.525),(.018,.004,.022),APRON,['spine','chest'])
# Waist tie around the back; looped knot and two hanging tails.
pts=[(.237*math.sin(a),.025+.170*math.cos(a),1.285) for a in [-math.pi/2+math.pi*j/80 for j in range(81)]]
vs=[];fs=[]
for p in pts:vs.extend([(p[0],p[1],p[2]-.017),(p[0],p[1],p[2]+.017)])
for i in range(len(pts)-1):fs.append((2*i,2*i+1,2*i+3,2*i+2))
o=mesh('Waist apron tie',vs,fs,APRON,['spine','pelvis']);solid(o,.003)
ell('Rear apron knot',(0,.204,1.285),(.022,.014,.022),APRON,['spine'])
for sd in (-1,1):
    line('Looped apron bow',[(0,.207,1.29),(sd*.06,.232,1.30),(sd*.082,.230,1.265),(sd*.035,.224,1.25),(0,.209,1.28)],.009,APRON,['spine'])
    ribbon('Hanging apron tie',[(sd*.01,.210,1.27),(sd*.025,.204,1.15),(sd*.042,.196,.96)],.027,APRON,['spine','pelvis'])

# Front pocket, pencil and blank counter keypad.
vs=[];uv=[];fs=[]
for i in range(13):
    z=.96+.18*i/12
    for j in range(13):
        x=.078+.115*j/12;p=apron_point(x/prof(z,[(.53,.242),(.95,.234),(1.25,.225),(1.34,.20),(1.52,.137)]),z);p.y-=.008+.004*math.sin(math.pi*j/12)
        vs.append(p);uv.append((j/12,i/12))
for i in range(12):
    for j in range(12):a=i*13+j;fs.append((a,a+1,a+14,a+13))
o=mesh('Apron pencil pocket',vs,fs,APRON,['pelvis','spine'],uv);solid(o,.002)
def pocket_stitch(x,z):return apron_point(x/prof(z,[(.53,.242),(.95,.234),(1.25,.225),(1.34,.20),(1.52,.137)]),z)+Vector((0,-.013,0))
for xs in (.081,.191):line('Pocket vertical stitching',[pocket_stitch(xs,z) for z in (.967,1.04,1.133)],.001,STITCH,['spine','pelvis'])
line('Pocket bottom stitch',[pocket_stitch(x,.967) for x in (.083,.135,.189)],.001,STITCH,['pelvis'])
tube('Pencil',[(.163,-.121,1.08),(.178,-.121,1.21)],[(0,.004),(1,.004)],PENCIL,['spine'],n=8,sides=6)
tube('Pencil wood tip',[(.178,-.121,1.21),(.179,-.121,1.225)],[(0,.004),(1,.0007)],WOOD,['spine'],n=5,sides=6)
ell('Graphite point',(.179,-.121,1.225),(.001,.001,.002),DARK,['spine'])
cube('Counter terminal',(0,-.174,1.284),(.258,.040,.095),CASING,['spine'],.007)
cube('Display border',(-.044,-.197,1.284),(.137,.008,.070),EDGE,['spine'],.003)
cube('Blank terminal display',(-.044,-.203,1.284),(.113,.004,.050),SCREEN,['spine'],.002)
for row in range(3):
    for col in range(3):cube('Keypad button',(.043+col*.027,-.201,1.257+row*.027),(.021,.009,.021),BUTTON,['spine'],.003)

# Skeleton and skin binding.
ad=bpy.data.armatures.new('Heiten skeleton');arm=bpy.data.objects.new('Heiten rig',ad);bpy.context.collection.objects.link(arm)
activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for name,d in SK.items():b=ad.edit_bones.new(name);b.head=d['head'];b.tail=d['tail']
for name,d in SK.items():
    if d['parent']:ad.edit_bones[name].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    a,b=Vector(a),Vector(b);ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    bones=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in bones};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=world@v.co;v.co=p
        near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in bones)[:3]
        vals=[math.exp(-(d-near[0][0])*40) for d,n in near];total=sum(vals)
        for (d,n),w in zip(near,vals):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mo=o.modifiers.new('Skin rig','ARMATURE');mo.object=arm;o.data.validate();o.data.update()
# Only the eye-opening slat extends down for the mechanical closed-eye shape.
o=MASK[3];o.shape_key_add(name='Basis');key=o.shape_key_add(name='shutter_closed')
for v in key.data:
    w=max(0,min(1,(1.891-v.co.z)/.020));v.co.z-=.014*w

sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','closing_gesture']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
        if name=='idle':
            arm.pose.bones['chest'].rotation_euler.x=math.radians(.5)*math.sin(math.tau*f/120)
        else:
            lift=max(0,math.sin(math.pi*f/60)) if f<=60 else 0
            bow=max(0,math.sin(math.pi*(f-60)/60)) if f>=60 else 0
            for s in ['L','R']:
                arm.pose.bones['upperArm'+s].rotation_euler.x=math.radians(-145)*lift
                arm.pose.bones['upperArm'+s].rotation_euler.z=math.radians(18 if s=='L' else -18)*lift
                arm.pose.bones['foreArm'+s].rotation_euler.x=math.radians(-15)*lift
                arm.pose.bones['hand'+s].rotation_euler.x=math.radians(12)*lift
            arm.pose.bones['spine'].rotation_euler.x=math.radians(14)*bow
            arm.pose.bones['chest'].rotation_euler.x=math.radians(10)*bow
            arm.pose.bones['head'].rotation_euler.x=math.radians(6)*bow
        for p in arm.pose.bones:p.keyframe_insert('rotation_euler',frame=f);p.keyframe_insert('location',frame=f)
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
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'heiten.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True,export_morph=True,export_morph_normal=False)
stats={'bones':len(ad.bones),'vertices':sum(len(o.data.vertices) for o in models if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'heiten.glb')),'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup(1000,32)
for k in ['front','side','back','three_quarter','face','back_detail']:studio.render(os.path.join(OUT,k+'.png'),k)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'heiten.blend'))
print('DONE',stats,flush=True)
