'use strict';
// Testpest rule checks: one per 1981 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,TempestEngine:Engine,SHAPES}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1981)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A quiet tube: nothing waiting, nothing climbing, so each check places its own enemies.
 const bare=(seed=1981,level=1)=>{const e=make(seed);e.level=level-1;e.newLevel();e.nymphs=0;e.events=[];e.claw.pos=4;return e};
 const put=(e,kind,lane,z,extra={})=>Object.assign(e.spawn(kind,lane,z),{flipTimer:1e9,fireTimer:1e9},extra);
 const shoot=(e,frames=60)=>{e.fireTimer=0;step(e,1,{fire:true});step(e,frames)};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),fire:i%40<20,zap:i===3000};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('16 well shapes of 16 lanes, closed and open, in turn and round again from level 17',()=>{assert.equal(SHAPES.length,16);assert.ok(SHAPES.every(s=>s.rim.length===(s.closed?16:17)));assert.ok(SHAPES.some(s=>!s.closed)&&SHAPES[0].closed);
  const e=bare(1,1),names=[];for(let i=0;i<17;i++){names.push(e.shape.name);e.newLevel()}assert.equal(names[0],'circle');assert.equal(names[16],'circle');assert.equal(new Set(names).size,16)});
 test('the Claw wraps round a closed well and stops at the ends of an open one',()=>{const e=bare(1,1);e.claw.pos=0;step(e,30,{left:true});assert.ok(e.lane>10,'wrapped to '+e.lane);
  const f=bare(1,8);assert.ok(!f.shape.closed);f.claw.pos=1;step(f,120,{left:true});assert.equal(f.lane,0);step(f,600,{right:true});assert.equal(f.lane,15)});
 test('up to 8 shots at a time fly down the lane and stop at the first enemy',()=>{const e=bare();for(let i=0;i<40;i++){e.fireTimer=0;e.step(C.step,{fire:true})}assert.ok(e.shots.length<=C.maxShots);
  const f=bare();const near=put(f,'flipper',4,.5),far=put(f,'flipper',4,.8);shoot(f);assert.ok(!f.enemies.includes(near)&&f.enemies.includes(far),'first one only')});
 test('a Flipper scores 150 and flips lane to lane as it climbs',()=>{const e=bare();const fl=put(e,'flipper',9,.9,{flipTimer:.2});const lanes=new Set();for(let i=0;i<600;i++){step(e,1);lanes.add(fl.lane)}assert.ok(lanes.size>1,'flipped');
  const f=bare();put(f,'flipper',4,.5);shoot(f);assert.equal(f.score,150)});
 test('a Flipper on the rim chases the Claw and catches it',()=>{const e=bare();put(e,'flipper',8,0,{flipTimer:0});for(let i=0;i<600&&e.state==='play';i++)step(e,1);assert.equal(e.state,'dead');assert.equal(e.events.find(v=>v.type==='death').cause,'caught')});
 test('a Tanker scores 100 and splits into two Flippers, also when it reaches the rim',()=>{const e=bare();put(e,'tanker',4,.5);shoot(e,25);assert.equal(e.score,100);assert.equal(e.enemies.map(x=>x.kind+x.lane).sort().join(),'flipper3,flipper5');
  const f=bare();put(f,'tanker',10,.02);step(f,30);assert.equal(f.enemies.filter(x=>x.kind==='flipper').length,2);assert.equal(f.score,0)});
 test('a Spiker scores 50, leaves a spike in its lane and comes back up as a Flipper',()=>{const e=bare();const s=put(e,'spiker',9,1,{turn:.4});step(e,120*12);assert.ok(Math.abs(e.spikes[9]-.4)<.02,'spike to '+e.spikes[9]);assert.equal(s.kind,'flipper');
  const f=bare();put(f,'spiker',4,.5);shoot(f);assert.equal(f.score,50)});
 test('shots shorten a spike, 1 point a hit',()=>{const e=bare();e.spikes[4]=.3;shoot(e);assert.equal(e.score,1);assert.ok(Math.abs(e.spikes[4]-(.3+C.spikeHit))<1e-9)});
 test('a Fuseball can only be shot crossing a lane: 250 three times in four, else 500 or 750',()=>{const e=bare();put(e,'fuseball',4,.5,{vz:0});shoot(e);assert.equal(e.score,0,'on an edge');
  const n={};for(let i=0;i<400;i++){const f=bare();f.rng=new (f.rng.constructor)(i+1);put(f,'fuseball',4,.5,{vz:0,flip:.3,cross:4,to:5});f.shots.push({lane:4,z:.49});f.moveShots(C.step);n[f.score]=(n[f.score]||0)+1}assert.equal(Object.keys(n).sort().join(),'250,500,750');assert.ok(n[250]>240&&n[250]<360,'250 about 3/4: '+n[250])});
 test('a Pulsar scores 200 and its pulse electrifies its lane',()=>{const e=bare();put(e,'pulsar',4,.6,{phase:0});shoot(e,30);assert.equal(e.score,200);
  const f=bare();put(f,'pulsar',4,.8,{phase:C.pulsePeriod-C.pulseOn-.05});step(f,30);assert.equal(f.state,'dead');assert.equal(f.events.find(v=>v.type==='death').cause,'pulsar')});
 test('enemy shots climb the lane and kill the Claw; a shot of hers destroys them',()=>{const e=bare();e.nymphs=1;e.spawnTimer=1e9;e.enemyShots.push({lane:4,z:.3});step(e,120);assert.equal(e.state,'dead');
  const f=bare();f.nymphs=1;f.spawnTimer=1e9;f.enemyShots.push({lane:4,z:.6});shoot(f,20);assert.equal(f.enemyShots.length,0);assert.equal(f.state,'play')});
 test('the Superzapper clears the tube once per level, then takes out one enemy, then nothing',()=>{const e=bare();e.nymphs=1;e.spawnTimer=1e9;for(let l=0;l<5;l++)put(e,'flipper',l+6,.7);put(e,'tanker',12,.7);e.step(C.step,{zap:true});assert.equal(e.enemies.length,0,'zapped, tankers do not split');
  for(let l=0;l<3;l++)put(e,'flipper',l+6,.7);e.step(C.step,{});e.step(C.step,{zap:true});assert.equal(e.enemies.length,2);e.step(C.step,{});e.step(C.step,{zap:true});assert.equal(e.enemies.length,2);
  e.enemies=[];e.nymphs=0;step(e,2);assert.equal(e.state,'warp');step(e,Math.ceil(C.warpTime/C.step)+2);assert.equal(e.zaps,0,'recharged')});
 test('a clear tube warps the Claw to the next level; a spike on the way is fatal, but the level still moves on',()=>{const e=bare();step(e,2);assert.equal(e.state,'warp');step(e,Math.ceil(C.warpTime/C.step)+2);assert.equal(e.level,2);assert.equal(e.lives,3);
  const f=bare();f.spikes[4]=.5;step(f,Math.ceil(C.warpTime/C.step));assert.equal(f.state,'dead');assert.equal(f.lives,2);step(f,Math.ceil(C.deathPause/C.step)+2);assert.equal(f.level,2);assert.ok(f.spikes.every(z=>z===1),'new tube')});
 test('from the far end: Flippers on 1 to 4 (later only out of Tankers and Spikers), Tankers from 3 (not 4), Spikers from 4 (not 17 to 19), Fuseballs from 11 (not 17 to 21, 26), Pulsars from 17',()=>{const e=make(),has=L=>Object.entries(e.mix(L)).filter(([,n])=>n).map(([k])=>k).join();
  assert.equal(has(2),'flipper');assert.equal(has(3),'flipper,tanker');assert.equal(has(4),'flipper,spiker','no Tankers on 4');assert.equal(has(5),'tanker,spiker');assert.equal(has(11),'tanker,spiker,fuseball');assert.equal(has(17),'pulsar,tanker');
  assert.ok(!has(18).includes('fuseball')&&!has(26).includes('fuseball')&&has(22).includes('fuseball'),'Fuseball gaps');assert.equal(has(22),'pulsar,tanker,spiker,fuseball')});
 test('each level sends its number of enemies (10, 12, 15, 17, 20 ...), about two a second, never more than six in the tube',()=>{const counts=[1,2,3,4,5,15,17,30].map(L=>{const e=make(L);e.level=L-1;e.newLevel();return e.nymphs});assert.equal(counts.join(),'10,12,15,17,20,30,20,27');
  const e=bare(5,5);e.nymphs=20;e.spawnTimer=0;let most=0;e.die=()=>{};for(let t=0;t<120*6;t++){e.step(C.step,{});most=Math.max(most,e.enemies.length)}assert.ok(most<=C.maxActive,'at most six: '+most);assert.ok(e.nymphs<=20-5,'came up steadily: '+e.nymphs);
  const f=bare(1,1);f.nymphs=10;f.spawnTimer=0;f.die=()=>{};step(f,120*2);const n=10-f.nymphs;assert.ok(n>=3&&n<=4,'about one every 0.57 s: '+n)});
 test('enemies climb faster level by level: about 6 seconds up the tube on level 1, 3 on level 8; Fuseballs twice as fast',()=>{const t=L=>1/bare(1,L).speed();assert.ok(Math.abs(t(1)-5.82)<.1,'level 1 '+t(1));assert.ok(Math.abs(t(8)-3.24)<.1,'level 8 '+t(8));assert.ok(t(16)<t(8)&&t(16)>2.5);
  const e=bare(1,11);const fb=put(e,'fuseball',4,1,{vz:-1});step(e,60);assert.ok(Math.abs((1-fb.z)-e.speed()*C.fuseballSpeed*.5)<.02,'fuseball climbs at twice the speed');assert.equal(C.fuseballSpeed,2)});
 test('enemy shots are limited per level: two at once on level 1, more later',()=>{const e=bare(1,1);e.nymphs=1;e.spawnTimer=1e9;for(let l=0;l<6;l++)put(e,'flipper',l+6,.8,{fireTimer:0});step(e,2);assert.equal(e.enemyShots.length,2);
  const f=bare(1,5);f.nymphs=1;f.spawnTimer=1e9;for(let l=0;l<6;l++)put(f,'flipper',l+6,.8,{fireTimer:0});step(f,2);assert.equal(f.enemyShots.length,4)});
 test('an extra life every 20,000 points; three lost lives end the game',()=>{const e=bare();e.award(19990);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(20000);assert.equal(e.lives,5);e.lives=1;e.die('shot');assert.equal(e.state,'end')});
 test('the demo pilot scores',()=>{const e=make(3);for(let i=0;i<120*60;i++)e.step(C.step,e.pilot());assert.ok(e.score>=1500,'score '+e.score)});
 return count}
g.TestpestTests={run};if(typeof module!=='undefined')module.exports=g.TestpestTests;
})(globalThis);
