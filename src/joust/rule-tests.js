'use strict';
// Jock Joust rule checks: one per 1982 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,JoustEngine:Engine,waveKind,waveRow}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1982)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A quiet field: no enemies waiting, no pterodactyl, the player in mid air at a given spot.
 const bare=(wave=1,seed=1982)=>{const e=make(seed);e.wave=wave-1;e.newWave();e.queue=[];e.enemies=[];e.eggs=[];e.pteroTimer=1e9;e.pteros=[];e.events=[];e.player.shield=0;return e};
 const at=(b,x,y)=>Object.assign(b,{x,y,vx:0,vy:0,ground:false});
 const foe=(e,kind,x,y)=>{const f=e.addEnemy(kind,x,y);f.born=0;f.ground=false;return f};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),flap:i%30<4};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('one press is one flap: holding the button does not keep flapping',()=>{const e=bare();e.queue=['bounder'];at(e.player,300,400);step(e,120,{flap:true});assert.equal(e.flaps,1);assert.ok(e.player.y>400,'falls while held');
  step(e,1);step(e,1,{flap:true});assert.equal(e.flaps,2)});
 test('a flap with the stick held pushes sideways and the rider keeps his momentum in the air',()=>{const e=bare();e.queue=['bounder'];at(e.player,300,400);step(e,1,{flap:true,right:true});const vx=e.player.vx;assert.ok(vx>0,'pushed');step(e,30);assert.equal(e.player.vx,vx,'keeps momentum')});
 test('the screen wraps at the left and right edges',()=>{const e=bare();e.queue=['bounder'];at(e.player,W(C)-3,300);e.player.vx=200;step(e,4);assert.ok(e.player.x<20,'wrapped to '+e.player.x);at(e.player,2,300);e.player.vx=-200;step(e,4);assert.ok(e.player.x>W(C)-20)});
 test('a rider lands on a ledge and runs, and skids to a stop',()=>{const e=bare();e.queue=['bounder'];at(e.player,480,300);step(e,120);assert.ok(e.player.ground);assert.equal(e.player.y,370,'on the middle ledge');at(e.player,400,300);step(e,120);step(e,30,{right:true});assert.ok(e.player.vx>0);step(e,120);assert.equal(e.player.vx,0,'skidded');assert.ok(e.player.ground)});
 test('the higher lance wins: a Bounder unseated from above scores 500 and leaves an egg',()=>{const e=bare();const f=foe(e,'bounder',300,420);at(e.player,300,400);e.collide();assert.equal(e.score,500);assert.equal(e.enemies.length,0);assert.equal(e.eggs.length,1);assert.equal(e.eggs[0].kind,'hunter')});
 test('the lower lance loses a life; equal height bounces both apart, and riders bounce off each other',()=>{const e=bare();foe(e,'bounder',300,380);at(e.player,300,400);e.collide();assert.equal(e.lives,C.lives-1);assert.equal(e.state,'dead');
  const f=bare(),b=foe(f,'bounder',320,400);at(f.player,300,402);f.collide();assert.equal(f.lives,C.lives);assert.ok(b.vx>0&&f.player.vx<0,'bounced apart');assert.equal(f.score,0);
  const h=bare(),x=foe(h,'hunter',300,400),y=foe(h,'hunter',320,404);h.player=null;h.state='dead';h.timer=1e9;h.moveEnemies(C.step);assert.ok(x.vx<0&&y.vx>0,'two riders bounce off each other')});
 test('Bounder 500, Hunter 750, Shadow Lord 1,500',()=>{const pts=['bounder','hunter','lord'].map(k=>{const e=bare();foe(e,k,300,420);at(e.player,300,400);e.collide();return e.score});assert.equal(pts.join(),'500,750,1500')});
 test('eggs score 250, 500, 750, then 1,000 each, plus 500 caught in the air; the count starts over each wave and life',()=>{const e=bare();e.queue=['bounder'];e.eggs.push({x:300,y:300,vx:0,vy:0,ground:false,t:9,kind:'hunter',state:'egg'});at(e.player,300,300);e.collide();assert.equal(e.score,750,'first egg in the air');
  const f=bare();f.queue=['bounder'];const seen=[];for(let i=0;i<5;i++){const s0=f.score;f.eggs.push({x:300,y:420,vx:0,vy:0,ground:true,t:9,kind:'hunter',state:'egg'});at(f.player,300,420);f.collide();seen.push(f.score-s0)}assert.equal(seen.join(),'250,500,750,1000,1000');
  f.newWave();const s1=f.score;f.eggs.push({x:300,y:420,vx:0,vy:0,ground:true,t:9,kind:'hunter',state:'egg'});at(f.player,300,420);f.collide();assert.equal(f.score-s1,250,'new wave starts over')});
 test('50 points for every lost life',()=>{const e=bare();e.die('joust');assert.equal(e.score,50)});
 test('an egg left alone hatches and is carried off as the next stronger rider',()=>{const e=bare();e.player=null;e.state='dead';e.timer=1e9;e.eggs.push({x:100,y:300,vx:0,vy:0,ground:false,t:C.hatch,kind:'hunter',state:'egg'});
  step(e,Math.ceil((C.hatch+1)/C.step));assert.equal(e.eggs[0]?.state,'hatched');step(e,Math.ceil(C.mountDelay/C.step)+2);assert.equal(e.eggs.length,0);assert.equal(e.enemies.length,1);assert.equal(e.enemies[0].kind,'hunter')});
 test('the bridge burns on wave 3 and the pit swallows a rider who falls in',()=>{const a=bare(2);assert.ok(!a.lavaOpen(60));const e=bare(3);assert.ok(e.lavaOpen(60)&&!e.lavaOpen(512));e.queue=['bounder'];e.rng.next=()=>.99;at(e.player,60,690);step(e,40);assert.equal(e.lives,C.lives-1);assert.equal(e.events.find(x=>x.type==='death').cause,'pit')});
 test('from wave 4 the troll grabs a low flier over the pit; flapping hard breaks free, otherwise it drags him in',()=>{const n=bare(3);n.queue=['bounder'];n.rng.next=()=>0;at(n.player,60,C.trollY+4);step(n,1);assert.ok(!n.player.grab,'no hand on wave 3');const e=bare(4);e.queue=['bounder'];e.rng.next=()=>0;at(e.player,60,C.trollY+4);step(e,1);assert.ok(e.player.grab,'grabbed');
  for(let i=0;i<C.trollFlaps;i++){step(e,2,{flap:true});step(e,2)}assert.ok(e.player&&!e.player.grab,'free');assert.equal(e.score,50,'50 for breaking free');
  const f=bare(4);f.queue=['bounder'];f.rng.next=()=>0;at(f.player,60,C.trollY+4);step(f,Math.ceil((C.lavaY-C.trollY)/C.trollPull/C.step)+10);assert.equal(f.lives,C.lives-1)});
 test('a long wave brings the pterodactyl; it kills on touch but scores 1,000 when the lance meets its open mouth',()=>{const e=bare();e.queue=['bounder'];e.pteroTimer=60;e.player=null;e.state='dead';e.timer=1e9;step(e,Math.ceil(60/C.step)+2);assert.ok(e.ptero,'appears');
  const f=bare();f.queue=['bounder'];at(f.player,300,400);f.player.facing=1;f.ptero={x:330,y:400,vx:-300,phase:0};f.collide();assert.equal(f.score,1000);
  const h=bare();h.queue=['bounder'];at(h.player,300,400);h.player.facing=1;h.ptero={x:330,y:400,vx:-300,phase:C.mouthOpen+.1};h.collide();assert.equal(h.lives,C.lives-1)});
 test('the baiter clock: pterodactyls 60 s into wave 1, 45 s into wave 2, 30 s later on, then faster, three at most; a lost life sends them away',()=>{
  const first=w=>{const e=make();e.wave=w-1;e.newWave();return e.pteroTimer};assert.equal([1,2,3,9].map(first).join(),'60,45,30,30');
  const e=make();e.wave=2;e.newWave();e.queue=[];e.enemies=[];e.eggs=[];e.player=null;e.state='dead';e.timer=1e9;e.addEnemy('bounder',100,-500).born=1e9;const at=[];
  for(let i=0;i<Math.ceil(80/C.step);i++){const n=e.pteros.length;e.step(C.step,{});if(e.pteros.length>n)at.push(Math.round(e.waveClock))}
  assert.equal(at.join(),'30,45,60','three at once at most: '+at);for(const t of e.pteros)assert.ok(t.baiter,'baiters');
  e.pteros.pop();step(e,Math.ceil(.5/C.step));assert.equal(e.pteros.length,3,'next after 7 s, already due');
  const f=bare(3);f.queue=['bounder'];f.addPtero(0,true);f.addPtero(1,false);f.pteroTimer=2;f.die('joust');assert.equal(f.pteros.length,1,'baiter sent away');assert.ok(!f.pteros[0].baiter);
  f.player=null;f.timer=1e9;step(f,Math.ceil(5/C.step)-2);assert.ok(f.pteroTimer>1.9,'clock held');step(f,Math.ceil(2.2/C.step)+2);assert.equal(f.pteros.length,2,'clock runs again')});
 test('wave types: survival on 2, egg wave on 5 (gladiator is two-player only), pterodactyl wave from 8, in a cycle of five',()=>{assert.equal([1,2,3,4,5,6,7,8,9,10,13].map(waveKind).join(),'plain,survival,plain,plain,egg,plain,survival,ptero,plain,egg,ptero');
  const e=bare(5);e.wave=4;e.eggs=[];e.newWave();assert.equal(e.queue.length,0);assert.equal(e.eggs.length,12,'12 eggs');assert.ok(e.eggs.every(o=>o.ground&&o.kind==='bounder'),'eggs on the ledges');
  const f=bare();f.wave=7;f.newWave();assert.equal(f.pteros.length,1,'one on wave 8');f.wave=17;f.newWave();assert.equal(f.pteros.length,2,'two on wave 18');f.wave=42;f.newWave();assert.equal(f.pteros.length,3,'three on wave 43')});
 test('a survival wave pays 3,000 if the player is not unseated',()=>{const e=bare(2);step(e,2);assert.equal(e.score,3000);const f=bare(2);f.diedThisWave=true;step(f,2);assert.equal(f.score,0)});
 test('the upper ledges vanish and come back by the cabinet\'s table',()=>{const n=w=>bare(w).surf.map(l=>l.name).join();assert.ok(!n(6).includes('topC')&&n(6).includes('topL'),'wave 6');assert.ok(!/topL|topR|topC|midC/.test(n(9)),'wave 9');assert.ok(/topL.*topR.*topC.*midC/.test(n(10)),'wave 10 restores');assert.ok(n(12).includes('topL')&&!n(12).includes('midC'),'wave 12');assert.equal(n(71),n(61),'repeats after 70')});
 test('each wave brings the cabinet\'s riders: more of them and harder kinds',()=>{const e=bare();const k=w=>{e.wave=w-1;e.newWave();return e.queue.join()};assert.equal(k(1),'bounder,bounder,bounder');assert.equal(k(2).split(',').length,4);assert.equal(k(4),'hunter,hunter,hunter,bounder,bounder,bounder');assert.ok(!k(15).includes('lord')&&k(16).includes('lord'));assert.equal(k(42),Array(10).fill('lord').join());assert.equal(waveRow(80).lord,12)});
 test('five lives, an extra life every 20,000; the last life lost ends the game',()=>{const e=bare();e.queue=['bounder'];assert.equal(e.lives,5);e.award(19990);assert.equal(e.lives,5);e.award(20);assert.equal(e.lives,6);e.lives=1;e.die('joust');assert.equal(e.state,'end')});
 test('the demo pilot scores',()=>{const e=make(3);for(let i=0;i<120*60;i++)e.step(C.step,e.pilot());assert.ok(e.score>=1500,'score '+e.score)});
 return count}
const W=C=>C.width;
g.JockJoustTests={run};if(typeof module!=='undefined')module.exports=g.JockJoustTests;
})(globalThis);
