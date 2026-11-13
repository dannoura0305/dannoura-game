from pathlib import Path
import numpy as np,struct,json,io,copy,math,zipfile
from PIL import Image,ImageDraw,ImageFilter,ImageOps
W=Path(__file__).resolve().parent;R=W.parent/'researcher';OUT=W.parents[1]/'outputs/spouse_apparition';OUT.mkdir(exist_ok=True)
P=Path('C:/wakaba/wakaba-character-model-factory/hq3d/characters/akari/src')
raw=((W/'studio_export.vrm') if (W/'studio_export.vrm').exists() else (P/'akari_vroid.vrm')).read_bytes();jl=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+jl]);binary=bytearray(raw[28+jl:]);rng=np.random.default_rng(861)
def section(file,start,end):
 s=(R/file).read_text('utf8');return s[s.index(start):s.index(end,s.index(start))]
exec(section('likeness.py','types={','def sculpt'))
exec(section('likeness.py','def normals(','meshes=j'))
exec(section('likeness.py','def getimage(','def cleaned_portrait'))
exec(section('likeness_parts.py','def material(','head=j'))
exec(section('likeness_parts.py','def savegltf(','j[\'extensions\'][\'VRMC_vrm\'][\'meta\'][\'name\']='))
meshes=j['meshes'];rest={i:acc(m['primitives'][0]['attributes']['POSITION']) for i,m in enumerate(meshes)}
def pnglist(b):
 pairs=[];off=0
 while True:
  pos=b.find(b'\x89PNG\r\n\x1a\n',off)
  if pos<0:break
  end=b.find(b'IEND\xaeB\x60\x82',pos)+8
  if end<8:break
  im=Image.open(io.BytesIO(b[pos:end])).convert('RGBA');pairs.append((pos,end,im));off=end
 return pairs
if __name__=='__main__':
 for i,m in enumerate(meshes):
  for p in m['primitives']:
   ids=np.unique(acc(p['indices']));q=rest[i][ids];print(p['material'],np.round(q.min(0),3),np.round(q.max(0),3))
 with zipfile.ZipFile(P/'akari.vroid') as archive:
  b=archive.read('v1model/data.bin');pngs=pnglist(b);d=Image.new('RGB',(680,((len(pngs)+5)//6)*99),'#a7a7a7');draw=ImageDraw.Draw(d)
  for k,(_,__,im) in enumerate(pngs):
   im.thumbnail((103,72));x=k%6*113;y=k//6*99;d.paste(im,(x,y),im);draw.text((x+3,y+72),str(k),fill='black')
  d.save(W/'native.jpg')
