'use strict';
/* Hall Patrol: Irem Moon Patrol (1982) rules, drawn as her six-wheeled buggy patrolling the school hallway between lockers.
   Rules follow the original cabinet: the buggy drives right along a cratered floor while the view scrolls with it;
   the stick speeds it up or slows it down (the faster it goes, the further right it sits on screen) and the jump
   button hops it; one fire button shoots forward and straight up at the same time: the forward shot is short and
   one at a time, the anti-air shots go up several at once. Craters must be jumped; rocks can be jumped or shot
   (small rocks go in one hit, big rocks split into a small one first); rolling boulders come at you; mines can only
   be jumped; UFOs come in formations of three and drop bombs (the low-flying bombers' have the least way to fall),
   and the tri-orbs' bombs blow new craters into the floor; tanks fire shells along the ground. The course runs
   checkpoints A to Z in five sections (A-E, E-J, J-O, O-T, T-Z); the beginner course is followed by the champion
   course, which then repeats. Enemies join by checkpoint as on the cabinet's beginner course (StrategyWiki Moon Patrol
   walkthrough, checked 2026-10-31): small pits, rocks, saucers and low bombers from A, tri-orbs from D, deep pits and
   double rocks from F, mines from J, rolling boulders from P (the first hill), tanks from U; the champion course has
   everything, closer together. A lost buggy restarts at the last
   checkpoint passed. Scoring by the cabinet's table (Williams manual 16-3007-101, checked 2026-10-26): saucer 100,
   crater bomber 200, tri-orb 200, a whole formation of three shot down 500 more (the manual's 800 and 1,000 for four
   and five never come up: formations here are always three); tank 200 shot, 100 jumped; boulder 50 shot, 100 jumped; mine 50 jumped; crater 50
   (small) or 100 (large) jumped; small rock 100 shot, 50 jumped; big (double) rock 100 jumped whole, 100 for the
   first shot, and its leftover half 100 shot or 80 jumped (200 shot through, 180 shot once and jumped). At the end of each section the time is compared with
   the average time: beginner course 1,000 plus 100 a second under 55, 55, 60, 60 and 65 seconds, 5,000 for the
   whole course; champion course 2,000 plus 100 a second under 70, 10,000 for the whole course. Three buggies,
   extra ones at 10,000, 30,000 and 50,000.
   Not found in any source: the par times per section and the 10,000 champion course bonus (one fan page); the mine
   value is from fan pages only.
   Adaptations (not ROM-exact): the course layout is generated from a seed per checkpoint instead of the ROM's fixed
   maps; the cabinet's separate medium rock is only met as the leftover half of a big one; the enemy rocket car of the later champion checkpoints is left out;
   speeds, jump arc and spacing tuned by eye at 120 Hz on the 1024 by 768 page. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['jump','b'],['fire','b']],
  groundY:620,segment:2000,checkpoints:26,sectionEnds:Object.freeze([4,9,14,19,25]),
  vMin:120,vCruise:200,vMax:320,accel:260,screenMin:180,screenMax:440,screenFollow:140,
  jumpSpeed:600,gravity:1333,bodyHalf:56,wheels:Object.freeze([-47,-21,36]),bodyHeight:60,gunHeight:30,
  shotSpeed:800,shotRange:300,upSpeed:720,upMax:3,upTop:40,
  sizes:Object.freeze({craterSmall:[48,0],craterBig:[68,0],rockSmall:[50,22],rockBig:[58,44],mine:[52,14],tank:[70,40],ball:[36,36]}),
  // Checkpoint (0 = A) from which each obstacle and craft joins the beginner course (StrategyWiki walkthrough).
  from:Object.freeze({craterBig:5,rockBig:5,mine:9,ball:15,tank:20,orb:3}),
  ballSpeed:80,tankEvery:2.4,shellSpeed:260,shellHeight:24,
  ufo:Object.freeze({saucer:{speed:160,top:110,bottom:330,points:100},bomber:{speed:130,top:260,bottom:400,points:200},orb:{speed:240,top:110,bottom:300,points:200}}),
  ufoLife:12,ufoDelay:Object.freeze([3,7]),bombSpeed:240,bombDelay:Object.freeze([1.2,2.6]),
  points:Object.freeze({formation:500,tank:200,tankJump:100,ball:50,ballJump:100,mineJump:50,craterSmall:50,craterBig:100,rock:100,rockSplit:100,rockJump:50,rockBigJump:100,rockHalfJump:80}),
  par:Object.freeze([55,55,60,60,65]),championPar:70,sectionBonus:Object.freeze([1000,2000]),courseBonus:Object.freeze([5000,10000]),perSecond:100,
  lives:3,extraLives:Object.freeze([10000,30000,50000]),deathPause:2.2,sectionPause:3});
class SeededRandom{constructor(seed=1982){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Points for passing an obstacle by jumping it.
const JUMP={craterSmall:C.points.craterSmall,craterBig:C.points.craterBig,rockSmall:C.points.rockJump,rockBig:C.points.rockBigJump,mine:C.points.mineJump,tank:C.points.tankJump,ball:C.points.ballJump};
class PatrolEngine{
 constructor(seed=1982){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.extra=0;this.shots=0;this.ups=0;this.nextGroup=0;
  this.course=1;this.base=200;this.cp=0;this.secTime=0;this.state='play';this.timer=0;this.place(0);return this}
 between([a,b]){return a+(b-a)*this.rng.next()}
 marker(i){return this.base+i*C.segment}
 letter(){return LETTERS[this.cp]}
 champion(){return this.course>1}
 // Stage of a checkpoint: which enemies are out (0 = A-E, 1 = F-J, 2 = K-O, 3 = P-T, 4 = U-Z); the champion course is past all of them.
 stage(i=this.cp){return this.champion()?5:Math.min(4,Math.floor(i/5))}
 // Put the buggy just past checkpoint i with the floor from there on laid out fresh (the cabinet's restart point).
 place(i){this.cp=i;this.v=C.vCruise;this.bsx=C.screenMin+(C.vCruise-C.vMin)/(C.vMax-C.vMin)*(C.screenMax-C.screenMin);this.d=this.marker(i)+40-this.bsx;
  this.h=0;this.vh=0;this.shot=null;this.upShots=[];this.ufos=[];this.bombs=[];this.shells=[];this.groups={};this.ufoTimer=this.between(C.ufoDelay);this.objects=[];this.built=i;this.build()}
 bx(){return this.d+this.bsx}
 // The floor of each checkpoint comes from its own seed, so a restart meets the same layout.
 build(){while(this.built<C.checkpoints-1&&this.marker(this.built)<this.d+C.width*3){this.layout(this.built);this.built++}}
 layout(i){const r=new SeededRandom((Math.imul(this.seed,7919)+this.course*104729+i*1009)>>>0),s=this.stage(i),end=this.marker(i+1)-160;
  // Beginner course: small pits and rocks from A, deep pits and double rocks from F, mines from J, boulders from P, tanks from U; the champion course has them all.
  const has=k=>s>=5||i>=C.from[k],kinds=['craterSmall','craterSmall','rockSmall','rockSmall'];if(has('craterBig'))kinds.push('craterBig','craterBig','rockBig');if(has('mine'))kinds.push('mine','mine');if(has('ball'))kinds.push('ball','ball');if(has('tank'))kinds.push('tank','tank');
  const gap=s>=5?[250,440]:[320-s*12,580-s*28];let x=this.marker(i)+(i===0&&this.course===1?900:260);
  // A boulder rolls toward the buggy, so it gets extra floor before and after it: never one landing under a jump.
  let prev='';while(x<end){const kind=kinds[Math.floor(r.next()*kinds.length)];if(kind==='ball'&&prev)x+=180;if(x>=end)break;this.add(kind,x);x+=gap[0]+(gap[1]-gap[0])*r.next()+(kind==='ball'?180:0);prev=kind}}
 add(kind,x){const [w,h]=C.sizes[kind];const o={kind,x,w,h,passed:false,fire:C.tankEvery*.5};this.objects.push(o);return o}
 crater(k){return k==='craterSmall'||k==='craterBig'}
 award(n){this.score+=n;while(this.extra<C.extraLives.length&&this.score>=C.extraLives[this.extra]){this.extra++;this.lives++;this.events.push({type:'extra'})}}
 kill(kind,points,x,y){this.award(points);this.events.push({type:'kill',kind,points,x,y})}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state!=='play'){this.timer-=dt;if(this.timer<=0){if(this.state==='dead')this.place(this.cp);this.state='play'}return}
  this.secTime+=dt;this.drive(dt,input);this.build();this.fire(input);this.moveShots(dt);this.moveObjects(dt);this.moveUfos(dt);this.moveBombs(dt);
  if(this.state==='play')this.collide();if(this.state==='play')this.checkpoints()}
 // The stick sets the speed between slow and fast, cruising when let go; the buggy sits further right the faster it goes.
 drive(dt,input){const ax=clamp(Number(input.axis)||0,-1,1)||((input.right?1:0)-(input.left?1:0)),target=ax>0?C.vCruise+ax*(C.vMax-C.vCruise):C.vCruise+ax*(C.vCruise-C.vMin);
  this.v+=clamp(target-this.v,-C.accel*dt,C.accel*dt);const want=C.screenMin+(this.v-C.vMin)/(C.vMax-C.vMin)*(C.screenMax-C.screenMin);this.bsx+=clamp(want-this.bsx,-C.screenFollow*dt,C.screenFollow*dt);this.d+=this.v*dt;
  if(input.jump&&this.h===0&&this.vh===0){this.vh=C.jumpSpeed;this.events.push({type:'jump'})}
  if(this.h>0||this.vh>0){this.vh-=C.gravity*dt;this.h+=this.vh*dt;if(this.h<=0){this.h=0;this.vh=0;this.events.push({type:'land'})}}}
 // One button: a short shot forward (one at a time) and a shot straight up (a few at once), together.
 fire(input){const f=!!input.fire,edge=f&&!this.fireHeld;this.fireHeld=f;if(!edge)return;
  if(!this.shot){this.shot={x:this.bx()+C.bodyHalf,h:this.h+C.gunHeight,from:this.bx()+C.bodyHalf};this.shots++;this.events.push({type:'shot'})}
  if(this.upShots.length<C.upMax){this.upShots.push({sx:this.bsx-6,y:C.groundY-this.h-C.bodyHeight});this.ups++;this.events.push({type:'up'})}}
 moveShots(dt){const s=this.shot;if(s){s.x+=(C.shotSpeed+this.v)*dt;if(s.x-s.from>C.shotRange)this.shot=null;else this.shotHits(s)}
  for(const u of this.upShots)u.y-=C.upSpeed*dt;this.upShots=this.upShots.filter(u=>u.y>C.upTop&&!this.upHits(u))}
 shotHits(s){for(const sh of this.shells)if(Math.abs(sh.x-s.x)<14){this.shells.splice(this.shells.indexOf(sh),1);this.shot=null;this.events.push({type:'blast',x:s.x-this.d,y:C.groundY-s.h});return}
  for(const o of this.objects){if(this.crater(o.kind)||o.kind==='mine'||Math.abs(o.x-s.x)>o.w/2||s.h>o.h+10)continue;this.shot=null;const x=o.x-this.d,y=C.groundY-o.h/2;
   // A big rock splits, leaving its smaller half; everything else on the floor goes in one hit.
   if(o.kind==='rockBig'){Object.assign(o,{kind:'rockSmall',half:true,w:C.sizes.rockSmall[0],h:C.sizes.rockSmall[1]});this.kill('rockBig',C.points.rockSplit,x,y)}
   else{this.objects.splice(this.objects.indexOf(o),1);this.kill(o.kind,o.kind==='tank'?C.points.tank:o.kind==='ball'?C.points.ball:C.points.rock,x,y)}return}}
 upHits(u){for(const f of this.ufos)if(Math.abs(f.sx-u.sx)<34&&Math.abs(f.y-u.y)<22){this.ufos.splice(this.ufos.indexOf(f),1);this.kill(f.type,C.ufo[f.type].points,f.sx,f.y);
   const gr=this.groups[f.group];if(gr&&++gr.shot===3){this.award(C.points.formation);this.events.push({type:'formation',points:C.points.formation,x:f.sx,y:f.y})}return true}
  for(const b of this.bombs)if(Math.abs(b.x-this.d-u.sx)<16&&Math.abs(b.y-u.y)<16){this.bombs.splice(this.bombs.indexOf(b),1);this.events.push({type:'blast',x:u.sx,y:u.y});return true}return false}
 // Boulders roll toward the buggy once in view; tanks in view fire shells along the floor.
 moveObjects(dt){const right=this.d+C.width;for(const o of this.objects){if(o.x>right+40)continue;
   if(o.kind==='ball')o.x-=C.ballSpeed*dt;
   if(o.kind==='tank'&&o.x>this.bx()+C.bodyHalf+40){o.fire-=dt;if(o.fire<=0){o.fire=C.tankEvery;this.shells.push({x:o.x-o.w/2,h:C.shellHeight});this.events.push({type:'tankfire'})}}}
  for(const sh of this.shells)sh.x-=C.shellSpeed*dt;this.shells=this.shells.filter(sh=>sh.x>this.d-40);
  // Passing an obstacle means it was jumped.
  const rear=this.bx()-C.bodyHalf;for(const o of this.objects)if(!o.passed&&o.x+o.w/2<rear){o.passed=true;const p=o.half?C.points.rockHalfJump:JUMP[o.kind];this.award(p);this.events.push({type:'pass',kind:o.kind,points:p,x:o.x-this.d,y:C.groundY-40})}
  this.objects=this.objects.filter(o=>o.x>this.d-200)}
 // UFOs come three at a time, wander over the hallway and bomb ahead of the buggy, then leave.
 moveUfos(dt){if(!this.ufos.length){this.ufoTimer-=dt*(this.champion()?1.5:1);if(this.ufoTimer<=0){this.ufoTimer=this.between(C.ufoDelay);this.formation()}}
  for(const f of this.ufos){const t=C.ufo[f.type];f.life-=dt;if(f.life<=0){f.tx=f.sx;f.ty=-120}
   const dx=f.tx-f.sx,dy=f.ty-f.y,dist=Math.hypot(dx,dy);if(dist<6&&f.life>0){f.tx=120+this.rng.next()*(C.width-240);f.ty=t.top+this.rng.next()*(t.bottom-t.top)}else if(dist>0){const k=Math.min(1,t.speed*dt/dist);f.sx+=dx*k;f.y+=dy*k}
   f.bomb-=dt;if(f.bomb<=0&&f.life>0&&f.y>0){const fall=(C.groundY-f.y)/C.bombSpeed,aim=this.bsx+this.v*fall;
    if(Math.abs(f.sx-aim)<90){f.bomb=this.between(C.bombDelay);this.bombs.push({x:this.d+f.sx,y:f.y+16,crater:f.type==='orb'});this.events.push({type:'bomb'})}else f.bomb=.2}}
  this.ufos=this.ufos.filter(f=>f.y>-100)}
 formation(){const types=['saucer','saucer','bomber'];if(this.champion()||this.cp>=C.from.orb)types.push('orb','orb');const type=types[Math.floor(this.rng.next()*types.length)],group=++this.nextGroup;this.groups={[group]:{shot:0}};
  for(let k=0;k<3;k++){const left=this.rng.next()<.5;this.ufos.push({type,group,sx:left?-40-k*60:C.width+40+k*60,y:C.ufo[type].top+k*30,tx:200+this.rng.next()*(C.width-400),ty:C.ufo[type].top+this.rng.next()*(C.ufo[type].bottom-C.ufo[type].top),life:C.ufoLife+k,bomb:this.between(C.bombDelay)+k*.4})}
  this.events.push({type:'ufoIn',kind:type})}
 // A bomb that reaches the floor blasts there; a bomber's bomb also leaves a new crater.
 moveBombs(dt){for(const b of this.bombs){b.y+=C.bombSpeed*dt;if(b.y>=C.groundY){b.done=true;this.events.push({type:'blast',x:b.x-this.d,y:C.groundY});
   if(Math.abs(b.x-this.bx())<C.bodyHalf+6&&this.h<40)return this.die();
   if(b.crater&&!this.objects.some(o=>Math.abs(o.x-b.x)<o.w/2+60)){const c=this.add('craterSmall',b.x);this.events.push({type:'crater',x:c.x-this.d})}}}
  this.bombs=this.bombs.filter(b=>!b.done)}
 collide(){const bx=this.bx(),top=C.groundY-this.h-C.bodyHeight,bottom=C.groundY-this.h;
  for(const o of this.objects){if(this.crater(o.kind)){if(this.h===0&&C.wheels.some(w=>Math.abs(bx+w-o.x)<o.w/2-6))return this.die('crater');continue}
   // A mine goes off under a wheel; anything taller hits the body.
   const reach=o.kind==='mine'?C.wheels.some(w=>Math.abs(bx+w-o.x)<o.w/2):Math.abs(o.x-bx)<o.w/2+C.bodyHalf;if(reach&&this.h<o.h-2)return this.die(o.kind)}
  for(const sh of this.shells)if(Math.abs(sh.x-bx)<C.bodyHalf&&this.h<sh.h+4)return this.die('shell');
  for(const b of this.bombs)if(Math.abs(b.x-bx)<C.bodyHalf&&b.y>top&&b.y<bottom)return this.die('bomb')}
 die(cause='blast'){this.lives--;this.events.push({type:'death',cause,x:this.bsx,y:C.groundY-this.h-30,lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 // Checkpoints: each letter passed is the new restart point; E, J, O, T and Z end a section and its time is scored.
 checkpoints(){const next=this.cp+1;if(next>=C.checkpoints||this.bx()<this.marker(next))return;this.cp=next;this.events.push({type:'checkpoint',letter:this.letter(),course:this.course});
  const sec=C.sectionEnds.indexOf(next);if(sec<0)return;const champ=this.champion(),par=champ?C.championPar:C.par[sec],time=Math.floor(this.secTime),bonus=C.sectionBonus[champ?1:0]+C.perSecond*Math.max(0,par-time);
  this.award(bonus);this.events.push({type:'section',letter:this.letter(),time,par,bonus,course:this.course});this.secTime=0;this.state='section';this.timer=C.sectionPause;
  if(next===C.checkpoints-1){const cb=C.courseBonus[champ?1:0];this.award(cb);this.events.push({type:'course',course:this.course,bonus:cb});this.course++;this.base=this.marker(next);this.cp=0;this.built=0;this.objects=this.objects.filter(o=>o.x<this.base);this.build()}}
 // Demo pilot: cruises, shoots everything ahead and overhead, and speeds up and jumps for craters, mines and what it cannot shoot in time.
 pilot(){const bx=this.bx(),front=bx+C.bodyHalf,ahead=this.objects.filter(o=>o.x+o.w/2>bx-C.bodyHalf).sort((a,b)=>a.x-b.x),o=ahead[0],jumpOnly=o&&(this.crater(o.kind)||o.kind==='mine');
  const fire=Math.floor(this.clock*8)%2===0;let axis=0,jump=false;
  if(ahead.some(a=>(this.crater(a.kind)||a.kind==='tank')&&a.x-bx<700))axis=.8;
  if(o){const air=this.v*2*C.jumpSpeed/C.gravity,W=C.wheels,span=(this.crater(o.kind)?o.w-12+W[2]-W[0]:o.w+2*C.bodyHalf),lead=Math.max(4,(air-span)/2),gap=(this.crater(o.kind)?o.x-o.w/2+6-(bx+W[2]):o.x-o.w/2-front);
   if((jumpOnly||o.kind==='tank'||gap<40)&&gap<lead+6&&gap>-20)jump=true}
  if(this.shells.some(sh=>sh.x-bx<120&&sh.x>bx))jump=true;
  // Bombs: speed up or slow down out from under the ones that would land on it.
  for(const b of this.bombs){const t=(C.groundY-b.y)/C.bombSpeed,miss=b.x-(bx+this.v*t);if(Math.abs(miss)<C.bodyHalf+30){axis=miss>0||this.v>=C.vMax-20?-1:1;if(this.v<=C.vMin+20)axis=1}}
  return{axis,jump,fire}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,course:this.course,checkpoint:this.letter(),distance:+this.d.toFixed(2),speed:+this.v.toFixed(2),
  height:+this.h.toFixed(2),objects:this.objects.length,ufos:this.ufos.length,bombs:this.bombs.length,shells:this.shells.length,shots:this.shots,ups:this.ups}}
}
const PatrolCore={CONFIG,PatrolEngine,SeededRandom,LETTERS};
g.HallPatrolCore=PatrolCore;if(typeof module!=='undefined')module.exports=PatrolCore;
})(globalThis);
