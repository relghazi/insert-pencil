'use strict';
/* Q*Nerd: Gottlieb Q*bert (1982) rules, drawn as a nerd boy hopping over a pyramid of stacked school books.
   Rules follow the original cabinet: a pyramid of 28 cubes in seven rows seen isometrically; the player hops
   diagonally from cube to cube (the cabinet's stick is mounted turned 45 degrees) and every landing changes the
   cube top towards the target colour; level 1 needs one hop per cube, level 2 two hops (start, middle, target),
   level 3 one hop but a finished cube toggles back, level 4 two hops and a finished cube falls back to the middle
   colour, level 5 and every level after it two hops and a third hop turns a finished cube back to the start colour;
   each level has four rounds; the discs by round and which enemies come in each round follow the cabinet's round
   table (level 1 rounds 1 and 2 only red balls and Coily, round 3 no red balls, Ugg and Wrongway from round 3, all of
   them from level 5). Jumping off the pyramid loses a life, unless a spinning disc waits at that
   spot on the side: it carries the player to the top. Red balls drop on the second row and bounce down and off;
   the purple ball bounces to the bottom row and hatches into Coily, the snake who chases the player and follows
   him off the edge when the player rides a disc away (500); Ugg and Wrongway come in from the bottom corners and
   walk sideways along the cube sides; Slick and Sam bounce down turning cubes back to the start colour and are
   worth 300 when caught; the green ball freezes everything else for a while when caught (100). Contact with any
   other enemy loses a life and clears the pyramid of enemies. Scoring by the cabinet's table (Gottlieb instruction manual, checked 2026-10-26): 25 for each
   change to the target colour, 15 to the middle colour (levels 2 and 4), 500 for luring Coily off, 300 for Slick or Sam, 100 for the green ball, a round bonus of 1,000 rising by
   250 each round (up to 5,000) and 50 for every disc left unused; three lives, an extra life at 8,000 and then
   every 14,000.
   Round table checked 2026-10-31 (arcade-museum.com Q*bert round table: discs and characters by level and round);
   level 5 to 9 colour rule from the instruction manual (levels 6 to 9 as level 5).
   Adaptations (not ROM-exact): after level 9 the level 9 table repeats; a fall off the pyramid
   restarts the player on the top cube; disc places, spawn timings and hop speeds tuned by eye at
   120 Hz; enemies are spawned from a seeded schedule rather than the ROM's tables. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['dir','e',[null,'ur','ul','dr','dl']]],
  rows:7,cubeW:100,halfTop:28,side:52,x0:512,y0:168,body:30,
  points:Object.freeze({change:25,middle:15,coily:500,catch:300,green:100,disc:50,bonus:1000,bonusStep:250,bonusMax:5000}),
  modes:Object.freeze(['one','two','toggle','twoBack','cycle']),roundsPerLevel:4,
  // The cabinet's round table, levels 1 to 6 (6 stands for 6 to 9): discs by round, and the enemies of each round
  // (r red balls, g green ball, u Ugg and Wrongway, s Slick and Sam; Coily comes in every round).
  discs:Object.freeze([[2,2,2,2],[3,3,2,2],[4,4,3,3],[6,6,5,4],[7,6,6,5],[5,5,5,5]]),
  roster:Object.freeze([['r','r','gus','rgs'],['gus','gus','rgs','rgus'],['rgs','gus','rgus','rgus'],['rgs','rgus','rgs','rgus'],['rgus','rgus','rgus','rgus'],['rgus','rgus','rgus','rgus']]),
  lives:3,extraFirst:8000,extraEvery:14000,
  hopTime:.3,enemyHop:.28,enemyRest:Object.freeze([.62,.3]),coilyRest:Object.freeze([.55,.28]),dropTime:.45,hatchTime:1.1,
  fallTime:1.1,discTime:2,freezeTime:4,hitR:42,
  spawnFirst:1.6,spawnDelay:Object.freeze([2.4,4.8]),maxEnemies:Object.freeze([2,5]),
  deathPause:1.6,clearPause:2.4});
class SeededRandom{constructor(seed=1981){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rowH=C.halfTop+C.side;
// Cube (r,c): row r from the top, c from 0 to r. The four diagonal hops of the cabinet.
const MOVES=Object.freeze({ur:[-1,0],ul:[-1,-1],dr:[1,1],dl:[1,0]});
const onPyramid=(r,c)=>r>=0&&r<C.rows&&c>=0&&c<=r;
const top=(r,c)=>({x:C.x0+(c-r/2)*C.cubeW,y:C.y0+r*rowH});
const spot=(r,c)=>{const t=top(r,c);return{x:t.x,y:t.y-C.body}};
// Distance in hops: every move changes either c or r-c by one.
// Where the disc lifts the player to, just above the top cube.
const lift=()=>({x:C.x0,y:C.y0-rowH*1.3-C.body});
const hops=(a,b)=>Math.abs(a.c-b.c)+Math.abs((a.r-a.c)-(b.r-b.c));
class QbertEngine{
 constructor(seed=1981){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.nextExtra=C.extraFirst;this.level=1;this.round=1;this.rounds=0;this.hops=0;this.state='play';this.timer=0;this.newRound();return this}
 between([a,b]){return a+(b-a)*this.rng.next()}
 mode(){return C.modes[Math.min(this.level,5)-1]}
 roster(){return C.roster[Math.min(this.level,6)-1][this.round-1]}
 target(){return this.mode()==='one'||this.mode()==='toggle'?1:2}
 speed(){return clamp((this.rounds-1)/16,0,1)}
 lerp([a,b]){return a+(b-a)*this.speed()}
 newRound(){this.rounds++;this.cubes=[...Array(C.rows)].map((_,r)=>Array(r+1).fill(0));this.enemies=[];this.freeze=0;this.spawns=0;this.spawnTimer=C.spawnFirst;
  // Discs sit beside the pyramid where a hop off the left or right edge would land.
  const n=C.discs[Math.min(this.level,C.discs.length)-1][this.round-1],spots=[];for(let r=1;r<=5;r++)spots.push(['L',r],['R',r]);
  this.discs=[];while(this.discs.length<n){const [side,r]=spots.splice(Math.floor(this.rng.next()*spots.length),1)[0];this.discs.push({side,r,c:side==='L'?-1:r+1})}
  this.placeQ(0,0);this.events.push({type:'round',level:this.level,round:this.round})}
 placeQ(r,c){this.q={r,c,fr:r,fc:c,t:0,state:'stand',dir:'dl',launch:null,ft:0}}
 award(n){this.score+=n;while(this.score>=this.nextExtra){this.nextExtra+=C.extraEvery;this.lives++;this.events.push({type:'extra'})}}
 direction(i){if(i.dir&&MOVES[i.dir])return i.dir;const ax=clamp(Number(i.axis)||0,-1,1)||((i.right?1:0)-(i.left?1:0)),ay=clamp(Number(i.axisY)||0,-1,1)||((i.down?1:0)-(i.up?1:0));
  // A diagonal push picks that diagonal; a single direction follows the cabinet's turned stick: up is up-right, right is down-right, down is down-left, left is up-left.
  if(Math.abs(ax)>.3&&Math.abs(ay)>.3)return(ay<0?'u':'d')+(ax<0?'l':'r');
  return ay<-.5?'ur':ax>.5?'dr':ay>.5?'dl':ax<-.5?'ul':null}
 // Movers hop in an arc from one spot to another; positions are the centre of the body.
 pos(o){const p=o.dur?clamp(o.t/o.dur,0,1):1,a=o.from||spot(o.r,o.c),b=spot(o.r,o.c);
  if(o.phase==='drop')return{x:b.x,y:a.y+(b.y-a.y)*p*p};
  if(o.phase==='fall'||o.state==='fall')return{x:b.x,y:b.y+900*o.ft*o.ft};
  if(o.phase==='hop'||o.state==='hop')return{x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p-Math.sin(Math.PI*p)*(o.arc??34)};
  return b}
 qpos(){const q=this.q;if(q.state==='disc'){const d=this.discOf(q),a=spot(d.r,d.c),b=lift(),p=clamp(q.t/C.discTime,0,1);return{x:a.x+(b.x-a.x)*p,y:a.y+(b.y-a.y)*p}}
  if(q.state==='land'){const a=lift(),b=spot(0,0),p=clamp(q.t/C.dropTime,0,1);return{x:b.x,y:a.y+(b.y-a.y)*p*p}}
  return this.pos({...q,from:spot(q.fr,q.fc),dur:C.hopTime,arc:q.r<q.fr?44:30})}
 discAt(r,c){return this.discs.find(d=>d.r===r&&d.c===c)}
 discOf(q){return q.disc}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0)this.state==='cleared'?this.nextRound():this.resume();return}
  this.moveQ(dt,input);if(this.state!=='play')return;
  if(this.freeze>0)this.freeze-=dt;else{this.spawn(dt);for(const e of [...this.enemies])this.moveEnemy(e,dt)}
  if(this.state==='play')this.collide()}
 moveQ(dt,input){const q=this.q;q.t+=dt;
  if(q.state==='stand'){const d=this.direction(input);if(d)this.hop(d)}
  else if(q.state==='hop'&&q.t>=C.hopTime)this.landQ();
  else if(q.state==='fall'){q.ft+=dt;if(q.ft>=C.fallTime)this.die('fall')}
  else if(q.state==='disc'&&q.t>=C.discTime){q.state='land';q.t=0}
  else if(q.state==='land'&&q.t>=C.dropTime){this.discs=this.discs.filter(d=>d!==q.disc);q.r=q.c=q.fr=q.fc=0;q.state='stand';q.disc=null;q.launch=null;q.t=0;this.colour(0,0)}}
 hop(d){const q=this.q,[dr,dc]=MOVES[d];q.fr=q.r;q.fc=q.c;q.r+=dr;q.c+=dc;q.dir=d;q.state='hop';q.t=0;this.hops++;this.events.push({type:'hop'});
  if(!onPyramid(q.r,q.c)&&this.discAt(q.r,q.c))q.launch={r:q.fr,c:q.fc,dir:d}}
 landQ(){const q=this.q;q.t=0;
  if(onPyramid(q.r,q.c)){q.state='stand';this.colour(q.r,q.c);return}
  const d=this.discAt(q.r,q.c);if(d){q.state='disc';q.disc=d;this.events.push({type:'disc'});return}
  // Off the edge: he drops out of sight, behind the pyramid if he jumped up and away.
  q.state='fall';q.ft=0;q.behind=q.r<q.fr;this.events.push({type:'jumpoff'})}
 // Landing on a cube top moves it along the round's colour rule; 25 for reaching the target colour, 15 for the middle one.
 colour(r,c){const v=this.cubes[r][c],m=this.mode(),T=this.target();let n=v;
  if(v<T)n=v+1;else if(m==='toggle'||m==='cycle')n=0;else if(m==='twoBack')n=1;
  if(n===v)return;this.cubes[r][c]=n;if(n>v){this.award(n===T?C.points.change:C.points.middle);this.events.push({type:'change',r,c,value:n})}else this.events.push({type:'undo',r,c,value:n});
  if(this.cubes.every(row=>row.every(x=>x===T)))this.clear()}
 clear(){const bonus=Math.min(C.points.bonusMax,C.points.bonus+C.points.bonusStep*(this.rounds-1)),discs=this.discs.length*C.points.disc;this.award(bonus+discs);this.enemies=[];this.state='cleared';this.timer=C.clearPause;
  this.events.push({type:'cleared',bonus,discs,level:this.level,round:this.round})}
 nextRound(){this.state='play';if(++this.round>C.roundsPerLevel){this.round=1;this.level++;this.events.push({type:'level',level:this.level})}this.newRound()}
 // Enemies: a seeded schedule; the first is a red ball, the second the purple ball.
 spawn(dt){this.spawnTimer-=dt;if(this.spawnTimer>0)return;this.spawnTimer=this.between(C.spawnDelay)*(1-.4*this.speed());
  if(this.enemies.length>=Math.round(this.lerp(C.maxEnemies))||this.q.state!=='stand'&&this.q.state!=='hop')return;
  // Only the round's own enemies come; with no red balls the purple ball comes first.
  const R=this.roster(),x=this.rng.next(),snake=this.enemies.some(e=>e.kind==='purple'||e.kind==='coily');let kind=R.includes('r')?'red':null;
  if(this.spawns===1&&!snake||this.spawns===0&&!kind)kind='purple';else if(this.spawns>1||!R.includes('r')){if(!snake&&x<.3)kind='purple';else if(R.includes('u')&&x<.45)kind=this.rng.next()<.5?'ugg':'wrong';else if(R.includes('s')&&x<.6)kind=this.rng.next()<.5?'slick':'sam';else if(R.includes('g')&&x<.7&&!this.enemies.some(e=>e.kind==='green'))kind='green'}
  if(!kind)return;this.spawns++;this.add(kind)}
 add(kind,r,c){let e;
  // Ugg and Wrongway stand on cube sides: they are kept as the spot a player would stand on, one row below the side they cling to.
  if(kind==='ugg'||kind==='wrong'){r=C.rows;c=kind==='ugg'?C.rows:0;const s=spot(r,c);e={kind,r,c,from:{x:s.x+(kind==='ugg'?240:-240),y:s.y+160},phase:'hop',t:0,dur:C.dropTime,arc:60}}
  else{r??=1;c??=Math.floor(this.rng.next()*2);const s=spot(r,c);e={kind,r,c,from:{x:s.x,y:s.y-360},phase:'drop',t:0,dur:C.dropTime}}
  e.id=this.spawns;e.ft=0;this.enemies.push(e);this.events.push({type:'enter',kind});return e}
 rest(e){return this.lerp(e.kind==='coily'?C.coilyRest:C.enemyRest)}
 moveEnemy(e,dt){e.t+=dt;
  if(e.phase==='fall'){e.ft+=dt;if(e.ft>=C.fallTime)this.remove(e);return}
  if((e.phase==='drop'||e.phase==='hop')&&e.t>=e.dur){this.landEnemy(e);return}
  if(e.phase==='wait'&&e.t>=e.dur){if(e.kind==='purple'&&e.r===C.rows-1){e.kind='coily';e.phase='wait';e.t=0;e.dur=this.rest(e);this.events.push({type:'hatch'});return}this.nextHop(e)}}
 landEnemy(e){e.t=0;e.from=null;
  if(e.kind==='ugg'||e.kind==='wrong'){if(!this.sideOk(e)){e.phase='fall';e.ft=0;return}}
  else if(!onPyramid(e.r,e.c)){e.phase='fall';e.ft=0;e.behind=e.lured;if(e.lured){this.award(C.points.coily);this.events.push({type:'coily',points:C.points.coily,...this.pos(e)});
   // As on the cabinet, Coily's fall clears the pyramid: the balls and the rest come back after a few seconds.
   this.enemies=[e];this.spawns=Math.max(this.spawns,2);this.spawnTimer=C.spawnFirst*2}return}
  // Slick and Sam turn the cube they land on back to the start colour.
  if((e.kind==='slick'||e.kind==='sam')&&this.cubes[e.r][e.c]){this.cubes[e.r][e.c]=0;this.events.push({type:'undo',r:e.r,c:e.c,value:0})}
  e.phase='wait';e.dur=e.kind==='purple'&&e.r===C.rows-1?C.hatchTime:this.rest(e)}
 sideOk(e){const r=e.r-1,c=e.kind==='ugg'?e.c-1:e.c;return onPyramid(r,c)}
 nextHop(e){let d;
  if(e.kind==='ugg')d=this.rng.next()<.5?[0,-1]:[-1,-1];
  else if(e.kind==='wrong')d=this.rng.next()<.5?[0,1]:[-1,0];
  else if(e.kind==='coily')d=MOVES[this.chase(e)];
  else d=this.rng.next()<.5?MOVES.dl:MOVES.dr;
  e.from=spot(e.r,e.c);e.r+=d[0];e.c+=d[1];e.phase='hop';e.t=0;e.dur=C.enemyHop;e.arc=e.kind==='ugg'||e.kind==='wrong'?18:30}
 // Coily heads for the player; while the player rides a disc he heads for the cube the player left and follows him off.
 chase(e){const q=this.q,l=q.launch;
  if(l&&(q.state==='disc'||q.state==='hop')){if(e.r===l.r&&e.c===l.c){e.lured=true;return l.dir}return this.toward(e,l)}
  return this.toward(e,{r:q.r,c:q.c})}
 toward(e,t){let best=null,bd=1e9;for(const [k,[dr,dc]] of Object.entries(MOVES)){const r=e.r+dr,c=e.c+dc;if(!onPyramid(r,c))continue;const d=hops({r,c},t)*10+Math.abs(r-t.r);if(d<bd){bd=d;best=k}}return best}
 remove(e){this.enemies=this.enemies.filter(x=>x!==e)}
 collide(){const q=this.q;if(q.state!=='stand'&&q.state!=='hop')return;const p=this.qpos();
  for(const e of this.enemies){if(e.phase==='fall')continue;const o=this.pos(e);if(Math.hypot(o.x-p.x,o.y-p.y)>=C.hitR)continue;
   if(e.kind==='slick'||e.kind==='sam'){this.remove(e);this.award(C.points.catch);this.events.push({type:'catch',kind:e.kind,points:C.points.catch,x:o.x,y:o.y})}
   else if(e.kind==='green'){this.remove(e);this.award(C.points.green);this.freeze=C.freezeTime;this.events.push({type:'freeze',points:C.points.green,x:o.x,y:o.y})}
   else return this.die('hit',e)}}
 die(how,e){const q=this.q;this.lives--;this.events.push({type:'death',how,by:e?.kind,lives:this.lives,...this.qpos()});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // After a lost life the pyramid is cleared of enemies; a fall puts the player back on the top cube.
 resume(){const q=this.q;this.enemies=[];this.freeze=0;this.spawns=0;this.spawnTimer=C.spawnFirst;if(q.state==='fall')this.placeQ(0,0);else if(onPyramid(q.r,q.c))this.placeQ(q.r,q.c);else this.placeQ(q.fr,q.fc);this.state='play'}
 // Demo pilot: hops towards the nearest unfinished cube, never off the edge, away from anything that hurts; takes a disc when Coily is close.
 pilot(){const q=this.q;if(q.state!=='stand')return{};const T=this.target(),snake=this.enemies.find(e=>e.kind==='coily'&&e.phase!=='fall');
  const bad=new Set();for(const e of this.enemies){if(e.phase==='fall'||['slick','sam','green'].includes(e.kind))continue;
   const cells=[[e.r,e.c]];if(e.kind==='coily')for(const [dr,dc] of Object.values(MOVES))cells.push([e.r+dr,e.c+dc]);else if(e.kind==='ugg'||e.kind==='wrong')cells.push([e.r,e.c+(e.kind==='ugg'?-1:1)],[e.r-1,e.c-(e.kind==='ugg'?1:0)]);else cells.push([e.r+1,e.c],[e.r+1,e.c+1]);
   for(const [r,c] of cells)bad.add(r+','+c)}
  const todo=[];this.cubes.forEach((row,r)=>row.forEach((v,c)=>{if(v!==T)todo.push({r,c})}));
  let best=null,bv=-1e9;for(const [k,[dr,dc]] of Object.entries(MOVES)){const r=q.r+dr,c=q.c+dc;let v;
   if(!onPyramid(r,c))v=this.discAt(r,c)&&snake&&hops(snake,q)<=2?500:-1e6;
   else{v=bad.has(r+','+c)?-1e4:0;if(this.cubes[r][c]!==T)v+=20;v-=todo.length?Math.min(...todo.map(t=>hops(t,{r,c}))):0;if(snake)v+=hops(snake,{r,c})*2;
    for(const e of this.enemies)if(['slick','sam','green'].includes(e.kind)&&e.r===r&&e.c===c)v+=30}
   v+=((this.hops*7+k.charCodeAt(1))%5)*.1;if(v>bv){bv=v;best=k}}
  return bv>-1e5?{dir:best}:{}}
 snapshot(){const q=this.q;return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,level:this.level,round:this.round,hops:this.hops,
  cubes:this.cubes.map(r=>r.join('')).join('/'),q:{r:q.r,c:q.c,state:q.state},enemies:this.enemies.map(e=>[e.kind,e.r,e.c,e.phase]),discs:this.discs.map(d=>d.side+d.r),freeze:+this.freeze.toFixed(3)}}
}
const QnerdCore={CONFIG,QbertEngine,SeededRandom,MOVES,top,spot,lift,onPyramid,hops};
g.QnerdCore=QnerdCore;if(typeof module!=='undefined')module.exports=QnerdCore;
})(globalThis);
