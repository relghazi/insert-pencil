'use strict';
// Recess Zone rule checks: one per 1980 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,ZoneEngine:Engine,wrap}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)},near:(a,b,eps,m)=>{if(Math.abs(a-b)>eps)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1980)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A clear field with one stationary enemy straight ahead.
 const range=(e,kind='tank',d=30)=>{e.obstacles=[];e.saucer=null;e.saucerTimer=1e9;e.player={x:0,z:0,a:0};e.enemy={kind,x:0,z:d,a:Math.PI,goal:Math.PI,reload:1e9,wander:1e9,offset:0,weave:0,y:1,age:99,decide:1e9,mode:'attack',evade:1e9};e.events=[];return e};
 const freeze=e=>{const k=e.enemy.kind;e.enemy.reload=1e9;return e};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={turn:Math.sin(i/90),move:.6,fire:i%60<2};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('the tank drives and turns; the cabinet\'s two tread levers work too',()=>{const e=range(make());e.enemy=null;e.timer=1e9;step(e,120,{move:1});assert.near(e.player.z,C.moveSpeed,.01);step(e,120,{turn:1});assert.near(e.player.a,C.turnSpeed,.01);
  const f=range(make());f.enemy=null;f.timer=1e9;step(f,120,{treads:[1,-1]});assert.near(f.player.a,C.turnSpeed,.01);assert.near(Math.hypot(f.player.x,f.player.z),0,.01)});
 test('obstacles block the tank',()=>{const e=range(make());e.enemy=null;e.timer=1e9;e.obstacles=[{x:0,z:10,a:0,kind:'box'}];step(e,240,{move:1});assert.ok(e.player.z<10-C.obstacleRadius-C.tankRadius+.5,'stopped at '+e.player.z)});
 test('one shell of yours in flight at a time',()=>{const e=range(make(),'tank',90);freeze(e);assert.ok(e.fire());assert.ok(!e.fire())});
 test('a hit on a tank scores 1000, a supertank 3000, a missile 2000, the saucer 5000',()=>{const pts=[];for(const k of ['tank','super','missile']){const e=range(make(),k,25);freeze(e);if(k==='missile')e.enemy.y=1;e.fire();step(e,60);pts.push(e.score)}
  const s=range(make());s.enemy=null;s.timer=1e9;s.saucer={x:0,z:20,a:0,life:99};s.fire();step(s,60);pts.push(s.score);assert.equal(pts.join(),'1000,3000,2000,5000')});
 test('the saucer only comes once the score reaches 2,000',()=>{const e=range(make());e.enemy=null;e.timer=1e9;e.saucerTimer=.01;step(e,240);assert.equal(e.saucer,null,'not at 0');e.score=2000;step(e,2);assert.ok(e.saucer,'from 2,000')});
 test('obstacles stop shells',()=>{const e=range(make(),'tank',40);freeze(e);e.obstacles=[{x:0,z:20,a:0,kind:'box'}];e.fire();step(e,120);assert.equal(e.score,0);assert.ok(e.events.some(v=>v.type==='shell-blocked'))});
 test('a lined-up enemy tank fires and its hit costs a tank; the last tank ends the game',()=>{const e=range(make(),'tank',40);e.enemy.reload=0;e.lives=1;step(e,240);assert.equal(e.lives,0);step(e,Math.ceil(C.deathPause/C.step)+2);assert.equal(e.state,'end')});
 test('an enemy never shells an obstacle in its way; it drives round it until it has a clear shot',()=>{const e=range(make(),'tank',40);e.obstacles=[{x:0,z:20,a:0,kind:'box'}];e.enemy.reload=0;step(e,120);assert.ok(!e.events.some(v=>v.type==='enemy-fire')&&e.lives===3,'no shot at the box');assert.ok(e.enemy.detour>0,'detour');assert.ok(Math.abs(e.enemy.x)>.5,'moved aside')});
 test('an enemy that noses into an obstacle backs off and comes round it: it never sits stuck',()=>{for(const seed of [19,31,34]){const e=make(seed);const o=e.obstacles.reduce((a,b)=>Math.hypot(a.x,a.z)<Math.hypot(b.x,b.z)?a:b);e.score=C.rookieScore;e.saucerTimer=1e9;e.player.x=o.x;e.player.z=o.z-C.obstacleRadius-C.tankRadius-.5;let shot=false;for(let n=0;n<120*30&&!shot;n++){e.step(C.step,{});shot=e.events.some(v=>v.type==='enemy-fire');e.events=[]}assert.ok(shot,'seed '+seed+' fires within 30 s')}});
 test('missiles from 10,000; after the sixth missile supertanks replace the tanks',()=>{const e=make();const seen=new Set();for(let i=0;i<40;i++){e.enemy=null;e.spawnEnemy();seen.add(e.enemy.kind)}assert.equal([...seen].join(),'tank');e.score=10000;
  const kinds=[];for(let i=0;i<80;i++){e.spawnEnemy();kinds.push(e.enemy.kind)}const sixth=kinds.map((k,i)=>k==='missile'?i:-1).filter(i=>i>=0)[C.superAfter-1];assert.ok(sixth>0,'six missiles');
  assert.ok(kinds.slice(0,sixth).every(k=>k!=='super'),'no supertank before');assert.ok(kinds.slice(sixth+1).every(k=>k!=='tank')&&kinds.includes('super'),'only supertanks after')});
 test('the enemy plays as hard as the player\'s lead: slow decisions and ahead of the tank at first, quick and from anywhere later',()=>{const e=make();assert.equal(e.lead(),0);assert.ok(Math.abs(e.reaction()-80*C.frame)<1e-9,'5 s');
  const spread=lead=>{const f=make(11);f.score=lead*1000;let m=0;for(let i=0;i<200;i++){f.enemy=null;f.spawnEnemy();m=Math.max(m,Math.abs(f.radar()[0].bearing))}return m};assert.ok(spread(0)<.4,'ahead '+spread(0));assert.ok(spread(7)>2.5,'anywhere '+spread(7));
  e.score=5000;assert.ok(Math.abs(e.reaction()-4*C.frame)<1e-9,'quick');e.hitPlayer();assert.equal(e.lead(),4,'each lost tank is a point for the enemy')});
 test('no enemy fire in its first 2 s; below 2,000 only from close in and in front; its shells are as fast as yours',()=>{assert.equal(C.enemyShellSpeed,C.shellSpeed);
  const e=range(make(),'tank',30);e.enemy.reload=0;e.enemy.age=0;step(e,Math.floor(C.firstShot/C.step)-2);assert.ok(!e.events.some(v=>v.type==='enemy-fire'),'waits');step(e,10);assert.ok(e.events.some(v=>v.type==='enemy-fire'),'then fires');
  const far=range(make(),'tank',80);far.enemy.reload=0;step(far,60);assert.ok(!far.events.some(v=>v.type==='enemy-fire'),'not from far');
  const vet=range(make(),'tank',80);vet.score=C.rookieScore;vet.enemy.reload=0;step(vet,60);assert.ok(vet.events.some(v=>v.type==='enemy-fire'),'from far at 2,000');
  const side=range(make(),'tank',30);side.enemy.x=30;side.enemy.z=0;side.enemy.a=-Math.PI/2;side.enemy.reload=0;step(side,60);assert.ok(!side.events.some(v=>v.type==='enemy-fire'),'not from the side')});
 test('a tank the player keeps evading gives way to a missile',()=>{const e=range(make(),'tank',60);e.enemy.evade=50;e.enemy.age=49.9;step(e,24);assert.equal(e.enemy.kind,'missile')});
 test('a missile that reaches the tank destroys it',()=>{const e=range(make(),'missile',30);e.enemy.y=1;step(e,240);assert.ok(e.events.some(v=>v.type==='death'))});
 test('bonus tanks at 15,000 and 100,000',()=>{const e=make();e.award(14000);assert.equal(e.lives,3);e.award(1000);assert.equal(e.lives,4);e.award(85000);assert.equal(e.lives,5);e.award(50000);assert.equal(e.lives,5)});
 test('the radar gives the enemy\'s bearing from the tank\'s heading',()=>{const e=range(make(),'tank',30);e.enemy.x=30;e.enemy.z=0;assert.near(e.radar()[0].bearing,Math.PI/2,1e-6);e.player.a=Math.PI/2;assert.near(e.radar()[0].bearing,0,1e-6)});
 test('the plain wraps',()=>{assert.near(wrap(C.world/2+5),-C.world/2+5,1e-9)});
 test('the demo pilot destroys an enemy',()=>{const e=make(3);let n=0;while(e.score===0&&n<120*120){e.step(C.step,e.pilot());n++}assert.ok(e.score>=1000,'score '+e.score)});
 return count}
g.RecessZoneTests={run};if(typeof module!=='undefined')module.exports=g.RecessZoneTests;
})(globalThis);
