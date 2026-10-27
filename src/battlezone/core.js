'use strict';
/* Recess Zone: Atari Battlezone (1980) rules, drawn as green wireframes of a playground seen through a periscope.
   Rules follow the original cabinet: a first-person tank on an open plain scattered with obstacles that block both
   tanks and shells; drive and turn; one shell of yours in flight at a time, the enemy's the same; one enemy at a
   time: a tank (1000 points) that manoeuvres and fires when it has you lined up, a faster supertank (3000) and a
   ground-hugging guided missile (2000) once you pass 10,000; a harmless flying saucer (5000) drifts by now and then once the score reaches 2,000;
   a radar shows where the enemy is; any hit costs a tank; bonus tanks at 15,000 and 100,000; three tanks.
   Values checked 2026-10-26 against Atari's source (github.com/historicalsource/battlezone, BZONE.MAC; the saucer
   waits for 2,000 in SAUCMV) and MAME bzone.cpp switch defaults.
   Enemy behaviour from BZONE.MAC (2026-10-31, core 0.2.0): the enemy keeps its own score, one point (1,000) for each
   of your tanks it destroys, and plays as hard as your lead in thousands (REACT, TANKCK): with no lead it decides
   slowly (every 5 s) and appears ahead of you, with a lead of 5 it decides every quarter second and from 6 it can
   appear anywhere around you; it cannot fire for 2 s after it appears (FIREIT), and below 2,000 points it only fires
   from close in and in front of you; after about 17 s it always attacks; with no lead it sometimes swerves away,
   behind it drives at random; its shells fly as fast as yours; a tank you evade for 48 to 64 s gives way to a
   missile; supertanks replace the tanks after the sixth missile (TR7CHK); missiles appear far off, just ahead.
   Adaptations (not ROM-exact): the plain is a large wrapping field; turning and driving use single keys rather
   than the cabinet's two tread levers (the levers are emulated for stick play); speeds and ranges are tuned by eye
   at 120 Hz, keeping the cabinet's proportions where the source gives them (both sides' shells equally fast, a shell
   outliving a shot at the far spawn distance by about a third). */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['turn','n',-1,1,20],['move','n',-1,1,20],['fire','b']],world:400,
  moveSpeed:14,turnSpeed:1.1,shellSpeed:50,shellLife:2.9,enemyShellSpeed:50,firstShot:2,shellRadius:1.2,
  tankRadius:3,obstacleCount:26,obstacleRadius:3.4,
  enemy:Object.freeze({tank:Object.freeze({speed:7,turn:.7,radius:3,points:1000,aimTol:.05,reload:.27}),
    super:Object.freeze({speed:13,turn:1.3,radius:3,points:3000,aimTol:.05,reload:.27}),
    missile:Object.freeze({speed:30,turn:2.4,radius:2,points:2000})}),
  saucer:Object.freeze({points:5000,fromScore:2000,speed:6,every:Object.freeze([18,30]),life:16}),
  spawnRange:Object.freeze([55,110]),missileFrom:10000,superAfter:6,
  // The cabinet's game frame is about 1/15 s; the enemy decides every (5 - lead) x 16 frames, at best every 4.
  frame:1/15,rookieScore:2000,rookieRange:42,rookieView:.79,aggressiveAfter:17,evadeMissile:Object.freeze([48,64]),respawnWander:3,
  bonusAt:Object.freeze([15000,100000]),lives:3,deathPause:2.5,spawnDelay:1.5,
  obstacleKinds:Object.freeze(['slide','swings','climber','box','pyramid'])});
class SeededRandom{constructor(seed=1980){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const WS=CONFIG.world,HALF=WS/2,TAU=Math.PI*2;
const wrap=v=>((v+HALF)%WS+WS)%WS-HALF,angDiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d};
// Relative position of b seen from a on the wrapping plain.
const rel=(a,b)=>({x:wrap(b.x-a.x),z:wrap(b.z-a.z)}),dist=(a,b)=>{const r=rel(a,b);return Math.hypot(r.x,r.z)},bearing=(a,b)=>{const r=rel(a,b);return Math.atan2(r.x,r.z)};
class ZoneEngine{
 constructor(seed=1980){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.lives=CONFIG.lives;this.bonusGiven=0;this.enemyScore=0;this.missiles=0;
  this.player={x:0,z:0,a:0};this.obstacles=[];for(let i=0;i<CONFIG.obstacleCount;i++){let o;do o={x:(this.rng.next()-.5)*WS,z:(this.rng.next()-.5)*WS,a:this.rng.next()*TAU,kind:CONFIG.obstacleKinds[Math.floor(this.rng.next()*CONFIG.obstacleKinds.length)]};while(Math.hypot(o.x,o.z)<20);this.obstacles.push(o)}
  this.shell=null;this.enemyShell=null;this.enemy=null;this.saucer=null;this.saucerTimer=this.between(CONFIG.saucer.every);this.state='play';this.timer=1;return this}
 between([a,b]){return a+this.rng.next()*(b-a)}
 blocked(p,r){return this.obstacles.find(o=>dist(p,o)<CONFIG.obstacleRadius+r)}
 // Line of fire: no obstacle on the straight path from a to b.
 lineClear(a,b){const r=rel(a,b),L=Math.hypot(r.x,r.z),n=Math.ceil(L/1.5);for(let i=1;i<n;i++){const t=i/n;if(this.blocked({x:a.x+r.x*t,z:a.z+r.z*t},CONFIG.shellRadius))return false}return true}
 // The player's lead over the enemy in thousands (the enemy scores one for each tank of yours it destroys); from 100,000 always the best.
 lead(){return this.score>=100000?7:Math.floor(this.score/1000)-this.enemyScore}
 // How often the enemy makes a new decision: slow with no lead (or none against you), every 4 cabinet frames from a lead of 5.
 reaction(){const L=Math.abs(this.lead());return(L<5?(5-L)*16:4)*CONFIG.frame}
 // Missiles from 10,000 (half the time); tanks are supertanks once six missiles have come.
 spawnEnemy(missile){const kind=missile||this.score>=CONFIG.missileFrom&&this.rng.next()<.5?'missile':this.missiles>=CONFIG.superAfter?'super':'tank';if(kind==='missile')this.missiles++;
  // It appears ahead of the tank; the window opens with the player's lead until it can come from anywhere. Missiles always come from far off, just ahead.
  const lead=this.lead(),n=kind==='missile'||lead<=0?0:Math.min(3,Math.floor(Math.min(lead,7)/2)),half=(16<<n)/256*TAU;
  let e;for(let t=0;t<20;t++){const b=this.player.a+(this.rng.next()*2-1)*half,d=kind==='missile'||this.rng.next()<.5?CONFIG.spawnRange[1]:CONFIG.spawnRange[0];e={kind,x:wrap(this.player.x+Math.sin(b)*d),z:wrap(this.player.z+Math.cos(b)*d),a:0,reload:0,age:0,wander:0,weave:0,mode:'attack',decide:0,goal:0,evade:this.between(CONFIG.evadeMissile)};if(!this.blocked(e,4))break}
  e.a=e.goal=bearing(e,this.player);if(kind==='missile'){e.y=12;}this.enemy=e;this.events.push({type:'enemy',kind})}
 // A decision as the cabinet makes it: attack (turn to where the player is now) when long on the field, half the time
 // anyway, or when the player leads; with no lead swerve away, behind on points drive at random. Between decisions it
 // keeps its heading goal, so a slow-deciding tank only hits a player who sits still.
 decide(e,want){const lead=this.lead();e.decide=this.reaction();
  if(e.age>=CONFIG.aggressiveAfter||this.rng.next()<.5||lead>0){e.mode='attack';e.goal=want;return}
  if(lead===0){e.mode='evade';e.goal=want+Math.PI/2;e.decide=64*CONFIG.frame;return}
  e.mode='random';e.goal=e.a+(this.rng.next()*2-1)*32/256*TAU}
 award(n){this.score+=n;while(this.bonusGiven<CONFIG.bonusAt.length&&this.score>=CONFIG.bonusAt[this.bonusGiven]){this.bonusGiven++;this.lives++;this.events.push({type:'bonus-tank'})}}
 fire(){if(this.shell||this.state!=='play')return false;const p=this.player;this.shell={x:p.x+Math.sin(p.a)*3,z:p.z+Math.cos(p.a)*3,a:p.a,life:CONFIG.shellLife};this.events.push({type:'fire'});return true}
 moveShell(s,speed,dt){s.x=wrap(s.x+Math.sin(s.a)*speed*dt);s.z=wrap(s.z+Math.cos(s.a)*speed*dt);s.life-=dt;if(s.life<=0)return 'gone';if(this.blocked(s,CONFIG.shellRadius))return 'obstacle';return null}
 hitPlayer(){this.lives--;this.enemyScore++;this.events.push({type:'death',lives:this.lives});this.shell=null;this.enemyShell=null;this.state='dead';this.timer=CONFIG.deathPause}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='dead'){this.timer-=dt;if(this.timer<=0){if(this.lives<=0){this.state='end';this.events.push({type:'gameover',score:this.score});return}this.state='play';if(this.enemy&&this.enemy.kind!=='missile'){this.enemy.mode='random';this.enemy.goal=this.rng.next()*TAU;this.enemy.decide=CONFIG.respawnWander}else{this.enemy=null;this.timer=CONFIG.spawnDelay}}return}
  // Player: turn and drive; the two tread levers of the cabinet map to (left, right) when given.
  const p=this.player;let turn=Number(input.turn)||0,move=Number(input.move)||0;
  if(input.treads){const [l,r]=input.treads;move=(l+r)/2;turn=(l-r)/2}
  turn=Math.max(-1,Math.min(1,turn));move=Math.max(-1,Math.min(1,move));
  p.a=(p.a+turn*CONFIG.turnSpeed*dt+TAU)%TAU;const nx=wrap(p.x+Math.sin(p.a)*move*CONFIG.moveSpeed*dt),nz=wrap(p.z+Math.cos(p.a)*move*CONFIG.moveSpeed*dt);
  if(!this.blocked({x:nx,z:nz},CONFIG.tankRadius)){p.x=nx;p.z=nz}else if(move)this.events.push({type:'bump'});
  if(input.fire&&!this.fireHeld)this.fire();this.fireHeld=!!input.fire;
  // Enemy appears after a short wait.
  if(!this.enemy){this.timer-=dt;if(this.timer<=0)this.spawnEnemy()}
  const e=this.enemy;
  if(e){const want=bearing(e,p),d=dist(e,p);
   if(e.kind==='missile'){const C=CONFIG.enemy.missile;e.weave+=dt;const aim=want+Math.sin(e.weave*3)*(d>30?.5:0);e.a+=Math.max(-C.turn*dt,Math.min(C.turn*dt,angDiff(aim,e.a)));e.x=wrap(e.x+Math.sin(e.a)*C.speed*dt);e.z=wrap(e.z+Math.cos(e.a)*C.speed*dt);e.y=Math.max(1,e.y-6*dt);
    if(d<C.radius+CONFIG.tankRadius){this.enemy=null;this.timer=CONFIG.spawnDelay;this.hitPlayer();return}}
   else{const C=CONFIG.enemy[e.kind];e.age=(e.age||0)+dt;
    // A tank the player keeps evading gives way to a missile (48 to 64 s).
    if(e.age>=(e.evade||1e9)){this.enemy=null;this.spawnEnemy(true);return}
    e.decide=(e.decide||0)-dt;if(e.decide<=0)this.decide(e,want);
    // With an obstacle in the line of fire it drives round it for a while instead of shelling the obstacle.
    const clear=this.lineClear(e,p);e.detour=Math.max(0,(e.detour||0)-dt);if(!clear&&!e.detour){e.detour=2;e.offset=(this.rng.next()<.5?-1:1)*1.3}
    const aim=e.detour?want+e.offset:e.goal;e.a=(e.a+Math.max(-C.turn*dt,Math.min(C.turn*dt,angDiff(aim,e.a)))+TAU)%TAU;
    e.backup=Math.max(0,(e.backup||0)-dt);const go=e.backup?-.6:e.mode!=='attack'||e.detour?1:d<14?-.5:d>25?1:.2,nx2=wrap(e.x+Math.sin(e.a)*C.speed*go*dt),nz2=wrap(e.z+Math.cos(e.a)*C.speed*go*dt);
    // Nosed into an obstacle it backs off and tries the other side, so it never sits stuck against one.
    if(!this.blocked({x:nx2,z:nz2},C.radius)){e.x=nx2;e.z=nz2;e.stuck=0}else if((e.stuck=(e.stuck||0)+dt)>.3){e.stuck=0;e.backup=.8;e.detour=2;e.offset=(e.offset>0?-1:1)*1.4}
    // It fires whenever lined up with its shell free, not in its first 2 s; below 2,000 only from close in and in front of the player.
    const rookie=this.score<CONFIG.rookieScore,seen=Math.abs(angDiff(bearing(p,e),p.a))<CONFIG.rookieView&&d<CONFIG.rookieRange;
    e.reload-=dt;if(e.reload<=0&&e.age>=CONFIG.firstShot&&!this.enemyShell&&Math.abs(angDiff(want,e.a))<C.aimTol&&d<CONFIG.shellSpeed*CONFIG.shellLife&&clear&&(!rookie||seen)){this.enemyShell={x:e.x+Math.sin(e.a)*3,z:e.z+Math.cos(e.a)*3,a:e.a,life:CONFIG.shellLife};e.reload=C.reload;this.events.push({type:'enemy-fire'})}}}
  // Shells.
  if(this.shell){const s=this.shell,r=this.moveShell(s,CONFIG.shellSpeed,dt);if(r){if(r==='obstacle')this.events.push({type:'shell-blocked',x:s.x,z:s.z});this.shell=null}
   else if(this.enemy&&dist(s,this.enemy)<CONFIG.enemy[this.enemy.kind].radius+CONFIG.shellRadius&&(this.enemy.kind!=='missile'||this.enemy.y<4)){const k=this.enemy.kind;this.award(CONFIG.enemy[k].points);this.events.push({type:'kill',kind:k,x:this.enemy.x,z:this.enemy.z,points:CONFIG.enemy[k].points});this.enemy=null;this.shell=null;this.timer=CONFIG.spawnDelay}
   else if(this.saucer&&dist(s,this.saucer)<3.5){this.award(CONFIG.saucer.points);this.events.push({type:'kill',kind:'saucer',x:this.saucer.x,z:this.saucer.z,points:CONFIG.saucer.points});this.saucer=null;this.shell=null}}
  if(this.enemyShell){const s=this.enemyShell,r=this.moveShell(s,CONFIG.enemyShellSpeed,dt);if(r){if(r==='obstacle')this.events.push({type:'shell-blocked',x:s.x,z:s.z});this.enemyShell=null}else if(dist(s,p)<CONFIG.tankRadius){this.enemyShell=null;this.hitPlayer();return}}
  // The saucer drifts by now and then once the score reaches 2,000; it never shoots.
  if(this.saucer){const s=this.saucer;s.x=wrap(s.x+Math.sin(s.a)*CONFIG.saucer.speed*dt);s.z=wrap(s.z+Math.cos(s.a)*CONFIG.saucer.speed*dt);s.life-=dt;if(s.life<=0)this.saucer=null}
  else if(this.score>=CONFIG.saucer.fromScore){this.saucerTimer-=dt;if(this.saucerTimer<=0){this.saucerTimer=this.between(CONFIG.saucer.every);const b=this.rng.next()*TAU;this.saucer={x:wrap(p.x+Math.sin(b)*60),z:wrap(p.z+Math.cos(b)*60),a:this.rng.next()*TAU,life:CONFIG.saucer.life};this.events.push({type:'saucer'})}}}
 // Radar: bearing of the enemy relative to the tank's heading, and its range.
 radar(){const p=this.player,out=[];for(const o of [this.enemy,this.saucer].filter(Boolean)){out.push({kind:o===this.saucer?'saucer':o.kind,bearing:angDiff(bearing(p,o),p.a),range:dist(p,o)})}return out}
 // Demo pilot: turns toward the enemy, closes in, and fires when lined up; with an obstacle in the way it drives round it; it dodges shells.
 pilot(){const p=this.player,e=this.enemy||this.saucer,sh=this.enemyShell;
  // Like a player who has learned the cabinet, it dodges a shell that is on its way: drive out of its line.
  if(sh){const r=rel(sh,p),vx=Math.sin(sh.a),vz=Math.cos(sh.a),t=r.x*vx+r.z*vz,miss=Math.abs(r.x*vz-r.z*vx);if(t>0&&t<CONFIG.enemyShellSpeed*2.2&&miss<CONFIG.tankRadius+3){const along=Math.abs(Math.sin(sh.a-p.a))>.5;return{turn:along?0:1,move:along?(Math.floor(this.clock)%2?1:-1):1}}}
  if(!e)return{turn:.4,move:.3};const off=angDiff(bearing(p,e),p.a),d=dist(p,e),blockedAhead=this.blocked({x:wrap(p.x+Math.sin(p.a)*6),z:wrap(p.z+Math.cos(p.a)*6)},3);
  if(!this.lineClear(p,e))return{turn:Math.max(-1,Math.min(1,off*3))+(Math.floor(this.clock/3)%2?.8:-.8),move:blockedAhead?-.5:1};
  return{turn:Math.max(-1,Math.min(1,off*3)),move:blockedAhead?-.5:Math.abs(off)<.3&&d>40?1:0,fire:Math.abs(off)<.03&&d<90&&!(e.kind==='missile'&&e.y>=4)&&Math.floor(this.clock*4)%2===0}}
 snapshot(){const r=v=>+v.toFixed(3);return{state:this.state,clock:r(this.clock),score:this.score,lives:this.lives,player:[r(this.player.x),r(this.player.z),r(this.player.a)],enemy:this.enemy&&[this.enemy.kind,r(this.enemy.x),r(this.enemy.z)],saucer:!!this.saucer,shell:!!this.shell,enemyShell:!!this.enemyShell}}
}
const RecessZoneCore={CONFIG,ZoneEngine,SeededRandom,wrap,rel,dist,bearing,angDiff};
g.RecessZoneCore=RecessZoneCore;if(typeof module!=='undefined')module.exports=RecessZoneCore;
})(globalThis);
