from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'build.py';s=p.read_text('utf8');a=s.index('  def detail');b=s.index(' if mi==1:',a)
s=s[:a]+"""  def detail(raw,buf):return ocular(raw,buf,q)
  base=detail(q,base)
"""+s[b:];s=s.replace('for mi,me in enumerate(meshes):',"filepart('eyes.py')\nfor mi,me in enumerate(meshes):")
s=s.replace(".0047*ga(a/.034,(y-1.359)/.012)",".0105*ga(a/.028,(y-1.359)/.013)")
s=s.replace("put(normals(base,tris,acc(attrs['NORMAL'])),i=attrs['NORMAL'])","""nrm=normals(base,tris,acc(attrs['NORMAL']))
 if mi==0:
  ids=np.unique(acc(me['primitives'][3]['indices']));_,inv=np.unique(np.round(base[ids],5),axis=0,return_inverse=True);grp=np.zeros((inv.max()+1,3));np.add.at(grp,inv,nrm[ids]);nrm[ids]=unit(grp[inv])
 put(nrm,i=attrs['NORMAL'])""")
s=s.replace("elif k==4:a[:,:,:3]=(rgb*.72+[15,13,12]).clip(0,255)","elif k==4:a[:,:,:3]=(rgb*.61+[19,13,12]).clip(0,255);m['alphaMode']='OPAQUE'")
s=s.replace("elif k==6:a[:,:,:3]=[69,45,40];a[:,:,3]=np.uint8(a[:,:,3]*.49)","elif k==6:a[:,:,:3]=[80,55,46];a[:,:,3]=np.uint8(a[:,:,3]*.28)")
s=s.replace("setimage(idx,Image.fromarray(a))","""setimage(idx,Image.fromarray(a))
 if k in (1,4):
  m['emissiveTexture']=copy.deepcopy(m['pbrMetallicRoughness']['baseColorTexture']);m['emissiveFactor']=[.105 if k==1 else .065]*3""")
p.write_text(s,'utf8')
p=w/'bob.py';s=p.read_text('utf8');s=s.replace("knots=np.stack((root,c1,c2,c3,end));","""if side==-1:
  c1[:,0]+=.020*(1-r)**4;c2[:,0]+=.031*(1-r)**4;c2[:,1]-=.012*(1-r)**3;c3[:,0]+=.011*(1-r)**4
 # Keep the front of the part round and overlap the two fine hairlines.
 root[:,0]-=side*.0016*np.exp(-r*6)
 knots=np.stack((root,c1,c2,c3,end));""").replace("1.534+.058","1.536+.073").replace("1.535+.046","1.537+.059")
p.write_text(s,'utf8')
