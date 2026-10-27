'use strict';
// Spitball Command rule checks: one per 1980 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,MissileEngine:Engine}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)},near:(a,b,eps,m)=>{if(Math.abs(a-b)>eps)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1980)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 const quiet=e=>{e.toLaunch=0;e.toLaunchSmart=0;e.incoming=[];e.flyers=[];e.flyerTimer=1e9;e.events=[];return e};
 const enemy=(e,x,y,kind='missile')=>{const m={x0:x,y0:0,x,y,tx:x,ty:C.groundY,kind,split:false};e.incoming.push(m);return m};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<8000;i++){const inp=i%40===0?{aim:{x:200+(i%600),y:300},fireNearest:true}:{};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('six cities and three bases with ten counter-missiles each',()=>{const e=make();assert.equal(e.cities.length,6);assert.equal(e.bases.length,3);assert.ok(e.bases.every(b=>b.ammo===10))});
 test('a counter-missile flies to the crosshair and the centre base\'s flies faster',()=>{const t=[];for(const i of [0,1]){const e=quiet(make());e.cursor={x:C.bases[i],y:300};e.fire(i);let n=0;while(e.shots.length&&n<2000){step(e,1,{aim:{x:C.bases[i],y:300}});n++}t.push(n);assert.ok(e.bursts.length===1&&Math.abs(e.bursts[0].x-C.bases[i])<1,'burst at the crosshair')}assert.ok(t[1]<t[0],'centre faster '+t)});
 test('the burst grows then shrinks and destroys what is inside it: 25 a missile',()=>{const e=quiet(make());e.burstAt(500,300);const r=[];for(let i=0;i<4;i++){step(e,Math.round(C.burstGrow/3/C.step));r.push(e.radius(e.bursts[0]))}assert.ok(r[2]>r[0]);enemy(e,500,300);step(e,2);assert.equal(e.incoming.length,0);assert.equal(e.score,25)});
 test('the crosshair stays above the desks',()=>{const e=new Engine(3);for(let i=0;i<240;i++)e.step(C.step,{y:1});assert.equal(e.cursor.y,C.groundY-C.cursorFloor);assert.ok(e.cursor.y<C.groundY-70)});
 test('a base with no counter-missiles left cannot fire',()=>{const e=quiet(make());e.bases[0].ammo=0;e.cursor={x:100,y:300};assert.ok(!e.fire(0));assert.ok(e.fire(1))});
 test('a hit destroys a city or a base',()=>{const e=quiet(make());enemy(e,C.cities[0],C.groundY-1);enemy(e,C.bases[2],C.groundY-1);step(e,20);assert.ok(!e.cities[0].alive);assert.ok(!e.bases[2].alive)});
 test('an ICBM in the middle band splits into up to three more heads, and the heads count toward the wave',()=>{const e=quiet(make());e.toLaunch=5;const m=enemy(e,500,e.lineY(140));e.launchAttacks();assert.equal(e.incoming.length,4,'split into '+e.incoming.length);assert.equal(e.toLaunch,2);assert.ok(m.split)});
 test('wave sizes and speeds follow the cabinet tables: 12 slow ICBMs first, smart bombs from wave 6, full speed at wave 15',()=>{const e=make();assert.equal(e.toLaunch,12);assert.equal(e.toLaunchSmart,0);assert.near(e.speed,C.scale*60/5.8125,1e-9);
  for(let w=2;w<=15;w++){e.newWave()}assert.equal(e.wave,15);assert.equal(e.toLaunch,18);assert.equal(e.toLaunchSmart,6);assert.near(e.speed,C.scale*60,1e-9);const f=make();for(let w=2;w<=6;w++)f.newWave();assert.equal(f.toLaunchSmart,1);for(let w=7;w<=25;w++)f.newWave();assert.equal(f.toLaunch,22)});
 test('a salvo is at most four, and the next waits until the highest ICBM has come down',()=>{const e=quiet(make());e.toLaunch=12;e.launchAttacks();assert.equal(e.incoming.length,4);e.launchAttacks();assert.equal(e.incoming.length,4,'waits');
  let n=0;while(e.incoming.length===4&&n<120*30){e.step(C.step,{});n++}assert.ok(Math.min(...e.incoming.slice(0,4).map(m=>m.y))>=e.lineY(200)-1,'the first salvo came down to line 200 first')});
 test('no more than three cities fall in one wave',()=>{for(const seed of [1,2,3,4]){const e=new Engine(seed);let n=0;while(e.wave===1&&n<120*200){e.step(C.step,{});n++}assert.equal(e.cities.filter(c=>c.alive).length,3,'seed '+seed)}});
 test('at most eight counter-missiles in the air',()=>{const e=quiet(make());e.cursor={x:500,y:100};let n=0;for(let i=0;i<12;i++)if(e.fire(i%3))n++;assert.equal(n,C.maxShots)});
 test('with no counter-missiles left the attack comes down at full speed',()=>{const e=quiet(make());for(const b of e.bases)b.ammo=0;const m=enemy(e,500,100);step(e,120);assert.ok(e.fullSpeed);assert.near(m.y-100,e.icbmSpeed(99),1)});
 test('bombers and satellites come from wave 2 and score 100',()=>{const e=make();assert.equal(e.wave,1);let saw=false;for(let i=0;i<120*40&&!saw&&e.wave===1;i++){e.step(C.step,{});if(e.flyers.length&&e.wave===1)saw=true}assert.ok(!saw,'none in wave 1');
  const f=quiet(make());f.wave=2;f.flyers.push({x:500,y:200,dir:1,kind:'bomber',drop:9});f.burstAt(500,200);step(f,2);assert.equal(f.score,100*f.multiplier())});
 test('end of wave: 5 per unused counter-missile and 100 per city, times the wave multiplier',()=>{const e=quiet(make());e.endWave();assert.equal(e.score,(30*5+6*100)*1);const f=quiet(make());f.wave=5;f.endWave();assert.equal(f.score,(30*5+6*100)*3)});
 test('the multiplier climbs from 1x to 6x every two waves',()=>{const e=make();assert.equal([1,2,3,4,5,6,7,8,9,10,11,15].map(w=>e.multiplier(w)).join(),'1,1,2,2,3,3,4,4,5,5,6,6')});
 test('lost bases come back next wave, lost cities do not',()=>{const e=quiet(make());e.bases[0].alive=false;e.cities[0].alive=false;e.endWave();step(e,Math.ceil(C.waveDelay/C.step)+2);assert.equal(e.wave,2);assert.ok(e.bases[0].alive&&e.bases[0].ammo===10);assert.ok(!e.cities[0].alive)});
 test('a bonus city every 10,000 rebuilds a lost city',()=>{const e=quiet(make());e.cities[0].alive=false;e.score=9990;e.award(25);assert.equal(e.bonusCities,1);e.endWave();assert.ok(e.cities[0].alive)});
 test('the game ends when the last city is gone',()=>{const e=quiet(make());for(const c of e.cities)c.alive=false;e.endWave();assert.equal(e.state,'end')});
 test('with every city and base gone mid-wave the wave still plays out and the game ends',()=>{const e=make(5);step(e,120*3);for(const c of e.cities)c.alive=false;for(const b of e.bases){b.alive=false;b.ammo=0}let n=0;while(e.state!=='end'&&n<120*120){e.step(C.step,{});n++}assert.equal(e.state,'end');assert.equal(e.toLaunch,0)});
 test('the demo pilot defends the class through the first wave',()=>{const e=make(3);let n=0;while(e.wave===1&&e.state!=='end'&&n<120*120){e.step(C.step,e.pilot());n++}assert.equal(e.wave,2);assert.ok(e.cities.filter(c=>c.alive).length>=3,'cities '+e.cities.filter(c=>c.alive).length)});
 return count}
g.SpitballCommandTests={run};if(typeof module!=='undefined')module.exports=g.SpitballCommandTests;
})(globalThis);
