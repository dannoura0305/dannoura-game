from vrm_read import *
from PIL import Image,ImageDraw
import io
ims=[]
for k,m in enumerate(j['materials']):
 idx=m['pbrMetallicRoughness']['baseColorTexture']['index'];v=j['bufferViews'][j['images'][j['textures'][idx]['source']]['bufferView']]
 im=Image.open(io.BytesIO(buf[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGBA');print(k,im.size)
 im.thumbnail((160,160));ims.append(im)
bd=Image.new('RGB',(800,540),'#aaaaaa');d=ImageDraw.Draw(bd)
for k,im in enumerate(ims):x=k%5*160;y=k//5*180;bd.paste(im,(x,y),im);d.text((x+3,y+160),str(k),fill='black')
bd.save('work/researcher/vrmatlas.jpg')
