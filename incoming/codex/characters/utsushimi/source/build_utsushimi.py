"""Utsushimi: angular violet mimic boss. Units metres, facing -Y."""
import bpy,sys,os,math,json
import numpy as np
from mathutils import Vector,Matrix,Quaternion
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);SK={}
SKIN=mat('Graphite mask and hands',(.105,.084,.119),.89,True,.055)
COAT=mat('Deep aubergine jacket',(.205,.153,.240),.92,True,.045)
TRIM=mat('Violet folded edging',(.320,.220,.375),.88,True,.035)
HAIR=mat('Dark violet angular hair',(.185,.123,.215),.88,True,.035)
HAIR2=mat('Purple hair highlight planes',(.255,.154,.275),.89,True,.035)
PINK=mat('Muted rose hat and shoes',(.350,.173,.270),.86,True,.04)
FLOWER=mat('Pink flower petals',(.58,.28,.40),.74)
BLACK=mat('Eyeglass frame and seams',(.014,.011,.017),.68)
MOUTH=mat('Recessed smile darkness',(.001,.0008,.0012),1);MOUTH.node_tree.nodes['Principled BSDF'].inputs['Specular IOR Level'].default_value=0
LENS=mat('Dark tinted lenses',(.023,.019,.030),.32)
WHITE=mat('Worn pale rubber and laces',(.48,.44,.46),.88)
EYE=mat('Faint violet eye glints',(.26,.10,.37),.5);EYE.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(.31,.13,.45,1);EYE.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.45
def patterned(name,kind):
    ma=mat(name,(.2,.18,.22),.92);N=1024;y,x=np.mgrid[0:N,0:N]/N
    if kind=='stripe':
        mask=((y*12)%1<.50);a=np.array([.38,.22,.32]);b=np.array([.62,.57,.60]);px=np.where(mask[:,:,None],a,b)
    else:
        px=np.zeros((N,N,3))+np.array([.115,.101,.125]);u=x*8;v=y*12
        broad=((u%1<.13)|(v%1<.13));fine=((u%1<.025)|(v%1<.025)|((u+.18)%1<.014)|((v+.18)%1<.014))
        px[broad]+=.035;px[fine]+=.09
    px*=1+(np.sin(x*math.tau*350)*np.sin(y*math.tau*380)*.035)[:,:,None]
    rgba=np.ones((N,N,4),np.float32);rgba[:,:,:3]=px;im=bpy.data.images.new(name+' colour',N,N,alpha=True);im.pixels.foreach_set(rgba.ravel());im.pack()
    node=ma.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;ma.node_tree.links.new(node.outputs['Color'],ma.node_tree.nodes['Principled BSDF'].inputs['Base Color']);return ma
SHIRT=patterned('Rose and grey horizontal stripes','stripe');PANTS=patterned('Fine charcoal windowpane trousers','plaid')
for ma in [COAT,TRIM,PANTS,SHIRT]:surface_normal(ma,'cloth',.12)
def bone(n,h,t,parent=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':parent}
def flat(o):
    for p in o.data.polygons:p.use_smooth=False
    return o
def polygon(name,pts,ma,bones,thick=.006):
    o=mesh(name,pts,[tuple(range(len(pts)))],ma,bones,[(p[0]*2,p[2]*2) for p in pts]);solid(o,thick);return flat(o)
def ribbon(name,path,widths,ma,bones,normal=(0,-1,0),ridge=.015):
    pts=[Vector(p) for p in path];normal=Vector(normal).normalized();vs=[];fs=[];uv=[]
    for i,c in enumerate(pts):
        d=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized();no=normal-d*normal.dot(d)
        if no.length<.01:no=d.orthogonal()
        no.normalize();side=no.cross(d).normalized()
        for j,q in enumerate([-1,0,1]):vs.append(c+side*q*widths[i]+no*(ridge if q==0 else 0));uv.append((j/2,i/(len(pts)-1)))
    for i in range(len(pts)-1):
        for j in range(2):a=i*3+j;fs.append((a,a+1,a+4,a+3))
    o=mesh(name,vs,fs,ma,bones,uv);solid(o,.006);return flat(o)
def angular_tube(name,pts,radii,ma,bones,sides=10,flatness=1):
    # Deliberately segmented rails rather than smoothing away the concept's angles.
    ps=[Vector(p) for p in pts];vs=[];fs=[];uv=[];prev=Vector((1,0,0))
    for i,c in enumerate(ps):
        d=(ps[min(i+1,len(ps)-1)]-ps[max(i-1,0)]).normalized();a=prev-d*prev.dot(d)
        if a.length<.01:a=d.orthogonal()
        a.normalize();b=d.cross(a).normalized();prev=a
        for j in range(sides):
            th=math.tau*j/sides+.10*math.sin(i*1.7);r=radii[i]*(1+.06*math.sin(j*3+i*2));vs.append(c+r*(a*math.cos(th)+b*math.sin(th)*flatness));uv.append((j/sides,i/(len(ps)-1)))
    for i in range(len(ps)-1):
        for j in range(sides):a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    fs.extend([tuple(reversed(range(sides))),tuple((len(ps)-1)*sides+j for j in range(sides))]);return flat(mesh(name,vs,fs,ma,bones,uv))
def torso(name,sections,ma,bones,opening=0):
    vs=[];fs=[];uv=[];N=24
    for i,(z,rx,ry,cy) in enumerate(sections):
        for j in range(N+1):
            a=opening+(math.tau-2*opening)*j/N;z1=z+.012*math.sin(a*3+i) if 0<i<len(sections)-1 else z
            vs.append((rx*math.sin(a),cy-ry*math.cos(a),z1));uv.append((j/N,i/(len(sections)-1)))
    for i in range(len(sections)-1):
        for j in range(N):a=i*(N+1)+j;fs.append((a,a+1,a+N+2,a+N+1))
    o=mesh(name,vs,fs,ma,bones,uv);solid(o,.007);return flat(o)
bone('root',(0,0,0),(0,0,.18));bone('pelvis',(0,0,1.56),(0,0,1.82),'root');bone('spine',(0,0,1.82),(0,0,2.15),'pelvis');bone('chest',(0,0,2.15),(0,0,2.51),'spine');bone('neck',(0,0,2.51),(0,0,2.74),'chest');bone('head',(0,0,2.74),(0,0,3.02),'neck')
torso('Striped fitted inner shirt',[(1.64,.125,.075,0),(1.78,.150,.090,0),(1.94,.112,.077,0),(2.10,.125,.080,0),(2.28,.17,.095,0),(2.43,.208,.104,0),(2.50,.10,.07,0)],SHIRT,['pelvis','spine','chest'])
sections=[(1.56,.20,.11,.025),(1.70,.19,.105,.025),(1.87,.145,.09,.02),(2.03,.127,.09,.02),(2.18,.16,.105,.015),(2.35,.23,.12,.015),(2.48,.235,.105,.015),(2.54,.11,.085,.015)]
torso('Open angular jacket',sections,COAT,['pelvis','spine','chest'],.54)
for sign,s in [(1,'L'),(-1,'R')]:
    edge=[(sign*rx*math.sin(.54),cy-ry*math.cos(.54)-.005,z) for z,rx,ry,cy in sections]
    ribbon('Jacket opening purple border '+s,edge,[.021]*len(edge),TRIM,['pelvis','spine','chest'],ridge=.005)
    polygon('Pointed front coat tail '+s,[(sign*.10,-.09,1.89),(sign*.17,-.10,1.79),(sign*.24,-.07,1.59),(sign*.16,-.11,1.52),(sign*.08,-.105,1.72)],COAT,['pelvis','spine'])
    ribbon('Pointed hem border '+s,[(sign*.24,-.077,1.59),(sign*.16,-.117,1.52),(sign*.08,-.112,1.72)],[.023,.024,.014],TRIM,['pelvis'])
    polygon('Raised hood side '+s,[(sign*.045,.035,2.65),(sign*.14,.10,2.61),(sign*.26,.055,2.50),(sign*.20,-.10,2.40),(sign*.10,-.125,2.46)],TRIM,['chest','neck'])
    polygon('Long angular lapel '+s,[(sign*.10,-.125,2.59),(sign*.245,-.10,2.49),(sign*.14,-.145,2.32),(sign*.09,-.13,2.13),(sign*.065,-.13,2.39)],TRIM,['chest'])
polygon('Folded back hood',[(0,.10,2.63),(.17,.13,2.56),(.22,.16,2.44),(0,.19,2.32),(-.22,.16,2.44),(-.17,.13,2.56)],COAT,['chest'])
ribbon('Back hood rim',[(-.18,.145,2.54),(0,.175,2.47),(.18,.145,2.54)],[.025,.030,.025],TRIM,['chest'],normal=(0,1,0))
angular_tube('Long folded neck',[(0,0,2.48),(.008,.005,2.59),(0,0,2.77)],[.07,.044,.06],SKIN,['neck'],sides=9,flatness=.78)

# An elongated, planar mask; facial details are placed against its actual surface.
HEADSTART=len(ASSETS)
head=torso('Pointed smiling mask',[(2.67,.008,.019,-.015),(2.72,.051,.06,-.005),(2.80,.091,.088,0),(2.90,.105,.099,0),(2.99,.092,.083,.006),(3.055,.025,.029,.01)],SKIN,['head'])
def surf(x,z):
    hit,p,n,idx=head.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
    if not hit:raise RuntimeError('Face point outside mask '+str((x,z)))
    return p
polygon('Sharp nose bridge',[(-.012,-.099,2.91),(.012,-.099,2.91),(.017,-.110,2.81),(0,-.137,2.80),(-.016,-.110,2.81)],SKIN,['head'])
smile=[]
for i in range(25):
    x=-.071+.142*i/24;z=2.751+.047*(abs(x)/.071)**1.5;p=surf(x,z);p.y-=.004;smile.append(p)
cutter=tube('Smile groove cutter',[p+Vector((0,.005,0)) for p in smile],[(0,.001),(.2,.006),(.5,.007),(.8,.006),(1,.001)],MOUTH,['head'],n=55,sides=12)
activate(head);mod=head.modifiers.new('Carved crescent smile','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.ops.object.modifier_apply(modifier=mod.name);ASSETS.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
tube('Dark recessed smile',[p+Vector((0,.010,0)) for p in smile],[(0,.001),(.2,.004),(.5,.005),(.8,.004),(1,.001)],MOUTH,['head'],n=50,sides=10)
for sign in [-1,1]:
    cx=sign*.052;z=2.891
    polygon('Tinted rectangular eyeglass lens',[(cx-.043,-.111,z-.020),(cx+.043,-.111,z-.020),(cx+.043,-.112,z+.019),(cx-.043,-.112,z+.019)],LENS,['head'],.002)
    loop=[(cx-.048,-.117,z-.025),(cx+.048,-.117,z-.025),(cx+.048,-.117,z+.024),(cx-.048,-.117,z+.024),(cx-.048,-.117,z-.025)]
    line('Rectangular black glasses frame',loop,.005,BLACK,['head'])
    line('Glasses temple',[(sign*.100,-.114,z+.009),(sign*.111,-.018,z+.012),(sign*.104,.028,z-.003)],.0045,BLACK,['head'])
    ell('Violet eye glint',(cx,-.116,z-.001),(.008,.002,.003),EYE,['head'])
line('Glasses bridge',[(-.009,-.121,2.895),(0,-.127,2.898),(.009,-.121,2.895)],.0035,BLACK,['head'])

# Hair is a collection of pointed strips with a raised central facet.
angular_tube('Hair cap',[(0,.017,2.92),(0,.018,3.015),(0,.014,3.075)],[.113,.111,.04],HAIR,['head'],sides=12,flatness=.90)
locks=[([(-.025,-.025,3.07),(-.072,-.087,3.015),(-.105,-.110,2.94),(-.130,-.102,2.87)],[.025,.042,.027,.001]),
       ([(.005,-.035,3.07),(.055,-.106,3.00),(.105,-.122,2.92),(.120,-.10,2.80)],[.025,.037,.023,.001]),
       ([(-.02,-.043,3.06),(-.028,-.109,3.00),(-.05,-.126,2.93)],[.025,.032,.001]),
       ([(.045,.015,3.06),(.103,-.055,3.01),(.123,-.066,2.86),(.128,-.038,2.72)],[.024,.045,.031,.001]),
       ([(-.055,.025,3.055),(-.105,-.04,2.99),(-.123,-.057,2.82),(-.105,-.01,2.73)],[.025,.042,.027,.001])]
for i,(p,w) in enumerate(locks):ribbon('Pointed fringe '+str(i),p,w,HAIR2 if i==1 else HAIR,['head'],ridge=.013)
for i in range(7):
    a=.5+math.pi*i/6;x=.10*math.cos(a);y=.087*math.sin(a)+.018
    ribbon('Back hair lock',[(x*.3,y*.3,3.07),(x,y,3.01),(x*1.12,y*1.10,2.91),(x*.95,y*1.12,2.83)],[.022,.036,.026,.001],HAIR if i%2 else HAIR2,['head'],normal=(x,y,0),ridge=.012)
# Three angular trailing strands attached to the back-right ponytail knot.
for k in range(3):
    p=[(.055,.10,3.015),(.22+k*.028,.17+k*.025,2.89),(.39+k*.035,.21+k*.028,2.63),(.43+k*.02,.20+k*.03,2.36),(.31+k*.045,.16+k*.03,2.10-k*.07)]
    bn='tail'+str(k);bone(bn,p[0],p[-1],'head');ribbon('Long angular ponytail '+str(k),p,[.025,.058,.067,.045,.001],HAIR2 if k==1 else HAIR,[bn],normal=(0,-1,.1),ridge=.022)
ell('Ponytail tie',(.06,.105,3.015),(.044,.033,.033),BLACK,['head'])
# A small tilted top hat, transformed as a unit.
start=len(ASSETS)
def cylinder(name,center,radius,depth,ma,bones,vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=center);o=bpy.context.object;o.name=name;o.data.materials.append(ma);o['bones']=','.join(bones);ASSETS.append(o);return o
cylinder('Top hat brim',(0,0,3.075),.118,.014,PINK,['head']);cylinder('Top hat crown',(0,0,3.143),.078,.126,PINK,['head']);cylinder('Dark hat band',(0,0,3.103),.079,.025,BLACK,['head'])
pivot=Vector((0,0,3.075));rot=Matrix.Rotation(math.radians(-19),3,'Y')@Matrix.Rotation(math.radians(9),3,'X')
for o in ASSETS[start:]:
    mw=o.matrix_world.copy()
    for v in o.data.vertices:v.co=pivot+rot@(mw@v.co-pivot)+Vector((-.044,-.005,.008))
    o.matrix_world=Matrix.Identity(4)
flower_c=Vector((.103,-.087,3.005))
for k in range(5):
    a=math.tau*k/5;d=Vector((math.sin(a),0,math.cos(a)));o=ell('Five petal blossom',flower_c+d*.022,(.013,.007,.024),FLOWER,['head']);o.rotation_euler.y=a
ell('Flower center',flower_c+Vector((0,-.009,0)),(.009,.005,.009),PINK,['head'])
headpivot=Vector((0,0,2.70))
for o in ASSETS[HEADSTART:]:
    mw=o.matrix_world.copy()
    for v in o.data.vertices:v.co=headpivot+(mw@v.co-headpivot)*1.18
    o.matrix_world=Matrix.Identity(4)
for n in ['head','tail0','tail1','tail2']:
    for key in ['head','tail']:SK[n][key]=headpivot+(SK[n][key]-headpivot)*1.18

# Long sleeved arms, skeletal five-finger hands, checked legs and canvas shoes.
for sign,s in [(1,'L'),(-1,'R')]:
    def m(x,y,z):return (sign*x,y,z)
    h=m(.228,0,2.46);e=m(.360,-.01,2.02);w=m(.495,-.03,1.49)
    bone('upperArm'+s,h,e,'chest');bone('foreArm'+s,e,w,'upperArm'+s);bone('hand'+s,w,m(.51,-.04,1.32),'foreArm'+s)
    angular_tube('Angular sleeve '+s,[h,m(.28,.006,2.35),m(.285,-.005,2.19),e,m(.38,-.018,1.88),m(.45,-.024,1.72),w],[.095,.074,.061,.069,.051,.052,.047],COAT,['upperArm'+s,'foreArm'+s],sides=9)
    polygon('Faceted shoulder overlap '+s,[m(.14,-.05,2.52),m(.26,-.07,2.50),m(.31,-.06,2.40),m(.25,-.09,2.34),m(.19,-.10,2.42)],COAT,['upperArm'+s,'chest'])
    angular_tube('Purple angular cuff '+s,[m(.485,-.03,1.55),m(.498,-.03,1.47)],[.053,.071],TRIM,['foreArm'+s],sides=8)
    handstart=len(ASSETS)
    angular_tube('Narrow wrist and palm '+s,[m(.495,-.03,1.51),m(.50,-.035,1.42),m(.516,-.045,1.34),m(.517,-.05,1.30)],[.028,.029,.051,.046],SKIN,['hand'+s],sides=8,flatness=.52)
    for k,(dx,length) in enumerate([(-.034,.265),(-.010,.30),(.014,.282),(.037,.235)]):
        p0=Vector(m(.517+dx,-.05,1.32));p1=Vector(m(.533+dx*1.30,-.06,1.32-length*.45));p2=Vector(m(.56+dx*1.45,-.10,1.32-length*.86));p3=Vector(m(.59+dx*1.35,-.13,1.32-length))
        n='finger'+str(k+1)+s;bone(n,p0,p3,'hand'+s);angular_tube('Long hooked '+n,[p0,p1,p2,p3],[.013,.012,.008,.0015],SKIN,[n],sides=7)
    pts=[m(.48,-.05,1.38),m(.425,-.06,1.32),m(.414,-.08,1.245),m(.435,-.10,1.22)];bone('thumb'+s,pts[0],pts[-1],'hand'+s);angular_tube('Hooked thumb '+s,pts,[.019,.015,.010,.0015],SKIN,['thumb'+s],sides=7)
    hp=Vector(w);hs=Matrix.Diagonal(Vector((1.40,1.20,1.40)))
    for o in ASSETS[handstart:]:
        mw=o.matrix_world.copy()
        for v in o.data.vertices:v.co=hp+hs@(mw@v.co-hp)
        o.matrix_world=Matrix.Identity(4)
    for n in ['hand'+s,'thumb'+s]+['finger'+str(k)+s for k in range(1,5)]:
        for key in ['head','tail']:SK[n][key]=hp+hs@(SK[n][key]-hp)
    hip=m(.10,0,1.69);knee=m(.14,-.025,.88);ankle=m(.17,0,.16)
    bone('thigh'+s,hip,knee,'pelvis');bone('shin'+s,knee,ankle,'thigh'+s);bone('foot'+s,ankle,m(.17,-.18,.075),'shin'+s)
    angular_tube('Checked trousers '+s,[hip,m(.115,.005,1.54),m(.135,.012,1.34),m(.125,-.025,1.10),knee,m(.155,.007,.68),m(.15,.02,.43),m(.175,.01,.31),m(.17,0,.15)],[.105,.108,.090,.063,.061,.072,.045,.066,.06],PANTS,['thigh'+s,'shin'+s],sides=12)
    # Outsole has a flat bottom; flattened upper and toe retain a low profile.
    sole=ell('White sneaker outsole '+s,m(.17,-.065,.045),(.095,.178,.044),WHITE,['foot'+s])
    for v in sole.data.vertices:
        if v.co.z<-.029:v.co.z=-.044
    ell('Dark canvas shoe upper '+s,m(.17,-.045,.102),(.084,.15,.078),COAT,['foot'+s])
    ell('Rose toe cap '+s,m(.17,-.164,.084),(.083,.070,.045),PINK,['foot'+s])
    polygon('Rose sneaker tongue '+s,[m(.128,-.140,.13),m(.212,-.140,.13),m(.201,-.027,.184),m(.139,-.027,.184)],PINK,['foot'+s],.004)
    for j in range(5):
        y=-.135+j*.023;z=.144+j*.009
        line('Crossed sneaker lace '+s,[m(.136,y,z),m(.204,y+.016,z+.006)],.003,WHITE,['foot'+s]);line('Crossed sneaker lace '+s,[m(.204,y,z),m(.136,y+.016,z+.006)],.003,WHITE,['foot'+s])
    line('Outsole foxing stripe '+s,[m(.08,-.15,.055),m(.09,-.23,.055),m(.17,-.243,.055),m(.25,-.23,.055),m(.26,-.15,.055)],.0025,COAT,['foot'+s])

# Bind the mesh to an editable skeleton, retaining hard surface details on head/feet.
ad=bpy.data.armatures.new('Utsushimi skeleton');arm=bpy.data.objects.new('Utsushimi rig',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=world@v.co;v.co=p;near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:2];ws=[math.exp(-(d-near[0][0])*35) for d,n in near];total=sum(ws)
        for (d,n),w in zip(near,ws):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mod=o.modifiers.new('Character skin','ARMATURE');mod.object=arm;o.data.validate();o.data.update()
def set_world(name,h,t):
    rest=ad.bones[name];ma=rest.matrix_local.copy();ma.translation=Vector((0,0,0));ma=(rest.tail_local-rest.head_local).rotation_difference(Vector(t)-Vector(h)).to_matrix().to_4x4()@ma;ma.translation=Vector(h);arm.pose.bones[name].matrix=ma;bpy.context.view_layer.update()
def ik(up,low,end,target,pole,enddir=None):
    h=arm.pose.bones[up].head.copy();l1=(SK[low]['head']-SK[up]['head']).length;l2=(SK[end]['head']-SK[low]['head']).length;d=Vector(target)-h;length=max(abs(l1-l2)+.001,min(d.length,(l1+l2)*.999));d.normalize();target=h+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector(pole);pole-=d*pole.dot(d)
    if pole.length<.001:pole=d.orthogonal()
    joint=h+d*along+pole.normalized()*height;set_world(up,h,joint);set_world(low,joint,target);set_world(end,target,target+(Vector(enddir) if enddir else SK[end]['tail']-SK[end]['head']))
sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','mimic_pose','reaching_lunge','head_tilt']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        a=math.sin(math.pi*f/120)**2
        def rotate(n,axis,deg):arm.pose.bones[n].rotation_quaternion=Quaternion(Vector(axis),math.radians(deg))
        if name=='idle':rotate('chest',(1,0,0),.7*math.sin(math.tau*f/120))
        elif name=='head_tilt':rotate('head',(0,1,0),20*a);rotate('neck',(0,0,1),-8*a)
        else:
            arm.pose.bones['pelvis'].location.y=-.20*a if name=='mimic_pose' else -.34*a
            rotate('chest',(1,0,0),(6 if name=='mimic_pose' else 28)*a);rotate('spine',(1,0,0),(0 if name=='mimic_pose' else 15)*a)
            bpy.context.view_layer.update()
            for sign,s in [(1,'L'),(-1,'R')]:
                old=SK['foot'+s]['head'];goal=Vector((sign*.49,0,.16)) if name=='mimic_pose' else Vector((sign*.31,-.50 if sign==1 else .51,.16))
                pole=(SK['shin'+s]['head']-SK['thigh'+s]['head']).lerp(Vector((0,-1,.1)),a)
                ik('thigh'+s,'shin'+s,'foot'+s,old.lerp(goal,a),pole)
                old=SK['hand'+s]['head'];goal=Vector((.55 if sign==1 else -.85,-.12,3.05 if sign==1 else 2.10)) if name=='mimic_pose' else Vector((sign*.30,-1.40,2.10))
                direction=(SK['hand'+s]['tail']-SK['hand'+s]['head']).lerp(Vector((sign*.15,-.03,-.16)) if name=='mimic_pose' else Vector((0,-.22,-.02)),a)
                desired_pole=Vector((sign*.5,.1,.25 if sign==1 else -.25)) if name=='mimic_pose' else Vector((sign*.3,0,-.4))
                pole=(SK['foreArm'+s]['head']-SK['upperArm'+s]['head']).lerp(desired_pole,a)
                ik('upperArm'+s,'foreArm'+s,'hand'+s,old.lerp(goal,a),pole,direction)
        for k in range(3):rotate('tail'+str(k),(1,0,0),(3*math.sin(math.tau*f/120) if name=='idle' else -18*a if name=='reaching_lunge' else 4*a))
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
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'utsushimi.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
verts=[v.co for o in models if o.type=='MESH' for v in o.data.vertices];stats={'bones':len(ad.bones),'vertices':len(verts),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'utsushimi.glb')),'height_m':max(p.z for p in verts)-min(p.z for p in verts),'cast_engine_tested':False,'human_form_included':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup()
for k in ['front','side','back','three_quarter','face','hand','torso']:studio.render(os.path.join(OUT,k+'.png'),k)
studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'utsushimi.blend'));print('DONE',stats,flush=True)
