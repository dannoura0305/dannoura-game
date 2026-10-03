// ══════════════════════════════════════════════════════════
// カードバトル「配信トークバトル」
// 話題カードで「過疎の夜」の静けさ（HP）を削り、8ターン以内に配信を盛り上げる。
// 敵の次の行動は事前に表示される。スキルが高いほどデッキが強くなる。
// ══════════════════════════════════════════════════════════
registerMinigame({
  id:'cards', icon:'🃏', name:'配信トークバトル', genre:'カードバトル', bgm:'stream',
  desc:'話題カードで「過疎の夜」に挑む。スキルが高いほどデッキが強くなる。',
  effect:'フォロワー↑ 配信人気↑ 収入↑ ／ 疲労+8 約80分',
  help:'カードをタップで使用',
  start(body,mg){
    const TURNS=8, HAND=5, ENERGY=3;
    const sk=gs.skills;
    // 盛り上がり＝敵へのダメージ、ガード＝被ダメージ軽減
    const CARD={
      chat:   {name:'雑談',        cost:1,icon:'💬',dmg:6+sk.chatSkill*2,  txt:d=>`盛り上がり${d.dmg}`},
      factory:{name:'工場トーク',  cost:1,icon:'🔧',dmg:5+sk.plc,draw:1,   txt:d=>`盛り上がり${d.dmg}・1枚引く`},
      kaidan: {name:'怪談',        cost:2,icon:'👻',dmg:14+sk.kaidanSkill*3,txt:d=>`盛り上がり${d.dmg}`},
      song:   {name:'歌',          cost:2,icon:'🎤',dmg:9+Math.floor(sk.singSkill*2),heal:4,txt:d=>`盛り上がり${d.dmg}・回復${d.heal}`},
      honne:  {name:'本音トーク',  cost:1,icon:'🌙',dmg:10+sk.radioVibe*2,self:3,txt:d=>`盛り上がり${d.dmg}・自分に${d.self}`},
      thanks: {name:'ギフトのお礼',cost:1,icon:'🎁',block:6+sk.emoCtrl*2,  txt:d=>`ガード${d.block}`},
      mod:    {name:'モデレーター',cost:1,icon:'🛡',block:10,             txt:d=>`ガード${d.block}`},
      breath: {name:'深呼吸',      cost:0,icon:'☕',heal:3+sk.stressRes,  txt:d=>`回復${d.heal}`},
      regular:{name:'常連の応援',  cost:1,icon:'📣',draw:2,energy:1,       txt:()=>'2枚引く・⚡+1'},
      burn:   {name:'炎上の火種',  cost:1,icon:'🔥',burn:true,             txt:()=>'使うと消える。残すと心-2'},
    };
    let deck=['chat','chat','chat','factory','kaidan','song','honne','thanks','thanks','breath','regular'];
    if(sk.kaidanSkill>=1)deck.push('kaidan');
    if(sk.singSkill>=3)deck.push('song');
    if(gs.listeners.some(l=>l.type==='mod'))deck.push('mod');
    if(gs.streamPop>=40)deck.push('regular');

    // 日が進むほど手強くなる（スキル成長で釣り合う）
    const ENEMY_MAX=60+Math.floor(gs.day*1.5);
    const enemy={hp:ENEMY_MAX,block:0,intent:null};
    const me={hp:30,max:30,block:0,energy:ENERGY};
    let turn=1,draw=shuffle([...deck]),discard=[],hand=[],busy=false;

    function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    function drawCards(k){
      for(let i=0;i<k;i++){
        if(!draw.length){if(!discard.length)return;draw=shuffle(discard);discard=[];}
        hand.push(draw.pop());
      }
    }
    const INTENTS=[
      {icon:'🗯',txt:'荒らしコメント',run(){hit(7);}},
      {icon:'🚶',txt:'離脱の波 4×2',run(){hit(4);hit(4);}},
      {icon:'😶',txt:'シラけ（ガード10）',run(){enemy.block+=10;}},
      {icon:'🔥',txt:'炎上の火種を混ぜる',run(){discard.push('burn','burn');}},
    ];
    function pickIntent(){
      const w=turn>=5?[3,2,1,2]:[3,2,2,1];
      let r=Math.random()*w.reduce((a,b)=>a+b),i=0;
      while((r-=w[i])>0)i++;
      enemy.intent=INTENTS[i];
    }
    function hit(d){const b=Math.min(me.block,d);me.block-=b;me.hp-=d-b;}

    body.innerHTML=`
      <div class="cb-enemy">
        <div class="cb-name">🌑 過疎の夜</div>
        <div class="cb-bar"><div id="cb-ehp"></div></div>
        <div class="cb-row"><span id="cb-etxt"></span><span id="cb-intent"></span></div>
      </div>
      <div class="cb-log" id="cb-log">配信開始。コメント欄はまだ静かだ。</div>
      <div class="cb-me">
        <div class="cb-row"><span>🎙 だんのうら</span><span id="cb-mtxt"></span></div>
        <div class="cb-bar me"><div id="cb-mhp"></div></div>
        <div class="cb-row"><span id="cb-energy"></span><span id="cb-pile"></span></div>
      </div>
      <div class="cb-hand" id="cb-hand"></div>
      <button class="cb-endturn" id="cb-endturn">ターン終了 ▶</button>`;
    const $=id=>body.querySelector('#'+id);
    const say=t=>{$('cb-log').textContent=t;};
    $('cb-endturn').addEventListener('click',endTurn);

    function render(){
      $('cb-ehp').style.width=Math.max(0,enemy.hp/ENEMY_MAX*100)+'%';
      $('cb-etxt').textContent=`静けさ ${Math.max(0,enemy.hp)}/${ENEMY_MAX}`+(enemy.block?`　🛡${enemy.block}`:'');
      $('cb-intent').textContent=`次：${enemy.intent.icon} ${enemy.intent.txt}`;
      $('cb-mhp').style.width=Math.max(0,me.hp/me.max*100)+'%';
      $('cb-mtxt').textContent=`心 ${Math.max(0,me.hp)}/${me.max}`+(me.block?`　🛡${me.block}`:'');
      $('cb-energy').textContent='⚡'.repeat(me.energy)+'·'.repeat(Math.max(0,ENERGY-me.energy));
      $('cb-pile').textContent=`山札${draw.length} 捨て札${discard.length}`;
      const h=$('cb-hand');h.innerHTML='';
      hand.forEach((id,i)=>{
        const c=CARD[id];
        const b=document.createElement('button');
        b.className='cb-card'+(c.burn?' burn':'')+(c.cost>me.energy?' off':'');
        b.innerHTML=`<span class="cb-cost">${c.cost}</span><span class="cb-icon">${c.icon}</span><span class="cb-cname">${c.name}</span><span class="cb-ctxt">${c.txt(c)}</span>`;
        b.addEventListener('click',()=>play(i));
        h.appendChild(b);
      });
      mg.setScore(`ターン ${Math.min(turn,TURNS)}/${TURNS}`);
      mg.setTimer('');
    }

    function play(i){
      if(busy||mg._ended)return;
      const id=hand[i],c=CARD[id];
      if(c.cost>me.energy){say('⚡が足りない。');return;}
      me.energy-=c.cost;hand.splice(i,1);
      if(c.burn){say('🔥 火種を処理した。');AU.se('warn');render();return;} // 火種は捨て札に戻らない
      discard.push(id);
      const msg=[];
      if(c.dmg){const b=Math.min(enemy.block,c.dmg);enemy.block-=b;enemy.hp-=c.dmg-b;msg.push(`盛り上がり${c.dmg-b}`);}
      if(c.block){me.block+=c.block;msg.push(`ガード${c.block}`);}
      if(c.heal){me.hp=Math.min(me.max,me.hp+c.heal);msg.push(`回復${c.heal}`);}
      if(c.self){me.hp-=c.self;msg.push(`心-${c.self}`);}
      if(c.energy)me.energy+=c.energy;
      if(c.draw)drawCards(c.draw);
      AU.se('tool');
      say(`${c.icon} ${c.name}：${msg.join('・')||'手札を補充'}`);
      render();
      if(enemy.hp<=0){busy=true;say('📈 コメントが止まらない！ 配信が盛り上がった！');setTimeout(()=>mg.end('win'),800);}
      else if(me.hp<=0){busy=true;setTimeout(()=>mg.end('lose'),600);}
    }

    function endTurn(){
      if(busy||mg._ended)return;
      busy=true;
      discard.push(...hand.filter(id=>id!=='burn'));
      const burns=hand.filter(id=>id==='burn').length;
      hand=[];
      if(burns){me.hp-=burns*2;}
      enemy.intent.run();
      say(`${enemy.intent.icon} 過疎の夜：${enemy.intent.txt}`+(burns?`（火種で心-${burns*2}）`:''));
      if(me.hp<=0){render();setTimeout(()=>mg.end('lose'),700);return;}
      turn++;
      if(turn>TURNS){render();setTimeout(()=>mg.end('timeup'),700);return;}
      me.block=0;me.energy=ENERGY;
      pickIntent();drawCards(HAND);
      setTimeout(()=>{busy=false;render();},350);
    }

    pickIntent();drawCards(HAND);render();

    return {result(reason){
      const win=reason==='win', lose=reason==='lose';
      const left=Math.max(0,TURNS-turn);
      const fx=win?{followers:15+left*3,streamPop:8,money:6000,mental:5,fatigue:8}
        :lose?{mental:-8,flame:1,fatigue:10}
        :{followers:Math.floor((ENEMY_MAX-Math.max(0,enemy.hp))/8),streamPop:2,money:2000,fatigue:8};
      return {
        title:win?'🃏 配信大成功！':lose?'🃏 心が折れた':'🃏 なんとか配信を終えた',
        summary:`ターン <span class="up">${Math.min(turn,TURNS)}/${TURNS}</span>　残りの静けさ <span class="${win?'up':'down'}">${Math.max(0,enemy.hp)}</span>`,
        fx, time:80, sp:win?2:0,
        after(){if(win){gs.rankPts+=10;checkRankUp();}},
        log:win?'トークバトルで過疎の夜を盛り上げた。':'静かな夜に配信を続けた。',
        cutin:win?['win','……今夜は、みんながいたわね。']:lose?['tired','……今日は、言葉が出てこない。']:null,
      };
    }};
  },
});
