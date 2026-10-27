'use strict';
// Dunce Kong rule checks: one per 1981 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,KongEngine:Engine,px,py,D,yAt}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1981)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)},secs=s=>Math.ceil(s/C.step);
 // A screen in play with nothing moving: no throws, no spawns.
 const quiet=(screen=25,level=1,seed=1981)=>{const e=make(seed);e.level=level;if(!e.order.includes(screen))e.level=3;e.index=e.order.indexOf(screen);e.startScreen();e.state='play';e.hazards=[];e.throwTimer=e.spawnTimer=e.pieTimer=e.springTimer=1e9;e.events=[];return e};
 const put=(e,x,i)=>{const p=e.player,q=e.base[i];p.x=px(x);p.y=yAt(q,p.x);p.plat=e.platAt(p.x,p.y);p.state='walk'};
 const barrel=(e,x,i,extra={})=>{const q=e.base[i],b={id:e.nextId++,kind:'barrel',blue:false,x:px(x),y:yAt(q,px(x)),vx:0,vy:0,plat:e.platAt(px(x),yAt(q,px(x))),ladder:null,state:'roll',decided:new Set(e.ladders),...extra};e.hazards.push(b);return b};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<9000;i++){const inp={axis:Math.sin(i/70),axisY:Math.cos(i/90),jump:i%90<5};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('the screens come in the cabinet order and the level loops back to 25m',()=>{const e=make();const seen=[];for(let i=0;i<20;i++){seen.push(e.level+':'+e.screen);e.state='play';e.clear();step(e,secs(C.clearPause)+2)}
  assert.equal(seen.slice(0,10).join(),'1:25,1:100,2:25,2:75,2:100,3:25,3:50,3:75,3:100,4:25');assert.equal(seen.slice(14,20).join(),'5:25,5:50,5:25,5:75,5:25,5:100')});
 test('the bonus starts at 5000 (then 6000, 7000, 8000), counts down by 100 (faster each level) and is paid out at the top',()=>{assert.equal([1,2,3,4,6].map(l=>quiet(25,l).bonus).join(),'5000,6000,7000,8000,8000');assert.equal([1,2,3,4,6].map(l=>Math.round(quiet(25,l).bonusEvery()*60)).join(),'120,100,80,60,60','ticks every 120, 100, 80, 60 frames');
  const e=quiet(100);step(e,secs(e.bonusEvery()*3)+1);assert.equal(e.bonus,4700);e.state='play';e.clear();assert.equal(e.score,4700);
  const g=quiet(25);step(g,secs(10));assert.equal(g.bonus,5000,'25m does not run on the clock');g.throwTimer=0;step(g,secs(1.4));assert.equal(g.thrown,1);assert.equal(g.bonus,4900,'100 a barrel');put(g,110,8);step(g,1);assert.equal(g.state,'cleared');assert.equal(g.score,4900)});
 test('when the bonus runs out the player dies',()=>{const e=quiet(100);e.bonus=100;e.bonusTimer=.01;step(e,3);assert.equal(e.state,'dead');assert.equal(e.lives,2);
  const f=quiet(25);f.bonus=100;f.throwTimer=0;step(f,secs(1));assert.equal(f.state,'dead','last barrel')});
 test('the internal difficulty is the level plus one every 2,048 frames on the screen, at most 5, and starts again each screen',()=>{const e=quiet(25,1);assert.equal(e.difficulty(),1);e.screenTime=2048/60+.01;assert.equal(e.difficulty(),2);e.screenTime=500;assert.equal(e.difficulty(),5);
  assert.equal(quiet(25,4).difficulty(),4);e.startScreen();assert.equal(e.difficulty(),1);assert.equal(C.fireRate.map(r=>r*8).join(),'4,5,6,6,7')});
 test('Kong throws a barrel about every 1.6 seconds (72 frames of throwing, then the next frame he may take one); every 8th is blue, one in 16 wild',()=>{const e=make(5);step(e,secs(C.readyTime)+1);e.player.state='walk';put(e,40,0);e.die=()=>{};const t0=e.clock;step(e,secs(30));const n=e.thrown;assert.ok(n>=17&&n<=21,'about one in 1.6 s: '+n);
  const blue=[];const f=quiet(25,1);f.throwTimer=0;for(let i=0;i<17;i++){f.throwTimer=0;f.screenTime=1/60;f.throwBarrel();blue.push(f.hazards[f.hazards.length-1].blue)}assert.equal(blue.map(b=>b?1:0).join(''),'10000000100000001')});
 test('barrels roll down the girder, drop at its end and roll back the other way',()=>{const e=quiet();put(e,200,1);const b=barrel(e,196,7);step(e,secs(.6));assert.ok(b.state==='fall'||b.plat!==e.base[7],'dropped');step(e,secs(1));assert.equal(b.plat,e.base[5]);assert.ok(b.vx<0,'rolls left')});
 test('Kong\'s first barrel is blue and drops into the oil drum, letting out a fireball',()=>{const e=make();step(e,secs(C.readyTime)+2);put(e,200,1);step(e,secs(5));assert.ok(e.thrown>=1);assert.ok(e.hazards.some(h=>h.kind==='fire'),'fireball');assert.ok(e.events.some(v=>v.type==='fireball'))});
 test('barrels take a ladder down always before the oil is lit, never above the player, else by difficulty and the stick toward it',()=>{const e=quiet(25,1);put(e,200,1);const l=e.ladders.find(l=>Math.abs(l.top-yAt(e.base[6],l.x))<2);
  assert.ok(e.takeLadder({},l),'oil not lit');e.oilLit=true;put(e,40,7);let n=0;for(let i=0;i<200;i++)if(e.takeLadder({},l))n++;assert.equal(n,0,'player above');
  put(e,200,1);const rate=(lv,ax)=>{const f=quiet(25,lv);f.oilLit=true;put(f,200,1);f.input={axis:ax};let k=0;for(let i=0;i<4000;i++)if(f.takeLadder({},l))k++;return k/4000};
  const r1=rate(1,0),r5=rate(5,0),s1=rate(1,-1);assert.ok(Math.abs(r1-1/16)<.02,'1/4 x 1/4: '+r1);assert.ok(Math.abs(r5-3/16)<.03,'3/4 x 1/4: '+r5);assert.ok(Math.abs(s1-1/4)<.03,'stick toward it: '+s1)});
 test('a jump over one barrel scores 100, two 300, three or more 500 (the cabinet adds 500 for three)',()=>{const e=quiet();put(e,60,0);barrel(e,95,0);let jumped=false;for(let i=0;i<secs(2);i++){const b=e.hazards[0],now=!jumped&&!!b&&b.x-e.player.x<D(17);e.step(C.step,{jump:now});if(now)jumped=true}
  assert.equal(e.state,'play','survived');assert.equal(e.score,100);
  for(const [n,pts] of [[2,300],[3,500],[4,500]]){const f=quiet();put(f,60,0);f.step(C.step,{jump:true});f.player.over=new Set([...Array(n).keys()]);step(f,secs(1));assert.equal(f.score,pts,n+' at once')}});
 test('a fall longer than a short drop is fatal; a jump is not',()=>{const e=quiet();put(e,200,2);step(e,secs(.2),{right:true});step(e,secs(1.5));assert.equal(e.state,'dead');const f=quiet();put(f,60,0);f.step(C.step,{jump:true});step(f,secs(1));assert.equal(f.state,'play');assert.equal(f.player.state,'walk')});
 test('full ladders can be climbed, broken ones cannot',()=>{const e=quiet();put(e,184,1);step(e,secs(3),{up:true});assert.ok(e.player.y<py(220),'climbed');const f=quiet();put(f,80,0);step(f,secs(3),{up:true});assert.equal(f.player.plat,f.base[0],'broken')});
 test('the hammer is grabbed by jumping, smashes a barrel for 300 and anything else for 300, 500 or 800, and runs out',()=>{const e=quiet();put(e,152,2);step(e,10);assert.ok(e.player.hammer<=0,'not by walking');e.step(C.step,{jump:true});step(e,secs(.4));assert.ok(e.player.hammer>0,'grabbed');step(e,secs(1));
  barrel(e,162,2);e.player.dir=1;step(e,1);assert.equal(e.score,300);const pts=new Set();for(let i=0;i<30;i++){e.score=0;e.hazards.push({id:e.nextId++,kind:'fire',x:e.player.x+D(6),y:e.player.y,plat:e.player.plat,dir:1,state:'walk',turn:9});step(e,1);pts.add(e.score)}
  assert.equal([...pts].sort().join(),'300,500,800');assert.equal(Math.round(C.hammerTime*60),512,'two 256-frame halves');const y=e.player.y;e.step(C.step,{jump:true});assert.equal(e.player.state,'walk','no jumping');step(e,secs(C.hammerTime));assert.ok(e.player.hammer<=0,'ran out')});
 test('the hat, umbrella and purse score 300, 500 or 800 by level',()=>{const pts=[1,2,3,5].map(l=>{const e=quiet(100,l);put(e,180,1);step(e,secs(.5),{right:true});return e.score});assert.equal(pts.join(),'300,500,800,800')});
 test('crossing a rivet pulls it for 100 and leaves a gap; all eight end the round',()=>{const e=quiet(100);put(e,40,1);step(e,secs(.6),{right:true});assert.equal(e.score,100);assert.equal(e.rivets.filter(r=>r.alive).length,7);assert.ok(!e.platAt(px(56),py(208)),'gap');
  for(const r of e.rivets)r.alive=false;e.rivets[7].alive=true;e.rebuild();put(e,160,4);step(e,secs(.5),{right:true});assert.equal(e.state,'cleared');assert.ok(e.events.some(v=>v.type==='rivetsDone'))});
 test('50m: belts carry the player and the pies; side ladders slide out of reach',()=>{const e=quiet(50);put(e,100,1);const x=e.player.x;step(e,secs(1));assert.ok(Math.abs(e.player.x-x)>D(15),'carried');e.pieTimer=0;step(e,2);assert.ok(e.hazards.some(h=>h.kind==='pie'));
  const l=e.ladders.find(l=>l.retract);const open=[0,1,2,3,4,5].map(t=>{e.clock=t;return e.ladderOpen(l)});assert.ok(open.includes(true)&&open.includes(false))});
 test('50m: firefoxes come out of the burning drum, never more than the difficulty',()=>{const e=quiet(50,3);e.spawnTimer=0;step(e,2);assert.equal(e.hazards.filter(h=>h.kind==='fire').length,1);
  for(let i=0;i<10;i++){e.spawnTimer=0;step(e,1)}assert.equal(e.hazards.filter(h=>h.kind==='fire').length,3)});
 test('75m: the elevators carry the player; riding the up elevator to the top is fatal; springs bounce and drop',()=>{const e=quiet(75);const l=e.lifts.find(l=>l.lift==='A');const p=e.player;p.plat=l;p.x=(l.x1+l.x2)/2;p.y=l.y1;const y=p.y;step(e,secs(1));assert.ok(p.y<y-D(20),'lifted');step(e,secs(5));assert.equal(e.state,'dead');assert.ok(e.events.some(v=>v.cause==='crushed'));
  const f=quiet(75);f.springTimer=0;step(f,secs(2));assert.ok(f.hazards.some(h=>h.kind==='spring'&&h.state==='drop'),'drops')});
 test('reaching the lady ends 25m, 50m and 75m',()=>{for(const s of [25,50,75]){const e=quiet(s,3);const goal=e.base.findIndex(q=>q.goal);put(e,110,goal);step(e,1);assert.equal(e.state,'cleared',s+'m')}});
 test('three lives, one extra life at 7,000; losing the last ends the game',()=>{const e=quiet();e.award(6990);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(7000);assert.equal(e.lives,4);e.lives=1;e.die('test');assert.equal(e.state,'end')});
 test('the demo pilot scores, finishes level 1 and keeps a life',()=>{const e=make(2);for(let i=0;i<120*150&&e.state!=='end';i++)e.step(C.step,e.pilot());assert.ok(e.score>=8000,'score '+e.score);assert.ok(e.level>=2,'level '+e.level);assert.ok(e.state!=='end','game over')});
 return count}
g.KongTests={run};if(typeof module!=='undefined')module.exports=g.KongTests;
})(globalThis);
