'use strict';
/* Robotron: Class of 2084: Williams Robotron: 2084 (1982) rules, drawn as a class photo in the gym gone badly wrong.
   Rules follow the original cabinet: twin-stick play, one stick moves in eight directions and the other fires in
   eight directions, both at once; every wave starts with the player in the middle of the arena and the robots
   scattered around; Grunts (100) home in on the player in jerky steps and speed up the longer the wave lasts, and die
   on Electrodes; Electrodes stand still, kill on touch and score nothing when shot (RRP8 PSTKIL has no score call); Hulks cannot be destroyed, wander, crush the humans they
   meet, and a shot only pushes them back; Spheroids (1000) drift and spawn Enforcers (150) that shoot sparks at the
   player; Brains (500) hunt the humans and reprogram them into Progs (100) that chase the player, and fire homing
   cruise missiles; Quarks (1000) bounce about spawning Tanks (200) whose shells bounce off the walls; the last human
   family (Mommy, Daddy, Mikey) wanders the arena and touching one rescues it for 1000, 2000, 3000, 4000, then 5000 for
   every further rescue in the wave; the bonus starts again at 1000 each wave and after a lost life; a wave ends when
   every robot that can be destroyed is gone (Hulks and Electrodes stay); a lost life puts the player back in the
   middle and scatters the remaining robots again; three lives and an extra life every 25,000.
   Waves follow the cabinet's pattern: brain waves every fifth wave from wave 5 (each with one kind of human), tank
   waves (Quarks) from wave 7 and every fifth wave after it, a grunt-heavy wave before each brain wave.
   From the cabinet's own program (Williams' Robotron source, RRG23.ASM wave table WVTAB/WVCNT and the robot, hulk,
   brain, circle and tank processes in RRP8, RRH11, RRB10, RRC11 and RRTK4; corrected 2026-10-26, these replace
   values that had been tuned by eye and made the game far too easy):
   - the robot counts of all 40 waves come from the cabinet's table, and after wave 40 waves 21 to 40 repeat;
   - Grunts step 4 pixels every 1 to ROBSPD ticks of 4 frames (ROBSPD and its floor RMXSPD per wave from the table);
     every 3.75 seconds both drop (the floor by 1, ROBSPD by 2, twice that while the player scores nothing), each Grunt
     shot speeds the rest up by an eighth, and a lost life only puts the floor back;
   - Hulks step 3 to 4 pixels across or 2 lines up and down every HLKSPD frames (8 on wave 1, 5 from wave 12),
     changing course after 1 to 32 steps; Brains step a pixel pair and a line every BRNSPD frames and fire a cruise
     missile every BSHTIM steps (at most 8 in the air);
   - Enforcers fire every ENSTIM ticks of 3 frames (at most 20 sparks), at most 8 Enforcers at once; Spheroids drop
     their first after CDPTIM ticks of 10 frames and then one every CDPTIM/4 ticks of 16, 3 to 6 each, then fly out
     of the arena; Quarks the same with TDPTIM (15 and 3 frame ticks) and at most 20 Tanks, then fly out;
   - the laser fires every 8 frames with at most 4 in the air, 6 pixels and 6 lines a frame (RRG23 LSPROC);
   - Tanks move a pixel and a line every 2 frames and fire every TNKSHT ticks of 2 frames; the player moves a pixel
     and a line every frame, so diagonals are faster, as on the cabinet.
   Adaptations (not ROM-exact): cabinet pixels are scaled to the 4:3 page; the random draws use the cabinet's
   formulas with this game's seeded generator; shell speed, human and Prog movement are tuned by eye; sparks, cruise
   missiles and shells can be shot down for 25 each; robots materialise during a short pause at the start of each
   wave and life. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['axisY','n',-1,1,20],['aimX','n',-1,1,20],['aimY','n',-1,1,20]],
  left:24,top:64,right:1000,bottom:748,safe:190,
  points:Object.freeze({grunt:100,electrode:0,hulk:0,spheroid:1000,enforcer:150,brain:500,prog:100,quark:1000,tank:200,spark:25,missile:25,shell:25}),
  rescue:1000,rescueMax:5000,lives:3,extraEvery:25000,
  playerSpeed:210,playerR:13,frame:1/60,shotSpeed:360,fireEvery:8/60,maxShots:4,shotLen:16,
  radius:Object.freeze({grunt:13,electrode:12,hulk:20,spheroid:14,enforcer:11,brain:15,prog:12,quark:14,tank:16,human:12,spark:6,missile:7,shell:7}),
  // Cabinet pixels to page units: the arena is 272 by 210 pixels on the cabinet.
  px:(1000-24)/272,line:(748-64)/210,
  gruntTick:4,rampFirst:4.5,rampEvery:3.75,rampMax:30,
  hulkPush:20,humanSpeed:38,progSpeed:150,programTime:.8,
  spheroidSpeed:150,enforcerSpeed:170,quarkSpeed:190,maxEnforcers:8,maxTanks:20,maxSparks:20,maxMissiles:8,maxShells:20,
  sparkSpeed:280,sparkLife:2.4,missileSpeed:150,missileLife:6,shellSpeed:260,shellLife:4.5,shellBounces:4,
  enterTime:1,deathPause:1.6,waveDelay:1.4});
class SeededRandom{constructor(seed=1982){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),cx=(C.left+C.right)/2,cy=(C.top+C.bottom)/2;
// Eight directions, from any stick or pair of keys: a dead centre, then the nearest 45 degree step.
const dir8=(x,y)=>{const m=Math.hypot(x,y);if(m<.3)return null;const a=Math.round(Math.atan2(y,x)/(Math.PI/4))*(Math.PI/4);return{x:Math.round(Math.cos(a)*1e6)/1e6,y:Math.round(Math.sin(a)*1e6)/1e6}};
const KILL=['grunt','spheroid','enforcer','brain','prog','quark','tank'],FAMILY=['mommy','daddy','mikey'];
// The cabinet's wave table (RRG23.ASM, WVCNT) for waves 1 to 40: grunts, electrodes, mommies, daddies, mikeys, hulks,
// brains, spheroids, quarks. After wave 40 the cabinet goes back to wave 21.
const COUNTS=[
 [15,17,22,34,20,32,0,35,60,25,35,0,35,27,25,35,0,35,70,25,35,0,35,0,25,35,0,35,75,25,35,0,35,30,27,35,0,35,80,30],
 [5,15,25,25,20,25,0,25,0,20,25,0,25,5,20,25,0,25,0,20,25,0,25,0,20,25,0,25,0,20,25,0,25,0,15,25,0,25,0,15],
 [1,1,2,2,15,3,4,3,3,0,3,3,3,5,0,3,3,3,3,8,3,3,3,3,25,3,3,3,3,0,3,3,3,3,0,3,3,3,3,10],
 [1,1,2,2,0,3,4,3,3,22,3,3,3,5,0,3,3,3,3,8,3,3,3,3,0,3,3,3,3,25,3,3,3,3,0,3,3,3,3,10],
 [0,1,2,2,1,3,4,3,3,0,3,3,3,5,22,3,3,3,3,8,3,3,3,3,1,3,3,3,3,0,3,3,3,3,25,3,3,3,3,10],
 [0,5,6,7,0,7,12,8,4,0,8,13,8,20,2,3,14,8,3,2,8,15,8,13,1,8,16,8,4,1,8,16,8,25,2,8,16,8,6,2],
 [0,0,0,0,15,0,0,0,0,20,0,0,0,0,20,0,0,0,0,20,0,0,0,0,21,0,0,0,0,22,0,0,0,0,23,0,0,0,0,25],
 [0,1,3,4,1,4,0,5,5,1,5,0,5,2,1,5,0,5,5,2,5,0,5,6,1,5,0,5,5,1,5,0,5,2,1,5,0,5,5,1],
 [0,0,0,0,0,0,10,0,0,0,0,12,0,0,0,0,12,0,0,0,0,12,0,7,0,0,12,1,1,1,1,13,1,2,2,2,14,2,1,1]];
// The cabinet's difficulty table (RRG23.ASM, WVTAB) for waves 1 to 40, in its own frame-based units.
const rep=(v,n)=>Array(n).fill(v);
const SPEEDS={
 robSpd:[20,15,15,15,15,15,15,15,15,15,14,14,14,14,14,13,13,13,13,13,14,14,14,14,14,14,13,13,13,13,13,13,12,12,12,12,12,12,15,12],
 robMax:[9,7,6,5,5,5,5,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,3,3,4,3,3,3,3,3,3,3,3,3,4,3],
 enfNum:[...rep(10,20),...rep(11,20)],
 enfShot:[30,28,26,24,22,20,18,18,16,14,14,14,14,14,14,14,14,14,14,14,15,15,15,15,15,15,15,15,15,14,14,14,14,14,14,14,14,14,14,14],
 circleDrop:[30,28,26,24,30,20,18,16,18,25,12,12,12,25,25,12,12,12,18,20,14,14,14,14,14,25,14,14,18,25,12,12,12,12,25,12,12,12,18,20],
 hulkSpd:[8,8,7,7,7,7,7,6,6,6,6,...rep(5,29)],
 brainShot:[64,64,64,64,64,40,40,38,38,38,38,38,38,38,38,38,36,36,36,36,32,32,32,32,32,32,32,30,30,30,30,30,...rep(25,8)],
 brainSpd:[8,8,8,8,8,...rep(7,10),...rep(6,25)],
 tankShot:[...rep(32,7),...rep(30,6),...rep(28,7),...rep(30,6),...rep(28,5),...rep(26,5),...rep(24,4)],
 tankDrop:[...rep(16,14),...rep(15,6),...rep(14,20)]};
const tableWave=n=>{while(n>40)n-=20;return n-1};
function waveMix(n){const i=tableWave(n),[gr,el,mo,da,mi,hu,br,sp,qu]=COUNTS.map(r=>r[i]);return{grunt:gr,electrode:el,mommy:mo,daddy:da,mikey:mi,hulk:hu,brain:br,spheroid:sp,quark:qu}}
function waveSpeeds(n){const i=tableWave(n),o={};for(const [k,v] of Object.entries(SPEEDS))o[k]=v[i];return o}
class RobotronEngine{
 constructor(seed=1982){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.nextExtra=C.extraEvery;this.wave=0;this.shotsFired=0;this.nextId=0;this.newWave();return this}
 between([a,b]){return a+(b-a)*this.rng.next()}
 // The cabinet's two random draws: RANDU, 1 to n evenly; RMAX, a byte halved until it is at most n (weighted to the top).
 randu(n){return 1+Math.floor(this.rng.next()*n)}
 rmax(n){let v=Math.floor(this.rng.next()*256);while(v>n)v>>=1;return v||1}
 make(kind,x,y,extra={}){return Object.assign({id:this.nextId++,kind,x,y,vx:0,vy:0,r:C.radius[kind],t:this.rng.next()},extra)}
 // A random spot in the arena at least d away from the middle, where the player starts, and clear of the walls so no one stands on the line.
 spot(d=C.safe,m=36){for(let i=0;i<60;i++){const x=C.left+m+this.rng.next()*(C.right-C.left-2*m),y=C.top+m+this.rng.next()*(C.bottom-C.top-2*m);if(Math.hypot(x-cx,y-cy)>=d)return{x,y}}return{x:C.left+m,y:C.top+m}}
 newWave(){this.wave++;const mix=waveMix(this.wave);this.mix=mix;this.sp=waveSpeeds(this.wave);this.robSpd=this.sp.robSpd;this.robMax=this.sp.robMax;this.scored=false;this.ramp=C.rampFirst;this.robots=[];this.humans=[];this.bullets=[];this.shots=[];this.marks=[];
  for(const k of ['electrode','hulk','grunt','brain','spheroid','quark'])for(let i=0;i<mix[k];i++){const p=this.spot();this.robots.push(this.prep(this.make(k,p.x,p.y)))}
  for(const k of FAMILY)for(let i=0;i<mix[k];i++){const p=this.spot(110);this.humans.push(this.make('human',p.x,p.y,{who:k,turn:0}))}
  this.saved=0;this.lost=0;this.rescues=0;this.waveClock=0;this.place();this.events.push({type:'wave',wave:this.wave,brain:mix.brain>0,tank:mix.quark>0})}
 prep(o){const k=o.kind,F=C.frame,S=this.sp;if(k==='grunt')o.wait=this.randu(this.robSpd)*C.gruntTick*F;
  if(k==='spheroid'){o.load=Math.ceil(this.rmax(S.enfNum)/2);o.spawn=this.rmax(S.circleDrop)*10*F;o.turn=0}
  if(k==='quark'){o.load=Math.ceil(this.rmax(S.enfNum)/2);o.spawn=this.rmax(S.tankDrop)*15*F;o.turn=0}
  if(k==='enforcer')o.fire=this.rmax(S.enfShot)*3*F;if(k==='tank')o.fire=(Math.floor(this.rng.next()*32)+S.tankShot)*2*F;
  if(k==='brain'){o.fire=this.rmax(S.brainShot)*S.brainSpd*F;o.busy=0}if(k==='hulk'||k==='human'||k==='tank')o.turn=0;return o}
 place(){this.player={x:cx,y:cy,fx:1,fy:0};this.fireTimer=0;this.state='enter';this.timer=C.enterTime}
 award(n){this.score+=n;if(n>0)this.scored=true;while(this.score>=this.nextExtra){this.nextExtra+=C.extraEvery;this.lives++;this.events.push({type:'extra'})}}
 count(kinds=KILL){return this.robots.filter(o=>kinds.includes(o.kind)).length}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state!=='play'){this.timer-=dt;if(this.timer<=0){if(this.state==='cleared')this.newWave();else if(this.state==='dead')this.respawn();else this.state='play'}return}
  this.waveClock+=dt;this.rampGrunts(dt);this.movePlayer(dt,input);this.fire(dt,input);
  for(const o of [...this.robots])this.think(o,dt);if(this.robots.some(o=>o.gone))this.robots=this.robots.filter(o=>!o.gone);for(const h of this.humans)this.wander(h,dt,C.humanSpeed);
  this.moveBullets(dt);this.moveShots(dt);this.collide();
  if(this.state==='play'&&!this.count()&&!this.robots.some(o=>o.programming)){this.state='cleared';this.timer=C.waveDelay;this.bullets=[];this.events.push({type:'cleared',wave:this.wave,saved:this.saved,lost:this.lost,brain:this.mix.brain>0})}}
 // Every 3.75 seconds the Grunts' pace and its floor drop, twice as fast while the player scores nothing (not with 30 or more Grunts).
 rampGrunts(dt){this.ramp-=dt;if(this.ramp>0)return;this.ramp+=C.rampEvery;if(this.count(['grunt'])>=C.rampMax)return;const k=this.scored?1:2;this.scored=false;
  this.robMax=Math.max(1,this.robMax-k);this.robSpd=Math.max(this.robMax,this.robSpd-2*k)}
 // Twin sticks: one moves, the other fires, each in eight directions; holding the fire stick keeps firing.
 movePlayer(dt,input){const p=this.player,mx=clamp(Number(input.axis)||0,-1,1)||((input.right?1:0)-(input.left?1:0)),my=clamp(Number(input.axisY)||0,-1,1)||((input.down?1:0)-(input.up?1:0)),d=dir8(mx,my);
  if(d){const sx=Math.sign(Math.round(d.x*2)),sy=Math.sign(Math.round(d.y*2));p.x=clamp(p.x+sx*C.playerSpeed*dt,C.left+C.playerR,C.right-C.playerR);p.y=clamp(p.y+sy*C.playerSpeed*dt,C.top+C.playerR,C.bottom-C.playerR);p.mx=d.x;p.my=d.y}else p.mx=p.my=0}
 fire(dt,input){const ax=clamp(Number(input.aimX)||0,-1,1)||((input.fireRight?1:0)-(input.fireLeft?1:0)),ay=clamp(Number(input.aimY)||0,-1,1)||((input.fireDown?1:0)-(input.fireUp?1:0)),d=dir8(ax,ay);
  this.fireTimer=Math.max(0,this.fireTimer-dt);if(!d)return;const p=this.player;p.fx=d.x;p.fy=d.y;
  if(this.fireTimer<=0&&this.shots.length<C.maxShots){this.fireTimer=C.fireEvery;this.shots.push({x:p.x,y:p.y,dx:d.x,dy:d.y});this.shotsFired++;this.events.push({type:'shot'})}}
 inside(o,m=o.r||0){return o.x>=C.left+m&&o.x<=C.right-m&&o.y>=C.top+m&&o.y<=C.bottom-m}
 keep(o){o.x=clamp(o.x,C.left+o.r,C.right-o.r);o.y=clamp(o.y,C.top+o.r,C.bottom-o.r)}
 nearestHuman(o){let best=null,d=1e9;for(const h of this.humans){const k=Math.hypot(h.x-o.x,h.y-o.y);if(k<d){d=k;best=h}}return best}
 // Humans, Hulks and Tanks walk in straight lines and pick a new heading now and then.
 wander(o,dt,speed,target=null){o.turn-=dt;if(o.turn<=0){o.turn=.6+this.rng.next()*1.8;
   if(target&&this.rng.next()<.7){const dx=target.x-o.x,dy=target.y-o.y;if(Math.abs(dx)>Math.abs(dy)){o.vx=Math.sign(dx);o.vy=0}else{o.vx=0;o.vy=Math.sign(dy)}}
   else{const a=Math.floor(this.rng.next()*8)*Math.PI/4;o.vx=Math.round(Math.cos(a));o.vy=Math.round(Math.sin(a))}}
  o.x+=o.vx*speed*dt;o.y+=o.vy*speed*dt;if(!this.inside(o)){this.keep(o);o.vx=-o.vx;o.vy=-o.vy}}
 think(o,dt){const p=this.player,k=o.kind,dx=p.x-o.x,dy=p.y-o.y;
  // Grunts: a 4 pixel step toward the player after 1 to ROBSPD ticks of 4 frames.
  if(k==='grunt'){o.wait-=dt;if(o.wait<=0){o.wait+=this.randu(this.robSpd)*C.gruntTick*C.frame;if(Math.abs(dx)>=2*C.px)o.x+=Math.sign(dx)*4*C.px;if(Math.abs(dy)>=2*C.line)o.y+=Math.sign(dy)*4*C.line;this.keep(o);o.step=!o.step}}
  else if(k==='hulk')this.hulk(o,dt);
  else if(k==='brain')this.brain(o,dt);
  else if(k==='prog'){if(o.programming){o.programming-=dt;if(o.programming<=0)o.programming=0;return}const d=Math.hypot(dx,dy)||1,j=Math.sin(this.clock*5+o.t*9)*.5;o.x+=(dx/d+j*dy/d)*C.progSpeed*dt;o.y+=(dy/d-j*dx/d)*C.progSpeed*dt;this.keep(o)}
  else if(k==='spheroid'||k==='quark')this.spawner(o,dt);
  else if(k==='enforcer')this.enforcer(o,dt);
  else if(k==='tank')this.tank(o,dt)}
 // Hulks go across or up and down, never both, switching after 1 to 32 steps toward their human (or the player) give or take a little.
 hulk(o,dt){const n=this.sp.hulkSpd*C.frame;o.turn-=dt;if(o.turn<=0){o.turn=(1+Math.floor(this.rng.next()*32))*n;const t=this.nearestHuman(o)||this.player;
   if(o.vx){o.vx=0;o.vy=Math.sign(t.y+(this.rng.next()-.5)*32*C.line-o.y)||1}else{o.vy=0;o.vx=Math.sign(t.x+(this.rng.next()-.5)*64*C.px-o.x)||1}}
  o.x+=o.vx*3.5*C.px/n*dt;o.y+=o.vy*2*C.line/n*dt;if(!this.inside(o)){this.keep(o);o.turn=0}}
 // Tanks go for the player about three times in eight, else for a random spot, a pixel and a line every 2 frames, and fire every TNKSHT ticks.
 tank(o,dt){const F=C.frame;o.turn-=dt;if(o.turn<=0){o.turn=(1+Math.floor(this.rng.next()*32))*2*F;const t=this.rng.next()<97/256?this.player:this.spot(0);
   o.vx=Math.sign(t.x-o.x)||1;o.vy=Math.abs(t.y-o.y)<16*C.line?0:Math.sign(t.y-o.y)}
  o.x+=o.vx*C.px/(2*F)*dt;o.y+=o.vy*C.line/(2*F)*dt;if(!this.inside(o)){this.keep(o);o.turn=0}
  o.fire-=dt;if(o.fire<=0){o.fire=this.sp.tankShot*2*F;if(this.bullets.filter(b=>b.kind==='shell').length<=C.maxShells)this.shoot('shell',o,C.shellSpeed,.25)}}
 // A bullet aimed at the player, give or take a little.
 shoot(kind,o,speed,spread){const a=Math.atan2(this.player.y-o.y,this.player.x-o.x)+(this.rng.next()-.5)*2*spread;
  this.bullets.push({kind,x:o.x,y:o.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:C.radius[kind],life:kind==='spark'?C.sparkLife:kind==='missile'?C.missileLife:C.shellLife,bounces:0,t:this.rng.next()});this.events.push({type:'enemyShot',kind})}
 // Brains walk to the nearest human and reprogram it into a Prog; with no humans left they come for the player. They fire cruise missiles.
 brain(o,dt){if(o.busy>0){o.busy-=dt;return}const h=this.nearestHuman(o)||this.player,dx=h.x-o.x,dy=h.y-o.y,n=this.sp.brainSpd*C.frame;
  // A pixel pair across and a line up or down every BRNSPD frames; a cruise missile every BSHTIM steps.
  if(Math.abs(dx)>=2*C.px)o.x+=Math.sign(dx)*2*C.px/n*dt;if(Math.abs(dy)>=C.line)o.y+=Math.sign(dy)*C.line/n*dt;o.vx=Math.sign(dx);
  o.fire-=dt;if(o.fire<=0){o.fire=this.rmax(this.sp.brainShot)*n;if(this.bullets.filter(b=>b.kind==='missile').length<C.maxMissiles)this.shoot('missile',o,C.missileSpeed,.4)}}
 // Spheroids and Quarks drift and bounce, dropping an Enforcer or a Tank every so often until their load runs out.
 spawner(o,dt){const sp=o.kind==='spheroid'?C.spheroidSpeed:C.quarkSpeed;o.turn-=dt;if(o.turn<=0&&!o.leave){o.turn=.8+this.rng.next()*1.6;const a=this.rng.next()*Math.PI*2;o.vx=Math.cos(a)*sp;o.vy=Math.sin(a)*sp}
  o.x+=o.vx*dt;o.y+=o.vy*dt;if(o.x<C.left+o.r||o.x>C.right-o.r)o.vx=-o.vx;if(o.y<C.top+o.r||o.y>C.bottom-o.r)o.vy=-o.vy;this.keep(o);
  if(o.leave){o.vx=o.leave*(o.kind==='spheroid'?C.px:0)*60;o.vy=o.leave*(o.kind==='quark'?C.line:0)*60;if(o.kind==='spheroid'?o.x<=C.left+o.r||o.x>=C.right-o.r:o.y<=C.top+o.r||o.y>=C.bottom-o.r)o.gone=true;return}
  o.spawn-=dt;if(o.spawn>0)return;const sph=o.kind==='spheroid',kind=sph?'enforcer':'tank',S=this.sp,F=C.frame;
  o.spawn=sph?this.rmax(S.circleDrop>>2)*16*F:this.rmax((S.tankDrop>>1)+1)*3*F;if(this.count([kind])>=(sph?C.maxEnforcers:C.maxTanks))return;
  o.load--;this.robots.push(this.prep(this.make(kind,o.x,o.y)));this.events.push({type:'spawn',kind,x:o.x,y:o.y});
  // Empty, it flies out of the arena and is gone (no points): across for a Spheroid, up or down for a Quark.
  if(o.load<=0)o.leave=this.rng.next()<.5?-1:1}
 // Enforcers swoop at a point near the player and fire sparks at it.
 enforcer(o,dt){const p=this.player;o.turn=(o.turn||0)-dt;if(o.turn<=0){o.turn=.5+this.rng.next();o.tx=p.x+(this.rng.next()-.5)*260;o.ty=p.y+(this.rng.next()-.5)*260}
  const dx=o.tx-o.x,dy=o.ty-o.y,d=Math.hypot(dx,dy)||1;o.vx+=(dx/d*C.enforcerSpeed-o.vx)*Math.min(1,dt*2);o.vy+=(dy/d*C.enforcerSpeed-o.vy)*Math.min(1,dt*2);o.x+=o.vx*dt;o.y+=o.vy*dt;this.keep(o);
  o.fire-=dt;if(o.fire<=0){o.fire=this.rmax(this.sp.enfShot)*3*C.frame;if(this.bullets.filter(b=>b.kind==='spark').length<C.maxSparks)this.shoot('spark',o,C.sparkSpeed,.2)}}
 // Sparks fly straight, cruise missiles home in with a wiggle, tank shells bounce off the walls.
 moveBullets(dt){const p=this.player;for(const b of this.bullets){b.life-=dt;
   if(b.kind==='missile'){const a=Math.atan2(b.vy,b.vx),want=Math.atan2(p.y-b.y,p.x-b.x);let da=want-a;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;const na=a+clamp(da,-1.6*dt,1.6*dt);b.vx=Math.cos(na)*C.missileSpeed;b.vy=Math.sin(na)*C.missileSpeed;
    const w=Math.cos(this.clock*8+b.t*6)*90;b.x+=(b.vx-Math.sin(na)*w)*dt;b.y+=(b.vy+Math.cos(na)*w)*dt}
   else{b.x+=b.vx*dt;b.y+=b.vy*dt}
   if(b.kind==='shell'){if(b.x<C.left||b.x>C.right){b.vx=-b.vx;b.bounces++}if(b.y<C.top||b.y>C.bottom){b.vy=-b.vy;b.bounces++}b.x=clamp(b.x,C.left,C.right);b.y=clamp(b.y,C.top,C.bottom);if(b.bounces>C.shellBounces)b.life=0}
   else if(!this.inside(b,0))b.life=0}
  this.bullets=this.bullets.filter(b=>b.life>0)}
 moveShots(dt){for(const s of this.shots){s.x+=Math.sign(Math.round(s.dx*2))*C.shotSpeed*C.px*dt;s.y+=Math.sign(Math.round(s.dy*2))*C.shotSpeed*C.line*dt;if(!this.inside(s,0)){s.dead=true;continue}
   const hit=(o,r)=>Math.hypot(o.x-s.x,o.y-s.y)<r;
   const o=this.robots.find(o=>!o.programming&&hit(o,o.r+4));if(o){s.dead=true;this.shotHit(o,s);continue}
   const b=this.bullets.find(b=>hit(b,b.r+5));if(b){s.dead=true;b.life=0;this.award(C.points[b.kind]);this.events.push({type:'kill',kind:b.kind,points:C.points[b.kind],x:b.x,y:b.y})}}
  this.shots=this.shots.filter(s=>!s.dead);this.bullets=this.bullets.filter(b=>b.life>0)}
 // A shot destroys anything but a Hulk, which it only pushes back.
 shotHit(o,s){if(o.kind==='hulk'){o.x+=s.dx*C.hulkPush;o.y+=s.dy*C.hulkPush;this.keep(o);this.events.push({type:'push',x:o.x,y:o.y});return}
  this.robots.splice(this.robots.indexOf(o),1);const pts=C.points[o.kind];
  // Each Grunt shot speeds the rest up by an eighth, down to the floor.
  if(o.kind==='grunt'){const n=Math.floor(this.robSpd*224/256);if(n>=this.robMax)this.robSpd=n}this.award(pts);this.events.push({type:'kill',kind:o.kind,points:pts,x:o.x,y:o.y})}
 collide(){const p=this.player,near=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
  // Grunts that walk into an Electrode are destroyed with it.
  for(const e of this.robots.filter(o=>o.kind==='electrode'))for(const o of this.robots)if(o.kind==='grunt'&&!e.gone&&!o.gone&&near(o,e,o.r+e.r)){o.gone=e.gone=true;this.events.push({type:'fizzle',x:e.x,y:e.y})}
  this.robots=this.robots.filter(o=>!o.gone);
  // Hulks crush the humans they touch; Brains turn them into Progs.
  for(const h of [...this.humans]){const hulk=this.robots.find(o=>o.kind==='hulk'&&near(o,h,o.r+h.r)),brain=this.robots.find(o=>o.kind==='brain'&&o.busy<=0&&near(o,h,o.r+h.r));
   if(hulk){this.humans.splice(this.humans.indexOf(h),1);this.lost++;this.marks.push({x:h.x,y:h.y,who:h.who});this.events.push({type:'humanLost',who:h.who,x:h.x,y:h.y})}
   else if(brain){this.humans.splice(this.humans.indexOf(h),1);this.lost++;brain.busy=C.programTime;this.robots.push(this.make('prog',h.x,h.y,{who:h.who,programming:C.programTime}));this.events.push({type:'programmed',who:h.who,x:h.x,y:h.y})}}
  // Touching a human rescues it: 1000, 2000, 3000, 4000, then 5000 each for the rest of the wave.
  for(const h of [...this.humans])if(near(h,p,h.r+C.playerR)){this.humans.splice(this.humans.indexOf(h),1);this.rescues++;this.saved++;const pts=Math.min(C.rescueMax,C.rescue*this.rescues);this.award(pts);this.events.push({type:'rescue',who:h.who,points:pts,x:h.x,y:h.y})}
  const r=C.playerR*.85;
  if(this.robots.some(o=>!o.programming&&near(o,p,o.r+r))||this.bullets.some(b=>near(b,p,b.r+r)))this.die()}
 die(){this.lives--;this.shots=[];this.bullets=[];this.events.push({type:'death',x:this.player.x,y:this.player.y,lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // After a lost life the player starts again in the middle, the robots and humans that are left are scattered again and the rescue bonus starts over.
 respawn(){for(const o of this.robots){const q=this.spot();o.x=q.x;o.y=q.y;o.programming=0}for(const h of this.humans){const q=this.spot(110);h.x=q.x;h.y=q.y}this.rescues=0;this.waveClock=0;this.robMax=this.sp.robMax;this.robSpd=Math.max(this.robSpd,this.robMax);this.ramp=C.rampFirst;this.place()}
 // Demo pilot: steers away from whatever is close, picks up humans when the way is clear, and fires at the nearest robot it can destroy.
 pilot(){const p=this.player;let ax=0,ay=0,close=1e9;
  const away=(o,reach,w)=>{const dx=p.x-o.x,dy=p.y-o.y,d=Math.hypot(dx,dy)||1;if(d<reach){ax+=dx/d*w*(reach-d)/reach;ay+=dy/d*w*(reach-d)/reach}};
  for(const o of this.robots){const d=Math.hypot(o.x-p.x,o.y-p.y)-o.r;close=Math.min(close,d);away(o,o.kind==='hulk'?150:o.kind==='electrode'?70:130,o.kind==='grunt'?1:1.6)}
  for(const b of this.bullets)away(b,130,2.2);
  const h=this.nearestHuman(p);if(h&&close>70){const dx=h.x-p.x,dy=h.y-p.y,d=Math.hypot(dx,dy)||1;ax+=dx/d*.8;ay+=dy/d*.8}else{ax+=(cx-p.x)/600;ay+=(cy-p.y)/600}
  // Hug no wall: push back from the edges.
  ax+=Math.max(0,90-(p.x-C.left))/90-Math.max(0,90-(C.right-p.x))/90;ay+=Math.max(0,90-(p.y-C.top))/90-Math.max(0,90-(C.bottom-p.y))/90;
  let target=null,best=1e9;for(const o of this.robots){if(o.kind==='hulk'||o.programming)continue;const d=Math.hypot(o.x-p.x,o.y-p.y)+(o.kind==='electrode'?250:0);if(d<best){best=d;target=o}}
  for(const b of this.bullets){const d=Math.hypot(b.x-p.x,b.y-p.y);if(d<best*.6){best=d;target=b}}
  const out={axis:Math.abs(ax)<.15?0:clamp(ax*2,-1,1),axisY:Math.abs(ay)<.15?0:clamp(ay*2,-1,1)};if(target){out.aimX=target.x-p.x;out.aimY=target.y-p.y;const m=Math.hypot(out.aimX,out.aimY)||1;out.aimX/=m;out.aimY/=m}return out}
 snapshot(){const n={};for(const o of this.robots)n[o.kind]=(n[o.kind]||0)+1;
  return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,wave:this.wave,shots:this.shotsFired,rescues:this.rescues,player:{x:+this.player.x.toFixed(2),y:+this.player.y.toFixed(2)},
   robots:n,humans:this.humans.length,bullets:this.bullets.length,robotPos:this.robots.slice(0,8).map(o=>[+o.x.toFixed(1),+o.y.toFixed(1)])}}
}
const RobotronCore={CONFIG,RobotronEngine,SeededRandom,waveMix,waveSpeeds,dir8};
g.RobotronCore=RobotronCore;if(typeof module!=='undefined')module.exports=RobotronCore;
})(globalThis);
