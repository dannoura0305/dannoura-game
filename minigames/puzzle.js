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
const CFG0=[
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

// 2回目以降（一度全クリアした後）の改修モード：最初から部品が混ざった難しめの構成
const REMIX=[
  {n:4,locks:1,broken:1,bridges:0,minPar:8,
   title:'第1面　4×4 改修盤',hint:'固定は回らない／故障はまず修理',
   lines:[['改修モード','部品が最初から混在'],['固定タイル','回らない。手がかりに'],['故障タイル','1回目のタップで修理']]},
  {n:5,locks:3,broken:2,bridges:1,minPar:14,
   title:'第2面　5×5 改修盤',hint:'交差タイルは2本の線が立体交差',
   lines:[['交差タイル','5×5にも登場'],['','縦と横は別々の線'],['目安手数以内で','★★★ ＋時間']]},
  {n:6,locks:3,broken:3,bridges:3,minPar:20,
   title:'第3面　6×6 改修盤',hint:'交差3枚。電源から順にたどろう',
   lines:[['交差タイル','3枚に増設'],['故障タイル','3枚。修理を忘れずに'],['残り時間に注意','最後の盤よ']]},
];
const GRADES='SABC';
const STORY=remix=>[
  {who:'boss',text:remix?'だんのうらさん、夜分にすまん。改修したばかりの第2ラインの配電盤が、また落ちた。':'だんのうらさん、夜分にすまん。第2ラインの配電盤が落ちた。'},
  {who:'me',face:'tired',text:'……子どもが、やっと寝たところなのに。'},
  {who:'boss',text:'朝の出荷に間に合わないと、ラインが丸一日止まる。頼めるか。'},
  {who:'me',face:'normal',text:'配信は後回しね。借金の利息は待ってくれないもの。……行くわ。'},
];
const ENDING={
  S:[{who:'me',face:'win',text:'全ライン、復旧。……最短手順よ。'},
     {who:'boss',text:'見事だ。これで朝の出荷に間に合う。本当に助かった。'},
     {who:'me',face:'happy',text:'帰ったら子どもの朝ごはん。今夜の配信のネタもできたわね。'}],
  A:[{who:'me',face:'happy',text:'全部つないだわ。……配線は嘘をつかないのよね。'},
     {who:'boss',text:'助かった。朝の出荷、なんとかなりそうだ。'},
     {who:'me',face:'normal',text:'少しは借金返済の足しになるかしら。……さ、帰ろう。'}],
  B:[{who:'me',face:'tired',text:'最後の盤は朝番に引き継ぎ……。報告書、書かなきゃ。'},
     {who:'boss',text:'ここまで戻れば十分だ。あとは任せてくれ。'},
     {who:'me',face:'tired',text:'今夜の配信は短めにしよう。子どもが起きる前に、少しでも眠らないと。'}],
  C:[{who:'me',face:'fear',text:'……思うように、繋がらなかった。'},
     {who:'boss',text:'無理させたな。今日はもう帰って休め。'},
     {who:'me',face:'tired',text:'子どもの寝顔だけ見て……眠ろう。明日は、もう少しうまくやるわ。'}],
};

// 効果音：AU.se に加えて Web Audio で短い音を合成（AU.ctx がある時だけ・音量設定に従う）
const SFX=(()=>{
  let nbuf=null;
  function ac(){
    try{
      if(typeof AUDIO_SET==='undefined'||!AUDIO_SET.se)return null;
      if(!AU.ctx&&AU.init)AU.init();
      const c=AU.ctx;if(!c)return null;
      if(c.state==='suspended')c.resume().catch(()=>{});
      return c;
    }catch(e){return null;}
  }
  function tone(f,d,type,g,f2,delay){
    const c=ac();if(!c)return;
    try{
      const t=c.currentTime+(delay||0),o=c.createOscillator(),gn=c.createGain();
      o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
      gn.gain.setValueAtTime(Math.max(.0002,g*AUDIO_SET.se),t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(gn);gn.connect(c.destination);o.start(t);o.stop(t+d+.02);
    }catch(e){}
  }
  function noise(d,g,fq,delay){
    const c=ac();if(!c)return;
    try{
      if(!nbuf){nbuf=c.createBuffer(1,c.sampleRate*.5|0,c.sampleRate);const a=nbuf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}
      const t=c.currentTime+(delay||0),s=c.createBufferSource(),f=c.createBiquadFilter(),gn=c.createGain();
      s.buffer=nbuf;f.type='bandpass';f.frequency.value=fq;f.Q.value=1.2;
      gn.gain.setValueAtTime(Math.max(.0002,g*AUDIO_SET.se),t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);
      s.connect(f);f.connect(gn);gn.connect(c.destination);s.start(t);s.stop(t+d+.02);
    }catch(e){}
  }
  return {
    rot(){noise(.04,.18,3200);tone(260,.06,'triangle',.07,140);},
    lamp(){tone(990,.1,'sine',.05,1480);tone(1480,.12,'sine',.03,null,.05);},
    fix(){noise(.16,.2,5000);tone(70,.18,'sawtooth',.05,40);tone(660,.1,'square',.03,null,.14);},
    deny(){tone(150,.07,'square',.05);tone(140,.07,'square',.05,null,.08);},
    tap(){tone(1400,.02,'square',.02);},
    zap(){noise(.35,.22,6000);tone(120,.3,'sawtooth',.05,60);},
    clear(){[523,659,784,1047].forEach((f,i)=>tone(f,.28,'triangle',.07,null,i*.07));},
    thud(){tone(120,.26,'sine',.2,45);noise(.1,.15,700);},
    star(i){tone(880*Math.pow(1.26,i),.16,'triangle',.06);},
    type(){tone(1700,.012,'square',.012);},
    fanfare(good){(good?[523,659,784,1047,1319]:[392,370,349]).forEach((f,i)=>tone(f,good?.22:.3,good?'triangle':'sine',.07,null,i*.09));},
    warn(){tone(880,.09,'square',.04);tone(880,.09,'square',.04,null,.15);},
    ring(){tone(1320,.06,'square',.03);tone(1100,.06,'square',.03,null,.07);tone(1320,.06,'square',.03,null,.14);},
  };
})();

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
    // 記録（gs.puzzleData に保存・初回だけ作る）
    if(!gs.puzzleData||typeof gs.puzzleData!=='object')gs.puzzleData={plays:0,clears:0,bestGrade:'',bestStars:0,bestLeft:0,bestSolved:0};
    const D=gs.puzzleData;
    const remix=(D.clears|0)>0,CFG=remix?REMIX:CFG0;
    let left=TIME,level=0,solved=0,starsTotal=0,moves=0;
    const boardStars=[];
    let finalReason=null,grade='',newBest=false,saved=false,dlg=null,di=0,dT=0,typed=0,guideC=-1;
    let hitStop=0,shakeA=0,wipe=null,mosaicC=null;const tapQ=[];
    const RPX=new Float32Array(8),RPY=new Float32Array(8),RPT=new Float32Array(8).fill(9);let rpH=0;
    let st='title',stT=0,T=0,lastSec=-1,warned=false,clearInfo=null,stampSE=false,starSE=0;
    let n=4,src=0,type,m,sol,brk,par=0,anim,pw,inD,litAt,fixAt,lamps=0,lit=0;
    let shakeC=-1,shakeT=0,cursor=0,kbd=false,msgText='',msgT=0,boardIn=0;
    let W=0,H=0,dpr=1,ts=40,ox=0,oy=0,BS=0,bx=0,by=0,pad=10,hudH=64,footH=40,fsS=11,fsM=13;
    let tiles={},bgImg=null,staticImg=null,staticOk=false;

    const IMG={};['normal','tired','happy','win','fear'].forEach(k=>{const i=new Image();i.src='assets/img/char_'+k+'.webp';IMG[k]=i;});
    const BGF=new Image();BGF.src='assets/img/bg_factory.webp';
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
      // チュートリアル用：電源の隣でずれているタイルを指さす
      guideC=-1;
      if(level===0){
        const sx=src%n,sy=(src/n)|0;
        for(let b=0;b<4&&guideC<0;b++){const x=sx+AX[b],y=sy+AY[b],c=y*n+x;if(x>=0&&y>=0&&x<n&&y<n&&type[c]===T_N&&m[c]!==sol[c])guideC=c;}
        for(let c=0;c<n*n&&guideC<0;c++)if(type[c]===T_N&&m[c]!==sol[c])guideC=c;
      }
    }
    const isLamp=c=>type[c]!==T_SRC&&type[c]!==T_BR&&pop(m[c])===1;
    function recalc(silent){
      const r=calcPower(n,src,type,m,brk,pw,inD);
      lit=0;let newLit=false;
      for(let c=0;c<n*n;c++){
        if(!isLamp(c))continue;
        if(pw[c]){lit++;if(litAt[c]<0){litAt[c]=T+.12;if(!silent){const p=cellXY(c);spark(p[0],p[1],8,1,ts*2.4);newLit=true;}}}
        else litAt[c]=-9;
      }
      if(newLit)SFX.lamp();
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
        AU.se('back');SFX.deny();shakeC=c;shakeT=.3;msg(type[c]===T_LOCK?'固定タイルは回らない':'交差タイルは回らない');return;
      }
      moves++;
      const p=cellXY(c);
      RPX[rpH]=p[0];RPY[rpH]=p[1];RPT[rpH]=0;rpH=(rpH+1)%8;
      if(brk[c]){
        brk[c]=0;fixAt[c]=T;staticOk=false;AU.se('machine');SFX.fix();shakeA=Math.max(shakeA,ts*.06);spark(p[0],p[1],16,1,ts*3);spark(p[0],p[1],8,2,ts*2);msg('修理完了。これで回せる');
      }else{
        m[c]=rot(m[c]);anim[c]=Math.min(2,anim[c]+1);AU.se('tool');SFX.rot();
      }
      if(recalc(false)){
        const stars=starsFor(moves),bonus=stars===3?6:stars===2?3:0;
        solved++;starsTotal+=stars;boardStars.push(stars);left+=bonus;
        clearInfo={stars,bonus,moves,par};st='clear';stT=-.2;stampSE=false;starSE=0;
        AU.se('repair');SFX.zap();hitStop=.14;shakeA=ts*.2;updScore();
      }
    }
    function updScore(){mg.setScore(`復旧 ${solved}/${CFG.length}面　★${starsTotal}`);}

    // ── 入力 ──
    function tap(x,y){
      if(wipe)return;
      if(hitStop>0){if(tapQ.length<3)tapQ.push(x,y);return;}   // ヒットストップ中の入力は貯めておく
      if(st==='title'){if(stT>.4)toStory();return;}
      if(st==='story'||st==='ending'){advDialog();return;}
      if(st==='intro'){if(stT>.3)startPlay();return;}
      if(st==='clear'){if(stT>1.1)stT=Math.max(stT,2.3);return;}
      if(st==='grade'){if(stT>1.4)toEnding();return;}
      if(st!=='play')return;
      // 盤の外側すこしまでは一番近いタイル扱い（押し損じを減らす）
      const m_=pad+12;
      if(x<ox-m_||y<oy-m_||x>ox+n*ts+m_||y>oy+n*ts+m_)return;
      const gx=Math.max(0,Math.min(n-1,Math.floor((x-ox)/ts))),gy=Math.max(0,Math.min(n-1,Math.floor((y-oy)/ts)));
      turn(gy*n+gx);
    }
    function key(k){
      if(wipe)return;
      const ok=k===' '||k==='Enter';
      if(st!=='play'){if(ok)tap(-999,-999);return;}
      const x=cursor%n,y=(cursor/n)|0;
      if(k==='ArrowLeft'||k==='a'){kbd=true;cursor=y*n+Math.max(0,x-1);SFX.tap();}
      else if(k==='ArrowRight'||k==='d'){kbd=true;cursor=y*n+Math.min(n-1,x+1);SFX.tap();}
      else if(k==='ArrowUp'||k==='w'){kbd=true;cursor=Math.max(0,y-1)*n+x;SFX.tap();}
      else if(k==='ArrowDown'||k==='s'){kbd=true;cursor=Math.min(n-1,y+1)*n+x;SFX.tap();}
      else if(ok){kbd=true;turn(cursor);}
    }
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();if(mg._ended)return;
      const r=cv.getBoundingClientRect();kbd=false;tap(e.clientX-r.left,e.clientY-r.top);
    });
    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      const k=e.key;
      if(k===' '||k==='Enter'||k.startsWith('Arrow'))e.preventDefault();
      if(e.repeat&&(k===' '||k==='Enter'))return;
      key(k);
    });
    // ── 場面の切り替え ──
    function doWipe(fn){wipe={t:0,dur:.6,mid:fn,fired:false};AU.se('btn');}
    function toStory(){doWipe(()=>{st='story';stT=0;dlg=STORY(remix);di=0;dT=0;typed=0;SFX.ring();});}
    function advDialog(){
      const L=dlg[di];
      if(typed<L.text.length){typed=L.text.length;return;}
      AU.se('btn');
      if(di<dlg.length-1){di++;dT=0;typed=0;return;}
      if(st==='story')doWipe(()=>{st='intro';stT=0;boardIn=1;});
      else doWipe(()=>{mg.end(finalReason||'clear');cleanup();});
    }
    function toEnding(){doWipe(()=>{st='ending';stT=0;dlg=ENDING[grade];di=0;dT=0;typed=0;});}
    function finishRun(reason){
      finalReason=reason;
      const all=solved>=CFG.length;
      grade=all&&starsTotal>=8?'S':all?'A':solved>=2?'B':'C';
      saveRecord();
      doWipe(()=>{st='grade';stT=0;});
    }
    function saveRecord(){
      if(saved)return;saved=true;
      D.plays=(D.plays|0)+1;
      const all=solved>=CFG.length;if(all)D.clears=(D.clears|0)+1;
      const gi=grade?GRADES.indexOf(grade):3,bi=D.bestGrade?GRADES.indexOf(D.bestGrade):9;
      if(grade&&gi<bi){D.bestGrade=grade;newBest=true;}
      if(starsTotal>(D.bestStars|0)){D.bestStars=starsTotal;newBest=true;}
      if(solved>(D.bestSolved|0))D.bestSolved=solved;
      if(all&&Math.ceil(left)>(D.bestLeft|0))D.bestLeft=Math.ceil(left);
    }
    function startPlay(){st='play';stT=0;AU.se('decide');SFX.tap();}

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
      if(!staticOk)buildStatic();
      cx.drawImage(staticImg,0,0,W,H);
      // 雨（盤の上は降らせない）
      cx.beginPath();
      for(let i=0;i<RN;i++){const x=rx[i]*W,y=ry[i]*H;if(x>bx-4&&x<bx+BS+8&&y>by-24&&y<by+BS)continue;cx.moveTo(x,y);cx.lineTo(x-rl[i]*.18,y+rl[i]);}
      cx.lineWidth=1;cx.strokeStyle='rgba(150,130,210,.13)';cx.stroke();
      cx.save();
      for(let c=0;c<n*n;c++)if(pw[c]&&anim[c]<.3){cx.fillStyle='rgba(0,232,200,.05)';cx.fillRect(ox+(c%n)*ts+2,oy+((c/n)|0)*ts+2,ts-4,ts-4);}
      drawCables(0);drawHubs();drawBridgePlates();drawCables(1);
      // カーソル
      if(kbd&&st==='play'){
        const x=ox+(cursor%n)*ts,y=oy+((cursor/n)|0)*ts;
        rr(cx,x+2,y+2,ts-4,ts-4,ts*.1);cx.lineWidth=2;cx.strokeStyle=`rgba(0,232,200,${.55+.4*Math.sin(T*8)})`;cx.stroke();
      }
      cx.restore();
      drawParticles();
    }
    function drawParticles(){
      cx.globalCompositeOperation='lighter';cx.lineWidth=Math.max(1.2,ts*.03);cx.lineCap='round';
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
        const need=Math.max(cx.measureText(a1).width,cx.measureText(b1).width)*2+cw*.04+28;
        if(need>cw)cx.font=`${Math.floor(fsM*cw/need)}px ${FONT}`;
        cx.textAlign='right';cx.fillStyle='#00e8c8';cx.fillText(a1,x+cw*.47,ly);
        cx.textAlign='left';cx.fillStyle='#deccf8';cx.fillText(b1,x+cw*.51,ly);
      });
      cx.textAlign='center';cx.font=`${fsS}px ${FONT}`;
      cx.fillStyle=`rgba(187,174,221,${.5+.5*Math.sin(T*5)})`;cx.fillText('タップでスタート',W/2,y+ch-fsS*1.3);
      cx.globalAlpha=1;
    }

    // ── 演出用の描画 ──
    const DITH=(()=>{const c=mkC(4,4),g=c.getContext('2d');g.fillStyle='rgba(0,0,0,.4)';g.fillRect(0,0,1,1);g.fillRect(2,2,1,1);g.fillStyle='rgba(255,255,255,.05)';g.fillRect(2,0,1,1);g.fillRect(0,2,1,1);return c;})();
    const dithPat=cx.createPattern(DITH,'repeat');
    function drawScene(mood){
      let gr=cx.createLinearGradient(0,0,0,H);
      if(mood==='dawn'){gr.addColorStop(0,'#160d30');gr.addColorStop(.5,'#3c2250');gr.addColorStop(1,'#b0643e');}
      else{gr.addColorStop(0,'#0b0722');gr.addColorStop(1,'#04030b');}
      cx.fillStyle=gr;cx.fillRect(0,0,W,H);
      const bh=Math.min(H*.42,W*.62),bw=bh*6,y=H*.16;
      if(BGF.complete&&BGF.naturalWidth){
        const x=-(bw-W)/2+Math.sin(T*.07)*(bw-W)*.35;
        cx.globalAlpha=mood==='dawn'?.8:.62;cx.drawImage(BGF,x,y,bw,bh);cx.globalAlpha=1;
      }
      gr=cx.createLinearGradient(0,y,0,y+bh);gr.addColorStop(0,'rgba(5,4,14,.85)');gr.addColorStop(.25,'rgba(5,4,14,.1)');gr.addColorStop(.8,'rgba(5,4,14,.25)');gr.addColorStop(1,'rgba(5,4,14,.95)');
      cx.fillStyle=gr;cx.fillRect(0,y,W,bh+1);
      cx.fillStyle=mood==='dawn'?'rgba(40,20,30,.9)':'#05040e';cx.fillRect(0,y+bh,W,H-y-bh);
      cx.globalCompositeOperation='lighter';
      if(mood==='dawn'){cx.globalAlpha=.55;cx.drawImage(GL_GOLD,W*.5-W*.8,y+bh*.6-W*.5,W*1.6,W);}
      else{const a=Math.max(0,Math.sin(T*5));cx.globalAlpha=.25+.55*a;const g=bh*.9;cx.drawImage(GL_RD,W*.78-g/2,y+bh*.3-g/2,g,g);}
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
      cx.beginPath();
      for(let i=0;i<RN;i++){const x=rx[i]*W,yy=ry[i]*H;cx.moveTo(x,yy);cx.lineTo(x-rl[i]*.18,yy+rl[i]);}
      cx.lineWidth=1;cx.strokeStyle=mood==='dawn'?'rgba(255,210,180,.12)':'rgba(150,130,210,.16)';cx.stroke();
      cx.fillStyle=dithPat;cx.fillRect(0,0,W,H);
    }
    function drawLogo(xc,yc,fs,a){
      cx.save();cx.translate(xc,yc);cx.globalAlpha=a;
      const fl=Math.random()<.04?.35:1;
      // 背後の稲妻
      cx.globalCompositeOperation='lighter';cx.globalAlpha=a*.6*fl;cx.drawImage(GL_GOLD,-fs*2.6,-fs*1.6,fs*5.2,fs*3.2);
      cx.globalCompositeOperation='source-over';cx.globalAlpha=a;
      boltPath(fs*1.55,-fs*.15,fs*.95);cx.fillStyle='#7a5a10';cx.fill();
      boltPath(fs*1.5,-fs*.2,fs*.95);const bg=cx.createLinearGradient(0,-fs,0,fs);bg.addColorStop(0,'#fff2a8');bg.addColorStop(1,'#e8a020');cx.fillStyle=bg;cx.fill();
      cx.lineWidth=2;cx.strokeStyle='#3a2600';cx.stroke();
      cx.font=`${fs}px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';
      for(let i=7;i>0;i--){cx.fillStyle=i>3?'#0e0820':'#2c1a58';cx.fillText('配線復旧',i*.45,i*.8);}
      cx.shadowColor='#00e8c8';cx.shadowBlur=fs*.4*fl;cx.lineWidth=Math.max(2,fs*.09);cx.strokeStyle=`rgba(0,232,200,${.9*fl})`;cx.strokeText('配線復旧',0,0);cx.shadowBlur=0;
      const g=cx.createLinearGradient(0,-fs*.5,0,fs*.5);g.addColorStop(0,'#ffffff');g.addColorStop(.48,'#c8fff6');g.addColorStop(.52,'#54e0cc');g.addColorStop(1,'#1a9c8c');
      cx.fillStyle=g;cx.fillText('配線復旧',0,0);
      const pw=fs*2.4,ph=fs*.56,py=fs*.95;
      rr(cx,-pw/2,py-ph/2+3,pw,ph,ph*.2);cx.fillStyle='#2a1a00';cx.fill();
      const pg=cx.createLinearGradient(0,py-ph/2,0,py+ph/2);pg.addColorStop(0,'#ffe27a');pg.addColorStop(.5,'#e8b830');pg.addColorStop(1,'#a87810');
      rr(cx,-pw/2,py-ph/2,pw,ph,ph*.2);cx.fillStyle=pg;cx.fill();cx.lineWidth=1.5;cx.strokeStyle='#4a3000';cx.stroke();
      cx.fillStyle='#2a1a00';cx.font=`${Math.round(ph*.66)}px ${FONT}`;cx.fillText('パ　ズ　ル',0,py+1);
      cx.font=`${Math.round(fs*.22)}px "Share Tech Mono", monospace`;cx.fillStyle='rgba(187,174,221,.75)';cx.fillText('─ LINE  RESTORE ─',0,py+ph*1.2);
      cx.restore();
    }
    let titleFx=false;
    function drawTitle(){
      drawScene('night');
      const t=stT,k=Math.min(1,t/.5),fs=Math.min(W*.15,62);
      if(t>.45&&!titleFx){titleFx=true;SFX.zap();shakeA=fs*.12;spark(W/2,H*.32,30,0,fs*6);spark(W/2,H*.32,14,1,fs*5);}
      cx.save();cx.translate(W/2,H*.32);const sc=1.5-.5*ease(k);cx.scale(sc,sc);drawLogo(0,0,fs,k);cx.restore();
      if(t>.45&&t<.8){cx.fillStyle=`rgba(220,255,250,${.6*(1-(t-.45)/.35)})`;cx.fillRect(0,0,W,H);}
      cx.textAlign='center';cx.textBaseline='middle';
      if(t>.7){
        const a=Math.min(1,(t-.7)*3);cx.globalAlpha=a;
        cx.font=`${fsM}px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText(`${gs.day}日目の夜 ── 工場から呼び出し`,W/2,H*.56);
        if(remix){rr(cx,W/2-fsS*4,H*.56+fsM*1.1,fsS*8,fsS*1.7,4);cx.fillStyle='#3a0c18';cx.fill();cx.strokeStyle='#e83055';cx.lineWidth=1;cx.stroke();
          cx.font=`${fsS}px ${FONT}`;cx.fillStyle='#ff6a86';cx.fillText('改修モード（難）',W/2,H*.56+fsM*1.1+fsS*.85);}
        cx.font=`${fsS}px ${FONT}`;cx.fillStyle='#8a7aa8';
        cx.fillText(D.bestGrade?`自己ベスト　評価 ${D.bestGrade}　★${D.bestStars|0}/9`:'自己ベスト　──',W/2,H*.56+fsM*3.2);
        cx.globalAlpha=1;
      }
      if(t>1){cx.font=`${fsM}px ${FONT}`;cx.fillStyle=`rgba(0,232,200,${.55+.45*Math.sin(T*5)})`;cx.fillText('▶ タップでスタート',W/2,H*.8);}
      drawParticles();
    }
    function drawBoss(x,y,s){
      let g=cx.createRadialGradient(x+s*.5,y+s*.35,0,x+s*.5,y+s*.5,s*.8);g.addColorStop(0,'#2a3450');g.addColorStop(1,'#0a0c18');
      cx.fillStyle=g;cx.fillRect(x,y,s,s);
      // 作業着
      cx.beginPath();cx.moveTo(x+s*.04,y+s);cx.quadraticCurveTo(x+s*.08,y+s*.66,x+s*.5,y+s*.63);cx.quadraticCurveTo(x+s*.92,y+s*.66,x+s*.96,y+s);cx.closePath();
      g=cx.createLinearGradient(x,y+s*.6,x+s,y+s);g.addColorStop(0,'#33406a');g.addColorStop(1,'#141a30');cx.fillStyle=g;cx.fill();
      cx.fillStyle='#d8d070';cx.fillRect(x+s*.12,y+s*.84,s*.76,s*.045);cx.fillStyle='rgba(255,255,255,.35)';cx.fillRect(x+s*.12,y+s*.84,s*.76,s*.012);
      cx.fillStyle='#1a2038';cx.beginPath();cx.moveTo(x+s*.4,y+s*.64);cx.lineTo(x+s*.5,y+s*.78);cx.lineTo(x+s*.6,y+s*.64);cx.fill();
      // 首と顔
      cx.fillStyle='#8a6448';cx.fillRect(x+s*.43,y+s*.52,s*.14,s*.13);
      g=cx.createLinearGradient(x+s*.33,0,x+s*.67,0);g.addColorStop(0,'#d8a884');g.addColorStop(1,'#8a6448');
      cx.beginPath();cx.ellipse(x+s*.5,y+s*.44,s*.15,s*.17,0,0,7);cx.fillStyle=g;cx.fill();
      cx.fillStyle='rgba(20,10,10,.55)';cx.fillRect(x+s*.35,y+s*.36,s*.3,s*.07);
      cx.fillStyle='#1a0e0a';cx.fillRect(x+s*.41,y+s*.4,s*.05,s*.018);cx.fillRect(x+s*.54,y+s*.4,s*.05,s*.018);
      cx.fillStyle='#5a3a2a';cx.fillRect(x+s*.45,y+s*.52,s*.1,s*.014);
      // ヘルメット
      g=cx.createLinearGradient(0,y+s*.16,0,y+s*.36);g.addColorStop(0,'#fff0a0');g.addColorStop(1,'#c89a20');
      cx.beginPath();cx.arc(x+s*.5,y+s*.36,s*.19,Math.PI,0);cx.closePath();cx.fillStyle=g;cx.fill();
      cx.fillStyle='#a87810';rr(cx,x+s*.26,y+s*.345,s*.48,s*.05,s*.02);cx.fill();
      cx.fillStyle='#e8c040';cx.fillRect(x+s*.485,y+s*.17,s*.03,s*.18);
      cx.strokeStyle='rgba(255,255,255,.6)';cx.lineWidth=Math.max(1,s*.015);cx.beginPath();cx.arc(x+s*.5,y+s*.36,s*.15,Math.PI*1.15,Math.PI*1.4);cx.stroke();
      // 携帯電話
      cx.fillStyle='#101018';rr(cx,x+s*.63,y+s*.36,s*.07,s*.17,s*.015);cx.fill();
      cx.fillStyle=`rgba(0,232,200,${.5+.3*Math.sin(T*6)})`;cx.fillRect(x+s*.645,y+s*.38,s*.04,s*.06);
      cx.fillStyle='#c89878';cx.beginPath();cx.ellipse(x+s*.67,y+s*.52,s*.05,s*.04,0,0,7);cx.fill();
      cx.fillStyle=dithPat;cx.fillRect(x,y,s,s);
    }
    function wrapText(text,maxW){
      const out=[];let line='';
      for(const ch of text){if(cx.measureText(line+ch).width>maxW){out.push(line);line=ch;}else line+=ch;}
      if(line)out.push(line);return out;
    }
    function drawDialog(){
      const good=st==='ending'&&(grade==='S'||grade==='A');
      drawScene(good?'dawn':'night');
      const L=dlg[di],me=L.who==='me';
      const bh=Math.max(112,Math.min(150,H*.24)),bxx=12,bw=W-24,byy=H-bh-14;
      const ps=Math.min(W*.48,H*.34,220),k=ease(Math.min(1,dT/.25));
      const pxx=me?bxx+6-(1-k)*30:W-bxx-6-ps+(1-k)*30,pyy=byy-ps+10+Math.sin(T*2)*1.5;
      cx.globalAlpha=k;
      rr(cx,pxx-3,pyy-3,ps+6,ps+6,10);cx.fillStyle=me?'#0f3a38':'#3a2c08';cx.fill();
      cx.save();rr(cx,pxx,pyy,ps,ps,8);cx.clip();
      if(me){
        const g=cx.createLinearGradient(0,pyy,0,pyy+ps);g.addColorStop(0,good?'#5a3060':'#1c1238');g.addColorStop(1,good?'#d08050':'#08060f');cx.fillStyle=g;cx.fillRect(pxx,pyy,ps,ps);
        const im=IMG[L.face||'normal'];if(im&&im.complete&&im.naturalWidth)cx.drawImage(im,pxx,pyy,ps,ps);
      }else drawBoss(pxx,pyy,ps);
      const sh=cx.createLinearGradient(0,pyy+ps*.7,0,pyy+ps);sh.addColorStop(0,'rgba(5,4,14,0)');sh.addColorStop(1,'rgba(5,4,14,.7)');cx.fillStyle=sh;cx.fillRect(pxx,pyy,ps,ps);
      cx.restore();
      rr(cx,pxx,pyy,ps,ps,8);cx.lineWidth=2;cx.strokeStyle=me?'#00e8c8':'#e8b830';cx.stroke();
      cx.globalAlpha=1;
      // ウインドウ
      rr(cx,bxx,byy,bw,bh,10);cx.fillStyle='rgba(10,7,22,.96)';cx.fill();cx.lineWidth=2;cx.strokeStyle='#8a52d4';cx.stroke();
      rr(cx,bxx+4,byy+4,bw-8,bh-8,7);cx.lineWidth=1;cx.strokeStyle='rgba(138,82,212,.35)';cx.stroke();
      cx.fillStyle=dithPat;cx.fillRect(bxx+2,byy+2,bw-4,bh-4);
      const name=me?'だんのうら':'班長（電話）';
      cx.font=`${fsS}px ${FONT}`;const nw=cx.measureText(name).width+22,nx=me?bxx+14:bxx+bw-14-nw,ny=byy-fsS*.9;
      rr(cx,nx,ny,nw,fsS*1.8,5);cx.fillStyle=me?'#0d3a36':'#3a2c08';cx.fill();cx.lineWidth=1.5;cx.strokeStyle=me?'#00e8c8':'#e8b830';cx.stroke();
      cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle=me?'#b8fff4':'#ffe9a0';cx.fillText(name,nx+nw/2,ny+fsS*.92);
      const fz=Math.round(fsM*1.05);cx.font=`${fz}px ${FONT}`;cx.textAlign='left';cx.textBaseline='top';cx.fillStyle='#deccf8';
      const lines=wrapText(L.text.slice(0,Math.floor(typed)),bw-36);
      for(let i=0;i<lines.length;i++)cx.fillText(lines[i],bxx+18,byy+fsS*1.6+i*fz*1.6);
      if(typed>=L.text.length&&Math.sin(T*8)>0){cx.fillStyle='#00e8c8';cx.beginPath();const ax=bxx+bw-24,ay=byy+bh-18;cx.moveTo(ax-6,ay-4);cx.lineTo(ax+6,ay-4);cx.lineTo(ax,ay+4);cx.fill();}
      cx.textBaseline='middle';cx.textAlign='left';cx.font=`${Math.round(fsS*.9)}px ${FONT}`;cx.fillStyle='#5e5078';
      cx.fillText(`${di+1}/${dlg.length}　タップで次へ`,bxx+18,byy+bh-16);
    }
    function drawStamp(text,col,x,y,sw,sh,sc,a,rotA){
      cx.save();cx.translate(x,y);cx.rotate(rotA);cx.scale(sc,sc);cx.globalAlpha=a;
      rr(cx,-sw/2,-sh/2,sw,sh,sh*.14);cx.fillStyle='rgba(10,4,10,.55)';cx.fill();
      cx.lineWidth=Math.max(2,sh*.07);cx.strokeStyle=col;cx.stroke();
      rr(cx,-sw/2+sh*.11,-sh/2+sh*.11,sw-sh*.22,sh-sh*.22,sh*.08);cx.lineWidth=Math.max(1,sh*.025);cx.stroke();
      cx.font=`${Math.round(sh*.5)}px ${FONT}`;cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle=col;cx.fillText(text,0,sh*.03);
      cx.restore();cx.globalAlpha=1;
    }
    function drawTimeUp(){
      const t=stT;
      cx.fillStyle=`rgba(40,0,14,${Math.min(.6,t*1.5)})`;cx.fillRect(0,0,W,H);
      const k=Math.min(1,t/.2);
      drawStamp('時間切れ','#ff4d6d',W/2,by+BS*.45,BS*.66,BS*.24,2.2-1.2*ease(k),Math.min(1,k*1.6),-.14);
      if(t>.6){cx.textAlign='center';cx.textBaseline='middle';cx.font=`${fsS}px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText('残りの盤は朝番に引き継ぐ……',W/2,by+BS*.7);}
    }
    let gStep=0;
    function drawGrade(){
      const t=stT;
      cx.fillStyle='rgba(5,4,14,.8)';cx.fillRect(0,0,W,H);cx.fillStyle=dithPat;cx.fillRect(0,0,W,H);
      const pw_=Math.min(W-32,330),ph_=Math.min(H-40,fsM*19),x=(W-pw_)/2,y=(H-ph_)/2;
      rr(cx,x,y,pw_,ph_,12);cx.fillStyle='rgba(12,9,26,.97)';cx.fill();cx.lineWidth=2;cx.strokeStyle='#8a52d4';cx.stroke();
      rr(cx,x+5,y+5,pw_-10,ph_-10,9);cx.lineWidth=1;cx.strokeStyle='rgba(0,232,200,.3)';cx.stroke();
      cx.textAlign='center';cx.textBaseline='middle';
      cx.font=`${fsS}px ${FONT}`;cx.fillStyle='#8a7aa8';cx.fillText(remix?'── 改修盤 作業評価 ──':'── 作業評価 ──',W/2,y+fsM*1.5);
      const col={S:'#ffd75a',A:'#00e8c8',B:'#b48cff',C:'#c86478'}[grade];
      const ly=y+fsM*5.2,lf=Math.round(fsM*5.2);
      if(t>.3){
        const k=Math.min(1,(t-.3)/.16);
        if(k>=1&&gStep<1){gStep=1;SFX.thud();AU.se('rank');hitStop=.1;shakeA=fsM*.6;spark(W/2,ly,24,grade==='C'?2:1,fsM*14);}
        cx.save();cx.translate(W/2,ly);cx.scale(3-2*ease(k),3-2*ease(k));cx.globalAlpha=k;
        cx.globalCompositeOperation='lighter';cx.globalAlpha=k*.5;cx.drawImage(grade==='C'?GL_RD:grade==='A'?GL_CY:GL_GOLD,-lf,-lf,lf*2,lf*2);
        cx.globalCompositeOperation='source-over';cx.globalAlpha=k;
        cx.font=`${lf}px ${FONT}`;cx.fillStyle='#1a1030';cx.fillText(grade,3,5);
        cx.lineWidth=4;cx.strokeStyle='#05040e';cx.strokeText(grade,0,0);cx.fillStyle=col;cx.fillText(grade,0,0);
        cx.restore();cx.globalAlpha=1;
      }
      const rows=[
        ['復旧した盤面',`${solved} / ${CFG.length}`],
        ['手際',`★ ${starsTotal} / ${CFG.length*3}`],
        [finalReason==='clear'?'残り時間':'結果',finalReason==='clear'?`${Math.max(0,Math.ceil(left))} 秒`:'時間切れ'],
        ['自己ベスト',`${D.bestGrade||'-'}　★${D.bestStars|0}`],
      ];
      rows.forEach(([a,b],i)=>{
        const ti=.85+i*.18;if(t<ti)return;
        if(gStep<2+i){gStep=2+i;SFX.tap();}
        const ry_=y+fsM*9.4+i*fsM*2,ka=Math.min(1,(t-ti)/.15);
        cx.globalAlpha=ka;cx.font=`${fsM}px ${FONT}`;
        cx.textAlign='left';cx.fillStyle='#8a7aa8';cx.fillText(a,x+24-(1-ka)*12,ry_);
        cx.textAlign='right';cx.fillStyle='#deccf8';cx.fillText(b,x+pw_-24,ry_);
        cx.fillStyle='rgba(138,82,212,.25)';cx.fillRect(x+20,ry_+fsM*.9,pw_-40,1);
        cx.globalAlpha=1;
      });
      if(newBest&&t>1.7){
        if(gStep<7){gStep=7;SFX.fanfare(true);}
        cx.textAlign='center';cx.font=`${fsM}px ${FONT}`;cx.fillStyle=Math.sin(T*10)>0?'#ffd75a':'#ff8a3a';
        cx.fillText('NEW RECORD!',W/2,y+fsM*7.9);
      }else if(t>1.7&&gStep<7){gStep=7;SFX.fanfare(grade!=='C');}
      if(t>1.4){cx.textAlign='center';cx.font=`${fsS}px ${FONT}`;cx.fillStyle=`rgba(0,232,200,${.5+.5*Math.sin(T*5)})`;cx.fillText('▶ タップで続ける',W/2,y+ph_-fsS*1.6);}
      drawParticles();
    }
    function drawGuide(){
      if(level!==0||guideC<0||moves>=3||m[guideC]===sol[guideC]||st!=='play')return;
      const [x,y]=cellXY(guideC),p=.5+.5*Math.sin(T*6);
      cx.lineWidth=3;cx.strokeStyle=`rgba(0,232,200,${.4+.5*p})`;rr(cx,x-ts*.48,y-ts*.48,ts*.96,ts*.96,ts*.12);cx.stroke();
      const bob=Math.abs(Math.sin(T*4))*ts*.12,hx=x+ts*.2,hy=y+ts*.12+bob;
      cx.fillStyle='rgba(0,0,0,.45)';rr(cx,hx-ts*.06,hy+ts*.03,ts*.13,ts*.3,ts*.06);cx.fill();
      cx.fillStyle='#fff6e8';cx.strokeStyle='#2a1a30';cx.lineWidth=2;
      rr(cx,hx-ts*.065,hy-ts*.02,ts*.13,ts*.3,ts*.065);cx.fill();cx.stroke();
      rr(cx,hx-ts*.1,hy+ts*.16,ts*.3,ts*.24,ts*.08);cx.fill();cx.stroke();
      cx.fillStyle='#fff6e8';cx.fillRect(hx-ts*.05,hy+ts*.15,ts*.1,ts*.05);
      const tw=fsS*4.4,tx=x-tw/2,ty=y-ts*.5-fsS*2.2;
      rr(cx,tx,ty,tw,fsS*1.8,6);cx.fillStyle='#e8b830';cx.fill();
      cx.beginPath();cx.moveTo(x-5,ty+fsS*1.8);cx.lineTo(x+5,ty+fsS*1.8);cx.lineTo(x,ty+fsS*1.8+6);cx.fill();
      cx.fillStyle='#1a1000';cx.textAlign='center';cx.textBaseline='middle';cx.font=`${fsS}px ${FONT}`;cx.fillText('タップ！',x,ty+fsS*.92);
    }
    function drawRipples(){
      for(let i=0;i<8;i++){
        if(RPT[i]>.35)continue;const k=RPT[i]/.35;
        cx.beginPath();cx.arc(RPX[i],RPY[i],ts*(.2+k*.5),0,7);cx.lineWidth=Math.max(1,ts*.05*(1-k));cx.strokeStyle=`rgba(180,255,245,${.7*(1-k)})`;cx.stroke();
      }
    }
    function drawWipe(){
      const p=wipe.t/wipe.dur,c=p<.5?p*2:(1-p)*2,nb=10,bh=H/nb;
      for(let i=0;i<nb;i++){
        const k=Math.max(0,Math.min(1,c*1.5-(i/nb)*.5));if(k<=0)continue;
        cx.fillStyle='#05040e';cx.fillRect(0,i*bh,W,bh*k+.6);
        cx.fillStyle='rgba(0,232,200,.6)';cx.fillRect(0,i*bh+bh*k-1,W,1.5);
      }
    }
    function applyMosaic(k){
      if(!mosaicC||mosaicC.width!==cv.width||mosaicC.height!==cv.height)mosaicC=mkC(cv.width,cv.height);
      const sw=Math.max(4,Math.ceil(cv.width/k)),sh=Math.max(4,Math.ceil(cv.height/k)),g=mosaicC.getContext('2d');
      g.drawImage(cv,0,0,cv.width,cv.height,0,0,sw,sh);
      cx.setTransform(1,0,0,1,0,0);cx.imageSmoothingEnabled=false;
      cx.drawImage(mosaicC,0,0,sw,sh,0,0,cv.width,cv.height);cx.imageSmoothingEnabled=true;
      cx.setTransform(dpr,0,0,dpr,0,0);
    }

    // ── メインループ ──
    let ro=null;
    if(window.ResizeObserver){ro=new ResizeObserver(()=>{if(!mg._ended)layout();});ro.observe(wrap);}
    else window.addEventListener('resize',layout);
    const cleanup=()=>{if(ro)ro.disconnect();else window.removeEventListener('resize',layout);};

    newBoard();updScore();mg.setTimer(String(TIME));
    mg.loop(dtr=>{
      if(wipe){
        wipe.t+=dtr;
        if(!wipe.fired&&wipe.t>=wipe.dur/2){wipe.fired=true;wipe.mid();if(mg._ended)return;}
        if(wipe&&wipe.t>=wipe.dur)wipe=null;
      }
      let dt=dtr;
      if(hitStop>0){hitStop-=dtr;dt=0;}
      else if(tapQ.length){const q=tapQ.splice(0,tapQ.length);for(let i=0;i<q.length;i+=2)tap(q[i],q[i+1]);}
      if(shakeA>0)shakeA=Math.max(0,shakeA-dtr*(shakeA*7+2));
      T+=dt;stT+=dt;
      if(msgT>0)msgT-=dt;if(shakeT>0)shakeT-=dt;
      if(boardIn<1)boardIn=Math.min(1,boardIn+dt/.45);
      for(let c=0;c<n*n;c++)if(anim[c]>0)anim[c]=Math.max(0,anim[c]-dt*7.5);
      for(let i=0;i<PMAX;i++)if(pl[i]>0){pl[i]-=dt;px[i]+=pvx[i]*dt;py[i]+=pvy[i]*dt;pvy[i]+=ts*6*dt;pvx[i]*=.96;}
      for(let i=0;i<8;i++)RPT[i]+=dt;
      for(let i=0;i<RN;i++){ry[i]+=rv[i]*dt;if(ry[i]>1.05){ry[i]=-.05;rx[i]=Math.random()*1.1;}}
      if((st==='play'||st==='intro'||st==='clear')&&Math.random()<dt*9){const [x,y]=cellXY(src);spark(x,y,1+(Math.random()*2|0),0,ts*2.4);}
      if(!wipe){
        if(st==='title'&&stT>3.4)toStory();
        if(st==='story'||st==='ending'){
          const L=dlg[di];dT+=dt;
          if(typed<L.text.length){const nt=Math.min(L.text.length,typed+dt*30);if((nt|0)!==(typed|0)&&(nt|0)%2===0)SFX.type();typed=nt;}
          else if(dT>L.text.length/30+2.6)advDialog();
        }
        if(st==='intro'&&stT>3.4)startPlay();
        if(st==='timeup'&&stT>1.6&&!finalReason)finishRun('timeup');
        if(st==='clear'&&stT>2.4){
          if(solved>=CFG.length){if(!finalReason)finishRun('clear');}
          else{st='out';stT=0;}
        }
        if(st==='grade'&&stT>7)toEnding();
      }
      if(st==='play'){
        left-=dt;
        const s=Math.max(0,Math.ceil(left));
        if(s!==lastSec){lastSec=s;mg.setTimer(String(s));}
        if(left<=10&&!warned){warned=true;AU.se('warn');SFX.warn();msg('残り10秒！');}
        if(left<=0){left=0;st='timeup';stT=0;AU.se('warn');SFX.thud();shakeA=ts*.25;hitStop=.12;}
      }
      if(st==='out'&&stT>.42){level++;boardIn=0;newBoard();st='intro';stT=0;}
      cx.setTransform(dpr,0,0,dpr,0,0);
      if(shakeA>0)cx.translate((Math.random()-.5)*2*shakeA,(Math.random()-.5)*2*shakeA);
      if(st==='title')drawTitle();
      else if(st==='story'||st==='ending')drawDialog();
      else{
        drawBoard();drawHud();drawFoot();drawRipples();drawGuide();
        if(st==='clear')drawClear();
        if(st==='intro')drawIntro();
        if(st==='timeup')drawTimeUp();
        if(st==='grade')drawGrade();
        const mk=st==='out'?1+ease(Math.min(1,stT/.42))*22:boardIn<1?1+(1-ease(boardIn))*22:1;
        if(mk>1.5)applyMosaic(mk);
      }
      cx.setTransform(dpr,0,0,dpr,0,0);
      if(wipe)drawWipe();
    });

    return {result(reason){
      cleanup();
      if(reason==='quit'&&finalReason)reason=finalReason;   // エンディング中の終了ボタンは結果どおりに扱う
      saveRecord();
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
          (grade?`<br>評価 <span class="up">${grade}</span>`+(newBest?'（自己ベスト更新）':''):'')+
          (reason==='timeup'?'<br>時間切れ。残りは朝番に引き継いだ。':''),
        fx, time:60, sp:solved,
        log:all?(starsTotal>=9?'停電したラインを最短手順で全部つなぎ直した。':'停電したラインを全部つなぎ直した。'):'配線の復旧作業をした。',
        cutin:all?(starsTotal>=9?['win','……最短手順。配線は嘘をつかないのよね。']:['happy','……配線は嘘をつかないのよね。']):null,
      };
    }};
  },
});
})();
