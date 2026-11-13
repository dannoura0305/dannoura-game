import numpy as np,json,struct
from pathlib import Path
from PIL import Image
w=Path(__file__).resolve().parent
r=w.parents[1]/'outputs/researcher'
def read(p):
 raw=p.read_bytes();n=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+n]),raw[28+n:]
j,b=read(r/'natural_face/researcher_natural.vrm')
for i,n in enumerate(j['nodes']):
 if ('skin' in n or 'mesh' in n or any(s in n.get('name','') for s in ('Head','Neck','LowerArm','Hand','Root','Hips','UpperArm','Eye'))) and 'Hair' not in n.get('name',''):print(i,n)
print([(i,m['name'],len(m['primitives']),[p['material'] for p in m['primitives']]) for i,m in enumerate(j['meshes'])]);print(j['extensions']['VRMC_vrm']['humanoid']['humanBones']['leftHand']);print(j['skins'][0]['joints'][:5])
im=Image.open(Path.home()/'Pictures/ChatGPT 画像 2026年11月8日 13_39_23.png').convert('RGB').resize((1536,1024),Image.Resampling.LANCZOS);im.save(w/'reference.jpg',quality=97)
head=im.crop((1000,67,1250,312)).resize((500,490));head=head.rotate(-13,resample=Image.Resampling.BICUBIC,center=(285,219));head.save(w/'straight.jpg',quality=97)
