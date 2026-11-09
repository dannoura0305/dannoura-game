"""Machibito: elongated waiting figure with layered coat, scarf and wristwatch."""
import bpy,sys,os,math,json
from mathutils import Vector,Matrix,Quaternion
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
SK={}
SKIN=mat('Ash grey skin',(.48,.445,.42),.86,True,.08)
COAT=mat('Worn charcoal brown coat',(.25,.224,.211),.93,True,.22)
EDGE=mat('Worn folded cloth edges',(.31,.28,.253),.93,True,.16)
SCARF=mat('Muted taupe woven scarf',(.37,.305,.256),.97,True,.20)
PANTS=mat('Narrow grey brown trousers',(.235,.222,.209),.94,True,.15)
SHIRT=mat('Faded shirt collar',(.46,.44,.39),.93,True,.12)
LEATHER=mat('Aged dark leather',(.19,.145,.115),.68,True,.20)
SOLE=mat('Dark shoe sole',(.065,.053,.045),.86)
DARK=mat('Deep eye and mouth cavities',(.008,.006,.005),.99)
METAL=mat('Dull brass watch case',(.32,.25,.14),.36);METAL.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.75
DIAL=mat('Aged ivory clock dial',(.71,.68,.57),.8)
THREAD=mat('Faded stitching',(.27,.23,.185),.95)
for m,k,s in [(SKIN,'skin',.30),(COAT,'cloth',.8),(EDGE,'cloth',.65),(SCARF,'knit',.65),(PANTS,'cloth',.7),(LEATHER,'skin',.25)]:surface_normal(m,k,s)

def bone(n,h,t,parent=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':parent}
def panel(name,vs,fs,ma,bones,uv=None,thickness=.004):
    o=mesh(name,vs,fs,ma,bones,uv);solid(o,thickness);return o
def patch(name,points,ma,bones,thickness=.004):
    return panel(name,points,[tuple(range(len(points)))],ma,bones,[(p[0]*3,p[2]*3) for p in points],thickness)
def cube(name,c,size,ma,bones,bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=name;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
    if bevel:
        m=o.modifiers.new('Soft edges','BEVEL');m.width=bevel;m.segments=3;activate(o);bpy.ops.object.modifier_apply(modifier=m.name)
    o['bones']=','.join(bones);ASSETS.append(o);return o

bone('root',(0,0,0),(0,0,.22));bone('pelvis',(0,0,1.18),(0,0,1.38),'root')
bone('spine',(0,0,1.38),(0,.012,1.71),'pelvis');bone('chest',(0,.012,1.71),(0,.018,2.005),'spine')
neckpath=[(0,.018,1.98),(-.012,-.012,2.13),(.032,-.14,2.30),(.08,-.34,2.47),(.12,-.405,2.63)]
for i in range(4):bone('neck'+str(i+1),neckpath[i],neckpath[i+1],'chest' if i==0 else 'neck'+str(i))
bone('head',neckpath[-1],(.13,-.46,2.76),'neck4')
for s,sign in [('L',1),('R',-1)]:
    bone('thigh'+s,(sign*.075,0,1.30),(sign*.08,-.018,.67),'pelvis')
    bone('shin'+s,(sign*.08,-.018,.67),(sign*.082,.015,.105),'thigh'+s)
    bone('foot'+s,(sign*.082,.015,.105),(sign*.082,-.13,.045),'shin'+s)
    shoulder=(sign*.19,.018,1.965)
    elbow=(.265,-.045,1.64) if s=='L' else (-.265,-.035,1.46)
    wrist=(.035,-.29,1.69) if s=='L' else (-.085,-.31,1.565)
    tail=(-.065,-.33,1.58) if s=='L' else (.035,-.33,1.60)
    bone('upperArm'+s,shoulder,elbow,'chest');bone('foreArm'+s,elbow,wrist,'upperArm'+s);bone('hand'+s,wrist,tail,'foreArm'+s)

# Undercoat: a curved, slightly hunched textile volume.
vs=[];fs=[];uv=[];N=65;M=96
def coat_surface(t,a,offset=0):
    z=1.10+.90*t;rx=prof(t,[(0,.17),(.30,.175),(.55,.14),(.84,.19),(1,.195)])
    ry=prof(t,[(0,.118),(.4,.115),(.65,.105),(1,.113)])
    fold=.009*math.sin(9*a+4*t)+.005*math.sin(17*a-7*t)
    return Vector(((rx+fold+offset)*math.sin(a),.02-(ry+fold+offset)*math.cos(a),z+.012*math.sin(5*a+9*t)))
for i in range(N):
    t=i/(N-1)
    for j in range(M):a=math.tau*j/M;vs.append(coat_surface(t,a));uv.append((j/M,t*2))
for i in range(N-1):
    for j in range(M):a=i*M+j;b=i*M+(j+1)%M;fs.append((a,b,b+M,a+M))
panel('Continuous long coat',vs,fs,COAT,['pelvis','spine','chest'],uv,.007)
ell('Rounded shoulder yoke',(0,.018,1.913),(.231,.122,.125),COAT,['chest'])

# Overlapping draped bands. Open at the front; hem descends toward each side.
for layer in range(5):
    vs=[];fs=[];uv=[];rows=16;cols=110
    base=1.15+layer*.115
    for i in range(rows):
        t=i/(rows-1)
        for j in range(cols):
            a=.17+(math.tau-.34)*j/(cols-1)
            z=base+.17*t+.09*math.cos(a)+.018*math.sin(5*a+layer)
            bt=max(0,min(1,(z-1.1)/.9));p=coat_surface(bt,a)
            r=.013+.016*(1-t)+.010*math.sin(3*a+layer)*math.sin(math.pi*t)
            p+=Vector((math.sin(a)*r,-math.cos(a)*r,0));p.z=z;vs.append(p);uv.append((j/(cols-1)*2,t*.4))
    for i in range(rows-1):
        for j in range(cols-1):a=i*cols+j;fs.append((a,a+1,a+1+cols,a+cols))
    panel('Draped coat fold '+str(layer+1),vs,fs,COAT,['pelvis','spine','chest'],uv,.005)
    line('Soft folded hem '+str(layer+1),vs[:cols],.0023,EDGE,['pelvis','spine','chest'])

# Front placket, broad lapels, seams and buttons.
vs=[];fs=[];uv=[]
for i in range(38):
    t=i/37;z=1.09+.83*t
    for j in range(5):
        x=-.031+.062*j/4;y=-.122-.014*math.sin(math.pi*t)+.008*math.sin(t*8)
        vs.append((x,y,z));uv.append((j/4*.15,t*2))
for i in range(37):
    for j in range(4):a=i*5+j;fs.append((a,a+1,a+6,a+5))
panel('Long button placket',vs,fs,EDGE,['pelvis','spine','chest'],uv,.006)
for i,z in enumerate([1.22,1.38,1.54,1.75,1.89]):
    ell('Four hole coat button',(.006,-.145,z),(.014,.005,.014),LEATHER,['spine' if z<1.7 else 'chest'])
    for dx,dz in [(-.003,-.003),(.003,-.003),(-.003,.003),(.003,.003)]:ell('Button stitch',(.006+dx,-.150,z+dz),(.0014,.001,.0014),THREAD,['spine' if z<1.7 else 'chest'])
for s in [-1,1]:
    patch('Folded coat lapel',[(s*.06,-.072,2.04),(s*.19,-.085,1.96),(s*.112,-.145,1.82),(s*.045,-.154,1.71),(s*.065,-.14,1.91)],COAT,['chest'],.008)
    patch('Shirt collar',[(s*.015,-.069,2.055),(s*.066,-.060,2.05),(s*.078,-.10,1.965),(s*.031,-.12,2.004)],SHIRT,['chest'],.005)
    line('Shoulder seam',[(s*.065,.04,2.02),(s*.13,.02,2.019),(s*.205,.015,1.97)],.002,THREAD,['chest'])
    line('Front placket stitching',[(s*.027,-.135,z) for z in [1.11,1.3,1.5,1.7,1.89]],.0012,THREAD,['spine','chest'])

# Narrow, ankle-length trousers with subtle vertical folds and laced shoes.
for s,sgn in [('L',1),('R',-1)]:
    x=sgn*.082
    tube('Long thin trouser '+s,[SK['thigh'+s]['head'],(x,.005,.95),SK['shin'+s]['head'],(x,.012,.35),(x,.012,.10)],[(0,.062),(.26,.058),(.52,.045),(.78,.043),(1,.047)],PANTS,['thigh'+s,'shin'+s],n=100,sides=48,flat=.92,fold=.004)
    ell('Shoe sole '+s,(x,-.063,.024),(.072,.143,.024),SOLE,['foot'+s])
    ell('Worn leather shoe '+s,(x,-.07,.065),(.068,.139,.045),LEATHER,['foot'+s])
    tube('Shoe ankle '+s,[(x,.009,.067),(x,.012,.13)],[(0,.049),(1,.046)],LEATHER,['foot'+s],n=20,sides=32,flat=.86)
    line('Shoe welt '+s,[(x+.070*math.cos(a),-.063+.14*math.sin(a),.039) for a in [math.tau*j/64 for j in range(65)]],.0022,THREAD,['foot'+s])
    for i in range(4):
        y=-.098+i*.019;z=.101+i*.004
        for sign in [-1,1]:ell('Lace eyelet',(x+sign*.025,y,z),(.003,.003,.0017),METAL,['foot'+s])
        line('Shoe lace',[(x-.025,y,z+.002),(x+.025,y+.014,z+.005)],.0016,THREAD,['foot'+s])
        line('Shoe lace',[(x+.025,y,z+.002),(x-.025,y+.014,z+.005)],.0016,THREAD,['foot'+s])

# Bent sleeves follow the permanent waiting pose.
WRISTS={}
for s in ['L','R']:
    shoulder=SK['upperArm'+s]['head'];elbow=SK['foreArm'+s]['head'];wrist=SK['hand'+s]['head'];end=wrist.lerp(elbow,.12)
    inner_shoulder=shoulder+Vector((-.045 if s=='L' else .045,0,-.025))
    tube('Bent coat sleeve '+s,[inner_shoulder,shoulder.lerp(elbow,.52),elbow,elbow.lerp(end,.55),end],[(0,.071),(.23,.077),(.51,.070),(.79,.064),(1,.052)],COAT,['upperArm'+s,'foreArm'+s],n=85,sides=48,fold=.006)
    direction=(wrist-elbow).normalized();a=end-direction*.022;b=end+direction*.025
    tube('Turned cuff '+s,[a,end,b],[(0,.055),(.6,.059),(1,.052)],EDGE,['foreArm'+s],n=18,sides=40,fold=.002)
    WRISTS[s]=tube('Exposed wrist '+s,[end,wrist,SK['hand'+s]['tail']],[(0,.038),(.45,.031),(1,.032)],SKIN,['foreArm'+s,'hand'+s],n=30,sides=32)

# Left hand drapes down; right hand supports the wrist from beneath.
for s in ['L','R']:
    wrist=SK['hand'+s]['head'];tail=SK['hand'+s]['tail'];direction=(tail-wrist).normalized();across=direction.cross(Vector((0,-1,0))).normalized()
    center=wrist.lerp(tail,.70);palm=ell('Slender palm '+s,center,(.039,.024,.067),SKIN,['hand'+s]);palm.rotation_euler=Vector((0,0,1)).rotation_difference(direction).to_euler();parts=[WRISTS[s],palm]
    for k in range(4):
        offset=(k-1.5)*.019;start=tail+across*offset;length=[.088,.108,.102,.079][k]
        p1=start+direction*length*.48+Vector((0,-.008,0));p2=start+direction*length+Vector((0,.010 if s=='L' else .022,.002));p3=p2+Vector((0,.014,.008))
        bn='finger'+str(k+1)+s;bone(bn,start,p2,'hand'+s)
        parts.append(tube('Long finger '+s+str(k),[start,p1,p2,p3],[(0,.009),(.4,.010),(1,.0055)],SKIN,[bn],n=24,sides=16))
    start=wrist.lerp(tail,.48)-across*.032;p1=start-across*.042+direction*.012;p2=p1+direction*.052+across*.008
    bone('thumb'+s,start,p2,'hand'+s);parts.append(tube('Thumb '+s,[start,p1,p2],[(0,.013),(.55,.011),(1,.0065)],SKIN,['thumb'+s],n=25,sides=20))
    union('Waiting hand '+s,parts,['foreArm'+s,'hand'+s]+['finger'+str(k+1)+s for k in range(4)]+['thumb'+s])

# Watch on the left wrist: oval strap, brass rim, ivory dial, ticks and two hands.
wc=Vector((.040,-.316,1.721));normal=Vector((0,-.72,.69)).normalized();u=Vector((1,0,0));v=normal.cross(u).normalized()
def wp(x,y,z=0):return wc+u*x+v*y+normal*z
def disc(name,r,depth,ma):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=wc);o=bpy.context.object;o.name=name;o.rotation_euler=Vector((0,0,1)).rotation_difference(normal).to_euler();o.data.materials.append(ma);o['bones']='handL';ASSETS.append(o);return o
strapaxis=(SK['handL']['head']-SK['foreArmL']['head']).normalized();a=strapaxis.cross(normal).normalized();b=strapaxis.cross(a).normalized();strapcenter=SK['handL']['head']+Vector((.004,0,.004))
verts=[];faces=[]
for i in range(2):
    for j in range(64):
        th=math.tau*j/64;verts.append(strapcenter+strapaxis*(i-.5)*.027+a*.037*math.cos(th)+b*.032*math.sin(th))
for j in range(64):faces.append((j,(j+1)%64,(j+1)%64+64,j+64))
panel('Leather watch strap',verts,faces,LEATHER,['handL'],thickness=.003)
disc('Brass watch case',.033,.009,METAL)
face=disc('Ivory watch face',.028,.002,DIAL);face.location=wp(0,0,.0055)
line('Brass watch bezel',[wp(.031*math.cos(t),.031*math.sin(t),.006) for t in [math.tau*j/64 for j in range(65)]],.0015,METAL,['handL'])
for j in range(60):
    t=math.tau*j/60;r0=.022 if j%5==0 else .025
    line('Clock tick',[wp(r0*math.sin(t),r0*math.cos(t),.007),wp(.027*math.sin(t),.027*math.cos(t),.007)],.00075 if j%5==0 else .00035,DARK,['handL'])
for length,t in [(.017,-math.pi/3),(.023,math.pi/3)]:line('Clock hand',[wp(0,0,.008),wp(length*math.sin(t),length*math.cos(t),.008)],.0011,DARK,['handL'])
ell('Watch pin',wp(0,0,.0085),(.002,.002,.002),METAL,['handL'])

# One continuous long neck with longitudinal tendons.
neck=tube('Continuous curved neck',neckpath,[(0,.071),(.23,.054),(.57,.047),(.82,.050),(1,.055)],SKIN,['chest','neck1','neck2','neck3','neck4','head'],n=125,sides=64)
centers=cat(neckpath,125)
for vert in neck.data.vertices:
    i,j=divmod(vert.index,64)
    if i>=125:continue
    d=vert.co-centers[i];a=math.tau*j/64;vert.co+=d.normalized()*(.004*math.sin(7*a+1.2*i/124)+.002*math.sin(13*a))

# Sad mask: narrow elongated face, hollow eyes and an incised downturned mouth.
head=ell('Long mournful head',(.13,-.46,2.673),(.082,.068,.124),SKIN,['head'])
activate(head);m=head.modifiers.new('Head surface detail','SUBSURF');m.levels=2;bpy.ops.object.modifier_apply(modifier=m.name)
for vert in head.data.vertices:
    z=vert.co.z/.124;vert.co.x*=.80+.20*(z+1)/2;vert.co.y+=.004*math.sin(vert.co.x*70+z*3)
head.rotation_euler.x=math.radians(30)
head_rotation=Matrix.Rotation(math.radians(30),3,'X');head_center=Vector((.13,-.46,2.673))
def head_point(p):return head_center+head_rotation@(Vector(p)-head_center)
head=union('Continuous head and long neck',[neck,head],['chest','neck1','neck2','neck3','neck4','head'])
def head_front(x,z):
    inv=head.matrix_world.inverted();origin=inv@Vector((x,-2,z));direction=(inv.to_3x3()@Vector((0,1,0))).normalized();hit,p,_,_=head.ray_cast(origin,direction)
    return head.matrix_world@p if hit else Vector((x,-.515,z))
for sign in [-1,1]:
    target=head_point((.13+sign*.033,-.521,2.704+sign*.004));x=target.x;z=target.z;p=head_front(x,z)
    cut=ell('Eye cavity cutter',(x,p.y+.002,z),(.015,.031,.024),DARK,['head']);cut.rotation_euler.y=sign*math.radians(-12)
    activate(head);mod=head.modifiers.new('Deep hollow eye','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);ASSETS.remove(cut);bpy.data.objects.remove(cut,do_unlink=True)
    ell('Eye cavity interior',(x,p.y+.024,z),(.013,.0025,.021),DARK,['head'])
mouth=[]
for i in range(41):
    t=i/40;target=head_point((.13+(t-.5)*.069,-.514,2.616+.020*(1-(2*t-1)**2)));mouth.append(head_front(target.x,target.z))
cut=tube('Mouth cutter',[p+Vector((0,-.001,0)) for p in mouth],[(0,.002),(.2,.004),(.5,.005),(.8,.004),(1,.002)],DARK,['head'],n=90,sides=16)
activate(head);mod=head.modifiers.new('Downturned mouth opening','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);ASSETS.remove(cut);bpy.data.objects.remove(cut,do_unlink=True)
tube('Sad mouth shadow',[p+Vector((0,.004,0)) for p in mouth],[(0,.0015),(.5,.004),(1,.0015)],DARK,['head'],n=90,sides=12)

# Soft scarf loops and two draping ends, with short separate fringe strands.
for layer in range(3):
    path=[]
    for j in range(49):
        a=math.tau*j/48;path.append((.103*math.sin(a),.005-.092*math.cos(a),2.028+layer*.035-.035*math.cos(a)+.008*math.sin(2*a+layer)))
    tube('Wrapped scarf fold '+str(layer),path,[(0,.025),(1,.025)],SCARF,['chest'],n=125,sides=24,flat=.70,fold=.002)
def scarf_end(name,centers,width):
    rows=65;cols=20;path=cat(centers,rows);vs=[];uv=[];fs=[]
    for i,c in enumerate(path):
        t=i/(rows-1)
        for j in range(cols):
            q=j/(cols-1)-.5;vs.append(c+Vector((q*width,.004*math.sin(q*math.tau*4+t*3),.005*math.sin(q*math.tau*3))))
            uv.append((j/(cols-1)*.3,t*2))
    for i in range(rows-1):
        for j in range(cols-1):a=i*cols+j;fs.append((a,a+1,a+1+cols,a+cols))
    panel(name,vs,fs,SCARF,['chest','spine'],uv,.006)
    end=path[-1]
    for j in range(22):
        x=(j/21-.5)*width;p=end+Vector((x,0,0));line('Scarf fringe',[p,p+Vector((.003*math.sin(j),-.002,-.020)),p+Vector((.004*math.cos(j),.002,-.043-.008*math.sin(j*2)))],.0013,SCARF,['chest','spine'])
scarf_end('Front scarf end',[(-.08,-.073,2.09),(-.125,-.137,1.98),(-.145,-.145,1.83),(-.16,-.15,1.73)],.10)
scarf_end('Back scarf end',[(.04,.09,2.11),(-.065,.15,2.02),(-.10,.153,1.85),(-.085,.15,1.69)],.09)

# Bind each part to the appropriate chain, preserving its rest pose.
def proportion(p):
    p=Vector(p);t=max(0,min(1,(p.z-2.02)/.54));p.z-=.22*t;return p
for d in SK.values():
    for key in ['head','tail']:d[key]=proportion(d[key])
neckpath=[proportion(p) for p in neckpath]
ad=bpy.data.armatures.new('Machibito skeleton');arm=bpy.data.objects.new('Machibito rig',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy()
    for vert in o.data.vertices:
        p=proportion(world@vert.co);vert.co=p;near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:3];weights=[math.exp(-(d-near[0][0])*50) for d,n in near];total=sum(weights)
        for (d,n),w in zip(near,weights):groups[n].add([vert.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mod=o.modifiers.new('Character skin','ARMATURE');mod.object=arm;o.data.validate();o.data.update()

# Neck animation is solved in world space, avoiding reliance on bone roll.
def set_world_bone(name,h,t):
    rest=ad.bones[name];m=rest.matrix_local.copy();m.translation=Vector((0,0,0));m=(rest.tail_local-rest.head_local).rotation_difference(Vector(t)-Vector(h)).to_matrix().to_4x4()@m;m.translation=Vector(h);arm.pose.bones[name].matrix=m;bpy.context.view_layer.update()
def neck_pose(mode,a):
    pts=[Vector(p) for p in neckpath]
    for i in range(1,5):
        t=i/4
        if mode=='wait':pts[i]+=Vector((-.018*t*a,-.15*t*t*a,.025*t*a))
        elif mode=='check_watch':pts[i]+=Vector((-.05*t*t*a,.06*t*a,-.13*t*t*a))
        elif mode=='look_around':pts[i]+=Vector((.12*t*t*a,.015*t*a,0))
    for i in range(4):set_world_bone('neck'+str(i+1),pts[i],pts[i+1])
    direction=SK['head']['tail']-SK['head']['head']
    if mode=='check_watch':direction=direction.lerp(Vector((-.015,-.14,.025)),a)
    elif mode=='look_around':direction.x+=.08*a
    set_world_bone('head',pts[-1],pts[-1]+direction)
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','wait','check_watch','look_around']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0)
        bpy.context.view_layer.update();a=math.sin(math.pi*f/120)**2
        if name=='idle':
            arm.pose.bones['chest'].rotation_quaternion=Quaternion(Vector((1,0,0)),math.radians(.45*math.sin(math.tau*f/120)))
        else:neck_pose(name,a)
        for p in arm.pose.bones:p.keyframe_insert('rotation_quaternion',frame=f);p.keyframe_insert('location',frame=f)
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
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'machibito.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
stats={'bones':len(ad.bones),'vertices':sum(len(o.data.vertices) for o in models if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'machibito.glb')),'height_m':max(v.co.z for o in models if o.type=='MESH' for v in o.data.vertices)-min(v.co.z for o in models if o.type=='MESH' for v in o.data.vertices),'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup(1000,28)
for k in ['front','side','back','three_quarter','face','watch','torso']:studio.render(os.path.join(OUT,k+'.png'),k)
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'machibito.blend'));print('DONE',stats,flush=True)
