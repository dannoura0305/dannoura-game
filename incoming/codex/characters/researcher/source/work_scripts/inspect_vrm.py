from vrm_read import *
for mesh in j['meshes']:
 for pr in mesh['primitives']:
  a=pr['attributes'];ix=acc(pr['indices']).ravel();q=acc(a['POSITION'])[ix];print(pr['material'],a['POSITION'],a.keys(),len(ix),q.min(0).round(3),q.max(0).round(3))
print([(k,m['pbrMetallicRoughness'].get('baseColorFactor'),m['pbrMetallicRoughness'].get('baseColorTexture'),m['extensions'].keys()) for k,m in enumerate(j['materials'])])
print([n for n in j['nodes'] if 'mesh' in n])
print(j['extensionsUsed'])
for k in [0,1,2,3,4,5,6,9,10,14]:
 m=j['materials'][k];print(k,m['name'],m['extensions']['VRMC_materials_mtoon'])
