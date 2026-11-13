def cleaned_portrait():
 ref=Image.open(W/'face_ref.jpg').convert('RGB');mask=Image.new('L',ref.size);d=ImageDraw.Draw(mask)
 left=[(213,200),(231,190),(234,182),(256,176),(290,173),(315,177),(331,184),(333,202),(328,224),(317,240),(298,245),(264,245),(244,240),(236,226),(231,190)]
 right=[(367,187),(378,177),(409,172),(442,173),(459,179),(465,187),(461,215),(454,232),(438,241),(408,243),(387,239),(375,229),(367,210),(367,187)]
 for path in [left,right,[(330,188),(339,185),(351,186),(367,188)],[(462,183),(480,192),(496,204)],[(210,201),(194,217)]]:d.line(path,fill=255,width=10,joint='curve')
 # Omit the eyes and brows painted onto the source. These are moving parts on the avatar.
 for box in [(245,182,323,216),(375,180,447,216),(237,150,326,175),(373,146,452,174)]:
  d.ellipse(box,fill=255)
 refarr=np.array(ref).astype(float);m=np.asarray(mask)>0
 # Nearest boundary expansion with isotropic diffusion inside the small occluded regions.
 a=refarr.copy();done=~m
 for _ in range(60):
  num=np.zeros_like(a);den=np.zeros(done.shape,float)
  for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
   valid=np.roll(done,(dy,dx),(0,1));num+=np.roll(a,(dy,dx),(0,1))*valid[...,None];den+=valid
  fill=(~done)&(den>0)
  if not fill.any():break
  a[fill]=num[fill]/den[fill,None];done|=fill
 for _ in range(36):
  avg=sum(np.roll(a,(dy,dx),(0,1)) for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)])*.25;a[m]=avg[m]
 return a
