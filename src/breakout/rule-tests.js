'use strict';
// Detention Breakout rule checks: one per 1976 cabinet rule plus seeded determinism. Runs in Node (npm test) and in the game page.
(function(g){
function run(Core,log=console.log){const {CONFIG:C,BreakoutEngine:Engine}=Core;let count=0;
 const assert={ok:(v,m)=>{if(!v)throw Error(m||'Assertion failed')},equal:(a,b,m)=>{if(a!==b)throw Error((m?m+': ':'')+'expected '+b+', got '+a)},near:(a,b,eps,m)=>{if(Math.abs(a-b)>eps)throw Error((m?m+': ':'')+'expected '+b+', got '+a)}};
 const test=(name,fn)=>{fn();log('PASS '+name);count++};
 const make=(seed=1976)=>new Engine(seed),step=(e,n,input={})=>{for(let i=0;i<n;i++)e.step(C.step,input)};
 const toPlay=e=>{step(e,Math.ceil(1.25*C.serveDelay/C.step)+1);e.events=[];return e};
 const clear=e=>{for(const k of e.bricks)k.alive=false;return e};
 const speed=e=>Math.hypot(e.ball.vx,e.ball.vy);
 // Drop the ball straight onto the paddle at a given offset (in paddle widths from the left edge).
 const drop=(e,at=.5)=>{const p=e.paddle,b=e.ball;b.x=p.x-p.w/2+at*p.w;b.y=C.paddleY-60;b.vx=0;b.vy=C.speeds[e.level];step(e,40)};
 test('same seed and inputs give identical runs; different seeds differ',()=>{const a=make(7),b=make(7),c=make(8);for(let i=0;i<8000;i++){const inp={axis:Math.sin(i/90)};a.step(C.step,inp);b.step(C.step,inp);c.step(C.step,inp)}
  assert.equal(JSON.stringify(a.snapshot()),JSON.stringify(b.snapshot()),'replay');assert.ok(JSON.stringify(a.snapshot())!==JSON.stringify(c.snapshot()),'seeds differ')});
 test('eight rows, two each of red, orange, green and yellow from the top, 14 bricks a row',()=>{const e=make();assert.equal(e.bricks.length,C.rows*C.cols);assert.equal([0,2,4,6].map(r=>e.bricks.find(k=>k.row===r).colour).join(),'red,orange,green,yellow');assert.equal(e.bricks.filter(k=>k.colour==='red').length,28)});
 test('bricks score 1 (yellow), 3 (green), 5 (orange) and 7 (red)',()=>{const e=make();const by=c=>e.bricks.find(k=>k.colour===c&&k.alive);for(const c of ['yellow','green','orange','red'])e.breakBrick(by(c));assert.equal(e.score,16)});
 test('the ball bounces off the side walls and the top',()=>{const e=toPlay(make());clear(e);e.bricks.push({...e.bricks[0],alive:true,x:-999,y:-999});const b=e.ball;b.x=C.wall+C.ballR+2;b.y=400;b.vx=-300;b.vy=-10;step(e,6);assert.ok(b.vx>0,'left');b.x=C.width-C.wall-C.ballR-2;b.vx=300;step(e,6);assert.ok(b.vx<0,'right');b.y=C.top+C.ballR+2;b.vy=-300;step(e,6);assert.ok(b.vy>0,'top')});
 test('the quarter of the paddle the ball meets sends it one of 4 ways: steep off the outer quarters, shallow off the inner ones',()=>{const out=[];for(const at of [.1,.4,.6,.9]){const e=toPlay(make());clear(e);e.bricks.push({...e.bricks[0],alive:true,x:-999,y:-999});drop(e,at);out.push(e.ball.vx);assert.equal(e.ball.vy,-C.speeds[0],'climb')}
  assert.equal(out.join(),C.across.join());assert.ok(Math.abs(out[0])>Math.abs(out[1])&&out[1]<0&&out[2]>0)});
 test('the rebound angles become more perpendicular as the ball speeds up (TM-058): only the climb gets faster',()=>{const ang=[];for(let lv=0;lv<4;lv++){const e=toPlay(make());clear(e);e.bricks.push({...e.bricks[0],alive:true,x:-999,y:-999});e.level=lv;drop(e,.05);ang.push(Math.abs(Math.atan2(e.ball.vx,-e.ball.vy)));assert.equal(Math.abs(e.ball.vx),C.across[3])}
  for(let i=1;i<4;i++)assert.ok(ang[i]<ang[i-1],'level '+i)});
 test('the ball speeds up after 4 and after 12 paddle hits',()=>{const e=toPlay(make());clear(e);e.bricks.push({...e.bricks[0],alive:true,x:-999,y:-999});const seen=[];for(let i=1;i<=12;i++){drop(e);seen.push(e.level)}assert.equal(seen[2],0);assert.equal(seen[3],1);assert.equal(seen[10],1);assert.equal(seen[11],2)});
 test('an orange or red brick jumps the ball to the fastest of four speeds at once; later hits never slow it',()=>{const e=toPlay(make());const by=c=>e.bricks.find(k=>k.colour===c&&k.alive);assert.equal(C.speeds.length,4);e.breakBrick(by('orange'));assert.equal(e.level,3);e.breakBrick(by('red'));assert.equal(e.level,3);e.hits=3;e.paddleHit();assert.equal(e.level,3,'4th hit keeps the top speed');const f=toPlay(make());f.breakBrick(by('red')||f.bricks.find(k=>k.colour==='red'));assert.equal(f.level,3);f.newBall();assert.equal(f.level,0,'slowest at the serve')});
 test('breaking through to the top wall shrinks the paddle to half for the rest of that serve',()=>{const e=toPlay(make());clear(e);e.bricks.push({...e.bricks[0],alive:true,x:-999,y:-999});e.ball.x=500;e.ball.y=C.top+C.ballR+3;e.ball.vx=0;e.ball.vy=-300;step(e,4);assert.ok(e.paddle.small);assert.equal(e.paddle.w,C.paddleW/2);
  e.paddle.x=C.width-200;e.ball.x=C.wall+40;e.ball.y=C.paddleY+20;e.ball.vx=0;e.ball.vy=500;step(e,30);assert.equal(e.balls,2);assert.ok(!e.paddle.small,'whole again at the next serve');assert.equal(e.paddle.w,C.paddleW)});
 test('a missed ball costs one of three balls; the third miss ends the game',()=>{const e=toPlay(make());assert.equal(e.balls,3);for(let i=0;i<3;i++){e.state='play';e.ball.x=40+C.wall;e.paddle.x=C.width-200;e.ball.y=C.paddleY+20;e.ball.vx=0;e.ball.vy=500;step(e,30)}assert.equal(e.balls,0);assert.equal(e.state,'end')});
 test('a cleared first wall comes back as the ball next meets the top wall, with no extra serve; the second ends the game',()=>{const e=toPlay(make());e.level=3;const last=e.bricks[0];for(const k of e.bricks)if(k!==last)k.alive=false;e.breakBrick(last);assert.equal(e.wallNo,1,'not yet');assert.equal(e.state,'play');
  const b=e.ball;b.x=500;b.y=C.top+C.ballR+3;b.vx=0;b.vy=-C.speeds[3];step(e,2);assert.equal(e.wallNo,2);assert.equal(e.bricks.filter(k=>k.alive).length,112);assert.equal(e.state,'play','ball stays in play');assert.equal(e.level,3,'same speed');assert.equal(e.balls,3);
  const l2=e.bricks[0];for(const k of e.bricks)if(k!==l2)k.alive=false;e.breakBrick(l2);assert.equal(e.state,'end')});
 test('a cleared first wall also comes back when the ball next meets the paddle',()=>{const e=toPlay(make());const last=e.bricks[0];for(const k of e.bricks)if(k!==last)k.alive=false;e.breakBrick(last);drop(e,.5);assert.equal(e.wallNo,2);assert.equal(e.events.filter(v=>v.type==='serve').length,0)});
 test('each ball is served after a wait that varies, like the cabinet\'s "within four seconds or sooner"',()=>{const waits=new Set();for(let i=1;i<=8;i++){const e=make(i);waits.add(e.timer.toFixed(3));assert.ok(e.timer>=.75*C.serveDelay&&e.timer<=1.25*C.serveDelay)}assert.ok(waits.size>4)});
 test('a perfect game is worth 896 points',()=>{const e=make();for(let w=0;w<2;w++){for(const k of [...e.bricks])if(k.alive&&e.state!=='end')e.breakBrick(k);if(e.wallPending)e.nextWall()}assert.equal(e.score,896)});
 test('the demo pilot keeps the ball in play and breaks bricks',()=>{const e=make(3);for(let i=0;i<120*90;i++)e.step(C.step,e.pilot());assert.ok(e.score>60,'score '+e.score);assert.equal(e.balls,3,'no ball lost')});
 return count}
g.DetentionBreakoutTests={run};if(typeof module!=='undefined')module.exports=g.DetentionBreakoutTests;
})(globalThis);
