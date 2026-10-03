// ══════════════════════════════════════════════════════════
// シューティング「炎上コメント撃退」
// 落ちてくる悪意のコメントを撃ち落とし、応援コメントは撃たずに受け止める。
// ══════════════════════════════════════════════════════════
registerMinigame({
  id:'shooter', icon:'🔥', name:'炎上コメント撃退', genre:'シューティング', bgm:'stream',
  desc:'降ってくる悪意のコメントを撃ち落とす。応援コメントは撃たずに受け止めよう。',
  effect:'炎上↓ 精神↑ フォロワー↑ ／ 疲労+6 約40分',
  help:'ドラッグ／←→で移動・自動で発射',
  start(body,mg){
    const DURATION=40, MAX_SHIELD=5;
    const BAD=['炎上','つまらん','辞めろ','晒し','#炎上中','低評価','誰得','オワコン','切り抜くわ','荒らし'];
    const GOOD=['がんばれ','好き','おつ','応援してる','ありがとう','声いいね','また来た'];

    const cv=document.createElement('canvas');
    cv.className='mg-canvas';
    body.appendChild(cv);
    const cx=cv.getContext('2d');
    const dpr=window.devicePixelRatio||1;
    let W=0,H=0;
    const resize=()=>{
      const r=body.getBoundingClientRect();
      W=Math.max(200,r.width);H=Math.max(300,r.height);
      cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px';
      cx.setTransform(dpr,0,0,dpr,0,0);
    };
    resize();

    const player={x:W/2,y:H-46,tx:W/2,vx:0};
    let bullets=[],enemies=[],sparks=[];
    let shield=MAX_SHIELD,kills=0,caught=0,friendlyFire=0,elapsed=0,fireCd=0,spawnCd=.6;

    // 入力
    const setTarget=e=>{const r=cv.getBoundingClientRect();player.tx=e.clientX-r.left;};
    cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);setTarget(e);});
    cv.addEventListener('pointermove',e=>{if(e.buttons||e.pointerType==='touch')setTarget(e);});
    const keys={};
    mg.onKey(e=>{
      const k=e.key;
      if(['ArrowLeft','ArrowRight','a','d','A','D'].includes(k)){e.preventDefault();keys[k.toLowerCase()]=e.type==='keydown';}
    });

    const font=px=>`${px}px "DotGothic16", monospace`;
    function spawn(){
      const good=Math.random()<.22;
      const text=good?GOOD[Math.floor(Math.random()*GOOD.length)]:BAD[Math.floor(Math.random()*BAD.length)];
      cx.font=font(13);
      const w=cx.measureText(text).width+16;
      const speed=(good?55:60)+elapsed*2.2+Math.random()*30;
      const hp=good?1:(text.length>=4&&Math.random()<.5?2:1)+(elapsed>25&&Math.random()<.3?1:0);
      enemies.push({x:8+Math.random()*(W-w-16),y:-24,w,h:24,text,good,hp,maxHp:hp,vy:speed,wob:Math.random()*6});
    }
    function burst(x,y,col){for(let i=0;i<8;i++)sparks.push({x,y,vx:(Math.random()-.5)*160,vy:(Math.random()-.5)*160,life:.4,col});}

    mg.loop(dt=>{
      elapsed+=dt;
      // 移動
      if(keys.arrowleft||keys.a)player.tx=player.x-260*dt*3;
      if(keys.arrowright||keys.d)player.tx=player.x+260*dt*3;
      player.tx=Math.max(18,Math.min(W-18,player.tx));
      player.x+=(player.tx-player.x)*Math.min(1,dt*14);
      // 発射
      fireCd-=dt;
      if(fireCd<=0){fireCd=.2;bullets.push({x:player.x,y:player.y-16});}
      bullets.forEach(b=>b.y-=420*dt);
      bullets=bullets.filter(b=>b.y>-10);
      // 出現（だんだん激しく）
      spawnCd-=dt;
      if(spawnCd<=0){spawn();spawnCd=Math.max(.32,.95-elapsed*.016)*(.7+Math.random()*.6);}
      // コメント移動・当たり判定
      enemies.forEach(en=>{
        en.y+=en.vy*dt;en.wob+=dt*3;
        bullets.forEach(b=>{
          if(b.dead||en.dead)return;
          if(b.x>en.x&&b.x<en.x+en.w&&b.y>en.y&&b.y<en.y+en.h){
            b.dead=true;en.hp--;
            if(en.hp<=0){
              en.dead=true;
              if(en.good){friendlyFire++;shield=Math.max(0,shield-1);burst(en.x+en.w/2,en.y,'#e83055');}
              else{kills++;burst(en.x+en.w/2,en.y+12,'#e8b830');}
            }
          }
        });
        // プレイヤーに触れた
        if(!en.dead&&en.y+en.h>player.y-12&&en.y<player.y+12&&player.x>en.x-12&&player.x<en.x+en.w+12){
          en.dead=true;
          if(en.good){caught++;shield=Math.min(MAX_SHIELD,shield+1);burst(player.x,player.y,'#00e8c8');}
          else{shield--;burst(player.x,player.y,'#e83055');}
        }
        // 画面下まで落ちた悪意コメントは心に刺さる
        if(!en.dead&&en.y>H){en.dead=true;if(!en.good)shield--;}
      });
      bullets=bullets.filter(b=>!b.dead);
      enemies=enemies.filter(en=>!en.dead);
      sparks.forEach(s=>{s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;});
      sparks=sparks.filter(s=>s.life>0);

      draw();
      mg.setScore(`撃退 ${kills}　🛡${'■'.repeat(Math.max(0,shield))}${'□'.repeat(MAX_SHIELD-Math.max(0,shield))}`);
      mg.setTimer(Math.max(0,Math.ceil(DURATION-elapsed)));
      if(shield<=0)mg.end('down');
      else if(elapsed>=DURATION)mg.end('clear');
    });

    function draw(){
      cx.clearRect(0,0,W,H);
      // 背景の走査線
      cx.fillStyle='rgba(138,82,212,.06)';
      for(let y=(elapsed*40)%24;y<H;y+=24)cx.fillRect(0,y,W,1);
      cx.textBaseline='middle';cx.font=font(13);
      enemies.forEach(en=>{
        const x=en.x+Math.sin(en.wob)*2;
        cx.fillStyle=en.good?'rgba(0,232,200,.14)':'rgba(232,48,85,.16)';
        cx.strokeStyle=en.good?'#00e8c8':(en.hp<en.maxHp?'#e8b830':'#e83055');
        cx.lineWidth=1;
        cx.fillRect(x,en.y,en.w,en.h);cx.strokeRect(x+.5,en.y+.5,en.w-1,en.h-1);
        cx.fillStyle=en.good?'#bff8ee':'#ffd0d8';
        cx.fillText(en.text,x+8,en.y+en.h/2+1);
      });
      cx.fillStyle='#e8b830';
      bullets.forEach(b=>cx.fillRect(b.x-1.5,b.y-6,3,10));
      sparks.forEach(s=>{cx.globalAlpha=Math.max(0,s.life/.4);cx.fillStyle=s.col;cx.fillRect(s.x-2,s.y-2,4,4);});
      cx.globalAlpha=1;
      // プレイヤー（マイク）
      cx.font=font(26);cx.textAlign='center';
      cx.fillText('🎙',player.x,player.y);
      cx.textAlign='left';
    }

    return {result(reason){
      const clear=reason==='clear', down=reason==='down';
      const flameDown=clear?Math.min(5,2+Math.floor(kills/15)):Math.floor(kills/20);
      const fx={
        flame:-Math.min(gs.flame,flameDown),
        mental:clear?2+Math.max(0,shield):down?-6:0,
        followers:clear?Math.floor(kills/8)+caught:0,
        fatigue:down?8:6,
      };
      if(friendlyFire>=3)fx.followers=(fx.followers||0)-friendlyFire;
      return {
        title:clear?'🔥 炎上を鎮めた':down?'💔 心が削られた':'🔥 撃退を中断した',
        summary:`撃退 <span class="up">${kills}</span>　受け止めた応援 <span class="up">${caught}</span>`+
          (friendlyFire?`<br>誤射 <span class="down">${friendlyFire}</span>`:''),
        fx, time:40, sp:clear?1:0,
        log:clear?'炎上コメントを撃退した。少し静かな夜になった。':'荒れたコメント欄と向き合った。',
        cutin:clear?['win','……もう大丈夫。ちゃんと届く声だけ拾うわ。']:null,
      };
    }};
  },
});
