from atlas_review import *
def var(b,i):
 v=0
 for shift in range(0,70,7):
  c=b[i];i+=1;v|=(c&127)<<shift
  if c<128:return v,i
 raise ValueError()
def fields(b):
 i=0
 while i<len(b):
  st=i;tag,i=var(b,i);wire=tag&7;key=i
  if not tag>>3:raise ValueError()
  if wire==0:_,i=var(b,i);v=key
  elif wire==1:v=i;i+=8
  elif wire==5:v=i;i+=4
  elif wire==2:l,v=var(b,i);i=v+l
  else:raise ValueError()
  if i>len(b):raise ValueError()
  yield tag,st,key,v,i
def trace(b,point):
 while not b.startswith(b'\x89PNG'):
  for tag,s,key,a,e in fields(b):
   if a<=point<e:break
  else:return
  print(tag>>3,point-a,e-a,b[a:a+16]);point-=a;b=b[a:e]
if __name__=='__main__':
 ps=pnglist(b)
 for i in [4,19,33]:trace(b,ps[i][0])
