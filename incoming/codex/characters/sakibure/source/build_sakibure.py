"""Boundary Harbinger: four-legged layered rock boss with an open annular core."""
import bpy,os,sys,math,json,random
from mathutils import Vector,Matrix,Quaternion
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(91);SK={};LEGS={};CLAWS={}
BASE=mat('Deep violet understructure',(.145,.120,.170),.92,True,.08)
SHELL=mat('Layered purple black rock',(.220,.175,.255),.85,True,.07)
SHELL2=mat('Raised purple rock folds',(.270,.210,.305),.84,True,.06)
EDGE=mat('Weathered violet edges',(.31,.245,.35),.82,True,.06)
RING=mat('Fractured core stone',(.320,.235,.300),.74,True,.08)
DARK=mat('Deep cavity',(.004,.0025,.006),1)
LIGHT=mat('Rose boundary fissure',(.62,.075,.285),.38)
p=LIGHT.node_tree.nodes['Principled BSDF'];p.inputs['Emission Color'].default_value=(1,.06,.34,1);p.inputs['Emission Strength'].default_value=2.4
for ma in [BASE,SHELL,SHELL2,EDGE,RING]:surface_normal(ma,'skin',.18)

def bone(n,h,t,parent=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':parent}
def profile(t,pairs):
    if t<=pairs[0][0]:return pairs[0][1]
    for (a,x),(b,y) in zip(pairs,pairs[1:]):
        if t<=b:u=(t-a)/(b-a);return x+(y-x)*u
    return pairs[-1][1]
def leaf(name,path,widths,normal,bones,ma=SHELL,ridge=.15,ground=False,edge=False):
    pts=cat(path,42);vs=[];fs=[];uv=[];n=17;normal=Vector(normal).normalized()
    for i,c in enumerate(pts):
        t=i/41;d=(pts[min(i+1,41)]-pts[max(i-1,0)]).normalized();no=normal-d*normal.dot(d)
        if no.length<.01:no=d.orthogonal()
        no.normalize();across=no.cross(d).normalized();w=profile(t,widths)
        for j in range(n):
            q=j/(n-1)*2-1
            raised=ridge*(1-abs(q))**.85*math.sin(math.pi*t)**.6
            raised-=ridge*.23*math.sin(math.pi*q)**2*math.sin(math.pi*t)
            raised+=.008*math.sin(t*12+q*4)*math.sin(math.pi*t)*(abs(q)**1.2)
            v=c+across*q*w+no*raised
            if ground:v.z=max(.012,v.z)
            vs.append(v);uv.append((j/(n-1)*1.5,t*3))
    for i in range(41):
        for j in range(n-1):a=i*n+j;fs.append((a,a+1,a+1+n,a+n))
    o=mesh(name,vs,fs,ma,bones,uv);solid(o,.026)
    if edge:line(name+' ridge',[vs[i*n+n//2]+normal*.004 for i in range(42)],.007,EDGE,bones)
    return o
def tapered(width):return [(0,width*.52),(.18,width),(.48,width*.80),(.72,width*.45),(1,.001)]
bone('root',(0,0,0),(0,0,.45));bone('body',(0,.1,1.35),(0,.1,2.05),'root');bone('core',(0,-1.55,1.65),(0,-2.05,1.65),'body')

# Outer body and recessed inner chamber are distinct surfaces, leaving a real opening.
def axial_shell(name,sections,ma,bones,close_end=False):
    vs=[];fs=[];uv=[];rows=80;cols=96
    for i in range(rows):
        t=i/(rows-1);idx=min(int(t*(len(sections)-1)),len(sections)-2);u=t*(len(sections)-1)-idx;u=u*u*(3-2*u)
        y,rx,rz,cz=[sections[idx][j]*(1-u)+sections[idx+1][j]*u for j in range(4)]
        for j in range(cols):
            a=math.tau*j/cols;fold=1+.035*math.sin(7*a+4*t)+.022*math.cos(13*a-5*t)
            vs.append((rx*math.sin(a)*fold,y,cz+rz*math.cos(a)*fold));uv.append((j/cols*3,t*4))
    for i in range(rows-1):
        for j in range(cols):a=i*cols+j;b=i*cols+(j+1)%cols;fs.append((a,b,b+cols,a+cols))
    if close_end:fs.append(tuple((rows-1)*cols+j for j in range(cols)))
    return mesh(name,vs,fs,ma,bones,uv)
axial_shell('Hollow armored torso',[(-1.78,.73,.73,1.65),(-1.2,1.13,.82,1.64),(-.1,1.26,.83,1.62),(.85,1.10,.72,1.60),(1.6,.70,.51,1.55),(1.92,.035,.035,1.50)],BASE,['body'],True)
axial_shell('Deep recessed throat',[(-1.80,.51,.51,1.65),(-1.15,.49,.49,1.65),(-.3,.34,.34,1.65),(.55,.08,.08,1.65),(.65,.015,.015,1.65)],DARK,['core'],True)

# Twelve individual core blocks and emissive seams, oriented in the XZ plane.
def ring_arc(name,a0,a1,r0,r1,yfront,yback,ma,bones=['core']):
    vs=[];fs=[];N=16
    for i in range(N):
        a=a0+(a1-a0)*i/(N-1)
        for r,y in [(r0,yfront),(r1,yfront),(r1,yback),(r0,yback)]:vs.append((r*math.sin(a),y,1.65+r*math.cos(a)))
    for i in range(N-1):
        for j in range(4):a=i*4+j;b=i*4+(j+1)%4;fs.append((a,b,b+4,a+4))
    fs.extend([(3,2,1,0),tuple((N-1)*4+j for j in range(4))]);o=mesh(name,vs,fs,ma,bones,[(v[0]*2,v[2]*2) for v in vs])
    if ma==RING:
        activate(o);m=o.modifiers.new('Broken stone bevel','BEVEL');m.width=.017;m.segments=2;bpy.ops.object.modifier_apply(modifier=m.name)
    return o
for k in range(12):
    a0=math.tau*k/12+.018;a1=math.tau*(k+1)/12-.018
    ring_arc('Core stone segment '+str(k+1),a0,a1,.515,.705+.014*math.sin(k*2.7),-1.94-.013*math.sin(k*3),-1.73,RING)
    ring_arc('Inner pink fissure '+str(k+1),a0,a1,.507,.527,-1.957,-1.91,LIGHT)
    a=math.tau*k/12
    ring_arc('Radial pink fracture '+str(k+1),a-.009,a+.009,.52,.70,-1.941,-1.90,LIGHT)

# Front plates frame the annular core, with irregular pointed borders.
for k in range(11):
    a=math.tau*k/11+.05;top=math.cos(a)
    def pt(r,y,aa=a):return (r*math.sin(aa),y,1.65+r*math.cos(aa))
    rtip=1.30 if top>-.2 else 1.39
    path=[pt(.77,-1.79),pt(.93,-1.64,a+.06),pt(1.10,-1.33,a-.03),pt(rtip,-1.0,a+.10*math.sin(k*2))]
    leaf('Framing blade '+str(k),path,tapered(.26+.04*math.sin(k)),(math.sin(a),-.65,math.cos(a)),['body'],SHELL2 if k%3==0 else SHELL,.16,edge=k%2==0)
for sign in [-1,1]:
    leaf('Outer hanging cheek',[(sign*.66,-1.69,2.20),(sign*.98,-1.51,1.99),(sign*1.08,-1.37,1.49),(sign*.82,-1.63,.82)],tapered(.29),(sign*.4,-1,.1),['body'],SHELL,.19,edge=True)
    leaf('Lower mantle point',[(sign*.45,-1.65,1.26),(sign*.58,-1.37,.95),(sign*.35,-1.19,.56),(sign*.12,-1.08,.27)],tapered(.30),(sign*.2,-1,-.2),['body'],BASE,.15)

# Overlapping dorsal and flank plates, flowing from the crest toward the rear.
for row in range(3):
    for col in range(5):
        a=-1.05+col*.525;y=-.98+row*.77;x=1.04*math.sin(a);z=1.64+.78*math.cos(a)
        path=[(x*.80,y,z+.02),(x,y+.32,z+.12),(x*1.10,y+.77,z-.02),(x*1.05,y+1.13,z-.38)]
        leaf('Dorsal overlapping plate',path,tapered(.38 if col in [0,4] else .42),(math.sin(a),-.10,math.cos(a)),['body'],SHELL2 if (row+col)%3==0 else SHELL,.18,edge=(row+col)%2==0)
for sign in [-1,1]:
    for j in range(4):
        y=-.8+j*.62
        leaf('Flank falling plate',[(sign*1.05,y,1.98),(sign*1.27,y+.18,1.72),(sign*1.22,y+.45,1.25),(sign*.98,y+.62,.79)],tapered(.32),(sign,0,.2),['body'],SHELL,.16,edge=j%2==0)
for sign,y,h in [(-1,-.55,3.03),(1,-.78,3.08),(-1,.48,2.85),(1,.75,2.78)]:
    leaf('Crest horn',[(sign*.22,y+.58,2.22),(sign*.48,y+.22,2.46),(sign*.46,y-.03,h-.17),(sign*.48,y-.23,h)],[(0,.18),(.27,.33),(.7,.15),(1,.001)],(sign*.65,-.7,.35),['body'],SHELL2,.23,edge=True)

# Four splayed support legs, each with a high joint and flared rock foot.
for side,sign in [('L',1),('R',-1)]:
    for which in ['front','rear']:
        tag=which+side
        if which=='front':hip=Vector((sign*.92,-.65,1.94));knee=Vector((sign*2.62,-1.02,2.25));foot=Vector((sign*3.84,-1.72,.13));radius=.62
        else:hip=Vector((sign*.89,.96,1.76));knee=Vector((sign*2.20,1.78,1.98));foot=Vector((sign*3.18,2.48,.13));radius=.53
        LEGS[tag]=(hip,knee,foot)
        bone('upper_'+tag,hip,knee,'root');bone('lower_'+tag,knee,foot,'upper_'+tag);bone('foot_'+tag,foot,foot+Vector((sign*.38,-.05,0)),'lower_'+tag)
        tube('Leg internal arch '+tag,[hip,hip.lerp(knee,.40)+Vector((0,0,.10)),knee,knee.lerp(foot,.46),foot],[(0,.30),(.3,.27),(.55,.26),(.78,.30),(1,radius*.70)],BASE,['upper_'+tag,'lower_'+tag,'foot_'+tag],n=85,sides=36,flat=.90,fold=.018)
        ell('Low rock footing '+tag,(foot.x,foot.y,.09),(radius*.82,radius*.75,.09),BASE,['foot_'+tag])
        for j,no in enumerate([(0,-1,.45),(0,.9,.55),(0,0,1)]):
            normal=Vector(no).normalized();p0=hip+normal*.24;p1=hip.lerp(knee,.40)+normal*.34+Vector((0,0,.06));p2=knee+normal*.24;p3=knee+Vector((sign*.37,.06,-.21))+normal*.20
            leaf('Shoulder leg armor '+tag,[p0,p1,p2,p3],tapered(.36+.05*j),normal,['upper_'+tag,'lower_'+tag],SHELL2 if j==2 else SHELL,.18,edge=True)
        for j in range(5):
            a=math.tau*j/5+.3;normal=Vector((math.cos(a),math.sin(a),.12)).normalized()
            p0=knee+normal*.23+Vector((0,0,.12));p1=knee.lerp(foot,.35)+normal*.32;p2=knee.lerp(foot,.78)+normal*.43;p3=foot+normal*(radius*.96);p3.z=.025
            leaf('Flared leg blade '+tag,[p0,p1,p2,p3],[(0,.07),(.25,.29),(.6,.36),(.92,radius*.78),(1,radius*.65)],normal,['lower_'+tag,'foot_'+tag],SHELL2 if j%3==0 else SHELL,.16,ground=True,edge=j%2==0)

# Smaller grasping arms and two hooked talons on each side of the mouth.
for side,sign in [('L',1),('R',-1)]:
    h=Vector((sign*.72,-1.20,1.23));e=Vector((sign*1.02,-1.65,.91));w=Vector((sign*.85,-2.00,.63));CLAWS[side]=(h,e,w)
    bone('claw_upper'+side,h,e,'body');bone('claw_fore'+side,e,w,'claw_upper'+side)
    tip=Vector((sign*.62,-2.17,.24));inner=Vector((sign*.45,-2.10,.48))
    bone('talon'+side,w,tip,'claw_fore'+side);bone('inner_talon'+side,w,inner,'claw_fore'+side)
    tube('Grasping arm '+side,[h,h.lerp(e,.50)+Vector((sign*.04,-.06,0)),e,w],[(0,.20),(.40,.19),(.72,.16),(1,.19)],BASE,['claw_upper'+side,'claw_fore'+side],n=60,sides=28,fold=.015)
    for j in range(3):
        c=h.lerp(w,j/3);end=h.lerp(w,min(1,(j+1.6)/3))
        leaf('Grasping arm plate '+side,[c+Vector((0,-.13,.09)),c.lerp(end,.45)+Vector((sign*.12,-.16,.10)),end+Vector((sign*.07,-.13,-.03))],tapered(.19),(0,-1,.2),['claw_upper'+side,'claw_fore'+side],SHELL2,.11)
    tube('Large hooked talon '+side,[w,(sign*1.02,-2.07,.60),(sign*.88,-2.16,.47),tip],[(0,.15),(.35,.16),(.70,.105),(1,.004)],SHELL,['talon'+side],n=45,sides=28,fold=.012)
    tube('Inner talon '+side,[w,(sign*.64,-2.12,.66),inner],[(0,.11),(.45,.105),(1,.004)],SHELL2,['inner_talon'+side],n=35,sides=24,fold=.010)

# Apply a common scale so the highest point is 18 m above the lowest point.
for o in ASSETS:
    if o.name.startswith(('Leg internal arch','Flared leg blade','Low rock footing')):
        for v in o.data.vertices:
            p=o.matrix_world@v.co
            if p.z<0:p.z=0;v.co=o.matrix_world.inverted()@p
raw=[o.matrix_world@v.co for o in ASSETS for v in o.data.vertices];bottom=min(p.z for p in raw);SCALE=18/(max(p.z for p in raw)-bottom)
def scaled(p):p=Vector(p);p.z-=bottom;return p*SCALE
for d in SK.values():
    for key in ['head','tail']:d[key]=scaled(d[key])
ad=bpy.data.armatures.new('Sakibure skeleton');arm=bpy.data.objects.new('Sakibure rig',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=scaled(world@v.co);v.co=p;near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:2];weights=[math.exp(-(d-near[0][0])*9/SCALE) for d,n in near];total=sum(weights)
        for (d,n),w in zip(near,weights):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;m=o.modifiers.new('Boss deformation','ARMATURE');m.object=arm;o.data.validate();o.data.update()

def set_world_bone(name,h,t):
    rest=ad.bones[name];m=rest.matrix_local.copy();m.translation=Vector((0,0,0));m=(rest.tail_local-rest.head_local).rotation_difference(Vector(t)-Vector(h)).to_matrix().to_4x4()@m;m.translation=Vector(h);arm.pose.bones[name].matrix=m;bpy.context.view_layer.update()
def two_bone(upper,lower,foot,target,pole):
    h=SK[upper]['head'];e=SK[lower]['head'];w=SK[foot]['head'];l1=(e-h).length;l2=(w-e).length;d=target-h;length=min(d.length,(l1+l2)*.998);d.normalize();target=h+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector(pole);pole=(pole-d*pole.dot(d)).normalized();joint=h+d*along+pole*height
    set_world_bone(upper,h,joint);set_world_bone(lower,joint,target);set_world_bone(foot,target,target+SK[foot]['tail']-SK[foot]['head'])
    return target
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','sweep','devour','core_pulse']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        bpy.context.view_layer.update();a=math.sin(math.pi*f/120)**2
        if name=='idle':arm.pose.bones['body'].location.z=.012*SCALE*math.sin(math.tau*f/120)
        elif name=='sweep':
            tag='frontR';target=SK['foot_'+tag]['head'].lerp(scaled((-4.45,-2.55,.80)),a);h=SK['upper_'+tag]['head'];e=SK['lower_'+tag]['head'];pole=(e-h).lerp(Vector((-.5,-.2,1.0))*SCALE,a)
            two_bone('upper_'+tag,'lower_'+tag,'foot_'+tag,target,pole)
        elif name=='devour':
            for side,sign in [('L',1),('R',-1)]:
                h=SK['claw_upper'+side]['head'];e=SK['claw_fore'+side]['head'];w=SK['talon'+side]['head'];target=w.lerp(scaled((sign*1.11,-2.13,1.01)),a);pole=(e-h).lerp(Vector((sign*.5,-.3,.1))*SCALE,a)
                target=two_bone('claw_upper'+side,'claw_fore'+side,'talon'+side,target,pole)
                set_world_bone('inner_talon'+side,target,target+SK['inner_talon'+side]['tail']-SK['inner_talon'+side]['head'])
            arm.pose.bones['core'].scale=(1+.12*a,1,1+.12*a)
        else:arm.pose.bones['core'].scale=(1+.045*a,1,1+.045*a)
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
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'sakibure.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
verts=[v.co for o in models if o.type=='MESH' for v in o.data.vertices]
stats={'bones':len(ad.bones),'vertices':len(verts),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'sakibure.glb')),'height_m':max(p.z for p in verts)-min(p.z for p in verts),'width_m':max(p.x for p in verts)-min(p.x for p in verts),'depth_m':max(p.y for p in verts)-min(p.y for p in verts),'scale_factor':SCALE,'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup()
for k in ['front','side','back','three_quarter','core','shell','claw']:studio.render(os.path.join(OUT,k+'.png'),k)
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'sakibure.blend'));print('DONE',stats,flush=True)
