# Measured neutral contours of the actual VRoid aperture in source coordinates.
source_x=.001*np.array([27.1,29.33,31.67,34,36.33,38.67,41,43.33,45.67,48,50.33,52.67,55,57.33,59.67,62,64.4])
lower=.001*np.array([1610.5,1606.17,1605,1604.33,1603.83,1603.5,1603.33,1603.33,1603.33,1603.67,1604,1604.67,1605.5,1606.83,1609.17,1612.83,1621.35])
upper=.001*np.array([1610.5,1616.33,1619,1620.33,1621,1621.33,1621.5,1621.83,1622,1622.17,1622.17,1622.17,1622.17,1622,1621.83,1621.67,1621.35])
rimdepth=np.interp(source_x,[.027,.040,.052,.0645],[.057,.055,.050,.044])
def lid_warp(x,y,z):
 a=abs(x);t=np.clip((a-source_x[0])/(source_x[-1]-source_x[0]),0,1)
 lower_y=np.interp(a,source_x,lower);upper_y=np.interp(a,source_x,upper)
 base_lo=np.interp(a,source_x,sculpt(np.column_stack((source_x,lower,rimdepth)))[:,1])
 base_hi=np.interp(a,source_x,sculpt(np.column_stack((source_x,upper,rimdepth)))[:,1])
 shape=np.sin(np.pi*t)**.86
 mid=1.6014+.0008*t
 bottom=mid-.0033*shape*(.77+.36*t)
 top=mid+.0045*shape*(1.16-.30*t)
 w=np.clip((y-lower_y)/np.maximum(.0005,upper_y-lower_y),0,1)
 distance=np.maximum(np.maximum(lower_y-y,y-upper_y),0)
 falloff=np.exp(-(distance/.009)**2)*smooth((a-.013)/.012)*smooth((.079-a)/.013)*smooth((z+.005)/.049)
 return falloff*((1-w)*(bottom-base_lo)+w*(top-base_hi))
def project_surface(ids, surface, result, offset):
 # Each moving overlay is conformed to the front of its support surface.
 tris=result[surface];a=tris[:,0];u=tris[:,1]-a;v=tris[:,2]-a
 det=u[:,0]*v[:,1]-u[:,1]*v[:,0];usable=abs(det)>1e-11;den=np.where(usable,det,1.)
 for idx in ids:
  dx=result[idx,0]-a[:,0];dy=result[idx,1]-a[:,1]
  b=(v[:,1]*dx-v[:,0]*dy)/den;c=(u[:,0]*dy-u[:,1]*dx)/den
  hit=usable&(b>=-.0001)&(c>=-.0001)&(b+c<=1.0001)
  if np.any(hit):
   depth=(a[:,2]+b*u[:,2]+c*v[:,2])[hit].max()
   if depth>0:result[idx,2]=depth+offset
