from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'likeness.py';s=p.read_text(encoding='utf8')
s=s.replace('  return result','''  if mi==1:
   for layer in me['primitives']:
    mat=layer['material']
    if mat not in (8,12):continue
    ids=np.unique(acc(layer['indices']));xx,yy,zz=points[ids].T;ax=abs(xx)
    if mat==8:
     hem=smooth((1.06-yy)/.33)*smooth((.37-ax)/.12)
     result[ids,0]-=xx*.062*hem
     result[ids,1]+=hem*(.008*np.sin(17*xx+2)+.006*np.sin(31*xx-1))
     wave=.0045*hem*np.cos(48*xx+8*yy)
    else:
     wave=.0035*(ga((yy-.49)/.09,(ax-.092)/.12)+ga((yy-.17)/.08,(ax-.10)/.11))*np.sin(67*yy+20*xx+3*np.sin(8*xx))
    result[ids,2]+=wave*np.tanh((zz+.025)/.025)
  return result''')
s=s.replace(' if k in (9,14):\n  u=x/w;', '''  field,valid=field_in_uv(1,7,(512,512))
  hand=smooth((abs(field[:,:,0])-.647)/.026)*valid
  hand=np.asarray(Image.fromarray((255*hand).astype('uint8')).filter(ImageFilter.MaxFilter(5)).resize((w,h),Image.Resampling.BILINEAR))/255.
  paint=hand*smooth((158-rgb.mean(2))/50)
  warm=np.array([183,153,140])+np.clip((rgb.mean(2)-70)*.11,-7,5)[...,None]
  rgb=rgb*(1-paint[...,None])+warm*paint[...,None]
 if k in (9,14):
  u=x/w;''')
p.write_text(s,encoding='utf8')
p=w/'likeness_parts.py';s=p.read_text(encoding='utf8')
idx=s.index('# Add the recorder')
s=s[:idx]+'''# Folded shirt collar, fitted to the front neck opening of the VRoid coat.
chest=j['extensions']['VRMC_vrm']['humanoid']['humanBones']['chest']['node']
collar=Geometry()
for sign in (-1,1):
 rows=[[(.009,1.449,.039),(.019,1.443,.045),(.036,1.412,.065)],[(.031,1.480,.019),(.042,1.466,.025),(.052,1.437,.047)],[(.045,1.497,-.011),(.053,1.485,-.009),(.062,1.464,.008)],[(.041,1.502,-.053),(.052,1.489,-.056),(.063,1.476,-.055)],[(.000,1.499,-.086),(.000,1.489,-.094),(.000,1.476,-.096)]]
 off=len(collar.pos)
 for row in rows:collar.pos.extend([[sign*x,y,z] for x,y,z in row])
 for r in range(4):
  for c in range(2):
   a=off+3*r+c;collar.tri.extend([(a,a+1,a+3),(a+1,a+4,a+3)])
body.append(collar.primitive(material('Shirt | folded charcoal collar',[.054,.047,.052],.92),chest))
'''+s[idx:]
a=s.index("struct.pack('<4sIIII4s'");b=s.index("struct.pack('<4sIII4s'",a);s=s[:a]+s[b:]
p.write_text(s,encoding='utf8')
p=w/'render_likeness.py';s=p.read_text(encoding='utf8').replace("[(upper,(0,1,0),sign*69)]","[(upper,(0,1,0),sign*75)]")
s=s.replace(' bpy.context.view_layer.update()\npose()', '''  hand=next((b for b in arm.pose.bones if b.name=='J_Bip_'+side+'_Hand'),None)
  if hand:
   hand.rotation_mode='QUATERNION';hand.rotation_quaternion=Quaternion((0,1,0),math.radians(sign*19))
 bpy.context.view_layer.update()
pose()''')
p.write_text(s,encoding='utf8')
