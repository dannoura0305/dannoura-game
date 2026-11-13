from vroid_native import *
import numpy as np
from PIL import ImageFilter
pics=pnglist(b)
def paintcoat(im):
 a=np.asarray(im).copy()
 lum=a[:,:,:3].mean(2)
 rng=np.random.default_rng(72)
 noise=rng.normal(0,1.35,lum.shape)
 for c,scale in enumerate([.885,.875,.865]):a[:,:,c]=np.uint8(np.clip((a[:,:,c]*.30+lum*.70)*scale+noise,0,255))
 im=Image.fromarray(a);d=ImageDraw.Draw(im)
 def pts(ps):return [(round(x*4),round(y*4)) for x,y in ps]
 def line(ps,c,w=1):d.line(pts(ps),fill=c,width=round(w*4),joint='curve')
 def poly(ps,c):d.polygon(pts(ps),fill=c)
 # Chest pocket on the wearer's left, two tucked pens and a stitched lip.
 for x,tip in [(294,165),(298,167)]:
  line([(x,tip),(x-1,181)],(54,53,55),1.5);line([(x+.45,tip+1),(x+.2,tip+5)],(144,141,140),.55)
 pocket=[(281,174),(307,175),(305,199),(292,203),(281,199)]
 poly(pocket,(209,206,200));line(pocket+[pocket[0]],(163,161,157),.65);line([(282,176),(305,177)],(232,228,222),1)
 for x in [220,298]:
  line([(x-12,263),(x+9,260)],(153,151,149),1.55);line([(x-12,264.4),(x+9,261.4)],(237,233,226),1.0)
 for x,y in [(238,220),(237,252),(237,282)]:
  d.ellipse(pts([(x-1.4,y-1.4),(x+1.4,y+1.4)]),fill=(181,179,175),outline=(143,141,137),width=2)
 # The record module is carried on the left opening of the coat.
 def rect(box,col,r=0):d.rounded_rectangle(pts([box[:2],box[2:]]),radius=r*4,fill=col)
 rect((275,242,288,265),(61,59,65),1.2);rect((276,243,287,263),(43,42,47),1)
 for r,col,width in [(3.35,(123,101,146),.9),(2.65,(224,188,255),.85)]:
  d.ellipse(pts([(281.6-r,252-r),(281.6+r,252+r)]),outline=col,width=max(1,round(width*4)))
 line([(277,261),(286,261)],(86,83,90),.45)
 line([(425,55),(438,54),(450,57),(474,55),(481,58)],(165,137,200),.9)
 return im
def aging(im):
 a=np.asarray(im).copy();h,wid=a.shape[:2];yy,xx=np.mgrid[:h,:wid]*512/h
 dx=abs(xx-256)
 def g(cx,cy,wx,wy):return np.exp(-((dx-cx)/wx)**2-((yy-cy)/wy)**2)
 dark=12*g(80,302,34,10)+9*g(116,333,26,24)+7*g(21,331,7,15)+6*g(42,369,8,19)+4*g(48,246,23,8)
 curve=298+4*np.cos((dx-80)/20)
 dark+=5*np.exp(-((yy-curve)/1.4)**2-((dx-80)/28)**2)
 for c in range(3):a[:,:,c]=np.clip(a[:,:,c].astype(float)-dark,0,255)
 return Image.fromarray(a)
def encode(n):
 out=bytearray()
 while n>=128:out.append((n&127)|128);n>>=7
 out.append(n);return bytes(out)
swap={}
for i,fn in [(4,paintcoat),(19,aging)]:
 s,e,im=pics[i];out=io.BytesIO();fn(im).save(out,format='PNG');swap[s]=out.getvalue()
def rewrite(data,offset):
 if offset in swap and data.startswith(b'\x89PNG'):return swap[offset]
 result=bytearray()
 for tag,start,key,a,e in fields(data):
  if tag%8==2 and any(offset+a<=q<offset+e for q in swap):
   new=rewrite(data[a:e],offset+a);result+=data[start:key]+encode(len(new))+new
  else:result+=data[start:e]
 return bytes(result)
with zipfile.ZipFile(p/'researcher.vroid','w',zipfile.ZIP_DEFLATED) as dest:
 for name in z.namelist():dest.writestr(name,rewrite(b,0) if name.endswith('data.bin') else z.read(name))
print('Native layers updated')
