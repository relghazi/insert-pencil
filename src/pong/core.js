'use strict';
/* Gym Class Pong: Atari Pong (1972) rules, drawn as gym benches and a dodgeball on her maths-quiz paper.
   Rules follow the original cabinet: a ball bounces off the top and bottom walls; each paddle is split into
   eight segments and the segment the ball strikes sets the return angle (the two centre segments send it straight back, at right angles to the paddle, as Al Alcorn designed it; the outer ones steeper and steeper);
   the ball speeds up after 4 and after 12 returns in a rally; a missed ball scores a point for the other side
   and the next serve starts from the centre; the paddles cannot reach the very top of the court (the
   original's famous gap); the first side to 11 points wins.
   Adaptations (not ROM-exact): you play the coach (the computer, right bench); the coach misjudges each approaching ball, more as the rally speeds up and more on steep balls, so he loses points (owner 2026-10-30, player report: the coach never lost; a good player wins about three matches in four);
   the serve goes toward the side that just lost the point; speeds and sizes are tuned by eye at 120 Hz; the score is the cabinet's own: the points
   you win in a match (0 to 11), which is what goes in the notebook's score table. */
(function(g){
const CONFIG=Object.freeze({version:'0.3.0',width:1024,height:768,step:1/120,record:[['axis','n',-1,1,20]],
  wall:28,topGap:22,paddleW:18,paddleH:84,paddleX:56,paddleSpeed:620,
  ballR:9,speeds:Object.freeze([430,540,660]),speedUpAt:Object.freeze([4,12]),
  angles:Object.freeze([-.95,-.62,-.34,0,0,.34,.62,.95]),
  winScore:11,serveDelay:1,
  cpuSpeed:420,cpuReaction:.12,cpuError:Object.freeze([55,85,120]),cpuSteep:.6,
});
class SeededRandom{constructor(seed=1972){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const W=CONFIG.width,H=CONFIG.height,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TOP=CONFIG.wall,BOTTOM=H-CONFIG.wall;
class PongEngine{
 constructor(seed=1972){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.state='serve';this.timer=CONFIG.serveDelay;
  this.left={y:H/2,score:0};this.right={y:H/2,score:0,aim:H/2,think:0};this.points=0;this.hits=0;this.rallyHits=0;this.winner=null;
  this.ball={x:W/2,y:H/2,vx:0,vy:0,speed:CONFIG.speeds[0]};this.serveTo=this.rng.next()<.5?-1:1;return this}
 // Paddle travel: the top of a paddle cannot rise above TOP + topGap (the 1972 gap); the bottom reaches the wall.
 paddleMin(){return TOP+CONFIG.topGap+CONFIG.paddleH/2}
 paddleMax(){return BOTTOM-CONFIG.paddleH/2}
 move(p,dir,dt,speed=CONFIG.paddleSpeed){p.y=clamp(p.y+dir*speed*dt,this.paddleMin(),this.paddleMax())}
 serve(){const b=this.ball,a=(this.rng.next()-.5)*.7;b.x=W/2;b.y=TOP+40+this.rng.next()*(BOTTOM-TOP-80);b.speed=CONFIG.speeds[0];b.vx=b.speed*this.serveTo;b.vy=Math.tan(a)*b.speed;this.rallyHits=0;this.state='play';this.events.push({type:'serve',to:this.serveTo})}
 // The segment (0 to 7) of a paddle centred at py that a ball at y strikes.
 segment(py,y){return clamp(Math.floor((y-(py-CONFIG.paddleH/2))/CONFIG.paddleH*8),0,7)}
 speedFor(hits){const s=CONFIG.speeds,u=CONFIG.speedUpAt;return hits>=u[1]?s[2]:hits>=u[0]?s[1]:s[0]}
 // As on the cabinet the ball's speed across the court is set by the rally alone; the segment sets only its climb or fall.
 bounce(side,p){const b=this.ball,seg=this.segment(p.y,b.y),a=CONFIG.angles[seg];this.rallyHits++;this.hits++;b.speed=this.speedFor(this.rallyHits);
  b.vx=b.speed*(side==='left'?1:-1);b.vy=Math.tan(a)*b.speed;b.x=side==='left'?CONFIG.paddleX+CONFIG.paddleW/2+CONFIG.ballR:W-CONFIG.paddleX-CONFIG.paddleW/2-CONFIG.ballR;
  this.events.push({type:'hit',side,segment:seg,speed:b.speed})}
 // The leaderboard reads engine.score (points she won, the cabinet's score); a point is awarded by award().
 get score(){return this.points}
 award(side){const s=this[side];s.score++;if(side==='left')this.points++;this.events.push({type:'point',side,left:this.left.score,right:this.right.score});
  this.serveTo=side==='left'?1:-1;this.ball.vx=this.ball.vy=0;this.right.read=null;
  if(s.score>=CONFIG.winScore){this.winner=side;this.state='end';this.events.push({type:'gameover',winner:side,score:this.points})}
  else{this.state='serve';this.timer=CONFIG.serveDelay}}
 // The coach: tracks where the ball will arrive with a reaction delay and a small aiming error, at a capped speed.
 coach(dt){const r=this.right,b=this.ball;r.think-=dt;if(r.think<=0){r.think=CONFIG.cpuReaction;
   // One misjudgement per approach, larger as the rally speeds up and on steep balls, so he can be beaten (owner 2026-10-30).
   if(b.vx>0&&this.state==='play'){if(r.read!==this.hits){r.read=this.hits;r.err=(this.rng.next()-.5)*2*CONFIG.cpuError[CONFIG.speeds.indexOf(b.speed)]*(1+CONFIG.cpuSteep*Math.min(1,Math.abs(b.vy/b.vx)))}
    let y=b.y,vy=b.vy,t=(W-CONFIG.paddleX-b.x)/b.vx;y+=vy*t;const span=BOTTOM-TOP-2*CONFIG.ballR;let k=(y-TOP-CONFIG.ballR)%(2*span);if(k<0)k+=2*span;y=TOP+CONFIG.ballR+(k>span?2*span-k:k);r.aim=y+r.err}
   else r.aim=H/2}
  const d=r.aim-r.y;if(Math.abs(d)>4)this.move(r,Math.sign(d),dt,Math.min(CONFIG.cpuSpeed,Math.abs(d)/dt))}
 step(dt,input={}){this.clock+=dt;const axis=clamp(Number(input.axis)||0,-1,1),dir=axis||((input.down?1:0)-(input.up?1:0));
  if(this.state==='end')return;this.move(this.left,dir,dt);this.coach(dt);
  if(this.state==='serve'){this.timer-=dt;if(this.timer<=0)this.serve();return}
  const b=this.ball,R=CONFIG.ballR;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.y-R<TOP){b.y=TOP+R;b.vy=Math.abs(b.vy);this.events.push({type:'wall'})}
  if(b.y+R>BOTTOM){b.y=BOTTOM-R;b.vy=-Math.abs(b.vy);this.events.push({type:'wall'})}
  const half=CONFIG.paddleH/2,reach=(p,x)=>Math.abs(b.y-p.y)<=half+R*.6;
  const lx=CONFIG.paddleX+CONFIG.paddleW/2,rx=W-CONFIG.paddleX-CONFIG.paddleW/2;
  if(b.vx<0&&b.x-R<=lx&&b.x-R>lx-CONFIG.paddleW-b.speed*dt&&reach(this.left))this.bounce('left',this.left);
  else if(b.vx>0&&b.x+R>=rx&&b.x+R<rx+CONFIG.paddleW+b.speed*dt&&reach(this.right))this.bounce('right',this.right);
  if(b.x<-R*2)this.award('right');else if(b.x>W+R*2)this.award('left')}
 // Demo pilot for the left bench: follows the ball like the coach does.
 pilot(){const b=this.ball,d=(b.vx<0?b.y:H/2)-this.left.y;return{axis:Math.abs(d)<6?0:clamp(d/60,-1,1)}}
 snapshot(){return{state:this.state,clock:+this.clock.toFixed(4),left:{...this.left},right:{y:this.right.y,score:this.right.score},ball:{...this.ball},points:this.points,hits:this.hits,rallyHits:this.rallyHits,winner:this.winner}}
}
const GymPongCore={CONFIG,PongEngine,SeededRandom};
g.GymPongCore=GymPongCore;if(typeof module!=='undefined')module.exports=GymPongCore;
})(globalThis);
