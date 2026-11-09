import math
def fit(o):
    """Blend the lower tunic into the legs without requiring cloth simulation."""
    groups=[o.vertex_groups.get(n) or o.vertex_groups.new(name=n) for n in ('thighL','thighR')]
    for v in o.data.vertices:
        x,y,z=v.co
        if z>=1.05:continue
        if any(o.vertex_groups[g.group].name.startswith(('upperArm','foreArm','foot')) and g.weight>.01 for g in v.groups):continue
        a=min(.92,max(0,(1.05-z)/.45))
        original=[(g.group,g.weight) for g in v.groups]
        for index,w in original:o.vertex_groups[index].add([v.index],w*(1-a),'REPLACE')
        left=1/(1+math.exp(-x*35))
        for group,w in zip(groups,(a*left,a*(1-left))):
            old=sum(p.weight for p in v.groups if p.group==group.index)
            group.add([v.index],old+w,'REPLACE')
