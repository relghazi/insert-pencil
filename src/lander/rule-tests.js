'use strict';
// Lunch Lander rule checks: one per 1979 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,LanderEngine:Engine,ground}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)},near:(a,b,eps,m)=>{if(Math.abs(a-b)>eps)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1979)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // Put the lander just above a pad (or any x), moving as given.
 const over=(e,x,vy,vx=0,angle=0)=>{const p=e.p;p.x=x;p.y=ground(x)-C.bodyH/2-.01;p.vy=vy;p.vx=vx;p.angle=angle;e.events=[];step(e,3);return e.result};
 const pad=b=>C.pads.find(p=>p.bonus===b),mid=p=>(p.x0+p.x1)/2;
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<5000;i++){const inp={turn:Math.sin(i/80),throttle:i%300<120?.8:0};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('gravity pulls the lander down',()=>{const e=make();e.p.vx=0;const vy=e.p.vy;step(e,60);assert.near(e.p.vy-vy,C.gravity*.5,.01)});
 test('thrust pushes along the lander\'s axis and the throttle is variable',()=>{const a=make(),b=make();for(const e of [a,b]){e.p.vx=0;e.p.vy=0}step(a,60,{throttle:1});step(b,60,{throttle:.5});assert.near(a.p.vy,(C.gravity-C.thrust)*.5,.01);assert.near(b.p.vy,(C.gravity-C.thrust/2)*.5,.01);
  const c=make();c.p.vx=0;c.p.vy=0;c.p.angle=Math.PI/2;step(c,60,{throttle:1});assert.ok(c.p.vx>30,'sideways')});
 test('thrust burns fuel in proportion to the throttle, and no fuel means no thrust',()=>{const e=make(),f=e.fuel;step(e,120,{throttle:.5});assert.near(f-e.fuel,C.burn*.5,.01);e.fuel=0;e.p.vy=0;step(e,60,{throttle:1});assert.ok(e.p.vy>0,'falls')});
 test('rotation turns the lander left and right',()=>{const e=make();step(e,60,{turn:1});assert.near(e.p.angle,C.turnRate*.5,1e-6);step(e,120,{turn:-1});assert.near(e.p.angle,-C.turnRate*.5,1e-6)});
 test('abort turns the lander upright and fires full thrust',()=>{const e=make();e.p.angle=.6;e.p.vy=50;const f=e.fuel;step(e,120,{abort:true});assert.ok(Math.abs(e.p.angle)<.01,'upright');assert.ok(e.p.vy<50,'slowed');assert.near(f-e.fuel,C.abortBurn,.01,'abort burns '+C.abortBurn+' a second')});
 test('a slow upright touchdown on a pad is a good landing: 50 times the bonus, plus 50 fuel',()=>{const e=make(),f=e.fuel;const r=over(e,mid(pad(3)),10);assert.equal(r.kind,'good');assert.equal(e.score,150);assert.equal(e.fuel,f+C.fuelBonus)});
 test('a firmer touchdown is a hard landing: 15 times the bonus',()=>{const e=make();const r=over(e,mid(pad(5)),45);assert.equal(r.kind,'hard');assert.equal(e.score,75)});
 test('too fast, tilted or off a pad is a crash: 5 times the bonus (off a pad, 5)',()=>{const a=make();assert.equal(over(a,mid(pad(2)),120).kind,'crash');assert.equal(a.score,10);
  const b=make();assert.equal(over(b,mid(pad(4)),10,0,.6).kind,'crash');const c=make();assert.equal(over(c,560,10).kind,'crash');assert.equal(c.score,5)});
 test('the pads are worth x2, x3, x4 and x5, the smaller the pad the higher the bonus',()=>{assert.equal(C.pads.map(p=>p.bonus).sort().join(),'2,3,4,5');const w=[...C.pads].sort((a,b)=>a.bonus-b.bonus).map(p=>p.x1-p.x0);for(let i=1;i<w.length;i++)assert.ok(w[i]<w[i-1],'widths '+w);for(const p of C.pads)assert.ok(Math.abs(ground(p.x0+2)-p.y)<1e-6&&Math.abs(ground(p.x1-2)-p.y)<1e-6,'flat pad')});
 test('after a landing a new lander starts at the top with the fuel left; no fuel ends the game',()=>{const e=make();over(e,mid(pad(3)),10);const f=e.fuel;step(e,Math.ceil(C.pauseAfter/C.step)+2);assert.equal(e.state,'fly');assert.near(e.p.y,C.startY,1);assert.equal(e.fuel,f);
  e.fuel=0;over(e,mid(pad(2)),120);step(e,Math.ceil(C.pauseAfter/C.step)+2);assert.equal(e.state,'end')});
 test('the landscape wraps at the sides',()=>{const e=make();e.p.x=C.width-2;e.p.vx=200;e.p.vy=-50;step(e,10);assert.ok(e.p.x<20)});
 test('the demo pilot lands safely',()=>{const e=make(3);let n=0;while(e.state==='fly'&&n<120*90){e.step(C.step,e.pilot());n++}assert.ok(e.result&&e.result.kind!=='crash','result '+JSON.stringify(e.result))});
 return count}
g.LunchLanderTests={run};if(typeof module!=='undefined')module.exports=g.LunchLanderTests;
})(globalThis);
