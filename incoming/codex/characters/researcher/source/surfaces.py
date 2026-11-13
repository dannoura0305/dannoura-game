"""Parametric, closed-volume character surfaces with baked three-view colour.
Input: the supplied design sheet, internally normalized to 1536 x 1024.
Coordinates below are orthographic plate coordinates; Y is physical depth."""
from pathlib import Path
import numpy as np, json
from PIL import Image
W=Path(__file__).resolve().parent; T=W/'textures';T.mkdir(exist_ok=True)
im=np.asarray(Image.open(W/'reference.jpg').convert('RGB'),dtype=float);parts=[]
pi=np.pi
def tab(q,knots,values):return np.interp(q,knots,values)
def smooth(q):q=np.clip(q,0,1);return q*q*(3-2*q)
def read(x,y):
    x=np.clip(x,0,1534.9);y=np.clip(y,0,1022.9);i=x.astype(int);j=y.astype(int);a=(x-i)[...,None];b=(y-j)[...,None]
    return (im[j,i]*(1-a)+im[j,i+1]*a)*(1-b)+(im[j+1,i]*(1-a)+im[j+1,i+1]*a)*b
def standard(x,y,p,a,kind,side=0):
    co=np.cos(a);si=np.sin(a);f=smooth((co-.10)/.58);b=smooth((-co-.1)/.58);sw=1-f-b
    xf=x.copy();xb=755-(x-180);xs=469+y
    if kind=='coat':
        # Areas hidden by the hanging arms get clean cloth from the adjacent panel.
        xf=np.where((p>360)&(p<572)&(np.abs(x-180)>70),180+np.sign(x-180)*64,xf)
        xf=np.where((p>475)&(p<650)&(np.abs(x-180)>88),180+np.sign(x-180)*78,xf)
        xs=np.where((p>287)&(p<595),np.maximum(xs,502+.01*(p-280)),xs)
        xb=np.where((p>310)&(p<545),np.clip(xb,696,815),xb)
    if kind=='shirt':
        xf=180+(xf-180)*.37;xf=np.clip(xf,161,201);xb=xf;xs=xf
    if kind=='leg':
        xf=np.where(p<730,180+side*49+(x-(180+side*49))*.56,xf)
        yf=np.maximum(p,733);ys=np.maximum(p,734)
        center=np.interp(yf,[733,830,920,937],[180+side*51,180+side*55,180+side*66,180+side*67]);xf=np.clip(xf,center-15,center+15)
        return read(xf,yf)*(.97+.05*np.cos(a))[...,None]
    if kind=='boot':
        # Project the lateral shoe between its true toe and heel on the plate.
        xs=np.clip(469+y*.76,393,504);row=np.clip(p,938,976)
        front=read(np.clip(x,180+side*77-16,180+side*77+16),row)
        lateral=read(xs,row);lateral=np.where((lateral.mean(2)>132)[...,None],front,lateral)
        return front*(1-sw[...,None])+lateral*sw[...,None]
    if kind=='neck':xf=np.clip(xf,164,196);xs=np.clip(xs,441,489);xb=np.clip(xb,742,770)
    if kind=='sleeve':
        # The far side is not a duplicate arm on the orthographic side plate.
        xs=np.clip(xs,436,494)
    if kind=='head':
        ff=read(1091+(x-180)*2.35,165+(p-173)*2.35)
        # The detail view ends at the hair part. Use the full head for the crown.
        k=smooth((p-133)/9)[...,None];ff=read(xf,p)*(1-k)+ff*k
        return ff*f[...,None]+read(xs,p)*sw[...,None]+read(xb,p)*b[...,None]
    return read(xf,p)*f[...,None]+read(xs,p)*sw[...,None]+read(xb,p)*b[...,None]
def savepart(name,fn,kind,rig,texres=(384,600),ng=(64,68),side=0,closed=True):
    def grid(nx,ny):return np.meshgrid(np.linspace(0,1,nx),np.linspace(0,1,ny))
    u,v=grid(ng[0]+1,ng[1]+1);x,y,p,a=fn(u,v);pts=np.stack((x,y,p),-1).reshape(-1,3)
    texu,texv=grid(*texres);tx,ty,tp,ta=fn(texu,texv);pix=standard(tx,ty,tp,ta,kind,side)
    if name=='swept_pepper_hair':
        lum=pix.mean(2);alt=read(1053+15*np.sin(2*pi*texu+texv),103+10*np.sin(2*pi*texv-texu)).mean(2);gray=np.where(lum<72,lum,alt*.55+7)+3*np.sin(2*pi*(96*texu+1.7*texv+1.4*np.sin(3*texv+10*texu)))
        pix=np.stack([gray*1.04,gray,gray*1.025],axis=-1)
    if kind=='coat':
        sample=read(718+np.mod(tx+ty*.25,28),375+np.mod(tp,90))
        good=smooth((pix.mean(2)-108)/28)*smooth((205-pix.mean(2))/12)
        pix=pix*(.74*good[...,None])+sample*(1-.74*good[...,None])
    Image.fromarray(np.uint8(np.clip(pix,0,255))).save(T/(name+'.jpg'),quality=96,subsampling=0)
    nx,ny=ng;faces=[]
    for j in range(ny):
        for i in range(nx):
            if name=='open_lab_coat' and j/ny>.70 and i==nx//2:continue
            q=j*(nx+1)+i;faces.append([q,q+nx+1,q+nx+2,q+1])
    if closed:faces.extend([list(range(nx)),list(range(ny*(nx+1)+nx-1,ny*(nx+1)-1,-1))])
    parts.append(dict(name=name,xyz=pts.round(5).tolist(),uv=np.stack((u,1-v),-1).reshape(-1,2).round(6).tolist(),faces=faces,rig=rig))
def loft(rows):
    # row = height on sheet, front center X, half width, front depth, back depth
    r=np.array(rows)
    def fn(u,v):
        p=r[0,0]+(r[-1,0]-r[0,0])*v;a=2*pi*u;c,rx,fr,bk=[tab(p,r[:,0],r[:,k]) for k in range(1,5)]
        return c+rx*np.sin(a),(fr+bk)/2-(bk-fr)/2*np.cos(a),p,a
    return fn
headrows=np.array([(120,181,3,-3,6),(125,181,15,-16,20),(134,181,28,-28,34),(146,181,34,-34,41),(158,180,35,-39,42),(171,180,34,-40,44),(182,180,33,-40,43),(193,180,31,-41,39),(201,180,28,-41,35),(210,180,24,-43,29),(216,180,16,-43,19),(221,180,4,-35,-15)])
def skull_at(x,p,front=True):
    c,rx,fr,bk=[tab(p,headrows[:,0],headrows[:,k]) for k in range(1,5)]
    sn=np.clip((x-c)/rx,-1,1);co=np.sqrt(1-sn*sn);mid=(fr+bk)/2;d=(bk-fr)/2
    detail=-11*np.exp(-((x-180)/4.9)**2-((p-188)/12.)**2)-6*np.exp(-((x-180)/7)**2-((p-191)/4.4)**2)
    detail+=3.5*np.exp(-((np.abs(x-180)-13)/7)**2-((p-173)/5)**2)-2.5*np.exp(-((np.abs(x-180)-15)/9)**2-((p-186)/8)**2)
    detail-=2*np.exp(-((x-180)/13)**2-((p-201)/5)**2)
    return mid-d*co**.60+detail*co if front else mid+d*co
def head(u,v):
    p=120+101*v;a=u*2*pi;cx=tab(p,headrows[:,0],headrows[:,1]);rx=tab(p,headrows[:,0],headrows[:,2]);x=cx+rx*np.sin(a)
    y=np.where(np.cos(a)>=0,skull_at(x,p),skull_at(x,p,False));return x,y,p,a
savepart('sculpted_face',head,'head','head',(960,820),(136,112))
hairrows=[(117,181,1,-3,4),(121,182,18,-19,23),(127,182,31,-31,34),(136,180,39,-38,42),(146,179,43,-41,47),(157,180,44,-42,48),(171,179,41,-32,49),(186,180,36,-21,45),(201,180,31,-3,40),(218,179,21,9,30)]
def hair(u,v):
    a=u*2*pi;co=np.cos(a);si=np.sin(a)
    end=149+36*(1-co)/2+18*np.abs(si)**2+11*np.maximum(0,-si)*np.maximum(co,0)+9*(np.maximum(0,-co))**2+5*np.sin(2*a-.7)*np.maximum(co,0)+1.6*np.sin(29*a)+1.4*np.sin(49*a+.4)
    p=117+(end-117)*v;rr=np.array(hairrows);cx,rx,fr,bk=[tab(p,rr[:,0],rr[:,k]) for k in range(1,5)]
    fl=.8*np.sin(23*a+7*v)*np.sin(pi*v)+.45*np.sin(31*a-9*v)
    return cx+(rx+fl)*si,(fr+bk)/2-((bk-fr)/2+fl)*co,p,a
savepart('swept_pepper_hair',hair,'head','head',(780,512),(128,54))
savepart('neck',loft([(203,181,17,-22,23),(220,181,20,-27,23),(238,180,19,-24,20),(261,180,29,-29,27)]),'neck','neck',(256,256),(48,26))
savepart('graphite_shirt',loft([(237,180,19,-24,24),(255,180,45,-29,37),(280,180,71,-39,45),(314,180,71,-43,48),(363,180,65,-39,45),(420,180,58,-34,41),(460,180,56,-35,39),(481,180,53,-30,31)]),'shirt','torso',(420,580),(70,58))
def coat(u,v):
    gapL=tab(v,[0,.13,.42,1],[.38,.56,.79,.62]);gapR=tab(v,[0,.13,.42,1],[.39,.51,.51,.35]);a=gapL+(2*pi-gapL-gapR)*u;cs=np.cos(a);sn=np.sin(a)
    # Lapels open at the neck and taper toward the first button.
    extra=.05*np.exp(-((v-.10)/.20)**2);a+=(1-2*u)*extra
    cs=np.cos(a);sn=np.sin(a)
    top=242+14*np.abs(sn)**1.6+7*np.maximum(cs,0);hem=724-13*np.maximum(sn,0)*(.35+.65*np.maximum(cs,0))+2*np.cos(4*a)
    p=top+(hem-top)*v;ys=[237,255,278,315,356,405,457,517,600,724]
    rx=tab(p,ys,[30,57,84,80,74,66,68,81,98,115]);fr=tab(p,ys,[-32,-36,-48,-52,-48,-44,-44,-52,-60,-61]);bk=tab(p,ys,[30,42,51,54,51,48,48,52,62,80])
    fold=(2*np.sin(13*a+v*3)+1.4*np.sin(21*a-v*6))*(.2+.8*v)+.8*np.sin(36*v+4*a)*np.exp(-((v-.4)/.17)**2)
    return 180+(rx+fold)*sn,(fr+bk)/2-((bk-fr)/2+fold)*cs,p,a
savepart('open_lab_coat',coat,'coat','coat',(1280,1024),(120,96),closed=False)
for j in range(2):
    def tier(u,v):
        x,y,p,a=coat(.01+(.47-j*.055)*u,.43+(.54-j*.035)*v)
        return x+(j+1)*2.3*np.sin(a),y-(j+1)*2.3*np.cos(a),p-(j+1)*4*v*np.maximum(0,np.cos(a)),a
    savepart('stepped_coat_panel_'+str(j),tier,'coat','coat',(430,430),(42,35),closed=False)
for side,s in [(-1,'R'),(1,'L')]:
    rr=[(262,180+side*63,11,-13,16),(280,180+side*78,19,-18,27),(305,180+side*84,22,-22,28),(353,180+side*93,21,-22,25),(392,180+side*103,19,-23,22),(407,180+side*105,23,-26,23),(425,180+side*107,20,-24,22),(463,180+side*111,18,-30,13),(507,180+side*115,17,-32,6),(527,180+side*116,17,-32,5)]
    base=loft(rr)
    def sleeve(u,v):
        x,y,p,a=base(u,v);f=1.8*np.sin(32*v+3*a)*np.exp(-((v-.55)/.17)**2)
        return x+f*np.sin(a),y-f*np.cos(a),p,a
    savepart('coat_sleeve_'+s,sleeve,'sleeve','arm'+s,(440,620),(52,62),side)
    # Cloth-covered pelvis joins the two separately skinned trouser legs.
    rows=[(469,180+side*27,28,-28,28),(500,180+side*34,32,-34,35),(551,180+side*39,32,-38,32),(630,180+side*45,29,-40,28),(689,180+side*47,27,-39,28),(717,180+side*51,28,-38,26),(745,180+side*52,25,-34,22),(823,180+side*56,26,-30,25),(880,180+side*59,25,-27,27),(909,180+side*61,27,-28,30),(937,180+side*62,24,-25,27)]
    legbase=loft(rows)
    def leg(u,v):
        x,y,p,a=legbase(u,v);f=2*np.sin(41*v+3*a)*np.exp(-((v-.94)/.10)**2)+.9*np.cos(7*a+v*3)
        return x+f*np.sin(a),y-f*np.cos(a),p,a
    savepart('pressed_trousers_'+s,leg,'leg','leg'+s,(320,650),(50,62),side)
    cx=180+side*65
    savepart('laced_shoe_'+s,loft([(923,cx,19,-20,23),(937,cx,22,-27,25),(948,cx,24,-51,26),(959,cx+side*1,27,-76,26),(968,cx+side*3,28,-80,27),(975,cx+side*3,28,-80,27),(979,cx+side*3,26,-78,25)]),'boot','foot'+s,(370,192),(60,26),side)
(W/'parts.json').write_text(json.dumps(parts,separators=(',',':')),encoding='utf-8')
print('SURFACES',len(parts),flush=True)
