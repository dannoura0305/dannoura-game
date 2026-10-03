// ══════════════════════════════════════════════════════════
// パズル「配線復旧パズル」
// タイルをタップして回転させ、⚡電源からすべての配線に電気を通す。
// 盤面はランダムな全域木（交差タイルは2本の独立した線として扱う）から作り、
// 解いた状態から回転させて崩すので必ず解ける。目安手数＝その解に戻す最小回転数。
// 面が進むと「固定タイル」「故障タイル」「交差タイル」が登場する。
// 描画はすべてCanvas 2D。
// ══════════════════════════════════════════════════════════
addMinigameStyle('puzzle',`
.mg-puzzle{padding:0;}
.pz-wrap{position:relative;flex:1;min-height:0;width:100%;}
.pz-cv{position:absolute;inset:0;display:block;width:100%;height:100%;touch-action:none;-webkit-tap-highlight-color:transparent;cursor:pointer;user-select:none;-webkit-user-select:none;}
`);

(()=>{
const N=1,E=2,S=4,W=8;
const AX=[0,1,0,-1],AY=[-1,0,1,0];            // ビット番号 0:N 1:E 2:S 3:W
const T_N=0,T_LOCK=1,T_BRK=2,T_BR=3,T_SRC=4;
const rot=m=>((m<<1)|(m>>3))&15;               // 時計回りに90°
const pop=m=>(m&1)+(m>>1&1)+(m>>2&1)+(m>>3&1);
const OPP=b=>b===N?S:b===S?N:b===E?W:E;
const FONT='"DotGothic16", monospace';
const CFG=[
  {n:4,locks:0,broken:0,bridges:0,minPar:5,
   title:'第1面　4×4 配電盤',hint:'タップで回転／⚡から全ランプへ',
   lines:[['タイルをタップ','→ 90°回転'],['⚡電源から','全ランプを点灯'],['目安手数以内で','★★★ ＋時間']]},
  {n:5,locks:3,broken:2,bridges:0,minPar:10,
   title:'第2面　5×5 配電盤',hint:'固定タイルは回らない／故障はまず修理',
   lines:[['固定タイル','回らない。手がかりに'],['故障タイル','1回目のタップで修理'],['','修理後は普通に回る']]},
  {n:6,locks:4,broken:3,bridges:2,minPar:16,
   title:'第3面　6×6 配電盤',hint:'交差タイルは2本の線が立体交差',
   lines:[['交差タイル','縦と横が別々の線'],['','回らない。両方通電で完了'],['残り時間に注意','最後の盤だ']]},
];

// 盤面生成（純関数）：{n,src,type,sol,cur,par}
function makeBoard(cfg,rnd){
  rnd=rnd||Math.random;
  const ri=k=>Math.floor(rnd()*k);
  const n=cfg.n,NN=n*n,src=(n>>1)*n+(n>>1);
  for(let attempt=0;attempt<400;attempt++){
    const type=new Uint8Array(NN);type[src]=T_SRC;
    // 交差タイル：内側のマスで、上下左右が交差タイルでない場所
    let br=0,tries=0;
    while(br<cfg.bridges&&tries++<300){
      const x=1+ri(n-2),y=1+ri(n-2),c=y*n+x;
      if(type[c])continue;
      if(type[c-1]===T_BR||type[c+1]===T_BR||type[c-n]===T_BR||type[c+n]===T_BR)continue;
      if(c-1===src||c+1===src||c-n===src||c+n===src)continue;
      type[c]=T_BR;br++;
    }
    if(br<cfg.bridges)continue;
    const par_=new Int16Array(NN).map((_,i)=>i);
    const find=a=>{while(par_[a]!==a){par_[a]=par_[par_[a]];a=par_[a];}return a;};
    const sol=new Uint8Array(NN),edges=[];let unions=0,ok=true;
    for(let c=0;c<NN;c++){
      if(type[c]===T_BR){sol[c]=15;continue;}
      const x=c%n,y=(c/n)|0;
      if(x+1<n){
        if(type[c+1]!==T_BR)edges.push([c,c+1,E,W]);
        else{const a=find(c),b=find(c+2);if(a===b)ok=false;else{par_[a]=b;unions++;sol[c]|=E;sol[c+2]|=W;}}
      }
      if(y+1<n){
        if(type[c+n]!==T_BR)edges.push([c,c+n,S,N]);
        else{const a=find(c),b=find(c+2*n);if(a===b)ok=false;else{par_[a]=b;unions++;sol[c]|=S;sol[c+2*n]|=N;}}
      }
    }
    if(!ok)continue;
    for(let i=edges.length-1;i>0;i--){const j=ri(i+1);const t=edges[i];edges[i]=edges[j];edges[j]=t;}
    for(const [a,b,da,db] of edges){
      const ra=find(a),rb=find(b);if(ra===rb)continue;
      par_[ra]=rb;unions++;sol[a]|=da;sol[b]|=db;
    }
    if(unions!==NN-br-1)continue;
    // 固定・故障タイル
    const pick=(cnt,t,cond)=>{let k=0,g=0;while(k<cnt&&g++<300){const c=ri(NN);if(type[c]!==T_N||!cond(c))continue;type[c]=t;k++;}return k===cnt;};
    if(!pick(cfg.locks,T_LOCK,c=>pop(sol[c])<4&&pop(sol[c])>1))continue;
    if(!pick(cfg.broken,T_BRK,c=>pop(sol[c])<4))continue;
    // 崩す
    const cur=new Uint8Array(sol);let par=0;
    for(let c=0;c<NN;c++){
      if(type[c]===T_LOCK||type[c]===T_BR)continue;
      const k=ri(4);for(let i=0;i<k;i++)cur[c]=rot(cur[c]);
      let mm=cur[c],r=0;while(mm!==sol[c]){mm=rot(mm);r++;}
      par+=r+(type[c]===T_BRK?1:0);
    }
    if(par<cfg.minPar)continue;
    const brk=new Uint8Array(NN);for(let c=0;c<NN;c++)if(type[c]===T_BRK)brk[c]=1;
    if(cfg.broken===0&&calcPower(n,src,type,cur,brk,new Uint8Array(NN),new Uint8Array(NN*2)).done)continue;
    return {n,src,type,sol,cur,par};
  }
  return null;
}

// 通電計算：pw[c] bit1=縦/通常, bit2=横（交差タイル）。inD[c*2+ax]=入ってきた口
function calcPower(n,src,type,m,brk,pw,inD){
  pw.fill(0);inD.fill(0);
  const q=[src*2];pw[src]=1;let cnt=1,need=0;
  for(let c=0;c<n*n;c++)need+=type[c]===T_BR?2:1;
  for(let h=0;h<q.length;h++){
    const node=q[h],c=node>>1,ax=node&1,x=c%n,y=(c/n)|0;
    const ports=type[c]===T_BR?(ax?E|W:N|S):m[c];
    for(let b=0;b<4;b++){
      const bit=1<<b;if(!(ports&bit))continue;
      const nx=x+AX[b],ny=y+AY[b];if(nx<0||ny<0||nx>=n||ny>=n)continue;
      const nc=ny*n+nx,o=OPP(bit);
      if(brk[nc]||!(m[nc]&o))continue;
      const nax=type[nc]===T_BR?((o===N||o===S)?0:1):0,pb=1<<nax;
      if(pw[nc]&pb)continue;
      pw[nc]|=pb;inD[nc*2+nax]=o;cnt++;q.push(nc*2+nax);
    }
  }
  return {cnt,need,done:cnt===need};
}

const ease=t=>1-(1-t)*(1-t)*(1-t);
const easeBack=t=>{const c1=1.9,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};

registerMinigame({
  id:'puzzle', icon:'⚡', name:'配線復旧パズル', genre:'パズル', bgm:'factory',
  desc:'停電したラインの配電盤を復旧する。タイルを回して全部のランプに電気を通そう。少ない手数ほど高評価。',
  effect:'資格知識↑ 仕事評価↑ 収入↑ ／ 疲労+6 約60分',
  help:'タップで回転・全ランプ点灯',
  start(body,mg){
    const TIME=90;
    let left=TIME,level=0,solved=0,starsTotal=0,moves=0;
    const boardStars=[];
    let st='intro',stT=0,T=0,lastSec=-1,warned=false,clearInfo=null,stampSE=false,starSE=0;
    let n=4,src=0,type,m,sol,brk,par=0,anim,pw,inD,litAt,fixAt,lamps=0,lit=0;
    let shakeC=-1,shakeT=0,cursor=0,kbd=false,msgText='',msgT=0,boardIn=0;
    let W=0,H=0,dpr=1,ts=40,ox=0,oy=0,BS=0,bx=0,by=0,pad=10,hudH=64,footH=40,fsS=11,fsM=13;
    let tiles={},bgImg=null,staticImg=null,staticOk=false;

    body.innerHTML='<div class="pz-wrap"><canvas class="pz-cv"></canvas></div>';
    const wrap=body.firstChild,cv=wrap.firstChild,cx=cv.getContext('2d');

    // ── 光のスプライト ──
    const mkC=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const mkGlow=rgb=>{const c=mkC(64,64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);
      gr.addColorStop(0,`rgba(${rgb},1)`);gr.addColorStop(.25,`rgba(${rgb},.45)`);gr.addColorStop(.6,`rgba(${rgb},.12)`);gr.addColorStop(1,`rgba(${rgb},0)`);
      g.fillStyle=gr;g.fillRect(0,0,64,64);return c;};
    const GL_GOLD=mkGlow('255,196,80'),GL_CY=mkGlow('0,232,200'),GL_RD=mkGlow('255,60,90'),GL_WH=mkGlow('220,255,250');

    // ── パーティクル（固定長プール） ──
    const PMAX=260,px=new Float32Array(PMAX),py=new Float32Array(PMAX),pvx=new Float32Array(PMAX),pvy=new Float32Array(PMAX),pl=new Float32Array(PMAX),pml=new Float32Array(PMAX),pc=new Uint8Array(PMAX);
    let pHead=0;
    const PCOL=['#9ffff0','#ffd77a','#ff6a7a','#ffffff'];
    function spark(x,y,cnt,col,spd){
      for(let i=0;i<cnt;i++){
        const k=pHead;pHead=(pHead+1)%PMAX;
        const a=Math.random()*Math.PI*2,v=spd*(.35+Math.random()*.9);
        px[k]=x;py[k]=y;pvx[k]=Math.cos(a)*v;pvy[k]=Math.sin(a)*v;pml[k]=pl[k]=.25+Math.random()*.35;pc[k]=col;
      }
    }
    // ── 雨 ──
    const RN=44,rx=new Float32Array(RN),ry=new Float32Array(RN),rl=new Float32Array(RN),rv=new Float32Array(RN);
    for(let i=0;i<RN;i++){rx[i]=Math.random();ry[i]=Math.random();rl[i]=8+Math.random()*16;rv[i]=.5+Math.random()*.6;}

    // ── レイアウト ──
    function layout(){
      const r=wrap.getBoundingClientRect();
      W=Math.max(200,r.width|0);H=Math.max(240,r.height|0);dpr=Math.min(3,window.devicePixelRatio||1);
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
      fsS=Math.max(10,Math.min(13,W/32));fsM=Math.max(12,Math.min(15,W/27));
      hudH=Math.round(fsM*2+fsS+22);footH=Math.round(fsS*2+16);
      const avail=Math.min(W-20,H-hudH-footH-8,540);
      pad=Math.max(8,Math.min(16,avail*.035));
      ts=Math.max(16,Math.floor((avail-2*pad)/n));
      BS=ts*n+2*pad;bx=(W-BS)/2;by=hudH+Math.max(0,(H-hudH-footH-BS)*.3);ox=bx+pad;oy=by+pad;
      buildBg();buildTiles();staticOk=false;
    }
    function buildBg(){
      const c=mkC(cv.width,cv.height),g=c.getContext('2d');g.scale(dpr,dpr);
      let gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0c0820');gr.addColorStop(1,'#04030b');
      g.fillStyle=gr;g.fillRect(0,0,W,H);
      gr=g.createRadialGradient(W*.5,-H*.05,0,W*.5,-H*.05,H*.7);gr.addColorStop(0,'rgba(138,82,212,.22)');gr.addColorStop(1,'rgba(138,82,212,0)');
      g.fillStyle=gr;g.fillRect(0,0,W,H);
      gr=g.createRadialGradient(W*.5,H*1.05,0,W*.5,H*1.05,H*.55);gr.addColorStop(0,'rgba(0,232,200,.07)');gr.addColorStop(1,'rgba(0,232,200,0)');
      g.fillStyle=gr;g.fillRect(0,0,W,H);
      g.strokeStyle='rgba(138,82,212,.06)';g.lineWidth=1;g.beginPath();
      for(let x=12;x<W;x+=24){g.moveTo(x+.5,0);g.lineTo(x+.5,H);}
      for(let y=12;y<H;y+=24){g.moveTo(0,y+.5);g.lineTo(W,y+.5);}
      g.stroke();
      // 盤の枠
      const fr=Math.max(6,ts*.14);
      g.save();g.shadowColor='rgba(0,0,0,.8)';g.shadowBlur=18;g.shadowOffsetY=6;
      rr(g,bx-4,by-4,BS+8,BS+8,fr+3);g.fillStyle='#07050f';g.fill();g.restore();
      gr=g.createLinearGradient(bx,by,bx+BS,by+BS);gr.addColorStop(0,'#2b2445');gr.addColorStop(.5,'#18132b');gr.addColorStop(1,'#0e0b1b');
      rr(g,bx,by,BS,BS,fr);g.fillStyle=gr;g.fill();
      g.lineWidth=1.5;g.strokeStyle='rgba(138,82,212,.55)';g.stroke();
      rr(g,ox-2,oy-2,n*ts+4,n*ts+4,4);g.fillStyle='#05030b';g.fill();
      g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;g.stroke();
      const sr=Math.max(2.5,pad*.28);
      [[bx+pad*.5,by+pad*.5],[bx+BS-pad*.5,by+pad*.5],[bx+pad*.5,by+BS-pad*.5],[bx+BS-pad*.5,by+BS-pad*.5]].forEach(([x,y])=>screw(g,x,y,sr));
      bgImg=c;
    }
    function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
    function screw(g,x,y,r){
      const gr=g.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);gr.addColorStop(0,'#a59cc0');gr.addColorStop(.6,'#4e4568');gr.addColorStop(1,'#1a1528');
      g.beginPath();g.arc(x,y+r*.25,r,0,7);g.fillStyle='rgba(0,0,0,.6)';g.fill();
      g.beginPath();g.arc(x,y,r,0,7);g.fillStyle=gr;g.fill();
      g.strokeStyle='rgba(20,15,35,.9)';g.lineWidth=Math.max(1,r*.3);g.beginPath();g.moveTo(x-r*.6,y+r*.3);g.lineTo(x+r*.6,y-r*.3);g.stroke();
    }
    function buildTiles(){
      const s=Math.max(10,Math.round(ts*dpr));
      const pal={n:['#2b2444','#151027'],lock:['#262a3c','#10121e'],brk:['#2e1c28','#120a12'],fix:['#2b2444','#151027'],br:['#262046','#110d24'],src:['#3d2e18','#170f08']};
      Object.keys(pal).forEach(k=>{
        const c=mkC(s,s),g=c.getContext('2d'),i=s*.03,r=s*.1;
        let gr=g.createLinearGradient(0,0,s,s);gr.addColorStop(0,pal[k][0]);gr.addColorStop(1,pal[k][1]);
        rr(g,i,i,s-2*i,s-2*i,r);g.fillStyle=gr;g.fill();
        g.save();rr(g,i,i,s-2*i,s-2*i,r);g.clip();
        g.globalAlpha=.05;g.fillStyle='#fff';
        for(let y=i;y<s;y+=Math.max(2,s/22))g.fillRect(0,y,s,Math.max(.6,s/110));
        g.globalAlpha=1;
        if(k==='lock'){
          g.save();g.beginPath();g.rect(0,0,s,s);rr(g,s*.11,s*.11,s*.78,s*.78,r*.6);g.clip('evenodd');
          g.fillStyle='rgba(232,184,48,.5)';
          for(let x=-s;x<s*2;x+=s*.16){g.beginPath();g.moveTo(x,0);g.lineTo(x+s*.08,0);g.lineTo(x+s*.08-s,s);g.lineTo(x-s,s);g.closePath();g.fill();}
          g.restore();
        }
        if(k==='brk'){
          gr=g.createRadialGradient(s*.5,s*.5,0,s*.5,s*.5,s*.5);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(40,0,10,0)');
          g.fillStyle=gr;g.fillRect(0,0,s,s);
          g.strokeStyle='rgba(0,0,0,.7)';g.lineWidth=s*.02;g.beginPath();
          g.moveTo(s*.15,s*.25);g.lineTo(s*.32,s*.38);g.lineTo(s*.28,s*.5);g.moveTo(s*.85,s*.72);g.lineTo(s*.66,s*.66);g.lineTo(s*.7,s*.82);g.stroke();
        }
        if(k==='fix'){
          g.save();g.translate(s*.78,s*.24);g.rotate(.7);
          g.fillStyle='rgba(201,162,39,.55)';g.fillRect(-s*.2,-s*.05,s*.4,s*.1);
          g.fillStyle='rgba(0,0,0,.25)';for(let t=-s*.18;t<s*.2;t+=s*.06)g.fillRect(t,-s*.05,s*.02,s*.1);
          g.restore();
        }
        if(k==='src'){
          g.strokeStyle='rgba(232,184,48,.35)';g.lineWidth=s*.02;g.beginPath();g.arc(s/2,s/2,s*.4,0,7);g.stroke();
          g.setLineDash([s*.05,s*.05]);g.beginPath();g.arc(s/2,s/2,s*.44,0,7);g.stroke();g.setLineDash([]);
        }
        g.restore();
        gr=g.createLinearGradient(0,0,s,s);gr.addColorStop(0,'rgba(255,255,255,.2)');gr.addColorStop(.5,'rgba(255,255,255,.02)');gr.addColorStop(1,'rgba(0,0,0,.6)');
        rr(g,i+s*.01,i+s*.01,s-2*i-s*.02,s-2*i-s*.02,r);g.strokeStyle=gr;g.lineWidth=Math.max(1,s*.025);g.stroke();
        rr(g,i,i,s-2*i,s-2*i,r);g.strokeStyle='rgba(0,0,0,.7)';g.lineWidth=Math.max(1,s*.012);g.stroke();
        const rv=s*.13,rs=Math.max(1.2,s*.032);
        [[rv,rv],[s-rv,rv],[rv,s-rv],[s-rv,s-rv]].forEach(([x,y])=>{
          if(k==='lock'&&x>s/2&&y<s/2)return;
          const gg=g.createRadialGradient(x-rs*.4,y-rs*.4,0,x,y,rs);gg.addColorStop(0,'#b8b0d0');gg.addColorStop(.7,'#4a4262');gg.addColorStop(1,'#16121f');
          g.beginPath();g.arc(x,y+rs*.35,rs,0,7);g.fillStyle='rgba(0,0,0,.55)';g.fill();
          g.beginPath();g.arc(x,y,rs,0,7);g.fillStyle=gg;g.fill();
        });
        if(k==='lock'){ // 南京錠
          const lx=s*.8,ly=s*.2,lw=s*.13;
          g.strokeStyle='#cfc6e0';g.lineWidth=s*.022;g.beginPath();g.arc(lx,ly-lw*.15,lw*.32,Math.PI,0);g.stroke();
          g.fillStyle='#e8b830';rr(g,lx-lw/2,ly-lw*.15,lw,lw*.75,lw*.12);g.fill();
          g.fillStyle='#3a2a08';g.fillRect(lx-lw*.06,ly+lw*.05,lw*.12,lw*.28);
        }
        tiles[k]=c;
      });
    }

    // ── 盤面 ──
    function newBoard(){
      const cfg=CFG[level];
      const b=makeBoard(cfg);
      n=b.n;src=b.src;type=b.type;sol=b.sol;m=b.cur;par=b.par;
      brk=new Uint8Array(n*n);for(let c=0;c<n*n;c++)if(type[c]===T_BRK)brk[c]=1;
      anim=new Float32Array(n*n);pw=new Uint8Array(n*n);inD=new Uint8Array(n*n*2);
      litAt=new Float32Array(n*n).fill(-9);fixAt=new Float32Array(n*n).fill(-9);
      moves=0;cursor=src;lamps=0;
      for(let c=0;c<n*n;c++)if(isLamp(c))lamps++;
      layout();recalc(true);
    }
    const isLamp=c=>type[c]!==T_SRC&&type[c]!==T_BR&&pop(m[c])===1;
    function recalc(silent){
      const r=calcPower(n,src,type,m,brk,pw,inD);
      lit=0;
      for(let c=0;c<n*n;c++){
        if(!isLamp(c))continue;
        if(pw[c]){lit++;if(litAt[c]<0){litAt[c]=T+.12;if(!silent){const p=cellXY(c);spark(p[0],p[1],6,1,ts*2.2);}}}
        else litAt[c]=-9;
      }
      return r.done;
    }
    const cellXY=c=>[ox+(c%n+.5)*ts,oy+(((c/n)|0)+.5)*ts];
    const slack=()=>Math.max(3,Math.ceil(par*.35));
    const starsFor=mv=>mv<=par?3:mv<=par+slack()?2:1;

    function msg(t){msgText=t;msgT=1.8;}
    function turn(c){
      if(st!=='play'||mg._ended)return;
      cursor=c;
      if(type[c]===T_LOCK||type[c]===T_BR){
        AU.se('back');shakeC=c;shakeT=.3;msg(type[c]===T_LOCK?'固定タイルは回らない':'交差タイルは回らない');return;
      }
      moves++;
      const p=cellXY(c);
      if(brk[c]){
        brk[c]=0;fixAt[c]=T;staticOk=false;AU.se('machine');spark(p[0],p[1],16,1,ts*3);spark(p[0],p[1],8,2,ts*2);msg('修理完了。これで回せる');
      }else{
        m[c]=rot(m[c]);anim[c]=Math.min(2,anim[c]+1);AU.se('tool');
      }
      if(recalc(false)){
        const stars=starsFor(moves),bonus=stars===3?6:stars===2?3:0;
        solved++;starsTotal+=stars;boardStars.push(stars);left+=bonus;
        clearInfo={stars,bonus,moves,par};st='clear';stT=-.2;stampSE=false;starSE=0;
        AU.se('repair');updScore();
      }
    }
    function updScore(){mg.setScore(`復旧 ${solved}/${CFG.length}面　★${starsTotal}`);}

    // ── 入力 ──
    function tap(x,y){
      if(st==='intro'){if(stT>.35)startPlay();return;}
      if(st==='clear'){if(stT>1.1)stT=Math.max(stT,2.3);return;}
      if(st!=='play')return;
      const gx=Math.floor((x-ox)/ts),gy=Math.floor((y-oy)/ts);
      if(gx<0||gy<0||gx>=n||gy>=n)return;
      turn(gy*n+gx);
    }
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();if(mg._ended)return;
      const r=cv.getBoundingClientRect();kbd=false;tap(e.clientX-r.left,e.clientY-r.top);
    });
    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      const k=e.key;
      if(st==='intro'){if(k===' '||k==='Enter'){e.preventDefault();if(stT>.35)startPlay();}return;}
      if(st==='clear'){if(k===' '||k==='Enter'){e.preventDefault();if(stT>1.1)stT=Math.max(stT,2.3);}return;}
      if(st!=='play')return;
      const x=cursor%n,y=(cursor/n)|0;
      if(k==='ArrowLeft'||k==='a'){e.preventDefault();kbd=true;cursor=y*n+Math.max(0,x-1);}
      else if(k==='ArrowRight'||k==='d'){e.preventDefault();kbd=true;cursor=y*n+Math.min(n-1,x+1);}
      else if(k==='ArrowUp'||k==='w'){e.preventDefault();kbd=true;cursor=Math.max(0,y-1)*n+x;}
      else if(k==='ArrowDown'||k==='s'){e.preventDefault();kbd=true;cursor=Math.min(n-1,y+1)*n+x;}
      else if(k===' '||k==='Enter'){e.preventDefault();kbd=true;turn(cursor);}
    });
    function startPlay(){st='play';stT=0;AU.se('decide');}

    // ── 描画 ──
    function dispOff(c){const a=anim[c];return a>1?a:1-easeBack(1-a);}
    // 配線の腕をまとめてパスに積む。layer 0:通常（交差の縦） 1:交差の横
    // cat -1:全部 0:未通電 1:通電 2:故障。flow=true で電気の流れる向きに引く
    function armPath(layer,cat,flow,f0){
      cx.beginPath();const h=ts/2;
      for(let c=0;c<n*n;c++){
        const mk=m[c],tc=type[c];
        if(layer===1&&tc!==T_BR)continue;
        const off=dispOff(c),ang=-off*Math.PI/2,co=Math.cos(ang),si=Math.sin(ang);
        let x0=ox+(c%n+.5)*ts,y0=oy+(((c/n)|0)+.5)*ts;
        if(c===shakeC&&shakeT>0)x0+=Math.sin(T*70)*shakeT*ts*.25;
        const shown=anim[c]<.3;
        for(let b=0;b<4;b++){
          if(!(mk&(1<<b)))continue;
          let ax=0;
          if(tc===T_BR){ax=b&1;if(ax!==layer)continue;}
          if(cat>=0){
            const ct=brk[c]?2:(shown&&(pw[c]&(1<<ax)))?1:0;
            if(ct!==cat)continue;
          }
          const vx=(AX[b]*co-AY[b]*si)*h,vy=(AX[b]*si+AY[b]*co)*h;
          if(flow){
            if(inD[c*2+ax]===(1<<b)){cx.moveTo(x0+vx,y0+vy);cx.lineTo(x0,y0);}
            else{cx.moveTo(x0,y0);cx.lineTo(x0+vx,y0+vy);}
          }else{cx.moveTo(x0+vx*f0,y0+vy*f0);cx.lineTo(x0+vx,y0+vy);}
        }
      }
    }
    function drawCables(layer){
      cx.lineCap='butt';
            armPath(layer,-1,false,0);cx.lineWidth=ts*.36;cx.strokeStyle='#06040c';cx.stroke();
      armPath(layer,-1,false,.8);cx.lineWidth=ts*.42;cx.strokeStyle='#3e3656';cx.stroke();
      cx.lineWidth=ts*.08;cx.strokeStyle='#8a80a8';cx.stroke();
      armPath(layer,0,false,0);cx.lineWidth=ts*.25;cx.strokeStyle='#2a2142';cx.stroke();
      cx.lineWidth=ts*.07;cx.strokeStyle='#4f4070';cx.stroke();
      armPath(layer,2,false,0);cx.lineWidth=ts*.25;cx.strokeStyle='#3b1924';cx.stroke();
      cx.setLineDash([ts*.05,ts*.09]);cx.lineWidth=ts*.07;cx.strokeStyle='#7a2236';cx.stroke();cx.setLineDash([]);
      armPath(layer,1,false,0);cx.lineWidth=ts*.25;cx.strokeStyle='#0f3a3c';cx.stroke();
      cx.globalCompositeOperation='lighter';
      cx.lineWidth=ts*.34;cx.strokeStyle='rgba(0,232,200,.10)';cx.stroke();
      cx.globalCompositeOperation='source-over';
      cx.lineWidth=ts*.09;cx.strokeStyle='#00c8ae';cx.stroke();
      armPath(layer,1,true,0);
      cx.setLineDash([ts/8,ts/8]);cx.lineDashOffset=-((T*ts*1.6)%(ts/4));
      cx.lineWidth=ts*.06;cx.strokeStyle='#d8fff8';cx.stroke();cx.setLineDash([]);
    }
    function boltPath(x,y,r){
      cx.beginPath();cx.moveTo(x+r*.15,y-r);cx.lineTo(x-r*.5,y+r*.12);cx.lineTo(x-r*.02,y+r*.12);cx.lineTo(x-r*.18,y+r);
      cx.lineTo(x+r*.52,y-r*.2);cx.lineTo(x+r*.04,y-r*.2);cx.closePath();
    }
    function drawHubs(){
      for(let c=0;c<n*n;c++){
        const tc=type[c];if(tc===T_BR)continue;
        let [x,y]=cellXY(c);if(c===shakeC&&shakeT>0)x+=Math.sin(T*70)*shakeT*ts*.25;
        const on=pw[c]&&anim[c]<.3;
        if(tc===T_SRC){
          const r=ts*.3;
          cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;cx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r+ts*.03);}cx.closePath();cx.fillStyle='rgba(0,0,0,.6)';cx.fill();
          cx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3+Math.PI/6;cx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}cx.closePath();
          cx.fillStyle='#c8961e';cx.fill();cx.lineWidth=Math.max(1,ts*.025);cx.strokeStyle='#ffe08a';cx.stroke();
          cx.beginPath();cx.arc(x,y,r*.72,0,7);cx.fillStyle='#1a1206';cx.fill();
          const pu=.75+.25*Math.sin(T*6);
          cx.globalCompositeOperation='lighter';cx.globalAlpha=.55*pu;cx.drawImage(GL_CY,x-ts*.8,y-ts*.8,ts*1.6,ts*1.6);cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
          boltPath(x,y,r*.6);cx.fillStyle='#bafff3';cx.fill();
          continue;
        }
        if(brk[c]){
          cx.beginPath();cx.arc(x,y,ts*.17,0,7);cx.fillStyle='#120609';cx.fill();
          cx.lineWidth=Math.max(1,ts*.025);cx.strokeStyle='#5a1d2a';cx.stroke();
          const fl=Math.random()<.12;
          cx.strokeStyle=fl?'#ff9aa8':'#c8344c';cx.lineWidth=Math.max(1,ts*.03);cx.beginPath();
          cx.moveTo(x-ts*.1,y-ts*.08);cx.lineTo(x-ts*.02,y+ts*.02);cx.lineTo(x+ts*.04,y-ts*.04);cx.lineTo(x+ts*.11,y+ts*.08);cx.stroke();
          if(fl){cx.globalCompositeOperation='lighter';cx.drawImage(GL_RD,x-ts*.5,y-ts*.5,ts,ts);cx.globalCompositeOperation='source-over';if(Math.random()<.4)spark(x,y,2,2,ts*1.5);}
          continue;
        }
        if(isLamp(c)){
          const r=ts*.2;
          cx.beginPath();cx.arc(x,y+ts*.025,r*1.18,0,7);cx.fillStyle='rgba(0,0,0,.6)';cx.fill();
          cx.beginPath();cx.arc(x,y,r*1.18,0,7);cx.fillStyle='#3a3354';cx.fill();
          cx.lineWidth=Math.max(1,ts*.02);cx.strokeStyle='#7d7398';cx.stroke();
          const la=on&&litAt[c]>-1?Math.max(0,Math.min(1,(T-litAt[c])/.15)):0;
          cx.beginPath();cx.arc(x,y,r,0,7);
          cx.fillStyle=la>0?'#fff0b0':'#1d1830';cx.fill();
          if(la>0){
            const fl=(.86+.1*Math.sin(T*21+c*3.1)*Math.sin(T*6.3+c))*(Math.random()<.008?.4:1);
            cx.beginPath();cx.arc(x,y,r*.5,0,7);cx.fillStyle='#ffffff';cx.fill();
            cx.globalCompositeOperation='lighter';
            const boost=1+Math.max(0,.6-(T-litAt[c]))*1.5;
            cx.globalAlpha=la*fl*.9;const g=ts*2.3*boost;cx.drawImage(GL_GOLD,x-g/2,y-g/2,g,g);
            cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
          }else{
            cx.strokeStyle='rgba(255,255,255,.18)';cx.lineWidth=Math.max(1,ts*.02);cx.beginPath();cx.arc(x,y,r*.65,Math.PI*1.1,Math.PI*1.5);cx.stroke();
          }
          continue;
        }
        const r=ts*.16;
        cx.beginPath();cx.arc(x,y,r,0,7);cx.fillStyle='#2c2542';cx.fill();
        cx.lineWidth=Math.max(1,ts*.02);cx.strokeStyle='#6a6088';cx.stroke();
        cx.beginPath();cx.arc(x,y,r*.45,0,7);cx.fillStyle=on?'#7affea':'#151022';cx.fill();
        if(T-fixAt[c]<.6){cx.globalCompositeOperation='lighter';cx.globalAlpha=1-(T-fixAt[c])/.6;cx.drawImage(GL_GOLD,x-ts,y-ts,ts*2,ts*2);cx.globalAlpha=1;cx.globalCompositeOperation='source-over';}
      }
    }
    // 交差タイル：横の線を載せる金属の橋板（縦の線はこの下をくぐる）
    function drawBridgePlates(){
      for(let c=0;c<n*n;c++){
        if(type[c]!==T_BR)continue;
        const [x,y]=cellXY(c),w=ts*.5,h=ts*.66;
        cx.fillStyle='rgba(0,0,0,.55)';rr(cx,x-w/2-ts*.03,y-h/2+ts*.05,w+ts*.06,h,ts*.07);cx.fill();
        const gr=cx.createLinearGradient(x,y-h/2,x,y+h/2);gr.addColorStop(0,'#5a5280');gr.addColorStop(1,'#2a2440');
        rr(cx,x-w/2,y-h/2,w,h,ts*.07);cx.fillStyle=gr;cx.fill();
        cx.lineWidth=Math.max(1,ts*.02);cx.strokeStyle='#9a90b8';cx.stroke();
        cx.fillStyle='#c0b8d8';
        for(const sy of [-1,1]){cx.beginPath();cx.arc(x,y+sy*h*.39,Math.max(1,ts*.03),0,7);cx.fill();}
      }
    }
    function drawStar(x,y,r,fill,stroke){
      cx.beginPath();
      for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr_=i&1?r*.45:r;cx.lineTo(x+Math.cos(a)*rr_,y+Math.sin(a)*rr_);}
      cx.closePath();if(fill){cx.fillStyle=fill;cx.fill();}if(stroke){cx.lineWidth=Math.max(1,r*.12);cx.strokeStyle=stroke;cx.stroke();}
    }
    function drawTileBgs(g){
      for(let c=0;c<n*n;c++){
        const tc=type[c];
        const k=tc===T_LOCK?'lock':tc===T_BR?'br':tc===T_SRC?'src':tc===T_BRK?(brk[c]?'brk':'fix'):'n';
        g.drawImage(tiles[k],ox+(c%n)*ts,oy+((c/n)|0)*ts,ts,ts);
      }
    }
    // 背景＋盤＋タイル板を1枚にまとめておく（毎フレームの描画を軽くする）
    function buildStatic(){
      if(!staticImg||staticImg.width!==cv.width||staticImg.height!==cv.height)staticImg=mkC(cv.width,cv.height);
      const g=staticImg.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,staticImg.width,staticImg.height);
      g.setTransform(dpr,0,0,dpr,0,0);g.drawImage(bgImg,0,0,W,H);drawTileBgs(g);staticOk=true;
    }
    function drawBoard(){
      if(!bgImg)return;
      let offX=0,alpha=1;
      if(st==='out'){const k=Math.min(1,stT/.4);offX=-ease(k)*W*.35;alpha=1-k;}
      else if(boardIn<1){const k=ease(boardIn);offX=(1-k)*W*.35;alpha=k;}
      const still=offX===0&&alpha===1;
      if(still){if(!staticOk)buildStatic();cx.drawImage(staticImg,0,0,W,H);}
      else cx.drawImage(bgImg,0,0,W,H);
      // 雨（盤の上は降らせない）
      cx.beginPath();
      for(let i=0;i<RN;i++){const x=rx[i]*W,y=ry[i]*H;if(x>bx-4&&x<bx+BS+8&&y>by-24&&y<by+BS)continue;cx.moveTo(x,y);cx.lineTo(x-rl[i]*.18,y+rl[i]);}
      cx.lineWidth=1;cx.strokeStyle='rgba(150,130,210,.13)';cx.stroke();
      cx.save();cx.globalAlpha=alpha;cx.translate(offX,0);
      if(!still)drawTileBgs(cx);
      for(let c=0;c<n*n;c++)if(pw[c]&&anim[c]<.3){cx.fillStyle='rgba(0,232,200,.05)';cx.fillRect(ox+(c%n)*ts+2,oy+((c/n)|0)*ts+2,ts-4,ts-4);}
      drawCables(0);drawHubs();drawBridgePlates();drawCables(1);
      // カーソル
      if(kbd&&st==='play'){
        const x=ox+(cursor%n)*ts,y=oy+((cursor/n)|0)*ts;
        rr(cx,x+2,y+2,ts-4,ts-4,ts*.1);cx.lineWidth=2;cx.strokeStyle=`rgba(0,232,200,${.55+.4*Math.sin(T*8)})`;cx.stroke();
      }
      cx.restore();
      // パーティクル
      cx.globalCompositeOperation='lighter';cx.lineWidth=Math.max(1,ts*.03);cx.lineCap='round';
      for(let i=0;i<PMAX;i++){
        if(pl[i]<=0)continue;
        cx.globalAlpha=Math.min(1,pl[i]/pml[i]*1.4);cx.strokeStyle=PCOL[pc[i]];
        cx.beginPath();cx.moveTo(px[i],py[i]);cx.lineTo(px[i]-pvx[i]*.035,py[i]-pvy[i]*.035);cx.stroke();
      }
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';cx.lineCap='butt';
    }
    function drawHud(){
      const L=Math.max(10,bx),R=W-Math.max(10,bx);
      cx.textBaseline='middle';
      const y1=8+fsM*.6,y2=y1+fsM+6;
      cx.font=`${fsM}px ${FONT}`;cx.textAlign='left';cx.fillStyle='#e8b830';
      cx.fillText(CFG[level].title,L,y1);
      // ランプ数
      cx.textAlign='right';cx.fillStyle=lit===lamps?'#ffe9a0':'#bbaedd';
      const lt=`${lit}/${lamps}`;cx.fillText(lt,R,y1);
      const lw=cx.measureText(lt).width,lx=R-lw-fsM*.7;
      cx.beginPath();cx.arc(lx,y1-1,fsM*.38,0,7);cx.fillStyle=lit?'#ffd77a':'#3a3354';cx.fill();
      if(lit){cx.globalCompositeOperation='lighter';cx.drawImage(GL_GOLD,lx-fsM,y1-1-fsM,fsM*2,fsM*2);cx.globalCompositeOperation='source-over';}
      // 手数と★
      cx.font=`${fsS}px ${FONT}`;cx.textAlign='left';
      const over=moves>par;
      cx.fillStyle='#5e5078';cx.fillText('手数',L,y2);
      let x=L+cx.measureText('手数 ').width;
      cx.font=`${fsM}px ${FONT}`;cx.fillStyle=over?'#e8b830':'#00e8c8';cx.fillText(String(moves),x,y2);
      x+=cx.measureText(String(moves)).width+6;
      cx.font=`${fsS}px ${FONT}`;cx.fillStyle='#5e5078';cx.fillText(`／ 目安 ${par}`,x,y2);
      const sn=st==='intro'?3:starsFor(moves),sr=fsM*.5;
      for(let i=0;i<3;i++){const sx=R-sr-(2-i)*sr*2.3;drawStar(sx,y2,sr,i<sn?'#e8b830':'#1e1830',i<sn?'#fff0b0':'#3a3354');}
      // 時間バー
      const yb=y2+fsM*.5+6,bw=R-L,ratio=Math.max(0,Math.min(1,left/TIME));
      cx.fillStyle='#120e22';cx.fillRect(L,yb,bw,4);
      const low=left<15;
      cx.fillStyle=low?(Math.sin(T*10)>0?'#e83055':'#8a1c34'):'#00e8c8';cx.fillRect(L,yb,bw*ratio,4);
      if(!low){cx.fillStyle='rgba(0,232,200,.25)';cx.fillRect(L,yb-1,bw*ratio,6);}
    }
    function drawFoot(){
      const y=by+BS+footH*.5+2;
      cx.textAlign='center';cx.textBaseline='middle';cx.font=`${fsS}px ${FONT}`;
      if(msgT>0){cx.globalAlpha=Math.min(1,msgT*2);cx.fillStyle='#deccf8';cx.fillText(msgText,W/2,y);cx.globalAlpha=1;}
      else{cx.fillStyle='#5e5078';cx.fillText(CFG[level].hint,W/2,y);}
    }
    function bolt(x1,y1,x2,y2,jit,lw,col){
      const seg=14,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;
      cx.beginPath();cx.moveTo(x1,y1);
      for(let i=1;i<seg;i++){const t=i/seg,j=(Math.random()-.5)*2*jit;cx.lineTo(x1+dx*t+nx*j,y1+dy*t+ny*j);}
      cx.lineTo(x2,y2);cx.lineWidth=lw;cx.strokeStyle=col;cx.stroke();
    }
    function drawClear(){
      const t=Math.max(0,stT),bw=n*ts,x0=ox,y0=oy;
      // 稲妻が盤を横切る
      if(t<.75){
        const k=t/.6,sx=x0-ts*.5+k*(bw+ts);
        cx.save();cx.beginPath();cx.rect(bx,by,BS,BS);cx.clip();
        cx.fillStyle=`rgba(0,232,200,${.16*(1-t/.75)})`;cx.fillRect(x0,y0,Math.max(0,Math.min(bw,sx-x0)),bw);
        cx.globalCompositeOperation='lighter';
        const gr=cx.createLinearGradient(sx-ts*1.4,0,sx+ts*.4,0);gr.addColorStop(0,'rgba(0,232,200,0)');gr.addColorStop(.75,'rgba(120,255,240,.45)');gr.addColorStop(1,'rgba(0,232,200,0)');
        cx.fillStyle=gr;cx.fillRect(sx-ts*1.4,by,ts*1.8,BS);
        if(k<=1){
          bolt(sx,by,sx+ts*.2,by+BS,ts*.45,ts*.18,'rgba(0,232,200,.35)');
          bolt(sx,by,sx+ts*.2,by+BS,ts*.35,Math.max(1.5,ts*.05),'#eafffb');
          bolt(sx-ts*.3,by,sx,by+BS*.6,ts*.3,Math.max(1,ts*.03),'rgba(200,255,250,.7)');
          if(Math.random()<.6)spark(sx,y0+Math.random()*bw,3,0,ts*3);
        }
        cx.restore();
      }
      if(t>.55&&t<1.1){cx.globalCompositeOperation='lighter';cx.fillStyle=`rgba(200,255,250,${.35*(1-(t-.55)/.55)})`;cx.fillRect(bx,by,BS,BS);cx.globalCompositeOperation='source-over';}
      // スタンプ
      if(t>.55){
        if(!stampSE){stampSE=true;AU.se('rank');for(let i=0;i<4;i++)spark(bx+BS/2+(Math.random()-.5)*BS*.5,by+BS/2,6,1,ts*4);}
        cx.fillStyle=`rgba(5,4,14,${Math.min(.5,(t-.55)*2)})`;cx.fillRect(bx,by,BS,BS);
        const k=Math.min(1,(t-.55)/.2),sc=2.4-1.4*ease(k),cxm=bx+BS/2,cym=by+BS*.42;
        const sw=BS*.62,sh=BS*.24;
        cx.save();cx.translate(cxm,cym);cx.rotate(-.16);cx.scale(sc,sc);cx.globalAlpha=Math.min(1,k*1.6)*.95;
        rr(cx,-sw/2,-sh/2,sw,sh,sh*.14);cx.fillStyle='rgba(232,48,85,.12)';cx.fill();
        cx.lineWidth=Math.max(2,sh*.07);cx.strokeStyle='#e83055';cx.stroke();
        rr(cx,-sw/2+sh*.11,-sh/2+sh*.11,sw-sh*.22,sh-sh*.22,sh*.08);cx.lineWidth=Math.max(1,sh*.025);cx.stroke();
        cx.font=`${Math.round(sh*.58)}px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='#ff4d6d';cx.fillText('復旧！',0,sh*.03);
        cx.restore();cx.globalAlpha=1;
        // ★と手数
        const sy=by+BS*.68,sr=Math.min(BS*.06,22);
        for(let i=0;i<3;i++){
          const ti=.85+i*.15;if(t<ti)continue;
          if(starSE<=i){starSE=i+1;if(i<clearInfo.stars){AU.se('decide');spark(cxm+(i-1)*sr*2.6,sy,8,1,ts*3);}}
          const kk=Math.min(1,(t-ti)/.15),s2=sr*(1.6-.6*ease(kk));
          drawStar(cxm+(i-1)*sr*2.6,sy,s2,i<clearInfo.stars?'#e8b830':'#1e1830',i<clearInfo.stars?'#fff0b0':'#5e5078');
        }
        if(t>1.3){
          cx.fillStyle='rgba(5,4,14,.75)';rr(cx,cxm-BS*.3,sy+sr*1.25,BS*.6,fsS*(clearInfo.bonus?3.2:1.6)+4,6);cx.fill();
          cx.textAlign='center';cx.textBaseline='middle';cx.font=`${fsS}px ${FONT}`;cx.fillStyle='#bbaedd';
          cx.fillText(`手数 ${clearInfo.moves} ／ 目安 ${clearInfo.par}`,cxm,sy+sr*1.9);
          if(clearInfo.bonus){cx.fillStyle='#44ee88';cx.fillText(`残り時間 +${clearInfo.bonus}秒`,cxm,sy+sr*1.9+fsS*1.6);}
        }
      }
    }
    function drawIntro(){
      const a=Math.min(1,stT/.25);
      cx.fillStyle=`rgba(5,4,14,${.55*a})`;cx.fillRect(0,0,W,H);
      const cw=Math.min(W-32,340),lines=CFG[level].lines,lh=fsM*2.2,ch=fsM*3.4+lines.length*lh+fsS*3;
      const x=(W-cw)/2,y=by+BS/2-ch/2+(1-ease(a))*20;
      cx.globalAlpha=a;
      rr(cx,x,y,cw,ch,10);cx.fillStyle='rgba(10,7,22,.96)';cx.fill();cx.lineWidth=1.5;cx.strokeStyle='rgba(0,232,200,.5)';cx.stroke();
      cx.fillStyle='rgba(0,232,200,.8)';cx.fillRect(x+14,y,cw-28,2);
      cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`${fsS}px ${FONT}`;cx.fillStyle='#5e5078';cx.fillText(level?'次の盤へ':'停電発生 ── ライン復旧作業',W/2,y+fsM*1.1);
      cx.font=`${Math.round(fsM*1.25)}px ${FONT}`;cx.fillStyle='#e8b830';cx.fillText(CFG[level].title,W/2,y+fsM*2.5);
      lines.forEach(([a1,b1],i)=>{
        const ly=y+fsM*3.6+lh*(i+.5);
        cx.font=`${fsM}px ${FONT}`;
        cx.textAlign='right';cx.fillStyle='#00e8c8';cx.fillText(a1,x+cw*.47,ly);
        cx.textAlign='left';cx.fillStyle='#deccf8';cx.fillText(b1,x+cw*.51,ly);
      });
      cx.textAlign='center';cx.font=`${fsS}px ${FONT}`;
      cx.fillStyle=`rgba(187,174,221,${.5+.5*Math.sin(T*5)})`;cx.fillText('タップでスタート',W/2,y+ch-fsS*1.3);
      cx.globalAlpha=1;
    }

    // ── メインループ ──
    let ro=null;
    if(window.ResizeObserver){ro=new ResizeObserver(()=>{if(!mg._ended)layout();});ro.observe(wrap);}
    else window.addEventListener('resize',layout);
    const cleanup=()=>{if(ro)ro.disconnect();else window.removeEventListener('resize',layout);};

    newBoard();updScore();mg.setTimer(String(TIME));
    mg.loop(dt=>{
      T+=dt;stT+=dt;
      if(msgT>0)msgT-=dt;if(shakeT>0)shakeT-=dt;
      if(boardIn<1)boardIn=Math.min(1,boardIn+dt/.4);
      for(let c=0;c<n*n;c++)if(anim[c]>0)anim[c]=Math.max(0,anim[c]-dt*7.5);
      for(let i=0;i<PMAX;i++)if(pl[i]>0){pl[i]-=dt;px[i]+=pvx[i]*dt;py[i]+=pvy[i]*dt;pvy[i]+=ts*6*dt;pvx[i]*=.96;}
      for(let i=0;i<RN;i++){ry[i]+=rv[i]*dt;if(ry[i]>1.05){ry[i]=-.05;rx[i]=Math.random()*1.1;}}
      if(Math.random()<dt*9){const [x,y]=cellXY(src);spark(x,y,1+(Math.random()*2|0),0,ts*2.4);}
      if(st==='intro'&&stT>3.4)startPlay();
      if(st==='play'){
        left-=dt;
        const s=Math.max(0,Math.ceil(left));
        if(s!==lastSec){lastSec=s;mg.setTimer(String(s));}
        if(left<=10&&!warned){warned=true;AU.se('warn');msg('残り10秒！');}
        if(left<=0){mg.end('timeup');cleanup();return;}
      }
      if(st==='clear'&&stT>2.4){
        if(solved>=CFG.length){mg.end('clear');cleanup();return;}
        st='out';stT=0;
      }
      if(st==='out'&&stT>.4){level++;boardIn=0;newBoard();st='intro';stT=0;}
      cx.setTransform(dpr,0,0,dpr,0,0);
      drawBoard();drawHud();drawFoot();
      if(st==='clear')drawClear();
      if(st==='intro')drawIntro();
    });

    // テスト用フック（ゲームには影響しない）
    body._pz={makeBoard,calcPower,CFG,T_BR,T_LOCK,T_BRK,
      state:()=>({n,src,type:[...type],m:[...m],sol:[...sol],brk:[...brk],par,moves,st,level,left,solved,starsTotal}),
      tileCenter:c=>{const r=cv.getBoundingClientRect(),[x,y]=cellXY(c);return [r.left+x,r.top+y];},
      setLeft:v=>{left=v;}};

    return {result(reason){
      cleanup();
      const all=solved>=CFG.length;
      const fx={
        certKnow:solved*4+(all?3:0),
        jobRep:solved*3+(starsTotal>=8?1:0),
        money:solved*1500+(all?2000:0),
        mental:all?5:solved>=1?1:-3,
        fatigue:6,
      };
      const starStr=boardStars.map(s=>'★'.repeat(s)+'☆'.repeat(3-s)).join('　');
      return {
        title:all?'⚡ 全ライン復旧！':solved?'⚡ 一部を復旧':'⚡ 復旧できなかった',
        summary:`復旧した盤面 <span class="${solved?'up':'down'}">${solved}/${CFG.length}</span>`+
          (solved?`<br>手際 <span class="up">${starStr}</span>（★${starsTotal}/9）`:'')+
          (all?`<br>残り時間 <span class="up">${Math.max(0,Math.ceil(left))}秒</span>`:'')+
          (reason==='timeup'?'<br>時間切れ。残りは朝番に引き継いだ。':''),
        fx, time:60, sp:solved,
        log:all?(starsTotal>=9?'停電したラインを最短手順で全部つなぎ直した。':'停電したラインを全部つなぎ直した。'):'配線の復旧作業をした。',
        cutin:all?(starsTotal>=9?['win','……最短手順。配線は嘘をつかないのよね。']:['happy','……配線は嘘をつかないのよね。']):null,
      };
    }};
  },
});
})();
