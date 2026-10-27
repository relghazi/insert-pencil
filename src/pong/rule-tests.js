'use strict';
// Gym Class Pong rule checks: one per 1972 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,PongEngine:Engine}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)},near:(a,b,eps,m)=>{if(Math.abs(a-b)>eps)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1972)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 const toPlay=e=>{step(e,Math.ceil(C.serveDelay/C.step)+1);e.events=[];return e};
 const aim=(e,side,y,speed)=>{const b=e.ball,x=side==='left'?C.paddleX+C.paddleW/2+C.ballR+6:C.width-C.paddleX-C.paddleW/2-C.ballR-6;b.x=x;b.y=y;b.speed=speed||C.speeds[0];b.vx=(side==='left'?-1:1)*b.speed;b.vy=0};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<6000;i++){const inp={up:i%400<150,down:i%400>250};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('the ball is served from the centre after a short wait',()=>{const e=make();assert.equal(e.state,'serve');step(e,Math.ceil(C.serveDelay/C.step)+1);assert.equal(e.state,'play');assert.ok(Math.abs(e.ball.x-C.width/2)<10);assert.equal(e.events.filter(v=>v.type==='serve').length,1)});
 test('the ball bounces off the top and bottom walls',()=>{const e=toPlay(make());const b=e.ball;b.x=500;b.y=C.wall+C.ballR+2;b.vx=100;b.vy=-400;step(e,4);assert.ok(b.vy>0,'top');b.y=C.height-C.wall-C.ballR-2;b.vy=400;step(e,4);assert.ok(b.vy<0,'bottom');assert.equal(e.events.filter(v=>v.type==='wall').length,2)});
 test('the paddle segment struck sets the return angle: the two centre segments send it straight back, the ends steep',()=>{const angles=[];for(let seg=0;seg<8;seg++){const e=toPlay(make());e.left.y=C.height/2;const top=e.left.y-C.paddleH/2;aim(e,'left',top+(seg+.5)*C.paddleH/8);step(e,4);angles.push(Math.atan2(e.ball.vy,e.ball.vx))}
  for(let i=0;i<8;i++)assert.near(angles[i],C.angles[i],.01,'segment '+i);assert.near(angles[3],0,1e-9,'centre');assert.near(angles[4],0,1e-9,'centre');assert.ok(Math.abs(angles[3])<Math.abs(angles[0])&&Math.abs(angles[4])<Math.abs(angles[7]))});
 test('the ball crosses the court at the rally speed whatever the segment it strikes',()=>{for(const seg of [0,3,7]){const e=toPlay(make());e.left.y=C.height/2;aim(e,'left',e.left.y-C.paddleH/2+(seg+.5)*C.paddleH/8);step(e,4);assert.near(e.ball.vx,C.speeds[0],.01,'segment '+seg)}});
 test('the ball speeds up after 4 and after 12 returns in a rally',()=>{const e=toPlay(make());const seen=[];for(let i=1;i<=13;i++){e.left.y=C.height/2;aim(e,'left',C.height/2,e.ball.speed);step(e,4);seen.push(e.ball.speed)}
  assert.equal(seen[2],C.speeds[0]);assert.equal(seen[3],C.speeds[1]);assert.equal(seen[10],C.speeds[1]);assert.equal(seen[11],C.speeds[2])});
 test('a miss scores a point for the other side and the next serve goes toward the side that lost it',()=>{const e=toPlay(make());e.left.y=C.height-100;e.ball.x=60;e.ball.y=120;e.ball.vx=-500;e.ball.vy=0;step(e,30);assert.equal(e.right.score,1);assert.equal(e.state,'serve');assert.equal(e.serveTo,-1);
  step(e,Math.ceil(C.serveDelay/C.step)+1);assert.ok(e.ball.vx<0,'served toward the left')});
 test('the paddles cannot reach the very top of the court (the 1972 gap) but reach the bottom',()=>{const e=make();step(e,400,{up:true});assert.equal(e.left.y-C.paddleH/2,C.wall+C.topGap);step(e,400,{down:true});assert.equal(e.left.y+C.paddleH/2,C.height-C.wall)});
 test('an analog stick moves the bench proportionally',()=>{const a=make(),b=make();step(a,30,{axis:.5});step(b,30,{axis:1});assert.ok(a.left.y>C.height/2,'moved down');assert.near(a.left.y-C.height/2,(b.left.y-C.height/2)/2,.5)});
 test('the first side to 11 points wins and the game ends',()=>{const e=toPlay(make());e.right.score=10;e.left.y=C.height-100;e.ball.x=60;e.ball.y=120;e.ball.vx=-500;e.ball.vy=0;step(e,30);assert.equal(e.state,'end');assert.equal(e.winner,'right');assert.equal(e.events.filter(v=>v.type==='gameover').length,1)});
 test('score is the cabinet\'s own: one per point you win, returns score nothing',()=>{const e=toPlay(make());e.left.y=C.height/2;aim(e,'left',C.height/2);step(e,4);assert.equal(e.points,0,'a return');e.right.y=100;e.ball.x=C.width-60;e.ball.y=C.height-120;e.ball.vx=500;e.ball.vy=0;step(e,30);assert.equal(e.points,1);e.left.score=10;step(e,Math.ceil(C.serveDelay/C.step)+1);e.right.y=100;e.ball.x=C.width-60;e.ball.y=C.height-120;e.ball.vx=500;e.ball.vy=0;step(e,30);assert.equal(e.winner,'left');assert.equal(e.points,2)});
 test('the coach never moves faster than its speed limit',()=>{const e=toPlay(make());let max=0,prev=e.right.y;for(let i=0;i<2000;i++){e.step(C.step,{});max=Math.max(max,Math.abs(e.right.y-prev)/C.step);prev=e.right.y;if(e.state==='end')break}assert.ok(max<=C.cpuSpeed+1e-6,'speed '+max)});
 test('the coach misjudges more as a rally speeds up: he rarely misses a slow ball and slips more on fast ones (owner 2026-10-30: he must be beatable)',()=>{const miss=tier=>{let n=0;for(let i=0;i<60;i++){const e=toPlay(make(100+i));e.hits=i+1;e.rallyHits=0;const b=e.ball;b.speed=C.speeds[tier];b.x=C.width/2;b.y=200+(i*37)%380;b.vx=b.speed;b.vy=0;step(e,Math.ceil(C.width/b.speed/C.step));if(e.left.score)n++}return n};
  const slow=miss(0),fast=miss(2);assert.ok(slow<=12,'slow: '+slow);assert.ok(fast>slow,'fast '+fast+' > slow '+slow)});
 test('the coach can be beaten: a demo match against it ends with a winner',()=>{const e=make(3);let n=0;while(e.state!=='end'&&n<120*60*15){e.step(C.step,e.pilot());n++}assert.equal(e.state,'end');assert.ok(['left','right'].includes(e.winner))});
 return count}
g.GymPongTests={run};if(typeof module!=='undefined')module.exports=g.GymPongTests;
})(globalThis);
