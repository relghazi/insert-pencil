'use strict';
/* Home Ec Scramble: Data East BurgerTime (1982) rules, drawn as her home ec class: a little chef, running hot dogs,
   pickles and fried eggs, and burgers stacked on blue-rimmed plates.
   Rules follow the original cabinet: girders joined by ladders; each burger ingredient lies across four quarters and
   drops one floor once the chef has walked over all four; a falling ingredient that lands on the next one of its
   burger knocks that one down in turn; the bottom floor drops onto the plate, and when every burger is complete the
   stage is done; Mr. Hot Dog, Mr. Pickle and Mr. Egg come in from the girder ends and chase the chef up and down the
   ladders, choosing at every junction the way that brings them closer; pepper (five to start) stuns the ones it hits
   for a few seconds and the chef can walk through them; enemies standing on an ingredient when it drops ride it down,
   and it falls one extra floor for each of them; crushed and carried enemies come back from the ends after a while.
   Scoring by the cabinet's table: an ingredient dropping a floor 50; crushing Mr. Hot Dog 100, Mr. Pickle 200,
   Mr. Egg 300; carrying enemies down on an ingredient 500, 1,000, 2,000, 4,000, 8,000 or 16,000 for one to six;
   bonus food (ice cream 500, coffee 1,000, fries 1,500) appears in the middle three times a stage, after so many
   ingredients have reached their plates (4, 8 and 12 on the first layout, 5, 7 and 13 on the second), and also gives
   one pepper; a newly arrived enemy can be walked through for a quarter second; once the last ingredient is falling
   the chef cannot be caught; three hot dogs and an egg on stages 1 and 2, six with pickles from stage 3; a finished stage gives one
   more pepper; three lives and an extra life every 20,000 (the factory settings in the Bally Midway manual,
   checked 2026-10-26 with its point table; the bonus food counts, the quarter second, the last piece and the
   enemies per stage from the arcade-history.com tips and the classicgaming.cc play guide, checked 2026-10-31).
   Adaptations (not ROM-exact): the two layouts are drawn after the cabinet's first two stages (four burgers, buns
   on top, ladders between the burgers) on a 32 x 24 tile page, and they alternate, a little faster each time round
   (the cabinet has six); the six from stage 3 are three hot dogs, two pickles and an egg (the mix is a guess); enemy
   choices are a simple greedy chase with some chance. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['axisY','n',-1,1,20],['fire','b']],tile:32,
  floors:Object.freeze([124,208,292,376,460,544]),plateY:716,pieceW:128,stackStep:18,
  chefSpeed:150,climbSpeed:105,enemySpeed:118,enemyClimb:82,speedUp:8,snap:12,assist:48,
  points:Object.freeze({drop:50,hotdog:100,pickle:200,egg:300}),carry:Object.freeze([500,1000,2000,4000,8000,16000]),
  bonus:Object.freeze([Object.freeze(['icecream',500]),Object.freeze(['coffee',1000]),Object.freeze(['fries',1500])]),bonusTime:10,enterGrace:.25,
  rosters:Object.freeze([Object.freeze(['hotdog','hotdog','hotdog','egg']),Object.freeze(['hotdog','pickle','hotdog','egg','hotdog','pickle'])]),
  pepper:5,pepperTime:.35,pepperReach:48,stun:4,fallSpeed:330,
  lives:3,extraEvery:20000,deathPause:2,clearPause:2.5,respawn:4,spawnGap:1.6,touch:24});
// Floors list girder runs in tile columns; ladders are [column, top floor, bottom floor]; burgers start at a column;
// each burger lists its ingredients top to bottom with the floor they start on.
const STAGES=Object.freeze([
 {floors:[[[1,30]],[[1,14],[17,30]],[[1,30]],[[1,30]],[[1,14],[17,30]],[[1,30]]],
  ladders:[[1,0,2],[1,3,5],[8,0,1],[8,2,5],[15,0,3],[16,3,5],[23,0,4],[30,0,2],[30,3,5]],burgers:[3,10,18,25],
  pieces:[[['top',0],['lettuce',2],['patty',3],['bottom',5]],[['top',0],['lettuce',1],['patty',3],['bottom',4]],[['top',0],['lettuce',2],['patty',4],['bottom',5]],[['top',0],['lettuce',1],['patty',2],['bottom',4]]],
  spawns:[[0,-1],[0,1],[2,-1],[2,1],[5,-1],[5,1]],bonusAfter:[4,8,12],bonusAt:[2,512],start:[5,512]},
 {floors:[[[1,30]],[[1,30]],[[1,14],[17,30]],[[1,30]],[[1,30]],[[1,30]]],
  ladders:[[1,0,4],[8,1,3],[8,4,5],[15,0,1],[16,3,5],[23,1,3],[23,4,5],[30,0,4]],burgers:[3,10,18,25],
  pieces:[[['top',0],['cheese',1],['patty',2],['tomato',4],['bottom',5]],[['top',0],['lettuce',1],['patty',3],['cheese',4],['bottom',5]],[['top',0],['tomato',2],['patty',3],['lettuce',4],['bottom',5]],[['top',1],['cheese',2],['patty',3],['lettuce',4],['bottom',5]]],
  spawns:[[0,-1],[0,1],[3,-1],[3,1],[1,-1],[1,1]],bonusAfter:[5,7,13],bonusAt:[3,512],start:[5,512]}]);
class SeededRandom{constructor(seed=1982){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const GRAPHS=[],C=CONFIG,T=C.tile,FY=C.floors,colX=c=>c*T+T/2,sign=Math.sign;
class BurgerEngine{
 constructor(seed=1982){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.nextExtra=C.extraEvery;this.pepper=C.pepper;this.peppers=0;
  this.stage=0;this.state='play';this.timer=0;this.firePrev=false;this.newStage();return this}
 newStage(){this.stage++;const L=STAGES[(this.stage-1)%STAGES.length];this.layout=L;this.round=Math.floor((this.stage-1)/STAGES.length);
  this.ladders=L.ladders.map(([c,a,b])=>{const stops=[];for(let f=a;f<=b;f++)if(this.girder(f,colX(c)))stops.push(f);return{x:colX(c),stops}});
  this.pieces=[];L.pieces.forEach((list,b)=>list.forEach(([kind,f])=>this.pieces.push({kind,burger:b,x:L.burgers[b]*T,y:FY[f],floor:f,steps:[0,0,0,0],state:'rest',drops:0,riders:[]})));
  this.stacks=L.burgers.map(()=>0);this.dropped=0;this.bonus=null;this.cloud=null;this.startLife();this.events.push({type:'stage',stage:this.stage})}
 // Chef back at the start, every enemy waiting to come in again from the girder ends.
 startLife(){const L=this.layout,[f,x]=L.start;this.chef={x,y:FY[f],lad:null,face:1,vdir:-1,walking:false};this.cloud=null;
  const roster=C.rosters[this.stage<=2?0:1];
  this.enemies=roster.map((kind,i)=>({kind,state:'wait',timer:1+i*C.spawnGap,spawn:i,x:0,y:0,dx:0,dy:0,lad:null,stun:0}))}
 enter(e){const L=this.layout,[f,side]=L.spawns[e.spawn%L.spawns.length],segs=L.floors[f];
  Object.assign(e,{state:'walk',x:side<0?colX(segs[0][0]):colX(segs[segs.length-1][1]),y:FY[f],dx:-side,dy:0,lad:null,stun:0,grace:C.enterGrace});this.events.push({type:'enemyIn',kind:e.kind})}
 girder(f,x){return f>=0&&f<FY.length&&this.layout.floors[f].some(([a,b])=>x>=colX(a)-.01&&x<=colX(b)+.01)}
 segment(f,x){return this.layout.floors[f].find(([a,b])=>x>=colX(a)-.01&&x<=colX(b)+.01)}
 ladderAt(x,f,tol=.5){return this.ladders.find(l=>Math.abs(l.x-x)<=tol&&l.stops.includes(f))}
 canClimb(l,f,dir){const i=l.stops.indexOf(f);return i>=0&&(dir<0?i>0:i<l.stops.length-1)}
 nextStop(l,y,dir){const ys=l.stops.map(f=>FY[f]);return dir<0?ys.filter(v=>v<y).pop()??null:ys.find(v=>v>y)??null}
 climb(m,dir,d){const t=this.nextStop(m.lad,m.y,dir);if(t===null)return false;m.y=dir<0?Math.max(t,m.y-d):Math.min(t,m.y+d);m.vdir=dir;return m.y===t}
 // On a floor only where there is girder under him: a ladder can pass a gap at the height of a floor.
 floorOf(m){const f=FY.indexOf(m.y);return f>=0&&this.girder(f,m.x)?f:-1}
 enemySpeed(){return Math.min(C.chefSpeed*1.05,C.enemySpeed+C.speedUp*(this.stage-1))}
 award(n){this.score+=n;while(this.score>=this.nextExtra){this.nextExtra+=C.extraEvery;this.lives++;this.events.push({type:'extra'})}}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;this.updatePieces(dt,false);if(this.timer<=0){if(this.state==='cleared')this.newStage();else this.startLife();this.state='play'}return}
  const ax=Number(input.axis)||0,ay=Number(input.axisY)||0,wx=Math.abs(ax)>.3?sign(ax):(input.right?1:0)-(input.left?1:0),wy=Math.abs(ay)>.3?sign(ay):(input.down?1:0)-(input.up?1:0);
  this.moveChef(dt,wx,wy);
  if(input.fire&&!this.firePrev)this.throwPepper();this.firePrev=!!input.fire;
  for(const e of this.enemies)this.moveEnemy(e,dt);
  this.updateCloud(dt);this.updatePieces(dt,true);this.updateBonus(dt);
  if(this.state==='play')this.collide();
  if(this.state==='play'&&this.pieces.every(p=>p.state==='plate')){this.state='cleared';this.timer=C.clearPause;this.pepper++;this.events.push({type:'cleared',stage:this.stage})}}
 // The chef walks along girders and climbs only where a ladder meets his floor; holding up or down near a ladder steps to it.
 moveChef(dt,wx,wy){const p=this.chef,f=this.floorOf(p),hs=C.chefSpeed*dt,vs=C.climbSpeed*dt;p.walking=false;
  if(f<0){const dir=wy||(wx?p.vdir:0);if(dir){this.climb(p,dir,vs);p.walking=true}return}
  if(wy){const l=this.ladders.find(l=>Math.abs(l.x-p.x)<=C.snap&&this.canClimb(l,f,wy));if(l){p.x=l.x;p.lad=l;this.climb(p,wy,vs);p.walking=true;return}}
  if(wx){const s=this.segment(f,p.x);p.x=Math.max(colX(s[0]),Math.min(colX(s[1]),p.x+wx*hs));p.face=wx;p.lad=null;p.walking=true;return}
  if(wy){const s=this.segment(f,p.x),l=this.ladders.filter(l=>this.canClimb(l,f,wy)&&l.x>=colX(s[0])&&l.x<=colX(s[1])&&Math.abs(l.x-p.x)<=C.assist).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
   if(l){const d=l.x-p.x;p.x+=sign(d)*Math.min(Math.abs(d),hs);p.face=sign(d)||p.face;p.walking=true}}}
 // Enemies keep going until a junction or a girder end, then choose: a ladder toward the chef's floor, else toward him along the floor.
 moveEnemy(e,dt){if(e.state==='wait'){e.timer-=dt;if(e.timer<=0)this.enter(e);return}
  if(e.state!=='walk')return;if(e.grace>0)e.grace-=dt;if(e.stun>0){e.stun-=dt;return}
  const hs=this.enemySpeed()*dt,vs=hs*C.enemyClimb/C.enemySpeed;
  if(e.dy){if(this.climb(e,e.dy,vs))this.decide(e,this.floorOf(e));else if(this.nextStop(e.lad,e.y,e.dy)===null)e.dy=-e.dy;return}
  const f=this.floorOf(e),nx=e.x+e.dx*hs,l=this.ladders.find(l=>l.stops.includes(f)&&(l.x-e.x)*e.dx>0&&(nx-l.x)*e.dx>=0);
  if(l){e.x=l.x;this.decide(e,f);return}
  if(!this.girder(f,nx)){const s=this.segment(f,e.x);e.x=e.dx<0?colX(s[0]):colX(s[1]);this.decide(e,f);return}e.x=nx}
 decide(e,f){const opts=[];if(this.girder(f,e.x-1))opts.push([-1,0,null]);if(this.girder(f,e.x+1))opts.push([1,0,null]);
  const l=this.ladderAt(e.x,f);if(l){if(this.canClimb(l,f,-1))opts.push([0,-1,l]);if(this.canClimb(l,f,1))opts.push([0,1,l])}
  const fwd=opts.length>1?opts.filter(([dx,dy])=>!(dx===-e.dx&&dy===-e.dy)):opts,p=this.chef,vy=sign(p.y-e.y),vx=sign(p.x-e.x);
  let pick=vy&&this.rng.next()<.8?fwd.find(o=>o[1]===vy):null;if(!pick&&vx&&this.rng.next()<.8)pick=fwd.find(o=>o[0]===vx);
  if(!pick)pick=fwd[Math.floor(this.rng.next()*fwd.length)];if(!pick)return;[e.dx,e.dy]=pick;if(pick[2])e.lad=pick[2]}
 // Pepper: one shake, a short cloud in front of the chef (above or below him on a ladder) that stuns what it touches.
 throwPepper(){if(this.pepper<=0||this.cloud)return;const p=this.chef,f=this.floorOf(p);this.pepper--;this.peppers++;
  this.cloud=f>=0?{x:p.x+p.face*C.pepperReach,y:p.y,t:C.pepperTime}:{x:p.x,y:p.y+p.vdir*C.pepperReach,t:C.pepperTime};this.events.push({type:'pepper',x:this.cloud.x,y:this.cloud.y})}
 stunTime(){return Math.max(2,C.stun-.25*(this.stage-1))}
 updateCloud(dt){const c=this.cloud;if(!c)return;c.t-=dt;if(c.t<=0){this.cloud=null;return}
  for(const e of this.enemies)if(e.state==='walk'&&e.stun<=0&&Math.abs(e.x-c.x)<40&&Math.abs(e.y-c.y)<40){e.stun=this.stunTime();this.events.push({type:'stun',kind:e.kind,x:e.x,y:e.y})}}
 updatePieces(dt,live){const p=this.chef,f=this.floorOf(p);
  if(live&&f>=0)for(const pc of this.pieces)if(pc.state==='rest'&&pc.floor===f&&p.x>=pc.x&&p.x<pc.x+C.pieceW){const i=Math.floor((p.x-pc.x)/T);
   if(!pc.steps[i]){pc.steps[i]=1;this.events.push({type:'step',x:p.x,y:p.y});if(pc.steps.every(Boolean))this.release(pc)}}
  for(const pc of this.pieces)if(pc.state==='fall')this.fall(pc,dt)}
 // Enemies standing on an ingredient when it goes ride it down, and it falls one extra floor for each of them.
 release(pc){pc.state='fall';pc.steps=[0,0,0,0];pc.riders=this.enemies.filter(e=>e.state==='walk'&&e.y===pc.y&&e.x>=pc.x-8&&e.x<=pc.x+C.pieceW+8);
  for(const e of pc.riders){e.state='ride';e.stun=0}pc.drops=1+pc.riders.length;this.events.push({type:'release',kind:pc.kind,riders:pc.riders.length,x:pc.x+C.pieceW/2,y:pc.y})}
 pieceStop(pc){const cx=pc.x+C.pieceW/2;for(let f=0;f<FY.length;f++)if(FY[f]>pc.y&&this.girder(f,cx))return FY[f];return C.plateY-this.stacks[pc.burger]*C.stackStep}
 fall(pc,dt){const stop=this.pieceStop(pc),ny=Math.min(stop,pc.y+C.fallSpeed*dt),cx=pc.x+C.pieceW/2;
  // Anything walking where the ingredient comes down is crushed.
  for(const e of this.enemies)if(e.state==='walk'&&Math.abs(e.x-cx)<C.pieceW/2+8&&e.y-44<ny&&e.y>ny-26){const pts=C.points[e.kind];this.award(pts);this.events.push({type:'crush',kind:e.kind,points:pts,x:e.x,y:e.y-24});this.retire(e)}
  pc.y=ny;for(const e of pc.riders){e.y=ny;e.x=Math.max(pc.x+8,Math.min(pc.x+C.pieceW-8,e.x))}
  if(ny<stop)return;this.award(C.points.drop);this.events.push({type:'drop',points:C.points.drop,x:cx,y:ny});
  const f=FY.indexOf(stop);
  if(f<0){pc.state='plate';this.stacks[pc.burger]++;this.dropped++;this.bonusCheck();this.landRiders(pc);if(this.pieces.filter(o=>o.burger===pc.burger).every(o=>o.state==='plate'))this.events.push({type:'burger',burger:pc.burger});return}
  pc.floor=f;const below=this.pieces.find(o=>o!==pc&&o.state==='rest'&&o.burger===pc.burger&&o.floor===f);
  if(below){this.release(below);pc.drops=0}else pc.drops--;
  if(pc.drops<=0){pc.state='rest';this.landRiders(pc)}}
 landRiders(pc){const n=pc.riders.length;if(!n)return;const pts=C.carry[Math.min(n,6)-1];this.award(pts);this.events.push({type:'carry',count:n,points:pts,x:pc.x+C.pieceW/2,y:pc.y-30});for(const e of pc.riders)this.retire(e);pc.riders=[]}
 retire(e){e.state='wait';e.timer=C.respawn;e.stun=0}
 // Bonus food comes out when the stage's 4th, 8th and 12th ingredient reaches its plate (5th, 7th and 13th on the second layout).
 bonusCheck(){if(this.bonus||!this.layout.bonusAfter.includes(this.dropped))return;const [f,x]=this.layout.bonusAt,[kind,points]=C.bonus[(this.stage-1)%C.bonus.length];this.bonus={kind,points,x,y:FY[f],t:C.bonusTime};this.events.push({type:'bonusIn',kind})}
 updateBonus(dt){const b=this.bonus,p=this.chef;if(!b)return;b.t-=dt;if(b.t<=0){this.bonus=null;return}
  if(p.y===b.y&&Math.abs(p.x-b.x)<28){this.award(b.points);this.pepper++;this.events.push({type:'bonus',kind:b.kind,points:b.points,x:b.x,y:b.y-30});this.bonus=null}}
 // A new enemy can be walked through for its first quarter second; and once the last ingredient is on its way down
 // nothing can catch the chef any more.
 collide(){const p=this.chef;if(this.pieces.every(pc=>pc.state!=='rest'))return;for(const e of this.enemies)if(e.state==='walk'&&e.stun<=0&&!(e.grace>0)&&Math.abs(e.x-p.x)<C.touch&&Math.abs(e.y-p.y)<C.touch)return this.die()}
 die(){this.lives--;this.cloud=null;this.events.push({type:'death',x:this.chef.x,y:this.chef.y,lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // Route finder over the girder and ladder junctions (used by the demo pilot): shortest times between all junctions
 // are worked out once per layout, then a route is the best start junction, junction-to-junction run and last walk.
 graph(){const id=(this.stage-1)%STAGES.length;if(GRAPHS[id])return GRAPHS[id];const nodes=[];
  for(const l of this.ladders)for(const f of l.stops)if(!nodes.some(q=>q.f===f&&q.x===l.x))nodes.push({f,x:l.x});const n=nodes.length,D=[],nx=[];
  for(let i=0;i<n;i++){D.push(Array(n).fill(1e9));nx.push(Array(n).fill(-1));D[i][i]=0;nx[i][i]=i}
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i===j)continue;const a=nodes[i],b=nodes[j];let c=1e9;
   if(a.f===b.f&&this.segment(a.f,a.x)===this.segment(b.f,b.x))c=Math.abs(a.x-b.x)/C.chefSpeed;
   else if(a.x===b.x&&this.ladders.some(l=>l.x===a.x&&l.stops.includes(a.f)&&l.stops.includes(b.f)&&Math.abs(l.stops.indexOf(a.f)-l.stops.indexOf(b.f))===1))c=Math.abs(FY[a.f]-FY[b.f])/C.climbSpeed;
   if(c<D[i][j]){D[i][j]=c;nx[i][j]=j}}
  for(let k=0;k<n;k++)for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(D[i][k]+D[k][j]<D[i][j]){D[i][j]=D[i][k]+D[k][j];nx[i][j]=nx[i][k]}
  return GRAPHS[id]={nodes,D,nx}}
 route(tf,tx){const p=this.chef,{nodes,D,nx}=this.graph(),f0=this.floorOf(p);let best=null;
  const starts=nodes.map((q,i)=>[q,i]).filter(([q])=>f0>=0?q.f===f0&&this.segment(f0,q.x)===this.segment(f0,p.x):p.lad&&q.x===p.x&&(FY[q.f]===this.nextStop(p.lad,p.y,-1)||FY[q.f]===this.nextStop(p.lad,p.y,1)));
  const ts=this.segment(tf,tx),ends=nodes.map((q,i)=>[q,i]).filter(([q])=>q.f===tf&&this.segment(tf,q.x)===ts);
  for(const [s,i] of starts){const d0=Math.abs(s.x-p.x)/C.chefSpeed+Math.abs(FY[s.f]-p.y)/C.climbSpeed;for(const [e,j] of ends){const d=d0+D[i][j]+Math.abs(e.x-tx)/C.chefSpeed;if(d<1e9&&(!best||d<best.d))best={d,i,j}}}
  if(!best)return null;const path=[];for(let k=best.i;;k=nx[k][best.j]){path.push(nodes[k]);if(k===best.j||k<0)break}path.push({f:tf,x:tx});return{d:best.d,path}}
 // Demo pilot: walks to an unfinished ingredient (or the bonus food) and across it.
 aim(pc){const i=pc.steps.findIndex(s=>!s);return{f:pc.floor,x:pc.x+i*T+T/2}}
 goals(){const out=this.pieces.map((pc,i)=>pc.state==='rest'?i:-1).filter(i=>i>=0);if(this.bonus)out.push(-1);return out}
 pathTo(tf,tx){const p=this.chef,f=this.floorOf(p);if(f===tf&&this.segment(f,p.x)===this.segment(f,tx))return{d:Math.abs(tx-p.x)/C.chefSpeed,path:[{f,x:tx}]};return this.route(tf,tx)}
 basePilot(){const p=this.chef,f=this.floorOf(p),out={axis:0,axisY:0,fire:false},g=this.aiGoal,ok=g===-1?!!this.bonus:this.pieces[g]?.state==='rest';
  let t=null;if(g!==undefined&&ok)t=g===-1?{f:FY.indexOf(this.bonus.y),x:this.bonus.x}:this.aim(this.pieces[g]);
  let r=t&&this.pathTo(t.f,t.x);if(!r)for(const i of this.goals()){if(i<0)continue;const q=this.aim(this.pieces[i]),w=this.pathTo(q.f,q.x);if(w&&(!r||w.d<r.d))r=w}
  if(!r)return out;const hop=r.path.find(q=>Math.abs(q.x-p.x)>1||FY[q.f]!==p.y)||r.path[r.path.length-1];
  if(Math.abs(hop.x-p.x)>1&&f>=0)out.axis=sign(hop.x-p.x);else out.axisY=sign(FY[hop.f]-p.y);return out}
 // Before each choice it plays the candidates out on a copy of the game for a couple of seconds: which ingredient to
 // go for, and if every way gets the chef caught, a dodge or the pepper. It only ever sets the player's input.
 copy(){const o={},k=Object.create(BurgerEngine.prototype);for(const [n,v] of Object.entries(this))if(n!=='rng'&&n!=='events'&&typeof v!=='function')o[n]=v;
  Object.assign(k,structuredClone(o));k.rng=new SeededRandom(this.rng.value);k.events=[];return k}
 tryMove(goal,first,hold,limit){const k=this.copy(),s0=k.score,p0=k.pepper;k.aiGoal=goal;let t=0;
  for(;t<limit;t+=C.step){const m=t<hold?first:k.basePilot();k.step(C.step,{...m,fire:m.fire&&!k.firePrev});for(const v of k.events)if(v.type==='death')return{dead:true,val:-1e6+t};k.events.length=0;if(k.state!=='play')break}
  const c=k.chef,near=Math.min(300,...k.enemies.filter(e=>e.state==='walk'&&e.stun<=0).map(e=>Math.abs(e.x-c.x)+Math.abs(e.y-c.y)*1.5));
  return{dead:false,val:k.score-s0+k.pieces.reduce((n,p)=>n+p.steps.filter(Boolean).length,0)*15-(p0-k.pepper)*400+near*.3}}
 pilot(){if(this.state!=='play')return{};const H=BurgerEngine.lookAhead,A=this.aiMove,out=m=>({...m,fire:!!m.fire&&!this.firePrev});
  if(A&&this.clock<A.until&&this.clock>A.until-2)return out(A.m);this.aiMove=null;
  if(!(this.aiNext>this.clock&&this.aiNext-this.clock<1)){this.aiNext=this.clock+.25;
   const p=this.chef,gs=this.goals().map(g=>{const t=g<0?{f:FY.indexOf(this.bonus.y),x:this.bonus.x}:this.aim(this.pieces[g]),r=this.pathTo(t.f,t.x);return[g,r?r.d:1e9]}).sort((a,b)=>a[1]-b[1]).slice(0,5);
   let best=null;for(const [g,d] of gs){const r=this.tryMove(g,null,0,H);const v=r.val-d*40;if(!best||v>best.v)best={g,v,dead:r.dead}}
   if(best&&!best.dead){this.aiGoal=best.g;return this.basePilot()}if(best)this.aiGoal=best.g;
   // Every way in gets the chef caught: try a dodge first, pepper only when nothing else gets clear.
   let alt=null;const f=this.chef.face;
   for(const m of [{axis:-1},{axis:1},{axisY:-1},{axisY:1},{},{axis:f,fire:true},{axis:-f,fire:true},{axisY:-1,fire:true},{axisY:1,fire:true}])for(const hold of m.fire?[.05]:[.3,.9]){const r=this.tryMove(this.aiGoal,m,hold,H*.7+hold);if(!alt||r.val>alt.val)alt={m,hold,val:r.val}}
   this.aiMove={m:alt.m,until:this.clock+alt.hold-1e-9};this.aiNext=this.clock+alt.hold;return out(alt.m)}
  return this.basePilot()}
 snapshot(){const r=v=>+v.toFixed(2);return{state:this.state,clock:r(this.clock),score:this.score,lives:this.lives,stage:this.stage,pepper:this.pepper,chef:{x:r(this.chef.x),y:r(this.chef.y)},
  enemies:this.enemies.map(e=>[e.kind,e.state,r(e.x),r(e.y),e.stun>0]),pieces:this.pieces.map(p=>[p.burger,p.kind,p.state,r(p.y),p.steps.join('')]),stacks:[...this.stacks],bonus:this.bonus?.kind||null}}
}
BurgerEngine.lookAhead=3;
const BurgerCore={CONFIG,STAGES,BurgerEngine,SeededRandom,colX};
g.BurgerCore=BurgerCore;if(typeof module!=='undefined')module.exports=BurgerCore;
})(globalThis);
