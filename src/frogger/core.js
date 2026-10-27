'use strict';
/* Froggology: Konami/Sega Frogger (1981) rules, drawn as her backpack frog crossing the school hallway and the
   biology lab's tray river to the specimen jars.
   Rules follow the original cabinet: the frog hops one row or one step at a time from the bottom bank; five road
   lanes of traffic (here lab carts, running classmates, a skateboarder and the janitor's cart) squash it; the
   median is safe; five river lanes of logs (lunch trays) and turtles carry it along, and the water, a diving turtle
   group that goes under, or being carried off the side drown it; at the top are five home bays (jars) and the
   hedge between them kills; a filled bay kills too. Each frog has its own timer and runs out of time once it is
   gone. A fly sometimes sits in an empty bay for a bonus, a crocodile sometimes rises in a bay (deadly once its
   whole head is up), and a lady frog rides a log: carry her home for a bonus. From level 2 a crocodile swims among
   the logs: its back can be ridden, its head kills. Filling all five bays starts the next, faster level.
   Scoring by the cabinet's table: 10 for each forward step onto a new furthest row, 50 for each frog home plus 10
   for every remaining half second, 200 for the fly, 200 for bringing the lady frog home, 1,000 for filling all five
   bays; three frogs, one extra frog at 20,000 (the ROM's fixed threshold, given once); the frog's timer is the ROM's
   60 steps of 32 frames (about 32 seconds). Checked against the ROM disassembly (computerarcheology.com Frogger code:
   step 10 at 1FEC, home 50 at 1F3B, 200 bonuses at 1F22 and 268C, 1,000 board clear at 0623, lives table 03 05 07 at
   2DFF with 3 the factory default, extra frog score 20 00 read at 0914) on 2026-10-26.
   Board tiers (2026-10-31, core 0.2.0): the ROM keeps five lane layouts (the table at 2260, one picked by the
   player's difficulty index, which goes up with every cleared board and wraps after the fifth, 05FC): from board to
   board the river thins out (the top logs 3, 3, 2, 2, 1; the long logs 2, 1, 1, 1, 1; the short logs 3, 3, 3, 2, 2;
   the turtle pairs 4, 5, 4, 3, 3 and triples 4, 3, 3, 3, 2) and the road fills up (trucks 2, 3, 3, 4, 3; race cars
   1, 2, 2, 3, 4; the three car lanes 3 to 5 each); board six is laid out like board one again.
   Adaptations (not ROM-exact): a 15 by 13 cell field on the 4:3 page; lane speeds and their rise from board to
   board, gaps (evenly spaced when a tier changes a lane's count), the diving rhythm and
   the bonus timings tuned by eye at 120 Hz; the janitor's cart (the truck) is 1.8 cells long to match its drawing; the crocodile's head always bites (the cabinet only bites with the
   mouth open); no snake or otter. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['up','b'],['down','b'],['left','b'],['right','b']],
  cell:48,cols:15,rows:13,left:152,top:80,period:22,maxLen:6,
  bays:Object.freeze([1,4,7,10,13]),bayCatch:.55,
  points:Object.freeze({step:10,home:50,halfSecond:10,fly:200,lady:200,all:1000}),
  frogs:3,extraAt:20000,time:32,hopTime:.1,frogHalf:.32,
  dive:Object.freeze({period:6,dip:3.6,under:4.4,rise:5.4}),
  fly:Object.freeze({delay:Object.freeze([5,10]),stay:4}),croc:Object.freeze({delay:Object.freeze([7,14]),peek:2,full:2.2}),
  lady:Object.freeze({delay:Object.freeze([10,18]),walk:.5,row:4}),
  speedUp:.12,maxSpeed:2,deathPause:1.5,clearPause:2});
// Lanes, top to bottom: [row, kind, direction, cells per second, length in cells, offsets in cells, diving groups].
const LANES=Object.freeze([
 [1,'log',1,1.6,4.5,[0,8,15]],[2,'turtle',-1,1.4,2,[0,5.5,11,16.5],[1]],[3,'log',1,2.4,6,[0,11]],[4,'log',1,1,3,[0,7.5,15]],[5,'turtle',-1,1.2,3,[0,5.5,11,16.5],[2]],
 [7,'truck',-1,1.3,1.8,[0,11]],[8,'racer',1,3.6,1,[3]],[9,'girl',-1,1.5,1,[1,7,13]],[10,'boy',1,1.1,1,[2,9,16]],[11,'cart',-1,1.2,1,[0,7.3,14.7]]]);
// The ROM's five board tiers (lane parameter table at 2260): how many objects each lane above carries, in the same order.
const TIERS=Object.freeze([[3,4,2,3,4,2,1,3,3,3],[3,5,1,3,3,3,2,4,4,4],[2,4,1,3,3,3,2,5,4,4],[2,3,1,2,3,4,3,4,4,4],[1,3,1,2,2,3,4,5,4,5]].map(Object.freeze));
class SeededRandom{constructor(seed=1981){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),P=C.period*C.cell,M=C.maxLen*C.cell,FW=C.cols*C.cell;
const wrap=x=>((x+M)%P+P)%P-M,rowY=r=>C.top+(r+.5)*C.cell,bayX=i=>C.left+(C.bays[i]+.5)*C.cell,isRiver=r=>r>=1&&r<=5,isRoad=r=>r>=7&&r<=11;
class FroggerEngine{
 constructor(seed=1981){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.frogs;this.extraGiven=false;this.level=0;this.hops=0;this.state='play';this.timer=0;this.newLevel();return this}
 between([a,b]){return a+(b-a)*this.rng.next()}
 // Each level starts with empty bays, faster lanes and the next of the ROM's five board tiers (sparser river, busier
 // road; the sixth board is laid out like the first); from level 2 a crocodile swims in the top log lane and more turtles dive.
 tier(){return(this.level-1)%TIERS.length}
 newLevel(){this.level++;const k=Math.min(C.maxSpeed,1+C.speedUp*(this.level-1)),counts=TIERS[this.tier()];this.diveClock=0;
  this.lanes={};LANES.forEach(([row,kind,dir,speed,len,offs0,divers=[]],j)=>{const n=counts[j],offs=n===offs0.length?offs0:[...Array(n)].map((_,i)=>offs0[0]+i*C.period/n),croc=Math.min(1,n-1),dives=divers.map(d=>Math.min(d,n-1));
   this.lanes[row]={row,kind,v:dir*speed*k*C.cell,items:offs.map((o,i)=>({x:wrap(o*C.cell-(dir<0?0:M/2)),len,kind:row===1&&i===croc&&this.level>=2?'croc':kind,dive:kind==='turtle'&&(dives.includes(i)||this.level>=2&&i===3),phase:i*1.3}))}});
  this.homes=C.bays.map(()=>false);this.fly=null;this.croc=null;this.lady=null;
  this.flyTimer=this.between(C.fly.delay);this.crocTimer=this.between(C.croc.delay);this.ladyTimer=this.between(C.lady.delay);this.spawnFrog();this.events.push({type:'level',level:this.level})}
 spawnFrog(){this.frog={row:12,x:C.left+(Math.floor(C.cols/2)+.5)*C.cell,dir:'up',hop:null,lady:false};this.bestRow=12;this.time=C.time}
 // Lane positions and turtle dives are worked out at any time t ahead, so the demo pilot can look forward.
 itemX(lane,o,t=0){return wrap(o.x+lane.v*t)}
 diveState(o,t=0){if(!o.dive)return'up';const p=((this.diveClock+t+o.phase)%C.dive.period+C.dive.period)%C.dive.period;return p<C.dive.dip?'up':p<C.dive.under?'dip':p<C.dive.rise?'under':'rise'}
 support(row,x,t=0){const lane=this.lanes[row];if(!lane)return null;const fx=x-C.left;for(const o of lane.items){const a=this.itemX(lane,o,t);if(fx>=a&&fx<=a+o.len*C.cell)return o}return null}
 roadHit(row,x,t=0){const lane=this.lanes[row];if(!lane)return false;const fx=x-C.left,h=C.frogHalf*C.cell,inset=.08*C.cell;
  return lane.items.some(o=>{const a=this.itemX(lane,o,t)+inset,b=a+o.len*C.cell-2*inset;return fx+h>a&&fx-h<b})}
 crocHead(row,x,o,t=0){const a=this.itemX(this.lanes[row],o,t);return o.kind==='croc'&&x-C.left>a+(o.len-1.2)*C.cell}
 award(n){this.score+=n;if(!this.extraGiven&&this.score>=C.extraAt){this.extraGiven=true;this.lives++;this.events.push({type:'extra'})}}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;this.moveLanes(dt);
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0){if(this.state==='cleared')this.newLevel();else this.spawnFrog();this.state='play'}return}
  const f=this.frog;this.time-=dt;if(this.time<=0){this.time=0;return this.die('time')}
  if(f.hop){f.hop.t+=dt;if(f.hop.t>=C.hopTime){f.hop=null;this.land();if(this.state!=='play')return}}
  else{const d=this.direction(input);if(d)this.startHop(d)}
  if(!f.hop)this.check(dt)}
 direction(i){const ay=Number(i.axisY)||0,ax=Number(i.axis)||0;return i.up||ay<-.5?'up':i.down||ay>.5?'down':i.left||ax<-.5?'left':i.right||ax>.5?'right':null}
 // One hop: a row up or down, or one cell sideways from wherever the frog stands (it may be off the grid after riding).
 startHop(d){const f=this.frog;if(d==='down'&&f.row>=12)return;f.dir=d;f.hop={t:0,fromX:f.x,fromRow:f.row};
  if(d==='up')f.row--;else if(d==='down')f.row++;else f.x=clamp(f.x+(d==='left'?-1:1)*C.cell,C.left+C.cell/2,C.left+FW-C.cell/2);this.hops++;this.events.push({type:'hop'})}
 land(){const f=this.frog;
  if(f.row===0){const i=C.bays.findIndex((c,i)=>Math.abs(f.x-bayX(i))<C.bayCatch*C.cell);
   if(i<0)return this.die('hedge');if(this.homes[i])return this.die('taken');if(this.croc?.bay===i&&this.croc.t>=C.croc.peek)return this.die('croc');return this.home(i)}
  // Ten points only for a step onto a new furthest row of this frog's trip.
  if(f.row<this.bestRow){this.bestRow=f.row;this.award(C.points.step);this.events.push({type:'step',points:C.points.step})}}
 check(dt){const f=this.frog;
  if(isRiver(f.row)){const o=this.support(f.row,f.x);if(!o||this.diveState(o)==='under')return this.die('water');if(this.crocHead(f.row,f.x,o))return this.die('croc');
   if(f.x<C.left||f.x>C.left+FW)return this.die('edge');
   const l=this.lady;if(l&&f.row===C.lady.row&&l.item===o&&Math.abs(this.ladyX()-f.x)<.6*C.cell){f.lady=true;this.lady=null;this.ladyTimer=this.between(C.lady.delay);this.events.push({type:'lady',x:f.x,y:rowY(f.row)})}}
  else if(isRoad(f.row)&&this.roadHit(f.row,f.x))this.die('road')}
 moveLanes(dt){const f=this.frog;this.diveClock+=dt;
  // A frog sitting on a log or turtle rides along with it.
  if(this.state==='play'&&!f.hop&&isRiver(f.row)&&this.support(f.row,f.x))f.x+=this.lanes[f.row].v*dt;
  for(const lane of Object.values(this.lanes))for(const o of lane.items)o.x=this.itemX(lane,o,dt);
  this.moveLady(dt);this.moveBays(dt)}
 ladyX(){const l=this.lady;return C.left+l.item.x+l.off}
 // The lady frog boards a log as it comes in from the left and walks up and down it until it drifts off.
 moveLady(dt){const lane=this.lanes[C.lady.row];if(!this.lady){if(this.state!=='play')return;this.ladyTimer-=dt;if(this.ladyTimer>0)return;
   const o=lane.items.find(o=>o.x<-o.len*C.cell*.5&&o.x>-o.len*C.cell);if(o){this.lady={item:o,off:C.cell/2,vdir:1};this.events.push({type:'ladyIn'})}return}
  const l=this.lady,max=l.item.len*C.cell-C.cell/2;l.off+=l.vdir*C.lady.walk*C.cell*dt;if(l.off>max){l.off=max;l.vdir=-1}else if(l.off<C.cell/2){l.off=C.cell/2;l.vdir=1}
  if(l.item.x>FW){this.lady=null;this.ladyTimer=this.between(C.lady.delay)}}
 freeBay(){const free=this.homes.map((h,i)=>h||this.fly?.bay===i||this.croc?.bay===i?-1:i).filter(i=>i>=0);return free.length?free[Math.floor(this.rng.next()*free.length)]:-1}
 // The fly waits in an empty bay for a few seconds; the crocodile peeks in a bay, then rises with its whole head.
 moveBays(dt){if(this.state!=='play')return;
  if(this.fly){this.fly.t-=dt;if(this.fly.t<=0){this.fly=null;this.flyTimer=this.between(C.fly.delay)}}else if((this.flyTimer-=dt)<=0){const b=this.freeBay();if(b>=0)this.fly={bay:b,t:C.fly.stay};else this.flyTimer=1}
  if(this.croc){this.croc.t+=dt;if(this.croc.t>=C.croc.peek+C.croc.full){this.croc=null;this.crocTimer=this.between(C.croc.delay)}}else if((this.crocTimer-=dt)<=0){const b=this.freeBay();if(b>=0)this.croc={bay:b,t:0};else this.crocTimer=1}}
 home(i){const f=this.frog;this.homes[i]=true;let pts=C.points.home+C.points.halfSecond*Math.floor(this.time/.5);const fly=this.fly?.bay===i;if(fly){pts+=C.points.fly;this.fly=null;this.flyTimer=this.between(C.fly.delay)}if(f.lady)pts+=C.points.lady;
  this.award(pts);this.events.push({type:'home',bay:i,points:pts,fly,lady:f.lady,x:bayX(i),y:rowY(0)});
  if(this.homes.every(Boolean)){this.award(C.points.all);this.state='cleared';this.timer=C.clearPause;this.events.push({type:'cleared',level:this.level,points:C.points.all})}else this.spawnFrog()}
 die(cause){const f=this.frog;this.lives--;f.hop=null;f.lady=false;this.events.push({type:'death',cause,x:f.x,y:rowY(f.row),lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // Demo pilot: looks a moment ahead and hops up when the landing stays safe, lines up with an empty jar on the
 // median and the top lane, steps aside or back when staying put is about to go wrong.
 safe(row,x,t0,span=.4){if(row===0){const i=C.bays.findIndex((c,i)=>Math.abs(x-bayX(i))<C.bayCatch*C.cell*.8);return i>=0&&!this.homes[i]&&this.croc?.bay!==i}
  if(row===6||row===12)return true;
  if(isRoad(row)){for(let t=t0;t<=t0+span;t+=.05)if(this.roadHit(row,x,t))return false;return true}
  const o=this.support(row,x,t0);if(!o)return false;const v=this.lanes[row].v;
  for(let t=t0;t<=t0+span;t+=.05){const xt=x+v*(t-t0);if(this.support(row,xt,t)!==o||this.diveState(o,t)==='under'||this.crocHead(row,xt,o,t)||xt<C.left+C.cell*.3||xt>C.left+FW-C.cell*.3)return false}return true}
 basePilot(){const f=this.frog;if(this.state!=='play'||f.hop)return{};const h=C.hopTime,free=C.bays.map((c,i)=>i).filter(i=>!this.homes[i]&&this.croc?.bay!==i);
  const tx=free.length?bayX(free.reduce((a,b)=>Math.abs(bayX(b)-f.x)<Math.abs(bayX(a)-f.x)?b:a)):f.x,dx=tx-f.x,side=dx<0?'left':'right',nx=f.x+(dx<0?-1:1)*C.cell;
  const aligned=Math.abs(dx)<C.cell*.35,needAlign=f.row===1||f.row===6;
  if((!needAlign||aligned||f.row===6&&Math.abs(dx)<C.cell*.5)&&this.safe(f.row-1,f.x,h))return{up:true};
  if(needAlign&&!aligned&&Math.abs(dx)>=C.cell*.5&&this.safe(f.row,nx,h))return{[side]:true};
  if(this.safe(f.row,f.x,0,.25))return{};
  for(const [d,row,x] of [[side,f.row,nx],[dx<0?'right':'left',f.row,f.x-(dx<0?-1:1)*C.cell],['down',f.row+1,f.x]])if(row<=12&&this.safe(row,x,h,.25))return{[d]:true};
  return{up:true}}
 // The demo pilot checks its next move by playing it out on a copy of the game for a moment; if the frog would be
 // lost it tries waiting or the other hops instead. It only ever sets the player's input.
 copy(){const o={},k=Object.create(FroggerEngine.prototype);for(const [n,v] of Object.entries(this))if(n!=='rng'&&n!=='events'&&typeof v!=='function')o[n]=v;
  Object.assign(k,structuredClone(o));k.rng=new SeededRandom(this.rng.value);k.events=[];return k}
 tryMove(first,limit){const k=this.copy(),r0=k.frog.row,s0=k.score;let t=0;
  for(;t<limit;t+=C.step){k.step(C.step,t===0?first:k.basePilot());for(const v of k.events)if(v.type==='death')return{dead:true,t,val:-1e6+t};k.events.length=0;if(k.state!=='play')break}
  const f=k.frog,free=C.bays.map((c,i)=>i).filter(i=>!k.homes[i]&&k.croc?.bay!==i),dx=free.length?Math.min(...free.map(i=>Math.abs(bayX(i)-f.x))):0;
  return{dead:false,t,val:k.score-s0+20*(r0-f.row)-(isRiver(f.row)?10*dx/C.cell:0)}}
 // It plays like a good human, not a perfect one: a short think after each hop off the river, and now and then an impatient hop up without
 // looking (FroggerEngine.slip). Its own luck runs apart from the game's dice, so it never changes the lanes.
 luck(){let t=this.aiLuck=((this.aiLuck??Math.imul(this.rng.value,0x9e3779b1))+0x6d2b79f5)>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}
 pilot(){if(this.state!=='play'||this.frog.hop)return{};const f=this.frog;if(!isRiver(f.row)&&this.aiWait>this.clock&&this.aiWait-this.clock<2&&this.safe(f.row,f.x,0,.25))return{};
  const m=this.decide();if(m.up||m.down||m.left||m.right){this.aiWait=this.clock+C.hopTime+FroggerEngine.think*(.4+this.luck());this.aiBlind=this.luck()<FroggerEngine.slip*(1+this.level)/2}return m}
 decide(){const base=this.basePilot(),H=FroggerEngine.lookAhead,river=isRiver(this.frog.row);if(this.aiBlind){this.aiBlind=false;return{up:true}}if(!river&&!this.tryMove(base,H).dead)return base;
  // On the river every hop is weighed: staying alive first, then getting closer to an empty jar.
  let best=null;for(const m of [{},{up:true},{left:true},{right:true},{down:true}]){const r=this.tryMove(m,H);if(!best||r.val>best.val)best={m,val:r.val}}return best.m}
 snapshot(){const f=this.frog;return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,level:this.level,hops:this.hops,time:+this.time.toFixed(3),
  frog:{row:f.row,x:+f.x.toFixed(2),lady:f.lady},homes:this.homes.slice(),fly:this.fly?.bay??null,croc:this.croc?.bay??null,lady:!!this.lady,
  lanes:Object.values(this.lanes).map(l=>l.items.map(o=>+o.x.toFixed(1)))}}
}
FroggerEngine.lookAhead=.8;FroggerEngine.think=.6;FroggerEngine.slip=.005;
const FroggologyCore={CONFIG,LANES,TIERS,FroggerEngine,SeededRandom,rowY,bayX,wrap};
g.FroggologyCore=FroggologyCore;if(typeof module!=='undefined')module.exports=FroggologyCore;
})(globalThis);
