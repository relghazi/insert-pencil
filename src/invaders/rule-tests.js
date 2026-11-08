'use strict';
// Space Substitutes rule checks: one per 1978 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,InvadersEngine:Engine}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)},near:(a,b,eps,m)=>{if(Math.abs(a-b)>eps)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1978)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 const calm=e=>{e.fireDelay=1e9;e.ufoTimer=1e9;e.marchClock=-1e9;e.events=[];return e};
 const only=(e,keep)=>{for(const v of e.invaders)v.alive=keep(v);return e};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),fire:i%50<3};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('five rows of eleven: the top row is worth 30, the next two 20, the bottom two 10',()=>{const e=make();assert.equal(e.invaders.length,55);assert.equal([0,1,2,3,4].map(r=>e.invaders.find(v=>v.row===r).points).join(),'30,20,20,10,10')});
 test('the formation steps sideways, then drops a row and turns at the edge',()=>{const e=calm(make());const x0=e.invaders[0].x,y0=e.invaders[0].y;e.march();assert.equal(e.invaders[0].x,x0+C.stepX);assert.equal(e.invaders[0].y,y0);
  let n=0;while(e.dir>0&&n<500){e.march();n++}assert.equal(e.invaders[0].y,y0+C.dropY,'dropped once');assert.equal(e.dir,-1)});
 test('the march speeds up as invaders fall: one step per invader still standing',()=>{const e=calm(make());assert.near(e.stepInterval(),55*C.stepTick,1e-9);only(e,v=>v.row===0);assert.near(e.stepInterval(),11*C.stepTick,1e-9);only(e,v=>v.row===0&&v.col===0);assert.near(e.stepInterval(),C.stepTick,1e-9)});
 test('one player shot on screen at a time, one per press',()=>{const e=calm(make());step(e,1,{fire:true});assert.ok(e.shot);const y=e.shot.y;step(e,5,{fire:true});assert.ok(e.shot.y<y,'same shot');step(e,1,{});step(e,1,{fire:true});assert.equal(e.shots,1,'no second shot while one flies')});
 test('a shot destroys the invader it hits and scores its points',()=>{const e=calm(make());only(e,v=>v.row===0&&v.col===5);for(const s of e.shields)s.cells.fill(false);const v=e.invaders.find(x=>x.alive);e.player.x=v.x+C.invW/2;step(e,1,{fire:true});step(e,120);assert.equal(e.score,30);assert.ok(!v.alive)});
 test('at most three invader shots at once',()=>{const e=make();e.ufoTimer=1e9;for(let i=0;i<10;i++)e.dropBomb();assert.equal(e.bombs.length,C.bombMax)});
 test('shields erode where shots hit them',()=>{const e=calm(make());only(e,()=>false);e.invaders[0].alive=true;e.invaders[0].x=-500;const s=e.shields[1],before=s.cells.filter(Boolean).length;e.player.x=s.x+C.shieldW/2;step(e,1,{fire:true});step(e,60);assert.ok(s.cells.filter(Boolean).length<before,'eroded');assert.equal(e.shot,null)});
 test('the mystery ship follows the cabinet shot-count table: the 23rd shot scores 300',()=>{const e=calm(make());only(e,()=>false);e.invaders[0].alive=true;e.invaders[0].x=-500;for(const s of e.shields)s.cells.fill(false);e.shots=22;e.ufo={x:e.player.x,dir:0};step(e,1,{fire:true});step(e,120);assert.equal(e.shots,23);assert.equal(e.score,300)});
 test('an extra life at 1,500 points, once',()=>{const e=make();e.award(1490);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(5000);assert.equal(e.lives,4)});
 test('a chalk hit costs a life; the third ends the game',()=>{const e=calm(make());for(let i=0;i<3;i++){e.state='play';e.bombs=[{x:e.player.x,y:C.playerY-40,kind:1}];step(e,30)}assert.equal(e.lives,0);assert.equal(e.state,'end')});
 test('invaders reaching the player row end the game',()=>{const e=calm(make());for(const v of e.invaders)v.y+=C.playerY-C.startY-C.rows*C.cellH;let n=0;while(e.state==='play'&&n<5000){e.march();n++}assert.equal(e.state,'end');assert.ok(e.events.some(v=>v.type==='gameover'&&v.landed))});
 test('a cleared wave brings the next one, starting lower',()=>{const e=calm(make());const y1=e.invaders[0].y;only(e,()=>false);step(e,2);assert.equal(e.state,'cleared');step(e,Math.ceil(C.waveDelay/C.step)+2);assert.equal(e.wave,2);assert.equal(e.alive().length,55);assert.ok(e.invaders[0].y>y1)});
 test('each new wave brings fresh shields',()=>{const e=calm(make());const full=e.shields[0].cells.filter(Boolean).length;for(const s of e.shields)s.cells.fill(false,0,40);only(e,()=>false);step(e,2);step(e,Math.ceil(C.waveDelay/C.step)+2);assert.equal(e.wave,2);for(const s of e.shields)assert.equal(s.cells.filter(Boolean).length,full)});
 test('waves 2 to 9 start 3, 5, 6, 6, 6, 7, 7, 7 drops lower, the 10th starts over; the rack lands 11 drops down',()=>{const e=calm(make()),y=[];for(let w=1;w<=10;w++){y.push(Math.round((e.invaders[0].y-C.startY)/C.dropY));only(e,()=>false);e.newWave();calm(e)}
  assert.equal(y.join(),'0,3,5,6,6,6,7,7,7,3');const f=calm(make());only(f,v=>v.row===4&&v.col===0);f.dir=-1;f.invaders[44].x=C.rackEdge;for(let i=0;i<10;i++){f.march();f.dir=-1}assert.equal(f.state,'play','10 drops: still marching');f.march();assert.equal(f.state,'end','11 drops: landed')});
 test('invader shots take turns and wait for the reload rate: one at a time under 300 points, more as the score climbs',()=>{const e=make();e.fireDelay=0;e.ufoTimer=1e9;e.marchClock=-1e9;let most=0;for(let i=0;i<120*20;i++){e.step(C.step,{});most=Math.max(most,e.bombs.length);if(e.state!=='play'){e.state='play';e.lives=3}}assert.equal(most,1,'under 300');
  const f=make();f.fireDelay=0;f.ufoTimer=1e9;f.marchClock=-1e9;f.score=3200;most=0;for(let i=0;i<120*20;i++){f.step(C.step,{});most=Math.max(most,f.bombs.length);if(f.state!=='play'){f.state='play';f.lives=3}}assert.ok(most>=2,'above 3,100: '+most);assert.equal(f.reloadRate(),7)});
 test('the plunger and squiggly shots fall from the cabinet column tables; the rolling shot from above the player',()=>{const e=calm(make());e.dropBomb(1);e.dropBomb(2);const cols=e.bombs.map(b=>Math.round((b.x-C.invW/2-(C.width-C.cols*C.cellW)/2-(C.cellW-C.invW)/2)/C.cellW)+1);assert.equal(cols.join(),C.plungerCols[0]+','+C.squigglyCols[0]);
  const f=calm(make());f.player.x=f.invaders[7].x+C.invW/2;f.dropBomb(0);assert.near(f.bombs[0].x,f.player.x,1e-9)});
 test('invader shots fall faster with eight or fewer invaders left',()=>{const e=calm(make());e.bombs=[{x:5,y:100,kind:1,age:1}];step(e,120);const slow=e.bombs[0].y-100;only(e,v=>v.row===0&&v.col<8);e.bombs=[{x:5,y:100,kind:1,age:1}];step(e,120);assert.near(slow,C.bombSpeed,1e-6);assert.near(e.bombs[0].y-100,C.bombFast,1e-6)});
 test('the demo pilot shoots down invaders',()=>{const e=make(3);for(let i=0;i<120*60;i++)e.step(C.step,e.pilot());assert.ok(e.score>=200,'score '+e.score)});
 test('hard mode (a seed with the top bit set) starts on the fourth rack, six drops lower, with two lives; a normal seed is unchanged',()=>{const h=new Engine(0x80000000+1978),n=make(1978);
  assert.equal(h.hard,true);assert.equal(h.wave,4);assert.equal(h.lives,2);assert.equal(h.alive().length,55);assert.equal(h.invaders[0].y-C.startY,6*C.dropY);
  assert.ok(n.hard!==true,'normal');assert.equal(n.wave,1);assert.equal(n.lives,3);assert.equal(n.invaders[0].y,C.startY)});
 test('hard mode replays: the same hard seed and inputs give identical runs',()=>{const a=new Engine(0x80000000+7),b=new Engine(0x80000000+7);for(let i=0;i<120*60;i++){a.step(C.step,a.pilot());b.step(C.step,b.pilot())}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.equal(a.snapshot().hard,true)});
 // Swap sticker, book shield: a seed from 0x40000000 to 0x7FFFFFFF with bit 29 clear.
 const bookSeed=0x40000000,nextWave=e=>{only(e,()=>false);step(e,2);step(e,Math.ceil(C.waveDelay/C.step)+2)};
 const loseLife=e=>{e.bombs=[{x:e.player.x,y:C.playerY-40,kind:1,age:1}];step(e,30);assert.equal(e.state,'dead','life lost');step(e,Math.ceil(C.deathPause/C.step)+2);assert.equal(e.state,'play','play resumed')};
 test('book shield seed: when play resumes after a lost life the most damaged shield is rebuilt to full, the others keep their damage',()=>{const e=calm(make(bookSeed+5));assert.equal(e.sticker,'shield');assert.equal(e.snapshot().sticker,'shield');
  const full=e.shields[0].cells.filter(Boolean).length;e.player.x=40;e.shields[0].cells.fill(false,0,30);e.shields[1].cells.fill(false,0,90);e.shields[2].cells.fill(false,0,10);const kept=e.shields.map(s=>s.cells.slice()),lives=e.lives;
  loseLife(e);assert.equal(e.lives,lives-1);assert.equal(e.shields[1].cells.filter(Boolean).length,full,'most damaged rebuilt');for(const i of [0,2,3])assert.equal(e.shields[i].cells.join(),kept[i].join(),'shield '+i+' untouched');
  const ev=e.events.filter(v=>v.type==='shield');assert.equal(ev.length,1,'one shield event');assert.equal(ev[0].index,1);assert.equal(ev[0].restored,full-kept[1].filter(Boolean).length,'cells restored');assert.equal(ev[0].x,e.shields[1].x+C.shieldW/2);
  // Ties go to the leftmost.
  for(const s of e.shields)s.cells=e.shieldCells(s.n,s.m);e.shields[3].cells.fill(false,0,20);e.shields[2].cells.fill(false,0,20);e.events=[];loseLife(e);assert.equal(e.events.find(v=>v.type==='shield').index,2,'leftmost on a tie');assert.equal(e.shields[3].cells.filter(Boolean).length,full-20,'right one keeps its damage')});
 test('book shield seed: a new wave still rebuilds every shield as classic does, with no shield event',()=>{const e=calm(make(bookSeed+5));const full=e.shields[0].cells.filter(Boolean).length;e.shields[0].cells.fill(false,0,30);e.shields[1].cells.fill(false,0,90);e.events=[];nextWave(e);assert.equal(e.wave,2);
  for(const s of e.shields)assert.equal(s.cells.filter(Boolean).length,full);assert.ok(!e.events.some(v=>v.type==='shield'))});
 test('classic and hard seeds never use the book shield: a lost life rebuilds nothing, no shield event, no sticker in the snapshot',()=>{for(const seed of [1,1978,0x3fffffff,0x80000000+7,0xffffffff]){const e=calm(make(seed));assert.equal(e.sticker,null,'seed '+seed);assert.equal('sticker' in e.snapshot(),false);
   e.player.x=40;e.shields[1].cells.fill(false,0,90);const kept=e.shields.map(s=>s.cells.join());loseLife(e);assert.equal(e.shields.map(s=>s.cells.join()).join('|'),kept.join('|'),'shields untouched');assert.ok(!e.events.some(v=>v.type==='shield'))}
  assert.equal(make(0x5fffffff).sticker,'shield');assert.equal(make(0x60000000).sticker,null,'slot 1 is not used yet')});
 test('a book shield seed replays exactly',()=>{const a=make(bookSeed+7),b=make(bookSeed+7);for(let i=0;i<120*90;i++){a.step(C.step,a.pilot());b.step(C.step,b.pilot())}assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()));assert.equal(a.snapshot().sticker,'shield')});
 return count}
g.SpaceSubstitutesTests={run};if(typeof module!=='undefined')module.exports=g.SpaceSubstitutesTests;
})(globalThis);
