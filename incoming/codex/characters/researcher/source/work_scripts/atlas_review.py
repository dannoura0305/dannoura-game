import io, re, struct, json, zipfile
from pathlib import Path
from PIL import Image, ImageDraw
p=Path('outputs/researcher'); w=Path('work/researcher')
z=zipfile.ZipFile(p/'researcher_studio.vroid');b=z.read('v1model/data.bin')
def pnglist(b):
    out=[]
    for m in re.finditer(b'\x89PNG\r\n\x1a\n',b):
        a=m.start();last=b.find(b'IEND',a)+8
        im=Image.open(io.BytesIO(b[a:last])).convert('RGBA');out.append((a,last,im))
    return out
if __name__=='__main__':
    pics=pnglist(b);board=Image.new('RGB',(700,((len(pics)+6)//7)*100),'#888888');d=ImageDraw.Draw(board)
    for k,(a,e,im) in enumerate(pics):
        im.thumbnail((95,76));x=k%7*100;y=k//7*100;board.paste(im,(x,y),im);d.text((x,y+76),str(k))
    board.save(w/'atlas_review.jpg')
