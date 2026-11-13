from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'natural_shapes.py'
s=p.read_text('utf8');a=s.index(' eye_zone=');b=s.index(' # Support',a);s=s[:a]+''' shift=lid_warp(x,y,z)
 result[:,1]+=shift
'''+s[b:]
s=s.replace('.0060*lower','.0018*lower').replace('.0065*ga','.0035*ga').replace('.0045*ga(x/.031','.0025*ga(x/.031').replace('.0035*smooth((a-.005)/.016)','.00065*smooth((a-.005)/.016)').replace('eye_zone[ids]*eye_shift[ids]','shift[ids]').replace('+=.0014+.26','+=.0002+.21')
s=s.replace(' return result\n',''' for mat,offset in ((1,.00040),(2,.00062)):
  project_surface(material_ids[mat],orbital_surfaces[4],result,offset)
 project_surface(material_ids[5],orbital_surfaces[3],result,.00125)
 return result
''')
p.write_text(s,'utf8')
p=w/'natural_base.py';s=p.read_text('utf8').replace("exec(compile((W/'natural_shapes.py')","exec(compile((W/'orbital_fit.py').read_text('utf8'),str(W/'orbital_fit.py'),'exec'))\nexec(compile((W/'natural_shapes.py')");s=s.replace(' def deform(points):',' orbital_surfaces={p[\'material\']:acc(p[\'indices\']).reshape(-1,3) for p in me[\'primitives\']}\n def deform(points):')
p.write_text(s,'utf8')
p=w/'natural_layers.py';s=p.read_text('utf8').replace('51+16*np.exp','35+15*np.exp').replace('[21,20,21]','[11,10,11]').replace('region[:,:,:3]=np.clip(eye,0,255)','''glint=np.exp(-((u+.26)/.10)**2-((v+.32)/.095)**2)
   eye=eye*(1-glint[...,None]) + np.array([164,156,149])*glint[...,None]
   region[:,:,:3]=np.clip(eye,0,255)''').replace('170*np.exp','75*np.exp').replace('dy=(v-.51)*51','dy=(v-.51)*83').replace('(skin-brow+4)/75','(skin-brow+1)/78')
p.write_text(s,'utf8')
