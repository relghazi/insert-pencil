'use strict';
// Dig Doug rule checks: one per 1982 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,DigDugEngine:Engine}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const S=C.sub,make=(seed=1982)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)},secs=t=>Math.ceil(t/C.step);
 // A quiet field: only the surface is open, no rocks, and enemies placed by hand that never turn to eyes or breathe fire
 // (plus one parked off the field, held inflated forever, so the round stays open and no one flees).
 const bare=(seed=1982)=>{const e=make(seed);e.field.fill(0);for(let fx=0;fx<Core.FW;fx++)e.dig(fx,0);e.rocks=[];e.enemies=[Object.assign(e.enemy('pooka',-9,-9),{pump:1,deflate:1e9})];e.events=[];e.player={x:2,y:12,dir:{dx:1,dy:0},moving:false,crushed:null};return e};
 const put=(e,kind,c,r)=>{const x=e.enemy(kind,c,r);x.ghostTimer=x.fireTimer=1e9;e.enemies.push(x);return x};
 const tunnel=(e,c0,r0,c1,r1)=>e.digLine(c0,r0,c1,r1);
 // Pump an enemy standing in line with the player: shoot, then press fire again until it pops.
 const pumpOut=(e,presses=4,input={})=>{for(let i=0;i<presses;i++){step(e,1,{});step(e,1,{fire:true,...input});step(e,30,{fire:true,...input});step(e,1,{})}};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),axisY:Math.cos(i/90),fire:i%40<20};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('round 1: a shaft to the middle, four enemies (one a Fygar) in their own tunnels and rocks in solid dirt',()=>{const e=make();for(let r=0;r<=C.startR;r++)assert.ok(e.cellDug(C.startC,r),'shaft '+r);
  assert.equal(e.enemies.length,4);assert.equal(e.enemies.filter(x=>x.kind==='fygar').length,1);assert.ok(e.enemies.every(x=>e.cellDug(x.x,x.y)),'in tunnels');
  assert.ok(e.rocks.length>=3);assert.ok(e.rocks.every(k=>!e.cellDug(k.c,k.r)&&!e.cellDug(k.c,k.r+1)),'rocks in dirt')});
 test('digging new tunnel scores 10 a tile; walking back through it scores nothing',()=>{const e=bare();e.player.x=2;e.player.y=12;e.dig(2*S,12*S);const t=secs(1/C.playerSpeed);step(e,t*3+2,{axis:1});const x=e.player.x;assert.ok(e.score>=20,'dug '+e.score);assert.equal(e.score,10*Math.floor((x-2)+1e-6),'10 a tile at x '+x);const s=e.score;step(e,t*3,{axis:-1});assert.equal(e.score,s,'old tunnel')});
 test('walking digs a tunnel, and a turn waits for the next tile centre',()=>{const e=bare();assert.ok(!e.cellDug(4,12));step(e,secs(.7),{axis:1});assert.ok(e.cellDug(3,12)&&e.cellDug(4,12),'dug');
  const f=bare();step(f,secs(.1),{axis:1});const x=f.player.x;step(f,1,{axisY:-1});assert.equal(f.player.y,12,'still on the row');assert.ok(f.player.x>x,'carries on to the centre');step(f,secs(.5),{axisY:-1});assert.ok(f.player.y<12&&Number.isInteger(f.player.x),'turned on the grid')});
 test('Pookas and Fygars walk only through dug tunnels',()=>{const e=bare();tunnel(e,3,5,8,5);tunnel(e,8,5,8,9);const a=put(e,'pooka',4,5),b=put(e,'fygar',8,8);e.player={x:1,y:0,dir:{dx:1,dy:0},moving:false,crushed:null};
  for(let i=0;i<secs(20);i++){step(e,1);for(const x of [a,b])assert.ok(e.cellDug(Math.round(x.x),Math.round(x.y)),'in dirt at '+x.x+','+x.y)}});
 test('enemies turn into eyes, float through dirt towards the player and take shape again in a tunnel',()=>{const e=bare();tunnel(e,8,4,10,4);tunnel(e,2,9,5,9);const a=put(e,'pooka',9,4);e.player={x:3,y:9,dir:{dx:1,dy:0},moving:false,crushed:null};a.ghostTimer=0;
  step(e,2);assert.ok(a.ghost,'eyes');let crossed=false;for(let i=0;i<secs(12)&&a.ghost;i++){step(e,1);if(!e.cellDug(Math.round(a.x),Math.round(a.y)))crossed=true}assert.ok(crossed,'through dirt');assert.ok(!a.ghost,'solid again');assert.ok(e.cellDug(a.x,a.y),'in a tunnel')});
 test('a Fygar breathes fire horizontally, through dirt; above or below it is safe',()=>{const e=bare();tunnel(e,4,6,5,6);const f=put(e,'fygar',4,6);f.dir={dx:1,dy:0};f.fireTimer=0;e.player={x:7,y:6,dir:{dx:-1,dy:0},moving:false,crushed:null};
  step(e,secs(C.fireCharge+.1));assert.equal(e.lives,2,'burned');const g2=bare();tunnel(g2,4,6,5,6);const f2=put(g2,'fygar',4,6);f2.dir={dx:1,dy:0};f2.fireTimer=0;g2.player={x:6,y:8,dir:{dx:1,dy:0},moving:false,crushed:null};step(g2,secs(2));assert.equal(g2.lives,3)});
 test('the hose shoots along the tunnel but never through dirt',()=>{const e=bare();tunnel(e,2,12,3,12);const a=put(e,'pooka',4,12);step(e,1,{fire:true});step(e,30,{fire:true});assert.equal(a.pump,0,'dirt between');
  const f=bare();tunnel(f,2,12,5,12);const b=put(f,'pooka',4,12);step(f,1,{fire:true});step(f,20,{fire:true});assert.equal(b.pump,1,'caught')});
 test('four pumps pop an enemy; a caught enemy is frozen and safe to touch, and shrinks back when left alone',()=>{const e=bare();tunnel(e,2,12,6,12);const a=put(e,'pooka',4,12);pumpOut(e,2);const x0=a.x;step(e,20,{fire:true});assert.ok(a.pump>=2&&a.x===x0,'frozen');
  e.player.x=a.x-.4;step(e,2);assert.equal(e.lives,3,'safe');e.player.x=2;step(e,1,{axis:-1});step(e,secs(3));assert.equal(a.pump,0,'deflated');
  const f=bare();tunnel(f,2,12,6,12);const b=put(f,'pooka',4,12);pumpOut(f,4);assert.ok(b.dying&&b.popped,'popped');assert.equal(f.score,500)});
 test('a popped enemy scores 200, 300, 400 or 500 by stratum',()=>{const pts=[2,5,8,11].map(r=>{const e=bare();e.player={x:2,y:r,dir:{dx:1,dy:0},moving:false,crushed:null};tunnel(e,2,r,5,r);put(e,'pooka',4,r);pumpOut(e);return e.score});assert.equal(pts.join(),'200,300,400,500')});
 test('a Fygar popped with a horizontal hose scores double',()=>{const e=bare();e.player={x:2,y:5,dir:{dx:1,dy:0},moving:false,crushed:null};tunnel(e,2,5,5,5);put(e,'fygar',4,5);pumpOut(e);assert.equal(e.score,600);
  const f=bare();f.player={x:4,y:3,dir:{dx:0,dy:1},moving:false,crushed:null};tunnel(f,4,3,4,6);put(f,'fygar',4,5);pumpOut(f);assert.equal(f.score,300,'vertical: plain')});
 test('a rock drops once undermined, but waits while the player is right under it',()=>{const e=bare();e.rocks=[{c:6,r:4,y:4,state:'still',t:0,caught:[]}];tunnel(e,6,5,6,9);e.player={x:6,y:5,dir:{dx:0,dy:-1},moving:false,crushed:null};
  step(e,secs(2));assert.equal(e.rocks[0].state,'still','waits');e.player.y=9;step(e,secs(C.rockWobble+.05));assert.equal(e.rocks[0].state,'fall');assert.equal(e.rocksDropped,1)});
 test('a falling rock crushes enemies for 1,000, 2,500, 4,000 ... 15,000 and kills the player',()=>{const crush=n=>{const e=bare();e.rocks=[{c:6,r:2,y:2,state:'fall',t:0,caught:[]}];tunnel(e,6,3,6,11);for(let i=0;i<n;i++)put(e,'pooka',6,3+i);step(e,secs(3));return e.score};
  assert.equal([1,2,3].map(crush).join(),'1000,2500,4000');assert.equal(C.crushPoints.join(),'1000,2500,4000,6000,8000,10000,12000,15000');
  const e=bare();e.rocks=[{c:6,r:2,y:2,state:'fall',t:0,caught:[]}];tunnel(e,6,3,6,8);e.player={x:6,y:6,dir:{dx:1,dy:0},moving:false,crushed:null};step(e,secs(2));assert.equal(e.lives,2,'crushed')});
 test('after two dropped rocks a bonus vegetable appears in the middle, worth more each round',()=>{const e=bare();put(e,'pooka',12,0).ghostTimer=1e9;e.rocksDropped=2;step(e,1);assert.equal(e.veggie.kind,'carrot');e.player={x:C.startC-1,y:C.startR,dir:{dx:1,dy:0},moving:false,crushed:null};tunnel(e,C.startC-1,C.startR,C.startC,C.startR);
  step(e,secs(.5),{axis:1});assert.equal(e.score,400);const v=r=>C.veggies.find(([n])=>r<=n);assert.equal([1,2,3,5,6,9,11,13,15,17,18].map(r=>v(r)[2]).join(),'400,600,800,1000,2000,3000,4000,5000,6000,7000,8000')});
 test('the last enemy runs for the top left corner and escapes; the round ends',()=>{const e=bare();tunnel(e,8,8,10,8);e.enemies=[];const a=put(e,'pooka',9,8);e.player={x:13,y:12,dir:{dx:1,dy:0},moving:false,crushed:null};step(e,1);assert.ok(a.flee,'flees');
  step(e,secs(30));assert.ok(!e.enemies.includes(a),'gone');assert.ok(e.round===2||e.state==='cleared','round over')});
 test('clearing the field starts the next round with more enemies',()=>{const e=bare();e.enemies=[];step(e,2);step(e,secs(C.roundDelay)+2);assert.equal(e.round,2);const n=[1,3,5,7,9].map(r=>{const f=make();while(f.round<r)f.newRound();return f.enemies.length});assert.equal(n.join(),'4,5,6,7,8')});
 test('three lives, extra lives at 10,000, 40,000 and every 40,000 after',()=>{const e=bare();put(e,'pooka',12,0);assert.equal(e.lives,3);e.award(9990);assert.equal(e.lives,3);e.award(10);assert.equal(e.lives,4);e.award(30000);assert.equal(e.lives,5);e.award(39990);assert.equal(e.lives,5);e.award(10);assert.equal(e.lives,6,'80,000');e.award(80000);assert.equal(e.lives,8,'120,000 and 160,000');e.lives=5;
  e.lives=1;e.die();assert.equal(e.state,'end')});
 test('after a lost life the enemies go back to where they started',()=>{const e=bare();tunnel(e,8,4,11,4);const a=put(e,'pooka',9,4);tunnel(e,1,9,4,9);put(e,'pooka',2,9);e.player={x:5,y:12,dir:{dx:1,dy:0},moving:false,crushed:null};step(e,secs(1));a.x=10;e.die();step(e,secs(C.deathPause)+2);assert.equal(a.x,9);assert.equal(e.player.x,C.startC)});
 test('the demo pilot scores, clears the first round and keeps a life, but plays like a human and not forever',()=>{const e=make(1982);for(let i=0;i<120*90&&e.state!=='end';i++)e.step(C.step,e.pilot());assert.ok(e.score>=4000,'score '+e.score);assert.ok(e.round>=2,'round '+e.round);assert.ok(e.state!=='end','game over');
  for(let i=0;i<120*510&&e.state!=='end';i++)e.step(C.step,e.pilot());assert.ok(e.state==='end','still going after ten minutes, score '+e.score)});
 return count}
g.DigDougTests={run};if(typeof module!=='undefined')module.exports=g.DigDougTests;
})(globalThis);
