from pathlib import Path
w=Path(__file__).resolve().parent
p=w/'likeness.py';s=p.read_text(encoding='utf8')
s=s.replace(' if hair:\n',''' q[:,2]-=.0075*ga(x/.014,(y-1.573)/.010)*front
 q[:,0]+=np.sign(x)*.0028*ga((a-.048)/.026,(y-1.534)/.021)*front
 if hair:
  q[:,1]-=.016*smooth((y-1.676)/.060)
  q[:,2]+=.012*smooth((-z-.065)/.055)
''')
s=s.replace("result[ix,1]+=.0015-.15*(abs(x)-.036)","result[ix,1]+=.002-.18*(abs(x)-.036)-.0052*smooth((abs(x)-.045)/.019)")
s=s.replace("photo=sample(cleaned_portrait(),X,Y)","""cleanref=cleaned_portrait()
 photo=sample(cleanref,X,Y)
 # Register the forehead to bare skin where the reference fringe covers the left temple.
 bare=sample(cleanref,351+26*np.sin((X-320)*.014)+.12*(X-325),np.clip(Y,66,164))
 fringe=smooth((320-X)/44)*smooth((176-Y)/24)+smooth((X-425)/45)*smooth((176-Y)/32)
 fringe=np.clip(fringe,0,1)
 photo=photo*(1-fringe[...,None])+bare*fringe[...,None]""")
s=s.replace("if k==2:a[:,:,3]=(a[:,:,3].astype(float)*.41)","if k==2:a[:,:,3]=(a[:,:,3].astype(float)*.22)")
s=s.replace("g=lum*.58+wave+4","g=lum*.41+wave+3")
p.write_text(s,encoding='utf8')
p=w/'likeness_parts.py';s=p.read_text(encoding='utf8')
s=s.replace("dist=envelope(n);dist=np.convolve(np.pad(dist,(1,1),mode='edge'),[.2,.6,.2],mode='valid')","""# Smooth small steps between neighbouring hair cards along each lock.
  dist=envelope(n)
  dist=np.convolve(np.pad(dist,(3,3),mode='edge'),[.04,.10,.20,.32,.20,.10,.04],mode='valid')""")
s=s.replace("lift=.0004+.0022","lift=.0014+.0028")
s=s.replace("hm=[material('Pepper hair | '+str(i+1),v,.79)","hm=[material('Pepper hair | '+str(i+1),(np.asarray(v)*.54).tolist(),.88)")
p.write_text(s,encoding='utf8')
