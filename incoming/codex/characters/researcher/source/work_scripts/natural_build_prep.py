from pathlib import Path
w=Path(__file__).resolve().parent
def modified(src,dst,replacements):
 s=(w/src).read_text(encoding='utf8')
 for a,b in replacements:
  assert a in s,a
  s=s.replace(a,b)
 (w/dst).write_text(s,encoding='utf8')
modified('likeness.py','natural_base.py',[
 ("'blender_refined'","'natural_face'"),
 ('meshes=j[',"""exec(compile((W/'natural_shapes.py').read_text('utf8'),str(W/'natural_shapes.py'),'exec'))
meshes=j["""),
 (' def deform(points):',""" material_ids={p['material']:np.unique(acc(p['indices'])) for p in me['primitives']}
 def deform(points):"""),
 ('  return result','  return organic_face(points,result,mi,material_ids) if mi!=2 else result'),
 ('1.548,1.560','1.5445,1.560'),('365,330,295','365,326,295'),
 (' photo-=(6*bag+8*crease)[...,None]',""" photo-=(4*bag+4*crease)[...,None]
 # The narrow ridge just above the upper lid, and its shallow supratarsal fold.
 aa=[.019,.027,.033,.041,.050,.057,.065,.072]
 ridge=np.interp(ax,aa,[1.611,1.615,1.622,1.626,1.627,1.626,1.624,1.620])
 ew=smooth((ax-.018)/.010)*smooth((.071-ax)/.011)
 fold=ew*np.exp(-((y-ridge-.0023)/.0017)**2)
 lift=ew*np.exp(-((y-ridge)/.0020)**2)
 photo+=(-9*fold+5*lift)[...,None]
 # Remove strong frontal lighting from the albedo while retaining pores, adult
 # folds and lip colour. The studio or game lighting supplies the directional shade.
 neutral=np.array([160,136,125])
 coarse=sample(np.array(Image.fromarray(np.uint8(cleanref)).filter(ImageFilter.GaussianBlur(15))),X,Y)
 feature=smooth((ax-.019)/.020)*smooth((1.594-y)/.03)
 photo-=feature[...,None]*.31*(coarse-neutral)
 photo+=ga((ax-.052)/.030,(y-1.57)/.028)[...,None]*[3,-1,-2]"""),
 ('skin-=shade[...,None];mapped=np.clip(photo*.76+[38,30,24],48,235)',"""skin-=shade[...,None];mapped=np.clip(photo*.72+[48,35,27],52,235)
 # Ease the transition onto the sides of the head and ears.
 ear=smooth((ax-.076)/.026)*ga((y-1.597)/.046,(z+.015)/.062)
 skin+=ear[...,None]*[-8,-14,-14]"""),
 (' if k in (9,14):\n  u=x/w;',"""  # Blend colour and fine anatomical shading from the reference neck.
  fx,fy,fz=field.transpose(2,0,1);nm=smooth((1.535-fy)/.024)*smooth((fy-1.433)/.026)*smooth((.082-abs(fx))/.022)*valid
  neck=sample(np.array(Image.open(W/'face_ref.jpg').convert('RGB')),np.clip(349+fx*1300,283,424),np.clip(423+(1.512-fy)*1420,423,537))
  target=neck*.61+[63,48,42]
  weight=np.asarray(Image.fromarray(nm.astype('float32')).resize((w,h),Image.Resampling.BILINEAR))*mask
  target=np.array(Image.fromarray(np.uint8(np.clip(target,0,255))).resize((w,h),Image.Resampling.BILINEAR))
  rgb=rgb*(1-weight[...,None])+target*weight[...,None]
 if k in (9,14):
  u=x/w;""")])
modified('likeness_parts.py','natural_parts.py',[('researcher_refined','researcher_natural'),('研究者 | Blender造形版','研究者 | 自然な表情・調整版'),("='2.0'","='2.1'")])
modified('run_likeness.py','build_natural.py',[("'likeness.py','garment_finish.py','likeness_parts.py'","'natural_base.py','garment_finish.py','natural_layers.py','natural_parts.py'")])
modified('render_likeness.py','render_natural.py',[("'blender_refined'","'natural_face'"),('researcher_refined','researcher_natural'),("print('DONE',flush=True)","""vowel=next(k for k in face.data.shape_keys.key_blocks if k.name.lower()=='fcl_mth_a')
vowel.value=.68;bpy.context.view_layer.update();render('speaking',(0,-4,1.62),(0,0,1.601),.32,(500,510));vowel.value=0
print('DONE',flush=True)""")])
modified('likeness_delivery.py','natural_delivery.py',[('researcher/blender_refined','researcher/natural_face'),('researcher_refined','researcher_natural'),("""tile(w/'before_lit.png',(65,42,720,824),1,'調整前  ·  VRoid')""","""tile(out.parent/'blender_refined'/'portrait.png',(65,42,720,824),1,'前回')"""),('調整後  ·  正面','今回  ·  正面'),('調整後  ·  横顔','今回  ·  横顔')])
modified('audit_likeness.py','audit_natural.py',[('blender_refined','natural_face'),('researcher_refined','researcher_natural')])
