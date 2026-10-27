'use strict';
// Froggology rule checks: one per 1981 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,FroggerEngine:Engine,rowY,bayX}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1981)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A quiet page: no fly, crocodile or lady frog unless a check asks for one.
 const bare=(seed=1981)=>{const e=make(seed);e.flyTimer=e.crocTimer=e.ladyTimer=1e9;e.events=[];return e};
 const hop=(e,d)=>{e.step(C.step,{[d]:true});step(e,Math.ceil(C.hopTime/C.step)+1)};
 // Put the frog on a lane item, or clear a road lane, by hand.
 const onItem=(e,row,i=0,frac=.5)=>{const o=e.lanes[row].items[i];o.x=200;e.frog.row=row;e.frog.x=C.left+o.x+o.len*C.cell*frac;e.bestRow=Math.min(e.bestRow,row);return o};
 const clearRoad=e=>{for(let r=7;r<=11;r++)for(const o of e.lanes[r].items)o.x=-C.maxLen*C.cell};
 const atTop=(e,i)=>{e.frog.row=1;e.frog.x=bayX(i);e.bestRow=1;const o=e.lanes[1].items[0];o.x=e.frog.x-C.left-o.len*C.cell/2;o.kind='log'};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp=a.pilot();a.step(C.step,inp);b.step(C.step,b.pilot());c.step(C.step,c.pilot())}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('three frogs, the frog at the bottom middle, five empty bays, five road and five river lanes',()=>{const e=make();assert.equal(e.lives,C.frogs);assert.equal(e.frog.row,12);assert.equal(e.frog.x,C.left+7.5*C.cell);
  assert.equal(e.homes.length,5);assert.ok(e.homes.every(h=>!h));assert.equal(Object.values(e.lanes).filter(l=>l.row>=7).length,5);assert.equal(Object.values(e.lanes).filter(l=>l.row<=5).length,5)});
 test('10 points for each forward step onto a new furthest row, none for going back over old ground',()=>{const e=bare();clearRoad(e);hop(e,'up');assert.equal(e.score,10);hop(e,'up');assert.equal(e.score,20);hop(e,'down');hop(e,'up');assert.equal(e.score,20,'old row');hop(e,'up');assert.equal(e.score,30)});
 test('traffic on the road squashes the frog',()=>{const e=bare();clearRoad(e);e.frog.row=9;const o=e.lanes[9].items[0];o.x=e.frog.x-C.left-C.cell/2;step(e,1);assert.equal(e.lives,C.frogs-1);assert.equal(e.events.find(v=>v.type==='death').cause,'road')});
 test('the frog rides a log, and drowns in open water',()=>{const e=bare();const o=onItem(e,3,0,.5),x0=e.frog.x;step(e,60);assert.equal(e.lives,C.frogs);assert.ok(Math.abs(e.frog.x-x0-e.lanes[3].v*.5)<1,'rides');
  const f=bare();f.frog.row=4;f.frog.x=C.left+1;for(const o of f.lanes[4].items)o.x=300;step(f,1);assert.equal(f.lives,C.frogs-1);assert.equal(f.events.find(v=>v.type==='death').cause,'water')});
 test('a log carrying the frog off the side of the page kills it',()=>{const e=bare();const o=e.lanes[3].items[0];o.x=C.cols*C.cell-C.cell;e.frog.row=3;e.frog.x=C.left+C.cols*C.cell-4;step(e,30);assert.equal(e.lives,C.frogs-1);assert.equal(e.events.find(v=>v.type==='death').cause,'edge')});
 test('diving turtles are safe while up and drown the frog once they go under',()=>{const e=bare();const lane=e.lanes[5],o=lane.items.find(o=>o.dive);assert.ok(o,'a diving group');assert.ok(lane.items.some(o=>!o.dive),'and steady ones');
  o.x=600;e.frog.row=5;e.frog.x=C.left+o.x+C.cell*1.5;e.diveClock=-o.phase;step(e,60);assert.equal(e.lives,C.frogs,'up');let n=0;while(e.lives===C.frogs&&n++<C.dive.period*120)e.step(C.step,{});assert.equal(e.diveState(o),'under');assert.equal(e.events.find(v=>v.type==='death').cause,'water')});
 test('a frog home scores 50 plus 10 for every remaining half second',()=>{const e=bare();atTop(e,2);e.time=12.3;hop(e,'up');assert.equal(e.homes[2],true);assert.equal(e.score,50+10*Math.floor((12.3-(Math.ceil(C.hopTime/C.step)+2)*C.step)/.5));assert.equal(e.frog.row,12,'next frog');assert.equal(e.time,C.time,'fresh timer')});
 test('the hedge between bays and an already filled bay kill the frog',()=>{const e=bare();atTop(e,1);e.frog.x+=C.cell*1.5;hop(e,'up');assert.equal(e.lives,C.frogs-1);assert.equal(e.homes.filter(Boolean).length,0);
  const f=bare();f.homes[3]=true;atTop(f,3);hop(f,'up');assert.equal(f.lives,C.frogs-1)});
 test('the fly in a bay is worth 200 more',()=>{const e=bare();e.fly={bay:0,t:3};atTop(e,0);e.time=0.2;hop(e,'up');assert.equal(e.score,250);assert.equal(e.fly,null)});
 test('bringing the lady frog home is worth 200 more; she is lost if the frog dies',()=>{const e=bare();const o=onItem(e,4,0,.5);e.lady={item:o,off:o.len*C.cell*.5,vdir:0};step(e,1);assert.ok(e.frog.lady,'picked up');
  atTop(e,4);e.time=0.2;hop(e,'up');assert.equal(e.events.find(v=>v.type==='home').lady,true);assert.equal(e.events.find(v=>v.type==='home').points,250);
  const f=bare();f.frog.lady=true;f.die('road');step(f,Math.ceil(C.deathPause/C.step)+2);assert.equal(f.frog.lady,false)});
 test('a crocodile peeking in a bay is still safe; once its whole head is up the bay kills',()=>{const e=bare();e.croc={bay:2,t:0};atTop(e,2);hop(e,'up');assert.equal(e.homes[2],true,'peeking');
  const f=bare();f.croc={bay:2,t:C.croc.peek+.1};atTop(f,2);hop(f,'up');assert.equal(f.lives,C.frogs-1);assert.equal(f.homes[2],false)});
 test('each frog has its own timer; running out of time costs the frog',()=>{const e=bare();clearRoad(e);e.time=.5;step(e,61);assert.equal(e.lives,C.frogs-1);assert.equal(e.events.find(v=>v.type==='death').cause,'time');step(e,Math.ceil(C.deathPause/C.step)+2);assert.equal(e.time>C.time-1,true)});
 test('filling all five bays scores 1,000 and starts a faster level',()=>{const e=bare();const v1=Math.abs(e.lanes[8].v);e.homes=[true,true,true,true,false];atTop(e,4);e.time=0.2;hop(e,'up');assert.equal(e.score,50+1000);assert.equal(e.state,'cleared');
  step(e,Math.ceil(C.clearPause/C.step)+2);assert.equal(e.level,2);assert.ok(e.homes.every(h=>!h));assert.ok(Math.abs(e.lanes[8].v)>v1,'faster')});
 test('from level 2 a crocodile swims with the logs: its back carries the frog, its head bites',()=>{const e=bare();assert.ok(!e.lanes[1].items.some(o=>o.kind==='croc'));e.level=1;e.newLevel();e.flyTimer=e.crocTimer=e.ladyTimer=1e9;const i=e.lanes[1].items.findIndex(o=>o.kind==='croc');assert.ok(i>=0);
  onItem(e,1,i,.2);step(e,30);assert.equal(e.lives,C.frogs,'back');const f=bare();f.level=1;f.newLevel();f.flyTimer=f.crocTimer=f.ladyTimer=1e9;onItem(f,1,i,.95);step(f,1);assert.equal(f.lives,C.frogs-1);assert.equal(f.events.find(v=>v.type==='death').cause,'croc')});
 test('the ROM\'s five board tiers: the river thins out and the road fills up from board to board; board six is board one again',()=>{const {TIERS,LANES}=Core;const e=bare(),count=()=>LANES.map(([row])=>e.lanes[row].items.length).join();
  const seen=[];for(let l=1;l<=6;l++){seen.push(count());e.newLevel()}for(let t=0;t<5;t++)assert.equal(seen[t],TIERS[t].join(),'tier '+(t+1));assert.equal(seen[5],seen[0],'wraps');
  assert.equal(TIERS[4][2],1,'one long log');assert.equal(TIERS[4][6],4,'four race cars');
  const f=bare();for(let l=1;l<5;l++)f.newLevel();assert.ok(f.lanes[1].items.some(o=>o.kind==='croc'),'the lone top log is a crocodile');assert.ok(f.lanes[5].items.some(o=>o.dive),'a turtle group still dives')});
 test('one extra frog at 20,000 and no more; losing the last frog ends the game',()=>{const e=bare();e.award(19990);assert.equal(e.lives,C.frogs);e.award(10);assert.equal(e.lives,C.frogs+1);e.award(20000);assert.equal(e.lives,C.frogs+1);e.lives=1;e.die('road');assert.equal(e.state,'end');assert.ok(e.events.some(v=>v.type==='gameover'))});
 test('the demo pilot scores, fills all five jars and keeps a frog, but plays like a human and not forever',()=>{const e=make(3);for(let i=0;i<120*90&&e.state!=='end';i++)e.step(C.step,e.pilot());assert.ok(e.score>=4000,'score '+e.score);assert.ok(e.level>=2,'level '+e.level);assert.ok(e.state!=='end','game over');
  for(let i=0;i<120*510&&e.state!=='end';i++)e.step(C.step,e.pilot());assert.ok(e.state==='end','still going after ten minutes, score '+e.score)});
 return count}
g.FroggologyTests={run};if(typeof module!=='undefined')module.exports=g.FroggologyTests;
})(globalThis);
