'use strict';
/* Detention Breakout: Atari Breakout (1976) rules, drawn as a classroom brick wall, a wooden ruler and a paper wad.
   Rules follow the original cabinet: eight rows of bricks, two rows each of yellow, green, orange and red from the
   bottom (1, 3, 5 and 7 points); the ball bounces off the side walls and the top; the ball leaves the paddle in one
   of 4 directions set by the quarter of the paddle it strikes (manual TM-058 3.3.3), steep from the outer quarters and
   shallow from the inner ones, and as the ball speeds up only its climb and fall get faster, so "the angles of
   rebound become more perpendicular as ball speed increases"; the ball has four speeds in a serve: the slowest,
   faster from the 4th hit, faster again from the 12th, and the fastest at once when it breaks an orange or red brick
   (TM-058: "Ball speed changes to a fourth, fastest speed immediately after a high-point (either 5-point or 7-point)
   brick is hit"), slowest again at each serve; once the ball breaks through to the top wall the paddle shrinks to
   half for the rest of that serve; three balls; when the first wall is cleared a second full set appears as soon as
   the ball next meets the top wall or the paddle, with no extra serve, and after the second the game ends (the
   896-point perfect game).
   Adaptations (not ROM-exact): the court is landscape 4:3 to fit the turned notebook page; speeds and sizes are
   tuned by eye at 120 Hz; the ball is served without a serve button, after a short wait of varying length (the cabinet's ball appears "within four seconds or sooner" of the press), from below the wall toward the paddle. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20]],
  wall:42,top:105,cols:14,rows:8,brickTop:160,brickH:22,gap:4,
  colours:Object.freeze(['red','red','orange','orange','green','green','yellow','yellow']),
  points:Object.freeze({red:7,orange:5,green:3,yellow:1}),
  paddleY:712,paddleW:120,paddleH:16,paddleSpeed:760,ballR:8,
  // speeds: the ball's climb or fall (px/s) at each of the four speeds; across: its sideways speed off each quarter of the paddle.
  speeds:Object.freeze([300,380,460,560]),hitsAt:Object.freeze([4,12]),
  across:Object.freeze([-300,-130,130,300]),
  balls:3,walls:2,serveDelay:1.2});
class SeededRandom{constructor(seed=1976){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const W=CONFIG.width,H=CONFIG.height,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const LEFT=CONFIG.wall,RIGHT=W-CONFIG.wall,TOP=CONFIG.top;
class BreakoutEngine{
 constructor(seed=1976){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.rng.next();/* neighbouring seeds start almost alike: skip that first draw */this.seed=seed;this.clock=0;this.events=[];this.score=0;this.balls=CONFIG.balls;this.wallNo=1;
  this.paddle={x:W/2,w:CONFIG.paddleW,small:false};this.ball={x:W/2,y:CONFIG.paddleY-60,vx:0,vy:0};this.buildWall();this.newBall();return this}
 brickW(){return (RIGHT-LEFT-CONFIG.gap*(CONFIG.cols+1))/CONFIG.cols}
 buildWall(){const bw=this.brickW();this.bricks=[];for(let r=0;r<CONFIG.rows;r++)for(let c=0;c<CONFIG.cols;c++){const colour=CONFIG.colours[r];
   this.bricks.push({row:r,col:c,colour,x:LEFT+CONFIG.gap+c*(bw+CONFIG.gap),y:CONFIG.brickTop+r*(CONFIG.brickH+CONFIG.gap),w:bw,h:CONFIG.brickH,alive:true})}}
 // A new ball: speed-ups start over and the paddle is whole again (it is short only for the serve that broke through).
 newBall(){this.state='serve';this.wallPending=false;this.paddle.w=CONFIG.paddleW;this.paddle.small=false;this.timer=CONFIG.serveDelay*(.75+.5*this.rng.next());this.hits=0;this.level=0;const b=this.ball;b.x=this.paddle.x;b.y=CONFIG.paddleY-60;b.vx=b.vy=0}
 serve(){const b=this.ball;b.x=clamp(this.paddle.x,LEFT+60,RIGHT-60);b.y=CONFIG.brickTop+CONFIG.rows*(CONFIG.brickH+CONFIG.gap)+60;b.vx=CONFIG.across[Math.floor(this.rng.next()*4)];b.vy=this.speed();this.state='play';this.events.push({type:'serve'})}
 speed(){return CONFIG.speeds[Math.min(CONFIG.speeds.length-1,this.level)]}
 speedUp(to){if(to<=this.level)return;this.level=to;const b=this.ball;b.vy=(b.vy<0?-1:1)*this.speed();this.events.push({type:'faster',level:this.level})}
 paddleHit(){const b=this.ball,p=this.paddle,seg=clamp(Math.floor((b.x-(p.x-p.w/2))/p.w*4),0,3);if(this.wallPending)this.nextWall();
  b.vx=CONFIG.across[seg];b.vy=-this.speed();b.y=CONFIG.paddleY-CONFIG.paddleH/2-CONFIG.ballR;this.hits++;const i=CONFIG.hitsAt.indexOf(this.hits);if(i>=0)this.speedUp(i+1);this.events.push({type:'paddle',segment:seg})}
 breakBrick(k){k.alive=false;this.score+=CONFIG.points[k.colour];this.events.push({type:'brick',colour:k.colour,row:k.row,x:k.x+k.w/2,y:k.y+k.h/2});
  if(k.colour==='orange'||k.colour==='red')this.speedUp(CONFIG.speeds.length-1);
  if(!this.bricks.some(x=>x.alive)){if(this.wallNo<CONFIG.walls)this.wallPending=true;else{this.state='end';this.events.push({type:'gameover',score:this.score,cleared:true})}}}
 // The second wall: it appears when the ball next meets the top wall or the paddle; the ball stays in play (TM-058: no extra serves).
 nextWall(){this.wallPending=false;this.wallNo++;this.buildWall();this.events.push({type:'wall',number:this.wallNo})}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;const p=this.paddle,axis=clamp(Number(input.axis)||0,-1,1),dir=axis||((input.right?1:0)-(input.left?1:0));
  p.x=clamp(p.x+dir*CONFIG.paddleSpeed*dt,LEFT+p.w/2,RIGHT-p.w/2);
  if(this.state==='serve'){this.ball.x=p.x;this.timer-=dt;if(this.timer<=0)this.serve();return}
  const b=this.ball,R=CONFIG.ballR;const n=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/(R*.8)));
  for(let i=0;i<n&&this.state==='play';i++)this.move(dt/n)}
 move(dt){const b=this.ball,R=CONFIG.ballR,p=this.paddle;const px=b.x,py=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x-R<LEFT){b.x=LEFT+R;b.vx=Math.abs(b.vx);this.events.push({type:'side'})}if(b.x+R>RIGHT){b.x=RIGHT-R;b.vx=-Math.abs(b.vx);this.events.push({type:'side'})}
  if(b.y-R<TOP){b.y=TOP+R;b.vy=Math.abs(b.vy);this.events.push({type:'top'});if(this.wallPending)this.nextWall();if(!p.small){p.small=true;p.w=CONFIG.paddleW/2;this.events.push({type:'shrink'})}}
  for(const k of this.bricks){if(!k.alive)continue;if(b.x+R<k.x||b.x-R>k.x+k.w||b.y+R<k.y||b.y-R>k.y+k.h)continue;
   const fromSide=px+R<=k.x||px-R>=k.x+k.w;if(fromSide)b.vx=-b.vx;else b.vy=-b.vy;b.x=px;b.y=py;this.breakBrick(k);return}
  if(b.vy>0&&b.y+R>=CONFIG.paddleY-CONFIG.paddleH/2&&py+R<=CONFIG.paddleY-CONFIG.paddleH/2+1&&Math.abs(b.x-p.x)<=p.w/2+R*.5){this.paddleHit();return}
  if(b.y-R>H){this.balls--;this.events.push({type:'miss',balls:this.balls});if(this.balls<=0){this.state='end';this.events.push({type:'gameover',score:this.score,cleared:false})}else this.newBall()}}
 // Demo pilot: keeps the paddle under the ball.
 pilot(){const b=this.ball,R=CONFIG.ballR;let x=b.x;if(b.vy>0){const t=(CONFIG.paddleY-CONFIG.paddleH/2-R-b.y)/b.vy,span=RIGHT-LEFT-2*R;let k=(b.x+b.vx*t-LEFT-R)%(2*span);if(k<0)k+=2*span;x=LEFT+R+(k>span?2*span-k:k)}
  const d=x-this.paddle.x;return{axis:Math.abs(d)<3?0:clamp(d/24,-1,1)}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,balls:this.balls,wallNo:this.wallNo,level:this.level,hits:this.hits,paddle:{...this.paddle},ball:{...this.ball},bricks:this.bricks.filter(k=>k.alive).length}}
}
const DetentionBreakoutCore={CONFIG,BreakoutEngine,SeededRandom};
g.DetentionBreakoutCore=DetentionBreakoutCore;if(typeof module!=='undefined')module.exports=DetentionBreakoutCore;
})(globalThis);
