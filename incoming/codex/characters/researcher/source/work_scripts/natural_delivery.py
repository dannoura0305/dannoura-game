from pathlib import Path
import io,json,struct,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont,ImageOps
w=Path(__file__).resolve().parent
out=w.parents[1]/'outputs/researcher/natural_face'
def read(path):
 raw=path.read_bytes();magic,ver,total,js,typ=struct.unpack_from('<4sIII4s',raw)
 assert magic==b'glTF' and ver==2 and total==len(raw) and typ==b'JSON'
 n,tag=struct.unpack_from('<I4s',raw,20+js);b=raw[28+js:];assert len(b)==n and tag==b'BIN\0'
 return json.loads(raw[20:20+js]),b
def array(j,b,i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];sz={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 return np.frombuffer(b,dtype={5126:'<f4',5121:'u1',5123:'<u2',5125:'<u4'}[a['componentType']],count=a['count']*sz,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,sz)
def thumb():
 path=out/'researcher_natural.vrm';j,b=read(path);meta=j['extensions']['VRMC_vrm']['meta']
 im=ImageOps.fit(Image.open(out/'three_quarter.png').convert('RGB'),(512,512));f=io.BytesIO();im.save(f,format='JPEG',quality=93);data=f.getvalue()
 n=len(b);b+=data;b+=b'\0'*(-len(b)%4);j['buffers'][0]['byteLength']=len(b)
 j['bufferViews'].append({'buffer':0,'byteOffset':n,'byteLength':len(data)})
 j['images'].append({'name':'Researcher portrait','mimeType':'image/jpeg','bufferView':len(j['bufferViews'])-1});meta['thumbnailImage']=len(j['images'])-1
 js=json.dumps(j,separators=(',',':'),ensure_ascii=False).encode();js+=b' '*(-len(js)%4)
 path.write_bytes(struct.pack('<4sIII4s',b'glTF',2,28+len(js)+len(b),len(js),b'JSON')+js+struct.pack('<I4s',len(b),b'BIN\0')+b)
thumb()
src,_=read(out.parent/'研究者_調整版.vrm');ext=src['extensions']['VRMC_vrm']
for extn in ['vrm','glb']:
 j,b=read(out/('researcher_natural.'+extn));assert j['buffers'][0]['byteLength']==len(b)
 for v in j['bufferViews']:assert 0<v['byteLength'] and v.get('byteOffset',0)+v['byteLength']<=len(b)
 for i,a in enumerate(j['accessors']):
  v=array(j,b,i);assert np.isfinite(v).all()
 for me in j['meshes']:
  for p in me['primitives']:
   pos=array(j,b,p['attributes']['POSITION']);weights=array(j,b,p['attributes']['WEIGHTS_0'])
   assert np.max(abs(weights.sum(1)-1))<.003 and array(j,b,p['indices']).max()<len(pos)
   for t in p.get('targets',[]):assert len(array(j,b,t['POSITION']))==len(pos)
 if extn=='vrm':
  e=j['extensions']['VRMC_vrm'];assert e['humanoid']==ext['humanoid'] and e['expressions']==ext['expressions']
  assert j['extensions']['VRMC_springBone']==src['extensions']['VRMC_springBone']
  for k,expr in e['expressions']['preset'].items():
   for t in expr.get('morphTargetBinds',[]):
    me=j['meshes'][j['nodes'][t['node']]['mesh']]
    assert max(np.abs(array(j,b,p['targets'][t['index']]['POSITION'])).max() for p in me['primitives'])>1e-5
  print('PRESETS',list(e['expressions']['preset']),'SHAPES',len(j['meshes'][0]['primitives'][0]['targets']),'HUMANOID',len(e['humanoid']['humanBones']))
print('GLB/VRM verified')
board=Image.new('RGB',(1328,438),'#e9e8e6');draw=ImageDraw.Draw(board)
font=ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc',18)
def tile(path,box,row,label):
 img=Image.open(path).convert('RGB').crop(box)
 board.paste(ImageOps.fit(img,(325,388),method=Image.Resampling.LANCZOS),(5+331*row,4))
 draw.text((14+331*row,399),label,font=font,fill='#25232b')
tile(w/'face_ref.jpg',(86,12,556,574),0,'原画')
tile(out.parent/'blender_refined'/'portrait.png',(65,42,720,824),1,'前回')
tile(out/'portrait.png',(65,42,720,824),2,'今回  ·  正面')
tile(out/'three_quarter.png',(45,36,695,812),3,'今回  ·  斜め')
board.save(out/'comparison.png')
