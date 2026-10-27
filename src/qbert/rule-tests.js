'use strict';
// Q*Nerd rule checks: one per 1982 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,QbertEngine:Engine,spot}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1981)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 const secs=s=>Math.ceil(s/C.step)+2;
 // A quiet pyramid: no enemies ever spawn unless a check adds them by hand.
 const bare=(seed=1981)=>{const e=make(seed);e.spawnTimer=1e9;e.events=[];return e};
 const hop=(e,dir)=>{step(e,1,{dir});step(e,secs(C.hopTime))};
 const at=(e,r,c)=>{e.placeQ(r,c)};
 const quiet=e=>{for(const x of e.enemies){x.phase='wait';x.t=0;x.dur=1e9}};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<9000;i++){const inp=i%90<45?{dir:['dl','dr','ul','ur'][(i/90|0)%4]}:{};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('a pyramid of 28 cubes in seven rows; the player starts on the top cube',()=>{const e=make();assert.equal(e.cubes.length,7);assert.equal(e.cubes.flat().length,28);assert.equal(e.q.r,0);assert.equal(e.q.c,0);
  const a=Core.top(1,0),b=Core.top(1,1),t=Core.top(0,0);assert.equal(t.x-a.x,b.x-t.x,'isometric');assert.ok(a.y>t.y)});
 test('four diagonal hops; the arrow keys follow the turned stick (up = up-right, right = down-right)',()=>{const e=bare();assert.equal(e.direction({up:true}),'ur');assert.equal(e.direction({right:true}),'dr');assert.equal(e.direction({down:true}),'dl');assert.equal(e.direction({left:true}),'ul');
  assert.equal(e.direction({up:true,left:true}),'ul');assert.equal(e.direction({axis:.8,axisY:.8}),'dr');
  hop(e,'dr');assert.equal(e.q.r+','+e.q.c,'1,1');hop(e,'dl');assert.equal(e.q.r+','+e.q.c,'2,1');hop(e,'ul');assert.equal(e.q.r+','+e.q.c,'1,0');hop(e,'ur');assert.equal(e.q.r+','+e.q.c,'0,0')});
 test('each landing changes the cube top to the target colour for 25; a finished cube stays (level 1)',()=>{const e=bare();hop(e,'dl');assert.equal(e.cubes[1][0],1);assert.equal(e.score,25);hop(e,'ur');assert.equal(e.score,50);hop(e,'dl');assert.equal(e.score,50);assert.equal(e.cubes[1][0],1)});
 test('level 2 needs two hops per cube (15 to the middle colour, 25 to the target); level 3 toggles a finished cube back',()=>{const e=bare();e.level=2;hop(e,'dl');assert.equal(e.cubes[1][0],1);hop(e,'ur');hop(e,'dl');assert.equal(e.cubes[1][0],2,'target');assert.equal(e.score,15+15+25,'middle 15, target 25');hop(e,'ur');hop(e,'dl');assert.equal(e.cubes[1][0],2,'stays');
  const f=bare();f.level=3;hop(f,'dl');assert.equal(f.cubes[1][0],1);hop(f,'ur');hop(f,'dl');assert.equal(f.cubes[1][0],0,'toggled back');const h=bare();h.level=4;h.cubes[1][0]=2;hop(h,'dl');assert.equal(h.cubes[1][0],1,'back to middle')});
 test('jumping off the pyramid loses a life and starts again on the top cube',()=>{const e=bare();e.discs=[];at(e,3,3);hop(e,'ur');assert.equal(e.q.state,'fall');step(e,secs(C.fallTime));assert.equal(e.lives,2);assert.equal(e.state,'dead');step(e,secs(C.deathPause));assert.equal(e.q.r+','+e.q.c,'0,0');assert.equal(e.state,'play')});
 test('red balls drop on the second row, bounce down and off the bottom; touching one costs a life',()=>{const e=bare();e.q.r=e.q.c=0;e.placeQ(6,6);const b=e.add('red',1,0);let rows=[];for(let i=0;i<1200&&e.enemies.length;i++){step(e,1);if(b.phase==='wait')rows.push(b.r)}
  assert.ok(rows[0]===1&&rows.every((r,i)=>!i||r>=rows[i-1]),'down only '+rows);assert.equal(e.enemies.length,0,'gone off the bottom');
  const f=bare();at(f,3,1);const r=f.add('red',3,1);r.phase='wait';r.dur=1e9;step(f,1);assert.equal(f.state,'dead');assert.equal(f.lives,2)});
 test('the purple ball hatches into Coily at the bottom and Coily chases the player',()=>{const e=bare();at(e,0,0);const p=e.add('purple',5,2);p.phase='wait';p.t=0;p.dur=0;step(e,secs(C.enemyHop));assert.equal(p.r,6);step(e,secs(C.hatchTime));assert.equal(p.kind,'coily');
  const d0=Core.hops(p,e.q);step(e,secs(C.enemyHop+C.coilyRest[0])*2);assert.ok(Core.hops(p,e.q)<d0,'closer '+Core.hops(p,e.q)+' < '+d0)});
 test('a disc carries the player to the top; Coily follows him off the edge for 500 and the pyramid clears',()=>{const e=bare();e.discs=[{side:'L',r:2,c:-1}];at(e,3,0);const k=e.add('coily',5,0);k.kind='coily';k.phase='wait';k.t=0;k.dur=.05;const ball=e.add('red',6,6);ball.phase='wait';ball.dur=1e9;
  hop(e,'ul');assert.equal(e.q.state,'disc');let lured=false;for(let i=0;i<secs(C.discTime+C.dropTime);i++){step(e,1);if(e.events.some(x=>x.type==='coily'))lured=true}
  assert.equal(e.q.r+','+e.q.c,'0,0');assert.equal(e.q.state,'stand');assert.equal(e.discs.length,0,'disc used');step(e,secs(2));lured=lured||e.events.some(x=>x.type==='coily');assert.ok(lured,'lured');assert.ok(!e.enemies.includes(ball),'the fall clears the pyramid');assert.equal(e.score%1000,525)});
 test('Slick and Sam turn cubes back to the start colour and are worth 300 when caught',()=>{const e=bare();e.cubes[2][0]=1;const s=e.add('slick',1,0);s.phase='wait';s.t=0;s.dur=0;e.rng={next:()=>.1};at(e,6,6);step(e,secs(C.enemyHop));assert.equal(s.r+','+s.c,'2,0');assert.equal(e.cubes[2][0],0,'turned back');
  const f=bare();at(f,4,2);const m=f.add('sam',4,2);m.phase='wait';m.dur=1e9;step(f,1);assert.equal(f.score,300);assert.equal(f.enemies.length,0);assert.equal(f.lives,3)});
 test('the green ball is worth 100 and freezes everything else',()=>{const e=bare();at(e,4,2);const r=e.add('red',1,0);quiet(e);r.dur=.01;const gb=e.add('green',4,2);gb.phase='wait';gb.dur=1e9;step(e,1);assert.equal(e.score,100);assert.ok(e.freeze>0);
  const before=r.r+','+r.c;step(e,secs(C.freezeTime-.5));assert.equal(r.r+','+r.c,before,'frozen');step(e,secs(1.5));assert.ok(r.r+','+r.c!==before,'moves again')});
 test('Ugg and Wrongway come in from the bottom corners and walk sideways along the cube sides',()=>{const e=bare();at(e,0,0);const u=e.add('ugg'),w=e.add('wrong');assert.equal(u.c,7);assert.equal(w.c,0);const seen=[];
  for(let i=0;i<1200;i++){step(e,1);for(const x of [u,w])if(x.phase==='wait'){const r=x.r-1,c=x.kind==='ugg'?x.c-1:x.c;seen.push(Core.onPyramid(r,c))}}assert.ok(seen.length>4&&seen.every(Boolean),'on a side');
  const f=bare();at(f,5,2);const k=f.add('wrong');k.r=5;k.c=2;k.phase='wait';k.dur=1e9;step(f,1);assert.equal(f.state,'dead')});
 test('a finished round pays 1,000 rising by 250 a round, plus 50 for every unused disc',()=>{const e=bare();e.discs=e.discs.slice(0,2);for(const row of e.cubes)row.fill(1);e.cubes[1][0]=0;hop(e,'dl');assert.equal(e.score,25+1000+100);assert.equal(e.state,'cleared');
  step(e,secs(C.clearPause));assert.equal(e.round,2);assert.equal(e.cubes.flat().join(''),'0'.repeat(28));const s=e.score;e.spawnTimer=1e9;for(const row of e.cubes)row.fill(1);e.cubes[1][0]=0;e.discs=[];hop(e,'dl');assert.equal(e.score-s,25+1250)});
 test('four rounds make a level; level 2 brings the two-hop rule',()=>{const e=bare();e.round=4;e.state='cleared';e.timer=0;step(e,1);assert.equal(e.level,2);assert.equal(e.round,1);assert.equal(e.target(),2);assert.equal(e.mode(),'two')});
 test('an extra life at 8,000 and then every 14,000; the game ends when the lives run out',()=>{const e=bare();e.award(7990);assert.equal(e.lives,3);e.award(10);assert.equal(e.lives,4);e.award(13990);assert.equal(e.lives,4);e.award(10);assert.equal(e.lives,5);
  e.lives=1;e.die('hit');assert.equal(e.state,'end')});
 test('touching an enemy clears the pyramid of enemies; the player keeps his cube',()=>{const e=bare();at(e,3,1);e.add('red',1,0);const k=e.add('coily',3,1);k.phase='wait';k.dur=1e9;step(e,1);assert.equal(e.state,'dead');step(e,secs(C.deathPause));assert.equal(e.enemies.length,0);assert.equal(e.q.r+','+e.q.c,'3,1')});
 test('level 5 and up: two hops to the target colour, a third turns the cube back to the start colour',()=>{const e=bare();e.level=5;hop(e,'dl');assert.equal(e.cubes[1][0],1);hop(e,'ur');hop(e,'dl');assert.equal(e.cubes[1][0],2,'target');hop(e,'ur');hop(e,'dl');assert.equal(e.cubes[1][0],0,'back to start');assert.equal(e.score,15+15+25+25,'no points for turning back');
  const f=bare();f.level=9;assert.equal(f.mode(),'cycle');f.level=14;assert.equal(f.mode(),'cycle')});
 test('discs by the cabinet round table: 2 on level 1, 3, 3, 2, 2 on level 2, 7 on level 5 round 1, 5 from level 6',()=>{const n=(level,round)=>{const e=bare();e.level=level;e.round=round;e.newRound();return e.discs.length};
  assert.equal([[1,1],[1,4],[2,1],[2,3],[3,1],[4,1],[4,4],[5,1],[6,2],[9,4],[12,1]].map(([l,r])=>n(l,r)).join(),'2,2,3,2,4,6,4,7,5,5,5')});
 test('each round brings only its own enemies: level 1 rounds 1 and 2 red balls and Coily, round 3 no red balls',()=>{const kinds=(level,round)=>{const e=make(11);e.level=level;e.round=round;e.newRound();e.q.state='stand';const seen=new Set();
   for(let i=0;i<400;i++){e.spawnTimer=0;e.spawn(C.step);for(const x of e.enemies)seen.add(x.kind);if(e.enemies.length>1)e.enemies=e.enemies.filter(x=>x.kind==='purple'||x.kind==='coily')}return seen};
  const a=kinds(1,1);assert.ok(a.has('red')&&a.has('purple'),'red and purple');assert.ok(!['green','slick','sam','ugg','wrong'].some(k=>a.has(k)),'nothing else');
  const b=kinds(1,3);assert.ok(!b.has('red'),'no red balls');assert.ok(b.has('purple')&&b.has('green')&&(b.has('ugg')||b.has('wrong'))&&(b.has('slick')||b.has('sam')),'the rest '+[...b]);
  const c=kinds(5,2);assert.ok(['red','green','ugg','slick'].every(k=>c.has(k)||c.has({ugg:'wrong',slick:'sam'}[k])),'all on level 5')});
 test('the demo pilot scores',()=>{const e=make(3);for(let i=0;i<120*60;i++)e.step(C.step,e.pilot());assert.ok(e.score>=600,'score '+e.score)});
 return count}
g.QnerdTests={run};if(typeof module!=='undefined')module.exports=g.QnerdTests;
})(globalThis);
