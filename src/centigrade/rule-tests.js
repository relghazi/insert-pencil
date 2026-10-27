'use strict';
// Centigrade rule checks: one per 1981 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,CentipedeEngine:Engine,cx,cy}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const T=1/C.fastCells,bottom=C.rows-1,zoneTop=C.rows-C.zoneRows;
 const make=(seed=1981)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A quiet field: no mushrooms, no spider, flea or scorpion, and a single centipede placed by hand.
 const bare=(seed=1981)=>{const e=make(seed);for(const row of e.grid)row.fill(null);e.spiderTimer=e.scorpionTimer=e.fleaTimer=1e9;e.events=[];return e};
 const place=(e,c,r,dir,n=1,vdir=1)=>{const ch=e.chain(c,r,dir,n,vdir);e.chains=[ch];return ch};
 const ticks=(e,n)=>{for(let i=0;i<n;i++)for(const ch of e.chains)e.advance(ch)};
 const shootAt=(e,x,y)=>{e.shot={x,y:y+10};e.moveShot(0)};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),axisY:Math.cos(i/90),fire:i%40<20};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('a field of mushrooms, none in the bottom row, and one 12-segment centipede at the top',()=>{const e=make();assert.equal(e.grid.flat().filter(Boolean).length,C.mushrooms);assert.ok(e.grid[bottom].every(m=>!m),'bottom row clear');
  assert.equal(e.chains.length,1);assert.equal(e.chains[0].segs.length,12);assert.ok(e.chains[0].segs.every(s=>s.r<0),'enters from the top')});
 test('the centipede walks sideways, drops a row and turns at a mushroom or the edge',()=>{const e=bare();const ch=place(e,5,3,1);e.grid[3][8]={hp:4,poison:false};ticks(e,2);assert.equal(ch.segs[0].c,7);ticks(e,1);
  assert.equal(ch.segs[0].r,4,'dropped');assert.equal(ch.segs[0].dir,-1,'turned');const f=bare();const g2=place(f,C.cols-1,2,1);ticks(f,1);assert.equal(g2.segs[0].r,3);assert.equal(g2.segs[0].c,C.cols-1)});
 test('the body follows the head cell by cell',()=>{const e=bare();const ch=place(e,10,-1,1,5);ticks(e,12);const s=ch.segs;for(let i=1;i<s.length;i++)assert.equal(Math.abs(s[i].c-s[i-1].c)+Math.abs(s[i].r-s[i-1].r),1,'adjacent '+i)});
 test('at the bottom it turns back up and stays inside the player area',()=>{const e=bare();const ch=place(e,0,bottom-1,-1);let lo=99;for(let i=0;i<400;i++){ticks(e,1);if(i>5)lo=Math.min(lo,ch.segs[0].r)}assert.ok(e.reachedBottom);assert.ok(lo>=zoneTop,'row '+lo)});
 test('a poisoned mushroom sends the head straight down to the bottom',()=>{const e=bare();const ch=place(e,4,2,1);e.grid[2][5]={hp:4,poison:true};ticks(e,1);assert.ok(ch.diving);const c=ch.segs[0].c;
  while(ch.segs[0].r<bottom)ticks(e,1);assert.equal(ch.segs[0].c,c,'straight down')});
 test('a head scores 100 and a body segment 10, and leaves a mushroom where it was hit',()=>{const e=bare();const ch=place(e,10,5,1,3);ticks(e,3);ch.t=T*.99;const h=ch.segs[0],b=ch.segs[2],hc=[h.c,h.r],bc=[b.c,b.r];
  shootAt(e,cx(b.c),cy(b.r));assert.equal(e.score,10);assert.ok(e.grid[bc[1]][bc[0]],'mushroom');shootAt(e,cx(hc[0]),cy(hc[1]));assert.equal(e.score,110);assert.ok(e.grid[hc[1]][hc[0]],'mushroom')});
 test('a hit splits the centipede: the segment behind becomes a new head',()=>{const e=bare();const ch=place(e,10,5,1,6);ticks(e,6);ch.t=T*.99;const s=ch.segs[2];shootAt(e,cx(s.c),cy(s.r));
  assert.equal(e.chains.length,2);assert.equal(e.chains[0].segs.length,2);assert.equal(e.chains[1].segs.length,3)});
 test('a mushroom takes four hits and scores 1',()=>{const e=bare();e.chains=[];e.grid[8][6]={hp:4,poison:false};for(let i=0;i<3;i++){shootAt(e,cx(6),cy(8));assert.ok(e.grid[8][6])}shootAt(e,cx(6),cy(8));assert.equal(e.grid[8][6],null);assert.equal(e.score,1)});
 test('one shot on screen at a time; holding fire keeps firing',()=>{const e=bare();place(e,0,0,1);step(e,1,{fire:true});assert.equal(e.shots,1);step(e,3,{fire:true});assert.equal(e.shots,1,'one at a time');step(e,150,{fire:true});assert.ok(e.shots>=3,'auto fire '+e.shots)});
 test('the player moves only inside the bottom area and is blocked by mushrooms',()=>{const e=bare();place(e,0,0,1);step(e,600,{axisY:-1});assert.ok(e.player.y>=C.top+zoneTop*C.cell,'stays low');
  const f=bare();place(f,0,0,1);const c=Math.floor((f.player.x-C.left)/C.cell);f.grid[bottom][c+1]={hp:4,poison:false};step(f,120,{axis:1});assert.ok(f.player.x<cx(c+1)-C.cell/2,'blocked')});
 test('the spider scores 900, 600 or 300 the closer it is',()=>{const pts=[0,2.5,6].map(d=>{const e=bare();e.chains=[];e.spider={x:e.player.x+200,y:e.player.y-d*C.cell,vx:0,vy:0};shootAt(e,e.spider.x,e.spider.y);return e.score});assert.equal(pts.join(),'900,600,300')});
 test('from wave 2 a flea drops when fewer than 5 mushrooms are left below (9 from 20,000); two hits, 200 points',()=>{const e=bare();place(e,0,0,1);e.fleaTimer=0;step(e,2);assert.ok(!e.flea,'not with twelve segments');e.centin=11;step(e,2);assert.ok(e.flea,'drops');
  const f=e.flea;f.y=cy(6);shootAt(e,f.x,f.y);assert.ok(e.flea&&e.flea.vy>C.fleaSpeed,'speeds up');shootAt(e,f.x,f.y);assert.equal(e.flea,null);assert.equal(e.score,200);
  const k=bare();place(k,0,0,1);k.centin=11;for(let c=0;c<6;c++)k.grid[bottom][c]={hp:4,poison:false};k.fleaTimer=0;step(k,2);assert.ok(!k.flea,'six is enough');k.score=20000;step(k,2);assert.ok(k.flea,'not from 20,000')});
 test('the flea leaves mushrooms behind it',()=>{const e=bare();place(e,0,0,1);e.centin=11;e.fleaTimer=0;let n=0;for(let i=0;i<20;i++){step(e,300);n=e.grid.flat().filter(Boolean).length;if(n>=3)break;e.fleaTimer=0}assert.ok(n>=3,'mushrooms '+n)});
 test('from the ten-segment waves the scorpion poisons the mushrooms it crosses and scores 1,000; never with a flea',()=>{const n=bare();place(n,0,0,1);n.centin=11;n.scorpionTimer=0;n.rng.next=()=>0;step(n,2);assert.ok(!n.scorpion,'not with eleven');
  const e=bare();place(e,0,0,1);e.centin=10;for(let r=zoneTop;r<C.rows;r++)e.grid[r].fill({hp:4,poison:false});for(let i=0;i<200&&!e.scorpion;i++){e.scorpionTimer=0;step(e,1)}const s=e.scorpion;assert.ok(s);const c=Math.floor((s.x-C.left)/C.cell)+(s.vx>0?3:-3);e.grid[s.row][c]={hp:4,poison:false};
  step(e,180);assert.ok(e.grid[s.row][c].poison,'poisoned');if(e.scorpion){shootAt(e,e.scorpion.x,e.scorpion.y);assert.equal(e.score,1000)}});
 test('after a lost life damaged and poisoned mushrooms are restored for 5 points each',()=>{const e=bare();place(e,10,2,1,4);e.grid[4][4]={hp:2,poison:false};e.grid[6][9]={hp:4,poison:true};e.grid[7][9]={hp:4,poison:false};e.die();step(e,Math.ceil(C.deathPause/C.step)+2);
  assert.equal(e.score,10);assert.equal(e.grid[4][4].hp,4);assert.ok(!e.grid[6][9].poison);assert.equal(e.lives,2);assert.equal(e.chains[0].segs.length,4,'centipede back at the top')});
 test('an extra life every 12,000 points; three lost lives end the game',()=>{const e=bare();place(e,0,0,1);e.award(11990);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(12000);assert.equal(e.lives,5);e.award(12000);assert.equal(e.lives,6);e.award(12000);assert.equal(e.lives,6,'never more than six');
  e.lives=1;e.die();assert.equal(e.state,'end')});
 test('the cabinet\'s wave cycle: a fast 12, then 11 slow + 1 head, 11 fast + 1, 10 slow + 2 ...; only fast ones from 40,000',()=>{const e=bare();assert.ok(e.chains[0].fast,'wave 1 fast');const seen=[];
  for(let w=2;w<=5;w++){e.chains=[];step(e,2);step(e,Math.ceil(C.waveDelay/C.step)+2);assert.equal(e.wave,w);seen.push(e.chains.map(c=>c.segs.length+(c.fast?'f':'s')).join(' '))}
  assert.equal(seen.join(','),'11s 1f,11f 1f,10s 1f 1f,10f 1f 1f');e.score=40000;e.chains=[];step(e,2);step(e,Math.ceil(C.waveDelay/C.step)+2);assert.equal(e.chains[0].segs.length,9);assert.ok(e.chains.every(c=>c.fast),'fast from 40,000');
  const f=bare();for(let i=0;i<C.segments*2;i++){f.chains=[];f.state='play';step(f,2);step(f,Math.ceil(C.waveDelay/C.step)+2)}assert.ok(f.chains.length>=1)});
 test('slow is 7.5 cells a second, fast 15; the last segment alive speeds up',()=>{const e=bare();const ch=place(e,5,3,1,3);ch.fast=false;e.tick=0;step(e,120);assert.equal(ch.segs[0].c,5+7,'slow');const f=bare();const g2=place(f,5,3,1,1);g2.fast=false;step(f,120);assert.equal(g2.segs[0].c,5+15,'last one fast')});
 test('after a head reaches the bottom, heads come in from the sides: first after 3.2 s, then more often',()=>{const e=bare();const ch=place(e,0,bottom-1,1,2);e.chains.push(e.chain(29,2,-1,1));e.reachedBottom=true;e.events=[];const at=[];for(let i=0;i<120*12;i++){e.player.x=-999;e.step(C.step,{});for(const v of e.events)if(v.type==='head')at.push(+e.clock.toFixed(2));e.events=[];if(e.state!=='play')e.state='play'}
  assert.ok(Math.abs(at[0]-3.2)<.05,'first '+at[0]);assert.ok(at[2]-at[1]<at[1]-at[0],'sooner');assert.ok(at.every((t,i)=>!i||t-at[i-1]>=C.headMin-C.headStep-.01))});
 test('the spider is slow below 1,000 points and fast after; it keeps lower from 60,000',()=>{const e=bare();e.chains=[];e.spiderTimer=0;step(e,1);assert.equal(Math.abs(e.spider.vx),C.spiderSlow);const f=bare();f.chains=[];f.score=1000;f.spiderTimer=0;step(f,1);assert.equal(Math.abs(f.spider.vx),C.spiderFast);
  const top=f.spiderTop();f.score=100000;assert.ok(f.spiderTop()>top,'lower')});
 test('a trackball push moves up to three times the stick speed, never more',()=>{const e=bare();const p=e.player;p.x=500;e.movePlayer(.1,{axis:1});const one=p.x-500;p.x=500;e.movePlayer(.1,{axis:3});const three=p.x-500;p.x=500;e.movePlayer(.1,{axis:9});assert.ok(Math.abs(three-3*one)<1e-6&&Math.abs(p.x-500-three)<1e-6,one+' '+three)});
 test('the demo pilot scores',()=>{const e=make(3);for(let i=0;i<120*60;i++)e.step(C.step,e.pilot());assert.ok(e.score>=400,'score '+e.score)});
 return count}
g.CentigradeTests={run};if(typeof module!=='undefined')module.exports=g.CentigradeTests;
})(globalThis);
