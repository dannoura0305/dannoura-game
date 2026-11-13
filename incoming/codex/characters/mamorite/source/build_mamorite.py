import bpy,sys,os,math,json
from mathutils import Vector,Matrix,Quaternion
from mathutils.bvhtree import BVHTree
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True);bpy.ops.wm.read_factory_settings(use_empty=True);SK={}
SKIN=mat('Pale weathered skin',(.46,.435,.40),.93,True,.065)
CREASE=mat('Subtle skin creases',(.07,.06,.05),1);CREASE.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=0
CLOTH=mat('Worn blue grey gown',(.385,.415,.45),.96,True,.07)
SEAM=mat('Blue grey seam thread',(.23,.25,.27),.95)
BLANKET=mat('Undyed ivory blanket',(.68,.635,.54),.98,True,.055)
HEM=mat('Worn blanket binding',(.59,.545,.465),.97,True,.04)
SHOE=mat('Grey cloth slippers',(.36,.35,.32),.94,True,.06)
SOLE=mat('Worn beige rubber sole',(.32,.30,.26),.92)
BAND=mat('Ivory hospital wristband',(.69,.68,.63),.75)
DARK=mat('Recessed mouth shadow',(.035,.029,.025),1)
for ma in [CLOTH,BLANKET,HEM,SHOE]:surface_normal(ma,'cloth',.16)
surface_normal(SKIN,'skin',.20)
def bone(n,h,t,p=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':p}
bone('root',(0,0,0),(0,0,.15));bone('pelvis',(0,.10,.62),(0,.10,.90),'root');bone('spine',(0,.10,.90),(0,.10,1.12),'pelvis');bone('chest',(0,.10,1.12),(0,.08,1.42),'spine');bone('neck',(0,.04,1.40),(0,-.20,1.48),'chest');bone('head',(0,-.20,1.48),(0,-.22,1.64),'neck');bone('hood',(0,.12,1.29),(0,.12,1.88),'chest')
ell('Broad hunched torso',(0,.10,1.08),(.37,.24,.40),SKIN,['pelvis','spine','chest'])

# A continuous tunic with broad draped folds and a lower free hem.
def gown_point(t,a):
    rx=prof(t,[(0,.62),(.25,.59),(.48,.49),(.72,.49),(.9,.44),(1,.19)])
    ry=prof(t,[(0,.44),(.4,.40),(.75,.35),(.9,.28),(1,.17)])
    fold=(.025*math.cos(11*a+2*t)+.012*math.cos(19*a-4*t))*(.5+.5*math.sin(math.pi*t))
    z=.37+1.16*t+.018*math.sin(5*a+1.1)*(1-t)**2
    if t>.70:z-=.12*((t-.70)/.30)**2*max(0,math.cos(a))**5
    y=.10-(ry+fold)*math.cos(a)-.025*math.sin(math.pi*t)*max(0,math.cos(a))
    return Vector(((rx+fold)*math.sin(a),y,z))
vs=[];fs=[];uv=[];R=90;N=100
for i in range(R+1):
    for j in range(N):vs.append(gown_point(i/R,math.tau*j/N));uv.append((j/N*2,i/R*2))
for i in range(R):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
gown=mesh('Loose continuous grey blue tunic',vs,fs,CLOTH,['pelvis','spine','chest'],uv);solid(gown,.006)
for t in [.018,.04]:line('Gown hem stitching',[gown_point(t,math.tau*j/120) for j in range(121)],.0012,SEAM,['pelvis'])
line('Soft V neck binding',[gown_point(1,math.tau*j/100) for j in range(101)],.008,CLOTH,['chest','neck'])

# Small featureless face sheltered by the front overhang.
head=ell('Small sheltered face',(0,-.265,1.495),(.143,.123,.177),SKIN,['head'])
for v in head.data.vertices:
    if v.co.z<0:v.co.x*=.75+.25*(v.co.z+.177)/.177
ell('Broad soft nose',(0,-.379,1.455),(.044,.014,.017),SKIN,['head'])
for z,width in [(1.405,.062),(1.375,.038)]:
    pts=[]
    for i in range(25):
        x=-width+2*width*i/24;zz=z+.010*(x/width)**2
        hit,p,n,index=head.ray_cast(Vector((x,-1,zz))-head.location,Vector((0,1,0)))
        if hit:pts.append(p+head.location+Vector((0,-.001,0)))
    if len(pts)>2:tube('Closed mouth crease',pts,[(0,.0005),(.25,.0023),(.75,.0023),(1,.0005)],DARK,['head'],n=40,sides=10)

# Full cloth cap and skirt: front is raised into an arch; the back falls low.
def blanket_point(t,a):
    s=math.sin(t*math.pi/2);c=math.cos(a)
    edge_drop=.55-.73*((1+c)/2)**1.7
    rad=(.044*math.sin(9*a+5*t)+.018*math.cos(17*a-5*t))*s*s
    x=(.69*s+rad)*math.sin(a)
    y=.12-(.62*s+rad)*math.cos(a)
    z=1.94-.55*(1-math.cos(t*math.pi/2))-edge_drop*t**3.6
    z+=.040*math.cos(7*a+8*t)*s+.019*math.sin(20*t+4*a)*s
    return Vector((x,y,z))
vs=[];fs=[];uv=[];R=100;N=128
for i in range(R+1):
    t=.003+.997*i/R
    for j in range(N):vs.append(blanket_point(t,math.tau*j/N));uv.append((j/N*3,t*3))
for i in range(R):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,a+N,b+N,b))
fs.append(tuple(range(N)));hood=mesh('Continuous draped ivory blanket',vs,fs,BLANKET,['hood'],uv);solid(hood,.010)
line('Rounded blanket hem',[blanket_point(1,math.tau*j/180) for j in range(181)],.009,HEM,['hood'])
line('Blanket edge stitch',[blanket_point(.982,math.tau*j/180)+Vector((0,0,.002)) for j in range(181)],.0013,HEM,['hood'])
for k,t in enumerate([.80,.87,.94]):
    pts=[]
    for j in range(65):
        a=-1.18+2.36*j/64;p=blanket_point(t,a);p+=Vector((0,-.004,.006));pts.append(p)
    tube('Soft layered front hood fold',pts,[(0,.002),(.18,.014),(.82,.014),(1,.002)],BLANKET,['hood'],n=90,sides=14)

for sign,s in [(1,'L'),(-1,'R')]:
    def m(x,y,z):return (sign*x,y,z)
    h=Vector(m(.43,-.025,1.32));e=Vector(m(.59,-.245,1.095));w=Vector(m(.66,-.565,1.02))
    bone('upperArm'+s,h,e,'chest');bone('foreArm'+s,e,w,'upperArm'+s);bone('hand'+s,w,w+Vector((0,0,.20)),'foreArm'+s)
    tube('Rolled gown sleeve '+s,[h,h.lerp(e,.43)+Vector((0,.005,.035)),e,e.lerp(w,.13)],[(0,.145),(.4,.155),(.78,.126),(1,.118)],CLOTH,['upperArm'+s,'foreArm'+s],n=70,sides=48,fold=.008)
    for t in [.69,.81,.95]:
        c=h.lerp(e,t)+Vector((0,0,.012));d=(e-h).normalized();a=d.orthogonal().normalized();b=d.cross(a);pts=[c+.133*(a*math.cos(math.tau*j/48)+b*math.sin(math.tau*j/48)) for j in range(49)]
        line('Rolled sleeve fold '+s,pts,.012,CLOTH,['upperArm'+s,'foreArm'+s])
    tube('Broad exposed forearm '+s,[e,e.lerp(w,.45),w],[(0,.107),(.45,.10),(1,.074)],SKIN,['foreArm'+s],n=55,sides=40,fold=.002)
    if s=='L':
        c=e.lerp(w,.77);d=(w-e).normalized();tube('Hospital identification band',[c-d*.027,c+d*.027],[(0,.0996),(1,.096)],BAND,['foreArm'+s],n=10,sides=50)
        a=d.orthogonal().normalized();b=d.cross(a)
        for j in range(18):
            p=c+.1008*(a*math.cos(math.tau*j/18)+b*math.sin(math.tau*j/18));ell('Wristband perforation',p,(.0022,.0022,.0022),SEAM,['foreArm'+s])
    # Voxel union makes the broad palm, thumb and fingers one continuous skin.
    parts=[ell('Broad open palm '+s,m(.67,-.645,1.065),(.165,.072,.155),SKIN,['hand'+s]),tube('Wrist bridge '+s,[w,m(.67,-.625,1.055)],[(0,.075),(1,.095)],SKIN,['hand'+s],n=20,sides=28)]
    fingerbones=[];fingerpaths=[]
    for k,(dx,length) in enumerate([(-.105,.23),(-.035,.29),(.038,.27),(.108,.20)]):
        length*=.85;p0=Vector(m(.67+dx,-.646,1.14));p1=Vector(m(.67+dx*1.35,-.65,1.14+length*.55));p2=Vector(m(.67+dx*1.80,-.625,1.14+length))
        bn='finger'+str(k+1)+s;bone(bn,p0,p2,'hand'+s);fingerbones.append(bn);fingerpaths.append((bn,p0,p1,p2))
        parts.append(ell('Blended knuckle '+bn,p0,(.043,.055,.058),SKIN,['hand'+s,bn]))
        parts.append(tube('Rounded finger '+bn,[p0,p1,p2],[(0,.036),(.5,.033),(.85,.028),(1,.026)],SKIN,[bn],n=35,sides=24));parts.append(ell('Rounded fingertip '+bn,p2,(.027,.028,.028),SKIN,[bn]))
    thumb=[Vector(m(.558,-.635,1.045)),Vector(m(.482,-.65,1.11)),Vector(m(.445,-.63,1.18))];bn='thumb'+s;bone(bn,thumb[0],thumb[-1],'hand'+s);fingerbones.append(bn)
    parts.append(tube('Open thumb '+s,thumb,[(0,.044),(.5,.038),(1,.024)],SKIN,[bn],n=35,sides=28));parts.append(ell('Thumb tip '+s,thumb[-1],(.028,.028,.028),SKIN,[bn]))
    hand=union('Continuous open hand '+s,parts,['hand'+s]+fingerbones)
    # Surface-following, fine palm creases; keep their contrast low at full-body scale.
    for j,coords in enumerate([[(-.09,1.12),(-.045,1.09),(.02,1.085),(.09,1.105)],[(-.08,1.055),(-.035,1.045),(.025,1.055),(.09,1.07)],[(-.09,1.11),(-.06,1.06),(-.055,1.015),(-.03,.975)]]):
        pts=[]
        for p in cat([(sign*(.67+x),-1,z) for x,z in coords],40):
            hit,q,n,index=hand.ray_cast(p,Vector((0,1,0)))
            if hit:pts.append(q+Vector((0,-.0004,0)))
        if len(pts)>3:line('Palm crease '+s+str(j),pts,.0009,CREASE,['hand'+s])
    for bn,p0,p1,p2 in fingerpaths:
        for t in [.45,.72]:
            c=p0.lerp(p2,t);pts=[]
            for j in range(15):
                x=c.x-.018+.036*j/14;hit,q,n,index=hand.ray_cast(Vector((x,-1,c.z)),Vector((0,1,0)))
                if hit:pts.append(q+Vector((0,-.0004,0)))
            if len(pts)>3:line('Finger flexion crease '+bn,pts,.0007,CREASE,[bn])
        ell('Finger nail '+bn,p2+Vector((0,.019,-.018)),(.016,.003,.020),BAND,[bn])
    hip=Vector(m(.28,.10,.68));knee=Vector(m(.45,-.095,.38));ankle=Vector(m(.51,-.015,.115));bone('thigh'+s,hip,knee,'pelvis');bone('shin'+s,knee,ankle,'thigh'+s);bone('foot'+s,ankle,m(.51,-.17,.065),'shin'+s)
    tube('Bent sturdy leg '+s,[hip,knee,ankle],[(0,.14),(.50,.125),(1,.087)],SKIN,['thigh'+s,'shin'+s],n=55,sides=40,fold=.003)
    sole=ell('Flat slipper sole '+s,m(.51,-.075,.032),(.145,.205,.031),SOLE,['foot'+s])
    for v in sole.data.vertices:
        if v.co.z<-.015:v.co.z=-.031
    ell('Soft grey slipper '+s,m(.51,-.076,.085),(.133,.186,.065),SHOE,['foot'+s])
    line('Slipper front seam '+s,[m(.395,-.17,.095),m(.44,-.22,.10),m(.51,-.235,.104),m(.58,-.22,.10),m(.625,-.17,.095)],.002,SEAM,['foot'+s])

# Keep the hanging garment outside the actual bent-leg surfaces.
lv=[];lf=[]
for o in ASSETS:
    if o.name.startswith('Bent sturdy leg'):
        offset=len(lv);lv.extend([o.matrix_world@v.co for v in o.data.vertices]);lf.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons])
bvh=BVHTree.FromPolygons(lv,lf)
for o in ASSETS:
    if o==gown or o.name.startswith('Gown hem stitching'):
        for v in o.data.vertices:
            p=o.matrix_world@v.co
            if p.z>.86:continue
            origin=Vector((0,.10,p.z));direction=p-origin;radius=direction.length
            if radius<.01:continue
            direction.normalize();hit,normal,index,distance=bvh.ray_cast(origin+direction*2,-direction,2)
            if hit is not None:
                margin=(.025 if v.index<len(o.data.vertices)//2 else .019) if o==gown else .028
                needed=(hit-origin).dot(direction)+margin
                if needed>radius:v.co=o.matrix_world.inverted()@(origin+direction*needed)
        o.data.update()
ad=bpy.data.armatures.new('Mamorite skeleton');arm=bpy.data.objects.new('Mamorite rig',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=world@v.co;v.co=p;near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:2];ws=[math.exp(-(d-near[0][0])*55) for d,n in near];total=sum(ws)
        for (d,n),w in zip(near,ws):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mod=o.modifiers.new('Character skin','ARMATURE');mod.object=arm;o.data.validate();o.data.update()
def setworld(n,h,t):
    r=ad.bones[n];ma=r.matrix_local.copy();ma.translation=Vector((0,0,0));ma=(r.tail_local-r.head_local).rotation_difference(Vector(t)-Vector(h)).to_matrix().to_4x4()@ma;ma.translation=Vector(h);arm.pose.bones[n].matrix=ma;bpy.context.view_layer.update()
def ik(up,low,end,target,pole,direction):
    h=arm.pose.bones[up].head.copy();l1=(SK[low]['head']-SK[up]['head']).length;l2=(SK[end]['head']-SK[low]['head']).length;d=Vector(target)-h;length=max(abs(l1-l2)+.0001,min(d.length,l1+l2-.0001));d.normalize();target=h+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector(pole);pole-=d*pole.dot(d)
    if pole.length<.001:pole=d.orthogonal()
    joint=h+d*along+pole.normalized()*height;setworld(up,h,joint);setworld(low,joint,target);setworld(end,target,target+Vector(direction))
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','push_back','protect_ground','recoil']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        a=math.sin(math.pi*f/120)**2
        def rotate(n,axis,deg):arm.pose.bones[n].rotation_quaternion=Quaternion(Vector(axis),math.radians(deg))
        if name=='idle':rotate('chest',(1,0,0),.55*math.sin(math.tau*f/120))
        else:
            if name=='protect_ground':
                off=Vector((0,-.10,-.35))*a;setworld('pelvis',SK['pelvis']['head']+off,SK['pelvis']['tail']+off);rotate('spine',(1,0,0),55*a)
            elif name=='recoil':rotate('chest',(1,0,0),-8*a)
            bpy.context.view_layer.update()
            for sign,s in [(1,'L'),(-1,'R')]:
                ik('thigh'+s,'shin'+s,'foot'+s,SK['foot'+s]['head'],(sign*.3,-1,0),SK['foot'+s]['tail']-SK['foot'+s]['head'])
                if name=='protect_ground':goal=Vector((sign*.58,-.55,.154));direction=Vector((0,0,.2)).lerp(Vector((0,-.2,0)),a);pole=Vector((sign*.5,.1,0))
                elif name=='push_back':goal=Vector((sign*.69,-.68,1.22));direction=Vector((0,0,.2));pole=Vector((sign*.5,0,-.2))
                else:goal=Vector((sign*.66,-.47,1.14));direction=Vector((0,0,.2));pole=Vector((sign*.5,0,-.2))
                pole=(SK['foreArm'+s]['head']-SK['upperArm'+s]['head']).lerp(pole,a)
                ik('upperArm'+s,'foreArm'+s,'hand'+s,SK['hand'+s]['head'].lerp(goal,a),pole,direction)
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
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'mamorite.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
verts=[v.co for o in models if o.type=='MESH' for v in o.data.vertices];stats={'bones':len(ad.bones),'vertices':len(verts),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'mamorite.glb')),'height_m':max(p.z for p in verts)-min(p.z for p in verts),'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2);studio.setup()
for k in ['front','side','back','three_quarter','face','hand','cloth']:studio.render(os.path.join(OUT,k+'.png'),k)
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'mamorite.blend'));print('DONE',stats,flush=True)
