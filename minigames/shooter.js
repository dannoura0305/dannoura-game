// ══════════════════════════════════════════════════════════
// シューティング「炎上コメント撃退」
// 降ってくる悪意のコメントを撃ち落とし、応援コメントは撃たずに受け止める。
// 4つのウェーブのあと、最後に「炎上の渦」が現れる。
// ══════════════════════════════════════════════════════════
addMinigameStyle('shooter',`
.mg-shooter{background:#05040e;}
.mg-shooter .shooter-cv{position:absolute;left:0;top:0;display:block;touch-action:none;user-select:none;-webkit-user-select:none;}
.mg-shooter .shooter-bomb{position:absolute;right:10px;bottom:10px;z-index:3;touch-action:none;
  min-width:78px;padding:6px 9px 5px;border-radius:10px;border:1px solid rgba(0,232,200,.65);
  background:linear-gradient(180deg,rgba(0,60,58,.86),rgba(8,12,30,.9));color:#c8fff5;
  font-family:var(--dot);font-size:.62rem;line-height:1.25;text-align:center;cursor:pointer;
  box-shadow:0 0 12px rgba(0,232,200,.35),inset 0 0 8px rgba(0,232,200,.18);
  transition:opacity .3s,filter .3s,transform .08s;-webkit-tap-highlight-color:transparent;}
.mg-shooter .shooter-bomb b{display:block;font-size:.78rem;font-weight:normal;color:#eafffb;letter-spacing:.04em;}
.mg-shooter .shooter-bomb small{display:block;font-family:var(--mono);font-size:.55rem;color:rgba(200,255,245,.6);}
.mg-shooter .shooter-bomb.ready{animation:shooter-pulse 1.8s ease-in-out infinite;}
.mg-shooter .shooter-bomb:active{transform:scale(.95);}
.mg-shooter .shooter-bomb.used{opacity:.32;filter:grayscale(1);animation:none;box-shadow:none;}
.mg-shooter .shooter-bomb.hide{opacity:0;pointer-events:none;}
@keyframes shooter-pulse{0%,100%{box-shadow:0 0 10px rgba(0,232,200,.3),inset 0 0 8px rgba(0,232,200,.15);}50%{box-shadow:0 0 20px rgba(0,232,200,.65),inset 0 0 12px rgba(0,232,200,.3);}}
`);

registerMinigame({
  id:'shooter', icon:'🔥', name:'炎上コメント撃退', genre:'シューティング', bgm:'stream',
  desc:'降ってくる悪意のコメントを撃ち落とす。応援コメントは撃たずに受け止めよう。最後に「炎上の渦」が来る。',
  effect:'炎上↓ 精神↑ フォロワー↑ ／ 疲労+6 約40分',
  help:'ドラッグ／矢印で移動・自動射撃・Bでモデ召喚',
  start(body,mg){
    // ── 定数 ──
    const T_INTRO=3.2, T_BOSS=48, T_END=62, MAX_SHIELD=5, BOSS_HP=110;
    const FONT='"DotGothic16", monospace';
    const C={pu:'#8a52d4',cy:'#00e8c8',rd:'#e83055',gd:'#e8b830',gn:'#44ee88',tx:'#bbaedd',txb:'#deccf8'};
    const WAVES=[
      {t:0, name:'WAVE 1',sub:'荒らし、接近',      iv:.9, w:{basic:.75,zig:.25}},
      {t:12,name:'WAVE 2',sub:'切り抜き勢、襲来',  iv:.74,w:{basic:.4,zig:.3,armor:.3}},
      {t:24,name:'WAVE 3',sub:'まとめサイト拡散',  iv:.66,w:{basic:.28,zig:.2,armor:.15,split:.22,shooter:.15}},
      {t:36,name:'WAVE 4',sub:'深夜の大炎上',      iv:.54,w:{basic:.2,zig:.24,armor:.2,split:.2,shooter:.16}},
    ];
    const TXT={
      basic:['つまらん','辞めろ','誰得','オワコン','低評価','荒らし','は？','ブーメラン','声きもい'],
      zig:['w','草','乙w','ｗｗｗ','煽り','晒し','雑魚'],
      armor:['#炎上中','謝罪しろ','特定した','垢消せ','説明責任'],
      split:['拡散希望','切り抜くわ','まとめた','魚拓とった'],
      small:['草','w','RT','拡散','？'],
      shooter:['ソース出せ','論破','長文失礼','通報した'],
      good:['がんばれ','好き','おつ','応援してる','ありがとう','声いいね','また来た','無理すんな','寝てね','救われた'],
    };
    const EB_CH=['黙','消','叩','晒','嘘','炎'];
    const POW={
      spread:{ch:'拡',col:'#e8b830',label:'拡散ショット',dur:8},
      barrier:{ch:'護',col:'#00e8c8',label:'バリア',dur:12},
      slow:{ch:'緩',col:'#9b8cff',label:'スロー',dur:5},
      heal:{ch:'♥',col:'#ff7aa8',label:'心が回復',dur:0},
    };
    const SCORE={basic:100,zig:150,armor:250,split:150,small:50,shooter:220};

    // ── DOM ──
    const cv=document.createElement('canvas');
    cv.className='shooter-cv';
    body.appendChild(cv);
    const cx=cv.getContext('2d');
    const bombBtn=document.createElement('button');
    bombBtn.className='shooter-bomb hide';
    bombBtn.innerHTML='<b>モデレーター召喚</b><small>[B] 1回だけ</small>';
    body.appendChild(bombBtn);

    // ── 画面サイズ・事前描画 ──
    let W=0,H=0,dpr=1;
    let lySky=null,lyFar=null,lyNear=null,lyChat=null,lyVig=null;
    const glow={};
    const mkCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=Math.max(1,Math.ceil(w*dpr));c.height=Math.max(1,Math.ceil(h*dpr));const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);return [c,g];};
    const rnd=(a,b)=>a+Math.random()*(b-a);
    const pick=a=>a[(Math.random()*a.length)|0];
    function makeGlow(col,r){
      const [c,g]=mkCanvas(r*2,r*2);
      const gr=g.createRadialGradient(r,r,0,r,r,r);
      gr.addColorStop(0,col);gr.addColorStop(.35,col.replace(/[\d.]+\)$/,m=>(parseFloat(m)*.45)+')'));gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr;g.fillRect(0,0,r*2,r*2);c._r=r;return c;
    }
    function buildLayers(){
      // 夜空
      let g;
      [lySky,g]=mkCanvas(W,H);
      const sky=g.createLinearGradient(0,0,0,H);
      sky.addColorStop(0,'#040310');sky.addColorStop(.45,'#0c0720');sky.addColorStop(.78,'#1d0d34');sky.addColorStop(1,'#120822');
      g.fillStyle=sky;g.fillRect(0,0,W,H);
      // 雲越しの月
      const mx=W*.78,my=H*.14;
      let rg=g.createRadialGradient(mx,my,0,mx,my,W*.38);
      rg.addColorStop(0,'rgba(190,170,240,.22)');rg.addColorStop(.12,'rgba(150,120,220,.12)');rg.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=rg;g.fillRect(0,0,W,H);
      g.fillStyle='rgba(220,210,255,.5)';g.beginPath();g.arc(mx,my,11,0,7);g.fill();
      // 雲の帯
      for(let i=0;i<7;i++){
        const y=H*rnd(.05,.4),x=rnd(-40,W);
        const cg=g.createRadialGradient(x,y,0,x,y,rnd(60,130));
        cg.addColorStop(0,'rgba(40,24,70,.55)');cg.addColorStop(1,'rgba(0,0,0,0)');
        g.fillStyle=cg;g.fillRect(x-140,y-60,280,120);
      }
      // 遠くのネオンの滲み
      [['rgba(232,48,85,.16)',.15,.72],['rgba(0,232,200,.12)',.6,.68],['rgba(138,82,212,.2)',.85,.78],['rgba(232,184,48,.08)',.4,.82]].forEach(([c,x,y])=>{
        const ng=g.createRadialGradient(W*x,H*y,0,W*x,H*y,W*.35);
        ng.addColorStop(0,c);ng.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=ng;g.fillRect(0,0,W,H);
      });
      // 遠景ビル
      const fw=W+80;
      [lyFar,g]=mkCanvas(fw,H);
      let x=0;
      while(x<fw){
        const bw=rnd(18,42),bh=H*rnd(.14,.36),top=H-bh;
        g.fillStyle='#100b22';g.fillRect(x,top,bw,bh);
        if(Math.random()<.3){g.fillRect(x+bw*.4,top-rnd(8,20),2,20);} // アンテナ
        for(let wy=top+5;wy<H-4;wy+=7)for(let wx=x+3;wx<x+bw-3;wx+=6){
          if(Math.random()<.16){g.fillStyle=Math.random()<.7?'rgba(232,200,120,.28)':'rgba(120,220,255,.22)';g.fillRect(wx,wy,2,3);}
        }
        x+=bw+rnd(0,4);
      }
      // 近景ビル＋ネオン看板＋濡れた路面
      const nw=W+160;
      [lyNear,g]=mkCanvas(nw,H);
      x=-10;
      const signs=['配信','24H','ローン','質','夜','整備','BAR','珈琲'];
      while(x<nw){
        const bw=rnd(36,74),bh=H*rnd(.1,.26),top=H-bh;
        g.fillStyle='#07050f';g.fillRect(x,top,bw,bh);
        g.fillStyle='rgba(138,82,212,.18)';g.fillRect(x,top,bw,1);
        for(let wy=top+8;wy<H-14;wy+=10)for(let wx=x+5;wx<x+bw-6;wx+=9){
          const r=Math.random();
          if(r<.2){g.fillStyle=r<.06?'rgba(255,214,140,.55)':r<.12?'rgba(140,240,255,.4)':'rgba(255,160,200,.35)';g.fillRect(wx,wy,4,5);}
        }
        if(Math.random()<.45){
          const s=pick(signs),vert=s.length<=2&&Math.random()<.6;
          const col=pick(['#ff4f8b','#00e8c8','#b77bff','#ffcc55']);
          g.save();g.shadowColor=col;g.shadowBlur=10;g.fillStyle=col;g.strokeStyle=col;g.lineWidth=1.2;
          g.font=`11px ${FONT}`;g.textAlign='center';g.textBaseline='middle';
          const sx=x+bw/2,sy=top+rnd(14,Math.max(16,bh*.45));
          if(vert){g.strokeRect(sx-8,sy-4,16,s.length*13+8);for(let i=0;i<s.length;i++)g.fillText(s[i],sx,sy+9+i*13);}
          else{const tw=g.measureText(s).width;g.strokeRect(sx-tw/2-5,sy-8,tw+10,16);g.fillText(s,sx,sy+1);}
          g.restore();
        }
        x+=bw+rnd(2,10);
      }
      // 路面の反射
      const rgd=g.createLinearGradient(0,H-26,0,H);
      rgd.addColorStop(0,'rgba(5,4,14,0)');rgd.addColorStop(1,'rgba(40,20,70,.55)');
      g.fillStyle=rgd;g.fillRect(0,H-26,nw,26);
      for(let i=0;i<14;i++){g.fillStyle=pick(['rgba(255,79,139,.18)','rgba(0,232,200,.15)','rgba(232,184,48,.12)']);g.fillRect(rnd(0,nw),H-rnd(2,12),rnd(10,40),1);}
      // 背景を流れていくコメント欄の残像
      const ch=Math.ceil(H*1.2);
      [lyChat,g]=mkCanvas(W,ch);
      g.font=`10px ${FONT}`;g.textBaseline='top';
      const pool=[].concat(TXT.basic,TXT.zig,TXT.armor,TXT.good,['今北','初見','888','おやすみ','わこつ','ｗ']);
      for(let col=0;col<4;col++){
        const lx=W*(col/4)+rnd(6,30);
        for(let y=rnd(0,30);y<ch-12;y+=rnd(18,34)){g.fillStyle=Math.random()<.25?'rgba(0,232,200,.07)':'rgba(187,174,221,.06)';g.fillText(pick(pool),lx,y);}
      }
      // 周辺減光
      [lyVig,g]=mkCanvas(W,H);
      const vg=g.createRadialGradient(W/2,H*.55,Math.min(W,H)*.35,W/2,H*.55,Math.max(W,H)*.75);
      vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(2,1,8,.72)');
      g.fillStyle=vg;g.fillRect(0,0,W,H);
    }
    function resize(){
      const w=Math.max(240,body.clientWidth),h=Math.max(320,body.clientHeight);
      const nd=Math.min(2.5,window.devicePixelRatio||1);
      if(w===W&&h===H&&nd===dpr)return;
      const first=!W;
      W=w;H=h;dpr=nd;
      cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cv.style.width=W+'px';cv.style.height=H+'px';
      if(!glow.cy){
        glow.cy=makeGlow('rgba(0,232,200,.9)',40);glow.rd=makeGlow('rgba(232,48,85,.85)',40);
        glow.gd=makeGlow('rgba(232,184,48,.9)',40);glow.pk=makeGlow('rgba(255,122,168,.85)',40);
        glow.pu=makeGlow('rgba(155,140,255,.85)',40);glow.or=makeGlow('rgba(255,120,30,.9)',40);
        glow.wt=makeGlow('rgba(255,255,255,.9)',40);
      }
      buildLayers();
      if(first){player.x=player.tx=W/2;player.y=player.ty=H-80;}
      player.tx=Math.max(16,Math.min(W-16,player.tx));player.ty=Math.max(H*.42,Math.min(H-46,player.ty));
      rain.forEach(d=>{d.x=Math.random()*W;d.y=Math.random()*H;});
    }

    // ── 状態 ──
    const player={x:0,y:0,tx:0,ty:0,vx:0,tilt:0};
    const rain=[];for(let i=0;i<80;i++)rain.push({x:0,y:0,l:rnd(6,16),s:rnd(380,620),n:i<30});
    let enemies=[],goods=[],pb=[],eb=[];
    const parts=[];for(let i=0;i<360;i++)parts.push({x:0,y:0,vx:0,vy:0,life:0,max:1,sz:2,col:'#fff',add:true});
    let pi=0;
    const pops=[];for(let i=0;i<24;i++)pops.push({x:0,y:0,t:0,text:'',col:'#fff',big:false});
    let popi=0;
    const rings=[];for(let i=0;i<16;i++)rings.push({x:0,y:0,t:0,max:1,r:40,col:'#fff'});
    let ri=0;
    let t=-T_INTRO, clock=0, shield=MAX_SHIELD, score=0, kills=0, caught=0, friendlyFire=0;
    let combo=0, comboT=0, maxCombo=0, fireCd=0, spawnCd=.5, goodCd=3, waveIdx=-1;
    let inv=0, shake=0, hurtFlash=0, whiteFlash=0, slowT=0, spreadT=0, barrierT=0;
    let bombUsed=false, bombT=0, banner=null, dying=0, boss=null, bossBeaten=false, winT=0, ended=false;
    let lastScoreHtml='', lastTimer='', seCd=0;

    resize();
    const onResize=()=>{if(!mg._ended)resize();};
    window.addEventListener('resize',onResize);

    // ── 入力 ──
    let drag=null;
    const keys={l:false,r:false,u:false,d:false};
    cv.addEventListener('pointerdown',e=>{
      e.preventDefault();
      if(t<-.4){t=-.4;}
      try{cv.setPointerCapture(e.pointerId);}catch(_){}
      drag={id:e.pointerId,sx:e.clientX,sy:e.clientY,px:player.tx,py:player.ty};
    });
    cv.addEventListener('pointermove',e=>{
      if(!drag||drag.id!==e.pointerId)return;
      player.tx=drag.px+(e.clientX-drag.sx)*1.25;
      player.ty=drag.py+(e.clientY-drag.sy)*1.25;
    });
    const endDrag=e=>{if(drag&&drag.id===e.pointerId)drag=null;};
    cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
    bombBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();bomb();});
    mg.onKey(e=>{
      const k=e.key, dn=e.type==='keydown';
      const map={ArrowLeft:'l',a:'l',A:'l',ArrowRight:'r',d:'r',D:'r',ArrowUp:'u',w:'u',W:'u',ArrowDown:'d',s:'d',S:'d'};
      if(map[k]){e.preventDefault();keys[map[k]]=dn;return;}
      if(dn&&!e.repeat&&(k==='b'||k==='B'||k==='x'||k==='X'||k===' ')){e.preventDefault();bomb();}
      if(dn&&k==='Enter'&&t<-.4)t=-.4;
    });

    // ── 演出ヘルパ ──
    function burst(x,y,n,cols,spd,life,sz){
      for(let i=0;i<n;i++){
        const p=parts[pi];pi=(pi+1)%parts.length;
        const a=Math.random()*6.283,v=spd*(.3+Math.random()*.7);
        p.x=x;p.y=y;p.vx=Math.cos(a)*v;p.vy=Math.sin(a)*v;p.max=p.life=life*(.6+Math.random()*.4);
        p.sz=sz*(.6+Math.random()*.8);p.col=cols[(Math.random()*cols.length)|0];p.add=true;
      }
    }
    function ring(x,y,r,col,max){const o=rings[ri];ri=(ri+1)%rings.length;o.x=x;o.y=y;o.r=r;o.col=col;o.t=o.max=max||.45;}
    function pop(x,y,text,col,big){const o=pops[popi];popi=(popi+1)%pops.length;o.x=x;o.y=y;o.text=text;o.col=col;o.t=big?1.3:.9;o.big=!!big;}
    function se(type){if(seCd<=0){try{AU.se(type);}catch(_){}seCd=.06;}}
    function showBanner(main,sub,col,dur){banner={main,sub,col,t:0,dur:dur||1.9};}
    const mult=()=>1+Math.min(3,Math.floor(combo/5)*.5);

    // ── 生成 ──
    function measure(text,px){cx.font=`${px}px ${FONT}`;return cx.measureText(text).width;}
    function spawnEnemy(type,x,y){
      const e={type,good:false,dead:false,flash:0,age:0,face:(Math.random()*3)|0,small:type==='small',fireCd:rnd(.8,1.4),vx:0,vy:0,hp:1,maxHp:1,text:'',tw:0,w:0,h:0,x:0,y:0,bx:0,amp:0,ph:Math.random()*6,stay:0};
      e.text=pick(TXT[type]);
      const fs=e.small?11:13;
      e.tw=measure(e.text,fs);
      e.w=e.small?e.tw+18:e.tw+40;e.h=e.small?20:(type==='armor'?30:26);
      e.x=x!==undefined?x:rnd(e.w/2+6,W-e.w/2-6);e.y=y!==undefined?y:-e.h;
      const wv=Math.max(0,waveIdx);
      if(type==='basic'){e.vy=rnd(66,92)+wv*9;}
      else if(type==='zig'){e.vy=rnd(120,155)+wv*8;e.amp=rnd(30,Math.min(70,W*.14));e.bx=Math.max(e.amp+e.w/2,Math.min(W-e.amp-e.w/2,e.x));}
      else if(type==='armor'){e.vy=rnd(42,54);e.hp=e.maxHp=wv>=3?4:3;}
      else if(type==='split'){e.vy=rnd(56,70);e.hp=e.maxHp=2;}
      else if(type==='shooter'){e.vy=110;e.hp=e.maxHp=3;e.stay=H*rnd(.1,.28);e.bx=e.x;}
      else if(type==='small'){e.vy=rnd(85,110);}
      enemies.push(e);return e;
    }
    function spawnGood(){
      let kind;
      const r=Math.random();
      if(shield<=2&&r<.5)kind='heal';
      else kind=r<.32?'spread':r<.56?'barrier':r<.76?'slow':'heal';
      const text=pick(TXT.good);
      const tw=measure(text,13);
      const w=tw+42;
      goods.push({good:true,dead:false,pow:kind,text,tw,w,h:28,x:rnd(w/2+8,W-w/2-8),y:-20,vy:rnd(52,64),age:0});
    }
    function chooseType(){
      if(waveIdx<0)return 'basic';
      const w=WAVES[waveIdx].w;
      let r=Math.random(),acc=0;
      for(const k in w){acc+=w[k];if(r<acc){
        if(k==='shooter'){let n=0;for(const e of enemies)if(e.type==='shooter')n++;if(n>=2)return 'basic';}
        return k;}}
      return 'basic';
    }
    function startBoss(){
      const R=Math.max(46,Math.min(78,W*.17));
      boss={x:W/2,y:-R*1.6,R,hp:BOSS_HP,max:BOSS_HP,t:0,pat:0,patT:0,fire:0,ang:0,flash:0,dead:false,dieT:0};
      showBanner('WARNING','炎上の渦が近づいてくる','#e83055',2.4);
      try{AU.se('warn');}catch(_){}
      shake=Math.max(shake,6);
    }

    // ── ダメージ・取得 ──
    function hurt(x,y,msg){
      if(inv>0||dying>0||winT>0)return;
      if(barrierT>0){
        barrierT=0;inv=.8;ring(player.x,player.y,46,C.cy,.5);burst(player.x,player.y,16,['#00e8c8','#bff8ee'],180,.5,3);
        pop(player.x,player.y-34,'バリアが守った','#00e8c8');se('repair');return;
      }
      shield--;inv=1.3;shake=Math.max(shake,9);hurtFlash=.5;combo=0;
      burst(x,y,18,['#e83055','#ff9aa8','#ffd0d8'],220,.6,3);
      pop(x,y-20,msg||'刺さった…','#ff7a90');
      try{AU.se('noise');}catch(_){}
      if(shield<=0){dying=1.3;burst(player.x,player.y,40,['#e83055','#ffd0d8','#8a52d4'],300,1,4);ring(player.x,player.y,80,C.rd,.9);}
    }
    function killEnemy(e){
      e.dead=true;kills++;combo++;comboT=2.6;maxCombo=Math.max(maxCombo,combo);
      const m=mult(),pts=Math.round(SCORE[e.type]*m);
      score+=pts;
      const cols=e.type==='zig'?['#d04ce8','#f3c8ff','#fff']:e.type==='split'?['#ff8a2a','#ffd08a','#fff']:e.type==='armor'?['#9aa0b8','#e8b830','#fff']:['#e83055','#ffb0be','#e8b830'];
      burst(e.x,e.y,e.small?8:16,cols,e.small?140:200,.55,e.small?2:3);
      ring(e.x,e.y,e.small?22:34,cols[0],.35);
      pop(e.x,e.y-6,'+'+pts+(m>1?' ×'+m.toFixed(1):''),m>=2?'#e8b830':'#ffe8b0');
      if(e.type==='split'){spawnEnemy('small',e.x-10,e.y).vx=-75;spawnEnemy('small',e.x+10,e.y).vx=75;}
      se(e.type==='armor'?'tool':'comment');
    }
    function catchGood(g){
      g.dead=true;caught++;
      const p=POW[g.pow];
      if(g.pow==='heal'||shield<MAX_SHIELD){if(shield<MAX_SHIELD)shield++;}
      if(g.pow==='spread')spreadT=p.dur;
      else if(g.pow==='barrier')barrierT=p.dur;
      else if(g.pow==='slow')slowT=p.dur;
      score+=150;
      const gc=g.pow==='spread'?'gd':g.pow==='slow'?'pu':g.pow==='heal'?'pk':'cy';
      burst(g.x,g.y,18,[p.col,'#ffffff','#bff8ee'],160,.7,3);ring(g.x,g.y,44,p.col,.5);
      pop(g.x,g.y-22,p.label+'！',p.col,true);
      glowPulse=.4;glowCol=gc;
      try{AU.se('ach');}catch(_){}
    }
    let glowPulse=0,glowCol='cy';
    function bomb(){
      if(bombUsed||t<0||dying>0||winT>0||mg._ended)return;
      bombUsed=true;bombT=1.4;whiteFlash=.6;shake=Math.max(shake,12);
      bombBtn.classList.add('used');bombBtn.classList.remove('ready');
      for(const e of enemies)if(!e.dead)killEnemy(e);
      for(const b of eb){if(!b.dead){b.dead=true;burst(b.x,b.y,4,['#00e8c8','#fff'],90,.4,2);}}
      if(boss&&!boss.dead){boss.hp-=26;boss.flash=.3;score+=500;}
      ring(player.x,player.y,Math.max(W,H),C.cy,1.1);
      showBanner('モデレーター召喚','不適切なコメントを非表示にしました','#00e8c8',2);
      try{AU.se('rank');}catch(_){}
    }

    // ── 更新 ──
    function compact(a){let j=0;for(let i=0;i<a.length;i++)if(!a[i].dead)a[j++]=a[i];a.length=j;}
    let resizeChk=0;
    mg.loop(dt=>{
      clock+=dt;seCd-=dt;
      resizeChk-=dt;if(resizeChk<=0){resizeChk=.5;resize();}
      const prevT=t;
      if(dying<=0&&winT<=0)t+=dt;
      const ts=slowT>0?.42:1, edt=dt*ts;

      // ウェーブ進行
      if(t>=0&&prevT<0){bombBtn.classList.remove('hide');bombBtn.classList.add('ready');}
      for(let i=WAVES.length-1;i>=0;i--){
        if(t>=WAVES[i].t&&t<T_BOSS&&waveIdx<i){waveIdx=i;showBanner(WAVES[i].name,WAVES[i].sub,'#deccf8');try{AU.se('live');}catch(_){}break;}
      }
      if(t>=T_BOSS&&!boss)startBoss();

      // プレイヤー移動
      const ks=330*dt;
      if(keys.l)player.tx-=ks;if(keys.r)player.tx+=ks;if(keys.u)player.ty-=ks;if(keys.d)player.ty+=ks;
      player.tx=Math.max(16,Math.min(W-16,player.tx));player.ty=Math.max(H*.42,Math.min(H-46,player.ty));
      const ox=player.x;
      const k=Math.min(1,dt*16);
      player.x+=(player.tx-player.x)*k;player.y+=(player.ty-player.y)*k;
      player.vx=(player.x-ox)/Math.max(dt,.001);
      player.tilt+=(Math.max(-.35,Math.min(.35,player.vx*.0016))-player.tilt)*Math.min(1,dt*10);

      // タイマー類
      if(inv>0)inv-=dt;if(slowT>0)slowT-=dt;if(spreadT>0)spreadT-=dt;if(barrierT>0)barrierT-=dt;
      if(shake>0)shake=Math.max(0,shake-dt*30);if(hurtFlash>0)hurtFlash-=dt;if(whiteFlash>0)whiteFlash-=dt;
      if(bombT>0)bombT-=dt;if(glowPulse>0)glowPulse-=dt;
      if(comboT>0){comboT-=dt;if(comboT<=0)combo=0;}
      if(banner){banner.t+=dt;if(banner.t>banner.dur)banner=null;}

      // 推進炎の粒
      if(dying<=0){
        const p=parts[pi];pi=(pi+1)%parts.length;
        p.x=player.x+rnd(-3,3);p.y=player.y+30;p.vx=rnd(-20,20)-player.vx*.1;p.vy=rnd(90,150);p.max=p.life=rnd(.25,.4);p.sz=rnd(2,3.5);p.col=Math.random()<.5?'#00e8c8':'#8a52d4';p.add=true;
      }

      if(t>=0&&dying<=0&&winT<=0){
        // 射撃
        fireCd-=dt;
        if(fireCd<=0){
          fireCd=.15;
          const sx=player.x,sy=player.y-22;
          pb.push({x:sx,y:sy,vx:0,vy:-560,dead:false,gold:false});
          if(spreadT>0){
            pb.push({x:sx-6,y:sy+4,vx:-150,vy:-540,dead:false,gold:true});
            pb.push({x:sx+6,y:sy+4,vx:150,vy:-540,dead:false,gold:true});
          }
        }
        // 出現
        if(t<T_BOSS){
          spawnCd-=dt;
          if(spawnCd<=0){spawnEnemy(chooseType());spawnCd=WAVES[Math.max(0,waveIdx)].iv*rnd(.7,1.3);}
          goodCd-=dt;
          if(goodCd<=0){spawnGood();goodCd=rnd(3.2,5);}
        }else if(boss&&!boss.dead){
          spawnCd-=dt;
          if(spawnCd<=0){spawnEnemy(Math.random()<.5?'zig':'basic');spawnCd=rnd(1.8,2.6);}
          goodCd-=dt;
          if(goodCd<=0){spawnGood();goodCd=rnd(2.6,3.6);}
        }
      }

      // 自弾
      for(const b of pb){b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.y<-20||b.x<-20||b.x>W+20)b.dead=true;}

      // 敵
      const hx=player.x,hy=player.y-6;
      for(const e of enemies){
        if(e.dead)continue;
        e.age+=edt;if(e.flash>0)e.flash-=dt;
        if(e.type==='zig'){e.y+=e.vy*edt;e.x=e.bx+Math.sin(e.age*4.2+e.ph)*e.amp;}
        else if(e.type==='shooter'){
          if(e.age<7){e.y+=(e.stay-e.y)*Math.min(1,edt*2.2);e.x=e.bx+Math.sin(e.age*.9+e.ph)*Math.min(60,W*.15);
            e.fireCd-=edt;
            if(e.fireCd<=0&&t>=0&&dying<=0){e.fireCd=rnd(1.4,1.9);
              const a=Math.atan2(hy-e.y,hx-e.x);
              eb.push({x:e.x,y:e.y+e.h/2,vx:Math.cos(a)*120,vy:Math.sin(a)*120,ch:pick(EB_CH),dead:false,boss:false});
              ring(e.x,e.y+e.h/2,16,C.rd,.25);
            }
          }else{e.y-=150*edt;if(e.y<-60)e.dead=true;}
        }else{e.y+=e.vy*edt;e.x+=e.vx*edt;if(e.x<e.w/2||e.x>W-e.w/2){e.vx*=-1;e.x=Math.max(e.w/2,Math.min(W-e.w/2,e.x));}}
        // 被弾判定
        const hw=e.w/2,hh=e.h/2;
        for(const b of pb){
          if(b.dead)continue;
          if(b.x>e.x-hw-2&&b.x<e.x+hw+2&&b.y>e.y-hh&&b.y<e.y+hh+8){
            b.dead=true;e.hp--;e.flash=.08;
            burst(b.x,b.y,3,['#fff','#00e8c8'],90,.25,2);
            if(e.hp<=0){killEnemy(e);break;}
            else if(e.type==='armor'){se('tool');score+=10;}
          }
        }
        if(e.dead)continue;
        // 体当たり
        if(Math.abs(e.x-hx)<hw+8&&Math.abs(e.y-hy)<hh+12){e.dead=true;burst(e.x,e.y,12,['#e83055','#ffd0d8'],160,.5,3);hurt(hx,hy,'「'+e.text+'」');continue;}
        // 下まで落ちた悪意は心に刺さる
        if(e.y-hh>H){e.dead=true;combo=0;if(!e.small)hurt(e.x,H-30,'「'+e.text+'」が刺さった');}
      }
      compact(enemies);

      // 応援コメント
      for(const g of goods){
        if(g.dead)continue;
        g.age+=dt;g.y+=g.vy*dt;
        const gx=g.x+Math.sin(g.age*2)*6;
        for(const b of pb){
          if(b.dead)continue;
          if(Math.abs(b.x-gx)<g.w/2&&Math.abs(b.y-g.y)<g.h/2+4){
            b.dead=true;g.dead=true;friendlyFire++;
            burst(gx,g.y,14,['#ff7aa8','#bff8ee','#fff'],150,.6,3);
            pop(gx,g.y-14,'誤射… 応援を消した','#ff7aa8');
            if(dying<=0&&winT<=0&&inv<=0){shield--;inv=1;hurtFlash=.35;combo=0;shake=Math.max(shake,5);try{AU.se('back');}catch(_){}if(shield<=0){dying=1.3;burst(player.x,player.y,40,['#e83055','#ffd0d8'],300,1,4);}}
            break;
          }
        }
        if(g.dead)continue;
        if(Math.abs(gx-player.x)<g.w/2+12&&Math.abs(g.y-(player.y))<g.h/2+24&&dying<=0){g.x=gx;catchGood(g);continue;}
        if(g.y>H+30)g.dead=true;
      }
      compact(goods);

      // 敵弾
      for(const b of eb){
        if(b.dead)continue;
        b.x+=b.vx*edt;b.y+=b.vy*edt;
        if(b.y>H+20||b.y<-40||b.x<-20||b.x>W+20){b.dead=true;continue;}
        const dx=b.x-hx,dy=b.y-hy;
        if(dx*dx+dy*dy<(barrierT>0?26*26:15*15)){b.dead=true;hurt(b.x,b.y,'「'+b.ch+'」');}
      }
      compact(eb);

      // ボス
      if(boss){
        const bs=boss;
        bs.t+=edt;if(bs.flash>0)bs.flash-=dt;
        if(!bs.dead){
          const ty=Math.max(bs.R+40,H*.2);
          bs.y+=(ty-bs.y)*Math.min(1,dt*1.2);
          bs.x=W/2+Math.sin(bs.t*.55)*(W/2-bs.R-14);
          bs.ang+=edt*2.2;
          const active=bs.t>2&&dying<=0&&winT<=0;
          if(active){
            bs.patT+=edt;if(bs.patT>3.6){bs.patT=0;bs.pat=(bs.pat+1)%3;}
            bs.fire-=edt;
            const enr=bs.hp<bs.max*.4?1.25:1;
            if(bs.fire<=0){
              if(bs.pat===0){ // 渦巻き
                bs.fire=.11/enr;const a=bs.t*2.7;
                for(let s=0;s<2;s++){const aa=a+s*Math.PI;eb.push({x:bs.x+Math.cos(aa)*bs.R*.6,y:bs.y+Math.sin(aa)*bs.R*.6,vx:Math.cos(aa)*95,vy:Math.sin(aa)*95+20,ch:'炎',dead:false,boss:true});}
              }else if(bs.pat===1){ // 自機狙いの扇
                bs.fire=.85/enr;const a=Math.atan2(hy-bs.y,hx-bs.x);
                for(let s=-2;s<=2;s++){const aa=a+s*.2;eb.push({x:bs.x,y:bs.y+bs.R*.5,vx:Math.cos(aa)*150,vy:Math.sin(aa)*150,ch:pick(EB_CH),dead:false,boss:true});}
                ring(bs.x,bs.y+bs.R*.5,26,'#ff7a1e',.3);
              }else{ // 輪（ひとつだけ隙間）
                bs.fire=1.15/enr;const n=16,gap=(Math.random()*n)|0,off=Math.random();
                for(let s=0;s<n;s++){if(s===gap||s===(gap+1)%n)continue;const aa=(s+off)/n*6.283;eb.push({x:bs.x,y:bs.y,vx:Math.cos(aa)*100,vy:Math.sin(aa)*100,ch:'炎',dead:false,boss:true});}
              }
            }
          }
          // 被弾
          for(const b of pb){
            if(b.dead)continue;
            const dx=b.x-bs.x,dy=b.y-bs.y;
            if(dx*dx+dy*dy<bs.R*bs.R){b.dead=true;if(bs.t>1.2){bs.hp--;bs.flash=.06;score+=10;burst(b.x,b.y,3,['#ffcc55','#fff'],120,.3,2);}}
          }
          // 体当たり
          {const dx=hx-bs.x,dy=hy-bs.y;if(dx*dx+dy*dy<(bs.R*.8)*(bs.R*.8))hurt(hx,hy,'渦に呑まれた');}
          if(bs.hp<=0){
            bs.dead=true;bs.hp=0;bossBeaten=true;winT=2.4;score+=3000;
            for(const b of eb)b.dead=true;
            for(const e of enemies)if(!e.dead){e.dead=true;burst(e.x,e.y,10,['#ffcc55','#fff'],150,.5,3);}
            showBanner('鎮火','炎上の渦が消えていく','#e8b830',2.4);
            whiteFlash=.5;shake=14;
            try{AU.se('ach');}catch(_){}
          }
        }else{
          bs.dieT+=dt;
          if(Math.random()<dt*14)burst(bs.x+rnd(-bs.R,bs.R),bs.y+rnd(-bs.R,bs.R),14,['#ff7a1e','#ffcc55','#fff','#e83055'],220,.7,4);
          if(Math.random()<dt*5)ring(bs.x+rnd(-bs.R,bs.R)*.6,bs.y+rnd(-bs.R,bs.R)*.6,50,'#ffcc55',.5);
        }
      }

      compact(pb);

      // 粒子
      for(const p of parts){if(p.life>0){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;}}
      for(const o of pops)if(o.t>0){o.t-=dt;o.y-=(o.big?26:38)*dt;}
      for(const o of rings)if(o.t>0)o.t-=dt;
      // 雨
      for(const d of rain){d.y+=d.s*dt*(d.n?.7:1);d.x+=d.s*dt*.12;if(d.y>H){d.y=-d.l;d.x=Math.random()*W*1.1-W*.1;}}

      draw();
      hud();

      // 終了判定
      if(dying>0){dying-=dt;if(dying<=0&&!ended){ended=true;mg.end('down');return;}}
      if(winT>0){winT-=dt;if(winT<=0&&!ended){ended=true;mg.end('clear');return;}}
      if(t>=T_END&&!ended&&dying<=0&&winT<=0){ended=true;mg.end('clear');}
    });

    // ── 描画 ──
    function rr(x,y,w,h,r){
      cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath();
    }
    function gl(c,x,y,r,a){cx.globalAlpha=a;cx.drawImage(c,x-r,y-r,r*2,r*2);}

    function drawBg(){
      cx.drawImage(lySky,0,0,W,H);
      // 流れるコメントの残像
      const ch=lyChat.height/dpr,off=(clock*14)%ch;
      cx.drawImage(lyChat,0,-off,W,ch);cx.drawImage(lyChat,0,ch-off,W,ch);
      const pxo=(player.x-W/2)/W;
      cx.drawImage(lyFar,-40-pxo*16+Math.sin(clock*.05)*6,0,W+80,H);
      cx.drawImage(lyNear,-80-pxo*40,0,W+160,H);
      // ボス戦は空が赤く焼ける
      if(boss){
        const a=boss.dead?Math.max(0,.35-boss.dieT*.15):Math.min(.35,boss.t*.12);
        if(a>0){cx.globalAlpha=a*(.85+Math.sin(clock*3)*.15);cx.drawImage(glow.or,-W*.3,-H*.25,W*1.6,H*1.0);cx.globalAlpha=1;}
      }
      // 雨（2層・まとめて描く）
      cx.lineWidth=1;
      cx.strokeStyle='rgba(150,130,220,.16)';cx.beginPath();
      for(const d of rain)if(d.n){cx.moveTo(d.x,d.y);cx.lineTo(d.x+d.l*.09,d.y+d.l*.7);}
      cx.stroke();
      cx.strokeStyle='rgba(190,175,255,.3)';cx.beginPath();
      for(const d of rain)if(!d.n){cx.moveTo(d.x,d.y);cx.lineTo(d.x+d.l*.12,d.y+d.l);}
      cx.stroke();
    }

    function drawFace(x,y,r,e,col){
      cx.fillStyle=col;cx.beginPath();cx.arc(x,y,r,0,6.283);cx.fill();
      cx.strokeStyle='#1a0510';cx.fillStyle='#1a0510';cx.lineWidth=1.4;cx.lineCap='round';
      cx.beginPath();
      if(e.type==='armor'){ // バイザー
        cx.fillStyle='#1a1826';cx.fillRect(x-r*.85,y-r*.45,r*1.7,r*.55);
        cx.fillStyle=e.flash>0?'#fff':'#ff3b5c';cx.fillRect(x-r*.6,y-r*.3,r*.45,r*.25);cx.fillRect(x+r*.15,y-r*.3,r*.45,r*.25);
        cx.moveTo(x-r*.4,y+r*.5);cx.lineTo(x+r*.4,y+r*.5);cx.stroke();return;
      }
      if(e.type==='shooter'){ // 一つ目
        cx.fillStyle='#1a0510';cx.beginPath();cx.arc(x,y-r*.1,r*.48,0,6.283);cx.fill();
        cx.fillStyle=e.fireCd<.35?'#fff':'#ff5050';cx.beginPath();cx.arc(x,y-r*.1,r*.24,0,6.283);cx.fill();
        cx.beginPath();cx.moveTo(x-r*.7,y-r*.7);cx.lineTo(x+r*.7,y-r*.55);cx.stroke();return;
      }
      // 吊り上がった眉
      cx.moveTo(x-r*.75,y-r*.55);cx.lineTo(x-r*.2,y-r*.25);
      if(e.face===1){cx.moveTo(x+r*.2,y-r*.45);cx.lineTo(x+r*.75,y-r*.5);}else{cx.moveTo(x+r*.75,y-r*.55);cx.lineTo(x+r*.2,y-r*.25);}
      cx.stroke();
      cx.fillRect(x-r*.45,y-r*.15,r*.22,r*.28);cx.fillRect(x+r*.25,y-r*.15,r*.22,r*.28);
      cx.beginPath();
      if(e.face===0){cx.arc(x,y+r*.75,r*.4,3.6,5.8);cx.stroke();}           // への字
      else if(e.face===1){cx.moveTo(x-r*.35,y+r*.45);cx.quadraticCurveTo(x+r*.1,y+r*.3,x+r*.5,y+r*.2);cx.stroke();} // にやり
      else{cx.ellipse(x,y+r*.45,r*.3,r*.22,0,0,6.283);cx.fill();}            // 叫び
    }

    const ESTY={
      basic:{fill:'rgba(58,10,28,.93)',st:'#e83055',tx:'#ffd6de',face:'#ff6b81',gl:'rd'},
      zig:{fill:'rgba(48,10,62,.93)',st:'#d04ce8',tx:'#f3c8ff',face:'#e07bff',gl:'pu'},
      armor:{fill:'rgba(36,34,50,.96)',st:'#a4aac4',tx:'#ff8fa3',face:'#7d8299',gl:'rd'},
      split:{fill:'rgba(68,28,6,.93)',st:'#ff8a2a',tx:'#ffe0c0',face:'#ffa24c',gl:'or'},
      shooter:{fill:'rgba(66,6,16,.96)',st:'#ff3b3b',tx:'#ffd0d0',face:'#ff6b6b',gl:'rd'},
      small:{fill:'rgba(60,14,30,.9)',st:'#ff6b81',tx:'#ffd6de',face:'#ff6b81',gl:'rd'},
    };
    function drawEnemy(e){
      const s=ESTY[e.type];
      const x=e.x-e.w/2,y=e.y-e.h/2,w=e.w,h=e.h;
      gl(glow[s.gl],e.x,e.y,Math.max(w,h)*.8,.35);
      cx.globalAlpha=1;
      // 吹き出し本体＋しっぽ
      rr(x,y,w,h,e.type==='armor'?5:h/2.4);
      cx.fillStyle=e.flash>0?'#ffffff':s.fill;cx.fill();
      cx.lineWidth=e.type==='armor'?2:1.4;cx.strokeStyle=s.st;cx.stroke();
      cx.fillStyle=e.flash>0?'#fff':s.fill;
      cx.beginPath();cx.moveTo(e.x-4,y+h-1);cx.lineTo(e.x+6,y+h+7);cx.lineTo(e.x+7,y+h-1);cx.closePath();cx.fill();
      cx.beginPath();cx.moveTo(e.x-4,y+h);cx.lineTo(e.x+6,y+h+7);cx.lineTo(e.x+7,y+h);cx.stroke();
      if(e.type==='armor'){ // リベットと装甲板
        cx.fillStyle='#c9cee0';
        cx.fillRect(x+3,y+3,2,2);cx.fillRect(x+w-5,y+3,2,2);cx.fillRect(x+3,y+h-5,2,2);cx.fillRect(x+w-5,y+h-5,2,2);
        for(let i=0;i<e.maxHp;i++){cx.fillStyle=i<e.hp?'#e8b830':'rgba(255,255,255,.15)';cx.fillRect(x+w/2-e.maxHp*4+i*8,y-6,6,3);}
      }else if(e.type==='split'){ // ひび
        cx.strokeStyle='rgba(255,200,140,.55)';cx.lineWidth=1;cx.beginPath();
        cx.moveTo(e.x+4,y+1);cx.lineTo(e.x,y+h*.4);cx.lineTo(e.x+5,y+h*.6);cx.lineTo(e.x+1,y+h-1);cx.stroke();
      }else if(e.type==='shooter'){
        cx.strokeStyle='rgba(255,59,59,.45)';cx.lineWidth=1;rr(x-3,y-3,w+6,h+6,h/2.4+3);cx.stroke();
        for(let i=0;i<e.maxHp;i++){cx.fillStyle=i<e.hp?'#ff5050':'rgba(255,255,255,.15)';cx.fillRect(x+w/2-e.maxHp*4+i*8,y-7,6,3);}
      }
      if(e.small){
        cx.fillStyle=s.tx;cx.font=`11px ${FONT}`;cx.textAlign='left';
        cx.fillText(e.text,x+12,e.y+1);
        cx.fillStyle='#1a0510';cx.fillRect(x+5,e.y-3,2,2);cx.fillRect(x+5,e.y+1,2,2);
      }else{
        drawFace(x+15,e.y,9,e,e.flash>0?'#fff':s.face);
        cx.fillStyle=e.flash>0?'#000':s.tx;cx.font=`13px ${FONT}`;cx.textAlign='left';
        cx.fillText(e.text,x+29,e.y+1);
      }
    }
    function drawGood(g){
      const p=POW[g.pow];
      const x=g.x+Math.sin(g.age*2)*6,y=g.y,w=g.w,h=g.h;
      const pul=.55+Math.sin(g.age*5)*.15;
      gl(glow[g.pow==='spread'?'gd':g.pow==='slow'?'pu':g.pow==='heal'?'pk':'cy'],x,y,w*.75,pul);
      gl(glow.cy,x,y,w*.5,.25);
      cx.globalAlpha=1;
      rr(x-w/2,y-h/2,w,h,h/2);
      cx.fillStyle='rgba(10,48,52,.82)';cx.fill();
      cx.lineWidth=1.5;cx.strokeStyle='rgba(160,255,240,.9)';cx.stroke();
      // 小さなハート
      cx.fillStyle='#ff9ec0';
      const hx=x-w/2+12,hy=y;
      cx.beginPath();cx.moveTo(hx,hy+4);cx.bezierCurveTo(hx-7,hy-1,hx-3,hy-7,hx,hy-3);cx.bezierCurveTo(hx+3,hy-7,hx+7,hy-1,hx,hy+4);cx.fill();
      cx.fillStyle='#eafffb';cx.font=`13px ${FONT}`;cx.textAlign='left';
      cx.fillText(g.text,x-w/2+21,y+1);
      // パワーアップの印
      const bx=x+w/2-1,by=y-h/2+1;
      cx.fillStyle=p.col;cx.beginPath();cx.arc(bx,by,8,0,6.283);cx.fill();
      cx.fillStyle='#0a0716';cx.font=`10px ${FONT}`;cx.textAlign='center';cx.fillText(p.ch,bx,by+1);
    }
    function drawEB(b){
      const col=b.boss?'or':'rd';
      gl(glow[col],b.x,b.y,16,.6);cx.globalAlpha=1;
      cx.fillStyle=b.boss?'#3a1204':'#3a0612';cx.beginPath();cx.arc(b.x,b.y,8,0,6.283);cx.fill();
      cx.strokeStyle=b.boss?'#ff9a3c':'#ff4d6a';cx.lineWidth=1.2;cx.stroke();
      cx.fillStyle=b.boss?'#ffd9a0':'#ffd0d8';cx.fillText(b.ch,b.x,b.y+1);
    }
    function drawPlayer(){
      const x=player.x,y=player.y;
      if(dying>0&&dying<1.1)return;
      const blink=inv>0&&((clock*14)|0)%2===0;
      // 光の滲み
      gl(glow.cy,x,y,48,.45+(glowPulse>0?glowPulse:0));
      if(glowPulse>0)gl(glow[glowCol],x,y,70,glowPulse*1.5);
      cx.globalAlpha=blink?.35:1;
      cx.save();cx.translate(x,y);cx.rotate(player.tilt);
      // 推進炎
      const fl=10+Math.sin(clock*40)*3+Math.random()*3;
      cx.globalCompositeOperation='lighter';
      cx.fillStyle='rgba(0,232,200,.55)';cx.beginPath();cx.moveTo(-5,22);cx.lineTo(0,22+fl*1.6);cx.lineTo(5,22);cx.fill();
      cx.fillStyle='rgba(220,255,250,.85)';cx.beginPath();cx.moveTo(-2.5,22);cx.lineTo(0,22+fl*.9);cx.lineTo(2.5,22);cx.fill();
      cx.globalCompositeOperation='source-over';
      // 持ち手
      const hg=cx.createLinearGradient(-6,0,6,0);
      hg.addColorStop(0,'#1c1830');hg.addColorStop(.45,'#5a5278');hg.addColorStop(1,'#14111f');
      cx.fillStyle=hg;cx.beginPath();cx.moveTo(-6.5,0);cx.lineTo(6.5,0);cx.lineTo(4,23);cx.lineTo(-4,23);cx.closePath();cx.fill();
      cx.fillStyle='#e8b830';cx.fillRect(-7,-1,14,3.5);
      cx.fillStyle=((clock*2)|0)%2?'#ff3355':'#ff8899';cx.fillRect(-1.5,8,3,3);
      // ヘッド（グリル）
      cx.fillStyle='#2b2540';cx.beginPath();cx.arc(0,-10,11,0,6.283);cx.fill();
      cx.save();cx.beginPath();cx.arc(0,-10,10,0,6.283);cx.clip();
      cx.strokeStyle='rgba(190,180,230,.45)';cx.lineWidth=.8;cx.beginPath();
      for(let i=-12;i<=12;i+=4){cx.moveTo(i-10,-22);cx.lineTo(i+10,2);cx.moveTo(i+10,-22);cx.lineTo(i-10,2);}
      cx.stroke();
      cx.fillStyle='rgba(255,255,255,.22)';cx.beginPath();cx.ellipse(-4,-15,4,2.5,-.6,0,6.283);cx.fill();
      cx.restore();
      cx.strokeStyle='#c9c2e6';cx.lineWidth=1.6;cx.beginPath();cx.arc(0,-10,11,0,6.283);cx.stroke();
      cx.strokeStyle='rgba(0,232,200,.6)';cx.lineWidth=1;cx.beginPath();cx.arc(0,-10,13.5,-2.6,-.55);cx.stroke();
      cx.restore();
      cx.globalAlpha=1;
      // バリア
      if(barrierT>0){
        const a=barrierT<2?(((clock*8)|0)%2?.25:.6):.6;
        cx.strokeStyle=`rgba(0,232,200,${a})`;cx.lineWidth=2;
        cx.beginPath();cx.arc(x,y-4,28+Math.sin(clock*6)*1.5,0,6.283);cx.stroke();
        cx.fillStyle=`rgba(0,232,200,${a*.12})`;cx.fill();
        cx.strokeStyle=`rgba(200,255,250,${a*.6})`;cx.lineWidth=1;cx.beginPath();cx.arc(x,y-4,28,clock*3,clock*3+1.2);cx.stroke();
      }
    }
    function drawBoss(){
      const b=boss;if(!b)return;
      const fade=b.dead?Math.max(0,1-b.dieT/1.6):1;if(fade<=0)return;
      const x=b.x,y=b.y,R=b.R*(b.dead?1+b.dieT*.4:1);
      cx.globalAlpha=fade;
      gl(glow.or,x,y,R*2.4,.55*fade);gl(glow.rd,x,y,R*1.6,.5*fade);
      cx.globalAlpha=fade;
      // 渦の腕
      cx.globalCompositeOperation='lighter';
      for(let arm=0;arm<5;arm++){
        const base=b.ang+arm*1.2566;
        cx.strokeStyle=arm%2?'rgba(255,120,30,.55)':'rgba(232,48,85,.55)';
        cx.lineWidth=R*.16;cx.lineCap='round';
        cx.beginPath();
        for(let s=0;s<=12;s++){const f=s/12,a=base+f*2.6,r=R*(.25+f*.85);const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.82;s?cx.lineTo(px,py):cx.moveTo(px,py);}
        cx.stroke();
      }
      cx.globalCompositeOperation='source-over';
      // 中心の暗い目
      cx.fillStyle=b.flash>0?'#fff':'#12040a';cx.beginPath();cx.arc(x,y,R*.42,0,6.283);cx.fill();
      cx.strokeStyle='#ff7a1e';cx.lineWidth=2;cx.stroke();
      const ey=y-R*.05;
      cx.fillStyle='#ffcc55';
      cx.beginPath();cx.moveTo(x-R*.3,ey-R*.08);cx.lineTo(x-R*.08,ey+R*.02);cx.lineTo(x-R*.28,ey+R*.08);cx.closePath();cx.fill();
      cx.beginPath();cx.moveTo(x+R*.3,ey-R*.08);cx.lineTo(x+R*.08,ey+R*.02);cx.lineTo(x+R*.28,ey+R*.08);cx.closePath();cx.fill();
      cx.strokeStyle='#ff4d4d';cx.lineWidth=2;cx.beginPath();
      for(let i=0;i<=6;i++){const px=x-R*.22+i*R*.073;const py=y+R*.2+(i%2?R*.06:0);i?cx.lineTo(px,py):cx.moveTo(px,py);}
      cx.stroke();
      // 周りを回る言葉
      cx.font=`${Math.round(R*.24)}px ${FONT}`;cx.textAlign='center';
      const words=['晒','叩','拡散','炎上','特定','謝罪'];
      for(let i=0;i<words.length;i++){
        const a=-b.ang*.6+i*1.047;cx.fillStyle=i%2?'#ffd0a0':'#ff8a8a';
        cx.fillText(words[i],x+Math.cos(a)*R*1.05,y+Math.sin(a)*R*.86);
      }
      cx.globalAlpha=1;
    }
    function drawParticles(){
      cx.globalCompositeOperation='lighter';
      for(const p of parts){
        if(p.life<=0)continue;
        cx.globalAlpha=Math.min(1,p.life/p.max*1.4);
        cx.fillStyle=p.col;cx.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);
      }
      for(const o of rings){
        if(o.t<=0)continue;
        const f=1-o.t/o.max;
        cx.globalAlpha=(1-f)*.8;cx.strokeStyle=o.col;cx.lineWidth=2.5*(1-f)+.5;
        cx.beginPath();cx.arc(o.x,o.y,o.r*(.2+f),0,6.283);cx.stroke();
      }
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
    }
    function drawPops(){
      cx.textAlign='center';
      for(const o of pops){
        if(o.t<=0)continue;
        cx.globalAlpha=Math.min(1,o.t*2.2);
        cx.font=`${o.big?14:12}px ${FONT}`;
        cx.fillStyle='rgba(5,4,14,.75)';cx.fillText(o.text,o.x+1,o.y+1);
        cx.fillStyle=o.col;cx.fillText(o.text,o.x,o.y);
      }
      cx.globalAlpha=1;
    }
    function shieldIcon(x,y,on){
      cx.beginPath();cx.moveTo(x,y-7);cx.lineTo(x+6,y-4.5);cx.lineTo(x+5,y+2);cx.lineTo(x,y+7);cx.lineTo(x-5,y+2);cx.lineTo(x-6,y-4.5);cx.closePath();
      if(on){cx.fillStyle='#00e8c8';cx.fill();cx.fillStyle='rgba(255,255,255,.5)';cx.fillRect(x-3,y-4,2,5);}
      else{cx.strokeStyle='rgba(232,48,85,.6)';cx.lineWidth=1;cx.stroke();}
    }
    function drawHud(){
      cx.textBaseline='middle';
      // こころの盾
      cx.fillStyle='rgba(5,4,14,.55)';rr(6,6,118,24,6);cx.fill();
      cx.font=`10px ${FONT}`;cx.textAlign='left';cx.fillStyle='#bbaedd';cx.fillText('こころ',11,18);
      for(let i=0;i<MAX_SHIELD;i++)shieldIcon(52+i*15,18,i<shield);
      // 効果中のパワーアップ
      let yy=40;
      const bars=[[spreadT,POW.spread],[barrierT,POW.barrier],[slowT,POW.slow]];
      for(const [v,p] of bars){
        if(v<=0)continue;
        cx.fillStyle='rgba(5,4,14,.55)';rr(6,yy-8,118,16,5);cx.fill();
        cx.fillStyle=p.col;cx.font=`10px ${FONT}`;cx.fillText(p.label,11,yy);
        cx.fillStyle='rgba(255,255,255,.12)';cx.fillRect(74,yy-2,44,4);
        cx.fillStyle=p.col;cx.fillRect(74,yy-2,44*Math.max(0,v/p.dur),4);
        yy+=19;
      }
      // スコア・コンボ
      cx.textAlign='right';
      cx.font=`15px ${FONT}`;cx.fillStyle='#deccf8';cx.fillText(String(score).padStart(6,'0'),W-10,18);
      if(combo>=2){
        const m=mult();
        const pul=comboT>2.3?1.15:1;
        cx.font=`${Math.round(13*pul)}px ${FONT}`;cx.fillStyle=m>=2.5?'#ff9a3c':m>=1.5?'#e8b830':'#00e8c8';
        cx.fillText(combo+' COMBO ×'+m.toFixed(1),W-10,37);
        cx.fillStyle='rgba(255,255,255,.15)';cx.fillRect(W-80,46,70,2);
        cx.fillStyle='#e8b830';cx.fillRect(W-80,46,70*Math.max(0,comboT/2.6),2);
      }
      // ボスHP
      if(boss&&(!boss.dead||boss.dieT<1)){
        const bw=Math.min(260,W-150),bx=(W-bw)/2,by=14;
        cx.textAlign='center';cx.font=`10px ${FONT}`;cx.fillStyle='#ff9a6a';cx.fillText('炎上の渦',W/2,by-1);
        cx.fillStyle='rgba(5,4,14,.7)';cx.fillRect(bx-1,by+6,bw+2,7);
        const f=Math.max(0,boss.hp/boss.max);
        cx.fillStyle=f<.4?'#ff3b3b':'#ff7a1e';cx.fillRect(bx,by+7,bw*f,5);
        cx.fillStyle='rgba(255,255,255,.35)';cx.fillRect(bx,by+7,bw*f,1);
      }
    }
    function drawBanner(){
      if(!banner)return;
      const b=banner,f=b.t/b.dur;
      const a=f<.12?f/.12:f>.8?(1-f)/.2:1;
      const slide=f<.12?(1-f/.12)*30:0;
      const y=H*.36;
      cx.globalAlpha=a*.85;
      cx.fillStyle='rgba(5,4,14,.75)';cx.fillRect(0,y-30,W,62);
      cx.fillStyle=b.col;cx.fillRect(0,y-30,W,1);cx.fillRect(0,y+31,W,1);
      if(b.main==='WARNING'){
        cx.globalAlpha=a*.35;cx.fillStyle='#e83055';
        for(let i=-2;i<W/14+2;i++){const sx=i*14+((clock*40)%14);cx.beginPath();cx.moveTo(sx,y-30);cx.lineTo(sx+7,y-30);cx.lineTo(sx+1,y-22);cx.lineTo(sx-6,y-22);cx.fill();cx.beginPath();cx.moveTo(sx,y+23);cx.lineTo(sx+7,y+23);cx.lineTo(sx+1,y+31);cx.lineTo(sx-6,y+31);cx.fill();}
      }
      cx.globalAlpha=a;cx.textAlign='center';
      cx.font=`22px ${FONT}`;cx.fillStyle=b.col;cx.fillText(b.main,W/2+slide,y-6);
      cx.font=`12px ${FONT}`;cx.fillStyle='#bbaedd';cx.fillText(b.sub,W/2-slide,y+16);
      cx.globalAlpha=1;
    }
    function drawIntro(){
      const f=-t; if(f<=0)return;
      const a=Math.min(1,f/.4);
      cx.globalAlpha=a;
      cx.fillStyle='rgba(5,4,14,.72)';cx.fillRect(0,0,W,H);
      const pw=Math.min(W-32,330),ph=212,px=(W-pw)/2,py=H*.42-ph/2;
      cx.fillStyle='rgba(10,7,22,.95)';rr(px,py,pw,ph,10);cx.fill();
      cx.strokeStyle='rgba(138,82,212,.7)';cx.lineWidth=1;cx.stroke();
      cx.textAlign='center';cx.font=`16px ${FONT}`;cx.fillStyle='#deccf8';
      cx.fillText('今夜も、コメント欄が荒れている',W/2,py+24);
      cx.textAlign='left';cx.font=`12px ${FONT}`;
      const lx=px+18;
      // 1
      cx.fillStyle='#00e8c8';cx.fillText('◆',lx,py+56);cx.fillStyle='#bbaedd';cx.fillText('ドラッグ／矢印で動く。声は自動で飛ぶ',lx+16,py+56);
      // 2 敵
      cx.fillStyle='rgba(58,10,28,.93)';rr(lx,py+74,26,16,7);cx.fill();cx.strokeStyle='#e83055';cx.stroke();
      cx.fillStyle='#bbaedd';cx.fillText('赤い悪意は撃ち落とせ',lx+34,py+82);
      cx.fillStyle='#8a7aa8';cx.font=`10px ${FONT}`;cx.fillText('下まで落とすと心に刺さる',lx+34,py+98);cx.font=`12px ${FONT}`;
      // 3 応援
      gl(glow.cy,lx+13,py+122,18,.5);cx.globalAlpha=a;
      cx.fillStyle='rgba(10,48,52,.9)';rr(lx,py+114,26,16,8);cx.fill();cx.strokeStyle='#a0fff0';cx.stroke();
      cx.fillStyle='#bbaedd';cx.fillText('光る応援は撃たずに受け止める',lx+34,py+122);
      cx.fillStyle='#8a7aa8';cx.font=`10px ${FONT}`;cx.fillText('拡＝拡散 護＝バリア 緩＝スロー ♥＝回復',lx+34,py+138);cx.font=`12px ${FONT}`;
      // 4 ボム
      cx.fillStyle='#e8b830';cx.fillText('◆',lx,py+162);cx.fillStyle='#bbaedd';cx.fillText('ピンチはモデレーター召喚（1回）',lx+16,py+162);
      cx.textAlign='center';cx.fillStyle='rgba(222,204,248,'+(.5+Math.sin(clock*5)*.3)+')';
      cx.fillText('タップで開始',W/2,py+ph-18);
      cx.globalAlpha=1;
    }
    function draw(){
      cx.setTransform(dpr,0,0,dpr,0,0);
      cx.textBaseline='middle';
      if(shake>0){cx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);}
      drawBg();
      drawBoss();
      cx.textBaseline='middle';
      for(const g of goods)drawGood(g);
      for(const e of enemies)drawEnemy(e);
      // 自弾
      cx.globalCompositeOperation='lighter';
      for(const b of pb){
        gl(b.gold?glow.gd:glow.cy,b.x,b.y,10,.7);
        cx.globalAlpha=1;cx.fillStyle=b.gold?'#ffe9a8':'#d8fff8';cx.fillRect(b.x-1.5,b.y-7,3,12);
      }
      cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      cx.font=`11px ${FONT}`;cx.textAlign='center';
      for(const b of eb)drawEB(b);
      drawPlayer();
      drawParticles();
      drawPops();
      // スロー中の色
      if(slowT>0){cx.fillStyle=`rgba(90,80,220,${Math.min(.14,slowT*.1)})`;cx.fillRect(-20,-20,W+40,H+40);}
      cx.drawImage(lyVig,0,0,W,H);
      if(hurtFlash>0){cx.fillStyle=`rgba(232,48,85,${hurtFlash*.45})`;cx.fillRect(-20,-20,W+40,H+40);}
      if(whiteFlash>0){cx.fillStyle=`rgba(220,255,250,${whiteFlash*.6})`;cx.fillRect(-20,-20,W+40,H+40);}
      if(bombT>0){ // モデレーターの光の帯
        const f=1-bombT/1.4;
        cx.globalCompositeOperation='lighter';cx.globalAlpha=(1-f)*.5;
        const yb=H*(1-f*1.3);
        cx.drawImage(glow.cy,-W*.2,yb-60,W*1.4,120);
        cx.globalCompositeOperation='source-over';cx.globalAlpha=1;
      }
      cx.setTransform(dpr,0,0,dpr,0,0);
      drawHud();
      drawBanner();
      if(dying>0){cx.fillStyle=`rgba(5,4,14,${Math.min(.6,(1.3-dying)*.6)})`;cx.fillRect(0,0,W,H);
        cx.globalAlpha=Math.min(1,(1.3-dying)*2);cx.textAlign='center';cx.font=`18px ${FONT}`;cx.fillStyle='#ff7a90';cx.fillText('……心が、もたない',W/2,H*.45);cx.globalAlpha=1;}
      drawIntro();
    }
    function hud(){
      const html=`SCORE <span style="color:var(--tx-b)">${score}</span>　撃退 ${kills}　🛡${Math.max(0,shield)}/${MAX_SHIELD}`;
      if(html!==lastScoreHtml){lastScoreHtml=html;mg.setScore(html);}
      const tm=t<0?'READY':boss&&!boss.dead?'渦 '+Math.max(0,Math.ceil(T_END-t)):String(Math.max(0,Math.ceil(T_END-t)));
      if(tm!==lastTimer){lastTimer=tm;mg.setTimer(tm);}
    }

    return {result(reason){
      window.removeEventListener('resize',onResize);
      const clear=reason==='clear', down=reason==='down';
      const flameDown=clear?Math.min(5,2+Math.floor(kills/20))+(bossBeaten?1:0):Math.floor(kills/25);
      const fx={
        flame:-Math.min(gs.flame,flameDown),
        mental:clear?2+Math.max(0,shield)+(bossBeaten?1:0):down?-6:0,
        followers:clear?Math.min(10,Math.floor(kills/10))+Math.min(6,caught)+(bossBeaten?3:0):0,
        fatigue:down?8:6,
      };
      if(friendlyFire>=3)fx.followers=(fx.followers||0)-friendlyFire;
      if(clear&&bossBeaten)fx.hope=1;
      const title=clear?(bossBeaten?'🔥 炎上の渦を鎮めた':'🔥 炎上を耐えきった'):down?'💔 心が削られた':'🔥 撃退を中断した';
      return {
        title,
        summary:`スコア <span class="up">${score}</span>　撃退 <span class="up">${kills}</span>　最大コンボ <span class="up">${maxCombo}</span>`+
          `<br>受け止めた応援 <span class="up">${caught}</span>`+(friendlyFire?`　誤射 <span class="down">${friendlyFire}</span>`:'')+
          (clear?(bossBeaten?'<br>「炎上の渦」を撃破した。':'<br>渦は消えきらなかったが、朝まで耐えた。'):''),
        fx, time:40, sp:clear?1:0,
        log:clear?(bossBeaten?'炎上の渦を鎮めた。届いた応援の声が、まだ耳に残っている。':'炎上コメントを撃退した。少し静かな夜になった。'):'荒れたコメント欄と向き合った。',
        cutin:clear?(bossBeaten?['win','……燃えてたのは画面の中だけや。ちゃんと届く声だけ拾うわ。']:['happy','……もう大丈夫。ちゃんと届く声だけ拾うわ。']):down?['tired','……今夜はもう、コメント欄見られへん。']:null,
      };
    }};
  },
});
