"""Nekomata sculpt study. Run with Blender -b -P this_file -- output_directory.
Local, deterministic geometry; no downloads or external services.
"""
import bpy, math, os, sys, json, random, bisect
from mathutils import Vector, Matrix
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

OUT = os.path.abspath(sys.argv[sys.argv.index('--')+1])
os.makedirs(OUT, exist_ok=True)
random.seed(23)
bpy.ops.wm.read_factory_settings(use_empty=True)
SCALE = 5.7
ASSETS=[]
FUR=[]
EYES=[]
BASE=[]
SURFACES={}

def material(name, color, rough=.65):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough
    return m
WHITE=material('Ivory lilac coat',(.76,.72,.81))
FURMAT=material('Sculpted fur',(.82,.78,.87))
PINK=material('Inner ear',(.55,.28,.36))
NOSE=material('Rose nose',(.54,.26,.32),.48)
PURPLE=material('Violet markings',(.24,.09,.37))
IRIS=material('Lavender iris',(.43,.31,.55),.36)
EYEWHITE=material('Muted eye corners',(.56,.51,.62),.45)
IRISDEEP=material('Iris edge',(.16,.09,.24),.42)
DARK=material('Pupil and eyelid rim',(.033,.019,.047),.4)
GLINT=material('Eye highlight',(.94,.92,1),.18)
PAD=material('Paw pad',(.36,.18,.32))
CLAW=material('Amethyst claws',(.22,.10,.29),.32)

def activate(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o

def mesh(name, verts, faces, mat, bones=None, fur=False):
    me=bpy.data.meshes.new(name); me.from_pydata(verts,[],faces); me.update()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o)
    o.data.materials.append(mat)
    for p in me.polygons:p.use_smooth=True
    o['bone_candidates']=','.join(bones or ['head'])
    ASSETS.append(o)
    if fur:FUR.append(o)
    return o

def ell(name,c,r,mat=WHITE,bones=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=c)
    o=bpy.context.object; o.name=name; o.scale=r
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    o['bone_candidates']=','.join(bones or ['head']); ASSETS.append(o)
    return o

def union(name, obs, voxel, bones, smooth=4):
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:
        o.select_set(True); ASSETS.remove(o)
        if o in BASE:BASE.remove(o)
        if o in FUR:FUR.remove(o)
    bpy.context.view_layer.objects.active=obs[0]
    if len(obs)>1:bpy.ops.object.join()
    o=bpy.context.object; o.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    mod=o.modifiers.new('Continuous sculpt surface','REMESH');mod.mode='VOXEL';mod.voxel_size=voxel;mod.use_smooth_shade=True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Blend anatomical transitions','SMOOTH');mod.factor=1.0;mod.iterations=smooth
    bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('Efficient surface','DECIMATE');mod.ratio=.58
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    o['bone_candidates']=','.join(bones); ASSETS.append(o);BASE.append(o)
    return o

def catmull(points,n):
    p=[Vector(q) for q in points];result=[]
    for j in range(n):
        t=j/(n-1)*(len(p)-1);i=min(int(t),len(p)-2);t-=i
        a=p[max(i-1,0)];b=p[i];c=p[i+1];d=p[min(i+2,len(p)-1)]
        result.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    return result

def profile(t, pairs):
    for (a,x),(b,y) in zip(pairs,pairs[1:]):
        if a<=t<=b:return x+(y-x)*(t-a)/(b-a)
    return pairs[-1][1]

def tube(name,points,radii,mat,bones,n=32,sides=12,flat=1,up=(1,0,0),fur=False):
    pts=catmull(points,n);verts=[];faces=[];frames=[]
    prev=Vector(up)
    for i,p in enumerate(pts):
        t=i/(n-1);tangent=(pts[min(i+1,n-1)]-pts[max(i-1,0)]).normalized()
        a=prev-tangent*prev.dot(tangent)
        if a.length<.01:a=tangent.orthogonal()
        a.normalize();b=tangent.cross(a).normalized();prev=a;frames.append((a,b,tangent))
        r=profile(t,radii)
        for j in range(sides):
            ang=2*math.pi*j/sides
            verts.append(p+r*(a*math.cos(ang)+flat*b*math.sin(ang)))
    for i in range(n-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(sides))));faces.append(tuple((n-1)*sides+j for j in range(sides)))
    return mesh(name,verts,faces,mat,bones,fur),pts,frames

def strand(name,base,tip,width,normal,bones,bulge=.018,mat=FURMAT):
    if name in ('Tail flowing lock','Body flowing coat','Leg feathering'):return None
    a=Vector(base);b=Vector(tip);normal=Vector(normal).normalized()
    if name=='Cheek swept lock' and a.y<-.64 and a.z>1.34:return None
    if name in ('Layered neck ruff','Cheek swept lock'):
        tree=SURFACES.get('body' if name=='Layered neck ruff' else 'head')
        if tree:
            hit=tree.find_nearest(a)
            end=tree.find_nearest(b)
            if hit and end:
                a=hit[0]-hit[1]*.020;b=end[0]+end[1]*.010
                normal=hit[1];width*=.8;bulge=.008
    mid=a.lerp(b,.42)+normal*bulge
    return tube(name,[a,mid,b],[(0,width*.45),(.22,width*.53),(.53,width*.40),(.8,width*.22),(1,.0008)],mat,bones,
                n=9,sides=8,flat=.30,up=normal.cross((b-a).normalized()),fur=True)[0]

# A continuous skin under the layered mane. The shoulder and thigh volumes
# overlap the torso before voxel union, so there are no cylinder end caps.
parts=[]
def skin(c,r):parts.append(ell('skin volume',c,r))
skin((0,-.30,.83),(.285,.43,.34));skin((0,.12,.79),(.25,.46,.26));skin((0,.46,.83),(.285,.30,.30))
skin((0,-.47,1.02),(.28,.27,.29));skin((0,-.57,1.20),(.25,.22,.25))
skin((0,-.52,1.00),(.315,.295,.40))
skin((0,-.54,.78),(.235,.255,.24))
for sd in (1,-1):
    skin((sd*.205,-.40,.80),(.155,.19,.30))
    skin((sd*.22,-.40,.48),(.100,.115,.28));skin((sd*.225,-.43,.22),(.078,.09,.22))
    skin((sd*.23,-.51,.09),(.133,.19,.09))
    skin((sd*.21,.43,.77),(.19,.23,.29));skin((sd*.225,.30,.51),(.13,.15,.20))
    skin((sd*.23,.45,.34),(.09,.145,.19));skin((sd*.23,.55,.20),(.073,.08,.18))
    skin((sd*.23,.49,.075),(.124,.17,.075))
    for y in (-.62,.39):
        for dx in (-.085,-.028,.028,.085):skin((sd*(.23+dx),y+.12*abs(dx),.065),(.044,.084,.063))
bodybones=['pelvis','spine1','spine2','chest','neck1','neck2','neck3']+[n+s for s in ('L','R') for n in ('foreLeg','foreArm','forePaw','hindLeg','hindShin','hindFoot')]
body=union('Nekomata continuous body',parts,.009,bodybones,5)
SURFACES['body']=BVHTree.FromPolygons([v.co for v in body.data.vertices],[p.vertices[:] for p in body.data.polygons])

# Continuous feline face: cheek, bridge and muzzle blended together.
parts=[ell('skull',(0,-.635,1.365),(.221,.197,.202)),
       ell('forehead',(0,-.704,1.436),(.158,.100,.099)),
       ell('muzzle',(0,-.839,1.264),(.088,.081,.046))]
ridge=tube('Continuous nasal ridge',[(0,-.791,1.454),(0,-.823,1.410),(0,-.859,1.354),(0,-.897,1.305),(0,-.918,1.284)],
           [(0,.038),(.30,.036),(.70,.031),(1,.029)],WHITE,['head'],n=36,sides=16,flat=.72,up=(1,0,0))[0]
parts.append(ridge)
for sd in (1,-1):
    parts += [ell('cheek',(sd*.157,-.668,1.30),(.095,.14,.128)),
              ell('whisker pad',(sd*.044,-.867,1.262),(.051,.054,.036)),
              ell('brow',(sd*.105,-.757,1.409),(.092,.037,.024))]
head=union('Nekomata sculpted head',parts,.0048,['head'],4)
SURFACES['head']=BVHTree.FromPolygons([v.co for v in head.data.vertices],[p.vertices[:] for p in head.data.polygons])
SURFACES['face']=SURFACES['head']
jaw=union('Nekomata lower jaw',[ell('chin',(0,-.825,1.221),(.082,.075,.030)),ell('jaw hinge',(0,-.746,1.238),(.103,.101,.044))],.0045,['jaw'],3)

# Ears: swept triangular shells, inset inner ear and rounded edges.
for sd in (1,-1):
    verts=[(sd*.075,-.70,1.48),(sd*.23,-.64,1.49),(sd*.236,-.60,1.732),
           (sd*.11,-.52,1.48),(sd*.245,-.53,1.51),(sd*.250,-.57,1.678)]
    verts[2]=(sd*.250,-.60,1.682)
    ear=mesh('Ear '+str(sd),verts,[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(2,5,3,0)],WHITE,['head'])
    activate(ear);mod=ear.modifiers.new('Soft ear edges','BEVEL');mod.width=.018;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    mesh('Ear inner '+str(sd),[(sd*.106,-.704,1.507),(sd*.211,-.657,1.524),(sd*.238,-.613,1.646)],[(0,1,2)],PINK,['head'])
    for k in range(7):
        strand('Ear furnishing',(sd*(.10+.015*k),-.691+.006*k,1.51),(sd*(.12+.015*k),-.68+.008*k,1.57+.009*k),.022,(0,-1,0),['head'],.008)

# Nose has the triangular outline of the reference, rather than a sphere.
nose=mesh('Triangular rose nose',[(-.043,-.914,1.290),(.043,-.914,1.290),(0,-.933,1.254),(0,-.948,1.278),(0,-.899,1.278)],
          [(0,1,3),(1,2,3),(2,0,3),(0,4,1),(1,4,2),(2,4,0)],NOSE,['head'])
activate(nose);mod=nose.modifiers.new('Rounded nose','BEVEL');mod.width=.009;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
for sd in (1,-1):
    tube('Muzzle seam',[(0,-.924,1.253),(sd*.023,-.918,1.242),(sd*.066,-.899,1.248)],[(0,.0017),(1,.001)],PURPLE,['head'],n=16,sides=6)

# The eyes are pointed apertures laid on the sculpted facial surface. The
# eyeliner is a tapered surface ribbon, not a raised pipe or detached eyebrow.
INK_PATHS=[]
EW=.065
def eyelid(u,upper=True):
    t=max(-1,min(1,u/EW));shape=max(0,1-t*t)
    return (.0115*shape**1.10 if upper else -.0190*shape**.85)

def face_surface(sd,x,z,offset=.0010):
    tree=SURFACES['face'];hit=tree.ray_cast(Vector((sd*x,-2,z)),Vector((0,1,0)))
    if hit[0] is not None:
        p=hit[0];n=hit[1]
        if n.y>0:n=-n
        return p+n*offset
    p,n,_,_=tree.find_nearest(Vector((sd*x,-.74,z)))
    return p+n*offset

def eye_point(sd,u,v,depth=0):
    p=face_surface(sd,.105+u,1.368+u*.26+v,.001-depth)
    return p

def ink_ribbon(name,sd,path,widths,mat=PURPLE,offset=.0015,remember=False):
    pts=catmull([(x,0,z) for x,z in path],64);verts=[];faces=[]
    if remember:INK_PATHS.append([(p.x,p.z) for p in pts])
    for i,p in enumerate(pts):
        d=(pts[min(i+1,63)]-pts[max(0,i-1)]).normalized();side=Vector((-d.z,0,d.x))
        width=profile(i/63,widths)
        for s in (-1,0,1):
            q=p+side*width*s*.5;verts.append(face_surface(sd,q.x,q.z,offset))
    for i in range(63):
        for j in range(2):a=i*3+j;faces.append((a,a+3,a+4,a+1))
    return mesh(name+str(sd),verts,faces,mat,['head'])

def build_eyes_and_makeup():
    for sd in (1,-1):
        vs=[eye_point(sd,0,-.003,-.003)];fs=[];N=64;R=8
        for k in range(1,R+1):
            r=k/R
            for j in range(N):
                a=2*math.pi*j/N;u=EW*math.cos(a)
                v=eyelid(u,math.sin(a)>=0)
                vs.append(eye_point(sd,u*r,-.003+(v+.003)*r,-.003*(1-r*r)))
        for j in range(N):fs.append((0,1+j,1+(j+1)%N))
        for k in range(R-1):
            for j in range(N):a=1+k*N+j;b=1+k*N+(j+1)%N;fs.append((a,b,b+N,a+N))
        eye=mesh('Feline eye aperture '+str(sd),vs,fs,EYEWHITE,['head']);EYES.append((eye,sd))
        # An iris within the slit, with a darker outer ring and a narrow pupil.
        for name,rx,rz,mat,offset in [('Iris limbal ring',.023,.023,IRISDEEP,.0040),('Lavender iris',.021,.022,IRIS,.0047),('Vertical pupil',.0026,.020,DARK,.0054)]:
            vs=[];fs=[]
            for k in range(7):
                r=k/6
                for j in range(48):
                    a=j*math.tau/48;u=-.006+rx*r*math.cos(a);v=-.003+rz*r*math.sin(a)
                    v=max(eyelid(u,False)+.0008,min(eyelid(u,True)-.0008,v))
                    vs.append(eye_point(sd,u,v,-offset))
            for k in range(6):
                for j in range(48):a=k*48+j;b=k*48+(j+1)%48;fs.append((a,b,b+48,a+48))
            ob=mesh(name+str(sd),vs,fs,mat,['head']);EYES.append((ob,sd))
        glint=ell('Small eye catchlight '+str(sd),eye_point(sd,-.013,.004,-.0065),(.002,.0015,.0025),GLINT,['head']);EYES.append((glint,sd))
        for upper in (True,False):
            path=[]
            for j in range(33):
                u=-EW+2*EW*j/32;path.append((.105+u,1.368+u*.26+eyelid(u,upper)))
            margin=ink_ribbon('Upper lid margin' if upper else 'Lower lid margin',sd,path,
                              [(0,.0005),(.25,.0038 if upper else .0015),(.75,.0044 if upper else .0018),(1,.001)],PURPLE,.0023,True)
            EYES.append((margin,sd))
        outer_z=1.368+EW*.26
        ink_ribbon('Connected eyeliner wing',sd,[(.105+EW,outer_z),(.182,1.392),(.196,1.408),(.203,1.429)],
                   [(0,.0033),(.35,.0055),(.70,.0030),(1,.0002)],PURPLE,.0019,True)
        ink_ribbon('Lower cheek eyeliner',sd,[(.069,1.331),(.088,1.319),(.116,1.318),(.139,1.332),(.161,1.340),(.189,1.344),(.207,1.363)],
                   [(0,.0003),(.18,.0038),(.48,.0042),(.78,.0032),(1,.0002)],PURPLE,.0019,True)

for sd in (1,-1):
    for k in range(4):
        tube('Whisker',[(sd*.067,-.901,1.265-.011*k),(sd*.22,-.91+.012*k,1.259-.021*k),(sd*(.38+.015*k),-.84+.016*k,1.24-.035*k)],[(0,.0018),(1,.00035)],WHITE,['head'],n=20,sides=5)

# Twin tails: plush tapered volumes with a restrained outward hook.
tail_paths={}
for sd in (1,-1):
    bones=[('tail' if sd==1 else 'tailB')+str(i) for i in range(1,7)]
    path=[(sd*.065,.57,.99),(sd*.10,.69,1.25),(sd*.15,.68,1.56),(sd*.225,.64,1.86),(sd*.32,.73,2.04),(sd*.43,.84,2.04),(sd*.47,.86,1.99)]
    tail_paths[sd]=path
    tail,pts,frames=tube('Plush tail '+str(sd),path,[(0,.077),(.2,.092),(.53,.107),(.78,.116),(.94,.096),(1,.045)],WHITE,bones,n=64,sides=24)
    BASE.append(tail)
    for i in range(4,58,2):
        a,b,tg=frames[i];p=pts[i];r=profile(i/63,[(0,.077),(.2,.092),(.53,.107),(.78,.116),(.94,.096),(1,.045)])
        for j in range(9):
            ang=j*2*math.pi/9+(i%4)*.4;normal=a*math.cos(ang)+b*math.sin(ang)
            length=random.uniform(.09,.145);base=p+normal*(r-.014);tip=base+tg*length+normal*.028
            strand('Tail flowing lock',base,tip,.048,normal,bones,.010)

# Mane locks arranged in layered, directed bands; roots buried in skin.
for row in range(7):
    z=1.36-row*.095;cy=-.59+row*.012
    rx=.255+.025*math.sin(row/6*math.pi);ry=.22+.035*row/6
    for j in range(17):
        a=2*math.pi*j/17+(row%2)*.13
        normal=Vector((math.cos(a),math.sin(a),.1)).normalized()
        z+=random.uniform(-.020,.020)
        base=Vector((rx*math.cos(a),cy+ry*math.sin(a),z))
        length=.20+(.06 if math.sin(a)<0 else .01)+random.uniform(-.02,.02)
        tip=base+Vector((normal.x*.070,normal.y*.065+.020,-length))
        strand('Layered neck ruff',base,tip,.12,normal,['head','neck3','neck2','neck1','chest'],.006)

# Broad cheek fans, swept backward and slightly downward.
for sd in (1,-1):
    for row in range(4):
        for j in range(8):
            z=1.45-.055*row+.009*j+random.uniform(-.014,.014)
            base=(sd*(.173+.007*j),-.71+.022*j,z)
            tip=(sd*(.30+.01*j),-.60+.023*j,z-.10-.025*row)
            strand('Cheek swept lock',base,tip,.077,(sd,-.4,.25),['head'],.005)
    # Forehead hair flows away from the central bridge.
    for j in range(8):
        strand('Forehead crest',(sd*.018,-.764+j*.011,1.48+j*.007),(sd*(.07+.008*j),-.71+j*.014,1.55+j*.004),.035,(0,-.7,1),['head'],.008)

# Coat locks lie close to the back and flanks, leaving the leg anatomy readable.
for i in range(14):
    y=-.35+i*.062
    for j in range(17):
        a=j*2*math.pi/17+(i%2)*.13
        rz=.30 if y<-.05 else (.245 if y<.27 else .28)
        rx=.275 if y<-.05 or y>.27 else .245
        normal=Vector((math.cos(a),0,math.sin(a)))
        base=Vector((rx*math.cos(a),y,.82+rz*math.sin(a)))
        tip=base+Vector((normal.x*.025,.15,-.045 if normal.z<.4 else -.02))
        strand('Body flowing coat',base,tip,.062,normal,['chest','spine2','spine1','pelvis'],.012)
for sd in (1,-1):
    for is_fore in (True,False):
        x=sd*.22;y=-.39 if is_fore else .43
        bones=[('foreLeg' if is_fore else 'hindLeg')+('L' if sd==1 else 'R'),('foreArm' if is_fore else 'hindShin')+('L' if sd==1 else 'R')]
        for row in range(7):
            z=.77-row*.075;r=(.14 if is_fore else .17)*(1-row*.055)
            for j in range(10):
                a=2*math.pi*j/10+(row%2)*.2;normal=Vector((math.cos(a),math.sin(a),0))
                base=Vector((x+r*math.cos(a),y+r*math.sin(a),z))
                tip=base+Vector((normal.x*.012,.035,-.12))
                strand('Leg feathering',base,tip,.050,normal,bones,.010)
    for y,bone in [(-.51,'forePaw'),(.49,'hindFoot')]:
        b=[bone+('L' if sd==1 else 'R')]
        for dx in (-.085,-.028,.028,.085):
            tube('Purple claw',[(sd*(.23+dx),y-.155,.066),(sd*(.23+dx),y-.188,.044),(sd*(.23+dx),y-.195,.019)],[(0,.011),(.5,.008),(1,.0004)],CLAW,b,n=12,sides=8)
        ell('Central paw pad',(sd*.23,y,.016),(.064,.075,.015),PAD,b)
        for dx in (-.085,-.028,.028,.085):ell('Toe pad',(sd*(.23+dx),y-.10,.013),(.027,.032,.011),PAD,b)

# Blend lock roots into the skin, then groom fine strands on the continuous
# surface. This removes separate leaf-like surfaces and exposed root edges.
print('BLEND COAT',flush=True)
head_locks=[o for o in FUR if o['bone_candidates']=='head' and not o.name.startswith('Ear')]
coat_locks=[o for o in FUR if 'tail' not in o['bone_candidates'] and o['bone_candidates']!='head']
body=union('Nekomata continuous coat',[body]+coat_locks,.0065,bodybones+['head'],8)
head=union('Nekomata face and cheek ruff',[head]+head_locks,.0038,['head'],6)
SURFACES['head']=BVHTree.FromPolygons([v.co for v in head.data.vertices],[p.vertices[:] for p in head.data.polygons])
build_eyes_and_makeup()
tail_surfaces=[]
for sd in (1,-1):
    names=[('tail' if sd==1 else 'tailB')+str(i) for i in range(1,7)]
    obs=[o for o in ASSETS if o['bone_candidates']==','.join(names)]
    tail_surfaces.append((union('Nekomata soft tail '+str(sd),obs,.0048,names,7),sd))

def groom(surface,count,kind,sd=1):
    surface.data.calc_loop_triangles()
    tris=list(surface.data.loop_triangles);cum=[];total=0
    for t in tris:total+=t.area;cum.append(total)
    verts=[];faces=[];mw=surface.matrix_world
    tailpts=catmull(tail_paths[sd],80) if kind=='tail' else None
    for i in range(count):
        tri=tris[bisect.bisect_left(cum,random.random()*total)]
        a,b,c=[surface.data.vertices[k] for k in tri.vertices]
        u=math.sqrt(random.random());v=random.random();weights=(1-u,u*(1-v),u*v)
        p=mw@(a.co*weights[0]+b.co*weights[1]+c.co*weights[2])
        n=(a.normal*weights[0]+b.normal*weights[1]+c.normal*weights[2]).normalized()
        if kind=='head':
            # Keep eye openings and muzzle legible; face has very short hair.
            if p.y<-.73 and 1.335<p.z<1.405 and .032<abs(p.x)<.178:continue
            if p.y<-.65 and any((abs(p.x)-x)**2+(p.z-z)**2<.009**2 for path in INK_PATHS for x,z in path[::4]):continue
            flow=Vector((p.x*3,.8,-.45 if p.z<1.45 else .65));length=.070 if abs(p.x)>.19 else .020
            if abs(p.x)<.065 and p.y<-.78 and 1.27<p.z<1.46:length=.005
        elif kind=='tail':
            k=min(range(80),key=lambda j:(tailpts[j]-p).length_squared)
            flow=(tailpts[min(79,k+1)]-tailpts[max(0,k-1)]).normalized();length=.10
        elif p.y<-.25 and p.z>.63:
            flow=Vector((p.x*.5,.15,-1));length=.13
        elif p.z<.90 and abs(p.x)>.14:
            blend=max(0,min(1,(p.z-.50)/.40))
            flow=Vector((0,.12+.88*blend,-1+.8*blend));length=.023 if p.z<.20 else .042
        else:flow=Vector((0,1,-.2));length=.065
        tangent=flow-n*flow.dot(n)
        if tangent.length<.15:tangent=n.orthogonal()
        tangent.normalize();length*=random.uniform(.65,1.25)
        side=n.cross(tangent).normalized();radius=random.uniform(.0007,.0012)
        start=len(verts)
        for k in range(4):
            t=k/3;center=p+tangent*(length*t)+n*(-.0015+.014*math.sin(t*math.pi/2))
            r=radius*(1-t*.95)
            for j in range(3):
                ang=j*math.tau/3;verts.append(center+r*(side*math.cos(ang)+n*math.sin(ang)))
        for k in range(3):
            for j in range(3):
                a0=start+k*3+j;b0=start+k*3+(j+1)%3;faces.append((a0,b0,b0+3,a0+3))
    ob=mesh('Groomed strands '+kind+str(sd),verts,faces,FURMAT,surface['bone_candidates'].split(','),True)
    return ob
groom(body,24000,'body');groom(head,8000,'head')
for ob,sd in tail_surfaces:groom(ob,6000,'tail',sd)

# Consolidate sculpted fur into one editable object; retain per-vertex weights.
cfg_path=os.path.join(os.path.dirname(os.path.abspath(__file__)),'source_build.json')
if not os.path.exists(cfg_path):cfg_path=r'C:\wakaba\wakaba-character-model-factory\hq3d\characters\nekomata\build.json'
cfg=json.load(open(cfg_path,encoding='utf-8'))
sk=cfg['skeleton']
sk['neck1'].update(head=[0,-.46,.92],tail=[0,-.52,1.08])
sk['neck2'].update(head=[0,-.52,1.08],tail=[0,-.58,1.20])
sk['neck3'].update(head=[0,-.58,1.20],tail=[0,-.635,1.32])
sk['head'].update(head=[0,-.635,1.32],tail=[0,-.70,1.49])
sk['jaw'].update(head=[0,-.74,1.25],tail=[0,-.86,1.22])
for sd,path in tail_paths.items():
    pts=catmull(path,7)
    for i in range(6):
        n=('tail' if sd==1 else 'tailB')+str(i+1);sk[n]['head']=list(pts[i]);sk[n]['tail']=list(pts[i+1])

ad=bpy.data.armatures.new('Nekomata skeleton');arm=bpy.data.objects.new('Nekomata rig',ad);bpy.context.collection.objects.link(arm)
activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for name,d in sk.items():
    eb=ad.edit_bones.new(name);eb.head=Vector(d['head'])*SCALE;eb.tail=Vector(d['tail'])*SCALE
for name,d in sk.items():
    if d.get('parent'):ad.edit_bones[name].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')

def distance(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/max(ab.length_squared,1e-9)))
    return (p-a-t*ab).length
segments={n:(Vector(d['head']),Vector(d['tail'])) for n,d in sk.items()}
def bind(o):
    bones=o['bone_candidates'].split(',');groups={n:o.vertex_groups.new(name=n) for n in bones}
    for v in o.data.vertices:
        p=o.matrix_world@v.co
        if len(bones)==1:ws=[(bones[0],1)]
        else:
            candidates=[]
            for n in bones:
                if n.endswith('L') and p.x<-.04:continue
                if n.endswith('R') and p.x>.04:continue
                d=distance(p,*segments[n]);candidates.append((d,n))
            candidates.sort();near=candidates[:3]
            vals=[math.exp(-(d-near[0][0])*28) for d,n in near];total=sum(vals)
            ws=[(n,w/total) for (d,n),w in zip(near,vals)]
        for n,w in ws:groups[n].add([v.index],w,'REPLACE')
    world=o.matrix_world.copy()
    for v in o.data.vertices:v.co=(world@v.co)*SCALE
    o.matrix_world=Matrix.Identity(4)
    o.parent=arm;mod=o.modifiers.new('Nekomata skin','ARMATURE');mod.object=arm

print('BIND',len(ASSETS),flush=True)
for o in ASSETS:
    o.data.validate(clean_customdata=True);o.data.update();bind(o)

# Eye morphs are intentionally confined to the eyes, so their cost stays small.
expression_names=['calm','gentle_smile','thinking','serious','quiet_sorrow','guarding_eyes','awkward','happy','angry','sad','surprised','relaxed']
for o,sd in EYES:
    o.shape_key_add(name='Basis')
    amounts={'calm':.12,'gentle_smile':.32,'thinking':.24,'serious':.35,'quiet_sorrow':.44,'guarding_eyes':.48,'awkward':.18,'happy':.4,'angry':.5,'sad':.5,'surprised':-.18,'relaxed':.24}
    for name,amount in [('blink',1),*[(n,amounts[n]) for n in expression_names]]:
        key=o.shape_key_add(name=name)
        for v in key.data:
            u=v.co.x/SCALE*sd-.105;mid=(1.368+u*.26)*SCALE
            v.co.z=mid+(v.co.z-mid)*(1-.98*amount)
        key.value=0

def join_group(obs,name):
    if not obs:return
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs:o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();bpy.context.object.name=name
details=[o for o in ASSETS if o not in BASE and o not in FUR and o not in [e[0] for e in EYES]]
join_group(FUR,'Nekomata sculpted fur locks')
join_group(details,'Nekomata face ears paws and details')

# Gentle idle animation, retaining the engine's expected bone and action names.
arm.animation_data_create();act=bpy.data.actions.new('idle');arm.animation_data.action=act
for f in range(0,121,8):
    ph=f/120*math.tau
    for n,amp,shift in [('tail2',1.8,0),('tailB2',1.8,1.6),('tail4',2.2,.4),('tailB4',2.2,2),('neck2',.35,0)]:
        pb=arm.pose.bones[n];pb.rotation_mode='XYZ';pb.rotation_euler=(0,math.radians(amp)*math.sin(ph+shift),0);pb.keyframe_insert('rotation_euler',frame=f)
sc=bpy.context.scene;sc.frame_start=0;sc.frame_end=120;sc.render.fps=30;sc.frame_set(0)

# Neutral export pose. Save idle as an NLA track; it is available to the engine.
track=arm.animation_data.nla_tracks.new();track.name='idle';track.strips.new('idle',0,act);arm.animation_data.action=None;track.mute=True
for pb in arm.pose.bones:pb.rotation_euler=(0,0,0)
bpy.context.view_layer.update()
model_objs=[o for o in sc.objects if o.type in ('MESH','ARMATURE')]
bpy.ops.object.select_all(action='DESELECT')
for o in model_objs:o.select_set(True)
bpy.context.view_layer.objects.active=arm
print('EXPORT',flush=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'nekomata_sculpt.glb'),export_format='GLB',use_selection=True,
    export_animations=True,export_morph=True,export_skins=True,export_morph_normal=False,export_yup=True)

# Presentation scene: soft studio lighting, same orthographic scale for views.
world=bpy.data.worlds.new('Soft lilac studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.20,.18,.24,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;sc.world=world
def area(name,loc,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    o=bpy.data.objects.new(name,data);sc.collection.objects.link(o);o.location=Vector(loc)*SCALE
    o.rotation_euler=(Vector((0,0,.9))*SCALE-o.location).to_track_quat('-Z','Y').to_euler()
area('Key',(-3,-4,5),16000,7,(1,.92,.87));area('Fill',(3,-2,2.5),9000,7,(.79,.83,1));area('Rim',(1,3,4),15000,6,(.92,.87,1))
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(material('Studio grey',(.115,.105,.14)))
camd=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',camd);sc.collection.objects.link(cam);sc.camera=cam
camd.type='ORTHO';camd.ortho_scale=2.34*SCALE;camd.clip_end=1000
sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True
sc.render.resolution_x=1000;sc.render.resolution_y=1000;sc.render.resolution_percentage=100
sc.view_settings.view_transform='AgX'
sc.render.image_settings.file_format='PNG'
def render(name,loc,target,scale=2.34):
    cam.location=Vector(loc)*SCALE;cam.rotation_euler=(Vector(target)*SCALE-cam.location).to_track_quat('-Z','Y').to_euler();camd.ortho_scale=scale*SCALE
    sc.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
render('front',(0,-7,1.08),(0,0,1.08))
render('side',(7,0,1.08),(0,0,1.08))
render('three_quarter',(4,-6,2.30),(0,0,1.11),2.80)
render('face',(1.8,-5,1.8),(0,-.65,1.36),.94)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'nekomata_sculpt.blend'))
stats={'vertices':sum(len(o.data.vertices) for o in model_objs if o.name in bpy.data.objects and o.type=='MESH'),'bones':len(ad.bones),'glb_bytes':os.path.getsize(os.path.join(OUT,'nekomata_sculpt.glb')),'scale':SCALE,'note':'Sculpt study, facial expressions provisional; not yet Cast Engine validated.'}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
print('DONE',json.dumps(stats),flush=True)
