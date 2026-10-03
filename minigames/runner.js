// ══════════════════════════════════════════════════════════
// アクション「深夜の買い出しダッシュ」
// 子どもが熱を出した夜。目を覚ます前に、雨の町を走って24時間コンビニへ。
// 横スクロールの自動ランナー。ジャンプ（長押しで高く・2段）とスライディングで障害物をかわす。
// ══════════════════════════════════════════════════════════
addMinigameStyle('runner',`
.mg-runner{background:#05040e;}
.mg-runner .runner-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;outline:none;}
`);

registerMinigame({
  id:'runner', icon:'🏃', name:'深夜の買い出しダッシュ', genre:'アクション', bgm:'stream',
  desc:'子どもが熱を出した。目を覚ます前に、雨の町を走って24時間コンビニへ。冷却シートと、好きなプリンを買いに。',
  effect:'育児ストレス↓ 精神↑ 収入↑ ／ 疲労+8 約40分',
  help:'タップ:ジャンプ／↓スワイプ:スライド',
  start(body,mg){
    // ── 定数 ──
    // ── 記録（gs.runnerData）・天気・ルート ──
    if(!gs.runnerData||typeof gs.runnerData!=='object')gs.runnerData={plays:0,clears:0,best:'',bestTime:0,bestCoins:0};
    const DATA=gs.runnerData;
    const FIRST=!DATA.plays;
    const REMIX=DATA.clears>0;               // 一度クリアすると「近道」ルート（速く・複雑）
    const WEATHERS=[{id:'rain',name:'雨',drops:130},{id:'mist',name:'霧雨',drops:80},{id:'storm',name:'雷雨',drops:190}];
    const WEATHER=WEATHERS[Math.abs(gs.day|0)%3];
    const ROUTE=REMIX?'近道（リミックス）':'いつもの道';
    const M=20, GOAL_M=900, GOAL=GOAL_M*M, WAKE=REMIX?66:70, MAX_HP=3, PX=72, COIN=30, COIN_CAP=3000;
    const SPD=REMIX?1.08:1;
    const STAGES=[{m:0,no:'STAGE 1',name:'眠る住宅街'},{m:300,no:'STAGE 2',name:'ネオン商店街'},{m:600,no:'STAGE 3',name:'高架下の工事区間'}];
    const stageAt=wx=>wx>=STAGES[2].m*M?2:wx>=STAGES[1].m*M?1:0;
    const GRADE_RANK={S:4,A:3,B:2,C:1};

    // ── 効果音（Web Audioで合成。使えなければ AU.se） ──
    let noiseBuf=null;
    function actx(){
      if(typeof AU==='undefined'||typeof AUDIO_SET==='undefined'||!(AUDIO_SET.se>0))return null;
      try{AU.init();}catch(e){}
      const c=AU.ctx;if(!c)return null;
      if(c.state==='suspended')c.resume().catch(()=>{});
      return c;
    }
    function tone(c,type,f0,f1,dur,gain,delay){
      const t0=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();
      o.type=type;o.frequency.setValueAtTime(f0,t0);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t0+dur);
      g.gain.setValueAtTime(.0001,t0);g.gain.linearRampToValueAtTime(Math.max(.0002,gain*AUDIO_SET.se),t0+.008);
      g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
      o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+dur+.03);
    }
    function noise(c,dur,gain,ft,f0,f1,delay){
      if(!noiseBuf){noiseBuf=c.createBuffer(1,c.sampleRate|0,c.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
      const t0=c.currentTime+(delay||0),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
      s.buffer=noiseBuf;f.type=ft;f.frequency.setValueAtTime(f0,t0);if(f1)f.frequency.exponentialRampToValueAtTime(f1,t0+dur);
      g.gain.setValueAtTime(Math.max(.0002,gain*AUDIO_SET.se),t0);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
      s.connect(f);f.connect(g);g.connect(c.destination);s.start(t0);s.stop(t0+dur+.03);
    }
    const SFX={
      jump:c=>tone(c,'square',260,640,.12,.045),
      jump2:c=>{tone(c,'square',440,1040,.13,.04);tone(c,'triangle',880,1760,.1,.02,.03);},
      land:c=>noise(c,.07,.06,'lowpass',900,250),
      slide:c=>noise(c,.28,.08,'bandpass',2600,600),
      coin:c=>{tone(c,'square',988,0,.06,.035);tone(c,'square',1319,0,.18,.035,.06);},
      drink:c=>[523,659,784,1047].forEach((f,i)=>tone(c,'triangle',f,0,.12,.06,i*.06)),
      purin:c=>[784,988,1175,1568,1319,1568].forEach((f,i)=>tone(c,'square',f,0,.1,.03,i*.07)),
      hit:c=>{noise(c,.2,.16,'lowpass',2400,200);tone(c,'sawtooth',190,55,.24,.08);},
      splash:c=>noise(c,.32,.1,'bandpass',3200,700),
      cat:c=>{tone(c,'triangle',950,520,.16,.05);tone(c,'triangle',1100,700,.12,.03,.05);},
      horn:c=>{tone(c,'square',370,0,.4,.03);tone(c,'square',466,0,.4,.026);},
      thunder:c=>{noise(c,1.8,.2,'lowpass',500,50);noise(c,.25,.12,'lowpass',2500,300);},
      train:c=>noise(c,2.6,.07,'lowpass',260,120),
      stage:c=>[523,659,784,1047].forEach((f,i)=>tone(c,'square',f,0,.14,.035,i*.08)),
      chime:c=>{tone(c,'sine',784,0,.5,.07);tone(c,'sine',622,0,.7,.07,.32);},
      text:c=>tone(c,'square',1250,0,.022,.012),
      stamp:c=>{noise(c,.18,.18,'lowpass',1500,120);tone(c,'square',110,55,.2,.07);},
      fanfare:c=>[523,659,784,1047,784,1047].forEach((f,i)=>tone(c,'square',f,0,i===5?.5:.11,.04,i*.1)),
      fall:c=>{tone(c,'triangle',520,110,.7,.07);noise(c,.4,.08,'lowpass',800,100,.25);},
      warn:c=>{tone(c,'square',880,0,.08,.03);tone(c,'square',880,0,.08,.03,.14);},
      wake:c=>{tone(c,'sine',660,440,.3,.06);tone(c,'sine',550,330,.4,.05,.25);},
      ui:c=>tone(c,'triangle',700,900,.07,.05),
    };
    function sfx(k,fb){
      const c=actx();
      if(c&&SFX[k]){try{SFX[k](c);}catch(e){}}
      else if(fb&&typeof AU!=='undefined')AU.se(fb);
    }
    // 立ち絵
    const IMG={};
    ['normal','fear','happy','tired','win'].forEach(k=>{const im=new Image();im.src='assets/img/char_'+k+'.webp';IMG[k]=im;});

    const DOOR_X=GOAL+PX+130, STORE_X=DOOR_X-60, STORE_W=300;
    const FONT='"DotGothic16", monospace';
    const F9='9px '+FONT, F10='10px '+FONT, F11='11px '+FONT, F12='12px '+FONT, F13='13px '+FONT,
          F15='15px '+FONT, F18='18px '+FONT, F22='22px '+FONT;
    const TAU=Math.PI*2;
    const rnd=(a,b)=>a+Math.random()*(b-a);
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;
    const hash=i=>{const s=Math.sin(i*127.1+311.7)*43758.5453;return s-Math.floor(s);};
    const seeded=seed=>()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};

    const cv=document.createElement('canvas');
    cv.className='runner-cv';
    body.appendChild(cv);
    const cx=cv.getContext('2d');

    let W=0,H=0,dpr=1,sc=1,VW=360,VH=560,GY=430,RES=1;
    let skyC,farC,midC,wallC,logoC,homeC,fogC,lampC,coneC,vendC,vendRC,reflWarm,reflCyan,reflWhite,vignC,storeC;
    let glowWarm,glowCyan,glowPink,glowGold,glowRed,glowWhite;
    const FT=760, MT=980, RIP=14;

    function mkC(w,h){
      const c=document.createElement('canvas');
      c.width=Math.max(1,Math.ceil(w*RES));c.height=Math.max(1,Math.ceil(h*RES));
      const g=c.getContext('2d');g.setTransform(RES,0,0,RES,0,0);
      c.g=g;c.lw=w;c.lh=h;
      return c;
    }
    function makeGlow(r,g,b,a){
      const c=mkC(64,64),x=c.g;
      const gr=x.createRadialGradient(32,32,0,32,32,32);
      gr.addColorStop(0,`rgba(${r},${g},${b},${a})`);
      gr.addColorStop(.35,`rgba(${r},${g},${b},${a*.4})`);
      gr.addColorStop(1,`rgba(${r},${g},${b},0)`);
      x.fillStyle=gr;x.fillRect(0,0,64,64);
      return c;
    }
    function rrect(g,x,y,w,h,r){
      g.beginPath();g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);
      g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);
      g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);g.closePath();
    }

    // 2x2の網点（ディザ）で質感を足す
    function dither(g,x,y,w,h,col){
      g.fillStyle=col;
      for(let yy=y;yy<y+h;yy+=2)for(let xx=x+((yy-y)%4?1:0);xx<x+w;xx+=2)g.fillRect(xx,yy,1,1);
    }
    function buildMid(v){
      const c=mkC(MT,GY),g=c.g,r=seeded(29+v*101),base=GY-10;
      let gr;
      const NEON=v===1?['スナック','カラオケ','居酒屋','質','BAR','麻雀','薬','ラーメン','喫茶','酒']:['ランドリー','薬','質'];
      const NCOL=['#c070ff','#e83055','#00e8c8','#e8b830','#ff6fa8'];
      const neon=(sx,sy,txt,col)=>{
        const vert=txt.length<=4&&!/^[A-Z]/.test(txt);
        g.save();
        if(vert){
          const sh=txt.length*13+10;
          g.fillStyle='#160c24';g.fillRect(sx,sy,16,sh);
          g.shadowColor=col;g.shadowBlur=10;g.strokeStyle=col;g.lineWidth=1.2;g.strokeRect(sx+.5,sy+.5,15,sh-1);
          g.fillStyle=col;g.font='11px "DotGothic16", monospace';g.textAlign='center';g.textBaseline='top';
          for(let i=0;i<txt.length;i++)g.fillText(txt[i],sx+8,sy+5+i*13);
        }else{
          g.font='11px "DotGothic16", monospace';
          const tw=g.measureText(txt).width+10;
          g.fillStyle='#160c24';g.fillRect(sx,sy,tw,16);
          g.shadowColor=col;g.shadowBlur=10;g.strokeStyle=col;g.lineWidth=1.2;g.strokeRect(sx+.5,sy+.5,tw-1,15);
          g.fillStyle=col;g.textAlign='left';g.textBaseline='middle';g.fillText(txt,sx+5,sy+8.5);
        }
        g.restore();
      };
      // 第3区間：奥にクレーンと工場
      if(v===2){
        for(let k=0;k<3;k++){
          const kx=120+k*320+r()*60, top=base-230-r()*40;
          g.strokeStyle='#0d0a1e';g.lineWidth=3;
          g.beginPath();g.moveTo(kx,base);g.lineTo(kx,top);g.lineTo(kx+120,top);g.moveTo(kx-30,top);g.lineTo(kx,top);g.stroke();
          g.lineWidth=1;g.beginPath();
          for(let y=base;y>top;y-=12){g.moveTo(kx-4,y);g.lineTo(kx+4,y-12);}
          g.moveTo(kx,top-20);g.lineTo(kx+120,top);g.moveTo(kx,top-20);g.lineTo(kx-30,top);g.moveTo(kx+90,top);g.lineTo(kx+90,top+50);g.stroke();
          const gl=g.createRadialGradient(kx,top-20,0,kx,top-20,7);gl.addColorStop(0,'rgba(255,60,80,.95)');gl.addColorStop(1,'rgba(255,60,80,0)');
          g.fillStyle=gl;g.fillRect(kx-7,top-27,14,14);
        }
      }
      const mb=[];let x=0;
      while(x<MT){
        const w=v===0?46+r()*56:v===1?50+r()*60:60+r()*80;
        const h=v===0?60+r()*100:v===1?110+r()*130:50+r()*90;
        mb.push([x,w,h,(r()*1e6)|0]);x+=w+(v===1?3+r()*8:8+r()*26);
      }
      const drawMid=(bx,w,h,seed)=>{
        const rr=seeded(seed+7);
        if(v===0&&w<70){
          // 木造の一軒家（三角屋根）
          g.fillStyle='#0c0a1a';g.fillRect(bx,base-h*.6,w,h*.6+12);
          g.beginPath();g.moveTo(bx-5,base-h*.6);g.lineTo(bx+w/2,base-h*.6-24);g.lineTo(bx+w+5,base-h*.6);g.closePath();g.fill();
          g.strokeStyle='rgba(138,82,212,.3)';g.lineWidth=1;g.beginPath();g.moveTo(bx-5,base-h*.6);g.lineTo(bx+w/2,base-h*.6-24);g.lineTo(bx+w+5,base-h*.6);g.stroke();
          if(rr()<.6){g.fillStyle='rgba(242,196,106,.75)';g.fillRect(bx+8,base-h*.6+10,12,10);g.fillStyle='rgba(120,60,40,.5)';g.fillRect(bx+14,base-h*.6+10,1,10);g.fillRect(bx+8,base-h*.6+15,12,1);}
          if(rr()<.3){g.fillStyle='rgba(120,200,255,.45)';g.fillRect(bx+w-18,base-h*.6+10,10,10);}
          dither(g,bx,base-h*.6,w,h*.6,'rgba(138,82,212,.06)');
          return;
        }
        const apt=v===0||rr()<.4;
        g.fillStyle=v===2?'#0b0a16':apt?'#0b0919':'#0d0a1e';g.fillRect(bx,base-h,w,h+12);
        g.fillStyle='rgba(138,82,212,.28)';g.fillRect(bx,base-h,w,1);g.fillRect(bx,base-h,1,h);
        if(v===2){
          // 工場の棟と煙突
          g.fillStyle='#0b0a16';g.fillRect(bx+w*.7,base-h-50,8,50);
          for(let wy=base-h+12;wy<base-14;wy+=16){g.fillStyle=rr()<.4?'rgba(140,220,255,.4)':'rgba(30,26,50,.9)';g.fillRect(bx+4,wy,w-8,4);}
        }else if(apt){
          for(let wy=base-h+10;wy<base-16;wy+=20){
            for(let wx=bx+6;wx<bx+w-12;wx+=17){
              const q=rr();
              if(q<.3){g.fillStyle='rgba(242,196,106,.82)';g.fillRect(wx,wy,10,10);g.fillStyle='rgba(120,60,40,.45)';g.fillRect(wx+6,wy,4,10);}
              else if(q<.4){g.fillStyle='rgba(120,200,255,.5)';g.fillRect(wx,wy,10,10);}
              else{g.fillStyle='#15112a';g.fillRect(wx,wy,10,10);}
            }
            g.fillStyle='rgba(90,80,130,.45)';g.fillRect(bx+3,wy+12,w-6,1.5);
            g.fillStyle='rgba(60,50,90,.3)';g.fillRect(bx+3,wy+13.5,w-6,4);
          }
        }else{
          for(let wy=base-h+8;wy<base-14;wy+=11)for(let wx=bx+4;wx<bx+w-6;wx+=9){
            const q=rr();
            g.fillStyle=q<.18?'rgba(200,240,255,.55)':q<.24?'rgba(242,196,106,.6)':'#13102a';
            g.fillRect(wx,wy,6,7);
          }
        }
        dither(g,bx,base-h,w,h,'rgba(138,82,212,.05)');
        if(rr()<.5){g.fillStyle='#0b0919';g.fillRect(bx+8,base-h-12,18,12);g.fillRect(bx+10,base-h-16,14,4);}
        if(rr()<.5){g.fillStyle='#120e24';g.fillRect(bx+w-22,base-h-7,14,7);}
        const pn=v===1?.92:v===0?.18:0;
        if(rr()<pn){
          const txt=NEON[(rr()*NEON.length)|0],col=NCOL[(rr()*NCOL.length)|0];
          neon(rr()<.5?bx+w-10:bx-6, base-h+20+rr()*Math.max(10,h-130), txt, col);
        }
      };
      mb.forEach(b=>{drawMid(b[0],b[1],b[2],b[3]);drawMid(b[0]-MT,b[1],b[2],b[3]);drawMid(b[0]+MT,b[1],b[2],b[3]);});
      if(v===0){
        // 庭木
        for(let k=0;k<9;k++){const tx=r()*MT,tr=14+r()*14;g.fillStyle='#080714';g.beginPath();g.arc(tx,base-tr*.8,tr,0,TAU);g.arc(tx+tr*.8,base-tr*.5,tr*.8,0,TAU);g.fill();}
      }
      if(v===1){
        // 提灯の列
        for(let k=0;k<4;k++){
          const lx0=k*245+20, ly=base-150-r()*30;
          g.strokeStyle='rgba(20,14,30,.9)';g.lineWidth=1;g.beginPath();g.moveTo(lx0,ly);g.quadraticCurveTo(lx0+100,ly+24,lx0+200,ly);g.stroke();
          for(let i=1;i<10;i++){
            const u=i/10, lx=lx0+200*u, lyy=ly+48*u*(1-u)+4;
            g.save();g.shadowColor='#ff5050';g.shadowBlur=8;
            g.fillStyle=i%3?'#e84a4a':'#f0c060';g.beginPath();g.ellipse(lx,lyy,3.5,5,0,0,TAU);g.fill();g.restore();
          }
        }
      }
      if(v===2){
        // 高架橋
        const dy=base-122;
        for(let px=-40;px<MT+40;px+=140){
          g.fillStyle='#0e0c1c';g.fillRect(px,dy+14,16,base-dy);
          g.fillStyle='rgba(138,82,212,.18)';g.fillRect(px,dy+14,1,base-dy);
          g.strokeStyle='#0e0c1c';g.lineWidth=6;g.beginPath();g.arc(px+78,dy+70,62,Math.PI*1.08,Math.PI*1.92);g.stroke();
        }
        g.fillStyle='#14112a';g.fillRect(0,dy,MT,14);
        g.fillStyle='rgba(190,170,255,.22)';g.fillRect(0,dy,MT,1);
        g.fillStyle='#0e0c1c';g.fillRect(0,dy-6,MT,2);
        for(let px=0;px<MT;px+=10)g.fillRect(px,dy-6,1.5,6);
        for(let px=60;px<MT;px+=280){const gl=g.createRadialGradient(px,dy+7,0,px,dy+7,8);gl.addColorStop(0,'rgba(255,200,90,.9)');gl.addColorStop(1,'rgba(255,200,90,0)');g.fillStyle=gl;g.fillRect(px-8,dy-1,16,16);}
      }
      gr=g.createLinearGradient(0,base-120,0,base+10);
      gr.addColorStop(0,'rgba(20,12,40,0)');gr.addColorStop(1,'rgba(20,12,40,.45)');
      g.fillStyle=gr;g.fillRect(0,base-120,MT,130);
      return c;
    }

    // ── 背景レイヤーの事前描画（リサイズ時のみ） ──
    function buildLayers(){
      RES=Math.min(2.5,dpr*sc);
      let g,gr,r;
      // 空
      skyC=mkC(VW,GY+4);g=skyC.g;
      gr=g.createLinearGradient(0,0,0,GY);
      gr.addColorStop(0,'#06041a');gr.addColorStop(.5,'#110b2b');gr.addColorStop(1,'#2b1848');
      g.fillStyle=gr;g.fillRect(0,0,VW,GY+4);
      const mx=VW*.74,my=GY*.18;
      gr=g.createRadialGradient(mx,my,0,mx,my,110);
      gr.addColorStop(0,'rgba(225,215,255,.32)');gr.addColorStop(.18,'rgba(190,170,250,.14)');gr.addColorStop(1,'rgba(138,82,212,0)');
      g.fillStyle=gr;g.fillRect(mx-110,my-110,220,220);
      g.fillStyle='rgba(236,232,255,.6)';g.beginPath();g.arc(mx,my,10,0,TAU);g.fill();
      r=seeded(3);
      for(let i=0;i<18;i++){
        const cy=r()*GY*.62, w=60+r()*150, h=8+r()*20;
        g.fillStyle=`rgba(${14+r()*14|0},${10+r()*8|0},${30+r()*18|0},${.45+r()*.4})`;
        g.beginPath();g.ellipse(r()*VW,cy,w,h,0,0,TAU);g.fill();
      }
      // 雲の縁に街明かりが反射
      gr=g.createLinearGradient(0,GY-160,0,GY);
      gr.addColorStop(0,'rgba(232,48,85,0)');gr.addColorStop(1,'rgba(232,48,85,.08)');
      g.fillStyle=gr;g.fillRect(0,GY-160,VW,164);
      dither(g,0,GY*.45,VW,GY*.55,'rgba(150,90,220,.035)');

      // 遠景のビル群
      farC=mkC(FT,GY);g=farC.g;r=seeded(11);
      let base=GY-28;
      gr=g.createLinearGradient(0,base-180,0,base);
      gr.addColorStop(0,'rgba(120,60,180,0)');gr.addColorStop(1,'rgba(150,80,200,.2)');
      g.fillStyle=gr;g.fillRect(0,base-180,FT,180);
      const fb=[];let x=-10;
      while(x<FT){const w=22+r()*46,h=40+r()*150;fb.push([x,w,h,(r()*1e6)|0]);x+=w+r()*9-2;}
      const drawFar=(bx,w,h,seed)=>{
        const rr=seeded(seed+1);
        g.fillStyle='#100c26';g.fillRect(bx,base-h,w,h+30);
        g.fillStyle='rgba(138,82,212,.2)';g.fillRect(bx,base-h,w,1);
        for(let wy=base-h+6;wy<base-4;wy+=7)for(let wx=bx+3;wx<bx+w-3;wx+=5){
          const q=rr();
          if(q<.15){g.fillStyle=q<.1?'rgba(240,190,90,.55)':'rgba(140,200,255,.42)';g.fillRect(wx,wy,2,3);}
        }
        if(h>140&&rr()<.7){
          g.fillStyle='#100c26';g.fillRect(bx+w/2-.5,base-h-16,1,16);
          const gl=g.createRadialGradient(bx+w/2,base-h-16,0,bx+w/2,base-h-16,6);
          gl.addColorStop(0,'rgba(255,60,80,.9)');gl.addColorStop(1,'rgba(255,60,80,0)');
          g.fillStyle=gl;g.fillRect(bx+w/2-6,base-h-22,12,12);
        }
      };
      fb.forEach(b=>{drawFar(b[0],b[1],b[2],b[3]);drawFar(b[0]-FT,b[1],b[2],b[3]);drawFar(b[0]+FT,b[1],b[2],b[3]);});
      gr=g.createLinearGradient(0,base-200,0,base+28);
      gr.addColorStop(0,'rgba(26,16,50,0)');gr.addColorStop(1,'rgba(26,16,50,.6)');
      g.fillStyle=gr;g.fillRect(0,base-200,FT,228);

      // 中景（ステージごとに3種類）
      midC=[buildMid(0),buildMid(1),buildMid(2)];
      // 手前の塀（ブロック塀／シャッター／工事フェンス）
      wallC=[];
      g=(wallC[0]=mkC(64,36)).g;
      g.fillStyle='#161229';g.fillRect(0,0,64,36);
      g.fillStyle='#231d3c';g.fillRect(0,0,64,5);
      g.fillStyle='rgba(190,170,255,.14)';g.fillRect(0,0,64,1);
      g.fillStyle='rgba(0,0,0,.4)';
      g.fillRect(0,5,64,1);g.fillRect(0,15,64,1);g.fillRect(0,25,64,1);
      for(let i=0;i<2;i++){g.fillRect(i*32+15,5,1,10);g.fillRect(i*32+31,15,1,10);g.fillRect(i*32+15,25,1,11);}
      gr=g.createLinearGradient(0,5,0,36);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.35)');
      g.fillStyle=gr;g.fillRect(0,5,64,31);
      g.fillStyle='rgba(60,40,90,.25)';g.fillRect(22,5,2,20);g.fillRect(50,5,1.5,26);
      dither(g,0,5,64,31,'rgba(255,255,255,.025)');
      g=(wallC[1]=mkC(64,36)).g;
      g.fillStyle='#1f1a30';g.fillRect(0,0,64,36);
      for(let y=4;y<36;y+=3){g.fillStyle='rgba(255,255,255,.06)';g.fillRect(0,y,64,1);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,y+1,64,1);}
      g.fillStyle='#2c2440';g.fillRect(0,0,64,4);g.fillStyle='rgba(255,200,120,.35)';g.fillRect(0,0,64,1);
      g.fillStyle='#0d0a18';g.fillRect(63,0,1,36);
      g.fillStyle='rgba(232,48,85,.35)';g.font='9px "DotGothic16", monospace';g.textBaseline='middle';g.fillText('定休日',14,22);
      dither(g,0,4,64,32,'rgba(255,255,255,.03)');
      g=(wallC[2]=mkC(64,36)).g;
      g.fillStyle='#cfd2e4';g.fillRect(0,0,64,36);
      gr=g.createLinearGradient(0,0,0,36);gr.addColorStop(0,'rgba(10,8,30,.55)');gr.addColorStop(1,'rgba(10,8,30,.8)');
      g.fillStyle=gr;g.fillRect(0,0,64,36);
      g.fillStyle='rgba(90,150,230,.45)';g.fillRect(0,8,64,3);g.fillRect(0,13,64,1);
      g.fillStyle='#e8d040';g.fillRect(0,28,64,8);
      g.fillStyle='#16121e';for(let k=-1;k<8;k++){g.beginPath();g.moveTo(k*10,36);g.lineTo(k*10+6,28);g.lineTo(k*10+11,28);g.lineTo(k*10+5,36);g.fill();}
      g.fillStyle='rgba(20,30,80,.75)';g.font='8px "DotGothic16", monospace';g.textBaseline='middle';g.fillText('安全第一',14,20);
      g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,0,1,36);
      dither(g,0,0,64,28,'rgba(0,0,0,.08)');
      // 街灯
      lampC=mkC(60,192);g=lampC.g;
      g.fillStyle='#16112c';g.fillRect(6,20,4,172);
      g.fillStyle='rgba(170,150,230,.25)';g.fillRect(9,22,1,170);
      g.strokeStyle='#16112c';g.lineWidth=3;g.beginPath();g.moveTo(8,24);g.quadraticCurveTo(14,10,40,13);g.stroke();
      g.fillStyle='#2a2444';g.fillRect(34,10,16,5);
      gr=g.createRadialGradient(44,17,0,44,17,20);
      gr.addColorStop(0,'rgba(255,236,190,.95)');gr.addColorStop(.3,'rgba(255,214,140,.45)');gr.addColorStop(1,'rgba(255,200,120,0)');
      g.fillStyle=gr;g.fillRect(24,0,40,40);
      g.fillStyle='#fff3d0';g.beginPath();g.ellipse(42,16,6,2.2,0,0,TAU);g.fill();
      // 光の円錐
      coneC=mkC(170,200);g=coneC.g;
      gr=g.createLinearGradient(0,18,0,192);
      gr.addColorStop(0,'rgba(255,214,140,.28)');gr.addColorStop(1,'rgba(255,214,140,.04)');
      g.fillStyle=gr;g.beginPath();g.moveTo(80,18);g.lineTo(90,18);g.lineTo(160,192);g.lineTo(10,192);g.closePath();g.fill();
      gr=g.createRadialGradient(85,192,0,85,192,72);
      gr.addColorStop(0,'rgba(255,224,170,.4)');gr.addColorStop(1,'rgba(255,224,170,0)');
      g.fillStyle=gr;g.save();g.translate(85,192);g.scale(1,.12);g.translate(-85,-192);g.beginPath();g.arc(85,192,72,0,TAU);g.fill();g.restore();

      // 自動販売機（白・赤）
      const mkVend=(bodyCol,sideCol)=>{
        const c=mkC(70,90),v=c.g;
        let q=v.createRadialGradient(35,50,0,35,50,42);
        q.addColorStop(0,'rgba(190,235,255,.34)');q.addColorStop(1,'rgba(190,235,255,0)');
        v.fillStyle=q;v.fillRect(0,0,70,90);
        v.fillStyle=sideCol;v.fillRect(16,17,38,66);
        v.fillStyle=bodyCol;v.fillRect(17,18,35,64);
        v.fillStyle='#0d1a2a';v.fillRect(19,21,31,31);
        const cols=['#e85a5a','#5ab0e8','#f0d050','#7ae08a','#e8e8e8','#a070e0','#f09a40'];
        const rv=seeded(bodyCol.length*97+5);
        for(let row=0;row<3;row++)for(let i=0;i<5;i++){
          v.fillStyle=cols[(rv()*cols.length)|0];v.fillRect(21+i*6,23+row*10,4,7);
          v.fillStyle='rgba(255,255,255,.5)';v.fillRect(21+i*6,23+row*10,1,7);
          v.fillStyle='#00e8c8';v.fillRect(22+i*6,31+row*10,2,1);
        }
        q=v.createLinearGradient(0,54,0,66);q.addColorStop(0,'#ffffff');q.addColorStop(1,'#cfefff');
        v.fillStyle=q;v.fillRect(19,54,31,12);
        v.fillStyle='rgba(0,140,200,.6)';v.fillRect(21,57,18,2);v.fillRect(21,61,12,1.5);
        v.fillStyle='#222';v.fillRect(43,57,3,6);
        v.fillStyle='#14121e';v.fillRect(21,71,27,8);
        v.fillStyle='rgba(255,255,255,.3)';v.fillRect(17,18,1,64);
        return c;
      };
      vendC=mkVend('#d6e2ee','#8a98aa');vendRC=mkVend('#c83040','#7a1a26');

      // 路面の反射
      const mkRefl=(r,gg,b)=>{
        const c=mkC(40,120),v=c.g;
        for(let y=0;y<120;y+=3){
          const a=.42*(1-y/120)*(.6+.4*Math.sin(y*.7));
          const w=6+Math.sin(y*.31)*3+(y*.08);
          v.fillStyle=`rgba(${r},${gg},${b},${a.toFixed(3)})`;v.fillRect(20-w/2,y,w,2);
        }
        return c;
      };
      reflWarm=mkRefl(255,210,140);reflCyan=mkRefl(160,230,255);reflWhite=mkRefl(230,250,255);

      glowWarm=makeGlow(255,210,140,.7);glowCyan=makeGlow(0,232,200,.7);glowPink=makeGlow(255,120,190,.75);
      glowGold=makeGlow(232,184,48,.7);glowRed=makeGlow(255,60,80,.8);glowWhite=makeGlow(220,250,255,.8);

      // 周辺減光
      vignC=mkC(VW,VH);g=vignC.g;
      gr=g.createRadialGradient(VW*.45,VH*.55,Math.min(VW,VH)*.3,VW*.45,VH*.55,Math.max(VW,VH)*.75);
      gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(2,1,8,.6)');
      g.fillStyle=gr;g.fillRect(0,0,VW,VH);

      // コンビニ
      storeC=mkC(STORE_W+60,230);g=storeC.g;
      const sg=220;      // スプライト内の地面
      gr=g.createRadialGradient(170,140,10,170,140,190);
      gr.addColorStop(0,'rgba(210,250,255,.35)');gr.addColorStop(1,'rgba(210,250,255,0)');
      g.fillStyle=gr;g.fillRect(0,0,STORE_W+60,230);
      g.fillStyle='#1b1830';g.fillRect(20,58,STORE_W,sg-58);
      g.fillStyle='#2a2648';g.fillRect(16,54,STORE_W+8,6);
      // 看板帯
      gr=g.createLinearGradient(0,60,0,90);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#e2f2ff');
      g.fillStyle=gr;g.fillRect(20,60,STORE_W,30);
      g.fillStyle='#00c8b0';g.fillRect(20,60,STORE_W,4);
      g.fillStyle='#e8b830';g.fillRect(20,84,STORE_W,3);
      g.fillStyle='#e83055';g.fillRect(20,87,STORE_W,3);
      g.fillStyle='#232a58';g.font='bold 17px "DotGothic16", monospace';g.textAlign='center';g.textBaseline='middle';
      g.fillText('24H  よるマート',20+STORE_W/2+10,75);
      g.fillStyle='#00a890';g.beginPath();g.arc(48,75,8,0,TAU);g.fill();
      g.fillStyle='#fff';g.font='bold 9px "DotGothic16", monospace';g.fillText('24',48,75.5);
      // ガラス越しの店内
      gr=g.createLinearGradient(0,94,0,sg);gr.addColorStop(0,'#f2feff');gr.addColorStop(1,'#bfe6f4');
      g.fillStyle=gr;g.fillRect(28,94,STORE_W-16,sg-94);
      g.fillStyle='rgba(255,255,255,.95)';
      for(let i=0;i<5;i++)g.fillRect(40+i*56,97,34,2);
      const rs=seeded(77);
      const goods=['#e85a5a','#5ab0e8','#f0d050','#7ae08a','#e8a0c8','#a070e0','#f09a40','#ffffff'];
      for(let s=0;s<4;s++){
        const yy=118+s*24;
        g.fillStyle='rgba(90,110,140,.55)';g.fillRect(130,yy+14,STORE_W-120,3);
        for(let gx=132;gx<STORE_W+2;gx+=6){g.fillStyle=goods[(rs()*goods.length)|0];g.globalAlpha=.75;g.fillRect(gx,yy+3+rs()*3,4,11-rs()*3);}
        g.globalAlpha=1;
      }
      // レジと雑誌棚
      g.fillStyle='rgba(80,100,130,.6)';g.fillRect(108,170,20,sg-170);
      g.fillStyle='rgba(232,184,48,.7)';g.fillRect(112,160,12,8);
      // 窓の桟
      g.fillStyle='#3a3854';
      for(let i=0;i<6;i++)g.fillRect(28+i*56.8,94,3,sg-94);
      g.fillRect(28,94,STORE_W-16,3);g.fillRect(28,sg-8,STORE_W-16,8);
      // ポスター
      g.fillStyle='rgba(232,48,85,.75)';g.fillRect(150,104,22,12);
      g.fillStyle='rgba(232,184,48,.8)';g.fillRect(178,104,26,12);
      g.fillStyle='#fff';g.font='8px "DotGothic16", monospace';g.fillText('プリン',191,110.5);
      // 自動ドア部分（扉は動かすので別描画）
      g.fillStyle='rgba(220,250,255,.95)';g.fillRect(55,98,50,sg-106);
      // 縦の柱サイン
      g.fillStyle='#1b1830';g.fillRect(STORE_W+28,26,6,sg-26);
      g.save();g.shadowColor='#00e8c8';g.shadowBlur=12;
      g.fillStyle='#e8fffb';g.fillRect(STORE_W+14,6,34,34);
      g.restore();
      g.fillStyle='#00a890';g.fillRect(STORE_W+16,8,30,10);
      g.fillStyle='#232a58';g.font='bold 14px "DotGothic16", monospace';g.fillText('24',STORE_W+31,30);
      g.fillStyle='#fff';g.font='8px "DotGothic16", monospace';g.fillText('よる',STORE_W+31,13.5);
      // 霧（霧雨の夜）
      fogC=mkC(VW,220);g=fogC.g;
      gr=g.createLinearGradient(0,0,0,220);gr.addColorStop(0,'rgba(120,110,170,0)');gr.addColorStop(.6,'rgba(120,110,170,.32)');gr.addColorStop(1,'rgba(120,110,170,.12)');
      g.fillStyle=gr;g.fillRect(0,0,VW,220);
      buildLogo();buildHome();
    }
    function buildLogo(){
      logoC=mkC(300,120);const g=logoC.g;
      // 背後のネオン円
      g.save();g.translate(150,62);g.scale(2.4,1);
      let gr=g.createRadialGradient(0,0,4,0,0,58);gr.addColorStop(0,'rgba(138,82,212,.38)');gr.addColorStop(1,'rgba(138,82,212,0)');
      g.fillStyle=gr;g.fillRect(-60,-60,120,120);g.restore();
      g.textBaseline='middle';g.textAlign='left';
      g.save();g.shadowColor='#00e8c8';g.shadowBlur=8;g.fillStyle='#7ff8e4';g.font='14px "DotGothic16", monospace';g.fillText('深夜の',26,18);g.restore();
      // 傘アイコン
      g.save();g.translate(262,22);g.rotate(.25);
      g.strokeStyle='#e8f4ff';g.fillStyle='rgba(220,235,255,.3)';g.lineWidth=1.5;
      g.beginPath();g.moveTo(-15,4);g.quadraticCurveTo(0,-16,15,4);g.closePath();g.fill();g.stroke();
      g.beginPath();g.moveTo(0,-6);g.lineTo(0,16);g.arc(3,16,3,Math.PI,0,true);g.stroke();g.restore();
      const big=(txt,x,y,c0,c1,skew)=>{
        g.save();g.translate(x,y);g.transform(1,0,skew,1,0,0);
        g.font='38px "DotGothic16", monospace';
        g.lineJoin='round';g.strokeStyle='#1a0838';g.lineWidth=7;g.strokeText(txt,0,0);
        g.shadowColor=c1;g.shadowBlur=12;
        const q=g.createLinearGradient(0,-18,0,18);q.addColorStop(0,c0);q.addColorStop(1,c1);
        g.fillStyle=q;g.fillText(txt,0,0);
        g.restore();
      };
      big('買い出し',18,50,'#ffffff','#b88cff',0);
      // 疾走線
      g.fillStyle='#e8b830';for(let i=0;i<5;i++)g.fillRect(4+i*3,82+i*5-10,36-i*6,2);
      big('ダッシュ!!',58,92,'#ffe9a0','#ff5f9a',-.28);
      for(let i=0;i<14;i++){g.fillStyle='rgba(190,210,255,.5)';const x=20+i*21,y=(i*37)%110;g.fillRect(x,y,1,6);}
    }
    function buildHome(){
      homeC=mkC(VW,VH);const g=homeC.g,HF=VH-196;
      let gr=g.createLinearGradient(0,0,0,HF);gr.addColorStop(0,'#120e22');gr.addColorStop(1,'#221a38');
      g.fillStyle=gr;g.fillRect(0,0,VW,HF);
      for(let x=0;x<VW;x+=18){g.fillStyle='rgba(255,255,255,.025)';g.fillRect(x,0,2,HF);}
      dither(g,0,0,VW,HF,'rgba(0,0,0,.12)');
      // 窓
      const wx=VW*.5,wy=Math.max(40,HF-250),ww=VW*.4,wh=130;
      gr=g.createLinearGradient(0,wy,0,wy+wh);gr.addColorStop(0,'#0a0c26');gr.addColorStop(1,'#2a1d48');
      g.fillStyle=gr;g.fillRect(wx,wy,ww,wh);
      g.fillStyle='rgba(230,230,255,.5)';g.beginPath();g.arc(wx+ww*.72,wy+30,9,0,TAU);g.fill();
      g.fillStyle='#0c0a18';for(let i=0;i<5;i++){const bx=wx+i*ww/5;g.fillRect(bx+4,wy+wh-30-((i*37)%40),ww/5-6,40+((i*37)%40));}
      g.fillStyle='rgba(242,196,106,.7)';g.fillRect(wx+20,wy+wh-20,3,3);g.fillRect(wx+ww*.6,wy+wh-34,3,3);
      g.fillStyle='#2e2648';g.fillRect(wx-4,wy-4,ww+8,6);g.fillRect(wx-4,wy+wh-2,ww+8,6);g.fillRect(wx-4,wy,6,wh);g.fillRect(wx+ww-2,wy,6,wh);g.fillRect(wx+ww/2-2,wy,4,wh);
      // カーテン
      g.fillStyle='#4a2f6e';g.fillRect(wx-18,wy-8,16,wh+20);g.fillRect(wx+ww+2,wy-8,16,wh+20);
      g.fillStyle='rgba(0,0,0,.25)';for(let k=0;k<3;k++){g.fillRect(wx-15+k*5,wy-8,1.5,wh+20);g.fillRect(wx+ww+5+k*5,wy-8,1.5,wh+20);}
      // 月明かり
      g.fillStyle='rgba(150,170,255,.07)';g.beginPath();g.moveTo(wx,wy+wh);g.lineTo(wx+ww,wy+wh);g.lineTo(wx+ww-30,HF+60);g.lineTo(wx-70,HF+60);g.closePath();g.fill();
      // 時計 2:14
      const ccx=VW*.26,ccy=Math.max(34,HF-220);
      g.fillStyle='#e8e0f4';g.beginPath();g.arc(ccx,ccy,13,0,TAU);g.fill();
      g.strokeStyle='#4a3a6a';g.lineWidth=2;g.stroke();
      g.strokeStyle='#2a1838';g.lineWidth=1.6;g.beginPath();
      const ah=(2+14/60)/12*TAU,am=14/60*TAU;
      g.moveTo(ccx,ccy);g.lineTo(ccx+Math.sin(ah)*6,ccy-Math.cos(ah)*6);g.moveTo(ccx,ccy);g.lineTo(ccx+Math.sin(am)*10,ccy-Math.cos(am)*10);g.stroke();
      // 子どもの絵
      const px=18,py=Math.max(60,HF-170);
      g.fillStyle='#efe8d8';g.fillRect(px,py,50,38);
      g.fillStyle='#e8b830';g.beginPath();g.arc(px+38,py+10,6,0,TAU);g.fill();
      g.strokeStyle='#3a5ad0';g.lineWidth=1.5;g.beginPath();
      g.arc(px+14,py+18,4,0,TAU);g.moveTo(px+14,py+22);g.lineTo(px+14,py+32);g.moveTo(px+9,py+26);g.lineTo(px+19,py+26);
      g.moveTo(px+26,py+24);g.arc(px+26,py+24,3,0,TAU);g.moveTo(px+26,py+27);g.lineTo(px+26,py+33);g.stroke();
      g.fillStyle='rgba(232,80,120,.8)';g.font='7px "DotGothic16", monospace';g.fillText('パパ',px+6,py+8);
      g.fillStyle='rgba(200,190,140,.6)';g.fillRect(px+20,py-3,10,5);
      // 棚とぬいぐるみ
      const sy=HF-70;
      g.fillStyle='#3a2c50';g.fillRect(VW*.04,sy,90,6);
      g.fillStyle='#c8a888';g.beginPath();g.arc(VW*.04+24,sy-12,10,0,TAU);g.arc(VW*.04+16,sy-21,4,0,TAU);g.arc(VW*.04+32,sy-21,4,0,TAU);g.fill();
      g.fillStyle='#2a1838';g.fillRect(VW*.04+20,sy-14,2,2);g.fillRect(VW*.04+27,sy-14,2,2);
      g.fillStyle='#6a4a98';g.fillRect(VW*.04+50,sy-24,10,24);g.fillStyle='#4a8a98';g.fillRect(VW*.04+61,sy-20,8,20);g.fillStyle='#a84a6a';g.fillRect(VW*.04+70,sy-26,9,26);
      // 床（畳）
      gr=g.createLinearGradient(0,HF,0,VH);gr.addColorStop(0,'#2a2438');gr.addColorStop(1,'#151020');
      g.fillStyle=gr;g.fillRect(0,HF,VW,VH-HF);
      g.fillStyle='rgba(0,0,0,.3)';g.fillRect(0,HF,VW,3);
      g.fillStyle='rgba(180,170,120,.06)';for(let y=HF+6;y<VH;y+=4)g.fillRect(0,y,VW,1);
      g.fillStyle='rgba(40,30,20,.5)';g.fillRect(VW*.45,HF,3,VH-HF);g.fillRect(0,HF+70,VW,3);
      // 行灯の灯り
      gr=g.createRadialGradient(VW*.08,HF+30,0,VW*.08,HF+30,120);gr.addColorStop(0,'rgba(255,200,130,.32)');gr.addColorStop(1,'rgba(255,200,130,0)');
      g.fillStyle=gr;g.fillRect(0,HF-90,VW*.08+120,240);
      g.fillStyle='#f4dcb0';g.fillRect(VW*.08-7,HF+6,14,22);g.fillStyle='#4a3424';g.fillRect(VW*.08-8,HF+4,16,3);g.fillRect(VW*.08-8,HF+27,16,3);
    }

    function resize(){
      const r=body.getBoundingClientRect();
      W=Math.max(240,Math.floor(r.width));H=Math.max(320,Math.floor(r.height));
      dpr=Math.min(3,window.devicePixelRatio||1);
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
      cv.style.width=W+'px';cv.style.height=H+'px';
      sc=Math.min(H/560,W/340);VW=W/sc;VH=H/sc;
      GY=Math.round(VH-Math.max(118,VH*.23));
      buildLayers();
      initRain();
    }
    let rzTimer=0;
    const ro=(typeof ResizeObserver!=='undefined')?new ResizeObserver(()=>{
      clearTimeout(rzTimer);rzTimer=setTimeout(()=>{if(!mg._ended)resize();},80);
    }):null;

    // ── 状態 ──
    let phase='story', phaseT=0, t=0, cam=0, speed=0, slowMul=1, wake=0, woke=false;
    let py=0,vy=0,onG=true,jumps=0,held=false,holdT=0,slideT=0,slideHeld=false,slideAge=0,slideQ=false,fastFall=false,coyote=0;
    let invul=0,hp=MAX_HP,ph=0,boostT=0,flash=0,shake=0,jumpBuf=0,hitStop=0,hitT=0,cheerT=-1;
    let coins=0,drinks=0,purin=0,hits=0,puddles=0,psx=PX,doorOpen=0,fallRot=0,runTime=0;
    let umb={x:0,y:0,vx:0,vy:0,r:0,vr:0};
    let lastScore='', outcome=null, committed=false, gradeInfo=null, leaving=false;
    let tr=null, dlg=null, banner=null, stageIdx=0, lightning=0, nextBolt=rnd(3,7), thunderAt=-1, train=null, nextTrain=2;
    const milestones=[700,500,300,100];
    let obs=[],items=[];
    let nextX=620, lastCar=-9999, lastDrink=0, lastObs=null;
    const purinMarks=[GOAL*.38,GOAL*.74];let purinIdx=0;
    // 最初の3つはチュートリアル（初回はヒント付き）
    const tutQ=['box','sign','stack'];

    // パーティクル／ポップアップ（プール）
    const P=[];for(let i=0;i<220;i++)P.push({a:false,x:0,y:0,vx:0,vy:0,l:0,m:1,c:'#fff',s:2,g:0});
    function emit(x,y,vx,vy,l,c,s,g){
      for(let i=0;i<P.length;i++){const p=P[i];if(!p.a){p.a=true;p.x=x;p.y=y;p.vx=vx;p.vy=vy;p.l=l;p.m=l;p.c=c;p.s=s;p.g=g;return;}}
    }
    const POP=[];for(let i=0;i<10;i++)POP.push({a:false,x:0,y:0,l:0,m:1,txt:'',c:'#fff',big:false});
    function popup(txt,x,y,c,big){
      let p=POP[0];for(let i=0;i<POP.length;i++){if(!POP[i].a){p=POP[i];break;}}
      p.a=true;p.txt=txt;p.x=x;p.y=y;p.l=p.m=big?1.6:1;p.c=c||'#deccf8';p.big=!!big;
    }
    // 雨（天気で量が変わる）
    const RN=200, rnN=WEATHER.drops;
    const rx=new Float32Array(RN),ry=new Float32Array(RN),rl=new Float32Array(RN),rv=new Float32Array(RN);
    function initRain(){for(let i=0;i<RN;i++){rx[i]=Math.random()*(VW+120);ry[i]=Math.random()*VH;rl[i]=(WEATHER.id==='mist'?5:9)+Math.random()*12;rv[i]=(WEATHER.id==='mist'?420:620)+Math.random()*320;}}

    // ── 場面転換（アイリスワイプ） ──
    function wipe(cb){if(tr)return;tr={t:0,cb,fired:false};}
    const ease=u=>1-Math.pow(1-u,3);
    const easeBack=u=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(u-1,3)+c1*Math.pow(u-1,2);};

    // ── 会話 ──
    // who: 'dan'（立ち絵 face）/'kid'/'narr'
    function startDialog(lines,done){dlg={lines,i:0,ch:0,hold:0,done,wrapped:null,blip:0};}
    function dialogNext(){
      if(!dlg)return;
      const L=dlg.lines[dlg.i];
      if(dlg.ch<L.text.length){dlg.ch=L.text.length;return;}
      dlg.i++;dlg.ch=0;dlg.hold=0;dlg.wrapped=null;sfx('ui','btn');
      if(dlg.i>=dlg.lines.length){const d=dlg.done;dlg=null;if(d)d();}
    }
    const INTRO=FIRST?[
      {who:'kid',text:'……パパ……あたま、あつい……'},
      {who:'dan',face:'fear',text:'38度5分……。冷却シート、ちょうど切らしてたわね。'},
      {who:'dan',face:'normal',text:'すぐ戻るわ。起きたら、好きなプリンも一緒にね。'},
      {who:'dan',face:'win',text:'──よし。走るわよ。'},
    ]:[
      {who:'kid',text:'……パパ……あつい……'},
      {who:'dan',face:'fear',text:'また熱が上がってきたわね……。'},
      {who:'dan',face:'win',text:REMIX?'今夜は近道を使うわ。待っててね。':'すぐ戻るわ。待っててね。'},
    ];
    function endingLines(){
      if(outcome==='down')return [
        {who:'narr',text:'（傘は折れ、レジ袋は空っぽのまま）'},
        {who:'kid',text:'パパ……びしょびしょ……'},
        {who:'dan',face:'tired',text:'ごめんね。今夜は濡れタオルで我慢してね。'},
        {who:'dan',face:'normal',text:'……朝になったら、一緒に買いに行きましょ。'},
      ];
      if(woke)return [
        {who:'kid',text:'パパ……どこ行ってたの……'},
        {who:'dan',face:'tired',text:'ごめんね、待たせたわね。ほら、冷たいの。'},
        {who:'kid',text:'……あ、プリンだ……'},
        {who:'dan',face:'happy',text:'ひと口だけね。それから、もうひと眠り。'},
      ];
      return [
        {who:'narr',text:'（そっと玄関を開ける。小さな寝息が聞こえる）'},
        {who:'dan',face:'happy',text:'……ただいま。冷たいの、貼るわね。'},
        {who:'kid',text:'……ん……つめたい……'},
        {who:'dan',face:'happy',text:'プリンは冷蔵庫。起きたら一緒に食べましょ。'},
      ];
    }

    // ── 入力 ──
    let pdown=false,pid=-1,psy=0,psx0=0,pT=0,pPending=false,pSwiped=false;
    function pressJump(){if(phase==='run'){jumpBuf=.14;held=true;}}
    function releaseJump(){held=false;}
    function pressSlide(hold){
      if(phase!=='run')return;
      slideHeld=hold;
      if(onG)startSlide();
      else{slideQ=true;fastFall=true;}
    }
    function startSlide(){
      if(slideT<=0){sfx('slide','back');for(let i=0;i<6;i++)emit(cam+PX-6,GY-2,rnd(-120,-40),rnd(-80,-20),.35,'rgba(170,200,255,.8)',2,300);}
      slideT=.55;slideAge=0;slideQ=false;
    }
    function tapAdvance(){
      if(tr)return true;
      if(dlg){dialogNext();return true;}
      if(phase==='title'&&phaseT>.5){beginRun();return true;}
      if(phase==='arrive'&&phaseT>2.6){goHome();return true;}
      if(phase==='grade'&&phaseT>1.2){finishGame();return true;}
      return phase!=='run';
    }
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(tapAdvance())return;
      try{cv.setPointerCapture(e.pointerId);}catch(_){}
      pdown=true;pid=e.pointerId;psy=e.clientY;psx0=e.clientX;pT=performance.now();pPending=true;pSwiped=false;
    });
    cv.addEventListener('pointermove',e=>{
      if(!pdown||e.pointerId!==pid||pSwiped)return;
      const dy=e.clientY-psy,dx=e.clientX-psx0;
      if(dy>20&&dy>Math.abs(dx)){
        pSwiped=true;held=false;
        // 既に跳んでいたら急降下してスライド
        pPending=false;pressSlide(false);
      }
    });
    const pUp=e=>{
      if(e.pointerId!==pid)return;
      if(pPending){pPending=false;pressJump();held=false;}
      pdown=false;releaseJump();
    };
    cv.addEventListener('pointerup',pUp);
    cv.addEventListener('pointercancel',pUp);
    cv.addEventListener('contextmenu',e=>e.preventDefault());
    mg.onKey(e=>{
      const k=e.key, down=e.type==='keydown';
      if(k===' '||k==='ArrowUp'||k==='w'||k==='W'||k==='z'||k==='Z'){
        e.preventDefault();
        if(down){if(!e.repeat&&!tapAdvance())pressJump();}else releaseJump();
      }else if(k==='ArrowDown'||k==='s'||k==='S'){
        e.preventDefault();
        if(down){if(!e.repeat)pressSlide(true);}else slideHeld=false;
      }else if(k==='Enter'&&down){e.preventDefault();tapAdvance();}
    });

    function beginRun(){
      if(phase!=='title')return;
      phase='run';phaseT=0;sfx('stage','decide');
      popup('いってくる…！',cam+PX,GY-80,'#00e8c8',true);
      banner={t:0,no:STAGES[0].no,name:STAGES[0].name};
    }
    function goHome(){
      if(leaving)return;leaving=true;
      wipe(()=>{
        phase='home';phaseT=0;
        if(outcome==='clear')sfx('chime','notif');
        startDialog(endingLines(),()=>{phase='grade';phaseT=0;commit();sfx('stamp','rank');});
      });
    }
    function finishGame(){if(!mg._ended)mg.end(outcome||'quit');}
    // 評価と記録
    function calcGrade(){
      if(outcome!=='clear')return 'C';
      const sc2=100-hits*20-(woke?25:0)+Math.min(2,purin)*6+Math.min(10,Math.floor(coins/6));
      return sc2>=105?'S':sc2>=78?'A':'B';
    }
    function commit(){
      if(committed)return;committed=true;
      const g=calcGrade();
      const prevBest=DATA.best, prevTime=DATA.bestTime;
      DATA.plays=(DATA.plays|0)+1;
      let newRec=false;
      if(outcome==='clear'){
        DATA.clears=(DATA.clears|0)+1;
        if(!prevTime||runTime<prevTime){DATA.bestTime=Math.round(runTime*10)/10;newRec=true;}
      }
      if(outcome&&(!prevBest||GRADE_RANK[g]>GRADE_RANK[prevBest])){DATA.best=g;newRec=true;}
      DATA.bestCoins=Math.max(DATA.bestCoins|0,Math.min(COIN_CAP,coins*COIN));
      gradeInfo={g,newRec:newRec&&outcome==='clear',prevBest};
    }

    // ── 障害物の配置 ──
    function addObs(type,x,o){
      const b={type,x,w:30,h:28,clr:0,over:false,hit:false,vx:0,moving:false,anim:Math.random()*6,flee:0,fy:0,prev:null,hint:''};
      if(type==='puddle'){b.w=o||rnd(56,84);b.h=2;}
      else if(type==='box'){b.w=30;b.h=28;}
      else if(type==='stack'){b.w=32;b.h=54;}
      else if(type==='bike'){b.w=56;b.h=36;}
      else if(type==='cat'){b.w=26;b.h=20;}
      else if(type==='sign'){b.w=44;b.over=true;b.clr=30;}
      else if(type==='gate'){b.w=56;b.over=true;b.clr=30;}
      else if(type==='car'){b.w=104;b.h=40;b.vx=-130;b.prev=lastObs;}
      obs.push(b);
      if(type!=='puddle')lastObs=b;
      return b;
    }
    function addItem(type,x,y){items.push({type,x,y,got:false,ph:Math.random()*6});}
    function coinArc(x0,x1,peak){
      const n=Math.max(3,Math.round((x1-x0)/24));
      for(let i=0;i<=n;i++){const u=i/n;addItem('coin',x0+(x1-x0)*u,16+Math.sin(u*Math.PI)*peak);}
    }
    function coinRow(x,n,y){for(let i=0;i<n;i++)addItem('coin',x+i*22,y);}
    function speedAt(p){return 220+150*p;}

    function placePattern(x,p){
      // チュートリアル（最初の3つ）
      if(tutQ.length){
        const k=tutQ.shift();
        const o=addObs(k,x);
        if(FIRST||k==='box')o.hint=k==='box'?'タップ／Space でジャンプ':k==='sign'?'下スワイプ／↓ でくぐる':'長押しで高く・空中でもう1回';
        if(k==='box')coinArc(x-24,x+54,62);
        if(k==='sign')coinRow(x-8,3,10);
        if(k==='stack')coinArc(x-30,x+62,96);
        return o.w+speedAt(p)*.6;
      }
      // プリン（決まった地点）
      if(purinIdx<purinMarks.length&&x>=purinMarks[purinIdx]){
        purinIdx++;
        addObs('stack',x+40);
        addItem('purin',x+56,128);
        coinRow(x-40,3,16);
        return 90;
      }
      const st=stageAt(x);
      // 車（ヘッドライトで予告）：商店街以降
      if(st>=1&&x-lastCar>(REMIX?2800:3600)&&Math.random()<.22){
        lastCar=x;
        const c=addObs('car',x+300);
        coinArc(x+300,x+404,70);
        return 300+c.w+80;
      }
      const cm=REMIX?1.5:1;
      const W3=[
        // 住宅街：段ボール・自転車・猫・水たまり
        [['puddle',1.2],['box',1.3],['bike',1.1],['cat',1],['sign',.5],['stack',p>.12?.6:0],['combo1',REMIX?.5:0]],
        // 商店街：看板・猫・自転車、組み合わせ
        [['puddle',.8],['box',.6],['bike',.9],['cat',1],['sign',1.3],['stack',.7],['combo1',.6*cm],['combo2',.7*cm]],
        // 高架下：工事バー・積み荷・連続
        [['puddle',.8],['stack',1],['gate',1.4],['bike',.5],['cat',.5],['combo1',.7*cm],['combo2',.7*cm],['combo3',.8*cm]],
      ][st];
      let sum=0;for(const o of W3)sum+=o[1];
      let q=Math.random()*sum,type='box';
      for(const o of W3){q-=o[1];if(q<=0){type=o[0];break;}}
      switch(type){
        case 'puddle':{const w=rnd(58,86);addObs('puddle',x,w);if(Math.random()<.5)coinArc(x-6,x+w+6,58);return w;}
        case 'box':addObs('box',x);if(Math.random()<.4)coinArc(x-24,x+54,62);return 30;
        case 'stack':addObs('stack',x);coinArc(x-30,x+62,96);return 32;
        case 'bike':addObs('bike',x);if(Math.random()<.4)coinArc(x-20,x+76,66);return 56;
        case 'cat':addObs('cat',x);return 26;
        case 'sign':addObs('sign',x);coinRow(x-8,3,10);return 44;
        case 'gate':addObs('gate',x);coinRow(x-4,3,10);return 56;
        case 'combo1':{addObs('puddle',x,62);addObs('box',x+76);coinArc(x-10,x+110,72);return 106;}
        case 'combo2':{addObs('bike',x);const g=speedAt(p)*.55;addObs(st===2?'gate':'sign',x+56+g);return 56+g+56;}
        case 'combo3':{addObs('box',x);addObs('box',x+110);addObs('cat',x+220);return 246;}
      }
      return 30;
    }
    function spawnAhead(){
      while(nextX<cam+VW+140&&nextX<GOAL+PX-200){
        const p=nextX/GOAL;
        const used=placePattern(nextX,p);
        const sp=speedAt(p);
        const gap=Math.max(sp*.66,sp*(rnd(.95,1.45)-.38*p-(REMIX?.06:0)));
        // 隙間に小銭や栄養ドリンク
        if(nextX-lastDrink>4200&&Math.random()<.5&&gap>200){lastDrink=nextX;addItem('drink',nextX+used+gap*.5,44);}
        else if(Math.random()<.35&&gap>170)coinRow(nextX+used+gap*.3,3,16);
        nextX+=used+gap;
      }
    }

    // ── 被弾・取得 ──
    function hitBy(o){
      o.hit=true;
      if(o.type==='cat'){o.flee=.01;sfx('cat','notif');}
      if(boostT>0){
        sfx('land','tool');popup('へっちゃら！',cam+PX,GY-py-70,'#e8b830');
        for(let i=0;i<10;i++)emit(o.x+o.w/2,GY-20,rnd(-80,160),rnd(-220,-60),.6,'#e8b830',2.5,500);
        return;
      }
      hp--;hits++;invul=1.4;slowMul=.42;flash=1;shake=.4;hitStop=.1;hitT=.32;
      sfx('hit','warn');
      const msg={box:'ドンッ',stack:'ドサッ',bike:'ガシャン',cat:'ニャッ！',sign:'ゴンッ',gate:'ゴンッ',car:'キキーッ'}[o.type]||'っ…';
      popup(msg,cam+PX+10,GY-py-74,'#ff8aa0',true);
      if(o.type==='car')sfx('horn');
      for(let i=0;i<16;i++)emit(cam+PX,GY-py-40,rnd(-140,160),rnd(-260,-40),.7,i%2?'rgba(230,245,255,.9)':'#e83055',2.5,600);
      if(hp<=0){
        phase='fall';phaseT=0;outcome='down';hitStop=.22;sfx('fall','noise');
        umb.x=cam+PX;umb.y=GY-py-80;umb.vx=rnd(60,140);umb.vy=-260;umb.r=-.4;umb.vr=rnd(4,7);
        vy=320;fallRot=0;
      }else if(hp===1)popup('傘があと1回で壊れる！',cam+VW*.5,GY-190,'#ff8aa0',true);
    }
    function collect(it){
      it.got=true;
      if(it.type==='coin'){coins++;sfx('coin','comment');for(let i=0;i<5;i++)emit(it.x,GY-it.y,rnd(-60,60),rnd(-120,-30),.35,i%2?'#ffe080':'#fff',2,300);}
      else if(it.type==='drink'){
        drinks++;boostT=3;sfx('drink','repair');popup('栄養ドリンク！ 無敵',it.x,GY-it.y-26,'#e8b830',true);
        for(let i=0;i<12;i++)emit(it.x,GY-it.y,rnd(-120,120),rnd(-160,40),.6,'#e8b830',2,0);
      }else if(it.type==='purin'){
        purin++;hitStop=.06;sfx('purin','ach');popup('プリン確保！',it.x,GY-it.y-26,'#ff9ccf',true);
        for(let i=0;i<18;i++)emit(it.x,GY-it.y,rnd(-150,150),rnd(-170,70),.8,i%2?'#ffd8ec':'#e8b830',2.5,0);
      }
    }

    // ── 更新 ──
    function update(dt){
      t+=dt;phaseT+=dt;
      if(tr){tr.t+=dt;if(!tr.fired&&tr.t>=.5){tr.fired=true;tr.cb();}if(tr.t>=1)tr=null;}
      if(dlg){
        const L=dlg.lines[dlg.i];
        if(dlg.ch<L.text.length){const before=dlg.ch|0;dlg.ch=Math.min(L.text.length,dlg.ch+dt*36);if((dlg.ch|0)!==before&&(before%2===0))sfx('text');}
        else{dlg.hold+=dt;if(dlg.hold>1.8)dialogNext();}
      }
      if(flash>0)flash=Math.max(0,flash-dt*2.6);
      if(shake>0)shake=Math.max(0,shake-dt);
      if(lightning>0)lightning=Math.max(0,lightning-dt*2.2);
      if(hitT>0)hitT-=dt;
      // 雷雨：稲光と遅れて雷鳴
      if(WEATHER.id==='storm'&&(phase==='run'||phase==='title'||phase==='story'||phase==='home')){
        nextBolt-=dt;
        if(nextBolt<=0){nextBolt=rnd(6,12);lightning=1;thunderAt=t+rnd(.3,.8);}
        if(thunderAt>0&&t>=thunderAt){thunderAt=-1;sfx('thunder','noise');}
      }
      // ポーズ中の進行停止（ヒットストップ）
      if(hitStop>0){hitStop-=dt;updateFx(dt*.15);return;}
      if(phase==='title'){
        speed=0;
        if(phaseT>4.2)beginRun();
      }else if(phase==='run'){
        runTime+=dt;
        // 指を置いたまま動かなければジャンプ確定（スワイプ判定の猶予 55ms）
        if(pPending&&performance.now()-pT>55){pPending=false;pressJump();}
        const prog=Math.min(1,cam/GOAL);
        slowMul+=(1-slowMul)*Math.min(1,dt*1.25);
        if(boostT>0)boostT-=dt;
        speed=speedAt(prog)*SPD*slowMul*(boostT>0?1.12:1);
        cam+=speed*dt;
        if(!woke){wake+=dt/WAKE;if(wake>=1){wake=1;woke=true;sfx('wake','notif');popup('……パパ？（子どもが起きた）',cam+VW*.5,GY-180,'#ff8aa0',true);}}
        const rem=GOAL_M-Math.floor(cam/M);
        if(milestones.length&&rem<=milestones[0]){const m=milestones.shift();popup(m===100?'あと100m！灯りが見える':'あと'+m+'m',cam+VW*.5,GY-200,'#00e8c8',true);if(m===100)sfx('ui','notif');}
        const si=stageAt(cam+PX);
        if(si!==stageIdx){stageIdx=si;banner={t:0,no:STAGES[si].no,name:STAGES[si].name};sfx('stage','rank');}
        // 第3区間：高架を電車が通る
        if(stageIdx===2&&!train){nextTrain-=dt;if(nextTrain<=0){train={x:VW+20};sfx('train');}}
        updatePlayer(dt);
        spawnAhead();
        collide();
        if(cam>=GOAL&&phase==='run'){phase='arrive';phaseT=0;outcome='clear';psx=PX;held=false;slideT=0;sfx('fanfare','rank');}
      }else if(phase==='arrive'){
        speed*=Math.exp(-3*dt);cam+=speed*dt;
        if(py>0||vy!==0){vy-=2300*dt;py+=vy*dt;if(py<=0){py=0;vy=0;}}
        const target=DOOR_X-cam;
        psx+=(target-psx)*Math.min(1,dt*2.2);
        // ドア前で小さくガッツポーズ
        if(cheerT<0&&phaseT>.9){cheerT=0;vy=300;py=.1;sfx('jump','btn');for(let i=0;i<12;i++)emit(cam+psx,GY-60,rnd(-120,120),rnd(-160,-20),.7,i%2?'#00e8c8':'#e8b830',2.5,300);}
        if(cheerT>=0)cheerT+=dt;
        if(phaseT>1.5&&doorOpen===0)sfx('chime','notif');
        if(phaseT>1.5)doorOpen=Math.min(1,doorOpen+dt*2.2);
        if(phaseT>6)goHome();
      }else if(phase==='fall'){
        speed*=Math.exp(-2.5*dt);cam+=speed*dt;
        vy-=1500*dt;py+=vy*dt;fallRot=Math.min(1.45,fallRot+dt*4);
        if(py<=0){py=0;vy=vy<-120?-vy*.25:0;}
        umb.vy+=500*dt;umb.x+=umb.vx*dt;umb.y+=umb.vy*dt;umb.r+=umb.vr*dt;
        if(umb.y>GY-6){umb.y=GY-6;umb.vy*=-.3;umb.vx*=.6;umb.vr*=.5;}
        if(phaseT>2.4)goHome();
      }else if(phase==='grade'){
        if(phaseT>12)finishGame();
      }
      // 走りのアニメ位相
      if(phase==='run'||phase==='arrive')ph+=dt*(phase==='arrive'?Math.max(2,speed*.045+(Math.abs(DOOR_X-cam-psx)>4?6:0)):speed*.048);
      if(banner){banner.t+=dt;if(banner.t>2.6)banner=null;}
      if(train){train.x-=(300+speed*.3)*dt;if(train.x<-420){train=null;nextTrain=rnd(5,9);}}
      // 障害物の動き（猫が逃げる・車が走る）
      for(let i=0;i<obs.length;i++){
        const o=obs[i];o.anim+=dt;
        if(o.type==='car'){
          if(!o.moving&&(!o.prev||o.prev.x+o.prev.w<cam+PX-10)){o.moving=true;if(phase==='run')sfx('warn');}
          if(o.moving&&phase==='run')o.x+=o.vx*dt;
        }
        if(o.flee>0){o.flee+=dt;o.x+=170*dt;o.fy=Math.max(0,o.fy+(260-o.flee*900)*dt);}
      }
      updateFx(dt);
      // 画面外のものを捨てる
      if(obs.length&&obs[0].x+obs[0].w<cam-120)obs=obs.filter(o=>o.x+o.w>cam-120);
      if(items.length>40||(items.length&&items[0].x<cam-60))items=items.filter(it=>!it.got&&it.x>cam-60);
    }
    function updateFx(dt){
      for(let i=0;i<P.length;i++){const p=P[i];if(!p.a)continue;p.l-=dt;if(p.l<=0){p.a=false;continue;}p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
      for(let i=0;i<POP.length;i++){const p=POP[i];if(!p.a)continue;p.l-=dt;p.y-=24*dt;if(p.l<=0)p.a=false;}
      const vx=-(speed*.55+90), street=phase!=='story'&&phase!=='home'&&phase!=='grade';
      for(let i=0;i<rnN;i++){
        rx[i]+=vx*dt;ry[i]+=rv[i]*dt;
        if(ry[i]>GY+6+(i%7)*14){
          if(street&&i%3===0&&ry[i]<GY+30)emit(cam+rx[i],GY+(i%7)*2,rnd(-40,30),rnd(-90,-40),.22,'rgba(190,210,255,.7)',1.5,500);
          ry[i]=-10-Math.random()*60;rx[i]=Math.random()*(VW+160);
        }
        if(rx[i]<-30)rx[i]+=VW+150;
      }
    }

    function updatePlayer(dt){
      if(invul>0)invul-=dt;
      if(onG)coyote=.09;else if(coyote>0)coyote-=dt;
      if(jumpBuf>0){
        jumpBuf-=dt;
        if(onG||(coyote>0&&jumps===0)){
          vy=560;jumps=1;holdT=0;onG=false;coyote=0;slideT=0;slideQ=false;fastFall=false;jumpBuf=0;sfx('jump','btn');
          for(let i=0;i<6;i++)emit(cam+PX,GY-1,rnd(-140,-20),rnd(-90,-20),.35,'rgba(170,200,255,.75)',2,300);
        }else if(jumps<2){
          vy=520;jumps=2;holdT=0;fastFall=false;slideQ=false;jumpBuf=0;sfx('jump2','btn');
          for(let i=0;i<12;i++){const a=i/12*TAU;emit(cam+PX,GY-py-24,Math.cos(a)*90,Math.sin(a)*50,.3,'rgba(0,232,200,.85)',2,0);}
        }
      }
      if(!onG){
        if(vy>0)holdT+=dt;
        const g=(held&&vy>0&&holdT<.22)?950:2300;
        vy-=g*dt;
        if(fastFall)vy=Math.min(vy,-820);
        py+=vy*dt;
        if(py<=0){
          py=0;vy=0;onG=true;jumps=0;fastFall=false;sfx('land');
          for(let i=0;i<6;i++)emit(cam+PX+rnd(-8,8),GY-1,rnd(-80,40),rnd(-70,-20),.3,'rgba(170,200,255,.7)',1.8,300);
          if(slideQ)startSlide();
        }
      }
      if(slideT>0){
        slideAge+=dt;
        if(!(slideHeld&&slideAge<1.1))slideT-=dt;
        if(Math.random()<.5)emit(cam+PX+10,GY-1,rnd(-60,40),rnd(-60,-20),.25,'rgba(170,200,255,.7)',1.6,300);
      }
    }

    function collide(){
      // 見た目より少し小さめの当たり判定（理不尽な被弾を減らす）
      const pw=cam+PX, sliding=slideT>0&&onG;
      const x0=pw-(sliding?13:7), x1=pw+(sliding?13:7), y0=py, y1=py+(sliding?21:48);
      for(let i=0;i<obs.length;i++){
        const o=obs[i];
        if(o.hit||o.flee)continue;
        const ox0=o.x+5, ox1=o.x+o.w-5;
        if(x1<ox0||x0>ox1)continue;
        if(o.type==='puddle'){
          if(onG&&py<=0){
            o.hit=true;puddles++;slowMul=Math.min(slowMul,.6);sfx('splash','back');
            popup('バシャッ',pw,GY-70,'#9fc8ff');
            for(let k=0;k<16;k++)emit(pw+rnd(-6,10),GY,rnd(-120,120),rnd(-260,-80),.5,'rgba(170,210,255,.85)',2,800);
          }
          continue;
        }
        if(invul>0)continue;
        if(o.over){if(y1>o.clr+2)hitBy(o);}
        else if(y0<o.h-5)hitBy(o);
        if(phase!=='run')return;
      }
      for(let i=0;i<items.length;i++){
        const it=items[i];
        if(it.got)continue;
        const dx=it.x-pw;
        if(dx<-18||dx>18)continue;
        const r=it.type==='coin'?10:14;
        if(it.y+r>y0&&it.y-r<y1)collect(it);
      }
    }

    // ── 描画 ──
    function tile(img,offset,y){
      const w=img.lw;let x=-(((offset%w)+w)%w);
      for(;x<VW;x+=w)cx.drawImage(img,x,y,w,img.lh);
    }
    function drawGlow(img,x,y,r,a){cx.globalAlpha=a;cx.drawImage(img,x-r,y-r,r*2,r*2);cx.globalAlpha=1;}

    function drawWorld(){
      cx.drawImage(skyC,0,0,VW,GY+4);
      if(lightning>0){
        cx.fillStyle=`rgba(200,190,255,${(lightning*.35).toFixed(3)})`;cx.fillRect(0,0,VW,GY);
        if(lightning>.7){cx.strokeStyle='rgba(240,240,255,.9)';cx.lineWidth=1.5;cx.beginPath();let lx=VW*.3+hash(Math.floor(t))*VW*.4,ly=0;cx.moveTo(lx,ly);while(ly<GY*.5){lx+=(hash(ly+t)-.5)*30;ly+=18;cx.lineTo(lx,ly);}cx.stroke();}
      }
      tile(farC,cam*.08,0);
      // 遠くに見えるコンビニの柱サイン
      const far=(GOAL-cam);
      if(far<1400){
        const fx=VW*.84+far*.1, fy=GY-150;
        if(fx<VW+40){
          drawGlow(glowCyan,fx,fy,40+Math.max(0,(1400-far)*.03),.55);
          cx.fillStyle='#0d0a1f';cx.fillRect(fx-1.5,fy+8,3,140);
          cx.fillStyle='#e8fffb';cx.fillRect(fx-9,fy-9,18,18);
          cx.fillStyle='#00a890';cx.fillRect(fx-8,fy-8,16,5);
          cx.fillStyle='#232a58';cx.font=F9;cx.textAlign='center';cx.textBaseline='middle';cx.fillText('24',fx,fy+3);
        }
      }
      // 中景：区間の境目でクロスフェード
      {
        const B1=STAGES[1].m*M,B2=STAGES[2].m*M, c=cam+VW*.5;
        const B=c<(B1+B2)/2?B1:B2, from=B===B1?0:1;
        const f=clamp((c-(B-500))/700,0,1);
        if(f<1)tile(midC[from],cam*.3,0);
        if(f>0){cx.globalAlpha=f;tile(midC[from+1],cam*.3,0);cx.globalAlpha=1;}
        // 高架を走る電車
        if(train&&from===1&&f>.5){
          const dy=GY-132, x=train.x;
          cx.globalAlpha=(f-.5)*2;
          cx.fillStyle='#1c1a34';cx.fillRect(x,dy-17,380,15);
          cx.fillStyle='rgba(190,170,255,.3)';cx.fillRect(x,dy-17,380,1);
          for(let k=0;k<380;k+=12){cx.fillStyle=(k%95<8)?'#0c0a18':'rgba(255,236,190,.85)';cx.fillRect(x+k+3,dy-14,7,5);}
          drawGlow(glowWhite,x,dy-10,14,.8);
          cx.globalAlpha=1;
        }
      }
      if(WEATHER.id==='mist')cx.drawImage(fogC,0,GY-230,VW,220);
      // 電柱と電線
      const PS=300, pOff=cam*.6;
      const i0=Math.floor((pOff-60)/PS), i1=Math.floor((pOff+VW+60)/PS);
      cx.strokeStyle='rgba(8,6,16,.95)';cx.lineWidth=1;
      cx.beginPath();
      for(let i=i0;i<=i1;i++){
        const x=i*PS-pOff+hash(i)*30, nx=(i+1)*PS-pOff+hash(i+1)*30, top=GY-250;
        for(let k=0;k<3;k++){const y=top+8+k*7;cx.moveTo(x,y);cx.quadraticCurveTo((x+nx)/2,y+16+k*3,nx,y);}
      }
      cx.stroke();
      for(let i=i0;i<=i1;i++){
        const x=i*PS-pOff+hash(i)*30, top=GY-250;
        cx.fillStyle='#0b0918';cx.fillRect(x-3,top,6,230);
        cx.fillRect(x-14,top+6,28,3);cx.fillRect(x-10,top+20,20,2);
        if(hash(i+3)<.4){cx.fillRect(x+3,top+40,12,16);}
        cx.fillStyle='rgba(138,82,212,.22)';cx.fillRect(x+2,top,1,230);
      }
      // ブロック塀
      for(let wx=Math.floor(cam/64)*64;wx<cam+VW;wx+=64)cx.drawImage(wallC[stageAt(wx)],wx-cam,GY-36,64,36);
      // 街灯・自販機（近景・背面）
      const LS=430, l0=Math.floor((cam-220)/LS), l1=Math.floor((cam+VW+60)/LS);
      for(let i=l0;i<=l1;i++){
        const lx=i*LS+hash(i)*110-cam;
        if(hash(i+50)<.42){
          const vx=lx+150;
          cx.drawImage(hash(i+80)<.3?vendRC:vendC,vx-17,GY-84,70,90);
        }
        cx.drawImage(lampC,lx,GY-192,60,192);
      }
      // 歩道
      cx.fillStyle='#17132b';cx.fillRect(0,GY,VW,18);
      cx.fillStyle='rgba(0,232,200,.16)';cx.fillRect(0,GY,VW,1);
      cx.strokeStyle='rgba(0,0,0,.35)';cx.lineWidth=1;cx.beginPath();
      for(let x=-(cam%40);x<VW+10;x+=40){cx.moveTo(x,GY+1);cx.lineTo(x-7,GY+18);}
      cx.stroke();
      cx.fillStyle='#2a2342';cx.fillRect(0,GY+18,VW,5);
      cx.fillStyle='rgba(190,170,255,.18)';cx.fillRect(0,GY+18,VW,1);
      // 車道（濡れたアスファルト）
      cx.fillStyle='#09071a';cx.fillRect(0,GY+23,VW,VH-GY-23);
      cx.fillStyle='rgba(222,204,248,.16)';
      for(let x=-(cam%90);x<VW;x+=90)cx.fillRect(x,GY+62,40,2);
      cx.fillStyle='rgba(222,204,248,.1)';cx.fillRect(0,GY+30,VW,1);
      // 雨の波紋
      cx.strokeStyle='rgba(170,190,255,.22)';cx.lineWidth=.8;cx.beginPath();
      for(let i=0;i<RIP;i++){
        const k=t*.9+i*.37, u=k%1, n=Math.floor(k);
        const rxp=hash(i*7+n*31)*VW, ryp=GY+34+hash(i*13+n*17)*(VH-GY-40), rr=2+u*12;
        cx.moveTo(rxp+rr,ryp);cx.ellipse(rxp,ryp,rr,rr*.28,0,0,TAU);
      }
      cx.stroke();
      // 光（加算）
      cx.globalCompositeOperation='lighter';
      for(let i=l0;i<=l1;i++){
        const lx=i*LS+hash(i)*110-cam;
        cx.drawImage(coneC,lx+44-85,GY-191,170,200);
        cx.globalAlpha=.75;cx.drawImage(reflWarm,lx+24,GY+24,40,Math.min(120,VH-GY-24));cx.globalAlpha=1;
        if(hash(i+50)<.42){
          const vx=lx+150;
          drawGlow(glowCyan,vx+18,GY+4,30,.18);
          cx.globalAlpha=.55;cx.drawImage(reflCyan,vx,GY+24,40,Math.min(110,VH-GY-24));cx.globalAlpha=1;
        }
      }
      // コンビニ
      const sx=STORE_X-cam;
      if(sx<VW+80&&sx>-STORE_W-80){
        drawGlow(glowWhite,sx+STORE_W*.5,GY+10,170,.35);
        cx.globalAlpha=.8;
        for(let k=0;k<5;k++)cx.drawImage(reflWhite,sx+30+k*58,GY+24,40,Math.min(120,VH-GY-24));
        cx.globalAlpha=1;
      }
      cx.globalCompositeOperation='source-over';
      if(sx<VW+80&&sx>-STORE_W-80){
        cx.drawImage(storeC,sx-20,GY-220,STORE_W+60,230);
        // 自動ドア
        const dx=sx+35, dw=25, slide=doorOpen*22;
        cx.fillStyle='rgba(150,200,220,.35)';cx.strokeStyle='#4a4866';cx.lineWidth=1.5;
        cx.fillRect(dx-slide,GY-122,dw,114);cx.strokeRect(dx-slide,GY-122,dw,114);
        cx.fillRect(dx+dw+slide,GY-122,dw,114);cx.strokeRect(dx+dw+slide,GY-122,dw,114);
        cx.fillStyle='rgba(255,255,255,.5)';cx.fillRect(dx-slide+4,GY-118,2,100);cx.fillRect(dx+dw+slide+4,GY-118,2,100);
        // 入口マット
        cx.fillStyle='#2b3a4a';cx.fillRect(dx-6,GY,dw*2+12,4);
      }
    }

    function drawObstacle(o){
      const x=o.x-cam;
      if(x>VW+20||x+o.w<-30)return;
      const g=cx;
      switch(o.type){
        case 'puddle':{
          g.fillStyle='rgba(60,80,140,.55)';
          g.beginPath();g.ellipse(x+o.w/2,GY+3,o.w/2,4.5,0,0,TAU);g.fill();
          g.globalCompositeOperation='lighter';
          g.fillStyle='rgba(255,210,140,.18)';g.fillRect(x+o.w*.3,GY+1,o.w*.18,3);
          g.fillStyle='rgba(120,200,255,.2)';g.fillRect(x+o.w*.6,GY+1,o.w*.12,3);
          g.globalCompositeOperation='source-over';
          g.strokeStyle='rgba(190,220,255,.45)';g.lineWidth=.8;
          for(let k=0;k<2;k++){
            const rp=((o.anim*1.2+k*.5)%1), rx2=x+o.w*(.3+k*.35);
            g.globalAlpha=1-rp;g.beginPath();g.ellipse(rx2,GY+3,3+rp*10,1+rp*2.5,0,0,TAU);g.stroke();
          }
          g.globalAlpha=1;
          break;
        }
        case 'box':case 'stack':{
          const n=o.type==='stack'?2:1;
          for(let k=0;k<n;k++){
            const bx=x+(k?3:0), by=GY-27*(k+1), bw=o.w-(k?4:2);
            g.fillStyle='#5a4430';g.fillRect(bx,by,bw,27);
            g.fillStyle='#6e5438';g.fillRect(bx,by,bw,5);
            g.fillStyle='rgba(0,0,0,.25)';g.fillRect(bx+bw-5,by,5,27);
            g.fillStyle='#8a7050';g.fillRect(bx+bw/2-3,by,6,10);
            g.fillStyle='rgba(20,10,30,.35)';g.fillRect(bx,by+20,bw,7);
            g.fillStyle='rgba(255,230,190,.4)';g.font=F9;g.textAlign='center';g.textBaseline='middle';
            g.fillText(k?'みかん':'こわれもの',bx+bw/2,by+15);
            g.fillStyle='rgba(255,220,160,.22)';g.fillRect(bx,by,1,27);
          }
          break;
        }
        case 'bike':{
          const wy=GY-12;
          g.strokeStyle='#4a4270';g.lineWidth=2.2;
          g.beginPath();g.arc(x+12,wy,11,0,TAU);g.moveTo(x+55,wy);g.arc(x+44,wy,11,0,TAU);g.stroke();
          g.strokeStyle='rgba(0,232,200,.35)';g.lineWidth=1;
          g.beginPath();g.arc(x+12,wy,11,-2.2,-1);g.moveTo(x+44+11*Math.cos(-2.2),wy+11*Math.sin(-2.2));g.arc(x+44,wy,11,-2.2,-1);g.stroke();
          g.strokeStyle='#6a5c98';g.lineWidth=2.5;
          g.beginPath();g.moveTo(x+12,wy);g.lineTo(x+24,wy-16);g.lineTo(x+40,wy-16);g.lineTo(x+44,wy);
          g.moveTo(x+24,wy-16);g.lineTo(x+28,wy);g.lineTo(x+12,wy);
          g.moveTo(x+40,wy-16);g.lineTo(x+43,wy-25);g.lineTo(x+49,wy-25);
          g.moveTo(x+24,wy-16);g.lineTo(x+22,wy-22);g.stroke();
          g.fillStyle='#2a2440';g.fillRect(x+17,wy-24,11,3);
          g.strokeStyle='#4a4270';g.lineWidth=1;g.strokeRect(x+46,wy-27,10,7);
          g.fillStyle='#e8d040';g.fillRect(x+30,wy-15,6,8);
          g.fillStyle='#2a2440';g.fillRect(x+31,wy-13,4,1);g.fillRect(x+31,wy-11,3,1);
          break;
        }
        case 'cat':{
          const cxp=x+13, cy=GY-o.fy;
          g.fillStyle='#07050f';
          g.beginPath();g.ellipse(cxp,cy-8,10,7,0,0,TAU);g.fill();
          g.beginPath();g.arc(cxp-9,cy-15,6,0,TAU);g.fill();
          g.beginPath();g.moveTo(cxp-14,cy-18);g.lineTo(cxp-13,cy-25);g.lineTo(cxp-9,cy-20);
          g.moveTo(cxp-8,cy-20);g.lineTo(cxp-4,cy-25);g.lineTo(cxp-4,cy-17);g.fill();
          g.strokeStyle='#07050f';g.lineWidth=3;g.lineCap='round';
          const tw=Math.sin(o.anim*3)*.5;
          g.beginPath();g.moveTo(cxp+9,cy-8);g.quadraticCurveTo(cxp+18,cy-12+tw*6,cxp+15,cy-22+tw*4);g.stroke();
          g.lineCap='butt';
          g.strokeStyle='rgba(180,160,255,.3)';g.lineWidth=1;
          g.beginPath();g.ellipse(cxp,cy-8,10,7,0,3.6,5.6);g.stroke();
          const blink=(o.anim%3.2)<.12;
          if(!blink){
            drawGlow(glowGold,cxp-11,cy-15,6,.6);drawGlow(glowGold,cxp-7,cy-15,6,.6);
            g.fillStyle='#f0e060';g.fillRect(cxp-12,cy-16,2,2);g.fillRect(cxp-8,cy-16,2,2);
          }
          break;
        }
        case 'sign':{
          // 軒先から吊り下がる看板
          g.fillStyle='#1d1834';g.fillRect(x-6,GY-170,o.w+12,4);
          g.strokeStyle='#3a3256';g.lineWidth=1;
          g.beginPath();g.moveTo(x+6,GY-166);g.lineTo(x+6,GY-118);g.moveTo(x+o.w-6,GY-166);g.lineTo(x+o.w-6,GY-118);
          g.moveTo(x-6,GY-166);g.lineTo(x-6,0);g.stroke();
          drawGlow(glowPink,x+o.w/2,GY-74,48,.35);
          g.fillStyle='#24142e';g.fillRect(x,GY-118,o.w,86);
          g.strokeStyle='#ff6fa8';g.lineWidth=1.5;g.strokeRect(x+1.5,GY-116.5,o.w-3,83);
          g.fillStyle='#ffd0e4';g.font=F13;g.textAlign='center';g.textBaseline='middle';
          const s='居酒屋';for(let k=0;k<3;k++)g.fillText(s[k],x+o.w/2,GY-100+k*20);
          g.fillStyle='rgba(255,111,168,.6)';g.fillRect(x,GY-33,o.w,2);
          break;
        }
        case 'gate':{
          // 工事中のバー（上から吊られた足場）
          g.fillStyle='rgba(40,34,70,.85)';
          g.fillRect(x+2,GY-200,3,165);g.fillRect(x+o.w-5,GY-200,3,165);
          g.fillRect(x-4,GY-200,o.w+8,3);
          g.fillStyle='#1c1a2c';g.fillRect(x,GY-104,o.w,56);
          g.fillStyle='#e8e0f0';g.fillRect(x+3,GY-101,o.w-6,50);
          g.fillStyle='#1c2050';g.font=F11;g.textAlign='center';g.textBaseline='middle';
          g.fillText('工事中',x+o.w/2,GY-88);g.font=F9;g.fillText('頭上注意',x+o.w/2,GY-68);
          // 縞模様のバー
          g.save();g.beginPath();g.rect(x-6,GY-46,o.w+12,13);g.clip();
          g.fillStyle='#e8d040';g.fillRect(x-6,GY-46,o.w+12,13);
          g.fillStyle='#16121e';
          for(let k=-2;k<10;k++){g.beginPath();g.moveTo(x-6+k*12,GY-33);g.lineTo(x+2+k*12,GY-46);g.lineTo(x+8+k*12,GY-46);g.lineTo(x+k*12,GY-33);g.fill();}
          g.restore();
          if(Math.sin(t*8+o.x)>0){drawGlow(glowRed,x-4,GY-50,14,.9);drawGlow(glowRed,x+o.w+4,GY-50,14,.9);}
          g.fillStyle='#ff3c50';g.fillRect(x-6,GY-53,4,4);g.fillRect(x+o.w+2,GY-53,4,4);
          break;
        }
        case 'car':{
          // ヘッドライトのビーム
          g.globalCompositeOperation='lighter';
          const beam=g.createLinearGradient(x-200,0,x,0);
          beam.addColorStop(0,'rgba(255,250,220,0)');beam.addColorStop(1,'rgba(255,250,220,.35)');
          g.fillStyle=beam;g.beginPath();g.moveTo(x+2,GY-22);g.lineTo(x-200,GY-50);g.lineTo(x-200,GY+8);g.lineTo(x+2,GY-12);g.fill();
          drawGlow(glowWhite,x+2,GY-18,30,.9);
          g.globalCompositeOperation='source-over';
          g.fillStyle='#1e1a34';rrect(g,x,GY-30,o.w,22,5);g.fill();
          g.beginPath();g.moveTo(x+22,GY-30);g.lineTo(x+34,GY-44);g.lineTo(x+80,GY-44);g.lineTo(x+94,GY-30);g.fill();
          g.fillStyle='rgba(120,160,220,.35)';
          g.beginPath();g.moveTo(x+27,GY-31);g.lineTo(x+36,GY-41);g.lineTo(x+56,GY-41);g.lineTo(x+56,GY-31);g.fill();
          g.beginPath();g.moveTo(x+60,GY-31);g.lineTo(x+60,GY-41);g.lineTo(x+78,GY-41);g.lineTo(x+88,GY-31);g.fill();
          g.fillStyle='rgba(190,170,255,.3)';g.fillRect(x+6,GY-30,o.w-14,1);
          g.fillStyle='#0a0814';g.beginPath();g.arc(x+22,GY-8,8,0,TAU);g.arc(x+82,GY-8,8,0,TAU);g.fill();
          g.strokeStyle='#4a4468';g.lineWidth=1.2;g.beginPath();
          for(const wx of [x+22,x+82])for(let k=0;k<3;k++){const a=o.anim*-14+k*2.09;g.moveTo(wx,GY-8);g.lineTo(wx+Math.cos(a)*5,GY-8+Math.sin(a)*5);}
          g.stroke();
          g.fillStyle='#fffbe0';g.fillRect(x,GY-22,5,5);
          g.fillStyle='#e83055';g.fillRect(x+o.w-3,GY-24,3,6);
          break;
        }
      }
    }

    function drawCarWarnings(){
      for(let i=0;i<obs.length;i++){
        const o=obs[i];
        if(o.type!=='car'||!o.moving)continue;
        const x=o.x-cam;
        if(x>VW-6&&x<VW+700){
          const a=.45+.35*Math.sin(t*14);
          cx.globalCompositeOperation='lighter';
          drawGlow(glowWhite,VW+10,GY-20,70,a*.7);
          cx.globalCompositeOperation='source-over';
          const wx=VW-22,wy=GY-96;
          cx.fillStyle=`rgba(232,184,48,${(.6+.4*Math.sin(t*14)).toFixed(2)})`;
          cx.beginPath();cx.moveTo(wx,wy-12);cx.lineTo(wx+12,wy+9);cx.lineTo(wx-12,wy+9);cx.closePath();cx.fill();
          cx.fillStyle='#16121e';cx.font=F13;cx.textAlign='center';cx.textBaseline='middle';cx.fillText('!',wx,wy+2);
          cx.fillStyle='#e8b830';cx.font=F10;cx.fillText('車',wx,wy+20);
        }
      }
    }

    function drawItem(it){
      const x=it.x-cam;
      if(x<-20||x>VW+20)return;
      const y=GY-it.y+Math.sin(t*3+it.ph)*2;
      if(it.type==='coin'){
        const s=Math.abs(Math.cos(t*4+it.ph));
        drawGlow(glowGold,x,y,11,.45);
        cx.fillStyle='#d8a828';cx.beginPath();cx.ellipse(x,y,6*s+.6,6,0,0,TAU);cx.fill();
        cx.fillStyle='#ffe080';cx.beginPath();cx.ellipse(x-s*1.2,y-1,4.4*s+.3,4.4,0,0,TAU);cx.fill();
        if(s>.35){cx.fillStyle='#8a6410';cx.beginPath();cx.ellipse(x,y,1.6*s,1.6,0,0,TAU);cx.fill();}
      }else if(it.type==='drink'){
        drawGlow(glowGold,x,y,22,.4+.2*Math.sin(t*5));
        cx.fillStyle='#5a2a10';rrect(cx,x-4.5,y-9,9,17,2);cx.fill();
        cx.fillRect(x-2.5,y-13,5,5);
        cx.fillStyle='#e8d040';cx.fillRect(x-4.5,y-4,9,7);
        cx.fillStyle='#c02030';cx.fillRect(x-4.5,y-1,9,2);
        cx.fillStyle='#d0d0e0';cx.fillRect(x-3,y-15,6,3);
        cx.fillStyle='rgba(255,255,255,.45)';cx.fillRect(x-3.5,y-8,1,14);
      }else if(it.type==='purin'){
        drawGlow(glowPink,x,y,30,.55+.2*Math.sin(t*4));
        cx.fillStyle='rgba(255,255,255,.85)';cx.beginPath();cx.ellipse(x,y+9,12,3,0,0,TAU);cx.fill();
        cx.fillStyle='#f2c14e';cx.beginPath();cx.moveTo(x-9,y+8);cx.lineTo(x-6,y-6);cx.lineTo(x+6,y-6);cx.lineTo(x+9,y+8);cx.closePath();cx.fill();
        cx.fillStyle='#7a3a12';cx.beginPath();cx.ellipse(x,y-6,6,2.4,0,0,TAU);cx.fill();
        cx.fillRect(x-6,y-6,12,2.5);
        cx.fillStyle='rgba(255,255,255,.55)';cx.fillRect(x-5,y-2,1.5,8);
        const tw=(t*2+it.ph)%1;
        cx.fillStyle=`rgba(255,240,250,${(1-tw).toFixed(2)})`;cx.fillRect(x+10,y-12-tw*6,2,2);cx.fillRect(x-13,y-2-tw*5,2,2);
      }
    }

    // ── 主人公（だんのうら）の描画 ──
    // 角度は「真下=0、進行方向（右）が正」
    const PAL_N={pants:'#2e2048',shoe:'#0e0a18',jacket:'#8a74b8',jacketB:'#5e4c88',hair:'#3d2266',hairHi:'#6a44a8',skin:'#e6cdd8',hat:'#c86a9a',rim:null};
    const PAL_R={pants:'rgba(0,232,200,.55)',shoe:'rgba(0,232,200,.55)',jacket:'rgba(0,232,200,.55)',jacketB:'rgba(0,232,200,.55)',hair:'rgba(0,232,200,.55)',hairHi:'rgba(0,232,200,.55)',skin:'rgba(0,232,200,.55)',hat:'rgba(0,232,200,.55)',rim:true};
    const J={hx:0,hy:0,sx:0,sy:0,lean:0,lt:[0,0],rt:[0,0],la:[0,0],ra:[0,0],ua:0,tuck:0};
    function seg(x,y,a,l){return [x+Math.sin(a)*l,y+Math.cos(a)*l];}
    function limb(x,y,a1,l1,a2,l2,col,w,shoe){
      const k=seg(x,y,a1,l1), f=seg(k[0],k[1],a2,l2);
      cx.strokeStyle=col;cx.lineWidth=w;
      cx.beginPath();cx.moveTo(x,y);cx.lineTo(k[0],k[1]);cx.lineTo(f[0],f[1]);cx.stroke();
      if(shoe){cx.fillStyle=shoe;cx.beginPath();cx.ellipse(f[0]+2,f[1]-1,4.5,2.4,0,0,TAU);cx.fill();}
      return f;
    }
    let homePose=false;   // 家の中（傘なし・腕を下ろす）
    function setPose(){
      if(homePose){
        const b=Math.sin(t*2)*.5;
        J.hx=0;J.hy=-28+b;J.lean=.04;
        J.lt[0]=.1;J.lt[1]=.04;J.rt[0]=-.08;J.rt[1]=-.1;
        J.la[0]=.25;J.la[1]=.9;J.ra[0]=-.15;J.ra[1]=.2;J.ua=0;return;
      }
      if(phase==='fall'){
        J.hx=0;J.hy=-24;J.lean=.5;J.lt[0]=.9;J.lt[1]=.2;J.rt[0]=.3;J.rt[1]=-.4;J.la[0]=2.2;J.la[1]=2.6;J.ra[0]=-1.6;J.ra[1]=-1.2;J.ua=0;return;
      }
      // 被弾：のけぞり
      if(hitT>0&&phase==='run'){
        J.hx=-2;J.hy=-27;J.lean=-.42;
        J.lt[0]=.5;J.lt[1]=.2;J.rt[0]=-.4;J.rt[1]=-.6;
        J.la[0]=2.3;J.la[1]=2.9;J.ra[0]=2.2;J.ra[1]=2.5;J.ua=-.5;return;
      }
      // 到着：ガッツポーズ
      if(phase==='arrive'&&cheerT>=0){
        const b=Math.sin(t*6)*.08;
        J.hx=0;J.hy=-28;J.lean=.05;
        J.lt[0]=py>1?.7:.1;J.lt[1]=py>1?-.3:.04;J.rt[0]=-.1;J.rt[1]=py>1?-.8:-.1;
        J.la[0]=2.9+b;J.la[1]=3.1;J.ra[0]=2.85;J.ra[1]=3.0;J.ua=.1;return;
      }
      const sliding=slideT>0&&onG&&phase==='run';
      if(sliding){
        J.hx=-2;J.hy=-9;J.lean=-.95;
        J.lt[0]=1.55;J.lt[1]=1.6;J.rt[0]=1.05;J.rt[1]=-.25;
        J.la[0]=-1.1;J.la[1]=-.6;J.ra[0]=1.4;J.ra[1]=1.9;J.ua=1.25;return;
      }
      if(!onG&&phase==='run'){
        const up=clamp(vy/560,-1,1);
        // 2段目は体を丸めて回転気味に
        const tuck=jumps===2&&vy>0?.35:0;
        J.hx=0;J.hy=-28;J.lean=.28+tuck;
        J.lt[0]=1.2-up*.2+tuck;J.lt[1]=-.1-tuck;J.rt[0]=.35+tuck;J.rt[1]=-1.1+up*.3;
        J.la[0]=1.1+up*.4;J.la[1]=1.8;J.ra[0]=2.75;J.ra[1]=2.9;J.ua=.25-up*.15;return;
      }
      if(phase==='title'||phase==='story'||(phase==='arrive'&&Math.abs(DOOR_X-cam-psx)<3)){
        const b=Math.sin(t*2.4)*.6;
        J.hx=0;J.hy=-28+b;J.lean=.06;
        J.lt[0]=.12;J.lt[1]=.04;J.rt[0]=-.1;J.rt[1]=-.12;
        J.la[0]=.15;J.la[1]=.5;J.ra[0]=2.85;J.ra[1]=3.0;J.ua=.08;return;
      }
      const s=Math.sin(ph), c=Math.cos(ph);
      J.hx=0;J.hy=-27-Math.abs(c)*2.4;J.lean=.24+Math.min(.1,(speed-220)/1500);
      J.lt[0]=.85*s;J.lt[1]=J.lt[0]-(.15+1.25*Math.max(0,c));
      J.rt[0]=-.85*s;J.rt[1]=J.rt[0]-(.15+1.25*Math.max(0,-c));
      J.la[0]=-.95*s+.2;J.la[1]=J.la[0]+1.3;
      J.ra[0]=2.7+s*.08;J.ra[1]=2.95+s*.06;J.ua=.32;
    }
    function drawFigure(pal,ox,oy){
      cx.save();cx.translate(ox,oy);
      cx.lineCap='round';cx.lineJoin='round';
      const hx=J.hx,hy=J.hy;
      const sx=hx+Math.sin(J.lean)*17, sy=hy-Math.cos(J.lean)*17;
      const hdx=sx+Math.sin(J.lean)*8.5, hdy=sy-Math.cos(J.lean)*8.5;
      // 後ろ髪（ポニーテール）
      const wave=Math.sin(t*9)*2.5, back=phase==='run'&&!homePose?1:.4;
      cx.fillStyle=pal.hair;
      cx.beginPath();cx.moveTo(hdx-3,hdy-6);
      cx.quadraticCurveTo(hdx-16*back-6,hdy-6+wave,hdx-24*back-4,hdy+4+wave*1.5);
      cx.quadraticCurveTo(hdx-12*back-4,hdy+4,hdx-4,hdy+3);cx.closePath();cx.fill();
      // 奥の脚・腕
      limb(hx-1,hy,J.rt[0],14,J.rt[1],14,pal.rim?pal.pants:'#221838',6,pal.shoe);
      // 傘を持つ腕（奥）
      const hand=limb(sx-1,sy+1,J.ra[0],10,J.ra[1],10,pal.rim?pal.jacket:pal.jacketB,5,null);
      // 胴体
      cx.strokeStyle=pal.jacket;cx.lineWidth=11;
      cx.beginPath();cx.moveTo(hx,hy);cx.lineTo(sx,sy);cx.stroke();
      if(!pal.rim){
        cx.strokeStyle='rgba(255,255,255,.12)';cx.lineWidth=2;
        cx.beginPath();cx.moveTo(hx+Math.cos(J.lean)*4,hy+Math.sin(J.lean)*4);cx.lineTo(sx+Math.cos(J.lean)*4,sy+Math.sin(J.lean)*4);cx.stroke();
        cx.strokeStyle='#e8a8c8';cx.lineWidth=3;
        cx.beginPath();cx.moveTo(hx+Math.cos(J.lean)*1.5,hy-2);cx.lineTo(sx+Math.cos(J.lean)*1.5,sy+3);cx.stroke();
      }
      // 手前の脚
      limb(hx+1,hy,J.lt[0],14,J.lt[1],14,pal.pants,6,pal.shoe);
      // 頭
      cx.fillStyle=pal.skin;cx.beginPath();cx.arc(hdx+1,hdy,7,0,TAU);cx.fill();
      cx.fillStyle=pal.hair;
      cx.beginPath();cx.arc(hdx-1,hdy-1,7.6,Math.PI*.55,Math.PI*1.95);cx.quadraticCurveTo(hdx+6,hdy-2,hdx+3,hdy+1);cx.closePath();cx.fill();
      cx.fillRect(hdx-7,hdy-2,4,11);
      if(!pal.rim){
        cx.fillStyle=pal.hairHi;cx.fillRect(hdx-4,hdy-7,5,1.5);
        // 眼鏡のきらめき
        cx.fillStyle='rgba(200,255,250,.85)';cx.fillRect(hdx+4,hdy,3.5,2);
        cx.fillStyle='#d890b0';cx.beginPath();cx.arc(hdx-5,hdy-6,1.8,0,TAU);cx.fill();
      }
      // 小さなシルクハット
      cx.save();cx.translate(hdx+1,hdy-7);cx.rotate(J.lean*.6-.12);
      cx.fillStyle=pal.hat;cx.fillRect(-6,-1,12,2);cx.fillRect(-3.5,-7,7,6.5);
      if(!pal.rim){cx.fillStyle='#7a2a58';cx.fillRect(-3.5,-3,7,1.5);}
      cx.restore();
      // 手前の腕
      limb(sx+1,sy+1,J.la[0],10,J.la[1],10,pal.jacket,5,null);
      if(phase!=='fall'&&!homePose)drawUmbrella(pal,hand[0],hand[1],J.ua);
      cx.restore();
    }
    function drawUmbrella(pal,hx,hy,ua){
      cx.save();cx.translate(hx,hy);cx.rotate(ua);
      const R=23, top=-40;
      cx.strokeStyle=pal.rim?pal.jacket:'#c8c0d8';cx.lineWidth=1.6;
      cx.beginPath();cx.moveTo(0,0);cx.lineTo(0,top-4);cx.stroke();
      cx.beginPath();cx.arc(2.5,0,2.5,Math.PI,0,true);cx.stroke();
      if(pal.rim){cx.restore();return;}
      const dmg=MAX_HP-Math.max(0,hp);
      const lf=dmg>=2?-10:0, flap=dmg>=1?Math.sin(t*22)*3:0;
      cx.fillStyle='rgba(220,235,255,.24)';cx.strokeStyle='rgba(235,245,255,.8)';cx.lineWidth=1.1;
      cx.beginPath();
      cx.moveTo(-R,top+16+lf);
      cx.quadraticCurveTo(-R*.85,top-2,0,top-4);
      cx.quadraticCurveTo(R*.85,top-2,R,top+16);
      cx.quadraticCurveTo(R*.75,top+12,R*.5,top+14+flap);
      cx.quadraticCurveTo(R*.25,top+11,0,top+14);
      cx.quadraticCurveTo(-R*.25,top+11,-R*.5,top+14+lf*.6);
      cx.quadraticCurveTo(-R*.75,top+12+lf,-R,top+16+lf);
      cx.closePath();cx.fill();cx.stroke();
      cx.strokeStyle='rgba(235,245,255,.45)';cx.lineWidth=.8;
      cx.beginPath();
      cx.moveTo(0,top-4);cx.quadraticCurveTo(-R*.3,top+2,-R*.5,top+14+lf*.6);
      cx.moveTo(0,top-4);cx.quadraticCurveTo(R*.3,top+2,R*.5,top+14+flap);
      cx.stroke();
      cx.fillStyle='rgba(255,255,255,.35)';cx.fillRect(-R*.55,top+1,R*.4,1.2);
      // 破れ・折れた骨
      if(dmg>=1){
        cx.strokeStyle='rgba(235,245,255,.9)';cx.lineWidth=1;
        cx.beginPath();cx.moveTo(R*.5,top+14+flap);cx.lineTo(R*.62,top+22+flap);cx.stroke();
        cx.fillStyle='rgba(5,4,14,.75)';cx.beginPath();cx.moveTo(R*.2,top+6);cx.lineTo(R*.45,top+12);cx.lineTo(R*.3,top+13);cx.closePath();cx.fill();
      }
      if(dmg>=2){
        cx.strokeStyle='rgba(235,245,255,.9)';
        cx.beginPath();cx.moveTo(-R,top+16+lf);cx.lineTo(-R-6,top+2+lf);cx.moveTo(-R*.5,top+14+lf*.6);cx.lineTo(-R*.62,top+4);cx.stroke();
      }
      // 傘に当たる雨粒
      if(phase==='run'&&Math.random()<.25)emit(cam+PX+(hx+Math.sin(ua)*-top)*1+rnd(-14,14),GY-py+hy+top+4,rnd(-60,60),rnd(-80,-30),.25,'rgba(200,220,255,.8)',1.5,500);
      cx.restore();
    }
    function drawPlayer(){
      if(phase==='arrive'&&doorOpen>=1&&phaseT>2.2)return;
      let x=phase==='arrive'?psx:PX;
      const y=GY-py;
      setPose();
      let alpha=1;
      if(invul>0&&phase==='run')alpha=(Math.floor(invul*14)%2)?.35:1;
      if(phase==='arrive'&&doorOpen>=1)alpha=Math.max(0,1-(phaseT-1.8)*2.5);
      // 足元の影
      cx.fillStyle='rgba(0,0,0,.45)';cx.beginPath();cx.ellipse(x,GY+1,12-Math.min(8,py*.05),2.5,0,0,TAU);cx.fill();
      cx.globalAlpha=alpha;
      cx.save();cx.translate(x,y);
      cx.scale(1.12,1.12);
      if(phase==='fall'){cx.translate(18*fallRot/1.45,0);cx.rotate(fallRot);}
      if(boostT>0){drawGlow(glowGold,0,-28,46,.35+.15*Math.sin(t*10));}
      drawFigure(PAL_R,1.3,-1);
      drawFigure(PAL_N,0,0);
      cx.restore();
      cx.globalAlpha=1;
      if(phase==='fall'){
        const ux=umb.x-cam;
        cx.save();cx.translate(ux,umb.y);cx.rotate(umb.r);
        cx.strokeStyle='rgba(235,245,255,.8)';cx.fillStyle='rgba(220,235,255,.2)';cx.lineWidth=1.1;
        cx.beginPath();cx.moveTo(-18,4);cx.lineTo(-8,-10);cx.lineTo(4,-6);cx.lineTo(12,-14);cx.lineTo(20,2);cx.closePath();cx.fill();cx.stroke();
        cx.beginPath();cx.moveTo(0,-8);cx.lineTo(2,22);cx.moveTo(-8,-10);cx.lineTo(-14,-18);cx.moveTo(12,-14);cx.lineTo(20,-20);cx.stroke();
        cx.restore();
      }
    }

    function drawRain(){
      const vx=-(speed*.55+90), mist=WEATHER.id==='mist';
      cx.strokeStyle=mist?'rgba(190,200,255,.22)':'rgba(170,190,255,.3)';cx.lineWidth=1;
      cx.beginPath();
      for(let i=0;i<rnN;i+=2){const k=rl[i]/rv[i];cx.moveTo(rx[i],ry[i]);cx.lineTo(rx[i]-vx*k,ry[i]-rl[i]);}
      cx.stroke();
      cx.strokeStyle=mist?'rgba(210,220,255,.3)':'rgba(200,215,255,.45)';cx.lineWidth=1.3;
      cx.beginPath();
      for(let i=1;i<rnN;i+=2){const k=rl[i]*1.3/rv[i];cx.moveTo(rx[i],ry[i]);cx.lineTo(rx[i]-vx*k,ry[i]-rl[i]*1.3);}
      cx.stroke();
    }
    // 速度感の流線
    function drawSpeedLines(){
      if(phase!=='run')return;
      const a=clamp((speed-280)/160,0,1)*.5+(boostT>0?.35:0);
      if(a<=.02)return;
      cx.fillStyle=`rgba(222,204,248,${a.toFixed(3)})`;
      for(let i=0;i<9;i++){
        const y=GY-24-hash(i)*210, len=30+hash(i+3)*60;
        const x=VW+60-((t*(700+hash(i+7)*500)+hash(i+9)*VW*2)%(VW*2.2));
        cx.fillRect(x,y,len,1);
      }
    }

    function shadowText(s,x,y,col){cx.fillStyle='rgba(0,0,0,.75)';cx.fillText(s,x+1,y+1);cx.fillStyle=col;cx.fillText(s,x,y);}

    function drawHUD(){
      const prog=clamp(cam/GOAL,0,1);
      const bx0=36,bx1=VW-36,by=16;
      cx.fillStyle='rgba(10,7,22,.72)';rrect(cx,8,4,VW-16,58,6);cx.fill();
      cx.strokeStyle='rgba(138,82,212,.45)';cx.lineWidth=1;rrect(cx,8.5,4.5,VW-17,57,6);cx.stroke();
      cx.fillStyle='rgba(138,82,212,.35)';cx.fillRect(bx0,by-2,bx1-bx0,4);
      cx.fillStyle='rgba(222,204,248,.35)';
      for(let m=100;m<GOAL_M;m+=100)cx.fillRect(bx0+(bx1-bx0)*m/GOAL_M,by-4,1,8);
      cx.fillStyle='#00e8c8';cx.fillRect(bx0,by-2,(bx1-bx0)*prog,4);
      // 家
      const hx=20;
      cx.fillStyle='#bbaedd';cx.beginPath();cx.moveTo(hx-8,by-1);cx.lineTo(hx,by-8);cx.lineTo(hx+8,by-1);cx.fill();
      cx.fillRect(hx-6,by-1,12,8);cx.fillStyle='#e8b830';cx.fillRect(hx-2,by+1,4,4);
      // コンビニ
      const sx=VW-20;
      cx.fillStyle='#e8fffb';cx.fillRect(sx-8,by-7,16,14);cx.fillStyle='#00a890';cx.fillRect(sx-8,by-7,16,4);
      cx.fillStyle='#232a58';cx.font=F9;cx.textAlign='center';cx.textBaseline='middle';cx.fillText('24',sx,by+2.5);
      // 現在地
      const mx=bx0+(bx1-bx0)*prog;
      drawGlow(glowCyan,mx,by,10,.8);
      cx.fillStyle='#fff';cx.beginPath();cx.arc(mx,by,3,0,TAU);cx.fill();
      // 傘の耐久
      cx.textAlign='left';cx.font=F10;
      shadowText('傘',16,40,'#9a8cc0');
      for(let i=0;i<MAX_HP;i++){
        const ux=38+i*19, uy=42, ok=i<hp;
        cx.strokeStyle=ok?'rgba(235,245,255,.9)':'rgba(120,100,150,.5)';cx.fillStyle=ok?'rgba(200,225,255,.3)':'rgba(0,0,0,0)';cx.lineWidth=1.1;
        cx.beginPath();cx.moveTo(ux-7,uy-3);cx.quadraticCurveTo(ux,uy-12,ux+7,uy-3);cx.closePath();cx.fill();cx.stroke();
        cx.beginPath();cx.moveTo(ux,uy-9);cx.lineTo(ux,uy+3);cx.arc(ux+1.5,uy+3,1.5,Math.PI,0,true);cx.stroke();
        if(!ok){cx.strokeStyle='#e83055';cx.beginPath();cx.moveTo(ux-5,uy-8);cx.lineTo(ux+5,uy+2);cx.stroke();}
      }
      // 残り距離
      const rem=Math.max(0,GOAL_M-Math.floor(cam/M));
      cx.font=F11;cx.textAlign='center';
      shadowText(rem>0?`コンビニまで ${rem}m`:'到着',VW/2,30,'#deccf8');
      // 目覚めゲージ
      const gx=VW-96,gy=44,gw=78;
      const fcx=gx-12;
      cx.fillStyle='#e6cdd8';cx.beginPath();cx.arc(fcx,gy-2,6,0,TAU);cx.fill();
      cx.fillStyle='#5a3a7a';cx.beginPath();cx.arc(fcx,gy-3,6.3,Math.PI*1.05,Math.PI*1.95);cx.fill();
      cx.strokeStyle='#2a1838';cx.lineWidth=1;cx.beginPath();
      if(woke){cx.fillStyle='#2a1838';cx.fillRect(fcx-3.5,gy-2,1.6,2);cx.fillRect(fcx+2,gy-2,1.6,2);}
      else{cx.moveTo(fcx-4,gy-1.5);cx.quadraticCurveTo(fcx-2.5,gy,fcx-1,gy-1.5);cx.moveTo(fcx+1,gy-1.5);cx.quadraticCurveTo(fcx+2.5,gy,fcx+4,gy-1.5);cx.stroke();}
      cx.fillStyle='rgba(232,48,85,.6)';cx.beginPath();cx.arc(fcx-4,gy+1,1.5,0,TAU);cx.arc(fcx+4,gy+1,1.5,0,TAU);cx.fill();
      cx.fillStyle='rgba(138,82,212,.25)';cx.fillRect(gx,gy-4,gw,6);
      const wc=wake<.6?'#8a52d4':wake<.85?'#e8b830':'#e83055';
      cx.fillStyle=(wake>.85&&!woke&&Math.sin(t*12)>0)?'#ff8aa0':wc;cx.fillRect(gx,gy-4,gw*wake,6);
      cx.font=F9;cx.textAlign='left';
      shadowText(woke?'起きちゃった…':'ねむってる',gx+4,gy-11,woke?'#ff8aa0':'#9a8cc0');
      if(!woke){cx.fillStyle='rgba(222,204,248,.6)';cx.font=F9;cx.fillText('z',fcx+5,gy-12-Math.sin(t*2)*2);}
    }

    function drawPanel(x,y,w,h){
      cx.fillStyle='rgba(10,7,22,.92)';rrect(cx,x,y,w,h,8);cx.fill();
      cx.strokeStyle='rgba(138,82,212,.8)';cx.lineWidth=1;rrect(cx,x+.5,y+.5,w-1,h-1,8);cx.stroke();
      cx.fillStyle='rgba(0,232,200,.5)';cx.fillRect(x+12,y,w-24,1);
      cx.fillStyle='rgba(138,82,212,.5)';cx.fillRect(x+3,y+3,2,2);cx.fillRect(x+w-5,y+3,2,2);cx.fillRect(x+3,y+h-5,2,2);cx.fillRect(x+w-5,y+h-5,2,2);
    }
    function blink(){return Math.sin(t*6)>-.3;}

    // ── タイトル（ロゴ）・到着・転倒 ──
    function drawOverlay(){
      if(phase==='title'){
        cx.fillStyle='rgba(4,3,10,.5)';cx.fillRect(0,0,VW,VH);
        const lu=easeBack(clamp(phaseT/.6,0,1));
        const lw=Math.min(VW-20,300), lh=lw*120/300;
        const ly=Math.max(64,GY*.18)-40*(1-lu);
        cx.globalAlpha=clamp(phaseT*3,0,1);
        cx.drawImage(logoC,(VW-lw)/2,ly,lw,lh);
        cx.textAlign='center';cx.textBaseline='middle';cx.font=F10;
        shadowText(`今夜の天気：${WEATHER.name}　ルート：${ROUTE}`,VW/2,ly+lh+8,'#bbaedd');
        if(DATA.best)shadowText(`ベスト評価 ${DATA.best}　最速 ${DATA.bestTime?DATA.bestTime.toFixed(1)+'秒':'--'}`,VW/2,ly+lh+24,'#e8b830');
        const w=Math.min(VW-28,310),h=118,x=(VW-w)/2,y=ly+lh+(DATA.best?38:26);
        drawPanel(x,y,w,h);
        cx.textAlign='left';const lx=x+16;
        cx.font=F12;shadowText('▲ ジャンプ',lx,y+18,'#00e8c8');
        cx.font=F10;shadowText('タップ／Space／↑',lx+86,y+18,'#bbaedd');
        shadowText('長押しで高く・空中でもう1回',lx+86,y+32,'#9a8cc0');
        cx.font=F12;shadowText('▼ スライド',lx,y+56,'#e8b830');
        cx.font=F10;shadowText('下スワイプ／↓',lx+86,y+56,'#bbaedd');
        shadowText('看板・工事バーはくぐる',lx+86,y+70,'#9a8cc0');
        shadowText('☂ 傘が3回壊れたら失敗　水たまりは減速',lx,y+94,'#ff8aa0');
        const p=Math.min(1,phaseT/4.2);
        cx.fillStyle='rgba(138,82,212,.35)';cx.fillRect(x+16,y+h-8,w-32,2);
        cx.fillStyle='#00e8c8';cx.fillRect(x+16,y+h-8,(w-32)*p,2);
        cx.textAlign='center';cx.font=F11;
        if(blink())shadowText('タップでスタート',VW/2,y+h+16,'#deccf8');
        cx.globalAlpha=1;
      }else if(phase==='arrive'&&phaseT>2){
        const u=clamp((phaseT-2)*3,0,1);
        cx.globalAlpha=u;
        cx.fillStyle='rgba(4,3,10,.35)';cx.fillRect(0,0,VW,VH);
        const w=Math.min(VW-28,300),h=150+(purin?22:0),x=(VW-w)/2,y=Math.max(70,GY*.38-h/2)+20*(1-ease(u));
        drawPanel(x,y,w,h);
        cx.textAlign='center';cx.textBaseline='middle';
        cx.font=F18;shadowText('到着 ─ よるマート',VW/2,y+24,'#00e8c8');
        cx.font=F12;cx.textAlign='left';
        let ly=y+56;const lx=x+26;
        const row=(a,b,c)=>{shadowText(a,lx,ly,'#bbaedd');cx.textAlign='right';shadowText(b,x+w-26,ly,c);cx.textAlign='left';ly+=22;};
        row('冷却シート','✓','#44ee88');
        row('いつものプリン','✓','#44ee88');
        if(purin)row('おまけのプリン','×'+purin,'#ff9ccf');
        row('拾った小銭','¥'+Math.min(COIN_CAP,coins*COIN).toLocaleString(),'#e8b830');
        row('子ども',woke?'起きて待ってる':'まだ寝てる',woke?'#ff8aa0':'#44ee88');
        cx.textAlign='center';cx.font=F10;
        if(phaseT>2.6&&blink())shadowText('タップで帰る',VW/2,y+h-12,'#9a8cc0');
        cx.globalAlpha=1;
      }else if(phase==='fall'){
        const u=clamp(phaseT*2,0,1);
        cx.globalAlpha=u;
        cx.fillStyle='rgba(30,4,14,.35)';cx.fillRect(0,0,VW,VH);
        cx.textAlign='center';cx.textBaseline='middle';
        cx.save();cx.translate(VW/2,GY*.45);const k=.6+.4*easeBack(u);cx.scale(k,k);
        cx.font=F18;shadowText('傘が、もう持たない……',0,0,'#ff8aa0');cx.restore();
        cx.font=F11;shadowText('ずぶ濡れで、引き返す。',VW/2,GY*.45+26,'#bbaedd');
        cx.globalAlpha=1;
      }
    }
    // ステージ名の帯
    function drawBanner(){
      if(!banner)return;
      const bt=banner.t, inU=ease(clamp(bt/.35,0,1)), outU=ease(clamp((bt-2.1)/.4,0,1));
      const y=Math.max(84,GY*.3), x=VW*(1-inU)-VW*outU;
      cx.fillStyle='rgba(10,7,22,.82)';cx.fillRect(x,y-20,VW,40);
      cx.fillStyle='#e8b830';cx.fillRect(x,y-20,VW,1);cx.fillStyle='#8a52d4';cx.fillRect(x,y+19,VW,1);
      cx.textAlign='center';cx.textBaseline='middle';
      cx.font=F10;shadowText(banner.no,x+VW/2,y-9,'#e8b830');
      cx.font=F15;shadowText(banner.name,x+VW/2,y+8,'#deccf8');
    }
    // チュートリアルの吹き出し
    function drawHints(){
      if(phase!=='run')return;
      for(let i=0;i<obs.length;i++){
        const o=obs[i];
        if(!o.hint||o.hit||o.x+o.w<cam+PX-4)continue;
        const x=o.x+o.w/2-cam;if(x>VW+60)continue;
        const y=(o.over?GY-150:GY-(o.h+58))+Math.sin(t*5)*2;
        cx.font=F11;const tw=cx.measureText(o.hint).width+20;
        const bx=clamp(x-tw/2,6,VW-tw-6);
        cx.fillStyle='rgba(10,7,22,.88)';rrect(cx,bx,y-13,tw,26,6);cx.fill();
        cx.strokeStyle=o.type==='sign'?'#e8b830':'#00e8c8';cx.lineWidth=1.2;rrect(cx,bx+.5,y-12.5,tw-1,25,6);cx.stroke();
        cx.fillStyle=cx.strokeStyle;cx.beginPath();cx.moveTo(x-5,y+13);cx.lineTo(x+5,y+13);cx.lineTo(x,y+19);cx.fill();
        cx.textAlign='center';cx.textBaseline='middle';shadowText(o.hint,bx+tw/2,y+1,'#deccf8');
      }
    }

    // ── 家の場面 ──
    function homeFloor(){return VH-196;}
    function drawKidFace(x,y,r,awake,cool,hot){
      cx.fillStyle='#4a2a70';cx.beginPath();cx.arc(x,y,r*1.05,0,TAU);cx.fill();
      cx.fillStyle='#f2d6de';cx.beginPath();cx.ellipse(x+r*.12,y+r*.18,r*.82,r*.78,0,0,TAU);cx.fill();
      cx.fillStyle='#4a2a70';cx.beginPath();cx.ellipse(x-r*.1,y-r*.45,r*.95,r*.45,-.15,0,TAU);cx.fill();
      cx.fillRect(x+r*.3,y-r*.55,r*.35,r*.5);
      if(cool){cx.fillStyle='rgba(225,245,255,.95)';rrect(cx,x-r*.45,y-r*.4,r*.95,r*.36,r*.12);cx.fill();cx.fillStyle='rgba(120,200,255,.6)';cx.fillRect(x-r*.35,y-r*.3,r*.75,r*.06);}
      const fl=hot?.55+.2*Math.sin(t*3):.3;
      cx.fillStyle=`rgba(232,70,100,${fl.toFixed(2)})`;
      cx.beginPath();cx.ellipse(x-r*.32,y+r*.35,r*.2,r*.12,0,0,TAU);cx.ellipse(x+r*.56,y+r*.35,r*.2,r*.12,0,0,TAU);cx.fill();
      cx.strokeStyle='#3a2048';cx.lineWidth=Math.max(1,r*.09);cx.lineCap='round';
      cx.beginPath();
      if(awake){cx.fillStyle='#3a2048';cx.fillRect(x-r*.38,y+r*.05,r*.16,r*.2);cx.fillRect(x+r*.42,y+r*.05,r*.16,r*.2);}
      else{cx.moveTo(x-r*.45,y+r*.12);cx.quadraticCurveTo(x-r*.3,y+r*.25,x-r*.15,y+r*.12);cx.moveTo(x+r*.35,y+r*.12);cx.quadraticCurveTo(x+r*.5,y+r*.25,x+r*.65,y+r*.12);}
      cx.moveTo(x+r*.02,y+r*.5);cx.lineTo(x+r*.2,y+r*.5);
      cx.stroke();cx.lineCap='butt';
      if(hot){const dy=(t*.6)%1;cx.fillStyle=`rgba(170,220,255,${(1-dy).toFixed(2)})`;cx.beginPath();cx.ellipse(x+r*.85,y-r*.1+dy*r*.5,r*.08,r*.13,0,0,TAU);cx.fill();}
    }
    function drawHome(){
      const HF=homeFloor();
      cx.drawImage(homeC,0,0,VW,VH);
      // 窓の雨と稲光
      const wx=VW*.5,wy=Math.max(40,HF-250),ww=VW*.4,wh=130;
      cx.save();cx.beginPath();cx.rect(wx+4,wy+4,ww-8,wh-8);cx.clip();
      if(lightning>0){cx.fillStyle=`rgba(220,230,255,${(lightning*.7).toFixed(2)})`;cx.fillRect(wx,wy,ww,wh);}
      cx.strokeStyle='rgba(180,200,255,.35)';cx.lineWidth=1;cx.beginPath();
      for(let i=0;i<rnN;i+=3){const x=wx+(rx[i]%ww),y=wy+(ry[i]%wh);cx.moveTo(x,y);cx.lineTo(x-3,y-9);}
      cx.stroke();cx.restore();
      if(lightning>0){cx.fillStyle=`rgba(200,215,255,${(lightning*.12).toFixed(3)})`;cx.fillRect(0,0,VW,VH);}
      // 布団と子ども
      const fx0=22,fx1=VW*.6,fy=HF+16;
      const breathe=Math.sin(t*2.2)*1.5;
      const st=phase==='story'?'sleepHot':outcome==='down'?'sitHot':woke?'sitPudding':'sleepCool';
      cx.fillStyle='#bdb3d4';rrect(cx,fx0,fy,fx1-fx0,34,6);cx.fill();
      cx.fillStyle='rgba(60,40,90,.35)';cx.fillRect(fx0,fy+28,fx1-fx0,6);
      cx.fillStyle='#ece6f4';cx.beginPath();cx.ellipse(fx0+30,fy+6,22,9,0,0,TAU);cx.fill();
      const sit=st.startsWith('sit');
      if(sit){
        // 起き上がった子ども
        const kx=fx0+38,ky=fy-34;
        cx.fillStyle='#e6a8c0';rrect(cx,kx-12,ky+8,26,34,8);cx.fill();
        cx.fillStyle='rgba(255,255,255,.35)';cx.fillRect(kx-2,ky+12,2,26);
        drawKidFace(kx+1,ky,13,true,false,st==='sitHot');
        if(st==='sitPudding'){
          cx.fillStyle='#f2c14e';cx.beginPath();cx.moveTo(kx+8,ky+30);cx.lineTo(kx+10,ky+22);cx.lineTo(kx+20,ky+22);cx.lineTo(kx+22,ky+30);cx.fill();
          cx.fillStyle='#7a3a12';cx.fillRect(kx+10,ky+21,10,2.5);
          cx.fillStyle='rgba(225,245,255,.95)';rrect(cx,kx-5,ky-7,14,5,1.5);cx.fill();
        }
        cx.fillStyle='#e6a8c0';cx.beginPath();cx.ellipse(kx+12,ky+28,6,4,0,0,TAU);cx.fill();
      }else{
        drawKidFace(fx0+32,fy-2,12,false,st==='sleepCool',st==='sleepHot');
        if(st==='sleepHot'||st==='sleepCool'){cx.font=F11;cx.textAlign='left';cx.fillStyle='rgba(222,204,248,.6)';cx.fillText('z',fx0+50,fy-22-((t*8)%10));}
      }
      // 掛け布団（呼吸で上下）
      const qx=sit?fx0+30:fx0+46, qTop=fy-6-breathe;
      const qg=cx.createLinearGradient(0,qTop,0,fy+30);qg.addColorStop(0,'#7a8ad0');qg.addColorStop(1,'#46559a');
      cx.fillStyle=qg;rrect(cx,qx,qTop,fx1-qx+4,fy+30-qTop,8);cx.fill();
      cx.fillStyle='rgba(255,255,255,.18)';
      for(let x=qx+8;x<fx1-4;x+=14)for(let y=qTop+6;y<fy+26;y+=10)cx.fillRect(x+((y|0)%20?7:0),y,2,2);
      cx.fillStyle='rgba(255,255,255,.25)';cx.fillRect(qx+4,qTop+2,fx1-qx-6,1.5);
      // だんのうら
      homePose=true;setPose();
      const hx=VW*.78, hy=HF+46;
      cx.fillStyle='rgba(0,0,0,.4)';cx.beginPath();cx.ellipse(hx,hy+1,24,4,0,0,TAU);cx.fill();
      cx.save();cx.translate(hx,hy);cx.scale(-1.9,1.9);
      drawFigure(PAL_R,1.3,-1);drawFigure(PAL_N,0,0);
      cx.restore();
      homePose=false;
      if(phase==='story'){
        // 玄関の傘
        cx.strokeStyle='rgba(225,240,255,.75)';cx.lineWidth=1.4;
        cx.beginPath();cx.moveTo(VW-14,HF+46);cx.lineTo(VW-22,HF-36);cx.stroke();
        cx.fillStyle='rgba(210,230,255,.2)';cx.beginPath();cx.moveTo(VW-22,HF-36);cx.lineTo(VW-28,HF+6);cx.lineTo(VW-12,HF+6);cx.closePath();cx.fill();cx.stroke();
      }else if(outcome==='clear'){
        // コンビニ袋
        const bx=VW*.62,by=HF+44;
        cx.fillStyle='rgba(240,245,255,.9)';cx.beginPath();cx.moveTo(bx-12,by);cx.lineTo(bx-10,by-20);cx.lineTo(bx+10,by-20);cx.lineTo(bx+12,by);cx.closePath();cx.fill();
        cx.strokeStyle='rgba(240,245,255,.9)';cx.lineWidth=2;cx.beginPath();cx.arc(bx-4,by-22,4,Math.PI,0);cx.arc(bx+4,by-22,4,Math.PI,0);cx.stroke();
        cx.fillStyle='#00a890';cx.fillRect(bx-6,by-13,12,4);
      }else{
        // 折れた傘と雫
        cx.strokeStyle='rgba(225,240,255,.6)';cx.lineWidth=1.2;
        cx.beginPath();cx.moveTo(VW-16,HF+46);cx.lineTo(VW-30,HF-20);cx.lineTo(VW-44,HF-10);cx.moveTo(VW-30,HF-20);cx.lineTo(VW-14,HF-28);cx.stroke();
        const dy=(t*1.4)%1;cx.fillStyle=`rgba(170,210,255,${(1-dy).toFixed(2)})`;
        cx.fillRect(hx-10,HF-40+dy*80,1.5,4);cx.fillRect(hx+8,HF-20+((dy+.5)%1)*60,1.5,4);
      }
    }
    function drawDialog(){
      if(!dlg)return;
      const L=dlg.lines[dlg.i];
      const bh=112,by=VH-bh-8,bx=8,bw=VW-16;
      drawPanel(bx,by,bw,bh);
      const hasP=L.who!=='narr';
      const tx=hasP?bx+88:bx+16, tw=bw-(hasP?100:32);
      if(hasP){
        const px=bx+10,py2=by+12,ps=70;
        cx.fillStyle='#1c1430';rrect(cx,px,py2,ps,ps,6);cx.fill();
        cx.save();rrect(cx,px,py2,ps,ps,6);cx.clip();
        if(L.who==='dan'){
          const im=IMG[L.face]||IMG.normal;
          if(im&&im.complete&&im.naturalWidth)cx.drawImage(im,10,0,180,180,px,py2,ps,ps);
        }else{
          const g2=cx.createLinearGradient(0,py2,0,py2+ps);g2.addColorStop(0,'#3a2a5a');g2.addColorStop(1,'#1c1430');
          cx.fillStyle=g2;cx.fillRect(px,py2,ps,ps);
          drawKidFace(px+ps/2,py2+ps/2+4,24,phase!=='story'&&(outcome==='down'||woke),outcome==='clear'&&!woke&&phase==='home',phase==='story'||outcome==='down');
        }
        cx.restore();
        cx.strokeStyle='#8a52d4';cx.lineWidth=1;rrect(cx,px+.5,py2+.5,ps-1,ps-1,6);cx.stroke();
        cx.font=F10;cx.textAlign='left';cx.textBaseline='middle';
        shadowText(L.who==='dan'?'だんのうら':'こども',tx,by+14,L.who==='dan'?'#00e8c8':'#ff9ccf');
      }
      cx.font=F13;cx.textAlign='left';cx.textBaseline='middle';
      if(!dlg.wrapped){
        const out=[];let cur='';
        for(const ch of L.text){if(cx.measureText(cur+ch).width>tw){out.push(cur);cur=ch;}else cur+=ch;}
        out.push(cur);dlg.wrapped=out;
      }
      let left=dlg.ch|0, ly=by+(hasP?36:30);
      for(const line of dlg.wrapped){
        if(left<=0)break;
        const sh=line.slice(0,left);left-=line.length;
        shadowText(sh,tx,ly,L.who==='narr'?'#9a8cc0':'#deccf8');ly+=20;
      }
      if(dlg.ch>=L.text.length&&blink()){cx.fillStyle='#00e8c8';cx.beginPath();cx.moveTo(bx+bw-20,by+bh-16);cx.lineTo(bx+bw-12,by+bh-16);cx.lineTo(bx+bw-16,by+bh-11);cx.fill();}
      cx.font=F9;cx.textAlign='right';shadowText('タップで進む',bx+bw-26,by+bh-13,'#5e5078');
    }
    function drawGrade(){
      if(phase!=='grade')return;
      const u=clamp(phaseT*3,0,1);
      cx.fillStyle=`rgba(4,3,10,${(.55*u).toFixed(2)})`;cx.fillRect(0,0,VW,VH);
      const g=gradeInfo?gradeInfo.g:'C';
      const w=Math.min(VW-28,300),h=290,x=(VW-w)/2,y=Math.max(30,(VH-h)/2-30)+16*(1-ease(u));
      cx.globalAlpha=u;
      drawPanel(x,y,w,h);
      cx.textAlign='center';cx.textBaseline='middle';
      cx.font=F12;shadowText(outcome==='clear'?'今夜の買い出し ─ 評価':'今夜の買い出し ─ 失敗',VW/2,y+20,'#9a8cc0');
      // 評価の判子
      const su=clamp((phaseT-.2)/.35,0,1);
      if(su>0){
        const k=3-2*easeBack(su);
        const col={S:'#e8b830',A:'#00e8c8',B:'#8a52d4',C:'#e83055'}[g];
        cx.save();cx.translate(VW/2,y+68);cx.scale(k,k);cx.rotate(-.12);
        cx.globalAlpha=u*su;
        drawGlow(g==='S'?glowGold:g==='A'?glowCyan:g==='B'?glowPink:glowRed,0,0,46,.6);
        cx.strokeStyle=col;cx.lineWidth=3;cx.beginPath();cx.arc(0,0,30,0,TAU);cx.stroke();
        cx.lineWidth=1;cx.beginPath();cx.arc(0,0,25,0,TAU);cx.stroke();
        cx.font='40px '+FONT;shadowText(g,0,2,col);
        cx.restore();cx.globalAlpha=u;
      }
      cx.font=F12;cx.textAlign='left';
      let ly=y+138;const lx=x+28;
      const row=(a,b,c)=>{shadowText(a,lx,ly,'#bbaedd');cx.textAlign='right';shadowText(b,x+w-28,ly,c);cx.textAlign='left';ly+=20;};
      if(outcome==='clear'){
        row('タイム',runTime.toFixed(1)+'秒','#deccf8');
        row('被弾',hits+'回',hits?'#ff8aa0':'#44ee88');
        row('小銭','¥'+Math.min(COIN_CAP,coins*COIN).toLocaleString(),'#e8b830');
        row('おまけのプリン',purin+'個',purin?'#ff9ccf':'#9a8cc0');
        row('子ども',woke?'起きて待ってた':'ぐっすり',woke?'#ff8aa0':'#44ee88');
      }else{
        row('走った距離',Math.min(GOAL_M,Math.floor(cam/M))+'m / '+GOAL_M+'m','#deccf8');
        row('小銭','¥'+Math.min(COIN_CAP,coins*COIN).toLocaleString(),'#e8b830');
      }
      cx.textAlign='center';cx.font=F10;
      shadowText(`ベスト ${DATA.best||'-'}　最速 ${DATA.bestTime?DATA.bestTime.toFixed(1)+'秒':'--'}　プレイ ${DATA.plays}回`,VW/2,y+h-34,'#9a8cc0');
      if(gradeInfo&&gradeInfo.newRec&&blink()){cx.font=F12;shadowText('NEW RECORD!',VW/2,y+114,'#e8b830');}
      if(phaseT>1.2&&blink()){cx.font=F11;shadowText('タップで終わる',VW/2,y+h-14,'#deccf8');}
      cx.globalAlpha=1;
    }
    // アイリスワイプ
    function drawWipe(){
      if(!tr)return;
      const maxR=Math.hypot(VW,VH)*.6;
      const r=tr.t<.5?maxR*(1-ease(tr.t/.5)):maxR*ease((tr.t-.5)/.5);
      cx.fillStyle='#05040e';cx.beginPath();cx.rect(0,0,VW,VH);
      cx.arc(VW/2,VH*.55,Math.max(0,r),0,TAU,true);cx.fill('evenodd');
    }

    function draw(){
      cx.setTransform(dpr*sc,0,0,dpr*sc,0,0);
      const home=phase==='story'||phase==='home'||(phase==='grade');
      if(home){
        drawHome();
        cx.drawImage(vignC,0,0,VW,VH);
        drawDialog();
        drawGrade();
        drawWipe();
        return;
      }
      cx.save();
      if(shake>0){const k=shake*shake*40;cx.translate(rnd(-1,1)*k,rnd(-1,1)*k*.6);}
      drawWorld();
      for(let i=0;i<obs.length;i++)drawObstacle(obs[i]);
      for(let i=0;i<items.length;i++)if(!items[i].got)drawItem(items[i]);
      drawPlayer();
      // パーティクル
      for(let i=0;i<P.length;i++){const p=P[i];if(!p.a)continue;cx.globalAlpha=Math.max(0,p.l/p.m);cx.fillStyle=p.c;cx.fillRect(p.x-cam-p.s/2,p.y-p.s/2,p.s,p.s);}
      cx.globalAlpha=1;
      drawSpeedLines();
      drawRain();
      cx.restore();
      if(lightning>0){cx.fillStyle=`rgba(220,230,255,${(lightning*.22).toFixed(3)})`;cx.fillRect(0,0,VW,VH);}
      cx.drawImage(vignC,0,0,VW,VH);
      drawCarWarnings();
      drawHints();
      // ポップアップ（ポンと弾んで出る）
      cx.textAlign='center';cx.textBaseline='middle';
      for(let i=0;i<POP.length;i++){
        const p=POP[i];if(!p.a)continue;
        const age=p.m-p.l, k=age<.18?.6+.4*easeBack(age/.18):1;
        cx.globalAlpha=Math.min(1,p.l*2.5);cx.font=p.big?F13:F11;
        cx.save();cx.translate(clamp(p.x-cam,70,VW-70),p.y);cx.scale(k,k);
        shadowText(p.txt,0,0,p.c);cx.restore();
      }
      cx.globalAlpha=1;
      if(flash>0){cx.fillStyle=`rgba(232,48,85,${(flash*.35).toFixed(3)})`;cx.fillRect(0,0,VW,VH);}
      if(woke&&phase==='run'){cx.fillStyle=`rgba(232,48,85,${(.06+.04*Math.sin(t*4)).toFixed(3)})`;cx.fillRect(0,0,VW,VH);}
      if(phase!=='title')drawHUD();
      drawBanner();
      drawOverlay();
      drawWipe();
    }

    function updateFooter(){
      const rem=Math.max(0,GOAL_M-Math.floor(cam/M));
      const s=`小銭 ¥${Math.min(COIN_CAP,coins*COIN).toLocaleString()}${purin?'　🍮'+purin:''}　☂${'■'.repeat(clamp(hp,0,MAX_HP))}${'□'.repeat(clamp(MAX_HP-hp,0,MAX_HP))}`;
      if(s!==lastScore){lastScore=s;mg.setScore(s);}
      mg.setTimer(phase==='story'||phase==='title'?'深夜2:14':phase==='home'||phase==='grade'?'帰宅':rem+'m');
    }

    resize();
    if(ro)ro.observe(body);
    startDialog(INTRO,()=>wipe(()=>{phase='title';phaseT=0;sfx('stage','decide');}));
    mg.loop(dt=>{
      update(Math.max(0,dt));
      if(mg._ended)return;
      draw();
      updateFooter();
    });

    return {result(reason){
      if(ro)ro.disconnect();
      clearTimeout(rzTimer);
      // 結果が確定した後に「終了」を押しても、確定した結果で精算する
      if(outcome)reason=outcome;
      commit();
      const clear=reason==='clear', down=reason==='down';
      const money=Math.min(COIN_CAP,coins*COIN);
      const pb=Math.min(2,purin);
      let fx;
      if(clear){
        fx={childStress:-((woke?4:8)+pb*2), mental:2+pb, money, fatigue:8-Math.min(3,drinks)};
      }else if(down){
        fx={childStress:-3, mental:-4, money, fatigue:8};
      }else{
        fx={fatigue:4};
      }
      const dist=Math.min(GOAL_M,Math.floor(cam/M));
      return {
        title:(clear?(woke?'🏃 なんとか間に合った':'🏃 コンビニまで走りきった'):down?'☔ 傘が壊れた':'🏃 引き返した')+(gradeInfo&&reason!=='quit'?'　評価 '+gradeInfo.g:''),
        summary:clear
          ?`冷却シートと、いつものプリンを買えた。${purin?`<br>おまけのプリン <span class="up">${purin}</span>`:''}`+
           `<br>拾った小銭 <span class="up">¥${money.toLocaleString()}</span>　被弾 <span class="${hits?'down':'up'}">${hits}</span>`+
           (woke?'<br><span class="down">子どもは起きて待っていた。</span>':'<br>子どもはまだ、すうすう眠っている。')
          :`走った距離 <span class="up">${dist}m</span> / ${GOAL_M}m`+(down?'<br>何も買えずに帰った。せめて濡れタオルで額を冷やした。':''),
        fx, time:clear||down?40:20, sp:clear?1:0,
        log:clear?'雨の夜、コンビニまで走った。冷却シートとプリンを買えた。'
          :down?'雨の中で転んで、買い出しを諦めた。':'買い出しの途中で引き返した。',
        cutin:clear?(woke?['tired','……起こしちゃったわね。でも、プリンはちゃんとあるわよ。']
          :['happy','……間に合った。熱、下がるといいわね。プリンは朝に一緒に食べましょう。'])
          :down?['tired','……ごめんね。傘より先に、私が折れそうだったわ。']:null,
      };
    }};
  },
});
