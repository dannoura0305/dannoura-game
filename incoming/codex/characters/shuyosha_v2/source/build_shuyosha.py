"""Broad-shouldered Shuyosha, based on supplied 2026-11-08 reference."""
import bpy,os,sys,math,json
from mathutils import Vector,Matrix
from mathutils.noise import noise
from mathutils.bvhtree import BVHTree
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio,garment_weights
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
SK={};EYES=[]
SKIN=mat('Pallid weathered skin',(.48,.465,.45),.86,True,.075)
CLOTH=mat('Worn grey gown',(.325,.33,.335),.94,True,.11)
PANTS=mat('Charcoal trousers',(.18,.182,.18),.96,True,.15)
DOOR=mat('Grey inset door panels',(.365,.36,.35),.91,True,.16)
FRAME=mat('Skin coloured door frames',(.405,.395,.38),.88,True,.10)
CREASE=mat('Shallow grey creases',(.11,.103,.096),.95)
DARK=mat('Deep eye recess',(.012,.011,.010),.95)
SEAM=mat('Cloth seam thread',(.105,.104,.10),.9)
LABEL=mat('Blank cloth label',(.47,.45,.41),.95,True,.12)
NAIL=mat('Broad grey nails',(.15,.14,.127),.84)
SHOE=mat('Worn institutional shoes',(.275,.275,.265),.9,True,.13)
SOLE=mat('Dark rubber soles',(.09,.087,.08),.95)
surface_normal(SKIN,'skin',.38)
surface_normal(CLOTH,'cloth',.30)
surface_normal(PANTS,'cloth',.22)

def bone(n,a,b,parent=None):SK[n]={'head':a,'tail':b,'parent':parent}
def cube(n,c,size,ma,bones,bev=.002,rot=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=n;o.scale=size
    if rot:o.rotation_euler=rot.to_euler()
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if ma:o.data.materials.append(ma);o['bones']=','.join(bones);ASSETS.append(o)
    if bev:
        m=o.modifiers.new('Soft worn edges','BEVEL');m.width=bev;m.segments=3;activate(o);bpy.ops.object.modifier_apply(modifier=m.name)
    return o
def seam_z(th):return 1.645-.125*max(0,math.cos(th))**2+.014*math.sin(3*th)
bone('root',(0,0,0),(0,0,.16))
bone('pelvis',(0,.04,.83),(0,.04,1.04),'root')
bone('spine',(0,.04,1.04),(0,.07,1.44),'pelvis')
bone('chest',(0,.07,1.44),(0,.09,1.88),'spine')
bone('neck',(0,.09,1.88),(0,-.16,1.92),'chest')
bone('head',(0,-.16,1.92),(0,-.24,2.0),'neck')

# One fleshy dome and small embedded head, merged before recesses are cut.
vs=[];fs=[];uv=[];N=128;R=64
for i in range(R+1):
    t=.005+.995*i/R
    for j in range(N):
        a=math.tau*j/N;ph=t*math.acos((seam_z(a)-1.66)/.42)
        p=Vector((.47*math.sin(ph)*math.sin(a),.08-.30*math.sin(ph)*math.cos(a),1.66+.42*math.cos(ph)))
        # Pull the shoulder surface continuously into the forehead, without a separate lobe.
        p.y-=.09*math.exp(-(p.x/.16)**2-((p.z-1.95)/.085)**2)*max(0,math.cos(a))**4
        normal=Vector((p.x/.47**2,(p.y-.08)/.30**2,(p.z-1.66)/.42**2)).normalized()
        displacement=.005*noise(p*21)+.002*noise(p*68)+.003*math.sin(27*a+8*ph)*math.sin(ph)
        p+=normal*displacement;vs.append(p);uv.append((j/N,t))
for i in range(R):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
fs.append(tuple(reversed(range(N))));fs.append(tuple(R*N+j for j in range(N)))
dome=mesh('Broad shoulder skin',vs,fs,SKIN,['chest'],uv)
head=ell('Small sunk head',(0,-.190,1.863),(.103,.105,.117),SKIN,['head'])
for v in head.data.vertices:
    v.co.x*=.90+.07*(v.co.z/.117);v.co+=Vector((0,0,.006*math.sin(v.co.x*20)))
activate(dome);head.select_set(True)
for part in [dome,head]:ASSETS.remove(part)
bpy.ops.object.join();dome=bpy.context.object;dome.name='Continuous head and shoulder skin'
m=dome.modifiers.new('Skin union','REMESH');m.mode='VOXEL';m.voxel_size=.0045;bpy.ops.object.modifier_apply(modifier=m.name)
m=dome.modifiers.new('Organic skin smooth','SMOOTH');m.factor=.55;m.iterations=2;bpy.ops.object.modifier_apply(modifier=m.name)
# Sculpt folds directly into the surface, with a protected central face.
for v in dome.data.vertices:
    p=v.co;front=max(0,min(1,(-p.y+.03)/.17))
    r=math.sqrt((p.x/.145)**2+((p.z-1.85)/.135)**2)
    angle=math.atan2(p.x,p.z-1.85)
    mask=front*math.exp(-((r-1.43)/.58)**2)*max(0,min(1,(r-.96)*5))
    mask*=max(0,min(1,(p.z-1.84)/.055))
    fold=.0035*math.sin(23*r+2.6*math.sin(angle*3))+.0015*math.sin(39*r+angle*5)
    normal=Vector((p.x/.47**2,(p.y-.08)/.30**2,(p.z-1.66)/.42**2)).normalized()
    p+=normal*fold*mask
m=dome.modifiers.new('Skin surface reduction','DECIMATE');m.ratio=.65;bpy.ops.object.modifier_apply(modifier=m.name)
for p in dome.data.polygons:p.use_smooth=True
if not dome.data.uv_layers:dome.data.uv_layers.new(name='UVMap')
for loop in dome.data.loops:
    p=dome.data.vertices[loop.vertex_index].co;dome.data.uv_layers.active.data[loop.index].uv=(p.x*1.8,p.z*1.8+p.y*.7)
dome['bones']='chest,head';ASSETS.append(dome)
original_skin=BVHTree.FromPolygons([v.co for v in dome.data.vertices],[list(p.vertices) for p in dome.data.polygons])

def warp_door(o,p,n,back,subdivide=False):
    if subdivide:
        activate(o);mod=o.modifiers.new('Curved skin fit','SUBSURF');mod.subdivision_type='SIMPLE';mod.levels=2;bpy.ops.object.modifier_apply(modifier=mod.name)
    world=o.matrix_world.copy();inv=world.inverted();sign=1 if back else -1
    for v in o.data.vertices:
        q=world@v.co;depth=(q-p).dot(n)
        hit,normal,index,d=original_skin.ray_cast(Vector((q.x,sign*2,q.z)),Vector((0,-sign,0)))
        if hit is not None:q.y=hit.y+sign*depth/max(.35,abs(n.y));v.co=inv@q

def surface(x,z,back=False):
    hit,p,n,idx=dome.ray_cast(Vector((x,2 if back else -2,z)),Vector((0,-1 if back else 1,0)))
    if not hit:raise RuntimeError('Skin surface not found '+str((x,z,back)))
    return p,n
def cut(o):
    activate(dome);mod=dome.modifiers.new('Recess carved into skin','BOOLEAN');mod.operation='DIFFERENCE';mod.object=o
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(o,do_unlink=True)

# Two small recessed eyes and a short, slanted closed mouth.
for sd in (-1,1):
    x=sd*.044;z=1.873+sd*.008;p,n=surface(x,z)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=14,location=p+n*.001);o=bpy.context.object;o.scale=(.009,.009,.008)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);cut(o)
    eye=ell('Small recessed eye',p-n*.004,(.0057,.003,.0052),DARK,['head']);EYES.append(eye)
mouth=[]
for i in range(33):
    x=-.061+.122*i/32;z=1.816+.022*i/32;p,n=surface(x,z);mouth.append(p+n*.0006)
line('Closed mouth seam',mouth,.0016,CREASE,['head'])

# Front and rear miniature door recesses are aligned with the curved skin.
doors=[(-.30,1.72,.094,.20),(-.105,1.625,.102,.17),(.105,1.65,.100,.18),(.30,1.77,.092,.22)]
backdoors=[(-.34,1.72,.081,.18),(-.18,1.80,.091,.22),(0,1.84,.105,.24),(.18,1.79,.091,.22),(.34,1.72,.080,.18)]
for back,items in [(False,doors),(True,backdoors)]:
    for index,(x,z,w,h) in enumerate(items):
        p,n=surface(x,z,back);xx=Vector((0,0,1)).cross(n).normalized();zz=n.cross(xx).normalized()
        rot=Matrix((xx,-n,zz)).transposed()
        point=lambda a,b,c:p+xx*a+n*b+zz*c
        start=len(ASSETS)
        cutter=cube('Doorway cutter',point(0,-.012,0),(w*.82,.065,h*.91),None,[],.002,rot);cut(cutter)
        cube('Recessed door panel',point(0,-.019,0),(w*.78,.006,h*.87),DOOR,['chest'],.0018,rot)
        # Outer frame and inner reveal conceal the rough skin around the cut.
        for dx in (-w/2,w/2):cube('Door jamb',point(dx,.002,0),(.010,.016,h+.014),FRAME,['chest'],.003,rot)
        for dz in (-h/2,h/2):cube('Door lintel and sill',point(0,.002,dz),(w+.012,.016,.012),FRAME,['chest'],.003,rot)
        for dx in (-w*.40,w*.40):line('Recessed vertical panel seam',[point(dx,-.014,-h*.41),point(dx,-.014,h*.41)],.0009,CREASE,['chest'])
        for dz in (-h*.14,h*.28):
            line('Door inset panel detail',[point(-w*.28,-.014,dz),point(w*.28,-.014,dz)],.00065,CREASE,['chest'])
        line('Small door handle',[point(w*.25,-.010,-h*.10),point(w*.25,-.010,-h*.02)],.0015,FRAME,['chest'])
        for dz in (-h*.26,h*.26):cube('Door hinge',point(-w*.38,-.009,dz),(.005,.007,.014),FRAME,['chest'],.001,rot)
        for part in ASSETS[start:]:warp_door(part,p,n,back,part.name.startswith(('Door jamb','Door lintel','Recessed door panel')))

# Gown begins beneath the exposed shoulder skin; its upper edge follows the dome.
def gown_point(t,a):
    top=seam_z(a);ph=math.acos((top-1.66)/.42)
    rx=.400*(1-t)+(.47*math.sin(ph)+.006)*t;ry=.275*(1-t)+(.30*math.sin(ph)+.009)*t
    cy=.035+.045*t;z=.43+t*(top+.018-.43)
    # Long hanging folds, diagonal tension toward the chest, finer yoke gathers.
    taper=1-.88*t**8
    fold=(.022*math.sin(9*a+1.8*t)+.010*math.sin(17*a-4*t))*taper
    front=max(0,math.cos(a))**3
    fold+=front*.014*math.sin(18*t+7*math.sin(a)+2*math.sin(3*a))*math.sin(math.pi*t)**2
    fold+=.0055*math.sin(33*a+4*t)*t**5
    return Vector(((rx+fold)*math.sin(a),cy-(ry+fold)*math.cos(a),z+.005*math.sin(5*a)*(1-t)))
vs=[];fs=[];uv=[];N=112;R=70
for i in range(R+1):
    for j in range(N):vs.append(gown_point(i/R,math.tau*j/N));uv.append((j/N,i/R))
for i in range(R):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
gown=mesh('Heavy draped gown',vs,fs,CLOTH,['pelvis','spine','chest'],uv);solid(gown,.006)
for t in (.01,.027,.992):line('Gown hem and gathered yoke seam',[gown_point(t,math.tau*j/100)+Vector((0,0,.001)) for j in range(101)],.0015,SEAM,['pelvis','spine','chest'])
line('Back gown seam',[gown_point(i/60,math.pi)+Vector((0,.003,0)) for i in range(61)],.0014,SEAM,['pelvis','spine','chest'])

for sd,s in [(1,'L'),(-1,'R')]:
    m=lambda x,y,z:(sd*x,y,z)
    bone('upperArm'+s,m(.415,.075,1.73),m(.515,.015,1.27),'chest')
    bone('foreArm'+s,m(.515,.015,1.27),m(.515,-.035,.94),'upperArm'+s)
    bone('hand'+s,m(.515,-.035,.94),m(.515,-.060,.76),'foreArm'+s)
    bone('thigh'+s,m(.215,.04,.86),m(.235,.02,.47),'pelvis')
    bone('shin'+s,m(.235,.02,.47),m(.245,.01,.115),'thigh'+s)
    bone('foot'+s,m(.245,.01,.115),m(.245,-.15,.045),'shin'+s)
    sl=tube('Heavy wrinkled sleeve '+s,[m(.39,.075,1.76),m(.47,.045,1.58),m(.515,.015,1.29),m(.52,-.01,1.07)],[(0,.075),(.18,.146),(.56,.137),(.86,.124),(1,.115)],CLOTH,['upperArm'+s,'foreArm'+s],n=70,sides=56,fold=.012,cap=False);solid(sl,.005)
    cuff=tube('Soft rolled sleeve cuff '+s,[m(.52,-.01,1.045),m(.52,-.006,1.115)],[(0,.135),(.5,.140),(1,.138)],CLOTH,['foreArm'+s],n=16,sides=48,fold=.002,cap=False);solid(cuff,.006)
    parts=[tube('Thick forearm '+s,[m(.52,-.005,1.12),m(.52,-.017,1.00),m(.515,-.045,.87)],[(0,.090),(.5,.081),(1,.050)],SKIN,['foreArm'+s],n=38)]
    parts.append(ell('Broad palm '+s,m(.515,-.045,.826),(.100,.064,.117),SKIN,['hand'+s]))
    digits=[]
    for k,(dx,endz) in enumerate([(-.070,.638),(-.025,.602),(.025,.612),(.070,.650)]):
        base=m(.515+dx,-.055,.79);mid=m(.515+dx+.005,-.10,.705+(endz-.61)*.3);end=m(.515+dx+.006,-.032,endz)
        bn='finger'+str(k+1)+s;bone(bn,base,end,'hand'+s);digits.append(bn)
        parts.append(tube('Thick bent finger '+bn,[base,mid,end],[(0,.023),(.5,.020),(.90,.016),(1,.007)],SKIN,[bn],n=27,sides=20))
        parts.append(ell('Large knuckle '+bn,mid,(.023,.022,.025),SKIN,[bn]))
        ell('Finger nail '+bn,(end[0],end[1]-.046,end[2]+.020),(.010,.002,.014),NAIL,[bn])
        for dz in (-.005,.003):line('Knuckle crease '+bn,[(mid[0]-.012,mid[1]-.017,mid[2]+dz),(mid[0],mid[1]-.020,mid[2]+dz+.002),(mid[0]+.012,mid[1]-.017,mid[2]+dz)],.0008,CREASE,[bn])
    bn='thumb'+s;bone(bn,m(.45,-.045,.875),m(.425,-.095,.755),'hand'+s);digits.append(bn)
    parts.append(tube('Large thumb '+s,[m(.46,-.04,.89),m(.425,-.06,.84),m(.405,-.105,.794),m(.425,-.12,.755)],[(0,.031),(.45,.026),(.90,.021),(1,.012)],SKIN,[bn],n=30,sides=24))
    ell('Thumb nail '+s,m(.419,-.139,.776),(.012,.002,.017),NAIL,[bn])
    handmesh=union('Continuous thick arm and hand '+s,parts,['foreArm'+s,'hand'+s]+digits)
    # Fit each nail to the actual fused fingertip instead of an estimated plane.
    for nail in [o for o in ASSETS if o.name.startswith(('Finger nail','Thumb nail')) and o['bones'] in digits]:
        world=nail.matrix_world.copy();inv=world.inverted()
        for v in nail.data.vertices:
            q=world@v.co;hit,p,n,index=handmesh.ray_cast(Vector((q.x,-2,q.z)),Vector((0,1,0)))
            if hit:q.y=p.y-.0008+v.co.y;v.co=inv@q
    for z in (1.005,1.019):
        line('Wrist skin fold '+s,[m(.52+.075*math.cos(a),-.017+.074*math.sin(a),z+.003*math.cos(4*a)) for a in [math.tau*j/60 for j in range(61)]],.0015,SKIN,['foreArm'+s])
    tube('Short broad trousers '+s,[m(.215,.04,.92),m(.225,.035,.66),m(.235,.02,.45),m(.245,.01,.20),m(.245,.0,.095)],[(0,.145),(.4,.137),(.7,.12),(.9,.12),(1,.095)],PANTS,['thigh'+s,'shin'+s],n=65,sides=48,fold=.009)
    ell('Broad shoe sole '+s,m(.245,-.065,.024),(.117,.165,.024),SOLE,['foot'+s])
    ell('Cloth shoe '+s,m(.245,-.055,.065),(.111,.155,.058),SHOE,['foot'+s])
    line('Shoe welt '+s,[m(.245+.112*math.cos(a),-.065+.158*math.sin(a),.036) for a in [math.tau*j/60 for j in range(61)]],.0023,SEAM,['foot'+s])

# Blank sewn label placed against the curved gown.
def gown_front(x,z):
    a=math.asin(x/.44)
    for _ in range(6):
        t=(z-.43)/(seam_z(a)-.43);p=gown_point(t,a);a+=(x-p.x)/.43
    return p
p=gown_front(.225,1.445);label=cube('Blank chest label',p+Vector((0,-.006,0)),(.118,.008,.071),LABEL,['chest'],.004)
activate(label);mod=label.modifiers.new('Label surface fit','SUBSURF');mod.subdivision_type='SIMPLE';mod.levels=2;bpy.ops.object.modifier_apply(modifier=mod.name)
for o in [label]:
    for v in o.data.vertices:
        pt=o.matrix_world@v.co;surf=gown_front(pt.x,pt.z);pt.y=surf.y-.006+v.co.y;v.co=o.matrix_world.inverted()@pt
for x in [.173+i*.0105 for i in range(11)]:
    for z in (1.413,1.477):
        p=gown_front(x,z);line('Label stitch',[p+Vector((0,-.012,-.0015)),p+Vector((.001,-.012,.0015))],.00065,SEAM,['chest'])

ad=bpy.data.armatures.new('Shuyosha skeleton');arm=bpy.data.objects.new('Shuyosha rig',ad);bpy.context.collection.objects.link(arm)
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
        if o==dome:
            h=max(0,min(1,(-p.y-.15)/.09))*max(0,min(1,(p.z-1.80)/.10))*max(0,min(1,(.17-abs(p.x))/.06))
            groups['head'].add([v.index],h,'REPLACE');groups['chest'].add([v.index],1-h,'REPLACE');continue
        near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in bones)[:3]
        weights=[math.exp(-(d-near[0][0])*38) for d,n in near];total=sum(weights)
        for (d,n),w in zip(near,weights):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mod=o.modifiers.new('Skin rig','ARMATURE');mod.object=arm;o.data.validate();o.data.update()
for o in EYES:
    o.shape_key_add(name='Basis');key=o.shape_key_add(name='blink');cz=sum(p.co.z for p in key.data)/len(key.data)
    for p in key.data:p.co.z=cz+(p.co.z-cz)*.05;p.co.y+=.004

# Rest-shape correction applied equally to the model and skeleton.
# Wider, lower shoulders and a forward-slumped upper body; longer heavy fingers.
def rest_shape(p,hand=False):
    q=Vector(p);t=max(0,min(1,(q.z-1.25)/.75));s=t*t*(3-2*t)
    q.x*=1+.11*s;q.y-=.115*s;q.z-=.085*s
    if hand and abs(p.x)>.38 and .56<p.z<.90:
        q.z-=.12*(.90-p.z)
        center=.515 if p.x>0 else -.515
        q.x=center+(q.x-center)*(1+.15*min(1,(.90-p.z)/.06))
    return q
for o in ASSETS:
    hand=any(n.startswith(('hand','foreArm','finger','thumb')) for n in o['bones'].split(','))
    if o.data.shape_keys:
        for key in o.data.shape_keys.key_blocks:
            for v in key.data:v.co=rest_shape(v.co,hand)
    else:
        for v in o.data.vertices:v.co=rest_shape(v.co,hand)
    o.data.update()
activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for b in ad.edit_bones:
    hand=b.name.startswith(('hand','foreArm','finger','thumb'))
    b.head=rest_shape(b.head,hand);b.tail=rest_shape(b.tail,hand)
bpy.ops.object.mode_set(mode='OBJECT')

sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','reach_pull','charge_ready']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        a=math.sin(math.pi*f/120)**2
        for p in arm.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
        if name=='idle':arm.pose.bones['chest'].rotation_euler.x=math.radians(.6)*math.sin(math.tau*f/120)
        elif name=='reach_pull':
            for s in ['L','R']:
                arm.pose.bones['upperArm'+s].rotation_euler.x=math.radians(-66)*a
                arm.pose.bones['foreArm'+s].rotation_euler.x=math.radians(-22)*a
                arm.pose.bones['upperArm'+s].rotation_euler.z=math.radians(8 if s=='L' else -8)*a
                for k in range(1,5):arm.pose.bones['finger'+str(k)+s].rotation_euler.x=math.radians(15)*a
            arm.pose.bones['chest'].rotation_euler.x=math.radians(7)*a
        else:
            for s in ['L','R']:
                arm.pose.bones['thigh'+s].rotation_euler.x=math.radians(-35)*a
                arm.pose.bones['shin'+s].rotation_euler.x=math.radians(70)*a
                arm.pose.bones['foot'+s].rotation_euler.x=math.radians(-35)*a
                arm.pose.bones['upperArm'+s].rotation_euler.x=math.radians(-14)*a
            arm.pose.bones['pelvis'].location.y=-.138*a
            arm.pose.bones['spine'].rotation_euler.x=math.radians(15)*a
            arm.pose.bones['chest'].rotation_euler.x=math.radians(9)*a
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
for o in models:
    if o.type=='MESH' and o.data.materials[0] in [CLOTH,SEAM]:garment_weights.fit(o)
activate(arm)
for o in models:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'shuyosha.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True,export_morph=True,export_morph_normal=False)
stats={'bones':len(ad.bones),'vertices':sum(len(o.data.vertices) for o in models if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'shuyosha.glb')),'cast_engine_tested':False,'door_count':9}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup(1000,32)
for k in ['front','side','back','three_quarter','face','hand','back_detail']:studio.render(os.path.join(OUT,k+'.png'),k)
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'shuyosha.blend'))
print('DONE',stats,flush=True)
