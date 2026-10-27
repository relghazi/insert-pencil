'use strict';
// Robotron: Class of 2084 rule checks: one per 1982 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,RobotronEngine:Engine,waveMix,waveSpeeds}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1982)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 // An empty arena in play: the robots and humans asked for are placed by hand.
 const bare=(seed=1982)=>{const e=make(seed);e.robots=[];e.humans=[];e.state='play';e.events=[];return e};
 // A Grunt asleep in a corner keeps the wave from ending while a check runs.
 const hold=e=>add(e,'grunt',C.right-20,C.bottom-20,{wait:1e9});
 const add=(e,kind,x,y,extra={})=>{const o=e.prep(e.make(kind,x,y,extra));e.robots.push(o);return o};
 const human=(e,who,x,y)=>{const h=e.make('human',x,y,{who,turn:99});e.humans.push(h);return h};
 const shoot=(e,o,dx=1,dy=0)=>{e.shots=[{x:o.x-dx*6,y:o.y-dy*6,dx,dy}];e.moveShots(0.001)};
 const P=()=>({x:(C.left+C.right)/2,y:(C.top+C.bottom)/2});
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={axis:Math.sin(i/70),axisY:Math.cos(i/90),aimX:Math.cos(i/50),aimY:Math.sin(i/40)};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('wave 1: the player in the middle, 15 Grunts, 5 Electrodes, a Mommy and a Daddy, nothing close',()=>{const e=make(),n=e.snapshot().robots,p=P();assert.equal(n.grunt,15);assert.equal(n.electrode,5);
  assert.equal(e.humans.map(h=>h.who).sort().join(),'daddy,mommy');assert.equal(e.player.x,p.x);assert.ok(e.robots.every(o=>Math.hypot(o.x-p.x,o.y-p.y)>=C.safe),'safe ring')});
 test('twin sticks: moving and firing are separate, each in eight directions, and holding fire keeps firing every 8 frames, 4 shots at most',()=>{const e=bare();hold(e);const p=e.player,x=p.x;
  step(e,60,{left:true,fireUp:true});assert.ok(p.x<x,'moves left');assert.ok(e.shotsFired>=4,'auto fire '+e.shotsFired);assert.ok(e.shots.every(s=>s.dx===0&&s.dy===-1),'fires up while moving left');
  const f=bare();hold(f);step(f,40,{fireRight:true});assert.ok(f.shots.length<=C.maxShots&&f.shots.length>=3,'four at most '+f.shots.length);
  e.shots=[];step(e,17,{aimX:.9,aimY:.4});const s=e.shots.at(-1);assert.ok(Math.abs(s.dx-Math.SQRT1_2)<1e-6&&Math.abs(s.dy-Math.SQRT1_2)<1e-6,'stick snaps to a diagonal')});
 test('Grunts home in on the player in 4 pixel steps every 1 to ROBSPD ticks, and score 100',()=>{const e=bare(),p=e.player,o=add(e,'grunt',p.x+300,p.y-200);o.wait=0;const d0=Math.hypot(o.x-p.x,o.y-p.y);step(e,600);assert.ok(Math.hypot(o.x-p.x,o.y-p.y)<d0-40,'closer');
  const f=bare(),q=add(f,'grunt',C.right-30,C.bottom-30);for(let i=0;i<200;i++){q.x=C.right-30;q.y=C.bottom-30;q.wait=0;step(f,1);assert.ok(q.wait>0&&q.wait<=f.robSpd*C.gruntTick*C.frame+1e-9,'wait '+q.wait)}
  e.state='play';o.x=p.x+300;o.y=p.y;shoot(e,o);assert.equal(e.score,100);assert.equal(e.count(),0)});
 test('the Grunts speed up through the wave as on the cabinet: every 3.75 s, twice as fast while not scoring, and with every Grunt shot',()=>{const e=make();assert.equal(e.robSpd,20);assert.equal(e.robMax,9);e.state='play';e.player.x=C.left+20;e.player.y=C.top+20;
  e.ramp=1e-9;e.scored=true;e.rampGrunts(C.step);assert.equal(e.robMax,8);assert.equal(e.robSpd,18);e.ramp=1e-9;e.rampGrunts(C.step);assert.equal(e.robMax,6,'stalling');assert.equal(e.robSpd,14);
  for(let i=0;i<20;i++){e.ramp=1e-9;e.rampGrunts(C.step)}assert.equal(e.robMax,1);assert.equal(e.robSpd,1);
  const f=make();f.state='play';f.robSpd=16;const g=f.robots.find(o=>o.kind==='grunt');shoot(f,g);assert.equal(f.robSpd,14,'an eighth faster');
  const h=make();h.ramp=1e-9;h.robots.push(...Array.from({length:20},()=>h.prep(h.make('grunt',900,700))));h.rampGrunts(C.step);assert.equal(h.robSpd,20,'not with 30 or more')});
 test('the cabinet wave table: 60, 70, 75 and 80 Grunt waves, 20 to 25 Hulk waves, and waves 21 to 40 repeat after 40',()=>{const m=n=>waveMix(n);assert.equal(m(9).grunt,60);assert.equal(m(19).grunt,70);assert.equal(m(29).grunt,75);assert.equal(m(39).grunt,80);
  assert.equal(m(14).hulk,20);assert.equal(m(34).hulk,25);assert.equal(m(7).quark,10);assert.equal(m(7).hulk,12);assert.equal(m(2).spheroid,1);assert.equal(JSON.stringify(m(41)),JSON.stringify(m(21)));assert.equal(JSON.stringify(m(60)),JSON.stringify(m(40)));
  assert.equal(waveSpeeds(1).hulkSpd,8);assert.equal(waveSpeeds(12).hulkSpd,5);assert.equal(waveSpeeds(10).enfShot,14)});
 test('Hulks cannot be destroyed: a shot pushes them back and scores nothing',()=>{const e=bare(),o=add(e,'hulk',500,300),x=o.x;shoot(e,o,1,0);assert.equal(e.robots.length,1);assert.equal(e.score,0);assert.ok(Math.abs(o.x-(x+C.hulkPush))<1e-9,'pushed '+(o.x-x))});
 test('Hulks wander and crush the humans they touch',()=>{const e=bare(),o=add(e,'hulk',300,200);human(e,'mikey',310,200);o.turn=99;step(e,2);assert.equal(e.humans.length,0);assert.equal(e.lost,1);assert.equal(e.marks.length,1);
  const f=bare(),h=add(f,'hulk',300,200),x=h.x,y=h.y;hold(f);step(f,600);assert.ok(Math.hypot(h.x-x,h.y-y)>20,'wanders')});
 test('Electrodes stand still, kill on touch, take Grunts with them and score nothing when shot, as on the cabinet',()=>{const e=bare(),p=e.player,el=add(e,'electrode',p.x+80,p.y),x=el.x;hold(e);step(e,240);assert.equal(el.x,x,'still');shoot(e,el);assert.ok(!e.robots.includes(el),'shot away');assert.equal(e.score,0);
  const f=bare(),g2=add(f,'grunt',400,300);add(f,'electrode',410,300);add(f,'grunt',900,700);f.collide();assert.equal(f.robots.length,1,'both gone');
  const k=bare();add(k,'electrode',k.player.x+5,k.player.y);add(k,'grunt',900,700);k.collide();assert.equal(k.state,'dead')});
 test('Spheroids spawn Enforcers that fire sparks at the player; 1000 and 150',()=>{const e=bare(),s=add(e,'spheroid',200,200);s.load=4;s.spawn=0;step(e,1);const en=e.robots.find(o=>o.kind==='enforcer');assert.ok(en,'spawned');assert.equal(s.load,3);
  en.x=400;en.y=200;en.fire=0;e.player.x=800;e.player.y=200;step(e,1);const b=e.bullets.find(b=>b.kind==='spark');assert.ok(b&&b.vx>0,'spark aimed at the player');
  e.bullets=[];shoot(e,en);assert.equal(e.score,150);shoot(e,s);assert.equal(e.score,1150)});
 test('Brains reprogram humans into Progs that chase the player, and fire homing cruise missiles; 500 and 100',()=>{const e=bare(),b=add(e,'brain',300,300);b.fire=99;human(e,'daddy',305,300);step(e,1);
  const pr=e.robots.find(o=>o.kind==='prog');assert.ok(pr&&pr.programming>0,'prog');assert.equal(e.humans.length,0);step(e,Math.ceil(C.programTime/C.step)+2);const d0=Math.hypot(pr.x-e.player.x,pr.y-e.player.y);step(e,30);assert.ok(Math.hypot(pr.x-e.player.x,pr.y-e.player.y)<d0,'chases');
  shoot(e,pr);assert.equal(e.score,100);b.fire=0;step(e,1);const m=e.bullets.find(x=>x.kind==='missile');assert.ok(m,'missile');e.player.x=b.x;e.player.y=b.y+300;m.vx=C.missileSpeed;m.vy=0;step(e,120);assert.ok(m.vy>0,'turns toward the player');
  e.bullets=[];shoot(e,b);assert.equal(e.score,600)});
 test('Quarks spawn Tanks whose shells bounce off the walls; 1000 and 200',()=>{const e=bare(),q=add(e,'quark',200,600);q.spawn=0;step(e,1);const t=e.robots.find(o=>o.kind==='tank');assert.ok(t,'tank');
  e.bullets.push({kind:'shell',x:C.right-2,y:300,vx:C.shellSpeed,vy:0,r:C.radius.shell,life:3,bounces:0,t:0});e.player.x=C.left+40;step(e,2);const s=e.bullets.find(b=>b.kind==='shell'&&b.y===300);assert.ok(s&&s.vx<0&&s.bounces===1,'bounced');
  e.bullets=[];t.x=700;t.y=200;shoot(e,t);assert.equal(e.score,200);shoot(e,q);assert.equal(e.score,1200)});
 test('rescuing the family scores 1000, 2000, 3000, 4000, then 5000 each',()=>{const e=bare(),p=e.player;add(e,'electrode',C.left+30,C.top+30);const pts=[];for(let i=0;i<7;i++){human(e,['mommy','daddy','mikey'][i%3],p.x,p.y);e.collide();pts.push(e.events.filter(v=>v.type==='rescue').at(-1).points)}
  assert.equal(pts.join(),'1000,2000,3000,4000,5000,5000,5000');assert.equal(e.score,25000)});
 test('a wave ends when every robot that can be destroyed is gone; Hulks and Electrodes stay; the rescue bonus starts over',()=>{const e=bare();add(e,'hulk',200,200);add(e,'electrode',800,600);const g2=add(e,'grunt',600,200);e.rescues=3;step(e,1);assert.equal(e.state,'play');
  shoot(e,g2);step(e,1);assert.equal(e.state,'cleared');step(e,Math.ceil((C.waveDelay+C.enterTime)/C.step)+2);assert.equal(e.wave,2);assert.equal(e.rescues,0);assert.equal(e.state,'play')});
 test('brain waves every fifth wave from 5; tank waves from 7, every fifth after',()=>{const brains=[],tanks=[];for(let n=1;n<=22;n++){const m=waveMix(n);if(m.brain)brains.push(n);if(m.quark)tanks.push(n)}
  assert.equal(brains.join(),'5,10,15,20');assert.equal(tanks.join(),'7,12,17,22');assert.ok(waveMix(5).mommy===15&&waveMix(10).daddy===22&&waveMix(15).mikey===22,'one kind of human')});
 test('an empty Spheroid or Quark flies out of the arena and is gone, with no points, and the wave can end',()=>{const e=bare(),s=add(e,'spheroid',500,300);s.load=1;s.spawn=0;step(e,1);const en=e.robots.find(o=>o.kind==='enforcer');assert.ok(s.leave,'leaving');en.x=800;en.y=650;shoot(e,en);
  for(let i=0;i<600&&e.robots.includes(s);i++)e.step(C.step,{});assert.ok(!e.robots.includes(s),'gone');assert.equal(e.score,150);assert.equal(e.state,'cleared')});
 test('a lost life puts the player back in the middle, scatters the robots and resets the rescue bonus',()=>{const e=bare(),p=P();add(e,'grunt',e.player.x+5,e.player.y);e.rescues=2;e.collide();assert.equal(e.state,'dead');assert.equal(e.lives,2);
  step(e,Math.ceil(C.deathPause/C.step)+2);assert.equal(e.rescues,0);assert.equal(e.player.x,p.x);assert.ok(Math.hypot(e.robots[0].x-p.x,e.robots[0].y-p.y)>=C.safe,'scattered')});
 test('an extra life every 25,000; three lost lives end the game',()=>{const e=bare();e.award(24990);assert.equal(e.lives,3);e.award(20);assert.equal(e.lives,4);e.award(25000);assert.equal(e.lives,5);e.lives=1;e.die();assert.equal(e.state,'end')});
 test('enemy sparks, missiles and shells kill the player and can be shot down for 25',()=>{const e=bare();add(e,'hulk',C.left+30,C.top+30);const b={kind:'spark',x:600,y:200,vx:0,vy:0,r:C.radius.spark,life:2,bounces:0,t:0};e.bullets.push(b);shoot(e,b);assert.equal(e.score,25);
  e.bullets.push({kind:'missile',x:e.player.x+3,y:e.player.y,vx:0,vy:0,r:C.radius.missile,life:2,bounces:0,t:0});e.collide();assert.equal(e.state,'dead')});
 test('the demo pilot scores',()=>{const e=make(3);for(let i=0;i<120*60;i++)e.step(C.step,e.pilot());assert.ok(e.score>=3000,'score '+e.score)});
 return count}
g.RobotronTests={run};if(typeof module!=='undefined')module.exports=g.RobotronTests;
})(globalThis);
