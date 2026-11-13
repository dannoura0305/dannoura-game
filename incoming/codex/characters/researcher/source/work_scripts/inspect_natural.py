import json,struct
from pathlib import Path
p=Path('outputs/researcher/natural_face/researcher_natural.glb')
r=p.read_bytes();j=json.loads(r[20:20+struct.unpack_from('<I',r,12)[0]])
for i,m in enumerate(j['materials'][:7]):print(i,m)
print('weights',j['meshes'][0].get('weights'))
for n in j['nodes']:
 if 'weights' in n:print(n['name'],n['weights'])
