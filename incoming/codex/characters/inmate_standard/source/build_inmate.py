"""Reference-led standard research-wing inmate. Metres, front = -Y.
Run: blender -b -P build_inmate.py -- output_directory
"""
import bpy,math,os,sys,json,random
import numpy as np
from mathutils import Vector,Matrix
from mathutils.noise import noise_vector
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE)
import studio,garment_weights
OUT=os.path.abspath(sys.argv[sys.argv.index('--')+1]);os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);random.seed(18)
ASSETS=[];SK={};EYES=[]

def texture(name,base,contrast=.1,size=1024):
    rng=np.random.default_rng(22);field=np.zeros((size,size),np.float32)
    ys,xs=np.mgrid[0:size,0:size]/size
    for n,amp in [(5,.4),(18,.23),(61,.14),(190,.07)]:
        grid=rng.random((n+1,n+1));x=xs*n;y=ys*n;ix=x.astype(int);iy=y.astype(int)
        fx=x-ix;fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
        layer=(grid[iy,ix]*(1-fx)+grid[iy,ix+1]*fx)*(1-fy)+(grid[iy+1,ix]*(1-fx)+grid[iy+1,ix+1]*fx)*fy
        field+=(layer-.5)*amp
    fiber=(np.sin(xs*math.tau*420)+np.sin(ys*math.tau*380))*.012
    val=1+field*contrast*5+fiber
    px=np.ones((size,size,4),np.float32);px[:,:,:3]=np.clip(np.array(base)[None,None,:]*val[:,:,None],0,1)
    im=bpy.data.images.new(name,size,size,alpha=True);im.pixels.foreach_set(px.ravel());im.pack();return im

def mat(name,col,rough=.85,tex=False,contrast=.1):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*col,1)
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*col,1);p.inputs['Roughness'].default_value=rough
    if tex:
        im=texture(name+' woven colour',col,contrast)
        node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;m.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
    return m
CLOTH=mat('Worn ash grey institution cloth',(.34,.335,.325),tex=True,contrast=.10)
PANTS=mat('Charcoal cotton trousers',(.19,.187,.18),tex=True,contrast=.16)
SKIN=mat('Pallid grey skin',(.46,.45,.42),.76,True,.09)
SEAM=mat('Weathered seams',(.25,.245,.23));THREAD=mat('Dull stitching',(.43,.42,.39))
LABEL=mat('Blank cloth identifier',(.48,.47,.43),tex=True,contrast=.14)
BAND=mat('Ivory wrist band',(.67,.66,.61),.8,True,.05)
NAIL=mat('Grey fingernails',(.14,.135,.12),.65)
DARK=mat('Small recessed eyes',(.045,.040,.032),.63)
MOUTH=mat('Fine mouth crease',(.055,.05,.045),.85)
SHOE=mat('Grey fabric slippers',(.30,.295,.28),tex=True,contrast=.12)
SOLE=mat('Worn rubber sole',(.22,.215,.20),.9)

def activate(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def mesh(name,vs,fs,material,bones,uv=None):
    me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    me.materials.append(material)
    for p in me.polygons:p.use_smooth=True
    if uv:
        layer=me.uv_layers.new(name='UVMap')
        for p in me.polygons:
            coords=[uv[me.loops[li].vertex_index] for li in p.loop_indices]
            wrap=max(c[0] for c in coords)-min(c[0] for c in coords)>.8
            for li,c in zip(p.loop_indices,coords):layer.data[li].uv=(c[0]+(1 if wrap and c[0]<.1 else 0),c[1])
    o['bones']=','.join(bones);ASSETS.append(o);return o
def ell(name,c,r,material,bones):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=36,ring_count=24,location=c);o=bpy.context.object;o.name=name;o.scale=r
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
    for p in o.data.polygons:p.use_smooth=True
    o['bones']=','.join(bones);ASSETS.append(o);return o
def cat(points,n):
    p=[Vector(x) for x in points];result=[]
    for j in range(n):
        t=j/(n-1)*(len(p)-1);i=min(int(t),len(p)-2);t-=i
        a=p[max(0,i-1)];b=p[i];c=p[i+1];d=p[min(len(p)-1,i+2)]
        result.append(.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t))
    return result
def prof(t,pairs):
    if t<=pairs[0][0]:return pairs[0][1]
    for (a,x),(b,y) in zip(pairs,pairs[1:]):
        if t<=b:return x+(y-x)*(t-a)/(b-a)
    return pairs[-1][1]
def tube(name,path,radii,material,bones,n=40,sides=32,flat=1,fold=0,cap=True):
    pts=cat(path,n);vs=[];fs=[];uv=[];prev=Vector((1,0,0))
    for i,c in enumerate(pts):
        t=i/(n-1);d=(pts[min(i+1,n-1)]-pts[max(i-1,0)]).normalized();a=prev-d*prev.dot(d)
        if a.length<.01:a=d.orthogonal()
        a.normalize();b=d.cross(a).normalized();prev=a;r=prof(t,radii)
        for j in range(sides):
            th=math.tau*j/sides;rr=r+fold*(.65*math.sin(7*th+5*t)+.35*math.sin(13*th-17*t))
            # Gathered cloth folds near sleeve hems and trouser ankles.
            rr+=fold*.6*math.sin(57*t+2*th)*max(0,(t-.55)/.45)
            vs.append(c+rr*(a*math.cos(th)+b*math.sin(th)*flat));uv.append((j/sides,t))
    for i in range(n-1):
        for j in range(sides):
            a=i*sides+j;b=i*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
    if cap:fs.extend([tuple(reversed(range(sides))),tuple((n-1)*sides+j for j in range(sides))])
    return mesh(name,vs,fs,material,bones,uv)
def line(name,points,r,material,bones):
    return tube(name,points,[(0,r),(1,r)],material,bones,n=max(10,len(points)*3),sides=8)
def solid(o,thick=.004):
    activate(o);m=o.modifiers.new('Fabric thickness','SOLIDIFY');m.thickness=thick;bpy.ops.object.modifier_apply(modifier=m.name)
def union(name,obs,bones):
    activate(obs[0])
    for o in obs:o.select_set(True);ASSETS.remove(o)
    bpy.ops.object.join();o=bpy.context.object;o.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    m=o.modifiers.new('Continuous skin','REMESH');m.mode='VOXEL';m.voxel_size=.0022;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Skin smooth','SMOOTH');m.factor=.75;m.iterations=4;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Skin reduction','DECIMATE');m.ratio=.6;bpy.ops.object.modifier_apply(modifier=m.name)
    if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap')
    uv=o.data.uv_layers.active
    for loop in o.data.loops:
        p=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x*4,p.z*3)
    for p in o.data.polygons:p.use_smooth=True
    o['bones']=','.join(bones);ASSETS.append(o);return o

def bone(name,a,b,parent=None):SK[name]={'head':a,'tail':b,'parent':parent}
bone('root',(0,0,0),(0,0,.18));bone('pelvis',(0,.02,.82),(0,.02,1.06),'root')
bone('spine1',(0,.02,1.06),(0,.06,1.42),'pelvis');bone('chest',(0,.06,1.42),(0,.10,1.88),'spine1')
bone('neck',(0,.1,1.88),(0,-.12,1.84),'chest');bone('head',(0,-.12,1.84),(0,-.21,1.96),'neck')
bone('jaw',(0,-.17,1.75),(0,-.24,1.70),'head')

# One continuous garment: rounded, raised shoulders surrounding a deep U collar.
def robe_point(t,th):
    front=max(0,math.cos(th));top=1.995-.43*front**7-.018*math.cos(2*th)
    u=min(1,t/.88);z=.455+u*(top-.455)
    rx=prof(z,[(.45,.255),(.85,.26),(1.30,.265),(1.70,.285),(2,.315)])
    ry=prof(z,[(.45,.155),(1,.148),(1.55,.165),(2,.16)])
    cy=.018+.09*(max(0,(z-1.1)/.9))**1.3
    fold=.008*math.sin(9*th+3*t)+.004*math.sin(17*th-5*t)
    fold+=front*.009*math.sin(31*t+3*abs(math.sin(th)))*(math.sin(math.pi*t)**.6)
    # Fine irregularity keeps the long hem and shoulders from looking machined.
    fold+=.0016*math.sin(37*th+47*t)
    if t>.84:
        a=(t-.84)/.16;a=a*a*(3-2*a)
        rx=rx*(1-a)+.097*a;ry=ry*(1-a)+.080*a;cy=cy*(1-a)-.145*a
        z=z*(1-a)+(1.960-.270*front)*a
        fold*=1-a*.8
    return Vector(((rx+fold)*math.sin(th),cy-(ry+fold)*math.cos(th),z))
vs=[];uv=[];fs=[];N=112;R=80
for i in range(R+1):
    for j in range(N):vs.append(robe_point(i/R,math.tau*j/N));uv.append((j/N,i/R*2))
for i in range(R):
    for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
robe=mesh('Long draped tunic',vs,fs,CLOTH,['pelvis','spine1','chest'],uv);solid(robe,.006)
for t in (.010,.025):line('Double stitched hem',[robe_point(t,math.tau*j/100) for j in range(101)],.0012,SEAM,['pelvis'])
line('Rolled U collar',[robe_point(.998,math.tau*j/120) for j in range(121)],.0055,CLOTH,['chest'])
line('Centre back seam',[robe_point(t,math.pi)+Vector((0,.003,0)) for t in [i/50 for i in range(51)]],.0012,SEAM,['pelvis','spine1','chest'])

# The smooth, feature-sparse head leans out from between the shoulders.
head=ell('Small elongated head',(0,-.155,1.825),(.096,.100,.153),SKIN,['head'])
for v in head.data.vertices:
    t=(v.co.z/.153+1)/2;v.co.x*=.73+.33*t;v.co.y-=.009*(1-t)
    v.co+=noise_vector(v.co*23)*.0013
for sd in (1,-1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=16,location=(sd*.042,-.244,1.796))
    cutter=bpy.context.object;cutter.scale=(.009,.010,.0065)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    activate(head);mod=head.modifiers.new('Small recessed eye socket','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    eye=ell('Deep small eye',(sd*.042,-.239,1.796),(.0055,.002,.0035),DARK,['head']);EYES.append(eye)
line('Closed mouth crease',[(-.038,-.239,1.746),(-.018,-.248,1.743),(0,-.250,1.743),(.020,-.247,1.744),(.039,-.237,1.748)],.0010,MOUTH,['head'])

for sd,s in [(1,'L'),(-1,'R')]:
    m=lambda x,y,z:(sd*x,y,z)
    bone('upperArm'+s,m(.275,.075,1.87),m(.335,.025,1.40),'chest')
    bone('foreArm'+s,m(.335,.025,1.40),m(.35,-.04,.97),'upperArm'+s)
    bone('hand'+s,m(.35,-.04,.97),m(.36,-.065,.79),'foreArm'+s)
    bone('thigh'+s,m(.125,.025,.88),m(.125,.015,.45),'pelvis')
    bone('shin'+s,m(.125,.015,.45),m(.125,.015,.105),'thigh'+s)
    bone('foot'+s,m(.125,.015,.105),m(.125,-.16,.05),'shin'+s)
    sleeve=tube('Loose sleeve '+s,[m(.245,.085,1.94),m(.290,.075,1.83),m(.315,.06,1.66),m(.34,.025,1.42),m(.35,-.025,1.20)],[(0,.025),(.14,.109),(.38,.091),(.72,.081),(1,.096)],CLOTH,['upperArm'+s,'foreArm'+s],n=65,sides=56,fold=.006,cap=False);solid(sleeve,.005)
    for z,r in [(1.205,.097),(1.230,.095),(1.245,.092)]:
        line('Layered sleeve cuff '+s,[m(.35+r*math.cos(a),-.025+r*math.sin(a),z+.004*math.cos(3*a)) for a in [math.tau*j/64 for j in range(65)]],.0015,SEAM,['foreArm'+s])
    skin=[tube('Forearm skin '+s,[m(.35,-.02,1.25),m(.355,-.04,1.10),m(.354,-.05,.91)],[(0,.053),(.5,.045),(.85,.032),(1,.032)],SKIN,['foreArm'+s],n=36)]
    skin.append(ell('Palm '+s,m(.354,-.057,.855),(.049,.030,.115),SKIN,['hand'+s]))
    digits=[]
    for k,(dx,endz) in enumerate([(-.033,.652),(-.010,.623),(.014,.635),(.035,.673)]):
        base=m(.354+dx,-.062,.806);end=m(.354+dx+.004,-.081,endz);mid=m(.354+dx+.006,-.090,(.806+endz)*.5)
        bn='finger'+str(k+1)+s;bone(bn,base,end,'hand'+s);digits.append(bn)
        skin.append(tube('Long finger '+bn,[base,mid,end],[(0,.0105),(.4,.0095),(.94,.008),(1,.004)],SKIN,[bn],n=24,sides=20))
        skin.append(ell('Knuckle '+bn,mid,(.010,.010,.015),SKIN,[bn]))
        nail=ell('Nail '+bn,(end[0],end[1]-.017,end[2]+.017),(.0058,.0015,.011),NAIL,[bn])
    bn='thumb'+s;bone(bn,m(.316,-.058,.88),m(.286,-.091,.735),'hand'+s);digits.append(bn)
    skin.append(tube('Thumb '+s,[m(.32,-.055,.88),m(.289,-.065,.814),m(.282,-.085,.766),m(.295,-.10,.743)],[(0,.020),(.5,.015),(1,.010)],SKIN,[bn],n=30,sides=20))
    ell('Thumb nail '+s,m(.291,-.108,.758),(.008,.0016,.012),NAIL,[bn])
    union('Continuous arm and hand '+s,skin,['foreArm'+s,'hand'+s]+digits)
    if sd==1:
        band=tube('Blank identification wristband',[m(.354,-.048,.987),m(.354,-.048,1.017)],[(0,.0405),(1,.042)],BAND,['foreArm'+s],n=3,sides=48,cap=False);solid(band,.002)
    pants=tube('Baggy trousers '+s,[m(.125,.025,.85),m(.128,.02,.58),m(.127,.015,.38),m(.125,.015,.16),m(.125,.01,.095)],[(0,.102),(.4,.095),(.7,.083),(.88,.088),(1,.061)],PANTS,['thigh'+s,'shin'+s],n=70,sides=56,fold=.009)
    ell('Slipper sole '+s,m(.125,-.065,.025),(.079,.148,.025),SOLE,['foot'+s])
    ell('Fabric slipper '+s,m(.125,-.053,.055),(.075,.139,.052),SHOE,['foot'+s])
    line('Slipper opening '+s,[m(.125+.057*math.cos(a),.016+.047*math.sin(a),.088+.004*math.sin(a)) for a in [math.tau*j/48 for j in range(49)]],.0024,SEAM,['foot'+s])
    line('Slipper toe seam '+s,[m(.125+.065*math.cos(a),-.077-.086*math.sin(a),.055+.020*math.sin(a)) for a in [math.pi*j/32 for j in range(33)]],.0015,THREAD,['foot'+s])

# Blank, stitched identifier on the left breast. No invented lettering.
bpy.ops.mesh.primitive_cube_add(size=1,location=(.13,-.142,1.555));patch=bpy.context.object;patch.name='Blank chest cloth label';patch.scale=(.087,.007,.064)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);patch.data.materials.append(LABEL);patch['bones']='chest';ASSETS.append(patch)
mod=patch.modifiers.new('Worn soft corners','BEVEL');mod.width=.003;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
for i in range(10):
    x=.091+i*.0085
    for z in (1.526,1.584):line('Label hand stitching',[(x,-.147,z-.0015),(x+.001,-.148,z+.0015)],.00055,THREAD,['chest'])
for i in range(6):
    z=1.532+i*.0085
    for x in (.089,.171):line('Label side stitch',[(x-.0015,-.147,z),(x+.0015,-.148,z+.001)],.00055,THREAD,['chest'])

# Fit the label and its stitches directly to the garment's curved surface.
for o in [o for o in ASSETS if o.name.startswith(('Blank chest','Label hand','Label side'))]:
    for v in o.data.vertices:
        p=o.matrix_world@v.co;th=math.asin(max(-.99,min(.99,p.x/.278)))
        for _ in range(5):
            top=1.995-.43*max(0,math.cos(th))**7-.018*math.cos(2*th)
            t=.88*(p.z-.455)/(top-.455);rp=robe_point(t,th)
            th+=(p.x-rp.x)/.26
        p.y=rp.y-.004+(p.y+.142)
        v.co=o.matrix_world.inverted()@p

# Bind a conventional humanoid skeleton, with independent long digits.
ad=bpy.data.armatures.new('Inmate skeleton');arm=bpy.data.objects.new('Inmate rig',ad);bpy.context.collection.objects.link(arm)
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
        vals=[math.exp(-(d-near[0][0])*45) for d,n in near];total=sum(vals)
        for (d,n),w in zip(near,vals):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;m=o.modifiers.new('Skin rig','ARMATURE');m.object=arm;o.data.validate();o.data.update()
for o in EYES:
    o.shape_key_add(name='Basis');key=o.shape_key_add(name='blink');cz=sum(v.co.z for v in key.data)/len(key.data)
    for v in key.data:v.co.z=cz+(v.co.z-cz)*.04;v.co.y+=.004
    key.value=0

sc=bpy.context.scene;sc.render.fps=30;sc.frame_start=0;sc.frame_end=120
arm.animation_data_create()
for name,frames in [('idle',120),('walk',48)]:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,frames+1,4):
        ph=math.tau*f/frames
        for p in arm.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        arm.pose.bones['chest'].rotation_euler.x=math.radians(.5)*math.sin(ph)
        arm.pose.bones['head'].rotation_euler.z=math.radians(.6)*math.sin(ph*.999)
        if name=='walk':
            for sd,s in [(1,'L'),(-1,'R')]:
                q=ph+(0 if sd==1 else math.pi)
                arm.pose.bones['thigh'+s].rotation_euler.x=math.radians(10)*math.sin(q)
                arm.pose.bones['shin'+s].rotation_euler.x=math.radians(9)*max(0,-math.sin(q))
                arm.pose.bones['foot'+s].rotation_euler.x=-arm.pose.bones['thigh'+s].rotation_euler.x-arm.pose.bones['shin'+s].rotation_euler.x
                arm.pose.bones['upperArm'+s].rotation_euler.x=math.radians(-3)*math.sin(q)
            arm.pose.bones['pelvis'].location.y=.003*math.sin(2*ph)
        for p in arm.pose.bones:
            p.keyframe_insert('rotation_euler',frame=f);p.keyframe_insert('location',frame=f)
    track=arm.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,act);track.mute=True
arm.animation_data.action=None;studio.neutral()

# Merge static details sharing materials and weights; keep the eye morphs separate.
for material in [CLOTH,PANTS,SKIN,SEAM,THREAD,LABEL,BAND,NAIL,MOUTH,SHOE,SOLE]:
    obs=[o for o in sc.objects if o.type=='MESH' and o.data.materials[0]==material and not o.data.shape_keys]
    if len(obs)>1:
        activate(obs[0])
        for o in obs:o.select_set(True)
        bpy.ops.object.join();bpy.context.object.name=material.name
models=[o for o in sc.objects if o.type in ('MESH','ARMATURE')]
for o in models:
    if o.type=='MESH' and o.data.materials[0] in [CLOTH,SEAM]:garment_weights.fit(o)
activate(arm)
for o in models:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'inmate_standard.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True,export_morph=True,export_morph_normal=False)
stats={'vertices':sum(len(o.data.vertices) for o in models if o.type=='MESH'),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in models if o.type=='MESH'),'bones':len(ad.bones),'bytes':os.path.getsize(os.path.join(OUT,'inmate_standard.glb')),'cast_engine_tested':False,'walk_is_in_place':True}
json.dump(stats,open(os.path.join(OUT,'build_stats.json'),'w'),indent=2)
studio.setup(1000,32)
for k in ('front','side','back','three_quarter','face','hand'):studio.render(os.path.join(OUT,k+'.png'),k)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'inmate_standard.blend'))
print('DONE',stats,flush=True)
