import bpy,sys,os,math,json,random
import numpy as np
from mathutils import Vector,Matrix,Quaternion
sys.path.insert(0,os.path.dirname(__file__))
from geometry import *
import studio
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);SK={};WINGS={};random.seed(41)
DARK=mat('Deep folds between record bands',(.065,.056,.074),.92,True,.15)
PAPER=mat('Ash grey archival strips',(.32,.30,.325),.84)
PALE=mat('Pale worn record edges',(.45,.425,.43),.82)
PURPLE=mat('Muted violet layered strips',(.22,.19,.24),.88)
EDGE=mat('Raised strip margins',(.245,.226,.25),.83)
SMALL=mat('Smoky silver wing eyes',(.19,.17,.20),.36)
IRIS=mat('Silver grey iris',(.48,.46,.46),.32,True,.09)
BLACK=mat('Glossy abyss pupil',(.004,.004,.007),.16)
INK=mat('Fine radial iris marks',(.042,.030,.049),.80)
LID=mat('Dark folded eyelids',(.16,.14,.18),.72)
GLOW=mat('Faint violet core rim',(.20,.065,.31),.44)
p=GLOW.node_tree.nodes['Principled BSDF'];p.inputs['Emission Color'].default_value=(.15,.025,.28,1);p.inputs['Emission Strength'].default_value=.5
BLACK.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value=.18

def record_texture(ma,seed):
    size=1024;rng=np.random.default_rng(seed);y,x=np.mgrid[0:size,0:size]/size
    # Printed ledger rules and short, faded strokes, not readable source text.
    lines=((np.mod(y*30,1)<.065)*.30+(np.mod(x*12,1)<.045)*.25)
    lines+=(np.mod(x*4,1)<.012)*.12
    rows=np.floor(y*72).astype(int);columns=np.floor(x*80).astype(int)
    field=rng.random((73,81));strokes=(field[rows,columns]>.62)*(np.mod(y*72,1)>.30)*(np.mod(y*72,1)<.43)*.09
    grain=rng.normal(0,.014,(size,size));mottle=.04*np.sin(x*math.tau*4+.6*np.sin(y*math.tau*3))
    value=np.clip(1-lines-strokes+grain+mottle,.40,1.1)
    a=np.ones((size,size,4),np.float32);a[:,:,:3]=np.array(ma.diffuse_color[:3])[None,None,:]*value[:,:,None]
    im=bpy.data.images.new(ma.name+' ledger print',size,size,alpha=True);im.pixels.foreach_set(a.ravel());im.pack()
    node=ma.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;ma.node_tree.links.new(node.outputs['Color'],ma.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    surface_normal(ma,'cloth',.11)
for ma,seed in [(PAPER,21),(PALE,31),(PURPLE,41)]:record_texture(ma,seed)

def bone(n,h,t,p=None):SK[n]={'head':Vector(h),'tail':Vector(t),'parent':p}
def rim(name,c,r,depth,ma,bones,rz=None):
    x,y,z=c;rz=rz or r
    return line(name,[(x+r*math.cos(math.tau*j/96),y,z+rz*math.sin(math.tau*j/96)) for j in range(97)],depth,ma,bones)
def ribbon(name,path,widths,ma,bones,n=65,cols=8,twist=0,orient='front',thick=.008,edges=True):
    points=cat(path,n);vs=[];fs=[];uv=[];left=[];right=[]
    for i,c in enumerate(points):
        t=i/(n-1);d=(points[min(i+1,n-1)]-points[max(i-1,0)]).normalized()
        normal=Vector((0,-1,0)) if orient=='front' else Vector((c.x,c.y,0)).normalized()
        if normal.length<.1:normal=Vector((0,-1,0))
        u=d.cross(normal).normalized()
        if u.length<.1:u=d.orthogonal().normalized()
        v=u.cross(d).normalized();angle=twist*math.sin(math.pi*t);u2=u*math.cos(angle)+v*math.sin(angle);v2=-u*math.sin(angle)+v*math.cos(angle)
        width=prof(t,widths)
        for j in range(cols+1):
            a=j/cols*2-1
            lift=width*(.13*(a*a)+.035*math.sin(3*math.pi*a+8*t))
            p=c+u2*width*a+v2*lift;vs.append(p);uv.append((j/cols,t*2.5))
            if j==0:left.append(p)
            if j==cols:right.append(p)
    for i in range(n-1):
        for j in range(cols):q=i*(cols+1)+j;fs.append((q,q+1,q+cols+2,q+cols+1))
    ob=mesh(name,vs,fs,ma,bones,uv);solid(ob,thick)
    if edges:
        line(name+' left raised edge',left,.004,EDGE,bones);line(name+' right raised edge',right,.004,EDGE,bones)
    return ob

bone('root',(0,0,0),(0,0,.2));bone('pelvis',(0,.02,1.0),(0,.02,1.42),'root');bone('spine',(0,.02,1.42),(0,0,2.12),'pelvis');bone('chest',(0,0,2.12),(0,0,3.10),'spine')
bone('core',(0,-.35,2.72),(0,-.35,3.12),'chest');bone('pupil',(0,-.54,2.72),(0,-.54,2.99),'core')
tube('Twisted dark inner trunk',[(0,.07,1.0),(-.08,.06,1.6),(.08,.04,2.05),(0,.04,2.65),(0,.035,3.12)],[(0,.30),(.25,.37),(.55,.30),(.77,.45),(1,.25)],DARK,['pelvis','spine','chest'],n=74,sides=44,flat=.75,fold=.025)

# Four spreading roots; dark supports are wrapped in long, pointed record bands.
for side,sx,sy in [('FR',-1,-1),('FL',1,-1),('BR',-1,1),('BL',1,1)]:
    h=Vector((sx*.20,sy*.15,1.38));k=Vector((sx*.48,sy*.31,.63));a=Vector((sx*(.32 if sy<0 else 1.13),sy*.57,.12))
    bone('thigh'+side,h,k,'pelvis');bone('shin'+side,k,a,'thigh'+side);bone('foot'+side,a,a+Vector((sx*.12,sy*.10,-.07)),'shin'+side)
    names=['thigh'+side,'shin'+side,'foot'+side]
    def legpoint(t,angle,offset=0):
        ease=t*t*(3-2*t);base=h.lerp(Vector((a.x,a.y,0)),ease);base.x+=sx*.045*math.sin(math.pi*t);base.z=h.z*(1-t)
        r=prof(t,[(0,.151),(.16,.215),(.46,.169),(.68,.15),(.86,.19),(1,.29)])
        r=r*(1+.055*math.sin(6*angle+3*t)+.025*math.cos(11*angle-2*t))+offset
        return base+Vector((r*math.cos(angle),r*.84*math.sin(angle),0))
    vs=[];fs=[];uv=[];R=54;N=48
    for i in range(R+1):
        for j in range(N):vs.append(legpoint(i/R,math.tau*j/N));uv.append((j/N,i/R*2))
    for i in range(R):
        for j in range(N):a0=i*N+j;a1=i*N+(j+1)%N;fs.append((a0,a0+N,a1+N,a1))
    fs.extend([tuple(range(N)),tuple(reversed([R*N+j for j in range(N)]))]);mesh('Flared grounded root '+side,vs,fs,PURPLE,names,uv)
    for j in range(8):
        vs=[];fs=[];uv=[];edge=[];rows=56;cols=7
        for i in range(rows+1):
            t=i/rows;center=math.tau*j/8+(.4 if sy<0 else -.3)+sx*(2.45*t+.19*math.sin(4*t+j*.32))
            half=.365+.055*math.sin(4*t+j)+.055*math.sin(math.pi*t)
            for k0 in range(cols+1):
                u=k0/cols;ang=center+(u*2-1)*half;tt=t*(1-.016*(.5+.5*math.sin(j+u*4))*t**5)
                v=legpoint(tt,ang,.008+.012*math.sin(math.pi*u)+.002*math.sin(10*t+2*u));vs.append(v);uv.append((u,2.3*tt))
                if k0==0:edge.append(v)
        for i in range(rows):
            for k0 in range(cols):q=i*(cols+1)+k0;fs.append((q,q+cols+1,q+cols+2,q+1))
        ob=mesh('Ground hugging spiral record '+side+str(j),vs,fs,[PAPER,PURPLE,PAPER,PALE][j%4],names,uv);solid(ob,.004)
        line('Narrow pressed root hem '+side+str(j),edge,.0025,EDGE,names)

# Long intertwined body strips, with separate front and rear layers.
for j in range(17):
    ps=[];phase=math.tau*j/17
    for i in range(12):
        t=i/11;z=.68+2.55*t;a=phase+t*4.4;r=prof(t,[(0,.30),(.25,.42),(.48,.33),(.75,.46),(1,.23)])
        x=r*math.cos(a);y=r*.78*math.sin(a)+.06
        # Keep the core opening clear at the front of the torso.
        if y<0 and 2.18<z<3.18:
            dx=x;dz=z-2.72;rad=math.sqrt(dx*dx+dz*dz)
            if rad<.53:
                if abs(dx)<.025:dx=.025*(1 if j%2 else -1)
                factor=.53/max(.06,math.sqrt(dx*dx+dz*dz));x=dx*factor;z=2.72+dz*factor
        ps.append((x,y,z))
    ribbon('Interwoven body record '+str(j),ps,[(0,.015),(.12,.10),(.50,.13),(.86,.11),(1,.006)],[PAPER,PALE,PURPLE][j%3],['pelvis','spine','chest'],n=85,orient='radial',twist=.28)

# The central abyss eye: convex glossy pupil, radially marked iris, violet inner edge.
ell('Large silver iris',(0,-.405,2.72),(.435,.135,.47),IRIS,['core'])
ell('Glossy abyss pupil',(0,-.535,2.72),(.246,.135,.275),BLACK,['pupil'])
rim('Dark outer socket',(0,-.395,2.72),.463,.028,LID,['core'],.51)
rim('Fine violet inner ring',(0,-.460,2.72),.444,.004,GLOW,['core'],.48)
for j in range(64):
    a=math.tau*j/64;r0=.85 if j%4==0 else .91
    ps=[]
    for r in [r0,.98]:
        x=.425*r*math.cos(a);z=2.72+.46*r*math.sin(a);y=-.405-.135*math.sqrt(max(0,1-r*r))-.009;ps.append((x,y,z))
    line('Iris radial mark',ps,.0023 if j%4==0 else .0014,INK,['core'])
# Slender framing strips curve past the eye and end in separate sharp tips.
for sign in [-1,1]:
    for j in range(3):
        r=.51+j*.04
        ps=[(sign*(.31+j*.05),-.32,1.98-j*.07),(sign*(r-.055),-.38-j*.025,2.30),(sign*r,-.40-j*.018,2.70),(sign*(r-.07),-.33,3.06),(sign*(.17+j*.025),-.22,3.34),(sign*(.06+j*.05),-.14,3.61+j*.07)]
        ribbon('Tapered core mantle '+str(sign)+str(j),ps,[(0,.002),(.15,.07),(.43,.06),(.68,.085),(.86,.04),(1,.001)],[PALE,PURPLE,PAPER][j],['chest'],n=78,twist=sign*.26)

# A broken, pointed crown of layered record strips, with no humanoid head.
for j in range(8):
    a=math.tau*j/8;x=.29*math.cos(a);y=.21*math.sin(a)
    top=(.02+math.sin(a)*.09,.04+math.cos(a)*.06,3.94-(j%3)*.14)
    ps=[(x,y,2.96),(x*1.2,y*1.3,3.19),(x*.55,y*.8,3.52),top]
    ribbon('Pointed folded crown '+str(j),ps,[(0,.10),(.4,.16),(.7,.08),(1,.001)],[PAPER,PALE,PURPLE][j%3],['chest'],n=50,orient='radial',twist=.45)

def wing_shape(sign,row):
    paths=[[(.36,.01,3.04),(.88,.14,3.13),(1.56,.40,3.56),(2.34,.71,3.79),(2.93,.96,3.64),(3.19,.90,3.30),(3.25,.82,3.01)],
           [(.39,.025,2.67),(1.04,.10,2.66),(1.99,.24,2.93),(2.77,.39,2.92),(3.43,.50,2.66),(3.76,.45,2.27),(3.78,.34,1.90)],
           [(.36,.06,2.27),(.90,.03,2.12),(1.56,-.08,1.99),(2.21,-.20,1.77),(2.74,-.31,1.49),(2.97,-.34,1.12),(2.96,-.30,.82)]]
    return [Vector((sign*x,y,z)) for x,y,z in paths[row]]
def wing_basis(points,t):
    i=min(len(points)-2,max(0,int(t*(len(points)-1))));f=t*(len(points)-1)-i;c=points[i].lerp(points[i+1],f)
    d=(points[min(i+2,len(points)-1)]-points[max(0,i-1)]).normalized();u=Vector((-d.z,0,d.x)).normalized();return c,u
for sign,s in [(-1,'R'),(1,'L')]:
    for row in range(3):
        key=s+str(row);path=wing_shape(sign,row);pts=cat(path,101);root=pts[0];mid=pts[48];end=pts[78];tip=pts[-1]
        names=['wingRoot'+key,'wingMid'+key,'wingTip'+key]
        bone(names[0],root,mid,'chest');bone(names[1],mid,end,names[0]);bone(names[2],end,tip,names[1]);WINGS[key]=(sign,row,names)
        first=len(ASSETS)
        # A broad tapered underlayer with continuous printed surface.
        width=[(0,.07),(.20,.13),(.40,.27),(.59,.36 if row!=2 else .31),(.76,.25),(.91,.075),(1,.001)]
        ribbon('Broad record wing '+key,path,width,PURPLE,names,n=101,cols=12,twist=sign*.18,thick=.014)
        # Four overlapping flowing bands separated by narrow dark grooves.
        for lane in range(4):
            ps=[]
            for i in range(17):
                t=i/16;c,u=wing_basis(pts,t);w=prof(t,width);offset=(-.72+lane*.48+.25*math.sin(8*t+lane*1.6))*w
                c+=u*offset; c.y-=.035+.008*lane+.015*math.sin(math.pi*t+lane)
                c.z+=.025*math.sin(7*t+lane)*math.sin(math.pi*t);ps.append(c)
            widths=[(0,.018),(.20,.045),(.43,.092),(.60,.127 if row!=2 else .106),(.76,.095),(.91,.027),(1,.0007)]
            ribbon('Flowing layered wing strip '+key+str(lane),ps,widths,[PAPER,PALE,PAPER,PURPLE][lane],names,n=90,cols=6,twist=sign*(.12+lane*.04))
        # Root strands join all three tiers separately into the torso.
        for lane in [-1,0,1]:
            ps=[root+Vector((-sign*.16,-.07,lane*.045)),root+Vector((sign*.2,-.09,lane*.05)),pts[27]+Vector((0,-.07,lane*.07))]
            ribbon('Independent wing root cord '+key+str(lane),ps,[(0,.075),(.5,.045),(1,.006)],PAPER,names,n=40,cols=6)
        # A row of small eyes lies inside a dark slit between the record bands.
        slit=[]
        for i in range(20):
            t=.29+i/19*.57;c,u=wing_basis(pts,t);c.y-=.072;slit.append(c)
        ribbon('Dark eye row slit '+key,slit,[(0,.001),(.15,.073),(.78,.073),(1,.001)],DARK,names,n=60,cols=6,thick=.005,edges=False)
        for j in range(6):
            t=.30+j*.078;c,u=wing_basis(pts,t);c.y-=.088
            radius=.050*(1-.25*max(0,(t-.65)/.2));ob=ell('Wing silver eye '+key+str(j),c,(radius*1.38,.027,radius*.67),SMALL,names)
            tangent=pts[min(100,int(t*100)+1)]-pts[max(0,int(t*100)-1)];ob.rotation_euler[1]=-math.atan2(tangent.z,tangent.x)
            ell('Wing black pupil '+key+str(j),c+Vector((0,-.024,0)),(.007,.006,.014),BLACK,names)
            for side in [-1,1]:
                ps=[]
                d=Vector((tangent.x,0,tangent.z)).normalized();v=Vector((-d.z,0,d.x))
                for k in range(13):
                    r=k/12*2-1;ps.append(c+d*(radius*1.4*r)+v*(side*radius*.67*math.sqrt(max(0,1-r*r)))+Vector((0,-.021,0)))
                line('Almond wing eyelid '+key+str(j),ps,.006,LID,names)

        # Unequal pointed slips lift away from the trailing edge at different distances.
        for q in range(4):
            start=.13+.095*q;end=.53+.112*q;ps=[]
            for ii in range(13):
                a=ii/12;t=start+(end-start)*a;c,u=wing_basis(pts,t);ww=prof(t,width)
                c+=u*(sign*(-.74*ww-.12*a*a));c.z-=.15*a*a;c.y+=.035+.07*math.sin(math.pi*a);ps.append(c)
            ribbon('Staggered trailing slip '+key+str(q),ps,[(0,.02),(.25,.12),(.62,.11),(.9,.051),(1,.0004)],[PURPLE,PAPER,PALE,PAPER][q],names,n=42,twist=sign*(.85-.12*q),edges=False)
        # Raise each printed skin over a lenticular volume. The reverse side carries
        # its own visible record strips and eyes, as shown in the rear view.
        from mathutils.kdtree import KDTree
        tree=KDTree(len(pts))
        for ii,c in enumerate(pts):tree.insert((c.x,0,c.z),ii)
        tree.balance();bpy.context.view_layer.update()
        shell=[];faces=[];tex=[];segs=20
        def deep(t):return .012+.14*math.sin(math.pi*t)**.82 if t<.99 else .003
        for ii,c in enumerate(pts):
            t=ii/(len(pts)-1);_,u=wing_basis(pts,t);ww=prof(t,width)
            for jj in range(segs):
                ang=math.tau*jj/segs;pp=c+u*math.cos(ang)*ww+Vector((0,math.sin(ang)*deep(t),0));shell.append(pp);tex.append((jj/segs,t*2))
        for ii in range(len(pts)-1):
            for jj in range(segs):a=ii*segs+jj;b=ii*segs+(jj+1)%segs;faces.append((a,b,b+segs,a+segs))
        originals=list(ASSETS[first:]);mesh('Inside of folded wing '+key,shell,faces,DARK,names,tex)
        for ob in originals:
            old=ob.matrix_world.copy();rear=[]
            for vert in ob.data.vertices:
                p=old@vert.co;_,ii,dist=tree.find((p.x,0,p.z));t=ii/(len(pts)-1);c,u=wing_basis(pts,t);ww=max(.01,prof(t,width));ratio=(p-c).dot(u)/ww
                p.y-=deep(t)*math.sqrt(max(.012,1-ratio*ratio));vert.co=p;rear.append((p.x,2*c.y-p.y,p.z))
            ob.matrix_world=Matrix.Identity(4)
            if 'raised edge' not in ob.name and 'eyelid' not in ob.name:
                copy=ob.copy();copy.data=ob.data.copy();copy.name='Reverse '+ob.name;bpy.context.collection.objects.link(copy);ASSETS.append(copy)
                for vert,p in zip(copy.data.vertices,rear):vert.co=p
                copy.data.flip_normals()

# Root tips touch the ground. Scale to a proposed 12 m height; source gives no numeric size.
for ob in ASSETS:
    ma=ob.matrix_world.copy()
    for v in ob.data.vertices:v.co=ma@v.co;v.co.z=max(0,v.co.z)
    ob.matrix_world=Matrix.Identity(4)
maxz=max(v.co.z for o in ASSETS for v in o.data.vertices);scale=12/maxz
for ob in ASSETS:
    for v in ob.data.vertices:v.co*=scale
for data in SK.values():data['head']*=scale;data['tail']*=scale
exec(open(os.path.join(os.path.dirname(__file__),'rigging.py'),encoding='utf-8').read())

sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120;arm.animation_data_create()
for name in ['idle','wing_sweep','devour','abyss_gaze']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,4):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        pulse=math.sin(math.pi*f/120)**2;wave=math.sin(math.tau*f/120)
        def world_rotate(n,axis,degrees):
            b=ad.bones[n];local_axis=b.matrix_local.to_3x3().inverted()@Vector(axis);arm.pose.bones[n].rotation_quaternion=Quaternion(local_axis,math.radians(degrees))
        for key,(sign,row,names) in WINGS.items():
            if name=='idle':
                world_rotate(names[0],(0,1,0),sign*1.3*wave*(1 if row%2 else -1));world_rotate(names[1],(0,0,1),sign*1.5*wave)
            elif name=='wing_sweep':
                world_rotate(names[0],(0,0,1),(31-row*3 if sign<0 else 10+row*2)*pulse);world_rotate(names[1],(0,1,0),(9+row*2)*pulse);world_rotate(names[2],(0,1,0),sign*12*pulse)
            elif name=='devour':
                world_rotate(names[0],(0,0,1),-sign*(49-row*4)*pulse);world_rotate(names[1],(0,0,1),-sign*35*pulse);world_rotate(names[2],(0,1,0),sign*12*pulse)
            elif name=='abyss_gaze':world_rotate(names[2],(0,1,0),sign*3*wave)
        if name=='wing_sweep':world_rotate('chest',(0,0,1),-15*pulse)
        if name=='devour':world_rotate('chest',(1,0,0),7*pulse);arm.pose.bones['pupil'].scale=(1+.22*pulse,1,1+.22*pulse)
        if name=='abyss_gaze':
            arm.pose.bones['pupil'].scale=(1+.15*pulse,1,1+.15*pulse);world_rotate('core',(0,0,1),3*wave)
        for p in arm.pose.bones:p.keyframe_insert('rotation_quaternion',frame=f);p.keyframe_insert('location',frame=f);p.keyframe_insert('scale',frame=f)
    tr=arm.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,act);tr.mute=True
arm.animation_data.action=None;studio.neutral()
for ma in list(bpy.data.materials):
    obs=[o for o in sc.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==ma]
    if len(obs)>1:
        activate(obs[0])
        for ob in obs:ob.select_set(True)
        bpy.ops.object.join();bpy.context.object.name=ma.name
models=[o for o in sc.objects if o.type in ['MESH','ARMATURE']];activate(arm)
for ob in models:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'boundary_eater.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
verts=[v.co for o in models if o.type=='MESH' for v in o.data.vertices]
stats={'bones':len(ad.bones),'vertices':len(verts),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bytes':os.path.getsize(os.path.join(OUT,'boundary_eater.glb')),'height_m':max(p.z for p in verts)-min(p.z for p in verts),'width_m':max(p.x for p in verts)-min(p.x for p in verts),'scale_factor':scale,'cast_engine_tested':False}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2);studio.setup();studio.prepare_edit_view();bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'boundary_eater.blend'))
if '--skip-stills' not in sys.argv:
    for k in ['front','side','back','three_quarter','core','wing','roots']:studio.render(os.path.join(OUT,k+'.png'),k)
print('DONE',stats,flush=True)
