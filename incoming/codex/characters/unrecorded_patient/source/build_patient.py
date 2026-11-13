import bpy,sys,os,math,json
from mathutils import Vector,Matrix,Quaternion
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);SK={}
SKIN=mat('Ash pale skin',(.43,.407,.39),.92,True,.085)
CLOTH=mat('Weathered blue grey patient gown',(.31,.337,.355),.97,True,.12)
SEAM=mat('Gown edge stitching',(.255,.275,.29),.98)
PANTS=mat('Charcoal loose trousers',(.19,.185,.18),.96,True,.15)
SHOE=mat('Grey fabric slippers',(.31,.30,.28),.95,True,.11)
SOLE=mat('Worn rubber sole',(.23,.22,.205),.92)
PAPER=mat('Empty grey record folder',(.40,.377,.34),.94,True,.07)
PAGES=mat('Unwritten folder pages',(.56,.535,.49),.94)
LABEL=mat('Blank hospital nameplate',(.62,.61,.57),.85,True,.04)
METAL=mat('Aged brushed steel',(.36,.35,.33),.35);METAL.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.78
RUBBER=mat('Caster rubber',(.075,.071,.066),.87)
TUBE=mat('Translucent infusion tubing',(.59,.60,.58),.24)
GLASS=mat('Clear infusion bottle',(.64,.68,.70),.13)
GLASS.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value=.75
GLASS.node_tree.nodes['Principled BSDF'].inputs['IOR'].default_value=1.45
FLUID=mat('Pale infusion liquid',(.42,.49,.52),.18)
FLUID.node_tree.nodes['Principled BSDF'].inputs['Transmission Weight'].default_value=.45
for ma in [CLOTH,PANTS,SHOE]:surface_normal(ma,'cloth',.22)
surface_normal(SKIN,'skin',.25)

def bone(n,h,t,p=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':p}
def box(name,c,scale,ma,bones,bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=c);o=bpy.context.object;o.name=name;o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
    if bevel:
        mo=o.modifiers.new('Soft worn corners','BEVEL');mo.width=bevel;mo.segments=3;activate(o);bpy.ops.object.modifier_apply(modifier=mo.name)
        mo=o.modifiers.new('Face weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mo.name)
    o['bones']=','.join(bones);ASSETS.append(o);return o

bone('root',(0,0,0),(0,0,.15));bone('pelvis',(0,.04,1.05),(0,.04,1.28),'root')
bone('spine',(0,.04,1.28),(0,.02,1.63),'pelvis');bone('chest',(0,.02,1.63),(.015,.035,1.97),'spine')
bone('neck',(.015,.035,1.97),(-.21,-.10,2.15),'chest');bone('head',(-.21,-.10,2.15),(-.30,-.14,2.35),'neck')
bone('folder',(-.035,-.305,1.36),(-.035,-.305,1.76),'chest')
bone('pole',(.53,.075,.10),(.53,.075,2.37),'root')
bodyparts=[ell('Thin torso',(0,.04,1.65),(.215,.122,.38),SKIN,['chest']),
    tube('Sloping shoulders',[(-.245,.03,1.86),(-.15,.04,1.98),(.04,.055,2.035),(.23,.055,2.005)],[(0,.075),(.4,.10),(.75,.085),(1,.07)],SKIN,['chest'],n=65,sides=36),
    tube('Long off centre neck',[(.04,.055,1.95),(-.07,.04,2.015),(-.21,-.05,2.11),(-.25,-.10,2.19)],[(0,.108),(.3,.085),(.7,.071),(1,.076)],SKIN,['chest','neck','head'],n=72,sides=40)]
# Rounded faceless head with an elongated chin and oblique long axis.
head=ell('Rounded featureless head',(-.26,-.145,2.238),(.095,.094,.177),SKIN,['head'])
for v in head.data.vertices:
    t=(v.co.z+.177)/.354
    v.co.x*=.58+.42*t
    if v.co.y<-.035:v.co.y=-.035+(v.co.y+.035)*.70
head.rotation_euler[1]=math.radians(-17)
head.rotation_euler[0]=math.radians(10)
bodyparts.append(head)
bodyparts.extend([ell('Right shoulder',(-.225,.03,1.87),(.081,.084,.094),SKIN,['chest']),ell('Left shoulder',(.22,.052,2.005),(.08,.081,.082),SKIN,['chest'])])
union('Continuous face neck and shoulders',bodyparts,['chest','neck','head'])


# Asymmetric gown with dropped right shoulder and curved, layered skirt folds.
def gownpoint(t,a):
    sx=math.sin(a);front=math.cos(a)
    rx=prof(t,[(0,.315),(.3,.295),(.64,.265),(.86,.26),(1,.245)])
    ry=prof(t,[(0,.205),(.4,.195),(.75,.170),(1,.135)])
    top=1.925+.105*sx
    hem=.75+.09*math.sin(a+.4)+.035*math.cos(3*a)
    z=hem+(top-hem)*t
    fold=(.015*math.sin(11*a+3*t)+.008*math.cos(19*a-5*t))*(.4+.6*math.sin(math.pi*t))
    fold+=.012*math.sin(18*t+2.4*sx)*(math.sin(math.pi*t)**2)
    for k in range(4):
        ridge=.22+k*.16+.07*math.sin(a+1.1)
        fold+=.022*math.exp(-((t-ridge)/.028)**2)*max(0,-front)
    return Vector(((rx+fold)*sx,.035-(ry+fold)*front,z))
vs=[];fs=[];uv=[];R=100;N=112
for i in range(R+1):
    for j in range(N):vs.append(gownpoint(i/R,math.tau*j/N));uv.append((j/N*2,i/R*3))
for i in range(R):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
gown=mesh('Off shoulder draped hospital gown',vs,fs,CLOTH,['pelvis','spine','chest'],uv);solid(gown,.006)
for t,r in [(1,.007),(.985,.0017),(.018,.0014)]:line('Bound neckline and hem',[gownpoint(t,math.tau*j/150) for j in range(151)],r,SEAM,['pelvis','spine','chest'])
label=box('Blank name tag',(.12,-.169,1.845),(.095,.010,.047),LABEL,['chest'],.0025)
label.rotation_euler[2]=math.radians(16)
for x in [.077,.163]:ell('Name tag stitch',(x,-.177,1.847),(.0015,.0015,.018),SEAM,['chest'])
box('Thick empty record folder',(-.045,-.285,1.575),(.265,.024,.37),PAPER,['folder'],.004)
box('Unwritten inset paper edges',(-.042,-.288,1.575),(.252,.027,.351),PAGES,['folder'],.002)
box('Closed folder front cover',(-.045,-.306,1.575),(.265,.006,.37),PAPER,['folder'],.002)
line('Folder spine',[(-.175,-.313,1.393),(-.175,-.313,1.757)],.0025,PAPER,['folder'])

# Right arm protects the empty record. Left arm hangs down beside the IV pole.
arms={'R':((- .245,.025,1.835),(-.30,-.06,1.56),(-.108,-.365,1.625)),
      'L':((.245,.04,1.965),(.305,.025,1.55),(.345,-.035,1.11))}
for s,(hp,ep,wp) in arms.items():
    h,e,w=map(Vector,(hp,ep,wp));bone('upperArm'+s,h,e,'chest');bone('foreArm'+s,e,w,'upperArm'+s)
    tip=w+Vector((.10,-.002,.055)) if s=='R' else w+Vector((.01,-.014,-.14))
    bone('hand'+s,w,tip,'foreArm'+s)
    sleeve_end=e.lerp(w,.15 if s=='L' else .15)
    tube('Loose gown sleeve '+s,[h,h.lerp(e,.5)+Vector((0,.015,0)),e,sleeve_end],[(0,.09),(.3,.10),(.7,.088),(1,.09)],CLOTH,['upperArm'+s,'foreArm'+s],n=65,sides=42,fold=.008,cap=False)
    tube('Long exposed forearm '+s,[e,e.lerp(w,.42),w],[(0,.052),(.3,.058),(1,.032)],SKIN,['foreArm'+s],n=50,sides=30,fold=.002)
    d=(w-e).normalized();ax=d.orthogonal().normalized();by=d.cross(ax)

    if s=='R':
        # Three cloth panels hang from the bent sleeve, as in the reference.
        for k in range(3):
            vs=[];fs=[];uv=[]
            for i in range(26):
                t=i/25
                for j in range(14):
                    a=j/13;x=-.32+k*.037+a*.068;y=-.09-.062*k-.025*math.sin(math.pi*t)+.006*math.sin(10*a+5*t);z=1.57-.27*t-.045*k+.014*math.cos(5*a)*t
                    vs.append((x,y,z));uv.append((a,t))
            for i in range(25):
                for j in range(13):q=i*14+j;fs.append((q,q+1,q+15,q+14))
            ob=mesh('Hanging layered sleeve fabric',vs,fs,CLOTH,['foreArmR'],uv);solid(ob,.004)
    else:
        c=e.lerp(w,.82);tube('White patient identification bracelet',[c-d*.018,c+d*.018],[(0,.041),(1,.040)],LABEL,['foreArmL'],n=6,sides=36)
    # Palm coordinate frame: fingers follow the long axis, palm faces toward camera.
    u=(tip-w).normalized();v=Vector((u.z,0,-u.x)).normalized();depth=Vector((0,1,0));pc=w+u*.066
    pa=ell('Palm '+s,pc,(.052,.027,.094),SKIN,['hand'+s]);pa.rotation_euler[1]=math.atan2(u.x,u.z)
    parts=[pa,ell('Rounded wrist joint '+s,w,(.036,.034,.036),SKIN,['hand'+s]),tube('Wrist bridge '+s,[w,pc],[(0,.033),(1,.042)],SKIN,['hand'+s],n=22,sides=24)];fb=[]
    for k,(side,length) in enumerate([(-.037,.135),(-.012,.17),(.014,.158),(.037,.125)]):
        p0=pc+u*.060+v*side;p1=p0+u*length*.48+v*side*.14-depth*.006;p2=p0+u*length*.88+v*side*.40+depth*.013;p3=p0+u*length+v*side*.52+depth*.031
        if s=='R':p1.y=-.353;p2.y=-.335;p3.y=-.322
        bn='finger'+str(k+1)+s;bone(bn,p0,p3,'hand'+s);fb.append(bn)
        parts.append(ell('Blended knuckle '+bn,p0,(.020,.025,.021),SKIN,['hand'+s,bn]))
        parts.append(tube('Finger root '+bn,[pc+u*.032+v*side,p0],[(0,.019),(1,.014)],SKIN,['hand'+s,bn],n=14,sides=16))
        parts.append(tube('Long tapered finger '+bn,[p0,p1,p2,p3],[(0,.014),(.33,.012),(.72,.010),(1,.007)],SKIN,['hand'+s,bn],n=38,sides=16));parts.append(ell('Soft fingertip '+bn,p3,(.007,.007,.008),SKIN,[bn]))
    p0=pc-u*.025-v*.039;p1=p0-v*.044+u*.025;p2=p1+u*.066+depth*.015
    bn='thumb'+s;bone(bn,p0,p2,'hand'+s);fb.append(bn);parts.append(tube('Long opposing thumb '+s,[p0,p1,p2],[(0,.020),(.4,.016),(1,.009)],SKIN,['hand'+s,bn],n=34,sides=18));parts.append(ell('Thumb tip '+s,p2,(.010,.01,.011),SKIN,[bn]))
    union('Continuous long hand '+s,parts,['hand'+s]+fb)

for sign,s in [(-1,'R'),(1,'L')]:
    h=Vector((sign*.115,.045,1.13));k=Vector((sign*.12,.015,.58));ank=Vector((sign*.13,.035,.13))
    bone('thigh'+s,h,k,'pelvis');bone('shin'+s,k,ank,'thigh'+s);bone('foot'+s,ank,ank+Vector((0,-.17,-.06)),'shin'+s)
    tube('Bare ankle '+s,[ank+Vector((0,0,.03)),ank-Vector((0,0,.05))],[(0,.047),(1,.045)],SKIN,['foot'+s],n=16,sides=24)
    tube('Loose trouser leg '+s,[h,k+Vector((sign*.012,.012,.04)),ank],[(0,.115),(.35,.11),(.6,.094),(.88,.10),(1,.064)],PANTS,['thigh'+s,'shin'+s],n=94,sides=44,flat=.92,fold=.012)
    ell('Rounded cloth slipper '+s,(sign*.13,-.045,.066),(.086,.165,.066),SHOE,['foot'+s])
    ell('Slipper rubber outsole '+s,(sign*.13,-.052,.029),(.090,.169,.027),SOLE,['foot'+s])
    line('Slipper vamp seam '+s,[(sign*.13-.07,-.105,.09),(sign*.13,-.13,.13),(sign*.13+.07,-.105,.09)],.002,SEAM,['foot'+s])

# IV stand is a separately weighted assembly: stainless mast, four casters, hooks and bottle.
px=.53;py=.075
tube('IV stand telescopic shaft',[(px,py,.13),(px,py,1.42),(px+.015,py,2.39)],[(0,.014),(.58,.014),(.60,.010),(1,.010)],METAL,['pole'],n=50,sides=24)
for z,r in [(.14,.035),(1.4,.023),(2.385,.019)]:tube('IV shaft collar',[(px,py,z-.018),(px,py,z+.018)],[(0,r),(1,r)],METAL,['pole'],n=8,sides=24)
for j in range(4):
    a=math.tau*j/4+math.pi/4;end=Vector((px+.18*math.cos(a),py+.18*math.sin(a),.09));p=Vector((px,py,.145))
    tube('Four legged IV base',[p,p.lerp(end,.6)+Vector((0,0,.015)),end],[(0,.025),(.7,.018),(1,.015)],METAL,['pole'],n=20,sides=16)
    center=end+Vector((0,0,-.039));bone('caster'+str(j),center,center+Vector((.03,0,0)),'pole')
    for off in [-.012,.012]:
        ell('Rubber caster wheel',center+Vector((off,0,0)),(.012,.044,.044),RUBBER,['caster'+str(j)])
    box('Caster fork',end,(.052,.035,.024),METAL,['pole'],.005)
    tube('Caster axle',[center-Vector((.028,0,0)),center+Vector((.028,0,0))],[(0,.009),(1,.009)],METAL,['pole'],n=5,sides=16)
hook=[(px-.145,py,2.40),(px-.16,py,2.38),(px-.145,py,2.36),(px-.12,py,2.385),(px,py,2.39),(px+.13,py,2.39),(px+.15,py,2.37),(px+.13,py,2.35),(px+.12,py,2.37)]
line('Double infusion hanging hook',hook,.008,METAL,['pole'])
bx=px+.12
line('Bottle suspension loop',[(bx,py,2.36),(bx-.017,py,2.33),(bx,py,2.31),(bx+.017,py,2.33),(bx,py,2.36)],.0035,METAL,['pole'])
tube('Glass infusion bottle',[(bx,py,2.31),(bx,py,2.28),(bx,py,2.18),(bx,py,2.10),(bx,py,2.075)],[(0,.018),(.12,.046),(.80,.046),(.93,.025),(1,.015)],GLASS,['pole'],n=45,sides=44)
tube('Contained infusion liquid',[(bx,py,2.11),(bx,py,2.245)],[(0,.036),(.15,.041),(1,.041)],FLUID,['pole'],n=24,sides=36)
tube('Bottle white connector',[(bx,py,2.078),(bx,py,2.052)],[(0,.018),(1,.014)],LABEL,['pole'],n=8,sides=24)
tube('Drip chamber',[(bx,py,2.05),(bx,py,1.99)],[(0,.013),(.8,.013),(1,.007)],GLASS,['pole'],n=18,sides=24)
line('Infusion loop to left wrist',[(bx,py,1.99),(bx-.02,py-.015,1.86),(.47,-.04,1.78),(.38,-.08,1.78),(.36,-.095,1.48),(.43,-.08,1.13),(.38,-.09,1.03),(.33,-.07,1.17)],.004,TUBE,['pole','foreArmL','handL'])
line('Loose secondary hospital tube',[(.20,.01,2.00),(.32,.02,1.94),(.37,.025,1.67),(.41,.03,1.42),(.29,.02,1.19),(.27,-.03,1.03),(.40,-.02,.96),(.47,-.015,1.10),(.41,-.015,1.47)],.0035,TUBE,['chest','foreArmL'])
box('Wrist cannula dressing',(.34,-.068,1.17),(.044,.008,.033),LABEL,['foreArmL'],.003)

# Bind every vertex, retaining sparse two-bone weights at articulation.
ad=bpy.data.armatures.new('Unrecorded patient skeleton');arm=bpy.data.objects.new('Unrecorded patient rig',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=world@v.co;v.co=p;near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:2];ws=[math.exp(-(d-near[0][0])*45) for d,n in near];total=sum(ws)
        for (d,n),w in zip(near,ws):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mo=o.modifiers.new('Character skin','ARMATURE');mo.object=arm;o.data.validate();o.data.update()
def setworld(n,h,t):
    r=ad.bones[n];ma=r.matrix_local.copy();ma.translation=Vector((0,0,0));ma=(r.tail_local-r.head_local).rotation_difference(Vector(t)-Vector(h)).to_matrix().to_4x4()@ma;ma.translation=Vector(h);arm.pose.bones[n].matrix=ma;bpy.context.view_layer.update()
def ik(up,low,end,target,pole,direction):
    h=arm.pose.bones[up].head.copy();l1=(SK[low]['head']-SK[up]['head']).length;l2=(SK[end]['head']-SK[low]['head']).length;d=Vector(target)-h;length=max(abs(l1-l2)+.0001,min(d.length,l1+l2-.0001));d.normalize();target=h+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector(pole);pole-=d*pole.dot(d)
    if pole.length<.001:pole=d.orthogonal()
    joint=h+d*along+pole.normalized()*height;setworld(up,h,joint);setworld(low,joint,target);setworld(end,target,target+Vector(direction))
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','search_record','hold_record','walk_in_place']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,4):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        a=math.sin(math.pi*f/120)**2;wave=math.sin(math.tau*f/120)
        def rotate(n,axis,deg):arm.pose.bones[n].rotation_quaternion=Quaternion(Vector(axis),math.radians(deg))
        if name=='idle':rotate('neck',(0,0,1),1.2*wave);rotate('chest',(1,0,0),.35*wave)
        elif name=='search_record':rotate('chest',(1,0,0),15*a);rotate('neck',(1,0,0),10*a)
        elif name=='hold_record':rotate('neck',(0,0,1),-6*a);rotate('chest',(0,0,1),2*a)
        elif name=='walk_in_place':
            off=Vector((0,0,.012*math.sin(math.tau*f/60)**2));setworld('pelvis',SK['pelvis']['head']+off,SK['pelvis']['tail']+off)
            for sign,s in [(1,'L'),(-1,'R')]:
                phase=math.tau*f/60+(0 if s=='L' else math.pi);target=SK['foot'+s]['head']+Vector((0,.15*math.sin(phase),.045*max(0,math.cos(phase))))
                ik('thigh'+s,'shin'+s,'foot'+s,target,(0,-1,0),SK['foot'+s]['tail']-SK['foot'+s]['head'])
        bpy.context.view_layer.update()
        # The record-holding palm follows its folder rigidly; the free arm searches.
        ch=arm.pose.bones['chest'].matrix@ad.bones['chest'].matrix_local.inverted()
        target=ch@SK['handR']['head'];direction=ch.to_3x3()@(SK['handR']['tail']-SK['handR']['head'])
        ik('upperArmR','foreArmR','handR',target,ch.to_3x3()@(SK['foreArmR']['head']-SK['upperArmR']['head']),direction)
        if name=='search_record':
            target=SK['handL']['head'].lerp(Vector((.32,-.59,1.40)),a);direction=(SK['handL']['tail']-SK['handL']['head']).lerp(Vector((0,-.14,-.015)),a)
            pole=(SK['foreArmL']['head']-SK['upperArmL']['head']).lerp(Vector((.6,0,-.2)),a)
            ik('upperArmL','foreArmL','handL',target,pole,direction)
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
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'unrecorded_patient.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
verts=[v.co for o in models if o.type=='MESH' for v in o.data.vertices]
stats={'bones':len(ad.bones),'vertices':len(verts),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'unrecorded_patient.glb')),'height_m':max(p.z for p in verts)-min(p.z for p in verts),'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2);studio.setup()
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'unrecorded_patient.blend'))
if '--skip-stills' not in sys.argv:
    for k in ['front','side','back','three_quarter','face','hand','equipment']:studio.render(os.path.join(OUT,k+'.png'),k)
print('DONE',stats,flush=True)
