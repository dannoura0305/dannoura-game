from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'build.py';s=p.read_text('utf8').replace('eye=np.exp(-((y-1.436)/.024)**4)*smooth((.080-a)/.012)*front','eye=np.exp(-((y-1.436)/.024)**4)*smooth((.080-a)/.012)*smooth((a-.010)/.013)*front').replace('q[:,1]+=.0105*ga(a/.028,(y-1.359)/.013)','q[:,1]+=.0055*ga(a/.032,(y-1.359)/.021)').replace('np.uint8(a[:,:,3]*.78)','np.uint8(a[:,:,3]*.63)')
s=s.replace(" if k in (3,7):m['pbrMetallicRoughness']", " if k==3:m.pop('normalTexture',None)\n if k in (3,7):m['pbrMetallicRoughness']")
p.write_text(s,'utf8')
p=w/'bob.py';s=p.read_text('utf8').replace('edge=.003*np.sin(47*r+side)+.002*np.sin(83*r)','edge=.005*np.sin(47*r+side)+.0035*np.sin(83*r)+.004*np.cos(23*r)').replace('.020*(1-r)**4;c2[:,0]+=.031*(1-r)**4','.010*(1-r)**4;c2[:,0]+=.043*(1-r)**4').replace('.012*(1-r)**3;c3[:,0]+=.011*(1-r)**4','.022*(1-r)**3;c3[:,0]+=.019*(1-r)**4').replace('side*.0016*np.exp(-r*6)','side*.00015*np.exp(-r*6)').replace('pos+=normal*(wave+outer)[:,None];', '''pos[:,0]+=side*.006*np.sin(t*7.4+r*6)*smooth((t-.37)/.55)
 pos[:,2]+=.004*np.sin(r*20+t*5)*t**2
 pos+=normal*(wave+outer)[:,None];''').replace("*(1-.61*v)*smooth(v/.055)","*(1-.38*v)*(.33+.67*smooth(v/.075))").replace("lum=53+fibres","lum=43+fibres").replace("length=rng.uniform(.96,1.075)","length=rng.uniform(.95,1.13)")
p.write_text(s,'utf8')
p=w/'tailoring.py';s=p.read_text('utf8');a=s.index('  x=np.interp(t,[0,.22');b=s.index(" gridprim('Notched",a)
s=s[:a]+"""  # Lay the lapel along the front opening with a raised roll and a notched tip.
  width=np.interp(t,[0,.17,.24,.27,.39,.71,1],[.014,.058,.034,.063,.067,.033,.001])
  along=.006+.29*t
  torso=coat_shape(np.zeros_like(t),along)
  x0=torso[:,0];x=x0+width*(1-u)-.006*u
  near=coat_shape(.076*(1-u)*width/.060,along)
  return np.stack((side*x,torso[:,1]+.006*(1-u)*np.sin(np.pi*t),near[:,2]+.005+.004*np.sin(np.pi*u)),1)
"""+s[b:]
s=s.replace("t=(.084+u*.126) if side>0 else (1-.084-u*.126)","t=(.028+u*.088) if side>0 else (1-.028-u*.088)").replace("q=coat_shape(t,.56+v*.084)","q=coat_shape(t,.18+v*.25,2)").replace('(.006+.002*np.sin(np.pi*u))','(.007+.002*np.sin(np.pi*u))')
p.write_text(s,'utf8')
