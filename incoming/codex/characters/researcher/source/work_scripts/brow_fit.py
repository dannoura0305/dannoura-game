from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'natural_shapes.py';s=p.read_text('utf8')
s=s.replace(" project_surface(material_ids[5],orbital_surfaces[3],result,.00125)", """ ids=material_ids[5];uv=acc(me['primitives'][0]['attributes']['TEXCOORD_0'])[ids];delta=points[ids]-rest[0][ids]
 sign=np.sign(rest[0][ids,0]);t=np.where(sign>0,(uv[:,0]-.55)/.365,(.45-uv[:,0])/.365)
 result[ids,0]=sign*(.0145+.042*t)+.86*delta[:,0]
 result[ids,1]=1.6177+.0030*np.sin(np.pi*t)-.0006*t+(.51-uv[:,1])*.023+.90*delta[:,1]+sign*.00045
 project_surface(ids,orbital_surfaces[3],result,.00135)""")
p.write_text(s,'utf8')
p=w/'orbital_fit.py';s=p.read_text('utf8').replace('mid+.0049*shape','mid+.0062*shape');p.write_text(s,'utf8')
p=w/'natural_layers.py';s=p.read_text('utf8').replace('35+15*np.exp','57+16*np.exp').replace('((u+.26)/.10)','((u+.23)/.14)').replace('((v+.32)/.095)','((v+.06)/.11)').replace('[164,156,149]','[216,204,192]');p.write_text(s,'utf8')
p=w/'build_natural.py';s=p.read_text('utf8').replace("'natural_layers.py','natural_parts.py'","'natural_layers.py','orbit_detail.py','natural_parts.py'");p.write_text(s,'utf8')
