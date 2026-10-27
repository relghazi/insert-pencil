'use strict';
/* Lunch Lander: Atari Lunar Lander (1979) rules, drawn as a cafeteria tray landing on piles of lunch.
   Rules follow the original cabinet: gravity pulls the lander down; rotate left or right and fire the descent engine
   with a variable throttle; thrust burns fuel and the game ends when the fuel is gone; the abort button turns the
   lander upright and fires full thrust; the terrain has flat landing pads worth x2 to x5; touching down upright,
   slowly and with both legs on a flat pad is a landing: a good landing scores 50, a hard landing 15, a crash 5, each
   multiplied by the pad's bonus; a good landing also earns 50 units of fuel; after each landing or crash a new
   lander starts at the top with the fuel that is left.
   Checked 2026-10-31 against arcade-history.com, Wikipedia and the cabinet's operator settings: 750 fuel units a
   credit (the factory setting); the abort is costly, about 120 to 180 units for a typical abort, so it burns fuel at
   2.5 times the full-throttle rate while held; smaller landing zones carry the higher multipliers.
   Adaptations (not ROM-exact): one screen-wide landscape that wraps at the sides (the cabinet scrolled and zoomed in
   near the ground); speeds, gravity and fuel burn are tuned by eye at 120 Hz. */
(function(g){
const CONFIG=Object.freeze({version:'0.2.0',width:1024,height:768,step:1/120,record:[['turn','n',-1,1,20],['throttle','n',0,1,100],['abort','b']],
  gravity:28,thrust:72,turnRate:2.2,startFuel:750,burn:24,abortBurn:60,fuelBonus:50,
  startY:120,startVx:60,
  good:Object.freeze({vy:28,vx:18,tilt:.15}),hard:Object.freeze({vy:56,vx:34,tilt:.28}),
  points:Object.freeze({good:50,hard:15,crash:5}),footW:34,bodyH:26,
  pauseAfter:2.5,
  // The landscape, left to right: [x, y] points; pads are flat runs with a bonus.
  terrain:Object.freeze([[0,560],[60,600],[110,520],[150,610],[230,610],[260,540],[300,470],[340,520],[380,640],[470,640],[500,560],
    [540,430],[580,380],[620,450],[650,600],[710,600],[740,520],[770,580],[820,500],[860,560],[890,690],[960,690],[990,600],[1024,560]]),
  pads:Object.freeze([Object.freeze({x0:150,x1:230,y:610,bonus:3}),Object.freeze({x0:380,x1:470,y:640,bonus:2}),Object.freeze({x0:650,x1:710,y:600,bonus:5}),Object.freeze({x0:890,x1:960,y:690,bonus:4})])});
class SeededRandom{constructor(seed=1979){this.value=seed>>>0}next(){this.value=(Math.imul(this.value,1664525)+1013904223)>>>0;return this.value/4294967296}}
const W=CONFIG.width,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=x=>(x%W+W)%W;
// Ground height at x (the terrain polyline).
function ground(x){x=wrap(x);const T=CONFIG.terrain;for(let i=1;i<T.length;i++){const [x0,y0]=T[i-1],[x1,y1]=T[i];if(x<=x1)return y0+(y1-y0)*(x-x0)/Math.max(1e-9,x1-x0)}return T[T.length-1][1]}
class LanderEngine{
 constructor(seed=1979){this.seed=seed;this.reset(seed)}
 reset(seed=this.seed){this.rng=new SeededRandom(seed);this.seed=seed;this.clock=0;this.events=[];this.score=0;this.fuel=CONFIG.startFuel;this.landings=0;this.state='fly';this.result=null;this.spawn();return this}
 spawn(){const dir=this.rng.next()<.5?-1:1;this.p={x:dir>0?120:W-120,y:CONFIG.startY,vx:CONFIG.startVx*dir,vy:0,angle:0,throttle:0};this.state='fly';this.result=null;this.events.push({type:'spawn'})}
 padUnder(x0,x1){return CONFIG.pads.find(p=>x0>=p.x0&&x1<=p.x1)||null}
 touchdown(){const p=this.p,G=CONFIG.good,Hd=CONFIG.hard,half=CONFIG.footW/2,pad=this.padUnder(wrap(p.x)-half,wrap(p.x)+half),vy=p.vy,vx=Math.abs(p.vx),tilt=Math.abs(p.angle);
  let kind;if(pad&&vy<=G.vy&&vx<=G.vx&&tilt<=G.tilt)kind='good';else if(pad&&vy<=Hd.vy&&vx<=Hd.vx&&tilt<=Hd.tilt)kind='hard';else kind='crash';
  const bonus=pad?pad.bonus:1,pts=CONFIG.points[kind]*bonus;this.score+=pts;if(kind==='good')this.fuel+=CONFIG.fuelBonus;if(kind!=='crash')this.landings++;
  p.vx=p.vy=0;p.throttle=0;if(pad)p.y=pad.y-CONFIG.bodyH/2;this.state='landed';this.timer=CONFIG.pauseAfter;this.result={kind,bonus,points:pts};
  this.events.push({type:kind==='crash'?'crash':'landed',kind,bonus,points:pts,x:p.x,y:p.y})}
 step(dt,input={}){this.clock+=dt;if(this.state==='end')return;
  if(this.state==='landed'){this.timer-=dt;if(this.timer<=0){if(this.fuel<=0){this.state='end';this.events.push({type:'gameover',score:this.score})}else this.spawn()}return}
  const p=this.p,turn=clamp(Number(input.turn)||((input.right?1:0)-(input.left?1:0)),-1,1);
  let throttle=clamp(input.throttle!=null?Number(input.throttle):(input.thrust?1:0),0,1);
  if(input.abort){const k=Math.min(1,CONFIG.turnRate*2*dt/Math.max(1e-9,Math.abs(p.angle)));p.angle-=p.angle*k;throttle=1}
  else p.angle=clamp(p.angle+turn*CONFIG.turnRate*dt,-Math.PI/2,Math.PI/2);
  if(this.fuel<=0)throttle=0;p.throttle=throttle;
  if(throttle>0){this.fuel=Math.max(0,this.fuel-(input.abort?CONFIG.abortBurn:CONFIG.burn*throttle)*dt);if(this.fuel===0)this.events.push({type:'out-of-fuel'})}
  const a=CONFIG.thrust*throttle;p.vx+=Math.sin(p.angle)*a*dt;p.vy+=(CONFIG.gravity-Math.cos(p.angle)*a)*dt;
  p.x=wrap(p.x+p.vx*dt);p.y=Math.max(10,p.y+p.vy*dt);
  const half=CONFIG.footW/2,feet=p.y+CONFIG.bodyH/2;if(feet>=Math.min(ground(p.x-half),ground(p.x),ground(p.x+half))){if(p.vy<0)p.vy=0;this.touchdown()}}
 // Height above the highest ground under either foot, for the HUD (0 at touchdown).
 altitude(){const p=this.p,h=CONFIG.footW/2;return Math.max(0,Math.round(Math.min(ground(p.x-h),ground(p.x),ground(p.x+h))-(p.y+CONFIG.bodyH/2)))}
 // Demo pilot: flies level, clear of the food peaks, to the nearest pad, then settles straight down onto it.
 pilot(){const p=this.p,pad=CONFIG.pads.reduce((a,b)=>Math.abs((b.x0+b.x1)/2-p.x)<Math.abs((a.x0+a.x1)/2-p.x)?b:a),dx=(pad.x0+pad.x1)/2-p.x,feet=p.y+CONFIG.bodyH/2;
  let peak=0;for(let x=Math.min(p.x,p.x+dx)-40;x<=Math.max(p.x,p.x+dx)+40;x+=8)peak=Math.max(peak,feet-ground(x));
  const lowest=Math.min(...[-40,-20,0,20,40].map(o=>ground(p.x+o))),clear=lowest-feet,above=Math.abs(dx)<14&&Math.abs(p.vx)<8;
  const wantVx=above?clamp(dx*.4,-6,6):clamp(dx*.5,-45,45),h=pad.y-feet,wantVy=above?(h>80?30:h>25?16:8):(clear<110?-25:clear>200?15:0);
  const ax=clamp((wantVx-p.vx)*1.2,-CONFIG.thrust*.45,CONFIG.thrust*.45),wantAngle=Math.asin(clamp(ax/CONFIG.thrust,-.45,.45))*(above?.25:1);
  const turn=clamp((wantAngle-p.angle)*6,-1,1),need=CONFIG.gravity+(p.vy-wantVy)*2.5,throttle=clamp(need/(CONFIG.thrust*Math.max(.3,Math.cos(p.angle))),0,1);return{turn,throttle}}
 snapshot(){const p=this.p;return{state:this.state,clock:+this.clock.toFixed(4),score:this.score,fuel:+this.fuel.toFixed(3),landings:this.landings,p:{x:+p.x.toFixed(3),y:+p.y.toFixed(3),vx:+p.vx.toFixed(3),vy:+p.vy.toFixed(3),angle:+p.angle.toFixed(4)},result:this.result}}
}
const LunchLanderCore={CONFIG,LanderEngine,SeededRandom,ground};
g.LunchLanderCore=LunchLanderCore;if(typeof module!=='undefined')module.exports=LunchLanderCore;
})(globalThis);
