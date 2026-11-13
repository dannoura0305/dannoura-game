import bpy,sys,os,math,json,random
import numpy as np
from mathutils import Vector,Matrix,Quaternion
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);SK={}
NAVY=mat('Faded navy work coveralls',(.115,.135,.165),.93,True,.28)
SEAM=mat('Worn indigo seams',(.19,.19,.19),.92,True,.12)
SKIN=mat('Grey sinewed forearms',(.39,.37,.33),.83,True,.14)
BOOT=mat('Distressed brown safety boots',(.16,.14,.115),.86,True,.21)
RUBBER=mat('Dark rubber and pipe interior',(.045,.042,.038),.86)
STEEL=mat('Oxidised tool steel',(.28,.27,.24),.52)
BRASS=mat('Tarnished brass gauge rim',(.26,.20,.12),.48)
RUST=mat('Old red valve wheel',(.19,.085,.048),.80,True,.25)
PAPER=mat('Aged ivory dial and inspection paper',(.64,.59,.47),.92,True,.08)
INK=mat('Faded markings',(.095,.077,.057),.92)
RED=mat('High pressure red markings',(.32,.095,.043),.82)
LIGHT=mat('Warm worklamp emission',(.95,.71,.32),.32)
pp=LIGHT.node_tree.nodes['Principled BSDF'];pp.inputs['Emission Color'].default_value=(1,.63,.23,1);pp.inputs['Emission Strength'].default_value=3
for ma in [NAVY,BOOT]:surface_normal(ma,'cloth',.28)
surface_normal(SKIN,'skin',.33)

def weather(ma,metal=.75):
    size=1024;rng=np.random.default_rng(81);y,x=np.mgrid[:size,:size]/size
    value=.92+.09*np.sin(x*math.tau*300)+.08*rng.random((size,size))
    rust=np.zeros((size,size))
    for _ in range(150):
        cx,cy=rng.random(2);rx,ry=rng.uniform(.001,.012,2)
        d=((x-cx)/rx)**2+((y-cy)/ry)**2;rust=np.maximum(rust,np.exp(-d*2)*rng.uniform(.3,1))
    base=np.array(ma.diffuse_color[:3]);a=np.ones((size,size,4),np.float32)
    a[:,:,:3]=base[None,None,:]*value[:,:,None]*(1-rust[:,:,None])+np.array([.18,.085,.025])[None,None,:]*rust[:,:,None]
    im=bpy.data.images.new(ma.name+' worn finish',size,size,alpha=True);im.pixels.foreach_set(a.ravel());im.pack()
    t=ma.node_tree.nodes.new('ShaderNodeTexImage');t.image=im;ma.node_tree.links.new(t.outputs['Color'],ma.node_tree.nodes['Principled BSDF'].inputs['Base Color']);ma.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=metal
weather(STEEL);weather(BRASS,.68)

def bone(n,h,t,p=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':p}
def box(name,c,scale,ma,bones,bevel=.006):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
    if bevel:
        m=o.modifiers.new('Soft worn edges','BEVEL');m.width=bevel;m.segments=3;activate(o);bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name)
    o['bones']=','.join(bones);ASSETS.append(o);return o
def ring(name,c,axis,r,wire,ma,bones):
    c=Vector(c);axis=Vector(axis).normalized();u=axis.orthogonal().normalized();v=axis.cross(u)
    return line(name,[c+r*(u*math.cos(math.tau*j/80)+v*math.sin(math.tau*j/80)) for j in range(81)],wire,ma,bones)
def cyl(name,c,axis,r,depth,ma,bones):
    c=Vector(c);a=Vector(axis).normalized()*depth/2
    ob=tube(name,[c-a,c+a],[(0,r),(1,r)],ma,bones,n=3,sides=64)
    u=a.normalized().orthogonal().normalized();v=a.normalized().cross(u);layer=ob.data.uv_layers.active
    for poly in list(ob.data.polygons)[-2:]:
        poly.use_smooth=False
        for li in poly.loop_indices:
            p=ob.data.vertices[ob.data.loops[li].vertex_index].co-c;layer.data[li].uv=(.5+p.dot(u)/(2*r),.5+p.dot(v)/(2*r))
    return ob
def polygon(name,points,y,depth,ma,bones):
    vs=[(x,y+d,z) for d in [-depth/2,depth/2] for x,z in points];n=len(points);fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    fs +=[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    o=mesh(name,vs,fs,ma,bones,[(x*3,z*3) for x,yy,z in vs]);activate(o);m=o.modifiers.new('Forged edge bevel','BEVEL');m.width=.006;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name)
    for p in o.data.polygons:p.use_smooth=False
    m=o.modifiers.new('Forging normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name);return o

# Anatomical frame: broad back, forward-set gauge, long asymmetrical working arms.
bone('root',(0,0,0),(0,0,.15));bone('pelvis',(0,.035,1.02),(0,.03,1.22),'root')
bone('spine',(0,.03,1.22),(0,.035,1.56),'pelvis');bone('chest',(0,.035,1.56),(0,-.015,1.99),'spine')
bone('head',(0,-.07,2.02),(0,-.24,2.24),'chest')
bone('needle',(0,-.358,2.125),(0,-.458,2.125),'head')
bone('valve',(0,.32,1.32),(0,.47,1.32),'spine')
bone('lamp',(0,-.03,2.32),(0,-.24,2.52),'head')

def torso(t,a):
    rx=prof(t,[(0,.265),(.2,.28),(.32,.235),(.52,.28),(.80,.375),(1,.20)])
    ry=prof(t,[(0,.18),(.3,.165),(.65,.21),(1,.205)])
    fold=.009*math.sin(11*a+8*t)+.006*math.sin(19*a-10*t)
    fold+=.013*math.sin(45*t+3*math.sin(a))*math.exp(-((t-.32)/.2)**2)
    z=1.04+t*1.10-.13*max(0,math.cos(a))*(t**5)
    return Vector(((rx+fold)*math.sin(a),.035-(ry+fold)*math.cos(a),z))
vs=[];fs=[];uv=[];N=88;R=82
for i in range(R+1):
    for j in range(N):vs.append(torso(i/R,math.tau*j/N));uv.append((j/N*2,i/R*2))
for i in range(R):
    for j in range(N):q=i*N+j;q2=i*N+(j+1)%N;fs.append((q,q2,q2+N,q+N))
fs.extend([tuple(reversed(range(N))),tuple(R*N+j for j in range(N))])
mesh('Wrinkled one piece work coveralls torso',vs,fs,NAVY,['pelvis','spine','chest'],uv)
# Center placket, waist band, reinforced shoulder seams, pocket flaps.
line('Coverall centre seam',[(0,-.151,1.12),(0,-.148,1.39),(0,-.186,1.63),(0,-.198,1.89)],.005,SEAM,['pelvis','spine','chest'])
for z in [1.45,1.58,1.72,1.84]:cyl('Coverall brass button',(0,-.199 if z>1.6 else -.171,z),(0,1,0),.008,.008,BRASS,['spine' if z<1.6 else 'chest'])
for s in [-1,1]:
    polygon('Folded coverall lapel',[(s*.025,1.72),(s*.19,1.91),(s*.17,2.03),(s*.04,1.97)],-.209,.012,NAVY,['chest'])
    line('Lapel welt',[(s*.025,-.22,1.72),(s*.19,-.22,1.91),(s*.17,-.22,2.03)],.0035,SEAM,['chest'])
    p=box('Chest patch pocket',(s*.18,-.183,1.70),(.165,.022,.175),NAVY,['chest']);p.rotation_euler[2]=s*.11
    polygon('Pocket flap',[(s*.10,1.775),(s*.26,1.775),(s*.26,1.735),(s*.18,1.714),(s*.10,1.735)],-.211,.009,NAVY,['chest'])
    line('Pocket stitching',[(s*.10,-.211,1.71),(s*.10,-.211,1.62),(s*.26,-.211,1.62),(s*.26,-.211,1.71)],.0015,SEAM,['chest'])
    cyl('Pocket snap',(s*.18,-.221,1.742),(0,1,0),.007,.004,BRASS,['chest'])
    line('Shoulder sewn panel',[(s*.12,.07,2.003),(s*.26,.05,1.98),(s*.35,-.04,1.925)],.0035,SEAM,['chest'])
    box('Rear trouser pocket',(s*.15,.195,1.08),(.18,.015,.17),NAVY,['pelvis'])
box('Blank identification patch',(.18,-.227,1.745),(.125,.009,.052),PAPER,['chest'],.003)
for t in [.31,.35]:line('Waist band welt',[torso(t,math.tau*j/100)*Vector((1.025,1.025,1)) for j in range(101)],.007,SEAM,['pelvis','spine'])
box('Metal belt buckle',(0,-.166,1.365),(.067,.016,.042),STEEL,['spine']);box('Buckle centre',(0,-.177,1.365),(.045,.006,.023),NAVY,['spine'],.002)
for a in [-2.5,-1.1,-.6,.6,1.1,2.5]:
    p=torso(.33,a);line('Belt fabric loop',[p+Vector((0,0,-.04)),p+Vector((0,0,.04))],.011,NAVY,['pelvis','spine'])

# Head: a thick round pressure gauge with a recessed cream dial, scale and needle.
cyl('Heavy circular gauge housing',(0,-.202,2.125),(0,1,0),.255,.20,STEEL,['head'])
for y,r in [(-.108,.261),(-.28,.263),(-.313,.256)]:ring('Rolled gauge housing rim',(0,y,2.125),(0,1,0),r,.014,STEEL,['head'])
cyl('Recessed gauge dial',(0,-.307,2.125),(0,1,0),.235,.010,PAPER,['head'])
ring('Brass dial inner bezel',(0,-.323,2.125),(0,1,0),.238,.009,BRASS,['head'])
for j in range(56):
    a=math.radians(-132+j*264/55);r=.218;length=.026 if j%5==0 else .014
    def gp(rad):return Vector((math.sin(a)*rad,-.329,2.125+math.cos(a)*rad))
    line('Pressure scale tick',[gp(r-length),gp(r)],.0017 if j%5==0 else .0009,RED if j>46 else INK,['head'])
for j in range(12):
    a=math.tau*j/12;x=.25*math.sin(a);z=2.125+.25*math.cos(a)
    cyl('Gauge rim screw',(x,-.331,z),(0,1,0),.007,.005,BRASS,['head']);line('Screw slot',[(x-.003,-.335,z),(x+.003,-.335,z)],.0007,INK,['head'])
# Needle pivot shares the dial normal, letting the pointer rotate about the gauge face.
polygon('Black pointed gauge needle',[(-.012,2.114),(.138,2.237),(.027,2.128),(-.045,2.075)],-.344,.004,INK,['needle'])
cyl('Gauge centre pin',(0,-.352,2.125),(0,1,0),.016,.012,BRASS,['head'])
# Very restrained typographic marking, converted to mesh for portable glTF.
def textmesh(body,loc,size):
    cu=bpy.data.curves.new('Gauge printed marking','FONT');cu.body=body;cu.size=size;cu.align_x='CENTER';cu.extrude=0
    o=bpy.data.objects.new('Dial '+body,cu);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);cu.materials.append(INK);activate(o);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o['bones']='head';ASSETS.append(o)
textmesh('PRESSURE',(0,-.332,2.04),.016);textmesh('MPa',(0,-.332,2.015),.014)
for j in range(6):
    a=math.radians(-125+j*50);textmesh(str(j*2),(math.sin(a)*.177,-.332,2.117+math.cos(a)*.177),.020)

# Arched worklamp support and downward-facing old industrial shade.
line('Bent lamp mounting arm',[(0,-.035,2.33),(0,-.03,2.49),(0,-.075,2.535),(0,-.22,2.535),(0,-.29,2.49)],.018,STEEL,['lamp'])
box('Lamp support bracket',(0,-.045,2.36),(.075,.068,.078),STEEL,['head'])
cx=0;cy=-.29
tube('Bell shaped lamp shade',[(cx,cy,2.495),(cx,cy,2.47),(cx,cy,2.42),(cx,cy,2.397)],[(0,.032),(.25,.048),(.75,.095),(1,.115)],BRASS,['lamp'],n=32,sides=64,cap=False)
ring('Lamp rolled rim',(cx,cy,2.397),(0,0,1),.115,.008,STEEL,['lamp'])
ell('Warm glowing worklamp lens',(cx,cy,2.395),(.103,.103,.026),LIGHT,['lamp'])
for sign in [-1,1]:cyl('Lamp hinge screw',(sign*.05,cy,2.466),(1,0,0),.009,.01,STEEL,['lamp'])

# Back plumbing: three hollow gooseneck pipes, bolted unions and handwheel.
pipepaths=[]
for j,(x,z) in enumerate([(-.20,2.31),(0,2.23),(.20,2.13)]):
    path=[(x,.24,1.34),(x,.275,1.63),(x,.30,z-.15),(x,.34,z),(x,.45,z+.045),(x,.57,z+.045)]
    pipepaths.append(path);tube('Exhaust riser '+str(j),path,[(0,.064),(1,.064)],STEEL,['chest'],n=60,sides=32,cap=False)
    # A dark inner wall rather than a flat black cap.
    tube('Hollow exhaust bore '+str(j),[(x,.48,z+.045),(x,.575,z+.045)],[(0,.048),(1,.048)],RUBBER,['chest'],n=8,sides=32,cap=False)
    ring('Pipe mouth rolled rim',(x,.575,z+.045),(0,1,0),.056,.008,STEEL,['chest'])
    for zz in [1.62,z-.15]:
        cyl('Pipe union collar',(x,.29,zz),(0,0,1),.080,.045,BRASS,['chest'])
        for a in range(6):
            an=math.tau*a/6;cyl('Union bolt',(x+.068*math.cos(an),.29+.068*math.sin(an),zz+.026),(0,0,1),.009,.014,STEEL,['chest'])
line('Lower plumbing manifold',[(-.20,.25,1.39),(-.20,.32,1.32),(0,.34,1.31),(.2,.31,1.32),(.2,.25,1.40)],.075,STEEL,['spine'])
cyl('Valve spindle',(0,.40,1.32),(0,1,0),.026,.17,STEEL,['valve'])
ring('Red valve wheel',(0,.50,1.32),(0,1,0),.116,.015,RUST,['valve'])
cyl('Valve wheel hub',(0,.50,1.32),(0,1,0),.028,.036,STEEL,['valve'])
for j in range(5):
    a=math.tau*j/5;line('Handwheel spoke',[(0,.50,1.32),(.11*math.sin(a),.50,1.32+.11*math.cos(a))],.009,RUST,['valve'])

# Sleeves and forearms; anatomical right side is viewer-left.
for sign,s in [(-1,'R'),(1,'L')]:
    h=Vector((sign*.345,.012,1.90));e=Vector((sign*.48,-.035,1.56));w=Vector((sign*.57,-.13,1.10))
    bone('upperArm'+s,h,e,'chest');bone('foreArm'+s,e,w,'upperArm'+s);bone('hand'+s,w,w+Vector((sign*.015,-.025,-.17)),'foreArm'+s)
    tube('Gathered coverall sleeve '+s,[h-Vector((sign*.09,0,-.025)),h.lerp(e,.35)+Vector((sign*.015,.015,0)),e,e.lerp(w,.24)],[(0,.13),(.32,.145),(.6,.125),(.88,.108),(1,.113)],NAVY,['upperArm'+s,'foreArm'+s],n=66,sides=40,fold=.015,cap=True)
    end=e.lerp(w,.23);axis=(w-e).normalized();ring('Rolled sleeve cuff '+s,end,axis,.111,.012,SEAM,['foreArm'+s]);ring('Sleeve cuff second fold '+s,end-axis*.035,axis,.114,.008,NAVY,['foreArm'+s])
    tube('Sinewed exposed forearm '+s,[e,e.lerp(w,.4),w],[(0,.076),(.25,.083),(.65,.058),(1,.040)],SKIN,['foreArm'+s],n=64,sides=36,fold=.005)
    for j in range(4):
        offset=(j-1.5)*.022
        line('Forearm tendons '+s,[(e.x+offset,-.107,e.z-.08),(e.lerp(w,.45).x+offset,-.122,1.36),(w.x+offset*.55,-.168,1.13)],.0045,SKIN,['foreArm'+s])
    if s=='R':
        # Forged open-jawed adjustable wrench, integrated at the end of the arm.
        x=w.x
        polygon('Long forged wrench shank',[(x-.035,1.34),(x+.035,1.34),(x+.027,1.035),(x+.085,.98),(x+.075,.89),(x-.07,.89),(x-.085,.98),(x-.025,1.035)],-.142,.045,STEEL,['handR'])
        polygon('Wrench fixed jaw and open throat',[(x-.08,.99),(x+.07,.99),(x+.12,.91),(x+.105,.78),(x+.055,.73),(x+.043,.86),(x-.025,.86),(x-.07,.74),(x-.12,.79),(x-.12,.91)],-.142,.058,STEEL,['handR'])
        box('Wrench worm recess',(x,-.179,.955),(.079,.008,.052),RUBBER,['handR'],.005)
        for k in range(7):cyl('Adjustable wrench worm tooth',(x-.032+k*.010,-.184,.955),(1,0,0),.023,.005,STEEL,['handR'])
        line('Recessed wrench shaft channel',[(x,-.168,1.29),(x-.003,-.168,1.05)],.006,BRASS,['handR'])
    else:
        # Palm and individually articulated long fingers, below a strapped clipboard.
        parts=[ell('Left palm',(w.x,-.145,.998),(.067,.038,.10),SKIN,['handL']),ell('Left wrist',w,(.045,.041,.05),SKIN,['handL'])];fb=[]
        for j,(off,length) in enumerate([(-.05,.125),(-.017,.157),(.018,.15),(.048,.12)]):
            p0=Vector((w.x+off,-.148,.947));p1=p0+Vector((off*.12,-.018,-length*.5));p2=p0+Vector((off*.18,-.05,-length));bn='finger'+str(j)+'L';bone(bn,p0,p2,'handL');fb.append(bn)
            parts.append(tube('Long left finger '+str(j),[p0,p1,p2],[(0,.019),(.5,.016),(1,.010)],SKIN,['handL',bn],n=28,sides=18));parts.append(ell('Left fingertip',p2,(.011,.013,.014),SKIN,[bn]))
            ell('Finger nail',p2+Vector((0,-.010,.012)),(.009,.003,.017),PAPER,[bn])
        p0=Vector((w.x-.058,-.15,1.027));p1=p0+Vector((-.048,-.015,-.05));p2=p1+Vector((-.005,-.03,-.07));bone('thumbL',p0,p2,'handL');fb.append('thumbL');parts.append(tube('Left opposing thumb',[p0,p1,p2],[(0,.027),(.5,.021),(1,.012)],SKIN,['handL','thumbL'],n=30,sides=20));parts.append(ell('Thumb tip',p2,(.013,.015,.016),SKIN,['thumbL']))
        union('Continuous left hand',parts,['handL']+fb)
        # Clipboard sits on the forearm, with a blank table and metal spring clip.
        bone('clipboard',(w.x,-.217,1.07),(w.x,-.217,1.37),'foreArmL')
        cb=box('Metal inspection clipboard',(w.x,-.213,1.23),(.205,.026,.32),STEEL,['clipboard'],.010)
        box('Blank inspection sheet',(w.x,-.231,1.225),(.176,.005,.281),PAPER,['clipboard'],.002)
        for z in [1.10+i*.027 for i in range(9)]:line('Inspection form row',[(w.x-.078,-.235,z),(w.x+.078,-.235,z)],.00065,INK,['clipboard'])
        for dx in [-.078,-.047,.033,.078]:line('Inspection form column',[(w.x+dx,-.235,1.10),(w.x+dx,-.235,1.338)],.00065,INK,['clipboard'])
        box('Clipboard spring clip',(w.x,-.241,1.377),(.098,.022,.027),BRASS,['clipboard'],.004)
        for dx in [-.04,.04]:cyl('Clip rivet',(w.x+dx,-.255,1.377),(0,1,0),.007,.005,STEEL,['clipboard'])

# Sturdy bowed trouser legs and laced safety boots.
for sign,s in [(-1,'R'),(1,'L')]:
    h=Vector((sign*.15,.03,1.13));k=Vector((sign*.205,-.018,.65));a=Vector((sign*.22,.045,.17))
    bone('thigh'+s,h,k,'pelvis');bone('shin'+s,k,a,'thigh'+s);bone('foot'+s,a,a+Vector((0,-.19,-.08)),'shin'+s)
    tube('Baggy work trouser leg '+s,[h+Vector((0,0,.08)),h.lerp(k,.45)+Vector((sign*.02,0,0)),k,a+Vector((0,0,.015))],[(0,.135),(.3,.158),(.6,.13),(.83,.12),(1,.098)],NAVY,['thigh'+s,'shin'+s],n=86,sides=44,fold=.012)
    line('Outer trouser stitched seam '+s,[(h.x+sign*.154,.035,1.1),(k.x+sign*.135,.015,.65),(a.x+sign*.103,.045,.22)],.0025,SEAM,['thigh'+s,'shin'+s])
    for z in [.25,.275]:ring('Trouser hem '+s,(a.x,.045,z),(0,0,1),.107,.004,SEAM,['shin'+s])
    sole=box('Rubber safety boot sole',(a.x,-.05,.035),(.233,.385,.065),RUBBER,['foot'+s],.027)
    ell('Rounded safety boot toe',(a.x,-.117,.092),(.114,.198,.084),BOOT,['foot'+s])
    tube('Boot upper ankle',[(a.x,.027,.065),(a.x,.03,.26)],[(0,.105),(.5,.11),(1,.081)],BOOT,['foot'+s],n=28,sides=32)
    for j in range(5):
        y=-.19+j*.039;z=.142+j*.012
        for sign2 in [-1,1]:cyl('Lace eyelet',(a.x+sign2*.05,y,z),(0,0,1),.006,.005,BRASS,['foot'+s])
        line('Crossed boot lace',[(a.x-.05,y,z),(a.x+.05,y+.031,z+.012)],.0028,SEAM,['foot'+s]);line('Crossed boot lace',[(a.x+.05,y,z),(a.x-.05,y+.031,z+.012)],.0028,SEAM,['foot'+s])
    line('Toe cap stitching',[(a.x-.10,-.165,.12),(a.x,-.205,.168),(a.x+.10,-.165,.12)],.002,SEAM,['foot'+s])
    for j in range(6):
        for sx in [-1,1]:box('Boot tread block',(a.x+sx*.106,-.195+j*.059,.025),(.021,.034,.04),RUBBER,['foot'+s],.003)

# Refined neutral silhouette: a rounded upper back and forward-set compact gauge.
head_origin=Vector((0,-.20,2.125));head_destination=Vector((0,-.29,2.105))
head_rotation=Matrix.Rotation(math.radians(12),3,'X')
def bodybend(p):
    p=p.copy();t=max(0,min(1.15,(p.z-1.30)/.84));p.y-=.15*t*t;return p
def headbend(p):return head_destination+head_rotation@((p-head_origin)*.86)
for ob in ASSETS:
    names=ob['bones'].split(',');transform=headbend if all(n in ['head','needle','lamp'] for n in names) else bodybend
    ma=ob.matrix_world.copy()
    for v in ob.data.vertices:v.co=transform(ma@v.co)
    ob.matrix_world=Matrix.Identity(4)
for n,data in SK.items():
    transform=headbend if n in ['head','needle','lamp'] else bodybend
    data['head']=transform(data['head']);data['tail']=transform(data['tail'])

# A single cloth shell removes intersecting sleeve and trouser root rims.
cloth_parts=[ob for ob in ASSETS if ob.name.startswith(('Wrinkled one piece work coveralls torso','Gathered coverall sleeve','Baggy work trouser leg'))]
from mathutils.kdtree import KDTree
def segment_distance(p,a,b):
    d=b-a;t=max(0,min(1,(p-a).dot(d)/d.length_squared));return (p-a-t*d).length
CLOTH_SOURCE=[];source_positions=[]
for ob in cloth_parts:
    names=ob['bones'].split(',')
    for v in ob.data.vertices:
        p=v.co.copy();near=sorted((segment_distance(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:2]
        values=[math.exp(-(d-near[0][0])*45) for d,n in near];total=sum(values)
        CLOTH_SOURCE.append({n:value/total for (d,n),value in zip(near,values)});source_positions.append(p)
CLOTH_KD=KDTree(len(source_positions))
for i,p in enumerate(source_positions):CLOTH_KD.insert(p,i)
CLOTH_KD.balance()
cloth=union('Continuous stitched work coveralls',cloth_parts,['pelvis','spine','chest','upperArmR','foreArmR','upperArmL','foreArmL','thighR','shinR','thighL','shinL'])
activate(cloth);reduction=cloth.modifiers.new('Cloth surface reduction','DECIMATE');reduction.ratio=.30;bpy.ops.object.modifier_apply(modifier=reduction.name)

exec(open(os.path.join(os.path.dirname(__file__),'rigging.py'),encoding='utf-8').read())
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','patrol','restart','steam_brace']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,4):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        a=math.sin(math.pi*f/120)**2;wave=math.sin(math.tau*f/120)
        def rotate(n,axis,deg):arm.pose.bones[n].rotation_quaternion=Quaternion(Vector(axis),math.radians(deg))
        targets={s:SK['hand'+s]['head'].copy() for s in ['R','L']};dirs={s:SK['hand'+s]['tail']-SK['hand'+s]['head'] for s in ['R','L']}
        if name=='idle':rotate('chest',(1,0,0),.6*wave);rotate('head',(0,0,1),1.4*wave);rotate('needle',(0,1,0),4*wave)
        if name=='patrol':
            for s,sign in [('R',1),('L',-1)]:
                phase=math.tau*f/60+(0 if s=='R' else math.pi);target=SK['foot'+s]['head']+Vector((0,.16*math.sin(phase)*a,.06*max(0,math.sin(phase))*a))
                pole=SK['shin'+s]['head']-SK['thigh'+s]['head'];ik('thigh'+s,'shin'+s,'foot'+s,target,pole,SK['foot'+s]['tail']-SK['foot'+s]['head'])
                targets[s]+=Vector((0,-sign*.09*wave*a,0))
            rotate('head',(0,0,1),-5*wave*a);rotate('needle',(0,1,0),3*wave)
        if name=='restart':
            rotate('chest',(1,0,0),17*a);rotate('head',(1,0,0),9*a);rotate('needle',(0,1,0),-65*a)
            targets['R']=targets['R'].lerp(Vector((-.49,-.60,1.03)),a);dirs['R']=dirs['R'].lerp(Vector((0,-.12,-.12)),a)
            targets['L']=targets['L'].lerp(Vector((.39,-.33,1.31)),a)
        if name=='steam_brace':
            off=Vector((0,.035*a,-.12*a));setworld('pelvis',SK['pelvis']['head']+off,SK['pelvis']['tail']+off)
            rotate('chest',(1,0,0),10*a);rotate('head',(0,0,1),8*a);rotate('needle',(0,1,0),-95*a);rotate('valve',(0,1,0),60*a)
            for s,sign in [('R',-1),('L',1)]:
                target=SK['foot'+s]['head']+Vector((sign*.15*a,0,0));pole=(SK['shin'+s]['head']-SK['thigh'+s]['head']).lerp(Vector((0,-1,0)),a)
                ik('thigh'+s,'shin'+s,'foot'+s,target,pole,SK['foot'+s]['tail']-SK['foot'+s]['head'])
                targets[s]=targets[s].lerp(Vector((sign*.75,-.10,1.30)),a)
        bpy.context.view_layer.update()
        for s in ['R','L']:
            # Natural elbow pole is preserved at the neutral endpoint.
            pole=SK['foreArm'+s]['head']-SK['upperArm'+s]['head'];ik('upperArm'+s,'foreArm'+s,'hand'+s,targets[s],pole,dirs[s])
        # The integrated wrench follows the forearm while preserving its rest angle.
        fore=arm.pose.bones['foreArmR'];hand=arm.pose.bones['handR']
        rest_dir=SK['handR']['head']-SK['foreArmR']['head']
        wrist_dir=rest_dir.rotation_difference(fore.tail-fore.head)@(SK['handR']['tail']-SK['handR']['head'])
        setworld('handR',hand.head.copy(),hand.head.copy()+wrist_dir)
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
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'tochoku.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
verts=[v.co for o in models if o.type=='MESH' for v in o.data.vertices]
stats={'bones':len(ad.bones),'vertices':len(verts),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'tochoku.glb')),'height_m':max(p.z for p in verts)-min(p.z for p in verts),'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2);studio.setup();studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'tochoku.blend'))
if '--skip-stills' not in sys.argv:
    for k in ['front','side','back','three_quarter','face','wrench','pipes']:studio.render(os.path.join(OUT,k+'.png'),k)
print('DONE',stats,flush=True)
