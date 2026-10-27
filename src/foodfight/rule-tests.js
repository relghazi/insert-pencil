'use strict';
// Mystery Meat Time rule checks: one per 1983 Food Fight cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,FoodFightEngine:Engine}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1981)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A quiet floor: no piles, holes far away and shut, every chef waiting a long time, him in the middle.
 const bare=(seed=1981)=>{const e=make(seed);e.piles=[];e.holes.forEach((h,i)=>{h.x=C.left+10+i*30;h.y=C.top+10;h.open=0});for(const c of e.chefs){c.state='wait';c.timer=1e9}e.player.x=400;e.player.y=400;e.events=[];return e};
 const chefAt=(e,i,x,y)=>{const c=e.chefs[i];Object.assign(c,{state:'walk',x,y,hole:null,carry:null,cool:1e9,timer:0});return c};
 const freeze=c=>{c.state='rise';c.timer=1e9};
 const pts=e=>e.events.filter(v=>v.type==='hit').map(v=>v.points);
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),axisY:Math.cos(i/90),fire:i%40<20};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('level 1: three manholes, Angelo and Zorba, food piles with one endless watermelon pile, the cone on the right; Oscar joins on 2, Jacques on 3',()=>{const e=make();assert.equal(e.holes.length,3);assert.equal(e.chefs.map(c=>c.name).join(),'angelo,zorba');
  assert.ok(e.piles.length>=6&&e.piles.some(p=>p.kind==='melon'&&p.count===Infinity),'piles');assert.ok(e.cone.x>e.player.x+700,'cone right');
  e.newLevel();assert.equal(e.chefs.map(c=>c.name).join(),'angelo,zorba,oscar');assert.equal(e.holes.length,4);e.newLevel();assert.equal(e.chefs.length,4);for(let i=0;i<12;i++)e.newLevel();assert.equal(e.holes.length,10,'up to ten');assert.ok(e.piles.length<=8)});
 test('walking over a pile picks up one piece; the watermelon pile never runs out',()=>{const e=bare();e.piles=[{x:430,y:400,kind:'pie',count:5}];step(e,30,{right:true});assert.equal(e.held.kind,'pie');assert.equal(e.piles[0].count,4);
  const f=bare();f.piles=[{x:430,y:400,kind:'melon',count:Infinity}];step(f,30,{right:true});assert.equal(f.held.kind,'melon');assert.equal(f.piles[0].count,Infinity)});
 test('food flies the way the stick points, in eight directions',()=>{const e=bare();e.held={kind:'pie',n:1};step(e,1,{axis:-.7,axisY:.75,fire:true});const f=e.food[0];assert.ok(f.vx<0&&f.vy>0&&Math.abs(Math.abs(f.vx)-Math.abs(f.vy))<1,'diagonal');
  const g2=bare();g2.held={kind:'tomato',n:1};step(g2,1,{axis:.3,axisY:-1,fire:true});assert.ok(Math.abs(g2.food[0].vx)<1&&g2.food[0].vy<0,'straight up')});
 test('a handful of peas fires five fast shots while fire is held, spreading out and falling short; other food off a pile needs a new press',()=>{const e=bare();e.held={kind:'peas',n:5};step(e,60,{right:true,fire:true});assert.equal(e.throws,5);assert.equal(e.held,null);
  const ys=e.food.map(f=>Math.round(f.vy));assert.ok(Math.min(...ys)<0&&Math.max(...ys)>0,'spread '+ys);assert.ok(C.foods.peas.range<C.foods.pie.range/2,'short');
  const f=bare();f.held={kind:'pie',n:1};step(f,60,{right:true,fire:true});assert.equal(f.throws,1,'one per press')});
 test('standing on a pile with fire held throws piece after piece until the pile is gone',()=>{const e=bare();e.piles=[{x:400,y:400,kind:'tomato',count:5}];step(e,2);step(e,240,{fire:true});assert.equal(e.throws,4,'the pile thrown');assert.equal(e.piles[0].count,0);assert.equal(e.held.kind,'tomato','the last piece kept in hand');
  const f=bare();f.piles=[{x:400,y:400,kind:'melon',count:Infinity}];step(f,2);step(f,120,{fire:true});assert.ok(f.throws>=6,'watermelons all day: '+f.throws)});
 test('a watermelon is heavy: slow, short, and knocks down every chef in its path',()=>{const e=bare();e.held={kind:'melon',n:1};const a=chefAt(e,0,560,400),b=chefAt(e,1,640,400);freeze(a);freeze(b);step(e,1,{right:true,fire:true});
  assert.ok(Math.hypot(e.food[0].vx,e.food[0].vy)<C.foods.pie.speed,'slow');step(e,240);assert.equal(pts(e).join(),'100,200','both chefs');assert.ok(e.food.length===0,'short range');
  const f=bare();f.held={kind:'melon',n:1};step(f,1,{right:true,fire:true});step(f,90);assert.ok(f.food.length===0||f.food[0].x<400+C.foods.melon.range+30)});
 test('chefs hit with food score 100, 200, 300 and on up to 1,000; the count starts over with a new life',()=>{const e=bare();const out=[];for(let i=0;i<12;i++){const c=chefAt(e,0,600,400);freeze(c);e.held={kind:'pie',n:1};e.fireWas=false;step(e,1,{right:true,fire:true});step(e,60)}
  assert.equal(pts(e).join(),'100,200,300,400,500,600,700,800,900,1000,1000,1000');e.die('chef');step(e,Math.ceil(C.deathPause/C.step)+2);for(const c of e.chefs){c.state='wait';c.timer=1e9}e.player.x=400;e.player.y=400;e.events=[];
  const c=chefAt(e,0,600,400);freeze(c);e.held={kind:'pie',n:1};e.fireWas=false;step(e,1,{right:true,fire:true});step(e,60);assert.equal(pts(e).join(),'100')});
 test('a chef lured into an open manhole scores 200 and drops out',()=>{const e=bare();const h=e.holes[0];h.x=520;h.y=400;h.open=5;const c=chefAt(e,0,600,400);e.player.x=300;step(e,120);
  const m=e.events.find(v=>v.type==='manhole');assert.ok(m,'fell in');assert.equal(e.score,200);assert.equal(c.state,'wait')});
 test('a knocked-out chef comes back up out of a manhole, opening it',()=>{const e=bare();const c=chefAt(e,0,600,400);e.knockOut(c);step(e,Math.ceil(C.chefReturn/C.step)+2);assert.equal(c.state,'rise');assert.ok(e.holes.some(h=>h.x===c.x&&h.y===c.y&&h.open>0),'from an open hole')});
 test('a chef never comes up from the manhole he is standing on',()=>{for(let k=0;k<20;k++){const e=bare(100+k);e.holes[0].x=400;e.holes[0].y=400;const c=chefAt(e,0,600,400);e.emerge(c);assert.ok(Math.hypot(c.x-400,c.y-400)>C.holeR*2,'seed '+(100+k))}});
 test('touching a chef or being hit by food loses a life',()=>{const e=bare();chefAt(e,0,420,400);step(e,2);assert.equal(e.lives,2);assert.equal(e.events.find(v=>v.type==='death').cause,'chef');
  const f=bare();f.food.push({x:300,y:400,vx:500,vy:0,kind:'tomato',owner:'chef',left:900,hit:[]});step(f,60);assert.equal(f.lives,2);assert.equal(f.events.find(v=>v.type==='death').cause,'food')});
 test('stepping into an open manhole loses a life; a shut one is safe',()=>{const e=bare();const h=e.holes[0];h.x=460;h.y=400;step(e,60,{right:true});assert.equal(e.lives,3,'shut');
  const f=bare();const k=f.holes[0];k.x=460;k.y=400;k.open=9;step(f,60,{right:true});assert.equal(f.lives,2);assert.equal(f.events.find(v=>v.type==='death').cause,'hole')});
 test('the cone melts in 32 seconds and costs a life',()=>{const e=bare();step(e,Math.round((C.meltTime-.5)/C.step));assert.equal(e.lives,3);step(e,120);assert.equal(e.lives,2);assert.equal(e.events.find(v=>v.type==='death').cause,'melt')});
 test('the cone scores 500 times the level up to 25,000, plus 100 for each piece of food left (not watermelons), and food in hand carries over',()=>{const e=bare();e.piles=[{x:200,y:200,kind:'pie',count:3},{x:200,y:300,kind:'peas',count:2},{x:200,y:600,kind:'melon',count:Infinity}];
  e.held={kind:'tomato',n:1};e.player.x=e.cone.x-60;e.player.y=e.cone.y;step(e,60,{right:true});const ev=e.events.find(v=>v.type==='cone');assert.equal(ev.points,500);assert.equal(ev.bonus,500);assert.equal(e.score,1000);
  step(e,Math.ceil(C.levelDelay/C.step)+2);assert.equal(e.level,2);assert.equal(e.held.kind,'tomato');e.level=60;e.player.x=e.cone.x;e.player.y=e.cone.y;e.events=[];e.piles=[];step(e,1);assert.equal(e.events.find(v=>v.type==='cone').points,25000)});
 test('from level 2 chefs pick up food and throw it at him when he is lined up; on level 1 they never carry food',()=>{const l=bare();l.piles=[{x:700,y:400,kind:'pie',count:5}];const k=chefAt(l,0,720,400);k.cool=0;l.player.x=360;step(l,20);assert.equal(l.piles[0].count,5,'level 1 leaves the food');assert.ok(!l.events.some(v=>v.type==='throw'),'no throw on level 1');
  const e=bare();e.level=2;e.piles=[{x:700,y:400,kind:'pie',count:5}];const c=chefAt(e,0,720,400);c.cool=0;e.player.x=360;step(e,20);
  assert.ok(e.events.some(v=>v.type==='throw'&&v.owner==='chef'),'threw');assert.ok(e.piles[0].count<5,'took food');assert.ok(e.food.some(f=>f.owner==='chef'&&f.vx<0&&Math.abs(f.vy)<1),'at him')});
 test('three lives; extra life at 25,000, then 100,000, 200,000 and every 100,000 (operator manual)',()=>{const e=bare();assert.equal(e.lives,3);e.award(24990);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(74980);assert.equal(e.lives,4);e.award(10);assert.equal(e.lives,5,'at 100,000, not 125,000');e.award(99990);assert.equal(e.lives,5);e.award(10);assert.equal(e.lives,6,'at 200,000');
  e.lives=1;e.die('chef');assert.equal(e.state,'end')});
 test('the demo pilot scores',()=>{const e=make(3);for(let i=0;i<120*90;i++)e.step(C.step,e.pilot());assert.ok(e.score>=500,'score '+e.score)});
 return count}
g.FoodFightTests={run};if(typeof module!=='undefined')module.exports=g.FoodFightTests;
})(globalThis);
