from pathlib import Path
import io,struct,json,zipfile,numpy as np
from PIL import Image,ImageOps,ImageDraw,ImageFont
W=Path(__file__).resolve().parent;out=W.parents[1]/'outputs/spouse_apparition'
def read(name):
 r=(out/name).read_bytes();magic,ver,n,jl,tag=struct.unpack_from('<4sIII4s',r)
 assert magic==b'glTF' and n==len(r) and tag==b'JSON'
 return json.loads(r[20:20+jl]),r[28+jl:]
def arr(j,b,idx):
 a=j['accessors'][idx];v=j['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 return np.frombuffer(b,dtype={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']],count=a['count']*count,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,count)
j,b=read('spouse_apparition.vrm');e=j['extensions']['VRMC_vrm'];assert e['meta']['name']=='配偶者に似た異形'
print('bones',len(e['humanoid']['humanBones']),'presets',len(e['expressions']['preset']))
# Replace the base-avatar export thumbnail with this character in its finished pose.
thumb=ImageOps.fit(Image.open(out/'face.png').convert('RGB'),(512,512));f=io.BytesIO();thumb.save(f,'JPEG',quality=90)
v=j['images'][e['meta']['thumbnailImage']];b+=b'\0'*(-len(b)%4);data=f.getvalue();j['bufferViews'].append({'buffer':0,'byteOffset':len(b),'byteLength':len(data)});v.update(bufferView=len(j['bufferViews'])-1,mimeType='image/jpeg');b+=data;b+=b'\0'*(-len(b)%4);j['buffers'][0]['byteLength']=len(b)
js=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*(-len(js)%4)
(out/'spouse_apparition.vrm').write_bytes(struct.pack('<4sIII4s',b'glTF',2,len(js)+len(b)+28,len(js),b'JSON')+js+struct.pack('<I4s',len(b),b'BIN\0')+b)
for name in ('spouse_apparition.vrm','spouse_animated.glb'):
 j,b=read(name);assert len(b)>=j['buffers'][0]['byteLength'];assert len(j['skins'])>=1
 for m in j['meshes']:
  for p in m['primitives']:
   q=arr(j,b,p['attributes']['POSITION']);assert np.isfinite(q).all() and arr(j,b,p['indices']).max()<len(q)
 if name.endswith('.glb'):
  print('clips',[a['name'] for a in j['animations']]);assert {'Wait','Look_back'}<={a['name'] for a in j['animations']}
  for a in j['animations']:
   moved=False
   for ch in a['channels']:
    if ch['target']['path']=='rotation':
     key=arr(j,b,a['samplers'][ch['sampler']]['output']);moved|=np.ptp(key,axis=0).max()>.0001
   assert moved
with zipfile.ZipFile(out/'spouse_studio.vroid') as z:assert z.testzip() is None
font=ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc',18)
sheet=Image.new('RGB',(1256,640),'#e8e5e3');draw=ImageDraw.Draw(sheet)
def panel(name,box,label,focus=(.5,.5)):
 im=Image.open(out/(name+'.png'));x,y,w,h=box;im=ImageOps.fit(im,(w,h),method=Image.Resampling.LANCZOS,centering=focus);sheet.paste(im,(x,y));draw.text((x+3,y+h+3),label,font=font,fill='#332d34')
panel('front',(8,8,251,589),'正面')
panel('side',(264,8,208,589),'側面')
panel('back',(477,8,239,589),'背面')
panel('face',(722,8,287,344),'頭部')
panel('turn',(1014,8,234,344),'振り向く')
panel('watch',(722,390,526,207),'左手首の時計',(.5,.48))
sheet.save(out/'preview.jpg',quality=93)
