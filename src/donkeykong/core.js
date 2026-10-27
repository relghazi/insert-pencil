'use strict';
/* Dunce Kong: Nintendo Donkey Kong (1981) rules, drawn as a gorilla in a dunce cap on her red girders and blue ladders.
   Rules follow the original cabinet: four screens in the cabinet order, level 1: 25m, 100m; level 2: 25m, 75m, 100m;
   level 3: 25m, 50m, 75m, 100m; level 4: 25m, 50m, 25m, 75m, 100m; level 5 on: 25m, 50m, 25m, 75m, 25m, 100m, then
   the loop repeats. An internal difficulty (the level, plus one for every 2,048 frames on a screen, at most 5, starting
   again with each screen and life) speeds up the barrels and fireballs and the firefoxes' arrival. 25m: Kong throws a
   barrel about every 1.6 seconds, and each throw takes 100 off the bonus; barrels roll down the sloped girders, drop
   to the next girder at each end and may take a ladder down: always until the oil drum is lit, never when the player
   is not below, otherwise a 1, 2 or 3 in 4 chance by difficulty and then surely if the player is right under it or
   pushes the stick toward it, else one time in four; his first barrel is a blue one dropped straight down into the
   oil drum, every 8th barrel is blue and one in 16 drops wild, and every blue barrel that reaches the drum lets out a
   fireball that wanders the girders and climbs ladders after the player; broken ladders cannot be climbed. 50m: conveyor belts carry pies
   (cement tubs) that fall off the ends or into the fire, the outer belts reverse from time to time, the two side
   ladders slide up out of reach for part of every cycle, and firefoxes come out of the burning drum, never more of
   them than the difficulty. 75m: two elevator shafts (left going up, right going down), a spring with every tick of
   the bonus bounces from Kong along the top and drops down the
   right side, firefoxes wander the platforms; riding the up elevator to the top or falling off the bottom is fatal.
   25m, 50m and 75m end when the player reaches the lady at the top. 100m: eight rivets, two on each of four floors;
   walking or jumping over one pulls it (100) and leaves a gap; firefoxes come in from the floor ends; all eight
   pulled drops Kong and ends the round. The player walks, climbs and jumps a fixed arc (no steering once in the
   air); a drop of more than a short fall is fatal. Scoring by the cabinet's table: a jump over one barrel, pie,
   fireball or firefox 100, over two at once 300, over three or more 500 (the ROM shows the 800 sprite but adds 500,
   3E81); the hammer smashes a barrel for 300 and
   anything else for 500 (half the time), 800 or 300
   (a quarter each); the hammer cannot jump or climb and runs out after 512 frames; the hat, umbrella and
   purse score 300, 500 or 800 by level; a pulled rivet 100. The bonus timer starts at 5000 (6000, 7000, then 8000
   from level 4), counts down by 100 every 2 seconds on level 1,
   1.67 on level 2, 1.33 on level 3 and 1 from level 4 (on 25m it drops with each barrel instead), and is paid out when the screen is finished; at zero the player dies. Three
   lives and one extra life at 7,000 (factory default).
   Checked 2026-10-26 against the ROM disassembly dkong.asm (github.com/furrykef/dkdasm): jumps 3E70-3E85, hammer
   1DD7-1E10, items 1DE7, bonus 0F86 and 0F97, lives 0210, extra life 021A, screen order 3A65; checked again
   2026-10-31 for the internal difficulty 037F, barrel deployment 2C03-2DCB, barrels at ladders 216D, hammer time
   2F49, fireball speed 30FA, fire release 2DDF and 318C, and the bonus ticks 2FCB.
   Adaptations (not ROM-exact): the screens are laid out on the cabinet's 224 x 256 grid scaled to the 4:3 page;
   speeds (fireballs scaled from level 1 by the cabinet's frame ratios), fireball steering and the belt, ladder and
   elevator timings are tuned by eye at 120 Hz; wild barrels after the first one fall straight with a drift toward the player;
   the hammer swings in front of the player only; firefoxes do not ride the belts; rivets stay pulled after a lost
   life; no "how high can you get" intermission. */
(function(g){
const S=3.1,X0=165,Y0=-34,D=v=>v*S,px=x=>X0+x*S,py=y=>Y0+y*S;
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20],['axisY','n',-1,1,20],['jump','b']],scale:S,
  order:Object.freeze([[25,100],[25,75,100],[25,50,75,100],[25,50,25,75,100],[25,50,25,75,25,100]]),
  points:Object.freeze({jump:Object.freeze([0,100,300,500]),barrelSmash:300,rivet:100}),smashPoints:Object.freeze([300,500,800]),itemPoints:Object.freeze([300,500,800]),
  bonusStart:5000,bonusUp:1000,bonusMax:8000,bonusStep:100,bonusFrames:Object.freeze([120,100,80,60]),
  walk:D(45),climb:D(30),jumpTime:.6,jumpHeight:D(12),fallMax:D(19),gravity:8*D(12)/(.6*.6),
  barrelSpeed:D(55),barrelLadder:D(40),barrelGravity:D(320),throwFrames:72,crazyOdds:16,blueEvery:8,difficultyFrames:2048,
  fireSpeed:D(28),fireClimb:D(20),fireMax:5,fireRate:Object.freeze([.5,.625,.75,.75,.875]),fireEvery:Object.freeze([256,256,128,128,64]),beltSpeed:D(22),pieEvery:Object.freeze([1.4,2.4]),liftSpeed:D(28),
  springSpeed:D(60),springDrop:D(150),hammerTime:512/60,
  lives:3,extraAt:7000,readyTime:1.5,deathPause:2,clearPause:2.5});
class SeededRandom{constructor(seed=1981){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const C=CONFIG,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),sign=v=>v>0?1:v<0?-1:0;
const yAt=(p,x)=>p.x2===p.x1?p.y1:p.y1+(p.y2-p.y1)*(clamp(x,p.x1,p.x2)-p.x1)/(p.x2-p.x1);
const plat=(x1,x2,y1,y2,o={})=>({x1:px(x1),x2:px(x2),y1:py(y1),y2:py(y2),dir:0,belt:null,row:-1,goal:false,...o});
// The four screens on the cabinet's 224 x 256 grid: platforms [x1,x2,y1,y2,options], ladders [x, lower, upper, broken|'retract'],
// hammers and items [x, platform], firefox starts, the player's start and where Kong and the lady stand.
const SCREENS={
 25:{plats:[[0,112,248,248,{dir:-1}],[112,224,248,241,{dir:-1}],[0,208,208,216,{dir:1}],[16,224,182,174,{dir:-1}],[0,208,141,149,{dir:1}],[16,224,116,108,{dir:-1}],[0,136,84,84,{dir:1}],[136,208,84,88,{dir:1}],[88,136,56,56,{goal:true}]],
  ladders:[[80,0,2,1],[184,1,2,0],[32,2,3,0],[96,2,3,0],[168,2,3,1],[64,3,4,1],[112,3,4,0],[184,3,4,0],[32,4,5,0],[104,4,5,1],[168,4,5,0],[72,5,6,1],[184,5,7,0],[128,6,8,0]],
  hammers:[[24,4],[152,2]],items:[],start:[40,0],kong:[36,6],lady:[104,8],drum:[16,0]},
 50:{plats:[[0,224,248,248],[8,216,208,208,{belt:'a'}],[0,96,168,168,{belt:'b'}],[128,224,168,168,{belt:'c'}],[96,128,168,168,{fire:true}],[0,48,128,128],[88,136,128,128],[176,224,128,128],[16,208,88,88,{belt:'d'}],[32,192,56,56,{goal:true}]],
  ladders:[[16,0,1,0],[112,0,1,0],[208,0,1,0],[40,1,2,'retract'],[184,1,3,'retract'],[24,2,5,0],[92,2,6,0],[200,3,7,0],[32,5,8,0],[192,7,8,0],[40,8,9,0],[184,8,9,0]],
  hammers:[[12,5],[200,1]],items:[['hat',100,1],['umbrella',128,6],['purse',216,7]],start:[40,0],kong:[112,8],lady:[112,9],drum:[112,4]},
 75:{plats:[[0,36,240,240],[60,100,208,208],[60,100,168,168],[60,100,128,128],[124,224,192,192],[168,224,152,152],[176,224,120,120],[0,224,88,88],[88,136,56,56,{goal:true}]],
  ladders:[[80,1,2,0],[68,2,3,0],[176,4,5,0],[208,5,6,0],[216,6,7,0],[128,7,8,0]],
  lifts:[{id:'A',x1:36,x2:60,dir:-1},{id:'B',x1:100,x2:124,dir:1}],
  hammers:[],items:[['hat',12,0],['purse',80,3],['umbrella',200,4]],fires:[[80,1],[200,5]],start:[16,0],kong:[36,7],lady:[104,8]},
 100:{plats:[[0,224,248,248,{row:0}],[8,216,208,208,{row:1}],[16,208,168,168,{row:2}],[24,200,128,128,{row:3}],[32,192,88,88,{row:4}],[88,136,48,48]],
  ladders:[[16,0,1,0],[112,0,1,0],[208,0,1,0],[24,1,2,0],[80,1,2,0],[144,1,2,0],[200,1,2,0],[32,2,3,0],[112,2,3,0],[192,2,3,0],[40,3,4,0],[184,3,4,0]],
  hammers:[[100,1],[96,3]],items:[['hat',188,1],['purse',96,2],['umbrella',140,3]],rivets:[56,168],start:[40,0],kong:[112,4],lady:[112,5]}};
const LIFT={top:100,bottom:252,count:3};
class KongEngine{
 constructor(seed=1981){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=C.lives;this.extraGiven=false;this.level=1;this.index=0;this.nextId=0;this.rivets=null;this.jumpHeld=false;this.startScreen();return this}
 between([a,b]){return a+(b-a)*this.rng.next()}
 get order(){return C.order[Math.min(this.level,C.order.length)-1]}
 // The cabinet's internal difficulty (ROM 037F): the level, plus one for every 2,048 frames (about 34 seconds) spent on
 // the screen, at most 5; it starts again with every screen and every life.
 difficulty(){return Math.min(5,this.level+Math.floor(this.screenTime*60/C.difficultyFrames))}
 levelK(){return (this.difficulty()-1)/4}
 award(n){this.score+=n;if(!this.extraGiven&&this.score>=C.extraAt){this.extraGiven=true;this.lives++;this.events.push({type:'extra'})}}
 // Builds the current screen; the rivets pulled on 100m stay pulled across a lost life.
 startScreen(){const kind=this.order[this.index],L=SCREENS[kind];this.screen=kind;this.id=0;
  this.base=L.plats.map(([a,b,c,d,o])=>plat(a,b,c,d,o));
  this.ladders=L.ladders.map(([x,lo,up,br])=>({x:px(x),bot:yAt(this.base[lo],px(x)),top:yAt(this.base[up],px(x)),broken:br===1,retract:br==='retract',phase:x>112?3:0}));
  if(kind===100){if(!this.rivets)this.rivets=[1,2,3,4].flatMap(row=>L.rivets.map(x=>({row,x:px(x),y:this.base[row].y1,alive:true,side:0})))}
  this.rebuild();
  this.belts={a:{speed:C.beltSpeed,timer:this.between([4,8]),flip:true},b:{speed:C.beltSpeed,flip:false},c:{speed:-C.beltSpeed,flip:false},d:{speed:-C.beltSpeed,timer:this.between([4,8]),flip:true}};
  this.lifts=(L.lifts||[]).flatMap(l=>[...Array(LIFT.count)].map((_,k)=>({lift:l.id,x1:px(l.x1),x2:px(l.x2),dir:l.dir,phase:k/LIFT.count,y1:0,y2:0,belt:null,goal:false,row:-1})));this.moveLifts(0);
  const s=this.platAt(px(L.start[0]),yAt(this.base[L.start[1]],px(L.start[0])));
  this.player={x:px(L.start[0]),y:yAt(s,px(L.start[0])),plat:s,ladder:null,state:'walk',vx:0,vy:0,dir:1,apex:0,over:new Set(),hammer:0,moving:false};
  const kp=this.base[L.kong[1]];this.kong={x:px(L.kong[0]),y:yAt(kp,px(L.kong[0])),pose:'stand',poseTime:0,dir:1};this.lady={x:px(L.lady[0]),y:this.base[L.lady[1]].y1};
  this.drum=L.drum?{x:px(L.drum[0]),y:yAt(this.base[L.drum[1]],px(L.drum[0]))}:null;
  this.hammers=L.hammers.map(([x,i])=>({x:px(x),y:yAt(this.base[i],px(x))-D(22),alive:true}));
  this.items=L.items.map(([kind,x,i])=>({kind,x:px(x),y:yAt(this.base[i],px(x)),alive:true}));
  this.hazards=[];for(const [x,i] of L.fires||[])this.addFire(px(x),this.base[i]);
  this.throwTimer=1;this.thrown=0;this.spawnTimer=3;this.pieTimer=1;this.springTimer=1.5;this.screenTime=0;this.oilLit=false;this.blueAt=0;
  this.bonus=Math.min(C.bonusMax,C.bonusStart+C.bonusUp*(this.level-1));this.bonusTimer=this.bonusEvery();
  this.state='ready';this.timer=C.readyTime;this.events.push({type:'screen',screen:kind,level:this.level})}
 // On 100m every pulled rivet cuts its floor, leaving a gap the player can jump and the firefoxes cannot cross.
 rebuild(){let plats=this.base;
  if(this.rivets)for(const r of this.rivets.filter(r=>!r.alive)){const half=D(5);plats=plats.flatMap(p=>p.row===r.row&&r.x>p.x1&&r.x<p.x2?[{...p,x2:r.x-half},{...p,x1:r.x+half}]:[p])}
  this.plats=plats}
 allPlats(){return this.lifts?.length?[...this.plats,...this.lifts]:this.plats}
 platAt(x,y,tol=D(4)){let best=null,bd=tol;for(const p of this.allPlats())if(x>=p.x1-.01&&x<=p.x2+.01){const d=Math.abs(yAt(p,x)-y);if(d<=bd){bd=d;best=p}}return best}
 moveLifts(dt){for(const l of this.lifts){l.phase=(l.phase+dt*C.liftSpeed/D(LIFT.bottom-LIFT.top))%1;const y=l.dir<0?py(LIFT.bottom)-l.phase*D(LIFT.bottom-LIFT.top):py(LIFT.top)+l.phase*D(LIFT.bottom-LIFT.top);l.dy=y-l.y1;l.y1=l.y2=y}}
 ladderOpen(l){return !l.retract||((this.clock+l.phase)%6)<3.5}
 addFire(x,p){this.hazards.push({id:this.nextId++,kind:'fire',x,y:yAt(p,x),plat:p,dir:1,state:'walk',ladder:null,turn:1,vx:0})}
 step(dt,input={}){this.clock+=dt;const jumpEdge=!!input.jump&&!this.jumpHeld;this.jumpHeld=!!input.jump;if(this.state==='end')return;
  if(this.state==='ready'){this.timer-=dt;if(this.timer<=0)this.state='play';return}
  if(this.state==='dead'||this.state==='cleared'){this.timer-=dt;if(this.timer<=0)this.next();return}
  this.screenTime+=dt;this.input=input;this.moveLifts(dt);this.moveBelts(dt);this.moveKong(dt);this.spawn(dt);
  this.movePlayer(dt,input,jumpEdge);if(this.state!=='play')return;
  this.moveHazards(dt);this.collect();if(this.state!=='play')return;this.collide();if(this.state!=='play')return;
  // On 25m the bonus drops 100 with every barrel Kong throws (ROM 2CDA); on the other screens it runs on the clock (ROM 2FCE).
  if(this.screen!==25){this.bonusTimer-=dt;if(this.bonusTimer<=0){this.bonusTimer+=this.bonusEvery();this.bonus=Math.max(0,this.bonus-C.bonusStep);if(!this.bonus)this.die('time')}}
  if(this.state==='play'&&this.player.state==='walk'&&this.player.plat.goal)this.clear()}
 next(){if(this.state==='cleared'){this.index++;if(this.index>=this.order.length){this.index=0;this.level++}if(this.screen===100)this.rivets=null}this.startScreen()}
 clear(){this.award(this.bonus);this.events.push({type:'bonus',points:this.bonus});this.state='cleared';this.timer=C.clearPause;this.events.push({type:'cleared',screen:this.screen,level:this.level})}
 die(cause){this.lives--;this.events.push({type:'death',cause,x:this.player.x,y:this.player.y,lives:this.lives});
  if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else{this.state='dead';this.timer=C.deathPause}}
 moveBelts(dt){if(this.screen!==50)return;for(const b of Object.values(this.belts))if(b.flip){b.timer-=dt;if(b.timer<=0){b.timer=this.between([4,8]);b.speed=-b.speed;this.events.push({type:'belt'})}}}
 beltSpeed(p){return p?.belt&&this.screen===50?this.belts[p.belt].speed:0}
 // Kong: throws on 25m, rides the top belt on 50m, paces between the rivets on 100m; touching him is fatal.
 moveKong(dt){const k=this.kong;k.poseTime-=dt;if(k.poseTime<=0)k.pose='stand';
  if(this.screen===50){k.x=clamp(k.x+this.belts.d.speed*dt,px(84),px(140))}
  if(this.screen===100){k.x+=k.dir*D(10)*dt;if(k.x>px(132)&&k.dir>0||k.x<px(92)&&k.dir<0)k.dir=-k.dir}
  // 25m: Kong takes a barrel only on frames whose count (mod 32) is 1 up to the difficulty (ROM 2C27), then grabs, holds
  // and throws it in three steps of 24 frames (ROM 2D15).
  if(this.screen===25&&this.bonus>0){this.throwTimer-=dt;if(this.throwTimer<=0){const f=Math.floor(this.screenTime*60)&31;if(f>=1&&f<=this.difficulty()){k.pose='throw';k.poseTime=.5;this.throwTimer=C.throwFrames/60;this.throwBarrel()}}}
  else if(Math.floor(this.clock*.4)%3===0&&k.pose==='stand'){k.pose='pound';k.poseTime=.6}}
 // His first barrel is blue and drops straight into the drum; after that every 8th barrel is blue while there are fewer
 // than five fireballs (ROM 2C57), and one in 16 drops wild, never the one right after the first (ROM 2C44).
 // Each throw takes 100 off the bonus, and when it is gone the player is out of time (ROM 2CDA).
 throwBarrel(){const first=this.thrown===0,fires=this.hazards.filter(h=>h.kind==='fire').length,blue=this.thrown%C.blueEvery===0&&fires<C.fireMax,wild=first||this.thrown>1&&Math.floor(this.rng.next()*C.crazyOdds)===0;this.thrown++;
  this.bonus=Math.max(0,this.bonus-C.bonusStep);if(!this.bonus)this.die('time');
  const b={id:this.nextId++,kind:'barrel',blue,x:first?px(20):px(64),y:this.kong.y,vx:0,vy:0,plat:null,ladder:null,state:wild?'wild':'roll',decided:new Set(),straight:first};
  if(!wild)b.plat=this.platAt(b.x,b.y);this.hazards.push(b);this.events.push({type:'throw'})}
 spawn(dt){const fires=this.hazards.filter(h=>h.kind==='fire').length;
  // Firefoxes come out every 256, 128 or 64 frames by difficulty (twice as often on 50m) but no faster than the bonus
  // ticks; on 50m never more than the difficulty at once (ROM 2DDF, 318C).
  const every=Math.max(this.bonusEvery(),C.fireEvery[this.difficulty()-1]/60);
  if(this.screen===50){this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=Math.max(this.bonusEvery(),C.fireEvery[this.difficulty()-1]/120);if(fires<Math.min(C.fireMax,this.difficulty())){const right=this.rng.next()<.5;this.addFire(px(right?132:92),this.base[right?3:2]);this.events.push({type:'fireball'})}}
   this.pieTimer-=dt;if(this.pieTimer<=0){this.pieTimer=this.between(C.pieEvery);const p=this.base[[1,2,3][Math.floor(this.rng.next()*3)]],v=this.belts[p.belt].speed;if(this.hazards.filter(h=>h.kind==='pie').length<6)this.hazards.push({id:this.nextId++,kind:'pie',x:v>0?p.x1+D(4):p.x2-D(4),y:p.y1,plat:p,vx:v})}}
  // 75m: a spring with every tick of the bonus (ROM 2FD8).
  if(this.screen===75){this.springTimer-=dt;if(this.springTimer<=0){this.springTimer=this.bonusEvery();this.hazards.push({id:this.nextId++,kind:'spring',x:px(60),y:this.kong.y,base:this.kong.y,t:0,state:'bounce',vx:C.springSpeed});this.events.push({type:'spring'})}}
  if(this.screen===100){this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawnTimer=every;if(fires<C.fireMax){const row=1+Math.floor(this.rng.next()*3),right=this.rng.next()<.5,b=this.base[row],x=right?b.x2-D(4):b.x1+D(4);this.addFire(x,this.platAt(x,b.y1));this.events.push({type:'fireball'})}}}}
 // The player: walks, climbs, jumps a fixed arc; a long drop is fatal; belts carry and lifts lift.
 movePlayer(dt,input,jumpEdge){const p=this.player,ax=sign(clamp(Number(input.axis)||0,-1,1)||((input.right?1:0)-(input.left?1:0))),ay=sign(clamp(Number(input.axisY)||0,-1,1)||((input.down?1:0)-(input.up?1:0)));
  if(p.hammer>0){p.hammer-=dt;if(p.hammer<=0)this.events.push({type:'hammerEnd'})}
  p.moving=false;const near=D(5);
  if(p.state==='walk'){
   if(ay&&p.hammer<=0){const l=this.ladders.find(l=>!l.broken&&Math.abs(l.x-p.x)<near&&(ay<0?Math.abs(l.bot-p.y)<D(3)&&this.ladderOpen(l):Math.abs(l.top-p.y)<D(3)&&this.ladderOpen(l)));
    if(l){p.state='climb';p.ladder=l;p.x=l.x;p.y+=ay;return}}
   if(jumpEdge&&p.hammer<=0){p.state='air';p.vx=ax*C.walk;p.vy=-4*C.jumpHeight/C.jumpTime;p.apex=p.y;p.over=new Set();if(ax)p.dir=ax;this.events.push({type:'jump'});return}
   if(ax)p.dir=ax;p.moving=!!ax;
   const nx=clamp(p.x+ax*C.walk*dt+this.beltSpeed(p.plat)*dt,px(0)+D(4),px(224)-D(4));
   if(nx>=p.plat.x1&&nx<=p.plat.x2){p.x=nx;p.y=yAt(p.plat,nx);this.pullRivets()}
   else{const q=this.platAt(nx,p.y);if(q){p.plat=q;p.x=nx;p.y=yAt(q,nx);this.pullRivets()}else{p.x=nx;p.state='air';p.vx=0;p.vy=0;p.apex=p.y;p.over=new Set()}}
   if(p.state==='walk'&&p.plat.lift){p.y=p.plat.y1;if(p.plat.dir<0&&p.y<=py(LIFT.top)+D(2))return this.die('crushed');if(p.plat.dir>0&&p.y>=py(LIFT.bottom)-D(2))return this.die('fall')}
   return}
  if(p.state==='climb'){const l=p.ladder;p.y+=ay*C.climb*dt;p.moving=!!ay;
   if(p.y<=l.top){const q=this.platAt(l.x,l.top);p.y=l.top;p.state='walk';p.plat=q;p.ladder=null}
   else if(p.y>=l.bot){const q=this.platAt(l.x,l.bot);p.y=l.bot;p.state='walk';p.plat=q;p.ladder=null}
   return}
  // In the air: the arc is fixed at take-off; land on the first surface crossed on the way down.
  const oy=p.y;p.vy+=C.gravity*dt;p.x=clamp(p.x+p.vx*dt,px(0)+D(4),px(224)-D(4));p.y+=p.vy*dt;p.apex=Math.min(p.apex,p.y);
  if(this.screen===100)this.pullRivets();
  if(p.vy>0){for(const q of this.allPlats()){if(p.x<q.x1||p.x>q.x2)continue;const s=yAt(q,p.x);if(p.y>=s&&oy<=s+Math.abs(q.dy||0)+2){p.y=s;p.plat=q;p.state='walk';
    if(s-p.apex>C.fallMax)return this.die('fall');
    const n=Math.min(3,p.over.size);if(n){const pts=C.points.jump[n];this.award(pts);this.events.push({type:'jumpover',count:p.over.size,points:pts,x:p.x,y:p.y-D(20)})}
    this.events.push({type:'land'});return}}}
  if(p.y>C.height+D(10))this.die('fall')}
 // Rivets: crossing one on its floor (walking, or in the air just above it) pulls it once the player is clear of it.
 pullRivets(){if(!this.rivets)return;const p=this.player;let cut=false;
  for(const r of this.rivets){if(!r.alive)continue;const on=p.y<=r.y+1&&p.y>r.y-D(20);if(!on){r.side=0;continue}const d=p.x-r.x;if(Math.abs(d)<D(6))continue;const s=sign(d);
   if(r.side&&s!==r.side){r.alive=false;cut=true;this.award(C.points.rivet);this.events.push({type:'rivet',x:r.x,y:r.y,left:this.rivets.filter(x=>x.alive).length})}else r.side=s}
  if(cut){this.rebuild();if(p.state==='walk')p.plat=this.platAt(p.x,p.y)||p.plat;for(const h of this.hazards)if(h.kind==='fire'&&h.state==='walk')h.plat=this.platAt(h.x,h.y)||h.plat;
   if(this.rivets.every(r=>!r.alive)){this.events.push({type:'rivetsDone'});this.clear()}}}
 moveHazards(dt){const p=this.player,keep=[];
  for(const h of this.hazards){if(h.kind==='barrel')this.moveBarrel(h,dt);else if(h.kind==='fire')this.moveFire(h,dt);
   else if(h.kind==='pie'){h.vx=this.belts[h.plat.belt].speed;h.x+=h.vx*dt;if(h.x<h.plat.x1||h.x>h.plat.x2)h.gone=true}
   else if(h.kind==='spring'){if(h.state==='bounce'){h.x+=h.vx*dt;h.t+=dt;h.y=h.base-Math.abs(Math.sin(h.t*Math.PI/.55))*D(16);if(h.x>=px(152)){h.state='drop';h.x=px(152);this.events.push({type:'springDrop'})}}else{h.y+=C.springDrop*dt;if(h.y>C.height+40)h.gone=true}}
   // Jumped over: anything passing under the player in the air counts once for this jump.
   if(p.state==='air'&&Math.abs(h.x-p.x)<D(6)&&h.y>=p.y&&h.y-p.y<D(26)&&h.kind!=='spring')p.over.add(h.id);
   if(!h.gone)keep.push(h)}
  this.hazards=keep}
 moveBarrel(b,dt){const p=this.player;
  if(b.state==='wild'){b.vy=C.barrelSpeed*1.2;b.x+=b.vx*dt;b.y+=b.vy*dt;const g0=this.base[0];
   if(!b.straight)b.vx=clamp((p.x-b.x)*.6,-D(30),D(30));
   if(b.y>=yAt(g0,b.x)&&b.x<=g0.x2){b.y=yAt(g0,b.x);b.state='roll';b.plat=this.platAt(b.x,b.y)}return}
  if(b.state==='ladder'){b.y+=C.barrelLadder*dt;if(b.y>=b.ladder.bot){b.y=b.ladder.bot;b.plat=this.platAt(b.x,b.y);b.state='roll';b.ladder=null}return}
  if(b.state==='fall'){b.vy+=C.barrelGravity*dt*3;const oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
   for(const q of this.plats){if(b.x<q.x1||b.x>q.x2)continue;const s=yAt(q,b.x);if(b.y>=s&&oy<=s+2){b.y=s;b.plat=q;b.state='roll';this.events.push({type:'bounce'});break}}
   if(b.y>C.height+40)b.gone=true;return}
  const q=b.plat,speed=C.barrelSpeed*(1+.35*this.levelK()),ox=b.x;b.x+=q.dir*speed*dt;b.vx=q.dir*speed;
  // Into the oil drum at the end of the bottom girder: a blue barrel lets out a fireball.
  if(this.drum&&this.screen===25&&b.x<=this.drum.x+D(8)&&q===this.base[0]){b.gone=true;if(b.blue)this.oilLit=true;if(b.blue&&this.hazards.filter(h=>h.kind==='fire').length<C.fireMax){this.addFire(this.drum.x+D(12),this.base[0]);this.events.push({type:'fireball'})}return}
  // At a ladder top (ROM 216D): before the oil drum is lit it always goes down; never when the player is not below it;
  // otherwise a 1, 2 or 3 in 4 chance by difficulty, and then down if the player is right under it or pushing the stick
  // toward it, else one time in four.
  for(const l of this.ladders){if(b.decided.has(l)||Math.abs(l.top-yAt(q,l.x))>2||sign(ox-l.x)===sign(b.x-l.x))continue;b.decided.add(l);
   if(this.takeLadder(b,l)){b.state='ladder';b.ladder=l;b.x=l.x;b.decided=new Set();return}}
  if(b.x<q.x1||b.x>q.x2){const n=this.platAt(b.x,yAt(q,b.x));if(n){b.plat=n;b.y=yAt(n,b.x)}else{b.state='fall';b.vx=q.dir*D(12);b.vy=0;b.decided=new Set()}}else b.y=yAt(q,b.x)}
 takeLadder(b,l){if(!this.oilLit)return true;const p=this.player;if(p.y<l.top+D(4))return false;
  if(Math.floor(this.rng.next()*4)>=(this.difficulty()>>1)+1)return false;const ax=Number(this.input?.axis)||((this.input?.right?1:0)-(this.input?.left?1:0));
  if(Math.abs(p.x-l.x)<D(1)||l.x<p.x&&ax<-.3||l.x>p.x&&ax>.3)return true;return this.rng.next()<.25}
 // Fireballs and firefoxes: wander their floor, turn at the ends, often head for the player and climb ladders toward him.
 moveFire(f,dt){const p=this.player;
  // They move only on some frames, more of them as the difficulty rises: 4, 5, 6 or 7 frames in 8 (ROM 30FA).
  const fr=C.fireRate[this.difficulty()-1]/C.fireRate[0];
  if(f.state==='climb'){const l=f.ladder,dir=f.vy;f.y+=dir*C.fireClimb*fr*dt;if(dir<0?f.y<=l.top:f.y>=l.bot){f.y=dir<0?l.top:l.bot;f.plat=this.platAt(l.x,f.y)||f.plat;f.state='walk';f.ladder=null}return}
  f.turn-=dt;if(f.turn<=0){f.turn=1+this.rng.next()*2;f.dir=this.rng.next()<.6&&Math.abs(p.y-f.y)<D(24)?(sign(p.x-f.x)||f.dir):(this.rng.next()<.5?1:-1)}
  const ox=f.x,q=f.plat;f.x+=f.dir*C.fireSpeed*fr*dt;f.vx=f.dir*C.fireSpeed*fr;
  if(f.x<q.x1+D(2)||f.x>q.x2-D(2)){const n=this.platAt(f.x,yAt(q,f.x),D(1));if(n&&!n.lift&&!n.goal)f.plat=n;else{f.x=clamp(f.x,q.x1+D(2),q.x2-D(2));f.dir=-f.dir}}
  f.y=yAt(f.plat,f.x);
  for(const l of this.ladders){if(l.broken||sign(ox-l.x)===sign(f.x-l.x))continue;const atBot=Math.abs(l.bot-f.y)<2,atTop=Math.abs(l.top-f.y)<2;if(!atBot&&!atTop)continue;
   if(atTop&&this.platAt(l.x,l.top)?.goal)continue;if(atBot&&this.platAt(l.x,l.top)?.goal)continue;
   const toward=atBot?p.y<f.y-D(10):p.y>f.y+D(10);if(this.rng.next()<(toward?.5:.12)){f.state='climb';f.ladder=l;f.x=l.x;f.vy=atBot?-1:1;return}}}
 smashPoints(h){if(h.kind==='barrel'&&!h.blue)return C.points.barrelSmash;const r=this.rng.next();return r<.5?500:r<.75?800:300}
 // The bonus counts down 100 every 120, 100, 80, then 60 frames of the cabinet's 60 Hz on levels 1, 2, 3 and 4 on (ROM 0F97).
 bonusEvery(){return C.bonusFrames[Math.min(this.level,4)-1]/60}
 // Hammers float above the floor (jump to grab them); the items lie on it.
 collect(){const p=this.player,lv=Math.min(this.level,3)-1;
  for(const hm of this.hammers)if(hm.alive&&p.hammer<=0&&p.state!=='climb'&&Math.abs(hm.x-p.x)<D(7)&&p.y-D(16)<hm.y+D(5)&&p.y>hm.y-D(5)){hm.alive=false;p.hammer=C.hammerTime;this.events.push({type:'hammer'})}
  for(const it of this.items)if(it.alive&&Math.abs(it.x-p.x)<D(7)&&Math.abs(it.y-p.y)<D(10)){it.alive=false;const pts=C.itemPoints[lv];this.award(pts);this.events.push({type:'item',kind:it.kind,points:pts,x:it.x,y:it.y-D(12)})}}
 boxes(h){return h.kind==='pie'?[D(5),D(6)]:h.kind==='spring'?[D(5),D(10)]:[D(4),D(7)]}
 collide(){const p=this.player,hit=(x,y,w,hgt)=>Math.abs(x-p.x)<w+D(3)&&p.y>y-hgt&&y>p.y-D(14);
  if(p.hammer>0)for(const h of this.hazards){const f=(h.x-p.x)*p.dir;if(f>-D(2)&&f<D(16)&&h.y>p.y-D(24)&&h.y<p.y+D(4)){h.gone=true;const pts=this.smashPoints(h);this.award(pts);this.events.push({type:'smash',kind:h.kind,points:pts,x:h.x,y:h.y-D(6)})}}
  this.hazards=this.hazards.filter(h=>!h.gone);
  for(const h of this.hazards){const [w,hg]=this.boxes(h);if(hit(h.x,h.y,w,hg))return this.die(h.kind)}
  const k=this.kong;if(hit(k.x,k.y,D(14),D(28)))return this.die('kong');
  if(this.screen===50&&hit(this.drum.x,this.drum.y,D(7),D(16)))return this.die('fire')}
 // Demo pilot: finds the way up by platforms and ladders (rivet by rivet on 100m, by elevator on 75m) and jumps what comes.
 // Route planning only: on 100m Kong's top floor is cut at his pacing zone, so the way round never walks through him.
 graph(){const kz=[px(72),px(152)];let ps=this.plats.filter(p=>!p.lift&&!p.fire);
  if(this.screen===100)ps=ps.flatMap(p=>p.row===4&&p.x1<kz[1]&&p.x2>kz[0]?[p.x1<kz[0]&&{...p,x2:kz[0],src:p},p.x2>kz[1]&&{...p,x1:kz[1],src:p}].filter(Boolean):[p]);
  const at=(x,y)=>ps.find(p=>x>=p.x1-.01&&x<=p.x2+.01&&Math.abs(yAt(p,x)-y)<D(4)),edges=new Map(ps.map(p=>[p,[]]));
  for(const l of this.ladders){if(l.broken)continue;const lo=at(l.x,l.bot),up=at(l.x,l.top);if(lo&&up){edges.get(lo).push({to:up,kind:'up',x:l.x,l});edges.get(up).push({to:lo,kind:'down',x:l.x,l})}}
  for(const a of ps)for(const b of ps){if(a===b)continue;const gap=b.x1-a.x2;if(gap>=-1&&gap<=D(12)&&Math.abs(yAt(a,a.x2)-yAt(b,b.x1))<D(4)){edges.get(a).push({to:b,kind:'gap',x:a.x2,dir:1,jump:gap>D(1)});edges.get(b).push({to:a,kind:'gap',x:b.x1,dir:-1,jump:gap>D(1)})}}
  if(this.screen===75){edges.get(at(px(10),this.base[0].y1)).push({to:at(px(80),this.base[1].y1),kind:'liftA'});edges.get(at(px(80),this.base[3].y1)).push({to:at(px(150),this.base[4].y1),kind:'liftB'})}
  return{edges,at}}
 route(x,y,goal){const {edges,at}=this.graph(),from=at(x,y);if(!from)return null;const prev=new Map([[from,null]]),q=[from];while(q.length){const a=q.shift();if(goal(a)){let n=a,e=null;while(prev.get(n)){e=prev.get(n);n=e.from}return{edge:e,at:a}}for(const e of edges.get(a)||[])if(!prev.has(e.to)){prev.set(e.to,{...e,from:a});q.push(e.to)}}return null}
 basePilot(){const p=this.player,out={axis:0,axisY:0,jump:false};if(this.state!=='play')return out;
  // A ladder is unsafe while a barrel is on it or rolling toward its top.
  const unsafe=l=>this.hazards.some(h=>h.ladder===l||h.kind==='fire'&&Math.abs(h.y-l.top)<D(4)&&Math.abs(h.x-l.x)<D(20)||h.kind==='barrel'&&(h.state==='roll'&&Math.abs(h.y-l.top)<D(6)&&Math.abs(h.x-l.x)<D(48)&&sign(l.x-h.x)===sign(h.vx)||(h.state==='fall'||h.state==='wild')&&Math.abs(h.x-l.x)<D(24)&&h.y<p.y));
  if(p.state==='climb'){out.axisY=this.pilotClimb||-1;if(out.axisY<0&&p.y>p.ladder.top+D(10)&&p.y<p.ladder.bot-D(2)&&unsafe(p.ladder))out.axisY=1;return out}if(p.state!=='walk')return out;
  for(const h of this.hazards)if(h.ladder&&(h.state==='ladder'||h.vy>0)&&Math.abs(h.ladder.bot-p.y)<D(3)&&Math.abs(h.x-p.x)<D(16)){out.axis=sign(p.x-h.x)||1;return out}
  const go=x=>{const d=x-p.x;out.axis=Math.abs(d)<D(1)?0:sign(d);return Math.abs(d)<D(1)};
  // Danger first: jump in place over a barrel or pie about to arrive; jump toward a firefox to clear it.
  if(p.hammer<=0&&!p.plat.lift)for(const h of this.hazards){if(h.kind==='spring'||Math.abs(h.y-p.y)>D(6)||h.state==='ladder'||h.state==='climb')continue;const dx=h.x-p.x,rel=h.kind==='fire'?C.walk+Math.abs(h.vx||C.fireSpeed):Math.abs(h.vx||0);
   if(h.kind!=='fire'&&sign(h.vx)===sign(dx))continue;const t=(Math.abs(dx)-D(7))/Math.max(rel,1);if(t<.19&&t>.02){out.jump=!this.jumpHeld;out.axis=h.kind==='fire'?sign(dx):0;return out}}
  // Lift rides on 75m.
  if(p.plat.lift==='A'){const y=p.plat.y1,m=[1,2,3].map(i=>this.base[i]).find(m=>y<=m.y1+D(2)&&y>m.y1-D(8)&&!this.hazards.some(h=>h.kind==='fire'&&Math.abs(h.y-m.y1)<D(4)&&h.x<px(80)));if(m)out.axis=1;else go(px(57));return out}
  if(p.plat.lift==='B'){if(p.plat.y1>=this.base[4].y1-D(14))out.axis=1;else go(px(122));return out}
  let goal=q=>q.goal,rivet=null;
  if(this.rivets){rivet=this.rivets.filter(r=>r.alive).sort((a,b)=>Math.abs(a.y-p.y)*4+Math.abs(a.x-p.x)-(Math.abs(b.y-p.y)*4+Math.abs(b.x-p.x)))[0];if(!rivet)return out;goal=q=>q.row===rivet.row&&q.x1<rivet.x&&q.x2>rivet.x}
  const r=this.route(p.x,p.y,goal);if(!r)return out;
  if(!r.edge){if(rivet){if(Math.abs(p.x-rivet.x)>D(8))this.pilotDir=sign(rivet.x-p.x);out.axis=this.pilotDir||1;return out}go(this.lady.x);return out}
  const e=r.edge;
  if(e.kind==='up'||e.kind==='down'){if(go(e.x)&&this.ladderOpen(e.l)&&!(e.kind==='up'&&unsafe(e.l))){out.axisY=e.kind==='up'?-1:1;this.pilotClimb=out.axisY}return out}
  if(e.kind==='gap'){out.axis=e.dir;if(e.jump&&(e.x-p.x)*e.dir<D(5))out.jump=!this.jumpHeld;return out}
  if(e.kind==='liftA'){if(p.x>px(30)&&this.lifts.some(l=>l.lift==='A'&&l.y1>=p.y-D(1)&&l.y1<p.y+D(8)))out.axis=1;else if(go(px(34)))out.axis=0;return out}
  if(e.kind==='liftB'){if(p.x>px(94)&&this.lifts.some(l=>l.lift==='B'&&l.y1>p.y+D(1)&&l.y1<p.y+D(10)))out.axis=1;else if(go(px(98)))out.axis=0;return out}
  return out}
 // The demo pilot plays its next moves out on a copy of the game for a moment; if the player would be lost it
 // tries waiting, backing off, climbing back or jumping instead. It only ever sets the player's input.
 copy(){const o={},k=Object.create(KongEngine.prototype);for(const [n,v] of Object.entries(this))if(n!=='rng'&&n!=='events'&&typeof v!=='function')o[n]=v;
  Object.assign(k,structuredClone(o));k.rng=new SeededRandom(this.rng.value);k.events=[];return k}
 tryMove(first,hold,limit){const k=this.copy(),s0=k.score,y0=k.player.y;let t=0;
  for(;t<limit;t+=C.step){const m=t<hold?first:k.basePilot();k.step(C.step,m);for(const v of k.events){if(v.type==='death')return{dead:true,val:-1e6+t};if(v.type==='cleared')return{dead:false,val:1e5}}k.events.length=0;if(k.state!=='play')break}
  return{dead:false,val:k.score-s0+(y0-k.player.y)}}
 pilot(){if(this.state!=='play')return this.basePilot();const H=KongEngine.lookAhead,A=this.aiMove,out=m=>({...m,jump:!!m.jump&&!this.jumpHeld});
  if(A&&this.clock<A.until&&this.clock>A.until-2)return out(A.m);this.aiMove=null;
  if(this.aiNext>this.clock&&this.aiNext-this.clock<1)return this.basePilot();this.aiNext=this.clock+.1;
  const base=this.basePilot();if(!this.tryMove(base,0,H).dead)return base;
  let best=null;for(const m of [{},{axis:-1},{axis:1},{axisY:-1},{axisY:1},{jump:true},{axis:-1,jump:true},{axis:1,jump:true}])for(const hold of m.jump?[.05]:[.15,.4,.8]){const r=this.tryMove(m,hold,H+hold);if(!best||r.val>best.val)best={m,hold,val:r.val}}
  this.aiMove={m:best.m,until:this.clock+best.hold-1e-9};return out(best.m)}
 snapshot(){const p=this.player,count=k=>this.hazards.filter(h=>h.kind===k).length;return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,lives:this.lives,level:this.level,screen:this.screen,bonus:this.bonus,
  player:{x:+p.x.toFixed(2),y:+p.y.toFixed(2),state:p.state,hammer:+Math.max(0,p.hammer).toFixed(2)},barrels:count('barrel'),fires:count('fire'),pies:count('pie'),springs:count('spring'),rivets:this.rivets?this.rivets.filter(r=>r.alive).length:null}}
}
KongEngine.lookAhead=2;
const KongCore={CONFIG,KongEngine,SeededRandom,SCREENS,px,py,D,yAt};
g.KongCore=KongCore;if(typeof module!=='undefined')module.exports=KongCore;
})(globalThis);
