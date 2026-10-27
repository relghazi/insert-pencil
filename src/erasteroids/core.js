
'use strict';
/* Erasteroids: Atari Asteroids (1979) rules, drawn as eraser chunks on graph paper.
   Rules and numbers follow the original cabinet, read from Atari's source (A35131.1A, historicalsource/asteroids) and
   the rev 4 disassembly (6502disassembly.com): 1024x768 wrapping playfield, 62.5 cabinet frames a second; one
   cabinet speed unit (1/8 screen unit a frame) is U = 7.8125 px/s here.
   Ship: turns 3/256 of a circle a frame; thrust adds about 1 unit every other frame (about 2 s from rest to the top
   speed of 63 units); no drag while thrusting, and coasting loses 1/128 of the speed every other frame (a long glide).
   Shots: at most 4, one per press, 63 units along the nose plus the ship's own velocity (at most 111 units on each
   axis), 72 frames of life. Hyperspace: the ship vanishes for 48 frames; it is lost when a 0 to 31 roll is 24 or more
   and (roll and 7) x 2 + 4 is not below the rock count, so it is riskiest with few rocks and safe with 19 or more.
   Waves of 4, 6, 8, 10 then 11 large rocks from the edges; large -> 2 medium -> 2 small (20/50/100 points), at most
   27 rocks; each rock's speed on each axis is its parent's plus -16 to 15 units, kept between 6 and 31 units.
   Saucers (200 big, shoots at random; 1000 small, aims at the ship with up to 16/256 of a circle of error, 8/256
   from 35,000): both fly at 16 units, change their climb every 128 frames and fire every 40 frames, 2 shots at most.
   The first saucer of a wave waits 127 ticks of 4 frames; the wait between saucers starts at 146 ticks in a game and
   loses 6 with each saucer down to 32; while rocks are being hit (the last 80 ticks) a saucer only comes when the rocks
   are fewer than 6 (wave 1) to 10 (wave 5 on), else it checks again after 18 ticks; the first saucers of a game are
   big, then a small one comes with chance 1 - (wait / 2 + 1) / 256, and from 30,000 every saucer is small.
   Ramming a rock scores it; extra ship every 10,000; respawn waits for a clear centre; heartbeat speeds up.
   Adaptations (not ROM-exact): radii are tuned by eye; the ship's top speed is capped as a length, not per axis;
   and the score does not roll over at 99,990. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['left','b'],['right','b'],['thrust','b'],['fire','b'],['hyper','b']],
  // Cabinet numbers (see the header): U px/s per cabinet speed unit; 'tick' is the saucer clock of 4 frames (0.064 s).
  unit:7.8125,tick:.064,
  turnRate:4.602,thrust:244,maxSpeed:492,friction:.244,shipRadius:12,
  shotSpeed:492,shotMaxAxis:867,shotLife:1.152,maxShots:4,
  rocks:Object.freeze({3:Object.freeze({radius:42,points:20}),2:Object.freeze({radius:22,points:50}),1:Object.freeze({radius:11,points:100})}),
  rockSpeed:Object.freeze([6,31]),rockJitter:16,
  waveRocks:Object.freeze([4,6,8,10,11]),maxRocks:27,waveDelay:2,spawnClear:180,
  saucerFirst:127,saucerStart:146,saucerStep:6,saucerMin:32,saucerRetry:18,rockHitHold:80,saucerCrowd:Object.freeze([6,10]),
  onlySmallFrom:30000,aimTightFrom:35000,aimError:Object.freeze([16,8]),
  saucers:Object.freeze({big:Object.freeze({radius:20,points:200,speed:125,fire:.64}),small:Object.freeze({radius:10,points:1000,speed:125,fire:.64})}),
  saucerShotSpeed:492,saucerShotLife:1.152,saucerMaxShots:2,saucerTurn:2.048,
  startLives:3,extraEvery:10000,deathPause:2,safeRadius:130,
  hyperDelay:.768,
  beatStart:1,beatStep:.03,beatMin:.18});
class SeededRandom{constructor(seed=1979){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const W=CONFIG.width,H=CONFIG.height,TAU=Math.PI*2;
const wrapX=x=>(x%W+W)%W,wrapY=y=>(y%H+H)%H,dX=(a,b)=>wrapX(a-b+W/2)-W/2,dY=(a,b)=>wrapY(a-b+H/2)-H/2;
const near=(a,b,r)=>{const x=dX(a.x,b.x),y=dY(a.y,b.y);return x*x+y*y<r*r};
class ErasteroidsEngine{
 constructor(seed=1979){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.nextId=1;this.score=0;this.lives=CONFIG.startLives;this.bonusAt=CONFIG.extraEvery;this.wave=0;this.clock=0;this.waveTime=0;this.state='play';this.timer=0;this.events=[];this.shots=[];this.saucerShots=[];this.rocks=[];this.saucer=null;this.saucerReload=CONFIG.saucerStart;this.rockHit=0;this.held={fire:false,hyper:false};this.p=this.makeShip();this.nextWave();return this}
 random(){return this.rng.next()}
 range([a,b]){return a+(b-a)*this.random()}
 emit(type,data={}){this.events.push({type,...data});if(this.events.length>300)this.events.shift()}
 makeShip(){return{x:W/2,y:H/2,vx:0,vy:0,angle:-Math.PI/2,thrusting:false,hidden:0}}
 // A rock's speed on each axis: its parent's (none for a new wave) plus -16 to 15 units, kept between 6 and 31 units either way.
 rockAxis(parent){const U=CONFIG.unit,[lo,hi]=CONFIG.rockSpeed;let u=Math.round(parent/U)+Math.floor(this.random()*2*CONFIG.rockJitter)-CONFIG.rockJitter;const sign=u<0?-1:1;return sign*Math.min(hi,Math.max(lo,Math.abs(u)))*U}
 makeRock(size,x,y,parent){return{id:this.nextId++,size,x,y,vx:this.rockAxis(parent?parent.vx:0),vy:this.rockAxis(parent?parent.vy:0),shape:Math.floor(this.random()*4),spin:(this.random()-.5)*1.6,turn:this.random()*TAU,dead:false}}
 nextWave(){this.wave++;this.waveTime=0;this.saucerTimer=CONFIG.saucerFirst*CONFIG.tick;this.beat=CONFIG.beatStart;this.beatTimer=CONFIG.beatStart;this.beatHigh=false;const n=CONFIG.waveRocks[Math.min(this.wave-1,CONFIG.waveRocks.length-1)];
  for(let i=0;i<n;i++){let x,y;do{if(this.random()<.5){x=this.random()*W;y=this.random()<.5?0:H-1}else{x=this.random()<.5?0:W-1;y=this.random()*H}}while(near({x,y},this.p,CONFIG.spawnClear));this.rocks.push(this.makeRock(3,x,y))}
  this.emit('wave',{wave:this.wave,rocks:n})}
 awardPoints(n){this.score+=n;while(this.score>=this.bonusAt){this.lives++;this.bonusAt+=CONFIG.extraEvery;this.emit('extra',{lives:this.lives})}}
 breakRock(r,byPlayer){if(r.dead)return;r.dead=true;this.rockHit=CONFIG.rockHitHold*CONFIG.tick;const cfg=CONFIG.rocks[r.size];if(byPlayer){this.awardPoints(cfg.points);this.emit('kill',{kind:'rock',size:r.size,points:cfg.points,x:r.x,y:r.y})}
  this.emit('explode',{size:r.size,x:r.x,y:r.y});if(r.size>1)for(let i=0;i<2;i++){if(this.rocks.filter(x=>!x.dead).length>=CONFIG.maxRocks)break;this.rocks.push(this.makeRock(r.size-1,r.x,r.y,r))}}
 killSaucer(byPlayer){const s=this.saucer;if(!s)return;const cfg=CONFIG.saucers[s.kind];if(byPlayer){this.awardPoints(cfg.points);this.emit('kill',{kind:'saucer',saucer:s.kind,points:cfg.points,x:s.x,y:s.y})}this.emit('explode',{saucer:s.kind,x:s.x,y:s.y});this.saucer=null;this.saucerTimer=this.saucerReload*CONFIG.tick}
 die(){if(this.state!=='play')return;this.lives--;this.state='death';this.timer=CONFIG.deathPause;this.p.thrusting=false;this.emit('death',{x:this.p.x,y:this.p.y,lives:this.lives})}
 // The cabinet: each saucer shortens the wait for the next by 6 ticks (to 32); while that wait is still 128 ticks or more the
 // saucer is big, from 30,000 always small, otherwise small unless a 0 to 255 roll is at most half the wait.
 spawnSaucer(){this.saucerReload=Math.max(CONFIG.saucerMin,this.saucerReload-CONFIG.saucerStep);const r=this.saucerReload;
  const small=r<128&&(this.score>=CONFIG.onlySmallFrom||Math.floor(r/2)<Math.floor(this.random()*256));const kind=small?'small':'big',dir=this.random()<.5?1:-1,cfg=CONFIG.saucers[kind];
  this.saucer={kind,x:dir>0?0:W-1,y:this.random()*H,dir,vx:dir*cfg.speed,vy:0,travelled:0,turn:CONFIG.saucerTurn,fire:cfg.fire};this.emit('saucer',{kind})}
 // When the saucer clock runs out: a saucer comes unless rocks were hit in the last 80 ticks and there are still as many rocks as
 // the wave's crowd limit (6 in wave 1, one more each wave to 10); then it looks again in 18 ticks.
 saucerDue(){const rocks=this.rocks.filter(r=>!r.dead).length,crowd=Math.min(CONFIG.saucerCrowd[1],CONFIG.saucerCrowd[0]+this.wave-1);
  if(this.rockHit>0&&(rocks===0||rocks>=crowd)){this.saucerTimer=CONFIG.saucerRetry*CONFIG.tick;return}this.spawnSaucer()}
 saucerFire(){const s=this.saucer;if(this.saucerShots.length>=CONFIG.saucerMaxShots)return;let a;
  if(s.kind==='big'||this.state!=='play'||this.p.hidden>0)a=this.random()*TAU;else{const k=this.score>=CONFIG.aimTightFrom?CONFIG.aimError[1]:CONFIG.aimError[0];a=Math.atan2(dY(this.p.y,s.y),dX(this.p.x,s.x))+(Math.floor(this.random()*2*k)-k)/256*TAU}
  const m=CONFIG.shotMaxAxis,c=v=>Math.max(-m,Math.min(m,v));this.saucerShots.push({x:s.x,y:s.y,vx:c(Math.cos(a)*CONFIG.saucerShotSpeed+s.vx),vy:c(Math.sin(a)*CONFIG.saucerShotSpeed+s.vy),life:CONFIG.saucerShotLife});this.emit('saucer-fire',{kind:s.kind})}
 // The cabinet's roll: 0 to 31; 24 or more is a bad jump unless (roll and 7) x 2 + 4 is below the rock count.
 hyperspace(){const p=this.p;p.hidden=CONFIG.hyperDelay;p.vx=p.vy=0;p.thrusting=false;p.x=this.random()*W;p.y=this.random()*H;const alive=this.rocks.filter(r=>!r.dead).length,roll=Math.floor(this.random()*32);p.hyperDoom=roll>=24&&(roll&7)*2+4>=alive;this.emit('hyper')}
 centreClear(){const c={x:W/2,y:H/2};return !this.rocks.some(r=>!r.dead&&near(r,c,CONFIG.safeRadius+CONFIG.rocks[r.size].radius))&&!this.saucerShots.some(b=>near(b,c,CONFIG.safeRadius))&&!(this.saucer&&near(this.saucer,c,CONFIG.safeRadius))}
 step(dt=CONFIG.step,input={}){
  this.clock+=dt;if(this.state==='end')return;this.waveTime+=dt;
  const fire=!!input.fire,hyper=!!input.hyper,firePress=fire&&!this.held.fire,hyperPress=hyper&&!this.held.hyper;this.held.fire=fire;this.held.hyper=hyper;
  const p=this.p;
  if(this.state==='death'){this.timer-=dt;if(this.timer<=0){if(this.lives<=0){this.state='end';this.emit('gameover',{score:this.score})}else if(this.centreClear()){this.p=this.makeShip();this.state='play';this.emit('respawn')}}}
  else if(p.hidden>0){p.hidden-=dt;if(p.hidden<=0){p.hidden=0;if(p.hyperDoom){p.hyperDoom=false;this.die()}}}
  else{
   const turn=(input.right?1:0)-(input.left?1:0);p.angle=(p.angle+turn*CONFIG.turnRate*dt)%TAU;
   p.thrusting=!!input.thrust;if(p.thrusting){p.vx+=Math.cos(p.angle)*CONFIG.thrust*dt;p.vy+=Math.sin(p.angle)*CONFIG.thrust*dt}
   else{const f=Math.exp(-CONFIG.friction*dt);p.vx*=f;p.vy*=f}const sp=Math.hypot(p.vx,p.vy);if(sp>CONFIG.maxSpeed){p.vx*=CONFIG.maxSpeed/sp;p.vy*=CONFIG.maxSpeed/sp}
   p.x=wrapX(p.x+p.vx*dt);p.y=wrapY(p.y+p.vy*dt);
   if(firePress&&this.shots.length<CONFIG.maxShots){const c=Math.cos(p.angle),s=Math.sin(p.angle);const m=CONFIG.shotMaxAxis,k=v=>Math.max(-m,Math.min(m,v));this.shots.push({x:wrapX(p.x+c*CONFIG.shipRadius),y:wrapY(p.y+s*CONFIG.shipRadius),vx:k(p.vx+c*CONFIG.shotSpeed),vy:k(p.vy+s*CONFIG.shotSpeed),life:CONFIG.shotLife});this.emit('fire')}
   if(hyperPress)this.hyperspace();
  }
  for(const r of this.rocks){r.x=wrapX(r.x+r.vx*dt);r.y=wrapY(r.y+r.vy*dt);r.turn+=r.spin*dt}
  for(const list of [this.shots,this.saucerShots])for(const b of list){b.x=wrapX(b.x+b.vx*dt);b.y=wrapY(b.y+b.vy*dt);b.life-=dt}
  this.shots=this.shots.filter(b=>b.life>0);this.saucerShots=this.saucerShots.filter(b=>b.life>0);
  const s=this.saucer;
  if(s){s.x+=s.vx*dt;s.travelled+=Math.abs(s.vx*dt);s.y=wrapY(s.y+s.vy*dt);s.turn-=dt;if(s.turn<=0){s.turn=CONFIG.saucerTurn;s.vy=[-1,0,0,1][Math.floor(this.random()*4)]*CONFIG.saucers[s.kind].speed}
   s.fire-=dt;if(s.fire<=0){s.fire=CONFIG.saucers[s.kind].fire;this.saucerFire()}if(s.travelled>=W){this.saucer=null;this.saucerTimer=this.saucerReload*CONFIG.tick;this.emit('saucer-gone')}}
  // The saucer clock and the rock-hit hold run only while the ship is on the screen, as on the cabinet.
  else if(this.state==='play'&&p.hidden<=0){this.rockHit=Math.max(0,this.rockHit-dt);this.saucerTimer-=dt;if(this.saucerTimer<=0)this.saucerDue()}
  this.collide();
  this.rocks=this.rocks.filter(r=>!r.dead);
  if(this.rocks.length===0&&this.state!=='end'){this.waveGap=(this.waveGap??CONFIG.waveDelay)-dt;if(this.waveGap<=0){this.waveGap=undefined;this.nextWave()}}
  else{this.beatTimer-=dt;if(this.beatTimer<=0&&this.state==='play'){this.beatHigh=!this.beatHigh;this.emit('beat',{high:this.beatHigh});this.beat=Math.max(CONFIG.beatMin,this.beat-CONFIG.beatStep);this.beatTimer=this.beat}}
 }
 collide(){
  const p=this.p,shipLive=this.state==='play'&&p.hidden<=0;
  for(const b of this.shots){if(b.life<=0)continue;for(const r of this.rocks)if(!r.dead&&near(b,r,CONFIG.rocks[r.size].radius)){b.life=0;this.breakRock(r,true);break}
   if(b.life>0&&this.saucer&&near(b,this.saucer,CONFIG.saucers[this.saucer.kind].radius)){b.life=0;this.killSaucer(true)}}
  for(const b of this.saucerShots){if(b.life<=0)continue;for(const r of this.rocks)if(!r.dead&&near(b,r,CONFIG.rocks[r.size].radius)){b.life=0;this.breakRock(r,false);break}
   if(b.life>0&&shipLive&&this.state==='play'&&near(b,p,CONFIG.shipRadius)){b.life=0;this.die()}}
  if(this.saucer)for(const r of this.rocks)if(!r.dead&&this.saucer&&near(this.saucer,r,CONFIG.rocks[r.size].radius+CONFIG.saucers[this.saucer.kind].radius)){this.breakRock(r,false);this.killSaucer(false)}
  if(shipLive){for(const r of this.rocks)if(!r.dead&&near(p,r,CONFIG.rocks[r.size].radius+CONFIG.shipRadius)){this.breakRock(r,true);this.die();break}
   if(this.state==='play'&&this.saucer&&near(p,this.saucer,CONFIG.saucers[this.saucer.kind].radius+CONFIG.shipRadius)){this.killSaucer(true);this.die()}}
  this.shots=this.shots.filter(b=>b.life>0);this.saucerShots=this.saucerShots.filter(b=>b.life>0);
 }
 // Attract mode: turn toward the nearest rock's lead point, tap fire when roughly aligned, thrust away when crowded.
 pilot(){const p=this.p,input={};if(this.state!=='play'||p.hidden>0)return input;let best=null,bd=Infinity;
  for(const r of this.rocks){if(r.dead)continue;const x=dX(r.x,p.x),y=dY(r.y,p.y),d=Math.hypot(x,y);if(d<bd){bd=d;best={x:x+r.vx*d/CONFIG.shotSpeed,y:y+r.vy*d/CONFIG.shotSpeed,r:CONFIG.rocks[r.size].radius}}}
  if(!best)return input;const want=Math.atan2(best.y,best.x),diff=((want-p.angle)%TAU+TAU*1.5)%TAU-Math.PI;
  if(Math.abs(diff)>.06){if(diff>0)input.right=true;else input.left=true}
  if(Math.abs(diff)<.2){this.pilotTap=!this.pilotTap;input.fire=this.pilotTap}
  if(bd<best.r+70&&Math.abs(diff)>2)input.thrust=true;return input}
 snapshot(){return{state:this.state,p:this.p,rocks:this.rocks,shots:this.shots,saucer:this.saucer,saucerShots:this.saucerShots,score:this.score,lives:this.lives,wave:this.wave}}
}
const ErasteroidsCore={CONFIG,ErasteroidsEngine,SeededRandom,wrapX,wrapY,dX,dY};
g.ErasteroidsCore=ErasteroidsCore;if(typeof module!=='undefined')module.exports=ErasteroidsCore;
})(globalThis);
