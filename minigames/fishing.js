// ══════════════════════════════════════════════════════════
// 釣り（癒し系）「夜釣りで頭を空っぽに」
// 壇ノ浦の夜の港。関門橋の灯り、灯台の光、波に崩れる月。
// 6投だけ糸を垂らして、釣れたものは魚図鑑（gs.fishingData）に残る。
// ══════════════════════════════════════════════════════════
addMinigameStyle('fishing',`
.mg-fishing{background:#05040e;}
.mg-fishing .fishing-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;}
.mg-fishing .fishing-zbtn{position:absolute;right:8px;top:8px;z-index:4;touch-action:none;padding:5px 9px 4px;border-radius:12px;
  border:1px solid rgba(0,232,200,.45);background:rgba(8,10,28,.72);color:#bff6ee;font-family:var(--dot);font-size:.64rem;letter-spacing:.04em;
  cursor:pointer;-webkit-tap-highlight-color:transparent;box-shadow:0 0 10px rgba(0,232,200,.18);}
.mg-fishing .fishing-zbtn small{font-family:var(--mono);font-size:.58rem;color:rgba(190,246,238,.65);margin-left:4px;}
.mg-fishing .fishing-zbtn:active{transform:scale(.95);}
.mg-fishing .fishing-ov{position:absolute;inset:0;z-index:5;display:flex;align-items:center;justify-content:center;padding:16px;
  background:rgba(3,2,10,.55);opacity:0;pointer-events:none;transition:opacity .35s;touch-action:none;}
.mg-fishing .fishing-ov.on{opacity:1;pointer-events:auto;}
.mg-fishing .fishing-panel{width:100%;max-width:330px;background:rgba(10,7,22,.94);border:1px solid rgba(138,82,212,.6);border-radius:10px;
  padding:16px 16px 12px;color:var(--tx);font-family:var(--dot);box-shadow:0 0 28px rgba(80,60,180,.25),inset 0 0 20px rgba(138,82,212,.08);}
.mg-fishing .fishing-h{font-size:1rem;color:var(--tx-b);text-align:center;letter-spacing:.08em;}
.mg-fishing .fishing-sub{font-family:var(--mono);font-size:.62rem;color:var(--cy);text-align:center;margin:4px 0 10px;letter-spacing:.05em;}
.mg-fishing .fishing-step{display:flex;gap:9px;align-items:flex-start;font-size:.72rem;line-height:1.6;margin:7px 0;}
.mg-fishing .fishing-step b{font-weight:normal;flex:0 0 1.7em;height:1.7em;border-radius:50%;display:flex;align-items:center;justify-content:center;
  border:1px solid rgba(0,232,200,.5);color:var(--cy);font-family:var(--mono);font-size:.7rem;}
.mg-fishing .fishing-step small{display:block;color:var(--tx-d);font-size:.6rem;}
.mg-fishing .fishing-tap{text-align:center;margin-top:12px;font-size:.72rem;color:var(--tx-b);animation:fishing-blink 2.2s ease-in-out infinite;}
@keyframes fishing-blink{0%,100%{opacity:.45}50%{opacity:1}}
.mg-fishing .fishing-card{position:relative;text-align:center;transform:translateY(10px) scale(.97);transition:transform .45s cubic-bezier(.2,.9,.3,1.2);}
.mg-fishing .fishing-ov.on .fishing-card{transform:none;}
.mg-fishing .fishing-card.rare{border-color:rgba(232,184,48,.85);box-shadow:0 0 30px rgba(232,184,48,.3),inset 0 0 24px rgba(232,184,48,.1);}
.mg-fishing .fishing-card canvas{display:block;margin:2px auto 4px;width:260px;height:130px;max-width:100%;}
.mg-fishing .fishing-tag{position:absolute;left:10px;top:10px;font-family:var(--mono);font-size:.58rem;padding:2px 7px;border-radius:9px;border:1px solid;}
.mg-fishing .fishing-tag.new{color:var(--gn);border-color:rgba(68,238,136,.6);background:rgba(68,238,136,.08);}
.mg-fishing .fishing-tag.rare{left:auto;right:10px;color:var(--gd);border-color:rgba(232,184,48,.65);background:rgba(232,184,48,.08);}
.mg-fishing .fishing-nm{font-size:1.1rem;color:var(--tx-b);letter-spacing:.1em;}
.mg-fishing .fishing-sz{font-family:var(--mono);font-size:.7rem;color:var(--cy);margin:2px 0 8px;}
.mg-fishing .fishing-sz em{font-style:normal;color:var(--gd);margin-left:6px;}
.mg-fishing .fishing-fl{font-family:var(--serif);font-size:.74rem;line-height:1.85;color:var(--tx);text-align:left;padding:8px 4px 0;border-top:1px dashed rgba(138,82,212,.35);}
.mg-fishing .fishing-zk{max-height:100%;display:flex;flex-direction:column;max-width:400px;}
.mg-fishing .fishing-zgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;overflow-y:auto;padding:2px 2px 4px;margin-top:8px;}
.mg-fishing .fishing-zc{border:1px solid rgba(138,82,212,.3);border-radius:6px;background:rgba(138,82,212,.05);padding:4px 5px 5px;text-align:center;}
.mg-fishing .fishing-zc.got{border-color:rgba(0,232,200,.35);}
.mg-fishing .fishing-zc.r3.got{border-color:rgba(232,184,48,.6);background:rgba(232,184,48,.05);}
.mg-fishing .fishing-zc canvas{display:block;width:100%;height:auto;aspect-ratio:2/1;}
.mg-fishing .fishing-zc .n{font-size:.68rem;color:var(--tx-b);}
.mg-fishing .fishing-zc .d{font-family:var(--mono);font-size:.56rem;color:var(--tx-d);}
.mg-fishing .fishing-zclose{margin:10px auto 0;display:block;background:transparent;border:1px solid rgba(138,82,212,.6);color:var(--tx-b);
  font-family:var(--dot);font-size:.72rem;padding:6px 22px;border-radius:14px;cursor:pointer;}
`);

registerMinigame({
  id:'fishing', icon:'🎣', name:'夜釣りで頭を空っぽに', genre:'釣り（癒し系）', bgm:'night',
  desc:'壇ノ浦の夜の港で、6投だけ糸を垂らす。関門橋の灯りと波の音。釣れたものは魚図鑑に残っていく。',
  effect:'精神↑ 疲労↓ 希望↑ 魚図鑑 ／ 疲労-4 約60分',
  help:'長押し→離して投げる／ウキが沈んだらタップ／長押しで巻く',
  start(body,mg){
    const FONT='"DotGothic16", monospace';
    const CASTS=6;
    // ── 図鑑データ ──
    const SPECIES=[
      {id:'aji',name:'マアジ',r:1,w:11,min:14,max:28,col:['#4d6f94','#c9d6e2','#f2f5f8'],h:.27,tail:'fork',fin:'soft',eye:.075,scute:true,tint:'rgba(232,206,96,.32)',
        flav:['港の夜の定番。灯りに集まる小魚を追って、群れで回ってくる。','背中の青が、月の光でいちばんきれいに見える魚。']},
      {id:'mebaru',name:'メバル',r:1,w:11,min:13,max:27,col:['#2f2c3c','#6d6a7c','#b4b0bc'],h:.34,tail:'trunc',fin:'spiky',eye:.11,bars:'rgba(16,14,26,.45)',
        flav:['大きな目で月明かりを見上げている。「春告魚」とも呼ばれる。','凪の夜ほどよく浮く。静かにしてたら、向こうから来てくれる。']},
      {id:'kasago',name:'カサゴ',r:1,w:9,min:12,max:25,col:['#8e2f22','#c0603e','#ecc0a0'],h:.36,tail:'round',fin:'spiky',eye:.085,mottle:'rgba(60,16,12,.5)',
        flav:['岸壁の隙間に住む、根の主。トゲに気をつけて。','ゴツゴツした顔やけど、味は優しい。']},
      {id:'seigo',name:'セイゴ',r:1,w:8,min:22,max:42,col:['#3f4f62','#93a3b4','#e8eef4'],h:.24,tail:'fork',fin:'spiky',eye:.06,
        flav:['スズキの若い頃の名前。出世魚は、育つたびに名前が変わる。','この子もいつか、名前が変わるくらい大きくなる。']},
      {id:'fugu',name:'クサフグ',r:1,w:9,min:9,max:18,col:['#3f5a30','#7b8f58','#f6f3e6'],h:.54,tail:'round',fin:'soft',eye:.1,dots:'rgba(238,238,214,.75)',
        flav:['下関では「ふく」と呼ぶ。福に通じるから、らしい。','怒るとぷくっと膨らむ。……その気持ち、ちょっとわかる。']},
      {id:'haze',name:'マハゼ',r:1,w:8,min:7,max:16,col:['#7a6a4a','#b5a47e','#eee4cc'],h:.21,tail:'round',fin:'soft',eye:.085,dots:'rgba(70,52,32,.55)',
        flav:['足元の砂地でちょこんと待っている。子どもでも釣れる魚。','「今度あの子も連れてこよう」と思った。']},
      {id:'mejina',name:'メジナ',r:1,w:7,min:18,max:36,col:['#18222f','#33465a','#6c7e90'],h:.43,tail:'fork',fin:'soft',eye:.07,
        flav:['磯の黒い魚。引きが強くて、手のひらが熱くなる。','夜の海と同じ色をしている。']},
      {id:'tachiuo',name:'タチウオ',kind:'ribbon',r:2,w:4,min:60,max:105,
        flav:['刀みたいに光る、立ったまま泳ぐ魚。月を一本、釣り上げたみたいや。','銀色が手に移りそうなほど、ぴかぴかしている。']},
      {id:'anago',name:'マアナゴ',kind:'eel',r:2,w:4,min:30,max:62,
        flav:['夜の住人。体の白い点々は「はかり目」と呼ばれる。','にょろりと逃げようとする。……今夜は逃がしてやろう。']},
      {id:'glass',name:'シーグラス',kind:'glass',r:2,w:3,min:2,max:5,unit:'径',
        flav:['波に丸められたガラスの欠片。何十年、海を旅してきたんやろう。','角が取れてる。……人も、こんなふうになれたらええのに。']},
      {id:'boot',name:'片方の長靴',kind:'boot',r:2,w:2,min:22,max:28,
        flav:['……長靴やった。もう片方は、どこの海におるんやろ。','重かった。期待した分だけ、ちょっと笑えた。']},
      {id:'ika',name:'光るイカ',kind:'squid',r:3,w:3,min:12,max:28,
        flav:['水の中で青く光っていた。星がひとつ、海に落ちてきたみたいや。','光で話をする生き物らしい。何を言うてたんやろう。']},
      {id:'heike',name:'平家ガニ',kind:'crab',r:3,w:2.5,min:2,max:4,unit:'甲幅',
        flav:['甲羅に怒った人の顔。壇ノ浦に沈んだ平家の武者の無念が宿る、と伝わる。','そっと海に返した。……ここは、そういう海なんや。']},
      {id:'suzu',name:'古い鈴',kind:'bell',r:3,w:2,min:3,max:6,unit:'径',
        flav:['錆びた鈴。振るとまだ、かすかに鳴る。誰の物やったんやろう。','八百年前、この海峡で鳴っていた音かもしれない。']},
    ];
    const SP=Object.fromEntries(SPECIES.map(s=>[s.id,s]));

    // ── 永続データ（魚図鑑） ──
    if(!gs.fishingData||typeof gs.fishingData!=='object')gs.fishingData={};
    const FD=gs.fishingData;
    if(!FD.seen||typeof FD.seen!=='object')FD.seen={};
    FD.total=FD.total||0;FD.visits=(FD.visits||0)+1;
    const zCount=()=>SPECIES.filter(s=>FD.seen[s.id]).length;

    // ── 今夜の天気（来るたびに変わる） ──
    const seed0=((gs.day||1)*7919+FD.visits*104729)>>>0;
    function mkRng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
    const wr=mkRng(seed0)();
    const WEATHER=wr<.5?'clear':wr<.78?'rain':'mist';
    const WNAME={clear:'晴れ・凪',rain:'小雨',mist:'朧月'}[WEATHER];
    const moonPhase=.3+mkRng(seed0+11)()*.45; // 0.5=満月
    const TIDE=['大潮','中潮','小潮','長潮','若潮'][(seed0>>3)%5];

    // ── DOM ──
    const cv=document.createElement('canvas');cv.className='fishing-cv';body.appendChild(cv);
    const cx=cv.getContext('2d');
    const zbtn=document.createElement('button');zbtn.className='fishing-zbtn';body.appendChild(zbtn);
    const ov=document.createElement('div');ov.className='fishing-ov';body.appendChild(ov);
    const updZbtn=()=>{zbtn.innerHTML=`📖 図鑑<small>${zCount()}/${SPECIES.length}</small>`;};
    updZbtn();

    const rnd=(a,b)=>a+Math.random()*(b-a);
    const clamp=(v,a,b)=>v<a?a:v>b?b:v;
    const lerp=(a,b,f)=>a+(b-a)*f;
    function se(t){try{AU.se(t);}catch(_){}}

    // ── 画面サイズ・事前描画 ──
    let W=0,H=0,dpr=1,HZ=0,PY=0; // HZ=水平線, PY=岸壁の上端
    let lyBg=null,lyWater=null,lyPier=null,lyVig=null;
    const glow={};
    let townRefl=[],stars=[];
    const BR={}; // 橋
    const LH={}; // 灯台
    const RL={}; // 赤灯台
    const mkCanvas=(w,h,d)=>{const r=d||dpr;const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*r));c.height=Math.max(1,Math.ceil(h*r));const g=c.getContext('2d');g.setTransform(r,0,0,r,0,0);return [c,g];};
    function makeGlow(col,r){
      const [c,g]=mkCanvas(r*2,r*2,1);
      const gr=g.createRadialGradient(r,r,0,r,r,r);
      gr.addColorStop(0,`rgba(${col},1)`);gr.addColorStop(.22,`rgba(${col},.42)`);gr.addColorStop(.55,`rgba(${col},.1)`);gr.addColorStop(1,`rgba(${col},0)`);
      g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);return c;
    }
    function gl(img,x,y,r,a){if(a<=0)return;cx.globalAlpha=a;cx.drawImage(img,x-r,y-r,r*2,r*2);}
    const depthAt=y=>clamp((y-HZ)/(PY-HZ),0,1);
    const scaleAt=y=>.28+.72*Math.pow(depthAt(y),1.15);

    function buildLayers(){
      const R=mkRng(seed0+99);
      const rr=(a,b)=>a+R()*(b-a);
      HZ=Math.round(H*.4);PY=Math.round(H*.85);
      const moon={x:W*.76,y:H*.12,r:Math.max(13,Math.min(W,H)*.042)};
      BR.moon=moon;
      // 空
      let g;[lyBg,g]=mkCanvas(W,HZ+4);
      const sky=g.createLinearGradient(0,0,0,HZ);
      if(WEATHER==='rain'){sky.addColorStop(0,'#06050f');sky.addColorStop(.6,'#0d0b1e');sky.addColorStop(1,'#1a1530');}
      else if(WEATHER==='mist'){sky.addColorStop(0,'#070614');sky.addColorStop(.55,'#12102a');sky.addColorStop(1,'#272042');}
      else{sky.addColorStop(0,'#03030d');sky.addColorStop(.5,'#0a0a24');sky.addColorStop(1,'#1d1a40');}
      g.fillStyle=sky;g.fillRect(0,0,W,HZ+4);
      // 天の川っぽい淡い帯
      if(WEATHER==='clear'){
        g.save();g.translate(W*.1,HZ*.95);g.rotate(-.85);
        const mw=g.createLinearGradient(0,-40,0,40);mw.addColorStop(0,'rgba(120,110,200,0)');mw.addColorStop(.5,'rgba(130,120,210,.07)');mw.addColorStop(1,'rgba(120,110,200,0)');
        g.fillStyle=mw;g.fillRect(-20,-40,H*1.2,80);g.restore();
      }
      // 星
      stars=[];
      const nStar=WEATHER==='clear'?150:WEATHER==='mist'?60:22;
      for(let i=0;i<nStar;i++){
        const x=rr(0,W),y=Math.pow(R(),1.4)*HZ*.92;
        const d=Math.hypot(x-moon.x,y-moon.y);
        if(d<moon.r*2.2)continue;
        const b=R();
        g.fillStyle=`rgba(${b<.15?'255,226,190':b<.3?'190,215,255':'230,228,255'},${(.18+R()*.55)*(WEATHER==='clear'?1:.6)*clamp(d/(moon.r*6),.25,1)})`;
        const s=R()<.08?1.6:1;g.fillRect(x,y,s,s);
        if(i%5===0&&b>.5)stars.push({x,y,ph:R()*6.28,sp:rr(1,3)});
      }
      // 月の光輪
      const halo=WEATHER==='mist'?moon.r*9:WEATHER==='rain'?moon.r*7:moon.r*6;
      let rg=g.createRadialGradient(moon.x,moon.y,moon.r*.8,moon.x,moon.y,halo);
      rg.addColorStop(0,`rgba(220,214,255,${WEATHER==='rain'?.16:.22})`);rg.addColorStop(.25,'rgba(160,150,230,.08)');rg.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=rg;g.fillRect(0,0,W,HZ);
      if(WEATHER==='mist'){ // 朧月の暈
        g.strokeStyle='rgba(200,190,255,.07)';g.lineWidth=moon.r*.9;g.beginPath();g.arc(moon.x,moon.y,moon.r*3.4,0,7);g.stroke();
      }
      drawMoon(g,moon.x,moon.y,moon.r,moonPhase,WEATHER==='rain'?.55:WEATHER==='mist'?.75:1);
      // 雲
      const nCloud=WEATHER==='clear'?3:WEATHER==='mist'?9:12;
      for(let i=0;i<nCloud;i++){
        const y=rr(HZ*.05,HZ*.75),x=rr(-60,W+60),w=rr(80,200),h=rr(14,34);
        const cg=g.createRadialGradient(x,y,0,x,y,w*.6);
        const nearMoon=Math.hypot(x-moon.x,y-moon.y)<w;
        cg.addColorStop(0,nearMoon?'rgba(90,80,140,.28)':WEATHER==='rain'?'rgba(26,22,44,.65)':'rgba(40,32,72,.35)');cg.addColorStop(1,'rgba(0,0,0,0)');
        g.save();g.translate(x,y);g.scale(1,h/w);g.translate(-x,-y);g.fillStyle=cg;g.fillRect(x-w,y-w,w*2,w*2);g.restore();
      }
      // 遠い陸（左：門司、右：下関・火の山）
      const hillL=x=>HZ-H*.05*Math.pow(clamp(1-x/(W*.24),0,1),.7)-H*.006;
      const hillR=x=>{const f=clamp((x-W*.5)/(W*.5),0,1);return HZ-H*.018-H*.075*Math.sin(f*Math.PI*.8)*(.7+.3*Math.sin(f*9));};
      g.fillStyle='#0b0918';
      g.beginPath();g.moveTo(0,HZ+2);for(let x=0;x<=W*.26;x+=4)g.lineTo(x,hillL(x));g.lineTo(W*.26,HZ+2);g.fill();
      g.fillStyle='#0d0a1c';
      g.beginPath();g.moveTo(W*.5,HZ+2);for(let x=W*.5;x<=W+4;x+=4)g.lineTo(x,hillR(x));g.lineTo(W,HZ+2);g.fill();
      // 火の山の展望台の灯り
      const hx=W*.86,hy=hillR(hx);
      // 街の灯り
      townRefl=[];
      const town=(x0,x1,topF)=>{
        for(let i=0;i<(x1-x0)/3.2;i++){
          const x=rr(x0,x1),top=topF(x),y=rr(Math.min(HZ-1,top+2),HZ-1);
          const c=R()<.7?'255,206,140':R()<.5?'200,225,255':'255,170,200';
          const a=rr(.25,.85);
          g.fillStyle=`rgba(${c},${a})`;g.fillRect(x,y,R()<.2?2:1,1);
          if(R()<.35)townRefl.push({x,c,a:a*.55,len:rr(4,14),ph:R()*6.28});
        }
      };
      town(0,W*.25,hillL);town(W*.5,W,hillR);
      g.fillStyle='rgba(255,236,200,.8)';g.fillRect(hx-1,hy-3,2,3);
      // 関門橋（吊り橋）
      BR.x0=-W*.04;BR.x1=W*.6;BR.t1=W*.16;BR.t2=W*.46;
      BR.deck=HZ-H*.022;BR.top=HZ-H*.085;
      const cable=x=>{
        if(x<BR.t1){const f=(x-BR.x0)/(BR.t1-BR.x0);return lerp(BR.deck-1,BR.top,Math.pow(f,1.25));}
        if(x>BR.t2){const f=(BR.x1-x)/(BR.x1-BR.t2);return lerp(BR.deck-1,BR.top,Math.pow(f,1.25));}
        const f=(x-BR.t1)/(BR.t2-BR.t1);return BR.top+(BR.deck-3-BR.top)*(1-Math.pow(2*f-1,2));
      };
      BR.cable=cable;
      g.strokeStyle='rgba(30,26,58,.9)';g.lineWidth=1;
      g.beginPath();for(let x=BR.x0;x<=BR.x1;x+=2){x===BR.x0?g.moveTo(x,cable(x)):g.lineTo(x,cable(x));}g.stroke();
      // ハンガー
      g.strokeStyle='rgba(40,34,70,.55)';
      for(let x=BR.x0+6;x<BR.x1;x+=6){g.beginPath();g.moveTo(x,cable(x));g.lineTo(x,BR.deck);g.stroke();}
      // 桁
      g.fillStyle='#120f26';g.fillRect(BR.x0,BR.deck,BR.x1-BR.x0,2.5);
      // 塔
      [BR.t1,BR.t2].forEach(tx=>{
        g.fillStyle='#16122c';g.fillRect(tx-2.2,BR.top-2,1.6,HZ-BR.top+2);g.fillRect(tx+.8,BR.top-2,1.6,HZ-BR.top+2);
        g.fillRect(tx-2.2,BR.top+ (BR.deck-BR.top)*.35,4.6,1.2);
      });
      // 橋の灯り（ケーブルの点々・桁の灯り）
      BR.lights=[];
      for(let x=BR.x0+3;x<BR.x1;x+=W*.018){BR.lights.push({x,y:cable(x),c:'255,246,226',a:.75});}
      for(let x=BR.x0+2;x<BR.x1;x+=W*.012){BR.lights.push({x,y:BR.deck+1,c:'255,196,110',a:.85,refl:true});}
      BR.lights.forEach(l=>{g.fillStyle=`rgba(${l.c},${l.a})`;g.fillRect(l.x-.6,l.y-.6,1.3,1.3);});
      // 水平線のもや
      const mz=g.createLinearGradient(0,HZ-H*.05,0,HZ+4);
      mz.addColorStop(0,'rgba(60,50,110,0)');mz.addColorStop(1,`rgba(70,60,120,${WEATHER==='mist'?.38:WEATHER==='rain'?.25:.16})`);
      g.fillStyle=mz;g.fillRect(0,HZ-H*.05,W,H*.05+4);

      // 海
      [lyWater,g]=mkCanvas(W,H-HZ);
      const wg=g.createLinearGradient(0,0,0,H-HZ);
      wg.addColorStop(0,WEATHER==='mist'?'#1d1838':'#15112e');wg.addColorStop(.15,'#0d0a22');wg.addColorStop(.6,'#070616');wg.addColorStop(1,'#04030c');
      g.fillStyle=wg;g.fillRect(0,0,W,H-HZ);
      // 防波堤（左に赤灯台、右に白灯台）
      const bwL=H*.035,bwR=H*.06;
      RL.x=W*.24;RL.y=HZ+bwL;LH.x=W*.7;LH.y=HZ+bwR;
      g.fillStyle='#09071a';g.fillRect(0,bwL-2,W*.25,3);
      g.fillStyle='rgba(120,100,180,.12)';g.fillRect(0,bwL-2,W*.25,1);
      g.fillStyle='#0b0920';g.fillRect(W*.66,bwR-3,W*.34+2,4);
      g.fillStyle='rgba(120,100,180,.15)';g.fillRect(W*.66,bwR-3,W*.34+2,1);
      // 赤灯台
      const rh=H*.032;RL.top=HZ+bwL-rh;
      g.fillStyle='#5a1a26';g.beginPath();g.moveTo(RL.x-3,bwL-1);g.lineTo(RL.x+3,bwL-1);g.lineTo(RL.x+2,bwL-rh);g.lineTo(RL.x-2,bwL-rh);g.fill();
      g.fillStyle='#2a0e16';g.fillRect(RL.x-2.5,bwL-rh-3,5,3);
      // 白灯台
      const lh=H*.075;LH.top=HZ+bwR-lh;
      const tg=g.createLinearGradient(LH.x-5,0,LH.x+5,0);tg.addColorStop(0,'#8c88a8');tg.addColorStop(.45,'#d8d4ec');tg.addColorStop(1,'#5a5674');
      g.fillStyle=tg;g.beginPath();g.moveTo(LH.x-5,bwR-2);g.lineTo(LH.x+5,bwR-2);g.lineTo(LH.x+3.2,bwR-lh);g.lineTo(LH.x-3.2,bwR-lh);g.fill();
      g.fillStyle='#3a3654';g.fillRect(LH.x-4.5,bwR-lh-1,9,2);
      g.fillStyle='#1c1a30';g.fillRect(LH.x-3,bwR-lh-7,6,6);
      g.fillStyle='#2a2640';g.beginPath();g.moveTo(LH.x-3.8,bwR-lh-7);g.lineTo(LH.x+3.8,bwR-lh-7);g.lineTo(LH.x,bwR-lh-11);g.fill();
      LH.lamp=LH.top-4;
      // 遠くの波のすじ
      for(let i=0;i<70;i++){
        const y=Math.pow(R(),1.8)*(PY-HZ)*.9+6,d=depthAt(HZ+y);
        g.fillStyle=`rgba(120,110,190,${.03+d*.05})`;g.fillRect(rr(-20,W),y,rr(10,50)*(.3+d),1);
      }

      // 岸壁（手前）
      [lyPier,g]=mkCanvas(W,H-PY+2);
      const ph=H-PY;
      const pg=g.createLinearGradient(0,0,0,ph);pg.addColorStop(0,'#1d1834');pg.addColorStop(.12,'#151129');pg.addColorStop(1,'#0a0816');
      g.fillStyle=pg;g.fillRect(0,0,W,ph+2);
      g.fillStyle='rgba(190,170,240,.28)';g.fillRect(0,0,W,1);
      g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,2,W,2);
      // コンクリートの目地と染み
      for(let x=rr(20,60);x<W;x+=rr(70,120)){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(x,4,1,ph);}
      for(let i=0;i<40;i++){g.fillStyle=`rgba(${R()<.5?'0,0,0':'120,110,170'},${rr(.03,.08)})`;g.fillRect(rr(0,W),rr(5,ph),rr(2,14),rr(1,3));}
      // 係船柱
      const bx=W*.07,by=ph*.38;
      g.fillStyle='#0c0a18';g.beginPath();g.ellipse(bx,by+10,14,5,0,0,7);g.fill();
      g.fillStyle='#1e1a30';g.fillRect(bx-9,by-6,18,16);
      g.fillStyle='#29243f';g.beginPath();g.ellipse(bx,by-6,12,4.5,0,0,7);g.fill();
      g.fillStyle='rgba(200,180,255,.15)';g.fillRect(bx-8,by-5,3,14);
      // ロープ
      g.strokeStyle='rgba(150,130,100,.5)';g.lineWidth=1.5;g.beginPath();g.moveTo(bx+8,by);g.quadraticCurveTo(bx+30,by+16,bx+20,-1);g.stroke();
      // ランタンの灯り（暖色の溜まり）
      const lx=W*.3,ly=ph*.42;
      const lgr=g.createRadialGradient(lx,ly,0,lx,ly,W*.22);lgr.addColorStop(0,'rgba(255,190,110,.22)');lgr.addColorStop(1,'rgba(255,190,110,0)');
      g.fillStyle=lgr;g.fillRect(0,0,W,ph);
      // バケツ
      const kx=W*.17,ky=ph*.36;
      g.fillStyle='rgba(0,0,0,.4)';g.beginPath();g.ellipse(kx,ky+20,17,5,0,0,7);g.fill();
      const bk=g.createLinearGradient(kx-15,0,kx+15,0);bk.addColorStop(0,'#1a4a5e');bk.addColorStop(.6,'#2c7088');bk.addColorStop(1,'#163a4a');
      g.fillStyle=bk;g.beginPath();g.moveTo(kx-15,ky);g.lineTo(kx+15,ky);g.lineTo(kx+12,ky+20);g.lineTo(kx-12,ky+20);g.fill();
      g.fillStyle='#0d2430';g.beginPath();g.ellipse(kx,ky,15,4.5,0,0,7);g.fill();
      g.fillStyle='rgba(120,200,230,.35)';g.beginPath();g.ellipse(kx,ky+.8,12,3.2,0,0,7);g.fill();
      g.strokeStyle='rgba(180,200,210,.5)';g.lineWidth=1;g.beginPath();g.ellipse(kx,ky-2,14,10,0,Math.PI,0);g.stroke();
      // 缶コーヒー
      const cxp=W*.235,cyp=ph*.5;
      g.fillStyle='#6a3b22';g.fillRect(cxp-3.5,cyp-10,7,11);g.fillStyle='#d8b070';g.fillRect(cxp-3.5,cyp-6,7,2.5);
      g.fillStyle='#a8a0b8';g.beginPath();g.ellipse(cxp,cyp-10,3.5,1.3,0,0,7);g.fill();
      // ランタン本体
      g.fillStyle='#2a2238';g.fillRect(lx-5,ly-4,10,12);
      g.fillStyle='#ffd9a0';g.fillRect(lx-3.5,ly-2,7,8);
      g.fillStyle='#2a2238';g.fillRect(lx-6,ly-6,12,2.5);g.fillRect(lx-6,ly+7,12,2);
      g.strokeStyle='#4a405e';g.beginPath();g.arc(lx,ly-7,3,Math.PI,0);g.stroke();
      LH.lantern={x:lx,y:PY+ly};

      // 周辺減光
      [lyVig,g]=mkCanvas(W,H);
      const vg=g.createRadialGradient(W/2,H*.5,Math.min(W,H)*.38,W/2,H*.5,Math.max(W,H)*.78);
      vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(2,1,8,.6)');
      g.fillStyle=vg;g.fillRect(0,0,W,H);
    }
    function drawMoon(g,x,y,r,phase,bright){
      g.save();
      g.beginPath();g.arc(x,y,r,0,7);g.clip();
      const mg2=g.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);
      mg2.addColorStop(0,`rgba(255,250,232,${bright})`);mg2.addColorStop(1,`rgba(222,214,240,${bright*.92})`);
      g.fillStyle=mg2;g.fillRect(x-r,y-r,r*2,r*2);
      // 海（模様）
      g.fillStyle=`rgba(150,140,180,${.22*bright})`;
      [[-.3,-.2,.32],[.25,.1,.24],[-.05,.38,.2],[.35,-.35,.14]].forEach(([dx,dy,s])=>{g.beginPath();g.arc(x+dx*r,y+dy*r,s*r,0,7);g.fill();});
      // 欠け
      const off=(phase-.5)*2; // -0.4..0.5
      if(Math.abs(off)>.02){
        g.fillStyle='rgba(16,14,40,.88)';
        g.beginPath();g.arc(x+(off<0?-1:1)*r*(2-Math.abs(off)*2.4)*-1,y,r*1.05,0,7);g.fill();
      }
      g.restore();
    }
    function resize(){
      const w=Math.max(240,body.clientWidth),h=Math.max(320,body.clientHeight);
      const nd=Math.min(2.5,window.devicePixelRatio||1);
      if(w===W&&h===H&&nd===dpr)return;
      const ow=W,oh=H;
      W=w;H=h;dpr=nd;
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      if(!glow.cy){
        glow.cy=makeGlow('90,255,226',32);glow.bl=makeGlow('110,170,255',32);glow.wm=makeGlow('255,200,130',32);
        glow.rd=makeGlow('255,80,70',32);glow.wt=makeGlow('255,250,235',32);glow.mo=makeGlow('230,224,255',32);
      }
      buildLayers();
      if(ow&&oh){ // 位置を比率で追従
        const fx=W/ow,fy=H/oh;
        fl.x*=fx;fl.y*=fy;fl.tx*=fx;fl.ty*=fy;fl.sx*=fx;fl.sy*=fy;
      }
      plank.forEach(p=>{if(!ow){p.x=rnd(0,W);p.y=rnd(HZ+H*.05,PY-4);}else{p.x*=W/ow;p.y=clamp(p.y*H/oh,HZ+4,PY-4);}});
      drops.forEach(d=>{d.x=rnd(0,W);d.y=rnd(-H,H);});
    }

    // ── 状態 ──
    const plank=[];for(let i=0;i<46;i++)plank.push({x:0,y:0,ph:Math.random()*6.28,sp:rnd(.5,1.6),b:0,vx:rnd(-3,3)});
    const drops=[];if(WEATHER==='rain')for(let i=0;i<70;i++)drops.push({x:0,y:0,l:rnd(7,15),s:rnd(330,480)});
    const rings=[];for(let i=0;i<28;i++)rings.push({x:0,y:0,t:0,max:1,r:10,s:1,a:.5,c:'200,220,255'});
    let rgi=0;
    const parts=[];for(let i=0;i<90;i++)parts.push({x:0,y:0,vx:0,vy:0,life:0,max:1,c:'cy'});
    let pti=0;
    // ウキ
    const fl={x:0,y:0,tx:0,ty:0,sx:0,sy:0,z:0,sink:0,sinkT:0,vis:false,wob:0};
    let state='intro',stT=0,clock=0,paused=false;
    let castsLeft=CASTS,power=0,powDir=1,holding=false;
    let waitT=0,nibbles=[],biteT=0,misses=0;
    let fish=null,dist=1,tension=0,over=0,surge=0,surgeCd=1;
    let msg='',msgT=0,msgCol='#bbaedd';
    let outroT=0,cardReadyAt=0,ignoreRelease=false;
    const catches=[];let newSpecies=0,rareCaught=false,escapes=0;
    let lhAng=Math.random()*6.28,lastHud='',lastTm='',rzT=0;

    function ring(x,y,r,a,c,max){const o=rings[rgi];rgi=(rgi+1)%rings.length;o.x=x;o.y=y;o.r=r;o.a=a;o.c=c||'200,220,255';o.t=o.max=max||1.6;o.s=scaleAt(y);}
    function splash(x,y,n,spd){
      const s=scaleAt(y);
      for(let i=0;i<n;i++){const p=parts[pti];pti=(pti+1)%parts.length;
        const a=-Math.PI/2+rnd(-1.1,1.1),v=spd*s*rnd(.4,1);
        p.x=x;p.y=y;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.max=p.life=rnd(.35,.7);p.c=Math.random()<.5?'cy':'wt';p.gy=y;}
      plank.forEach(p=>{if(Math.hypot(p.x-x,(p.y-y)*2)<90*s)p.b=1;});
    }
    function say(text,col,dur){msg=text;msgCol=col||'#bbaedd';msgT=dur||2.2;}
    function setState(s){state=s;stT=0;}

    // ── 入力 ──
    function press(){
      if(paused||mg._ended)return;
      holding=true;
      if(state==='ready'){setState('charge');power=0;powDir=1;}
      else if(state==='bite'){hook();}
      else if(state==='wait'){say('……まだ。ウキを見てて',  '#8e80b0',1.2);}
      else if(state==='card'){if(clock>=cardReadyAt)closeCard();}
    }
    function release(){
      if(!holding)return;
      holding=false;
      if(ignoreRelease){ignoreRelease=false;return;}
      if(paused||mg._ended)return;
      if(state==='charge')cast();
    }
    cv.addEventListener('pointerdown',e=>{e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(_){}press();});
    cv.addEventListener('pointerup',e=>{e.preventDefault();release();});
    cv.addEventListener('pointercancel',()=>release());
    cv.addEventListener('contextmenu',e=>e.preventDefault());
    mg.onKey(e=>{
      const k=e.key;
      if(k===' '||k==='Enter'){
        e.preventDefault();
        if(e.type==='keydown'){if(e.repeat)return;
          if(ov.classList.contains('on')&&state==='intro'){startPlay();return;}
          if(paused){closeZukan();return;}
          press();}
        else release();
      }else if(e.type==='keydown'&&(k==='z'||k==='Z')&&!e.repeat){paused?closeZukan():openZukan();}
    });

    // ── 進行 ──
    function cast(){
      castsLeft--;
      const p=power;
      const d=lerp(.8,.1,p);
      fl.sx=rodTip().x;fl.sy=rodTip().y;
      fl.ty=HZ+(PY-HZ)*d+rnd(-4,4);
      fl.tx=clamp(W*.5+rnd(-.16,.12)*W-(1-p)*W*.06,W*.12,W*.86);
      fl.vis=true;fl.sink=0;fl.castP=p;
      setState('fly');se('btn');
    }
    function landed(){
      fl.x=fl.tx;fl.y=fl.ty;
      splash(fl.x,fl.y,10,90);ring(fl.x,fl.y,4,.6,'200,230,255',1.8);ring(fl.x,fl.y,2,.4,'120,255,230',1.3);
      setState('wait');misses=0;scheduleBite(rnd(2.2,4.6)-fl.castP*.5);
    }
    function scheduleBite(t){
      waitT=t;nibbles=[];
      const n=(Math.random()*3)|0;
      for(let i=0;i<n;i++)nibbles.push(rnd(.8,Math.max(1,t-.6)));
      nibbles.sort((a,b)=>a-b);
    }
    function pickSpecies(){
      const far=fl.castP||0;
      let tot=0;
      const ws=SPECIES.map(s=>{
        let w=s.w;
        if(s.r>=2)w*=1+far*.6;
        if(WEATHER==='rain'&&(s.id==='anago'||s.id==='ika'))w*=1.7;
        if(WEATHER==='mist'&&(s.id==='heike'||s.id==='suzu'))w*=1.7;
        if(WEATHER==='clear'&&(s.id==='tachiuo'||s.id==='ika'))w*=1.4;
        if(!FD.seen[s.id]&&s.r===1)w*=1.3; // 最初のうちは新顔に出会いやすく
        tot+=w;return w;
      });
      let r=Math.random()*tot;
      for(let i=0;i<SPECIES.length;i++){r-=ws[i];if(r<=0)return SPECIES[i];}
      return SPECIES[0];
    }
    function hook(){
      const s=pickSpecies();
      const f=Math.pow(Math.random(),1.4)*(.75+(fl.castP||0)*.25);
      const size=+(s.min+(s.max-s.min)*clamp(f,0,1)).toFixed(1);
      const item=s.kind==='glass'||s.kind==='boot'||s.kind==='bell';
      fish={sp:s,size,sf:f,item,str:item?.2:clamp(.3+f*.4+(s.r-1)*.12,0,1)};
      dist=1;tension=.15;over=0;surge=0;surgeCd=rnd(.6,1.4);
      setState('reel');se('decide');
      splash(fl.x,fl.y,12,120);ring(fl.x,fl.y,3,.7,'120,255,230',1.4);
      say(item?'……ん？ 重いだけで、暴れへん':'かかった！ 長押しで巻く','#00e8c8',1.8);
    }
    function escape(text){
      escapes++;fish=null;
      say(text,'#9a8cc0',2.4);
      se('back');setState('after');fl.vis=false;
    }
    function caught(){
      const s=fish.sp;
      const rec=FD.seen[s.id];
      const isNew=!rec;
      if(isNew){FD.seen[s.id]={n:1,max:fish.size,day:gs.day||1};newSpecies++;}
      else{rec.n++;if(fish.size>rec.max)rec.max=fish.size;}
      FD.total++;
      if(s.r===3)rareCaught=true;
      catches.push({id:s.id,size:fish.size});
      splash(fl.x,fl.y,18,150);ring(fl.x,fl.y,4,.8,'120,255,230',1.6);
      se(s.r===3||isNew?'ach':'rank');
      fl.vis=false;
      showCard(s,fish.size,isNew,rec&&fish.size>=rec.max&&!isNew);
      fish=null;updZbtn();
    }
    function nextOrEnd(){
      if(castsLeft<=0){setState('outro');outroT=0;}
      else{setState('ready');}
    }

    // ── カード・図鑑・説明 ──
    function showCard(s,size,isNew,record){
      setState('card');cardReadyAt=clock+.55;
      const unit=s.unit||'全長';
      const fl2=isNew?s.flav[0]:s.flav[(Math.random()*s.flav.length)|0];
      ov.innerHTML=`<div class="fishing-panel fishing-card${s.r===3?' rare':''}">`+
        (isNew?'<span class="fishing-tag new">NEW 図鑑登録</span>':'')+(s.r===3?'<span class="fishing-tag rare">めずらしい</span>':'')+
        `<canvas width="10" height="10"></canvas><div class="fishing-nm">${s.name}</div>`+
        `<div class="fishing-sz">${unit} ${size.toFixed(1)}cm${record?'<em>自己ベスト</em>':''}</div>`+
        `<div class="fishing-fl">${fl2}</div><div class="fishing-tap">タップで続ける（のこり${castsLeft}投）</div></div>`;
      const c=ov.querySelector('canvas');
      drawCardCanvas(c,s,260,130,size,false);
      ov.classList.add('on');
      ov.onpointerdown=e=>{e.preventDefault();e.stopPropagation();if(clock>=cardReadyAt)closeCard();};
    }
    function closeCard(){
      ov.classList.remove('on');ov.onpointerdown=null;
      ignoreRelease=holding;
      nextOrEnd();
    }
    function drawCardCanvas(c,s,w,h,size,sil){
      const r=Math.min(2.5,window.devicePixelRatio||1);
      c.width=Math.round(w*r);c.height=Math.round(h*r);
      const g=c.getContext('2d');g.setTransform(r,0,0,r,0,0);
      if(!sil){
        const bg=g.createRadialGradient(w/2,h*.55,4,w/2,h*.55,w*.55);
        bg.addColorStop(0,s.r===3?'rgba(232,184,48,.16)':'rgba(0,232,200,.1)');bg.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=bg;g.fillRect(0,0,w,h);
        // 水面の光
        g.fillStyle='rgba(120,110,200,.12)';for(let i=0;i<5;i++)g.fillRect(w*.15+i*17,h*.86+(i%2)*3,30,1);
      }
      const L=creatureLen(s,w,size);
      g.save();g.translate(w/2,h*.5);
      drawCreature(g,s,L,clock,false);
      g.restore();
      if(sil){g.globalCompositeOperation='source-in';g.fillStyle='rgba(30,24,52,1)';g.fillRect(0,0,w,h);g.globalCompositeOperation='source-over';}
    }
    function creatureLen(s,w,size){
      const k=s.kind;
      if(k==='ribbon'||k==='eel')return w*.86;
      if(k==='crab'||k==='bell'||k==='glass')return w*.36;
      if(k==='boot')return w*.36;
      if(k==='squid')return w*.66;
      const f=size?clamp((size-s.min)/(s.max-s.min),0,1):.6;
      return w*(.56+f*.18);
    }
    function openIntro(){
      ov.innerHTML=`<div class="fishing-panel"><div class="fishing-h">壇ノ浦、夜の港</div>`+
        `<div class="fishing-sub">今夜：${WNAME}　${TIDE}　のこり${CASTS}投</div>`+
        `<div class="fishing-step"><b>1</b><div>長押しで力をためて、離して投げる<small>遠くへ投げると、めずらしいものが寄ってくる</small></div></div>`+
        `<div class="fishing-step"><b>2</b><div>ウキがスッと沈んだらタップ<small>ツンツンは様子見。ゆっくりでええ</small></div></div>`+
        `<div class="fishing-step"><b>3</b><div>長押しで巻く・離すとゆるむ<small>糸の張りが赤くなったら、少し離して</small></div></div>`+
        `<div class="fishing-tap">タップではじめる</div></div>`;
      ov.classList.add('on');
      ov.onpointerdown=e=>{e.preventDefault();e.stopPropagation();startPlay();};
    }
    function startPlay(){
      if(state!=='intro')return;
      ov.classList.remove('on');ov.onpointerdown=null;
      setState('ready');se('decide');
      say('長押しで、ためて……離して投げる','#deccf8',3);
    }
    let zkPrevOv=null;
    function openZukan(){
      if(paused||mg._ended)return;
      if(!['intro','ready','card','after','wait'].includes(state)){say('いまは手が離せない','#8e80b0',1.2);return;}
      paused=true;holding=false;
      zkPrevOv={html:ov.innerHTML,on:ov.classList.contains('on'),pd:ov.onpointerdown};
      const n=zCount();
      ov.innerHTML=`<div class="fishing-panel fishing-zk"><div class="fishing-h">魚図鑑</div>`+
        `<div class="fishing-sub">${n}/${SPECIES.length}種　通算${FD.total}匹　港に来た回数 ${FD.visits}</div>`+
        `<div class="fishing-zgrid">${SPECIES.map(s=>{const r=FD.seen[s.id];
          return `<div class="fishing-zc r${s.r}${r?' got':''}"><canvas data-id="${s.id}"></canvas><div class="n">${r?s.name:'？？？'}</div>`+
            `<div class="d">${r?`×${r.n}　最大${r.max.toFixed(1)}cm`:s.r===3?'夜の海の、めずらしいもの':'まだ出会っていない'}</div></div>`;}).join('')}</div>`+
        `<button class="fishing-zclose">とじる</button></div>`;
      ov.querySelectorAll('canvas').forEach(c=>{const s=SP[c.dataset.id];drawCardCanvas(c,s,160,80,FD.seen[s.id]?FD.seen[s.id].max:0,!FD.seen[s.id]);});
      ov.onpointerdown=e=>{e.stopPropagation();};
      ov.querySelector('.fishing-zclose').onclick=e=>{e.stopPropagation();closeZukan();};
      ov.classList.add('on');
    }
    function closeZukan(){
      if(!paused)return;
      paused=false;
      const p=zkPrevOv;zkPrevOv=null;
      if(p&&p.on){
        ov.innerHTML=p.html;ov.onpointerdown=p.pd;
        // カードの絵を描き直す
        const c=ov.querySelector('.fishing-card canvas');
        if(c&&catches.length){const last=catches[catches.length-1];drawCardCanvas(c,SP[last.id],260,130,last.size,false);}
      }else{ov.classList.remove('on');ov.onpointerdown=null;ov.innerHTML='';}
    }
    zbtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();paused?closeZukan():openZukan();});

    // ── 生き物の絵 ──
    function drawCreature(g,s,L,t,inWater){
      const k=s.kind||'fish';
      if(k==='fish')return drawFish(g,s,L,t);
      if(k==='ribbon')return drawRibbon(g,L,t);
      if(k==='eel')return drawEel(g,L,t);
      if(k==='squid')return drawSquid(g,L,t);
      if(k==='crab')return drawCrab(g,L);
      if(k==='bell')return drawBell(g,L);
      if(k==='glass')return drawGlass(g,L);
      if(k==='boot')return drawBoot(g,L);
    }
    function drawFish(g,s,L,t){
      const H=L*s.h,hh=H/2;
      const [c0,c1,c2]=s.col;
      const topY=x=>{const f=(x-L*.02)/(L*.5);return -hh*.96*(1-f*f*.85);};
      const botY=x=>{const f=(x+L*.02)/(L*.48);return hh*.9*(1-f*f*.8);};
      g.lineJoin='round';
      // 尾びれ
      g.fillStyle=c0;g.globalAlpha=.92;
      g.beginPath();
      if(s.tail==='fork'){g.moveTo(-L*.35,-hh*.14);g.quadraticCurveTo(-L*.43,-hh*.5,-L*.52,-hh*1.0);g.quadraticCurveTo(-L*.45,0,-L*.52,hh*1.0);g.quadraticCurveTo(-L*.43,hh*.5,-L*.35,hh*.14);}
      else if(s.tail==='trunc'){g.moveTo(-L*.35,-hh*.16);g.lineTo(-L*.5,-hh*.72);g.quadraticCurveTo(-L*.52,0,-L*.5,hh*.72);g.lineTo(-L*.35,hh*.16);}
      else{g.moveTo(-L*.35,-hh*.16);g.quadraticCurveTo(-L*.55,-hh*.8,-L*.53,0);g.quadraticCurveTo(-L*.55,hh*.8,-L*.35,hh*.16);}
      g.closePath();g.fill();
      // 尾のすじ
      g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=.6;
      for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(-L*.37,i*hh*.04);g.lineTo(-L*.5,i*hh*.25);g.stroke();}
      // 背びれ・しりびれ
      g.fillStyle=c0;
      const dorsal=(x0,x1,hgt,spiky)=>{
        g.beginPath();g.moveTo(x0,topY(x0)+2);
        const n=spiky?9:4;
        for(let i=0;i<=n;i++){const x=lerp(x0,x1,i/n);const hb=hgt*(spiky?(i%2?1:.55):Math.sin(i/n*Math.PI)*.9+.1);g.lineTo(x,topY(x)-hb);}
        g.lineTo(x1,topY(x1)+2);g.closePath();g.fill();
        g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=.6;
        for(let i=0;i<=n;i+=1){const x=lerp(x0,x1,i/n);g.beginPath();g.moveTo(x,topY(x));g.lineTo(x,topY(x)-hgt*.8);g.stroke();}
      };
      g.globalAlpha=.85;
      dorsal(L*.22,-L*.05,hh*.62,s.fin==='spiky');
      dorsal(-L*.05,-L*.3,hh*.42,false);
      g.beginPath();g.moveTo(-L*.06,botY(-L*.06)-2);g.lineTo(-L*.14,botY(-L*.14)+hh*.42);g.lineTo(-L*.3,botY(-L*.3)+hh*.3);g.lineTo(-L*.31,botY(-L*.31)-2);g.closePath();g.fill();
      g.beginPath();g.moveTo(L*.12,botY(L*.12)-2);g.lineTo(L*.06,botY(L*.06)+hh*.38);g.lineTo(L*.02,botY(L*.02)-1);g.closePath();g.fill();
      g.globalAlpha=1;
      // 体
      const body=()=>{g.beginPath();g.moveTo(L*.5,hh*.06);
        g.bezierCurveTo(L*.46,-hh*.7,L*.18,-hh*1.04,-L*.06,-hh*.9);
        g.bezierCurveTo(-L*.24,-hh*.72,-L*.33,-hh*.34,-L*.38,-hh*.16);
        g.lineTo(-L*.38,hh*.16);
        g.bezierCurveTo(-L*.32,hh*.4,-L*.18,hh*.84,0,hh*.88);
        g.bezierCurveTo(L*.22,hh*.92,L*.44,hh*.62,L*.5,hh*.06);g.closePath();};
      body();
      const bg=g.createLinearGradient(0,-hh,0,hh);
      bg.addColorStop(0,c0);bg.addColorStop(.45,c1);bg.addColorStop(.62,c2);bg.addColorStop(1,c2);
      g.fillStyle=bg;g.fill();
      g.save();body();g.clip();
      if(s.tint){g.fillStyle=s.tint;g.fillRect(-L*.4,-hh*.15,L*.9,hh*.22);}
      if(s.bars){g.fillStyle=s.bars;for(let i=0;i<5;i++){const x=L*.18-i*L*.12;g.beginPath();g.ellipse(x,-hh*.3,L*.035,hh*.6,.15,0,7);g.fill();}}
      if(s.mottle){g.fillStyle=s.mottle;const R=mkRng(7);for(let i=0;i<18;i++){g.beginPath();g.ellipse(lerp(-L*.38,L*.4,R()),lerp(-hh,hh*.4,R()),L*lerp(.02,.05,R()),hh*lerp(.08,.2,R()),R()*3,0,7);g.fill();}
        g.fillStyle='rgba(255,230,210,.25)';for(let i=0;i<10;i++){g.beginPath();g.arc(lerp(-L*.35,L*.35,R()),lerp(-hh*.6,hh*.5,R()),L*.008,0,7);g.fill();}}
      if(s.dots){g.fillStyle=s.dots;const R=mkRng(3);for(let i=0;i<26;i++){const x=lerp(-L*.36,L*.4,R()),y=lerp(-hh*.85,hh*.2,R());g.beginPath();g.arc(x,y,L*lerp(.007,.014,R()),0,7);g.fill();}}
      // つや
      const sh=g.createLinearGradient(0,-hh,0,0);sh.addColorStop(0,'rgba(255,255,255,0)');sh.addColorStop(.6,'rgba(255,255,255,.14)');sh.addColorStop(1,'rgba(255,255,255,0)');
      g.fillStyle=sh;g.fillRect(-L*.4,-hh,L*.9,hh);
      g.restore();
      // 側線・ゼイゴ
      g.strokeStyle='rgba(20,20,30,.35)';g.lineWidth=.8;
      g.beginPath();g.moveTo(L*.26,-hh*.32);g.quadraticCurveTo(L*.0,-hh*.38,-L*.36,-hh*.02);g.stroke();
      if(s.scute){g.strokeStyle='rgba(230,236,245,.55)';for(let i=0;i<14;i++){const f=i/13,x=lerp(L*.02,-L*.36,f),y=lerp(-hh*.33,-hh*.02,f);g.beginPath();g.moveTo(x-1.5,y-1.5);g.lineTo(x+1,y);g.lineTo(x-1.5,y+1.5);g.stroke();}}
      // えら・胸びれ
      g.strokeStyle='rgba(0,0,0,.3)';g.lineWidth=1;
      g.beginPath();g.arc(L*.4,-hh*.02,hh*.62,Math.PI*.62,Math.PI*1.32);g.stroke();
      g.fillStyle=c1;g.globalAlpha=.55;
      g.beginPath();g.moveTo(L*.21,hh*.1);g.quadraticCurveTo(L*.08,hh*.05+Math.sin(t*4)*hh*.06,L*.03,hh*.42);g.quadraticCurveTo(L*.13,hh*.4,L*.21,hh*.24);g.fill();
      g.globalAlpha=1;
      // 目
      const ex=L*.36,ey=-hh*.22,er=L*s.eye*.5;
      g.fillStyle='#e8dcae';g.beginPath();g.arc(ex,ey,er,0,7);g.fill();
      g.fillStyle='#0a0810';g.beginPath();g.arc(ex+er*.1,ey,er*.66,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.9)';g.beginPath();g.arc(ex-er*.18,ey-er*.25,er*.22,0,7);g.fill();
      // 口
      g.strokeStyle='rgba(0,0,0,.4)';g.beginPath();g.moveTo(L*.5,hh*.06);g.lineTo(L*.44,hh*.12);g.stroke();
      if(s.fin==='spiky'&&s.id==='kasago'){ // 頭のトゲ
        g.fillStyle=c0;for(let i=0;i<3;i++){const x=L*(.3-i*.05);g.beginPath();g.moveTo(x,topY(x)+1);g.lineTo(x+2,topY(x)-hh*.22);g.lineTo(x+4,topY(x)+1);g.fill();}
      }
    }
    function bandPath(g,L,thick,wave,t,headR){
      const N=36,pts=[];
      for(let i=0;i<=N;i++){const f=i/N,x=lerp(L*.5,-L*.5,f);const y=Math.sin(f*5.2-t*2)*wave*f;const w=thick*(f<.08?lerp(headR,1,f/.08):f>.6?lerp(1,.08,(f-.6)/.4):1);pts.push([x,y,w]);}
      g.beginPath();pts.forEach(([x,y,w],i)=>i?g.lineTo(x,y-w):g.moveTo(x,y-w));
      for(let i=N;i>=0;i--){const [x,y,w]=pts[i];g.lineTo(x,y+w);}g.closePath();
      return pts;
    }
    function drawRibbon(g,L,t){
      const th=L*.04;
      // 背びれ
      g.strokeStyle='rgba(200,215,240,.35)';g.lineWidth=th*.9;
      g.beginPath();for(let i=0;i<=30;i++){const f=.1+i/30*.8,x=lerp(L*.5,-L*.5,f),y=Math.sin(f*5.2-t*2)*L*.035*f-th*1.1;i?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();
      const pts=bandPath(g,L,th,L*.035,t,.6);
      const sg=g.createLinearGradient(0,-th,0,th);sg.addColorStop(0,'#aebcd2');sg.addColorStop(.4,'#ffffff');sg.addColorStop(.6,'#dfe8f4');sg.addColorStop(1,'#8e9cb4');
      g.fillStyle=sg;g.fill();
      g.strokeStyle='rgba(255,255,255,.7)';g.lineWidth=.8;g.stroke();
      // 光の粒
      g.fillStyle='rgba(255,255,255,.9)';for(let i=4;i<26;i+=3){const [x,y]=pts[i];g.fillRect(x,y-th*.3,1.5,1);}
      // 顔
      const [hx,hy]=pts[1];
      g.fillStyle='#f4f8ff';g.beginPath();g.moveTo(L*.5,0);g.lineTo(L*.46,-th*.9);g.lineTo(L*.44,th*.4);g.fill();
      g.fillStyle='#e8dcae';g.beginPath();g.arc(hx-L*.03,hy-th*.2,th*.55,0,7);g.fill();
      g.fillStyle='#0a0810';g.beginPath();g.arc(hx-L*.03,hy-th*.2,th*.36,0,7);g.fill();
    }
    function drawEel(g,L,t){
      const th=L*.045;
      g.fillStyle='rgba(110,86,60,.5)';bandPath(g,L,th*1.35,L*.06,t,.9);g.fill();
      const pts=bandPath(g,L,th,L*.06,t,.95);
      const eg=g.createLinearGradient(0,-th,0,th);eg.addColorStop(0,'#4a3624');eg.addColorStop(.5,'#7a5c3c');eg.addColorStop(1,'#e8dcc0');
      g.fillStyle=eg;g.fill();
      g.fillStyle='rgba(250,245,230,.85)';for(let i=3;i<30;i+=2){const [x,y]=pts[i];g.beginPath();g.arc(x,y-th*.05,th*.13,0,7);g.fill();}
      g.fillStyle='rgba(250,245,230,.6)';for(let i=3;i<14;i+=2){const [x,y]=pts[i];g.beginPath();g.arc(x,y-th*.55,th*.09,0,7);g.fill();}
      const [hx,hy]=pts[1];
      g.fillStyle='#2a1c10';g.beginPath();g.arc(hx,hy-th*.35,th*.24,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.8)';g.fillRect(hx-th*.08,hy-th*.48,1.2,1.2);
    }
    function drawSquid(g,L,t){
      // 光
      g.save();g.globalCompositeOperation='lighter';
      const rg=g.createRadialGradient(0,0,0,0,0,L*.6);rg.addColorStop(0,'rgba(80,170,255,.35)');rg.addColorStop(1,'rgba(80,170,255,0)');
      g.fillStyle=rg;g.fillRect(-L*.6,-L*.6,L*1.2,L*1.2);g.restore();
      // 腕
      g.strokeStyle='rgba(200,150,190,.85)';g.lineCap='round';
      for(let i=0;i<8;i++){const a=(i-3.5)*.07;g.lineWidth=L*.018;g.beginPath();g.moveTo(-L*.05,a*L*.3);
        g.quadraticCurveTo(-L*.25,a*L*1.2+Math.sin(t*3+i)*L*.02,-L*.42-(i%3)*L*.02,a*L*1.6+Math.sin(t*3+i)*L*.04);g.stroke();}
      g.lineWidth=L*.012;g.beginPath();g.moveTo(-L*.05,0);g.quadraticCurveTo(-L*.35,L*.05,-L*.52,L*.02);g.stroke();
      // 胴
      g.fillStyle='rgba(220,170,200,.92)';
      g.beginPath();g.moveTo(L*.48,0);g.quadraticCurveTo(L*.36,-L*.13,0,-L*.1);g.quadraticCurveTo(-L*.08,0,0,L*.1);g.quadraticCurveTo(L*.36,L*.13,L*.48,0);g.fill();
      // ひれ
      g.fillStyle='rgba(210,160,200,.75)';
      g.beginPath();g.moveTo(L*.48,0);g.lineTo(L*.32,-L*.17);g.lineTo(L*.24,-L*.07);g.closePath();g.fill();
      g.beginPath();g.moveTo(L*.48,0);g.lineTo(L*.32,L*.17);g.lineTo(L*.24,L*.07);g.closePath();g.fill();
      // 頭
      g.fillStyle='rgba(225,180,205,.95)';g.beginPath();g.ellipse(-L*.04,0,L*.07,L*.07,0,0,7);g.fill();
      g.fillStyle='#16101e';g.beginPath();g.arc(-L*.05,-L*.035,L*.024,0,7);g.fill();
      // 発光点
      g.save();g.globalCompositeOperation='lighter';
      const R=mkRng(5);
      for(let i=0;i<22;i++){const x=lerp(-L*.02,L*.44,R()),y=lerp(-L*.08,L*.08,R())*(1-(x/L));const a=.5+.5*Math.sin(t*3+i);
        g.fillStyle=`rgba(120,200,255,${.35+a*.55})`;g.beginPath();g.arc(x,y,L*.012,0,7);g.fill();}
      for(let i=0;i<8;i++){const a=(i-3.5)*.07;g.fillStyle='rgba(140,220,255,.9)';g.beginPath();g.arc(-L*.42-(i%3)*L*.02,a*L*1.6+Math.sin(t*3+i)*L*.04,L*.014,0,7);g.fill();}
      g.restore();
    }
    function drawCrab(g,L){
      const r=L*.5;
      g.strokeStyle='#6a3a30';g.lineCap='round';
      for(let sd=-1;sd<=1;sd+=2)for(let i=0;i<4;i++){
        const a=sd*(.25+i*.28),x0=Math.cos(a)*r*.7*sd*sd,y0=r*.1+i*r*.06;
        g.lineWidth=r*.09;g.beginPath();g.moveTo(sd*r*.6,y0);g.lineTo(sd*r*(1.05+i*.06),y0-r*.3+i*r*.22);g.lineTo(sd*r*(1.25+i*.05),y0+r*.35+i*r*.12);g.stroke();
      }
      // はさみ
      g.fillStyle='#7a4236';
      for(let sd=-1;sd<=1;sd+=2){g.beginPath();g.ellipse(sd*r*.78,-r*.62,r*.2,r*.14,sd*.6,0,7);g.fill();
        g.lineWidth=r*.08;g.beginPath();g.moveTo(sd*r*.5,-r*.3);g.lineTo(sd*r*.7,-r*.55);g.stroke();}
      // 甲羅
      const cg=g.createRadialGradient(-r*.2,-r*.3,r*.1,0,0,r*.8);cg.addColorStop(0,'#b8735a');cg.addColorStop(1,'#6e3a2c');
      g.fillStyle=cg;g.beginPath();g.moveTo(0,-r*.72);g.bezierCurveTo(r*.62,-r*.7,r*.74,r*.1,r*.4,r*.52);g.quadraticCurveTo(0,r*.7,-r*.4,r*.52);g.bezierCurveTo(-r*.74,r*.1,-r*.62,-r*.7,0,-r*.72);g.fill();
      // 顔のような溝（怒った顔）
      g.strokeStyle='rgba(40,14,10,.75)';g.lineWidth=r*.05;
      g.beginPath();g.moveTo(-r*.42,-r*.32);g.quadraticCurveTo(-r*.2,-r*.12,-r*.06,-r*.2);g.stroke();
      g.beginPath();g.moveTo(r*.42,-r*.32);g.quadraticCurveTo(r*.2,-r*.12,r*.06,-r*.2);g.stroke();
      g.beginPath();g.ellipse(-r*.22,-r*.04,r*.1,r*.07,0,0,7);g.stroke();
      g.beginPath();g.ellipse(r*.22,-r*.04,r*.1,r*.07,0,0,7);g.stroke();
      g.beginPath();g.moveTo(0,-r*.1);g.lineTo(0,r*.12);g.stroke();
      g.beginPath();g.moveTo(-r*.28,r*.32);g.quadraticCurveTo(0,r*.18,r*.28,r*.32);g.stroke();
      g.fillStyle='rgba(255,220,200,.15)';g.beginPath();g.ellipse(-r*.25,-r*.45,r*.18,r*.08,-.3,0,7);g.fill();
      g.fillStyle='#1a0c0a';g.fillRect(-r*.1,-r*.82,r*.06,r*.1);g.fillRect(r*.04,-r*.82,r*.06,r*.1);
    }
    function drawBell(g,L){
      const r=L*.42;
      // 紐
      g.strokeStyle='#b8323a';g.lineWidth=r*.12;g.lineCap='round';
      g.beginPath();g.moveTo(0,-r*1.05);g.quadraticCurveTo(r*.5,-r*1.6,r*1.1,-r*1.2);g.stroke();
      g.beginPath();g.moveTo(r*1.1,-r*1.2);g.lineTo(r*1.25,-r*.8);g.moveTo(r*1.1,-r*1.2);g.lineTo(r*1.4,-r*1.0);g.stroke();
      g.strokeStyle='#6a5a3a';g.lineWidth=r*.14;g.beginPath();g.arc(0,-r*1.0,r*.18,0,7);g.stroke();
      // 本体
      const bg=g.createRadialGradient(-r*.35,-r*.35,r*.1,0,0,r*1.05);bg.addColorStop(0,'#d8c27a');bg.addColorStop(.5,'#8a7a40');bg.addColorStop(1,'#3e3a22');
      g.fillStyle=bg;g.beginPath();g.arc(0,0,r*.92,0,7);g.fill();
      // 緑青
      g.fillStyle='rgba(80,170,140,.45)';const R=mkRng(9);
      for(let i=0;i<9;i++){g.beginPath();g.ellipse(lerp(-r*.6,r*.6,R()),lerp(-r*.5,r*.7,R()),r*lerp(.08,.2,R()),r*lerp(.05,.12,R()),R()*3,0,7);g.fill();}
      g.strokeStyle='rgba(40,34,18,.7)';g.lineWidth=r*.06;g.beginPath();g.arc(0,0,r*.92,Math.PI*.08,Math.PI*.92);g.stroke();
      g.beginPath();g.moveTo(-r*.92,r*.05);g.lineTo(r*.92,r*.05);g.stroke();
      g.fillStyle='#15120a';g.beginPath();g.ellipse(0,r*.48,r*.42,r*.08,0,0,7);g.fill();
      g.beginPath();g.arc(-r*.4,r*.48,r*.1,0,7);g.arc(r*.4,r*.48,r*.1,0,7);g.fill();
      g.fillStyle='rgba(255,250,220,.55)';g.beginPath();g.ellipse(-r*.38,-r*.42,r*.16,r*.08,-.6,0,7);g.fill();
    }
    function drawGlass(g,L){
      const r=L*.36;
      g.save();g.globalCompositeOperation='lighter';
      const rg=g.createRadialGradient(0,0,0,0,0,r*2);rg.addColorStop(0,'rgba(80,220,170,.25)');rg.addColorStop(1,'rgba(80,220,170,0)');g.fillStyle=rg;g.fillRect(-r*2,-r*2,r*4,r*4);g.restore();
      g.beginPath();const pts=[[1,-.1],[.7,-.7],[-.1,-.85],[-.8,-.5],[-.95,.2],[-.4,.75],[.5,.7]];
      pts.forEach(([x,y],i)=>{const n=pts[(i+1)%pts.length];const mx=(x+n[0])/2*r,my=(y+n[1])/2*r;if(!i)g.moveTo(mx,my);else g.quadraticCurveTo(x*r,y*r,mx,my);});
      const [x0,y0]=pts[0];const n0=pts[1];g.quadraticCurveTo(x0*r,y0*r,(x0+n0[0])/2*r,(y0+n0[1])/2*r);g.closePath();
      const gg=g.createLinearGradient(-r,-r,r,r);gg.addColorStop(0,'rgba(170,255,210,.85)');gg.addColorStop(.5,'rgba(60,170,130,.75)');gg.addColorStop(1,'rgba(20,90,80,.85)');
      g.fillStyle=gg;g.fill();g.strokeStyle='rgba(220,255,240,.5)';g.lineWidth=1;g.stroke();
      g.fillStyle='rgba(255,255,255,.55)';g.beginPath();g.ellipse(-r*.35,-r*.35,r*.25,r*.1,-.6,0,7);g.fill();
      g.fillStyle='rgba(255,255,255,.18)';const R=mkRng(4);for(let i=0;i<14;i++)g.fillRect(lerp(-r*.6,r*.6,R()),lerp(-r*.5,r*.5,R()),1,1);
    }
    function drawBoot(g,L){
      const r=L*.5;
      const bg=g.createLinearGradient(-r,0,r,0);bg.addColorStop(0,'#1e3a2a');bg.addColorStop(.5,'#2e5a40');bg.addColorStop(1,'#16281e');
      g.fillStyle=bg;
      g.beginPath();g.moveTo(-r*.45,-r*1.0);g.lineTo(r*.2,-r*1.0);g.lineTo(r*.25,r*.25);g.quadraticCurveTo(r*.95,r*.3,r*1.0,r*.65);g.lineTo(r*1.0,r*.85);g.lineTo(-r*.5,r*.85);g.closePath();g.fill();
      g.fillStyle='#0e1a14';g.fillRect(-r*.52,r*.78,r*1.54,r*.14);
      g.fillStyle='#16281e';g.beginPath();g.ellipse(-r*.12,-r*1.0,r*.34,r*.08,0,0,7);g.fill();
      g.fillStyle='rgba(200,255,220,.12)';g.fillRect(-r*.35,-r*.9,r*.1,r*1.5);
      g.fillStyle='rgba(120,180,90,.55)';g.beginPath();g.ellipse(r*.4,r*.5,r*.18,r*.06,.3,0,7);g.fill();
      // しずく
      g.fillStyle='rgba(160,220,255,.7)';[[r*.7,r*1.05],[-r*.2,r*1.1]].forEach(([x,y])=>{g.beginPath();g.arc(x,y,r*.05,0,7);g.fill();});
    }

    // ── 竿 ──
    function rodBase(){return {x:W*.97,y:H*1.02};}
    function rodTip(){
      const b=rodBase();
      const L=Math.hypot(W*.35,H*.46);
      let a=Math.atan2(-H*.46,-W*.35);
      if(state==='charge')a+=power*.55;
      if(state==='fly')a-=Math.sin(Math.min(1,stT/.25)*Math.PI)*.18;
      if(state==='reel')a-=.08+tension*.16+(surge>0?Math.sin(clock*22)*.02:0);
      if(state==='bite')a-=.04;
      a+=Math.sin(clock*.9)*.008;
      return {x:b.x+Math.cos(a)*L,y:b.y+Math.sin(a)*L,a};
    }

    // ── 更新 ──
    function update(dt){
      clock+=dt;
      rzT+=dt;if(rzT>.5){rzT=0;resize();}
      if(msgT>0)msgT-=dt;
      // 環境
      lhAng+=dt*.85;
      plank.forEach(p=>{p.ph+=dt*p.sp;p.x+=p.vx*dt;if(p.x<-4)p.x=W+4;if(p.x>W+4)p.x=-4;p.b=Math.max(0,p.b-dt*.5);});
      drops.forEach(d=>{d.y+=d.s*dt;d.x-=d.s*dt*.12;if(d.y>H){d.y=rnd(-40,-10);d.x=rnd(0,W*1.1);
        if(Math.random()<.5){const y=rnd(HZ+6,PY-4);ring(rnd(0,W),y,1,.35,'170,180,230',.9);}}});
      if(WEATHER==='rain'&&Math.random()<dt*14){const y=rnd(HZ+6,PY-4);ring(rnd(0,W),y,1,.3,'170,180,230',.8);}
      rings.forEach(r=>{if(r.t>0)r.t-=dt;});
      parts.forEach(p=>{if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;}});
      if(paused)return;
      stT+=dt;
      // ウキ
      fl.sink+=((state==='bite'?1:0)+fl.sinkT-fl.sink)*Math.min(1,dt*(state==='bite'?9:6));
      fl.sinkT=Math.max(0,fl.sinkT-dt*2.2);
      if(fl.vis&&(state==='wait'||state==='bite')&&Math.random()<dt*.6)ring(fl.x,fl.y,2,.28,'200,220,255',1.8);

      if(state==='charge'){
        power+=powDir*dt*.95;
        if(power>=1){power=1;powDir=-1;}if(power<=0){power=0;powDir=1;}
      }else if(state==='fly'){
        const f=Math.min(1,stT/.95);
        const e=1-Math.pow(1-f,2);
        fl.x=lerp(fl.sx,fl.tx,e);fl.y=lerp(fl.sy,fl.ty,e)-Math.sin(f*Math.PI)*H*.18*(.5+fl.castP*.6);
        fl.z=Math.sin(f*Math.PI);
        if(f>=1){fl.z=0;landed();}
      }else if(state==='wait'){
        if(nibbles.length&&stT>=nibbles[0]){nibbles.shift();fl.sinkT=.45;ring(fl.x,fl.y,2,.5,'200,230,255',1.2);}
        if(stT>=waitT){setState('bite');biteT=0;se('notif');splash(fl.x,fl.y,6,60);ring(fl.x,fl.y,3,.7,'120,255,230',1.5);say('今！ タップ！','#44ee88',1.3);}
      }else if(state==='bite'){
        if(stT>1.3){
          misses++;
          if(misses>=2){escape('……エサだけ取られた。まあ、ええか。');}
          else{setState('wait');scheduleBite(rnd(1.6,3.2));say('……離れた。また来るかも','#8e80b0',1.8);}
        }
      }else if(state==='reel'){
        surgeCd-=dt;
        if(surge>0){surge-=dt;if(Math.random()<dt*10)splash(fl.x,fl.y,2,70);}
        else if(surgeCd<=0&&!fish.item){surge=rnd(.6,1.1)*(.7+fish.str*.5);surgeCd=rnd(1.2,2.4);splash(fl.x,fl.y,8,110);ring(fl.x,fl.y,3,.6,'200,230,255',1);}
        if(holding){
          tension+=(.32+fish.str*.42+(surge>0?.85*fish.str+.25:0))*dt;
          if(tension>=1){tension=1;over+=dt;}
          else{over=Math.max(0,over-dt*.5);dist-=(fish.item?.26:.24-fish.str*.06)*dt*(surge>0?.45:1);}
        }else{
          tension=Math.max(0,tension-.95*dt);over=Math.max(0,over-dt);
          dist=Math.min(1,dist+(surge>0?.1:.025)*fish.str*dt);
        }
        if(over>=1.5){escape('……ふっと軽くなった。逃げられた。');}
        else if(dist<=0){caught();}
        else{
          const near={x:W*.55,y:PY-6};
          const sway=surge>0?Math.sin(clock*9)*14*scaleAt(fl.y):Math.sin(clock*2.2)*4*scaleAt(fl.y);
          fl.x=lerp(near.x,fl.tx,dist)+sway;fl.y=lerp(near.y,fl.ty,dist);
          if(Math.random()<dt*3)ring(fl.x,fl.y,2,.35,'200,230,255',.9);
        }
      }else if(state==='after'){
        if(stT>1.6)nextOrEnd();
      }else if(state==='outro'){
        outroT+=dt;
        if(outroT>3.4&&!mg._ended){mg.end('done');return;}
      }
      hud();
    }
    function hud(){
      const html=`釣果 <span style="color:var(--tx-b)">${catches.length}</span>　図鑑 <span style="color:var(--cy)">${zCount()}</span>/${SPECIES.length}`+(rareCaught?'　<span style="color:var(--gd)">★</span>':'');
      if(html!==lastHud){lastHud=html;mg.setScore(html);}
      const tm=`のこり ${castsLeft}投`;
      if(tm!==lastTm){lastTm=tm;mg.setTimer(tm);}
    }

    // ── 描画 ──
    function draw(){
      const t=clock;
      cx.setTransform(dpr,0,0,dpr,0,0);
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
      cx.drawImage(lyBg,0,0,W,HZ+4);
      // またたく星
      for(const s of stars){const a=.3+.7*Math.max(0,Math.sin(t*s.sp+s.ph));cx.fillStyle=`rgba(240,236,255,${a*.8})`;cx.fillRect(s.x-.5,s.y-.5,1.6,1.6);}
      cx.drawImage(lyWater,0,HZ,W,H-HZ);
      drawRefl(t);
      drawLights(t);
      drawRings();
      drawPlankton(t);
      drawFloat(t);
      drawParts();
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
      cx.drawImage(lyPier,0,PY,W,H-PY+2);
      // ランタンの揺らぎ
      cx.globalCompositeOperation='lighter';
      gl(glow.wm,LH.lantern.x,LH.lantern.y,26+Math.sin(t*7)*1.5,.55+Math.sin(t*11)*.05);
      cx.globalCompositeOperation='source-over';
      drawRod(t);
      drawRain();
      cx.globalAlpha=1;
      cx.drawImage(lyVig,0,0,W,H);
      drawUI(t);
    }
    function drawRefl(t){
      const m=BR.moon;
      cx.globalCompositeOperation='lighter';
      // 月の光の道（波で崩れる）
      const mAmp=WEATHER==='rain'?.55:WEATHER==='mist'?.7:1;
      const lit=moonPhase<.5?.6+moonPhase*.8:1;
      for(let y=HZ+1;y<PY;){
        const d=depthAt(y);
        const step=1.2+d*5.5;
        const n=Math.sin(y*.31+t*1.7)*.5+Math.sin(y*.13-t*1.1)*.5;
        const w=(m.r*.5+d*W*.13)*(.35+.65*Math.abs(n));
        const ox=Math.sin(y*.07+t*.9)*(2+d*14)+Math.sin(y*.21-t*1.6)*d*6;
        const a=(.07+.3*(1-d)*(.5+.5*n))*mAmp*lit;
        if(a>.01){cx.fillStyle=`rgba(232,226,255,${a})`;cx.fillRect(m.x+ox-w/2,y,w,Math.max(1,step*.45));}
        // きらめき
        if(((y*13)|0)%7===0){const sp=Math.sin(t*3+y);if(sp>.7){cx.fillStyle=`rgba(255,255,255,${(sp-.7)*1.6*mAmp})`;cx.fillRect(m.x+ox+w*(Math.sin(y)*.4),y,2+d*3,1);}}
        y+=step;
      }
      // 橋の灯りの映り込み
      for(const l of BR.lights){
        if(!l.refl)continue;
        for(let i=0;i<5;i++){
          const y=HZ+2+i*i*2.4+i*2;const ox=Math.sin(t*2.1+l.x*.3+i*1.3)*(1+i*.6);
          cx.fillStyle=`rgba(${l.c},${.26-i*.045})`;cx.fillRect(l.x+ox-.8,y,1.6+i*.3,1.5+i*.6);
        }
      }
      for(const l of townRefl){
        for(let i=0;i<4;i++){const y=HZ+2+i*l.len*.35;const ox=Math.sin(t*1.8+l.ph+i*1.7)*(1+i*.5);
          cx.fillStyle=`rgba(${l.c},${l.a*(1-i*.24)})`;cx.fillRect(l.x+ox,y,1.2+i*.2,1.4+i*.4);}
      }
      // 灯台の灯りの映り込み
      cx.globalCompositeOperation='source-over';
    }
    function drawLights(t){
      cx.globalCompositeOperation='lighter';
      // 橋の塔の赤い航空障害灯
      const blink=(Math.sin(t*2.6)+1)/2;
      [BR.t1,BR.t2].forEach(x=>{gl(glow.rd,x,BR.top-2,7,.5+blink*.5);});
      // 赤灯台（4秒ごとに明滅）
      const rb=(t%4)<.9?1:.12;
      gl(glow.rd,RL.x,RL.top-1,rb>.5?14:6,rb);
      if(rb>.5){cx.fillStyle='rgba(255,80,70,.3)';for(let i=0;i<4;i++)cx.fillRect(RL.x-1+Math.sin(t*2+i)*1.5,RL.y+2+i*4,2,2);}
      // 白灯台：回転する光の帯
      const s=Math.sin(lhAng),c=Math.cos(lhAng);
      const Lb=W*1.1;
      const ex=LH.x+s*Lb,ey=LH.lamp-c*H*.012;
      const facing=Math.max(0,c);
      const beamA=(.12+.1*(1-Math.abs(s)))*(WEATHER==='mist'?1.6:WEATHER==='rain'?1.25:1);
      if(Math.abs(s)>.04){
        const bg=cx.createLinearGradient(LH.x,LH.lamp,ex,ey);
        bg.addColorStop(0,`rgba(255,248,220,${beamA*1.6})`);bg.addColorStop(.35,`rgba(255,248,220,${beamA*.6})`);bg.addColorStop(1,'rgba(255,248,220,0)');
        cx.fillStyle=bg;cx.globalAlpha=1;
        const sp=H*.012+Math.abs(s)*H*.03;
        cx.beginPath();cx.moveTo(LH.x,LH.lamp-1);cx.lineTo(ex,ey-sp);cx.lineTo(ex,ey+sp*.7);cx.lineTo(LH.x,LH.lamp+1);cx.closePath();cx.fill();
      }
      gl(glow.wt,LH.x,LH.lamp,8+facing*facing*facing*38,.55+facing*.45);
      // 水面への映り込み
      const ra=.18+Math.pow(facing,3)*.5;
      for(let i=0;i<8;i++){const y=LH.y+2+i*i*1.6+i*2;const ox=Math.sin(t*2+i*1.4)*(1+i*.7);
        cx.globalAlpha=ra*(1-i/8);cx.fillStyle='rgba(255,248,220,1)';cx.fillRect(LH.x+ox-1.5-i*.4,y,3+i*.8,1.5+i*.4);}
      // 月の映り込み近く
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
    }
    function drawRings(){
      cx.lineWidth=1;
      for(const r of rings){
        if(r.t<=0)continue;
        const f=1-r.t/r.max;
        const rad=(r.r+f*28)*r.s;
        cx.strokeStyle=`rgba(${r.c},${r.a*(1-f)})`;
        cx.beginPath();cx.ellipse(r.x,r.y,rad,rad*.28,0,0,7);cx.stroke();
      }
    }
    function drawPlankton(t){
      cx.globalCompositeOperation='lighter';
      for(const p of plank){
        const s=scaleAt(p.y);
        const a=(.12+.22*Math.max(0,Math.sin(p.ph)))*(.5+s*.5)+p.b*.8;
        gl(glow.cy,p.x,p.y,(4+p.b*6)*s+2,a);
      }
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
    }
    function drawFloat(t){
      if(!fl.vis)return;
      const s=scaleAt(state==='fly'?lerp(fl.sy,fl.ty,Math.min(1,stT/.95)):fl.y);
      const bob=state==='fly'?0:Math.sin(t*1.6)*1.2*s;
      const x=fl.x,y=fl.y+bob;
      const sink=fl.sink;
      const hgt=26*s*(1-sink*.9);
      // 水中の影（魚）
      if(state==='reel'&&fish){
        const ws=s*(16+fish.sf*10);
        cx.fillStyle='rgba(2,2,8,.45)';cx.save();cx.translate(x+Math.sin(t*6)*3*s,y+7*s);cx.rotate(Math.sin(t*(surge>0?14:4))*.25);
        cx.beginPath();cx.ellipse(0,0,ws,ws*.28,0,0,7);cx.fill();cx.restore();
      }
      if(state!=='fly'){ // 水面の反射と光
        cx.globalCompositeOperation='lighter';
        gl(glow.rd,x,y+2*s,14*s,.35*(1-sink*.6));
        cx.fillStyle=`rgba(255,110,90,${.25*(1-sink*.5)})`;
        for(let i=0;i<3;i++)cx.fillRect(x-2*s+Math.sin(t*2+i)*s,y+3*s+i*3*s,4*s,1.2*s);
        cx.globalCompositeOperation='source-over';
        cx.fillStyle='rgba(180,200,255,.35)';cx.beginPath();cx.ellipse(x,y,5*s,1.5*s,0,0,7);cx.fill();
      }
      // 本体（電気ウキ）
      const top=y-hgt;
      if(hgt>1){
        cx.fillStyle='#e8e0f0';cx.fillRect(x-1.6*s,top+4*s,3.2*s,Math.max(0,hgt-6*s));
        cx.fillStyle='#ff6a3a';cx.fillRect(x-1.6*s,top+4*s,3.2*s,Math.min(hgt*.35,7*s));
        if(state==='fly'){cx.fillStyle='#d8d0e8';cx.beginPath();cx.ellipse(x,top+hgt+4*s,3.5*s,7*s,0,0,7);cx.fill();}
      }
      // 灯り
      cx.globalCompositeOperation='lighter';
      const tipY=state==='fly'?top+2*s:Math.min(top+2*s,y+1);
      const under=state==='bite'&&sink>.6;
      gl(under?glow.cy:glow.rd,x,tipY,(under?18:14)*s+3,under?.5:.95);
      cx.globalAlpha=1;cx.fillStyle=under?'rgba(180,255,240,.7)':'#fff1e6';cx.fillRect(x-1.2*s,tipY-2*s,2.4*s,3*s);
      cx.globalCompositeOperation='source-over';
      if(state==='bite'){
        const a=.6+.4*Math.sin(t*16);
        cx.fillStyle=`rgba(68,238,136,${a})`;cx.font=`${Math.round(18*s+6)}px ${FONT}`;cx.textAlign='center';cx.textBaseline='bottom';
        cx.fillText('！',x,top-6*s);
      }
    }
    function drawParts(){
      cx.globalCompositeOperation='lighter';
      for(const p of parts){if(p.life<=0)continue;const s=scaleAt(p.gy||p.y);gl(p.c==='cy'?glow.cy:glow.wt,p.x,p.y,5*s+1.5,p.life/p.max*.8);}
      cx.globalAlpha=1;cx.globalCompositeOperation='source-over';
    }
    function drawRod(t){
      const b=rodBase(),tp=rodTip();
      // 糸
      if(fl.vis){
        const s=scaleAt(fl.y);
        const fx=fl.x,fy=state==='fly'?fl.y-26*s:fl.y-26*s*(1-fl.sink*.9)+Math.sin(t*1.6)*1.2*s;
        const slack=state==='reel'?(1-tension)*30:state==='fly'?10:40;
        cx.strokeStyle='rgba(220,220,240,.32)';cx.lineWidth=.8;
        cx.beginPath();cx.moveTo(tp.x,tp.y);cx.quadraticCurveTo((tp.x+fx)/2,Math.max(tp.y,fy)+slack,fx,fy);cx.stroke();
        if(state==='reel'&&tension>.82){cx.strokeStyle=`rgba(232,48,85,${(tension-.82)*2.5})`;cx.stroke();}
      }else if(state==='ready'||state==='charge'||state==='intro'){
        // 竿先から垂れた仕掛け
        const sw=Math.sin(t*1.3)*4;
        cx.strokeStyle='rgba(220,220,240,.3)';cx.lineWidth=.8;cx.beginPath();cx.moveTo(tp.x,tp.y);cx.lineTo(tp.x+sw,tp.y+H*.07);cx.stroke();
        cx.fillStyle='#e8e0f0';cx.fillRect(tp.x+sw-1.5,tp.y+H*.07,3,14);
        cx.fillStyle='#ff6a3a';cx.fillRect(tp.x+sw-1.5,tp.y+H*.07,3,4);
        cx.globalCompositeOperation='lighter';gl(glow.rd,tp.x+sw,tp.y+H*.07,10,.8);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      }
      // 竿（しなり）
      const bend=state==='reel'?(.12+tension*.25):state==='charge'?power*.1:.05;
      const mx=(b.x+tp.x)/2,my=(b.y+tp.y)/2;
      const nx=-(tp.y-b.y),ny=(tp.x-b.x),nl=Math.hypot(nx,ny);
      const cxp=mx+nx/nl*bend*nl*.5*(-1),cyp=my+ny/nl*bend*nl*.5*(-1);
      const seg=(w,col,f0,f1)=>{cx.strokeStyle=col;cx.lineWidth=w;cx.lineCap='round';cx.beginPath();
        const P=f=>{const u=1-f;return [u*u*b.x+2*u*f*cxp+f*f*tp.x,u*u*b.y+2*u*f*cyp+f*f*tp.y];};
        for(let i=0;i<=12;i++){const [x,y]=P(lerp(f0,f1,i/12));i?cx.lineTo(x,y):cx.moveTo(x,y);}cx.stroke();};
      seg(6,'#120e1c',0,.22);seg(4,'#221a30',.2,.55);seg(2.4,'#2c2240',.53,.85);seg(1.4,'#3a2e52',.84,1);
      seg(1,'rgba(200,180,255,.25)',.05,.95);
      // ガイド
      cx.fillStyle='rgba(200,190,230,.5)';
      for(const f of [.4,.6,.75,.88]){const u=1-f;cx.fillRect(u*u*b.x+2*u*f*cxp+f*f*tp.x-1,u*u*b.y+2*u*f*cyp+f*f*tp.y-1,2,2);}
      // リール
      const rf=.12,u=1-rf,rx=u*u*b.x+2*u*rf*cxp+rf*rf*tp.x,ry=u*u*b.y+2*u*rf*cyp+rf*rf*tp.y;
      cx.fillStyle='#2a2440';cx.beginPath();cx.arc(rx-6,ry+4,8,0,7);cx.fill();
      cx.strokeStyle='rgba(200,190,240,.35)';cx.lineWidth=1;cx.beginPath();cx.arc(rx-6,ry+4,6,0,7);cx.stroke();
      const ha=state==='reel'&&holding?clock*14:.6;
      cx.strokeStyle='#4a4068';cx.lineWidth=2;cx.beginPath();cx.moveTo(rx-6,ry+4);cx.lineTo(rx-6+Math.cos(ha)*9,ry+4+Math.sin(ha)*9);cx.stroke();
      // 竿先の灯り（穂先ライト）
      cx.globalCompositeOperation='lighter';gl(glow.cy,tp.x,tp.y,6,.55);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
    }
    function drawRain(){
      if(!drops.length)return;
      cx.strokeStyle='rgba(170,170,230,.22)';cx.lineWidth=.8;cx.beginPath();
      for(const d of drops){cx.moveTo(d.x,d.y);cx.lineTo(d.x+d.l*.12,d.y-d.l);}
      cx.stroke();
    }
    function rr(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();}
    function drawUI(t){
      cx.textAlign='center';cx.textBaseline='middle';
      const gy=PY-H*.06;
      if(state==='charge'){
        const w=Math.min(W*.62,260),x=(W-w)/2;
        cx.fillStyle='rgba(8,6,20,.7)';rr(x-4,gy-9,w+8,18,9);cx.fill();
        const gg=cx.createLinearGradient(x,0,x+w,0);gg.addColorStop(0,'#00e8c8');gg.addColorStop(.7,'#8a52d4');gg.addColorStop(1,'#e8b830');
        cx.fillStyle=gg;rr(x,gy-5,Math.max(4,w*power),10,5);cx.fill();
        cx.strokeStyle='rgba(222,204,248,.35)';cx.lineWidth=1;rr(x-4,gy-9,w+8,18,9);cx.stroke();
        cx.font=`11px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText(power>.8?'遠投！':power>.45?'ふつう':'足元',W/2,gy-20);
      }
      if(state==='reel'&&fish){
        const w=Math.min(W*.7,280),x=(W-w)/2;
        cx.fillStyle='rgba(8,6,20,.72)';rr(x-6,gy-12,w+12,24,12);cx.fill();
        // ゾーン
        const zg=cx.createLinearGradient(x,0,x+w,0);
        zg.addColorStop(0,'rgba(0,232,200,.18)');zg.addColorStop(.62,'rgba(68,238,136,.22)');zg.addColorStop(.8,'rgba(232,184,48,.3)');zg.addColorStop(.9,'rgba(232,48,85,.4)');zg.addColorStop(1,'rgba(232,48,85,.55)');
        cx.fillStyle=zg;rr(x,gy-6,w,12,6);cx.fill();
        const col=tension>.86?'#e83055':tension>.7?'#e8b830':'#44ee88';
        cx.fillStyle=col;rr(x,gy-4,Math.max(4,w*tension),8,4);cx.fill();
        if(tension>.86){cx.globalCompositeOperation='lighter';gl(glow.rd,x+w*tension,gy,14,.5+Math.sin(t*20)*.3);cx.globalCompositeOperation='source-over';cx.globalAlpha=1;}
        cx.font=`10px ${FONT}`;cx.fillStyle='rgba(222,204,248,.75)';cx.textAlign='left';cx.fillText('糸の張り',x,gy-21);
        cx.textAlign='right';cx.fillStyle='#bff6ee';cx.fillText(`のこり ${(dist*(18+(fl.castP||0)*22)).toFixed(1)}m`,x+w,gy-21);
        cx.textAlign='center';
        if(surge>0&&!fish.item){cx.font=`12px ${FONT}`;cx.fillStyle=`rgba(232,184,48,${.7+.3*Math.sin(t*14)})`;cx.fillText('暴れてる！ すこし離して',W/2,gy+24);}
        else if(tension>.86){cx.font=`12px ${FONT}`;cx.fillStyle='#ff8aa0';cx.fillText('糸が鳴ってる……離して',W/2,gy+24);}
      }
      // メッセージ
      let m='',mc='#bbaedd',ma=1;
      if(msgT>0){m=msg;mc=msgCol;ma=Math.min(1,msgT*2);}
      else if(state==='ready'){m=castsLeft===CASTS?'長押しでためて、離して投げる':'長押しで、もう一投';ma=.6+.4*Math.sin(t*2.4);}
      else if(state==='wait'){m='……';ma=.5;}
      else if(state==='reel'&&!holding&&tension<.5){m='長押しで巻く';ma=.7;}
      if(m&&state!=='outro'){
        cx.globalAlpha=ma;cx.font=`13px ${FONT}`;
        const y=PY+(H-PY)*.72;
        const tw=cx.measureText(m).width;
        cx.fillStyle='rgba(5,4,14,.55)';rr(W/2-tw/2-12,y-12,tw+24,24,12);cx.fill();
        cx.fillStyle=mc;cx.fillText(m,W/2,y+1);
        cx.globalAlpha=1;
      }
      // 終わり
      if(state==='outro'){
        const a=Math.min(1,outroT/1.2);
        cx.fillStyle=`rgba(4,3,12,${a*.62})`;cx.fillRect(0,0,W,H);
        cx.globalAlpha=a;cx.font=`16px ${FONT}`;cx.fillStyle='#deccf8';
        cx.fillText(catches.length?`釣果 ${catches.length}。`:'今夜は、なにも釣れんかった。',W/2,H*.42);
        cx.font=`12px ${FONT}`;cx.fillStyle='#bbaedd';
        cx.fillText(catches.length?'潮の音だけが、まだ耳に残っている。':'……でも、頭は少し軽くなった。',W/2,H*.42+28);
        if(rareCaught){cx.fillStyle='#e8b830';cx.fillText('★ 不思議なものに出会った夜',W/2,H*.42+52);}
        cx.globalAlpha=1;
      }
    }

    // ── 起動 ──
    resize();
    const onResize=()=>{if(!mg._ended)resize();};
    window.addEventListener('resize',onResize);
    fl.x=W*.5;fl.y=HZ+(PY-HZ)*.5;
    openIntro();
    window.__mgFishing=()=>({state,tension,dist,ended:mg._ended,casts:castsLeft,catches:catches.length});
    mg.loop(dt=>{update(dt);if(!mg._ended)draw();});

    return {result(reason){
      window.removeEventListener('resize',onResize);
      const done=reason==='done';
      const names=catches.map(c=>SP[c.id].name);
      const uniq=[...new Set(names)];
      const fx=done?{mental:6+(rareCaught?1:0),fatigue:-4,hope:2}:{mental:2};
      const rare=catches.filter(c=>SP[c.id].r===3).map(c=>SP[c.id].name);
      const summary=(catches.length?`釣果 <span class="up">${catches.length}</span>：${uniq.join('、')}`:'釣果なし。波の音を聞いていた。')+
        (newSpecies?`<br>図鑑に <span class="up">${newSpecies}種</span> 新しく登録（${zCount()}/${SPECIES.length}）`:`<br>魚図鑑 ${zCount()}/${SPECIES.length}`)+
        (rare.length?`<br><span class="up">★ ${[...new Set(rare)].join('、')}</span> に出会った`:'')+`<br>今夜：${WNAME}`;
      return {
        title:done?'🎣 夜釣り、おしまい':'🎣 早めに竿をたたんだ',
        summary,fx,time:done?60:20,sp:done&&newSpecies>0?1:0,
        log:done?(rare.length?`壇ノ浦の夜の港で釣りをした。${rare[0]}に出会った、不思議な夜。`:`夜の港で釣り糸を垂れた。釣果${catches.length}。頭が少し空っぽになった。`):'夜の港で少しだけ釣りをした。',
        cutin:done?(rare.length?['happy',`……${rare[0]}って。ほんまにおるんやな、この海。`]:['happy','……波の音しか聞こえん。頭、空っぽになったわ。']):null,
      };
    }};
  },
});
