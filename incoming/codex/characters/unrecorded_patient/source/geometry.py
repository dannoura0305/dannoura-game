import bpy,math,random
import numpy as np
from mathutils import Vector,Matrix
ASSETS=[]

def texture(name,base,contrast=.1,size=1024):
    rng=np.random.default_rng(22);field=np.zeros((size,size),np.float32)
    ys,xs=np.mgrid[0:size,0:size]/size
    for n,amp in [(5,.4),(18,.23),(61,.14),(190,.07)]:
        grid=rng.random((n+1,n+1));grid[-1,:]=grid[0,:];grid[:,-1]=grid[:,0]
        x=xs*n;y=ys*n;ix=x.astype(int);iy=y.astype(int)
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

def surface_normal(material,kind,strength,size=1024):
    """Tileable tangent normal image, packed and portable through glTF."""
    y,x=np.mgrid[0:size,0:size]/size;rng=np.random.default_rng(104)
    h=np.zeros((size,size),dtype=np.float32)
    if kind=='skin':
        for _ in range(32):
            fx=int(rng.integers(35,170));fy=int(rng.integers(-130,130))
            h+=np.sin(math.tau*(fx*x+fy*y)+rng.uniform(0,math.tau))*.018
        h+=.13*np.sin(math.tau*(24*y+2*np.sin(math.tau*x*3)))
    elif kind=='knit':
        # Offset V-shaped loops and vertical ribs, repeated at cloth scale.
        u=x*96;v=y*140
        h=.20*np.cos(math.tau*(u+.22*np.sin(math.tau*v)))
        h+=.11*np.cos(math.tau*(v+.18*np.cos(math.tau*u)))
    else:
        h=.12*np.sin(math.tau*x*380)+.12*np.sin(math.tau*y*350)
        h+=.07*np.sin(math.tau*(39*x+11*y))
    dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*strength
    dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*strength
    n=np.stack((-dx,-dy,np.ones_like(h)),axis=2);n/=np.linalg.norm(n,axis=2)[:,:,None]
    rgba=np.ones((size,size,4),dtype=np.float32);rgba[:,:,:3]=n*.5+.5
    im=bpy.data.images.new(material.name+' surface normal',size,size,alpha=True)
    im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(rgba.ravel());im.pack()
    nodes=material.node_tree.nodes;links=material.node_tree.links
    tex=nodes.new('ShaderNodeTexImage');tex.image=im
    normal=nodes.new('ShaderNodeNormalMap');links.new(tex.outputs['Color'],normal.inputs['Color'])
    links.new(normal.outputs['Normal'],nodes.get('Principled BSDF').inputs['Normal'])
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
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16 if max(r)<.025 else 32,ring_count=12 if max(r)<.025 else 22,location=c);o=bpy.context.object;o.name=name;o.scale=r
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
    return tube(name,points,[(0,r),(1,r)],material,bones,n=max(64,len(points)*10),sides=8)
def solid(o,thick=.004):
    activate(o);m=o.modifiers.new('Fabric thickness','SOLIDIFY');m.thickness=thick;bpy.ops.object.modifier_apply(modifier=m.name)
def union(name,obs,bones):
    activate(obs[0])
    for o in obs:o.select_set(True);ASSETS.remove(o)
    bpy.ops.object.join();o=bpy.context.object;o.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    m=o.modifiers.new('Continuous skin','REMESH');m.mode='VOXEL';m.voxel_size=.0032;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Skin smooth','SMOOTH');m.factor=.75;m.iterations=4;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('Skin reduction','DECIMATE');m.ratio=.6;bpy.ops.object.modifier_apply(modifier=m.name)
    if not o.data.uv_layers:o.data.uv_layers.new(name='UVMap')
    uv=o.data.uv_layers.active
    for loop in o.data.loops:
        p=o.data.vertices[loop.vertex_index].co;uv.data[loop.index].uv=(p.x*4,p.z*3)
    for p in o.data.polygons:p.use_smooth=True
    o['bones']=','.join(bones);ASSETS.append(o);return o

