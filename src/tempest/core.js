'use strict';
/* Testpest: Atari Tempest (1981) rules, drawn as bugs climbing a tunnel in her graph-paper homework.
   Rules follow the original cabinet: the player's Claw moves lane to lane around the rim of a tube of 16 lanes,
   closed wells wrapping round and open wells stopping at their ends, through the 16 well shapes in turn; up to 8
   shots at a time fly down the lane and hit the first enemy, enemy shot or spike in it; enemies climb from the far
   end: Flippers flip lane to lane as they climb and chase the Claw along the rim, catching it if they flip onto
   its lane; Tankers climb straight and split into two Flippers when shot or at the rim; Spikers climb part way
   leaving a spike behind them, then go back down and come up again as Flippers; Fuseballs ride the lane edges,
   can only be shot while crossing a lane and kill on touch at the rim; Pulsars flip like Flippers and, when they
   pulse, electrify their whole lane; Flippers and Tankers fire up their lane. The Superzapper, once per level,
   destroys every enemy in the tube (zapped Tankers do not split); a second use destroys one. When the tube is clear the Claw warps down to the
   next level: spikes left in the lanes must be dodged (or shot shorter) on the way, and dying on a spike still
   moves on to the next level. Each level sends a set number of enemies (10 on level 1, 20 by level 5, up to 30 by
   level 15) up from the far end, one about every half second, never more than six in the tube at once and each kind
   only up to its own limit for the level, and they climb faster level by level (the tube takes about 6 seconds on
   level 1, 3 on level 8, under 3 by level 16); Flippers come up themselves on levels 1 to 4 only and after that hatch from Tankers
   and Spikers; Tankers from 3 (none on 4), Spikers from 4 (none on 17 to 19), Fuseballs from 11 (none on 17 to 21
   and 26) and twice as fast as the rest, Pulsars from 17; from level 33 some Tankers carry Fuseballs and from 41
   Pulsars; enemy shots are limited per level (two at once on level 1) and come more often as the levels go. Scoring by the cabinet's table:
   Flipper 150, Tanker 100, Spiker 50, Pulsar 200, Fuseball 250 three times in four, else 500 or 750
   at random, each hit on a spike 1; three lives and an extra life every 20,000. Checked 2026-10-26 against Atari's
   source (github.com/historicalsource/tempest: ALEXEC.MAC TUPSCL, ALWELG.MAC fuse and spike scoring, WTANMX and
   WFUSMX wave tables; checked again 2026-10-31 for the wave tables TNYMMX, TINVIN, WxxMIN, WxxMAX, TCHAMX, TCHARFR and
   WTACAR, the six-enemy limit WINVMX, the nymph spacing in ININYM and the fuseball speed in CONTOUR).
   Adaptations (not ROM-exact): the 16 shapes are drawn from outlines and divided into 16 lanes, corners on lane lines; the Claw,
   shot, flip and pulse timings tuned by eye at 120 Hz; the far end's smart choice between a Tanker and a Spiker is simplified; no start-level selection or bonus. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['fire','b'],['zap','b']],lanes:16,shapes:16,
  points:Object.freeze({flipper:150,tanker:100,spiker:50,pulsar:200,spike:1}),fuseballPoints:Object.freeze([250,500,750]),
  lives:3,extraEvery:20000,maxShots:8,shotSpeed:2.6,fireDelay:.1,clawSpeed:9,enemyShotSpeed:.7,
  fps:28,depth:224,maxActive:6,nymphGap:16,fuseballSpeed:2,flipTime:.22,rimFlip:.45,warpTime:2.4,spikeHit:.07,
  pulsePeriod:1.6,pulseOn:.5,deathPause:1.6,
  from:Object.freeze({tanker:3,spiker:4,fuseball:11,pulsar:17})});
class SeededRandom{constructor(seed=1981){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// The 16 wells, as outlines in unit coordinates (y down): [name, closed, points].
const ring=(n,f)=>[...Array(n)].map((_,i)=>f(i/n*Math.PI*2));
const OUTLINES=[
 ['circle',true,ring(64,t=>[Math.cos(t),Math.sin(t)])],
 ['square',true,[[-1,-1],[1,-1],[1,1],[-1,1]]],
 ['plus',true,[[-.35,-1],[.35,-1],[.35,-.35],[1,-.35],[1,.35],[.35,.35],[.35,1],[-.35,1],[-.35,.35],[-1,.35],[-1,-.35],[-.35,-.35]]],
 ['bowtie',true,[[-1,-.8],[0,-.25],[1,-.8],[1,.8],[0,.25],[-1,.8]]],
 ['cross',true,[[-.2,-1],[.2,-1],[.3,-.3],[1,-.2],[1,.2],[.3,.3],[.2,1],[-.2,1],[-.3,.3],[-1,.2],[-1,-.2],[-.3,-.3]]],
 ['triangle',true,[[0,-1],[1,.8],[-1,.8]]],
 ['clover',true,ring(64,t=>{const r=.72+.28*Math.cos(4*t);return [r*Math.cos(t),r*Math.sin(t)]})],
 ['v',false,[[-1,-1],[0,1],[1,-1]]],
 ['steps',false,[[-1,-1],[-1,-.5],[-.5,-.5],[-.5,0],[0,0],[0,.5],[.5,.5],[.5,1],[1,1]]],
 ['u',false,[[-1,-1],[-1,.4],[-.7,.9],[0,1],[.7,.9],[1,.4],[1,-1]]],
 ['flat',false,[[-1,.6],[1,.6]]],
 ['heart',true,ring(64,t=>[16*Math.sin(t)**3,-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))])],
 ['star',true,ring(10,t=>{const r=Math.round(t/(Math.PI/5))%2?.45:1;return [r*Math.sin(t),-r*Math.cos(t)]})],
 ['w',false,[[-1,-1],[-.5,1],[0,-.2],[.5,1],[1,-1]]],
 ['broken-v',false,[[-1,-.9],[-.35,1],[.1,.2],[1,.6]]],
 ['infinity',true,ring(64,t=>{const d=1+Math.sin(t)**2;return [Math.cos(t)/d,1.6*Math.sin(t)*Math.cos(t)/d]})]];
// Each outline is divided into 16 lanes of equal length, fitted to the unit box and turned so that at the bottom of
// the well a higher lane number lies to the right (so Right always moves the Claw right where it starts).
function makeShape([name,closed,pts]){const P=closed?[...pts,pts[0]]:pts,len=[0];for(let i=1;i<P.length;i++)len.push(len[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));
 const total=len[len.length-1],n=C.lanes,edges=P.length-1,out=[],at=(i,t)=>[P[i-1][0]+(P[i][0]-P[i-1][0])*t,P[i-1][1]+(P[i][1]-P[i-1][1])*t];
 if(edges<=n){// Few corners: every corner sits on a lane line and each side gets lanes by its length (largest remainder).
  const want=[...Array(edges)].map((_,i)=>(len[i+1]-len[i])/total*n),cnt=want.map(w=>Math.max(1,Math.floor(w)));let left=n-cnt.reduce((a,b)=>a+b,0);
  const order=want.map((w,i)=>[w-cnt[i],i]).sort((a,b)=>b[0]-a[0]);for(let k=0;left>0;k=(k+1)%edges,left--)cnt[order[k][1]]++;
  cnt.forEach((c,i)=>{for(let k=0;k<c;k++)out.push(at(i+1,k/c))});if(!closed)out.push(P[edges])}
 else for(let k=0;k<(closed?n:n+1);k++){const d=total*k/n;let i=1;while(i<len.length-1&&len[i]<d)i++;out.push(at(i,(d-len[i-1])/(len[i]-len[i-1]||1)))}
 const xs=out.map(p=>p[0]),ys=out.map(p=>p[1]),mx=(Math.max(...xs)+Math.min(...xs))/2,my=(Math.max(...ys)+Math.min(...ys))/2,s=2/Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
 let rim=out.map(([x,y])=>[(x-mx)*s,(y-my)*s]);
 const mid=i=>[(rim[i][0]+rim[(i+1)%rim.length][0])/2,(rim[i][1]+rim[(i+1)%rim.length][1])/2];
 if(closed){let b=0;for(let i=1;i<n;i++)if(mid(i)[1]>mid(b)[1])b=i;if(rim[(b+1)%n][0]<rim[b][0])rim=rim.reverse()}
 else if(rim[n][0]<rim[0][0])rim=rim.reverse();
 let start=0;for(let i=1;i<n;i++){const d=mid(i)[1]-mid(start)[1];if(d>1e-6||d>-1e-6&&Math.abs(i-n/2)<Math.abs(start-n/2))start=i}
 return Object.freeze({name,closed,rim,start})}
const SHAPES=Object.freeze(OUTLINES.map(makeShape));

// The cabinet's wave tables (ALWELG.MAC, SKILL CONTOUR TABLES), read for levels 1 to 99 as the ROM's CONTOUR does.
// T(L,[[from,to,value or list or [start,step]]]): one value for the range, a list item per level, or a start plus a step per level.
const T=(L,rows)=>{for(const [a,b,v,k] of rows)if(L>=a&&L<=b)return Array.isArray(v)?v[L-a]:k===undefined?v:v+k*(L-a);return 0};
const KINDS=['flipper','pulsar','tanker','spiker','fuseball'];
const WAVE=Object.freeze({
 // TNYMMX: enemies waiting at the far end of the tube on each level.
 nymphs:L=>T(L,[[1,16,[10,12,15,17,20,22,20,24,27,29,27,24,26,28,30,27]],[17,26,20,1],[27,39,27],[40,48,29,1],[49,64,31,1],[65,80,35,1],[81,99,43,1]]),
 // TINVIN: climbing speed; the ROM adds it (times 8, in 1/256 units) every frame at about 28 frames a second up a tube 224 units deep, so the tube takes 256/v seconds.
 speed:L=>T(L,[[1,8,44,5],[9,16,[81,84,84,84,88,92,96,96]],[17,25,81,3],[26,32,99,3],[33,39,108,3],[40,48,110,1],[49,64,120,1],[65,99,L%2?160:191]]),
 // WxxMIN and WxxMAX: how many of each kind may be in the tube at once; a kind with no minimum never comes up from the far end itself.
 min:{flipper:L=>T(L,[[1,4,1]]),pulsar:L=>T(L,[[17,32,2],[33,99,1]]),tanker:L=>T(L,[[1,4,[0,0,1,0]],[5,99,1]]),
  spiker:L=>T(L,[[1,4,[0,0,0,1]],[5,16,2],[20,32,1],[35,39,1],[44,99,1]]),fuseball:L=>T(L,[[11,16,1],[22,25,1],[27,99,1]])},
 max:{flipper:L=>T(L,[[1,4,4],[5,16,5],[17,19,3],[20,25,4],[26,99,5]]),pulsar:L=>T(L,[[17,32,[5,3,2,2,2,2,2,2,2,2,2,2,2,3,4,2]],[33,99,3]]),
  tanker:L=>T(L,[[1,5,[0,0,1,0,1]],[6,16,2],[17,32,1],[33,44,2],[45,99,3]]),
  spiker:L=>T(L,[[1,6,[0,0,0,2,3,4]],[7,10,4],[11,16,3],[20,25,2],[26,32,[1,2,2,2,1,1,2]],[35,39,1],[43,99,1]]),
  fuseball:L=>T(L,[[11,16,1],[22,25,1],[27,32,1],[33,39,4],[40,99,3]])},
 // TCHAMX (plus one) and TCHARFR: enemy shots in the tube at once, and frames before an enemy may fire again.
 shots:L=>T(L,[[1,9,[2,2,2,3,4,3,3,4,4]],[10,64,3],[65,99,4]]),
 fireFrames:L=>T(L,[[1,20,80,-3],[21,64,20],[65,99,10]]),
 // WTACAR: a Tanker carries one of four loads, the last two turning to Fuseballs and Pulsars on later levels.
 cargo:L=>['flipper','flipper',L<=32?'flipper':L<=40?'fuseball':'pulsar',L<=48?'flipper':'fuseball']});

class TempestEngine{
 constructor(seed=1981){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.nextExtra=C.extraEvery;this.level=0;this.shotsFired=0;this.nextId=0;this.newLevel();return this}
 r(){return this.rng.next()}
 get shape(){return SHAPES[(this.level-1)%C.shapes]}
 // The kinds that come up from the far end on a level, each with how many may be in the tube at once.
 mix(L){const W=Math.min(L,99),out={};for(const k of KINDS)out[k]=WAVE.min[k](W)>0?WAVE.max[k](W):0;return out}
 // Each level has its number of enemies waiting at the far end; they come up one at a time (see launch).
 newLevel(){this.level++;this.nymphs=WAVE.nymphs(Math.min(this.level,99));
  this.enemies=[];this.shots=[];this.enemyShots=[];this.spikes=Array(C.lanes).fill(1);this.zaps=0;this.claw={pos:this.shape.start,z:0};this.fireTimer=0;this.spawnTimer=this.r()*C.nymphGap/C.fps;this.state='play';this.timer=0;this.warpClock=0;
  this.events.push({type:'level',level:this.level,shape:this.shape.name})}
 get lane(){const n=C.lanes,l=Math.round(this.claw.pos);return this.shape.closed?((l%n)+n)%n:clamp(l,0,n-1)}
 wrap(l){const n=C.lanes;return this.shape.closed?((l%n)+n)%n:l}
 ok(l){return this.shape.closed||(l>=0&&l<C.lanes)}
 speed(){return WAVE.speed(Math.min(this.level,99))/256}
 // The far end lets an enemy up only while fewer than six are in the tube, choosing a kind still under its limit
 // (each Tanker keeps two places for its load): first a kind below its minimum, then any kind that may come up itself.
 launch(){const W=Math.min(this.level,99),n={},open={};for(const k of KINDS)n[k]=0;for(const e of this.enemies)n[e.kind]++;
  if(this.enemies.length>=C.maxActive)return false;
  for(const k of KINDS)open[k]=Math.max(0,WAVE.max[k](W)-n[k]);for(const e of this.enemies)if(e.kind==='tanker')open[e.cargo]=Math.max(0,open[e.cargo]-2);
  const room=C.maxActive+1-this.enemies.length,ok=KINDS.filter(k=>Math.min(open[k],room)>0&&WAVE.min[k](W)>0);if(!ok.length)return false;
  const lane=Math.floor(this.r()*C.lanes),need=ok.find(k=>n[k]<WAVE.min[k](W));
  this.spawn(need||ok[Math.floor(this.r()*ok.length)],lane);this.nymphs--;return true}
 fireGap(){return WAVE.fireFrames(Math.min(this.level,99))/C.fps}
 spawn(kind,lane,z=1){const e={id:this.nextId++,kind,lane,z,from:lane,flip:0,flipTimer:.5+this.r()*1.2,dir:-1,phase:this.r()*C.pulsePeriod,fireTimer:this.fireGap()*(.5+this.r())};
  if(kind==='spiker')e.turn=.25+this.r()*.35;
  if(kind==='tanker')e.cargo=WAVE.cargo(this.level)[Math.floor(this.r()*4)];
  if(kind==='fuseball'){e.edge=lane;e.vz=-1;e.lane=null}
  this.enemies.push(e);return e}
 award(n){this.score+=n;while(this.score>=this.nextExtra){this.nextExtra+=C.extraEvery;this.lives++;this.events.push({type:'extra'})}}
 // The cabinet draws 0 to 7 and pays 250 for 0 or 3 and up, 500 for 1, 750 for 2 (ALWELG.MAC: RANDO2 AND 7).
 fuseballPoints(){const n=Math.floor(this.r()*8);return C.fuseballPoints[n>=3?0:n]}
 // The lane an enemy counts as being in: mid-flip it belongs to the lane it is landing on once past halfway.
 laneOf(e){if(e.kind==='fuseball')return e.flip>0?e.cross:null;return e.flip>0&&e.flip<.5?e.from:e.lane}
 kill(e,points=true,split=true){const i=this.enemies.indexOf(e);if(i<0)return;this.enemies.splice(i,1);
  const pts=!points?0:e.kind==='fuseball'?this.fuseballPoints():C.points[e.kind];this.award(pts);
  this.events.push({type:'kill',kind:e.kind,points:pts,lane:this.laneOf(e)??e.edge,edge:this.laneOf(e)==null,z:e.z});
  if(e.kind==='tanker'&&split)this.split(e)}
 // A Tanker splits into two of its cargo, one in each neighbouring lane.
 split(e){const c=e.cargo||'flipper';for(const d of [-1,1]){const l=this.wrap(e.lane+d);if(!this.ok(l))continue;const n=this.spawn(c,l,e.z);if(c==='fuseball'){n.edge=d<0?e.lane:this.wrap(e.lane+1)}n.flipTimer=.3}this.events.push({type:'split',lane:e.lane})}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'){this.timer-=dt;if(this.timer<=0){if(this.diedWarping)this.newLevel();else this.respawn()}return}
  this.moveClaw(dt,input);this.fire(dt,input);
  if(input.zap&&!this.zapHeld)this.zap();this.zapHeld=!!input.zap;
  this.moveShots(dt);
  if(this.state==='warp'){this.warp(dt);return}
  this.spawnTimer-=dt;if(this.spawnTimer<=0&&this.nymphs>0&&this.launch())this.spawnTimer=C.nymphGap/C.fps;
  for(const e of [...this.enemies])this.moveEnemy(e,dt);
  if(this.state!=='play')return;this.moveEnemyShots(dt);
  if(this.state==='play'&&this.nymphs<=0&&!this.enemies.length){this.state='warp';this.warpClock=0;this.enemyShots=[];this.events.push({type:'cleared',level:this.level})}}
 moveClaw(dt,input){const ax=clamp(Number(input.axis)||0,-1,1)||((input.right?1:0)-(input.left?1:0)),c=this.claw,n=C.lanes;
  if(ax)c.pos+=ax*C.clawSpeed*dt;else c.pos+=(Math.round(c.pos)-c.pos)*Math.min(1,dt*20);
  if(this.shape.closed){if(c.pos<-.5)c.pos+=n;if(c.pos>=n-.5)c.pos-=n}else c.pos=clamp(c.pos,0,n-1)}
 fire(dt,input){this.fireTimer-=dt;if(input.fire&&this.fireTimer<=0&&this.shots.length<C.maxShots){this.fireTimer=C.fireDelay;this.shots.push({lane:this.lane,z:this.claw.z});this.shotsFired++;this.events.push({type:'shot'})}}
 // Shots fly down their lane and stop at the first enemy, enemy shot or spike they meet.
 moveShots(dt){for(const s of [...this.shots]){const z0=s.z;s.z+=C.shotSpeed*dt;let hit=false;
   const es=this.enemyShots.find(b=>b.lane===s.lane&&b.z>=z0-.03&&b.z<=s.z+.03);if(es){this.enemyShots.splice(this.enemyShots.indexOf(es),1);hit=true}
   if(!hit){const e=this.enemies.filter(e=>this.laneOf(e)===s.lane&&e.z>=z0-.04&&e.z<=s.z+.04).sort((a,b)=>a.z-b.z)[0];if(e){this.kill(e);hit=true}}
   if(!hit&&this.spikes[s.lane]<1&&s.z>=this.spikes[s.lane]){this.spikes[s.lane]=Math.min(1,this.spikes[s.lane]+C.spikeHit);this.award(C.points.spike);this.events.push({type:'spike',lane:s.lane,z:s.z});hit=true}
   if(hit||s.z>=1)this.shots.splice(this.shots.indexOf(s),1)}}
 startFlip(e,d){const l=this.wrap(e.lane+d);if(!this.ok(l))return false;e.from=e.lane;e.lane=l;e.flip=1e-6;e.dir=d;return true}
 moveEnemy(e,dt){const sp=this.speed();e.phase=(e.phase+dt)%C.pulsePeriod;
  if(e.kind==='fuseball')return this.moveFuseball(e,dt,sp);
  if(e.flip>0){e.flip+=dt/C.flipTime;if(e.flip>=1){e.flip=0;if(e.z<=0&&e.lane===this.lane&&(e.kind==='flipper'||e.kind==='pulsar'))return this.die('caught')}else return}
  if(e.kind==='spiker'){e.z+=(e.dir<0?-1:1)*sp*dt;if(e.dir<0){this.spikes[e.lane]=Math.min(this.spikes[e.lane],e.z);if(e.z<=e.turn)e.dir=1}
   else if(e.z>=1){e.kind='flipper';e.z=1;e.dir=-1;e.flipTimer=.5}return}
  if(e.z>0){e.z=Math.max(0,e.z-(e.kind==='pulsar'?WAVE.speed(1)/256:sp)*dt);
   if(e.z<=0&&e.kind==='tanker'){this.kill(e,false);return}
   if(e.kind!=='tanker'){e.flipTimer-=dt;if(e.flipTimer<=0){e.flipTimer=.6+this.r()*1.2;this.startFlip(e,this.r()<.5?-1:1)}}
   if((e.kind==='flipper'||e.kind==='tanker')&&e.z>.15){e.fireTimer-=dt;if(e.fireTimer<=0&&this.enemyShots.length<WAVE.shots(Math.min(this.level,99))){e.fireTimer=this.fireGap()*(1+this.r());this.enemyShots.push({lane:e.lane,z:e.z});this.events.push({type:'enemyShot'})}}}
  else{// At the rim it chases the Claw, flipping toward it the short way round.
   if(e.lane===this.lane&&e.kind!=='tanker')return this.die('caught');
   e.flipTimer-=dt;if(e.flipTimer<=0){e.flipTimer=C.rimFlip;const n=C.lanes;let d=this.lane-e.lane;if(this.shape.closed){d=((d%n)+n)%n;if(d>n/2)d-=n}this.startFlip(e,Math.sign(d)||1)}}
  // A pulsing Pulsar electrifies its whole lane.
  if(e.kind==='pulsar'&&this.pulsing(e)&&e.flip===0&&e.lane===this.lane)this.die('pulsar')}
 pulsing(e){return e.kind==='pulsar'&&e.phase>C.pulsePeriod-C.pulseOn}
 // Fuseballs ride the lane edges up and down, now and then crossing a lane (only then can they be shot).
 moveFuseball(e,dt,sp){if(e.flip>0){e.flip+=dt/(C.flipTime*2);if(e.flip>=1){e.flip=0;e.edge=e.to}}
  else{e.z=clamp(e.z+e.vz*sp*C.fuseballSpeed*dt,0,1);if(e.z<=0){e.rim=(e.rim||0)+dt;e.vz=0;if(e.rim>1.5){e.rim=0;e.vz=1}}else if(e.z>=1)e.vz=-1;else if(this.r()<dt*.5)e.vz=-e.vz;
   e.flipTimer-=dt;if(e.flipTimer<=0){e.flipTimer=e.z<=0?.5:.8+this.r()*1.5;let d=this.r()<.5?-1:1;if(e.z<=0){const n=C.lanes;let k=this.lane-e.edge;if(this.shape.closed){k=((k%n)+n)%n;if(k>n/2)k-=n}d=k>=0?1:-1}
    const to=this.shape.closed?this.wrap(e.edge+d):e.edge+d;if(to>=0&&to<=(this.shape.closed?C.lanes-1:C.lanes)){e.cross=d>0?e.edge:this.wrap(e.edge-1);e.to=to;e.flip=1e-6}}}
  if(e.z<.04){const l=this.lane;if(e.flip>0?e.cross===l:(e.edge===l||this.wrap(e.edge-1)===l&&this.shape.closed||e.edge-1===l))this.die('fuseball')}}
 moveEnemyShots(dt){for(const b of [...this.enemyShots]){b.z-=C.enemyShotSpeed*dt;if(b.z<=0){this.enemyShots.splice(this.enemyShots.indexOf(b),1);if(b.lane===this.lane)return this.die('shot')}}}
 // Superzapper: the first use clears the tube, the second takes out one enemy; then nothing until the next level.
 zap(){if(this.zaps>=2||this.state!=='play')return;this.zaps++;const list=this.zaps===1?[...this.enemies]:this.enemies.length?[this.enemies[Math.floor(this.r()*this.enemies.length)]]:[];
  for(const e of list)this.kill(e,true,false);if(this.zaps===1)this.enemyShots=[];this.events.push({type:'zap',use:this.zaps,count:list.length})}
 // The warp: the Claw dives down its lane to the next level; a spike reaching up to it is fatal.
 warp(dt){this.warpClock+=dt;const c=this.claw;c.z=Math.min(1,(this.warpClock/C.warpTime)**1.6);
  if(c.z>=this.spikes[this.lane]&&this.spikes[this.lane]<1)return this.die('spike');
  if(this.warpClock>=C.warpTime)this.newLevel()}
 die(cause){if(this.state==='dead'||this.state==='end')return;this.diedWarping=this.state==='warp';this.lives--;this.events.push({type:'death',cause,lane:this.lane,z:this.claw.z,lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // After a lost life the enemies still in the tube go back to the far end and come again; spikes stay.
 respawn(){this.nymphs+=this.enemies.length;
  this.enemies=[];this.shots=[];this.enemyShots=[];this.claw={pos:this.shape.start,z:0};this.spawnTimer=.8;this.state='play'}
 // Demo pilot: heads for the enemy nearest the rim and keeps firing, zaps when one is about to reach the rim,
 // steps out of a pulsing lane and, in the warp, slides to the lane with the shortest spike.
 pilot(){const n=C.lanes,dist=l=>{let d=l-this.lane;if(this.shape.closed){d=((d%n)+n)%n;if(d>n/2)d-=n}return d};let target=this.lane;
  if(this.state==='warp'){let best=this.lane;for(let l=0;l<n;l++)if(this.spikes[l]>this.spikes[best]+.01||this.spikes[l]===this.spikes[best]&&Math.abs(dist(l))<Math.abs(dist(best)))best=l;target=best}
  else{const list=this.enemies.filter(e=>e.kind!=='fuseball'||e.flip>0).sort((a,b)=>a.z-b.z);if(list.length)target=this.laneOf(list[0])??list[0].lane;
   const shot=this.enemyShots.find(b=>b.lane===this.lane&&b.z<.15);if(shot)target=this.lane+1}
  const danger=l=>this.enemies.some(e=>(this.pulsing(e)&&e.lane===l)||e.z<.08&&(e.lane===l||e.kind==='fuseball'&&(e.edge===l||e.edge===l+1)));
  let d=dist(this.wrap(target));if(d&&danger(this.wrap(this.lane+Math.sign(d))))d=0;if(danger(this.lane))d=dist(this.wrap(this.lane+1))&&!danger(this.wrap(this.lane+1))?1:-1;
  const zap=this.zaps===0&&this.enemies.some(e=>e.z<.06&&e.kind!=='tanker')&&this.enemies.length>=3;
  return{axis:clamp(d,-1,1),fire:true,zap}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,level:this.level,shape:this.shape.name,lane:this.lane,shots:this.shotsFired,queue:this.nymphs,zaps:this.zaps,
  enemies:this.enemies.map(e=>[e.kind,e.lane??e.edge,+e.z.toFixed(3)]),spikes:this.spikes.map(z=>+z.toFixed(3))}}
}
const TestpestCore={CONFIG,TempestEngine,SeededRandom,SHAPES};
g.TestpestCore=TestpestCore;if(typeof module!=='undefined')module.exports=TestpestCore;
})(globalThis);
