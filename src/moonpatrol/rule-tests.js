'use strict';
// Hall Patrol rule checks: one per 1982 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,PatrolEngine:Engine}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1982)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // A quiet hallway: nothing on the floor, no UFOs coming and no more floor laid out.
 const bare=(seed=1982)=>{const e=make(seed);e.objects=[];e.built=99;e.ufoTimer=1e9;e.events=[];return e};
 const ahead=(e,kind,gap)=>{const [w]=C.sizes[kind];return e.add(kind,e.bx()+C.bodyHalf+gap+w/2)};
 const fireOnce=e=>{e.step(C.step,{fire:true});e.step(C.step,{})};
 const ufo=(e,type,group=1)=>{const f={type,group,sx:e.bsx-6,y:300,tx:e.bsx-6,ty:2000,life:99,bomb:99};e.ufos.push(f);return f};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),jump:i%150<3,fire:i%30<10};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('three buggies start at checkpoint A on a floor laid out ahead; a restart meets the same layout',()=>{const e=make();assert.equal(e.lives,3);assert.equal(e.letter(),'A');assert.ok(e.objects.length>3,'obstacles');
  const lay=JSON.stringify(e.objects.map(o=>[o.kind,o.x]));e.die();step(e,Math.ceil(C.deathPause/C.step)+2);assert.equal(JSON.stringify(e.objects.map(o=>[o.kind,o.x])),lay)});
 test('the stick speeds up and slows down, cruising when let go; faster sits further right',()=>{const e=bare(),x0=e.bsx;step(e,360,{axis:1});assert.equal(e.v,C.vMax);assert.ok(e.bsx>x0+100,'moves right');
  step(e,480,{axis:-1});assert.equal(e.v,C.vMin);assert.ok(e.bsx<x0,'drops back');step(e,480);assert.equal(e.v,C.vCruise)});
 test('the jump button hops the buggy for about a second, with no jump in the air',()=>{const e=bare();step(e,1,{jump:true});assert.ok(e.h>0);let n=1,top=0;while(e.h>0){step(e,1,{jump:true});top=Math.max(top,e.h);if(++n===30)assert.ok(e.vh<C.jumpSpeed-200,'no second jump')}
  assert.ok(Math.abs(n*C.step-2*C.jumpSpeed/C.gravity)<.05,'air time '+n*C.step);assert.ok(top>100,'height '+top)});
 test('driving into a crater loses the buggy; jumping a small one scores 50, a large one 100',()=>{const e=bare();ahead(e,'craterSmall',40);step(e,240);assert.equal(e.lives,2);assert.equal(e.events.find(x=>x.type==='death').cause,'crater');
  const f=bare();ahead(f,'craterSmall',0);f.objects[0].x=f.bx()+C.wheels[2]+20+C.sizes.craterSmall[0]/2;step(f,1,{jump:true});step(f,240);assert.equal(f.lives,3);assert.equal(f.score,50);
  const b=bare();b.v=C.vMax;b.objects=[];b.add('craterBig',b.bx()+C.wheels[2]+30+C.sizes.craterBig[0]/2);step(b,1,{jump:true,axis:1});step(b,240,{axis:1});assert.equal(b.lives,3);assert.equal(b.score,100)});
 test('fire shoots forward and straight up at once; one short forward shot at a time, three up',()=>{const e=bare();fireOnce(e);assert.equal(e.shots,1);assert.equal(e.ups,1);assert.ok(e.shot&&e.upShots.length===1);
  fireOnce(e);fireOnce(e);fireOnce(e);assert.equal(e.shots,1,'one forward');assert.equal(e.upShots.length,3,'three up');step(e,120);assert.equal(e.shot,null,'short range');
  const from=e.bx();fireOnce(e);let far=0;while(e.shot){far=e.shot.x-e.shot.from;step(e,1)}assert.ok(far<=C.shotRange+20&&from>0,'range '+far)});
 test('a small rock goes in one shot for 100; a big rock pays 100 a shot, 200 shot through, its half left behind',()=>{const e=bare();ahead(e,'rockSmall',150);fireOnce(e);step(e,30);assert.equal(e.objects.length,0);assert.equal(e.score,100);
  const b=bare();ahead(b,'rockBig',150);fireOnce(b);step(b,30);assert.equal(b.objects[0].kind,'rockSmall');assert.equal(b.score,100);fireOnce(b);step(b,30);assert.equal(b.objects.length,0);assert.equal(b.score,200)});
 test('a big rock jumped whole is 100; shot once and its half jumped, 180',()=>{const e=bare();e.v=C.vMax;ahead(e,'rockBig',60);step(e,1,{jump:true,axis:1});step(e,200,{axis:1});assert.equal(e.lives,3);assert.equal(e.score,100);
  const f=bare();ahead(f,'rockBig',150);fireOnce(f);step(f,30);assert.equal(f.score,100);f.v=C.vMax;f.objects[0].x=f.bx()+C.bodyHalf+40+C.sizes.rockSmall[0]/2;step(f,1,{jump:true,axis:1});step(f,200,{axis:1});assert.equal(f.lives,3);assert.equal(f.score,180)});
 test('rocks can be jumped for 50; running into one loses the buggy',()=>{const e=bare();e.v=C.vMax;ahead(e,'rockSmall',30);step(e,1,{jump:true,axis:1});step(e,200,{axis:1});assert.equal(e.lives,3);assert.equal(e.score,50);
  const f=bare();ahead(f,'rockBig',30);step(f,120);assert.equal(f.lives,2)});
 test('UFOs: saucer 100, crater bomber 200, tri-orb 200, and 500 more for a whole formation of three',()=>{const pts=['saucer','bomber','orb'].map(t=>{const e=bare();e.groups={1:{shot:0}};ufo(e,t);fireOnce(e);step(e,60);return e.score});assert.equal(pts.join(),'100,200,200');
  const e=bare();e.groups={1:{shot:0}};for(let i=0;i<3;i++){ufo(e,'saucer');fireOnce(e);step(e,60);e.shot=null}assert.equal(e.score,800);assert.ok(e.events.some(x=>x.type==='formation'))});
 test('a mine can only be jumped: the shot passes over it, jumping scores 50, driving on it loses the buggy',()=>{const e=bare();ahead(e,'mine',100);fireOnce(e);step(e,30);assert.equal(e.objects.length,1,'not shot');
  const f=bare();ahead(f,'mine',20);step(f,1,{jump:true});step(f,200);assert.equal(f.score,50);assert.equal(f.lives,3);step(e,200);assert.equal(e.lives,2)});
 test('UFO bombs blast the floor; only the tri-orbs blow new craters into it, and a bomb on the buggy loses it',()=>{const t=bare();for(const [type,y] of [['orb',200],['bomber',300],['saucer',150]]){const u=ufo(t,type);u.y=y;u.ty=y;u.tx=u.sx=t.bsx+t.v*(C.groundY-y)/C.bombSpeed;u.bomb=0}
  t.moveUfos(C.step);assert.equal(t.bombs.length,3,'all three bomb');assert.equal(t.bombs.filter(b=>b.crater).length,1);assert.ok(t.bombs.find(b=>b.crater).y<230,'the tri-orb bomb');const e=bare();e.bombs.push({x:e.bx()+500,y:C.groundY-1,crater:true},{x:e.bx()+800,y:C.groundY-1,crater:false});step(e,2);
  assert.equal(e.objects.length,1);assert.equal(e.objects[0].kind,'craterSmall');assert.ok(Math.abs(e.objects[0].x-(e.bx()+500))<10);
  const f=bare();f.bombs.push({x:f.bx(),y:C.groundY-120,crater:false});step(f,60);assert.equal(f.lives,2)});
 test('tanks fire shells along the floor; a tank shot is 200, jumped 100',()=>{const e=bare();ahead(e,'tank',600);step(e,Math.ceil(C.tankEvery*.6/C.step));assert.ok(e.shells.length>=1,'fires');
  const t=e.objects[0];fireOnce(e);step(e,10);e.shells=[];e.shot=null;t.x=e.bx()+120;fireOnce(e);step(e,30);assert.equal(e.objects.length,0);assert.equal(e.score,200);
  const f=bare();const u=ahead(f,'tank',40);f.h=200;u.x=f.bx()-C.bodyHalf-u.w;step(f,1);assert.equal(f.score,100)});
 test('boulders roll toward the buggy; shot 50, jumped 100',()=>{const e=bare();const o=ahead(e,'ball',600),x0=o.x;step(e,60);assert.ok(o.x<x0-30,'rolls');o.x=e.bx()+150;fireOnce(e);step(e,30);assert.equal(e.score,50);
  const f=bare();const u=ahead(f,'ball',40);f.h=200;u.x=f.bx()-C.bodyHalf-u.w;step(f,1);assert.equal(f.score,100)});
 test('extra buggies at 10,000, 30,000 and 50,000 only',()=>{const e=bare();e.award(9990);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(20000);assert.equal(e.lives,5);e.award(20000);assert.equal(e.lives,6);e.award(50000);assert.equal(e.lives,6)});
 test('a lost buggy restarts at the last checkpoint passed; three lost end the game',()=>{const e=bare();e.d=e.marker(3)+500;step(e,3);assert.equal(e.letter(),'D');e.die();step(e,Math.ceil(C.deathPause/C.step)+2);
  assert.ok(Math.abs(e.bx()-e.marker(3)-40)<5,'back at D');e.lives=1;e.die();assert.equal(e.state,'end')});
 test('E, J, O, T and Z end a section: 1,000 plus 100 a second under the average time on the beginner course',()=>{const e=bare();e.d=e.marker(1)-e.bsx+5;step(e,1);assert.equal(e.letter(),'B');assert.equal(e.score,0);
  e.cp=3;e.secTime=50;e.d=e.marker(4)-e.bsx+5;step(e,1);assert.equal(e.letter(),'E');assert.equal(e.score,1500);assert.equal(e.state,'section');
  const f=bare();f.cp=8;f.secTime=60;f.d=f.marker(9)-f.bsx+5;step(f,1);assert.equal(f.score,1000,'J over par')});
 test('Z ends the beginner course for 5,000 more; the champion course pays 2,000 plus 100 a second under 70',()=>{const e=bare();e.cp=24;e.secTime=60;e.d=e.marker(25)-e.bsx+5;step(e,1);assert.equal(e.score,1000+500+5000);assert.equal(e.course,2);assert.equal(e.letter(),'A');
  step(e,Math.ceil(C.sectionPause/C.step)+2);e.objects=[];e.built=99;e.cp=3;e.secTime=60;e.d=e.marker(4)-e.bsx+5;step(e,1);assert.equal(e.score,6500+2000+1000)});
 test('enemies join by checkpoint as on the cabinet: pits, rocks, saucers and bombers from A, tri-orbs from D, deep pits and double rocks from F, mines from J, boulders from P, tanks from U',()=>{
  const kindsIn=(a,b)=>{const e=make(),k=new Set();for(let i=a;i<b;i++)e.layout(i);e.objects.forEach(o=>k.add(o.kind));return k};
  const ae=kindsIn(0,5),fi=kindsIn(5,9),jo=kindsIn(9,15),pt=kindsIn(15,20),uz=kindsIn(20,25);
  assert.ok(['craterBig','rockBig','mine','ball','tank'].every(k=>!ae.has(k))&&ae.has('craterSmall')&&ae.has('rockSmall'),'A-E');
  assert.ok(fi.has('craterBig')&&fi.has('rockBig')&&!fi.has('mine')&&!fi.has('ball')&&!fi.has('tank'),'F-I');
  assert.ok(jo.has('mine')&&!jo.has('ball')&&!jo.has('tank'),'J-O');assert.ok(pt.has('ball')&&!pt.has('tank'),'P-T');assert.ok(uz.has('tank'),'U-Z');
  const a=bare();a.ufoTimer=0;step(a,2);assert.ok(a.ufos.length===3,'a formation at A');
  const seen=cp=>{const s=new Set();const b=bare();b.cp=cp;for(let i=0;i<60;i++){b.ufos=[];b.formation();s.add(b.ufos[0].type)}return s};
  assert.ok(seen(0).has('saucer')&&seen(0).has('bomber')&&!seen(0).has('orb')&&seen(3).has('orb'),'tri-orbs from D')});
 test('the demo pilot scores',()=>{const e=make(3);for(let i=0;i<120*90;i++)e.step(C.step,e.pilot());assert.ok(e.score>=1000,'score '+e.score)});
 return count}
g.HallPatrolTests={run};if(typeof module!=='undefined')module.exports=g.HallPatrolTests;
})(globalThis);
