// ══════════════════════════════════════════════════════════
// ローグライク「深夜の工場巡回」
// 毎回自動生成される3フロアの工場を探索する。ターン制。
// ⚠異常箇所を点検し、👻怪異をかわして（または懐中電灯で追い払って）🚪出口へ。
// ══════════════════════════════════════════════════════════
registerMinigame({
  id:'rogue', icon:'🔦', name:'深夜の工場巡回', genre:'ローグライク', bgm:'kaidan',
  desc:'毎回形が変わる夜の工場を3フロア巡回。異常箇所を点検し、怪異をかわして出口へ。',
  effect:'仕事評価↑ 資格知識↑ 収入↑ 怪談ネタ ／ 疲労+10 約90分',
  help:'十字ボタン／矢印キーで移動・体当たりで追い払う',
  start(body,mg){
    const W=9,H=11,FLOORS=3,MAX_HP=5;
    const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
    let floor=1,hp=MAX_HP,inspected=0,memos=0,banished=0,met=0,busy=false;
    let map,seen,player,enemies,items,exit;

    body.innerHTML=`
      <div class="rg-hud"><span id="rg-floor"></span><span id="rg-hp"></span></div>
      <div class="rg-grid" id="rg-grid"></div>
      <div class="rg-log" id="rg-log">懐中電灯を点けた。巡回を始める。</div>
      <div class="rg-pad">
        <button data-d="0" class="rg-up">▲</button>
        <button data-d="3" class="rg-left">◀</button>
        <button data-d="2" class="rg-down">▼</button>
        <button data-d="1" class="rg-right">▶</button>
      </div>`;
    const grid=body.querySelector('#rg-grid');
    const logEl=body.querySelector('#rg-log');
    body.querySelectorAll('.rg-pad button').forEach(b=>b.addEventListener('click',()=>step(+b.dataset.d)));
    const KEYMAP={ArrowUp:0,w:0,ArrowRight:1,d:1,ArrowDown:2,s:2,ArrowLeft:3,a:3};
    mg.onKey(e=>{
      if(e.type!=='keydown')return;
      const d=KEYMAP[e.key.length===1?e.key.toLowerCase():e.key];
      if(d!==undefined){e.preventDefault();step(d);}
    });

    const rnd=n=>Math.floor(Math.random()*n);
    const key=(x,y)=>x+','+y;
    const inside=(x,y)=>x>0&&y>0&&x<W-1&&y<H-1;
    const isFloor=(x,y)=>inside(x,y)&&map[y][x]===1;
    const enemyAt=(x,y)=>enemies.find(e=>e.x===x&&e.y===y);
    const say=t=>{logEl.textContent=t;};

    // ── フロア生成：ランダムウォークで掘り、最も遠い床を出口にする ──
    function genFloor(){
      map=Array.from({length:H},()=>Array(W).fill(0));
      seen=Array.from({length:H},()=>Array(W).fill(false));
      let x=Math.floor(W/2),y=H-2,carved=0;
      const target=Math.floor((W-2)*(H-2)*.5);
      map[y][x]=1;carved=1;
      while(carved<target){
        const [dx,dy]=DIRS[rnd(4)];
        if(inside(x+dx,y+dy)){x+=dx;y+=dy;if(!map[y][x]){map[y][x]=1;carved++;}}
      }
      player={x:Math.floor(W/2),y:H-2};
      // BFSで距離を求める
      const dist={};const q=[[player.x,player.y]];dist[key(player.x,player.y)]=0;
      const cells=[];
      while(q.length){
        const [cx,cy]=q.shift();cells.push([cx,cy]);
        DIRS.forEach(([dx,dy])=>{const nx=cx+dx,ny=cy+dy,k=key(nx,ny);if(isFloor(nx,ny)&&dist[k]===undefined){dist[k]=dist[key(cx,cy)]+1;q.push([nx,ny]);}});
      }
      cells.sort((a,b)=>dist[key(b[0],b[1])]-dist[key(a[0],a[1])]);
      exit={x:cells[0][0],y:cells[0][1]};
      const used=new Set([key(player.x,player.y),key(exit.x,exit.y)]);
      const take=minDist=>{
        const pool=cells.filter(([cx,cy])=>!used.has(key(cx,cy))&&dist[key(cx,cy)]>=minDist);
        if(!pool.length)return null;
        const [cx,cy]=pool[rnd(pool.length)];used.add(key(cx,cy));return {x:cx,y:cy};
      };
      items=[];
      const put=(type,n,minD)=>{for(let i=0;i<n;i++){const p=take(minD);if(p)items.push({...p,type});}};
      put('fault',2+(floor>1?1:0),2);
      put('battery',1,2);
      if(Math.random()<.7)put('memo',1,2);
      enemies=[];
      for(let i=0;i<floor+1;i++){const p=take(4);if(p)enemies.push({...p,hp:floor>=3&&i===0?2:1});}
      reveal();
    }

    function reveal(){
      for(let y=0;y<H;y++)for(let x=0;x<W;x++)
        if(Math.max(Math.abs(x-player.x),Math.abs(y-player.y))<=2)seen[y][x]=true;
    }
    const visible=(x,y)=>Math.max(Math.abs(x-player.x),Math.abs(y-player.y))<=2;

    function render(){
      body.querySelector('#rg-floor').textContent=`B${floor}F / ${FLOORS}　点検 ${inspected}`;
      body.querySelector('#rg-hp').textContent='🔋'.repeat(Math.max(0,hp))+'·'.repeat(MAX_HP-Math.max(0,hp));
      let html='';
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){
        let cls='rg-c',ch='';
        if(!seen[y][x])cls+=' dark';
        else{
          cls+=map[y][x]?' fl':' wall';
          if(!visible(x,y))cls+=' mem';
          if(player.x===x&&player.y===y)ch='🧑‍🔧';
          else if(visible(x,y)&&enemyAt(x,y))ch='👻';
          else if(exit.x===x&&exit.y===y)ch='🚪';
          else{const it=items.find(i=>i.x===x&&i.y===y);if(it)ch={fault:'⚠️',battery:'🔋',memo:'📄'}[it.type];}
        }
        html+=`<div class="${cls}">${ch}</div>`;
      }
      grid.innerHTML=html;
      mg.setScore(`点検 ${inspected}　追い払い ${banished}`);
    }

    function step(d){
      if(busy||mg._ended)return;
      const [dx,dy]=DIRS[d];
      const nx=player.x+dx,ny=player.y+dy;
      const en=enemyAt(nx,ny);
      if(en){
        en.hp--;AU.se('tool');
        if(en.hp<=0){enemies=enemies.filter(e=>e!==en);banished++;say('👻 光を当てると、影は霧のように消えた。');}
        else say('👻 光にひるんだが、まだそこにいる……');
      }else if(isFloor(nx,ny)){
        player.x=nx;player.y=ny;
        const it=items.find(i=>i.x===nx&&i.y===ny);
        if(it){
          items=items.filter(i=>i!==it);
          if(it.type==='fault'){inspected++;AU.se('repair');say('⚠️ 異常箇所を点検した。ボルトの緩みを締め直した。');}
          if(it.type==='battery'){hp=Math.min(MAX_HP,hp+2);say('🔋 予備バッテリーを見つけた。明かりが強くなった。');}
          if(it.type==='memo'){memos++;say('📄 先輩の点検メモだ。「この配管、夜になると鳴る」');}
        }
        if(nx===exit.x&&ny===exit.y){
          if(floor>=FLOORS){render();mg.end('clear');return;}
          floor++;say(`🚪 階段を下りた。B${floor}F。空気が冷たい。`);
          genFloor();render();return;
        }
      }else return; // 壁
      enemyTurn();
      reveal();render();
      if(hp<=0){busy=true;say('……懐中電灯が消えた。');setTimeout(()=>mg.end('down'),700);}
    }

    function enemyTurn(){
      enemies.forEach(en=>{
        const dist=Math.abs(en.x-player.x)+Math.abs(en.y-player.y);
        if(dist===1){
          hp--;met++;AU.se('warn');
          say('👻 背後で何かが囁いた。バッテリーが減っていく……');
          return;
        }
        let opts=DIRS.map(([dx,dy])=>({x:en.x+dx,y:en.y+dy})).filter(p=>isFloor(p.x,p.y)&&!enemyAt(p.x,p.y)&&!(p.x===player.x&&p.y===player.y));
        if(!opts.length)return;
        if(dist<=4){
          opts.sort((a,b)=>(Math.abs(a.x-player.x)+Math.abs(a.y-player.y))-(Math.abs(b.x-player.x)+Math.abs(b.y-player.y)));
          if(Math.random()<.7){en.x=opts[0].x;en.y=opts[0].y;return;}
        }
        if(Math.random()<.5){const p=opts[rnd(opts.length)];en.x=p.x;en.y=p.y;}
      });
    }

    genFloor();render();
    return {result(reason){
      const clear=reason==='clear', down=reason==='down';
      const fx={
        jobRep:inspected*3+(clear?5:0),
        certKnow:memos*4+(clear?2:0),
        money:inspected*1500+(clear?3000:0),
        mental:clear?4:down?-8:0,
        fatigue:10,
      };
      const gotNeta=met+banished>=2;
      return {
        title:clear?'🔦 巡回完了':down?'🌑 闇に飲まれた':'🔦 巡回を切り上げた',
        summary:`到達 <span class="up">B${floor}F</span>　点検 <span class="up">${inspected}</span>　追い払い <span class="up">${banished}</span>`+
          (gotNeta?'<br>📝 怪談ネタを手に入れた':''),
        fx, time:90, sp:clear?2:inspected>0?1:0,
        after(){if(gotNeta){gs.factoryNetaAvail=true;gs.factoryNetaType='深夜巡回の怪異';}},
        log:clear?'深夜の工場を最後まで巡回した。':'深夜の工場を巡回した。何かがいた気がする。',
        cutin:down?['fear','……今の、なに？']:null,
      };
    }};
  },
});
