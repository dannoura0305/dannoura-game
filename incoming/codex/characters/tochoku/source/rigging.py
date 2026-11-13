# Bind every vertex, retaining sparse two-bone weights at articulation.
ad=bpy.data.armatures.new('Tochoku duty keeper skeleton');arm=bpy.data.objects.new('Tochoku duty keeper rig',ad);bpy.context.collection.objects.link(arm);activate(arm);bpy.ops.object.mode_set(mode='EDIT')
for n,d in SK.items():b=ad.edit_bones.new(n);b.head=d['head'];b.tail=d['tail']
for n,d in SK.items():
    if d['parent']:ad.edit_bones[n].parent=ad.edit_bones[d['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
def dist(p,a,b):
    ab=b-a;t=max(0,min(1,(p-a).dot(ab)/ab.length_squared));return (p-a-ab*t).length
for o in ASSETS:
    names=o['bones'].split(',');groups={n:o.vertex_groups.new(name=n) for n in names};world=o.matrix_world.copy()
    for v in o.data.vertices:
        p=world@v.co;v.co=p
        if o.name=='Continuous stitched work coveralls':
            weights={};neighbours=CLOTH_KD.find_n(p,12);nearest=neighbours[0][2]
            for co,idx,d in neighbours:
                factor=math.exp(-((d-nearest)/.016)**2)
                for n,w in CLOTH_SOURCE[idx].items():weights[n]=weights.get(n,0)+factor*w
            selected=sorted(weights.items(),key=lambda q:q[1],reverse=True)[:4];total=sum(w for n,w in selected)
            for n,w in selected:groups[n].add([v.index],w/total,'REPLACE')
        else:
            near=sorted((dist(p,SK[n]['head'],SK[n]['tail']),n) for n in names)[:2];ws=[math.exp(-(d-near[0][0])*45) for d,n in near];total=sum(ws)
            for (d,n),w in zip(near,ws):groups[n].add([v.index],w/total,'REPLACE')
    o.matrix_world=Matrix.Identity(4);o.parent=arm;mo=o.modifiers.new('Character skin','ARMATURE');mo.object=arm;o.data.validate();o.data.update()
def setworld(n,h,t):
    r=ad.bones[n];ma=r.matrix_local.copy();ma.translation=Vector((0,0,0));ma=(r.tail_local-r.head_local).rotation_difference(Vector(t)-Vector(h)).to_matrix().to_4x4()@ma;ma.translation=Vector(h);arm.pose.bones[n].matrix=ma;bpy.context.view_layer.update()
def ik(up,low,end,target,pole,direction):
    h=arm.pose.bones[up].head.copy();l1=(SK[low]['head']-SK[up]['head']).length;l2=(SK[end]['head']-SK[low]['head']).length;d=Vector(target)-h;length=max(abs(l1-l2)+.0001,min(d.length,l1+l2-.0001));d.normalize();target=h+d*length
    along=(l1*l1-l2*l2+length*length)/(2*length);height=math.sqrt(max(0,l1*l1-along*along));pole=Vector(pole);pole-=d*pole.dot(d)
    if pole.length<.001:pole=d.orthogonal()
    joint=h+d*along+pole.normalized()*height;setworld(up,h,joint);setworld(low,joint,target);setworld(end,target,target+Vector(direction))
