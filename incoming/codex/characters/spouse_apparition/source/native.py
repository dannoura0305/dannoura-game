from lib import *
exec(section('vroid_native.py','def var(','def trace('))
exec(section('vroid_finish.py','def encode(','swap={}'))
with zipfile.ZipFile(P/'akari.vroid') as archive:
 payload=archive.read('v1model/data.bin');swap={}
 for k,(pos,end,im) in enumerate(pnglist(payload)):
  if k not in (0,1,6,7,8,23,25,26):continue
  a=np.array(im);lum=a[:,:,:3].mean(2)
  if k in (6,7,23):
   tex=Image.open(W/f'tex{ {6:8,7:9,23:3}[k]}.png').resize(im.size,Image.Resampling.LANCZOS)
   base=np.array(tex)[:,:,:3];a[:,:,:3]=base
  elif k==8:a[:,:,:3]=np.clip(lum[...,None]*[.61,.52,.48]+[6,6,7],0,255)
  elif k in (1,26):a[:,:,:3]=np.uint8(a[:,:,:3]*.10)
  else:
   yy,xx=np.mgrid[:a.shape[0],:a.shape[1]];u=xx/a.shape[1];v=yy/a.shape[0]
   line=np.exp(-((u-.24-.025*np.sin(5*v))/.054)**2)*60+3*np.sin(180*u+2*np.sin(8*v))
   a[:,:,:3]=np.clip((lum*.55+line)[...,None]+[19,15,15],0,255)
  f=io.BytesIO();Image.fromarray(a).save(f,'PNG');swap[pos]=f.getvalue()
 def splice(data,o):
  if o in swap and data.startswith(b'\x89PNG'):return swap[o]
  new=bytearray()
  for tag,start,key,a,e in fields(data):
   if tag%8==2 and any(o+a<=p<o+e for p in swap):
    val=splice(data[a:e],o+a);new+=data[start:key]+encode(len(val))+val
   else:new+=data[start:e]
  return bytes(new)
 with zipfile.ZipFile(OUT/'spouse_studio.vroid','w',zipfile.ZIP_DEFLATED) as dest:
  for n in archive.namelist():dest.writestr(n,splice(payload,0) if n=='v1model/data.bin' else archive.read(n))
with zipfile.ZipFile(OUT/'spouse_studio.vroid') as check:assert check.testzip() is None
