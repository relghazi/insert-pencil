'use strict';
/* Galgebra: Namco Galaxian (1979) rules, drawn as equations in formation on her graph paper. One addition the cabinet
   does not have (owner 2026-10-28): every flagship shot down powers the ship up, calculator (one shot) to slide rule (two
   side by side) to keyboard (three in a fan); still one volley on the page at a time; a lost life starts over.
   Rules follow the original cabinet: a formation of 46 aliens (2 flagships, 6 red escorts, 8 purple, 30 blue)
   sways side to side without coming down; aliens peel off the ends of the formation, loop out and dive at the
   player, dropping shots on the way; a flagship dives with up to two red escorts; divers that miss fly off the
   bottom, come back in from the top and rejoin their place; the player has one missile in the air at a time;
   scoring by the cabinet's table: in formation blue 30, purple 40, red 50, flagship 60; diving blue 60, purple 80,
   red 100, flagship 150 alone, 200 with one escort, 300 with two, 800 if both escorts were shot first;
   three lives, an extra life at 7,000 (checked 2026-10-26 against the
   disassembly github.com/ScottTunstall/Galaxian and MAME switch defaults; a diving blue may be 70 in the ROM's table,
   the 60 here follows the score display); a cleared wave brings a full new formation.
   Attack timing from the same disassembly (2026-10-31, core 0.3.0): the difficulty is a base (2 on the first wave,
   one more each wave, at most 7) plus an extra that grows by one every 20 s of a wave (at most 7) and drops by one
   when a ship is lost; every 5 frames the ROM ticks as many of its sixteen attack counters (47, 67, 119, 113, ...
   frames) as base + extra + 1, and a single alien leaves when one runs out, with at most 1 + (base + extra) / 2
   (up to 4) single attackers in the air; while a flagship is in the formation only blue and purple aliens attack
   alone; a flagship leads an attack every 9 s at first (6 s at the hardest); shooting a diving flagship stuns the
   swarm: no alien leaves or fires until 4 s after the last attacker has gone; a flagship that dives without escorts
   and gets away leaves the wave, and up to two such flagships join the next formation; once three or fewer aliens are
   left in the formation (or no blue or purple ones), divers that miss come back from the top and attack again;
   divers drop shots at fixed heights low on the page, more of them once the bottom rows are cleared.
   Adaptations (not ROM-exact): dive paths are a loop then a steering dive rather than the ROM's path tables; each
   shooting height fires with an even chance (the ROM fires when the alien passes it exactly);
   a collision destroys the alien without scoring; speeds tuned by eye at 120 Hz. */
(function(g){
const CONFIG=Object.freeze({version:'0.3.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['fire','b']],
  cols:10,cellW:62,cellH:54,top:112,
  layout:Object.freeze([Object.freeze([3,6]),Object.freeze([2,3,4,5,6,7]),Object.freeze([1,2,3,4,5,6,7,8]),null,null,null]),
  types:Object.freeze(['flag','red','purple','blue','blue','blue']),
  formPoints:Object.freeze({blue:30,purple:40,red:50,flag:60}),divePoints:Object.freeze({blue:60,purple:80,red:100,flag:150}),
  flagEscort:Object.freeze([150,200,300]),flagBothEscorts:800,
  swaySpeed:22,swayMax:46,alienR:20,flagR:26,
  loopR:42,loopTime:.8,diveSpeed:200,diveSpeedWave:12,diveAccel:520,diveMaxVx:230,returnSpeed:170,
  firstLaunch:2.2,attackTick:5/60,attackCounters:Object.freeze([47,67,119,113,109,103,101,79,73,67,61,59,53,43,41]),
  diffBase:2,diffMax:7,diffEvery:20,flagWait:9,flagUnit:4/60,shock:4,aggressiveAt:3,maxSurvivors:2,extraFlagCols:Object.freeze([4,5]),
  shotFrom:471,shotGap:75,shotChances:2,shotChance:.5,
  bulletSpeed:330,bulletMaxVx:70,
  playerY:700,playerW:52,playerH:44,playerSpeed:330,edge:40,shotSpeed:900,
   // Power (owner 2026-10-28, not in Galaxian): each flagship shot down grows the ship, calculator to slide rule to keyboard; a lost life starts over.
   volleys:Object.freeze([[[0,0]],[[-12,0],[12,0]],[[0,0],[-8,-160],[8,160]]]),
  lives:3,extraAt:7000,deathPause:2,waveDelay:2});
class SeededRandom{constructor(seed=1979){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const W=CONFIG.width,H=CONFIG.height,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class GalaxianEngine{
 constructor(seed=1979){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=CONFIG.lives;this.extraGiven=false;this.wave=0;this.shots=0;this.fireHeld=false;this.power=0;
  this.base=CONFIG.diffBase-1;this.extra=0;this.counters=CONFIG.attackCounters.slice();this.master=CONFIG.attackTick;this.shock=0;this.survivors=0;this.flagTimer=0;
  this.player={x:W/2};this.shot=null;this.bullets=[];this.state='play';this.timer=0;this.sway=0;this.swayDir=1;this.newWave();return this}
 newWave(){this.wave++;this.aliens=[];let id=0;this.base=Math.min(CONFIG.diffMax,this.base+1);this.extra=0;this.diffTimer=CONFIG.diffEvery;this.shock=0;
  CONFIG.types.forEach((type,row)=>{const cols=(CONFIG.layout[row]||[...Array(CONFIG.cols).keys()]).slice();if(row===0)cols.push(...CONFIG.extraFlagCols.slice(0,this.survivors));for(const col of cols){const a={id:id++,type,row,col,state:'form',alive:true};Object.assign(a,this.slot(a));this.aliens.push(a)}});
  this.survivors=0;this.bullets=[];this.shot=null;this.launchTimer=CONFIG.firstLaunch;this.flagTimer=this.flagInterval();this.launches=0;this.side=this.wave%2?1:-1;this.events.push({type:'wave',wave:this.wave})}
 slot(a){return{x:(W-CONFIG.cols*CONFIG.cellW)/2+(a.col+.5)*CONFIG.cellW+this.sway,y:CONFIG.top+a.row*CONFIG.cellH}}
 alive(){return this.aliens.filter(a=>a.alive)}
 radius(a){return a.type==='flag'?CONFIG.flagR:CONFIG.alienR}
 difficulty(){return this.base+this.extra}
 // How many of the attack counters tick (the ROM skips the base on its easiest setting) and how many single attackers may fly.
 counting(){return((this.base>=2?this.base:0)+this.extra&15)+1}
 maxSingles(){return 1+Math.min(3,this.difficulty()>>1)}
 // Average time between single attacks at the current difficulty (for the page and the checks).
 attackInterval(){let r=0;for(let i=0;i<this.counting();i++)r+=1/(this.counters.length>i?CONFIG.attackCounters[i]*CONFIG.attackTick:1e9);return 1/r}
 bluePurple(){return this.aliens.some(a=>a.alive&&(a.type==='blue'||a.type==='purple'))}
 aggressive(){return this.aliens.filter(a=>a.alive&&a.state==='form').length<=CONFIG.aggressiveAt||!this.bluePurple()}
 flagInterval(){const extraFlags=this.aliens?.filter(a=>a.alive&&a.type==='flag'&&CONFIG.extraFlagCols.includes(a.col)).length||0;
  const A=this.aliens&&!this.bluePurple()?2:9-Math.min(3,this.difficulty()>>2)-extraFlags;return A+A*CONFIG.flagUnit}
 // The ROM's attack clock: every 5 frames tick the first few counters; when one runs out a single alien may leave.
 attackClock(dt){this.master-=dt;while(this.master<=0){this.master+=CONFIG.attackTick;let go=false;for(let i=0;i<this.counting()&&i<this.counters.length;i++)if(--this.counters[i]<=0){this.counters[i]=CONFIG.attackCounters[i];go=true}if(go)this.launchSingle()}
  this.flagTimer-=dt;if(this.flagTimer<=0){this.flagTimer=this.flagInterval();this.launchFlag()}}
 singles(){return this.aliens.filter(a=>a.alive&&a.state==='dive'&&a.leader==null&&!a.escorts).length}
 launch(){return this.launchSingle()}
 // A flagship leads, taking up to two of the red escorts nearest to it.
 launchFlag(){const form=this.alive().filter(a=>a.state==='form'),flags=form.filter(a=>a.type==='flag');if(!flags.length)return false;this.side*=-1;const side=this.side;this.launches++;
  {const flag=flags.reduce((a,b)=>(b.col-a.col)*side>0?b:a);
   const escorts=form.filter(a=>a.type==='red').sort((a,b)=>Math.abs(a.col-flag.col)-Math.abs(b.col-flag.col)||a.col-b.col).slice(0,2);
   this.startDive(flag,side);flag.escorts=escorts.map(e=>e.id);flag.escortsKilled=0;
   for(const e of escorts){this.startDive(e,side);e.leader=flag.id;e.offX=(e.col-flag.col)*CONFIG.cellW*.6;e.offY=CONFIG.cellH*.7}return true}}
 // One alien peels off the end of a row on this side; red ones only once no flagship is left in the formation.
 launchSingle(){const form=this.alive().filter(a=>a.state==='form');if(!form.length||this.singles()>=this.maxSingles())return false;this.side*=-1;const side=this.side;this.launches++;
  const flags=form.some(a=>a.type==='flag'),ends=[];for(const row of new Set(form.map(a=>a.row))){const r=form.filter(a=>a.row===row&&a.type!=='flag'&&!(flags&&a.type==='red'));if(r.length)ends.push(r.reduce((a,b)=>(b.col-a.col)*side>0?b:a))}
  if(!ends.length)return false;this.startDive(ends[Math.floor(this.rng.next()*ends.length)],side);return true}
 // Shooting heights: two low on the page, one more for each cleared pair of rows from the bottom up; each fires on an even chance.
 shotHeights(){let n=CONFIG.shotChances;for(const [r1,r2] of [[5,4],[3,2],[1,0]]){if(this.aliens.some(a=>a.alive&&(a.row===r1||a.row===r2)))break;n++}
  const out=[];for(let i=0;i<n;i++){const y=CONFIG.shotFrom+i*CONFIG.shotGap;if(y<CONFIG.playerY-40&&this.rng.next()<CONFIG.shotChance)out.push(y)}return out}
 startDive(a,dir){Object.assign(a,{state:'dive',t:0,dir,x0:a.x,y0:a.y,vx:0,leader:null,escorts:null,fireAt:this.shotHeights()});this.events.push({type:'dive',kind:a.type})}
 dive(a,dt){a.t+=dt;const L=a.leader!=null?this.aliens[a.leader]:null;
  if(L&&L.alive&&L.state==='dive'){a.x=L.x+a.offX;a.y=L.y+a.offY}
  else{a.leader=null;if(a.t<CONFIG.loopTime){const th=Math.PI*a.t/CONFIG.loopTime;a.x=a.x0+a.dir*CONFIG.loopR*(1-Math.cos(th));a.y=a.y0-CONFIG.loopR*Math.sin(th)}
   else{const tx=this.player.x+90*a.dir*Math.sin(a.t*2.2);a.vx=clamp(a.vx+clamp((tx-a.x)*3,-CONFIG.diveAccel,CONFIG.diveAccel)*dt,-CONFIG.diveMaxVx,CONFIG.diveMaxVx);
    a.x=clamp(a.x+a.vx*dt,20,W-20);a.y+=(CONFIG.diveSpeed+CONFIG.diveSpeedWave*(this.wave-1))*dt}}
  if(a.fireAt.length&&a.y>=a.fireAt[0]&&this.state==='play'&&!this.shock){a.fireAt.shift();this.bullets.push({x:a.x,y:a.y+16,vx:clamp((this.player.x-a.x)*.25,-CONFIG.bulletMaxVx,CONFIG.bulletMaxVx)});this.events.push({type:'bomb'})}
  // A diver that misses leaves through the bottom and comes back in from the top: a flagship with no escort left gets
  // away (up to two join the next wave); when the swarm is down to its last few, the others keep attacking.
  if(a.y>H+30){if(a.type==='flag'&&!(a.escorts||[]).some(id=>this.aliens[id].alive)){a.alive=false;a.escaped=true;this.survivors=Math.min(CONFIG.maxSurvivors,this.survivors+1);this.events.push({type:'escape'});return}
   if(a.type!=='flag'&&this.state==='play'&&this.aggressive()){Object.assign(a,{t:CONFIG.loopTime,y:-40,x:clamp(this.player.x+(this.rng.next()-.5)*400,40,W-40),vx:0,leader:null,escorts:null,fireAt:this.shotHeights()});return}
   a.state='return';a.leader=null;a.escorts=null;a.y=-40;a.x=this.slot(a).x}}
 kill(a){a.alive=false;let pts;if(a.type==='flag'&&a.state!=='form'){this.shock=CONFIG.shock;this.events.push({type:'stun'})}if(a.type==='flag'&&this.power<CONFIG.volleys.length-1){this.power++;this.events.push({type:'power',power:this.power})}
  if(a.state==='form')pts=CONFIG.formPoints[a.type];
  else if(a.type==='flag'){const n=a.escorts?.length||0;pts=n===2&&a.escortsKilled===2?CONFIG.flagBothEscorts:CONFIG.flagEscort[n]}
  else pts=CONFIG.divePoints[a.type];
  const L=a.leader!=null?this.aliens[a.leader]:null;if(L&&L.alive&&L.escorts?.includes(a.id))L.escortsKilled++;
  this.award(pts);this.events.push({type:'kill',kind:a.type,points:pts,x:a.x,y:a.y,diving:a.state!=='form'});return pts}
 award(n){this.score+=n;if(!this.extraGiven&&this.score>=CONFIG.extraAt){this.extraGiven=true;this.lives++;this.events.push({type:'extra'})}}
 // One volley on the page at a time, as the cabinet allows one shot: one, two or three shots by the ship's power.
 fire(){if(this.shot||this.state!=='play')return;const y=CONFIG.playerY-CONFIG.playerH/2;this.shot={x:this.player.x,y,parts:CONFIG.volleys[this.power].map(([dx,vx])=>({x:this.player.x+dx,y,vx}))};this.shots++;this.events.push({type:'shot'})}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  this.sway+=this.swayDir*CONFIG.swaySpeed*dt;if(Math.abs(this.sway)>CONFIG.swayMax){this.sway=Math.sign(this.sway)*CONFIG.swayMax;this.swayDir*=-1}
  for(const a of this.alive()){if(a.state==='form')Object.assign(a,this.slot(a));else if(a.state==='return'){a.x=this.slot(a).x;a.y+=CONFIG.returnSpeed*dt;if(a.y>=this.slot(a).y){a.state='form';Object.assign(a,this.slot(a))}}else this.dive(a,dt)}
  // After a loss the next rocket waits until every attacker has flown off and rejoined the formation.
  // Minus signs still in the air when the wave is cleared fall on off the page (they no longer hit).
  if(this.state==='cleared'){for(const b of this.bullets){b.x+=b.vx*dt;b.y+=CONFIG.bulletSpeed*dt}this.bullets=this.bullets.filter(b=>b.y<=H)}
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0&&(this.state==='cleared'||!this.alive().some(a=>a.state!=='form'))){if(this.state==='cleared')this.newWave();else{this.player.x=W/2;this.bullets=[]}this.state='play'}return}
  const p=this.player,axis=clamp(Number(input.axis)||0,-1,1),dir=axis||((input.right?1:0)-(input.left?1:0));p.x=clamp(p.x+dir*CONFIG.playerSpeed*dt,CONFIG.edge,W-CONFIG.edge);
  if(input.fire&&!this.fireHeld)this.fire();this.fireHeld=!!input.fire;
  // The stunned swarm waits until 4 s after its last attacker has gone; meanwhile the difficulty clock stands still.
  if(this.shock>0){if(this.aggressive()||!this.alive().some(a=>a.state!=='form'))this.shock=Math.max(0,this.shock-dt)}
  else{this.diffTimer-=dt;if(this.diffTimer<=0){this.diffTimer=CONFIG.diffEvery;this.extra=Math.min(CONFIG.diffMax,this.extra+1)}}
  if(this.launchTimer>0)this.launchTimer-=dt;else if(!this.shock)this.attackClock(dt)
  this.moveShot(dt);this.moveBullets(dt);
  if(this.state==='play')for(const a of this.alive())if(a.state==='dive'&&Math.abs(a.x-p.x)<CONFIG.playerW/2+this.radius(a)*.6&&Math.abs(a.y-CONFIG.playerY)<CONFIG.playerH/2+this.radius(a)*.6){a.alive=false;this.events.push({type:'crash',x:a.x,y:a.y});this.hitPlayer();break}
  if(this.state==='play'&&!this.alive().length){this.state='cleared';this.timer=CONFIG.waveDelay;this.events.push({type:'cleared',wave:this.wave})}}
 moveShot(dt){const s=this.shot;if(!s)return;
  for(const p of s.parts){if(p.dead)continue;p.y-=CONFIG.shotSpeed*dt;p.x+=p.vx*dt;if(p.y<20||p.x<0||p.x>W){p.dead=true;continue}
   for(const a of this.alive()){const r=this.radius(a);if(Math.abs(a.x-p.x)<r&&Math.abs(a.y-p.y)<r){p.dead=true;this.kill(a);break}}}
  const live=s.parts.filter(p=>!p.dead);if(!live.length){this.shot=null;return}s.x=live[0].x;s.y=live[0].y}
 moveBullets(dt){const p=this.player;for(const b of this.bullets){b.x+=b.vx*dt;b.y+=CONFIG.bulletSpeed*dt;
   if(Math.abs(b.x-p.x)<CONFIG.playerW/2-6&&b.y>CONFIG.playerY-CONFIG.playerH/2&&b.y<CONFIG.playerY+CONFIG.playerH/2){b.dead=true;this.hitPlayer();return}
   if(b.y>H)b.dead=true}this.bullets=this.bullets.filter(b=>!b.dead)}
 // A hit stops the attackers' fire; they fly on off the bottom and regroup before the next ship.
 hitPlayer(){this.lives--;this.shot=null;this.power=0;this.extra=Math.max(0,this.extra-1);this.bullets=[];this.events.push({type:'death',x:this.player.x,lives:this.lives});
  for(const a of this.alive())if(a.state==='dive')a.fireAt=[];
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=CONFIG.deathPause}}
 // Demo pilot: lines up under the nearest diver (or the lowest bug in formation) and fires, sidestepping falling minus signs.
 pilot(){const p=this.player,live=this.alive();if(!live.length)return{};
  const divers=live.filter(a=>a.state==='dive'&&a.y<CONFIG.playerY-80),pool=divers.length?divers:live.filter(a=>a.state==='form');if(!pool.length)return{};
  const t=pool.reduce((a,b)=>Math.abs(b.x-p.x)-b.y*.3<Math.abs(a.x-p.x)-a.y*.3?b:a);let x=t.x;
  const danger=this.bullets.find(b=>b.y>CONFIG.playerY-200&&Math.abs(b.x-p.x)<44)||live.find(a=>a.state==='dive'&&a.y>CONFIG.playerY-160&&Math.abs(a.x-p.x)<70);
  if(danger)x=p.x+(danger.x<p.x?110:-110);const d=x-p.x;
  return{axis:Math.abs(d)<4?0:clamp(d/30,-1,1),fire:!this.shot&&!danger&&Math.abs(d)<16&&Math.floor(this.clock*8)%2===0}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,wave:this.wave,shots:this.shots,power:this.power,player:{...this.player},alive:this.alive().length,
  aliens:this.alive().map(a=>[a.id,a.state,Math.round(a.x),Math.round(a.y)]),bullets:this.bullets.length,sway:+this.sway.toFixed(3)}}
}
const GalgebraCore={CONFIG,GalaxianEngine,SeededRandom};
g.GalgebraCore=GalgebraCore;if(typeof module!=='undefined')module.exports=GalgebraCore;
})(globalThis);
