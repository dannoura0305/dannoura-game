// ══════════════════════════════════════════════════════════
// パズル「配線復旧パズル」
// タイルをタップして回転させ、⚡電源からすべての配線に電気を通す。
// 盤面はランダムな全域木から作るので、必ず解ける。制限時間内に何面解けるか。
// ══════════════════════════════════════════════════════════
addMinigameStyle('puzzle',`
.mg-puzzle{padding:10px;gap:10px;justify-content:center;}
.pz-hud,.pz-msg{font-family:var(--mono);font-size:.7rem;color:var(--cy);text-align:center;}
.pz-msg{color:var(--tx-b);font-family:var(--serif);}
.pz-grid{display:grid;gap:3px;width:min(100%,calc(100vh - 230px),420px);}
.pz-tile{aspect-ratio:1;padding:0;background:#0d0a1c;border:1px solid rgba(138,82,212,.25);border-radius:3px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
.pz-tile.on{border-color:rgba(0,232,200,.35);background:rgba(0,232,200,.05);}
.pz-tile svg{width:100%;height:100%;display:block;}
`);

registerMinigame({
  id:'puzzle', icon:'⚡', name:'配線復旧パズル', genre:'パズル', bgm:'factory',
  desc:'停電したラインの配線をつなぎ直す。タイルを回して、全部のランプを点けよう。',
  effect:'資格知識↑ 仕事評価↑ 収入↑ ／ 疲労+6 約60分',
  help:'タイルをタップで回転',
  start(body,mg){
    const TIME=90, SIZES=[4,5,6];
    const N=1,E=2,S=4,Wd=8, DIR=[[0,-1,N,S],[1,0,E,Wd],[0,1,S,N],[-1,0,Wd,E]];
    const rot=m=>((m<<1)|(m>>3))&15;
    let level=0,solved=0,left=TIME,n,cells,src,lock=false;

    body.innerHTML=`<div class="pz-hud" id="pz-hud"></div><div class="pz-grid" id="pz-grid"></div><div class="pz-msg" id="pz-msg"></div>`;
    const gridEl=body.querySelector('#pz-grid');

    function genBoard(size){
      n=size;
      cells=Array.from({length:n*n},()=>({m:0}));
      src=Math.floor(n/2)*n+Math.floor(n/2);
      // ランダムDFSで全域木を作る
      const seen=new Set([src]),stack=[src];
      while(stack.length){
        const c=stack[stack.length-1],x=c%n,y=Math.floor(c/n);
        const nb=DIR.map(([dx,dy,a,b])=>({x:x+dx,y:y+dy,a,b})).filter(p=>p.x>=0&&p.y>=0&&p.x<n&&p.y<n&&!seen.has(p.y*n+p.x));
        if(!nb.length){stack.pop();continue;}
        const p=nb[Math.floor(Math.random()*nb.length)],ni=p.y*n+p.x;
        cells[c].m|=p.a;cells[ni].m|=p.b;seen.add(ni);stack.push(ni);
      }
      // ばらばらに回す（解けた状態のままにはしない）
      do{cells.forEach(c=>{const r=Math.floor(Math.random()*4);for(let i=0;i<r;i++)c.m=rot(c.m);});}while(powered().size===n*n);
      body.querySelector('#pz-msg').textContent=`第${level+1}面：${n}×${n} 配線盤`;
      render();
    }

    function powered(){
      const on=new Set([src]),q=[src];
      while(q.length){
        const c=q.shift(),x=c%n,y=Math.floor(c/n);
        DIR.forEach(([dx,dy,a,b])=>{
          const nx=x+dx,ny=y+dy,ni=ny*n+nx;
          if(nx<0||ny<0||nx>=n||ny>=n||on.has(ni))return;
          if((cells[c].m&a)&&(cells[ni].m&b)){on.add(ni);q.push(ni);}
        });
      }
      return on;
    }

    function tileSvg(m,on,isSrc,isLamp){
      const col=on?'#00e8c8':'#4a3a68';
      const seg=[[N,'50,50 50,0'],[E,'50,50 100,50'],[S,'50,50 50,100'],[Wd,'50,50 0,50']]
        .filter(([b])=>m&b).map(([,p])=>`<polyline points="${p}" stroke="${col}" stroke-width="14" stroke-linecap="round"/>`).join('');
      const hub=isSrc?`<circle cx="50" cy="50" r="22" fill="#e8b830"/><text x="50" y="62" font-size="34" text-anchor="middle">⚡</text>`
        :isLamp?`<circle cx="50" cy="50" r="18" fill="${on?'#e8b830':'#2a2040'}" stroke="${col}" stroke-width="5"/>`
        :`<circle cx="50" cy="50" r="8" fill="${col}"/>`;
      return `<svg viewBox="0 0 100 100">${seg}${hub}</svg>`;
    }

    function render(){
      const on=powered();
      gridEl.style.gridTemplateColumns=`repeat(${n},1fr)`;
      gridEl.innerHTML='';
      cells.forEach((c,i)=>{
        const deg=[N,E,S,Wd].filter(b=>c.m&b).length;
        const t=document.createElement('button');
        t.className='pz-tile'+(on.has(i)?' on':'');
        t.innerHTML=tileSvg(c.m,on.has(i),i===src,deg===1&&i!==src);
        t.addEventListener('click',()=>turn(i));
        gridEl.appendChild(t);
      });
      const lamps=cells.filter((c,i)=>i!==src&&[N,E,S,Wd].filter(b=>c.m&b).length===1);
      const lit=lamps.filter(c=>on.has(cells.indexOf(c))).length;
      body.querySelector('#pz-hud').textContent=`💡 ${lit}/${lamps.length}　通電 ${on.size}/${n*n}`;
      mg.setScore(`復旧 ${solved}面`);
      return on;
    }

    function turn(i){
      if(lock||mg._ended)return;
      cells[i].m=rot(cells[i].m);AU.se('tool');
      const on=render();
      if(on.size===n*n){
        solved++;lock=true;AU.se('repair');
        body.querySelector('#pz-msg').textContent='✅ 復旧！ ラインが動き出した。';
        setTimeout(()=>{
          lock=false;
          if(solved>=SIZES.length){mg.end('clear');return;}
          level++;genBoard(SIZES[level]);
        },700);
      }
    }

    mg.setTimer(left);
    mg.every(()=>{left--;mg.setTimer(Math.max(0,left));if(left<=0)mg.end('timeup');},1000);
    genBoard(SIZES[0]);

    return {result(reason){
      const all=solved>=SIZES.length;
      const fx={
        certKnow:solved*4+(all?3:0),
        jobRep:solved*3,
        money:solved*1500+(all?2000:0),
        mental:all?5:solved>=1?1:-3,
        fatigue:6,
      };
      return {
        title:all?'⚡ 全ライン復旧！':solved?'⚡ 一部を復旧':'⚡ 復旧できなかった',
        summary:`復旧した盤面 <span class="${solved?'up':'down'}">${solved}/${SIZES.length}</span>`+(all?`<br>残り時間 <span class="up">${left}秒</span>`:''),
        fx, time:60, sp:solved,
        log:all?'停電したラインを全部つなぎ直した。':'配線の復旧作業をした。',
        cutin:all?['happy','……配線は嘘をつかないのよね。']:null,
      };
    }};
  },
});
