from pathlib import Path
import json,struct,zipfile
from PIL import Image,ImageDraw
import io,numpy as np
root=Path('C:/wakaba/wakaba-character-model-factory/hq3d/characters')
w=Path(__file__).resolve().parent
tiles=[]
for name in ['akari','dannoura','dannoura_white','musume']:
 p=root/name/'src';raw=(p/(name+'_vroid.vrm')).read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);b=raw[n+28:];print(name,j.get('extensionsUsed'),[(m.get('name'),len(m['primitives'])) for m in j['meshes']], [m['name'].split(' (')[0] for m in j['materials']][:35])
 print((root/name/'reference.json').read_text('utf8')[:250])
 ext=j['extensions'].get('VRMC_vrm',{});meta=ext.get('meta',{});print(meta.get('name'),list(meta.keys())[:6])
 if 'thumbnailImage' in meta:
  vi=j['bufferViews'][j['images'][meta['thumbnailImage']]['bufferView']];img=Image.open(io.BytesIO(b[vi['byteOffset']:vi['byteOffset']+vi['byteLength']]));img.thumbnail((200,200));tiles.append((name,img.copy()))
 with zipfile.ZipFile(p/(name+'.vroid')) as z:print(z.namelist()[:12])
im=Image.new('RGB',(800,230),'#ababab');d=ImageDraw.Draw(im)
for k,(name,img) in enumerate(tiles):im.paste(img,(k*200,0));d.text((k*200+5,207),name,fill='black')
im.save(w/'bases.jpg')
