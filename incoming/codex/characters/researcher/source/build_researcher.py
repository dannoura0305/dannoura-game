import bpy,sys,os,json,math,random
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
W=Path(__file__).resolve().parent; OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(exist_ok=True)
sys.path.insert(0,str(W))
from geometry import *
import studio
bpy.ops.wm.read_factory_settings(use_empty=True)
S=.00206
def P(x,y,h):return Vector(((x-180)*S,y*S,(979-h)*S))
def mix(a,b,t):return a*(1-t)+b*t
def smooth(v):v=max(0,min(1,v));return v*v*(3-2*v)
def metal(name,col,rough=.42,m=.55):
    ma=mat(name,col,rough);ma.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=m;return ma
skin=mat('Warm natural skin',(.28,.205,.185),.70);nail=mat('Natural nail',(.36,.28,.255),.56);rim=metal('Graphite spectacle wire',(.034,.030,.031));dark=mat('Recorder charcoal casing',(.025,.024,.03),.57);brass=metal('Brushed steel hardware',(.22,.21,.205));leather=mat('Black belt leather',(.038,.031,.026),.70);black=mat('Brushed dark pen',(.018,.022,.024),.49);cloth=mat('Pale cotton facing',(.55,.51,.51),.90);seam=mat('Grey seam',(.38,.35,.34),.91)
em=mat('Violet record signal',(.40,.13,.70),.32);bs=em.node_tree.nodes['Principled BSDF'];bs.inputs['Emission Color'].default_value=(.44,.13,.95,1);bs.inputs['Emission Strength'].default_value=2.5
SK={}
def B(n,h,t,par=None):SK[n]=(P(*h),P(*t),par)
B('root',(180,0,979),(180,0,930));B('pelvis',(180,0,475),(180,0,417),'root');B('spine',(180,0,417),(180,1,345),'pelvis');B('chest',(180,1,345),(180,1,256),'spine');B('neck',(180,1,256),(180,0,216),'chest');B('head',(180,0,216),(180,0,125),'neck')
for s,k in [('L',1),('R',-1)]:
    B('upperArm'+s,(180+72*k,1,274),(180+105*k,-1,401),'chest');B('foreArm'+s,(180+105*k,-1,401),(180+116*k,-14,529),'upperArm'+s);B('hand'+s,(180+116*k,-14,529),(180+117*k,-15,563),'foreArm'+s)
    B('thigh'+s,(180+34*k,1,474),(180+50*k,-9,706),'pelvis');B('shin'+s,(180+50*k,-9,706),(180+62*k,4,938),'thigh'+s);B('foot'+s,(180+62*k,4,938),(180+65*k,-63,967),'shin'+s)
    for j,d in [('Front',-1),('Back',1)]:B('hem'+j+s,(180+38*k,d*26,474),(180+65*k,d*42,705),'pelvis')
parts=json.loads((W/'parts.json').read_text());lookup={}
def tag(o,key):o['region']=key;return o
def stripe(name,ps,r,ma,key):return tag(tube(name,[P(*p) for p in ps],[(0,r*S),(1,r*S)],ma,[key],n=max(10,len(ps)*2),sides=8),key)
def blob(name,pos,rad,ma,key):return tag(ell(name,P(*pos),tuple(r*S for r in rad),ma,[key]),key)
def box(name,pos,sz,ma,key,bev=1):
    bpy.ops.mesh.primitive_cube_add(size=1,location=P(*pos));o=bpy.context.object;o.name=name;o.dimensions=tuple(v*S for v in sz);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(ma)
    m=o.modifiers.new('Rounded edges','BEVEL');m.width=bev*S;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Face normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name);ASSETS.append(o);return tag(o,key)
for part in parts:
    name=part['name'];im=bpy.data.images.load(str(W/'textures'/(name+'.jpg')));im.pack();ma=mat(name.replace('_',' ').title(),(.5,.48,.48),.84 if 'shoe' not in name else .65)
    n=ma.node_tree.nodes.new('ShaderNodeTexImage');n.image=im;ma.node_tree.links.new(n.outputs['Color'],ma.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    o=mesh(name,[P(*v) for v in part['xyz']],part['faces'],ma,[part['rig']],part['uv']);tag(o,part['rig']);lookup[name]=o
    if part['rig']=='coat':solid(o,.0013)
# Overlapping swept locks follow the reconstructed scalp from a side part.
rng=random.Random(19)
hair_shell=next(part for part in parts if part['name']=='swept_pepper_hair')['xyz']
def scalp(angle,level):
    u=angle/math.tau%1*128
    v=min(1,max(0,level))*54
    i,j=int(u),min(53,int(v))
    def row(j):
        a=Vector(hair_shell[j*129+i]);b=Vector(hair_shell[j*129+i+1])
        return a.lerp(b,u-i)
    pt=row(j).lerp(row(j+1),v-j)
    if level>1:pt.z+=(level-1)*48
    return pt
palette=[mat('Hair strand '+str(i),(g,g*.94,g*.96),.66) for i,g in enumerate([.019,.023,.029,.035,.042,.052])]
for direction,count,fan in [(-1,64,2.88),(1,53,2.83)]:
    verts=[];faces=[];indices=[]
    for j in range(count):
        end=.24+direction*(j+.48+rng.uniform(-.28,.28))/count*fan
        start=.24+(end-.24)*rng.uniform(.12,.46)
        v0=rng.uniform(.095,.39);v1=rng.uniform(.89,1.12)
        width=rng.uniform(.025,.068);rise=rng.uniform(1.1,2.8);slot=rng.randrange(len(palette))
        for step in range(15):
            t=step/14;flow=t*t*(3-2*t)
            angle=start+(end-start)*(.67*flow+.33*t)
            level=v0+(v1-v0)*t
            taper=math.sin(math.pi*t)**.75
            for across in [-1,0,1]:
                a=angle+across*width*taper
                pt=scalp(a,level)
                d=(.42+rise*taper*(1-.67*abs(across)))
                pt.x+=math.sin(a)*d;pt.y-=math.cos(a)*d;pt.z-=d*(1-level)*.65
                verts.append(P(*pt))
            if step:
                q=len(verts)-6
                for edge in [0,1]:
                    faces.append((q+edge,q+edge+1,q+edge+4,q+edge+3));indices.append(slot)
    ob=mesh('Swept locks '+str(direction),verts,faces,palette[0],['head'])
    for material in palette[1:]:ob.data.materials.append(material)
    for poly,slot in zip(ob.data.polygons,indices):poly.material_index=slot
    tag(ob,'head')
# Thin frames follow the reference portrait. Rounded trapezoids, bridge and ear stems.
for k,s in [(-1,'R'),(1,'L')]:
    coords=[(2.8,-44,169.7),(9,-43,168.1),(19,-39.8,167.6),(25.1,-34.8,169.5),(24.7,-34.8,175.0),(22.2,-36,180.1),(16,-40,181.5),(9,-44,181.1),(5,-45.2,178.4),(2.8,-44,169.7)]
    stripe('Lens rim '+s,[(180+k*x,y-1.8,h) for x,y,h in coords],.48,rim,'head')
    stripe('Temple '+s,[(180+k*25,-37,169.5),(180+k*32,-24,170.0),(180+k*35,-3,170.9),(180+k*35,4,177.2)],.64,rim,'head')
stripe('Glasses bridge',[(177,-46,170.7),(180,-48.4,170),(183,-46,170.7)],.53,rim,'head')
# Undercollar, folded shirt points and breast pocket equipment.
def panel(name,points,ma,k):
    o=tag(mesh(name,[P(*p) for p in points],[tuple(range(len(points)))],ma,[k]),k);solid(o,.0011);return o
shirt=mat('Charcoal shirt collar',(.06,.048,.052),.87)
for k in [-1,1]:
    panel('Shirt collar point',[(180+20*k,-16,235),(180+29*k,-27,248),(180+23*k,-38,278),(180+6*k,-37,258)],shirt,'chest')
    panel('Notched lapel',[(180+24*k,-24,242),(180+54*k,-30,263),(180+42*k,-43,274),(180+51*k,-42,278),(180+29*k,-46,324),(180+17*k,-38,347)],cloth,'chest')
# Real belt loop and separately modeled recording unit on left hip.
ps=[(180+56.5*math.sin(t*math.tau/96),1-37*math.cos(t*math.tau/96),463) for t in range(97)]
vs=[];faces=[]
for x,y,h in ps:vs.extend([P(x,y,h-7),P(x,y,h+7)])
for i in range(96):faces.append((i*2,2*i+1,2*i+3,2*i+2))
tag(mesh('Leather waistband',vs,faces,leather,['pelvis']),'pelvis')
for k in [-1,1]:box('Buckle side',(181+k*8,-38,463),(1.4,2.0,14),brass,'pelvis',.5);box('Buckle rail',(181,-38,463+k*6.5),(16,2,1.5),brass,'pelvis',.5)
box('Recorder belt clip',(221,-34,464),(18,8,39),brass,'pelvis',2);box('Record module',(222,-42,466),(23,10,46),dark,'pelvis',2.3)
box('Module lower seam',(222,-47.2,483),(19,.8,2),black,'pelvis',.4)
def ring(name,x,y,h,r,wd,ma,key):
    return stripe(name,[(x+r*math.cos(i*math.tau/64),y,h+r*math.sin(i*math.tau/64)) for i in range(65)],wd,ma,key)
ring('Machined signal bezel',222,-47.8,462,6.4,1.6,black,'pelvis');ring('Violet recording light',222,-49,462,5.65,.85,em,'pelvis')
for a in [-1,1]:
    for b in [-1,1]:blob('Recorder screw',(222+8.6*a,-47.2,466+18*b),(1,.4,1),brass,'pelvis')
for i in range(2):
    x=236+i*7;stripe('Pocket pen '+str(i),[(x,-34,330),(x-1,-35,315-i*2)],1.25,black,'chest')
    stripe('Pen clip',[(x-1,-36,316),(x-2,-37,319),(x-1,-37,324)],.45,brass,'chest')
stripe('Violet sleeve circuit L',[(298,-14,409),(298,-21,430),(288,-29,452),(291,-31,473),(294,-32,505),(299,-31,509)],.69,em,'foreArmL')
# Anatomical hands, rounded fingers with knuckle creases and individually posed digits.
for k,s in [(-1,'R'),(1,'L')]:
    x=180+k*116;key='hand'+s
    blob('Wrist '+s,(x,-14,531),(11,9,14),skin,key);blob('Palm '+s,(x,-15,549),(13,8.5,21),skin,key)
    for j,(dx,l) in enumerate([(-8.4,27),(-2.9,31),(3.3,28),(8.7,23)]):
        px=x+k*dx;keyf='finger'+str(j+1)+s;root=(px,-15,561+abs(dx)*.12);tip=(px+k*(1.2+dx*.10),-20.5,root[2]+l)
        B(keyf,root,tip,key);path=[root,(px+k*dx*.09,-14,root[2]+l*.4),(px+k*(1+dx*.12),-16.6,root[2]+l*.76),tip]
        tag(tube('Finger '+keyf,[P(*q) for q in path],[(0,3.6*S),(.4,3.2*S),(.7,2.7*S),(1,2*S)],skin,[keyf],n=19,sides=12),keyf)
        blob('Fingertip '+keyf,tip,(2.05,2.3,2.1),skin,keyf);blob('Nail '+keyf,(tip[0],tip[1]-2.0,tip[2]-2.5),(1.75,.54,3),nail,keyf)
    bn='thumb'+s;p0=(x-k*10,-16,542);p1=(x-k*17,-20,553);p2=(x-k*15,-25,567);B(bn,p0,p2,key)
    tag(tube('Opposing thumb '+s,[P(*q) for q in [p0,p1,p2]],[(0,4.5*S),(.5,4*S),(1,2.5*S)],skin,[bn],n=20,sides=14),bn);blob('Thumb tip '+s,p2,(2.6,2.8,3),skin,bn)
# Shoe soles match the profile; black rubber is visible from below when kneeling.
for k,s in [(-1,'R'),(1,'L')]:
    x=180+k*68;ps=[(x+26*math.sin(i*math.tau/68),-25-51*math.cos(i*math.tau/68),976.9) for i in range(69)]
    stripe('Outsole welt '+s,ps,1.35,leather,'foot'+s)
# Construct rig and smoothly weight cloth separately from underlying trouser legs.
ad=bpy.data.armatures.new('Researcher skeleton');arm=bpy.data.objects.new('Researcher | human boss',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,(h,t,par) in SK.items():b=ad.edit_bones.new(n);b.head=h;b.tail=t
for n,(h,t,par) in SK.items():
    if par:ad.edit_bones[n].parent=ad.edit_bones[par]
bpy.ops.object.mode_set(mode='OBJECT')
def pair(a,b,t):
    t=smooth(t);return {a:1-t,b:t}
def weights(key,x,y,p):
    if key in ('torso','coat'):
        if p<327:res={'chest':1}
        elif p<369:res=pair('chest','spine',(p-327)/42)
        else:res=pair('spine','pelvis',(p-383)/72)
        if key=='coat' and p>470:
            t=smooth((p-470)/109);front=smooth((24-y)/50);l=smooth((x-166)/28)
            res={n:a*(1-t) for n,a in res.items()}
            for side,ss in [('L',l),('R',1-l)]:
                for d,m in [('Front',front),('Back',1-front)]:res['hem'+d+side]=t*ss*m
        return res
    if key.startswith('arm') and len(key)==4:return pair('upperArm'+key[-1],'foreArm'+key[-1],(p-378)/49)
    if key.startswith('leg') and len(key)==4:return pair('thigh'+key[-1],'shin'+key[-1],(p-677)/58)
    if key=='neck':return pair('head','chest',(p-218)/37)
    return {key:1}
bpy.context.view_layer.update()
for o in ASSETS:
    kw=o['region'];groups={};world=o.matrix_world.copy()
    for v in o.data.vertices:
        pt=world@v.co;v.co=pt;ds=weights(kw,180+pt.x/S,pt.y/S,979-pt.z/S);items=sorted(ds.items(),key=lambda it:-it[1])[:4];total=sum(a for n,a in items)
        for n,a in items:
            if a<=.000001:continue
            if n not in groups:groups[n]=o.vertex_groups.new(name=n)
            groups[n].add([v.index],a/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mo=o.modifiers.new('Character rig','ARMATURE');mo.object=arm;o.data.update()
sc=bpy.context.scene;sc.frame_start=0;sc.frame_end=120;sc.render.fps=30;arm.animation_data_create()
def update():bpy.context.view_layer.update()
def rot(n,axis,deg):
    p=arm.pose.bones[n];ax=ad.bones[n].matrix_local.to_3x3().inverted()@Vector(axis);p.rotation_quaternion=Quaternion(ax,math.radians(deg))
def setw(n,h,t):
    b=ad.bones[n];m=(b.tail_local-b.head_local).rotation_difference(t-h).to_matrix().to_4x4()@b.matrix_local;m.translation=h;arm.pose.bones[n].matrix=m;update()
def ikarm(s,target,pole,handvec):
    up='upperArm'+s;lo='foreArm'+s;hand='hand'+s;h=arm.pose.bones[up].head.copy();a=ad.bones[up].length;b=ad.bones[lo].length;d=target-h;length=min(d.length,a+b-.00001);d.normalize();target=h+d*length
    along=(a*a-b*b+length*length)/(2*length);v=pole-d*pole.dot(d);v.normalize();e=h+d*along+v*math.sqrt(max(0,a*a-along*along));setw(up,h,e);setw(lo,e,target);setw(hand,target,target+handvec)
def restpole(s):
    return SK['foreArm'+s][0]-SK['upperArm'+s][0]
boot_offsets=[v.co-SK['foot'+s][0] for s in ['L','R'] for o in ASSETS if o.name in ['laced_shoe_'+s,'Outsole welt '+s] for v in o.data.vertices]
for name in ['idle','record_check','accident_replay','neutralized']:
    act=bpy.data.actions.new(name);arm.animation_data.action=act
    for f in range(0,121,5):
        for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
        a=math.sin(math.pi*f/120)**2;wave=math.sin(math.tau*f/120);update()
        if name=='idle':rot('chest',(1,0,0),.75*wave);rot('head',(0,0,1),2.8*wave)
        elif name=='record_check':
            rot('chest',(1,0,0),5*a);rot('neck',(1,0,0),10*a);rot('head',(1,0,0),14*a);update()
            if a>.0001:
                s='R';h=SK['hand'+s][0];ikarm(s,mix(h,P(195,-86,456),a),mix(restpole(s),Vector((-.25,-.08,-.30)),a),mix(SK['handR'][1]-h,Vector((.055,-.025,-.014)),a))
        elif name=='accident_replay':
            rot('chest',(0,0,1),-10*a);rot('head',(0,0,1),-13*a);update()
            if a>.0001:
                s='R';h=SK['handR'][0];ikarm(s,mix(h,P(9,-195,318),a),mix(restpole(s),Vector((-.22,.03,-.28)),a),mix(SK['handR'][1]-h,Vector((-.054,-.066,.026)),a))
            for j in range(4):rot('finger'+str(j+1)+'R',(0,1,0),(j-1.5)*6*a)
            rot('thumbR',(0,1,0),-12*a);rot('upperArmL',(0,1,0),-6*a);rot('hemFrontR',(0,1,0),8*a);rot('hemBackR',(1,0,0),13*a)
        elif name=='neutralized' and a>.0001:
            # Independent thigh/shin orientations keep the shins parallel to the floor at the endpoint.
            T=Quaternion((1,0,0),math.radians(-52*a));K=Quaternion((1,0,0),math.radians(86*a));F=Quaternion((1,0,0),math.radians(165*a))
            ref='R';tv=SK['thighR'][1]-SK['thighR'][0];sv=SK['shinR'][1]-SK['shinR'][0]
            ankle=SK['footR'][0];ankle_height=max(ankle.z,-min((F@v).z for v in boot_offsets)+.0008);dz=ankle_height-(SK['thighR'][0]+T@tv+K@sv).z
            offset=Vector((0,.09*a,dz));h,t,_=SK['pelvis'];setw('pelvis',h+offset,t+offset)
            rot('chest',(1,0,0),22*a);rot('neck',(1,0,0),12*a);rot('head',(1,0,0),21*a);update()
            for s,k in [('R',-1),('L',1)]:
                h=SK['thigh'+s][0]+offset;e=h+T@(SK['thigh'+s][1]-SK['thigh'+s][0]);ank=e+K@(SK['shin'+s][1]-SK['shin'+s][0]);setw('thigh'+s,h,e);setw('shin'+s,e,ank);foot='foot'+s;fm=F.to_matrix().to_4x4()@ad.bones[foot].matrix_local;fm.translation=ank;arm.pose.bones[foot].matrix=fm;update()
                rot('hemFront'+s,(1,0,0),-51*a);rot('hemBack'+s,(1,0,0),54*a);update()
                target=mix(SK['hand'+s][0]+offset,e+Vector((k*.012,-.015,.071)),a)
                ikarm(s,target,mix(restpole(s),Vector((k*.10,.05,-.32)),a),mix(SK['hand'+s][1]-SK['hand'+s][0],Vector((0,-.05,-.045)),a))
        for p in arm.pose.bones:
            p.keyframe_insert('rotation_quaternion',frame=f);p.keyframe_insert('location',frame=f)
    tr=arm.animation_data.nla_tracks.new();tr.name=name;tr.strips.new(name,0,act);tr.mute=True
arm.animation_data.action=None;studio.neutral()
# Scene-only ghost study is produced from actual imported pose in validation.
activate(arm)
for ob in ASSETS:ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'researcher.glb'),export_format='GLB',use_selection=True,export_animations=True,export_skins=True)
verts=[v.co for ob in ASSETS for v in ob.data.vertices];stats={'bones':len(SK),'height_m':max(v.z for v in verts)-min(v.z for v in verts),'triangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in ASSETS),'glb_bytes':(OUT/'researcher.glb').stat().st_size}
(OUT/'build_stats.json').write_text(json.dumps(stats,indent=2))
studio.setup();studio.prepare_edit_view();bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'researcher.blend'))
print('BUILT',stats,flush=True)
