// ══════════════════════════════════════════════════════════
// 料理「深夜の夜食づくり」
// 子どもが寝たあとの台所で、明日のお弁当（と自分の夜食）をつくる。
//   1品目 卵焼き        … 火加減ゲージ → 半熟のうちに3回巻く（タイミング）
//   2品目 ウインナー    … 包丁で切れ目 → 焼き色を見て取り出す（見極め）
//   3品目 焼きおにぎり  … リズムでにぎる → タレを塗る（ドラッグ）→ 焼く
//   仕上げ 盛り付け     … お弁当箱の仕切りへドラッグ（きれいさ）
// 翌朝、遠足でお弁当を開ける場面で終わる。記録は gs.cookingData。
// ══════════════════════════════════════════════════════════
(()=>{
addMinigameStyle('cooking',`
.mg-cooking{background:#0b0709;}
.mg-cooking .cooking-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;}
`);

// ── レシピ（遊ぶほど／日が進むほど解禁） ──
const CK_RECIPES={
  egg:[{id:'tamago',name:'甘い卵焼き'},{id:'dashi',name:'だし巻き卵',plays:2,day:8}],
  tako:[{id:'tako',name:'たこさんウインナー'},{id:'kani',name:'かにさんウインナー',plays:1,day:5}],
  oni:[{id:'yaki',name:'焼きおにぎり'},{id:'miso',name:'みそ焼きおにぎり',plays:3,day:12}],
};
function ckData(){
  if(!gs.cookingData||typeof gs.cookingData!=='object')gs.cookingData={};
  const d=gs.cookingData;
  if(typeof d.best!=='number')d.best=0;
  if(typeof d.plays!=='number')d.plays=0;
  if(!d.book||typeof d.book!=='object')d.book={};
  if(!Array.isArray(d.history))d.history=[];
  if(typeof d.bestGrade!=='string')d.bestGrade='';
  return d;
}
function ckUnlocked(r,d){return !r.plays||d.plays>=r.plays||(gs.day||1)>=r.day;}

registerMinigame({
  id:'cooking', icon:'🍳', name:'深夜の夜食づくり', genre:'タイミング（料理）', bgm:'night',
  desc:'あの子が寝たあとの小さな台所。卵焼き・ウインナー・焼きおにぎりを作って、明日のお弁当に詰める。端っこは自分の夜食。',
  effect:'育児ストレス↓ 精神↑ 希望↑ ／ 疲労+5 食材費-¥300 約45分',
  help:'金色ゾーンでタップ/Space・盛り付けはドラッグ',
  start(body,mg){
    const FONT='"DotGothic16", monospace';
    const SERIF='"Noto Serif JP", serif';
    const QV={P:100,G:70,M:25};
    const QL={P:'PERFECT',G:'GOOD',M:'MISS'};
    const QC={P:'#ffd65a',G:'#62f2da',M:'#ff6f83'};
    // 難しさ（開始時に読む）：WK=タイミング判定の幅の倍率 SPD=ゲージ・焼き色・包丁の速さ BEAT=にぎにぎの間隔(秒)
    // PLATE_ADD=盛り付けの追加秒 NEAT_K=仕切りの真ん中からのずれの許容（大きいほど甘い）
    const DIFF=mgDifficulty();
    const WK=mgDiff(1.45,1.2,1),SPD=mgDiff(.7,.85,1),BEAT=mgDiff(.75,.68,.6),PLATE_ADD=mgDiff(12,6,0),NEAT_K=mgDiff(1.35,1.15,1);
    addMinigameStyle('diffbadge','.mg-diffb{display:inline-block;margin-left:7px;padding:1px 5px;border:1px solid currentColor;border-radius:3px;font-size:.58rem;letter-spacing:0;vertical-align:1px;}.mg-diffb-easy{color:#44ee88;}.mg-diffb-normal{color:#e8b830;}.mg-diffb-hard{color:#ff6a86;}');
    mg.el('mg-title').insertAdjacentHTML('beforeend',`<span class="mg-diffb mg-diffb-${DIFF}">${MG_DIFF_NAMES[DIFF]}</span>`);
    // 焼き色のグラデーション（0=生 … 1=焦げ）
    const R_EGG=[[0,[255,236,130]],[.42,[255,216,72]],[.66,[248,194,54]],[.8,[230,154,42]],[.93,[176,100,34]],[1.1,[78,46,22]]];
    const R_DASHI=[[0,[255,244,176]],[.42,[255,232,128]],[.66,[250,214,98]],[.8,[232,170,70]],[.93,[180,112,46]],[1.1,[80,50,26]]];
    const R_SAUS=[[0,[240,118,124]],[.42,[228,90,76]],[.68,[204,80,44]],[.85,[150,60,30]],[1.02,[62,30,18]]];
    const R_GRILL=[[0,[240,214,172]],[.38,[220,160,96]],[.66,[196,118,56]],[.84,[142,80,36]],[1.02,[56,34,20]]];
    const R_MISO=[[0,[244,214,160]],[.38,[230,170,96]],[.66,[214,132,58]],[.84,[160,90,40]],[1.02,[60,36,20]]];
    const R_HEAT=[[0,[70,120,230]],[.42,[120,200,235]],[.6,[252,196,80]],[.82,[240,120,50]],[1,[224,40,60]]];
    const R_SOY=[[0,[120,96,80]],[.7,[214,150,70]],[1,[255,210,110]]];

    // ── 記録・今日のレシピ ──
    const cd=ckData();
    const pickVar=list=>{
      const un=list.filter(r=>ckUnlocked(r,cd));
      const fresh=un.filter(r=>!cd.book[r.id]);
      const pool=fresh.length?fresh:un;
      return pool[(Math.random()*pool.length)|0];
    };
    const V={egg:pickVar(CK_RECIPES.egg),tako:pickVar(CK_RECIPES.tako),oni:pickVar(CK_RECIPES.oni)};
    const isKani=V.tako.id==='kani', isDashi=V.egg.id==='dashi', isMiso=V.oni.id==='miso';
    const EGGR=isDashi?R_DASHI:R_EGG, GRILLR=isMiso?R_MISO:R_GRILL;
    const sausName=isKani?'かにさん':'たこさん';
    const DISH=[
      {key:'egg',no:'1品目',name:V.egg.name,sub:isDashi?'お出汁たっぷり。焦がさず、ふんわり':'砂糖ひとさじ。あの子の好きな味',diff:1.3*WK},
      {key:'tako',no:'2品目',name:V.tako.name,sub:'切れ目を入れて、きつね色に焼く',diff:1.0*WK},
      {key:'oni',no:'3品目',name:V.oni.name,sub:'にぎって、'+(isMiso?'みそ':'タレ')+'を塗って、香ばしく',diff:.84*WK},
      {key:'plate',no:'仕上げ',name:'盛り付け',sub:'おかずを仕切りへ、きれいに詰めよう',diff:1},
    ];

    // ── 立ち絵 ──
    const IMG={};
    ['normal','happy','tired','win'].forEach(k=>{const im=new Image();im.src='assets/img/char_'+k+'.webp';IMG[k]=im;});
    // 娘の顔（game.js の CHILD_IMG を共通で使う）
    const KIMG={};
    ['normal','happy','sad'].forEach(k=>{const im=new Image();im.src=(typeof CHILD_IMG!=='undefined'&&CHILD_IMG[k])||('assets/img/child_'+k+'.svg');KIMG[k]=im;});
    const imgOk=im=>im&&im.complete&&im.naturalWidth>0;

    // ── 効果音（AU.se＋Web Audioの合成音。設定で音量0なら鳴らない） ──
    const SND={
      nbuf:null,siz:null,
      c(){
        try{if(typeof AU==='undefined')return null;AU.init();const c=AU.ctx;
          if(!c||typeof AUDIO_SET==='undefined'||!(AUDIO_SET.se>0))return null;
          if(c.state==='suspended')c.resume().catch(()=>{});return c;}catch(_){return null;}
      },
      vol(){return (typeof AUDIO_SET!=='undefined'?AUDIO_SET.se:0)||0;},
      noise(c){
        if(!this.nbuf||this.nbuf.sampleRate!==c.sampleRate){
          const b=c.createBuffer(1,c.sampleRate,c.sampleRate),d=b.getChannelData(0);
          for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nbuf=b;
        }return this.nbuf;
      },
      burst(ft,f,q,dur,gain,delay,f2){
        const c=this.c();if(!c)return;
        try{const t=c.currentTime+(delay||0);
          const s=c.createBufferSource();s.buffer=this.noise(c);
          const fl=c.createBiquadFilter();fl.type=ft;fl.frequency.setValueAtTime(f,t);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t+dur);fl.Q.value=q;
          const gn=c.createGain();gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(gain*this.vol(),t+.008);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
          s.connect(fl);fl.connect(gn);gn.connect(c.destination);s.start(t,Math.random()*.5);s.stop(t+dur+.05);}catch(_){}
      },
      tone(f,dur,type,gain,delay,f2){
        const c=this.c();if(!c)return;
        try{const t=c.currentTime+(delay||0);
          const o=c.createOscillator();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+dur);
          const gn=c.createGain();gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(gain*this.vol(),t+.01);gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);
          o.connect(gn);gn.connect(c.destination);o.start(t);o.stop(t+dur+.05);}catch(_){}
      },
      sizzle(level){ // 焼ける音（ループ）。level 0〜1
        const c=this.c();
        if(!c){return;}
        try{
          if(!this.siz){
            const s=c.createBufferSource();s.buffer=this.noise(c);s.loop=true;
            const hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=2600;
            const pk=c.createBiquadFilter();pk.type='peaking';pk.frequency.value=6200;pk.gain.value=8;
            const gn=c.createGain();gn.gain.value=0;
            s.connect(hp);hp.connect(pk);pk.connect(gn);gn.connect(c.destination);s.start();
            this.siz={s,gn,lv:0};
          }
          const v=Math.max(0,Math.min(1,level))*.055*this.vol()*(.75+Math.random()*.5);
          this.siz.gn.gain.setTargetAtTime(v,c.currentTime,.06);
        }catch(_){}
      },
      stop(){if(this.siz){try{this.siz.s.stop();this.siz.gn.disconnect();}catch(_){}this.siz=null;}},
      se(t){try{AU.se(t);}catch(_){}},
      tap(){this.se('btn');},
      perfect(){this.se('rank');[1046,1318,1568,2093].forEach((f,i)=>this.tone(f,.22,'triangle',.07,i*.045));},
      good(){this.se('decide');this.tone(880,.14,'triangle',.06);},
      miss(){this.se('back');this.tone(240,.22,'sawtooth',.04,0,150);},
      chop(){this.se('tool');this.burst('bandpass',2400,1.2,.07,.32);this.tone(150,.09,'sine',.35,0,70);},
      pour(){this.burst('lowpass',1400,.7,.45,.16,0,500);this.burst('highpass',4000,.5,.5,.06,.05);},
      flip(){this.se('btn');this.burst('bandpass',700,.8,.22,.16,0,1800);},
      pon(){this.tone(520,.1,'sine',.2,0,330);this.burst('lowpass',600,.8,.06,.12);},
      brush(){this.burst('bandpass',3200,2,.08,.05);},
      place(){this.se('btn');this.tone(420,.08,'sine',.16,0,300);},
      wipe(){this.burst('bandpass',500,.7,.45,.08,0,2400);},
    };

    // ── キャンバス ──
    const cv=document.createElement('canvas');cv.className='cooking-cv';cv.tabIndex=-1;body.appendChild(cv);
    const g=cv.getContext('2d');
    let W=0,H=0,dpr=1,S=1;
    const L={};
    let bg=null,vig=null,riceTex=null,steamSpr=null,smokeSpr=null,glowSpr=null,woodTex=null,woodKey='',morningBg=null;

    const rnd=(a,b)=>a+Math.random()*(b-a);
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;
    const lerp=(a,b,t)=>a+(b-a)*t;
    const eo=t=>1-Math.pow(1-clamp(t,0,1),3);
    const eio=t=>{t=clamp(t,0,1);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
    const eback=t=>{t=clamp(t,0,1);const c1=1.9,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);};
    const tri=x=>{x=((x%2)+2)%2;return x<1?x:2-x;};
    const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
    function mkCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*dpr));c.height=Math.max(1,Math.ceil(h*dpr));const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);return [c,x];}
    function rr(c,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
    function rampA(st,t){
      if(t<=st[0][0])return st[0][1];
      for(let i=1;i<st.length;i++){if(t<=st[i][0]){const a=st[i-1],b=st[i],k=(t-a[0])/(b[0]-a[0]);return [lerp(a[1][0],b[1][0],k),lerp(a[1][1],b[1][1],k),lerp(a[1][2],b[1][2],k)];}}
      return st[st.length-1][1];
    }
    const rgb=(c,a)=>a===undefined?`rgb(${c[0]|0},${c[1]|0},${c[2]|0})`:`rgba(${c[0]|0},${c[1]|0},${c[2]|0},${a})`;
    const shade=(c,k)=>[c[0]*k,c[1]*k,c[2]*k];
    const tint=(c,k)=>[c[0]+(255-c[0])*k,c[1]+(255-c[1])*k,c[2]+(255-c[2])*k];
    const ramp=(st,t,a)=>rgb(rampA(st,t),a);
    function font(sz){g.font=`${Math.round(sz)}px ${FONT}`;}
    function txt(s,x,y,sz,col,al,bl){font(sz);g.textAlign=al||'center';g.textBaseline=bl||'middle';g.fillStyle=col;g.fillText(s,x,y);}
    function txtO(s,x,y,sz,col,oc,lw,al){font(sz);g.textAlign=al||'center';g.textBaseline='middle';g.lineJoin='round';g.strokeStyle=oc;g.lineWidth=lw;g.strokeText(s,x,y);g.fillStyle=col;g.fillText(s,x,y);}
    function wrap(s,maxW,sz){font(sz);const out=[];let line='';for(const ch of s){if(ch==='\n'){out.push(line);line='';continue;}const t=line+ch;if(g.measureText(t).width>maxW&&line){if('、。」』！？…ー'.includes(ch)){line=t;continue;}out.push(line);line=ch;}else line=t;}if(line)out.push(line);return out;}
    const seeded=(n,f)=>Array.from({length:n},(_,i)=>f(i));
    // 表面の気泡や焼きムラの位置（毎フレーム同じ位置に描く）
    const BUB=seeded(22,()=>({x:Math.random(),y:Math.random(),r:rnd(1.2,3.6),p:rnd(0,6.28)}));
    const SPOT=seeded(26,()=>({x:Math.random(),y:Math.random(),r:rnd(1.5,4.5),k:Math.random()}));

    // ── 状態 ──
    let ph='title',pt=0,T=0,dishIdx=-1,banner=null,wipe=null,hint='',hitstop=0,buf=0,shake=0,flash=0,flashCol='255,240,200';
    let finished=false,res=null,tutorial=true;
    const rec={egg:[],tako:[],oni:[],plate:[]};
    const cnt={P:0,G:0,M:0};
    const gauge={show:false,label:'',v:0,pa:0,pb:0,ga:0,gb:0,ramp:R_HEAT,lockV:-1,lockT:0,lockQ:'',right:''};
    const egg={heat:.5,heatF:1,layers:[],ry:0,rh:0,c:0,pour:0,sheet:false,rot:0,r0y:0,r0h:0,heatV:.5};
    const tako={i:0,tm:.5,kx:.3,cuts:[],s:[],endT:-1,knifeY:0};
    const oni={beats:[],shapeP:0,press:0,cov:0,cells:null,strokes:[],paint:null,paintR:0,brushing:false,bx:0,by:0,auto:false,last:null,side:0,c:0,cs:[0,0],flipK:0,shapeQ:[],brushSnd:0};
    const plate={items:[],drag:null,left:24,mistakes:0};
    const story={i:0,t:0,lines:[]};
    const P=[];for(let i=0;i<320;i++)P.push({on:false});
    let pIdx=0;
    const pops=[];
    const rain=seeded(34,()=>({x:Math.random(),y:Math.random(),l:rnd(.04,.1),s:rnd(.7,1.2)}));
    let lastScore='',lastTimer='';

    // ── お話 ──
    const ensoku=cd.plays%2===0;
    story.lines=[
      {face:'tired',who:'だんのうら',text:cd.plays?'……今夜も、やっと寝てくれた。':'……やっと寝てくれた。'},
      {face:'normal',who:'',text:'冷蔵庫に、保育園のおたより。\n「あした'+(ensoku?' えんそく。':'は おべんとうの日。')+'おべんとうを もたせてください」',note:ensoku?'あした えんそく':'おべんとうの日'},
      {face:'normal',who:'',text:'その下に、クレヨンの字。\n「'+(isKani?'かにさん いれてね':'たこさん いれてね')+'」',note:isKani?'かにさん\nいれてね':'たこさん\nいれてね',crayon:true},
      {face:'happy',who:'だんのうら',text:'……任せなさい。配信の前に、ひと仕事よ。'},
    ];

    // ── 画面サイズ ──
    function layout(){
      S=clamp(Math.min(W/390,H/640),.72,1.35);
      L.cy0=Math.round(H*.29);
      L.cx=W/2;L.CY=H*.545;
      L.GW=Math.min(W*.84,330);L.GY=H-Math.max(40,H*.085);
      L.hintY=L.cy0-16*S;
      L.PW=Math.min(W*.56,H*.33,240);L.PH=L.PW*1.08;
      L.PR=Math.min(W*.39,H*.23,165);
      L.BDW=Math.min(W*.88,340);L.BDH=Math.min(L.BDW*.6,H*.3);
      L.R=Math.min(W*.18,H*.11,76);
      const BW=Math.min(W*.92,380),BH=Math.min(BW*.6,H*.34);
      L.bx=W/2-BW/2;L.by=L.cy0+10;L.BW=BW;L.BH=BH;
      const pad=Math.max(8,BW*.035),ix=L.bx+pad,iy=L.by+pad,iw=BW-pad*2,ih=BH-pad*2,dv=Math.max(5,BW*.018);
      L.inner={x:ix,y:iy,w:iw,h:ih,dv,pad};
      const lw=iw*.4;
      const c0={type:'oni',x:ix,y:iy,w:lw,h:ih};
      const c1={type:'egg',x:ix+lw+dv,y:iy,w:iw-lw-dv,h:(ih-dv)/2};
      const c2={type:'tako',x:ix+lw+dv,y:iy+(ih-dv)/2+dv,w:iw-lw-dv,h:(ih-dv)/2};
      L.comps=[c0,c1,c2];
      const oR=Math.min(c0.w*.4,c0.h*.27);
      const eS=Math.min(c1.w*.1,c1.h*.33);
      const tS=Math.min(c2.h*.4,c2.w*.15);
      L.slots=[
        {type:'oni',x:c0.x+c0.w*.5,y:c0.y+c0.h*.28,s:oR},{type:'oni',x:c0.x+c0.w*.5,y:c0.y+c0.h*.74,s:oR},
        {type:'egg',x:c1.x+c1.w*.14,y:c1.y+c1.h*.52,s:eS},{type:'egg',x:c1.x+c1.w*.38,y:c1.y+c1.h*.52,s:eS},{type:'egg',x:c1.x+c1.w*.62,y:c1.y+c1.h*.52,s:eS},
        {type:'tako',x:c2.x+c2.w*.14,y:c2.y+c2.h*.5,s:tS},{type:'tako',x:c2.x+c2.w*.38,y:c2.y+c2.h*.5,s:tS},{type:'tako',x:c2.x+c2.w*.62,y:c2.y+c2.h*.5,s:tS},
      ];
      L.garn=[{k:'broc',x:c1.x+c1.w*.87,y:c1.y+c1.h*.5,s:Math.min(c1.w*.12,c1.h*.36)},{k:'tomato',x:c2.x+c2.w*.87,y:c2.y+c2.h*.52,s:Math.min(c2.w*.1,c2.h*.3)}];
      const ty0=L.by+BH+14,ty1=H-12;
      L.tray={x:10,y:ty0,w:W-20,h:ty1-ty0};
      const H0=[[.14,.32],[.3,.7],[.47,.3],[.58,.7],[.67,.3],[.77,.68],[.86,.3],[.94,.68]];
      L.homes=H0.map(([fx,fy],i)=>({x:L.tray.x+L.tray.w*fx,y:ty0+(ty1-ty0)*fy,type:L.slots[i].type,s:L.slots[i].s}));
    }
    function resize(){
      const w=Math.max(260,body.clientWidth),h=Math.max(400,body.clientHeight);
      const nd=Math.min(2.5,window.devicePixelRatio||1);
      if(w===W&&h===H&&nd===dpr)return;
      W=w;H=h;dpr=nd;
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      layout();buildSprites();buildBg();buildMorning();woodKey='';oni.paint=null;
    }

    // ── 事前描画 ──
    function buildSprites(){
      let c;
      [steamSpr,c]=mkCanvas(64,64);
      let gr=c.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,250,240,.9)');gr.addColorStop(.45,'rgba(255,245,235,.35)');gr.addColorStop(1,'rgba(255,240,230,0)');
      c.fillStyle=gr;c.fillRect(0,0,64,64);
      [smokeSpr,c]=mkCanvas(64,64);
      gr=c.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(120,110,105,.8)');gr.addColorStop(1,'rgba(90,80,80,0)');
      c.fillStyle=gr;c.fillRect(0,0,64,64);
      [glowSpr,c]=mkCanvas(64,64);
      gr=c.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,220,140,1)');gr.addColorStop(.3,'rgba(255,170,70,.45)');gr.addColorStop(1,'rgba(255,120,30,0)');
      c.fillStyle=gr;c.fillRect(0,0,64,64);
      if(!riceTex){
        const sv=dpr;dpr=Math.max(2,sv);
        [riceTex,c]=mkCanvas(170,170);dpr=sv;
        c.fillStyle='#f2ede2';c.fillRect(0,0,170,170);
        for(let i=0;i<620;i++){
          c.save();c.translate(rnd(-4,174),rnd(-4,174));c.rotate(rnd(0,3.14));
          c.beginPath();c.ellipse(0,0,rnd(3.4,4.4),rnd(1.7,2.2),0,0,6.283);
          const k=Math.random();c.fillStyle=k<.4?'#fffdf7':k<.8?'#f6f1e6':'#e6dece';c.fill();
          c.strokeStyle='rgba(140,128,108,.32)';c.lineWidth=.5;c.stroke();
          c.fillStyle='rgba(255,255,255,.75)';c.beginPath();c.ellipse(-.8,-.5,1.5,.5,0,0,6.283);c.fill();
          c.restore();
        }
      }
    }
    function buildBg(){
      let c,gr;[bg,c]=mkCanvas(W,H);
      const cy=L.cy0;
      gr=c.createLinearGradient(0,0,0,cy);gr.addColorStop(0,'#0d080d');gr.addColorStop(1,'#25150f');
      c.fillStyle=gr;c.fillRect(0,0,W,cy);
      // タイル
      const ts=Math.round(19*S);
      for(let r=0,y=cy;y>-ts;y-=ts,r++){for(let x=(r%2)*ts/2-ts;x<W;x+=ts){c.fillStyle=`rgba(255,${205+((x*7+r*13)%20)},170,${.03+((x*3+r*5)%7)*.004})`;c.fillRect(x+1,y-ts+1,ts-2,ts-2);}}
      // 窓（雨の夜）
      const ww=Math.min(W*.34,140*S),wh=cy*.62,wx=W*.055,wy=cy*.1;
      L.win={x:wx,y:wy,w:ww,h:wh};
      gr=c.createLinearGradient(0,wy,0,wy+wh);gr.addColorStop(0,'#060a1c');gr.addColorStop(1,'#1c1634');
      c.fillStyle=gr;c.fillRect(wx,wy,ww,wh);
      c.fillStyle='rgba(4,4,12,.92)';
      for(let x=wx;x<wx+ww;){const bw=rnd(10,26)*S,bh=wh*rnd(.18,.45);c.fillRect(x,wy+wh-bh,bw,bh);
        for(let yy=wy+wh-bh+4;yy<wy+wh-3;yy+=6*S)for(let xx=x+2;xx<x+bw-3;xx+=5*S)if(Math.random()<.18){c.fillStyle=Math.random()<.7?'rgba(255,205,130,.55)':'rgba(140,220,255,.4)';c.fillRect(xx,yy,2,2.5);c.fillStyle='rgba(4,4,12,.92)';}
        x+=bw+rnd(1,4);}
      for(let i=0;i<14;i++){const bx=wx+rnd(0,ww),by=wy+wh*rnd(.35,.95),r=rnd(3,8)*S;const b=c.createRadialGradient(bx,by,0,bx,by,r);const col=Math.random()<.6?'255,180,100':Math.random()<.5?'120,220,255':'255,110,160';b.addColorStop(0,`rgba(${col},.32)`);b.addColorStop(1,`rgba(${col},0)`);c.fillStyle=b;c.fillRect(bx-r,by-r,r*2,r*2);}
      for(let i=0;i<26;i++){c.fillStyle='rgba(200,215,255,.16)';c.beginPath();c.arc(wx+rnd(2,ww-2),wy+rnd(2,wh-2),rnd(.6,1.6)*S,0,6.283);c.fill();}
      c.strokeStyle='#3b2618';c.lineWidth=5*S;c.strokeRect(wx,wy,ww,wh);
      c.lineWidth=3*S;c.beginPath();c.moveTo(wx+ww/2,wy);c.lineTo(wx+ww/2,wy+wh);c.stroke();
      c.strokeStyle='rgba(255,190,120,.18)';c.lineWidth=1;c.strokeRect(wx-2.5*S,wy-2.5*S,ww+5*S,wh+5*S);
      c.fillStyle='#4c311f';c.fillRect(wx-7*S,wy+wh+1,ww+14*S,5*S);
      c.fillStyle='rgba(255,200,140,.25)';c.fillRect(wx-7*S,wy+wh+1,ww+14*S,1);
      // 窓辺の小さな鉢
      const px=wx+ww*.78,py=wy+wh;
      c.fillStyle='#8a4b2c';c.beginPath();c.moveTo(px-7*S,py-10*S);c.lineTo(px+7*S,py-10*S);c.lineTo(px+5*S,py);c.lineTo(px-5*S,py);c.fill();
      [[-5,-16,.5],[4,-18,-.4],[0,-22,0],[-8,-12,.9],[7,-12,-.9]].forEach(([dx,dy,a])=>{c.save();c.translate(px+dx*S*.5,py-10*S+dy*S*.35);c.rotate(a);c.fillStyle='#3f7a3a';c.beginPath();c.ellipse(0,0,2.6*S,6*S,0,0,6.283);c.fill();c.restore();});
      // 子どもの絵
      const dw=Math.min(W*.2,80*S),dh=dw*.76,dx=W*.46,dy=cy*.14;
      c.save();c.translate(dx+dw/2,dy+dh/2);c.rotate(-.05);
      c.fillStyle='rgba(0,0,0,.35)';c.fillRect(-dw/2+3,-dh/2+4,dw,dh);
      c.fillStyle='#efe5cf';c.fillRect(-dw/2,-dh/2,dw,dh);
      c.lineCap='round';c.lineJoin='round';
      c.strokeStyle='#f39a2c';c.lineWidth=2*S;c.beginPath();c.arc(dw*.3,-dh*.24,dw*.09,0,6.283);c.stroke();
      for(let i=0;i<8;i++){const a=i/8*6.283;c.beginPath();c.moveTo(dw*.3+Math.cos(a)*dw*.13,-dh*.24+Math.sin(a)*dw*.13);c.lineTo(dw*.3+Math.cos(a)*dw*.18,-dh*.24+Math.sin(a)*dw*.18);c.stroke();}
      c.strokeStyle='#5fb35a';c.beginPath();c.moveTo(-dw*.48,dh*.36);c.quadraticCurveTo(0,dh*.3,dw*.48,dh*.38);c.stroke();
      const fig=(x,s,col)=>{c.strokeStyle=col;c.lineWidth=1.8*S;c.beginPath();c.arc(x,dh*.36-s*1.05,s*.22,0,6.283);c.stroke();
        c.beginPath();c.moveTo(x,dh*.36-s*.83);c.lineTo(x,dh*.36-s*.35);c.moveTo(x,dh*.36-s*.35);c.lineTo(x-s*.18,dh*.36);c.moveTo(x,dh*.36-s*.35);c.lineTo(x+s*.18,dh*.36);c.moveTo(x-s*.25,dh*.36-s*.62);c.lineTo(x+s*.25,dh*.36-s*.62);c.stroke();};
      fig(-dw*.2,dh*.62,'#4a6fd8');fig(dw*.05,dh*.4,'#e2508a');
      c.fillStyle='#4a6fd8';c.font=`${Math.round(7*S)}px ${FONT}`;c.textAlign='center';c.fillText('パパ',-dw*.2,-dh*.36);
      c.fillStyle='rgba(255,240,200,.45)';c.fillRect(-dw*.12,-dh/2-3,dw*.24,7);
      c.restore();
      // 棚と瓶
      const sx=W*.71,sw=W*.27,sy=cy*.7;
      c.fillStyle='#3d281a';c.fillRect(sx,sy,sw,4*S);c.fillStyle='rgba(255,200,140,.2)';c.fillRect(sx,sy,sw,1);
      [['塩','#d8d4cc',.08],['砂糖','#efe9dd',.36],['だし','#c9944a',.66]].forEach(([lb,col,f],i)=>{
        const jx=sx+sw*f,jw=Math.min(sw*.24,22*S),jh=jw*1.25;
        c.fillStyle='rgba(255,255,255,.08)';rr(c,jx,sy-jh,jw,jh,3*S);c.fill();
        c.fillStyle=col;c.globalAlpha=.55;rr(c,jx+2,sy-jh*.72,jw-4,jh*.72-1,2*S);c.fill();c.globalAlpha=1;
        c.fillStyle='#6e4a2c';c.fillRect(jx+1,sy-jh-3*S,jw-2,4*S);
        c.fillStyle='rgba(255,250,235,.85)';c.fillRect(jx+jw*.18,sy-jh*.62,jw*.64,jh*.32);
        c.fillStyle='#4a3020';c.font=`${Math.round(6*S)}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillText(lb,jx+jw/2,sy-jh*.46);
        c.fillStyle='rgba(255,255,255,.25)';c.fillRect(jx+2,sy-jh+2,2,jh*.7);
      });
      // 調理台
      gr=c.createLinearGradient(0,cy,0,H);gr.addColorStop(0,'#3d2a1e');gr.addColorStop(.1,'#2d1e15');gr.addColorStop(1,'#110a08');
      c.fillStyle=gr;c.fillRect(0,cy,W,H-cy);
      c.fillStyle='rgba(0,0,0,.5)';c.fillRect(0,cy-4,W,4);
      c.fillStyle='rgba(255,200,140,.28)';c.fillRect(0,cy,W,1.5);
      for(let i=0;i<420;i++){c.fillStyle=Math.random()<.5?'rgba(255,230,200,.05)':'rgba(0,0,0,.12)';c.fillRect(rnd(0,W),rnd(cy,H),rnd(.5,1.6),rnd(.5,1.6));}
      // ペンダントライトの暖かい光
      const lx=W*.8,ly=cy*.3;
      gr=c.createRadialGradient(lx,ly,4,lx,ly,H*.8);gr.addColorStop(0,'rgba(255,196,120,.34)');gr.addColorStop(.3,'rgba(255,150,70,.13)');gr.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=gr;c.fillRect(0,0,W,H);
      gr=c.createRadialGradient(W*.55,H*.55,10,W*.55,H*.55,W*.7);gr.addColorStop(0,'rgba(255,170,90,.1)');gr.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=gr;c.fillRect(0,cy,W,H-cy);
      c.strokeStyle='#0a0606';c.lineWidth=1.5;c.beginPath();c.moveTo(lx,0);c.lineTo(lx,cy*.12);c.stroke();
      gr=c.createLinearGradient(lx-30*S,0,lx+30*S,0);gr.addColorStop(0,'#1c120c');gr.addColorStop(.5,'#3f2a1a');gr.addColorStop(1,'#140c08');
      c.fillStyle=gr;c.beginPath();c.moveTo(lx-12*S,cy*.12);c.lineTo(lx+12*S,cy*.12);c.lineTo(lx+32*S,cy*.3);c.lineTo(lx-32*S,cy*.3);c.closePath();c.fill();
      c.fillStyle='rgba(255,220,160,.9)';c.beginPath();c.ellipse(lx,cy*.3,30*S,4*S,0,0,6.283);c.fill();
      c.fillStyle='#fff6dc';c.beginPath();c.ellipse(lx,cy*.3+2*S,10*S,5*S,0,0,Math.PI);c.fill();
      // 周辺減光
      [vig,c]=mkCanvas(W,H);
      gr=c.createRadialGradient(W/2,H*.55,Math.min(W,H)*.32,W/2,H*.55,Math.max(W,H)*.78);
      gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(4,2,4,.7)');
      c.fillStyle=gr;c.fillRect(0,0,W,H);
    }
    function buildMorning(){
      let c,gr;[morningBg,c]=mkCanvas(W,H);
      gr=c.createLinearGradient(0,0,0,H*.5);gr.addColorStop(0,'#7fb8e8');gr.addColorStop(.6,'#bfe0f2');gr.addColorStop(1,'#fbe6c8');
      c.fillStyle=gr;c.fillRect(0,0,W,H);
      gr=c.createRadialGradient(W*.82,H*.08,4,W*.82,H*.08,W*.7);gr.addColorStop(0,'rgba(255,250,220,.95)');gr.addColorStop(.12,'rgba(255,240,190,.5)');gr.addColorStop(1,'rgba(255,240,200,0)');
      c.fillStyle=gr;c.fillRect(0,0,W,H);
      for(let i=0;i<5;i++){const x=rnd(0,W),y=H*rnd(.05,.2),r=rnd(30,60)*S;c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(x,y,r,r*.32,0,0,6.283);c.ellipse(x+r*.4,y-r*.15,r*.5,r*.3,0,0,6.283);c.fill();}
      c.fillStyle='#8cc07a';c.beginPath();c.moveTo(0,H*.36);for(let x=0;x<=W;x+=W/6)c.quadraticCurveTo(x+W/12,H*(.3+Math.random()*.04),x+W/6,H*.35);c.lineTo(W,H);c.lineTo(0,H);c.fill();
      for(let i=0;i<7;i++){const x=W*(i/6)+rnd(-10,10),y=H*.33;c.fillStyle='#5f9a55';c.beginPath();c.arc(x,y,rnd(14,24)*S,0,6.283);c.fill();c.fillStyle='#6fae62';c.beginPath();c.arc(x-4,y-4,rnd(8,14)*S,0,6.283);c.fill();}
      gr=c.createLinearGradient(0,H*.36,0,H);gr.addColorStop(0,'#9ccf7d');gr.addColorStop(1,'#6fa95a');c.fillStyle=gr;c.fillRect(0,H*.36,W,H*.64);
      for(let i=0;i<260;i++){c.strokeStyle=Math.random()<.5?'rgba(60,120,50,.35)':'rgba(200,240,160,.3)';c.lineWidth=1;const x=rnd(0,W),y=rnd(H*.38,H);c.beginPath();c.moveTo(x,y);c.lineTo(x+rnd(-2,2),y-rnd(3,7)*S);c.stroke();}
      for(let i=0;i<14;i++){const x=rnd(0,W),y=rnd(H*.4,H);c.fillStyle=Math.random()<.5?'#fff':'#ffe36a';for(let k=0;k<5;k++){const a=k/5*6.283;c.beginPath();c.arc(x+Math.cos(a)*2.2*S,y+Math.sin(a)*2.2*S,1.6*S,0,6.283);c.fill();}c.fillStyle='#f0a030';c.beginPath();c.arc(x,y,1.3*S,0,6.283);c.fill();}
      // レジャーシート
      const sx=L.bx-26*S,sy=L.by-20*S,sw=L.BW+52*S,sh=H-sy+30;
      c.save();c.translate(W/2,sy+sh/2);c.rotate(-.03);c.translate(-W/2,-(sy+sh/2));
      c.fillStyle='rgba(0,0,0,.18)';c.fillRect(sx+6,sy+8,sw,sh);
      const cs=22*S;
      for(let y=sy;y<sy+sh;y+=cs)for(let x=sx;x<sx+sw;x+=cs){const i=Math.round((x-sx)/cs)+Math.round((y-sy)/cs);c.fillStyle=i%2?'#f4f0ea':'#e65a5a';c.fillRect(x,y,Math.min(cs,sx+sw-x),Math.min(cs,sy+sh-y));}
      c.fillStyle='rgba(255,255,255,.12)';c.fillRect(sx,sy,sw,sh);
      c.restore();
      gr=c.createLinearGradient(0,0,W,H);gr.addColorStop(0,'rgba(255,240,200,.18)');gr.addColorStop(1,'rgba(255,200,150,0)');c.fillStyle=gr;c.fillRect(0,0,W,H);
    }
    function getWood(w,h){
      const key=Math.round(w)+'x'+Math.round(h);
      if(woodKey===key)return woodTex;
      let c;[woodTex,c]=mkCanvas(w,h);woodKey=key;
      const gr=c.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#d4a36a');gr.addColorStop(1,'#b8834c');
      c.fillStyle=gr;c.fillRect(0,0,w,h);
      for(let i=0;i<34;i++){const y=rnd(0,h),a=rnd(.05,.16);c.strokeStyle=`rgba(110,62,26,${a})`;c.lineWidth=rnd(.6,2);c.beginPath();c.moveTo(0,y);
        for(let x=0;x<=w;x+=w/8)c.lineTo(x,y+Math.sin(x*.03+i)*rnd(1,4));c.stroke();}
      for(let i=0;i<3;i++){const x=rnd(w*.15,w*.85),y=rnd(h*.2,h*.8);c.strokeStyle='rgba(100,55,20,.2)';for(let k=1;k<5;k++){c.beginPath();c.ellipse(x,y,k*5,k*2,0,0,6.283);c.stroke();}}
      for(let i=0;i<40;i++){c.strokeStyle='rgba(80,40,10,.12)';c.lineWidth=.6;const x=rnd(0,w),y=rnd(0,h);c.beginPath();c.moveTo(x,y);c.lineTo(x+rnd(-14,14),y+rnd(-2,2));c.stroke();}
      return woodTex;
    }

    // ── 粒子・表示 ──
    function emit(k,x,y,vx,vy,life,sz,col){const p=P[pIdx];pIdx=(pIdx+1)%P.length;p.on=true;p.k=k;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.life=p.max=life;p.sz=sz;p.col=col||'#fff';p.rot=rnd(0,6);}
    const accs={};
    function every(key,rate,dt,fn){accs[key]=(accs[key]||0)+rate*dt;while(accs[key]>=1){accs[key]--;fn();}}
    function steam(x,y,spread,n){for(let i=0;i<(n||1);i++)emit('steam',x+rnd(-spread,spread),y+rnd(-4,4),rnd(-8,8),rnd(-34,-20)*S,rnd(1.2,2),rnd(8,14)*S);}
    function oil(x,y,n){for(let i=0;i<n;i++){const a=rnd(-2.6,-.5);const v=rnd(60,170)*S;emit('oil',x,y,Math.cos(a)*v,Math.sin(a)*v,rnd(.22,.45),rnd(.8,1.7)*S,Math.random()<.5?'#fff2b0':'#ffd070');}}
    function sparkle(x,y,n,col){for(let i=0;i<n;i++){const a=rnd(0,6.283),v=rnd(50,170)*S;emit('spark',x,y,Math.cos(a)*v,Math.sin(a)*v-30,rnd(.45,.9),rnd(2.5,5)*S,col||(Math.random()<.5?'#ffe28a':'#fff8e0'));}}
    function pop(text,x,y,col,sz,dur,sub){pops.push({text,x,y,col,sz:sz||22,t:0,dur:dur||.95,sub});if(pops.length>14)pops.shift();}
    function updParticles(dt){
      for(const p of P){if(!p.on)continue;p.life-=dt;if(p.life<=0){p.on=false;continue;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.k==='oil'){p.vy+=520*S*dt;}
        else if(p.k==='steam'||p.k==='smoke'){p.vx+=Math.sin(T*2+p.rot)*10*dt;p.vy*=.995;p.sz+=dt*16*S;}
        else if(p.k==='spark'){p.vy+=90*S*dt;p.vx*=.97;p.rot+=dt*5;}
        else if(p.k==='drop'){p.vy+=420*S*dt;}
        else if(p.k==='heart'){p.vy*=.98;p.vx+=Math.sin(T*3+p.rot)*12*dt;}
      }
      for(let i=pops.length-1;i>=0;i--){pops[i].t+=dt;if(pops[i].t>=pops[i].dur)pops.splice(i,1);}
    }
    function drawParticles(){
      for(const p of P){if(!p.on||(p.k!=='steam'&&p.k!=='smoke'))continue;
        const a=p.life/p.max;g.globalAlpha=Math.min(1,a*(1-a)*4)*(p.k==='steam'?.32:.42);
        g.drawImage(p.k==='steam'?steamSpr:smokeSpr,p.x-p.sz,p.y-p.sz,p.sz*2,p.sz*2);}
      g.globalAlpha=1;
      for(const p of P){if(!p.on||p.k!=='drop')continue;g.fillStyle=p.col;g.globalAlpha=Math.min(1,p.life/p.max*2);g.beginPath();g.arc(p.x,p.y,p.sz,0,6.283);g.fill();}
      for(const p of P){if(!p.on||p.k!=='heart')continue;const a=p.life/p.max;g.globalAlpha=Math.min(1,a*2.5);drawHeart(p.x,p.y,p.sz,p.col);}
      g.globalAlpha=1;
      g.globalCompositeOperation='lighter';
      for(const p of P){if(!p.on)continue;const a=p.life/p.max;
        if(p.k==='oil'){g.globalAlpha=a;g.fillStyle=p.col;g.beginPath();g.arc(p.x,p.y,p.sz,0,6.283);g.fill();g.globalAlpha=a*.5;g.drawImage(glowSpr,p.x-p.sz*4,p.y-p.sz*4,p.sz*8,p.sz*8);}
        else if(p.k==='spark'){g.globalAlpha=Math.min(1,a*1.6);drawStar(p.x,p.y,p.sz*(.5+a*.5),p.rot,p.col);}
      }
      g.globalAlpha=1;g.globalCompositeOperation='source-over';
    }
    function drawStar(x,y,r,rot,col){g.save();g.translate(x,y);g.rotate(rot);g.fillStyle=col;g.beginPath();
      for(let i=0;i<8;i++){const rr2=i%2?r*.28:r;const a=i/8*6.283;g.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}g.closePath();g.fill();g.restore();}
    function drawHeart(x,y,s,col){g.fillStyle=col;g.beginPath();g.moveTo(x,y+s*.35);g.bezierCurveTo(x-s*1.1,y-s*.35,x-s*.45,y-s*1.05,x,y-s*.45);g.bezierCurveTo(x+s*.45,y-s*1.05,x+s*1.1,y-s*.35,x,y+s*.35);g.fill();}
    function drawPops(){
      for(const p of pops){
        const k=p.t/p.dur, sc=p.t<.16?eback(p.t/.16):1, a=k>.7?1-(k-.7)/.3:1;
        g.save();g.globalAlpha=a;g.translate(p.x,p.y-k*22*S);g.scale(sc,sc);
        g.save();g.globalCompositeOperation='lighter';g.globalAlpha=a*.55;const gw=p.sz*S*4.2;g.drawImage(glowSpr,-gw,-gw*.45,gw*2,gw*.9);g.restore();
        txtO(p.text,0,0,p.sz*S,p.col,'rgba(30,12,8,.9)',4*S);
        if(p.sub)txtO(p.sub,0,p.sz*S*.85,11*S,'#fff4dc','rgba(30,12,8,.85)',3*S);
        g.restore();
      }
    }

    // ── 判定 ──
    function zones(c,pw,gw,k){k=k||1;return {pa:c-pw*k/2,pb:c+pw*k/2,ga:c-gw*k/2,gb:c+gw*k/2};}
    function setGauge(label,rampSt,z,right){Object.assign(gauge,{show:true,label,ramp:rampSt,v:0,lockV:-1,lockT:0,right:right||''},z);}
    function zq(v){return v>=gauge.pa&&v<=gauge.pb?'P':v>=gauge.ga&&v<=gauge.gb?'G':'M';}
    function judge(key,q,x,y,sub,score){
      rec[key].push(score!==undefined?score:QV[q]);cnt[q]++;
      pop(QL[q],x,y,QC[q],q==='P'?26:22,q==='P'?1.1:.9,sub);
      if(q==='P'){SND.perfect();hitstop=.11;shake=Math.max(shake,5*S);flash=.35;flashCol='255,236,170';sparkle(x,y,16);}
      else if(q==='G'){SND.good();sparkle(x,y,6,'#bff8ee');}
      else{SND.miss();shake=Math.max(shake,3*S);flash=.2;flashCol='255,90,110';}
    }
    function lockGauge(q){gauge.lockV=gauge.v;gauge.lockT=.6;gauge.lockQ=q;}

    // ── 流れ ──
    function go(p){
      ph=p;pt=0;
      if(p==='egg_heat'){
        egg.layers=[];egg.rh=0;egg.ry=0;egg.sheet=false;egg.c=0;
        setGauge('火加減',R_HEAT,zones(.66,.12,.36,DISH[0].diff));hint='ゲージが金色の所でタップ！ 油を温める';
      }else if(p==='egg_pour'){egg.sheet=true;egg.pour=0;egg.c=0;gauge.show=false;SND.pour();}
      else if(p==='egg_cook'){setGauge('焼き加減',EGGR,zones(.68,.14,.4,DISH[0].diff),(egg.layers.length+1)+'/3巻');hint='半熟のうちに！ 金色でタップして巻く';}
      else if(p==='egg_roll'){egg.r0y=egg.rh?egg.ry:0;egg.r0h=egg.rh||.05;SND.flip();}
      else if(p==='egg_finish'){gauge.show=false;hint='';sparkle(L.cx,L.CY,22);pop(V.egg.name+' 完成！',L.cx,L.CY+L.PH*.3,'#ffe9a8',20,1.4);SND.se('ach');}
      else if(p==='tako_cut'){tako.tm=rnd(.42,.56);setGauge('',null,{},'');gauge.show=false;hint=isKani?'包丁が点線に重なったらタップ（両端に切れ目）':'包丁が点線に重なったらタップ（足を作る）';}
      else if(p==='tako_sear'){
        const rates=[.3,.37,.45].sort(()=>Math.random()-.5);
        const pos=[[-.46,-.12,-.3],[0,.26,.06],[.46,-.12,.32]];
        tako.s=pos.map((q,i)=>({fx:q[0],fy:q[1],rot:q[2],b:0,rate:rates[i]*(DISH[1].diff<1?1.1:1),done:false,lift:0,q:'',bf:0}));
        const z=zones(.71,.15,.38,DISH[1].diff);tako.z=z;
        hint='きつね色になった'+sausName+'からタップで取り出す';tako.endT=-1;
      }
      else if(p==='tako_finish'){hint='';sparkle(L.cx,L.CY,20);pop(V.tako.name+' 完成！',L.cx,L.CY+L.PR*.62,'#ffd0b0',20,1.4);SND.se('ach');}
      else if(p==='oni_shape'){
        oni.beats=[];const bp=BEAT;for(let i=0;i<6;i++)oni.beats.push({t:1.25+i*bp,q:''});
        oni.shapeP=0;oni.shapeQ=[];gauge.show=false;hint='輪がごはんに重なる瞬間にタップ（にぎにぎ）';
      }
      else if(p==='oni_brush'){oni.cov=0;oni.cells=null;oni.strokes=[];oni.paint=null;oni.brushing=false;oni.last=null;
        setGauge(isMiso?'みそ':'タレ',R_SOY,{pa:.86,pb:1.01,ga:.6,gb:1.01},'');hint='ドラッグで'+(isMiso?'みそ':'醤油ダレ')+'を全体に塗る（Space長押しでも）';}
      else if(p==='oni_grill'){oni.side=0;oni.c=0;setGauge('焼き色',GRILLR,zones(.69,.13,.36,DISH[2].diff),'表');hint='香ばしい焼き色でタップ → 裏返す';}
      else if(p==='oni_flip'){SND.flip();}
      else if(p==='oni_finish'){gauge.show=false;hint='';sparkle(L.cx,L.CY,22);pop(V.oni.name+' 完成！',L.cx,L.CY+L.R*1.25,'#ffd8a0',20,1.4);SND.se('ach');}
      else if(p==='plate'){initPlate();gauge.show=false;hint=tutorialPlate?'おかずを同じ形の仕切りへドラッグ！':'仕切りの真ん中に置くほどきれい';}
      else if(p==='plate_done'){hint='';SND.se('ach');}
      else if(p==='morning'){hint='';gauge.show=false;}
      else if(p==='final'){hint='';}
    }
    let tutorialPlate=cd.plays===0;
    function startDish(i){
      startWipe(()=>{
        dishIdx=i;banner={d:DISH[i],t:0,dur:1.55};
        go(['egg_heat','tako_cut','oni_shape','plate'][i]);
        if(i>0)tutorial=false;
      });
    }
    function startWipe(mid){if(wipe)return;wipe={t:0,mid,fired:false};SND.wipe();}
    const WIPE_IN=.38;

    // ── 入力 ──
    function acceptsTap(){return ['egg_heat','egg_cook','tako_cut','oni_shape','oni_grill'].includes(ph);}
    function act(){
      if(wipe)return;
      if(banner){if(banner.t>.3)banner.t=Math.max(banner.t,banner.dur-.18);return;}
      if(hitstop>0){if(acceptsTap())buf=.2;return;}
      switch(ph){
        case 'title':SND.se('decide');SND.pon();ph='story';story.i=0;story.t=0;break;
        case 'story':{
          const line=story.lines[story.i];
          if(story.t*28<line.text.length){story.t=99;break;}
          SND.tap();story.i++;story.t=0;
          if(story.i>=story.lines.length){story.i=story.lines.length-1;startDish(0);ph='intro_wait';}
          break;}
        case 'egg_heat':{
          if(pt<.2)return;
          const q=zq(gauge.v);lockGauge(q);egg.heatV=gauge.v;
          egg.heat=.25+gauge.v*.85;egg.heatF=gauge.v<gauge.ga?.85:gauge.v>gauge.gb?1.3:1;
          judge('egg',q,L.cx,L.CY-L.PH*.2,q==='P'?'ちょうどいい油の音':gauge.v<.5?'ぬるい…':gauge.v>.8?'熱すぎ！':'');
          oil(L.cx,L.CY,10);go('egg_pour');break;}
        case 'egg_cook':{
          if(pt<.12)return;
          const q=zq(egg.c);lockGauge(q);egg.layers.push(egg.c);
          judge('egg',q,L.cx,L.CY-L.PH*.25,q==='P'?'ふるふる半熟':egg.c<.5?'まだ生…':'焼きすぎ');
          go('egg_roll');break;}
        case 'tako_cut':{
          if(pt<.3)return;
          const d=Math.abs(tako.kx-tako.tm);
          const k=DISH[1].diff,q=d<.035*k?'P':d<.085*k?'G':'M';
          tako.cuts.push({q,frac:tako.kx});
          SND.chop();
          judge('tako',q,L.cx,L.CY-L.BDH*.3,q==='P'?'ぴったり':tako.kx<tako.tm?'深すぎ':'浅い');
          go('tako_chop');break;}
        case 'tako_sear':{
          let best=null;for(const s of tako.s)if(!s.done&&(!best||s.b>best.b))best=s;
          if(best)pickSaus(best);break;}
        case 'oni_shape':tapBeat();break;
        case 'oni_grill':{
          if(pt<.15)return;
          const q=zq(oni.c);lockGauge(q);oni.cs[oni.side]=oni.c;
          judge('oni',q,L.cx,L.CY-L.R*1.4,q==='P'?'こんがり！':oni.c<.6?'白っぽい':'焦げた…');
          if(oni.side===0)go('oni_flip');else go('oni_finish');
          break;}
        case 'plate':autoPlace();break;
        case 'morning':if(pt>1.6){SND.tap();go('final');}else if(pt>.4)pt=Math.max(pt,1.6);break;
        case 'final':if(pt>.9){SND.se('decide');finished=true;mg.end('done');}break;
      }
    }
    function localXY(e){const r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();
      try{cv.setPointerCapture(e.pointerId);}catch(_){}
      const [x,y]=localXY(e);
      if(!wipe&&!banner&&hitstop<=0){
        if(ph==='tako_sear'){
          let best=null,bd=1e9;
          for(const s of tako.s){if(s.done)continue;const p=sausPos(s);const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best=s;}}
          if(best&&bd<Math.max(44*S,L.PR*.36))pickSaus(best);
          return;
        }
        if(ph==='oni_brush'){oni.brushing=true;oni.last=null;brushAt(x,y);return;}
        if(ph==='plate'){grabItem(x,y,e.pointerId);return;}
      }
      act();
    });
    cv.addEventListener('pointermove',e=>{
      const [x,y]=localXY(e);
      if(ph==='oni_brush'&&oni.brushing)brushAt(x,y);
      if(ph==='plate'&&plate.drag&&plate.drag.id===e.pointerId){const it=plate.drag.it;it.x=x+plate.drag.ox;it.y=y+plate.drag.oy;}
    });
    const pUp=e=>{
      if(ph==='oni_brush'){oni.brushing=false;oni.last=null;}
      if(plate.drag&&plate.drag.id===e.pointerId)dropItem();
    };
    cv.addEventListener('pointerup',pUp);cv.addEventListener('pointercancel',pUp);
    mg.onKey(e=>{
      const dn=e.type==='keydown',k=e.key;
      if(k===' '||k==='Enter'){
        e.preventDefault();
        if(ph==='oni_brush'){oni.auto=dn;if(!dn)oni.last=null;return;}
        if(dn&&!e.repeat)act();
        return;
      }
      if(dn&&!e.repeat&&ph==='tako_sear'&&'123'.includes(k)){const s=tako.s[+k-1];if(s&&!s.done)pickSaus(s);}
    });

    // ── 卵焼き ──
    function eggRect(){const w=L.PW,h=L.PH;return {x:L.cx-w/2+11,y:L.CY-h/2+11,w:w-22,h:h-22};}
    function updEgg(dt){
      const r=eggRect();
      if(ph==='egg_heat'){
        gauge.v=tri(pt*(tutorial?.62:.9)*SPD+.05);
        egg.heat=.25+gauge.v*.85;
        every('eh',4+gauge.v*14,dt,()=>oil(r.x+rnd(0,r.w),r.y+rnd(0,r.h),1));
        if(gauge.v>.85)every('es',6,dt,()=>emit('smoke',r.x+rnd(0,r.w),r.y+rnd(0,r.h),rnd(-6,6),-30*S,1.4,10*S));
        SND.sizzle(.15+gauge.v*.35);
      }else if(ph==='egg_pour'){
        egg.pour=eo(pt/.42);
        if(pt<.3)every('ep',60,dt,()=>oil(r.x+r.w*rnd(.2,.8),r.y+r.h*rnd(.3,.8),1));
        SND.sizzle(.9);
        if(pt>=.42)go('egg_cook');
      }else if(ph==='egg_cook'){
        egg.c+=dt*SPD*(.43+.05*egg.layers.length)*egg.heatF*(isDashi?1.12:1)*(tutorial&&egg.layers.length===0?.8:1);
        gauge.v=egg.c;
        const top=egg.rh?r.y+(egg.ry+egg.rh)*r.h:r.y;
        every('ec',5+egg.c*16,dt,()=>steam(L.cx,top+(r.y+r.h-top)*rnd(.2,.8),r.w*.35,1));
        every('eo',10+egg.heat*14,dt,()=>oil(r.x+rnd(0,r.w),r.y+r.h*rnd(.1,.95),1));
        if(egg.c>.9)every('eb',8,dt,()=>emit('smoke',L.cx+rnd(-r.w*.3,r.w*.3),top+20,0,-30*S,1.2,9*S));
        SND.sizzle(.45+egg.c*.4);
        if(egg.c>=1){lockGauge('M');egg.layers.push(1);judge('egg','M',L.cx,L.CY-L.PH*.25,'焦げちゃった');go('egg_roll');}
      }else if(ph==='egg_roll'){
        const k=eio(pt/.5),n=egg.layers.length;
        const th=.17+.075*n;
        egg.rh=lerp(egg.r0h,th,k);egg.ry=lerp(egg.r0y,1-th,k);egg.rot+=dt*14;
        SND.sizzle(.35);
        if(pt>.1&&pt<.45)every('er',30,dt,()=>steam(L.cx,r.y+(egg.ry+egg.rh)*r.h,r.w*.3,1));
        if(pt>=.5){egg.sheet=false;if(n<3)go('egg_slide');else go('egg_finish');}
      }else if(ph==='egg_slide'){
        const k=eio(pt/.32);egg.ry=lerp(1-egg.rh,0,k);
        SND.sizzle(.25);
        if(pt>=.32)go('egg_pour');
      }else if(ph==='egg_finish'){
        SND.sizzle(.15);
        every('ef',8,dt,()=>steam(L.cx,r.y+r.h*.85,r.w*.3,1));
        if(pt>1.5){SND.sizzle(0);startDish(1);ph='wait';}
      }
    }
    function drawFlameRing(x,y,rx,ry,heat){
      g.save();g.globalCompositeOperation='lighter';
      const R=Math.max(rx,ry)*1.3;
      const gr=g.createRadialGradient(x,y,R*.35,x,y,R);gr.addColorStop(0,`rgba(255,150,50,${.28*heat})`);gr.addColorStop(.7,`rgba(70,110,255,${.2*heat})`);gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.fillRect(x-R,y-R,R*2,R*2);
      g.lineCap='round';
      const n=26;
      for(let i=0;i<n;i++){
        const a=i/n*6.283;
        const len=(5+heat*15)*S*(.7+.3*Math.sin(T*15+i*2.3));
        const px=x+Math.cos(a)*rx,py=y+Math.sin(a)*ry,tx=px+Math.cos(a)*len,ty=py+Math.sin(a)*len;
        g.strokeStyle=`rgba(80,130,255,${.45+heat*.2})`;g.lineWidth=5*S;g.beginPath();g.moveTo(px,py);g.lineTo(tx,ty);g.stroke();
        g.strokeStyle=`rgba(200,225,255,${.5})`;g.lineWidth=2*S;g.beginPath();g.moveTo(px,py);g.lineTo(lerp(px,tx,.55),lerp(py,ty,.55));g.stroke();
        if(heat>.75){g.strokeStyle=`rgba(255,160,70,${(heat-.75)*1.4})`;g.lineWidth=3*S;g.beginPath();g.moveTo(lerp(px,tx,.6),lerp(py,ty,.6));g.lineTo(tx+Math.cos(a)*4*S,ty+Math.sin(a)*4*S);g.stroke();}
      }
      g.restore();
    }
    function drawSqPan(x,y,w,h){
      const hw=w*.13,hl=h*.24;
      g.fillStyle='#24262c';rr(g,x-hw*.3,y+h/2-8,hw*.6,hl*.4,3);g.fill();
      let gr=g.createLinearGradient(x-hw/2,0,x+hw/2,0);gr.addColorStop(0,'#3d2414');gr.addColorStop(.45,'#8a5a34');gr.addColorStop(1,'#3a2012');
      g.fillStyle=gr;rr(g,x-hw/2,y+h/2+hl*.28,hw,hl*.72,hw*.45);g.fill();
      g.fillStyle='rgba(255,220,180,.18)';g.fillRect(x-hw*.15,y+h/2+hl*.34,hw*.12,hl*.55);
      g.fillStyle='rgba(0,0,0,.5)';rr(g,x-w/2+7,y-h/2+11,w,h,12);g.fill();
      gr=g.createLinearGradient(x-w/2,y-h/2,x+w/2,y+h/2);gr.addColorStop(0,'#55565f');gr.addColorStop(.5,'#2a2a31');gr.addColorStop(1,'#43444e');
      g.fillStyle=gr;rr(g,x-w/2,y-h/2,w,h,12);g.fill();
      gr=g.createRadialGradient(x-w*.15,y-h*.2,4,x,y,w*.75);gr.addColorStop(0,'#2e2b33');gr.addColorStop(1,'#121015');
      g.fillStyle=gr;rr(g,x-w/2+9,y-h/2+9,w-18,h-18,7);g.fill();
      g.strokeStyle='rgba(255,215,170,.3)';g.lineWidth=1.2;rr(g,x-w/2+.5,y-h/2+.5,w-1,h-1,12);g.stroke();
      g.strokeStyle='rgba(0,0,0,.5)';rr(g,x-w/2+9,y-h/2+9,w-18,h-18,7);g.stroke();
    }
    function drawEggScene(){
      const x=L.cx,y=L.CY,w=L.PW,h=L.PH,r=eggRect();
      drawFlameRing(x,y,w*.5,h*.47,egg.heat);
      drawSqPan(x,y,w,h);
      g.save();rr(g,r.x,r.y,r.w,r.h,6);g.clip();
      // 油の照り
      const oilA=ph==='egg_heat'?.12+gauge.v*.2:.08;
      let gr=g.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
      const sh=(T*.15)%1;gr.addColorStop(clamp(sh-.15,0,1),'rgba(255,230,160,0)');gr.addColorStop(sh,`rgba(255,230,160,${oilA})`);gr.addColorStop(clamp(sh+.15,0,1),'rgba(255,230,160,0)');
      g.fillStyle=gr;g.fillRect(r.x,r.y,r.w,r.h);
      g.fillStyle='rgba(255,240,210,.07)';g.beginPath();g.ellipse(r.x+r.w*.32,r.y+r.h*.25,r.w*.22,r.h*.08,-.5,0,6.283);g.fill();
      // 生地
      if(egg.sheet){
        const top=egg.rh?r.y+(egg.ry+egg.rh*.55)*r.h:r.y;
        const sh2=r.y+r.h-top;
        g.save();
        if(ph==='egg_pour'){const R=Math.hypot(r.w,sh2)*egg.pour;g.beginPath();g.arc(r.x+r.w*.5,top+sh2*.4,R,0,6.283);g.clip();}
        drawEggSheet(r.x,top,r.w,sh2,egg.c);
        g.restore();
      }
      if(egg.rh>0){
        const cc=egg.layers.length?avg(egg.layers):egg.c;
        drawEggRoll(r.x+4,r.y+egg.ry*r.h,r.w-8,egg.rh*r.h,cc,egg.rot,egg.layers.length);
      }
      g.restore();
      // 菜箸
      if(ph==='egg_roll'||ph==='egg_slide'){
        const yy=r.y+(egg.ry+egg.rh)*r.h;
        drawChopsticks(x+r.w*.18,yy-4*S,-.5);
      }else if(ph==='egg_cook'){drawChopsticks(x+r.w*.62,r.y-10*S,-.9+Math.sin(T*2)*.03);}
    }
    function drawChopsticks(x,y,a){
      g.save();g.translate(x,y);g.rotate(a);
      for(let i=0;i<2;i++){g.save();g.translate(0,i*5*S);g.rotate(i*.05);
        g.fillStyle='rgba(0,0,0,.35)';g.fillRect(4,5,110*S,3.2*S);
        const gr=g.createLinearGradient(0,0,0,3*S);gr.addColorStop(0,'#e8c99a');gr.addColorStop(1,'#a8804e');
        g.fillStyle=gr;g.beginPath();g.moveTo(0,.6*S);g.lineTo(110*S,0);g.lineTo(110*S,3.4*S);g.lineTo(0,2.4*S);g.fill();
        g.fillStyle='#7a3a2a';g.fillRect(80*S,0,30*S,3.4*S);g.restore();}
      g.restore();
    }
    function drawEggSheet(x,y,w,h,c){
      if(h<=1)return;
      const col=rampA(EGGR,c);
      let gr=g.createLinearGradient(x,y,x,y+h);gr.addColorStop(0,rgb(tint(col,.08)));gr.addColorStop(1,rgb(shade(col,.94)));
      gr=g.createRadialGradient(x+w*.45,y+h*.45,4,x+w*.5,y+h*.5,Math.max(w,h)*.75);gr.addColorStop(0,rgb(tint(col,.12)));gr.addColorStop(.7,rgb(col));gr.addColorStop(1,rgb(shade(col,.86)));
      g.fillStyle=gr;
      // 端は波打つ（生のうち）
      const wob=c<.45?(.45-c)*6*S:0;
      g.beginPath();g.moveTo(x,y+wob);
      for(let i=0;i<=10;i++)g.lineTo(x+w*i/10,y+Math.sin(T*3+i*1.7)*wob+wob);
      g.lineTo(x+w,y+h);g.lineTo(x,y+h);g.closePath();g.fill();
      // 縁から固まる
      if(c>.15){g.strokeStyle=rgb(tint(col,.25),clamp((c-.15)*1.5,0,.5));g.lineWidth=5*S;g.strokeRect(x+2,y+3,w-4,h-5);}
      // 焼き色のムラ
      if(c>.62){for(const s of SPOT){g.fillStyle=rgb(shade(col,.72),clamp((c-.62)*2*s.k,0,.6));g.beginPath();g.ellipse(x+s.x*w,y+s.y*h,s.r*S*2,s.r*S*1.3,0,0,6.283);g.fill();}}
      // 気泡
      if(c<.62){for(const b of BUB){const ph2=(T*1.4+b.p)%2.4;if(ph2>1.2)continue;const rr2=b.r*S*(.5+ph2)*1.7;const bx=x+b.x*w,by=y+6+b.y*(h-12),al=(.62-c)*1.6*(1-ph2/1.2);g.fillStyle=rgb(shade(col,.9),al*.5);g.beginPath();g.arc(bx,by,rr2,0,6.283);g.fill();g.strokeStyle=`rgba(255,250,225,${al})`;g.lineWidth=1.2;g.stroke();g.fillStyle=`rgba(255,255,255,${al})`;g.beginPath();g.arc(bx-rr2*.35,by-rr2*.35,rr2*.3,0,6.283);g.fill();}}
      // 照り
      gr=g.createLinearGradient(x,y,x+w,y+h);gr.addColorStop(0,`rgba(255,255,255,${.28*(1-c)+.05})`);gr.addColorStop(.35,'rgba(255,255,255,0)');gr.addColorStop(.7,`rgba(255,255,240,${.12*(1-c)})`);gr.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=gr;g.fillRect(x,y,w,h);
      g.fillStyle=`rgba(255,255,255,${.35*(1-c)})`;g.beginPath();g.ellipse(x+w*.28,y+h*.3,w*.14,h*.05,-.3,0,6.283);g.fill();
    }
    function drawEggRoll(x,y,w,h,c,rot,n){
      const col=rampA(EGGR,clamp(c*.95+.04,0,1.1));
      g.fillStyle='rgba(0,0,0,.35)';rr(g,x+3,y+5,w,h,h*.45);g.fill();
      const gr=g.createLinearGradient(0,y,0,y+h);
      gr.addColorStop(0,rgb(shade(col,.78)));gr.addColorStop(.32,rgb(tint(col,.18)));gr.addColorStop(.55,rgb(col));gr.addColorStop(1,rgb(shade(col,.7)));
      g.fillStyle=gr;rr(g,x,y,w,h,h*.45);g.fill();
      g.save();rr(g,x,y,w,h,h*.45);g.clip();
      g.strokeStyle=rgb(shade(col,.72),.55);g.lineWidth=1.3*S;
      for(let k=0;k<4;k++){const f=((k/4+rot*.06)%1);const yy=y+h*f;g.beginPath();g.moveTo(x+4,yy);g.quadraticCurveTo(x+w/2,yy+h*.12,x+w-4,yy);g.stroke();}
      if(c>.6)for(const s of SPOT){g.fillStyle=rgb(shade(col,.7),clamp((c-.6)*1.8*s.k,0,.6));g.beginPath();g.arc(x+s.x*w,y+s.y*h,s.r*S,0,6.283);g.fill();}
      g.fillStyle='rgba(255,255,240,.32)';g.fillRect(x+w*.06,y+h*.18,w*.88,h*.1);
      g.restore();
      // 断面（端）
      g.fillStyle=rgb(tint(col,.3));g.beginPath();g.ellipse(x+3,y+h/2,3*S,h*.42,0,0,6.283);g.fill();
    }

    // ── ウインナー ──
    function boardRect(){const w=L.BDW,h=L.BDH;return {x:L.cx-w/2,y:L.CY-h/2,w,h};}
    function sausLine(){const b=boardRect();const len=b.w*.62,th=len*.21;return {len,th,x0:L.cx-len/2,y:L.CY};}
    function updTako(dt){
      if(ph==='tako_cut'){
        if(pt>.3)tako.kx=.18+.84*tri((pt-.3)*(.85+tako.i*.12)*SPD);
      }else if(ph==='tako_chop'){
        if(pt<.1)for(let i=0;i<2;i++){const s=sausLine();emit('drop',s.x0+s.len*tako.kx,s.y,rnd(-80,80)*S,rnd(-140,-60)*S,.4,1.4*S,'#f3b0a8');}
        if(pt>=.75){tako.i++;if(tako.i<3)go('tako_cut');else go('tako_sear');}
      }else if(ph==='tako_sear'){
        let live=0;
        for(const s of tako.s){
          if(s.done){s.lift+=dt;continue;}
          live++;
          s.b+=dt*s.rate*SPD;
          const p=sausPos(s);
          every('so'+s.fx,6+s.b*10,dt,()=>oil(p.x+rnd(-14,14)*S,p.y+rnd(-14,14)*S,1));
          if(s.b>.5)every('ss'+s.fx,3+s.b*5,dt,()=>steam(p.x,p.y-10*S,8*S,1));
          if(s.b>.92)every('sk'+s.fx,6,dt,()=>emit('smoke',p.x,p.y,0,-30*S,1.2,8*S));
          if(s.b>=1.02){pickSaus(s,true);}
        }
        SND.sizzle(live?.5+live*.12:.1);
        if(!live){if(tako.endT<0)tako.endT=pt;if(pt-tako.endT>.75){go('tako_finish');}}
      }else if(ph==='tako_finish'){
        SND.sizzle(.1);
        if(pt>1.6){SND.sizzle(0);startDish(2);ph='wait';}
      }
    }
    function sausPos(s){return {x:L.cx+s.fx*L.PR,y:L.CY+s.fy*L.PR-(s.done?eo(s.lift/.45)*40*S:0)};}
    function pickSaus(s,auto){
      if(s.done)return;
      s.done=true;s.lift=0;s.bf=s.b;
      const z=tako.z,q=auto?'M':s.b>=z.pa&&s.b<=z.pb?'P':s.b>=z.ga&&s.b<=z.gb?'G':'M';
      s.q=q;const p=sausPos(s);
      judge('tako',q,p.x,p.y-30*S,q==='P'?'きつね色！':auto||s.b>z.gb?'焦げた…':'まだ白い');
      SND.flip();oil(p.x,p.y,8);
    }
    function drawSausage(x,y,len,rot,b,frac,curl,eyes,legsN){
      // frac: 切れ目の位置（0〜1、小さいほど足が長い）
      g.save();g.translate(x,y);g.rotate(rot);
      const col=rampA(R_SAUS,b),dk=shade(col,.72),lt=tint(col,.35);
      const w=len*.42,top=-len/2;
      if(isKani){
        // かにさん：両端に切れ目
        const cut=clamp(.5-Math.abs(frac-.5),.1,.4)*len*.9;
        const mid=len-cut*2;
        g.lineCap='round';
        const lw=w/3*.95;
        [-1,1].forEach(sd=>{
          for(let i=0;i<3;i++){const fx=(i-1);const sx=fx*w*.3;
            const ex=sx+fx*(w*.08+curl*w*.24),ey=sd*(len/2-curl*len*.05);
            g.strokeStyle=rgb(dk);g.lineWidth=lw;g.beginPath();g.moveTo(sx,sd*mid*.4);g.quadraticCurveTo(sx+fx*w*.1,sd*(mid*.5+cut*.6),ex,ey);g.stroke();
            g.strokeStyle=rgb(col);g.lineWidth=lw*.6;g.beginPath();g.moveTo(sx-lw*.12,sd*mid*.4);g.quadraticCurveTo(sx+fx*w*.1-lw*.12,sd*(mid*.5+cut*.6),ex-lw*.1,ey);g.stroke();
          }});
        const gr=g.createLinearGradient(-w/2,0,w/2,0);gr.addColorStop(0,rgb(dk));gr.addColorStop(.38,rgb(lt));gr.addColorStop(1,rgb(shade(col,.62)));
        g.fillStyle=gr;rr(g,-w/2,-mid/2-2,w,mid+4,w*.3);g.fill();
        g.fillStyle='rgba(255,255,255,.45)';g.beginPath();g.ellipse(-w*.2,-mid*.15,w*.08,mid*.3,0,0,6.283);g.fill();
        if(eyes){[-1,1].forEach(sd=>{g.fillStyle='#fff';g.beginPath();g.arc(sd*w*.2,-mid*.05,w*.13,0,6.283);g.fill();g.fillStyle='#1a0e0a';g.beginPath();g.arc(sd*w*.2,-mid*.03,w*.075,0,6.283);g.fill();});}
        g.restore();return;
      }
      const legFrac=clamp(1-frac,.22,.72);
      const headH=len*(1-legFrac),split=top+headH;
      const n=legsN||4,lw=w/n*1.02;
      g.lineCap='round';
      for(let i=0;i<n;i++){
        const fx=n>1?(i-(n-1)/2)/((n-1)/2):0;
        const sx=fx*w*.33,ex=sx+fx*(w*.12+curl*w*.42),ey=len/2-curl*len*.12*Math.abs(fx);
        const cx2=sx+fx*w*.04,cy2=(split+ey)/2+len*.06;
        g.strokeStyle=rgb(dk);g.lineWidth=lw;g.beginPath();g.moveTo(sx,split-lw*.4);g.quadraticCurveTo(cx2,cy2,ex,ey);g.stroke();
        g.strokeStyle=rgb(col);g.lineWidth=lw*.62;g.beginPath();g.moveTo(sx-lw*.12,split-lw*.4);g.quadraticCurveTo(cx2-lw*.12,cy2,ex-lw*.1,ey-lw*.05);g.stroke();
        // 切り口は少し明るい
        g.fillStyle=rgb(tint(col,.45),.8);g.beginPath();g.arc(ex,ey,lw*.32,0,6.283);g.fill();
      }
      const gr=g.createLinearGradient(-w/2,0,w/2,0);gr.addColorStop(0,rgb(dk));gr.addColorStop(.35,rgb(lt));gr.addColorStop(.6,rgb(col));gr.addColorStop(1,rgb(shade(col,.6)));
      g.fillStyle=gr;rr(g,-w/2,top,w,headH+lw*.5,w/2);g.fill();
      if(b>.55)for(let i=0;i<6;i++){const s=SPOT[i];g.fillStyle=rgb(shade(col,.62),clamp((b-.55)*1.4*s.k,0,.5));g.beginPath();g.arc((s.x-.5)*w*.8,top+s.y*headH,s.r*S*.8,0,6.283);g.fill();}
      g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(-w*.18,top+headH*.36,w*.08,headH*.24,0,0,6.283);g.fill();
      if(eyes){
        const ey=top+headH*.56;
        [-1,1].forEach(sd=>{g.fillStyle='#1a0e0a';g.beginPath();g.arc(sd*w*.17,ey,w*.07,0,6.283);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(sd*w*.17-w*.02,ey-w*.025,w*.025,0,6.283);g.fill();});
        g.fillStyle='rgba(255,140,150,.5)';[-1,1].forEach(sd=>{g.beginPath();g.ellipse(sd*w*.3,ey+w*.12,w*.07,w*.04,0,0,6.283);g.fill();});
      }
      g.restore();
    }
    function drawBoard(){
      const b=boardRect();
      g.fillStyle='rgba(0,0,0,.45)';rr(g,b.x+6,b.y+10,b.w,b.h,10*S);g.fill();
      g.fillStyle='#7a5530';rr(g,b.x,b.y+4*S,b.w,b.h,10*S);g.fill();
      g.save();rr(g,b.x,b.y,b.w,b.h,10*S);g.clip();g.drawImage(getWood(b.w,b.h),b.x,b.y,b.w,b.h);
      const gr=g.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);gr.addColorStop(0,'rgba(255,230,180,.18)');gr.addColorStop(.5,'rgba(255,230,180,0)');gr.addColorStop(1,'rgba(40,20,0,.22)');g.fillStyle=gr;g.fillRect(b.x,b.y,b.w,b.h);
      g.restore();
      g.strokeStyle='rgba(255,230,190,.35)';g.lineWidth=1;rr(g,b.x+.5,b.y+.5,b.w-1,b.h-1,10*S);g.stroke();
    }
    function drawKnife(x,y,drop){
      const b=boardRect(),bl=b.h*.66,bw=16*S;
      g.save();g.translate(x,y);
      g.fillStyle='rgba(0,0,0,.32)';g.beginPath();g.moveTo(6+drop*6,-bl*.42+9);g.lineTo(6+drop*6+bw,-bl*.42+9);g.lineTo(6+drop*6+bw*.2,bl*.55+9);g.lineTo(6+drop*6,bl*.5+9);g.fill();
      const gr=g.createLinearGradient(0,0,bw,0);gr.addColorStop(0,'#f4f8fc');gr.addColorStop(.3,'#c5ccd6');gr.addColorStop(1,'#7c8592');
      g.fillStyle=gr;g.beginPath();g.moveTo(-1,-bl*.42);g.lineTo(bw,-bl*.42);g.lineTo(bw*.25,bl*.55);g.lineTo(-1,bl*.5);g.closePath();g.fill();
      g.fillStyle='rgba(255,255,255,.9)';g.fillRect(-1.5,-bl*.42,1.6,bl*.92);
      g.fillStyle='rgba(255,255,255,.35)';g.fillRect(bw*.35,-bl*.38,2,bl*.5);
      const hg=g.createLinearGradient(0,0,bw,0);hg.addColorStop(0,'#3b2416');hg.addColorStop(.5,'#5d3b23');hg.addColorStop(1,'#2a170d');
      g.fillStyle=hg;rr(g,-bw*.05,-bl*.42-bl*.4,bw*1.05,bl*.42,4*S);g.fill();
      g.fillStyle='#c8ccd2';[.25,.6].forEach(f=>{g.beginPath();g.arc(bw*.48,-bl*.42-bl*.4*f,1.6*S,0,6.283);g.fill();});
      g.restore();
    }
    function drawTakoCut(){
      drawBoard();
      const s=sausLine();
      let off=0;
      if(ph==='tako_cut'&&pt<.3)off=-(1-eo(pt/.3))*W*.8;
      if(ph==='tako_chop'&&pt>.38)off=eio((pt-.38)/.34)*W*.9;
      // 切り終わったもの（右に並ぶ皿の代わりに板の端）
      const x0=s.x0+off;
      const raw=rampA(R_SAUS,0);
      g.fillStyle='rgba(0,0,0,.3)';rr(g,x0+3,s.y-s.th/2+5,s.len,s.th,s.th/2);g.fill();
      const gr=g.createLinearGradient(0,s.y-s.th/2,0,s.y+s.th/2);gr.addColorStop(0,rgb(tint(raw,.35)));gr.addColorStop(.45,rgb(raw));gr.addColorStop(1,rgb(shade(raw,.7)));
      g.fillStyle=gr;rr(g,x0,s.y-s.th/2,s.len,s.th,s.th/2);g.fill();
      g.save();rr(g,x0,s.y-s.th/2,s.len,s.th,s.th/2);g.clip();
      for(const sp of SPOT){g.fillStyle=sp.k<.5?'rgba(255,225,215,.35)':'rgba(150,40,50,.18)';g.beginPath();g.arc(x0+sp.x*s.len,s.y-s.th/2+sp.y*s.th,sp.r*S*.45,0,6.283);g.fill();}
      const eg=g.createLinearGradient(x0,0,x0+s.len,0);eg.addColorStop(0,'rgba(120,30,40,.35)');eg.addColorStop(.08,'rgba(120,30,40,0)');eg.addColorStop(.92,'rgba(120,30,40,0)');eg.addColorStop(1,'rgba(120,30,40,.35)');g.fillStyle=eg;g.fillRect(x0,s.y-s.th/2,s.len,s.th);
      g.restore();
      g.fillStyle='rgba(255,255,255,.55)';rr(g,x0+s.th*.4,s.y-s.th*.32,s.len-s.th*.8,s.th*.14,s.th*.07);g.fill();
      g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.arc(x0+s.th*.55,s.y-s.th*.18,s.th*.06,0,6.283);g.fill();
      // 切れ目
      if(ph==='tako_chop'){
        const c=tako.cuts[tako.cuts.length-1];const k=clamp(pt/.12,0,1);
        g.strokeStyle='rgba(120,30,30,.75)';g.lineWidth=1.6*S;
        const n=c.q==='M'?1:3;
        for(let i=0;i<n;i++){const yy=s.y+(n===1?0:(i-1)*s.th*.24);
          if(isKani){g.beginPath();g.moveTo(x0+s.len,yy);g.lineTo(x0+s.len-(s.len*(1-c.frac))*k*.5,yy);g.moveTo(x0,yy);g.lineTo(x0+(s.len*(1-c.frac))*k*.5,yy);g.stroke();}
          else{g.beginPath();g.moveTo(x0+s.len,yy);g.lineTo(lerp(x0+s.len,x0+s.len*c.frac,k),yy);g.stroke();}
        }
      }
      // 目印
      if(ph==='tako_cut'){
        const mx=x0+s.len*tako.tm;
        g.strokeStyle=`rgba(255,226,120,${.75+Math.sin(T*8)*.2})`;g.lineWidth=2*S;g.setLineDash([4*S,3*S]);
        g.beginPath();g.moveTo(mx,s.y-s.th*1.5);g.lineTo(mx,s.y+s.th*1.5);g.stroke();g.setLineDash([]);
        g.fillStyle='#ffe27a';g.beginPath();g.moveTo(mx-6*S,s.y-s.th*1.5-9*S);g.lineTo(mx+6*S,s.y-s.th*1.5-9*S);g.lineTo(mx,s.y-s.th*1.5-1);g.fill();
        if(isKani){const mx2=x0+s.len*(1-tako.tm);g.strokeStyle='rgba(255,226,120,.35)';g.setLineDash([3*S,3*S]);g.beginPath();g.moveTo(mx2,s.y-s.th);g.lineTo(mx2,s.y+s.th);g.stroke();g.setLineDash([]);}
      }
      // 包丁
      const kx=ph==='tako_cut'?x0+s.len*tako.kx:s.x0+s.len*tako.kx;
      const drop=ph==='tako_chop'?(pt<.08?pt/.08:pt<.3?1:1-(pt-.3)/.2):0;
      if(!(ph==='tako_cut'&&pt<.3))drawKnife(kx,s.y-drop*3*S,clamp(1-drop,0,1));
      // 残り本数
      for(let i=0;i<3;i++){const cx2=L.cx+(i-1)*26*S,cy2=boardRect().y+boardRect().h+16*S;
        const c=tako.cuts[i];g.fillStyle=c?QC[c.q]:'rgba(255,255,255,.18)';g.beginPath();g.arc(cx2,cy2,5*S,0,6.283);g.fill();}
    }
    function drawRoundPan(x,y,R){
      g.fillStyle='rgba(0,0,0,.5)';g.beginPath();g.arc(x+6,y+10,R,0,6.283);g.fill();
      // 柄
      g.save();g.translate(x,y);g.rotate(.75);
      let gr=g.createLinearGradient(0,-8*S,0,8*S);gr.addColorStop(0,'#3a2214');gr.addColorStop(.4,'#7f5230');gr.addColorStop(1,'#2a160c');
      g.fillStyle='#2a2c32';g.fillRect(R*.9,-5*S,R*.25,10*S);
      g.fillStyle=gr;rr(g,R*1.1,-8*S,R*.62,16*S,8*S);g.fill();g.restore();
      gr=g.createLinearGradient(x-R,y-R,x+R,y+R);gr.addColorStop(0,'#5a5b64');gr.addColorStop(.5,'#2a2a31');gr.addColorStop(1,'#484a54');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,R,0,6.283);g.fill();
      gr=g.createRadialGradient(x-R*.25,y-R*.3,4,x,y,R);gr.addColorStop(0,'#302d36');gr.addColorStop(1,'#110f14');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,R*.9,0,6.283);g.fill();
      g.strokeStyle='rgba(255,215,170,.3)';g.lineWidth=1.3;g.beginPath();g.arc(x,y,R-.5,0,6.283);g.stroke();
      g.fillStyle='rgba(255,240,210,.06)';g.beginPath();g.ellipse(x-R*.35,y-R*.35,R*.35,R*.12,-.7,0,6.283);g.fill();
      // 油だまり
      g.fillStyle='rgba(255,210,120,.08)';g.beginPath();g.ellipse(x+R*.1,y+R*.35,R*.5,R*.25,0,0,6.283);g.fill();
    }
    function drawTakoSear(){
      const x=L.cx,y=L.CY,R=L.PR;
      drawFlameRing(x,y,R*.98,R*.98,.75);
      drawRoundPan(x,y,R);
      const len=R*.5;
      for(const s of tako.s){
        if(s.done&&s.lift>.45)continue;
        const p=sausPos(s);
        const b=s.done?s.bf:s.b;
        g.save();if(s.done){g.globalAlpha=1-clamp(s.lift/.45,0,1);}
        const jig=s.done?0:Math.sin(T*40+s.fx*9)*.8*S;
        const cut=tako.cuts[tako.s.indexOf(s)]||{frac:.5,q:'G'};
        drawSausage(p.x+jig,p.y,len,s.rot,b,cut.frac,clamp(b*1.1,0,1),s.done,cut.q==='M'?2:4);
        g.restore();
        if(!s.done){
          // 焼き色メーター
          const mx=p.x,my=p.y-len*.68,mr=13*S,a0=-Math.PI/2,z=tako.z;
          g.lineCap='butt';
          g.strokeStyle='rgba(10,6,8,.75)';g.lineWidth=7*S;g.beginPath();g.arc(mx,my,mr,0,6.283);g.stroke();
          g.strokeStyle='rgba(98,242,218,.35)';g.lineWidth=5*S;g.beginPath();g.arc(mx,my,mr,a0+z.ga*6.283,a0+Math.min(1,z.gb)*6.283);g.stroke();
          g.strokeStyle='rgba(255,214,90,.95)';g.beginPath();g.arc(mx,my,mr,a0+z.pa*6.283,a0+z.pb*6.283);g.stroke();
          g.strokeStyle=ramp(R_SAUS,s.b);g.lineWidth=3*S;g.beginPath();g.arc(mx,my,mr-4*S,a0,a0+clamp(s.b,0,1)*6.283);g.stroke();
          const inP=s.b>=z.pa&&s.b<=z.pb;
          g.fillStyle=inP?'#ffd65a':'rgba(255,255,255,.7)';g.beginPath();g.arc(mx+Math.cos(a0+s.b*6.283)*mr,my+Math.sin(a0+s.b*6.283)*mr,3*S,0,6.283);g.fill();
          if(inP){g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.5+.4*Math.sin(T*16);g.drawImage(glowSpr,mx-mr*2,my-mr*2,mr*4,mr*4);g.restore();txtO('今！',mx,my,11*S,'#fff4c0','#5a2a00',3*S);}
          else txt(String(tako.s.indexOf(s)+1),mx,my+1,10*S,'rgba(255,255,255,.55)');
        }
      }
    }

    // ── おにぎり ──
    function oniPath(c,x,y,R,p){
      const Rc=lerp(R*1.3,R,p),r=lerp(Rc*.5,R*.26,p);
      const v=[[x,y-Rc],[x+Rc*.866,y+Rc*.5],[x-Rc*.866,y+Rc*.5]];
      c.beginPath();c.moveTo((v[2][0]+v[0][0])/2,(v[2][1]+v[0][1])/2);
      c.arcTo(v[0][0],v[0][1],v[1][0],v[1][1],r);c.arcTo(v[1][0],v[1][1],v[2][0],v[2][1],r);c.arcTo(v[2][0],v[2][1],v[0][0],v[0][1],r);c.closePath();
    }
    function drawOni(x,y,R,rot,o){
      g.save();g.translate(x,y);g.rotate(rot||0);if(o.sy!==undefined)g.scale(1,o.sy);
      g.save();g.translate(R*.07,R*.14);oniPath(g,0,0,R,o.p);g.fillStyle='rgba(0,0,0,.35)';g.fill();g.restore();
      oniPath(g,0,0,R,o.p);g.save();g.clip();
      g.drawImage(riceTex,-R*1.35,-R*1.35,R*2.7,R*2.7);
      if(o.paint&&oni.paint){g.globalCompositeOperation='multiply';g.drawImage(oni.paint,-1.4*R,-1.4*R,2.8*R,2.8*R);g.globalCompositeOperation='source-over';}
      if(o.grill!==undefined&&o.grill>=0){
        g.globalCompositeOperation='multiply';g.fillStyle=ramp(GRILLR,o.grill);g.fillRect(-R*1.5,-R*1.5,R*3,R*3);
        g.globalCompositeOperation='source-over';g.fillStyle=ramp(GRILLR,o.grill*.92,.42);g.fillRect(-R*1.5,-R*1.5,R*3,R*3);
        const ma=clamp((o.grill-.15)*.9,0,.5);
        if(ma>0){g.save();g.rotate(-.6);g.strokeStyle=`rgba(50,22,8,${ma})`;g.lineWidth=R*.08;g.lineCap='round';
          for(let k=-3;k<=3;k++){g.beginPath();g.moveTo(-R*1.2,k*R*.33);g.lineTo(R*1.2,k*R*.33);g.stroke();}g.restore();}
        if(o.grill>.82)for(const s of SPOT){g.fillStyle=`rgba(30,15,6,${clamp((o.grill-.82)*2.5*s.k,0,.7)})`;g.beginPath();g.arc((s.x-.5)*R*1.6,(s.y-.4)*R*1.5,s.r*R*.04,0,6.283);g.fill();}
      }
      const sh=g.createRadialGradient(-R*.3,-R*.35,R*.1,0,0,R*1.3);sh.addColorStop(0,'rgba(255,255,255,.2)');sh.addColorStop(.55,'rgba(0,0,0,0)');sh.addColorStop(1,'rgba(50,25,0,.42)');
      g.fillStyle=sh;g.fillRect(-R*1.5,-R*1.5,R*3,R*3);
      if(o.gloss){g.fillStyle=`rgba(255,248,230,${.35*o.gloss})`;g.beginPath();g.ellipse(-R*.25,-R*.2,R*.12,R*.32,.5,0,6.283);g.fill();
        g.fillStyle=`rgba(255,255,255,${.5*o.gloss})`;g.beginPath();g.arc(-R*.12,-R*.52,R*.05,0,6.283);g.fill();}
      g.restore();
      oniPath(g,0,0,R,o.p);g.strokeStyle='rgba(90,60,30,.35)';g.lineWidth=1;g.stroke();
      g.restore();
    }
    function drawPlateDish(x,y,R){
      g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(x+4,y+8,R,R*.96,0,0,6.283);g.fill();
      let gr=g.createRadialGradient(x-R*.3,y-R*.3,R*.1,x,y,R);gr.addColorStop(0,'#fbf6ee');gr.addColorStop(1,'#cfc6b8');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,R,0,6.283);g.fill();
      gr=g.createRadialGradient(x,y,R*.4,x,y,R*.78);gr.addColorStop(0,'#f4efe6');gr.addColorStop(1,'#ddd4c6');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,R*.76,0,6.283);g.fill();
      g.strokeStyle='rgba(60,90,160,.5)';g.lineWidth=1.5*S;g.beginPath();g.arc(x,y,R*.9,0,6.283);g.stroke();
      g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.ellipse(x-R*.5,y-R*.55,R*.25,R*.07,-.7,0,6.283);g.fill();
    }
    function drawHand(x,y,R,side,press){
      g.save();g.translate(x,y);g.scale(side,1);g.rotate(-.18-press*.1);
      const hw=R*.6,hh=R*1.15;
      g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.ellipse(6,8,hw,hh,0,0,6.283);g.fill();
      let gr=g.createLinearGradient(-hw,0,hw,0);gr.addColorStop(0,'#f6d2b2');gr.addColorStop(.6,'#e9b892');gr.addColorStop(1,'#c58c68');
      g.fillStyle=gr;g.beginPath();g.ellipse(0,0,hw,hh,0,0,6.283);g.fill();
      // 指
      for(let i=0;i<4;i++){const fy=-hh*.55+i*hh*.3;g.fillStyle=i%2?'#eebf9b':'#f2c8a6';g.beginPath();g.ellipse(-hw*.55,fy,hw*.42,hh*.13,-.15,0,6.283);g.fill();
        g.strokeStyle='rgba(140,80,50,.35)';g.lineWidth=1;g.stroke();}
      g.fillStyle='#f3cdae';g.beginPath();g.ellipse(hw*.25,-hh*.75,hw*.3,hh*.22,.5,0,6.283);g.fill();g.strokeStyle='rgba(140,80,50,.3)';g.stroke();
      g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(-hw*.1,hh*.2,hw*.2,hh*.4,0,0,6.283);g.fill();
      // 濡れた手の光
      g.fillStyle='rgba(220,240,255,.35)';g.beginPath();g.arc(-hw*.3,-hh*.2,2*S,0,6.283);g.arc(hw*.1,hh*.35,1.6*S,0,6.283);g.fill();
      g.restore();
    }
    function tapBeat(){
      let best=null,bd=1e9;
      for(const b of oni.beats){if(b.q)continue;const d=Math.abs(pt-b.t);if(d<bd){bd=d;best=b;}}
      oni.press=1;SND.pon();
      if(!best||bd>.32){pop('…',L.cx,L.CY-L.R*1.5,'#bbaedd',16,.5);return;}
      const k=DISH[2].diff, err=pt-best.t;
      const q=Math.abs(err)<.075*k*1.15?'P':Math.abs(err)<.16*k*1.1?'G':'M';
      best.q=q;oni.shapeQ.push(QV[q]);oni.shapeP=clamp(oni.shapeP+(q==='P'?1:q==='G'?.82:.45)/6,0,1);
      cnt[q]++;
      const words=['にぎっ','ぎゅっ','くるっ','にぎっ','ぎゅっ','ぽんっ'];
      pop(QL[q],L.cx,L.CY-L.R*1.55,QC[q],q==='P'?22:19,.75,words[oni.beats.indexOf(best)]);
      if(q==='P'){SND.perfect();hitstop=.07;shake=Math.max(shake,3*S);sparkle(L.cx,L.CY,8);}else if(q==='G')SND.good();else SND.miss();
      for(let i=0;i<5;i++)emit('drop',L.cx+(Math.random()<.5?-1:1)*L.R*rnd(.9,1.2),L.CY+rnd(-20,20)*S,rnd(-60,60)*S,rnd(-120,-40)*S,.5,1.6*S,'rgba(200,230,255,.8)');
    }
    function updOni(dt){
      oni.press=Math.max(0,oni.press-dt*5);
      if(ph==='oni_shape'){
        for(const b of oni.beats){if(!b.q&&pt>b.t+.3){b.q='M';cnt.M++;oni.shapeQ.push(QV.M);oni.shapeP=clamp(oni.shapeP+.4/6,0,1);pop('MISS',L.cx,L.CY-L.R*1.55,QC.M,18,.6);SND.miss();}}
        const last=oni.beats[oni.beats.length-1];
        if(last.q&&pt>last.t+.55){rec.oni.push(avg(oni.shapeQ));go('oni_brush');}
      }else if(ph==='oni_brush'){
        if(oni.auto){const R=L.R*1.25,u=pt*1.05;brushAt(L.cx+Math.sin(u*9)*R*.85,L.CY-R*.75+((u*.55)%1)*R*1.4);}
        if(oni.brushing||oni.auto){oni.brushSnd-=dt;if(oni.brushSnd<=0){oni.brushSnd=.12;SND.brush();}}
        gauge.v=oni.cov;gauge.right=`残り ${Math.max(0,5-pt).toFixed(1)}s`;
        if(pt>=5||oni.cov>=.97){
          const q=oni.cov>=.86?'P':oni.cov>=.6?'G':'M';oni.brushing=false;oni.auto=false;lockGauge(q);
          judge('oni',q,L.cx,L.CY-L.R*1.7,q==='P'?'つやつや！':'ムラがある');
          go('oni_grill');
        }
      }else if(ph==='oni_grill'){
        oni.c+=dt*SPD*(.42+oni.side*.06)*(isMiso?1.08:1);gauge.v=oni.c;
        every('og',6+oni.c*10,dt,()=>steam(L.cx,L.CY-L.R*.4,L.R*.6,1));
        every('od',4+oni.c*6,dt,()=>oil(L.cx+rnd(-L.R,L.R),L.CY+L.R*.55,1));
        if(oni.c>.86)every('oz',7,dt,()=>emit('smoke',L.cx+rnd(-20,20)*S,L.CY,0,-34*S,1.3,10*S));
        SND.sizzle(.3+oni.c*.5);
        if(oni.c>=1){oni.cs[oni.side]=1;lockGauge('M');judge('oni','M',L.cx,L.CY-L.R*1.4,'焦げた…');if(oni.side===0)go('oni_flip');else go('oni_finish');}
      }else if(ph==='oni_flip'){
        oni.flipK=pt/.42;SND.sizzle(.2);
        if(pt>=.42){oni.side=1;oni.c=0;gauge.lockV=-1;gauge.right='裏';hint='もう片面も！ 金色でタップ';go2('oni_grill');}
      }else if(ph==='oni_finish'){
        SND.sizzle(.1);every('of',8,dt,()=>steam(L.cx,L.CY-L.R*.5,L.R*.5,1));
        if(pt>1.6){SND.sizzle(0);startDish(3);ph='wait';}
      }
    }
    function go2(p){ph=p;pt=0;}
    function brushAt(x,y){
      const R=L.R*1.25;
      const u=(x-L.cx)/R,v=(y-L.CY)/R;
      if(!oni.cells){oni.cells=[];for(let i=0;i<16;i++)for(let j=0;j<16;j++){const cu=-1.1+i/15*2.2,cvv=-1.05+j/15*2.1;if(inTri(cu,cvv,.86))oni.cells.push({u:cu,v:cvv,on:false});}}
      const prev=oni.last;
      oni.strokes.push(prev?[prev[0],prev[1],u,v]:[u,v,u,v]);
      oni.last=[u,v];
      const pts=prev?[[prev[0],prev[1]],[(prev[0]+u)/2,(prev[1]+v)/2],[u,v]]:[[u,v]];
      let on=0;
      for(const c of oni.cells){if(!c.on)for(const p of pts){if(Math.hypot(c.u-p[0],c.v-p[1])<.27){c.on=true;break;}}if(c.on)on++;}
      oni.cov=on/oni.cells.length;
      paintStroke(oni.strokes[oni.strokes.length-1]);
      oni.bx=x;oni.by=y;
      if(Math.random()<.25)emit('drop',x,y,rnd(-30,30)*S,rnd(-20,30)*S,.35,1.5*S,isMiso?'#b8742c':'#5a2a10');
    }
    function inTri(u,v,k){ // 単位三角形（外接半径k）の内側か
      const v0=[0,-k],v1=[k*.866,k*.5],v2=[-k*.866,k*.5];
      const s=(a,b,c)=>(a[0]-c[0])*(b[1]-c[1])-(b[0]-c[0])*(a[1]-c[1]);
      const p=[u,v],d1=s(p,v0,v1),d2=s(p,v1,v2),d3=s(p,v2,v0);
      return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));
    }
    function ensurePaint(){
      const R=L.R*1.25;
      if(oni.paint&&oni.paintR===R)return;
      let c;[oni.paint,c]=mkCanvas(R*2.8,R*2.8);oni.paintR=R;oni.paintCtx=c;
      oni.strokes.forEach(s=>paintStroke(s,true));
    }
    function paintStroke(s,re){
      if(!oni.paint){if(!re){ensurePaint();}return;}
      const R=oni.paintR,c=oni.paintCtx,o=R*1.4;
      c.lineCap='round';c.lineJoin='round';
      c.strokeStyle=isMiso?'rgba(214,140,60,.42)':'rgba(150,78,30,.4)';c.lineWidth=R*.46;
      c.beginPath();c.moveTo(o+s[0]*R,o+s[1]*R);c.lineTo(o+s[2]*R+.01,o+s[3]*R);c.stroke();
    }
    function drawBrush(x,y,wet){
      g.save();g.translate(x,y);g.rotate(-.7);
      g.fillStyle='rgba(0,0,0,.3)';g.fillRect(8,10,60*S,6*S);
      const gr=g.createLinearGradient(0,-3*S,0,3*S);gr.addColorStop(0,'#e6c58e');gr.addColorStop(1,'#a07440');
      g.fillStyle=gr;rr(g,12*S,-3*S,58*S,6*S,3*S);g.fill();
      g.fillStyle='#b8b8c0';g.fillRect(8*S,-4*S,6*S,8*S);
      g.fillStyle=wet?(isMiso?'#a8662a':'#3a1a0a'):'#e8dcc0';g.beginPath();g.moveTo(9*S,-4.5*S);g.quadraticCurveTo(-6*S,-3*S,-10*S,0);g.quadraticCurveTo(-6*S,3*S,9*S,4.5*S);g.fill();
      if(wet){g.fillStyle='rgba(255,255,255,.35)';g.fillRect(-4*S,-1.5*S,9*S,1.2*S);}
      g.restore();
    }
    function drawNet(x,y,R){
      g.save();
      g.fillStyle='rgba(0,0,0,.45)';g.beginPath();g.arc(x+4,y+8,R,0,6.283);g.fill();
      g.beginPath();g.arc(x,y,R,0,6.283);g.clip();
      const gr=g.createRadialGradient(x,y,R*.1,x,y,R);gr.addColorStop(0,'#2a140c');gr.addColorStop(1,'#0e0806');g.fillStyle=gr;g.fillRect(x-R,y-R,R*2,R*2);
      g.restore();
      drawFlameRing(x,y,R*.8,R*.8,.6+(ph==='oni_grill'?oni.c*.3:0));
      g.save();g.beginPath();g.arc(x,y,R,0,6.283);g.clip();
      g.translate(x,y);g.rotate(.785);
      const sp=R*.16;
      for(let i=-8;i<=8;i++){const o=i*sp;
        g.strokeStyle='rgba(30,30,34,.9)';g.lineWidth=2.6*S;g.beginPath();g.moveTo(-R,o+1);g.lineTo(R,o+1);g.moveTo(o+1,-R);g.lineTo(o+1,R);g.stroke();
        g.strokeStyle='rgba(205,200,195,.55)';g.lineWidth=1.2*S;g.beginPath();g.moveTo(-R,o);g.lineTo(R,o);g.moveTo(o,-R);g.lineTo(o,R);g.stroke();
      }
      g.restore();
      g.strokeStyle='#9a9aa2';g.lineWidth=3*S;g.beginPath();g.arc(x,y,R-1.5*S,0,6.283);g.stroke();
      g.strokeStyle='rgba(255,230,200,.35)';g.lineWidth=1;g.beginPath();g.arc(x,y,R-2.5*S,Math.PI*1.1,Math.PI*1.7);g.stroke();
    }
    function drawOniScene(){
      const x=L.cx,y=L.CY,R=L.R;
      if(ph==='oni_shape'){
        drawPlateDish(x,y+R*.3,R*1.75);
        drawOni(x,y,R,0,{p:oni.shapeP});
        // リズムの輪
        g.strokeStyle='rgba(255,236,190,.28)';g.lineWidth=2*S;g.setLineDash([3*S,4*S]);g.beginPath();g.arc(x,y+R*.05,R*.95,0,6.283);g.stroke();g.setLineDash([]);
        for(const b of oni.beats){if(b.q)continue;const d=b.t-pt;if(d>1.1||d<-.3)continue;
          const r=R*.95*(1+Math.max(0,d)*1.5);const a=clamp(1-d/1.1,0,1);
          g.strokeStyle=`rgba(255,214,90,${a})`;g.lineWidth=(3+a*2)*S;g.beginPath();g.arc(x,y+R*.05,r,0,6.283);g.stroke();}
        const press=Math.max(oni.press,0);
        drawHand(x-R*(1.08+(1-press)*.32),y+R*.1,R,1,press);
        drawHand(x+R*(1.08+(1-press)*.32),y+R*.1,R,-1,press);
        // 拍の記録
        oni.beats.forEach((b,i)=>{const cx2=x+(i-2.5)*20*S,cy2=L.GY;g.fillStyle=b.q?QC[b.q]:'rgba(255,255,255,.16)';g.beginPath();g.arc(cx2,cy2,6*S,0,6.283);g.fill();
          if(!b.q&&Math.abs(b.t-pt)<.1){g.strokeStyle='#fff';g.lineWidth=2;g.stroke();}});
        txt('にぎる リズム',x,L.GY-18*S,11*S,'#e8d8b8');
      }else if(ph==='oni_brush'){
        const R2=R*1.25;
        drawPlateDish(x,y+R2*.25,R2*1.6);
        ensurePaint();
        drawOni(x,y,R2,0,{p:oni.shapeP,paint:true,gloss:oni.cov});
        // タレ皿
        const sx=x-R2*1.25,sy=y+R2*1.2;
        g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(sx+3,sy+5,R2*.36,R2*.24,0,0,6.283);g.fill();
        g.fillStyle='#f0ebe2';g.beginPath();g.ellipse(sx,sy,R2*.36,R2*.24,0,0,6.283);g.fill();
        g.fillStyle=isMiso?'#b8742c':'#4a200c';g.beginPath();g.ellipse(sx,sy+1,R2*.27,R2*.16,0,0,6.283);g.fill();
        g.fillStyle='rgba(255,255,255,.4)';g.beginPath();g.ellipse(sx-R2*.08,sy-R2*.04,R2*.08,R2*.025,0,0,6.283);g.fill();
        if(oni.brushing||oni.auto)drawBrush(oni.bx,oni.by,true);
        else{
          drawBrush(sx+R2*.1,sy-R2*.05,true);
          if(oni.cov<.05){const k=(T*1.2)%1;drawPointer(x-R2*.5+k*R2,y+Math.sin(k*6.28)*R2*.2,k);}
        }
      }else{
        drawNet(x,y,R*1.7);
        ensurePaint();
        let sy=1,lift=0;
        if(ph==='oni_flip'){sy=Math.cos(Math.PI*clamp(oni.flipK,0,1));lift=Math.sin(Math.PI*clamp(oni.flipK,0,1))*18*S;}
        const gc=ph==='oni_flip'?(oni.flipK<.5?oni.cs[0]:.05):ph==='oni_finish'?avg(oni.cs):oni.c;
        drawOni(x,y-lift,R,0,{p:oni.shapeP,paint:true,grill:gc,gloss:.7,sy:Math.max(.04,Math.abs(sy))});
        if(ph==='oni_flip'){drawSpatula(x+R*.2,y+R*.4-lift);}
      }
    }
    function drawSpatula(x,y){g.save();g.translate(x,y);g.rotate(.5);
      g.fillStyle='rgba(0,0,0,.3)';rr(g,4,6,40*S,26*S,4*S);g.fill();
      const gr=g.createLinearGradient(0,0,40*S,0);gr.addColorStop(0,'#d0d4da');gr.addColorStop(1,'#8a9098');g.fillStyle=gr;rr(g,0,0,40*S,26*S,4*S);g.fill();
      g.fillStyle='#3a2414';rr(g,38*S,10*S,60*S,7*S,3*S);g.fill();g.restore();}
    function drawPointer(x,y,k){
      g.save();g.translate(x,y);g.globalAlpha=.85;
      g.fillStyle='#fff';g.strokeStyle='#2a1a10';g.lineWidth=1.5;
      g.beginPath();g.moveTo(0,0);g.lineTo(6*S,16*S);g.lineTo(9*S,10*S);g.lineTo(16*S,12*S);g.closePath();g.fill();g.stroke();
      g.strokeStyle=`rgba(255,226,120,${1-k})`;g.lineWidth=2;g.beginPath();g.arc(0,0,6*S+k*10*S,0,6.283);g.stroke();
      g.restore();
    }

    // ── 盛り付け ──
    function itemDims(type,s){return type==='oni'?s:type==='egg'?s*1.3:s*1.1;}
    function initPlate(){
      if(plate.items.length)return;
      plate.left=(tutorialPlate?24:20)+PLATE_ADD;plate.mistakes=0;
      const eggC=avg(egg.layers)||.6;
      const tk=tako.s.map(s=>s.bf);
      L.homes.forEach((h,i)=>{
        plate.items.push({i,type:h.type,x:h.x,y:h.y,rot:rnd(-.35,.35),home:i,slot:-1,ox:0,oy:0,orot:0,neat:0,land:0,
          q:h.type==='egg'?eggC:h.type==='tako'?(tk[[5,6,7].indexOf(i)]||.7):avg(oni.cs),
          cut:h.type==='tako'?(tako.cuts[[5,6,7].indexOf(i)]||{frac:.5,q:'G'}):null});
      });
    }
    function itemPos(it){
      if(plate.drag&&plate.drag.it===it)return {x:it.x,y:it.y,rot:it.rot*.5,s:L.slots[it.home].s*1.08};
      if(it.slot>=0){const sl=L.slots[it.slot];return {x:sl.x+it.ox*sl.s,y:sl.y+it.oy*sl.s,rot:it.orot,s:sl.s};}
      const h=L.homes[it.home];return {x:h.x,y:h.y,rot:it.rot,s:h.s};
    }
    function grabItem(x,y,id){
      let best=null,bd=1e9;
      for(const it of plate.items){if(it.slot>=0)continue;const p=itemPos(it);const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;best=it;}}
      if(!best||bd>Math.max(40*S,itemDims(best.type,L.slots[best.home].s)*1.15))return;
      const p=itemPos(best);best.x=p.x;best.y=p.y;
      plate.drag={it:best,id,ox:p.x-x,oy:p.y-y};SND.tap();
    }
    function compAt(x,y){for(const c of L.comps)if(x>=c.x-6&&x<=c.x+c.w+6&&y>=c.y-6&&y<=c.y+c.h+6)return c;return null;}
    function freeSlots(type){return L.slots.map((s,i)=>i).filter(i=>L.slots[i].type===type&&!plate.items.some(it=>it.slot===i));}
    function dropItem(){
      const it=plate.drag.it;plate.drag=null;
      const c=compAt(it.x,it.y);
      if(!c){SND.se('back');return;}
      if(c.type!==it.type){plate.mistakes++;pop('そこじゃない',it.x,it.y-20*S,QC.M,15,.8);SND.miss();shake=3*S;return;}
      const fs=freeSlots(it.type);if(!fs.length)return;
      let si=fs[0],bd=1e9;for(const i of fs){const s=L.slots[i];const d=Math.hypot(s.x-it.x,s.y-it.y);if(d<bd){bd=d;si=i;}}
      placeItem(it,si,bd);
    }
    function placeItem(it,si,d,forceNeat){
      const sl=L.slots[si];
      const dd=d/(sl.s*1.25*(tutorialPlate?1.2:1)*NEAT_K);
      const neat=forceNeat!==undefined?forceNeat:clamp(1-dd,0,1);
      it.slot=si;it.neat=neat;it.land=.35;
      const off=1-neat;
      const dx=(it.x-sl.x)/sl.s,dy=(it.y-sl.y)/sl.s,dl=Math.hypot(dx,dy)||1;
      it.ox=dx/dl*off*.35;it.oy=dy/dl*off*.35;it.orot=(it.rot>0?1:-1)*off*.35;
      const q=neat>=.78?'P':neat>=.45?'G':'M';
      rec.plate.push(neat*100);cnt[q]++;
      pop(q==='P'?'きれい！':q==='G'?'OK':'ずれた',sl.x,sl.y-sl.s*1.1,QC[q],q==='P'?17:15,.8);
      SND.place();if(q==='P'){SND.perfect();sparkle(sl.x,sl.y,8);}
    }
    function autoPlace(){
      const it=plate.items.find(i=>i.slot<0&&!(plate.drag&&plate.drag.it===i));if(!it)return;
      const fs=freeSlots(it.type);if(!fs.length)return;
      const sl=L.slots[fs[0]];it.x=sl.x+rnd(-.2,.2)*sl.s;it.y=sl.y+rnd(-.2,.2)*sl.s;
      placeItem(it,fs[0],0,.74);
    }
    function updPlate(dt){
      if(ph==='plate'){
        plate.left-=dt;
        for(const it of plate.items)if(it.land>0)it.land=Math.max(0,it.land-dt);
        if(plate.left<=0){
          if(plate.drag)plate.drag=null;
          for(const it of plate.items){if(it.slot>=0)continue;const fs=freeSlots(it.type);if(!fs.length)continue;const sl=L.slots[fs[0]];it.x=sl.x+sl.s*.5;it.y=sl.y+sl.s*.3;it.rot=.6;placeItem(it,fs[0],0,.25);}
        }
        if(plate.items.every(i=>i.slot>=0)){go('plate_done');}
      }else if(ph==='plate_done'){
        for(const it of plate.items)if(it.land>0)it.land=Math.max(0,it.land-dt);
        if(pt>.25&&pt-dt<=.25){const s=L.garn[0];sparkle(s.x,s.y,10);SND.pon();}
        if(pt>.55&&pt-dt<=.55){const s=L.garn[1];sparkle(s.x,s.y,10);SND.pon();}
        if(pt>.9&&pt-dt<=.9){sparkle(L.cx,L.by+L.BH/2,26);}
        if(pt>2.9){computeRes();startWipe(()=>{go('morning');});ph='wait2';}
      }
    }
    function drawBento(lid){
      const {bx,by,BW,BH}=L,I=L.inner;
      g.fillStyle='rgba(0,0,0,.4)';rr(g,bx+5,by+9,BW,BH,16*S);g.fill();
      let gr=g.createLinearGradient(bx,by,bx,by+BH);gr.addColorStop(0,'#a9dcf0');gr.addColorStop(1,'#5d9fc4');
      g.fillStyle=gr;rr(g,bx,by,BW,BH,16*S);g.fill();
      g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.5;rr(g,bx+1,by+1,BW-2,BH-2,15*S);g.stroke();
      // 縁の星柄
      for(let i=0;i<10;i++){const f=i/10;const sx=bx+BW*(.05+f*.9);drawStar(sx,by+I.pad*.5,2.6*S,.3,'rgba(255,236,140,.85)');drawStar(sx+BW*.045,by+BH-I.pad*.5,2.6*S,.3,'rgba(255,236,140,.85)');}
      L.comps.forEach(c=>{
        gr=g.createLinearGradient(0,c.y,0,c.y+c.h);gr.addColorStop(0,'#d8d2c6');gr.addColorStop(.12,'#f2ede3');gr.addColorStop(1,'#ebe4d6');
        g.fillStyle=gr;rr(g,c.x,c.y,c.w,c.h,8*S);g.fill();
        g.strokeStyle='rgba(60,90,120,.35)';g.lineWidth=1;rr(g,c.x+.5,c.y+.5,c.w-1,c.h-1,8*S);g.stroke();
      });
      // レタス（ウインナーの下）
      const c2=L.comps[2];
      g.save();rr(g,c2.x,c2.y,c2.w,c2.h,8*S);g.clip();
      g.fillStyle='#8fcf62';g.beginPath();g.moveTo(c2.x,c2.y+c2.h*.25);
      for(let i=0;i<=8;i++){const x=c2.x+c2.w*.72*i/8;g.quadraticCurveTo(x+c2.w*.045,c2.y+c2.h*(i%2?.1:.22),x+c2.w*.09,c2.y+c2.h*.18);}
      g.lineTo(c2.x+c2.w*.75,c2.y+c2.h);g.lineTo(c2.x,c2.y+c2.h);g.fill();
      g.strokeStyle='rgba(220,255,190,.5)';g.lineWidth=1;for(let i=0;i<5;i++){g.beginPath();g.moveTo(c2.x+c2.w*(.08+i*.14),c2.y+c2.h);g.lineTo(c2.x+c2.w*(.12+i*.14),c2.y+c2.h*.3);g.stroke();}
      g.restore();
      // バラン
      const by2=L.comps[1].y+L.comps[1].h+I.dv/2;
      g.fillStyle='#3fa04a';g.beginPath();g.moveTo(L.comps[1].x,by2+3*S);
      for(let x=L.comps[1].x;x<=L.comps[1].x+L.comps[1].w;x+=8*S){g.lineTo(x+4*S,by2-4*S);g.lineTo(x+8*S,by2+3*S);}g.fill();
    }
    function drawItem(it,p,lifted){
      const s=p.s,land=it.land>0?1+Math.sin(it.land/.35*Math.PI)*.12:1;
      g.save();g.translate(p.x,p.y);g.scale(land,land);
      if(lifted){g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(6*S,14*S,s*.9,s*.5,0,0,6.283);g.fill();}
      if(it.type==='oni')drawOni(0,0,s,p.rot,{p:oni.shapeP,paint:true,grill:it.q,gloss:.6});
      else if(it.type==='egg')drawEggSlice(0,0,s,p.rot,it.q);
      else drawSausage(0,0,s*2,p.rot,it.q,it.cut.frac,clamp(it.q*1.1,0,1),true,it.cut.q==='M'?2:4);
      g.restore();
    }
    function drawEggSlice(x,y,s,rot,c){
      g.save();g.translate(x,y);g.rotate(rot);
      const w=s*2,h=s*2.5,col=rampA(EGGR,clamp(c*.95+.05,0,1.1));
      g.fillStyle='rgba(0,0,0,.3)';rr(g,-s+2,-h/2+4,w,h,s*.4);g.fill();
      g.fillStyle=rgb(shade(col,.85));rr(g,-s,-h/2,w,h,s*.4);g.fill();
      const inner=rampA(EGGR,.44);
      const gr=g.createLinearGradient(-s,-h/2,s,h/2);gr.addColorStop(0,rgb(tint(inner,.25)));gr.addColorStop(1,rgb(inner));
      g.fillStyle=gr;rr(g,-s*.82,-h/2+s*.18,w*.82,h-s*.36,s*.3);g.fill();
      g.strokeStyle=rgb(shade(inner,.82),.8);g.lineWidth=Math.max(1,s*.07);
      g.beginPath();
      for(let a=0;a<14;a+=.25){const r=s*.1+a*s*.052;const px=Math.cos(a)*r*.8,py=Math.sin(a)*r*1.05;if(a===0)g.moveTo(px,py);else g.lineTo(px,py);}
      g.stroke();
      g.fillStyle='rgba(255,255,255,.35)';g.beginPath();g.ellipse(-s*.4,-h*.26,s*.18,s*.08,-.4,0,6.283);g.fill();
      g.restore();
    }
    function drawGarnish(k,x,y,s,sc){
      if(sc<=0)return;
      g.save();g.translate(x,y);g.scale(sc,sc);
      if(k==='broc'){
        g.fillStyle='#7aa84a';g.fillRect(-s*.15,0,s*.3,s*.9);
        [[0,-.3,.5],[-.4,0,.42],[.4,0,.42],[-.2,.25,.38],[.25,.25,.38],[0,0,.45]].forEach(([dx,dy,r])=>{g.fillStyle='#2f7a34';g.beginPath();g.arc(dx*s,dy*s,r*s,0,6.283);g.fill();
          g.fillStyle='#4f9e44';g.beginPath();g.arc(dx*s-r*s*.25,dy*s-r*s*.25,r*s*.55,0,6.283);g.fill();});
        g.fillStyle='rgba(200,255,160,.5)';for(let i=0;i<8;i++){g.beginPath();g.arc((SPOT[i].x-.5)*s*1.2,(SPOT[i].y-.6)*s,s*.06,0,6.283);g.fill();}
      }else{
        const gr=g.createRadialGradient(-s*.3,-s*.3,s*.1,0,0,s);gr.addColorStop(0,'#ff8a7a');gr.addColorStop(.6,'#e2302a');gr.addColorStop(1,'#9a1a18');
        g.fillStyle=gr;g.beginPath();g.arc(0,0,s,0,6.283);g.fill();
        g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(-s*.35,-s*.35,s*.22,s*.12,-.7,0,6.283);g.fill();
        g.fillStyle='#3d8a32';g.beginPath();for(let i=0;i<10;i++){const a=i/10*6.283,r=i%2?s*.15:s*.42;g.lineTo(Math.cos(a)*r,-s*.75+Math.sin(a)*r*.6);}g.fill();
      }
      g.restore();
    }
    function drawPlateScene(){
      // トレイ（まな板）
      const t=L.tray;
      if(ph==='plate'){
        g.fillStyle='rgba(0,0,0,.4)';rr(g,t.x+4,t.y+7,t.w,t.h,10*S);g.fill();
        g.save();rr(g,t.x,t.y,t.w,t.h,10*S);g.clip();g.drawImage(getWood(t.w,t.h),t.x,t.y,t.w,t.h);g.fillStyle='rgba(30,15,5,.18)';g.fillRect(t.x,t.y,t.w,t.h);g.restore();
      }
      drawBento();
      // 置ける場所のガイド
      if(plate.drag){
        const it=plate.drag.it;
        for(const c of L.comps){if(c.type!==it.type)continue;g.save();g.strokeStyle=`rgba(255,214,90,${.6+.3*Math.sin(T*10)})`;g.lineWidth=2.5*S;g.setLineDash([6*S,4*S]);rr(g,c.x+2,c.y+2,c.w-4,c.h-4,8*S);g.stroke();g.restore();
          for(const i of freeSlots(it.type)){const s=L.slots[i];g.strokeStyle='rgba(255,236,170,.55)';g.lineWidth=1.5;g.beginPath();g.arc(s.x,s.y,5*S,0,6.283);g.stroke();g.beginPath();g.moveTo(s.x-8*S,s.y);g.lineTo(s.x+8*S,s.y);g.moveTo(s.x,s.y-8*S);g.lineTo(s.x,s.y+8*S);g.stroke();}}
      }else if(ph==='plate'&&tutorialPlate&&plate.left>18+PLATE_ADD){
        // 最初だけ指で示す
        const it=plate.items.find(i=>i.slot<0);
        if(it){const a=itemPos(it),sl=L.slots[freeSlots(it.type)[0]];const k=((T*.7)%1);drawPointer(lerp(a.x,sl.x,eio(k)),lerp(a.y,sl.y,eio(k)),k);}
      }
      const garnK=ph==='plate_done'?[eback((pt-.25)/.3),eback((pt-.55)/.3)]:(ph==='morning'||ph==='final'||ph==='wait2')?[1,1]:[0,0];
      L.garn.forEach((s,i)=>drawGarnish(s.k,s.x,s.y,s.s,pt<0?0:garnK[i]));
      const order=plate.items.filter(i=>!(plate.drag&&plate.drag.it===i));
      for(const it of order)drawItem(it,itemPos(it),false);
      if(plate.drag)drawItem(plate.drag.it,itemPos(plate.drag.it),true);
      if(ph==='plate_done'||ph==='wait2'){
        const k=ph==='wait2'?1:clamp((pt-.9)/.4,0,1);
        if(k>0){g.save();g.globalAlpha=k;const sR=Math.min(40*S,L.tray.h*.28),sx=W/2-sR*.9,sy=L.tray.y+L.tray.h*.3;
          drawSnack(sx,sy,sR,true);
          txtO('端っこは、わたしの夜食。',W/2,sy+sR*2.1,12*S,'#f6e6c8','rgba(20,10,6,.85)',3*S);
          g.restore();
          if(ph==='plate_done')every('sn',4,1/60,()=>steam(sx,sy,sR*.5,1));}
      }
      if(ph==='plate'){
        const tl=Math.max(0,plate.left);
        txtO(`のこり ${tl.toFixed(1)}s`,W-14*S,L.tray.y-0,11*S,tl<6?'#ff8a9a':'#f6e6c8','rgba(20,10,6,.85)',3*S,'right');
      }
    }

    // ── 結果計算 ──
    function computeRes(){
      if(res)return res;
      const eggS=Math.round(avg(rec.egg)),takoS=Math.round(avg(rec.tako)),oniS=Math.round(avg(rec.oni));
      const plateS=Math.round(clamp(avg(rec.plate)-plate.mistakes*5+(plate.left>8?4:0),0,100));
      const total=Math.round(eggS*.25+takoS*.25+oniS*.25+plateS*.25);
      const letter=total>=90?'S':total>=78?'A':total>=55?'B':'C';
      const grade=total>=78?'great':total>=55?'ok':'poor';
      const prevBest=cd.best||0;
      const newRec=[V.egg,V.tako,V.oni].filter(r=>!cd.book[r.id]).map(r=>r.name);
      // 次に解禁されるレシピ
      const nextPlays=cd.plays+1;
      const unlockNext=[].concat(CK_RECIPES.egg,CK_RECIPES.tako,CK_RECIPES.oni).filter(r=>r.plays&&!ckUnlocked(r,cd)&&nextPlays>=r.plays).map(r=>r.name);
      const notes={great:`${sausName} 3びき いるよ。\nきょうも いっぱい あそんでね。`,ok:'たまごやき あまくしたよ。\nいってらっしゃい。',poor:'ちょっと こげちゃった。\nごめんね。だいすきだよ。'};
      const child={great:[`わあっ！ ${sausName}、みんな わらってる！`,'パパの おべんとう、せかいいち！'],ok:['たまごやき、あまーい！','ぜんぶ たべたよ！'],poor:['ちょっと くろい……','でも、ぜんぶ たべるね。']};
      res={eggS,takoS,oniS,plateS,total,letter,grade,prevBest,isBest:total>prevBest,newRec,unlockNext,note:notes[grade],child:child[grade]};
      return res;
    }

    // ── 朝の場面・結果 ──
    function drawMorning(){
      g.drawImage(morningBg,0,0,W,H);
      // ふた
      const k=eio((pt-.7)/.7);
      drawPlateScene();
      if(k<1){
        g.save();g.translate(L.cx+k*W*.15,L.by+L.BH/2-k*H*.35);g.rotate(k*.5);g.globalAlpha=1-k*.3;
        const BW=L.BW,BH=L.BH;
        g.fillStyle='rgba(0,0,0,.25)';rr(g,-BW/2+5,-BH/2+8,BW,BH,16*S);g.fill();
        const gr=g.createLinearGradient(0,-BH/2,0,BH/2);gr.addColorStop(0,'#c4e8f6');gr.addColorStop(1,'#78b8d8');
        g.fillStyle=gr;rr(g,-BW/2,-BH/2,BW,BH,16*S);g.fill();
        g.fillStyle='rgba(255,255,255,.4)';rr(g,-BW/2+8,-BH/2+6,BW-16,BH*.18,10*S);g.fill();
        // ひよこの絵
        g.fillStyle='#ffe066';g.beginPath();g.arc(-BW*.25,BH*.05,BH*.16,0,6.283);g.fill();g.beginPath();g.arc(-BW*.25+BH*.12,-BH*.08,BH*.1,0,6.283);g.fill();
        g.fillStyle='#f39a2c';g.beginPath();g.moveTo(-BW*.25+BH*.2,-BH*.09);g.lineTo(-BW*.25+BH*.27,-BH*.06);g.lineTo(-BW*.25+BH*.2,-BH*.03);g.fill();
        g.fillStyle='#222';g.beginPath();g.arc(-BW*.25+BH*.14,-BH*.1,BH*.018,0,6.283);g.fill();
        // メモ
        drawNote(BW*.18,BH*.02,BW*.42,BH*.62,.04,1);
        g.restore();
      }
      // 娘の手（空色スモックの袖）
      const hy=L.by+L.BH+4*S;
      [[L.bx+L.BW*.18,1],[L.bx+L.BW*.82,-1]].forEach(([hx,sd])=>{g.save();g.translate(hx,hy);g.scale(sd,1);
        g.fillStyle='#f6d2b2';g.beginPath();g.ellipse(0,0,16*S,11*S,-.3,0,6.283);g.fill();
        for(let i=0;i<3;i++){g.beginPath();g.ellipse(-8*S+i*6*S,-9*S,3.4*S,6*S,0,0,6.283);g.fill();}
        g.fillStyle='#8fd0f0';g.fillRect(-14*S,6*S,28*S,14*S);g.fillStyle='#f4fbff';g.fillRect(-14*S,6*S,28*S,3*S);g.restore();});
      // 見出し
      const a=clamp(pt/.5,0,1);
      g.globalAlpha=a;
      g.fillStyle='rgba(255,255,255,.75)';rr(g,W/2-90*S,10*S,180*S,26*S,13*S);g.fill();
      txt('── 翌日、'+(ensoku?'遠足のお昼 ':'保育園のお昼 ')+'──',W/2,23*S,12*S,'#6a4a3a');
      g.globalAlpha=1;
      // 子どもの吹き出し
      if(pt>1.3){
        const r=computeRes();
        const k2=clamp((pt-1.3)/.35,0,1);
        const bw=Math.min(W*.86,330*S),bh=66*S,bxx=W/2-bw/2,byy=44*S;
        g.save();g.translate(W/2,byy+bh/2);g.scale(eback(k2),eback(k2));g.translate(-W/2,-(byy+bh/2));
        g.fillStyle='rgba(0,0,0,.15)';rr(g,bxx+3,byy+4,bw,bh,18*S);g.fill();
        g.fillStyle='#fffaf0';rr(g,bxx,byy,bw,bh,18*S);g.fill();
        g.beginPath();g.moveTo(W/2-10*S,byy+bh-1);g.lineTo(W/2+12*S,byy+bh-1);g.lineTo(W/2+2*S,byy+bh+14*S);g.fill();
        g.strokeStyle='#f0a0b0';g.lineWidth=2*S;rr(g,bxx,byy,bw,bh,18*S);g.stroke();
        const n=Math.floor((pt-1.5)*22);
        const s1=r.child[0],s2=r.child[1];
        txt(s1.slice(0,clamp(n,0,s1.length)),W/2,byy+bh*.36,14*S,'#5a3a2a');
        txt(s2.slice(0,clamp(n-s1.length,0,s2.length)),W/2,byy+bh*.7,13*S,'#8a5a4a');
        // 娘の顔
        const kim=KIMG[r.grade==='poor'?'normal':'happy'];
        if(imgOk(kim)){const kr=24*S,kx=bxx+kr*.7,ky=byy+bh+kr*.9;
          g.save();g.beginPath();g.arc(kx,ky,kr,0,6.283);g.fillStyle='#fff3e0';g.fill();g.clip();
          g.drawImage(kim,70,30,372,372,kx-kr*1.05,ky-kr*1.05,kr*2.1,kr*2.1);g.restore();
          g.strokeStyle='#f0a0b0';g.lineWidth=2*S;g.beginPath();g.arc(kx,ky,kr,0,6.283);g.stroke();}
        g.restore();
      }
      if(pt>1.6){const tAlpha=.5+.5*Math.sin(T*4);txtO('タップで つづける',W/2,H-16*S,12*S,`rgba(255,255,255,${tAlpha})`,'rgba(80,50,40,.6)',3*S);}
    }
    function drawNote(x,y,w,h,rot,a){
      const r=computeRes();
      g.save();g.translate(x,y);g.rotate(rot);g.globalAlpha=a;
      g.fillStyle='rgba(0,0,0,.25)';g.fillRect(-w/2+3,-h/2+4,w,h);
      g.fillStyle='#fffbef';g.fillRect(-w/2,-h/2,w,h);
      g.strokeStyle='rgba(120,170,220,.35)';g.lineWidth=1;for(let i=1;i<4;i++){const yy=-h/2+h*i/4;g.beginPath();g.moveTo(-w/2+5,yy);g.lineTo(w/2-5,yy);g.stroke();}
      g.fillStyle='rgba(255,220,150,.6)';g.save();g.rotate(-.1);g.fillRect(-w*.18,-h/2-5*S,w*.36,10*S);g.restore();
      const lines=r.note.split('\n');
      const fs=Math.min(11*S,w/13.5);
      lines.forEach((l,i)=>txt(l,0,-h/2+h*(i+1)/4-h*.03,fs,'#4a3022'));
      txt('パパより',w/2-6*S,h/2-h*.14,fs*.9,'#8a5a3a','right');
      if(r.grade==='great')drawHanamaru(-w/2+h*.2,h/2-h*.17,h*.12);
      g.restore();
    }
    function drawHanamaru(x,y,r){
      g.save();g.translate(x,y);g.strokeStyle='#e8303a';g.lineWidth=Math.max(1.5,r*.12);g.lineCap='round';
      g.beginPath();for(let a=0;a<6.283*2.2;a+=.2){const rr2=r*(.25+a*.06);g.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2);}g.stroke();
      for(let i=0;i<7;i++){const a=i/7*6.283;g.beginPath();g.arc(Math.cos(a)*r*1.15,Math.sin(a)*r*1.15,r*.3,a-1.4,a+1.4);g.stroke();}
      g.restore();
    }
    function drawFinal(){
      const r=computeRes();
      g.drawImage(morningBg,0,0,W,H);
      drawPlateScene();
      g.fillStyle=`rgba(14,8,10,${clamp(pt/.3,0,1)*.78})`;g.fillRect(0,0,W,H);
      const pw=Math.min(W-24,360*S),px=W/2-pw/2,sR=Math.min(38*S,pw*.13),sy=14*S+262*S,by3=sy+sR*2.6,py=14*S,phh=Math.min(H-28*S,by3-py+140*S);
      const k=eo(pt/.4);
      g.save();g.globalAlpha=k;g.translate(0,(1-k)*20);
      g.fillStyle='rgba(16,10,14,.95)';rr(g,px,py,pw,phh,12*S);g.fill();
      g.strokeStyle='rgba(232,184,48,.6)';g.lineWidth=1.5;rr(g,px+.5,py+.5,pw-1,phh-1,12*S);g.stroke();
      txt('今夜のお弁当',W/2,py+22*S,15*S,'#f6e6c8');
      // ランク
      const gc={S:'#ffd65a',A:'#62f2da',B:'#c8b8ff',C:'#ff8a9a'}[r.letter];
      const sk=pt<.5?0:eback((pt-.5)/.3);
      g.save();g.translate(px+pw*.2,py+76*S);g.scale(sk,sk);g.rotate(-.12);
      g.shadowColor=gc;g.shadowBlur=18;txtO(r.letter,0,0,56*S,gc,'rgba(0,0,0,.8)',5*S);g.shadowBlur=0;g.restore();
      txt('総合',px+pw*.42,py+58*S,11*S,'#bbaedd','left');
      txtO(String(Math.round(r.total*clamp((pt-.3)/.6,0,1))),px+pw*.42,py+84*S,30*S,'#fff4dc','rgba(0,0,0,.6)',3*S,'left');
      txt(r.isBest?'NEW RECORD!':'ベスト '+Math.max(r.prevBest,r.total),px+pw*.95,py+62*S,11*S,r.isBest?'#ffd65a':'#8e80a8','right');
      if(r.isBest&&Math.sin(T*6)>0)drawStar(px+pw*.95-90*S,py+62*S,5*S,T,'#ffd65a');
      // 内訳
      const rows=[[V.egg.name,r.eggS],[V.tako.name,r.takoS],[V.oni.name,r.oniS],['盛り付け',r.plateS]];
      rows.forEach(([n,v],i)=>{const yy=py+118*S+i*25*S,bk=clamp((pt-.6-i*.12)/.4,0,1);
        txt(n,px+16*S,yy,11.5*S,'#deccf8','left');
        const bx2=px+pw*.52,bw2=pw*.33;g.fillStyle='rgba(255,255,255,.08)';rr(g,bx2,yy-5*S,bw2,10*S,5*S);g.fill();
        const gr=g.createLinearGradient(bx2,0,bx2+bw2,0);gr.addColorStop(0,'#e8903a');gr.addColorStop(1,'#ffd65a');g.fillStyle=gr;rr(g,bx2,yy-5*S,Math.max(1,bw2*v/100*bk),10*S,5*S);g.fill();
        txt(String(Math.round(v*bk)),px+pw-14*S,yy,12*S,'#fff4dc','right');});
      // 夜食とメモ
      const sx=px+pw*.24;
      drawSnack(sx,sy,sR);
      txt('夜食：端っこと残りごはん',sx,sy+sR*1.95,10*S,'#bbaedd');
      drawNote(px+pw*.7,sy+sR*.5,pw*.48,sR*2.2,-.04,1);
      // レシピ帳
      const total=Object.values(CK_RECIPES).reduce((s,a)=>s+a.length,0);
      const have=new Set(Object.keys(cd.book));[V.egg,V.tako,V.oni].forEach(x=>have.add(x.id));
      txt(`レシピ帳 ${have.size}/${total}`,px+16*S,by3,11.5*S,'#e8b830','left');
      let line='';
      if(r.newRec.length)line='NEW：'+r.newRec.join('・');
      const lines=wrap(line,pw-32*S,10*S);
      lines.slice(0,2).forEach((l,i)=>txt(l,px+16*S,by3+17*S+i*14*S,10*S,'#62f2da','left'));
      if(r.unlockNext.length){txt('次回：'+r.unlockNext.join('・')+' が作れそう',px+16*S,by3+17*S+Math.min(2,lines.length)*14*S,10*S,'#c8b8ff','left');}
      // 立ち絵
      const face=r.grade==='great'?IMG.win:r.grade==='ok'?IMG.happy:IMG.tired;
      if(pt>.9){const qy=by3+50*S;drawPortrait(px+16*S,qy,58*S,face);
        const sayl={great:'……花まる弁当。ふた開けた顔、見たかったわね。',ok:'……悪くないわ。また作ろう。',poor:'……ちょっと焦げた。愛情は焦げてないわよ。'}[r.grade];
        const ls=wrap(sayl,pw-100*S,11*S);ls.forEach((l,i)=>txt(l,px+84*S,qy+18*S+i*15*S,11*S,'#f6e6c8','left'));}
      if(pt>.9){const al=.5+.5*Math.sin(T*4);txt('タップで片付けて寝る',W/2,py+phh-12*S,11.5*S,`rgba(232,184,48,${al})`);}
      g.restore();
    }
    function drawSnack(sx,sy,sR,mug){
      if(mug){ // 麦茶のマグ
        const mx=sx+sR*1.9,my=sy+sR*.2,mw=sR*.62,mh=sR*.8;
        g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(mx+3,my+mh/2+4,mw*.9,mw*.3,0,0,6.283);g.fill();
        g.strokeStyle='#d8cfc0';g.lineWidth=4*S;g.beginPath();g.arc(mx+mw*.75,my,mw*.32,-1.2,1.2);g.stroke();
        const gr=g.createLinearGradient(mx-mw*.7,0,mx+mw*.7,0);gr.addColorStop(0,'#bdb3a4');gr.addColorStop(.4,'#f4eee4');gr.addColorStop(1,'#a89e90');
        g.fillStyle=gr;rr(g,mx-mw*.7,my-mh/2,mw*1.4,mh,6*S);g.fill();
        g.fillStyle='#8a5a2a';g.beginPath();g.ellipse(mx,my-mh/2+3*S,mw*.62,mw*.2,0,0,6.283);g.fill();
        g.fillStyle='rgba(255,220,160,.35)';g.beginPath();g.ellipse(mx-mw*.2,my-mh/2+2*S,mw*.25,mw*.06,0,0,6.283);g.fill();
      }
      drawPlateDish(sx,sy+sR*.4,sR*1.25);
      drawEggSlice(sx-sR*.35,sy+sR*.3,sR*.32,.3,avg(egg.layers)||.6);
      drawOni(sx+sR*.35,sy+sR*.35,sR*.45,-.2,{p:oni.shapeP,paint:true,grill:avg(oni.cs),gloss:.6});
    }
    function drawPortrait(x,y,s,im){
      g.save();
      g.fillStyle='rgba(0,0,0,.4)';rr(g,x+3,y+4,s,s,8*S);g.fill();
      const gr=g.createLinearGradient(0,y,0,y+s);gr.addColorStop(0,'#3a2440');gr.addColorStop(1,'#1a1020');g.fillStyle=gr;rr(g,x,y,s,s,8*S);g.fill();
      rr(g,x,y,s,s,8*S);g.clip();
      if(imgOk(im))g.drawImage(im,x,y,s,s);
      else{g.fillStyle='#8a52d4';g.beginPath();g.arc(x+s/2,y+s*.45,s*.25,0,6.283);g.fill();}
      g.restore();
      g.strokeStyle='rgba(232,184,48,.75)';g.lineWidth=1.5;rr(g,x,y,s,s,8*S);g.stroke();
    }

    // ── タイトル・お話 ──
    function drawLogo(cx,cy,k){
      g.save();g.translate(cx,cy);
      // フライパンの紋章
      const R=34*S;
      g.save();g.translate(0,-48*S);
      g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.5;g.drawImage(glowSpr,-R*2.2,-R*2.2,R*4.4,R*4.4);g.restore();
      g.fillStyle='#2a2830';g.beginPath();g.arc(0,0,R,0,6.283);g.fill();
      g.strokeStyle='#5a5a66';g.lineWidth=3*S;g.stroke();
      g.save();g.rotate(.6);g.fillStyle='#6a4428';rr(g,R*.95,-5*S,R*.9,10*S,5*S);g.fill();g.restore();
      // 目玉焼き
      g.fillStyle='#fffaf0';g.beginPath();g.moveTo(-R*.6,0);g.bezierCurveTo(-R*.7,-R*.6,R*.2,-R*.75,R*.55,-R*.25);g.bezierCurveTo(R*.8,R*.2,R*.1,R*.7,-R*.3,R*.5);g.closePath();g.fill();
      const yg=g.createRadialGradient(-R*.05,-R*.1,1,0,0,R*.3);yg.addColorStop(0,'#fff0a0');yg.addColorStop(.4,'#ffc830');yg.addColorStop(1,'#e8901a');
      g.fillStyle=yg;g.beginPath();g.arc(0,0,R*.28,0,6.283);g.fill();
      g.fillStyle='rgba(255,255,255,.8)';g.beginPath();g.ellipse(-R*.08,-R*.1,R*.08,R*.04,-.5,0,6.283);g.fill();
      // 湯気
      g.strokeStyle='rgba(255,245,230,.55)';g.lineWidth=2.5*S;g.lineCap='round';
      for(let i=-1;i<=1;i++){g.beginPath();for(let j=0;j<=10;j++){const yy=-R*1.1-j*3*S,xx=i*12*S+Math.sin(T*3+j*.6+i)*4*S;if(j===0)g.moveTo(xx,yy);else g.lineTo(xx,yy);}g.stroke();}
      g.restore();
      // 文字
      g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.35*k;g.drawImage(glowSpr,-130*S,-10*S,260*S,70*S);g.restore();
      txtO('深夜の',-8*S,4*S,16*S,'#f6d8a8','#2a1408',4*S,'right');
      g.font=`${Math.round(34*S)}px ${FONT}`;
      txtO('夜食づくり',0,34*S,34*S,'#ffe9b8','#2a1408',6*S);
      g.fillStyle='rgba(232,184,48,.7)';g.fillRect(-90*S,58*S,180*S,1.5);
      txt('LATE NIGHT KITCHEN',0,70*S,10*S,'#e8b830');
      g.restore();
    }
    function drawTitle(){
      g.fillStyle='rgba(8,4,6,.55)';g.fillRect(0,0,W,H);
      drawLogo(W/2,H*.36,1);
      const lines=['● 光る金色ゾーンでタップ（Space）','● 卵焼き → ウインナー → 焼きおにぎり','● 最後はお弁当箱へドラッグで盛り付け'];
      lines.forEach((l,i)=>txt(l,W/2,H*.55+i*20*S,11.5*S,'#deccf8'));
      txt(cd.plays?`ベスト ${cd.best}点 ${cd.bestGrade?'（'+cd.bestGrade+'）':''}　作った回数 ${cd.plays}`:'はじめての夜食づくり',W/2,H*.55+72*S,11*S,'#8e80a8');
      const today=`今夜の献立：${V.egg.name}／${V.tako.name}／${V.oni.name}`;
      const ls=wrap(today,W-40,10.5*S);ls.forEach((l,i)=>txt(l,W/2,H*.55+92*S+i*15*S,10.5*S,'#e8b830'));
      const al=.5+.5*Math.sin(T*4);
      txtO('TAP TO START',W/2,H*.88,15*S,`rgba(255,236,190,${al})`,'rgba(40,20,8,.8)',3*S);
      txt('難しさ：'+MG_DIFF_NAMES[DIFF],W/2,H*.88+20*S,10.5*S,DIFF==='easy'?'#44ee88':DIFF==='normal'?'#e8b830':'#ff6a86');
    }
    function drawStory(){
      const line=story.lines[story.i];
      g.fillStyle='rgba(8,4,6,.5)';g.fillRect(0,0,W,H);
      // おたより・クレヨンのメモ
      if(line.note){
        const k=eback(clamp(story.t/.35,0,1));
        const nw=Math.min(W*.6,220*S),nh=nw*.62;
        g.save();g.translate(W/2,H*.4);g.rotate(line.crayon?.06:-.04);g.scale(k,k);
        g.fillStyle='rgba(0,0,0,.4)';g.fillRect(-nw/2+4,-nh/2+6,nw,nh);
        g.fillStyle=line.crayon?'#fdf3dc':'#f4f1ea';g.fillRect(-nw/2,-nh/2,nw,nh);
        // 磁石
        g.fillStyle=line.crayon?'#e2508a':'#3fa0e0';g.beginPath();g.arc(0,-nh/2+4*S,7*S,0,6.283);g.fill();
        g.fillStyle='rgba(255,255,255,.5)';g.beginPath();g.arc(-2*S,-nh/2+2*S,2.4*S,0,6.283);g.fill();
        if(line.crayon){
          const ls=line.note.split('\n');ls.forEach((l,i)=>{g.save();g.rotate((i-.5)*.05);txt(l,0,-nh*.08+i*nh*.3,22*S,i?'#e2508a':'#f08a2a');g.restore();});
          // 落書きのたこ
          g.save();g.translate(nw*.32,nh*.25);g.strokeStyle='#e2508a';g.lineWidth=2*S;g.beginPath();g.arc(0,-6*S,8*S,Math.PI,0);g.stroke();for(let i=0;i<4;i++){g.beginPath();g.moveTo(-6*S+i*4*S,-6*S);g.quadraticCurveTo(-8*S+i*5*S,4*S,-6*S+i*5*S,8*S);g.stroke();}g.restore();
        }else{
          txt('ほいくえん だより',0,-nh*.3,12*S,'#3a5a8a');
          g.fillStyle='rgba(60,90,140,.3)';g.fillRect(-nw*.4,-nh*.17,nw*.8,1);
          txt(line.note,0,nh*.02,17*S,'#c0392b');
          txt('おべんとう・すいとう',0,nh*.27,10*S,'#555');
        }
        g.restore();
      }
      // 会話ウィンドウ
      const bh=Math.max(96*S,H*.17),by=H-bh-10*S,bx=10*S,bw=W-20*S;
      g.fillStyle='rgba(14,8,12,.93)';rr(g,bx,by,bw,bh,10*S);g.fill();
      g.strokeStyle='rgba(232,184,48,.55)';g.lineWidth=1.5;rr(g,bx+.5,by+.5,bw-1,bh-1,10*S);g.stroke();
      const ps=Math.min(bh+18*S,110*S);
      const face=IMG[line.face]||IMG.normal;
      drawPortrait(bx+10*S,by-ps*.38,ps*.95,face);
      const tx=bx+ps+20*S;
      if(line.who){g.fillStyle='rgba(138,82,212,.85)';rr(g,tx-4*S,by-10*S,70*S,20*S,4*S);g.fill();txt(line.who,tx+31*S,by,11*S,'#fff');}
      const n=Math.floor(story.t*28);
      const shown=line.text.slice(0,n);
      const ls=wrap(shown,bw-(tx-bx)-12*S,13*S);
      ls.forEach((l,i)=>txt(l,tx,by+24*S+i*20*S,13*S,'#f6e6c8','left'));
      if(n>=line.text.length&&Math.sin(T*6)>0){g.fillStyle='#e8b830';g.beginPath();g.moveTo(bx+bw-18*S,by+bh-16*S);g.lineTo(bx+bw-8*S,by+bh-16*S);g.lineTo(bx+bw-13*S,by+bh-9*S);g.fill();}
      txt(`${story.i+1}/${story.lines.length}`,bx+bw-12*S,by+12*S,9*S,'#5e5078','right');
    }

    // ── 共通UI ──
    function drawGauge(){
      if(!gauge.show)return;
      const w=L.GW,h=16*S,x=W/2-w/2,y=L.GY-h/2;
      txtO(gauge.label,x,y-11*S,12*S,'#f6e6c8','rgba(20,10,6,.85)',3*S,'left');
      if(gauge.right)txtO(gauge.right,x+w,y-11*S,11*S,'#e8b830','rgba(20,10,6,.85)',3*S,'right');
      g.fillStyle='rgba(10,6,8,.8)';rr(g,x-3,y-3,w+6,h+6,(h+6)/2);g.fill();
      const gr=g.createLinearGradient(x,0,x+w,0);for(let i=0;i<=8;i++)gr.addColorStop(i/8,ramp(gauge.ramp,i/8));
      g.fillStyle=gr;rr(g,x,y,w,h,h/2);g.fill();
      g.fillStyle='rgba(0,0,0,.35)';rr(g,x,y+h*.55,w,h*.45,h/2);g.fill();
      const gx=v=>x+clamp(v,0,1)*w;
      g.fillStyle='rgba(255,255,255,.28)';g.fillRect(gx(gauge.ga),y,gx(gauge.gb)-gx(gauge.ga),h);
      const pul=.65+.35*Math.sin(T*8);
      g.strokeStyle=`rgba(255,214,90,${pul*.25})`;g.lineWidth=7;g.strokeRect(gx(gauge.pa),y-3,gx(gauge.pb)-gx(gauge.pa),h+6);g.save();g.strokeStyle=`rgba(255,214,90,${pul})`;g.lineWidth=2.5;g.strokeRect(gx(gauge.pa),y-3,gx(gauge.pb)-gx(gauge.pa),h+6);g.restore();
      g.fillStyle='rgba(255,214,90,.35)';g.fillRect(gx(gauge.pa),y,gx(gauge.pb)-gx(gauge.pa),h);
      const v=gauge.lockT>0?gauge.lockV:gauge.v;
      const nx=gx(v);
      g.fillStyle='rgba(0,0,0,.5)';g.fillRect(nx-2,y-6*S,5,h+12*S);
      g.fillStyle=gauge.lockT>0?QC[gauge.lockQ]:'#fff';g.fillRect(nx-1.5,y-6*S,3,h+12*S);
      g.beginPath();g.moveTo(nx-6*S,y-12*S);g.lineTo(nx+6*S,y-12*S);g.lineTo(nx,y-5*S);g.fill();
      if(tutorial&&(ph==='egg_heat'||(ph==='egg_cook'&&egg.layers.length===0))){
        const k=(T*1.4)%1;
        txtO('ここで タップ！',gx((gauge.pa+gauge.pb)/2),y+h+16*S,11*S,'#ffe9a8','rgba(30,15,5,.85)',3*S);
        g.strokeStyle=`rgba(255,226,120,${1-k})`;g.lineWidth=2;g.beginPath();g.arc(gx((gauge.pa+gauge.pb)/2),y+h/2,8*S+k*16*S,0,6.283);g.stroke();
      }
    }
    function drawHint(){
      if(!hint||banner||wipe)return;
      let sz=12.5*S;font(sz);let tw=g.measureText(hint).width;
      if(tw+30*S>W-12){sz*= (W-12-30*S)/tw;font(sz);tw=g.measureText(hint).width;}
      const pw=tw+26*S,phh=24*S,x=W/2-pw/2,y=L.hintY-phh/2;
      g.fillStyle='rgba(14,8,10,.82)';rr(g,x,y,pw,phh,phh/2);g.fill();
      g.strokeStyle='rgba(232,184,48,.5)';g.lineWidth=1;rr(g,x+.5,y+.5,pw-1,phh-1,phh/2);g.stroke();
      txt(hint,W/2,L.hintY+1,sz,'#f6e6c8');
    }
    function drawBanner(){
      if(!banner)return;
      const b=banner,k=b.t<.25?eo(b.t/.25):b.t>b.dur-.25?1-eo((b.t-(b.dur-.25))/.25):1;
      g.fillStyle=`rgba(8,4,6,${.55*k})`;g.fillRect(0,0,W,H);
      const w=Math.min(W*.84,320*S),h=128*S,x=W/2-w/2,y=H*.42-h/2;
      g.save();g.globalAlpha=k;g.translate(W/2,y+h/2);g.scale(.9+.1*k,.9+.1*k);g.translate(-W/2,-(y+h/2));
      const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#2a1810');gr.addColorStop(1,'#140a08');
      g.fillStyle=gr;rr(g,x,y,w,h,12*S);g.fill();
      g.strokeStyle='rgba(232,184,48,.75)';g.lineWidth=2;rr(g,x+1,y+1,w-2,h-2,12*S);g.stroke();
      g.strokeStyle='rgba(232,184,48,.25)';g.lineWidth=1;rr(g,x+6,y+6,w-12,h-12,9*S);g.stroke();
      // 料理のアイコン
      const ix=x+w*.2,iy=y+h*.55;
      const glow=.4+.2*Math.sin(T*4);g.save();g.globalCompositeOperation='lighter';g.globalAlpha=glow*k;g.drawImage(glowSpr,ix-44*S,iy-44*S,88*S,88*S);g.restore();
      if(b.d.key==='egg')drawEggSlice(ix,iy,15*S,-.15,.62);
      else if(b.d.key==='tako')drawSausage(ix,iy,40*S,.15,.72,.5,.8,true,4);
      else if(b.d.key==='oni')drawOni(ix,iy,22*S,0,{p:1,grill:.7,gloss:.7});
      else{g.save();g.translate(ix,iy);g.fillStyle='#7ec4e4';rr(g,-24*S,-16*S,48*S,32*S,6*S);g.fill();g.fillStyle='#f2ede3';rr(g,-20*S,-12*S,18*S,24*S,3*S);g.fill();rr(g,1*S,-12*S,19*S,11*S,3*S);g.fill();rr(g,1*S,1*S,19*S,11*S,3*S);g.fill();g.fillStyle='#ffd650';g.fillRect(4*S,-9*S,12*S,5*S);g.fillStyle='#e05a4a';g.beginPath();g.arc(10*S,7*S,4*S,0,6.283);g.fill();g.restore();}
      txt(b.d.no,x+w*.4,y+h*.28,12*S,'#e8b830','left');
      const nameSz=Math.min(24*S,(w*.56)/Math.max(4,b.d.name.length));
      txtO(b.d.name,x+w*.4,y+h*.52,nameSz,'#fff0d0','rgba(0,0,0,.6)',3*S,'left');
      const ls=wrap(b.d.sub,w*.56,10.5*S);ls.slice(0,2).forEach((l,i)=>txt(l,x+w*.4,y+h*.76+i*14*S,10.5*S,'#c8b090','left'));
      g.restore();
    }
    function drawWipe(){
      if(!wipe)return;
      const t=wipe.t;
      let a0,a1;
      if(t<WIPE_IN){a0=0;a1=eio(t/WIPE_IN);}else{a0=eio((t-WIPE_IN)/WIPE_IN);a1=1;}
      const ext=W+H*.4;
      const xL=-H*.4+a0*ext,xR=-H*.4+a1*ext;
      if(xR<=xL)return;
      g.save();
      g.beginPath();g.moveTo(xL,0);g.lineTo(xR+H*.4,0);g.lineTo(xR,H);g.lineTo(xL-H*.4,H);g.closePath();
      g.clip();
      // 暖簾（のれん）
      const gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#2a1438');gr.addColorStop(1,'#140a1e');
      g.fillStyle=gr;g.fillRect(0,0,W,H);
      g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=2;for(let x=W/5;x<W;x+=W/5){g.beginPath();g.moveTo(x,H*.18);g.lineTo(x,H);g.stroke();}
      g.fillStyle='rgba(232,184,48,.12)';g.fillRect(0,0,W,H*.06);
      g.save();g.globalAlpha=.9;txtO('夜食',W/2,H*.45,46*S,'#f0e0c0','rgba(0,0,0,.5)',4*S);g.restore();
      g.strokeStyle='rgba(240,224,192,.6)';g.lineWidth=2*S;g.beginPath();g.arc(W/2,H*.45,48*S,0,6.283);g.stroke();
      g.restore();
      g.strokeStyle='#e8b830';g.lineWidth=3;g.beginPath();g.moveTo(xR+H*.4,0);g.lineTo(xR,H);g.stroke();
      if(a0>0){g.beginPath();g.moveTo(xL,0);g.lineTo(xL-H*.4,H);g.stroke();}
    }
    function drawRain(dt){
      const w=L.win;if(!w)return;
      g.save();g.beginPath();g.rect(w.x,w.y,w.w,w.h);g.clip();
      g.strokeStyle='rgba(170,190,255,.35)';g.lineWidth=1;
      for(const d of rain){d.y+=d.s*dt*1.6;if(d.y>1.1){d.y=-.1;d.x=Math.random();}
        const x=w.x+d.x*w.w,y=w.y+d.y*w.h;g.beginPath();g.moveTo(x,y);g.lineTo(x-2,y+d.l*w.h);g.stroke();}
      g.restore();
    }

    // ── メインループ ──
    function update(dt){
      T+=dt;
      updParticles(dt);
      shake=Math.max(0,shake-dt*30);flash=Math.max(0,flash-dt*1.6);
      if(gauge.lockT>0)gauge.lockT-=dt;
      if(wipe){
        wipe.t+=dt;
        if(!wipe.fired&&wipe.t>=WIPE_IN){wipe.fired=true;wipe.mid();}
        if(wipe.t>=WIPE_IN*2){wipe=null;}
        SND.sizzle(0);
        return;
      }
      if(banner){banner.t+=dt;if(banner.t>=banner.dur)banner=null;return;}
      if(hitstop>0){hitstop-=dt;return;}
      if(buf>0){buf-=dt;if(acceptsTap()){buf=0;act();}}
      if(ph==='story'){story.t+=dt;return;}
      pt+=dt;
      if(ph.startsWith('egg'))updEgg(dt);
      else if(ph.startsWith('tako'))updTako(dt);
      else if(ph.startsWith('oni'))updOni(dt);
      else if(ph.startsWith('plate'))updPlate(dt);
      else if(ph==='morning'){
        if(res&&res.grade==='great'&&pt>1.3)every('mh',4,dt,()=>emit('heart',L.cx+rnd(-L.BW*.4,L.BW*.4),L.by+L.BH*.5,rnd(-10,10),-50*S,1.6,rnd(5,8)*S,Math.random()<.5?'#ff7aa8':'#ffb0c8'));
        if(pt>.7&&pt-dt<=.7){SND.flip();sparkle(L.cx,L.by+L.BH/2,24);}
        if(pt>1.3&&pt-dt<=1.3)SND.se(res&&res.grade==='poor'?'notif':'ach');
      }
    }
    function draw(dt){
      g.setTransform(dpr,0,0,dpr,0,0);
      const sx=shake?rnd(-shake,shake):0,sy=shake?rnd(-shake,shake):0;
      const morningish=ph==='morning'||ph==='final'||(ph==='wait2'&&wipe&&wipe.fired);
      if(morningish){
        if(ph==='final')drawFinal();else drawMorning();
        drawParticles();drawPops();
        drawWipe();
        return;
      }
      g.drawImage(bg,0,0,W,H);
      drawRain(dt);
      g.save();g.translate(sx,sy);
      if(ph==='story'||ph==='intro_wait'){
        // 調理台に並ぶ材料
        drawIngredients();
      }else if(ph.startsWith('egg')||(ph==='wait'&&dishIdx===0))drawEggScene();
      else if(ph==='tako_cut'||ph==='tako_chop'||(ph==='tako_sear'&&false))drawTakoCut();
      else if(ph.startsWith('tako')||(ph==='wait'&&dishIdx===1))drawTakoSear();
      else if(ph.startsWith('oni')||(ph==='wait'&&dishIdx===2))drawOniScene();
      else if(ph.startsWith('plate')||ph==='wait2')drawPlateScene();
      drawParticles();
      g.restore();
      g.drawImage(vig,0,0,W,H);
      if(flash>0){g.fillStyle=`rgba(${flashCol},${flash*.35})`;g.fillRect(0,0,W,H);}
      drawGauge();
      drawPops();
      drawHint();
      if(ph==='title')drawTitle();
      if(ph==='story'||ph==='intro_wait')drawStory();
      drawBanner();
      drawWipe();
    }
    function drawIngredients(){
      const y=L.CY+L.PH*.15;
      drawPlateDish(L.cx-W*.22,y,32*S);
      for(let i=0;i<3;i++){const ex=L.cx-W*.22+(i-1)*14*S,ey=y-4*S+(i%2)*8*S;const gr=g.createRadialGradient(ex-4*S,ey-5*S,1,ex,ey,12*S);gr.addColorStop(0,'#fff8ec');gr.addColorStop(1,'#e8c9a0');g.fillStyle=gr;g.beginPath();g.ellipse(ex,ey,9*S,11.5*S,0,0,6.283);g.fill();}
      drawSausage(L.cx+W*.02,y,40*S,1.3,0,.99,0,false,1);
      drawSausage(L.cx+W*.08,y+10*S,40*S,1.4,0,.99,0,false,1);
      drawPlateDish(L.cx+W*.26,y,32*S);
      g.save();g.beginPath();g.arc(L.cx+W*.26,y-4*S,22*S,Math.PI,0);g.lineTo(L.cx+W*.26+22*S,y+6*S);g.lineTo(L.cx+W*.26-22*S,y+6*S);g.clip();g.drawImage(riceTex,L.cx+W*.26-24*S,y-28*S,48*S,40*S);g.restore();
      every('ri',3,1/60,()=>steam(L.cx+W*.26,y-18*S,10*S,1));
    }
    function hud(){
      let html;
      if(ph==='title'||ph==='story'||ph==='intro_wait')html='今夜の献立 <span style="color:var(--gd)">3品＋盛り付け</span>';
      else{const all=[].concat(rec.egg,rec.tako,rec.oni,rec.plate);
        html=`品質 <span style="color:var(--gd)">${all.length?Math.round(avg(all)):'--'}</span>　<span style="color:var(--tx-d)">P${cnt.P} G${cnt.G} M${cnt.M}</span>`;}
      if(html!==lastScore){lastScore=html;mg.setScore(html);}
      const tm=dishIdx<0?'READY':ph==='morning'||ph==='final'?'翌日':`${dishIdx+1}/4 ${DISH[dishIdx].name}`;
      if(tm!==lastTimer){lastTimer=tm;mg.setTimer(tm);}
    }

    resize();
    const onResize=()=>{if(!mg._ended)resize();};
    window.addEventListener('resize',onResize);
    mg.loop(dt=>{update(dt);draw(dt);hud();});
    if(typeof mg.onEnd==='function')mg.onEnd(()=>{SND.stop();window.removeEventListener('resize',onResize);});

    // テスト用（ゲームには影響しない）
    body._ck={st:()=>({ph,pt,gv:gauge.v,gauge:{...gauge},banner:!!banner,wipe:!!wipe,hitstop,egg:{...egg},tako:{i:tako.i,kx:tako.kx,tm:tako.tm,s:tako.s.map(s=>({b:s.b,done:s.done,z:tako.z}))},
      beats:oni.beats.map(b=>({t:b.t,q:b.q})),cov:oni.cov,oc:oni.c,items:plate.items.map(it=>{const p=itemPos(it);return {type:it.type,slot:it.slot,x:p.x,y:p.y};}),
      slots:L.slots.map(s=>({type:s.type,x:s.x,y:s.y})),rec:JSON.parse(JSON.stringify(rec)),res,V:{egg:V.egg.id,tako:V.tako.id,oni:V.oni.id}}),
      saus:i=>{const s=tako.s[i];return s?sausPos(s):null;}};

    return {result(reason){
      window.removeEventListener('resize',onResize);
      SND.stop();
      if(reason!=='done'&&finished)reason='done';
      if(reason!=='done'&&(ph==='morning'||ph==='final'))reason='done';
      if(reason!=='done'){
        return {title:'🍳 夜食づくりを途中でやめた',
          summary:'……今夜はここまで。明日のお弁当は、朝の自分にまかせる。',
          fx:{fatigue:2},time:15,sp:0,log:'夜食づくりを途中でやめた。',cutin:null};
      }
      const r=computeRes();
      const fx=r.grade==='great'?{childStress:-8,mental:5,hope:3,fatigue:5,money:-300}
        :r.grade==='ok'?{childStress:-5,mental:2,fatigue:5,money:-300}
        :{childStress:-2,mental:-1,fatigue:5,money:-300};
      const title=r.grade==='great'?`🍱 花まる弁当！（ランク${r.letter}）`:r.grade==='ok'?`🍱 お弁当ができた（ランク${r.letter}）`:`🍱 ちょっと焦げたお弁当（ランク${r.letter}）`;
      return {
        title,
        summary:`総合（ランク${r.letter}） <span class="${r.grade==='poor'?'down':'up'}">${r.total}</span>`+
          (r.isBest?`<br>ベスト更新 <span class="up">NEW</span>`:'')+
          `<br>${V.egg.name} <span class="${r.eggS>=55?'up':'down'}">${r.eggS}</span>`+
          `<br>${V.tako.name} <span class="${r.takoS>=55?'up':'down'}">${r.takoS}</span>`+
          `<br>${V.oni.name} <span class="${r.oniS>=55?'up':'down'}">${r.oniS}</span>`+
          `<br>盛り付け <span class="${r.plateS>=55?'up':'down'}">${r.plateS}</span>`+
          `<br>「${r.child[0]}」`+(r.newRec.length?`<br>レシピ帳に追加：${r.newRec.join('・')}`:''),
        fx,time:45,sp:r.grade==='great'?1:0,
        log:r.grade==='great'?'深夜に花まるのお弁当を作った。あの子が笑ってくれた。':r.grade==='ok'?'深夜に子どものお弁当を作った。':'焦がしながらも、子どものお弁当を作った。',
        cutin:r.grade==='great'?['win','……花まる弁当。ふた開けた顔、見たかったわね。']:r.grade==='ok'?['happy','……悪くないわ。明日も、いってらっしゃいって言える。']:['tired','……ちょっと焦げたけど。愛情は焦げてないわよ。'],
        after(){
          const d=ckData();
          d.plays++;
          if(r.total>d.best){d.best=r.total;d.bestGrade=r.letter;}
          [V.egg,V.tako,V.oni].forEach(x=>{const b=d.book[x.id]||{name:x.name,made:0,best:0};b.made++;b.name=x.name;
            const sc=x===V.egg?r.eggS:x===V.tako?r.takoS:r.oniS;b.best=Math.max(b.best,sc);d.book[x.id]=b;});
          d.history.unshift({day:gs.day,score:r.total,rank:r.letter});d.history=d.history.slice(0,10);
        },
      };
    }};
  },
});
})();
