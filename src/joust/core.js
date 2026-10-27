'use strict';
/* Jock Joust: Williams Joust (1982) rules, drawn as jocks on mascot birds jousting with hockey sticks over the gym.
   Rules follow the original cabinet: one press of the button is one flap (holding it does nothing more); a flap lifts
   the bird and, with the stick held, pushes it sideways, so the rider keeps his momentum; on a ledge he runs and
   skids; the screen wraps at the left and right edges; when two riders meet, the higher lance wins and the lower
   rider is unseated, and at equal height both bounce apart; enemies are Bounders 500, Hunters 750 and Shadow Lords
   1,500, each faster and smarter than the last; an unseated rider leaves an egg (a football): eggs score 250, 500, 750,
   then 1,000 each (the count starts over every wave and every lost life), plus 500 if caught in the air before
   it bounces; and an egg left alone hatches, and a bird swoops down to carry the rider
   off as the next stronger kind; the lava pit (the dodgeball pit) opens when the bridge burns away after wave 1, and
   the troll's hand (a referee's hand) grabs anyone flying low over it and drags him in unless he flaps free; a wave
   that goes on too long brings pterodactyls (1,000) by the cabinet's baiter clock (60, 45, then 30 s into a wave,
   then faster and faster, up to three at once, sent away by a lost life), which kills on touch unless the lance meets its open mouth
   head on; the waves follow the cabinet's table (Sean Riddle's wave list): survival waves (2, 7, 12 ...) pay 3,000
   if the player is not unseated, egg waves (5, 10, 15
   ...) start with 12 eggs on the ledges, pterodactyl waves (8, 13, 18 ...) start with one to three pterodactyls;
   the bridge over the pit burns away on wave 3 and the troll's hand reaches up from wave 4; the four upper ledges
   vanish and come back by the table's pattern; after wave 70 the last ten waves repeat; breaking free of the hand 50; 50 for every lost life; five lives and an extra life every 20,000. Checked
   2026-10-26 against Williams' source (github.com/historicalsource/joust, JOUSTRV4.SRC: EGGVAL, EGGSCR, DEATH1,
   "SCORE 50 POINTS FOR DYING", "SCORE 50 POINTS FOR BREAKING FREE", DEFALT).
   Adaptations (not ROM-exact): one 1024 x 768 screen with seven ledges; speeds, flap strength, enemy flying, egg
   hatch times and the troll's grip are tuned by eye at 120 Hz; a hatched rider on foot is collected like an egg;
   the table's four vanishing ledges are mapped onto the top left, top right, top middle and
   middle ledges of this screen; the gladiator bonus is for two players, so a one-player game has none. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,1],['flap','b']],
  ceiling:60,lavaY:724,trollY:640,bridge:Object.freeze([0,1024]),base:Object.freeze([256,768]),th:16,
  // Ledges: [x1, x2, top y, name]; the base is drawn and handled separately because the bridge burns.
  ledges:Object.freeze([[0,150,220,'topL'],[874,1024,220,'topR'],[388,604,170,'topC'],[0,210,420,'midL'],[812,1024,400,'midR'],[360,560,370,'midC'],[620,800,540,'lowR']]),
  vanish:Object.freeze(['topL','topR','topC','midC']),pads:Object.freeze([[512,660],[100,420],[920,400],[496,170]]),baseY:660,
  gravity:620,flap:190,climb:360,fall:380,push:46,runAccel:520,skid:420,hw:16,h:64,
  maxSpeed:Object.freeze({player:270,bounder:150,hunter:205,lord:265}),
  points:Object.freeze({bounder:500,hunter:750,lord:1500,eggAir:500,ptero:1000,survival:3000,free:50,death:50}),eggPoints:Object.freeze([250,500,750,1000]),
  next:Object.freeze({bounder:'hunter',hunter:'lord',lord:'lord'}),
  tie:6,reachX:48,reachY:48,hatch:7,mountDelay:3,spawnEvery:.8,materialize:1,
  trollRate:2.4,trollFlaps:6,trollPull:30,
  // The cabinet's baiter clock (JOUSTRV4 BAITBL, BAISBL, DEATH1): the first pterodactyl of a wave comes after 60 s on
  // wave 1, 45 s on wave 2 and 30 s after that; the next ones follow after 15, 15, 7, 5, 3 and then every 1 s, at most
  // three on the screen; a lost life sends them away and holds the clock for 5 s.
  baiter:Object.freeze([1,1,1,1,1,1,3,5,7,15,15,30,45,60]),maxBaiters:3,baiterRest:5,pteroSpeed:300,pteroClimb:90,mouthCycle:.8,mouthOpen:.28,
  lives:5,extraEvery:20000,deathPause:1.6,waveDelay:2,spawnShield:3});
class SeededRandom{constructor(seed=1982){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,W=C.width,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=x=>(x%W+W)%W,dxw=(a,b)=>wrap(a-b+W/2)-W/2;
// The cabinet's wave table for waves 1 to 70: Bounders.Hunters.Shadow Lords.pterodactyls.vanished ledges (1 top left,
// 2 top right, 3 top middle, 4 middle); after wave 70 waves 61 to 70 repeat.
const TABLE='3.0.0.0. 4.0.0.0. 6.0.0.0. 3.3.0.0. 12.0.0.0. 3.3.0.0.3 2.4.0.0.123 0.6.0.1.123 0.6.0.0.1234 12.0.0.0. 3.5.0.0. 2.6.0.0.4 0.7.0.1.1234 0.8.0.0.1234 0.12.0.0. 0.5.1.0. 0.5.1.0. 0.5.1.2. 0.4.2.0. 0.12.0.0. 0.3.3.0.12 0.2.4.0.12 0.2.4.2.124 0.2.4.0.124 0.12.0.0. 0.3.5.0.1234 0.3.5.0.1234 0.2.4.2.1234 0.3.5.0.1234 0.12.0.0. 0.4.4.0. 0.2.6.0. 0.2.4.2.3 0.2.6.0.3 0.12.0.0. 0.2.6.0.4 0.0.8.0.4 0.0.6.2.34 0.0.8.0.34 0.12.0.0. 0.3.7.0.12 0.0.10.0.124 0.0.7.3.124 0.0.10.0.1234 0.12.0.0. 0.3.7.0. 0.0.10.0. 0.0.7.3. 0.0.10.0.4 0.12.0.0. 0.3.7.0.12 0.0.10.0.124 0.0.7.3.124 0.0.10.0.1234 0.12.0.0. 0.3.7.0. 0.0.10.0. 0.0.7.3. 0.0.10.0.4 0.0.12.0. 0.0.10.0.12 0.0.10.0.124 0.0.7.3.124 0.0.10.0.1234 0.0.12.0. 0.0.10.0. 0.0.10.0. 0.0.7.3. 0.0.10.0.4 0.0.12.0.'.split(' ').map(r=>{const [b,h,l,p,m]=r.split('.');return{bounder:+b,hunter:+h,lord:+l,ptero:+p,gone:[...m].map(d=>+d-1)}});
const waveRow=n=>TABLE[n<=70?n-1:60+(n-61)%10];
// Wave kinds by the cabinet's cycle of five: survival, egg and (from wave 8) pterodactyl waves among the plain ones.
// The gladiator wave (4, 9, 14 ...) is a two-player wave on the cabinet (JOUSTRV4.SRC: "for two players only"); one player plays it plain.
const waveKind=n=>n%5===2?'survival':n%5===0?'egg':n%5===3&&n>=8?'ptero':'plain';
class JoustEngine{
 constructor(seed=1982){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.nextExtra=C.extraEvery;this.wave=0;this.flaps=0;this.flapHeld=false;this.pilotFlap=false;this.pilotGap=0;
  this.enemies=[];this.eggs=[];this.loose=[];this.pteros=[];this.state='play';this.timer=0;this.spawnPlayer();this.newWave();return this}
 rand(a,b){return a+(b-a)*this.rng.next()}
 body(x,y,extra){return Object.assign({x,y,vx:0,vy:0,ground:true,facing:1,grab:null},extra)}
 spawnPlayer(){this.player=this.body(C.pads[0][0],C.pads[0][1],{shield:C.spawnShield});this.events.push({type:'spawn'})}
 get ptero(){return this.pteros[0]||null}
 set ptero(t){this.pteros=t?[t]:[]}
 // Active ledges this wave: the bridge stands in waves 1 and 2, and the table's ledges vanish on some waves.
 surfaces(){const gone=waveRow(this.wave).gone.map(i=>C.vanish[i]),s=C.ledges.filter(l=>!gone.includes(l[3])).map(l=>({x1:l[0],x2:l[1],y:l[2],name:l[3]}));
  s.push(this.wave<=2?{x1:C.bridge[0],x2:C.bridge[1],y:C.baseY,name:'base'}:{x1:C.base[0],x2:C.base[1],y:C.baseY,name:'base'});return s}
 pitOpen(){return this.wave>=3}
 lavaOpen(x){x=wrap(x);return this.pitOpen()&&(x<C.base[0]||x>C.base[1])}
 newWave(){this.wave++;this.kind=waveKind(this.wave);this.waveClock=0;this.baitPtr=Math.max(10,13-this.wave);this.pteroTimer=C.baiter[this.baitPtr+1];this.baitRest=0;this.pteros=[];this.diedThisWave=false;this.killsThisWave=0;this.eggsTaken=0;this.surf=this.surfaces();
  const row=waveRow(this.wave),kinds=['lord','hunter','bounder'].flatMap(k=>Array(row[k]).fill(k));
  this.queue=[];if(this.kind==='egg'){const ls=this.surf;kinds.forEach((k,i)=>{const l=ls[i%ls.length];let x=l.x1+18+this.rng.next()*(l.x2-l.x1-36);if(l.name==='base'&&Math.abs(x-C.pads[0][0])<70)x+=x<C.pads[0][0]?-90:90;this.eggs.push({x,y:l.y,vx:0,vy:0,ground:true,t:C.hatch+i*.6,kind:k,state:'egg'})})}
  else this.queue=kinds;for(let i=0;i<row.ptero;i++)this.addPtero(i);this.spawnTimer=.5;this.padIndex=1;this.events.push({type:'wave',wave:this.wave,kind:this.kind})}
 award(n){this.score+=n;while(this.score>=this.nextExtra){this.nextExtra+=C.extraEvery;this.lives++;this.events.push({type:'extra'})}}
 // Shared flying: a flap lifts and pushes; in the air gravity pulls; on a ledge the rider runs or skids; x wraps.
 move(b,dt,flap,dir,max){const py=b.y;
  if(flap){b.vy=Math.max(b.vy-C.flap,-C.climb);if(dir){b.vx=clamp(b.vx+dir*C.push,-max,max);b.facing=dir}b.ground=false}
  if(b.ground){if(dir){b.vx=clamp(b.vx+dir*C.runAccel*dt,-max,max);b.facing=dir}else b.vx=Math.sign(b.vx)*Math.max(0,Math.abs(b.vx)-C.skid*dt);b.vy=0}
  else b.vy=Math.min(b.vy+C.gravity*dt,C.fall);
  b.x=wrap(b.x+b.vx*dt);b.y+=b.vy*dt;
  if(b.y-C.h<C.ceiling){b.y=C.ceiling+C.h;b.vy=Math.abs(b.vy)*.4}
  const on=l=>b.x>=l.x1-C.hw&&b.x<=l.x2+C.hw;let support=false;
  for(const l of this.surf){if(!on(l))continue;
   if(b.vy>=0&&py<=l.y+.01&&b.y>=l.y){b.y=l.y;b.vy=0;b.ground=true;support=true;continue}
   const top=b.y-C.h,ptop=py-C.h;if(b.vy<0&&ptop>=l.y+C.th&&top<l.y+C.th){b.y=l.y+C.th+C.h;b.vy=Math.abs(b.vy)*.4;continue}
   // Side of a ledge (not at the wrapping screen edge): bounce back off it.
   if(b.y>l.y+2&&top<l.y+C.th){if(l.x1>0&&b.x<l.x1+4&&b.vx>0){b.x=l.x1-C.hw;b.vx=-b.vx*.6}else if(l.x2<W&&b.x>l.x2-4&&b.vx<0){b.x=l.x2+C.hw;b.vx=-b.vx*.6}}
   if(b.ground&&Math.abs(b.y-l.y)<.01)support=true}
  if(b.ground&&!support)b.ground=false}
 // The troll's hand: low over the open pit it may grab; flapping hard enough breaks free, otherwise it drags the rider in.
 troll(b,dt,flap){if(b.grab){b.vx=0;b.vy=0;b.y+=C.trollPull*dt;b.x=b.grab.x;if(flap)b.grab.flaps++;
   if(b.grab.flaps>=C.trollFlaps){b.grab=null;b.vy=-C.climb;b.y=Math.min(b.y,C.trollY-24);this.events.push({type:'free',x:b.x,y:b.y});if(b===this.player)this.award(C.points.free);return false}return b.y>=C.lavaY}
  if(!b.ground&&b.y>=C.trollY&&this.wave>=4&&this.lavaOpen(b.x)&&this.rng.next()<C.trollRate*dt){b.grab={x:b.x,flaps:0};this.events.push({type:'troll',x:b.x,y:b.y})}
  return !b.grab&&b.y>=C.lavaY&&this.lavaOpen(b.x)||b.y>C.height+40}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='cleared'){this.timer-=dt;if(this.timer<=0){this.state='play';this.newWave()}return}
  this.waveClock+=dt;
  // One flap per press of the button.
  const press=!!input.flap,flap=press&&!this.flapHeld;this.flapHeld=press;
  const dir=clamp(Number(input.axis)||0,-1,1)?Math.sign(input.axis):(input.right?1:0)-(input.left?1:0);
  if(this.state==='dead'){this.timer-=dt;if(this.timer<=0){this.state='play';this.spawnPlayer()}}
  else{const p=this.player;if(flap){this.flaps++;this.events.push({type:'flap'})}
   if(p.shield>0)p.shield=dir||flap?0:p.shield-dt;
   if(!p.grab)this.move(p,dt,flap,dir,C.maxSpeed.player);if(this.troll(p,dt,flap))this.die('pit')}
  this.spawnEnemies(dt);this.moveEnemies(dt);this.moveEggs(dt);this.moveLoose(dt);this.movePtero(dt);
  if(this.state==='play'&&this.player)this.collide();
  if(this.state!=='end'&&!this.enemies.length&&!this.eggs.length&&!this.queue.length){
   if(this.kind==='survival'&&!this.diedThisWave){this.award(C.points.survival);this.events.push({type:'bonus',kind:'survival',points:C.points.survival})}
   this.state='cleared';this.timer=C.waveDelay;this.pteros=[];if(!this.player)this.spawnPlayer();this.events.push({type:'cleared',wave:this.wave})}}
 spawnEnemies(dt){if(!this.queue.length)return;this.spawnTimer-=dt;if(this.spawnTimer>0)return;this.spawnTimer=C.spawnEvery;
  // Riders appear on the transporter pads of the ledges still standing.
  const pads=C.pads.filter(([x,y])=>this.surf.some(l=>l.y===y&&x>=l.x1&&x<=l.x2)),[x,y]=pads[this.padIndex%pads.length];this.padIndex++;this.addEnemy(this.queue.shift(),x,y)}
 addEnemy(kind,x,y){const e=this.body(x,y,{kind,born:C.materialize,think:0,target:y-120,dir:this.rng.next()<.5?-1:1,flapT:0});this.enemies.push(e);this.events.push({type:'enemy',kind});return e}
 // Enemy flying: Bounders wander, Hunters chase the player, Shadow Lords chase from above and flap harder.
 moveEnemies(dt){const p=this.state==='play'?this.player:null;
  for(const e of this.enemies){if(e.born>0){e.born-=dt;continue}
   e.think-=dt;if(e.think<=0){e.think=this.rand(1,2.5);
    if(e.kind==='bounder'||!p){e.target=this.rand(C.ceiling+C.h+20,C.baseY-80);if(this.rng.next()<.3)e.dir=-e.dir}
    else{e.target=p.y-(e.kind==='lord'?70:20);e.dir=Math.sign(dxw(p.x,e.x))||1}}
   if(e.kind!=='bounder'&&p&&this.rng.next()<dt*2)e.target=p.y-(e.kind==='lord'?70:20);
   if(e.y>C.trollY-60&&this.pitOpen())e.target=Math.min(e.target,C.trollY-140);
   e.flapT-=dt;const rate=e.kind==='lord'?.16:e.kind==='hunter'?.2:.26;let flap=false;
   if(e.flapT<=0&&(e.y>e.target||e.vy>120)){flap=true;e.flapT=rate}
   if(!e.grab)this.move(e,dt,flap||e.ground&&this.rng.next()<dt*1.5,e.dir,C.maxSpeed[e.kind]);if(this.troll(e,dt,flap)){e.dead=true;this.events.push({type:'lava',kind:e.kind,x:e.x,y:e.y})}}
  // Riders bounce off each other as on the cabinet, so two never fly stacked as one.
  const live=this.enemies.filter(e=>!e.dead&&e.born<=0&&!e.grab);for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++){const a=live[i],b=live[j],dx=dxw(b.x,a.x);
   if(Math.abs(dx)<C.reachX&&Math.abs(b.y-a.y)<C.reachY){const s=Math.sign(dx)||1;a.dir=-s;b.dir=s;a.vx=-s*Math.max(Math.abs(a.vx),90);b.vx=s*Math.max(Math.abs(b.vx),90);a.facing=-s;b.facing=s}}
  this.enemies=this.enemies.filter(e=>!e.dead)}
 // Eggs fall, land and roll to a stop; one left alone hatches, and a bird comes to carry the rider off as the next kind.
 moveEggs(dt){for(const o of this.eggs){
  if(o.state==='egg'){if(!o.ground){const py=o.y;o.vy=Math.min(o.vy+C.gravity*dt,C.fall);o.x=wrap(o.x+o.vx*dt);o.y+=o.vy*dt;
    for(const l of this.surf)if(o.x>=l.x1&&o.x<=l.x2&&py<=l.y&&o.y>=l.y){o.y=l.y;o.vy=0;o.ground=true;break}
    if(!o.ground&&(o.y>=C.lavaY&&this.lavaOpen(o.x)||o.y>C.height))o.gone=true}
   else{o.vx=Math.sign(o.vx)*Math.max(0,Math.abs(o.vx)-200*dt);o.x=wrap(o.x+o.vx*dt);if(!this.surf.some(l=>o.x>=l.x1&&o.x<=l.x2&&Math.abs(l.y-o.y)<1))o.ground=false;
    o.t-=dt;if(o.t<=0){o.state='hatched';o.t=C.mountDelay;this.events.push({type:'hatch',x:o.x,y:o.y})}}}
  else{o.t-=dt;if(o.t<=0){o.gone=true;const e=this.addEnemy(o.kind,o.x,o.y);e.born=0;e.ground=false;e.vy=-C.climb;this.events.push({type:'mount',kind:o.kind,x:o.x,y:o.y})}}}
  this.eggs=this.eggs.filter(o=>!o.gone)}
 moveLoose(dt){for(const b of this.loose){b.x+=b.vx*dt;b.y-=60*dt}this.loose=this.loose.filter(b=>b.x>-80&&b.x<W+80)}
 // The pterodactyl: it opens a pterodactyl wave, or comes on a long wave; it sweeps in from a side and hunts the player, opening its mouth now and then.
 addPtero(i=0,baiter=false){const right=(this.rng.next()<.5)!==(i%2===1);this.pteros.push({x:right?W-1:0,y:this.rand(150,500),vx:(right?-1:1)*C.pteroSpeed,phase:i*C.mouthCycle/3,off:i?(i%2?-80:80):0,baiter});this.events.push({type:'pteroIn'})}
 movePtero(dt){if(this.baitRest>0)this.baitRest-=dt;else{this.pteroTimer-=dt;
   if(this.pteroTimer<=0&&this.pteros.filter(t=>t.baiter).length<C.maxBaiters){const a=this.baitPtr;if(a>0)this.baitPtr--;this.pteroTimer=C.baiter[a];this.addPtero(this.pteros.length,true)}}
  const p=this.state==='play'?this.player:null;for(const t of this.pteros){t.x=wrap(t.x+t.vx*dt);t.phase=(t.phase+dt)%C.mouthCycle;
   if(p){t.y+=clamp(clamp(p.y-30+(t.off||0),120,C.lavaY-40)-t.y,-C.pteroClimb*dt,C.pteroClimb*dt);if(Math.abs(dxw(p.x,t.x))>420&&Math.sign(dxw(p.x,t.x))!==Math.sign(t.vx))t.vx=-t.vx}}}
 mouthOpen(t=this.ptero){return !!t&&t.phase<C.mouthOpen}
 collide(){const p=this.player,near=(o,rx,ry)=>Math.abs(dxw(o.x,p.x))<rx&&Math.abs(o.y-p.y)<ry;
  // Eggs first, so an egg knocked loose this step is picked up on the next one.
  for(const o of this.eggs)if(near(o,30,40)){o.gone=true;const air=o.state==='egg'&&!o.ground,pts=C.eggPoints[Math.min(this.eggsTaken++,3)]+(air?C.points.eggAir:0);this.award(pts);this.events.push({type:'egg',points:pts,air,x:o.x,y:o.y})}
  this.eggs=this.eggs.filter(o=>!o.gone);
  for(const e of this.enemies){if(e.born>0||e.dead||!near(e,C.reachX,C.reachY))continue;
   // The joust: the higher lance wins; at equal height both bounce apart.
   const d=e.y-p.y;if(Math.abs(d)<=C.tie){const s=Math.sign(dxw(e.x,p.x))||1;e.vx=s*Math.max(Math.abs(e.vx),120);e.dir=s;p.vx=-s*Math.max(Math.abs(p.vx),120);this.events.push({type:'bounce',x:(p.x+e.x)/2,y:p.y});continue}
   if(d>0)this.unseat(e);else if(!(p.shield>0)){this.die('joust');return}}
  for(const t of [...this.pteros])if(near(t,48,40)){const s=Math.sign(dxw(t.x,p.x))||1,headOn=p.facing===s&&Math.sign(t.vx)===-s;
   if(this.mouthOpen(t)&&headOn&&Math.abs(t.y-p.y)<=C.tie*2){this.award(C.points.ptero);this.events.push({type:'ptero',points:C.points.ptero,x:t.x,y:t.y});this.pteros=this.pteros.filter(x=>x!==t)}
   else if(!(p.shield>0)){this.die('ptero');return}}}
 unseat(e){e.dead=true;this.enemies=this.enemies.filter(x=>x!==e);const pts=C.points[e.kind];this.award(pts);this.killsThisWave++;
  this.events.push({type:'joust',kind:e.kind,points:pts,x:e.x,y:e.y});
  this.eggs.push({x:e.x,y:e.y-20,vx:e.vx*.6,vy:Math.min(0,e.vy),ground:false,t:C.hatch,kind:C.next[e.kind],state:'egg'});
  this.loose.push({x:e.x,y:e.y,vx:(e.vx>=0?1:-1)*240})}
 die(cause){const p=this.player;this.award(C.points.death);this.pteros=this.pteros.filter(t=>!t.baiter);this.baitRest=C.baiterRest;this.eggsTaken=0;this.lives--;this.diedThisWave=true;this.events.push({type:'death',cause,x:p.x,y:p.y,lives:this.lives});this.player=null;
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // Demo pilot: climbs above the nearest enemy and comes down on it, picks up eggs, keeps clear of the pit and the pterodactyl.
 pilot(){const p=this.player;let flap=false,axis=0;
  if(p){let target=null,best=1e9;for(const e of this.enemies){if(e.born>0)continue;const d=Math.abs(dxw(e.x,p.x))+Math.abs(e.y-p.y);if(d<best){best=d;target={x:e.x,y:e.y-50,foe:e}}}
   for(const o of this.eggs){const d=Math.abs(dxw(o.x,p.x))+Math.abs(o.y-p.y)*.5;if(d<best*.7){best=d;target={x:o.x,y:o.y}}}
   const t=this.pteros.reduce((a,b)=>!a||Math.abs(dxw(b.x,p.x))<Math.abs(dxw(a.x,p.x))?b:a,null);if(t&&Math.abs(dxw(t.x,p.x))<340)target={x:p.x-Math.sign(dxw(t.x,p.x))*200,y:t.y>p.y?t.y-150:t.y+150};
   const ty=Math.min(target?target.y:300,this.pitOpen()?C.trollY-90:C.baseY-40),dx=target?dxw(target.x,p.x):0;axis=Math.abs(dx)<8?0:Math.sign(dx);
   // Never close in on a rider from below: back off and climb first.
   if(target&&target.foe&&p.y>target.foe.y-10&&Math.abs(dx)<120)axis=-Math.sign(dx)||1;
   flap=!!p.grab||p.y>ty||p.vy>200}
  // Released between flaps for a moment, so the demo flaps at a human pace (about eight a second).
  this.pilotGap=(this.pilotGap||0)-C.step;const out=flap&&!this.pilotFlap&&this.pilotGap<=0;if(out)this.pilotGap=.12;this.pilotFlap=out;return{axis,flap:out}}
 snapshot(){const r=v=>+v.toFixed(2),p=this.player;return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,wave:this.wave,kind:this.kind,flaps:this.flaps,
  player:p?{x:r(p.x),y:r(p.y),vx:r(p.vx),vy:r(p.vy)}:null,enemies:this.enemies.map(e=>[e.kind,r(e.x),r(e.y)]),eggs:this.eggs.map(o=>[o.state,r(o.x),r(o.y)]),ptero:!!this.ptero,pteros:this.pteros.length}}
}
const JockJoustCore={CONFIG,JoustEngine,SeededRandom,waveKind,waveRow,wrap,dxw};
g.JockJoustCore=JockJoustCore;if(typeof module!=='undefined')module.exports=JockJoustCore;
})(globalThis);
